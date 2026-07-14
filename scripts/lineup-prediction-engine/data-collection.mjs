import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = path.join(root, "data");

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

async function readOptionalJson(fileName, fallback = null) {
  try {
    return await readJson(fileName);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

function hasConfirmedTeams(fixture) {
  return Boolean(fixture?.homeTeamId && fixture?.awayTeamId);
}

export function isFutureLineupFixture(fixture, now = new Date()) {
  const kickoff = new Date(fixture?.kickoffUtc || "");
  const cutoff = new Date(now);
  return (
    ["SCHEDULED", "DELAYED"].includes(fixture?.status) &&
    hasConfirmedTeams(fixture) &&
    !Number.isNaN(kickoff.getTime()) &&
    !Number.isNaN(cutoff.getTime()) &&
    kickoff.getTime() > cutoff.getTime()
  );
}

export function isFrozenDelayedLineupFixture(fixture, expectedRecord, now = new Date()) {
  const kickoff = new Date(fixture?.kickoffUtc || "");
  const cutoff = new Date(now);
  const predictedAt = new Date(expectedRecord?.lastUpdated || "");
  return (
    fixture?.status === "DELAYED" &&
    Boolean(fixture?.homeTeamId && fixture?.awayTeamId) &&
    !Number.isNaN(kickoff.getTime()) &&
    !Number.isNaN(cutoff.getTime()) &&
    !Number.isNaN(predictedAt.getTime()) &&
    kickoff.getTime() <= cutoff.getTime() &&
    predictedAt.getTime() < kickoff.getTime()
  );
}

export async function collectLineupPredictionData({ now = new Date() } = {}) {
  const [
    coachProfilesData,
    expectedLineupsAuditData,
    expectedLineupsData,
    fixturesData,
    freeLineupPredictionsData,
    lineupsData,
    playerAvailabilityData,
    playerProfilesData,
    predictionRevisionLedgerData,
    teamsData,
    tournamentData
  ] = await Promise.all([
    readOptionalJson("coach-profiles.json", { profiles: {} }),
    readOptionalJson("expected-lineups-audit.json", null),
    readOptionalJson("expected-lineups.json", { fixtures: [] }),
    readJson("fixtures.json"),
    readOptionalJson("free-lineup-prediction-sources.json", { sources: [], fixtures: [] }),
    readJson("lineups.json"),
    readJson("player-availability.json"),
    readJson("player-profiles.json"),
    readOptionalJson("lineup-prediction-revisions.json", { revisions: [] }),
    readJson("teams.json"),
    readJson("tournament.json")
  ]);
  const staticLineups = lineupsData?.lineups || {};
  const expectedByFixtureId = new Map(
    (expectedLineupsData.fixtures || []).map((record) => [record.fixtureId, record])
  );
  const targetFixtures = (fixturesData.fixtures || [])
    .filter((fixture) =>
      isFutureLineupFixture(fixture, now) ||
      isFrozenDelayedLineupFixture(fixture, expectedByFixtureId.get(fixture.id), now)
    )
    .filter((fixture) => !fixture.lineups && !staticLineups[fixture.id]);
  const generatableTargetFixtures = targetFixtures.filter((fixture) => isFutureLineupFixture(fixture, now));
  const frozenDelayedRecords = targetFixtures
    .filter((fixture) => !isFutureLineupFixture(fixture, now))
    .map((fixture) => expectedByFixtureId.get(fixture.id))
    .filter(Boolean);

  return {
    coachProfilesData,
    expectedLineupsAuditData,
    expectedLineupsData,
    fixturesData,
    freeLineupPredictionsData,
    lineupsData,
    playerAvailabilityData,
    playerProfilesData,
    predictionRevisionLedgerData,
    teamsData,
    tournamentData,
    targetFixtures,
    generatableTargetFixtures,
    frozenDelayedRecords
  };
}
