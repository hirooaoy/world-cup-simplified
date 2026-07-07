import {
  createExpectedLineupRecord,
  createPredictedPlayer,
  createPredictedSide,
  normalizeConfidence
} from "./model.mjs";
import { scoreFixtureCandidates } from "./scoring.mjs";

const DEFAULT_FORMATION = "4-2-3-1";
const DEFAULT_LOCAL_PROVIDER_IDS = new Set(["local-official-history"]);
const DEFAULT_LOCAL_ONLY_CONFIDENCE_CAP = 0.72;
const DEFAULT_SINGLE_EXTERNAL_SOURCE_CONFIDENCE_CAP = 0.74;
const DEFAULT_MAX_PLAYER_CONFIDENCE = 0.92;

const FORMATION_LAYOUTS = {
  "3-4-1-2": [
    ["GK", 50, 91],
    ["RCB", 68, 75],
    ["CB", 50, 77],
    ["LCB", 32, 75],
    ["RM", 84, 56],
    ["CM", 60, 57],
    ["CM", 40, 57],
    ["LM", 16, 56],
    ["AM", 50, 40],
    ["ST", 58, 22],
    ["ST", 42, 22]
  ],
  "3-4-3": [
    ["GK", 50, 91],
    ["RCB", 68, 75],
    ["CB", 50, 77],
    ["LCB", 32, 75],
    ["RM", 84, 56],
    ["CM", 60, 57],
    ["CM", 40, 57],
    ["LM", 16, 56],
    ["RW", 80, 28],
    ["ST", 50, 21],
    ["LW", 20, 28]
  ],
  "3-5-2": [
    ["GK", 50, 91],
    ["RCB", 68, 75],
    ["CB", 50, 77],
    ["LCB", 32, 75],
    ["RM", 84, 56],
    ["CM", 67, 54],
    ["CM", 50, 57],
    ["CM", 33, 54],
    ["LM", 16, 56],
    ["ST", 58, 22],
    ["ST", 42, 22]
  ],
  "4-1-2-3": [
    ["GK", 50, 91],
    ["RB", 85, 75],
    ["CB", 62, 75],
    ["CB", 38, 75],
    ["LB", 15, 75],
    ["DM", 50, 61],
    ["CM", 64, 49],
    ["CM", 36, 49],
    ["RW", 82, 31],
    ["ST", 50, 21],
    ["LW", 18, 31]
  ],
  "4-1-3-2": [
    ["GK", 50, 91],
    ["RB", 85, 75],
    ["CB", 62, 75],
    ["CB", 38, 75],
    ["LB", 15, 75],
    ["DM", 50, 61],
    ["RW", 78, 43],
    ["AM", 50, 42],
    ["LW", 22, 43],
    ["ST", 58, 22],
    ["ST", 42, 22]
  ],
  "4-1-4-1": [
    ["GK", 50, 91],
    ["RB", 85, 75],
    ["CB", 62, 75],
    ["CB", 38, 75],
    ["LB", 15, 75],
    ["DM", 50, 62],
    ["RM", 82, 45],
    ["CM", 60, 47],
    ["CM", 40, 47],
    ["LM", 18, 45],
    ["ST", 50, 22]
  ],
  "4-2-1-3": [
    ["GK", 50, 91],
    ["RB", 85, 75],
    ["CB", 62, 75],
    ["CB", 38, 75],
    ["LB", 15, 75],
    ["CM", 62, 59],
    ["CM", 38, 59],
    ["AM", 50, 43],
    ["RW", 82, 31],
    ["ST", 50, 21],
    ["LW", 18, 31]
  ],
  "4-2-3-1": [
    ["GK", 50, 91],
    ["RB", 85, 75],
    ["CB", 62, 75],
    ["CB", 38, 75],
    ["LB", 15, 75],
    ["CM", 34, 59],
    ["CM", 66, 59],
    ["RW", 82, 40],
    ["AM", 50, 40],
    ["LW", 18, 40],
    ["ST", 50, 20]
  ],
  "4-3-3": [
    ["GK", 50, 91],
    ["RB", 85, 75],
    ["CB", 62, 75],
    ["CB", 38, 75],
    ["LB", 15, 75],
    ["CM", 25, 53],
    ["CM", 50, 53],
    ["CM", 75, 53],
    ["RW", 82, 31],
    ["ST", 50, 21],
    ["LW", 18, 31]
  ],
  "4-4-2": [
    ["GK", 50, 91],
    ["RB", 85, 75],
    ["CB", 62, 75],
    ["CB", 38, 75],
    ["LB", 15, 75],
    ["RM", 82, 52],
    ["CM", 38, 55],
    ["CM", 62, 55],
    ["LM", 18, 52],
    ["ST", 41, 24],
    ["ST", 59, 24]
  ],
  "5-2-3": [
    ["GK", 50, 91],
    ["RWB", 88, 68],
    ["RCB", 68, 75],
    ["CB", 50, 77],
    ["LCB", 32, 75],
    ["LWB", 12, 68],
    ["CM", 60, 55],
    ["CM", 40, 55],
    ["RW", 80, 30],
    ["ST", 50, 21],
    ["LW", 20, 30]
  ],
  "5-3-2": [
    ["GK", 50, 91],
    ["RWB", 88, 68],
    ["RCB", 68, 75],
    ["CB", 50, 77],
    ["LCB", 32, 75],
    ["LWB", 12, 68],
    ["CM", 68, 52],
    ["CM", 50, 55],
    ["CM", 32, 52],
    ["ST", 58, 22],
    ["ST", 42, 22]
  ],
  "5-4-1": [
    ["GK", 50, 91],
    ["RWB", 88, 68],
    ["RCB", 68, 75],
    ["CB", 50, 77],
    ["LCB", 32, 75],
    ["LWB", 12, 68],
    ["RM", 82, 48],
    ["CM", 60, 51],
    ["CM", 40, 51],
    ["LM", 18, 48],
    ["ST", 50, 22]
  ]
};

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function playerNameKey(player) {
  return String(player?.name || "").trim().toLowerCase();
}

function getLayout(formation) {
  return FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS[DEFAULT_FORMATION];
}

function chooseFormation(scoredSide) {
  return scoredSide.formationScores[0]?.formation || DEFAULT_FORMATION;
}

function choosePrimarySide(scoredSide) {
  return scoredSide.scoredSideCandidates[0]?.sideCandidate || null;
}

function chooseStarters(scoredSide) {
  const primarySide = choosePrimarySide(scoredSide);
  const selected = [];
  const selectedKeys = new Set();

  for (const player of primarySide?.starters || []) {
    const key = playerNameKey(player);
    if (key && !selectedKeys.has(key)) {
      selected.push(player);
      selectedKeys.add(key);
    }
  }

  for (const playerScore of scoredSide.playerScores) {
    const key = playerNameKey(playerScore.player);
    if (selected.length >= 11) {
      break;
    }
    if (key && !selectedKeys.has(key)) {
      selected.push(playerScore.player);
      selectedKeys.add(key);
    }
  }

  return selected.slice(0, 11);
}

function chooseBench(scoredSide, starters) {
  const starterKeys = new Set(starters.map(playerNameKey));
  const bench = [];
  const benchKeys = new Set();
  const primarySide = choosePrimarySide(scoredSide);

  for (const player of primarySide?.benchCandidates || []) {
    const key = playerNameKey(player);
    if (key && !starterKeys.has(key) && !benchKeys.has(key)) {
      bench.push(player);
      benchKeys.add(key);
    }
  }

  for (const playerScore of scoredSide.playerScores) {
    const key = playerNameKey(playerScore.player);
    if (key && !starterKeys.has(key) && !benchKeys.has(key)) {
      bench.push(playerScore.player);
      benchKeys.add(key);
    }
  }

  return bench.slice(0, 15);
}

function playerScoreFor(scoredSide, player) {
  const key = playerNameKey(player);
  return scoredSide.playerScores.find((score) => playerNameKey(score.player) === key);
}

function normalizedPlayerEvidenceScore(playerScore, options = {}) {
  const maxScore = Number(options.maxPlayerConfidence ?? DEFAULT_MAX_PLAYER_CONFIDENCE);
  if (playerScore && typeof playerScore === "object" && !Array.isArray(playerScore)) {
    const starterVotes = Number(playerScore.starterVotes || 0);
    if (starterVotes >= 3) {
      return maxScore;
    }
    if (starterVotes === 2) {
      return Math.min(maxScore, 0.84);
    }
    if (starterVotes === 1) {
      return Math.min(maxScore, 0.72);
    }
    return 0;
  }

  const value = Number(playerScore || 0);
  return Math.max(0, Math.min(maxScore, value));
}

function localProviderIds(options = {}) {
  return new Set(options.localProviderIds || DEFAULT_LOCAL_PROVIDER_IDS);
}

function independentExternalSourceCount(scoredSide, options = {}) {
  const localIds = localProviderIds(options);
  const sourceKeys = new Set();
  const independenceKeys = options.sourceIndependenceKeys || {};
  const hasIndependenceMap = Object.keys(independenceKeys).length > 0;

  for (const scoredCandidate of scoredSide.scoredSideCandidates) {
    if (localIds.has(scoredCandidate.candidate.providerId)) {
      continue;
    }
    for (const sourceId of scoredCandidate.candidate.sourceIds || []) {
      if (hasIndependenceMap && !Object.prototype.hasOwnProperty.call(independenceKeys, sourceId)) {
        continue;
      }
      sourceKeys.add(independenceKeys[sourceId] || sourceId);
    }
  }

  return sourceKeys.size;
}

function cappedConfidenceScore(score, scoredSide, options = {}) {
  const localIds = localProviderIds(options);
  const providerIds = new Set(scoredSide.scoredSideCandidates.map((candidate) => candidate.candidate.providerId));
  const hasOnlyLocalProviders = [...providerIds].every((providerId) => localIds.has(providerId));
  if (hasOnlyLocalProviders) {
    return Math.min(score, Number(options.localOnlyConfidenceCap ?? DEFAULT_LOCAL_ONLY_CONFIDENCE_CAP));
  }

  const externalSourceCount = independentExternalSourceCount(scoredSide, options);
  if (externalSourceCount < 2) {
    return Math.min(score, Number(options.singleExternalSourceConfidenceCap ?? DEFAULT_SINGLE_EXTERNAL_SOURCE_CONFIDENCE_CAP));
  }

  return score;
}

function confidenceForSide(scoredSide, starters, options = {}) {
  if (!starters.length) {
    return normalizeConfidence({ score: 0, reason: "No starter candidates" });
  }

  const playerScores = starters
    .map((player) => normalizedPlayerEvidenceScore(playerScoreFor(scoredSide, player), options))
    .filter((score) => Number.isFinite(score));
  const averagePlayerScore = playerScores.reduce((sum, score) => sum + score, 0) / Math.max(1, playerScores.length);
  const completeness = starters.length === 11 ? 1 : starters.length / 11;
  const providerCount = new Set(scoredSide.scoredSideCandidates.map((candidate) => candidate.candidate.providerId)).size;
  const providerBonus = Math.min(0.15, Math.max(0, providerCount - 1) * 0.05);
  const rawScore = Math.max(0, Math.min(1, averagePlayerScore * 0.7 + completeness * 0.2 + providerBonus));
  const score = cappedConfidenceScore(rawScore, scoredSide, options);
  const externalSourceCount = independentExternalSourceCount(scoredSide, options);

  return normalizeConfidence({
    score,
    method: "provider-weighted-evidence-v1",
    reason:
      `${starters.length}/11 starters selected from ${providerCount} provider${providerCount === 1 ? "" : "s"}; ` +
      `${externalSourceCount} independent external source${externalSourceCount === 1 ? "" : "s"}`
  });
}

function predictedPlayerFromCandidate(player, scoredSide, slot, index, options = {}) {
  const score = playerScoreFor(scoredSide, player);
  const [slotPosition, slotX, slotY] = slot;
  const confidence = normalizeConfidence({
    score: normalizedPlayerEvidenceScore(score || player.confidence?.score || 0, options),
    method: "provider-weighted-player-evidence-v1"
  });

  return createPredictedPlayer({
    name: player.name,
    number: player.number,
    position: player.position || slotPosition,
    x: Number.isFinite(Number(player.x)) ? Number(player.x) : slotX,
    y: Number.isFinite(Number(player.y)) ? Number(player.y) : slotY,
    confidence,
    sourceIds: uniqueStrings([...(player.sourceIds || []), ...(score?.sourceIds || [])]),
    evidence: score?.evidence || [`starter candidate ${index + 1}`],
    notes: player.notes || []
  });
}

function predictedBenchPlayer(player) {
  return {
    name: player.name,
    number: String(player.number || "").trim(),
    position: String(player.position || "").trim(),
    confidence: normalizeConfidence(player.confidence),
    sourceIds: uniqueStrings(player.sourceIds || []),
    evidence: uniqueStrings(player.evidence || []),
    notes: uniqueStrings(player.notes || [])
  };
}

function buildPredictedSide(scoredSide, options = {}) {
  const formation = chooseFormation(scoredSide);
  const starters = chooseStarters(scoredSide);
  if (starters.length !== 11) {
    return null;
  }

  const layout = getLayout(formation);
  const players = starters.map((player, index) =>
    predictedPlayerFromCandidate(player, scoredSide, layout[index] || layout.at(-1), index, options)
  );
  const bench = chooseBench(scoredSide, starters).map(predictedBenchPlayer);
  const sourceIds = uniqueStrings([
    ...scoredSide.scoredSideCandidates.flatMap((candidate) => candidate.candidate.sourceIds),
    ...players.flatMap((player) => player.sourceIds || [])
  ]);

  return createPredictedSide({
    formation,
    players,
    bench,
    sourceIds,
    evidence: {
      confidence: confidenceForSide(scoredSide, starters, options),
      formationScores: scoredSide.formationScores,
      starterScores: starters
        .map((player) => playerScoreFor(scoredSide, player))
        .filter(Boolean)
        .map((score) => ({
          name: score.name,
          score: score.score,
          starterVotes: score.starterVotes,
          benchVotes: score.benchVotes,
          providerIds: score.providerIds,
          sourceIds: score.sourceIds
        }))
    }
  });
}

function recordConfidence(home, away) {
  const homeScore = Number(home?.evidence?.confidence?.score || 0);
  const awayScore = Number(away?.evidence?.confidence?.score || 0);
  return normalizeConfidence({
    score: (homeScore + awayScore) / 2,
    method: "provider-weighted-lineup-evidence-v1",
    reason: "Average confidence across predicted home and away XIs"
  });
}

export function generateFixturePrediction({ candidates, fixture, generatedAt = new Date(), options = {} }) {
  if (!fixture?.id) {
    throw new Error("generateFixturePrediction requires fixture.id");
  }

  const scored = scoreFixtureCandidates(fixture.id, candidates, options);
  const home = buildPredictedSide(scored.home, options);
  const away = buildPredictedSide(scored.away, options);
  if (!home || !away) {
    return null;
  }

  const sourceIds = uniqueStrings([
    ...home.sourceIds,
    ...away.sourceIds,
    ...scored.candidates.flatMap((candidate) => candidate.candidate.sourceIds)
  ]);
  const confidence = recordConfidence(home, away);

  return createExpectedLineupRecord({
    fixtureId: fixture.id,
    mode: confidence.score >= 0.75 ? "probable" : "expected",
    sourceIds,
    lastUpdated: generatedAt,
    confidence,
    providerRefs: scored.candidates.map(({ candidate, score }) => ({
      providerId: candidate.providerId,
      providerVersion: candidate.providerVersion,
      score,
      sourceIds: candidate.sourceIds
    })),
    evidence: {
      home: home.evidence,
      away: away.evidence
    },
    notes: ["Generated by lineup prediction engine; replaced by confirmed/live FIFA lineups when available."],
    lineup: {
      home,
      away
    }
  });
}

export function generateFixturePredictions({ candidates, fixtures, generatedAt = new Date(), options = {} }) {
  return fixtures
    .map((fixture) => generateFixturePrediction({ candidates, fixture, generatedAt, options }))
    .filter(Boolean);
}
