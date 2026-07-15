#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyLineupLayoutOverride,
  canApplyLineupLayoutOverride,
  compareLineupsToLayoutOverride,
  getLayoutOverrideProvenanceIssues,
  getVerifiedLayoutOverride,
  isFifaOfficialLayoutOverride,
  normalizeLayoutPlayerName,
  shouldPreserveLayoutOverride,
  VERIFIED_LAYOUT_SOURCE
} from "./lineup-layout-overrides.mjs";
import { assignRolesFromPitchGeometry } from "./lineup-layout-roles.mjs";
import { buildExactLayoutConsensus } from "./lineup-layout-consensus.mjs";
import { isPlayerNameMatch } from "./player-name-matching.mjs";
import { getSourceCandidatesForFixture } from "./lineup-layout-source-candidates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const shouldWrite = !process.argv.includes("--check");
const args = process.argv.slice(2);
const shouldReverify = args.includes("--reverify");
const checkedAt = process.env.LINEUP_LAYOUT_CHECKED_AT || new Date().toISOString();
const overrideSourceId = `lineup-layout-verification-${checkedAt.slice(0, 10)}`;
const requestTimeoutMs = Number(process.env.LINEUP_LAYOUT_TIMEOUT_MS || 15000);
const COMPLETED_STATUSES = new Set(["FT", "AET", "PEN"]);
const LIVE_START_STATUSES = new Set(["SCHEDULED", "DELAYED", "LIVE"]);
const VALID_SCOPE_VALUES = new Set(["all-completed", "knockout", "recent-completed", "live-start"]);
const DEFAULT_SCOPE = "all-completed";
const DEFAULT_RECENT_COMPLETED_DAYS = 30;
const DEFAULT_LIVE_START_BEFORE_MINUTES = 10;
const DEFAULT_LIVE_START_AFTER_MINUTES = 20;
const CLAIM_STATUSES = new Set(["matched", "unavailable", "blocked", "error", "conflict"]);
const BLOCKED_HTTP_STATUSES = new Set([403, 429, 451]);
const requestedFixtureFilter = new Set(
  args
    .filter((arg) => arg.startsWith("--fixture="))
    .flatMap((arg) => arg.slice("--fixture=".length).split(","))
    .map((value) => value.trim())
    .filter(Boolean)
);

function getArgValue(prefix, fallback = "") {
  const arg = args.find((candidate) => candidate.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim() : fallback;
}

function getRequestedScope() {
  const providedScope = getArgValue("--scope=");
  if (!providedScope) {
    return DEFAULT_SCOPE;
  }

  if (!VALID_SCOPE_VALUES.has(providedScope)) {
    console.error(`Unknown scope "${providedScope}". Use one of: ${[...VALID_SCOPE_VALUES].join(", ")}.`);
    process.exit(1);
  }

  return providedScope;
}

function getRequestedRecentCompletedDays() {
  const argValue = getArgValue("--recent-days=");
  if (!argValue) {
    return Number(process.env.LINEUP_LAYOUT_RECENT_DAYS || DEFAULT_RECENT_COMPLETED_DAYS);
  }

  const parsed = Number(argValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.error(`--recent-days must be a positive number. Received: ${argValue}`);
    process.exit(1);
  }

  return parsed;
}

function getPositiveMinutes(argValue, envValue, fallback, label) {
  const parsed = Number(argValue || envValue || fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.error(`${label} must be a positive number. Received: ${argValue || envValue}`);
    process.exit(1);
  }

  return parsed;
}

function getRequestedLiveStartBeforeMinutes() {
  const legacyWindow = getArgValue("--live-start-window-minutes=") || process.env.LINEUP_LAYOUT_LIVE_START_WINDOW_MINUTES;
  return getPositiveMinutes(
    getArgValue("--before-kickoff-minutes="),
    process.env.LINEUP_LAYOUT_LIVE_START_BEFORE_MINUTES || legacyWindow,
    DEFAULT_LIVE_START_BEFORE_MINUTES,
    "--before-kickoff-minutes"
  );
}

function getRequestedLiveStartAfterMinutes() {
  const legacyWindow = getArgValue("--live-start-window-minutes=") || process.env.LINEUP_LAYOUT_LIVE_START_WINDOW_MINUTES;
  return getPositiveMinutes(
    getArgValue("--after-kickoff-minutes="),
    process.env.LINEUP_LAYOUT_LIVE_START_AFTER_MINUTES || legacyWindow,
    DEFAULT_LIVE_START_AFTER_MINUTES,
    "--after-kickoff-minutes"
  );
}

function getAuditNow() {
  const value = process.env.LINEUP_LAYOUT_NOW || "";
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    console.error(`LINEUP_LAYOUT_NOW must be a valid date-time. Received: ${value}`);
    process.exit(1);
  }

  return parsed;
}

const requestedScope = getRequestedScope();
const requestedRecentDays = getRequestedRecentCompletedDays();
const requestedLiveStartBeforeMinutes = getRequestedLiveStartBeforeMinutes();
const requestedLiveStartAfterMinutes = getRequestedLiveStartAfterMinutes();
const requestedFixtureIds = getRequestedFixtureFilter();
const auditNow = getAuditNow();

function getRequestedFixtureFilter() {
  if (!requestedFixtureFilter.size) {
    return null;
  }

  return requestedFixtureFilter;
}

function isRequestedFixture(fixture, requestedFixtureIds) {
  if (!requestedFixtureIds) {
    return true;
  }

  if (requestedFixtureIds.has(fixture.id)) {
    return true;
  }

  return requestedFixtureIds.has(String(fixture.matchNumber));
}

function isCompletedFixture(fixture) {
  return COMPLETED_STATUSES.has(fixture?.status);
}

function isKnockoutFixture(fixture) {
  return fixture?.stage && fixture.stage !== "group";
}

function getFixtureTimestamp(fixture) {
  if (!fixture) {
    return Number.NaN;
  }

  const kickoff = fixture.kickoffUtc || fixture.date;
  const parsed = new Date(kickoff);
  return Number.isNaN(parsed.getTime()) ? Number.NaN : parsed.getTime();
}

function isRecentCompletedFixture(fixture) {
  if (!Number.isFinite(requestedRecentDays) || requestedRecentDays <= 0) {
    return false;
  }

  const cutoff = auditNow.getTime() - requestedRecentDays * 24 * 60 * 60 * 1000;
  const fixtureTime = getFixtureTimestamp(fixture);
  return Number.isFinite(fixtureTime) ? fixtureTime >= cutoff : false;
}

function minutesSinceKickoff(fixture) {
  const fixtureTime = getFixtureTimestamp(fixture);
  return Number.isFinite(fixtureTime) ? (auditNow.getTime() - fixtureTime) / 60000 : Number.NaN;
}

function isLiveStartFixture(fixture) {
  if (!LIVE_START_STATUSES.has(fixture?.status)) {
    return false;
  }

  const minutes = minutesSinceKickoff(fixture);
  if (!Number.isFinite(minutes)) {
    return true;
  }

  return minutes >= -requestedLiveStartBeforeMinutes && minutes <= requestedLiveStartAfterMinutes;
}

function isFixtureInScope(fixture, scope) {
  if (scope === "live-start") {
    return isLiveStartFixture(fixture);
  }

  if (!isCompletedFixture(fixture)) {
    return false;
  }

  if (scope === "knockout") {
    return isKnockoutFixture(fixture);
  }

  if (scope === "recent-completed") {
    return isRecentCompletedFixture(fixture);
  }

  return true;
}

function isVerifiedLineupSource(lineups) {
  if (!lineups) {
    return false;
  }

  const modeReady = ["confirmed", "final", "live"].includes(String(lineups.mode || "").trim().toLowerCase());
  const sourceReady = modeReady && lineups.teamSheetSource === "fifa-official" && lineups.eventSource === "fifa-official";
  const homePlayers = Array.isArray(lineups?.home?.players) ? lineups.home.players : [];
  const awayPlayers = Array.isArray(lineups?.away?.players) ? lineups.away.players : [];
  return sourceReady && homePlayers.length === 11 && awayPlayers.length === 11;
}

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

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 World Cup Simplified lineup verifier"
    },
    signal: AbortSignal.timeout(requestTimeoutMs)
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, statusText: response.statusText, text };
}

async function discoverEspnSourceCandidates(fixture) {
  const kickoff = new Date(fixture?.kickoffUtc || "");
  if (
    Number.isNaN(kickoff.getTime()) ||
    !fixture?.homeTeamId ||
    !fixture?.awayTeamId
  ) {
    return [];
  }

  const day = kickoff.toISOString().slice(0, 10).replaceAll("-", "");
  const scoreboardUrl =
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${day}`;
  try {
    const response = await fetchText(scoreboardUrl);
    if (!response.ok) {
      return [];
    }
    const payload = JSON.parse(response.text);
    const event = (payload.events || []).find((candidate) => {
      const competitors = candidate?.competitions?.[0]?.competitors || [];
      const abbreviations = new Set(
        competitors.map((entry) => String(entry?.team?.abbreviation || "").trim().toUpperCase())
      );
      return abbreviations.has(fixture.homeTeamId) && abbreviations.has(fixture.awayTeamId);
    });
    if (!event?.id) {
      return [];
    }
    return [{
      name: "ESPN",
      adapter: "espn",
      url: `https://www.espn.com/soccer/match/_/gameId/${event.id}`,
      discoveredFrom: scoreboardUrl
    }];
  } catch {
    return [];
  }
}

function normalizeTeamName(value) {
  const compact = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  const aliases = {
    capeverde: "caboverde",
    congodr: "drcongo",
    czechrepublic: "czechia",
    iran: "iriran",
    ivorycoast: "cotedivoire",
    korearepublic: "southkorea",
    turkey: "turkiye",
    us: "unitedstates",
    usa: "unitedstates"
  };
  return aliases[compact] || compact;
}

function sourceTeamMatches(sourceTeam, team) {
  const sourceName = normalizeTeamName(sourceTeam?.longName || sourceTeam?.name);
  if (!sourceName || !team) {
    return false;
  }

  return [team.name, team.officialName, team.shortName, team.id]
    .map(normalizeTeamName)
    .filter(Boolean)
    .includes(sourceName);
}

async function discoverFotmobSourceCandidates(fixture, teamsById) {
  const kickoff = new Date(fixture?.kickoffUtc || "");
  const homeTeam = teamsById.get(fixture?.homeTeamId);
  const awayTeam = teamsById.get(fixture?.awayTeamId);
  if (Number.isNaN(kickoff.getTime()) || !homeTeam || !awayTeam) {
    return [];
  }

  const day = kickoff.toISOString().slice(0, 10).replaceAll("-", "");
  const matchesUrl = `https://www.fotmob.com/api/data/matches?date=${day}&timezone=UTC&ccode3=USA`;
  try {
    const response = await fetchText(matchesUrl);
    if (!response.ok) {
      return [];
    }
    const payload = JSON.parse(response.text);
    const matches = (payload.leagues || []).flatMap((league) => league?.matches || []);
    const match = matches.find((candidate) =>
      sourceTeamMatches(candidate?.home, homeTeam) && sourceTeamMatches(candidate?.away, awayTeam)
    );
    if (!match?.id) {
      return [];
    }

    return [{
      name: "FotMob",
      adapter: "fotmob",
      url: `https://www.fotmob.com/match/${match.id}`,
      discoveredFrom: matchesUrl
    }];
  } catch {
    return [];
  }
}

function mergeSourceCandidates(...candidateGroups) {
  const merged = [];
  const seen = new Set();
  for (const source of candidateGroups.flat()) {
    if (!source?.url) {
      continue;
    }
    const key = `${String(source.adapter || source.name || "").toLowerCase()}|${source.url}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(source);
  }
  return merged;
}

function playerName(player) {
  return String(player?.name || player?.fullName || player?.displayName || "").trim();
}

function officialSideNames(lineups, side) {
  return (lineups?.[side]?.players || []).map(playerName).filter(Boolean);
}

function sameName(left, right) {
  const normalizedLeft = normalizeLayoutPlayerName(left);
  const normalizedRight = normalizeLayoutPlayerName(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  const leftTokens = normalizedLeft.split(" ").filter(Boolean);
  const rightTokens = normalizedRight.split(" ").filter(Boolean);
  if (leftTokens.length === 1 && rightTokens.length >= 2) {
    return rightTokens.includes(leftTokens[0]) && leftTokens[0].length >= 4;
  }
  if (rightTokens.length === 1 && leftTokens.length >= 2) {
    return leftTokens.includes(rightTokens[0]) && rightTokens[0].length >= 4;
  }

  return isPlayerNameMatch(left, right) || isPlayerNameMatch(right, left);
}

function officialNameForSourceName(sourceName, officialNames) {
  const exactMatches = officialNames.filter((officialName) => normalizeLayoutPlayerName(officialName) === normalizeLayoutPlayerName(sourceName));
  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  const fuzzyMatches = officialNames.filter((officialName) => sameName(sourceName, officialName));
  if (fuzzyMatches.length === 1) {
    return fuzzyMatches[0];
  }

  if (fuzzyMatches.length > 1) {
    return sourceName;
  }

  return sourceName;
}

function officialPlayerForSourceName(sourceName, officialPlayers) {
  const matches = officialPlayers.filter((player) => sameName(playerName(player), sourceName));
  if (matches.length !== 1) {
    return null;
  }

  return matches[0];
}

function applyOfficialGeometry(sourcePlayers, officialPlayers) {
  return sourcePlayers.map((player) => {
    const officialPlayer = officialPlayerForSourceName(player.name, officialPlayers);
    if (!officialPlayer) {
      return player;
    }

    const officialX = Number(officialPlayer.x);
    const officialY = Number(officialPlayer.y);
    const sourceX = Number(player.x);
    const sourceY = Number(player.y);
    return {
      ...player,
      name: officialNameForSourceName(player.name, officialPlayers.map(playerName)),
      x: Number.isFinite(sourceX) ? sourceX : Number.isFinite(officialX) ? officialX : player.x,
      y: Number.isFinite(sourceY) ? sourceY : Number.isFinite(officialY) ? officialY : player.y,
      number: officialPlayer.number || player.number || ""
    };
  });
}

function getOfficialRowsByPlayerName(officialPlayers, formation) {
  const officialPlayerRows = new Map();
  const expectedRows = formationRowCounts(formation);

  const withRows = officialPlayers
    .filter((player) => Number.isFinite(Number(player?.y)))
    .sort((left, right) => Number(left.y) - Number(right.y))
    .map((player, index) => {
      const row = (() => {
        let count = 0;
        let cursor = 0;

        for (const rowCount of expectedRows) {
          if (count + rowCount > index) {
            return cursor;
          }
          count += rowCount;
          cursor += 1;
        }
        return expectedRows.length - 1;
      })();

      return { player, row };
    });

  for (const { player, row } of withRows) {
    officialPlayerRows.set(normalizeLayoutPlayerName(playerName(player)), row);
  }

  return officialPlayerRows;
}

function signatureFromLayout(formation, players) {
  const rowCounts = formationRowCounts(formation);
  const sortedPlayers = [...players].sort((left, right) => left.y - right.y || left.x - right.x);
  const rows = [];
  let offset = 0;

  for (const count of rowCounts) {
    rows.push(sortedPlayers.slice(offset, offset + count));
    offset += count;
  }

  return rows
    .map((rowPlayers) =>
      rowPlayers
        .sort((left, right) => left.x - right.x)
        .map((player) => normalizeLayoutPlayerName(player.name))
        .join("/")
    )
    .join("|");
}

function formationRowCounts(formation) {
  const digits = String(formation || "")
    .split("-")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  if (digits.reduce((sum, value) => sum + value, 0) !== 10) {
    return [3, 3, 4, 1];
  }

  const [defenderCount, ...rest] = digits;
  const forwardCount = rest.at(-1);
  const midfieldRows = rest.slice(0, -1);
  return [forwardCount, ...midfieldRows.slice().reverse(), defenderCount, 1];
}

function assertValidRowShape(rowGroups, expectedRows, options = {}) {
  const { validateColumns = true } = options;
  if (!Array.isArray(rowGroups) || rowGroups.length !== expectedRows.length) {
    return false;
  }

  return rowGroups.every((row, index) => {
    const expectedCount = expectedRows[index];
    const rowCount = Array.isArray(row) ? row.length : 0;
    if (rowCount !== expectedCount || !Number.isInteger(expectedCount) || expectedCount <= 0) {
      return false;
    }

    if (!validateColumns) {
      return true;
    }

    const columns = row
      .map((player) => player?.column)
      .filter((value) => value !== undefined)
      .map((value) => Number(value))
      .filter(Number.isFinite);

    if (columns.length && columns.length !== expectedCount) {
      return false;
    }

    if (!columns.length) {
      return true;
    }

    if (new Set(columns).size !== columns.length) {
      return false;
    }

    const maxColumn = Math.max(...columns);
    const minColumn = Math.min(...columns);
    return maxColumn < expectedCount && minColumn >= 0;
  });
}

function buildSideFromExactLayout(lineups, side, formation, sourcePlayers) {
  const officialPlayers = lineups?.[side]?.players || [];
  const officialNames = officialPlayers.map(playerName).filter(Boolean);
  const players = sourcePlayers.map((player) => ({
    ...player,
    name: officialNameForSourceName(player.name, officialNames),
    number: officialPlayerForSourceName(player.name, officialPlayers)?.number || player.number || ""
  }));
  const assigned = assignRolesFromPitchGeometry(formation, players);

  return {
    formation,
    players: assigned.map((player) => ({
      number: String(player.number || ""),
      name: player.name,
      position: player.position,
      x: Number(player.x.toFixed(1)),
      y: Number(player.y.toFixed(1))
    }))
  };
}

function normalizeExactSourceFormation(value, fallback = "") {
  const digits = String(value || "")
    .trim()
    .split("-")
    .map((part) => Number(part));

  return digits.length >= 2 && digits.every((part) => Number.isInteger(part) && part > 0) &&
    digits.reduce((sum, part) => sum + part, 0) === 10
    ? digits.join("-")
    : fallback;
}

function exactSideCoversOfficialStarters(sourceSide, officialPlayers) {
  const sourcePlayers = Array.isArray(sourceSide?.players) ? sourceSide.players : [];
  if (sourcePlayers.length !== 11 || officialPlayers.length !== 11) {
    return false;
  }

  return officialPlayers.every((officialPlayer) => {
    const officialNumber = String(officialPlayer?.number || "").trim();
    return sourcePlayers.filter((sourcePlayer) =>
      sameName(sourcePlayer?.name, playerName(officialPlayer)) &&
      (!officialNumber || String(sourcePlayer?.number || "").trim() === officialNumber)
    ).length === 1;
  });
}

function sourceClaimFromExactLayout({
  name,
  adapter,
  url,
  sourceDetail = "",
  lineups,
  homePlayers,
  awayPlayers,
  homeFormation: sourceHomeFormation = "",
  awayFormation: sourceAwayFormation = ""
}) {
  // An exact board provider owns both the coordinates and the tactical shape.
  // FIFA's team-sheet tactics can be generic, so keeping that formation while
  // importing a different board geometry produces internally inconsistent UI.
  const homeFormation = normalizeExactSourceFormation(sourceHomeFormation, lineups.home?.formation || "");
  const awayFormation = normalizeExactSourceFormation(sourceAwayFormation, lineups.away?.formation || "");
  const home = buildSideFromExactLayout(lineups, "home", homeFormation, homePlayers);
  const away = buildSideFromExactLayout(lineups, "away", awayFormation, awayPlayers);
  if (
    !exactSideCoversOfficialStarters(home, lineups?.home?.players || []) ||
    !exactSideCoversOfficialStarters(away, lineups?.away?.players || [])
  ) {
    return sourceClaimEnvelope({ name, adapter, url }, {
      status: "unavailable",
      sourceDetail,
      note: "The source board did not resolve all 22 players one-to-one to the official FIFA starters."
    });
  }

  return {
    name,
    ...(adapter ? { adapter } : {}),
    url,
    status: "matched",
    sourceDetail,
    exactLayout: true,
    home,
    away,
    signature: {
      home: `${home.formation}::${signatureFromLayout(home.formation, home.players)}`,
      away: `${away.formation}::${signatureFromLayout(away.formation, away.players)}`
    }
  };
}

function sofaScoreHistoryPlayers(sideRecord, officialPlayers) {
  const formation = normalizeExactSourceFormation(sideRecord?.formation);
  const rowsFromGoalkeeper = Array.isArray(sideRecord?.rowsFromGoalkeeper)
    ? sideRecord.rowsFromGoalkeeper
    : [];
  const sourceRows = [...rowsFromGoalkeeper.slice(1)].reverse();
  sourceRows.push(rowsFromGoalkeeper[0] || []);
  const expectedRows = formationRowCounts(formation);
  if (!formation || !assertValidRowShape(
    sourceRows.map((row) => row.map((number, column) => ({ number, column }))),
    expectedRows
  )) {
    throw new Error("SofaScore history row counts did not match the stored formation.");
  }

  const rowCount = sourceRows.length;
  const players = [];
  for (let rowIndex = 0; rowIndex < sourceRows.length; rowIndex += 1) {
    const row = sourceRows[rowIndex];
    const y = rowCount === 1 ? 50 : 10.5 + (80 * rowIndex) / (rowCount - 1);
    for (let column = 0; column < row.length; column += 1) {
      const number = String(row[column] || "").trim();
      const matches = officialPlayers.filter(
        (player) => String(player?.number || "").trim() === number
      );
      if (matches.length !== 1) {
        throw new Error(`SofaScore shirt number ${number || "(blank)"} did not resolve to one official starter.`);
      }
      players.push({
        name: playerName(matches[0]),
        number,
        x: (100 * (column + 1)) / (row.length + 1),
        y
      });
    }
  }

  return players;
}

function parseSofaScoreHistoryLayout(record, lineups, source) {
  try {
    const homePlayers = sofaScoreHistoryPlayers(record?.home, lineups?.home?.players || []);
    const awayPlayers = sofaScoreHistoryPlayers(record?.away, lineups?.away?.players || []);
    return sourceClaimFromExactLayout({
      name: source.name,
      adapter: source.adapter,
      url: source.url,
      sourceDetail: source.sourceDetail,
      lineups,
      homePlayers,
      awayPlayers,
      homeFormation: record?.home?.formation,
      awayFormation: record?.away?.formation
    });
  } catch (error) {
    return sourceClaimFromError(source, error.message);
  }
}

function sourceClaimFromUnsupportedAdapter(source) {
  return {
    ...source,
    status: "unavailable",
    note: `No parser is registered for source adapter "${source.adapter || "unknown"}".`
  };
}

function sourceClaimEnvelope(source, values = {}) {
  const sourceStatus = values.status;
  return {
    ...source,
    status: CLAIM_STATUSES.has(sourceStatus) ? sourceStatus : "error",
    ...(values.note ? { note: values.note } : {}),
    ...(values.sourceDetail ? { sourceDetail: values.sourceDetail } : {}),
    ...(values.exactLayout !== undefined ? { exactLayout: values.exactLayout } : {}),
    ...(values.signature ? { signature: values.signature } : {}),
    ...(values.home ? { home: values.home } : {}),
    ...(values.away ? { away: values.away } : {})
  };
}

function sourceClaimFromError(source, errorMessage = "Source claim parsing failed.") {
  return sourceClaimEnvelope(source, {
    status: "error",
    note: errorMessage
  });
}

function isBlockedStatus(status, text = "") {
  if (status && BLOCKED_HTTP_STATUSES.has(Number(status))) {
    return true;
  }

  const normalized = String(text || "").toLowerCase();
  return /blocked|forbidden|captcha|access denied/i.test(normalized);
}

function parseEspnLayout(html, lineups, source) {
  const start = html.indexOf("Formations &amp; Lineups");
  if (start < 0) {
    return sourceClaimEnvelope(source, {
      status: "unavailable",
      note: "Formations & Lineups section was not found."
    });
  }

  const section = html.slice(start, start + 160000);
  const formationTabs = [
    ...section.slice(0, 20000).matchAll(
      /<button[^>]*role="tab"[\s\S]*?<img[^>]+alt="[^"]+"[\s\S]*?<span[^>]*>(\d(?:-\d+){1,4})<\/span>[\s\S]*?<\/button>/g
    )
  ].map((match) => match[1]);
  const regex =
    /style="left:([0-9.]+)%;top:([0-9.]+)%"[\s\S]{0,1400}?data-track-athlete="([^"]+)"[\s\S]{0,600}?>([^<>]+)<\/a>/g;
  const officialHomeNames = officialSideNames(lineups, "home");
  const officialAwayNames = officialSideNames(lineups, "away");
  const homePlayers = [];
  const awayPlayers = [];
  let match;

  while ((match = regex.exec(section))) {
    const sourceName = decodeHtml(match[3]);
    const player = {
      name: sourceName,
      number: "",
      x: Number(match[1]),
      y: Number(match[2])
    };
    if (officialHomeNames.some((name) => sameName(name, sourceName))) {
      homePlayers.push(player);
    } else if (officialAwayNames.some((name) => sameName(name, sourceName))) {
      awayPlayers.push(player);
    }
  }

  if (homePlayers.length !== 11 || awayPlayers.length !== 11) {
    return sourceClaimEnvelope(source, {
      status: "unavailable",
      note: `Expected 11 starters per side from ESPN; parsed ${homePlayers.length} home and ${awayPlayers.length} away.`
    });
  }

  const homeCanonicalPlayers = applyOfficialGeometry(homePlayers, lineups?.home?.players || []);
  const awayCanonicalPlayers = applyOfficialGeometry(awayPlayers, lineups?.away?.players || []);

  return sourceClaimFromExactLayout({
    name: source.name,
    adapter: source.adapter,
    url: source.url,
    sourceDetail: "public match-center board geometry",
    lineups,
    homePlayers: homeCanonicalPlayers,
    awayPlayers: awayCanonicalPlayers,
    homeFormation: formationTabs[0],
    awayFormation: formationTabs[1]
  });
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

function parseNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) {
    return null;
  }

  return JSON.parse(match[1]);
}

function normalizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function normalizeFotmobPercent(value, { invert = false } = {}) {
  const normalized = normalizeNumber(value);
  if (!Number.isFinite(normalized)) {
    return Number.NaN;
  }

  const percent = Math.abs(normalized) <= 1 ? normalized * 100 : normalized;
  return invert ? 100 - percent : percent;
}

function fotmobPitchX(starter) {
  return normalizeFotmobPercent(starter?.verticalLayout?.x, { invert: true });
}

function fotmobPitchY(starter) {
  return normalizeFotmobPercent(starter?.verticalLayout?.y, { invert: true });
}

function fotmobRank(positionId, expectedRows) {
  const expectedRowCount = Number.isFinite(expectedRows) && expectedRows > 0 ? expectedRows : 5;
  const rankByPositionId = {
    11: [0, 0],
    115: [1, 0],
    103: [1, 1],
    104: [1, 2],
    105: [1, 3],
    106: [1, 4],
    107: [1, 5],
    83: [2, 0],
    84: [2, 1],
    85: [2, 2],
    86: [2, 3],
    87: [2, 4],
    73: [3, 0],
    75: [3, 1],
    77: [3, 2],
    64: [3, 0],
    66: [3, 1],
    65: [3, 2],
    51: [3, 3],
    59: [3, 4],
    33: [3, 5],
    35: [3, 6],
    37: [3, 7],
    38: [4, 0],
    36: [4, 1],
    34: [4, 2],
    32: [4, 3],
    82: [2, 0],
    84: [2, 1],
    86: [2, 2],
    88: [2, 3]
  };

  const rank = rankByPositionId[Number(positionId)];
  if (!rank) {
    return [9, Number(positionId) || 0];
  }

  if (rank[0] === 0) {
    return [expectedRowCount, rank[1]];
  }

  return rank;
}

function collectFotmobSourcePlayers(team, officialPlayers, formation) {
  const officialNames = officialPlayers.map(playerName);
  return (team?.starters || []).map((starter) => ({
    sourceName: starter.name,
    officialPlayer: officialPlayerForSourceName(starter.name, officialPlayers),
    name: officialNameForSourceName(starter.name, officialNames),
    positionId: Number(starter.positionId),
    x: fotmobPitchX(starter),
    y: fotmobPitchY(starter),
    layoutX: fotmobPitchX(starter),
    layoutY: fotmobPitchY(starter)
  }));
}

function buildFotmobRowsFromTeam(team, officialPlayers, formation) {
  const officialPlayerRows = getOfficialRowsByPlayerName(officialPlayers, formation);
  if (!team?.starters?.length) {
    return null;
  }

  const officialNames = officialPlayers.map(playerName);
  const starters = team.starters.map((starter) => ({
    sourceName: starter.name,
    officialPlayer: officialPlayerForSourceName(starter.name, officialPlayers),
    name: officialNameForSourceName(starter.name, officialNames),
    positionId: Number(starter.positionId),
    x: fotmobPitchX(starter),
    y: fotmobPitchY(starter),
    pitchY: fotmobPitchY(starter),
    layoutX: fotmobPitchX(starter),
    layoutY: fotmobPitchY(starter)
  }));

  if (starters.length !== 11) {
    return null;
  }

  const expectedRows = formationRowCounts(formation);
  const byPositionRows = expectedRows.map(() => []);
  let unmatched = 0;

  for (const player of starters) {
    const [row, column] = fotmobRank(player.positionId, expectedRows.length);
    if (
      !Number.isFinite(row) ||
      row < 1 ||
      row > expectedRows.length ||
      !Number.isFinite(column) ||
      Number.isNaN(player.layoutX) ||
      Number.isNaN(player.layoutY)
    ) {
      unmatched += 1;
      continue;
    }

    byPositionRows[row - 1].push({
      ...player,
      column
    });
  }

  const rowsByOfficial = expectedRows.map(() => []);
  let officialOnly = true;
  for (const player of starters) {
    const officialRow = officialPlayerRows.get(normalizeLayoutPlayerName(player.name));
    if (!Number.isFinite(officialRow)) {
      officialOnly = false;
      break;
    }

    rowsByOfficial[officialRow].push(player);
  }

  if (officialOnly && assertValidRowShape(rowsByOfficial, expectedRows)) {
    return rowsByOfficial.map((row) =>
      row
        .slice()
        .sort((left, right) => left.x - right.x)
      .map((player, column) => ({
        ...player,
        column
      }))
    );
  }

  if (unmatched === 0) {
    const exactRowsByPosition = assertValidRowShape(byPositionRows, expectedRows, {
      validateColumns: false
    });

    if (exactRowsByPosition && !officialOnly) {
      return byPositionRows;
    }

    const normalizedByPositionRows = byPositionRows.map((row) =>
      row
        .slice()
        .sort((left, right) => left.x - right.x)
        .map((player, column) => ({
          ...player,
          column
        }))
    );

    if (exactRowsByPosition && assertValidRowShape(normalizedByPositionRows, expectedRows)) {
      return normalizedByPositionRows;
    }
  }

  const withCoordinates = starters.map((player) => ({
    ...player,
    pitchY: Number.isNaN(player.layoutY) ? Number.NaN : player.layoutY,
    pitchX: Number.isNaN(player.layoutX) ? Number.NaN : player.layoutX
  }));
  if (withCoordinates.some((player) => Number.isNaN(player.pitchX) || Number.isNaN(player.pitchY))) {
    return null;
  }

  const sortedByPitch = [...withCoordinates].sort((left, right) => {
    return left.pitchY - right.pitchY || left.pitchX - right.pitchX;
  });

  const expectedTotalPlayers = expectedRows.reduce((sum, rowCount) => sum + rowCount, 0);
  if (sortedByPitch.length !== expectedTotalPlayers) {
    return null;
  }

  const byLayoutRows = [];
  let offset = 0;
  for (const expectedCount of expectedRows) {
    const row = sortedByPitch.slice(offset, offset + expectedCount);
    if (row.length !== expectedCount) {
      return null;
    }

    byLayoutRows.push(row.sort((left, right) => left.pitchX - right.pitchX));
    offset += expectedCount;
  }

  if (!assertValidRowShape(byLayoutRows, expectedRows)) {
    return null;
  }

  return byLayoutRows.map((row) =>
    row
      .slice()
      .sort((left, right) => left.x - right.x)
      .map((player, column) => ({
        ...player,
        column
      }))
  );
}

function signatureFromFotmobTeam(team, officialPlayers, formation) {
  const rowGroups = buildFotmobRowsFromTeam(team, officialPlayers, formation);
  if (!rowGroups) {
    return { signature: "", exactLayout: false };
  }

  const expectedRows = formationRowCounts(formation);
  if (!assertValidRowShape(rowGroups, expectedRows)) {
    return { signature: "", exactLayout: false };
  }

  return {
    exactLayout: rowGroups.every((row) => row.every((player) => Number.isFinite(player?.column))),
    signature: rowGroups
      .map((rows) => rows.map((player) => normalizeLayoutPlayerName(player.name)).join("/"))
      .join("|")
  };
}

function parseFotmobLayout(html, lineups, source) {
  const data = parseNextData(html);
  const lineup = data?.props?.pageProps?.content?.lineup;
  if (!lineup?.homeTeam?.starters || !lineup?.awayTeam?.starters) {
    return sourceClaimEnvelope(source, {
      status: "unavailable",
      note: "FotMob lineup payload was not found."
    });
  }
  if (String(lineup.lineupType || "").trim().toLowerCase() !== "standard") {
    return sourceClaimEnvelope(source, {
      status: "unavailable",
      note: `FotMob exposed a ${lineup.lineupType || "non-standard"} lineup rather than a confirmed standard board.`
    });
  }

  const officialHomePlayers = lineups.home?.players || [];
  const officialAwayPlayers = lineups.away?.players || [];
  const homePlayers = collectFotmobSourcePlayers(
    lineup.homeTeam,
    officialHomePlayers,
    lineups.home?.formation || ""
  );
  const awayPlayers = collectFotmobSourcePlayers(
    lineup.awayTeam,
    officialAwayPlayers,
    lineups.away?.formation || ""
  );

  if (homePlayers.length !== 11 || awayPlayers.length !== 11) {
    return sourceClaimEnvelope(source, {
      status: "unavailable",
      note: "FotMob lineup rows could not be parsed into 11-player teams."
    });
  }

  const homeCanonicalPlayers = applyOfficialGeometry(homePlayers, officialHomePlayers);
  const awayCanonicalPlayers = applyOfficialGeometry(awayPlayers, officialAwayPlayers);

  return sourceClaimFromExactLayout({
    name: source.name,
    adapter: source.adapter,
    url: source.url,
    sourceDetail: lineup.source ? `lineup payload source: ${lineup.source}` : "lineup payload",
    lineups,
    homePlayers: homeCanonicalPlayers,
    awayPlayers: awayCanonicalPlayers,
    homeFormation: lineup.homeTeam.formation,
    awayFormation: lineup.awayTeam.formation
  });
}

function parseUnavailableHtml(source, response) {
  const statusText = `${response.status} ${response.statusText}`.trim();
  const defaultStatus = isBlockedStatus(response.status, response.text) || /blocked/i.test(statusText) ? "blocked" : "unavailable";
  if (!response.ok) {
    return sourceClaimEnvelope(source, {
      status: defaultStatus,
      note: statusText
    });
  }

  const normalizedText = response.text.replace(/\s+/g, " ");
  if (/No data available/i.test(normalizedText)) {
    return sourceClaimEnvelope(source, {
      status: "unavailable",
      note: "No data available."
    });
  }
  if (/404: Not Found|Page not found/i.test(normalizedText)) {
    return sourceClaimEnvelope(source, {
      status: "unavailable",
      note: "Page not found."
    });
  }

  return sourceClaimEnvelope(source, {
    status: "unavailable",
    note: "No parseable tactical layout was found."
  });
}

async function readSourceClaim(source, lineups) {
  if (source.adapter === "sofascore-history") {
    return parseSofaScoreHistoryLayout(source.historyRecord, lineups, source);
  }

  const sourceClaimParsers = {
    espn: (html) => parseEspnLayout(html, lineups, source),
    fotmob: (html) => parseFotmobLayout(html, lineups, source)
  };
  const parseSource = sourceClaimParsers[source.adapter];

  let response;
  try {
    response = await fetchText(source.url);
  } catch (error) {
    return sourceClaimEnvelope(source, {
      status: isBlockedStatus(response?.status || 0, error.message) ? "blocked" : "error",
      note: error.message
    });
  }

  if (!response.ok) {
    return parseUnavailableHtml(source, response);
  }

  if (!parseSource) {
    return sourceClaimFromUnsupportedAdapter(source);
  }

  try {
    return parseSource(response.text);
  } catch (error) {
    return sourceClaimFromError(source, error.message);
  }
}

function validateOfficialStarterCoverage(fixtureId, lineups, override) {
  const issues = [];
  for (const side of ["home", "away"]) {
    const officialNames = officialSideNames(lineups, side);
    const overrideNames = (override?.[side]?.players || []).map((player) => player.name);
    for (const officialName of officialNames) {
      if (!overrideNames.some((overrideName) => sameName(officialName, overrideName))) {
        issues.push(`${fixtureId} ${side} missing official starter ${officialName}`);
      }
    }
  }
  return issues;
}

function buildOverrideFromClaims(fixtureId, fixture, lineups, claims) {
  const minimumExactSources = requestedScope === "live-start" || shouldReverify ? 2 : 1;
  const consensus = buildExactLayoutConsensus(claims, {
    minimumExactSources,
    allowStrictMajority: shouldReverify
  });

  if (!consensus.matchedClaims.length) {
    return {
      status: "unresolved",
      unresolvedReason: "insufficient_evidence",
      checkedAt,
      sourceIds: [overrideSourceId],
      sources: claims,
      note: "No trusted public source yielded a parseable tactical layout."
    };
  }

  if (consensus.status === "conflict") {
    for (const claim of consensus.matchedClaims) {
      claim.status = "conflict";
    }
    return {
      status: "unresolved",
      unresolvedReason: "conflict",
      checkedAt,
      sourceIds: [overrideSourceId],
      sources: claims,
      note: "Trusted public sources disagreed on formation, tactical row membership, or left-to-right player order."
    };
  }

  if (consensus.status !== "agreed") {
    const exactSourceCount = consensus.exactClaims.length;
    return {
      status: "unresolved",
      unresolvedReason: "insufficient_evidence",
      checkedAt,
      sourceIds: [overrideSourceId],
      sources: claims,
      note: minimumExactSources > 1
        ? `Automatic matchday verification requires ${minimumExactSources} distinct exact-layout providers; ${exactSourceCount} supplied usable geometry.`
        : "A trusted source matched the row order but did not expose complete board coordinates."
    };
  }

  for (const claim of consensus.dissentingClaims || []) {
    claim.status = "conflict";
  }
  const exactSourceNames = consensus.sourceNames;
  const dissentingSourceNames = (consensus.dissentingClaims || [])
    .map((claim) => claim.name)
    .filter(Boolean);
  const usedStrictMajority = dissentingSourceNames.length > 0;
  const exactSourceNote =
    exactSourceNames.length > 1
      ? `${exactSourceNames.join(" and ")} agreed on the tactical layout.`
      : `${exactSourceNames[0] || "A trusted source"} supplied exact board geometry.`;
  const dissentingSourceNote = usedStrictMajority
    ? ` ${dissentingSourceNames.join(" and ")} differed and ${dissentingSourceNames.length === 1 ? "was" : "were"} retained as conflicting evidence.`
    : "";

  const override = {
    status: "verified",
    layoutSource: VERIFIED_LAYOUT_SOURCE,
    ...(minimumExactSources > 1
      ? {
          verificationMethod: usedStrictMajority ? "source-majority-v1" : "source-consensus-v1",
          consensus: {
            providers: exactSourceNames,
            minimumExactSources,
            ...(usedStrictMajority ? { dissentingProviders: dissentingSourceNames } : {}),
            aggregation: "canonical-formation-grid"
          }
        }
      : {}),
    checkedAt,
    sourceIds: [overrideSourceId],
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    sources: claims,
    note: `FIFA official team sheet kept for facts; ${exactSourceNote}${dissentingSourceNote}`,
    home: {
      ...consensus.home,
      players: assignRolesFromPitchGeometry(consensus.home.formation, consensus.home.players)
    },
    away: {
      ...consensus.away,
      players: assignRolesFromPitchGeometry(consensus.away.formation, consensus.away.players)
    }
  };
  const coverageIssues = validateOfficialStarterCoverage(fixtureId, lineups, override);
  if (coverageIssues.length) {
    return {
      status: "unresolved",
      unresolvedReason: "insufficient_evidence",
      checkedAt,
      sourceIds: [overrideSourceId],
      sources: claims,
      note: coverageIssues.join("; ")
    };
  }

  const geometryIssues = getLayoutOverrideProvenanceIssues(override)
    .filter((issue) => /pitch|spread|coordinates|positioned players/i.test(issue));
  if (geometryIssues.length) {
    return {
      status: "unresolved",
      unresolvedReason: "invalid_geometry",
      checkedAt,
      sourceIds: [overrideSourceId],
      sources: claims,
      note: `The exact-layout source produced unusable pitch geometry: ${geometryIssues.join("; ")}`
    };
  }

  return override;
}

function upsertSource(tournamentData, sourceId, fixtureCount, changedCount) {
  const sources = (tournamentData.sources || []).filter((source) => source.id !== sourceId);
  sources.push({
    id: sourceId,
    label: "Lineup layout verification",
    url: "https://www.fifa.com/fifaplus/en/match-centre",
    type: "editorial",
    checkedAt,
    note: `${fixtureCount} completed fixture${fixtureCount === 1 ? "" : "s"} reviewed; ${changedCount} verified override${changedCount === 1 ? "" : "s"} applied.`
  });
  tournamentData.sources = sources;
  tournamentData.updatedAt = checkedAt;
}

const [fixturesData, lineupsData, tournamentData, overridesData, teamsData, sofascoreHistoryData] = await Promise.all([
  readJson("fixtures.json"),
  readJson("lineups.json"),
  readJson("tournament.json"),
  readOptionalJson("lineup-layout-overrides.json", { sourceIds: [], updatedAt: checkedAt, fixtures: {} }),
  readJson("teams.json"),
  readOptionalJson("sofascore-tactical-lineup-history.json", { checkedAt: "", matches: {} })
]);
const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));

let changedCount = 0;
let overridesChanged = false;
const nextOverrides = {
  ...overridesData,
  sourceIds: [...(overridesData.sourceIds || [])],
  fixtures: {
    ...(overridesData.fixtures || {})
  }
};
const summary = {
  existingVerified: [],
  verified: [],
  unresolved: [],
  skipped: [],
  conflicted: []
};

for (const fixture of fixturesData.fixtures || []) {
  const fixtureId = fixture?.id;
  if (!fixtureId) {
    continue;
  }

  if (!isRequestedFixture(fixture, requestedFixtureIds)) {
    continue;
  }

  if (requestedScope === "live-start") {
    if (!requestedFixtureIds && !isFixtureInScope(fixture, requestedScope)) {
      summary.skipped.push({
        id: fixtureId,
        reason: LIVE_START_STATUSES.has(fixture.status) ? "outside_live_start_window" : "not_live_start"
      });
      continue;
    }
  } else {
    if (!isCompletedFixture(fixture)) {
      summary.skipped.push({
        id: fixtureId,
        reason: "not_completed"
      });
      continue;
    }

    if (!requestedFixtureIds && !isFixtureInScope(fixture, requestedScope)) {
      summary.skipped.push({
        id: fixtureId,
        reason: "not_in_scope"
      });
      continue;
    }
  }

  const existingOverride = getVerifiedLayoutOverride(nextOverrides, fixtureId);
  const lineups = lineupsData.lineups?.[fixtureId];
  const shouldUseExistingOverride =
    shouldPreserveLayoutOverride(existingOverride, { reverify: shouldReverify }) &&
    (!lineups || canApplyLineupLayoutOverride(lineups, existingOverride));
  let sourceCandidates = [];
  if (!shouldUseExistingOverride) {
    const configuredSourceCandidates = getSourceCandidatesForFixture(fixtureId);
    sourceCandidates = Array.isArray(configuredSourceCandidates) ? configuredSourceCandidates : [];
    if (requestedScope === "live-start" || shouldReverify) {
      const adapters = new Set(sourceCandidates.map((source) => source.adapter));
      const [espnCandidates, fotmobCandidates] = await Promise.all([
        adapters.has("espn") ? [] : discoverEspnSourceCandidates(fixture),
        adapters.has("fotmob") ? [] : discoverFotmobSourceCandidates(fixture, teamsById)
      ]);
      sourceCandidates = mergeSourceCandidates(sourceCandidates, espnCandidates, fotmobCandidates);
      const sofascoreHistoryRecord = shouldReverify
        ? sofascoreHistoryData.matches?.[fixtureId]
        : null;
      if (sofascoreHistoryRecord) {
        sourceCandidates = sourceCandidates.filter(
          (source) => String(source?.name || "").toLowerCase() !== "sofascore"
        );
        sourceCandidates = mergeSourceCandidates(sourceCandidates, [{
          name: "SofaScore",
          adapter: "sofascore-history",
          url: sofascoreHistoryRecord.url,
          sourceDetail: `public tactical formation board captured ${sofascoreHistoryData.checkedAt}`,
          historyRecord: sofascoreHistoryRecord
        }]);
      }
    } else if (sourceCandidates.length === 0) {
      sourceCandidates = await discoverEspnSourceCandidates(fixture);
    }
  }

  if (shouldUseExistingOverride) {
    if (!lineups || !isVerifiedLineupSource(lineups)) {
      summary.skipped.push({
        id: fixtureId,
        reason: !lineups ? "missing_lineups_record" : "incomplete_official_lineups"
      });
      continue;
    }

    let nextLineups = lineups;
    let issues = compareLineupsToLayoutOverride(nextLineups, existingOverride);
    if (issues.length) {
      nextLineups = applyLineupLayoutOverride(lineups, existingOverride);
      issues = compareLineupsToLayoutOverride(nextLineups, existingOverride);
      if (issues.length) {
        throw new Error(`${fixtureId} existing verified override failed to apply: ${issues.join("; ")}`);
      }
      if (shouldWrite) {
        lineupsData.lineups[fixtureId] = nextLineups;
        changedCount += 1;
      }
    }

    summary.existingVerified.push(fixtureId);
    console.log(
      `${fixtureId}: verified (existing${isFifaOfficialLayoutOverride(existingOverride) ? " FIFA official" : ""} override)`
    );
    continue;
  }

  if (!Array.isArray(sourceCandidates) || sourceCandidates.length === 0) {
    summary.skipped.push({
      id: fixtureId,
      reason: "missing_source_candidates"
    });
    continue;
  }

  if (!lineups || !isVerifiedLineupSource(lineups)) {
    summary.skipped.push({
      id: fixtureId,
      reason: !lineups ? "missing_lineups_record" : "incomplete_official_lineups"
    });
    continue;
  }

  const claims = await Promise.all(sourceCandidates.map((source) => readSourceClaim(source, lineups)));
  const override = buildOverrideFromClaims(fixtureId, fixture, lineups, claims);
  const shouldPersistOverride = override.status === "verified" || requestedScope !== "live-start";
  if (shouldPersistOverride) {
    nextOverrides.fixtures[fixtureId] = override;
    nextOverrides.updatedAt = checkedAt;
    nextOverrides.sourceIds = [...new Set([...(nextOverrides.sourceIds || []), overrideSourceId])];
    overridesChanged = true;
  }

  if (override.status === "verified") {
    summary.verified.push(fixtureId);

    const nextLineups = applyLineupLayoutOverride(lineups, override);
    const issues = compareLineupsToLayoutOverride(nextLineups, override);
    if (issues.length) {
      throw new Error(`${fixtureId} verified override failed to apply: ${issues.join("; ")}`);
    }
    if (JSON.stringify(nextLineups) !== JSON.stringify(lineups)) {
      lineupsData.lineups[fixtureId] = nextLineups;
      changedCount += 1;
    }
  } else {
    summary.unresolved.push({
      id: fixtureId,
      reason: override.unresolvedReason || "unresolved"
    });
    if (override?.unresolvedReason === "conflict") {
      summary.conflicted.push(fixtureId);
    }
  }

  console.log(`${fixtureId}: ${override.status}`);
  for (const claim of claims) {
    console.log(`  ${claim.name}: ${claim.status}${claim.note ? ` (${claim.note})` : ""}`);
  }
}

const hasNewVerificationClaims = summary.verified.length ||
  (requestedScope !== "live-start" && summary.unresolved.length);
if (shouldWrite && (hasNewVerificationClaims || changedCount)) {
  lineupsData.updatedAt = checkedAt;
  if (hasNewVerificationClaims) {
    lineupsData.sourceIds = [...new Set([...(lineupsData.sourceIds || []), overrideSourceId])];
    upsertSource(
      tournamentData,
      overrideSourceId,
      summary.verified.length + summary.unresolved.length,
      changedCount
    );
  }
  const writes = [writeJson("lineups.json", lineupsData)];
  if (overridesChanged) {
    writes.push(writeJson("lineup-layout-overrides.json", nextOverrides));
  }
  if (hasNewVerificationClaims) {
    writes.push(writeJson("tournament.json", tournamentData));
  }
  await Promise.all(writes);
}

const skippedByReason = summary.skipped.reduce(
  (acc, { reason }) => {
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  },
  {}
);
const unresolvedByReason = summary.unresolved.reduce(
  (acc, { reason }) => {
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  },
  {}
);
console.log(
  [
    "Verification summary:",
    `  existing verified=${summary.existingVerified.length}: ${summary.existingVerified.join(", ") || "none"}`,
    `  verified=${summary.verified.length}: ${summary.verified.join(", ") || "none"}`,
    `  unresolved=${summary.unresolved.length}: ${summary.unresolved.map((entry) => `${entry.id}[${entry.reason}]`).join(", ") || "none"}`,
    `  skipped=${summary.skipped.length}: ${summary.skipped.map((entry) => `${entry.id}[${entry.reason}]`).join(", ") || "none"}`,
    `  conflicted=${summary.conflicted.length}: ${summary.conflicted.join(", ") || "none"}`,
    `  unresolved reason buckets: ${Object.entries(unresolvedByReason)
      .map(([key, count]) => `${key}=${count}`)
      .join(", ") || "none"}`,
    `  skipped reason buckets: ${Object.entries(skippedByReason)
      .map(([key, count]) => `${key}=${count}`)
      .join(", ") || "none"}`
  ].join("\n")
);

const verifiedCoverageCount = summary.existingVerified.length + summary.verified.length;
console.log(`${verifiedCoverageCount} verified lineup layout override${verifiedCoverageCount === 1 ? "" : "s"} covered.`);
console.log(`${changedCount} verified lineup layout override${changedCount === 1 ? "" : "s"} ${shouldWrite ? "written" : "detected"}.`);
