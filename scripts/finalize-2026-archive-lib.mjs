import { createHash } from "node:crypto";
import { isPlayerNameMatch } from "./player-name-matching.mjs";

export const ARCHIVE_MANIFEST_NAME = "world-cup-2026-manifest.json";
export const ARCHIVE_SOURCE_ID = "world-cup-2026-final-archive";

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

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

export function stringifyArchiveJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function validateManifest(manifestData) {
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
    versions.add(entry.archiveVersion);
    files.add(entry.file);
    if (index === 0) {
      assert(entry.lateCorrection === false && !entry.supersedes, "The first archive manifest entry must be the initial snapshot.");
    } else {
      assert(entry.lateCorrection === true, `Archive ${entry.archiveVersion} must be marked as a late correction.`);
      assert(entry.supersedes === manifestData.entries[index - 1].archiveVersion, `Archive ${entry.archiveVersion} must supersede the immediately preceding version.`);
    }
  }
  const latestEntry = manifestData.entries.at(-1);
  assert(manifestData.latestArchiveVersion === (latestEntry?.archiveVersion || null), "Archive manifest latestArchiveVersion does not match its final entry.");
  return manifestData;
}

function validateLifecycle(lifecycle, now, allowLateCorrection, manifest) {
  assert(lifecycle?.edition === 2026, "Archive finalizer only supports the 2026 edition.");
  const eligibleAt = new Date(lifecycle.archiveEligibleAfter || "");
  assert(!Number.isNaN(now.getTime()) && !Number.isNaN(eligibleAt.getTime()), "Archive timestamps are invalid.");
  assert(now >= eligibleAt, `2026 cannot be archived before ${eligibleAt.toISOString()}.`);

  if (allowLateCorrection) {
    assert(lifecycle.state === "archived", "--late-correction is only valid after the initial archive is committed.");
    assert(manifest.entries.length > 0, "A late correction requires an existing immutable archive manifest entry.");
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
  const manifest = validateManifest(data.manifestData);
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
    reviewedEventCorrectionFixtureCount: correctionSummary.fixtureCount,
    reviewedEventCorrectionCount: correctionSummary.eventCount,
    awards: Object.fromEntries(Object.keys(REQUIRED_AWARDS).map((awardId) => [awardId, awards[awardId]])),
    goldenBoot: {
      playerName: awards.goldenBoot.playerName,
      goals: awards.goldenBoot.goals,
      assists: awards.goldenBoot.assists,
      sourceId: awards.goldenBoot.sourceId
    }
  };

  const frozenArchive = {
    schemaVersion: 2,
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
    officialEventCorrections: data.officialEventCorrectionsData,
    localeCurrentContent: data.localeCurrentContent,
    tournament: data.tournamentData,
    lifecycleBeforeArchive: data.lifecycle
  };
  const archiveContents = stringifyArchiveJson(frozenArchive);
  const archiveSha256 = sha256(archiveContents);

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
    archiveContents,
    archiveFileName,
    archiveRelativePath,
    archiveSha256,
    archiveVersion,
    qualitySummary,
    nextLifecycle,
    nextManifest,
    nextTournament
  };
}
