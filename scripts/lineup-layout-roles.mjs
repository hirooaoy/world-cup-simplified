function rolesForRow(type, count) {
  if (type === "goalkeeper") return ["GK"];
  if (type === "defense") {
    if (count === 3) return ["LCB", "CB", "RCB"];
    if (count === 4) return ["LB", "CB", "CB", "RB"];
    if (count === 5) return ["LWB", "CB", "CB", "CB", "RWB"];
  }
  if (type === "attacking-midfield") {
    if (count === 1) return ["AM"];
    if (count === 2) return ["AM", "AM"];
    if (count === 3) return ["LW", "AM", "RW"];
    if (count === 4) return ["LM", "CM", "CM", "RM"];
  }
  if (type === "forward") {
    if (count === 1) return ["ST"];
    if (count === 2) return ["ST", "ST"];
    if (count === 3) return ["LW", "ST", "RW"];
    if (count === 4) return ["LW", "ST", "ST", "RW"];
  }
  if (type === "midfield") {
    if (count === 1) return ["DM"];
    if (count === 2) return ["CM", "CM"];
    if (count === 3) return ["CM", "CM", "CM"];
    if (count === 4) return ["LM", "CM", "CM", "RM"];
    if (count === 5) return ["LWB", "CM", "CM", "CM", "RWB"];
  }

  return Array.from({ length: count }, () => "CM");
}

function splitIntoPitchBands(players, bandCount) {
  if (!Number.isInteger(bandCount) || bandCount <= 0 || players.length < bandCount) {
    return null;
  }

  const sorted = [...players].sort((left, right) => left.y - right.y || left.x - right.x);
  if (bandCount === 1) {
    return [sorted];
  }

  const splitAfterIndexes = sorted
    .slice(0, -1)
    .map((player, index) => ({
      index,
      gap: Number(sorted[index + 1].y) - Number(player.y)
    }))
    .sort((left, right) => right.gap - left.gap || left.index - right.index)
    .slice(0, bandCount - 1)
    .map(({ index }) => index)
    .sort((left, right) => left - right);

  if (splitAfterIndexes.length !== bandCount - 1) {
    return null;
  }

  const bands = [];
  let offset = 0;
  for (const splitAfterIndex of splitAfterIndexes) {
    bands.push(sorted.slice(offset, splitAfterIndex + 1));
    offset = splitAfterIndex + 1;
  }
  bands.push(sorted.slice(offset));
  return bands;
}

function assignRowRoles(players, type) {
  const rowPlayers = [...players].sort((left, right) => left.x - right.x);
  const roles = rolesForRow(type, rowPlayers.length);
  return rowPlayers.map((player, index) => ({
    ...player,
    position: roles[index] || player.position || "CM"
  }));
}

export function assignRolesFromPitchGeometry(formation, sourcePlayers) {
  const digits = String(formation || "")
    .split("-")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  if (
    digits.reduce((sum, value) => sum + value, 0) !== 10 ||
    !Array.isArray(sourcePlayers) ||
    sourcePlayers.length !== 11 ||
    sourcePlayers.some(
      (player) => !Number.isFinite(Number(player?.x)) || !Number.isFinite(Number(player?.y))
    )
  ) {
    return (sourcePlayers || []).map((player) => ({
      ...player,
      position: player.position || "CM"
    }));
  }

  const [defenderCount, ...frontBandCounts] = digits;
  const players = sourcePlayers
    .map((player, sourceIndex) => ({
      ...player,
      x: Number(player.x),
      y: Number(player.y),
      sourceIndex
    }))
    .sort((left, right) => left.y - right.y || left.x - right.x);

  const goalkeeperPlayers = players.slice(-1);
  const defensePlayers = players.slice(-(defenderCount + 1), -1);
  const frontPlayers = players.slice(0, -(defenderCount + 1));
  const observedFrontBands = splitIntoPitchBands(frontPlayers, frontBandCounts.length);

  if (
    goalkeeperPlayers.length !== 1 ||
    defensePlayers.length !== defenderCount ||
    !observedFrontBands ||
    observedFrontBands.some((band) => band.length === 0)
  ) {
    return sourcePlayers.map((player) => ({ ...player, position: player.position || "CM" }));
  }

  const assigned = [];
  observedFrontBands.forEach((band, index) => {
    const type =
      index === 0
        ? "forward"
        : index === 1 && observedFrontBands[0].length === 1 && band.length > 1
          ? "attacking-midfield"
          : "midfield";
    assigned.push(...assignRowRoles(band, type));
  });
  assigned.push(...assignRowRoles(defensePlayers, "defense"));
  assigned.push(...assignRowRoles(goalkeeperPlayers, "goalkeeper"));

  return assigned
    .sort((left, right) => left.sourceIndex - right.sourceIndex)
    .map(({ sourceIndex: _sourceIndex, ...player }) => player);
}
