import {
  getCanonicalPlayerKey,
  normalizePlayerName,
  resolvePlayerNameInPool
} from "../../player-name-matching.mjs";

export const LOCAL_OFFICIAL_HISTORY_PROVIDER_ID = "local-official-history";

const RECENT_LIMIT = 5;

function parseMinute(value) {
  if (value === "HT") {
    return 45;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const match = String(value || "").match(/^(\d+)(?:\+(\d+))?$/);
  if (!match) {
    return Number.parseInt(String(value), 10) || 0;
  }
  return Number(match[1]) + Number(match[2] || 0);
}

function playerName(player) {
  return String(player?.name || player?.fullName || player?.displayName || "").trim();
}

function samePlayer(left, right, resolveIdentity) {
  const leftKey = getCanonicalPlayerKey(playerName(left));
  if (leftKey && leftKey === getCanonicalPlayerKey(playerName(right))) return true;
  if (!resolveIdentity) return false;
  const leftIdentity = resolveIdentity(left);
  const rightIdentity = resolveIdentity(right);
  return Boolean(
    leftIdentity.status === "matched" &&
    rightIdentity.status === "matched" &&
    leftIdentity.key === rightIdentity.key
  );
}

function playerKey(player, resolveIdentity) {
  const identity = resolveIdentity?.(player);
  return identity?.status === "matched" ? identity.key : normalizePlayerName(playerName(player));
}

function getProfileSide(profile = {}) {
  const value = String(profile.position || "").toLowerCase();
  const rightSide = /\bright(?:-| )(?:back|wing-back|wing back|winger|midfielder)\b/.test(value);
  const leftSide = /\bleft(?:-| )(?:back|wing-back|wing back|winger|midfielder)\b/.test(value);
  const centralRole = /\b(?:central midfielder|defensive midfielder|attacking midfielder|centre-back|center-back|striker|centre-forward|center-forward|goalkeeper)\b/.test(value);

  if (rightSide === leftSide || centralRole) {
    return "";
  }

  return rightSide ? "right" : "left";
}

function buildProfileLookup(playerProfilesData = {}) {
  const byTeamAndName = new Map();
  for (const profile of Object.values(playerProfilesData.profiles || {})) {
    const key = `${profile.teamId || ""}:${normalizePlayerName(profile.name || profile.displayName)}`;
    if (key !== ":") {
      byTeamAndName.set(key, profile);
    }
  }
  return byTeamAndName;
}

function getPlayerProfileSide(profileLookup, teamId, name) {
  const normalizedName = normalizePlayerName(name);
  const exact = profileLookup.get(`${teamId}:${normalizedName}`);
  const teamProfiles = [...new Set(profileLookup.values())]
    .filter((candidate) => !teamId || candidate.teamId === teamId);
  const resolved = exact
    ? { status: "matched", candidate: exact }
    : resolvePlayerNameInPool(name, teamProfiles, {
        getIdentityKey: (candidate) => candidate.name || candidate.displayName,
        getNames: (candidate) => [candidate.name, candidate.displayName]
      });
  const profile = resolved.status === "matched" ? resolved.candidate : null;

  return getProfileSide(profile);
}

function coordinateSide(value) {
  if (!Number.isFinite(Number(value)) || Number(value) === 50) {
    return "";
  }
  return Number(value) > 50 ? "right" : "left";
}

function adjustedNeutralX(player, profileLookup, teamId) {
  const position = String(player.position || "").trim();
  if (!["CM", "DM", "AM", "LM", "RM"].includes(position)) {
    return Number.isFinite(Number(player.x)) ? Number(player.x) : undefined;
  }

  const profileSide = getPlayerProfileSide(profileLookup, teamId, playerName(player));
  if (!profileSide) {
    return Number.isFinite(Number(player.x)) ? Number(player.x) : undefined;
  }

  const currentSide = coordinateSide(player.x);
  if (!currentSide || currentSide === profileSide) {
    return Number.isFinite(Number(player.x)) ? Number(player.x) : undefined;
  }

  return profileSide === "right" ? Math.max(62, Number(player.x) || 62) : Math.min(38, Number(player.x) || 38);
}

function completedBefore(fixture, kickoffUtc) {
  return (
    ["FT", "AET", "PEN"].includes(fixture?.status) &&
    fixture?.kickoffUtc &&
    new Date(fixture.kickoffUtc).getTime() < new Date(kickoffUtc).getTime()
  );
}

function teamSide(fixture, teamId) {
  if (fixture.homeTeamId === teamId) return "home";
  if (fixture.awayTeamId === teamId) return "away";
  return "";
}

function getTeamHistory({ fixtures, lineupsByFixtureId, teamId, targetFixture }) {
  return fixtures
    .filter((fixture) => completedBefore(fixture, targetFixture.kickoffUtc))
    .map((fixture) => {
      const side = teamSide(fixture, teamId);
      const lineups = lineupsByFixtureId[fixture.id];
      return side && lineups?.[side]?.players?.length === 11
        ? {
            fixture,
            lineups,
            side,
            teamLineup: lineups[side]
          }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right.fixture.kickoffUtc).getTime() - new Date(left.fixture.kickoffUtc).getTime())
    .slice(0, RECENT_LIMIT);
}

function minutesForLineup(teamLineup, matchLength = 90, resolveIdentity) {
  const minutes = new Map();
  const starters = teamLineup.players || [];
  const substitutions = teamLineup.events?.substitutions || [];

  for (const starter of starters) {
    minutes.set(playerKey(starter, resolveIdentity), matchLength);
  }

  for (const substitution of substitutions) {
    const minute = Math.max(0, Math.min(matchLength, parseMinute(substitution.minute)));
    const offKey = playerKey({ name: substitution.offName }, resolveIdentity);
    const onKey = playerKey({ name: substitution.onName }, resolveIdentity);
    if (offKey && minutes.has(offKey)) {
      minutes.set(offKey, Math.min(minutes.get(offKey), minute));
    }
    if (onKey) {
      minutes.set(onKey, Math.max(minutes.get(onKey) || 0, matchLength - minute));
    }
  }

  return minutes;
}

function getAvailabilityEntries(playerAvailabilityData, teamId, fixtureId) {
  const teamAvailability = playerAvailabilityData?.teams?.[teamId] || {};
  return [
    ...(Array.isArray(teamAvailability.unavailable) ? teamAvailability.unavailable : []),
    ...(Array.isArray(teamAvailability.fixtureUnavailable)
      ? teamAvailability.fixtureUnavailable.filter((entry) => entry.fixtureId === fixtureId)
      : [])
  ];
}

function createTeamIdentityResolver({ history, profileLookup, teamId }) {
  const roster = [...new Set(profileLookup.values())]
    .filter((profile) => profile?.teamId === teamId);
  const candidatePool = history.flatMap((item) => [
    ...(item.teamLineup.players || []),
    ...(item.teamLineup.bench || [])
  ]);
  const primaryPool = roster.length ? roster : candidatePool;

  return (value) => {
    const primary = resolvePlayerNameInPool(value, primaryPool, roster.length
      ? {
          getIdentityKey: (profile) => profile.name || profile.displayName,
          getNames: (profile) => [profile.name, profile.displayName]
        }
      : { getName: playerName });
    if (primary.status !== "unmatched" || primaryPool === candidatePool) return primary;
    return resolvePlayerNameInPool(value, candidatePool, { getName: playerName });
  };
}

function isUnavailable(player, unavailableEntries, resolveIdentity) {
  const playerIdentity = resolveIdentity(player);
  if (playerIdentity.status !== "matched") return false;
  return unavailableEntries.some((entry) => {
    const unavailableIdentity = resolveIdentity(entry.name);
    return unavailableIdentity.status === "matched" && unavailableIdentity.key === playerIdentity.key;
  });
}

function scoreRecentPlayers(history, resolveIdentity) {
  const scores = new Map();
  const formationCounts = new Map();
  const recencyWeights = [1, 0.8, 0.6, 0.45, 0.3];

  for (const [historyIndex, item] of history.entries()) {
    const weight = recencyWeights[historyIndex] || 0.2;
    formationCounts.set(item.teamLineup.formation, (formationCounts.get(item.teamLineup.formation) || 0) + weight);
    const minutes = minutesForLineup(
      item.teamLineup,
      item.fixture.status === "AET" || item.fixture.status === "PEN" ? 120 : 90,
      resolveIdentity
    );
    const players = [...(item.teamLineup.players || []), ...(item.teamLineup.bench || [])];

    for (const player of players) {
      const key = playerKey(player, resolveIdentity);
      if (!key) continue;
      const existing = scores.get(key) || {
        player,
        recentStarts: 0,
        recentMinutes: 0,
        score: 0,
        sourceIds: []
      };
      const playerMinutes = minutes.get(key) || 0;
      if ((item.teamLineup.players || []).some((starter) => samePlayer(starter, player, resolveIdentity))) {
        existing.recentStarts += 1;
        existing.score += 2.5 * weight;
      }
      existing.recentMinutes += playerMinutes;
      existing.score += (playerMinutes / 90) * weight;
      existing.sourceIds = [...new Set([...existing.sourceIds, ...(item.lineups.sourceIds || [])])];
      scores.set(key, existing);
    }
  }

  return {
    formationCounts,
    playerScores: [...scores.values()].sort((left, right) => right.score - left.score)
  };
}

function positionGroup(player) {
  const position = String(player?.position || "").toUpperCase();
  if (position === "GK") return "GK";
  if (["RB", "RWB", "RCB", "CB", "LCB", "LB", "LWB"].includes(position)) return "DEF";
  if (["RM", "CM", "DM", "AM", "LM"].includes(position)) return "MID";
  if (["RW", "LW", "ST"].includes(position)) return "FWD";
  return "";
}

function recentScoreFor(recent, player, resolveIdentity) {
  return recent.playerScores.find((candidate) => samePlayer(candidate.player, player, resolveIdentity));
}

function buildBronzeRotationBaseline({ latest, recent, selectedStarters, unavailableEntries, resolveIdentity }) {
  const selected = [...selectedStarters];
  const benchPool = [];
  for (const player of [...(latest.teamLineup.bench || []), ...recent.playerScores.map((entry) => entry.player)]) {
    if (
      !isUnavailable(player, unavailableEntries, resolveIdentity) &&
      !selected.some((starter) => samePlayer(starter, player, resolveIdentity)) &&
      !benchPool.some((candidate) => samePlayer(candidate, player, resolveIdentity))
    ) {
      benchPool.push(player);
    }
  }

  const rotationCandidates = selected
    .map((player, index) => ({ index, player, recent: recentScoreFor(recent, player, resolveIdentity) }))
    .filter(({ player }) => positionGroup(player) !== "GK")
    .sort((left, right) =>
      Number(right.recent?.recentMinutes || 0) - Number(left.recent?.recentMinutes || 0) ||
      Number(right.recent?.recentStarts || 0) - Number(left.recent?.recentStarts || 0)
    );
  const rotated = [];

  for (const starter of rotationCandidates) {
    if (rotated.length >= 4) break;
    const group = positionGroup(starter.player);
    const replacement = benchPool
      .filter((player) => positionGroup(player) === group)
      .map((player) => ({ player, recent: recentScoreFor(recent, player, resolveIdentity) }))
      .filter(({ recent }) => recent && (recent.recentMinutes > 0 || recent.recentStarts > 0))
      .sort((left, right) => {
        const leftLoadBonus = Number(left.recent.recentMinutes || 0) < 180 ? 0.75 : 0;
        const rightLoadBonus = Number(right.recent.recentMinutes || 0) < 180 ? 0.75 : 0;
        return right.recent.score + rightLoadBonus - (left.recent.score + leftLoadBonus);
      })[0];
    if (!replacement) continue;
    selected[starter.index] = replacement.player;
    rotated.push({ out: playerName(starter.player), in: playerName(replacement.player) });
    const benchIndex = benchPool.findIndex((player) => samePlayer(player, replacement.player, resolveIdentity));
    if (benchIndex >= 0) benchPool.splice(benchIndex, 1);
  }

  return { selected, rotated };
}

function confidenceForPlayer(player, playerScores, inLastXi, resolveIdentity) {
  const score = playerScores.find((candidate) => samePlayer(candidate.player, player, resolveIdentity));
  const recentStarts = score?.recentStarts || 0;
  const recentMinutes = score?.recentMinutes || 0;
  const confidenceScore = Math.max(
    0.35,
    Math.min(0.92, (inLastXi ? 0.7 : 0.5) + recentStarts * 0.04 - (recentMinutes >= 300 ? 0.05 : 0))
  );

  return {
    score: Number(confidenceScore.toFixed(3)),
    reason: `${recentStarts} recent start${recentStarts === 1 ? "" : "s"}, ${Math.round(recentMinutes)} recent minutes`
  };
}

function providerPlayer(player, { evidence, inLastXi, playerScores, profileLookup, resolveIdentity, sourceIds, teamId }) {
  const confidence = confidenceForPlayer(player, playerScores, inLastXi, resolveIdentity);
  const adjustedX = adjustedNeutralX(player, profileLookup, teamId);

  return {
    name: playerName(player),
    number: String(player.number || "").trim(),
    position: String(player.position || "").trim(),
    ...(Number.isFinite(Number(adjustedX)) ? { x: Number(adjustedX) } : {}),
    ...(Number.isFinite(Number(player.y)) ? { y: Number(player.y) } : {}),
    confidence,
    sourceIds,
    evidence: [evidence, confidence.reason]
  };
}

function addUniquePlayer(players, player, resolveIdentity) {
  const key = playerKey(player, resolveIdentity);
  if (!key || players.some((candidate) => samePlayer(candidate, player, resolveIdentity))) {
    return;
  }
  players.push(player);
}

function buildSideCandidate({ checkedAt, fixture, history, playerAvailabilityData, profileLookup, providerSourceId, side, teamId }) {
  if (!history.length) {
    return null;
  }

  const latest = history[0];
  const evidenceUpdatedAt = latest.fixture?.kickoffUtc || checkedAt;
  const resolveIdentity = createTeamIdentityResolver({ history, profileLookup, teamId });
  const recent = scoreRecentPlayers(history, resolveIdentity);
  // Disciplinary sanctions vary by competition and decision. Only explicit
  // tournament/fixture availability is a hard exclusion; do not guess a ban
  // from a prior red or yellow card.
  const unavailableEntries = getAvailabilityEntries(playerAvailabilityData, teamId, fixture.id);
  const sourceIds = [
    providerSourceId,
    ...(latest.lineups.sourceIds || []),
    ...unavailableEntries.map((entry) => entry.sourceId).filter(Boolean)
  ];
  const selectedStarters = [];
  for (const starter of latest.teamLineup.players || []) {
    if (!isUnavailable(starter, unavailableEntries, resolveIdentity)) {
      addUniquePlayer(selectedStarters, starter, resolveIdentity);
    }
  }
  for (const playerScore of recent.playerScores) {
    if (selectedStarters.length >= 11) break;
    if (!isUnavailable(playerScore.player, unavailableEntries, resolveIdentity)) {
      addUniquePlayer(selectedStarters, playerScore.player, resolveIdentity);
    }
  }
  if (selectedStarters.length !== 11) {
    return null;
  }

  const isBronzeFinal = fixture.stage === "bronze-final";
  const bronzeRotation = isBronzeFinal
    ? buildBronzeRotationBaseline({ latest, recent, selectedStarters, unavailableEntries, resolveIdentity })
    : { selected: selectedStarters, rotated: [] };
  selectedStarters.splice(0, selectedStarters.length, ...bronzeRotation.selected);

  const benchCandidates = [];
  for (const player of latest.teamLineup.bench || []) {
    if (
      !isUnavailable(player, unavailableEntries, resolveIdentity) &&
      !selectedStarters.some((starter) => samePlayer(starter, player, resolveIdentity))
    ) {
      addUniquePlayer(benchCandidates, player, resolveIdentity);
    }
  }
  for (const playerScore of recent.playerScores) {
    if (benchCandidates.length >= 15) break;
    if (
      !isUnavailable(playerScore.player, unavailableEntries, resolveIdentity) &&
      !selectedStarters.some((starter) => samePlayer(starter, playerScore.player, resolveIdentity))
    ) {
      addUniquePlayer(benchCandidates, playerScore.player, resolveIdentity);
    }
  }

  const topFormation = [...recent.formationCounts.entries()].sort((left, right) => right[1] - left[1])[0];
  const formationStability = topFormation?.[0] === latest.teamLineup.formation ? Math.min(1, Number(topFormation[1]) / 2) : 0.4;
  const unavailableRemoved = (latest.teamLineup.players || [])
    .filter((player) => isUnavailable(player, unavailableEntries, resolveIdentity)).length;
  const sideConfidence = Math.max(
    0.4,
    Math.min(isBronzeFinal ? 0.58 : 0.88, 0.58 + formationStability * 0.12 + (unavailableRemoved ? -0.08 : 0.08))
  );
  const starterOptions = { playerScores: recent.playerScores, profileLookup, resolveIdentity, sourceIds, teamId, evidence: isBronzeFinal ? "Rotation-aware bronze-final baseline" : "Last verified official XI" };
  const benchOptions = { playerScores: recent.playerScores, profileLookup, resolveIdentity, sourceIds, teamId, evidence: "Recent official bench/minutes", inLastXi: false };

  return {
    teamId,
    formation: latest.teamLineup.formation,
    starters: selectedStarters.map((player) => providerPlayer(player, {
      ...starterOptions,
      inLastXi: (latest.teamLineup.players || []).some((starter) => samePlayer(starter, player, resolveIdentity))
    })),
    benchCandidates: benchCandidates.map((player) => providerPlayer(player, benchOptions)),
    unavailable: unavailableEntries.map((entry) => ({
      name: entry.name,
      reason: entry.reason,
      sourceIds: [entry.sourceId].filter(Boolean)
    })),
    sourceIds,
    confidence: {
      score: Number(sideConfidence.toFixed(3)),
      reason: `${side} prediction based on last verified XI from match ${latest.fixture.matchNumber}`
    },
    ...(isBronzeFinal ? { evidenceStrengthCap: 0.58 } : {}),
    notes: [
      `Last verified XI: match ${latest.fixture.matchNumber}`,
      `Recent formation: ${latest.teamLineup.formation}`,
      `${unavailableRemoved} last-XI player${unavailableRemoved === 1 ? "" : "s"} removed for explicit availability`,
      ...(isBronzeFinal
        ? [
            "Bronze-final rotation risk: latest-XI carryover is intentionally downweighted.",
            `${bronzeRotation.rotated.length} high-load starter${bronzeRotation.rotated.length === 1 ? "" : "s"} rotated toward recent bench/minutes alternatives.`
          ]
        : [])
    ],
    evidence: [
      {
        fixtureId: fixture.id,
        teamId,
        type: "last-verified-xi",
        weight: 1,
        confidence: { score: sideConfidence },
        sourceIds,
        updatedAt: evidenceUpdatedAt,
        notes: [`Based on ${history.length} recent official team sheet${history.length === 1 ? "" : "s"}.`]
      }
    ]
  };
}

export function createLocalOfficialHistoryProvider({ checkedAt, sourceId }) {
  return {
    id: LOCAL_OFFICIAL_HISTORY_PROVIDER_ID,
    label: "Local official lineup history",
    version: "1",
    async collect(context) {
      return {
        checkedAt,
        fixtures: context.fixturesData.fixtures || [],
        lineupsByFixtureId: context.lineupsData.lineups || {},
        playerAvailabilityData: context.playerAvailabilityData || {},
        profileLookup: buildProfileLookup(context.playerProfilesData),
        providerSourceId: sourceId,
        targetFixtures: context.targetFixtures || []
      };
    },
    async normalize(raw) {
      const candidates = [];
      for (const fixture of raw.targetFixtures) {
        const homeHistory = getTeamHistory({
          fixtures: raw.fixtures,
          lineupsByFixtureId: raw.lineupsByFixtureId,
          teamId: fixture.homeTeamId,
          targetFixture: fixture
        });
        const awayHistory = getTeamHistory({
          fixtures: raw.fixtures,
          lineupsByFixtureId: raw.lineupsByFixtureId,
          teamId: fixture.awayTeamId,
          targetFixture: fixture
        });
        const home = buildSideCandidate({
          checkedAt: raw.checkedAt,
          fixture,
          history: homeHistory,
          playerAvailabilityData: raw.playerAvailabilityData,
          profileLookup: raw.profileLookup,
          providerSourceId: raw.providerSourceId,
          side: "home",
          teamId: fixture.homeTeamId
        });
        const away = buildSideCandidate({
          checkedAt: raw.checkedAt,
          fixture,
          history: awayHistory,
          playerAvailabilityData: raw.playerAvailabilityData,
          profileLookup: raw.profileLookup,
          providerSourceId: raw.providerSourceId,
          side: "away",
          teamId: fixture.awayTeamId
        });

        if (!home && !away) {
          continue;
        }

        const availableSides = [home, away].filter(Boolean);

        const historyObservedAt = [homeHistory[0]?.fixture?.kickoffUtc, awayHistory[0]?.fixture?.kickoffUtc]
          .filter(Boolean)
          .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
        candidates.push({
          fixtureId: fixture.id,
          updatedAt: historyObservedAt,
          confidence: {
            score: availableSides.reduce((sum, candidate) => sum + candidate.confidence.score, 0) / availableSides.length,
            reason: "Local official-history confidence average"
          },
          sourceIds: [...new Set([
            raw.providerSourceId,
            ...(home?.sourceIds || []),
            ...(away?.sourceIds || [])
          ])],
          lineupSourceIds: [raw.providerSourceId],
          sides: {
            ...(home ? { home } : {}),
            ...(away ? { away } : {})
          },
          notes: ["Local provider: last verified XI plus availability and recent-load evidence."]
        });
      }
      return candidates;
    }
  };
}
