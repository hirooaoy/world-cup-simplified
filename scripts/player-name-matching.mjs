export function normalizePlayerName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getPlayerTokens(value) {
  const normalized = normalizePlayerName(value);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

function simplifyPlayerToken(value) {
  return value.replace(/(.)\1+/g, "$1");
}

function isSignificantToken(value) {
  return value.length >= 3;
}

function stripLeadingArticle(value) {
  return value.startsWith("al") && value.length >= 5 ? value.slice(2) : value;
}

function getConsonantKey(value) {
  return stripLeadingArticle(value).replace(/[aeiouy]/g, "");
}

function getCompactTokenKey(tokens) {
  return tokens.filter((token) => token.length > 1).join("");
}

function isTokenMatch(displayToken, rosterToken) {
  const simplifiedDisplayToken = simplifyPlayerToken(displayToken);
  const simplifiedRosterToken = simplifyPlayerToken(rosterToken);
  const displayCore = stripLeadingArticle(displayToken);
  const rosterCore = stripLeadingArticle(rosterToken);

  if (rosterToken === displayToken || simplifiedRosterToken === simplifiedDisplayToken) {
    return true;
  }

  if (displayCore === rosterCore) {
    return true;
  }

  if (
    displayToken.length >= 5 &&
    rosterToken.length >= 5 &&
    getConsonantKey(displayToken) === getConsonantKey(rosterToken)
  ) {
    return true;
  }

  if (displayToken.length < 4 || rosterToken.length < 4) {
    return false;
  }

  return (
    rosterCore.includes(displayCore) ||
    displayCore.includes(rosterCore) ||
    simplifiedRosterToken.includes(simplifiedDisplayToken) ||
    simplifiedDisplayToken.includes(simplifiedRosterToken)
  );
}

function hasOrderedTokenSequence(haystackTokens, needleTokens) {
  if (!haystackTokens.length || !needleTokens.length || needleTokens.length > haystackTokens.length) {
    return false;
  }

  return haystackTokens.some((_, startIndex) =>
    needleTokens.every((needleToken, offset) =>
      isTokenMatch(needleToken, haystackTokens[startIndex + offset] || "")
    )
  );
}

export function isPlayerNameMatch(displayName, rosterName) {
  const displayTokens = getPlayerTokens(displayName);
  const rosterTokens = getPlayerTokens(rosterName);

  if (!displayTokens.length || !rosterTokens.length) {
    return false;
  }

  if (
    hasOrderedTokenSequence(rosterTokens, displayTokens) ||
    hasOrderedTokenSequence(displayTokens, rosterTokens)
  ) {
    return true;
  }

  const displayCompactKey = getCompactTokenKey(displayTokens);
  const rosterCompactKey = getCompactTokenKey(rosterTokens);

  if (
    displayCompactKey.length >= 6 &&
    rosterCompactKey.length >= 6 &&
    (displayCompactKey === rosterCompactKey ||
      getConsonantKey(displayCompactKey) === getConsonantKey(rosterCompactKey))
  ) {
    return true;
  }

  const displaySignificantTokens = displayTokens.filter(isSignificantToken);
  const rosterSignificantTokens = rosterTokens.filter(isSignificantToken);
  const lastDisplayToken = displaySignificantTokens.at(-1);

  if (!displaySignificantTokens.length || !rosterSignificantTokens.length || !lastDisplayToken) {
    return false;
  }

  const lastNameMatches = rosterSignificantTokens.some((rosterToken) =>
    isTokenMatch(lastDisplayToken, rosterToken)
  );

  if (!lastNameMatches) {
    return false;
  }

  const matchedDisplayTokens = displaySignificantTokens.filter((displayToken) =>
    rosterSignificantTokens.some((rosterToken) => isTokenMatch(displayToken, rosterToken))
  );

  if (displaySignificantTokens.length === 1) {
    return matchedDisplayTokens.length === 1;
  }

  if (matchedDisplayTokens.length >= 2) {
    return true;
  }

  return rosterSignificantTokens.length === 1 && matchedDisplayTokens.length === 1;
}
