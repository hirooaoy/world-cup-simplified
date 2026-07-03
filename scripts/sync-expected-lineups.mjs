#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildProfileLookup,
  buildFifaLineupsFromLiveMatch,
  fixtureFifaMatchId,
  buildFifaMatchCentreUrl
} from "./fifa-live-lineup-parser.mjs";
import { applyLineupLayoutOverride, getVerifiedLayoutOverride } from "./lineup-layout-overrides.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const FIFA_LIVE_URL = "https://api.fifa.com/api/v3/live/football";
const FIFA_SCHEDULE_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums";
const sourceId = `fifa-expected-lineups-sync-${new Date().toISOString().slice(0, 10)}`;
const checkedAt = process.env.FIFA_EXPECTED_LINEUPS_CHECKED_AT || new Date().toISOString();
const confidence = process.env.FIFA_EXPECTED_LINEUP_CONFIDENCE || "low";
const probableConfidence = process.env.FIFA_EXPECTED_LINEUP_PROBABLE_CONFIDENCE || "low";
const shouldWrite = !process.argv.includes("--check");
const requestTimeoutMs = Number(process.env.FIFA_LINEUPS_TIMEOUT_MS || 10000);
const requestRetries = Number(process.env.FIFA_LINEUPS_RETRIES || 2);
const requestConcurrency = Number(process.env.FIFA_LINEUPS_CONCURRENCY || 8);
const allowProbableFallback = process.env.FIFA_EXPECTED_LINEUP_ALLOW_PROBABLE !== "0";
const minProbablePlayers = 12;

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

async function writeJson(fileName, value) {
  await writeFile(path.join(dataDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
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

function buildTeamLookup(teamsData) {
  return new Map((teamsData || []).map((team) => [team.id, team]));
}

function normalizeExpectedLineupMode(value) {
  const safeMode = String(value || "").trim().toLowerCase();
  if (["high", "medium", "low"].includes(safeMode)) {
    return safeMode;
  }

  return "low";
}

function getExpectedLineupRecordConfidence(mode) {
  return normalizeExpectedLineupMode(mode === "probable" ? probableConfidence : confidence);
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactName(value) {
  return normalizeName(value).replace(/\s+/g, "");
}

function getFallbackFormation(fixture, side = "home") {
  const sideFormation = fixture?.matchEvents?.[side]?.formation;
  if (typeof sideFormation === "string" && sideFormation.trim()) {
    return sideFormation.trim();
  }

  return "4-3-3";
}

function findProfileForName(profileLookup, teamId, playerName) {
  if (!playerName) {
    return null;
  }

  const key = normalizeName(playerName);
  const compactKey = compactName(playerName);

  const byName = profileLookup?.byName?.get(key);
  if (
    byName &&
    (!teamId || !byName.teamId || byName.teamId === teamId)
  ) {
    return byName;
  }

  const byCompactName = profileLookup?.byCompactName?.get(compactKey);
  if (
    byCompactName &&
    (!teamId || !byCompactName.teamId || byCompactName.teamId === teamId)
  ) {
    return byCompactName;
  }

  return null;
}

function getProfileFifaPosition(profile) {
  const position = String(profile?.position || "").toLowerCase();
  if (!position) {
    return "";
  }

  if (position.includes("goalkeeper") || position.includes("keeper")) {
    return 0;
  }

  if (position.includes("back") || position.includes("defender") || position.includes("sweeper")) {
    return 1;
  }

  if (
    position.includes("midfield") ||
    position.includes("wing-mid") ||
    position.includes("middle")
  ) {
    return 2;
  }

  if (
    position.includes("forward") ||
    position.includes("striker") ||
    position.includes("wing") ||
    position.includes("attacking")
  ) {
    return 3;
  }

  return "";
}

function getTeamProbableCandidates(fixture, playerAvailabilityData, teamId, side) {
  const teamAvailability = (playerAvailabilityData?.teams || {})[teamId] || {};
  const fixtureUnavailable = teamAvailability.fixtureUnavailable || [];

  const excluded = new Set();
  for (const unavailable of teamAvailability.unavailable || []) {
    excluded.add(normalizeName(unavailable?.name || unavailable?.player));
  }
  for (const record of fixtureUnavailable) {
    if (record?.fixtureId === fixture?.id) {
      excluded.add(normalizeName(record?.name || record?.player));
    }
  }

  const keyPlayers = Array.isArray(fixture?.keyPlayers?.[side])
    ? fixture.keyPlayers[side]
      .map((player) => player?.name)
      .filter((name) => typeof name === "string" && name.trim())
    : [];

  const included = (teamAvailability.included || [])
    .map((name) => String(name || ""))
    .filter((name) => name.trim());

  const seen = new Set();
  const result = [];

  for (const playerName of [...keyPlayers, ...included]) {
    const normalizedName = normalizeName(playerName);
    if (!normalizedName || excluded.has(normalizedName) || seen.has(normalizedName)) {
      continue;
    }

    seen.add(normalizedName);
    result.push(playerName);
  }

  return result;
}

function buildSyntheticPlayer(playerName, index, teamId, profileLookup, isStarter) {
  const profile = findProfileForName(profileLookup, teamId, playerName);
  const profilePosition = getProfileFifaPosition(profile);
  const playerNumber = profile?.uniformNumber || profile?.squadNumber || (index + 1);

  return {
    PlayerName: [{ Locale: "en-GB", Description: playerName }],
    ShortName: [{ Locale: "en-GB", Description: playerName }],
    IdPlayer: `probable-${teamId}-${index}`,
    Position: profilePosition || (isStarter ? 2 : ""),
    Status: isStarter ? 1 : 2,
    ShirtNumber: playerNumber != null ? String(playerNumber) : String(index + 1)
  };
}

function buildProbableFifaMatchFromCandidates(fixture, teamsById, profileLookup, playerAvailabilityData) {
  if (!allowProbableFallback) {
    return null;
  }

  const homeCandidates = getTeamProbableCandidates(fixture, playerAvailabilityData, fixture.homeTeamId, "home");
  const awayCandidates = getTeamProbableCandidates(fixture, playerAvailabilityData, fixture.awayTeamId, "away");

  if (homeCandidates.length < minProbablePlayers || awayCandidates.length < minProbablePlayers) {
    return null;
  }

  const homeFormation = getFallbackFormation(fixture, "home");
  const awayFormation = getFallbackFormation(fixture, "away");

  const homeNames = homeCandidates.slice(0, minProbablePlayers);
  const awayNames = awayCandidates.slice(0, minProbablePlayers);

  if (
    !homeNames.length ||
    !awayNames.length ||
    homeNames.length < minProbablePlayers ||
    awayNames.length < minProbablePlayers
  ) {
    return null;
  }

  const homeGoalkeeperIndex = homeNames
    .slice(0, 11)
    .findIndex((name) => getProfileFifaPosition(findProfileForName(profileLookup, fixture.homeTeamId, name)) === 0);
  if (homeGoalkeeperIndex > 0) {
    [homeNames[0], homeNames[homeGoalkeeperIndex]] = [homeNames[homeGoalkeeperIndex], homeNames[0]];
  }

  const awayGoalkeeperIndex = awayNames
    .slice(0, 11)
    .findIndex((name) => getProfileFifaPosition(findProfileForName(profileLookup, fixture.awayTeamId, name)) === 0);
  if (awayGoalkeeperIndex > 0) {
    [awayNames[0], awayNames[awayGoalkeeperIndex]] = [awayNames[awayGoalkeeperIndex], awayNames[0]];
  }

  const homePlayers = homeNames.map((name, index) => buildSyntheticPlayer(name, index, fixture.homeTeamId, profileLookup, index < 11));
  const awayPlayers = awayNames.map((name, index) => buildSyntheticPlayer(name, index, fixture.awayTeamId, profileLookup, index < 11));

  const syntheticMatch = {
    HomeTeam: {
      Tactics: homeFormation,
      Players: homePlayers
    },
    AwayTeam: {
      Tactics: awayFormation,
      Players: awayPlayers
    }
  };

  const lineups = buildFifaLineupsFromLiveMatch({
    fixture,
    liveMatch: syntheticMatch,
    teamsById,
    profileLookup,
    checkedAt,
    sourceIds: [sourceId],
    sourceUrl: buildFifaMatchCentreUrl(fixture, syntheticMatch),
    mode: "probable"
  });

  return {
    ...lineups,
    mode: "probable",
    teamSheetSource: "provider",
    eventSource: "provider",
    layoutSource: "provider"
  };
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
      if (attempt < requestRetries) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }

  throw lastError;
}

async function fetchLiveMatch(idMatch) {
  const url = new URL(`${FIFA_LIVE_URL}/${idMatch}`);
  url.searchParams.set("language", "en");

  return fetchJson(url, `FIFA live lineup request for ${idMatch}`);
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

function buildExpectedLineupRecord(fixture, lineups, previousSourceIds, mode) {
  return {
    fixtureId: fixture.id,
    mode,
    sourceIds: previousSourceIds,
    lastUpdated: checkedAt,
    confidence: { label: getExpectedLineupRecordConfidence(mode) },
    lineup: lineups
  };
}

async function processFixture(fixture, teamsById, profileLookup, playerAvailabilityData, layoutOverridesData) {
  const idMatch = fixtureFifaMatchId(fixture);
  if (!idMatch) {
    const probableLineups = buildProbableFifaMatchFromCandidates(
      fixture,
      teamsById,
      profileLookup,
      playerAvailabilityData
    );

    if (probableLineups) {
      return {
        fixtureId: fixture.id,
        success: true,
        mode: "probable",
        lineups: probableLineups,
        warnings: []
      };
    }

    return {
      fixtureId: fixture.id,
      success: false,
      mode: "expected",
      warnings: [`${fixture.id}: no official FIFA match id found`]
    };
  }

  let liveMatch;
  try {
    liveMatch = await fetchLiveMatch(idMatch);
  } catch (error) {
    const probableLineups = buildProbableFifaMatchFromCandidates(
      fixture,
      teamsById,
      profileLookup,
      playerAvailabilityData
    );
    if (probableLineups) {
      return {
        fixtureId: fixture.id,
        success: true,
        mode: "probable",
        lineups: probableLineups,
        warnings: []
      };
    }

    return {
      fixtureId: fixture.id,
      success: false,
      mode: "expected",
      warnings: [`${fixture.id}: ${error.message}`]
    };
  }

  const sourceUrl = buildFifaMatchCentreUrl(fixture, liveMatch);
  try {
    const lineups = buildFifaLineupsFromLiveMatch({
      fixture,
      liveMatch,
      teamsById,
      profileLookup,
      checkedAt,
      sourceIds: [sourceId],
      sourceUrl,
      mode: "expected"
    });
    const nextLineups = applyVerifiedLayoutIfAvailable(fixture, lineups, layoutOverridesData);

    return {
      fixtureId: fixture.id,
      success: true,
      mode: "expected",
      lineups: nextLineups,
      warnings: []
    };
  } catch (error) {
    const probableLineups = buildProbableFifaMatchFromCandidates(
      fixture,
      teamsById,
      profileLookup,
      playerAvailabilityData
    );
    if (probableLineups) {
      return {
        fixtureId: fixture.id,
        success: true,
        mode: "probable",
        lineups: probableLineups,
        warnings: []
      };
    }

    return {
      fixtureId: fixture.id,
      success: false,
      mode: "expected",
      warnings: [`${fixture.id}: ${error.message}`]
    };
  }
}

const [
  fixturesData,
  expectedLineupsData,
  teamsData,
  profilesData,
  playerAvailabilityData,
  layoutOverridesData,
  tournamentData
] = await Promise.all([
  readJson("fixtures.json"),
  readOptionalJson("expected-lineups.json", { schemaVersion: "1", fixtures: [] }),
  readJson("teams.json"),
  readJson("player-profiles.json"),
  readOptionalJson("player-availability.json", { teams: {} }),
  readOptionalJson("lineup-layout-overrides.json", { sourceIds: [], fixtures: {} }),
  readJson("tournament.json")
]);

const teamsById = buildTeamLookup(teamsData.teams);
const profileLookup = buildProfileLookup(profilesData);
const existingExpectedByFixtureId = new Map(
  (Array.isArray(expectedLineupsData?.fixtures) ? expectedLineupsData.fixtures : [])
    .filter((item) => item?.fixtureId)
    .map((item) => [item.fixtureId, item])
);

const scheduledTargetFixtures = (fixturesData.fixtures || []).filter((fixture) =>
  fixture?.status === "SCHEDULED" && fixture.id && fixture.homeTeamId && fixture.awayTeamId
);

const warnings = [];
let nextIndex = 0;
let matchedCount = 0;
let probableCount = 0;
let updatedCount = 0;

async function worker() {
  while (nextIndex < scheduledTargetFixtures.length) {
    const fixture = scheduledTargetFixtures[nextIndex];
    nextIndex += 1;
    const result = await processFixture(
      fixture,
      teamsById,
      profileLookup,
      playerAvailabilityData,
      layoutOverridesData
    );
    matchedCount += result.success ? 1 : 0;
    probableCount += result.mode === "probable" ? 1 : 0;

    if (result.success) {
      const nextRecord = buildExpectedLineupRecord(
        fixture,
        result.lineups,
        [sourceId],
        result.mode || "expected"
      );
      const previousRecord = existingExpectedByFixtureId.get(fixture.id);
      if (!previousRecord || JSON.stringify(previousRecord) !== JSON.stringify(nextRecord)) {
        updatedCount += 1;
      }

      existingExpectedByFixtureId.set(fixture.id, nextRecord);
    }

    warnings.push(...(result.warnings || []));
  }
}

await Promise.all(
  Array.from({ length: Math.min(requestConcurrency, scheduledTargetFixtures.length) }, () => worker())
);

const nextExpectedFixtures = [];
for (const fixture of fixturesData.fixtures || []) {
  if (fixture.status !== "SCHEDULED") {
    continue;
  }

  const record = existingExpectedByFixtureId.get(fixture.id);
  if (record?.fixtureId) {
    nextExpectedFixtures.push(record);
  }
}

if (shouldWrite) {
  expectedLineupsData.sourceIds = [...new Set([...(expectedLineupsData.sourceIds || []), sourceId])];
  expectedLineupsData.generatedAt = checkedAt;
  expectedLineupsData.fixtures = nextExpectedFixtures;

  await writeJson("expected-lineups.json", expectedLineupsData);
  tournamentData.updatedAt = checkedAt;
  tournamentData.sources = [
    ...(tournamentData.sources || []).filter((source) => !/^fifa-expected-lineups-sync-/.test(source.id)),
    {
      id: sourceId,
      label: "FIFA official expected lineup sync",
      url: FIFA_SCHEDULE_URL,
      type: "official",
      checkedAt,
      note: `${matchedCount} scheduled FIFA lineups checked; expected-lineups.json carries ${nextExpectedFixtures.length} scheduled fixture lineup preview${nextExpectedFixtures.length === 1 ? "" : "s"}; ${updatedCount} changed on this pass.`
    }
  ];
  await writeJson("tournament.json", tournamentData);
}

for (const warning of warnings) {
  console.warn(`Warning: ${warning}`);
}

console.log(
  `Checked ${matchedCount} scheduled fixture${matchedCount === 1 ? "" : "s"}; ${updatedCount} expected lineup update${updatedCount === 1 ? "" : "s"} (${probableCount} probable) ${shouldWrite ? "written" : "detected"}`
);
console.log(`Expected lineup previews tracked: ${nextExpectedFixtures.length}.`);
