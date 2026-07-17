#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const timeZone = process.env.WORLD_CUP_TZ || "America/Los_Angeles";
const now = process.env.MATCHDAY_NOW ? new Date(process.env.MATCHDAY_NOW) : new Date();
const statusStaleHours = Number(process.env.MATCHDAY_STATUS_STALE_HOURS || 2.25);
const delayedStatusStaleHours = Number(process.env.MATCHDAY_DELAYED_STATUS_STALE_HOURS || 6);
const knockoutLiveStatusStaleHours = Number(process.env.MATCHDAY_KNOCKOUT_LIVE_STATUS_STALE_HOURS || 3.5);
const marketFreshHours = Number(process.env.MATCHDAY_MARKET_FRESH_HOURS || 24);
const contextFreshHours = Number(process.env.MATCHDAY_CONTEXT_FRESH_HOURS || 72);
const squadFreshHours = Number(process.env.MATCHDAY_SQUAD_FRESH_HOURS || 24);
const matchupResearchFreshHours = Number(process.env.MATCHDAY_MATCHUP_RESEARCH_FRESH_HOURS || 24);
const lineupPreviewFreshHours = Number(process.env.MATCHDAY_LINEUP_PREVIEW_FRESH_HOURS || 24);
const lineupResearchRequiredHours = Number(process.env.MATCHDAY_LINEUP_RESEARCH_REQUIRED_HOURS || 72);
const lineupPlanningHorizonHours = Number(process.env.MATCHDAY_LINEUP_PLANNING_HORIZON_HOURS || 168);
const editorialWarnOnly = /^(1|true|yes)$/i.test(process.env.MATCHDAY_EDITORIAL_WARN_ONLY || "");

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

async function readOptionalJson(fileName, fallback) {
  try {
    return await readJson(fileName);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

function getDayKey(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(dayKey, days) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone
  }).format(date);
}

function hoursBetween(later, earlier) {
  return (later.getTime() - earlier.getTime()) / 36e5;
}

function sourceAgeHours(source) {
  const checkedAt = new Date(source?.checkedAt || "");
  return Number.isNaN(checkedAt.getTime()) ? Infinity : hoursBetween(now, checkedAt);
}

function teamName(teamsById, teamId) {
  return teamsById.get(teamId)?.name || teamId || "TBD";
}

function fixtureName(fixture, teamsById) {
  const home = fixture.homeTeamId ? teamName(teamsById, fixture.homeTeamId) : fixture.homeSlot || "TBD";
  const away = fixture.awayTeamId ? teamName(teamsById, fixture.awayTeamId) : fixture.awaySlot || "TBD";
  return `${home} vs ${away}`;
}

function fixtureSourceIds(fixture) {
  const activeProjectionSourceIds =
    Array.isArray(fixture.projection?.sourceIds) && fixture.projection.sourceIds.length
      ? fixture.projection.sourceIds
      : [fixture.projection?.sourceId];
  const conditionalProjectionSourceIds = fixture.projection
    ? []
    : (fixture.conditionalProjections || []).flatMap((projection) => projection.sourceIds || []);

  return [
    ...activeProjectionSourceIds,
    ...conditionalProjectionSourceIds,
    fixture.keyPlayers?.sourceId,
    fixture.keyInformation?.sourceId,
    ...(fixture.keyInformation?.researchSourceIds || []),
    fixture.h2h?.sourceId,
    fixture.h2h?.aggregateSourceId
  ].filter(Boolean);
}

function isKnockoutFixture(fixture) {
  return fixture.stage && fixture.stage !== "group";
}

function liveStatusStaleHours(fixture) {
  return isKnockoutFixture(fixture)
    ? Math.max(statusStaleHours, knockoutLiveStatusStaleHours)
    : statusStaleHours;
}

function sourceThresholdHours(source) {
  if (!source) {
    return contextFreshHours;
  }

  if (String(source.type || "").includes("market")) {
    return marketFreshHours;
  }

  if (/squad|availability/i.test(`${source.id} ${source.label}`)) {
    return squadFreshHours;
  }

  if (["official", "cross-check"].includes(source.type)) {
    return contextFreshHours;
  }

  return contextFreshHours;
}

function summarizeSource(source) {
  const age = sourceAgeHours(source);
  const ageText = Number.isFinite(age) ? `${age.toFixed(1)}h old` : "invalid checkedAt";
  return `${source?.label || source?.id || "Unknown source"} (${ageText})`;
}

function getFixtureUnavailable(playerAvailabilityData, fixture) {
  const rows = [];

  for (const teamId of [fixture.homeTeamId, fixture.awayTeamId]) {
    const teamAvailability = playerAvailabilityData?.teams?.[teamId];
    for (const record of teamAvailability?.fixtureUnavailable || []) {
      if (record.fixtureId === fixture.id) {
        rows.push({ ...record, teamId });
      }
    }
  }

  return rows;
}

const [
  expectedLineupsData,
  fixturesData,
  freeLineupPredictionsData,
  lineupsData,
  matchupResearchData,
  playerAvailabilityData,
  teamsData,
  tournamentData
] = await Promise.all([
  readOptionalJson("expected-lineups.json", { fixtures: [] }),
  readJson("fixtures.json"),
  readOptionalJson("free-lineup-prediction-sources.json", { sources: [], fixtures: [] }),
  readJson("lineups.json"),
  readJson("matchup-research-notes.json"),
  readJson("player-availability.json"),
  readJson("teams.json"),
  readJson("tournament.json")
]);

const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
const sourceById = new Map(
  [...(tournamentData.sources || []), ...(freeLineupPredictionsData.sources || [])]
    .map((source) => [source.id, source])
);
const expectedLineupByFixtureId = new Map(
  (expectedLineupsData.fixtures || []).map((record) => [record.fixtureId, record])
);
const curatedLineupSourcesByFixtureId = new Map(
  (freeLineupPredictionsData.fixtures || []).map((record) => [record.fixtureId, record.sources || []])
);
const todayKey = getDayKey(now);
const tomorrowKey = addDays(todayKey, 1);
const fixtures = [...(fixturesData.fixtures || [])].sort(
  (a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc)
);
const focusFixtures = fixtures.filter((fixture) => {
  const dayKey = getDayKey(new Date(fixture.kickoffUtc));
  const hoursUntilKickoff = hoursBetween(new Date(fixture.kickoffUtc), now);
  return (
    dayKey === todayKey ||
    dayKey === tomorrowKey ||
    (
      ["SCHEDULED", "DELAYED"].includes(fixture.status) &&
      fixture.homeTeamId &&
      fixture.awayTeamId &&
      hoursUntilKickoff >= 0 &&
      hoursUntilKickoff <= lineupPlanningHorizonHours
    )
  );
});
const blockers = [];
const editorialWarnings = [];
const actions = [];
const sourceRefreshes = new Map();
const matchupResearchRows = [];
const lineupPredictionRows = [];

function getFixtureResearch(fixture) {
  return matchupResearchData?.fixtures?.[fixture.id] || null;
}

function addEditorialFreshnessIssue(message) {
  if (editorialWarnOnly) {
    editorialWarnings.push(message);
  } else {
    blockers.push(message);
  }
}

for (const fixture of focusFixtures) {
  const kickoff = new Date(fixture.kickoffUtc);
  const hoursSinceKickoff = hoursBetween(now, kickoff);
  const hoursUntilKickoff = hoursBetween(kickoff, now);
  const label = fixtureName(fixture, teamsById);
  const fixtureResearch = getFixtureResearch(fixture);

  if (fixture.status === "SCHEDULED" && hoursSinceKickoff > 0) {
    const message = `${label} kicked off ${hoursSinceKickoff.toFixed(1)}h ago but is still SCHEDULED. Run pnpm sync:fifa, then verify live status if FIFA has no update.`;
    if (hoursSinceKickoff > statusStaleHours) {
      blockers.push(message);
    } else {
      actions.push(message);
    }
  }

  if (fixture.status === "DELAYED" && hoursSinceKickoff > 0) {
    const message = `${label} is DELAYED ${hoursSinceKickoff.toFixed(1)}h after scheduled kickoff. Re-run pnpm sync:fifa and confirm revised kickoff or live status.`;
    if (hoursSinceKickoff > delayedStatusStaleHours) {
      blockers.push(message);
    } else {
      actions.push(message);
    }
  }

  const liveStaleHours = liveStatusStaleHours(fixture);
  if (fixture.status === "LIVE" && hoursSinceKickoff > liveStaleHours) {
    blockers.push(`${label} has been LIVE for ${hoursSinceKickoff.toFixed(1)}h. Run pnpm sync:fifa and confirm FT score/status.`);
  } else if (fixture.status === "LIVE") {
    const knockoutNote = isKnockoutFixture(fixture) && hoursSinceKickoff > statusStaleHours
      ? " Knockout matches can run through extra time or penalties."
      : "";
    actions.push(`${label} is LIVE.${knockoutNote} Re-run pnpm sync:fifa after full time.`);
  }

  if (fixture.status === "FT" && !fixture.score) {
    blockers.push(`${label} is FT but has no score.`);
  }

  if (
    ["semi-finals", "bronze-final", "final"].includes(fixture.stage) &&
    fixture.h2h?.coverageStatus === "complete" &&
    fixture.h2h.loadedMeetingCount !== fixture.h2h.officialAggregateCount
  ) {
    blockers.push(
      `${label} is marked as complete H2H coverage but has ${fixture.h2h.loadedMeetingCount} loaded meetings versus ${fixture.h2h.officialAggregateCount} in the official aggregate.`
    );
  }

  if (
    isKnockoutFixture(fixture) &&
    ["SCHEDULED", "DELAYED"].includes(fixture.status) &&
    fixture.homeTeamId &&
    fixture.awayTeamId
  ) {
    const projectionMethod = fixture.projection?.method || "";
    const hasSourcedProjection = [
      "market-implied-consensus",
      "online-source-consensus",
      "online-source-forecast"
    ].includes(projectionMethod);
    if (!hasSourcedProjection) {
      const message = `${label} needs a direct Opta/bookmaker 1X2 forecast before publishing; ranking fallbacks are not accepted for confirmed knockout fixtures.`;
      if (hoursUntilKickoff <= lineupResearchRequiredHours) {
        addEditorialFreshnessIssue(message);
      } else {
        actions.push(message);
      }
    }
  }

  if (
    ["SCHEDULED", "DELAYED"].includes(fixture.status) &&
    fixture.homeTeamId &&
    fixture.awayTeamId &&
    !lineupsData.lineups?.[fixture.id]
  ) {
    const expectedLineup = expectedLineupByFixtureId.get(fixture.id);
    const curatedSources = curatedLineupSourcesByFixtureId.get(fixture.id) || [];
    const newestCuratedAt = curatedSources
      .map((source) => new Date(source.checkedAt || "").getTime())
      .filter(Number.isFinite)
      .sort((left, right) => right - left)[0];
    const curatedAge = Number.isFinite(newestCuratedAt)
      ? hoursBetween(now, new Date(newestCuratedAt))
      : Infinity;
    lineupPredictionRows.push({ curatedAge, curatedSources, expectedLineup, fixture, label });
    const expectedUpdatedAt = new Date(expectedLineup?.lastUpdated || expectedLineupsData.generatedAt || "");
    const expectedAge = Number.isNaN(expectedUpdatedAt.getTime())
      ? Infinity
      : hoursBetween(now, expectedUpdatedAt);
    const expectedPredatesResearch = Number.isFinite(newestCuratedAt) &&
      (Number.isNaN(expectedUpdatedAt.getTime()) || expectedUpdatedAt.getTime() < newestCuratedAt);

    if (!expectedLineup) {
      const message = `${label} has confirmed teams but no expected lineup. Run pnpm lineups:predict.`;
      if (hoursUntilKickoff <= lineupResearchRequiredHours) {
        addEditorialFreshnessIssue(message);
      } else {
        actions.push(message);
      }
    } else if (!curatedSources.length) {
      const message = `${label} is using the automatic recent-official-XI baseline only; research and add fresh probable-lineup sources before kickoff.`;
      if (hoursUntilKickoff <= lineupResearchRequiredHours) {
        addEditorialFreshnessIssue(message);
      } else {
        actions.push(message);
      }
    } else if (curatedAge > lineupPreviewFreshHours) {
      const message = `${label} probable-lineup research is ${Number.isFinite(curatedAge) ? `${curatedAge.toFixed(1)}h` : "invalid"} old; refresh team news and regenerate expected lineups.`;
      if (hoursUntilKickoff <= lineupResearchRequiredHours) {
        addEditorialFreshnessIssue(message);
      } else {
        actions.push(message);
      }
    } else if (expectedPredatesResearch) {
      addEditorialFreshnessIssue(`${label} expected lineup predates its newest curated source. Run pnpm lineups:predict.`);
    } else if (expectedAge > lineupPreviewFreshHours) {
      addEditorialFreshnessIssue(
        `${label} expected lineup is ${Number.isFinite(expectedAge) ? `${expectedAge.toFixed(1)}h` : "invalid"} old. Regenerate it.`
      );
    }

    if (expectedLineup) {
      const unavailable = getFixtureUnavailable(playerAvailabilityData, fixture);
      const predictedNames = [
        ...(expectedLineup.lineup?.home?.players || []),
        ...(expectedLineup.lineup?.home?.bench || []),
        ...(expectedLineup.lineup?.away?.players || []),
        ...(expectedLineup.lineup?.away?.bench || [])
      ].map((player) => String(player?.name || "").toLowerCase().replace(/[^a-z0-9]/g, ""));
      for (const player of unavailable) {
        const unavailableKey = String(player.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        if (unavailableKey && predictedNames.includes(unavailableKey)) {
          blockers.push(`${label} expected lineup still includes unavailable ${player.name}. Regenerate after updating availability.`);
        }
      }
    }
  }

  if (fixture.stage === "group" && fixture.status !== "FT" && fixture.homeTeamId && fixture.awayTeamId) {
    if (!fixtureResearch || fixtureResearch.status !== "researched") {
      const message = `${label} needs fixture-specific matchup research before publishing.`;
      if (hoursUntilKickoff <= 24) {
        addEditorialFreshnessIssue(message);
      } else {
        actions.push(message);
      }
    } else {
      const checkedAt = new Date(fixtureResearch.checkedAt || "");
      const age = Number.isNaN(checkedAt.getTime()) ? Infinity : hoursBetween(now, checkedAt);
      matchupResearchRows.push({ fixture, label, research: fixtureResearch, age });
      if (age > matchupResearchFreshHours) {
        const message = `${label} matchup research is ${Number.isFinite(age) ? `${age.toFixed(1)}h` : "invalid"} old; refresh source search and rerun matchup generation.`;
        if (hoursUntilKickoff <= 24) {
          addEditorialFreshnessIssue(message);
        } else {
          actions.push(message);
        }
      }
    }
  }

  for (const sourceId of fixtureSourceIds(fixture)) {
    const source = sourceById.get(sourceId);
    const age = sourceAgeHours(source);
    const threshold = sourceThresholdHours(source);
    if (age > threshold) {
      sourceRefreshes.set(sourceId, {
        age,
        fixtures: [...(sourceRefreshes.get(sourceId)?.fixtures || []), label],
        source,
        threshold
      });
    }
  }
}

const squadSources = (playerAvailabilityData.sourceIds || [])
  .map((sourceId) => sourceById.get(sourceId))
  .filter(Boolean);
for (const source of squadSources) {
  const age = sourceAgeHours(source);
  if (age > sourceThresholdHours(source)) {
    sourceRefreshes.set(source.id, {
      age,
      fixtures: ["tournament squad baseline"],
      source,
      threshold: sourceThresholdHours(source)
    });
  }
}

console.log("Matchday readiness");
console.log(`Timezone: ${timeZone}`);
console.log(`Now: ${formatDateTime(now)}`);
console.log(`Editorial freshness: ${editorialWarnOnly ? "warn-only" : "strict"}`);
console.log("");

console.log(`Today (${todayKey}), tomorrow (${tomorrowKey}), and confirmed fixtures within ${lineupPlanningHorizonHours}h`);
for (const fixture of focusFixtures) {
  const kickoff = new Date(fixture.kickoffUtc);
  const score = fixture.score ? ` ${fixture.score.home}-${fixture.score.away}` : "";
  console.log(`- ${formatDateTime(kickoff)} ${fixtureName(fixture, teamsById)} [${fixture.status}${score}]`);
}

console.log("");
console.log("Fixture availability");
let printedAvailability = false;
for (const fixture of focusFixtures) {
  const unavailable = getFixtureUnavailable(playerAvailabilityData, fixture);
  for (const record of unavailable) {
    printedAvailability = true;
    console.log(`- ${fixtureName(fixture, teamsById)}: ${record.name} unavailable for ${teamName(teamsById, record.teamId)} (${record.reason})`);
  }
}
if (!printedAvailability) {
  console.log("- No fixture-specific absences recorded for the focus fixtures.");
}

console.log("");
console.log("Lineup predictions");
if (!lineupPredictionRows.length) {
  console.log("- No unconfirmed lineup projections needed within the planning horizon.");
} else {
  for (const row of lineupPredictionRows) {
    const mode = row.expectedLineup?.mode || "missing";
    const sourceText = row.curatedSources.length
      ? `${row.curatedSources.length} curated source(s), newest ${row.curatedAge.toFixed(1)}h old`
      : "official-history baseline only";
    console.log(`- ${row.label}: ${mode}; ${sourceText}.`);
  }
}

console.log("");
console.log("Fixture matchup research");
if (!matchupResearchRows.length) {
  console.log("- No source-backed fixture research notes loaded for the focus fixtures.");
} else {
  for (const row of matchupResearchRows) {
    const sourceCount = row.research.sourceIds?.length || 0;
    const ageText = Number.isFinite(row.age) ? `${row.age.toFixed(1)}h old` : "invalid checkedAt";
    console.log(`- ${row.label}: ${row.research.status}, ${ageText}, ${sourceCount} source(s).`);
  }
}

console.log("");
console.log("Actions");
if (!blockers.length && !editorialWarnings.length && !actions.length) {
  console.log("- No status blockers. Keep the live provider/sync cadence running.");
} else {
  for (const blocker of blockers) {
    console.log(`- BLOCKER: ${blocker}`);
  }
  for (const warning of editorialWarnings) {
    console.log(`- WARNING: ${warning}`);
  }
  for (const action of actions) {
    console.log(`- ${action}`);
  }
}

console.log("");
console.log("Source freshness for focus fixtures");
if (!sourceRefreshes.size) {
  console.log("- No focused source refreshes needed.");
} else {
  for (const { fixtures: labels, source, threshold } of [...sourceRefreshes.values()].sort((a, b) => b.age - a.age)) {
    const usedBy = [...new Set(labels)].slice(0, 3).join("; ");
    console.log(`- Refresh ${summarizeSource(source)}; threshold ${threshold}h; used by ${usedBy}.`);
  }
}

console.log("");
console.log("Automation note");
console.log(
  "- Runtime /api/live-data fetches FIFA official scores and near-kickoff lineups even when the configured primary provider is unavailable; the primary provider is still used when configured."
);
console.log(
  "- The scheduled Sync FIFA Results Hybrid workflow checks every 30 minutes during the tournament and commits changed static JSON; local-only runs still need a commit/deploy before production sees them."
);

if (blockers.length) {
  process.exitCode = 1;
}
