#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const historyPath = path.join(dataDir, "history.json");
const fjelstulCachePath = process.env.FJELSTUL_WORLDCUP_JSON || "/tmp/fjelstul-worldcup.json";
const fjelstulUrl = "https://raw.githubusercontent.com/jfjelstul/worldcup/master/data-json/worldcup.json";
const sourceId = "fjelstul-worldcup-json-2026-06-23";
const shouldWrite = !process.argv.includes("--check");

const teamAliases = new Map([
  ["usa", "united states"],
  ["u s a", "united states"],
  ["bosnia herzegovina", "bosnia and herzegovina"],
  ["cote d ivoire", "ivory coast"],
  ["ireland", "republic of ireland"]
]);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function loadFjelstulData() {
  try {
    return await readJson(fjelstulCachePath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  const response = await fetch(fjelstulUrl);
  if (!response.ok) {
    throw new Error(`Unable to fetch ${fjelstulUrl}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function normalizeTeamName(value) {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return teamAliases.get(normalized) || normalized;
}

function teamPairKey(teamA, teamB) {
  return [normalizeTeamName(teamA), normalizeTeamName(teamB)].sort().join("|");
}

function matchKey(year, date, teamA, teamB) {
  return [year, date, teamPairKey(teamA, teamB)].join("|");
}

function groupBy(items, getKey) {
  const grouped = new Map();
  for (const item of items || []) {
    const key = getKey(item);
    const bucket = grouped.get(key) || [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  return grouped;
}

function personName(row) {
  const given = row?.given_name && row.given_name !== "not applicable" ? row.given_name : "";
  const family = row?.family_name && row.family_name !== "not applicable" ? row.family_name : "";
  return [given, family].filter(Boolean).join(" ") || family || given || row?.player_name || "";
}

function normalizeGoal(row) {
  return {
    name: personName(row),
    minute: Number.isFinite(Number(row?.minute_regulation)) ? Number(row.minute_regulation) : null,
    ...(Number(row?.minute_stoppage) > 0 ? { offset: Number(row.minute_stoppage) } : {}),
    ...(Number(row?.penalty) === 1 ? { penalty: true } : {}),
    ...(Number(row?.own_goal) === 1 ? { ownGoal: true } : {})
  };
}

function sourceSideForGoal(row) {
  return Number(row?.home_team) === 1 ? "home" : "away";
}

function sourceSideForFixtureSide(fixture, sourceMatch, side) {
  const fixtureTeam = side === "home" ? fixture.homeSlot : fixture.awaySlot;
  if (normalizeTeamName(fixtureTeam) === normalizeTeamName(sourceMatch.home_team_name)) {
    return "home";
  }
  if (normalizeTeamName(fixtureTeam) === normalizeTeamName(sourceMatch.away_team_name)) {
    return "away";
  }

  return side;
}

function fixtureSideForSourceSide(sourceSide, homeSourceSide) {
  return sourceSide === homeSourceSide ? "home" : "away";
}

function scoreTotal(fixture) {
  const home = Number(fixture.score?.home);
  const away = Number(fixture.score?.away);
  return Number.isFinite(home) && Number.isFinite(away) ? home + away : null;
}

function sameGoals(left, right) {
  return JSON.stringify(left || []) === JSON.stringify(right || []);
}

function createIndexes(fjelstulData) {
  const matches = (fjelstulData.matches || []).filter((match) => /FIFA Men's World Cup/.test(match.tournament_name || ""));
  const matchesByFixtureKey = new Map();

  for (const match of matches) {
    matchesByFixtureKey.set(
      matchKey(match.tournament_id.replace("WC-", ""), match.match_date, match.home_team_name, match.away_team_name),
      match
    );
  }

  const goals = (fjelstulData.goals || []).filter((goal) => /FIFA Men's World Cup/.test(goal.tournament_name || ""));

  return {
    matchesByFixtureKey,
    goalsByMatch: groupBy(goals, (goal) => goal.match_id)
  };
}

const [historyData, fjelstulData] = await Promise.all([readJson(historyPath), loadFjelstulData()]);
const indexes = createIndexes(fjelstulData);
let matched = 0;
let updated = 0;
let skipped = 0;
const warnings = [];

for (const fixture of historyData.fixtures || []) {
  const total = scoreTotal(fixture);
  if (fixture.status !== "FT" || !total) {
    skipped += 1;
    continue;
  }

  const sourceMatch = indexes.matchesByFixtureKey.get(
    matchKey(fixture.tournamentYear, fixture.date, fixture.homeSlot, fixture.awaySlot)
  );

  if (!sourceMatch) {
    warnings.push(`${fixture.id}: no Fjelstul match found`);
    continue;
  }

  matched += 1;
  const goals = (indexes.goalsByMatch.get(sourceMatch.match_id) || []).sort(
    (a, b) => Number(a.key_id) - Number(b.key_id)
  );

  if (goals.length !== total) {
    warnings.push(`${fixture.id}: ${goals.length} Fjelstul goals for ${fixture.score.home}-${fixture.score.away}`);
    continue;
  }

  const homeSourceSide = sourceSideForFixtureSide(fixture, sourceMatch, "home");
  const nextGoals = { home: [], away: [] };

  for (const goal of goals) {
    const fixtureSide = fixtureSideForSourceSide(sourceSideForGoal(goal), homeSourceSide);
    nextGoals[fixtureSide].push(normalizeGoal(goal));
  }

  if (!sameGoals(fixture.goalsHome, nextGoals.home) || !sameGoals(fixture.goalsAway, nextGoals.away)) {
    fixture.goalsHome = nextGoals.home;
    fixture.goalsAway = nextGoals.away;
    updated += 1;
  }
}

if (updated && shouldWrite) {
  historyData.sourceIds = [...new Set([...(historyData.sourceIds || []), sourceId])];
  historyData.updatedAt = new Date().toISOString();
  await writeFile(historyPath, `${JSON.stringify(historyData, null, 2)}\n`);
}

console.log(`Matched ${matched} historical scoring fixture${matched === 1 ? "" : "s"}; skipped ${skipped}.`);
console.log(`${updated} historical goal-event update${updated === 1 ? "" : "s"} ${shouldWrite ? "written" : "detected"}.`);
for (const warning of warnings) {
  console.warn(`Warning: ${warning}`);
}
