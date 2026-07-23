#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const args = process.argv.slice(2);

function getArgValue(name) {
  const flag = `--${name}=`;
  const arg = args.find((item) => item.startsWith(flag));
  return arg ? arg.slice(flag.length) : "";
}

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasArg(name) {
  return args.includes(`--${name}`) || args.some((item) => item.startsWith(`--${name}=`));
}

function normalizeProfileEdition(value) {
  const raw = String(value || "").trim();
  const year = raw.match(/\b(?:19|20)\d{2}\b/)?.[0];
  return year || raw || "2026";
}

function countNoteSentences(value) {
  return String(value || "")
    .split(/[.!?。！？]+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .length;
}

const BASELINE_ONE_LINE_NOTE_PATTERNS = [
  /\bcurrent World Cup squad pool\b/i,
  /\b(?:goalkeeping|defensive|wide defensive|between-lines|wide attacking|forward|midfield|match-plan) option, useful for\b/i,
  /(?:世界杯阵容|比赛计划|阵容人选|球队选择|可用人选)/u
];

function noteCanBeUpgraded(value, metadata = null) {
  const note = String(value || "").replace(/\s+/g, " ").trim();
  if (!note) {
    return true;
  }
  if (["authored", "generated"].includes(metadata?.origin)) {
    return false;
  }
  if (countNoteSentences(note) !== 1 || note.length > 180) {
    return false;
  }
  return BASELINE_ONE_LINE_NOTE_PATTERNS.some((pattern) => pattern.test(note)) ||
    fixturePlayerNotes.has(note);
}

function fieldsEqual(left, right) {
  if (
    (left && typeof left === "object") ||
    (right && typeof right === "object")
  ) {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
  }
  return left === right;
}

const profileEdition = normalizeProfileEdition(
  getArgValue("profile-edition") ||
    getArgValue("edition") ||
    process.env.PROFILE_EDITION ||
    "2026"
);
const overrideDir = path.join(dataDir, "player-profile-overrides", profileEdition);
const dryRun = hasArg("dry-run");
const rewriteSubstantive = hasArg("rewrite-substantive");

const teamIds = parseList(getArgValue("teams")).map((teamId) => teamId.toUpperCase());
const fields = parseList(getArgValue("fields") || "skills,note,noteZh,noteMeta");

if (!teamIds.length) {
  console.error(
    "Usage: node scripts/sync-player-profile-overrides.mjs --teams=FRA,MAR " +
      "--edition=2026 --fields=skills,note,noteZh [--dry-run] [--rewrite-substantive]"
  );
  process.exit(1);
}

if (!existsSync(overrideDir)) {
  console.error(`No player-profile override directory exists for edition ${profileEdition}: ${overrideDir}`);
  process.exit(1);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const profilesPath = path.join(dataDir, "player-profiles.json");
const [profilesData, fixturesData] = await Promise.all([
  readJson(profilesPath),
  readJson(path.join(dataDir, "fixtures.json"))
]);
const fixturePlayerNotes = new Set();
for (const fixture of fixturesData.fixtures || []) {
  for (const side of ["home", "away"]) {
    for (const player of fixture.keyPlayers?.[side] || []) {
      const note = String(player?.note || "").replace(/\s+/g, " ").trim();
      if (note) {
        fixturePlayerNotes.add(note);
      }
    }
  }
}
let updated = 0;
let skippedSubstantive = 0;
const missing = [];

for (const teamId of teamIds) {
  const overridePath = path.join(overrideDir, `${teamId}.json`);
  const overridesData = await readJson(overridePath);
  for (const [profileName, override] of Object.entries(overridesData.profiles || {})) {
    const profile = profilesData.profiles?.[profileName];
    if (!profile) {
      missing.push(`${teamId}:${profileName}`);
      continue;
    }

    for (const field of fields) {
      if (override[field] === undefined) {
        continue;
      }
      if (
        !rewriteSubstantive &&
        (field === "note" || field === "noteZh") &&
        !fieldsEqual(profile[field], override[field]) &&
        !noteCanBeUpgraded(profile[field], profile.noteMeta)
      ) {
        skippedSubstantive += 1;
        continue;
      }
      if (fieldsEqual(profile[field], override[field])) {
        continue;
      }
      profile[field] = override[field];
      updated += 1;
    }
  }
}

if (missing.length) {
  console.error(`Missing generated profiles for ${missing.length} override entries:`);
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

if (!dryRun && updated) {
  await writeFile(profilesPath, `${JSON.stringify(profilesData, null, 2)}\n`);
}
console.log(
  `${dryRun ? "Would sync" : "Synced"} ${updated} changed profile override field${updated === 1 ? "" : "s"} ` +
    `into data/player-profiles.json for edition ${profileEdition}.`
);
if (skippedSubstantive) {
  console.log(
    `Preserved ${skippedSubstantive} substantive note field${skippedSubstantive === 1 ? "" : "s"}. ` +
      "Use --rewrite-substantive to replace them explicitly."
  );
}
