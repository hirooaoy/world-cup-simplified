#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPredictionHistoryRecord } from "./lineup-prediction-history.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const historyPath = path.join(dataDir, "lineup-prediction-history.json");
const checkedAt = new Date().toISOString();

const snapshots = [
  { fixtureId: "match-96-round-of-16-2026-07-07", commit: "2fd69e8" },
  { fixtureId: "match-97-quarter-final-2026-07-09", commit: "7ab4b0c" },
  { fixtureId: "match-98-quarter-final-2026-07-10", commit: "cb6f0d4" },
  { fixtureId: "match-99-quarter-final-2026-07-11", commit: "82f60ec" },
  { fixtureId: "match-100-quarter-final-2026-07-11", commit: "104a268" }
];

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

async function readOptionalHistory() {
  try {
    return JSON.parse(await readFile(historyPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { schemaVersion: "1.0", updatedAt: checkedAt, fixtures: [] };
    }
    throw error;
  }
}

function gitText(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 20_000_000 }).trim();
}

const [fixturesData, historyData] = await Promise.all([
  readJson("fixtures.json"),
  readOptionalHistory()
]);
const fixturesById = new Map((fixturesData.fixtures || []).map((fixture) => [fixture.id, fixture]));
const recordsById = new Map((historyData.fixtures || []).map((record) => [record.fixtureId, record]));
let backfilledCount = 0;

for (const snapshot of snapshots) {
  if (recordsById.has(snapshot.fixtureId)) {
    continue;
  }

  const fixture = fixturesById.get(snapshot.fixtureId);
  if (!fixture) {
    throw new Error(`Unknown fixture ${snapshot.fixtureId}`);
  }

  const capturedAt = gitText(["show", "-s", "--format=%cI", snapshot.commit]);
  if (Date.parse(capturedAt) >= Date.parse(fixture.kickoffUtc)) {
    throw new Error(`${snapshot.fixtureId} snapshot ${snapshot.commit} is not pre-kickoff`);
  }

  const expectedLineupsData = JSON.parse(
    gitText(["show", `${snapshot.commit}:data/expected-lineups.json`])
  );
  const snapshotTournamentData = JSON.parse(
    gitText(["show", `${snapshot.commit}:data/tournament.json`])
  );
  const record = (expectedLineupsData.fixtures || []).find((candidate) => candidate.fixtureId === snapshot.fixtureId);
  if (!record) {
    throw new Error(`${snapshot.fixtureId} missing from ${snapshot.commit}:data/expected-lineups.json`);
  }

  recordsById.set(snapshot.fixtureId, createPredictionHistoryRecord({
    expectedLineupsData,
    externalSources: snapshotTournamentData.sources || [],
    fixture,
    record,
    capturedAt,
    captureMethod: "git-pre-kickoff-backfill",
    snapshotRef: snapshot.commit
  }));
  backfilledCount += 1;
}

const nextHistory = {
  ...historyData,
  schemaVersion: historyData.schemaVersion || "1.0",
  updatedAt: backfilledCount ? checkedAt : historyData.updatedAt,
  fixtures: [...recordsById.values()].sort((a, b) => String(a.kickoffUtc).localeCompare(String(b.kickoffUtc)))
};

await writeFile(historyPath, `${JSON.stringify(nextHistory, null, 2)}\n`);
console.log(`Lineup prediction history backfilled: ${backfilledCount} added, ${nextHistory.fixtures.length} total.`);
