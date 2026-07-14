const DEFAULT_EXPECTED_PLAYER_COUNT = 11;
const MIN_PITCH_COORDINATE = 3;
const MAX_PITCH_COORDINATE = 97;
const MIN_HORIZONTAL_SPAN = 30;
const MIN_VERTICAL_SPAN = 35;
const MIN_UNIQUE_COORDINATE_PAIRS = 9;

function formatNumber(value) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : value;
}

function coordinatePairKey(player) {
  return `${Number(player.x).toFixed(2)},${Number(player.y).toFixed(2)}`;
}

/**
 * Validate pitch geometry independently of tournament year or lineup source.
 * The thresholds are deliberately structural: a lineup must occupy the field,
 * keep markers inside the visible pitch, and avoid collapsing most starters
 * onto the same coordinates.
 */
export function getLineupGeometryIssues(players, {
  owner = "lineup",
  expectedPlayerCount = DEFAULT_EXPECTED_PLAYER_COUNT
} = {}) {
  const issues = [];
  if (!Array.isArray(players)) {
    return [`${owner} players must be an array`];
  }
  if (players.length !== expectedPlayerCount) {
    issues.push(`${owner} must include ${expectedPlayerCount} positioned players`);
  }

  const coordinates = players.map((player, index) => ({
    index,
    name: String(player?.name || player?.displayName || `player ${index + 1}`).trim(),
    x: Number(player?.x),
    y: Number(player?.y)
  }));
  const invalidCoordinates = coordinates.filter(({ x, y }) =>
    !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100
  );
  if (invalidCoordinates.length) {
    issues.push(
      `${owner} has invalid pitch coordinates for ${invalidCoordinates.map(({ name }) => name).join(", ")}`
    );
    return issues;
  }
  if (!coordinates.length) {
    return issues;
  }

  const xs = coordinates.map(({ x }) => x);
  const ys = coordinates.map(({ y }) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const horizontalSpan = maxX - minX;
  const verticalSpan = maxY - minY;
  const uniqueCoordinatePairs = new Set(coordinates.map(coordinatePairKey)).size;

  if (minX < MIN_PITCH_COORDINATE || maxX > MAX_PITCH_COORDINATE ||
      minY < MIN_PITCH_COORDINATE || maxY > MAX_PITCH_COORDINATE) {
    issues.push(
      `${owner} must keep markers inside the visible pitch inset; ` +
      `measured x=${formatNumber(minX)}..${formatNumber(maxX)}, y=${formatNumber(minY)}..${formatNumber(maxY)}`
    );
  }
  if (horizontalSpan < MIN_HORIZONTAL_SPAN) {
    issues.push(
      `${owner} horizontal spread is collapsed (${formatNumber(horizontalSpan)} percentage points)`
    );
  }
  if (verticalSpan < MIN_VERTICAL_SPAN) {
    issues.push(
      `${owner} vertical spread is collapsed (${formatNumber(verticalSpan)} percentage points)`
    );
  }
  if (players.length === expectedPlayerCount && uniqueCoordinatePairs < MIN_UNIQUE_COORDINATE_PAIRS) {
    issues.push(
      `${owner} reuses too many pitch coordinates (${uniqueCoordinatePairs}/${expectedPlayerCount} unique positions)`
    );
  }

  return issues;
}

export function hasPlausibleLineupGeometry(players, options) {
  return getLineupGeometryIssues(players, options).length === 0;
}

export function getLineupRecordGeometryIssues(lineup, { owner = "lineup" } = {}) {
  if (!lineup || typeof lineup !== "object") {
    return [`${owner} must be an object`];
  }
  return ["home", "away"].flatMap((side) =>
    getLineupGeometryIssues(lineup?.[side]?.players, { owner: `${owner}.${side}` })
  );
}
