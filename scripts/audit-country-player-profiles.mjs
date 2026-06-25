#!/usr/bin/env node
import { readFile } from "node:fs/promises";
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

function hasArg(name) {
  return args.includes(`--${name}`) || args.some((item) => item.startsWith(`--${name}=`));
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

const teamIds = (getArgValue("teams") || getArgValue("squad-teams"))
  .split(",")
  .map((teamId) => teamId.trim().toUpperCase())
  .filter(Boolean);
const requireLeague = !hasArg("allow-missing-league");
const requireImage = !hasArg("allow-missing-image");
const requireSourceUrl = !hasArg("allow-missing-source-url");
const requireNoteZh = !hasArg("allow-missing-note-zh");
const minProfiles = positiveInteger(getArgValue("min-profiles"), 1);
const maxProfiles = positiveInteger(getArgValue("max-profiles") || getArgValue("exact-profiles"), 0);

if (!teamIds.length) {
  console.error("Usage: node scripts/audit-country-player-profiles.mjs --teams=CRO,PAN --min-profiles=26 --max-profiles=26");
  process.exit(1);
}

const [profilesData, teamsData] = await Promise.all([
  readJson("player-profiles.json"),
  readJson("teams.json")
]);

const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
const profiles = Object.entries(profilesData.profiles || {});
const failures = [];

for (const teamId of teamIds) {
  const team = teamsById.get(teamId);
  if (!team) {
    failures.push(`${teamId}: unknown team id`);
    continue;
  }

  const teamProfiles = profiles
    .filter(([, profile]) => profile?.teamId === teamId)
    .sort(([a], [b]) => a.localeCompare(b));

  if (teamProfiles.length < minProfiles) {
    failures.push(`${teamId}: expected at least ${minProfiles} profiles, found ${teamProfiles.length}`);
  }
  if (maxProfiles && teamProfiles.length > maxProfiles) {
    failures.push(`${teamId}: expected at most ${maxProfiles} profiles, found ${teamProfiles.length}`);
  }

  const missingCore = [];
  const missingLeague = [];
  const missingImage = [];
  const missingSourceUrl = [];
  const missingNote = [];
  const missingNoteZh = [];
  const genericNote = [];
  const genericSkills = [];
  const disambiguationLike = [];
  const keyMismatches = [];

  for (const [profileName, profile] of teamProfiles) {
    const note = String(profile.note || "").trim();
    const noteZh = String(profile.noteZh || "").trim();
    if (profile.name !== profileName) {
      keyMismatches.push(`${profileName}: name field is "${profile.name || ""}"`);
    }
    if (
      !profile.position ||
      !profile.club ||
      /\bto verify\b/i.test(`${profile.position} ${profile.club}`)
    ) {
      missingCore.push(profileName);
    }
    if (requireLeague && !profile.league) {
      missingLeague.push(profileName);
    }
    if (requireImage && !profile.imageUrl) {
      missingImage.push(profileName);
    }
    if (requireSourceUrl && !profile.sourceUrl) {
      missingSourceUrl.push(profileName);
    }
    if (!note) {
      missingNote.push(profileName);
    }
    if (requireNoteZh && !noteZh) {
      missingNoteZh.push(profileName);
    }
    if (/\bcurrent World Cup squad pool\b/i.test(note) || /\bmatch-plan option\b/i.test(note)) {
      genericNote.push(profileName);
    }
    if (
      !Array.isArray(profile.skills) ||
      !profile.skills.length ||
      (profile.skills.length === 1 && profile.skills[0] === "Match impact")
    ) {
      genericSkills.push(profileName);
    }
    if (
      /\bmay refer to\b/i.test(profile.summary || "") ||
      /\bis the name of\b/i.test(profile.summary || "") ||
      /\blist of football games\b/i.test(profile.summary || "") ||
      /\bnational .* team results\b/i.test(profile.summary || "") ||
      /\bdisambiguation\b/i.test(profile.sourceUrl || "")
    ) {
      disambiguationLike.push(profileName);
    }
  }

  for (const [label, names] of [
    ["missing position/club", missingCore],
    ["missing league", missingLeague],
    ["missing image", missingImage],
    ["missing sourceUrl", missingSourceUrl],
    ["missing note", missingNote],
    ["missing Chinese note", missingNoteZh],
    ["generic note", genericNote],
    ["generic skills", genericSkills],
    ["disambiguation-like source", disambiguationLike],
    ["profile key/name mismatch", keyMismatches]
  ]) {
    if (names.length) {
      failures.push(`${teamId}: ${label}: ${names.join(", ")}`);
    }
  }

  console.log(
    `${teamId} ${team.name}: ${teamProfiles.length} profiles, ` +
      `core gaps ${missingCore.length}, league gaps ${missingLeague.length}, ` +
      `image gaps ${missingImage.length}, source gaps ${missingSourceUrl.length}, ` +
      `copy gaps ${missingNote.length + missingNoteZh.length + genericNote.length + genericSkills.length}`
  );
}

if (failures.length) {
  console.error("");
  console.error(`Country profile audit failed: ${failures.length} issue${failures.length === 1 ? "" : "s"}`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Country profile audit passed.");
