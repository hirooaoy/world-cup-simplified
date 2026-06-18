import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const DEFAULT_TIME_ZONE = "America/Los_Angeles";
const DEFAULT_WINDOW_BEFORE_DAYS = 1;
const DEFAULT_WINDOW_AFTER_DAYS = 1;
const DEFAULT_PROVIDER_TIMEOUT_MS = 8000;
const DEFAULT_PROVIDER_MAX_PAGES = 5;
const SPORTMONKS_BASE_URL = "https://api.sportmonks.com/v3/football";
const SPORTMONKS_FIXTURE_INCLUDE = "participants;scores;state";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    sendJson(response, 405, { error: "Method not allowed" }, "no-store");
    return;
  }

  const [fixturesData, standingsData, teamsData, tournamentData] = await Promise.all([
    readJson("fixtures.json"),
    readJson("standings.json"),
    readJson("teams.json"),
    readJson("tournament.json")
  ]);
  const providerMap = (await readOptionalJson("provider-map.json")) || {};
  const token = process.env.SPORTMONKS_API_TOKEN;
  const checkedAt = new Date().toISOString();

  if (!token) {
    sendJson(
      response,
      200,
      {
        fixturesData,
        standingsData,
        tournamentData,
        syncStatus: {
          checkedAt,
          ok: false,
          provider: "sportmonks",
          reason: "SPORTMONKS_API_TOKEN is not configured"
        }
      },
      "s-maxage=60, stale-while-revalidate=300"
    );
    return;
  }

  try {
    const sportmonks = createSportmonksClient({
      maxPages: positiveInteger(process.env.SPORTMONKS_MAX_PAGES, DEFAULT_PROVIDER_MAX_PAGES),
      timeoutMs: positiveInteger(process.env.SPORTMONKS_TIMEOUT_MS, DEFAULT_PROVIDER_TIMEOUT_MS),
      token
    });
    const providerFixtures = await fetchProviderFixtures({
      sportmonks,
      providerMap,
      timeZone: process.env.SYNC_TIMEZONE || DEFAULT_TIME_ZONE
    });
    const merge = mergeProviderFixtures({
      checkedAt,
      fixturesData,
      providerFixtures,
      providerMap,
      teams: teamsData.teams
    });
    const mergedStandingsData = recomputeStandings({
      checkedAt,
      fixturesData: merge.fixturesData,
      standingsData,
      tournamentData
    });
    const mergedTournamentData = addSportmonksSource({
      checkedAt,
      tournamentData,
      updateCount: merge.updateCount
    });

    sendJson(
      response,
      200,
      {
        fixturesData: merge.fixturesData,
        standingsData: mergedStandingsData,
        tournamentData: mergedTournamentData,
        syncStatus: {
          checkedAt,
          matchedFixtures: merge.matchedCount,
          ok: true,
          provider: "sportmonks",
          updatedFixtures: merge.updateCount
        }
      },
      "s-maxage=60, stale-while-revalidate=300"
    );
  } catch (error) {
    sendJson(
      response,
      200,
      {
        fixturesData,
        standingsData,
        tournamentData,
        syncStatus: {
          checkedAt,
          ok: false,
          provider: "sportmonks",
          reason: error.message || "Unable to sync provider data"
        }
      },
      "s-maxage=60, stale-while-revalidate=300"
    );
  }
}

function sendJson(response, statusCode, payload, cacheControl) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", cacheControl);
  response.end(JSON.stringify(payload));
}

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

async function readOptionalJson(fileName) {
  try {
    return await readJson(fileName);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function getDayKey(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDayKey(dayKey, days) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  return [];
}

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Sportmonks request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function createSportmonksClient({ maxPages, timeoutMs, token }) {
  const baseUrl = process.env.SPORTMONKS_BASE_URL || SPORTMONKS_BASE_URL;

  return async function sportmonks(pathname, params = {}) {
    const url = new URL(`${baseUrl}${pathname}`);
    url.searchParams.set("api_token", token);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }

    const items = [];
    let nextUrl = url;
    let pageCount = 0;

    while (nextUrl) {
      pageCount += 1;
      if (pageCount > maxPages) {
        throw new Error(`Sportmonks pagination exceeded ${maxPages} pages`);
      }

      const apiResponse = await fetchWithTimeout(nextUrl, timeoutMs);
      if (!apiResponse.ok) {
        throw new Error(`Sportmonks request failed with ${apiResponse.status}`);
      }

      const payload = await apiResponse.json();
      items.push(...asArray(payload.data));
      const nextPage =
        payload.pagination?.next_page ||
        payload.meta?.pagination?.links?.next ||
        payload.links?.next;
      if (typeof nextPage === "number") {
        nextUrl = new URL(url);
        nextUrl.searchParams.set("page", String(nextPage));
      } else {
        nextUrl = nextPage ? new URL(nextPage) : null;
      }
    }

    return items;
  };
}

async function fetchProviderFixtures({ providerMap, sportmonks, timeZone }) {
  const todayKey = getDayKey(new Date(), timeZone);
  const startKey = shiftDayKey(
    todayKey,
    -positiveInteger(process.env.SPORTMONKS_WINDOW_BEFORE_DAYS, DEFAULT_WINDOW_BEFORE_DAYS)
  );
  const endKey = shiftDayKey(
    todayKey,
    positiveInteger(process.env.SPORTMONKS_WINDOW_AFTER_DAYS, DEFAULT_WINDOW_AFTER_DAYS)
  );
  const fixtures = await sportmonks(`/fixtures/between/${startKey}/${endKey}`, {
    include: process.env.SPORTMONKS_FIXTURE_INCLUDE || SPORTMONKS_FIXTURE_INCLUDE,
    per_page: "100"
  });
  const seasonId = String(process.env.SPORTMONKS_SEASON_ID || providerMap.sportmonks?.seasonId || "");
  const leagueId = String(process.env.SPORTMONKS_LEAGUE_ID || providerMap.sportmonks?.leagueId || "");

  return fixtures.filter((fixture) => {
    const matchesSeason = !seasonId || String(fixture.season_id || "") === seasonId;
    const matchesLeague = !leagueId || String(fixture.league_id || "") === leagueId;
    return matchesSeason && matchesLeague;
  });
}

function buildTeamLookup(teams, providerMap) {
  const byName = new Map();
  const byProviderId = new Map();
  const providerTeamIds = providerMap.sportmonks?.teamIds || {};

  for (const team of teams) {
    for (const name of [team.name, team.officialName, ...(team.aliases || [])]) {
      byName.set(normalizeKey(name), team.id);
    }

    const providerId = providerTeamIds[team.id];
    if (providerId) {
      byProviderId.set(String(providerId), team.id);
    }
  }

  return { byName, byProviderId };
}

function getProviderParticipants(providerFixture) {
  const participants = asArray(providerFixture.participants);
  const home =
    participants.find((participant) => getParticipantLocation(participant) === "home") ||
    participants[0];
  const away =
    participants.find((participant) => getParticipantLocation(participant) === "away") ||
    participants[1];
  return { away, home };
}

function getParticipantLocation(participant) {
  return normalizeKey(
    participant?.meta?.location ||
      participant?.location ||
      participant?.details?.location ||
      participant?.pivot?.location
  );
}

function findTeamIdForParticipant(participant, teamLookup) {
  const providerId = participant?.id || participant?.participant_id;
  if (providerId && teamLookup.byProviderId.has(String(providerId))) {
    return teamLookup.byProviderId.get(String(providerId));
  }

  return teamLookup.byName.get(normalizeKey(participant?.name || participant?.display_name));
}

function findMatchingFixture({ fixtures, providerFixture, providerMap, teamLookup }) {
  const fixtureIds = providerMap.sportmonks?.fixtureIds || {};
  const knownFixtureId = Object.entries(fixtureIds).find(
    ([, providerId]) => String(providerId) === String(providerFixture.id)
  )?.[0];

  if (knownFixtureId) {
    return fixtures.find((fixture) => fixture.id === knownFixtureId);
  }

  const mappedFixture = fixtures.find(
    (fixture) => String(fixture.providerIds?.sportmonks?.fixtureId || "") === String(providerFixture.id)
  );
  if (mappedFixture) {
    return mappedFixture;
  }

  const participants = getProviderParticipants(providerFixture);
  const homeTeamId = findTeamIdForParticipant(participants.home, teamLookup);
  const awayTeamId = findTeamIdForParticipant(participants.away, teamLookup);
  const startingAt = providerFixture.starting_at || providerFixture.starting_at_timestamp;

  if (!homeTeamId || !awayTeamId || !startingAt) {
    return null;
  }

  const providerKickoff = new Date(startingAt);
  return fixtures.find((fixture) => {
    const kickoff = new Date(fixture.kickoffUtc);
    const sameTeams = fixture.homeTeamId === homeTeamId && fixture.awayTeamId === awayTeamId;
    const closeKickoff = Math.abs(kickoff.getTime() - providerKickoff.getTime()) < 6 * 60 * 60 * 1000;
    return sameTeams && closeKickoff;
  });
}

function getProviderStatus(providerFixture) {
  const text = normalizeKey(
    [
      providerFixture.state?.short_name,
      providerFixture.state?.name,
      providerFixture.state?.developer_name,
      providerFixture.result_info,
      providerFixture.status
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (/cancel/.test(text)) {
    return "CANCELLED";
  }

  if (/postpon/.test(text)) {
    return "POSTPONED";
  }

  if (/\bft\b|finish|ended|after extra|full time/.test(text)) {
    return "FT";
  }

  if (/live|in play|1st|2nd|half|break|extra time|penalt/.test(text)) {
    return "LIVE";
  }

  return "SCHEDULED";
}

function getProviderScore(providerFixture, participants) {
  const rows = asArray(providerFixture.scores);
  const preferred =
    rows.filter((row) => normalizeKey(row.description) === "current") ||
    rows;
  const scoreRows = preferred.length ? preferred : rows;
  const score = {};

  for (const row of scoreRows) {
    const goals = Number(row.score?.goals ?? row.score?.score ?? row.goals);
    if (!Number.isFinite(goals)) {
      continue;
    }

    const participantId = String(row.participant_id || row.score?.participant_id || "");
    const location = normalizeKey(row.score?.participant || row.participant || row.location);

    if (participantId && String(participants.home?.id) === participantId) {
      score.home = goals;
    } else if (participantId && String(participants.away?.id) === participantId) {
      score.away = goals;
    } else if (location === "home") {
      score.home = goals;
    } else if (location === "away") {
      score.away = goals;
    }
  }

  return Number.isFinite(score.home) && Number.isFinite(score.away) ? score : null;
}

function statusRank(status) {
  return {
    SCHEDULED: 0,
    LIVE: 1,
    FT: 2,
    POSTPONED: 3,
    CANCELLED: 3
  }[status] ?? 0;
}

function mergeProviderFixtures({ checkedAt, fixturesData, providerFixtures, providerMap, teams }) {
  const teamLookup = buildTeamLookup(teams, providerMap);
  const fixtures = fixturesData.fixtures.map((fixture) => ({ ...fixture }));
  let matchedCount = 0;
  let updateCount = 0;

  for (const providerFixture of providerFixtures) {
    const fixture = findMatchingFixture({
      fixtures,
      providerFixture,
      providerMap,
      teamLookup
    });

    if (!fixture) {
      continue;
    }

    matchedCount += 1;
    const participants = getProviderParticipants(providerFixture);
    const providerStatus = getProviderStatus(providerFixture);
    const providerScore = getProviderScore(providerFixture, participants);
    const nextStatus =
      statusRank(providerStatus) >= statusRank(fixture.status) ? providerStatus : fixture.status;
    const before = JSON.stringify({
      providerIds: fixture.providerIds,
      score: fixture.score,
      status: fixture.status
    });

    fixture.status = nextStatus;
    fixture.providerIds = {
      ...(fixture.providerIds || {}),
      sportmonks: {
        awayParticipantId: participants.away?.id || null,
        fixtureId: providerFixture.id,
        homeParticipantId: participants.home?.id || null
      }
    };

    if ((nextStatus === "LIVE" || nextStatus === "FT") && providerScore) {
      fixture.score = providerScore;
    }

    const after = JSON.stringify({
      providerIds: fixture.providerIds,
      score: fixture.score,
      status: fixture.status
    });

    if (before !== after) {
      updateCount += 1;
    }
  }

  return {
    fixturesData: {
      ...fixturesData,
      sourceIds: [...new Set([...(fixturesData.sourceIds || []), getSportmonksSourceId(checkedAt)])],
      updatedAt: checkedAt,
      fixtures
    },
    matchedCount,
    updateCount
  };
}

function getSportmonksSourceId(checkedAt) {
  return `sportmonks-auto-${checkedAt.slice(0, 10)}`;
}

function addSportmonksSource({ checkedAt, tournamentData, updateCount }) {
  const sourceId = getSportmonksSourceId(checkedAt);
  const nextSources = (tournamentData.sources || []).filter((source) => source.id !== sourceId);

  nextSources.push({
    id: sourceId,
    label: "Sportmonks Football API automatic sync",
    url: "https://docs.sportmonks.com/v3/tutorials-and-guides/tutorials/livescores-and-fixtures/fixtures",
    type: "provider",
    checkedAt,
    note: `${updateCount} fixture update${updateCount === 1 ? "" : "s"} merged from provider data.`
  });

  return {
    ...tournamentData,
    sources: nextSources,
    updatedAt: checkedAt
  };
}

function createEmptyStanding(teamId) {
  return {
    teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0
  };
}

function applyResult(table, fixture) {
  const home = table.get(fixture.homeTeamId);
  const away = table.get(fixture.awayTeamId);

  if (!home || !away) {
    return;
  }

  home.played += 1;
  away.played += 1;
  home.gf += fixture.score.home;
  home.ga += fixture.score.away;
  away.gf += fixture.score.away;
  away.ga += fixture.score.home;

  if (fixture.score.home > fixture.score.away) {
    home.wins += 1;
    away.losses += 1;
  } else if (fixture.score.away > fixture.score.home) {
    away.wins += 1;
    home.losses += 1;
  } else {
    home.draws += 1;
    away.draws += 1;
  }
}

function points(row) {
  return row.wins * 3 + row.draws;
}

function goalDifference(row) {
  return row.gf - row.ga;
}

function recomputeStandings({ checkedAt, fixturesData, standingsData, tournamentData }) {
  const existingOrder = new Map();
  for (const [groupId, rows] of Object.entries(standingsData.groups || {})) {
    rows.forEach((row, index) => existingOrder.set(`${groupId}:${row.teamId}`, index));
  }

  const groups = Object.fromEntries(
    (tournamentData.groups || []).map((group) => [
      group.id,
      new Map(group.teamIds.map((teamId) => [teamId, createEmptyStanding(teamId)]))
    ])
  );

  for (const fixture of fixturesData.fixtures || []) {
    if (
      fixture.stage === "group" &&
      fixture.status === "FT" &&
      fixture.score &&
      groups[fixture.groupId]
    ) {
      applyResult(groups[fixture.groupId], fixture);
    }
  }

  const standingsGroups = {};
  for (const [groupId, table] of Object.entries(groups)) {
    standingsGroups[groupId] = [...table.values()].sort(
      (a, b) =>
        points(b) - points(a) ||
        goalDifference(b) - goalDifference(a) ||
        b.gf - a.gf ||
        (existingOrder.get(`${groupId}:${a.teamId}`) ?? 99) -
          (existingOrder.get(`${groupId}:${b.teamId}`) ?? 99)
    );
  }

  return {
    ...standingsData,
    sourceIds: [...new Set([...(standingsData.sourceIds || []), getSportmonksSourceId(checkedAt)])],
    updatedAt: checkedAt,
    groups: standingsGroups
  };
}
