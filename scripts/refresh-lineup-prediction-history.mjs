#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPredictionHistoryRecord } from "./lineup-prediction-history.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

function gitJson(commit, fileName) {
  return JSON.parse(execFileSync(
    "git",
    ["show", `${commit}:data/${fileName}`],
    { cwd: root, encoding: "utf8", maxBuffer: 30_000_000 }
  ));
}

const [fixturesData, historyData] = await Promise.all([
  readJson("fixtures.json"),
  readJson("lineup-prediction-history.json")
]);
const fixturesById = new Map((fixturesData.fixtures || []).map((fixture) => [fixture.id, fixture]));
let refreshedCount = 0;

const fixtures = (historyData.fixtures || []).map((historyRecord) => {
  if (!historyRecord.snapshotRef) {
    return historyRecord;
  }

  const fixture = fixturesById.get(historyRecord.fixtureId);
  if (!fixture) {
    throw new Error(`Unknown archived fixture ${historyRecord.fixtureId}`);
  }

  const expectedLineupsData = gitJson(historyRecord.snapshotRef, "expected-lineups.json");
  const tournamentData = gitJson(historyRecord.snapshotRef, "tournament.json");
  const predictionRecord = (expectedLineupsData.fixtures || [])
    .find((record) => record.fixtureId === historyRecord.fixtureId);
  if (!predictionRecord) {
    throw new Error(`${historyRecord.fixtureId} missing from ${historyRecord.snapshotRef}`);
  }

  refreshedCount += 1;
  return createPredictionHistoryRecord({
    expectedLineupsData,
    externalSources: tournamentData.sources || [],
    fixture,
    record: predictionRecord,
    capturedAt: historyRecord.capturedAt,
    captureMethod: historyRecord.captureMethod,
    snapshotRef: historyRecord.snapshotRef
  });
});

const nextHistory = {
  ...historyData,
  schemaVersion: "1.1",
  updatedAt: new Date().toISOString(),
  fixtures
};
await writeFile(
  path.join(dataDir, "lineup-prediction-history.json"),
  `${JSON.stringify(nextHistory, null, 2)}\n`
);
console.log(`Lineup prediction history refreshed from pre-kickoff snapshots: ${refreshedCount} record(s).`);
