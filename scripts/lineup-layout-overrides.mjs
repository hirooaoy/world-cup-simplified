import { isPlayerNameMatch, normalizePlayerName } from "./player-name-matching.mjs";

export const VERIFIED_LAYOUT_SOURCE = "editorial-verified";

export function normalizeLayoutPlayerName(value) {
  return normalizePlayerName(value || "");
}

function playerName(player) {
  return String(player?.name || player?.fullName || player?.displayName || "").trim();
}

function layoutPlayerKey(player) {
  return normalizeLayoutPlayerName(playerName(player));
}

function sameLayoutPlayer(left, right) {
  const leftName = playerName(left);
  const rightName = playerName(right);
  if (!leftName || !rightName) {
    return false;
  }

  return (
    normalizeLayoutPlayerName(leftName) === normalizeLayoutPlayerName(rightName) ||
    isPlayerNameMatch(leftName, rightName) ||
    isPlayerNameMatch(rightName, leftName)
  );
}

function findOverridePlayer(player, overridePlayers, usedIndexes) {
  const number = String(player?.number || "").trim();
  const exactNumberMatch = number
    ? overridePlayers.findIndex(
        (overridePlayer, index) =>
          !usedIndexes.has(index) &&
          String(overridePlayer?.number || "").trim() === number &&
          sameLayoutPlayer(player, overridePlayer)
      )
    : -1;
  if (exactNumberMatch >= 0) {
    return exactNumberMatch;
  }

  return overridePlayers.findIndex(
    (overridePlayer, index) =>
      !usedIndexes.has(index) &&
      (sameLayoutPlayer(player, overridePlayer) ||
        (number && String(overridePlayer?.number || "").trim() === number))
  );
}

function applyLayoutSideOverride(teamLineup, sideOverride) {
  if (!teamLineup || !Array.isArray(teamLineup.players) || !sideOverride || !Array.isArray(sideOverride.players)) {
    return teamLineup;
  }

  const usedIndexes = new Set();
  const players = teamLineup.players.map((player) => {
    const overrideIndex = findOverridePlayer(player, sideOverride.players, usedIndexes);
    if (overrideIndex < 0) {
      return player;
    }

    usedIndexes.add(overrideIndex);
    const overridePlayer = sideOverride.players[overrideIndex];
    return {
      ...player,
      position: overridePlayer.position || player.position,
      x: overridePlayer.x,
      y: overridePlayer.y
    };
  });

  return {
    ...teamLineup,
    formation: sideOverride.formation || teamLineup.formation,
    players
  };
}

export function getVerifiedLayoutOverride(overridesData, fixtureId) {
  const override = overridesData?.fixtures?.[fixtureId];
  if (!override || override.status !== "verified") {
    return null;
  }

  return override;
}

export function applyLineupLayoutOverride(lineups, override) {
  if (!lineups || !override || override.status !== "verified") {
    return lineups;
  }

  const layoutSource = override.layoutSource || VERIFIED_LAYOUT_SOURCE;
  const overrideSourceIds = Array.isArray(override.sourceIds) ? override.sourceIds : [];

  return {
    ...lineups,
    layoutSource,
    sourceIds: [...new Set([...(lineups.sourceIds || []), ...overrideSourceIds])],
    layoutVerification: {
      status: "verified",
      checkedAt: override.checkedAt,
      sourceIds: overrideSourceIds,
      sources: summarizeOverrideSources(override.sources),
      note: override.note || ""
    },
    home: applyLayoutSideOverride(lineups.home, override.home),
    away: applyLayoutSideOverride(lineups.away, override.away)
  };
}

function summarizeOverrideSources(sources) {
  return (Array.isArray(sources) ? sources : []).map((source) => ({
    name: source.name,
    url: source.url,
    status: source.status,
    ...(source.sourceDetail ? { sourceDetail: source.sourceDetail } : {}),
    ...(source.exactLayout !== undefined ? { exactLayout: source.exactLayout } : {}),
    ...(source.note ? { note: source.note } : {})
  }));
}

function coordinatesMatch(left, right) {
  return Math.abs(Number(left) - Number(right)) < 0.05;
}

function compareLayoutSide(teamLineup, sideOverride, owner) {
  const issues = [];
  const players = Array.isArray(teamLineup?.players) ? teamLineup.players : [];
  const overridePlayers = Array.isArray(sideOverride?.players) ? sideOverride.players : [];

  if (players.length !== 11) {
    issues.push(`${owner} must keep 11 starters`);
  }
  if (overridePlayers.length !== 11) {
    issues.push(`${owner} override must include 11 starters`);
  }

  const byKey = new Map();
  for (const player of players) {
    const key = layoutPlayerKey(player);
    if (key) {
      byKey.set(key, player);
    }
  }

  for (const overridePlayer of overridePlayers) {
    const overrideName = playerName(overridePlayer);
    const key = layoutPlayerKey(overridePlayer);
    const player =
      byKey.get(key) ||
      players.find((candidate) => sameLayoutPlayer(candidate, overridePlayer)) ||
      players.find((candidate) => String(candidate?.number || "").trim() === String(overridePlayer?.number || "").trim());

    if (!player) {
      issues.push(`${owner} is missing verified layout player "${overrideName}"`);
      continue;
    }

    if (String(player.position || "").trim() !== String(overridePlayer.position || "").trim()) {
      issues.push(`${owner} ${overrideName} position fell back to ${player.position || "(blank)"}`);
    }
    if (!coordinatesMatch(player.x, overridePlayer.x) || !coordinatesMatch(player.y, overridePlayer.y)) {
      issues.push(`${owner} ${overrideName} coordinates fell back to ${player.x},${player.y}`);
    }
  }

  return issues;
}

export function compareLineupsToLayoutOverride(lineups, override) {
  if (!lineups || !override || override.status !== "verified") {
    return [];
  }

  const issues = [];
  const expectedSource = override.layoutSource || VERIFIED_LAYOUT_SOURCE;

  if (lineups.layoutSource !== expectedSource) {
    issues.push(`layoutSource must be ${expectedSource}, not ${lineups.layoutSource || "(blank)"}`);
  }
  if (lineups.layoutSource === "derived-team-sheet-order") {
    issues.push("verified layout must not use derived-team-sheet-order");
  }

  const lineupsSourceIds = new Set(Array.isArray(lineups.sourceIds) ? lineups.sourceIds : []);
  for (const sourceId of override.sourceIds || []) {
    if (!lineupsSourceIds.has(sourceId)) {
      issues.push(`sourceIds must include verified layout source "${sourceId}"`);
    }
  }

  issues.push(...compareLayoutSide(lineups.home, override.home, "home layout"));
  issues.push(...compareLayoutSide(lineups.away, override.away, "away layout"));

  return issues;
}
