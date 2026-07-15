import { readFile } from "node:fs/promises";
import path from "node:path";

import { isPlayerNameMatch } from "./player-name-matching.mjs";

async function readOptionalJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function sameCanonicalPlayer(left, right) {
  return isPlayerNameMatch(left, right) || isPlayerNameMatch(right, left);
}

function aliasesFromProfile(playerName, profilesData) {
  const profile = profilesData?.profiles?.[playerName];
  return [
    profile?.name,
    profile?.displayName,
    ...(Array.isArray(profile?.aliases) ? profile.aliases : [])
  ].filter(Boolean);
}

function aliasesFromRosterOverrides(playerName, overrides) {
  return Object.entries(overrides?.rosterNameOverrides || {})
    .filter(([, canonicalName]) => sameCanonicalPlayer(canonicalName, playerName))
    .map(([alias]) => alias);
}

function enrichSide(side, profilesData, rosterOverrides) {
  return {
    ...side,
    players: (side?.players || []).map((player) => ({
      ...player,
      sourceAliases: [...new Set([
        ...(Array.isArray(player.sourceAliases) ? player.sourceAliases : []),
        ...(Array.isArray(player.aliases) ? player.aliases : []),
        ...aliasesFromProfile(player.name, profilesData),
        ...aliasesFromRosterOverrides(player.name, rosterOverrides)
      ].map((value) => String(value || "").trim()).filter(Boolean))]
    }))
  };
}

export async function enrichFifaTacticalLineupPlayerAliases({
  dataDir,
  fixture,
  lineups,
  profilesData
}) {
  if (!lineups) return lineups;
  const [homeOverrides, awayOverrides] = await Promise.all([
    readOptionalJson(path.join(dataDir, "player-profile-overrides", "2026", `${fixture.homeTeamId}.json`)),
    readOptionalJson(path.join(dataDir, "player-profile-overrides", "2026", `${fixture.awayTeamId}.json`))
  ]);
  return {
    ...lineups,
    home: enrichSide(lineups.home, profilesData, homeOverrides),
    away: enrichSide(lineups.away, profilesData, awayOverrides)
  };
}
