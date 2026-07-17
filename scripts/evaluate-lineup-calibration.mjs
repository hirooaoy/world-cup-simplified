#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditPredictionHistory } from "./audit-lineup-prediction-history.mjs";

const MIN_PROVIDER_TEAM_SAMPLES = 30;
const MIN_SOURCE_TEAM_SAMPLES = 20;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [historyData, lineupsData] = await Promise.all(
  ["data/lineup-prediction-history.json", "data/lineups.json"].map(async (relativePath) =>
    JSON.parse(await readFile(path.join(root, relativePath), "utf8"))
  )
);
const audit = auditPredictionHistory({ historyData, lineupsData });

function eligibleRows(metrics, minimumSamples) {
  return Object.entries(metrics || {})
    .filter(([, metric]) => metric.teamSamples >= minimumSamples)
    .map(([id, metric]) => ({ id, ...metric }));
}

const eligibleProviders = eligibleRows(audit.candidateProviderMetrics, MIN_PROVIDER_TEAM_SAMPLES);
const eligibleSources = eligibleRows(audit.candidateSourceMetrics, MIN_SOURCE_TEAM_SAMPLES);
const enoughOutcomeCoverage = audit.forecastFixtureCount >= 15 && audit.teamSamples >= 30;
const recommendation = enoughOutcomeCoverage && eligibleProviders.length >= 2
  ? "calibration-review-ready"
  : "keep-neutral-weights";

console.log(JSON.stringify({
  method: "minimum-sample-lineup-calibration-gate-v1",
  recommendation,
  reason: recommendation === "keep-neutral-weights"
    ? "The archive is too small to distinguish provider or source skill from fixture noise; keep reliability weights neutral."
    : "The archive has enough direct candidate outcomes for a held-out provider-weight calibration review.",
  thresholds: {
    forecastFixtures: 15,
    providerTeamSamples: MIN_PROVIDER_TEAM_SAMPLES,
    sourceTeamSamples: MIN_SOURCE_TEAM_SAMPLES,
    totalTeamSamples: 30
  },
  observed: {
    forecastFixtures: audit.forecastFixtureCount,
    totalTeamSamples: audit.teamSamples,
    starterAccuracy: audit.starterAccuracy,
    roleAccuracy: audit.roleAccuracy,
    coordinateWithin10Rate: audit.coordinateWithin10Rate,
    eligibleProviders,
    eligibleSources
  }
}, null, 2));
