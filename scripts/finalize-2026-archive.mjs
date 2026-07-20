#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ARCHIVE_MANIFEST_NAME, build2026ArchivePlan } from "./finalize-2026-archive-lib.mjs";
import { commit2026Archive } from "./finalize-2026-archive-transaction.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const shouldWrite = process.argv.includes("--write");
const allowLateCorrection = process.argv.includes("--late-correction");
const now = new Date(process.env.ARCHIVE_NOW || Date.now());
const inputSnapshots = new Map();

async function readJson(fileName, { optional = false } = {}) {
  try {
    const contents = await readFile(path.join(dataDir, fileName), "utf8");
    inputSnapshots.set(fileName, contents);
    return JSON.parse(contents);
  } catch (error) {
    if (error?.code === "ENOENT" && optional) {
      inputSnapshots.set(fileName, null);
      return null;
    }
    throw error;
  }
}

const [fixturesData, teamsData, standingsData, tournamentData, historyData, lifecycle, lineupsData, expectedLineupsData, predictionHistory, officialEventCorrectionsData, localeEsCurrentContent, localeKoCurrentContent, manifestData] =
  await Promise.all([
    readJson("fixtures.json"),
    readJson("teams.json"),
    readJson("standings.json"),
    readJson("tournament.json"),
    readJson("history.json"),
    readJson("edition-lifecycle.json"),
    readJson("lineups.json"),
    readJson("expected-lineups.json"),
    readJson("lineup-prediction-history.json"),
    readJson("official-event-corrections.json"),
    readJson(path.join("locales", "es", "current-content.json")),
    readJson(path.join("locales", "ko", "current-content.json")),
    readJson(path.join("archives", ARCHIVE_MANIFEST_NAME), { optional: true })
  ]);

const plan = build2026ArchivePlan({
  fixturesData,
  teamsData,
  standingsData,
  tournamentData,
  historyData,
  lifecycle,
  lineupsData,
  expectedLineupsData,
  predictionHistory,
  officialEventCorrectionsData,
  localeCurrentContent: {
    es: localeEsCurrentContent,
    ko: localeKoCurrentContent
  },
  manifestData
}, { now, allowLateCorrection });

console.log(`2026 archive is ready: ${plan.qualitySummary.fixtureCount} fixtures, ${plan.qualitySummary.teamCount} teams (${plan.archiveVersion}).`);
console.log(`Immutable file: ${plan.archiveRelativePath}`);
console.log(`SHA-256: ${plan.archiveSha256}`);
console.log("history.json remains unchanged while 2026 is the active fixture dataset, preventing duplicate calendar entries.");
if (!shouldWrite) {
  console.log("Dry run only. Re-run with --write after reviewing the final official snapshot.");
  process.exit(0);
}

await commit2026Archive({ dataDir, plan, snapshots: inputSnapshots });
console.log("Archived 2026, published the manifest, and closed live-era jobs. Late official corrections require --write --late-correction and create a new immutable snapshot.");
