#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchPlayerNameLists } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");

function round(value, digits = 3) {
  return Number(Number(value || 0).toFixed(digits));
}

function formationFamily(formation) {
  return ["4-3-3", "4-1-2-3"].includes(formation) ? "4-3-3-family" : formation;
}

function coordinateDistance(left, right) {
  if (![left?.x, left?.y, right?.x, right?.y].every((value) => Number.isFinite(Number(value)))) return null;
  return Math.hypot(Number(left.x) - Number(right.x), Number(left.y) - Number(right.y));
}

function createOutcomeMetric() {
  return { teamSamples: 0, starterHits: 0, starterSlots: 0, exactXIs: 0 };
}

function addOutcomeMetric(metrics, key, hits, slots = 11) {
  if (!key) return;
  const metric = metrics.get(key) || createOutcomeMetric();
  metric.teamSamples += 1;
  metric.starterHits += hits;
  metric.starterSlots += slots;
  metric.exactXIs += hits === slots && slots === 11 ? 1 : 0;
  metrics.set(key, metric);
}

function finalizeOutcomeMetrics(metrics) {
  return Object.fromEntries(
    [...metrics.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, metric]) => [key, {
        ...metric,
        averageStarters: round(metric.starterHits / Math.max(metric.teamSamples, 1), 2),
        starterAccuracy: round(metric.starterHits / Math.max(metric.starterSlots, 1))
      }])
  );
}

function leadTimeBucket(hours) {
  if (hours < 6) return "under-6h";
  if (hours < 24) return "6-24h";
  if (hours < 48) return "24-48h";
  if (hours < 72) return "48-72h";
  return "72h-plus";
}

function normalizePredictionClass(value) {
  return value === "reported-xi-assisted" ? "reported-xi-assisted" : "forecast";
}

export function auditPredictionHistory({ historyData, lineupsData }) {
  const metrics = {
    fixtureCount: (historyData.fixtures || []).length,
    forecastFixtureCount: 0,
    reportedAssistedFixtureCount: 0,
    teamSamples: 0,
    starterHits: 0,
    starterSlots: 0,
    exactXIs: 0,
    exactFormations: 0,
    formationFamilyMatches: 0,
    roleMatches: 0,
    roleSamples: 0,
    coordinateDistanceTotal: 0,
    coordinateSamples: 0,
    coordinateWithin10: 0,
    benchTeamSamples: 0,
    benchHits: 0,
    benchSlots: 0,
    exactBenches: 0,
    predictedBenchToStarter: 0,
    predictedStarterToBench: 0
  };
  const missingFinalLineups = [];
  const seenFixtureIds = new Set();
  const leadTimes = [];
  const confidenceMetrics = new Map();
  const providerMetrics = new Map();
  const sourceMetrics = new Map();
  const candidateProviderMetrics = new Map();
  const candidateSourceMetrics = new Map();
  const reportedCandidateProviderMetrics = new Map();
  const reportedCandidateSourceMetrics = new Map();
  const predictionClassMetrics = new Map();
  const leadTimeMetrics = new Map();

  for (const record of historyData.fixtures || []) {
    if (seenFixtureIds.has(record.fixtureId)) throw new Error(`Duplicate prediction history record for ${record.fixtureId}`);
    seenFixtureIds.add(record.fixtureId);
    const kickoffTime = Date.parse(record.kickoffUtc);
    const generatedTime = Date.parse(record.predictionGeneratedAt);
    if (!Number.isFinite(kickoffTime) || !Number.isFinite(generatedTime) || generatedTime >= kickoffTime) {
      throw new Error(`${record.fixtureId} prediction was not generated before kickoff`);
    }
    const leadTimeHours = (kickoffTime - generatedTime) / 36e5;
    const predictionClass = normalizePredictionClass(record.predictionClass);
    const isForecast = predictionClass === "forecast";
    if (isForecast) {
      metrics.forecastFixtureCount += 1;
      leadTimes.push(leadTimeHours);
    } else {
      metrics.reportedAssistedFixtureCount += 1;
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
      const predicted = record[side].starters || [];
      const actual = finalLineup[side]?.players || [];
      const matching = matchPlayerNameLists(
        predicted.map((player) => player.name),
        actual.map((player) => player.name)
      );
      const hits = matching.matches.length;
      addOutcomeMetric(predictionClassMetrics, predictionClass, hits);

      if (isForecast) {
        metrics.teamSamples += 1;
        metrics.starterHits += hits;
        metrics.starterSlots += 11;
        metrics.exactXIs += hits === 11 ? 1 : 0;
        metrics.exactFormations += record[side].formation === finalLineup[side]?.formation ? 1 : 0;
        metrics.formationFamilyMatches += formationFamily(record[side].formation) === formationFamily(finalLineup[side]?.formation) ? 1 : 0;

        for (const match of matching.matches) {
          const predictedPlayer = predicted[match.leftIndex];
          const actualPlayer = actual[match.rightIndex];
          metrics.roleSamples += 1;
          metrics.roleMatches += predictedPlayer.position === actualPlayer.position ? 1 : 0;
          const distance = coordinateDistance(predictedPlayer, actualPlayer);
          if (distance !== null) {
            metrics.coordinateSamples += 1;
            metrics.coordinateDistanceTotal += distance;
            metrics.coordinateWithin10 += distance <= 10 ? 1 : 0;
          }
        }

        const predictedBench = record[side].bench || [];
        const actualBench = finalLineup[side]?.bench || [];
        if (predictedBench.length && actualBench.length) {
          const benchMatching = matchPlayerNameLists(
            predictedBench.map((player) => player.name),
            actualBench.map((player) => player.name)
          );
          metrics.benchTeamSamples += 1;
          metrics.benchHits += benchMatching.matches.length;
          metrics.benchSlots += predictedBench.length;
          metrics.exactBenches += (
            predictedBench.length === actualBench.length &&
            benchMatching.matches.length === predictedBench.length
          ) ? 1 : 0;
          metrics.predictedBenchToStarter += matchPlayerNameLists(
            predictedBench.map((player) => player.name),
            actual.map((player) => player.name)
          ).matches.length;
          metrics.predictedStarterToBench += matchPlayerNameLists(
            predicted.map((player) => player.name),
            actualBench.map((player) => player.name)
          ).matches.length;
        }

        const confidenceLabel = String(record.confidence?.label || "unknown").toLowerCase();
        addOutcomeMetric(confidenceMetrics, confidenceLabel, hits);
        addOutcomeMetric(leadTimeMetrics, leadTimeBucket(leadTimeHours), hits);
        for (const providerId of new Set((record.providers || []).map((provider) => provider.providerId))) {
          addOutcomeMetric(providerMetrics, providerId, hits);
        }
        for (const sourceId of new Set(record.sourceIds || [])) addOutcomeMetric(sourceMetrics, sourceId, hits);
      }

      for (const candidate of record.candidates || []) {
        const candidateSide = candidate.sides?.[side];
        if (!candidateSide?.starters?.length) continue;
        const candidateHits = matchPlayerNameLists(
          candidateSide.starters.map((player) => player.name),
          actual.map((player) => player.name)
        ).matches.length;
        const isReportedCandidate = candidate.predictionClass === "reported-xi";
        const providerTarget = isReportedCandidate ? reportedCandidateProviderMetrics : candidateProviderMetrics;
        const sourceTarget = isReportedCandidate ? reportedCandidateSourceMetrics : candidateSourceMetrics;
        addOutcomeMetric(providerTarget, candidate.providerId, candidateHits, candidateSide.starters.length);
        for (const sourceId of new Set(candidate.lineupSourceIds || candidate.sourceIds || [])) {
          addOutcomeMetric(sourceTarget, sourceId, candidateHits, candidateSide.starters.length);
        }
      }
    }
  }

  if (missingFinalLineups.length) {
    throw new Error(`Prediction history is missing final lineups for: ${missingFinalLineups.join(", ")}`);
  }

  return {
    ...metrics,
    averageStarters: round(metrics.starterHits / Math.max(metrics.teamSamples, 1), 2),
    starterAccuracy: round(metrics.starterHits / Math.max(metrics.starterSlots, 1)),
    averageBenchHits: round(metrics.benchHits / Math.max(metrics.benchTeamSamples, 1), 2),
    benchAccuracy: round(metrics.benchHits / Math.max(metrics.benchSlots, 1)),
    predictedBenchToStarterRate: round(metrics.predictedBenchToStarter / Math.max(metrics.benchSlots, 1)),
    predictedStarterToBenchRate: round(metrics.predictedStarterToBench / Math.max(metrics.teamSamples * 11, 1)),
    roleAccuracy: round(metrics.roleMatches / Math.max(metrics.roleSamples, 1)),
    averageCoordinateDistance: round(metrics.coordinateDistanceTotal / Math.max(metrics.coordinateSamples, 1), 2),
    coordinateWithin10Rate: round(metrics.coordinateWithin10 / Math.max(metrics.coordinateSamples, 1)),
    leadTimeHours: {
      min: leadTimes.length ? round(Math.min(...leadTimes), 1) : 0,
      average: round(leadTimes.reduce((sum, value) => sum + value, 0) / Math.max(leadTimes.length, 1), 1),
      max: leadTimes.length ? round(Math.max(...leadTimes), 1) : 0
    },
    leadTimeMetrics: finalizeOutcomeMetrics(leadTimeMetrics),
    confidenceMetrics: finalizeOutcomeMetrics(confidenceMetrics),
    predictionClassMetrics: finalizeOutcomeMetrics(predictionClassMetrics),
    // Exposure tables describe selected forecast results while a provider or
    // source was cited, not causal source accuracy. Candidate tables compare
    // each archived candidate XI directly; reported-XI candidates stay separate.
    providerExposureMetrics: finalizeOutcomeMetrics(providerMetrics),
    sourceExposureMetrics: finalizeOutcomeMetrics(sourceMetrics),
    candidateProviderMetrics: finalizeOutcomeMetrics(candidateProviderMetrics),
    candidateSourceMetrics: finalizeOutcomeMetrics(candidateSourceMetrics),
    reportedCandidateProviderMetrics: finalizeOutcomeMetrics(reportedCandidateProviderMetrics),
    reportedCandidateSourceMetrics: finalizeOutcomeMetrics(reportedCandidateSourceMetrics)
  };
}

export function formatPredictionHistoryAudit(result) {
  const confidence = Object.entries(result.confidenceMetrics)
    .map(([label, metric]) => `${label} ${metric.averageStarters}/11 (${metric.exactXIs}/${metric.teamSamples} exact)`)
    .join(", ");
  const leadTime = Object.entries(result.leadTimeMetrics)
    .map(([bucket, metric]) => `${bucket} ${metric.averageStarters}/11`)
    .join(", ");
  return [
    `Lineup prediction history audit: ${result.fixtureCount} archived fixtures; forecast-only headline uses ` +
      `${result.forecastFixtureCount} fixtures and ${result.teamSamples} team samples, ` +
      `${result.averageStarters}/11 average starters, ${result.exactXIs}/${result.teamSamples} exact XIs, ` +
      `${result.exactFormations}/${result.teamSamples} exact formations, ` +
      `${result.formationFamilyMatches}/${result.teamSamples} formation-family matches.`,
    `Role/placement: ${result.roleMatches}/${result.roleSamples} exact roles (${(result.roleAccuracy * 100).toFixed(1)}%), ` +
      `${result.averageCoordinateDistance} average coordinate distance, ` +
      `${(result.coordinateWithin10Rate * 100).toFixed(1)}% within 10 pitch units.`,
    `Bench forecast: ${result.averageBenchHits} average hits across ${result.benchTeamSamples} team benches ` +
      `(${(result.benchAccuracy * 100).toFixed(1)}% of predicted bench slots; ${result.exactBenches} exact ${result.exactBenches === 1 ? "set" : "sets"}); ` +
      `${result.predictedBenchToStarter} predicted substitutes started and ${result.predictedStarterToBench} predicted starters were substitutes.`,
    `Lead time: ${result.leadTimeHours.min}-${result.leadTimeHours.max}h (average ${result.leadTimeHours.average}h); ${leadTime || "no samples"}.`,
    `Evidence-strength labels (not calibrated probabilities): ${confidence || "no samples"}.`,
    `Published/reported XI assistance: ${result.reportedAssistedFixtureCount} archived ${result.reportedAssistedFixtureCount === 1 ? "fixture" : "fixtures"}; excluded from the forecast headline and source-forecast calibration.`,
    `Source metrics: ${Object.keys(result.candidateSourceMetrics).length
      ? `${Object.keys(result.candidateSourceMetrics).length} candidate sources measured directly.`
      : "No archived candidate XIs yet; provider/source tables are exposure metrics for the selected output only."}`
  ].join("\n");
}

async function main() {
  const [historyData, lineupsData] = await Promise.all([
    readFile(path.join(dataDir, "lineup-prediction-history.json"), "utf8").then(JSON.parse),
    readFile(path.join(dataDir, "lineups.json"), "utf8").then(JSON.parse)
  ]);
  const result = auditPredictionHistory({ historyData, lineupsData });
  if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else console.log(formatPredictionHistoryAudit(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
