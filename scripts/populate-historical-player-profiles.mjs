#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const historyPath = path.join(dataDir, "history.json");
const outputPath = path.join(dataDir, "historical-player-profiles.json");
const sourceId = "historical-player-card-baseline-2026-06-23";

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
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

function getRecord(records, name) {
  const existing = records.get(name);
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
    teams: new Map(),
    years: new Set(),
    notes: []
  };
  records.set(name, record);
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

  const record = getRecord(records, player.name);
  const teamName = teamNameForSide(fixture, side);
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

  const record = getRecord(records, goal.name);
  const teamName = teamNameForSide(fixture, goal.ownGoal ? oppositeSide(side) : side);
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
  const yearText = formatYearSeries(record.years);
  const impactParts = [];

  if (record.goalCount > 0) {
    impactParts.push(`credited with ${pluralize(record.goalCount, "World Cup goal")}`);
  }
  if (record.keyMatchIds.size > 0) {
    impactParts.push(`featured in ${pluralize(record.keyMatchIds.size, "curated match-lens card")}`);
  }
  if (!impactParts.length && record.ownGoalCount > 0) {
    impactParts.push(`appears through ${pluralize(record.ownGoalCount, "own-goal record")}`);
  }

  return `${primaryTeam}'s World Cup archive ${positionText}; ${impactParts.join(" and ")} across ${yearText}.`;
}

function buildSummary(record, primaryTeam, teams, years) {
  const teamText = formatSeries(teams, 4) || primaryTeam;
  return `Historical card generated from World Cup scorer events, match appearances, tournament squads, and curated match-lens notes. Archive teams: ${teamText}. Archive tournaments: ${formatYearSeries(years)}.`;
}

function buildProfile(record) {
  const primaryTeam = mode(record.teams) || "Historical";
  const teams = [...record.teams.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([team]) => team);
  const years = [...record.years].sort((a, b) => a - b);
  const position = mode(record.positions) || "Player";
  const shirtNumber = Number(mode(record.shirtNumbers));
  const skills = inferSkills(record, position);

  return {
    name: record.name,
    displayName: record.name,
    historical: true,
    sourceId,
    teams,
    tournamentYears: years,
    position,
    club: `${primaryTeam} World Cup archive`,
    uniformNumber: Number.isInteger(shirtNumber) && shirtNumber > 0 ? shirtNumber : undefined,
    goals: record.goalCount,
    ownGoals: record.ownGoalCount,
    keyMatchCount: record.keyMatchIds.size,
    scorerMatchCount: record.scorerMatchIds.size,
    skills,
    note: buildNote(record, primaryTeam, position),
    summary: buildSummary(record, primaryTeam, teams, record.years),
    sourceUrl: "https://github.com/jfjelstul/worldcup"
  };
}

const historyData = await readJson(historyPath);
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
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((record) => [record.name, buildProfile(record)])
);

const output = {
  updatedAt: new Date().toISOString(),
  sourceIds: [
    "openfootball-worldcup-json-2026-06-17",
    "fjelstul-worldcup-json-2026-06-23",
    sourceId
  ],
  coverage: {
    status: "complete-men-1930-2022-key-players-and-scorers",
    note: "One historical card profile for every player mentioned by archived key-player paragraphs or historical goal records."
  },
  profiles
};

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Historical player profiles populated: ${Object.keys(profiles).length} profiles.`);
