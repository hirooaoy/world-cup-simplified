#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayerName } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.join(root, "data", "historical-player-profiles.json");
const outputPath = path.join(root, "data", "ball-boy-historical-players.json");
const checkOnly = process.argv.includes("--check");

function clean(value) {
  return String(value || "").trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function mode(values) {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((left, right) =>
    right[1] - left[1] || left[0].localeCompare(right[0])
  )[0]?.[0] || "";
}

// Exact name + national team is the durable default identity in this archive.
// Portrait and source URLs are mutable provenance, so they must never split one
// person when an image is replaced. These reviewed exceptions preserve the few
// exact-name/team collisions that are genuinely different players.
const PERSON_DISAMBIGUATOR_BY_PROFILE_KEY = new Map([
  ["Ali Karimi / Iran / 2022", "born-1994"],
  ["Andoni Goikoetxea / Spain / 1994", "jon-andoni"],
  ["Juanito / Spain / 2006", "born-1980"],
  ["József Tóth / Hungary / 1982", "1982-player"],
  ["Júlio César / Brazil / 2010", "goalkeeper-born-1979"],
  ["Júlio César / Brazil / 2014", "goalkeeper-born-1979"],
  ["Júnior / Brazil / 2002", "born-1973"],
  ["Oscar / Brazil / 2014", "born-1991"]
]);

function groupKey(profile, profileKey) {
  const identity = [
    normalizePlayerName(profile.displayName || profile.name),
    normalizePlayerName(profile.teamName || profile.teams?.[0])
  ].join("|");
  const disambiguator = PERSON_DISAMBIGUATOR_BY_PROFILE_KEY.get(profileKey);
  return disambiguator ? `${identity}|${disambiguator}` : identity;
}

function buildEntry(group) {
  const profileEntries = group.profileEntries
    .slice()
    .sort((left, right) => Number(left.profile.tournamentYear) - Number(right.profile.tournamentYear));
  const profiles = profileEntries.map((entry) => entry.profile);
  const latest = profiles.at(-1) || {};
  const tournamentYears = unique(
    profiles.flatMap((profile) => [
      Number(profile.tournamentYear),
      ...(profile.tournamentYears || []).map(Number)
    ]).filter((year) => Number.isInteger(year) && year >= 1930 && year <= 2022)
  ).sort((left, right) => left - right);
  const positions = unique(profiles.map((profile) => clean(profile.position)));

  return {
    id: group.id,
    aliases: unique(profiles.flatMap((profile) => profile.aliases || [])),
    displayName: clean(latest.displayName || latest.name || group.name),
    name: clean(latest.name || latest.displayName || group.name),
    position: mode(positions) || "Player",
    positions,
    profileKeys: profileEntries.map((entry) => entry.profileKey),
    teamName: clean(latest.teamName || latest.teams?.[0] || group.teamName),
    tournamentYears
  };
}

const source = JSON.parse(await readFile(inputPath, "utf8"));
const groups = new Map();

for (const [profileKey, profile] of Object.entries(source.profiles || {})) {
  const id = groupKey(profile, profileKey);
  const existing = groups.get(id) || {
    id,
    name: clean(profile.displayName || profile.name || profileKey),
    profileEntries: [],
    teamName: clean(profile.teamName || profile.teams?.[0])
  };
  existing.profileEntries.push({ profile, profileKey });
  groups.set(id, existing);
}

const players = [...groups.values()]
  .map(buildEntry)
  .sort((left, right) =>
    left.displayName.localeCompare(right.displayName)
    || left.teamName.localeCompare(right.teamName)
    || left.tournamentYears[0] - right.tournamentYears[0]
  );

const output = {
  updatedAt: source.updatedAt,
  sourceIds: source.sourceIds || [],
  coverage: source.coverage || {},
  players
};

const serialized = `${JSON.stringify(output, null, 2)}\n`;
if (checkOnly) {
  const existing = await readFile(outputPath, "utf8").catch(() => "");
  if (existing !== serialized) {
    console.error("Ball Boy historical player index is stale.");
    console.error("Run `pnpm chatbot:history:index` and commit the generated data file.");
    process.exit(1);
  }
  console.log(`Ball Boy historical player index is current: ${players.length} people.`);
} else {
  await writeFile(outputPath, serialized);
  console.log(
    `Ball Boy historical player index built: ${players.length} people from ${Object.keys(source.profiles || {}).length} player-tournament profiles.`
  );
}
