#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isPlayerNameMatch, normalizePlayerName } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const errors = [];
const OFFICIAL_HIGHLIGHT_VIDEO_CHANNELS = new Map([["UCwNqHDsnBCKT-olwJwIFyfg", "FOX Sports"]]);

async function readJson(fileName) {
  const filePath = path.join(dataDir, fileName);
  return JSON.parse(await readFile(filePath, "utf8"));
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

function fail(message) {
  errors.push(message);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isDayKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime());
}

function isValidDateTime(value) {
  return typeof value === "string" && value.trim() && !Number.isNaN(new Date(value).getTime());
}

function getYouTubeVideoId(url) {
  if (typeof url !== "string" || !url.trim()) {
    return "";
  }

  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = parsedUrl.searchParams.get("v") || "";
      return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : "";
    }

    if (host === "youtu.be") {
      const videoId = parsedUrl.pathname.split("/").filter(Boolean)[0] || "";
      return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : "";
    }
  } catch {
    return "";
  }

  return "";
}

function isLocalizedCopy(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getDefaultCopyText(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (!isLocalizedCopy(value)) {
    return "";
  }

  return String(value.en || "").trim();
}

function validateLocalizedCopy(value, owner) {
  if (!isLocalizedCopy(value)) {
    return;
  }

  assert(typeof value.en === "string" && value.en.trim(), `${owner} localized copy must include en`);
  assert(typeof value.zh === "string" && value.zh.trim(), `${owner} localized copy must include zh`);

  for (const [language, text] of Object.entries(value)) {
    assert(typeof text === "string" && text.trim(), `${owner}.${language} must be a non-empty string`);
  }
}

function validateHighlightVideo(fixture) {
  const owner = `Fixture "${fixture.id}" highlightVideo`;
  const video = fixture.highlightVideo;

  if (video === undefined) {
    return;
  }

  assert(fixture.status === "FT", `${owner} should only be used after full time`);
  assert(video && typeof video === "object" && !Array.isArray(video), `${owner} must be an object`);

  if (!video || typeof video !== "object" || Array.isArray(video)) {
    return;
  }

  const expectedSourceName = OFFICIAL_HIGHLIGHT_VIDEO_CHANNELS.get(video.channelId);
  assert(video.platform === "youtube", `${owner}.platform must be "youtube"`);
  assert(Boolean(getYouTubeVideoId(video.url)), `${owner}.url must be a YouTube URL with a video id`);
  assert(Boolean(expectedSourceName), `${owner}.channelId must be an allowed official highlights channel`);
  assert(
    expectedSourceName ? video.sourceName === expectedSourceName : typeof video.sourceName === "string" && video.sourceName.trim(),
    `${owner}.sourceName must match the allowed channel name`
  );
  assert(isValidDateTime(video.publishedAt), `${owner}.publishedAt must be a valid timestamp`);
  assert(isValidDateTime(video.checkedAt), `${owner}.checkedAt must be a valid timestamp`);

  if (isValidDateTime(video.publishedAt) && isValidDateTime(video.checkedAt)) {
    assert(
      new Date(video.publishedAt).getTime() <= new Date(video.checkedAt).getTime(),
      `${owner}.publishedAt must not be after checkedAt`
    );
  }
}

function wordCount(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function findUnavailablePlayer(records, playerName) {
  if (!records?.length || !playerName) {
    return null;
  }

  const playerNameKey = normalizePlayerName(playerName);
  return (
    records.find((record) => normalizePlayerName(record.name) === playerNameKey) ||
    records.find((record) => isPlayerNameMatch(playerName, record.name) || isPlayerNameMatch(record.name, playerName)) ||
    null
  );
}

function isPlayerInCurrentSquad(playerName, includedNames) {
  return (includedNames || []).some((rosterName) => isPlayerNameMatch(playerName, rosterName));
}

function requireSourceIds(sourceIds, sourceIdSet, owner) {
  assert(Array.isArray(sourceIds), `${owner} must include sourceIds`);
  for (const sourceId of sourceIds || []) {
    assert(sourceIdSet.has(sourceId), `${owner} references unknown source "${sourceId}"`);
  }
}

function isGeneratedScorerNote(note) {
  return /^Scored for .+ in .+ vs .+\.$/.test(String(note || "").trim());
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleCaseRosterToken(value) {
  return String(value || "")
    .toLocaleLowerCase("en-US")
    .replace(/(^|[-'])\p{Letter}/gu, (match) => match.toLocaleUpperCase("en-US"));
}

function titleCaseRosterName(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseRosterToken)
    .join(" ");
}

function isUppercaseRosterToken(value) {
  return /\p{Letter}/u.test(value) && !/\p{Ll}/u.test(value);
}

function getRosterNameCandidates(value) {
  const tokens = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    return [];
  }

  const candidates = new Set([titleCaseRosterName(tokens.join(" "))]);
  let mixedCaseStartIndex = 0;
  while (mixedCaseStartIndex < tokens.length && isUppercaseRosterToken(tokens[mixedCaseStartIndex])) {
    mixedCaseStartIndex += 1;
  }

  if (mixedCaseStartIndex > 0 && mixedCaseStartIndex < tokens.length) {
    candidates.add(titleCaseRosterName([...tokens.slice(mixedCaseStartIndex), ...tokens.slice(0, mixedCaseStartIndex)].join(" ")));
  }

  return [...candidates].filter((candidate) => {
    const normalized = normalizePlayerName(candidate);
    return normalized.length >= 6 && normalized.split(/\s+/).length >= 2;
  });
}

function getProfileAliases(profileName, profile = {}) {
  return [
    profileName,
    profile?.name,
    profile?.displayName,
    ...(Array.isArray(profile?.aliases) ? profile.aliases : [])
  ].filter((value) => typeof value === "string" && value.trim());
}

function normalizeHistoricalTeamName(value) {
  return normalizePlayerName(value);
}

function getHistoricalProfileVersionKey(name, teamName, tournamentYear) {
  const nameKey = normalizePlayerName(name);
  const teamKey = normalizeHistoricalTeamName(teamName);
  const year = Number(tournamentYear);

  return nameKey && teamKey && Number.isInteger(year) && year > 0 ? `${year}:${teamKey}:${nameKey}` : "";
}

function getHistoricalProfileTeamCandidates(profile = {}) {
  return [
    profile?.teamName,
    ...(Array.isArray(profile?.teams) ? profile.teams : [])
  ].filter((teamName) => typeof teamName === "string" && teamName.trim());
}

function getHistoricalProfileYearCandidates(profile = {}) {
  return [
    profile?.tournamentYear,
    ...(Array.isArray(profile?.tournamentYears) ? profile.tournamentYears : [])
  ]
    .map(Number)
    .filter((year) => Number.isInteger(year) && year > 0);
}

function buildHistoricalProfileVersionSet(profiles = new Map()) {
  const versionKeys = new Set();

  for (const [profileName, profile] of profiles) {
    const aliases = getProfileAliases(profile?.name || profileName, profile);
    for (const alias of aliases) {
      for (const teamName of getHistoricalProfileTeamCandidates(profile)) {
        for (const year of getHistoricalProfileYearCandidates(profile)) {
          const key = getHistoricalProfileVersionKey(alias, teamName, year);
          if (key) {
            versionKeys.add(key);
          }
        }
      }
    }
  }

  return versionKeys;
}

function addRequiredHistoricalProfile(refs, name, teamName, tournamentYear) {
  const key = getHistoricalProfileVersionKey(name, teamName, tournamentYear);
  if (key) {
    refs.set(key, { name, teamName, tournamentYear: Number(tournamentYear) });
  }
}

function historicalTeamNameForSide(fixture, side) {
  return side === "home" ? fixture.homeSlot : fixture.awaySlot;
}

function historicalGoalPlayerTeamName(fixture, scoringSide, goal) {
  const playerSide = goal?.ownGoal ? (scoringSide === "home" ? "away" : "home") : scoringSide;
  return historicalTeamNameForSide(fixture, playerSide);
}

function textMentionsFullPlayerName(text, name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return false;
  }

  const pattern = new RegExp(
    `(^|[^\\p{Letter}\\p{Number}])${parts.map(escapeRegExp).join("[\\s\\u00a0-]+")}('s)?(?=$|[^\\p{Letter}\\p{Number}])`,
    "iu"
  );
  return pattern.test(text || "");
}

function resolveExistingProfileName(name, profiles = new Map()) {
  const normalizedName = normalizePlayerName(name);
  const nameTokens = normalizedName ? normalizedName.split(/\s+/).filter(Boolean) : [];
  const reversedName = [...nameTokens].reverse().join(" ");

  for (const [profileName, profile] of profiles) {
    const candidates = getProfileAliases(profileName, profile);
    for (const candidate of candidates) {
      const normalizedCandidate = normalizePlayerName(candidate);
      const candidateTokens = normalizedCandidate ? normalizedCandidate.split(/\s+/).filter(Boolean) : [];
      if (
        normalizedCandidate === normalizedName ||
        normalizedCandidate === reversedName ||
        candidateTokens.slice(-nameTokens.length).join(" ") === normalizedName
      ) {
        return profileName;
      }
    }
  }

  return "";
}

function getParagraphMentionProfileNames(text, availability, profiles) {
  const profileNames = [];
  const seen = new Set();

  for (const rosterName of availability?.includedNames || []) {
    for (const candidate of getRosterNameCandidates(rosterName)) {
      if (!textMentionsFullPlayerName(text, candidate)) {
        continue;
      }

      const name = resolveExistingProfileName(candidate, profiles) || candidate;
      const key = normalizePlayerName(name);
      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      profileNames.push(name);
    }
  }

  return profileNames;
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

function applyGroupResult(table, fixture) {
  const home = table.get(fixture.homeTeamId);
  const away = table.get(fixture.awayTeamId);
  const homeScore = fixture.score.home;
  const awayScore = fixture.score.away;

  home.played += 1;
  away.played += 1;
  home.gf += homeScore;
  home.ga += awayScore;
  away.gf += awayScore;
  away.ga += homeScore;

  if (homeScore > awayScore) {
    home.wins += 1;
    away.losses += 1;
  } else if (awayScore > homeScore) {
    away.wins += 1;
    home.losses += 1;
  } else {
    home.draws += 1;
    away.draws += 1;
  }
}

const [
  fixturesData,
  historyData,
  historicalPlayerProfilesData,
  adminMessageData,
  matchupResearchData,
  playerAvailabilityData,
  playerProfilesData,
  standingsData,
  teamsData,
  tournamentData
] = await Promise.all([
  readJson("fixtures.json"),
  readJson("history.json"),
  readJson("historical-player-profiles.json"),
  readOptionalJson("admin-message.json"),
  readOptionalJson("matchup-research-notes.json"),
  readOptionalJson("player-availability.json"),
  readOptionalJson("player-profiles.json"),
  readJson("standings.json"),
  readJson("teams.json"),
  readJson("tournament.json")
]);

const sourceIds = new Set();
for (const source of tournamentData.sources || []) {
  assert(source.id, "Each source must have an id");
  assert(!sourceIds.has(source.id), `Duplicate source id "${source.id}"`);
  sourceIds.add(source.id);
  assert(source.label, `Source "${source.id}" must have a label`);
  assert(source.type, `Source "${source.id}" must have a type`);
  assert(!Number.isNaN(new Date(source.checkedAt).getTime()), `Source "${source.id}" must have a valid checkedAt`);
}

const tournamentCatchUpItems = [tournamentData.catchUp, tournamentData.news].flatMap((items) =>
  Array.isArray(items) ? items : []
);

for (const [index, item] of tournamentCatchUpItems.entries()) {
  const owner = `tournament catch-up item ${index + 1}`;
  const timestamp = item?.publishedAt || item?.updatedAt || "";

  assert(getDefaultCopyText(item?.headline), `${owner} must include a headline`);
  for (const key of ["headline", "body", "meta", "sourceLabel"]) {
    validateLocalizedCopy(item?.[key], `${owner}.${key}`);
  }
  if (Array.isArray(item?.standouts)) {
    item.standouts.forEach((standout, standoutIndex) => {
      validateLocalizedCopy(standout, `${owner}.standouts[${standoutIndex}]`);
    });
  } else {
    validateLocalizedCopy(item?.standouts, `${owner}.standouts`);
  }
  assert(
    isDayKey(item?.date) || !Number.isNaN(new Date(timestamp).getTime()),
    `${owner} must include a valid date, publishedAt, or updatedAt`
  );

  if (item?.sourceId) {
    assert(sourceIds.has(item.sourceId), `${owner} references unknown source "${item.sourceId}"`);
  }

  if (item?.priority !== undefined) {
    assert(Number.isFinite(Number(item.priority)), `${owner} priority must be numeric`);
  }
}

requireSourceIds(fixturesData.sourceIds, sourceIds, "fixtures.json");
requireSourceIds(historyData.sourceIds, sourceIds, "history.json");
requireSourceIds(historicalPlayerProfilesData.sourceIds, sourceIds, "historical-player-profiles.json");
if (playerAvailabilityData) {
  requireSourceIds(playerAvailabilityData.sourceIds, sourceIds, "player-availability.json");
}
if (playerProfilesData) {
  requireSourceIds(playerProfilesData.sourceIds, sourceIds, "player-profiles.json");
}
if (matchupResearchData) {
  requireSourceIds(matchupResearchData.sourceIds, sourceIds, "matchup-research-notes.json");
}
requireSourceIds(standingsData.sourceIds, sourceIds, "standings.json");
requireSourceIds(teamsData.sourceIds, sourceIds, "teams.json");

if (adminMessageData) {
  assert(
    typeof adminMessageData.updatedAt === "string" &&
      !Number.isNaN(new Date(adminMessageData.updatedAt).getTime()),
    "admin-message.json must include a valid updatedAt"
  );
  assert(Array.isArray(adminMessageData.messages), "admin-message.json must include messages");

  const adminMessageIds = new Set();
  for (const [index, message] of (adminMessageData.messages || []).entries()) {
    const owner = `admin-message.json message ${index + 1}`;
    assert(message && typeof message === "object" && !Array.isArray(message), `${owner} must be an object`);
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      continue;
    }

    assert(typeof message.id === "string" && message.id.trim(), `${owner} must include id`);
    assert(!adminMessageIds.has(message.id), `${owner} has duplicate id "${message.id}"`);
    adminMessageIds.add(message.id);

    if (message.active !== undefined) {
      assert(typeof message.active === "boolean", `${owner} active must be a boolean`);
    }

    if (message.copy !== undefined) {
      validateLocalizedCopy(message.copy, `${owner}.copy`);
    }

    for (const key of ["message", "messageEn", "messageZh"]) {
      if (message[key] !== undefined) {
        assert(typeof message[key] === "string" && message[key].trim(), `${owner}.${key} must be a non-empty string`);
      }
    }

    assert(
      getDefaultCopyText(message.copy) || String(message.message || message.messageEn || "").trim(),
      `${owner} must include message, messageEn, or copy.en`
    );

    const startsAt = message.startsAt || message.startAt;
    const endsAt = message.endsAt || message.endAt;
    const startsAtTime = startsAt ? new Date(startsAt).getTime() : null;
    const endsAtTime = endsAt ? new Date(endsAt).getTime() : null;
    if (startsAt) {
      assert(!Number.isNaN(startsAtTime), `${owner} startsAt must be a valid timestamp`);
    }
    if (endsAt) {
      assert(!Number.isNaN(endsAtTime), `${owner} endsAt must be a valid timestamp`);
    }
    if (startsAt && endsAt && !Number.isNaN(startsAtTime) && !Number.isNaN(endsAtTime)) {
      assert(startsAtTime < endsAtTime, `${owner} startsAt must be before endsAt`);
    }

    if (message.priority !== undefined) {
      assert(Number.isFinite(Number(message.priority)), `${owner} priority must be numeric`);
    }
  }
}

const groups = new Map();
for (const group of tournamentData.groups || []) {
  assert(group.id, "Each group must have an id");
  assert(group.label, `Group "${group.id}" must have a label`);
  assert(!groups.has(group.id), `Duplicate group id "${group.id}"`);
  assert(Array.isArray(group.teamIds), `Group "${group.id}" must include teamIds`);
  assert(group.teamIds.length === 4, `Group "${group.id}" must have exactly four teams`);
  groups.set(group.id, group);
}

const stages = new Set();
for (const stage of tournamentData.stages || []) {
  assert(stage.id, "Each stage must have an id");
  assert(stage.type === "group" || stage.type === "knockout", `Stage "${stage.id}" has invalid type`);
  stages.add(stage.id);
}

const teams = new Map();
for (const team of teamsData.teams || []) {
  assert(team.id, "Each team must have an id");
  assert(!teams.has(team.id), `Duplicate team id "${team.id}"`);
  assert(team.name, `Team "${team.id}" must have a display name`);
  assert(team.officialName, `Team "${team.id}" must have an officialName`);
  for (const field of ["name", "officialName", "standingName"]) {
    if (team[field]) {
      assert(
        !String(team[field]).includes("...") && !String(team[field]).includes("…"),
        `Team "${team.id}" ${field} must not include a hard-coded ellipsis`
      );
    }
  }
  if (team.styleTags !== undefined) {
    assert(Array.isArray(team.styleTags), `Team "${team.id}" styleTags must be an array`);
    assert(
      team.styleTags.length >= 2 && team.styleTags.length <= 3,
      `Team "${team.id}" styleTags must include 2-3 tags`
    );
    for (const [index, tag] of team.styleTags.entries()) {
      assert(
        typeof tag === "string" && tag.trim(),
        `Team "${team.id}" styleTags[${index}] must be a non-empty string`
      );
      assert(
        !tag.includes("...") && !tag.includes("…"),
        `Team "${team.id}" styleTags[${index}] must not include a hard-coded ellipsis`
      );
      assert(!tag.includes(":"), `Team "${team.id}" styleTags[${index}] must not include a category prefix`);
    }
  }
  assert(groups.has(team.groupId), `Team "${team.id}" references unknown group "${team.groupId}"`);
  assert(isNumber(team.fifaRank), `Team "${team.id}" must have a numeric fifaRank`);
  teams.set(team.id, team);
}

const fixturesByMatchNumber = new Map(
  (fixturesData.fixtures || [])
    .filter((fixture) => Number.isInteger(Number(fixture.matchNumber)))
    .map((fixture) => [Number(fixture.matchNumber), fixture])
);

function parseKnockoutGroupPlaceSlot(slotText) {
  const match = /^Group ([A-L]) (winner|runner-up)$/i.exec(slotText || "");

  if (!match) {
    return null;
  }

  return {
    groupId: match[1].toUpperCase(),
    place: match[2].toLowerCase() === "winner" ? 1 : 2
  };
}

function parseKnockoutWinnerSlot(slotText) {
  const match = /^Winner match (\d+)$/i.exec(slotText || "");
  return match ? Number(match[1]) : null;
}

function getExpectedGroupFixtureCount(groupId) {
  const teamCount = groups.get(groupId)?.teamIds?.length || 0;
  return teamCount > 1 ? (teamCount * (teamCount - 1)) / 2 : 0;
}

function isGroupComplete(groupId) {
  const groupFixtures = (fixturesData.fixtures || []).filter(
    (fixture) => fixture.stage === "group" && fixture.groupId === groupId
  );

  return (
    groupFixtures.length >= getExpectedGroupFixtureCount(groupId) &&
    groupFixtures.every((fixture) => fixture.status === "FT" && fixture.score)
  );
}

function getScoreWinnerTeamId(fixture, score) {
  if (!score) {
    return "";
  }

  const home = Number(score.home);
  const away = Number(score.away);

  if (!Number.isFinite(home) || !Number.isFinite(away) || home === away) {
    return "";
  }

  return home > away ? fixture.homeTeamId : fixture.awayTeamId;
}

function getKnockoutWinnerTeamId(fixture) {
  if (!fixture || fixture.status !== "FT") {
    return "";
  }

  const explicitWinner = String(fixture.winnerTeamId || fixture.winner || "").trim();
  if (explicitWinner) {
    return explicitWinner;
  }

  return (
    getScoreWinnerTeamId(fixture, fixture.scoreDetails?.penalties) ||
    getScoreWinnerTeamId(fixture, fixture.score)
  );
}

function validateResolvedKnockoutParticipant(fixture, side) {
  if (fixture.stage === "group") {
    return;
  }

  const slotText = fixture[`${side}Slot`] || "";
  const teamId = fixture[`${side}TeamId`] || "";
  const groupSlot = parseKnockoutGroupPlaceSlot(slotText);

  if (groupSlot && isGroupComplete(groupSlot.groupId)) {
    const expectedTeamId = standingsData.groups?.[groupSlot.groupId]?.[groupSlot.place - 1]?.teamId;

    assert(
      teamId === expectedTeamId,
      `Fixture "${fixture.id}" ${side} slot "${slotText}" should resolve to "${expectedTeamId}"`
    );
    return;
  }

  const sourceMatchNumber = parseKnockoutWinnerSlot(slotText);
  if (!sourceMatchNumber) {
    return;
  }

  const expectedTeamId = getKnockoutWinnerTeamId(fixturesByMatchNumber.get(sourceMatchNumber));
  if (expectedTeamId) {
    assert(
      teamId === expectedTeamId,
      `Fixture "${fixture.id}" ${side} slot "${slotText}" should resolve to "${expectedTeamId}"`
    );
  }
}

if (playerProfilesData) {
  assert(
    typeof playerProfilesData.updatedAt === "string" &&
      !Number.isNaN(new Date(playerProfilesData.updatedAt).getTime()),
    "player-profiles.json must include a valid updatedAt"
  );
  assert(
    playerProfilesData.profiles && typeof playerProfilesData.profiles === "object",
    "player-profiles.json must include profiles"
  );
}
assert(
  typeof historicalPlayerProfilesData.updatedAt === "string" &&
    !Number.isNaN(new Date(historicalPlayerProfilesData.updatedAt).getTime()),
  "historical-player-profiles.json must include a valid updatedAt"
);
assert(
  historicalPlayerProfilesData.profiles && typeof historicalPlayerProfilesData.profiles === "object",
  "historical-player-profiles.json must include profiles"
);

const playerProfiles = new Map(Object.entries(playerProfilesData?.profiles || {}));
const historicalPlayerProfiles = new Map(Object.entries(historicalPlayerProfilesData?.profiles || {}));
const playerProfilesByAlias = new Map();
for (const [profileName, profile] of playerProfiles) {
  for (const alias of getProfileAliases(profileName, profile)) {
    const key = normalizePlayerName(alias);
    if (key && !playerProfilesByAlias.has(key)) {
      playerProfilesByAlias.set(key, profile);
    }
  }
}
const playerAvailabilityByTeam = new Map();
const fixtureUnavailableRefs = [];
const requiredProfileNames = new Set();
const requiredHistoricalProfileRefs = new Map();

for (const group of groups.values()) {
  for (const teamId of group.teamIds) {
    assert(teams.has(teamId), `Group "${group.id}" references unknown team "${teamId}"`);
    assert(teams.get(teamId)?.groupId === group.id, `Team "${teamId}" group does not match group "${group.id}"`);
  }
}

if (playerAvailabilityData) {
  assert(
    typeof playerAvailabilityData.updatedAt === "string" &&
      !Number.isNaN(new Date(playerAvailabilityData.updatedAt).getTime()),
    "player-availability.json must include a valid updatedAt"
  );
  assert(
    playerAvailabilityData.teams && typeof playerAvailabilityData.teams === "object",
    "player-availability.json must include teams"
  );

  for (const [teamId, availability] of Object.entries(playerAvailabilityData.teams || {})) {
    assert(teams.has(teamId), `player-availability.json references unknown team "${teamId}"`);
    assert(
      availability && typeof availability === "object" && !Array.isArray(availability),
      `player-availability.json team "${teamId}" must be an object`
    );
    if (!availability || typeof availability !== "object" || Array.isArray(availability)) {
      continue;
    }
    assert(
      !availability.included || Array.isArray(availability.included),
      `player-availability.json team "${teamId}" included must be an array`
    );
    assert(
      !availability.unavailable || Array.isArray(availability.unavailable),
      `player-availability.json team "${teamId}" unavailable must be an array`
    );

    const includedNames = (availability.included || []).filter((name) => typeof name === "string" && name.trim());
    const unavailable = [];
    const fixtureUnavailableByFixture = new Map();

    for (const [index, player] of (availability.unavailable || []).entries()) {
      assert(
        typeof player?.name === "string" && player.name.trim(),
        `player-availability.json team "${teamId}" unavailable[${index}] must include a player name`
      );
      assert(
        typeof player?.reason === "string" && player.reason.trim(),
        `player-availability.json team "${teamId}" unavailable[${index}] must include a reason`
      );
      assert(
        typeof player?.sourceId === "string" && sourceIds.has(player.sourceId),
        `player-availability.json team "${teamId}" unavailable[${index}] references unknown source`
      );

      unavailable.push(player);
    }

    assert(
      !availability.fixtureUnavailable || Array.isArray(availability.fixtureUnavailable),
      `player-availability.json team "${teamId}" fixtureUnavailable must be an array`
    );

    for (const [index, player] of (availability.fixtureUnavailable || []).entries()) {
      assert(
        typeof player?.fixtureId === "string" && player.fixtureId.trim(),
        `player-availability.json team "${teamId}" fixtureUnavailable[${index}] must include a fixtureId`
      );
      assert(
        typeof player?.name === "string" && player.name.trim(),
        `player-availability.json team "${teamId}" fixtureUnavailable[${index}] must include a player name`
      );
      assert(
        typeof player?.reason === "string" && player.reason.trim(),
        `player-availability.json team "${teamId}" fixtureUnavailable[${index}] must include a reason`
      );
      assert(
        typeof player?.sourceId === "string" && sourceIds.has(player.sourceId),
        `player-availability.json team "${teamId}" fixtureUnavailable[${index}] references unknown source`
      );

      fixtureUnavailableRefs.push({ teamId, index, player });
      const fixturePlayers = fixtureUnavailableByFixture.get(player.fixtureId) || [];
      fixturePlayers.push(player);
      fixtureUnavailableByFixture.set(player.fixtureId, fixturePlayers);
    }

    playerAvailabilityByTeam.set(teamId, { includedNames, unavailable, fixtureUnavailableByFixture });
  }
}

const computedStandings = new Map(
  [...groups.values()].map((group) => [
    group.id,
    new Map(group.teamIds.map((teamId) => [teamId, createEmptyStanding(teamId)]))
  ])
);

for (const [groupId, rows] of Object.entries(standingsData.groups || {})) {
  assert(groups.has(groupId), `standings.json includes unknown group "${groupId}"`);
  assert(Array.isArray(rows), `Standings for group "${groupId}" must be an array`);
  assert(rows.length === 4, `Standings for group "${groupId}" must have four rows`);
  const rowTeams = new Set();

  for (const row of rows) {
    assert(teams.has(row.teamId), `Standings group "${groupId}" references unknown team "${row.teamId}"`);
    assert(!rowTeams.has(row.teamId), `Standings group "${groupId}" duplicates team "${row.teamId}"`);
    rowTeams.add(row.teamId);
    assert(groups.get(groupId)?.teamIds.includes(row.teamId), `Standings team "${row.teamId}" is not in group "${groupId}"`);

    for (const key of ["played", "wins", "draws", "losses", "gf", "ga"]) {
      assert(isNumber(row[key]), `Standings row "${row.teamId}" has invalid ${key}`);
      assert(row[key] >= 0, `Standings row "${row.teamId}" has negative ${key}`);
    }

    assert(
      row.played === row.wins + row.draws + row.losses,
      `Standings row "${row.teamId}" played must equal wins + draws + losses`
    );
  }
}

const fixtureIds = new Set();
for (const fixture of fixturesData.fixtures || []) {
  assert(fixture.id, "Each fixture must have an id");
  assert(!fixtureIds.has(fixture.id), `Duplicate fixture id "${fixture.id}"`);
  fixtureIds.add(fixture.id);
  assert(stages.has(fixture.stage), `Fixture "${fixture.id}" references unknown stage "${fixture.stage}"`);
  assert(!Number.isNaN(new Date(fixture.kickoffUtc).getTime()), `Fixture "${fixture.id}" must have a valid kickoffUtc`);
  const hasHomeTeam = fixture.homeTeamId && teams.has(fixture.homeTeamId);
  const hasAwayTeam = fixture.awayTeamId && teams.has(fixture.awayTeamId);
  const hasConfirmedTeams = Boolean(hasHomeTeam && hasAwayTeam);
  const hasHomeSlot = typeof fixture.homeSlot === "string" && fixture.homeSlot.length > 0;
  const hasAwaySlot = typeof fixture.awaySlot === "string" && fixture.awaySlot.length > 0;

  assert(hasHomeTeam || hasHomeSlot, `Fixture "${fixture.id}" must include a valid homeTeamId or homeSlot`);
  assert(hasAwayTeam || hasAwaySlot, `Fixture "${fixture.id}" must include a valid awayTeamId or awaySlot`);
  if (fixture.homeTeamId) {
    assert(hasHomeTeam, `Fixture "${fixture.id}" has unknown homeTeamId "${fixture.homeTeamId}"`);
  }
  if (fixture.awayTeamId) {
    assert(hasAwayTeam, `Fixture "${fixture.id}" has unknown awayTeamId "${fixture.awayTeamId}"`);
  }
  if (hasHomeTeam && hasAwayTeam) {
    assert(fixture.homeTeamId !== fixture.awayTeamId, `Fixture "${fixture.id}" cannot use the same team twice`);
  }
  assert(fixture.venue, `Fixture "${fixture.id}" must have a venue`);
  assert(["SCHEDULED", "LIVE", "FT", "POSTPONED", "CANCELLED"].includes(fixture.status), `Fixture "${fixture.id}" has invalid status`);

  if (fixture.stage === "group") {
    assert(groups.has(fixture.groupId), `Fixture "${fixture.id}" references unknown group "${fixture.groupId}"`);
    assert(hasHomeTeam, `Group fixture "${fixture.id}" must include a known homeTeamId`);
    assert(hasAwayTeam, `Group fixture "${fixture.id}" must include a known awayTeamId`);
    assert(teams.get(fixture.homeTeamId)?.groupId === fixture.groupId, `Fixture "${fixture.id}" home team is not in group "${fixture.groupId}"`);
    assert(teams.get(fixture.awayTeamId)?.groupId === fixture.groupId, `Fixture "${fixture.id}" away team is not in group "${fixture.groupId}"`);
  } else {
    validateResolvedKnockoutParticipant(fixture, "home");
    validateResolvedKnockoutParticipant(fixture, "away");
  }

  for (const [side, teamId] of [
    ["home", fixture.homeTeamId],
    ["away", fixture.awayTeamId]
  ]) {
    const text = fixture.keyInformation?.[side];
    const availability = playerAvailabilityByTeam.get(teamId);
    for (const playerName of getParagraphMentionProfileNames(text, availability, playerProfiles)) {
      requiredProfileNames.add(playerName);
    }
  }

  if (fixture.status === "FT") {
    assert(fixture.score, `Final fixture "${fixture.id}" must include score`);
    assert(isNumber(fixture.score?.home), `Final fixture "${fixture.id}" must include numeric home score`);
    assert(isNumber(fixture.score?.away), `Final fixture "${fixture.id}" must include numeric away score`);

    if (
      fixture.stage === "group" &&
      groups.has(fixture.groupId) &&
      teams.has(fixture.homeTeamId) &&
      teams.has(fixture.awayTeamId) &&
      isNumber(fixture.score?.home) &&
      isNumber(fixture.score?.away)
    ) {
      applyGroupResult(computedStandings.get(fixture.groupId), fixture);
    }
  }

  if (fixture.resultHighlights !== undefined) {
    assert(fixture.status === "FT", `Fixture "${fixture.id}" resultHighlights should only be used after full time`);
    assert(Array.isArray(fixture.resultHighlights), `Fixture "${fixture.id}" resultHighlights must be an array`);

    for (const [index, highlight] of (fixture.resultHighlights || []).entries()) {
      assert(
        typeof highlight === "string" && highlight.trim(),
        `Fixture "${fixture.id}" resultHighlights[${index}] must be a non-empty string`
      );
      assert(
        typeof highlight === "string" && highlight.trim().length <= 95,
        `Fixture "${fixture.id}" resultHighlights[${index}] should stay compact`
      );
    }
  }

  if (fixture.resultStoryBullets !== undefined) {
    assert(Array.isArray(fixture.resultStoryBullets), `Fixture "${fixture.id}" resultStoryBullets must be an array`);
    assert(
      fixture.resultStoryBullets.length <= 3,
      `Fixture "${fixture.id}" resultStoryBullets should include no more than three bullets`
    );

    for (const [index, highlight] of (fixture.resultStoryBullets || []).entries()) {
      assert(
        typeof highlight === "string" && highlight.trim(),
        `Fixture "${fixture.id}" resultStoryBullets[${index}] must be a non-empty string`
      );
      assert(
        !/^(?:⚽|🔥|🛡️|🧤|🌟|📊)\s*/u.test(highlight.trim()),
        `Fixture "${fixture.id}" resultStoryBullets[${index}] should not start with an emoji marker`
      );
      assert(
        typeof highlight === "string" && highlight.trim().length <= 160,
        `Fixture "${fixture.id}" resultStoryBullets[${index}] should stay compact`
      );
    }
  }

  validateHighlightVideo(fixture);

  if (fixture.projection) {
    const total = fixture.projection.home + fixture.projection.draw + fixture.projection.away;
    assert(sourceIds.has(fixture.projection.sourceId), `Fixture "${fixture.id}" projection references unknown source`);
    assert(total === 100, `Fixture "${fixture.id}" projection must total 100`);
  }

  for (const field of ["goalsHome", "goalsAway"]) {
    if (fixture[field] === undefined) {
      continue;
    }

    assert(Array.isArray(fixture[field]), `Fixture "${fixture.id}" ${field} must be an array`);
    for (const [index, goal] of (fixture[field] || []).entries()) {
      assert(
        typeof goal?.name === "string" && goal.name.trim(),
        `Fixture "${fixture.id}" ${field}[${index}] must include a scorer name`
      );
      if (typeof goal?.name === "string" && goal.name.trim()) {
        requiredProfileNames.add(goal.name);
      }
    }
  }

  if (fixture.keyPlayers) {
    assert(sourceIds.has(fixture.keyPlayers.sourceId), `Fixture "${fixture.id}" keyPlayers references unknown source`);
    assert(Array.isArray(fixture.keyPlayers.home), `Fixture "${fixture.id}" keyPlayers.home must be an array`);
    assert(Array.isArray(fixture.keyPlayers.away), `Fixture "${fixture.id}" keyPlayers.away must be an array`);

    if (hasConfirmedTeams) {
      for (const side of ["home", "away"]) {
        const teamId = side === "home" ? fixture.homeTeamId : fixture.awayTeamId;
        const availability = playerAvailabilityByTeam.get(teamId);

        for (const [index, player] of (fixture.keyPlayers[side] || []).entries()) {
          assert(
            typeof player === "object" && typeof player.name === "string" && player.name.trim(),
            `Fixture "${fixture.id}" keyPlayers.${side}[${index}] must include a player name`
          );
          if (typeof player?.name === "string" && player.name.trim()) {
            const unavailablePlayer =
              findUnavailablePlayer(availability?.unavailable, player.name) ||
              findUnavailablePlayer(availability?.fixtureUnavailableByFixture.get(fixture.id), player.name);

            assert(
              !unavailablePlayer,
              `Fixture "${fixture.id}" keyPlayers.${side}[${index}] lists unavailable ${teamId} player "${player.name}": ${unavailablePlayer?.reason || "unavailable"}`
            );

            if (availability?.includedNames.length) {
              assert(
                isPlayerInCurrentSquad(player.name, availability.includedNames),
                `Fixture "${fixture.id}" keyPlayers.${side}[${index}] lists "${player.name}", who is not in player-availability.json current squad for ${teamId}`
              );
            }

            requiredProfileNames.add(player.name);
          }
          assert(
            typeof player === "object" && typeof player.note === "string" && player.note.trim(),
            `Fixture "${fixture.id}" keyPlayers.${side}[${index}] must include a player note`
          );
        }
      }
    }
  }

  if (fixture.keyInformation) {
    assert(
      sourceIds.has(fixture.keyInformation.sourceId),
      `Fixture "${fixture.id}" keyInformation references unknown source`
    );
    if (fixture.keyInformation.researchSourceIds !== undefined) {
      requireSourceIds(
        fixture.keyInformation.researchSourceIds,
        sourceIds,
        `Fixture "${fixture.id}" keyInformation.researchSourceIds`
      );
    }
  }

  if (hasConfirmedTeams) {
    assert(fixture.keyInformation, `Confirmed fixture "${fixture.id}" must include matchup-aware keyInformation`);

    for (const side of ["home", "away"]) {
      const copy = fixture.keyInformation?.[side];
      assert(
        typeof copy === "string" && copy.trim().length >= 180,
        `Confirmed fixture "${fixture.id}" keyInformation.${side} must include a detailed matchup note`
      );
      assert(
        typeof copy === "string" && copy.trim().split(/\s+/).length <= 85,
        `Confirmed fixture "${fixture.id}" keyInformation.${side} should stay concise`
      );
      assert(
        !/main names to track|key information is not loaded/i.test(copy || ""),
        `Confirmed fixture "${fixture.id}" keyInformation.${side} uses generic placeholder wording`
      );
      assert(
        /Against /.test(copy || ""),
        `Confirmed fixture "${fixture.id}" keyInformation.${side} must describe the opponent relationship`
      );
    }
  }

  assert(fixture.h2h, `Fixture "${fixture.id}" must include h2h status`);
  assert(
    ["loaded", "verified-empty", "not-loaded", "research-pending"].includes(fixture.h2h.status),
    `Fixture "${fixture.id}" has invalid h2h status`
  );
  if (fixture.h2h.sourceId) {
    assert(sourceIds.has(fixture.h2h.sourceId), `Fixture "${fixture.id}" h2h references unknown source`);
  }
  assert(
    fixture.h2h.results === null || Array.isArray(fixture.h2h.results),
    `Fixture "${fixture.id}" h2h.results must be null or an array`
  );

  if (Array.isArray(fixture.h2h.results)) {
    for (const [index, result] of fixture.h2h.results.entries()) {
      assert(result.date, `Fixture "${fixture.id}" h2h result ${index + 1} must include date`);
      assert(result.competition, `Fixture "${fixture.id}" h2h result ${index + 1} must include competition`);
      assert(result.venue, `Fixture "${fixture.id}" h2h result ${index + 1} must include venue`);

      const hasTextScore = typeof result.score === "string" && result.score.length > 0;
      const hasStructuredScore =
        result.homeTeamId &&
        result.awayTeamId &&
        isNumber(result.homeScore) &&
        isNumber(result.awayScore);

      assert(
        hasTextScore || hasStructuredScore,
        `Fixture "${fixture.id}" h2h result ${index + 1} must include either score text or structured team scores`
      );

      if (hasStructuredScore) {
        assert(teams.has(result.homeTeamId), `Fixture "${fixture.id}" h2h result ${index + 1} has unknown homeTeamId "${result.homeTeamId}"`);
        assert(teams.has(result.awayTeamId), `Fixture "${fixture.id}" h2h result ${index + 1} has unknown awayTeamId "${result.awayTeamId}"`);
        assert(result.homeTeamId !== result.awayTeamId, `Fixture "${fixture.id}" h2h result ${index + 1} cannot use the same team twice`);
      }
    }
  }
}

if (matchupResearchData) {
  assert(
    typeof matchupResearchData.updatedAt === "string" &&
      !Number.isNaN(new Date(matchupResearchData.updatedAt).getTime()),
    "matchup-research-notes.json must include a valid updatedAt"
  );
  assert(
    matchupResearchData.fixtures && typeof matchupResearchData.fixtures === "object" && !Array.isArray(matchupResearchData.fixtures),
    "matchup-research-notes.json must include fixtures"
  );

  for (const [fixtureId, research] of Object.entries(matchupResearchData.fixtures || {})) {
    assert(fixtureIds.has(fixtureId), `matchup-research-notes.json references unknown fixture "${fixtureId}"`);
    assert(
      research && typeof research === "object" && !Array.isArray(research),
      `matchup-research-notes.json fixture "${fixtureId}" must be an object`
    );
    if (!research || typeof research !== "object" || Array.isArray(research)) {
      continue;
    }

    assert(
      ["researched", "needs-refresh"].includes(research.status),
      `matchup-research-notes.json fixture "${fixtureId}" has invalid status`
    );
    assert(
      typeof research.checkedAt === "string" && !Number.isNaN(new Date(research.checkedAt).getTime()),
      `matchup-research-notes.json fixture "${fixtureId}" must include a valid checkedAt`
    );
    requireSourceIds(research.sourceIds, sourceIds, `matchup-research-notes.json fixture "${fixtureId}"`);

    for (const side of ["home", "away"]) {
      const sideResearch = research[side];
      assert(
        sideResearch && typeof sideResearch === "object" && !Array.isArray(sideResearch),
        `matchup-research-notes.json fixture "${fixtureId}" ${side} must be an object`
      );
      if (!sideResearch || typeof sideResearch !== "object" || Array.isArray(sideResearch)) {
        continue;
      }

      for (const field of ["summary", "matchupProblem", "attackPlan", "threat"]) {
        assert(
          typeof sideResearch[field] === "string" && sideResearch[field].trim(),
          `matchup-research-notes.json fixture "${fixtureId}" ${side}.${field} must be a non-empty string`
        );
      }

      if (sideResearch.contextSentence !== undefined) {
        assert(
          typeof sideResearch.contextSentence === "string" && sideResearch.contextSentence.trim(),
          `matchup-research-notes.json fixture "${fixtureId}" ${side}.contextSentence must be a non-empty string`
        );
      }

      if (sideResearch.keyPlayers !== undefined) {
        assert(
          Array.isArray(sideResearch.keyPlayers) && sideResearch.keyPlayers.length >= 3,
          `matchup-research-notes.json fixture "${fixtureId}" ${side}.keyPlayers must include at least three players`
        );
        for (const [index, player] of (sideResearch.keyPlayers || []).entries()) {
          assert(
            typeof player?.name === "string" && player.name.trim(),
            `matchup-research-notes.json fixture "${fixtureId}" ${side}.keyPlayers[${index}] must include a name`
          );
          assert(
            typeof player?.note === "string" && player.note.trim(),
            `matchup-research-notes.json fixture "${fixtureId}" ${side}.keyPlayers[${index}] must include a note`
          );
        }
      }
    }
  }
}

for (const { teamId, index, player } of fixtureUnavailableRefs) {
  assert(
    fixtureIds.has(player.fixtureId),
    `player-availability.json team "${teamId}" fixtureUnavailable[${index}] references unknown fixture "${player.fixtureId}"`
  );
}

for (const playerName of requiredProfileNames) {
  if (!playerProfilesData) {
    continue;
  }

  const profile = playerProfilesByAlias.get(normalizePlayerName(playerName));
  assert(profile, `player-profiles.json is missing "${playerName}"`);
  if (!profile) {
    continue;
  }

  assert(
    typeof profile.position === "string" && profile.position.trim(),
    `player-profiles.json "${playerName}" must include position`
  );
  assert(
    typeof profile.club === "string" && profile.club.trim(),
    `player-profiles.json "${playerName}" must include club`
  );
  assert(
    typeof profile.imageUrl === "string" && profile.imageUrl.trim(),
    `player-profiles.json "${playerName}" must include imageUrl`
  );
  assert(
    Array.isArray(profile.skills) && profile.skills.length > 0,
    `player-profiles.json "${playerName}" must include skills`
  );
  assert(
    typeof profile.note === "string" && profile.note.trim(),
    `player-profiles.json "${playerName}" must include a curated note`
  );
  assert(
    !isGeneratedScorerNote(profile.note),
    `player-profiles.json "${playerName}" note must not expose generated scorer context`
  );
  if (profile.summary !== undefined) {
    assert(
      typeof profile.summary === "string" && profile.summary.trim(),
      `player-profiles.json "${playerName}" summary must be a non-empty string when present`
    );
  }
  if (profile.uniformNumber !== undefined) {
    assert(
      Number.isInteger(profile.uniformNumber) && profile.uniformNumber > 0,
      `player-profiles.json "${playerName}" uniformNumber must be a positive integer`
    );
  }
  if (profile.marketValueEurMillions !== undefined) {
    assert(
      isNumber(profile.marketValueEurMillions) && profile.marketValueEurMillions > 0,
      `player-profiles.json "${playerName}" marketValueEurMillions must be a positive number when present`
    );
  }
  if (profile.estimatedMarketValueEurMillions !== undefined) {
    assert(
      isNumber(profile.estimatedMarketValueEurMillions) && profile.estimatedMarketValueEurMillions > 0,
      `player-profiles.json "${playerName}" estimatedMarketValueEurMillions must be a positive number when present`
    );
  }
  assert(
    profile.marketValueEurMillions !== undefined || profile.estimatedMarketValueEurMillions !== undefined,
    `player-profiles.json "${playerName}" must include marketValueEurMillions or estimatedMarketValueEurMillions`
  );
  assert(
    !(profile.marketValueEurMillions !== undefined && profile.estimatedMarketValueEurMillions !== undefined),
    `player-profiles.json "${playerName}" must not include both exact and estimated market values`
  );
}

for (const [groupId, rows] of Object.entries(standingsData.groups || {})) {
  const expectedRows = computedStandings.get(groupId);

  for (const row of rows || []) {
    const expected = expectedRows?.get(row.teamId);
    if (!expected) {
      continue;
    }

    for (const key of ["played", "wins", "draws", "losses", "gf", "ga"]) {
      assert(
        row[key] === expected[key],
        `Standings row "${row.teamId}" ${key} is ${row[key]}, expected ${expected[key]} from final group fixtures`
      );
    }
  }
}

const historicalTournamentYears = new Set();
for (const tournament of historyData.tournaments || []) {
  assert(isNumber(tournament.year), "Each historical tournament must have a numeric year");
  assert(tournament.name, `Historical tournament "${tournament.year}" must have a name`);
  assert(isDayKey(tournament.startDate), `Historical tournament "${tournament.year}" must include a valid startDate`);
  assert(isDayKey(tournament.endDate), `Historical tournament "${tournament.year}" must include a valid endDate`);
  assert(isNumber(tournament.matchCount), `Historical tournament "${tournament.year}" must include matchCount`);
  assert(isNumber(tournament.teamCount), `Historical tournament "${tournament.year}" must include teamCount`);
  assert(Array.isArray(tournament.teams), `Historical tournament "${tournament.year}" must include teams`);
  historicalTournamentYears.add(tournament.year);
}

const historicalFixtureIds = new Set();
for (const fixture of historyData.fixtures || []) {
  assert(fixture.id, "Each historical fixture must have an id");
  assert(!historicalFixtureIds.has(fixture.id), `Duplicate historical fixture id "${fixture.id}"`);
  historicalFixtureIds.add(fixture.id);
  assert(fixture.isHistorical === true, `Historical fixture "${fixture.id}" must be marked isHistorical`);
  assert(sourceIds.has(fixture.sourceId), `Historical fixture "${fixture.id}" references unknown source`);
  assert(fixture.sourcePath, `Historical fixture "${fixture.id}" must include sourcePath`);
  assert(isNumber(fixture.tournamentYear), `Historical fixture "${fixture.id}" must include tournamentYear`);
  assert(
    historicalTournamentYears.has(fixture.tournamentYear),
    `Historical fixture "${fixture.id}" references unknown tournament year "${fixture.tournamentYear}"`
  );
  assert(fixture.tournamentName, `Historical fixture "${fixture.id}" must include tournamentName`);
  assert(isDayKey(fixture.date), `Historical fixture "${fixture.id}" must include a valid date`);
  assert(fixture.sortKey, `Historical fixture "${fixture.id}" must include sortKey`);
  assert(fixture.round, `Historical fixture "${fixture.id}" must include round`);
  assert(fixture.homeSlot, `Historical fixture "${fixture.id}" must include homeSlot`);
  assert(fixture.awaySlot, `Historical fixture "${fixture.id}" must include awaySlot`);
  assert(fixture.venue, `Historical fixture "${fixture.id}" must include venue`);
  assert(
    ["FT", "SCHEDULED", "CANCELLED"].includes(fixture.status),
    `Historical fixture "${fixture.id}" has invalid status`
  );
  if (fixture.localTime) {
    assert(
      /^\d{1,2}:\d{2}(?: UTC[+-]\d{1,2})?$/.test(fixture.localTime),
      `Historical fixture "${fixture.id}" has invalid localTime`
    );
  }
  if (fixture.status === "FT") {
    assert(fixture.score, `Historical final fixture "${fixture.id}" must include score`);
    assert(isNumber(fixture.score?.home), `Historical final fixture "${fixture.id}" must include numeric home score`);
    assert(isNumber(fixture.score?.away), `Historical final fixture "${fixture.id}" must include numeric away score`);
  }
  if (fixture.resultStoryBullets !== undefined) {
    assert(Array.isArray(fixture.resultStoryBullets), `Historical fixture "${fixture.id}" resultStoryBullets must be an array`);
    assert(
      fixture.resultStoryBullets.length <= 3,
      `Historical fixture "${fixture.id}" resultStoryBullets should include no more than three bullets`
    );

    for (const [index, highlight] of (fixture.resultStoryBullets || []).entries()) {
      assert(
        typeof highlight === "string" && highlight.trim(),
        `Historical fixture "${fixture.id}" resultStoryBullets[${index}] must be a non-empty string`
      );
      assert(
        !/^(?:⚽|🔥|🛡️|🧤|🌟|📊)\s*/u.test(highlight.trim()),
        `Historical fixture "${fixture.id}" resultStoryBullets[${index}] should not start with an emoji marker`
      );
      assert(
        typeof highlight === "string" && highlight.trim().length <= 160,
        `Historical fixture "${fixture.id}" resultStoryBullets[${index}] should stay compact`
      );
    }
  }
  assert(Array.isArray(fixture.goalsHome), `Historical fixture "${fixture.id}" goalsHome must be an array`);
  assert(Array.isArray(fixture.goalsAway), `Historical fixture "${fixture.id}" goalsAway must be an array`);
  for (const [field, goals] of [
    ["goalsHome", fixture.goalsHome || []],
    ["goalsAway", fixture.goalsAway || []]
  ]) {
    const scoringSide = field === "goalsAway" ? "away" : "home";
    for (const [index, goal] of goals.entries()) {
      assert(
        typeof goal?.name === "string" && goal.name.trim(),
        `Historical fixture "${fixture.id}" ${field}[${index}] must include a scorer name`
      );
      if (typeof goal?.name === "string" && goal.name.trim()) {
        addRequiredHistoricalProfile(
          requiredHistoricalProfileRefs,
          goal.name,
          historicalGoalPlayerTeamName(fixture, scoringSide, goal),
          fixture.tournamentYear
        );
      }
    }
  }

  assert(fixture.keyInformation, `Historical fixture "${fixture.id}" must include historical keyInformation`);
  assert(
    sourceIds.has(fixture.keyInformation?.sourceId),
    `Historical fixture "${fixture.id}" keyInformation references unknown source`
  );
  for (const side of ["home", "away"]) {
    const copy = fixture.keyInformation?.[side];
    const opponentName = side === "home" ? fixture.awaySlot : fixture.homeSlot;
    assert(
      typeof copy === "string" && copy.trim().length >= 160,
      `Historical fixture "${fixture.id}" keyInformation.${side} must include a detailed historical matchup note`
    );
    assert(
      wordCount(copy) <= 95,
      `Historical fixture "${fixture.id}" keyInformation.${side} should stay concise`
    );
    assert(
      copy?.includes(`Against ${opponentName}`),
      `Historical fixture "${fixture.id}" keyInformation.${side} must describe the historical opponent relationship`
    );
    if (fixture.status !== "CANCELLED") {
      assert(
        copy?.includes(" had to beat "),
        `Historical fixture "${fixture.id}" keyInformation.${side} must describe the matchup pressure`
      );
    }
  }

  assert(fixture.keyPlayers, `Historical fixture "${fixture.id}" must include historical keyPlayers`);
  assert(
    sourceIds.has(fixture.keyPlayers?.sourceId),
    `Historical fixture "${fixture.id}" keyPlayers references unknown source`
  );
  assert(Array.isArray(fixture.keyPlayers?.home), `Historical fixture "${fixture.id}" keyPlayers.home must be an array`);
  assert(Array.isArray(fixture.keyPlayers?.away), `Historical fixture "${fixture.id}" keyPlayers.away must be an array`);
  for (const side of ["home", "away"]) {
    const players = fixture.keyPlayers?.[side] || [];
    if (fixture.status !== "CANCELLED") {
      assert(players.length >= 2, `Historical fixture "${fixture.id}" keyPlayers.${side} must include at least two historical players`);
    }
    for (const [index, player] of players.entries()) {
      assert(
        typeof player?.name === "string" && player.name.trim(),
        `Historical fixture "${fixture.id}" keyPlayers.${side}[${index}] must include a player name`
      );
      if (typeof player?.name === "string" && player.name.trim()) {
        addRequiredHistoricalProfile(
          requiredHistoricalProfileRefs,
          player.name,
          historicalTeamNameForSide(fixture, side),
          fixture.tournamentYear
        );
      }
      assert(
        typeof player?.note === "string" && player.note.trim(),
        `Historical fixture "${fixture.id}" keyPlayers.${side}[${index}] must include a historical note`
      );
    }
  }
}

for (const [profileName, profile] of historicalPlayerProfiles) {
  const owner = `historical-player-profiles.json "${profileName}"`;
  assert(profile && typeof profile === "object" && !Array.isArray(profile), `${owner} must be an object`);
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    continue;
  }

  assert(typeof profile.name === "string" && profile.name.trim(), `${owner} must include name`);
  if (profile.profileKey !== undefined) {
    assert(profile.profileKey === profileName, `${owner} profileKey must match its profile key`);
  } else {
    assert(profile.name === profileName, `${owner} name must match its profile key`);
  }
  assert(profile.historical === true, `${owner} must be marked historical`);
  assert(typeof profile.sourceId === "string" && sourceIds.has(profile.sourceId), `${owner} references unknown source`);
  assert(Array.isArray(profile.teams) && profile.teams.length > 0, `${owner} must include teams`);
  if (profile.teamName !== undefined) {
    assert(typeof profile.teamName === "string" && profile.teamName.trim(), `${owner} teamName must be a non-empty string`);
    assert(profile.teams.includes(profile.teamName), `${owner} teamName must be included in teams`);
  }
  assert(
    Array.isArray(profile.tournamentYears) &&
      profile.tournamentYears.length > 0 &&
      profile.tournamentYears.every((year) => isNumber(year)),
    `${owner} must include numeric tournamentYears`
  );
  if (profile.tournamentYear !== undefined) {
    assert(isNumber(profile.tournamentYear), `${owner} tournamentYear must be numeric when present`);
    assert(profile.tournamentYears.includes(profile.tournamentYear), `${owner} tournamentYear must be included in tournamentYears`);
  }
  assert(typeof profile.position === "string" && profile.position.trim(), `${owner} must include position`);
  assert(typeof profile.club === "string" && profile.club.trim(), `${owner} must include archive club line`);
  assert(Array.isArray(profile.skills) && profile.skills.length > 0, `${owner} must include skills`);
  assert(typeof profile.note === "string" && profile.note.trim(), `${owner} must include a curated note`);
  assert(
    !isGeneratedScorerNote(profile.note),
    `${owner} note must not expose generated scorer context`
  );
  assert(typeof profile.summary === "string" && profile.summary.trim(), `${owner} must include summary`);
  if (profile.imageUrl !== undefined) {
    assert(typeof profile.imageUrl === "string" && profile.imageUrl.trim(), `${owner} imageUrl must be a non-empty string when present`);
    assert(
      typeof profile.imageSource === "string" && profile.imageSource.trim(),
      `${owner} imageSource must be a non-empty string when imageUrl is present`
    );
    assert(
      typeof profile.imageSourceUrl === "string" && /^https?:\/\//.test(profile.imageSourceUrl),
      `${owner} imageSourceUrl must be an http(s) URL when imageUrl is present`
    );
    if (profile.imageSource === "wikimedia-commons") {
      assert(
        profile.imageSourceUrl.includes("commons.wikimedia.org/wiki/File:"),
        `${owner} Wikimedia imageSourceUrl must point to a Commons file page`
      );
    }
    for (const key of ["imageCredit", "imageLicense", "imagePageTitle", "imagePageUrl"]) {
      if (profile[key] !== undefined) {
        assert(typeof profile[key] === "string" && profile[key].trim(), `${owner} ${key} must be a non-empty string when present`);
      }
    }
  }
  for (const key of ["goals", "ownGoals", "keyMatchCount", "scorerMatchCount"]) {
    assert(
      profile[key] === undefined || (isNumber(profile[key]) && profile[key] >= 0),
      `${owner} ${key} must be a non-negative number when present`
    );
  }
  if (profile.uniformNumber !== undefined) {
    assert(
      Number.isInteger(profile.uniformNumber) && profile.uniformNumber > 0,
      `${owner} uniformNumber must be a positive integer`
    );
  }
}

const historicalProfileVersionKeys = buildHistoricalProfileVersionSet(historicalPlayerProfiles);
for (const ref of requiredHistoricalProfileRefs.values()) {
  const refKey = getHistoricalProfileVersionKey(ref.name, ref.teamName, ref.tournamentYear);
  assert(
    historicalProfileVersionKeys.has(refKey),
    `historical-player-profiles.json is missing "${ref.name} / ${ref.teamName} / ${ref.tournamentYear}"`
  );
}

if (errors.length) {
  console.error(`Data validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Data validation passed: ${teams.size} teams, ${groups.size} groups, ${fixtureIds.size} fixtures, ${historicalFixtureIds.size} historical fixtures, ${sourceIds.size} sources.`
);
