#!/usr/bin/env node
import assert from "node:assert/strict";
import { auditPredictionHistory } from "./audit-lineup-prediction-history.mjs";
import {
  archiveCompletedExpectedLineups,
  archiveExpectedLineupsForFixtures,
  commitPredictionArchiveBeforeOfficialPersistence,
  getExpectedLineupTransitionFixtureIds
} from "./lineup-prediction-history.mjs";
import { isPlayerNameMatch, matchPlayerNameLists } from "./player-name-matching.mjs";

const capturedAt = "2026-07-14T12:00:00.000Z";
const inputFingerprint = "a".repeat(64);
const modelFingerprint = "b".repeat(64);
const predictionRevisionId = "current-prediction-revision";
const playerSuffixes = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliett", "Kilo"];
const player = (name, index) => ({
  name,
  number: String(index + 1),
  position: index === 0 ? "GK" : "CM",
  x: 50,
  y: 90 - index * 6,
  confidence: { label: "medium", score: 0.7 }
});
const side = (prefix) => ({
  formation: "4-2-3-1",
  players: Array.from({ length: 11 }, (_, index) => player(`${prefix} ${playerSuffixes[index]}`, index))
});
const expectedLineupsData = {
  generatedAt: "2026-07-14T10:00:00.000Z",
  engine: {
    id: "lineup-prediction-engine",
    version: "2",
    runId: "test-run",
    inputFingerprint,
    modelFingerprint,
    revisionId: predictionRevisionId
  },
  sources: [
    {
      id: "expected-source",
      label: "Expected lineup source",
      type: "cross-check",
      checkedAt: "2026-07-14T09:00:00.000Z",
      url: "https://example.com/expected"
    }
  ],
  fixtures: [
    {
      fixtureId: "fixture-complete",
      mode: "expected",
      lineup: { home: side("Home"), away: side("Away") }
    },
    {
      fixtureId: "fixture-scheduled",
      mode: "expected",
      sourceIds: ["expected-source", "external-source"],
      providers: [{ providerId: "test-provider", sourceIds: ["expected-source"] }],
      evidence: { note: "Preserve the selected prediction evidence." },
      lineup: { home: side("Future Home"), away: side("Future Away") }
    }
  ]
};
const fixturesData = {
  fixtures: [
    {
      id: "fixture-complete",
      kickoffUtc: "2026-07-14T11:00:00.000Z",
      status: "FT",
      homeTeamId: "HOM",
      awayTeamId: "AWY"
    },
    {
      id: "fixture-scheduled",
      kickoffUtc: "2026-07-15T11:00:00.000Z",
      status: "SCHEDULED",
      homeTeamId: "FHM",
      awayTeamId: "FAW"
    }
  ]
};
const candidateHomeStarters = side("Future Home").players;
const candidateAwayStarters = side("Future Away").players;
const predictionAuditData = {
  schemaVersion: "1",
  generatedAt: expectedLineupsData.generatedAt,
  revisionId: predictionRevisionId,
  engine: expectedLineupsData.engine,
  sources: [
    {
      id: "candidate-source",
      label: "Candidate lineup source",
      type: "cross-check",
      checkedAt: "2026-07-14T09:30:00.000Z",
      url: "https://example.com/candidate"
    }
  ],
  fixtures: [
    {
      fixture: fixturesData.fixtures[1],
      prediction: structuredClone(expectedLineupsData.fixtures[1]),
      providerCandidates: [
        {
          fixtureId: "fixture-scheduled",
          providerId: "candidate-provider",
          providerVersion: "1",
          sourceIds: ["candidate-source"],
          sides: {
            home: {
              teamId: "FHM",
              formation: "4-2-3-1",
              starters: candidateHomeStarters,
              sourceIds: ["candidate-source"]
            },
            away: {
              teamId: "FAW",
              formation: "4-2-3-1",
              starters: candidateAwayStarters,
              sourceIds: ["candidate-source"]
            }
          }
        }
      ]
    }
  ]
};
const predictionRevisionLedgerData = {
  schemaVersion: "1",
  revisions: [predictionAuditData]
};
const staleCurrentAuditData = structuredClone(predictionAuditData);
staleCurrentAuditData.revisionId = "stale-current-revision";
staleCurrentAuditData.engine.revisionId = "stale-current-revision";
staleCurrentAuditData.fixtures[0].providerCandidates[0].providerId = "stale-candidate-provider";

const first = archiveCompletedExpectedLineups({
  historyData: { schemaVersion: "1.0", updatedAt: capturedAt, fixtures: [] },
  expectedLineupsData,
  fixturesData,
  capturedAt
});
assert.equal(first.archivedCount, 1);
assert.equal(first.historyData.fixtures.length, 1);
assert.equal(first.historyData.fixtures[0].fixtureId, "fixture-complete");
assert.equal(first.historyData.fixtures[0].home.starters.length, 11);

const repeated = archiveCompletedExpectedLineups({
  historyData: first.historyData,
  expectedLineupsData,
  fixturesData,
  capturedAt
});
assert.equal(repeated.archivedCount, 0);
assert.equal(repeated.historyData.fixtures.length, 1);

const confirmed = archiveExpectedLineupsForFixtures({
  auditData: predictionAuditData,
  historyData: first.historyData,
  expectedLineupsData,
  fixturesData,
  fixtureIds: ["fixture-scheduled"],
  capturedAt,
  externalSources: [
    {
      id: "external-source",
      label: "External tournament source",
      type: "official",
      checkedAt: "2026-07-14T08:00:00.000Z",
      url: "https://example.com/external",
      note: "Source registered outside expected-lineups.json."
    }
  ],
  requireAuditRevision: true,
  revisionLedgerData: predictionRevisionLedgerData
});
assert.equal(confirmed.archivedCount, 1);
assert.equal(confirmed.historyData.fixtures.length, 2);
const confirmedRecord = confirmed.historyData.fixtures.find(
  (record) => record.fixtureId === "fixture-scheduled"
);
assert.equal(confirmedRecord.captureMethod, "fifa-lineup-confirmation");
assert.equal(confirmedRecord.revisionId, predictionRevisionId);
assert.equal(confirmedRecord.predictionGeneratedAt, expectedLineupsData.generatedAt);
assert.equal(confirmedRecord.providers[0].providerId, "test-provider");
assert.equal(confirmedRecord.candidates[0].providerId, "candidate-provider");
assert.equal(confirmedRecord.evidence.note, "Preserve the selected prediction evidence.");
assert.deepEqual(
  confirmedRecord.sources.map((source) => source.id).sort(),
  ["candidate-source", "expected-source", "external-source"]
);
assert(confirmedRecord.sourceIds.includes("candidate-source"));

const liveTransitionFixturesData = structuredClone(fixturesData);
liveTransitionFixturesData.fixtures.find(
  (fixture) => fixture.id === "fixture-scheduled"
).status = "LIVE";
const transitionedFixtureIds = getExpectedLineupTransitionFixtureIds({
  expectedLineupsData,
  fixturesData: liveTransitionFixturesData
});
assert.deepEqual(
  transitionedFixtureIds,
  ["fixture-complete", "fixture-scheduled"],
  "Results sync must identify both completed and newly live expected records before pruning"
);
const workflowOrderArchive = archiveExpectedLineupsForFixtures({
  auditData: predictionAuditData,
  historyData: first.historyData,
  expectedLineupsData,
  fixturesData: liveTransitionFixturesData,
  fixtureIds: transitionedFixtureIds,
  capturedAt,
  captureMethod: "fifa-results-prune",
  externalSources: [
    {
      id: "external-source",
      label: "External tournament source",
      type: "official",
      checkedAt: "2026-07-14T08:00:00.000Z",
      url: "https://example.com/external"
    }
  ],
  requireAuditRevision: true,
  revisionLedgerData: predictionRevisionLedgerData
});
assert.equal(workflowOrderArchive.archivedCount, 1);
const workflowOrderRecord = workflowOrderArchive.historyData.fixtures.find(
  (record) => record.fixtureId === "fixture-scheduled"
);
assert.equal(workflowOrderRecord.captureMethod, "fifa-results-prune");
assert.equal(workflowOrderRecord.revisionId, predictionRevisionId);
assert.equal(workflowOrderRecord.candidates[0].providerId, "candidate-provider");

const confirmationMetrics = auditPredictionHistory({
  historyData: { fixtures: [workflowOrderRecord] },
  lineupsData: {
    lineups: {
      "fixture-scheduled": {
        home: { formation: "4-2-3-1", players: candidateHomeStarters },
        away: { formation: "4-2-3-1", players: candidateAwayStarters }
      }
    }
  }
});
assert.equal(confirmationMetrics.candidateProviderMetrics["candidate-provider"].starterHits, 22);
assert.equal(confirmationMetrics.candidateSourceMetrics["candidate-source"].starterHits, 22);

const confirmedRepeated = archiveExpectedLineupsForFixtures({
  historyData: confirmed.historyData,
  expectedLineupsData,
  fixturesData,
  fixtureIds: ["fixture-scheduled"],
  capturedAt
});
assert.equal(confirmedRepeated.archivedCount, 0);
assert.equal(confirmedRepeated.historyData.fixtures.length, 2);

const ledgerResolved = archiveExpectedLineupsForFixtures({
  auditData: staleCurrentAuditData,
  historyData: first.historyData,
  expectedLineupsData,
  fixturesData,
  fixtureIds: ["fixture-scheduled"],
  capturedAt,
  requireAuditRevision: true,
  revisionLedgerData: predictionRevisionLedgerData
});
assert.equal(ledgerResolved.archivedCount, 1);
assert.equal(ledgerResolved.historyData.fixtures.at(-1).revisionId, predictionRevisionId);
assert.equal(ledgerResolved.historyData.fixtures.at(-1).candidates.length, 1);
assert.equal(
  ledgerResolved.historyData.fixtures.at(-1).candidates[0].providerId,
  "candidate-provider",
  "A stale current audit must not outrank the exact older ledger revision"
);

assert.throws(
  () => archiveExpectedLineupsForFixtures({
    auditData: null,
    historyData: first.historyData,
    expectedLineupsData,
    fixturesData,
    fixtureIds: ["fixture-scheduled"],
    capturedAt,
    requireAuditRevision: true,
    revisionLedgerData: { revisions: [] }
  }),
  /cannot archive without the matching prediction audit revision/
);

assert.throws(
  () => archiveExpectedLineupsForFixtures({
    historyData: { schemaVersion: "1.0", updatedAt: capturedAt, fixtures: [] },
    expectedLineupsData: {
      ...expectedLineupsData,
      generatedAt: "2026-07-15T11:00:00.000Z"
    },
    fixturesData,
    fixtureIds: ["fixture-scheduled"],
    capturedAt
  }),
  /prediction was not generated before kickoff/
);

const persistenceOrder = [];
await commitPredictionArchiveBeforeOfficialPersistence({
  archiveResult: confirmed,
  persistHistory: async () => {
    persistenceOrder.push("history");
  },
  persistOfficial: async () => {
    persistenceOrder.push("official");
  }
});
assert.deepEqual(
  persistenceOrder,
  ["history", "official"],
  "Prediction history must commit before the official lineup can persist"
);

const failedPersistenceOrder = [];
await assert.rejects(
  commitPredictionArchiveBeforeOfficialPersistence({
    archiveResult: confirmed,
    persistHistory: async () => {
      failedPersistenceOrder.push("history");
      throw new Error("Simulated history write failure");
    },
    persistOfficial: async () => {
      failedPersistenceOrder.push("official");
    }
  }),
  /Simulated history write failure/
);
assert.deepEqual(
  failedPersistenceOrder,
  ["history"],
  "Official lineup persistence must stop when history cannot commit"
);

assert.equal(isPlayerNameMatch("Pedri", "Pedro Porro"), false, "Near-neighbour names must not create false starter hits");
assert.equal(isPlayerNameMatch("Nico O'Reilly", "Nico Oreilly"), true, "Punctuation variants must share one canonical identity");
const oneToOne = matchPlayerNameLists(["Pedro Porro", "Pedro Porro"], ["Pedro Porro"]);
assert.equal(oneToOne.matches.length, 1, "One actual player can satisfy at most one predicted starter");

const predictedHome = side("Audit Home").players;
const predictedAway = side("Audit Away").players;
const predictedHomeBench = [player("Audit Home Bench One", 11), player("Audit Home Bench Two", 12)];
const predictedAwayBench = [player("Audit Away Bench One", 11), player("Audit Away Bench Two", 12)];
const actualHome = structuredClone(predictedHome);
actualHome[10] = structuredClone(predictedHomeBench[0]);
const actualAway = structuredClone(predictedAway);
const actualHomeBench = [structuredClone(predictedHome[10]), structuredClone(predictedHomeBench[1])];
const actualAwayBench = structuredClone(predictedAwayBench);
const auditResult = auditPredictionHistory({
  historyData: {
    fixtures: [{
      fixtureId: "fixture-audit",
      kickoffUtc: "2026-07-15T12:00:00.000Z",
      predictionGeneratedAt: "2026-07-14T12:00:00.000Z",
      confidence: { label: "high", score: 0.8 },
      providers: [{ providerId: "audit-provider" }],
      sourceIds: ["audit-source"],
      candidates: [{
        providerId: "audit-provider",
        predictionClass: "reported-xi",
        sourceIds: ["audit-source"],
        sides: {
          home: { starters: predictedHome },
          away: { starters: predictedAway }
        }
      }],
      home: { formation: "4-2-3-1", starters: predictedHome, bench: predictedHomeBench },
      away: { formation: "4-2-3-1", starters: predictedAway, bench: predictedAwayBench }
    }, {
      fixtureId: "fixture-reported",
      kickoffUtc: "2026-07-16T12:00:00.000Z",
      predictionGeneratedAt: "2026-07-16T10:00:00.000Z",
      predictionClass: "reported-xi-assisted",
      confidence: { label: "high", score: 0.9 },
      home: { formation: "4-2-3-1", starters: predictedHome },
      away: { formation: "4-2-3-1", starters: predictedAway }
    }]
  },
  lineupsData: {
    lineups: {
      "fixture-audit": {
        home: { formation: "4-2-3-1", players: actualHome, bench: actualHomeBench },
        away: { formation: "4-2-3-1", players: actualAway, bench: actualAwayBench }
      },
      "fixture-reported": {
        home: { formation: "4-2-3-1", players: predictedHome },
        away: { formation: "4-2-3-1", players: predictedAway }
      }
    }
  }
});
assert.equal(auditResult.starterHits, 21);
assert.equal(auditResult.exactXIs, 1);
assert.equal(auditResult.forecastFixtureCount, 1);
assert.equal(auditResult.reportedAssistedFixtureCount, 1);
assert.equal(auditResult.predictionClassMetrics["reported-xi-assisted"].starterHits, 22);
assert.equal(auditResult.candidateSourceMetrics["audit-source"], undefined);
assert.equal(auditResult.reportedCandidateSourceMetrics["audit-source"].starterHits, 21);
assert.equal(auditResult.benchHits, 3);
assert.equal(auditResult.benchSlots, 4);
assert.equal(auditResult.predictedBenchToStarter, 1);
assert.equal(auditResult.predictedStarterToBench, 1);
assert.equal(auditResult.leadTimeHours.average, 24);

console.log("Lineup prediction history smoke passed: cutoff-safe confirmation archive, canonical matching, and expanded accuracy metrics covered.");
