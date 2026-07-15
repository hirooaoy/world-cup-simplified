#!/usr/bin/env node
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFifaTacticalLineupUrl,
  getFifaTacticalRegistrationCandidates,
  recordFifaTacticalDocument,
  recordFifaTacticalRegistration,
  validateFifaTacticalLineupIndex
} from "./fifa-tactical-lineup-discovery.mjs";
import {
  extractFifaTacticalLineupPdf,
  parseFifaTacticalLineupDocument
} from "./fifa-tactical-lineup-pdf.mjs";
import {
  applyLineupLayoutOverride,
  canApplyLineupLayoutOverride,
  compareLineupsToLayoutOverride,
  getLayoutOverrideProvenanceIssues,
  getVerifiedLayoutOverride,
  isFifaOfficialLayoutOverride
} from "./lineup-layout-overrides.mjs";
import { FIFA_OFFICIAL_LAYOUT_SOURCE } from "./lineup-layout-sources.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const args = process.argv.slice(2);
const shouldWrite = !args.includes("--check");
const allowPostKickoffDocument = args.includes("--allow-post-kickoff-document");
const requestTimeoutMs = positiveNumber(process.env.FIFA_TACTICAL_TIMEOUT_MS, 15000);
const maximumPdfBytes = positiveNumber(process.env.FIFA_TACTICAL_MAX_PDF_BYTES, 5 * 1024 * 1024);
const windowBeforeMinutes = positiveNumber(process.env.FIFA_TACTICAL_WINDOW_BEFORE_MINUTES, 90);
const windowAfterMinutes = positiveNumber(process.env.FIFA_TACTICAL_WINDOW_AFTER_MINUTES, 20);
const auditNow = parseAuditNow();
const runAt = auditNow.toISOString();
const discoveryProbeBatchOffset = Math.floor(auditNow.getTime() / (5 * 60 * 1000));
const requestedFixtures = requestedFixtureValues(args);

function positiveNumber(value, fallback) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive number; received "${value}".`);
  }
  return parsed;
}

function parseAuditNow() {
  const value = process.env.FIFA_TACTICAL_NOW || "";
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`FIFA_TACTICAL_NOW must be a valid date-time; received "${value}".`);
  }
  return parsed;
}

function requestedFixtureValues(argv) {
  return new Set(
    argv
      .filter((arg) => arg.startsWith("--fixture="))
      .flatMap((arg) => arg.slice("--fixture=".length).split(","))
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

async function writeJsonAtomic(fileName, value) {
  const outputPath = path.join(dataDir, fileName);
  const temporaryPath = `${outputPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

function fixtureKickoffMs(fixture) {
  const parsed = new Date(fixture?.kickoffUtc || fixture?.date || "").getTime();
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function fixtureMatchNumber(fixture) {
  const parsed = Number(fixture?.matchNumber ?? fixture?.providerIds?.fifa?.matchNumber);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function isRequestedFixture(fixture) {
  if (!requestedFixtures.size) return true;
  return requestedFixtures.has(fixture.id) || requestedFixtures.has(String(fixtureMatchNumber(fixture)));
}

function isInAutomaticWindow(fixture) {
  const kickoffMs = fixtureKickoffMs(fixture);
  if (!Number.isFinite(kickoffMs)) return false;
  const deltaMinutes = (auditNow.getTime() - kickoffMs) / 60000;
  return deltaMinutes >= -windowBeforeMinutes && deltaMinutes <= windowAfterMinutes;
}

function isOfficialStartingEleven(lineups) {
  return (
    lineups?.teamSheetSource === "fifa-official" &&
    Array.isArray(lineups?.home?.players) &&
    lineups.home.players.length === 11 &&
    Array.isArray(lineups?.away?.players) &&
    lineups.away.players.length === 11
  );
}

function inspectPositionedDocument(document) {
  const items = Array.isArray(document?.items) ? document.items : [];
  const tacticalTitles = items.filter((item) => /^TACTICAL LINE-?UP$/i.test(String(item?.str || "").trim()));
  const matchHeaders = items
    .map((item) => String(item?.str || "").trim().match(/^#\s*(\d+)\s*\|/))
    .filter(Boolean);
  if (tacticalTitles.length !== 1 || matchHeaders.length !== 1) return null;
  const matchNumber = Number(matchHeaders[0][1]);
  return Number.isInteger(matchNumber) && matchNumber > 0 ? { matchNumber } : null;
}

function normalizedPublishedAt(value) {
  const parsed = new Date(value || "");
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function knownPublishedAt(index, { matchNumber, url, sha256 }) {
  const record = index?.documents?.[String(matchNumber)];
  if (record?.url !== url || String(record?.sha256 || "").toLowerCase() !== sha256) return "";
  return normalizedPublishedAt(record.publishedAt);
}

async function fetchTacticalDocument(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/pdf",
      "user-agent": "World-Cup-Simplified/FIFA-tactical-lineup-sync"
    },
    redirect: "error",
    signal: AbortSignal.timeout(requestTimeoutMs)
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`.trim());
  }

  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (!/^application\/pdf(?:\s*;|$)/.test(contentType)) {
    throw new Error(`response content type was not application/pdf (${contentType || "missing"})`);
  }
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumPdfBytes) {
    throw new Error(`response exceeded the ${maximumPdfBytes}-byte PDF limit`);
  }

  const chunks = [];
  let totalBytes = 0;
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("response body was unavailable");
  }
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maximumPdfBytes) {
      await reader.cancel().catch(() => {});
      throw new Error(`response exceeded the ${maximumPdfBytes}-byte PDF limit`);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (bytes.length < 5 || Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-") {
    throw new Error("response body did not begin with the PDF signature");
  }
  const document = await extractFifaTacticalLineupPdf(bytes);
  document.sourceUrl = url;
  return {
    document,
    publishedAt: normalizedPublishedAt(response.headers.get("last-modified"))
  };
}

function sourceIdForDocument(matchNumber, version, sha256) {
  return `fifa-tactical-lineup-match-${matchNumber}-v${version}-${sha256.slice(0, 12)}`;
}

function layoutPlayers(players) {
  return players.map((player) => ({
    number: String(player.number),
    name: player.name,
    position: player.position,
    x: player.x,
    y: player.y
  }));
}

function buildOfficialOverride({ fixture, parsed, registrationId, url, publishedAt }) {
  const sourceId = sourceIdForDocument(parsed.matchNumber, parsed.version, parsed.sha256);
  const sourceDetail =
    "Positioned text from FIFA's official Tactical Line-up PDF matched all 22 starters one-to-one against FIFA's official team sheet.";
  return {
    status: "verified",
    layoutSource: FIFA_OFFICIAL_LAYOUT_SOURCE,
    verificationMethod: "fifa-tactical-lineup-pdf-v1",
    checkedAt: publishedAt,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    sourceIds: [sourceId],
    sources: [
      {
        name: "FIFA Tactical Line-up PDF",
        adapter: "fifa-tactical-pdf",
        url,
        status: "matched",
        exactLayout: true,
        sourceDetail,
        matchNumber: parsed.matchNumber,
        registrationId,
        documentVersion: parsed.version,
        publishedAt,
        sha256: parsed.sha256
      }
    ],
    note:
      "FIFA's official Tactical Line-up PDF supplied the nominal tactical rows and left/right placement; all 22 starters matched FIFA's official team sheet.",
    home: {
      formation: parsed.home.formation,
      players: layoutPlayers(parsed.home.players)
    },
    away: {
      formation: parsed.away.formation,
      players: layoutPlayers(parsed.away.players)
    }
  };
}

function officialSourceFromOverride(override) {
  return (override?.sources || []).find(
    (source) => source?.adapter === "fifa-tactical-pdf" && source?.status === "matched"
  );
}

function applyOfficialOverride(lineups, override, previousOverride) {
  const previousSourceIds = new Set(previousOverride?.sourceIds || []);
  const withoutSupersededLayoutSource = {
    ...lineups,
    sourceIds: (lineups.sourceIds || []).filter((sourceId) => !previousSourceIds.has(sourceId))
  };
  const applied = applyLineupLayoutOverride(withoutSupersededLayoutSource, override);
  const issues = compareLineupsToLayoutOverride(applied, override);
  if (issues.length) {
    throw new Error(`official FIFA geometry could not be applied: ${issues.join("; ")}`);
  }
  return applied;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function tournamentSourceForOverride(fixture, override) {
  const source = officialSourceFromOverride(override);
  if (!source) return null;
  const sourceId = override.sourceIds?.[0];
  if (!sourceId) return null;
  return {
    id: sourceId,
    label: `FIFA official Tactical Line-up - match ${fixtureMatchNumber(fixture)}`,
    url: source.url,
    type: "official",
    checkedAt: source.publishedAt,
    note: `FIFA Tactical Line-up version ${source.documentVersion} supplied the nominal rows and left/right geometry for all 22 starters.`
  };
}

function upsertTournamentSource(tournamentData, fixture, override) {
  const nextSource = tournamentSourceForOverride(fixture, override);
  if (!nextSource) return false;
  const sources = Array.isArray(tournamentData.sources) ? tournamentData.sources : [];
  const index = sources.findIndex((source) => source?.id === nextSource.id);
  if (index >= 0 && sameJson(sources[index], nextSource)) return false;
  if (index >= 0) {
    sources[index] = nextSource;
  } else {
    sources.push(nextSource);
  }
  tournamentData.sources = sources;
  return true;
}

function newestOfficialVersion(override) {
  const version = Number(officialSourceFromOverride(override)?.documentVersion);
  return Number.isInteger(version) && version > 0 ? version : 0;
}

function isUsableOfficialOverride(fixture, lineups, override) {
  return (
    isFifaOfficialLayoutOverride(override) &&
    getLayoutOverrideProvenanceIssues(override).length === 0 &&
    (!override.homeTeamId || override.homeTeamId === fixture.homeTeamId) &&
    (!override.awayTeamId || override.awayTeamId === fixture.awayTeamId) &&
    canApplyLineupLayoutOverride(lineups, override)
  );
}

const [fixturesData, lineupsData, overridesData, tacticalIndex, tournamentData] = await Promise.all([
  readJson("fixtures.json"),
  readJson("lineups.json"),
  readJson("lineup-layout-overrides.json"),
  readJson("fifa-tactical-lineup-index.json"),
  readJson("tournament.json")
]);

const indexIssues = validateFifaTacticalLineupIndex(tacticalIndex);
if (indexIssues.length) {
  throw new Error(`Invalid FIFA tactical lineup index: ${indexIssues.join("; ")}`);
}

const fixtures = Array.isArray(fixturesData.fixtures) ? fixturesData.fixtures : [];
const lineupsByFixtureId = lineupsData.lineups || {};
const fixturesByMatchNumber = new Map(fixtures.map((fixture) => [fixtureMatchNumber(fixture), fixture]));
const explicitMatches = fixtures.filter(isRequestedFixture);
if (requestedFixtures.size) {
  const found = new Set(explicitMatches.flatMap((fixture) => [fixture.id, String(fixtureMatchNumber(fixture))]));
  const missing = [...requestedFixtures].filter((value) => !found.has(value));
  if (missing.length) {
    throw new Error(`Unknown fixture filter${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`);
  }
}
const targetFixtures = fixtures.filter(
  (fixture) => isRequestedFixture(fixture) && (requestedFixtures.size > 0 || isInAutomaticWindow(fixture))
);

let indexChanged = false;
let lineupsChanged = false;
let overridesChanged = false;
let tournamentChanged = false;
let acceptedCount = 0;
let preservedCount = 0;
const warnings = [];
const acceptedSourceIds = new Set();

function applyAndPersistOfficial(fixture, override, previousOverride) {
  const currentLineups = lineupsByFixtureId[fixture.id];
  if (!isOfficialStartingEleven(currentLineups)) {
    warnings.push(`${fixture.id}: FIFA's official starting XI is not available yet`);
    return false;
  }
  const nextLineups = applyOfficialOverride(currentLineups, override, previousOverride);
  if (!sameJson(currentLineups, nextLineups)) {
    lineupsByFixtureId[fixture.id] = nextLineups;
    lineupsChanged = true;
  }
  for (const sourceId of override.sourceIds) acceptedSourceIds.add(sourceId);
  if (upsertTournamentSource(tournamentData, fixture, override)) tournamentChanged = true;
  return true;
}

for (const fixture of targetFixtures) {
  const matchNumber = fixtureMatchNumber(fixture);
  const kickoffMs = fixtureKickoffMs(fixture);
  const currentLineups = lineupsByFixtureId[fixture.id];
  const previousOverride = overridesData.fixtures?.[fixture.id] || null;
  const verifiedOverride = getVerifiedLayoutOverride(overridesData, fixture.id);
  const existingOfficial = isUsableOfficialOverride(fixture, currentLineups, verifiedOverride) ? verifiedOverride : null;

  if (!matchNumber || !Number.isFinite(kickoffMs)) {
    warnings.push(`${fixture.id}: match number or kickoff time is missing`);
    continue;
  }
  if (!isOfficialStartingEleven(currentLineups)) {
    warnings.push(`${fixture.id}: FIFA's official starting XI is not available yet`);
    continue;
  }

  // Once play begins, the first captured official nominal board is immutable.
  // FIFA may replace the same URL with an observational post-match version.
  if (existingOfficial && auditNow.getTime() >= kickoffMs) {
    try {
      if (applyAndPersistOfficial(fixture, existingOfficial, previousOverride)) preservedCount += 1;
    } catch (error) {
      warnings.push(`${fixture.id}: ${error.message}`);
    }
    continue;
  }

  const candidates = getFifaTacticalRegistrationCandidates(tacticalIndex, matchNumber, {
    probeBatchOffset: discoveryProbeBatchOffset
  });
  let accepted = false;
  for (const registrationId of candidates) {
    const url = buildFifaTacticalLineupUrl({
      competitionEditionId: tacticalIndex.competitionEditionId,
      registrationId
    });
    if (!url) continue;

    let fetched;
    try {
      fetched = await fetchTacticalDocument(url);
    } catch (error) {
      warnings.push(`${fixture.id}: FIFA tactical document r${registrationId} failed: ${error.message}`);
      continue;
    }
    if (!fetched) continue;

    const inspection = inspectPositionedDocument(fetched.document);
    if (!inspection) {
      warnings.push(`${fixture.id}: r${registrationId} was not a uniquely identified FIFA Tactical Line-up`);
      continue;
    }

    const discoveredFixture = fixturesByMatchNumber.get(inspection.matchNumber);
    const discoveredLineups = discoveredFixture ? lineupsByFixtureId[discoveredFixture.id] : null;
    if (!discoveredFixture || !isOfficialStartingEleven(discoveredLineups)) {
      warnings.push(
        `${fixture.id}: r${registrationId} identified match ${inspection.matchNumber}, but its official XI was unavailable for validation`
      );
      continue;
    }

    let parsed;
    try {
      parsed = parseFifaTacticalLineupDocument({
        document: fetched.document,
        fixture: discoveredFixture,
        lineups: discoveredLineups
      });
    } catch (error) {
      warnings.push(`${fixture.id}: r${registrationId} failed strict validation: ${error.message}`);
      continue;
    }

    try {
      if (recordFifaTacticalRegistration(tacticalIndex, { matchNumber: parsed.matchNumber, registrationId })) {
        indexChanged = true;
      }
    } catch (error) {
      warnings.push(`${fixture.id}: ${error.message}`);
      continue;
    }

    if (parsed.matchNumber !== matchNumber) continue;

    const headerPublishedAt = fetched.publishedAt;
    const footerPublishedAt = normalizedPublishedAt(parsed.publishedAt);
    if (
      headerPublishedAt &&
      footerPublishedAt &&
      Math.abs(new Date(headerPublishedAt).getTime() - new Date(footerPublishedAt).getTime()) > 2 * 60 * 1000
    ) {
      warnings.push(
        `${fixture.id}: FIFA HTTP and PDF publication times disagreed (${headerPublishedAt} vs ${footerPublishedAt})`
      );
      continue;
    }
    const publishedAt =
      headerPublishedAt ||
      footerPublishedAt ||
      knownPublishedAt(tacticalIndex, { matchNumber, url, sha256: parsed.sha256 });
    if (!publishedAt) {
      warnings.push(`${fixture.id}: FIFA tactical document had no trustworthy publication time`);
      continue;
    }
    if (
      !allowPostKickoffDocument &&
      new Date(publishedAt).getTime() > kickoffMs
    ) {
      warnings.push(
        `${fixture.id}: rejected FIFA Tactical Line-up published after kickoff (${publishedAt}); use --allow-post-kickoff-document for manual review`
      );
      continue;
    }
    if (existingOfficial && parsed.version < newestOfficialVersion(existingOfficial)) {
      warnings.push(`${fixture.id}: ignored FIFA Tactical Line-up version ${parsed.version} because version ${newestOfficialVersion(existingOfficial)} is already stored`);
      accepted = true;
      break;
    }

    const override = buildOfficialOverride({ fixture, parsed, registrationId, url, publishedAt });
    const provenanceIssues = getLayoutOverrideProvenanceIssues(override);
    if (provenanceIssues.length) {
      warnings.push(`${fixture.id}: official override failed provenance validation: ${provenanceIssues.join("; ")}`);
      continue;
    }

    if (recordFifaTacticalDocument(tacticalIndex, {
      fixtureId: fixture.id,
      matchNumber,
      registrationId,
      url,
      version: parsed.version,
      publishedAt,
      sha256: parsed.sha256
    })) {
      indexChanged = true;
    }

    try {
      if (!applyAndPersistOfficial(fixture, override, previousOverride)) continue;
    } catch (error) {
      warnings.push(`${fixture.id}: ${error.message}`);
      continue;
    }

    overridesData.fixtures ||= {};
    if (!sameJson(overridesData.fixtures[fixture.id], override)) {
      overridesData.fixtures[fixture.id] = override;
      overridesChanged = true;
    }
    for (const sourceId of override.sourceIds) acceptedSourceIds.add(sourceId);
    acceptedCount += 1;
    accepted = true;
    break;
  }

  if (!accepted) {
    warnings.push(`${fixture.id}: no validated FIFA Tactical Line-up document was available`);
  }
}

if (acceptedSourceIds.size) {
  const nextOverrideSourceIds = [...new Set([...(overridesData.sourceIds || []), ...acceptedSourceIds])];
  if (!sameJson(overridesData.sourceIds || [], nextOverrideSourceIds)) {
    overridesData.sourceIds = nextOverrideSourceIds;
    overridesChanged = true;
  }
  const nextLineupSourceIds = [...new Set([...(lineupsData.sourceIds || []), ...acceptedSourceIds])];
  if (!sameJson(lineupsData.sourceIds || [], nextLineupSourceIds)) {
    lineupsData.sourceIds = nextLineupSourceIds;
    lineupsChanged = true;
  }
}

if (indexChanged) tacticalIndex.updatedAt = runAt;
if (lineupsChanged) {
  lineupsData.lineups = lineupsByFixtureId;
  lineupsData.updatedAt = runAt;
}
if (overridesChanged) overridesData.updatedAt = runAt;
if (tournamentChanged) tournamentData.updatedAt = runAt;

if (shouldWrite) {
  const writes = [];
  if (indexChanged) writes.push(writeJsonAtomic("fifa-tactical-lineup-index.json", tacticalIndex));
  if (lineupsChanged) writes.push(writeJsonAtomic("lineups.json", lineupsData));
  if (overridesChanged) writes.push(writeJsonAtomic("lineup-layout-overrides.json", overridesData));
  if (tournamentChanged) writes.push(writeJsonAtomic("tournament.json", tournamentData));
  await Promise.all(writes);
}

const changeCount = [indexChanged, lineupsChanged, overridesChanged, tournamentChanged].filter(Boolean).length;
console.log(
  `${targetFixtures.length} FIFA tactical fixture${targetFixtures.length === 1 ? "" : "s"} checked; ` +
  `${acceptedCount} official layout${acceptedCount === 1 ? "" : "s"} accepted; ` +
  `${preservedCount} post-kickoff layout${preservedCount === 1 ? "" : "s"} preserved.`
);
console.log(`${changeCount} data file${changeCount === 1 ? "" : "s"} ${shouldWrite ? "written" : "would change"}.`);
for (const warning of warnings) console.warn(`Warning: ${warning}`);
