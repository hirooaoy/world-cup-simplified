#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appendPredictionAuditRevision } from "./lineup-prediction-revisions.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "lineup-revision-smoke-"));
const outputPath = path.join(temporaryDirectory, "revisions.json");
const revision = {
  schemaVersion: "1",
  generatedAt: "2026-07-14T12:00:00.000Z",
  revisionId: "revision-a",
  engine: { inputFingerprint: "a".repeat(64), modelFingerprint: "b".repeat(64) },
  fixtures: []
};

try {
  assert.equal((await appendPredictionAuditRevision(revision, { outputPath })).added, true);
  assert.equal((await appendPredictionAuditRevision(revision, { outputPath })).added, false);
  assert.equal((await appendPredictionAuditRevision({
    ...revision,
    generatedAt: "2026-07-14T13:00:00.000Z",
    revisionId: "revision-b"
  }, { outputPath })).added, true);
  const ledger = JSON.parse(await readFile(outputPath, "utf8"));
  assert.equal(ledger.revisions.length, 2, "Revision ledger should deduplicate unchanged material revisions");
  assert.equal(ledger.schemaVersion, "2", "Revision ledger should use the compact audit schema");
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

async function readOptionalJson(relativePath) {
  try {
    return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

const [auditDocument, expectedDocument, revisionLedger] = await Promise.all([
  readOptionalJson("data/expected-lineups-audit.json"),
  readOptionalJson("data/expected-lineups.json"),
  readOptionalJson("data/lineup-prediction-revisions.json")
]);
if (auditDocument && expectedDocument && revisionLedger) {
  assert(auditDocument.revisionId, "Current prediction audit must have a revisionId");
  assert.equal(auditDocument.engine.inputFingerprint, expectedDocument.engine.inputFingerprint);
  assert.equal(auditDocument.engine.modelFingerprint, expectedDocument.engine.modelFingerprint);
  assert.equal(auditDocument.revisionId, expectedDocument.engine.revisionId);
  assert(
    revisionLedger.revisions.some((entry) => entry.revisionId === auditDocument.revisionId),
    "Immutable revision ledger must contain the current audit revision"
  );
  for (const record of expectedDocument.fixtures || []) {
    const auditFixture = (auditDocument.fixtures || [])
      .find((entry) => entry.fixture?.id === record.fixtureId);
    assert(auditFixture?.prediction, `${record.fixtureId} must have a selected prediction in the audit artifact`);
    assert(Array.isArray(auditFixture.providerCandidates), `${record.fixtureId} must preserve provider candidates`);
    const ledgerFixture = revisionLedger.revisions
      .find((entry) => entry.revisionId === auditDocument.revisionId)
      ?.fixtures?.find((entry) => entry.fixture?.id === record.fixtureId);
    assert.deepEqual(
      ledgerFixture?.prediction?.providers || [],
      auditFixture.prediction?.providers || [],
      `${record.fixtureId} compact revision must preserve selected provider exposure metadata`
    );
    assert.equal(
      ledgerFixture?.prediction?.predictionClass,
      auditFixture.prediction?.predictionClass || "forecast",
      `${record.fixtureId} compact revision must preserve forecast/reporting classification`
    );
    assert.deepEqual(
      (ledgerFixture?.providerCandidates || []).map((candidate) => candidate.predictionClass || "forecast"),
      (auditFixture.providerCandidates || []).map((candidate) => candidate.predictionClass || "forecast"),
      `${record.fixtureId} compact revision must preserve candidate forecast/reporting classes`
    );
  }
}

console.log("Lineup prediction audit smoke passed: immutable revisions deduplicate and preserve current candidate evidence.");
