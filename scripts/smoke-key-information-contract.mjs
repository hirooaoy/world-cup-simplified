#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  EXCLUDED_CURRENT_MATCH_INPUTS,
  KEY_INFORMATION_MODE,
  KEY_INFORMATION_SCHEMA_VERSION,
  KEY_INFORMATION_SOURCE_ID,
  assertCurrentMatchOutcomeInvariant,
  auditKeyInformationCollections,
  createCurrentMatchArchiveEvidenceSnapshot
} from "./key-information-contract.mjs";
import { assertKeyInformationModel } from "../locales/key-information-runtime.js";
import { formatKeyInformationSentences as formatEs } from "../locales/key-information-es.js";
import { formatKeyInformationSentences as formatKo } from "../locales/key-information-ko.js";
import { formatKeyInformationSentences as formatZh } from "../locales/key-information-zh.js";
import {
  buildPriorTournamentContexts,
  generateCurrentKeyInformationForFixture
} from "./populate-matchup-key-information.mjs";
import { buildHistoricalEvidenceContent } from "./populate-historical-matchup-key-information.mjs";

const currentLineup = {
  home: {
    formation: "4-3-3",
    starters: ["Aura One", "Aura Two", "Aura Three", "Aura Four", "Ada North", "Mira Sol", "June Lake", "Talia Reed", "Aura Nine", "Aura Ten", "Aura Eleven"]
  },
  away: {
    formation: "4-2-3-1",
    starters: ["Boreal One", "Boreal Two", "Boreal Three", "Boreal Four", "Asha Glenn", "Nora Vale", "Imani Frost", "Boreal Eight", "Boreal Nine", "Boreal Ten", "Boreal Eleven"]
  }
};

const record = (overrides = {}) => ({
  matches: 2,
  wins: 1,
  draws: 1,
  losses: 0,
  goalsFor: 4,
  goalsAgainst: 2,
  cleanSheets: 1,
  pointsApplicable: true,
  ...overrides
});
const phaseRecord = (overrides = {}) => record({
  matches: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  cleanSheets: 0,
  points: 0,
  pointsApplicable: false,
  scope: "current-phase",
  ...overrides
});

function currentSide({ team, opponent, teamId, opponentId, formation, opponentFormation, own, opposing, plan, risk }) {
  return {
    version: 2,
    kind: "current-lineup",
    team: { id: teamId, name: team },
    opponent: { id: opponentId, name: opponent },
    stage: { id: "group", year: 2030 },
    slots: {
      identity: {
        variant: "structure-and-players",
        formation,
        namedStarters: [own, plan[0]],
        claimClass: "official-starting-structure",
        evidenceRefs: ["officialStartingXI", "officialTacticalLayout"],
        surfaceTemplateId: "identity-structure-and-players"
      },
      matchup: {
        variant: "central-lanes",
        lane: "central",
        opponentFormation,
        ownStarter: own,
        opposingStarter: opposing,
        claimClass: "official-starting-structure",
        evidenceRefs: ["officialStartingXI", "officialTacticalLayout"],
        surfaceTemplateId: "matchup-central-lanes"
      },
      plan: {
        key: "central",
        starters: plan,
        claimClass: "structural-description",
        evidenceRefs: ["officialStartingXI", "officialTacticalLayout"],
        surfaceTemplateId: "plan-central"
      },
      risk: {
        key: "opponent-central-forward",
        zone: "last-line",
        starters: risk,
        claimClass: "structural-inference",
        evidenceRefs: ["officialTacticalLayout"],
        surfaceTemplateId: "risk-opponent-central-forward"
      }
    }
  };
}

const currentModel = {
  version: 2,
  home: currentSide({
    team: "Aurora",
    opponent: "Borealis",
    teamId: "AUR",
    opponentId: "BOR",
    formation: "4-3-3",
    opponentFormation: "4-2-3-1",
    own: { name: "Mira Sol", position: "CM" },
    opposing: { name: "Asha Glenn", position: "RB" },
    plan: [{ name: "June Lake", position: "CM" }, { name: "Talia Reed", position: "LW" }],
    risk: [{ name: "Imani Frost", position: "AM" }, { name: "Nora Vale", position: "CM" }]
  }),
  away: currentSide({
    team: "Borealis",
    opponent: "Aurora",
    teamId: "BOR",
    opponentId: "AUR",
    formation: "4-2-3-1",
    opponentFormation: "4-3-3",
    own: { name: "Nora Vale", position: "CM" },
    opposing: { name: "Ada North", position: "RB" },
    plan: [{ name: "Imani Frost", position: "AM" }, { name: "Asha Glenn", position: "RB" }],
    risk: [{ name: "Talia Reed", position: "LW" }, { name: "Mira Sol", position: "CM" }]
  })
};

const metadata = {
  sourceId: KEY_INFORMATION_SOURCE_ID,
  mode: KEY_INFORMATION_MODE,
  schemaVersion: KEY_INFORMATION_SCHEMA_VERSION,
  narrativeMoment: "team-entrance",
  outcomeCutoff: "kickoff",
  generatedBy: "synthetic-2030-evidence-generator",
  evidenceInputs: ["teams", "officialStartingXI", "officialTacticalLayout"],
  excludedInputs: [...EXCLUDED_CURRENT_MATCH_INPUTS],
  researchSourceIds: ["synthetic-layout-2030"],
  layoutEvidence: {
    sourceIds: ["synthetic-layout-2030"],
    publishedAt: "2030-06-14T19:00:00.000Z",
    minutesFromKickoff: -60,
    timing: "pre-kickoff",
    perspective: "nominal",
    documentVersion: 1,
    exactLayout: true,
    note: "Official nominal tactical layout published before kickoff."
  }
};

const currentFixture = {
  id: "synthetic-aurora-borealis-2030-06-14",
  tournamentYear: 2030,
  stage: "group",
  round: "Group stage",
  groupId: "A",
  kickoffUtc: "2030-06-14T20:00:00.000Z",
  homeTeamId: "AUR",
  awayTeamId: "BOR",
  status: "SCHEDULED",
  keyInformation: {
    ...metadata,
    home: "Aurora line up in a 4-3-3, with a back four behind a three-player midfield and a front three. Their starting structure places June Lake centrally and Talia Reed on the left. Mira Sol occupies Aurora's central lane opposite Asha Glenn in Borealis' starting shape. Borealis place Nora Vale deeper than Imani Frost through the middle.",
    away: "Borealis line up in a 4-2-3-1, with a back four, two deeper midfielders, three attacking midfielders, and one striker. Their starting structure places Imani Frost centrally and Asha Glenn on the right. Nora Vale occupies Borealis' central lane opposite Ada North in Aurora's starting shape. Aurora place Mira Sol deeper than Talia Reed through the middle.",
    localeModel: currentModel
  }
};

const currentCollection = {
  name: "synthetic-future-edition",
  fixtures: [currentFixture],
  minWords: 50,
  maxWords: 72,
  lineupInput: "officialStartingXI",
  modelKind: "current-lineup",
  requiresLayoutEvidence: true,
  requiresStageEvidence: false,
  requiredInputs: ["officialStartingXI", "officialTacticalLayout"],
  validResearchSourceIds: new Set(["synthetic-layout-2030"]),
  getYear: (fixture) => fixture.tournamentYear,
  getTeamId: (fixture, side) => fixture[`${side}TeamId`],
  getTeamName: (_fixture, side) => side === "home" ? "Aurora" : "Borealis",
  getLineup: () => currentLineup
};

const valid = auditKeyInformationCollections([currentCollection], { minimumFixtureCount: 1, minimumSideCount: 2 });
assert.deepEqual(valid.issues, [], `Synthetic 2030 contract failed:\n${valid.issues.join("\n")}`);
for (const side of ["home", "away"]) assertKeyInformationModel(currentModel[side]);

const observedFixture = structuredClone(currentFixture);
observedFixture.id = "synthetic-aurora-borealis-observed-2030-06-14";
observedFixture.keyInformation.layoutEvidence = {
  ...observedFixture.keyInformation.layoutEvidence,
  publishedAt: "2030-06-14T20:08:00.000Z",
  minutesFromKickoff: 8,
  timing: "post-kickoff",
  perspective: "observed",
  note: "Official starting-layout record updated after observation; outcomes and match events remain excluded."
};
const observed = auditKeyInformationCollections([{ ...currentCollection, fixtures: [observedFixture] }]);
assert.deepEqual(observed.issues, [], `Synthetic observed-layout 2030 contract failed:\n${observed.issues.join("\n")}`);

for (const [language, formatter] of Object.entries({ es: formatEs, ko: formatKo, zh: formatZh })) {
  for (const side of ["home", "away"]) {
    const sentences = formatter(currentModel[side]);
    assert.equal(sentences.length, 4, `Synthetic 2030 ${language} ${side} must render four sentences`);
    assert(sentences.every(Boolean));
  }
}

const mutated = structuredClone(currentFixture);
mutated.score = { home: 7, away: 6 };
mutated.winnerTeamId = "AUR";
mutated.goalsHome = [{ name: "Mira Sol", minute: 9 }];
mutated.matchEvents = { cards: [{ playerName: "Mira Sol" }], substitutions: [{ offName: "Mira Sol" }] };
mutated.resultStoryBullets = ["Outcome-only material"];
const mutatedLineup = structuredClone(currentLineup);
mutatedLineup.home.events = { cards: [{ playerName: "Mira Sol" }] };
assertCurrentMatchOutcomeInvariant(currentFixture, mutated, currentLineup, mutatedLineup);
assert.deepEqual(
  createCurrentMatchArchiveEvidenceSnapshot(currentFixture, currentLineup),
  createCurrentMatchArchiveEvidenceSnapshot(mutated, mutatedLineup)
);

// Exercise the real edition generator, not a fixture that already contains
// generated prose. Outcome/event mutations on the current fixture must produce
// byte-identical English, locale model, and provenance metadata.
const [realFixturesData, realTeamsData, realLineupsData] = await Promise.all([
  readFile(new URL("../data/fixtures.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../data/teams.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../data/lineups.json", import.meta.url), "utf8").then(JSON.parse)
]);
const realFixture = realFixturesData.fixtures.find((fixture) => fixture.id === "match-104-final-2026-07-19");
const realLineup = realLineupsData.lineups[realFixture.id];
const realTeams = new Map(realTeamsData.teams.map((team) => [team.id, team]));
const realPrior = buildPriorTournamentContexts(realFixturesData.fixtures).get(realFixture.id);
const generatorInput = {
  fixture: realFixture,
  lineup: realLineup,
  homeTeam: realTeams.get(realFixture.homeTeamId),
  awayTeam: realTeams.get(realFixture.awayTeamId),
  editionYear: 2026,
  priorContext: realPrior
};
const realGenerated = generateCurrentKeyInformationForFixture(generatorInput);
const outcomeMutatedFixture = structuredClone(realFixture);
outcomeMutatedFixture.score = { home: 12, away: 11 };
outcomeMutatedFixture.winnerTeamId = realFixture.awayTeamId;
outcomeMutatedFixture.goalsHome = [{ name: "Outcome Only", minute: 1 }];
outcomeMutatedFixture.goalsAway = [{ name: "Outcome Only", minute: 90 }];
outcomeMutatedFixture.matchEvents = { cards: [{ playerName: "Outcome Only" }], substitutions: [] };
outcomeMutatedFixture.resultStoryBullets = ["Outcome only"];
const outcomeMutatedLineup = structuredClone(realLineup);
outcomeMutatedLineup.home.events = { cards: [{ playerName: "Outcome Only" }], substitutions: [] };
const realRegenerated = generateCurrentKeyInformationForFixture({
  ...generatorInput,
  fixture: outcomeMutatedFixture,
  lineup: outcomeMutatedLineup
});
assert.deepEqual(realRegenerated, realGenerated, "The real current generator must ignore current-match outcome and event mutations");

function expectFailure(mutator, expectedText) {
  const fixture = structuredClone(currentFixture);
  fixture.id = `invalid-${expectedText.replace(/[^a-z]+/gi, "-").toLowerCase()}`;
  mutator(fixture);
  const result = auditKeyInformationCollections([{ ...currentCollection, fixtures: [fixture] }]);
  assert(result.issues.some((issue) => issue.includes(expectedText)), `Expected failure containing ${expectedText}:\n${result.issues.join("\n")}`);
}

expectFailure((fixture) => { fixture.keyInformation.layoutEvidence.timing = "post-kickoff"; }, "timing must be derived");
expectFailure((fixture) => { fixture.keyInformation.excludedInputs.pop(); }, "excludedInputs must exactly equal");
expectFailure((fixture) => { fixture.keyInformation.researchSourceIds = []; }, "must be a non-empty array");
expectFailure((fixture) => { fixture.keyInformation.localeModel.home.slots.plan.evidenceRefs = ["editionTeamProfiles"]; }, "undeclared evidence input");
expectFailure((fixture) => { fixture.keyInformation.temporalCutoff = "kickoff"; }, "must not retain legacy");
expectFailure((fixture) => { fixture.keyInformation.localeModel.home.team.id = "BOR"; }, ".team.id must match");
expectFailure((fixture) => { fixture.keyInformation.localeModel.home.slots.plan.starters[0].name = "Nora Vale"; }, "outside the Aurora confirmed starting XI");
expectFailure((fixture) => { fixture.keyInformation.home = fixture.keyInformation.home.replace("Aurora line up", "Aurora is lined up"); }, "agreement plural");
expectFailure((fixture) => { fixture.keyInformation.home = fixture.keyInformation.home.replace("Aurora line up", "Aurora won 2-1 and line up"); }, "result or event leakage");

const historyLineup = {
  home: { formation: "4-3-3", starters: ["Mira Sol", "Talia Reed", "Ada North", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"] },
  away: { formation: "4-4-2", starters: ["Nora Vale", "Imani Frost", "Asha Glenn", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"] }
};
const historicalMetadata = {
  sourceId: KEY_INFORMATION_SOURCE_ID,
  mode: KEY_INFORMATION_MODE,
  schemaVersion: KEY_INFORMATION_SCHEMA_VERSION,
  narrativeMoment: "team-entrance",
  outcomeCutoff: "kickoff",
  generatedBy: "synthetic-historical-evidence-generator",
  evidenceInputs: ["teams", "stage", "confirmedStartingXI", "priorTournamentMatches", "manager", "hostStatus", "tournamentFormatRules"],
  excludedInputs: [...EXCLUDED_CURRENT_MATCH_INPUTS],
  researchSourceIds: ["synthetic-history-source"]
};
function historicalSide(team, opponent, managers, starters) {
  return {
    version: 2,
    kind: "historical-evidence",
    team: { name: team },
    opponent: { name: opponent },
    stage: { year: 2030, round: "Final", group: "", phase: "knockout" },
    slots: {
      identity: { isHost: false, managers, confirmedStarters: starters, prior: record({ scope: "tournament" }), phasePrior: phaseRecord(), scope: "tournament", claimClass: "documented-context", evidenceRefs: ["confirmedStartingXI", "priorTournamentMatches", "manager", "hostStatus"] },
      matchup: { key: "final-title", claimClass: "documented-stakes", evidenceRefs: ["stage", "tournamentFormatRules"] },
      plan: { key: "prior-record", prior: record({ scope: "tournament" }), phasePrior: phaseRecord(), scope: "tournament", claimClass: "documented-prior-record", evidenceRefs: ["priorTournamentMatches"] },
      risk: { key: "opponent-record", opponentPrior: record({ goalsFor: 5, scope: "tournament" }), phasePrior: phaseRecord(), scope: "tournament", claimClass: "documented-prior-record", evidenceRefs: ["priorTournamentMatches"] }
    }
  };
}
const historicalModel = {
  version: 2,
  home: historicalSide("Meridian", "Pacific", ["Alex Archive", "Casey Record"], ["Mira Sol", "Talia Reed", "Ada North"]),
  away: historicalSide("Pacific", "Meridian", ["Robin Source"], ["Nora Vale", "Imani Frost", "Asha Glenn"])
};
const historicalFixture = {
  id: "synthetic-historical-final-2030",
  tournamentYear: 2030,
  round: "Final",
  group: "",
  status: "FT",
  homeSlot: "Meridian",
  awaySlot: "Pacific",
  keyInformation: {
    ...historicalMetadata,
    home: "Meridian are entering the 2030 final with Alex Archive and Casey Record listed in management, and Mira Sol, Talia Reed, and Ada North confirmed in the starting side. Against Pacific, the title is decided in this match. Their earlier record is one win and one draw from two matches. Pacific bring five earlier goals through a side containing Nora Vale, Imani Frost, and Asha Glenn.",
    away: "Pacific are entering the 2030 final with Robin Source listed in management, and Nora Vale, Imani Frost, and Asha Glenn confirmed in the starting side. Against Meridian, the title is decided in this match. Their earlier record is one win and one draw from two matches. Meridian bring four earlier goals through a side containing Mira Sol, Talia Reed, and Ada North.",
    confirmedStarters: { home: historyLineup.home.starters, away: historyLineup.away.starters },
    confirmedFormations: { home: "4-3-3", away: "4-4-2" },
    localeModel: historicalModel
  }
};
const historicalCollection = {
  name: "synthetic-historical",
  fixtures: [historicalFixture],
  minWords: 50,
  maxWords: 85,
  lineupInput: "confirmedStartingXI",
  modelKind: "historical-evidence",
  noPlayerNamesBeforeYear: 1970,
  requiredInputs: ["priorTournamentMatches", "manager", "hostStatus", "tournamentFormatRules"],
  getYear: (fixture) => fixture.tournamentYear,
  getTeamName: (fixture, side) => fixture[`${side}Slot`],
  getLineup: () => historyLineup
};
const historicalResult = auditKeyInformationCollections([historicalCollection]);
assert.deepEqual(historicalResult.issues, [], `Synthetic historical contract failed:\n${historicalResult.issues.join("\n")}`);

const realHistoryData = JSON.parse(await readFile(new URL("../data/history.json", import.meta.url), "utf8"));
const realHistoricalFixture = realHistoryData.fixtures.find(
  (fixture) => fixture.id === "wc-1982-1982-07-05-matchday-6-italy-brazil"
);
const historicalSourceMatch = { stage_name: "second group stage", group_name: "Group 3" };
const historicalHomeModel = realHistoricalFixture.keyInformation.localeModel.home;
const historicalAwayModel = realHistoricalFixture.keyInformation.localeModel.away;
const historicalGeneratorInput = {
  fixture: realHistoricalFixture,
  sourceMatch: historicalSourceMatch,
  side: "home",
  managers: historicalHomeModel.slots.identity.managers,
  context: historicalHomeModel.slots.identity.prior,
  opponentContext: historicalAwayModel.slots.identity.prior,
  stageContext: { ...historicalHomeModel.slots.identity.prior, points: historicalHomeModel.slots.matchup.teamPoints },
  opponentStageContext: { ...historicalAwayModel.slots.identity.prior, points: historicalHomeModel.slots.matchup.opponentPoints },
  hostTeams: new Set(),
  copyPlayers: historicalHomeModel.slots.identity.confirmedStarters.map((name) => ({ name }))
};
const historicalGenerated = buildHistoricalEvidenceContent(historicalGeneratorInput);
const historicalOutcomeMutation = structuredClone(realHistoricalFixture);
historicalOutcomeMutation.score = { home: 20, away: 19 };
historicalOutcomeMutation.goalsHome = [{ name: "Outcome Only", minute: 1 }];
historicalOutcomeMutation.goalsAway = [{ name: "Outcome Only", minute: 90 }];
historicalOutcomeMutation.winner = "Brazil";
historicalOutcomeMutation.events = [{ type: "card" }];
assert.deepEqual(
  buildHistoricalEvidenceContent({ ...historicalGeneratorInput, fixture: historicalOutcomeMutation }),
  historicalGenerated,
  "The real historical evidence generator must ignore current-match outcome and event mutations"
);

assert.throws(
  () => assertKeyInformationModel({ ...currentModel.home, version: 99 }),
  /Unsupported Key information locale model version/
);

console.log("Key information schema 4 smoke passed for current, historical, locale, outcome-boundary, provenance, ownership, grammar, and synthetic 2030 cases.");
