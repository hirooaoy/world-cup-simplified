export const DEFAULT_PREDICTED_FORMATION = "4-2-3-1";

// A layout slot is [assignmentRole, x, y, optionalDisplayRole]. Assignment
// roles may be more specific than the public role so consensus can preserve
// left/right evidence without exposing non-standard labels such as RAM/LAM.
const KNOWN_FORMATION_LAYOUTS = {
  "3-4-1-2": [
    ["GK", 50, 91],
    ["RCB", 68, 75],
    ["CB", 50, 77],
    ["LCB", 32, 75],
    ["RM", 84, 56],
    ["RCM", 60, 57, "CM"],
    ["LCM", 40, 57, "CM"],
    ["LM", 16, 56],
    ["AM", 50, 40],
    ["RST", 58, 22, "ST"],
    ["LST", 42, 22, "ST"]
  ],
  "3-4-2-1": [
    ["GK", 50, 91],
    ["RCB", 68, 75],
    ["CB", 50, 77],
    ["LCB", 32, 75],
    ["RM", 84, 56],
    ["RCM", 60, 57, "CM"],
    ["LCM", 40, 57, "CM"],
    ["LM", 16, 56],
    ["RAM", 62, 38, "AM"],
    ["LAM", 38, 38, "AM"],
    ["ST", 50, 20]
  ],
  "3-4-3": [
    ["GK", 50, 91],
    ["RCB", 68, 75],
    ["CB", 50, 77],
    ["LCB", 32, 75],
    ["RM", 84, 56],
    ["RCM", 60, 57, "CM"],
    ["LCM", 40, 57, "CM"],
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
    ["RCM", 67, 54, "CM"],
    ["CM", 50, 57],
    ["LCM", 33, 54, "CM"],
    ["LM", 16, 56],
    ["RST", 58, 22, "ST"],
    ["LST", 42, 22, "ST"]
  ],
  "4-1-2-3": [
    ["GK", 50, 91],
    ["RB", 85, 75],
    ["RCB", 62, 75, "CB"],
    ["LCB", 38, 75, "CB"],
    ["LB", 15, 75],
    ["DM", 50, 61],
    ["RCM", 64, 49, "CM"],
    ["LCM", 36, 49, "CM"],
    ["RW", 82, 31],
    ["ST", 50, 21],
    ["LW", 18, 31]
  ],
  "4-1-3-2": [
    ["GK", 50, 91],
    ["RB", 85, 75],
    ["RCB", 62, 75, "CB"],
    ["LCB", 38, 75, "CB"],
    ["LB", 15, 75],
    ["DM", 50, 61],
    ["RCM", 68, 45, "CM"],
    ["CM", 50, 42],
    ["LCM", 32, 45, "CM"],
    ["RST", 58, 22, "ST"],
    ["LST", 42, 22, "ST"]
  ],
  "4-1-4-1": [
    ["GK", 50, 91],
    ["RB", 85, 75],
    ["RCB", 62, 75, "CB"],
    ["LCB", 38, 75, "CB"],
    ["LB", 15, 75],
    ["DM", 50, 62],
    ["RM", 82, 45],
    ["RCM", 60, 47, "CM"],
    ["LCM", 40, 47, "CM"],
    ["LM", 18, 45],
    ["ST", 50, 22]
  ],
  "4-2-1-3": [
    ["GK", 50, 91],
    ["RB", 85, 75],
    ["RCB", 62, 75, "CB"],
    ["LCB", 38, 75, "CB"],
    ["LB", 15, 75],
    ["RCM", 62, 59, "CM"],
    ["LCM", 38, 59, "CM"],
    ["AM", 50, 43],
    ["RW", 82, 31],
    ["ST", 50, 21],
    ["LW", 18, 31]
  ],
  "4-2-2-2": [
    ["GK", 50, 91],
    ["RB", 85, 75],
    ["RCB", 62, 75, "CB"],
    ["LCB", 38, 75, "CB"],
    ["LB", 15, 75],
    ["RCM", 62, 59, "CM"],
    ["LCM", 38, 59, "CM"],
    ["RAM", 66, 40, "AM"],
    ["LAM", 34, 40, "AM"],
    ["RST", 59, 22, "ST"],
    ["LST", 41, 22, "ST"]
  ],
  "4-2-3-1": [
    ["GK", 50, 91],
    ["RB", 85, 75],
    ["RCB", 62, 75, "CB"],
    ["LCB", 38, 75, "CB"],
    ["LB", 15, 75],
    ["RCM", 66, 59, "CM"],
    ["LCM", 34, 59, "CM"],
    ["RW", 82, 40],
    ["AM", 50, 40],
    ["LW", 18, 40],
    ["ST", 50, 20]
  ],
  "4-3-3": [
    ["GK", 50, 91],
    ["RB", 85, 75],
    ["RCB", 62, 75, "CB"],
    ["LCB", 38, 75, "CB"],
    ["LB", 15, 75],
    ["RCM", 75, 53, "CM"],
    ["CM", 50, 53],
    ["LCM", 25, 53, "CM"],
    ["RW", 82, 31],
    ["ST", 50, 21],
    ["LW", 18, 31]
  ],
  "4-4-2": [
    ["GK", 50, 91],
    ["RB", 85, 75],
    ["RCB", 62, 75, "CB"],
    ["LCB", 38, 75, "CB"],
    ["LB", 15, 75],
    ["RM", 82, 52],
    ["RCM", 62, 55, "CM"],
    ["LCM", 38, 55, "CM"],
    ["LM", 18, 52],
    ["RST", 59, 24, "ST"],
    ["LST", 41, 24, "ST"]
  ],
  "5-2-3": [
    ["GK", 50, 91],
    ["RWB", 88, 68],
    ["RCB", 68, 75],
    ["CB", 50, 77],
    ["LCB", 32, 75],
    ["LWB", 12, 68],
    ["RCM", 60, 55, "CM"],
    ["LCM", 40, 55, "CM"],
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
    ["RCM", 68, 52, "CM"],
    ["CM", 50, 55],
    ["LCM", 32, 52, "CM"],
    ["RST", 58, 22, "ST"],
    ["LST", 42, 22, "ST"]
  ],
  "5-4-1": [
    ["GK", 50, 91],
    ["RWB", 88, 68],
    ["RCB", 68, 75],
    ["CB", 50, 77],
    ["LCB", 32, 75],
    ["LWB", 12, 68],
    ["RM", 82, 48],
    ["RCM", 60, 51, "CM"],
    ["LCM", 40, 51, "CM"],
    ["LM", 18, 48],
    ["ST", 50, 22]
  ]
};

function normalizeNumber(value) {
  return Number(Number(value).toFixed(2));
}

export function normalizeFormationLabel(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/\s+/g, "");
  return /^\d{2,5}$/.test(normalized) ? [...normalized].join("-") : normalized;
}

export function parseFormationLabel(value) {
  const formation = normalizeFormationLabel(value);
  if (!/^\d(?:-\d){1,4}$/.test(formation)) return null;
  const lines = formation.split("-").map(Number);
  if (
    lines.reduce((sum, count) => sum + count, 0) !== 10 ||
    lines[0] < 3 ||
    lines[0] > 5 ||
    lines.some((count) => count < 1 || count > 5)
  ) {
    return null;
  }
  return { formation, lines };
}

function defenceSlots(count, y) {
  if (count === 3) return [["RCB", 68, y], ["CB", 50, y + 2], ["LCB", 32, y]];
  if (count === 4) {
    return [
      ["RB", 85, y],
      ["RCB", 62, y, "CB"],
      ["LCB", 38, y, "CB"],
      ["LB", 15, y]
    ];
  }
  if (count === 5) {
    return [
      ["RWB", 88, y - 7],
      ["RCB", 68, y],
      ["CB", 50, y + 2],
      ["LCB", 32, y],
      ["LWB", 12, y - 7]
    ];
  }
  return null;
}

function midfieldSlots(count, y, attacking = false) {
  if (attacking) {
    if (count === 1) return [["AM", 50, y]];
    if (count === 2) return [["RAM", 64, y, "AM"], ["LAM", 36, y, "AM"]];
    if (count === 3) return [["RW", 82, y], ["AM", 50, y], ["LW", 18, y]];
    if (count === 4) {
      return [["RM", 84, y], ["RAM", 62, y, "AM"], ["LAM", 38, y, "AM"], ["LM", 16, y]];
    }
    if (count === 5) {
      return [["RW", 86, y], ["RAM", 68, y, "AM"], ["AM", 50, y], ["LAM", 32, y, "AM"], ["LW", 14, y]];
    }
  } else {
    if (count === 1) return [["DM", 50, y]];
    if (count === 2) return [["RCM", 62, y, "CM"], ["LCM", 38, y, "CM"]];
    if (count === 3) return [["RCM", 68, y, "CM"], ["CM", 50, y], ["LCM", 32, y, "CM"]];
    if (count === 4) {
      return [["RM", 84, y], ["RCM", 61, y, "CM"], ["LCM", 39, y, "CM"], ["LM", 16, y]];
    }
    if (count === 5) {
      return [["RM", 86, y], ["RCM", 68, y, "CM"], ["CM", 50, y], ["LCM", 32, y, "CM"], ["LM", 14, y]];
    }
  }
  return null;
}

function attackSlots(count, y) {
  if (count === 1) return [["ST", 50, y]];
  if (count === 2) return [["RST", 59, y, "ST"], ["LST", 41, y, "ST"]];
  if (count === 3) return [["RW", 82, y + 7], ["ST", 50, y], ["LW", 18, y + 7]];
  if (count === 4) {
    return [["RW", 84, y + 8], ["RST", 61, y, "ST"], ["LST", 39, y, "ST"], ["LW", 16, y + 8]];
  }
  if (count === 5) {
    return [["RW", 88, y + 9], ["RST", 69, y, "ST"], ["ST", 50, y - 1], ["LST", 31, y, "ST"], ["LW", 12, y + 9]];
  }
  return null;
}

function createParsedLayout(lines) {
  const layerYs = lines.map((_, index) =>
    normalizeNumber(75 - (53 * index) / Math.max(1, lines.length - 1))
  );
  const layout = [["GK", 50, 91]];
  const defence = defenceSlots(lines[0], layerYs[0]);
  if (!defence) return null;
  layout.push(...defence);

  for (let index = 1; index < lines.length - 1; index += 1) {
    const midfield = midfieldSlots(lines[index], layerYs[index], index === lines.length - 2);
    if (!midfield) return null;
    layout.push(...midfield);
  }

  const attack = attackSlots(lines.at(-1), layerYs.at(-1));
  if (!attack) return null;
  layout.push(...attack);
  return layout.length === 11 ? layout : null;
}

export function resolveFormationLayout(value, {
  fallbackFormation = DEFAULT_PREDICTED_FORMATION
} = {}) {
  const requestedFormation = normalizeFormationLabel(value);
  const knownLayout = KNOWN_FORMATION_LAYOUTS[requestedFormation];
  if (knownLayout) {
    return {
      requestedFormation,
      formation: requestedFormation,
      layout: knownLayout,
      resolution: "known-layout",
      caveat: ""
    };
  }

  const parsed = parseFormationLabel(requestedFormation);
  const parsedLayout = parsed ? createParsedLayout(parsed.lines) : null;
  if (parsedLayout) {
    return {
      requestedFormation,
      formation: parsed.formation,
      layout: parsedLayout,
      resolution: "deterministic-parsed-layout",
      caveat: `Formation ${parsed.formation} uses a deterministic role grid; exact player placement remains inferred.`
    };
  }

  const normalizedFallback = normalizeFormationLabel(fallbackFormation);
  const fallbackLayout = KNOWN_FORMATION_LAYOUTS[normalizedFallback];
  if (!fallbackLayout) {
    throw new Error(`Formation fallback "${fallbackFormation}" has no known layout`);
  }
  return {
    requestedFormation,
    formation: normalizedFallback,
    layout: fallbackLayout,
    resolution: "normalized-fallback",
    caveat: requestedFormation
      ? `Unsupported formation "${requestedFormation}" was normalized to ${normalizedFallback} so the displayed label matches its role grid.`
      : `Missing formation was normalized to ${normalizedFallback} so the displayed label matches its role grid.`
  };
}

export function getFormationDisplayPositions(value) {
  return resolveFormationLayout(value).layout.map(([assignmentRole, , , displayRole = assignmentRole]) => displayRole);
}

export function formationLayoutMatchesPlayers(value, players, { coordinateTolerance = 0.01 } = {}) {
  const formation = normalizeFormationLabel(value);
  const resolution = resolveFormationLayout(formation);
  if (resolution.formation !== formation || !Array.isArray(players) || players.length !== 11) return false;

  const remaining = players.map((player) => ({
    position: String(player?.position || "").trim().toUpperCase(),
    x: Number(player?.x),
    y: Number(player?.y)
  }));
  for (const [assignmentRole, x, y, displayRole = assignmentRole] of resolution.layout) {
    const matchIndex = remaining.findIndex((player) =>
      player.position === displayRole &&
      Number.isFinite(player.x) &&
      Number.isFinite(player.y) &&
      Math.abs(player.x - x) <= coordinateTolerance &&
      Math.abs(player.y - y) <= coordinateTolerance
    );
    if (matchIndex < 0) return false;
    remaining.splice(matchIndex, 1);
  }
  return remaining.length === 0;
}
