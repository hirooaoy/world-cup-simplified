import {
  createExpectedLineupRecord,
  createPredictedPlayer,
  createPredictedSide,
  normalizeConfidence
} from "./model.mjs";
import {
  DEFAULT_PREDICTED_FORMATION,
  resolveFormationLayout
} from "./formations.mjs";
import { scoreFixtureCandidates } from "./scoring.mjs";
import {
  getCanonicalPlayerKey,
  resolvePlayerNameInPool
} from "../player-name-matching.mjs";

const DEFAULT_LOCAL_PROVIDER_IDS = new Set(["local-official-history"]);
const DEFAULT_LOCAL_ONLY_CONFIDENCE_CAP = 0.72;
const DEFAULT_SINGLE_EXTERNAL_SOURCE_CONFIDENCE_CAP = 0.74;
const DEFAULT_MAX_PLAYER_CONFIDENCE = 0.92;

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function playerNameKey(player) {
  return getCanonicalPlayerKey(player?.name);
}

function normalizeProfilesData(data) {
  const profiles = data?.profiles || data?.players || data || {};
  return profiles && typeof profiles === "object" && !Array.isArray(profiles) ? profiles : {};
}

function createPlayerProfileLookup(playerProfilesData) {
  const profiles = normalizeProfilesData(playerProfilesData);
  const byName = new Map();
  for (const profile of Object.values(profiles)) {
    for (const name of [profile?.name, profile?.displayName]) {
      const key = getCanonicalPlayerKey(name);
      if (!key) continue;
      if (profile?.teamId) byName.set(`${profile.teamId}:${key}`, profile);
      if (!byName.has(key)) byName.set(key, profile);
    }
  }
  return byName;
}

function createRosterLookup(playerProfilesData) {
  const byTeamId = new Map();
  for (const profile of Object.values(normalizeProfilesData(playerProfilesData))) {
    const teamId = String(profile?.teamId || "").trim();
    if (!teamId) continue;
    const profiles = byTeamId.get(teamId) || [];
    if (!profiles.includes(profile)) profiles.push(profile);
    byTeamId.set(teamId, profiles);
  }
  return byTeamId;
}

function findPlayerProfile(playerProfilesByName, player, teamId = "") {
  const key = playerNameKey(player);
  const exact = playerProfilesByName.get(teamId ? `${teamId}:${key}` : key) || playerProfilesByName.get(key);
  if (exact && (!teamId || exact.teamId === teamId)) return exact;
  const teamProfiles = [...new Set(playerProfilesByName.values())]
    .filter((profile) => !teamId || profile.teamId === teamId);
  const resolved = resolvePlayerNameInPool(player?.name, teamProfiles, {
    getIdentityKey: (profile) => profile.name || profile.displayName,
    getNames: (profile) => [profile.name, profile.displayName]
  });
  return resolved.status === "matched" ? resolved.candidate : null;
}

function canonicalizeProviderPlayer(player, playerProfilesByName, teamId) {
  const profile = findPlayerProfile(playerProfilesByName, player, teamId);
  return profile
    ? { ...player, name: profile.displayName || profile.name || player.name }
    : player;
}

function canonicalizeCandidatesForScoring(candidates, fixture, playerProfilesByName) {
  return candidates.map((candidate) => ({
    ...candidate,
    sides: Object.fromEntries(
      Object.entries(candidate.sides || {}).map(([side, sideCandidate]) => {
        const teamId = sideCandidate.teamId || fixture?.[`${side}TeamId`] || "";
        return [side, {
          ...sideCandidate,
          starters: (sideCandidate.starters || []).map((player) =>
            canonicalizeProviderPlayer(player, playerProfilesByName, teamId)
          ),
          benchCandidates: (sideCandidate.benchCandidates || []).map((player) =>
            canonicalizeProviderPlayer(player, playerProfilesByName, teamId)
          ),
          unavailable: (sideCandidate.unavailable || []).map((player) =>
            canonicalizeProviderPlayer(player, playerProfilesByName, teamId)
          )
        }];
      })
    )
  }));
}

function createCoachProfileLookup(coachProfilesData) {
  const profiles = normalizeProfilesData(coachProfilesData);
  const byTeamId = new Map();
  for (const profile of Object.values(profiles)) {
    const teamId = String(profile?.teamId || "").trim();
    if (teamId && !byTeamId.has(teamId)) {
      byTeamId.set(teamId, profile);
    }
  }
  return byTeamId;
}

function chooseFormation(scoredSide) {
  return scoredSide.formationScores[0]?.formation || DEFAULT_PREDICTED_FORMATION;
}

function samePlayer(left, right) {
  const leftKey = getCanonicalPlayerKey(left?.name);
  return Boolean(leftKey && leftKey === getCanonicalPlayerKey(right?.name));
}

function resolveTeamIdentity(value, scoredSide, options = {}) {
  const roster = options.rosterByTeamId?.get(scoredSide.teamId) || [];
  const candidatePool = (scoredSide.playerScores || []).map((score) => score.player);
  const primaryPool = roster.length ? roster : candidatePool;
  const primary = resolvePlayerNameInPool(value, primaryPool, roster.length
    ? {
        getIdentityKey: (profile) => profile.name || profile.displayName,
        getNames: (profile) => [profile.name, profile.displayName]
      }
    : undefined);
  if (primary.status !== "unmatched" || primaryPool === candidatePool) return primary;
  return resolvePlayerNameInPool(value, candidatePool);
}

function isUnavailable(scoredSide, player, options = {}) {
  const playerIdentity = resolveTeamIdentity(player, scoredSide, options);
  if (playerIdentity.status !== "matched") return false;
  return (scoredSide.unavailableNames || []).some((name) => {
    const unavailableIdentity = resolveTeamIdentity(name, scoredSide, options);
    return unavailableIdentity.status === "matched" && unavailableIdentity.key === playerIdentity.key;
  });
}

function isOnKnownRoster(player, teamId, options = {}) {
  if (options.enforceRosterMembership === false) return true;
  const roster = options.rosterByTeamId?.get(teamId) || [];
  if (roster.length < 11) return true;
  return resolvePlayerNameInPool(player?.name, roster, {
    getIdentityKey: (profile) => profile.name || profile.displayName,
    getNames: (profile) => [profile.name, profile.displayName]
  }).status === "matched";
}

function playerScoreFor(scoredSide, player) {
  return scoredSide.playerScores.find((score) => samePlayer(score.player, player));
}

function getPredictedPlayerNumber(player, score, playerProfilesByName, teamId) {
  const profile = findPlayerProfile(playerProfilesByName, player, teamId);
  return String(
    player?.number ||
      score?.number ||
      score?.player?.number ||
      player?.uniformNumber ||
      profile?.uniformNumber ||
      ""
  ).trim();
}

function normalizedPlayerEvidenceScore(playerScore, options = {}) {
  const maxScore = Number(options.maxPlayerConfidence ?? DEFAULT_MAX_PLAYER_CONFIDENCE);
  if (playerScore && typeof playerScore === "object" && !Array.isArray(playerScore)) {
    return Math.max(0, Math.min(maxScore, Number(playerScore.evidenceStrength || 0)));
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

  for (const scoredCandidate of scoredSide.scoredSideCandidates) {
    if (localIds.has(scoredCandidate.candidate.providerId)) {
      continue;
    }
    sourceKeys.add(scoredCandidate.independenceKey);
  }

  return sourceKeys.size;
}

function cappedConfidenceScore(score, scoredSide, options = {}) {
  const localIds = localProviderIds(options);
  const providerIds = new Set(scoredSide.scoredSideCandidates.map((candidate) => candidate.candidate.providerId));
  const hasOnlyLocalProviders = [...providerIds].every((providerId) => localIds.has(providerId));
  if (hasOnlyLocalProviders) {
    const sideCaps = scoredSide.scoredSideCandidates
      .map((candidate) => Number(candidate.sideCandidate.evidenceStrengthCap))
      .filter(Number.isFinite);
    return Math.min(
      score,
      Number(options.localOnlyConfidenceCap ?? DEFAULT_LOCAL_ONLY_CONFIDENCE_CAP),
      ...(sideCaps.length ? sideCaps : [1])
    );
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
    .map((starter) => normalizedPlayerEvidenceScore(starter.playerScore, options))
    .filter((score) => Number.isFinite(score));
  const averagePlayerScore = playerScores.reduce((sum, score) => sum + score, 0) / Math.max(1, playerScores.length);
  const completeness = starters.length === 11 ? 1 : starters.length / 11;
  const providerCount = new Set(scoredSide.scoredSideCandidates.map((candidate) => candidate.candidate.providerId)).size;
  const totalSourceScore = scoredSide.independentSourceScores.reduce((sum, source) => sum + source.score, 0);
  const formationScore = Number(scoredSide.formationScores[0]?.score || 0);
  const formationSupport = totalSourceScore ? Math.min(1, formationScore / totalSourceScore) : 0;
  const rawScore = Math.max(0, Math.min(0.95, averagePlayerScore * 0.72 + formationSupport * 0.18 + completeness * 0.1));
  const score = cappedConfidenceScore(rawScore, scoredSide, options);
  const externalSourceCount = independentExternalSourceCount(scoredSide, options);

  return normalizeConfidence({
    score,
    method: "evidence-strength-v2",
    reason:
      `Evidence strength from ${starters.length}/11 role-constrained consensus starters, ` +
      `${providerCount} provider${providerCount === 1 ? "" : "s"}, and ${externalSourceCount} independent external ` +
      `source${externalSourceCount === 1 ? "" : "s"}; this is not a calibrated probability.`
  });
}

const RIGHT_ROLES = new Set(["RB", "RWB", "RCB", "RCM", "RM", "RAM", "RW", "RST"]);
const LEFT_ROLES = new Set(["LB", "LWB", "LCB", "LCM", "LM", "LAM", "LW", "LST"]);
const CENTRAL_DEFENCE_ROLES = new Set(["CB", "RCB", "LCB"]);
const CENTRAL_MIDFIELD_ROLES = new Set(["DM", "CM", "RCM", "LCM", "AM", "RAM", "LAM"]);
const CENTRAL_ATTACK_ROLES = new Set(["ST", "RST", "LST"]);

function roleCompatibility(sourcePosition, slotPosition) {
  const source = String(sourcePosition || "").toUpperCase();
  const slot = String(slotPosition || "").toUpperCase();
  if (!source) return 0.35;
  if (source === slot) return 1;
  if (source === "GK" || slot === "GK") return 0;
  if (
    (RIGHT_ROLES.has(source) && LEFT_ROLES.has(slot)) ||
    (LEFT_ROLES.has(source) && RIGHT_ROLES.has(slot))
  ) return 0.12;
  if (CENTRAL_DEFENCE_ROLES.has(source) && CENTRAL_DEFENCE_ROLES.has(slot)) return 0.95;
  if (RIGHT_ROLES.has(source) && RIGHT_ROLES.has(slot)) return 0.82;
  if (LEFT_ROLES.has(source) && LEFT_ROLES.has(slot)) return 0.82;
  if (CENTRAL_MIDFIELD_ROLES.has(source) && CENTRAL_MIDFIELD_ROLES.has(slot)) return 0.82;
  if (CENTRAL_ATTACK_ROLES.has(source) && CENTRAL_ATTACK_ROLES.has(slot)) return 0.95;
  if ((CENTRAL_ATTACK_ROLES.has(source) && ["AM", "RAM", "LAM", "RW", "LW"].includes(slot)) ||
      (CENTRAL_ATTACK_ROLES.has(slot) && ["AM", "RAM", "LAM", "RW", "LW"].includes(source))) return 0.48;
  if ((CENTRAL_MIDFIELD_ROLES.has(source) && ["LM", "RM", "LW", "RW"].includes(slot)) ||
      (CENTRAL_MIDFIELD_ROLES.has(slot) && ["LM", "RM", "LW", "RW"].includes(source))) return 0.42;
  if ((CENTRAL_DEFENCE_ROLES.has(source) && ["RB", "LB", "RWB", "LWB", "DM"].includes(slot)) ||
      (CENTRAL_DEFENCE_ROLES.has(slot) && ["RB", "LB", "RWB", "LWB", "DM"].includes(source))) return 0.38;
  return 0.16;
}

function roleEvidenceForSlot(playerScore, slotPosition) {
  return Math.max(
    0,
    ...(playerScore.roleScores || []).map((role) => role.score * roleCompatibility(role.position, slotPosition))
  );
}

function assignmentWeight(playerScore, slotPosition) {
  const bestRoleCompatibility = Math.max(
    0,
    ...(playerScore.roleScores || []).map((role) => roleCompatibility(role.position, slotPosition))
  );
  if (slotPosition === "GK" && bestRoleCompatibility === 0) return -1_000_000;
  const roleEvidence = roleEvidenceForSlot(playerScore, slotPosition);
  return Number((
    playerScore.score * (0.72 + bestRoleCompatibility * 0.28) +
    roleEvidence * 0.35
  ).toFixed(6));
}

function maximizeAssignment(weights) {
  const rowCount = weights.length;
  const columnCount = weights[0]?.length || 0;
  if (!rowCount || columnCount < rowCount) return null;
  const maximum = Math.max(...weights.flat());
  const costs = weights.map((row) => row.map((weight) => maximum - weight));
  const u = Array(rowCount + 1).fill(0);
  const v = Array(columnCount + 1).fill(0);
  const p = Array(columnCount + 1).fill(0);
  const way = Array(columnCount + 1).fill(0);

  for (let row = 1; row <= rowCount; row += 1) {
    p[0] = row;
    let column0 = 0;
    const minValue = Array(columnCount + 1).fill(Infinity);
    const used = Array(columnCount + 1).fill(false);
    do {
      used[column0] = true;
      const row0 = p[column0];
      let delta = Infinity;
      let column1 = 0;
      for (let column = 1; column <= columnCount; column += 1) {
        if (used[column]) continue;
        const current = costs[row0 - 1][column - 1] - u[row0] - v[column];
        if (current < minValue[column]) {
          minValue[column] = current;
          way[column] = column0;
        }
        if (minValue[column] < delta) {
          delta = minValue[column];
          column1 = column;
        }
      }
      for (let column = 0; column <= columnCount; column += 1) {
        if (used[column]) {
          u[p[column]] += delta;
          v[column] -= delta;
        } else {
          minValue[column] -= delta;
        }
      }
      column0 = column1;
    } while (p[column0] !== 0);
    do {
      const column1 = way[column0];
      p[column0] = p[column1];
      column0 = column1;
    } while (column0 !== 0);
  }

  const assignment = Array(rowCount).fill(-1);
  for (let column = 1; column <= columnCount; column += 1) {
    if (p[column] > 0) assignment[p[column] - 1] = column - 1;
  }
  return assignment;
}

function representativeForSlot(playerScore, slotPosition) {
  return [...(playerScore.representatives || [])]
    .sort((left, right) =>
      right.score * roleCompatibility(right.position, slotPosition) -
        left.score * roleCompatibility(left.position, slotPosition) ||
      right.score - left.score
    )[0]?.player || playerScore.player;
}

function chooseConsensusStarters(scoredSide, layout, options = {}) {
  const candidates = scoredSide.playerScores.filter((score) =>
    score.starterScore > 0 &&
    !isUnavailable(scoredSide, score.player, options) &&
    isOnKnownRoster(score.player, scoredSide.teamId, options)
  );
  if (candidates.length < 11) return null;
  const weights = layout.map(([slotPosition]) =>
    candidates.map((candidate) => assignmentWeight(candidate, slotPosition))
  );
  const assignment = maximizeAssignment(weights);
  if (!assignment || assignment.some((column) => column < 0)) return null;
  if (assignment.some((column, slotIndex) => weights[slotIndex][column] <= 0)) {
    return null;
  }

  const starters = assignment.map((column, slotIndex) => ({
    player: representativeForSlot(candidates[column], layout[slotIndex][0]),
    playerScore: candidates[column],
    slot: layout[slotIndex],
    slotIndex,
    assignmentWeight: weights[slotIndex][column]
  }));
  const selectedKeys = new Set(assignment);
  const disputedSlots = starters.flatMap((starter) => {
    const alternatives = candidates
      .map((candidate, column) => ({ candidate, column, score: weights[starter.slotIndex][column] }))
      .filter(({ column, score }) =>
        !selectedKeys.has(column) &&
        score > 0 &&
        score >= starter.assignmentWeight * Number(options.disputeThreshold || 0.82)
      )
      .sort((left, right) => right.score - left.score)
      .slice(0, 2)
      .map(({ candidate, score }) => ({
        name: candidate.name,
        score: Number(score.toFixed(3)),
        evidenceStrength: candidate.evidenceStrength,
        independentStarterVotes: candidate.independentStarterVotes,
        sourceIds: candidate.sourceIds
      }));
    return alternatives.length
      ? [{
          slotIndex: starter.slotIndex,
          position: starter.slot[3] || starter.slot[0],
          assignmentRole: starter.slot[0],
          selectedName: starter.player.name,
          selectedEvidenceStrength: starter.playerScore.evidenceStrength,
          alternatives
        }]
      : [];
  });

  return { starters, disputedSlots };
}

function chooseBench(scoredSide, starters, options = {}) {
  const selected = starters.map((starter) => starter.player);
  return scoredSide.playerScores
    .filter((score) =>
      !selected.some((player) => samePlayer(player, score.player)) &&
      !isUnavailable(scoredSide, score.player, options) &&
      isOnKnownRoster(score.player, scoredSide.teamId, options)
    )
    .sort((left, right) =>
      right.benchScore - left.benchScore ||
      right.starterScore - left.starterScore ||
      left.name.localeCompare(right.name)
    )
    .filter((score, index, values) =>
      !values.slice(0, index).some((candidate) => samePlayer(candidate.player, score.player))
    )
    .slice(0, 15)
    .map((score) => score.player);
}

function predictedPlayerFromCandidate(starter, scoredSide, index, options = {}) {
  const { player, playerScore: score, slot } = starter;
  const [slotPosition, slotX, slotY, displayPosition = slotPosition] = slot;
  const playerProfilesByName = options.playerProfilesByName || createPlayerProfileLookup(options.playerProfilesData);
  const profile = findPlayerProfile(playerProfilesByName, player, scoredSide.teamId);
  const confidence = normalizeConfidence({
    score: normalizedPlayerEvidenceScore(score, options),
    method: "evidence-strength-v2",
    reason: `${score.independentStarterVotes} independent starter source${score.independentStarterVotes === 1 ? "" : "s"}; not a calibrated probability.`
  });

  return createPredictedPlayer({
    name: profile?.displayName || profile?.name || player.name,
    number: getPredictedPlayerNumber(player, score, playerProfilesByName, scoredSide.teamId),
    position: displayPosition,
    x: slotX,
    y: slotY,
    confidence,
    sourceIds: uniqueStrings([...(player.sourceIds || []), ...(score?.sourceIds || [])]),
    evidence: score?.evidence || [`starter candidate ${index + 1}`],
    notes: player.notes || []
  });
}

function predictedBenchPlayer(player, scoredSide, options = {}) {
  const score = playerScoreFor(scoredSide, player);
  const playerProfilesByName = options.playerProfilesByName || createPlayerProfileLookup(options.playerProfilesData);
  const profile = findPlayerProfile(playerProfilesByName, player, scoredSide.teamId);
  const assignmentPosition = String(player.position || score?.position || "SUB").trim().toUpperCase();
  const displayPosition = {
    LAM: "AM",
    LCB: "CB",
    LCM: "CM",
    LST: "ST",
    RAM: "AM",
    RCB: "CB",
    RCM: "CM",
    RST: "ST"
  }[assignmentPosition] || assignmentPosition;
  return {
    name: profile?.displayName || profile?.name || player.name,
    number: getPredictedPlayerNumber(player, score, playerProfilesByName, scoredSide.teamId),
    position: displayPosition,
    confidence: normalizeConfidence({
      score: Math.min(DEFAULT_MAX_PLAYER_CONFIDENCE, Number(score?.benchSupport || player.confidence?.score || 0)),
      method: "evidence-strength-v2",
      reason: "Bench evidence strength; not a calibrated probability."
    }),
    sourceIds: uniqueStrings([...(player.sourceIds || []), ...(score?.sourceIds || [])]),
    evidence: uniqueStrings([...(player.evidence || []), ...(score?.evidence || [])]),
    notes: uniqueStrings([...(player.notes || []), ...(score?.notes || [])])
  };
}

function buildPredictedSide(scoredSide, options = {}) {
  const formationResolution = resolveFormationLayout(chooseFormation(scoredSide));
  const formation = formationResolution.formation;
  const consensus = chooseConsensusStarters(scoredSide, formationResolution.layout, options);
  if (!consensus || consensus.starters.length !== 11) return null;
  const { starters, disputedSlots } = consensus;
  const coachProfilesByTeamId = options.coachProfilesByTeamId || createCoachProfileLookup(options.coachProfilesData);
  const coach = coachProfilesByTeamId.get(scoredSide.teamId) || null;
  const players = starters.map((starter, index) =>
    predictedPlayerFromCandidate(starter, scoredSide, index, options)
  );
  const bench = chooseBench(scoredSide, starters, options).map((player) => predictedBenchPlayer(player, scoredSide, options));
  const sourceIds = uniqueStrings([
    ...scoredSide.scoredSideCandidates.flatMap((candidate) => candidate.candidate.sourceIds),
    ...players.flatMap((player) => player.sourceIds || [])
  ]);

  return createPredictedSide({
    teamId: scoredSide.teamId,
    coach,
    formation,
    players,
    bench,
    sourceIds,
    evidence: {
      confidence: confidenceForSide(scoredSide, starters, options),
      semantics: "evidence-strength-not-calibrated-probability",
      independentSourceCount: scoredSide.independentSourceScores.length,
      formationResolution: {
        requestedFormation: formationResolution.requestedFormation,
        displayedFormation: formation,
        method: formationResolution.resolution,
        ...(formationResolution.caveat ? { caveat: formationResolution.caveat } : {})
      },
      notes: uniqueStrings([
        ...scoredSide.scoredSideCandidates.flatMap((candidate) => candidate.sideCandidate.notes || []),
        formationResolution.caveat
      ]),
      formationScores: scoredSide.formationScores,
      disputedSlots,
      starterScores: starters
        .map(({ playerScore: score, slot }) => ({
          name: score.name,
          score: score.score,
          evidenceStrength: score.evidenceStrength,
          starterVotes: score.starterVotes,
          benchVotes: score.benchVotes,
          independentStarterVotes: score.independentStarterVotes,
          independentBenchVotes: score.independentBenchVotes,
          selectedRole: slot[3] || slot[0],
          assignmentRole: slot[0],
          roleScores: score.roleScores,
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
    method: "evidence-strength-v2",
    reason: "Average home/away evidence strength; this is not a calibrated probability."
  });
}

export function generateFixturePrediction({ candidates, fixture, generatedAt = new Date(), options = {} }) {
  if (!fixture?.id) {
    throw new Error("generateFixturePrediction requires fixture.id");
  }
  const generatedTime = new Date(generatedAt);
  const kickoffTime = new Date(fixture.kickoffUtc || "");
  if (
    Number.isNaN(generatedTime.getTime()) ||
    Number.isNaN(kickoffTime.getTime()) ||
    kickoffTime.getTime() <= generatedTime.getTime()
  ) {
    return null;
  }
  if (!fixture.homeTeamId || !fixture.awayTeamId) return null;

  const generatorOptions = {
    ...options,
    coachProfilesByTeamId: options.coachProfilesByTeamId || createCoachProfileLookup(options.coachProfilesData),
    playerProfilesByName: options.playerProfilesByName || createPlayerProfileLookup(options.playerProfilesData),
    rosterByTeamId: options.rosterByTeamId || createRosterLookup(options.playerProfilesData)
  };
  const scoringOptions = { ...options, now: generatedAt };
  const scoringCandidates = canonicalizeCandidatesForScoring(
    candidates,
    fixture,
    generatorOptions.playerProfilesByName
  );
  const scored = scoreFixtureCandidates(fixture, scoringCandidates, scoringOptions);
  const home = buildPredictedSide(scored.home, generatorOptions);
  const away = buildPredictedSide(scored.away, generatorOptions);
  if (!home || !away) {
    return null;
  }

  const sourceIds = uniqueStrings([
    ...home.sourceIds,
    ...away.sourceIds,
    ...scored.candidates.flatMap((candidate) => candidate.candidate.sourceIds)
  ]);
  const confidence = recordConfidence(home, away);
  const predictionClass = scored.candidates.some(
    ({ candidate }) => candidate.predictionClass === "reported-xi"
  ) ? "reported-xi-assisted" : "forecast";

  return createExpectedLineupRecord({
    fixtureId: fixture.id,
    mode: confidence.score >= 0.75 ? "probable" : "expected",
    sourceIds,
    lastUpdated: generatedAt,
    confidence,
    predictionClass,
    providerRefs: scored.candidates.map(({ candidate, score, claimStrength, recencyWeight, sourceReliability, independenceKey }) => ({
      providerId: candidate.providerId,
      providerVersion: candidate.providerVersion,
      score,
      predictionClass: candidate.predictionClass || "forecast",
      claimStrength,
      recencyWeight,
      sourceReliability,
      independenceKey,
      ...(candidate.updatedAt ? { updatedAt: candidate.updatedAt } : {}),
      sourceIds: candidate.sourceIds
    })),
    evidence: {
      home: home.evidence,
      away: away.evidence
    },
    notes: [
      "Generated by role-constrained lineup consensus; evidence-strength scores are not calibrated probabilities.",
      "Replaced by confirmed/live FIFA lineups when available."
    ],
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
