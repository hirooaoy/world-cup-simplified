import {
  getCanonicalPlayerKey
} from "../player-name-matching.mjs";
import { normalizeConfidence } from "./model.mjs";

const DEFAULT_RECENCY_HALF_LIFE_HOURS = 48;
const DEFAULT_MIN_RECENCY_WEIGHT = 0.45;

function normalizeString(value) {
  return String(value || "").trim();
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => normalizeString(value)).filter(Boolean))];
}

function round(value) {
  return Number(Number(value || 0).toFixed(3));
}

function playerKey(player) {
  return getCanonicalPlayerKey(player?.name);
}

function findPlayerScore(scores, player) {
  const exactKey = playerKey(player);
  return exactKey ? scores.get(exactKey) : undefined;
}

function evidencePosition(player = {}) {
  const position = normalizeString(player.position).toUpperCase();
  const x = Number(player.x);
  if (Number.isFinite(x) && x !== 50) {
    if (position === "CB") return x > 50 ? "RCB" : "LCB";
    if (position === "CM") return x > 50 ? "RCM" : "LCM";
    if (position === "ST") return x > 50 ? "RST" : "LST";
  }
  return position;
}

export function getProviderWeight(providerId, weights = {}) {
  const value = Number(weights[providerId]);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function getCandidateClaimStrength(candidate) {
  const value = Number(candidate?.claimStrength);
  return Number.isFinite(value) && value > 0 ? Math.max(0.5, Math.min(3, value)) : 1;
}

export function getCandidateSourceReliability(candidate, options = {}) {
  const reliability = options.sourceReliability || {};
  const independenceKey = getCandidateIndependenceKey(candidate, options).replace(/^source:/, "");
  const candidates = [
    ...(candidate?.sourceIds || []).map((sourceId) => reliability[sourceId]),
    reliability[independenceKey],
    reliability[`source:${independenceKey}`],
    reliability[candidate?.providerId],
    reliability[`provider:${candidate?.providerId}`]
  ];
  const value = candidates.map(Number).find((candidateValue) => Number.isFinite(candidateValue) && candidateValue > 0);
  return value === undefined ? 1 : Math.max(0.5, Math.min(1.5, value));
}

export function getCandidateRecencyWeight(candidate, options = {}) {
  const now = new Date(options.now || options.generatedAt || Date.now());
  const updatedAt = new Date(candidate?.updatedAt || "");
  if (Number.isNaN(now.getTime()) || Number.isNaN(updatedAt.getTime())) {
    return Number(options.undatedRecencyWeight ?? 0.65);
  }

  const ageHours = Math.max(0, (now.getTime() - updatedAt.getTime()) / 36e5);
  const halfLifeHours = Math.max(1, Number(options.recencyHalfLifeHours || DEFAULT_RECENCY_HALF_LIFE_HOURS));
  const minimum = Math.max(0, Math.min(1, Number(options.minRecencyWeight ?? DEFAULT_MIN_RECENCY_WEIGHT)));
  return round(Math.max(minimum, 2 ** (-ageHours / halfLifeHours)));
}

export function getCandidateIndependenceKey(candidate, options = {}) {
  const independenceKeys = options.sourceIndependenceKeys || {};
  for (const sourceId of candidate?.sourceIds || []) {
    const key = normalizeString(independenceKeys[sourceId]);
    if (key) return `source:${key}`;
  }
  const primarySourceId = normalizeString(candidate?.sourceIds?.[0]);
  if (primarySourceId) return `source:${primarySourceId}`;
  return `provider:${normalizeString(candidate?.providerId) || "unknown"}`;
}

export function scoreProviderCandidate(candidate, options = {}) {
  const providerWeight = getProviderWeight(candidate.providerId, options.providerWeights);
  const sourceReliability = getCandidateSourceReliability(candidate, options);
  const claimStrength = getCandidateClaimStrength(candidate);
  const confidence = normalizeConfidence(candidate.confidence);

  // Provider, source reliability, and explicit claim strength are each applied
  // exactly once here. Claim strength distinguishes a generic predicted XI
  // (1) from a directly reported or published team selection (up to 3).
  // Side completeness, side confidence, and recency remain separate factors.
  return round(providerWeight * sourceReliability * claimStrength * (0.65 + confidence.score * 0.35));
}

export function scoreSideCandidate(candidate, side, options = {}) {
  const sideCandidate = candidate.sides?.[side];
  if (!sideCandidate) return null;
  if (options.expectedTeamId && sideCandidate.teamId !== options.expectedTeamId) return null;

  const candidateScore = scoreProviderCandidate(candidate, options);
  const starterCompleteness = sideCandidate.starters.length === 11
    ? 1
    : Math.max(0.1, Math.min(1, sideCandidate.starters.length / 11));
  const sideConfidence = normalizeConfidence(sideCandidate.confidence || candidate.confidence);
  const recencyWeight = getCandidateRecencyWeight(candidate, options);
  const independenceKey = getCandidateIndependenceKey(candidate, options);

  return {
    candidate,
    side,
    sideCandidate,
    independenceKey,
    claimStrength: getCandidateClaimStrength(candidate),
    recencyWeight,
    sourceReliability: getCandidateSourceReliability(candidate, options),
    score: round(
      candidateScore *
      starterCompleteness *
      (0.75 + sideConfidence.score * 0.25) *
      recencyWeight
    )
  };
}

function updateIndependentEvidence(map, independenceKey, evidence) {
  const current = map.get(independenceKey);
  if (!current || evidence.score > current.score) map.set(independenceKey, evidence);
}

function addPlayerScore(scores, player, source) {
  const key = playerKey(player);
  if (!key) return;

  const confidence = normalizeConfidence(player.confidence);
  const contribution = round(Number(source.baseScore || 0) * (0.65 + confidence.score * 0.35));
  let existing = findPlayerScore(scores, player);
  if (!existing) {
    existing = {
      key,
      name: player.name,
      number: player.number || "",
      position: player.position || "",
      score: 0,
      starterScore: 0,
      benchScore: 0,
      starterVotes: 0,
      benchVotes: 0,
      independentStarterVotes: 0,
      independentBenchVotes: 0,
      sourceIds: [],
      providerIds: [],
      independenceKeys: [],
      evidence: [],
      notes: [],
      roleScores: [],
      representatives: [],
      player,
      _starterEvidence: new Map(),
      _benchEvidence: new Map(),
      _roleEvidence: new Map()
    };
    scores.set(key, existing);
  }

  const evidence = {
    player,
    score: contribution,
    providerId: source.providerId,
    sourceIds: uniqueStrings([...(player.sourceIds || []), ...(source.sourceIds || [])]),
    evidenceLabel: source.evidenceLabel,
    independenceKey: source.independenceKey,
    position: evidencePosition(player),
    recencyWeight: source.recencyWeight
  };
  const target = source.role === "starter" ? existing._starterEvidence : existing._benchEvidence;
  updateIndependentEvidence(target, source.independenceKey, evidence);
  if (source.role === "starter" && evidence.position) {
    const roleMap = existing._roleEvidence.get(evidence.position) || new Map();
    updateIndependentEvidence(roleMap, source.independenceKey, evidence);
    existing._roleEvidence.set(evidence.position, roleMap);
  }
  existing.representatives.push(evidence);
  existing.number ||= player.number || "";
  existing.position ||= player.position || "";
  existing.sourceIds = uniqueStrings([...existing.sourceIds, ...evidence.sourceIds]);
  existing.providerIds = uniqueStrings([...existing.providerIds, source.providerId]);
  existing.evidence = uniqueStrings([...existing.evidence, ...(player.evidence || []), source.evidenceLabel]);
  existing.notes = uniqueStrings([...existing.notes, ...(player.notes || [])]);
}

function independentSourceScores(scoredSideCandidates) {
  const scores = new Map();
  for (const candidate of scoredSideCandidates) {
    const current = scores.get(candidate.independenceKey);
    if (!current || candidate.score > current.score) {
      scores.set(candidate.independenceKey, {
        key: candidate.independenceKey,
        score: candidate.score,
        providerId: candidate.candidate.providerId,
        sourceIds: candidate.candidate.sourceIds,
        updatedAt: candidate.candidate.updatedAt || ""
      });
    }
  }
  return [...scores.values()].sort((left, right) => right.score - left.score || left.key.localeCompare(right.key));
}

export function scoreSidePlayers(scoredSideCandidates, sourceScores = independentSourceScores(scoredSideCandidates)) {
  const scores = new Map();
  const totalIndependentScore = sourceScores.reduce((sum, source) => sum + source.score, 0);

  for (const scoredCandidate of scoredSideCandidates) {
    const { candidate, score, sideCandidate } = scoredCandidate;
    const source = {
      baseScore: score,
      providerId: candidate.providerId,
      sourceIds: candidate.sourceIds,
      independenceKey: scoredCandidate.independenceKey,
      recencyWeight: scoredCandidate.recencyWeight,
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

  for (const existing of scores.values()) {
    const starterEvidence = [...existing._starterEvidence.values()];
    const benchEvidence = [...existing._benchEvidence.values()];
    existing.starterScore = round(starterEvidence.reduce((sum, item) => sum + item.score, 0));
    existing.benchScore = round(benchEvidence.reduce((sum, item) => sum + item.score, 0));
    existing.score = round(Math.max(0, existing.starterScore - existing.benchScore * 0.55));
    existing.starterVotes = starterEvidence.length;
    existing.benchVotes = benchEvidence.length;
    existing.independentStarterVotes = starterEvidence.length;
    existing.independentBenchVotes = benchEvidence.length;
    existing.independenceKeys = uniqueStrings([
      ...starterEvidence.map((item) => item.independenceKey),
      ...benchEvidence.map((item) => item.independenceKey)
    ]);
    existing.starterSupport = round(totalIndependentScore ? existing.starterScore / totalIndependentScore : 0);
    existing.benchSupport = round(totalIndependentScore ? existing.benchScore / totalIndependentScore : 0);
    existing.evidenceStrength = round(Math.max(0, Math.min(1, existing.starterSupport - existing.benchSupport * 0.4)));
    existing.roleScores = [...existing._roleEvidence.entries()]
      .map(([position, evidenceBySource]) => ({
        position,
        score: round([...evidenceBySource.values()].reduce((sum, item) => sum + item.score, 0)),
        independentVotes: evidenceBySource.size
      }))
      .sort((left, right) => right.score - left.score || left.position.localeCompare(right.position));
    existing.representatives.sort((left, right) =>
      right.score - left.score || right.recencyWeight - left.recencyWeight
    );
    existing.player = existing.representatives[0]?.player || existing.player;
    delete existing._starterEvidence;
    delete existing._benchEvidence;
    delete existing._roleEvidence;
  }

  return [...scores.values()].sort((left, right) =>
    right.score - left.score ||
    right.independentStarterVotes - left.independentStarterVotes ||
    left.name.localeCompare(right.name)
  );
}

export function scoreFormation(scoredSideCandidates) {
  const formationScores = new Map();
  for (const scoredCandidate of scoredSideCandidates) {
    const formation = normalizeString(scoredCandidate.sideCandidate.formation);
    if (!formation) continue;
    const existing = formationScores.get(formation) || {
      formation,
      score: 0,
      providerIds: [],
      sourceIds: [],
      independenceKeys: [],
      _evidence: new Map()
    };
    updateIndependentEvidence(existing._evidence, scoredCandidate.independenceKey, {
      score: scoredCandidate.score,
      providerId: scoredCandidate.candidate.providerId,
      sourceIds: scoredCandidate.candidate.sourceIds,
      independenceKey: scoredCandidate.independenceKey
    });
    formationScores.set(formation, existing);
  }

  for (const existing of formationScores.values()) {
    const evidence = [...existing._evidence.values()];
    existing.score = round(evidence.reduce((sum, item) => sum + item.score, 0));
    existing.providerIds = uniqueStrings(evidence.map((item) => item.providerId));
    existing.sourceIds = uniqueStrings(evidence.flatMap((item) => item.sourceIds));
    existing.independenceKeys = uniqueStrings(evidence.map((item) => item.independenceKey));
    existing.independentVotes = existing.independenceKeys.length;
    delete existing._evidence;
  }

  return [...formationScores.values()].sort((left, right) =>
    right.score - left.score || left.formation.localeCompare(right.formation)
  );
}

export function scoreFixtureCandidates(fixtureOrId, candidates, options = {}) {
  const fixture = typeof fixtureOrId === "string" ? { id: fixtureOrId } : fixtureOrId || {};
  const fixtureCandidates = candidates.filter((candidate) => candidate.fixtureId === fixture.id);
  const scoredCandidates = fixtureCandidates.map((candidate) => ({
    candidate,
    score: scoreProviderCandidate(candidate, options),
    recencyWeight: getCandidateRecencyWeight(candidate, options),
    sourceReliability: getCandidateSourceReliability(candidate, options),
    independenceKey: getCandidateIndependenceKey(candidate, options)
  }));

  return {
    fixtureId: fixture.id,
    candidates: scoredCandidates,
    home: scoreFixtureSide(fixtureCandidates, "home", {
      ...options,
      expectedTeamId: fixture.homeTeamId || options.homeTeamId
    }),
    away: scoreFixtureSide(fixtureCandidates, "away", {
      ...options,
      expectedTeamId: fixture.awayTeamId || options.awayTeamId
    })
  };
}

export function scoreFixtureSide(fixtureCandidates, side, options = {}) {
  const scoredSideCandidates = fixtureCandidates
    .map((candidate) => scoreSideCandidate(candidate, side, options))
    .filter(Boolean)
    .sort((left, right) => right.score - left.score);
  const sourceScores = independentSourceScores(scoredSideCandidates);

  return {
    teamId: options.expectedTeamId || scoredSideCandidates[0]?.sideCandidate?.teamId || "",
    formationScores: scoreFormation(scoredSideCandidates),
    playerScores: scoreSidePlayers(scoredSideCandidates, sourceScores),
    independentSourceScores: sourceScores,
    unavailableNames: uniqueStrings(
      scoredSideCandidates.flatMap((candidate) =>
        (candidate.sideCandidate.unavailable || []).map((player) => player.name)
      )
    ),
    scoredSideCandidates
  };
}
