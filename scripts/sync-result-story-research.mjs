#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturesPath = path.join(root, "data", "fixtures.json");
const teamsPath = path.join(root, "data", "teams.json");
const DEFAULT_LOOKBACK_HOURS = Number(process.env.RESULT_RESEARCH_LOOKBACK_HOURS || 36);

const args = parseArgs(process.argv.slice(2));

function parseArgs(rawArgs) {
  const parsed = {
    all: false,
    includeResearched: false,
    json: false,
    limit: null,
    lookbackHours: Number.isFinite(DEFAULT_LOOKBACK_HOURS) ? DEFAULT_LOOKBACK_HOURS : 36,
    onlyId: "",
    strict: false
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    const next = () => rawArgs[++index];

    if (arg === "--") continue;
    else if (arg === "--all") parsed.all = true;
    else if (arg === "--include-researched") parsed.includeResearched = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--strict") parsed.strict = true;
    else if (arg === "--limit") parsed.limit = Number(next());
    else if (arg.startsWith("--limit=")) parsed.limit = Number(arg.slice("--limit=".length));
    else if (arg === "--lookback-hours") parsed.lookbackHours = Number(next());
    else if (arg.startsWith("--lookback-hours=")) parsed.lookbackHours = Number(arg.slice("--lookback-hours=".length));
    else if (arg === "--only-id") parsed.onlyId = String(next() || "");
    else if (arg.startsWith("--only-id=")) parsed.onlyId = arg.slice("--only-id=".length);
    else if (arg === "--dry-run") continue;
    else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (parsed.limit !== null && (!Number.isInteger(parsed.limit) || parsed.limit < 1)) {
    throw new Error("--limit must be a positive integer");
  }

  if (!parsed.all && (!Number.isFinite(parsed.lookbackHours) || parsed.lookbackHours <= 0)) {
    throw new Error("--lookback-hours must be a positive number");
  }

  return parsed;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function scoreNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hasFinalScore(fixture) {
  return scoreNumber(fixture.score?.home) !== null && scoreNumber(fixture.score?.away) !== null;
}

function getFixtureTeam(fixture, teamsById, side) {
  const teamId = side === "home" ? fixture.homeTeamId : fixture.awayTeamId;
  return teamsById.get(teamId) || null;
}

function fixtureShouldBeChecked(fixture) {
  if (args.onlyId && fixture.id !== args.onlyId) {
    return false;
  }

  if (fixture.status !== "FT" || !fixture.homeTeamId || !fixture.awayTeamId || !hasFinalScore(fixture)) {
    return false;
  }

  if (args.all || args.onlyId) {
    return true;
  }

  const kickoffTime = new Date(fixture.kickoffUtc).getTime();
  if (!Number.isFinite(kickoffTime)) {
    return false;
  }

  const ageHours = (Date.now() - kickoffTime) / 36e5;
  return ageHours >= 0 && ageHours <= args.lookbackHours;
}

function storyBullets(fixture) {
  return Array.isArray(fixture.resultStoryBullets)
    ? fixture.resultStoryBullets.filter((bullet) => typeof bullet === "string" && bullet.trim())
    : [];
}

function researchStatus(fixture) {
  if (fixture.resultStoryResearch?.status === "researched") {
    return "researched";
  }

  return storyBullets(fixture).length ? "story-without-research" : "needs-research";
}

function videoStatus(fixture) {
  if (fixture.highlightVideo?.url) {
    return "official-video-linked";
  }

  if (fixture.highlightVideoReview?.status) {
    return `official-video-${fixture.highlightVideoReview.status}`;
  }

  return "official-video-unchecked";
}

function formatGoalMinute(goal) {
  if (!Number.isFinite(Number(goal?.minute))) {
    return "";
  }

  const minute = Number(goal.minute);
  const offset = Number(goal.offset || 0);
  return offset > 0 ? `${minute}+${offset}'` : `${minute}'`;
}

function goalSummary(fixture, teamsById) {
  const goals = [
    ...(fixture.goalsHome || []).map((goal) => ({ ...goal, side: "home" })),
    ...(fixture.goalsAway || []).map((goal) => ({ ...goal, side: "away" }))
  ].filter((goal) => typeof goal?.name === "string" && goal.name.trim());

  if (!goals.length) {
    return "no scorer timeline loaded";
  }

  return goals
    .sort((a, b) => Number(a.minute || 0) - Number(b.minute || 0) || Number(a.offset || 0) - Number(b.offset || 0))
    .map((goal) => {
      const team = getFixtureTeam(fixture, teamsById, goal.side)?.name || goal.side;
      const assist = goal.assistName ? `, ast ${goal.assistName}` : "";
      return `${formatGoalMinute(goal)} ${goal.name} (${team}${assist})`;
    })
    .join("; ");
}

function fixtureLabel(fixture, teamsById) {
  const home = getFixtureTeam(fixture, teamsById, "home")?.name || fixture.homeTeamId;
  const away = getFixtureTeam(fixture, teamsById, "away")?.name || fixture.awayTeamId;
  return `${home} ${fixture.score.home}-${fixture.score.away} ${away}`;
}

const [fixturesData, teamsData] = await Promise.all([readJson(fixturesPath), readJson(teamsPath)]);
const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
let rows = (fixturesData.fixtures || [])
  .filter(fixtureShouldBeChecked)
  .map((fixture) => ({
    id: fixture.id,
    label: fixtureLabel(fixture, teamsById),
    status: researchStatus(fixture),
    video: videoStatus(fixture),
    goals: goalSummary(fixture, teamsById)
  }))
  .filter((row) => args.includeResearched || row.status !== "researched")
  .sort((a, b) => a.id.localeCompare(b.id));

if (args.limit !== null) {
  rows = rows.slice(0, args.limit);
}

if (args.json) {
  console.log(JSON.stringify({ checked: rows.length, rows }, null, 2));
} else if (!rows.length) {
  console.log("Result story research queue is empty.");
} else {
  const label = args.includeResearched ? "fixture status" : "fixture";
  const verb = args.includeResearched ? "listed" : "need review";
  console.log(`Result story research queue: ${rows.length} ${label}${rows.length === 1 ? "" : "es"} ${verb}.`);
  for (const row of rows) {
    console.log(`- ${row.id}: ${row.label} [${row.status}, ${row.video}]`);
    console.log(`  goals: ${row.goals}`);
  }
}

if (args.strict && rows.some((row) => row.status !== "researched")) {
  process.exit(1);
}
