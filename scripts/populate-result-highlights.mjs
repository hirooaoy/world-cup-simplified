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
const refreshGeneric = process.argv.includes("--refresh-generic");

const zeroZeroMoments = new Map([
  ["spain-cabo-verde-2026-06-15", "🌟 Cabo Verde held Spain's possession game to a scoreless tournament debut."],
  ["ecuador-curacao-2026-06-20", "🌟 Curaçao's first World Cup point came through a hard-earned clean sheet."],
  ["belgium-ir-iran-2026-06-21", "🌟 IR Iran kept Belgium's creators quiet and made the low-margin plan stick."]
]);

const genericMomentPattern =
  /Both clean sheets kept|Neither side pulled clear|The clean sheet gave|attack broke the match open|protected a one-goal edge|created enough separation|made a statement with|found the decisive goal/i;

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

function hasGenericHighlights(fixture) {
  return (fixture.resultHighlights || []).some((highlight) => genericMomentPattern.test(highlight));
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

function formatGoalMinute(goal) {
  if (!Number.isFinite(Number(goal.minute))) {
    return "";
  }

  const offset = Number.isFinite(Number(goal.offset)) ? `+${goal.offset}` : "";
  return `${goal.minute}${offset}'`;
}

function goalEvents(fixture, teamsById) {
  return [
    ...(fixture.goalsHome || []).map((goal) => ({ ...goal, side: "home", team: teamsById.get(fixture.homeTeamId) })),
    ...(fixture.goalsAway || []).map((goal) => ({ ...goal, side: "away", team: teamsById.get(fixture.awayTeamId) }))
  ].sort((a, b) => {
    const aMinute = Number.isFinite(Number(a.minute)) ? Number(a.minute) : 0;
    const bMinute = Number.isFinite(Number(b.minute)) ? Number(b.minute) : 0;
    const aOffset = Number.isFinite(Number(a.offset)) ? Number(a.offset) : 0;
    const bOffset = Number.isFinite(Number(b.offset)) ? Number(b.offset) : 0;
    return aMinute - bMinute || aOffset - bOffset;
  });
}

function scorerCounts(goals) {
  const counts = new Map();

  for (const goal of goals) {
    if (goal.ownGoal) {
      continue;
    }

    counts.set(goal.name, (counts.get(goal.name) || 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || null;
}

function goalAwareMoment(fixture, teamsById, score, side) {
  const goals = goalEvents(fixture, teamsById);

  if (!goals.length) {
    return "";
  }

  const home = teamsById.get(fixture.homeTeamId);
  const away = teamsById.get(fixture.awayTeamId);
  const winner = side === "home" ? home : side === "away" ? away : null;
  const lastGoal = goals[goals.length - 1];
  const lastMinute = formatGoalMinute(lastGoal);
  const topScorer = scorerCounts(goals);
  const winnerGoals = winner ? goals.filter((goal) => goal.side === side) : [];
  const lastWinnerGoal = winnerGoals[winnerGoals.length - 1];
  const lastWinnerMinute = lastWinnerGoal ? formatGoalMinute(lastWinnerGoal) : "";

  const candidates = [];

  if (topScorer?.[1] >= 3 && winner) {
    candidates.push(`🌟 ${topScorer[0]} completed a hat trick as ${winner.name} ran away with it.`);
  }

  if (topScorer?.[1] === 2 && winner) {
    candidates.push(`🌟 ${topScorer[0]} scored twice as ${winner.name} pulled clear.`);
  }

  if (!side) {
    if (lastGoal.ownGoal) {
      candidates.push(`🌟 A ${lastMinute} own goal earned ${lastGoal.team.name} a point.`);
    } else {
      candidates.push(`🌟 ${lastGoal.name}'s ${lastMinute} equalizer earned ${lastGoal.team.name} a point.`);
    }
  }

  if (winner && Math.abs(score.home - score.away) === 1 && lastWinnerGoal) {
    candidates.push(
      lastWinnerGoal.ownGoal
        ? `🌟 A ${lastWinnerMinute} own goal settled it for ${winner.name}.`
        : `🌟 ${lastWinnerGoal.name}'s ${lastWinnerMinute} winner settled it for ${winner.name}.`
    );
  }

  if (winner && lastWinnerGoal?.penalty) {
    candidates.push(`🌟 ${lastWinnerGoal.name}'s late penalty sealed ${winner.name}'s win.`);
  }

  if (winner && goals.length >= 2) {
    const first = goals[0];
    candidates.push(`🌟 ${first.name} opened it before ${lastGoal.name} finished the scoring.`);
  }

  if (winner && goals.length === 1) {
    candidates.push(`🌟 ${lastGoal.name}'s ${lastMinute} finish was enough for ${winner.name}.`);
  }

  return candidates.find(shortHighlight) || "";
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

function keyPlayerName(fixture, side, fallback) {
  const player = (fixture.keyPlayers?.[side] || []).find((item) =>
    typeof item === "string" ? item.trim() : item?.name
  );
  const name = typeof player === "string" ? player.trim() : player?.name;
  return name || fallback?.name || "";
}

function drawMomentHighlight(fixture, teamsById, score) {
  const home = teamsById.get(fixture.homeTeamId);
  const away = teamsById.get(fixture.awayTeamId);
  const homeFocus = keyPlayerName(fixture, "home", home);
  const awayFocus = keyPlayerName(fixture, "away", away);
  const candidates =
    score.home === 0 && score.away === 0
      ? [
          `🌟 ${homeFocus} and ${awayFocus} carried the duel without a breakthrough.`,
          `🌟 ${home.name} and ${away.name} cancelled each other out.`
        ]
      : [
          `🌟 ${homeFocus} and ${awayFocus} traded momentum without a winner.`,
          `🌟 ${home.name} and ${away.name} traded momentum without a winner.`
        ];

  return candidates.find(shortHighlight) || "🌟 No breakthrough came from a tight draw.";
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
    if (score.home === 0 && score.away === 0) {
      return zeroZeroMoments.get(fixture.id) || drawMomentHighlight(fixture, teamsById, score);
    }

    return goalAwareMoment(fixture, teamsById, score, side) || drawMomentHighlight(fixture, teamsById, score);
  }

  const winner = side === "home" ? home : away;
  const loser = side === "home" ? away : home;
  const winnerScore = side === "home" ? score.home : score.away;
  const loserScore = side === "home" ? score.away : score.home;
  const margin = winnerScore - loserScore;
  const goalMoment = goalAwareMoment(fixture, teamsById, score, side);

  if (goalMoment) {
    return goalMoment;
  }

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

  if (hasAuthoredHighlights && !overwrite && !(refreshGeneric && hasGenericHighlights(fixture))) {
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
  `${overwrite ? "Wrote" : refreshGeneric ? "Refreshed" : "Populated"} ${populated} result highlight set${populated === 1 ? "" : "s"}; skipped ${skipped}.`
);
