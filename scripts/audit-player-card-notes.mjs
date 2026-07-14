#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayerName } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const args = process.argv.slice(2);

function getArgValue(name) {
  const flag = `--${name}=`;
  const arg = args.find((item) => item.startsWith(flag));
  return arg ? arg.slice(flag.length) : "";
}

function hasArg(name) {
  return args.includes(`--${name}`) || args.some((item) => item.startsWith(`--${name}=`));
}

function parseTeamIds() {
  return (getArgValue("teams") || getArgValue("team"))
    .split(",")
    .map((teamId) => teamId.trim().toUpperCase())
    .filter(Boolean);
}

function parseMaxIssues() {
  const raw = getArgValue("max-issues");
  if (!raw) {
    return hasArg("strict") ? 0 : Number.POSITIVE_INFINITY;
  }

  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : Number.POSITIVE_INFINITY;
}

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

function sideFromPosition(position = "") {
  const compact = String(position || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (["RW", "RM", "RB", "RWB"].includes(compact)) {
    return "right";
  }
  if (["LW", "LM", "LB", "LWB"].includes(compact)) {
    return "left";
  }
  return "";
}

function sideFromX(x) {
  const value = Number(x);
  if (!Number.isFinite(value)) {
    return "";
  }
  if (value <= 42) {
    return "left";
  }
  if (value >= 58) {
    return "right";
  }
  return "central";
}

function getUsageSide(player = {}) {
  return sideFromPosition(player.position) || sideFromX(player.x);
}

function getUsageKey(teamId, playerName) {
  const nameKey = normalizePlayerName(playerName);
  return teamId && nameKey ? `${teamId}:${nameKey}` : "";
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function buildFixtureMap(fixturesData) {
  return new Map((fixturesData.fixtures || []).map((fixture) => [fixture.id, fixture]));
}

function buildTournamentUsage(lineupsData, fixturesData) {
  const fixturesById = buildFixtureMap(fixturesData);
  const usage = new Map();

  for (const [matchId, lineup] of Object.entries(lineupsData.lineups || {})) {
    if (!lineup || typeof lineup !== "object" || Array.isArray(lineup)) {
      continue;
    }

    const fixture = fixturesById.get(matchId) || {};
    for (const side of ["home", "away"]) {
      const sideData = lineup[side] || {};
      const players = Array.isArray(sideData.players) ? sideData.players : [];
      const teamId = side === "home" ? fixture.homeTeamId : fixture.awayTeamId;
      for (const player of players) {
        const key = getUsageKey(teamId, player?.name);
        if (!key) {
          continue;
        }

        const bucket = usage.get(key) || {
          appearances: 0,
          positions: new Map(),
          sides: new Map()
        };
        bucket.appearances += 1;
        if (player.position) {
          increment(bucket.positions, player.position);
        }
        const sideName = getUsageSide(player);
        if (sideName) {
          increment(bucket.sides, sideName);
        }
        usage.set(key, bucket);
      }
    }
  }

  return usage;
}

function getClaimedSides(note) {
  const text = String(note || "").toLowerCase();
  const sides = new Set();
  if (/\bright(?:-| )?(?:side|wing|back|flank)\b|\bright channel\b/.test(text)) {
    sides.add("right");
  }
  if (/\bleft(?:-| )?(?:side|wing|back|flank)\b|\bleft channel\b/.test(text)) {
    sides.add("left");
  }
  return [...sides];
}

function formatCounts(map) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([label, count]) => `${label}:${count}`)
    .join(", ");
}

const jargonChecks = [
  {
    pattern: /\bcutbacks?\b/i,
    message: "replace cutback with plain wording such as pulls the ball back for a runner"
  },
  {
    pattern: /\bbyline\b/i,
    message: "replace byline with near the end line"
  },
  {
    pattern: /\bhalf[- ]space\b/i,
    message: "replace half-space with inside channel"
  },
  {
    pattern: /\blow block\b/i,
    message: "replace low block with deep defense"
  },
  {
    pattern: /\brest defense\b/i,
    message: "replace rest defense with the players left back to stop counters"
  },
  {
    pattern: /\bfinal third\b/i,
    message: "replace final third with around the box"
  }
];

const genericChecks = [
  {
    pattern: /\b(?:useful|valuable|important|dangerous)\s+(?:when|for)\b/i,
    message: "avoid the default useful/dangerous/valuable when phrasing"
  },
  {
    pattern: /\bable to\b/i,
    message: "replace able to with a more direct verb"
  },
  {
    pattern: /\bcreative spark\b/i,
    message: "creative spark is usually too generic without a watch cue"
  },
  {
    pattern: /\breference point\b/i,
    message: "reference point is usually too generic without a watch cue"
  },
  {
    pattern: /\bmatch-plan option\b/i,
    message: "match-plan option is internal-sounding filler"
  },
  {
    pattern: /\bcurrent World Cup squad pool\b/i,
    message: "current World Cup squad pool is internal-sounding filler"
  }
];

const repeatedTemplateChecks = [
  {
    pattern: /\bquiet-work part\b/i,
    message: "replace the repeated quiet-work template with a concrete action to watch"
  },
  {
    pattern: /\b(?:the )?small window before the shape resets\b/i,
    message: "replace the repeated small-window metaphor with a concrete scoring action"
  },
  {
    pattern: /\bmidfield insurance\b|\bback-line insurance\b/i,
    message: "replace the insurance metaphor with the player's actual defensive job"
  },
  {
    pattern: /\b(?:the )?night turns sideways\b/i,
    message: "replace the night-turns-sideways metaphor with a direct goalkeeper description"
  },
  {
    pattern: /\bthe messy phase\b|\bwhen the match gets narrow\b/i,
    message: "replace the repeated match-state metaphor with a specific action"
  },
  {
    pattern: /\bone of .+? steady pieces? in the back line\b/i,
    message: "replace the repeated steady-piece template with a concrete defensive action"
  },
  {
    pattern: /\b(?:part of|one of) .+?'s answer without the ball\b/i,
    message: "replace the answer-without-the-ball template with a direct defensive description"
  },
  {
    pattern: /\b(?:the forward .+? can use when the match needs new legs|make tired defenders turn)\b/i,
    message: "replace the repeated new-legs template with the player's actual attacking action"
  },
  {
    pattern: /\b(?:attacking change-up|first plan starts to look predictable)\b/i,
    message: "replace the change-up template with a direct role description"
  },
  {
    pattern: /\bway to settle the middle\b|\bnext decision less hurried\b/i,
    message: "replace the settle-the-middle template with a concrete midfield action"
  },
  {
    pattern: /\b(?:named attacking routes?|attacking paths?) (?:in )?this tournament\b/i,
    message: "replace the attacking-route template with a concrete action to watch"
  },
  {
    pattern: /\b(?:his|her|their) card is\b|\bthe card is\b/i,
    message: "describe the player directly instead of referring to the card"
  },
  {
    pattern: /\bwatch the small choices\b|\bfirst defender (?:reacts|move)\b/i,
    message: "replace the repeated first-defender prompt with an observable action"
  }
];

const corruptDisplayNamePattern =
  /\b(?:national (?:football|soccer) team|(?:fifa )?world cup group [a-l]|football award winners?)\b|\b(?:F\.?C\.?|S\.?C\.?)$/i;

function normalizedTeamLabels(team = {}) {
  const labels = new Set();
  for (const value of [team.name, team.officialName, team.standingName]) {
    const normalized = normalizePlayerName(value);
    if (!normalized) {
      continue;
    }
    labels.add(normalized);
    const meaningfulTokens = normalized
      .split(/\s+/)
      .filter((token) => !["dr", "ir", "republic", "the", "united", "states"].includes(token));
    if (meaningfulTokens.length === 1) {
      labels.add(meaningfulTokens[0]);
    }
  }
  return labels;
}

function getDisplayNameIssue(profileName, profile = {}, team = {}) {
  const displayName = String(profile.displayName || "").trim();
  if (!displayName) {
    return "profile has no display name";
  }

  if (/[|{}<>]/.test(displayName)) {
    return `display name contains a page-title artifact: ${displayName}`;
  }
  if (corruptDisplayNamePattern.test(displayName)) {
    return `display name looks like a team, club, or page title: ${displayName}`;
  }

  const displayKey = normalizePlayerName(displayName);
  const profileKey = normalizePlayerName(profileName);
  const clubKey = normalizePlayerName(profile.club);
  const leagueKey = normalizePlayerName(profile.league);
  if (displayKey && displayKey !== profileKey && (displayKey === clubKey || displayKey === leagueKey)) {
    return `display name matches club or league copy instead of the player: ${displayName}`;
  }

  if (
    profileKey.split(/\s+/).length >= 2 &&
    displayKey.split(/\s+/).length === 1 &&
    normalizedTeamLabels(team).has(displayKey)
  ) {
    return `display name matches the country instead of the player: ${displayName}`;
  }

  return "";
}

function countSentences(note) {
  const matches = String(note || "").match(/[.!?]+/g);
  return matches ? matches.length : 0;
}

function addIssue(issues, profileName, kind, message) {
  issues.push({ profileName, kind, message });
}

function auditProfile(profileName, profile, usage, team, issues) {
  const note = String(profile?.note || "").trim();
  const skills = Array.isArray(profile?.skills) ? profile.skills.filter(Boolean) : [];
  const displayNameIssue = getDisplayNameIssue(profileName, profile, team);
  if (displayNameIssue) {
    addIssue(issues, profileName, "display-name", displayNameIssue);
  }
  if (!note) {
    addIssue(issues, profileName, "missing-note", "profile has no player-card note");
    return;
  }

  if (!String(profile?.noteZh || "").trim()) {
    addIssue(issues, profileName, "missing-note-zh", "profile has no Chinese note");
  }

  if (/[;]/.test(note)) {
    addIssue(issues, profileName, "punctuation", "avoid semicolons in player-card notes");
  }
  if (/[\u2013\u2014]/.test(note)) {
    addIssue(issues, profileName, "punctuation", "avoid en dash and em dash sentence structure");
  }

  const sentenceCount = countSentences(note);
  if (sentenceCount > 3) {
    addIssue(issues, profileName, "length", `note has ${sentenceCount} sentences; keep cards to 1-3 short sentences`);
  }
  if (note.length > 240) {
    addIssue(issues, profileName, "length", `note is ${note.length} characters; keep it compact`);
  }

  for (const check of jargonChecks) {
    if (check.pattern.test(note)) {
      addIssue(issues, profileName, "jargon", check.message);
    }
  }

  for (const check of genericChecks) {
    if (check.pattern.test(note)) {
      addIssue(issues, profileName, "generic-voice", check.message);
    }
  }

  for (const check of repeatedTemplateChecks) {
    if (check.pattern.test(note)) {
      addIssue(issues, profileName, "repeated-template", check.message);
    }
  }

  if (!skills.length) {
    addIssue(issues, profileName, "missing-skills", "profile has no visible skill chips");
  }

  for (const skill of skills) {
    for (const check of jargonChecks) {
      if (check.pattern.test(skill)) {
        addIssue(issues, profileName, "skill-jargon", `${skill}: ${check.message}`);
      }
    }
    if (/^match impact$/i.test(skill)) {
      addIssue(issues, profileName, "skill-generic", "replace Match impact with a player-specific skill chip");
    }
    if (/goalkeeper/i.test(profile?.position || "") && /\b(?:finishing|runs in behind|pressing|wide threat|box presence)\b/i.test(skill)) {
      addIssue(issues, profileName, "skill-role-mismatch", `${skill}: goalkeeper skill chip looks like an outfield role`);
    }
  }

  const claimedSides = getClaimedSides(note);
  if (!claimedSides.length || !usage || !usage.appearances) {
    return;
  }

  for (const side of claimedSides) {
    const sideCount = usage.sides.get(side) || 0;
    if (!sideCount) {
      addIssue(
        issues,
        profileName,
        "position-claim",
        `note claims ${side} side but verified World Cup usage is ${formatCounts(usage.positions)}`
      );
      continue;
    }

    if (sideCount / usage.appearances < 0.5) {
      addIssue(
        issues,
        profileName,
        "position-claim",
        `note claims ${side} side but tournament usage is mixed: sides ${formatCounts(usage.sides)}, positions ${formatCounts(usage.positions)}`
      );
    }
  }
}

const teamIds = parseTeamIds();
const maxIssues = parseMaxIssues();
const [profilesData, teamsData, lineupsData, fixturesData] = await Promise.all([
  readJson("player-profiles.json"),
  readJson("teams.json"),
  readJson("lineups.json"),
  readJson("fixtures.json")
]);

const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
const usageByPlayer = buildTournamentUsage(lineupsData, fixturesData);
const profiles = Object.entries(profilesData.profiles || {})
  .filter(([, profile]) => !teamIds.length || teamIds.includes(profile?.teamId))
  .sort(([leftName], [rightName]) => leftName.localeCompare(rightName));

if (!profiles.length) {
  console.error(
    teamIds.length
      ? `No profiles found for ${teamIds.join(", ")}.`
      : "No profiles found."
  );
  process.exit(1);
}

const issues = [];
for (const [profileName, profile] of profiles) {
  const usage = usageByPlayer.get(getUsageKey(profile?.teamId, profileName));
  auditProfile(profileName, profile, usage, teamsById.get(profile?.teamId), issues);
}

const scopeLabel = teamIds.length
  ? teamIds.map((teamId) => teamsById.get(teamId)?.name || teamId).join(", ")
  : "all teams";

console.log(`Player-card note audit: ${profiles.length} profiles checked for ${scopeLabel}.`);

if (issues.length) {
  const byKind = new Map();
  for (const issue of issues) {
    increment(byKind, issue.kind);
  }

  console.log(`Found ${issues.length} issue${issues.length === 1 ? "" : "s"}: ${formatCounts(byKind)}`);
  for (const issue of issues) {
    console.log(`- ${issue.profileName}: ${issue.message}`);
  }
} else {
  console.log("No player-card note issues found.");
}

if (issues.length > maxIssues) {
  console.error("");
  console.error(`Player-card note audit failed: ${issues.length} issue${issues.length === 1 ? "" : "s"} found.`);
  process.exit(1);
}
