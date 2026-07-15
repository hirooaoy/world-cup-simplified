#!/usr/bin/env node
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { recordFifaTacticalDocument } from "./fifa-tactical-lineup-discovery.mjs";
import {
  applyFifaOfficialLayoutOverride,
  buildFifaOfficialLayoutOverride,
  upsertFifaTacticalTournamentSource
} from "./fifa-tactical-lineup-official-override.mjs";
import {
  extractFifaTacticalLineupPdf,
  parseFifaTacticalLineupDocument
} from "./fifa-tactical-lineup-pdf.mjs";
import { enrichFifaTacticalLineupPlayerAliases } from "./fifa-tactical-lineup-player-aliases.mjs";
import { getLayoutOverrideProvenanceIssues } from "./lineup-layout-overrides.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const args = process.argv.slice(2);
const shouldWrite = !args.includes("--check");
const auditPath = path.resolve(root, optionValue("--audit=") || "tmp/pdfs/fifa-tactical-lineup-history-audit.json");
const requestedMatches = parseRequestedMatches();
const timeoutMs = positiveNumber(process.env.FIFA_TACTICAL_AUDIT_TIMEOUT_MS, 30000);
const maximumPdfBytes = positiveNumber(process.env.FIFA_TACTICAL_MAX_PDF_BYTES, 5 * 1024 * 1024);
const userAgent = "World-Cup-Simplified/FIFA-tactical-lineup-history-backfill";

function optionValue(prefix) {
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || "";
}

function parseRequestedMatches() {
  const raw = optionValue("--match=") || optionValue("--fixture=");
  if (!raw) return null;
  const matches = new Set(raw.split(",").map(Number).filter((value) => Number.isInteger(value) && value > 0));
  if (!matches.size) throw new Error(`Invalid match filter "${raw}".`);
  return matches;
}

function positiveNumber(value, fallback) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Expected a positive number; received "${value}".`);
  return parsed;
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

function matchNumberForFixture(fixture) {
  const parsed = Number(fixture?.matchNumber ?? fixture?.providerIds?.fifa?.matchNumber);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function kickoffMs(fixture) {
  return new Date(fixture?.kickoffUtc || "").getTime();
}

function isOfficialStartingEleven(lineups) {
  return (
    lineups?.teamSheetSource === "fifa-official" &&
    Array.isArray(lineups?.home?.players) && lineups.home.players.length === 11 &&
    Array.isArray(lineups?.away?.players) && lineups.away.players.length === 11
  );
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function fetchPdf(url) {
  const response = await fetch(url, {
    headers: { accept: "application/pdf", "user-agent": userAgent },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim());
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > maximumPdfBytes) throw new Error(`response exceeded the ${maximumPdfBytes}-byte PDF limit`);
  if (bytes.length < 5 || Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-") {
    throw new Error("response body did not begin with the PDF signature");
  }
  return bytes;
}

const [audit, fixturesData, lineupsData, overridesData, tacticalIndex, tournamentData, profilesData] = await Promise.all([
  JSON.parse(await readFile(auditPath, "utf8")),
  readJson("fixtures.json"),
  readJson("lineups.json"),
  readJson("lineup-layout-overrides.json"),
  readJson("fifa-tactical-lineup-index.json"),
  readJson("tournament.json"),
  readJson("player-profiles.json")
]);

const fixturesByMatchNumber = new Map(
  fixturesData.fixtures.map((fixture) => [matchNumberForFixture(fixture), fixture])
);
const targets = audit.matches
  .filter((match) => match.selectedPreKickoffDocument)
  .filter((match) => !requestedMatches || requestedMatches.has(match.matchNumber))
  .sort((left, right) => left.matchNumber - right.matchNumber);
const acceptedSourceIds = new Set();
let appliedCount = 0;
let unchangedCount = 0;

for (const record of targets) {
  const fixture = fixturesByMatchNumber.get(record.matchNumber);
  const lineups = fixture ? lineupsData.lineups?.[fixture.id] : null;
  const selected = record.selectedPreKickoffDocument;
  if (!fixture || !isOfficialStartingEleven(lineups)) {
    throw new Error(`Match ${record.matchNumber} is missing its FIFA official starting XI.`);
  }
  if (
    !Number.isFinite(kickoffMs(fixture)) ||
    new Date(selected.publishedAt).getTime() > kickoffMs(fixture)
  ) {
    throw new Error(`Match ${record.matchNumber} audit selection is not a pre-kickoff document.`);
  }

  const bytes = await fetchPdf(selected.replayUrl);
  const document = await extractFifaTacticalLineupPdf(bytes);
  document.sourceUrl = record.canonicalUrl;
  if (document.sha256 !== selected.sha256) {
    throw new Error(`Match ${record.matchNumber} replay hash changed (${document.sha256} != ${selected.sha256}).`);
  }
  const enrichedLineups = await enrichFifaTacticalLineupPlayerAliases({
    dataDir,
    fixture,
    lineups,
    profilesData
  });
  const parsed = parseFifaTacticalLineupDocument({
    document,
    fixture,
    lineups: enrichedLineups,
    allowFormationCorrection: true
  });
  if (
    parsed.version !== selected.version ||
    parsed.publishedAt !== selected.publishedAt ||
    parsed.sha256 !== selected.sha256
  ) {
    throw new Error(`Match ${record.matchNumber} replay no longer matches its audited FIFA document metadata.`);
  }

  const archiveUrl = selected.sourceKind === "wayback" ? selected.replayUrl : "";
  const capturedAt = selected.sourceKind === "wayback" ? selected.capturedAt : "";
  const override = buildFifaOfficialLayoutOverride({
    fixture,
    parsed,
    registrationId: record.registrationId,
    url: record.canonicalUrl,
    publishedAt: parsed.publishedAt,
    archiveUrl,
    capturedAt,
    checkedAt: audit.generatedAt
  });
  const provenanceIssues = getLayoutOverrideProvenanceIssues(override);
  if (provenanceIssues.length) {
    throw new Error(`Match ${record.matchNumber} official override failed validation: ${provenanceIssues.join("; ")}`);
  }

  const previousOverride = overridesData.fixtures?.[fixture.id] || null;
  const appliedLineups = applyFifaOfficialLayoutOverride(lineups, override, previousOverride);
  const changed = !sameJson(lineups, appliedLineups) || !sameJson(previousOverride, override);
  lineupsData.lineups[fixture.id] = appliedLineups;
  overridesData.fixtures ||= {};
  overridesData.fixtures[fixture.id] = override;
  upsertFifaTacticalTournamentSource(tournamentData, fixture, override);
  recordFifaTacticalDocument(tacticalIndex, {
    fixtureId: fixture.id,
    matchNumber: record.matchNumber,
    registrationId: record.registrationId,
    url: record.canonicalUrl,
    version: parsed.version,
    publishedAt: parsed.publishedAt,
    sha256: parsed.sha256,
    archiveUrl,
    capturedAt
  });
  for (const sourceId of override.sourceIds) acceptedSourceIds.add(sourceId);
  if (changed) appliedCount += 1;
  else unchangedCount += 1;
  console.log(`#${String(record.matchNumber).padStart(3, "0")} ${fixture.homeTeamId}-${fixture.awayTeamId}: ${changed ? "official geometry applied" : "already exact"}`);
}

lineupsData.sourceIds = [...new Set([...(lineupsData.sourceIds || []), ...acceptedSourceIds])];
overridesData.sourceIds = [...new Set([...(overridesData.sourceIds || []), ...acceptedSourceIds])];
const updatedAt = new Date().toISOString();
lineupsData.updatedAt = updatedAt;
overridesData.updatedAt = updatedAt;
tacticalIndex.updatedAt = updatedAt;
tournamentData.updatedAt = updatedAt;

if (shouldWrite) {
  await Promise.all([
    writeJsonAtomic("lineups.json", lineupsData),
    writeJsonAtomic("lineup-layout-overrides.json", overridesData),
    writeJsonAtomic("fifa-tactical-lineup-index.json", tacticalIndex),
    writeJsonAtomic("tournament.json", tournamentData)
  ]);
}

console.log(
  `${targets.length} audited pre-kickoff FIFA document${targets.length === 1 ? "" : "s"} checked; ` +
  `${appliedCount} layout${appliedCount === 1 ? "" : "s"} ${shouldWrite ? "applied" : "would change"}; ` +
  `${unchangedCount} already exact.`
);
