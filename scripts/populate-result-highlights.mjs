#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZH_PLAYER_NAME_TRANSLATIONS } from "../football-locale-zh.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const fixturesPath = path.join(dataDir, "fixtures.json");
const historyPath = path.join(dataDir, "history.json");
const teamsPath = path.join(dataDir, "teams.json");
const tournamentPath = path.join(dataDir, "tournament.json");
const overwrite = process.argv.includes("--overwrite");
const refreshGeneric = process.argv.includes("--refresh-generic");
const refreshWeakStories = process.argv.includes("--refresh-weak-stories");
const currentStoriesOnly = process.argv.includes("--current-stories-only");
const generateCurrentStories = process.argv.includes("--generate-current-stories") || currentStoriesOnly;
const syncChineseStories = process.argv.includes("--sync-chinese-stories");
const rebuildGeneratedCurrentStories = process.argv.includes("--rebuild-generated-current-stories");
const currentOnly = process.argv.includes("--current-only") || currentStoriesOnly;
const historyOnly = process.argv.includes("--history-only");
const dryRun = process.argv.includes("--dry-run");

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
const weakStoryPattern =
  /\b(?:won the shootout \d+-\d+ after a \d+-\d+ draw|survived the shootout after a \d+-\d+ draw|exited after penalties kept|stayed close enough to keep the final minutes tense|stayed locked together until the final whistle|got the decisive details right in a match that stayed tight|closed the result without needing another late twist)\b/i;
const weakCurrentStoryPattern =
  /\b(?:broke through for .+?, shifting the match toward|added the final word as .+? pulled away|scored (?:twice|three times|\d+ times) as .+? kept widening the gap)\b/i;
const repeatedGenericCurrentStoryPattern =
  /\b(?:chase the match|pulled away|trading momentum|rescued a point|settled a tight match|traded pressure without finding a goal|both defenses kept the scoring lanes closed|made .+ sweat|later chances finally turned|own goal scored|scored their final goal|scored .+ final goal|chasing a \d+-\d+ match|super goal|shaped .+ attack|restore .+ edge|opened (?:the )?scoring|first minute of the second half|finish comfortably|finished the match|match's opening and only goal|moving .+ into match \d+|did not make enough punishment count|quarter-final win|assisted .+ for .+|beat .+ \d+-\d+|drew \d+-\d+)\b|\b(?:United States|Netherlands)'s\b/i;
const weakChineseCurrentStoryPattern =
  /(?:漫长的节奏转换|稳住了局面|更紧凑的防线|吸收了.+冲击|高度胶着|比赛变得开放|始终保持组织)/u;
const ZH_TEAM_NAMES = Object.freeze({
  ALG: "阿尔及利亚",
  ARG: "阿根廷",
  AUS: "澳大利亚",
  AUT: "奥地利",
  BEL: "比利时",
  BIH: "波黑",
  BRA: "巴西",
  CAN: "加拿大",
  CIV: "科特迪瓦",
  COD: "刚果民主共和国",
  COL: "哥伦比亚",
  CPV: "佛得角",
  CRO: "克罗地亚",
  CUW: "库拉索",
  CZE: "捷克",
  ECU: "厄瓜多尔",
  EGY: "埃及",
  ENG: "英格兰",
  ESP: "西班牙",
  FRA: "法国",
  GER: "德国",
  GHA: "加纳",
  HAI: "海地",
  IRN: "伊朗",
  IRQ: "伊拉克",
  JOR: "约旦",
  JPN: "日本",
  KOR: "韩国",
  KSA: "沙特阿拉伯",
  MAR: "摩洛哥",
  MEX: "墨西哥",
  NED: "荷兰",
  NOR: "挪威",
  NZL: "新西兰",
  PAN: "巴拿马",
  PAR: "巴拉圭",
  POR: "葡萄牙",
  QAT: "卡塔尔",
  RSA: "南非",
  SCO: "苏格兰",
  SEN: "塞内加尔",
  SUI: "瑞士",
  SWE: "瑞典",
  TUN: "突尼斯",
  TUR: "土耳其",
  URU: "乌拉圭",
  USA: "美国",
  UZB: "乌兹别克斯坦"
});

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

function isWeakStoryBullet(highlight) {
  return weakStoryPattern.test(String(highlight || ""));
}

function hasWeakStoryBullets(fixture) {
  return (fixture.resultStoryBullets || []).some(isWeakStoryBullet);
}

function hasWeakCurrentStoryBullets(fixture) {
  return (fixture.resultStoryBullets || []).some((highlight) =>
    isWeakCurrentStoryBullet(highlight)
  );
}

function isWeakCurrentStoryBullet(highlight) {
  const text = String(highlight || "");
  return weakStoryPattern.test(text) || weakCurrentStoryPattern.test(text) || repeatedGenericCurrentStoryPattern.test(text);
}

function storyMinuteValue(highlight) {
  const match = String(highlight || "").match(/\b(\d{1,3})(?:\+(\d{1,2}))?'/);
  if (!match) {
    return null;
  }

  const minute = Number(match[1]);
  const offset = Number(match[2] || 0);
  return Number.isFinite(minute) && Number.isFinite(offset) ? minute * 100 + offset : null;
}

function hasOutOfOrderStoryMinutes(fixture) {
  const minuteRows = (fixture.resultStoryBullets || [])
    .map(storyMinuteValue)
    .filter((minuteValue) => minuteValue !== null);

  return minuteRows.some((minuteValue, index) => index > 0 && minuteValue < minuteRows[index - 1]);
}

function needsShootoutTextureRefresh(fixture) {
  if (!fixture.scoreDetails?.penalties) {
    return false;
  }

  const bullets = fixture.resultStoryBullets || [];
  const mentionsExtraTime = bullets.some((highlight) =>
    /\bextra time\b/i.test(String(highlight || ""))
  );
  const mentionsShootout = bullets.some((highlight) =>
    /\b(?:penalt(?:y|ies)|shootout)\b/i.test(String(highlight || ""))
  );

  return !(mentionsExtraTime && mentionsShootout);
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

function assistCounts(goals, side) {
  const counts = new Map();

  for (const goal of goals) {
    if (goal.side !== side || goal.ownGoal || !goal.assistName || goal.assistName === goal.name) {
      continue;
    }

    const row = counts.get(goal.assistName) || [];
    row.push(goal);
    counts.set(goal.assistName, row);
  }

  return [...counts.entries()].sort((a, b) => b[1].length - a[1].length)[0] || null;
}

function formatNameList(names) {
  const values = [...new Set(names.filter(Boolean))];
  if (values.length <= 1) {
    return values[0] || "";
  }
  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function possessiveName(name) {
  return /s$/i.test(String(name || "")) ? `${name}'` : `${name}'s`;
}

function buildAssistStory(goals, side, teamName) {
  const topAssist = assistCounts(goals, side);
  if (!topAssist || topAssist[1].length < 2) {
    return "";
  }

  const [assistName, assistedGoals] = topAssist;
  const scorerNames = [...new Set(assistedGoals.map((goal) => goal.name).filter(Boolean))];
  const scorerText = scorerNames.length === 1 && assistedGoals.length > 1
    ? `${scorerNames[0]} twice`
    : formatNameList(scorerNames);

  return `${assistName} assisted ${scorerText} for ${teamName}`;
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
    addStoryBullet(bullets, `${goalPossessiveLabel(goal)} brought ${teamName} level`);
    return;
  }

  addStoryBullet(bullets, `${goalPossessiveLabel(goal)} equalizer brought ${teamName} level`);
}

function addShootoutEqualizerStory(bullets, goal) {
  if (!goal) {
    return;
  }

  if (goal.ownGoal) {
    addStoryBullet(bullets, `${goalPossessiveLabel(goal)} brought the match level before the shootout`);
    return;
  }

  addStoryBullet(bullets, `${goalPossessiveLabel(goal)} equalizer brought the match level before the shootout`);
}

function addKnockoutDrawEqualizerStory(bullets, goal) {
  if (!goal) {
    return;
  }

  if (goal.ownGoal) {
    addStoryBullet(bullets, `${goalPossessiveLabel(goal)} brought the tie level`);
    return;
  }

  addStoryBullet(bullets, `${goalPossessiveLabel(goal)} equalizer brought the tie level`);
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

function goalHappensBefore(goals, firstGoal, secondGoal) {
  const firstIndex = goals.indexOf(firstGoal);
  const secondIndex = goals.indexOf(secondGoal);
  return firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex;
}

function buildShootoutTextureStory(fixture, teamsById, score) {
  const home = getFixtureTeam(fixture, teamsById, "home");
  const away = getFixtureTeam(fixture, teamsById, "away");
  if (!home?.name || !away?.name) {
    return "";
  }

  const scoreText = `${score.home}-${score.away}`;
  return `${home.name} and ${away.name} were level at ${scoreText} after extra time`;
}

function buildScoreOnlyStoryBullets(fixture, teamsById, score, side) {
  const home = getFixtureTeam(fixture, teamsById, "home");
  const away = getFixtureTeam(fixture, teamsById, "away");
  const bullets = [];

  if (!side) {
    addStoryBullet(bullets, `${home.name} and ${away.name} drew 0-0`);
    return bullets;
  }

  const winner = side === "home" ? home : away;
  const loser = side === "home" ? away : home;
  const winnerScore = side === "home" ? score.home : score.away;
  const loserScore = side === "home" ? score.away : score.home;
  addStoryBullet(bullets, `${winner.name} beat ${loser.name} ${winnerScore}-${loserScore}`);

  if (loserScore === 0) {
    addStoryBullet(bullets, `${winner.name} finished with a clean sheet`);
  }

  return bullets.slice(0, 2);
}

function buildDrawStoryBullets(fixture, teamsById, goals, score) {
  const home = getFixtureTeam(fixture, teamsById, "home");
  const away = getFixtureTeam(fixture, teamsById, "away");
  const bullets = [];
  if (score.home === 0 && score.away === 0) {
    return buildScoreOnlyStoryBullets(fixture, teamsById, score, "");
  }

  const firstGoal = goals[0];
  const lastGoal = goals.at(-1);
  const firstTeam = firstGoal.team?.name || teamForSide(teamsById, fixture, firstGoal.side)?.name;
  const lastTeam = lastGoal.team?.name || teamForSide(teamsById, fixture, lastGoal.side)?.name;
  if (firstGoal) {
    addStoryBullet(bullets, `${goalScorerLabel(firstGoal)} opened the scoring for ${firstTeam}`);
  }

  if (lastGoal && lastGoal !== firstGoal) {
    if (isGroupResultFixture(fixture)) {
      addEqualizerStory(bullets, lastGoal, lastTeam);
    } else {
      addKnockoutDrawEqualizerStory(bullets, lastGoal);
    }
  }

  if (bullets.length < 2) {
    addStoryBullet(bullets, `${home.name} and ${away.name} drew ${score.home}-${score.away}`);
  }

  return bullets.slice(0, 2);
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
  } else if (lastGoal) {
    addShootoutEqualizerStory(bullets, lastGoal);
  } else if (!goals.length) {
    addStoryBullet(bullets, `${home.name} and ${away.name} stayed scoreless until penalties`);
  }

  addStoryBullet(bullets, buildShootoutTextureStory(fixture, teamsById, score));

  if (isFinalRound(fixture)) {
    const title = fixture.tournamentName || "World Cup";
    addStoryBullet(
      bullets,
      penaltyScore
        ? `${winner.name} won the ${title} final ${penaltyScore} in the shootout`
        : `${winner.name} lifted the ${title} title through the shootout`
    );
  } else {
    addStoryBullet(
      bullets,
      penaltyScore
        ? `${winner.name} won the shootout ${penaltyScore}`
        : `${winner.name} advanced through the shootout`
    );
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
  const firstGoal = goals[0];
  const lastWinnerGoal = lastGoalForSide(goals, side);
  const winnerEqualizer = firstGoal?.side === otherSide(side) ? firstEqualizerForSide(goals, side) : null;
  const loserEqualizer = firstGoal?.side === side ? firstEqualizerForSide(goals, otherSide(side)) : null;

  if (firstGoal) {
    const firstTeam = teamForSide(teamsById, fixture, firstGoal.side);
    addStoryBullet(bullets, `${goalScorerLabel(firstGoal)} opened the scoring for ${firstTeam.name}`);
  }

  const assistStory = buildAssistStory(goals, side, winner.name);

  const addFinalWinnerGoal = (goal) => {
    if (goal.ownGoal) {
      addStoryBullet(bullets, `${goalScorerLabel(goal)} completed the scoring for ${winner.name}`);
      return;
    }
    addStoryBullet(bullets, `${goalScorerLabel(goal)} scored ${possessiveName(winner.name)} final goal`);
  };

  if (winnerEqualizer && lastWinnerGoal && winnerEqualizer !== lastWinnerGoal) {
    if (!winnerEqualizer.ownGoal && !lastWinnerGoal.ownGoal && winnerEqualizer.name === lastWinnerGoal.name) {
      addStoryBullet(
        bullets,
        `${goalScorerLabel(winnerEqualizer)} equalized, then scored ${possessiveName(winner.name)} final goal`
      );
    } else if (lastWinnerGoal.ownGoal) {
      addStoryBullet(
        bullets,
        `${goalScorerLabel(winnerEqualizer)} equalized for ${winner.name}. ${goalScorerLabel(lastWinnerGoal)} completed the scoring`
      );
    } else {
      addStoryBullet(
        bullets,
        `${goalScorerLabel(winnerEqualizer)} equalized for ${winner.name}. ${goalScorerLabel(lastWinnerGoal)} scored ${possessiveName(winner.name)} final goal`
      );
    }
  } else if (loserEqualizer && lastWinnerGoal && goalHappensBefore(goals, loserEqualizer, lastWinnerGoal)) {
    if (lastWinnerGoal.ownGoal) {
      addStoryBullet(
        bullets,
        `${goalScorerLabel(loserEqualizer)} equalized for ${loser.name}. ${goalScorerLabel(lastWinnerGoal)} completed the scoring for ${winner.name}`
      );
    } else {
      addStoryBullet(
        bullets,
        `${goalScorerLabel(loserEqualizer)} equalized for ${loser.name}. ${goalScorerLabel(lastWinnerGoal)} scored ${possessiveName(winner.name)} final goal`
      );
    }
  } else if (lastWinnerGoal && firstGoal && lastWinnerGoal !== firstGoal) {
    addFinalWinnerGoal(lastWinnerGoal);
  } else if (assistStory) {
    addStoryBullet(bullets, assistStory);
  }

  if (bullets.length < 2) {
    addStoryBullet(bullets, `${winner.name} beat ${loser.name} ${winnerScore}-${loserScore}`);
  }

  return bullets.slice(0, 2);
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

function ordinalNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "";
  }

  const lastTwo = number % 100;
  const suffix = lastTwo >= 11 && lastTwo <= 13
    ? "th"
    : number % 10 === 1
      ? "st"
      : number % 10 === 2
        ? "nd"
        : number % 10 === 3
          ? "rd"
          : "th";
  return `${number}${suffix}`;
}

function goalMinuteWords(goal) {
  if (!Number.isFinite(Number(goal?.minute))) {
    return "";
  }
  const minute = Number.isFinite(Number(goal.offset))
    ? `${goal.minute}+${goal.offset}`
    : ordinalNumber(goal.minute);
  return `in the ${minute} minute`;
}

function goalSetup(goal) {
  const timing = goalMinuteWords(goal);
  if (goal.ownGoal) {
    return `A ${formatGoalMinute(goal)} own goal`;
  }
  if (goal.penalty) {
    return `${goal.name} converted a penalty ${timing}`;
  }
  if (goal.assistName) {
    return `${goal.assistName} set up ${goal.name} for a finish ${timing}`;
  }
  return `${goal.name} struck ${timing}`;
}

function detailedGoalText(goal, scoreBefore, scoreAfter) {
  const teamName = goal.team?.name || "";
  const opponentSide = otherSide(goal.side);
  const setup = goalSetup(goal);
  if (goal.ownGoal) {
    if (scoreAfter.home === scoreAfter.away) {
      return `${setup} brought ${teamName} level at ${scoreAfter.home}-${scoreAfter.away}`;
    }
    if (scoreBefore.home === scoreBefore.away) {
      return `${setup} gave ${teamName} the lead`;
    }
    return `${setup} changed the score to ${scoreAfter.home}-${scoreAfter.away}`;
  }
  if (scoreAfter.home === scoreAfter.away) {
    return `${setup}, bringing ${teamName} level at ${scoreAfter.home}-${scoreAfter.away}`;
  }
  if (scoreBefore.home === scoreBefore.away) {
    if (Number(goal.minute) <= 10) {
      return `${setup}, giving ${teamName} a fast start`;
    }
    if (Number(goal.minute) >= 75 && scoreBefore.home + scoreBefore.away === 0) {
      return `${setup}, finally breaking the deadlock for ${teamName}`;
    }
    if (scoreBefore.home + scoreBefore.away > 0) {
      return `${setup}, swinging the match ${possessiveName(teamName)} way at ${scoreAfter.home}-${scoreAfter.away}`;
    }
    return `${setup}, putting ${teamName} in front`;
  }
  if (scoreBefore[goal.side] < scoreBefore[opponentSide]) {
    return `${setup}, cutting ${possessiveName(teamName)} deficit to ${scoreAfter.home}-${scoreAfter.away}`;
  }
  if (scoreAfter[goal.side] - scoreAfter[opponentSide] === 2) {
    return `${setup}, doubling ${possessiveName(teamName)} lead`;
  }
  return `${setup}, stretching ${possessiveName(teamName)} lead to ${scoreAfter.home}-${scoreAfter.away}`;
}

function detailedGoalRows(goals) {
  const score = { home: 0, away: 0 };
  return goals.map((goal) => {
    const before = { ...score };
    score[goal.side] += 1;
    const after = { ...score };
    return {
      goal,
      text: detailedGoalText(goal, before, after),
      before,
      after
    };
  });
}

function currentMatchEvents(fixture) {
  const rows = [];
  for (const side of ["home", "away"]) {
    const teamId = side === "home" ? fixture.homeTeamId : fixture.awayTeamId;
    const teamName = side === "home" ? fixture.homeSlot : fixture.awaySlot;
    for (const card of fixture.matchEvents?.[side]?.cards || []) {
      rows.push({ ...card, side, teamId, teamName, kind: "card" });
    }
    for (const substitution of fixture.matchEvents?.[side]?.substitutions || []) {
      rows.push({ ...substitution, side, teamId, teamName, kind: "substitution" });
    }
  }
  return rows;
}

function detailedTextureBullet(fixture, teamsById, goals) {
  const events = currentMatchEvents(fixture);
  const reds = events.filter((event) => event.kind === "card" && event.type === "red");
  if (reds.length) {
    const details = reds.map((event) => {
      const team = getFixtureTeam(fixture, teamsById, event.side)?.name || event.teamId;
      const minute = String(event.minute).includes("+") ? event.minute : ordinalNumber(event.minute);
      return `${event.playerName} for ${team} in the ${minute} minute`;
    });
    return `${formatNameList(details)} ${reds.length === 1 ? "was" : "were"} sent off`;
  }

  const scorerSubs = events.filter((event) =>
    event.kind === "substitution" && goals.some((goal) => !goal.ownGoal && goal.name === event.onName)
  );
  if (scorerSubs.length) {
    const event = scorerSubs[0];
    const goal = goals.find((row) => !row.ownGoal && row.name === event.onName);
    const entry = event.minute === "HT" ? "at halftime" : `in the ${ordinalNumber(event.minute)} minute`;
    return `${event.onName} came on ${entry} and scored ${goalMinuteWords(goal)}`;
  }

  const topAssist = assistCounts(goals, goals.at(-1)?.side);
  if (topAssist?.[1]?.length >= 2) {
    const teamName = teamForSide(teamsById, fixture, goals.at(-1).side)?.name || "";
    return `${topAssist[0]} created ${topAssist[1].length} of ${possessiveName(teamName)} goals`;
  }

  return "";
}

function cleanResultContext(fixture) {
  const context = (fixture.resultHighlights || [])
    .filter((item) => /^\s*📊/u.test(String(item || "")) || /\bGroup [A-L]\b/i.test(String(item || "")))
    .map((item) => String(item || "").replace(/^[^\p{L}\p{N}]+/u, "").trim())
    .find(Boolean);
  return context || "";
}

function middleGoalStory(rows, fixture, teamsById) {
  const middle = rows.slice(1, -1);
  if (!middle.length) {
    return "";
  }
  if (middle.length === 1) {
    return middle[0].text;
  }

  const scorerGroups = new Map();
  for (const row of middle) {
    if (row.goal.ownGoal) {
      continue;
    }
    const list = scorerGroups.get(row.goal.name) || [];
    list.push(row);
    scorerGroups.set(row.goal.name, list);
  }
  const repeatScorer = [...scorerGroups.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (repeatScorer?.[1]?.length >= 2) {
    const [name, scorerRows] = repeatScorer;
    const teamName = teamForSide(teamsById, fixture, scorerRows[0].goal.side)?.name || "his team";
    const minutes = formatNameList(scorerRows.map((row) => formatGoalMinute(row.goal)));
    const lastScorerRow = scorerRows.at(-1);
    return `${name} struck at ${minutes}, driving ${teamName} to a ${lastScorerRow.after.home}-${lastScorerRow.after.away} lead`;
  }

  const first = middle[0];
  const last = middle.at(-1);
  const equalizer = middle.find((row) => row.after.home === row.after.away);
  if (equalizer) {
    const answer = middle[middle.indexOf(equalizer) + 1];
    if (answer) {
      const answerTeam = answer.goal.team?.name || "their team";
      return `${goalScorerLabel(equalizer.goal)} levelled at ${formatGoalMinute(equalizer.goal)}, but ${goalScorerLabel(answer.goal, { sentenceStart: false })} restored ${possessiveName(answerTeam)} lead at ${formatGoalMinute(answer.goal)}`;
    }
    return equalizer.text;
  }
  const firstMoment = first.goal.ownGoal
    ? `an own goal arrived at ${formatGoalMinute(first.goal)}`
    : `${first.goal.name} struck at ${formatGoalMinute(first.goal)}`;
  const lastMoment = last.goal.ownGoal
    ? `an own goal followed at ${formatGoalMinute(last.goal)}`
    : `${last.goal.name} answered at ${formatGoalMinute(last.goal)}`;
  return `${firstMoment} and ${lastMoment}, moving the score from ${rows[0].after.home}-${rows[0].after.away} to ${last.after.home}-${last.after.away}`;
}

function oneGoalTextureBullet(fixture, teamsById, goal) {
  if (!goal) {
    return "";
  }
  const score = { home: scoreNumber(fixture.score?.home), away: scoreNumber(fixture.score?.away) };
  const side = winnerSide(score);
  if (!side) {
    return "";
  }
  const winner = getFixtureTeam(fixture, teamsById, side)?.name || "The winner";
  const loser = getFixtureTeam(fixture, teamsById, otherSide(side))?.name || "the opposition";
  const minute = Number(goal.minute);
  if (minute >= 90) {
    return `${goalScorerLabel(goal)} struck in stoppage time, leaving ${loser} no time to answer`;
  }
  return `${winner} protected the lead for the remaining ${Math.max(0, 90 - minute)} minutes and kept ${loser} scoreless`;
}

function knockoutResultContext(fixture, teamsById) {
  const score = { home: scoreNumber(fixture.score?.home), away: scoreNumber(fixture.score?.away) };
  const side = winnerSide(score);
  if (!side) {
    return "";
  }
  const winner = getFixtureTeam(fixture, teamsById, side)?.name || "The winner";
  const scoreText = side === "home" ? `${score.home}-${score.away}` : `${score.away}-${score.home}`;
  const round = String(fixture.round || "").toLowerCase();
  const nextRound = round.includes("round-of-32") ? "last 16"
    : round.includes("round-of-16") ? "quarter-finals"
      : round.includes("quarter") ? "semi-finals"
        : round.includes("semi") ? "final"
          : "next round";
  return `${winner} carried the ${scoreText} result into the ${nextRound}`;
}

function detailedShootoutStoryBullets(fixture, teamsById, goals) {
  const bullets = goals.length ? buildDetailedCurrentStoryBullets({ ...fixture, scoreDetails: undefined }, teamsById) : scorelessStoryBullets(fixture, teamsById);
  const winnerSideValue = penaltyWinnerSide(fixture, teamsById);
  const winner = getFixtureTeam(fixture, teamsById, winnerSideValue)?.name || "The winner";
  const penaltyScore = scorePairForSide(fixture.scoreDetails?.penalties, winnerSideValue);
  const regulationScore = `${fixture.score.home}-${fixture.score.away}`;
  const shootoutLine = penaltyScore
    ? `${winner} took the shootout ${penaltyScore} after the ${regulationScore} match stayed level through extra time`
    : `${winner} advanced on penalties after the ${regulationScore} match stayed level through extra time`;
  return [...bullets.slice(0, 2), withPeriod(shootoutLine)].slice(0, 3);
}

function scorelessStoryBullets(fixture, teamsById) {
  const home = getFixtureTeam(fixture, teamsById, "home");
  const away = getFixtureTeam(fixture, teamsById, "away");
  const homeFormation = fixture.matchEvents?.home?.formation;
  const awayFormation = fixture.matchEvents?.away?.formation;
  const bullets = [];
  addStoryBullet(
    bullets,
    homeFormation && awayFormation
      ? `${possessiveName(home.name)} ${homeFormation} and ${possessiveName(away.name)} ${awayFormation} cancelled each other out through halftime`
      : `${home.name} and ${away.name} reached halftime without a breakthrough`
  );

  const substitutions = currentMatchEvents(fixture)
    .filter((event) => event.kind === "substitution" && Number.isFinite(Number(event.minute)))
    .sort((a, b) => Number(a.minute) - Number(b.minute));
  if (substitutions.length) {
    const first = substitutions[0];
    const simultaneous = substitutions.filter(
      (event) => Number(event.minute) === Number(first.minute) && event.side === first.side
    );
    const team = getFixtureTeam(fixture, teamsById, first.side)?.name || first.teamId;
    addStoryBullet(
      bullets,
      simultaneous.length > 1
        ? `${team} made ${simultaneous.length} changes in the ${ordinalNumber(first.minute)} minute, including ${first.onName}, but the score stayed 0-0`
        : `${team} sent on ${first.onName} in the ${ordinalNumber(first.minute)} minute, but the score stayed 0-0`
    );
  }

  addStoryBullet(bullets, cleanResultContext(fixture) || `Neither side found a goal, leaving the match at 0-0`);
  return bullets.slice(0, 3);
}

function buildDetailedCurrentStoryBullets(fixture, teamsById) {
  const goals = goalEvents(fixture, teamsById);
  if (fixture.scoreDetails?.penalties) {
    return detailedShootoutStoryBullets(fixture, teamsById, goals);
  }
  if (!goals.length) {
    return scorelessStoryBullets(fixture, teamsById);
  }

  const rows = detailedGoalRows(goals);
  const bullets = [];
  if (rows.length <= 3) {
    for (const row of rows) {
      addStoryBullet(bullets, row.text);
    }
  } else {
    addStoryBullet(bullets, rows[0].text);
    addStoryBullet(bullets, middleGoalStory(rows, fixture, teamsById));
    addStoryBullet(bullets, rows.at(-1).text);
  }

  const texture = detailedTextureBullet(fixture, teamsById, goals);
  if (bullets.length < 3 && texture) {
    addStoryBullet(bullets, texture);
  }
  if (bullets.length < 3 && goals.length === 1) {
    addStoryBullet(bullets, oneGoalTextureBullet(fixture, teamsById, goals[0]));
  }
  if (bullets.length < 3) {
    addStoryBullet(bullets, cleanResultContext(fixture) || knockoutResultContext(fixture, teamsById));
  }
  return bullets.slice(0, 3);
}

function zhTeamName(fixture, teamsById, side) {
  const teamId = side === "home" ? fixture.homeTeamId : fixture.awayTeamId;
  return ZH_TEAM_NAMES[teamId] || getFixtureTeam(fixture, teamsById, side)?.name || teamId || "";
}

function zhPlayerName(name) {
  return ZH_PLAYER_NAME_TRANSLATIONS[name] || name || "";
}

function zhGoalMinute(goal) {
  if (!Number.isFinite(Number(goal?.minute))) {
    return "";
  }
  const offset = Number.isFinite(Number(goal.offset)) ? `+${goal.offset}` : "";
  return `第${goal.minute}${offset}分钟`;
}

function zhGoalStory(goal, teamName, kind) {
  const minute = zhGoalMinute(goal);
  const timing = minute ? `${minute}` : "";
  if (goal.ownGoal) {
    const ownGoal = timing ? `${timing}的乌龙球` : "乌龙球";
    if (kind === "opening") {
      return `${ownGoal}让${teamName}首开纪录`;
    }
    if (kind === "equalizer") {
      return `${ownGoal}让${teamName}扳平比分`;
    }
    return `${ownGoal}成为${teamName}的最后一球`;
  }

  const player = zhPlayerName(goal.name);
  if (kind === "opening") {
    return `${player}${timing ? `在${timing}` : ""}为${teamName}首开纪录`;
  }
  if (kind === "equalizer") {
    return `${player}${timing ? `在${timing}` : ""}为${teamName}扳平比分`;
  }
  return `${player}${timing ? `在${timing}` : ""}打进${teamName}的最后一球`;
}

function addZhStoryBullet(bullets, text) {
  const sentence = String(text || "").replace(/[。.!?]+$/, "").trim();
  if (!sentence || sentence.length > 159 || bullets.includes(`${sentence}。`)) {
    return;
  }
  bullets.push(`${sentence}。`);
}

function buildStoryBulletsZh(fixture, teamsById) {
  const score = {
    home: scoreNumber(fixture.score.home),
    away: scoreNumber(fixture.score.away)
  };
  const side = winnerSide(score);
  const goals = goalEvents(fixture, teamsById);
  const homeName = zhTeamName(fixture, teamsById, "home");
  const awayName = zhTeamName(fixture, teamsById, "away");
  const bullets = [];
  const shootoutSide = !side ? penaltyWinnerSide(fixture, teamsById) : "";

  if (shootoutSide) {
    const firstGoal = goals[0];
    const lastGoal = goals.at(-1);
    if (firstGoal) {
      addZhStoryBullet(bullets, zhGoalStory(firstGoal, zhTeamName(fixture, teamsById, firstGoal.side), "opening"));
    }
    if (lastGoal && lastGoal !== firstGoal && lastGoal.side !== firstGoal?.side) {
      addZhStoryBullet(bullets, zhGoalStory(lastGoal, zhTeamName(fixture, teamsById, lastGoal.side), "equalizer"));
    }
    const winnerName = zhTeamName(fixture, teamsById, shootoutSide);
    const penaltyScore = scorePairForSide(fixture.scoreDetails?.penalties, shootoutSide).replace("-", "比");
    addZhStoryBullet(
      bullets,
      penaltyScore ? `${winnerName}在点球大战中以${penaltyScore}获胜` : `${winnerName}通过点球大战晋级`
    );
    return bullets.slice(0, 3);
  }

  if (!side) {
    if (!goals.length) {
      addZhStoryBullet(bullets, `${homeName}与${awayName}以${score.home}比${score.away}战平`);
      return bullets;
    }
    const firstGoal = goals[0];
    const lastGoal = goals.at(-1);
    addZhStoryBullet(bullets, zhGoalStory(firstGoal, zhTeamName(fixture, teamsById, firstGoal.side), "opening"));
    if (lastGoal && lastGoal !== firstGoal) {
      addZhStoryBullet(bullets, zhGoalStory(lastGoal, zhTeamName(fixture, teamsById, lastGoal.side), "equalizer"));
    }
    if (bullets.length < 2) {
      addZhStoryBullet(bullets, `${homeName}与${awayName}以${score.home}比${score.away}战平`);
    }
    return bullets.slice(0, 2);
  }

  const winnerName = zhTeamName(fixture, teamsById, side);
  const loserSide = otherSide(side);
  const loserName = zhTeamName(fixture, teamsById, loserSide);
  const winnerScore = side === "home" ? score.home : score.away;
  const loserScore = side === "home" ? score.away : score.home;
  const firstGoal = goals[0];
  const lastWinnerGoal = lastGoalForSide(goals, side);

  if (firstGoal) {
    addZhStoryBullet(bullets, zhGoalStory(firstGoal, zhTeamName(fixture, teamsById, firstGoal.side), "opening"));
  }
  if (lastWinnerGoal && lastWinnerGoal !== firstGoal) {
    addZhStoryBullet(bullets, zhGoalStory(lastWinnerGoal, winnerName, "final"));
  }
  addZhStoryBullet(bullets, `${winnerName}以${winnerScore}比${loserScore}击败${loserName}`);

  return bullets.slice(0, 3);
}

function zhGoalAction(goal) {
  const minute = zhGoalMinute(goal);
  if (goal.ownGoal) {
    return `${minute || "比赛中"}出现乌龙球`;
  }
  const player = zhPlayerName(goal.name);
  if (goal.penalty) {
    return `${player}${minute ? `在${minute}` : ""}罚入点球`;
  }
  if (goal.assistName) {
    return `${zhPlayerName(goal.assistName)}助攻${player}${minute ? `在${minute}` : ""}破门`;
  }
  return `${player}${minute ? `在${minute}` : ""}破门`;
}

function zhGoalOutcome(goal, scoreBefore, scoreAfter, fixture, teamsById) {
  const teamName = zhTeamName(fixture, teamsById, goal.side);
  const opponentSide = otherSide(goal.side);
  if (scoreAfter.home === scoreAfter.away) {
    return `帮助${teamName}扳平比分`;
  }
  if (scoreBefore.home === scoreBefore.away) {
    return `让${teamName}取得领先`;
  }
  if (scoreBefore[goal.side] < scoreBefore[opponentSide]) {
    return `帮助${teamName}缩小差距`;
  }
  if (scoreAfter[goal.side] - scoreAfter[opponentSide] === 2) {
    return `将${teamName}的领先优势扩大到两球`;
  }
  return `把比分改写为${scoreAfter.home}比${scoreAfter.away}`;
}

function detailedZhGoalRows(fixture, teamsById, goals) {
  const score = { home: 0, away: 0 };
  return goals.map((goal) => {
    const before = { ...score };
    score[goal.side] += 1;
    const after = { ...score };
    return {
      goal,
      before,
      after,
      text: `${zhGoalAction(goal)}，${zhGoalOutcome(goal, before, after, fixture, teamsById)}`
    };
  });
}

function detailedZhTextureBullet(fixture, teamsById, goals) {
  const events = currentMatchEvents(fixture);
  const reds = events.filter((event) => event.kind === "card" && event.type === "red");
  if (reds.length) {
    const details = reds.map((event) => {
      const team = zhTeamName(fixture, teamsById, event.side);
      return `${team}的${zhPlayerName(event.playerName)}在第${event.minute}分钟`;
    });
    return `${details.join("，")}被罚下`;
  }

  const scorerSub = events.find((event) =>
    event.kind === "substitution" && goals.some((goal) => !goal.ownGoal && goal.name === event.onName)
  );
  if (scorerSub) {
    const goal = goals.find((row) => !row.ownGoal && row.name === scorerSub.onName);
    return `${zhPlayerName(scorerSub.onName)}在第${scorerSub.minute}分钟替补登场，并${zhGoalMinute(goal) ? `在${zhGoalMinute(goal)}` : "随后"}破门`;
  }

  const topAssist = assistCounts(goals, goals.at(-1)?.side);
  if (topAssist?.[1]?.length >= 2) {
    const teamName = zhTeamName(fixture, teamsById, goals.at(-1).side);
    return `${zhPlayerName(topAssist[0])}为${teamName}的${topAssist[1].length}个进球送出助攻`;
  }
  return "";
}

function zhScorelessStoryBullets(fixture, teamsById) {
  const homeName = zhTeamName(fixture, teamsById, "home");
  const awayName = zhTeamName(fixture, teamsById, "away");
  const homeFormation = fixture.matchEvents?.home?.formation;
  const awayFormation = fixture.matchEvents?.away?.formation;
  const bullets = [];
  addZhStoryBullet(
    bullets,
    homeFormation && awayFormation
      ? `${homeName}的${homeFormation}阵型与${awayName}的${awayFormation}阵型在上半场相互抵消`
      : `${homeName}与${awayName}在上半场均未能打破僵局`
  );
  const substitutions = currentMatchEvents(fixture)
    .filter((event) => event.kind === "substitution" && Number.isFinite(Number(event.minute)))
    .sort((a, b) => Number(a.minute) - Number(b.minute));
  const substitution = substitutions[0];
  if (substitution) {
    const simultaneous = substitutions.filter(
      (event) => Number(event.minute) === Number(substitution.minute) && event.side === substitution.side
    );
    const teamName = zhTeamName(fixture, teamsById, substitution.side);
    addZhStoryBullet(
      bullets,
      simultaneous.length > 1
        ? `${teamName}在第${substitution.minute}分钟同时换上${simultaneous.length}人，其中包括${zhPlayerName(substitution.onName)}，但比分仍是0比0`
        : `${teamName}在第${substitution.minute}分钟换上${zhPlayerName(substitution.onName)}，但比分仍是0比0`
    );
  }
  addZhStoryBullet(bullets, `${homeName}与${awayName}最终0比0战平`);
  return bullets.slice(0, 3);
}

function zhKnockoutResultContext(fixture, teamsById) {
  const score = { home: scoreNumber(fixture.score?.home), away: scoreNumber(fixture.score?.away) };
  const side = winnerSide(score);
  if (!side) {
    return "";
  }
  const winner = zhTeamName(fixture, teamsById, side);
  const scoreText = side === "home" ? `${score.home}比${score.away}` : `${score.away}比${score.home}`;
  const round = String(fixture.round || "").toLowerCase();
  const nextRound = round.includes("round-of-32") ? "16强"
    : round.includes("round-of-16") ? "八强"
      : round.includes("quarter") ? "半决赛"
        : round.includes("semi") ? "决赛"
          : "下一轮";
  return `${winner}以${scoreText}晋级${nextRound}`;
}

function zhGroupResultContext(fixture, teamsById) {
  const score = { home: scoreNumber(fixture.score?.home), away: scoreNumber(fixture.score?.away) };
  const side = winnerSide(score);
  if (!side) {
    return `${zhTeamName(fixture, teamsById, "home")}与${zhTeamName(fixture, teamsById, "away")}各取一分`;
  }
  return `${zhTeamName(fixture, teamsById, side)}凭借这场胜利拿到三分`;
}

function detailedZhShootoutStoryBullets(fixture, teamsById, goals) {
  const bullets = goals.length
    ? buildDetailedCurrentStoryBulletsZh({ ...fixture, scoreDetails: undefined }, teamsById)
    : zhScorelessStoryBullets(fixture, teamsById);
  const winnerSideValue = penaltyWinnerSide(fixture, teamsById);
  const winner = zhTeamName(fixture, teamsById, winnerSideValue);
  const penaltyScore = scorePairForSide(fixture.scoreDetails?.penalties, winnerSideValue).replace("-", "比");
  const regulationScore = `${fixture.score.home}比${fixture.score.away}`;
  const shootoutLine = penaltyScore
    ? `加时赛后仍是${regulationScore}，${winner}在点球大战中以${penaltyScore}获胜`
    : `加时赛后仍是${regulationScore}，${winner}通过点球大战晋级`;
  return [...bullets.slice(0, 2), `${shootoutLine}。`].slice(0, 3);
}

function middleZhGoalStory(rows, fixture, teamsById) {
  const middle = rows.slice(1, -1);
  if (!middle.length) {
    return "";
  }
  if (middle.length === 1) {
    return middle[0].text;
  }

  const scorerGroups = new Map();
  for (const row of middle) {
    if (row.goal.ownGoal) {
      continue;
    }
    const list = scorerGroups.get(row.goal.name) || [];
    list.push(row);
    scorerGroups.set(row.goal.name, list);
  }
  const repeatScorer = [...scorerGroups.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (repeatScorer?.[1]?.length >= 2) {
    const [name, scorerRows] = repeatScorer;
    const lastScorerRow = scorerRows.at(-1);
    const teamName = zhTeamName(fixture, teamsById, scorerRows[0].goal.side);
    const minutes = scorerRows.map((row) => zhGoalMinute(row.goal)).join("和");
    return `${zhPlayerName(name)}在${minutes}连续破门，帮助${teamName}将比分拉开到${lastScorerRow.after.home}比${lastScorerRow.after.away}`;
  }

  const equalizer = middle.find((row) => row.after.home === row.after.away);
  if (equalizer) {
    const answer = middle[middle.indexOf(equalizer) + 1];
    if (answer) {
      const answerTeam = zhTeamName(fixture, teamsById, answer.goal.side);
      return `${zhPlayerName(equalizer.goal.name)}在${zhGoalMinute(equalizer.goal)}扳平比分，但${zhPlayerName(answer.goal.name)}在${zhGoalMinute(answer.goal)}帮助${answerTeam}再次领先`;
    }
    return equalizer.text;
  }

  const first = middle[0];
  const last = middle.at(-1);
  const firstName = first.goal.ownGoal ? `${zhGoalMinute(first.goal)}的乌龙球` : zhPlayerName(first.goal.name);
  const lastName = last.goal.ownGoal ? `${zhGoalMinute(last.goal)}的乌龙球` : zhPlayerName(last.goal.name);
  return `${firstName}与${lastName}分别在${zhGoalMinute(first.goal)}和${zhGoalMinute(last.goal)}破门，比分从${rows[0].after.home}比${rows[0].after.away}来到${last.after.home}比${last.after.away}`;
}

function oneGoalZhTextureBullet(fixture, teamsById, goal) {
  const score = { home: scoreNumber(fixture.score?.home), away: scoreNumber(fixture.score?.away) };
  const side = winnerSide(score);
  if (!side) {
    return "";
  }
  const winner = zhTeamName(fixture, teamsById, side);
  const loser = zhTeamName(fixture, teamsById, otherSide(side));
  const minute = Number(goal?.minute);
  if (minute >= 90) {
    return `${zhPlayerName(goal.name)}在补时阶段破门，没有给${loser}留下回应时间`;
  }
  return `${winner}在余下${Math.max(0, 90 - minute)}分钟守住领先，并零封${loser}`;
}

function buildDetailedCurrentStoryBulletsZh(fixture, teamsById) {
  const goals = goalEvents(fixture, teamsById);
  if (fixture.scoreDetails?.penalties) {
    return detailedZhShootoutStoryBullets(fixture, teamsById, goals);
  }
  if (!goals.length) {
    return zhScorelessStoryBullets(fixture, teamsById);
  }

  const rows = detailedZhGoalRows(fixture, teamsById, goals);
  const bullets = [];
  if (rows.length <= 3) {
    for (const row of rows) {
      addZhStoryBullet(bullets, row.text);
    }
  } else {
    addZhStoryBullet(bullets, rows[0].text);
    addZhStoryBullet(bullets, middleZhGoalStory(rows, fixture, teamsById));
    addZhStoryBullet(bullets, rows.at(-1).text);
  }

  const texture = detailedZhTextureBullet(fixture, teamsById, goals);
  if (bullets.length < 3 && texture) {
    addZhStoryBullet(bullets, texture);
  }
  if (bullets.length < 3 && goals.length === 1) {
    addZhStoryBullet(bullets, oneGoalZhTextureBullet(fixture, teamsById, goals[0]));
  }
  if (bullets.length < 3) {
    addZhStoryBullet(
      bullets,
      isGroupResultFixture(fixture)
        ? zhGroupResultContext(fixture, teamsById)
        : zhKnockoutResultContext(fixture, teamsById)
    );
  }
  return bullets.slice(0, 3);
}

function hasGeneratedCurrentStoryBullets(fixture) {
  return (fixture.resultStoryBullets || []).some((bullet) =>
    /finished .+ pass in the|set up .+ for a finish|struck (?:in|at) the?|supplied the middle goals|traded the middle blows|first attacking change|reached halftime without a breakthrough|score stayed 0-0|cancelled each other out through halftime|own goal,/i.test(String(bullet || ""))
  );
}

function alignChineseStoryBullets(fixture, bullets) {
  const target = Math.min(3, Math.max(1, fixture.resultStoryBullets?.length || bullets.length || 1));
  if (bullets.length < target) {
    throw new Error(
      `Structured Chinese story for ${fixture.id} has ${bullets.length} bullet(s); expected ${target}.`
    );
  }
  return bullets.slice(0, target);
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
let currentStoryResearchHeld = 0;
let currentZhStoryPopulated = 0;
let historicalStoryPopulated = 0;
let historicalStorySkipped = 0;

if (!currentStoriesOnly) {
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
}

for (const fixture of finishedFixtures) {
  const hasStoryBullets = Array.isArray(fixture.resultStoryBullets)
    ? fixture.resultStoryBullets.some((highlight) => typeof highlight === "string" && highlight.trim())
    : false;
  const hasZhStoryBullets = Array.isArray(fixture.resultStoryBulletsZh)
    ? fixture.resultStoryBulletsZh.some((highlight) => typeof highlight === "string" && highlight.trim())
    : false;

  if (!generateCurrentStories) {
    if (!hasStoryBullets) {
      currentStoryResearchHeld += 1;
    }
    storySkipped += 1;
    continue;
  }

  if (hasStoryBullets && !overwrite) {
    const needsDetailedRefresh =
      (refreshWeakStories && hasWeakCurrentStoryBullets(fixture)) ||
      (rebuildGeneratedCurrentStories && hasGeneratedCurrentStoryBullets(fixture));
    if (
      hasOutOfOrderStoryMinutes(fixture) ||
      needsDetailedRefresh ||
      (refreshWeakStories && needsShootoutTextureRefresh(fixture))
    ) {
      const existingBullets = fixture.resultStoryBullets.filter((highlight) => typeof highlight === "string" && highlight.trim());
      const strongExistingBullets = existingBullets.filter((highlight) => !isWeakCurrentStoryBullet(highlight));
      fixture.resultStoryBullets =
        needsDetailedRefresh
          ? buildDetailedCurrentStoryBullets(fixture, teamsById)
          : hasOutOfOrderStoryMinutes(fixture) || fixture.scoreDetails?.penalties || strongExistingBullets.length < 2
            ? buildDetailedCurrentStoryBullets(fixture, teamsById)
          : strongExistingBullets.slice(0, 3);
      fixture.resultStoryBulletsZh = buildDetailedCurrentStoryBulletsZh(fixture, teamsById);
      currentZhStoryPopulated += 1;
      storyPopulated += 1;
      continue;
    }

    if (!hasZhStoryBullets) {
      fixture.resultStoryBulletsZh = buildStoryBulletsZh(fixture, teamsById);
      currentZhStoryPopulated += 1;
      continue;
    }

    storySkipped += 1;
    continue;
  }

  fixture.resultStoryBullets = buildDetailedCurrentStoryBullets(fixture, teamsById);
  if (overwrite || !hasZhStoryBullets) {
    fixture.resultStoryBulletsZh = buildDetailedCurrentStoryBulletsZh(fixture, teamsById);
    currentZhStoryPopulated += 1;
  }
  storyPopulated += 1;
}

if (syncChineseStories) {
  for (const fixture of finishedFixtures) {
    const existing = Array.isArray(fixture.resultStoryBulletsZh)
      ? fixture.resultStoryBulletsZh.filter((bullet) => typeof bullet === "string" && bullet.trim())
      : [];
    const targetCount = Math.min(3, Math.max(1, fixture.resultStoryBullets?.length || 1));
    const needsStructuredSync =
      existing.length !== targetCount || existing.some((bullet) => weakChineseCurrentStoryPattern.test(bullet));
    if (!needsStructuredSync) {
      continue;
    }
    const next = alignChineseStoryBullets(fixture, buildDetailedCurrentStoryBulletsZh(fixture, teamsById));
    if (JSON.stringify(existing) === JSON.stringify(next)) {
      continue;
    }
    fixture.resultStoryBulletsZh = next;
    currentZhStoryPopulated += 1;
  }
}

for (const fixture of finishedHistoricalFixtures) {
  const hasStoryBullets = Array.isArray(fixture.resultStoryBullets)
    ? fixture.resultStoryBullets.some((highlight) => typeof highlight === "string" && highlight.trim())
    : false;

  if (hasStoryBullets && !overwrite) {
    if (
      hasOutOfOrderStoryMinutes(fixture) ||
      (refreshWeakStories && (hasWeakStoryBullets(fixture) || needsShootoutTextureRefresh(fixture)))
    ) {
      const existingBullets = fixture.resultStoryBullets.filter((highlight) => typeof highlight === "string" && highlight.trim());
      const strongExistingBullets = existingBullets.filter((highlight) => !isWeakStoryBullet(highlight));
      fixture.resultStoryBullets =
        hasOutOfOrderStoryMinutes(fixture) || fixture.scoreDetails?.penalties || strongExistingBullets.length < 2
          ? buildStoryBullets(fixture, teamsById)
          : strongExistingBullets.slice(0, 3);
      historicalStoryPopulated += 1;
      continue;
    }

    historicalStorySkipped += 1;
    continue;
  }

  fixture.resultStoryBullets = buildStoryBullets(fixture, teamsById);
  historicalStoryPopulated += 1;
}

if (highlightPopulated || storyPopulated || currentZhStoryPopulated) {
  fixturesData.updatedAt = new Date().toISOString();
  if (!dryRun) {
    await writeFile(fixturesPath, `${JSON.stringify(fixturesData, null, 2)}\n`);
  }
}

if (historicalStoryPopulated) {
  historyData.updatedAt = new Date().toISOString();
  if (!dryRun) {
    await writeFile(historyPath, `${JSON.stringify(historyData, null, 2)}\n`);
  }
}

console.log(
  `${dryRun ? "Would populate" : overwrite ? "Wrote" : refreshGeneric ? "Refreshed" : "Populated"} ${highlightPopulated} result highlight set${highlightPopulated === 1 ? "" : "s"} and ${storyPopulated} current story bullet set${storyPopulated === 1 ? "" : "s"}; skipped ${highlightSkipped} highlight set${highlightSkipped === 1 ? "" : "s"} and ${storySkipped} current story bullet set${storySkipped === 1 ? "" : "s"}.`
);
console.log(
  `${dryRun ? "Would populate" : "Populated"} ${currentZhStoryPopulated} structured Chinese current story bullet set${currentZhStoryPopulated === 1 ? "" : "s"}.`
);
if (currentStoryResearchHeld) {
  console.log(
    `Held ${currentStoryResearchHeld} current story bullet set${currentStoryResearchHeld === 1 ? "" : "s"} for source-backed post-match research. Use --generate-current-stories only for a deliberate local backfill.`
  );
}
console.log(
  `${overwrite ? "Wrote" : "Populated"} ${historicalStoryPopulated} historical story bullet set${historicalStoryPopulated === 1 ? "" : "s"}; skipped ${historicalStorySkipped} historical story bullet set${historicalStorySkipped === 1 ? "" : "s"}.`
);
