#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditHistoricalForecasts } from "./historical-forecast-model.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const historyPath = path.join(root, "data", "history.json");
const tournamentPath = path.join(root, "data", "tournament.json");
const reportPath = path.join(root, "data", "forecast-calibration.json");
const writeReport = process.argv.includes("--write");
const [historyData, tournamentData] = await Promise.all(
  [historyPath, tournamentPath].map(async (filePath) => JSON.parse(await readFile(filePath, "utf8")))
);
const model = tournamentData?.forecastModels?.historicalWorldCupForm || {};
const report = auditHistoricalForecasts(historyData.fixtures || [], model);

if (report.metrics.brier >= report.metrics.uniformBrier) {
  throw new Error(`Historical forecast Brier score ${report.metrics.brier} does not beat the uniform baseline.`);
}
if (report.metrics.logLoss >= report.metrics.uniformLogLoss) {
  throw new Error(`Historical forecast log loss ${report.metrics.logLoss} does not beat the uniform baseline.`);
}

if (writeReport) {
  const existing = await readFile(reportPath, "utf8").then(JSON.parse).catch(() => null);
  const generatedAt = existing?.outcomeFingerprint === report.outcomeFingerprint &&
      existing?.model?.version === report.model.version
    ? existing.generatedAt
    : new Date().toISOString();
  await writeFile(reportPath, `${JSON.stringify({ generatedAt, ...report }, null, 2)}\n`);
}

console.log(
  `Historical forecast audit passed: ${report.predictions} regulation forecasts, Brier ${report.metrics.brier}, log loss ${report.metrics.logLoss}, favorite accuracy ${(report.metrics.favoriteAccuracy * 100).toFixed(1)}%.`
);
