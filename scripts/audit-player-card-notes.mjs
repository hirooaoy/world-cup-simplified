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

function countSentences(note) {
  const matches = String(note || "").match(/[.!?]+/g);
  return matches ? matches.length : 0;
}

function addIssue(issues, profileName, kind, message) {
  issues.push({ profileName, kind, message });
}

function auditProfile(profileName, profile, usage, issues) {
  const note = String(profile?.note || "").trim();
  const skills = Array.isArray(profile?.skills) ? profile.skills.filter(Boolean) : [];
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
  auditProfile(profileName, profile, usage, issues);
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
