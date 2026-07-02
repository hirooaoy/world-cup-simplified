#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyLineupLayoutOverride,
  compareLineupsToLayoutOverride,
  normalizeLayoutPlayerName,
  VERIFIED_LAYOUT_SOURCE
} from "./lineup-layout-overrides.mjs";
import { isPlayerNameMatch } from "./player-name-matching.mjs";
import { getSourceCandidatesForFixture } from "./lineup-layout-source-candidates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const shouldWrite = !process.argv.includes("--check");
const args = process.argv.slice(2);
const checkedAt = process.env.LINEUP_LAYOUT_CHECKED_AT || new Date().toISOString();
const overrideSourceId = `lineup-layout-verification-${checkedAt.slice(0, 10)}`;
const requestTimeoutMs = Number(process.env.LINEUP_LAYOUT_TIMEOUT_MS || 15000);
const COMPLETED_STATUSES = new Set(["FT", "AET", "PEN"]);
const VALID_SCOPE_VALUES = new Set(["all-completed", "knockout", "recent-completed"]);
const DEFAULT_SCOPE = "all-completed";
const DEFAULT_RECENT_COMPLETED_DAYS = 30;
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

const requestedScope = getRequestedScope();
const requestedRecentDays = getRequestedRecentCompletedDays();
const requestedFixtureIds = getRequestedFixtureFilter();

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

  const cutoff = Date.now() - requestedRecentDays * 24 * 60 * 60 * 1000;
  const fixtureTime = getFixtureTimestamp(fixture);
  return Number.isFinite(fixtureTime) ? fixtureTime >= cutoff : false;
}

function isFixtureInScope(fixture, scope) {
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

  const sourceReady = lineups.mode === "final" && lineups.teamSheetSource === "fifa-official" && lineups.eventSource === "fifa-official";
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

function playerName(player) {
  return String(player?.name || player?.fullName || player?.displayName || "").trim();
}

function officialSideNames(lineups, side) {
  return (lineups?.[side]?.players || []).map(playerName).filter(Boolean);
}

function sameName(left, right) {
  return (
    normalizeLayoutPlayerName(left) === normalizeLayoutPlayerName(right) ||
    isPlayerNameMatch(left, right) ||
    isPlayerNameMatch(right, left)
  );
}

function officialNameForSourceName(sourceName, officialNames) {
  return officialNames.find((officialName) => sameName(sourceName, officialName)) || sourceName;
}

function officialPlayerForSourceName(sourceName, officialPlayers) {
  return officialPlayers.find((player) => sameName(playerName(player), sourceName)) || null;
}

function assignRolesForFormation(formation, sourcePlayers) {
  const digits = String(formation || "")
    .split("-")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  if (digits.reduce((sum, value) => sum + value, 0) !== 10) {
    return sourcePlayers.map((player) => ({ ...player, position: player.position || "CM" }));
  }

  const [defenderCount, ...rest] = digits;
  const forwardCount = rest.at(-1);
  const midfieldRows = rest.slice(0, -1);
  const expectedRows = [];

  expectedRows.push({ type: "forward", count: forwardCount });
  for (let index = midfieldRows.length - 1; index >= 0; index -= 1) {
    const count = midfieldRows[index];
    const isAttackingBand = index === midfieldRows.length - 1 && forwardCount === 1;
    expectedRows.push({ type: isAttackingBand ? "attacking-midfield" : "midfield", count });
  }
  expectedRows.push({ type: "defense", count: defenderCount });
  expectedRows.push({ type: "goalkeeper", count: 1 });

  const players = sourcePlayers
    .map((player, sourceIndex) => ({ ...player, sourceIndex }))
    .sort((left, right) => left.y - right.y || left.x - right.x);
  const assigned = [];
  let offset = 0;

  for (const row of expectedRows) {
    const rowPlayers = players.slice(offset, offset + row.count).sort((left, right) => left.x - right.x);
    const roles = rolesForRow(row.type, row.count);
    rowPlayers.forEach((player, index) => {
      assigned.push({
        ...player,
        position: roles[index] || player.position || "CM"
      });
    });
    offset += row.count;
  }

  return assigned.sort((left, right) => left.sourceIndex - right.sourceIndex);
}

function rolesForRow(type, count) {
  if (type === "goalkeeper") return ["GK"];
  if (type === "defense") {
    if (count === 3) return ["CB", "CB", "CB"];
    if (count === 4) return ["LB", "CB", "CB", "RB"];
    if (count === 5) return ["LWB", "CB", "CB", "CB", "RWB"];
  }
  if (type === "attacking-midfield") {
    if (count === 1) return ["AM"];
    if (count === 2) return ["AM", "AM"];
    if (count === 3) return ["LW", "AM", "RW"];
    if (count === 4) return ["LM", "CM", "CM", "RM"];
  }
  if (type === "forward") {
    if (count === 1) return ["ST"];
    if (count === 2) return ["ST", "ST"];
    if (count === 3) return ["LW", "ST", "RW"];
  }
  if (type === "midfield") {
    if (count === 1) return ["DM"];
    if (count === 2) return ["CM", "CM"];
    if (count === 3) return ["CM", "CM", "CM"];
    if (count === 4) return ["LM", "CM", "CM", "RM"];
    if (count === 5) return ["LWB", "CM", "CM", "CM", "RWB"];
  }

  return Array.from({ length: count }, () => "CM");
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

function assertValidRowShape(rowGroups, expectedRows) {
  if (!Array.isArray(rowGroups) || rowGroups.length !== expectedRows.length) {
    return false;
  }

  return rowGroups.every((row, index) => {
    const expectedCount = expectedRows[index];
    const rowCount = Array.isArray(row) ? row.length : 0;
    if (rowCount !== expectedCount || !Number.isInteger(expectedCount) || expectedCount <= 0) {
      return false;
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
  const assigned = assignRolesForFormation(formation, players);

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

function sourceClaimFromExactLayout({ name, url, sourceDetail = "", lineups, homePlayers, awayPlayers }) {
  const homeFormation = lineups.home?.formation || "";
  const awayFormation = lineups.away?.formation || "";
  const home = buildSideFromExactLayout(lineups, "home", homeFormation, homePlayers);
  const away = buildSideFromExactLayout(lineups, "away", awayFormation, awayPlayers);

  return {
    name,
    url,
    status: "matched",
    sourceDetail,
    exactLayout: true,
    home,
    away,
    signature: {
      home: signatureFromLayout(home.formation, home.players),
      away: signatureFromLayout(away.formation, away.players)
    }
  };
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

  return sourceClaimFromExactLayout({
    name: source.name,
    url: source.url,
    sourceDetail: "public match-center board geometry",
    lineups,
    homePlayers,
    awayPlayers
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

function buildFotmobRowsFromTeam(team, officialNames, formation) {
  if (!team?.starters?.length) {
    return null;
  }

  const starters = team.starters.map((starter) => ({
    name: officialNameForSourceName(starter.name, officialNames),
    positionId: Number(starter.positionId),
    x: normalizeNumber(starter.horizontalLayout?.x),
    y: normalizeNumber(starter.verticalLayout?.y),
    layoutX: normalizeNumber(starter.horizontalLayout?.x),
    layoutY: normalizeNumber(starter.verticalLayout?.y)
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

  const exactRowsByPosition = unmatched === 0 && assertValidRowShape(byPositionRows, expectedRows);

  if (exactRowsByPosition) {
    return byPositionRows;
  }

  const withCoordinates = starters.map((player) => ({
    ...player,
    pitchY: Number.isNaN(player.layoutY) ? Number.NaN : 1 - player.layoutY,
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

  return byLayoutRows;
}

function signatureFromFotmobTeam(team, officialNames, formation) {
  const rowGroups = buildFotmobRowsFromTeam(team, officialNames, formation);
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

  const home = signatureFromFotmobTeam(
    lineup.homeTeam,
    officialSideNames(lineups, "home"),
    lineups.home?.formation || ""
  );
  const away = signatureFromFotmobTeam(
    lineup.awayTeam,
    officialSideNames(lineups, "away"),
    lineups.away?.formation || ""
  );
  if (!home.signature || !away.signature) {
    return sourceClaimEnvelope(source, {
      status: "unavailable",
      note: "FotMob lineup rows could not be normalized."
    });
  }

  return {
    ...sourceClaimEnvelope(source, {
      status: "matched",
      sourceDetail: lineup.source ? `lineup payload source: ${lineup.source}` : "lineup payload",
      exactLayout: home.exactLayout && away.exactLayout
    }),
    signature: {
      home: home.signature,
      away: away.signature
    }
  };
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
  const matchedClaims = claims.filter((claim) => claim.status === "matched");
  const exactClaim = matchedClaims.find((claim) => claim.exactLayout);
  const signatures = new Set(
    matchedClaims.map((claim) => `${claim.signature?.home || ""}::${claim.signature?.away || ""}`)
  );

  if (!matchedClaims.length) {
    return {
      status: "unresolved",
      unresolvedReason: "insufficient_evidence",
      checkedAt,
      sourceIds: [overrideSourceId],
      sources: claims,
      note: "No trusted public source yielded a parseable tactical layout."
    };
  }

  if (signatures.size > 1) {
    for (const claim of matchedClaims) {
      claim.status = "conflict";
    }
    return {
      status: "unresolved",
      unresolvedReason: "conflict",
      checkedAt,
      sourceIds: [overrideSourceId],
      sources: claims,
      note: "Trusted public sources disagreed on the tactical row order."
    };
  }

  if (!exactClaim) {
    return {
      status: "unresolved",
      unresolvedReason: "insufficient_evidence",
      checkedAt,
      sourceIds: [overrideSourceId],
      sources: claims,
      note: "Trusted public sources agreed on row order, but no source exposed precise board coordinates."
    };
  }

  const override = {
    status: "verified",
    layoutSource: VERIFIED_LAYOUT_SOURCE,
    checkedAt,
    sourceIds: [overrideSourceId],
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    sources: claims,
    note: "FIFA official team sheet kept for facts; ESPN board geometry and FotMob lineup rows agreed on the tactical layout.",
    home: exactClaim.home,
    away: exactClaim.away
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

const [fixturesData, lineupsData, tournamentData, overridesData] = await Promise.all([
  readJson("fixtures.json"),
  readJson("lineups.json"),
  readJson("tournament.json"),
  readOptionalJson("lineup-layout-overrides.json", { sourceIds: [], updatedAt: checkedAt, fixtures: {} })
]);

let changedCount = 0;
const nextOverrides = {
  ...overridesData,
  sourceIds: [...new Set([...(overridesData.sourceIds || []), overrideSourceId])],
  updatedAt: checkedAt,
  fixtures: {
    ...(overridesData.fixtures || {})
  }
};
const summary = {
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

  const sourceCandidates = getSourceCandidatesForFixture(fixtureId);
  if (!Array.isArray(sourceCandidates) || sourceCandidates.length === 0) {
    summary.skipped.push({
      id: fixtureId,
      reason: "missing_source_candidates"
    });
    continue;
  }

  const lineups = lineupsData.lineups?.[fixtureId];
  if (!lineups || !isVerifiedLineupSource(lineups)) {
    summary.skipped.push({
      id: fixtureId,
      reason: !lineups ? "missing_lineups_record" : "incomplete_official_lineups"
    });
    continue;
  }

  const claims = await Promise.all(sourceCandidates.map((source) => readSourceClaim(source, lineups)));
  const override = buildOverrideFromClaims(fixtureId, fixture, lineups, claims);
  nextOverrides.fixtures[fixtureId] = override;

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

if (shouldWrite && (summary.verified.length || summary.unresolved.length)) {
  lineupsData.sourceIds = [...new Set([...(lineupsData.sourceIds || []), overrideSourceId])];
  lineupsData.updatedAt = checkedAt;
  upsertSource(
    tournamentData,
    overrideSourceId,
    summary.verified.length + summary.unresolved.length,
    changedCount
  );
  await Promise.all([
    writeJson("lineup-layout-overrides.json", nextOverrides),
    writeJson("lineups.json", lineupsData),
    writeJson("tournament.json", tournamentData)
  ]);
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

console.log(`${changedCount} verified lineup layout override${changedCount === 1 ? "" : "s"} ${shouldWrite ? "written" : "detected"}.`);
