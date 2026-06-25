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

function profileAliases(profileName, profile = {}) {
  return [
    profileName,
    profile?.name,
    profile?.displayName,
    ...(Array.isArray(profile?.aliases) ? profile.aliases : [])
  ].filter((value) => typeof value === "string" && value.trim());
}

function profilePersonAliases(profileName, profile = {}) {
  return [
    profile?.name || profileName,
    profile?.displayName,
    ...(Array.isArray(profile?.aliases) ? profile.aliases : [])
  ].filter((value) => typeof value === "string" && value.trim());
}

function normalizeHistoricalTeamName(value) {
  return normalizePlayerName(value);
}

function historicalProfileVersionKey(name, teamName, tournamentYear) {
  const nameKey = normalizePlayerName(name);
  const teamKey = normalizeHistoricalTeamName(teamName);
  const year = Number(tournamentYear);

  return nameKey && teamKey && Number.isInteger(year) && year > 0 ? `${year}:${teamKey}:${nameKey}` : "";
}

function historicalTeamNameForSide(fixture, side) {
  return side === "home" ? fixture.homeSlot : fixture.awaySlot;
}

function historicalGoalPlayerTeamName(fixture, scoringSide, goal) {
  const playerSide = goal?.ownGoal ? (scoringSide === "home" ? "away" : "home") : scoringSide;
  return historicalTeamNameForSide(fixture, playerSide);
}

function addHistoricalRef(refs, name, teamName, tournamentYear) {
  const key = historicalProfileVersionKey(name, teamName, tournamentYear);
  if (key) {
    refs.set(key, { name, teamName, tournamentYear: Number(tournamentYear) });
  }
}

function profileNameSet(profilesData) {
  return new Set(
    Object.entries(profilesData.profiles || {}).flatMap(([name, profile]) =>
      profileAliases(name, profile).map(normalizePlayerName)
    )
  );
}

function profileMapByNormalizedName(profilesData) {
  const profilesByName = new Map();
  for (const [name, profile] of Object.entries(profilesData.profiles || {})) {
    for (const alias of profileAliases(name, profile)) {
      const key = normalizePlayerName(alias);
      if (key && !profilesByName.has(key)) {
        profilesByName.set(key, profile);
      }
    }
  }

  return profilesByName;
}

function profileVersionMap(profilesData) {
  const profilesByVersion = new Map();
  for (const [profileName, profile] of Object.entries(profilesData.profiles || {})) {
    const teamNames = [
      profile?.teamName,
      ...(Array.isArray(profile?.teams) ? profile.teams : [])
    ].filter((teamName) => typeof teamName === "string" && teamName.trim());
    const years = [
      profile?.tournamentYear,
      ...(Array.isArray(profile?.tournamentYears) ? profile.tournamentYears : [])
    ]
      .map(Number)
      .filter((year) => Number.isInteger(year) && year > 0);

    for (const alias of profilePersonAliases(profileName, profile)) {
      for (const teamName of teamNames) {
        for (const year of years) {
          const key = historicalProfileVersionKey(alias, teamName, year);
          if (key && !profilesByVersion.has(key)) {
            profilesByVersion.set(key, profile);
          }
        }
      }
    }
  }

  return profilesByVersion;
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

function collectHistoricalRefs(historyData) {
  const refs = new Map();

  for (const fixture of historyData.fixtures || []) {
    for (const side of ["home", "away"]) {
      for (const player of fixture.keyPlayers?.[side] || []) {
        addHistoricalRef(refs, player?.name, historicalTeamNameForSide(fixture, side), fixture.tournamentYear);
      }
    }
    for (const [side, goals] of [
      ["home", fixture.goalsHome || []],
      ["away", fixture.goalsAway || []]
    ]) {
      for (const goal of goals) {
        addHistoricalRef(refs, goal?.name, historicalGoalPlayerTeamName(fixture, side, goal), fixture.tournamentYear);
      }
    }
  }

  return refs;
}

function getMissingHistoricalRefs(requiredRefs, profilesData) {
  const profilesByVersion = profileVersionMap(profilesData);
  return [...requiredRefs.entries()]
    .filter(([key]) => !profilesByVersion.has(key))
    .map(([, ref]) => `${ref.name} / ${ref.teamName} / ${ref.tournamentYear}`)
    .sort((a, b) => a.localeCompare(b));
}

function countRequiredHistoricalProfileImages(requiredRefs, profilesData) {
  const profilesByVersion = profileVersionMap(profilesData);
  return [...requiredRefs.keys()].filter((refKey) => {
    const profile = profilesByVersion.get(refKey);
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
const historicalRefs = collectHistoricalRefs(historyData);
const missingCurrent = getMissingNames(currentNames, playerProfilesData);
const missingHistorical = getMissingHistoricalRefs(historicalRefs, historicalPlayerProfilesData);
const currentImageCount = countRequiredProfileImages(currentNames, playerProfilesData);
const historicalImageCount = countRequiredHistoricalProfileImages(historicalRefs, historicalPlayerProfilesData);

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
    `Player card coverage passed: ${currentNames.size} current profiles and ${historicalRefs.size} historical profile versions.`,
    `Current profile photos: ${currentImageCount}/${currentNames.size}.`,
    `Historical profile photos: ${historicalImageCount}/${historicalRefs.size}.`
  ].join("\n")
);
