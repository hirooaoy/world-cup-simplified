#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ARCHIVE_MANIFEST_NAME, build2026ArchivePlan, stringifyArchiveJson } from "./finalize-2026-archive-lib.mjs";
import { commit2026Archive } from "./finalize-2026-archive-transaction.mjs";

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

  return {
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
    officialEventCorrectionsData: {
      schemaVersion: 1,
      fixtures: {}
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
  };
}

function expectFailure(run, pattern) {
  assert.throws(run, pattern);
}

const initialData = makeData();
const initialHistory = JSON.stringify(initialData.historyData);
const initialNow = new Date("2026-07-20T07:00:00.123Z");
const initialPlan = build2026ArchivePlan(initialData, { now: initialNow });

assert.equal(initialPlan.archiveVersion, "2026-final-2026-07-20T07-00-00-123Z");
assert.equal(initialPlan.archiveRelativePath, "data/archives/world-cup-2026-final-2026-07-20T07-00-00-123Z.json");
assert.equal(initialPlan.archiveSha256, createHash("sha256").update(initialPlan.archiveContents).digest("hex"));
assert.equal(initialPlan.nextManifest.entries.length, 1);
assert.equal(initialPlan.nextManifest.entries[0].sha256, initialPlan.archiveSha256);
assert.equal(initialPlan.qualitySummary.fixtureCount, 104);
assert.equal(initialPlan.qualitySummary.officialLineupCount, 104);
assert.equal(initialPlan.qualitySummary.standingsGroupCount, 12);
assert.equal(initialPlan.qualitySummary.curatedLocaleCount, 2);
assert.equal(initialPlan.qualitySummary.awardCount, 5);
assert.equal(initialPlan.qualitySummary.reviewedEventCorrectionFixtureCount, 0);
assert.ok(JSON.parse(initialPlan.archiveContents).teams);
assert.ok(JSON.parse(initialPlan.archiveContents).standings);
assert.ok(JSON.parse(initialPlan.archiveContents).localeCurrentContent.es);
assert.deepEqual(JSON.parse(initialPlan.archiveContents).officialEventCorrections, { schemaVersion: 1, fixtures: {} });

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

const lateCorrectionData = makeData();
lateCorrectionData.lifecycle = initialPlan.nextLifecycle;
lateCorrectionData.tournamentData = initialPlan.nextTournament;
lateCorrectionData.manifestData = initialPlan.nextManifest;
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

expectFailure(
  () => build2026ArchivePlan(lateCorrectionData, { now: initialNow, allowLateCorrection: true }),
  /already exists; use a new timestamp/
);

const temporaryDataDir = await mkdtemp(path.join(tmpdir(), "world-cup-archive-smoke-"));
try {
  const temporaryArchivesDir = path.join(temporaryDataDir, "archives");
  const tournamentContents = stringifyArchiveJson(initialData.tournamentData);
  const lifecycleContents = stringifyArchiveJson(initialData.lifecycle);
  const historyContents = stringifyArchiveJson(initialData.historyData);
  await mkdir(temporaryArchivesDir);
  await Promise.all([
    writeFile(path.join(temporaryDataDir, "tournament.json"), tournamentContents),
    writeFile(path.join(temporaryDataDir, "edition-lifecycle.json"), lifecycleContents),
    writeFile(path.join(temporaryDataDir, "history.json"), historyContents)
  ]);
  const transactionSnapshots = new Map([
    ["tournament.json", tournamentContents],
    ["edition-lifecycle.json", lifecycleContents],
    ["history.json", historyContents],
    [path.join("archives", ARCHIVE_MANIFEST_NAME), null]
  ]);

  await commit2026Archive({ dataDir: temporaryDataDir, plan: initialPlan, snapshots: transactionSnapshots });
  const archivePath = path.join(temporaryArchivesDir, initialPlan.archiveFileName);
  const manifestPath = path.join(temporaryArchivesDir, ARCHIVE_MANIFEST_NAME);
  assert.equal(await readFile(archivePath, "utf8"), initialPlan.archiveContents);
  assert.deepEqual(JSON.parse(await readFile(manifestPath, "utf8")), initialPlan.nextManifest);
  assert.deepEqual(JSON.parse(await readFile(path.join(temporaryDataDir, "tournament.json"), "utf8")), initialPlan.nextTournament);
  assert.deepEqual(JSON.parse(await readFile(path.join(temporaryDataDir, "edition-lifecycle.json"), "utf8")), initialPlan.nextLifecycle);
  assert.equal(await readFile(path.join(temporaryDataDir, "history.json"), "utf8"), historyContents);

  const committedSnapshots = new Map([
    ["tournament.json", stringifyArchiveJson(initialPlan.nextTournament)],
    ["edition-lifecycle.json", stringifyArchiveJson(initialPlan.nextLifecycle)],
    ["history.json", historyContents],
    [path.join("archives", ARCHIVE_MANIFEST_NAME), stringifyArchiveJson(initialPlan.nextManifest)]
  ]);
  await assert.rejects(
    commit2026Archive({ dataDir: temporaryDataDir, plan: initialPlan, snapshots: committedSnapshots }),
    (error) => error?.code === "EEXIST"
  );
  assert.equal(await readFile(archivePath, "utf8"), initialPlan.archiveContents);
  assert.deepEqual(JSON.parse(await readFile(manifestPath, "utf8")), initialPlan.nextManifest);

  const staleSnapshots = new Map(committedSnapshots);
  staleSnapshots.set("history.json", "stale history\n");
  await assert.rejects(
    commit2026Archive({ dataDir: temporaryDataDir, plan: initialPlan, snapshots: staleSnapshots }),
    /history\.json changed during archive planning/
  );
} finally {
  await rm(temporaryDataDir, { recursive: true, force: true });
}

console.log("2026 archive finalizer smoke passed: strict gates, atomic immutable writes, checksums, safe history boundary, concurrency checks, and explicit late corrections.");
