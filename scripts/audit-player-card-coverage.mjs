#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayerName } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

function addName(names, value) {
  const name = String(value || "").trim();
  if (name) {
    names.set(normalizePlayerName(name), name);
  }
}

function collectCurrentNames(fixturesData) {
  const names = new Map();

  for (const fixture of fixturesData.fixtures || []) {
    for (const side of ["home", "away"]) {
      for (const player of fixture.keyPlayers?.[side] || []) {
        addName(names, player?.name);
      }
    }
    for (const goal of [...(fixture.goalsHome || []), ...(fixture.goalsAway || [])]) {
      addName(names, goal?.name);
    }
  }

  return names;
}

function collectHistoricalNames(historyData) {
  const names = new Map();

  for (const fixture of historyData.fixtures || []) {
    for (const side of ["home", "away"]) {
      for (const player of fixture.keyPlayers?.[side] || []) {
        addName(names, player?.name);
      }
    }
    for (const goal of [...(fixture.goalsHome || []), ...(fixture.goalsAway || [])]) {
      addName(names, goal?.name);
    }
  }

  return names;
}

function profileNameSet(profilesData) {
  return new Set(Object.keys(profilesData.profiles || {}).map(normalizePlayerName));
}

function profileMapByNormalizedName(profilesData) {
  return new Map(Object.entries(profilesData.profiles || {}).map(([name, profile]) => [normalizePlayerName(name), profile]));
}

function getMissingNames(requiredNames, profilesData) {
  const profileNames = profileNameSet(profilesData);
  return [...requiredNames.entries()]
    .filter(([key]) => !profileNames.has(key))
    .map(([, name]) => name)
    .sort((a, b) => a.localeCompare(b));
}

function countRequiredProfileImages(requiredNames, profilesData) {
  const profilesByName = profileMapByNormalizedName(profilesData);
  return [...requiredNames.keys()].filter((nameKey) => {
    const profile = profilesByName.get(nameKey);
    return typeof profile?.imageUrl === "string" && profile.imageUrl.trim();
  }).length;
}

const [
  fixturesData,
  historyData,
  playerProfilesData,
  historicalPlayerProfilesData
] = await Promise.all([
  readJson("fixtures.json"),
  readJson("history.json"),
  readJson("player-profiles.json"),
  readJson("historical-player-profiles.json")
]);

const currentNames = collectCurrentNames(fixturesData);
const historicalNames = collectHistoricalNames(historyData);
const missingCurrent = getMissingNames(currentNames, playerProfilesData);
const missingHistorical = getMissingNames(historicalNames, historicalPlayerProfilesData);
const currentImageCount = countRequiredProfileImages(currentNames, playerProfilesData);
const historicalImageCount = countRequiredProfileImages(historicalNames, historicalPlayerProfilesData);

if (missingCurrent.length || missingHistorical.length) {
  console.error("Player card coverage audit failed.");
  if (missingCurrent.length) {
    console.error("");
    console.error(`Current World Cup card profiles missing: ${missingCurrent.length}`);
    console.error(missingCurrent.slice(0, 40).map((name) => `- ${name}`).join("\n"));
    if (missingCurrent.length > 40) {
      console.error(`- ...and ${missingCurrent.length - 40} more`);
    }
    console.error("Run `pnpm profiles`, then review generated notes/photos/values before publishing.");
  }
  if (missingHistorical.length) {
    console.error("");
    console.error(`Historical card profiles missing: ${missingHistorical.length}`);
    console.error(missingHistorical.slice(0, 40).map((name) => `- ${name}`).join("\n"));
    if (missingHistorical.length > 40) {
      console.error(`- ...and ${missingHistorical.length - 40} more`);
    }
    console.error("Run `pnpm history:profiles`, then review archive card copy before publishing.");
  }
  process.exit(1);
}

console.log(
  [
    `Player card coverage passed: ${currentNames.size} current profiles and ${historicalNames.size} historical profiles.`,
    `Current profile photos: ${currentImageCount}/${currentNames.size}.`,
    `Historical profile photos: ${historicalImageCount}/${historicalNames.size}.`
  ].join("\n")
);
