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
for (const relativePath of dataFiles) {
  const document = JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
  collectCoordinateBearingLineups(document, relativePath, storedLineups);
}

const issues = storedLineups.flatMap(({ owner, players }) =>
  getLineupGeometryIssues(players, { owner })
);
if (issues.length) {
  throw new Error(`Lineup geometry audit found ${issues.length} issue(s):\n${issues.join("\n")}`);
}

console.log(
  `Lineup geometry audit passed: ${storedLineups.length} official, source, forecast, and archived lineup sides checked.`
);
