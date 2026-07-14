import { isPlayerNameMatch, normalizePlayerName } from "./player-name-matching.mjs";
import { getLineupGeometryIssues } from "./lineup-geometry.mjs";
import {
  DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE,
  isDerivedLayoutSource,
  normalizeLayoutSource,
  VERIFIED_LAYOUT_SOURCE
} from "./lineup-layout-sources.mjs";

export { VERIFIED_LAYOUT_SOURCE };

const LAYOUT_OVERRIDE_SOURCE_STATUSES = new Set(["matched", "unavailable", "blocked", "error", "conflict"]);

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

  if (getLayoutOverrideProvenanceIssues(override).length) {
    return null;
  }

  return override;
}

export function applyLineupLayoutOverride(lineups, override) {
  if (
    !lineups ||
    !override ||
    override.status !== "verified" ||
    getLayoutOverrideProvenanceIssues(override).length
  ) {
    return lineups;
  }

  const layoutSource = normalizeLayoutSource(override.layoutSource) || VERIFIED_LAYOUT_SOURCE;
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

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isHttpUrl(value) {
  return /^https?:\/\//.test(String(value || ""));
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isMatchedExactLayoutSource(source) {
  return source?.status === "matched" && source?.exactLayout === true;
}

function layoutClaimSignature(source) {
  const home = String(source?.signature?.home || "").trim();
  const away = String(source?.signature?.away || "").trim();
  return home || away ? `${home}::${away}` : "";
}

function noteClaimsMissingSource(note, sources) {
  const sourceNames = new Set(
    sources.map((source) => String(source?.name || "").trim().toLowerCase()).filter(Boolean)
  );
  const text = String(note || "").toLowerCase();
  return ["ESPN", "FotMob", "Google", "Sofascore"]
    .filter((name) => text.includes(name.toLowerCase()) && !sourceNames.has(name.toLowerCase()));
}

export function getLayoutOverrideProvenanceIssues(override) {
  const issues = [];
  if (!isPlainObject(override)) {
    return ["override must be an object"];
  }

  if (!Array.isArray(override.sourceIds) || override.sourceIds.length === 0) {
    issues.push("sourceIds must include at least one source id");
  }

  const sources = Array.isArray(override.sources) ? override.sources : [];
  if (!Array.isArray(override.sources) || sources.length === 0) {
    issues.push("sources must include at least one checked source");
  }

  for (const [index, source] of sources.entries()) {
    const prefix = `sources[${index}]`;
    if (!isPlainObject(source)) {
      issues.push(`${prefix} must be an object`);
      continue;
    }
    if (!hasText(source.name)) {
      issues.push(`${prefix}.name must be a non-empty string`);
    }
    if (!isHttpUrl(source.url)) {
      issues.push(`${prefix}.url must be an http(s) URL`);
    }
    if (!LAYOUT_OVERRIDE_SOURCE_STATUSES.has(source.status)) {
      issues.push(`${prefix}.status must be matched, unavailable, blocked, error, or conflict`);
    }
    if (source.exactLayout !== undefined && typeof source.exactLayout !== "boolean") {
      issues.push(`${prefix}.exactLayout must be a boolean when provided`);
    }
    if (isMatchedExactLayoutSource(source) && !hasText(source.sourceDetail)) {
      issues.push(`${prefix}.sourceDetail must describe the exact layout evidence`);
    }
  }

  if (override.status === "verified") {
    if (normalizeLayoutSource(override.layoutSource) !== VERIFIED_LAYOUT_SOURCE) {
      issues.push(`layoutSource must be ${VERIFIED_LAYOUT_SOURCE} for verified overrides`);
    }
    if (!hasText(override.note)) {
      issues.push("note must explain what was verified");
    }
    if (!sources.some(isMatchedExactLayoutSource)) {
      issues.push("verified overrides must include at least one matched source with exactLayout true");
    }
    if (sources.some((source) => source?.status === "conflict")) {
      issues.push("verified overrides must not contain unresolved source conflicts");
    }
    const matchedSignatures = new Set(
      sources
        .filter((source) => source?.status === "matched")
        .map(layoutClaimSignature)
        .filter(Boolean)
    );
    if (matchedSignatures.size > 1) {
      issues.push("verified overrides must not contain conflicting tactical signatures");
    }
    if (/\bagreed\b/i.test(override.note || "") && sources.filter((source) => source?.status === "matched").length < 2) {
      issues.push("note must not claim source agreement when fewer than two matched sources are stored");
    }
    const missingNamedSources = noteClaimsMissingSource(override.note, sources);
    if (missingNamedSources.length) {
      issues.push(`note names sources that are not stored: ${missingNamedSources.join(", ")}`);
    }
    issues.push(...getLineupGeometryIssues(override?.home?.players, { owner: "home override" }));
    issues.push(...getLineupGeometryIssues(override?.away?.players, { owner: "away override" }));
  }

  if (override.status === "unresolved" && !hasText(override.unresolvedReason)) {
    issues.push("unresolvedReason must explain why the layout was not verified");
  }

  return issues;
}

function coordinatesMatch(left, right) {
  return Math.abs(Number(left) - Number(right)) < 0.05;
}

function compareLayoutSide(teamLineup, sideOverride, owner) {
  const issues = [];
  const players = Array.isArray(teamLineup?.players) ? teamLineup.players : [];
  const overridePlayers = Array.isArray(sideOverride?.players) ? sideOverride.players : [];

  issues.push(...getLineupGeometryIssues(players, { owner }));

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
  const expectedSource = normalizeLayoutSource(override.layoutSource) || VERIFIED_LAYOUT_SOURCE;
  const actualSource = normalizeLayoutSource(lineups.layoutSource);

  if (actualSource !== expectedSource) {
    issues.push(`layoutSource must be ${expectedSource}, not ${lineups.layoutSource || "(blank)"}`);
  }
  if (isDerivedLayoutSource(lineups.layoutSource)) {
    issues.push(`verified layout must not use ${DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE}`);
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
