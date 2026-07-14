#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isPlayerNameMatch } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const [historyData, lineupsData] = await Promise.all([
  readFile(path.join(dataDir, "lineup-prediction-history.json"), "utf8").then(JSON.parse),
  readFile(path.join(dataDir, "lineups.json"), "utf8").then(JSON.parse)
]);

function starterHits(predicted, actual) {
  return predicted.filter((player) =>
    actual.some((candidate) => isPlayerNameMatch(player.name, candidate.name))
  ).length;
}

function formationFamily(formation) {
  return ["4-3-3", "4-1-2-3"].includes(formation) ? "4-3-3-family" : formation;
}

let teamSamples = 0;
let starterHitTotal = 0;
let exactElevens = 0;
let exactFormations = 0;
let formationFamilyMatches = 0;
const missingFinalLineups = [];
const seenFixtureIds = new Set();

for (const record of historyData.fixtures || []) {
  if (seenFixtureIds.has(record.fixtureId)) {
    throw new Error(`Duplicate prediction history record for ${record.fixtureId}`);
  }
  seenFixtureIds.add(record.fixtureId);
  if (Date.parse(record.predictionGeneratedAt) >= Date.parse(record.kickoffUtc)) {
    throw new Error(`${record.fixtureId} prediction was not generated before kickoff`);
  }
  for (const side of ["home", "away"]) {
    if (!record[side]?.formation || record[side]?.starters?.length !== 11) {
      throw new Error(`${record.fixtureId} ${side} prediction must preserve a formation and 11 starters`);
    }
  }

  const finalLineup = lineupsData.lineups?.[record.fixtureId];
  if (!finalLineup) {
    missingFinalLineups.push(record.fixtureId);
    continue;
  }

  for (const side of ["home", "away"]) {
    const hits = starterHits(record[side].starters || [], finalLineup[side]?.players || []);
    teamSamples += 1;
    starterHitTotal += hits;
    exactElevens += hits === 11 ? 1 : 0;
    exactFormations += record[side].formation === finalLineup[side]?.formation ? 1 : 0;
    formationFamilyMatches += formationFamily(record[side].formation) === formationFamily(finalLineup[side]?.formation) ? 1 : 0;
  }
}

if (missingFinalLineups.length) {
  throw new Error(`Prediction history is missing final lineups for: ${missingFinalLineups.join(", ")}`);
}

console.log(
  `Lineup prediction history audit: ${historyData.fixtures.length} fixtures, ${teamSamples} team samples, ` +
  `${(starterHitTotal / Math.max(teamSamples, 1)).toFixed(2)}/11 average starters, ` +
  `${exactElevens}/${teamSamples} exact XIs, ${exactFormations}/${teamSamples} exact formations, ` +
  `${formationFamilyMatches}/${teamSamples} formation-family matches.`
);
