import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  ARCHIVE_MANIFEST_NAME,
  ARCHIVE_SCHEMA_VERSION,
  ARCHIVE_SOURCE_ID,
  ARCHIVE_SURFACE_INPUT_FILES,
  stringifyArchiveJson,
  validate2026ArchiveManifest
} from "./finalize-2026-archive-lib.mjs";

const SCHEMA_3_REQUIRED_EMBEDDED_INPUTS = {
  "fixtures.json": "fixtures",
  "teams.json": "teams",
  "standings.json": "standings",
  "lineups.json": "lineups",
  "expected-lineups.json": "expectedLineups",
  "lineup-prediction-history.json": "preMatchPredictionHistory",
  "official-event-corrections.json": "officialEventCorrections",
  "locales/es/current-content.json": ["localeCurrentContent", "es"],
  "locales/ko/current-content.json": ["localeCurrentContent", "ko"],
  "player-profiles.json": "playerProfiles",
  "coach-profiles.json": "coachProfiles",
  "player-availability.json": "playerAvailability",
  "chatbot-h2h.json": "chatbotH2h",
  "team-style-profiles.json": "teamStyleProfiles",
  "world-cup-awards.json": "worldCupAwards",
  "tournament.json": "tournament",
  "edition-lifecycle.json": "lifecycleBeforeArchive"
};
const SCHEMA_4_REQUIRED_EMBEDDED_INPUTS = {
  ...SCHEMA_3_REQUIRED_EMBEDDED_INPUTS,
  "highlights-best-xi.json": "highlightsBestXi",
  "lineup-layout-overrides.json": "lineupLayoutOverrides",
  "fifa-tactical-lineup-index.json": "fifaTacticalLineupIndex",
  "expected-lineups-audit.json": "expectedLineupsAudit",
  "lineup-prediction-revisions.json": "lineupPredictionRevisions"
};
const COMPLETED_STATUSES = new Set(["FT", "AET", "PEN"]);
const CURRENT_EDITION_INPUTS = Object.fromEntries(
  Object.entries(SCHEMA_4_REQUIRED_EMBEDDED_INPUTS).filter(
    ([file]) => !["edition-lifecycle.json", "tournament.json"].includes(file)
  )
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function resolveDataPath(dataDir, relativePath, expectedDirectory) {
  assert(typeof relativePath === "string" && relativePath, "Archive metadata contains a missing file path.");
  const dataRelativePath = path.relative("data", relativePath);
  assert(!dataRelativePath.startsWith("..") && !path.isAbsolute(dataRelativePath), `Archive path must start inside data/: ${relativePath}`);
  const resolved = path.resolve(dataDir, dataRelativePath);
  const allowedDirectory = path.resolve(dataDir, path.relative("data", expectedDirectory));
  const relative = path.relative(allowedDirectory, resolved);
  assert(!relative.startsWith("..") && !path.isAbsolute(relative), `Archive path escapes ${expectedDirectory}: ${relativePath}`);
  return resolved;
}

function getEmbeddedValue(archive, selector) {
  if (Array.isArray(selector)) return selector.reduce((value, key) => value?.[key], archive);
  return archive[selector];
}

function verifyEmbeddedInputProvenance(archive) {
  const requiredEmbeddedInputs = archive.schemaVersion === 3
    ? SCHEMA_3_REQUIRED_EMBEDDED_INPUTS
    : SCHEMA_4_REQUIRED_EMBEDDED_INPUTS;
  const provenance = archive.inputProvenance;
  assert(provenance && typeof provenance === "object" && !Array.isArray(provenance), `Archive ${archive.archiveVersion} is missing input provenance.`);
  for (const [file, selector] of Object.entries(requiredEmbeddedInputs)) {
    const record = provenance[file];
    assert(record?.present === true, `Archive ${archive.archiveVersion} is missing provenance for ${file}.`);
    assert(/^[a-f0-9]{64}$/.test(record.sha256 || ""), `Archive ${archive.archiveVersion} has an invalid input checksum for ${file}.`);
    const value = getEmbeddedValue(archive, selector);
    assert(value !== undefined, `Archive ${archive.archiveVersion} is missing embedded ${file}.`);
    const contents = stringifyArchiveJson(value);
    assert(Buffer.byteLength(contents) === record.canonicalBytes, `Archive ${archive.archiveVersion} embedded ${file} byte count does not match its canonical provenance.`);
    assert(sha256(contents) === record.canonicalSha256, `Archive ${archive.archiveVersion} embedded ${file} does not match its canonical provenance checksum.`);
  }
}

function verifyArchiveMetadata(archive, entry) {
  assert([3, ARCHIVE_SCHEMA_VERSION].includes(archive?.schemaVersion), `Archive ${entry.archiveVersion} must use schemaVersion 3 or ${ARCHIVE_SCHEMA_VERSION}.`);
  assert(archive.edition === 2026, `Archive ${entry.archiveVersion} does not belong to the 2026 edition.`);
  assert(archive.archiveVersion === entry.archiveVersion, `Archive ${entry.archiveVersion} has a mismatched internal version.`);
  assert(archive.archivedAt === entry.archivedAt, `Archive ${entry.archiveVersion} has a mismatched archivedAt timestamp.`);
  assert(archive.lateCorrection === entry.lateCorrection, `Archive ${entry.archiveVersion} has a mismatched late-correction flag.`);
  assert((archive.supersedes || null) === (entry.supersedes || null), `Archive ${entry.archiveVersion} has a mismatched supersedes link.`);

  const fixtures = Array.isArray(archive.fixtures?.fixtures) ? archive.fixtures.fixtures : [];
  const teams = Array.isArray(archive.teams?.teams) ? archive.teams.teams : [];
  const lineups = archive.lineups?.lineups && typeof archive.lineups.lineups === "object" ? Object.keys(archive.lineups.lineups) : [];
  const groups = archive.standings?.groups && typeof archive.standings.groups === "object" ? Object.keys(archive.standings.groups) : [];
  const playerProfiles = archive.playerProfiles?.profiles && typeof archive.playerProfiles.profiles === "object" ? Object.keys(archive.playerProfiles.profiles) : [];
  const coachProfiles = archive.coachProfiles?.profiles && typeof archive.coachProfiles.profiles === "object" ? Object.keys(archive.coachProfiles.profiles) : [];
  const availabilityTeams = archive.playerAvailability?.teams && typeof archive.playerAvailability.teams === "object" ? Object.keys(archive.playerAvailability.teams) : [];
  const chatbotH2hPairs = archive.chatbotH2h?.pairs && typeof archive.chatbotH2h.pairs === "object" ? Object.keys(archive.chatbotH2h.pairs) : [];
  const teamStyleProfiles = archive.teamStyleProfiles?.profiles && typeof archive.teamStyleProfiles.profiles === "object" ? Object.keys(archive.teamStyleProfiles.profiles) : [];
  const canonicalAwards = archive.worldCupAwards?.editions?.["2026"] || {};
  const bestXiSlots = Array.isArray(archive.highlightsBestXi?.selection?.slots) ? archive.highlightsBestXi.selection.slots : [];
  const bestXiResearchPlayers = bestXiSlots.flatMap((slot) => [slot?.starter, ...(Array.isArray(slot?.honourables) ? slot.honourables : [])]).filter(Boolean);
  const bestXiPlayers = bestXiSlots.flatMap((slot) => [
    slot?.starter,
    ...(Array.isArray(slot?.honourables)
      ? slot.honourables.filter((player, index) => index === 0 || player?.showInHonourableMentions === true)
      : [])
  ]).filter(Boolean);
  const bestXiCoach = archive.highlightsBestXi?.selection?.coach;
  const quality = archive.qualitySummary || {};

  assert(fixtures.length === 104 && quality.fixtureCount === fixtures.length, `Archive ${entry.archiveVersion} fixture counts are inconsistent.`);
  assert(fixtures.every((fixture) => COMPLETED_STATUSES.has(fixture?.status)), `Archive ${entry.archiveVersion} contains a non-final fixture.`);
  assert(teams.length === 48 && quality.teamCount === teams.length, `Archive ${entry.archiveVersion} team counts are inconsistent.`);
  assert(lineups.length === 104 && quality.officialLineupCount === lineups.length, `Archive ${entry.archiveVersion} lineup counts are inconsistent.`);
  assert(groups.length === 12 && quality.standingsGroupCount === groups.length, `Archive ${entry.archiveVersion} standings counts are inconsistent.`);
  assert(quality.playerProfileCount === playerProfiles.length && playerProfiles.length > 0, `Archive ${entry.archiveVersion} player-profile counts are inconsistent.`);
  assert(quality.coachProfileCount === coachProfiles.length && coachProfiles.length >= 48, `Archive ${entry.archiveVersion} coach-profile counts are inconsistent.`);
  assert(quality.availabilityTeamCount === availabilityTeams.length && availabilityTeams.length === 48, `Archive ${entry.archiveVersion} player-availability counts are inconsistent.`);
  assert(quality.chatbotH2hPairCount === chatbotH2hPairs.length, `Archive ${entry.archiveVersion} Ball Boy head-to-head counts are inconsistent.`);
  assert(quality.teamStyleProfileCount === teamStyleProfiles.length && teamStyleProfiles.length === 48, `Archive ${entry.archiveVersion} team-style profile counts are inconsistent.`);
  assert(quality.canonicalAwardCount === 5 && Object.keys(canonicalAwards).length >= 5, `Archive ${entry.archiveVersion} canonical award counts are inconsistent.`);
  if (archive.schemaVersion === ARCHIVE_SCHEMA_VERSION) {
    assert(archive.highlightsBestXi?.edition === 2026, `Archive ${entry.archiveVersion} Best XI edition identity is inconsistent.`);
    assert(bestXiSlots.length === 11 && quality.bestXiStarterCount === 11 && quality.bestXiHonourableCount === 15, `Archive ${entry.archiveVersion} Best XI slot/display counts are inconsistent.`);
    assert(bestXiPlayers.length === 26 && new Set(bestXiPlayers.map((player) => player?.playerName)).size === 26 && quality.bestXiPlayerCount === 26, `Archive ${entry.archiveVersion} displayed Best XI player counts are inconsistent.`);
    assert(bestXiResearchPlayers.length === 34 && new Set(bestXiResearchPlayers.map((player) => player?.playerName)).size === 34, `Archive ${entry.archiveVersion} researched Best XI player counts are inconsistent.`);
    assert(quality.bestXiResearchHonourableCount === 23 && quality.bestXiResearchPlayerCount === 34, `Archive ${entry.archiveVersion} researched Best XI quality counts are inconsistent.`);
    assert(typeof bestXiCoach?.name === "string" && bestXiCoach.name.trim() && quality.bestXiCoachCount === 1, `Archive ${entry.archiveVersion} Best Coach record is inconsistent.`);
    assert(quality.bestXiLocaleCount === 4 && quality.bestXiSourceCount === archive.highlightsBestXi.selection.sources.length, `Archive ${entry.archiveVersion} Best XI provenance counts are inconsistent.`);
  }
  assert(archive.lifecycleBeforeArchive?.edition === 2026, `Archive ${entry.archiveVersion} has invalid lifecycle provenance.`);
  verifyEmbeddedInputProvenance(archive);

  return {
    archiveVersion: entry.archiveVersion,
    schemaVersion: archive.schemaVersion,
    file: entry.file,
    sha256: entry.sha256,
    fixtureCount: fixtures.length,
    teamCount: teams.length,
    playerProfileCount: playerProfiles.length,
    coachProfileCount: coachProfiles.length
  };
}

function withoutArchiveSource(tournament) {
  return {
    ...tournament,
    sources: Array.isArray(tournament?.sources)
      ? tournament.sources.filter((source) => source?.id !== ARCHIVE_SOURCE_ID)
      : tournament?.sources
  };
}

async function verifyCurrentEditionInputs(dataDir, archive) {
  for (const [file, selector] of Object.entries(CURRENT_EDITION_INPUTS)) {
    const current = JSON.parse(await readFile(path.join(dataDir, file), "utf8"));
    const archived = getEmbeddedValue(archive, selector);
    assert(
      stringifyArchiveJson(current) === stringifyArchiveJson(archived),
      `Current ${file} differs from the latest immutable archive ${archive.archiveVersion}; create a superseding late-correction archive before merge.`
    );
  }

  const currentTournament = JSON.parse(await readFile(path.join(dataDir, "tournament.json"), "utf8"));
  assert(
    stringifyArchiveJson(withoutArchiveSource(currentTournament)) ===
      stringifyArchiveJson(withoutArchiveSource(archive.tournament)),
    `Current tournament.json differs from the latest immutable archive ${archive.archiveVersion}; create a superseding late-correction archive before merge.`
  );
}

async function verifyCurrentSurfaceInputs(surfaceRoot, archive) {
  const provenance = archive.surfaceProvenance;
  assert(provenance && typeof provenance === "object" && !Array.isArray(provenance), `Archive ${archive.archiveVersion} is missing site-surface provenance.`);
  const files = Object.keys(provenance).sort();
  assert(JSON.stringify(files) === JSON.stringify([...ARCHIVE_SURFACE_INPUT_FILES].sort()), `Archive ${archive.archiveVersion} site-surface provenance is incomplete.`);
  for (const file of ARCHIVE_SURFACE_INPUT_FILES) {
    const contents = await readFile(path.join(surfaceRoot, file), "utf8");
    const record = provenance[file];
    assert(Buffer.byteLength(contents) === record.bytes, `Current ${file} byte count differs from the latest immutable archive ${archive.archiveVersion}.`);
    assert(sha256(contents) === record.sha256, `Current ${file} differs from the latest immutable archive ${archive.archiveVersion}; create a superseding late-correction archive before merge.`);
  }
}

export async function verify2026Archive({ dataDir, surfaceRoot = path.dirname(dataDir), verifyReleaseSurface = false }) {
  const lifecycle = JSON.parse(await readFile(path.join(dataDir, "edition-lifecycle.json"), "utf8"));
  assert(lifecycle.edition === 2026, "Lifecycle does not belong to the 2026 edition.");
  assert(lifecycle.state === "archived", "2026 lifecycle is not archived.");
  assert(typeof lifecycle.archiveVersion === "string" && lifecycle.archiveVersion, "Archived lifecycle is missing archiveVersion.");
  assert(/^[a-f0-9]{64}$/.test(lifecycle.archiveSha256 || ""), "Archived lifecycle is missing a valid archive SHA-256 checksum.");

  const expectedManifestPath = `data/archives/${ARCHIVE_MANIFEST_NAME}`;
  assert(lifecycle.archiveManifest === expectedManifestPath, `Lifecycle archiveManifest must be ${expectedManifestPath}.`);
  const manifestPath = resolveDataPath(dataDir, lifecycle.archiveManifest, "data/archives");
  const manifest = validate2026ArchiveManifest(JSON.parse(await readFile(manifestPath, "utf8")));
  assert(manifest.entries.length > 0, "Archive manifest has no immutable entries.");
  assert(manifest.latestArchiveVersion === lifecycle.archiveVersion, "Lifecycle and manifest latest archive versions do not match.");

  const verifiedEntries = [];
  let latestArchive = null;
  for (const entry of manifest.entries) {
    const archivePath = resolveDataPath(dataDir, entry.file, "data/archives");
    const archiveContents = await readFile(archivePath, "utf8");
    const checksum = sha256(archiveContents);
    assert(checksum === entry.sha256, `Archive ${entry.archiveVersion} SHA-256 does not match its manifest entry.`);
    const archive = JSON.parse(archiveContents);
    latestArchive = archive;
    verifiedEntries.push(verifyArchiveMetadata(archive, entry));
  }

  const latestEntry = manifest.entries.at(-1);
  assert(latestArchive?.schemaVersion === ARCHIVE_SCHEMA_VERSION, `Latest archive ${latestEntry.archiveVersion} must use schemaVersion ${ARCHIVE_SCHEMA_VERSION}.`);
  assert(lifecycle.archiveFile === latestEntry.file, "Lifecycle archiveFile does not match the latest manifest entry.");
  assert(lifecycle.archiveSha256 === latestEntry.sha256, "Lifecycle archiveSha256 does not match the latest manifest entry.");
  if (latestEntry.lateCorrection) {
    assert(lifecycle.lastCorrectedAt === latestEntry.archivedAt, "Lifecycle lastCorrectedAt does not match the latest correction.");
  } else {
    assert(lifecycle.archivedAt === latestEntry.archivedAt, "Lifecycle archivedAt does not match the initial archive.");
  }
  await verifyCurrentEditionInputs(dataDir, latestArchive);
  if (verifyReleaseSurface) {
    await verifyCurrentSurfaceInputs(surfaceRoot, latestArchive);
  }

  return {
    edition: 2026,
    latestArchiveVersion: lifecycle.archiveVersion,
    releaseSurfaceVerified: verifyReleaseSurface,
    entryCount: verifiedEntries.length,
    verifiedEntries
  };
}
