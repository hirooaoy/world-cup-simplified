import { resolveFormationLayout } from "./lineup-prediction-engine/formations.mjs";

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

function formationRowCounts(formation) {
  const rows = String(formation || "").split("-").map(Number);
  return [...rows].reverse().concat(1);
}

function groupIntoRows(items, rowCounts, sorter) {
  const ordered = [...items].sort(sorter);
  const rows = [];
  let offset = 0;
  for (const count of rowCounts) {
    rows.push(ordered.slice(offset, offset + count).sort((left, right) => left.x - right.x));
    offset += count;
  }
  return rows;
}

function canonicalSideGeometry(exactClaims, side) {
  const baseSide = exactClaims[0]?.[side];
  if (!baseSide?.formation || !Array.isArray(baseSide.players) || baseSide.players.length !== 11) {
    return null;
  }

  const resolution = resolveFormationLayout(baseSide.formation);
  if (resolution.formation !== baseSide.formation || resolution.layout.length !== 11) {
    return null;
  }

  const rowCounts = formationRowCounts(baseSide.formation);
  const playerRows = groupIntoRows(
    baseSide.players,
    rowCounts,
    (left, right) => left.y - right.y || left.x - right.x
  );
  const slots = resolution.layout.map(([assignmentRole, x, y, displayRole = assignmentRole]) => ({
    position: displayRole,
    x,
    y
  }));
  const slotRows = groupIntoRows(slots, rowCounts, (left, right) => left.y - right.y || left.x - right.x);
  if (playerRows.some((row, index) => row.length !== slotRows[index]?.length)) {
    return null;
  }

  const players = playerRows.flatMap((row, rowIndex) => row.map((player, column) => ({
    ...player,
    position: slotRows[rowIndex][column].position,
    x: slotRows[rowIndex][column].x,
    y: slotRows[rowIndex][column].y
  })));

  return {
    formation: baseSide.formation,
    players
  };
}

export function buildExactLayoutConsensus(
  claims,
  { minimumExactSources = 2, allowStrictMajority = false } = {}
) {
  const matchedClaims = (Array.isArray(claims) ? claims : []).filter(
    (claim) => claim?.status === "matched"
  );

  if (!matchedClaims.length) {
    return { status: "insufficient", reason: "no_matched_sources", matchedClaims, exactClaims: [] };
  }

  if (matchedClaims.some((claim) => !claimSignature(claim))) {
    return { status: "conflict", reason: "tactical_signature_conflict", matchedClaims, exactClaims: [] };
  }

  const signatureGroups = new Map();
  for (const claim of matchedClaims) {
    const signature = claimSignature(claim);
    const group = signatureGroups.get(signature) || [];
    group.push(claim);
    signatureGroups.set(signature, group);
  }
  const rankedGroups = [...signatureGroups.values()].sort((left, right) => right.length - left.length);
  const supportingClaims = rankedGroups[0] || [];
  const dissentingClaims = rankedGroups.slice(1).flat();
  const hasStrictMajority = supportingClaims.length > matchedClaims.length / 2;
  if (signatureGroups.size !== 1 && (!allowStrictMajority || !hasStrictMajority)) {
    return {
      status: "conflict",
      reason: "tactical_signature_conflict",
      matchedClaims,
      supportingClaims,
      dissentingClaims,
      exactClaims: []
    };
  }

  const exactClaims = [];
  const seenSources = new Set();
  for (const claim of supportingClaims) {
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

  const home = canonicalSideGeometry(exactClaims, "home");
  const away = canonicalSideGeometry(exactClaims, "away");
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
    supportingClaims,
    dissentingClaims,
    exactClaims,
    sourceNames: exactClaims.map((claim) => claim.name).filter(Boolean),
    home,
    away
  };
}
