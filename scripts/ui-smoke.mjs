#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

let chromium;
const require = createRequire(import.meta.url);

try {
  ({ chromium } = require("playwright"));
} catch (error) {
  console.error("Playwright is required for UI smoke tests. Run npm install first.");
  console.error(error.message);
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"]
]);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function stripFlagEmoji(text) {
  return String(text || "").replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "");
}

function normalizeFlaggedText(text) {
  return stripFlagEmoji(text).replace(/\s+/g, " ").trim();
}

function getCssColorAlpha(colorText) {
  const match = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*([\d.]+))?\s*\)/.exec(colorText || "");
  return match ? Number(match[1] ?? 1) : 0;
}

async function getMatchRowMetaCollisionMetrics(pageInstance, rowSelector = ".match-row") {
  return pageInstance.locator(rowSelector).evaluateAll((rows) =>
    rows
      .map((row) => {
        const chips = Array.from(
          row.querySelectorAll(".match-row-meta .live-pill, .match-row-meta .up-next-pill, .match-row-meta .match-score, .match-row-meta .score-status")
        );

        if (!chips.length) {
          return null;
        }

        const textPieces = Array.from(
          row.querySelectorAll(".match-teams .flag, .match-teams .team-name, .match-teams .versus")
        );
        const toRect = (element) => {
          const rect = element.getBoundingClientRect();

          return {
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            text: element.textContent.replace(/\s+/g, " ").trim(),
            top: rect.top
          };
        };
        const chipRects = chips.map(toRect);
        const textRects = textPieces.map(toRect);
        const collisions = [];
        let minHorizontalGap = Number.POSITIVE_INFINITY;

        chipRects.forEach((chipRect) => {
          textRects.forEach((textRect) => {
            const verticalOverlap =
              Math.min(chipRect.bottom, textRect.bottom) - Math.max(chipRect.top, textRect.top);

            if (verticalOverlap <= 0.5) {
              return;
            }

            const horizontalGap =
              textRect.right <= chipRect.left
                ? chipRect.left - textRect.right
                : chipRect.right <= textRect.left
                  ? textRect.left - chipRect.right
                  : -Math.min(textRect.right, chipRect.right) + Math.max(textRect.left, chipRect.left);

            minHorizontalGap = Math.min(minHorizontalGap, horizontalGap);

            if (horizontalGap < -0.5) {
              collisions.push(`${textRect.text} / ${chipRect.text}`);
            }
          });
        });

        return {
          chipTexts: chipRects.map((rect) => rect.text),
          collisions,
          documentScrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          minHorizontalGap: Number.isFinite(minHorizontalGap) ? minHorizontalGap : null,
          rowScrollOverflow: row.scrollWidth - row.clientWidth,
          text: row.innerText.replace(/\s+/g, " ").trim()
        };
      })
      .filter(Boolean)
  );
}

function assertCleanMatchMetaLayout(metrics, message) {
  assert(
    metrics.length > 0 &&
      metrics.every(
        (metric) =>
          metric.collisions.length === 0 &&
          metric.rowScrollOverflow <= 1 &&
          (metric.minHorizontalGap === null || metric.minHorizontalGap >= 2)
      ),
    `${message} Measured ${JSON.stringify(metrics)}.`
  );
}

async function getMobileMatchupGridMetrics(pageInstance, fixtureId) {
  return pageInstance.locator(`[data-match-id="${fixtureId}"]`).evaluate((row) => {
    const rect = (selector) => {
      const element = row.querySelector(selector);
      const bounds = element?.getBoundingClientRect();

      return bounds
        ? {
            bottom: Math.round(bounds.bottom),
            center: Math.round(bounds.top + bounds.height / 2),
            height: Math.round(bounds.height),
            left: Math.round(bounds.left),
            right: Math.round(bounds.right),
            text: element.textContent.replace(/\s+/g, " ").trim(),
            top: Math.round(bounds.top),
            width: Math.round(bounds.width)
          }
        : null;
    };

    const meta = row.querySelector(".match-row-meta");
    const matchupRights = Array.from(
      row.querySelectorAll(".match-teams .flag, .match-teams .team-name, .match-teams .match-versus")
    ).map((element) => element.getBoundingClientRect().right);
    const matchupRight = Math.max(...matchupRights);

    return {
      away: rect(".match-team-away"),
      awayFlag: rect(".match-team-away .flag"),
      awayName: rect(".match-team-away .team-name"),
      rankCount: row.querySelectorAll(".match-teams .rank-pill").length,
      hasWrappedClass: row.classList.contains("has-wrapped-matchup"),
      home: rect(".match-team-home"),
      homeName: rect(".match-team-home .team-name"),
      meta: rect(".match-row-meta"),
      metaGapFromMatchup:
        meta && Number.isFinite(matchupRight)
          ? Math.round(meta.getBoundingClientRect().left - matchupRight)
          : null,
      rowScrollOverflow: row.scrollWidth - row.clientWidth,
      text: row.innerText.replace(/\s+/g, " ").trim(),
      versus: rect(".match-versus")
    };
  });
}

function assertCompactMobileMatchupGrid(metrics, message) {
  assert(
    metrics.hasWrappedClass &&
      metrics.home &&
      metrics.homeName &&
      metrics.away &&
      metrics.awayFlag &&
      metrics.awayName &&
      metrics.versus &&
      metrics.home.center < metrics.versus.center &&
      Math.abs(metrics.versus.center - metrics.awayFlag.center) <= 2 &&
      metrics.versus.right <= metrics.awayFlag.left + 1 &&
      metrics.homeName.right <= metrics.home.right + 1 &&
      metrics.awayName.right <= metrics.away.right + 1 &&
      metrics.rowScrollOverflow <= 1,
    `${message} Measured ${JSON.stringify(metrics)}.`
  );
}

function assertCompactOrComfortableMobileMatchup(metrics, message) {
  const hasCompactShape =
    metrics.hasWrappedClass &&
    metrics.home &&
    metrics.awayFlag &&
    metrics.versus &&
    metrics.home.center < metrics.versus.center &&
    Math.abs(metrics.versus.center - metrics.awayFlag.center) <= 2 &&
    metrics.versus.right <= metrics.awayFlag.left + 1;

  const hasComfortableInlineShape =
    !metrics.hasWrappedClass &&
    metrics.metaGapFromMatchup !== null &&
    metrics.metaGapFromMatchup >= 12 &&
    metrics.versus &&
    metrics.home &&
    metrics.away &&
    Math.abs(metrics.home.center - metrics.versus.center) <= 2 &&
    Math.abs(metrics.versus.center - metrics.away.center) <= 2;

  assert(
    (hasCompactShape || hasComfortableInlineShape) &&
      metrics.homeName &&
      metrics.awayName &&
      metrics.homeName.right <= metrics.home.right + 1 &&
      metrics.awayName.right <= metrics.away.right + 1 &&
      metrics.rowScrollOverflow <= 1,
    `${message} Measured ${JSON.stringify(metrics)}.`
  );
}

async function getHoveredMatchRowEdgeMetrics(pageInstance, rowSelector = ".match-row") {
  const rows = pageInstance.locator(rowSelector);
  const rowCount = await rows.count();
  const metrics = [];

  for (let index = 0; index < rowCount; index += 1) {
    const row = rows.nth(index);
    await row.hover();
    metrics.push(
      await row.evaluate((rowElement) => {
        const chips = Array.from(
          rowElement.querySelectorAll(
            ".match-row-meta .live-pill, .match-row-meta .up-next-pill, .match-row-meta .match-score, .match-row-meta .score-status"
          )
        );

        if (!chips.length) {
          return null;
        }

        const rowRect = rowElement.getBoundingClientRect();
        const layoutRect = rowElement.closest(".match-layout")?.getBoundingClientRect();
        const chipRects = chips.map((chip) => {
          const rect = chip.getBoundingClientRect();

          return {
            right: rect.right,
            text: chip.textContent.replace(/\s+/g, " ").trim()
          };
        });
        const rightmostChip = chipRects.reduce((rightmost, chip) =>
          !rightmost || chip.right > rightmost.right ? chip : rightmost
        );

        return {
          chipTexts: chipRects.map((chip) => chip.text),
          layoutRightGap: layoutRect ? layoutRect.right - rightmostChip.right : 0,
          rightmostChipText: rightmostChip.text,
          rowRightGap: rowRect.right - rightmostChip.right,
          rowScrollOverflow: rowElement.scrollWidth - rowElement.clientWidth,
          scoreRightOverflow: layoutRect ? Math.max(0, rightmostChip.right - layoutRect.right) : 0,
          text: rowElement.innerText.replace(/\s+/g, " ").trim(),
          transform: getComputedStyle(rowElement).transform
        };
      })
    );
  }

  return metrics.filter(Boolean);
}

function assertCleanHoveredMatchRowEdges(metrics, message, options = {}) {
  const { expectNoTransform = false, minLayoutRightGap = -1 } = options;

  assert(
    metrics.length > 0 &&
      metrics.every(
        (metric) =>
          (!expectNoTransform || metric.transform === "none") &&
          metric.rowScrollOverflow <= 1 &&
          metric.scoreRightOverflow <= 1 &&
          metric.layoutRightGap >= minLayoutRightGap
      ),
    `${message} Measured ${JSON.stringify(metrics)}.`
  );
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const resolved = path.resolve(root, decoded === "/" ? "index.html" : `.${decoded}`);

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    return null;
  }

  return resolved;
}

const server = createServer(async (request, response) => {
  const filePath = safePath(request.url || "/");

  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Length": fileStat.size,
      "Content-Type": mimeTypes.get(path.extname(filePath)) || "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const fixturesData = JSON.parse(await readFile(path.join(root, "data/fixtures.json"), "utf8"));
const sourceNoteData = await Promise.all(
  [
    "fixtures.json",
    "history.json",
    "historical-player-profiles.json",
    "player-profiles.json",
    "release-notes.json",
    "teams.json",
    "standings.json",
    "tournament.json"
  ].map(async (fileName) => JSON.parse(await readFile(path.join(root, "data", fileName), "utf8")))
);
const [, , , , releaseNotesData, teamsData, standingsData, tournamentData] = sourceNoteData;
const sourceNoteRefreshData = sourceNoteData.filter((_, index) => index !== 4);
const fifaWorldCupScoresUrl =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures";
const matchLiveWindowMs = 2.25 * 60 * 60 * 1000;
const browser = await chromium.launch();
const page = await browser.newPage();
const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
const thirdPlaceStandingIndex = 2;
const expectedThirdPlaceAdvancementEstimateCache = new Map();
const expectedThirdPlaceGroupScenarioCache = new Map();
const expectedGroupThirdPlacePointFloorCache = new Map();
const expectedTeamGroupStageEliminationCache = new Map();
const expectedTeamMaximumGroupPointsCache = new Map();

function getTeam(teamId) {
  return teamsById.get(teamId) || {
    fifaRank: Number.POSITIVE_INFINITY,
    id: teamId,
    name: teamId,
    officialName: teamId
  };
}

function formatOrdinal(value) {
  const number = Number(value);
  const suffix =
    number % 100 >= 11 && number % 100 <= 13
      ? "th"
      : { 1: "st", 2: "nd", 3: "rd" }[number % 10] || "th";

  return `${number}${suffix}`;
}

function formatGoalDifference(goalDifference) {
  return goalDifference > 0 ? `+${goalDifference}` : String(goalDifference);
}

function formatStandingPoints(points) {
  return `${points} ${points === 1 ? "point" : "points"}`;
}

function formatGoalsScored(goals) {
  return `${goals} ${goals === 1 ? "goal" : "goals"} scored`;
}

function getThirdPlaceAdvancerCount() {
  const groupCount = tournamentData.groups?.length || 0;
  const configuredAdvancers = Number(tournamentData.format?.bestThirdPlaceAdvancers);

  return Number.isInteger(configuredAdvancers) && configuredAdvancers >= 0
    ? Math.min(configuredAdvancers, groupCount)
    : Math.min(8, groupCount);
}

function getTeamConductScore(row) {
  const value = row.teamConductScore ?? row.conductScore ?? row.fairPlayScore ?? row.fairPlayPoints;
  const score = Number(value);

  return Number.isFinite(score) ? score : null;
}

function getFifaRankValue(team) {
  const rank = Number(team.fifaRank);

  return Number.isFinite(rank) ? rank : Number.POSITIVE_INFINITY;
}

function isFixtureLive(fixture, currentTime = Date.now()) {
  if (fixture.status === "LIVE") {
    return true;
  }

  if (fixture.status !== "SCHEDULED" || !fixture.kickoffUtc) {
    return false;
  }

  const kickoffTime = new Date(fixture.kickoffUtc).getTime();
  return Number.isFinite(kickoffTime) && currentTime >= kickoffTime && currentTime < kickoffTime + matchLiveWindowMs;
}

function compareThirdPlaceCandidates(a, b) {
  const conductA = getTeamConductScore(a);
  const conductB = getTeamConductScore(b);

  return (
    b.pts - a.pts ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    (conductA !== null && conductB !== null ? conductB - conductA : 0) ||
    getFifaRankValue(a.team) - getFifaRankValue(b.team) ||
    a.groupIndex - b.groupIndex ||
    a.team.name.localeCompare(b.team.name)
  );
}

function getThirdPlaceTieSignature(row) {
  return `${row.pts}|${row.gd}|${row.gf}`;
}

function getExpectedThirdPlaceStatus(candidate, advancerCount) {
  const isInside = candidate.position <= advancerCount;

  return isInside
    ? { kind: "in", label: "Advancing", detail: "Advancing to Round of 32." }
    : { kind: "eliminated", label: "Eliminated", detail: "Eliminated at group stage." };
}

function annotateExpectedThirdPlaceRaceRows(rows, advancerCount) {
  const annotatedRows = rows.map((row, index) => ({
    ...row,
    isCutLineTie: false,
    isUnresolvedTie: false,
    position: index + 1,
    tieGroupEnd: index + 1,
    tieGroupStart: index + 1
  }));

  let index = 0;
  while (index < annotatedRows.length) {
    const signature = getThirdPlaceTieSignature(annotatedRows[index]);
    let endIndex = index + 1;

    while (
      endIndex < annotatedRows.length &&
      getThirdPlaceTieSignature(annotatedRows[endIndex]) === signature
    ) {
      endIndex += 1;
    }

    const tieGroup = annotatedRows.slice(index, endIndex);
    const hasMissingConduct = tieGroup.some((row) => getTeamConductScore(row) === null);
    const isUnresolvedTie = tieGroup.length > 1 && hasMissingConduct;
    const isCutLineTie = isUnresolvedTie && index < advancerCount && endIndex > advancerCount;

    for (let tieIndex = index; tieIndex < endIndex; tieIndex += 1) {
      annotatedRows[tieIndex].isCutLineTie = isCutLineTie;
      annotatedRows[tieIndex].isUnresolvedTie = isUnresolvedTie;
      annotatedRows[tieIndex].tieGroupStart = index + 1;
      annotatedRows[tieIndex].tieGroupEnd = endIndex;
    }

    index = endIndex;
  }

  return annotatedRows.map((row) => {
    const isEliminated = isExpectedTeamEliminatedFromGroupStage(row.teamId, row.groupId);
    const candidate = { ...row, isEliminated };
    const advancementEstimate = getExpectedThirdPlaceAdvancementEstimate(candidate);
    const candidateWithEstimate = { ...candidate, advancementEstimate };

    return {
      ...candidateWithEstimate,
      status: getExpectedThirdPlaceStatus(candidateWithEstimate, advancerCount)
    };
  });
}

function getExpectedThirdPlaceRaceRows() {
  const rows = (tournamentData.groups || [])
    .map((group, groupIndex) => {
      const row = standingsData.groups?.[group.id]?.[thirdPlaceStandingIndex];

      if (!row) {
        return null;
      }

      return {
        ...row,
        gd: row.gf - row.ga,
        gamesLeft: getExpectedRemainingTeamGroupFixtures(row.teamId, group.id).length,
        groupId: group.id,
        groupIndex,
        groupLabel: group.label || `Group ${group.id}`,
        pts: row.wins * 3 + row.draws,
        team: getTeam(row.teamId)
      };
    })
    .filter(Boolean)
    .sort(compareThirdPlaceCandidates);

  return annotateExpectedThirdPlaceRaceRows(rows, getThirdPlaceAdvancerCount());
}

function getExpectedThirdPlaceComparisonTarget(candidate, rows = getExpectedThirdPlaceRaceRows()) {
  if (rows.length <= 1) {
    return null;
  }

  const advancerCount = getThirdPlaceAdvancerCount();
  const targetIndex = candidate.position <= advancerCount ? advancerCount : advancerCount - 1;
  return rows[targetIndex] || null;
}

function getExpectedThirdPlaceComparisonDecider(candidate, target) {
  if (candidate.pts !== target.pts) {
    return {
      label: "points",
      candidateValue: formatStandingPoints(candidate.pts),
      targetValue: formatStandingPoints(target.pts)
    };
  }

  if (candidate.gd !== target.gd) {
    return {
      label: "goal difference",
      candidateValue: formatGoalDifference(candidate.gd),
      targetValue: formatGoalDifference(target.gd)
    };
  }

  if (candidate.gf !== target.gf) {
    return {
      label: "goals scored",
      candidateValue: String(candidate.gf),
      targetValue: String(target.gf)
    };
  }

  const candidateConduct = getTeamConductScore(candidate);
  const targetConduct = getTeamConductScore(target);
  if (candidateConduct !== null && targetConduct !== null && candidateConduct !== targetConduct) {
    return {
      label: "loaded fair-play conduct",
      candidateValue: String(candidateConduct),
      targetValue: String(targetConduct)
    };
  }

  const candidateRank = getFifaRankValue(candidate.team);
  const targetRank = getFifaRankValue(target.team);
  if (Number.isFinite(candidateRank) && Number.isFinite(targetRank) && candidateRank !== targetRank) {
    return {
      label: "FIFA ranking fallback",
      candidateValue: `#${candidateRank}`,
      targetValue: `#${targetRank}`
    };
  }

  return {
    label: "deterministic loaded order",
    candidateValue: formatOrdinal(candidate.position),
    targetValue: formatOrdinal(target.position)
  };
}

function formatExpectedThirdPlaceDeciderLabel(label) {
  const labels = {
    "FIFA ranking fallback": "FIFA ranking",
    "deterministic loaded order": "loaded order",
    "loaded fair-play conduct": "fair-play score"
  };
  return labels[label] || label;
}

function formatExpectedThirdPlaceShortComparison(decider) {
  const deciderLabel = formatExpectedThirdPlaceDeciderLabel(decider.label);
  const stripPointLabel = (value) => String(value).replace(/ points?$/, "");
  if (decider.label === "points") {
    return `points ${stripPointLabel(decider.candidateValue)}-${stripPointLabel(decider.targetValue)}`;
  }

  if (decider.label === "goals scored") {
    return `goals ${decider.candidateValue}-${decider.targetValue}`;
  }

  return `${deciderLabel} ${decider.candidateValue} vs ${decider.targetValue}`;
}

function formatExpectedThirdPlaceTooltipChanceLine(candidate) {
  const estimate = candidate.advancementEstimate;

  if (estimate?.displayPercent) {
    return `${estimate.displayPercent} to advance`;
  }

  return candidate.status?.label || "";
}

function getExpectedThirdPlaceTooltipSituationLine(candidate) {
  const estimate = candidate.advancementEstimate;
  const advancerCount = getThirdPlaceAdvancerCount();
  const probability = estimate?.probability;

  if (candidate.status?.kind === "eliminated" || candidate.isEliminated || probability <= 0) {
    return "No modeled route reaches the Round of 32 from here.";
  }

  if (Number.isFinite(probability) && probability >= 1) {
    return `Remaining matches can change ${candidate.team.name}'s Round of 32 opponent, but not whether they qualify.`;
  }

  if (candidate.isCutLineTie) {
    return `Top-8 place is tied from ${formatOrdinal(candidate.tieGroupStart)}-${formatOrdinal(candidate.tieGroupEnd)}; fair-play data is pending.`;
  }

  if (candidate.position <= advancerCount) {
    return Number.isFinite(probability) && probability >= 0.66
      ? "Most paths keep them inside the top 8."
      : "They are inside the top 8, but more groups can still catch them.";
  }

  return Number.isFinite(probability) && probability >= 0.45
    ? "They are just outside the top 8, but one swing can pull them in."
    : "They need help to climb into the top 8.";
}

function formatExpectedThirdPlaceShortPoints(points) {
  return `${points} pt${points === 1 ? "" : "s"}`;
}

function getExpectedFixtureSortValue(fixture) {
  if (fixture.sortKey) {
    return fixture.sortKey;
  }

  return fixture.kickoffUtc || `${fixture.date || ""}T12:00:00Z`;
}

function getExpectedThirdPlaceWatchOutcomeLabel(fixture, result) {
  if (Number(result.homeGoals) === Number(result.awayGoals)) {
    return "A draw";
  }

  const winner = Number(result.homeGoals) > Number(result.awayGoals)
    ? getTeam(fixture.homeTeamId)
    : getTeam(fixture.awayTeamId);
  const article = /^[AEIO]/i.test(winner.name.trim()) ? "An" : "A";

  return `${article} ${winner.name} win`;
}

function getExpectedThirdPlaceSingleResultRow(fixture, result) {
  const group = (tournamentData.groups || []).find((groupItem) => groupItem.id === fixture?.groupId);
  if (!group) {
    return null;
  }

  const projection = createExpectedGroupQualificationProjection(group);
  if (!projection) {
    return null;
  }

  const states = cloneExpectedGroupQualificationStates(projection.baseStates);
  applyExpectedGroupQualificationResult(states, result);

  return getExpectedGroupQualificationScenarioRows(group, states, [
    ...projection.completedResults,
    result
  ])[thirdPlaceStandingIndex] || null;
}

function getExpectedThirdPlaceWatchGroupOrder(candidate, rows) {
  const groupIds = [];
  const addGroupId = (groupId) => {
    if (groupId && !groupIds.includes(groupId)) {
      groupIds.push(groupId);
    }
  };
  const comparisonTarget = getExpectedThirdPlaceComparisonTarget(candidate, rows);

  addGroupId(comparisonTarget?.groupId);
  addGroupId(candidate.groupId);
  fixturesData.fixtures
    .filter((fixture) => fixture.stage === "group" && fixture.status !== "FT")
    .sort((a, b) => getExpectedFixtureSortValue(a).localeCompare(getExpectedFixtureSortValue(b)))
    .forEach((fixture) => addGroupId(fixture.groupId));

  return groupIds;
}

function getExpectedThirdPlaceWatchEffect(candidate, rows = getExpectedThirdPlaceRaceRows()) {
  const estimate = candidate.advancementEstimate;

  if (
    !estimate ||
    !Number.isFinite(estimate.probability) ||
    estimate.probability <= 0 ||
    estimate.probability >= 1 ||
    candidate.isEliminated ||
    candidate.isCutLineTie
  ) {
    return null;
  }

  const advancerCount = getThirdPlaceAdvancerCount();
  const isInside = candidate.position <= advancerCount;

  for (const groupId of getExpectedThirdPlaceWatchGroupOrder(candidate, rows)) {
    const currentThirdPlaceRow = rows.find((row) => row.groupId === groupId);
    const currentGroupIsAbove = currentThirdPlaceRow
      ? compareThirdPlaceCandidates(currentThirdPlaceRow, candidate) < 0
      : false;
    const groupFixtures = getGroupFixtures(groupId)
      .filter((fixture) => fixture.status !== "FT" && fixture.homeTeamId && fixture.awayTeamId)
      .sort((a, b) => getExpectedFixtureSortValue(a).localeCompare(getExpectedFixtureSortValue(b)));
    const effects = [];

    for (const fixture of groupFixtures) {
      getExpectedProjectedGroupQualificationResults(fixture).forEach((result, resultIndex) => {
        const thirdPlaceRow = getExpectedThirdPlaceSingleResultRow(fixture, result);
        if (!thirdPlaceRow) {
          return;
        }

        const resultMovesGroupAbove = compareThirdPlaceCandidates(thirdPlaceRow, candidate) < 0;
        if (!isInside || currentGroupIsAbove || !resultMovesGroupAbove) {
          return;
        }

        const group = (tournamentData.groups || []).find((groupItem) => groupItem.id === groupId);
        const groupLabel = group?.label || `Group ${groupId}`;
        const line =
          candidate.position === advancerCount
            ? `${getExpectedThirdPlaceWatchOutcomeLabel(fixture, result)} would move ${groupLabel}'s third-place team to ${formatExpectedThirdPlaceShortPoints(thirdPlaceRow.pts)}, pushing ${candidate.team.name} out of the current top 8 unless another group falls back.`
            : `${getExpectedThirdPlaceWatchOutcomeLabel(fixture, result)} would move ${groupLabel}'s third-place team to ${formatExpectedThirdPlaceShortPoints(thirdPlaceRow.pts)}, shrinking ${candidate.team.name}'s cushion above the cut line.`;

        effects.push({
          fixture,
          line,
          pointSwing: thirdPlaceRow.pts - candidate.pts,
          resultIndex
        });
      });
    }

    if (effects.length) {
      return effects.sort(
        (a, b) =>
          b.pointSwing - a.pointSwing ||
          getExpectedFixtureSortValue(a.fixture).localeCompare(getExpectedFixtureSortValue(b.fixture)) ||
          a.resultIndex - b.resultIndex
      )[0];
    }
  }

  return null;
}

function getExpectedThirdPlaceWatchLines(candidate, rows = getExpectedThirdPlaceRaceRows()) {
  const effect = getExpectedThirdPlaceWatchEffect(candidate, rows);
  if (!effect) {
    return [];
  }

  return [
    `Watch: ${getTeam(effect.fixture.homeTeamId).name} vs ${getTeam(effect.fixture.awayTeamId).name}`,
    effect.line
  ];
}

function getExpectedThirdPlaceReason(candidate, rows = getExpectedThirdPlaceRaceRows()) {
  const topLines = [
    formatExpectedThirdPlaceTooltipChanceLine(candidate),
    "",
    getExpectedThirdPlaceTooltipSituationLine(candidate)
  ].filter((line, index) => index === 1 || Boolean(line));
  const watchLines = getExpectedThirdPlaceWatchLines(candidate, rows);

  return [...topLines, ...(watchLines.length ? ["", ...watchLines] : [])].join("\n");
}

function getExpectedThirdPlaceRaceStatusReason(candidate) {
  return candidate.status?.detail || "Eliminated at group stage.";
}

function getExpectedThirdPlaceStandingBadgeReason(candidate) {
  return candidate.status?.label === "Advancing"
    ? "Advancing to Round of 32 as a top-eight third-place team."
    : "Not advancing. Eliminated at group stage.";
}

function getAutomaticAdvancersPerGroup() {
  const value = Number(tournamentData.format?.automaticAdvancersPerGroup);
  return Number.isFinite(value) ? value : 2;
}

function getGroupStagePathPlaceCount(rowCount = 0) {
  const possiblePlaces = getAutomaticAdvancersPerGroup() + (getThirdPlaceAdvancerCount() > 0 ? 1 : 0);
  return rowCount > 0 ? Math.min(rowCount, possiblePlaces) : possiblePlaces;
}

function hasUsableScore(fixture) {
  return Number.isFinite(Number(fixture?.score?.home)) && Number.isFinite(Number(fixture?.score?.away));
}

function getGroupFixtures(groupId) {
  return fixturesData.fixtures.filter((fixture) => fixture.stage === "group" && fixture.groupId === groupId);
}

function getExpectedRemainingTeamGroupFixtures(teamId, groupId) {
  return getGroupFixtures(groupId).filter(
    (fixture) =>
      fixture.status !== "FT" &&
      fixture.homeTeamId &&
      fixture.awayTeamId &&
      (fixture.homeTeamId === teamId || fixture.awayTeamId === teamId)
  );
}

function isGroupStageFinished() {
  const groupFixtures = fixturesData.fixtures.filter((fixture) => fixture.stage === "group");
  return groupFixtures.length > 0 && groupFixtures.every((fixture) => fixture.status === "FT");
}

function isExpectedGroupFinished(groupId) {
  const groupFixtures = getGroupFixtures(groupId);
  return groupFixtures.length > 0 && groupFixtures.every((fixture) => fixture.status === "FT");
}

function createExpectedGroupQualificationStates(group) {
  const sourceRowsByTeamId = new Map((standingsData.groups?.[group.id] || []).map((row) => [row.teamId, row]));
  return new Map(
    (group.teamIds || []).map((teamId, index) => [
      teamId,
      {
        conductScore: getTeamConductScore(sourceRowsByTeamId.get(teamId)),
        ga: 0,
        gd: 0,
        gf: 0,
        played: 0,
        pts: 0,
        seededOrder: index,
        teamId
      }
    ])
  );
}

function cloneExpectedGroupQualificationStates(states) {
  return new Map([...states.entries()].map(([teamId, state]) => [teamId, { ...state }]));
}

function applyExpectedGroupQualificationResult(states, result) {
  const home = states.get(result.homeTeamId);
  const away = states.get(result.awayTeamId);

  if (!home || !away) {
    return;
  }

  const homeGoals = Number(result.homeGoals);
  const awayGoals = Number(result.awayGoals);
  home.played += 1;
  away.played += 1;
  home.gf += homeGoals;
  home.ga += awayGoals;
  home.gd += homeGoals - awayGoals;
  away.gf += awayGoals;
  away.ga += homeGoals;
  away.gd += awayGoals - homeGoals;

  if (homeGoals > awayGoals) {
    home.pts += 3;
  } else if (awayGoals > homeGoals) {
    away.pts += 3;
  } else {
    home.pts += 1;
    away.pts += 1;
  }
}

function getExpectedCompletedGroupQualificationResults(groupFixtures) {
  return groupFixtures
    .filter((fixture) => fixture.status === "FT" && hasUsableScore(fixture))
    .map((fixture) => ({
      awayGoals: Number(fixture.score.away),
      awayTeamId: fixture.awayTeamId,
      fixed: true,
      homeGoals: Number(fixture.score.home),
      homeTeamId: fixture.homeTeamId
    }));
}

function getExpectedProjectedGroupQualificationResults(fixture) {
  return [
    {
      awayGoals: 0,
      awayTeamId: fixture.awayTeamId,
      fixed: false,
      homeGoals: 1,
      homeTeamId: fixture.homeTeamId
    },
    {
      awayGoals: 0,
      awayTeamId: fixture.awayTeamId,
      fixed: false,
      homeGoals: 0,
      homeTeamId: fixture.homeTeamId
    },
    {
      awayGoals: 1,
      awayTeamId: fixture.awayTeamId,
      fixed: false,
      homeGoals: 0,
      homeTeamId: fixture.homeTeamId
    }
  ];
}

function createExpectedGroupQualificationProjection(group) {
  const groupFixtures = getGroupFixtures(group?.id);
  const completedGroupFixtures = groupFixtures.filter((fixture) => fixture.status === "FT");

  if (completedGroupFixtures.some((fixture) => !hasUsableScore(fixture))) {
    return null;
  }

  const baseStates = createExpectedGroupQualificationStates(group);
  const completedResults = getExpectedCompletedGroupQualificationResults(groupFixtures);
  completedResults.forEach((result) => applyExpectedGroupQualificationResult(baseStates, result));

  return {
    baseStates,
    completedResults,
    remainingFixtures: groupFixtures.filter(
      (fixture) => fixture.status !== "FT" && fixture.homeTeamId && fixture.awayTeamId
    )
  };
}

function compareExpectedGroupQualificationScenarioRows(a, b, scenarioRows, states, results) {
  if (a.pts !== b.pts) {
    return b.pts - a.pts;
  }

  const tiedTeamIds = scenarioRows
    .filter((row) => row.pts === a.pts)
    .map((row) => row.teamId);

  if (isExpectedTeamDefinitelyAboveInTie(a.teamId, b.teamId, tiedTeamIds, states, results)) {
    return -1;
  }

  if (isExpectedTeamDefinitelyAboveInTie(b.teamId, a.teamId, tiedTeamIds, states, results)) {
    return 1;
  }

  const conductA = getTeamConductScore(a);
  const conductB = getTeamConductScore(b);

  return (
    b.gd - a.gd ||
    b.gf - a.gf ||
    (conductA !== null && conductB !== null ? conductB - conductA : 0) ||
    getFifaRankValue(getTeam(a.teamId)) - getFifaRankValue(getTeam(b.teamId)) ||
    a.seededOrder - b.seededOrder ||
    getTeam(a.teamId).name.localeCompare(getTeam(b.teamId).name)
  );
}

function getExpectedGroupQualificationScenarioRows(group, states, results) {
  const groupIndex = (tournamentData.groups || []).findIndex((groupItem) => groupItem.id === group?.id);
  const scenarioRows = [...states.values()];

  return [...scenarioRows]
    .sort((a, b) => compareExpectedGroupQualificationScenarioRows(a, b, scenarioRows, states, results))
    .map((row, index) => ({
      ...row,
      conductScore: getTeamConductScore(row),
      groupId: group.id,
      groupIndex,
      groupLabel: group.label || `Group ${group.id}`,
      position: index + 1,
      team: getTeam(row.teamId)
    }));
}

function getExpectedFallbackGroupQualificationScenarios(group) {
  const groupIndex = (tournamentData.groups || []).findIndex((groupItem) => groupItem.id === group?.id);
  const rows = (standingsData.groups?.[group.id] || []).map((row, index) => ({
    ...row,
    conductScore: getTeamConductScore(row),
    gd: row.gf - row.ga,
    groupId: group.id,
    groupIndex,
    groupLabel: group.label || `Group ${group.id}`,
    position: index + 1,
    pts: row.wins * 3 + row.draws,
    team: getTeam(row.teamId)
  }));

  return [
    {
      isFallback: true,
      results: [],
      rows
    }
  ];
}

function getExpectedGroupQualificationScenarios(group) {
  const cacheKey = String(group?.id || "");
  if (expectedThirdPlaceGroupScenarioCache.has(cacheKey)) {
    return expectedThirdPlaceGroupScenarioCache.get(cacheKey);
  }

  const projection = createExpectedGroupQualificationProjection(group);
  if (!projection) {
    const fallbackScenarios = getExpectedFallbackGroupQualificationScenarios(group);
    expectedThirdPlaceGroupScenarioCache.set(cacheKey, fallbackScenarios);
    return fallbackScenarios;
  }

  const scenarios = [];

  function visit(fixtureIndex, states, results) {
    if (fixtureIndex >= projection.remainingFixtures.length) {
      scenarios.push({
        isFallback: false,
        results,
        rows: getExpectedGroupQualificationScenarioRows(group, states, results)
      });
      return;
    }

    const fixture = projection.remainingFixtures[fixtureIndex];
    getExpectedProjectedGroupQualificationResults(fixture).forEach((result) => {
      const nextStates = cloneExpectedGroupQualificationStates(states);
      applyExpectedGroupQualificationResult(nextStates, result);
      visit(fixtureIndex + 1, nextStates, [...results, result]);
    });
  }

  visit(0, projection.baseStates, projection.completedResults);

  const scenarioRows = scenarios.length ? scenarios : getExpectedFallbackGroupQualificationScenarios(group);
  expectedThirdPlaceGroupScenarioCache.set(cacheKey, scenarioRows);
  return scenarioRows;
}

function formatExpectedThirdPlaceAdvancementPercent(probability) {
  if (!Number.isFinite(probability)) {
    return "";
  }

  const percent = probability * 100;
  if (probability > 0 && percent < 1) {
    return "<1%";
  }

  if (probability < 1 && percent > 99) {
    return "99%";
  }

  return `${Math.round(percent)}%`;
}

function getExpectedThirdPlaceScenarioAdvancementProbability(targetThirdPlaceRow, targetGroupId) {
  const advancerCount = getThirdPlaceAdvancerCount();
  let distribution = [1];
  let totalCombinations = 1;

  for (const group of tournamentData.groups || []) {
    if (group.id === targetGroupId) {
      continue;
    }

    const scenarios = getExpectedGroupQualificationScenarios(group);
    const scenarioCount = scenarios.length || 1;
    const aboveCount = scenarios.filter((scenario) => {
      const thirdPlaceRow = scenario.rows[thirdPlaceStandingIndex];
      return thirdPlaceRow && compareThirdPlaceCandidates(thirdPlaceRow, targetThirdPlaceRow) < 0;
    }).length;
    const notAboveCount = scenarioCount - aboveCount;
    const nextDistribution = Array.from({ length: distribution.length + 1 }, () => 0);

    distribution.forEach((count, index) => {
      nextDistribution[index] += count * notAboveCount;
      nextDistribution[index + 1] += count * aboveCount;
    });

    distribution = nextDistribution;
    totalCombinations *= scenarioCount;
  }

  if (!totalCombinations) {
    return 0;
  }

  const advancingCombinations = distribution.reduce(
    (total, count, aboveCount) => (aboveCount < advancerCount ? total + count : total),
    0
  );

  return advancingCombinations / totalCombinations;
}

function getExpectedThirdPlaceAdvancementEstimate(candidate) {
  const cacheKey = `${candidate.groupId || ""}:${candidate.teamId || ""}:${candidate.pts}:${candidate.gd}:${candidate.gf}:${candidate.isEliminated ? "out" : "live"}`;
  if (expectedThirdPlaceAdvancementEstimateCache.has(cacheKey)) {
    return expectedThirdPlaceAdvancementEstimateCache.get(cacheKey);
  }

  const group = (tournamentData.groups || []).find((groupItem) => groupItem.id === candidate.groupId);
  const targetScenarios = getExpectedGroupQualificationScenarios(group);
  let automaticScenarioCount = 0;
  let thirdPlaceScenarioCount = 0;
  let outScenarioCount = 0;
  let chanceTotal = 0;

  targetScenarios.forEach((scenario) => {
    const targetRow = scenario.rows.find((row) => row.teamId === candidate.teamId);
    const automaticPlaces = Math.min(scenario.rows.length, getAutomaticAdvancersPerGroup());

    if (!targetRow) {
      outScenarioCount += 1;
      return;
    }

    if (targetRow.position <= automaticPlaces) {
      automaticScenarioCount += 1;
      chanceTotal += 1;
      return;
    }

    if (targetRow.position === thirdPlaceStandingIndex + 1) {
      thirdPlaceScenarioCount += 1;
      chanceTotal += getExpectedThirdPlaceScenarioAdvancementProbability(targetRow, candidate.groupId);
      return;
    }

    outScenarioCount += 1;
  });

  const modeledScenarioCount = targetScenarios.length;
  const rawProbability = modeledScenarioCount > 0 ? chanceTotal / modeledScenarioCount : null;
  const probability = candidate.isEliminated ? 0 : rawProbability;
  const estimate = {
    automaticScenarioCount,
    displayPercent: formatExpectedThirdPlaceAdvancementPercent(probability),
    groupScenarioCount: modeledScenarioCount,
    outScenarioCount,
    probability,
    remainingGroupMatchCount: fixturesData.fixtures.filter((fixture) => fixture.stage === "group" && fixture.status !== "FT").length,
    thirdPlaceScenarioCount,
    usesFallback: targetScenarios.some((scenario) => scenario.isFallback)
  };

  expectedThirdPlaceAdvancementEstimateCache.set(cacheKey, estimate);
  return estimate;
}

function getExpectedGroupThirdPlacePointFloor(group) {
  const cacheKey = String(group?.id || "");
  if (expectedGroupThirdPlacePointFloorCache.has(cacheKey)) {
    return expectedGroupThirdPlacePointFloorCache.get(cacheKey);
  }

  const projection = createExpectedGroupQualificationProjection(group);
  if (!projection) {
    expectedGroupThirdPlacePointFloorCache.set(cacheKey, null);
    return null;
  }

  let floor = Number.POSITIVE_INFINITY;

  function visit(fixtureIndex, states) {
    if (fixtureIndex >= projection.remainingFixtures.length) {
      const points = [...states.values()].map((state) => state.pts).sort((a, b) => b - a);
      const thirdPlacePoints = points[thirdPlaceStandingIndex];

      if (Number.isFinite(thirdPlacePoints)) {
        floor = Math.min(floor, thirdPlacePoints);
      }
      return;
    }

    const fixture = projection.remainingFixtures[fixtureIndex];
    getExpectedProjectedGroupQualificationResults(fixture).forEach((result) => {
      const nextStates = cloneExpectedGroupQualificationStates(states);
      applyExpectedGroupQualificationResult(nextStates, result);
      visit(fixtureIndex + 1, nextStates);
    });
  }

  visit(0, projection.baseStates);

  const pointFloor = Number.isFinite(floor) ? floor : null;
  expectedGroupThirdPlacePointFloorCache.set(cacheKey, pointFloor);
  return pointFloor;
}

function getExpectedTeamMaximumPossibleGroupPoints(teamId, group) {
  const cacheKey = `${group?.id || ""}:${teamId || ""}`;
  if (expectedTeamMaximumGroupPointsCache.has(cacheKey)) {
    return expectedTeamMaximumGroupPointsCache.get(cacheKey);
  }

  const projection = createExpectedGroupQualificationProjection(group);
  const state = projection?.baseStates.get(teamId);
  if (!state) {
    expectedTeamMaximumGroupPointsCache.set(cacheKey, null);
    return null;
  }

  const maximumPoints =
    state.pts +
    projection.remainingFixtures.filter(
      (fixture) => fixture.homeTeamId === teamId || fixture.awayTeamId === teamId
    ).length *
      3;

  expectedTeamMaximumGroupPointsCache.set(cacheKey, maximumPoints);
  return maximumPoints;
}

function getExpectedHeadToHeadStats(tiedTeamIds, results) {
  const tiedTeamSet = new Set(tiedTeamIds);
  const stats = new Map(
    tiedTeamIds.map((teamId) => [
      teamId,
      {
        fixedOnly: true,
        gd: 0,
        gf: 0,
        pts: 0,
        teamId
      }
    ])
  );

  results
    .filter((result) => tiedTeamSet.has(result.homeTeamId) && tiedTeamSet.has(result.awayTeamId))
    .forEach((result) => {
      const home = stats.get(result.homeTeamId);
      const away = stats.get(result.awayTeamId);
      const homeGoals = Number(result.homeGoals);
      const awayGoals = Number(result.awayGoals);

      home.fixedOnly = home.fixedOnly && result.fixed;
      away.fixedOnly = away.fixedOnly && result.fixed;
      home.gf += homeGoals;
      home.gd += homeGoals - awayGoals;
      away.gf += awayGoals;
      away.gd += awayGoals - homeGoals;

      if (homeGoals > awayGoals) {
        home.pts += 3;
      } else if (awayGoals > homeGoals) {
        away.pts += 3;
      } else {
        home.pts += 1;
        away.pts += 1;
      }
    });

  return stats;
}

function hasUnfixedExpectedResultForTeams(teamIds, results) {
  const teamIdSet = new Set(teamIds);
  return results.some(
    (result) => !result.fixed && (teamIdSet.has(result.homeTeamId) || teamIdSet.has(result.awayTeamId))
  );
}

function isExpectedTeamDefinitelyAboveInTie(otherTeamId, targetTeamId, tiedTeamIds, states, results) {
  const headToHeadStats = getExpectedHeadToHeadStats(tiedTeamIds, results);
  const otherHeadToHead = headToHeadStats.get(otherTeamId);
  const targetHeadToHead = headToHeadStats.get(targetTeamId);

  if (!otherHeadToHead || !targetHeadToHead) {
    return false;
  }

  if (otherHeadToHead.pts !== targetHeadToHead.pts) {
    return otherHeadToHead.pts > targetHeadToHead.pts;
  }

  const fixedHeadToHead = [...headToHeadStats.values()].every((stat) => stat.fixedOnly);
  if (!fixedHeadToHead) {
    return false;
  }

  if (otherHeadToHead.gd !== targetHeadToHead.gd) {
    return otherHeadToHead.gd > targetHeadToHead.gd;
  }

  if (otherHeadToHead.gf !== targetHeadToHead.gf) {
    return otherHeadToHead.gf > targetHeadToHead.gf;
  }

  if (hasUnfixedExpectedResultForTeams(tiedTeamIds, results)) {
    return false;
  }

  const other = states.get(otherTeamId);
  const target = states.get(targetTeamId);
  if (!other || !target) {
    return false;
  }

  if (other.gd !== target.gd) {
    return other.gd > target.gd;
  }

  if (other.gf !== target.gf) {
    return other.gf > target.gf;
  }

  const otherConduct = getTeamConductScore(other);
  const targetConduct = getTeamConductScore(target);
  if (otherConduct === null || targetConduct === null) {
    return false;
  }

  if (otherConduct !== targetConduct) {
    return otherConduct > targetConduct;
  }

  return getFifaRankValue(getTeam(otherTeamId)) < getFifaRankValue(getTeam(targetTeamId));
}

function canExpectedTeamReachGroupStagePathInScenario(teamId, states, results, pathPlaceCount) {
  const target = states.get(teamId);

  if (!target) {
    return false;
  }

  const tiedTeamIds = [...states.values()]
    .filter((state) => state.pts === target.pts)
    .map((state) => state.teamId);
  const teamsDefinitelyAbove = [...states.values()].filter((state) => {
    if (state.teamId === teamId) {
      return false;
    }

    if (state.pts !== target.pts) {
      return state.pts > target.pts;
    }

    return isExpectedTeamDefinitelyAboveInTie(state.teamId, teamId, tiedTeamIds, states, results);
  });

  return teamsDefinitelyAbove.length < pathPlaceCount;
}

function canExpectedTeamStillReachGroupStagePath(teamId, group, pathPlaceCount) {
  const projection = createExpectedGroupQualificationProjection(group);
  if (!projection) {
    return true;
  }

  function visit(fixtureIndex, states, results) {
    if (fixtureIndex >= projection.remainingFixtures.length) {
      return canExpectedTeamReachGroupStagePathInScenario(teamId, states, results, pathPlaceCount);
    }

    const fixture = projection.remainingFixtures[fixtureIndex];
    return getExpectedProjectedGroupQualificationResults(fixture).some((result) => {
      const nextStates = cloneExpectedGroupQualificationStates(states);
      applyExpectedGroupQualificationResult(nextStates, result);
      return visit(fixtureIndex + 1, nextStates, [...results, result]);
    });
  }

  return visit(0, projection.baseStates, projection.completedResults);
}

function canExpectedTeamStillAdvanceAsThirdPlace(teamId, group) {
  const thirdPlaceAdvancerCount = getThirdPlaceAdvancerCount();
  if (thirdPlaceAdvancerCount <= 0) {
    return false;
  }

  const pathPlaceCount = getGroupStagePathPlaceCount(group?.teamIds?.length || 0);
  if (!canExpectedTeamStillReachGroupStagePath(teamId, group, pathPlaceCount)) {
    return false;
  }

  const maximumPoints = getExpectedTeamMaximumPossibleGroupPoints(teamId, group);
  if (!Number.isFinite(maximumPoints)) {
    return true;
  }

  const guaranteedAboveCount = (tournamentData.groups || []).filter((groupItem) => {
    if (groupItem.id === group?.id) {
      return false;
    }

    const pointFloor = getExpectedGroupThirdPlacePointFloor(groupItem);
    return Number.isFinite(pointFloor) && pointFloor > maximumPoints;
  }).length;

  return guaranteedAboveCount < thirdPlaceAdvancerCount;
}

function isExpectedTeamEliminatedFromGroupStage(teamId, group) {
  if (!teamId || !group?.id) {
    return false;
  }

  const cacheKey = `${group.id}:${teamId}`;
  if (expectedTeamGroupStageEliminationCache.has(cacheKey)) {
    return expectedTeamGroupStageEliminationCache.get(cacheKey);
  }

  const automaticPlaces = Math.min(group.teamIds?.length || getAutomaticAdvancersPerGroup(), getAutomaticAdvancersPerGroup());
  const canReachAutomaticPlace = canExpectedTeamStillReachGroupStagePath(teamId, group, automaticPlaces);
  const isEliminated =
    !canReachAutomaticPlace && !canExpectedTeamStillAdvanceAsThirdPlace(teamId, group);

  expectedTeamGroupStageEliminationCache.set(cacheKey, isEliminated);
  return isEliminated;
}

function getExpectedEliminatedTeamNames() {
  const eliminated = [];
  const thirdPlaceRaceByTeamId = new Set(getExpectedThirdPlaceRaceRows().map((candidate) => candidate.teamId));

  for (const group of tournamentData.groups || []) {
    const rows = standingsData.groups?.[group.id] || [];

    for (const row of rows) {
      if (!thirdPlaceRaceByTeamId.has(row.teamId) && isExpectedTeamEliminatedFromGroupStage(row.teamId, group)) {
        eliminated.push(getTeam(row.teamId).name);
      }
    }
  }

  return eliminated.sort();
}

function getExpectedConfirmedAdvancingStandingTeamNames() {
  const confirmed = [];
  const thirdPlaceRaceByTeamId = new Map(getExpectedThirdPlaceRaceRows().map((candidate) => [candidate.teamId, candidate]));
  const groupStageFinished = isGroupStageFinished();
  const thirdPlaceAdvancerCount = getThirdPlaceAdvancerCount();

  for (const group of tournamentData.groups || []) {
    const rows = standingsData.groups?.[group.id] || [];
    const automaticPlaces = Math.min(group.teamIds?.length || rows.length || getAutomaticAdvancersPerGroup(), getAutomaticAdvancersPerGroup());
    const groupFinished = isExpectedGroupFinished(group.id);

    rows.forEach((row, index) => {
      const thirdPlaceCandidate = thirdPlaceRaceByTeamId.get(row.teamId);
      const madeAutomatic = groupFinished && index < automaticPlaces;
      const madeThirdPlace =
        groupStageFinished &&
        thirdPlaceCandidate?.position <= thirdPlaceAdvancerCount &&
        !thirdPlaceCandidate.isCutLineTie;

      if (madeAutomatic || madeThirdPlace) {
        confirmed.push(getTeam(row.teamId).name);
      }
    });
  }

  return confirmed.sort();
}

function getExpectedStandingOrder(groupId) {
  return (standingsData.groups?.[groupId] || []).map((row) => getTeam(row.teamId).name).join("|");
}

function getDayKeyForTimeZone(value, timeZone = "America/Los_Angeles") {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function getLatestUpdatedAt(items) {
  const latestTimestamp = items.reduce((latest, item) => {
    const timestamp = new Date(item?.updatedAt || "").getTime();
    return Number.isFinite(timestamp) && timestamp > latest ? timestamp : latest;
  }, 0);

  return latestTimestamp ? new Date(latestTimestamp).toISOString() : "";
}

function formatExpectedSourceUpdatedAt(value) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "America/Los_Angeles",
    timeZoneName: "short",
    year: "numeric"
  }).format(new Date(value));
}

function getExpectedReleaseTooltipText(data) {
  const release = (data.releases || [])
    .filter((item) => item && typeof item === "object")
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0];
  const title = String(release?.title || "Latest changes").trim();
  const highlights = Array.isArray(release?.highlights)
    ? release.highlights.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3)
    : [];

  return [title, ...highlights].filter(Boolean).join(" ");
}

async function openPageAtTime(
  nowIso,
  path = "/?view=matches&date=2026-06-17&tz=America%2FLos_Angeles",
  options = {}
) {
  const context = await browser.newContext();
  await context.addInitScript((mockNowIso) => {
    const RealDate = Date;
    const mockNow = new RealDate(mockNowIso);

    class MockDate extends RealDate {
      constructor(...args) {
        return args.length === 0 ? new RealDate(mockNow) : new RealDate(...args);
      }

      static now() {
        return mockNow.getTime();
      }
    }

    window.Date = MockDate;
  }, nowIso);

  if (options.fixtureTransform) {
    const patchedFixturesData = JSON.parse(JSON.stringify(fixturesData));
    options.fixtureTransform(patchedFixturesData);
    await context.route("**/data/fixtures.json*", async (route) => {
      await route.fulfill({
        body: JSON.stringify(patchedFixturesData),
        contentType: "application/json",
        status: 200
      });
    });
  }

  const mockedPage = await context.newPage();
  await mockedPage.goto(`${baseUrl}${path}`, { waitUntil: "load" });
  await mockedPage.waitForSelector(
    path.includes("view=standings") ? ".standings-card, .third-place-table, .tournament-view" : ".match-row",
    { state: "attached" }
  );

  return { context, page: mockedPage };
}

function hideFutureStartedFixtures(data, nowIso) {
  const now = new Date(nowIso).getTime();

  for (const fixture of data.fixtures || []) {
    if (!fixture.kickoffUtc || new Date(fixture.kickoffUtc).getTime() <= now) {
      continue;
    }

    fixture.status = "SCHEDULED";
    delete fixture.score;
  }
}

try {
  const loadingContext = await browser.newContext();
  let releaseFixtures;
  const fixturesDelay = new Promise((resolve) => {
    releaseFixtures = resolve;
  });
  await loadingContext.route("**/data/fixtures.json*", async (route) => {
    await fixturesDelay;
    await route.fulfill({
      body: JSON.stringify(fixturesData),
      contentType: "application/json",
      status: 200
    });
  });
  const loadingPage = await loadingContext.newPage();
  await loadingPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await loadingPage.waitForSelector(".header-controls:not(.is-loading)");
  await loadingPage.locator("#settings-button").click();
  await loadingPage.locator(".settings-toggle-control").click();
  assert(
    (await loadingPage.locator("#match-list .empty-state").count()) === 0,
    "Toggling Show yesterday during initial data load should not show the no-data report state."
  );
  assert(
    (await loadingPage.locator("#match-list .match-loading-row").count()) === 4,
    "Toggling Show yesterday during initial data load should keep the match skeleton visible."
  );
  releaseFixtures();
  await loadingPage.waitForSelector(".match-row");
  await loadingContext.close();

  const thirdPlaceLoadingContext = await browser.newContext();
  let releaseStandings;
  const standingsDelay = new Promise((resolve) => {
    releaseStandings = resolve;
  });
  await thirdPlaceLoadingContext.route("**/data/standings.json*", async (route) => {
    await standingsDelay;
    await route.fulfill({
      body: JSON.stringify(standingsData),
      contentType: "application/json",
      status: 200
    });
  });
  const thirdPlaceLoadingPage = await thirdPlaceLoadingContext.newPage();
  await thirdPlaceLoadingPage.goto(`${baseUrl}?view=standings&standingsMode=third-place`, {
    waitUntil: "domcontentloaded"
  });
  await thirdPlaceLoadingPage.waitForSelector(".third-place-loading-row");
  const thirdPlaceLoadingState = await thirdPlaceLoadingPage.evaluate(() => ({
    ariaBusy: document.querySelector("#standings-grid")?.getAttribute("aria-busy"),
    headers: [...document.querySelectorAll(".third-place-table thead th")].map((header) =>
      header.textContent.trim()
    ),
    rowCount: document.querySelectorAll(".third-place-loading-row").length,
    realRowCount: document.querySelectorAll(".third-place-table tbody tr:not(.third-place-loading-row)").length,
    summary: document.querySelector("#standings-summary")?.textContent.trim(),
    tabPressed: document.querySelector("#standings-third-place-tab")?.getAttribute("aria-pressed")
  }));
  assert(
    thirdPlaceLoadingState.ariaBusy === "true" &&
      thirdPlaceLoadingState.tabPressed === "true" &&
      thirdPlaceLoadingState.summary.includes("Third-place standings across all groups") &&
      thirdPlaceLoadingState.headers.join("|") === "Rank|Team|Group|Pts|GD|Goals|Status" &&
      thirdPlaceLoadingState.rowCount === 8 &&
      thirdPlaceLoadingState.realRowCount === 0,
    "Direct third-place standings loads should show a table-shaped skeleton while standings data is loading."
  );
  releaseStandings();
  await thirdPlaceLoadingPage.waitForFunction(
    () => document.querySelectorAll(".third-place-table tbody tr:not(.third-place-cut-row)").length === 12
  );
  await thirdPlaceLoadingContext.close();

  const tournamentLoadingContext = await browser.newContext();
  let releaseTournamentStandings;
  const tournamentStandingsDelay = new Promise((resolve) => {
    releaseTournamentStandings = resolve;
  });
  await tournamentLoadingContext.route("**/data/standings.json*", async (route) => {
    await tournamentStandingsDelay;
    await route.fulfill({
      body: JSON.stringify(standingsData),
      contentType: "application/json",
      status: 200
    });
  });
  const tournamentLoadingPage = await tournamentLoadingContext.newPage();
  await tournamentLoadingPage.goto(`${baseUrl}?view=standings&standingsMode=tournament`, {
    waitUntil: "domcontentloaded"
  });
  await tournamentLoadingPage.waitForSelector(".tournament-loading-match");
  const tournamentLoadingState = await tournamentLoadingPage.evaluate(() => ({
    ariaBusy: document.querySelector("#standings-grid")?.getAttribute("aria-busy"),
    loadingCards: document.querySelectorAll(".tournament-loading-match").length,
    realCards: document.querySelectorAll(".progress-match:not(.tournament-loading-match)").length,
    roundHeadings: [...document.querySelectorAll(".progress-round h3")].map((heading) =>
      heading.textContent.trim()
    ),
    summary: document.querySelector("#standings-summary")?.textContent.trim(),
    tabPressed: document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed")
  }));
  assert(
    tournamentLoadingState.ariaBusy === "true" &&
      tournamentLoadingState.tabPressed === "true" &&
      tournamentLoadingState.summary.includes("Round of 32 slots") &&
      tournamentLoadingState.roundHeadings.join("|") === "Round of 32|Round of 16|Quarter-finals|Semi-finals|Final" &&
      tournamentLoadingState.loadingCards === 32 &&
      tournamentLoadingState.realCards === 0,
    "Direct tournament standings loads should show a bracket-shaped skeleton while standings data is loading."
  );
  releaseTournamentStandings();
  await tournamentLoadingPage.waitForFunction(
    () =>
      document.querySelectorAll(".progress-match:not(.tournament-loading-match)").length === 32 &&
      document.querySelectorAll(".tournament-loading-match").length === 0
  );
  await tournamentLoadingContext.close();

  const releaseNotesLoadingContext = await browser.newContext();
  let releaseReleaseNotes;
  const releaseNotesDelay = new Promise((resolve) => {
    releaseReleaseNotes = resolve;
  });
  await releaseNotesLoadingContext.route("**/data/release-notes.json*", async (route) => {
    await releaseNotesDelay;
    await route.fulfill({
      body: JSON.stringify(releaseNotesData),
      contentType: "application/json",
      status: 200
    });
  });
  const releaseNotesLoadingPage = await releaseNotesLoadingContext.newPage();
  await releaseNotesLoadingPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await releaseNotesLoadingPage.waitForSelector(".match-row");
  const releaseNotesLoadingTooltip = releaseNotesLoadingPage.locator("#source-note .release-tooltip");
  const releaseNotesLoadingState = await releaseNotesLoadingTooltip.evaluate((tooltip) => ({
    title: tooltip.querySelector("strong")?.textContent?.trim(),
    status: tooltip.querySelector(".release-tooltip-loading .visually-hidden")?.textContent?.trim(),
    rows: tooltip.querySelectorAll(".release-tooltip-loading-row").length,
    lines: tooltip.querySelectorAll(".release-tooltip-loading .match-loading-line").length
  }));
  assert(
    (await releaseNotesLoadingTooltip.getAttribute("aria-busy")) === "true",
    "The release notes tooltip should be marked busy while release notes are loading."
  );
  assert(
    releaseNotesLoadingState.title === "Latest changes" &&
      releaseNotesLoadingState.status === "Loading release notes" &&
      releaseNotesLoadingState.rows === 3 &&
      releaseNotesLoadingState.lines === 3,
    "The release notes tooltip should show a compact skeleton state while release notes are loading."
  );
  releaseReleaseNotes();
  await releaseNotesLoadingPage.waitForFunction((expectedText) => {
    const tooltip = document.querySelector("#source-note .release-tooltip");
    const tooltipText = [
      tooltip?.querySelector("strong")?.textContent?.trim(),
      ...Array.from(tooltip?.querySelectorAll("li") || []).map((item) => item.textContent.trim())
    ]
      .filter(Boolean)
      .join(" ");

    return (
      tooltip?.getAttribute("aria-busy") === "false" &&
      tooltipText === expectedText
    );
  }, getExpectedReleaseTooltipText(releaseNotesData));
  await releaseNotesLoadingContext.close();

  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector(".match-row");

  assert(new URL(page.url()).search === "", "The default match view should keep the URL clean.");
  assert(
    !(await page.locator("#match-info").isVisible()),
    "Match detail should stay hidden until a match is chosen."
  );
  assert(
    (await page.locator(".match-row.is-selected").count()) === 0,
    "No match row should be selected on load."
  );

  const startingHistoryLength = await page.evaluate(() => history.length);
  await page.locator("#standings-tab").click();
  await page.waitForFunction(
    () =>
      new URL(location.href).searchParams.get("view") === "standings" &&
      document.querySelector("#standings-view")?.hidden === false
  );
  const standingsHistoryLength = await page.evaluate(() => history.length);
  assert(
    standingsHistoryLength > startingHistoryLength,
    "Choosing Standings should push a browser history entry."
  );
  await page.goBack();
  await page.waitForFunction(
    () =>
      location.origin.startsWith("http://127.0.0.1") &&
      location.search === "" &&
      document.querySelector("#matches-view")?.hidden === false
  );
  await page.goForward();
  await page.waitForFunction(
    () =>
      new URL(location.href).searchParams.get("view") === "standings" &&
      document.querySelector("#standings-view")?.hidden === false
  );

  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector(".match-row");
  const searchHistoryStart = await page.evaluate(() => history.length);
  await page.locator("#team-search-toggle").click();
  await page.locator("#team-search-input").fill("Ja");
  await page.waitForFunction(() => new URL(location.href).searchParams.get("team") === "Ja");
  const searchHistoryAfterFirstQuery = await page.evaluate(() => history.length);
  assert(
    searchHistoryAfterFirstQuery > searchHistoryStart,
    "Starting a country search should push a browser history entry."
  );
  await page.locator("#team-search-input").fill("Japan");
  await page.waitForFunction(() => new URL(location.href).searchParams.get("team") === "Japan");
  await page.waitForTimeout(250);
  assert(
    (await page.evaluate(() => history.length)) === searchHistoryAfterFirstQuery,
    "Refining a country search should replace the current search URL instead of pushing each edit."
  );
  await page.goBack();
  await page.waitForFunction(
    () =>
      location.origin.startsWith("http://127.0.0.1") &&
      !new URL(location.href).searchParams.has("team") &&
      document.querySelector("#matches-view")?.hidden === false
  );

  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector(".match-row");
  await page.locator(".match-row").first().click();
  await page.waitForFunction(() => new URL(location.href).searchParams.has("match"));
  await page.goBack();
  await page.waitForFunction(
    () =>
      location.origin.startsWith("http://127.0.0.1") &&
      !new URL(location.href).searchParams.has("match") &&
      document.querySelectorAll(".match-row.is-selected").length === 0
  );

  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector(".match-row");
  await page.locator(".match-row").first().click();
  assert(
    await page.locator("#match-info").isVisible(),
    "Choosing a match should reveal match detail."
  );
  const keyInformationText = await page.locator(".key-info-team p").first().innerText();
  assert(
    keyInformationText.includes("Against "),
    "Key information should include matchup-specific opponent context."
  );
  assert(
    !/main names to track/i.test(keyInformationText),
    "Key information should not use generic player-list placeholder copy."
  );
  assert(
    (await page.locator(".player-link").count()) > 0,
    "Key information should link highlighted player names."
  );
  assert(
    (await page.locator(".key-info-team h4 .key-info-heading .flag").count()) > 0,
    "Key information headings should show the country flag before the label."
  );
  assert(
    (await page.locator(".key-info-team h4 .player-link").count()) === 0,
    "Key information headings should use tactical subtext, not player links."
  );
  assert(
    (await page.locator(".key-info-team .team-style-tags li").count()) >= 2,
    "Key information should show compact tactical style pills."
  );
  const paragraphPlayerDecoration = await page
    .locator(".key-info-team p .player-link")
    .first()
    .evaluate((link) => getComputedStyle(link).textDecorationLine);
  const paragraphPlayerDecorationStyle = await page
    .locator(".key-info-team p .player-link")
    .first()
    .evaluate((link) => getComputedStyle(link).textDecorationStyle);
  const paragraphPlayerOpacity = await page
    .locator(".key-info-team p .player-link")
    .first()
    .evaluate((link) => Number(getComputedStyle(link).opacity));
  const paragraphPlayerWeight = await page
    .locator(".key-info-team p .player-link")
    .first()
    .evaluate((link) => Number(getComputedStyle(link).fontWeight));
  assert(
    paragraphPlayerDecoration === "underline" && paragraphPlayerDecorationStyle === "dotted",
    "Paragraph player mentions should use a soft dotted underline."
  );
  assert(
    paragraphPlayerOpacity === 1 && paragraphPlayerWeight <= 450,
    "Paragraph player mentions should use full opacity and regular paragraph weight."
  );
  await page.locator(".player-link").first().hover();
  const playerCard = page.locator(".player-card:visible").first();
  await playerCard.waitFor({ state: "visible" });
  assert(
    (await playerCard.locator(".player-photo img, .player-photo-fallback").count()) === 1,
    "Player hover card should include a face or initials fallback."
  );
  assert(
    (await playerCard.locator(".player-card-name").count()) === 1 &&
      (await playerCard.locator(".player-card-position").count()) === 1 &&
      (await playerCard.locator(".player-card-club").count()) === 1,
    "Player hover card should include name, position, and club lines."
  );
  assert(
    (await playerCard.locator(".player-skill-list span").count()) > 0,
    "Player hover card should include skill chips."
  );
  const firstCardBox = await playerCard.boundingBox();
  const viewportSize = page.viewportSize();
  assert(
    firstCardBox &&
      viewportSize &&
      firstCardBox.x >= 0 &&
      firstCardBox.x + firstCardBox.width <= viewportSize.width,
    "Player hover card should stay inside the viewport horizontally."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-20&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="netherlands-sweden-2026-06-20"]').click();
  const summervilleLink = page.locator(".player-link", { hasText: "Crysencio Summerville" }).first();
  await summervilleLink.hover();
  const summervilleCard = page.locator(".player-card:visible").first();
  await summervilleCard.waitFor({ state: "visible" });
  assert(
    (await summervilleCard.locator(".player-card-position").innerText()).trim() === "Winger",
    "Player hover card should normalize lowercase source positions for display."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-22&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="france-iraq-2026-06-22"]').click();
  const franceMentionCommaGap = await page
    .locator(".key-info-team")
    .first()
    .locator("p")
    .evaluate((paragraph) => {
      const link = [...paragraph.querySelectorAll(".player-link")].find(
        (candidate) => candidate.textContent.trim() === "Kylian Mbappe"
      );
      const hover = link?.closest(".player-hover");
      const nextText = hover?.nextSibling;

      if (!link || nextText?.nodeType !== Node.TEXT_NODE || !nextText.textContent.startsWith(",")) {
        return Number.POSITIVE_INFINITY;
      }

      const commaRange = document.createRange();
      commaRange.setStart(nextText, 0);
      commaRange.setEnd(nextText, 1);

      return commaRange.getBoundingClientRect().left - link.getBoundingClientRect().right;
    });
  assert(
    franceMentionCommaGap >= 0 && franceMentionCommaGap < 1,
    "Linked player mentions should not insert spaces before comma punctuation."
  );

  await page.setViewportSize({ width: 360, height: 760 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-21&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="new-zealand-egypt-2026-06-21"]').click();
  const scorerHighlightMetrics = await page.locator("#match-info .scorer-highlight").evaluate((item) => {
    const segments = [...item.querySelectorAll(".goal-scorer-segment")];

    return {
      hasStandaloneSoccerIcon: [...item.children].some((child) => child.textContent.trim() === "⚽"),
      segmentCount: segments.length,
      segmentTexts: segments.map((segment) => segment.textContent.trim()),
      segmentFlags: segments.map((segment) => {
        const flag = segment.querySelector(".goal-scorer-flag .flag");
        const minute = segment.querySelector(".goal-minute");
        const flagBox = flag?.getBoundingClientRect();
        const minuteBox = minute?.getBoundingClientRect();

        return {
          label: flag?.getAttribute("aria-label") || "",
          hasFlag: Boolean(flag),
          flagBeforeMinute: Boolean(flagBox && minuteBox && flagBox.right <= minuteBox.left),
          verticalDelta:
            flagBox && minuteBox
              ? Math.abs((flagBox.top + flagBox.bottom - minuteBox.top - minuteBox.bottom) / 2)
              : Number.POSITIVE_INFINITY
        };
      })
    };
  });
  const scorerPlayerDecoration = await page
    .locator("#match-info .scorer-highlight .player-link")
    .first()
    .evaluate((link) => {
      const style = getComputedStyle(link);
      const isVisible = Boolean(link.offsetWidth || link.offsetHeight || link.getClientRects().length);
      const matchesDottedUnderlineRule = (rule) => {
        if (rule.selectorText) {
          const ruleLine =
            rule.style.getPropertyValue("text-decoration-line") || rule.style.textDecorationLine;
          const ruleStyle =
            rule.style.getPropertyValue("text-decoration-style") || rule.style.textDecorationStyle;
          const selectorMatches = rule.selectorText.split(",").some((selector) => {
            try {
              return link.matches(selector.trim());
            } catch {
              return false;
            }
          });

          return selectorMatches && ruleLine === "underline" && ruleStyle === "dotted";
        }

        return rule.cssRules ? [...rule.cssRules].some(matchesDottedUnderlineRule) : false;
      };
      const hasDottedUnderlineRule = [...document.styleSheets].some((sheet) => {
        try {
          return [...sheet.cssRules].some(matchesDottedUnderlineRule);
        } catch {
          return false;
        }
      });

      return {
        hasDottedUnderlineRule,
        isVisible,
        line: style.textDecorationLine,
        style: style.textDecorationStyle,
        text: link.textContent.trim()
      };
    });
  assert(
    !scorerHighlightMetrics.hasStandaloneSoccerIcon &&
      scorerHighlightMetrics.segmentCount === 4 &&
      scorerHighlightMetrics.segmentTexts[0].includes("15'") &&
      scorerHighlightMetrics.segmentTexts[0].includes("Finn Surman") &&
      scorerHighlightMetrics.segmentTexts[1].includes("58'") &&
      scorerHighlightMetrics.segmentTexts[1].includes("Mostafa Ziko") &&
      scorerHighlightMetrics.segmentFlags[0]?.label === "New Zealand flag" &&
      scorerHighlightMetrics.segmentFlags.slice(1).every((flag) => flag.label === "Egypt flag") &&
      scorerHighlightMetrics.segmentFlags.every(
        (flag) =>
          flag.hasFlag &&
          flag.flagBeforeMinute &&
          flag.verticalDelta <= 4
      ),
    `Scorer highlights should use full-strength country flags before each scorer minute. Measured ${JSON.stringify(scorerHighlightMetrics)}.`
  );
  assert(
    scorerPlayerDecoration.text &&
      ((scorerPlayerDecoration.line === "underline" && scorerPlayerDecoration.style === "dotted") ||
        scorerPlayerDecoration.hasDottedUnderlineRule),
    `Scorer player mentions should use the same soft dotted underline as paragraph mentions. Measured ${JSON.stringify(scorerPlayerDecoration)}.`
  );
  await page.setViewportSize({ width: 1280, height: 720 });

  const runtimeScorerCheck = await openPageAtTime(
    "2026-06-21T20:30:00.000Z",
    "/?view=matches&date=2026-06-21&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const fixture = data.fixtures.find((item) => item.id === "new-zealand-egypt-2026-06-21");
        fixture.status = "FT";
        fixture.score = { home: 1, away: 0 };
        fixture.goalsHome = [{ minute: 54, name: "Runtime Scorer" }];
        fixture.goalsAway = [];
      }
    }
  );
  await runtimeScorerCheck.page.locator('[data-match-id="new-zealand-egypt-2026-06-21"]').click();
  const runtimeScorerLink = runtimeScorerCheck.page
    .locator("#match-info .scorer-highlight .player-link", { hasText: "Runtime Scorer" })
    .first();
  await runtimeScorerLink.hover();
  const runtimeScorerCard = runtimeScorerCheck.page.locator(".player-card:visible").first();
  await runtimeScorerCard.waitFor({ state: "visible" });
  const runtimeScorerCardText = await runtimeScorerCard.innerText();
  assert(
    runtimeScorerCardText.includes("Runtime Scorer") &&
      runtimeScorerCardText.includes("Goal scorer") &&
      runtimeScorerCardText.includes("New Zealand match card") &&
      runtimeScorerCardText.includes("Goal threat") &&
      !/Position to verify|Club to verify|Match plan/.test(runtimeScorerCardText),
    "Runtime-only scorers should get contextual goal cards instead of verification placeholders."
  );
  await runtimeScorerCheck.context.close();

  await page.goto(`${baseUrl}?view=matches&date=2026-06-21&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="belgium-ir-iran-2026-06-21"]').click();
  const lukakuLink = page.locator(".key-info-team .player-link", { hasText: "Romelu Lukaku" }).first();
  await lukakuLink.hover();
  const lukakuCard = page.locator(".player-card:visible").first();
  await lukakuCard.waitFor({ state: "visible" });
  assert(
    (await lukakuCard.locator(".player-card-name").innerText()).trim() === "Romelu Lukaku" &&
      (await lukakuCard.locator(".player-card-number").innerText()).trim() === "#9",
    "Player hover card should show the country-team uniform number beside the name when available."
  );
  assert(
    (await lukakuCard.locator(".player-card-name-line .player-card-flag .flag").getAttribute("aria-label")) ===
      "Belgium flag",
    "Player hover card should show the player's country flag before the name."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-20&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="tunisia-japan-2026-06-20"]').click();
  const japanTunisiaChineseInfo = await page.locator(".key-info-team").last().locator("p").innerText();
  assert(
    japanTunisiaChineseInfo.includes("上田绮世") &&
      japanTunisiaChineseInfo.includes("堂安律") &&
      japanTunisiaChineseInfo.includes("镰田大地") &&
      japanTunisiaChineseInfo.includes("对阵突尼斯"),
    "Chinese Japan key information should localize the post-Kubo key-player trio against Tunisia."
  );
  assert(
    !/Takefusa Kubo|久保建英|Ayase Ueda/.test(japanTunisiaChineseInfo),
    "Chinese Japan key information should not surface Kubo or raw English Ueda after the Tunisia absence update."
  );
  const uedaChineseLink = page.locator(".key-info-team").last().locator(".player-link", { hasText: "上田绮世" }).first();
  assert(
    (await uedaChineseLink.count()) === 1,
    "Chinese key information should link Ayase Ueda's localized name."
  );
  await uedaChineseLink.hover();
  const uedaChineseCard = page.locator(".player-card:visible").first();
  await uedaChineseCard.waitFor({ state: "visible" });
  assert(
    (await uedaChineseCard.locator(".player-card-name").innerText()).trim() === "上田绮世" &&
      (await uedaChineseCard.locator(".player-card-club").innerText()).includes("费耶诺德"),
    "Chinese Ayase Ueda hover card should localize the display name and club."
  );
  const chinesePlayerCardLocalizationLeaks = await page.evaluate(async () => {
    const hasLowercaseLatinWord = (value) => /[A-Za-zÀ-ÖØ-öø-ÿ][a-zà-öø-ÿ]{2,}/.test(String(value || ""));
    const hooks = window.__worldCupTestHooks?.playerCards;
    if (
      typeof hooks?.getLocalizedPlayerPosition !== "function" ||
      typeof hooks?.getLocalizedPlayerClubLine !== "function"
    ) {
      return [{ player: "runtime", field: "helpers", value: "Player card localization helpers unavailable" }];
    }

    const profilesData = await fetch("data/player-profiles.json").then((response) => response.json());
    return Object.entries(profilesData.profiles || [])
      .flatMap(([profileName, profile]) => {
        const player = { name: profile.name || profileName, teamId: profile.teamId };
        return [
          { field: "position", value: hooks.getLocalizedPlayerPosition(player, profile) },
          { field: "club", value: hooks.getLocalizedPlayerClubLine(player, profile) }
        ]
          .filter((entry) => hasLowercaseLatinWord(entry.value))
          .map((entry) => ({ player: profileName, ...entry }));
      })
      .slice(0, 20);
  });
  assert(
    chinesePlayerCardLocalizationLeaks.length === 0,
    `Chinese current player-card position and club lines should not leak English words. Leaks: ${JSON.stringify(chinesePlayerCardLocalizationLeaks)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-23&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="portugal-uzbekistan-2026-06-23"]').click();
  const portugalChineseScorerText = await page.locator("#match-info .scorer-highlight").innerText();
  assert(
    portugalChineseScorerText.includes("努诺·门德斯") &&
      portugalChineseScorerText.includes("阿卜杜沃希德·内马托夫") &&
      portugalChineseScorerText.includes("拉斐尔·莱奥") &&
      !/Nuno Mendes|Abduvohid Nematov|Rafael Le(?:ao|ão)/.test(portugalChineseScorerText),
    "Chinese Portugal scorer highlights should localize newly loaded scorer and own-goal names."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-26&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="norway-france-2026-06-26"]').click();
  const dembeleChineseLink = page
    .locator("#match-info .scorer-highlight .player-link", { hasText: "奥斯曼·登贝莱" })
    .first();
  await dembeleChineseLink.hover();
  const dembeleChineseCard = page.locator(".player-card:visible").first();
  await dembeleChineseCard.waitFor({ state: "visible" });
  assert(
    (await dembeleChineseCard.locator(".player-card-position").innerText()).trim() === "前锋、右边锋" &&
      (await dembeleChineseCard.locator(".player-card-club").innerText()).trim() === "巴黎圣日耳曼（法甲）",
    "Chinese Ousmane Dembele scorer card should localize the compound position and club league."
  );
  const aasgaardChineseLink = page
    .locator("#match-info .scorer-highlight .player-link", { hasText: "泰洛·奥斯加德" })
    .first();
  await aasgaardChineseLink.hover();
  const aasgaardChineseCard = page.locator(".player-card:visible").first();
  await aasgaardChineseCard.waitFor({ state: "visible" });
  assert(
    (await aasgaardChineseCard.locator(".player-card-position").innerText()).trim() === "中场" &&
      (await aasgaardChineseCard.locator(".player-card-club").innerText()).trim() ===
        "格拉斯哥流浪者（苏格兰超级联赛）",
    "Chinese Thelo Aasgaard scorer card should localize Rangers and Scottish Premiership."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-25&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="japan-sweden-2026-06-25"]').click();
  const japanSwedenChineseInfo = await page.locator(".key-info-team").first().locator("p").innerText();
  assert(
    japanSwedenChineseInfo.includes("久保建英") &&
      japanSwedenChineseInfo.includes("堂安律") &&
      japanSwedenChineseInfo.includes("镰田大地") &&
      japanSwedenChineseInfo.includes("对阵瑞典") &&
      !/Takefusa Kubo|Ritsu Doan|Daichi Kamada|Ayase Ueda/.test(japanSwedenChineseInfo),
    "Chinese Japan key information should localize the Kubo-led Japan trio against Sweden."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-29&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="match-76-round-of-32-2026-06-29"]').click();
  const brazilJapanChineseInfo = await page.locator(".key-info-team p").evaluateAll((nodes) =>
    nodes.map((node) => node.innerText)
  );
  const brazilChineseInfo = brazilJapanChineseInfo[0] || "";
  const japanBrazilChineseInfo = brazilJapanChineseInfo[1] || "";
  assert(
    brazilChineseInfo.includes("内马尔-维尼修斯单挑加速") &&
      brazilChineseInfo.includes("堂安律-镰田大地配合速度") &&
      brazilChineseInfo.includes("内马尔已在小腿伤势后替补复出") &&
      brazilChineseInfo.includes("尽快让维尼修斯获得单挑空间") &&
      brazilChineseInfo.includes("日本可能把快速配合转化为禁区机会") &&
      !/巴西看点|球队特点|风格关键词|They want|the risk is|Neymar has returned|Vinicius isolated/.test(brazilChineseInfo),
    "Chinese Brazil key information should translate the latest compact Round of 32 note instead of falling back to generic team tags."
  );
  assert(
    japanBrazilChineseInfo.includes("堂安律-镰田大地配合速度") &&
      japanBrazilChineseInfo.includes("内马尔-维尼修斯单挑加速") &&
      japanBrazilChineseInfo.includes("久保建英膝伤后仍可能参与比赛") &&
      japanBrazilChineseInfo.includes("上田绮世和堂安律") &&
      japanBrazilChineseInfo.includes("巴西可能通过内马尔和维尼修斯撕开阵型") &&
      !/日本看点|球队特点|风格关键词|They want|the risk is|Kubo could play|Brazil breaking/.test(japanBrazilChineseInfo),
    "Chinese Japan key information should translate the latest Kubo Round of 32 note instead of falling back to generic team tags."
  );
  const chineseKeyInformationCoverageIssues = await page.evaluate(async () => {
    const translateTextToZh = window.__worldCupTestHooks?.localization?.translateTextToZh;
    if (typeof translateTextToZh !== "function") {
      return [{ fixtureId: "test-hooks", side: "all", issue: "missing localization test hook" }];
    }

    const fixturesResponse = await fetch(`data/fixtures.json?coverage=${Date.now()}`);
    const fixturesData = await fixturesResponse.json();
    const hasLatinLeak = (value) =>
      /[A-Za-zÀ-ÖØ-öø-ÿ][a-zà-öø-ÿ]{2,}/.test(
        String(value || "").replace(/\bFIFA\b/g, "")
      );
    const issues = [];

    for (const fixture of fixturesData.fixtures || []) {
      if (!fixture.homeTeamId || !fixture.awayTeamId || !fixture.keyInformation) {
        continue;
      }

      for (const side of ["home", "away"]) {
        const source = fixture.keyInformation?.[side];
        if (!source) {
          continue;
        }

        const translated = translateTextToZh(source);
        const stale =
          translated === source ||
          /Against |They want|The risk is|has to beat|led by|main names to track|key information/i.test(translated) ||
          /看点。.*球队特点：.*风格关键词：/.test(translated);

        if (stale || hasLatinLeak(translated)) {
          issues.push({
            fixtureId: fixture.id,
            side,
            issue: stale ? "stale-or-fallback" : "latin-leak",
            translated
          });
        }
      }
    }

    return issues.slice(0, 8);
  });
  assert(
    chineseKeyInformationCoverageIssues.length === 0,
    `Chinese key-information translator should cover every current confirmed fixture without stale English or generic fallback copy. Issues: ${JSON.stringify(chineseKeyInformationCoverageIssues)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-11&lang=en&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="mexico-south-africa-2026-06-11"]').click();
  const mexicoParagraphLinks = await page
    .locator(".key-info-team")
    .first()
    .locator("p .player-link")
    .evaluateAll((links) => links.map((link) => link.textContent.trim()));
  const normalizedMexicoParagraphLinks = mexicoParagraphLinks.map((text) =>
    text.normalize("NFD").replace(/\p{Diacritic}/gu, "")
  );
  assert(
    normalizedMexicoParagraphLinks.some((text) => text.includes("Gimenez")) &&
      normalizedMexicoParagraphLinks.some((text) => text.includes("Alvarez")),
    "Mexico's accented player aliases should link from the matchup paragraph."
  );
  const gimenezLink = page
    .locator(".key-info-team")
    .first()
    .locator("p .player-link", { hasText: /^Gim[eé]nez$/ })
    .first();
  await gimenezLink.hover();
  const gimenezCard = page.locator(".player-card:visible").first();
  await gimenezCard.waitFor({ state: "visible" });
  assert(
    (await gimenezLink.getAttribute("aria-label"))?.startsWith("Santiago Giménez:"),
    "Mexico's unaccented Gimenez paragraph alias should open Santiago Giménez's hover card."
  );
  assert(
    (await gimenezCard.locator(".player-card-name").innerText()).trim() === "Santiago Giménez" &&
      (await gimenezCard.locator(".player-card-position").innerText()).trim() === "Striker",
    "Player hover card should show the display name above the position."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-26&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="cabo-verde-saudi-arabia-2026-06-26"]').click();
  assert(
    (await page.locator("#match-info .standings-table .rank-pill").count()) >= 4,
    "Current match detail group standings should show FIFA ranking pills."
  );
  const expectedGroupHThirdPlaceCandidate = getExpectedThirdPlaceRaceRows().find(
    (candidate) => candidate.groupId === "H"
  );
  const matchInfoThirdPlacePill = page.locator("#match-info .third-place-pill").first();
  assert(
    expectedGroupHThirdPlaceCandidate &&
      (await matchInfoThirdPlacePill.getAttribute("data-tooltip")) ===
        getExpectedThirdPlaceStandingBadgeReason(expectedGroupHThirdPlaceCandidate),
    "Home match detail third-place race pills should explain whether the team is advancing or not advancing."
  );
  const matchInfoRankPill = page.locator("#match-info .standings-table .rank-pill").first();
  assert(
    (await matchInfoRankPill.getAttribute("data-tooltip")) ===
      "FIFA world ranking used for this 2026 tournament view." &&
      (await matchInfoRankPill.getAttribute("aria-label"))?.includes(
        "FIFA world ranking used for this 2026 tournament view."
      ),
    "FIFA ranking pills should explain the ranking source on hover and focus."
  );
  await matchInfoRankPill.hover();
  await page.waitForFunction(
    () => {
      const pill = document.querySelector("#match-info .standings-table .rank-pill");
      const tooltipStyle = pill ? getComputedStyle(pill, "::after") : null;
      return (
        tooltipStyle?.content.includes("FIFA world ranking used for this 2026 tournament view.") &&
        Number(tooltipStyle.opacity) > 0.9
      );
    },
    null,
    { timeout: 1000 }
  );
  const vozinhaLink = page.locator(".key-info-team .player-link", { hasText: "Vozinha" }).first();
  assert(
    (await vozinhaLink.count()) === 1,
    "Single-name player aliases should link from key information."
  );
  await vozinhaLink.hover();
  const vozinhaCard = page.locator(".player-card:visible").first();
  await vozinhaCard.waitFor({ state: "visible" });
  assert(
    (await vozinhaCard.locator(".player-photo img, .player-photo-fallback").count()) === 1,
    "Single-name player hover cards should include a face or initials fallback."
  );

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-28&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="match-73-round-of-32-2026-06-28"]').click();
  const roundOf32DetailText = normalizeFlaggedText(await page.locator("#match-info").innerText());
  assert(
    roundOf32DetailText.includes("Previous: Group round") &&
      roundOf32DetailText.includes("South Africa won against South Korea (1-0), tied against Czechia (1-1), and lost to Mexico (0-2).") &&
      roundOf32DetailText.includes("Canada won against Qatar (6-0), tied against Bosnia and Herzegovina (1-1), and lost to Switzerland (1-2).") &&
      roundOf32DetailText.includes("Next: Round of 16") &&
      roundOf32DetailText.includes("Winner will face winner of") &&
      roundOf32DetailText.includes("Prediction") &&
      roundOf32DetailText.includes("Key information") &&
      roundOf32DetailText.includes("Past matches") &&
      !roundOf32DetailText.includes("bracket details are not loaded yet"),
    "Round of 32 match detail should summarize group-round form and the next winner path before normal prediction/context blocks."
  );
  const roundOf32ContextFlagMetrics = await page.locator("#match-info").evaluate((info) => ({
    groupRoundFlags: info.querySelectorAll(".knockout-context-list .knockout-context-team-flag .flag").length,
    nextPathFlags: [...info.querySelectorAll(".knockout-next-line .knockout-context-team-flag .flag")].map(
      (flag) => flag.getAttribute("aria-label") || ""
    ),
    southKoreaNameAlignment: (() => {
      const target = [...info.querySelectorAll(".knockout-context-list .knockout-context-team")].find((team) =>
        team.textContent.includes("South Korea")
      );
      const firstWord = target?.querySelector(".knockout-context-team-start > span:last-child");
      const trailingText = [...(target?.childNodes || [])].find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.includes("Korea")
      );

      if (!target || !firstWord || !trailingText) {
        return { found: false };
      }

      const koreaStart = trailingText.textContent.indexOf("Korea");
      const range = document.createRange();
      range.setStart(trailingText, koreaStart);
      range.setEnd(trailingText, koreaStart + "Korea".length);
      const firstWordBox = firstWord.getBoundingClientRect();
      const trailingTextBox = range.getBoundingClientRect();
      const flagBox = target.querySelector(".knockout-context-team-flag .flag")?.getBoundingClientRect();
      return {
        found: true,
        firstRestCenterDelta: Math.abs(
          (firstWordBox.top + firstWordBox.bottom - trailingTextBox.top - trailingTextBox.bottom) / 2
        ),
        flagTextCenterDelta: flagBox
          ? Math.abs((flagBox.top + flagBox.bottom - firstWordBox.top - firstWordBox.bottom) / 2)
          : null
      };
    })()
  }));
  assert(
    roundOf32ContextFlagMetrics.groupRoundFlags >= 8 &&
      roundOf32ContextFlagMetrics.nextPathFlags.includes("Netherlands flag") &&
      roundOf32ContextFlagMetrics.nextPathFlags.includes("Morocco flag") &&
      roundOf32ContextFlagMetrics.nextPathFlags.length >= 2 &&
      roundOf32ContextFlagMetrics.southKoreaNameAlignment.found &&
      roundOf32ContextFlagMetrics.southKoreaNameAlignment.firstRestCenterDelta <= 0.5 &&
      roundOf32ContextFlagMetrics.southKoreaNameAlignment.flagTextCenterDelta <= 2,
    `Round of 32 match detail should show flags for projected and confirmed next-path teams. Measured ${JSON.stringify(roundOf32ContextFlagMetrics)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-29&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="match-76-round-of-32-2026-06-29"]').click();
  const unconfirmedRoundOf32DetailText = normalizeFlaggedText(await page.locator("#match-info").innerText());
  assert(
    unconfirmedRoundOf32DetailText.includes("Brazil won against Haiti (3-0) and Scotland (3-0) and tied against Morocco (1-1).") &&
      unconfirmedRoundOf32DetailText.includes("Japan won against Tunisia (4-0) and tied against Netherlands (2-2) and Sweden (1-1).") &&
      !unconfirmedRoundOf32DetailText.includes("Group F runner-up is not confirmed yet."),
    "Round of 32 match detail should summarize both teams once the opponent slot is locked."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-07-04&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="match-89-round-of-16-2026-07-04"]').click();
  const roundOf16DetailText = normalizeFlaggedText(await page.locator("#match-info").innerText());
  assert(
    roundOf16DetailText.includes("Previous: Round of 32") &&
      roundOf16DetailText.includes("is scheduled.") &&
      roundOf16DetailText.includes("Next: Quarter-finals") &&
      roundOf16DetailText.includes("Winner will face winner of") &&
      roundOf16DetailText.includes("Prediction") &&
      !roundOf16DetailText.includes("Previous: Group round") &&
      !roundOf16DetailText.includes("bracket details are not loaded yet"),
    "Round of 16 and later match detail should summarize the previous knockout round instead of group standings."
  );
  const roundOf16ContextFlagMetrics = await page.locator("#match-info").evaluate((info) => ({
    previousRoundFlags: info.querySelectorAll(".knockout-context-list .knockout-context-team-flag .flag").length,
    nextPathFlags: info.querySelectorAll(".knockout-next-line .knockout-context-team-flag .flag").length
  }));
  assert(
    roundOf16ContextFlagMetrics.previousRoundFlags >= 4 &&
      roundOf16ContextFlagMetrics.nextPathFlags >= 2,
    `Round of 16 and later match detail should show projected and confirmed flags in source and next-path matchups. Measured ${JSON.stringify(roundOf16ContextFlagMetrics)}.`
  );

  await page.setViewportSize({ width: 540, height: 760 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-24&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="scotland-brazil-2026-06-24"]');
  const midWidthCompletedRowMetrics = await page
    .locator('[data-match-id="scotland-brazil-2026-06-24"]')
    .evaluate((row) => {
      const teams = row.querySelector(".match-teams");
      const score = row.querySelector(".match-score");
      const teamsBox = teams.getBoundingClientRect();
      const scoreBox = score?.getBoundingClientRect();

      return {
        gapToScore: scoreBox ? scoreBox.left - teamsBox.right : null,
        lineHeight: Number.parseFloat(getComputedStyle(teams).lineHeight),
        rankCount: row.querySelectorAll(".match-teams .rank-pill").length,
        rowHeight: row.getBoundingClientRect().height,
        scrollOverflow: row.scrollWidth - row.clientWidth,
        teamsHeight: teamsBox.height,
        text: row.innerText.replace(/\s+/g, " ").trim()
      };
  });
  assert(
    /^3:00PM Scotland\s*vs/.test(midWidthCompletedRowMetrics.text) &&
      midWidthCompletedRowMetrics.rankCount === 0 &&
      midWidthCompletedRowMetrics.teamsHeight <= midWidthCompletedRowMetrics.lineHeight * 1.25 &&
      midWidthCompletedRowMetrics.gapToScore >= 16 &&
      midWidthCompletedRowMetrics.rowHeight <= 32 &&
      midWidthCompletedRowMetrics.scrollOverflow <= 1,
    `Completed mid-width rows should hide rank pills and use available space instead of wrapping before the away team. Measured ${JSON.stringify(midWidthCompletedRowMetrics)}.`
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-24&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  const openMatchDetailById = async (matchId, expectedSummaryText) => {
    await page.locator(`[data-match-id="${matchId}"]`).evaluateAll((rows, id) => {
      const visibleRow = rows.find((row) => {
        const bounds = row.getBoundingClientRect();
        const style = getComputedStyle(row);

        return bounds.width > 0 && bounds.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      });

      if (!visibleRow) {
        throw new Error(`No visible match row found for ${id}.`);
      }

      visibleRow.click();
    }, matchId);
    await page.waitForFunction(
      (expectedText) =>
        [...document.querySelectorAll("#match-info .summary-title")].some((summary) => {
          const bounds = summary.getBoundingClientRect();
          const style = getComputedStyle(summary);

          return (
            bounds.width > 0 &&
            bounds.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            summary.textContent.includes(expectedText)
          );
        }),
      expectedSummaryText
    );
  };

  await openMatchDetailById("bosnia-qatar-2026-06-24", "Qatar");
  assert(
    (await page.locator("#match-info .standing-status-pill.is-eliminated", { hasText: "Eliminated" }).count()) === 1,
    "Match detail group standings should mark eliminated teams after a group is complete."
  );
  await page.setViewportSize({ width: 696, height: 760 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-24&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await openMatchDetailById("bosnia-qatar-2026-06-24", "Qatar");
  const qatarStandingTeamSelector = "#match-info .standings-table tbody .standing-team";
  const readQatarStandingBadgeLayout = async () => {
    const layoutHandle = await page.waitForFunction((selector) => {
      const teams = [...document.querySelectorAll(selector)];
      const isVisibleQatarTeam = (team) => {
        const bounds = team.getBoundingClientRect();
        const style = getComputedStyle(team);

        return (
          team.textContent.includes("Qatar") &&
          bounds.width > 0 &&
          bounds.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      };
      const candidates = teams
        .filter((team) => team.textContent.includes("Qatar"))
        .map((team) => {
          const bounds = team.getBoundingClientRect();
          const style = getComputedStyle(team);

          return {
            height: Math.round(bounds.height),
            text: team.textContent.replace(/\s+/g, " ").trim(),
            visible: bounds.width > 0 && bounds.height > 0 && style.display !== "none" && style.visibility !== "hidden",
            width: Math.round(bounds.width)
          };
        });
      const team = teams.find(isVisibleQatarTeam);

      if (!team) {
        return false;
      }

      const rect = (node) => {
        const bounds = node?.getBoundingClientRect();

        return bounds
          ? {
              top: Math.round(bounds.top),
              left: Math.round(bounds.left),
              width: Math.round(bounds.width),
              height: Math.round(bounds.height)
            }
          : null;
      };

      return {
        candidates,
        name: rect(team.querySelector(".standing-name")),
        badgeRow: rect(team.querySelector(".standing-badge-row")),
        rank: rect(team.querySelector(".rank-pill")),
        eliminated: rect(team.querySelector(".standing-status-pill.is-eliminated"))
      };
    }, qatarStandingTeamSelector);

    return layoutHandle.jsonValue();
  };
  const qatarWideBadgeLayout = await readQatarStandingBadgeLayout();
  assert(
    qatarWideBadgeLayout.name &&
      qatarWideBadgeLayout.rank &&
      qatarWideBadgeLayout.eliminated &&
      Math.abs(qatarWideBadgeLayout.name.top - qatarWideBadgeLayout.rank.top) <= 3 &&
      Math.abs(qatarWideBadgeLayout.name.top - qatarWideBadgeLayout.eliminated.top) <= 3,
    `Short eliminated standings rows should keep the name, ranking, and status on one line when space allows. Measured ${JSON.stringify(qatarWideBadgeLayout)}.`
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-24&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await openMatchDetailById("bosnia-qatar-2026-06-24", "Qatar");
  const qatarMobileBadgeLayout = await readQatarStandingBadgeLayout();
  assert(
    qatarMobileBadgeLayout.name &&
      qatarMobileBadgeLayout.rank &&
      qatarMobileBadgeLayout.eliminated &&
      qatarMobileBadgeLayout.badgeRow &&
      qatarMobileBadgeLayout.rank.left >= qatarMobileBadgeLayout.badgeRow.left &&
      Math.abs(qatarMobileBadgeLayout.rank.top - qatarMobileBadgeLayout.eliminated.top) <= 3 &&
      qatarMobileBadgeLayout.name.top < qatarMobileBadgeLayout.rank.top,
    `Short eliminated standings rows should wrap the rank and status together on narrow screens. Measured ${JSON.stringify(qatarMobileBadgeLayout)}.`
  );
  await page.setViewportSize({ width: 1180, height: 760 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-25&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await openMatchDetailById("ecuador-germany-2026-06-25", "Germany");
  const ecuadorGermanySummaryGap = await page.locator("#match-info .summary-title").evaluate((summary) => {
    const homeTeam = summary.querySelector(".summary-team:first-of-type");
    const versus = summary.querySelector(".versus");
    const awayTeam = summary.querySelector(".summary-team:last-of-type");
    const ranks = Array.from(summary.querySelectorAll(".rank-pill"));
    const homeRect = homeTeam?.getBoundingClientRect();
    const versusRect = versus?.getBoundingClientRect();
    const awayRect = awayTeam?.getBoundingClientRect();
    const rankRects = ranks.map((rank) => rank.getBoundingClientRect());
    const rankFontSizes = ranks.map((rank) => Number.parseFloat(getComputedStyle(rank).fontSize));

    return {
      homeToVs: homeRect && versusRect ? Math.round(versusRect.left - homeRect.right) : null,
      maxRankFontSize: Math.max(0, ...rankFontSizes),
      maxRankHeight: Math.max(0, ...rankRects.map((rect) => rect.height)),
      rankCount: ranks.length,
      vsToAway: versusRect && awayRect ? Math.round(awayRect.left - versusRect.right) : null,
      text: summary.textContent.replace(/\s+/g, " ").trim()
    };
  });
  assert(
    ecuadorGermanySummaryGap.homeToVs >= 0 &&
      ecuadorGermanySummaryGap.homeToVs <= 8 &&
      ecuadorGermanySummaryGap.rankCount === 2 &&
      ecuadorGermanySummaryGap.maxRankHeight <= 18 &&
      ecuadorGermanySummaryGap.maxRankFontSize <= 11 &&
      ecuadorGermanySummaryGap.vsToAway >= 0 &&
      ecuadorGermanySummaryGap.vsToAway <= 8,
    `Ecuador vs Germany detail heading should keep compact spacing around vs with small world-rank pills in the title. Measured ${JSON.stringify(ecuadorGermanySummaryGap)}.`
  );
  await openMatchDetailById("turkiye-united-states-2026-06-25", "United States");
  assert(
    (await page.locator("#match-info .standing-team", { hasText: "Türkiye" }).locator(".standing-status-pill.is-eliminated").innerText()) === "Eliminated",
    "Match detail group standings should mathematically mark eliminated teams before their group is complete."
  );

  await page.locator("#matches-tab").focus();
  await page.keyboard.press("ArrowRight");
  assert(
    await page.locator("#standings-tab").evaluate((tab) => tab.getAttribute("aria-selected") === "true"),
    "Arrow key navigation should activate the Standings tab."
  );

  const visibility = await page.evaluate(() => ({
    matchesDisplay: getComputedStyle(document.querySelector("#matches-view")).display,
    standingsDisplay: getComputedStyle(document.querySelector("#standings-view")).display
  }));
  assert(visibility.matchesDisplay === "none", "Matches panel should be hidden on Standings.");
  assert(visibility.standingsDisplay !== "none", "Standings panel should be visible.");

  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto(`${baseUrl}?view=standings&standingsMode=groups`, { waitUntil: "load" });
  await page.waitForSelector('.standings-card[data-group-id="C"] .standing-team');
  const scotlandStandingTeam = page
    .locator('.standings-card[data-group-id="C"] .standing-team', { hasText: "Scotland" })
    .first();
  const scotlandBadgeLayoutState = await scotlandStandingTeam.evaluate((team) => {
    const name = team.querySelector(".standing-name");
    const badge = team.querySelector(".third-place-pill");
    const nameRect = name?.getBoundingClientRect();

    return {
      badgeText: badge?.textContent.trim() || "",
      nameText: name?.textContent.trim() || "",
      nameWidth: nameRect?.width || 0,
      whiteSpace: name ? getComputedStyle(name).whiteSpace : "",
      hasBadgeClass: team.classList.contains("has-standing-badges"),
      hasTooltipClass: team.classList.contains("has-name-tooltip")
    };
  });
  assert(
    scotlandBadgeLayoutState.hasBadgeClass &&
      scotlandBadgeLayoutState.nameText === "Scotland" &&
      scotlandBadgeLayoutState.nameWidth > 40 &&
      scotlandBadgeLayoutState.whiteSpace === "normal" &&
      scotlandBadgeLayoutState.badgeText.includes("3rd race") &&
      !scotlandBadgeLayoutState.hasTooltipClass,
    "Badge-bearing standings rows should keep the team name visible instead of collapsing into a tooltip-only row."
  );

  const truncatedStandingTeam = page
    .locator(".standings-card[data-group-id] .standing-team.has-name-tooltip:not(.has-standing-badges)")
    .first();
  assert(
    (await truncatedStandingTeam.count()) > 0,
    "Current standings should include at least one non-badge row that needs a full-name tooltip."
  );
  const truncatedStandingTooltipState = await truncatedStandingTeam.evaluate((team) => ({
    anchor: team.style.getPropertyValue("--name-tooltip-anchor"),
    hasBadgeClass: team.classList.contains("has-standing-badges"),
    hasTooltipClass: team.classList.contains("has-name-tooltip"),
    nameText: team.querySelector(".standing-name")?.textContent.trim() || "",
    title: team.getAttribute("title"),
    tooltip: team.getAttribute("data-tooltip")
  }));
  assert(
    truncatedStandingTooltipState.hasTooltipClass &&
      !truncatedStandingTooltipState.hasBadgeClass &&
      truncatedStandingTooltipState.nameText.length > 0 &&
      truncatedStandingTooltipState.title === truncatedStandingTooltipState.tooltip &&
      truncatedStandingTooltipState.tooltip.length > 0 &&
      truncatedStandingTooltipState.anchor.length > 0,
    "Truncated non-badge standings rows should expose a full-name tooltip with a usable anchor."
  );
  await truncatedStandingTeam.hover();
  await page.waitForTimeout(160);
  assert(
    (await truncatedStandingTeam.evaluate((team) => getComputedStyle(team, "::after").opacity)) === "1",
    "Hovering a truncated non-badge standings row should reveal the full-name tooltip."
  );
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto(`${baseUrl}?view=matches&date=2026-06-17&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator("#day-label").click();
  const calendarMonth = await page.locator("#calendar-month-label").evaluate((label) => ({
    text: label.textContent.trim(),
    visible: getComputedStyle(label).display !== "none"
  }));
  assert(calendarMonth.visible, "Calendar month label should be visible.");
  assert(/\w+ \d{4}/.test(calendarMonth.text), "Calendar month label should include month and year.");
  assert(
    await page.locator('#calendar-grid [data-day-key="2026-06-10"]').evaluate((button) => button.disabled),
    "Dates before the loaded World Cup schedule should be disabled."
  );
  assert(
    !(await page.locator('#calendar-grid [data-day-key="2026-06-11"]').evaluate((button) => button.disabled)),
    "The first loaded World Cup match date should be selectable."
  );
  assert(
    !(await page.locator("#calendar-prev-month").isDisabled()),
    "The calendar should page to the previous loaded World Cup month."
  );
  await page.locator("#calendar-prev-month").click();
  assert(
    (await page.locator("#calendar-month-label").innerText()).trim() === "December 2022",
    "The previous month control should jump from June 2026 to December 2022."
  );
  assert(
    !(await page.locator('#calendar-grid [data-day-key="2022-12-18"]').evaluate((button) => button.disabled)),
    "The 2022 World Cup final date should be selectable."
  );
  assert(
    await page.locator('#calendar-grid [data-day-key="2022-12-19"]').evaluate((button) => button.disabled),
    "Dates outside the 2022 World Cup should be disabled."
  );
  await page.locator("#calendar-prev-month").click();
  assert(
    (await page.locator("#calendar-month-label").innerText()).trim() === "November 2022",
    "The calendar should include the first 2022 tournament month."
  );
  assert(
    !(await page.locator('#calendar-grid [data-day-key="2022-11-20"]').evaluate((button) => button.disabled)),
    "The 2022 World Cup opening date should be selectable."
  );
  await page.locator("#calendar-next-month").click();
  await page.locator("#calendar-next-month").click();
  assert(
    (await page.locator("#calendar-month-label").innerText()).trim() === "June 2026",
    "The next month control should jump over empty years back to June 2026."
  );
  assert(
    !(await page.locator("#calendar-next-month").isDisabled()),
    "The calendar should page to the next loaded World Cup month."
  );
  await page.locator("#calendar-next-month").click();
  assert(
    (await page.locator("#calendar-month-label").innerText()).trim() === "July 2026",
    "The next month control should jump to July 2026."
  );
  assert(
    await page.locator('#calendar-grid [data-day-key="2026-07-08"]').evaluate((button) => button.disabled),
    "World Cup rest days should be disabled."
  );
  assert(
    await page.locator("#calendar-next-month").isDisabled(),
    "The calendar should stop at the final loaded World Cup month."
  );
  await page.locator("#calendar-prev-month").click();
  assert(
    (await page.locator("#calendar-month-label").innerText()).trim() === "June 2026",
    "The previous month control should return to the previous loaded World Cup month."
  );

  const calendarShortcutCheck = await openPageAtTime(
    "2026-06-18T16:00:00.000Z",
    "/?view=matches&date=2026-06-18&tz=America%2FLos_Angeles"
  );
  await calendarShortcutCheck.page.locator("#day-label").click();
  const yesterdayShortcut = calendarShortcutCheck.page.locator("#calendar-yesterday");
  const todayShortcut = calendarShortcutCheck.page.locator("#calendar-today");
  const yesterdayBox = await yesterdayShortcut.boundingBox();
  const todayBox = await todayShortcut.boundingBox();
  assert(yesterdayBox && todayBox, "Calendar shortcut buttons should be visible.");
  assert(
    yesterdayBox.x < todayBox.x,
    "The Yesterday shortcut should sit to the left of Today."
  );
  assert(
    !(await yesterdayShortcut.isDisabled()),
    "The Yesterday shortcut should be selectable when yesterday has matches."
  );
  await yesterdayShortcut.click();
  assert(
    (await calendarShortcutCheck.page.locator("#day-label").innerText()).trim() === "Jun 17",
    "The Yesterday shortcut should jump to the previous calendar day."
  );
  await calendarShortcutCheck.context.close();

  await page.goto(`${baseUrl}?view=matches&date=2022-11-20&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  assert(
    (await page.locator("#day-label").innerText()).trim() === "Nov 20, 2022",
    "Historical dated links should include the year in the date label."
  );
  assert(
    (await page.locator(".match-row").first().innerText()).includes("Qatar"),
    "Historical dates should render archived World Cup matches."
  );
  await page.locator(".match-row").first().click();
  const historicalGroupDetailText = await page.locator("#match-info").innerText();
  assert(
    historicalGroupDetailText.includes("World Cup 2022"),
    "Historical match details should show tournament context."
  );
  assert(
    historicalGroupDetailText.includes("Group standings"),
    "Historical group matches should show computed group standings."
  );
  assert(
    (await page.locator("#match-info .standings-table .flag").count()) >= 4,
    "Historical match group standings should render team flags."
  );
  assert(
    historicalGroupDetailText.includes("Prediction") &&
      historicalGroupDetailText.includes("Result") &&
      historicalGroupDetailText.includes("Key information") &&
      historicalGroupDetailText.includes("Past matches"),
    "Historical match details should follow the current detail section structure."
  );
  assert(
    historicalGroupDetailText.includes("Ecuador beat Qatar 2-0") &&
      historicalGroupDetailText.includes("Ecuador took three points from World Cup 2022 / Group A"),
    "Historical result details should summarize the archived final score."
  );
  const historicalResultHighlights = await page
    .locator("#match-info .result-highlights li")
    .evaluateAll((items) => items.map((item) => item.textContent.replace(/\s+/g, " ").trim()));
  const historicalScorerHighlight = await page.locator("#match-info .scorer-highlight").evaluate((item) => {
    const segments = [...item.querySelectorAll(".goal-scorer-segment")];
    return {
      hasStandaloneSoccerIcon: [...item.children].some((child) => child.textContent.trim() === "⚽"),
      segmentFlags: segments.map((segment) => {
        const flag = segment.querySelector(".goal-scorer-flag .flag");
        return {
          label: flag?.getAttribute("aria-label") || "",
          hasFlag: Boolean(flag)
        };
      }),
      segmentTexts: segments.map((segment) => segment.textContent.replace(/\s+/g, " ").trim())
    };
  });
  assert(
    !historicalScorerHighlight.hasStandaloneSoccerIcon &&
      historicalScorerHighlight.segmentFlags.every(
        (flag) => flag.hasFlag && flag.label === "Ecuador flag"
      ) &&
      historicalScorerHighlight.segmentTexts.some((text) => text.includes("16' Enner Valencia")) &&
      historicalScorerHighlight.segmentTexts.some((text) => text.includes("31' Enner Valencia")),
    "Historical result details should show full-strength country flags before archived scorer names and minutes."
  );
  assert(
    (await page.locator("#match-info .scorer-highlight .player-link", { hasText: "Enner Valencia" }).count()) === 2,
    "Historical scorer names should open player cards."
  );
  assert(
    (await page.locator("#match-info .key-info-team .player-link").count()) >= 6,
    "Historical key information should link era-specific key-player names."
  );
  const historicalScorerLink = page.locator("#match-info .scorer-highlight .player-link", { hasText: "Enner Valencia" }).first();
  await historicalScorerLink.hover();
  const historicalScorerCard = page.locator(".player-card:visible").first();
  await historicalScorerCard.waitFor({ state: "visible" });
  const historicalScorerCardText = await historicalScorerCard.innerText();
  assert(
      historicalScorerCardText.includes("Enner Valencia") &&
      historicalScorerCardText.includes("Forward") &&
      historicalScorerCardText.includes("Ecuador 2022 World Cup archive") &&
      historicalScorerCardText.includes("Ecuador 2022 archive: front-line scoring threat") &&
      historicalScorerCardText.includes("2022 age 33") &&
      historicalScorerCardText.includes("Peak value €11m") &&
      !historicalScorerCardText.includes("scored 2 goals in this match"),
    "Historical player cards should use archive-style profile copy instead of raw match-event notes."
  );
  const historicalNarrativeHighlights = historicalResultHighlights.filter(
    (text) => !text.includes("16' Enner Valencia") && !text.includes("31' Enner Valencia")
  );
  assert(
    historicalNarrativeHighlights.length >= 2 &&
      historicalNarrativeHighlights.every((text) => text.length <= 95) &&
      historicalNarrativeHighlights.some((text) => text.startsWith("🌟")),
    "Historical result bullets should stay compact and use the rewritten outcome/moment/impact style."
  );
  assert(
    !historicalGroupDetailText.includes("Archived result shown instead of a pre-match probability"),
    "Historical match details should use the back-then prediction card instead of the archive-only result copy."
  );
  assert(
    historicalGroupDetailText.includes("Qatar's 2022 match lens runs through Akram Afif, Almoez Ali, and Abdulaziz Hatem") &&
      historicalGroupDetailText.includes("Against Ecuador, Qatar had to beat Ecuador's scoring threat through Enner Valencia") &&
      historicalGroupDetailText.includes("Ecuador's 2022 match lens runs through Enner Valencia"),
    "Historical key information should use era-specific roster and matchup copy."
  );
  assert(
    !historicalGroupDetailText.includes("Source") && !historicalGroupDetailText.includes("Goals"),
    "Historical match details should not show source or goals sections."
  );

  await page.goto(`${baseUrl}?view=matches&date=1970-06-21&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator(".match-row").first().click();
  const scorerOnlyHistoricalLink = page.locator("#match-info .scorer-highlight .player-link", { hasText: "Carlos Alberto" }).first();
  await scorerOnlyHistoricalLink.hover();
  const scorerOnlyHistoricalCard = page.locator(".player-card:visible").first();
  await scorerOnlyHistoricalCard.waitFor({ state: "visible" });
  const scorerOnlyHistoricalCardText = await scorerOnlyHistoricalCard.innerText();
  assert(
    scorerOnlyHistoricalCardText.includes("Carlos Alberto") &&
      scorerOnlyHistoricalCardText.includes("Brazil 1970 World Cup archive") &&
      scorerOnlyHistoricalCardText.includes("Brazil 1970 archive: player reference, with 1 World Cup goal.") &&
      !scorerOnlyHistoricalCardText.includes("credited with 1 World Cup goal"),
    "Historical scorer-only names should use the generated archive card profile."
  );

  await page.goto(`${baseUrl}?view=matches&date=1930-07-13&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator(".match-row").first().click();
  const firstHistoricalDetailText = await page.locator("#match-info").innerText();
  assert(
    firstHistoricalDetailText.includes("World Cup 1930") &&
      firstHistoricalDetailText.includes("France beat Mexico 4-1") &&
      firstHistoricalDetailText.includes("France took three points from World Cup 1930 / Group 1"),
    "Historical result details should reach back to the first loaded World Cup match."
  );

  await page.goto(`${baseUrl}?view=matches&date=2022-12-14&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator(".match-row").first().click();
  const historicalKnockoutDetailText = await page.locator("#match-info").innerText();
  assert(
    historicalKnockoutDetailText.includes("Knockout context") &&
      historicalKnockoutDetailText.includes("France vs Morocco") &&
      historicalKnockoutDetailText.includes("Argentina vs France"),
    "Historical knockout matches should show bracket context."
  );
  assert(
    !historicalKnockoutDetailText.includes("Half-time") &&
      (await page.locator(".historical-goals").count()) === 0,
    "Historical knockout detail should avoid the old facts/goals record layout."
  );

  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector(".match-row");
  const beforeTimeZoneText = await page.locator("#day-label").innerText();
  assert(beforeTimeZoneText.trim() === "Today", "Initial default date should be Today.");
  await page.locator("#settings-button").click();
  assert(
    await page.locator("#settings-popover").isVisible(),
    "Settings should reveal language and timezone controls."
  );
  await page.locator("#timezone-select").selectOption("Asia/Tokyo");
  assert(
    (await page.locator("#day-label").innerText()).trim() === "Today",
    "Changing timezone while viewing Today should keep the view on Today."
  );
  assert(
    (await page.evaluate(() => localStorage.getItem("world-cup-simplified-timezone"))) === "Asia/Tokyo",
    "Changing timezone should persist the selection for account-free reloads."
  );
  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector(".match-row");
  assert(
    (await page.locator("#timezone-select").inputValue()) === "Asia/Tokyo",
    "A saved timezone should be restored on a clean visit without requiring an account."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-18&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  const datedLinkLabel = (await page.locator("#day-label").innerText()).trim();
  assert(
    datedLinkLabel === "Jun 18" || datedLinkLabel === "Today",
    "Dated links should open the requested match date."
  );
  assert(
    (await page.locator(".yesterday-section").count()) === 1,
    "Past 24 hours banner should be shown by default when previous-day matches are available."
  );
  assert(
    (await page.locator(".yesterday-section-header h2").innerText()).includes("Past 24 hours (Jun 17)"),
    "Previous-day match banner should use the Past 24 hours title with an abbreviated date."
  );
  assert(
    (await page.locator(".yesterday-dismiss-icon").count()) === 1,
    "Past 24 hours dismiss control should render an icon glyph."
  );
  await page.locator(".yesterday-dismiss").click();
  assert(
    (await page.evaluate(() => localStorage.getItem("world-cup-simplified-show-yesterday"))) === "false",
    "Closing the Past 24 hours banner should persist the account-free display preference."
  );
  assert(
    (await page.locator(".yesterday-section").count()) === 0,
    "Closing the Past 24 hours banner should hide it immediately."
  );
  await page.goto(`${baseUrl}?view=matches&date=2026-06-18&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  assert(
    (await page.locator(".yesterday-section").count()) === 0,
    "A closed Past 24 hours banner should stay hidden on reload."
  );
  await page.setViewportSize({ width: 640, height: 720 });
  await page.waitForTimeout(480);
  await page.locator(".match-row").first().click();
  await page.waitForSelector("#match-info:not(.is-hidden)");
  const suppressedYesterdayMobileGap = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("#match-list > .match-row"));
    const lastTodayRow = rows.at(-1);
    const matchInfo = document.querySelector("#match-info");
    const matchLayout = document.querySelector(".match-layout");

    if (!lastTodayRow || !matchInfo || !matchLayout) {
      return null;
    }

    const rowRect = lastTodayRow.getBoundingClientRect();
    const infoRect = matchInfo.getBoundingClientRect();
    const layoutStyle = getComputedStyle(matchLayout);
    return {
      actual: Math.round(infoRect.top - rowRect.bottom),
      expected: Math.round(parseFloat(layoutStyle.rowGap || layoutStyle.gap))
    };
  });
  assert(
    suppressedYesterdayMobileGap &&
      Math.abs(suppressedYesterdayMobileGap.actual - suppressedYesterdayMobileGap.expected) <= 5,
    `Dismissed Past 24 hours mobile layout should preserve the normal gap between today's rows and the match detail card. Measured ${JSON.stringify(suppressedYesterdayMobileGap)}.`
  );
  await page.locator("#settings-button").click();
  assert(
    await page.evaluate(() => document.querySelector("#show-yesterday-toggle")?.checked === false),
    "Closing the Past 24 hours banner should also turn off the Show past 24 hours setting."
  );
  await page.locator(".settings-toggle-control").click();
  assert(
    (await page.locator(".yesterday-section").count()) === 1 &&
      (await page.evaluate(() => localStorage.getItem("world-cup-simplified-show-yesterday"))) === "true",
    "Turning Show past 24 hours back on should restore the Past 24 hours banner."
  );
  await page.keyboard.press("Escape");
  assert(
    !(await page.locator("#settings-popover").isVisible()),
    "Settings should close before testing match-row interactions underneath it."
  );
  await page.setViewportSize({ width: 640, height: 720 });
  await page.waitForTimeout(80);
  const switzerlandBosniaRow = page.locator('[data-match-id="switzerland-bosnia-2026-06-18"]');
  const bosniaMatchTeam = switzerlandBosniaRow.locator(".team", {
    hasText: "Bosnia and Herzegovina"
  });
  const qatarMatchTeam = page.locator('[data-match-id="canada-qatar-2026-06-18"] .team', {
    hasText: "Qatar"
  });
  assert(
    !(await qatarMatchTeam.evaluate((team) => team.classList.contains("has-team-tooltip"))),
    "Short match row names should not show full-name tooltips when they are not truncated."
  );
  const bosniaScoreAlignment = await switzerlandBosniaRow.evaluate((row) => {
    const meta = row.querySelector(".match-row-meta");
    const score = row.querySelector(".match-score");
    const rowRect = row.getBoundingClientRect();
    const metaRect = meta?.getBoundingClientRect();
    const scoreRect = score?.getBoundingClientRect();
    const textPieces = Array.from(row.querySelectorAll(".match-teams .team-name, .match-teams .versus"));
    const rightmostTextRight = textPieces.reduce((right, piece) => {
      const range = document.createRange();
      range.selectNodeContents(piece);
      const rects = Array.from(range.getClientRects());
      range.detach();

      if (!rects.length) {
        return Math.max(right, piece.getBoundingClientRect().right);
      }

      return Math.max(right, ...rects.map((rect) => rect.right));
    }, rowRect.left);

    return {
      hasWrappedClass: row.classList.contains("has-wrapped-matchup"),
      metaGapFromText: metaRect ? Math.round(metaRect.left - rightmostTextRight) : null,
      rowScrollOverflow: row.scrollWidth - row.clientWidth,
      scoreRightGap: scoreRect ? Math.round(rowRect.right - scoreRect.right) : null
    };
  });
  assert(
    bosniaScoreAlignment.metaGapFromText >= 8 &&
      bosniaScoreAlignment.scoreRightGap >= 0 &&
      bosniaScoreAlignment.scoreRightGap <= 12 &&
      bosniaScoreAlignment.rowScrollOverflow <= 1,
    `Tablet match rows should keep score pills on the shared right edge without rank-pill overflow. Measured ${JSON.stringify(bosniaScoreAlignment)}.`
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(80);
  const bosniaMatchWrap = await bosniaMatchTeam.evaluate((team) => {
    const row = team.closest(".match-row");
    const name = team.querySelector(".team-name");
    const teams = team.closest(".match-teams");
    const score = row?.querySelector(".match-score");
    const rowBox = row?.getBoundingClientRect();
    const scoreBox = score?.getBoundingClientRect();
    const nameStyle = getComputedStyle(name);
    const teamsStyle = getComputedStyle(teams);
    const nameBox = name.getBoundingClientRect();
    return {
      hasTooltip: team.classList.contains("has-team-tooltip"),
      hasWrappedClass: row?.classList.contains("has-wrapped-matchup") || false,
      lineHeight: Number.parseFloat(teamsStyle.lineHeight),
      nameLabel: name.getAttribute("aria-label"),
      nameWidth: nameBox.width,
      overflow: nameStyle.overflow,
      scrollWidth: name.scrollWidth,
      scoreRightGap: rowBox && scoreBox ? Math.round(rowBox.right - scoreBox.right) : null,
      textOverflow: nameStyle.textOverflow,
      teamsHeight: teams.getBoundingClientRect().height,
      visibleWidth: name.clientWidth,
      whiteSpace: nameStyle.whiteSpace
    };
  });
  assert(
    bosniaMatchWrap.nameLabel === "Bosnia and Herzegovina" &&
      bosniaMatchWrap.whiteSpace === "normal" &&
      bosniaMatchWrap.overflow === "visible" &&
      bosniaMatchWrap.textOverflow === "clip" &&
      bosniaMatchWrap.nameWidth > 0 &&
      bosniaMatchWrap.teamsHeight > bosniaMatchWrap.lineHeight * 1.4 &&
      bosniaMatchWrap.hasWrappedClass &&
      bosniaMatchWrap.scoreRightGap >= 0 &&
      bosniaMatchWrap.scoreRightGap <= 12 &&
      !bosniaMatchWrap.hasTooltip,
    `Long match row names should wrap visibly instead of becoming tooltip-only truncation. Measured ${JSON.stringify(bosniaMatchWrap)}.`
  );
  await page.goto(`${baseUrl}?view=matches&date=2026-06-27&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForSelector(".match-row");
  await page.waitForTimeout(160);
  const chineseMatchNameWrap = await page.locator("#match-list > .match-row").evaluateAll((rows) =>
    rows.map((row) => {
      const rowBox = row.getBoundingClientRect();
      const nameMetrics = [...row.querySelectorAll(".match-teams .team-name")].map((name) => {
        const textNode = [...name.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
        const lineMap = new Map();

        if (textNode) {
          [...textNode.textContent].forEach((char, index) => {
            const range = document.createRange();
            range.setStart(textNode, index);
            range.setEnd(textNode, index + char.length);
            const rect = range.getBoundingClientRect();
            range.detach();
            const topKey = Math.round(rect.top);
            lineMap.set(topKey, (lineMap.get(topKey) || 0) + 1);
          });
        }

        return {
          label: name.getAttribute("aria-label") || name.textContent.trim(),
          lineCharCounts: [...lineMap.values()],
          width: Math.round(name.getBoundingClientRect().width)
        };
      });

      return {
        id: row.dataset.matchId || "",
        nameMetrics,
        rowScrollOverflow: Math.round(row.scrollWidth - row.clientWidth),
        rowWidth: Math.round(rowBox.width)
      };
    })
  );
  const chineseSingleColumnNames = chineseMatchNameWrap.flatMap((row) =>
    row.nameMetrics
      .filter(
        (metric) =>
          [...metric.label].length >= 3 &&
          metric.lineCharCounts.length >= 3 &&
          Math.max(...metric.lineCharCounts) <= 1
      )
      .map((metric) => ({ id: row.id, ...metric }))
  );
  assert(
    chineseSingleColumnNames.length === 0 &&
      chineseMatchNameWrap.every((row) => row.rowScrollOverflow <= 1),
    `Chinese match row names should not collapse into one-character columns on mobile. Measured ${JSON.stringify(chineseMatchNameWrap)}.`
  );
  await page.goto(`${baseUrl}?view=matches&date=2026-06-18&lang=en&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="switzerland-bosnia-2026-06-18"]');
  await page.setViewportSize({ width: 1280, height: 720 });
  await switzerlandBosniaRow.click();
  const finalMatchDetailText = await page.locator("#match-info").innerText();
  assert(
    finalMatchDetailText.includes("Result") &&
      finalMatchDetailText.includes("Prediction") &&
      finalMatchDetailText.includes("Switzerland beat Bosnia and Herzegovina 4-1."),
    "Final match details should keep the prediction card below the result."
  );

  const matchStateCheck = await openPageAtTime("2026-06-18T05:30:00.000Z");
  const june17Scores = await matchStateCheck.page.locator("#match-list > .match-row .match-score").evaluateAll((scores) =>
    scores.map((score) => score.textContent.trim())
  );
  assert(
    june17Scores.join("|") === "1-1|4-2|1-0|1-3",
    "The finalized Jun 17 match list should show all four score pills."
  );
  const livePillCount = await matchStateCheck.page.locator("#match-list .live-pill").count();
  if (livePillCount > 0) {
    assert(livePillCount === 1, "A live match should show one Live pill.");
    assert(
      (await matchStateCheck.page.locator(".match-row.is-live .match-score").innerText()).trim() === "2-2",
      "A loaded live score should be shown for the live match."
    );
    assert(
      (await matchStateCheck.page.locator(".up-next-pill").count()) === 0,
      "Up next should be hidden while a match is live."
    );
    assert(
      (await matchStateCheck.page.locator(".match-row.is-live").getAttribute("aria-label")).startsWith(
        "Live, England vs Croatia"
      ),
      "The live state should be shown for England vs Croatia."
    );
  } else {
    const upNextPillCount = await matchStateCheck.page.locator(".up-next-pill").count();
    if (upNextPillCount > 0) {
      assert(upNextPillCount === 1, "The next scheduled match should show one Up next pill.");
      assert(
        (await matchStateCheck.page.locator(".up-next-pill").innerText()).trim() === "Up next",
        "The Up next pill should use the expected label."
      );
    } else {
      const finalRows = await matchStateCheck.page.locator(".match-row .match-score").count();
      const totalRows = await matchStateCheck.page.locator(".match-row").count();
      assert(
        finalRows === totalRows,
        "If no Up next pill is shown in the mocked state, every listed match should be final."
      );
    }
  }
  await matchStateCheck.context.close();

  const japanSearchCheck = await openPageAtTime(
    "2026-06-21T21:00:00.000Z",
    "/?view=matches&team=japan&tz=America%2FLos_Angeles"
  );
  const japanSearchRows = await japanSearchCheck.page.locator(".match-row").evaluateAll((rows) =>
    rows.map((row) => ({
      dateTime: row.querySelector(".match-date")?.textContent.trim() || "",
      id: row.dataset.matchId,
      label: row.getAttribute("aria-label") || ""
    }))
  );
  assert(
    japanSearchRows.some((row) => row.id === "japan-sweden-2026-06-25"),
    "Japan country search should include Japan vs Sweden."
  );
  assert(
    japanSearchRows.every((row) => row.label.includes("Japan")) &&
      !japanSearchRows.some((row) => row.id === "panama-croatia-2026-06-23"),
    "Japan country search should not include Panama fixtures through the PAN team id."
  );
  assert(
    japanSearchRows.some(
      (row) =>
        row.id === "japan-sweden-2026-06-25" &&
        row.dateTime === "June 25 4:00PM" &&
        row.label.includes("June 25, 4:00PM")
    ),
    "Current country search rows should show and announce the match date and time on one line."
  );
  await japanSearchCheck.page.locator('[data-team-history-toggle="true"]').click();
  const japanArchiveRows = await japanSearchCheck.page
    .locator(".team-search-section.is-archive .match-row")
    .evaluateAll((rows) =>
      rows.map((row) => ({
        dateTime: row.querySelector(".match-date")?.textContent.trim() || "",
        label: row.getAttribute("aria-label") || ""
      }))
    );
  assert(
    japanArchiveRows.some(
      (row) =>
        /^June \d{1,2}, \d{4}$/.test(row.dateTime) &&
        !/\d{1,2}:\d{2}/.test(row.dateTime) &&
        row.label.includes(row.dateTime)
    ),
    "Archived country search rows should show and announce date-only labels with the year."
  );
  await japanSearchCheck.context.close();

  const japanChineseSearchCheck = await openPageAtTime(
    "2026-06-21T21:00:00.000Z",
    "/?view=matches&team=%E6%97%A5%E6%9C%AC&lang=zh&tz=America%2FLos_Angeles"
  );
  const japanChineseSearchRows = await japanChineseSearchCheck.page.locator(".match-row").evaluateAll((rows) =>
    rows.map((row) => ({
      id: row.dataset.matchId,
      label: row.getAttribute("aria-label") || ""
    }))
  );
  assert(
    japanChineseSearchRows.some((row) => row.id === "japan-sweden-2026-06-25"),
    "Chinese Japan country search should include Japan vs Sweden."
  );
  assert(
    japanChineseSearchRows.every((row) => row.label.includes("\u65e5\u672c")) &&
      !japanChineseSearchRows.some((row) => row.id === "panama-croatia-2026-06-23"),
    "Chinese Japan country search should not include Panama fixtures through the PAN team id."
  );
  assert(
    (await japanChineseSearchCheck.page.locator(".team-search-summary h2").innerText()).trim() ===
      "\u65e5\u672c",
    "Chinese Japan country search should show the localized team name in the heading."
  );
  await japanChineseSearchCheck.context.close();

  const panSearchCheck = await openPageAtTime(
    "2026-06-21T21:00:00.000Z",
    "/?view=matches&team=PAN&tz=America%2FLos_Angeles"
  );
  const panSearchRows = await panSearchCheck.page.locator(".match-row").evaluateAll((rows) =>
    rows.map((row) => ({
      id: row.dataset.matchId,
      label: row.getAttribute("aria-label") || ""
    }))
  );
  assert(
    panSearchRows.some((row) => row.id === "panama-croatia-2026-06-23"),
    "PAN country search should include Panama vs Croatia."
  );
  assert(
    panSearchRows.every((row) => row.label.includes("Panama")) &&
      !panSearchRows.some((row) => row.id === "japan-sweden-2026-06-25"),
    "PAN country search should not include Japan fixtures through text inside Japan."
  );
  await panSearchCheck.context.close();

  const liveFallbackScoreCheck = await openPageAtTime(
    "2026-06-18T16:05:00.000Z",
    "/?view=matches&date=2026-06-18&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const liveFixture = data.fixtures.find(
          (fixture) => fixture.id === "czechia-south-africa-2026-06-18"
        );
        liveFixture.status = "SCHEDULED";
        delete liveFixture.score;
      }
    }
  );
  const liveFallbackRow = liveFallbackScoreCheck.page.locator(
    '[data-match-id="czechia-south-africa-2026-06-18"]'
  );
  assert(
    (await liveFallbackRow.locator(".match-score").count()) === 0,
    "A live fixture without a loaded score should not show a fallback score."
  );
  const liveScoreLink = liveFallbackRow.locator(".live-pill");
  assert(
    (await liveScoreLink.count()) === 1,
    "A live fixture without a loaded score should show a Live score link."
  );
  assert(
    (await liveScoreLink.getAttribute("href")) === fifaWorldCupScoresUrl &&
      (await liveScoreLink.getAttribute("title")) === "Check latest score at FIFA" &&
      (await liveScoreLink.getAttribute("data-tooltip")) === "Check latest score at FIFA",
    "The live pill should link to FIFA scores and expose the hover tooltip copy."
  );
  const liveFallbackText = (await liveFallbackRow.innerText()).replace(/\s+/g, " ").trim();
  const liveFallbackUpperText = liveFallbackText.toUpperCase();
  const liveFallbackOrder = ["CZECHIA", "VS", "SOUTH AFRICA", "LIVE"].map((text) =>
    liveFallbackUpperText.indexOf(text)
  );
  assert(
    liveFallbackOrder.every((index) => index >= 0) &&
      liveFallbackOrder.every((index, itemIndex) => itemIndex === 0 || index > liveFallbackOrder[itemIndex - 1]),
    "A live fixture without a loaded score should keep vs between teams and show Live after the matchup."
  );
  assert(
    !liveFallbackText.includes("0-0"),
    "The visible live row text should not include a guessed 0-0 score."
  );
  const liveFallbackMetaText = await liveFallbackRow
    .locator(".match-row-meta > *")
    .evaluateAll((items) => items.map((item) => item.innerText.trim().toUpperCase()).join("|"));
  assert(
    liveFallbackMetaText === "LIVE|SCORE PENDING",
    "The live row should label score-pending state when no verified score is loaded."
  );
  assert(
    (await liveFallbackRow.locator(".score-status.is-pending").count()) === 1,
    "A live fixture without a loaded score should show Score pending."
  );
  assert(
    (await liveFallbackRow.innerText()).includes("Score pending"),
    "The visible live row text should include Score pending."
  );
  await liveFallbackScoreCheck.page.waitForTimeout(180);
  const liveTodayFocusState = await liveFallbackScoreCheck.page.locator("#match-list").evaluate((list) => {
    const liveRow = list.querySelector(":scope > .match-row.is-live");
    const fadedRows = Array.from(list.querySelectorAll(":scope > .match-row:not(.is-live)"));
    const yesterdaySection = list.querySelector(":scope > .yesterday-section");
    return {
      hasLiveTodayMatch: list.classList.contains("has-live-today-match"),
      liveOpacity: liveRow ? Number(getComputedStyle(liveRow).opacity) : 0,
      fadedOpacities: fadedRows.map((row) => Number(getComputedStyle(row).opacity)),
      yesterdaySectionOpacity: yesterdaySection ? Number(getComputedStyle(yesterdaySection).opacity) : null
    };
  });
  assert(
    liveTodayFocusState.hasLiveTodayMatch &&
      liveTodayFocusState.liveOpacity === 1 &&
      liveTodayFocusState.fadedOpacities.length > 0 &&
      liveTodayFocusState.fadedOpacities.every((opacity) => opacity < 0.6) &&
      liveTodayFocusState.yesterdaySectionOpacity !== null &&
      liveTodayFocusState.yesterdaySectionOpacity < 0.6,
    `When Today has a live match, non-live rows and the Past 24 hours section should fade while live rows stay full opacity. Measured ${JSON.stringify(liveTodayFocusState)}.`
  );
  await liveFallbackScoreCheck.page.setViewportSize({ width: 390, height: 844 });
  await liveFallbackScoreCheck.page.waitForTimeout(80);
  const liveFallbackLayout = await liveFallbackRow.evaluate((row) => {
    const hiddenNames = Array.from(row.querySelectorAll(".match-teams .team-name")).filter(
      (name) => name.scrollWidth > name.clientWidth + 1 && getComputedStyle(name).overflow !== "visible"
    );
    const rowRect = row.getBoundingClientRect();
    const scoreStatusRect = row.querySelector(".score-status")?.getBoundingClientRect();
    return {
      hiddenNameCount: hiddenNames.length,
      rowHeight: row.getBoundingClientRect().height,
      scrollOverflow: row.scrollWidth - row.clientWidth,
      statusRightGap: scoreStatusRect ? rowRect.right - scoreStatusRect.right : 0
    };
  });
  assert(
      liveFallbackLayout.hiddenNameCount === 0 &&
      liveFallbackLayout.rowHeight < 72 &&
      liveFallbackLayout.scrollOverflow <= 1 &&
      liveFallbackLayout.statusRightGap >= 2,
    `The live fallback row should wrap cleanly without hidden team names, horizontal overflow, or a clipped status pill. Measured ${JSON.stringify(liveFallbackLayout)}.`
  );
  await liveFallbackScoreCheck.page.setViewportSize({ width: 280, height: 760 });
  await liveFallbackScoreCheck.page.waitForTimeout(80);
  const liveTinyChipLayout = await getMatchRowMetaCollisionMetrics(liveFallbackScoreCheck.page);
  assertCleanMatchMetaLayout(
    liveTinyChipLayout,
    "Tiny live/current-score rows should keep live, score, and pending chips out of the matchup text."
  );
  await liveFallbackScoreCheck.context.close();

  const pendingScoreCheck = await openPageAtTime(
    "2026-06-18T05:30:00.000Z",
    "/?view=matches&date=2026-06-17&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const staleFixture = data.fixtures.find((fixture) => fixture.id === "ghana-panama-2026-06-17");
        staleFixture.status = "SCHEDULED";
        delete staleFixture.score;
      }
    }
  );
  const pendingScoreRow = pendingScoreCheck.page.locator('[data-match-id="ghana-panama-2026-06-17"]');
  assert(
    (await pendingScoreRow.locator(".score-status").innerText()).trim() === "Pending",
    "A post-match fixture with no loaded score should show a visible pending status."
  );
  assert(
    (await pendingScoreRow.getAttribute("aria-label")).includes("pending"),
    "A post-match fixture with no loaded score should expose the pending status to assistive tech."
  );
  await pendingScoreCheck.page.setViewportSize({ width: 280, height: 760 });
  await pendingScoreCheck.page.waitForTimeout(80);
  const pendingTinyChipLayout = await getMatchRowMetaCollisionMetrics(pendingScoreCheck.page);
  assertCleanMatchMetaLayout(
    pendingTinyChipLayout,
    "Tiny completed/pending rows should keep score and pending chips out of the matchup text."
  );
  await pendingScoreCheck.context.close();

  const compactLiveMatchupCheck = await openPageAtTime(
    "2026-06-25T21:08:00.000Z",
    "/?view=matches&date=2026-06-25&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const compactFixture = data.fixtures.find(
          (fixture) => fixture.id === "curacao-cote-divoire-2026-06-25"
        );
        const gutterFixture = data.fixtures.find(
          (fixture) => fixture.id === "ecuador-germany-2026-06-25"
        );
        compactFixture.status = "LIVE";
        compactFixture.score = { home: 0, away: 1 };
        gutterFixture.status = "LIVE";
        gutterFixture.score = { home: 1, away: 1 };
      }
    }
  );
  await compactLiveMatchupCheck.page.setViewportSize({ width: 390, height: 844 });
  await compactLiveMatchupCheck.page.waitForTimeout(80);
  const compactLiveMatchupMetrics = await getMobileMatchupGridMetrics(
    compactLiveMatchupCheck.page,
    "curacao-cote-divoire-2026-06-25"
  );
  assert(
    compactLiveMatchupMetrics.homeName?.text === "Curaçao" &&
      compactLiveMatchupMetrics.awayFlag?.text === "🇨🇮" &&
      compactLiveMatchupMetrics.awayName?.text === "Côte d'Ivoire" &&
      compactLiveMatchupMetrics.rankCount === 0,
    `Curaçao vs Côte d'Ivoire compact live row should render the expected teams without rank pills. Measured ${JSON.stringify(compactLiveMatchupMetrics)}.`
  );
  assertCompactMobileMatchupGrid(
    compactLiveMatchupMetrics,
    "Curaçao vs Côte d'Ivoire should use the compact mobile matchup grid when a live row does not fit."
  );
  const gutterLiveMatchupMetrics = await getMobileMatchupGridMetrics(
    compactLiveMatchupCheck.page,
    "ecuador-germany-2026-06-25"
  );
  assert(
    gutterLiveMatchupMetrics.homeName?.text === "Ecuador" &&
      gutterLiveMatchupMetrics.awayFlag?.text === "🇩🇪" &&
      gutterLiveMatchupMetrics.awayName?.text === "Germany" &&
      gutterLiveMatchupMetrics.rankCount === 0,
    `Ecuador vs Germany compact live row should render the expected teams without rank pills. Measured ${JSON.stringify(gutterLiveMatchupMetrics)}.`
  );
  assertCompactOrComfortableMobileMatchup(
    gutterLiveMatchupMetrics,
    "Ecuador vs Germany should use the compact mobile matchup grid only when the inline live row would crowd the LIVE pill."
  );
  assertCleanMatchMetaLayout(
    await getMatchRowMetaCollisionMetrics(compactLiveMatchupCheck.page, ".match-row.is-live"),
    "Compact live matchup rows should keep live and score chips out of the matchup text."
  );
  await compactLiveMatchupCheck.context.close();

  const nextScheduledFixture = fixturesData.fixtures
    .filter((fixture) => fixture.status === "SCHEDULED" && fixture.kickoffUtc)
    .sort((a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc))[0];
  if (nextScheduledFixture) {
    const nextKickoffUtc = nextScheduledFixture.kickoffUtc;
    const nextScheduledFixtureIds = fixturesData.fixtures
      .filter(
        (fixture) =>
          fixture.status === "SCHEDULED" &&
          fixture.kickoffUtc === nextKickoffUtc
      )
      .map((fixture) => fixture.id);
    const beforeKickoff = new Date(
      new Date(nextScheduledFixture.kickoffUtc).getTime() - 5 * 60 * 1000
    );
    const nextScheduledDate = getDayKeyForTimeZone(nextScheduledFixture.kickoffUtc);
    const upNextCheck = await openPageAtTime(
      beforeKickoff.toISOString(),
      `/?view=matches&date=${nextScheduledDate}&tz=America%2FLos_Angeles`,
      {
        fixtureTransform(data) {
          for (const fixture of data.fixtures || []) {
            if (fixture.status === "LIVE") {
              fixture.status = "FT";
              fixture.score ||= { home: 0, away: 0 };
            }
          }
        }
      }
    );
    await upNextCheck.page.waitForSelector(".match-row");
    assert(
      (await upNextCheck.page.locator(".up-next-pill").count()) === nextScheduledFixtureIds.length,
      "Every match at the next scheduled kickoff should show an Up next pill."
    );
    for (const fixtureId of nextScheduledFixtureIds) {
      assert(
        (await upNextCheck.page
          .locator(`.match-row[data-match-id="${fixtureId}"] .up-next-pill`)
          .count()) === 1,
        "Each next scheduled match row should show its own Up next pill."
      );
    }
    assert(
      (await upNextCheck.page.locator(".match-row.is-next").count()) === nextScheduledFixtureIds.length,
      "Every match at the next scheduled kickoff should use the next row state."
    );
    const upNextPillLabels = await upNextCheck.page.locator(".up-next-pill").evaluateAll((pills) =>
      pills.map((pill) => pill.textContent.trim())
    );
    assert(
      upNextPillLabels.every((label) => label === "Up next"),
      "Every Up next pill should use the expected label."
    );
    for (const width of [390, 430]) {
      await upNextCheck.page.setViewportSize({ width, height: 844 });
      await upNextCheck.page.waitForTimeout(80);
      const upNextRailMetrics = await upNextCheck.page.evaluate((fixtureIds) => {
        return fixtureIds.map((fixtureId) => {
          const row = document.querySelector(`.match-row[data-match-id="${fixtureId}"]`);
          const pill = row?.querySelector(".up-next-pill");
          const rowRect = row?.getBoundingClientRect();
          const pillRect = pill?.getBoundingClientRect();

          return {
            fixtureId,
            rightGap: rowRect && pillRect ? Math.round(rowRect.right - pillRect.right) : null,
            rowScrollOverflow: row ? row.scrollWidth - row.clientWidth : null
          };
        });
      }, nextScheduledFixtureIds);
      const rightGaps = upNextRailMetrics
        .map((metric) => metric.rightGap)
        .filter((gap) => Number.isFinite(gap));
      assert(
        rightGaps.length === nextScheduledFixtureIds.length &&
          rightGaps.every((gap) => gap >= 0 && gap <= 8) &&
          Math.max(...rightGaps) - Math.min(...rightGaps) <= 4 &&
          upNextRailMetrics.every((metric) => metric.rowScrollOverflow <= 1),
        `Mobile Up next pills should share the same right rail at ${width}px. Measured ${JSON.stringify(upNextRailMetrics)}.`
      );

      if (width === 390 && nextScheduledFixtureIds.includes("ecuador-germany-2026-06-25")) {
        const ecuadorGermanyVsPlacement = await upNextCheck.page
          .locator('[data-match-id="ecuador-germany-2026-06-25"]')
          .evaluate((row) => {
            const versus = row.querySelector(".versus");
            const versusRect = versus?.getBoundingClientRect();
            const sameLineTeamPieces = Array.from(row.querySelectorAll(".match-teams .team-name"))
              .filter((piece) => {
                const rect = piece.getBoundingClientRect();
                return versusRect && Math.abs(rect.top - versusRect.top) <= 1;
              })
              .map((piece) => piece.textContent.replace(/\s+/g, " ").trim());

            return {
              hasWrappedClass: row.classList.contains("has-wrapped-matchup"),
              rowScrollOverflow: row.scrollWidth - row.clientWidth,
              sameLineTeamPieces,
              text: row.innerText.replace(/\s+/g, " ").trim()
            };
          });
        assert(
          (!ecuadorGermanyVsPlacement.hasWrappedClass ||
            ecuadorGermanyVsPlacement.sameLineTeamPieces.length > 0) &&
            ecuadorGermanyVsPlacement.rowScrollOverflow <= 1,
          `Ecuador vs Germany should not leave vs alone on its own mobile line. Measured ${JSON.stringify(ecuadorGermanyVsPlacement)}.`
        );
      }

      if (width === 390 && nextScheduledFixtureIds.includes("curacao-cote-divoire-2026-06-25")) {
        const curacaoCoteWrap = await upNextCheck.page
          .locator('[data-match-id="curacao-cote-divoire-2026-06-25"]')
          .evaluate((row) => {
            const rect = (selector) => {
              const element = row.querySelector(selector);
              const bounds = element?.getBoundingClientRect();

              return bounds
                ? {
                    bottom: Math.round(bounds.bottom),
                    center: Math.round(bounds.top + bounds.height / 2),
                    height: Math.round(bounds.height),
                    left: Math.round(bounds.left),
                    right: Math.round(bounds.right),
                    text: element.textContent.replace(/\s+/g, " ").trim(),
                    top: Math.round(bounds.top),
                    width: Math.round(bounds.width)
                  }
                : null;
            };

            return {
              away: rect(".match-team-away"),
              awayFlag: rect(".match-team-away .flag"),
              awayName: rect(".match-team-away .team-name"),
              rankCount: row.querySelectorAll(".match-teams .rank-pill").length,
              hasWrappedClass: row.classList.contains("has-wrapped-matchup"),
              home: rect(".match-team-home"),
              homeName: rect(".match-team-home .team-name"),
              meta: rect(".match-row-meta"),
              rowScrollOverflow: row.scrollWidth - row.clientWidth,
              text: row.innerText.replace(/\s+/g, " ").trim(),
              versus: rect(".match-versus")
            };
          });
        assert(
          curacaoCoteWrap.homeName?.text === "Curaçao" &&
            curacaoCoteWrap.awayFlag?.text === "🇨🇮" &&
            curacaoCoteWrap.awayName?.text === "Côte d'Ivoire" &&
            curacaoCoteWrap.rankCount === 0 &&
            curacaoCoteWrap.homeName.right <= curacaoCoteWrap.home.right + 1 &&
            curacaoCoteWrap.awayName.right <= curacaoCoteWrap.away.right + 1 &&
            (!curacaoCoteWrap.hasWrappedClass ||
              (curacaoCoteWrap.home.center < curacaoCoteWrap.versus.center &&
                Math.abs(curacaoCoteWrap.versus.center - curacaoCoteWrap.awayFlag.center) <= 2 &&
                curacaoCoteWrap.versus.right <= curacaoCoteWrap.awayFlag.left + 1)) &&
            curacaoCoteWrap.rowScrollOverflow <= 1,
          `Curaçao vs Côte d'Ivoire should stay readable inline when it fits, or use the compact mobile matchup grid after wrapping is detected. Measured ${JSON.stringify(curacaoCoteWrap)}.`
        );
      }
    }
    await upNextCheck.context.close();
  }

  const pendingScoreFixture = fixturesData.fixtures
    .filter((fixture) => fixture.status === "SCHEDULED" && fixture.kickoffUtc && !fixture.score)
    .sort((a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc))[0];
  if (pendingScoreFixture) {
    const afterLiveWindow = new Date(
      new Date(pendingScoreFixture.kickoffUtc).getTime() + 2.5 * 60 * 60 * 1000
    );
    const pendingScoreCheck = await openPageAtTime(
      afterLiveWindow.toISOString(),
      `/?view=matches&date=${pendingScoreFixture.date}&tz=America%2FLos_Angeles`
    );
    await pendingScoreCheck.page.waitForSelector(".match-row");
    assert(
      (
        await pendingScoreCheck.page
          .locator(`.match-row[data-match-id="${pendingScoreFixture.id}"] .score-status.is-pending`)
          .innerText()
      ).trim() === "Pending",
      "A kicked-off scheduled match without a verified score should show Pending."
    );
    await pendingScoreCheck.context.close();
  }

  const catchUpCheck = await openPageAtTime("2026-06-18T05:30:00.000Z");
  await catchUpCheck.page.locator("#catch-up-button").click();
  const catchUpText = await catchUpCheck.page.locator("#catch-up-popover").innerText();
  assert(
    (await catchUpCheck.page.locator(".catch-up-header").count()) === 0 &&
      (await catchUpCheck.page.locator("#catch-up-popover").getAttribute("aria-label")) === "Catch Up",
    "The catch-up popover should not show a header title or date range."
  );
  const catchUpItems = await catchUpCheck.page.locator(".catch-up-item").evaluateAll((items) =>
    items.map((item) => ({
      time: item.closest(".catch-up-group")?.querySelector(".catch-up-group-date")?.textContent.trim(),
      headline: item.querySelector(".catch-up-title-row h3 > span")?.textContent.trim(),
      subtitle: item.querySelector(".catch-up-subtitle")?.textContent.trim() || "",
      standouts: item.querySelector(".catch-up-standouts")?.textContent.trim() || "",
      standoutBullets: Array.from(item.querySelectorAll(".catch-up-standouts .catch-up-point")).map(
        (point) => point.textContent.trim()
      ),
      sourceHref: item.querySelector(".catch-up-source")?.getAttribute("href") || ""
    }))
  );
  const catchUpHeadlines = catchUpItems.map((item) => item.headline);
  const portugalCatchUpItem = catchUpItems.find((item) =>
    item.headline?.includes("Portugal and DR Congo split the points")
  );
  const englandCatchUpItem = catchUpItems.find((item) =>
    item.headline?.includes("England look sharp against Croatia")
  );
  const ghanaCatchUpItem = catchUpItems.find((item) =>
    item.headline?.includes("Ghana leave it late against Panama")
  );
  const colombiaCatchUpItem = catchUpItems.find((item) =>
    item.headline?.includes("Colombia take control of Group K")
  );
  assert(
    catchUpHeadlines.join("|") ===
      [
        "Colombia take control of Group K",
        "Ghana leave it late against Panama",
        "England look sharp against Croatia",
        "Portugal and DR Congo split the points",
        "Austria look sharp against Jordan"
      ].join("|"),
    "The catch-up feed should show the latest updates first."
  );
  assert(
    portugalCatchUpItem?.sourceHref.includes("portugal-dr-congo-world-cup-2026-group-k-match-report"),
    "The Portugal/DR Congo catch-up item should link to the match report."
  );
  assert(
    ghanaCatchUpItem?.sourceHref.includes("ghana-panama-highlights-match-report"),
    "The Ghana/Panama catch-up item should link to the FIFA match report."
  );
  assert(
    colombiaCatchUpItem?.sourceHref.includes("uzbekistan-colombia-match-report-highlights"),
    "The Uzbekistan/Colombia catch-up item should link to the FIFA match report."
  );
  assert(
    englandCatchUpItem?.headline === "England look sharp against Croatia" &&
      englandCatchUpItem.subtitle?.includes("England's 4-2 win gives them an early foothold in Group L") &&
      englandCatchUpItem.subtitle?.includes("scored twice"),
    "The completed England/Croatia match should render a title plus result description."
  );
  const catchUpKaneLink = catchUpCheck.page
    .locator(".catch-up-subtitle .player-link", { hasText: "Harry Kane" })
    .first();
  assert((await catchUpKaneLink.count()) === 1, "Catch-up player mentions should become player links.");
  const catchUpKaneDecoration = await catchUpKaneLink.evaluate(
    (link) => getComputedStyle(link).textDecorationLine
  );
  const catchUpKaneDecorationStyle = await catchUpKaneLink.evaluate(
    (link) => getComputedStyle(link).textDecorationStyle
  );
  assert(
    catchUpKaneDecoration === "underline" && catchUpKaneDecorationStyle === "dotted",
    "Catch-up player mentions should use the same soft dotted underline as paragraph mentions."
  );
  await catchUpKaneLink.hover();
  const catchUpKaneCard = catchUpCheck.page.locator(".player-card-floating");
  await catchUpKaneCard.waitFor({ state: "visible" });
  const catchUpKaneCardBox = await catchUpKaneCard.boundingBox();
  const catchUpViewport = catchUpCheck.page.viewportSize();
  assert(
    catchUpKaneCardBox &&
      catchUpViewport &&
      catchUpKaneCardBox.x >= 0 &&
      catchUpKaneCardBox.y >= 0 &&
      catchUpKaneCardBox.x + catchUpKaneCardBox.width <= catchUpViewport.width &&
      catchUpKaneCardBox.y + catchUpKaneCardBox.height <= catchUpViewport.height,
    `Catch-up player cards should be placed within the viewport. Measured ${JSON.stringify({ box: catchUpKaneCardBox, viewport: catchUpViewport })}.`
  );
  await catchUpCheck.page.locator("#settings-button").click();
  await catchUpCheck.page.locator('[data-language="zh"]').click();
  await catchUpCheck.page.locator("#catch-up-button").click();
  await catchUpCheck.page.locator("#catch-up-popover").waitFor({ state: "visible" });
  const catchUpChineseLinks = await catchUpCheck.page
    .locator(".catch-up-subtitle .player-link")
    .evaluateAll((links) => links.map((link) => link.textContent.trim()));
  assert(
    catchUpChineseLinks.includes("哈里·凯恩") && catchUpChineseLinks.includes("若昂·内维斯"),
    "Chinese catch-up player mentions should use localized player links."
  );
  assert(
    catchUpItems.every((item) => item.subtitle && !item.standouts && item.standoutBullets.length === 0),
    "The catch-up feed should show each news item as a headline with an inline subtitle."
  );
  assert(
    !/main goal threat|Golden Boot chase/i.test(catchUpText),
    "The catch-up feed should not show unsourced generic player-watch headlines."
  );
  await catchUpCheck.context.close();

  const latestCatchUpNow = "2026-06-19T18:20:00.000Z";
  const latestCatchUpCheck = await openPageAtTime(
    latestCatchUpNow,
    "/?view=matches&date=2026-06-19&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        hideFutureStartedFixtures(data, latestCatchUpNow);
      }
    }
  );
  await latestCatchUpCheck.page.locator("#catch-up-button").click();
  const latestCatchUpItems = await latestCatchUpCheck.page.locator(".catch-up-item").evaluateAll((items) =>
    items.map((item) => ({
      headline: item.querySelector(".catch-up-title-row h3 > span")?.textContent.trim(),
      sourceHref: item.querySelector(".catch-up-source")?.getAttribute("href") || ""
    }))
  );
  const mexicoCatchUpItem = latestCatchUpItems.find((item) =>
    item.headline?.includes("Mexico narrowly beat South Korea")
  );
  const canadaCatchUpItem = latestCatchUpItems.find((item) =>
    item.headline?.includes("Canada make a statement against Qatar")
  );
  assert(
    mexicoCatchUpItem?.sourceHref.includes("mexico-south-korea-world-cup-2026-group-a-match-report"),
    "Generated Mexico/South Korea result catch-up should link to its report source."
  );
  assert(
    canadaCatchUpItem?.sourceHref.includes("canada-qatar-world-cup-2026-group-b-match-report"),
    "Generated Canada/Qatar result catch-up should link to its report source."
  );
  await latestCatchUpCheck.context.close();

  const tournamentCatchUpCheck = await openPageAtTime(
    "2026-06-23T02:08:00.000Z",
    "/?view=matches&date=2026-06-22&tz=America%2FLos_Angeles"
  );
  await tournamentCatchUpCheck.page.locator("#catch-up-button").click();
  const tournamentCatchUpItems = await tournamentCatchUpCheck.page
    .locator(".catch-up-item")
    .evaluateAll((items) =>
      items.map((item) => ({
        headline: item.querySelector(".catch-up-title-row h3 > span")?.textContent.trim(),
        subtitle: item.querySelector(".catch-up-subtitle")?.textContent.trim() || "",
        sourceHref: item.querySelector(".catch-up-source")?.getAttribute("href") || ""
      }))
    );
  const messiLeaderboardItem = tournamentCatchUpItems.find((item) =>
    item.headline?.includes("Messi leads all scorers with five World Cup goals")
  );
  assert(messiLeaderboardItem, "Tournament-level catch-up should include the Messi scoring-leader story.");
  assert(
    messiLeaderboardItem?.subtitle.includes("five goals from Argentina's first two matches") &&
      messiLeaderboardItem?.subtitle.includes("Golden Boot race"),
    "Tournament-level catch-up should show the scoring-leader story description."
  );
  assert(
    tournamentCatchUpItems.every((item) => !/[⚽🌟📊]/u.test(item.subtitle)),
    "Catch-up subtitles should render clean prose without result-highlight icons."
  );
  assert(
    messiLeaderboardItem?.sourceHref.includes("argentina-austria-match-report-highlights"),
    "Tournament-level catch-up should resolve source links from tournament source IDs."
  );
  await tournamentCatchUpCheck.page.locator("#settings-button").click();
  await tournamentCatchUpCheck.page.locator('[data-language="zh"]').click();
  await tournamentCatchUpCheck.page.locator("#catch-up-button").click();
  await tournamentCatchUpCheck.page.locator("#catch-up-popover").waitFor({ state: "visible" });
  const tournamentCatchUpChineseText = await tournamentCatchUpCheck.page.locator("#catch-up-popover").innerText();
  assert(
    tournamentCatchUpChineseText.includes("梅西以5球领跑世界杯射手榜"),
    "Tournament-level catch-up should translate authored news in Chinese."
  );
  assert(
    tournamentCatchUpChineseText.includes("前两场比赛后达到5球") &&
      tournamentCatchUpChineseText.includes("独自领跑金靴奖竞争"),
    "Tournament-level localized catch-up objects should render Chinese subtitles from data."
  );
  await tournamentCatchUpCheck.context.close();

  const sourceFreshnessCheck = await openPageAtTime("2026-06-18T15:57:00.000Z");
  const sourceNote = sourceFreshnessCheck.page.locator("#source-note");
  const sourceNoteText = await sourceNote.innerText();
  const normalizedSourceNoteText = sourceNoteText
    .replace(/\s+/g, " ")
    .replace(/\s+([.,。])/g, "$1")
    .trim();
  const sourceLinkLabels = await sourceNote.locator("a").evaluateAll((links) =>
    links.map((link) => link.textContent.trim()).join("|")
  );
  const sourceTriggerTag = await sourceNote
    .locator(".source-tooltip-trigger")
    .evaluate((trigger) => trigger.tagName.toLowerCase());
  const releaseTriggerTag = await sourceNote
    .locator(".release-tooltip-trigger")
    .evaluate((trigger) => trigger.tagName.toLowerCase());
  const sourceTriggerHref = await sourceNote.locator(".source-tooltip-trigger").getAttribute("href");
  const releaseTriggerHref = await sourceNote.locator(".release-tooltip-trigger").getAttribute("href");
  const sourceTooltipText = await sourceNote.locator(".source-tooltip").evaluate((tooltip) =>
    [
      tooltip.querySelector("strong")?.textContent?.trim(),
      ...Array.from(tooltip.querySelectorAll("a")).map((link) => link.textContent.trim())
    ]
      .filter(Boolean)
      .join(" ")
  );
  const releaseTooltipText = await sourceNote.locator(".release-tooltip").evaluate((tooltip) =>
    [
      tooltip.querySelector("strong")?.textContent?.trim(),
      ...Array.from(tooltip.querySelectorAll("li")).map((item) => item.textContent.trim())
    ]
      .filter(Boolean)
      .join(" ")
  );
  const sourceTooltipStateBeforeHover = await sourceNote.locator(".source-tooltip").evaluate((tooltip) => {
    const styles = getComputedStyle(tooltip);
    return {
      opacity: styles.opacity,
      pointerEvents: styles.pointerEvents,
      visibility: styles.visibility
    };
  });
  const releaseTooltipStateBeforeHover = await sourceNote.locator(".release-tooltip").evaluate((tooltip) => {
    const styles = getComputedStyle(tooltip);
    return {
      opacity: styles.opacity,
      pointerEvents: styles.pointerEvents,
      visibility: styles.visibility
    };
  });
  const reportIssueHref = await sourceNote.locator("a", { hasText: "Report issue" }).getAttribute("href");
  const creatorHref = await sourceNote.locator("a", { hasText: /^H$/ }).getAttribute("href");
  const expectedSourceUpdatedAt = formatExpectedSourceUpdatedAt(getLatestUpdatedAt(sourceNoteRefreshData));
  const expectedSourceUpdatedAtPattern = expectedSourceUpdatedAt
    .replace(/\d{1,2}:\d{2}/, "__SOURCE_TIME__")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace("__SOURCE_TIME__", "\\d{1,2}:\\d{2}");
  const expectedSourceNotePattern = new RegExp(
    `^See sources\\. Predictions are unofficial\\. Data refreshed ${expectedSourceUpdatedAtPattern}\\. Report issue\\. Made by H\\. See release notes\\.$`
  );
  assert(
    expectedSourceNotePattern.test(normalizedSourceNoteText),
    `The source note should stay short and separate data freshness from release notes. Expected to match ${expectedSourceNotePattern}, received "${normalizedSourceNoteText}".`
  );
  assert(
    sourceLinkLabels === "FIFA schedule|debutants|ranking|standings|Report issue|H",
    "The source note should keep compact source tooltip links, report, and creator links."
  );
  assert(
    sourceTriggerTag === "button" &&
      releaseTriggerTag === "button" &&
      sourceTriggerHref === null &&
      releaseTriggerHref === null,
    "The source and release note triggers should be in-page tooltip buttons, not navigation links."
  );
  assert(
    sourceTooltipText === "Sources FIFA schedule debutants ranking standings",
    "The source tooltip should show the compact official source list."
  );
  assert(
    releaseTooltipText === getExpectedReleaseTooltipText(releaseNotesData),
    "The release notes tooltip should show a compact change summary."
  );
  assert(
    sourceTooltipStateBeforeHover.opacity === "0" &&
      sourceTooltipStateBeforeHover.pointerEvents === "none" &&
      sourceTooltipStateBeforeHover.visibility === "hidden",
    "The source tooltip should be hidden before hover or focus."
  );
  assert(
    releaseTooltipStateBeforeHover.opacity === "0" &&
      releaseTooltipStateBeforeHover.pointerEvents === "none" &&
      releaseTooltipStateBeforeHover.visibility === "hidden",
    "The release notes tooltip should be hidden before hover or focus."
  );
  await sourceNote.locator(".source-tooltip-trigger").hover();
  await sourceFreshnessCheck.page.waitForFunction(() => {
    const tooltip = document.querySelector("#source-note .source-tooltip");
    if (!tooltip) {
      return false;
    }
    const styles = getComputedStyle(tooltip);
    return (
      Number(styles.opacity) > 0 &&
      styles.pointerEvents === "auto" &&
      styles.visibility === "visible"
    );
  });
  const sourceTooltipStateAfterHover = await sourceNote.locator(".source-tooltip").evaluate((tooltip) => {
    const styles = getComputedStyle(tooltip);
    return {
      opacity: Number(styles.opacity),
      pointerEvents: styles.pointerEvents,
      visibility: styles.visibility
    };
  });
  assert(
    sourceTooltipStateAfterHover.opacity > 0 &&
      sourceTooltipStateAfterHover.pointerEvents === "auto" &&
      sourceTooltipStateAfterHover.visibility === "visible",
    "The source tooltip should appear on hover."
  );
  await sourceFreshnessCheck.page.mouse.move(0, 0);
  await sourceFreshnessCheck.page.waitForTimeout(180);
  await sourceNote.locator(".release-tooltip-trigger").hover();
  await sourceFreshnessCheck.page.waitForFunction(() => {
    const tooltip = document.querySelector("#source-note .release-tooltip");
    if (!tooltip) {
      return false;
    }
    const styles = getComputedStyle(tooltip);
    return (
      Number(styles.opacity) > 0 &&
      styles.pointerEvents === "auto" &&
      styles.visibility === "visible"
    );
  });
  const releaseTooltipStateAfterHover = await sourceNote.locator(".release-tooltip").evaluate((tooltip) => {
    const styles = getComputedStyle(tooltip);
    return {
      opacity: Number(styles.opacity),
      pointerEvents: styles.pointerEvents,
      visibility: styles.visibility
    };
  });
  assert(
    releaseTooltipStateAfterHover.opacity > 0 &&
      releaseTooltipStateAfterHover.pointerEvents === "auto" &&
      releaseTooltipStateAfterHover.visibility === "visible",
    "The release notes tooltip should appear on hover."
  );
  assert(reportIssueHref === "report.html", "The source note should link to the report issue page.");
  assert(
    creatorHref === "https://www.linkedin.com/in/hirooaoy",
    "The source note should link H to LinkedIn."
  );
  assert(
    !sourceNoteText.includes("Core data") &&
      !sourceNoteText.includes("Core checks:") &&
      !sourceNoteText.includes("Latest result data checked") &&
      !sourceNoteText.includes("Source data checked"),
    "The source note should not show diagnostic freshness details."
  );
  await sourceFreshnessCheck.context.close();

  const tomorrowDuringKickoff = await openPageAtTime(
    "2026-06-18T15:55:00.000Z",
    "/?view=matches&date=2026-06-19&tz=America%2FLos_Angeles"
  );
  assert(
    (await tomorrowDuringKickoff.page.locator(".up-next-pill").count()) === 0,
    "Tomorrow's first match should not show Up next for today's upcoming match."
  );
  await tomorrowDuringKickoff.context.close();

  const todayUrlDate = getDayKeyForTimeZone(new Date().toISOString());
  await page.goto(`${baseUrl}?view=matches&date=${todayUrlDate}&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(
    () => document.querySelector("#day-label")?.textContent.trim() === "Today"
  );
  await page
    .waitForFunction(() => !new URL(window.location.href).searchParams.has("date"), null, {
      timeout: 1000
    })
    .catch(() => {});
  const reloadedTodayUrl = page.url();
  assert(
    !new URL(reloadedTodayUrl).searchParams.has("date"),
    `Reload should replace stale date state with a clean today URL. Current URL: ${reloadedTodayUrl}`
  );

  await page.locator("#standings-tab").click();
  assert(
    (await page.locator("#standings-heading").innerText()).replace(/\s+/g, " ").trim() ===
      "2026 Standings",
    "The current standings heading should specify 2026."
  );
  await page.locator("#standings-groups-tab").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#standings-groups-tab")?.getAttribute("aria-pressed") === "true" &&
      document.querySelectorAll(".standings-card[data-group-id]").length === 12
  );
  const groupOrderCheck = await page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll(".standings-card[data-group-id]")].map((card) => [
        card.dataset.groupId,
        [...card.querySelectorAll(".standing-name")].map((team) => team.textContent.trim())
      ])
    )
  );
  const groupOrderMismatches = (tournamentData.groups || [])
    .map((group) => ({
      actual: groupOrderCheck[group.id]?.join("|") || "",
      expected: getExpectedStandingOrder(group.id),
      groupId: group.id
    }))
    .filter((group) => group.actual !== group.expected);
  assert(
    groupOrderMismatches.length === 0,
    `Every current group should preserve the checked table order. Mismatches: ${JSON.stringify(groupOrderMismatches)}.`
  );
  const bosniaStandingTeam = page
    .locator(".standings-card", { hasText: "Group B" })
    .locator(".standing-team", { hasText: "Bosnia and Herzegovina" });
  await bosniaStandingTeam.hover();
  await page.waitForTimeout(160);
  const bosniaTooltip = await bosniaStandingTeam.evaluate((team) => {
    const name = team.querySelector(".standing-name");
    const teamRect = team.getBoundingClientRect();
    const nameRect = name.getBoundingClientRect();
    const tooltipStyle = getComputedStyle(team, "::after");
    return {
      anchor: Number(getComputedStyle(team).getPropertyValue("--name-tooltip-anchor").replace("px", "")),
      content: tooltipStyle.content,
      expectedAnchor: Math.round(nameRect.left - teamRect.left + nameRect.width / 2),
      hasTooltip: team.classList.contains("has-name-tooltip"),
      opacity: Number(tooltipStyle.opacity),
      tooltip: team.getAttribute("data-tooltip")
    };
  });
  assert(
    bosniaTooltip.tooltip === "Bosnia and Herzegovina" &&
      (!bosniaTooltip.hasTooltip ||
        (bosniaTooltip.content.includes("Bosnia and Herzegovina") &&
          Math.abs(bosniaTooltip.anchor - bosniaTooltip.expectedAnchor) <= 1 &&
          bosniaTooltip.opacity > 0.9)),
    "Bosnia and Herzegovina should use the available standings row width and only show a tooltip if it actually overflows."
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(80);
  const bosniaStandingFlagAlignment = await bosniaStandingTeam.evaluate((team) => {
    const flag = team.querySelector(".flag");
    const teamRect = team.getBoundingClientRect();
    const flagRect = flag?.getBoundingClientRect();
    return {
      flagCenter: flagRect ? flagRect.top + flagRect.height / 2 : 0,
      scrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      teamCenter: teamRect.top + teamRect.height / 2
    };
  });
  assert(
    Math.abs(bosniaStandingFlagAlignment.flagCenter - bosniaStandingFlagAlignment.teamCenter) <= 1 &&
      bosniaStandingFlagAlignment.scrollOverflow <= 1,
    `Wrapped standings rows should vertically center the flag against the full team block. Measured ${JSON.stringify(bosniaStandingFlagAlignment)}.`
  );
  await page.setViewportSize({ width: 1280, height: 720 });
  const currentStandingsMarkerCheck = await page.evaluate(() => {
    const getRowTeamName = (row) => row.querySelector(".standing-name")?.textContent.trim() || "";

    return {
      advancingNames: [...document.querySelectorAll(".standings-card tbody tr.is-advancing")]
        .map(getRowTeamName)
        .filter(Boolean)
        .sort(),
      madeItPillCount: document.querySelectorAll(".standing-status-pill.is-made-it, .third-place-status.is-made-it").length,
      advancementPillCount: document.querySelectorAll(".advancement-pill").length
    };
  });
  const expectedConfirmedAdvancingStandingTeamNames = getExpectedConfirmedAdvancingStandingTeamNames();
  assert(
    currentStandingsMarkerCheck.advancingNames.join("|") === expectedConfirmedAdvancingStandingTeamNames.join("|"),
    `The current 2026 standings should highlight only confirmed advancing teams with the archived row treatment. Expected ${expectedConfirmedAdvancingStandingTeamNames.join("|")}, received ${currentStandingsMarkerCheck.advancingNames.join("|")}.`
  );
  assert(
    currentStandingsMarkerCheck.advancementPillCount === 0 &&
      currentStandingsMarkerCheck.madeItPillCount === 0,
    "The current 2026 standings should not add a text pill for confirmed advancement."
  );
  const expectedGroupBThirdPlaceCandidate = getExpectedThirdPlaceRaceRows().find(
    (candidate) => candidate.groupId === "B"
  );
  const groupBThirdPlacePill = page.locator(".standings-card", { hasText: "Group B" }).locator(".third-place-pill");
  assert(
    expectedGroupBThirdPlaceCandidate &&
      (await groupBThirdPlacePill.innerText()).trim() ===
        `3rd race ${formatOrdinal(expectedGroupBThirdPlaceCandidate.position)}`,
    "Group standings should show each current third-place team's cross-group race position."
  );
  const groupBThirdPlacePillTooltip = await groupBThirdPlacePill.getAttribute("data-tooltip");
  assert(
    groupBThirdPlacePillTooltip ===
      getExpectedThirdPlaceStandingBadgeReason(expectedGroupBThirdPlaceCandidate),
    "Group standings third-place race pills should explain whether the team is advancing or not advancing."
  );
  const expectedStandingsLiveThirdPlaceTeams = new Set(
    fixturesData.fixtures
      .filter((fixture) => isFixtureLive(fixture))
      .flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId])
      .filter((teamId) => getExpectedThirdPlaceRaceRows().some((candidate) => candidate.teamId === teamId))
      .map((teamId) => getTeam(teamId).name)
  );
  const groupStandingsLiveRows = await page.evaluate(() =>
    [...document.querySelectorAll(".standings-card tbody tr")].map((row) => ({
      eliminated: row.querySelector(".standing-status-pill.is-eliminated")?.textContent.trim() || "",
      live: row.querySelector(".standing-live-pill")?.textContent.trim() || "",
      race: row.querySelector(".third-place-pill")?.textContent.trim() || "",
      team: row.querySelector(".standing-name")?.textContent.trim() || ""
    }))
  );
  assert(
    groupStandingsLiveRows.every((row) =>
      expectedStandingsLiveThirdPlaceTeams.has(row.team) ? row.live === "Live" : row.live === ""
    ) &&
      groupStandingsLiveRows
        .filter((row) => expectedStandingsLiveThirdPlaceTeams.has(row.team))
        .every((row) => row.race.startsWith("3rd race")),
    "Group standings should show LIVE only beside current third-place candidates playing live."
  );
  assert(
    groupStandingsLiveRows.every((row) => !row.race || !row.eliminated),
    "Group standings should not stack an Eliminated pill beside a third-place race pill."
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(80);
  const groupStandingsLiveBadgeMetrics = await page.evaluate(() =>
    [...document.querySelectorAll(".standings-card tbody tr")]
      .map((row) => {
        const livePill = row.querySelector(".standing-live-pill");
        const racePill = row.querySelector(".third-place-pill");
        return livePill
          ? {
              liveHeight: Math.round(livePill.getBoundingClientRect().height),
              raceHeight: racePill ? Math.round(racePill.getBoundingClientRect().height) : null,
              team: row.querySelector(".standing-name")?.textContent.trim() || ""
            }
          : null;
      })
      .filter(Boolean)
  );
  assert(
    expectedStandingsLiveThirdPlaceTeams.size === 0 ||
      (groupStandingsLiveBadgeMetrics.length === expectedStandingsLiveThirdPlaceTeams.size &&
        groupStandingsLiveBadgeMetrics.every(
          (row) => row.raceHeight !== null && Math.abs(row.liveHeight - row.raceHeight) <= 1
        )),
    `Standing LIVE pills should match third-place race pill height. Measured ${JSON.stringify(groupStandingsLiveBadgeMetrics)}.`
  );
  await page.setViewportSize({ width: 1280, height: 720 });
  const scheduledLiveWindowCheck = await openPageAtTime(
    "2026-06-26T19:30:00.000Z",
    "/?view=standings&standingsMode=groups&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const scheduledWindowFixture = data.fixtures.find(
          (fixture) => fixture.id === "senegal-iraq-2026-06-26"
        );

        scheduledWindowFixture.status = "SCHEDULED";
        delete scheduledWindowFixture.score;
        delete scheduledWindowFixture.goalsHome;
        delete scheduledWindowFixture.goalsAway;
        delete scheduledWindowFixture.resultHighlights;
      }
    }
  );
  await scheduledLiveWindowCheck.page.waitForSelector('.standings-card[data-group-id="I"] .standing-team');
  const groupIScheduledWindowRows = await scheduledLiveWindowCheck.page.evaluate(() =>
    [...document.querySelectorAll('.standings-card[data-group-id="I"] tbody tr')].map((row) => ({
      live: row.querySelector(".standing-live-pill")?.textContent.trim() || "",
      race: row.querySelector(".third-place-pill")?.textContent.trim() || "",
      team: row.querySelector(".standing-name")?.textContent.trim() || ""
    }))
  );
  assert(
    groupIScheduledWindowRows.some(
      (row) => row.team === "Senegal" && row.race.startsWith("3rd race") && row.live === "Live"
    ) &&
      groupIScheduledWindowRows
        .filter((row) => row.team !== "Senegal")
        .every((row) => row.live === ""),
    "Third-place standings live pills should follow the live-window rule when source status is still scheduled."
  );
  await scheduledLiveWindowCheck.page.locator("#standings-third-place-tab").click();
  await scheduledLiveWindowCheck.page.waitForFunction(
    () => document.querySelectorAll(".third-place-table tbody tr:not(.third-place-cut-row)").length === 12
  );
  const thirdPlaceScheduledWindowRows = await scheduledLiveWindowCheck.page.evaluate(() =>
    [...document.querySelectorAll(".third-place-table tbody tr:not(.third-place-cut-row)")].map((row) => ({
      live: row.querySelector(".standing-live-pill")?.textContent.trim() || "",
      team: row.querySelector(".standing-name")?.textContent.trim() || ""
    }))
  );
  assert(
    thirdPlaceScheduledWindowRows.some((row) => row.team === "Senegal" && row.live === "Live"),
    "The third-place race table should mark a current third-place candidate as live during its scheduled live window."
  );
  await scheduledLiveWindowCheck.context.close();
  assert(
    (await page
      .locator('.standings-card[data-group-id="B"] .standing-team', { hasText: "Qatar" })
      .locator(".standing-status-pill.is-eliminated")
      .innerText()) === "Eliminated",
    "Completed group standings should mark teams outside any group-stage path as eliminated."
  );
  assert(
    (await page
      .locator('.standings-card[data-group-id="D"] .standing-team', { hasText: "Türkiye" })
      .locator(".standing-status-pill.is-eliminated")
      .innerText()) === "Eliminated",
    "Group standings should use completed head-to-head results to mark mathematically eliminated teams before the group is complete."
  );
  const expectedEliminatedTeamNames = getExpectedEliminatedTeamNames();
  const actualEliminatedTeamNames = (
    await page.evaluate(() =>
      [...document.querySelectorAll(".standings-card tbody tr")]
        .filter((row) => row.querySelector(".standing-status-pill.is-eliminated"))
        .map((row) => row.querySelector(".standing-name")?.textContent.trim() || "")
        .filter(Boolean)
    )
  ).sort();
  assert(
    actualEliminatedTeamNames.join("|") === expectedEliminatedTeamNames.join("|"),
    `Current standings eliminated pills should match every group. Expected ${expectedEliminatedTeamNames.join("|")}, received ${actualEliminatedTeamNames.join("|")}.`
  );
  const groupStandingsRhythm = await page.evaluate(() => {
    const title = document.querySelector(".standings-title").getBoundingClientRect();
    const summary = document.querySelector("#standings-summary").getBoundingClientRect();
    const tabs = document.querySelector("#standings-mode-tabs").getBoundingClientRect();
    const grid = document.querySelector("#standings-grid").getBoundingClientRect();
    const shell = document.querySelector(".page-shell").getBoundingClientRect();

    return {
      gridGap: Math.round(grid.top - title.bottom),
      shellTop: Math.round(shell.top),
      tabsGap: Math.round(tabs.top - summary.bottom),
      titleTop: Math.round(title.top)
    };
  });
  await page.locator("#standings-third-place-tab").click();
  await page.waitForFunction(
    () => document.querySelectorAll(".third-place-table tbody tr:not(.third-place-cut-row)").length === 12
  );
  assert(
    new URL(page.url()).searchParams.get("standingsMode") === "third-place",
    "The third-place race section should be linkable from the URL."
  );
  assert(
    (await page.locator("#standings-mode-tabs").isVisible()) &&
      (await page.locator("#standings-third-place-tab").evaluate((tab) => tab.getAttribute("aria-pressed") === "true")) &&
      (await page.locator("#standings-heading").isVisible()) &&
      (await page.locator("#standings-summary").innerText()).includes("Third-place standings across all groups") &&
      !(await page.locator(".third-place-race-header").isVisible()) &&
      (await page.locator(".third-place-table").isVisible()),
    "The third-place race should keep the standings heading, mode-specific summary, and section tabs visible."
  );
  const thirdPlaceStandingsRhythm = await page.evaluate(() => {
    const title = document.querySelector(".standings-title").getBoundingClientRect();
    const summary = document.querySelector("#standings-summary").getBoundingClientRect();
    const tabs = document.querySelector("#standings-mode-tabs").getBoundingClientRect();
    const grid = document.querySelector("#standings-grid").getBoundingClientRect();
    const shell = document.querySelector(".page-shell").getBoundingClientRect();

    return {
      gridGap: Math.round(grid.top - title.bottom),
      shellTop: Math.round(shell.top),
      tabsGap: Math.round(tabs.top - summary.bottom),
      titleTop: Math.round(title.top)
    };
  });
  assert(
    Math.abs(thirdPlaceStandingsRhythm.shellTop - groupStandingsRhythm.shellTop) <= 1 &&
      Math.abs(thirdPlaceStandingsRhythm.titleTop - groupStandingsRhythm.titleTop) <= 1 &&
      Math.abs(thirdPlaceStandingsRhythm.tabsGap - groupStandingsRhythm.tabsGap) <= 1 &&
      Math.abs(thirdPlaceStandingsRhythm.gridGap - groupStandingsRhythm.gridGap) <= 1,
    "The third-place race should use the same page, tab, and content spacing as the Groups standings section."
  );
  const thirdPlaceRaceCheck = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".third-place-table tbody tr:not(.third-place-cut-row)")];
    const rowSummaries = rows.map((row) => {
      const statusPill = row.querySelector(".third-place-status");

      return {
        rank: row.children[0]?.textContent.trim(),
        team: row.querySelector(".standing-name")?.textContent.trim(),
        group: row.children[2]?.textContent.trim(),
        live: row.querySelector(".standing-live-pill")?.textContent.trim() || "",
        status: statusPill?.textContent.trim(),
        statusLabel: statusPill?.getAttribute("aria-label"),
        tooltip: statusPill?.getAttribute("data-tooltip")
      };
    });

    return {
      cutLineCount: document.querySelectorAll(".third-place-cut-row").length,
      cutLineText: document.querySelector(".third-place-cut-row")?.textContent.replace(/\s+/g, " ").trim(),
      headers: [...document.querySelectorAll(".third-place-table thead th")].map((header) =>
        header.textContent.trim()
      ),
      note: document.querySelector(".third-place-note")?.textContent.trim(),
      rowCount: rows.length,
      rowSummaries,
      visibleReasonCount: document.querySelectorAll(".third-place-reason").length
    };
  });
  const expectedThirdPlaceRaceRows = getExpectedThirdPlaceRaceRows();
  const expectedThirdPlaceTopFour = expectedThirdPlaceRaceRows
    .slice(0, 4)
    .map((row) => `${formatOrdinal(row.position)}:${row.team.name}`)
    .join("|");
  const expectedCutLineInside = expectedThirdPlaceRaceRows[getThirdPlaceAdvancerCount() - 1];
  const expectedFirstOut = expectedThirdPlaceRaceRows[getThirdPlaceAdvancerCount()];
  assert(thirdPlaceRaceCheck.rowCount === 12, "The third-place race should rank all 12 groups.");
  assert(
    thirdPlaceRaceCheck.rowSummaries
      .slice(0, 4)
      .map((row) => `${row.rank}:${row.team}`)
      .join("|") === expectedThirdPlaceTopFour,
    "The third-place race should sort by points, goal difference, goals scored, then deterministic fallback."
  );
  assert(
    thirdPlaceRaceCheck.cutLineCount === 1 &&
      thirdPlaceRaceCheck.cutLineText === "Top 8 advance",
    "The third-place race should draw one clear top-eight advancement line."
  );
  assert(
    thirdPlaceRaceCheck.headers.join("|") === "Rank|Team|Group|Pts|GD|Goals|Status" &&
      !thirdPlaceRaceCheck.headers.includes("GF"),
    "The third-place race should show Goals and Status without GF jargon."
  );
  assert(
      thirdPlaceRaceCheck.visibleReasonCount === 0 &&
      thirdPlaceRaceCheck.rowSummaries.every((row) => row.tooltip && !row.tooltip.includes("GF")) &&
      thirdPlaceRaceCheck.rowSummaries.every((row) => !row.tooltip.includes("Estimated Round of 32 chance:")) &&
      thirdPlaceRaceCheck.rowSummaries.every((row) => !row.tooltip.includes("Simple model:")) &&
      thirdPlaceRaceCheck.rowSummaries.every((row) => row.status === "Advancing" || row.status === "Eliminated") &&
      thirdPlaceRaceCheck.rowSummaries.some((row) => row.status === "Advancing" && row.tooltip === "Advancing to Round of 32.") &&
      thirdPlaceRaceCheck.rowSummaries.some((row) => row.status === "Eliminated" && row.tooltip === "Eliminated at group stage."),
    "The third-place race should show binary status pill tooltips without probability or GF jargon."
  );
  const expectedLiveThirdPlaceTeams = new Set(
    fixturesData.fixtures
      .filter((fixture) => isFixtureLive(fixture))
      .flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId])
      .filter((teamId) => expectedThirdPlaceRaceRows.some((candidate) => candidate.teamId === teamId))
      .map((teamId) => getTeam(teamId).name)
  );
  assert(
    thirdPlaceRaceCheck.rowSummaries.every((row) =>
      expectedLiveThirdPlaceTeams.has(row.team) ? row.live === "Live" : row.live === ""
    ),
    "The third-place race should show LIVE only for active matches involving current third-place candidates."
  );
  assert(
    thirdPlaceRaceCheck.rowSummaries.every((row) => !/^(?:<1%|\d+%) advancing$/.test(row.status || "")),
    "The third-place race should use binary status labels instead of percentage advancing copy."
  );
  assert(
    thirdPlaceRaceCheck.rowSummaries.every((row) => row.status !== "Made it"),
    "The third-place race should not add a Made it pill; final qualifiers use the archived row highlight in group standings."
  );
  assert(
    expectedCutLineInside &&
      expectedFirstOut &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount() - 1]?.team === expectedCutLineInside.team.name &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount() - 1]?.status === expectedCutLineInside.status.label &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount() - 1]?.tooltip ===
        getExpectedThirdPlaceRaceStatusReason(expectedCutLineInside) &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount()]?.team === expectedFirstOut.team.name &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount()]?.status === expectedFirstOut.status.label &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount()]?.tooltip ===
        getExpectedThirdPlaceRaceStatusReason(expectedFirstOut),
    "The cut-line rows should show final advancing and eliminated status."
  );
  assert(
    thirdPlaceRaceCheck.note.includes("fair-play conduct"),
    "The third-place race note should explain unresolved fair-play tiebreaks."
  );
  await page.locator("#standings-groups-tab").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#standings-groups-tab")?.getAttribute("aria-pressed") === "true" &&
      document.querySelectorAll(".standings-card").length === 12
  );
  assert(
    new URL(page.url()).searchParams.get("standingsMode") === "groups" &&
      (await page.locator(".third-place-table").count()) === 0,
    "The visible section tabs should let users leave the third-place race."
  );
  await page.locator("#standings-third-place-tab").click();
  await page.waitForFunction(
    () => document.querySelectorAll(".third-place-table tbody tr:not(.third-place-cut-row)").length === 12
  );
  await page.locator(".third-place-group-button", { hasText: "Group F" }).click();
  await page.waitForFunction(
    () => document.activeElement === document.querySelector('.standings-card[data-group-id="F"]')
  );
  assert(
    await page.locator("#standings-groups-tab").evaluate((tab) => tab.getAttribute("aria-pressed") === "true"),
    "Clicking a race table group should switch back to the Groups section."
  );
  assert(
    new URL(page.url()).searchParams.get("standingsMode") === "groups",
    "Clicking a race table group should leave the URL on the Groups section."
  );
  assert(
    (await page.locator('.standings-card[data-group-id="F"] h2').innerText()).trim() === "Group F",
    "Clicking a race table group should focus the matching group card."
  );
  await page.locator("#standings-tournament-tab").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed") === "true" &&
      document.querySelectorAll('.progress-match[data-match-number="74"]').length === 1 &&
      document.querySelector('.progress-match[data-match-number="89"]')
  );
  await page.waitForFunction(() => document.querySelectorAll(".progress-connectors path").length >= 29);
  assert(
    !new URL(page.url()).searchParams.has("standingsMode"),
    "The tournament section should be linkable from the URL."
  );
  const tournamentCheck = await page.evaluate(() => {
    const text = (selector) => document.querySelector(selector)?.textContent.replace(/\s+/g, " ").trim() || "";
    const allText = (selector) =>
      [...document.querySelectorAll(selector)]
        .map((element) => element.textContent.replace(/\s+/g, " ").trim())
        .join(" ");
    const getTeamVisual = (team) => {
      const flag = team.querySelector(".knockout-team-flag");
      const strong = team.querySelector(".knockout-team-copy strong");
      const rank = team.querySelector(".rank-pill");
      const flagStyle = flag ? getComputedStyle(flag) : null;
      const strongStyle = strong ? getComputedStyle(strong) : null;
      const rankStyle = rank ? getComputedStyle(rank) : null;

      return {
        className: team.className,
        flagFilter: flagStyle?.filter || "",
        flagOpacity: flagStyle?.opacity || "",
        rankOpacity: rankStyle?.opacity || "",
        strongColor: strongStyle?.color || "",
        teamId: team.dataset.teamId || "",
        text: team.textContent.replace(/\s+/g, " ").trim()
      };
    };
    const getMatchTeamVisuals = (matchNumber) =>
      [...document.querySelectorAll(`.progress-match[data-match-number="${matchNumber}"] .knockout-team`)].map(
        getTeamVisual
      );
    const getOutcomeTooltip = (matchNumber, outcome) =>
      document
        .querySelector(`.progress-match[data-match-number="${matchNumber}"] .knockout-likelihood[data-outcome="${outcome}"]`)
        ?.getAttribute("data-tooltip") || "";
    const getRectSummary = (selector) => {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect();

      return rect
        ? {
            bottom: Math.round(rect.bottom),
            center: Math.round(rect.top + rect.height / 2),
            left: Math.round(rect.left),
            top: Math.round(rect.top)
          }
        : null;
    };

    return {
      m73ProgressText: text('.progress-match[data-match-number="73"]'),
      m74ProgressText: text('.progress-match[data-match-number="74"]'),
      m81TeamIds: [...document.querySelectorAll('.progress-match[data-match-number="81"] .knockout-team[data-team-id]')]
        .map((element) => element.dataset.teamId),
      m81Text: text('.progress-match[data-match-number="81"]'),
      m89TeamIds: [...document.querySelectorAll('.progress-match[data-match-number="89"] .knockout-team[data-team-id]')]
        .map((element) => element.dataset.teamId),
      m89Text: text('.progress-match[data-match-number="89"]'),
      m97TeamIds: [...document.querySelectorAll('.progress-match[data-match-number="97"] .knockout-team[data-team-id]')]
        .map((element) => element.dataset.teamId),
      m97Text: text('.progress-match[data-match-number="97"]'),
      m103PillCount: document.querySelectorAll('.progress-match[data-match-number="103"] .knockout-likelihood').length,
      m103Projected: document.querySelector('.progress-match[data-match-number="103"]')?.classList.contains("is-projected"),
      m103Rect: getRectSummary('.progress-match[data-match-number="103"]'),
      m103TeamIds: [...document.querySelectorAll('.progress-match[data-match-number="103"] .knockout-team[data-team-id]')]
        .map((element) => element.dataset.teamId),
      m103Text: text('.progress-match[data-match-number="103"]'),
      m103TimeText: document.querySelector('.progress-match[data-match-number="103"] time')?.textContent.trim() || "",
      m104TeamIds: [...document.querySelectorAll('.progress-match[data-match-number="104"] .knockout-team[data-team-id]')]
        .map((element) => element.dataset.teamId),
      m104Rect: getRectSummary('.progress-match[data-match-number="104"]'),
      oldWinnerCopy: allText(".tournament-view").includes(["Winner", "advances"].join(" ")),
      posterMetaCount: document.querySelectorAll(".poster-match-meta").length,
      posterSeedCount: document.querySelectorAll(".poster-team-seed").length,
      posterVisible: Boolean(document.querySelector(".tournament-poster-bracket")),
      progressCount: document.querySelectorAll(".progress-match").length,
      connectorPathCount: document.querySelectorAll(".progress-connectors path").length,
      progressText: allText(".progress-match"),
      projectedCount: document.querySelectorAll(".progress-match.is-projected").length,
      roundOf32OpenMatchIds: [
        ...document.querySelectorAll(".progress-round.is-round-of-32 .progress-match[data-open-match-id]")
      ].map((element) => element.dataset.openMatchId || ""),
      roundOf32ProjectedCount: document.querySelectorAll(
        ".progress-round.is-round-of-32 .progress-match.is-projected"
      ).length,
      roundOf32ProjectedMatchNumbers: [
        ...document.querySelectorAll(".progress-round.is-round-of-32 .progress-match.is-projected")
      ].map((element) => element.dataset.matchNumber || ""),
      roundOf32TeamVisuals: [
        ...document.querySelectorAll(".progress-round.is-round-of-32 .progress-match .knockout-team")
      ].map(getTeamVisual),
      likelihoodCount: document.querySelectorAll(".knockout-likelihood").length,
      likelihoodListCount: document.querySelectorAll(".knockout-likelihood-list").length,
      likelihoodText: allText(".knockout-likelihood"),
      likelihoodNonNeutralCount: [...document.querySelectorAll(".knockout-likelihood")]
        .filter((element) => !element.classList.contains("is-neutral"))
        .length,
      likelihoodTooltips: [...document.querySelectorAll(".knockout-likelihood")]
        .map((element) => element.getAttribute("data-tooltip") || "")
        .join(" "),
      likelihoodTooltipMaxLength: Math.max(
        0,
        ...[...document.querySelectorAll(".knockout-likelihood")]
          .map((element) => (element.getAttribute("data-tooltip") || "").length)
      ),
      likelihoodTooltipCount: [...document.querySelectorAll(".knockout-likelihood")]
        .filter((element) => Boolean(element.getAttribute("data-tooltip") || ""))
        .length,
      tiePillCount: document.querySelectorAll('.knockout-likelihood[data-outcome="tie"]').length,
      tiePillFlagCount: document.querySelectorAll('.knockout-likelihood[data-outcome="tie"] .flag').length,
      finalRailConnectorPathCount: document.querySelectorAll(".progress-connectors path.is-final-rail").length,
      finalRailMoveCount:
        (document.querySelector(".progress-connectors path.is-final-rail")?.getAttribute("d") || "").match(/\bM\b/g)
          ?.length || 0,
      connectorStrokeValues: [...new Set([...document.querySelectorAll(".progress-connectors path")]
        .map((path) => getComputedStyle(path).stroke))],
      connectorStrokeWidths: [...new Set([...document.querySelectorAll(".progress-connectors path")]
        .map((path) => Number.parseFloat(getComputedStyle(path).strokeWidth)))],
      semi101Rect: getRectSummary('.progress-match[data-match-number="101"]'),
      semi102Rect: getRectSummary('.progress-match[data-match-number="102"]'),
      semi101RunnerUpNextMatch: document.querySelector('.progress-match[data-match-number="101"]')?.dataset.runnerUpNextMatch || "",
      semi102RunnerUpNextMatch: document.querySelector('.progress-match[data-match-number="102"]')?.dataset.runnerUpNextMatch || "",
      m73OpenMatchId: document.querySelector('.progress-match[data-match-number="73"]')?.dataset.openMatchId || "",
      m74OpenMatchId: document.querySelector('.progress-match[data-match-number="74"]')?.dataset.openMatchId || "",
      m73OutcomeKeys: [...document.querySelectorAll('.progress-match[data-match-number="73"] .knockout-likelihood')]
        .map((element) => element.dataset.outcome || ""),
      m73OutcomeTexts: [...document.querySelectorAll('.progress-match[data-match-number="73"] .knockout-likelihood')]
        .map((element) => element.textContent.replace(/\s+/g, " ").trim()),
      m74TieTooltip: getOutcomeTooltip(74, "tie"),
      m77TieTooltip: getOutcomeTooltip(77, "tie"),
      m80TieTooltip: getOutcomeTooltip(80, "tie"),
      m83TieTooltip: getOutcomeTooltip(83, "tie"),
      m86TieTooltip: getOutcomeTooltip(86, "tie"),
      m88AwayTooltip: getOutcomeTooltip(88, "away"),
      m73PillCount: document.querySelectorAll('.progress-match[data-match-number="73"] .knockout-likelihood').length,
      m89PillCount: document.querySelectorAll('.progress-match[data-match-number="89"] .knockout-likelihood').length,
      m89SeedLabelCount: document.querySelectorAll('.progress-match[data-match-number="89"] .knockout-team-copy small').length,
      m97PillCount: document.querySelectorAll('.progress-match[data-match-number="97"] .knockout-likelihood').length,
      m97SeedLabelCount: document.querySelectorAll('.progress-match[data-match-number="97"] .knockout-team-copy small').length,
      m104PillCount: document.querySelectorAll('.progress-match[data-match-number="104"] .knockout-likelihood').length,
      m73FooterCount: document.querySelectorAll('.progress-match[data-match-number="73"] .knockout-match-footer').length,
      m73Projected: document.querySelector('.progress-match[data-match-number="73"]')?.classList.contains("is-projected"),
      m74Projected: document.querySelector('.progress-match[data-match-number="74"]')?.classList.contains("is-projected"),
      m79Projected: document.querySelector('.progress-match[data-match-number="79"]')?.classList.contains("is-projected"),
      m89Projected: document.querySelector('.progress-match[data-match-number="89"]')?.classList.contains("is-projected"),
      m79SlotPills: [...document.querySelectorAll('.progress-match[data-match-number="79"] .knockout-slot-odds')]
        .map((element) => ({
          slotLabel: element.dataset.slotLabel || "",
          teamId: element.dataset.teamId || "",
          text: element.textContent.replace(/\s+/g, " ").trim()
        })),
      m79TeamVisuals: getMatchTeamVisuals(79),
      m89TeamVisuals: getMatchTeamVisuals(89),
      laterRoundLikelyVisuals: [
        ...document.querySelectorAll(
          ".progress-round:not(.is-round-of-32) .progress-match.is-projected .knockout-team.is-likely"
        )
      ].map(getTeamVisual),
      m89Tooltips: [...document.querySelectorAll('.progress-match[data-match-number="89"] .knockout-likelihood')]
        .map((element) => element.getAttribute("data-tooltip") || "")
        .join(" "),
      m97Tooltips: [...document.querySelectorAll('.progress-match[data-match-number="97"] .knockout-likelihood')]
        .map((element) => element.getAttribute("data-tooltip") || "")
        .join(" "),
      r32Count: document.querySelectorAll(".r32-match").length,
      r32Text: allText(".r32-match"),
      sectionHeadingVisible: Boolean(document.querySelector(".tournament-section-heading")),
      sideCount: document.querySelectorAll(".poster-side").length,
      countryTooltipCount: document.querySelectorAll(".progress-match .knockout-team[data-tooltip]").length,
      m74VenueText: document.querySelector('.progress-match[data-match-number="74"] .knockout-match-venue')?.textContent.trim() || "",
      m74VenueTooltip: document.querySelector('.progress-match[data-match-number="74"] .knockout-match-venue')?.getAttribute("data-tooltip") || "",
      rankCount: document.querySelectorAll(".progress-match .knockout-team-copy .rank-pill").length,
      thirdPlaceSeedTeamIds: [...document.querySelectorAll(".progress-round.is-round-of-32 .progress-match .knockout-slot-odds[data-team-id]")]
        .filter((element) => /^Group [A-L]3$/.test(element.dataset.slotLabel || ""))
        .map((element) => element.dataset.teamId),
      slotOddsCount: document.querySelectorAll(".knockout-slot-odds").length,
      slotOddsToneMismatches: [...document.querySelectorAll(".knockout-slot-odds")]
        .filter((element) => {
          const percentText = element.textContent.match(/(?:<1|>99|\d+)%/)?.[0]?.replace("%", "");

          if (!percentText) {
            return true;
          }

          const percent =
            percentText === "<1" ? 0.5 : percentText === ">99" ? 99.5 : Number(percentText);
          const expectedClass = percent >= 75 ? "is-high" : percent <= 25 ? "is-low" : "is-neutral";
          return !element.classList.contains(expectedClass);
        })
        .map((element) => element.textContent.replace(/\s+/g, " ").trim()),
      slotOddsText: allText(".knockout-slot-odds"),
      roundHeadings: [...document.querySelectorAll(".progress-round h3")].map((heading) =>
        heading.textContent.trim()
      ),
      summary: document.querySelector("#standings-summary")?.textContent.trim(),
      tournamentVisible: Boolean(document.querySelector(".tournament-view"))
    };
  });
  assert(
    tournamentCheck.tournamentVisible &&
      !tournamentCheck.posterVisible &&
      tournamentCheck.sideCount === 0 &&
      tournamentCheck.r32Count === 0 &&
      tournamentCheck.connectorPathCount >= 29 &&
      tournamentCheck.progressCount === 32,
    "The tournament section should show a progression-only bracket from the Round of 32 through the final and third-place play-off."
  );
  const m79MexicoVisual = tournamentCheck.m79TeamVisuals.find((team) => team.teamId === "MEX");
  const m79UnresolvedVisual = tournamentCheck.m79TeamVisuals.find((team) => team.teamId !== "MEX");
  const m89LikelyVisuals = tournamentCheck.m89TeamVisuals.filter((team) =>
    team.className.includes("is-likely")
  );
  const isLockedResolvedCountry = (team) =>
    team.className.includes("is-locked") &&
    team.className.includes("is-resolved") &&
    !team.className.includes("is-likely") &&
    team.flagFilter === "none" &&
    team.flagOpacity === "1" &&
    Number(team.rankOpacity) >= 0.7 &&
    getCssColorAlpha(team.strongColor) >= 0.8;
  const isMutedProjectedCountry = (team) =>
    !team.className.includes("is-locked") &&
    team.flagFilter.includes("grayscale") &&
    Number(team.flagOpacity) < 1 &&
    Number(team.rankOpacity) < 1 &&
    getCssColorAlpha(team.strongColor) < 0.7;
  assert(
    tournamentCheck.m79Projected === false &&
      tournamentCheck.m79TeamVisuals.length === 2 &&
      tournamentCheck.m79TeamVisuals.every(isLockedResolvedCountry) &&
      tournamentCheck.roundOf32TeamVisuals.length === 32 &&
      tournamentCheck.roundOf32TeamVisuals.every(isLockedResolvedCountry) &&
      tournamentCheck.m79SlotPills.length === 0 &&
      m79MexicoVisual?.className.includes("is-locked") &&
      m79UnresolvedVisual &&
      m79UnresolvedVisual.className.includes("is-locked"),
    `Locked Round of 32 teams should render as visually confirmed resolved cards with no slot odds. Measured ${JSON.stringify({ m79MexicoVisual, m79UnresolvedVisual, m79SlotPills: tournamentCheck.m79SlotPills, roundOf32ProjectedMatchNumbers: tournamentCheck.roundOf32ProjectedMatchNumbers })}.`
  );
  assert(
    tournamentCheck.m89Projected === true &&
      m89LikelyVisuals.length === 2 &&
      m89LikelyVisuals.every(isMutedProjectedCountry) &&
      tournamentCheck.laterRoundLikelyVisuals.length >= 2 &&
      tournamentCheck.laterRoundLikelyVisuals.every(isMutedProjectedCountry),
    `Projected Round of 16 and later country picks should stay muted until their source match winner is confirmed. Measured ${JSON.stringify({ m89LikelyVisuals, laterRoundLikelyVisuals: tournamentCheck.laterRoundLikelyVisuals })}.`
  );
  const groupETopTeam = getTeam(standingsData.groups?.E?.[0]?.teamId);
  const groupETopTeamName = groupETopTeam.standingName || groupETopTeam.name;
  const expectedProjectedRoundOf32Count = fixturesData.fixtures.filter(
    (fixture) => fixture.stage === "round-of-32" && (!fixture.homeTeamId || !fixture.awayTeamId)
  ).length;
  const expectedProjectedLaterRoundCount = fixturesData.fixtures.filter((fixture) =>
    ["round-of-16", "quarter-finals", "semi-finals", "bronze-final", "final"].includes(fixture.stage)
  ).length;
  const remainingGroupIds = new Set(
    fixturesData.fixtures
      .filter((fixture) => fixture.stage === "group" && fixture.status !== "FT" && fixture.groupId)
      .map((fixture) => fixture.groupId)
  );
  const shouldRenderRoundOf32SlotOdds = (fixture, side) => {
    if (fixture?.[`${side}TeamId`]) {
      return false;
    }

    const slotText = fixture?.[`${side}Slot`] || "";
    const groupPlaceMatch = /^Group ([A-L]) (?:winner|runner-up)$/i.exec(slotText);

    if (groupPlaceMatch) {
      return remainingGroupIds.has(groupPlaceMatch[1].toUpperCase());
    }

    return /^Group [A-L](?:\/[A-L])* third place$/i.test(slotText);
  };
  const expectedRoundOf32SlotOddsCount = fixturesData.fixtures
    .filter((fixture) => fixture.stage === "round-of-32")
    .reduce(
      (count, fixture) =>
        count +
        (shouldRenderRoundOf32SlotOdds(fixture, "home") ? 1 : 0) +
        (shouldRenderRoundOf32SlotOdds(fixture, "away") ? 1 : 0),
      0
    );
  const expectedRoundOf32OpenMatchIds = fixturesData.fixtures
    .filter((fixture) => fixture.stage === "round-of-32" && fixture.homeTeamId && fixture.awayTeamId)
    .map((fixture) => fixture.id)
    .sort();
  const knockoutStagesWithOutcomePills = new Set([
    "round-of-32",
    "round-of-16",
    "quarter-finals",
    "semi-finals",
    "bronze-final",
    "final"
  ]);
  const expectedOutcomeListCount = fixturesData.fixtures.filter(
    (fixture) =>
      knockoutStagesWithOutcomePills.has(fixture.stage) &&
      fixture.status !== "FT" &&
      !fixture.winnerTeamId &&
      !fixture.winner
  ).length;
  const expectedOutcomePillCount = expectedOutcomeListCount * 3;
  const expectedMatch74OpenMatchId =
    fixturesData.fixtures.find((fixture) => fixture.matchNumber === 74)?.id || "";
	  assert(
	    tournamentCheck.summary.includes("Round of 32 slots") &&
      tournamentCheck.m73ProgressText.includes("Jun 28 12:00PM") &&
      !tournamentCheck.m73ProgressText.includes("Jun 28 / 12:00PM") &&
      tournamentCheck.m74ProgressText.includes(groupETopTeamName) &&
      tournamentCheck.m74VenueText === "Massachusetts, USA" &&
      !tournamentCheck.m74ProgressText.includes("Boston Stadium") &&
      !tournamentCheck.m74ProgressText.includes("Foxborough") &&
      tournamentCheck.m74VenueTooltip === "Boston Stadium \u2022 Foxborough, Massachusetts, USA" &&
      !tournamentCheck.m74ProgressText.includes("Group E1") &&
      !tournamentCheck.m74ProgressText.includes("Group E Top 1") &&
      tournamentCheck.m81TeamIds.length === 2 &&
      !tournamentCheck.m81Text.includes("Group B/E/F/I/J third place") &&
      tournamentCheck.countryTooltipCount === 0 &&
      tournamentCheck.slotOddsCount === 0 &&
      tournamentCheck.slotOddsToneMismatches.length === 0 &&
      tournamentCheck.projectedCount === expectedProjectedRoundOf32Count + expectedProjectedLaterRoundCount &&
      tournamentCheck.roundOf32ProjectedCount === expectedProjectedRoundOf32Count &&
      tournamentCheck.roundOf32ProjectedMatchNumbers.length === expectedProjectedRoundOf32Count &&
      tournamentCheck.roundOf32OpenMatchIds.slice().sort().join("|") === expectedRoundOf32OpenMatchIds.join("|") &&
      tournamentCheck.m73FooterCount === 1 &&
      tournamentCheck.m73Projected === false &&
      tournamentCheck.m74Projected === false &&
      tournamentCheck.m73OpenMatchId === "match-73-round-of-32-2026-06-28" &&
      tournamentCheck.m74OpenMatchId === expectedMatch74OpenMatchId &&
      !tournamentCheck.m73ProgressText.includes("Round of 32") &&
      tournamentCheck.likelihoodCount === expectedOutcomePillCount &&
      tournamentCheck.likelihoodNonNeutralCount === 0 &&
      tournamentCheck.likelihoodTooltipCount === tournamentCheck.likelihoodCount &&
      tournamentCheck.likelihoodTooltipMaxLength <= 170 &&
      tournamentCheck.likelihoodListCount === expectedOutcomeListCount &&
      tournamentCheck.tiePillCount === expectedOutcomeListCount &&
      tournamentCheck.tiePillFlagCount === 0 &&
      tournamentCheck.m73PillCount === 3 &&
      tournamentCheck.m73OutcomeKeys.join("|") === "home|tie|away" &&
      tournamentCheck.m73OutcomeTexts.every((text) => !/\d+%\s+[A-Z][a-z]/.test(text)) &&
      tournamentCheck.m73OutcomeTexts.some((text) => /^Tie\s+\d+%$/.test(text)) &&
      tournamentCheck.m89PillCount === 3 &&
      tournamentCheck.m89SeedLabelCount === 0 &&
      tournamentCheck.m97PillCount === 3 &&
      tournamentCheck.m97SeedLabelCount === 0 &&
      tournamentCheck.m103PillCount === 3 &&
      tournamentCheck.m103Projected === true &&
      tournamentCheck.m104PillCount === 3 &&
      tournamentCheck.connectorStrokeValues.length === 1 &&
      tournamentCheck.connectorStrokeValues[0] === "rgb(217, 217, 217)" &&
      tournamentCheck.connectorStrokeWidths.length === 1 &&
      tournamentCheck.connectorStrokeWidths[0] >= 2.5 &&
      tournamentCheck.m89TeamIds.length === 2 &&
      tournamentCheck.m97TeamIds.length === 2 &&
      tournamentCheck.m103TeamIds.length === 2 &&
      tournamentCheck.m104TeamIds.length === 2 &&
      tournamentCheck.finalRailConnectorPathCount === 1 &&
      tournamentCheck.finalRailMoveCount >= 5 &&
      tournamentCheck.semi101RunnerUpNextMatch === "103" &&
      tournamentCheck.semi102RunnerUpNextMatch === "103" &&
      tournamentCheck.m104Rect &&
      tournamentCheck.m103Rect &&
      tournamentCheck.semi101Rect &&
      tournamentCheck.semi102Rect &&
      Math.abs(tournamentCheck.m104Rect.left - tournamentCheck.m103Rect.left) <= 1 &&
      tournamentCheck.m104Rect.center > tournamentCheck.semi101Rect.center + 24 &&
      tournamentCheck.m103Rect.center < tournamentCheck.semi102Rect.center - 24 &&
      tournamentCheck.m103Rect.top > tournamentCheck.m104Rect.bottom &&
      tournamentCheck.m103Rect.top - tournamentCheck.m104Rect.bottom <= 180 &&
      tournamentCheck.likelihoodText.includes("Tie") &&
      !tournamentCheck.likelihoodText.includes("here") &&
      !/\d+%\s+(?:Germany|Sweden|France|Canada|Argentina|Spain|Morocco|Japan)\b/.test(tournamentCheck.likelihoodText) &&
      !tournamentCheck.slotOddsText.includes("Germany ") &&
      !tournamentCheck.slotOddsText.includes("Bosnia and Herzegovina ") &&
      tournamentCheck.rankCount >= 32 &&
      !/\bGroup [A-L]\d\b/.test(tournamentCheck.m89Text) &&
      !/\bGroup [A-L]\d\b/.test(tournamentCheck.m97Text) &&
      tournamentCheck.m89Tooltips.includes("projects to win") &&
      tournamentCheck.m97Tooltips.includes("chance to win before penalties") &&
      tournamentCheck.likelihoodTooltips.includes("chance of penalties") &&
      !tournamentCheck.likelihoodTooltips.includes("Tie means level after normal/extra time") &&
      !tournamentCheck.likelihoodTooltips.includes("pull off the upset") &&
      tournamentCheck.m88AwayTooltip.includes("Egypt have a 35% chance to win before penalties. This is close, but Australia have the slight edge.") &&
      !tournamentCheck.m88AwayTooltip.includes("upset") &&
      !/(Michael Olise|Robin Risser|Oliver Baumann|Alexander Nübel|Alexander Nubel)/.test(
        tournamentCheck.likelihoodTooltips
      ) &&
      tournamentCheck.m77TieTooltip.includes("France have the shootout edge through Kylian Mbappé") &&
      !/goalkeeper|Olise|Risser/.test(tournamentCheck.m77TieTooltip) &&
      tournamentCheck.m74TieTooltip.includes("Germany have the shootout edge through Kai Havertz and Joshua Kimmich") &&
      !/goalkeeper|Baumann|Nübel|Nubel/.test(tournamentCheck.m74TieTooltip) &&
      tournamentCheck.m80TieTooltip.includes("Everton goalkeeper Jordan Pickford") &&
      tournamentCheck.m83TieTooltip.includes("Porto goalkeeper Diogo Costa") &&
      tournamentCheck.m86TieTooltip.includes("Aston Villa goalkeeper Emiliano Martínez") &&
      [tournamentCheck.m80TieTooltip, tournamentCheck.m83TieTooltip, tournamentCheck.m86TieTooltip].every(
        (tooltip) => (tooltip.match(/\bgoalkeeper\b/g) || []).length === 1
      ) &&
      !tournamentCheck.m89Text.includes("TBD") &&
      !tournamentCheck.m97Text.includes("TBD") &&
      !tournamentCheck.m103Text.includes("TBD") &&
      tournamentCheck.m103TimeText === "Jul 18 2:00PM (3rd place match)" &&
      !tournamentCheck.m103Text.includes("Third-place play-off") &&
      !tournamentCheck.m103Text.includes("Runner-up match") &&
      !tournamentCheck.m89Text.includes("Likely for now") &&
      !tournamentCheck.m97Text.includes("Likely for now") &&
      !tournamentCheck.sectionHeadingVisible &&
      !tournamentCheck.oldWinnerCopy &&
      tournamentCheck.posterMetaCount === 0 &&
      tournamentCheck.posterSeedCount === 0 &&
      tournamentCheck.thirdPlaceSeedTeamIds.length === 0 &&
      !/\bWinner match \d+\b/.test(tournamentCheck.progressText) &&
      !/\b(?:M\d+|To M\d+|Winner M\d+|W M\d+)\b/.test(`${tournamentCheck.r32Text} ${tournamentCheck.progressText}`) &&
      tournamentCheck.roundHeadings.join("|") === "Round of 32|Round of 16|Quarter-finals|Semi-finals|Final",
    `The tournament section should show locked Round of 32 matches and three outcome pills for every future knockout match. Measured ${JSON.stringify({ ...tournamentCheck, expectedRoundOf32OpenMatchIds, expectedRoundOf32SlotOddsCount, expectedOutcomePillCount, expectedOutcomeListCount })}.`
  );

  const zhTournamentTooltipCheck = await openPageAtTime(
    "2026-06-27T23:30:00.000Z",
    "/?view=standings&standingsMode=tournament&lang=zh&tz=America%2FLos_Angeles"
  );
  await zhTournamentTooltipCheck.page.waitForFunction(
    () => document.querySelectorAll('.progress-match[data-match-number="88"] .knockout-likelihood').length === 3
  );
  const zhTournamentTooltips = await zhTournamentTooltipCheck.page.evaluate(() => {
    const getOutcomeTooltip = (matchNumber, outcome) =>
      document
        .querySelector(`.progress-match[data-match-number="${matchNumber}"] .knockout-likelihood[data-outcome="${outcome}"]`)
        ?.getAttribute("data-tooltip") || "";
    const all = [...document.querySelectorAll(".knockout-likelihood")]
      .map((element) => element.getAttribute("data-tooltip") || "")
      .join(" ");

    return {
      all,
      m88Away: getOutcomeTooltip(88, "away")
    };
  });
  assert(
    zhTournamentTooltips.m88Away.includes("埃及点球前取胜概率约35%。这场很接近，但澳大利亚略占优势。") &&
      !zhTournamentTooltips.m88Away.includes("爆冷") &&
      !/chance|penalties|shootout|goalkeeper|favored|upset|projects|before penalties/i.test(
        zhTournamentTooltips.all
      ),
    `Chinese tournament outcome tooltips should use localized close-match wording and avoid stale English/upset templates. Measured ${JSON.stringify(zhTournamentTooltips)}.`
  );
  await zhTournamentTooltipCheck.context.close();

  await page.locator('.progress-match[data-match-number="73"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector("#matches-tab")?.getAttribute("aria-selected") === "true" &&
      document.querySelector('.match-row[data-match-id="match-73-round-of-32-2026-06-28"]')?.classList.contains("is-selected") &&
      document.querySelector("#match-info:not([hidden])")
  );
  const lockedBracketNavigation = await page.evaluate(() => {
    const params = new URL(window.location.href).searchParams;
    return {
      date: params.get("date"),
      match: params.get("match"),
      selectedRowPressed: document
        .querySelector('.match-row[data-match-id="match-73-round-of-32-2026-06-28"] .match-row-trigger')
        ?.getAttribute("aria-pressed"),
      stageLinkTarget: document.querySelector("#match-info [data-open-tournament-tab]")?.dataset.tournamentMatchNumber || "",
      stageLinkText: document.querySelector("#match-info [data-open-tournament-tab]")?.textContent.trim() || "",
      view: params.get("view")
    };
  });
  assert(
    lockedBracketNavigation.date === "2026-06-28" &&
      lockedBracketNavigation.match === "match-73-round-of-32-2026-06-28" &&
      lockedBracketNavigation.selectedRowPressed === "true" &&
      lockedBracketNavigation.stageLinkTarget === "73" &&
      lockedBracketNavigation.stageLinkText === "Round of 32" &&
      lockedBracketNavigation.view === null,
    `Locked tournament cards should open the matching date, row, and info card. Measured ${JSON.stringify(lockedBracketNavigation)}.`
  );

  await page.locator("#match-info [data-open-tournament-tab]").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#standings-tab")?.getAttribute("aria-selected") === "true" &&
      document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed") === "true" &&
      document.querySelector(".tournament-view") &&
      document.querySelector('.progress-match[data-match-number="73"]')?.classList.contains("is-drill-target") &&
      document.activeElement === document.querySelector('.progress-match[data-match-number="73"]')
  );
  assert(
    !new URL(page.url()).searchParams.has("standingsMode"),
    "Clicking the knockout round label in match info should jump back to the Tournament tab."
  );
  const roundOf32StageLinkTarget = await page.evaluate(() => ({
    activeMatchNumber: document.activeElement?.dataset?.matchNumber || "",
    highlighted: document
      .querySelector('.progress-match[data-match-number="73"]')
      ?.classList.contains("is-drill-target"),
    view: new URL(window.location.href).searchParams.get("view")
  }));
  assert(
    roundOf32StageLinkTarget.activeMatchNumber === "73" &&
      roundOf32StageLinkTarget.highlighted === true &&
      roundOf32StageLinkTarget.view === "standings",
    `Clicking a knockout round label should focus and highlight the exact bracket card. Measured ${JSON.stringify(roundOf32StageLinkTarget)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-07-15&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('.match-row[data-match-id="match-102-semi-final-2026-07-15"]');
  await page.locator('[data-match-id="match-102-semi-final-2026-07-15"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector("#match-info:not([hidden])") &&
      document.querySelector("#match-info [data-open-tournament-tab]")?.dataset.tournamentMatchNumber === "102"
  );
  await page.locator("#match-info [data-open-tournament-tab]").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed") === "true" &&
      document.querySelector('.progress-match[data-match-number="102"]')?.classList.contains("is-drill-target") &&
      document.activeElement === document.querySelector('.progress-match[data-match-number="102"]')
  );
  const semiFinalStageLinkTarget = await page.evaluate(() => ({
    activeMatchNumber: document.activeElement?.dataset?.matchNumber || "",
    highlighted: document
      .querySelector('.progress-match[data-match-number="102"]')
      ?.classList.contains("is-drill-target"),
    tabIndex: document.querySelector('.progress-match[data-match-number="102"]')?.getAttribute("tabindex") || ""
  }));
  assert(
    semiFinalStageLinkTarget.activeMatchNumber === "102" &&
      semiFinalStageLinkTarget.highlighted === true &&
      semiFinalStageLinkTarget.tabIndex === "-1",
    `Clicking a projected semi-final round label should focus and highlight its projected bracket card. Measured ${JSON.stringify(semiFinalStageLinkTarget)}.`
  );
	  await page.goto(`${baseUrl}?view=standings&tz=America%2FLos_Angeles`, {
	    waitUntil: "load"
	  });
	  await page.waitForFunction(
	    () =>
	      document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed") === "true" &&
	      document.querySelector('.progress-match[data-match-number="74"]')
	  );
	  let directTournamentConnectorsReady = true;
	  try {
	    await page.waitForFunction(
	      () => document.querySelectorAll(".progress-connectors path").length >= 29,
	      null,
	      { timeout: 1500 }
	    );
	  } catch {
	    directTournamentConnectorsReady = false;
	  }
	  const directTournamentConnectorState = await page.evaluate(() => {
	    const svgRect = document.querySelector(".progress-connectors")?.getBoundingClientRect();

	    return {
	      pathCount: document.querySelectorAll(".progress-connectors path").length,
	      svgBox: svgRect
	        ? {
	            height: Math.round(svgRect.height),
	            width: Math.round(svgRect.width)
	          }
	        : null,
	      tournamentVisible: !document.querySelector("#standings-panel")?.hidden
	    };
	  });
	  assert(
	    directTournamentConnectorsReady && directTournamentConnectorState.pathCount >= 29,
	    `Direct Tournament loads should draw connector rails without needing a tab switch. Measured ${JSON.stringify(directTournamentConnectorState)}.`
	  );

	  const tournamentLayoutChecks = [];
  for (const viewport of [
    { height: 900, width: 1280 },
    { height: 900, width: 700 },
    { height: 844, width: 390 },
    { height: 720, width: 320 }
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(80);
    tournamentLayoutChecks.push(
      await page.evaluate((viewportWidth) => {
        const documentElement = document.documentElement;
        const progression = document.querySelector(".tournament-progression");
        const match74 = document.querySelector('.progress-match[data-match-number="74"]');
        const match74Pair = match74?.querySelector(".knockout-match-pair");
        const match74PairStyle = match74Pair ? getComputedStyle(match74Pair) : null;
        const match74Teams = [...(match74?.querySelectorAll(".knockout-team") || [])];
        const match74TeamTops = match74Teams.map((team) => Math.round(team.getBoundingClientRect().top));
        const match74VsTop = Math.round(match74?.querySelector(".knockout-versus")?.getBoundingClientRect().top || 0);
        const match74Venue = match74?.querySelector(".knockout-match-venue");
        const match74VenueStyle = match74Venue ? getComputedStyle(match74Venue) : null;
        const match74OutcomeList = match74?.querySelector(".knockout-likelihood-list");
        const match74OutcomeListStyle = match74OutcomeList ? getComputedStyle(match74OutcomeList) : null;
        const match74OutcomePills = [...(match74?.querySelectorAll(".knockout-likelihood") || [])];
        const firstOutcomePillRect = match74OutcomePills[0]?.getBoundingClientRect();
        const secondOutcomePillRect = match74OutcomePills[1]?.getBoundingClientRect();
        const seedLabels = [...document.querySelectorAll('.progress-match .knockout-team-copy small')]
          .map((label) => label.textContent.trim());
        const match74OutcomeTooltips = [...document.querySelectorAll('.progress-match[data-match-number="74"] .knockout-likelihood')]
          .map((pill) => pill.getAttribute("data-tooltip") || "");
        const match74OutcomeKeys = [...document.querySelectorAll('.progress-match[data-match-number="74"] .knockout-likelihood')]
          .map((pill) => pill.dataset.outcome || "");
        const match74OutcomeStyles = match74OutcomePills.map((pill) => {
          const pillStyle = getComputedStyle(pill);
          return {
            background: pillStyle.backgroundColor,
            borderColor: pillStyle.borderColor,
            color: pillStyle.color
          };
        });
        const connector = document.querySelector(".progress-connectors");
        const connectorDisplay = connector ? getComputedStyle(connector).display : "";
        const connectorPath = connector?.querySelector("path");
        const connectorPathStyle = connectorPath ? getComputedStyle(connectorPath) : null;
        const progressionStyle = progression ? getComputedStyle(progression) : null;
        const progressionRect = progression?.getBoundingClientRect();
        const matchStyle = match74 ? getComputedStyle(match74) : null;
        const matchRect = match74?.getBoundingClientRect();
        const overflowingParticipantLabels = [...document.querySelectorAll(".progress-match .knockout-team-copy")]
          .filter((copy) => {
            const copyRect = copy.getBoundingClientRect();
            const cardRect = copy.closest(".progress-match")?.getBoundingClientRect();

            return Boolean(
              cardRect &&
                (copyRect.left < cardRect.left - 1 ||
                  copyRect.right > cardRect.right + 1)
            );
          })
          .length;

        return {
          cardPadding: matchStyle ? Math.round(parseFloat(matchStyle.paddingLeft)) : 0,
          cardWithinViewport: Boolean(matchRect && matchRect.left >= 0 && matchRect.right <= viewportWidth),
          cardWidth: matchRect ? Math.round(matchRect.width) : 0,
          connectorDisplay,
          connectorLineCap: connectorPathStyle?.strokeLinecap || "",
          connectorStroke: connectorPathStyle?.stroke || "",
          connectorPathCount: document.querySelectorAll(".progress-connectors path").length,
          connectorStrokeWidth: connectorPathStyle ? Number.parseFloat(connectorPathStyle.strokeWidth) : 0,
          match74PairJustifyContent: match74PairStyle?.justifyContent || "",
          match74OutcomeGap: firstOutcomePillRect && secondOutcomePillRect ? Math.round(secondOutcomePillRect.left - firstOutcomePillRect.right) : null,
          match74OutcomeKeys,
          match74OutcomeListJustifyContent: match74OutcomeListStyle?.justifyContent || "",
          match74OutcomeStyles,
          match74OutcomeTooltips,
          match74TieFlagCount: match74?.querySelectorAll('.knockout-likelihood[data-outcome="tie"] .flag').length || 0,
          match74SingleLine: match74TeamTops.length === 2 && match74TeamTops.every((top) => Math.abs(top - match74VsTop) <= 2),
          match74VenueCursor: match74VenueStyle?.cursor || "",
          match74VenueText: match74Venue?.textContent.trim() || "",
          match74VenueTooltip: match74Venue?.getAttribute("data-tooltip") || "",
          match74VenueFontWeight: match74VenueStyle ? Number.parseFloat(match74VenueStyle.fontWeight) : 0,
          overflowingParticipantLabels,
          progressionContentWidth: progressionRect && progressionStyle
            ? Math.round(progressionRect.width - 2 * parseFloat(progressionStyle.paddingLeft))
            : 0,
          progressionPadding: progressionStyle ? Math.round(parseFloat(progressionStyle.paddingLeft)) : 0,
          seedLines: seedLabels,
          scrollOverflow: Math.ceil(documentElement.scrollWidth - documentElement.clientWidth),
          viewportWidth
        };
      }, viewport.width)
    );
  }
  assert(
    tournamentLayoutChecks.every(
      (check) =>
        check.seedLines.length === 0 &&
        check.match74OutcomeKeys.join("|") === "home|tie|away" &&
        check.match74TieFlagCount === 0 &&
        check.match74OutcomeTooltips.some((tooltip) => tooltip.includes("chance of penalties")) &&
        check.match74OutcomeStyles.length === 3 &&
        check.match74OutcomeStyles.every(
          (style) =>
            style.background.startsWith("rgba(10, 10, 10") &&
            style.borderColor.startsWith("rgba(10, 10, 10") &&
            style.color.startsWith("rgba(10, 10, 10")
        ) &&
        check.match74OutcomeListJustifyContent === "flex-start" &&
        (check.match74OutcomeGap === null || (check.match74OutcomeGap >= 0 && check.match74OutcomeGap <= 16)) &&
        check.match74PairJustifyContent === "flex-start" &&
        check.match74VenueCursor === "help" &&
        check.match74VenueText === "Massachusetts, USA" &&
        check.match74VenueTooltip === "Boston Stadium \u2022 Foxborough, Massachusetts, USA" &&
        check.match74VenueFontWeight > 0 &&
        check.match74VenueFontWeight < 600 &&
        check.overflowingParticipantLabels === 0 &&
        check.scrollOverflow <= 1 &&
        (check.viewportWidth > 900
          ? check.cardWidth >= 288 && check.cardWidth <= 300
          : check.cardWidth >= 208 &&
            check.cardWidth <= 250 &&
            check.cardWidth < check.progressionContentWidth) &&
        check.progressionPadding >= 10 &&
        check.cardPadding >= 8 &&
        check.cardWithinViewport &&
        check.connectorDisplay === "block" &&
        check.connectorPathCount >= 29 &&
        check.connectorLineCap === "round" &&
        check.connectorStroke === "rgb(217, 217, 217)" &&
        check.connectorStrokeWidth >= 2.5
    ),
    `Tournament bracket outcome pills should stay readable with connector rails and no horizontal overflow at phone and desktop sizes. Measured ${JSON.stringify(tournamentLayoutChecks)}.`
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}?view=standings&standingsMode=tournament`, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelectorAll(".progress-connectors path").length >= 29);
  const mobileTournamentCanvasInitial = await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    const rounds = progression?.querySelector(".progress-rounds");
    const firstRound = document.querySelector('.progress-round[data-round-index="0"]');
    const finalRound = document.querySelector('.progress-round[data-round-index="4"]');
    const progressionRect = progression?.getBoundingClientRect();
    const firstRoundRect = firstRound?.getBoundingClientRect();
    const finalRoundRect = finalRound?.getBoundingClientRect();
    const firstCard = firstRound?.querySelector(".progress-match");
    const firstCardRect = firstCard.getBoundingClientRect();

    return {
      activeRoundId: progression.dataset.mobileActiveRoundId || "",
      activeRoundIndex: progression.dataset.mobileActiveRoundIndex || "",
      ariaLabel: progression.getAttribute("aria-label") || "",
      boardClass: progression.classList.contains("is-mobile-board"),
      cardWidth: Math.round(firstCardRect.width),
      connectorDisplay: getComputedStyle(document.querySelector(".progress-connectors")).display,
      finalRoundRight: Math.round(finalRoundRect.right - progressionRect.left),
      firstRoundLeft: Math.round(firstRoundRect.left - progressionRect.left),
      hiddenRounds: [...document.querySelectorAll(".progress-round.is-before-mobile-window")].length,
      mobilePathSpan: firstCard.style.getPropertyValue("--mobile-path-span").trim(),
      pathCount: document.querySelectorAll(".progress-connectors path").length,
      roundsWidth: rounds ? Math.round(rounds.getBoundingClientRect().width) : 0,
      scrollHeightOverflow: progression.scrollHeight - progression.clientHeight,
      scrollLeft: progression.scrollLeft,
      scrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  const tournamentBoardBox = await page.locator(".tournament-progression").boundingBox();
  assert(tournamentBoardBox, "Mobile tournament board should have a measurable canvas.");
  await page.mouse.move(
    tournamentBoardBox.x + tournamentBoardBox.width - 34,
    tournamentBoardBox.y + Math.min(tournamentBoardBox.height - 34, 460)
  );
  await page.mouse.down();
  await page.mouse.move(
    tournamentBoardBox.x + 46,
    tournamentBoardBox.y + Math.max(40, Math.min(tournamentBoardBox.height - 170, 300)),
    { steps: 10 }
  );
  await page.mouse.up();
  await page.waitForTimeout(80);
  const mobileTournamentCanvasAfterDrag = await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    const firstRound = document.querySelector('.progress-round[data-round-index="0"]');
    const secondRound = document.querySelector('.progress-round[data-round-index="1"]');
    const progressionRect = progression.getBoundingClientRect();
    const firstRoundRect = firstRound.getBoundingClientRect();
    const secondRoundRect = secondRound.getBoundingClientRect();

    return {
      activeRoundId: progression.dataset.mobileActiveRoundId || "",
      activeRoundIndex: progression.dataset.mobileActiveRoundIndex || "",
      firstRoundLeft: Math.round(firstRoundRect.left - progressionRect.left),
      hiddenRounds: [...document.querySelectorAll(".progress-round.is-before-mobile-window")].length,
      pathCount: document.querySelectorAll(".progress-connectors path").length,
      scrollLeft: Math.round(progression.scrollLeft),
      scrollTop: Math.round(progression.scrollTop),
      secondRoundLeft: Math.round(secondRoundRect.left - progressionRect.left),
      urlView: new URL(window.location.href).searchParams.get("view") || "",
      urlMatch: new URL(window.location.href).searchParams.get("match") || ""
    };
  });
  assert(
    mobileTournamentCanvasInitial.boardClass &&
      mobileTournamentCanvasInitial.ariaLabel === "Knockout winner progression" &&
      mobileTournamentCanvasInitial.activeRoundIndex === "" &&
      mobileTournamentCanvasInitial.activeRoundId === "" &&
      mobileTournamentCanvasInitial.firstRoundLeft >= 10 &&
      mobileTournamentCanvasInitial.firstRoundLeft <= 18 &&
      mobileTournamentCanvasInitial.finalRoundRight > mobileTournamentCanvasInitial.roundsWidth - 8 &&
      mobileTournamentCanvasInitial.cardWidth >= 208 &&
      mobileTournamentCanvasInitial.cardWidth <= 250 &&
      mobileTournamentCanvasInitial.connectorDisplay === "block" &&
      mobileTournamentCanvasInitial.pathCount >= 29 &&
      mobileTournamentCanvasInitial.mobilePathSpan === "" &&
      mobileTournamentCanvasInitial.hiddenRounds === 0 &&
      mobileTournamentCanvasInitial.scrollHeightOverflow > 120 &&
      mobileTournamentCanvasInitial.scrollOverflow <= 1 &&
      mobileTournamentCanvasAfterDrag.activeRoundIndex === "" &&
      mobileTournamentCanvasAfterDrag.activeRoundId === "" &&
      mobileTournamentCanvasAfterDrag.hiddenRounds === 0 &&
      mobileTournamentCanvasAfterDrag.pathCount >= 29 &&
      mobileTournamentCanvasAfterDrag.scrollLeft >= 120 &&
      mobileTournamentCanvasAfterDrag.scrollTop >= 80 &&
      mobileTournamentCanvasAfterDrag.firstRoundLeft < mobileTournamentCanvasInitial.firstRoundLeft - 100 &&
      mobileTournamentCanvasAfterDrag.secondRoundLeft < mobileTournamentCanvasInitial.cardWidth &&
      mobileTournamentCanvasAfterDrag.urlView === "standings" &&
      mobileTournamentCanvasAfterDrag.urlMatch === "",
    `Mobile tournament should behave like a draggable two-axis canvas with all rounds still present. Measured ${JSON.stringify({ mobileTournamentCanvasInitial, mobileTournamentCanvasAfterDrag })}.`
  );
  await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    window.scrollTo(0, 0);
    progression.scrollTop = progression.scrollHeight - progression.clientHeight;
  });
  await page.waitForTimeout(60);
  const tournamentBoardEdgeBox = await page.locator(".tournament-progression").boundingBox();
  assert(tournamentBoardEdgeBox, "Mobile tournament board edge handoff should have a measurable canvas.");
  await page.mouse.move(
    tournamentBoardEdgeBox.x + tournamentBoardEdgeBox.width / 2,
    tournamentBoardEdgeBox.y + Math.min(tournamentBoardEdgeBox.height - 34, 500)
  );
  await page.mouse.down();
  await page.mouse.move(
    tournamentBoardEdgeBox.x + tournamentBoardEdgeBox.width / 2,
    tournamentBoardEdgeBox.y + Math.max(34, tournamentBoardEdgeBox.height - 240),
    { steps: 8 }
  );
  await page.mouse.up();
  await page.waitForTimeout(80);
  const mobileTournamentCanvasEdgeHandoff = await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    const maxScrollTop = progression.scrollHeight - progression.clientHeight;

    return {
      activeRoundId: progression.dataset.mobileActiveRoundId || "",
      canvasRemainingBottom: Math.round(maxScrollTop - progression.scrollTop),
      hiddenRounds: [...document.querySelectorAll(".progress-round.is-before-mobile-window")].length,
      pageScrollY: Math.round(window.scrollY),
      scrollTop: Math.round(progression.scrollTop),
      urlMatch: new URL(window.location.href).searchParams.get("match") || ""
    };
  });
  assert(
    mobileTournamentCanvasEdgeHandoff.activeRoundId === "" &&
      mobileTournamentCanvasEdgeHandoff.hiddenRounds === 0 &&
      mobileTournamentCanvasEdgeHandoff.canvasRemainingBottom <= 2 &&
      mobileTournamentCanvasEdgeHandoff.pageScrollY >= 80 &&
      mobileTournamentCanvasEdgeHandoff.urlMatch === "",
    `Dragging past the bottom of the mobile tournament canvas should hand vertical movement to the page. Measured ${JSON.stringify(mobileTournamentCanvasEdgeHandoff)}.`
  );
  await page.setViewportSize({ width: 1280, height: 720 });
  const knockoutProgressionCheck = await openPageAtTime(
    "2026-07-05T12:00:00.000Z",
    "/?view=matches&date=2026-06-17&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const finishMatch = (matchNumber, homeScore, awayScore) => {
          const fixture = data.fixtures.find((item) => item.matchNumber === matchNumber);

          fixture.status = "FT";
          fixture.score = { home: homeScore, away: awayScore };
        };

        finishMatch(74, 2, 0);
        finishMatch(77, 1, 0);
        finishMatch(89, 3, 1);
      }
    }
  );
  await knockoutProgressionCheck.page.locator("#standings-tab").click();
  await knockoutProgressionCheck.page.locator("#standings-tournament-tab").click();
  await knockoutProgressionCheck.page.waitForFunction(
    () => document.querySelector('.progress-match[data-match-number="97"] .knockout-team[data-source-match="89"]')
  );
  const progressionResolved = await knockoutProgressionCheck.page.evaluate(() => {
    const match74 = document.querySelector('.progress-match[data-match-number="74"]');
    const match77 = document.querySelector('.progress-match[data-match-number="77"]');
    const match89 = document.querySelector('.progress-match[data-match-number="89"]');
    const match97Source = document.querySelector(
      '.progress-match[data-match-number="97"] .knockout-team[data-source-match="89"]'
    );

    return {
      m74Winner: match74?.dataset.winnerTeamId,
      m77Winner: match77?.dataset.winnerTeamId,
      m89TeamIds: [...match89.querySelectorAll(".knockout-team[data-team-id]")].map(
        (team) => team.dataset.teamId
      ),
      m89Text: match89.textContent.replace(/\s+/g, " ").trim(),
      m89Winner: match89.dataset.winnerTeamId,
      m97SourceTeamId: match97Source?.dataset.teamId,
      m97Text: document
        .querySelector('.progress-match[data-match-number="97"]')
        ?.textContent.replace(/\s+/g, " ")
        .trim()
    };
  });
  const progressionWinnerTeam = getTeam(progressionResolved.m74Winner);
  const progressionWinnerName = progressionWinnerTeam.standingName || progressionWinnerTeam.name;
  assert(
    progressionResolved.m89TeamIds.join("|") ===
      [progressionResolved.m74Winner, progressionResolved.m77Winner].join("|") &&
      progressionResolved.m89Winner === progressionResolved.m74Winner &&
      progressionResolved.m97SourceTeamId === progressionResolved.m74Winner &&
      progressionResolved.m89Text.includes(`${progressionWinnerName} won`) &&
      !progressionResolved.m97Text.includes("Winner match") &&
      !progressionResolved.m89Text.includes("M97") &&
      progressionResolved.m97Text.includes(progressionWinnerName),
    "Finished knockout source matches should automatically place their winners into later fixture slots."
  );
  await knockoutProgressionCheck.context.close();
  await page.locator("#standings-year-button").click();
  assert(
    await page.locator("#standings-year-popover").isVisible(),
    "The standings year picker should open from the heading year."
  );
  await page.locator('.standings-year-option[data-standings-year="2022"]').click();
  assert(
    (await page.locator("#standings-heading").innerText()).replace(/\s+/g, " ").trim() ===
      "2022 Standings",
    "Choosing a past year should update the standings heading."
  );
  assert(
    new URL(page.url()).searchParams.get("standingsYear") === "2022",
    "The selected standings year should be reflected in the URL."
  );
  const historicalStandingsCheck = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".standings-card")];
    const groups = new Map(
      cards.map((card) => [
        card.querySelector("h2")?.textContent.trim(),
        [...card.querySelectorAll(".standing-name")].map((team) => team.textContent.trim())
      ])
    );
    const groupACard = cards.find((card) => card.querySelector("h2")?.textContent.trim() === "Group A");

    return {
      groupA: groups.get("Group A"),
      groupAFlagCount: groupACard?.querySelectorAll(".standing-team .flag").length || 0,
      summary: document.querySelector("#standings-summary")?.textContent.trim()
    };
  });
  assert(
    historicalStandingsCheck.groupA?.join("|") === "Netherlands|Senegal|Ecuador|Qatar",
    "The 2022 standings view should render archived group tables."
  );
  assert(
    historicalStandingsCheck.groupAFlagCount === 4,
    "The 2022 standings view should render a flag for each archived group team."
  );
  assert(
    historicalStandingsCheck.summary === "Final group tables computed from archived match results.",
    "Historical standings should explain their archived data source."
  );

  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-17&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  const tabletHeaderMetrics = await page.evaluate(() => {
    const catchUpButton = document.querySelector("#catch-up-button").getBoundingClientRect();
    const settingsButton = document.querySelector("#settings-button").getBoundingClientRect();

    return {
      overlapsSettings:
        catchUpButton.right > settingsButton.left &&
        catchUpButton.left < settingsButton.right &&
        catchUpButton.bottom > settingsButton.top &&
        catchUpButton.top < settingsButton.bottom
    };
  });
  assert(
    !tabletHeaderMetrics.overlapsSettings,
    "Catch Up should not overlap the Settings button at tablet widths."
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-17&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  const mobileTimeZoneLabel = await page.locator("#timezone-select option:checked").textContent();
  assert(
    mobileTimeZoneLabel?.includes("America/Los Angeles"),
    "Mobile settings timezone should keep the full desktop-style timezone label."
  );
  const mobileHeaderMetrics = await page.evaluate(() => {
    const headerControls = document.querySelector("#header-controls").getBoundingClientRect();
    const catchUpButton = document.querySelector("#catch-up-button").getBoundingClientRect();
    const settingsButton = document.querySelector("#settings-button").getBoundingClientRect();

    return {
      controlsGap: settingsButton.left - catchUpButton.right,
      centerOffset: Math.abs(
        settingsButton.top +
          settingsButton.height / 2 -
          (catchUpButton.top + catchUpButton.height / 2)
      ),
      controlsRightGap: document.documentElement.clientWidth - headerControls.right,
      scrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  assert(
    mobileHeaderMetrics.controlsGap >= 0 && mobileHeaderMetrics.controlsGap <= 10,
    "Mobile Catch Up and Settings buttons should sit beside each other."
  );
  assert(
    mobileHeaderMetrics.centerOffset <= 4 &&
      mobileHeaderMetrics.controlsRightGap <= 22 &&
      mobileHeaderMetrics.scrollOverflow <= 1,
    "Mobile header controls should stay right-aligned without page overflow."
  );
  const mobileToolbarMetrics = await page.evaluate(() => {
    const toolbar = document.querySelector(".match-toolbar")?.getBoundingClientRect();
    const dayLabel = document.querySelector("#day-label")?.getBoundingClientRect();
    const search = document.querySelector("#team-search")?.getBoundingClientRect();
    const searchToggle = document.querySelector("#team-search-toggle")?.getBoundingClientRect();

    if (!toolbar || !dayLabel || !search || !searchToggle) {
      return null;
    }

    return {
      gapFromDate: Math.round(search.left - dayLabel.right),
      searchRightGap: Math.round(toolbar.right - search.right),
      toggleRightGap: Math.round(toolbar.right - searchToggle.right)
    };
  });
  assert(
    mobileToolbarMetrics &&
      mobileToolbarMetrics.gapFromDate >= 24 &&
      mobileToolbarMetrics.searchRightGap <= 2 &&
      mobileToolbarMetrics.toggleRightGap <= 2,
    "Mobile match search icon should be right-aligned instead of sitting next to the Today chevron."
  );
  await page.locator("#team-search-toggle").click();
  await page.waitForTimeout(220);
  const activeMobileToolbarMetrics = await page.evaluate(() => {
    const toolbar = document.querySelector(".match-toolbar")?.getBoundingClientRect();
    const dayLabel = document.querySelector("#day-label")?.getBoundingClientRect();
    const searchField = document.querySelector(".team-search-field")?.getBoundingClientRect();
    const searchInputElement = document.querySelector("#team-search-input");
    const searchInput = searchInputElement?.getBoundingClientRect();

    if (!toolbar || !dayLabel || !searchField || !searchInput || !searchInputElement) {
      return null;
    }

    return {
      fieldGapFromDate: Math.round(searchField.left - dayLabel.right),
      fieldRightGap: Math.round(toolbar.right - searchField.right),
      fieldTopOffset: Math.round(searchField.top - toolbar.top),
      inputFontSize: Number.parseFloat(getComputedStyle(searchInputElement).fontSize),
      inputWidth: Math.round(searchInput.width),
      scrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      toolbarHeight: Math.round(toolbar.height)
    };
  });
  assert(
    activeMobileToolbarMetrics &&
      activeMobileToolbarMetrics.toolbarHeight <= 42 &&
      activeMobileToolbarMetrics.fieldTopOffset <= 1 &&
      activeMobileToolbarMetrics.fieldGapFromDate >= 8 &&
      activeMobileToolbarMetrics.fieldRightGap <= 2 &&
      activeMobileToolbarMetrics.inputFontSize >= 13 &&
      activeMobileToolbarMetrics.inputFontSize <= 14 &&
      activeMobileToolbarMetrics.inputWidth >= 120 &&
      activeMobileToolbarMetrics.scrollOverflow <= 1,
    "Active mobile match search should expand on the toolbar row without dropping below the date."
  );
  await page.locator("#team-search-input").press("Escape");
  const mobileRowMetrics = await page.locator(".match-row").first().evaluate((row) => {
    const time = row.querySelector(".match-time");
    const teams = row.querySelector(".match-teams");
    const meta = row.querySelector(".match-row-meta");
    const rankPills = row.querySelectorAll(".match-teams .rank-pill");
    const timeStyle = getComputedStyle(time);
    const teamsStyle = getComputedStyle(teams);
    const timeBox = time.getBoundingClientRect();
    const teamsBox = teams.getBoundingClientRect();
    const metaBox = meta?.getBoundingClientRect();

    return {
      metaCenter: metaBox ? metaBox.top + metaBox.height / 2 : null,
      rankCount: rankPills.length,
      rowHeight: row.getBoundingClientRect().height,
      teamsCenter: teamsBox.top + teamsBox.height / 2,
      teamsFont: Number.parseFloat(teamsStyle.fontSize),
      teamsHeight: teamsBox.height,
      timeCenter: timeBox.top + timeBox.height / 2,
      timeFont: Number.parseFloat(timeStyle.fontSize),
      timeHeight: timeBox.height
    };
  });
  assert(
    mobileRowMetrics.timeFont <= 12.5 &&
      mobileRowMetrics.teamsFont <= 14.5 &&
      mobileRowMetrics.rankCount === 0,
    "Mobile match rows should keep compact time/team text with ranking pills hidden."
  );
  assert(
    Math.abs(mobileRowMetrics.timeCenter - mobileRowMetrics.teamsCenter) <= 3 &&
      Math.abs(mobileRowMetrics.metaCenter - mobileRowMetrics.teamsCenter) <= 3,
    "Mobile match rows should vertically center time and status chips against wrapped matchup text."
  );

  await page.setViewportSize({ width: 640, height: 844 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-24&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="switzerland-canada-2026-06-24"]');
  const tabletMatchHoverMetrics = await getHoveredMatchRowEdgeMetrics(page, "#match-list > .match-row");
  assertCleanHoveredMatchRowEdges(
    tabletMatchHoverMetrics,
    "Tablet-width hovered match rows should keep score and pending chips inside the clipped match layout.",
    { expectNoTransform: true, minLayoutRightGap: 3 }
  );

  await page.setViewportSize({ width: 558, height: 768 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-24&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="bosnia-qatar-2026-06-24"]');
  const completedScoreRailMetrics = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("#match-list > .match-row"));
    return rows
      .map((row) => {
        const score = row.querySelector(".match-score");
        if (!score) {
          return null;
        }
        const rowRect = row.getBoundingClientRect();
        const scoreRect = score.getBoundingClientRect();

        return {
          hasWrappedClass: row.classList.contains("has-wrapped-matchup"),
          id: row.getAttribute("data-match-id"),
          rightGap: Math.round(rowRect.right - scoreRect.right),
          scrollOverflow: row.scrollWidth - row.clientWidth
        };
      })
      .filter(Boolean);
  });
  const completedScoreRailGaps = completedScoreRailMetrics.map((metric) => metric.rightGap);
  assert(
    completedScoreRailMetrics.length >= 6 &&
      completedScoreRailMetrics.some((metric) => metric.id === "bosnia-qatar-2026-06-24") &&
      Math.max(...completedScoreRailGaps) - Math.min(...completedScoreRailGaps) <= 6 &&
      completedScoreRailMetrics.every(
        (metric) => metric.rightGap >= 0 && metric.rightGap <= 12 && metric.scrollOverflow <= 1
      ),
    `Completed score pills should share the same right rail with ranking hidden from rows. Measured ${JSON.stringify(completedScoreRailMetrics)}.`
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-24&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="bosnia-qatar-2026-06-24"]');
  const currentDayWrappedRowMetrics = await page
    .locator('[data-match-id="bosnia-qatar-2026-06-24"]')
    .evaluate((row) => {
      const time = row.querySelector(".match-time");
      const teams = row.querySelector(".match-teams");
      const meta = row.querySelector(".match-row-meta");
      const timeBox = time.getBoundingClientRect();
      const teamsBox = teams.getBoundingClientRect();
      const metaBox = meta?.getBoundingClientRect();
      const hiddenNames = Array.from(row.querySelectorAll(".match-teams .team-name")).filter(
        (name) => name.scrollWidth > name.clientWidth + 1 && getComputedStyle(name).overflow !== "visible"
      );

      return {
        hiddenNameCount: hiddenNames.length,
        metaCenter: metaBox ? metaBox.top + metaBox.height / 2 : null,
        rowHeight: row.getBoundingClientRect().height,
        scrollOverflow: row.scrollWidth - row.clientWidth,
        teamsCenter: teamsBox.top + teamsBox.height / 2,
        timeCenter: timeBox.top + timeBox.height / 2
      };
    });
  assert(
    currentDayWrappedRowMetrics.hiddenNameCount === 0 &&
      currentDayWrappedRowMetrics.rowHeight <= 58 &&
      currentDayWrappedRowMetrics.scrollOverflow <= 1 &&
      Math.abs(currentDayWrappedRowMetrics.timeCenter - currentDayWrappedRowMetrics.teamsCenter) <= 3 &&
      Math.abs(currentDayWrappedRowMetrics.metaCenter - currentDayWrappedRowMetrics.teamsCenter) <= 3,
    `Wrapped current-day rows should center time and status pills against visible team text. Measured ${JSON.stringify(currentDayWrappedRowMetrics)}.`
  );
  const currentDayMobileRailMetrics = await page.locator(".match-row").evaluateAll((rows) =>
    rows
      .map((row) => {
        const chip = row.querySelector(
          ".match-row-meta .live-pill, .match-row-meta .up-next-pill, .match-row-meta .match-score, .match-row-meta .score-status"
        );

        if (!chip) {
          return null;
        }

        const rowRect = row.getBoundingClientRect();
        const chipRect = chip.getBoundingClientRect();
        const textPieces = Array.from(
          row.querySelectorAll(".match-teams .flag, .match-teams .team-name, .match-teams .match-versus")
        );
        const homePieces = Array.from(
          row.querySelectorAll(".match-team-home .flag, .match-team-home .team-name")
        );
        const versus = row.querySelector(".match-versus");
        const awayFlag = row.querySelector(".match-team-away .flag");
        const collisions = [];
        let maxTextRight = Number.NEGATIVE_INFINITY;
        let maxHomeTextRight = Number.NEGATIVE_INFINITY;
        const getVisualRects = (piece) => {
          if (!piece.classList.contains("team-name")) {
            return [piece.getBoundingClientRect()];
          }

          const range = document.createRange();
          range.selectNodeContents(piece);
          const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
          range.detach();
          return rects.length ? rects : [piece.getBoundingClientRect()];
        };

        textPieces.forEach((piece) => {
          getVisualRects(piece).forEach((pieceRect) => {
            const verticalOverlap =
              Math.min(chipRect.bottom, pieceRect.bottom) - Math.max(chipRect.top, pieceRect.top);
            const horizontalOverlap =
              Math.min(chipRect.right, pieceRect.right) - Math.max(chipRect.left, pieceRect.left);

            maxTextRight = Math.max(maxTextRight, pieceRect.right);

            if (verticalOverlap > 0.5 && horizontalOverlap > 0.5) {
              collisions.push(piece.textContent.replace(/\s+/g, " ").trim());
            }
          });
        });

        homePieces.forEach((piece) => {
          getVisualRects(piece).forEach((pieceRect) => {
            maxHomeTextRight = Math.max(maxHomeTextRight, pieceRect.right);
          });
        });

        const hasWrappedClass = row.classList.contains("has-wrapped-matchup");
        const homeRect = row.querySelector(".match-team-home")?.getBoundingClientRect();
        const versusRect = versus?.getBoundingClientRect();
        const awayFlagRect = awayFlag?.getBoundingClientRect();
        const compactShapeOk =
          !hasWrappedClass ||
          (homeRect &&
            versusRect &&
            awayFlagRect &&
            homeRect.top < versusRect.top &&
            Math.abs(versusRect.top + versusRect.height / 2 - (awayFlagRect.top + awayFlagRect.height / 2)) <= 2 &&
            versusRect.right <= awayFlagRect.left + 1);

        return {
          chipRight: chipRect.right,
          compactShapeOk,
          collisions,
          documentScrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          hasWrappedClass,
          homeVisualGap:
            versus && Number.isFinite(maxHomeTextRight)
              ? versus.getBoundingClientRect().left - maxHomeTextRight
              : null,
          id: row.getAttribute("data-match-id"),
          rowRightGap: rowRect.right - chipRect.right,
          rowScrollOverflow: row.scrollWidth - row.clientWidth,
          textScoreGap: Number.isFinite(maxTextRight) ? chipRect.left - maxTextRight : null,
          text: row.innerText.replace(/\s+/g, " ").trim()
        };
      })
      .filter(Boolean)
  );
  const currentDayMobileRailRights = currentDayMobileRailMetrics.map((metric) => metric.chipRight);
  assert(
    currentDayMobileRailMetrics.length >= 6 &&
      Math.max(...currentDayMobileRailRights) - Math.min(...currentDayMobileRailRights) <= 1 &&
      currentDayMobileRailMetrics.every(
        (metric) =>
          metric.collisions.length === 0 &&
          metric.documentScrollOverflow <= 1 &&
          metric.rowScrollOverflow <= 1 &&
          metric.rowRightGap >= 2 &&
          metric.rowRightGap <= 8 &&
          metric.compactShapeOk &&
          (metric.textScoreGap === null || metric.textScoreGap >= 2) &&
          (metric.homeVisualGap === null ||
            metric.hasWrappedClass ||
            (metric.homeVisualGap >= 0 && metric.homeVisualGap <= 12))
      ),
    `Mobile match rows should keep the vs label close to the left team and reserve a clean right rail for pills. Measured ${JSON.stringify(currentDayMobileRailMetrics)}.`
  );
  const mobileCompletedHoverRow = page.locator('[data-match-id="switzerland-canada-2026-06-24"]');
  await mobileCompletedHoverRow.hover();
  const mobileCompletedHoverMetrics = await mobileCompletedHoverRow.evaluate((row) => {
    const rowRect = row.getBoundingClientRect();
    const layoutRect = row.closest(".match-layout")?.getBoundingClientRect();
    const scoreRect = row.querySelector(".match-score")?.getBoundingClientRect();

    return {
      layoutRightGap: layoutRect && scoreRect ? layoutRect.right - scoreRect.right : 0,
      rowRightGap: scoreRect ? rowRect.right - scoreRect.right : 0,
      rowScrollOverflow: row.scrollWidth - row.clientWidth,
      scoreRightOverflow:
        layoutRect && scoreRect ? Math.max(0, scoreRect.right - layoutRect.right) : Number.POSITIVE_INFINITY,
      transform: getComputedStyle(row).transform
    };
  });
  assert(
    mobileCompletedHoverMetrics.transform === "none" &&
      mobileCompletedHoverMetrics.rowRightGap >= 2 &&
      mobileCompletedHoverMetrics.layoutRightGap >= 2 &&
      mobileCompletedHoverMetrics.rowScrollOverflow <= 1 &&
      mobileCompletedHoverMetrics.scoreRightOverflow <= 1,
    `Hovered mobile completed rows should not nudge score pills into the clipped edge. Measured ${JSON.stringify(mobileCompletedHoverMetrics)}.`
  );
  const southAfricaSouthKoreaRowMetrics = await page
    .locator('[data-match-id="south-africa-south-korea-2026-06-24"]')
    .evaluate((row) => {
      const rowRect = row.getBoundingClientRect();
      const awayTeam = row.querySelector(".match-team-away");
      const awayFlag = awayTeam?.querySelector(".flag");
      const awayName = awayTeam?.querySelector(".team-name");
      const getLineRects = (element) => {
        if (!element) {
          return [];
        }

        const range = document.createRange();
        range.selectNodeContents(element);
        const rects = Array.from(range.getClientRects()).map((bounds) => ({
          center: bounds.top + bounds.height / 2,
          right: bounds.right,
          top: bounds.top
        }));
        range.detach();
        return rects;
      };
      const awayNameLines = getLineRects(awayName);
      const pieces = Array.from(row.querySelectorAll(".match-teams .flag, .match-teams .team-name"));
      const pieceRightOverflow = pieces.map((piece) => piece.getBoundingClientRect().right - rowRect.right);

      return {
        awayFlag: awayFlag?.textContent.replace(/\s+/g, " ").trim() || "",
        awayName: awayName?.textContent.replace(/\s+/g, " ").trim() || "",
        awayNameLineCount: awayNameLines.length,
        pieceRightOverflow: Math.max(0, ...pieceRightOverflow),
        rankCount: row.querySelectorAll(".match-teams .rank-pill").length,
        scrollOverflow: row.scrollWidth - row.clientWidth,
        text: row.innerText.replace(/\s+/g, " ").trim()
      };
    });
  assert(
    southAfricaSouthKoreaRowMetrics.text.startsWith("6:00PM") &&
      southAfricaSouthKoreaRowMetrics.awayFlag === "🇰🇷" &&
      southAfricaSouthKoreaRowMetrics.awayName === "South Korea" &&
      southAfricaSouthKoreaRowMetrics.awayNameLineCount >= 1 &&
      southAfricaSouthKoreaRowMetrics.rankCount === 0 &&
      southAfricaSouthKoreaRowMetrics.pieceRightOverflow <= 1 &&
      southAfricaSouthKoreaRowMetrics.scrollOverflow <= 1,
    `South Africa vs South Korea should keep wrapped country names visible with no home-row rank pills. Measured ${JSON.stringify(southAfricaSouthKoreaRowMetrics)}.`
  );
  await page.locator('[data-match-id="bosnia-qatar-2026-06-24"]').click();
  await page.waitForSelector("#match-info .info-tooltip-button");
  const mobileTooltipBounds = await page.evaluate(() => {
    const selectors = [
      ".info-tooltip-button[data-tooltip]",
      ".rank-pill[data-tooltip]",
      ".standing-help[data-tooltip]",
      ".standing-team.has-name-tooltip[data-tooltip]",
      ".prediction-row.has-label-tooltip[data-tooltip]",
      ".past-record-row.has-label-tooltip[data-tooltip]",
      ".team.has-team-tooltip[data-tooltip]",
      ".summary-team.has-team-tooltip[data-tooltip]",
      ".live-pill[data-tooltip]",
      ".knockout-likelihood[data-tooltip]",
      ".player-card-value-help[data-tooltip]"
    ];
    const parsePx = (value) => Number.parseFloat(value) || 0;
    const transformX = (value) => {
      if (!value || value === "none") {
        return 0;
      }
      const match = value.match(/^matrix\((.+)\)$/);
      if (!match) {
        return 0;
      }
      const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
      return Number.isFinite(parts[4]) ? parts[4] : 0;
    };
    const clipRectFor = (element) => {
      const viewportRight = document.documentElement.clientWidth || window.innerWidth;
      const knockoutCard = element.matches(".knockout-likelihood[data-tooltip]")
        ? element.closest(".progress-match")
        : null;
      if (knockoutCard) {
        const rect = knockoutCard.getBoundingClientRect();
        if (rect.width > 0) {
          return {
            left: Math.max(0, rect.left),
            right: Math.min(viewportRight, rect.right)
          };
        }
      }
      let node = element.parentElement;
      while (node && node !== document.documentElement) {
        const style = getComputedStyle(node);
        if (style.overflowX !== "visible") {
          const rect = node.getBoundingClientRect();
          if (rect.width > 0) {
            return {
              left: Math.max(0, rect.left),
              right: Math.min(viewportRight, rect.right)
            };
          }
        }
        node = node.parentElement;
      }
      return { left: 0, right: viewportRight };
    };
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        getComputedStyle(element).visibility !== "hidden" &&
        !element.closest("[hidden], .is-hidden")
      );
    };

    return selectors
      .flatMap((selector) =>
        Array.from(document.querySelectorAll(selector))
          .filter(isVisible)
          .map((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element, "::after");
            if (style.left === "auto") {
              return null;
            }

            const width =
              parsePx(style.width) +
              parsePx(style.paddingLeft) +
              parsePx(style.paddingRight) +
              parsePx(style.borderLeftWidth) +
              parsePx(style.borderRightWidth);
            if (!width) {
              return null;
            }

            const left = rect.left + parsePx(style.left) + transformX(style.transform);
            const right = left + width;
            const clip = clipRectFor(element);
            const edgeGap = 5;
            return {
              selector,
              tooltip: element.getAttribute("data-tooltip") || "",
              shift: element.style.getPropertyValue("--tooltip-shift-x"),
              overflowLeft: Math.max(0, clip.left + edgeGap - left),
              overflowRight: Math.max(0, right - (clip.right - edgeGap))
            };
          })
      )
      .filter(Boolean);
  });
  assert(
    mobileTooltipBounds.some(
      (item) =>
        item.selector === ".info-tooltip-button[data-tooltip]" &&
        item.tooltip.includes("Market consensus") &&
        item.shift
    ),
    "Mobile prediction source tooltip should be shifted inside the match card bounds."
  );
  assert(
    mobileTooltipBounds.every(
      (item) => item.overflowLeft <= 1 && item.overflowRight <= 1
    ),
    "Mobile centered tooltips should stay inside their clipping bounds."
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator(".match-row").first().click();
  await page.waitForFunction(() => window.scrollY > 100);

  const touchContext = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 }
  });
  const touchPage = await touchContext.newPage();
  await touchPage.goto(`${baseUrl}?view=matches&date=2026-06-18&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await touchPage.waitForSelector(".match-row");
  const touchTodayRow = touchPage.locator('[data-match-id="switzerland-bosnia-2026-06-18"]');
  const touchYesterdayCard = touchPage.locator(
    '.yesterday-match-card[data-match-id="england-croatia-2026-06-17"]'
  );
  await touchTodayRow.evaluate((row) => {
    row.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "touch" }));
  });
  await touchYesterdayCard.evaluate((card) => {
    card.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "touch" }));
  });
  assert(
    !(await touchPage.locator("#match-info").isVisible()) &&
      (await touchPage.locator(".match-row.is-selected, .yesterday-match-card.is-selected").count()) === 0,
    "On touch devices, today and Past 24 hours rows should not open match details from hover preview events."
  );
  await touchTodayRow.click();
  await touchPage.waitForSelector("#match-info:not(.is-hidden)");
  const touchTodayDetailText = await touchPage.locator("#match-info").innerText();
  assert(
    touchTodayDetailText.includes("Switzerland") &&
      touchTodayDetailText.includes("Bosnia and Herzegovina") &&
      (await touchTodayRow.locator(".match-row-trigger").getAttribute("aria-pressed")) === "true",
    "On touch devices, tapping a today's match row should open its match detail card."
  );
  await touchYesterdayCard.click();
  const touchYesterdayDetailText = await touchPage.locator("#match-info").innerText();
  assert(
    touchYesterdayDetailText.includes("England") &&
      touchYesterdayDetailText.includes("Croatia") &&
      (await touchYesterdayCard.locator(".yesterday-match-button").getAttribute("aria-pressed")) === "true",
    "On touch devices, tapping a Past 24 hours card should open its match detail card."
  );

  await touchPage.goto(`${baseUrl}?view=matches&date=2026-06-21&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await touchPage.waitForSelector(".match-row");
  await touchPage.locator('[data-match-id="belgium-ir-iran-2026-06-21"]').click();
  const touchPlayerLink = touchPage.locator(".key-info-team .player-link", { hasText: "Romelu Lukaku" }).first();
  await touchPlayerLink.click();
  const touchPlayerCard = touchPage.locator(".player-card:visible").first();
  await touchPlayerCard.waitFor({ state: "visible" });
  assert(
    (await touchPlayerLink.getAttribute("aria-expanded")) === "true" &&
      (await touchPlayerCard.locator(".player-card-name").innerText()).trim() === "Romelu Lukaku",
    "On touch devices, the first player-name tap should open the player card instead of navigating away."
  );
  const secondTouchPlayerLink = touchPage.locator(".key-info-team .player-link", { hasText: "Kevin De Bruyne" }).first();
  await secondTouchPlayerLink.evaluate((link) => {
    link.closest(".player-hover")?.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "touch" }));
  });
  const visibleTouchHoverPlayerCards = touchPage.locator(".player-card:visible");
  assert(
    (await visibleTouchHoverPlayerCards.count()) === 1 &&
      (await visibleTouchHoverPlayerCards.first().locator(".player-card-name").innerText()).trim() === "Romelu Lukaku",
    "On touch devices, touch hover events should not preview a second player card before tap."
  );
  await secondTouchPlayerLink.click();
  const visibleTouchPlayerCards = touchPage.locator(".player-card:visible");
  await visibleTouchPlayerCards.first().waitFor({ state: "visible" });
  assert(
    (await visibleTouchPlayerCards.count()) === 1 &&
      (await secondTouchPlayerLink.getAttribute("aria-expanded")) === "true" &&
      (await touchPlayerLink.getAttribute("aria-expanded")) === "false" &&
      (await visibleTouchPlayerCards.first().locator(".player-card-name").innerText()).trim() === "Kevin De Bruyne",
    "On touch devices, tapping a second player name should replace the first player card instead of showing two."
  );
  await touchPage.locator("#match-info .match-summary").click();
  await touchPage.locator(".player-card:visible").first().waitFor({ state: "hidden" });
  assert(
    (await touchPage.locator(".player-card:visible").count()) === 0 &&
      (await secondTouchPlayerLink.getAttribute("aria-expanded")) === "false",
    "On touch devices, tapping outside an open player card should close it."
  );
  await touchPage.goto(`${baseUrl}?view=matches&date=2026-06-23&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await touchPage.waitForSelector(".match-row");
  await touchPage.locator('[data-match-id="england-ghana-2026-06-23"]').click();
  const bellinghamTouchLink = touchPage
    .locator(".key-info-team .player-link", { hasText: "Jude Bellingham" })
    .first();
  const riceTouchLink = touchPage.locator(".key-info-team .player-link", { hasText: "Declan Rice" }).first();
  await bellinghamTouchLink.click();
  await touchPage.locator(".player-card-floating:visible").waitFor({ state: "visible" });
  await riceTouchLink.focus();
  assert(
    (await touchPage.locator(".player-card:visible").count()) === 1 &&
      (await touchPage.locator(".player-hover > .player-card:visible").count()) === 0,
    "On touch devices, player-link focus should not reveal an inline source card beside the floating card."
  );
  await riceTouchLink.click();
  await touchPage.locator(".player-card-floating:visible").waitFor({ state: "visible" });
  const englandGhanaTouchCards = touchPage.locator(".player-card:visible");
  const englandGhanaVisibleNames = await englandGhanaTouchCards
    .locator(".player-card-name")
    .evaluateAll((names) => names.map((name) => name.textContent.trim()));
  assert(
    (await englandGhanaTouchCards.count()) === 1 &&
      (await touchPage.locator(".player-hover > .player-card:visible").count()) === 0 &&
      (await touchPage.locator(".player-card-floating:visible").count()) === 1 &&
      englandGhanaVisibleNames[0] === "Declan Rice" &&
      (await bellinghamTouchLink.getAttribute("aria-expanded")) === "false" &&
      (await riceTouchLink.getAttribute("aria-expanded")) === "true",
    "On touch devices, England-Ghana player taps should render only one floating player card with no inline source card."
  );
  await touchContext.close();

  console.log("UI smoke tests passed.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
