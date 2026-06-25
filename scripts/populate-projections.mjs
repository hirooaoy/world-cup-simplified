#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const fixturesPath = path.join(dataDir, "fixtures.json");
const teamsPath = path.join(dataDir, "teams.json");

const projectionSourceId = "ranking-projection-2026-06-17";
const hostTeamIds = new Set(["CAN", "MEX", "USA"]);
const overwrite = process.argv.includes("--overwrite");

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rankStrength(team) {
  if (!Number.isFinite(team?.fifaRank) || team.fifaRank <= 0) {
    return 0;
  }

  const hostBoost = hostTeamIds.has(team.id) ? 1.3 : 1;
  return hostBoost / Math.sqrt(team.fifaRank);
}

function buildProjection(homeTeam, awayTeam) {
  const homeStrength = rankStrength(homeTeam);
  const awayStrength = rankStrength(awayTeam);
  const strengthTotal = homeStrength + awayStrength;

  if (!strengthTotal) {
    return null;
  }

  const rankGap = Math.abs(homeTeam.fifaRank - awayTeam.fifaRank);
  const draw = Math.round(clamp(29 - rankGap * 0.16, 19, 29));
  const winPool = 100 - draw;
  const home = Math.round((homeStrength / strengthTotal) * winPool);
  const away = 100 - draw - home;

  return {
    sourceId: projectionSourceId,
    method: "fifa-ranking-baseline",
    basis: "FIFA ranking strength with host-country adjustment",
    home,
    draw,
    away
  };
}

const [fixturesData, teamsData] = await Promise.all([
  readJson(fixturesPath),
  readJson(teamsPath)
]);

const teamsById = new Map(teamsData.teams.map((team) => [team.id, team]));
let populated = 0;
let skipped = 0;

fixturesData.sourceIds = [...new Set([...(fixturesData.sourceIds || []), projectionSourceId])];
fixturesData.fixtures = fixturesData.fixtures.map((fixture) => {
  if (!fixture.homeTeamId || !fixture.awayTeamId) {
    skipped += 1;
    return fixture;
  }

  if (fixture.projection && !overwrite) {
    skipped += 1;
    return fixture;
  }

  const projection = buildProjection(
    teamsById.get(fixture.homeTeamId),
    teamsById.get(fixture.awayTeamId)
  );

  if (!projection) {
    skipped += 1;
    return fixture;
  }

  populated += 1;
  return { ...fixture, projection };
});

await writeFile(fixturesPath, `${JSON.stringify(fixturesData, null, 2)}\n`);
console.log(
  `${overwrite ? "Wrote" : "Populated"} ${populated} projection${populated === 1 ? "" : "s"}; skipped ${skipped}.`
);
