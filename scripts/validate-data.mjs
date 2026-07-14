#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  compareLineupsToLayoutOverride,
  getLayoutOverrideProvenanceIssues,
  VERIFIED_LAYOUT_SOURCE
} from "./lineup-layout-overrides.mjs";
import {
  DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE,
  isDerivedLayoutSource,
  isExactLayoutSource,
  isKnownLayoutSource,
  normalizeLayoutSource
} from "./lineup-layout-sources.mjs";
import { isPlayerNameMatch, normalizePlayerName } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const errors = [];
const OFFICIAL_HIGHLIGHT_VIDEO_CHANNELS = new Map([
  ["UCwNqHDsnBCKT-olwJwIFyfg", "FOX Sports"],
  ["UCpcTrCXblq78GZrTUTLWeBw", "FIFA"]
]);
const HISTORICAL_YOUTUBE_CACHE_SCHEMA_VERSION = 1;
const HISTORICAL_YOUTUBE_MATCHER_VERSION = "2026-06-29-official-fifa-highlights-v5";
const HISTORICAL_YOUTUBE_CHANNEL_ID = "UCpcTrCXblq78GZrTUTLWeBw";
const HISTORICAL_YOUTUBE_SOURCE_NAME = "FIFA";
const H2H_SOURCE_OPTIONAL = process.env.H2H_SOURCE_OPTIONAL === "1" || process.env.H2H_WARN_ONLY === "1";
const HIGHLIGHT_VIDEO_REVIEW_STATUSES = new Set(["not-found", "needs-review"]);
const LINEUP_FORMATION_NOTE_FORMATIONS = new Set([
  "3-4-1-2",
  "3-4-3",
  "3-5-2",
  "4-1-2-3",
  "4-1-3-2",
  "4-1-4-1",
  "4-2-1-3",
  "4-2-3-1",
  "4-3-3",
  "4-4-2",
  "5-2-3",
  "5-3-2",
  "5-4-1"
]);
const COMPLETED_FIXTURE_STATUSES = new Set(["FT", "AET", "PEN"]);

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

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isDayKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime());
}

function isH2hResultDate(value) {
  return isDayKey(value) || /^\d{4}$/.test(value || "");
}

function getFixtureDayKey(fixture, timeZone = "America/Los_Angeles") {
  if (fixture?.date) {
    return fixture.date;
  }

  if (!fixture?.kickoffUtc) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(new Date(fixture.kickoffUtc));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function isH2hResultBeforeFixture(resultDate, fixtureDayKey) {
  if (!resultDate || !fixtureDayKey) {
    return true;
  }

  if (isDayKey(resultDate)) {
    return resultDate < fixtureDayKey;
  }

  if (/^\d{4}$/.test(resultDate)) {
    return resultDate < fixtureDayKey.slice(0, 4);
  }

  return false;
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

function normalizeCacheValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function historicalYouTubeFingerprint(fixture) {
  return [
    fixture.tournamentYear,
    normalizeCacheValue(fixture.round),
    normalizeCacheValue(fixture.homeSlot),
    normalizeCacheValue(fixture.awaySlot),
    Number.isFinite(fixture.score?.home) ? fixture.score.home : "",
    Number.isFinite(fixture.score?.away) ? fixture.score.away : ""
  ].join("|");
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

function validateHighlightVideo(fixture, owner = `Fixture "${fixture.id}" highlightVideo`) {
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

function validateHighlightVideoReview(fixture, owner = `Fixture "${fixture.id}" highlightVideoReview`) {
  const review = fixture.highlightVideoReview;

  if (review === undefined) {
    return;
  }

  assert(fixture.status === "FT", `${owner} should only be used after full time`);
  assert(fixture.highlightVideo === undefined, `${owner} should be removed once highlightVideo is linked`);
  assert(review && typeof review === "object" && !Array.isArray(review), `${owner} must be an object`);

  if (!review || typeof review !== "object" || Array.isArray(review)) {
    return;
  }

  const expectedSourceName = OFFICIAL_HIGHLIGHT_VIDEO_CHANNELS.get(review.channelId);
  assert(
    HIGHLIGHT_VIDEO_REVIEW_STATUSES.has(review.status),
    `${owner}.status must be one of ${[...HIGHLIGHT_VIDEO_REVIEW_STATUSES].join(", ")}`
  );
  assert(review.platform === "youtube", `${owner}.platform must be "youtube"`);
  assert(Boolean(expectedSourceName), `${owner}.channelId must be an allowed official highlights channel`);
  assert(
    expectedSourceName
      ? review.sourceName === expectedSourceName
      : typeof review.sourceName === "string" && review.sourceName.trim(),
    `${owner}.sourceName must match the allowed channel name`
  );
  assert(isValidDateTime(review.checkedAt), `${owner}.checkedAt must be a valid timestamp`);
  assert(
    typeof review.note === "string" && review.note.trim(),
    `${owner}.note must explain why no official highlight video is linked`
  );
}

function validateResultStoryResearch(fixture, sourceIdSet, owner = `Fixture "${fixture.id}" resultStoryResearch`) {
  const research = fixture.resultStoryResearch;

  if (research === undefined) {
    return;
  }

  assert(fixture.status === "FT", `${owner} should only be used after full time`);
  assert(research && typeof research === "object" && !Array.isArray(research), `${owner} must be an object`);

  if (!research || typeof research !== "object" || Array.isArray(research)) {
    return;
  }

  assert(research.status === "researched", `${owner}.status must be "researched"`);
  assert(isValidDateTime(research.checkedAt), `${owner}.checkedAt must be a valid timestamp`);
  requireSourceIds(research.sourceIds, sourceIdSet, owner);
  assert(research.sourceIds.length > 0, `${owner}.sourceIds must include at least one source`);

  if (research.note !== undefined) {
    assert(typeof research.note === "string" && research.note.trim(), `${owner}.note must be a non-empty string`);
    assert(research.note.trim().length <= 180, `${owner}.note should stay compact`);
  }
}

function validateHistoricalYouTubeCacheSummary(summary, owner, { accepted = false } = {}) {
  assert(isPlainObject(summary), `${owner} must be an object`);

  if (!isPlainObject(summary)) {
    return;
  }

  const summaryVideoId = summary.videoId || getYouTubeVideoId(summary.url);
  if (summary.videoId) {
    assert(/^[A-Za-z0-9_-]{11}$/.test(summary.videoId), `${owner}.videoId must be a valid YouTube video id`);
  }
  if (summary.url) {
    assert(Boolean(getYouTubeVideoId(summary.url)), `${owner}.url must be a YouTube URL with a video id`);
  }
  if (summary.durationSeconds !== null && summary.durationSeconds !== undefined) {
    assert(isNumber(summary.durationSeconds), `${owner}.durationSeconds must be numeric or null`);
  }
  if (summary.score !== undefined) {
    assert(isNumber(summary.score), `${owner}.score must be numeric`);
  }
  assert(typeof summary.title === "string", `${owner}.title must be a string`);
  assert(typeof summary.source === "string" && summary.source.trim(), `${owner}.source must be a non-empty string`);
  assert(typeof summary.query === "string" && summary.query.trim(), `${owner}.query must be a non-empty string`);
  assert(Array.isArray(summary.reasons), `${owner}.reasons must be an array`);
  for (const [reasonIndex, reason] of (summary.reasons || []).entries()) {
    assert(typeof reason === "string" && reason.trim(), `${owner}.reasons[${reasonIndex}] must be a non-empty string`);
  }

  if (summary.metadata !== undefined) {
    assert(isPlainObject(summary.metadata), `${owner}.metadata must be an object`);
  }

  const metadata = isPlainObject(summary.metadata) ? summary.metadata : {};
  const metadataVideoId = metadata.videoId || getYouTubeVideoId(metadata.url);
  if (metadata.videoId) {
    assert(/^[A-Za-z0-9_-]{11}$/.test(metadata.videoId), `${owner}.metadata.videoId must be a valid YouTube video id`);
  }
  if (metadata.url) {
    assert(Boolean(getYouTubeVideoId(metadata.url)), `${owner}.metadata.url must be a YouTube URL with a video id`);
  }
  if (summaryVideoId && metadataVideoId) {
    assert(summaryVideoId === metadataVideoId, `${owner} video id must match metadata.videoId`);
  }
  if (metadata.lengthSeconds !== null && metadata.lengthSeconds !== undefined) {
    assert(isNumber(metadata.lengthSeconds), `${owner}.metadata.lengthSeconds must be numeric or null`);
  }
  if (metadata.publishedAt) {
    assert(isValidDateTime(metadata.publishedAt), `${owner}.metadata.publishedAt must be a valid timestamp`);
  }

  if (accepted) {
    assert(Boolean(summaryVideoId || metadataVideoId), `${owner} must include a selected YouTube video id`);
    assert(metadata.channelId === HISTORICAL_YOUTUBE_CHANNEL_ID, `${owner}.metadata.channelId must be official FIFA`);
    assert(metadata.sourceName === HISTORICAL_YOUTUBE_SOURCE_NAME, `${owner}.metadata.sourceName must be FIFA`);
    assert(isValidDateTime(metadata.publishedAt), `${owner}.metadata.publishedAt must be a valid timestamp`);
  }
}

function validateHistoricalYouTubeCache(cache, fixturesById, dispositionFixtureIds) {
  const owner = "cache/youtube-history.json";
  assert(isPlainObject(cache), `${owner} must be an object`);

  if (!isPlainObject(cache)) {
    return;
  }

  assert(cache.schemaVersion === HISTORICAL_YOUTUBE_CACHE_SCHEMA_VERSION, `${owner}.schemaVersion is unsupported`);
  assert(cache.matcherVersion === HISTORICAL_YOUTUBE_MATCHER_VERSION, `${owner}.matcherVersion is unsupported`);
  assert(isValidDateTime(cache.updatedAt), `${owner}.updatedAt must be a valid timestamp`);
  assert(isPlainObject(cache.searches), `${owner}.searches must be an object`);
  assert(isPlainObject(cache.videos), `${owner}.videos must be an object`);
  assert(isPlainObject(cache.fixtures), `${owner}.fixtures must be an object`);

  const searches = isPlainObject(cache.searches) ? cache.searches : {};
  for (const [key, entry] of Object.entries(searches)) {
    const entryOwner = `${owner}.searches["${key}"]`;
    assert(isPlainObject(entry), `${entryOwner} must be an object`);
    if (!isPlainObject(entry)) continue;
    assert(typeof entry.source === "string" && entry.source.trim(), `${entryOwner}.source must be a non-empty string`);
    assert(typeof entry.query === "string" && entry.query.trim(), `${entryOwner}.query must be a non-empty string`);
    assert(isValidDateTime(entry.checkedAt), `${entryOwner}.checkedAt must be a valid timestamp`);
    assert(isNumber(entry.candidateCount), `${entryOwner}.candidateCount must be numeric`);
    assert(Array.isArray(entry.candidates), `${entryOwner}.candidates must be an array`);
    assert(
      !Array.isArray(entry.candidates) || entry.candidateCount === entry.candidates.length,
      `${entryOwner}.candidateCount must match candidates.length`
    );
    for (const [candidateIndex, candidate] of (entry.candidates || []).entries()) {
      const candidateOwner = `${entryOwner}.candidates[${candidateIndex}]`;
      assert(isPlainObject(candidate), `${candidateOwner} must be an object`);
      if (!isPlainObject(candidate)) continue;
      assert(/^[A-Za-z0-9_-]{11}$/.test(candidate.videoId || ""), `${candidateOwner}.videoId must be a valid YouTube video id`);
      assert(Boolean(getYouTubeVideoId(candidate.url)), `${candidateOwner}.url must be a YouTube URL with a video id`);
      assert(typeof candidate.title === "string", `${candidateOwner}.title must be a string`);
      assert(typeof candidate.source === "string" && candidate.source.trim(), `${candidateOwner}.source must be a non-empty string`);
      assert(typeof candidate.query === "string" && candidate.query.trim(), `${candidateOwner}.query must be a non-empty string`);
    }
  }

  const videos = isPlainObject(cache.videos) ? cache.videos : {};
  for (const [videoId, entry] of Object.entries(videos)) {
    const entryOwner = `${owner}.videos["${videoId}"]`;
    assert(/^[A-Za-z0-9_-]{11}$/.test(videoId), `${entryOwner} key must be a valid YouTube video id`);
    assert(isPlainObject(entry), `${entryOwner} must be an object`);
    if (!isPlainObject(entry)) continue;
    assert(isValidDateTime(entry.checkedAt), `${entryOwner}.checkedAt must be a valid timestamp`);
    assert(isPlainObject(entry.metadata), `${entryOwner}.metadata must be an object`);
    if (!isPlainObject(entry.metadata)) continue;
    assert(entry.metadata.videoId === videoId, `${entryOwner}.metadata.videoId must match the cache key`);
    assert(Boolean(getYouTubeVideoId(entry.metadata.url)), `${entryOwner}.metadata.url must be a YouTube URL with a video id`);
    assert(typeof entry.metadata.title === "string", `${entryOwner}.metadata.title must be a string`);
    if (entry.metadata.channelId) {
      assert(typeof entry.metadata.channelId === "string", `${entryOwner}.metadata.channelId must be a string`);
    }
    if (entry.metadata.sourceName) {
      assert(typeof entry.metadata.sourceName === "string", `${entryOwner}.metadata.sourceName must be a string`);
    }
    if (entry.metadata.lengthSeconds !== null && entry.metadata.lengthSeconds !== undefined) {
      assert(isNumber(entry.metadata.lengthSeconds), `${entryOwner}.metadata.lengthSeconds must be numeric or null`);
    }
    if (entry.metadata.publishedAt) {
      assert(isValidDateTime(entry.metadata.publishedAt), `${entryOwner}.metadata.publishedAt must be a valid timestamp`);
    }
  }

  const fixtureCache = isPlainObject(cache.fixtures) ? cache.fixtures : {};
  for (const fixtureId of dispositionFixtureIds) {
    assert(fixtureCache[fixtureId], `${owner}.fixtures must include cached disposition for "${fixtureId}"`);
  }

  for (const [fixtureId, entry] of Object.entries(fixtureCache)) {
    const entryOwner = `${owner}.fixtures["${fixtureId}"]`;
    const fixture = fixturesById.get(fixtureId);
    assert(fixture, `${entryOwner} references an unknown historical fixture`);
    assert(isPlainObject(entry), `${entryOwner} must be an object`);
    if (!isPlainObject(entry)) continue;
    assert(entry.matcherVersion === HISTORICAL_YOUTUBE_MATCHER_VERSION, `${entryOwner}.matcherVersion is unsupported`);
    assert(
      !fixture || entry.fingerprint === historicalYouTubeFingerprint(fixture),
      `${entryOwner}.fingerprint is stale for the historical fixture`
    );
    assert(entry.platform === "youtube", `${entryOwner}.platform must be "youtube"`);
    assert(entry.sourceName === HISTORICAL_YOUTUBE_SOURCE_NAME, `${entryOwner}.sourceName must be FIFA`);
    assert(entry.channelId === HISTORICAL_YOUTUBE_CHANNEL_ID, `${entryOwner}.channelId must be official FIFA`);
    assert(isValidDateTime(entry.checkedAt), `${entryOwner}.checkedAt must be a valid timestamp`);
    assert(["linked", "not-found"].includes(entry.status), `${entryOwner}.status must be linked or not-found`);
    if (fixture) {
      assert(entry.tournamentYear === fixture.tournamentYear, `${entryOwner}.tournamentYear must match the fixture`);
      assert(entry.homeSlot === fixture.homeSlot, `${entryOwner}.homeSlot must match the fixture`);
      assert(entry.awaySlot === fixture.awaySlot, `${entryOwner}.awaySlot must match the fixture`);
    }

    if (entry.status === "linked") {
      validateHistoricalYouTubeCacheSummary(entry.selected, `${entryOwner}.selected`, { accepted: true });
    } else {
      assert(entry.selected === null || entry.selected === undefined, `${entryOwner}.selected must be empty for not-found`);
    }

    assert(Array.isArray(entry.rejected), `${entryOwner}.rejected must be an array`);
    for (const [rejectedIndex, rejected] of (entry.rejected || []).entries()) {
      validateHistoricalYouTubeCacheSummary(rejected, `${entryOwner}.rejected[${rejectedIndex}]`);
    }
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

function registerSource(source, sourceIdSet, owner) {
  assert(source && typeof source === "object" && !Array.isArray(source), `${owner} must be an object`);
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return;
  }
  assert(source.id, `${owner} must have an id`);
  if (!source.id) {
    return;
  }
  assert(!sourceIdSet.has(source.id), `Duplicate source id "${source.id}"`);
  sourceIdSet.add(source.id);
  assert(source.label, `Source "${source.id}" must have a label`);
  assert(source.type, `Source "${source.id}" must have a type`);
  assert(!Number.isNaN(new Date(source.checkedAt).getTime()), `Source "${source.id}" must have a valid checkedAt`);
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
  lineupsData,
  expectedLineupsData,
  lineupLayoutOverridesData,
  coachProfilesData,
  historicalPlayerProfilesData,
  adminMessageData,
  matchupResearchData,
  playerAvailabilityData,
  playerProfilesData,
  youtubeHistoryCacheData,
  standingsData,
  teamsData,
  tournamentData
] = await Promise.all([
  readJson("fixtures.json"),
  readJson("history.json"),
  readJson("lineups.json"),
  readOptionalJson("expected-lineups.json"),
  readOptionalJson("lineup-layout-overrides.json"),
  readOptionalJson("coach-profiles.json"),
  readJson("historical-player-profiles.json"),
  readOptionalJson("admin-message.json"),
  readOptionalJson("matchup-research-notes.json"),
  readOptionalJson("player-availability.json"),
  readOptionalJson("player-profiles.json"),
  readOptionalJson("cache/youtube-history.json"),
  readJson("standings.json"),
  readJson("teams.json"),
  readJson("tournament.json")
]);

const sourceIds = new Set();
for (const source of tournamentData.sources || []) {
  registerSource(source, sourceIds, "Tournament source");
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
requireSourceIds(lineupsData.sourceIds, sourceIds, "lineups.json");
if (lineupLayoutOverridesData) {
  requireSourceIds(lineupLayoutOverridesData.sourceIds, sourceIds, "lineup-layout-overrides.json");
}
if (expectedLineupsData?.sourceIds) {
  requireSourceIds(expectedLineupsData.sourceIds, sourceIds, "expected-lineups.json");
}
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
const knockoutStages = new Set();
for (const stage of tournamentData.stages || []) {
  assert(stage.id, "Each stage must have an id");
  assert(stage.type === "group" || stage.type === "knockout", `Stage "${stage.id}" has invalid type`);
  stages.add(stage.id);
  if (stage.type === "knockout") {
    knockoutStages.add(stage.id);
  }
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

function validateScorePair(pair, owner) {
  assert(pair && typeof pair === "object" && !Array.isArray(pair), `${owner} must be an object`);
  assert(isNumber(pair?.home), `${owner}.home must be numeric`);
  assert(isNumber(pair?.away), `${owner}.away must be numeric`);
}

function validateScoreDetails(fixture) {
  if (!fixture.scoreDetails) {
    return;
  }

  assert(
    typeof fixture.scoreDetails === "object" && !Array.isArray(fixture.scoreDetails),
    `Fixture "${fixture.id}" scoreDetails must be an object`
  );

  if (fixture.scoreDetails.extraTime !== undefined) {
    validateScorePair(fixture.scoreDetails.extraTime, `Fixture "${fixture.id}" scoreDetails.extraTime`);
  }

  if (fixture.scoreDetails.penalties !== undefined) {
    validateScorePair(fixture.scoreDetails.penalties, `Fixture "${fixture.id}" scoreDetails.penalties`);
  }
}

function validateLineupTimestamp(value, owner) {
  assert(isValidDateTime(value), `${owner} must be a valid timestamp`);
}

const LINEUP_LEFT_SIDE_POSITIONS = new Set(["LB", "LCB", "LWB", "LM", "LW"]);
const LINEUP_RIGHT_SIDE_POSITIONS = new Set(["RB", "RCB", "RWB", "RM", "RW"]);
const LINEUP_RECOGNIZED_POSITIONS = new Set([
  "AM",
  "CB",
  "CM",
  "DM",
  "GK",
  "LB",
  "LCB",
  "LM",
  "LW",
  "LWB",
  "RB",
  "RCB",
  "RM",
  "RW",
  "RWB",
  "ST"
]);
const LINEUP_SOURCE_POSITIONS = new Set(["goalkeeper", "defender", "midfielder", "forward"]);

function normalizeLineupPositionCode(position) {
  const rawValue = String(position || "").trim();
  const compactValue = rawValue.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (LINEUP_RECOGNIZED_POSITIONS.has(compactValue)) {
    return compactValue;
  }

  const value = rawValue.toLowerCase();
  if (value.includes("goalkeeper")) return "GK";
  if (value.includes("right wing-back") || value.includes("right wing back")) return "RWB";
  if (value.includes("left wing-back") || value.includes("left wing back")) return "LWB";
  if (value.includes("right-back") || value.includes("right back")) return "RB";
  if (value.includes("left-back") || value.includes("left back")) return "LB";
  if (value.includes("right winger") || value.includes("right midfielder")) return "RW";
  if (value.includes("left winger") || value.includes("left midfielder")) return "LW";
  if (value.includes("defensive midfielder")) return "DM";
  if (value.includes("attacking midfielder")) return "AM";
  if (value.includes("centre-back") || value.includes("center-back") || value.includes("central defender")) return "CB";
  if (value.includes("striker") || value.includes("centre-forward") || value.includes("center-forward")) return "ST";
  if (value.includes("midfielder")) return "CM";
  if (value.includes("forward")) return "ST";
  return "";
}

function getLineupPositionSide(positionCode) {
  if (LINEUP_RIGHT_SIDE_POSITIONS.has(positionCode)) return "right";
  if (LINEUP_LEFT_SIDE_POSITIONS.has(positionCode)) return "left";
  return "";
}

function getLineupProfileExpectedSide(profile = {}) {
  const value = String((profile || {}).position || "").toLowerCase();
  const rightSide = /\bright(?:-| )(?:back|wing-back|wing back|winger|midfielder)\b/.test(value);
  const leftSide = /\bleft(?:-| )(?:back|wing-back|wing back|winger|midfielder)\b/.test(value);
  const centralRole = /\b(?:central midfielder|defensive midfielder|attacking midfielder|centre-back|center-back|striker|centre-forward|center-forward|goalkeeper)\b/.test(value);

  if (rightSide === leftSide || centralRole) {
    return "";
  }

  return rightSide ? "right" : "left";
}

function getLineupCoordinateSide(player) {
  if (!isNumber(player?.x) || player.x === 50) {
    return "";
  }

  return player.x > 50 ? "right" : "left";
}

function getLineupPlayerName(player) {
  return String(player?.name || player?.fullName || player?.displayName || "").trim();
}

function getLineupPlayerKey(playerName) {
  return normalizePlayerName(playerName);
}

function hasLineupPlayerName(playerNames, playerName) {
  const key = getLineupPlayerKey(playerName);
  if (!key) {
    return false;
  }

  return playerNames.some((name) => {
    const candidateKey = getLineupPlayerKey(name);
    return candidateKey === key || isPlayerNameMatch(playerName, name) || isPlayerNameMatch(name, playerName);
  });
}

function hasExactLineupPlayerName(playerNames, playerName) {
  const key = getLineupPlayerKey(playerName);
  if (!key) {
    return false;
  }

  return playerNames.some((name) => getLineupPlayerKey(name) === key);
}

function collectLineupPlayerNames(teamLineup) {
  const players = [
    ...(Array.isArray(teamLineup?.players) ? teamLineup.players : []),
    ...(Array.isArray(teamLineup?.bench) ? teamLineup.bench : [])
  ];

  return players.map(getLineupPlayerName).filter(Boolean);
}

function collectLineupPlayerNumbers(teamLineup) {
  return (Array.isArray(teamLineup?.players) ? teamLineup.players : [])
    .map((player) => String(player?.number || "").trim())
    .filter(Boolean);
}

function validateCompletedFixtureTrust(fixture, lineups, override) {
  if (!COMPLETED_FIXTURE_STATUSES.has(fixture.status)) {
    return;
  }

  const owner = `Fixture "${fixture.id}"`;
  assert(isNumber(fixture.score?.home), `${owner} completed match must have numeric score.home`);
  assert(isNumber(fixture.score?.away), `${owner} completed match must have numeric score.away`);

  if (!lineups) {
    fail(`${owner} completed match must include lineups.json entry`);
    return;
  }

  assert(isPlainObject(lineups), `${owner} lineups record must be an object`);
  if (!isPlainObject(lineups)) {
    return;
  }

  assert(lineups.mode === "final", `${owner}.lineups.mode should be "final" after completion`);

  const homePlayers = collectLineupPlayerNames(lineups.home || {});
  const awayPlayers = collectLineupPlayerNames(lineups.away || {});
  const homeLineup = lineups.home || {};
  const awayLineup = lineups.away || {};
  const homeStarters = Array.isArray(homeLineup.players) ? homeLineup.players : [];
  const awayStarters = Array.isArray(awayLineup.players) ? awayLineup.players : [];
  const homeBench = Array.isArray(homeLineup.bench) ? homeLineup.bench : [];
  const awayBench = Array.isArray(awayLineup.bench) ? awayLineup.bench : [];

  assert(Array.isArray(homeStarters), `${owner}.lineups.home.players must be an array`);
  assert(Array.isArray(awayStarters), `${owner}.lineups.away.players must be an array`);
  assert(Array.isArray(homeBench), `${owner}.lineups.home.bench must be an array`);
  assert(Array.isArray(awayBench), `${owner}.lineups.away.bench must be an array`);
  assert(homeStarters.length === 11, `${owner}.lineups.home must include 11 starters`);
  assert(awayStarters.length === 11, `${owner}.lineups.away must include 11 starters`);

  const overlapByName = (side, starters, bench) => {
    const startersByKey = new Set(starters.map((player) => getLineupPlayerKey(getLineupPlayerName(player))).filter(Boolean));
    for (const player of bench) {
      const key = getLineupPlayerKey(getLineupPlayerName(player));
      if (key && startersByKey.has(key)) {
        fail(`${owner}.lineups.${side} bench must be disjoint from starters`);
        break;
      }
    }
  };
  overlapByName("home", homeStarters, homeBench);
  overlapByName("away", awayStarters, awayBench);

  const homeStarterNumberSet = new Set(collectLineupPlayerNumbers(homeLineup));
  const awayStarterNumberSet = new Set(collectLineupPlayerNumbers(awayLineup));
  const homeBenchNumbers = new Set(
    homeBench.map((player) => String(player?.number || "").trim()).filter(Boolean)
  );
  const awayBenchNumbers = new Set(
    awayBench.map((player) => String(player?.number || "").trim()).filter(Boolean)
  );

  for (const number of homeBenchNumbers) {
    assert(!homeStarterNumberSet.has(number), `${owner}.lineups.home players cannot have overlapping starter and bench player number "${number}"`);
  }
  for (const number of awayBenchNumbers) {
    assert(!awayStarterNumberSet.has(number), `${owner}.lineups.away players cannot have overlapping starter and bench player number "${number}"`);
  }

  const homeSideEventCards = isPlainObject(homeLineup.events) ? (homeLineup.events.cards || []) : [];
  const awaySideEventCards = isPlainObject(awayLineup.events) ? (awayLineup.events.cards || []) : [];
  const homeSideSubstitutions = isPlainObject(homeLineup.events) ? (homeLineup.events.substitutions || []) : [];
  const awaySideSubstitutions = isPlainObject(awayLineup.events) ? (awayLineup.events.substitutions || []) : [];

  for (const [index, substitution] of (Array.isArray(homeSideSubstitutions) ? homeSideSubstitutions : []).entries()) {
    const subOwner = `${owner}.lineups.home.events.substitutions[${index}]`;
    assert(isPlainObject(substitution), `${subOwner} must be an object`);
    if (!isPlainObject(substitution)) {
      continue;
    }

    assert(typeof substitution.offName === "string" && substitution.offName.trim(), `${subOwner}.offName must be a non-empty string`);
    assert(typeof substitution.onName === "string" && substitution.onName.trim(), `${subOwner}.onName must be a non-empty string`);
    assert(
      hasLineupPlayerName(homePlayers, substitution.offName),
      `${subOwner}.offName must map to a known home lineup player`
    );
    assert(
      hasLineupPlayerName(homePlayers, substitution.onName),
      `${subOwner}.onName must map to a known home lineup player`
    );
  }

  for (const [index, substitution] of (Array.isArray(awaySideSubstitutions) ? awaySideSubstitutions : []).entries()) {
    const subOwner = `${owner}.lineups.away.events.substitutions[${index}]`;
    assert(isPlainObject(substitution), `${subOwner} must be an object`);
    if (!isPlainObject(substitution)) {
      continue;
    }

    assert(typeof substitution.offName === "string" && substitution.offName.trim(), `${subOwner}.offName must be a non-empty string`);
    assert(typeof substitution.onName === "string" && substitution.onName.trim(), `${subOwner}.onName must be a non-empty string`);
    assert(
      hasLineupPlayerName(awayPlayers, substitution.offName),
      `${subOwner}.offName must map to a known away lineup player`
    );
    assert(
      hasLineupPlayerName(awayPlayers, substitution.onName),
      `${subOwner}.onName must map to a known away lineup player`
    );
  }

  for (const [index, card] of (Array.isArray(homeSideEventCards) ? homeSideEventCards : []).entries()) {
    const cardOwner = `${owner}.lineups.home.events.cards[${index}]`;
    const playerName = card?.playerName || card?.player || card?.name;
    assert(isPlainObject(card), `${cardOwner} must be an object`);
    if (!isPlainObject(card)) {
      continue;
    }
    assert(typeof playerName === "string" && playerName.trim(), `${cardOwner}.playerName must be a non-empty string`);
    assert(
      hasLineupPlayerName(homePlayers, playerName),
      `${cardOwner}.playerName must map to a known home lineup player`
    );
  }

  for (const [index, card] of (Array.isArray(awaySideEventCards) ? awaySideEventCards : []).entries()) {
    const cardOwner = `${owner}.lineups.away.events.cards[${index}]`;
    const playerName = card?.playerName || card?.player || card?.name;
    assert(isPlainObject(card), `${cardOwner} must be an object`);
    if (!isPlainObject(card)) {
      continue;
    }
    assert(typeof playerName === "string" && playerName.trim(), `${cardOwner}.playerName must be a non-empty string`);
    assert(
      hasLineupPlayerName(awayPlayers, playerName),
      `${cardOwner}.playerName must map to a known away lineup player`
    );
  }

  if (Array.isArray(fixture.cards)) {
    for (const [index, card] of fixture.cards.entries()) {
      const cardOwner = `${owner}.cards[${index}]`;
      const playerName = card?.playerName || card?.player || card?.name;
      assert(isPlainObject(card), `${cardOwner} must be an object`);
      if (!isPlainObject(card)) {
        continue;
      }
      assert(typeof playerName === "string" && playerName.trim(), `${cardOwner}.playerName must be a non-empty string`);
      assert(
        hasLineupPlayerName(homePlayers, playerName) || hasLineupPlayerName(awayPlayers, playerName),
        `${cardOwner}.playerName must map to a known player in this fixture`
      );
    }
  }

  const goalsHome = Array.isArray(fixture.goalsHome) ? fixture.goalsHome : [];
  const goalsAway = Array.isArray(fixture.goalsAway) ? fixture.goalsAway : [];
  const hasOwnGoalFlags = goalsHome.some((goal) => goal?.ownGoal) || goalsAway.some((goal) => goal?.ownGoal);
  if (!hasOwnGoalFlags) {
    const totalHomeScorers = goalsHome.length;
    const totalAwayScorers = goalsAway.length;
    assert(totalHomeScorers === Number(fixture.score.home), `${owner}.score.home should match goal-event count`);
    assert(totalAwayScorers === Number(fixture.score.away), `${owner}.score.away should match goal-event count`);
  }

  for (const [index, goal] of goalsHome.entries()) {
    const goalOwner = `${owner}.goalsHome[${index}]`;
    if (goal?.ownGoal) {
      assert(
        hasLineupPlayerName(awayPlayers, goal?.name),
        `${goalOwner}.name must map to a known away lineup player for own goals`
      );
    } else {
      assert(hasLineupPlayerName(homePlayers, goal?.name), `${goalOwner}.name must map to a known home lineup player`);
    }
    if (goal?.assistName !== undefined) {
      assert(hasLineupPlayerName(homePlayers, goal.assistName), `${goalOwner}.assistName must map to a known home lineup player`);
    }
  }

  for (const [index, goal] of goalsAway.entries()) {
    const goalOwner = `${owner}.goalsAway[${index}]`;
    if (goal?.ownGoal) {
      assert(
        hasLineupPlayerName(homePlayers, goal?.name),
        `${goalOwner}.name must map to a known home lineup player for own goals`
      );
    } else {
      assert(hasLineupPlayerName(awayPlayers, goal?.name), `${goalOwner}.name must map to a known away lineup player`);
    }
    if (goal?.assistName !== undefined) {
      assert(hasLineupPlayerName(awayPlayers, goal.assistName), `${goalOwner}.assistName must map to a known away lineup player`);
    }
  }

  if ((lineups.layoutVerification?.status === "verified") || (override?.status === "verified")) {
    assert(
      lineups.layoutSource !== "derived-team-sheet-order",
      `${owner}.lineups.layoutSource must not be derived-team-sheet-order for verified layout`
    );
  }
}

function getLineupPlayerProfile(player, teamId) {
  const playerName = getLineupPlayerName(player);
  const profile = playerProfilesByAlias.get(normalizePlayerName(playerName));
  if (!profile) {
    return null;
  }

  if (teamId && profile.teamId && profile.teamId !== teamId) {
    return null;
  }

  return profile;
}

function validateLineupPlayerPosition(player, owner, teamId, { allowVerifiedSourceSide = false, requireCoordinates = false } = {}) {
  if (!requireCoordinates && player.x === undefined && player.y === undefined) {
    return;
  }

  const positionCode = normalizeLineupPositionCode(player.position);
  assert(positionCode, `${owner}.position must be a recognized lineup position`);
  if (!positionCode) {
    return;
  }

  const positionSide = getLineupPositionSide(positionCode);
  const coordinateSide = getLineupCoordinateSide(player);
  if (positionSide && coordinateSide) {
    assert(
      positionSide === coordinateSide,
      `${owner} places ${positionCode} on the visual ${coordinateSide} side`
    );
  }

  const profileSide = allowVerifiedSourceSide ? "" : getLineupProfileExpectedSide(getLineupPlayerProfile(player, teamId));
  if (profileSide) {
    assert(
      !positionSide || positionSide === profileSide,
      `${owner}.position conflicts with the player's profile side (${profileSide})`
    );
    assert(
      !coordinateSide || coordinateSide === profileSide,
      `${owner} coordinates conflict with the player's profile side (${profileSide})`
    );
  }
}

function validateLineupPlayer(player, owner, { allowVerifiedSourceSide = false, teamId = "", requirePosition = true, requireCoordinates = false } = {}) {
  assert(isPlainObject(player), `${owner} must be an object`);
  if (!isPlainObject(player)) {
    return "";
  }

  const name = getLineupPlayerName(player);
  assert(name, `${owner}.name must be a non-empty string`);
  assert(
    typeof player.number === "string" || typeof player.number === "number",
    `${owner}.number must be a string or number`
  );
  if (requirePosition) {
    assert(typeof player.position === "string" && player.position.trim(), `${owner}.position must be a non-empty string`);
  }
  if (player.sourcePosition !== undefined) {
    assert(
      LINEUP_SOURCE_POSITIONS.has(String(player.sourcePosition).trim()),
      `${owner}.sourcePosition must be goalkeeper, defender, midfielder, or forward`
    );
  }

  for (const coordinate of ["x", "y"]) {
    if (player[coordinate] === undefined) {
      assert(!requireCoordinates, `${owner}.${coordinate} must be provided for a starter`);
      continue;
    }

    assert(
      isNumber(player[coordinate]) && player[coordinate] >= 0 && player[coordinate] <= 100,
      `${owner}.${coordinate} must be a number from 0 to 100`
    );
  }

  if (requirePosition) {
    validateLineupPlayerPosition(player, owner, teamId, { allowVerifiedSourceSide, requireCoordinates });
  }

  return name;
}

function validateLineupSide(teamLineup, fixture, side, lineupRecord = {}) {
  const owner = `Fixture "${fixture.id}" lineups.${side}`;
  assert(isPlainObject(teamLineup), `${owner} must be an object`);
  if (!isPlainObject(teamLineup)) {
    return { starters: [], bench: [] };
  }

  assert(typeof teamLineup.formation === "string" && teamLineup.formation.trim(), `${owner}.formation must be a non-empty string`);
  if (typeof teamLineup.formation === "string" && teamLineup.formation.trim()) {
    const formation = teamLineup.formation.trim();
    assert(
      LINEUP_FORMATION_NOTE_FORMATIONS.has(formation),
      `${owner}.formation "${formation}" must have curated formation hover notes`
    );
  }
  if (teamLineup.coach !== undefined) {
    assert(isPlainObject(teamLineup.coach), `${owner}.coach must be an object`);
    if (isPlainObject(teamLineup.coach)) {
      assert(typeof teamLineup.coach.name === "string" && teamLineup.coach.name.trim(), `${owner}.coach.name must be a non-empty string`);
      if (teamLineup.coach.sourceUrl !== undefined) {
        assert(/^https?:\/\//.test(teamLineup.coach.sourceUrl), `${owner}.coach.sourceUrl must be an http(s) URL`);
      }
      validateLocalizedCopy(teamLineup.coach.note, `${owner}.coach.note`);
      validateLocalizedCopy(teamLineup.coach.history, `${owner}.coach.history`);
    }
  }

  const starters = Array.isArray(teamLineup.players)
    ? teamLineup.players
    : Array.isArray(teamLineup.starters)
      ? teamLineup.starters
      : null;
  assert(Array.isArray(starters), `${owner}.players must be an array`);
  assert(!Array.isArray(starters) || starters.length === 11, `${owner}.players must include exactly 11 starters`);
  const allowVerifiedSourceSide = isExactLayoutSource(normalizeLayoutSource(lineupRecord.layoutSource));

  const starterNames = [];
  for (const [index, player] of (starters || []).entries()) {
    const name = validateLineupPlayer(player, `${owner}.players[${index}]`, {
      allowVerifiedSourceSide,
      requireCoordinates: true,
      teamId: fixture[`${side}TeamId`]
    });
    if (name) {
      assert(!hasExactLineupPlayerName(starterNames, name), `${owner}.players[${index}] duplicates starter "${name}"`);
      starterNames.push(name);
    }
  }

  const bench = teamLineup.bench === undefined ? [] : teamLineup.bench;
  assert(Array.isArray(bench), `${owner}.bench must be an array when provided`);
  const benchNames = [];
  for (const [index, player] of (Array.isArray(bench) ? bench : []).entries()) {
    const name = validateLineupPlayer(player, `${owner}.bench[${index}]`, {
      teamId: fixture[`${side}TeamId`]
    });
    if (name) {
      assert(!hasExactLineupPlayerName([...starterNames, ...benchNames], name), `${owner}.bench[${index}] duplicates lineup player "${name}"`);
      benchNames.push(name);
    }
  }

  return { starters: starterNames, bench: benchNames };
}

function validateLineupMinute(value, owner) {
  assert(
    typeof value === "number" || (typeof value === "string" && value.trim()),
    `${owner}.minute must be a number or non-empty string`
  );
}

function validateLineupEvents(events, playerNames, owner) {
  if (events === undefined) {
    return;
  }

  assert(isPlainObject(events), `${owner}.events must be an object`);
  if (!isPlainObject(events)) {
    return;
  }

  const allPlayers = [...playerNames.starters, ...playerNames.bench];
  if (events.cards !== undefined) {
    assert(Array.isArray(events.cards), `${owner}.events.cards must be an array`);
    for (const [index, card] of (Array.isArray(events.cards) ? events.cards : []).entries()) {
      const cardOwner = `${owner}.events.cards[${index}]`;
      assert(isPlainObject(card), `${cardOwner} must be an object`);
      if (!isPlainObject(card)) continue;
      assert(typeof card.playerName === "string" && card.playerName.trim(), `${cardOwner}.playerName must be a non-empty string`);
      assert(["yellow", "red"].includes(card.type), `${cardOwner}.type must be yellow or red`);
      validateLineupMinute(card.minute, cardOwner);
      assert(
        hasLineupPlayerName(allPlayers, card.playerName),
        `${cardOwner}.playerName must match a starter or bench player`
      );
    }
  }

  if (events.staffCards !== undefined) {
    assert(Array.isArray(events.staffCards), `${owner}.events.staffCards must be an array`);
    for (const [index, card] of (Array.isArray(events.staffCards) ? events.staffCards : []).entries()) {
      const cardOwner = `${owner}.events.staffCards[${index}]`;
      assert(isPlainObject(card), `${cardOwner} must be an object`);
      if (!isPlainObject(card)) continue;
      assert(typeof card.staffName === "string" && card.staffName.trim(), `${cardOwner}.staffName must be a non-empty string`);
      assert(["yellow", "red"].includes(card.type), `${cardOwner}.type must be yellow or red`);
      if (card.role !== undefined) {
        assert(["coach", "staff"].includes(card.role), `${cardOwner}.role must be coach or staff`);
      }
      validateLineupMinute(card.minute, cardOwner);
    }
  }

  if (events.substitutions !== undefined) {
    assert(Array.isArray(events.substitutions), `${owner}.events.substitutions must be an array`);
    const onFieldNames = [...playerNames.starters];
    for (const [index, substitution] of (Array.isArray(events.substitutions) ? events.substitutions : []).entries()) {
      const substitutionOwner = `${owner}.events.substitutions[${index}]`;
      assert(isPlainObject(substitution), `${substitutionOwner} must be an object`);
      if (!isPlainObject(substitution)) continue;
      assert(typeof substitution.offName === "string" && substitution.offName.trim(), `${substitutionOwner}.offName must be a non-empty string`);
      assert(typeof substitution.onName === "string" && substitution.onName.trim(), `${substitutionOwner}.onName must be a non-empty string`);
      validateLineupMinute(substitution.minute, substitutionOwner);
      assert(
        hasLineupPlayerName(onFieldNames, substitution.offName),
        `${substitutionOwner}.offName must match a player currently on the field`
      );
      assert(
        hasLineupPlayerName(playerNames.bench, substitution.onName),
        `${substitutionOwner}.onName must match a bench player`
      );
      const offIndex = onFieldNames.findIndex((name) => hasLineupPlayerName([name], substitution.offName));
      if (offIndex >= 0) {
        onFieldNames.splice(offIndex, 1);
      }
      if (!hasLineupPlayerName(onFieldNames, substitution.onName)) {
        onFieldNames.push(substitution.onName);
      }
    }
  }
}

function validateLineupLayoutVerification(verification, sourceIdSet, owner) {
  if (verification === undefined) {
    return;
  }

  assert(isPlainObject(verification), `${owner}.layoutVerification must be an object`);
  if (!isPlainObject(verification)) {
    return;
  }

  assert(
    ["verified", "unresolved", "unverified"].includes(verification.status),
    `${owner}.layoutVerification.status must be verified, unresolved, or unverified`
  );
  if (verification.status === "verified" && verification.exact !== undefined) {
    assert(verification.exact === true, `${owner}.layoutVerification.exact must be true for verified layouts`);
  }
  if (verification.status === "unverified") {
    assert(verification.exact === false, `${owner}.layoutVerification.exact must be false for unverified layouts`);
  }
  if (verification.source !== undefined) {
    assert(isKnownLayoutSource(verification.source), `${owner}.layoutVerification.source must be a known layout source`);
  }
  if (verification.checkedAt !== undefined) {
    validateLineupTimestamp(verification.checkedAt, `${owner}.layoutVerification.checkedAt`);
  }
  if (verification.sourceIds !== undefined) {
    requireSourceIds(verification.sourceIds, sourceIdSet, `${owner}.layoutVerification`);
  }
  if (verification.sources !== undefined) {
    assert(Array.isArray(verification.sources), `${owner}.layoutVerification.sources must be an array`);
    for (const [index, source] of (Array.isArray(verification.sources) ? verification.sources : []).entries()) {
      const sourceOwner = `${owner}.layoutVerification.sources[${index}]`;
      assert(isPlainObject(source), `${sourceOwner} must be an object`);
      if (!isPlainObject(source)) continue;
      assert(typeof source.name === "string" && source.name.trim(), `${sourceOwner}.name must be a non-empty string`);
      assert(/^https?:\/\//.test(source.url || ""), `${sourceOwner}.url must be an http(s) URL`);
      assert(
        ["matched", "unavailable", "blocked", "error", "conflict"].includes(source.status),
        `${sourceOwner}.status must be matched, unavailable, blocked, error, or conflict`
      );
      if (source.exactLayout !== undefined) {
        assert(typeof source.exactLayout === "boolean", `${sourceOwner}.exactLayout must be a boolean when provided`);
      }
      if (source.status === "matched" && source.exactLayout === true) {
        assert(
          typeof source.sourceDetail === "string" && source.sourceDetail.trim(),
          `${sourceOwner}.sourceDetail must describe the exact layout evidence`
        );
      }
    }
  }
  if (verification.unresolvedReason !== undefined) {
    assert(
      typeof verification.unresolvedReason === "string" && verification.unresolvedReason.trim(),
      `${owner}.layoutVerification.unresolvedReason must be a non-empty string`
    );
  }
}

function validateFixtureLineups(fixture, sourceIdSet) {
  if (fixture.lineups === undefined) {
    return;
  }

  const owner = `Fixture "${fixture.id}" lineups`;
  assert(isPlainObject(fixture.lineups), `${owner} must be an object`);
  if (!isPlainObject(fixture.lineups)) {
    return;
  }

  requireSourceIds(fixture.lineups.sourceIds, sourceIdSet, owner);
  assert(
    Array.isArray(fixture.lineups.sourceIds) && fixture.lineups.sourceIds.length > 0,
    `${owner}.sourceIds must include at least one source`
  );
  validateLineupTimestamp(fixture.lineups.checkedAt || fixture.lineups.updatedAt, `${owner}.checkedAt`);
  if (fixture.lineups.teamSheetSource !== undefined) {
    assert(["fifa-official", "provider", "editorial"].includes(fixture.lineups.teamSheetSource), `${owner}.teamSheetSource must be fifa-official, provider, or editorial`);
  }
  if (fixture.lineups.eventSource !== undefined) {
    assert(["fifa-official", "provider", "editorial"].includes(fixture.lineups.eventSource), `${owner}.eventSource must be fifa-official, provider, or editorial`);
  }
  if (fixture.lineups.layoutSource !== undefined) {
    assert(
      isKnownLayoutSource(fixture.lineups.layoutSource),
      `${owner}.layoutSource must be ${VERIFIED_LAYOUT_SOURCE}, provider-layout, fifa-official-layout, or ${DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE}`
    );
  }
  validateLineupLayoutVerification(fixture.lineups.layoutVerification, sourceIdSet, owner);
  const normalizedLayoutSource = normalizeLayoutSource(fixture.lineups.layoutSource);
  if (isDerivedLayoutSource(normalizedLayoutSource)) {
    assert(
      fixture.lineups.layoutVerification?.status !== "verified",
      `${owner}.layoutVerification.status must not be verified when layoutSource is ${DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE}`
    );
    if (fixture.lineups.layoutVerification?.exact !== undefined) {
      assert(
        fixture.lineups.layoutVerification.exact === false,
        `${owner}.layoutVerification.exact must be false when layoutSource is ${DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE}`
      );
    }
  }
  if (fixture.lineups.layoutVerification?.status === "verified") {
    assert(
      isExactLayoutSource(normalizedLayoutSource),
      `${owner}.layoutSource must not be derived for a verified layout`
    );
  }

  const mode = String(fixture.lineups.mode || fixture.lineups.status || "").trim();
  assert(
    ["expected", "probable", "prediction", "confirmed", "final"].includes(mode),
    `${owner}.mode must be expected, probable, prediction, confirmed, or final`
  );
  if (mode === "prediction") {
    assert(["SCHEDULED", "DELAYED"].includes(fixture.status), `${owner}.mode prediction should only be used before kickoff`);
  }
  if (mode === "expected" || mode === "probable") {
    assert(["SCHEDULED", "DELAYED"].includes(fixture.status), `${owner}.mode ${mode} should only be used before kickoff`);
  }
  if (mode === "final") {
    assert(fixture.status === "FT", `${owner}.mode final should only be used after full time`);
  }

  assert(teams.has(fixture.homeTeamId) && teams.has(fixture.awayTeamId), `${owner} requires confirmed home and away teams`);
  const homePlayers = validateLineupSide(fixture.lineups.home, fixture, "home", fixture.lineups);
  const awayPlayers = validateLineupSide(fixture.lineups.away, fixture, "away", fixture.lineups);
  validateLineupEvents(fixture.lineups.home?.events, homePlayers, `${owner}.home`);
  validateLineupEvents(fixture.lineups.away?.events, awayPlayers, `${owner}.away`);
}

function validateExpectedLineupConfidence(confidence, owner) {
  if (!isPlainObject(confidence)) {
    fail(`${owner} must be an object`);
    return false;
  }

  assert(typeof confidence.label === "string" && confidence.label.trim(), `${owner}.label must be a non-empty string`);
  const label = confidence.label.toLowerCase();
  assert(["low", "medium", "high"].includes(label), `${owner}.label must be low, medium, or high`);

  return true;
}

function validateExpectedLineupRecord(record, sourceIdSet, fixtureById, owner, seenFixtureIds) {
  if (!isPlainObject(record)) {
    fail(`${owner} must be an object`);
    return;
  }

  assert(record.fixtureId && typeof record.fixtureId === "string" && record.fixtureId.trim(), `${owner}.fixtureId must be a non-empty string`);
  if (!record.fixtureId || typeof record.fixtureId !== "string" || !record.fixtureId.trim()) {
    return;
  }

  const fixture = fixtureById.get(record.fixtureId);
  assert(fixture, `${owner}.fixtureId must reference an existing fixture`);
  if (!fixture) {
    return;
  }

  if (seenFixtureIds.has(record.fixtureId)) {
    fail(`expected-lineups.json has duplicate fixture record for "${record.fixtureId}"`);
    return;
  }
  seenFixtureIds.add(record.fixtureId);

  const mode = String(record.mode || "").trim().toLowerCase();
  assert(["expected", "probable"].includes(mode), `${owner}.mode must be expected or probable`);
  if (mode === "expected" || mode === "probable") {
    assert(Array.isArray(record.sourceIds), `${owner}.sourceIds must be an array`);
    requireSourceIds(record.sourceIds, sourceIdSet, `${owner}`);
    assert(record.sourceIds.length > 0, `${owner}.sourceIds must include at least one source`);
    assert(isValidDateTime(record.lastUpdated), `${owner}.lastUpdated must be a valid date-time`);
    validateExpectedLineupConfidence(record.confidence, `${owner}.confidence`);
  }

  assert(isPlainObject(record.lineup), `${owner}.lineup must be an object`);
  if (!isPlainObject(record.lineup)) {
    return;
  }

  const fixtureLineupRecord = {
    ...record.lineup,
    mode,
    sourceIds: record.sourceIds,
    checkedAt: record.lastUpdated,
    updatedAt: record.lastUpdated
  };
  validateFixtureLineups({ ...fixture, lineups: fixtureLineupRecord }, sourceIdSet);
  validateLineupGoalCoverage({ ...fixture, lineups: fixtureLineupRecord }, owner);
}

function collectLineupSidePlayerNames(teamLineup) {
  const players = [
    ...(Array.isArray(teamLineup?.players) ? teamLineup.players : []),
    ...(Array.isArray(teamLineup?.starters) ? teamLineup.starters : []),
    ...(Array.isArray(teamLineup?.bench) ? teamLineup.bench : [])
  ];

  return players.map(getLineupPlayerName).filter(Boolean);
}

function validateLineupGoalCoverage(fixture, owner) {
  const lineups = fixture.lineups;
  if (!lineups) {
    return;
  }

  const namesBySide = {
    home: collectLineupSidePlayerNames(lineups.home),
    away: collectLineupSidePlayerNames(lineups.away)
  };

  for (const [field, scoringSide] of [
    ["goalsHome", "home"],
    ["goalsAway", "away"]
  ]) {
    const opponentSide = scoringSide === "home" ? "away" : "home";
    for (const [index, goal] of (fixture[field] || []).entries()) {
      const goalOwner = `${owner}.${field}[${index}]`;
      const scorerSide = goal?.ownGoal ? opponentSide : scoringSide;
      assert(
        hasLineupPlayerName(namesBySide[scorerSide], goal?.name),
        `${goalOwner}.name must match ${scorerSide} lineup player "${goal?.name || ""}"`
      );
      if (!goal?.ownGoal && goal?.assistName !== undefined) {
        assert(
          hasLineupPlayerName(namesBySide[scoringSide], goal.assistName),
          `${goalOwner}.assistName must match ${scoringSide} lineup player "${goal.assistName}"`
        );
      }
    }
  }
}

function validateMatchEventsSide(sideEvents, fixture, side) {
  const owner = `Fixture "${fixture.id}" matchEvents.${side}`;
  assert(isPlainObject(sideEvents), `${owner} must be an object`);
  if (!isPlainObject(sideEvents)) {
    return;
  }

  if (sideEvents.formation !== undefined) {
    assert(
      typeof sideEvents.formation === "string" && sideEvents.formation.trim(),
      `${owner}.formation must be a non-empty string when provided`
    );
  }

  const cards = sideEvents.cards === undefined ? [] : sideEvents.cards;
  assert(Array.isArray(cards), `${owner}.cards must be an array when provided`);
  for (const [index, card] of (Array.isArray(cards) ? cards : []).entries()) {
    const cardOwner = `${owner}.cards[${index}]`;
    assert(isPlainObject(card), `${cardOwner} must be an object`);
    if (!isPlainObject(card)) continue;
    assert(typeof card.playerName === "string" && card.playerName.trim(), `${cardOwner}.playerName must be a non-empty string`);
    assert(["yellow", "red"].includes(card.type), `${cardOwner}.type must be yellow or red`);
    validateLineupMinute(card.minute, cardOwner);
    if (card.staff !== undefined) {
      assert(typeof card.staff === "boolean", `${cardOwner}.staff must be a boolean when provided`);
    }
    if (card.side !== undefined) {
      assert(card.side === side, `${cardOwner}.side must match its parent side`);
    }
  }

  const substitutions = sideEvents.substitutions === undefined ? [] : sideEvents.substitutions;
  assert(Array.isArray(substitutions), `${owner}.substitutions must be an array when provided`);
  for (const [index, substitution] of (Array.isArray(substitutions) ? substitutions : []).entries()) {
    const substitutionOwner = `${owner}.substitutions[${index}]`;
    assert(isPlainObject(substitution), `${substitutionOwner} must be an object`);
    if (!isPlainObject(substitution)) continue;
    assert(typeof substitution.offName === "string" && substitution.offName.trim(), `${substitutionOwner}.offName must be a non-empty string`);
    assert(typeof substitution.onName === "string" && substitution.onName.trim(), `${substitutionOwner}.onName must be a non-empty string`);
    validateLineupMinute(substitution.minute, substitutionOwner);
    if (substitution.side !== undefined) {
      assert(substitution.side === side, `${substitutionOwner}.side must match its parent side`);
    }
  }
}

function validateLineupLayoutOverridePlayer(player, owner) {
  assert(isPlainObject(player), `${owner} must be an object`);
  if (!isPlainObject(player)) {
    return;
  }

  assert(typeof player.name === "string" && player.name.trim(), `${owner}.name must be a non-empty string`);
  assert(typeof player.number === "string" || typeof player.number === "number", `${owner}.number must be a string or number`);
  assert(normalizeLineupPositionCode(player.position), `${owner}.position must be a recognized lineup position`);
  assert(isNumber(player.x) && player.x >= 0 && player.x <= 100, `${owner}.x must be a number from 0 to 100`);
  assert(isNumber(player.y) && player.y >= 0 && player.y <= 100, `${owner}.y must be a number from 0 to 100`);
}

function validateLineupLayoutOverrideSide(sideOverride, owner) {
  assert(isPlainObject(sideOverride), `${owner} must be an object`);
  if (!isPlainObject(sideOverride)) {
    return;
  }
  assert(typeof sideOverride.formation === "string" && sideOverride.formation.trim(), `${owner}.formation must be a non-empty string`);
  assert(Array.isArray(sideOverride.players), `${owner}.players must be an array`);
  assert(!Array.isArray(sideOverride.players) || sideOverride.players.length === 11, `${owner}.players must include exactly 11 starters`);
  for (const [index, player] of (Array.isArray(sideOverride.players) ? sideOverride.players : []).entries()) {
    validateLineupLayoutOverridePlayer(player, `${owner}.players[${index}]`);
  }
}

function validateLineupLayoutOverrides(overridesData, lineupsDataValue) {
  if (overridesData === null || overridesData === undefined) {
    return;
  }

  assert(isPlainObject(overridesData), "lineup-layout-overrides.json must be an object");
  if (!isPlainObject(overridesData)) {
    return;
  }
  if (overridesData.updatedAt !== undefined) {
    assert(isValidDateTime(overridesData.updatedAt), "lineup-layout-overrides.json updatedAt must be a valid date-time when present");
  }
  assert(isPlainObject(overridesData.fixtures), "lineup-layout-overrides.json fixtures must be an object keyed by fixture id");

  for (const [fixtureId, override] of Object.entries(isPlainObject(overridesData.fixtures) ? overridesData.fixtures : {})) {
    const owner = `lineup-layout-overrides.json fixture "${fixtureId}"`;
    const fixture = fixturesById.get(fixtureId);
    assert(fixture, `${owner} references unknown fixture`);
    assert(isPlainObject(override), `${owner} must be an object`);
    if (!fixture || !isPlainObject(override)) {
      continue;
    }

    assert(["verified", "unresolved"].includes(override.status), `${owner}.status must be verified or unresolved`);
    validateLineupTimestamp(override.checkedAt, `${owner}.checkedAt`);
    requireSourceIds(override.sourceIds, sourceIds, owner);
    assert(Array.isArray(override.sourceIds) && override.sourceIds.length > 0, `${owner}.sourceIds must include at least one source`);
    if (override.homeTeamId !== undefined) {
      assert(override.homeTeamId === fixture.homeTeamId, `${owner}.homeTeamId must match the fixture home team`);
    }
    if (override.awayTeamId !== undefined) {
      assert(override.awayTeamId === fixture.awayTeamId, `${owner}.awayTeamId must match the fixture away team`);
    }
    if (override.layoutSource !== undefined) {
      assert(normalizeLayoutSource(override.layoutSource) === VERIFIED_LAYOUT_SOURCE, `${owner}.layoutSource must be ${VERIFIED_LAYOUT_SOURCE}`);
    }
    assert(Array.isArray(override.sources) && override.sources.length > 0, `${owner}.sources must include at least one checked source`);
    for (const [index, source] of (Array.isArray(override.sources) ? override.sources : []).entries()) {
      const sourceOwner = `${owner}.sources[${index}]`;
      assert(isPlainObject(source), `${sourceOwner} must be an object`);
      if (!isPlainObject(source)) continue;
      assert(typeof source.name === "string" && source.name.trim(), `${sourceOwner}.name must be a non-empty string`);
      assert(/^https?:\/\//.test(source.url || ""), `${sourceOwner}.url must be an http(s) URL`);
      assert(
        ["matched", "unavailable", "blocked", "error", "conflict"].includes(source.status),
        `${sourceOwner}.status must be matched, unavailable, blocked, error, or conflict`
      );
      if (source.exactLayout !== undefined) {
        assert(typeof source.exactLayout === "boolean", `${sourceOwner}.exactLayout must be a boolean when provided`);
      }
      if (source.status === "matched" && source.exactLayout === true) {
        assert(
          typeof source.sourceDetail === "string" && source.sourceDetail.trim(),
          `${sourceOwner}.sourceDetail must describe the exact layout evidence`
        );
      }
    }
    if (override.unresolvedReason !== undefined) {
      assert(typeof override.unresolvedReason === "string" && override.unresolvedReason.trim(), `${owner}.unresolvedReason must be a non-empty string`);
    }
    for (const issue of getLayoutOverrideProvenanceIssues(override)) {
      fail(`${owner}: ${issue}`);
    }

    if (override.status !== "verified") {
      continue;
    }

    validateLineupLayoutOverrideSide(override.home, `${owner}.home`);
    validateLineupLayoutOverrideSide(override.away, `${owner}.away`);

    const lineups = lineupsDataValue?.lineups?.[fixtureId];
    assert(lineups, `${owner} must be applied to lineups.json`);
    if (!lineups) {
      continue;
    }
    for (const issue of compareLineupsToLayoutOverride(lineups, override)) {
      fail(`${owner}: ${issue}`);
    }
  }
}

function validateFixtureMatchEvents(fixture, sourceIdSet) {
  if (fixture.matchEvents === undefined) {
    return;
  }

  const owner = `Fixture "${fixture.id}" matchEvents`;
  assert(isPlainObject(fixture.matchEvents), `${owner} must be an object`);
  if (!isPlainObject(fixture.matchEvents)) {
    return;
  }

  assert(["LIVE", "FT"].includes(fixture.status), `${owner} should only be used after kickoff`);
  requireSourceIds(fixture.matchEvents.sourceIds, sourceIdSet, owner);
  assert(
    Array.isArray(fixture.matchEvents.sourceIds) && fixture.matchEvents.sourceIds.length > 0,
    `${owner}.sourceIds must include at least one source`
  );
  validateLineupTimestamp(fixture.matchEvents.checkedAt || fixture.matchEvents.updatedAt, `${owner}.checkedAt`);
  assert(teams.has(fixture.homeTeamId) && teams.has(fixture.awayTeamId), `${owner} requires confirmed home and away teams`);
  validateMatchEventsSide(fixture.matchEvents.home, fixture, "home");
  validateMatchEventsSide(fixture.matchEvents.away, fixture, "away");
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
if (coachProfilesData) {
  assert(
    typeof coachProfilesData.updatedAt === "string" &&
      !Number.isNaN(new Date(coachProfilesData.updatedAt).getTime()),
    "coach-profiles.json must include a valid updatedAt"
  );
  assert(
    coachProfilesData.profiles && typeof coachProfilesData.profiles === "object",
    "coach-profiles.json must include profiles"
  );

  for (const [profileName, profile] of Object.entries(coachProfilesData.profiles || {})) {
    const owner = `coach-profiles.json "${profileName}"`;
    assert(profile && typeof profile === "object" && !Array.isArray(profile), `${owner} must be an object`);
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
      continue;
    }

    validateLocalizedCopy(profile.note, `${owner}.note`);
    validateLocalizedCopy(profile.history, `${owner}.history`);
  }
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
const fixturesById = new Map();
for (const fixture of fixturesData.fixtures || []) {
  assert(fixture.id, "Each fixture must have an id");
  assert(!fixtureIds.has(fixture.id), `Duplicate fixture id "${fixture.id}"`);
  fixtureIds.add(fixture.id);
  fixturesById.set(fixture.id, fixture);
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
  assert(["SCHEDULED", "DELAYED", "LIVE", "FT", "POSTPONED", "CANCELLED"].includes(fixture.status), `Fixture "${fixture.id}" has invalid status`);

  if (!["LIVE", "FT"].includes(fixture.status)) {
    assert(fixture.score === undefined, `Non-live fixture "${fixture.id}" must not include a score`);
    assert(fixture.scoreDetails === undefined, `Non-live fixture "${fixture.id}" must not include scoreDetails`);
    assert(fixture.scoreUpdatedAt === undefined, `Non-live fixture "${fixture.id}" must not include scoreUpdatedAt`);
  }

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
    validateScoreDetails(fixture);

    if (
      knockoutStages.has(fixture.stage) &&
      hasConfirmedTeams &&
      isNumber(fixture.score?.home) &&
      isNumber(fixture.score?.away) &&
      fixture.score.home === fixture.score.away
    ) {
      const penaltyWinnerTeamId = getScoreWinnerTeamId(fixture, fixture.scoreDetails?.penalties);

      assert(
        penaltyWinnerTeamId,
        `Final knockout fixture "${fixture.id}" ended level and must include non-tied scoreDetails.penalties`
      );
      if (fixture.winnerTeamId !== undefined) {
        assert(teams.has(fixture.winnerTeamId), `Fixture "${fixture.id}" winnerTeamId references unknown team "${fixture.winnerTeamId}"`);
        assert(
          fixture.winnerTeamId === penaltyWinnerTeamId,
          `Fixture "${fixture.id}" winnerTeamId must match scoreDetails.penalties winner`
        );
      }
    }

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
  validateHighlightVideoReview(fixture);
  validateResultStoryResearch(fixture, sourceIds);
  assert(fixture.lineups === undefined, `Fixture "${fixture.id}" must store lineup records in lineups.json, not fixtures.json`);
  validateFixtureMatchEvents(fixture, sourceIds);

  if (fixture.projection) {
    const projection = fixture.projection;
    const total = projection.home + projection.draw + projection.away;
    assert(sourceIds.has(projection.sourceId), `Fixture "${fixture.id}" projection references unknown source`);
    assert(total === 100, `Fixture "${fixture.id}" projection must total 100`);

    if (projection.sourceIds !== undefined) {
      requireSourceIds(projection.sourceIds, sourceIds, `Fixture "${fixture.id}" projection`);
      assert(
        projection.sourceIds.includes(projection.sourceId),
        `Fixture "${fixture.id}" projection sourceIds must include sourceId`
      );
    }

    if (projection.method === "online-source-consensus") {
      assert(
        Array.isArray(projection.sourceIds) && projection.sourceIds.length >= 2,
        `Fixture "${fixture.id}" online-source-consensus projection must include at least two sources`
      );
      assert(
        typeof projection.basis === "string" && projection.basis.trim(),
        `Fixture "${fixture.id}" online-source-consensus projection must describe its basis`
      );
      assert(
        isValidDateTime(projection.capturedAt),
        `Fixture "${fixture.id}" online-source-consensus projection must include a valid capturedAt`
      );
    }

    if (projection.method === "online-source-forecast") {
      assert(
        typeof projection.sourceUrl === "string" && /^https?:\/\//.test(projection.sourceUrl),
        `Fixture "${fixture.id}" online-source-forecast projection must include a sourceUrl`
      );
      assert(
        isValidDateTime(projection.publishedAt),
        `Fixture "${fixture.id}" online-source-forecast projection must include a valid publishedAt`
      );
      assert(
        new Date(projection.publishedAt).getTime() < new Date(fixture.kickoffUtc).getTime(),
        `Fixture "${fixture.id}" online-source-forecast projection must have been published before kickoff`
      );
      assert(
        isValidDateTime(projection.recoveredAt),
        `Fixture "${fixture.id}" online-source-forecast projection must include a valid recoveredAt`
      );
    }
  }

  if (fixture.shootoutForecast !== undefined) {
    const forecast = fixture.shootoutForecast;
    assert(
      forecast && typeof forecast === "object" && !Array.isArray(forecast),
      `Fixture "${fixture.id}" shootoutForecast must be an object`
    );
    assert(
      sourceIds.has(forecast?.sourceId),
      `Fixture "${fixture.id}" shootoutForecast references unknown source`
    );
    assert(
      forecast?.method === "method-of-victory-market",
      `Fixture "${fixture.id}" shootoutForecast must use method-of-victory-market`
    );
    assert(
      isValidDateTime(forecast?.capturedAt),
      `Fixture "${fixture.id}" shootoutForecast must include a valid capturedAt`
    );
    assert(
      isValidDateTime(forecast?.capturedAt) &&
        new Date(forecast.capturedAt).getTime() < new Date(fixture.kickoffUtc).getTime(),
      `Fixture "${fixture.id}" shootoutForecast must be captured before kickoff`
    );
    assert(
      forecast?.homeTeamId === fixture.homeTeamId && forecast?.awayTeamId === fixture.awayTeamId,
      `Fixture "${fixture.id}" shootoutForecast participants must match the fixture`
    );
    assert(
      Number.isFinite(forecast?.home) && Number.isFinite(forecast?.away),
      `Fixture "${fixture.id}" shootoutForecast probabilities must be numeric`
    );
    assert(
      forecast?.home >= 0 && forecast?.home <= 100 && forecast?.away >= 0 && forecast?.away <= 100,
      `Fixture "${fixture.id}" shootoutForecast probabilities must be between 0 and 100`
    );
    assert(
      forecast?.home + forecast?.away === 100,
      `Fixture "${fixture.id}" shootoutForecast probabilities must total 100`
    );
    assert(
      forecast?.prices && typeof forecast.prices === "object" && !Array.isArray(forecast.prices),
      `Fixture "${fixture.id}" shootoutForecast must preserve its market prices`
    );
    for (const side of ["home", "away"]) {
      assert(
        typeof forecast?.prices?.[side] === "string" && forecast.prices[side].trim(),
        `Fixture "${fixture.id}" shootoutForecast prices.${side} must be a non-empty string`
      );
    }
  }

  if (fixture.stage !== "group" && fixture.homeTeamId && fixture.awayTeamId) {
    assert(
      fixture.shootoutOutlook && typeof fixture.shootoutOutlook === "object" && !Array.isArray(fixture.shootoutOutlook),
      `Fixture "${fixture.id}" must include a shootoutOutlook once both knockout teams are confirmed`
    );
  }

  if (fixture.shootoutOutlook !== undefined) {
    const outlook = fixture.shootoutOutlook;
    assert(
      outlook && typeof outlook === "object" && !Array.isArray(outlook),
      `Fixture "${fixture.id}" shootoutOutlook must be an object`
    );
    requireSourceIds(outlook?.sourceIds, sourceIds, `Fixture "${fixture.id}" shootoutOutlook`);
    assert(
      outlook?.method === "world-cup-shootout-history" || outlook?.method === "sourced-shootout-evidence",
      `Fixture "${fixture.id}" shootoutOutlook has an unsupported method`
    );
    assert(
      isValidDateTime(outlook?.generatedAt),
      `Fixture "${fixture.id}" shootoutOutlook must include a valid generatedAt`
    );
    assert(
      outlook?.cutoffAt === fixture.kickoffUtc,
      `Fixture "${fixture.id}" shootoutOutlook cutoffAt must match kickoffUtc`
    );
    assert(
      outlook?.homeTeamId === fixture.homeTeamId && outlook?.awayTeamId === fixture.awayTeamId,
      `Fixture "${fixture.id}" shootoutOutlook participants must match the fixture`
    );

    for (const side of ["home", "away"]) {
      const record = outlook?.[side];
      assert(
        record && typeof record === "object" && !Array.isArray(record),
        `Fixture "${fixture.id}" shootoutOutlook.${side} must be an object`
      );
      for (const field of ["wins", "losses", "appearances"]) {
        assert(
          Number.isInteger(record?.[field]) && record[field] >= 0,
          `Fixture "${fixture.id}" shootoutOutlook.${side}.${field} must be a non-negative integer`
        );
      }
      assert(
        record?.wins + record?.losses === record?.appearances,
        `Fixture "${fixture.id}" shootoutOutlook.${side} wins and losses must total appearances`
      );
    }

    if (outlook?.method === "sourced-shootout-evidence") {
      assert(
        Array.isArray(outlook.sourceIds) && outlook.sourceIds.length >= 3,
        `Fixture "${fixture.id}" sourced shootoutOutlook must include at least three sources`
      );
      assert(
        isValidDateTime(outlook.capturedAt) &&
          new Date(outlook.capturedAt).getTime() < new Date(fixture.kickoffUtc).getTime(),
        `Fixture "${fixture.id}" sourced shootoutOutlook must be captured before kickoff`
      );
      assert(
        [fixture.homeTeamId, fixture.awayTeamId].includes(outlook.leanTeamId),
        `Fixture "${fixture.id}" sourced shootoutOutlook leanTeamId must be a participant`
      );
      assert(
        outlook.confidence === "slight",
        `Fixture "${fixture.id}" sourced shootoutOutlook must keep the evidence lean slight`
      );
      assert(
        Array.isArray(outlook.evidence) && outlook.evidence.length >= 2,
        `Fixture "${fixture.id}" sourced shootoutOutlook must include at least two evidence items`
      );
      for (const [index, evidence] of (outlook.evidence || []).entries()) {
        assert(
          evidence && typeof evidence === "object" && typeof evidence.type === "string" && evidence.type.trim(),
          `Fixture "${fixture.id}" shootoutOutlook evidence[${index}] must include a type`
        );
        assert(
          [fixture.homeTeamId, fixture.awayTeamId].includes(evidence?.teamId),
          `Fixture "${fixture.id}" shootoutOutlook evidence[${index}] teamId must be a participant`
        );
      }
    }
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
      if (goal?.assistName !== undefined) {
        assert(
          typeof goal.assistName === "string" && goal.assistName.trim(),
          `Fixture "${fixture.id}" ${field}[${index}].assistName must be a non-empty string when provided`
        );
        requiredProfileNames.add(goal.assistName);
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
    assert(
      fixture.projection,
      `Confirmed fixture "${fixture.id}" must include projection; run pnpm projections`
    );
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
  if (hasConfirmedTeams) {
    const hasPendingH2h = ["not-loaded", "research-pending"].includes(fixture.h2h.status);

    if (hasPendingH2h && H2H_SOURCE_OPTIONAL) {
      console.warn(
        `Warning: Confirmed fixture "${fixture.id}" has pending H2H while H2H_SOURCE_OPTIONAL is enabled.`
      );
    } else {
      assert(
        !hasPendingH2h,
        `Confirmed fixture "${fixture.id}" must include loaded or verified-empty H2H; run pnpm sync:h2h or add verified senior results`
      );
    }
  }
  if (fixture.h2h.sourceId) {
    assert(sourceIds.has(fixture.h2h.sourceId), `Fixture "${fixture.id}" h2h references unknown source`);
  }
  assert(
    fixture.h2h.results === null || Array.isArray(fixture.h2h.results),
    `Fixture "${fixture.id}" h2h.results must be null or an array`
  );

  if (Array.isArray(fixture.h2h.results)) {
    const fixtureDayKey = getFixtureDayKey(fixture);

    for (const [index, result] of fixture.h2h.results.entries()) {
      assert(result.date, `Fixture "${fixture.id}" h2h result ${index + 1} must include date`);
      assert(isH2hResultDate(result.date), `Fixture "${fixture.id}" h2h result ${index + 1} must include a valid date`);
      if (fixtureDayKey) {
        assert(
          isH2hResultBeforeFixture(result.date, fixtureDayKey),
          `Fixture "${fixture.id}" h2h result ${index + 1} must be before fixture date ${fixtureDayKey}`
        );
      }
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

assert(isPlainObject(lineupsData), "lineups.json must be an object");
if (isPlainObject(lineupsData)) {
  if (lineupsData.updatedAt !== undefined) {
    assert(isValidDateTime(lineupsData.updatedAt), "lineups.json updatedAt must be a valid date-time when present");
  }
  assert(isPlainObject(lineupsData.lineups), "lineups.json lineups must be an object keyed by fixture id");
  for (const [fixtureId, lineups] of Object.entries(isPlainObject(lineupsData.lineups) ? lineupsData.lineups : {})) {
    const fixture = fixturesById.get(fixtureId);
    assert(fixture, `lineups.json references unknown fixture "${fixtureId}"`);
    if (!fixture) {
      continue;
    }
    const fixtureWithLineups = { ...fixture, lineups };
    validateFixtureLineups(fixtureWithLineups, sourceIds);
    validateLineupGoalCoverage(fixtureWithLineups, `lineups.json fixture "${fixtureId}"`);
  }
}
if (expectedLineupsData !== null) {
  assert(isPlainObject(expectedLineupsData), "expected-lineups.json must be an object");
  if (isPlainObject(expectedLineupsData)) {
    assert(typeof expectedLineupsData.schemaVersion === "string" && expectedLineupsData.schemaVersion.trim(),
      "expected-lineups.json.schemaVersion must be a non-empty string");
    assert(isValidDateTime(expectedLineupsData.generatedAt), "expected-lineups.json.generatedAt must be a valid date-time");
    assert(Array.isArray(expectedLineupsData.fixtures), "expected-lineups.json.fixtures must be an array");
    if (expectedLineupsData.engine !== undefined) {
      assert(isPlainObject(expectedLineupsData.engine), "expected-lineups.json.engine must be an object");
      if (isPlainObject(expectedLineupsData.engine)) {
        assert(typeof expectedLineupsData.engine.id === "string" && expectedLineupsData.engine.id.trim(),
          "expected-lineups.json.engine.id must be a non-empty string");
        assert(typeof expectedLineupsData.engine.version === "string" && expectedLineupsData.engine.version.trim(),
          "expected-lineups.json.engine.version must be a non-empty string");
      }
    }
    const expectedLineupSourceIds = new Set(sourceIds);
    if (expectedLineupsData.sources !== undefined) {
      assert(Array.isArray(expectedLineupsData.sources), "expected-lineups.json.sources must be an array");
      for (const [index, source] of (Array.isArray(expectedLineupsData.sources) ? expectedLineupsData.sources : []).entries()) {
        registerSource(source, expectedLineupSourceIds, `expected-lineups.json.sources[${index}]`);
      }
    }

    const seenExpectedLineupFixtures = new Set();
    for (const [index, expectedLineupRecord] of expectedLineupsData.fixtures.entries()) {
      validateExpectedLineupRecord(
        expectedLineupRecord,
        expectedLineupSourceIds,
        fixturesById,
        `expected-lineups.json.fixtures[${index}]`,
        seenExpectedLineupFixtures
      );
    }
  }
}
validateLineupLayoutOverrides(lineupLayoutOverridesData, lineupsData);

const completedFixtureLineupOverrides = isPlainObject(lineupLayoutOverridesData?.fixtures) ? lineupLayoutOverridesData.fixtures : {};
for (const fixture of fixturesData.fixtures || []) {
  const lineups = isPlainObject(lineupsData.lineups)
    ? lineupsData.lineups[fixture.id]
    : undefined;

  validateCompletedFixtureTrust(fixture, lineups, completedFixtureLineupOverrides[fixture.id]);
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
  if (profile.peakMarketValueEurMillions !== undefined) {
    assert(
      isNumber(profile.peakMarketValueEurMillions) && profile.peakMarketValueEurMillions > 0,
      `player-profiles.json "${playerName}" peakMarketValueEurMillions must be a positive number when present`
    );
    assert(
      typeof profile.peakMarketValueSource === "string" && profile.peakMarketValueSource.trim(),
      `player-profiles.json "${playerName}" peakMarketValueSource must be a non-empty string when peakMarketValueEurMillions is present`
    );
    if (profile.peakMarketValueSourceUrl !== undefined) {
      assert(
        /^https?:\/\//.test(profile.peakMarketValueSourceUrl),
        `player-profiles.json "${playerName}" peakMarketValueSourceUrl must be an HTTP URL when present`
      );
    }
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
const historicalFixturesById = new Map();
const historicalYouTubeDispositionFixtureIds = new Set();
for (const fixture of historyData.fixtures || []) {
  assert(fixture.id, "Each historical fixture must have an id");
  assert(!historicalFixtureIds.has(fixture.id), `Duplicate historical fixture id "${fixture.id}"`);
  historicalFixtureIds.add(fixture.id);
  if (fixture.id) {
    historicalFixturesById.set(fixture.id, fixture);
  }
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
  validateHighlightVideo(fixture, `Historical fixture "${fixture.id}" highlightVideo`);
  validateHighlightVideoReview(fixture, `Historical fixture "${fixture.id}" highlightVideoReview`);
  if (fixture.highlightVideo || fixture.highlightVideoReview) {
    historicalYouTubeDispositionFixtureIds.add(fixture.id);
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

if (youtubeHistoryCacheData) {
  validateHistoricalYouTubeCache(youtubeHistoryCacheData, historicalFixturesById, historicalYouTubeDispositionFixtureIds);
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
