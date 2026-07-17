#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const shouldWrite = process.argv.includes("--write");
const allowLateCorrection = process.argv.includes("--late-correction");
const completedStatuses = new Set(["FT", "AET", "PEN"]);
const archiveSourceId = "world-cup-2026-final-archive";
const now = new Date(process.env.ARCHIVE_NOW || Date.now());

async function readJson(fileName, fallback = null) {
  try {
    return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT" && fallback !== null) return fallback;
    throw error;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function dayKey(kickoffUtc) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Los_Angeles",
    year: "numeric"
  }).formatToParts(new Date(kickoffUtc));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function archiveRound(fixture) {
  if (fixture.round) return fixture.round;
  if (fixture.stage === "group") return `Group ${fixture.groupId}`;
  return String(fixture.stage || "").split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function winnerName(fixture, teamsById) {
  const explicitId = fixture.winnerTeamId;
  if (explicitId) return teamsById.get(explicitId)?.name || explicitId;
  const penalties = fixture.scoreDetails?.penalties;
  if (Number.isFinite(penalties?.home) && Number.isFinite(penalties?.away) && penalties.home !== penalties.away) {
    const teamId = penalties.home > penalties.away ? fixture.homeTeamId : fixture.awayTeamId;
    return teamsById.get(teamId)?.name || teamId;
  }
  if (fixture.score.home === fixture.score.away) return "";
  const teamId = fixture.score.home > fixture.score.away ? fixture.homeTeamId : fixture.awayTeamId;
  return teamsById.get(teamId)?.name || teamId;
}

const [fixturesData, teamsData, tournamentData, historyData, lifecycle, lineupsData, expectedLineupsData, predictionHistory] =
  await Promise.all([
    readJson("fixtures.json"),
    readJson("teams.json"),
    readJson("tournament.json"),
    readJson("history.json"),
    readJson("edition-lifecycle.json"),
    readJson("lineups.json", { lineups: {} }),
    readJson("expected-lineups.json", { fixtures: [] }),
    readJson("lineup-prediction-history.json", { fixtures: {} })
  ]);

const archiveEligibleAfter = new Date(lifecycle.archiveEligibleAfter || "");
assert(lifecycle.edition === 2026, "Archive finalizer only supports the 2026 edition.");
assert(!Number.isNaN(now.getTime()) && !Number.isNaN(archiveEligibleAfter.getTime()), "Archive timestamps are invalid.");
assert(now >= archiveEligibleAfter, `2026 cannot be archived before ${archiveEligibleAfter.toISOString()}.`);
assert(lifecycle.state === "live" || (allowLateCorrection && lifecycle.state === "archived"), "Edition is already closed; use --late-correction for a later official correction.");

const currentFixtures = fixturesData.fixtures || [];
assert(currentFixtures.length === 104, `Expected 104 current fixtures, found ${currentFixtures.length}.`);
assert(
  currentFixtures.every((fixture) => completedStatuses.has(fixture.status) && fixture.score),
  "All 104 fixtures, including the third-place match and final, must be final with scores before archiving."
);
assert(
  currentFixtures.map((fixture) => fixture.matchNumber).sort((a, b) => a - b).join(",") ===
    Array.from({ length: 104 }, (_, index) => index + 1).join(","),
  "The 2026 fixture set must contain unique match numbers 1 through 104."
);

const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
const archivedAt = now.toISOString();
const archiveVersion = `2026-final-${archivedAt.slice(0, 10)}`;
const historical2026Fixtures = currentFixtures.map((fixture) => ({
  id: `wc-2026-${fixture.id}`,
  sourceId: archiveSourceId,
  sourcePath: `archives/world-cup-2026.json#match-${fixture.matchNumber}`,
  isHistorical: true,
  tournamentYear: 2026,
  tournamentName: "World Cup 2026",
  matchNumber: fixture.matchNumber,
  date: dayKey(fixture.kickoffUtc),
  sortKey: `${fixture.kickoffUtc}:${String(fixture.matchNumber).padStart(3, "0")}`,
  round: archiveRound(fixture),
  ...(fixture.groupId ? { group: fixture.groupId } : {}),
  homeSlot: teamsById.get(fixture.homeTeamId)?.name || fixture.homeTeamId,
  awaySlot: teamsById.get(fixture.awayTeamId)?.name || fixture.awayTeamId,
  venue: fixture.venue,
  status: "FT",
  score: fixture.score,
  scoreDetails: fixture.scoreDetails || {},
  goalsHome: fixture.goalsHome || [],
  goalsAway: fixture.goalsAway || [],
  ...(winnerName(fixture, teamsById) ? { winner: winnerName(fixture, teamsById) } : {}),
  ...(fixture.projection ? { projection: fixture.projection } : {}),
  ...(fixture.conditionalProjections ? { conditionalProjections: fixture.conditionalProjections } : {}),
  ...(fixture.shootoutOutlook ? { shootoutOutlook: fixture.shootoutOutlook } : {}),
  ...(fixture.keyPlayers ? { keyPlayers: fixture.keyPlayers } : {}),
  ...(fixture.keyInformation ? { keyInformation: fixture.keyInformation } : {}),
  ...(fixture.resultStoryBullets ? { resultStoryBullets: fixture.resultStoryBullets } : {}),
  ...(fixture.resultStoryBulletsZh ? { resultStoryBulletsZh: fixture.resultStoryBulletsZh } : {}),
  ...(fixture.highlightVideo ? { highlightVideo: fixture.highlightVideo } : {})
}));

const teamNames = [...new Set(historical2026Fixtures.flatMap((fixture) => [fixture.homeSlot, fixture.awaySlot]))].sort();
const tournament2026 = {
  year: 2026,
  name: "World Cup 2026",
  startDate: historical2026Fixtures[0].date,
  endDate: historical2026Fixtures.at(-1).date,
  matchCount: 104,
  teamCount: teamNames.length,
  teams: teamNames
};
const frozenArchive = {
  schemaVersion: 1,
  edition: 2026,
  archiveVersion,
  archivedAt,
  sourceIds: fixturesData.sourceIds || [],
  fixtures: currentFixtures,
  lineups: lineupsData,
  expectedLineups: expectedLineupsData,
  preMatchPredictionHistory: predictionHistory,
  tournament: tournamentData
};
const nextHistory = {
  ...historyData,
  updatedAt: archivedAt,
  sourceIds: [...new Set([...(historyData.sourceIds || []), archiveSourceId])],
  coverage: {
    status: "complete-men-1930-2026",
    note: "Men's World Cup archive through edition 23. The 2026 edition is frozen from the final official fixture snapshot while preserving its pre-match forecast evidence."
  },
  tournaments: [...(historyData.tournaments || []).filter((item) => item.year !== 2026), tournament2026]
    .sort((a, b) => a.year - b.year),
  fixtures: [...(historyData.fixtures || []).filter((item) => item.tournamentYear !== 2026), ...historical2026Fixtures]
    .sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)))
};
const nextTournament = {
  ...tournamentData,
  sources: [
    ...(tournamentData.sources || []).filter((source) => source.id !== archiveSourceId),
    {
      id: archiveSourceId,
      label: "World Cup 2026 final official snapshot",
      url: "data/archives/world-cup-2026.json",
      type: "official-archive",
      checkedAt: archivedAt,
      note: "Versioned 104-match archive with pre-match forecast and lineup evidence preserved."
    }
  ]
};
const nextLifecycle = {
  ...lifecycle,
  state: "archived",
  archivedAt,
  archiveVersion
};

console.log(`2026 archive is ready: 104 fixtures, ${teamNames.length} teams, edition 23 (${archiveVersion}).`);
if (!shouldWrite) {
  console.log("Dry run only. Re-run with --write after reviewing the final official snapshot.");
  process.exit(0);
}

await mkdir(path.join(dataDir, "archives"), { recursive: true });
await Promise.all([
  writeFile(path.join(dataDir, "archives", "world-cup-2026.json"), `${JSON.stringify(frozenArchive, null, 2)}\n`),
  writeFile(path.join(dataDir, "history.json"), `${JSON.stringify(nextHistory, null, 2)}\n`),
  writeFile(path.join(dataDir, "tournament.json"), `${JSON.stringify(nextTournament, null, 2)}\n`),
  writeFile(path.join(dataDir, "edition-lifecycle.json"), `${JSON.stringify(nextLifecycle, null, 2)}\n`)
]);
console.log("Archived 2026 and closed live-era jobs. Late official corrections require --write --late-correction.");
