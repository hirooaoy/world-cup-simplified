#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectLineupPredictionData,
  isFrozenDelayedLineupFixture,
  isFutureLineupFixture
} from "./lineup-prediction-engine/data-collection.mjs";
import { mergeFrozenDelayedPredictions } from "./lineup-prediction-engine/delayed-preservation.mjs";
import { runLineupPredictionEngine } from "./lineup-prediction-engine/engine.mjs";
import { createPredictionSource } from "./lineup-prediction-engine/model.mjs";
import { compactPredictionDocumentForBrowser } from "./lineup-prediction-engine/output.mjs";
import { createFreePublicLineupsProvider } from "./lineup-prediction-engine/providers/free-public-lineups.mjs";
import { createLocalOfficialHistoryProvider } from "./lineup-prediction-engine/providers/local-official-history.mjs";
import { normalizeProviderCandidate } from "./lineup-prediction-engine/providers.mjs";
import { scoreSideCandidate } from "./lineup-prediction-engine/scoring.mjs";
import { validatePredictionDocument } from "./lineup-prediction-engine/validation.mjs";
import { isPlayerNameMatch, resolvePlayerNameInPool } from "./player-name-matching.mjs";

const generatedAt = "2026-07-07T18:30:00.000Z";
const smokeFixture = {
  id: "fixture-smoke",
  kickoffUtc: "2026-07-08T18:30:00.000Z",
  status: "SCHEDULED",
  homeTeamId: "HOM",
  awayTeamId: "AWY"
};
const source = createPredictionSource({
  id: "lineup-prediction-smoke-source",
  label: "Lineup prediction smoke source",
  type: "lineup-prediction-smoke",
  checkedAt: generatedAt,
  note: "Synthetic provider source used by smoke tests."
});
const sourceTwo = createPredictionSource({
  id: "lineup-prediction-smoke-source-two",
  label: "Lineup prediction smoke source two",
  type: "lineup-prediction-smoke",
  checkedAt: generatedAt,
  note: "Second independent synthetic provider source used by smoke tests."
});

function player(index, name, position, sourceId = source.id) {
  return {
    name,
    number: String(index + 1),
    position,
    confidence: { score: 0.82 },
    sourceIds: [sourceId]
  };
}

function side(teamId, names, sourceId = source.id) {
  const positions = ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "RW", "AM", "LW", "ST"];
  return {
    teamId,
    formation: "4-2-3-1",
    starters: names.map((name, index) => player(index, name, positions[index], sourceId)),
    benchCandidates: [
      player(11, `${teamId} Bench One`, "ST", sourceId),
      player(12, `${teamId} Bench Two`, "CM", sourceId)
    ],
    sourceIds: [sourceId],
    notes: ["Synthetic provider candidate"]
  };
}

function fixtureCandidate(sourceId, providerId = "smoke-provider") {
  return {
    providerId,
    fixtureId: "fixture-smoke",
    updatedAt: generatedAt,
    confidence: { score: 0.82 },
    sourceIds: [sourceId],
    sides: {
      home: side("HOM", [
        "Home Alpha",
        "Home Bravo",
        "Home Charlie",
        "Home Delta",
        "Home Echo",
        "Home Foxtrot",
        "Home Golf",
        "Home Hotel",
        "Home India",
        "Home Juliett",
        "Home Kilo"
      ], sourceId),
      away: side("AWY", [
        "Away Alpha",
        "Away Bravo",
        "Away Charlie",
        "Away Delta",
        "Away Echo",
        "Away Foxtrot",
        "Away Golf",
        "Away Hotel",
        "Away India",
        "Away Juliett",
        "Away Kilo"
      ], sourceId)
    }
  };
}

const provider = {
  id: "smoke-provider",
  label: "Smoke provider",
  version: "1",
  async collect() {
    return { fixtureIds: ["fixture-smoke"] };
  },
  async normalize() {
    return [
      fixtureCandidate(source.id),
      fixtureCandidate(sourceTwo.id)
    ];
  }
};

const { document } = await runLineupPredictionEngine({
  context: {},
  generatedAt,
  options: {
    sourceIndependenceKeys: {
      [source.id]: "smoke-one",
      [sourceTwo.id]: "smoke-two"
    }
  },
  providers: [provider],
  sources: [source, sourceTwo],
  targetFixtures: [smokeFixture]
});

validatePredictionDocument(document, { now: "2026-07-07T19:00:00.000Z" });
assert.equal(document.fixtures.length, 1);
assert.equal(document.fixtures[0].lineup.home.players.length, 11);
assert.equal(document.fixtures[0].lineup.away.players.length, 11);
assert(document.fixtures[0].lineup.confidence.score >= 0.75);
assert.equal(document.fixtures[0].lineup.confidence.label, "high");
const compactDocument = compactPredictionDocumentForBrowser(document);
assert.equal(compactDocument.fixtures[0].lineup.home.evidence, undefined);
assert.equal(compactDocument.fixtures[0].lineup.home.players[0].evidence, undefined);
assert(compactDocument.fixtures[0].lineup.home.players[0].sourceIds.length > 0);

const localOnlyProvider = {
  id: "local-official-history",
  label: "Local-only smoke provider",
  version: "1",
  async collect() {
    return { fixtureIds: ["fixture-smoke"] };
  },
  async normalize() {
    return [fixtureCandidate(source.id, "local-official-history")];
  }
};
const localOnlyResult = await runLineupPredictionEngine({
  context: {},
  generatedAt,
  providers: [localOnlyProvider],
  sources: [source],
  targetFixtures: [smokeFixture]
});
assert(localOnlyResult.document.fixtures[0].lineup.confidence.score < 0.75);
assert.equal(localOnlyResult.document.fixtures[0].lineup.confidence.label, "medium");

const noGoalkeeperProvider = {
  id: "no-goalkeeper-provider",
  label: "No goalkeeper smoke provider",
  version: "1",
  async collect() {
    return {};
  },
  async normalize() {
    const candidate = fixtureCandidate(source.id, "no-goalkeeper-provider");
    candidate.sides.home.starters[0].position = "CM";
    candidate.sides.away.starters[0].position = "CM";
    return [candidate];
  }
};
const noGoalkeeperResult = await runLineupPredictionEngine({
  context: {},
  generatedAt,
  providers: [noGoalkeeperProvider],
  sources: [source],
  targetFixtures: [smokeFixture]
});
assert.equal(
  noGoalkeeperResult.document.fixtures.length,
  0,
  "A role assignment with no goalkeeper candidate must be rejected"
);

const sameNameTeammateProvider = {
  id: "same-name-teammate-provider",
  label: "Same-name teammate smoke provider",
  version: "1",
  async collect() {
    return {};
  },
  async normalize() {
    const candidate = fixtureCandidate(source.id, "same-name-teammate-provider");
    candidate.sides.home.starters[0].name = "Ederson";
    candidate.sides.home.starters[1].name = "Danilo";
    candidate.sides.home.starters[5].name = "Ederson Silva";
    candidate.sides.home.starters[6].name = "Danilo Santos";
    return [candidate];
  }
};
const sameNameTeammateResult = await runLineupPredictionEngine({
  context: {},
  generatedAt,
  providers: [sameNameTeammateProvider],
  sources: [source],
  targetFixtures: [smokeFixture]
});
const sameNameTeammates = sameNameTeammateResult.document.fixtures[0].lineup.home.players.map((player) => player.name);
for (const expectedName of ["Ederson", "Ederson Silva", "Danilo", "Danilo Santos"]) {
  assert(sameNameTeammates.includes(expectedName), `Distinct teammate ${expectedName} must survive exact lineup identity handling`);
}

const generatorIdentityProvider = {
  id: "generator-identity-provider",
  label: "Generator identity smoke provider",
  version: "1",
  async collect() { return {}; },
  async normalize() {
    const candidate = fixtureCandidate(source.id, "generator-identity-provider");
    candidate.sides.home.starters[0].name = "Ederson Silva";
    candidate.sides.home.starters[1].name = "Danilo Santos";
    candidate.sides.home.benchCandidates[0].name = "Ederson";
    candidate.sides.home.benchCandidates[1].name = "Danilo";
    candidate.sides.home.unavailable = [{ name: "Ederson" }, { name: "Danilo" }];
    return [candidate];
  }
};
const generatorIdentityProfiles = { profiles: {} };
for (const candidate of [
  ...fixtureCandidate(source.id).sides.home.starters.slice(2),
  { name: "Ederson", teamId: "HOM" },
  { name: "Ederson Silva", teamId: "HOM" },
  { name: "Danilo", teamId: "HOM" },
  { name: "Danilo Santos", teamId: "HOM" }
]) {
  generatorIdentityProfiles.profiles[candidate.name] = {
    name: candidate.name,
    displayName: candidate.name,
    teamId: "HOM"
  };
}
const generatorIdentityResult = await runLineupPredictionEngine({
  context: {},
  generatedAt,
  providers: [generatorIdentityProvider],
  sources: [source],
  targetFixtures: [smokeFixture],
  options: { playerProfilesData: generatorIdentityProfiles }
});
const generatorIdentityNames = [
  ...generatorIdentityResult.document.fixtures[0].lineup.home.players,
  ...generatorIdentityResult.document.fixtures[0].lineup.home.bench
].map((candidate) => candidate.name);
for (const expectedName of ["Ederson Silva", "Danilo Santos"]) {
  assert(generatorIdentityNames.includes(expectedName), `Generator availability must preserve ${expectedName}`);
}
for (const unavailableName of ["Ederson", "Danilo"]) {
  assert(!generatorIdentityNames.includes(unavailableName), `Generator availability must remove exact player ${unavailableName}`);
}

const brazilIdentityPool = ["Ederson", "Ederson Silva", "Danilo", "Danilo Santos"];
assert.equal(
  resolvePlayerNameInPool("Ederson", brazilIdentityPool).candidate,
  "Ederson",
  "An exact canonical identity must beat a fuzzy match to a longer teammate name"
);
assert.equal(
  resolvePlayerNameInPool("Ederson Santana de Moraes", brazilIdentityPool).candidate,
  "Ederson",
  "A full-name alias may resolve when exactly one team identity matches"
);
assert.equal(
  resolvePlayerNameInPool("Edersom", brazilIdentityPool).status,
  "ambiguous",
  "An alias matching multiple teammates must remain unresolved"
);

const identityFixture = { ...smokeFixture, id: "fixture-same-name-availability" };
const identitySourceDocument = {
  sources: [{ id: "same-name-public-source", checkedAt: generatedAt }],
  fixtures: [{
    fixtureId: identityFixture.id,
    sources: [{
      sourceId: "same-name-public-source",
      teams: {
        home: {
          teamId: "HOM",
          formation: "4-2-3-1",
          starters: [
            { name: "Ederson Silva", position: "GK" },
            { name: "Danilo Santos", position: "CM" }
          ],
          bench: [
            { name: "Ederson", position: "GK" },
            { name: "Danilo", position: "CB" }
          ]
        }
      }
    }]
  }]
};
const identityFreeProvider = createFreePublicLineupsProvider({ checkedAt: generatedAt });
const unfilteredIdentityCandidates = await identityFreeProvider.normalize(await identityFreeProvider.collect({
  freeLineupPredictionsData: identitySourceDocument,
  playerAvailabilityData: {},
  targetFixtures: [identityFixture]
}));
assert.deepEqual(
  unfilteredIdentityCandidates[0].sides.home.benchCandidates.map((candidate) => candidate.name),
  ["Ederson", "Danilo"],
  "Longer same-name starters must not remove distinct exact-name teammates from the bench"
);
const filteredIdentityCandidates = await identityFreeProvider.normalize(await identityFreeProvider.collect({
  freeLineupPredictionsData: identitySourceDocument,
  playerAvailabilityData: {
    teams: {
      HOM: {
        fixtureUnavailable: [
          { fixtureId: identityFixture.id, name: "Ederson" },
          { fixtureId: identityFixture.id, name: "Danilo" }
        ]
      }
    }
  },
  targetFixtures: [identityFixture]
}));
assert.deepEqual(
  filteredIdentityCandidates[0].sides.home.starters.map((candidate) => candidate.name),
  ["Ederson Silva", "Danilo Santos"],
  "Exact availability entries must not remove longer-name teammates"
);
assert.equal(
  filteredIdentityCandidates[0].sides.home.benchCandidates.length,
  0,
  "Exact availability entries must still remove the intended exact-name players"
);

const localIdentityNames = [
  "Ederson",
  "Danilo",
  "Brazil Centre One",
  "Brazil Centre Two",
  "Brazil Left Back",
  "Ederson Silva",
  "Danilo Santos",
  "Brazil Right Wing",
  "Brazil Ten",
  "Brazil Left Wing",
  "Brazil Striker"
];
const localIdentityPositions = ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "RW", "AM", "LW", "ST"];
const localIdentityPlayers = localIdentityNames.map((name, index) => ({
  name,
  number: String(index + 1),
  position: localIdentityPositions[index]
}));
const localIdentityProfiles = Object.fromEntries(
  [...localIdentityNames, "Brazil Replacement"].map((name) => [name, { name, displayName: name, teamId: "HOM" }])
);
const localIdentityHistoryProvider = createLocalOfficialHistoryProvider({
  checkedAt: generatedAt,
  sourceId: source.id
});
const localIdentityCandidates = await localIdentityHistoryProvider.normalize(await localIdentityHistoryProvider.collect({
  fixturesData: {
    fixtures: [{
      id: "fixture-same-name-history",
      kickoffUtc: "2026-07-01T18:30:00.000Z",
      status: "FT",
      matchNumber: 90,
      homeTeamId: "HOM",
      awayTeamId: "OLD"
    }]
  },
  lineupsData: {
    lineups: {
      "fixture-same-name-history": {
        sourceIds: [source.id],
        home: {
          formation: "4-2-3-1",
          players: localIdentityPlayers,
          bench: [{ name: "Brazil Replacement", number: "12", position: "ST" }]
        }
      }
    }
  },
  playerAvailabilityData: {
    teams: {
      HOM: {
        fixtureUnavailable: [{ fixtureId: identityFixture.id, name: "Ederson" }]
      }
    }
  },
  playerProfilesData: { profiles: localIdentityProfiles },
  targetFixtures: [identityFixture]
}));
const localIdentityStarterNames = localIdentityCandidates[0].sides.home.starters.map((candidate) => candidate.name);
assert(!localIdentityStarterNames.includes("Ederson"), "Local history must remove the exact unavailable Ederson");
for (const expectedName of ["Ederson Silva", "Danilo", "Danilo Santos"]) {
  assert(
    localIdentityStarterNames.includes(expectedName),
    `Local history must preserve distinct same-name teammate ${expectedName}`
  );
}

const malformedDocument = structuredClone(document);
malformedDocument.fixtures[0].lineup.home.players.pop();
assert.throws(
  () => validatePredictionDocument(malformedDocument, { now: "2026-07-07T19:00:00.000Z" }),
  /exactly 11 starters/
);

const staleDocument = structuredClone(document);
staleDocument.generatedAt = "2026-07-01T18:30:00.000Z";
assert.throws(
  () => validatePredictionDocument(staleDocument, { now: "2026-07-07T19:00:00.000Z" }),
  /stale/
);

assert.equal(
  isFutureLineupFixture(smokeFixture, "2026-07-08T18:29:59.000Z"),
  true,
  "A scheduled fixture remains prediction-eligible only before kickoff"
);
assert.equal(
  isFutureLineupFixture(smokeFixture, smokeFixture.kickoffUtc),
  false,
  "A stale SCHEDULED status must not create a prediction at or after kickoff"
);
const delayedFixture = { ...smokeFixture, status: "DELAYED" };
const frozenDelayedRecord = {
  ...structuredClone(document.fixtures[0]),
  lastUpdated: "2026-07-08T18:00:00.000Z"
};
assert.equal(
  isFrozenDelayedLineupFixture(delayedFixture, frozenDelayedRecord, "2026-07-08T19:00:00.000Z"),
  true,
  "A delayed fixture should retain its last valid pre-scheduled-time prediction"
);
const delayedExpectedDocument = {
  ...structuredClone(document),
  engine: { revisionId: "delayed-revision" },
  fixtures: [frozenDelayedRecord]
};
const delayedAuditRevision = {
  revisionId: "delayed-revision",
  engine: { revisionId: "delayed-revision" },
  sources: [source],
  fixtures: [{
    fixture: { id: smokeFixture.id },
    prediction: frozenDelayedRecord,
    providerCandidates: [normalizeProviderCandidate(fixtureCandidate(source.id))]
  }]
};
const delayedMergeDocument = { fixtures: [], sources: [], run: {} };
const delayedMergeAudit = { fixtures: [] };
mergeFrozenDelayedPredictions({
  auditDocument: delayedMergeAudit,
  document: delayedMergeDocument,
  expectedLineupsAuditData: delayedAuditRevision,
  expectedLineupsData: delayedExpectedDocument,
  frozenDelayedRecords: [frozenDelayedRecord],
  predictionRevisionLedgerData: { revisions: [] },
  targetFixtureCount: 1
});
assert.equal(delayedMergeDocument.fixtures[0].lastUpdated, frozenDelayedRecord.lastUpdated);
assert.equal(delayedMergeAudit.fixtures[0].providerCandidates.length, 1);
const pastKickoffResult = await runLineupPredictionEngine({
  context: {},
  generatedAt: smokeFixture.kickoffUtc,
  providers: [provider],
  sources: [source, sourceTwo],
  targetFixtures: [smokeFixture]
});
assert.equal(pastKickoffResult.document.fixtures.length, 0, "Generation itself must enforce the kickoff cutoff");

const weightedCandidate = normalizeProviderCandidate(fixtureCandidate(source.id));
const weightOne = scoreSideCandidate(weightedCandidate, "home", {
  now: generatedAt,
  providerWeights: { "smoke-provider": 1 }
}).score;
const weightTwo = scoreSideCandidate(weightedCandidate, "home", {
  now: generatedAt,
  providerWeights: { "smoke-provider": 2 }
}).score;
assert(Math.abs(weightTwo / weightOne - 2) < 0.01, "Provider weight must be applied once, not squared");
const reliabilityWeighted = scoreSideCandidate(weightedCandidate, "home", {
  now: generatedAt,
  sourceReliability: { [source.id]: 1.2 }
}).score;
assert(Math.abs(reliabilityWeighted / weightOne - 1.2) < 0.01, "Optional learned source reliability must be applied once");
const directReportedCandidate = normalizeProviderCandidate({
  ...fixtureCandidate(source.id),
  claimStrength: 3
});
const directReportedWeight = scoreSideCandidate(directReportedCandidate, "home", {
  now: generatedAt
}).score;
assert(
  Math.abs(directReportedWeight / weightOne - 3) < 0.01,
  "Explicit direct-report claim strength must be bounded and applied once"
);

const consensusFixture = {
  ...smokeFixture,
  id: "fixture-consensus",
  kickoffUtc: "2026-07-09T18:30:00.000Z"
};
function consensusCandidate(sourceId, updatedAt, variant) {
  const candidate = structuredClone(fixtureCandidate(sourceId, "consensus-provider"));
  candidate.fixtureId = consensusFixture.id;
  candidate.updatedAt = updatedAt;
  candidate.confidence = { score: variant === "minority" ? 0.96 : 0.82 };
  candidate.sides.home.starters[6] = player(6, variant === "minority" ? "Home Minority" : "Home Consensus", "CM", sourceId);
  candidate.sides.home.starters[7] = player(7, variant === "minority" ? "Home Olise" : "Home Dembele", "RW", sourceId);
  candidate.sides.home.starters[8] = player(8, variant === "minority" ? "Home Dembele" : "Home Olise", "AM", sourceId);
  return candidate;
}
const consensusProvider = {
  id: "consensus-provider",
  label: "Consensus provider",
  version: "1",
  async collect() { return {}; },
  async normalize() {
    return [
      consensusCandidate("source-minority", "2026-07-05T18:30:00.000Z", "minority"),
      consensusCandidate("source-majority-a", "2026-07-07T18:00:00.000Z", "majority"),
      consensusCandidate("source-majority-a-duplicate", "2026-07-07T18:05:00.000Z", "majority"),
      consensusCandidate("source-majority-b", "2026-07-07T18:10:00.000Z", "majority")
    ];
  }
};
const consensusResult = await runLineupPredictionEngine({
  context: {},
  generatedAt,
  providers: [consensusProvider],
  sources: [],
  targetFixtures: [consensusFixture],
  options: {
    sourceIndependenceKeys: {
      "source-minority": "minority",
      "source-majority-a": "majority-a",
      "source-majority-a-duplicate": "majority-a",
      "source-majority-b": "majority-b"
    }
  }
});
const consensusHome = consensusResult.document.fixtures[0].lineup.home;
assert(
  consensusHome.players.some((candidate) => candidate.name === "Home Consensus") &&
    !consensusHome.players.some((candidate) => candidate.name === "Home Minority"),
  "Two independent sources must beat the highest-rated minority XI player by player"
);
assert.deepEqual(
  consensusHome.players.slice(7, 9).map((candidate) => [candidate.name, candidate.position]),
  [["Home Dembele", "RW"], ["Home Olise", "AM"]],
  "Consensus role evidence must assign selected players coherently to formation slots"
);
const consensusScore = consensusResult.document.fixtures[0].evidence.home.starterScores
  .find((candidate) => candidate.name === "Home Consensus");
assert.equal(consensusScore.independentStarterVotes, 2, "Duplicate candidates from one outlet must count as one vote");

const partialFixture = { ...smokeFixture, id: "fixture-partial" };
const homeOnly = structuredClone(fixtureCandidate(source.id, "partial-provider"));
homeOnly.fixtureId = partialFixture.id;
delete homeOnly.sides.away;
const awayOnly = structuredClone(fixtureCandidate(sourceTwo.id, "partial-provider"));
awayOnly.fixtureId = partialFixture.id;
delete awayOnly.sides.home;
const partialProvider = {
  id: "partial-provider",
  label: "Partial provider",
  version: "1",
  async collect() { return {}; },
  async normalize() { return [homeOnly, awayOnly]; }
};
const partialResult = await runLineupPredictionEngine({
  context: {},
  generatedAt,
  providers: [partialProvider],
  sources: [source, sourceTwo],
  targetFixtures: [partialFixture]
});
assert.equal(partialResult.document.fixtures.length, 1, "Independent one-team candidates must combine into a complete fixture prediction");

const duplicateBenchDocument = structuredClone(document);
duplicateBenchDocument.fixtures[0].lineup.home.bench.push({
  ...duplicateBenchDocument.fixtures[0].lineup.home.players[0],
  name: "Home Alpha"
});
assert.throws(
  () => validatePredictionDocument(duplicateBenchDocument, { now: "2026-07-07T19:00:00.000Z" }),
  /both starter and bench/
);
const badCoordinateDocument = structuredClone(document);
badCoordinateDocument.fixtures[0].lineup.home.players[0].x = 101;
assert.throws(
  () => validatePredictionDocument(badCoordinateDocument, { now: "2026-07-07T19:00:00.000Z" }),
  /from 0 to 100/
);
const syntheticProfiles = { profiles: {} };
for (const [teamId, lineupSide] of [
  ["HOM", document.fixtures[0].lineup.home],
  ["AWY", document.fixtures[0].lineup.away]
]) {
  for (const candidate of [...lineupSide.players, ...lineupSide.bench]) {
    syntheticProfiles.profiles[`${teamId}:${candidate.name}`] = { name: candidate.name, teamId };
  }
}
validatePredictionDocument(document, {
  fixtures: [smokeFixture],
  now: "2026-07-07T19:00:00.000Z",
  playerProfilesData: syntheticProfiles
});
const unknownRosterDocument = structuredClone(document);
unknownRosterDocument.fixtures[0].lineup.home.players[10].name = "Unknown Intruder";
assert.throws(
  () => validatePredictionDocument(unknownRosterDocument, {
    fixtures: [smokeFixture],
    now: "2026-07-07T19:00:00.000Z",
    playerProfilesData: syntheticProfiles
  }),
  /not on the known team roster/
);
const wrongTeamDocument = structuredClone(document);
wrongTeamDocument.fixtures[0].lineup.home.teamId = "WRONG";
assert.throws(
  () => validatePredictionDocument(wrongTeamDocument, {
    fixtures: [smokeFixture],
    now: "2026-07-07T19:00:00.000Z"
  }),
  /teamId must be HOM/
);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const freePredictionSources = JSON.parse(
  await readFile(path.join(root, "data/free-lineup-prediction-sources.json"), "utf8")
);
const loadedPredictionContext = await collectLineupPredictionData({ now: "2026-06-01T00:00:00.000Z" });
const matchdayGeneratedAt = "2026-07-14T17:40:00.000Z";
const researchFixtureIds = new Set([
  "match-101-semi-final-2026-07-14",
  "match-102-semi-final-2026-07-15"
]);
const researchTargetFixtures = loadedPredictionContext.fixturesData.fixtures
  .filter((fixture) => researchFixtureIds.has(fixture.id))
  .map((fixture) => ({ ...fixture, status: "SCHEDULED" }));
assert.equal(researchTargetFixtures.length, 2, "Synthetic matchday targets must resolve from fixture data");
const currentPredictionContext = {
  ...loadedPredictionContext,
  targetFixtures: researchTargetFixtures
};
const currentTargetFixtureIds = researchTargetFixtures.map((fixture) => fixture.id);
const automaticHistoryFallbackStages = new Set(["bronze-final", "final"]);
const curatedRequiredFixtureIds = currentPredictionContext.targetFixtures
  .filter((fixture) => !automaticHistoryFallbackStages.has(fixture.stage))
  .map((fixture) => fixture.id);
const curatedFixtureIds = new Set(
  (freePredictionSources.fixtures || [])
    .filter((fixture) => Array.isArray(fixture.sources) && fixture.sources.length > 0)
    .map((fixture) => fixture.fixtureId)
);
assert.deepEqual(
  curatedRequiredFixtureIds.filter((fixtureId) => !curatedFixtureIds.has(fixtureId)),
  [],
  "Every upcoming confirmed fixture before the medal matches must have a current curated probable-lineup source"
);

const franceSpainFixtureId = "match-101-semi-final-2026-07-14";
const fifaPreviewSourceId = "fifa-france-spain-preview-2026-07-13";
const fifaPreviewProvider = createFreePublicLineupsProvider({ checkedAt: matchdayGeneratedAt });
const fifaPreviewRaw = await fifaPreviewProvider.collect({
  freeLineupPredictionsData: freePredictionSources,
  playerAvailabilityData: {},
  targetFixtures: currentPredictionContext.targetFixtures
});
const fifaPreviewCandidates = await fifaPreviewProvider.normalize(fifaPreviewRaw);
assert.deepEqual(
  curatedRequiredFixtureIds.filter((fixtureId) =>
    !fifaPreviewCandidates.some((candidate) => candidate.fixtureId === fixtureId)
  ),
  [],
  "Every upcoming confirmed fixture before the medal matches must normalize at least one curated probable-lineup candidate"
);
const fifaPreviewCandidate = fifaPreviewCandidates.find((candidate) =>
  candidate.fixtureId === franceSpainFixtureId && candidate.sourceIds.includes(fifaPreviewSourceId)
);
assert(fifaPreviewCandidate, "France-Spain FIFA probable-lineup source should remain wired into prediction generation");
assert.deepEqual(
  fifaPreviewCandidate.sides.home.starters.slice(7, 10).map((player) => [player.name, player.position]),
  [
    ["Ousmane Dembele", "RW"],
    ["Michael Olise", "AM"],
    ["Desire Doue", "LW"]
  ],
  "France's curated attacking roles should not infer Olise-right and Dembele-central from FIFA prose order"
);
assert.equal(fifaPreviewCandidate.sides.away.formation, "4-2-3-1");
assert(
  fifaPreviewCandidate.sides.away.starters.some((player) => player.name === "Pedri") &&
    !fifaPreviewCandidate.sides.away.starters.some((player) => player.name === "Fabian Ruiz"),
  "FIFA's current France-Spain preview should restore Pedri instead of carrying over the Belgium-only Fabian Ruiz selection"
);

const franceSpainPrediction = await runLineupPredictionEngine({
  context: currentPredictionContext,
  generatedAt: matchdayGeneratedAt,
  providers: [
    createLocalOfficialHistoryProvider({
      checkedAt: matchdayGeneratedAt,
      sourceId: "lineup-prediction-official-history-smoke"
    }),
    fifaPreviewProvider
  ],
  sources: [],
  targetFixtures: currentPredictionContext.targetFixtures,
  options: {
    coachProfilesData: currentPredictionContext.coachProfilesData,
    playerProfilesData: currentPredictionContext.playerProfilesData,
    sourceIndependenceKeys: Object.fromEntries(
      (freePredictionSources.sources || []).map((source) => [
        source.id,
        source.independenceKey || source.outlet || source.id
      ])
    )
  }
});
const medalFixtureAssignments = new Map([
  ["match-103-bronze-final-2026-07-18", ["ESP", "ARG"]],
  ["match-104-final-2026-07-19", ["FRA", "ENG"]]
]);
const simulatedMedalFixtures = currentPredictionContext.fixturesData.fixtures
  .filter((fixture) => medalFixtureAssignments.has(fixture.id))
  .map((fixture) => {
    const [homeTeamId, awayTeamId] = medalFixtureAssignments.get(fixture.id);
    return { ...fixture, homeTeamId, awayTeamId };
  });
const simulatedMedalContext = {
  ...currentPredictionContext,
  targetFixtures: simulatedMedalFixtures
};
const simulatedMedalPrediction = await runLineupPredictionEngine({
  context: simulatedMedalContext,
  generatedAt,
  providers: [
    createLocalOfficialHistoryProvider({
      checkedAt: generatedAt,
      sourceId: source.id
    })
  ],
  sources: [source],
  targetFixtures: simulatedMedalFixtures,
  options: {
    coachProfilesData: currentPredictionContext.coachProfilesData,
    playerProfilesData: currentPredictionContext.playerProfilesData
  }
});
assert.equal(
  simulatedMedalPrediction.document.fixtures.length,
  2,
  "Final and bronze-final should receive automatic predictions as soon as both participants resolve"
);
for (const record of simulatedMedalPrediction.document.fixtures) {
  assert.equal(record.mode, "expected", "Automatic medal-match baseline must remain medium-confidence expected, not probable");
  assert(record.confidence.score <= 0.72, "Automatic medal-match baseline must keep the local-history confidence cap");
  assert.equal(record.lineup.home.players.length, 11);
  assert.equal(record.lineup.away.players.length, 11);
}
const simulatedBronze = simulatedMedalPrediction.document.fixtures.find((record) => record.fixtureId.includes("bronze-final"));
const simulatedFinal = simulatedMedalPrediction.document.fixtures.find((record) => record.fixtureId === "match-104-final-2026-07-19");
assert(simulatedBronze.confidence.score <= 0.58, "Bronze-final rotation risk must carry a stricter evidence-strength cap");
assert(
  simulatedBronze.evidence.home.notes.some((note) => note.includes("rotation risk")),
  "Bronze-final baseline must disclose rotation risk"
);
assert(simulatedFinal.confidence.score <= 0.72 && simulatedFinal.confidence.score > simulatedBronze.confidence.score);
const generatedFranceSpain = franceSpainPrediction.document.fixtures.find(
  (record) => record.fixtureId === franceSpainFixtureId
);
assert.deepEqual(
  currentTargetFixtureIds.filter((fixtureId) =>
    !franceSpainPrediction.document.fixtures.some((record) => record.fixtureId === fixtureId)
  ),
  [],
  "Every upcoming confirmed fixture must produce a complete prediction, including automatic medal-match history fallbacks"
);
assert(generatedFranceSpain, "France-Spain should produce a matchday consensus prediction");
assert.deepEqual(
  generatedFranceSpain.lineup.home.players.slice(7, 10).map((player) => [player.name, player.position, player.x]),
  [
    ["Ousmane Dembélé", "RW", 82],
    ["Michael Olise", "AM", 50],
    ["Bradley Barcola", "LW", 18]
  ],
  "France-Spain output should apply late direct team news while keeping Dembele right and Olise central"
);
assert(
  generatedFranceSpain.lineup.home.players.some((player) => player.name === "Aurélien Tchouaméni") &&
    !generatedFranceSpain.lineup.home.players.some((player) => player.name === "Manu Kone"),
  "Fresh matchday sources should return fit first-choice Tchouameni over the injury-cover Kone XI"
);
assert(
  generatedFranceSpain.lineup.away.players.some((player) => player.name === "Fabián Ruiz") &&
    !generatedFranceSpain.lineup.away.players.some((player) => player.name === "Pedri"),
  "Fresh matchday sources should keep Belgium starter Fabian Ruiz in Spain's predicted XI"
);

const englandArgentinaFixtureId = "match-102-semi-final-2026-07-15";
const englandArgentinaSourceId = "fifa-england-argentina-preview-2026-07-13";
const englandArgentinaFreshSourceIds = [
  "sports-mole-england-argentina-team-news-2026-07-14",
  "stats-zone-england-argentina-preview-2026-07-14"
];
const englandArgentinaCandidate = fifaPreviewCandidates.find((candidate) =>
  candidate.fixtureId === englandArgentinaFixtureId && candidate.sourceIds.includes(englandArgentinaSourceId)
);
assert(englandArgentinaCandidate, "England-Argentina FIFA probable-lineup source should remain wired into prediction generation");
assert.equal(englandArgentinaCandidate.sides.home.formation, "4-2-3-1");
assert(
  englandArgentinaCandidate.sides.home.starters.some((player) => player.name === "Reece James") &&
    englandArgentinaCandidate.sides.home.starters.some((player) => player.name === "Bukayo Saka"),
  "FIFA's earlier Reece James prediction should remain visible as dissenting evidence"
);
assert.equal(englandArgentinaCandidate.sides.away.formation, "4-1-3-2");

for (const sourceId of englandArgentinaFreshSourceIds) {
  const candidate = fifaPreviewCandidates.find((entry) =>
    entry.fixtureId === englandArgentinaFixtureId && entry.sourceIds.includes(sourceId)
  );
  assert(candidate, `${sourceId} should normalize as fresh England-Argentina evidence`);
  assert.deepEqual(
    candidate.sides.home.starters.slice(1, 5).map((player) => [player.name, player.position]),
    [
      ["Ezri Konsa", "RB"],
      ["John Stones", "RCB"],
      ["Marc Guehi", "LCB"],
      ["Nico O'Reilly", "LB"]
    ],
    "Fresh England sources should preserve the reported right-to-left order of the back four"
  );
}

const generatedEnglandArgentina = franceSpainPrediction.document.fixtures.find(
  (record) => record.fixtureId === englandArgentinaFixtureId
);
assert(generatedEnglandArgentina, "England-Argentina should produce a matchday consensus prediction");
assert.deepEqual(
  generatedEnglandArgentina.lineup.home.players.slice(1, 5)
    .map((player) => [player.name, player.position])
    .sort(([left], [right]) => left.localeCompare(right)),
  [
    ["Ezri Konsa", "RB"],
    ["John Stones", "CB"],
    ["Marc Guéhi", "CB"],
    ["Nico O'Reilly", "LB"]
  ].sort(([left], [right]) => left.localeCompare(right)),
  "Fresh two-source consensus should supersede FIFA's older Reece James guess"
);
assert.deepEqual(
  generatedEnglandArgentina.lineup.home.players
    .filter((player) => ["John Stones", "Marc Guéhi"].includes(player.name))
    .map((player) => [player.name, player.position, player.x]),
  [
    ["John Stones", "CB", 62],
    ["Marc Guéhi", "CB", 38]
  ],
  "Generated output should display standard CB roles while retaining source-backed right/left placement"
);
assert(
  generatedEnglandArgentina.lineup.home.players.some((player) => player.name === "Bukayo Saka") &&
    !generatedEnglandArgentina.lineup.home.players.some((player) => player.name === "Noni Madueke"),
  "Fit-again Saka should replace the quarter-final rotation starter"
);
const englandSquadNames = [
  ...generatedEnglandArgentina.lineup.home.players,
  ...generatedEnglandArgentina.lineup.home.bench
].map((player) => player.name);
assert.equal(
  englandSquadNames.filter((name) => isPlayerNameMatch(name, "Nico O'Reilly")).length,
  1,
  "Canonical player identity must prevent Nico O'Reilly from appearing as both starter and bench"
);
for (const unavailableName of ["Jarell Quansah", "Jordan Henderson"]) {
  assert(
    !englandSquadNames.some((name) => isPlayerNameMatch(name, unavailableName)),
    `${unavailableName} must be hard-excluded by fixture-specific availability`
  );
}

console.log("Lineup prediction engine smoke passed: output, confidence caps, malformed, stale, upcoming coverage, medal-match fallbacks, and fresh preview consensus covered.");
