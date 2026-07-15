#!/usr/bin/env node
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyLineupLayoutOverride, getVerifiedLayoutOverride } from "./lineup-layout-overrides.mjs";
import {
  buildFifaLineupsFromLiveMatch as buildSharedFifaLineupsFromLiveMatch,
  buildProfileLookup as buildSharedProfileLookup,
  getPreKickoffPredictionLayoutReference,
  getRetainedOfficialLayoutReference
} from "./fifa-live-lineup-parser.mjs";
import {
  archiveExpectedLineupsForFixtures,
  commitPredictionArchiveBeforeOfficialPersistence
} from "./lineup-prediction-history.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const FIFA_LIVE_URL = "https://api.fifa.com/api/v3/live/football";
const FIFA_SCHEDULE_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums";
const FIFA_COMPETITION_ID = process.env.FIFA_COMPETITION_ID || "17";
const FIFA_SEASON_ID = process.env.FIFA_SEASON_ID || "285023";
const FIFA_PROVIDER_KEY = "fifa";
const sourceId = `fifa-lineups-sync-${new Date().toISOString().slice(0, 10)}`;
const checkedAt = process.env.FIFA_LINEUPS_CHECKED_AT || new Date().toISOString();
const shouldWrite = !process.argv.includes("--check");
const includeLive = process.argv.includes("--include-live");
const matchdayOnly = process.argv.includes("--matchday-only");
const confirmedWindowBeforeMinutes = Number(process.env.FIFA_LINEUPS_WINDOW_BEFORE_MINUTES || 180);
const confirmedWindowAfterMinutes = Number(process.env.FIFA_LINEUPS_WINDOW_AFTER_MINUTES || 360);
const requestTimeoutMs = Number(process.env.FIFA_LINEUPS_TIMEOUT_MS || 10000);
const requestRetries = Number(process.env.FIFA_LINEUPS_RETRIES || 2);
const requestConcurrency = Number(process.env.FIFA_LINEUPS_CONCURRENCY || 8);

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

async function writeJson(fileName, value) {
  await writeFile(path.join(dataDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

async function writeJsonAtomic(fileName, value) {
  const outputPath = path.join(dataDir, fileName);
  const temporaryPath = `${outputPath}.${process.pid}.${Date.now()}.tmp`;

  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

function buildTeamLookup(teams) {
  return new Map((teams || []).map((team) => [team.id, team]));
}

function fixtureFifaMatchId(fixture) {
  return (
    fixture.providerIds?.[FIFA_PROVIDER_KEY]?.matchId ||
    fixture.providerIds?.[FIFA_PROVIDER_KEY]?.idMatch ||
    fixture.fifaMatchId ||
    ""
  );
}

async function fetchJson(url, label) {
  let lastError;

  for (let attempt = 1; attempt <= requestRetries; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(requestTimeoutMs) });
      if (!response.ok) {
        throw new Error(`${label} failed with ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function fetchLiveMatch(idMatch) {
  const url = new URL(`${FIFA_LIVE_URL}/${idMatch}`);
  url.searchParams.set("language", "en");

  return fetchJson(url, `FIFA live lineup request for ${idMatch}`);
}

function fifaMatchCentreUrl(fixture, liveMatch) {
  const idCompetition = liveMatch?.IdCompetition || FIFA_COMPETITION_ID;
  const idSeason = liveMatch?.IdSeason || FIFA_SEASON_ID;
  const idStage = liveMatch?.IdStage || liveMatch?.Stage?.IdStage || fixture.providerIds?.[FIFA_PROVIDER_KEY]?.stageId || "";
  const idMatch = liveMatch?.IdMatch || fixtureFifaMatchId(fixture);

  return idCompetition && idSeason && idStage && idMatch
    ? `https://www.fifa.com/en/match-centre/match/${idCompetition}/${idSeason}/${idStage}/${idMatch}`
    : FIFA_SCHEDULE_URL;
}

function comparableLineups(lineups) {
  if (!lineups || typeof lineups !== "object") {
    return null;
  }

  const layoutVerification = lineups.layoutVerification && typeof lineups.layoutVerification === "object"
    ? { ...lineups.layoutVerification }
    : lineups.layoutVerification || null;
  if (layoutVerification && typeof layoutVerification === "object") {
    // A polling timestamp is evidence freshness, not a material lineup change.
    // Keeping it out of equality prevents five-minute matchday checks from
    // committing and deploying an otherwise identical provisional board.
    delete layoutVerification.checkedAt;
  }

  return {
    mode: lineups.mode || "",
    teamSheetSource: lineups.teamSheetSource || "",
    eventSource: lineups.eventSource || "",
    layoutSource: lineups.layoutSource || "",
    layoutVerification,
    home: lineups.home || null,
    away: lineups.away || null
  };
}

function sameLineups(left, right) {
  return JSON.stringify(comparableLineups(left)) === JSON.stringify(comparableLineups(right));
}

function applyVerifiedLayoutIfAvailable(fixture, lineups, layoutOverridesData) {
  const override = getVerifiedLayoutOverride(layoutOverridesData, fixture.id);
  if (!override) {
    return lineups;
  }
  if (
    (override.homeTeamId && override.homeTeamId !== fixture.homeTeamId) ||
    (override.awayTeamId && override.awayTeamId !== fixture.awayTeamId)
  ) {
    return lineups;
  }

  return applyLineupLayoutOverride(lineups, override);
}

function lineupModeForFixture(fixture) {
  return fixture?.status === "FT" ? "final" : "confirmed";
}

async function processFixture(
  fixture,
  existingLineups,
  teamsById,
  profileLookup,
  layoutOverridesData,
  expectedLineupsData
) {
  const idMatch = fixtureFifaMatchId(fixture);
  if (!idMatch) {
    return {
      matched: false,
      updated: false,
      warnings: [`${fixture.id}: no official FIFA match id found`]
    };
  }

  let liveMatch;
  try {
    liveMatch = await fetchLiveMatch(idMatch);
  } catch (error) {
    return {
      matched: true,
      updated: false,
      warnings: [`${fixture.id}: ${error.message}`]
    };
  }

  let nextLineups;
  try {
    const layoutReference =
      getPreKickoffPredictionLayoutReference(expectedLineupsData, fixture) ||
      getRetainedOfficialLayoutReference(existingLineups);
    nextLineups = buildSharedFifaLineupsFromLiveMatch({
      fixture,
      layoutReference,
      liveMatch,
      teamsById,
      profileLookup,
      checkedAt,
      sourceIds: [sourceId],
      sourceUrl: fifaMatchCentreUrl(fixture, liveMatch),
      mode: lineupModeForFixture(fixture)
    });
    // Static records do not need live on-field snapshots. Dropping them also
    // prevents every post-match sync from rewriting otherwise identical data.
    delete nextLineups.home.onFieldPlayers;
    delete nextLineups.away.onFieldPlayers;
    nextLineups = applyVerifiedLayoutIfAvailable(fixture, nextLineups, layoutOverridesData);
  } catch (error) {
    return {
      matched: true,
      updated: false,
      warnings: [`${fixture.id}: ${error.message}`]
    };
  }

  if (!sameLineups(existingLineups, nextLineups)) {
    return {
      fixtureId: fixture.id,
      lineups: nextLineups,
      matched: true,
      updated: true,
      warnings: []
    };
  }

  return {
    fixtureId: fixture.id,
    lineups: existingLineups,
    matched: true,
    updated: false,
    warnings: []
  };
}

const [
  fixturesData,
  lineupsData,
  teamsData,
  tournamentData,
  profilesData,
  layoutOverridesData,
  expectedLineupsData,
  predictionHistoryData,
  predictionAuditData,
  predictionRevisionLedgerData
] = await Promise.all([
  readJson("fixtures.json"),
  readOptionalJson("lineups.json", { sourceIds: [], lineups: {} }),
  readJson("teams.json"),
  readJson("tournament.json"),
  readJson("player-profiles.json"),
  readOptionalJson("lineup-layout-overrides.json", { fixtures: {} }),
  readOptionalJson("expected-lineups.json", { fixtures: [] }),
  readOptionalJson("lineup-prediction-history.json", {
    schemaVersion: "1.0",
    updatedAt: checkedAt,
    fixtures: []
  }),
  readOptionalJson("expected-lineups-audit.json", null),
  readOptionalJson("lineup-prediction-revisions.json", { revisions: [] })
]);

const teamsById = buildTeamLookup(teamsData.teams);
const profileLookup = buildSharedProfileLookup(profilesData);
const checkedAtMs = new Date(checkedAt).getTime();
function isWithinConfirmedLineupWindow(fixture) {
  const kickoff = new Date(fixture?.kickoffUtc || "").getTime();
  if (!Number.isFinite(kickoff) || !Number.isFinite(checkedAtMs)) {
    return false;
  }

  return (
    checkedAtMs >= kickoff - confirmedWindowBeforeMinutes * 60 * 1000 &&
    checkedAtMs <= kickoff + confirmedWindowAfterMinutes * 60 * 1000
  );
}

function shouldSyncFixtureLineup(fixture) {
  if (!fixture?.homeTeamId || !fixture?.awayTeamId || !fixtureFifaMatchId(fixture)) {
    return false;
  }

  if (fixture.status === "FT") {
    return !matchdayOnly;
  }
  if (fixture.status === "LIVE") {
    return includeLive;
  }

  return (
    includeLive &&
    ["SCHEDULED", "DELAYED"].includes(fixture.status) &&
    isWithinConfirmedLineupWindow(fixture)
  );
}
const targetFixtures = (fixturesData.fixtures || []).filter(
  shouldSyncFixtureLineup
);
const skippedCount = (fixturesData.fixtures || []).length - targetFixtures.length;
const lineupsByFixtureId = {
  ...(lineupsData && typeof lineupsData === "object" && !Array.isArray(lineupsData) ? lineupsData.lineups || {} : {})
};
let removedInlineCount = 0;
for (const fixture of fixturesData.fixtures || []) {
  if (fixture.lineups && !lineupsByFixtureId[fixture.id]) {
    lineupsByFixtureId[fixture.id] = fixture.lineups;
  }
  if (fixture.lineups) {
    delete fixture.lineups;
    removedInlineCount += 1;
  }
}
const warnings = [];
const results = [];
let matchedCount = 0;
let updateCount = 0;
let nextIndex = 0;

async function worker() {
  while (nextIndex < targetFixtures.length) {
    const fixture = targetFixtures[nextIndex];
    nextIndex += 1;
    const result = await processFixture(
      fixture,
      lineupsByFixtureId[fixture.id],
      teamsById,
      profileLookup,
      layoutOverridesData,
      expectedLineupsData
    );
    matchedCount += result.matched ? 1 : 0;
    updateCount += result.updated ? 1 : 0;
    results.push(result);
    warnings.push(...result.warnings);
  }
}

await Promise.all(
  Array.from({ length: Math.min(requestConcurrency, targetFixtures.length) }, () => worker())
);

for (const result of results) {
  if (result.fixtureId && result.lineups) {
    lineupsByFixtureId[result.fixtureId] = result.lineups;
  }
}

const knownFixtureIds = new Set((fixturesData.fixtures || []).map((fixture) => fixture.id));
const nextLineupsByFixtureId = Object.fromEntries(
  Object.entries(lineupsByFixtureId).filter(([fixtureId]) => knownFixtureIds.has(fixtureId))
);
const completedTargetCount = targetFixtures.filter((fixture) => fixture.status === "FT").length;
const confirmedTargetCount = targetFixtures.length - completedTargetCount;
const officialStaticFixtureIds = results
  .filter(
    (result) =>
      result.fixtureId &&
      result.lineups?.teamSheetSource === "fifa-official" &&
      result.lineups?.home?.players?.length === 11 &&
      result.lineups?.away?.players?.length === 11
  )
  .map((result) => result.fixtureId);
const predictionHistoryArchive = archiveExpectedLineupsForFixtures({
  auditData: predictionAuditData,
  historyData: predictionHistoryData,
  expectedLineupsData,
  fixturesData,
  fixtureIds: officialStaticFixtureIds,
  capturedAt: checkedAt,
  captureMethod: "fifa-lineup-confirmation",
  externalSources: tournamentData.sources || [],
  requireAuditRevision: true,
  revisionLedgerData: predictionRevisionLedgerData
});
const hasLineupWrites = updateCount > 0 || removedInlineCount > 0;

async function persistOfficialLineupFiles() {
  if (!hasLineupWrites) {
    return;
  }

  fixturesData.sourceIds = (fixturesData.sourceIds || []).filter((id) => !/^fifa-lineups-sync-/.test(id));
  fixturesData.updatedAt = checkedAt;
  const lineupRecordSourceIds = Object.values(nextLineupsByFixtureId).flatMap((lineups) =>
    Array.isArray(lineups?.sourceIds) ? lineups.sourceIds : []
  );
  lineupsData.sourceIds = [...new Set([...(lineupsData.sourceIds || []), sourceId, ...lineupRecordSourceIds])];
  lineupsData.updatedAt = checkedAt;
  lineupsData.lineups = nextLineupsByFixtureId;

  const sources = (tournamentData.sources || []).filter((source) => source.id !== sourceId);
  sources.push({
    id: sourceId,
    label: confirmedTargetCount ? "FIFA official lineups sync" : "FIFA official final lineups sync",
    url: FIFA_SCHEDULE_URL,
    type: "official",
    checkedAt,
    note: `${matchedCount} FIFA team sheet${matchedCount === 1 ? "" : "s"} checked across ${completedTargetCount} completed and ${confirmedTargetCount} near-kickoff fixture${confirmedTargetCount === 1 ? "" : "s"}; lineups.json carries official starters, bench, cards, and substitutions for ${Object.keys(nextLineupsByFixtureId).length} fixture${Object.keys(nextLineupsByFixtureId).length === 1 ? "" : "s"}; ${updateCount} changed on this pass.`
  });
  tournamentData.sources = sources;
  tournamentData.updatedAt = checkedAt;

  await Promise.all([
    writeJson("fixtures.json", fixturesData),
    writeJson("lineups.json", lineupsData),
    writeJson("tournament.json", tournamentData)
  ]);
}

if (shouldWrite) {
  await commitPredictionArchiveBeforeOfficialPersistence({
    archiveResult: predictionHistoryArchive,
    // The archive commits first and atomically. If a later lineup write fails,
    // the next run deduplicates this record; the inverse can never lose history.
    persistHistory: (historyData) =>
      writeJsonAtomic("lineup-prediction-history.json", historyData),
    persistOfficial: persistOfficialLineupFiles
  });
}

console.log(`Matched ${matchedCount} FIFA fixture${matchedCount === 1 ? "" : "s"}; skipped ${skippedCount}.`);
console.log(`${updateCount} lineup update${updateCount === 1 ? "" : "s"} ${shouldWrite ? "written" : "detected"}.`);
if (predictionHistoryArchive.archivedCount > 0) {
  console.log(
    `${predictionHistoryArchive.archivedCount} pre-kickoff prediction${predictionHistoryArchive.archivedCount === 1 ? "" : "s"} ${shouldWrite ? "archived before official lineup persistence" : "ready to archive"}.`
  );
}
if (removedInlineCount) {
  console.log(`${removedInlineCount} inline lineup record${removedInlineCount === 1 ? "" : "s"} moved out of fixtures.json.`);
}
for (const warning of warnings) {
  console.warn(`Warning: ${warning}`);
}
