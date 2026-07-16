#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLineupGeometryIssues } from "./lineup-geometry.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataFiles = [
  "data/lineups.json",
  "data/lineup-layout-overrides.json",
  "data/expected-lineups.json",
  "data/expected-lineups-audit.json",
  "data/lineup-prediction-history.json",
  "data/lineup-prediction-revisions.json"
];

function collectCoordinateBearingLineups(value, owner, results) {
  if (!value || typeof value !== "object") {
    return;
  }

  if (
    Array.isArray(value.players) &&
    value.players.some((player) => player?.x !== undefined || player?.y !== undefined)
  ) {
    results.push({ owner: `${owner}.players`, players: value.players });
  }

  for (const [key, child] of Object.entries(value)) {
    collectCoordinateBearingLineups(child, owner ? `${owner}.${key}` : key, results);
  }
}

const storedLineups = [];
let fixturesData;
let lineupsData;
for (const relativePath of dataFiles) {
  const document = JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
  if (relativePath === "data/lineups.json") lineupsData = document;
  collectCoordinateBearingLineups(document, relativePath, storedLineups);
}
fixturesData = JSON.parse(await readFile(path.join(root, "data/fixtures.json"), "utf8"));

const issues = storedLineups.flatMap(({ owner, players }) =>
  getLineupGeometryIssues(players, { owner })
);
let completedFormationSides = 0;
for (const fixture of fixturesData.fixtures || []) {
  if (fixture.status !== "FT") continue;
  const lineups = lineupsData?.lineups?.[fixture.id];
  for (const side of ["home", "away"]) {
    const observedFormation = fixture.matchEvents?.[side]?.formation;
    if (!observedFormation) continue;
    completedFormationSides += 1;
    if (lineups?.[side]?.formation !== observedFormation) {
      issues.push(
        `${fixture.id}.${side} lineup formation ${lineups?.[side]?.formation || "missing"} ` +
        `does not match FIFA's observed match formation ${observedFormation}`
      );
    }
  }
}
if (issues.length) {
  throw new Error(`Lineup geometry audit found ${issues.length} issue(s):\n${issues.join("\n")}`);
}

console.log(
  `Lineup geometry audit passed: ${storedLineups.length} official, source, forecast, and archived lineup sides checked; ` +
  `${completedFormationSides} completed-match formation sides match FIFA's observed event record.`
);
