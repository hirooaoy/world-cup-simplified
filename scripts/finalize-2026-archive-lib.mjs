import { createHash } from "node:crypto";
import { isPlayerNameMatch } from "./player-name-matching.mjs";

export const ARCHIVE_MANIFEST_NAME = "world-cup-2026-manifest.json";
export const ARCHIVE_SOURCE_ID = "world-cup-2026-final-archive";
export const ARCHIVE_SCHEMA_VERSION = 4;
export const ARCHIVE_PLAN_SCHEMA_VERSION = 2;
export const ARCHIVE_SURFACE_INPUT_FILES = Object.freeze([
  "api/live-data.js",
  "app-config.js",
  "app.js",
  "chatbot-knowledge.js",
  "chatbot.js",
  "data/locales/es/release-content.json",
  "data/locales/ko/release-content.json",
  "data/release-notes.json",
  "edition-runtime.js",
  "football-typography.js",
  "highlights.css",
  "highlights.html",
  "highlights.js",
  "index.html",
  "lineup-ui.js",
  "locales/es/app.js",
  "locales/es/content-release.js",
  "locales/es/highlights.js",
  "locales/ko/app.js",
  "locales/ko/content-release.js",
  "locales/ko/highlights.js",
  "locales/locale-runtime.js",
  "player-card-ui.js",
  "report.html",
  "report.js",
  "styles.css"
]);

const COMPLETED_STATUSES = new Set(["FT", "AET", "PEN"]);
const EXPLICIT_HIGHLIGHT_DISPOSITIONS = new Set(["not-found"]);
const OFFICIAL_2026_HIGHLIGHT_CHANNEL_ID = "UCwNqHDsnBCKT-olwJwIFyfg";
const REQUIRED_AWARDS = {
  goldenBall: { label: "Golden Ball", recipientField: "playerName" },
  goldenBoot: { label: "Golden Boot", recipientField: "playerName" },
  goldenGlove: { label: "Golden Glove", recipientField: "playerName" },
  youngPlayer: { label: "Young Player", recipientField: "playerName" },
  fairPlay: { label: "Fair Play", recipientField: "teamName" }
};
const ARCHIVE_AWARD_SOURCE_TYPES = new Set(["official", "cross-check"]);
const BEST_XI_FACT_TYPES = new Set([
  "assists",
  "champion",
  "cleanSheets",
  "goals",
  "goldenBall",
  "goldenGlove",
  "starts",
  "youngPlayer"
]);
const BEST_XI_LOCALES = ["en", "es", "zh", "ko"];
const SCHEMA_4_WORKFLOW_INPUTS = [
  ["lineup-layout-overrides.json", "lineupLayoutOverridesData"],
  ["fifa-tactical-lineup-index.json", "fifaTacticalLineupIndexData"],
  ["expected-lineups-audit.json", "expectedLineupsAuditData"],
  ["lineup-prediction-revisions.json", "lineupPredictionRevisionsData"]
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function timestampSlug(date) {
  return date.toISOString().replace(/:/g, "-").replace(/\.(\d{3})Z$/, "-$1Z");
}

export function sha256Text(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

export function buildArchiveInputProvenance(inputSnapshots) {
  assert(inputSnapshots instanceof Map, "Archive input provenance requires the exact input snapshots.");
  return Object.fromEntries([...inputSnapshots.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([file, contents]) => {
      if (contents === null) return [file, { present: false }];
      const canonicalContents = stringifyArchiveJson(JSON.parse(contents));
      return [file, {
        present: true,
        bytes: Buffer.byteLength(contents),
        sha256: sha256Text(contents),
        canonicalBytes: Buffer.byteLength(canonicalContents),
        canonicalSha256: sha256Text(canonicalContents)
      }];
    }));
}

export function buildArchiveSurfaceProvenance(surfaceSnapshots) {
  assert(surfaceSnapshots instanceof Map, "Archive surface provenance requires the exact site-file snapshots.");
  return Object.fromEntries([...surfaceSnapshots.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([file, contents]) => {
      assert(typeof contents === "string", `Archive surface input ${file} is missing.`);
      return [file, {
        bytes: Buffer.byteLength(contents),
        sha256: sha256Text(contents)
      }];
    }));
}

function validateSurfaceProvenance(surfaceProvenance) {
  assert(surfaceProvenance && typeof surfaceProvenance === "object" && !Array.isArray(surfaceProvenance), "Archive site-surface provenance is required.");
  const files = Object.keys(surfaceProvenance).sort();
  assert(JSON.stringify(files) === JSON.stringify([...ARCHIVE_SURFACE_INPUT_FILES].sort()), "Archive site-surface provenance does not cover the exact required release files.");
  for (const [file, record] of Object.entries(surfaceProvenance)) {
    assert(Number.isInteger(record?.bytes) && record.bytes > 0, `Archive site-surface input ${file} has an invalid byte count.`);
    assert(/^[a-f0-9]{64}$/.test(record?.sha256 || ""), `Archive site-surface input ${file} has an invalid SHA-256 checksum.`);
  }
}

export function stringifyArchiveJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function validate2026ArchiveManifest(manifestData) {
  if (manifestData === null || manifestData === undefined) {
    return {
      schemaVersion: 1,
      edition: 2026,
      latestArchiveVersion: null,
      updatedAt: null,
      entries: []
    };
  }

  assert(manifestData.schemaVersion === 1, "The 2026 archive manifest must use schemaVersion 1.");
  assert(manifestData.edition === 2026, "The archive manifest must belong to the 2026 edition.");
  assert(Array.isArray(manifestData.entries), "The archive manifest entries must be an array.");
  const versions = new Set();
  const files = new Set();
  for (const [index, entry] of manifestData.entries.entries()) {
    assert(typeof entry?.archiveVersion === "string" && entry.archiveVersion, "Every archive manifest entry needs an archiveVersion.");
    assert(typeof entry?.file === "string" && entry.file, "Every archive manifest entry needs a file.");
    assert(/^[a-f0-9]{64}$/.test(entry?.sha256 || ""), `Archive ${entry?.archiveVersion || "entry"} has an invalid SHA-256 checksum.`);
    assert(!versions.has(entry.archiveVersion), `Duplicate archive manifest version: ${entry.archiveVersion}.`);
    assert(!files.has(entry.file), `Duplicate archive manifest file: ${entry.file}.`);
    const archivedAt = Date.parse(entry.archivedAt || "");
    assert(Number.isFinite(archivedAt), `Archive ${entry.archiveVersion} has an invalid archivedAt timestamp.`);
    versions.add(entry.archiveVersion);
    files.add(entry.file);
    if (index === 0) {
      assert(entry.lateCorrection === false && !entry.supersedes, "The first archive manifest entry must be the initial snapshot.");
    } else {
      assert(entry.lateCorrection === true, `Archive ${entry.archiveVersion} must be marked as a late correction.`);
      assert(entry.supersedes === manifestData.entries[index - 1].archiveVersion, `Archive ${entry.archiveVersion} must supersede the immediately preceding version.`);
      assert(
        archivedAt > Date.parse(manifestData.entries[index - 1].archivedAt),
        `Archive ${entry.archiveVersion} must be newer than the version it supersedes.`
      );
    }
  }
  const latestEntry = manifestData.entries.at(-1);
  assert(manifestData.latestArchiveVersion === (latestEntry?.archiveVersion || null), "Archive manifest latestArchiveVersion does not match its final entry.");
  assert(manifestData.updatedAt === (latestEntry?.archivedAt || null), "Archive manifest updatedAt must match its latest entry.");
  return manifestData;
}

function validateProfiles(playerProfilesData, coachProfilesData, teamIds) {
  const playerProfiles = playerProfilesData?.profiles;
  assert(playerProfiles && !Array.isArray(playerProfiles) && typeof playerProfiles === "object", "Canonical 2026 player profiles must be an object.");
  const playerEntries = Object.entries(playerProfiles);
  assert(playerEntries.length > 0, "Canonical 2026 player profiles cannot be empty.");
  const playerTeamIds = new Set();
  for (const [profileKey, profile] of playerEntries) {
    assert(typeof profileKey === "string" && profileKey, "Every player profile needs a stable key.");
    assert(typeof profile?.name === "string" && profile.name.trim(), `Player profile ${profileKey} needs a name.`);
    assert(teamIds.has(profile.teamId), `Player profile ${profileKey} references unknown team ${profile?.teamId || "(missing)"}.`);
    playerTeamIds.add(profile.teamId);
  }
  assert([...teamIds].every((teamId) => playerTeamIds.has(teamId)), "Canonical player profiles must cover all 48 tournament teams.");

  const coachProfiles = coachProfilesData?.profiles;
  assert(coachProfiles && !Array.isArray(coachProfiles) && typeof coachProfiles === "object", "Canonical 2026 coach profiles must be an object.");
  const coachEntries = Object.entries(coachProfiles);
  assert(coachEntries.length >= teamIds.size, `Expected at least ${teamIds.size} canonical coach profiles, found ${coachEntries.length}.`);
  const coachTeamIds = new Set();
  for (const [profileKey, profile] of coachEntries) {
    assert(typeof profile?.name === "string" && profile.name.trim(), `Coach profile ${profileKey} needs a name.`);
    assert(teamIds.has(profile.teamId), `Coach profile ${profileKey} references unknown team ${profile?.teamId || "(missing)"}.`);
    coachTeamIds.add(profile.teamId);
  }
  assert([...teamIds].every((teamId) => coachTeamIds.has(teamId)), "Canonical coach profiles must cover all 48 tournament teams.");

  return {
    playerProfileCount: playerEntries.length,
    coachProfileCount: coachEntries.length
  };
}

function validateRenderedEditionKnowledge(playerAvailabilityData, chatbotH2hData, teamStyleProfilesData, teamIds) {
  const availabilityTeams = playerAvailabilityData?.teams;
  assert(availabilityTeams && !Array.isArray(availabilityTeams) && typeof availabilityTeams === "object", "Canonical player availability must contain a teams object.");
  assert(Object.keys(availabilityTeams).length === teamIds.size, `Expected player availability for ${teamIds.size} teams, found ${Object.keys(availabilityTeams).length}.`);
  assert(Object.keys(availabilityTeams).every((teamId) => teamIds.has(teamId)), "Player availability references a team outside the 2026 edition.");

  const styleProfiles = teamStyleProfilesData?.profiles;
  assert(styleProfiles && !Array.isArray(styleProfiles) && typeof styleProfiles === "object", "Canonical team style profiles must contain a profiles object.");
  assert(Object.keys(styleProfiles).length === teamIds.size, `Expected team style profiles for ${teamIds.size} teams, found ${Object.keys(styleProfiles).length}.`);
  assert(Object.keys(styleProfiles).every((teamId) => teamIds.has(teamId)), "Team style profiles reference a team outside the 2026 edition.");

  const chatbotPairs = chatbotH2hData?.pairs;
  assert(chatbotPairs && !Array.isArray(chatbotPairs) && typeof chatbotPairs === "object", "Canonical Ball Boy head-to-head data must contain a pairs object.");
  for (const pairId of Object.keys(chatbotPairs)) {
    const pairTeamIds = pairId.split("|");
    assert(pairTeamIds.length === 2 && pairTeamIds.every((teamId) => teamIds.has(teamId)), `Ball Boy head-to-head pair ${pairId} references a team outside the 2026 edition.`);
  }

  return {
    availabilityTeamCount: Object.keys(availabilityTeams).length,
    chatbotH2hPairCount: Object.keys(chatbotPairs).length,
    teamStyleProfileCount: Object.keys(styleProfiles).length
  };
}

function validateCanonicalAwardsRecord(worldCupAwardsData, tournamentData, teams) {
  const editionAwards = worldCupAwardsData?.editions?.["2026"];
  assert(editionAwards && typeof editionAwards === "object", "The canonical awards record must contain the 2026 edition.");
  const sourcesById = new Map(asArray(worldCupAwardsData.sources).map((source) => [source?.id, source]));
  const teamNamesById = new Map(teams.map((team) => [team.id, team.name]));

  for (const [awardId, definition] of Object.entries(REQUIRED_AWARDS)) {
    const canonicalAward = editionAwards[awardId];
    const recipients = asArray(canonicalAward?.recipients);
    const tournamentAward = tournamentData.awards[awardId];
    assert(recipients.length > 0, `The canonical 2026 ${definition.label} record needs at least one recipient.`);
    assert(typeof canonicalAward.sourceId === "string" && canonicalAward.sourceId, `The canonical 2026 ${definition.label} record needs sourceId provenance.`);
    const source = sourcesById.get(canonicalAward.sourceId);
    assert(source && /^https:\/\//.test(source.url || ""), `The canonical 2026 ${definition.label} source must resolve to an HTTPS URL.`);

    const expectedTeamName = teamNamesById.get(tournamentAward.teamId);
    const matchesTournamentAward = recipients.some((recipient) => {
      const recipientMatches = definition.recipientField === "playerName"
        ? isPlayerNameMatch(recipient?.playerName, tournamentAward.playerName)
        : recipient?.teamName === tournamentAward.teamName;
      return recipientMatches && recipient?.teamName === expectedTeamName;
    });
    assert(matchesTournamentAward, `The canonical 2026 ${definition.label} record does not match tournament.json.`);

    if (awardId === "goldenBoot") {
      assert(recipients.some((recipient) =>
        isPlayerNameMatch(recipient?.playerName, tournamentAward.playerName) &&
        recipient?.goals === tournamentAward.goals
      ), "The canonical 2026 Golden Boot goal total does not match tournament.json.");
    }
  }
  return editionAwards;
}

function validateInputProvenance(inputProvenance) {
  assert(inputProvenance && typeof inputProvenance === "object" && !Array.isArray(inputProvenance), "Archive input provenance is required.");
  for (const [file, record] of Object.entries(inputProvenance)) {
    assert(typeof file === "string" && file, "Archive input provenance contains an invalid file name.");
    assert(typeof record?.present === "boolean", `Archive input provenance for ${file} needs a present flag.`);
    if (!record.present) continue;
    assert(Number.isInteger(record.bytes) && record.bytes >= 0, `Archive input provenance for ${file} needs a byte count.`);
    assert(/^[a-f0-9]{64}$/.test(record.sha256 || ""), `Archive input provenance for ${file} needs a SHA-256 checksum.`);
    assert(Number.isInteger(record.canonicalBytes) && record.canonicalBytes >= 0, `Archive input provenance for ${file} needs a canonical byte count.`);
    assert(/^[a-f0-9]{64}$/.test(record.canonicalSha256 || ""), `Archive input provenance for ${file} needs a canonical SHA-256 checksum.`);
  }
}

function validateSchema4WorkflowInputs(data) {
  for (const [file, dataKey] of SCHEMA_4_WORKFLOW_INPUTS) {
    const value = data[dataKey];
    assert(value && typeof value === "object" && !Array.isArray(value), `Archive schema ${ARCHIVE_SCHEMA_VERSION} requires ${file}.`);
    const record = data.inputProvenance[file];
    assert(record?.present === true, `Archive schema ${ARCHIVE_SCHEMA_VERSION} requires input provenance for ${file}.`);
    const canonicalContents = stringifyArchiveJson(value);
    assert(
      record.canonicalBytes === Buffer.byteLength(canonicalContents) && record.canonicalSha256 === sha256Text(canonicalContents),
      `Archive input ${file} does not match its canonical provenance.`
    );
  }
}

function getBestXiPlayerStats(playerName, teamId, fixtures, lineupsData) {
  const stats = { assists: 0, cleanSheets: 0, goals: 0, starts: 0 };
  for (const fixture of fixtures) {
    const side = fixture.homeTeamId === teamId ? "home" : fixture.awayTeamId === teamId ? "away" : null;
    if (!side) continue;

    const lineupPlayers = asArray(lineupsData?.lineups?.[fixture.id]?.[side]?.players);
    const started = lineupPlayers.some((player) => isPlayerNameMatch(player?.name, playerName));
    if (started) {
      stats.starts += 1;
      const opponentScore = side === "home" ? fixture.score.away : fixture.score.home;
      if (opponentScore === 0) stats.cleanSheets += 1;
    }

    for (const goal of [...asArray(fixture.goalsHome), ...asArray(fixture.goalsAway)]) {
      if (!goal?.ownGoal && isPlayerNameMatch(goal?.name, playerName)) stats.goals += 1;
      if (isPlayerNameMatch(goal?.assistName, playerName)) stats.assists += 1;
    }
  }
  return stats;
}

function validateBestXiSelection(bestXiData, { fixtures, final, lineupsData, playerProfilesData, teamIds, tournamentData }) {
  assert(bestXiData?.schemaVersion === 1, "Best XI editorial data must use schemaVersion 1.");
  assert(bestXiData.edition === 2026, "Best XI editorial data must identify edition 2026.");
  assert(Number.isFinite(Date.parse(bestXiData.updatedAt || "")), "Best XI editorial data needs a valid updatedAt timestamp.");
  const selection = bestXiData.selection;
  assert(selection?.status === "editorial" && selection.official === false, "Best XI must remain explicitly editorial and unofficial.");
  assert(selection.selectionType === "performance", "Best XI must preserve the reviewed performance-selection contract.");
  assert(selection.formation === "4-3-3", "Best XI must preserve the reviewed 4-3-3 formation.");
  assert(!Object.hasOwn(selection, "captainPlayerName"), "Best XI must not reintroduce the removed captain designation.");
  assert(typeof selection.methodology === "string" && selection.methodology.trim(), "Best XI needs a durable editorial methodology.");
  assert(BEST_XI_LOCALES.every((locale) => typeof selection.methodologyLocalized?.[locale] === "string" && selection.methodologyLocalized[locale].trim()), "Best XI methodology needs complete en/es/zh/ko copy.");

  const coach = selection.coach;
  assert(coach && typeof coach === "object" && !Array.isArray(coach), "Best XI needs its reviewed Best Coach record.");
  assert(typeof coach.name === "string" && coach.name.trim(), "Best XI coach needs a name.");
  assert(teamIds.has(coach.teamId), `Best XI coach ${coach.name} references unknown team ${coach.teamId || "(missing)"}.`);
  assert(/^https:\/\//.test(coach.imageUrl || ""), `Best XI coach ${coach.name} needs a durable HTTPS portrait.`);
  assert(/^https:\/\//.test(coach.sourceUrl || ""), `Best XI coach ${coach.name} needs an HTTPS profile source.`);
  assert(BEST_XI_LOCALES.every((locale) => typeof coach.reason?.[locale] === "string" && coach.reason[locale].trim()), `Best XI coach ${coach.name} needs complete en/es/zh/ko rationale copy.`);

  const sources = asArray(selection.sources);
  assert(sources.length >= 5, "Best XI needs its reviewed local and external source ledger.");
  const sourceIds = new Set();
  for (const source of sources) {
    assert(typeof source?.id === "string" && source.id && !sourceIds.has(source.id), "Best XI source ids must be present and unique.");
    sourceIds.add(source.id);
    assert(typeof source.label === "string" && source.label.trim(), `Best XI source ${source.id} needs a label.`);
    assert(source.url === "data/fixtures.json" || /^https:\/\//.test(source.url || ""), `Best XI source ${source.id} must use the archived fixture ledger or HTTPS.`);
    assert(Number.isFinite(Date.parse(source.checkedAt || "")), `Best XI source ${source.id} needs a valid checkedAt timestamp.`);
  }
  assert(sources.some((source) => source.url === "data/fixtures.json"), "Best XI provenance must include the archived tournament fixture ledger.");
  assert(sources.some((source) => /^https:\/\/www\.fifa\.com\//.test(source.url || "")), "Best XI provenance must include a FIFA source.");

  const slots = asArray(selection.slots);
  assert(slots.length === 11, `Best XI must contain 11 positional slots, found ${slots.length}.`);
  const slotIds = new Set();
  const playerNames = new Set();
  const playerProfiles = playerProfilesData?.profiles || {};
  const winnerTeamId = deriveWinner(final);
  let starterCount = 0;
  let displayedHonourableCount = 0;
  let researchHonourableCount = 0;
  const displayedPlayerNames = new Set();

  for (const slot of slots) {
    assert(typeof slot?.id === "string" && slot.id && !slotIds.has(slot.id), "Best XI slot ids must be present and unique.");
    slotIds.add(slot.id);
    assert(Number.isFinite(slot.x) && slot.x >= 0 && slot.x <= 100, `Best XI slot ${slot.id} has an invalid x coordinate.`);
    assert(Number.isFinite(slot.y) && slot.y >= 0 && slot.y <= 100, `Best XI slot ${slot.id} has an invalid y coordinate.`);

    const honourables = asArray(slot.honourables);
    assert(honourables.length >= 1, `Best XI slot ${slot.id} needs at least one researched honourable mention.`);
    const players = [
      ["starter", slot.starter, true],
      ...honourables.map((player, index) => ["honourable", player, index === 0 || player?.showInHonourableMentions === true])
    ];

    for (const [kind, player, displayed] of players) {
      assert(player && typeof player === "object" && !Array.isArray(player), `Best XI slot ${slot.id} is missing its ${kind} player.`);
      assert(typeof player.playerName === "string" && player.playerName.trim(), `Best XI slot ${slot.id} ${kind} needs a playerName.`);
      assert(!playerNames.has(player.playerName), `Best XI player ${player.playerName} appears more than once.`);
      playerNames.add(player.playerName);
      if (displayed) {
        assert(!displayedPlayerNames.has(player.playerName), `Displayed Best XI player ${player.playerName} appears more than once.`);
        displayedPlayerNames.add(player.playerName);
      }
      assert(teamIds.has(player.teamId), `Best XI player ${player.playerName} references unknown team ${player.teamId || "(missing)"}.`);
      assert(player.position === slot.starter.position, `Best XI slot ${slot.id} must swap players in the same position.`);
      if (Object.hasOwn(player, "showInHonourableMentions")) {
        assert(kind === "honourable" && typeof player.showInHonourableMentions === "boolean", `Best XI player ${player.playerName} has an invalid honourable-mentions visibility flag.`);
      }

      const profile = playerProfiles[player.playerName];
      assert(profile?.teamId === player.teamId, `Best XI player ${player.playerName} does not match the archived canonical profile/team.`);
      assert(/^https:\/\//.test(profile.imageUrl || ""), `Best XI player ${player.playerName} needs a durable HTTPS portrait in player-profiles.json.`);
      assert(typeof profile.club === "string" && profile.club.trim(), `Best XI player ${player.playerName} needs archived club metadata.`);
      assert(typeof profile.league === "string" && profile.league.trim(), `Best XI player ${player.playerName} needs archived league metadata.`);
      assert(typeof profile.position === "string" && profile.position.trim(), `Best XI player ${player.playerName} needs archived position metadata.`);
      assert(asArray(profile.skills).length > 0 && profile.skills.every((skill) => typeof skill === "string" && skill.trim()), `Best XI player ${player.playerName} needs archived skill metadata.`);
      assert(
        BEST_XI_LOCALES.every((locale) => {
          const reason = player.reason?.[locale];
          if (!displayed) {
            return typeof reason === "string" && reason.trim();
          }
          return Array.isArray(reason)
            && reason.length === 2
            && reason.every((paragraph) => typeof paragraph === "string" && paragraph.trim());
        }),
        displayed
          ? `Displayed Best XI player ${player.playerName} needs exactly two non-empty rationale paragraphs in en/es/zh/ko.`
          : `Best XI player ${player.playerName} needs complete en/es/zh/ko rationale copy.`
      );

      const calculatedStats = getBestXiPlayerStats(player.playerName, player.teamId, fixtures, lineupsData);
      const facts = asArray(player.facts);
      assert(facts.length > 0, `Best XI player ${player.playerName} needs at least one verified tournament fact.`);
      const factTypes = new Set();
      for (const fact of facts) {
        assert(BEST_XI_FACT_TYPES.has(fact?.type), `Best XI player ${player.playerName} has unsupported fact ${fact?.type || "(missing)"}.`);
        assert(!factTypes.has(fact.type), `Best XI player ${player.playerName} repeats fact ${fact.type}.`);
        factTypes.add(fact.type);
        if (["assists", "cleanSheets", "goals", "starts"].includes(fact.type)) {
          assert(fact.value === calculatedStats[fact.type], `Best XI ${fact.type} for ${player.playerName} must match archived fixtures and lineups (${calculatedStats[fact.type]}).`);
        } else if (fact.type === "champion") {
          assert(player.teamId === winnerTeamId, `Best XI champion fact for ${player.playerName} does not match the final winner.`);
        } else {
          const award = tournamentData?.awards?.[fact.type];
          assert(award?.status === "confirmed" && award.teamId === player.teamId && isPlayerNameMatch(award.playerName, player.playerName), `Best XI ${fact.type} fact for ${player.playerName} does not match tournament.json.`);
        }
      }
      if (kind === "starter") starterCount += 1;
      else {
        researchHonourableCount += 1;
        if (displayed) displayedHonourableCount += 1;
      }
    }
  }

  assert(starterCount === 11, `Best XI must contain 11 starters, found ${starterCount}.`);
  assert(displayedHonourableCount === 15, `Best XI must contain 15 displayed honourable mentions, found ${displayedHonourableCount}.`);
  assert(displayedPlayerNames.size === 26, `Best XI must expose 26 unique player cards, found ${displayedPlayerNames.size}.`);
  assert(researchHonourableCount === 23, `Best XI must preserve 23 researched honourable candidates, found ${researchHonourableCount}.`);
  assert(playerNames.size === 34, `Best XI archive must preserve 34 unique researched players, found ${playerNames.size}.`);
  return {
    bestXiStarterCount: starterCount,
    bestXiHonourableCount: displayedHonourableCount,
    bestXiPlayerCount: displayedPlayerNames.size,
    bestXiResearchHonourableCount: researchHonourableCount,
    bestXiResearchPlayerCount: playerNames.size,
    bestXiCoachCount: 1,
    bestXiLocaleCount: BEST_XI_LOCALES.length,
    bestXiSourceCount: sources.length
  };
}

function validateLifecycle(lifecycle, now, allowLateCorrection, manifest) {
  assert(lifecycle?.edition === 2026, "Archive finalizer only supports the 2026 edition.");
  const eligibleAt = new Date(lifecycle.archiveEligibleAfter || "");
  assert(!Number.isNaN(now.getTime()) && !Number.isNaN(eligibleAt.getTime()), "Archive timestamps are invalid.");
  assert(now >= eligibleAt, `2026 cannot be archived before ${eligibleAt.toISOString()}.`);
  assert(now.getTime() <= Date.now() + 5 * 60 * 1000, "Archive timestamp cannot be more than five minutes in the future.");

  if (allowLateCorrection) {
    assert(lifecycle.state === "archived", "--late-correction is only valid after the initial archive is committed.");
    assert(manifest.entries.length > 0, "A late correction requires an existing immutable archive manifest entry.");
    const previousArchivedAt = new Date(manifest.entries.at(-1).archivedAt);
    assert(now > previousArchivedAt, `A late correction must be newer than ${previousArchivedAt.toISOString()}.`);
  } else {
    assert(lifecycle.state === "live", "Edition is already closed; use --late-correction for an official correction.");
    assert(manifest.entries.length === 0, "Initial archive cannot proceed while a 2026 archive manifest already has entries.");
  }
}

function validateFixtures(fixturesData, teamIds) {
  const fixtures = asArray(fixturesData?.fixtures);
  assert(fixtures.length === 104, `Expected 104 current fixtures, found ${fixtures.length}.`);

  const fixtureIds = new Set();
  const matchNumbers = new Set();
  for (const fixture of fixtures) {
    assert(typeof fixture?.id === "string" && fixture.id, "Every fixture must have an id.");
    assert(!fixtureIds.has(fixture.id), `Duplicate fixture id: ${fixture.id}.`);
    fixtureIds.add(fixture.id);
    assert(Number.isInteger(fixture.matchNumber), `Fixture ${fixture.id} needs an integer matchNumber.`);
    assert(!matchNumbers.has(fixture.matchNumber), `Duplicate match number: ${fixture.matchNumber}.`);
    matchNumbers.add(fixture.matchNumber);
    assert(COMPLETED_STATUSES.has(fixture.status), `Fixture ${fixture.id} is not final.`);
    assert(isNonNegativeInteger(fixture.score?.home) && isNonNegativeInteger(fixture.score?.away), `Fixture ${fixture.id} needs final integer scores.`);
    assert(teamIds.has(fixture.homeTeamId) && teamIds.has(fixture.awayTeamId), `Fixture ${fixture.id} references an unknown team.`);
    assert(asArray(fixture.goalsHome).length === fixture.score.home, `Fixture ${fixture.id} home goal events do not match its score.`);
    assert(asArray(fixture.goalsAway).length === fixture.score.away, `Fixture ${fixture.id} away goal events do not match its score.`);
    assert(fixture.projection && typeof fixture.projection === "object", `Fixture ${fixture.id} is missing its preserved pre-match projection.`);

    const englishStory = asArray(fixture.resultStoryBullets);
    const chineseStory = asArray(fixture.resultStoryBulletsZh);
    assert(englishStory.length >= 1 && englishStory.length <= 3, `Fixture ${fixture.id} needs one to three English result bullets.`);
    assert(chineseStory.length === englishStory.length, `Fixture ${fixture.id} English and Chinese result stories must have matching coverage.`);
    assert([...englishStory, ...chineseStory].every((item) => typeof item === "string" && item.trim()), `Fixture ${fixture.id} has an empty result bullet.`);

    const hasHighlight = typeof fixture.highlightVideo?.url === "string" && fixture.highlightVideo.url;
    const reviewDisposition = fixture.highlightVideoReview?.status;
    assert(hasHighlight || EXPLICIT_HIGHLIGHT_DISPOSITIONS.has(reviewDisposition), `Fixture ${fixture.id} needs an official highlight or an explicit not-found disposition.`);
    if (hasHighlight) {
      assert(fixture.highlightVideo.platform === "youtube", `Fixture ${fixture.id} archive highlight must use YouTube.`);
      assert(fixture.highlightVideo.channelId === OFFICIAL_2026_HIGHLIGHT_CHANNEL_ID, `Fixture ${fixture.id} archive highlight must come from the approved official channel.`);
    } else {
      assert(fixture.highlightVideoReview?.channelId === OFFICIAL_2026_HIGHLIGHT_CHANNEL_ID, `Fixture ${fixture.id} highlight disposition must record the approved official channel.`);
      assert(typeof fixture.highlightVideoReview?.checkedAt === "string" && fixture.highlightVideoReview.checkedAt, `Fixture ${fixture.id} highlight disposition needs checkedAt.`);
    }
  }

  assert([...matchNumbers].sort((a, b) => a - b).every((number, index) => number === index + 1), "The 2026 fixture set must contain unique match numbers 1 through 104.");

  const final = fixtures.find((fixture) => fixture.matchNumber === 104);
  const thirdPlace = fixtures.find((fixture) => fixture.matchNumber === 103);
  assert(["bronze-final", "third-place"].includes(thirdPlace?.stage), "Match 103 must be the completed third-place match.");
  assert(final?.stage === "final", "Match 104 must be the World Cup final.");
  assert(final.homeTeamId !== final.awayTeamId, "The final must contain two different teams.");
  const penalties = final.scoreDetails?.penalties;
  const hasPenaltyWinner = isNonNegativeInteger(penalties?.home) && isNonNegativeInteger(penalties?.away) && penalties.home !== penalties.away;
  assert(final.winnerTeamId || final.score.home !== final.score.away || hasPenaltyWinner, "The final must have a decisive official winner.");
  assert(asArray(final.resultStoryBullets).length === 3 && asArray(final.resultStoryBulletsZh).length === 3, "The final needs exactly three English and Chinese result bullets.");
  assert(final.resultStoryResearch?.status === "researched", "The final result story must have researched source evidence.");
  return { fixtures, fixtureIds, final };
}

function validateLineups(lineupsData, expectedLineupsData, fixtures) {
  const lineups = lineupsData?.lineups || {};
  assert(Object.keys(lineups).length === 104, `Expected 104 official lineup records, found ${Object.keys(lineups).length}.`);
  for (const fixture of fixtures) {
    const lineup = lineups[fixture.id];
    assert(lineup, `Fixture ${fixture.id} is missing its official lineup record.`);
    assert(lineup.mode === "final", `Fixture ${fixture.id} lineup is not final.`);
    assert(lineup.teamSheetSource === "fifa-official", `Fixture ${fixture.id} lineup is not sourced from an official FIFA team sheet.`);
    assert(asArray(lineup.home?.players).length === 11 && asArray(lineup.away?.players).length === 11, `Fixture ${fixture.id} must preserve both official starting XIs.`);
  }
  assert(asArray(expectedLineupsData?.fixtures).length === 0, "Expected-lineups data must be empty after all official team sheets are final.");
}

function validatePredictionHistory(predictionHistory, fixtureIds) {
  const entries = asArray(predictionHistory?.fixtures);
  assert(entries.length > 0, "Pre-match lineup prediction history must be preserved before archiving.");
  const seen = new Set();
  for (const entry of entries) {
    assert(fixtureIds.has(entry?.fixtureId), `Prediction history references unknown fixture ${entry?.fixtureId || "(missing)"}.`);
    assert(!seen.has(entry.fixtureId), `Prediction history contains duplicate fixture ${entry.fixtureId}.`);
    seen.add(entry.fixtureId);
    assert(typeof entry.capturedAt === "string" && entry.capturedAt, `Prediction history ${entry.fixtureId} is missing capturedAt.`);
  }
  return entries.length;
}

function validateStandings(standingsData, teamIds) {
  const groups = standingsData?.groups;
  assert(groups && !Array.isArray(groups) && typeof groups === "object", "Standings groups must be an object.");
  const groupEntries = Object.entries(groups);
  assert(groupEntries.length === 12, `Expected 12 final groups, found ${groupEntries.length}.`);
  assert(groupEntries.map(([groupId]) => groupId).sort().join("") === "ABCDEFGHIJKL", "Final standings must contain groups A through L.");
  const seenTeams = new Set();
  for (const [groupId, rows] of groupEntries) {
    assert(asArray(rows).length === 4, `Group ${groupId} must have four final rows.`);
    for (const row of rows) {
      assert(teamIds.has(row?.teamId), `Group ${groupId} references unknown team ${row?.teamId || "(missing)"}.`);
      assert(!seenTeams.has(row.teamId), `Team ${row.teamId} appears in more than one standings group.`);
      seenTeams.add(row.teamId);
      assert(row.played === 3, `Team ${row.teamId} must have three completed group matches.`);
      assert(row.wins + row.draws + row.losses === row.played, `Team ${row.teamId} standings record does not add up.`);
      assert(isNonNegativeInteger(row.gf) && isNonNegativeInteger(row.ga), `Team ${row.teamId} standings goals must be non-negative integers.`);
    }
  }
  assert(seenTeams.size === 48, `Expected 48 unique teams in final standings, found ${seenTeams.size}.`);
}

function validateHistoryBoundary(historyData) {
  const duplicated = asArray(historyData?.fixtures).filter((fixture) => fixture?.tournamentYear === 2026);
  assert(duplicated.length === 0, "history.json already contains 2026 fixtures; remove the duplicate source before finalizing the active edition.");
}

function validateLocaleCoverage(localeCurrentContent, fixtures) {
  const locales = ["es", "ko"];
  for (const locale of locales) {
    const pack = localeCurrentContent?.[locale];
    assert(pack?.language === locale && pack?.scope === "current", `The ${locale} current-content locale pack is missing or invalid.`);
    const translations = pack.translations;
    assert(translations && typeof translations === "object", `The ${locale} current-content locale pack has no translations.`);
    for (const fixture of fixtures) {
      for (const bullet of asArray(fixture.resultStoryBullets)) {
        assert(typeof translations[bullet] === "string" && translations[bullet].trim(), `Fixture ${fixture.id} result bullet is missing curated ${locale} coverage.`);
      }
    }
  }
}

function validateAwards(tournamentData, fixtures, teamIds) {
  const awards = tournamentData?.awards;
  assert(awards && typeof awards === "object" && !Array.isArray(awards), "The complete official award set must be loaded before the 2026 archive can close.");
  const sourcesById = new Map(asArray(tournamentData.sources).map((source) => [source?.id, source]));

  for (const [awardId, definition] of Object.entries(REQUIRED_AWARDS)) {
    const award = awards[awardId];
    assert(award?.status === "confirmed", `Official ${definition.label} data must be confirmed before the 2026 archive can close.`);
    assert(typeof award[definition.recipientField] === "string" && award[definition.recipientField].trim(), `Confirmed ${definition.label} data needs ${definition.recipientField}.`);
    assert(teamIds.has(award.teamId), `Confirmed ${definition.label} data references unknown team ${award.teamId || "(missing)"}.`);
    assert(typeof award.sourceId === "string" && award.sourceId, `Confirmed ${definition.label} data needs sourceId provenance.`);
    assert(!Number.isNaN(Date.parse(award.checkedAt || "")), `Confirmed ${definition.label} data needs a valid checkedAt timestamp.`);
    const source = sourcesById.get(award.sourceId);
    assert(source, `${definition.label} sourceId ${award.sourceId} is not present in tournament sources.`);
    assert(ARCHIVE_AWARD_SOURCE_TYPES.has(source.type), `${definition.label} sourceId ${award.sourceId} must reference an official or reviewed cross-check source.`);
    assert(/^https:\/\//.test(source.url || ""), `${definition.label} sourceId ${award.sourceId} needs an HTTPS URL.`);
    assert(!Number.isNaN(Date.parse(source.checkedAt || "")), `${definition.label} sourceId ${award.sourceId} needs a valid checkedAt timestamp.`);
  }

  const goldenBoot = awards.goldenBoot;
  assert(isNonNegativeInteger(goldenBoot.goals) && goldenBoot.goals > 0, "Confirmed Golden Boot data needs a positive integer goal total.");
  assert(isNonNegativeInteger(goldenBoot.assists), "Confirmed Golden Boot data needs a non-negative integer assist total.");
  let loadedGoals = 0;
  let loadedAssists = 0;
  for (const fixture of fixtures) {
    for (const goal of [...asArray(fixture.goalsHome), ...asArray(fixture.goalsAway)]) {
      if (goal?.name === goldenBoot.playerName) loadedGoals += 1;
      if (goal?.assistName === goldenBoot.playerName) loadedAssists += 1;
    }
  }
  assert(loadedGoals === goldenBoot.goals, `Golden Boot total for ${goldenBoot.playerName} is ${goldenBoot.goals}, but loaded goal events contain ${loadedGoals}.`);
  assert(loadedAssists === goldenBoot.assists, `Golden Boot assist total for ${goldenBoot.playerName} is ${goldenBoot.assists}, but loaded goal events contain ${loadedAssists}.`);
  return awards;
}

function validateOfficialEventCorrections(correctionsData, fixtures, lineupsData, tournamentData) {
  assert(correctionsData?.schemaVersion === 1, "Official event corrections must use schemaVersion 1.");
  assert(correctionsData.fixtures && typeof correctionsData.fixtures === "object" && !Array.isArray(correctionsData.fixtures), "Official event corrections fixtures must be an object.");
  const fixturesById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  const sourcesById = new Map(asArray(tournamentData?.sources).map((source) => [source?.id, source]));
  let eventCount = 0;

  const hasCard = (events, expected) => asArray(events?.cards).some((card) =>
    isPlayerNameMatch(card?.playerName, expected?.playerName) &&
    card?.type === expected?.type &&
    String(card?.minute ?? "") === String(expected?.minute ?? "")
  );
  const hasSubstitution = (events, expected) => asArray(events?.substitutions).some((substitution) =>
    isPlayerNameMatch(substitution?.offName, expected?.offName) &&
    isPlayerNameMatch(substitution?.onName, expected?.onName) &&
    String(substitution?.minute ?? "") === String(expected?.minute ?? "")
  );

  for (const [fixtureId, correction] of Object.entries(correctionsData.fixtures)) {
    const fixture = fixturesById.get(fixtureId);
    const lineup = lineupsData?.lineups?.[fixtureId];
    assert(fixture, `Official event correction references unknown fixture ${fixtureId}.`);
    assert(lineup, `Official event correction ${fixtureId} is missing its final lineup record.`);
    assert(!Number.isNaN(Date.parse(correction?.checkedAt || "")), `Official event correction ${fixtureId} needs a valid checkedAt timestamp.`);
    assert(asArray(correction?.sourceIds).length > 0, `Official event correction ${fixtureId} needs source provenance.`);
    for (const sourceId of correction.sourceIds) {
      const source = sourcesById.get(sourceId);
      assert(source && /^https:\/\//.test(source.url || ""), `Official event correction ${fixtureId} source ${sourceId} must resolve to an HTTPS tournament source.`);
      assert(asArray(fixture.matchEvents?.sourceIds).includes(sourceId), `Fixture ${fixtureId} must preserve correction source ${sourceId}.`);
      assert(asArray(lineup.sourceIds).includes(sourceId), `Lineup ${fixtureId} must preserve correction source ${sourceId}.`);
    }
    for (const side of ["home", "away"]) {
      for (const card of asArray(correction?.[side]?.cards)) {
        eventCount += 1;
        assert(hasCard(fixture.matchEvents?.[side], card), `Fixture ${fixtureId} must preserve its reviewed ${side} card correction.`);
        assert(hasCard(lineup?.[side]?.events, card), `Lineup ${fixtureId} must preserve its reviewed ${side} card correction.`);
      }
      for (const substitution of asArray(correction?.[side]?.substitutions)) {
        eventCount += 1;
        assert(hasSubstitution(fixture.matchEvents?.[side], substitution), `Fixture ${fixtureId} must preserve its reviewed ${side} substitution correction.`);
        assert(hasSubstitution(lineup?.[side]?.events, substitution), `Lineup ${fixtureId} must preserve its reviewed ${side} substitution correction.`);
      }
    }
  }

  return { fixtureCount: Object.keys(correctionsData.fixtures).length, eventCount };
}

function deriveWinner(final) {
  const penalties = final.scoreDetails?.penalties;
  let inferredWinnerTeamId;
  if (isNonNegativeInteger(penalties?.home) && isNonNegativeInteger(penalties?.away) && penalties.home !== penalties.away) {
    inferredWinnerTeamId = penalties.home > penalties.away ? final.homeTeamId : final.awayTeamId;
  } else {
    inferredWinnerTeamId = final.score.home > final.score.away ? final.homeTeamId : final.awayTeamId;
  }
  if (final.winnerTeamId) {
    assert([final.homeTeamId, final.awayTeamId].includes(final.winnerTeamId), "The final winnerTeamId must be one of the finalists.");
    assert(final.winnerTeamId === inferredWinnerTeamId, "The final winnerTeamId conflicts with the official score.");
  }
  return final.winnerTeamId || inferredWinnerTeamId;
}

export function build2026ArchivePlan(data, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const allowLateCorrection = options.allowLateCorrection === true;
  const manifest = validate2026ArchiveManifest(data.manifestData);
  validateLifecycle(data.lifecycle, now, allowLateCorrection, manifest);

  const teams = asArray(data.teamsData?.teams);
  assert(teams.length === 48, `Expected 48 tournament teams, found ${teams.length}.`);
  const teamIds = new Set(teams.map((team) => team?.id));
  assert(teamIds.size === 48 && !teamIds.has(undefined), "Tournament team ids must be present and unique.");

  const { fixtures, fixtureIds, final } = validateFixtures(data.fixturesData, teamIds);
  validateLineups(data.lineupsData, data.expectedLineupsData, fixtures);
  const predictionHistoryCount = validatePredictionHistory(data.predictionHistory, fixtureIds);
  validateStandings(data.standingsData, teamIds);
  validateHistoryBoundary(data.historyData);
  validateLocaleCoverage(data.localeCurrentContent, fixtures);
  const awards = validateAwards(data.tournamentData, fixtures, teamIds);
  const profileSummary = validateProfiles(data.playerProfilesData, data.coachProfilesData, teamIds);
  const renderedKnowledgeSummary = validateRenderedEditionKnowledge(
    data.playerAvailabilityData,
    data.chatbotH2hData,
    data.teamStyleProfilesData,
    teamIds
  );
  const canonicalAwards = validateCanonicalAwardsRecord(data.worldCupAwardsData, data.tournamentData, teams);
  validateInputProvenance(data.inputProvenance);
  validateSurfaceProvenance(data.surfaceProvenance);
  validateSchema4WorkflowInputs(data);
  const bestXiSummary = validateBestXiSelection(data.highlightsBestXiData, {
    fixtures,
    final,
    lineupsData: data.lineupsData,
    playerProfilesData: data.playerProfilesData,
    teamIds,
    tournamentData: data.tournamentData
  });
  const bestXiProvenance = data.inputProvenance["highlights-best-xi.json"];
  assert(bestXiProvenance?.present === true, "Archive schema 4 requires input provenance for highlights-best-xi.json.");
  const canonicalBestXiContents = stringifyArchiveJson(data.highlightsBestXiData);
  assert(
    bestXiProvenance.canonicalBytes === Buffer.byteLength(canonicalBestXiContents) && bestXiProvenance.canonicalSha256 === sha256Text(canonicalBestXiContents),
    "Archive input highlights-best-xi.json does not match its canonical provenance."
  );
  const correctionSummary = validateOfficialEventCorrections(
    data.officialEventCorrectionsData,
    fixtures,
    data.lineupsData,
    data.tournamentData
  );

  const archivedAt = now.toISOString();
  const archiveVersion = `2026-final-${timestampSlug(now)}`;
  const archiveFileName = `world-cup-${archiveVersion}.json`;
  const archiveRelativePath = `data/archives/${archiveFileName}`;
  assert(!manifest.entries.some((entry) => entry.archiveVersion === archiveVersion || entry.file === archiveRelativePath), `Archive version ${archiveVersion} already exists; use a new timestamp.`);

  const previousEntry = manifest.entries.at(-1) || null;
  const winnerTeamId = deriveWinner(final);
  const qualitySummary = {
    fixtureCount: fixtures.length,
    teamCount: teams.length,
    completedFixtureCount: fixtures.length,
    officialLineupCount: Object.keys(data.lineupsData.lineups).length,
    resultStoryCount: fixtures.length,
    highlightCount: fixtures.filter((fixture) => fixture.highlightVideo?.url).length,
    explicitHighlightNotFoundCount: fixtures.filter((fixture) => fixture.highlightVideoReview?.status === "not-found").length,
    predictionHistoryCount,
    standingsGroupCount: Object.keys(data.standingsData.groups).length,
    curatedLocaleCount: Object.keys(data.localeCurrentContent).length,
    championTeamId: winnerTeamId,
    awardCount: Object.keys(REQUIRED_AWARDS).length,
    playerProfileCount: profileSummary.playerProfileCount,
    coachProfileCount: profileSummary.coachProfileCount,
    canonicalAwardCount: Object.keys(REQUIRED_AWARDS).filter((awardId) => canonicalAwards[awardId]).length,
    availabilityTeamCount: renderedKnowledgeSummary.availabilityTeamCount,
    chatbotH2hPairCount: renderedKnowledgeSummary.chatbotH2hPairCount,
    teamStyleProfileCount: renderedKnowledgeSummary.teamStyleProfileCount,
    reviewedEventCorrectionFixtureCount: correctionSummary.fixtureCount,
    reviewedEventCorrectionCount: correctionSummary.eventCount,
    ...bestXiSummary,
    awards: Object.fromEntries(Object.keys(REQUIRED_AWARDS).map((awardId) => [awardId, awards[awardId]])),
    goldenBoot: {
      playerName: awards.goldenBoot.playerName,
      goals: awards.goldenBoot.goals,
      assists: awards.goldenBoot.assists,
      sourceId: awards.goldenBoot.sourceId
    }
  };

  const frozenArchive = {
    schemaVersion: ARCHIVE_SCHEMA_VERSION,
    edition: 2026,
    archiveVersion,
    archivedAt,
    lateCorrection: allowLateCorrection,
    ...(previousEntry ? { supersedes: previousEntry.archiveVersion } : {}),
    qualitySummary,
    sourceIds: asArray(data.fixturesData.sourceIds),
    fixtures: data.fixturesData,
    teams: data.teamsData,
    standings: data.standingsData,
    lineups: data.lineupsData,
    expectedLineups: data.expectedLineupsData,
    preMatchPredictionHistory: data.predictionHistory,
    lineupLayoutOverrides: data.lineupLayoutOverridesData,
    fifaTacticalLineupIndex: data.fifaTacticalLineupIndexData,
    expectedLineupsAudit: data.expectedLineupsAuditData,
    lineupPredictionRevisions: data.lineupPredictionRevisionsData,
    officialEventCorrections: data.officialEventCorrectionsData,
    highlightsBestXi: data.highlightsBestXiData,
    playerProfiles: data.playerProfilesData,
    coachProfiles: data.coachProfilesData,
    playerAvailability: data.playerAvailabilityData,
    chatbotH2h: data.chatbotH2hData,
    teamStyleProfiles: data.teamStyleProfilesData,
    worldCupAwards: data.worldCupAwardsData,
    localeCurrentContent: data.localeCurrentContent,
    tournament: data.tournamentData,
    lifecycleBeforeArchive: data.lifecycle,
    inputProvenance: data.inputProvenance,
    surfaceProvenance: data.surfaceProvenance
  };
  const archiveContents = stringifyArchiveJson(frozenArchive);
  const archiveSha256 = sha256Text(archiveContents);

  const manifestEntry = {
    archiveVersion,
    archivedAt,
    file: archiveRelativePath,
    sha256: archiveSha256,
    lateCorrection: allowLateCorrection,
    ...(previousEntry ? { supersedes: previousEntry.archiveVersion } : {})
  };
  const nextManifest = {
    schemaVersion: 1,
    edition: 2026,
    latestArchiveVersion: archiveVersion,
    updatedAt: archivedAt,
    entries: [...manifest.entries, manifestEntry]
  };
  const nextTournament = {
    ...data.tournamentData,
    sources: [
      ...asArray(data.tournamentData.sources).filter((source) => source.id !== ARCHIVE_SOURCE_ID),
      {
        id: ARCHIVE_SOURCE_ID,
        label: "World Cup 2026 final official snapshot",
        url: archiveRelativePath,
        type: "official-archive",
        checkedAt: archivedAt,
        note: `Immutable 104-match archive ${archiveVersion}; SHA-256 ${archiveSha256}.`
      }
    ]
  };
  const nextLifecycle = {
    ...data.lifecycle,
    state: "archived",
    archivedAt: data.lifecycle.archivedAt || archivedAt,
    archiveVersion,
    archiveFile: archiveRelativePath,
    archiveSha256,
    archiveManifest: `data/archives/${ARCHIVE_MANIFEST_NAME}`,
    ...(allowLateCorrection ? { lastCorrectedAt: archivedAt } : {})
  };

  return {
    archiveSchemaVersion: ARCHIVE_SCHEMA_VERSION,
    archiveContents,
    archivedAt,
    archiveFileName,
    archiveRelativePath,
    archiveSha256,
    archiveVersion,
    lateCorrection: allowLateCorrection,
    qualitySummary,
    nextLifecycle,
    nextManifest,
    nextTournament,
    surfaceProvenance: data.surfaceProvenance
  };
}

export function build2026ArchiveReviewPlan(plan, inputProvenance) {
  validateInputProvenance(inputProvenance);
  return {
    schemaVersion: ARCHIVE_PLAN_SCHEMA_VERSION,
    edition: 2026,
    archiveSchemaVersion: plan.archiveSchemaVersion,
    archiveAt: plan.archivedAt,
    archiveVersion: plan.archiveVersion,
    archiveFile: plan.archiveRelativePath,
    archiveSha256: plan.archiveSha256,
    lateCorrection: plan.lateCorrection,
    qualitySummary: plan.qualitySummary,
    inputProvenance,
    surfaceProvenance: plan.surfaceProvenance,
    outputSha256: {
      archive: plan.archiveSha256,
      manifest: sha256Text(stringifyArchiveJson(plan.nextManifest)),
      tournament: sha256Text(stringifyArchiveJson(plan.nextTournament)),
      lifecycle: sha256Text(stringifyArchiveJson(plan.nextLifecycle))
    }
  };
}

export function assert2026ArchiveReviewPlanMatches(reviewPlan, plan, inputProvenance) {
  const expected = build2026ArchiveReviewPlan(plan, inputProvenance);
  assert(reviewPlan?.schemaVersion === ARCHIVE_PLAN_SCHEMA_VERSION, `Archive review plan must use schemaVersion ${ARCHIVE_PLAN_SCHEMA_VERSION}.`);
  assert(JSON.stringify(reviewPlan) === JSON.stringify(expected), "Archive review plan does not match the current inputs or planned outputs; create and review a new plan.");
}
