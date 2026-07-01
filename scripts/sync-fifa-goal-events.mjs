#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const FIFA_API_URL = "https://api.fifa.com/api/v3/calendar/matches";
const FIFA_TIMELINE_URL = "https://api.fifa.com/api/v3/timelines";
const FIFA_SCHEDULE_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums";
const FIFA_COMPETITION_ID = process.env.FIFA_COMPETITION_ID || "17";
const FIFA_SEASON_ID = process.env.FIFA_SEASON_ID || "285023";
const FIFA_PROVIDER_KEY = "fifa";
const sourceId = `fifa-goal-events-sync-${new Date().toISOString().slice(0, 10)}`;
const checkedAt = process.env.FIFA_GOAL_EVENTS_CHECKED_AT || new Date().toISOString();
const shouldWrite = !process.argv.includes("--check");
const requestTimeoutMs = Number(process.env.FIFA_GOAL_EVENTS_TIMEOUT_MS || 10000);
const requestRetries = Number(process.env.FIFA_GOAL_EVENTS_RETRIES || 1);
const requestConcurrency = Number(process.env.FIFA_GOAL_EVENTS_CONCURRENCY || 8);
const playerNameCache = new Map();

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

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function scoreTotal(score) {
  const home = parseScore(score?.home);
  const away = parseScore(score?.away);
  return home === null || away === null ? null : home + away;
}

function buildTeamLookup(teams) {
  const byName = new Map();

  for (const team of teams || []) {
    for (const value of [team.id, team.name, team.officialName, team.standingName, ...(team.aliases || [])]) {
      const key = normalizeText(value);
      if (key && !byName.has(key)) {
        byName.set(key, team.id);
      }
    }
  }

  return byName;
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
    ...descriptions(participant.TeamName),
    ...descriptions(participant.NameLocalized),
    ...descriptions(participant.ShortClubName)
  ].filter(Boolean);
}

function officialParticipantTeamId(match, side, teamLookup) {
  for (const name of officialParticipantNames(match?.[side])) {
    const teamId = teamLookup.get(normalizeText(name));
    if (teamId) {
      return teamId;
    }
  }

  return "";
}

function officialPairKey(match, teamLookup) {
  const home = match.Home?.Abbreviation || officialParticipantTeamId(match, "Home", teamLookup);
  const away = match.Away?.Abbreviation || officialParticipantTeamId(match, "Away", teamLookup);

  return home && away ? `${home}:${away}` : "";
}

function fixtureFifaMatchId(fixture) {
  return (
    fixture.providerIds?.[FIFA_PROVIDER_KEY]?.matchId ||
    fixture.providerIds?.[FIFA_PROVIDER_KEY]?.idMatch ||
    fixture.fifaMatchId ||
    ""
  );
}

function fifaProviderIds(match) {
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
  const providerIds = fifaProviderIds(match);
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

function findOfficialMatch(fixture, officialIndex) {
  const fifaMatchId = fixtureFifaMatchId(fixture);
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

async function fetchOfficialSchedule(fixturesData) {
  const [from, to] = fixturesData.coverage?.loadedDateRange || ["2026-06-11", "2026-07-19"];
  const url = new URL(FIFA_API_URL);
  url.searchParams.set("language", "en");
  url.searchParams.set("count", "500");
  url.searchParams.set("idCompetition", FIFA_COMPETITION_ID);
  url.searchParams.set("idSeason", FIFA_SEASON_ID);
  url.searchParams.set("from", from);
  url.searchParams.set("to", addDays(to, 1));

  return fetchJson(url, "FIFA schedule request");
}

async function fetchTimeline(idMatch) {
  const url = new URL(`${FIFA_TIMELINE_URL}/${idMatch}`);
  url.searchParams.set("language", "en");

  return fetchJson(url, `FIFA timeline request for ${idMatch}`);
}

function parseMinute(value) {
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
      if (/^\s+$|^-|'$/.test(part)) {
        return part;
      }

      if (!part) {
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

function playerNameFromEvent(event) {
  const text = description(event.EventDescription);
  const match = /^(.+?)\s+\([^)]+\)\s+(?:scores|successfully converts|scores an own goal)/i.exec(text);

  return titleCaseName(match?.[1] || "");
}

function getProfileNameLookup(profilesData) {
  const names = new Map();

  for (const profile of Object.values(profilesData.profiles || {})) {
    const aliases = [
      profile.name,
      profile.displayName,
      ...(Array.isArray(profile.aliases) ? profile.aliases : [])
    ];
    for (const value of aliases) {
      const key = normalizeText(value);
      if (key && !names.has(key)) {
        names.set(key, profile.name || profile.displayName);
      }
    }
  }

  return names;
}

function normalizeGoalName(name, profileNames) {
  return profileNames.get(normalizeText(name)) || name;
}

async function playerNameFromId(idPlayer, profileNames) {
  const id = String(idPlayer || "").trim();
  if (!id) {
    return "";
  }

  if (playerNameCache.has(id)) {
    return playerNameCache.get(id);
  }

  const player = await fetchJson(`https://api.fifa.com/api/v3/players/${id}?language=en`, `FIFA player request for ${id}`);
  const name = normalizeGoalName(titleCaseName(description(player?.Name)), profileNames);
  playerNameCache.set(id, name);
  return name;
}

function isScoringEvent(event) {
  return event.Type === 0 || event.Type === 34 || event.Type === 41;
}

async function goalsFromTimeline(timeline, profileNames) {
  const goals = { home: [], away: [] };
  let previousHome = 0;
  let previousAway = 0;

  for (const event of timeline.Event || []) {
    const homeGoals = Number(event.HomeGoals);
    const awayGoals = Number(event.AwayGoals);

    if (!isScoringEvent(event)) {
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
    const name = normalizeGoalName(playerNameFromEvent(event), profileNames);

    if (side && name) {
      const assistName =
        event.Type === 0 && event.IdSubPlayer && String(event.IdSubPlayer) !== String(event.IdPlayer)
          ? await playerNameFromId(event.IdSubPlayer, profileNames).catch(() => "")
          : "";
      goals[side].push({
        ...parseMinute(event.MatchMinute),
        name,
        ...(assistName ? { assistName } : {}),
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

const [fixturesData, teamsData, tournamentData, profilesData] = await Promise.all([
  readJson("fixtures.json"),
  readJson("teams.json"),
  readJson("tournament.json"),
  readJson("player-profiles.json")
]);
const officialData = await fetchOfficialSchedule(fixturesData);
const officialIndex = indexOfficialMatches(officialData.Results || [], buildTeamLookup(teamsData.teams));
const profileNames = getProfileNameLookup(profilesData);
async function processFixture(fixture) {
  const officialMatch = findOfficialMatch(fixture, officialIndex);
  if (!officialMatch?.IdMatch) {
    return {
      matched: false,
      updated: false,
      warnings: [`${fixture.id}: no official FIFA match id found`]
    };
  }

  const metadataUpdated = mergeFifaMetadata(fixture, officialMatch);
  let timeline;
  try {
    timeline = await fetchTimeline(officialMatch.IdMatch);
  } catch (error) {
    return {
      matched: true,
      updated: metadataUpdated,
      warnings: [`${fixture.id}: ${error.message}`]
    };
  }

  const goals = await goalsFromTimeline(timeline, profileNames);
  const total = goals.home.length + goals.away.length;
  const expectedTotal = scoreTotal(fixture.score);

  if (total !== expectedTotal) {
    return {
      matched: true,
      updated: metadataUpdated,
      warnings: [`${fixture.id}: timeline goal count ${total} does not match score total ${expectedTotal}`]
    };
  }

  if (!sameGoals(fixture.goalsHome, goals.home) || !sameGoals(fixture.goalsAway, goals.away)) {
    fixture.goalsHome = goals.home;
    fixture.goalsAway = goals.away;
    return { matched: true, updated: true, warnings: [] };
  }

  return { matched: true, updated: metadataUpdated, warnings: [] };
}

const targetFixtures = (fixturesData.fixtures || []).filter(
  (fixture) =>
    ["LIVE", "FT"].includes(fixture.status) &&
    fixture.homeTeamId &&
    fixture.awayTeamId &&
    scoreTotal(fixture.score) > 0
);
const skippedCount = (fixturesData.fixtures || []).length - targetFixtures.length;
const warnings = [];
let matchedCount = 0;
let updateCount = 0;
let nextIndex = 0;

async function worker() {
  while (nextIndex < targetFixtures.length) {
    const fixture = targetFixtures[nextIndex];
    nextIndex += 1;
    const result = await processFixture(fixture);
    matchedCount += result.matched ? 1 : 0;
    updateCount += result.updated ? 1 : 0;
    warnings.push(...result.warnings);
  }
}

await Promise.all(
  Array.from({ length: Math.min(requestConcurrency, targetFixtures.length) }, () => worker())
);

if (shouldWrite && updateCount) {
  fixturesData.sourceIds = [...new Set([...(fixturesData.sourceIds || []), sourceId])];
  fixturesData.updatedAt = checkedAt;

  const sources = (tournamentData.sources || []).filter((source) => source.id !== sourceId);
  sources.push({
    id: sourceId,
    label: "FIFA official goal event timeline sync",
    url: FIFA_SCHEDULE_URL,
    type: "official",
    checkedAt,
    note: `${updateCount} fixture goal-event update${updateCount === 1 ? "" : "s"} merged from ${matchedCount} matched FIFA timeline${matchedCount === 1 ? "" : "s"}.`
  });
  tournamentData.sources = sources;
  tournamentData.updatedAt = checkedAt;

  await Promise.all([
    writeJson("fixtures.json", fixturesData),
    writeJson("tournament.json", tournamentData)
  ]);
}

console.log(`Matched ${matchedCount} completed scoring fixture${matchedCount === 1 ? "" : "s"}; skipped ${skippedCount}.`);
console.log(`${updateCount} goal-event update${updateCount === 1 ? "" : "s"} ${shouldWrite ? "written" : "detected"}.`);
for (const warning of warnings) {
  console.warn(`Warning: ${warning}`);
}
