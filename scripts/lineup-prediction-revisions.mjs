import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function compactConfidence(confidence) {
  if (!confidence || typeof confidence !== "object") return confidence || null;
  return {
    label: confidence.label,
    score: confidence.score,
    ...(confidence.method ? { method: confidence.method } : {}),
    ...(confidence.reason ? { reason: confidence.reason } : {})
  };
}

function compactPlayer(player = {}) {
  return {
    name: player.name,
    number: String(player.number || ""),
    position: player.position,
    ...(Number.isFinite(Number(player.x)) ? { x: Number(player.x) } : {}),
    ...(Number.isFinite(Number(player.y)) ? { y: Number(player.y) } : {}),
    confidence: compactConfidence(player.confidence),
    sourceIds: player.sourceIds || []
  };
}

function compactProviderSide(side = {}) {
  const compactCandidatePlayer = (player = {}) => ({
    name: player.name,
    position: player.position
  });
  return {
    teamId: side.teamId,
    formation: side.formation,
    confidence: compactConfidence(side.confidence),
    ...(side.evidenceStrengthCap !== undefined ? { evidenceStrengthCap: side.evidenceStrengthCap } : {}),
    starters: (side.starters || []).map(compactCandidatePlayer),
    benchCandidates: (side.benchCandidates || []).map(compactCandidatePlayer),
    unavailable: side.unavailable || [],
    sourceIds: side.sourceIds || []
  };
}

function compactSelectedSide(side = {}) {
  return {
    teamId: side.teamId,
    formation: side.formation,
    players: (side.players || []).map(compactPlayer),
    bench: (side.bench || []).map(compactPlayer),
    sourceIds: side.sourceIds || []
  };
}

function compactSideEvidence(evidence = {}) {
  return {
    confidence: compactConfidence(evidence.confidence),
    semantics: evidence.semantics,
    independentSourceCount: evidence.independentSourceCount,
    formationScores: evidence.formationScores || [],
    disputedSlots: evidence.disputedSlots || []
  };
}

function compactPrediction(prediction) {
  if (!prediction) return null;
  return {
    fixtureId: prediction.fixtureId,
    mode: prediction.mode,
    predictionClass: prediction.predictionClass || prediction.lineup?.predictionClass || "forecast",
    lastUpdated: prediction.lastUpdated,
    confidence: compactConfidence(prediction.confidence),
    sourceIds: prediction.sourceIds || [],
    providers: prediction.providers || prediction.providerRefs || [],
    evidence: {
      home: compactSideEvidence(prediction.evidence?.home),
      away: compactSideEvidence(prediction.evidence?.away)
    },
    lineup: {
      home: compactSelectedSide(prediction.lineup?.home),
      away: compactSelectedSide(prediction.lineup?.away)
    }
  };
}

function compactProviderCandidate(candidate = {}) {
  return {
    providerId: candidate.providerId,
    providerVersion: candidate.providerVersion,
    fixtureId: candidate.fixtureId,
    mode: candidate.mode,
    predictionClass: candidate.predictionClass || "forecast",
    claimStrength: candidate.claimStrength,
    updatedAt: candidate.updatedAt,
    confidence: compactConfidence(candidate.confidence),
    sourceIds: candidate.sourceIds || [],
    lineupSourceIds: candidate.lineupSourceIds || candidate.sourceIds || [],
    sides: {
      ...(candidate.sides?.home ? { home: compactProviderSide(candidate.sides.home) } : {}),
      ...(candidate.sides?.away ? { away: compactProviderSide(candidate.sides.away) } : {})
    }
  };
}

export function compactPredictionAuditRevision(auditDocument = {}) {
  return {
    schemaVersion: "2",
    generatedAt: auditDocument.generatedAt,
    revisionId: auditDocument.revisionId,
    engine: auditDocument.engine || {},
    inputs: auditDocument.inputs || [],
    sources: (auditDocument.sources || []).map((source) => ({
      id: source.id,
      label: source.label,
      type: source.type,
      checkedAt: source.checkedAt,
      ...(source.sourceRole ? { sourceRole: source.sourceRole } : {}),
      ...(source.suppliesLineup ? { suppliesLineup: true } : {}),
      ...(source.url ? { url: source.url } : {})
    })),
    fixtures: (auditDocument.fixtures || []).map((record) => ({
      fixture: {
        id: record.fixture?.id,
        matchNumber: record.fixture?.matchNumber,
        stage: record.fixture?.stage,
        round: record.fixture?.round,
        kickoffUtc: record.fixture?.kickoffUtc,
        status: record.fixture?.status,
        homeTeamId: record.fixture?.homeTeamId,
        awayTeamId: record.fixture?.awayTeamId
      },
      prediction: compactPrediction(record.prediction),
      providerCandidates: (record.providerCandidates || []).map(compactProviderCandidate)
    }))
  };
}

async function readOptionalJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

export async function appendPredictionAuditRevision(auditDocument, {
  outputPath = path.join(root, "data/lineup-prediction-revisions.json")
} = {}) {
  if (!auditDocument?.revisionId) {
    throw new Error("Prediction audit revision requires a deterministic revisionId");
  }

  const ledger = await readOptionalJson(outputPath, {
    schemaVersion: "1",
    updatedAt: auditDocument.generatedAt,
    revisions: []
  });
  const revisions = (Array.isArray(ledger.revisions) ? ledger.revisions : [])
    .map(compactPredictionAuditRevision);
  const compactRevision = compactPredictionAuditRevision(auditDocument);
  const added = !revisions.some((revision) => revision.revisionId === auditDocument.revisionId);

  const nextLedger = {
    ...ledger,
    schemaVersion: "2",
    updatedAt: added ? auditDocument.generatedAt : ledger.updatedAt,
    revisions: [...revisions, ...(added ? [compactRevision] : [])]
      .sort((left, right) => String(left.generatedAt).localeCompare(String(right.generatedAt)))
  };
  if (added || ledger.schemaVersion !== "2" || JSON.stringify(revisions) !== JSON.stringify(ledger.revisions || [])) {
    await writeFile(outputPath, `${JSON.stringify(nextLedger, null, 2)}\n`);
  }
  return { added, ledger: nextLedger };
}
