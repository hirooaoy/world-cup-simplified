#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseGeneratedPlayerStyleNote } from "../locales/player-note-templates.js";
import { normalizePlayerName } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const args = process.argv.slice(2);
const unmatchedExplicitSkillProfiles = new Map();
const NOTE_GENERATOR_VERSION = "current-player-style-v6";
const PRESERVED_AUTHORED_PROFILES = new Set(["Kylian Mbappe", "Goncalo Ramos", "Lionel Messi"]);
const AUTHORED_COPY_ANCHORS = new Map([
  ["Kylian Mbappe", {
    note: "Mbappé's signature is explosive speed once open grass appears. Near goal, he shifts onto his stronger foot and shoots with little backlift. When defenders crowd him, he looks for the next pass instead of forcing a shot.",
    noteZh: "他的比赛方式建立在看到空当后的爆发速度上。接近球门时，他会把球调整到惯用脚，用很小的摆腿迅速完成射门。面对多人包夹时，他会寻找下一脚传球，而不是勉强射门。"
  }],
  ["Goncalo Ramos", {
    note: "Ramos is defined by creating a clean shot before the defense can reset. He arrives in the box late enough to be difficult to track. He angles his run to block the easy pass as he closes the ball.",
    noteZh: "拉莫斯的特点是在防线重组前制造干净射门。他会稍晚进入禁区，让盯防者难以持续跟住，也会在接近持球人时调整逼抢路线，同时封住最简单的传球。"
  }],
  ["Lionel Messi", {
    note: "Argentina's midfield rotations open space in the centre for Messi. He drops into it, draws defenders and switches play to the free side, then chooses his moment to join the move near the box. Without the ball, he stays high as the outlet.",
    noteZh: "阿根廷的中场轮转为梅西在中路腾出空间。他回撤到这里接球，吸引防守后把球转向空当一侧，再选择时机来到禁区附近接续进攻。无球时，他留在前场高位充当接应点。"
  }]
]);
const SURNAME_PARTICLES = new Set([
  "al",
  "ben",
  "bin",
  "da",
  "das",
  "de",
  "del",
  "della",
  "den",
  "der",
  "di",
  "dos",
  "du",
  "el",
  "la",
  "le",
  "mac",
  "st",
  "st.",
  "ten",
  "ter",
  "van",
  "von"
]);
const GENERATIONAL_SUFFIXES = new Set(["jr", "jr.", "junior", "júnior"]);
const KOREAN_FAMILY_NAMES = new Set([
  "bae", "cho", "eom", "hwang", "jo", "kim", "lee", "oh", "paik", "park", "seol", "son", "song", "yang"
]);

const QF_TEAMS_BY_EDITION = new Map([
  ["2026", new Set(["FRA", "MAR", "ESP", "BEL", "NOR", "ENG", "ARG", "SUI"])]
]);

const TEAM_NAME_ZH_BY_ID = new Map([
  ["ALG", "阿尔及利亚"],
  ["ARG", "阿根廷"],
  ["AUS", "澳大利亚"],
  ["AUT", "奥地利"],
  ["BEL", "比利时"],
  ["BIH", "波斯尼亚和黑塞哥维那"],
  ["BRA", "巴西"],
  ["CAN", "加拿大"],
  ["CIV", "科特迪瓦"],
  ["COD", "刚果民主共和国"],
  ["COL", "哥伦比亚"],
  ["CPV", "佛得角"],
  ["CRO", "克罗地亚"],
  ["CUW", "库拉索"],
  ["CZE", "捷克"],
  ["ECU", "厄瓜多尔"],
  ["EGY", "埃及"],
  ["ENG", "英格兰"],
  ["ESP", "西班牙"],
  ["FRA", "法国"],
  ["GER", "德国"],
  ["GHA", "加纳"],
  ["HAI", "海地"],
  ["IRN", "伊朗"],
  ["IRQ", "伊拉克"],
  ["JOR", "约旦"],
  ["JPN", "日本"],
  ["KOR", "韩国"],
  ["KSA", "沙特阿拉伯"],
  ["MAR", "摩洛哥"],
  ["MEX", "墨西哥"],
  ["NED", "荷兰"],
  ["NOR", "挪威"],
  ["NZL", "新西兰"],
  ["PAN", "巴拿马"],
  ["PAR", "巴拉圭"],
  ["POR", "葡萄牙"],
  ["QAT", "卡塔尔"],
  ["RSA", "南非"],
  ["SCO", "苏格兰"],
  ["SEN", "塞内加尔"],
  ["SUI", "瑞士"],
  ["SWE", "瑞典"],
  ["TUN", "突尼斯"],
  ["TUR", "土耳其"],
  ["URU", "乌拉圭"],
  ["USA", "美国"],
  ["UZB", "乌兹别克斯坦"]
]);

// These source records were polluted with page titles or malformed scraped text.
// Repair them every time notes are regenerated so the bad values cannot return.
const CANONICAL_DISPLAY_NAMES = new Map([
  ["Ali Nemati", "Ali Nemati"],
  ["Amirhossein Hosseinzadeh", "Amirhossein Hosseinzadeh"],
  ["Arya Yousefi", "Arya Yousefi"],
  ["Mehdi Ghayedi", "Mehdi Ghayedi"],
  ["Milad Mohammadi", "Milad Mohammadi"],
  ["Mohammad Ghorbani", "Mohammad Ghorbani"]
]);

function repairCanonicalDisplayNames(profilesData) {
  if (profileEdition !== "2026") {
    return 0;
  }

  let repaired = 0;
  for (const [profileName, displayName] of CANONICAL_DISPLAY_NAMES) {
    const profile = profilesData.profiles?.[profileName];
    if (!profile) {
      throw new Error(`Missing canonical player profile: ${profileName}`);
    }
    if (profile.displayName !== displayName) {
      profile.displayName = displayName;
      repaired += 1;
    }
  }
  return repaired;
}

function getArgValue(name) {
  const flag = `--${name}=`;
  const arg = args.find((item) => item.startsWith(flag));
  return arg ? arg.slice(flag.length) : "";
}

function hasArg(name) {
  return args.includes(`--${name}`) || args.some((item) => item.startsWith(`--${name}=`));
}

function normalizeProfileEdition(value) {
  const raw = String(value || "").trim();
  const year = raw.match(/\b(?:19|20)\d{2}\b/)?.[0];
  return year || raw || "2026";
}

function countNoteSentences(value) {
  return String(value || "")
    .replace(/\b(?:Jr|St)\./gu, (match) => match.slice(0, -1))
    .split(/[.!?。！？]+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .length;
}

const BASELINE_ONE_LINE_NOTE_PATTERNS = [
  /\bcurrent World Cup squad pool\b/i,
  /\b(?:goalkeeping|defensive|wide defensive|between-lines|wide attacking|forward|midfield|match-plan) option, useful for\b/i,
  /(?:世界杯阵容|比赛计划|阵容人选|球队选择|可用人选)/u
];

function isClearlyBaselineOneLineNote(value, fact) {
  const note = String(value || "").replace(/\s+/g, " ").trim();
  if (!note || countNoteSentences(note) !== 1 || note.length > 180) {
    return false;
  }
  if (BASELINE_ONE_LINE_NOTE_PATTERNS.some((pattern) => pattern.test(note))) {
    return true;
  }
  return (fact?.keyMentions || []).some(
    (mention) => String(mention?.note || "").replace(/\s+/g, " ").trim() === note
  );
}

function noteCanBeUpgraded(value, fact) {
  const note = String(value || "").trim();
  return !note || isClearlyBaselineOneLineNote(note, fact);
}

function skillsCanBeUpgraded(value) {
  return !Array.isArray(value) ||
    !value.length ||
    (value.length === 1 && /^match impact$/i.test(String(value[0] || "").trim()));
}

const profileEdition = normalizeProfileEdition(
  getArgValue("profile-edition") ||
    getArgValue("edition") ||
    process.env.PROFILE_EDITION ||
    "2026"
);
const overrideDir = path.join(dataDir, "player-profile-overrides", profileEdition);

function teamNameZh(teamId, fallback = "") {
  return TEAM_NAME_ZH_BY_ID.get(String(teamId || "").toUpperCase()) || String(fallback || "").trim() || "球队";
}

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function getNameKey(value) {
  return normalizePlayerName(value);
}

function getPlayerAliases(profileName, profile = {}) {
  return [
    profileName,
    profile?.name,
    profile?.displayName,
    ...(Array.isArray(profile?.aliases) ? profile.aliases : [])
  ].filter((value) => typeof value === "string" && value.trim());
}

function shortName(profileName, profile = {}) {
  const display = String(profile?.displayName || profile?.name || profileName || "").trim();
  if (!display) {
    return "This player";
  }
  const parts = display.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return parts[0] || display;
  }
  const firstToken = parts[0].toLocaleLowerCase("en-US").replace(/[.,]$/, "");
  if (
    String(profile?.teamId || "").toUpperCase() === "KOR"
    && KOREAN_FAMILY_NAMES.has(firstToken)
    && /-/.test(parts[1] || "")
  ) {
    return parts[0].replace(/[.,]$/, "");
  }

  let surnameEnd = parts.length;
  while (
    surnameEnd > 1
    && GENERATIONAL_SUFFIXES.has(parts[surnameEnd - 1].toLocaleLowerCase("en-US").replace(/,$/, ""))
  ) {
    surnameEnd -= 1;
  }
  let surnameStart = surnameEnd - 1;
  while (
    surnameStart > 0
    && SURNAME_PARTICLES.has(parts[surnameStart - 1].toLocaleLowerCase("en-US").replace(/[.,]$/, ""))
  ) {
    const particle = parts[surnameStart - 1].toLocaleLowerCase("en-US").replace(/,$/, "");
    if (surnameStart - 1 === 0 && ["ben", "el", "mac", "st", "st."].includes(particle)) break;
    surnameStart -= 1;
  }
  return parts.slice(surnameStart, surnameEnd).join(" ").replace(/[.,]$/, "");
}

function isGoalkeeper(profile = {}) {
  return /\bgoalkeeper\b|\bGK\b/i.test(profile.position || "");
}

function roleGroup(profile = {}, usage) {
  if (isGoalkeeper(profile)) return "goalkeeper";

  const profilePosition = String(profile.position || "");
  const primaryProfilePosition = profilePosition.split(/[,/;]/)[0].trim();
  const usagePositionText = usage?.positions ? [...usage.positions.keys()].join(" ") : "";
  const defenderPattern = /\b(?:centre[- ]back|center[- ]back|defender|full[- ]back|right[- ]back|left[- ]back|wing[- ]back|CB|RB|LB|RWB|LWB)\b/i;
  const midfielderPattern = /\b(?:midfielder|midfield|defensive midfielder|central midfielder|attacking midfielder|CM|DM|AM|RM|LM)\b/i;
  const forwardPattern = /\b(?:forward|striker|winger|centre-forward|center-forward|ST|RW|LW)\b/i;

  if (defenderPattern.test(primaryProfilePosition)) {
    return "defender";
  }
  if (midfielderPattern.test(primaryProfilePosition)) {
    return "midfielder";
  }
  if (forwardPattern.test(primaryProfilePosition)) {
    return "forward";
  }

  if (defenderPattern.test(profilePosition)) return "defender";
  if (midfielderPattern.test(profilePosition)) return "midfielder";
  if (forwardPattern.test(profilePosition)) return "forward";

  if (defenderPattern.test(usagePositionText)) {
    return "defender";
  }
  if (midfielderPattern.test(usagePositionText)) {
    return "midfielder";
  }
  if (forwardPattern.test(usagePositionText)) {
    return "forward";
  }
  return "player";
}

function noteHasObviousRoleMismatch(note, group) {
  const value = String(note || "").toLocaleLowerCase("en-US");
  if (!value) return false;
  if (group === "goalkeeper") {
    return /\b(?:shoots? with little backlift|releases? the runner|carries? through the gap|running beyond him|arrives? in the box|pins? a defender|moves? through the gap between full-back|attacks? the near-post lane)\b/u.test(value);
  }
  return /\b(?:penalty taker's last movement|waits for the strike before committing|makes? the save|leaves? his line|claims? crosses|goal kicks?|sweeper-keeper|shot reveals its direction)\b/u.test(value);
}

function hasSubstantiveEnglishNote(value) {
  const note = String(value || "").trim();
  const words = note.match(/[\p{Letter}\p{Number}]+(?:[’'-][\p{Letter}\p{Number}]+)*/gu) || [];
  const sentences = countNoteSentences(note);
  return sentences >= 2 && sentences <= 4 && words.length >= 24 && words.length <= 65;
}

function hasSubstantiveChineseNote(value) {
  const note = String(value || "").trim();
  const readableCharacters = note.match(/[\p{Letter}\p{Number}]/gu) || [];
  const sentences = countNoteSentences(note);
  return sentences >= 2 && sentences <= 4 && readableCharacters.length >= 36 && note.length <= 190;
}

function effectiveAuthoredCopy(profileName, profile, overrideProfile) {
  const anchor = AUTHORED_COPY_ANCHORS.get(profileName);
  if (anchor) return { ...anchor, noteMeta: overrideProfile?.noteMeta || profile?.noteMeta };
  return {
    note: overrideProfile?.note ?? profile?.note,
    noteZh: overrideProfile?.noteZh ?? profile?.noteZh,
    noteMeta: overrideProfile?.noteMeta || profile?.noteMeta
  };
}

function shouldPreserveAuthoredCopy(profileName, profile, overrideProfile, fact) {
  const metadata = overrideProfile?.noteMeta || profile?.noteMeta || {};
  const explicitlyAuthored = metadata.origin === "authored" || PRESERVED_AUTHORED_PROFILES.has(profileName);
  if (!explicitlyAuthored) return false;
  const { note, noteZh } = effectiveAuthoredCopy(profileName, profile, overrideProfile);
  return hasSubstantiveEnglishNote(note)
    && hasSubstantiveChineseNote(noteZh)
    && !noteHasObviousRoleMismatch(note, roleGroup(profile, fact));
}

function increment(map, key, amount = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + amount);
}

function sideFromPosition(position = "") {
  const compact = String(position || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (["RW", "RM", "RB", "RWB"].includes(compact)) return "right";
  if (["LW", "LM", "LB", "LWB"].includes(compact)) return "left";
  if (["AM", "CM", "DM", "ST", "GK", "CB"].includes(compact)) return "central";
  return "";
}

function sideFromX(x) {
  const value = Number(x);
  if (!Number.isFinite(value)) return "";
  if (value <= 42) return "left";
  if (value >= 58) return "right";
  return "central";
}

function getUsageSide(player = {}) {
  return sideFromPosition(player.position) || sideFromX(player.x);
}

function getUsageKey(teamId, playerName) {
  const nameKey = getNameKey(playerName);
  return teamId && nameKey ? `${teamId}:${nameKey}` : "";
}

function orderedCounts(map) {
  return [...(map || new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function topCount(map) {
  return orderedCounts(map)[0]?.[0] || "";
}

function buildProfileIndex(profilesData) {
  const index = new Map();
  for (const [profileName, profile] of Object.entries(profilesData.profiles || {})) {
    const teamId = profile?.teamId;
    if (!teamId) continue;
    for (const alias of getPlayerAliases(profileName, profile)) {
      const key = getUsageKey(teamId, alias);
      if (key && !index.has(key)) {
        index.set(key, profileName);
      }
    }
  }
  return index;
}

function findProfileName(profileIndex, teamId, playerName) {
  return profileIndex.get(getUsageKey(teamId, playerName)) || "";
}

function buildFacts({ fixturesData, lineupsData, profilesData, teamsById }) {
  const profileIndex = buildProfileIndex(profilesData);
  const facts = new Map();
  const ensure = (teamId, profileName) => {
    const key = getUsageKey(teamId, profileName);
    const profile = profilesData.profiles?.[profileName] || {};
    if (!facts.has(key)) {
      facts.set(key, {
        teamId,
        teamName: teamsById.get(teamId)?.name || teamId,
        profileName,
        appearances: 0,
        starts: 0,
        positions: new Map(),
        sides: new Map(),
        goals: [],
        assists: [],
        keyMentions: [],
        storyMentions: [],
        substitutionsOn: 0,
        substitutionsOff: 0,
        role: roleGroup(profile)
      });
    }
    return facts.get(key);
  };

  for (const [profileName, profile] of Object.entries(profilesData.profiles || {})) {
    if (profile?.teamId) {
      ensure(profile.teamId, profileName);
    }
  }

  const fixturesById = new Map((fixturesData.fixtures || []).map((fixture) => [fixture.id, fixture]));

  for (const [matchId, lineup] of Object.entries(lineupsData.lineups || {})) {
    const fixture = fixturesById.get(matchId);
    if (!fixture) continue;
    for (const side of ["home", "away"]) {
      const teamId = side === "home" ? fixture.homeTeamId : fixture.awayTeamId;
      const players = Array.isArray(lineup?.[side]?.players) ? lineup[side].players : [];
      for (const player of players) {
        const profileName = findProfileName(profileIndex, teamId, player?.name);
        if (!profileName) continue;
        const fact = ensure(teamId, profileName);
        fact.appearances += 1;
        fact.starts += 1;
        increment(fact.positions, player.position);
        increment(fact.sides, getUsageSide(player));
      }

      for (const sub of lineup?.[side]?.events?.substitutions || []) {
        const onProfile = findProfileName(profileIndex, teamId, sub?.onName);
        if (onProfile) {
          const fact = ensure(teamId, onProfile);
          fact.substitutionsOn += 1;
          fact.appearances += fact.starts ? 0 : 1;
        }
        const offProfile = findProfileName(profileIndex, teamId, sub?.offName);
        if (offProfile) {
          ensure(teamId, offProfile).substitutionsOff += 1;
        }
      }
    }
  }

  for (const fixture of fixturesData.fixtures || []) {
    const teamForSide = { home: fixture.homeTeamId, away: fixture.awayTeamId };
    for (const side of ["home", "away"]) {
      const teamId = teamForSide[side];
      for (const player of fixture.keyPlayers?.[side] || []) {
        const profileName = findProfileName(profileIndex, teamId, player?.name);
        if (profileName) {
          ensure(teamId, profileName).keyMentions.push({
            fixtureId: fixture.id,
            opponentId: side === "home" ? fixture.awayTeamId : fixture.homeTeamId,
            note: player.note || ""
          });
        }
      }
    }

    for (const [side, goals] of [
      ["home", fixture.goalsHome || []],
      ["away", fixture.goalsAway || []]
    ]) {
      const scoringTeamId = teamForSide[side];
      const opponentId = side === "home" ? fixture.awayTeamId : fixture.homeTeamId;
      for (const goal of goals) {
        if (!goal?.ownGoal) {
          const scorerProfile = findProfileName(profileIndex, scoringTeamId, goal?.name);
          if (scorerProfile) {
            ensure(scoringTeamId, scorerProfile).goals.push({
              fixtureId: fixture.id,
              opponentId,
              minute: goal.minute,
              penalty: Boolean(goal.penalty)
            });
          }
        }
        const assistProfile = findProfileName(profileIndex, scoringTeamId, goal?.assistName);
        if (assistProfile) {
          ensure(scoringTeamId, assistProfile).assists.push({
            fixtureId: fixture.id,
            opponentId,
            minute: goal.minute
          });
        }
      }
    }

    const storyText = (fixture.resultStoryBullets || []).join(" ");
    if (storyText) {
      for (const [profileName, profile] of Object.entries(profilesData.profiles || {})) {
        if (profile?.teamId !== fixture.homeTeamId && profile?.teamId !== fixture.awayTeamId) continue;
        const aliases = getPlayerAliases(profileName, profile);
        if (aliases.some((alias) => new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i").test(storyText))) {
          ensure(profile.teamId, profileName).storyMentions.push({ fixtureId: fixture.id, text: storyText });
        }
      }
    }
  }

  return facts;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanSkill(skill) {
  return String(skill || "")
    .replace(/\bCutback creation\b/gi, "Pulled-back passes")
    .replace(/\bCutback threat\b/gi, "Pulled-back passes")
    .replace(/\bCutback service\b/gi, "Pulled-back passes")
    .replace(/\bCutbacks?\b/gi, "Pulled-back passes")
    .replace(/\bHalf-space\b/gi, "Inside-channel")
    .replace(/\bFinal-third\b/gi, "Box-area")
    .replace(/\bbyline\b/gi, "end line")
    .replace(/\s+/g, " ")
    .trim();
}

function isKeeperSpecificSkill(skill) {
  const value = cleanSkill(skill).toLocaleLowerCase("en-US");
  return /\b(?:goalkeeper|keeper|shot.?stopp|reaction saves?|reflex saves?|one-on-one saves?|penalty saves?|cross handling|cross claiming|area control|box command|calm restarts|quick restarts|goal kicks?|sweeper)\b/u.test(value);
}

function isClearlyOutfieldSkill(skill) {
  const value = cleanSkill(skill).toLocaleLowerCase("en-US");
  return /\b(?:finishing|goal threat|striker|winger|overlap|tackl|ball winning|pressing|channel runs?|box arrivals?|wide defending|centre-back|right-back|left-back)\b/u.test(value);
}

function isSkillCompatibleWithRole(skill, group) {
  if (group === "goalkeeper") return !isClearlyOutfieldSkill(skill);
  if (group !== "player") return !isKeeperSpecificSkill(skill);
  return true;
}

function roleSkills(profile, fact) {
  const group = roleGroup(profile, fact);
  const position = topCount(fact?.positions || new Map());
  if (group === "goalkeeper") {
    return ["Calm restarts", "Shot stopping", "Box command"];
  }
  if (group === "defender") {
    if (/\b(?:RB|RWB|right[- ]back)\b/i.test(position || profile.position || "")) return ["Wide defending", "Recovery runs", "Duel timing"];
    if (/\b(?:LB|LWB|left[- ]back)\b/i.test(position || profile.position || "")) return ["Wide defending", "Recovery runs", "Duel timing"];
    return ["Duel timing", "Box defending", "First pass"];
  }
  if (group === "midfielder") {
    if (/AM|attacking/i.test(position || profile.position || "")) return ["Pocket receiving", "Chance passes", "Late runs"];
    if (/DM|defensive/i.test(position || profile.position || "")) return ["Midfield cover", "First pass", "Second balls"];
    return ["Midfield carrying", "Pressure passing", "Second balls"];
  }
  if (group === "forward") {
    if (/\b(?:winger|RW|LW)\b/i.test(position || profile.position || "")) return ["Direct running", "One-on-one pressure", "Box-area service"];
    return ["Box movement", "Pressing runs", "Quick finishing"];
  }
  return ["Tournament role", "Match rhythm", "Pressure moments"];
}

function nextSkills(profile, fact) {
  const group = roleGroup(profile, fact);
  const existing = Array.isArray(profile.skills)
    ? profile.skills.map(cleanSkill).filter((skill) => skill && isSkillCompatibleWithRole(skill, group))
    : [];
  const base = [...existing, ...roleSkills(profile, fact)];
  return [...new Set(base)]
    .filter((skill) => !/^match impact$/i.test(skill))
    .slice(0, 3);
}

function positionLabel(profile, fact) {
  const raw = String(profile.position || topCount(fact?.positions) || "player")
    .replace(/[;/]+/g, ",")
    .split(/[,/]/)[0]
    .replace(/\bdefensive midfield\b/i, "defensive midfielder")
    .replace(/\bcentral midfield\b/i, "central midfielder")
    .replace(/\bcentre forward\b/i, "centre-forward")
    .replace(/\bcentre back\b/i, "centre-back")
    .replace(/\bcenter back\b/i, "center-back")
    .replace(/\bright back\b/i, "right-back")
    .replace(/\bleft back\b/i, "left-back")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const claimedSide = /\bright\b/.test(raw) ? "right" : /\bleft\b/.test(raw) ? "left" : "";
  if (claimedSide && fact?.appearances && (fact.sides.get(claimedSide) || 0) / fact.appearances < 0.5) {
    const group = roleGroup(profile, fact);
    if (group === "defender") return "defender";
    if (group === "midfielder") return "midfielder";
    if (group === "forward") return "forward";
  }
  return raw || "player";
}

const QUALITY_IDS = new Map(Object.entries({
  "creating a clean shot before the defense can reset": "clean-shot",
  "protecting the most dangerous space before stepping to the ball": "protect-danger-space",
  "seeing the decisive pass one beat before it opens": "see-decisive-pass",
  "creating a better angle for the next pass": "create-pass-angle",
  "sharp reactions backed by early positioning": "early-position-reactions",
  "protecting the centre of goal before reacting to the finish": "centre-first-positioning",
  "controlling where the ball goes when a clean catch is not available": "rebound-control",
  "keeping his body shape compact for reflex saves at close range": "compact-reflex-shape",
  "the flexibility to fill different roles without breaking the team's shape": "role-flexibility",
  "choosing the moment of contact instead of diving in": "duel-timing",
  "explosive speed once open grass appears": "open-grass-speed",
  "changing direction without losing control of the ball": "close-control-direction",
  "making the safer decision before a duel becomes an emergency": "safe-defensive-decision",
  "making purposeful movement away from the ball": "purposeful-off-ball",
  "staying ready through long quiet spells": "long-focus",
  "pressing with a clear target rather than simply chasing": "targeted-press",
  "keeping the ball calm when pressure arrives": "pressure-composure",
  "moving the defense with the weight and angle of his passing": "passing-weight-angle",
  "organizing teammates before danger becomes obvious": "early-organization",
  "calm decisions shaped by experience in high-pressure moments": "experience-calm",
  "recovery speed when the defensive line is exposed": "recovery-speed",
  "using strength without slowing the next action": "strength-continuity",
  "starting his run while defenders are still watching the ball": "early-run",
  "reading the flight of the ball before the duel begins": "aerial-reading",
  "waiting for a defender's attention to shift before moving": "delayed-run",
  "recovering position without panicking after the first line is broken": "calm-recovery",
  "delivering the ball without needing much space": "tight-space-delivery",
  "making the next teammate's action easier": "help-next-action",
  "giving centre-backs a physical problem they cannot ignore": "physical-reference",
  "reading the next phase before the space fully opens": "read-next-phase",
  "receiving in tight spaces with his next action already planned": "planned-tight-receive",
  "choosing the moment to join an attack from deep": "deep-attack-timing",
  "staying balanced until the shot reveals its direction": "goalkeeper-balance",
  "carrying momentum through open midfield": "open-midfield-carry",
  "turning a save into the first pass of an attack": "save-starts-attack",
  "repeatable technique on dead balls": "dead-ball-technique",
  "starting high enough to protect the space behind his defense": "high-starting-position",
  "the patience to read a penalty taker's last movement": "penalty-reading",
  "staying connected to runners when the ball moves elsewhere": "runner-tracking",
  "command of the crowded space around goal": "crowded-goal-command",
  "the timing of his run across the nearest defender": "near-post-timing",
  "making defenders respect the shot from outside the box": "long-shot-threat",
  "closing the crossing angle without losing the runner": "cross-angle-control",
  "reacting first when a duel leaves the ball free": "second-ball-reaction",
  "organizing the nearby unit before the next phase begins": "nearby-unit-organization",
  "giving the front line a clear cue for when to move and press": "front-line-leadership",
  "arriving at the far side after defenders have narrowed toward the ball": "back-post-arrival",
  "keeping his penalty strike repeatable under pressure": "penalty-contact-calm",
  "using his left foot as a passing outlet": "left-foot-passing",
  "hiding the intended pass until the final moment": "disguised-passing",
  "finding a runner with a pulled-back pass": "pullback-creation",
  "keeping possession moving with the available pass": "passing-continuity",
  "returning to wide areas to provide repeated deliveries": "crossing-volume",
  "carrying the ball directly at an isolated defender": "one-on-one-running",
  "protecting the centre before the shooter reveals the finish": "shot-stopping-readiness",
  "dealing with aerial balls in his defensive area": "aerial-defending",
  "taking an active role in the team's pressure": "pressing-work",
  "taking responsibility for attacking dead-ball deliveries": "set-piece-responsibility",
  "looking for the pass that can create the next chance": "chance-passing",
  "moving possession forward with the ball at his feet": "ball-carrying",
  "advancing the ball while direct pressure stays close": "dribbling-control",
  "providing service from wide areas": "wide-service",
  "getting into positions where the next pass can become a shot": "goal-threat-positioning",
  "preparing to finish when the ball reaches him near goal": "finishing-readiness",
  "using his speed when the route ahead opens": "pace-in-space",
  "competing for aerial balls": "aerial-duels",
  "using his strength in direct contact": "strength-in-contact",
  "finding an available outlet after regaining possession": "goalkeeper-distribution"
}));

const ACTION_IDS = new Map(Object.entries({
  "meets the ball early instead of waiting underneath it": "meet-ball-early",
  "plays through nearby pressure instead of around it": "play-through-pressure",
  "uses his first touch to escape pressure before choosing the pass": "first-touch-escape",
  "moves after releasing the ball so the receiver still has support": "move-after-release",
  "shifts onto his stronger foot and shoots with little backlift": "shoot-strong-foot",
  "holds the route into the box until support arrives": "hold-box-route",
  "angles his run to block the easy pass as he closes the ball": "press-angle",
  "turns early and protects the route toward goal": "protect-goal-route",
  "waits for a loose touch and then steps through the ball": "win-loose-touch",
  "moves through the gap between full-back and centre-back": "attack-channel-gap",
  "varies the height and pace of his delivery": "vary-delivery",
  "draws a defender in and releases the runner behind him": "draw-and-release",
  "draws the first challenge, then carries through the gap": "carry-through-gap",
  "changes his position early enough to give the passer a clear target": "offer-clear-target",
  "leaves his line only with a clear route to take pressure off his defenders": "claim-timing",
  "changes pace after the defender has committed his feet": "change-pace",
  "waits until the wide defender looks inside before running beyond him": "overlap-timing",
  "sets his feet before the shot and reacts without an extra step": "set-and-react",
  "holds the central lane until the attacker's touch reveals the angle": "hold-central-goal-lane",
  "pushes the save away from the next runner instead of back into traffic": "parry-away-danger",
  "keeps his hands and feet connected so the reflex block stays controlled": "controlled-reflex-block",
  "attacks the cross at the highest point he can control before traffic closes": "claim-cross-high",
  "protects the ball with his body and returns it into a runner's path": "body-and-return",
  "looks up before crossing and picks a runner rather than an empty area": "pick-cross-target",
  "chooses the simple restart before pressure can close in": "simple-restart",
  "protects the route to goal and challenges only when the touch is loose": "protect-then-challenge",
  "arrives in the box late enough to be difficult to track": "late-box-arrival",
  "holds the passing lane into midfield until support arrives": "hold-midfield-lane",
  "keeps the line connected with constant small instructions": "line-instructions",
  "turns early and closes the runner before the box": "recover-before-box",
  "changes position while keeping his priorities simple": "simple-role-change",
  "slows the play to restore control and takes the risk once the opening is clear": "manage-tempo-risk",
  "opens his body on the first touch so he can play forward": "open-body-forward",
  "absorbs contact and keeps the ball close enough to continue forward": "absorb-and-carry",
  "pins a defender and creates room for the next runner": "pin-and-create",
  "adjusts his position early enough to make the difficult action look simple": "early-position-adjustment",
  "checks the runner over his shoulder before the final pass arrives": "check-runner",
  "positions himself for the next touch before the first contest is over": "anticipate-second-ball",
  "keeps his feet active and makes the save with the fewest movements": "economical-save",
  "attacks the near-post lane before the marker can turn": "near-post-run",
  "waits for the strike before committing": "penalty-wait",
  "leaves his line early when a through ball escapes the back line": "sweeper-exit",
  "shifts onto his left foot and shoots with little backlift": "shoot-left-foot",
  "shifts onto his right foot and shoots with little backlift": "shoot-right-foot",
  "keeps his decisions calm when a sudden save is required": "sudden-save-calm",
  "pushes the ball beyond the first challenge and accelerates after it": "push-and-accelerate",
  "gets close enough to block the delivery without diving in": "block-cross-angle",
  "uses a clean first touch to open a shooting lane from distance": "open-distance-shot",
  "meets the pass without adding an extra touch": "first-time-finish",
  "arrives balanced and finishes before the nearest defender can recover": "moving-finish",
  "steps toward the flight and heads clear before the forward can set himself": "head-clear-early",
  "starts outside his marker and attacks the dropping ball": "attack-dropping-ball",
  "takes the first available forward lane before it closes": "first-forward-lane",
  "uses short cues to keep nearby passing and pressing options connected": "nearby-unit-cues",
  "sets the first pressure and directs the next runner toward the easy pass": "lead-first-pressure",
  "holds the far-post lane, then attacks it as the cross leaves the passer": "attack-back-post",
  "shortens his approach, stays balanced and strikes without rushing": "composed-penalty-strike",
  "positions the ball to finish with either foot before the defender can reset": "finish-either-foot",
  "plays the available pass with his left foot": "pass-with-left-foot",
  "shapes toward one option before releasing the ball into another lane": "hide-pass-intent",
  "pulls the ball back from near the end line toward a supporting runner": "pull-ball-back",
  "moves the ball to the next available teammate without holding it": "play-available-pass",
  "gets into position to send another ball toward the penalty area": "repeat-wide-delivery",
  "runs at the defender in front of him with the ball under control": "run-at-isolated-defender",
  "sets his angle early and holds the centre until the ball leaves the foot": "set-for-shot",
  "moves toward the dropping ball and contests it before the attacker can settle": "contest-aerial-ball",
  "moves toward the ball as teammates close the nearby options": "join-team-pressure",
  "serves corners and free kicks into the attacking area": "deliver-dead-ball",
  "plays forward toward an available runner when the opening appears": "play-to-available-runner",
  "carries into the available space before releasing the ball": "carry-into-space",
  "keeps the ball close while moving under pressure": "carry-under-pressure",
  "sends the ball into the attacking area from a wide position": "send-wide-delivery",
  "moves into a position where an available pass can lead to a shot": "move-into-shot-position",
  "sets himself to shoot when the ball reaches him near goal": "set-for-finish",
  "accelerates when the route ahead opens": "accelerate-into-space",
  "holds his position through contact before continuing the play": "hold-through-contact",
  "restarts play toward an available teammate": "restart-to-teammate"
}));

function semanticId(map, phrase, label) {
  const id = map.get(phrase);
  if (!id) throw new Error(`Missing ${label} semantic ID for generated phrase: ${phrase}`);
  return id;
}

function skillInsight(skill, group, profileName = "") {
  const value = cleanSkill(skill).toLowerCase();
  if (!isSkillCompatibleWithRole(skill, group)) return null;
  if (
    group === "defender"
    && /\b(?:goal threat|finishing|striker movement|box movement|box arrivals?|chance passes?|chance creation|inside shooting|quick shooting)\b/u.test(value)
  ) {
    return null;
  }
  if (/\b(?:depth|upside|potential)\b/u.test(value)) {
    return null;
  }
  if (/\b(?:midfield height|defensive midfield size)\b/u.test(value)) {
    return null;
  }
  const insight = (quality, action, qualityZh, actionZh) => ({
    quality,
    action,
    qualityZh,
    actionZh,
    qualityId: semanticId(QUALITY_IDS, quality, "quality"),
    actionId: semanticId(ACTION_IDS, action, "action")
  });

  // A broad skill label can support a broad, visible responsibility. It cannot
  // establish the exact body mechanics, timing trigger, or decision rule used
  // by the more detailed mappings below.
  if (value === "left-footed passing") {
    return insight("using his left foot as a passing outlet", "plays the available pass with his left foot", "把左脚作为传球出口", "用左脚送出眼前可行的传球");
  }
  if (value === "disguised passing") {
    return insight("hiding the intended pass until the final moment", "shapes toward one option before releasing the ball into another lane", "把传球意图隐藏到最后一刻", "身体先朝向一个选项，再把球送入另一条线路");
  }
  if (value === "pulled-back passes") {
    return insight("finding a runner with a pulled-back pass", "pulls the ball back from near the end line toward a supporting runner", "用回传球寻找后排接应者", "接近底线后把球回传给后排接应的队友");
  }
  if (/^(?:short|calm|simple) passing$/u.test(value)) {
    return insight("keeping possession moving with the available pass", "moves the ball to the next available teammate without holding it", "用眼前可行的传球保持球权流动", "不拖延持球，把球交给下一名可接应的队友");
  }
  if (/^(?:passing|distribution)$/u.test(value)) {
    if (group === "goalkeeper") {
      return insight("finding an available outlet after regaining possession", "restarts play toward an available teammate", "重新获得球权后寻找可用的出球点", "把球重新交给可以接应的队友");
    }
    return insight("keeping possession moving with the available pass", "moves the ball to the next available teammate without holding it", "用眼前可行的传球保持球权流动", "不拖延持球，把球交给下一名可接应的队友");
  }
  if (value === "crossing volume") {
    return insight("returning to wide areas to provide repeated deliveries", "gets into position to send another ball toward the penalty area", "反复回到边路提供传中", "再次到达可传中的位置，把球送向禁区");
  }
  if (value === "elite striker movement") {
    return insight("making purposeful movement away from the ball", "changes his position early enough to give the passer a clear target", "有目的地进行无球移动", "提前调整位置，为持球队友提供清晰目标");
  }
  if (value === "one-on-one running") {
    return insight("carrying the ball directly at an isolated defender", "runs at the defender in front of him with the ball under control", "直接带球冲击单独面对他的防守者", "控住球后主动冲向身前的防守者");
  }
  if (value === "shot stopping" && group === "goalkeeper") {
    return insight("protecting the centre before the shooter reveals the finish", "sets his angle early and holds the centre until the ball leaves the foot", "在射手暴露射门方向前先守住球门中央", "提前调整封堵角度，在球离脚前始终封住中央线路");
  }
  if (value === "aerial defending" && group !== "goalkeeper") {
    return insight("dealing with aerial balls in his defensive area", "moves toward the dropping ball and contests it before the attacker can settle", "处理防守区域内的高空球", "迎向落下的球，在进攻者站稳前参与争抢");
  }
  if (value === "pressing" && group !== "goalkeeper") {
    return insight("taking an active role in the team's pressure", "moves toward the ball as teammates close the nearby options", "积极参与球队的整体逼抢", "队友封住附近选项时向球靠近施压");
  }
  if (value === "set-piece delivery" && group !== "goalkeeper") {
    return insight("taking responsibility for attacking dead-ball deliveries", "serves corners and free kicks into the attacking area", "负责进攻定位球的输送", "把角球和任意球送入进攻区域");
  }
  if (/^(?:chance passes?|final pass)$/u.test(value) && group !== "goalkeeper") {
    return insight("looking for the pass that can create the next chance", "plays forward toward an available runner when the opening appears", "寻找能够创造下一次机会的传球", "线路出现时向前送给可接应的跑动者");
  }
  if (value === "ball carrying" && group !== "goalkeeper") {
    return insight("moving possession forward with the ball at his feet", "carries into the available space before releasing the ball", "用脚下带球把球权向前推进", "先带入眼前空当，再把球交出去");
  }
  if (value === "dribbling" && group !== "goalkeeper") {
    return insight("advancing the ball while direct pressure stays close", "keeps the ball close while moving under pressure", "在近身压力下继续带球推进", "受压移动时仍把球控制在身边");
  }
  if (value === "crossing" && group !== "goalkeeper") {
    return insight("providing service from wide areas", "sends the ball into the attacking area from a wide position", "从边路提供传中", "在边路位置把球送入进攻区域");
  }
  if (value === "goal threat" && group !== "goalkeeper") {
    return insight("getting into positions where the next pass can become a shot", "moves into a position where an available pass can lead to a shot", "进入下一脚传球可以转化为射门的位置", "移动到接球后可以形成射门的位置");
  }
  if (value === "finishing" && group !== "goalkeeper") {
    return insight("preparing to finish when the ball reaches him near goal", "sets himself to shoot when the ball reaches him near goal", "在球来到门前时做好终结准备", "门前接到球时调整好身体准备射门");
  }
  if (/^(?:pace|speed)$/u.test(value)) {
    return insight("using his speed when the route ahead opens", "accelerates when the route ahead opens", "在前方线路打开时利用速度", "前方线路出现时立即加速");
  }
  if (/^aerial duels?$/u.test(value) && group !== "goalkeeper") {
    return insight("competing for aerial balls", "moves toward the dropping ball and contests it before the attacker can settle", "参与高空球争抢", "迎向落下的球，在对手站稳前参与争抢");
  }
  if (/^(?:power|strength)$/u.test(value) && group !== "goalkeeper") {
    return insight("using his strength in direct contact", "holds his position through contact before continuing the play", "在直接对抗中利用力量", "承受接触后保持位置，再继续处理球");
  }
  if (/^(?:composure|control|experience|command|leadership|movement)$/u.test(value)) {
    return null;
  }

  if (group === "goalkeeper" && /penalt(?:y|ies).*(?:save|stop)|(?:save|stop).*penalt/.test(value)) {
    return insight("the patience to read a penalty taker's last movement", "waits for the strike before committing", "耐心判断点球手最后一下动作", "等到对方触球前再做扑救选择");
  }
  if (/reflex|quick saves?/.test(value) && group === "goalkeeper") {
    return insight("keeping his body shape compact for reflex saves at close range", "keeps his hands and feet connected so the reflex block stays controlled", "近距离反应扑救时保持紧凑身体姿态", "让手脚保持联动，使本能挡球也能控制方向");
  }
  if (/reaction/.test(value) && group === "goalkeeper") {
    return insight("sharp reactions backed by early positioning", "sets his feet before the shot and reacts without an extra step", "提前站位后的快速反应", "在射门前站稳脚步，再用最少动作完成扑救");
  }
  if (/one-on-one sav|close-range sav|low saves?|reach/.test(value) && group === "goalkeeper") {
    return insight("staying balanced until the shot reveals its direction", "keeps his feet active and makes the save with the fewest movements", "在射门方向明确前保持身体平衡", "保持脚下轻快，用最少动作完成扑救");
  }
  if (/shot.?stop|line saves?/.test(value) && group === "goalkeeper") {
    return insight("protecting the centre before the shooter reveals the finish", "sets his angle early and holds the centre until the ball leaves the foot", "在射手暴露射门方向前先守住球门中央", "提前调整封堵角度，在球离脚前始终封住中央线路");
  }
  if (/cross.*(?:claim|handl)|claim.*cross|high balls?/.test(value) && group === "goalkeeper") {
    return insight("command of the crowded space around goal", "attacks the cross at the highest point he can control before traffic closes", "掌控门前拥挤空间的能力", "在人群合拢前迎向传中，并在最高可控点处理来球");
  }
  if (/cross.*command|box command|penalty-area command|set-piece control/.test(value) && group === "goalkeeper") {
    return insight("command of the crowded space around goal", "leaves his line only with a clear route to take pressure off his defenders", "掌控门前拥挤空间的能力", "判断何时出击，替后卫化解高球压力");
  }
  if (/distribution|restart|throwing|goal kicks?|keeper passing|short build-up|long distribution/.test(value) && group === "goalkeeper") {
    return insight("turning a save into the first pass of an attack", "chooses the simple restart before pressure can close in", "把一次扑救变成进攻第一传", "在逼抢靠近前选择最稳妥的出球方式");
  }
  if (/build[- ]?up passing|clean distribution|simple distribution/.test(value) && group === "goalkeeper") {
    return insight("turning a save into the first pass of an attack", "chooses the simple restart before pressure can close in", "把一次扑救变成进攻第一传", "在逼抢靠近前选择最稳妥的出球方式");
  }
  if (/sweeper|high starting|outside.*box/.test(value) && group === "goalkeeper") {
    return insight("starting high enough to protect the space behind his defense", "leaves his line early when a through ball escapes the back line", "用靠前站位保护后防身后空间", "在直塞球越过后防时及时出击");
  }
  if (/goalkeeper experience|veteran goalkeeping|tournament calm/.test(value)) {
    return insight("staying ready through long quiet spells", "keeps his decisions calm when a sudden save is required", "在长时间无事可做后依然保持专注", "在突然需要扑救时仍能冷静判断");
  }
  if (group === "goalkeeper" && /big-game calm|game management|tournament composure/.test(value)) {
    return insight("staying ready through long quiet spells", "keeps his decisions calm when a sudden save is required", "在长时间无事可做后依然保持专注", "在突然需要扑救时仍能冷静判断");
  }
  if (group === "goalkeeper" && /penalty (?:presence|moments)/.test(value)) {
    return insight("the patience to read a penalty taker's last movement", "waits for the strike before committing", "耐心判断点球手最后一下动作", "等到对方触球前再做扑救选择");
  }
  if (group === "goalkeeper" && /area control|penalty-area (?:bravery|control|calm|confidence|presence)|box (?:bravery|confidence|control|steadiness)/.test(value)) {
    return insight("command of the crowded space around goal", "leaves his line only with a clear route to take pressure off his defenders", "掌控门前拥挤空间的能力", "判断何时出击，替后卫化解高球压力");
  }
  if (group === "goalkeeper") {
    if (/leadership|organi[sz]|communication|command|authority|captain goalkeeping|back-line voice/.test(value)) {
      return insight("organizing teammates before danger becomes obvious", "keeps the line connected with constant small instructions", "在危险出现前组织好队友", "用持续而简短的提醒保持整条防线连接");
    }
    return null;
  }
  if (/set.?piece (?:threat|strength|presence|attacks?|chaos|finishing)/.test(value)) {
    const action = group === "forward"
      ? "starts outside his marker and attacks the dropping ball"
      : "meets the ball early instead of waiting underneath it";
    const actionZh = group === "forward"
      ? "从盯防者外侧启动，主动攻击落点"
      : "主动在最合适的高点迎球，而不是站在原地等球落下";
    return insight("reading the flight of the ball before the duel begins", action, "在争顶前先判断球的飞行轨迹", actionZh);
  }
  if (/set.?piece (?:defending|defense|marking|toughness)/.test(value)) {
    return insight("reading the flight of the ball before the duel begins", "steps toward the flight and heads clear before the forward can set himself", "在争顶前先判断球的飞行轨迹", "迎向来球，在前锋站稳前头球解围");
  }
  if (/set.?piece (?:support|edge)/.test(value)) {
    return null;
  }
  if (/^(?:set pieces?|set.?piece (?:delivery|service|quality|touch|composure|range|power|taking|taker|technique|craft))$/u.test(value) || /dead-ball|free.?kick|corner/.test(value)) {
    return insight("repeatable technique on dead balls", "varies the height and pace of his delivery", "定位球上稳定而多变的脚法", "通过改变落点和球速寻找防线最薄弱的区域");
  }
  if (/back-post (?:runs?|arrivals?|attacks?|movement)/.test(value)) {
    return insight("arriving at the far side after defenders have narrowed toward the ball", "holds the far-post lane, then attacks it as the cross leaves the passer", "等防守者向球侧收缩后再到达后点", "先留在后点线路，等传中离脚后再启动攻击落点");
  }
  if (/back-post (?:cover|defending|coverage|discipline|marking|timing)/.test(value)) {
    return insight("staying connected to runners when the ball moves elsewhere", "checks the runner over his shoulder before the final pass arrives", "球转移到别处时仍能跟住无球跑动", "在最后一传到来前回头确认跑动者的位置");
  }
  if (/near.?post/.test(value) && group !== "defender") {
    return insight("the timing of his run across the nearest defender", "attacks the near-post lane before the marker can turn", "抢到近门柱身前的跑动时机", "在盯防者转身前冲向近门柱线路");
  }
  if (group !== "goalkeeper" && /penalty composure|penalty taking|penalty technique/.test(value)) {
    return insight("keeping his penalty strike repeatable under pressure", "shortens his approach, stays balanced and strikes without rushing", "在点球压力下仍保持可重复的触球动作", "缩短助跑，稳住身体后从容击球");
  }
  if (group !== "defender" && /late (?:box |midfield |attacking )?(?:runs?|arrivals?)|late support(?: runs?)?|box arrivals?|midfield arrivals?/.test(value)) {
    return insight("waiting for a defender's attention to shift before moving", "arrives in the box late enough to be difficult to track", "等防守者注意力转移后再启动", "稍晚进入禁区，让盯防者难以持续跟住");
  }
  if (group !== "defender" && /penalty[- ]?(?:box|area) (?:timing|runs?|movement)|box timing|striker movement|box movement/.test(value)) {
    return insight("waiting for a defender's attention to shift before moving", "arrives in the box late enough to be difficult to track", "等防守者注意力转移后再启动", "稍晚进入禁区，让盯防者难以持续跟住");
  }
  if (group !== "goalkeeper" && /box crashing|arriving runs?|box entries|attacking midfield runs?/.test(value)) {
    return insight("waiting for a defender's attention to shift before moving", "arrives in the box late enough to be difficult to track", "等防守者注意力转移后再启动", "稍晚进入禁区，让盯防者难以持续跟住");
  }
  if (group !== "goalkeeper" && /box attacks?|late box support|late surges?|penalty-box support|box-to-box (?:runs?|surges?)/.test(value)) {
    return insight("waiting for a defender's attention to shift before moving", "arrives in the box late enough to be difficult to track", "等防守者注意力转移后再启动", "稍晚进入禁区，让盯防者难以持续跟住");
  }
  if (group === "forward" && /penalty-box instincts?|box instincts?/.test(value)) {
    return insight("creating a clean shot before the defense can reset", "arrives balanced and finishes before the nearest defender can recover", "在防线重组前制造干净射门", "保持身体平衡，在最近防守者回位前完成射门");
  }
  if (group === "forward" && /box presence|box target|aerial targets?(?: play)?|target[- ]forward(?: play| power)?|target[- ]man|target[- ]striker|target play|central target|physical target/.test(value)) {
    return insight("giving centre-backs a physical problem they cannot ignore", "pins a defender and creates room for the next runner", "让中后卫无法忽视的身体支点作用", "牵制一名后卫，为后插上的队友腾出空间");
  }
  if (group !== "defender" && /aerial finish|heading finish|headed finish|aerial goals?/.test(value)) {
    return insight("reading the flight of the ball before the duel begins", "starts outside his marker and attacks the dropping ball", "在争顶前先判断球的飞行轨迹", "从盯防者外侧启动，主动攻击落点");
  }
  if (group !== "defender" && /long.?range|long shooting|shooting range|distance shooting|box-edge shots?/.test(value)) {
    return insight("making defenders respect the shot from outside the box", "uses a clean first touch to open a shooting lane from distance", "让防守者必须提防禁区外远射", "用干净的第一脚触球打开远射线路");
  }
  if (group !== "defender" && /shot power|power shooting|shooting power|powerful shooting/.test(value)) {
    return insight("making defenders respect the shot from outside the box", "uses a clean first touch to open a shooting lane from distance", "让防守者必须提防禁区外远射", "用干净的第一脚触球打开远射线路");
  }
  if (group !== "defender" && /second[- ]phase shots?/.test(value)) {
    return insight("reacting first when a duel leaves the ball free", "meets the pass without adding an extra touch", "对抗后球权松动时的第一反应", "迎球直接完成射门，不增加调整触球");
  }
  if (group !== "defender" && /first-time finish|first-time shots?|quick finish/.test(value)) {
    return insight("creating a clean shot before the defense can reset", "meets the pass without adding an extra touch", "在防线重组前制造干净射门", "迎球直接完成射门，不增加调整触球");
  }
  if (group !== "defender" && /box finish|penalty[- ]?(?:box|area) finish|finishing instinct/.test(value)) {
    return insight("creating a clean shot before the defense can reset", "arrives balanced and finishes before the nearest defender can recover", "在防线重组前制造干净射门", "保持身体平衡，在最近防守者回位前完成射门");
  }
  if (group !== "defender" && /two-footed finish|either-foot finish|both-footed finish|finish(?:ing)? with either foot/.test(value)) {
    return insight("creating a clean shot before the defense can reset", "positions the ball to finish with either foot before the defender can reset", "在防线重组前制造干净射门", "把球放到左右脚都能直接射门的位置，在防守者重组前完成射门");
  }
  if (group !== "defender" && /(?:left|right)[- ]wing scoring|\bscoring\b|\bshots?\b/.test(value)) {
    return insight("creating a clean shot before the defense can reset", "arrives balanced and finishes before the nearest defender can recover", "在防线重组前制造干净射门", "保持身体平衡，在最近防守者回位前完成射门");
  }
  if (group !== "defender" && /left-footed finish|right-footed finish|inside finish|wide finish|finishing|goal threat|inside shooting|quick shooting|shooting/.test(value)) {
    const foot = /left-foot/.test(value) ? "left foot" : /right-foot/.test(value) ? "right foot" : "stronger foot";
    const footZh = /left-foot/.test(value) ? "左脚" : /right-foot/.test(value) ? "右脚" : "惯用脚";
    return insight("creating a clean shot before the defense can reset", `shifts onto his ${foot} and shoots with little backlift`, "在防线重组前制造干净射门", `把球调整到${footZh}，用很小的摆腿迅速完成射门`);
  }
  if (/chaos creation/.test(value)) {
    return insight("making purposeful movement away from the ball", "changes his position early enough to give the passer a clear target", "有目的地进行无球移动", "提前调整位置，为持球队友提供清晰目标");
  }
  if (/one-(?:v-one|on-one) (?:attacks?|creation)/.test(value)) {
    return insight("changing direction without losing control of the ball", "draws the first challenge, then carries through the gap", "变向时仍把球控制在脚下", "主动吸引第一次上抢，再带球穿过由此出现的空当");
  }
  if (group !== "defender" && /creative (?:midfield|forward|wing)(?: play)?/.test(value)) {
    return insight("seeing the decisive pass one beat before it opens", "draws a defender in and releases the runner behind him", "比防线早一步看到决定性的传球", "先吸引防守者靠近，再把球送到其身后的跑动线路");
  }
  if (group !== "defender" && /chance pass|chance creat|creative pass|final pass|final ball|through ball|playmak|vision|assist|invention|creativity|\bcreation\b|\bcraft\b/.test(value)) {
    return insight("seeing the decisive pass one beat before it opens", "draws a defender in and releases the runner behind him", "比防线早一步看到决定性的传球", "先吸引防守者靠近，再把球送到其身后的跑动线路");
  }
  if (
    /overlap|wing-back timing|forward support|box-area support/.test(value)
    || (group === "defender" && /support runs?|attacking support|(?:left|right|wide)(?:-side)? support|(?:left|right|full|wing)[- ]back (?:runs?|attacks?|support|thrust)|attacking (?:full|right|left)[- ]backs?/.test(value))
  ) {
    return insight("choosing the moment to join an attack from deep", "waits until the wide defender looks inside before running beyond him", "从后场加入进攻的启动时机", "等边路防守者看向内侧后再从外线套上");
  }
  if (group !== "defender" && /support runs?/.test(value)) {
    return insight("making purposeful movement away from the ball", "changes his position early enough to give the passer a clear target", "有目的地进行无球移动", "提前调整位置，为持球队友提供清晰目标");
  }
  if (/underlap support|inverted support|left-side overloads|right-side creation/.test(value)) {
    return insight("choosing the moment to join an attack from deep", "changes his position early enough to give the passer a clear target", "从后场加入进攻的启动时机", "提前调整位置，为持球队友提供清晰目标");
  }
  if (/counter(?:attack)? support|counter outlet|transition outlet|direct outlet|wide outlet|right-wing outlet/.test(value)) {
    return insight("making purposeful movement away from the ball", "changes his position early enough to give the passer a clear target", "有目的地进行无球移动", "提前调整位置，为持球队友提供清晰目标");
  }
  if (/support angles?/.test(value)) {
    return insight("creating a better angle for the next pass", "moves after releasing the ball so the receiver still has support", "为下一脚传球制造更好的角度", "出球后继续移动，让接球队友始终有支援");
  }
  if (/cross (?:prevention|defen(?:ding|se)|blocking)|defen(?:ding|se) crosses?|stop.*cross|wide defending|right-back defending|left-back defending/.test(value)) {
    return insight("closing the crossing angle without losing the runner", "gets close enough to block the delivery without diving in", "封住传中角度时仍不丢掉跑动者", "靠近到能封堵传中，但不贸然出脚");
  }
  if (/cross|service|delivery/.test(value)) {
    return insight("delivering the ball without needing much space", "looks up before crossing and picks a runner rather than an empty area", "在很小空间里也能送出传中的能力", "在传中前先观察，再把球送向具体跑动者");
  }
  if (/fouls? drawn|draw(?:ing)? fouls?|wins? fouls?/.test(value)) {
    return insight("changing direction without losing control of the ball", "draws the first challenge, then carries through the gap", "变向时仍把球控制在脚下", "主动吸引第一次上抢，再带球穿过由此出现的空当");
  }
  if (/counter stopping|stopping counters?|counter[- ]attack defending|counter defen(?:se|ding)/.test(value)) {
    return insight("protecting the most dangerous space before stepping to the ball", "holds the route into the box until support arrives", "在上抢前先保护最危险的空间", "先守住通往禁区的路线，等队友支援到位");
  }
  if (/carry-and-shoot threat|goal-minded carries/.test(value)) {
    return insight("making defenders respect the shot from outside the box", "uses a clean first touch to open a shooting lane from distance", "让防守者必须提防禁区外远射", "用干净的第一脚触球打开远射线路");
  }
  if (/midfield carr|central (?:ball )?carr|forward carr|transition carr|box-to-box carr|forward surges?/.test(value)) {
    return insight("carrying momentum through open midfield", "pushes the ball beyond the first challenge and accelerates after it", "带球穿过开放中场的推进力", "把球趟过第一道上抢后再加速");
  }
  if (/one-on-one dribbling|creative dribbling/.test(value)) {
    return insight("changing direction without losing control of the ball", "changes pace after the defender has committed his feet", "变向时仍把球控制在脚下", "等防守者脚步固定后突然变速");
  }
  if (/tight-space dribbling|between-lines dribbling/.test(value)) {
    return insight("changing direction without losing control of the ball", "uses his first touch to escape pressure before choosing the pass", "变向时仍把球控制在脚下", "在第一脚触球时先摆脱压力，再选择传球方向");
  }
  if (/inside cuts?|cut-ins?|wing isolation|quick feet/.test(value)) {
    return insight("changing direction without losing control of the ball", "changes pace after the defender has committed his feet", "变向时仍把球控制在脚下", "等防守者脚步固定后突然变速");
  }
  if (/dribbl|\b(?:carry|carries|carrying)\b|direct carr|progressive carr|close control|tight-space|take-ons?|flair/.test(value)) {
    return insight("changing direction without losing control of the ball", "draws the first challenge, then carries through the gap", "变向时仍把球控制在脚下", "主动吸引第一次上抢，再带球穿过由此出现的空当");
  }
  if (group === "midfielder" && /midfield carr|central carr|forward carr|box-to-box (?:range|running|control)|forward surges?/.test(value)) {
    return insight("carrying momentum through open midfield", "pushes the ball beyond the first challenge and accelerates after it", "带球穿过开放中场的推进力", "把球趟过第一道上抢后再加速");
  }
  if (group !== "defender" && /run.*behind|channel run|counter run|transition run|inside run|diagonal run|vertical run|forward run|wide-to-inside|forward movement|late run|box arrival|arrival|off-ball|movement/.test(value)) {
    return insight("starting his run while defenders are still watching the ball", "moves through the gap between full-back and centre-back", "在防守者仍盯着球时提前启动", "从边后卫与中后卫之间的空当穿过");
  }
  if (group !== "defender" && /midfield running|midfield legs|midfield engine|two-way running|second-striker runs?|third-man runs?|link runs?|direct runs?|wing runs?|left-side runs?|one-on-one running/.test(value)) {
    return insight("making purposeful movement away from the ball", "changes his position early enough to give the passer a clear target", "有目的地进行无球移动", "提前调整位置，为持球队友提供清晰目标");
  }
  if (group === "defender" && /direct running|direct wing running|transition runs?|left-side running|right-side running|right-side runs?|wing-back runs?|underlap runs?/.test(value)) {
    return insight("choosing the moment to join an attack from deep", "waits until the wide defender looks inside before running beyond him", "从后场加入进攻的启动时机", "等边路防守者看向内侧后再从外线套上");
  }
  if (group === "forward" && /direct running|wide running/.test(value)) {
    return insight("starting his run while defenders are still watching the ball", "moves through the gap between full-back and centre-back", "在防守者仍盯着球时提前启动", "从边后卫与中后卫之间的空当穿过");
  }
  if (/acceleration|pace|speed|counter threat|transition (?:threat|terror)|burst|explosive/.test(value)) {
    if (/wing pace|attacking pace|forward pace/.test(value)) {
      return insight("explosive speed once open grass appears", "changes pace after the defender has committed his feet", "看到空当后的爆发速度", "等防守者脚步固定后突然变速");
    }
    if (group === "defender") return insight("recovery speed when the defensive line is exposed", "turns early and closes the runner before the box", "防线暴露后的回追速度", "提前转身，在对手进入禁区前缩短距离");
    if (group === "midfielder") return insight("carrying momentum through open midfield", "pushes the ball beyond the first challenge and accelerates after it", "带球穿过开放中场的推进力", "把球趟过第一道上抢后再加速");
    return insight("explosive speed once open grass appears", "changes pace after the defender has committed his feet", "看到空当后的爆发速度", "等防守者脚步固定后突然变速");
  }
  if (!/press resistance/.test(value) && /one-on-one pressure|counter-press|\bpressing\b|\bpress\b|work rate|defensive work|intensity|energy/.test(value)) {
    return insight("pressing with a clear target rather than simply chasing", "angles his run to block the easy pass as he closes the ball", "带着明确目标逼抢，而不是只追着球跑", "在接近持球人时调整路线，同时封住最简单的传球");
  }
  if (group !== "defender" && /hold-up|forward linking|link play|combination|quick combinations|wall pass/.test(value)) {
    return insight("making the next teammate's action easier", "protects the ball with his body and returns it into a runner's path", "让队友下一步处理更轻松", "用身体护住球，再把球送回跑动队友的线路");
  }
  if (/aerial|heading|headers?|high-ball/.test(value)) {
    if (group === "defender") {
      if (/defend|clear|box|penalty-area|mark|cover/.test(value)) {
        return insight("reading the flight of the ball before the duel begins", "steps toward the flight and heads clear before the forward can set himself", "在争顶前先判断球的飞行轨迹", "迎向来球，在前锋站稳前头球解围");
      }
      return insight("reading the flight of the ball before the duel begins", "meets the ball early instead of waiting underneath it", "在争顶前先判断球的飞行轨迹", "主动在最合适的高点迎球，而不是站在原地等球落下");
    }
    if (group === "forward") {
      return insight("reading the flight of the ball before the duel begins", "starts outside his marker and attacks the dropping ball", "在争顶前先判断球的飞行轨迹", "从盯防者外侧启动，主动攻击落点");
    }
    return insight("reading the flight of the ball before the duel begins", "meets the ball early instead of waiting underneath it", "在争顶前先判断球的飞行轨迹", "主动在最合适的高点迎球，而不是站在原地等球落下");
  }
  if (/recover/.test(value)) {
    return insight("recovering position without panicking after the first line is broken", "turns early and protects the route toward goal", "第一道防线被突破后仍能冷静回位", "提前转身，优先封住通向球门的路线");
  }
  if (/aerial cover/.test(value)) {
    return insight("reading the flight of the ball before the duel begins", "meets the ball early instead of waiting underneath it", "在争顶前先判断球的飞行轨迹", "主动在最合适的高点迎球，而不是站在原地等球落下");
  }
  if (/one-on-one defend|isolated defend|stand-up defend/.test(value)) {
    return insight("choosing the moment of contact instead of diving in", "waits for a loose touch and then steps through the ball", "选择身体接触时机，而不是贸然上抢", "等对手触球稍大后果断上抢");
  }
  if (group === "defender" && /(?:right|left|full)[- ]back cover|wide cover/.test(value)) {
    return insight("staying connected to runners when the ball moves elsewhere", "checks the runner over his shoulder before the final pass arrives", "球转移到别处时仍能跟住无球跑动", "在最后一传到来前回头确认跑动者的位置");
  }
  if (group === "defender" && /centre-back cover|center-back cover|central cover|defensive cover|back-three cover/.test(value)) {
    return insight("making the safer decision before a duel becomes an emergency", "protects the route to goal and challenges only when the touch is loose", "在对抗变成险情前做出更安全的选择", "先封住通向球门的路线，再等待对手触球失误时上抢");
  }
  if (/track|mark/.test(value)) {
    return insight("staying connected to runners when the ball moves elsewhere", "checks the runner over his shoulder before the final pass arrives", "球转移到别处时仍能跟住无球跑动", "在最后一传到来前回头确认跑动者的位置");
  }
  if (/duel|tackl|ball[- ]winning|intercept|aggress|combative|bite/.test(value)) {
    return insight("choosing the moment of contact instead of diving in", "waits for a loose touch and then steps through the ball", "选择身体接触时机，而不是贸然上抢", "等对手触球稍大后果断上抢");
  }
  if (/second[- ]balls?|loose ball/.test(value)) {
    return insight("reacting first when a duel leaves the ball free", "positions himself for the next touch before the first contest is over", "对抗后球权松动时的第一反应", "在第一次争抢还没结束时，就先为下一脚触球站好位置");
  }
  if (/defend|cover|clear|block|screen|protect|discipline|compact/.test(value)) {
    const area = group === "midfielder" ? "the passing lane into midfield" : "the route into the box";
    const areaZh = group === "midfielder" ? "通向中场核心区域的传球线路" : "进入禁区的路线";
    return insight("protecting the most dangerous space before stepping to the ball", `holds ${area} until support arrives`, "先保护最危险空间，再考虑上抢", `守住${areaZh}，直到队友能对持球人施压`);
  }
  if (/holding midfield|defensive balance|back-line balance|line holding/.test(value)) {
    const area = group === "midfielder" ? "the passing lane into midfield" : "the route into the box";
    const areaZh = group === "midfielder" ? "通向中场核心区域的传球线路" : "进入禁区的路线";
    return insight("protecting the most dangerous space before stepping to the ball", `holds ${area} until support arrives`, "先保护最危险空间，再考虑上抢", `守住${areaZh}，直到队友能对持球人施压`);
  }
  if (group !== "defender" && /between-lines|pocket|receiv|first touch|turns?|interior/.test(value)) {
    return insight("receiving in tight spaces with his next action already planned", "opens his body on the first touch so he can play forward", "在狭小空间接球前就想好下一步", "在第一脚触球时打开身体，准备向前处理");
  }
  if (/tempo|rhythm|press resistance|pressure escape|circulation|short pass|simple pass|possession|ball retention|control|calm|composure|security/.test(value)) {
    return insight("keeping the ball calm when pressure arrives", "uses his first touch to escape pressure before choosing the pass", "压力到来时仍能让球保持稳定", "在第一脚触球时先摆脱压力，再选择传球方向");
  }
  if (/long diagonals?|diagonal passing/.test(value)) {
    return insight("moving the defense with the weight and angle of his passing", "takes the first available forward lane before it closes", "用传球的力度和角度移动防线", "在向前线路关闭前及时送出传球");
  }
  if (/line breaking|simple exits?|safe outlets?|clean distribution|simple distribution|ball-playing centre-back|(?:left-footed |left-sided )?centre-back play/.test(value)) {
    return insight("moving the defense with the weight and angle of his passing", "takes the first available forward lane before it closes", "用传球的力度和角度移动防线", "在向前线路关闭前及时送出传球");
  }
  if (/pass|progression|build[- ]?up|switching|range|first-pass|distribution/.test(value)) {
    if (/forward pass|progressi|vertical|line-breaking|through pass/.test(value)) {
      return insight("moving the defense with the weight and angle of his passing", "takes the first available forward lane before it closes", "用传球的力度和角度移动防线", "在向前线路关闭前及时送出传球");
    }
    return insight("moving the defense with the weight and angle of his passing", "plays through nearby pressure instead of around it", "用传球的力度和角度移动防线", "穿过最近一层逼抢，而不总是绕开压力");
  }
  if (/leadership|organi[sz]|line control|communication|command|authority/.test(value)) {
    if (group === "midfielder") {
      return insight("organizing the nearby unit before the next phase begins", "uses short cues to keep nearby passing and pressing options connected", "在下一阶段开始前组织身边队友", "用简短提醒让附近的传球与逼抢选择保持连接");
    }
    if (group === "forward") {
      return insight("giving the front line a clear cue for when to move and press", "sets the first pressure and directs the next runner toward the easy pass", "为前场队友明确何时移动和逼抢", "带头启动第一道逼抢，再指挥下一名队友封向最简单的传球");
    }
    return insight("organizing teammates before danger becomes obvious", "keeps the line connected with constant small instructions", "在危险出现前组织好队友", "用持续而简短的提醒保持整条防线连接");
  }
  if (/attacking link|midfield linking|forward linking/.test(value)) {
    return insight("making the next teammate's action easier", "protects the ball with his body and returns it into a runner's path", "让队友下一步处理更轻松", "用身体护住球，再把球送回跑动队友的线路");
  }
  if (/intelligen|awareness|reading|decision|timing|positioning|tactical|anticipat/.test(value)) {
    return insight("reading the next phase before the space fully opens", "adjusts his position early enough to make the difficult action look simple", "在空当完全出现前读懂下一阶段", "提前调整位置，让困难处理看起来简单");
  }
  if (/mobility/.test(value)) {
    if (group === "defender") {
      return insight("recovering position without panicking after the first line is broken", "turns early and protects the route toward goal", "第一道防线被突破后仍能冷静回位", "提前转身，优先封住通向球门的路线");
    }
    if (group === "midfielder") {
      return insight("carrying momentum through open midfield", "pushes the ball beyond the first challenge and accelerates after it", "带球穿过开放中场的推进力", "把球趟过第一道上抢后再加速");
    }
    return insight("making purposeful movement away from the ball", "changes his position early enough to give the passer a clear target", "用有目的的无球移动创造接应点", "提前改变位置，为传球队友提供清晰目标");
  }
  if (/versatil|multi-role|multiple roles?|positional flexibility|utility/.test(value)) {
    return insight("the flexibility to fill different roles without breaking the team's shape", "changes position while keeping his priorities simple", "在多个角色之间切换时仍保持球队结构", "改变起始位置，但始终坚持清晰简单的处理原则");
  }
  if (group === "defender" && /defensive power|duel power/.test(value)) {
    return insight("choosing the moment of contact instead of diving in", "waits for a loose touch and then steps through the ball", "选择身体接触时机，而不是贸然上抢", "等对手触球稍大后果断上抢");
  }
  if (/power|strength|physical/.test(value)) {
    return insight("using strength without slowing the next action", "absorbs contact and keeps the ball close enough to continue forward", "在对抗中用力量但不拖慢下一步", "承受身体接触后仍把球留在可继续推进的位置");
  }
  if (/tournament experience|veteran|experience|big-game calm|tournament composure|game management/.test(value)) {
    return insight("calm decisions shaped by experience in high-pressure moments", "slows the play to restore control and takes the risk once the opening is clear", "高压时刻由经验带来的冷静判断", "判断何时放慢节奏，何时承担风险");
  }

  return null;
}

for (const role of ["goalkeeper", "defender", "midfielder", "forward", "player"]) {
  if (skillInsight("Unrecognized evidence sentinel", role, "Sentinel") !== null) {
    throw new Error(`Unrecognized skill tags must not receive a ${role} role default.`);
  }
}

const SKILL_ROUTE_REGRESSIONS = [
  ["Left-footed passing", "midfielder", "left-foot-passing", "pass-with-left-foot"],
  ["Disguised passing", "midfielder", "disguised-passing", "hide-pass-intent"],
  ["Pulled-back passes", "forward", "pullback-creation", "pull-ball-back"],
  ["Short passing", "midfielder", "passing-continuity", "play-available-pass"],
  ["Calm passing", "midfielder", "passing-continuity", "play-available-pass"],
  ["Simple passing", "midfielder", "passing-continuity", "play-available-pass"],
  ["Crossing volume", "defender", "crossing-volume", "repeat-wide-delivery"],
  ["Elite striker movement", "forward", "purposeful-off-ball", "offer-clear-target"],
  ["One-on-one running", "forward", "one-on-one-running", "run-at-isolated-defender"],
  ["Shot stopping", "goalkeeper", "shot-stopping-readiness", "set-for-shot"],
  ["Aerial defending", "defender", "aerial-defending", "contest-aerial-ball"],
  ["Pressing", "midfielder", "pressing-work", "join-team-pressure"],
  ["Set-piece delivery", "forward", "set-piece-responsibility", "deliver-dead-ball"],
  ["Chance passes", "forward", "chance-passing", "play-to-available-runner"],
  ["Final pass", "midfielder", "chance-passing", "play-to-available-runner"],
  ["Ball carrying", "midfielder", "ball-carrying", "carry-into-space"],
  ["Dribbling", "forward", "dribbling-control", "carry-under-pressure"],
  ["Crossing", "defender", "wide-service", "send-wide-delivery"],
  ["Goal threat", "forward", "goal-threat-positioning", "move-into-shot-position"],
  ["Finishing", "forward", "finishing-readiness", "set-for-finish"],
  ["Pace", "forward", "pace-in-space", "accelerate-into-space"],
  ["Speed", "defender", "pace-in-space", "accelerate-into-space"],
  ["Aerial duels", "defender", "aerial-duels", "contest-aerial-ball"],
  ["Power", "forward", "strength-in-contact", "hold-through-contact"],
  ["Strength", "defender", "strength-in-contact", "hold-through-contact"],
  ["Distribution", "goalkeeper", "goalkeeper-distribution", "restart-to-teammate"],
  ["Distribution", "midfielder", "passing-continuity", "play-available-pass"],
  ["Passing", "defender", "passing-continuity", "play-available-pass"]
];

for (const [skill, role, qualityId, actionId] of SKILL_ROUTE_REGRESSIONS) {
  const insight = skillInsight(skill, role, "Semantic route regression");
  if (insight?.qualityId !== qualityId || insight?.actionId !== actionId) {
    throw new Error(
      `${skill} (${role}) mapped to ${insight?.qualityId || "none"}/${insight?.actionId || "none"}; `
        + `expected ${qualityId}/${actionId}.`
    );
  }
}

function defaultActions(group) {
  if (group === "goalkeeper") return ["reacts quickly to shots", "claims crosses"];
  if (group === "defender") return ["wins defensive duels", "tracks runners"];
  if (group === "midfielder") return ["keeps possession under pressure", "moves the ball forward"];
  if (group === "forward") return ["runs into space behind defenders", "finds room for shots"];
  return ["keeps his first touch simple", "moves into space for the next pass"];
}

function actionsOverlap(left, right) {
  const normalize = (value) => String(value || "")
    .toLowerCase()
    .replace(/\b(?:a|an|and|at|for|from|his|in|into|of|the|to|with)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const leftTokens = normalize(left);
  const rightTokens = normalize(right);
  if (!leftTokens.length || !rightTokens.length) return false;
  const leftText = leftTokens.join(" ");
  const rightText = rightTokens.join(" ");
  if (leftText === rightText || leftText.includes(rightText) || rightText.includes(leftText)) return true;
  const shared = leftTokens.filter((token) => rightTokens.includes(token));
  return shared.length >= 2 && shared.length / Math.min(leftTokens.length, rightTokens.length) >= 0.6;
}

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

function insightsOverlap(left, right) {
  const leftFamily = ACTION_FAMILY_BY_ID.get(left.actionId);
  const rightFamily = ACTION_FAMILY_BY_ID.get(right.actionId);
  return left.qualityId === right.qualityId
    || Boolean(leftFamily && leftFamily === rightFamily)
    || actionsOverlap(left.action, right.action);
}

const ROLE_PRIORITY_IDS = Object.freeze({
  goalkeeper: new Set([
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
    "shot-stopping-readiness",
    "goalkeeper-distribution"
  ]),
  defender: new Set([
    "protect-danger-space",
    "duel-timing",
    "safe-defensive-decision",
    "recovery-speed",
    "calm-recovery",
    "runner-tracking",
    "aerial-reading",
    "cross-angle-control",
    "early-organization",
    "role-flexibility",
    "passing-weight-angle",
    "deep-attack-timing",
    "close-control-direction",
    "crossing-volume",
    "open-grass-speed",
    "delayed-run",
    "back-post-arrival",
    "penalty-contact-calm"
  ]),
  midfielder: new Set([
    "create-pass-angle",
    "see-decisive-pass",
    "pressure-composure",
    "passing-weight-angle",
    "open-midfield-carry",
    "planned-tight-receive",
    "targeted-press",
    "duel-timing",
    "second-ball-reaction",
    "read-next-phase",
    "aerial-reading",
    "delayed-run",
    "back-post-arrival",
    "penalty-contact-calm",
    "nearby-unit-organization"
  ]),
  forward: new Set([
    "clean-shot",
    "open-grass-speed",
    "close-control-direction",
    "purposeful-off-ball",
    "early-run",
    "delayed-run",
    "near-post-timing",
    "physical-reference",
    "help-next-action",
    "tight-space-delivery",
    "see-decisive-pass",
    "targeted-press",
    "strength-continuity",
    "dead-ball-technique",
    "long-shot-threat",
    "aerial-reading",
    "back-post-arrival",
    "penalty-contact-calm",
    "front-line-leadership"
  ]),
  player: new Set(["read-next-phase", "role-flexibility", "experience-calm"])
});

function evidencePriority(insight, skill, fallback) {
  const grade = evidenceGradeForInsight({ ...insight, sourceSkill: skill, fallback });
  return ({ specific: 3, broad: 2, generic: 1, "role-level": 0 })[grade] ?? 0;
}

function headlinePriority(insight, skill, group, fallback) {
  const value = cleanSkill(skill).toLocaleLowerCase("en-US");
  let score = ROLE_PRIORITY_IDS[group]?.has(insight.qualityId) ? 50 : 30;
  score += evidencePriority(insight, skill, fallback) * 5;
  if (/^(?:aerial finishing|overlap support|penalty-box instinct)$/u.test(value)) score += 15;
  if (value === "midfield control") score += 10;
  if (/^(?:goal threat|chance passes?|match impact|squad depth|tournament role)$/u.test(value)) score -= 10;
  if (fallback) score -= 20;
  return score;
}

function supportingPriority(insight, skill, group, fallback) {
  let score = evidencePriority(insight, skill, fallback) * 10;
  if (ROLE_PRIORITY_IDS[group]?.has(insight.qualityId)) score += 5;
  if (insight.qualityId === "one-on-one-running") score += 15;
  if (fallback) score -= 20;
  return score;
}

function playerInsights(profileName, profile, fact) {
  const group = roleGroup(profile, fact);
  const skills = (Array.isArray(profile.skills) ? profile.skills : [])
    .map(cleanSkill)
    .filter((skill) => skill && isSkillCompatibleWithRole(skill, group));
  const fallbackSkillsBase = roleSkills(profile, fact);
  const fallbackSkills = [...fallbackSkillsBase];
  const candidates = [];
  for (const [index, item] of [...skills, ...fallbackSkills].entries()) {
    const fallback = index >= skills.length;
    const insight = skillInsight(item, group, profileName);
    if (!insight) {
      if (!fallback) {
        if (!unmatchedExplicitSkillProfiles.has(item)) unmatchedExplicitSkillProfiles.set(item, new Set());
        unmatchedExplicitSkillProfiles.get(item).add(profileName);
      }
      continue;
    }
    candidates.push({
      ...insight,
      sourceSkill: item,
      fallback,
      actionEligible: true,
      headlineScore: headlinePriority(insight, item, group, fallback),
      supportingScore: supportingPriority(insight, item, group, fallback),
      sourceIndex: index
    });
  }
  const headlinePool = candidates.some((candidate) => !candidate.fallback)
    ? candidates.filter((candidate) => !candidate.fallback)
    : candidates;
  const headline = [...headlinePool].sort((left, right) =>
    right.headlineScore - left.headlineScore || left.sourceIndex - right.sourceIndex
  )[0];
  const insights = headline ? [headline] : [];
  for (const fallback of [false, true]) {
    const supportingCandidates = candidates
      .filter((candidate) => candidate !== headline && candidate.fallback === fallback)
      .sort((left, right) =>
        right.supportingScore - left.supportingScore || left.sourceIndex - right.sourceIndex
      );
    for (const insight of supportingCandidates) {
      if (insights.length && !insight.actionEligible) continue;
      if (insights.length && insights.some((existing) => insightsOverlap(existing, insight))) continue;
      insights.push(insight);
      if (insights.length === 3) break;
    }
    if (insights.length === 3) break;
  }
  if (insights.length < 3) {
    throw new Error(`Could not create three role-compatible insights for ${profileName} (${group}).`);
  }
  return insights;
}

function stableCopyVariant(value, count) {
  if (!count) return 0;
  const digest = createHash("sha256").update(String(value || "")).digest();
  return digest.readUInt32BE(0) % count;
}

const englishCadenceByTeam = new Map();

function selectEnglishCadenceVariant(profileName, profile, variants) {
  const teamId = String(profile?.teamId || "unknown");
  if (!englishCadenceByTeam.has(teamId)) {
    englishCadenceByTeam.set(teamId, { counts: new Map(), recent: [] });
  }
  const state = englishCadenceByTeam.get(teamId);
  const lastTwo = state.recent.slice(-2);
  const wouldMakeTriple = (variant) => (
    lastTwo.length === 2
    && lastTwo[0] === variant.structureId
    && lastTwo[1] === variant.structureId
  );
  const noTriplePool = variants.some((variant) => !wouldMakeTriple(variant))
    ? variants.filter((variant) => !wouldMakeTriple(variant))
    : variants;
  const lowestUsage = Math.min(
    ...noTriplePool.map((variant) => state.counts.get(variant.structureId) || 0)
  );
  const balancedPool = noTriplePool.filter(
    (variant) => (state.counts.get(variant.structureId) || 0) === lowestUsage
  );
  const selected = balancedPool[
    stableCopyVariant(`${teamId}:${profileName}:english-cadence`, balancedPool.length)
  ];
  state.counts.set(selected.structureId, (state.counts.get(selected.structureId) || 0) + 1);
  state.recent.push(selected.structureId);
  if (state.recent.length > 2) state.recent.shift();
  return selected;
}

function capitalizeFirst(value) {
  const text = String(value || "");
  return text ? `${text[0].toLocaleUpperCase("en-US")}${text.slice(1)}` : text;
}

const PROFILE_SKILL_EVIDENCE_SCORE = Object.freeze({
  specific: 0.88,
  broad: 0.76,
  generic: 0.62,
  "role-level": 0.45
});

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

function evidenceGradeForInsight(insight) {
  if (insight?.fallback) return "role-level";
  const value = cleanSkill(insight?.sourceSkill).toLocaleLowerCase("en-US");
  if (GENERIC_SKILL_EVIDENCE_PATTERN.test(value)) return "generic";
  if (BROAD_DOMAIN_SKILL_EVIDENCE_PATTERNS.some((pattern) => pattern.test(value))) return "broad";
  if (SPECIFIC_SKILL_EVIDENCE_PATTERNS.some((pattern) => pattern.test(value))) return "specific";
  return "broad";
}

function generatedEvidenceSummary(profileName, insights) {
  const beatInsights = noteActionInsights(profileName, insights);
  const beatSources = beatInsights.map((insight) => ({
    kind: insight.fallback ? "role-fallback" : "profile-skill",
    skill: insight.sourceSkill,
    grade: evidenceGradeForInsight(insight)
  }));
  const [headlineEvidence, supportingEvidence] = beatSources;
  const confidence = Number((
    PROFILE_SKILL_EVIDENCE_SCORE[headlineEvidence.grade] * 0.65
      + PROFILE_SKILL_EVIDENCE_SCORE[supportingEvidence.grade] * 0.35
  ).toFixed(2));
  const grades = beatSources.map((source) => source.grade);
  const evidenceTier = grades.every((grade) => grade === "role-level")
    ? "role-level"
    : grades.includes("role-level") || grades.includes("generic")
      ? "limited"
      : grades.every((grade) => grade === "specific")
        ? "specific"
        : "supported";
  return {
    beatSources,
    evidenceTier,
    confidence,
    confidenceBasis: "editorial-skill-specificity-v2"
  };
}

function noteActionInsights(profileName, insights) {
  const [primary, ...supportingCandidates] = insights;
  if (!primary || !supportingCandidates.length) {
    throw new Error(`A generated player note needs a headline insight and a supporting insight: ${profileName}`);
  }
  const explicitCandidates = supportingCandidates.filter((insight) => !insight.fallback);
  return [primary, (explicitCandidates.length ? explicitCandidates : supportingCandidates)[0]];
}

function validateNoteVariants(variants, beats, language) {
  for (const [index, note] of variants.entries()) {
    const sentenceCount = countNoteSentences(note);
    if (sentenceCount < 2 || sentenceCount > 3) {
      throw new Error(`${language} note variant ${index} must contain 2-3 sentences (${sentenceCount}): ${note}`);
    }
    if (/[;；\u2013\u2014]/u.test(note)) {
      throw new Error(`${language} note variant ${index} contains forbidden punctuation.`);
    }
    for (const beat of beats) {
      const includesBeat = language === "English"
        ? note.toLocaleLowerCase("en-US").includes(beat.toLocaleLowerCase("en-US"))
        : note.includes(beat);
      if (!includesBeat) {
        throw new Error(`${language} note variant ${index} dropped a semantic beat: ${beat}`);
      }
    }
    if (language === "English") {
      const heLedSentences = note
        .split(/(?<=[.!?])\s+/u)
        .filter((sentence) => /^He\b/u.test(sentence));
      if (heLedSentences.length > 1) {
        throw new Error(`English note variant ${index} starts more than one sentence with He.`);
      }
    }
  }
}

function englishNote(profileName, profile, fact, insights = playerInsights(profileName, profile, fact)) {
  const name = shortName(profileName, profile);
  const [primary] = insights;
  const [firstActionInsight, secondActionInsight] = noteActionInsights(profileName, insights);
  const actionOne = firstActionInsight?.action || defaultActions(roleGroup(profile, fact))[0];
  const actionTwo = secondActionInsight?.action || defaultActions(roleGroup(profile, fact))[1];
  const supportRelation = secondActionInsight?.qualityId === primary.qualityId
    ? "reinforces-headline"
    : "additional-trait";
  const reinforcingVariants = [
    { structureId: "paired-observation", causal: false, note: `${name}'s signature is ${primary.quality}. Watch how he ${actionOne}, and notice when he ${actionTwo}.` },
    { structureId: "two-clues", causal: false, note: `Watch ${name} for ${primary.quality}. One clue is how he ${actionOne}. Another appears when ${name} ${actionTwo}.` },
    { structureId: "second-detail", causal: false, note: `${name} stands out for ${primary.quality}. He ${actionOne}. A second detail is how ${name} ${actionTwo}.` },
    { structureId: "separating-clue", causal: false, note: `What separates ${name} is ${primary.quality}. ${name} ${actionOne}. In another phase, he ${actionTwo}.` },
    { structureId: "repeated-evidence", causal: true, note: `${name}'s edge comes from ${primary.quality}. You can see it when he ${actionOne}, and again when he ${actionTwo}.` },
    { structureId: "example-another", causal: true, note: `${name} builds his game around ${primary.quality}. One example is how he ${actionOne}. Another is how he ${actionTwo}.` },
    { structureId: "foundation-watch", causal: false, note: `For ${name}, the foundation is ${primary.quality}. Look first at how he ${actionOne}. Also watch how he ${actionTwo}.` },
    { structureId: "different-phase", causal: false, note: `The key to ${name} is ${primary.quality}. He ${actionOne}, and in a different phase he ${actionTwo}.` },
    { structureId: "quality-defines-game", causal: true, note: `${capitalizeFirst(primary.quality)} defines ${name}'s game. It shows when he ${actionOne}. It matters again when he ${actionTwo}.` }
  ];
  const additionalVariants = [
    { structureId: "paired-observation", cadenceVariantId: "paired-separately", causal: false, note: `${name}'s signature is ${primary.quality}. Watch how he ${actionOne}. Separately, he ${actionTwo}.` },
    { structureId: "paired-observation", cadenceVariantId: "paired-he-also", causal: false, note: `${name}'s signature is ${primary.quality}. Watch how he ${actionOne}. He also ${actionTwo}.` },
    { structureId: "paired-observation", cadenceVariantId: "paired-another-detail", causal: false, note: `${name}'s signature is ${primary.quality}. Watch how he ${actionOne}. Another detail is how he ${actionTwo}.` },
    { structureId: "paired-observation", cadenceVariantId: "paired-away-moment", causal: false, note: `${name}'s signature is ${primary.quality}. Watch how he ${actionOne}. Away from that moment, he ${actionTwo}.` },
    { structureId: "paired-observation", cadenceVariantId: "paired-another-part", causal: false, note: `${name}'s signature is ${primary.quality}. Watch how he ${actionOne}. At another point in the move, he ${actionTwo}.` },

    { structureId: "two-clues", cadenceVariantId: "watch-elsewhere", causal: false, note: `Watch ${name} for ${primary.quality}. The clearest example is how he ${actionOne}. Elsewhere, ${name} ${actionTwo}.` },
    { structureId: "two-clues", cadenceVariantId: "watch-separate-clue", causal: false, note: `Watch ${name} for ${primary.quality}. The clearest example is how he ${actionOne}. A separate clue is how ${name} ${actionTwo}.` },
    { structureId: "two-clues", cadenceVariantId: "watch-also-watch", causal: false, note: `Watch ${name} for ${primary.quality}. The clearest example is how he ${actionOne}. Also watch how ${name} ${actionTwo}.` },
    { structureId: "two-clues", cadenceVariantId: "watch-beyond-example", causal: false, note: `Watch ${name} for ${primary.quality}. The clearest example is how he ${actionOne}. Also notice how ${name} ${actionTwo}.` },
    { structureId: "two-clues", cadenceVariantId: "watch-different-phase", causal: false, note: `Watch ${name} for ${primary.quality}. The clearest example is how he ${actionOne}. In a different phase, ${name} ${actionTwo}.` },

    { structureId: "second-detail", cadenceVariantId: "standout-name-also", causal: false, note: `${name} stands out for ${primary.quality}. He ${actionOne}. ${name} also ${actionTwo}.` },
    { structureId: "second-detail", cadenceVariantId: "standout-another-aspect", causal: false, note: `${name} stands out for ${primary.quality}. He ${actionOne}. Another aspect is how ${name} ${actionTwo}.` },
    { structureId: "second-detail", cadenceVariantId: "standout-also-notice", causal: false, note: `${name} stands out for ${primary.quality}. He ${actionOne}. Also look at how ${name} ${actionTwo}.` },
    { structureId: "second-detail", cadenceVariantId: "standout-different-detail", causal: false, note: `${name} stands out for ${primary.quality}. He ${actionOne}. A different detail is how ${name} ${actionTwo}.` },
    { structureId: "second-detail", cadenceVariantId: "standout-outside-sequence", causal: false, note: `${name} stands out for ${primary.quality}. He ${actionOne}. In a separate phase, ${name} ${actionTwo}.` },

    { structureId: "separating-clue", cadenceVariantId: "separates-away-action", causal: false, note: `What separates ${name} is ${primary.quality}. ${name} ${actionOne}. Away from that action, he ${actionTwo}.` },
    { structureId: "separating-clue", cadenceVariantId: "separates-another-moment", causal: false, note: `What separates ${name} is ${primary.quality}. ${name} ${actionOne}. At another point, he ${actionTwo}.` },
    { structureId: "separating-clue", cadenceVariantId: "separates-also-note", causal: false, note: `What separates ${name} is ${primary.quality}. ${name} ${actionOne}. Also note how he ${actionTwo}.` },
    { structureId: "separating-clue", cadenceVariantId: "separates-phase-of-play", causal: false, note: `What separates ${name} is ${primary.quality}. ${name} ${actionOne}. In another phase of play, he ${actionTwo}.` },
    { structureId: "separating-clue", cadenceVariantId: "separates-separate-detail", causal: false, note: `What separates ${name} is ${primary.quality}. ${name} ${actionOne}. A separate detail appears when he ${actionTwo}.` },

    { structureId: "foundation-watch", cadenceVariantId: "foundation-beyond", causal: false, note: `For ${name}, the foundation is ${primary.quality}. Look first at how he ${actionOne}. Beyond that, watch how he ${actionTwo}.` },
    { structureId: "foundation-watch", cadenceVariantId: "foundation-also-watch", causal: false, note: `For ${name}, the foundation is ${primary.quality}. Look first at how he ${actionOne}. Also watch how he ${actionTwo}.` },
    { structureId: "foundation-watch", cadenceVariantId: "foundation-separate-look", causal: false, note: `For ${name}, the foundation is ${primary.quality}. Look first at how he ${actionOne}. Separately, look at how he ${actionTwo}.` },
    { structureId: "foundation-watch", cadenceVariantId: "foundation-separate-point", causal: false, note: `For ${name}, the foundation is ${primary.quality}. Look first at how he ${actionOne}. A separate point is how he ${actionTwo}.` },
    { structureId: "foundation-watch", cadenceVariantId: "foundation-beyond-action", causal: false, note: `For ${name}, the foundation is ${primary.quality}. Look first at how he ${actionOne}. Beyond the first action, he ${actionTwo}.` },

    { structureId: "different-phase", cadenceVariantId: "key-another-side", causal: false, note: `The key to ${name} is ${primary.quality}. He ${actionOne}. There is another side to his game: he ${actionTwo}.` },
    { structureId: "different-phase", cadenceVariantId: "key-elsewhere-game", causal: false, note: `The key to ${name} is ${primary.quality}. He ${actionOne}. Elsewhere in the game, ${name} ${actionTwo}.` },
    { structureId: "different-phase", cadenceVariantId: "key-one-more-thing", causal: false, note: `The key to ${name} is ${primary.quality}. He ${actionOne}. One more thing to notice is how ${name} ${actionTwo}.` },
    { structureId: "different-phase", cadenceVariantId: "key-another-phase", causal: false, note: `The key to ${name} is ${primary.quality}. He ${actionOne}. In another phase, ${name} ${actionTwo}.` },
    { structureId: "different-phase", cadenceVariantId: "key-separate-game-part", causal: false, note: `The key to ${name} is ${primary.quality}. He ${actionOne}. A separate part of his game is how ${name} ${actionTwo}.` }
  ];
  validateNoteVariants(
    [...reinforcingVariants, ...additionalVariants].map((variant) => variant.note),
    [primary.quality, actionOne, actionTwo],
    "English"
  );
  const evidenceSummary = generatedEvidenceSummary(profileName, insights);
  if (evidenceSummary.evidenceTier === "role-level") {
    const note = `Watch ${name} in two moments. First, check whether he ${actionOne}. Then watch whether he ${actionTwo}.`;
    validateNoteVariants([note], [actionOne, actionTwo], "English");
    return { structureId: "role-guide", causal: false, note, supportRelation };
  }
  const usesMixedRoleFallback = !firstActionInsight?.fallback && Boolean(secondActionInsight?.fallback);
  if (usesMixedRoleFallback) {
    const mixedVariants = [
      { structureId: "paired-observation", causal: false, note: `${name}'s signature is ${primary.quality}. Watch how he ${actionOne}. For a wider read, also watch whether he ${actionTwo}.` },
      { structureId: "two-clues", causal: false, note: `Watch ${name} for ${primary.quality}. The clearest example is how he ${actionOne}. A separate question is whether ${name} ${actionTwo}.` },
      { structureId: "second-detail", causal: false, note: `${name} stands out for ${primary.quality}. He ${actionOne}. A different question is whether he ${actionTwo}.` },
      { structureId: "separating-clue", causal: false, note: `What separates ${name} is ${primary.quality}. ${name} ${actionOne}. In another phase, watch whether he ${actionTwo}.` },
      { structureId: "foundation-watch", causal: false, note: `For ${name}, the foundation is ${primary.quality}. Look first at how he ${actionOne}. For a wider picture, notice whether he ${actionTwo}.` },
      { structureId: "different-phase", causal: false, note: `The key to ${name} is ${primary.quality}. He ${actionOne}. The next thing to watch is whether he ${actionTwo}.` }
    ];
    validateNoteVariants(mixedVariants.map((variant) => variant.note), [primary.quality, actionOne, actionTwo], "English");
    return { ...selectEnglishCadenceVariant(profileName, profile, mixedVariants), supportRelation };
  }
  const eligibleVariants = supportRelation === "reinforces-headline"
    ? reinforcingVariants
    : additionalVariants;
  const selected = selectEnglishCadenceVariant(profileName, profile, eligibleVariants);
  if (
    selected.structureId !== "separating-clue"
    && !parseGeneratedPlayerStyleNote(selected.note)
  ) {
    throw new Error(`Generated English note no longer matches the locale parser: ${profileName}`);
  }
  const cadenceVariantIndex = selected.cadenceVariantId
    ? eligibleVariants
      .filter((variant) => variant.structureId === selected.structureId)
      .findIndex((variant) => variant.cadenceVariantId === selected.cadenceVariantId)
    : -1;
  return {
    ...selected,
    ...(cadenceVariantIndex >= 0 ? { cadenceVariantIndex } : {}),
    supportRelation
  };
}

function actionForSkillZh(skill, group) {
  const value = cleanSkill(skill).toLowerCase();
  if (!value || /^(?:tournament|match|squad|team)\b/.test(value)) return "";
  if (/penalt(?:y|ies).*(?:save|stop)|(?:save|stop).*penalt/.test(value)) return "扑点球";
  if (/shot.?stop|reaction|reflex|one-on-one sav|quick saves?|close-range sav|low saves?|reach/.test(value)) return "快速应对射门";
  if (/cross.*(?:claim|handl|command)|claim.*cross|box command|penalty-area command|high balls?/.test(value) && group === "goalkeeper") return "处理传中球";
  if (/distribution|restart|throwing|goal kicks?|keeper passing/.test(value) && group === "goalkeeper") return "用传球发动进攻";
  if (/set.?piece.*(?:deliver|service|quality)|dead-ball|free.?kick|corner/.test(value)) return "用定位球创造机会";
  if (/long.?range|long shooting|shooting range|distance shooting/.test(value)) return "远射";
  if (/finish|goal threat|inside shooting|quick shooting|box presence|box movement|penalty-box movement|penalty-area movement|near-post|striker movement/.test(value)) return "在禁区内寻找射门空间";
  if (/chance pass|chance creat|creative pass|final pass|through ball|playmak|vision|assist/.test(value)) return "用传球创造机会";
  if (/overlap/.test(value)) return "把握前插时机";
  if (/cross|service|delivery/.test(value)) return "从边路传中";
  if (/dribbl|ball carrying|direct carr|progressive carr|close control|tight-space|take-ons?/.test(value)) return "带球突破防守者";
  if (/run.*behind|channel run|counter run|transition run|inside run|forward movement|late run|box arrival/.test(value)) return "无球跑到防守者身后";
  if (/acceleration|pace|speed|direct running|wide running|counter threat/.test(value)) {
    if (group === "defender") return "在对手反击时快速回追";
    if (group === "midfielder") return "带球进入空当";
    return "加速攻击空当";
  }
  if (/press/.test(value)) return "逼抢持球人";
  if (/hold-up|target/.test(value)) return "背身护球";
  if (/link play|combination/.test(value)) return "与身边队友配合";
  if (/aerial|heading|headers?|high-ball/.test(value)) return "争抢高空球";
  if (/recover/.test(value) && group === "defender") return "回追到位";
  if (/track|mark/.test(value) && group === "defender") return "盯住无球跑动";
  if (/duel|tackl|ball winning|intercept/.test(value)) {
    if (group === "midfielder") return "在中场抢回球权";
    if (group === "forward") return "争抢前场二点球";
    return "赢下防守对抗";
  }
  if (/defend|cover|clear|block|screen|protect/.test(value)) {
    if (group === "midfielder") return "保护中路空间";
    if (group === "forward") return "从前场开始防守";
    return "保护禁区附近的空间";
  }
  if (/second ball|loose ball/.test(value)) return "争抢二点球";
  if (/between-lines|pocket|receiv|first touch|turns?/.test(value)) return "在两条防线之间接球转身";
  if (/tempo|press resistance|pressure escape|circulation|short pass|simple pass|possession|ball retention/.test(value)) return "在压力下稳住球权";
  if (/pass|progression|build-up|switching/.test(value)) return "用简单传球向前推进";
  if (/leadership|organi[sz]|line control|communication|command/.test(value)) return "指挥队友站位";
  return "";
}

function defaultActionsZh(group) {
  if (group === "goalkeeper") return ["快速应对射门", "处理传中球"];
  if (group === "defender") return ["赢下防守对抗", "盯住无球跑动"];
  if (group === "midfielder") return ["在压力下稳住球权", "用简单传球向前推进"];
  if (group === "forward") return ["无球跑到防守者身后", "在禁区内寻找射门空间"];
  return ["控制好第一脚触球", "跑到空当接应队友"];
}

function observableActionsZh(profile, fact) {
  const group = roleGroup(profile, fact);
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const actions = [];
  for (const skill of [...skills, ...roleSkills(profile, fact)]) {
    const action = actionForSkillZh(skill, group);
    if (action && !actions.includes(action)) actions.push(action);
    if (actions.length === 2) break;
  }
  for (const action of defaultActionsZh(group)) {
    if (!actions.includes(action)) actions.push(action);
    if (actions.length === 2) break;
  }
  return actions;
}

function chineseNote(profileName, profile, fact, insights = playerInsights(profileName, profile, fact)) {
  const [primary] = insights;
  const [firstActionInsight, secondActionInsight] = noteActionInsights(profileName, insights);
  const group = roleGroup(profile, fact);
  const fallbacks = defaultActionsZh(group);
  const actionOne = firstActionInsight?.actionZh || fallbacks[0];
  const actionTwo = secondActionInsight?.actionZh || fallbacks[1];
  const quality = primary.qualityZh.replace(/^在/u, "");
  const displayName = String(profile.displayName || profile.name || profileName).trim();
  const name = /^(?:Jordan|Israel)\b/i.test(displayName)
    ? shortName(profileName, profile)
    : displayName;
  const evidenceSummary = generatedEvidenceSummary(profileName, insights);
  if (evidenceSummary.evidenceTier === "role-level") {
    const note = `观察${name}时，可以看两个时刻。先看他是否会${actionOne}。再看他是否会${actionTwo}。`;
    validateNoteVariants([note], [actionOne, actionTwo], "Chinese");
    return note;
  }
  const usesMixedRoleFallback = !firstActionInsight?.fallback && Boolean(secondActionInsight?.fallback);
  if (usesMixedRoleFallback) {
    const mixedVariants = [
      `${name}的优势在于${quality}。最直接的表现是他会${actionOne}。想看得更完整，还要观察他是否会${actionTwo}。`,
      `${quality}是理解${name}踢法的关键。先看他如何${actionOne}。另一个问题是，${name}是否会${actionTwo}。`,
      `最能体现${name}特点的是${quality}。这一点直接体现在他会${actionOne}。接着可以问，他是否会${actionTwo}。`,
      `${name}的比赛建立在${quality}之上。首先看他如何${actionOne}。换到另一个阶段，要看他是否会${actionTwo}。`,
      `看${name}的作用，关键是${quality}。他会${actionOne}。想再多看一层，可以留意他是否会${actionTwo}。`,
      `理解${name}，要先看${quality}。他会${actionOne}。下一个值得观察的问题是，他是否会${actionTwo}。`
    ];
    validateNoteVariants(mixedVariants, [quality, actionOne, actionTwo], "Chinese");
    return mixedVariants[stableCopyVariant(`${profile.teamId || ""}:${profileName}:zh-mixed-role`, mixedVariants.length)];
  }
  const reinforcingVariants = [
    `${name}的优势在于${quality}。具体看，他会${actionOne}，也会${actionTwo}。`,
    `${quality}是理解${name}踢法的关键。他会${actionOne}，也会${actionTwo}。`,
    `最能体现${name}特点的是${quality}。一个细节是他会${actionOne}，另一个是他会${actionTwo}。`,
    `${name}的比赛建立在${quality}之上。比赛中，他既会${actionOne}，也会${actionTwo}。`,
    `看${name}的作用，关键是${quality}。这一点既体现在他会${actionOne}，也体现在他会${actionTwo}。`
  ];
  const distinctVariants = [
    `${name}的优势在于${quality}。最直接的表现是他会${actionOne}。另一个值得观察的细节是他会${actionTwo}。`,
    `${quality}是理解${name}踢法的关键。先看他如何${actionOne}。到了另一个比赛环节，他会${actionTwo}。`,
    `最能体现${name}特点的是${quality}。这一点直接体现在他会${actionOne}。除此之外，他也会${actionTwo}。`,
    `${name}的比赛建立在${quality}之上。首先看他如何${actionOne}。另一个方面是他会${actionTwo}。`,
    `看${name}的作用，关键是${quality}。他会${actionOne}。换到另一个阶段，还可以看到他会${actionTwo}。`,
    `理解${name}，要先看${quality}。他会${actionOne}。比赛进入另一种局面时，他也会${actionTwo}。`,
    `${name}最鲜明的特点是${quality}。一个直接线索是他会${actionOne}。另一个独立细节是他会${actionTwo}。`,
    `${quality}构成${name}踢法的核心。他会${actionOne}。除此之外，值得留意他会${actionTwo}。`,
    `观察${name}时，可以先看${quality}。他会${actionOne}。另一个比赛细节是他会${actionTwo}。`
  ];
  const variants = secondActionInsight?.qualityId === primary.qualityId
    ? reinforcingVariants
    : distinctVariants;
  validateNoteVariants(variants, [quality, actionOne, actionTwo], "Chinese");
  return variants[stableCopyVariant(`${profile.teamId || ""}:${profileName}:zh-note-structure`, variants.length)];
}

function generatedNoteMeta(
  profileName,
  profile,
  fact,
  insights,
  structureId,
  cadenceVariantId = "",
  cadenceVariantIndex = -1
) {
  const compatibleOriginalSkills = new Set(
    (Array.isArray(profile.skills) ? profile.skills : [])
      .map(cleanSkill)
      .filter((skill) => isSkillCompatibleWithRole(skill, roleGroup(profile, fact)))
  );
  const actionInsights = noteActionInsights(profileName, insights);
  const selectedInsights = [...new Set(actionInsights)];
  const sourceSkills = selectedInsights
    .filter((insight) => !insight.fallback && compatibleOriginalSkills.has(insight.sourceSkill))
    .map((insight) => insight.sourceSkill);
  const roleFallbacks = selectedInsights
    .filter((insight) => insight.fallback)
    .map((insight) => insight.sourceSkill);
  const evidenceSummary = generatedEvidenceSummary(profileName, insights);
  const supportRelation = actionInsights[1]?.qualityId === insights[0].qualityId
    ? "reinforces-headline"
    : "additional-trait";
  const fallbackFraming = roleFallbacks.length === 0
    ? "none"
    : roleFallbacks.length === actionInsights.length
      ? "role-guide"
      : "role-responsibility";
  return {
    origin: "generated",
    generatorVersion: NOTE_GENERATOR_VERSION,
    roleGroup: roleGroup(profile, fact),
    structureId,
    ...(cadenceVariantId ? { cadenceVariantId } : {}),
    ...(cadenceVariantIndex >= 0 ? { cadenceVariantIndex } : {}),
    signatureId: insights[0].qualityId,
    actionIds: actionInsights.map((insight) => insight.actionId),
    headlineActionId: actionInsights[0].actionId,
    supportingSignatureId: actionInsights[1].qualityId,
    supportRelation,
    semanticSelectionBasis: "editorial-specificity-source-order-v1",
    fallbackFraming,
    sourceSkills,
    roleFallbacks,
    beatSources: evidenceSummary.beatSources,
    evidenceTier: evidenceSummary.evidenceTier,
    confidenceBasis: evidenceSummary.confidenceBasis,
    confidence: evidenceSummary.confidence
  };
}

function authoredNoteMeta(profileName, profile, fact) {
  if (profileName === "Kylian Mbappe") {
    return {
      origin: "authored",
      generatorVersion: "authored-v1",
      roleGroup: roleGroup(profile, fact),
      structureId: "authored",
      signatureId: "open-grass-speed",
      actionIds: ["shoot-strong-foot", "release-under-crowding"],
      sourceSkills: [...(profile.skills || [])].slice(0, 3),
      roleFallbacks: [],
      confidence: 0.96
    };
  }
  if (profileName === "Goncalo Ramos") {
    return {
      origin: "authored",
      generatorVersion: "authored-v1",
      roleGroup: roleGroup(profile, fact),
      structureId: "legacy-three",
      signatureId: "clean-shot",
      actionIds: ["late-box-arrival", "press-angle"],
      sourceSkills: [...(profile.skills || [])].slice(0, 3),
      roleFallbacks: [],
      confidence: 0.96
    };
  }
  const existing = profile.noteMeta || {};
  return {
    origin: "authored",
    generatorVersion: String(existing.generatorVersion || "authored-v1"),
    roleGroup: roleGroup(profile, fact),
    structureId: String(existing.structureId || "authored"),
    signatureId: String(existing.signatureId || "editorial-review"),
    actionIds: Array.isArray(existing.actionIds) ? existing.actionIds.slice(0, 2) : ["editorial-review", "editorial-review"],
    sourceSkills: Array.isArray(existing.sourceSkills) ? existing.sourceSkills.slice(0, 3) : [...(profile.skills || [])].slice(0, 3),
    roleFallbacks: Array.isArray(existing.roleFallbacks) ? existing.roleFallbacks.slice(0, 3) : [],
    confidence: Number.isFinite(existing.confidence) ? existing.confidence : 0.9
  };
}

function targetTeams(teamsData) {
  const explicit = parseList(getArgValue("teams")).map((teamId) => teamId.toUpperCase());
  if (explicit.length) return explicit;

  const exclude = new Set(parseList(getArgValue("exclude-teams")).map((teamId) => teamId.toUpperCase()));
  if (hasArg("exclude-qf")) {
    const quarterFinalists = QF_TEAMS_BY_EDITION.get(profileEdition);
    if (!quarterFinalists) {
      throw new Error(`--exclude-qf has no configured team set for edition ${profileEdition}.`);
    }
    for (const teamId of quarterFinalists) exclude.add(teamId);
  }

  return (teamsData.teams || [])
    .map((team) => team.id)
    .filter((teamId) => teamId && !exclude.has(teamId));
}

const profilesPath = path.join(dataDir, "player-profiles.json");
const [profilesData, teamsData, fixturesData, lineupsData] = await Promise.all([
  readJson(profilesPath),
  readJson(path.join(dataDir, "teams.json")),
  readJson(path.join(dataDir, "fixtures.json")),
  readJson(path.join(dataDir, "lineups.json"))
]);

const repairedDisplayNames = repairCanonicalDisplayNames(profilesData);
const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
const facts = buildFacts({ fixturesData, lineupsData, profilesData, teamsById });
const teams = targetTeams(teamsData);
const missingTeamTranslations = teams.filter((teamId) => !TEAM_NAME_ZH_BY_ID.has(teamId));
if (missingTeamTranslations.length) {
  throw new Error(`Missing Chinese team names for: ${missingTeamTranslations.join(", ")}`);
}
const dryRun = hasArg("dry-run");
const zhOnly = hasArg("zh-only");
const skipOverrides = hasArg("skip-overrides");
const rewriteSubstantive = hasArg("rewrite-substantive");
let updatedProfiles = 0;
let updatedOverrides = 0;
let updatedEnglishNotes = 0;
let updatedChineseNotes = 0;
let updatedSkillSets = 0;
let updatedMetadataEntries = 0;
let preservedAuthoredProfiles = 0;

for (const teamId of teams) {
  const overridePath = path.join(overrideDir, `${teamId}.json`);
  const overrideData = existsSync(overridePath) ? await readJson(overridePath) : null;
  let overrideChanged = false;

  for (const [profileName, profile] of Object.entries(profilesData.profiles || {})) {
    if (profile?.teamId !== teamId) continue;
    const fact = facts.get(getUsageKey(teamId, profileName));
    if (!fact) continue;

    const overrideProfile = overrideData?.profiles?.[profileName];
    const copyProfile = {
      ...profile,
      ...(Array.isArray(overrideProfile?.skills) && overrideProfile.skills.length
        ? { skills: overrideProfile.skills }
        : {}),
      ...(overrideProfile?.noteMeta ? { noteMeta: overrideProfile.noteMeta } : {})
    };
    const preserveAuthored = !rewriteSubstantive
      && shouldPreserveAuthoredCopy(profileName, profile, overrideProfile, fact);
    const authoredCopy = preserveAuthored
      ? effectiveAuthoredCopy(profileName, profile, overrideProfile)
      : null;
    const insights = preserveAuthored ? null : playerInsights(profileName, copyProfile, fact);
    const englishData = preserveAuthored ? null : englishNote(profileName, copyProfile, fact, insights);
    const note = preserveAuthored ? authoredCopy.note : englishData.note;
    const noteZh = preserveAuthored ? authoredCopy.noteZh : chineseNote(profileName, copyProfile, fact, insights);
    const skills = zhOnly || preserveAuthored ? profile.skills : nextSkills(copyProfile, fact);
    const noteMeta = preserveAuthored
      ? authoredNoteMeta(profileName, copyProfile, fact)
      : generatedNoteMeta(
        profileName,
        copyProfile,
        fact,
        insights,
        englishData.structureId,
        englishData.cadenceVariantId,
        englishData.cadenceVariantIndex
      );

    const canUpdateEnglish = !zhOnly;
    const canUpdateChinese = true;
    const canUpdateSkills = !zhOnly && !preserveAuthored && (
      rewriteSubstantive || canUpdateEnglish || skillsCanBeUpgraded(profile.skills)
    );
    let profileChanged = false;

    if (canUpdateEnglish && profile.note !== note) {
      profile.note = note;
      updatedEnglishNotes += 1;
      profileChanged = true;
    }
    if (canUpdateSkills && JSON.stringify(profile.skills || []) !== JSON.stringify(skills || [])) {
      profile.skills = skills;
      updatedSkillSets += 1;
      profileChanged = true;
    }
    if (canUpdateChinese && profile.noteZh !== noteZh) {
      profile.noteZh = noteZh;
      updatedChineseNotes += 1;
      profileChanged = true;
    }
    if (JSON.stringify(profile.noteMeta || null) !== JSON.stringify(noteMeta)) {
      profile.noteMeta = noteMeta;
      updatedMetadataEntries += 1;
      profileChanged = true;
    }
    if (profileChanged) {
      updatedProfiles += 1;
    }

    if (!skipOverrides && overrideData?.profiles?.[profileName]) {
      let overrideEntryChanged = false;
      if (canUpdateEnglish && overrideData.profiles[profileName].note !== note) {
        overrideData.profiles[profileName].note = note;
        overrideEntryChanged = true;
      }
      if (canUpdateSkills && JSON.stringify(overrideData.profiles[profileName].skills || []) !== JSON.stringify(skills || [])) {
        overrideData.profiles[profileName].skills = skills;
        overrideEntryChanged = true;
      }
      if (canUpdateChinese && overrideData.profiles[profileName].noteZh !== noteZh) {
        overrideData.profiles[profileName].noteZh = noteZh;
        overrideEntryChanged = true;
      }
      if (JSON.stringify(overrideData.profiles[profileName].noteMeta || null) !== JSON.stringify(noteMeta)) {
        overrideData.profiles[profileName].noteMeta = noteMeta;
        overrideEntryChanged = true;
      }
      if (overrideEntryChanged) {
        updatedOverrides += 1;
        overrideChanged = true;
      }
    }

    if (preserveAuthored) preservedAuthoredProfiles += 1;
  }

  if (overrideData && overrideChanged && !skipOverrides && !dryRun) {
    await writeFile(overridePath, `${JSON.stringify(overrideData, null, 2)}\n`);
  }
}

if (!dryRun && (updatedProfiles || repairedDisplayNames)) {
  await writeFile(profilesPath, `${JSON.stringify(profilesData, null, 2)}\n`);
}

console.log(
  `${dryRun ? "Would refresh" : "Refreshed"} ${updatedProfiles} profile entries ` +
    `(${updatedEnglishNotes} English notes, ${updatedChineseNotes} Chinese notes, ${updatedSkillSets} skill sets, ` +
    `${updatedMetadataEntries} metadata entries), ` +
    `${updatedOverrides} override entries, and ${repairedDisplayNames} canonical display names ` +
    `for ${teams.length} ${teams.length === 1 ? "team" : "teams"} in edition ${profileEdition}.`
);
if (hasArg("report-unmatched")) {
  const unmatched = [...unmatchedExplicitSkillProfiles.entries()]
    .sort((left, right) => right[1].size - left[1].size || left[0].localeCompare(right[0]));
  console.log(`Unmatched explicit skill tags: ${unmatched.length}.`);
  for (const [skill, profileNames] of unmatched) {
    console.log(`- ${skill}: ${profileNames.size} (${[...profileNames].slice(0, 5).join(", ")})`);
  }
}
if (!rewriteSubstantive && preservedAuthoredProfiles) {
  console.log(
    `Preserved provenance-marked authored notes for ${preservedAuthoredProfiles} profile entries. ` +
      "Use --rewrite-substantive to regenerate them explicitly."
  );
}
