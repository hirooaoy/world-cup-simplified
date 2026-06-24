#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const FIFA_API_URL = "https://api.fifa.com/api/v3/calendar/matches";
const FIFA_SCHEDULE_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums";
const FIFA_COMPETITION_ID = process.env.FIFA_COMPETITION_ID || "17";
const FIFA_SEASON_ID = process.env.FIFA_SEASON_ID || "285023";
const FIFA_PROVIDER_KEY = "fifa";
const FIFA_SYNC_SOURCE_PREFIX = "fifa-official-results-sync";
const FIFA_SYNC_RETRIES = positiveInteger(process.env.FIFA_SYNC_RETRIES, 3);
const FIFA_SYNC_RETRY_DELAY_MS = positiveInteger(process.env.FIFA_SYNC_RETRY_DELAY_MS, 1500);
const shouldWrite = !process.argv.includes("--check");
const skipUnchangedWrites = process.argv.includes("--skip-unchanged");
const checkedAt = process.env.FIFA_SYNC_CHECKED_AT || new Date().toISOString();

function positiveInteger(value, fallback) {
  const number = Number(value);

  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

async function writeJson(fileName, value) {
  await writeFile(path.join(dataDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
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

function description(values) {
  return values?.find((value) => value.Locale === "en-GB")?.Description || values?.[0]?.Description || "";
}

function descriptions(values) {
  return Array.isArray(values)
    ? values.map((value) => value?.Description).filter(Boolean)
    : [];
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

function participantAbbreviation(match, side) {
  return match?.[side]?.Abbreviation || "";
}

function sourceIdForDate(value) {
  return `${FIFA_SYNC_SOURCE_PREFIX}-${value.slice(0, 10)}`;
}

function buildTeamLookup(teams) {
  const byName = new Map();

  for (const team of teams || []) {
    for (const value of [team.id, team.name, team.officialName, team.standingName, ...(team.aliases || [])]) {
      const key = normalizeKey(value);
      if (key && !byName.has(key)) {
        byName.set(key, team.id);
      }
    }
  }

  return byName;
}

function getOfficialParticipantNames(participant) {
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
    ...descriptions(participant.TeamName),
    ...descriptions(participant.NameLocalized),
    ...descriptions(participant.ShortClubName)
  ].filter(Boolean);
}

function findOfficialParticipantTeamId(match, side, teamLookup) {
  for (const name of getOfficialParticipantNames(match?.[side])) {
    const teamId = teamLookup.get(normalizeKey(name));
    if (teamId) {
      return teamId;
    }
  }

  return "";
}

function officialPairKey(match, teamLookup) {
  const home =
    participantAbbreviation(match, "Home") ||
    findOfficialParticipantTeamId(match, "Home", teamLookup);
  const away =
    participantAbbreviation(match, "Away") ||
    findOfficialParticipantTeamId(match, "Away", teamLookup);

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

function getFifaProviderIds(match) {
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

function mergeFifaMetadata(fixture, match) {
  const providerIds = getFifaProviderIds(match);
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

async function fetchOfficialSchedule(fixturesData) {
  const [from, to] = fixturesData.coverage?.loadedDateRange || ["2026-06-11", "2026-07-19"];
  const url = new URL(FIFA_API_URL);
  url.searchParams.set("language", "en");
  url.searchParams.set("count", "500");
  url.searchParams.set("idCompetition", FIFA_COMPETITION_ID);
  url.searchParams.set("idSeason", FIFA_SEASON_ID);
  url.searchParams.set("from", from);
  url.searchParams.set("to", addDays(to, 1));

  let lastError;

  for (let attempt = 1; attempt <= FIFA_SYNC_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`FIFA schedule request failed with ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;

      if (attempt < FIFA_SYNC_RETRIES) {
        await wait(FIFA_SYNC_RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError;
}

function indexOfficialMatches(matches, teamLookup) {
  const byMatchId = new Map();
  const byMatchNumber = new Map();
  const byParticipantsAndKickoff = new Map();
  const byParticipants = new Map();

  for (const match of matches) {
    if (match.IdMatch) {
      byMatchId.set(String(match.IdMatch), match);
    }

    if (match.MatchNumber) {
      byMatchNumber.set(Number(match.MatchNumber), match);
    }

    const pairKey = officialPairKey(match, teamLookup);
    if (pairKey && match.Date) {
      byParticipantsAndKickoff.set(`${pairKey}:${match.Date}`, match);
      if (!byParticipants.has(pairKey)) {
        byParticipants.set(pairKey, []);
      }
      byParticipants.get(pairKey).push(match);
    }
  }

  return { byMatchId, byMatchNumber, byParticipants, byParticipantsAndKickoff };
}

function findOfficialMatch(fixture, officialIndex) {
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

  if (!fixture.homeTeamId || !fixture.awayTeamId) {
    return null;
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

function scoreValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numericScore(match) {
  const home = scoreValue(match.HomeTeamScore);
  const away = scoreValue(match.AwayTeamScore);
  return Number.isFinite(home) && Number.isFinite(away) ? { home, away } : null;
}

function textStatus(match) {
  return String(
    [
      description(match.MatchStatusName),
      match.Status,
      match.MatchStatusDescription,
      match.ResultType
    ]
      .filter(Boolean)
      .join(" ")
  )
    .toLowerCase()
    .trim();
}

function officialStatus(match) {
  const score = numericScore(match);
  const statusCode = Number(match.MatchStatus);
  const statusText = textStatus(match);

  if (/cancel/.test(statusText)) {
    return "CANCELLED";
  }

  if (/postpon/.test(statusText)) {
    return "POSTPONED";
  }

  if (statusCode === 0 && score) {
    return "FT";
  }

  if (statusCode === 3 || /live|half|1st|2nd|in play/.test(statusText)) {
    return "LIVE";
  }

  if (statusCode === 1 || !score) {
    return "SCHEDULED";
  }

  return "LIVE";
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

function mergeOfficialMatches(fixturesData, officialMatches, teams) {
  const teamLookup = buildTeamLookup(teams);
  const officialIndex = indexOfficialMatches(officialMatches, teamLookup);
  const fixtures = fixturesData.fixtures.map((fixture) => ({ ...fixture }));
  let matchedCount = 0;
  let updateCount = 0;

  for (const fixture of fixtures) {
    const match = findOfficialMatch(fixture, officialIndex);
    if (!match) {
      continue;
    }

    matchedCount += 1;
    const before = JSON.stringify({
      kickoffUtc: fixture.kickoffUtc,
      matchNumber: fixture.matchNumber,
      providerIds: fixture.providerIds,
      score: fixture.score,
      status: fixture.status
    });
    const nextStatus = officialStatus(match);
    const nextScore = numericScore(match);

    mergeFifaMetadata(fixture, match);
    fixture.kickoffUtc = match.Date || fixture.kickoffUtc;

    if (statusRank(nextStatus) >= statusRank(fixture.status)) {
      fixture.status = nextStatus;
    }

    if ((fixture.status === "LIVE" || fixture.status === "FT") && nextScore) {
      fixture.score = nextScore;
    } else if (fixture.status === "SCHEDULED") {
      delete fixture.score;
    }

    const after = JSON.stringify({
      kickoffUtc: fixture.kickoffUtc,
      matchNumber: fixture.matchNumber,
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
      fixtures,
      sourceIds: [...new Set([...(fixturesData.sourceIds || []), sourceIdForDate(checkedAt)])],
      updatedAt: checkedAt
    },
    matchedCount,
    updateCount
  };
}

function createEmptyStanding(teamId, sourceRow = {}) {
  const row = {
    teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0
  };

  for (const key of ["teamConductScore", "conductScore", "fairPlayScore", "fairPlayPoints"]) {
    if (sourceRow[key] !== undefined) {
      row[key] = sourceRow[key];
    }
  }

  return row;
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

function getTeamConductScore(row) {
  const value =
    row.teamConductScore ?? row.conductScore ?? row.fairPlayScore ?? row.fairPlayPoints;
  const score = Number(value);

  return Number.isFinite(score) ? score : null;
}

function buildTeamsById(teams = []) {
  return new Map(teams.map((team) => [team.id, team]));
}

function getFifaRankValue(teamId, teamsById) {
  const rank = Number(teamsById.get(teamId)?.fifaRank);

  return Number.isFinite(rank) ? rank : Number.POSITIVE_INFINITY;
}

function buildExistingStandingLookups(standingsData) {
  const order = new Map();
  const rows = new Map();

  for (const [groupId, groupRows] of Object.entries(standingsData.groups || {})) {
    groupRows.forEach((row, index) => {
      const key = `${groupId}:${row.teamId}`;
      order.set(key, index);
      rows.set(key, row);
    });
  }

  return { order, rows };
}

function splitEqualRuns(rows, getSignature) {
  const groups = [];

  for (const row of rows) {
    const signature = getSignature(row);
    const lastGroup = groups.at(-1);

    if (lastGroup?.signature === signature) {
      lastGroup.rows.push(row);
    } else {
      groups.push({ rows: [row], signature });
    }
  }

  return groups.map((group) => group.rows);
}

function getExistingOrder(row, context) {
  return context.existingOrder.get(`${context.groupId}:${row.teamId}`) ?? 99;
}

function compareOverallTiebreakers(a, b, context) {
  const conductA = getTeamConductScore(a);
  const conductB = getTeamConductScore(b);

  return (
    goalDifference(b) - goalDifference(a) ||
    b.gf - a.gf ||
    (conductA !== null && conductB !== null ? conductB - conductA : 0) ||
    getFifaRankValue(a.teamId, context.teamsById) - getFifaRankValue(b.teamId, context.teamsById) ||
    getExistingOrder(a, context) - getExistingOrder(b, context)
  );
}

function rankByOverallTiebreakers(rows, context) {
  return [...rows].sort((a, b) => compareOverallTiebreakers(a, b, context));
}

function getHeadToHeadStats(rows, context) {
  const teamIds = new Set(rows.map((row) => row.teamId));
  const stats = new Map(rows.map((row) => [row.teamId, createEmptyStanding(row.teamId, row)]));

  for (const fixture of context.fixtures) {
    if (
      fixture.groupId === context.groupId &&
      teamIds.has(fixture.homeTeamId) &&
      teamIds.has(fixture.awayTeamId)
    ) {
      applyResult(stats, fixture);
    }
  }

  return stats;
}

function getHeadToHeadSignature(row, stats) {
  const h2h = stats.get(row.teamId) || createEmptyStanding(row.teamId);

  return [points(h2h), goalDifference(h2h), h2h.gf].join("|");
}

function compareHeadToHead(a, b, stats) {
  const h2hA = stats.get(a.teamId) || createEmptyStanding(a.teamId);
  const h2hB = stats.get(b.teamId) || createEmptyStanding(b.teamId);

  return (
    points(h2hB) - points(h2hA) ||
    goalDifference(h2hB) - goalDifference(h2hA) ||
    h2hB.gf - h2hA.gf
  );
}

function rankByHeadToHead(rows, context) {
  if (rows.length <= 1) {
    return rows;
  }

  const stats = getHeadToHeadStats(rows, context);
  const sortedRows = [...rows].sort((a, b) => compareHeadToHead(a, b, stats));
  const groups = splitEqualRuns(sortedRows, (row) => getHeadToHeadSignature(row, stats));

  if (groups.length === 1) {
    return null;
  }

  return groups.flatMap((group) => {
    if (group.length === 1) {
      return group;
    }

    return rankByHeadToHead(group, context) || rankByOverallTiebreakers(group, context);
  });
}

function rankEqualPointRows(rows, context) {
  return rankByHeadToHead(rows, context) || rankByOverallTiebreakers(rows, context);
}

function rankGroupStandings(rows, context) {
  const sortedByPoints = [...rows].sort(
    (a, b) => points(b) - points(a) || getExistingOrder(a, context) - getExistingOrder(b, context)
  );

  return splitEqualRuns(sortedByPoints, (row) => String(points(row))).flatMap((group) =>
    group.length === 1 ? group : rankEqualPointRows(group, context)
  );
}

function recomputeStandings({ fixturesData, standingsData, teams = [], tournamentData }) {
  const existing = buildExistingStandingLookups(standingsData);
  const includedFixtures = [];
  const teamsById = buildTeamsById(teams);

  const groups = Object.fromEntries(
    (tournamentData.groups || []).map((group) => [
      group.id,
      new Map(
        group.teamIds.map((teamId) => [
          teamId,
          createEmptyStanding(teamId, existing.rows.get(`${group.id}:${teamId}`))
        ])
      )
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
      includedFixtures.push(fixture);
    }
  }

  const standingsGroups = {};
  for (const [groupId, table] of Object.entries(groups)) {
    standingsGroups[groupId] = rankGroupStandings([...table.values()], {
      existingOrder: existing.order,
      fixtures: includedFixtures,
      groupId,
      teamsById
    });
  }

  return {
    ...standingsData,
    groups: standingsGroups,
    sourceIds: [...new Set([...(standingsData.sourceIds || []), sourceIdForDate(checkedAt)])],
    updatedAt: checkedAt
  };
}

function addSyncSource(tournamentData, { matchedCount, updateCount }) {
  const sourceId = sourceIdForDate(checkedAt);
  const sources = (tournamentData.sources || []).filter((source) => source.id !== sourceId);

  sources.push({
    id: sourceId,
    label: "FIFA official results sync",
    url: FIFA_SCHEDULE_URL,
    type: "official",
    checkedAt,
    note: `${updateCount} fixture update${updateCount === 1 ? "" : "s"} merged from ${matchedCount} matched FIFA fixture${matchedCount === 1 ? "" : "s"}.`
  });

  return {
    ...tournamentData,
    sources,
    updatedAt: checkedAt
  };
}

const [fixturesData, standingsData, teamsData, tournamentData] = await Promise.all([
  readJson("fixtures.json"),
  readJson("standings.json"),
  readJson("teams.json"),
  readJson("tournament.json")
]);
const officialData = await fetchOfficialSchedule(fixturesData);
const officialMatches = officialData.Results || [];
const merge = mergeOfficialMatches(fixturesData, officialMatches, teamsData.teams);
const nextTournamentData = addSyncSource(tournamentData, {
  matchedCount: merge.matchedCount,
  updateCount: merge.updateCount
});
const nextStandingsData = recomputeStandings({
  fixturesData: merge.fixturesData,
  standingsData,
  teams: teamsData.teams,
  tournamentData: nextTournamentData
});

if (shouldWrite && (!skipUnchangedWrites || merge.updateCount > 0)) {
  await Promise.all([
    writeJson("fixtures.json", merge.fixturesData),
    writeJson("standings.json", nextStandingsData),
    writeJson("tournament.json", nextTournamentData)
  ]);
}

console.log(`FIFA official sync source: ${FIFA_SCHEDULE_URL}`);
console.log(`Matched ${merge.matchedCount} of ${(fixturesData.fixtures || []).length} local fixture(s).`);
if (shouldWrite && skipUnchangedWrites && merge.updateCount === 0) {
  console.log("0 fixture updates detected. Files left unchanged.");
} else {
  console.log(`${merge.updateCount} fixture update${merge.updateCount === 1 ? "" : "s"} ${shouldWrite ? "written" : "detected"}.`);
}
