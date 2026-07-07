import { normalizePlayerName } from "../player-name-matching.mjs";
import { normalizeConfidence } from "./model.mjs";

function normalizeString(value) {
  return String(value || "").trim();
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => normalizeString(value)).filter(Boolean))];
}

function playerKey(player) {
  return normalizePlayerName(player?.name);
}

export function getProviderWeight(providerId, weights = {}) {
  const value = Number(weights[providerId]);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function scoreProviderCandidate(candidate, options = {}) {
  const providerWeight = getProviderWeight(candidate.providerId, options.providerWeights);
  const confidence = normalizeConfidence(candidate.confidence);
  const completeness =
    candidate.sides?.home?.starters?.length === 11 && candidate.sides?.away?.starters?.length === 11
      ? 1
      : 0.6;

  return Number((providerWeight * (0.65 + confidence.score * 0.35) * completeness).toFixed(3));
}

export function scoreSideCandidate(candidate, side, options = {}) {
  const sideCandidate = candidate.sides?.[side];
  if (!sideCandidate) {
    return null;
  }

  const providerWeight = getProviderWeight(candidate.providerId, options.providerWeights);
  const candidateScore = scoreProviderCandidate(candidate, options);
  const starterCompleteness = sideCandidate.starters.length === 11 ? 1 : Math.max(0.1, sideCandidate.starters.length / 11);
  const sideConfidence = normalizeConfidence(sideCandidate.confidence || candidate.confidence);

  return {
    candidate,
    side,
    sideCandidate,
    score: Number((candidateScore * providerWeight * starterCompleteness * (0.75 + sideConfidence.score * 0.25)).toFixed(3))
  };
}

function addPlayerScore(scores, player, source) {
  const key = playerKey(player);
  if (!key) {
    return;
  }

  const confidence = normalizeConfidence(player.confidence);
  const baseScore = Number(source.baseScore || 0);
  const roleMultiplier = source.role === "starter" ? 1 : 0.45;
  const score = baseScore * roleMultiplier * (0.65 + confidence.score * 0.35);
  const existing = scores.get(key) || {
    name: player.name,
    number: player.number || "",
    position: player.position || "",
    score: 0,
    starterVotes: 0,
    benchVotes: 0,
    sourceIds: [],
    providerIds: [],
    evidence: [],
    notes: [],
    player
  };

  existing.score = Number((existing.score + score).toFixed(3));
  existing.number ||= player.number || "";
  existing.position ||= player.position || "";
  existing.player = {
    ...existing.player,
    ...player,
    confidence: existing.player?.confidence?.score >= confidence.score ? existing.player.confidence : confidence
  };
  if (source.role === "starter") {
    existing.starterVotes += 1;
  } else {
    existing.benchVotes += 1;
  }
  existing.sourceIds = uniqueStrings([...existing.sourceIds, ...(player.sourceIds || []), ...(source.sourceIds || [])]);
  existing.providerIds = uniqueStrings([...existing.providerIds, source.providerId]);
  existing.evidence = uniqueStrings([...existing.evidence, ...(player.evidence || []), source.evidenceLabel]);
  existing.notes = uniqueStrings([...existing.notes, ...(player.notes || [])]);
  scores.set(key, existing);
}

export function scoreSidePlayers(scoredSideCandidates) {
  const scores = new Map();

  for (const scoredCandidate of scoredSideCandidates) {
    const { candidate, score, sideCandidate } = scoredCandidate;
    const source = {
      baseScore: score,
      providerId: candidate.providerId,
      sourceIds: candidate.sourceIds,
      evidenceLabel: `${candidate.providerId}: ${sideCandidate.teamId} ${sideCandidate.formation || "lineup"}`
    };

    for (const [index, player] of sideCandidate.starters.entries()) {
      addPlayerScore(scores, player, {
        ...source,
        evidenceLabel: `${source.evidenceLabel} starter ${index + 1}`,
        role: "starter"
      });
    }

    for (const [index, player] of sideCandidate.benchCandidates.entries()) {
      addPlayerScore(scores, player, {
        ...source,
        evidenceLabel: `${source.evidenceLabel} bench ${index + 1}`,
        role: "bench"
      });
    }
  }

  return [...scores.values()].sort((left, right) =>
    right.score - left.score ||
      right.starterVotes - left.starterVotes ||
      left.name.localeCompare(right.name)
  );
}

export function scoreFormation(scoredSideCandidates) {
  const formationScores = new Map();

  for (const scoredCandidate of scoredSideCandidates) {
    const formation = normalizeString(scoredCandidate.sideCandidate.formation);
    if (!formation) {
      continue;
    }
    const existing = formationScores.get(formation) || {
      formation,
      score: 0,
      providerIds: [],
      sourceIds: []
    };
    existing.score = Number((existing.score + scoredCandidate.score).toFixed(3));
    existing.providerIds = uniqueStrings([...existing.providerIds, scoredCandidate.candidate.providerId]);
    existing.sourceIds = uniqueStrings([...existing.sourceIds, ...scoredCandidate.candidate.sourceIds]);
    formationScores.set(formation, existing);
  }

  return [...formationScores.values()].sort((left, right) =>
    right.score - left.score || left.formation.localeCompare(right.formation)
  );
}

export function scoreFixtureCandidates(fixtureId, candidates, options = {}) {
  const fixtureCandidates = candidates.filter((candidate) => candidate.fixtureId === fixtureId);
  const scoredCandidates = fixtureCandidates.map((candidate) => ({
    candidate,
    score: scoreProviderCandidate(candidate, options)
  }));

  return {
    fixtureId,
    candidates: scoredCandidates,
    home: scoreFixtureSide(fixtureCandidates, "home", options),
    away: scoreFixtureSide(fixtureCandidates, "away", options)
  };
}

export function scoreFixtureSide(fixtureCandidates, side, options = {}) {
  const scoredSideCandidates = fixtureCandidates
    .map((candidate) => scoreSideCandidate(candidate, side, options))
    .filter(Boolean)
    .sort((left, right) => right.score - left.score);

  return {
    formationScores: scoreFormation(scoredSideCandidates),
    playerScores: scoreSidePlayers(scoredSideCandidates),
    scoredSideCandidates
  };
}
