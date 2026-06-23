#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const fixturesPath = path.join(dataDir, "fixtures.json");
const teamsPath = path.join(dataDir, "teams.json");
const tournamentPath = path.join(dataDir, "tournament.json");
const overwrite = process.argv.includes("--overwrite");

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

function winnerSide(score) {
  if (score.home === score.away) {
    return "";
  }

  return score.home > score.away ? "home" : "away";
}

function pointText(points) {
  return `${points} point${points === 1 ? "" : "s"}`;
}

function goalCount(fixture) {
  return (fixture.goalsHome?.length || 0) + (fixture.goalsAway?.length || 0);
}

function createStanding(teamId) {
  return {
    teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    points: 0
  };
}

function applyResult(table, fixture) {
  const home = table.get(fixture.homeTeamId);
  const away = table.get(fixture.awayTeamId);

  if (!home || !away || !hasFinalScore(fixture)) {
    return;
  }

  const homeScore = scoreNumber(fixture.score.home);
  const awayScore = scoreNumber(fixture.score.away);

  home.played += 1;
  away.played += 1;
  home.gf += homeScore;
  home.ga += awayScore;
  away.gf += awayScore;
  away.ga += homeScore;

  if (homeScore > awayScore) {
    home.wins += 1;
    away.losses += 1;
    home.points += 3;
  } else if (awayScore > homeScore) {
    away.wins += 1;
    home.losses += 1;
    away.points += 3;
  } else {
    home.draws += 1;
    away.draws += 1;
    home.points += 1;
    away.points += 1;
  }
}

function trimSentence(value) {
  return String(value || "")
    .replace(/^🌟\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function withPeriod(value) {
  const text = trimSentence(value);
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function shortHighlight(text) {
  return text.length <= 95 ? text : "";
}

function getCatchUpStandout(fixture) {
  const standout = Array.isArray(fixture.catchUp)
    ? fixture.catchUp.find((item) => typeof item?.standouts === "string" && item.standouts.trim())?.standouts
    : "";

  if (!standout) {
    return "";
  }

  const clean = trimSentence(standout);
  const candidates = [
    clean,
    clean.split(/,\s+(?:while|but)\s+/i)[0],
    clean.split(/\s+before\s+/i)[0]
  ].map(withPeriod);

  return candidates.map((candidate) => `🌟 ${candidate}`).find(shortHighlight) || "";
}

function scorelineHighlight(fixture, teamsById) {
  const home = teamsById.get(fixture.homeTeamId);
  const away = teamsById.get(fixture.awayTeamId);
  const score = {
    home: scoreNumber(fixture.score.home),
    away: scoreNumber(fixture.score.away)
  };
  const side = winnerSide(score);

  if (!side) {
    return score.home === 0 && score.away === 0
      ? `⚽ ${home.name} and ${away.name} shared a 0-0 draw.`
      : `⚽ ${home.name} and ${away.name} finished level at ${score.home}-${score.away}.`;
  }

  const winner = side === "home" ? home : away;
  const loser = side === "home" ? away : home;
  const winnerScore = side === "home" ? score.home : score.away;
  const loserScore = side === "home" ? score.away : score.home;
  const margin = winnerScore - loserScore;
  const scoreText = `${winnerScore}-${loserScore}`;

  if (margin >= 3) {
    return `⚽ ${winner.name} made a statement with a ${scoreText} win.`;
  }

  if (winnerScore === 1) {
    return `⚽ ${winner.name} found the decisive goal in a ${scoreText} win.`;
  }

  return `⚽ ${winner.name} beat ${loser.name} ${scoreText}.`;
}

function momentHighlight(fixture, teamsById) {
  const sourcedStandout = getCatchUpStandout(fixture);
  if (sourcedStandout) {
    return sourcedStandout;
  }

  const home = teamsById.get(fixture.homeTeamId);
  const away = teamsById.get(fixture.awayTeamId);
  const score = {
    home: scoreNumber(fixture.score.home),
    away: scoreNumber(fixture.score.away)
  };
  const side = winnerSide(score);

  if (!side) {
    return score.home === 0 && score.away === 0
      ? "🌟 Both clean sheets kept the match tight."
      : "🌟 Neither side pulled clear after trading goals.";
  }

  const winner = side === "home" ? home : away;
  const loser = side === "home" ? away : home;
  const winnerScore = side === "home" ? score.home : score.away;
  const loserScore = side === "home" ? score.away : score.home;
  const margin = winnerScore - loserScore;

  if (loserScore === 0) {
    return `🌟 The clean sheet gave ${loser.name} no way back.`;
  }

  if (margin >= 3) {
    return `🌟 ${winner.name}'s attack broke the match open.`;
  }

  if (margin === 1) {
    return `🌟 ${winner.name} protected a one-goal edge.`;
  }

  return `🌟 ${winner.name} created enough separation to control the finish.`;
}

function impactHighlight(fixture, teamsById, table) {
  const home = teamsById.get(fixture.homeTeamId);
  const away = teamsById.get(fixture.awayTeamId);
  const homeRow = table.get(fixture.homeTeamId);
  const awayRow = table.get(fixture.awayTeamId);
  const score = {
    home: scoreNumber(fixture.score.home),
    away: scoreNumber(fixture.score.away)
  };
  const side = winnerSide(score);
  const context = `Group ${fixture.groupId}`;

  if (!side) {
    if (homeRow.points === awayRow.points) {
      return `📊 Both teams moved to ${pointText(homeRow.points)} in ${context}.`;
    }

    return shortHighlight(
      `📊 ${home.name} moved to ${pointText(homeRow.points)} and ${away.name} to ${pointText(awayRow.points)} in ${context}.`
    ) || `📊 Both teams took one point from ${context}.`;
  }

  const winner = side === "home" ? home : away;
  const loser = side === "home" ? away : home;
  const winnerRow = side === "home" ? homeRow : awayRow;
  const loserRow = side === "home" ? awayRow : homeRow;
  const base = `📊 ${winner.name} moved to ${pointText(winnerRow.points)} in ${context}`;
  const loserClause =
    loserRow.points === 0
      ? ` and left ${loser.name} without a point.`
      : ` while ${loser.name} stayed on ${pointText(loserRow.points)}.`;
  const detailed = `${base}${loserClause}`;

  return shortHighlight(detailed) || `${base}.`;
}

function buildHighlights(fixture, teamsById, table) {
  const highlights = [
    ...(goalCount(fixture) ? [] : [scorelineHighlight(fixture, teamsById)]),
    momentHighlight(fixture, teamsById),
    impactHighlight(fixture, teamsById, table)
  ];

  return highlights.filter(Boolean).map((highlight) => {
    if (highlight.length > 95) {
      throw new Error(`Generated result highlight is too long for ${fixture.id}: ${highlight}`);
    }

    return highlight;
  });
}

const [fixturesData, teamsData, tournamentData] = await Promise.all([
  readJson(fixturesPath),
  readJson(teamsPath),
  readJson(tournamentPath)
]);

const teamsById = new Map(teamsData.teams.map((team) => [team.id, team]));
const groupTables = new Map(
  (tournamentData.groups || []).map((group) => [
    group.id,
    new Map(group.teamIds.map((teamId) => [teamId, createStanding(teamId)]))
  ])
);
const fixtureOrder = new Map((fixturesData.fixtures || []).map((fixture, index) => [fixture.id, index]));
const finishedGroupFixtures = [...(fixturesData.fixtures || [])]
  .filter(
    (fixture) =>
      fixture.stage === "group" &&
      fixture.status === "FT" &&
      fixture.groupId &&
      teamsById.has(fixture.homeTeamId) &&
      teamsById.has(fixture.awayTeamId) &&
      hasFinalScore(fixture)
  )
  .sort(
    (a, b) =>
      new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime() ||
      (fixtureOrder.get(a.id) || 0) - (fixtureOrder.get(b.id) || 0)
  );

let populated = 0;
let skipped = 0;

for (const fixture of finishedGroupFixtures) {
  const table = groupTables.get(fixture.groupId);

  if (!table) {
    skipped += 1;
    continue;
  }

  applyResult(table, fixture);

  const hasAuthoredHighlights =
    Array.isArray(fixture.resultHighlights) &&
    fixture.resultHighlights.some((highlight) => typeof highlight === "string" && highlight.trim());

  if (hasAuthoredHighlights && !overwrite) {
    skipped += 1;
    continue;
  }

  fixture.resultHighlights = buildHighlights(fixture, teamsById, table);
  populated += 1;
}

if (populated) {
  fixturesData.updatedAt = new Date().toISOString();
  await writeFile(fixturesPath, `${JSON.stringify(fixturesData, null, 2)}\n`);
}

console.log(
  `${overwrite ? "Wrote" : "Populated"} ${populated} result highlight set${populated === 1 ? "" : "s"}; skipped ${skipped}.`
);
