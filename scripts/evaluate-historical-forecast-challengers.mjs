#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  auditHistoricalForecasts,
  normalizeHistoricalForecastModel
} from "./historical-forecast-model.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [historyData, tournamentData] = await Promise.all(
  ["data/history.json", "data/tournament.json"].map(async (relativePath) =>
    JSON.parse(await readFile(path.join(root, relativePath), "utf8"))
  )
);
const fixtures = historyData.fixtures || [];
const baselineModel = normalizeHistoricalForecastModel(
  tournamentData?.forecastModels?.historicalWorldCupForm || {}
);
const trainingWindow = { scoreThroughYear: 2002 };
const holdoutWindow = { scoreFromYear: 2006 };

function modelScore(report) {
  return report.metrics.brier + report.metrics.logLoss;
}

const candidates = [];
for (const kFactor of [16, 20, 24, 28, 32, 36, 40, 44, 48]) {
  for (const winLogisticScale of [130, 145, 160, 175, 190, 205, 220]) {
    for (const groupDrawBase of [24, 26, 28, 30]) {
      for (const knockoutDrawBase of [22, 24, 26, 28]) {
        for (const drawGapDivisor of [50, 60, 70, 80]) {
          const model = {
            ...baselineModel,
            version: `${baselineModel.version}-challenger`,
            kFactor,
            winLogisticScale,
            groupDrawBase,
            knockoutDrawBase,
            drawGapDivisor
          };
          const training = auditHistoricalForecasts(fixtures, model, trainingWindow);
          candidates.push({ model, training, trainingScore: modelScore(training) });
        }
      }
    }
  }
}

candidates.sort((left, right) => left.trainingScore - right.trainingScore);
const trainingWinner = candidates[0];
const challengerHoldout = auditHistoricalForecasts(fixtures, trainingWinner.model, holdoutWindow);
const baselineTraining = auditHistoricalForecasts(fixtures, baselineModel, trainingWindow);
const baselineHoldout = auditHistoricalForecasts(fixtures, baselineModel, holdoutWindow);
const improvesBoth =
  challengerHoldout.metrics.brier < baselineHoldout.metrics.brier &&
  challengerHoldout.metrics.logLoss < baselineHoldout.metrics.logLoss;
const materialImprovement = modelScore(baselineHoldout) - modelScore(challengerHoldout) >= 0.002;

const report = {
  method: "chronological-train-holdout-grid-v1",
  trainingWindow,
  holdoutWindow,
  candidateCount: candidates.length,
  selectionRule: "single lowest combined Brier plus log loss on training window",
  baseline: {
    model: baselineModel,
    training: baselineTraining.metrics,
    holdout: baselineHoldout.metrics
  },
  challenger: {
    model: trainingWinner.model,
    training: trainingWinner.training.metrics,
    holdout: challengerHoldout.metrics
  },
  recommendation: improvesBoth && materialImprovement ? "adopt-challenger" : "keep-baseline",
  reason: improvesBoth && materialImprovement
    ? "The single training-selected challenger improves both Brier score and log loss on the untouched 2006-2022 holdout."
    : "The single training-selected challenger does not materially improve both Brier score and log loss on the untouched 2006-2022 holdout."
};

console.log(JSON.stringify(report, null, 2));
