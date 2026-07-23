import { normalizePlayerName } from "./player-name-matching.mjs";

function normalizeTeamName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isKoreanNationalTeam(teamName) {
  return ["south korea", "korea republic"].includes(normalizeTeamName(teamName));
}

// Korean archive sources use both family-name-first and given-name-first spellings. Treat those
// spellings as one identity only for the Korean national team, where reversing the tokens is a
// known source convention rather than a safe global assumption.
export function historicalIdentityNameKey(name, teamName) {
  const normalized = normalizePlayerName(name);
  if (!normalized || !isKoreanNationalTeam(teamName)) return normalized;
  return normalized.split(/\s+/u).filter(Boolean).sort().join(" ");
}
