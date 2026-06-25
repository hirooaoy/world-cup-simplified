#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayerName } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const historyPath = path.join(dataDir, "history.json");
const outputPath = path.join(dataDir, "historical-player-profiles.json");
const playerProfilesPath = path.join(dataDir, "player-profiles.json");
const sourceId = "historical-player-card-baseline-2026-06-23";
const inheritedImageSource = "current-player-profile";
const imageFieldNames = [
  "imageUrl",
  "imageSource",
  "imageSourceUrl",
  "imageCredit",
  "imageLicense",
  "imagePageTitle",
  "imagePageUrl"
];
const preservedEnrichmentFieldNames = [
  ...imageFieldNames,
  "birthDate",
  "clubAtTournament",
  "marketValueAtTournamentEurMillions",
  "marketValueAtTournamentSource",
  "marketValueAtTournamentSourceUrl",
  "peakMarketValueEurMillions",
  "peakMarketValueSource",
  "peakMarketValueSourceUrl"
];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readOptionalJson(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function increment(map, key, amount = 1) {
  if (!key) {
    return;
  }

  map.set(key, (map.get(key) || 0) + amount);
}

function mode(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "";
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatSeries(items, limit = 3) {
  const cleanItems = [...new Set(items)].filter(Boolean);
  const visibleItems = cleanItems.slice(0, limit);
  const hiddenCount = cleanItems.length - visibleItems.length;

  if (!visibleItems.length) {
    return "";
  }

  const suffix = hiddenCount > 0 ? ` and ${hiddenCount} more` : "";
  if (visibleItems.length === 1) {
    return `${visibleItems[0]}${suffix}`;
  }
  if (visibleItems.length === 2) {
    return `${visibleItems.join(" and ")}${suffix}`;
  }

  return `${visibleItems.slice(0, -1).join(", ")}, and ${visibleItems.at(-1)}${suffix}`;
}

function formatYearSeries(years) {
  const sortedYears = [...years].sort((a, b) => a - b);
  if (!sortedYears.length) {
    return "the historical archive";
  }
  if (sortedYears.length === 1) {
    return `World Cup ${sortedYears[0]}`;
  }
  if (sortedYears.length <= 3) {
    return `World Cups ${formatSeries(sortedYears.map(String), 3)}`;
  }

  return `World Cups ${sortedYears[0]}-${sortedYears.at(-1)}`;
}

function formatPosition(position) {
  return String(position || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(^|[,/]\s*)(\p{Letter})/gu, (_, prefix, letter) => `${prefix}${letter.toLocaleUpperCase("en-US")}`);
}

function lowerFirst(value) {
  const text = String(value || "").trim();
  return text ? `${text[0].toLocaleLowerCase("en-US")}${text.slice(1)}` : "";
}

function normalizeTeamName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function historicalProfileKey(name, teamName, tournamentYear) {
  return `${name} / ${teamName} / ${tournamentYear}`;
}

function historicalRecordKey(name, teamName, tournamentYear) {
  return [normalizePlayerName(name), normalizeTeamName(teamName), tournamentYear].join("|");
}

function addProfileAliases(map, profile) {
  if (!profile || typeof profile !== "object") {
    return;
  }

  for (const name of [profile.name, profile.displayName]) {
    const key = normalizePlayerName(name);
    if (key && !map.has(key)) {
      map.set(key, profile);
    }
  }
}

function pickFields(profile, fieldNames) {
  if (!profile) {
    return {};
  }

  return Object.fromEntries(
    fieldNames
      .filter((fieldName) => profile[fieldName] !== undefined)
      .map((fieldName) => [fieldName, profile[fieldName]])
  );
}

function pickImageFields(profile) {
  return pickFields(profile, imageFieldNames);
}

function pickPreservedEnrichmentFields(profile) {
  return pickFields(profile, preservedEnrichmentFieldNames);
}

function createHistoricalEnrichmentLookup(profilesData) {
  const lookup = new Map();
  for (const profile of Object.values(profilesData?.profiles || {})) {
    addProfileAliases(lookup, {
      ...pickPreservedEnrichmentFields(profile),
      name: profile.name,
      displayName: profile.displayName
    });
  }
  return lookup;
}

function createCurrentImageLookup(profilesData) {
  const lookup = new Map();
  for (const profile of Object.values(profilesData?.profiles || {})) {
    if (!profile?.imageUrl) {
      continue;
    }

    const imageProfile = {
      name: profile.name,
      displayName: profile.displayName,
      imageUrl: profile.imageUrl,
      imageSource: inheritedImageSource,
      imageSourceUrl: profile.sourceUrl || profile.imageUrl,
      birthDate: profile.birthDate
    };
    addProfileAliases(lookup, imageProfile);
  }
  return lookup;
}

function getEnrichmentFieldsForName(name, historicalEnrichmentLookup, currentImageLookup) {
  const key = normalizePlayerName(name);
  const historicalFields = pickPreservedEnrichmentFields(historicalEnrichmentLookup.get(key));
  if (Object.keys(historicalFields).length) {
    return historicalFields;
  }

  return pickPreservedEnrichmentFields(currentImageLookup.get(key));
}

function getRecord(records, name, fixture, teamName) {
  const tournamentYear = Number(fixture?.tournamentYear);
  const key = historicalRecordKey(name, teamName, tournamentYear);
  const existing = records.get(key);
  if (existing) {
    return existing;
  }

  const record = {
    name,
    goalCount: 0,
    keyMatchIds: new Set(),
    matchIds: new Set(),
    ownGoalCount: 0,
    penaltyGoalCount: 0,
    positions: new Map(),
    scorerMatchIds: new Set(),
    shirtNumbers: new Map(),
    teamName,
    teams: new Map(),
    tournamentYear,
    years: new Set(),
    notes: []
  };
  records.set(key, record);
  return record;
}

function teamNameForSide(fixture, side) {
  return side === "home" ? fixture.homeSlot : fixture.awaySlot;
}

function oppositeSide(side) {
  return side === "home" ? "away" : "home";
}

function addContext(record, fixture, teamName) {
  record.matchIds.add(fixture.id);
  record.years.add(Number(fixture.tournamentYear));
  increment(record.teams, teamName);
}

function addKeyPlayer(records, fixture, side, player) {
  if (!player?.name) {
    return;
  }

  const teamName = teamNameForSide(fixture, side);
  const record = getRecord(records, player.name, fixture, teamName);
  addContext(record, fixture, teamName);
  record.keyMatchIds.add(fixture.id);

  increment(record.positions, formatPosition(player.position));
  increment(record.shirtNumbers, Number(player.shirtNumber) > 0 ? String(player.shirtNumber) : "");
  if (player.note && !record.notes.includes(player.note)) {
    record.notes.push(player.note);
  }
}

function addGoal(records, fixture, side, goal) {
  if (!goal?.name) {
    return;
  }

  const teamName = teamNameForSide(fixture, goal.ownGoal ? oppositeSide(side) : side);
  const record = getRecord(records, goal.name, fixture, teamName);
  addContext(record, fixture, teamName);
  record.scorerMatchIds.add(fixture.id);

  if (goal.ownGoal) {
    record.ownGoalCount += 1;
  } else {
    record.goalCount += 1;
  }
  if (goal.penalty) {
    record.penaltyGoalCount += 1;
  }
}

function inferSkills(record, position) {
  const noteText = record.notes.join(" ");
  const skills = [];
  const addSkill = (skill) => {
    if (skill && !skills.includes(skill)) {
      skills.push(skill);
    }
  };

  addSkill(position);
  if (record.goalCount > 0) {
    addSkill("Goal threat");
  }
  if (record.penaltyGoalCount > 0 || /shootout|penalt/i.test(noteText)) {
    addSkill("Penalty pressure");
  }
  if (/started/i.test(noteText)) {
    addSkill("Starter");
  }
  if (/substitute/i.test(noteText)) {
    addSkill("Impact sub");
  }
  if (/goalkeeper|defender|back\b/i.test(position)) {
    addSkill("Defensive control");
  }
  if (record.keyMatchIds.size >= 5 || record.goalCount >= 5) {
    addSkill("Archive standout");
  }
  addSkill("Historical lens");

  return skills.slice(0, 4);
}

function buildNote(record, primaryTeam, position) {
  const positionText = lowerFirst(position) || "player";
  const impactParts = [];

  if (record.goalCount > 0) {
    impactParts.push(`credited with ${pluralize(record.goalCount, "World Cup goal")}`);
  }
  if (record.keyMatchIds.size > 0) {
    impactParts.push(`featured in ${pluralize(record.keyMatchIds.size, "archive match note")}`);
  }
  if (!impactParts.length && record.ownGoalCount > 0) {
    impactParts.push(`appears through ${pluralize(record.ownGoalCount, "own-goal record")}`);
  }

  return `${primaryTeam}'s ${record.tournamentYear} World Cup ${positionText}; ${impactParts.join(" and ")}.`;
}

function formatArchiveYearLabel(years) {
  const sortedYears = [...years].sort((a, b) => a - b);
  if (!sortedYears.length) {
    return "historical";
  }
  if (sortedYears.length === 1) {
    return String(sortedYears[0]);
  }

  return `${sortedYears[0]}-${sortedYears.at(-1)}`;
}

function getRoleDescriptor(record, position) {
  const positionText = lowerFirst(position) || "player";
  const hasGoalThreat = record.goalCount > 0;
  const hasPenaltyPressure = record.penaltyGoalCount > 0 || /shootout|penalt/i.test(record.notes.join(" "));

  if (/goalkeeper/i.test(position)) {
    return "last-line reference";
  }
  if (/defender|back\b/i.test(position)) {
    return hasGoalThreat ? "defensive scoring threat" : "defensive control point";
  }
  if (/midfielder/i.test(position)) {
    if (hasPenaltyPressure) {
      return "midfield set-piece and penalty pressure";
    }
    return hasGoalThreat ? "midfield scoring threat" : "midfield connector";
  }
  if (/forward|winger|striker/i.test(position)) {
    return hasGoalThreat ? "front-line scoring threat" : "front-line outlet";
  }

  return `${positionText} reference`;
}

function buildStyleNote(record, primaryTeam, position) {
  const archiveLabel = `${primaryTeam} ${record.tournamentYear} archive`;
  const role = getRoleDescriptor(record, position);
  const impactParts = [];

  if (record.goalCount > 0) {
    impactParts.push(pluralize(record.goalCount, "World Cup goal"));
  }
  if (!impactParts.length && record.ownGoalCount > 0) {
    impactParts.push(pluralize(record.ownGoalCount, "own-goal record"));
  }

  const impact = impactParts.length ? `, with ${formatSeries(impactParts, 3)}` : "";
  return `${archiveLabel}: ${role}${impact}.`;
}

function buildSummary(record, primaryTeam, teams, years) {
  const teamText = formatSeries(teams, 4) || primaryTeam;
  return `Historical ${record.tournamentYear} World Cup card generated from scorer events, match appearances, tournament squads, and archive match notes. Archive team: ${teamText}.`;
}

function buildProfile(record, imageFields = {}) {
  const primaryTeam = mode(record.teams) || "Historical";
  const teams = [...record.teams.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([team]) => team);
  const years = [...record.years].sort((a, b) => a - b);
  const position = mode(record.positions) || "Player";
  const shirtNumber = Number(mode(record.shirtNumbers));
  const skills = inferSkills(record, position);

  return {
    profileKey: historicalProfileKey(record.name, primaryTeam, record.tournamentYear),
    name: record.name,
    displayName: record.name,
    historical: true,
    sourceId,
    teamName: primaryTeam,
    teams,
    tournamentYear: record.tournamentYear,
    tournamentYears: years,
    position,
    club: imageFields.clubAtTournament || `${primaryTeam} ${record.tournamentYear} World Cup archive`,
    uniformNumber: Number.isInteger(shirtNumber) && shirtNumber > 0 ? shirtNumber : undefined,
    goals: record.goalCount,
    ownGoals: record.ownGoalCount,
    keyMatchCount: record.keyMatchIds.size,
    scorerMatchCount: record.scorerMatchIds.size,
    skills,
    styleNote: buildStyleNote(record, primaryTeam, position),
    note: buildNote(record, primaryTeam, position),
    summary: buildSummary(record, primaryTeam, teams, record.years),
    ...imageFields,
    sourceUrl: "https://github.com/jfjelstul/worldcup"
  };
}

const historyData = await readJson(historyPath);
const existingHistoricalProfilesData = await readOptionalJson(outputPath);
const currentPlayerProfilesData = await readOptionalJson(playerProfilesPath);
const historicalEnrichmentLookup = createHistoricalEnrichmentLookup(existingHistoricalProfilesData);
const currentImageLookup = createCurrentImageLookup(currentPlayerProfilesData);
const records = new Map();

for (const fixture of historyData.fixtures || []) {
  for (const side of ["home", "away"]) {
    for (const player of fixture.keyPlayers?.[side] || []) {
      addKeyPlayer(records, fixture, side, player);
    }
  }

  for (const goal of fixture.goalsHome || []) {
    addGoal(records, fixture, "home", goal);
  }
  for (const goal of fixture.goalsAway || []) {
    addGoal(records, fixture, "away", goal);
  }
}

const profiles = Object.fromEntries(
  [...records.values()]
    .sort((a, b) => a.tournamentYear - b.tournamentYear || a.teamName.localeCompare(b.teamName) || a.name.localeCompare(b.name))
    .map((record) => {
      const profile = buildProfile(record, getEnrichmentFieldsForName(record.name, historicalEnrichmentLookup, currentImageLookup));
      return [profile.profileKey, profile];
    })
);

const hasImages = Object.values(profiles).some((profile) => profile.imageUrl);
const sourceIds = new Set(existingHistoricalProfilesData?.sourceIds || []);
sourceIds.add("openfootball-worldcup-json-2026-06-17");
sourceIds.add("fjelstul-worldcup-json-2026-06-23");
sourceIds.add(sourceId);
if (hasImages) {
  sourceIds.add("wikimedia-commons");
}

const output = {
  updatedAt: new Date().toISOString(),
  sourceIds: [...sourceIds],
  coverage: {
    status: "complete-men-1930-2022-key-players-and-scorers-by-team-year",
    note: "One historical card profile for every player, team and tournament year shown by archived key-player paragraphs or historical goal records."
  },
  profiles
};

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Historical player profiles populated: ${Object.keys(profiles).length} profiles.`);
