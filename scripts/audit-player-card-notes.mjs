#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayerName } from "./player-name-matching.mjs";
import { parseGeneratedPlayerStyleNote } from "../locales/player-note-templates.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const args = process.argv.slice(2);
const MIN_NOTE_WORDS = 24;
const MAX_NOTE_WORDS = 65;
const MIN_NOTE_ZH_CHARACTERS = 36;
const MAX_NOTE_CHARACTERS = 300;
const MAX_NOTE_ZH_CHARACTERS = 190;
const CONCENTRATION_WARNING_SHARE = 0.1;
const CONCENTRATION_WARNING_MIN_COUNT = 3;
const STRUCTURE_WARNING_SHARE = 0.01;
const MIN_STRUCTURE_DIVERSITY_SHARE = 0.5;
const NOTE_GENERATOR_VERSION = "current-player-style-v6";
const MAX_SIGNATURE_CONCENTRATION_SHARE = 0.12;
const MAX_ACTION_CONCENTRATION_SHARE = 0.15;
const MAX_SENTENCE_STRUCTURE_SHARE = 0.2;
const MAX_THIRD_SENTENCE_OPENER_SHARE = 0.075;
const THIRD_SENTENCE_OPENER_WARNING_SHARE = 0.05;
const MIN_DISTINCT_THIRD_SENTENCE_OPENERS = 24;
const MIN_THIRD_SENTENCE_OPENER_COUNT = 40;
const MIN_CORPUS_SIZE_FOR_CONCENTRATION = 100;
const MIN_ROLE_SIZE_FOR_CONCENTRATION = 40;
const MAX_ROLE_SIGNATURE_CONCENTRATION_SHARE = 0.3;
const MAX_ROLE_ACTION_CONCENTRATION_SHARE = 0.36;
const VALID_ROLE_GROUPS = new Set(["goalkeeper", "defender", "midfielder", "forward", "player"]);
const VALID_STRUCTURE_IDS = new Set([
  "paired-observation",
  "two-clues",
  "second-detail",
  "separating-clue",
  "repeated-evidence",
  "example-another",
  "foundation-watch",
  "different-phase",
  "quality-defines-game",
  "role-guide",
  "legacy-three",
  "authored"
]);
const ADDITIONAL_TRAIT_CADENCE_STRUCTURE_IDS = Object.freeze([
  "paired-observation",
  "two-clues",
  "second-detail",
  "separating-clue",
  "foundation-watch",
  "different-phase"
]);
const GOALKEEPER_QUALITY_IDS = new Set([
  "early-position-reactions",
  "centre-first-positioning",
  "rebound-control",
  "compact-reflex-shape",
  "crowded-goal-command",
  "save-starts-attack",
  "high-starting-position",
  "penalty-reading",
  "long-focus",
  "goalkeeper-balance",
  "early-organization",
  "experience-calm",
  "shot-stopping-readiness",
  "goalkeeper-distribution"
]);
const GOALKEEPER_ACTION_IDS = new Set([
  "set-and-react",
  "hold-central-goal-lane",
  "parry-away-danger",
  "controlled-reflex-block",
  "claim-cross-high",
  "claim-timing",
  "simple-restart",
  "sweeper-exit",
  "penalty-wait",
  "sudden-save-calm",
  "economical-save",
  "line-instructions",
  "manage-tempo-risk",
  "set-for-shot",
  "restart-to-teammate"
]);
const GOALKEEPER_EXCLUSIVE_QUALITY_IDS = new Set([
  "early-position-reactions",
  "centre-first-positioning",
  "rebound-control",
  "compact-reflex-shape",
  "crowded-goal-command",
  "save-starts-attack",
  "high-starting-position",
  "penalty-reading",
  "long-focus",
  "goalkeeper-balance",
  "shot-stopping-readiness",
  "goalkeeper-distribution"
]);
const GOALKEEPER_EXCLUSIVE_ACTION_IDS = new Set([
  "set-and-react",
  "hold-central-goal-lane",
  "parry-away-danger",
  "controlled-reflex-block",
  "claim-cross-high",
  "claim-timing",
  "simple-restart",
  "sweeper-exit",
  "penalty-wait",
  "sudden-save-calm",
  "economical-save",
  "set-for-shot",
  "restart-to-teammate"
]);
const SURNAME_PARTICLES = new Set([
  "al", "ben", "bin", "da", "das", "de", "del", "della", "den", "der", "di", "dos", "du", "el", "la", "le", "mac", "st", "st.", "ten", "ter", "van", "von"
]);
const GENERATIONAL_SUFFIXES = new Set(["jr", "jr.", "junior", "júnior"]);
const KOREAN_FAMILY_NAMES = new Set([
  "bae", "cho", "eom", "hwang", "jo", "kim", "lee", "oh", "paik", "park", "seol", "son", "song", "yang"
]);
const NAME_REFERENCE_REGRESSIONS = new Map([
  ["Son Heung-min", "Son"],
  ["Ayoub El Kaabi", "El Kaabi"],
  ["Amine Ben Hmida", "Ben Hamida"],
  ["Dayne St. Clair", "St. Clair"],
  ["Alexis Mac Allister", "Mac Allister"],
  ["Vinicius Junior", "Vinícius"],
  ["Edmilson Junior", "Edmilson"],
  ["Derrick Etienne", "Etienne"]
]);
const CURRENT_COPY_COHERENCE_REGRESSIONS = new Map([
  ["Erling Haaland", { signatureId: "aerial-reading", headlineActionId: "attack-dropping-ball" }],
  ["Federico Valverde", { signatureId: "long-shot-threat", headlineActionId: "open-distance-shot" }],
  ["Sadio Mane", { signatureId: "clean-shot", headlineActionId: "moving-finish" }],
  ["Rodri", { signatureId: "pressure-composure", headlineActionId: "first-touch-escape" }],
  ["Martin Experience", { signatureId: "deep-attack-timing", headlineActionId: "overlap-timing" }],
  ["Virgil van Dijk", { signatureId: "early-organization", headlineActionId: "line-instructions", evidenceTier: "limited" }],
  ["Song Bum-keun", { signatureId: "save-starts-attack", headlineActionId: "simple-restart", evidenceTier: "role-level" }],
  ["Mouhib Chamakh", { signatureId: "save-starts-attack", headlineActionId: "simple-restart", evidenceTier: "role-level" }]
]);
const CURRENT_SOURCE_ROUTE_REGRESSIONS = new Map([
  ["Neymar", { skill: "Disguised passing", qualityId: "disguised-passing", actionId: "hide-pass-intent" }],
  ["Brahim Diaz", { skill: "Disguised passing", qualityId: "disguised-passing", actionId: "hide-pass-intent" }],
  ["Jeremy Doku", { skill: "Pulled-back passes", qualityId: "pullback-creation", actionId: "pull-ball-back" }],
  ["Nico Williams", { skill: "Pulled-back passes", qualityId: "pullback-creation", actionId: "pull-ball-back" }],
  ["Andy Robertson", { skill: "Crossing volume", qualityId: "crossing-volume", actionId: "repeat-wide-delivery" }],
  ["Alexander Isak", { skill: "Elite striker movement", qualityId: "purposeful-off-ball", actionId: "offer-clear-target" }],
  ["Bradley Barcola", { skill: "One-on-one running", qualityId: "one-on-one-running", actionId: "run-at-isolated-defender" }]
]);
const ACTION_FAMILY_BY_ID = new Map([
  ["set-and-react", "save-mechanics"],
  ["set-for-shot", "save-mechanics"],
  ["economical-save", "save-mechanics"],
  ["hold-central-goal-lane", "save-mechanics"],
  ["parry-away-danger", "save-mechanics"],
  ["controlled-reflex-block", "save-mechanics"],
  ["claim-timing", "cross-claim"],
  ["claim-cross-high", "cross-claim"],
  ["shoot-strong-foot", "finishing-contact"],
  ["shoot-left-foot", "finishing-contact"],
  ["shoot-right-foot", "finishing-contact"],
  ["finish-either-foot", "finishing-contact"],
  ["first-time-finish", "finishing-contact"],
  ["moving-finish", "finishing-contact"],
  ["meet-ball-early", "aerial-contact"],
  ["head-clear-early", "aerial-contact"],
  ["attack-dropping-ball", "aerial-contact"],
  ["contest-aerial-ball", "aerial-contact"],
  ["protect-goal-route", "defensive-route"],
  ["recover-before-box", "defensive-route"],
  ["hold-box-route", "defensive-route"],
  ["carry-through-gap", "attack-gap"],
  ["attack-channel-gap", "attack-gap"],
  ["push-and-accelerate", "attack-gap"],
  ["carry-into-space", "attack-gap"],
  ["run-at-isolated-defender", "attack-gap"],
  ["accelerate-into-space", "attack-gap"],
  ["body-and-return", "hold-up-link"],
  ["pin-and-create", "hold-up-link"],
  ["first-touch-escape", "pressure-progression"],
  ["play-through-pressure", "pressure-progression"],
  ["carry-under-pressure", "pressure-progression"],
  ["protect-then-challenge", "duel-trigger"],
  ["win-loose-touch", "duel-trigger"]
]);
const DIRECT_ACTION_IDS_BY_SIGNATURE = new Map([
  ["clean-shot", new Set(["shoot-strong-foot", "shoot-left-foot", "shoot-right-foot", "finish-either-foot", "first-time-finish", "moving-finish"])],
  ["protect-danger-space", new Set(["hold-box-route", "hold-midfield-lane"])],
  ["see-decisive-pass", new Set(["draw-and-release"])],
  ["create-pass-angle", new Set(["move-after-release"])],
  ["early-position-reactions", new Set(["set-and-react"])],
  ["centre-first-positioning", new Set(["hold-central-goal-lane"])],
  ["rebound-control", new Set(["parry-away-danger"])],
  ["compact-reflex-shape", new Set(["controlled-reflex-block"])],
  ["role-flexibility", new Set(["simple-role-change"])],
  ["duel-timing", new Set(["win-loose-touch"])],
  ["open-grass-speed", new Set(["change-pace"])],
  ["close-control-direction", new Set(["carry-through-gap", "change-pace", "first-touch-escape"])],
  ["safe-defensive-decision", new Set(["protect-then-challenge"])],
  ["purposeful-off-ball", new Set(["offer-clear-target"])],
  ["long-focus", new Set(["sudden-save-calm"])],
  ["targeted-press", new Set(["press-angle"])],
  ["pressure-composure", new Set(["first-touch-escape"])],
  ["passing-weight-angle", new Set(["play-through-pressure", "first-forward-lane"])],
  ["early-organization", new Set(["line-instructions"])],
  ["experience-calm", new Set(["manage-tempo-risk"])],
  ["recovery-speed", new Set(["recover-before-box"])],
  ["strength-continuity", new Set(["absorb-and-carry"])],
  ["early-run", new Set(["attack-channel-gap"])],
  ["aerial-reading", new Set(["meet-ball-early", "head-clear-early", "attack-dropping-ball"])],
  ["delayed-run", new Set(["late-box-arrival"])],
  ["calm-recovery", new Set(["protect-goal-route"])],
  ["tight-space-delivery", new Set(["pick-cross-target"])],
  ["help-next-action", new Set(["body-and-return"])],
  ["physical-reference", new Set(["pin-and-create"])],
  ["read-next-phase", new Set(["early-position-adjustment"])],
  ["planned-tight-receive", new Set(["open-body-forward"])],
  ["deep-attack-timing", new Set(["overlap-timing", "offer-clear-target"])],
  ["goalkeeper-balance", new Set(["economical-save"])],
  ["open-midfield-carry", new Set(["push-and-accelerate"])],
  ["save-starts-attack", new Set(["simple-restart"])],
  ["dead-ball-technique", new Set(["vary-delivery"])],
  ["high-starting-position", new Set(["sweeper-exit"])],
  ["penalty-reading", new Set(["penalty-wait"])],
  ["runner-tracking", new Set(["check-runner"])],
  ["crowded-goal-command", new Set(["claim-timing", "claim-cross-high"])],
  ["near-post-timing", new Set(["near-post-run"])],
  ["long-shot-threat", new Set(["open-distance-shot"])],
  ["cross-angle-control", new Set(["block-cross-angle"])],
  ["second-ball-reaction", new Set(["anticipate-second-ball"])],
  ["nearby-unit-organization", new Set(["nearby-unit-cues"])],
  ["front-line-leadership", new Set(["lead-first-pressure"])],
  ["back-post-arrival", new Set(["attack-back-post"])],
  ["penalty-contact-calm", new Set(["composed-penalty-strike"])],
  ["left-foot-passing", new Set(["pass-with-left-foot"])],
  ["disguised-passing", new Set(["hide-pass-intent"])],
  ["pullback-creation", new Set(["pull-ball-back"])],
  ["passing-continuity", new Set(["play-available-pass"])],
  ["crossing-volume", new Set(["repeat-wide-delivery"])],
  ["one-on-one-running", new Set(["run-at-isolated-defender"])],
  ["shot-stopping-readiness", new Set(["set-for-shot"])],
  ["aerial-defending", new Set(["contest-aerial-ball"])],
  ["pressing-work", new Set(["join-team-pressure"])],
  ["set-piece-responsibility", new Set(["deliver-dead-ball"])],
  ["chance-passing", new Set(["play-to-available-runner"])],
  ["ball-carrying", new Set(["carry-into-space"])],
  ["dribbling-control", new Set(["carry-under-pressure"])],
  ["wide-service", new Set(["send-wide-delivery"])],
  ["goal-threat-positioning", new Set(["move-into-shot-position"])],
  ["finishing-readiness", new Set(["set-for-finish"])],
  ["pace-in-space", new Set(["accelerate-into-space"])],
  ["aerial-duels", new Set(["contest-aerial-ball"])],
  ["strength-in-contact", new Set(["hold-through-contact"])],
  ["goalkeeper-distribution", new Set(["restart-to-teammate"])]
]);
const CAUSAL_SUPPORT_STRUCTURES = new Set([
  "repeated-evidence",
  "example-another",
  "quality-defines-game"
]);
const PROFILE_SKILL_EVIDENCE_SCORE = Object.freeze({
  specific: 0.88,
  broad: 0.76,
  generic: 0.62,
  "role-level": 0.45
});
const VALID_EVIDENCE_TIERS = new Set(["specific", "supported", "limited", "role-level"]);
const GENERIC_SKILL_EVIDENCE_PATTERN = /^(?:aerial duels?|ball carrying|chance passes?|command|composure|control|crossing|distribution|dribbling|experience|final pass|finishing|goal threat|leadership|movement|pace|passing|power|pressing|shot stopping|speed|strength)$/u;
const BROAD_DOMAIN_SKILL_EVIDENCE_PATTERNS = [
  /^(?:aerial defending|crossing volume|elite striker movement|one-on-one running|set-piece delivery)$/u,
  /^(?:(?:left|right)-footed passing|(?:short|calm|simple) passing)$/u,
  /^(?:aerial finishing|box movement|hold-up play|press resistance|wide defending)$/u
];
const SPECIFIC_SKILL_EVIDENCE_PATTERNS = [
  /(?:back|far|near)[- ]post (?:arrivals?|attacks?|movement|runs?|timing)/u,
  /(?:late (?:box |midfield |attacking )?(?:arrivals?|runs?)|box arrivals?|penalty[- ]area timing)/u,
  /(?:recovery tackles?|line[- ]breaking|through balls?)/u,
  /(?:overlap timing|penalty saves?)/u,
  /(?:long[- ]range shooting|distance shooting)/u,
  /(?:left|right)[- ]footed (?:final ball|finishing|shooting)/u,
  /(?:cross (?:blocking|claiming|handling|prevention)|runner tracking|second balls?)/u,
  /(?:disguised passing|pulled-back passes)/u
];

function expectedEvidenceGrade(skill, kind) {
  if (kind === "role-fallback") return "role-level";
  const value = String(skill || "").trim().toLocaleLowerCase("en-US");
  if (GENERIC_SKILL_EVIDENCE_PATTERN.test(value)) return "generic";
  if (BROAD_DOMAIN_SKILL_EVIDENCE_PATTERNS.some((pattern) => pattern.test(value))) return "broad";
  if (SPECIFIC_SKILL_EVIDENCE_PATTERNS.some((pattern) => pattern.test(value))) return "specific";
  return "broad";
}

function expectedEvidenceTier(grades) {
  if (grades.every((grade) => grade === "role-level")) return "role-level";
  if (grades.includes("role-level") || grades.includes("generic")) return "limited";
  if (grades.every((grade) => grade === "specific")) return "specific";
  return "supported";
}

function expectedEvidenceConfidence(grades) {
  return Number((
    PROFILE_SKILL_EVIDENCE_SCORE[grades[0]] * 0.65
      + PROFILE_SKILL_EVIDENCE_SCORE[grades[1]] * 0.35
  ).toFixed(2));
}

const EXPECTED_SKILL_ROUTES = new Map([
  ["left-footed passing", ["left-foot-passing", "pass-with-left-foot"]],
  ["disguised passing", ["disguised-passing", "hide-pass-intent"]],
  ["pulled-back passes", ["pullback-creation", "pull-ball-back"]],
  ["short passing", ["passing-continuity", "play-available-pass"]],
  ["calm passing", ["passing-continuity", "play-available-pass"]],
  ["simple passing", ["passing-continuity", "play-available-pass"]],
  ["crossing volume", ["crossing-volume", "repeat-wide-delivery"]],
  ["elite striker movement", ["purposeful-off-ball", "offer-clear-target"]],
  ["one-on-one running", ["one-on-one-running", "run-at-isolated-defender"]],
  ["shot stopping", ["shot-stopping-readiness", "set-for-shot"]],
  ["aerial defending", ["aerial-defending", "contest-aerial-ball"]],
  ["pressing", ["pressing-work", "join-team-pressure"]],
  ["set-piece delivery", ["set-piece-responsibility", "deliver-dead-ball"]],
  ["chance pass", ["chance-passing", "play-to-available-runner"]],
  ["chance passes", ["chance-passing", "play-to-available-runner"]],
  ["final pass", ["chance-passing", "play-to-available-runner"]],
  ["ball carrying", ["ball-carrying", "carry-into-space"]],
  ["dribbling", ["dribbling-control", "carry-under-pressure"]],
  ["crossing", ["wide-service", "send-wide-delivery"]],
  ["goal threat", ["goal-threat-positioning", "move-into-shot-position"]],
  ["finishing", ["finishing-readiness", "set-for-finish"]],
  ["pace", ["pace-in-space", "accelerate-into-space"]],
  ["speed", ["pace-in-space", "accelerate-into-space"]],
  ["aerial duel", ["aerial-duels", "contest-aerial-ball"]],
  ["aerial duels", ["aerial-duels", "contest-aerial-ball"]],
  ["power", ["strength-in-contact", "hold-through-contact"]],
  ["strength", ["strength-in-contact", "hold-through-contact"]],
  ["passing", ["passing-continuity", "play-available-pass"]]
]);

function expectedSkillRoute(skill, role) {
  const value = String(skill || "").trim().toLocaleLowerCase("en-US");
  if (value === "distribution") {
    return role === "goalkeeper"
      ? ["goalkeeper-distribution", "restart-to-teammate"]
      : ["passing-continuity", "play-available-pass"];
  }
  return EXPECTED_SKILL_ROUTES.get(value);
}
const CADENCE_STRUCTURE_IDS = [
  "paired-observation",
  "two-clues",
  "second-detail",
  "separating-clue",
  "foundation-watch",
  "different-phase"
];

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

function roleGroup(profile = {}) {
  const position = String(profile.position || "");
  const primary = position.split(/[,/;]/)[0].trim();
  const goalkeeperPattern = /\b(?:goalkeeper|GK)\b/i;
  const defenderPattern = /\b(?:centre[- ]back|center[- ]back|defender|full[- ]back|right[- ]back|left[- ]back|wing[- ]back|CB|RB|LB|RWB|LWB)\b/i;
  const midfielderPattern = /\b(?:midfielder|midfield|defensive midfielder|central midfielder|attacking midfielder|CM|DM|AM|RM|LM)\b/i;
  const forwardPattern = /\b(?:forward|striker|winger|centre-forward|center-forward|ST|RW|LW)\b/i;
  if (goalkeeperPattern.test(position)) return "goalkeeper";
  if (defenderPattern.test(primary)) return "defender";
  if (midfielderPattern.test(primary)) return "midfielder";
  if (forwardPattern.test(primary)) return "forward";
  if (defenderPattern.test(position)) return "defender";
  if (midfielderPattern.test(position)) return "midfielder";
  if (forwardPattern.test(position)) return "forward";
  return "player";
}

function expectedShortName(profileName, profile = {}) {
  const display = String(profile.displayName || profile.name || profileName || "").trim();
  const parts = display.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || display;
  const firstToken = parts[0].toLocaleLowerCase("en-US").replace(/[.,]$/, "");
  if (
    String(profile.teamId || "").toUpperCase() === "KOR"
    && KOREAN_FAMILY_NAMES.has(firstToken)
    && /-/.test(parts[1] || "")
  ) {
    return parts[0].replace(/[.,]$/, "");
  }
  let end = parts.length;
  while (
    end > 1
    && GENERATIONAL_SUFFIXES.has(parts[end - 1].toLocaleLowerCase("en-US").replace(/,$/, ""))
  ) {
    end -= 1;
  }
  let start = end - 1;
  while (
    start > 0
    && SURNAME_PARTICLES.has(parts[start - 1].toLocaleLowerCase("en-US").replace(/[.,]$/, ""))
  ) {
    const particle = parts[start - 1].toLocaleLowerCase("en-US").replace(/,$/, "");
    if (start - 1 === 0 && ["ben", "el", "mac", "st", "st."].includes(particle)) break;
    start -= 1;
  }
  return parts.slice(start, end).join(" ").replace(/[.,]$/, "");
}

function getExpectedReferenceCandidates(profileName, profile = {}) {
  const candidates = new Set();
  const addCandidate = (value, candidateProfile = profile) => {
    const name = String(value || "").trim();
    if (!name) return;
    candidates.add(name);
    candidates.add(expectedShortName(name, { ...candidateProfile, displayName: name }));
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length === 2) {
      candidates.add(words[0].replace(/[.,]$/, ""));
    }
  };

  addCandidate(profile?.displayName || profile?.name || profileName);
  addCandidate(profile?.name || profileName, { ...profile, displayName: profile?.name || profileName });
  if (Array.isArray(profile?.aliases)) {
    profile.aliases.forEach((alias) => addCandidate(alias, { ...profile, displayName: alias }));
  }

  return [...candidates].filter(Boolean);
}

function isSameReference(left, right) {
  return normalizePlayerName(left) === normalizePlayerName(right);
}

function normalizeReferenceText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .toLocaleLowerCase("en-US");
}

function noteContainsReference(note, reference) {
  return normalizeReferenceText(note).includes(normalizeReferenceText(reference));
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

const liveStatCopyChecks = [
  {
    pattern: /\b(?:this|the current) (?:World Cup|tournament)\b|\bin this tournament\b/i,
    message: "keep current-tournament context in the live This World Cup row, not the evergreen paragraph"
  },
  {
    pattern: /\b\d+\s+(?:goals?|assists?)\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten) (?:goals?|assists?)\b/i,
    message: "keep goal and assist totals in the live This World Cup row"
  },
  {
    pattern: /\b(?:scored|assisted|set up)\b.{0,90}\bagainst\b|\bagainst\b.{0,90}\b(?:scored|assisted|set up)\b/i,
    message: "remove named current-tournament goal or assist evidence from the evergreen paragraph"
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

function splitSentences(value) {
  const text = String(value || "")
    .replace(/\b(?:Jr|St)\./gu, (match) => match.slice(0, -1))
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return [];
  return (text.match(/[^.!?。！？]+(?:[.!?。！？]+|$)/gu) || [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function countWords(value) {
  return (String(value || "").match(/[\p{Letter}\p{Number}]+(?:[’'-][\p{Letter}\p{Number}]+)*/gu) || []).length;
}

function countReadableCharacters(value) {
  return (String(value || "").match(/[\p{Letter}\p{Number}]/gu) || []).length;
}

function countContentBeats(note) {
  let beats = 0;
  for (const sentence of splitSentences(note)) {
    if (countWords(sentence) < 4) continue;
    beats += 1;
    const connectors = sentence.match(/(?:,\s*|\s+)(?:and|or|but|then|while|before|after)\b/gi) || [];
    beats += Math.min(2, connectors.length);
  }
  return beats;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeCopyText(value) {
  return String(value || "")
    .toLocaleLowerCase("en-US")
    .replace(/[’]/g, "'")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\b\d+\b/g, "{number}")
    .replace(/\s+/g, " ")
    .trim();
}

function getPlayerMentions(profileName, profile = {}) {
  const mentions = new Set();
  for (const value of [
    profileName,
    profile.name,
    profile.displayName,
    ...(Array.isArray(profile.aliases) ? profile.aliases : [])
  ]) {
    const text = String(value || "").trim();
    if (!text) continue;
    mentions.add(text);
    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length > 1) mentions.add(parts.at(-1));
    if (parts.length > 2) mentions.add(parts.slice(-2).join(" "));
  }
  return [...mentions].sort((left, right) => right.length - left.length);
}

function normalizeNoteStructure(profileName, profile, note) {
  let normalized = normalizeCopyText(note);
  for (const mention of getPlayerMentions(profileName, profile)) {
    const normalizedMention = normalizeCopyText(mention);
    if (!normalizedMention) continue;
    normalized = normalized.replace(
      new RegExp(
        `(^|[^\\p{Letter}\\p{Number}])${escapeRegExp(normalizedMention)}('s)?(?=$|[^\\p{Letter}\\p{Number}])`,
        "gu"
      ),
      (_match, prefix, possessive) => `${prefix}{player}${possessive || ""}`
    );
  }
  return normalized;
}

function normalizeThirdSentenceOpener(profileName, profile, note) {
  const thirdSentence = splitSentences(note)[2];
  if (!thirdSentence) return "";
  const normalized = normalizeNoteStructure(profileName, profile, thirdSentence)
    .replace(/[,:;.!?]+$/gu, "")
    .trim();
  const subjectMatch = normalized.match(/^(.*?(?:\{player\}|\bhe))(?=\s)/u);
  if (!subjectMatch) {
    return normalized.split(/\s+/u).slice(0, 5).join(" ");
  }
  const subjectLed = subjectMatch[1].trim();
  const remainder = normalized.slice(subjectMatch[0].length).trim();
  if (["he", "{player}"].includes(subjectLed) && remainder.startsWith("also ")) {
    return `${subjectLed} also`;
  }
  return subjectLed;
}

function getSignatureBeatKey(profileName, profile, note) {
  const firstSentence = splitSentences(note)[0]?.replace(/[.!?。！？]+$/gu, "") || "";
  const normalized = normalizeNoteStructure(profileName, profile, firstSentence);
  const patterns = [
    /^watch .+? for (.+)$/u,
    /^.+? stands out for (.+)$/u,
    /^.+?'s signature is (.+)$/u,
    /^.+?'s edge is (.+)$/u,
    /^.+? is defined by (.+)$/u
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) return match[1];
  }
  return normalized;
}

function getActionBeatKeys(profileName, profile, note) {
  return splitSentences(note)
    .slice(1)
    .map((sentence) => normalizeNoteStructure(profileName, profile, sentence))
    .map((sentence) => sentence.replace(/^(?:\{player\}|he|they)\s+/u, "").replace(/[.!?。！？]+$/gu, ""))
    .filter(Boolean);
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor((sorted.length - 1) * fraction)];
}

function formatMetricLabel(value, maxLength = 105) {
  const text = String(value || "");
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

function topEntries(counts, limit = 3) {
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function formatShare(count, total) {
  return total ? `${((count / total) * 100).toFixed(1)}%` : "0.0%";
}

function reportCorpusQuality(profiles) {
  const sentenceShapes = new Map();
  const renderedCombinationCounts = new Map();
  const sentenceStructureCounts = new Map();
  const semanticTripleCounts = new Map();
  const signatureCounts = new Map();
  const actionCounts = new Map();
  const evidenceTierCounts = new Map();
  const fallbackFramingCounts = new Map();
  const thirdSentenceOpenerCounts = new Map();
  const cadenceVariantCounts = new Map();
  const cadenceVariantsByStructure = new Map();
  const sourceRouteVariants = new Map();
  const teamCadenceSequences = new Map();
  const roleConcentration = new Map();
  const wordCounts = [];
  const lowBeatProfiles = [];
  let sourceRouteObservationCount = 0;
  let directNameHeHeCount = 0;

  for (const [profileName, profile] of profiles) {
    const note = String(profile?.note || "").trim();
    if (!note) continue;
    increment(sentenceShapes, String(splitSentences(note).length));
    wordCounts.push(countWords(note));
    increment(renderedCombinationCounts, normalizeNoteStructure(profileName, profile, note));
    const metadata = profile?.noteMeta || {};
    increment(evidenceTierCounts, metadata.origin === "authored" ? "authored" : String(metadata.evidenceTier || "missing"));
    if (metadata.origin === "generated") {
      increment(fallbackFramingCounts, String(metadata.fallbackFraming || "missing"));
      if (metadata.structureId !== "role-guide") {
        const teamId = String(profile?.teamId || "unknown");
        if (!teamCadenceSequences.has(teamId)) teamCadenceSequences.set(teamId, []);
        teamCadenceSequences.get(teamId).push(String(metadata.structureId || "untracked"));
      }
      if (
        metadata.supportRelation === "additional-trait"
        && metadata.fallbackFraming === "none"
      ) {
        const cadenceVariantId = String(metadata.cadenceVariantId || "missing");
        const structureId = String(metadata.structureId || "missing");
        const thirdSentenceOpener = normalizeThirdSentenceOpener(profileName, profile, note) || "missing";
        increment(cadenceVariantCounts, cadenceVariantId);
        increment(thirdSentenceOpenerCounts, thirdSentenceOpener);
        if (!cadenceVariantsByStructure.has(structureId)) {
          cadenceVariantsByStructure.set(structureId, new Set());
        }
        cadenceVariantsByStructure.get(structureId).add(cadenceVariantId);
      }
    }
    const signatureId = String(metadata.signatureId || getSignatureBeatKey(profileName, profile, note));
    const actionIds = Array.isArray(metadata.actionIds) && metadata.actionIds.length === 2
      ? metadata.actionIds
      : getActionBeatKeys(profileName, profile, note);
    const noteRole = VALID_ROLE_GROUPS.has(metadata.roleGroup)
      ? metadata.roleGroup
      : roleGroup(profile);
    if (!roleConcentration.has(noteRole)) {
      roleConcentration.set(noteRole, { count: 0, signatures: new Map(), actions: new Map() });
    }
    const roleMetrics = roleConcentration.get(noteRole);
    roleMetrics.count += 1;
    increment(roleMetrics.signatures, signatureId);
    for (const actionId of actionIds) increment(roleMetrics.actions, actionId);
    increment(sentenceStructureCounts, String(metadata.structureId || "untracked"));
    increment(signatureCounts, signatureId);
    increment(semanticTripleCounts, `${signatureId}:${[...actionIds].sort().join("+")}`);
    if (metadata.origin === "generated" && Array.isArray(metadata.beatSources)) {
      const qualityIds = [signatureId, String(metadata.supportingSignatureId || "missing")];
      for (const [index, source] of metadata.beatSources.entries()) {
        if (source?.kind !== "profile-skill" || !qualityIds[index] || !actionIds[index]) continue;
        const sourceKey = `${noteRole}:${String(source.skill || "").trim().toLocaleLowerCase("en-US")}`;
        if (!sourceRouteVariants.has(sourceKey)) sourceRouteVariants.set(sourceKey, new Set());
        sourceRouteVariants.get(sourceKey).add(`${qualityIds[index]}/${actionIds[index]}`);
        sourceRouteObservationCount += 1;
      }
    }
    if (countContentBeats(note) < 3) lowBeatProfiles.push(profileName);
    for (const action of actionIds) {
      increment(actionCounts, action);
    }
    if (/^[^.?!]+[.?!]\s+He\b[^.?!]+[.?!]\s+He\b/iu.test(note)) directNameHeHeCount += 1;
  }

  const noteCount = wordCounts.length;
  if (!noteCount) {
    console.log("No populated generic notes were available for corpus-quality reporting.");
    return [];
  }
  const repeatedRenderedCombinations = [...renderedCombinationCounts.values()].filter((count) => count > 1).length;
  const [topRenderedCombination = ["", 0]] = topEntries(renderedCombinationCounts, 1);
  const [topSignature = ["", 0]] = topEntries(signatureCounts, 1);
  const [topAction = ["", 0]] = topEntries(actionCounts, 1);
  const [topSentenceStructure = ["", 0]] = topEntries(sentenceStructureCounts, 1);
  const [topSemanticTriple = ["", 0]] = topEntries(semanticTripleCounts, 1);
  const [topThirdSentenceOpener = ["", 0]] = topEntries(thirdSentenceOpenerCounts, 1);
  const repeatedSemanticProfileCount = [...semanticTripleCounts.values()]
    .filter((count) => count > 1)
    .reduce((total, count) => total + count, 0);
  const inconsistentSourceRoutes = [...sourceRouteVariants.entries()]
    .filter(([, routes]) => routes.size > 1)
    .sort(([left], [right]) => left.localeCompare(right));
  const warnings = [];
  const hardFailures = [];

  if (lowBeatProfiles.length) {
    warnings.push(
      `${lowBeatProfiles.length}/${noteCount} notes have fewer than three detectable content beats; editorial review needed`
    );
  }
  if (topRenderedCombination[1] >= 3 && topRenderedCombination[1] / noteCount >= STRUCTURE_WARNING_SHARE) {
    warnings.push(
      `largest name-masked rendered combination appears ${topRenderedCombination[1]}/${noteCount} times (${formatShare(topRenderedCombination[1], noteCount)})`
    );
  }
  if (
    topSignature[1] >= CONCENTRATION_WARNING_MIN_COUNT
    && topSignature[1] / noteCount >= CONCENTRATION_WARNING_SHARE
  ) {
    warnings.push(
      `signature beat "${formatMetricLabel(topSignature[0])}" appears ${topSignature[1]}/${noteCount} times (${formatShare(topSignature[1], noteCount)})`
    );
  }
  if (
    topAction[1] >= CONCENTRATION_WARNING_MIN_COUNT
    && topAction[1] / noteCount >= CONCENTRATION_WARNING_SHARE
  ) {
    warnings.push(
      `action beat "${formatMetricLabel(topAction[0])}" appears ${topAction[1]}/${noteCount} times (${formatShare(topAction[1], noteCount)})`
    );
  }
  if (renderedCombinationCounts.size / noteCount < MIN_STRUCTURE_DIVERSITY_SHARE) {
    warnings.push(
      `only ${renderedCombinationCounts.size}/${noteCount} name-masked rendered combinations are distinct (${formatShare(renderedCombinationCounts.size, noteCount)})`
    );
  }

  if (noteCount >= MIN_CORPUS_SIZE_FOR_CONCENTRATION) {
    if (topSignature[1] / noteCount > MAX_SIGNATURE_CONCENTRATION_SHARE) {
      hardFailures.push(
        `signature ID ${topSignature[0]} appears ${topSignature[1]}/${noteCount} times (${formatShare(topSignature[1], noteCount)}); limit ${formatShare(MAX_SIGNATURE_CONCENTRATION_SHARE, 1)}`
      );
    }
    if (topAction[1] / noteCount > MAX_ACTION_CONCENTRATION_SHARE) {
      hardFailures.push(
        `action ID ${topAction[0]} appears ${topAction[1]}/${noteCount} times (${formatShare(topAction[1], noteCount)}); limit ${formatShare(MAX_ACTION_CONCENTRATION_SHARE, 1)}`
      );
    }
    if (topSentenceStructure[1] / noteCount > MAX_SENTENCE_STRUCTURE_SHARE) {
      hardFailures.push(
        `sentence structure ${topSentenceStructure[0]} appears ${topSentenceStructure[1]}/${noteCount} times (${formatShare(topSentenceStructure[1], noteCount)}); limit ${formatShare(MAX_SENTENCE_STRUCTURE_SHARE, 1)}`
      );
    }
  }

  const thirdSentenceOpenerCount = [...thirdSentenceOpenerCounts.values()]
    .reduce((total, count) => total + count, 0);
  if (
    topThirdSentenceOpener[1] >= MIN_THIRD_SENTENCE_OPENER_COUNT
    && topThirdSentenceOpener[1] / thirdSentenceOpenerCount > MAX_THIRD_SENTENCE_OPENER_SHARE
  ) {
    hardFailures.push(
      `normalized third-sentence opener "${topThirdSentenceOpener[0]}" appears `
        + `${topThirdSentenceOpener[1]}/${thirdSentenceOpenerCount} times `
        + `(${formatShare(topThirdSentenceOpener[1], thirdSentenceOpenerCount)}); `
        + `limit ${formatShare(MAX_THIRD_SENTENCE_OPENER_SHARE, 1)}`
    );
  } else if (
    topThirdSentenceOpener[1] >= MIN_THIRD_SENTENCE_OPENER_COUNT
    && topThirdSentenceOpener[1] / thirdSentenceOpenerCount > THIRD_SENTENCE_OPENER_WARNING_SHARE
  ) {
    warnings.push(
      `normalized third-sentence opener "${topThirdSentenceOpener[0]}" appears `
        + `${topThirdSentenceOpener[1]}/${thirdSentenceOpenerCount} times `
        + `(${formatShare(topThirdSentenceOpener[1], thirdSentenceOpenerCount)})`
    );
  }
  if (thirdSentenceOpenerCounts.size < MIN_DISTINCT_THIRD_SENTENCE_OPENERS) {
    hardFailures.push(
      `only ${thirdSentenceOpenerCounts.size} distinct normalized third-sentence openers appear across `
        + `${thirdSentenceOpenerCount} generated additional-trait notes; minimum ${MIN_DISTINCT_THIRD_SENTENCE_OPENERS}`
    );
  }
  for (const structureId of ADDITIONAL_TRAIT_CADENCE_STRUCTURE_IDS) {
    const cadenceCount = cadenceVariantsByStructure.get(structureId)?.size || 0;
    if (cadenceCount < 4) {
      hardFailures.push(
        `${structureId} exposes only ${cadenceCount} additional-trait cadence variants; minimum 4`
      );
    }
  }

  for (const [sourceKey, routes] of inconsistentSourceRoutes) {
    hardFailures.push(`source route ${sourceKey} produces multiple semantic pairs: ${[...routes].join(", ")}`);
  }

  let longestTeamCadenceRun = 0;
  let longestTeamCadenceLabel = "none";
  let widestTeamCadenceSpread = 0;
  let widestTeamCadenceSpreadLabel = "none";
  for (const [teamId, sequence] of teamCadenceSequences) {
    let runLength = 0;
    let previous = "";
    for (const structureId of sequence) {
      runLength = structureId === previous ? runLength + 1 : 1;
      previous = structureId;
      if (runLength > longestTeamCadenceRun) {
        longestTeamCadenceRun = runLength;
        longestTeamCadenceLabel = `${teamId}:${structureId}`;
      }
    }
    const cadenceCounts = CADENCE_STRUCTURE_IDS.map(
      (structureId) => sequence.filter((value) => value === structureId).length
    );
    const nonCausalSelections = cadenceCounts.reduce((total, count) => total + count, 0);
    if (nonCausalSelections >= 12) {
      const spread = Math.max(...cadenceCounts) - Math.min(...cadenceCounts);
      if (spread > widestTeamCadenceSpread) {
        widestTeamCadenceSpread = spread;
        widestTeamCadenceSpreadLabel = teamId;
      }
      if (spread > 2) {
        hardFailures.push(
          `${teamId} noncausal cadence shells have a ${spread}-card spread (${cadenceCounts.join(", ")}); limit 2`
        );
      }
    }
  }
  if (longestTeamCadenceRun > 2) {
    hardFailures.push(`${longestTeamCadenceLabel} repeats ${longestTeamCadenceRun} times in roster sequence; limit 2`);
  }

  const roleConcentrationRows = [...roleConcentration.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([role, metrics]) => ({
      role,
      ...metrics,
      topSignature: topEntries(metrics.signatures, 1)[0] || ["", 0],
      topAction: topEntries(metrics.actions, 1)[0] || ["", 0]
    }));
  for (const { role, count, topSignature: [signatureId, signatureCount], topAction: [actionId, actionCount] } of roleConcentrationRows) {
    if (count < MIN_ROLE_SIZE_FOR_CONCENTRATION) continue;
    if (signatureCount / count > MAX_ROLE_SIGNATURE_CONCENTRATION_SHARE) {
      hardFailures.push(
        `${role} signature ID ${signatureId} appears ${signatureCount}/${count} times ` +
          `(${formatShare(signatureCount, count)}); per-role limit ${formatShare(MAX_ROLE_SIGNATURE_CONCENTRATION_SHARE, 1)}`
      );
    }
    if (actionCount / count > MAX_ROLE_ACTION_CONCENTRATION_SHARE) {
      hardFailures.push(
        `${role} action ID ${actionId} appears ${actionCount}/${count} times ` +
          `(${formatShare(actionCount, count)}); per-role limit ${formatShare(MAX_ROLE_ACTION_CONCENTRATION_SHARE, 1)}`
      );
    }
  }

  console.log(
    `Note-shape baseline: sentences ${formatCounts(sentenceShapes)}; words min:${Math.min(...wordCounts)}, `
      + `median:${percentile(wordCounts, 0.5)}, p90:${percentile(wordCounts, 0.9)}, max:${Math.max(...wordCounts)}.`
  );
  console.log(
    `Content-beat review baseline: ${noteCount - lowBeatProfiles.length}/${noteCount} notes have at least three detectable beats.`
  );
  console.log(
    `Name-masked rendered combinations: ${renderedCombinationCounts.size}/${noteCount}; `
      + `${repeatedRenderedCombinations} repeated groups; largest group ${topRenderedCombination[1]}.`
  );
  console.log(
    `Semantic combinations (descriptive, not an individuality score): ${semanticTripleCounts.size}/${noteCount}; `
      + `${repeatedSemanticProfileCount}/${noteCount} profiles belong to a repeated triple; `
      + `largest triple group ${topSemanticTriple[1]}; ${directNameHeHeCount}/${noteCount} use the direct Name/He/He cadence.`
  );
  console.log(
    `Source routing: ${sourceRouteObservationCount} selected profile-skill beats across ${sourceRouteVariants.size} role/tag routes; `
      + `${inconsistentSourceRoutes.length} inconsistent routes.`
  );
  console.log(`Sentence structures: ${formatCounts(sentenceStructureCounts)}.`);
  console.log(
    `Additional-trait third-sentence openers: ${thirdSentenceOpenerCounts.size}/${thirdSentenceOpenerCount} distinct; `
      + `largest ${topThirdSentenceOpener[1]} (${formatShare(topThirdSentenceOpener[1], thirdSentenceOpenerCount)}).`
  );
  console.log(`Additional-trait cadence variants: ${formatCounts(cadenceVariantCounts)}.`);
  console.log(`Evidence tiers: ${formatCounts(evidenceTierCounts)}.`);
  console.log(`Fallback framing: ${formatCounts(fallbackFramingCounts)}.`);
  console.log(
    `Team cadence: longest same-shell run ${longestTeamCadenceRun} (${longestTeamCadenceLabel}); `
      + `widest six-shell noncausal spread ${widestTeamCadenceSpread} (${widestTeamCadenceSpreadLabel}).`
  );
  console.log("Most common signature beats:");
  for (const [value, count] of topEntries(signatureCounts)) {
    console.log(`- ${formatMetricLabel(value)}: ${count}/${noteCount} (${formatShare(count, noteCount)})`);
  }
  console.log("Most common action beats:");
  for (const [value, count] of topEntries(actionCounts)) {
    console.log(`- ${formatMetricLabel(value)}: ${count}/${noteCount} (${formatShare(count, noteCount)})`);
  }
  console.log("Role concentration baseline:");
  for (const { role, count, topSignature: [signatureId, signatureCount], topAction: [actionId, actionCount] } of roleConcentrationRows) {
    console.log(
      `- ${role}: signature ${formatMetricLabel(signatureId)} ${signatureCount}/${count} ` +
        `(${formatShare(signatureCount, count)}); action ${formatMetricLabel(actionId)} ${actionCount}/${count} ` +
        `(${formatShare(actionCount, count)})`
    );
  }
  if (warnings.length) {
    console.log("Non-blocking copy-concentration warnings (review baseline):");
    for (const warning of warnings) console.log(`- ${warning}`);
  } else {
    console.log("No non-blocking copy-concentration warnings at the current thresholds.");
  }
  if (hardFailures.length) {
    console.log("Blocking corpus-quality failures:");
    for (const failure of hardFailures) console.log(`- ${failure}`);
  }
  return hardFailures;
}

function addIssue(issues, profileName, kind, message) {
  issues.push({ profileName, kind, message });
}

function auditNoteMeta(profileName, profile, note, issues) {
  const metadata = profile?.noteMeta;
  const expectedRole = roleGroup(profile);
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    addIssue(issues, profileName, "missing-note-meta", "note has no copy provenance or semantic metadata");
    return;
  }
  if (!new Set(["generated", "authored"]).has(metadata.origin)) {
    addIssue(issues, profileName, "note-meta", `invalid note origin: ${metadata.origin || "missing"}`);
  }
  if (!VALID_ROLE_GROUPS.has(metadata.roleGroup) || metadata.roleGroup !== expectedRole) {
    addIssue(
      issues,
      profileName,
      "note-meta-role",
      `metadata role ${metadata.roleGroup || "missing"} does not match profile role ${expectedRole}`
    );
  }
  if (!VALID_STRUCTURE_IDS.has(metadata.structureId)) {
    addIssue(issues, profileName, "note-meta", `unknown note structure: ${metadata.structureId || "missing"}`);
  }
  if (typeof metadata.signatureId !== "string" || !metadata.signatureId.trim()) {
    addIssue(issues, profileName, "note-meta", "metadata has no signatureId");
  }
  if (
    !Array.isArray(metadata.actionIds)
    || metadata.actionIds.length !== 2
    || metadata.actionIds.some((id) => typeof id !== "string" || !id.trim())
  ) {
    addIssue(issues, profileName, "note-meta", "metadata actionIds must contain exactly two semantic IDs");
  }
  if (
    !Array.isArray(metadata.sourceSkills)
    || metadata.sourceSkills.length > 3
    || metadata.sourceSkills.some((skill) => typeof skill !== "string" || !skill.trim())
  ) {
    addIssue(issues, profileName, "note-meta", "metadata sourceSkills must contain zero to three actual skill tags");
  } else {
    const actualSkills = new Set((profile.skills || []).map((skill) => String(skill).trim().toLocaleLowerCase("en-US")));
    for (const sourceSkill of metadata.sourceSkills) {
      if (!actualSkills.has(sourceSkill.trim().toLocaleLowerCase("en-US"))) {
        addIssue(issues, profileName, "note-meta-source", `metadata source skill is not present on the profile: ${sourceSkill}`);
      }
    }
  }
  if (
    !Array.isArray(metadata.roleFallbacks)
    || metadata.roleFallbacks.length > 3
    || metadata.roleFallbacks.some((skill) => typeof skill !== "string" || !skill.trim())
  ) {
    addIssue(issues, profileName, "note-meta", "metadata roleFallbacks must be an array of zero to three tags");
  }
  if (!Number.isFinite(metadata.confidence) || metadata.confidence < 0 || metadata.confidence > 1) {
    addIssue(issues, profileName, "note-meta", "metadata confidence must be a number from 0 to 1");
  }

  const actionIds = Array.isArray(metadata.actionIds) ? metadata.actionIds : [];
  if (
    actionIds.length === 2
    && ACTION_FAMILY_BY_ID.get(actionIds[0])
    && ACTION_FAMILY_BY_ID.get(actionIds[0]) === ACTION_FAMILY_BY_ID.get(actionIds[1])
  ) {
    addIssue(issues, profileName, "repeated-action-family", `both action beats describe ${ACTION_FAMILY_BY_ID.get(actionIds[0])}`);
  }
  if (expectedRole === "goalkeeper") {
    if (!GOALKEEPER_QUALITY_IDS.has(metadata.signatureId) || actionIds.some((id) => !GOALKEEPER_ACTION_IDS.has(id))) {
      addIssue(
        issues,
        profileName,
        "note-role-mismatch",
        `goalkeeper metadata includes an outfield semantic beat: ${metadata.signatureId} / ${actionIds.join(", ")}`
      );
    }
  } else if (
    GOALKEEPER_EXCLUSIVE_QUALITY_IDS.has(metadata.signatureId)
    || actionIds.some((id) => GOALKEEPER_EXCLUSIVE_ACTION_IDS.has(id))
  ) {
    addIssue(
      issues,
      profileName,
      "note-role-mismatch",
      `outfield metadata includes a goalkeeper semantic beat: ${metadata.signatureId} / ${actionIds.join(", ")}`
    );
  }

  if (metadata.origin === "generated") {
    if (metadata.generatorVersion !== NOTE_GENERATOR_VERSION) {
      addIssue(
        issues,
        profileName,
        "stale-note-generator",
        `generated note uses ${metadata.generatorVersion || "no version"}; expected ${NOTE_GENERATOR_VERSION}`
      );
    }
    if (metadata.semanticSelectionBasis !== "editorial-specificity-source-order-v1") {
      addIssue(
        issues,
        profileName,
        "semantic-selection-basis",
        "generated semantics must use editorial specificity with source order only as a tie-breaker, never hash-selected evidence"
      );
    }
    const expectedHeadlineActions = DIRECT_ACTION_IDS_BY_SIGNATURE.get(metadata.signatureId);
    if (!expectedHeadlineActions?.has(actionIds[0])) {
      addIssue(
        issues,
        profileName,
        "headline-action",
        `headline ${metadata.signatureId} is not directly demonstrated by first action ${actionIds[0] || "missing"}`
      );
    }
    if (metadata.headlineActionId !== actionIds[0]) {
      addIssue(issues, profileName, "headline-action", "headlineActionId must identify the first observable action");
    }
    if (typeof metadata.supportingSignatureId !== "string" || !metadata.supportingSignatureId.trim()) {
      addIssue(issues, profileName, "supporting-beat", "generated metadata must identify the supporting quality");
    }
    const expectedSupportRelation = metadata.supportingSignatureId === metadata.signatureId
      ? "reinforces-headline"
      : "additional-trait";
    if (metadata.supportRelation !== expectedSupportRelation) {
      addIssue(
        issues,
        profileName,
        "supporting-beat",
        `support relation ${metadata.supportRelation || "missing"} should be ${expectedSupportRelation}`
      );
    }
    if (
      expectedSupportRelation === "additional-trait"
      && metadata.fallbackFraming === "none"
      && (
        typeof metadata.cadenceVariantId !== "string"
        || !metadata.cadenceVariantId.trim()
        || !Number.isInteger(metadata.cadenceVariantIndex)
        || metadata.cadenceVariantIndex < 0
        || metadata.cadenceVariantIndex > 4
      )
    ) {
      addIssue(
        issues,
        profileName,
        "cadence-variant",
        "generated additional-trait copy must identify one of five localized cadence variants"
      );
    }
    if (expectedSupportRelation === "additional-trait" && CAUSAL_SUPPORT_STRUCTURES.has(metadata.structureId)) {
      addIssue(
        issues,
        profileName,
        "causal-join",
        `structure ${metadata.structureId} incorrectly presents a distinct supporting trait as evidence of the headline`
      );
    }
    if (
      expectedSupportRelation === "additional-trait"
      && /\b(?:and again|another appears|another is how|it matters again|and notice when)\b/iu.test(note)
    ) {
      addIssue(
        issues,
        profileName,
        "causal-join",
        "additional evidence must use a phase or role pivot rather than read as a second proof of the headline"
      );
    }
    if (
      expectedSupportRelation === "additional-trait"
      && !/\b(?:separate(?:ly| clue| detail| point| phase| part| question)|another(?: detail| aspect| moment| point| part| phase| side)|different(?: detail| phase| question)|also|elsewhere|away from that (?:action|moment|phase)|at another point|beyond (?:that|the first action|that individual clue)|one more thing|wider|next thing|whether|broader|general(?:ly)?|position|job|task|guide|role|dut(?:y|ies)|responsibilit(?:y|ies))\b/iu.test(note)
    ) {
      addIssue(
        issues,
        profileName,
        "additive-pivot",
        "additional evidence must be introduced with an explicit phase, detail, or role pivot"
      );
    }
    if (!Array.isArray(metadata.beatSources) || metadata.beatSources.length !== 2) {
      addIssue(issues, profileName, "evidence-shape", "generated metadata must record two ordered beat sources");
    } else {
      const expectedSourceSkills = [];
      const expectedRoleFallbacks = [];
      const grades = [];
      for (const [index, beatSource] of metadata.beatSources.entries()) {
        if (!beatSource || !["profile-skill", "role-fallback"].includes(beatSource.kind)) {
          addIssue(issues, profileName, "evidence-shape", `beat source ${index + 1} has an invalid kind`);
          continue;
        }
        const skill = String(beatSource.skill || "").trim();
        if (!skill) {
          addIssue(issues, profileName, "evidence-shape", `beat source ${index + 1} has no skill label`);
          continue;
        }
        const expectedGrade = expectedEvidenceGrade(skill, beatSource.kind);
        grades.push(expectedGrade);
        if (beatSource.grade !== expectedGrade) {
          addIssue(
            issues,
            profileName,
            "evidence-grade",
            `${skill} is graded ${beatSource.grade || "missing"}; expected ${expectedGrade}`
          );
        }
        if (beatSource.kind === "profile-skill") expectedSourceSkills.push(skill);
        else expectedRoleFallbacks.push(skill);
        if (beatSource.kind === "profile-skill") {
          const expectedRoute = expectedSkillRoute(skill, metadata.roleGroup);
          const actualQualityId = index === 0 ? metadata.signatureId : metadata.supportingSignatureId;
          const actualActionId = actionIds[index];
          if (
            expectedRoute
            && (actualQualityId !== expectedRoute[0] || actualActionId !== expectedRoute[1])
          ) {
            addIssue(
              issues,
              profileName,
              "source-route-regression",
              `${skill} must map to ${expectedRoute[0]}/${expectedRoute[1]}; received ${actualQualityId}/${actualActionId}`
            );
          }
        }
      }
      if (JSON.stringify(metadata.sourceSkills) !== JSON.stringify(expectedSourceSkills)) {
        addIssue(issues, profileName, "evidence-shape", "sourceSkills must match ordered profile-skill beat sources");
      }
      if (JSON.stringify(metadata.roleFallbacks) !== JSON.stringify(expectedRoleFallbacks)) {
        addIssue(issues, profileName, "evidence-shape", "roleFallbacks must match ordered role-fallback beat sources");
      }
      if (grades.length === 2) {
        const expectedTier = expectedEvidenceTier(grades);
        const expectedConfidence = expectedEvidenceConfidence(grades);
        if (!VALID_EVIDENCE_TIERS.has(metadata.evidenceTier) || metadata.evidenceTier !== expectedTier) {
          addIssue(
            issues,
            profileName,
            "evidence-tier",
            `evidence tier ${metadata.evidenceTier || "missing"} should be ${expectedTier}`
          );
        }
        if (metadata.confidenceBasis !== "editorial-skill-specificity-v2") {
          addIssue(issues, profileName, "confidence-basis", "generated confidence must declare its editorial-tag basis");
        }
        if (metadata.confidence !== expectedConfidence) {
          addIssue(
            issues,
            profileName,
            "note-meta-confidence",
            `generated confidence ${metadata.confidence} does not match evidence grades ${grades.join(", ")} (${expectedConfidence})`
          );
        }
      }
    }
    if ((metadata.sourceSkills || []).length + (metadata.roleFallbacks || []).length !== 2) {
      addIssue(
        issues,
        profileName,
        "evidence-shape",
        "a generated note must use exactly two traceable sources: one for the headline/action pair and one for the additional beat"
      );
    }
    const beatKinds = Array.isArray(metadata.beatSources)
      ? metadata.beatSources.map((source) => source?.kind)
      : [];
    const expectedFallbackFraming = beatKinds.every((kind) => kind === "role-fallback")
      ? "role-guide"
      : beatKinds.includes("role-fallback")
        ? "role-responsibility"
        : "none";
    if (metadata.fallbackFraming !== expectedFallbackFraming) {
      addIssue(
        issues,
        profileName,
        "fallback-framing",
        `fallback framing ${metadata.fallbackFraming || "missing"} should be ${expectedFallbackFraming}`
      );
    }
    if (beatKinds[0] === "role-fallback" && beatKinds[1] === "profile-skill") {
      addIssue(issues, profileName, "fallback-order", "a role fallback cannot replace available player-specific headline evidence");
    }
    if (metadata.fallbackFraming === "role-responsibility") {
      const lastSentence = splitSentences(note).at(-1) || "";
      if (!/\b(?:whether|question|wider (?:read|picture)|next thing to watch)\b/iu.test(lastSentence)) {
        addIssue(
          issues,
          profileName,
          "fallback-framing",
          "the fallback beat must be framed as an open viewing question rather than a researched player trait"
        );
      }
      if (CAUSAL_SUPPORT_STRUCTURES.has(metadata.structureId)) {
        addIssue(issues, profileName, "fallback-framing", "a role fallback cannot be presented as proof of the headline trait");
      }
    }
    if (metadata.evidenceTier === "role-level" && metadata.structureId !== "role-guide") {
      addIssue(issues, profileName, "role-level-voice", "role-level copy must use an honest role-guide opener");
    }
    if (
      metadata.evidenceTier === "role-level"
      && (
        !/\b(?:watch|check whether)\b/iu.test(note)
        || /\b(?:signature|stands out|what separates|edge comes from|defines .+? game|the key to)\b/iu.test(note)
      )
    ) {
      addIssue(
        issues,
        profileName,
        "role-level-voice",
        "role-level copy must remain an observational viewing guide without presenting inferred actions as defining traits"
      );
    }
    if (/\b(?:duties also includes|role cue appears|in his (?:defensive|midfield) role|in his (?:goalkeeper|forward) duties|as part of his .+? (?:role|duties))\b/iu.test(note)) {
      addIssue(
        issues,
        profileName,
        "mechanical-fallback-voice",
        "fallback copy exposes a deprecated role/duties template instead of natural position guidance"
      );
    }
    if (/\b(?:the position asks him to|guide to the position|a basic task is to|position guide|the wider job)\b/iu.test(note)) {
      addIssue(
        issues,
        profileName,
        "mechanical-fallback-voice",
        "fallback copy must use an observational question instead of an abstract role or job formula"
      );
    }
    if (/\b(?:reactions|decisions)\b[^.?!]{0,90}\bis the foundation\b/iu.test(note)) {
      addIssue(
        issues,
        profileName,
        "foundation-agreement",
        "foundation framing must remain agreement-neutral for plural quality phrases"
      );
    }
    if (metadata.evidenceTier !== "role-level" && metadata.structureId === "role-guide") {
      addIssue(issues, profileName, "role-level-voice", "role-guide framing is reserved for cards without player-specific evidence");
    }
    const parsed = parseGeneratedPlayerStyleNote(note);
    if (
      !parsed
      && metadata.fallbackFraming !== "role-responsibility"
      && !["role-guide", "separating-clue"].includes(metadata.structureId)
    ) {
      addIssue(issues, profileName, "unparseable-generated-note", "generated note cannot be resolved into locale-safe semantic beats");
    } else if (parsed) {
      const expectedReferences = getExpectedReferenceCandidates(profileName, profile);
      if (!expectedReferences.some((reference) => isSameReference(reference, parsed.mention))) {
        addIssue(
          issues,
          profileName,
          "name-reference",
          `generated note references ${parsed.mention}; expected ${expectedReferences.join(" or ")}`
        );
      }
      if (parsed.qualityId !== metadata.signatureId) {
        addIssue(issues, profileName, "note-meta-drift", `parsed signature ${parsed.qualityId} differs from ${metadata.signatureId}`);
      }
      if (parsed.structure !== metadata.structureId) {
        addIssue(issues, profileName, "note-meta-drift", `parsed structure ${parsed.structure} differs from ${metadata.structureId}`);
      }
      if (JSON.stringify(parsed.actionIds) !== JSON.stringify(actionIds)) {
        addIssue(issues, profileName, "note-meta-drift", `parsed actions ${parsed.actionIds.join(", ")} differ from metadata`);
      }
    }
  } else if (!new Set(["authored", "legacy-three"]).has(metadata.structureId)) {
    addIssue(issues, profileName, "note-meta", "authored notes must use an authored or preserved legacy structure marker");
  }

  const expectedReferences = getExpectedReferenceCandidates(profileName, profile);
  const compoundReferences = expectedReferences.filter((reference) => reference.split(/\s+/).length > 1);
  const shortName = compoundReferences[0] || expectedShortName(profileName, profile);
  if (
    compoundReferences.length > 0 &&
    !expectedReferences.some((reference) => noteContainsReference(note, reference))
  ) {
    addIssue(issues, profileName, "compound-name", `note must keep the compound surname ${shortName} intact`);
  }

  const regressionReference = NAME_REFERENCE_REGRESSIONS.get(profileName);
  if (
    regressionReference &&
    !expectedReferences.some((reference) => isSameReference(reference, regressionReference))
  ) {
    addIssue(
      issues,
      profileName,
      "name-reference",
      `reference regression expected ${regressionReference}; received ${expectedReferences.join(" or ")}`
    );
  }
}

function auditProfile(profileName, profile, usage, team, issues) {
  const note = String(profile?.note || "").trim();
  const noteZh = String(profile?.noteZh || "").trim();
  const skills = Array.isArray(profile?.skills) ? profile.skills.filter(Boolean) : [];
  const displayNameIssue = getDisplayNameIssue(profileName, profile, team);
  if (displayNameIssue) {
    addIssue(issues, profileName, "display-name", displayNameIssue);
  }
  if (!note) {
    addIssue(issues, profileName, "missing-note", "profile has no player-card note");
    return;
  }

  if (!noteZh) {
    addIssue(issues, profileName, "missing-note-zh", "profile has no Chinese note");
  }
  if (
    profile?.noteMeta?.origin === "generated"
    && profile.noteMeta.evidenceTier === "role-level"
    && !/(?:是否|两个时刻)/u.test(noteZh)
  ) {
    addIssue(issues, profileName, "role-level-voice-zh", "Chinese role-level copy must remain an observational viewing guide");
  }
  if (
    profile?.noteMeta?.origin === "generated"
    && profile.noteMeta.fallbackFraming === "role-responsibility"
    && !/(?:是否|问题)/u.test(noteZh)
  ) {
    addIssue(
      issues,
      profileName,
      "fallback-framing-zh",
      "Chinese mixed-evidence copy must frame the fallback beat as something to observe rather than an established trait"
    );
  }
  if (/(?:职责的一部分|位置层面的观察)/u.test(noteZh)) {
    addIssue(
      issues,
      profileName,
      "mechanical-fallback-voice-zh",
      "Chinese fallback copy retains a deprecated role-duty formula"
    );
  }

  auditNoteMeta(profileName, profile, note, issues);

  if (profileName === "Kylian Mbappe") {
    const preservedMbappeNote = "Mbappé's signature is explosive speed once open grass appears. Near goal, he shifts onto his stronger foot and shoots with little backlift. When defenders crowd him, he looks for the next pass instead of forcing a shot.";
    const preservedMbappeNoteZh = "他的比赛方式建立在看到空当后的爆发速度上。接近球门时，他会把球调整到惯用脚，用很小的摆腿迅速完成射门。面对多人包夹时，他会寻找下一脚传球，而不是勉强射门。";
    if (note !== preservedMbappeNote || noteZh !== preservedMbappeNoteZh) {
      addIssue(issues, profileName, "authored-copy-regression", "preserve the approved Mbappé generic note exactly in English and Chinese");
    }
    if (
      profile?.noteMeta?.origin !== "authored"
      || profile?.noteMeta?.structureId !== "authored"
      || profile?.noteMeta?.signatureId !== "open-grass-speed"
      || JSON.stringify(profile?.noteMeta?.actionIds) !== JSON.stringify(["shoot-strong-foot", "release-under-crowding"])
    ) {
      addIssue(issues, profileName, "authored-copy-regression", "Mbappé semantic metadata no longer matches the approved note");
    }
  }

  if (profileName === "Goncalo Ramos") {
    const preservedRamosNote = "Ramos is defined by creating a clean shot before the defense can reset. He arrives in the box late enough to be difficult to track. He angles his run to block the easy pass as he closes the ball.";
    const preservedRamosNoteZh = "拉莫斯的特点是在防线重组前制造干净射门。他会稍晚进入禁区，让盯防者难以持续跟住，也会在接近持球人时调整逼抢路线，同时封住最简单的传球。";
    if (note !== preservedRamosNote || noteZh !== preservedRamosNoteZh) {
      addIssue(issues, profileName, "authored-copy-regression", "preserve the approved Ramos generic note exactly in English and Chinese");
    }
    if (
      profile?.noteMeta?.origin !== "authored"
      || profile?.noteMeta?.structureId !== "legacy-three"
      || profile?.noteMeta?.signatureId !== "clean-shot"
      || JSON.stringify(profile?.noteMeta?.actionIds) !== JSON.stringify(["late-box-arrival", "press-angle"])
    ) {
      addIssue(issues, profileName, "authored-copy-regression", "Ramos semantic metadata no longer matches the approved note");
    }
  }

  const coherenceRegression = CURRENT_COPY_COHERENCE_REGRESSIONS.get(profileName);
  if (coherenceRegression) {
    for (const [field, expectedValue] of Object.entries(coherenceRegression)) {
      if (profile?.noteMeta?.[field] !== expectedValue) {
        addIssue(
          issues,
          profileName,
          "coherence-regression",
          `${field} must remain ${expectedValue}; received ${profile?.noteMeta?.[field] || "missing"}`
        );
      }
    }
    if (profile?.noteMeta?.actionIds?.[0] !== coherenceRegression.headlineActionId) {
      addIssue(
        issues,
        profileName,
        "coherence-regression",
        `the first action must directly demonstrate ${coherenceRegression.signatureId}`
      );
    }
  }

  const sourceRouteRegression = CURRENT_SOURCE_ROUTE_REGRESSIONS.get(profileName);
  if (sourceRouteRegression) {
    const beatIndex = (profile?.noteMeta?.beatSources || []).findIndex(
      (source) => source?.kind === "profile-skill"
        && String(source.skill || "").toLocaleLowerCase("en-US") === sourceRouteRegression.skill.toLocaleLowerCase("en-US")
    );
    const qualityIds = [profile?.noteMeta?.signatureId, profile?.noteMeta?.supportingSignatureId];
    const selectedActionIds = Array.isArray(profile?.noteMeta?.actionIds) ? profile.noteMeta.actionIds : [];
    if (beatIndex < 0) {
      addIssue(
        issues,
        profileName,
        "source-route-regression",
        `${sourceRouteRegression.skill} must remain one of the two selected evidence beats`
      );
    } else if (
      qualityIds[beatIndex] !== sourceRouteRegression.qualityId
      || selectedActionIds[beatIndex] !== sourceRouteRegression.actionId
    ) {
      addIssue(
        issues,
        profileName,
        "source-route-regression",
        `${sourceRouteRegression.skill} must render as ${sourceRouteRegression.qualityId}/${sourceRouteRegression.actionId}`
      );
    }
  }

  const explicitSkillText = (profile.skills || []).join(" ").toLocaleLowerCase("en-US");
  const selectedSourceSkills = (profile?.noteMeta?.sourceSkills || [])
    .map((skill) => String(skill || "").trim().toLocaleLowerCase("en-US"));
  const selectedHas = (pattern) => selectedSourceSkills.some((skill) => pattern.test(skill));
  const signatureId = String(profile?.noteMeta?.signatureId || "");
  const actionIds = Array.isArray(profile?.noteMeta?.actionIds) ? profile.noteMeta.actionIds : [];
  const hasAerialBeat = signatureId === "aerial-reading"
    || actionIds.some((id) => ["meet-ball-early", "head-clear-early", "attack-dropping-ball"].includes(id));

  if (selectedHas(/aerial finish|heading finish|headed finish|aerial goals?/u) && !hasAerialBeat) {
    addIssue(issues, profileName, "source-semantic-drift", "selected aerial-finishing evidence must produce an aerial observation");
  }

  const selectedSetPieceNonTaker = selectedHas(
    /set.?piece (?:threat|strength|presence|attacks?|chaos|finishing|defending|defense|marking|toughness)/u
  );
  const selectedSetPieceTaker = selectedHas(
    /^(?:set pieces?|set.?piece (?:delivery|service|quality|touch|composure|range|power|taking|taker|technique|craft))$|dead-ball|free.?kick|corner/u
  );
  if (
    selectedSetPieceNonTaker
    && !selectedSetPieceTaker
    && (signatureId === "dead-ball-technique" || actionIds.includes("vary-delivery"))
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "set-piece target or defending evidence cannot be rendered as dead-ball delivery");
  }
  if (selectedSetPieceNonTaker && !hasAerialBeat) {
    addIssue(issues, profileName, "source-semantic-drift", "set-piece target or defending evidence must produce an aerial observation");
  }

  const selectedNonVersatility = selectedHas(/\b(?:depth|upside|potential|mobility)\b/u);
  const selectedTrueVersatility = selectedHas(/versatil|multi-role|multiple roles?|positional flexibility|utility/u);
  if (
    selectedNonVersatility
    && !selectedTrueVersatility
    && (signatureId === "role-flexibility" || actionIds.includes("simple-role-change"))
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "depth, upside, potential, and mobility cannot imply multi-role versatility");
  }
  if (selectedHas(/\b(?:depth|upside|potential)\b/u)) {
    addIssue(issues, profileName, "non-observable-source", "depth, upside, and potential tags must be skipped in favor of observable evidence or an honest role fallback");
  }
  if (selectedHas(/\b(?:midfield height|defensive midfield size)\b/u)) {
    addIssue(issues, profileName, "non-observable-source", "height and size labels alone must be skipped in favor of observable evidence or an honest role fallback");
  }

  const selectedLeadership = selectedHas(/leadership|organi[sz]|line control|communication|command|authority/u);
  const selectedPressLeadership = selectedHas(/press leadership|pressing leadership/u);
  if (
    profile?.noteMeta?.roleGroup === "midfielder"
    && selectedLeadership
    && signatureId !== "nearby-unit-organization"
    && !actionIds.includes("nearby-unit-cues")
    && !(selectedPressLeadership && (signatureId === "targeted-press" || actionIds.includes("press-angle")))
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "midfield leadership must coordinate the nearby unit rather than a defensive line");
  }
  if (
    profile?.noteMeta?.roleGroup === "forward"
    && selectedLeadership
    && signatureId !== "front-line-leadership"
    && !actionIds.includes("lead-first-pressure")
    && !(selectedPressLeadership && (signatureId === "targeted-press" || actionIds.includes("press-angle")))
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "forward leadership must coordinate the front line and first pressure");
  }
  if (
    ["midfielder", "forward"].includes(profile?.noteMeta?.roleGroup)
    && selectedLeadership
    && actionIds.includes("line-instructions")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "outfield leadership cannot use the goalkeeper or back-line instruction beat");
  }

  const selectedAttackingBackPost = selectedHas(/back-post (?:runs?|arrivals?|attacks?|movement)/u);
  if (
    selectedAttackingBackPost
    && signatureId !== "back-post-arrival"
    && !actionIds.includes("attack-back-post")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "attacking back-post evidence must produce a far-post arrival observation");
  }
  if (selectedAttackingBackPost && (signatureId === "runner-tracking" || actionIds.includes("check-runner"))) {
    addIssue(issues, profileName, "source-semantic-drift", "attacking back-post evidence cannot be rendered as defensive runner tracking");
  }

  if (
    selectedHas(/penalty composure|penalty taking|penalty technique/u)
    && signatureId !== "penalty-contact-calm"
    && !actionIds.includes("composed-penalty-strike")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "penalty composure must produce a calm penalty-contact observation");
  }
  if (
    selectedHas(/late (?:box |midfield |attacking )?(?:runs?|arrivals?)|late support(?: runs?)?|box arrivals?|midfield arrivals?/u)
    && profile?.noteMeta?.roleGroup !== "defender"
    && signatureId !== "delayed-run"
    && !actionIds.includes("late-box-arrival")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "late or box-arrival evidence must produce a delayed box-arrival observation");
  }
  if (
    profile?.noteMeta?.roleGroup === "forward"
    && selectedHas(/box presence|box target|aerial targets?(?: play)?|target[- ]forward(?: play| power)?|target[- ]man|target[- ]striker|target play|central target|physical target/u)
    && signatureId !== "physical-reference"
    && !actionIds.includes("pin-and-create")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "target-forward evidence must produce a physical reference-point observation");
  }
  if (
    selectedHas(/shot power|power shooting|shooting power|powerful shooting/u)
    && signatureId !== "long-shot-threat"
    && !actionIds.includes("open-distance-shot")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "shot-power evidence must produce a shooting observation");
  }
  if (
    profile?.noteMeta?.roleGroup === "defender"
    && selectedHas(/defensive power|duel power/u)
    && actionIds.includes("absorb-and-carry")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "defensive power cannot be rendered as an attacking carry");
  }
  if (
    selectedHas(/fouls? drawn|draw(?:ing)? fouls?|wins? fouls?/u)
    && signatureId !== "close-control-direction"
    && !actionIds.includes("carry-through-gap")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "fouls-drawn evidence must describe committing a defender while retaining control");
  }
  const selectedDefensiveCross = selectedHas(
    /cross (?:prevention|defen(?:ding|se)|blocking)|defen(?:ding|se) crosses?|stop.*cross|wide defending|right-back defending|left-back defending/u
  );
  const selectedAttackingCross = selectedSourceSkills.some((skill) => (
    /cross|service|delivery/u.test(skill)
    && !/cross (?:prevention|defen(?:ding|se)|blocking)|defen(?:ding|se) crosses?|stop.*cross|wide defending|right-back defending|left-back defending/u.test(skill)
  ));
  if (
    selectedDefensiveCross
    && signatureId !== "cross-angle-control"
    && !actionIds.includes("block-cross-angle")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "cross-defending evidence must describe closing or blocking the delivery angle");
  }
  if (
    selectedDefensiveCross
    && !selectedAttackingCross
    && (signatureId === "tight-space-delivery" || actionIds.includes("pick-cross-target"))
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "cross-defending evidence cannot be rendered as attacking cross delivery");
  }
  if (
    selectedHas(/chaos creation/u)
    && signatureId !== "purposeful-off-ball"
    && !actionIds.includes("offer-clear-target")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "chaos-creation evidence must describe disruptive movement rather than playmaking vision");
  }
  if (
    selectedHas(/chaos creation/u)
    && (signatureId === "see-decisive-pass" || actionIds.includes("draw-and-release"))
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "chaos creation alone cannot imply a decisive-pass observation");
  }
  const selectedTwoFootedFinishing = selectedHas(
    /two-footed finish|either-foot finish|both-footed finish|finish(?:ing)? with either foot/u
  );
  if (selectedTwoFootedFinishing && !actionIds.includes("finish-either-foot")) {
    addIssue(issues, profileName, "source-semantic-drift", "two-footed finishing must produce an either-foot finishing observation");
  }
  if (
    selectedTwoFootedFinishing
    && actionIds.some((id) => ["shoot-strong-foot", "shoot-left-foot", "shoot-right-foot"].includes(id))
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "two-footed finishing cannot be rendered as shifting onto one preferred foot");
  }
  if (
    selectedHas(/counter stopping|stopping counters?|counter[- ]attack defending|counter defen(?:se|ding)/u)
    && signatureId !== "protect-danger-space"
    && !actionIds.includes("hold-box-route")
    && !actionIds.includes("hold-midfield-lane")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "counter-stopping evidence must describe protecting the dangerous route until support arrives");
  }
  if (
    selectedHas(/one-(?:v-one|on-one) (?:attacks?|creation)/u)
    && signatureId !== "close-control-direction"
    && !actionIds.includes("carry-through-gap")
    && !actionIds.includes("change-pace")
    && !actionIds.includes("attack-channel-gap")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "one-on-one attacking evidence must produce an attacking take-on or separation beat");
  }
  if (
    selectedHas(/second[- ]ball work/u)
    && signatureId !== "second-ball-reaction"
    && !actionIds.includes("anticipate-second-ball")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "second-ball work must describe reacting to the loose second phase");
  }
  if (
    selectedHas(/box crashing|arriving runs?|box entries|attacking midfield runs?/u)
    && signatureId !== "delayed-run"
    && !actionIds.includes("late-box-arrival")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "box-entry evidence must describe a delayed arrival that is difficult to track");
  }
  if (
    selectedHas(/(?:left|right)[- ]wing scoring|second[- ]phase shots?|\bscoring\b|\bshots?\b/u)
    && !["goalkeeper", "defender"].includes(profile?.noteMeta?.roleGroup)
    && signatureId !== "clean-shot"
    && !["moving-finish", "first-time-finish", "shoot-strong-foot", "shoot-left-foot", "shoot-right-foot", "finish-either-foot", "open-distance-shot"].some((id) => actionIds.includes(id))
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "scoring and shot evidence must produce a finishing observation");
  }
  const selectedSupportRuns = selectedSourceSkills.some((skill) => (
    /support runs?/u.test(skill) && !/late support runs?/u.test(skill)
  ));
  if (
    selectedSupportRuns
    && profile?.noteMeta?.roleGroup === "defender"
    && signatureId !== "deep-attack-timing"
    && !actionIds.includes("overlap-timing")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "a defender's support runs must describe joining the attack from deep");
  }
  if (
    selectedSupportRuns
    && profile?.noteMeta?.roleGroup !== "defender"
    && signatureId !== "purposeful-off-ball"
    && !actionIds.includes("offer-clear-target")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "support runs must describe purposeful movement that gives the passer a target");
  }
  if (
    selectedHas(/long diagonals?|diagonal passing/u)
    && signatureId !== "passing-weight-angle"
    && !actionIds.includes("first-forward-lane")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "long-diagonal evidence must describe moving the defense with a forward pass");
  }
  const selectedGenericCreation = selectedSourceSkills.some((skill) => (
    /creativity|\bcreation\b|\bcraft\b/u.test(skill)
    && !/chaos creation|one-(?:v-one|on-one) creation|shot creation/u.test(skill)
    && !(profile?.noteMeta?.roleGroup === "defender" && /right-side creation/u.test(skill))
  ));
  if (
    selectedGenericCreation
    && signatureId !== "see-decisive-pass"
    && !actionIds.includes("draw-and-release")
  ) {
    addIssue(issues, profileName, "source-semantic-drift", "generic creation or craft evidence must describe creating the decisive pass");
  }
  if (
    profile?.noteMeta?.actionIds?.includes("overlap-timing")
    && !/\b(?:overlaps?|forward support|attacking support|box-area support|support runs?|wing-back timing|join(?:ing)? the attack|wide runs?|full-back runs?|attacking width|(?:full|right|left)-back (?:running|runs?|attacks?|support|thrust)|(?:left|right|wide)(?:-side)? support|direct running|direct wing running|transition runs?|left-side running|right-side run(?:ning|s)?|wing-back runs?|underlap runs?)\b/u.test(explicitSkillText)
  ) {
    addIssue(issues, profileName, "unsupported-action", "overlap action has no explicit attacking full-back skill evidence");
  }

  const group = roleGroup(profile);
  if (
    group === "goalkeeper"
    && /\b(?:shoots? with little backlift|releases? the runner|carries? through the gap|running beyond him|arrives? in the box|pins? a defender|attacks? the near-post lane)\b/i.test(note)
  ) {
    addIssue(issues, profileName, "note-role-mismatch", "goalkeeper note contains an outfield attacking action");
  }
  if (
    group !== "goalkeeper"
    && /\b(?:penalty taker's last movement|waits for the strike before committing|makes? the save|leaves? his line|claims? crosses|shot reveals its direction)\b/i.test(note)
  ) {
    addIssue(issues, profileName, "note-role-mismatch", "outfield note contains a goalkeeper action");
  }

  if (/[;]/.test(note)) {
    addIssue(issues, profileName, "punctuation", "avoid semicolons in player-card notes");
  }
  if (/[\u2013\u2014]/.test(note)) {
    addIssue(issues, profileName, "punctuation", "avoid en dash and em dash sentence structure");
  }

  const sentenceCount = splitSentences(note).length;
  const wordCount = countWords(note);
  if (sentenceCount < 2 || sentenceCount > 4) {
    addIssue(
      issues,
      profileName,
      "shape",
      `note has ${sentenceCount} sentences; carry three content beats in a natural 2-4 sentence shape`
    );
  }
  if (wordCount < MIN_NOTE_WORDS) {
    addIssue(
      issues,
      profileName,
      "substance",
      `note has ${wordCount} words; generic profile notes need at least ${MIN_NOTE_WORDS} words of substance`
    );
  }
  if (wordCount > MAX_NOTE_WORDS) {
    addIssue(issues, profileName, "length", `note has ${wordCount} words; keep it below ${MAX_NOTE_WORDS}`);
  }
  if (note.length > MAX_NOTE_CHARACTERS) {
    addIssue(issues, profileName, "length", `note is ${note.length} characters; keep it compact`);
  }

  if (noteZh) {
    const sentenceCountZh = splitSentences(noteZh).length;
    const readableCharactersZh = countReadableCharacters(noteZh);
    if (sentenceCountZh < 2 || sentenceCountZh > 4) {
      addIssue(
        issues,
        profileName,
        "shape-zh",
        `Chinese note has ${sentenceCountZh} sentences; carry the same beats in a natural 2-4 sentence shape`
      );
    }
    if (readableCharactersZh < MIN_NOTE_ZH_CHARACTERS) {
      addIssue(
        issues,
        profileName,
        "substance-zh",
        `Chinese note has ${readableCharactersZh} readable characters; expected at least ${MIN_NOTE_ZH_CHARACTERS}`
      );
    }
    if (noteZh.length > MAX_NOTE_ZH_CHARACTERS) {
      addIssue(issues, profileName, "length-zh", `Chinese note is ${noteZh.length} characters`);
    }
    if (/在在|靠在|何时第一脚触球时|如何传中前|他会无法|连人带球一起压上|抓住第一脚机会|同时也会|同时[^。！？]{0,48}同时/u.test(noteZh)) {
      addIssue(issues, profileName, "grammar-zh", "Chinese note contains a duplicated or malformed connective");
    }
  }

  const sentenceKeys = note
    .split(/[.!?]+/)
    .map((sentence) => sentence.toLowerCase().replace(/\b(?:he|also)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim())
    .filter(Boolean);
  if (new Set(sentenceKeys).size !== sentenceKeys.length) {
    addIssue(issues, profileName, "repeated-action", "note repeats the same explanation more than once");
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

  for (const check of liveStatCopyChecks) {
    if (check.pattern.test(note)) {
      addIssue(issues, profileName, "live-stat-copy", check.message);
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
    if (group === "goalkeeper" && /\b(?:finishing|runs in behind|pressing|wide threat|box presence|striker|winger|overlap|tackling)\b/i.test(skill)) {
      addIssue(issues, profileName, "skill-role-mismatch", `${skill}: goalkeeper skill chip looks like an outfield role`);
    }
    if (
      group !== "goalkeeper"
      && /\b(?:goalkeeper|keeper depth|shot.?stopping|reaction saves?|reflex saves?|one-on-one saves?|penalty saves?|cross handling|cross claiming|sweeper-keeper)\b/i.test(skill)
    ) {
      addIssue(issues, profileName, "skill-role-mismatch", `${skill}: outfield skill chip looks like a goalkeeper role`);
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
  .filter(([, profile]) => !teamIds.length || teamIds.includes(profile?.teamId));

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

for (const [profileName, profile] of profiles.filter(([, value]) => value?.noteMeta?.origin === "authored")) {
  const overrideData = await readJson(path.join("player-profile-overrides", "2026", `${profile.teamId}.json`));
  const overrideProfile = overrideData?.profiles?.[profileName];
  if (!overrideProfile) {
    addIssue(issues, profileName, "authored-override", "authored canonical note has no rebuild override");
    continue;
  }
  for (const field of ["note", "noteZh", "noteMeta"]) {
    if (JSON.stringify(overrideProfile[field]) !== JSON.stringify(profile[field])) {
      addIssue(issues, profileName, "authored-override", `authored ${field} differs between canonical data and rebuild override`);
    }
  }
}

const scopeLabel = teamIds.length
  ? teamIds.map((teamId) => teamsById.get(teamId)?.name || teamId).join(", ")
  : "all teams";

console.log(`Player-card note audit: ${profiles.length} profiles checked for ${scopeLabel}.`);
const corpusFailures = reportCorpusQuality(profiles);
for (const failure of corpusFailures) {
  addIssue(issues, "[corpus]", "copy-concentration", failure);
}

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
