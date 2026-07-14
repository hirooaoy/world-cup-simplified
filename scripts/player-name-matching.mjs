export function normalizePlayerName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getPlayerTokens(value) {
  const normalized = normalizePlayerName(value);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

export function getCanonicalPlayerKey(value) {
  return getPlayerTokens(value).join("");
}

function simplifyPlayerToken(value) {
  return value.replace(/(.)\1+/g, "$1");
}

const TOKEN_ALIASES = {
  rafik: new Set(["rak"]),
  rak: new Set(["rafik"]),
  christian: new Set(["cristian"]),
  cristian: new Set(["christian"])
};

const NAME_PARTICLES = new Set(["da", "de", "del", "della", "di", "do", "dos", "du", "el", "la", "le", "van", "von"]);

function isTokenAliasMatch(left, right) {
  return Boolean(TOKEN_ALIASES[left]?.has(right) || TOKEN_ALIASES[right]?.has(left));
}

function stripLeadingArticle(value) {
  return value.startsWith("al") && value.length >= 5 ? value.slice(2) : value;
}

function transliterationKey(value) {
  return stripLeadingArticle(value)
    .replace(/^x/, "kh")
    .replace(/q/g, "k")
    .replace(/ou/g, "u")
    .replace(/ph/g, "f");
}

function editDistance(left, right) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function tokenMatchScore(leftValue, rightValue) {
  const left = String(leftValue || "");
  const right = String(rightValue || "");
  if (!left || !right) return 0;
  if (left === right || simplifyPlayerToken(left) === simplifyPlayerToken(right)) return 1;
  if (isTokenAliasMatch(left, right)) return 0.98;

  const leftKey = transliterationKey(left);
  const rightKey = transliterationKey(right);
  if (Math.min(leftKey.length, rightKey.length) >= 5 && leftKey === rightKey) {
    return 0.95;
  }

  // Limit typo tolerance to longer tokens. Five-letter near-neighbours such as
  // Pedri/Pedro are different players and must not be treated as aliases.
  if (
    Math.min(leftKey.length, rightKey.length) >= 7 &&
    leftKey[0] === rightKey[0] &&
    Math.abs(leftKey.length - rightKey.length) <= 1 &&
    editDistance(leftKey, rightKey) <= 1
  ) {
    return 0.9;
  }

  return 0;
}

function significantTokens(tokens) {
  return tokens.filter((token) => token.length > 1 && !NAME_PARTICLES.has(token));
}

function initialsAreCompatible(leftTokens, rightTokens) {
  const leftInitials = leftTokens.filter((token) => token.length === 1);
  const rightInitials = rightTokens.filter((token) => token.length === 1);
  const leftNames = leftTokens.filter((token) => token.length > 1);
  const rightNames = rightTokens.filter((token) => token.length > 1);

  return (
    leftInitials.every((initial) => rightNames.some((token) => token.startsWith(initial))) &&
    rightInitials.every((initial) => leftNames.some((token) => token.startsWith(initial)))
  );
}

function bestTokenMatches(leftTokens, rightTokens) {
  const candidates = [];
  for (const [leftIndex, left] of leftTokens.entries()) {
    for (const [rightIndex, right] of rightTokens.entries()) {
      const score = tokenMatchScore(left, right);
      if (score > 0) candidates.push({ leftIndex, rightIndex, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.leftIndex - b.leftIndex || a.rightIndex - b.rightIndex);

  const usedLeft = new Set();
  const usedRight = new Set();
  const selected = [];
  for (const candidate of candidates) {
    if (usedLeft.has(candidate.leftIndex) || usedRight.has(candidate.rightIndex)) continue;
    usedLeft.add(candidate.leftIndex);
    usedRight.add(candidate.rightIndex);
    selected.push(candidate);
  }
  return selected;
}

export function getPlayerNameMatchScore(leftName, rightName) {
  const leftNormalized = normalizePlayerName(leftName);
  const rightNormalized = normalizePlayerName(rightName);
  if (!leftNormalized || !rightNormalized) return 0;
  if (leftNormalized === rightNormalized) return 1;

  const leftTokens = getPlayerTokens(leftName);
  const rightTokens = getPlayerTokens(rightName);
  const leftCompact = leftTokens.join("");
  const rightCompact = rightTokens.join("");
  if (Math.min(leftCompact.length, rightCompact.length) >= 4 && leftCompact === rightCompact) {
    return 0.995;
  }
  if (!initialsAreCompatible(leftTokens, rightTokens)) return 0;

  const leftSignificant = significantTokens(leftTokens);
  const rightSignificant = significantTokens(rightTokens);
  if (!leftSignificant.length || !rightSignificant.length) return 0;

  if (leftSignificant.length === 1 || rightSignificant.length === 1) {
    const [single] = leftSignificant.length === 1 ? leftSignificant : rightSignificant;
    const other = leftSignificant.length === 1 ? rightSignificant : leftSignificant;
    const best = Math.max(...other.map((token) => tokenMatchScore(single, token)), 0);
    if (!best) return 0;

    const otherLast = other.at(-1);
    const isSurnameMatch = tokenMatchScore(single, otherLast) > 0;
    // A short single given name (for example, Nico) is too ambiguous unless it
    // is the surname. Longer mononyms such as Marquinhos remain supported.
    return isSurnameMatch || single.length >= 6 ? best * 0.94 : 0;
  }

  const matches = bestTokenMatches(leftSignificant, rightSignificant);
  const shorterLength = Math.min(leftSignificant.length, rightSignificant.length);
  if (matches.length < Math.min(2, shorterLength)) return 0;

  const allShorterTokensMatched = matches.length === shorterLength;
  if (!allShorterTokensMatched) return 0;
  return Math.min(...matches.map((match) => match.score)) * 0.96;
}

export function isPlayerNameMatch(displayName, rosterName) {
  return getPlayerNameMatchScore(displayName, rosterName) >= 0.8;
}

function defaultPlayerName(value) {
  if (value && typeof value === "object") {
    return value.name || value.displayName || value.fullName || "";
  }
  return value;
}

/**
 * Resolve a player name against a team-scoped identity pool.
 *
 * Exact canonical identities always win, even when a longer teammate name is
 * also a fuzzy match (for example Ederson vs Ederson Silva). A fuzzy alias is
 * accepted only when it maps to one canonical identity in the supplied pool.
 * Callers can therefore distinguish an unknown name from an ambiguous one and
 * avoid destructive availability exclusions or starter/bench de-duplication.
 */
export function resolvePlayerNameInPool(value, pool = [], {
  getIdentityKey,
  getName = defaultPlayerName,
  getNames
} = {}) {
  const queryName = String(defaultPlayerName(value) || "").trim();
  const queryKey = getCanonicalPlayerKey(queryName);
  if (!queryKey) {
    return { status: "unmatched", matchType: "none", key: "", name: queryName, candidate: null };
  }

  const identities = new Map();
  for (const candidate of pool || []) {
    const candidateNames = (getNames ? getNames(candidate) : [getName(candidate)])
      .map((name) => String(name || "").trim())
      .filter(Boolean);
    const key = getCanonicalPlayerKey(
      getIdentityKey ? getIdentityKey(candidate) : candidateNames[0]
    );
    if (!key || !candidateNames.length) continue;
    const identity = identities.get(key) || { candidate, key, name: candidateNames[0], aliases: new Set() };
    for (const candidateName of candidateNames) identity.aliases.add(candidateName);
    identities.set(key, identity);
  }

  const exactMatches = [...identities.values()].filter((identity) =>
    [...identity.aliases].some((alias) => getCanonicalPlayerKey(alias) === queryKey)
  );
  if (exactMatches.length === 1) {
    const { aliases, ...exact } = exactMatches[0];
    return { status: "matched", matchType: "exact", ...exact };
  }
  if (exactMatches.length > 1) {
    return { status: "ambiguous", matchType: "exact", key: "", name: queryName, candidate: null };
  }

  const fuzzyMatches = [...identities.values()].filter((identity) =>
    [...identity.aliases].some((alias) => isPlayerNameMatch(queryName, alias))
  );
  if (fuzzyMatches.length === 1) {
    const { aliases, ...fuzzy } = fuzzyMatches[0];
    return { status: "matched", matchType: "fuzzy", ...fuzzy };
  }
  if (fuzzyMatches.length > 1) {
    return { status: "ambiguous", matchType: "fuzzy", key: "", name: queryName, candidate: null };
  }
  return { status: "unmatched", matchType: "none", key: "", name: queryName, candidate: null };
}

export function matchPlayerNameLists(leftNames = [], rightNames = []) {
  const left = leftNames.map((value) => String(value || ""));
  const right = rightNames.map((value) => String(value || ""));
  const adjacency = left.map((leftName) =>
    right
      .map((rightName, rightIndex) => ({ rightIndex, score: getPlayerNameMatchScore(leftName, rightName) }))
      .filter((candidate) => candidate.score >= 0.8)
      .sort((a, b) => b.score - a.score || a.rightIndex - b.rightIndex)
  );
  const rightOwner = Array(right.length).fill(-1);

  function augment(leftIndex, visited) {
    for (const candidate of adjacency[leftIndex]) {
      if (visited.has(candidate.rightIndex)) continue;
      visited.add(candidate.rightIndex);
      if (rightOwner[candidate.rightIndex] === -1 || augment(rightOwner[candidate.rightIndex], visited)) {
        rightOwner[candidate.rightIndex] = leftIndex;
        return true;
      }
    }
    return false;
  }

  const leftOrder = left
    .map((_, leftIndex) => leftIndex)
    .sort((a, b) => adjacency[a].length - adjacency[b].length || a - b);
  for (const leftIndex of leftOrder) augment(leftIndex, new Set());

  const matches = rightOwner
    .map((leftIndex, rightIndex) => leftIndex >= 0
      ? {
          leftIndex,
          rightIndex,
          leftName: left[leftIndex],
          rightName: right[rightIndex],
          score: getPlayerNameMatchScore(left[leftIndex], right[rightIndex])
        }
      : null)
    .filter(Boolean)
    .sort((a, b) => a.leftIndex - b.leftIndex);
  const matchedLeft = new Set(matches.map((match) => match.leftIndex));
  const matchedRight = new Set(matches.map((match) => match.rightIndex));

  return {
    matches,
    unmatchedLeft: left.map((name, index) => ({ name, index })).filter(({ index }) => !matchedLeft.has(index)),
    unmatchedRight: right.map((name, index) => ({ name, index })).filter(({ index }) => !matchedRight.has(index))
  };
}
