#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const fixturesPath = path.join(dataDir, "fixtures.json");
const historyPath = path.join(dataDir, "history.json");
const teamsPath = path.join(dataDir, "teams.json");
const tournamentPath = path.join(dataDir, "tournament.json");
const overwrite = process.argv.includes("--overwrite");
const refreshGeneric = process.argv.includes("--refresh-generic");
const currentOnly = process.argv.includes("--current-only");
const historyOnly = process.argv.includes("--history-only");

if (currentOnly && historyOnly) {
  throw new Error("Use either --current-only or --history-only, not both.");
}

const zeroZeroMoments = new Map([
  ["spain-cabo-verde-2026-06-15", "🌟 Cabo Verde held Spain's possession game to a scoreless tournament debut."],
  ["ecuador-curacao-2026-06-20", "🌟 Curaçao's first World Cup point came through a hard-earned clean sheet."],
  ["belgium-ir-iran-2026-06-21", "🌟 IR Iran kept Belgium's creators quiet and made the low-margin plan stick."]
]);

const genericMomentPattern =
  /Both clean sheets kept|Neither side pulled clear|The clean sheet gave|attack broke the match open|protected a one-goal edge|came through a tight one-goal match|created enough separation|made a statement with|found the decisive goal/i;

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
  const currentTeam = teamId ? teamsById.get(teamId) : null;
  if (currentTeam) {
    return currentTeam;
  }

  const name = side === "home" ? fixture.homeSlot : fixture.awaySlot;
  return name ? { id: teamId || name, name } : null;
}

function hasFixtureTeams(fixture, teamsById) {
  return Boolean(getFixtureTeam(fixture, teamsById, "home")?.name && getFixtureTeam(fixture, teamsById, "away")?.name);
}

function isGroupResultFixture(fixture) {
  return fixture.stage === "group" || Boolean(fixture.group || fixture.groupId);
}

function isFinalRound(fixture) {
  return /^final$/i.test(String(fixture.round || "").trim());
}

function winnerSide(score) {
  if (score.home === score.away) {
    return "";
  }

  return score.home > score.away ? "home" : "away";
}

function scorePairForSide(pair, side) {
  if (!pair || !Number.isFinite(Number(pair.home)) || !Number.isFinite(Number(pair.away))) {
    return "";
  }

  return side === "away" ? `${pair.away}-${pair.home}` : `${pair.home}-${pair.away}`;
}

function penaltyWinnerSide(fixture, teamsById) {
  const penalties = fixture.scoreDetails?.penalties;
  if (penalties) {
    const side = winnerSide({
      home: scoreNumber(penalties.home),
      away: scoreNumber(penalties.away)
    });
    if (side) {
      return side;
    }
  }

  const winner = fixture.winner;
  if (!winner) {
    return "";
  }

  if (winner === getFixtureTeam(fixture, teamsById, "home")?.name) {
    return "home";
  }

  if (winner === getFixtureTeam(fixture, teamsById, "away")?.name) {
    return "away";
  }

  return "";
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

function shortStoryBullet(text) {
  const sentence = withPeriod(text);
  return sentence.length <= 160 ? sentence : "";
}

function addStoryBullet(bullets, text) {
  const sentence = shortStoryBullet(text);
  if (!sentence) {
    return;
  }

  const normalized = sentence.toLowerCase();
  if (bullets.some((bullet) => bullet.toLowerCase() === normalized)) {
    return;
  }

  bullets.push(sentence);
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
    ...(fixture.goalsHome || []).map((goal) => ({ ...goal, side: "home", team: getFixtureTeam(fixture, teamsById, "home") })),
    ...(fixture.goalsAway || []).map((goal) => ({ ...goal, side: "away", team: getFixtureTeam(fixture, teamsById, "away") }))
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

function otherSide(side) {
  return side === "home" ? "away" : "home";
}

function teamForSide(teamsById, fixture, side) {
  return getFixtureTeam(fixture, teamsById, side);
}

function goalScorerLabel(goal, { sentenceStart = true } = {}) {
  if (goal.ownGoal) {
    return `${sentenceStart ? "A" : "a"} ${formatGoalMinute(goal)} own goal`;
  }

  return goal.name;
}

function goalPossessiveLabel(goal) {
  if (goal.ownGoal) {
    return `A ${formatGoalMinute(goal)} own goal`;
  }

  const minute = formatGoalMinute(goal);
  return minute ? `${goal.name}'s ${minute}` : `${goal.name}'s`;
}

function addEqualizerStory(bullets, goal, teamName) {
  if (goal.ownGoal) {
    addStoryBullet(bullets, `${goalPossessiveLabel(goal)} rescued a point for ${teamName}`);
    return;
  }

  addStoryBullet(bullets, `${goalPossessiveLabel(goal)} equalizer rescued a point for ${teamName}`);
}

function addWinnerStory(bullets, goal, teamName) {
  if (goal.ownGoal) {
    addStoryBullet(bullets, `${goalPossessiveLabel(goal)} settled a tight match for ${teamName}`);
    return;
  }

  addStoryBullet(bullets, `${goalPossessiveLabel(goal)} winner settled a tight match for ${teamName}`);
}

function addReplyStory(bullets, goal, teamName) {
  if (!goal) {
    return;
  }

  if (goal.ownGoal) {
    addStoryBullet(bullets, `${goalPossessiveLabel(goal)} gave ${teamName} a reply`);
    return;
  }

  const finishType = goal.penalty ? "penalty" : "goal";
  addStoryBullet(bullets, `${goalPossessiveLabel(goal)} ${finishType} gave ${teamName} a reply`);
}

function addShootoutEqualizerStory(bullets, goal) {
  if (!goal) {
    return;
  }

  if (goal.ownGoal) {
    addStoryBullet(bullets, `${goalPossessiveLabel(goal)} eventually forced the shootout`);
    return;
  }

  addStoryBullet(bullets, `${goalPossessiveLabel(goal)} equalizer eventually forced the shootout`);
}

function addKnockoutDrawEqualizerStory(bullets, goal) {
  if (!goal) {
    return;
  }

  if (goal.ownGoal) {
    addStoryBullet(bullets, `${goalPossessiveLabel(goal)} left the tie level`);
    return;
  }

  addStoryBullet(bullets, `${goalPossessiveLabel(goal)} equalizer left the tie level`);
}

function scoreWord(count) {
  if (count === 2) {
    return "twice";
  }
  if (count === 3) {
    return "three times";
  }
  return `${count} times`;
}

function lastGoalForSide(goals, side) {
  return goals.filter((goal) => goal.side === side).at(-1) || null;
}

function firstEqualizerForSide(goals, side) {
  const score = { home: 0, away: 0 };

  for (const goal of goals) {
    score[goal.side] += 1;
    if (goal.side === side && score.home === score.away) {
      return goal;
    }
  }

  return null;
}

function buildScoreOnlyStoryBullets(fixture, teamsById, score, side) {
  const home = getFixtureTeam(fixture, teamsById, "home");
  const away = getFixtureTeam(fixture, teamsById, "away");
  const bullets = [];

  if (!side) {
    addStoryBullet(bullets, `${home.name} and ${away.name} traded pressure without finding a goal`);
    addStoryBullet(bullets, "Both defenses kept the scoring lanes closed through full time");
    addStoryBullet(bullets, `${home.name} and ${away.name} stayed locked together until the final whistle`);
    return bullets;
  }

  const winner = side === "home" ? home : away;
  const loser = side === "home" ? away : home;
  const winnerScore = side === "home" ? score.home : score.away;
  const loserScore = side === "home" ? score.away : score.home;
  const margin = winnerScore - loserScore;

  if (winnerScore === 1 && loserScore === 0) {
    addStoryBullet(bullets, `${winner.name} found the only goal, leaving ${loser.name} chasing a 1-0 match`);
  } else if (margin >= 3) {
    addStoryBullet(bullets, `${winner.name}'s attack kept finding space and turned the finish into a rout`);
  } else {
    addStoryBullet(bullets, `${winner.name} got the decisive details right in a match that stayed tight`);
  }

  if (loserScore === 0) {
    addStoryBullet(bullets, `${winner.name} kept ${loser.name} out and closed the match with a clean sheet`);
  } else {
    addStoryBullet(bullets, `${winner.name} closed the result without needing another late twist`);
  }

  addStoryBullet(bullets, `${loser.name} stayed close enough to keep the final minutes tense`);
  return bullets;
}

function buildDrawStoryBullets(fixture, teamsById, goals, score) {
  const home = getFixtureTeam(fixture, teamsById, "home");
  const away = getFixtureTeam(fixture, teamsById, "away");
  const bullets = [];
  const groupResult = isGroupResultFixture(fixture);

  if (score.home === 0 && score.away === 0) {
    return buildScoreOnlyStoryBullets(fixture, teamsById, score, "");
  }

  const firstGoal = goals[0];
  const lastGoal = goals.at(-1);
  const firstTeam = firstGoal.team?.name || teamForSide(teamsById, fixture, firstGoal.side)?.name;
  const lastTeam = lastGoal.team?.name || teamForSide(teamsById, fixture, lastGoal.side)?.name;
  const topScorer = scorerCounts(goals);

  if (firstGoal && lastGoal && firstGoal.side !== lastGoal.side) {
    addStoryBullet(
      bullets,
      `${goalScorerLabel(firstGoal)} put ${firstTeam} in front before ${goalScorerLabel(lastGoal, { sentenceStart: false })} answered for ${lastTeam}`
    );
    if (groupResult) {
      addEqualizerStory(bullets, lastGoal, lastTeam);
    } else {
      addKnockoutDrawEqualizerStory(bullets, lastGoal);
    }
  } else if (lastGoal) {
    if (groupResult) {
      addEqualizerStory(bullets, lastGoal, lastTeam);
    } else {
      addKnockoutDrawEqualizerStory(bullets, lastGoal);
    }
  }

  if (topScorer?.[1] >= 2) {
    addStoryBullet(bullets, `${topScorer[0]} scored ${scoreWord(topScorer[1])} as the draw kept swinging`);
  }

  if (groupResult) {
    addStoryBullet(bullets, `${home.name} and ${away.name} kept trading momentum instead of pulling clear`);
    addStoryBullet(bullets, "The late pressure never produced a winner after the match came back level");
  } else {
    const ending = fixture.scoreDetails?.extraTime ? "after extra time" : "after the final whistle";
    const tieLabel = fixture.round ? `the ${fixture.round} tie` : "the tie";
    addStoryBullet(bullets, `The draw left ${tieLabel} unresolved ${ending}`);
  }
  addStoryBullet(bullets, `${home.name} and ${away.name} stayed locked together until the final whistle`);

  return bullets.slice(0, 3);
}

function buildShootoutStoryBullets(fixture, teamsById, goals, score, side) {
  const home = getFixtureTeam(fixture, teamsById, "home");
  const away = getFixtureTeam(fixture, teamsById, "away");
  const winner = side === "home" ? home : away;
  const loser = side === "home" ? away : home;
  const bullets = [];
  const firstGoal = goals[0];
  const lastGoal = goals.at(-1);
  const firstTeam = firstGoal?.team?.name || (firstGoal ? teamForSide(teamsById, fixture, firstGoal.side)?.name : "");
  const lastTeam = lastGoal?.team?.name || (lastGoal ? teamForSide(teamsById, fixture, lastGoal.side)?.name : "");
  const penaltyScore = scorePairForSide(fixture.scoreDetails?.penalties, side);

  if (firstGoal && lastGoal && firstGoal.side !== lastGoal.side) {
    addStoryBullet(
      bullets,
      `${goalScorerLabel(firstGoal)} put ${firstTeam} in front before ${goalScorerLabel(lastGoal, { sentenceStart: false })} answered for ${lastTeam}`
    );
    addShootoutEqualizerStory(bullets, lastGoal);
  } else if (lastGoal) {
    addShootoutEqualizerStory(bullets, lastGoal);
  } else if (!goals.length) {
    addStoryBullet(bullets, `${home.name} and ${away.name} stayed scoreless until penalties`);
  }

  addStoryBullet(
    bullets,
    penaltyScore
      ? `${winner.name} won the shootout ${penaltyScore} after a ${score.home}-${score.away} draw`
      : `${winner.name} survived the shootout after a ${score.home}-${score.away} draw`
  );

  if (isFinalRound(fixture)) {
    addStoryBullet(bullets, `${winner.name} lifted the ${fixture.tournamentName || "World Cup"} title through the shootout`);
  } else {
    addStoryBullet(bullets, `${loser.name} exited after penalties kept ${winner.name} alive`);
  }

  return bullets.slice(0, 3);
}

function buildWinStoryBullets(fixture, teamsById, goals, score, side) {
  const bullets = [];
  const home = getFixtureTeam(fixture, teamsById, "home");
  const away = getFixtureTeam(fixture, teamsById, "away");
  const winner = side === "home" ? home : away;
  const loser = side === "home" ? away : home;
  const winnerScore = side === "home" ? score.home : score.away;
  const loserScore = side === "home" ? score.away : score.home;
  const margin = winnerScore - loserScore;
  const firstGoal = goals[0];
  const lastWinnerGoal = lastGoalForSide(goals, side);
  const lastLoserGoal = lastGoalForSide(goals, otherSide(side));
  const equalizer = firstGoal?.side === otherSide(side) ? firstEqualizerForSide(goals, side) : null;
  const topScorer = scorerCounts(goals);

  if (firstGoal?.side === otherSide(side)) {
    addStoryBullet(
      bullets,
      `${goalScorerLabel(firstGoal)} struck first for ${loser.name}, forcing ${winner.name} to chase the match`
    );
  } else if (firstGoal) {
    const firstMinute = Number(firstGoal.minute);
    if (Number.isFinite(firstMinute) && firstMinute <= 20) {
      addStoryBullet(bullets, `${goalScorerLabel(firstGoal)} put ${winner.name} ahead early, making ${loser.name} chase the match`);
    } else {
      addStoryBullet(bullets, `${goalScorerLabel(firstGoal)} broke through for ${winner.name}, shifting the match toward ${winner.name}`);
    }
  }

  if (equalizer && lastWinnerGoal && equalizer !== lastWinnerGoal) {
    addStoryBullet(
      bullets,
      `${goalScorerLabel(equalizer)} brought ${winner.name} level before ${goalScorerLabel(lastWinnerGoal, { sentenceStart: false })} completed the turnaround`
    );
  } else if (lastWinnerGoal && margin === 1) {
    addWinnerStory(bullets, lastWinnerGoal, winner.name);
  } else if (lastWinnerGoal && firstGoal && lastWinnerGoal !== firstGoal) {
    addStoryBullet(bullets, `${goalScorerLabel(lastWinnerGoal)} added the final word as ${winner.name} pulled away`);
  }

  if (topScorer?.[1] >= 2) {
    addStoryBullet(bullets, `${topScorer[0]} scored ${scoreWord(topScorer[1])} as ${winner.name} kept widening the gap`);
  }

  if (loserScore === 0) {
    addStoryBullet(bullets, `${winner.name} kept ${loser.name} out and closed the match with a clean sheet`);
  } else if (margin >= 3) {
    addStoryBullet(bullets, `${winner.name}'s attack kept finding space and turned the finish into a rout`);
  } else if (firstGoal?.side === otherSide(side)) {
    addStoryBullet(bullets, `${loser.name}'s opener made ${winner.name} sweat, but the later chances finally turned`);
  } else if (lastLoserGoal) {
    addReplyStory(bullets, lastLoserGoal, loser.name);
  } else {
    addStoryBullet(bullets, `${loser.name} stayed close enough to keep the final minutes tense`);
  }

  addStoryBullet(bullets, `${winner.name} got the decisive details right in a match that stayed tight`);
  addStoryBullet(bullets, `${winner.name} closed the result without needing another late twist`);

  return bullets.slice(0, 3);
}

function buildStoryBullets(fixture, teamsById) {
  const score = {
    home: scoreNumber(fixture.score.home),
    away: scoreNumber(fixture.score.away)
  };
  const side = winnerSide(score);
  const goals = goalEvents(fixture, teamsById);

  if (!side) {
    const shootoutSide = penaltyWinnerSide(fixture, teamsById);
    if (shootoutSide) {
      return buildShootoutStoryBullets(fixture, teamsById, goals, score, shootoutSide);
    }
  }

  if (!goals.length) {
    return buildScoreOnlyStoryBullets(fixture, teamsById, score, side);
  }

  if (!side) {
    return buildDrawStoryBullets(fixture, teamsById, goals, score);
  }

  return buildWinStoryBullets(fixture, teamsById, goals, score, side);
}

function goalAwareMoment(fixture, teamsById, score, side) {
  const goals = goalEvents(fixture, teamsById);

  if (!goals.length) {
    return "";
  }

  const home = getFixtureTeam(fixture, teamsById, "home");
  const away = getFixtureTeam(fixture, teamsById, "away");
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
  const home = getFixtureTeam(fixture, teamsById, "home");
  const away = getFixtureTeam(fixture, teamsById, "away");
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
  const home = getFixtureTeam(fixture, teamsById, "home");
  const away = getFixtureTeam(fixture, teamsById, "away");
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

  const home = getFixtureTeam(fixture, teamsById, "home");
  const away = getFixtureTeam(fixture, teamsById, "away");
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
    return `🌟 ${winner.name} came through a tight one-goal match.`;
  }

  return `🌟 ${winner.name} created enough separation to control the finish.`;
}

function impactHighlight(fixture, teamsById, table) {
  const home = getFixtureTeam(fixture, teamsById, "home");
  const away = getFixtureTeam(fixture, teamsById, "away");
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

const [fixturesData, historyData, teamsData, tournamentData] = await Promise.all([
  readJson(fixturesPath),
  readJson(historyPath),
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
const finishedFixtures = historyOnly
  ? []
  : [...(fixturesData.fixtures || [])]
  .filter(
    (fixture) =>
      fixture.status === "FT" &&
      teamsById.has(fixture.homeTeamId) &&
      teamsById.has(fixture.awayTeamId) &&
      hasFinalScore(fixture)
  )
  .sort(
    (a, b) =>
      new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime() ||
      (fixtureOrder.get(a.id) || 0) - (fixtureOrder.get(b.id) || 0)
  );
const finishedGroupFixtures = finishedFixtures.filter((fixture) => fixture.stage === "group" && fixture.groupId);
const finishedHistoricalFixtures = currentOnly
  ? []
  : [...(historyData.fixtures || [])]
      .filter((fixture) => fixture.status === "FT" && hasFinalScore(fixture) && hasFixtureTeams(fixture, teamsById))
      .sort(
        (a, b) =>
          new Date(`${a.date}T12:00:00Z`).getTime() - new Date(`${b.date}T12:00:00Z`).getTime() ||
          String(a.sortKey || "").localeCompare(String(b.sortKey || "")) ||
          String(a.id || "").localeCompare(String(b.id || ""))
      );

let highlightPopulated = 0;
let highlightSkipped = 0;
let storyPopulated = 0;
let storySkipped = 0;
let historicalStoryPopulated = 0;
let historicalStorySkipped = 0;

for (const fixture of finishedGroupFixtures) {
  const table = groupTables.get(fixture.groupId);

  if (!table) {
    highlightSkipped += 1;
    continue;
  }

  applyResult(table, fixture);

  const hasAuthoredHighlights = Array.isArray(fixture.resultHighlights)
    ? fixture.resultHighlights.some((highlight) => typeof highlight === "string" && highlight.trim())
    : false;

  if (hasAuthoredHighlights && !overwrite && !(refreshGeneric && hasGenericHighlights(fixture))) {
    highlightSkipped += 1;
    continue;
  }

  fixture.resultHighlights = buildHighlights(fixture, teamsById, table);
  highlightPopulated += 1;
}

for (const fixture of finishedFixtures) {
  const hasStoryBullets = Array.isArray(fixture.resultStoryBullets)
    ? fixture.resultStoryBullets.some((highlight) => typeof highlight === "string" && highlight.trim())
    : false;

  if (hasStoryBullets && !overwrite) {
    storySkipped += 1;
    continue;
  }

  fixture.resultStoryBullets = buildStoryBullets(fixture, teamsById);
  storyPopulated += 1;
}

for (const fixture of finishedHistoricalFixtures) {
  const hasStoryBullets = Array.isArray(fixture.resultStoryBullets)
    ? fixture.resultStoryBullets.some((highlight) => typeof highlight === "string" && highlight.trim())
    : false;

  if (hasStoryBullets && !overwrite) {
    historicalStorySkipped += 1;
    continue;
  }

  fixture.resultStoryBullets = buildStoryBullets(fixture, teamsById);
  historicalStoryPopulated += 1;
}

if (highlightPopulated || storyPopulated) {
  fixturesData.updatedAt = new Date().toISOString();
  await writeFile(fixturesPath, `${JSON.stringify(fixturesData, null, 2)}\n`);
}

if (historicalStoryPopulated) {
  historyData.updatedAt = new Date().toISOString();
  await writeFile(historyPath, `${JSON.stringify(historyData, null, 2)}\n`);
}

console.log(
  `${overwrite ? "Wrote" : refreshGeneric ? "Refreshed" : "Populated"} ${highlightPopulated} result highlight set${highlightPopulated === 1 ? "" : "s"} and ${storyPopulated} current story bullet set${storyPopulated === 1 ? "" : "s"}; skipped ${highlightSkipped} highlight set${highlightSkipped === 1 ? "" : "s"} and ${storySkipped} current story bullet set${storySkipped === 1 ? "" : "s"}.`
);
console.log(
  `${overwrite ? "Wrote" : "Populated"} ${historicalStoryPopulated} historical story bullet set${historicalStoryPopulated === 1 ? "" : "s"}; skipped ${historicalStorySkipped} historical story bullet set${historicalStorySkipped === 1 ? "" : "s"}.`
);
