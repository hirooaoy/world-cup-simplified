#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

function scoreTotal(fixture) {
  const home = Number(fixture.score?.home);
  const away = Number(fixture.score?.away);
  return Number.isFinite(home) && Number.isFinite(away) ? home + away : null;
}

function goalCount(fixture) {
  return (fixture.goalsHome?.length || 0) + (fixture.goalsAway?.length || 0);
}

function isGenericMoment(highlight) {
  return /Both clean sheets kept|Neither side pulled clear|The clean sheet gave|attack broke the match open|protected a one-goal edge|created enough separation|made a statement with|found the decisive goal/i.test(
    highlight
  );
}

const [fixturesData, historyData, teamsData] = await Promise.all([
  readJson("fixtures.json"),
  readJson("history.json"),
  readJson("teams.json")
]);
const teamsById = new Map(teamsData.teams.map((team) => [team.id, team]));
const issues = [];
let checked = 0;

for (const fixture of fixturesData.fixtures || []) {
  if (fixture.stage !== "group" || fixture.status !== "FT") {
    continue;
  }

  checked += 1;
  const matchLabel = `${teamsById.get(fixture.homeTeamId)?.name || fixture.homeTeamId} vs ${teamsById.get(fixture.awayTeamId)?.name || fixture.awayTeamId}`;
  const total = scoreTotal(fixture);
  const highlights = Array.isArray(fixture.resultHighlights) ? fixture.resultHighlights : [];
  const momentHighlights = highlights.filter((highlight) => !String(highlight).trim().startsWith("⚽"));

  if (total === null) {
    issues.push(`${fixture.id} (${matchLabel}) is full-time but has no numeric score.`);
    continue;
  }

  if (total > 0 && goalCount(fixture) !== total) {
    issues.push(
      `${fixture.id} (${matchLabel}) has ${goalCount(fixture)} goal event${goalCount(fixture) === 1 ? "" : "s"} for a ${fixture.score.home}-${fixture.score.away} score.`
    );
  }

  if (!momentHighlights.length) {
    issues.push(`${fixture.id} (${matchLabel}) has no non-score result moment.`);
  } else if (momentHighlights.some(isGenericMoment)) {
    issues.push(`${fixture.id} (${matchLabel}) still has generic result moment copy.`);
  }
}

console.log(`Result enrichment audit checked ${checked} completed group fixture${checked === 1 ? "" : "s"}.`);

let historicalChecked = 0;
for (const fixture of historyData.fixtures || []) {
  if (fixture.status !== "FT") {
    continue;
  }

  const total = scoreTotal(fixture);
  if (!total) {
    continue;
  }

  historicalChecked += 1;

  if (goalCount(fixture) !== total) {
    issues.push(
      `${fixture.id} (${fixture.homeSlot} vs ${fixture.awaySlot}) has ${goalCount(fixture)} historical goal event${goalCount(fixture) === 1 ? "" : "s"} for a ${fixture.score.home}-${fixture.score.away} score.`
    );
  }
}

console.log(
  `Result enrichment audit checked ${historicalChecked} historical scoring fixture${historicalChecked === 1 ? "" : "s"}.`
);

if (issues.length) {
  console.log(`Result enrichment issues: ${issues.length}`);
  for (const issue of issues) {
    console.log(`- ${issue}`);
  }
  process.exitCode = 1;
} else {
  console.log("Result enrichment audit passed.");
}
