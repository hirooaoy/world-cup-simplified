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
          row.querySelectorAll(".match-teams .team-name-start-lock, .match-teams .team-name-rank-lock, .match-teams .versus")
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

function formatExpectedThirdPlaceCandidateSummary(candidate) {
  return `${formatStandingPoints(candidate.pts)}, ${formatGoalDifference(candidate.gd)} goal difference, ${formatGoalsScored(candidate.gf)}`;
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

  if (candidate.isEliminated) {
    return { kind: "eliminated", label: "Eliminated" };
  }

  if (candidate.isCutLineTie) {
    return { kind: "pending", label: "Tiebreak pending" };
  }

  if (isInside && candidate.position >= advancerCount - 1) {
    return { kind: "bubble-in", label: "Just inside" };
  }

  if (isInside) {
    return { kind: "in", label: "Advancing now" };
  }

  if (candidate.position === advancerCount + 1) {
    return { kind: "first-out", label: "Just outside" };
  }

  return { kind: "out", label: "Outside now" };
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

    return {
      ...candidate,
      status: getExpectedThirdPlaceStatus(candidate, advancerCount)
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

function getExpectedThirdPlaceReason(candidate, rows = getExpectedThirdPlaceRaceRows()) {
  const summary = `Currently ${formatOrdinal(candidate.position)} in the third-place race: ${formatExpectedThirdPlaceCandidateSummary(candidate)}.`;

  if (candidate.status?.kind === "eliminated" || candidate.isEliminated) {
    return "No remaining group result combination can move this team into a Round of 32 place.";
  }

  if (candidate.isCutLineTie) {
    return `${summary} Top-8 place is tied from ${formatOrdinal(candidate.tieGroupStart)}-${formatOrdinal(candidate.tieGroupEnd)}; fair-play data is pending.`;
  }

  const nearestCandidate = getExpectedThirdPlaceComparisonTarget(candidate, rows);

  if (!nearestCandidate) {
    return summary;
  }

  if (candidate.isUnresolvedTie && getThirdPlaceTieSignature(candidate) === getThirdPlaceTieSignature(nearestCandidate)) {
    const action = candidate.position <= getThirdPlaceAdvancerCount() ? "stay top 8" : "make the top 8";
    return `${summary} To ${action}, the tie with ${nearestCandidate.team.name} (${formatOrdinal(nearestCandidate.position)}) is still unresolved on loaded points, goal difference and goals scored; fair-play data is pending.`;
  }

  const isInside = candidate.position <= getThirdPlaceAdvancerCount();
  const action = isInside ? "stay top 8, keep ahead of" : "make the top 8, move ahead of";
  const decider = getExpectedThirdPlaceComparisonDecider(candidate, nearestCandidate);
  return `${summary} To ${action} ${nearestCandidate.team.name} (${formatOrdinal(nearestCandidate.position)}) on ${decider.label}: ${decider.candidateValue} vs ${decider.targetValue}.`;
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

function isGroupStageFinished() {
  const groupFixtures = fixturesData.fixtures.filter((fixture) => fixture.stage === "group");
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

  for (const group of tournamentData.groups || []) {
    const rows = standingsData.groups?.[group.id] || [];

    for (const row of rows) {
      if (isExpectedTeamEliminatedFromGroupStage(row.teamId, group)) {
        eliminated.push(getTeam(row.teamId).name);
      }
    }
  }

  return eliminated.sort();
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
  await mockedPage.waitForSelector(path.includes("view=standings") ? ".standings-card" : ".match-row", {
    state: "attached"
  });

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
      tournamentLoadingState.loadingCards === 31 &&
      tournamentLoadingState.realCards === 0,
    "Direct tournament standings loads should show a bracket-shaped skeleton while standings data is loading."
  );
  releaseTournamentStandings();
  await tournamentLoadingPage.waitForFunction(
    () =>
      document.querySelectorAll(".progress-match:not(.tournament-loading-match)").length === 31 &&
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
    .evaluate((link) => getComputedStyle(link).textDecorationLine);
  const scorerPlayerDecorationStyle = await page
    .locator("#match-info .scorer-highlight .player-link")
    .first()
    .evaluate((link) => getComputedStyle(link).textDecorationStyle);
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
        (flag) => flag.hasFlag && flag.flagBeforeMinute && flag.verticalDelta <= 4
      ),
    `Scorer highlights should replace the standalone soccer ball with country flags before each scorer minute. Measured ${JSON.stringify(scorerHighlightMetrics)}.`
  );
  assert(
    scorerPlayerDecoration === "underline" && scorerPlayerDecorationStyle === "dotted",
    "Scorer player mentions should use the same soft dotted underline as paragraph mentions."
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

  await page.goto(`${baseUrl}?view=matches&date=2026-06-25&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="japan-sweden-2026-06-25"]').click();
  const japanSwedenChineseInfo = await page.locator(".key-info-team").first().locator("p").innerText();
  assert(
    japanSwedenChineseInfo.includes("上田绮世") &&
      japanSwedenChineseInfo.includes("对阵瑞典") &&
      !/Takefusa Kubo|久保建英|Ayase Ueda/.test(japanSwedenChineseInfo),
    "Chinese Japan key information should carry the non-Kubo Japan trio forward against Sweden."
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
        rowHeight: row.getBoundingClientRect().height,
        scrollOverflow: row.scrollWidth - row.clientWidth,
        teamsHeight: teamsBox.height,
        text: row.innerText.replace(/\s+/g, " ").trim()
      };
    });
  assert(
    midWidthCompletedRowMetrics.text.startsWith("3:00PM Scotland #42 vs") &&
      midWidthCompletedRowMetrics.teamsHeight <= midWidthCompletedRowMetrics.lineHeight * 1.25 &&
      midWidthCompletedRowMetrics.gapToScore >= 16 &&
      midWidthCompletedRowMetrics.rowHeight <= 32 &&
      midWidthCompletedRowMetrics.scrollOverflow <= 1,
    `Completed mid-width rows should use available space instead of wrapping before the away team. Measured ${JSON.stringify(midWidthCompletedRowMetrics)}.`
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-24&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  const openMatchDetailById = async (matchId, expectedSummaryText) => {
    await page.locator(`[data-match-id="${matchId}"]`).first().evaluate((row) => row.click());
    await page.locator("#match-info .summary-title", { hasText: expectedSummaryText }).waitFor();
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
  await openMatchDetailById("morocco-haiti-2026-06-24", "Haiti");
  const readHaitiStandingBadgeLayout = () =>
    page.locator("#match-info .standing-team", { hasText: "Haiti" }).evaluate((team) => {
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
        name: rect(team.querySelector(".standing-name")),
        badgeRow: rect(team.querySelector(".standing-badge-row")),
        rank: rect(team.querySelector(".rank-pill")),
        eliminated: rect(team.querySelector(".standing-status-pill.is-eliminated"))
      };
    });
  const haitiWideBadgeLayout = await readHaitiStandingBadgeLayout();
  assert(
    haitiWideBadgeLayout.name &&
      haitiWideBadgeLayout.rank &&
      haitiWideBadgeLayout.eliminated &&
      Math.abs(haitiWideBadgeLayout.name.top - haitiWideBadgeLayout.rank.top) <= 3 &&
      Math.abs(haitiWideBadgeLayout.name.top - haitiWideBadgeLayout.eliminated.top) <= 3,
    `Short eliminated standings rows should keep the name, ranking, and status on one line when space allows. Measured ${JSON.stringify(haitiWideBadgeLayout)}.`
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-24&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await openMatchDetailById("morocco-haiti-2026-06-24", "Haiti");
  const haitiMobileBadgeLayout = await readHaitiStandingBadgeLayout();
  assert(
    haitiMobileBadgeLayout.name &&
      haitiMobileBadgeLayout.rank &&
      haitiMobileBadgeLayout.eliminated &&
      haitiMobileBadgeLayout.badgeRow &&
      haitiMobileBadgeLayout.rank.left >= haitiMobileBadgeLayout.badgeRow.left &&
      Math.abs(haitiMobileBadgeLayout.rank.top - haitiMobileBadgeLayout.eliminated.top) <= 3 &&
      haitiMobileBadgeLayout.name.top < haitiMobileBadgeLayout.rank.top,
    `Short eliminated standings rows should wrap the rank and status together on narrow screens. Measured ${JSON.stringify(haitiMobileBadgeLayout)}.`
  );
  await page.goto(`${baseUrl}?view=matches&date=2026-06-25&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
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
  await page.goto(`${baseUrl}?view=standings`, { waitUntil: "load" });
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
      segmentFlags: segments.map((segment) => segment.querySelector(".goal-scorer-flag .flag")?.getAttribute("aria-label") || ""),
      segmentTexts: segments.map((segment) => segment.textContent.replace(/\s+/g, " ").trim())
    };
  });
  assert(
    !historicalScorerHighlight.hasStandaloneSoccerIcon &&
      historicalScorerHighlight.segmentFlags.every((label) => label === "Ecuador flag") &&
      historicalScorerHighlight.segmentTexts.some((text) => text.includes("16' Enner Valencia")) &&
      historicalScorerHighlight.segmentTexts.some((text) => text.includes("31' Enner Valencia")),
    "Historical result details should show country flags before archived scorer names and minutes."
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
    bosniaScoreAlignment.hasWrappedClass &&
      bosniaScoreAlignment.metaGapFromText >= 8 &&
      bosniaScoreAlignment.metaGapFromText <= 28 &&
      bosniaScoreAlignment.scoreRightGap >= 40 &&
      bosniaScoreAlignment.rowScrollOverflow <= 1,
    `Wrapped tablet match rows should place score pills just after the wrapped matchup instead of at the far edge. Measured ${JSON.stringify(bosniaScoreAlignment)}.`
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
      bosniaMatchWrap.scoreRightGap >= 8 &&
      !bosniaMatchWrap.hasTooltip,
    `Long match row names should wrap visibly instead of becoming tooltip-only truncation. Measured ${JSON.stringify(bosniaMatchWrap)}.`
  );
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
      liveFallbackLayout.statusRightGap >= 4,
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
    return {
      advancingCount: document.querySelectorAll(".standings-card tbody tr.is-advancing").length,
      advancementPillCount: document.querySelectorAll(".advancement-pill").length
    };
  });
  assert(
    currentStandingsMarkerCheck.advancingCount === 0,
    "The current 2026 standings should not mark provisional advancing teams."
  );
  assert(
    currentStandingsMarkerCheck.advancementPillCount === 0,
    "The current 2026 standings should not show Round of 32 markers."
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
      getExpectedThirdPlaceReason(expectedGroupBThirdPlaceCandidate, getExpectedThirdPlaceRaceRows()),
    "Group standings third-place race pills should explain the cross-group rank on hover."
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
    "2026-06-25T23:30:00.000Z",
    "/?view=standings&tz=America%2FLos_Angeles"
  );
  await scheduledLiveWindowCheck.page.waitForSelector('.standings-card[data-group-id="F"] .standing-team');
  const groupFScheduledWindowRows = await scheduledLiveWindowCheck.page.evaluate(() =>
    [...document.querySelectorAll('.standings-card[data-group-id="F"] tbody tr')].map((row) => ({
      live: row.querySelector(".standing-live-pill")?.textContent.trim() || "",
      race: row.querySelector(".third-place-pill")?.textContent.trim() || "",
      team: row.querySelector(".standing-name")?.textContent.trim() || ""
    }))
  );
  assert(
    groupFScheduledWindowRows.some(
      (row) => row.team === "Sweden" && row.race.startsWith("3rd race") && row.live === "Live"
    ) &&
      groupFScheduledWindowRows
        .filter((row) => row.team !== "Sweden")
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
    thirdPlaceScheduledWindowRows.some((row) => row.team === "Sweden" && row.live === "Live"),
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
    thirdPlaceRaceCheck.headers.includes("Goals") && !thirdPlaceRaceCheck.headers.includes("GF"),
    "The third-place race should use the short Goals label instead of GF jargon."
  );
  assert(
    thirdPlaceRaceCheck.visibleReasonCount === 0 &&
      thirdPlaceRaceCheck.rowSummaries.every((row) => row.tooltip && !row.tooltip.includes("GF")) &&
      thirdPlaceRaceCheck.rowSummaries.some((row) =>
        /^To (stay top 8|make the top 8)/.test(
          row.tooltip.replace(/^Currently \d+(?:st|nd|rd|th) in the third-place race: .*?\. /, "")
        )
      ),
    "The third-place race should hide top-eight explanations behind status pill tooltips without GF jargon."
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
    thirdPlaceRaceCheck.rowSummaries.some((row) => row.status === "Just inside") &&
      thirdPlaceRaceCheck.rowSummaries.every((row) => row.status !== "Bubble in"),
    "The third-place race should use plain edge-of-cut-line status copy."
  );
  assert(
    expectedCutLineInside &&
      expectedFirstOut &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount() - 1]?.team === expectedCutLineInside.team.name &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount() - 1]?.status === expectedCutLineInside.status.label &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount() - 1]?.tooltip ===
        getExpectedThirdPlaceReason(expectedCutLineInside, expectedThirdPlaceRaceRows) &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount()]?.team === expectedFirstOut.team.name &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount()]?.status === expectedFirstOut.status.label &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount()]?.tooltip ===
        getExpectedThirdPlaceReason(expectedFirstOut, expectedThirdPlaceRaceRows),
    "A cut-line tie without loaded fair-play data should be marked pending on both sides of the line."
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
    !new URL(page.url()).searchParams.has("standingsMode") &&
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
    !new URL(page.url()).searchParams.has("standingsMode"),
    "Clicking a race table group should leave the URL on the default Groups section."
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
  await page.waitForFunction(() => document.querySelectorAll(".progress-connectors path").length >= 30);
  assert(
    new URL(page.url()).searchParams.get("standingsMode") === "tournament",
    "The tournament section should be linkable from the URL."
  );
  const tournamentCheck = await page.evaluate(() => {
    const text = (selector) => document.querySelector(selector)?.textContent.replace(/\s+/g, " ").trim() || "";
    const allText = (selector) =>
      [...document.querySelectorAll(selector)]
        .map((element) => element.textContent.replace(/\s+/g, " ").trim())
        .join(" ");

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
      m104TeamIds: [...document.querySelectorAll('.progress-match[data-match-number="104"] .knockout-team[data-team-id]')]
        .map((element) => element.dataset.teamId),
      oldWinnerCopy: allText(".tournament-view").includes(["Winner", "advances"].join(" ")),
      posterMetaCount: document.querySelectorAll(".poster-match-meta").length,
      posterSeedCount: document.querySelectorAll(".poster-team-seed").length,
      posterVisible: Boolean(document.querySelector(".tournament-poster-bracket")),
      progressCount: document.querySelectorAll(".progress-match").length,
      connectorPathCount: document.querySelectorAll(".progress-connectors path").length,
      progressText: allText(".progress-match"),
      projectedCount: document.querySelectorAll(".progress-match.is-projected").length,
      likelihoodCount: document.querySelectorAll(".knockout-likelihood").length,
      likelihoodListCount: document.querySelectorAll(".knockout-likelihood-list").length,
      likelihoodText: allText(".knockout-likelihood"),
      likelihoodTooltips: [...document.querySelectorAll(".knockout-likelihood")]
        .map((element) => element.getAttribute("data-tooltip") || "")
        .join(" "),
      likelihoodTooltipCount: [...document.querySelectorAll(".knockout-likelihood")]
        .filter((element) => /^Prediction based on /.test(element.getAttribute("data-tooltip") || ""))
        .length,
      m89PillCount: document.querySelectorAll('.progress-match[data-match-number="89"] .knockout-likelihood').length,
      m89SeedLabelCount: document.querySelectorAll('.progress-match[data-match-number="89"] .knockout-team-copy small').length,
      m97PillCount: document.querySelectorAll('.progress-match[data-match-number="97"] .knockout-likelihood').length,
      m97SeedLabelCount: document.querySelectorAll('.progress-match[data-match-number="97"] .knockout-team-copy small').length,
      m104PillCount: document.querySelectorAll('.progress-match[data-match-number="104"] .knockout-likelihood').length,
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
      tournamentCheck.connectorPathCount >= 30 &&
      tournamentCheck.progressCount === 31,
    "The tournament section should show a progression-only bracket from the Round of 32 through the final."
  );
  const groupETopTeam = getTeam(standingsData.groups?.E?.[0]?.teamId);
  const groupETopTeamName = groupETopTeam.standingName || groupETopTeam.name;
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
      tournamentCheck.slotOddsCount >= 16 &&
      tournamentCheck.slotOddsToneMismatches.length === 0 &&
      tournamentCheck.slotOddsText.includes("here") &&
      tournamentCheck.projectedCount === 15 &&
      tournamentCheck.likelihoodCount === 30 &&
      tournamentCheck.likelihoodTooltipCount === tournamentCheck.likelihoodCount &&
      tournamentCheck.likelihoodListCount === 15 &&
      tournamentCheck.m89PillCount === 2 &&
      tournamentCheck.m89SeedLabelCount === 0 &&
      tournamentCheck.m97PillCount === 2 &&
      tournamentCheck.m97SeedLabelCount === 0 &&
      tournamentCheck.m104PillCount === 2 &&
      tournamentCheck.m89TeamIds.length === 2 &&
      tournamentCheck.m97TeamIds.length === 2 &&
      tournamentCheck.m104TeamIds.length === 2 &&
      tournamentCheck.likelihoodText.includes("here") &&
      !tournamentCheck.likelihoodText.includes("Germany ") &&
      !tournamentCheck.slotOddsText.includes("Germany ") &&
      !tournamentCheck.slotOddsText.includes("Bosnia and Herzegovina ") &&
      tournamentCheck.rankCount >= 32 &&
      !/\bGroup [A-L]\d\b/.test(tournamentCheck.m89Text) &&
      !/\bGroup [A-L]\d\b/.test(tournamentCheck.m97Text) &&
      tournamentCheck.m89Tooltips.includes("Prediction based on") &&
      tournamentCheck.m97Tooltips.includes("Prediction based on") &&
      tournamentCheck.likelihoodTooltips.includes("Prediction based on") &&
      !tournamentCheck.m89Text.includes("TBD") &&
      !tournamentCheck.m97Text.includes("TBD") &&
      !tournamentCheck.m89Text.includes("Likely for now") &&
      !tournamentCheck.m97Text.includes("Likely for now") &&
      !tournamentCheck.sectionHeadingVisible &&
      !tournamentCheck.oldWinnerCopy &&
      tournamentCheck.posterMetaCount === 0 &&
      tournamentCheck.posterSeedCount === 0 &&
      tournamentCheck.thirdPlaceSeedTeamIds.length === getThirdPlaceAdvancerCount() &&
      new Set(tournamentCheck.thirdPlaceSeedTeamIds).size === tournamentCheck.thirdPlaceSeedTeamIds.length &&
      !/\bWinner match \d+\b/.test(tournamentCheck.progressText) &&
      !/\b(?:M\d+|To M\d+|Winner M\d+|W M\d+)\b/.test(`${tournamentCheck.r32Text} ${tournamentCheck.progressText}`) &&
      tournamentCheck.roundHeadings.join("|") === "Round of 32|Round of 16|Quarter-finals|Semi-finals|Final",
    `The tournament section should show unique Round of 32 third-place slot picks and muted predictions for later rounds. Measured ${JSON.stringify(tournamentCheck)}.`
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
        const match74SlotList = match74?.querySelector(".knockout-slot-odds-list");
        const match74SlotListStyle = match74SlotList ? getComputedStyle(match74SlotList) : null;
        const match74SlotPills = [...(match74?.querySelectorAll(".knockout-slot-odds") || [])];
        const firstSlotPillRect = match74SlotPills[0]?.getBoundingClientRect();
        const secondSlotPillRect = match74SlotPills[1]?.getBoundingClientRect();
        const seedLabels = [...document.querySelectorAll('.progress-match .knockout-team-copy small')]
          .map((label) => label.textContent.trim());
        const match74SlotTooltips = [...document.querySelectorAll('.progress-match[data-match-number="74"] .knockout-slot-odds')]
          .map((pill) => pill.getAttribute("data-tooltip") || "");
        const match74SlotLabels = [...document.querySelectorAll('.progress-match[data-match-number="74"] .knockout-slot-odds')]
          .map((pill) => pill.dataset.slotLabel || "");
        const connector = document.querySelector(".progress-connectors");
        const connectorDisplay = connector ? getComputedStyle(connector).display : "";
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
          connectorPathCount: document.querySelectorAll(".progress-connectors path").length,
          match74PairJustifyContent: match74PairStyle?.justifyContent || "",
          match74SlotGap: firstSlotPillRect && secondSlotPillRect ? Math.round(secondSlotPillRect.left - firstSlotPillRect.right) : null,
          match74SlotListJustifyContent: match74SlotListStyle?.justifyContent || "",
          match74SlotLabels,
          match74SlotTooltips,
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
        check.match74SlotLabels.includes("Group E1") &&
        check.match74SlotTooltips.some((tooltip) => tooltip.includes("Group E1")) &&
        check.match74SlotListJustifyContent === "flex-start" &&
        check.match74SlotGap !== null &&
        check.match74SlotGap >= 0 &&
        check.match74SlotGap <= 16 &&
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
          : check.cardWidth >= check.progressionContentWidth - 4) &&
        check.progressionPadding >= 10 &&
        check.cardPadding >= 8 &&
        check.cardWithinViewport &&
        (check.viewportWidth > 1250 ||
          (check.connectorDisplay === "none" && check.connectorPathCount === 0))
    ),
    `Tournament bracket seed context should live in odds pills, with correct padding and no horizontal overflow at phone and desktop sizes. Measured ${JSON.stringify(tournamentLayoutChecks)}.`
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
      mobileRowMetrics.rankCount >= 1,
    "Mobile match rows should keep compact time/team text with ranking pills visible."
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
      mobileCompletedHoverMetrics.rowRightGap >= 4 &&
      mobileCompletedHoverMetrics.layoutRightGap >= 4 &&
      mobileCompletedHoverMetrics.rowScrollOverflow <= 1 &&
      mobileCompletedHoverMetrics.scoreRightOverflow <= 1,
    `Hovered mobile completed rows should not nudge score pills into the clipped edge. Measured ${JSON.stringify(mobileCompletedHoverMetrics)}.`
  );
  const southAfricaSouthKoreaRowMetrics = await page
    .locator('[data-match-id="south-africa-south-korea-2026-06-24"]')
    .evaluate((row) => {
      const rowRect = row.getBoundingClientRect();
      const starts = Array.from(row.querySelectorAll(".team-name-start-lock")).map((lock) => {
        const rect = lock.getBoundingClientRect();

        return {
          text: lock.textContent.replace(/\s+/g, " ").trim(),
          right: rect.right,
          top: rect.top
        };
      });
      const locks = Array.from(row.querySelectorAll(".team-name-rank-lock")).map((lock) => {
        const rect = lock.getBoundingClientRect();

        return {
          text: lock.textContent.replace(/\s+/g, " ").trim(),
          right: rect.right,
          top: rect.top
        };
      });

      return {
        hasKoreaStartLock: starts.some((lock) => lock.text.replace(/\s+/g, "") === "🇰🇷South"),
        hasKoreaRankLock: locks.some((lock) => lock.text === "Korea #25"),
        lockRightOverflow: Math.max(
          0,
          ...starts.map((lock) => lock.right - rowRect.right),
          ...locks.map((lock) => lock.right - rowRect.right)
        ),
        scrollOverflow: row.scrollWidth - row.clientWidth,
        text: row.innerText.replace(/\s+/g, " ").trim()
      };
    });
  assert(
    southAfricaSouthKoreaRowMetrics.text.startsWith("6:00PM") &&
      southAfricaSouthKoreaRowMetrics.hasKoreaStartLock &&
      southAfricaSouthKoreaRowMetrics.hasKoreaRankLock &&
      southAfricaSouthKoreaRowMetrics.lockRightOverflow <= 1 &&
      southAfricaSouthKoreaRowMetrics.scrollOverflow <= 1,
    `South Africa vs South Korea should keep the flag with South and Korea #25 together without clipping. Measured ${JSON.stringify(southAfricaSouthKoreaRowMetrics)}.`
  );
  const mobileRankAlignmentMetrics = await page
    .locator('[data-match-id="switzerland-canada-2026-06-24"]')
    .evaluate((row) =>
      Array.from(row.querySelectorAll(".team-name-rank-lock")).map((lock) => {
        const pill = lock.querySelector(".rank-pill");
        const pillRect = pill?.getBoundingClientRect();
        const textNode = Array.from(lock.childNodes).find(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
        );

        if (!pillRect || !textNode) {
          return {
            centerDelta: Number.POSITIVE_INFINITY,
            text: lock.textContent.replace(/\s+/g, " ").trim()
          };
        }

        const range = document.createRange();
        range.selectNodeContents(textNode);
        const textRect = range.getBoundingClientRect();

        return {
          centerDelta: Math.abs(
            pillRect.top + pillRect.height / 2 - (textRect.top + textRect.height / 2)
          ),
          text: lock.textContent.replace(/\s+/g, " ").trim()
        };
      })
    );
  assert(
    mobileRankAlignmentMetrics.length >= 2 &&
      mobileRankAlignmentMetrics.every((metric) => metric.centerDelta <= 1.25),
    `Match row rank pills should be vertically centered with country text. Measured ${JSON.stringify(mobileRankAlignmentMetrics)}.`
  );
  await page.locator('[data-match-id="bosnia-qatar-2026-06-24"]').click();
  await page.waitForSelector("#match-info .info-tooltip-button");
  const mobileTooltipBounds = await page.evaluate(() => {
    const selectors = [
      ".info-tooltip-button[data-tooltip]",
      ".standing-help[data-tooltip]",
      ".standing-team.has-name-tooltip[data-tooltip]",
      ".prediction-row.has-label-tooltip[data-tooltip]",
      ".past-record-row.has-label-tooltip[data-tooltip]",
      ".team.has-team-tooltip[data-tooltip]",
      ".summary-team.has-team-tooltip[data-tooltip]",
      ".live-pill[data-tooltip]",
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
