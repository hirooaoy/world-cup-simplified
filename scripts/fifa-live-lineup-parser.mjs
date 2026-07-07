import { isPlayerNameMatch } from "./player-name-matching.mjs";
import {
  buildDerivedLayoutVerification,
  DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE
} from "./lineup-layout-sources.mjs";

export const OFFICIAL_LINEUP_SOURCE = "fifa-official";
export const DERIVED_LAYOUT_SOURCE = DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE;
export const FIFA_LIVE_MATCH_URL = "https://api.fifa.com/api/v3/live/football";
export const FIFA_PROVIDER_KEY = "fifa";

const ROLE_LINE = {
  AM: "mid",
  CB: "def",
  CM: "mid",
  DM: "mid",
  GK: "gk",
  LB: "def",
  LM: "mid",
  LW: "fwd",
  LWB: "mid",
  RB: "def",
  RM: "mid",
  RW: "fwd",
  RWB: "mid",
  ST: "fwd"
};

const FORMATION_SLOTS = {
  "3-4-1-2": [
    ["CB", 68, 75],
    ["CB", 50, 75],
    ["CB", 32, 75],
    ["RM", 84, 53],
    ["CM", 60, 55],
    ["CM", 40, 55],
    ["LM", 16, 53],
    ["AM", 50, 39],
    ["ST", 42, 23],
    ["ST", 58, 23]
  ],
  "3-4-3": [
    ["CB", 68, 75],
    ["CB", 50, 75],
    ["CB", 32, 75],
    ["RM", 84, 53],
    ["CM", 60, 55],
    ["CM", 40, 55],
    ["LM", 16, 53],
    ["RW", 82, 29],
    ["ST", 50, 22],
    ["LW", 18, 29]
  ],
  "3-5-2": [
    ["CB", 68, 75],
    ["CB", 50, 75],
    ["CB", 32, 75],
    ["RWB", 86, 54],
    ["CM", 65, 55],
    ["CM", 50, 55],
    ["CM", 35, 55],
    ["LWB", 14, 54],
    ["ST", 42, 23],
    ["ST", 58, 23]
  ],
  "4-1-2-3": [
    ["RB", 85, 75],
    ["CB", 62, 75],
    ["CB", 38, 75],
    ["LB", 15, 75],
    ["DM", 50, 62],
    ["CM", 62, 49],
    ["CM", 38, 49],
    ["RW", 82, 30],
    ["ST", 50, 21],
    ["LW", 18, 30]
  ],
  "4-1-3-2": [
    ["RB", 85, 75],
    ["CB", 62, 75],
    ["CB", 38, 75],
    ["LB", 15, 75],
    ["DM", 50, 62],
    ["RW", 76, 44],
    ["AM", 50, 42],
    ["LW", 24, 44],
    ["ST", 42, 23],
    ["ST", 58, 23]
  ],
  "4-1-4-1": [
    ["RB", 85, 75],
    ["CB", 62, 75],
    ["CB", 38, 75],
    ["LB", 15, 75],
    ["DM", 50, 62],
    ["RM", 82, 47],
    ["CM", 62, 48],
    ["CM", 38, 48],
    ["LM", 18, 47],
    ["ST", 50, 22]
  ],
  "4-2-1-3": [
    ["RB", 85, 75],
    ["CB", 62, 75],
    ["CB", 38, 75],
    ["LB", 15, 75],
    ["CM", 62, 59],
    ["CM", 38, 59],
    ["AM", 50, 43],
    ["RW", 82, 30],
    ["ST", 50, 21],
    ["LW", 18, 30]
  ],
  "4-2-3-1": [
    ["RB", 85, 75],
    ["CB", 62, 75],
    ["CB", 38, 75],
    ["LB", 15, 75],
    ["CM", 62, 59],
    ["CM", 38, 59],
    ["RW", 82, 40],
    ["AM", 50, 40],
    ["LW", 18, 40],
    ["ST", 50, 20]
  ],
  "4-3-3": [
    ["RB", 85, 75],
    ["CB", 62, 75],
    ["CB", 38, 75],
    ["LB", 15, 75],
    ["CM", 75, 53],
    ["CM", 50, 53],
    ["CM", 25, 53],
    ["RW", 82, 31],
    ["ST", 50, 21],
    ["LW", 18, 31]
  ],
  "4-4-2": [
    ["RB", 85, 75],
    ["CB", 62, 75],
    ["CB", 38, 75],
    ["LB", 15, 75],
    ["RM", 82, 52],
    ["CM", 62, 55],
    ["CM", 38, 55],
    ["LM", 18, 52],
    ["ST", 42, 24],
    ["ST", 58, 24]
  ],
  "5-2-3": [
    ["RWB", 88, 74],
    ["CB", 68, 76],
    ["CB", 50, 76],
    ["CB", 32, 76],
    ["LWB", 12, 74],
    ["CM", 62, 56],
    ["CM", 38, 56],
    ["RW", 82, 30],
    ["ST", 50, 21],
    ["LW", 18, 30]
  ],
  "5-3-2": [
    ["RWB", 88, 74],
    ["CB", 68, 76],
    ["CB", 50, 76],
    ["CB", 32, 76],
    ["LWB", 12, 74],
    ["CM", 70, 54],
    ["CM", 50, 55],
    ["CM", 30, 54],
    ["ST", 42, 24],
    ["ST", 58, 24]
  ],
  "5-4-1": [
    ["RWB", 88, 74],
    ["CB", 68, 76],
    ["CB", 50, 76],
    ["CB", 32, 76],
    ["LWB", 12, 74],
    ["RM", 82, 52],
    ["CM", 62, 55],
    ["CM", 38, 55],
    ["LM", 18, 52],
    ["ST", 50, 22]
  ]
};

export function buildProfileLookup(profilesData) {
  const byName = new Map();
  const byCompactName = new Map();
  const profiles = Object.values(profilesData?.profiles || {});

  for (const profile of profiles) {
    for (const alias of profileAliases(profile)) {
      const key = normalizeText(alias);
      const compactKey = compactText(alias);
      if (key && !byName.has(key)) {
        byName.set(key, profile);
      }
      if (compactKey && !byCompactName.has(compactKey)) {
        byCompactName.set(compactKey, profile);
      }
    }
  }

  return { byName, byCompactName, profiles };
}

export function fixtureFifaMatchId(fixture) {
  return (
    fixture.providerIds?.[FIFA_PROVIDER_KEY]?.matchId ||
    fixture.providerIds?.[FIFA_PROVIDER_KEY]?.idMatch ||
    fixture.fifaMatchId ||
    ""
  );
}

export function buildFifaMatchCentreUrl(fixture, liveMatch = {}) {
  const idCompetition = liveMatch?.IdCompetition || process.env.FIFA_COMPETITION_ID || "17";
  const idSeason = liveMatch?.IdSeason || process.env.FIFA_SEASON_ID || "285023";
  const idStage = liveMatch?.IdStage || liveMatch?.Stage?.IdStage || fixture.providerIds?.[FIFA_PROVIDER_KEY]?.stageId || "";
  const idMatch = liveMatch?.IdMatch || fixtureFifaMatchId(fixture);

  return idCompetition && idSeason && idStage && idMatch
    ? `https://www.fifa.com/en/match-centre/match/${idCompetition}/${idSeason}/${idStage}/${idMatch}`
    : "";
}

export function buildFifaLineupsFromLiveMatch({
  fixture,
  liveMatch,
  teamsById,
  profileLookup,
  checkedAt,
  sourceIds,
  sourceUrl,
  mode = "live"
}) {
  const safeMode = String(mode || "live").trim().toLowerCase();
  const homeFormation = liveMatch?.Home?.Tactics || liveMatch?.HomeTeam?.Tactics || fixture?.matchEvents?.home?.formation || "";
  const awayFormation = liveMatch?.Away?.Tactics || liveMatch?.AwayTeam?.Tactics || fixture?.matchEvents?.away?.formation || "";

  if (!liveMatch?.HomeTeam || !liveMatch?.AwayTeam || !homeFormation || !awayFormation) {
    throw new Error(`FIFA live match is missing team or formation data`);
  }

  const homeTeam = teamsById?.get(fixture.homeTeamId);
  const awayTeam = teamsById?.get(fixture.awayTeamId);
  const actualSourceUrl = sourceUrl || buildFifaMatchCentreUrl(fixture, liveMatch);

  const home = buildLineupSide(
    liveMatch.HomeTeam,
    fixture,
    "home",
    homeFormation,
    homeTeam,
    actualSourceUrl,
    profileLookup
  );

  const away = buildLineupSide(
    liveMatch.AwayTeam,
    fixture,
    "away",
    awayFormation,
    awayTeam,
    actualSourceUrl,
    profileLookup
  );

  return {
    mode: ["confirmed", "final", "live"].includes(safeMode) ? safeMode : "live",
    teamSheetSource: OFFICIAL_LINEUP_SOURCE,
    eventSource: OFFICIAL_LINEUP_SOURCE,
    layoutSource: DERIVED_LAYOUT_SOURCE,
    layoutVerification: buildDerivedLayoutVerification(checkedAt),
    sourceIds: Array.isArray(sourceIds) && sourceIds.length ? sourceIds : ["fifa-lineups-live"],
    checkedAt,
    home: {
      ...home,
      onFieldPlayers: computeLiveOnFieldPlayers(home)
    },
    away: {
      ...away,
      onFieldPlayers: computeLiveOnFieldPlayers(away)
    }
  };
}

function description(values) {
  return values?.find((value) => value?.Locale === "en-GB")?.Description || values?.[0]?.Description || "";
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function titleCaseName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .split(/(\s+|-|')/)
    .map((part, index, parts) => {
      if (/^\s+$|^-|'$/.test(part) || !part) {
        return part;
      }

      const previous = parts[index - 1] || "";
      if (previous === "'" || previous === "-") {
        return `${part[0].toUpperCase()}${part.slice(1)}`;
      }

      if (/^mc[a-z]+/.test(part)) {
        return `Mc${part[2].toUpperCase()}${part.slice(3)}`;
      }

      return `${part[0].toUpperCase()}${part.slice(1)}`;
    })
    .join("");
}

function getTeamName(team) {
  return team?.name || team?.officialName || team?.standingName || team?.id || "";
}

function profileAliases(profile) {
  return [
    profile?.name,
    profile?.displayName,
    ...(Array.isArray(profile?.aliases) ? profile.aliases : [])
  ].filter(Boolean);
}

function findProfileForName(name, teamId, profileLookup) {
  const candidates = [
    profileLookup?.byName?.get(normalizeText(name)),
    profileLookup?.byCompactName?.get(compactText(name))
  ].filter(Boolean);

  return candidates.find((profile) => !teamId || !profile.teamId || profile.teamId === teamId) || null;
}

function normalizePersonName(name, teamId, profileLookup) {
  const normalizedName = titleCaseName(name);
  const profile = profileLookup ? findProfileForName(normalizedName, teamId, profileLookup) : null;

  return profile?.name || profile?.displayName || normalizedName;
}

function playerLineFromFifaPosition(position) {
  switch (Number(position)) {
    case 0:
      return "gk";
    case 1:
      return "def";
    case 2:
      return "mid";
    case 3:
      return "fwd";
    default:
      return "";
  }
}

function sourcePositionFromFifaPosition(position) {
  switch (Number(position)) {
    case 0:
      return "goalkeeper";
    case 1:
      return "defender";
    case 2:
      return "midfielder";
    case 3:
      return "forward";
    default:
      return "";
  }
}

function roleSide(role) {
  if (["RB", "RWB", "RM", "RW"].includes(role)) return "right";
  if (["LB", "LWB", "LM", "LW"].includes(role)) return "left";
  return "";
}

function coordinateSide(x) {
  if (!Number.isFinite(Number(x)) || Number(x) === 50) {
    return "";
  }

  return Number(x) > 50 ? "right" : "left";
}

function profileSide(profile = {}) {
  const value = String((profile || {}).position || "").toLowerCase();
  const rightSide = /\bright(?:-| )(?:back|wing-back|wing back|winger|midfielder)\b/.test(value);
  const leftSide = /\bleft(?:-| )(?:back|wing-back|wing back|winger|midfielder)\b/.test(value);
  const centralRole = /\b(?:central midfielder|defensive midfielder|attacking midfielder|centre-back|center-back|striker|centre-forward|center-forward|goalkeeper)\b/.test(value);

  if (rightSide === leftSide || centralRole) {
    return "";
  }

  return rightSide ? "right" : "left";
}

function profileRoleHints(profile = {}, fifaLine = "") {
  const value = String((profile || {}).position || "").toLowerCase();
  const hints = [];

  if (value.includes("goalkeeper") || fifaLine === "gk") hints.push("GK");
  if (value.includes("centre-back") || value.includes("center-back") || value.includes("central defender")) hints.push("CB");
  if (value.includes("defensive midfielder")) hints.push("DM", "CM");
  if (value.includes("central midfielder")) hints.push("CM");
  if (value.includes("attacking midfielder")) hints.push("AM", "CM");
  if (value.includes("striker") || value.includes("centre-forward") || value.includes("center-forward")) hints.push("ST");
  if (value.includes("right wing-back") || value.includes("right wing back")) hints.push("RWB", "RB", "RM");
  if (value.includes("left wing-back") || value.includes("left wing back")) hints.push("LWB", "LB", "LM");
  if (value.includes("right-back") || value.includes("right back")) hints.push("RB", "RWB");
  if (value.includes("left-back") || value.includes("left back")) hints.push("LB", "LWB");
  if (value.includes("right winger") || value.includes("right midfielder")) hints.push("RW", "RM");
  if (value.includes("left winger") || value.includes("left midfielder")) hints.push("LW", "LM");
  if (value.includes("winger") && !hints.includes("RW") && !hints.includes("LW")) hints.push("RW", "LW");
  if (value.includes("forward") && !hints.includes("ST")) hints.push("ST", "RW", "LW");
  if (value.includes("midfielder") && !hints.includes("CM")) hints.push("CM");

  if (!hints.length) {
    if (fifaLine === "def") hints.push("CB");
    if (fifaLine === "mid") hints.push("CM");
    if (fifaLine === "fwd") hints.push("ST");
  }

  return [...new Set(hints)];
}

function positionCodeForBench(profile = {}, fifaPosition = "") {
  const fifaLine = playerLineFromFifaPosition(fifaPosition);
  const hints = profileRoleHints(profile, fifaLine);
  const lineMatch = hints.find((hint) => ROLE_LINE[hint] === fifaLine);
  if (lineMatch) {
    return lineMatch;
  }

  if (fifaLine === "gk") return "GK";
  if (fifaLine === "def") return "CB";
  if (fifaLine === "mid") return "CM";
  if (fifaLine === "fwd") return "ST";

  return hints[0] || "CM";
}

function slot(role, x, y, orderIndex = 0) {
  return {
    role,
    x,
    y,
    line: ROLE_LINE[role] || "",
    side: roleSide(role),
    coordinateSide: coordinateSide(x),
    orderIndex
  };
}

function buildGenericFormationSlots(formation) {
  const digits = String(formation || "")
    .split("-")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (digits.reduce((sum, value) => sum + value, 0) !== 10 || digits.length < 2) {
    return FORMATION_SLOTS["4-3-3"].map(([role, x, y], index) => slot(role, x, y, index));
  }

  const [defenderCount, ...rest] = digits;
  const forwardCount = rest.at(-1);
  const midfieldRows = rest.slice(0, -1);
  const rows = [];
  const defenderRoles = {
    3: [["CB", 68], ["CB", 50], ["CB", 32]],
    4: [["RB", 85], ["CB", 62], ["CB", 38], ["LB", 15]],
    5: [["RWB", 88], ["CB", 68], ["CB", 50], ["CB", 32], ["LWB", 12]]
  }[defenderCount] || FORMATION_SLOTS["4-3-3"].slice(0, 4).map(([role, x]) => [role, x]);
  rows.push(defenderRoles.map(([role, x]) => [role, x, defenderCount === 5 ? 74 : 75]));

  midfieldRows.forEach((count, index) => {
    const isLastMidfieldLine = index === midfieldRows.length - 1;
    const y = midfieldRows.length === 1 ? 53 : 62 - index * 14;
    if (count === 1) {
      rows.push([[isLastMidfieldLine && forwardCount === 1 ? "AM" : "DM", 50, y]]);
      return;
    }
    if (count === 2) {
      rows.push(["CM", 62, y], ["CM", 38, y]);
      return;
    }
    if (count === 3 && isLastMidfieldLine && forwardCount === 1) {
      rows.push(["RW", 82, y], ["AM", 50, y], ["LW", 18, y]);
      return;
    }
    if (count === 3) {
      rows.push(["CM", 70, y], ["CM", 50, y], ["CM", 30, y]);
      return;
    }
    if (count === 4) {
      rows.push(["RM", 82, y], ["CM", 62, y], ["CM", 38, y], ["LM", 18, y]);
      return;
    }
    if (count === 5) {
      rows.push(["RWB", 86, y], ["CM", 65, y], ["CM", 50, y], ["CM", 35, y], ["LWB", 14, y]);
    }
  });

  if (forwardCount === 1) {
    rows.push([["ST", 50, 22]]);
  } else if (forwardCount === 2) {
    rows.push([["ST", 42, 24], ["ST", 58, 24]]);
  } else {
    rows.push([["RW", 82, 30], ["ST", 50, 21], ["LW", 18, 30]]);
  }

  return rows.flat().map(([role, x, y], index) => slot(role, x, y, index));
}

function formationSlots(formation) {
  const baseSlots = FORMATION_SLOTS[formation];
  if (!baseSlots) {
    return buildGenericFormationSlots(formation);
  }

  return baseSlots.map(([role, x, y], index) => slot(role, x, y, index));
}

function scorePlayerSlot(player, targetSlot, playerIndex) {
  let score = 0;
  const playerSide = profileSide(player.profile);
  const hints = profileRoleHints(player.profile, player.fifaLine);

  if (hints.includes(targetSlot.role)) score += 120;
  if (player.fifaLine && targetSlot.line === player.fifaLine) score += 45;
  if (playerSide && targetSlot.coordinateSide === playerSide) score += 35;
  if (playerSide && targetSlot.side === playerSide) score += 35;
  if (playerSide && targetSlot.coordinateSide && targetSlot.coordinateSide !== playerSide) score -= 10000;
  if (playerSide && targetSlot.side && targetSlot.side !== playerSide) score -= 10000;
  if (player.fifaLine === "def" && targetSlot.line === "mid" && ["RWB", "LWB"].includes(targetSlot.role)) score += 25;
  if (player.fifaLine === "mid" && targetSlot.line === "fwd" && ["RW", "LW"].includes(targetSlot.role)) score += 15;
  if (player.fifaLine === "fwd" && targetSlot.line === "mid" && ["RW", "LW"].includes(targetSlot.role)) score += 15;
  score -= Math.abs(playerIndex - targetSlot.orderIndex) * 20;

  return score;
}

function assignOutfieldSlots(players, slots) {
  const count = players.length;
  const stateCount = 1 << count;
  const dp = Array.from({ length: stateCount }, () => ({ score: -Infinity, previous: null }));
  dp[0] = { score: 0, previous: null };

  for (let mask = 0; mask < stateCount; mask += 1) {
    const playerIndex = countBits(mask);
    if (playerIndex >= count || dp[mask].score === -Infinity) {
      continue;
    }

    for (let slotIndex = 0; slotIndex < count; slotIndex += 1) {
      if (mask & (1 << slotIndex)) {
        continue;
      }

      const nextMask = mask | (1 << slotIndex);
      const nextScore = dp[mask].score + scorePlayerSlot(players[playerIndex], slots[slotIndex], playerIndex);
      if (nextScore > dp[nextMask].score) {
        dp[nextMask] = {
          score: nextScore,
          previous: { mask, slotIndex }
        };
      }
    }
  }

  const assignments = Array(count).fill(null);
  let mask = stateCount - 1;
  for (let playerIndex = count - 1; playerIndex >= 0; playerIndex -= 1) {
    const previous = dp[mask].previous;
    if (!previous) {
      break;
    }
    assignments[playerIndex] = slots[previous.slotIndex];
    mask = previous.mask;
  }

  return assignments;
}

function countBits(value) {
  let count = 0;
  let number = value;
  while (number) {
    number &= number - 1;
    count += 1;
  }
  return count;
}

function playerNumber(player) {
  return String(player?.ShirtNumber || player?.ShirtNum || player?.JerseyNumber || player?.Bib || "").trim();
}

function buildRawPlayer(player, teamId, profileLookup) {
  const baseName = normalizePersonName(description(player?.PlayerName) || description(player?.ShortName), teamId, profileLookup);
  const profile = findProfileForName(baseName, teamId, profileLookup);

  return {
    id: String(player?.IdPlayer || ""),
    baseName,
    name: baseName,
    number: playerNumber(player),
    rawPosition: player?.Position,
    sourcePosition: sourcePositionFromFifaPosition(player?.Position),
    fifaLine: playerLineFromFifaPosition(player?.Position),
    profile
  };
}

function formatLineupShortName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return parts[0] || "";
  }

  const first = parts[0].charAt(0);
  const lastParts = [parts.at(-1)];
  const particles = new Set(["al", "da", "de", "del", "der", "di", "el", "van", "von"]);
  for (let index = parts.length - 2; index > 0; index -= 1) {
    const part = parts[index];
    if (!particles.has(part.toLowerCase())) {
      break;
    }
    lastParts.unshift(part);
  }

  return `${first}. ${lastParts.join(" ")}`;
}

function disambiguateDuplicatePlayers(players) {
  const groups = new Map();

  for (const player of players) {
    const key = normalizeText(player.name);
    if (!key) {
      continue;
    }
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(player);
  }

  for (const group of groups.values()) {
    if (group.length <= 1) {
      continue;
    }

    for (const [index, player] of group.entries()) {
      const suffix = player.number ? `#${player.number}` : player.id ? `ID ${player.id}` : String(index + 1);
      player.name = `${player.baseName} ${suffix}`;
      player.displayName = player.baseName;
      player.label = formatLineupShortName(player.baseName);
    }
  }
}

function lineupPlayerEntry(player, targetSlot) {
  return {
    number: player.number,
    name: player.name,
    ...(player.sourcePosition ? { sourcePosition: player.sourcePosition } : {}),
    ...(player.displayName ? { displayName: player.displayName } : {}),
    ...(player.label ? { label: player.label } : {}),
    position: targetSlot.role,
    x: targetSlot.x,
    y: targetSlot.y
  };
}

function benchPlayerEntry(player) {
  return {
    number: player.number,
    name: player.name,
    ...(player.sourcePosition ? { sourcePosition: player.sourcePosition } : {}),
    ...(player.displayName ? { displayName: player.displayName } : {}),
    ...(player.label ? { label: player.label } : {}),
    position: positionCodeForBench(player.profile, player.rawPosition)
  };
}

function namesContain(playerNames, name) {
  return playerNames.some((playerName) => normalizeText(playerName) === normalizeText(name) || isPlayerNameMatch(playerName, name));
}

function parseMinute(value, period = null) {
  const minuteText = String(value || "").trim();
  const match = /^(\d+)'(?:\+(\d+)')?$/.exec(minuteText);
  if (match) {
    return match[2] ? `${match[1]}+${match[2]}` : Number(match[1]);
  }

  if (!minuteText && Number(period) === 4) {
    return "HT";
  }

  if (!minuteText && Number(period) === 17) {
    return "ET";
  }

  return minuteText ? minuteText.replace(/'/g, "") : "";
}

function staffMemberName(member) {
  return titleCaseName(description(member?.Alias) || description(member?.Name) || description(member?.StaffName));
}

function buildStaffLookup(teamData) {
  const staff = new Map();
  for (const coach of teamData.Coaches || []) {
    if (coach.IdCoach) {
      staff.set(`coach:${coach.IdCoach}`, {
        name: staffMemberName(coach),
        role: Number(coach.Role) === 0 ? "coach" : "staff"
      });
    }
  }
  for (const member of teamData.Staffs || teamData.Staff || []) {
    if (member.IdStaff) {
      staff.set(`staff:${member.IdStaff}`, {
        name: staffMemberName(member),
        role: "staff"
      });
    }
  }
  return staff;
}

function buildEvents(teamData, playersById, starterNames, benchNames) {
  const events = {
    cards: [],
    staffCards: [],
    substitutions: []
  };
  const staffById = buildStaffLookup(teamData);

  for (const booking of teamData.Bookings || []) {
    const minute = parseMinute(booking.Minute, booking.Period);
    if (!minute) {
      continue;
    }
    if (!booking.IdPlayer) {
      const staff =
        (booking.IdCoach && staffById.get(`coach:${booking.IdCoach}`)) ||
        (booking.IdStaff && staffById.get(`staff:${booking.IdStaff}`));
      if (staff?.name) {
        events.staffCards.push({
          staffName: staff.name,
          role: staff.role,
          type: Number(booking.Card) === 1 ? "yellow" : "red",
          minute
        });
      }
      continue;
    }

    const player = playersById.get(String(booking.IdPlayer));
    if (player && namesContain([...starterNames, ...benchNames], player.name)) {
      events.cards.push({
        playerName: player.name,
        type: Number(booking.Card) === 1 ? "yellow" : "red",
        minute
      });
    }
  }

  const allPlayerNames = [...starterNames, ...benchNames];
  for (const substitution of teamData.Substitutions || []) {
    const offPlayer = playersById.get(String(substitution.IdPlayerOff));
    const onPlayer = playersById.get(String(substitution.IdPlayerOn));
    const offName = offPlayer?.name || normalizePersonName(description(substitution.PlayerOffName), "", null);
    const onName = onPlayer?.name || normalizePersonName(description(substitution.PlayerOnName), "", null);
    const minute = parseMinute(substitution.Minute, substitution.Period);

    if (
      !offName ||
      !onName ||
      !minute ||
      !namesContain(allPlayerNames, offName) ||
      !namesContain(benchNames, onName)
    ) {
      continue;
    }

    events.substitutions.push({
      offName,
      onName,
      minute
    });
  }

  return events;
}

function buildCoach(teamData, team, sourceUrl) {
  const coach = (teamData.Coaches || []).find((item) => Number(item.Role) === 0) || (teamData.Coaches || [])[0];
  if (!coach) {
    return null;
  }

  const name = titleCaseName(description(coach.Alias) || description(coach.Name));
  if (!name) {
    return null;
  }

  return {
    name,
    teamName: getTeamName(team),
    ...(coach.PictureUrl ? { imageUrl: coach.PictureUrl } : {}),
    sourceUrl
  };
}

function buildLineupSide(teamData, fixture, side, formation, team, sourceUrl, profileLookup) {
  const teamId = fixture[`${side}TeamId`];
  const sourcePlayers = teamData.Players || [];
  const rawPlayers = sourcePlayers.map((player) => buildRawPlayer(player, teamId, profileLookup));
  disambiguateDuplicatePlayers(rawPlayers);
  const playersById = new Map(rawPlayers.filter((player) => player.id).map((player) => [player.id, player]));
  const starters = sourcePlayers
    .map((player, index) => (Number(player.Status) === 1 ? rawPlayers[index] : null))
    .filter(Boolean);
  const bench = sourcePlayers
    .map((player, index) => (Number(player.Status) === 2 ? rawPlayers[index] : null))
    .filter(Boolean);

  if (starters.length !== 11 || bench.length < 1) {
    throw new Error(`${side} team has ${starters.length} starters and ${bench.length} bench players`);
  }

  const goalkeeper = starters.find((player) => player.fifaLine === "gk") || starters[0];
  const outfieldPlayers = starters.filter((player) => player !== goalkeeper);
  const slots = formationSlots(formation);
  if (slots.length !== outfieldPlayers.length) {
    throw new Error(`${side} formation ${formation} created ${slots.length} outfield slots`);
  }

  const assignments = assignOutfieldSlots(outfieldPlayers, slots);
  const starterEntries = [
    lineupPlayerEntry(goalkeeper, slot("GK", 50, 91)),
    ...outfieldPlayers.map((player, index) => lineupPlayerEntry(player, assignments[index] || slots[index]))
  ];
  const benchEntries = bench.map(benchPlayerEntry);
  const starterNames = starterEntries.map((player) => player.name);
  const benchNames = benchEntries.map((player) => player.name);
  const coach = buildCoach(teamData, team, sourceUrl);

  return {
    formation,
    ...(coach ? { coach } : {}),
    players: starterEntries,
    bench: benchEntries,
    events: buildEvents(teamData, playersById, starterNames, benchNames)
  };
}

function minuteSortValue(minute) {
  if (minute === "HT") {
    return 45.5;
  }

  if (minute === "ET") {
    return 120.5;
  }

  if (typeof minute === "number" && Number.isFinite(minute)) {
    return minute;
  }

  const match = String(minute || "").match(/^(\d+)(?:\+(\d+))?$/);
  if (!match) {
    const parsed = Number.parseInt(String(minute), 10);
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
  }

  const [_, base, extra] = match;
  return Number(base) + Number(extra || 0) / 10;
}

function computeLiveOnFieldPlayers(teamLineup) {
  const starters = Array.isArray(teamLineup?.players) ? teamLineup.players : [];
  const events = Array.isArray(teamLineup?.events?.substitutions) ? teamLineup.events.substitutions : [];
  const redCards = new Set(
    (teamLineup?.events?.cards || [])
      .filter((event) => event?.type === "red")
      .map((event) => String(event.playerName || "").trim())
      .filter(Boolean)
  );

  const onField = new Set(starters.map((player) => String(player.name).trim()).filter(Boolean));

  const orderedSubstitutions = [...events].map((event, index) => ({ ...event, __order: index }))
    .sort((left, right) => {
      const order = minuteSortValue(left.minute) - minuteSortValue(right.minute);
      return order === 0 ? left.__order - right.__order : order;
    });

  for (const substitution of orderedSubstitutions) {
    if (substitution?.offName) {
      onField.delete(String(substitution.offName).trim());
    }

    if (substitution?.onName) {
      onField.add(String(substitution.onName).trim());
    }
  }

  for (const playerName of redCards) {
    onField.delete(playerName);
  }

  return [...onField].filter(Boolean);
}
