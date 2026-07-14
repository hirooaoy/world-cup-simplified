export const LINEUP_PREDICTION_SCHEMA_VERSION = "2";
export const LINEUP_PREDICTION_ENGINE_ID = "lineup-prediction-engine";
export const LINEUP_PREDICTION_ENGINE_VERSION = "2";
export const EXPECTED_LINEUP_LAYOUT_SOURCE = "derived-team-sheet-order";

export const EXPECTED_LINEUP_MODES = new Set(["expected", "probable"]);
export const CONFIDENCE_LABELS = new Set(["low", "medium", "high"]);

export function isoTimestamp(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${value}`);
  }

  return date.toISOString();
}

export function normalizeConfidenceLabel(score) {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) {
    return "low";
  }

  if (numericScore >= 0.75) {
    return "high";
  }

  if (numericScore >= 0.5) {
    return "medium";
  }

  return "low";
}

export function normalizeConfidence(confidence = {}) {
  const score = Number(confidence.score ?? confidence.value ?? 0);
  const normalizedScore = Number.isFinite(score)
    ? Math.max(0, Math.min(1, Number(score.toFixed(3))))
    : 0;
  const label = String(confidence.label || normalizeConfidenceLabel(normalizedScore)).trim().toLowerCase();

  return {
    label: CONFIDENCE_LABELS.has(label) ? label : normalizeConfidenceLabel(normalizedScore),
    score: normalizedScore,
    ...(confidence.method ? { method: String(confidence.method) } : {}),
    ...(confidence.reason ? { reason: String(confidence.reason) } : {})
  };
}

export function createPredictionSource({
  checkedAt,
  id,
  label,
  note = "",
  sourceRole = "",
  suppliesLineup = false,
  type = "lineup-prediction",
  url = ""
}) {
  if (!id || !String(id).trim()) {
    throw new Error("Prediction source id is required");
  }
  if (!label || !String(label).trim()) {
    throw new Error(`Prediction source "${id}" requires a label`);
  }

  return {
    id: String(id).trim(),
    label: String(label).trim(),
    type: String(type || "lineup-prediction").trim(),
    checkedAt: isoTimestamp(checkedAt),
    ...(sourceRole ? { sourceRole: String(sourceRole).trim() } : {}),
    ...(suppliesLineup ? { suppliesLineup: true } : {}),
    ...(url ? { url: String(url) } : {}),
    ...(note ? { note: String(note) } : {})
  };
}

export function createPredictionDocument({
  generatedAt = new Date(),
  generator = {},
  inputs = [],
  sources = []
} = {}) {
  const normalizedGeneratedAt = isoTimestamp(generatedAt);

  return {
    schemaVersion: LINEUP_PREDICTION_SCHEMA_VERSION,
    generatedAt: normalizedGeneratedAt,
    engine: {
      id: LINEUP_PREDICTION_ENGINE_ID,
      version: LINEUP_PREDICTION_ENGINE_VERSION,
      ...(generator.runId ? { runId: String(generator.runId) } : {})
    },
    sources,
    inputs,
    fixtures: []
  };
}

export function createProviderEvidence({
  confidence = {},
  fixtureId,
  notes = [],
  providerId,
  sourceIds = [],
  teamId,
  type,
  updatedAt = new Date(),
  weight = 1
}) {
  if (!providerId || !String(providerId).trim()) {
    throw new Error("Provider evidence requires providerId");
  }
  if (!fixtureId || !String(fixtureId).trim()) {
    throw new Error("Provider evidence requires fixtureId");
  }
  if (!teamId || !String(teamId).trim()) {
    throw new Error("Provider evidence requires teamId");
  }
  if (!type || !String(type).trim()) {
    throw new Error("Provider evidence requires type");
  }

  return {
    providerId: String(providerId).trim(),
    fixtureId: String(fixtureId).trim(),
    teamId: String(teamId).trim(),
    type: String(type).trim(),
    weight: Number.isFinite(Number(weight)) ? Number(weight) : 1,
    confidence: normalizeConfidence(confidence),
    sourceIds: [...new Set(sourceIds.map((sourceId) => String(sourceId).trim()).filter(Boolean))],
    updatedAt: isoTimestamp(updatedAt),
    notes: notes.map((note) => String(note).trim()).filter(Boolean)
  };
}

export function createPredictedPlayer({
  confidence = {},
  evidence = [],
  name,
  notes = [],
  number = "",
  position,
  sourceIds = [],
  x,
  y
}) {
  if (!name || !String(name).trim()) {
    throw new Error("Predicted player requires name");
  }
  if (!position || !String(position).trim()) {
    throw new Error(`Predicted player "${name}" requires position`);
  }

  return {
    name: String(name).trim(),
    number: String(number ?? "").trim(),
    position: String(position).trim(),
    x: Number(x),
    y: Number(y),
    confidence: normalizeConfidence(confidence),
    sourceIds: [...new Set(sourceIds.map((sourceId) => String(sourceId).trim()).filter(Boolean))],
    evidence: evidence.map((item) => String(item).trim()).filter(Boolean),
    notes: notes.map((note) => String(note).trim()).filter(Boolean)
  };
}

export function createPredictedSide({
  bench = [],
  coach = null,
  evidence = [],
  formation,
  players,
  sourceIds = [],
  teamId
}) {
  if (!formation || !String(formation).trim()) {
    throw new Error("Predicted side requires formation");
  }
  if (!Array.isArray(players) || players.length !== 11) {
    throw new Error("Predicted side requires exactly 11 starters");
  }
  if (!teamId || !String(teamId).trim()) {
    throw new Error("Predicted side requires teamId");
  }

  return {
    teamId: String(teamId).trim(),
    formation: String(formation).trim(),
    ...(coach ? { coach } : {}),
    players,
    bench,
    events: {},
    sourceIds: [...new Set(sourceIds.map((sourceId) => String(sourceId).trim()).filter(Boolean))],
    evidence
  };
}

export function createExpectedLineupRecord({
  confidence,
  evidence = {},
  fixtureId,
  lastUpdated = new Date(),
  lineup,
  mode = "expected",
  notes = [],
  predictionClass = "forecast",
  providerRefs = [],
  sourceIds = []
}) {
  const normalizedMode = String(mode || "").trim().toLowerCase();
  if (!EXPECTED_LINEUP_MODES.has(normalizedMode)) {
    throw new Error(`Expected lineup mode must be expected or probable, not "${mode}"`);
  }
  if (!fixtureId || !String(fixtureId).trim()) {
    throw new Error("Expected lineup record requires fixtureId");
  }
  if (!lineup || typeof lineup !== "object" || Array.isArray(lineup)) {
    throw new Error(`Expected lineup record "${fixtureId}" requires lineup`);
  }

  const normalizedLastUpdated = isoTimestamp(lastUpdated);
  const normalizedConfidence = normalizeConfidence(confidence);
  const normalizedSourceIds = [...new Set(sourceIds.map((sourceId) => String(sourceId).trim()).filter(Boolean))];

  return {
    fixtureId: String(fixtureId).trim(),
    mode: normalizedMode,
    predictionClass: predictionClass === "reported-xi-assisted" ? "reported-xi-assisted" : "forecast",
    sourceIds: normalizedSourceIds,
    lastUpdated: normalizedLastUpdated,
    confidence: normalizedConfidence,
    providers: providerRefs,
    evidence,
    notes: notes.map((note) => String(note).trim()).filter(Boolean),
    lineup: {
      ...lineup,
      mode: normalizedMode,
      predictionClass: predictionClass === "reported-xi-assisted" ? "reported-xi-assisted" : "forecast",
      teamSheetSource: lineup.teamSheetSource || "editorial",
      eventSource: lineup.eventSource || "editorial",
      layoutSource: lineup.layoutSource || EXPECTED_LINEUP_LAYOUT_SOURCE,
      layoutVerification: lineup.layoutVerification || {
        status: "unverified",
        exact: false,
        source: EXPECTED_LINEUP_LAYOUT_SOURCE,
        checkedAt: normalizedLastUpdated
      },
      confidence: normalizedConfidence,
      sourceIds: normalizedSourceIds,
      checkedAt: normalizedLastUpdated,
      updatedAt: normalizedLastUpdated
    }
  };
}
