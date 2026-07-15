export function roundMean(values) {
  const finiteValues = values.map(Number).filter(Number.isFinite);
  if (!finiteValues.length) {
    return null;
  }

  return Math.round(finiteValues.reduce((total, value) => total + value, 0) / finiteValues.length);
}

export function buildSourceConsensusProjection(inputs) {
  if (!Array.isArray(inputs) || inputs.length < 2) {
    return null;
  }

  const home = roundMean(inputs.map((input) => input?.home));
  const draw = roundMean(inputs.map((input) => input?.draw));
  if (!Number.isFinite(home) || !Number.isFinite(draw)) {
    return null;
  }

  return {
    home,
    draw,
    away: 100 - home - draw
  };
}

export function buildConditionalRegulationProjection(inputs, drawInputs) {
  if (!Array.isArray(inputs) || inputs.length < 2 || !Array.isArray(drawInputs) || drawInputs.length < 2) {
    return null;
  }

  const matchWinnerHome = roundMean(inputs.map((input) => input?.home));
  const draw = roundMean(drawInputs.map((input) => input?.draw));
  if (!Number.isFinite(matchWinnerHome) || !Number.isFinite(draw)) {
    return null;
  }

  const home = Math.round((matchWinnerHome * (100 - draw)) / 100);
  return {
    home,
    draw,
    away: 100 - draw - home
  };
}

export function sameProjectionValues(projection, expected) {
  return Boolean(
    projection &&
      expected &&
      projection.home === expected.home &&
      projection.draw === expected.draw &&
      projection.away === expected.away
  );
}
