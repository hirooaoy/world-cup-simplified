#!/usr/bin/env node
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildFifaTacticalLineupUrl } from "./fifa-tactical-lineup-discovery.mjs";
import {
  extractFifaTacticalLineupPdf,
  parseFifaTacticalLineupDocument
} from "./fifa-tactical-lineup-pdf.mjs";
import { enrichFifaTacticalLineupPlayerAliases } from "./fifa-tactical-lineup-player-aliases.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const args = process.argv.slice(2);
const outputPath = path.resolve(root, optionValue("--output=") || "tmp/pdfs/fifa-tactical-lineup-history-audit.json");
const requestedMatches = parseRequestedMatches();
const skipArchives = args.includes("--no-archives");
const timeoutMs = positiveNumber(process.env.FIFA_TACTICAL_AUDIT_TIMEOUT_MS, 30000);
const maximumPdfBytes = positiveNumber(process.env.FIFA_TACTICAL_MAX_PDF_BYTES, 5 * 1024 * 1024);
const userAgent = "World-Cup-Simplified/FIFA-tactical-lineup-history-audit";

function optionValue(prefix) {
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || "";
}

function parseRequestedMatches() {
  const raw = optionValue("--match=") || optionValue("--fixture=");
  if (!raw) return null;
  const matches = new Set(
    raw.split(",").map(Number).filter((value) => Number.isInteger(value) && value > 0)
  );
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

async function writeJsonAtomic(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

function matchNumberForFixture(fixture) {
  const parsed = Number(fixture?.matchNumber ?? fixture?.providerIds?.fifa?.matchNumber);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function kickoffForFixture(fixture) {
  const parsed = new Date(fixture?.kickoffUtc || "");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function timestampToIso(value) {
  const match = String(value || "").match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!match) return "";
  return new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6])
  )).toISOString();
}

function fixtureLabel(fixture) {
  return `${fixture.homeTeamId}-${fixture.awayTeamId}`;
}

function officialValidationLineups(lineups) {
  if (!lineups) return null;
  return {
    ...lineups,
    home: { ...lineups.home, formation: "" },
    away: { ...lineups.away, formation: "" }
  };
}

function canonicalPlayerNumber(player) {
  return String(player?.number || "").trim();
}

function lineupSideSignature(side) {
  const formation = String(side?.formation || "").replace(/\s/g, "");
  const players = Array.isArray(side?.players) ? side.players : [];
  const formationRows = formation.split("-").map(Number);
  const rowCounts = [...formationRows].reverse();
  const goalkeepers = players
    .filter((player) => player.position === "GK")
    .sort((left, right) => Number(left.x) - Number(right.x));
  const outfield = players
    .filter((player) => player.position !== "GK")
    .sort((left, right) => Number(left.y) - Number(right.y) || Number(left.x) - Number(right.x));
  if (
    rowCounts.some((count) => !Number.isInteger(count) || count <= 0) ||
    rowCounts.reduce((sum, count) => sum + count, 0) !== 10 ||
    outfield.length !== 10 ||
    goalkeepers.length !== 1
  ) {
    return `${formation}|invalid-geometry`;
  }
  const rows = [];
  let offset = 0;
  for (const rowCount of rowCounts) {
    rows.push(
      outfield.slice(offset, offset + rowCount)
        .sort((left, right) => Number(left.x) - Number(right.x))
        .map(canonicalPlayerNumber)
    );
    offset += rowCount;
  }
  rows.push(goalkeepers.map(canonicalPlayerNumber));
  return `${formation}|${rows.map((row) => row.join(",")).join("/")}`;
}

function lineupSignature(lineups) {
  return {
    home: lineupSideSignature(lineups?.home),
    away: lineupSideSignature(lineups?.away)
  };
}

function signaturesAgree(left, right) {
  return left.home === right.home && left.away === right.away;
}

function parsedLineups(parsed) {
  return {
    home: { formation: parsed.home.formation, players: parsed.home.players },
    away: { formation: parsed.away.formation, players: parsed.away.players }
  };
}

function selectedDocumentSummary(candidate) {
  if (!candidate?.parsed) return null;
  return {
    sourceKind: candidate.sourceKind,
    captureTimestamp: candidate.captureTimestamp || null,
    capturedAt: candidate.capturedAt || null,
    replayUrl: candidate.replayUrl,
    canonicalUrl: candidate.canonicalUrl,
    version: candidate.parsed.version,
    publishedAt: candidate.parsed.publishedAt,
    layoutPerspective: candidate.parsed.layoutPerspective,
    isUpdatedVersion: candidate.parsed.isUpdatedVersion,
    revisionComment: candidate.parsed.revisionComment || null,
    sha256: candidate.parsed.sha256,
    signature: lineupSignature(parsedLineups(candidate.parsed))
  };
}

async function fetchBytes(url) {
  const response = await fetch(url, {
    headers: { accept: "application/pdf", "user-agent": userAgent },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim());
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumPdfBytes) {
    throw new Error(`response exceeded the ${maximumPdfBytes}-byte PDF limit`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > maximumPdfBytes) throw new Error(`response exceeded the ${maximumPdfBytes}-byte PDF limit`);
  if (bytes.length < 5 || Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-") {
    throw new Error("response body did not begin with the PDF signature");
  }
  return bytes;
}

async function fetchCdxCaptures() {
  const parameters = new URLSearchParams({
    url: "https://fdp.fifa.org/assetspublic/ce281/",
    matchType: "prefix",
    output: "json",
    filter: "statuscode:200",
    fl: "timestamp,original,digest,statuscode",
    collapse: "digest",
    limit: "1000"
  });
  const response = await fetch(`https://web.archive.org/cdx/search/cdx?${parameters}`, {
    headers: { accept: "application/json", "user-agent": userAgent },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`Wayback CDX returned ${response.status} ${response.statusText}`.trim());
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length < 2) throw new Error("Wayback CDX returned no report captures.");
  const [headers, ...values] = rows;
  const captures = values.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
  return captures.filter((capture) => /\/r\d+\/pdf\/TacticalLineup-English\.pdf$/i.test(String(capture.original || "")));
}

function capturesByRegistrationId(captures) {
  const grouped = new Map();
  for (const capture of captures) {
    const registrationId = Number(String(capture.original || "").match(/\/r(\d+)\/pdf\//i)?.[1]);
    if (!Number.isInteger(registrationId) || registrationId <= 0) continue;
    const candidates = grouped.get(registrationId) || [];
    candidates.push(capture);
    grouped.set(registrationId, candidates);
  }
  for (const candidates of grouped.values()) {
    candidates.sort((left, right) => String(left.timestamp).localeCompare(String(right.timestamp)));
  }
  return grouped;
}

async function inspectCandidate({ fixture, lineups, profilesData, canonicalUrl, capture = null }) {
  const sourceKind = capture ? "wayback" : "current";
  const replayUrl = capture
    ? `https://web.archive.org/web/${capture.timestamp}id_/${capture.original}`
    : canonicalUrl;
  const summary = {
    sourceKind,
    captureTimestamp: capture?.timestamp || null,
    capturedAt: capture ? timestampToIso(capture.timestamp) : null,
    replayUrl,
    canonicalUrl,
    digest: capture?.digest || null
  };
  try {
    const bytes = await fetchBytes(replayUrl);
    const document = await extractFifaTacticalLineupPdf(bytes);
    document.sourceUrl = canonicalUrl;
    const enrichedLineups = await enrichFifaTacticalLineupPlayerAliases({
      dataDir,
      fixture,
      lineups: officialValidationLineups(lineups),
      profilesData
    });
    const parsed = parseFifaTacticalLineupDocument({
      document,
      fixture,
      lineups: enrichedLineups
    });
    return { ...summary, parsed };
  } catch (error) {
    return {
      ...summary,
      errorCode: String(error?.code || "fetch_or_parse_error"),
      error: String(error?.message || error)
    };
  }
}

function summarizeCandidate(candidate, kickoff) {
  if (candidate.error) {
    return {
      sourceKind: candidate.sourceKind,
      capturedAt: candidate.capturedAt,
      replayUrl: candidate.replayUrl,
      errorCode: candidate.errorCode,
      error: candidate.error
    };
  }
  const publishedMs = new Date(candidate.parsed.publishedAt).getTime();
  return {
    sourceKind: candidate.sourceKind,
    capturedAt: candidate.capturedAt,
    replayUrl: candidate.replayUrl,
    version: candidate.parsed.version,
    publishedAt: candidate.parsed.publishedAt,
    publicationTiming: publishedMs <= kickoff.getTime() ? "pre-kickoff" : "post-kickoff",
    layoutPerspective: candidate.parsed.layoutPerspective,
    isUpdatedVersion: candidate.parsed.isUpdatedVersion,
    revisionComment: candidate.parsed.revisionComment || null,
    sha256: candidate.parsed.sha256
  };
}

function chooseEarliestPreKickoff(candidates, kickoff) {
  return candidates
    .filter((candidate) => candidate.parsed && new Date(candidate.parsed.publishedAt).getTime() <= kickoff.getTime())
    .sort((left, right) =>
      new Date(left.parsed.publishedAt).getTime() - new Date(right.parsed.publishedAt).getTime() ||
      left.parsed.version - right.parsed.version ||
      String(left.captureTimestamp || "99999999999999").localeCompare(String(right.captureTimestamp || "99999999999999"))
    )[0] || null;
}

function chooseEarliestParsed(candidates) {
  return candidates
    .filter((candidate) => candidate.parsed)
    .sort((left, right) =>
      new Date(left.parsed.publishedAt).getTime() - new Date(right.parsed.publishedAt).getTime() ||
      left.parsed.version - right.parsed.version
    )[0] || null;
}

function chooseLatestPreKickoff(candidates, kickoff) {
  return candidates
    .filter((candidate) => candidate.parsed && new Date(candidate.parsed.publishedAt).getTime() <= kickoff.getTime())
    .sort((left, right) =>
      new Date(right.parsed.publishedAt).getTime() - new Date(left.parsed.publishedAt).getTime() ||
      right.parsed.version - left.parsed.version
    )[0] || null;
}

function chooseLatestOfficialUpdate(candidates) {
  return candidates
    .filter((candidate) => ["observed", "revised"].includes(candidate.parsed?.layoutPerspective))
    .sort((left, right) =>
      right.parsed.version - left.parsed.version ||
      new Date(right.parsed.publishedAt).getTime() - new Date(left.parsed.publishedAt).getTime()
    )[0] || null;
}

function classificationFor({ preferred, existingSignature }) {
  const candidate = preferred;
  if (!candidate) return "unavailable-or-unparseable";
  const officialSignature = lineupSignature(parsedLineups(candidate.parsed));
  const agreement = signaturesAgree(existingSignature, officialSignature);
  return agreement ? "preferred-official-agrees" : "preferred-official-differs";
}

const [fixturesData, lineupsData, tacticalIndex, profilesData] = await Promise.all([
  readJson("fixtures.json"),
  readJson("lineups.json"),
  readJson("fifa-tactical-lineup-index.json"),
  readJson("player-profiles.json")
]);
const fixtures = fixturesData.fixtures
  .filter((fixture) => matchNumberForFixture(fixture) > 0 && matchNumberForFixture(fixture) <= 102)
  .filter((fixture) => !requestedMatches || requestedMatches.has(matchNumberForFixture(fixture)))
  .sort((left, right) => matchNumberForFixture(left) - matchNumberForFixture(right));
const lineupsByFixtureId = lineupsData.lineups || {};
let captures = new Map();
if (!skipArchives) {
  try {
    captures = capturesByRegistrationId(await fetchCdxCaptures());
  } catch (error) {
    console.warn(
      `Warning: archived FIFA tactical captures were unavailable (${error.message}); auditing current official documents only.`
    );
  }
}
const matches = [];

for (const fixture of fixtures) {
  const matchNumber = matchNumberForFixture(fixture);
  const registrationId = Number(tacticalIndex.registrationsByMatchNumber?.[String(matchNumber)]);
  const kickoff = kickoffForFixture(fixture);
  const lineups = lineupsByFixtureId[fixture.id];
  const canonicalUrl = buildFifaTacticalLineupUrl({
    competitionEditionId: tacticalIndex.competitionEditionId,
    registrationId
  });
  if (!registrationId || !kickoff || !lineups || !canonicalUrl) {
    matches.push({
      matchNumber,
      fixtureId: fixture.id,
      teams: fixtureLabel(fixture),
      classification: "missing-local-context",
      registrationId: registrationId || null,
      kickoffUtc: kickoff?.toISOString() || null
    });
    console.log(`#${matchNumber} ${fixtureLabel(fixture)}: missing local context`);
    continue;
  }

  const candidates = [];
  const seenHashes = new Set();
  for (const capture of captures.get(registrationId) || []) {
    const candidate = await inspectCandidate({ fixture, lineups, profilesData, canonicalUrl, capture });
    if (!candidate.parsed || !seenHashes.has(candidate.parsed.sha256)) candidates.push(candidate);
    if (candidate.parsed) seenHashes.add(candidate.parsed.sha256);
  }
  const current = await inspectCandidate({ fixture, lineups, profilesData, canonicalUrl });
  if (!current.parsed || !seenHashes.has(current.parsed.sha256)) candidates.push(current);

  const selected = chooseEarliestPreKickoff(candidates, kickoff);
  const fallback = selected ? null : chooseEarliestParsed(candidates);
  const latestOfficialUpdate = chooseLatestOfficialUpdate(candidates);
  const latestPreKickoff = chooseLatestPreKickoff(candidates, kickoff);
  const preferred = latestOfficialUpdate || latestPreKickoff || chooseEarliestParsed(candidates);
  const existingSignature = lineupSignature(lineups);
  const classification = classificationFor({ preferred, existingSignature });
  const reference = preferred;
  matches.push({
    matchNumber,
    fixtureId: fixture.id,
    teams: fixtureLabel(fixture),
    kickoffUtc: kickoff.toISOString(),
    registrationId,
    canonicalUrl,
    existing: {
      layoutSource: lineups.layoutSource || null,
      signature: existingSignature
    },
    classification,
    preferredOfficialDocument: selectedDocumentSummary(preferred),
    latestOfficialUpdateDocument: selectedDocumentSummary(latestOfficialUpdate),
    latestPreKickoffDocument: selectedDocumentSummary(latestPreKickoff),
    selectedPreKickoffDocument: selectedDocumentSummary(selected),
    earliestParsedDocument: selectedDocumentSummary(selected || fallback),
    candidates: candidates.map((candidate) => summarizeCandidate(candidate, kickoff))
  });
  console.log(
    `#${String(matchNumber).padStart(3, "0")} ${fixtureLabel(fixture)}: ${classification}` +
    `${reference?.parsed ? ` (v${reference.parsed.version}, ${reference.parsed.publishedAt})` : ""}`
  );
}

const summary = Object.fromEntries(
  [...new Set(matches.map((match) => match.classification))]
    .sort()
    .map((classification) => [classification, matches.filter((match) => match.classification === classification).length])
);
const output = {
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString(),
  policy: {
    primaryEvidence: "FIFA Tactical Line-up PDF positioned text",
    acceptedDocument: "latest FIFA post-observation update when present; otherwise the latest recoverable pre-kickoff tactical document",
    postKickoffRule: "auto-apply only when FIFA marks the document as updated after observation of the game",
    comparison: "formation plus tactical rows and left-to-right shirt-number order"
  },
  summary,
  matches
};

await writeJsonAtomic(outputPath, output);
console.log(`Wrote ${matches.length} sequential match audit record${matches.length === 1 ? "" : "s"} to ${outputPath}.`);
console.log(JSON.stringify(summary));
