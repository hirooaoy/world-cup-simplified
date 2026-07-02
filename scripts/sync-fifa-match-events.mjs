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
const sourceId = `fifa-match-events-sync-${new Date().toISOString().slice(0, 10)}`;
const checkedAt = process.env.FIFA_MATCH_EVENTS_CHECKED_AT || new Date().toISOString();
const shouldWrite = !process.argv.includes("--check");
const requestTimeoutMs = Number(process.env.FIFA_MATCH_EVENTS_TIMEOUT_MS || 10000);
const requestRetries = Number(process.env.FIFA_MATCH_EVENTS_RETRIES || 2);
const requestConcurrency = Number(process.env.FIFA_MATCH_EVENTS_CONCURRENCY || 8);

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

function normalizeEventName(name, profileNames) {
  const normalizedName = titleCaseName(name);
  return profileNames.get(normalizeText(normalizedName)) || normalizedName;
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

function eventSide(event, officialMatch) {
  const teamId = String(event.IdTeam || "");
  if (teamId && teamId === String(officialMatch?.Home?.IdTeam || "")) {
    return "home";
  }
  if (teamId && teamId === String(officialMatch?.Away?.IdTeam || "")) {
    return "away";
  }
  return "";
}

function parseEventMinute(value, eventText = "", event = {}) {
  const minuteText = String(value || "").trim();
  const match = /^(\d+)'(?:\+(\d+)')?$/.exec(minuteText);
  if (match) {
    return match[2] ? `${match[1]}+${match[2]}` : Number(match[1]);
  }

  if (/before the second half begins/i.test(eventText)) {
    return "HT";
  }

  if (Number(event.Period) === 17) {
    return "ET";
  }

  return minuteText ? minuteText.replace(/'/g, "") : "";
}

function parseCardEvent(event, side, profileNames) {
  if (![2, 3].includes(event.Type)) {
    return null;
  }

  const text = description(event.EventDescription);
  const match = /^(.+?)\s+\([^)]+\)\s+(?:is booked by the referee\.|is sent off!)/i.exec(text);
  const playerName = normalizeEventName(match?.[1] || "", profileNames);
  if (!playerName) {
    return null;
  }

  return {
    playerName,
    type: event.Type === 3 ? "red" : "yellow",
    minute: parseEventMinute(event.MatchMinute, text, event),
    ...(event.IdPlayer ? {} : { staff: true }),
    ...(side ? { side } : {})
  };
}

function parseSubstitutionEvent(event, side, profileNames) {
  if (event.Type !== 5) {
    return null;
  }

  const text = description(event.EventDescription);
  const match = /^(?:Before the second half begins\s+)?(.+?)\s+\(in\)\s+comes off the bench to replace\s+(.+?)\s+\(out\)\s+\([^)]+\)$/i.exec(text);
  const onName = normalizeEventName(match?.[1] || "", profileNames);
  const offName = normalizeEventName(match?.[2] || "", profileNames);
  if (!onName || !offName) {
    return null;
  }

  return {
    offName,
    onName,
    minute: parseEventMinute(event.MatchMinute, text, event),
    ...(side ? { side } : {})
  };
}

function buildOfficialMatchEvents(officialMatch, timeline, profileNames) {
  const events = {
    home: {
      ...(officialMatch.Home?.Tactics ? { formation: officialMatch.Home.Tactics } : {}),
      cards: [],
      substitutions: []
    },
    away: {
      ...(officialMatch.Away?.Tactics ? { formation: officialMatch.Away.Tactics } : {}),
      cards: [],
      substitutions: []
    }
  };

  for (const event of timeline.Event || []) {
    const side = eventSide(event, officialMatch);
    if (!side) {
      continue;
    }

    const card = parseCardEvent(event, side, profileNames);
    if (card) {
      events[side].cards.push(card);
      continue;
    }

    const substitution = parseSubstitutionEvent(event, side, profileNames);
    if (substitution) {
      events[side].substitutions.push(substitution);
    }
  }

  return events;
}

function comparableMatchEvents(matchEvents) {
  const normalizeSide = (sideEvents = {}) => ({
    formation: sideEvents.formation || "",
    cards: Array.isArray(sideEvents.cards) ? sideEvents.cards : [],
    substitutions: Array.isArray(sideEvents.substitutions) ? sideEvents.substitutions : []
  });

  return {
    home: normalizeSide(matchEvents?.home),
    away: normalizeSide(matchEvents?.away)
  };
}

function sameMatchEvents(left, right) {
  return JSON.stringify(comparableMatchEvents(left)) === JSON.stringify(comparableMatchEvents(right));
}

async function processFixture(fixture, officialIndex, profileNames) {
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

  const eventSides = buildOfficialMatchEvents(officialMatch, timeline, profileNames);
  const nextMatchEvents = {
    sourceIds: [sourceId],
    checkedAt,
    ...eventSides
  };

  if (!sameMatchEvents(fixture.matchEvents, nextMatchEvents)) {
    fixture.matchEvents = nextMatchEvents;
    return { matched: true, updated: true, warnings: [] };
  }

  return { matched: true, updated: metadataUpdated, warnings: [] };
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
const targetFixtures = (fixturesData.fixtures || []).filter(
  (fixture) =>
    ["LIVE", "FT"].includes(fixture.status) &&
    fixture.homeTeamId &&
    fixture.awayTeamId
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
    const result = await processFixture(fixture, officialIndex, profileNames);
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
    label: "FIFA official cards and substitutions timeline sync",
    url: FIFA_SCHEDULE_URL,
    type: "official",
    checkedAt,
    note: `${matchedCount} matched FIFA timeline${matchedCount === 1 ? "" : "s"} checked; ${matchedCount} active/completed fixture${matchedCount === 1 ? "" : "s"} carry official formation/card/substitution records; ${updateCount} changed on this pass.`
  });
  tournamentData.sources = sources;
  tournamentData.updatedAt = checkedAt;

  await Promise.all([
    writeJson("fixtures.json", fixturesData),
    writeJson("tournament.json", tournamentData)
  ]);
}

console.log(`Matched ${matchedCount} active/completed fixture${matchedCount === 1 ? "" : "s"}; skipped ${skippedCount}.`);
console.log(`${updateCount} formation/card/substitution update${updateCount === 1 ? "" : "s"} ${shouldWrite ? "written" : "detected"}.`);
for (const warning of warnings) {
  console.warn(`Warning: ${warning}`);
}
