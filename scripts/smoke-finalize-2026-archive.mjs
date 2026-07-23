#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ARCHIVE_MANIFEST_NAME,
  ARCHIVE_SOURCE_ID,
  ARCHIVE_SURFACE_INPUT_FILES,
  assert2026ArchiveReviewPlanMatches,
  build2026ArchivePlan,
  build2026ArchiveReviewPlan,
  buildArchiveInputProvenance,
  buildArchiveSurfaceProvenance,
  stringifyArchiveJson
} from "./finalize-2026-archive-lib.mjs";
import { commit2026Archive } from "./finalize-2026-archive-transaction.mjs";
import { verify2026Archive } from "./verify-2026-archive-lib.mjs";

const TEST_SURFACE_SNAPSHOTS = new Map(
  ARCHIVE_SURFACE_INPUT_FILES.map((file) => [file, `test release surface: ${file}\n`])
);

async function writeTestSurface(root) {
  for (const [file, contents] of TEST_SURFACE_SNAPSHOTS) {
    const target = path.join(root, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
}

function refreshInputProvenance(data) {
  const snapshots = new Map([
    ["fixtures.json", stringifyArchiveJson(data.fixturesData)],
    ["teams.json", stringifyArchiveJson(data.teamsData)],
    ["standings.json", stringifyArchiveJson(data.standingsData)],
    ["tournament.json", stringifyArchiveJson(data.tournamentData)],
    ["history.json", stringifyArchiveJson(data.historyData)],
    ["edition-lifecycle.json", stringifyArchiveJson(data.lifecycle)],
    ["lineups.json", stringifyArchiveJson(data.lineupsData)],
    ["expected-lineups.json", stringifyArchiveJson(data.expectedLineupsData)],
    ["lineup-prediction-history.json", stringifyArchiveJson(data.predictionHistory)],
    ["lineup-layout-overrides.json", stringifyArchiveJson(data.lineupLayoutOverridesData)],
    ["fifa-tactical-lineup-index.json", stringifyArchiveJson(data.fifaTacticalLineupIndexData)],
    ["expected-lineups-audit.json", stringifyArchiveJson(data.expectedLineupsAuditData)],
    ["lineup-prediction-revisions.json", stringifyArchiveJson(data.lineupPredictionRevisionsData)],
    ["official-event-corrections.json", stringifyArchiveJson(data.officialEventCorrectionsData)],
    ["highlights-best-xi.json", stringifyArchiveJson(data.highlightsBestXiData)],
    [path.join("locales", "es", "current-content.json"), stringifyArchiveJson(data.localeCurrentContent.es)],
    [path.join("locales", "ko", "current-content.json"), stringifyArchiveJson(data.localeCurrentContent.ko)],
    ["player-profiles.json", stringifyArchiveJson(data.playerProfilesData)],
    ["coach-profiles.json", stringifyArchiveJson(data.coachProfilesData)],
    ["player-availability.json", stringifyArchiveJson(data.playerAvailabilityData)],
    ["chatbot-h2h.json", stringifyArchiveJson(data.chatbotH2hData)],
    ["team-style-profiles.json", stringifyArchiveJson(data.teamStyleProfilesData)],
    ["world-cup-awards.json", stringifyArchiveJson(data.worldCupAwardsData)],
    [path.join("archives", ARCHIVE_MANIFEST_NAME), data.manifestData ? stringifyArchiveJson(data.manifestData) : null]
  ]);
  data.inputProvenance = buildArchiveInputProvenance(snapshots);
  data.surfaceProvenance = buildArchiveSurfaceProvenance(TEST_SURFACE_SNAPSHOTS);
  return data;
}

function makeData() {
  const teams = Array.from({ length: 48 }, (_, index) => ({
    id: `T${String(index + 1).padStart(2, "0")}`,
    name: `Team ${index + 1}`
  }));
  const fixtures = Array.from({ length: 104 }, (_, index) => {
    const matchNumber = index + 1;
    const isFinal = matchNumber === 104;
    return {
      id: `match-${matchNumber}`,
      matchNumber,
      stage: isFinal ? "final" : matchNumber === 103 ? "bronze-final" : matchNumber <= 72 ? "group" : "knockout",
      kickoffUtc: `2026-07-${String((index % 19) + 1).padStart(2, "0")}T19:00:00Z`,
      homeTeamId: teams[index % teams.length].id,
      awayTeamId: teams[(index + 1) % teams.length].id,
      status: "FT",
      score: isFinal ? { home: 1, away: 0 } : { home: 0, away: 0 },
      goalsHome: isFinal ? [{ name: "Final scorer", minute: 90 }] : [],
      goalsAway: [],
      projection: { homeWin: 40, draw: 30, awayWin: 30 },
      resultStoryBullets: isFinal ? ["Final point one.", "Final point two.", "Final point three."] : ["Match complete."],
      resultStoryBulletsZh: isFinal ? ["决赛要点一。", "决赛要点二。", "决赛要点三。"] : ["比赛结束。"],
      ...(isFinal ? { resultStoryResearch: { status: "researched" } } : {}),
      highlightVideo: {
        platform: "youtube",
        url: `https://example.com/highlights/${matchNumber}`,
        channelId: "UCwNqHDsnBCKT-olwJwIFyfg"
      }
    };
  });
  const lineups = Object.fromEntries(fixtures.map((fixture) => [fixture.id, {
    mode: "final",
    teamSheetSource: "fifa-official",
    home: { players: Array.from({ length: 11 }, (_, index) => ({ name: `Home ${index + 1}` })) },
    away: { players: Array.from({ length: 11 }, (_, index) => ({ name: `Away ${index + 1}` })) }
  }]));
  const groups = Object.fromEntries(Array.from({ length: 12 }, (_, groupIndex) => [
    String.fromCharCode(65 + groupIndex),
    teams.slice(groupIndex * 4, groupIndex * 4 + 4).map((team) => ({
      teamId: team.id,
      played: 3,
      wins: 1,
      draws: 1,
      losses: 1,
      gf: 3,
      ga: 3
    }))
  ]));

  return refreshInputProvenance({
    fixturesData: { updatedAt: "2026-07-20T07:00:00.000Z", sourceIds: ["fifa-results"], fixtures },
    teamsData: { updatedAt: "2026-07-20T07:00:00.000Z", teams },
    standingsData: { updatedAt: "2026-07-20T07:00:00.000Z", groups },
    tournamentData: {
      updatedAt: "2026-07-20T07:00:00.000Z",
      awards: {
        goldenBall: {
          status: "confirmed",
          playerName: "Best Player",
          teamId: "T01",
          sourceId: "official-awards",
          checkedAt: "2026-07-20T06:30:00.000Z"
        },
        goldenBoot: {
          status: "confirmed",
          playerName: "Final scorer",
          teamId: "T08",
          goals: 1,
          assists: 0,
          sourceId: "official-awards",
          checkedAt: "2026-07-20T06:30:00.000Z"
        },
        goldenGlove: {
          status: "confirmed",
          playerName: "Best Goalkeeper",
          teamId: "T01",
          sourceId: "official-awards",
          checkedAt: "2026-07-20T06:30:00.000Z"
        },
        youngPlayer: {
          status: "confirmed",
          playerName: "Best Young Player",
          teamId: "T01",
          sourceId: "official-awards",
          checkedAt: "2026-07-20T06:30:00.000Z"
        },
        fairPlay: {
          status: "confirmed",
          teamName: "Team 2",
          teamId: "T02",
          sourceId: "official-awards",
          checkedAt: "2026-07-20T06:30:00.000Z"
        }
      },
      sources: [{ id: "official-awards", type: "official", url: "https://example.com/award", checkedAt: "2026-07-20T06:30:00.000Z" }]
    },
    historyData: {
      updatedAt: "2026-06-01T00:00:00.000Z",
      tournaments: [{ year: 2022 }],
      fixtures: [{ id: "wc-2022-final", tournamentYear: 2022 }]
    },
    lifecycle: {
      edition: 2026,
      state: "live",
      archiveEligibleAfter: "2026-07-20T07:00:00.000Z",
      archivedAt: null,
      archiveVersion: null
    },
    lineupsData: { updatedAt: "2026-07-20T07:00:00.000Z", lineups },
    expectedLineupsData: { schemaVersion: 1, fixtures: [] },
    predictionHistory: {
      schemaVersion: "1.1",
      fixtures: [{ fixtureId: "match-103", capturedAt: "2026-07-17T17:00:00.000Z" }]
    },
    lineupLayoutOverridesData: {
      updatedAt: "2026-07-20T07:00:00.000Z",
      sourceIds: ["archive-smoke-layout-review"],
      fixtures: {}
    },
    fifaTacticalLineupIndexData: {
      schemaVersion: "1.0",
      competitionEditionId: "281",
      updatedAt: "2026-07-20T07:00:00.000Z",
      registrationsByMatchNumber: {},
      documents: []
    },
    expectedLineupsAuditData: {
      schemaVersion: "1",
      generatedAt: "2026-07-20T07:00:00.000Z",
      revisionId: "archive-smoke-final",
      fixtures: []
    },
    lineupPredictionRevisionsData: {
      schemaVersion: "2",
      updatedAt: "2026-07-20T07:00:00.000Z",
      revisions: []
    },
    officialEventCorrectionsData: {
      schemaVersion: 1,
      fixtures: {}
    },
    highlightsBestXiData: {
      schemaVersion: 1,
      edition: 2026,
      updatedAt: "2026-07-20T07:00:00.000Z",
      selection: {
        status: "editorial",
        official: false,
        formation: "4-3-3",
        selectionType: "performance",
        methodology: "Reviewed editorial selection based on archived tournament evidence.",
        methodologyLocalized: {
          en: "English methodology.",
          es: "Metodologia en espanol.",
          zh: "中文方法。",
          ko: "한국어 방법."
        },
        coach: {
          name: "Coach T01",
          teamId: "T01",
          imageUrl: "https://example.com/coaches/T01.jpg",
          sourceUrl: "https://example.com/coaches/T01",
          reason: { en: "English reason.", es: "Motivo en espanol.", zh: "中文理由。", ko: "한국어 이유。" }
        },
        sources: [
          { id: "fixtures", label: "Tournament data", url: "data/fixtures.json", checkedAt: "2026-07-20T07:00:00.000Z" },
          { id: "fifa-awards", label: "FIFA awards", url: "https://www.fifa.com/awards", checkedAt: "2026-07-20T07:00:00.000Z" },
          { id: "fifa-rankings", label: "FIFA rankings", url: "https://www.fifa.com/rankings", checkedAt: "2026-07-20T07:00:00.000Z" },
          { id: "news", label: "News report", url: "https://example.com/news", checkedAt: "2026-07-20T07:00:00.000Z" },
          { id: "editorial-xi", label: "Editorial XI", url: "https://example.com/xi", checkedAt: "2026-07-20T07:00:00.000Z" }
        ],
        slots: Array.from({ length: 11 }, (_, index) => {
          const position = ["GK", "RB", "CB", "CB", "LB", "DM", "RCM", "LCM", "RW", "ST", "LW"][index];
          const makePlayer = (teamNumber, displayed = false) => ({
            playerName: `Player T${String(teamNumber).padStart(2, "0")}`,
            teamId: `T${String(teamNumber).padStart(2, "0")}`,
            position,
            facts: [{ type: "starts", value: 0 }],
            reason: displayed
              ? {
                  en: ["English evidence.", "English footballing rationale."],
                  es: ["Evidencia en espanol.", "Razon futbolistica en espanol."],
                  zh: ["中文证据。", "中文足球理由。"],
                  ko: ["한국어 근거.", "한국어 축구 이유."]
                }
              : { en: "English reason.", es: "Motivo en espanol.", zh: "中文理由。", ko: "한국어 이유." }
          });
          const honourables = [
            makePlayer(index + 12, true),
            {
              ...makePlayer(index + 23, index < 4),
              ...(index < 4 ? { showInHonourableMentions: true } : {})
            }
          ];
          if (index === 0) honourables.push(makePlayer(34));
          return {
            id: `slot-${index + 1}`,
            x: 10 + index * 8,
            y: 10 + index * 7,
            starter: makePlayer(index + 1, true),
            honourables
          };
        })
      }
    },
    playerProfilesData: {
      updatedAt: "2026-07-20T07:00:00.000Z",
      profiles: Object.fromEntries(teams.map((team) => [`Player ${team.id}`, {
        name: `Player ${team.id}`,
        teamId: team.id,
        imageUrl: `https://example.com/players/${team.id}.jpg`,
        sourceUrl: `https://example.com/players/${team.id}`,
        club: `Club ${team.id}`,
        league: "Test League",
        position: "Test position",
        skills: ["Test skill"]
      }]))
    },
    coachProfilesData: {
      updatedAt: "2026-07-20T07:00:00.000Z",
      profiles: Object.fromEntries(teams.map((team) => [`Coach ${team.id}`, {
        name: `Coach ${team.id}`,
        teamId: team.id,
        teamName: team.name,
        sourceUrl: `https://example.com/coaches/${team.id}`
      }]))
    },
    playerAvailabilityData: {
      updatedAt: "2026-07-20T07:00:00.000Z",
      teams: Object.fromEntries(teams.map((team) => [team.id, { included: [`Player ${team.id}`], fixtureUnavailable: [] }]))
    },
    chatbotH2hData: {
      updatedAt: "2026-07-20T07:00:00.000Z",
      pairs: {
        "T01|T02": { status: "loaded", results: [] }
      }
    },
    teamStyleProfilesData: {
      generatedBy: "archive smoke",
      profiles: Object.fromEntries(teams.map((team) => [team.id, { summary: `${team.name} style` }]))
    },
    worldCupAwardsData: {
      updatedAt: "2026-07-20T07:00:00.000Z",
      sources: [{ id: "canonical-awards", url: "https://example.com/canonical-awards" }],
      editions: {
        "2026": {
          goldenBall: { recipients: [{ playerName: "Best Player", teamName: "Team 1" }], sourceId: "canonical-awards" },
          goldenBoot: { recipients: [{ playerName: "Final scorer", teamName: "Team 8", goals: 1 }], sourceId: "canonical-awards" },
          goldenGlove: { recipients: [{ playerName: "Best Goalkeeper", teamName: "Team 1" }], sourceId: "canonical-awards" },
          youngPlayer: { recipients: [{ playerName: "Best Young Player", teamName: "Team 1" }], sourceId: "canonical-awards" },
          fairPlay: { recipients: [{ teamName: "Team 2" }], sourceId: "canonical-awards" }
        }
      }
    },
    localeCurrentContent: {
      es: {
        language: "es",
        scope: "current",
        translations: {
          "Match complete.": "Partido terminado.",
          "Final point one.": "Punto uno de la final.",
          "Final point two.": "Punto dos de la final.",
          "Final point three.": "Punto tres de la final."
        }
      },
      ko: {
        language: "ko",
        scope: "current",
        translations: {
          "Match complete.": "경기가 끝났습니다.",
          "Final point one.": "결승 포인트 1.",
          "Final point two.": "결승 포인트 2.",
          "Final point three.": "결승 포인트 3."
        }
      }
    },
    manifestData: null
  });
}

function expectFailure(run, pattern) {
  assert.throws(run, pattern);
}

function asLegacySchema3State(plan) {
  const archive = JSON.parse(plan.archiveContents);
  archive.schemaVersion = 3;
  for (const [archiveField, inputFile] of [
    ["lineupLayoutOverrides", "lineup-layout-overrides.json"],
    ["fifaTacticalLineupIndex", "fifa-tactical-lineup-index.json"],
    ["expectedLineupsAudit", "expected-lineups-audit.json"],
    ["lineupPredictionRevisions", "lineup-prediction-revisions.json"]
  ]) {
    delete archive[archiveField];
    delete archive.inputProvenance[inputFile];
  }
  delete archive.highlightsBestXi;
  delete archive.inputProvenance["highlights-best-xi.json"];
  const archiveContents = stringifyArchiveJson(archive);
  const archiveSha256 = createHash("sha256").update(archiveContents).digest("hex");
  const entry = { ...plan.nextManifest.entries[0], sha256: archiveSha256 };
  const manifest = { ...plan.nextManifest, entries: [entry] };
  const tournament = structuredClone(plan.nextTournament);
  const archiveSource = tournament.sources.find((source) => source.id === ARCHIVE_SOURCE_ID);
  archiveSource.note = `Immutable 104-match archive ${plan.archiveVersion}; SHA-256 ${archiveSha256}.`;
  const lifecycle = { ...plan.nextLifecycle, archiveSha256 };
  return { archiveContents, archiveSha256, entry, lifecycle, manifest, tournament };
}

const initialData = makeData();
const initialHistory = JSON.stringify(initialData.historyData);
const initialNow = new Date("2026-07-20T07:00:00.123Z");
const initialPlan = build2026ArchivePlan(initialData, { now: initialNow });

assert.equal(initialPlan.archiveVersion, "2026-final-2026-07-20T07-00-00-123Z");
assert.equal(initialPlan.archiveSchemaVersion, 4);
assert.equal(initialPlan.archiveRelativePath, "data/archives/world-cup-2026-final-2026-07-20T07-00-00-123Z.json");
assert.equal(initialPlan.archiveSha256, createHash("sha256").update(initialPlan.archiveContents).digest("hex"));
assert.equal(JSON.parse(initialPlan.archiveContents).schemaVersion, 4);
assert.equal(initialPlan.nextManifest.entries.length, 1);
assert.equal(initialPlan.nextManifest.entries[0].sha256, initialPlan.archiveSha256);
assert.equal(initialPlan.qualitySummary.fixtureCount, 104);
assert.equal(initialPlan.qualitySummary.officialLineupCount, 104);
assert.equal(initialPlan.qualitySummary.standingsGroupCount, 12);
assert.equal(initialPlan.qualitySummary.curatedLocaleCount, 2);
assert.equal(initialPlan.qualitySummary.awardCount, 5);
assert.equal(initialPlan.qualitySummary.playerProfileCount, 48);
assert.equal(initialPlan.qualitySummary.coachProfileCount, 48);
assert.equal(initialPlan.qualitySummary.availabilityTeamCount, 48);
assert.equal(initialPlan.qualitySummary.chatbotH2hPairCount, 1);
assert.equal(initialPlan.qualitySummary.teamStyleProfileCount, 48);
assert.equal(initialPlan.qualitySummary.canonicalAwardCount, 5);
assert.equal(initialPlan.qualitySummary.reviewedEventCorrectionFixtureCount, 0);
assert.equal(initialPlan.qualitySummary.bestXiStarterCount, 11);
assert.equal(initialPlan.qualitySummary.bestXiHonourableCount, 15);
assert.equal(initialPlan.qualitySummary.bestXiPlayerCount, 26);
assert.equal(initialPlan.qualitySummary.bestXiResearchHonourableCount, 23);
assert.equal(initialPlan.qualitySummary.bestXiResearchPlayerCount, 34);
assert.equal(initialPlan.qualitySummary.bestXiCoachCount, 1);
assert.equal(initialPlan.qualitySummary.bestXiLocaleCount, 4);
assert.equal(initialPlan.qualitySummary.bestXiSourceCount, 5);
assert.ok(JSON.parse(initialPlan.archiveContents).teams);
assert.ok(JSON.parse(initialPlan.archiveContents).standings);
assert.ok(JSON.parse(initialPlan.archiveContents).localeCurrentContent.es);
assert.deepEqual(JSON.parse(initialPlan.archiveContents).officialEventCorrections, { schemaVersion: 1, fixtures: {} });
assert.deepEqual(JSON.parse(initialPlan.archiveContents).highlightsBestXi, initialData.highlightsBestXiData);
assert.deepEqual(JSON.parse(initialPlan.archiveContents).surfaceProvenance, initialData.surfaceProvenance);
assert.deepEqual(build2026ArchiveReviewPlan(initialPlan, initialData.inputProvenance).surfaceProvenance, initialData.surfaceProvenance);
assert.ok(JSON.parse(initialPlan.archiveContents).playerProfiles.profiles["Player T01"]);
assert.ok(JSON.parse(initialPlan.archiveContents).coachProfiles.profiles["Coach T01"]);
assert.ok(JSON.parse(initialPlan.archiveContents).playerAvailability.teams.T01);
assert.ok(JSON.parse(initialPlan.archiveContents).chatbotH2h.pairs["T01|T02"]);
assert.ok(JSON.parse(initialPlan.archiveContents).teamStyleProfiles.profiles.T01);
assert.ok(JSON.parse(initialPlan.archiveContents).worldCupAwards.editions["2026"]);
assert.deepEqual(JSON.parse(initialPlan.archiveContents).lineupLayoutOverrides, initialData.lineupLayoutOverridesData);
assert.deepEqual(JSON.parse(initialPlan.archiveContents).fifaTacticalLineupIndex, initialData.fifaTacticalLineupIndexData);
assert.deepEqual(JSON.parse(initialPlan.archiveContents).expectedLineupsAudit, initialData.expectedLineupsAuditData);
assert.deepEqual(JSON.parse(initialPlan.archiveContents).lineupPredictionRevisions, initialData.lineupPredictionRevisionsData);
assert.equal(JSON.parse(initialPlan.archiveContents).inputProvenance["fixtures.json"].present, true);
assert.equal(JSON.parse(initialPlan.archiveContents).inputProvenance["lineup-layout-overrides.json"].present, true);
assert.equal(JSON.parse(initialPlan.archiveContents).inputProvenance["fifa-tactical-lineup-index.json"].present, true);
assert.equal(JSON.parse(initialPlan.archiveContents).inputProvenance["expected-lineups-audit.json"].present, true);
assert.equal(JSON.parse(initialPlan.archiveContents).inputProvenance["lineup-prediction-revisions.json"].present, true);
assert.equal(JSON.parse(initialPlan.archiveContents).inputProvenance["highlights-best-xi.json"].present, true);
assert.equal(Object.keys(initialData.inputProvenance).length, 24);

const reviewPlan = build2026ArchiveReviewPlan(initialPlan, initialData.inputProvenance);
assert.equal(reviewPlan.schemaVersion, 2);
assert.equal(reviewPlan.archiveSchemaVersion, 4);
assert.equal(reviewPlan.archiveAt, initialNow.toISOString());
assert.equal(reviewPlan.archiveSha256, initialPlan.archiveSha256);
assert2026ArchiveReviewPlanMatches(reviewPlan, initialPlan, initialData.inputProvenance);
expectFailure(
  () => assert2026ArchiveReviewPlanMatches({ ...reviewPlan, schemaVersion: 1 }, initialPlan, initialData.inputProvenance),
  /Archive review plan must use schemaVersion 2/
);
const staleReviewPlan = structuredClone(reviewPlan);
staleReviewPlan.inputProvenance["fixtures.json"].sha256 = "0".repeat(64);
expectFailure(
  () => assert2026ArchiveReviewPlanMatches(staleReviewPlan, initialPlan, initialData.inputProvenance),
  /does not match the current inputs/
);

// The finalizer has no history output and does not mutate history. The app's current + history
// calendar sources therefore still contain exactly one copy of every 2026 fixture.
assert.equal("nextHistory" in initialPlan, false);
assert.equal(JSON.stringify(initialData.historyData), initialHistory);
assert.equal(initialData.historyData.fixtures.filter((fixture) => fixture.tournamentYear === 2026).length, 0);
assert.equal([...initialData.historyData.fixtures, ...initialData.fixturesData.fixtures].length, 105);

const missingAward = makeData();
delete missingAward.tournamentData.awards;
expectFailure(
  () => build2026ArchivePlan(missingAward, { now: initialNow }),
  /complete official award set must be loaded/
);

const incompleteAwards = makeData();
delete incompleteAwards.tournamentData.awards.youngPlayer;
expectFailure(
  () => build2026ArchivePlan(incompleteAwards, { now: initialNow }),
  /Official Young Player data must be confirmed/
);

const incorrectGoldenBoot = makeData();
incorrectGoldenBoot.tournamentData.awards.goldenBoot.goals = 2;
expectFailure(
  () => build2026ArchivePlan(incorrectGoldenBoot, { now: initialNow }),
  /loaded goal events contain 1/
);

const duplicateHistory = makeData();
duplicateHistory.historyData.fixtures.push({ id: "wc-2026-match-1", tournamentYear: 2026 });
expectFailure(
  () => build2026ArchivePlan(duplicateHistory, { now: initialNow }),
  /history\.json already contains 2026 fixtures/
);

const missingWorkflowInput = makeData();
delete missingWorkflowInput.fifaTacticalLineupIndexData;
expectFailure(
  () => build2026ArchivePlan(missingWorkflowInput, { now: initialNow }),
  /schema 4 requires fifa-tactical-lineup-index\.json/
);

const mismatchedWorkflowProvenance = makeData();
mismatchedWorkflowProvenance.lineupPredictionRevisionsData.revisions.push({ revisionId: "changed-after-snapshot" });
expectFailure(
  () => build2026ArchivePlan(mismatchedWorkflowProvenance, { now: initialNow }),
  /lineup-prediction-revisions\.json does not match its canonical provenance/
);

const invalidBestXi = makeData();
invalidBestXi.highlightsBestXiData.selection.slots[0].starter.reason.ko = "";
expectFailure(
  () => build2026ArchivePlan(invalidBestXi, { now: initialNow }),
  /needs exactly two non-empty rationale paragraphs in en\/es\/zh\/ko/
);

const lateCorrectionData = makeData();
lateCorrectionData.lifecycle = initialPlan.nextLifecycle;
lateCorrectionData.tournamentData = initialPlan.nextTournament;
lateCorrectionData.manifestData = initialPlan.nextManifest;
refreshInputProvenance(lateCorrectionData);
expectFailure(
  () => build2026ArchivePlan(lateCorrectionData, { now: new Date("2026-07-20T07:00:01.123Z") }),
  /use --late-correction/
);

const correctionPlan = build2026ArchivePlan(lateCorrectionData, {
  now: new Date("2026-07-20T07:00:01.123Z"),
  allowLateCorrection: true
});
assert.equal(correctionPlan.nextManifest.entries.length, 2);
assert.equal(correctionPlan.nextManifest.entries[0].sha256, initialPlan.archiveSha256);
assert.equal(correctionPlan.nextManifest.entries[1].supersedes, initialPlan.archiveVersion);
assert.notEqual(correctionPlan.archiveRelativePath, initialPlan.archiveRelativePath);
assert.equal(correctionPlan.nextLifecycle.archivedAt, initialPlan.nextLifecycle.archivedAt);
assert.equal(correctionPlan.nextLifecycle.lastCorrectedAt, "2026-07-20T07:00:01.123Z");

const legacySchema3State = asLegacySchema3State(initialPlan);
const schema4UpgradeData = makeData();
schema4UpgradeData.lifecycle = legacySchema3State.lifecycle;
schema4UpgradeData.tournamentData = legacySchema3State.tournament;
schema4UpgradeData.manifestData = legacySchema3State.manifest;
refreshInputProvenance(schema4UpgradeData);
const schema4UpgradePlan = build2026ArchivePlan(schema4UpgradeData, {
  now: new Date("2026-07-20T07:00:02.123Z"),
  allowLateCorrection: true
});
assert.equal(JSON.parse(schema4UpgradePlan.archiveContents).schemaVersion, 4);
assert.equal(schema4UpgradePlan.nextManifest.entries[0].sha256, legacySchema3State.archiveSha256);
assert.equal(schema4UpgradePlan.nextManifest.entries[1].supersedes, initialPlan.archiveVersion);

expectFailure(
  () => build2026ArchivePlan(lateCorrectionData, { now: initialNow, allowLateCorrection: true }),
  /late correction must be newer/
);

expectFailure(
  () => build2026ArchivePlan(lateCorrectionData, {
    now: new Date(initialNow.getTime() - 1),
    allowLateCorrection: true
  }),
  /late correction must be newer/
);

const temporaryDataDir = await mkdtemp(path.join(tmpdir(), "world-cup-archive-smoke-"));
try {
  const temporarySurfaceRoot = path.join(temporaryDataDir, "surface-root");
  await writeTestSurface(temporarySurfaceRoot);
  const temporaryArchivesDir = path.join(temporaryDataDir, "archives");
  const tournamentContents = stringifyArchiveJson(initialData.tournamentData);
  const lifecycleContents = stringifyArchiveJson(initialData.lifecycle);
  const historyContents = stringifyArchiveJson(initialData.historyData);
  const currentEditionInputs = new Map([
    ["fixtures.json", initialData.fixturesData],
    ["teams.json", initialData.teamsData],
    ["standings.json", initialData.standingsData],
    ["lineups.json", initialData.lineupsData],
    ["expected-lineups.json", initialData.expectedLineupsData],
    ["lineup-prediction-history.json", initialData.predictionHistory],
    ["lineup-layout-overrides.json", initialData.lineupLayoutOverridesData],
    ["fifa-tactical-lineup-index.json", initialData.fifaTacticalLineupIndexData],
    ["expected-lineups-audit.json", initialData.expectedLineupsAuditData],
    ["lineup-prediction-revisions.json", initialData.lineupPredictionRevisionsData],
    ["official-event-corrections.json", initialData.officialEventCorrectionsData],
    ["highlights-best-xi.json", initialData.highlightsBestXiData],
    ["player-profiles.json", initialData.playerProfilesData],
    ["coach-profiles.json", initialData.coachProfilesData],
    ["player-availability.json", initialData.playerAvailabilityData],
    ["chatbot-h2h.json", initialData.chatbotH2hData],
    ["team-style-profiles.json", initialData.teamStyleProfilesData],
    ["world-cup-awards.json", initialData.worldCupAwardsData],
    [path.join("locales", "es", "current-content.json"), initialData.localeCurrentContent.es],
    [path.join("locales", "ko", "current-content.json"), initialData.localeCurrentContent.ko]
  ]);
  await mkdir(temporaryArchivesDir);
  await mkdir(path.join(temporaryDataDir, "locales", "es"), { recursive: true });
  await mkdir(path.join(temporaryDataDir, "locales", "ko"), { recursive: true });
  await Promise.all([
    writeFile(path.join(temporaryDataDir, "tournament.json"), tournamentContents),
    writeFile(path.join(temporaryDataDir, "edition-lifecycle.json"), lifecycleContents),
    writeFile(path.join(temporaryDataDir, "history.json"), historyContents),
    ...[...currentEditionInputs].map(([file, value]) =>
      writeFile(path.join(temporaryDataDir, file), stringifyArchiveJson(value))
    )
  ]);
  const transactionSnapshots = new Map([
    ["tournament.json", tournamentContents],
    ["edition-lifecycle.json", lifecycleContents],
    ["history.json", historyContents],
    [path.join("archives", ARCHIVE_MANIFEST_NAME), null]
  ]);
  for (const [file, value] of currentEditionInputs) {
    transactionSnapshots.set(file, stringifyArchiveJson(value));
  }

  const raceArchivePath = path.join(temporaryArchivesDir, initialPlan.archiveFileName);
  const raceWorkflowInputPath = path.join(temporaryDataDir, "lineup-layout-overrides.json");
  const originalWorkflowInputContents = stringifyArchiveJson(initialData.lineupLayoutOverridesData);
  await assert.rejects(
    commit2026Archive({
      dataDir: temporaryDataDir,
      rootDir: temporarySurfaceRoot,
      plan: initialPlan,
      snapshots: transactionSnapshots,
      surfaceSnapshots: TEST_SURFACE_SNAPSHOTS,
      beforeLifecycleCommit: () => writeFile(raceWorkflowInputPath, "{}\n")
    }),
    /lineup-layout-overrides\.json changed before the archive lifecycle commit/
  );
  assert.equal(await readFile(path.join(temporaryDataDir, "tournament.json"), "utf8"), tournamentContents);
  assert.equal(await readFile(path.join(temporaryDataDir, "edition-lifecycle.json"), "utf8"), lifecycleContents);
  await assert.rejects(readFile(raceArchivePath, "utf8"), (error) => error?.code === "ENOENT");
  await writeFile(raceWorkflowInputPath, originalWorkflowInputContents);

  await commit2026Archive({ dataDir: temporaryDataDir, rootDir: temporarySurfaceRoot, plan: initialPlan, snapshots: transactionSnapshots, surfaceSnapshots: TEST_SURFACE_SNAPSHOTS });
  const archivePath = path.join(temporaryArchivesDir, initialPlan.archiveFileName);
  const manifestPath = path.join(temporaryArchivesDir, ARCHIVE_MANIFEST_NAME);
  assert.equal(await readFile(archivePath, "utf8"), initialPlan.archiveContents);
  assert.deepEqual(JSON.parse(await readFile(manifestPath, "utf8")), initialPlan.nextManifest);
  assert.deepEqual(JSON.parse(await readFile(path.join(temporaryDataDir, "tournament.json"), "utf8")), initialPlan.nextTournament);
  assert.deepEqual(JSON.parse(await readFile(path.join(temporaryDataDir, "edition-lifecycle.json"), "utf8")), initialPlan.nextLifecycle);
  assert.equal(await readFile(path.join(temporaryDataDir, "history.json"), "utf8"), historyContents);

  const verification = await verify2026Archive({
    dataDir: temporaryDataDir,
    surfaceRoot: temporarySurfaceRoot,
    verifyReleaseSurface: true
  });
  assert.equal(verification.entryCount, 1);
  assert.equal(verification.latestArchiveVersion, initialPlan.archiveVersion);
  assert.equal(verification.releaseSurfaceVerified, true);
  assert.equal(verification.verifiedEntries[0].schemaVersion, 4);
  assert.equal(verification.verifiedEntries[0].fixtureCount, 104);

  const playerProfilesPath = path.join(temporaryDataDir, "player-profiles.json");
  const editorialPlayerProfiles = structuredClone(initialData.playerProfilesData);
  editorialPlayerProfiles.updatedAt = "2026-07-21T00:00:00.000Z";
  Object.assign(editorialPlayerProfiles.profiles["Player T01"], {
    skills: ["Rewritten editorial skill"],
    note: "Rewritten English player-card description.",
    noteZh: "重写后的中文球员卡描述。",
    noteMeta: {
      origin: "generated",
      generatorVersion: "current-player-style-v2",
      roleGroup: "forward",
      signatureId: "test-signature",
      actionIds: ["test-action-one", "test-action-two"],
      sourceSkills: ["Test skill"],
      confidence: 1
    }
  });
  await writeFile(playerProfilesPath, stringifyArchiveJson(editorialPlayerProfiles));
  const editorialProfileVerification = await verify2026Archive({
    dataDir: temporaryDataDir,
    surfaceRoot: temporarySurfaceRoot
  });
  assert.equal(editorialProfileVerification.latestArchiveVersion, initialPlan.archiveVersion);
  editorialPlayerProfiles.profiles["Player T01"].position = "Changed protected position";
  await writeFile(playerProfilesPath, stringifyArchiveJson(editorialPlayerProfiles));
  await assert.rejects(
    verify2026Archive({ dataDir: temporaryDataDir, surfaceRoot: temporarySurfaceRoot }),
    /player-profiles\.json has protected tournament-data changes/
  );
  await writeFile(playerProfilesPath, stringifyArchiveJson(initialData.playerProfilesData));

  const bestXiPath = path.join(temporaryDataDir, "highlights-best-xi.json");
  const editorialBestXi = structuredClone(initialData.highlightsBestXiData);
  editorialBestXi.updatedAt = "2026-07-21T00:00:00.000Z";
  editorialBestXi.selection.methodology = "Rewritten editorial methodology.";
  editorialBestXi.selection.methodologyLocalized.es = "Metodologia editorial reescrita.";
  editorialBestXi.selection.coach.reason.en = "Rewritten coach rationale.";
  editorialBestXi.selection.slots[0].starter.reason.en = [
    "Rewritten tournament evidence.",
    "Rewritten footballing rationale."
  ];
  await writeFile(bestXiPath, stringifyArchiveJson(editorialBestXi));
  const editorialBestXiVerification = await verify2026Archive({
    dataDir: temporaryDataDir,
    surfaceRoot: temporarySurfaceRoot
  });
  assert.equal(editorialBestXiVerification.latestArchiveVersion, initialPlan.archiveVersion);
  editorialBestXi.selection.slots[0].starter.position = "ST";
  await writeFile(bestXiPath, stringifyArchiveJson(editorialBestXi));
  await assert.rejects(
    verify2026Archive({ dataDir: temporaryDataDir, surfaceRoot: temporarySurfaceRoot }),
    /highlights-best-xi\.json has protected tournament-data changes/
  );
  await writeFile(bestXiPath, stringifyArchiveJson(initialData.highlightsBestXiData));

  const fixturesPath = path.join(temporaryDataDir, "fixtures.json");
  const editorialFixtures = structuredClone(initialData.fixturesData);
  editorialFixtures.updatedAt = "2026-07-22T00:00:00.000Z";
  editorialFixtures.sourceIds.push("matchup-archive-present-tense-2026-07-22");
  editorialFixtures.fixtures[0].keyInformation = {
    schemaVersion: 3,
    mode: "pre-match-reconstruction",
    temporalCutoff: "kickoff",
    sourceId: "matchup-archive-present-tense-2026-07-22",
    home: "Team 1 are preparing around their confirmed starters and the opening-match stakes.",
    away: "Team 2 are preparing around their confirmed starters and the opening-match stakes."
  };
  await writeFile(fixturesPath, stringifyArchiveJson(editorialFixtures));
  const editorialFixtureVerification = await verify2026Archive({
    dataDir: temporaryDataDir,
    surfaceRoot: temporarySurfaceRoot
  });
  assert.equal(editorialFixtureVerification.latestArchiveVersion, initialPlan.archiveVersion);
  editorialFixtures.fixtures[0].score.home = 7;
  await writeFile(fixturesPath, stringifyArchiveJson(editorialFixtures));
  await assert.rejects(
    verify2026Archive({ dataDir: temporaryDataDir, surfaceRoot: temporarySurfaceRoot }),
    /fixtures\.json has protected tournament-data changes/
  );
  await writeFile(fixturesPath, stringifyArchiveJson(initialData.fixturesData));

  const tournamentPath = path.join(temporaryDataDir, "tournament.json");
  const tournamentWithEditorialMethodology = structuredClone(initialPlan.nextTournament);
  tournamentWithEditorialMethodology.sources.push({
    id: "matchup-archive-present-tense-2026-07-22",
    label: "Cutoff-safe matchup reconstruction methodology",
    type: "editorial",
    editorialScope: "matchup-key-information",
    checkedAt: "2026-07-22T00:00:00.000Z"
  });
  await writeFile(tournamentPath, stringifyArchiveJson(tournamentWithEditorialMethodology));
  const editorialSourceVerification = await verify2026Archive({
    dataDir: temporaryDataDir,
    surfaceRoot: temporarySurfaceRoot
  });
  assert.equal(editorialSourceVerification.latestArchiveVersion, initialPlan.archiveVersion);
  tournamentWithEditorialMethodology.awards.goldenBall.playerName = "Changed protected winner";
  await writeFile(tournamentPath, stringifyArchiveJson(tournamentWithEditorialMethodology));
  await assert.rejects(
    verify2026Archive({ dataDir: temporaryDataDir, surfaceRoot: temporarySurfaceRoot }),
    /tournament\.json differs from the latest immutable archive/
  );
  await writeFile(tournamentPath, stringifyArchiveJson(initialPlan.nextTournament));

  const mutableSurfaceFile = ARCHIVE_SURFACE_INPUT_FILES[0];
  const mutableSurfacePath = path.join(temporarySurfaceRoot, mutableSurfaceFile);
  const originalSurfaceContents = TEST_SURFACE_SNAPSHOTS.get(mutableSurfaceFile);
  await writeFile(mutableSurfacePath, `${originalSurfaceContents}// harmless later shell maintenance\n`);
  const ordinaryVerification = await verify2026Archive({ dataDir: temporaryDataDir, surfaceRoot: temporarySurfaceRoot });
  assert.equal(ordinaryVerification.releaseSurfaceVerified, false);
  await assert.rejects(
    verify2026Archive({
      dataDir: temporaryDataDir,
      surfaceRoot: temporarySurfaceRoot,
      verifyReleaseSurface: true
    }),
    new RegExp(`${mutableSurfaceFile.replace(/\./g, "\\.")}.*differs from the latest immutable archive`)
  );
  await writeFile(mutableSurfacePath, originalSurfaceContents);

  await writeFile(archivePath, `${initialPlan.archiveContents} `);
  await assert.rejects(
    verify2026Archive({ dataDir: temporaryDataDir, surfaceRoot: temporarySurfaceRoot }),
    /SHA-256 does not match/
  );
  await writeFile(archivePath, initialPlan.archiveContents);

  for (const workflowInput of [
    "lineup-layout-overrides.json",
    "fifa-tactical-lineup-index.json",
    "expected-lineups-audit.json",
    "lineup-prediction-revisions.json",
    "highlights-best-xi.json"
  ]) {
    const currentWorkflowInputPath = path.join(temporaryDataDir, workflowInput);
    const currentWorkflowInputContents = await readFile(currentWorkflowInputPath, "utf8");
    await writeFile(currentWorkflowInputPath, "{}\n");
    await assert.rejects(
      verify2026Archive({ dataDir: temporaryDataDir, surfaceRoot: temporarySurfaceRoot }),
      new RegExp(
        ["player-profiles.json", "highlights-best-xi.json"].includes(workflowInput)
          ? `${workflowInput.replace(/\./g, "\\.")} has protected tournament-data changes`
          : `${workflowInput.replace(/\./g, "\\.")} differs from the latest immutable archive`
      )
    );
    await writeFile(currentWorkflowInputPath, currentWorkflowInputContents);
  }

  const committedSnapshots = new Map([
    ["tournament.json", stringifyArchiveJson(initialPlan.nextTournament)],
    ["edition-lifecycle.json", stringifyArchiveJson(initialPlan.nextLifecycle)],
    ["history.json", historyContents],
    [path.join("archives", ARCHIVE_MANIFEST_NAME), stringifyArchiveJson(initialPlan.nextManifest)]
  ]);
  await assert.rejects(
    commit2026Archive({ dataDir: temporaryDataDir, rootDir: temporarySurfaceRoot, plan: initialPlan, snapshots: committedSnapshots, surfaceSnapshots: TEST_SURFACE_SNAPSHOTS }),
    (error) => error?.code === "EEXIST"
  );
  assert.equal(await readFile(archivePath, "utf8"), initialPlan.archiveContents);
  assert.deepEqual(JSON.parse(await readFile(manifestPath, "utf8")), initialPlan.nextManifest);

  const staleSnapshots = new Map(committedSnapshots);
  staleSnapshots.set("history.json", "stale history\n");
  await assert.rejects(
    commit2026Archive({ dataDir: temporaryDataDir, rootDir: temporarySurfaceRoot, plan: initialPlan, snapshots: staleSnapshots, surfaceSnapshots: TEST_SURFACE_SNAPSHOTS }),
    /history\.json changed during archive planning/
  );
} finally {
  await rm(temporaryDataDir, { recursive: true, force: true });
}

const compatibilityDataDir = await mkdtemp(path.join(tmpdir(), "world-cup-archive-schema-compat-"));
try {
  const compatibilitySurfaceRoot = path.join(compatibilityDataDir, "surface-root");
  await writeTestSurface(compatibilitySurfaceRoot);
  const compatibilityArchivesDir = path.join(compatibilityDataDir, "archives");
  const compatibilityInputs = new Map([
    ["fixtures.json", schema4UpgradeData.fixturesData],
    ["teams.json", schema4UpgradeData.teamsData],
    ["standings.json", schema4UpgradeData.standingsData],
    ["lineups.json", schema4UpgradeData.lineupsData],
    ["expected-lineups.json", schema4UpgradeData.expectedLineupsData],
    ["lineup-prediction-history.json", schema4UpgradeData.predictionHistory],
    ["lineup-layout-overrides.json", schema4UpgradeData.lineupLayoutOverridesData],
    ["fifa-tactical-lineup-index.json", schema4UpgradeData.fifaTacticalLineupIndexData],
    ["expected-lineups-audit.json", schema4UpgradeData.expectedLineupsAuditData],
    ["lineup-prediction-revisions.json", schema4UpgradeData.lineupPredictionRevisionsData],
    ["official-event-corrections.json", schema4UpgradeData.officialEventCorrectionsData],
    ["highlights-best-xi.json", schema4UpgradeData.highlightsBestXiData],
    ["player-profiles.json", schema4UpgradeData.playerProfilesData],
    ["coach-profiles.json", schema4UpgradeData.coachProfilesData],
    ["player-availability.json", schema4UpgradeData.playerAvailabilityData],
    ["chatbot-h2h.json", schema4UpgradeData.chatbotH2hData],
    ["team-style-profiles.json", schema4UpgradeData.teamStyleProfilesData],
    ["world-cup-awards.json", schema4UpgradeData.worldCupAwardsData],
    [path.join("locales", "es", "current-content.json"), schema4UpgradeData.localeCurrentContent.es],
    [path.join("locales", "ko", "current-content.json"), schema4UpgradeData.localeCurrentContent.ko]
  ]);
  await mkdir(compatibilityArchivesDir);
  await mkdir(path.join(compatibilityDataDir, "locales", "es"), { recursive: true });
  await mkdir(path.join(compatibilityDataDir, "locales", "ko"), { recursive: true });
  await Promise.all([
    ...[...compatibilityInputs].map(([file, value]) =>
      writeFile(path.join(compatibilityDataDir, file), stringifyArchiveJson(value))
    ),
    writeFile(path.join(compatibilityDataDir, "history.json"), stringifyArchiveJson(schema4UpgradeData.historyData)),
    writeFile(path.join(compatibilityDataDir, "tournament.json"), stringifyArchiveJson(legacySchema3State.tournament)),
    writeFile(path.join(compatibilityDataDir, "edition-lifecycle.json"), stringifyArchiveJson(legacySchema3State.lifecycle)),
    writeFile(path.join(compatibilityArchivesDir, ARCHIVE_MANIFEST_NAME), stringifyArchiveJson(legacySchema3State.manifest)),
    writeFile(path.join(compatibilityArchivesDir, initialPlan.archiveFileName), legacySchema3State.archiveContents)
  ]);

  await assert.rejects(
    verify2026Archive({ dataDir: compatibilityDataDir, surfaceRoot: compatibilitySurfaceRoot }),
    /Latest archive .* must use schemaVersion 4/
  );

  await Promise.all([
    writeFile(path.join(compatibilityDataDir, "tournament.json"), stringifyArchiveJson(schema4UpgradePlan.nextTournament)),
    writeFile(path.join(compatibilityDataDir, "edition-lifecycle.json"), stringifyArchiveJson(schema4UpgradePlan.nextLifecycle)),
    writeFile(path.join(compatibilityArchivesDir, ARCHIVE_MANIFEST_NAME), stringifyArchiveJson(schema4UpgradePlan.nextManifest)),
    writeFile(path.join(compatibilityArchivesDir, schema4UpgradePlan.archiveFileName), schema4UpgradePlan.archiveContents)
  ]);
  const compatibilityVerification = await verify2026Archive({ dataDir: compatibilityDataDir, surfaceRoot: compatibilitySurfaceRoot });
  assert.deepEqual(compatibilityVerification.verifiedEntries.map((entry) => entry.schemaVersion), [3, 4]);
  assert.equal(compatibilityVerification.latestArchiveVersion, schema4UpgradePlan.archiveVersion);
} finally {
  await rm(compatibilityDataDir, { recursive: true, force: true });
}

console.log("2026 archive finalizer smoke passed: strict gates, durable review plans, schema-3 history compatibility, schema-4 workflow inputs, independent verification, atomic writes, safe history boundary, concurrency checks, and explicit late corrections.");
