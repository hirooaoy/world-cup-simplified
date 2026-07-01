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
    return "A tie";
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
  const context = await browser.newContext(options.contextOptions || {});
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

async function waitForCatchUpItems(pageInstance) {
  await pageInstance.locator("#catch-up-popover").waitFor({ state: "visible" });
  await pageInstance.waitForSelector(".catch-up-item:not(.catch-up-loading-item)", {
    state: "attached"
  });
}

async function openCatchUp(pageInstance) {
  await pageInstance.locator("#catch-up-button").click();
  await waitForCatchUpItems(pageInstance);
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
      scorerHighlightMetrics.segmentCount >= 1 &&
      scorerHighlightMetrics.segmentTexts.every((text) => /\b\d+(?:\+\d+)?'/.test(text)) &&
      scorerHighlightMetrics.segmentFlags.every(
        (flag) =>
          flag.hasFlag &&
          / flag$/.test(flag.label) &&
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

  const brazilJapanRecapCheck = await openPageAtTime(
    "2026-06-29T20:00:00.000Z",
    "/?view=matches&date=2026-06-29&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const fixture = data.fixtures.find((item) => item.id === "match-76-round-of-32-2026-06-29");
        fixture.status = "FT";
        fixture.score = { home: 2, away: 1 };
        fixture.goalsHome = [
          { minute: 56, name: "Casemiro" },
          { minute: 90, offset: 5, name: "Gabriel Martinelli" }
        ];
        fixture.goalsAway = [{ minute: 29, name: "Kaishu Sano" }];
      }
    }
  );
  await brazilJapanRecapCheck.page.locator('[data-match-id="match-76-round-of-32-2026-06-29"]').click();
  const brazilJapanResultBlock = await brazilJapanRecapCheck.page.locator("#match-info").evaluate((root) => {
    const visibleText = (node) => {
      if (!node) {
        return "";
      }

      const clone = node.cloneNode(true);
      clone.querySelectorAll(".player-card").forEach((card) => card.remove());
      return clone.textContent.replace(/\s+/g, " ").trim();
    };
    const scoreSummary = root.querySelector(".result-score-summary");
    const highlightLink = root.querySelector(".result-video-link");
    const storyItems = [...root.querySelectorAll(".result-story-highlights li")].map(visibleText);
    return {
      scoreText: visibleText(scoreSummary),
      scoreWeight: Number(scoreSummary ? getComputedStyle(scoreSummary).fontWeight : 0),
      scorerText: visibleText(root.querySelector(".result-scorer-highlights")),
      highlightHref: highlightLink?.getAttribute("href") || "",
      highlightRel: highlightLink?.getAttribute("rel") || "",
      highlightTarget: highlightLink?.getAttribute("target") || "",
      highlightTooltip: highlightLink?.getAttribute("data-tooltip") || "",
      storyItems,
      storyLinkTexts: [...root.querySelectorAll(".result-story-highlights .player-link")].map((link) =>
        link.textContent.trim()
      )
    };
  });
  assert(
    brazilJapanResultBlock.scoreText === "Brazil beat Japan 2-1." &&
      brazilJapanResultBlock.scoreWeight >= 600 &&
      brazilJapanResultBlock.scorerText.includes("29' Kaishū Sano") &&
      brazilJapanResultBlock.scorerText.includes("56' Casemiro") &&
      brazilJapanResultBlock.scorerText.includes("90+5' Gabriel Martinelli") &&
      brazilJapanResultBlock.highlightHref === "https://www.youtube.com/watch?v=QgUSOlN0Tt0" &&
      brazilJapanResultBlock.highlightTarget === "_blank" &&
      brazilJapanResultBlock.highlightRel.includes("noopener") &&
      brazilJapanResultBlock.highlightTooltip === "Play highlights on YouTube" &&
      brazilJapanResultBlock.storyItems.length === 3 &&
      brazilJapanResultBlock.storyItems.every((item) => !/[⚽🌟📊]/u.test(item)) &&
      brazilJapanResultBlock.storyItems[0].includes("Japan frustrated Brazil") &&
      brazilJapanResultBlock.storyItems[1].includes("Kaishu Sano rattled Brazil first") &&
      brazilJapanResultBlock.storyItems[2].includes("Gabriel Martinelli won it deep into stoppage time") &&
      brazilJapanResultBlock.storyLinkTexts.includes("Takehiro Tomiyasu") &&
      brazilJapanResultBlock.storyLinkTexts.includes("Zion Suzuki"),
    `Brazil-Japan result recap should render score, scorer timeline, official video, and plain story bullets. Measured ${JSON.stringify(brazilJapanResultBlock)}.`
  );
  await brazilJapanRecapCheck.page.locator("#match-info .result-video-link").hover();
  await brazilJapanRecapCheck.page.waitForTimeout(180);
  const brazilJapanVideoTooltipOpacity = await brazilJapanRecapCheck.page
    .locator("#match-info .result-video-link")
    .evaluate((link) => Number(getComputedStyle(link, "::after").opacity));
  assert(
    brazilJapanVideoTooltipOpacity > 0.8,
    `Hovering the Brazil-Japan highlight button should show the YouTube tooltip. Measured opacity ${brazilJapanVideoTooltipOpacity}.`
  );
  await brazilJapanRecapCheck.page.locator('[data-match-id="match-75-round-of-32-2026-06-29"]').click();
  const netherlandsMoroccoShootoutBlock = await brazilJapanRecapCheck.page
    .locator("#match-info")
    .evaluate((root) => {
      const visibleText = (node) => {
        if (!node) {
          return "";
        }

        const clone = node.cloneNode(true);
        clone.querySelectorAll(".player-card").forEach((card) => card.remove());
        return clone.textContent.replace(/\s+/g, " ").trim();
      };
      const scoreSummary = root.querySelector(".result-score-summary");
      const rowScore = document
        .querySelector('[data-match-id="match-75-round-of-32-2026-06-29"] .match-score')
        ?.textContent.replace(/\s+/g, " ")
        .trim() || "";
      const storyItems = [...root.querySelectorAll(".result-story-highlights li")].map(visibleText);

      return {
        rowScore,
        scoreText: visibleText(scoreSummary),
        storyItems
      };
    });
  assert(
      netherlandsMoroccoShootoutBlock.rowScore === "1-1 (2-3 pens)" &&
      netherlandsMoroccoShootoutBlock.scoreText === "Morocco beat Netherlands on penalties after a 1-1 tie." &&
      netherlandsMoroccoShootoutBlock.storyItems.some((item) =>
        item.includes("Morocco's Hakimi-Brahim right-side surges relevant all the way to penalties")
      ) &&
      netherlandsMoroccoShootoutBlock.storyItems.some((item) =>
        item.includes("Morocco were cleaner from the spot, winning the shootout 3-2 after the 1-1 tie")
      ),
    `Netherlands-Morocco should render the official shootout row and textured Result bullets. Measured ${JSON.stringify(netherlandsMoroccoShootoutBlock)}.`
  );
  await brazilJapanRecapCheck.context.close();

  const scheduledHighlightGuardCheck = await openPageAtTime(
    "2026-06-29T16:30:00.000Z",
    "/?view=matches&date=2026-06-29&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const fixture = data.fixtures.find((item) => item.id === "match-76-round-of-32-2026-06-29");
        fixture.status = "SCHEDULED";
        delete fixture.score;
        delete fixture.goalsHome;
        delete fixture.goalsAway;
      }
    }
  );
  await scheduledHighlightGuardCheck.page.locator('[data-match-id="match-76-round-of-32-2026-06-29"]').click();
  assert(
    (await scheduledHighlightGuardCheck.page.locator("#match-info .result-video-link").count()) === 0,
    "Scheduled fixtures should not render a highlight video button even when stale highlightVideo data is present."
  );
  await scheduledHighlightGuardCheck.context.close();

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

  const pendingH2hFixture = fixturesData.fixtures.find(
    (fixture) => fixture.h2h?.status === "research-pending" && fixture.h2h?.summary === "Past meetings not loaded yet."
  );
  if (pendingH2hFixture) {
    const pendingH2hDate = getDayKeyForTimeZone(pendingH2hFixture.kickoffUtc || pendingH2hFixture.date);
    await page.goto(`${baseUrl}?view=matches&date=${pendingH2hDate}&lang=zh&tz=America%2FLos_Angeles`, {
      waitUntil: "load"
    });
    await page.waitForSelector(`[data-match-id="${pendingH2hFixture.id}"]`);
    await page.locator(`[data-match-id="${pendingH2hFixture.id}"]`).click();
    await page.waitForSelector("#match-info .h2h-summary");
    const pendingH2hChineseSummary = (await page.locator("#match-info .h2h-summary").first().innerText()).trim();
    const pendingH2hChineseDetails = await page.locator("#match-info").innerText();
    assert(
      pendingH2hChineseSummary === "历史交锋尚未载入。" &&
        !/H2H research|Add API-backed|Past meetings unavailable|Past meetings not loaded yet/.test(pendingH2hChineseDetails),
      "Chinese pending H2H empty state should show concise localized not-loaded copy without internal research text."
    );
  }
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
  const chineseResultBulletCoverageIssues = await page.evaluate(async () => {
    const translateTextToZh = window.__worldCupTestHooks?.localization?.translateTextToZh;
    if (typeof translateTextToZh !== "function") {
      return [{ file: "test-hooks", fixtureId: "all", field: "all", issue: "missing localization test hook" }];
    }

    const staleEnglishGrammarPattern =
      /\b(?:won\s+(?:the|on|after)|survived|shootout|after|draw|stayed|scoreless|penalties|eventually|forced|gave|reply|winner|settled|kept|pulled|chase|match|through|goal|point|teams?|Group|Round|lifted|title|level|unresolved)\b/i;
    const issues = [];

    for (const file of ["data/fixtures.json", "data/history.json"]) {
      const response = await fetch(`${file}?resultZhCoverage=${Date.now()}`);
      const data = await response.json();

      for (const fixture of data.fixtures || []) {
        for (const field of ["resultStoryBullets", "resultHighlights"]) {
          for (const [index, source] of (fixture[field] || []).entries()) {
            if (typeof source !== "string" || !/[A-Za-z]/.test(source)) {
              continue;
            }

            const translated = translateTextToZh(source).trim();
            if (translated === source || staleEnglishGrammarPattern.test(translated)) {
              issues.push({
                file,
                fixtureId: fixture.id,
                field,
                index,
                source,
                translated
              });
            }
          }
        }
      }
    }

    return issues.slice(0, 12);
  });
  assert(
    chineseResultBulletCoverageIssues.length === 0,
    `Chinese result bullet translation should cover current and historical story bullets without stale English grammar. Issues: ${JSON.stringify(chineseResultBulletCoverageIssues)}.`
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
      roundOf32DetailText.includes("South Africa won 1-0 against South Korea #25, tied 1-1 against Czechia #40, and lost 0-2 to Mexico #14.") &&
      roundOf32DetailText.includes("Canada won 6-0 against Qatar #56, tied 1-1 against Bosnia and Herzegovina #64, and lost 1-2 to Switzerland #19.") &&
      roundOf32DetailText.includes("Next: Round of 16") &&
      /Winner will face Morocco #\d+ who won 3-2 on penalties after a 1-1 tie against Netherlands #\d+\./.test(
        roundOf32DetailText
      ) &&
      !roundOf32DetailText.includes("Winner will face winner of Netherlands") &&
      roundOf32DetailText.includes("Prediction") &&
      roundOf32DetailText.includes("Key information") &&
      roundOf32DetailText.includes("Past matches") &&
      !roundOf32DetailText.includes("bracket details are not loaded yet"),
    "Round of 32 match detail should summarize group-round form with opponent rankings and the next winner path before normal prediction/context blocks."
  );
  const roundOf32ContextMetrics = await page.locator("#match-info").evaluate((info) => ({
    contextFlags: info.querySelectorAll(".knockout-context-team-flag .flag").length,
    subjectRankCount: info.querySelectorAll(".knockout-context-list .knockout-context-team.is-subject .rank-pill")
      .length,
    groupRoundRanks: [...info.querySelectorAll(".knockout-context-list .rank-pill")].map((pill) =>
      pill.textContent.trim()
    ),
    nextPathRanks: [...info.querySelectorAll(".knockout-next-line .rank-pill")].map((pill) =>
      pill.textContent.trim()
    ),
    nextPathSubjectNames: [
      ...info.querySelectorAll(".knockout-next-line .knockout-context-team.is-subject .knockout-context-team-name")
    ].map((name) => name.textContent.trim()),
    rankHeights: [...info.querySelectorAll(".knockout-context-list .rank-pill, .knockout-next-line .rank-pill")].map(
      (pill) => pill.getBoundingClientRect().height
    ),
    rankCenterDeltas: [...info.querySelectorAll(".knockout-context-list .knockout-context-team")]
      .map((team) => {
        const name = team.querySelector(".knockout-context-team-name");
        const rank = team.querySelector(".rank-pill");

        if (!name || !rank) {
          return null;
        }

        const textNode = [...name.childNodes].find(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
        );
        const text = textNode?.textContent || "";
        const textEnd = text.search(/\s*$/);
        const textStart = text.slice(0, textEnd).search(/\S+$/);
        const range = document.createRange();

        if (textNode && textStart >= 0 && textEnd > textStart) {
          range.setStart(textNode, textStart);
          range.setEnd(textNode, textEnd);
        } else {
          range.selectNodeContents(name);
        }

        const nameRect = range.getBoundingClientRect();
        const rankRect = rank.getBoundingClientRect();

        return Math.abs(rankRect.top + rankRect.height / 2 - (nameRect.top + nameRect.height / 2));
      })
      .filter((delta) => Number.isFinite(delta)),
    rankHorizontalGaps: [...info.querySelectorAll(".knockout-context-list .knockout-context-team")]
      .map((team) => {
        const name = team.querySelector(".knockout-context-team-name");
        const rank = team.querySelector(".rank-pill");
        const nextTextNode =
          team.nextSibling?.nodeType === Node.TEXT_NODE && team.nextSibling.textContent.trim()
            ? team.nextSibling
            : null;

        if (!name || !rank || !nextTextNode) {
          return null;
        }

        const nextCharIndex = nextTextNode.textContent.search(/\S/);

        if (nextCharIndex < 0) {
          return null;
        }

        const nextTextRange = document.createRange();
        nextTextRange.setStart(nextTextNode, nextCharIndex);
        nextTextRange.setEnd(nextTextNode, nextCharIndex + 1);

        const nameRect = name.getBoundingClientRect();
        const rankRect = rank.getBoundingClientRect();
        const nextTextRect = nextTextRange.getBoundingClientRect();

        return {
          nameToRank: rankRect.left - nameRect.right,
          rankToNextText: nextTextRect.left - rankRect.right,
          nextText: nextTextNode.textContent.trim().slice(0, 1)
        };
      })
      .filter(Boolean)
  }));
  assert(
    roundOf32ContextMetrics.contextFlags === 0 &&
      roundOf32ContextMetrics.subjectRankCount === 0 &&
      ["#25", "#40", "#14", "#56", "#64", "#19"].every((rank) =>
        roundOf32ContextMetrics.groupRoundRanks.includes(rank)
      ) &&
      roundOf32ContextMetrics.nextPathRanks.includes("#7") &&
      roundOf32ContextMetrics.nextPathRanks.includes("#8") &&
      roundOf32ContextMetrics.nextPathSubjectNames.length === 1 &&
      roundOf32ContextMetrics.nextPathSubjectNames.includes("Morocco") &&
      roundOf32ContextMetrics.rankHeights.every((height) => height <= 15.5) &&
      roundOf32ContextMetrics.rankCenterDeltas.length >= 6 &&
      roundOf32ContextMetrics.rankCenterDeltas.every((delta) => delta <= 1) &&
      roundOf32ContextMetrics.rankHorizontalGaps.length >= 6 &&
      roundOf32ContextMetrics.rankHorizontalGaps.every(
        (gap) => gap.nameToRank >= 2.5 && gap.nameToRank <= 4.5 && gap.rankToNextText >= 3
      ),
    `Round of 32 match detail should use compact ranking pills without context flags or subject-team ranks. Measured ${JSON.stringify(roundOf32ContextMetrics)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-29&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.waitForSelector(".yesterday-section");
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 700, height: 720 },
    { width: 390, height: 844 },
    { width: 280, height: 760 }
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(80);
    const singlePast24Layout = await page.locator(".yesterday-section").evaluate((section) => {
      const grid = section.querySelector(".yesterday-match-grid");
      const card = grid?.querySelector(".yesterday-match-card");
      const gridRect = grid?.getBoundingClientRect();
      const cardRect = card?.getBoundingClientRect();

      return {
        cardCount: grid?.querySelectorAll(".yesterday-match-card").length || 0,
        cardLeftGap: gridRect && cardRect ? Math.round(cardRect.left - gridRect.left) : null,
        cardRightGap: gridRect && cardRect ? Math.round(gridRect.right - cardRect.right) : null,
        cardWidth: cardRect ? Math.round(cardRect.width) : null,
        gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns : "",
        gridScrollOverflow: grid ? grid.scrollWidth - grid.clientWidth : 0,
        gridWidth: gridRect ? Math.round(gridRect.width) : null,
        hasSingleMatchClass: grid?.classList.contains("has-single-match") || false,
        sectionScrollOverflow: section.scrollWidth - section.clientWidth
      };
    });
    assert(
      singlePast24Layout.cardCount === 1 &&
        singlePast24Layout.hasSingleMatchClass &&
        singlePast24Layout.cardLeftGap === 0 &&
        Math.abs(singlePast24Layout.cardRightGap) <= 1 &&
        singlePast24Layout.gridScrollOverflow <= 1 &&
        singlePast24Layout.sectionScrollOverflow <= 1,
      `A single Past 24 hours match should span the full available row at ${viewport.width}px. Measured ${JSON.stringify(singlePast24Layout)}.`
    );
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator('[data-match-id="match-76-round-of-32-2026-06-29"]').click();
  const unconfirmedRoundOf32DetailText = normalizeFlaggedText(await page.locator("#match-info").innerText());
  assert(
    unconfirmedRoundOf32DetailText.includes("Brazil won 3-0 against Haiti #83 and 3-0 against Scotland #42 and tied 1-1 against Morocco #7.") &&
      unconfirmedRoundOf32DetailText.includes("Japan won 4-0 against Tunisia #45 and tied 2-2 against Netherlands #8 and 1-1 against Sweden #38.") &&
      !unconfirmedRoundOf32DetailText.includes("Group F runner-up is not confirmed yet."),
    "Round of 32 match detail should summarize both teams once the opponent slot is locked."
  );

  const stackedPast24Check = await openPageAtTime(
    "2026-06-30T16:31:00.000Z",
    "/?view=matches&date=2026-06-30&tz=America%2FLos_Angeles"
  );
  await stackedPast24Check.page.setViewportSize({ width: 1280, height: 720 });
  await stackedPast24Check.page.waitForSelector(".yesterday-section .yesterday-match-card");
  const stackedPast24Layout = await stackedPast24Check.page.locator(".yesterday-section").evaluate((section) => {
    const grid = section.querySelector(".yesterday-match-grid");
    const gridRect = grid?.getBoundingClientRect();
    const cardRects = Array.from(grid?.querySelectorAll(".yesterday-match-card") || []).map((card) => {
      const rect = card.getBoundingClientRect();
      return {
        leftGap: gridRect ? Math.round(rect.left - gridRect.left) : null,
        rightGap: gridRect ? Math.round(gridRect.right - rect.right) : null,
        top: Math.round(rect.top),
        width: Math.round(rect.width)
      };
    });

    return {
      cardCount: cardRects.length,
      cardRects,
      gridScrollOverflow: grid ? grid.scrollWidth - grid.clientWidth : 0,
      gridWidth: gridRect ? Math.round(gridRect.width) : null,
      sectionScrollOverflow: section.scrollWidth - section.clientWidth
    };
  });
  assert(
    stackedPast24Layout.cardCount >= 3 &&
      stackedPast24Layout.cardRects.every(
        (rect) => Math.abs(rect.leftGap) <= 1 && Math.abs(rect.rightGap) <= 1 && rect.width === stackedPast24Layout.gridWidth
      ) &&
      new Set(stackedPast24Layout.cardRects.map((rect) => rect.top)).size === stackedPast24Layout.cardCount &&
      stackedPast24Layout.gridScrollOverflow <= 1 &&
      stackedPast24Layout.sectionScrollOverflow <= 1,
    `Multiple Past 24 hours cards should stay stacked in one full-width column. Measured ${JSON.stringify(stackedPast24Layout)}.`
  );
  await stackedPast24Check.context.close();

  await page.goto(`${baseUrl}?view=matches&date=2026-06-30&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="match-78-round-of-32-2026-06-30"]');
  await page.locator('[data-match-id="match-78-round-of-32-2026-06-30"]').click();
  const norwayRoundOf32DetailText = normalizeFlaggedText(await page.locator("#match-info").innerText());
  assert(
    norwayRoundOf32DetailText.includes("Next: Round of 16") &&
      norwayRoundOf32DetailText.includes("Winner will face Brazil #6 who won 2-1 against Japan #18."),
    "Round of 32 normal-score next path should show ranking pills for both the winning opponent and defeated team."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-07-05&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  const roundOf16ProjectedRowText = normalizeFlaggedText(
    await page.locator('[data-match-id="match-92-round-of-16-2026-07-05"]').innerText()
  );
  await page.locator('[data-match-id="match-92-round-of-16-2026-07-05"]').click();
  const roundOf16DetailText = normalizeFlaggedText(await page.locator("#match-info").innerText());
  const roundOf16SourceStatusReady =
    /\bis (?:scheduled|live at \d+-\d+|predicted)\./.test(roundOf16DetailText) ||
    /\b(?:beat|tied) [^.]+ \d+-\d+\./.test(roundOf16DetailText);
  const roundOf16MatchupStateReady =
    roundOf16DetailText.includes("Predicted matchup; participants come from current knockout-path estimates.") ||
    /Round of 16 .+#\d+ vs .+#\d+/.test(roundOf16DetailText);
  assert(
    !roundOf16ProjectedRowText.includes("Predicted") &&
      roundOf16MatchupStateReady &&
      roundOf16DetailText.includes("Previous: Round of 32") &&
      roundOf16SourceStatusReady &&
      roundOf16DetailText.includes("Next: Quarter-finals") &&
      /Winner will face winner of Brazil #\d+ vs Norway #\d+\./.test(roundOf16DetailText) &&
      roundOf16DetailText.includes("Prediction") &&
      !roundOf16DetailText.includes("Previous: Group round") &&
      !roundOf16DetailText.includes("bracket details are not loaded yet"),
    "Round of 16 and later match rows should skip redundant predicted chips while details show either a projected note or resolved participants plus source matches scheduled, live, predicted, or completed."
  );
  const roundOf16ContextMetrics = await page.locator("#match-info").evaluate((info) => ({
    contextFlags: info.querySelectorAll(".knockout-context-team-flag .flag").length,
    previousRoundRanks: info.querySelectorAll(".knockout-context-list .rank-pill").length,
    nextPathRanks: info.querySelectorAll(".knockout-next-line .rank-pill").length
  }));
  assert(
    roundOf16ContextMetrics.contextFlags === 0 &&
      roundOf16ContextMetrics.previousRoundRanks >= 4 &&
      roundOf16ContextMetrics.nextPathRanks >= 2,
    `Round of 16 and later match detail should show compact ranking pills without context flags in source and next-path matchups. Measured ${JSON.stringify(roundOf16ContextMetrics)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-07-19&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="match-104-final-2026-07-19"]');
  const unresolvedFinalRowText = normalizeFlaggedText(
    await page.locator('[data-match-id="match-104-final-2026-07-19"]').innerText()
  );
  await page.locator('[data-match-id="match-104-final-2026-07-19"]').click();
  const unresolvedFinalDetailText = normalizeFlaggedText(await page.locator("#match-info").innerText());
  assert(
    !unresolvedFinalRowText.includes("Predicted") &&
      unresolvedFinalDetailText.includes("Winner match 101 vs Winner match 102") &&
      unresolvedFinalDetailText.includes("Predicted matchup; participants come from current knockout-path estimates.") &&
      unresolvedFinalDetailText.includes("Previous: Semi-finals") &&
      unresolvedFinalDetailText.includes("is predicted.") &&
      !unresolvedFinalDetailText.includes("Round path") &&
      !unresolvedFinalDetailText.includes("No next knockout match is loaded yet."),
    "The Final detail should keep unresolved winner slots in the title, label semi-final sources as predicted, and omit a dead-end next-path block."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-07-18&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="match-103-bronze-final-2026-07-18"]');
  const unresolvedBronzeRowText = normalizeFlaggedText(
    await page.locator('[data-match-id="match-103-bronze-final-2026-07-18"]').innerText()
  );
  await page.locator('[data-match-id="match-103-bronze-final-2026-07-18"]').click();
  const unresolvedBronzeDetailText = normalizeFlaggedText(await page.locator("#match-info").innerText());
  assert(
    !unresolvedBronzeRowText.includes("Predicted") &&
      unresolvedBronzeDetailText.includes("Runner-up match 101 vs Runner-up match 102") &&
      unresolvedBronzeDetailText.includes("Predicted matchup; participants come from current knockout-path estimates.") &&
      unresolvedBronzeDetailText.includes("Previous: Semi-finals") &&
      unresolvedBronzeDetailText.includes("is predicted.") &&
      !unresolvedBronzeDetailText.includes("Round path") &&
      !unresolvedBronzeDetailText.includes("No next knockout match is loaded yet."),
    "The third-place detail should keep unresolved runner-up slots, label semi-final sources as predicted, and omit a dead-end next-path block."
  );

  const resolvedFinalCheck = await openPageAtTime(
    "2026-07-19T18:00:00.000Z",
    "/?view=matches&date=2026-07-19&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const finishSemiFinal = (matchNumber, homeTeamId, awayTeamId, homeScore, awayScore) => {
          const fixture = data.fixtures.find((item) => item.matchNumber === matchNumber);

          fixture.homeTeamId = homeTeamId;
          fixture.awayTeamId = awayTeamId;
          fixture.homeSlot = null;
          fixture.awaySlot = null;
          fixture.status = "FT";
          fixture.score = { home: homeScore, away: awayScore };
        };

        finishSemiFinal(101, "FRA", "ESP", 2, 0);
        finishSemiFinal(102, "ENG", "ARG", 0, 1);
      }
    }
  );
  await resolvedFinalCheck.page.waitForSelector('[data-match-id="match-104-final-2026-07-19"]');
  const resolvedFinalRowText = normalizeFlaggedText(
    await resolvedFinalCheck.page.locator('[data-match-id="match-104-final-2026-07-19"]').innerText()
  );
  await resolvedFinalCheck.page.locator('[data-match-id="match-104-final-2026-07-19"]').click();
  const resolvedFinalSummaryText = normalizeFlaggedText(
    await resolvedFinalCheck.page.locator("#match-info .match-summary").innerText()
  );
  const resolvedFinalDetailText = normalizeFlaggedText(await resolvedFinalCheck.page.locator("#match-info").innerText());
  assert(
    resolvedFinalRowText.includes("France") &&
      resolvedFinalRowText.includes("Argentina") &&
      !resolvedFinalRowText.includes("Winner match") &&
      resolvedFinalSummaryText.includes("France #3 vs Argentina #1") &&
      resolvedFinalDetailText.includes("France #3 beat Spain #2 2-0.") &&
      resolvedFinalDetailText.includes("Argentina #1 beat England #4 1-0.") &&
      !resolvedFinalDetailText.includes("Winner match") &&
      !resolvedFinalDetailText.includes("Predicted matchup") &&
      !resolvedFinalRowText.includes("Predicted") &&
      !resolvedFinalDetailText.includes("Round path"),
    `The Final row and detail should resolve to semi-final winners once those source matches are final. Measured ${JSON.stringify({ resolvedFinalRowText, resolvedFinalSummaryText, resolvedFinalDetailText })}.`
  );
  await resolvedFinalCheck.context.close();

  const resolvedBronzeCheck = await openPageAtTime(
    "2026-07-18T22:00:00.000Z",
    "/?view=matches&date=2026-07-18&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const finishSemiFinal = (matchNumber, homeTeamId, awayTeamId, homeScore, awayScore) => {
          const fixture = data.fixtures.find((item) => item.matchNumber === matchNumber);

          fixture.homeTeamId = homeTeamId;
          fixture.awayTeamId = awayTeamId;
          fixture.homeSlot = null;
          fixture.awaySlot = null;
          fixture.status = "FT";
          fixture.score = { home: homeScore, away: awayScore };
        };

        finishSemiFinal(101, "FRA", "ESP", 2, 0);
        finishSemiFinal(102, "ENG", "ARG", 0, 1);
      }
    }
  );
  await resolvedBronzeCheck.page.waitForSelector('[data-match-id="match-103-bronze-final-2026-07-18"]');
  const resolvedBronzeRowText = normalizeFlaggedText(
    await resolvedBronzeCheck.page.locator('[data-match-id="match-103-bronze-final-2026-07-18"]').innerText()
  );
  await resolvedBronzeCheck.page.locator('[data-match-id="match-103-bronze-final-2026-07-18"]').click();
  const resolvedBronzeSummaryText = normalizeFlaggedText(
    await resolvedBronzeCheck.page.locator("#match-info .match-summary").innerText()
  );
  const resolvedBronzeDetailText = normalizeFlaggedText(await resolvedBronzeCheck.page.locator("#match-info").innerText());
  assert(
    resolvedBronzeRowText.includes("Spain") &&
      resolvedBronzeRowText.includes("England") &&
      !resolvedBronzeRowText.includes("Runner-up match") &&
      resolvedBronzeSummaryText.includes("Spain #2 vs England #4") &&
      !resolvedBronzeDetailText.includes("Runner-up match") &&
      !resolvedBronzeDetailText.includes("Predicted matchup") &&
      !resolvedBronzeRowText.includes("Predicted") &&
      !resolvedBronzeDetailText.includes("Round path"),
    `The third-place row and detail should resolve to semi-final runners-up once those source matches are final. Measured ${JSON.stringify({ resolvedBronzeRowText, resolvedBronzeSummaryText, resolvedBronzeDetailText })}.`
  );
  await resolvedBronzeCheck.context.close();

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
  const qatarStandingTeamSelector = '#match-info .standings-table tbody .standing-team[data-team-id="QAT"]';
  const readQatarStandingBadgeLayout = async () => {
    const layoutHandle = await page.waitForFunction((selector) => {
      const teams = [...document.querySelectorAll(selector)];
      const isVisibleTeam = (team) => {
        const bounds = team.getBoundingClientRect();
        const style = getComputedStyle(team);

        return (
          bounds.width > 0 &&
          bounds.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      };
      const candidates = teams
        .map((team) => {
          const bounds = team.getBoundingClientRect();
          const style = getComputedStyle(team);

          return {
            teamId: team.getAttribute("data-team-id") || "",
            height: Math.round(bounds.height),
            text: team.textContent.replace(/\s+/g, " ").trim(),
            visible: bounds.width > 0 && bounds.height > 0 && style.display !== "none" && style.visibility !== "hidden",
            width: Math.round(bounds.width)
          };
        });
      const team = teams.find(isVisibleTeam);

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
      historicalGroupDetailText.includes("Past World Cup meetings"),
    "Historical match details should follow the current detail section structure."
  );
  assert(
    historicalGroupDetailText.includes("Ecuador beat Qatar 2-0") &&
      historicalGroupDetailText.includes("Enner Valencia put Ecuador ahead early") &&
      historicalGroupDetailText.includes("Enner Valencia scored twice as Ecuador kept widening the gap") &&
      !historicalGroupDetailText.includes("Ecuador took three points from World Cup 2022 / Group A"),
    "Historical result details should summarize the archived final score with authored story bullets instead of points fallback."
  );
  const historicalResultHighlights = await page
    .locator("#match-info .result-highlights li")
    .evaluateAll((items) => items.map((item) => {
      const clone = item.cloneNode(true);
      clone.querySelectorAll(".player-card").forEach((card) => card.remove());
      return clone.textContent.replace(/\s+/g, " ").trim();
    }));
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
  const historicalScorerTriggerMeta = await historicalScorerLink.evaluate((trigger) => ({
    href: trigger.getAttribute("href") || "",
    tagName: trigger.tagName
  }));
  assert(
    historicalScorerTriggerMeta.tagName === "SPAN" &&
      historicalScorerTriggerMeta.href === "",
    `Historical archive player-card triggers should not navigate to the raw dataset. Measured ${JSON.stringify(historicalScorerTriggerMeta)}.`
  );
  await historicalScorerLink.hover();
  const historicalScorerCard = page.locator(".player-card:visible").first();
  await historicalScorerCard.waitFor({ state: "visible" });
  const historicalScorerCardText = await historicalScorerCard.innerText();
  assert(
      historicalScorerCardText.includes("Enner Valencia") &&
      historicalScorerCardText.includes("Forward") &&
      historicalScorerCardText.includes("Ecuador 2022 World Cup archive") &&
      historicalScorerCardText.includes(
        "Ecuador 2022 archive: A starting forward whose repeat finishing tilted Ecuador's match against Qatar."
      ) &&
      historicalScorerCardText.includes("Scored twice against Qatar (2-0 win)") &&
      historicalScorerCardText.includes("One goal came from the spot.") &&
      historicalScorerCardText.includes("2022 age 33") &&
      historicalScorerCardText.includes("Peak value €11m") &&
      !historicalScorerCardText.includes("scored 2 goals in this match"),
    "Historical player cards should use archive-style profile copy instead of raw match-event notes."
  );
  const historicalNarrativeHighlights = historicalResultHighlights.filter(
    (text) => !text.includes("16' Enner Valencia") && !text.includes("31' Enner Valencia")
  );
  assert(
    historicalNarrativeHighlights.length >= 3 &&
      historicalNarrativeHighlights.every((text) => text.length <= 160) &&
      historicalNarrativeHighlights.every((text) => !/^(?:⚽|🔥|🛡️|🧤|🌟|📊)/u.test(text)) &&
      historicalNarrativeHighlights.some((text) => text.includes("Enner Valencia scored twice")),
    "Historical result bullets should stay compact and use plain authored story copy."
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

  await page.goto(`${baseUrl}?view=matches&date=2022-11-23&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="wc-2022-2022-11-23-matchday-4-germany-japan"]');
  await page.locator('[data-match-id="wc-2022-2022-11-23-matchday-4-germany-japan"]').click();
  const germanyJapanHistoricalPast = await page.locator("#match-info").evaluate((root) => {
    const pastSection = [...root.querySelectorAll(":scope > .info-block")].find(
      (section) => section.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() === "Past World Cup meetings"
    );

    return {
      listRows: pastSection?.querySelectorAll(".past-list li").length || 0,
      recordRows: pastSection?.querySelectorAll(".past-record-row").length || 0,
      text: pastSection?.textContent.replace(/\s+/g, " ").trim() || ""
    };
  });
  assert(
    germanyJapanHistoricalPast.text.includes("Germany and Japan had not met in a men's World Cup before this match.") &&
      !/\bloaded\b/i.test(germanyJapanHistoricalPast.text) &&
      germanyJapanHistoricalPast.listRows === 0 &&
      germanyJapanHistoricalPast.recordRows === 0,
    `Germany-Japan 2022 should show a factual first World Cup meeting empty state, not a loaded-data warning. Measured ${JSON.stringify(germanyJapanHistoricalPast)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-12&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="canada-bosnia-2026-06-12"]');
  await page.locator('[data-match-id="canada-bosnia-2026-06-12"]').click();
  const currentVerifiedEmptyPast = await page.locator("#match-info").evaluate((root) => {
    const pastSection = [...root.querySelectorAll(":scope > .info-block")].find(
      (section) => section.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() === "Past matches"
    );

    return pastSection?.textContent.replace(/\s+/g, " ").trim() || "";
  });
  assert(
    currentVerifiedEmptyPast.includes(
      "Canada and Bosnia and Herzegovina have never met in a verified senior men's international. This is their first head-to-head meeting."
    ) &&
      !currentVerifiedEmptyPast.includes("men's World Cup") &&
      !currentVerifiedEmptyPast.includes("loaded before this match"),
    `Current verified-empty H2H should keep senior-international copy separate from archive World Cup history. Measured ${JSON.stringify(currentVerifiedEmptyPast)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2014-07-08&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="wc-2014-2014-07-08-semi-finals-brazil-germany"]').click();
  const historicalBrazilGermanyResult = await page.locator("#match-info").evaluate((root) => {
    const visibleText = (node) => {
      if (!node) {
        return "";
      }

      const clone = node.cloneNode(true);
      clone.querySelectorAll(".player-card").forEach((card) => card.remove());
      return clone.textContent.replace(/\s+/g, " ").trim();
    };
    const storyList = root.querySelector(".result-story-highlights");
    const pastSection = [...root.querySelectorAll(":scope > .info-block")].find(
      (section) => section.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() === "Past World Cup meetings"
    );
    return {
      pastRecordRows: pastSection?.querySelectorAll(".past-record-row").length || 0,
      pastRows: [...(pastSection?.querySelectorAll(".past-list li") || [])].map(visibleText),
      pastText: visibleText(pastSection),
      scoreText: visibleText(root.querySelector(".result-score-summary")),
      scorerText: visibleText(root.querySelector(".result-scorer-highlights")),
      storyHrefs: [...root.querySelectorAll(".result-story-highlights .player-link")].map((trigger) =>
        trigger.getAttribute("href") || ""
      ),
      storyItems: [...root.querySelectorAll(".result-story-highlights li")].map(visibleText),
      storyListStyle: storyList ? getComputedStyle(storyList).listStyleType : ""
    };
  });
  assert(
    historicalBrazilGermanyResult.scoreText === "Germany beat Brazil 7-1." &&
      historicalBrazilGermanyResult.scorerText.includes("11' Thomas Müller") &&
      historicalBrazilGermanyResult.scorerText.includes("79' André Schürrle") &&
      historicalBrazilGermanyResult.storyItems.length === 3 &&
      historicalBrazilGermanyResult.storyListStyle === "disc" &&
      historicalBrazilGermanyResult.storyItems[0].includes("Thomas Müller put Germany ahead early") &&
      historicalBrazilGermanyResult.storyItems[1].includes("André Schürrle added the final word") &&
      historicalBrazilGermanyResult.storyItems[2].includes("Toni Kroos scored twice") &&
      historicalBrazilGermanyResult.storyHrefs.every((href) => href === "") &&
      historicalBrazilGermanyResult.pastRecordRows === 3 &&
      historicalBrazilGermanyResult.pastRows.length === 1 &&
      historicalBrazilGermanyResult.pastRows[0].includes("2002-06-30") &&
      historicalBrazilGermanyResult.pastRows[0].includes("World Cup 2002 / Final") &&
      historicalBrazilGermanyResult.pastRows[0].includes("Brazil") &&
      historicalBrazilGermanyResult.pastRows[0].includes("2-0") &&
      historicalBrazilGermanyResult.pastRows[0].includes("Germany") &&
      !historicalBrazilGermanyResult.pastText.includes("had not met"),
    `Brazil-Germany archive Result block should match current recap structure without raw source links. Measured ${JSON.stringify(historicalBrazilGermanyResult)}.`
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
      scorerOnlyHistoricalCardText.includes("Brazil 1970 archive: A final scorer in Brazil's archive route alongside Gérson and Jairzinho.") &&
      scorerOnlyHistoricalCardText.includes("Scored against Italy in the Final (4-1 win).") &&
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
      firstHistoricalDetailText.includes("Lucien Laurent put France ahead early") &&
      firstHistoricalDetailText.includes("André Maschinot scored twice as France kept widening the gap") &&
      !firstHistoricalDetailText.includes("France took three points from World Cup 1930 / Group 1"),
    "Historical result details should reach back to the first loaded World Cup match with authored result copy."
  );

  await page.goto(`${baseUrl}?view=matches&date=2022-12-14&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator(".match-row").first().click();
  const historicalKnockoutDetail = await page.locator("#match-info").evaluate((root) => {
    const text = root.innerText;
    const sectionHeadings = [...root.querySelectorAll(":scope > .info-block")]
      .map((section) => section.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() || "")
      .filter(Boolean);

    return {
      hasHistoricalBracket: Boolean(root.querySelector(".historical-bracket")),
      resultIndex: sectionHeadings.findIndex((heading) => heading.startsWith("Result")),
      previousIndex: sectionHeadings.findIndex((heading) => heading === "Previous: Quarter-finals"),
      nextIndex: sectionHeadings.findIndex((heading) => heading === "Next: Final / Third-place play-off"),
      sectionHeadings,
      text
    };
  });
  assert(
    !historicalKnockoutDetail.text.includes("Knockout context") &&
      !historicalKnockoutDetail.text.includes("archive") &&
      !historicalKnockoutDetail.hasHistoricalBracket &&
      historicalKnockoutDetail.text.includes("Semi-finals") &&
      historicalKnockoutDetail.text.includes("France") &&
      historicalKnockoutDetail.text.includes("Morocco") &&
      historicalKnockoutDetail.text.includes("Previous: Quarter-finals") &&
      historicalKnockoutDetail.text.includes("France beat England 2-1.") &&
      historicalKnockoutDetail.text.includes("Morocco beat Portugal 1-0.") &&
      historicalKnockoutDetail.text.includes("Next: Final / Third-place play-off") &&
      historicalKnockoutDetail.text.includes("Winner faced Argentina who won 3-0 against Croatia.") &&
      historicalKnockoutDetail.text.includes("Loser faced Croatia who lost 0-3 to Argentina.") &&
      historicalKnockoutDetail.previousIndex >= 0 &&
      historicalKnockoutDetail.nextIndex > historicalKnockoutDetail.previousIndex &&
      historicalKnockoutDetail.resultIndex > historicalKnockoutDetail.nextIndex,
    `Historical knockout matches should use current-style Previous/Next context before Result. Measured ${JSON.stringify(historicalKnockoutDetail)}.`
  );
  assert(
    !historicalKnockoutDetail.text.includes("Half-time") &&
      (await page.locator(".historical-goals").count()) === 0,
    "Historical knockout detail should avoid the old facts/goals record layout."
  );

  await page.goto(`${baseUrl}?view=matches&date=2022-12-13&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="wc-2022-2022-12-13-semi-finals-argentina-croatia"]');
  await page.locator('[data-match-id="wc-2022-2022-12-13-semi-finals-argentina-croatia"]').click();
  const historicalSemiPreviousWinners = await page.locator("#match-info").evaluate((root) => {
    const previousSection = [...root.querySelectorAll(":scope > .info-block")].find(
      (section) => section.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() === "Previous: Quarter-finals"
    );
    const winnerNodes = [...(previousSection?.querySelectorAll(".knockout-context-team.is-subject") || [])];

    return {
      names: winnerNodes.map((node) => node.querySelector(".knockout-context-team-name")?.textContent.trim() || ""),
      weights: winnerNodes.map((node) => Number.parseFloat(window.getComputedStyle(node).fontWeight))
    };
  });
  assert(
    historicalSemiPreviousWinners.names.join("|") === "Argentina|Croatia" &&
      historicalSemiPreviousWinners.weights.every((weight) => weight >= 600),
    `Historical semi-final Previous context should semibold the prior-round winners. Measured ${JSON.stringify(historicalSemiPreviousWinners)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2022-12-06&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="wc-2022-2022-12-06-round-of-16-morocco-spain"]');
  await page.locator('[data-match-id="wc-2022-2022-12-06-round-of-16-morocco-spain"]').click();
  const historicalRoundOf16NextWinner = await page.locator("#match-info").evaluate((root) => {
    const nextSection = [...root.querySelectorAll(":scope > .info-block")].find(
      (section) => section.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() === "Next: Quarter-finals"
    );
    const winnerNodes = [...(nextSection?.querySelectorAll(".knockout-context-team.is-subject") || [])];

    return {
      nextText: nextSection?.textContent.replace(/\s+/g, " ").trim() || "",
      names: winnerNodes.map((node) => node.querySelector(".knockout-context-team-name")?.textContent.trim() || ""),
      weights: winnerNodes.map((node) => Number.parseFloat(window.getComputedStyle(node).fontWeight))
    };
  });
  assert(
    historicalRoundOf16NextWinner.nextText.includes("Winner faced Portugal who won 6-1 against Switzerland.") &&
      historicalRoundOf16NextWinner.names.includes("Portugal") &&
      historicalRoundOf16NextWinner.weights.every((weight) => weight >= 600),
    `Historical Round of 16 Next context should semibold the resolved opponent winner. Measured ${JSON.stringify(historicalRoundOf16NextWinner)}.`
  );

  await page.goto(`${baseUrl}?lang=en&tz=America%2FLos_Angeles`, { waitUntil: "load" });
  await page.waitForSelector(".match-row");
  await page.waitForFunction(
    () =>
      document.documentElement.lang === "en" &&
      document.querySelector(".language-option.is-active")?.dataset.language === "en" &&
      localStorage.getItem("world-cup-simplified-language") === "en"
  );
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
  const languageSwitchWidthBefore = await page
    .locator("#language-switch")
    .evaluate((element) => Math.round(element.getBoundingClientRect().width));
  await page.locator('[data-language="zh"]').click({ trial: true });
  const pendingLanguageCheck = await page.evaluate(() => {
    const switchShell = document.querySelector("#language-switch");
    const englishButton = document.querySelector('[data-language="en"]');
    const chineseButton = document.querySelector('[data-language="zh"]');
    chineseButton?.click();
    const spinnerStyle = chineseButton ? window.getComputedStyle(chineseButton, "::after") : null;

    return {
      chineseBusy: chineseButton?.getAttribute("aria-busy") || "",
      chineseDisabled: Boolean(chineseButton?.disabled),
      englishDisabled: Boolean(englishButton?.disabled),
      pending: Boolean(chineseButton?.classList.contains("is-pending")),
      spinnerOpacity: Number(spinnerStyle?.opacity || 0),
      switchBusy: switchShell?.getAttribute("aria-busy") || "",
      width: switchShell ? Math.round(switchShell.getBoundingClientRect().width) : 0
    };
  });
  assert(
    pendingLanguageCheck.pending &&
      pendingLanguageCheck.switchBusy === "true" &&
      pendingLanguageCheck.chineseBusy === "true" &&
      pendingLanguageCheck.chineseDisabled &&
      pendingLanguageCheck.englishDisabled &&
      pendingLanguageCheck.spinnerOpacity > 0.5 &&
      Math.abs(pendingLanguageCheck.width - languageSwitchWidthBefore) <= 1,
    `Switching language should show an in-tab pending spinner without resizing the control. Measured ${JSON.stringify(pendingLanguageCheck)} with starting width ${languageSwitchWidthBefore}.`
  );
  await page.waitForFunction(() => !document.querySelector(".language-option.is-pending"));
  const chineseAppliedCheck = await page.evaluate(() => ({
    activeLanguage: document.querySelector(".language-option.is-active")?.dataset.language || "",
    documentLanguage: document.documentElement.lang,
    savedLanguage: localStorage.getItem("world-cup-simplified-language") || "",
    switchBusy: document.querySelector("#language-switch")?.getAttribute("aria-busy") || "",
    width: Math.round(document.querySelector("#language-switch")?.getBoundingClientRect().width || 0)
  }));
  assert(
    chineseAppliedCheck.activeLanguage === "zh" &&
      chineseAppliedCheck.documentLanguage === "zh-Hans" &&
      chineseAppliedCheck.savedLanguage === "zh" &&
      chineseAppliedCheck.switchBusy === "false" &&
      Math.abs(chineseAppliedCheck.width - languageSwitchWidthBefore) <= 1,
    `Chinese should apply after the pending language spinner clears without resizing the control. Measured ${JSON.stringify(chineseAppliedCheck)} with starting width ${languageSwitchWidthBefore}.`
  );
  await page.locator('[data-language="en"]').click();
  await page.waitForFunction(() => !document.querySelector(".language-option.is-pending"));
  assert(
    (await page.evaluate(
      () =>
        document.documentElement.lang === "en" &&
        document.querySelector(".language-option.is-active")?.dataset.language === "en" &&
        localStorage.getItem("world-cup-simplified-language") === "en"
    )) === true,
    "Switching back to English should clear the pending spinner and restore English before later smoke checks."
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

  const liveShootoutLayoutCheck = await openPageAtTime(
    "2026-06-30T21:01:00.000Z",
    "/?view=matches&date=2026-06-30&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const shootoutFixture = data.fixtures.find(
          (fixture) => fixture.id === "match-77-round-of-32-2026-06-30"
        );
        shootoutFixture.status = "LIVE";
        shootoutFixture.score = { home: 1, away: 1 };
        shootoutFixture.scoreDetails = { penalties: { home: 3, away: 4 } };
        shootoutFixture.scoreUpdatedAt = "2026-06-30T21:00:00.000Z";
      }
    }
  );
  await liveShootoutLayoutCheck.page.setViewportSize({ width: 340, height: 780 });
  await liveShootoutLayoutCheck.page.waitForTimeout(250);
  const liveShootoutRowMetrics = await liveShootoutLayoutCheck.page
    .locator('[data-match-id="match-77-round-of-32-2026-06-30"]')
    .evaluate((row) => {
      const score = row.querySelector(".match-score");
      const scoreRect = score?.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const matchupRight = Math.max(
        ...Array.from(
          row.querySelectorAll(".match-teams .flag, .match-teams .team-name, .match-teams .match-versus")
        ).map((element) => element.getBoundingClientRect().right)
      );

      return {
        documentScrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        hasWrappedClass: row.classList.contains("has-wrapped-matchup"),
        metaGapFromTeams: scoreRect ? Math.round(scoreRect.left - matchupRight) : null,
        rowScrollOverflow: row.scrollWidth - row.clientWidth,
        scoreRightGap: scoreRect ? Math.round(rowRect.right - scoreRect.right) : null,
        scoreText: score?.textContent.replace(/\s+/g, " ").trim() || ""
      };
    });
  assert(
    liveShootoutRowMetrics.scoreText === "1-1 (3-4 pens) · 1 min ago" &&
      liveShootoutRowMetrics.hasWrappedClass &&
      liveShootoutRowMetrics.metaGapFromTeams >= 12 &&
      liveShootoutRowMetrics.scoreRightGap >= 0 &&
      liveShootoutRowMetrics.rowScrollOverflow <= 1 &&
      liveShootoutRowMetrics.documentScrollOverflow <= 1,
    `Live shootout score text should stay readable without overlapping the tiny-mobile match row. Measured ${JSON.stringify(liveShootoutRowMetrics)}.`
  );
  await liveShootoutLayoutCheck.context.close();

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
      (row) => {
        const match = /^([A-Z][a-z]+ \d{1,2}, \d{4}) (.+)$/.exec(row.dateTime);

        return (
          match &&
          /\d{1,2}:\d{2}/.test(match[2]) &&
          row.label.includes(match[1]) &&
          row.label.includes(match[2]) &&
          !row.label.includes("local local")
        );
      }
    ),
    "Archived country search rows should show and announce date and loaded kickoff time labels with the year."
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

  const japanPinyinSearchCheck = await openPageAtTime(
    "2026-06-21T21:00:00.000Z",
    "/?view=matches&team=riben&tz=America%2FLos_Angeles"
  );
  const japanPinyinSearchRows = await japanPinyinSearchCheck.page.locator(".match-row").evaluateAll((rows) =>
    rows.map((row) => ({
      id: row.dataset.matchId,
      label: row.getAttribute("aria-label") || ""
    }))
  );
  assert(
    japanPinyinSearchRows.some((row) => row.id === "japan-sweden-2026-06-25"),
    "Pinyin Japan country search should include Japan vs Sweden."
  );
  assert(
    japanPinyinSearchRows.every((row) => row.label.includes("Japan")) &&
      !japanPinyinSearchRows.some((row) => row.id === "panama-croatia-2026-06-23"),
    "Pinyin Japan country search should not include Panama fixtures through the PAN team id."
  );
  assert(
    (await japanPinyinSearchCheck.page.locator(".team-search-summary h2").innerText()).trim() === "Japan",
    "Pinyin Japan country search should show the canonical team name in the heading."
  );
  await japanPinyinSearchCheck.context.close();

  const usaTraditionalSearchCheck = await openPageAtTime(
    "2026-06-21T21:00:00.000Z",
    "/?view=matches&team=%E7%BE%8E%E5%9C%8B&lang=zh&tz=America%2FLos_Angeles"
  );
  const usaTraditionalSearchRows = await usaTraditionalSearchCheck.page.locator(".match-row").evaluateAll((rows) =>
    rows.map((row) => ({
      id: row.dataset.matchId,
      label: row.getAttribute("aria-label") || ""
    }))
  );
  assert(
    usaTraditionalSearchRows.some((row) => row.id === "turkiye-united-states-2026-06-25"),
    "Traditional Chinese USA country search should include Türkiye vs United States."
  );
  assert(
    usaTraditionalSearchRows.every((row) => row.label.includes("美国")),
    "Traditional Chinese USA country search should show localized United States rows."
  );
  assert(
    (await usaTraditionalSearchCheck.page.locator(".team-search-summary h2").innerText()).trim() === "美国",
    "Traditional Chinese USA country search should show the localized team name in the heading."
  );
  await usaTraditionalSearchCheck.context.close();

  const ghanaPinyinSearchCheck = await openPageAtTime(
    "2026-06-21T21:00:00.000Z",
    "/?view=matches&team=jiana&tz=America%2FLos_Angeles"
  );
  const ghanaPinyinSearchRows = await ghanaPinyinSearchCheck.page.locator(".match-row").evaluateAll((rows) =>
    rows.map((row) => ({
      id: row.dataset.matchId,
      label: row.getAttribute("aria-label") || ""
    }))
  );
  assert(
    ghanaPinyinSearchRows.some((row) => row.id === "ghana-panama-2026-06-17"),
    "Exact pinyin Ghana country search should include Ghana vs Panama."
  );
  assert(
    ghanaPinyinSearchRows.every((row) => row.label.includes("Ghana")) &&
      !ghanaPinyinSearchRows.some((row) => row.id === "canada-qatar-2026-06-18"),
    "Exact pinyin Ghana country search should not pull in Canada through the longer jianada alias."
  );
  await ghanaPinyinSearchCheck.context.close();

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

  const belgiumPrefixSearchCheck = await openPageAtTime(
    "2026-06-21T21:00:00.000Z",
    "/?view=matches&team=be&tz=America%2FLos_Angeles"
  );
  const belgiumPrefixSearchRows = await belgiumPrefixSearchCheck.page.locator(".match-row").evaluateAll((rows) =>
    rows.map((row) => ({
      id: row.dataset.matchId,
      label: row.getAttribute("aria-label") || ""
    }))
  );
  assert(
    belgiumPrefixSearchRows.some((row) => row.id === "belgium-egypt-2026-06-15"),
    "English Belgium prefix search should include Belgium vs Egypt."
  );
  assert(
    belgiumPrefixSearchRows.every((row) => row.label.includes("Belgium")) &&
      !belgiumPrefixSearchRows.some((row) => row.id === "japan-sweden-2026-06-25"),
    "English Belgium prefix search should not match Japan through the pinyin ri ben alias."
  );
  await belgiumPrefixSearchCheck.context.close();

  const mexicoPrefixSearchCheck = await openPageAtTime(
    "2026-06-21T21:00:00.000Z",
    "/?view=matches&team=me&tz=America%2FLos_Angeles"
  );
  const mexicoPrefixSearchRows = await mexicoPrefixSearchCheck.page.locator(".match-row").evaluateAll((rows) =>
    rows.map((row) => ({
      id: row.dataset.matchId,
      label: row.getAttribute("aria-label") || ""
    }))
  );
  assert(
    mexicoPrefixSearchRows.some((row) => row.id === "mexico-south-africa-2026-06-11"),
    "English Mexico prefix search should include Mexico vs South Africa."
  );
  assert(
    mexicoPrefixSearchRows.every((row) => row.label.includes("Mexico")) &&
      !mexicoPrefixSearchRows.some((row) => row.id === "turkiye-united-states-2026-06-25"),
    "English Mexico prefix search should not match United States through the pinyin mei guo alias."
  );
  await mexicoPrefixSearchCheck.context.close();

  const applyLiveFallbackFixture = (data) => {
    const liveFixture = data.fixtures.find(
      (fixture) => fixture.id === "czechia-south-africa-2026-06-18"
    );
    liveFixture.status = "SCHEDULED";
    liveFixture.officialMatchTime = "5'";
    liveFixture.officialMatchTimeUpdatedAt = "2026-06-18T16:02:00.000Z";
    delete liveFixture.score;
  };
  const liveFallbackScoreCheck = await openPageAtTime(
    "2026-06-18T16:05:00.000Z",
    "/?view=matches&date=2026-06-18&tz=America%2FLos_Angeles",
    {
      fixtureTransform: applyLiveFallbackFixture
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
      (await liveScoreLink.getAttribute("title")) === "FIFA snapshot: 5' · checked 3 min ago" &&
      (await liveScoreLink.getAttribute("data-tooltip")) === "FIFA snapshot: 5' · checked 3 min ago" &&
      !((await liveScoreLink.getAttribute("title")) || "").includes("Check latest score at FIFA"),
    "The live pill should link to FIFA scores and expose official snapshot freshness."
  );
  const liveFallbackTouchCheck = await openPageAtTime(
    "2026-06-18T16:05:00.000Z",
    "/?view=matches&date=2026-06-18&tz=America%2FLos_Angeles",
    {
      contextOptions: {
        hasTouch: true,
        isMobile: true,
        viewport: { width: 390, height: 844 }
      },
      fixtureTransform: applyLiveFallbackFixture
    }
  );
  const liveFallbackTouchRow = liveFallbackTouchCheck.page.locator(
    '[data-match-id="czechia-south-africa-2026-06-18"]'
  );
  const touchPageCountBeforeLiveTap = liveFallbackTouchCheck.context.pages().length;
  const touchUrlBeforeLiveTap = liveFallbackTouchCheck.page.url();
  await liveFallbackTouchRow.locator(".live-pill").tap();
  await liveFallbackTouchCheck.page.waitForFunction(() => {
    const pill = document.querySelector(
      '[data-match-id="czechia-south-africa-2026-06-18"] .live-pill.is-touch-tooltip-open'
    );
    return pill && Number(getComputedStyle(pill, "::after").opacity) > 0.8;
  });
  const touchLiveTooltipState = await liveFallbackTouchCheck.page.evaluate(() => {
    const pill = document.querySelector(
      '[data-match-id="czechia-south-africa-2026-06-18"] .live-pill.is-touch-tooltip-open'
    );

    return {
      pageUrl: window.location.href,
      tooltip: pill?.getAttribute("data-tooltip") || "",
      visibleText: pill?.textContent.replace(/\s+/g, " ").trim() || ""
    };
  });
  assert(
    liveFallbackTouchCheck.context.pages().length === touchPageCountBeforeLiveTap &&
      touchLiveTooltipState.visibleText === "Live" &&
      touchLiveTooltipState.tooltip === "FIFA snapshot: 5' · checked 3 min ago" &&
      touchLiveTooltipState.pageUrl === touchUrlBeforeLiveTap,
    `On touch devices, tapping the Live pill should open the time tooltip before following FIFA. Measured ${JSON.stringify(touchLiveTooltipState)}.`
  );
  await liveFallbackTouchCheck.context.close();
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
    liveFallbackMetaText === "LIVE|PENDING",
    "The live row should label score-pending state when no verified score is loaded."
  );
  assert(
    (await liveFallbackRow.locator(".score-status.is-pending").count()) === 1,
    "A live fixture without a loaded score should show Pending."
  );
  assert(
    (await liveFallbackRow.innerText()).includes("Pending"),
    "The visible live row text should include Pending."
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

            if (fixture.id === nextScheduledFixture.id) {
              fixture.status = "SCHEDULED";
              fixture.score = { home: 0, away: 0 };
              fixture.scoreUpdatedAt = beforeKickoff.toISOString();
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
    const upNextScoreLeakCheck = await upNextCheck.page.locator(".match-row.is-next").evaluateAll((rows) =>
      rows.map((row) => ({
        ariaLabel: row.getAttribute("aria-label") || "",
        fixtureId: row.dataset.matchId || "",
        liveCount: row.querySelectorAll(".live-pill").length,
        pendingCount: row.querySelectorAll(".score-status").length,
        scoreCount: row.querySelectorAll(".match-score").length,
        text: row.textContent.replace(/\s+/g, " ").trim(),
        upNextCount: row.querySelectorAll(".up-next-pill").length
      }))
    );
    assert(
      upNextScoreLeakCheck.length === nextScheduledFixtureIds.length &&
        upNextScoreLeakCheck.every(
          (row) =>
            row.upNextCount === 1 &&
            row.scoreCount === 0 &&
            row.liveCount === 0 &&
            row.pendingCount === 0 &&
            !/\b\d+\s*-\s*\d+\b/.test(row.text) &&
            !/\b\d+\s*-\s*\d+\b|current score|final score/i.test(row.ariaLabel)
        ),
      `Up next rows should not render or announce score, live, or pending pills, even when a provider sends a 0-0 shell. Measured ${JSON.stringify(upNextScoreLeakCheck)}.`
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

  const nextScheduledKnockoutFixture = fixturesData.fixtures
    .filter((fixture) => fixture.stage && fixture.stage !== "group" && fixture.status === "SCHEDULED" && fixture.kickoffUtc)
    .sort((a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc))[0];
  if (nextScheduledKnockoutFixture) {
    const nextKnockoutKickoffUtc = nextScheduledKnockoutFixture.kickoffUtc;
    const nextScheduledKnockoutMatchNumbers = fixturesData.fixtures
      .filter(
        (fixture) =>
          fixture.stage &&
          fixture.stage !== "group" &&
          fixture.status === "SCHEDULED" &&
          fixture.kickoffUtc === nextKnockoutKickoffUtc
      )
      .map((fixture) => String(fixture.matchNumber));
    const beforeKnockoutKickoff = new Date(new Date(nextKnockoutKickoffUtc).getTime() - 5 * 60 * 1000);
    const tournamentUpNextCheck = await openPageAtTime(
      beforeKnockoutKickoff.toISOString(),
      "/?view=standings&standingsMode=tournament&tz=America%2FLos_Angeles",
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
    await tournamentUpNextCheck.page.waitForSelector(".progress-match");
    await tournamentUpNextCheck.page.waitForFunction(
      (expectedBadgeCount) =>
        document.querySelectorAll(".progress-match").length >= 32 &&
        document.querySelectorAll(".tournament-view .tournament-up-next-pill").length === expectedBadgeCount,
      nextScheduledKnockoutMatchNumbers.length
    );
    const tournamentUpNextState = await tournamentUpNextCheck.page.evaluate((matchNumbers) => {
      const expected = new Set(matchNumbers);
      const cardsWithBadges = [...document.querySelectorAll(".progress-match .tournament-up-next-pill")]
        .map((pill) => {
          const card = pill.closest(".progress-match");
          const header = pill.closest(".knockout-match-header");
          const meta = header?.querySelector(".knockout-match-meta");
          const cardRect = card?.getBoundingClientRect();
          const metaRect = meta?.getBoundingClientRect();
          const pillRect = pill.getBoundingClientRect();

          return {
            cardIsNext: card?.classList.contains("is-next") || false,
            headerHasUpNext: header?.classList.contains("has-up-next") || false,
            headerOverflow: header ? header.scrollWidth - header.clientWidth : null,
            isExpected: expected.has(card?.dataset.matchNumber || ""),
            label: pill.textContent.replace(/\s+/g, " ").trim(),
            matchNumber: card?.dataset.matchNumber || "",
            rightGap: cardRect ? Math.round(cardRect.right - pillRect.right) : null,
            verticalCenterGap: metaRect
              ? Math.abs((metaRect.top + metaRect.height / 2) - (pillRect.top + pillRect.height / 2))
              : null
          };
        });

      return {
        cardsWithBadges,
        tournamentBadgeCount: document.querySelectorAll(".tournament-view .tournament-up-next-pill").length
      };
    }, nextScheduledKnockoutMatchNumbers);
    assert(
      tournamentUpNextState.tournamentBadgeCount === nextScheduledKnockoutMatchNumbers.length &&
        tournamentUpNextState.cardsWithBadges.every(
          (badge) =>
            badge.isExpected &&
            badge.cardIsNext &&
            badge.headerHasUpNext &&
            badge.headerOverflow <= 1 &&
            badge.label === "Up next" &&
            badge.rightGap >= 6 &&
            badge.rightGap <= 12 &&
            badge.verticalCenterGap !== null &&
            badge.verticalCenterGap <= 2
        ),
      `Tournament cards should mark only the next scheduled knockout match with a top-right Up next pill aligned to the date and venue. Measured ${JSON.stringify(tournamentUpNextState)}.`
    );
    await tournamentUpNextCheck.context.close();

    const tournamentLiveCheckTime = new Date(
      new Date(nextKnockoutKickoffUtc).getTime() + 5 * 60 * 1000
    );
    const tournamentLiveTooltipCheckedAt = new Date(
      new Date(nextKnockoutKickoffUtc).getTime() + 2 * 60 * 1000
    );
    const tournamentLiveMatchNumber = String(nextScheduledKnockoutFixture.matchNumber);
    const tournamentLiveTooltipCheck = await openPageAtTime(
      tournamentLiveCheckTime.toISOString(),
      "/?view=standings&standingsMode=tournament&tz=America%2FLos_Angeles",
      {
        fixtureTransform(data) {
          for (const fixture of data.fixtures || []) {
            if (fixture.status === "LIVE") {
              fixture.status = "FT";
              fixture.score ||= { home: 0, away: 0 };
            }

            if (fixture.id === nextScheduledKnockoutFixture.id) {
              fixture.officialMatchTime = "5'";
              fixture.officialMatchTimeUpdatedAt = tournamentLiveTooltipCheckedAt.toISOString();
            }
          }
        }
      }
    );
    const tournamentLivePillSelector = `.progress-match[data-match-number="${tournamentLiveMatchNumber}"] .tournament-live-pill`;
    const tournamentLivePill = tournamentLiveTooltipCheck.page.locator(tournamentLivePillSelector);
    await tournamentLivePill.waitFor({ state: "attached" });
    await tournamentLivePill.hover();
    await tournamentLiveTooltipCheck.page.waitForFunction((selector) => {
      const pill = document.querySelector(selector);
      if (!pill) {
        return false;
      }

      const styles = getComputedStyle(pill, "::after");
      return styles.content.includes("FIFA snapshot") && Number(styles.opacity) > 0.8;
    }, tournamentLivePillSelector);
    const tournamentLiveTooltipState = await tournamentLiveTooltipCheck.page.evaluate((selector) => {
      const pill = document.querySelector(selector);
      const header = pill?.closest(".knockout-match-header");
      const card = pill?.closest(".progress-match");
      const styles = pill ? getComputedStyle(pill, "::after") : null;
      const parsePx = (value) => Number.parseFloat(value) || 0;
      const parseZIndex = (element) => {
        const value = element ? getComputedStyle(element).zIndex : "";
        const number = Number.parseInt(value, 10);
        return Number.isFinite(number) ? number : 0;
      };
      const getTransform = (value) => {
        if (!value || value === "none") {
          return { x: 0, y: 0 };
        }

        const match = value.match(/^matrix\((.+)\)$/);
        if (!match) {
          return { x: 0, y: 0 };
        }

        const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
        return {
          x: Number.isFinite(parts[4]) ? parts[4] : 0,
          y: Number.isFinite(parts[5]) ? parts[5] : 0
        };
      };
      const getTooltipRect = (element, style) => {
        if (!element || !style) {
          return null;
        }

        const rect = element.getBoundingClientRect();
        const transform = getTransform(style.transform);
        const width =
          parsePx(style.width) +
          parsePx(style.paddingLeft) +
          parsePx(style.paddingRight) +
          parsePx(style.borderLeftWidth) +
          parsePx(style.borderRightWidth);
        const height =
          parsePx(style.height) +
          parsePx(style.paddingTop) +
          parsePx(style.paddingBottom) +
          parsePx(style.borderTopWidth) +
          parsePx(style.borderBottomWidth);

        if (!width || !height) {
          return null;
        }

        const left =
          style.left !== "auto"
            ? rect.left + parsePx(style.left) + transform.x
            : rect.right - parsePx(style.right) - width + transform.x;
        const top =
          style.top !== "auto"
            ? rect.top + parsePx(style.top) + transform.y
            : rect.bottom - parsePx(style.bottom) - height + transform.y;

        return {
          bottom: top + height,
          left,
          right: left + width,
          top
        };
      };
      const tooltipRect = getTooltipRect(pill, styles);
      const overlappingCards =
        card && tooltipRect
          ? [...document.querySelectorAll(".progress-match:not(.tournament-loading-match)")].filter((otherCard) => {
              if (otherCard === card) {
                return false;
              }

              const rect = otherCard.getBoundingClientRect();
              return (
                tooltipRect.left < rect.right &&
                tooltipRect.right > rect.left &&
                tooltipRect.top < rect.bottom &&
                tooltipRect.bottom > rect.top
              );
            })
          : [];
      const overlappingCardZIndexes = overlappingCards.map(parseZIndex);

      return {
        ariaLabel: pill?.getAttribute("aria-label") || "",
        cardZIndex: parseZIndex(card),
        headerHasLive: header?.classList.contains("has-live") || false,
        href: pill?.getAttribute("href") || "",
        label: pill?.textContent.replace(/\s+/g, " ").trim() || "",
        maxOverlappingCardZIndex: Math.max(0, ...overlappingCardZIndexes),
        overlappingCardCount: overlappingCards.length,
        overlappingCardNumbers: overlappingCards.map((overlappingCard) => overlappingCard.dataset.matchNumber || ""),
        title: pill?.getAttribute("title") || "",
        tooltip: pill?.getAttribute("data-tooltip") || "",
        tooltipContent: styles?.content || "",
        tooltipOpacity: styles ? Number(styles.opacity) : 0,
        tooltipRect: tooltipRect
          ? {
              bottom: Math.round(tooltipRect.bottom),
              left: Math.round(tooltipRect.left),
              right: Math.round(tooltipRect.right),
              top: Math.round(tooltipRect.top)
            }
          : null
      };
    }, tournamentLivePillSelector);
    assert(
      tournamentLiveTooltipState.headerHasLive &&
        tournamentLiveTooltipState.href === fifaWorldCupScoresUrl &&
        tournamentLiveTooltipState.label === "Live" &&
        tournamentLiveTooltipState.title === "FIFA snapshot: 5' · checked 3 min ago" &&
        tournamentLiveTooltipState.tooltip === "FIFA snapshot: 5' · checked 3 min ago" &&
        tournamentLiveTooltipState.ariaLabel === "Live: FIFA snapshot: 5' · checked 3 min ago" &&
        tournamentLiveTooltipState.tooltipContent.includes("FIFA snapshot: 5") &&
        tournamentLiveTooltipState.tooltipOpacity > 0.8 &&
        tournamentLiveTooltipState.overlappingCardCount > 0 &&
        tournamentLiveTooltipState.cardZIndex > tournamentLiveTooltipState.maxOverlappingCardZIndex,
      `Tournament-card Live pills should expose the same official match-time tooltip above overlapping bracket cards on desktop hover. Measured ${JSON.stringify(tournamentLiveTooltipState)}.`
    );
    await tournamentLiveTooltipCheck.context.close();
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
  const immediateCatchUpOpenState = await catchUpCheck.page.locator("#catch-up-button").evaluate((button) => {
    button.click();
    const popover = document.querySelector("#catch-up-popover");
    const list = document.querySelector("#catch-up-list");

    return {
      expanded: button.getAttribute("aria-expanded"),
      hidden: popover?.classList.contains("is-hidden"),
      loadingItems: list?.querySelectorAll(".catch-up-loading-item").length || 0,
      busy: list?.getAttribute("aria-busy"),
      realItems: list?.querySelectorAll(".catch-up-item:not(.catch-up-loading-item)").length || 0
    };
  });
  assert(
    immediateCatchUpOpenState.expanded === "true" &&
      immediateCatchUpOpenState.hidden === false &&
      immediateCatchUpOpenState.loadingItems === 3 &&
      immediateCatchUpOpenState.busy === "true" &&
      immediateCatchUpOpenState.realItems === 0,
    `Opening catch-up should show the skeleton immediately before rendering news. Measured ${JSON.stringify(immediateCatchUpOpenState)}.`
  );
  await waitForCatchUpItems(catchUpCheck.page);
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
  await openCatchUp(catchUpCheck.page);
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
  await openCatchUp(latestCatchUpCheck.page);
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
  await openCatchUp(tournamentCatchUpCheck.page);
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
  await openCatchUp(tournamentCatchUpCheck.page);
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

  const knockoutCatchUpCheck = await openPageAtTime(
    "2026-06-28T23:30:00.000Z",
    "/?view=matches&date=2026-06-28&tz=America%2FLos_Angeles"
  );
  await openCatchUp(knockoutCatchUpCheck.page);
  const knockoutCatchUpItems = await knockoutCatchUpCheck.page
    .locator(".catch-up-item")
    .evaluateAll((items) =>
      items.map((item) => {
        const visibleText = (node) => {
          if (!node) {
            return "";
          }

          const clone = node.cloneNode(true);
          clone.querySelectorAll(".player-card").forEach((card) => card.remove());
          return clone.textContent.replace(/\s+/g, " ").trim();
        };

        return {
          headline: visibleText(item.querySelector(".catch-up-title-row h3 > span")),
          subtitle: visibleText(item.querySelector(".catch-up-subtitle"))
        };
      })
    );
  const canadaKnockoutItem = knockoutCatchUpItems.find((item) =>
    item.headline?.includes("Canada edge South Africa to reach the Round of 16")
  );
  assert(
    canadaKnockoutItem?.subtitle.includes("Canada's 1-0 win moved them into the Round of 16") &&
      canadaKnockoutItem?.subtitle.includes("Stephen Eustaquio's 90+2' winner settled it for Canada") &&
      canadaKnockoutItem?.subtitle.includes("Canada reached the Round of 16 and South Africa exited"),
    "Completed knockout catch-up should describe the scorer, progression, and elimination instead of group points."
  );
  assert(
    !/\b(?:points|foothold)\b/i.test(`${canadaKnockoutItem?.headline || ""} ${canadaKnockoutItem?.subtitle || ""}`),
    "Completed knockout catch-up should not use group-stage points or foothold language."
  );
  await knockoutCatchUpCheck.page.locator('[data-match-id="match-73-round-of-32-2026-06-28"]').click();
  const canadaKnockoutDetailText = await knockoutCatchUpCheck.page.locator("#match-info").innerText();
  assert(
    canadaKnockoutDetailText.includes("Canada beat South Africa 1-0.") &&
      !canadaKnockoutDetailText.includes("Canada beat South Africa 0-1.") &&
      canadaKnockoutDetailText.includes("90+2'") &&
      canadaKnockoutDetailText.includes("Stephen Eustaquio") &&
      canadaKnockoutDetailText.includes("Stephen Eustaquio broke through in stoppage time, leaving South Africa chasing a 1-0 match.") &&
      canadaKnockoutDetailText.includes("Canada kept South Africa out at the other end and turned the late goal into a knockout win.") &&
      !canadaKnockoutDetailText.includes("South Africa stayed close enough to keep the final minutes tense.") &&
      !/Canada reached the Round of 16 and South Africa exited|took three points from Round of 32|foothold in Round of 32/i.test(canadaKnockoutDetailText),
    "Completed knockout match detail should show winner-oriented score, scorer timeline, and match-specific bullets without bracket-impact or group-table copy."
  );
  await knockoutCatchUpCheck.context.close();

  const latestKnockoutChineseCheck = await openPageAtTime(
    "2026-06-30T16:31:00.000Z",
    "/?view=matches&date=2026-06-29&tz=America%2FLos_Angeles"
  );
  await latestKnockoutChineseCheck.page.locator("#settings-button").click();
  await latestKnockoutChineseCheck.page.locator('[data-language="zh"]').click();
  await openCatchUp(latestKnockoutChineseCheck.page);
  const latestKnockoutChineseItems = await latestKnockoutChineseCheck.page
    .locator(".catch-up-item")
    .evaluateAll((items) =>
      items.map((item) => {
        const visibleText = (node) => {
          if (!node) {
            return "";
          }

          const clone = node.cloneNode(true);
          clone.querySelectorAll(".player-card").forEach((card) => card.remove());
          return clone.textContent.replace(/\s+/g, " ").trim();
        };

        return {
          headline: visibleText(item.querySelector(".catch-up-title-row h3 > span")),
          subtitle: visibleText(item.querySelector(".catch-up-subtitle"))
        };
      })
    );
  const moroccoChineseCatchUpItem = latestKnockoutChineseItems.find((item) =>
    item.headline?.includes("摩洛哥 点球淘汰 荷兰")
  );
  const paraguayChineseCatchUpItem = latestKnockoutChineseItems.find((item) =>
    item.headline?.includes("巴拉圭 点球淘汰 德国")
  );
  const brazilChineseCatchUpItem = latestKnockoutChineseItems.find((item) =>
    item.headline?.includes("巴西 险胜 日本，晋级16强赛")
  );
  const norwayChineseCatchUpItem = latestKnockoutChineseItems.find((item) =>
    item.headline?.includes("挪威 险胜 科特迪瓦，晋级16强赛")
  );
  const knockoutChineseSubtitleText = [
    moroccoChineseCatchUpItem?.subtitle || "",
    paraguayChineseCatchUpItem?.subtitle || "",
    brazilChineseCatchUpItem?.subtitle || "",
    norwayChineseCatchUpItem?.subtitle || ""
  ].join(" ");
  assert(
    moroccoChineseCatchUpItem?.subtitle.includes("科迪·加克波帮助荷兰领先") &&
      moroccoChineseCatchUpItem?.subtitle.includes("摩洛哥晋级16强赛，荷兰出局") &&
      paraguayChineseCatchUpItem?.subtitle.includes("胡利奥·塞萨尔·恩西索首开纪录，凯·哈弗茨完成最后一击") &&
      paraguayChineseCatchUpItem?.subtitle.includes("巴拉圭晋级16强赛，德国出局") &&
      (brazilChineseCatchUpItem
        ? brazilChineseCatchUpItem.subtitle.includes("加布里埃尔·马丁内利在90+5'打入制胜球") &&
          brazilChineseCatchUpItem.subtitle.includes("巴西晋级16强赛，日本出局")
        : norwayChineseCatchUpItem?.subtitle.includes("埃尔林·哈兰德在86'打入制胜球") &&
          norwayChineseCatchUpItem?.subtitle.includes("挪威晋级16强赛，科特迪瓦出局")) &&
      !/\b(?:put|before|opened|finished|winner|settled|reached|Round of 16|exited|chased|scoring)\b/i.test(knockoutChineseSubtitleText),
    "Chinese knockout catch-up should localize generated story and advancement standouts without leftover English result grammar."
  );
  await latestKnockoutChineseCheck.page.locator('[data-match-id="match-74-round-of-32-2026-06-29"]').click();
  const paraguayGermanyChineseDetail = await latestKnockoutChineseCheck.page.locator("#match-info").innerText();
  await latestKnockoutChineseCheck.page.locator('[data-match-id="match-75-round-of-32-2026-06-29"]').click();
  const moroccoNetherlandsChineseDetail = await latestKnockoutChineseCheck.page.locator("#match-info").innerText();
  const moroccoNetherlandsChineseResultLinkTexts = await latestKnockoutChineseCheck.page
    .locator("#match-info .result-story-highlights .player-link")
    .evaluateAll((links) => links.map((link) => link.textContent.trim()));
  const knockoutChineseDetailText = `${paraguayGermanyChineseDetail} ${moroccoNetherlandsChineseDetail}`.replace(/\s+/g, " ");
  assert(
    /巴拉圭\s*在\s*1-1\s*战平后通过点球击败\s*德国。/.test(paraguayGermanyChineseDetail) &&
      paraguayGermanyChineseDetail.includes("阿尔米隆-恩西索反击") &&
      paraguayGermanyChineseDetail.includes("巴拉圭点球处理更稳，在1-1战平后通过点球大战4-3胜出。") &&
      !paraguayGermanyChineseDetail.includes("2026年世界杯 - 32强赛") &&
      !paraguayGermanyChineseDetail.includes("（巴拉圭点球大战4-3胜出）") &&
      /摩洛哥\s*在\s*1-1\s*战平后通过点球击败\s*荷兰。/.test(moroccoNetherlandsChineseDetail) &&
      moroccoNetherlandsChineseDetail.includes("哈基米-布拉欣右路冲击") &&
      moroccoNetherlandsChineseResultLinkTexts.includes("哈基米") &&
      moroccoNetherlandsChineseResultLinkTexts.includes("布拉欣") &&
      moroccoNetherlandsChineseDetail.includes("荷兰的德容-加克波受控组织推进") &&
      moroccoNetherlandsChineseDetail.includes("摩洛哥点球处理更稳，在1-1战平后通过点球大战3-2胜出。") &&
      !moroccoNetherlandsChineseDetail.includes("2026年世界杯 - 32强赛") &&
      !moroccoNetherlandsChineseDetail.includes("（摩洛哥点球大战3-2胜出）") &&
      !/\b(?:beat|penalties|draw|counters|right-side|surges|relevant|shootout|World Cup|Round of|controlled buildup|ON PENALTIES)\b/i.test(knockoutChineseDetailText) &&
      !knockoutChineseDetailText.includes("德德容") &&
      !knockoutChineseDetailText.includes("Netherlands'"),
    "Chinese knockout Result details should localize shootout summaries and keep current fixtures out of H2H past matches."
  );
  await latestKnockoutChineseCheck.context.close();

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
    `The release notes tooltip should show a compact change summary. Expected "${getExpectedReleaseTooltipText(releaseNotesData)}", received "${releaseTooltipText}".`
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

  const tomorrowPast24DuringLive = await openPageAtTime(
    "2026-06-29T21:34:00.000Z",
    "/?view=matches&date=2026-06-30&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const liveFixture = data.fixtures.find(
          (fixture) => fixture.id === "match-74-round-of-32-2026-06-29"
        );
        liveFixture.status = "LIVE";
        liveFixture.score = { home: 0, away: 1 };
      }
    }
  );
  assert(
    (await tomorrowPast24DuringLive.page.locator(".yesterday-section").count()) === 0,
    "A future date should not show a Past 24 hours banner while previous-day matches are still live."
  );
  await tomorrowPast24DuringLive.context.close();

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
      "2026",
    "The current standings heading should show just the selected year."
  );
  assert(
    (await page.locator("#standings-heading").getAttribute("aria-label")) === "2026",
    "The current standings heading label should not add a redundant Standings suffix."
  );
  const standingsYearChevron = await page.locator("#standings-year-button").evaluate((button) => {
    const style = getComputedStyle(button, "::after");
    return {
      borderBottomWidth: Number.parseFloat(style.borderBottomWidth),
      borderRightWidth: Number.parseFloat(style.borderRightWidth),
      height: Number.parseFloat(style.height),
      marginLeft: Number.parseFloat(style.marginLeft),
      width: Number.parseFloat(style.width)
    };
  });
  assert(
    standingsYearChevron.width >= 5 &&
      standingsYearChevron.height >= 5 &&
      standingsYearChevron.marginLeft >= 8 &&
      standingsYearChevron.borderBottomWidth > 0 &&
      standingsYearChevron.borderRightWidth > 0,
    `The standings year heading should show a dropdown chevron like Today. Measured ${JSON.stringify(standingsYearChevron)}.`
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
  const groupStandingsLiveRows = await page.evaluate(() =>
    [...document.querySelectorAll(".standings-card tbody tr")].map((row) => ({
      eliminated: row.querySelector(".standing-status-pill.is-eliminated")?.textContent.trim() || "",
      live: row.querySelector(".standing-live-pill")?.textContent.trim() || "",
      race: row.querySelector(".third-place-pill")?.textContent.trim() || "",
      team: row.querySelector(".standing-name")?.textContent.trim() || ""
    }))
  );
  assert(
    groupStandingsLiveRows.every((row) => row.live === ""),
    "Group standings should not show LIVE pills now that the group stage live-tracking surface is retired."
  );
  assert(
    groupStandingsLiveRows.every((row) => !row.race || !row.eliminated),
    "Group standings should not stack an Eliminated pill beside a third-place race pill."
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
    groupIScheduledWindowRows.every((row) => row.live === "") &&
      groupIScheduledWindowRows.some((row) => row.team === "Senegal" && row.race.startsWith("3rd race")),
    "Group standings should keep third-place race pills but suppress LIVE pills during the scheduled live window."
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
    thirdPlaceScheduledWindowRows.every((row) => row.live === ""),
    "The third-place race table should not show LIVE pills during the scheduled live window."
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
      livePillCount: document.querySelectorAll(".third-place-table .standing-live-pill").length,
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
  assert(
    thirdPlaceRaceCheck.livePillCount === 0,
    "The third-place race should not carry standings LIVE pill state."
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
      m81OutcomeKeys: [...document.querySelectorAll('.progress-match[data-match-number="81"] .knockout-likelihood')]
        .map((element) => element.dataset.outcome || ""),
      m81OutcomeTexts: [...document.querySelectorAll('.progress-match[data-match-number="81"] .knockout-likelihood')]
        .map((element) => element.textContent.replace(/\s+/g, " ").trim()),
      m81PillCount: document.querySelectorAll('.progress-match[data-match-number="81"] .knockout-likelihood').length,
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
      outcomePillFlagCount: document.querySelectorAll(".knockout-likelihood .flag").length,
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
      m74ResultPills: [...document.querySelectorAll('.progress-match[data-match-number="74"] .knockout-result-pill')]
        .map((element) => element.textContent.replace(/\s+/g, " ").trim()),
      m74Winner: document.querySelector('.progress-match[data-match-number="74"]')?.dataset.winnerTeamId || "",
      m75ResultPills: [...document.querySelectorAll('.progress-match[data-match-number="75"] .knockout-result-pill')]
        .map((element) => element.textContent.replace(/\s+/g, " ").trim()),
      m75Winner: document.querySelector('.progress-match[data-match-number="75"]')?.dataset.winnerTeamId || "",
      m77TieTooltip: getOutcomeTooltip(77, "tie"),
      m80TieTooltip: getOutcomeTooltip(80, "tie"),
      m83TieTooltip: getOutcomeTooltip(83, "tie"),
      m86TieTooltip: getOutcomeTooltip(86, "tie"),
      m88AwayTooltip: getOutcomeTooltip(88, "away"),
      m73PillCount: document.querySelectorAll('.progress-match[data-match-number="73"] .knockout-likelihood').length,
      m89PillCount: document.querySelectorAll('.progress-match[data-match-number="89"] .knockout-likelihood').length,
      m89SeedLabelCount: document.querySelectorAll('.progress-match[data-match-number="89"] .knockout-team-copy small').length,
      m89VersusColor: getComputedStyle(
        document.querySelector('.progress-match[data-match-number="89"] .knockout-versus')
      ).color,
      m97PillCount: document.querySelectorAll('.progress-match[data-match-number="97"] .knockout-likelihood').length,
      m97SeedLabelCount: document.querySelectorAll('.progress-match[data-match-number="97"] .knockout-team-copy small').length,
      m104PillCount: document.querySelectorAll('.progress-match[data-match-number="104"] .knockout-likelihood').length,
      m73FooterCount: document.querySelectorAll('.progress-match[data-match-number="73"] .knockout-match-footer').length,
      m73Projected: document.querySelector('.progress-match[data-match-number="73"]')?.classList.contains("is-projected"),
      m74Projected: document.querySelector('.progress-match[data-match-number="74"]')?.classList.contains("is-projected"),
      m79Projected: document.querySelector('.progress-match[data-match-number="79"]')?.classList.contains("is-projected"),
      m89Projected: document.querySelector('.progress-match[data-match-number="89"]')?.classList.contains("is-projected"),
      m92Projected: document.querySelector('.progress-match[data-match-number="92"]')?.classList.contains("is-projected"),
      m79SlotPills: [...document.querySelectorAll('.progress-match[data-match-number="79"] .knockout-slot-odds')]
        .map((element) => ({
          slotLabel: element.dataset.slotLabel || "",
          teamId: element.dataset.teamId || "",
          text: element.textContent.replace(/\s+/g, " ").trim()
        })),
      m79TeamVisuals: getMatchTeamVisuals(79),
      m89TeamVisuals: getMatchTeamVisuals(89),
      m92TeamVisuals: getMatchTeamVisuals(92),
      m92VersusColor: getComputedStyle(
        document.querySelector('.progress-match[data-match-number="92"] .knockout-versus')
      ).color,
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
      slotOddsFlagCount: document.querySelectorAll(".knockout-slot-odds .flag").length,
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
  const m92LikelyVisuals = tournamentCheck.m92TeamVisuals.filter((team) =>
    team.className.includes("is-likely")
  );
  const m92LockedVisuals = tournamentCheck.m92TeamVisuals.filter((team) =>
    team.className.includes("is-locked")
  );
  const isLockedResolvedCountry = (team) =>
    team.className.includes("is-locked") &&
    team.className.includes("is-resolved") &&
    !team.className.includes("is-likely") &&
    team.flagFilter === "none" &&
    team.flagOpacity === "1" &&
    Number(team.rankOpacity) >= 0.7 &&
    getCssColorAlpha(team.strongColor) >= 0.8;
  const isCompletedLoserCountry = (team) =>
    team.className.includes("is-locked") &&
    team.className.includes("is-resolved") &&
    team.className.includes("is-loser") &&
    team.flagFilter.includes("grayscale") &&
    Number(team.flagOpacity) < 1 &&
    Number(team.rankOpacity) < 1 &&
    getCssColorAlpha(team.strongColor) < 0.7;
  const isResolvedRoundOf32Country = (team) => isLockedResolvedCountry(team) || isCompletedLoserCountry(team);
  const isMutedProjectedCountry = (team) =>
    !team.className.includes("is-locked") &&
    team.flagFilter.includes("grayscale") &&
    Number(team.flagOpacity) < 1 &&
    Number(team.rankOpacity) < 1 &&
    getCssColorAlpha(team.strongColor) < 0.7;
  assert(
    tournamentCheck.m79Projected === false &&
      tournamentCheck.m79TeamVisuals.length === 2 &&
      tournamentCheck.m79TeamVisuals.every(isResolvedRoundOf32Country) &&
      tournamentCheck.roundOf32TeamVisuals.length === 32 &&
      tournamentCheck.roundOf32TeamVisuals.every(isResolvedRoundOf32Country) &&
      tournamentCheck.m79SlotPills.length === 0 &&
      isLockedResolvedCountry(m79MexicoVisual) &&
      m79UnresolvedVisual &&
      isResolvedRoundOf32Country(m79UnresolvedVisual),
    `Locked Round of 32 teams should render as visually confirmed resolved cards with completed losers muted and no slot odds. Measured ${JSON.stringify({ m79MexicoVisual, m79UnresolvedVisual, m79SlotPills: tournamentCheck.m79SlotPills, roundOf32ProjectedMatchNumbers: tournamentCheck.roundOf32ProjectedMatchNumbers })}.`
  );
  assert(
    tournamentCheck.m89Projected === false &&
      tournamentCheck.m89TeamVisuals.length === 2 &&
      tournamentCheck.m89TeamVisuals.every(isLockedResolvedCountry) &&
      getCssColorAlpha(tournamentCheck.m89VersusColor) >= 0.7 &&
      tournamentCheck.m92Projected === true &&
      tournamentCheck.m92TeamVisuals.length === 2 &&
      m92LikelyVisuals.length >= 1 &&
      m92LikelyVisuals.every(isMutedProjectedCountry) &&
      m92LockedVisuals.every(isLockedResolvedCountry) &&
      getCssColorAlpha(tournamentCheck.m92VersusColor) < 0.7 &&
      tournamentCheck.laterRoundLikelyVisuals.length >= 2 &&
      tournamentCheck.laterRoundLikelyVisuals.every(isMutedProjectedCountry),
    `Resolved Round of 16 country picks should stay full-strength while projected Round of 16 and later teams stay muted. Measured ${JSON.stringify({ m89TeamVisuals: tournamentCheck.m89TeamVisuals, m89VersusColor: tournamentCheck.m89VersusColor, m92LikelyVisuals, m92LockedVisuals, m92VersusColor: tournamentCheck.m92VersusColor, laterRoundLikelyVisuals: tournamentCheck.laterRoundLikelyVisuals })}.`
  );
  const groupETopTeam = getTeam(standingsData.groups?.E?.[0]?.teamId);
  const groupETopTeamName = groupETopTeam.standingName || groupETopTeam.name;
  const expectedProjectedRoundOf32Count = fixturesData.fixtures.filter(
    (fixture) => fixture.stage === "round-of-32" && (!fixture.homeTeamId || !fixture.awayTeamId)
  ).length;
  const fixturesByMatchNumber = new Map(
    fixturesData.fixtures
      .filter((fixture) => Number.isInteger(Number(fixture.matchNumber)))
      .map((fixture) => [Number(fixture.matchNumber), fixture])
  );
  const getFixtureWinnerTeamId = (fixture) => {
    if (!fixture || fixture.status !== "FT") {
      return "";
    }

    const explicitWinner = String(fixture.winnerTeamId || fixture.winner || "").trim();
    if (explicitWinner) {
      return explicitWinner;
    }

    const scoreWinner = (score) => {
      const home = Number(score?.home);
      const away = Number(score?.away);
      if (!Number.isFinite(home) || !Number.isFinite(away) || home === away) {
        return "";
      }

      return home > away ? fixture.homeTeamId : fixture.awayTeamId;
    };

    return scoreWinner(fixture.scoreDetails?.penalties) || scoreWinner(fixture.score);
  };
  const isKnockoutSideConfirmed = (fixture, side) => {
    if (!fixture?.[`${side}TeamId`]) {
      return false;
    }

    const sourceMatch = /^(?:Winner|Loser) match (\d+)$/i.exec(fixture[`${side}Slot`] || "");
    if (!sourceMatch) {
      return true;
    }

    return Boolean(getFixtureWinnerTeamId(fixturesByMatchNumber.get(Number(sourceMatch[1]))));
  };
  const expectedProjectedLaterRoundCount = fixturesData.fixtures.filter((fixture) =>
    ["round-of-16", "quarter-finals", "semi-finals", "bronze-final", "final"].includes(fixture.stage) &&
    !(isKnockoutSideConfirmed(fixture, "home") && isKnockoutSideConfirmed(fixture, "away"))
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
  const expectedMatch81Fixture = fixturesData.fixtures.find((fixture) => fixture.matchNumber === 81);
  const expectedM81OutcomeTexts = expectedMatch81Fixture
    ? [
        `${expectedMatch81Fixture.homeTeamId} ${expectedMatch81Fixture.projection.home}%`,
        `TIE ${expectedMatch81Fixture.projection.draw}%`,
        `${expectedMatch81Fixture.awayTeamId} ${expectedMatch81Fixture.projection.away}%`
      ]
    : [];
  assert(
    tournamentCheck.summary.includes("Round of 32 slots") &&
      tournamentCheck.m73ProgressText.includes("Jun 28 12:00PM") &&
      !tournamentCheck.m73ProgressText.includes("Jun 28 / 12:00PM") &&
      tournamentCheck.m74ProgressText.includes(groupETopTeamName) &&
      tournamentCheck.m74ProgressText.includes("Paraguay") &&
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
      tournamentCheck.m74Winner === "PAR" &&
      tournamentCheck.m74ResultPills.join("|") === "1-1 (4-3 pens)" &&
      tournamentCheck.m75Winner === "MAR" &&
      tournamentCheck.m75ResultPills.join("|") === "1-1 (3-2 pens)" &&
      !tournamentCheck.m73ProgressText.includes("Round of 32") &&
      tournamentCheck.likelihoodCount === expectedOutcomePillCount &&
      tournamentCheck.likelihoodNonNeutralCount === 0 &&
      tournamentCheck.likelihoodTooltipCount === tournamentCheck.likelihoodCount &&
      tournamentCheck.likelihoodTooltipMaxLength <= 170 &&
      tournamentCheck.likelihoodListCount === expectedOutcomeListCount &&
      tournamentCheck.outcomePillFlagCount === 0 &&
      tournamentCheck.tiePillCount === expectedOutcomeListCount &&
      tournamentCheck.tiePillFlagCount === 0 &&
      tournamentCheck.m81PillCount === 3 &&
      tournamentCheck.m81OutcomeKeys.join("|") === "home|tie|away" &&
      tournamentCheck.m81OutcomeTexts.join("|") === expectedM81OutcomeTexts.join("|") &&
      tournamentCheck.m81OutcomeTexts.every((text) => /^(?:[A-Z]{3}|TIE)\s+\d+%$/.test(text)) &&
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
      tournamentCheck.likelihoodText.includes("TIE") &&
      !tournamentCheck.likelihoodText.includes("here") &&
      !/\d+%\s+(?:Germany|Sweden|France|Canada|Argentina|Spain|Morocco|Japan)\b/.test(tournamentCheck.likelihoodText) &&
      !tournamentCheck.slotOddsText.includes("Germany ") &&
      !tournamentCheck.slotOddsText.includes("Bosnia and Herzegovina ") &&
      tournamentCheck.slotOddsFlagCount === 0 &&
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
      tournamentCheck.m89Tooltips.includes("France have the shootout edge through Kylian Mbappé") &&
      !/goalkeeper|Olise|Risser/.test(tournamentCheck.m89Tooltips) &&
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
    (lockedBracketNavigation.date === "2026-06-28" || lockedBracketNavigation.date === null) &&
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
        const match74OutcomePills = [...(match74?.querySelectorAll(".knockout-likelihood") || [])];
        const match74ResultPills = [...(match74?.querySelectorAll(".knockout-result-pill") || [])]
          .map((pill) => pill.textContent.replace(/\s+/g, " ").trim());
        const seedLabels = [...document.querySelectorAll('.progress-match .knockout-team-copy small')]
          .map((label) => label.textContent.trim());
        const match74OutcomeKeys = [...document.querySelectorAll('.progress-match[data-match-number="74"] .knockout-likelihood')]
          .map((pill) => pill.dataset.outcome || "");
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
          match74OutcomeKeys,
          match74ResultPills,
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
        check.match74OutcomeKeys.length === 0 &&
        check.match74ResultPills.join("|") === "1-1 (4-3 pens)" &&
        check.match74TieFlagCount === 0 &&
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
  const mobileTournamentCanvasTopHandoff = await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    window.scrollTo(0, 0);
    progression.scrollTop = 0;

    const calls = [];
    const originalScrollTo = window.scrollTo.bind(window);
    const originalSetPointerCapture = Element.prototype.setPointerCapture;
    const originalReleasePointerCapture = Element.prototype.releasePointerCapture;
    window.scrollTo = (leftOrOptions, top) => {
      const requestedTop = typeof leftOrOptions === "object" ? Number(leftOrOptions.top) : Number(top);
      calls.push({ top: requestedTop });
      return originalScrollTo(leftOrOptions, top);
    };
    Element.prototype.setPointerCapture = function setPointerCaptureNoop() {};
    Element.prototype.releasePointerCapture = function releasePointerCaptureNoop() {};

    const rect = progression.getBoundingClientRect();
    const eventBase = {
      bubbles: true,
      button: 0,
      buttons: 1,
      cancelable: true,
      clientX: rect.left + 44,
      isPrimary: true,
      pointerId: 19,
      pointerType: "touch"
    };
    progression.dispatchEvent(new PointerEvent("pointerdown", { ...eventBase, clientY: rect.top + 44 }));
    progression.dispatchEvent(new PointerEvent("pointermove", { ...eventBase, clientY: rect.top + 118 }));
    progression.dispatchEvent(new PointerEvent("pointerup", { ...eventBase, buttons: 0, clientY: rect.top + 118 }));

    Element.prototype.setPointerCapture = originalSetPointerCapture;
    Element.prototype.releasePointerCapture = originalReleasePointerCapture;
    window.scrollTo = originalScrollTo;

    return {
      calls,
      minRequestedTop: Math.min(...calls.map((call) => call.top)),
      overscrollBehaviorY: getComputedStyle(progression).overscrollBehaviorY,
      pageScrollY: Math.round(window.scrollY),
      scrollTop: Math.round(progression.scrollTop)
    };
  });
  assert(
    mobileTournamentCanvasTopHandoff.calls.length > 0 &&
      mobileTournamentCanvasTopHandoff.minRequestedTop >= 0 &&
      mobileTournamentCanvasTopHandoff.pageScrollY === 0 &&
      mobileTournamentCanvasTopHandoff.scrollTop === 0 &&
      mobileTournamentCanvasTopHandoff.overscrollBehaviorY === "contain",
    `Dragging past the top of the mobile tournament canvas should not request negative page scroll or expose top whitespace. Measured ${JSON.stringify(mobileTournamentCanvasTopHandoff)}.`
  );
  await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    window.scrollTo(0, 0);
    progression.scrollTop = progression.scrollHeight - progression.clientHeight;
  });
  await page.waitForTimeout(60);
  const mobileTournamentCanvasEdgeHandoff = await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    const maxScrollTop = progression.scrollHeight - progression.clientHeight;
    const calls = [];
    const originalScrollTo = window.scrollTo.bind(window);
    const originalSetPointerCapture = Element.prototype.setPointerCapture;
    const originalReleasePointerCapture = Element.prototype.releasePointerCapture;

    window.scrollTo(0, 0);
    progression.scrollTop = maxScrollTop;
    window.scrollTo = (leftOrOptions, top) => {
      const requestedTop = typeof leftOrOptions === "object" ? Number(leftOrOptions.top) : Number(top);
      calls.push({ top: requestedTop });
      return originalScrollTo(leftOrOptions, top);
    };
    Element.prototype.setPointerCapture = function setPointerCaptureNoop() {};
    Element.prototype.releasePointerCapture = function releasePointerCaptureNoop() {};

    const rect = progression.getBoundingClientRect();
    const eventBase = {
      bubbles: true,
      button: 0,
      buttons: 1,
      cancelable: true,
      clientX: rect.left + rect.width / 2,
      isPrimary: true,
      pointerId: 23,
      pointerType: "touch"
    };
    progression.dispatchEvent(new PointerEvent("pointerdown", { ...eventBase, clientY: rect.top + 500 }));
    progression.dispatchEvent(new PointerEvent("pointermove", { ...eventBase, clientY: rect.top + 180 }));
    progression.dispatchEvent(new PointerEvent("pointerup", { ...eventBase, buttons: 0, clientY: rect.top + 180 }));

    Element.prototype.setPointerCapture = originalSetPointerCapture;
    Element.prototype.releasePointerCapture = originalReleasePointerCapture;
    window.scrollTo = originalScrollTo;

    return {
      activeRoundId: progression.dataset.mobileActiveRoundId || "",
      canvasRemainingBottom: Math.round(maxScrollTop - progression.scrollTop),
      calls,
      hiddenRounds: [...document.querySelectorAll(".progress-round.is-before-mobile-window")].length,
      maxRequestedTop: Math.max(...calls.map((call) => call.top)),
      pageScrollY: Math.round(window.scrollY),
      scrollTop: Math.round(progression.scrollTop),
      urlMatch: new URL(window.location.href).searchParams.get("match") || ""
    };
  });
  assert(
    mobileTournamentCanvasEdgeHandoff.activeRoundId === "" &&
      mobileTournamentCanvasEdgeHandoff.calls.length > 0 &&
      mobileTournamentCanvasEdgeHandoff.hiddenRounds === 0 &&
      mobileTournamentCanvasEdgeHandoff.canvasRemainingBottom <= 2 &&
      mobileTournamentCanvasEdgeHandoff.maxRequestedTop >= 80 &&
      mobileTournamentCanvasEdgeHandoff.urlMatch === "",
    `Dragging past the bottom of the mobile tournament canvas should request vertical page movement. Measured ${JSON.stringify(mobileTournamentCanvasEdgeHandoff)}.`
  );
  await page.setViewportSize({ width: 1280, height: 720 });
  const canadaPathCheck = await openPageAtTime(
    "2026-07-04T12:00:00.000Z",
    "/?view=standings&standingsMode=tournament&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const fixture = data.fixtures.find((item) => item.matchNumber === 73);

        fixture.status = "FT";
        fixture.score = { home: 1, away: 2 };
      }
    }
  );
  await canadaPathCheck.page.waitForFunction(
    () => document.querySelector('.progress-match[data-match-number="90"] .knockout-team[data-team-id="CAN"]')
  );
  const canadaPathState = await canadaPathCheck.page.evaluate(() => {
    const getVisual = (element) => {
      const flag = element?.querySelector(".knockout-team-flag");
      const rank = element?.querySelector(".rank-pill");
      const strong = element?.querySelector(".knockout-team-copy strong");

      return {
        className: element?.className || "",
        flagFilter: flag ? getComputedStyle(flag).filter : "",
        flagOpacity: flag ? getComputedStyle(flag).opacity : "",
        rankOpacity: rank ? getComputedStyle(rank).opacity : "",
        strongColor: strong ? getComputedStyle(strong).color : "",
        strongWeight: strong ? Number.parseFloat(getComputedStyle(strong).fontWeight) : 0,
        teamId: element?.dataset.teamId || ""
      };
    };
    const match73 = document.querySelector('.progress-match[data-match-number="73"]');
    const match90 = document.querySelector('.progress-match[data-match-number="90"]');
    const canada73 = match73?.querySelector('.knockout-team[data-team-id="CAN"]');
    const southAfrica73 = match73?.querySelector('.knockout-team[data-team-id="RSA"]');
    const canada90 = match90?.querySelector('.knockout-team[data-team-id="CAN"]');
    const morocco90 = match90?.querySelector('.knockout-team[data-team-id="MAR"]');

    return {
      m73OutcomePillCount: match73?.querySelectorAll(".knockout-likelihood").length || 0,
      m73Projected: match73?.classList.contains("is-projected"),
      m73ResultPills: [...(match73?.querySelectorAll(".knockout-result-pill") || [])].map((pill) =>
        pill.textContent.trim()
      ),
      m73Winner: match73?.dataset.winnerTeamId || "",
      m90OpenMatchId: match90?.dataset.openMatchId || "",
      m90Projected: match90?.classList.contains("is-projected"),
      m90Text: match90?.textContent.replace(/\s+/g, " ").trim() || "",
      canada73: getVisual(canada73),
      canada90: getVisual(canada90),
      morocco90: getVisual(morocco90),
      southAfrica73: getVisual(southAfrica73)
    };
  });
  assert(
    canadaPathState.m73Winner === "CAN" &&
      canadaPathState.m73ResultPills.join("|") === "2-1" &&
      canadaPathState.m73OutcomePillCount === 0 &&
      canadaPathState.m73Projected === false &&
      canadaPathState.canada73.className.includes("is-winner") &&
      canadaPathState.canada73.flagFilter === "none" &&
      canadaPathState.canada73.flagOpacity === "1" &&
      Number(canadaPathState.canada73.rankOpacity) === 1 &&
      canadaPathState.canada73.strongWeight >= 750 &&
      canadaPathState.southAfrica73.className.includes("is-loser") &&
      canadaPathState.southAfrica73.flagFilter.includes("grayscale") &&
      Number(canadaPathState.southAfrica73.flagOpacity) < 1 &&
      Number(canadaPathState.southAfrica73.rankOpacity) < 1 &&
      getCssColorAlpha(canadaPathState.southAfrica73.strongColor) < 0.7 &&
      canadaPathState.southAfrica73.strongWeight < canadaPathState.canada73.strongWeight &&
      canadaPathState.m90Projected === false &&
      canadaPathState.m90OpenMatchId === "match-90-round-of-16-2026-07-04" &&
      canadaPathState.canada90.teamId === "CAN" &&
      canadaPathState.canada90.className.includes("is-locked") &&
      canadaPathState.canada90.flagFilter === "none" &&
      canadaPathState.canada90.flagOpacity === "1" &&
      Number(canadaPathState.canada90.rankOpacity) >= 0.7 &&
      canadaPathState.morocco90.teamId === "MAR" &&
      canadaPathState.morocco90.className.includes("is-locked") &&
      canadaPathState.morocco90.flagFilter === "none" &&
      canadaPathState.morocco90.flagOpacity === "1" &&
      Number(canadaPathState.morocco90.rankOpacity) >= 0.7 &&
      !canadaPathState.m90Text.includes("Winner match"),
    `Completed source matches should mute eliminated Round of 32 sides and lock the confirmed Canada-Morocco Round of 16 card. Measured ${JSON.stringify(canadaPathState)}.`
  );
  await canadaPathCheck.context.close();

  const knockoutProgressionCheck = await openPageAtTime(
    "2026-07-05T12:00:00.000Z",
    "/?view=matches&date=2026-06-17&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const clearParticipants = (matchNumber) => {
          const fixture = data.fixtures.find((item) => item.matchNumber === matchNumber);

          if (!fixture) {
            return;
          }

          delete fixture.homeTeamId;
          delete fixture.awayTeamId;
        };
        const finishMatch = (matchNumber, homeScore, awayScore, scoreDetails = null) => {
          const fixture = data.fixtures.find((item) => item.matchNumber === matchNumber);

          fixture.status = "FT";
          fixture.score = { home: homeScore, away: awayScore };
          delete fixture.scoreDetails;
          delete fixture.winnerTeamId;
          delete fixture.winner;
          if (scoreDetails) {
            fixture.scoreDetails = scoreDetails;
          }
        };

        clearParticipants(89);
        clearParticipants(90);
        clearParticipants(97);
        finishMatch(73, 1, 2);
        finishMatch(74, 2, 0);
        finishMatch(75, 1, 0);
        finishMatch(77, 1, 0);
        finishMatch(89, 0, 0, { penalties: { home: 5, away: 4 } });
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
    const match75 = document.querySelector('.progress-match[data-match-number="75"]');
    const match77 = document.querySelector('.progress-match[data-match-number="77"]');
    const match90 = document.querySelector('.progress-match[data-match-number="90"]');
    const match89 = document.querySelector('.progress-match[data-match-number="89"]');
    const match97Source = document.querySelector(
      '.progress-match[data-match-number="97"] .knockout-team[data-source-match="89"]'
    );

    return {
      m74Winner: match74?.dataset.winnerTeamId,
      m75Winner: match75?.dataset.winnerTeamId,
      m77Winner: match77?.dataset.winnerTeamId,
      m89OutcomePillCount: match89?.querySelectorAll(".knockout-likelihood").length || 0,
      m89ResultPills: [...(match89?.querySelectorAll(".knockout-result-pill") || [])].map((pill) =>
        pill.textContent.trim()
      ),
      m89TeamIds: [...match89.querySelectorAll(".knockout-team[data-team-id]")].map(
        (team) => team.dataset.teamId
      ),
      m89Text: match89.textContent.replace(/\s+/g, " ").trim(),
      m89Winner: match89.dataset.winnerTeamId,
      m90OpenMatchId: match90?.dataset.openMatchId || "",
      m90OutcomePillCount: match90?.querySelectorAll(".knockout-likelihood").length || 0,
      m90Projected: match90?.classList.contains("is-projected"),
      m90TeamIds: [...(match90?.querySelectorAll(".knockout-team[data-team-id]") || [])].map(
        (team) => team.dataset.teamId
      ),
      m90Text: match90?.textContent.replace(/\s+/g, " ").trim() || "",
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
      progressionResolved.m89ResultPills.join("|") === "0-0 (5-4 pens)" &&
      progressionResolved.m89OutcomePillCount === 0 &&
      progressionResolved.m90TeamIds.join("|") === "CAN|NED" &&
      progressionResolved.m90Projected === false &&
      progressionResolved.m90OpenMatchId === "match-90-round-of-16-2026-07-04" &&
      progressionResolved.m90OutcomePillCount === 3 &&
      !progressionResolved.m90Text.includes("Winner match") &&
      !progressionResolved.m97Text.includes("Winner match") &&
      !progressionResolved.m89Text.includes("M97") &&
      progressionResolved.m97Text.includes(progressionWinnerName),
    `Finished knockout source matches should automatically place their winners into later fixture slots. Measured ${JSON.stringify(progressionResolved)}.`
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
      "2022",
    "Choosing a past year should update the standings heading to just that year."
  );
  assert(
    (await page.locator("#standings-heading").getAttribute("aria-label")) === "2022",
    "Choosing a past year should keep the standings heading label to just that year."
  );
  assert(
    new URL(page.url()).searchParams.get("standingsYear") === "2022",
    "The selected standings year should be reflected in the URL."
  );
  assert(
    !new URL(page.url()).searchParams.has("standingsMode"),
    "Archived standings should default to the Tournament tab."
  );
  await page.waitForFunction(
    () =>
      document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed") === "true" &&
      document.querySelectorAll(".historical-tournament-view .progress-match").length >= 16
  );
  await page.waitForFunction(
    () =>
      document.querySelectorAll(".historical-tournament-view .progress-connectors path.is-final-rail")
        .length === 1
  );
  const historicalTournamentCheck = await page.evaluate(() => {
    const finalCard = document.querySelector('.historical-tournament-view .progress-match[data-match-number="64"]');
    const bronzeCard = document.querySelector('.historical-tournament-view .progress-match[data-match-number="63"]');
    const getRectSummary = (selector) => {
      const element = document.querySelector(selector);

      if (!element) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      return {
        bottom: Math.round(rect.bottom),
        center: Math.round(rect.top + rect.height / 2),
        left: Math.round(rect.left),
        top: Math.round(rect.top)
      };
    };

    return {
      bronzeRect: getRectSummary('.historical-tournament-view .progress-match[data-match-number="63"]'),
      bronzeText: bronzeCard?.textContent.replace(/\s+/g, " ").trim() || "",
      bronzeTimeText: bronzeCard?.querySelector("time")?.textContent.trim() || "",
      finalRailConnectorPathCount: document.querySelectorAll(".historical-tournament-view .progress-connectors path.is-final-rail").length,
      finalRect: getRectSummary('.historical-tournament-view .progress-match[data-match-number="64"]'),
      finalText: finalCard?.textContent.replace(/\s+/g, " ").trim() || "",
      finalTimeText: finalCard?.querySelector("time")?.textContent.trim() || "",
      hiddenThirdPlaceTab: document.querySelector("#standings-third-place-tab")?.hidden === true,
      resultPills: [...document.querySelectorAll(".historical-tournament-view .knockout-result-pill")].map((pill) =>
        pill.textContent.trim()
      ),
      roundHeadings: [...document.querySelectorAll(".historical-tournament-view .progress-round h3")].map((heading) =>
        heading.textContent.trim()
      ),
      semi61Rect: getRectSummary('.historical-tournament-view .progress-match[data-match-number="61"]'),
      semi62Rect: getRectSummary('.historical-tournament-view .progress-match[data-match-number="62"]'),
      summary: document.querySelector("#standings-summary")?.textContent.trim(),
      tabLabels: [...document.querySelectorAll(".standings-mode-tab:not([hidden])")].map((tab) =>
        tab.textContent.trim()
      ),
      tournamentPressed: document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed")
    };
  });
  assert(
    historicalTournamentCheck.tournamentPressed === "true" &&
      historicalTournamentCheck.tabLabels.join("|") === "Tournament|Groups" &&
      historicalTournamentCheck.hiddenThirdPlaceTab &&
      historicalTournamentCheck.summary === "Knockout bracket uses archived match results." &&
      historicalTournamentCheck.roundHeadings.join("|") ===
        "Round of 16|Quarter-finals|Semi-finals|Final" &&
      historicalTournamentCheck.finalText.includes("Argentina") &&
      historicalTournamentCheck.finalText.includes("France") &&
      historicalTournamentCheck.finalTimeText === "Dec 18 6:00PM local" &&
      historicalTournamentCheck.bronzeTimeText === "Dec 17 6:00PM local (3rd place match)" &&
      !historicalTournamentCheck.bronzeText.includes("Third-place play-off") &&
      historicalTournamentCheck.resultPills.includes("3-3 (4-2 pens)") &&
      historicalTournamentCheck.finalRailConnectorPathCount === 1 &&
      historicalTournamentCheck.finalRect &&
      historicalTournamentCheck.bronzeRect &&
      historicalTournamentCheck.semi61Rect &&
      historicalTournamentCheck.semi62Rect &&
      Math.abs(historicalTournamentCheck.finalRect.left - historicalTournamentCheck.bronzeRect.left) <= 1 &&
      historicalTournamentCheck.finalRect.center > historicalTournamentCheck.semi61Rect.center + 24 &&
      historicalTournamentCheck.bronzeRect.center < historicalTournamentCheck.semi62Rect.center - 24 &&
      historicalTournamentCheck.bronzeRect.top > historicalTournamentCheck.finalRect.bottom &&
      historicalTournamentCheck.bronzeRect.top - historicalTournamentCheck.finalRect.bottom <= 180,
    `The 2022 archived standings should open on a completed Tournament bracket with Groups still available. Measured ${JSON.stringify(historicalTournamentCheck)}.`
  );
  await page.locator("#standings-groups-tab").click();
  await page.waitForFunction(() => document.querySelectorAll(".standings-card").length >= 8);
  assert(
    new URL(page.url()).searchParams.get("standingsMode") === "groups",
    "Archived Groups should be linkable from the URL when it is not the default mode."
  );
  const historicalStandingsCheck = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".standings-card")];
    const groups = new Map(
      cards.map((card) => [
        card.querySelector("h2")?.textContent.trim(),
        [...card.querySelectorAll(".standing-name")].map((team) => team.textContent.trim())
      ])
    );
    const advancingGroups = new Map(
      cards.map((card) => [
        card.querySelector("h2")?.textContent.trim(),
        [...card.querySelectorAll("tbody tr.is-advancing .standing-name")]
          .map((team) => team.textContent.trim())
          .sort()
      ])
    );
    const groupACard = cards.find((card) => card.querySelector("h2")?.textContent.trim() === "Group A");

    return {
      advancingGroupA: advancingGroups.get("Group A"),
      advancingTotal: [...document.querySelectorAll(".standings-card tbody tr.is-advancing")].length,
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
    historicalStandingsCheck.advancingGroupA?.join("|") === "Netherlands|Senegal" &&
      historicalStandingsCheck.advancingTotal === 16,
    `The 2022 archived Groups tab should highlight the teams that reached the Tournament stage. Measured ${JSON.stringify(historicalStandingsCheck)}.`
  );
  assert(
    historicalStandingsCheck.summary === "Final group tables computed from archived match results.",
    "Historical standings should explain their archived data source."
  );
  await page.goto(`${baseUrl}?view=standings&standingsYear=2010`, { waitUntil: "load" });
  await page.waitForSelector('.historical-tournament-view .progress-match[data-match-number="49"]');
  const historical2010TournamentCheck = await page.evaluate(() => {
    const opener = document.querySelector('.historical-tournament-view .progress-match[data-match-number="49"]');
    const finalCard = document.querySelector('.historical-tournament-view .progress-match[data-match-number="64"]');

    return {
      finalText: finalCard?.textContent.replace(/\s+/g, " ").trim() || "",
      openerText: opener?.textContent.replace(/\s+/g, " ").trim() || "",
      roundHeadings: [...document.querySelectorAll(".historical-tournament-view .progress-round h3")].map((heading) =>
        heading.textContent.trim()
      ),
      tournamentPressed: document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed"),
      urlMode: new URL(window.location.href).searchParams.get("standingsMode") || ""
    };
  });
  assert(
    historical2010TournamentCheck.tournamentPressed === "true" &&
      historical2010TournamentCheck.urlMode === "" &&
      historical2010TournamentCheck.roundHeadings.join("|") ===
        "Round of 16|Quarter-finals|Semi-finals|Final" &&
      historical2010TournamentCheck.openerText.includes("Uruguay") &&
      historical2010TournamentCheck.openerText.includes("South Korea") &&
      historical2010TournamentCheck.finalText.includes("Netherlands") &&
      historical2010TournamentCheck.finalText.includes("Spain") &&
      historical2010TournamentCheck.finalText.includes("0-1"),
    `The 2010 archived standings direct link should open on its Tournament bracket. Measured ${JSON.stringify(historical2010TournamentCheck)}.`
  );
  await page.goto(`${baseUrl}?view=standings&standingsYear=1958`, { waitUntil: "load" });
  await page.waitForSelector('.historical-tournament-view .progress-match[data-match-number="28"]');
  const historical1958TournamentCheck = await page.evaluate(() => {
    const progress = document.querySelector(".historical-tournament-view");
    const matchNumbers = [...document.querySelectorAll(".historical-tournament-view .progress-match")].map((match) =>
      match.getAttribute("data-match-number")
    );
    const matchText = (matchNumber) =>
      document
        .querySelector(`.historical-tournament-view .progress-match[data-match-number="${matchNumber}"]`)
        ?.textContent.replace(/\s+/g, " ")
        .trim() || "";

    return {
      finalText: matchText(35),
      matchCount: matchNumbers.length,
      matchNumbers,
      progressText: progress?.textContent.replace(/\s+/g, " ").trim() || "",
      quarterFinalText: matchText(28),
      roundHeadings: [...document.querySelectorAll(".historical-tournament-view .progress-round h3")].map((heading) =>
        heading.textContent.trim()
      ),
      summary: document.querySelector("#standings-summary")?.textContent.trim(),
      tournamentPressed: document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed"),
      urlMode: new URL(window.location.href).searchParams.get("standingsMode") || ""
    };
  });
  assert(
    historical1958TournamentCheck.tournamentPressed === "true" &&
      historical1958TournamentCheck.urlMode === "" &&
      historical1958TournamentCheck.summary === "Knockout bracket uses archived match results." &&
      historical1958TournamentCheck.roundHeadings.join("|") === "Quarter-finals|Semi-finals|Final" &&
      historical1958TournamentCheck.matchCount === 8 &&
      !historical1958TournamentCheck.matchNumbers.includes("7") &&
      !historical1958TournamentCheck.matchNumbers.includes("20") &&
      !historical1958TournamentCheck.matchNumbers.includes("27") &&
      !historical1958TournamentCheck.progressText.includes("Group 1 Play-off") &&
      !historical1958TournamentCheck.progressText.includes("Group 3 Play-off") &&
      !historical1958TournamentCheck.progressText.includes("Group 4 Play-off") &&
      historical1958TournamentCheck.quarterFinalText.includes("France") &&
      historical1958TournamentCheck.quarterFinalText.includes("Northern Ireland") &&
      historical1958TournamentCheck.finalText.includes("Sweden") &&
      historical1958TournamentCheck.finalText.includes("Brazil"),
    `The 1958 archived Tournament tab should start at the quarter-finals and exclude group tie-breaker play-offs. Measured ${JSON.stringify(historical1958TournamentCheck)}.`
  );
  await page.goto(`${baseUrl}?view=matches&date=1958-06-19&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="wc-1958-1958-06-19-quarter-finals-france-northern-ireland"]');
  await page.locator('[data-match-id="wc-1958-1958-06-19-quarter-finals-france-northern-ireland"]').click();
  const historical1958QuarterFinalDetail = await page.locator("#match-info").evaluate((root) => {
    const sectionHeadings = [...root.querySelectorAll(":scope > .info-block")]
      .map((section) => section.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() || "")
      .filter(Boolean);

    return {
      previousHeading: sectionHeadings.find((heading) => heading.startsWith("Previous:")) || "",
      sectionHeadings,
      text: root.innerText
    };
  });
  assert(
    historical1958QuarterFinalDetail.previousHeading === "Previous: Group round" &&
      !historical1958QuarterFinalDetail.text.includes("Previous: Group 1 Play-off"),
    `The 1958 quarter-final detail should treat the group play-off as a group tie-breaker, not prior knockout context. Measured ${JSON.stringify(historical1958QuarterFinalDetail)}.`
  );
  await page.goto(`${baseUrl}?view=standings&standingsYear=1958&standingsMode=groups`, { waitUntil: "load" });
  await page.waitForSelector(".standings-card");
  const historical1958GroupAdvancementCheck = await page.evaluate(() => {
    const getAdvancing = (groupName) => {
      const card = [...document.querySelectorAll(".standings-card")].find(
        (item) => item.querySelector("h2")?.textContent.trim() === groupName
      );
      return [...(card?.querySelectorAll("tbody tr.is-advancing .standing-name") || [])]
        .map((team) => team.textContent.trim())
        .sort();
    };

    return {
      group1: getAdvancing("Group 1"),
      group2: getAdvancing("Group 2"),
      group3: getAdvancing("Group 3"),
      group4: getAdvancing("Group 4"),
      highlightedCount: document.querySelectorAll(".standings-card tbody tr.is-advancing").length
    };
  });
  assert(
    historical1958GroupAdvancementCheck.group1.join("|") === "Northern Ireland|West Germany" &&
      historical1958GroupAdvancementCheck.group2.join("|") === "France|Yugoslavia" &&
      historical1958GroupAdvancementCheck.group3.join("|") === "Sweden|Wales" &&
      historical1958GroupAdvancementCheck.group4.join("|") === "Brazil|Soviet Union" &&
      historical1958GroupAdvancementCheck.highlightedCount === 8,
    `The 1958 archived Groups tab should highlight the teams that actually reached the knockout bracket, including group-playoff winners only. Measured ${JSON.stringify(historical1958GroupAdvancementCheck)}.`
  );
  await page.goto(`${baseUrl}?view=standings&standingsYear=1954`, { waitUntil: "load" });
  await page.waitForSelector('.historical-tournament-view .progress-match[data-match-number="19"]');
  const historical1954TournamentCheck = await page.evaluate(() => {
    const progress = document.querySelector(".historical-tournament-view");
    const matchNumbers = [...document.querySelectorAll(".historical-tournament-view .progress-match")].map((match) =>
      match.getAttribute("data-match-number")
    );

    return {
      matchCount: matchNumbers.length,
      matchNumbers,
      progressText: progress?.textContent.replace(/\s+/g, " ").trim() || "",
      roundHeadings: [...document.querySelectorAll(".historical-tournament-view .progress-round h3")].map((heading) =>
        heading.textContent.trim()
      )
    };
  });
  assert(
    historical1954TournamentCheck.roundHeadings.join("|") === "Quarter-finals|Semi-finals|Final" &&
      historical1954TournamentCheck.matchCount === 8 &&
      !historical1954TournamentCheck.matchNumbers.includes("9") &&
      !historical1954TournamentCheck.matchNumbers.includes("18") &&
      !historical1954TournamentCheck.progressText.includes("Group 2 Play-off") &&
      !historical1954TournamentCheck.progressText.includes("Group 4 Play-off"),
    `The 1954 archived Tournament tab should also exclude group tie-breaker play-offs. Measured ${JSON.stringify(historical1954TournamentCheck)}.`
  );
  await page.goto(`${baseUrl}?view=standings&standingsYear=1954&standingsMode=groups`, { waitUntil: "load" });
  await page.waitForSelector(".standings-card");
  const historical1954GroupAdvancementCheck = await page.evaluate(() => {
    const getAdvancing = (groupName) => {
      const card = [...document.querySelectorAll(".standings-card")].find(
        (item) => item.querySelector("h2")?.textContent.trim() === groupName
      );
      return [...(card?.querySelectorAll("tbody tr.is-advancing .standing-name") || [])]
        .map((team) => team.textContent.trim())
        .sort();
    };

    return {
      group2: getAdvancing("Group 2"),
      group4: getAdvancing("Group 4"),
      highlightedCount: document.querySelectorAll(".standings-card tbody tr.is-advancing").length
    };
  });
  assert(
    historical1954GroupAdvancementCheck.group2.join("|") === "Hungary|West Germany" &&
      historical1954GroupAdvancementCheck.group4.join("|") === "England|Switzerland" &&
      historical1954GroupAdvancementCheck.highlightedCount === 8,
    `The 1954 archived Groups tab should highlight group-playoff winners without highlighting eliminated playoff losers. Measured ${JSON.stringify(historical1954GroupAdvancementCheck)}.`
  );
  await page.goto(`${baseUrl}?view=standings&standingsYear=1930&standingsMode=groups`, { waitUntil: "load" });
  await page.waitForSelector(".standings-card");
  const historical1930GroupAdvancementCheck = await page.evaluate(() => {
    const getAdvancing = (groupName) => {
      const card = [...document.querySelectorAll(".standings-card")].find(
        (item) => item.querySelector("h2")?.textContent.trim() === groupName
      );
      return [...(card?.querySelectorAll("tbody tr.is-advancing .standing-name") || [])]
        .map((team) => team.textContent.trim())
        .sort();
    };

    return {
      group1: getAdvancing("Group 1"),
      group2: getAdvancing("Group 2"),
      group3: getAdvancing("Group 3"),
      group4: getAdvancing("Group 4"),
      highlightedCount: document.querySelectorAll(".standings-card tbody tr.is-advancing").length
    };
  });
  assert(
    historical1930GroupAdvancementCheck.group1.join("|") === "Argentina" &&
      historical1930GroupAdvancementCheck.group2.join("|") === "Yugoslavia" &&
      historical1930GroupAdvancementCheck.group3.join("|") === "Uruguay" &&
      historical1930GroupAdvancementCheck.group4.join("|") === "United States" &&
      historical1930GroupAdvancementCheck.highlightedCount === 4,
    `The 1930 archived Groups tab should highlight only the single group winner that reached the semi-finals. Measured ${JSON.stringify(historical1930GroupAdvancementCheck)}.`
  );
  await page.goto(`${baseUrl}?view=standings&standingsYear=1978`, { waitUntil: "load" });
  await page.waitForSelector('.historical-tournament-view .progress-match[data-match-number="25"]');
  const historical1978TournamentCheck = await page.evaluate(() => {
    const matchText = (matchNumber) =>
      document
        .querySelector(`.historical-tournament-view .progress-match[data-match-number="${matchNumber}"]`)
        ?.textContent.replace(/\s+/g, " ")
        .trim() || "";

    return {
      finalGroupCardsWithPathData: document.querySelectorAll(
        '.historical-tournament-view .progress-round.is-final-group .progress-match[data-next-match], .historical-tournament-view .progress-round.is-final-group .progress-match[data-runner-up-next-match]'
      ).length,
      finalText: matchText(38),
      groupAOpeningText: matchText(25),
      groupBClosingText: matchText(36),
      matchCount: document.querySelectorAll(".historical-tournament-view .progress-match").length,
      resultPills: [...document.querySelectorAll(".historical-tournament-view .knockout-result-pill")].map((pill) =>
        pill.textContent.trim()
      ),
      roundHeadings: [...document.querySelectorAll(".historical-tournament-view .progress-round h3")].map((heading) =>
        heading.textContent.trim()
      ),
      summary: document.querySelector("#standings-summary")?.textContent.trim(),
      thirdPlaceText: matchText(37),
      tournamentPressed: document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed"),
      urlMode: new URL(window.location.href).searchParams.get("standingsMode") || ""
    };
  });
  assert(
    historical1978TournamentCheck.tournamentPressed === "true" &&
      historical1978TournamentCheck.urlMode === "" &&
      historical1978TournamentCheck.summary ===
        "Archived tournament view includes final-round groups and placement matches." &&
      historical1978TournamentCheck.roundHeadings.join("|") ===
        "Final round Group A|Final round Group B|Final" &&
      historical1978TournamentCheck.matchCount === 14 &&
      historical1978TournamentCheck.groupAOpeningText.includes("Italy") &&
      historical1978TournamentCheck.groupAOpeningText.includes("West Germany") &&
      historical1978TournamentCheck.groupBClosingText.includes("Poland") &&
      historical1978TournamentCheck.groupBClosingText.includes("Brazil") &&
      historical1978TournamentCheck.finalText.includes("Netherlands") &&
      historical1978TournamentCheck.finalText.includes("Argentina") &&
      historical1978TournamentCheck.thirdPlaceText.includes("Brazil") &&
      historical1978TournamentCheck.thirdPlaceText.includes("Italy") &&
      historical1978TournamentCheck.resultPills.includes("1-3") &&
      historical1978TournamentCheck.resultPills.includes("2-1") &&
      historical1978TournamentCheck.finalGroupCardsWithPathData === 0,
    `The 1978 archived Tournament tab should include the final-round groups plus placement matches, not only the two placement games. Measured ${JSON.stringify(historical1978TournamentCheck)}.`
  );
  await page.goto(`${baseUrl}?view=standings&standingsYear=1978&standingsMode=groups`, { waitUntil: "load" });
  await page.waitForSelector(".standings-card");
  const historical1978GroupAdvancementCheck = await page.evaluate(() => {
    const getAdvancing = (groupName) => {
      const card = [...document.querySelectorAll(".standings-card")].find(
        (item) => item.querySelector("h2")?.textContent.trim() === groupName
      );
      return [...(card?.querySelectorAll("tbody tr.is-advancing .standing-name") || [])]
        .map((team) => team.textContent.trim())
        .sort();
    };

    return {
      finalGroupA: getAdvancing("Group A"),
      finalGroupB: getAdvancing("Group B"),
      group1: getAdvancing("Group 1"),
      highlightedCount: document.querySelectorAll(".standings-card tbody tr.is-advancing").length
    };
  });
  assert(
    historical1978GroupAdvancementCheck.group1.join("|") === "Argentina|Italy" &&
      historical1978GroupAdvancementCheck.finalGroupA.join("|") === "Italy|Netherlands" &&
      historical1978GroupAdvancementCheck.finalGroupB.join("|") === "Argentina|Brazil" &&
      historical1978GroupAdvancementCheck.highlightedCount === 12,
    `The 1978 archived Groups tab should highlight first-stage advancers and final-round teams that reached placement matches. Measured ${JSON.stringify(historical1978GroupAdvancementCheck)}.`
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
  const predictionOutcomeLabels = await page
    .locator("#match-info .prediction-row")
    .evaluateAll((rows) => rows.map((row) => row.textContent.replace(/\s+/g, " ").trim()));
  assert(
    predictionOutcomeLabels.some((label) => /^Tie\b/.test(label)) &&
      predictionOutcomeLabels.every((label) => !/^Draw\b/.test(label)),
    `Prediction rows should use Tie instead of Draw. Measured ${JSON.stringify(predictionOutcomeLabels)}.`
  );
  const matchInfoStandingHeaders = await page
    .locator("#match-info .standings-table th")
    .evaluateAll((headers) => headers.map((header) => header.textContent.replace(/\s+/g, " ").trim()));
  assert(
    matchInfoStandingHeaders.includes("W-T-L") && !matchInfoStandingHeaders.includes("W-D-L"),
    `Standing headers should use W-T-L instead of W-D-L in English. Measured ${JSON.stringify(matchInfoStandingHeaders)}.`
  );
  const mobileInfoHeadingAlignment = await page.locator("#match-info .info-heading").evaluateAll((headings) => {
    const center = (rect) => (rect.top + rect.bottom) / 2;

    return headings
      .map((heading) => {
        const label = heading.querySelector("span:not(.visually-hidden)");
        const control = heading.querySelector(".info-tooltip-button");

        if (!label || !control) {
          return null;
        }

        const labelRect = label.getBoundingClientRect();
        const controlRect = control.getBoundingClientRect();

        return {
          delta: center(controlRect) - center(labelRect),
          text: label.textContent.replace(/\s+/g, " ").trim()
        };
      })
      .filter(Boolean);
  });
  assert(
    mobileInfoHeadingAlignment.some((item) => item.text === "Prediction" && Math.abs(item.delta) <= 0.75) &&
      mobileInfoHeadingAlignment
        .filter((item) => item.text === "Result" || item.text === "Prediction")
        .every((item) => Math.abs(item.delta) <= 0.75),
    `Mobile info-card heading controls should be vertically centered with their labels. Measured ${JSON.stringify(mobileInfoHeadingAlignment)}.`
  );
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
  const touchCatchUpOpenState = await touchPage.locator("#catch-up-button").evaluate((button) => {
    button.click();
    const popover = document.querySelector("#catch-up-popover");
    const list = document.querySelector("#catch-up-list");

    return {
      expanded: button.getAttribute("aria-expanded"),
      hidden: popover?.classList.contains("is-hidden"),
      loadingItems: list?.querySelectorAll(".catch-up-loading-item").length || 0,
      realItems: list?.querySelectorAll(".catch-up-item:not(.catch-up-loading-item)").length || 0
    };
  });
  assert(
    touchCatchUpOpenState.expanded === "true" &&
      touchCatchUpOpenState.hidden === false &&
      touchCatchUpOpenState.loadingItems === 3 &&
      touchCatchUpOpenState.realItems === 0,
    `On touch devices, opening catch-up should show the skeleton immediately. Measured ${JSON.stringify(touchCatchUpOpenState)}.`
  );
  await waitForCatchUpItems(touchPage);
  await touchPage.locator("#catch-up-button").click();
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

  await touchPage.goto(`${baseUrl}?view=standings&standingsMode=tournament&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await touchPage.waitForFunction(
    () =>
      document.querySelectorAll(".progress-connectors path").length >= 29 &&
      document.querySelector(".progress-match[data-open-match-id] .knockout-likelihood[data-tooltip]")
  );
  const touchTournamentOddsPill = touchPage
    .locator(".progress-match[data-open-match-id] .knockout-likelihood[data-tooltip]")
    .first();
  await touchTournamentOddsPill.evaluate((pill) => {
    pill.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerType: "touch"
      })
    );
  });
  await touchPage.waitForFunction(() => {
    const pill = document.querySelector(".knockout-likelihood.is-touch-tooltip-open");
    return pill && Number(getComputedStyle(pill, "::after").opacity) > 0.8;
  });
  const touchTournamentTooltipOpen = await touchPage.evaluate(() => {
    const params = new URL(window.location.href).searchParams;
    const pill = document.querySelector(".knockout-likelihood.is-touch-tooltip-open");

    return {
      activeText: pill?.textContent.replace(/\s+/g, " ").trim() || "",
      activeTooltip: pill?.getAttribute("data-tooltip") || "",
      match: params.get("match") || "",
      selectedMatches: document.querySelector("#matches-tab")?.getAttribute("aria-selected") || "",
      selectedStandings: document.querySelector("#standings-tab")?.getAttribute("aria-selected") || "",
      view: params.get("view") || ""
    };
  });
  assert(
    touchTournamentTooltipOpen.activeText &&
      touchTournamentTooltipOpen.activeTooltip &&
      touchTournamentTooltipOpen.view === "standings" &&
      touchTournamentTooltipOpen.match === "" &&
      touchTournamentTooltipOpen.selectedStandings === "true" &&
      touchTournamentTooltipOpen.selectedMatches === "false",
    `On touch devices, tapping a tournament odds tooltip should not open the parent match card. Measured ${JSON.stringify(touchTournamentTooltipOpen)}.`
  );
  await touchPage.locator("#standings-heading").tap();
  await touchPage.waitForFunction(() => !document.querySelector(".is-touch-tooltip-open"));
  const touchTournamentTooltipClosed = await touchPage.evaluate(() => {
    const params = new URL(window.location.href).searchParams;

    return {
      activeTooltipCount: document.querySelectorAll(".is-touch-tooltip-open").length,
      focusedTooltip: Boolean(document.activeElement?.matches?.(".knockout-likelihood[data-tooltip]")),
      match: params.get("match") || "",
      view: params.get("view") || ""
    };
  });
  assert(
    touchTournamentTooltipClosed.activeTooltipCount === 0 &&
      !touchTournamentTooltipClosed.focusedTooltip &&
      touchTournamentTooltipClosed.view === "standings" &&
      touchTournamentTooltipClosed.match === "",
    `On touch devices, tapping outside an open tournament odds tooltip should close it without navigating. Measured ${JSON.stringify(touchTournamentTooltipClosed)}.`
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
