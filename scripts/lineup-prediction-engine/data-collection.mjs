import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = path.join(root, "data");

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

function hasConfirmedTeams(fixture) {
  return Boolean(fixture?.homeTeamId && fixture?.awayTeamId);
}

function isFutureLineupFixture(fixture) {
  return ["SCHEDULED", "DELAYED"].includes(fixture?.status) && hasConfirmedTeams(fixture);
}

export async function collectLineupPredictionData() {
  const [
    fixturesData,
    lineupsData,
    playerAvailabilityData,
    playerProfilesData,
    teamsData,
    tournamentData
  ] = await Promise.all([
    readJson("fixtures.json"),
    readJson("lineups.json"),
    readJson("player-availability.json"),
    readJson("player-profiles.json"),
    readJson("teams.json"),
    readJson("tournament.json")
  ]);
  const staticLineups = lineupsData?.lineups || {};
  const targetFixtures = (fixturesData.fixtures || [])
    .filter(isFutureLineupFixture)
    .filter((fixture) => !fixture.lineups && !staticLineups[fixture.id]);

  return {
    fixturesData,
    lineupsData,
    playerAvailabilityData,
    playerProfilesData,
    teamsData,
    tournamentData,
    targetFixtures
  };
}
