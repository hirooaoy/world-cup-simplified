import { createHash } from "node:crypto";

export const DEFAULT_HISTORICAL_FORECAST_MODEL = Object.freeze({
  version: "historical-world-cup-form-v2-regulation",
  market: "regulation",
  initialRating: 1500,
  eloScale: 400,
  kFactor: 28,
  marginStep: 0.25,
  marginCap: 2,
  groupDrawBase: 28,
  knockoutDrawBase: 24,
  drawFloor: 18,
  drawGapDivisor: 60,
  drawGapCap: 8,
  winLogisticScale: 190
});

function finiteNumber(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function normalizeHistoricalForecastModel(model = {}) {
  return Object.fromEntries(
    Object.entries(DEFAULT_HISTORICAL_FORECAST_MODEL).map(([key, fallback]) => [
      key,
      typeof fallback === "number" ? finiteNumber(model?.[key], fallback) : model?.[key] || fallback
    ])
  );
}

export function getHistoricalRegulationScore(fixture) {
  const fullTime = fixture?.scoreDetails?.fullTime;
  if (Number.isFinite(fullTime?.home) && Number.isFinite(fullTime?.away)) {
    return { home: Number(fullTime.home), away: Number(fullTime.away) };
  }

  const score = fixture?.score;
  if (Number.isFinite(score?.home) && Number.isFinite(score?.away)) {
    return { home: Number(score.home), away: Number(score.away) };
  }

  return null;
}

export function normalizeProjectionParts(home, draw, away) {
  const rounded = {
    home: Math.max(0, Math.round(home)),
    draw: Math.max(0, Math.round(draw)),
    away: Math.max(0, Math.round(away))
  };
  const total = rounded.home + rounded.draw + rounded.away;
  if (total !== 100) {
    const largestKey = Object.entries(rounded).sort((a, b) => b[1] - a[1])[0][0];
    rounded[largestKey] += 100 - total;
  }
  return rounded;
}

export function buildHistoricalProjection(homeRating, awayRating, isGroup, modelInput = {}) {
  const model = normalizeHistoricalForecastModel(modelInput);
  const ratingDiff = homeRating - awayRating;
  const drawBase = isGroup ? model.groupDrawBase : model.knockoutDrawBase;
  const draw = Math.max(
    model.drawFloor,
    drawBase - Math.min(model.drawGapCap, Math.abs(ratingDiff) / model.drawGapDivisor)
  );
  const decisiveShare = 100 - draw;
  const homeShare = 1 / (1 + Math.exp(-ratingDiff / model.winLogisticScale));
  return normalizeProjectionParts(
    decisiveShare * homeShare,
    draw,
    decisiveShare * (1 - homeShare)
  );
}

export function applyHistoricalRegulationResult(ratings, fixture, modelInput = {}) {
  const score = getHistoricalRegulationScore(fixture);
  if (!score || fixture?.status !== "FT" || !fixture?.homeSlot || !fixture?.awaySlot) {
    return false;
  }

  const model = normalizeHistoricalForecastModel(modelInput);
  const homeRating = ratings.get(fixture.homeSlot) ?? model.initialRating;
  const awayRating = ratings.get(fixture.awaySlot) ?? model.initialRating;
  const expectedHome = 1 / (1 + 10 ** ((awayRating - homeRating) / model.eloScale));
  const outcome = score.home > score.away ? 1 : score.home < score.away ? 0 : 0.5;
  const margin = Math.abs(score.home - score.away);
  const marginMultiplier = Math.min(
    model.marginCap,
    1 + Math.max(0, margin - 1) * model.marginStep
  );
  const update = model.kFactor * marginMultiplier * (outcome - expectedHome);
  ratings.set(fixture.homeSlot, homeRating + update);
  ratings.set(fixture.awaySlot, awayRating - update);
  return true;
}

export function getHistoricalOutcomeFingerprint(fixtures) {
  const rows = (fixtures || []).map((fixture) => ({
    id: fixture.id,
    sortKey: fixture.sortKey,
    status: fixture.status,
    group: fixture.group || "",
    homeSlot: fixture.homeSlot,
    awaySlot: fixture.awaySlot,
    regulationScore: getHistoricalRegulationScore(fixture)
  }));
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

export function auditHistoricalForecasts(fixtures, modelInput = {}) {
  const model = normalizeHistoricalForecastModel(modelInput);
  const ratings = new Map();
  const orderedFixtures = [...(fixtures || [])].sort((a, b) =>
    String(a?.sortKey || "").localeCompare(String(b?.sortKey || ""))
  );
  let predictions = 0;
  let brierTotal = 0;
  let logLossTotal = 0;
  let correctFavorites = 0;

  for (const fixture of orderedFixtures) {
    const score = getHistoricalRegulationScore(fixture);
    if (fixture?.status !== "FT" || !score || !fixture?.homeSlot || !fixture?.awaySlot) {
      continue;
    }

    const homeRating = ratings.get(fixture.homeSlot) ?? model.initialRating;
    const awayRating = ratings.get(fixture.awaySlot) ?? model.initialRating;
    const projection = buildHistoricalProjection(homeRating, awayRating, Boolean(fixture.group), model);
    const outcome = score.home > score.away ? "home" : score.home < score.away ? "away" : "draw";
    const probabilities = {
      home: projection.home / 100,
      draw: projection.draw / 100,
      away: projection.away / 100
    };

    for (const key of ["home", "draw", "away"]) {
      brierTotal += (probabilities[key] - (key === outcome ? 1 : 0)) ** 2;
    }
    logLossTotal -= Math.log(Math.max(0.0001, probabilities[outcome]));
    const favorite = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0][0];
    if (favorite === outcome) {
      correctFavorites += 1;
    }
    predictions += 1;
    applyHistoricalRegulationResult(ratings, fixture, model);
  }

  return {
    schemaVersion: 1,
    model,
    outcomeFingerprint: getHistoricalOutcomeFingerprint(fixtures),
    predictions,
    metrics: {
      brier: Number((brierTotal / predictions).toFixed(4)),
      logLoss: Number((logLossTotal / predictions).toFixed(4)),
      favoriteAccuracy: Number((correctFavorites / predictions).toFixed(4)),
      uniformBrier: 0.6667,
      uniformLogLoss: 1.0986
    }
  };
}
