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
const DEFAULT_LIVE_DATA_CACHE_SECONDS = 30 * 60;
const DEFAULT_LIVE_DATA_STALE_SECONDS = 30 * 60;
const FOOTBALL_DATA_PROVIDER_KEY = "footballData";
const API_FOOTBALL_PROVIDER_KEY = "apiFootball";
const SPORTMONKS_PROVIDER_KEY = "sportmonks";
const FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";
const FOOTBALL_DATA_DEFAULT_COMPETITION = "WC";
const FOOTBALL_DATA_DEFAULT_SEASON = "2026";
const FOOTBALL_DATA_DEFAULT_WINDOW_BEFORE_DAYS = 2;
const FOOTBALL_DATA_DEFAULT_WINDOW_AFTER_DAYS = 2;
const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";
const API_FOOTBALL_DEFAULT_LEAGUE_ID = "1";
const API_FOOTBALL_DEFAULT_SEASON = "2026";
const SPORTMONKS_BASE_URL = "https://api.sportmonks.com/v3/football";
const SPORTMONKS_FIXTURE_INCLUDE = "participants;scores;state";
const FIFA_API_URL = "https://api.fifa.com/api/v3/calendar/matches";
const FIFA_TIMELINE_URL = "https://api.fifa.com/api/v3/timelines";
const FIFA_SCHEDULE_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums";
const FIFA_DEFAULT_COMPETITION_ID = "17";
const FIFA_DEFAULT_SEASON_ID = "285023";
const FIFA_PROVIDER_KEY = "fifa";
const FIFA_GOAL_EVENTS_SOURCE_PREFIX = "fifa-official-goal-events-auto";
const DEFAULT_FIFA_GOAL_EVENTS_TIMEOUT_MS = 5000;
const DEFAULT_FIFA_GOAL_EVENTS_MAX_FIXTURES = 8;
const PROVIDER_ALIASES = {
  footballdata: FOOTBALL_DATA_PROVIDER_KEY,
  "football-data": FOOTBALL_DATA_PROVIDER_KEY,
  "football data": FOOTBALL_DATA_PROVIDER_KEY,
  "football-data.org": FOOTBALL_DATA_PROVIDER_KEY,
  "football data org": FOOTBALL_DATA_PROVIDER_KEY,
  apifootball: API_FOOTBALL_PROVIDER_KEY,
  "api-football": API_FOOTBALL_PROVIDER_KEY,
  "api football": API_FOOTBALL_PROVIDER_KEY,
  apisports: API_FOOTBALL_PROVIDER_KEY,
  "api-sports": API_FOOTBALL_PROVIDER_KEY,
  "api sports": API_FOOTBALL_PROVIDER_KEY,
  sportmonks: SPORTMONKS_PROVIDER_KEY
};
const TEAM_NAME_ALIASES = {
  "bosnia herzegovina": "BIH",
  "cape verde": "CPV",
  "cape verde islands": "CPV",
  "czech republic": "CZE",
  iran: "IRN",
  "ivory coast": "CIV",
  turkey: "TUR"
};

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
  const provider = getLiveDataProvider();
  const checkedAt = new Date().toISOString();
  const cacheControl = getLiveDataCacheControl(provider);

  if (!provider.ok) {
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
          provider: provider.name,
          reason: provider.reason
        }
      },
      cacheControl
    );
    return;
  }

  try {
    const providerFixtures = await provider.fetchFixtures({
      providerMap,
      timeZone: process.env.SYNC_TIMEZONE || DEFAULT_TIME_ZONE
    });
    const merge = mergeProviderFixtures({
      checkedAt,
      fixturesData,
      provider,
      providerFixtures,
      providerMap,
      teams: teamsData.teams
    });
    const goalEventMerge = await mergeOfficialGoalEvents({
      checkedAt,
      fixturesData: merge.fixturesData,
      teams: teamsData.teams,
      timeZone: process.env.SYNC_TIMEZONE || DEFAULT_TIME_ZONE
    });
    const mergedStandingsData = recomputeStandings({
      checkedAt,
      fixturesData: goalEventMerge.fixturesData,
      provider,
      standingsData,
      tournamentData
    });
    const providerTournamentData = addProviderSource({
      checkedAt,
      provider,
      tournamentData,
      updateCount: merge.updateCount
    });
    const mergedTournamentData = addOfficialGoalEventsSource({
      checkedAt,
      goalEventMerge,
      tournamentData: providerTournamentData
    });

    sendJson(
      response,
      200,
      {
        fixturesData: goalEventMerge.fixturesData,
        standingsData: mergedStandingsData,
        tournamentData: mergedTournamentData,
        syncStatus: {
          checkedAt,
          goalEventFixtures: goalEventMerge.matchedCount,
          goalEventReason: goalEventMerge.reason || undefined,
          goalEventUpdates: goalEventMerge.updateCount,
          matchedFixtures: merge.matchedCount,
          ok: true,
          provider: provider.name,
          updatedFixtures: merge.updateCount
        }
      },
      cacheControl
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
          provider: provider.name,
          reason: error.message || "Unable to sync provider data"
        }
      },
      cacheControl
    );
  }
}

function sendJson(response, statusCode, payload, cacheControl) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  setCacheHeaders(response, cacheControl);
  response.end(JSON.stringify(payload));
}

function setCacheHeaders(response, cacheControl) {
  if (cacheControl === "no-store") {
    response.setHeader("Cache-Control", "no-store");
    response.removeHeader?.("CDN-Cache-Control");
    response.removeHeader?.("Vercel-CDN-Cache-Control");
    return;
  }

  response.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  response.setHeader("CDN-Cache-Control", cacheControl);
  response.setHeader("Vercel-CDN-Cache-Control", cacheControl);
}

function getLiveDataCacheControl(provider = {}) {
  const freshSeconds = positiveInteger(
    process.env.LIVE_DATA_CACHE_SECONDS,
    provider.defaultCacheSeconds || DEFAULT_LIVE_DATA_CACHE_SECONDS
  );
  const staleSeconds = positiveInteger(
    process.env.LIVE_DATA_STALE_SECONDS,
    provider.defaultStaleSeconds || DEFAULT_LIVE_DATA_STALE_SECONDS
  );
  return `public, s-maxage=${freshSeconds}, stale-while-revalidate=${staleSeconds}`;
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

function getLiveDataProvider() {
  const requestedProvider = getRequestedProviderKey();
  const footballDataToken = getFirstEnv([
    "FOOTBALL_DATA_API_KEY",
    "FOOTBALLDATA_API_KEY",
    "FOOTBALL_DATA_TOKEN"
  ]);
  const apiFootballToken = getFirstEnv([
    "API_FOOTBALL_API_KEY",
    "APIFOOTBALL_API_KEY",
    "API_SPORTS_API_KEY",
    "APISPORTS_API_KEY"
  ]);
  const sportmonksToken = process.env.SPORTMONKS_API_TOKEN;

  if (requestedProvider === FOOTBALL_DATA_PROVIDER_KEY) {
    return footballDataToken
      ? createFootballDataProvider(footballDataToken)
      : missingProvider("football-data.org", "FOOTBALL_DATA_API_KEY is not configured");
  }

  if (requestedProvider === API_FOOTBALL_PROVIDER_KEY) {
    return apiFootballToken
      ? createApiFootballProvider(apiFootballToken)
      : missingProvider("api-football", "API_FOOTBALL_API_KEY is not configured");
  }

  if (requestedProvider === SPORTMONKS_PROVIDER_KEY) {
    return sportmonksToken
      ? createSportmonksProvider(sportmonksToken)
      : missingProvider("sportmonks", "SPORTMONKS_API_TOKEN is not configured");
  }

  if (footballDataToken) {
    return createFootballDataProvider(footballDataToken);
  }

  if (apiFootballToken) {
    return createApiFootballProvider(apiFootballToken);
  }

  if (sportmonksToken) {
    return createSportmonksProvider(sportmonksToken);
  }

  return missingProvider(
    "none",
    "No live data provider is configured. Add FOOTBALL_DATA_API_KEY for free delayed-score sync."
  );
}

function getRequestedProviderKey() {
  const requested = normalizeKey(process.env.LIVE_DATA_PROVIDER);
  return PROVIDER_ALIASES[requested] || "";
}

function getFirstEnv(names) {
  for (const name of names) {
    if (process.env[name]) {
      return process.env[name];
    }
  }

  return "";
}

function missingProvider(name, reason) {
  return {
    ok: false,
    name,
    reason
  };
}

function createFootballDataProvider(token) {
  const client = createFootballDataClient({
    timeoutMs: positiveInteger(process.env.FOOTBALL_DATA_TIMEOUT_MS, DEFAULT_PROVIDER_TIMEOUT_MS),
    token
  });

  return {
    defaultCacheSeconds: 5 * 60,
    defaultStaleSeconds: 5 * 60,
    docsUrl: "https://www.football-data.org/documentation/quickstart",
    fetchFixtures: ({ providerMap, timeZone }) =>
      fetchFootballDataFixtures({
        footballData: client,
        providerMap,
        timeZone
      }),
    key: FOOTBALL_DATA_PROVIDER_KEY,
    label: "football-data.org delayed-score sync",
    name: "football-data.org",
    ok: true,
    sourcePrefix: "football-data-auto"
  };
}

function createApiFootballProvider(token) {
  const client = createApiFootballClient({
    maxPages: positiveInteger(process.env.API_FOOTBALL_MAX_PAGES, DEFAULT_PROVIDER_MAX_PAGES),
    timeoutMs: positiveInteger(process.env.API_FOOTBALL_TIMEOUT_MS, DEFAULT_PROVIDER_TIMEOUT_MS),
    token
  });

  return {
    docsUrl: "https://www.api-football.com/news/post/fifa-world-cup-2026-guide-to-using-data-with-api-sports",
    fetchFixtures: ({ providerMap, timeZone }) =>
      fetchApiFootballFixtures({
        apiFootball: client,
        providerMap,
        timeZone
      }),
    key: API_FOOTBALL_PROVIDER_KEY,
    label: "API-Football automatic sync",
    name: "api-football",
    ok: true,
    sourcePrefix: "api-football-auto"
  };
}

function createSportmonksProvider(token) {
  const client = createSportmonksClient({
    maxPages: positiveInteger(process.env.SPORTMONKS_MAX_PAGES, DEFAULT_PROVIDER_MAX_PAGES),
    timeoutMs: positiveInteger(process.env.SPORTMONKS_TIMEOUT_MS, DEFAULT_PROVIDER_TIMEOUT_MS),
    token
  });

  return {
    docsUrl: "https://docs.sportmonks.com/v3/tutorials-and-guides/tutorials/livescores-and-fixtures/fixtures",
    fetchFixtures: ({ providerMap, timeZone }) =>
      fetchSportmonksFixtures({
        providerMap,
        sportmonks: client,
        timeZone
      }),
    key: SPORTMONKS_PROVIDER_KEY,
    label: "Sportmonks Football API automatic sync",
    name: "sportmonks",
    ok: true,
    sourcePrefix: "sportmonks-auto"
  };
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

function hasEntries(value) {
  if (!value) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return typeof value === "object" && Object.keys(value).length > 0;
}

function summarizeProviderErrors(errors) {
  if (!errors) {
    return "";
  }

  if (Array.isArray(errors)) {
    return errors.join(", ");
  }

  if (typeof errors === "object") {
    return Object.values(errors).flat().join(", ");
  }

  return String(errors);
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

async function fetchWithTimeout(url, timeoutMs, providerName, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`${providerName} request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function createFootballDataClient({ timeoutMs, token }) {
  const baseUrl = process.env.FOOTBALL_DATA_BASE_URL || FOOTBALL_DATA_BASE_URL;

  return async function footballData(pathname, params = {}, headers = {}) {
    const url = new URL(`${baseUrl}${pathname}`);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }

    const apiResponse = await fetchWithTimeout(url, timeoutMs, "football-data.org", {
      headers: {
        "X-Auth-Token": token,
        ...headers
      }
    });
    const payload = await apiResponse.json().catch(() => ({}));

    if (!apiResponse.ok) {
      const detail = payload.message || payload.error || "";
      throw new Error(
        `football-data.org request failed with ${apiResponse.status}${detail ? `: ${detail}` : ""}`
      );
    }

    return payload;
  };
}

function createApiFootballClient({ maxPages, timeoutMs, token }) {
  const baseUrl = process.env.API_FOOTBALL_BASE_URL || API_FOOTBALL_BASE_URL;

  return async function apiFootball(pathname, params = {}) {
    const url = new URL(`${baseUrl}${pathname}`);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }

    const items = [];
    let page = positiveInteger(params.page, 1);
    let totalPages = 1;

    while (page <= totalPages) {
      if (page > maxPages) {
        throw new Error(`API-Football pagination exceeded ${maxPages} pages`);
      }

      url.searchParams.set("page", String(page));
      const apiResponse = await fetchWithTimeout(url, timeoutMs, "API-Football", {
        headers: {
          "x-apisports-key": token
        }
      });

      if (!apiResponse.ok) {
        throw new Error(`API-Football request failed with ${apiResponse.status}`);
      }

      const payload = await apiResponse.json();
      if (hasEntries(payload.errors)) {
        const detail = summarizeProviderErrors(payload.errors);
        throw new Error(`API-Football request returned an error${detail ? `: ${detail}` : ""}`);
      }

      items.push(...asArray(payload.response));
      totalPages = positiveInteger(payload.paging?.total, 1);
      page += 1;
    }

    return items;
  };
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

      const apiResponse = await fetchWithTimeout(nextUrl, timeoutMs, "Sportmonks");
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

function getSyncWindow({ afterDays, beforeDays, timeZone }) {
  const todayKey = getDayKey(new Date(), timeZone);
  const startKey = shiftDayKey(
    todayKey,
    -positiveInteger(beforeDays, DEFAULT_WINDOW_BEFORE_DAYS)
  );
  const endKey = shiftDayKey(
    todayKey,
    positiveInteger(afterDays, DEFAULT_WINDOW_AFTER_DAYS)
  );

  return { endKey, startKey };
}

async function fetchFootballDataFixtures({ footballData, providerMap, timeZone }) {
  const { endKey, startKey } = getSyncWindow({
    afterDays:
      process.env.FOOTBALL_DATA_WINDOW_AFTER_DAYS || FOOTBALL_DATA_DEFAULT_WINDOW_AFTER_DAYS,
    beforeDays:
      process.env.FOOTBALL_DATA_WINDOW_BEFORE_DAYS || FOOTBALL_DATA_DEFAULT_WINDOW_BEFORE_DAYS,
    timeZone
  });
  const competition = encodeURIComponent(
    String(
      process.env.FOOTBALL_DATA_COMPETITION ||
        providerMap.footballData?.competition ||
        FOOTBALL_DATA_DEFAULT_COMPETITION
    )
  );
  const season = String(
    process.env.FOOTBALL_DATA_SEASON ||
      providerMap.footballData?.season ||
      FOOTBALL_DATA_DEFAULT_SEASON
  );
  const payload = await footballData(
    `/competitions/${competition}/matches`,
    {
      dateFrom: startKey,
      dateTo: endKey,
      season
    },
    {
      "X-Unfold-Goals": "true"
    }
  );

  return asArray(payload.matches);
}

async function fetchApiFootballFixtures({ apiFootball, providerMap, timeZone }) {
  const { endKey, startKey } = getSyncWindow({
    afterDays: process.env.API_FOOTBALL_WINDOW_AFTER_DAYS,
    beforeDays: process.env.API_FOOTBALL_WINDOW_BEFORE_DAYS,
    timeZone
  });
  const leagueId = String(
    process.env.API_FOOTBALL_LEAGUE_ID ||
      providerMap.apiFootball?.leagueId ||
      API_FOOTBALL_DEFAULT_LEAGUE_ID
  );
  const season = String(
    process.env.API_FOOTBALL_SEASON ||
      providerMap.apiFootball?.season ||
      API_FOOTBALL_DEFAULT_SEASON
  );
  const fixtures = await apiFootball("/fixtures", {
    league: leagueId,
    season,
    timezone: process.env.API_FOOTBALL_TIMEZONE || timeZone
  });

  return fixtures.filter((fixture) => {
    const kickoff = getProviderKickoff(fixture, API_FOOTBALL_PROVIDER_KEY);
    if (!kickoff) {
      return false;
    }

    const kickoffKey = getDayKey(toProviderDate(kickoff), timeZone);
    return kickoffKey >= startKey && kickoffKey <= endKey;
  });
}

async function fetchSportmonksFixtures({ providerMap, sportmonks, timeZone }) {
  const { endKey, startKey } = getSyncWindow({
    afterDays: process.env.SPORTMONKS_WINDOW_AFTER_DAYS,
    beforeDays: process.env.SPORTMONKS_WINDOW_BEFORE_DAYS,
    timeZone
  });
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

function buildTeamLookup(teams, providerMap, providerKey) {
  const byName = new Map();
  const byProviderId = new Map();
  const providerTeamIds = providerMap[providerKey]?.teamIds || {};
  const teamIds = new Set(teams.map((team) => team.id));

  for (const team of teams) {
    for (const name of [team.name, team.officialName, ...(team.aliases || [])]) {
      byName.set(normalizeKey(name), team.id);
    }

    const providerId = providerTeamIds[team.id];
    if (providerId) {
      byProviderId.set(String(providerId), team.id);
    }
  }

  for (const [alias, teamId] of Object.entries(TEAM_NAME_ALIASES)) {
    if (teamIds.has(teamId)) {
      byName.set(normalizeKey(alias), teamId);
    }
  }

  return { byName, byProviderId };
}

function getProviderParticipants(providerFixture, providerKey) {
  if (providerKey === FOOTBALL_DATA_PROVIDER_KEY) {
    return {
      away: normalizeFootballDataParticipant(providerFixture.awayTeam, "away"),
      home: normalizeFootballDataParticipant(providerFixture.homeTeam, "home")
    };
  }

  if (providerKey === API_FOOTBALL_PROVIDER_KEY) {
    return {
      away: normalizeApiFootballParticipant(providerFixture.teams?.away, "away"),
      home: normalizeApiFootballParticipant(providerFixture.teams?.home, "home")
    };
  }

  const participants = asArray(providerFixture.participants);
  const home =
    participants.find((participant) => getParticipantLocation(participant) === "home") ||
    participants[0];
  const away =
    participants.find((participant) => getParticipantLocation(participant) === "away") ||
    participants[1];
  return { away, home };
}

function normalizeFootballDataParticipant(team, location) {
  return {
    id: team?.id,
    location,
    name: team?.name || team?.shortName || team?.tla
  };
}

function normalizeApiFootballParticipant(team, location) {
  return {
    id: team?.id,
    location,
    name: team?.name
  };
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
  const providerId = participant?.id || participant?.participant_id || participant?.team_id;
  if (providerId && teamLookup.byProviderId.has(String(providerId))) {
    return teamLookup.byProviderId.get(String(providerId));
  }

  return teamLookup.byName.get(
    normalizeKey(participant?.name || participant?.display_name || participant?.team_name)
  );
}

function findMatchingFixture({ fixtures, provider, providerFixture, providerMap, teamLookup }) {
  const fixtureIds = providerMap[provider.key]?.fixtureIds || {};
  const providerFixtureId = getProviderFixtureId(providerFixture, provider.key);
  const knownFixtureId = Object.entries(fixtureIds).find(
    ([, providerId]) => String(providerId) === String(providerFixtureId)
  )?.[0];

  if (knownFixtureId) {
    return fixtures.find((fixture) => fixture.id === knownFixtureId);
  }

  const mappedFixture = fixtures.find(
    (fixture) =>
      String(fixture.providerIds?.[provider.key]?.fixtureId || "") === String(providerFixtureId)
  );
  if (mappedFixture) {
    return mappedFixture;
  }

  const participants = getProviderParticipants(providerFixture, provider.key);
  const homeTeamId = findTeamIdForParticipant(participants.home, teamLookup);
  const awayTeamId = findTeamIdForParticipant(participants.away, teamLookup);
  const startingAt = getProviderKickoff(providerFixture, provider.key);

  if (!homeTeamId || !awayTeamId || !startingAt) {
    return null;
  }

  const providerKickoff = toProviderDate(startingAt);
  return fixtures.find((fixture) => {
    const kickoff = new Date(fixture.kickoffUtc);
    const sameTeams = fixture.homeTeamId === homeTeamId && fixture.awayTeamId === awayTeamId;
    const closeKickoff = Math.abs(kickoff.getTime() - providerKickoff.getTime()) < 6 * 60 * 60 * 1000;
    return sameTeams && closeKickoff;
  });
}

function getProviderFixtureId(providerFixture, providerKey) {
  if (providerKey === API_FOOTBALL_PROVIDER_KEY) {
    return providerFixture.fixture?.id;
  }

  return providerFixture.id;
}

function getProviderKickoff(providerFixture, providerKey) {
  if (providerKey === FOOTBALL_DATA_PROVIDER_KEY) {
    return providerFixture.utcDate;
  }

  if (providerKey === API_FOOTBALL_PROVIDER_KEY) {
    return providerFixture.fixture?.date || providerFixture.fixture?.timestamp;
  }

  return providerFixture.starting_at || providerFixture.starting_at_timestamp;
}

function toProviderDate(value) {
  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const timestamp = Number(value);
    return new Date(timestamp < 10 ** 12 ? timestamp * 1000 : timestamp);
  }

  return new Date(value);
}

function getProviderStatus(providerFixture, providerKey) {
  if (providerKey === FOOTBALL_DATA_PROVIDER_KEY) {
    const status = String(providerFixture.status || "").toUpperCase();

    if (status === "CANCELLED") {
      return "CANCELLED";
    }

    if (status === "POSTPONED") {
      return "POSTPONED";
    }

    if (["FINISHED", "AWARDED"].includes(status)) {
      return "FT";
    }

    if (["LIVE", "IN_PLAY", "PAUSED", "SUSPENDED"].includes(status)) {
      return "LIVE";
    }

    return "SCHEDULED";
  }

  if (providerKey === API_FOOTBALL_PROVIDER_KEY) {
    const status = String(providerFixture.fixture?.status?.short || "").toUpperCase();

    if (["CANC", "ABD"].includes(status)) {
      return "CANCELLED";
    }

    if (status === "PST") {
      return "POSTPONED";
    }

    if (["FT", "AET", "PEN"].includes(status)) {
      return "FT";
    }

    if (["1H", "HT", "2H", "ET", "P", "BT", "LIVE", "SUSP", "INT"].includes(status)) {
      return "LIVE";
    }

    return "SCHEDULED";
  }

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

function getProviderScore(providerFixture, participants, providerKey) {
  if (providerKey === FOOTBALL_DATA_PROVIDER_KEY) {
    const fullTime = providerFixture.score?.fullTime || {};
    const home = Number(fullTime.home ?? fullTime.homeTeam);
    const away = Number(fullTime.away ?? fullTime.awayTeam);
    return Number.isFinite(home) && Number.isFinite(away) ? { away, home } : null;
  }

  if (providerKey === API_FOOTBALL_PROVIDER_KEY) {
    const home = Number(providerFixture.goals?.home);
    const away = Number(providerFixture.goals?.away);
    return Number.isFinite(home) && Number.isFinite(away) ? { away, home } : null;
  }

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

function mergeProviderFixtures({ checkedAt, fixturesData, provider, providerFixtures, providerMap, teams }) {
  const teamLookup = buildTeamLookup(teams, providerMap, provider.key);
  const fixtures = fixturesData.fixtures.map((fixture) => ({ ...fixture }));
  let matchedCount = 0;
  let updateCount = 0;

  for (const providerFixture of providerFixtures) {
    const fixture = findMatchingFixture({
      fixtures,
      provider,
      providerFixture,
      providerMap,
      teamLookup
    });

    if (!fixture) {
      continue;
    }

    matchedCount += 1;
    const participants = getProviderParticipants(providerFixture, provider.key);
    const providerStatus = getProviderStatus(providerFixture, provider.key);
    const providerScore = getProviderScore(providerFixture, participants, provider.key);
    const nextStatus =
      statusRank(providerStatus) >= statusRank(fixture.status) ? providerStatus : fixture.status;
    const before = JSON.stringify({
      providerIds: fixture.providerIds,
      score: fixture.score,
      scoreUpdatedAt: fixture.scoreUpdatedAt,
      status: fixture.status
    });

    fixture.status = nextStatus;
    fixture.providerIds = {
      ...(fixture.providerIds || {}),
      [provider.key]: {
        awayParticipantId: participants.away?.id || null,
        fixtureId: getProviderFixtureId(providerFixture, provider.key),
        homeParticipantId: participants.home?.id || null
      }
    };

    if ((nextStatus === "LIVE" || nextStatus === "FT") && providerScore) {
      fixture.score = providerScore;
      if (nextStatus === "LIVE") {
        fixture.scoreUpdatedAt = checkedAt;
      }
    }

    const after = JSON.stringify({
      providerIds: fixture.providerIds,
      score: fixture.score,
      scoreUpdatedAt: fixture.scoreUpdatedAt,
      status: fixture.status
    });

    if (before !== after) {
      updateCount += 1;
    }
  }

  return {
    fixturesData: {
      ...fixturesData,
      sourceIds: [
        ...new Set([...(fixturesData.sourceIds || []), getProviderSourceId(provider, checkedAt)])
      ],
      updatedAt: checkedAt,
      fixtures
    },
    matchedCount,
    updateCount
  };
}

async function mergeOfficialGoalEvents({ checkedAt, fixturesData, teams, timeZone }) {
  if (!isOfficialGoalEventsEnabled()) {
    return {
      fixturesData,
      matchedCount: 0,
      reason: "FIFA goal-event enrichment is disabled",
      updateCount: 0
    };
  }

  const fixtures = fixturesData.fixtures.map((fixture) => ({ ...fixture }));
  const maxFixtures = positiveInteger(
    process.env.FIFA_GOAL_EVENTS_MAX_FIXTURES,
    DEFAULT_FIFA_GOAL_EVENTS_MAX_FIXTURES
  );
  const candidates = fixtures.filter(needsGoalEventEnrichment).slice(0, maxFixtures);

  if (!candidates.length) {
    return { fixturesData, matchedCount: 0, updateCount: 0 };
  }

  try {
    const officialMatches = await fetchOfficialMatchesForGoalEvents(candidates, timeZone);
    const officialIndex = indexOfficialGoalEventMatches(
      officialMatches,
      buildTeamLookup(teams || [], {}, FIFA_PROVIDER_KEY)
    );
    const warnings = [];
    let matchedCount = 0;
    let updateCount = 0;

    await Promise.all(
      candidates.map(async (fixture) => {
        const officialMatch = findOfficialGoalEventMatch(fixture, officialIndex);
        if (!officialMatch?.IdMatch) {
          warnings.push(`${fixture.id}: no official FIFA match id found`);
          return;
        }

        matchedCount += 1;
        const metadataUpdated = mergeOfficialGoalEventMetadata(fixture, officialMatch);
        let fixtureUpdated = metadataUpdated;

        try {
          const timeline = await fetchOfficialGoalTimeline(officialMatch.IdMatch);
          const goals = goalsFromOfficialTimeline(timeline);
          const expectedTotal = scoreTotal(fixture.score);
          const actualTotal = goals.home.length + goals.away.length;

          if (expectedTotal === null || actualTotal !== expectedTotal) {
            warnings.push(
              `${fixture.id}: timeline goal count ${actualTotal} does not match score total ${expectedTotal}`
            );
            if (fixtureUpdated) {
              updateCount += 1;
            }
            return;
          }

          if (!sameGoals(fixture.goalsHome, goals.home) || !sameGoals(fixture.goalsAway, goals.away)) {
            fixture.goalsHome = goals.home;
            fixture.goalsAway = goals.away;
            fixtureUpdated = true;
          }

          if (fixtureUpdated) {
            updateCount += 1;
          }
        } catch (error) {
          if (fixtureUpdated) {
            updateCount += 1;
          }
          warnings.push(`${fixture.id}: ${error.message || "unable to fetch FIFA timeline"}`);
        }
      })
    );

    const sourceId = getOfficialGoalEventsSourceId(checkedAt);
    const sourceIds =
      matchedCount || updateCount
        ? [...new Set([...(fixturesData.sourceIds || []), sourceId])]
        : fixturesData.sourceIds;
    return {
      fixturesData: {
        ...fixturesData,
        sourceIds,
        updatedAt: updateCount ? checkedAt : fixturesData.updatedAt,
        fixtures
      },
      matchedCount,
      reason: warnings.join("; "),
      updateCount
    };
  } catch (error) {
    return {
      fixturesData,
      matchedCount: 0,
      reason: error.message || "Unable to sync FIFA goal-event timelines",
      updateCount: 0
    };
  }
}

function isOfficialGoalEventsEnabled() {
  const value = process.env.FIFA_GOAL_EVENTS_ENABLED;
  if (value === undefined || value === null || value === "") {
    return true;
  }

  return !["0", "false", "no", "off"].includes(normalizeKey(value));
}

function scoreValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function scoreTotal(score) {
  const home = scoreValue(score?.home);
  const away = scoreValue(score?.away);
  return home === null || away === null ? null : home + away;
}

function goalEventCount(fixture) {
  return (fixture.goalsHome?.length || 0) + (fixture.goalsAway?.length || 0);
}

function needsGoalEventEnrichment(fixture) {
  if (!["LIVE", "FT"].includes(fixture.status) || !fixture.homeTeamId || !fixture.awayTeamId) {
    return false;
  }

  const total = scoreTotal(fixture.score);
  return total !== null && total > 0 && goalEventCount(fixture) !== total;
}

function getFixtureWindow(fixtures, timeZone) {
  const keys = fixtures
    .map((fixture) => (fixture.kickoffUtc ? getDayKey(new Date(fixture.kickoffUtc), timeZone) : ""))
    .filter(Boolean)
    .sort();
  const startKey = keys[0] || getDayKey(new Date(), timeZone);
  const endKey = keys[keys.length - 1] || startKey;

  return {
    endKey: shiftDayKey(endKey, 1),
    startKey: shiftDayKey(startKey, -1)
  };
}

async function fetchOfficialMatchesForGoalEvents(fixtures, timeZone) {
  const { endKey, startKey } = getFixtureWindow(fixtures, timeZone);
  const url = new URL(FIFA_API_URL);
  url.searchParams.set("language", "en");
  url.searchParams.set("count", "500");
  url.searchParams.set("idCompetition", process.env.FIFA_COMPETITION_ID || FIFA_DEFAULT_COMPETITION_ID);
  url.searchParams.set("idSeason", process.env.FIFA_SEASON_ID || FIFA_DEFAULT_SEASON_ID);
  url.searchParams.set("from", startKey);
  url.searchParams.set("to", endKey);

  const payload = await fetchJsonWithTimeout(url, "FIFA schedule");
  return asArray(payload.Results || payload.results || payload);
}

async function fetchOfficialGoalTimeline(idMatch) {
  const url = new URL(`${FIFA_TIMELINE_URL}/${idMatch}`);
  url.searchParams.set("language", "en");
  return fetchJsonWithTimeout(url, `FIFA timeline ${idMatch}`);
}

async function fetchJsonWithTimeout(url, label) {
  const timeoutMs = positiveInteger(
    process.env.FIFA_GOAL_EVENTS_TIMEOUT_MS,
    DEFAULT_FIFA_GOAL_EVENTS_TIMEOUT_MS
  );
  const apiResponse = await fetchWithTimeout(url, timeoutMs, label);
  const payload = await apiResponse.json().catch(() => ({}));

  if (!apiResponse.ok) {
    const detail = payload.message || payload.error || "";
    throw new Error(`${label} request failed with ${apiResponse.status}${detail ? `: ${detail}` : ""}`);
  }

  return payload;
}

function description(values) {
  return values?.find((value) => value.Locale === "en-GB")?.Description || values?.[0]?.Description || "";
}

function officialParticipantAbbreviation(match, side) {
  return match?.[side]?.Abbreviation || "";
}

function officialDescriptions(values) {
  return Array.isArray(values)
    ? values.map((value) => value?.Description).filter(Boolean)
    : [];
}

function officialParticipantNames(participant) {
  if (!participant) {
    return [];
  }

  return [
    participant.Abbreviation,
    participant.IdCountry,
    participant.IdAssociation,
    participant.Name,
    participant.ShortName,
    participant.DisplayName,
    ...officialDescriptions(participant.TeamName),
    ...officialDescriptions(participant.NameLocalized),
    ...officialDescriptions(participant.ShortClubName)
  ].filter(Boolean);
}

function officialParticipantTeamId(participant, teamLookup) {
  for (const name of officialParticipantNames(participant)) {
    const teamId = teamLookup.byName.get(normalizeKey(name));
    if (teamId) {
      return teamId;
    }
  }

  return "";
}

function officialGoalEventPairKey(match, teamLookup) {
  const home =
    officialParticipantAbbreviation(match, "Home") ||
    officialParticipantTeamId(match?.Home, teamLookup);
  const away =
    officialParticipantAbbreviation(match, "Away") ||
    officialParticipantTeamId(match?.Away, teamLookup);

  return home && away ? `${home}:${away}` : "";
}

function getFixtureFifaMatchId(fixture) {
  return (
    fixture.providerIds?.[FIFA_PROVIDER_KEY]?.matchId ||
    fixture.providerIds?.[FIFA_PROVIDER_KEY]?.idMatch ||
    fixture.fifaMatchId ||
    ""
  );
}

function getOfficialGoalEventProviderIds(match) {
  const providerIds = {};
  const matchNumber = Number(match.MatchNumber);

  if (match.IdMatch) {
    providerIds.matchId = String(match.IdMatch);
  }

  if (Number.isInteger(matchNumber) && matchNumber > 0) {
    providerIds.matchNumber = matchNumber;
  }

  return providerIds;
}

function mergeOfficialGoalEventMetadata(fixture, match) {
  const providerIds = getOfficialGoalEventProviderIds(match);
  const matchNumber = Number(match.MatchNumber);
  let updated = false;

  if (Object.keys(providerIds).length) {
    const before = JSON.stringify(fixture.providerIds?.[FIFA_PROVIDER_KEY] || {});
    fixture.providerIds = {
      ...(fixture.providerIds || {}),
      [FIFA_PROVIDER_KEY]: {
        ...(fixture.providerIds?.[FIFA_PROVIDER_KEY] || {}),
        ...providerIds
      }
    };
    updated = updated || before !== JSON.stringify(fixture.providerIds[FIFA_PROVIDER_KEY]);
  }

  if (Number.isInteger(matchNumber) && matchNumber > 0 && fixture.matchNumber !== matchNumber) {
    fixture.matchNumber = matchNumber;
    updated = true;
  }

  return updated;
}

function indexOfficialGoalEventMatches(matches, teamLookup) {
  const byMatchId = new Map();
  const byMatchNumber = new Map();
  const byParticipants = new Map();
  const byParticipantsAndKickoff = new Map();

  for (const match of matches) {
    if (match.IdMatch) {
      byMatchId.set(String(match.IdMatch), match);
    }

    if (match.MatchNumber) {
      byMatchNumber.set(Number(match.MatchNumber), match);
    }

    const pairKey = officialGoalEventPairKey(match, teamLookup);
    if (!pairKey) {
      continue;
    }

    if (!byParticipants.has(pairKey)) {
      byParticipants.set(pairKey, []);
    }
    byParticipants.get(pairKey).push(match);

    if (match.Date) {
      byParticipantsAndKickoff.set(`${pairKey}:${match.Date}`, match);
    }
  }

  return { byMatchId, byMatchNumber, byParticipants, byParticipantsAndKickoff };
}

function findOfficialGoalEventMatch(fixture, officialIndex) {
  const fifaMatchId = getFixtureFifaMatchId(fixture);
  if (fifaMatchId) {
    const match = officialIndex.byMatchId.get(String(fifaMatchId));
    if (match) {
      return match;
    }
  }

  if (fixture.matchNumber) {
    return officialIndex.byMatchNumber.get(Number(fixture.matchNumber)) || null;
  }

  const exactKey = `${fixture.homeTeamId}:${fixture.awayTeamId}:${fixture.kickoffUtc}`;
  const exactMatch = officialIndex.byParticipantsAndKickoff.get(exactKey);
  if (exactMatch) {
    return exactMatch;
  }

  const candidates = officialIndex.byParticipants.get(`${fixture.homeTeamId}:${fixture.awayTeamId}`) || [];
  const kickoff = new Date(fixture.kickoffUtc).getTime();
  return (
    candidates.find((match) => Math.abs(new Date(match.Date).getTime() - kickoff) < 6 * 60 * 60 * 1000) ||
    null
  );
}

function parseGoalMinute(value) {
  const match = /^(\d+)'(?:\+(\d+)')?$/.exec(String(value || "").trim());

  if (!match) {
    return {};
  }

  return {
    minute: Number(match[1]),
    ...(match[2] ? { offset: Number(match[2]) } : {})
  };
}

function titleCaseName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .split(/(\s+|-|')/)
    .map((part, index, parts) => {
      if (/^\s+$|^-|'$/.test(part) || !part) {
        return part;
      }

      const previous = parts[index - 1] || "";
      if (previous === "'" || previous === "-") {
        return `${part[0].toUpperCase()}${part.slice(1)}`;
      }

      if (/^mc[a-z]+/.test(part)) {
        return `Mc${part[2].toUpperCase()}${part.slice(3)}`;
      }

      return `${part[0].toUpperCase()}${part.slice(1)}`;
    })
    .join("");
}

function playerNameFromOfficialEvent(event) {
  const text = description(event.EventDescription);
  const match = /^(.+?)\s+\([^)]+\)\s+(?:scores|successfully converts|scores an own goal)/i.exec(text);

  return titleCaseName(match?.[1] || "");
}

function isOfficialScoringEvent(event) {
  return event.Type === 0 || event.Type === 34 || event.Type === 41;
}

function goalsFromOfficialTimeline(timeline) {
  const goals = { home: [], away: [] };
  let previousHome = 0;
  let previousAway = 0;

  for (const event of timeline.Event || []) {
    const homeGoals = Number(event.HomeGoals);
    const awayGoals = Number(event.AwayGoals);

    if (!isOfficialScoringEvent(event)) {
      if (Number.isFinite(homeGoals)) {
        previousHome = homeGoals;
      }
      if (Number.isFinite(awayGoals)) {
        previousAway = awayGoals;
      }
      continue;
    }

    const homeDelta = Number.isFinite(homeGoals) ? homeGoals - previousHome : 0;
    const awayDelta = Number.isFinite(awayGoals) ? awayGoals - previousAway : 0;
    const side = homeDelta > 0 ? "home" : awayDelta > 0 ? "away" : "";
    const name = playerNameFromOfficialEvent(event);

    if (side && name) {
      goals[side].push({
        ...parseGoalMinute(event.MatchMinute),
        name,
        ...(event.Type === 34 ? { ownGoal: true } : {}),
        ...(event.Type === 41 ? { penalty: true } : {})
      });
    }

    if (Number.isFinite(homeGoals)) {
      previousHome = homeGoals;
    }
    if (Number.isFinite(awayGoals)) {
      previousAway = awayGoals;
    }
  }

  return goals;
}

function sameGoals(left, right) {
  return JSON.stringify(left || []) === JSON.stringify(right || []);
}

function getProviderSourceId(provider, checkedAt) {
  return `${provider.sourcePrefix}-${checkedAt.slice(0, 10)}`;
}

function getOfficialGoalEventsSourceId(checkedAt) {
  return `${FIFA_GOAL_EVENTS_SOURCE_PREFIX}-${checkedAt.slice(0, 10)}`;
}

function addProviderSource({ checkedAt, provider, tournamentData, updateCount }) {
  const sourceId = getProviderSourceId(provider, checkedAt);
  const nextSources = (tournamentData.sources || []).filter((source) => source.id !== sourceId);

  nextSources.push({
    id: sourceId,
    label: provider.label,
    url: provider.docsUrl,
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

function addOfficialGoalEventsSource({ checkedAt, goalEventMerge, tournamentData }) {
  if (!goalEventMerge.matchedCount && !goalEventMerge.updateCount) {
    return tournamentData;
  }

  const sourceId = getOfficialGoalEventsSourceId(checkedAt);
  const nextSources = (tournamentData.sources || []).filter((source) => source.id !== sourceId);

  nextSources.push({
    id: sourceId,
    label: "FIFA official goal event timeline sync",
    url: FIFA_SCHEDULE_URL,
    type: "official",
    checkedAt,
    note: `${goalEventMerge.updateCount} fixture goal-event update${
      goalEventMerge.updateCount === 1 ? "" : "s"
    } merged from ${goalEventMerge.matchedCount} matched FIFA timeline${
      goalEventMerge.matchedCount === 1 ? "" : "s"
    }.`
  });

  return {
    ...tournamentData,
    sourceIds: [...new Set([...(tournamentData.sourceIds || []), sourceId])],
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

function recomputeStandings({ checkedAt, fixturesData, provider, standingsData, tournamentData }) {
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
    sourceIds: [
      ...new Set([...(standingsData.sourceIds || []), getProviderSourceId(provider, checkedAt)])
    ],
    updatedAt: checkedAt,
    groups: standingsGroups
  };
}
