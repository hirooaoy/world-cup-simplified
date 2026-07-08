#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const overrideDir = path.join(dataDir, "player-profile-overrides", "2026");
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

const teamIds = parseList(getArgValue("teams")).map((teamId) => teamId.toUpperCase());
const fields = parseList(getArgValue("fields") || "skills,note,noteZh");

if (!teamIds.length) {
  console.error("Usage: node scripts/sync-player-profile-overrides.mjs --teams=FRA,MAR --fields=skills,note,noteZh");
  process.exit(1);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const profilesPath = path.join(dataDir, "player-profiles.json");
const profilesData = await readJson(profilesPath);
let updated = 0;
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

await writeFile(profilesPath, `${JSON.stringify(profilesData, null, 2)}\n`);
console.log(`Synced ${updated} profile override field${updated === 1 ? "" : "s"} into data/player-profiles.json.`);
