#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const HIGHLIGHT_VIDEO_REVIEW_STATUSES = new Set(["not-found", "needs-review"]);
const weakCurrentStoryPattern =
  /\b(?:won the shootout \d+-\d+ after a \d+-\d+ draw|survived the shootout after a \d+-\d+ draw|exited after penalties kept|stayed close enough to keep the final minutes tense|stayed locked together until the final whistle|got the decisive details right in a match that stayed tight|closed the result without needing another late twist)\b/i;

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

function resultStoryBullets(fixture) {
  return Array.isArray(fixture.resultStoryBullets)
    ? fixture.resultStoryBullets.filter((highlight) => typeof highlight === "string" && highlight.trim())
    : [];
}

function weakCurrentStoryBullets(fixture) {
  return resultStoryBullets(fixture).filter((highlight) => weakCurrentStoryPattern.test(highlight));
}

function hasShootoutTextureStory(fixture) {
  return resultStoryBullets(fixture).some((highlight) => /^The \d+-\d+ grind .+ penalties\.$/.test(highlight));
}

function hasOfficialHighlightVideoDisposition(fixture) {
  if (fixture.highlightVideo && typeof fixture.highlightVideo === "object" && !Array.isArray(fixture.highlightVideo)) {
    return true;
  }

  const review = fixture.highlightVideoReview;
  return Boolean(
    review &&
      typeof review === "object" &&
      !Array.isArray(review) &&
      HIGHLIGHT_VIDEO_REVIEW_STATUSES.has(review.status) &&
      review.checkedAt
  );
}

function historicalGoalStoryTokens(fixture) {
  return [...(fixture.goalsHome || []), ...(fixture.goalsAway || [])]
    .map((goal) => (goal.ownGoal ? "own goal" : goal.name))
    .filter((name) => typeof name === "string" && name.trim());
}

function hasHistoricalGoalSpecificStory(fixture) {
  const tokens = historicalGoalStoryTokens(fixture);
  if (!tokens.length) {
    return true;
  }

  const story = resultStoryBullets(fixture).join(" ");
  return tokens.some((token) => story.includes(token));
}

function isGenericMoment(highlight) {
  return /Both clean sheets kept|Neither side pulled clear|The clean sheet gave|attack broke the match open|protected a one-goal edge|came through a tight one-goal match|created enough separation|made a statement with|found the decisive goal/i.test(
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
  if (
    fixture.status !== "FT" ||
    !fixture.homeTeamId ||
    !fixture.awayTeamId ||
    !teamsById.has(fixture.homeTeamId) ||
    !teamsById.has(fixture.awayTeamId)
  ) {
    continue;
  }

  checked += 1;
  const matchLabel = `${teamsById.get(fixture.homeTeamId)?.name || fixture.homeTeamId} vs ${teamsById.get(fixture.awayTeamId)?.name || fixture.awayTeamId}`;
  const total = scoreTotal(fixture);
  const highlights = [
    ...(Array.isArray(fixture.resultStoryBullets) ? fixture.resultStoryBullets : []),
    ...(Array.isArray(fixture.resultHighlights) ? fixture.resultHighlights : [])
  ];
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

  const weakStories = weakCurrentStoryBullets(fixture);
  if (weakStories.length) {
    issues.push(
      `${fixture.id} (${matchLabel}) has weak current result story copy: ${weakStories.join(" | ")}`
    );
  }

  if (fixture.scoreDetails?.penalties && !hasShootoutTextureStory(fixture)) {
    issues.push(`${fixture.id} (${matchLabel}) has a shootout recap without a match-texture story.`);
  }

  if (!hasOfficialHighlightVideoDisposition(fixture)) {
    issues.push(
      `${fixture.id} (${matchLabel}) has no official highlightVideo and no highlightVideoReview check.`
    );
  }
}

console.log(`Result enrichment audit checked ${checked} completed current fixture${checked === 1 ? "" : "s"}.`);

let historicalChecked = 0;
let historicalScoringChecked = 0;
for (const fixture of historyData.fixtures || []) {
  if (fixture.status !== "FT") {
    continue;
  }

  const total = scoreTotal(fixture);
  if (total === null) {
    continue;
  }

  historicalChecked += 1;

  const storyBullets = resultStoryBullets(fixture);
  if (!storyBullets.length) {
    issues.push(`${fixture.id} (${fixture.homeSlot} vs ${fixture.awaySlot}) has no historical result story bullets.`);
  }

  const weakStories = weakCurrentStoryBullets(fixture);
  if (weakStories.length) {
    issues.push(
      `${fixture.id} (${fixture.homeSlot} vs ${fixture.awaySlot}) has weak historical result story copy: ${weakStories.join(" | ")}`
    );
  }

  if (fixture.scoreDetails?.penalties && !hasShootoutTextureStory(fixture)) {
    issues.push(`${fixture.id} (${fixture.homeSlot} vs ${fixture.awaySlot}) has a historical shootout recap without a match-texture story.`);
  }

  if (total === 0) {
    continue;
  }

  historicalScoringChecked += 1;

  if (goalCount(fixture) !== total) {
    issues.push(
      `${fixture.id} (${fixture.homeSlot} vs ${fixture.awaySlot}) has ${goalCount(fixture)} historical goal event${goalCount(fixture) === 1 ? "" : "s"} for a ${fixture.score.home}-${fixture.score.away} score.`
    );
  }

  if (!hasHistoricalGoalSpecificStory(fixture)) {
    issues.push(
      `${fixture.id} (${fixture.homeSlot} vs ${fixture.awaySlot}) historical result story bullets do not mention a scorer or own goal.`
    );
  }
}

console.log(
  `Result enrichment audit checked ${historicalChecked} completed historical fixture${historicalChecked === 1 ? "" : "s"} (${historicalScoringChecked} with goals).`
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
