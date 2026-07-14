#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectLineupPredictionData } from "./lineup-prediction-engine/data-collection.mjs";
import { mergeFrozenDelayedPredictions } from "./lineup-prediction-engine/delayed-preservation.mjs";
import { runLineupPredictionEngine } from "./lineup-prediction-engine/engine.mjs";
import { createPredictionSource } from "./lineup-prediction-engine/model.mjs";
import {
  writeExpectedLineupsDocument,
  writePredictionAuditDocument
} from "./lineup-prediction-engine/output.mjs";
import { createFreePublicLineupsProvider } from "./lineup-prediction-engine/providers/free-public-lineups.mjs";
import { createLocalOfficialHistoryProvider } from "./lineup-prediction-engine/providers/local-official-history.mjs";
import { appendPredictionAuditRevision } from "./lineup-prediction-revisions.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = new Date();
const refreshIfNeeded = process.argv.includes("--if-needed");
const maxUnchangedAgeHours = Number(process.env.LINEUP_PREDICTION_REFRESH_HOURS || 24);
const sourceDate = generatedAt.toISOString().slice(0, 10);
const officialHistorySourceId = "lineup-prediction-official-history";
const officialHistorySource = createPredictionSource({
  id: officialHistorySourceId,
  label: "Lineup prediction official-history provider",
  type: "lineup-prediction-provider",
  checkedAt: generatedAt,
  note: "Uses local FIFA official lineup history, recent formations, minutes/load, and explicit player availability."
});

const context = await collectLineupPredictionData();

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }
  return value;
}

function sha256(value) {
  const serialized = typeof value === "string"
    ? value
    : JSON.stringify(canonicalize(value));
  return createHash("sha256").update(serialized).digest("hex");
}

function collectReferencedSourceIds(value, output = new Set()) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectReferencedSourceIds(entry, output);
    }
    return output;
  }
  if (!value || typeof value !== "object") {
    return output;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (key === "sourceId" && entry) {
      output.add(String(entry));
      continue;
    }
    if (key === "sourceIds" && Array.isArray(entry)) {
      for (const sourceId of entry) {
        if (sourceId) output.add(String(sourceId));
      }
    } else {
      collectReferencedSourceIds(entry, output);
    }
  }
  return output;
}

function stripVolatileMetadata(value) {
  if (Array.isArray(value)) {
    return value.map(stripVolatileMetadata);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !["generatedAt", "lastUpdated", "updatedAt"].includes(key))
      .map(([key, entry]) => [key, stripVolatileMetadata(entry)])
  );
}

function projectFixture(fixture = {}) {
  return {
    id: fixture.id,
    matchNumber: fixture.matchNumber,
    stage: fixture.stage,
    status: fixture.status,
    kickoffUtc: fixture.kickoffUtc,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId
  };
}

function projectPlayer(player = {}) {
  return {
    name: player.name,
    number: String(player.number || ""),
    position: player.position,
    ...(Number.isFinite(Number(player.x)) ? { x: Number(player.x) } : {}),
    ...(Number.isFinite(Number(player.y)) ? { y: Number(player.y) } : {})
  };
}

function projectHistoricalSide(side = {}) {
  return {
    formation: side.formation,
    players: (side.players || []).map(projectPlayer),
    bench: (side.bench || []).map(projectPlayer),
    events: {
      substitutions: (side.events?.substitutions || []).map((substitution) => ({
        minute: substitution.minute,
        offName: substitution.offName,
        onName: substitution.onName
      }))
    }
  };
}

function createPredictionInputSnapshot(context) {
  const targetFixtures = context.targetFixtures || [];
  const targetFixtureIds = new Set(targetFixtures.map((fixture) => fixture.id));
  const relevantTeamIds = new Set(
    targetFixtures.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId]).filter(Boolean)
  );
  const historicalFixtureIds = new Set();
  const allFixtures = context.fixturesData.fixtures || [];
  const lineupsByFixtureId = context.lineupsData.lineups || {};

  for (const targetFixture of targetFixtures) {
    const targetKickoff = Date.parse(targetFixture.kickoffUtc || "");
    for (const teamId of [targetFixture.homeTeamId, targetFixture.awayTeamId]) {
      allFixtures
        .filter((fixture) =>
          ["FT", "AET", "PEN"].includes(fixture.status) &&
          Date.parse(fixture.kickoffUtc || "") < targetKickoff &&
          [fixture.homeTeamId, fixture.awayTeamId].includes(teamId) &&
          lineupsByFixtureId[fixture.id]
        )
        .sort((left, right) => Date.parse(right.kickoffUtc) - Date.parse(left.kickoffUtc))
        .slice(0, 5)
        .forEach((fixture) => historicalFixtureIds.add(fixture.id));
    }
  }

  const relevantHistoricalFixtures = allFixtures
    .filter((fixture) => historicalFixtureIds.has(fixture.id))
    .map(projectFixture);
  const relevantLineups = Object.fromEntries(
    [...historicalFixtureIds]
      .sort()
      .map((fixtureId) => {
        const record = lineupsByFixtureId[fixtureId] || {};
        return [fixtureId, {
          sourceIds: record.sourceIds || [],
          home: projectHistoricalSide(record.home),
          away: projectHistoricalSide(record.away)
        }];
      })
  );
  const relevantFreeFixtureEntries = (context.freeLineupPredictionsData.fixtures || [])
    .filter((record) => targetFixtureIds.has(record.fixtureId));
  const relevantFreeSourceIds = collectReferencedSourceIds(relevantFreeFixtureEntries);
  const relevantFreeSources = (context.freeLineupPredictionsData.sources || [])
    .filter((source) => relevantFreeSourceIds.has(source.id));
  const relevantAvailability = Object.fromEntries(
    [...relevantTeamIds]
      .sort()
      .filter((teamId) => context.playerAvailabilityData.teams?.[teamId])
      .map((teamId) => [teamId, stripVolatileMetadata(context.playerAvailabilityData.teams[teamId])])
  );
  const relevantProfiles = Object.fromEntries(
    Object.entries(context.playerProfilesData.profiles || {})
      .filter(([, profile]) => relevantTeamIds.has(profile.teamId))
      .map(([key, profile]) => [key, {
        name: profile.name,
        displayName: profile.displayName,
        teamId: profile.teamId,
        position: profile.position,
        uniformNumber: profile.uniformNumber
      }])
  );
  const relevantCoachProfiles = Object.fromEntries(
    Object.entries(context.coachProfilesData.profiles || {})
      .filter(([, profile]) => relevantTeamIds.has(profile.teamId))
      .map(([key, profile]) => [key, stripVolatileMetadata(profile)])
  );
  const externalSourceIds = collectReferencedSourceIds({
    availability: relevantAvailability,
    freeFixtures: relevantFreeFixtureEntries,
    lineups: relevantLineups
  });
  const relevantTournamentSources = (context.tournamentData.sources || [])
    .filter((source) => externalSourceIds.has(source.id));

  return {
    targetFixtures: targetFixtures.map(projectFixture),
    historicalFixtures: relevantHistoricalFixtures,
    lineups: relevantLineups,
    availability: relevantAvailability,
    freePredictionFixtures: relevantFreeFixtureEntries,
    freePredictionSources: relevantFreeSources,
    playerProfiles: relevantProfiles,
    coachProfiles: relevantCoachProfiles,
    tournamentSources: relevantTournamentSources,
    frozenDelayedRecords: (context.frozenDelayedRecords || []).map(stripVolatileMetadata)
  };
}

function createMaterialAuditSnapshot(auditDocument) {
  function visit(value) {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !["checkedAt", "generatedAt", "revisionId", "runId", "updatedAt"].includes(key))
        .map(([key, entry]) => [key, visit(entry)])
    );
  }
  return visit(auditDocument);
}

async function listPredictionModelFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listPredictionModelFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".mjs")) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

async function createModelFingerprint() {
  const engineDir = path.join(root, "scripts/lineup-prediction-engine");
  const files = [
    fileURLToPath(import.meta.url),
    path.join(root, "scripts/player-name-matching.mjs"),
    ...await listPredictionModelFiles(engineDir)
  ];
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(path.relative(root, file));
    hash.update("\0");
    hash.update(await readFile(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

const inputFingerprint = sha256(createPredictionInputSnapshot(context));
const modelFingerprint = await createModelFingerprint();

if (refreshIfNeeded) {
  let existingDocument = null;
  let existingAuditDocument = null;
  let existingRevisionLedger = null;
  try {
    existingDocument = JSON.parse(
      await readFile(path.join(root, "data/expected-lineups.json"), "utf8")
    );
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
  try {
    existingAuditDocument = JSON.parse(
      await readFile(path.join(root, "data/expected-lineups-audit.json"), "utf8")
    );
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
  try {
    existingRevisionLedger = JSON.parse(
      await readFile(path.join(root, "data/lineup-prediction-revisions.json"), "utf8")
    );
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  const targetFixtureIds = context.targetFixtures.map((fixture) => fixture.id).sort();
  const existingFixtureIds = (existingDocument?.fixtures || []).map((record) => record.fixtureId).sort();
  const expectedRevisionId = existingDocument?.engine?.revisionId;
  const sameCoverage = JSON.stringify(targetFixtureIds) === JSON.stringify(existingFixtureIds);
  const sameInputs = existingDocument?.engine?.inputFingerprint === inputFingerprint;
  const sameModel = existingDocument?.engine?.modelFingerprint === modelFingerprint;
  const currentAudit = Boolean(expectedRevisionId) &&
    existingAuditDocument?.revisionId === expectedRevisionId &&
    existingAuditDocument?.engine?.inputFingerprint === inputFingerprint &&
    existingAuditDocument?.engine?.modelFingerprint === modelFingerprint;
  const revisionRecorded = (existingRevisionLedger?.revisions || [])
    .some((revision) => revision?.revisionId === expectedRevisionId);
  const existingGeneratedAt = new Date(existingDocument?.generatedAt || "");
  const ageHours = (generatedAt.getTime() - existingGeneratedAt.getTime()) / 36e5;
  const freshEnough = Number.isFinite(ageHours) && ageHours >= 0 && ageHours < maxUnchangedAgeHours;

  if (sameCoverage && sameInputs && sameModel && currentAudit && revisionRecorded && freshEnough) {
    console.log(
      `Expected lineups already cover ${targetFixtureIds.length}/${targetFixtureIds.length} target fixtures ` +
        `and match the current inputs/model (${ageHours.toFixed(1)}h old); regeneration skipped.`
    );
    process.exit(0);
  }

  const reasons = [
    !sameCoverage && "fixture coverage changed",
    !sameInputs && "prediction inputs changed",
    !sameModel && "prediction model changed",
    !currentAudit && "current audit artifact is missing or stale",
    !revisionRecorded && "immutable audit revision is missing",
    !freshEnough && "prediction document is stale"
  ].filter(Boolean);
  console.log(`Expected lineup regeneration required: ${reasons.join(", ") || "missing document"}.`);
}

const externalSourceIds = (context.tournamentData.sources || []).map((source) => source.id);
const externalSourceIdSet = new Set(externalSourceIds);
const freePredictionSources = (context.freeLineupPredictionsData.sources || []).map((source) =>
  createPredictionSource({
    id: source.id,
    label: source.label,
    type: source.type || "free-public-probable-lineup",
    checkedAt: source.checkedAt || generatedAt,
    sourceRole: "lineup-candidate",
    suppliesLineup: true,
    url: source.url,
    note: source.note
  })
).filter((source) => !externalSourceIdSet.has(source.id));
const sourceIndependenceKeys = Object.fromEntries(
  (context.freeLineupPredictionsData.sources || []).map((source) => [
    source.id,
    source.independenceKey || source.outlet || source.id
  ])
);
const localProvider = createLocalOfficialHistoryProvider({
  checkedAt: generatedAt,
  sourceId: officialHistorySourceId
});
const freeProvider = createFreePublicLineupsProvider({
  checkedAt: generatedAt
});
const { auditDocument, document } = await runLineupPredictionEngine({
  context,
  generatedAt,
  generator: {
    runId: `lineup-prediction-${sourceDate}-${inputFingerprint.slice(0, 12)}`
  },
  inputs: [
    { file: "data/fixtures.json", role: "target fixtures and kickoff dates" },
    { file: "data/lineups.json", role: "last verified XI, formation, bench, substitutions, and recent minutes/load" },
    { file: "data/player-availability.json", role: "injury, omission, and fixture availability exclusions" },
    { file: "data/free-lineup-prediction-sources.json", role: "free public probable-lineup source candidates" }
  ],
  options: {
    coachProfilesData: context.coachProfilesData,
    playerProfilesData: context.playerProfilesData,
    sourceIndependenceKeys
  },
  providers: [localProvider, freeProvider],
  sources: [officialHistorySource, ...freePredictionSources],
  targetFixtures: context.generatableTargetFixtures || context.targetFixtures
});
mergeFrozenDelayedPredictions({
  auditDocument,
  document,
  expectedLineupsAuditData: context.expectedLineupsAuditData,
  expectedLineupsData: context.expectedLineupsData,
  externalSourceIds,
  frozenDelayedRecords: context.frozenDelayedRecords,
  predictionRevisionLedgerData: context.predictionRevisionLedgerData,
  targetFixtureCount: context.targetFixtures.length
});
document.engine.inputFingerprint = inputFingerprint;
document.engine.modelFingerprint = modelFingerprint;
auditDocument.engine = { ...document.engine };
const auditSourceIds = collectReferencedSourceIds(auditDocument.fixtures);
const auditSourcesById = new Map(
  [...(context.tournamentData.sources || []), ...(document.sources || [])]
    .filter((source) => source?.id)
    .map((source) => [source.id, source])
);
auditDocument.sources = [...auditSourceIds]
  .map((sourceId) => auditSourcesById.get(sourceId))
  .filter(Boolean)
  .sort((left, right) => left.id.localeCompare(right.id));
auditDocument.revisionId = sha256({
  inputFingerprint,
  modelFingerprint,
  audit: createMaterialAuditSnapshot(auditDocument)
});
document.engine.revisionId = auditDocument.revisionId;
auditDocument.engine.revisionId = auditDocument.revisionId;
const output = await writeExpectedLineupsDocument(document, {
  externalSourceIds,
  fixtures: context.fixturesData.fixtures
});
await writePredictionAuditDocument(auditDocument);
const revision = await appendPredictionAuditRevision(auditDocument);

console.log(
  `Expected lineups generated: ${output.fixtures.length}/${context.targetFixtures.length} target fixtures ` +
    `(${output.run?.candidateCount || 0} provider candidates; ` +
    `${revision.added ? "new immutable revision" : "unchanged revision"}).`
);
