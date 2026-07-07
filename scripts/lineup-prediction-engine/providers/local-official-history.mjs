import { isPlayerNameMatch, normalizePlayerName } from "../../player-name-matching.mjs";

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

function samePlayer(left, right) {
  return isPlayerNameMatch(playerName(left), playerName(right));
}

function playerKey(player) {
  return normalizePlayerName(playerName(player));
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
  const profile =
    profileLookup.get(`${teamId}:${normalizedName}`) ||
    [...profileLookup.values()].find((candidate) =>
      (!teamId || candidate.teamId === teamId) && isPlayerNameMatch(name, candidate.name || candidate.displayName)
    );

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

function minutesForLineup(teamLineup, matchLength = 90) {
  const minutes = new Map();
  const starters = teamLineup.players || [];
  const substitutions = teamLineup.events?.substitutions || [];

  for (const starter of starters) {
    minutes.set(playerKey(starter), matchLength);
  }

  for (const substitution of substitutions) {
    const minute = Math.max(0, Math.min(matchLength, parseMinute(substitution.minute)));
    const offKey = normalizePlayerName(substitution.offName);
    const onKey = normalizePlayerName(substitution.onName);
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

function getSuspensionRiskEntries(history) {
  const latest = history[0];
  const cards = latest?.teamLineup?.events?.cards || [];
  return cards
    .filter((card) => card.type === "red")
    .map((card) => ({
      name: card.playerName,
      reason: "Red card in previous official match; treated as suspension risk.",
      sourceId: latest.lineups?.sourceIds?.[0] || ""
    }));
}

function isUnavailable(player, unavailableEntries) {
  return unavailableEntries.some((entry) => isPlayerNameMatch(playerName(player), entry.name));
}

function scoreRecentPlayers(history) {
  const scores = new Map();
  const formationCounts = new Map();
  const recencyWeights = [1, 0.8, 0.6, 0.45, 0.3];

  for (const [historyIndex, item] of history.entries()) {
    const weight = recencyWeights[historyIndex] || 0.2;
    formationCounts.set(item.teamLineup.formation, (formationCounts.get(item.teamLineup.formation) || 0) + weight);
    const minutes = minutesForLineup(item.teamLineup, item.fixture.status === "AET" || item.fixture.status === "PEN" ? 120 : 90);
    const players = [...(item.teamLineup.players || []), ...(item.teamLineup.bench || [])];

    for (const player of players) {
      const key = playerKey(player);
      if (!key) continue;
      const existing = scores.get(key) || {
        player,
        recentStarts: 0,
        recentMinutes: 0,
        score: 0,
        sourceIds: []
      };
      const playerMinutes = minutes.get(key) || 0;
      if ((item.teamLineup.players || []).some((starter) => samePlayer(starter, player))) {
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

function confidenceForPlayer(player, playerScores, inLastXi) {
  const score = playerScores.find((candidate) => samePlayer(candidate.player, player));
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

function providerPlayer(player, { evidence, inLastXi, playerScores, profileLookup, sourceIds, teamId }) {
  const confidence = confidenceForPlayer(player, playerScores, inLastXi);
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

function addUniquePlayer(players, player) {
  const key = playerKey(player);
  if (!key || players.some((candidate) => playerKey(candidate) === key)) {
    return;
  }
  players.push(player);
}

function buildSideCandidate({ checkedAt, fixture, history, playerAvailabilityData, profileLookup, providerSourceId, side, teamId }) {
  if (!history.length) {
    return null;
  }

  const latest = history[0];
  const recent = scoreRecentPlayers(history);
  const unavailableEntries = [
    ...getAvailabilityEntries(playerAvailabilityData, teamId, fixture.id),
    ...getSuspensionRiskEntries(history)
  ];
  const sourceIds = [
    providerSourceId,
    ...(latest.lineups.sourceIds || []),
    ...unavailableEntries.map((entry) => entry.sourceId).filter(Boolean)
  ];
  const selectedStarters = [];
  for (const starter of latest.teamLineup.players || []) {
    if (!isUnavailable(starter, unavailableEntries)) {
      addUniquePlayer(selectedStarters, starter);
    }
  }
  for (const playerScore of recent.playerScores) {
    if (selectedStarters.length >= 11) break;
    if (!isUnavailable(playerScore.player, unavailableEntries)) {
      addUniquePlayer(selectedStarters, playerScore.player);
    }
  }
  if (selectedStarters.length !== 11) {
    return null;
  }

  const benchCandidates = [];
  for (const player of latest.teamLineup.bench || []) {
    if (!isUnavailable(player, unavailableEntries)) {
      addUniquePlayer(benchCandidates, player);
    }
  }
  for (const playerScore of recent.playerScores) {
    if (benchCandidates.length >= 15) break;
    if (
      !isUnavailable(playerScore.player, unavailableEntries) &&
      !selectedStarters.some((starter) => samePlayer(starter, playerScore.player))
    ) {
      addUniquePlayer(benchCandidates, playerScore.player);
    }
  }

  const topFormation = [...recent.formationCounts.entries()].sort((left, right) => right[1] - left[1])[0];
  const formationStability = topFormation?.[0] === latest.teamLineup.formation ? Math.min(1, Number(topFormation[1]) / 2) : 0.4;
  const unavailableRemoved = (latest.teamLineup.players || []).filter((player) => isUnavailable(player, unavailableEntries)).length;
  const sideConfidence = Math.max(
    0.4,
    Math.min(0.88, 0.58 + formationStability * 0.12 + (unavailableRemoved ? -0.08 : 0.08))
  );
  const starterOptions = { playerScores: recent.playerScores, profileLookup, sourceIds, teamId, evidence: "Last verified official XI", inLastXi: true };
  const benchOptions = { playerScores: recent.playerScores, profileLookup, sourceIds, teamId, evidence: "Recent official bench/minutes", inLastXi: false };

  return {
    teamId,
    formation: latest.teamLineup.formation,
    starters: selectedStarters.map((player) => providerPlayer(player, starterOptions)),
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
    notes: [
      `Last verified XI: match ${latest.fixture.matchNumber}`,
      `Recent formation: ${latest.teamLineup.formation}`,
      `${unavailableRemoved} last-XI player${unavailableRemoved === 1 ? "" : "s"} removed for availability`
    ],
    evidence: [
      {
        fixtureId: fixture.id,
        teamId,
        type: "last-verified-xi",
        weight: 1,
        confidence: { score: sideConfidence },
        sourceIds,
        updatedAt: checkedAt,
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

        if (!home || !away) {
          continue;
        }

        candidates.push({
          fixtureId: fixture.id,
          updatedAt: raw.checkedAt,
          confidence: {
            score: (home.confidence.score + away.confidence.score) / 2,
            reason: "Local official-history confidence average"
          },
          sourceIds: [...new Set([raw.providerSourceId, ...home.sourceIds, ...away.sourceIds])],
          sides: { home, away },
          notes: ["Local provider: last verified XI plus availability and recent-load evidence."]
        });
      }
      return candidates;
    }
  };
}
