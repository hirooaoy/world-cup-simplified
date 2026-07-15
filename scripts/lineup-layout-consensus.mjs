import { normalizeLayoutPlayerName } from "./lineup-layout-overrides.mjs";

function claimSignature(claim) {
  const home = String(claim?.signature?.home || "").trim();
  const away = String(claim?.signature?.away || "").trim();
  return home && away ? `${home}::${away}` : "";
}

function sourceIdentity(claim) {
  return String(claim?.adapter || claim?.providerId || claim?.name || claim?.url || "")
    .trim()
    .toLowerCase();
}

function median(values) {
  const sorted = values.map(Number).filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) {
    return Number.NaN;
  }

  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function findClaimPlayer(claim, side, name) {
  const key = normalizeLayoutPlayerName(name);
  return (claim?.[side]?.players || []).find(
    (player) => normalizeLayoutPlayerName(player?.name) === key
  );
}

function mergeSideGeometry(exactClaims, side) {
  const baseSide = exactClaims[0]?.[side];
  if (!baseSide?.formation || !Array.isArray(baseSide.players) || baseSide.players.length !== 11) {
    return null;
  }

  const players = baseSide.players.map((basePlayer) => {
    const sourcePlayers = exactClaims.map((claim) => findClaimPlayer(claim, side, basePlayer.name));
    if (sourcePlayers.some((player) => !player)) {
      return null;
    }

    const x = median(sourcePlayers.map((player) => player.x));
    const y = median(sourcePlayers.map((player) => player.y));
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    return {
      ...basePlayer,
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1))
    };
  });

  if (players.some((player) => !player)) {
    return null;
  }

  return {
    formation: baseSide.formation,
    players
  };
}

function geometryWithinTolerance(exactClaims, { maximumXDelta, maximumYDelta }) {
  for (const side of ["home", "away"]) {
    for (const basePlayer of exactClaims[0]?.[side]?.players || []) {
      const sourcePlayers = exactClaims.map((claim) => findClaimPlayer(claim, side, basePlayer.name));
      if (sourcePlayers.some((player) => !player)) {
        return false;
      }
      const xValues = sourcePlayers.map((player) => Number(player.x));
      const yValues = sourcePlayers.map((player) => Number(player.y));
      if (
        xValues.some((value) => !Number.isFinite(value)) ||
        yValues.some((value) => !Number.isFinite(value)) ||
        Math.max(...xValues) - Math.min(...xValues) > maximumXDelta ||
        Math.max(...yValues) - Math.min(...yValues) > maximumYDelta
      ) {
        return false;
      }
    }
  }

  return true;
}

export function buildExactLayoutConsensus(
  claims,
  { minimumExactSources = 2, maximumXDelta = 8, maximumYDelta = 10 } = {}
) {
  const matchedClaims = (Array.isArray(claims) ? claims : []).filter(
    (claim) => claim?.status === "matched"
  );
  const matchedSignatures = new Set(matchedClaims.map(claimSignature).filter(Boolean));

  if (!matchedClaims.length) {
    return { status: "insufficient", reason: "no_matched_sources", matchedClaims, exactClaims: [] };
  }

  if (matchedSignatures.size !== 1 || matchedClaims.some((claim) => !claimSignature(claim))) {
    return { status: "conflict", reason: "tactical_signature_conflict", matchedClaims, exactClaims: [] };
  }

  const exactClaims = [];
  const seenSources = new Set();
  for (const claim of matchedClaims) {
    if (!claim.exactLayout) {
      continue;
    }
    const identity = sourceIdentity(claim);
    if (!identity || seenSources.has(identity)) {
      continue;
    }
    seenSources.add(identity);
    exactClaims.push(claim);
  }

  if (exactClaims.length < minimumExactSources) {
    return {
      status: "insufficient",
      reason: "not_enough_exact_sources",
      matchedClaims,
      exactClaims
    };
  }

  if (!geometryWithinTolerance(exactClaims, { maximumXDelta, maximumYDelta })) {
    return {
      status: "conflict",
      reason: "geometry_tolerance_conflict",
      matchedClaims,
      exactClaims
    };
  }

  const home = mergeSideGeometry(exactClaims, "home");
  const away = mergeSideGeometry(exactClaims, "away");
  if (!home || !away) {
    return {
      status: "insufficient",
      reason: "incomplete_exact_geometry",
      matchedClaims,
      exactClaims
    };
  }

  return {
    status: "agreed",
    matchedClaims,
    exactClaims,
    sourceNames: exactClaims.map((claim) => claim.name).filter(Boolean),
    home,
    away
  };
}
