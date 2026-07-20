function normalizePositionKey(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[‐‑‒–—-]/gu, " ")
    .replace(/\s+/gu, " ");
}

function getPositionRoleMap(lineupPositions, playerPositions) {
  const roleMap = new Map();
  Object.entries(playerPositions || {}).forEach(([source, localized]) => {
    roleMap.set(normalizePositionKey(source), String(localized || "").trim());
  });
  Object.entries(lineupPositions || {}).forEach(([source, localized]) => {
    roleMap.set(normalizePositionKey(source), String(localized || "").trim());
  });
  return roleMap;
}

export function translateCompoundPosition(
  value,
  { lineupPositions = {}, playerPositions = {}, separator = ", " } = {}
) {
  const position = String(value || "").trim();
  if (!position) {
    return position;
  }

  const roleMap = getPositionRoleMap(lineupPositions, playerPositions);
  const direct = roleMap.get(normalizePositionKey(position));
  if (direct) {
    return direct;
  }

  const roleKeys = [...roleMap.keys()]
    .map((role) => role.split(" "))
    .sort((left, right) => right.length - left.length);
  const segments = position
    .replace(/[‐‑‒–—-]/gu, " ")
    .split(/\s*[,/;]\s*/u)
    .map(normalizePositionKey)
    .filter(Boolean);
  const translatedRoles = [];

  for (const segment of segments) {
    const words = segment.split(" ");
    let index = 0;
    while (index < words.length) {
      const roleWords = roleKeys.find(
        (candidate) =>
          candidate.length <= words.length - index &&
          candidate.every((word, offset) => words[index + offset] === word)
      );
      if (!roleWords) {
        return position;
      }
      const localized = roleMap.get(roleWords.join(" "));
      if (localized && translatedRoles.at(-1) !== localized) {
        translatedRoles.push(localized);
      }
      index += roleWords.length;
    }
  }

  return translatedRoles.length ? translatedRoles.join(separator) : position;
}
