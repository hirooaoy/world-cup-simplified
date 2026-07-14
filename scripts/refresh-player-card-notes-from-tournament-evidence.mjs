#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayerName } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const overrideDir = path.join(dataDir, "player-profile-overrides", "2026");
const args = process.argv.slice(2);

const QF_TEAMS = new Set(["FRA", "MAR", "ESP", "BEL", "NOR", "ENG", "ARG", "SUI"]);

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
  return parts.at(-1).replace(/[.,]$/, "");
}

function isGoalkeeper(profile = {}) {
  return /\bgoalkeeper\b|\bGK\b/i.test(profile.position || "");
}

function roleGroup(profile = {}, usage) {
  if (isGoalkeeper(profile)) return "goalkeeper";

  const profilePosition = String(profile.position || "");
  const primaryProfilePosition = profilePosition.split(/[,/;]/)[0].trim();
  const usagePositionText = usage?.positions ? [...usage.positions.keys()].join(" ") : "";
  const defenderPattern = /\b(?:centre-back|center-back|defender|full-back|right-back|left-back|wing-back|CB|RB|LB|RWB|LWB)\b/i;
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

function roleSkills(profile, fact) {
  const group = roleGroup(profile, fact);
  const position = topCount(fact?.positions || new Map());
  if (group === "goalkeeper") {
    return ["Shot stopping", "Box command", "Calm restarts"];
  }
  if (group === "defender") {
    if (/RB|RWB|right-back/i.test(position || profile.position || "")) return ["Wide defending", "Recovery runs", "Forward support"];
    if (/LB|LWB|left-back/i.test(position || profile.position || "")) return ["Wide defending", "Recovery runs", "Forward support"];
    return ["Duel timing", "Box defending", "First pass"];
  }
  if (group === "midfielder") {
    if (/AM|attacking/i.test(position || profile.position || "")) return ["Pocket receiving", "Chance passes", "Late runs"];
    if (/DM|defensive/i.test(position || profile.position || "")) return ["Midfield cover", "First pass", "Second balls"];
    return ["Midfield carrying", "Pressure passing", "Second balls"];
  }
  if (group === "forward") {
    if (/wing|RW|LW/i.test(position || profile.position || "")) return ["Direct running", "One-on-one pressure", "Box-area service"];
    return ["Box movement", "Pressing runs", "Quick finishing"];
  }
  return ["Tournament role", "Match rhythm", "Pressure moments"];
}

function nextSkills(profile, fact) {
  const existing = Array.isArray(profile.skills) ? profile.skills.map(cleanSkill).filter(Boolean) : [];
  const withGoal = fact?.goals?.length ? ["Goal threat"] : [];
  const withAssist = fact?.assists?.length ? ["Chance passes"] : [];
  const base = [...withGoal, ...withAssist, ...existing, ...roleSkills(profile, fact)];
  return [...new Set(base)]
    .filter((skill) => !/^match impact$/i.test(skill))
    .slice(0, 3);
}

function opponentNames(items = [], teamsById) {
  const ids = [...new Set(items.map((item) => item.opponentId).filter(Boolean))];
  return ids.map((id) => teamsById.get(id)?.name || id);
}

function listNames(names) {
  const clean = names.filter(Boolean);
  if (!clean.length) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, 2).join(", ")}, and ${clean[2]}`;
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

function positionWithArticle(profile, fact) {
  const position = positionLabel(profile, fact);
  return `${/^[aeiou]/i.test(position) ? "an" : "a"} ${position}`;
}

function actionForSkill(skill, group) {
  const value = cleanSkill(skill).toLowerCase();
  if (!value || /^(?:tournament|match|squad|team)\b/.test(value)) return "";

  if (/penalt(?:y|ies).*(?:save|stop)|(?:save|stop).*penalt/.test(value)) return "saves penalties";
  if (/shot.?stop|reaction|reflex|one-on-one sav|quick saves?/.test(value)) return "reacts quickly to shots";
  if (/cross.*(?:claim|handl|command)|claim.*cross|box command|penalty-area command|high balls?/.test(value) && group === "goalkeeper") return "claims crosses";
  if (/distribution|restart|throwing|goal kicks?|keeper passing/.test(value) && group === "goalkeeper") return "starts attacks with his passing";
  if (/set.?piece.*(?:deliver|service|quality)|dead-ball|free.?kick|corner/.test(value)) return "creates chances from set pieces";
  if (/long.?range|long shooting|shooting range|distance shooting/.test(value)) return "shoots from distance";
  if (/finish|goal threat|inside shooting|quick shooting|box presence|box movement|penalty-box movement|penalty-area movement|near-post|striker movement/.test(value)) return "finds space for shots in the box";
  if (/chance pass|chance creat|creative pass|final pass|through ball|playmak|vision|assist/.test(value)) return "creates chances with his passing";
  if (/overlap/.test(value)) return "times his forward runs";
  if (/cross|service|delivery/.test(value)) return "crosses from wide areas";
  if (/dribbl|ball carrying|direct carr|progressive carr|close control|tight-space|take-ons?/.test(value)) return "carries the ball past defenders";
  if (/run.*behind|channel run|counter run|transition run|inside run|forward movement|late run|box arrival/.test(value)) return "runs into space away from defenders";
  if (/acceleration|pace|speed|direct running|wide running|counter threat/.test(value)) {
    if (group === "defender") return "recovers when opponents break forward";
    if (group === "midfielder") return "carries the ball into open space";
    return "attacks open space at speed";
  }
  if (/press/.test(value)) return "closes down opponents";
  if (/hold-up|target/.test(value)) return "holds the ball for teammates";
  if (/link play|combination/.test(value)) return "combines with nearby teammates";
  if (/aerial|heading|headers?|high-ball/.test(value)) return "competes for high balls";
  if (/recover/.test(value) && group === "defender") return "recovers into position";
  if (/track|mark/.test(value) && group === "defender") return "tracks runners";
  if (/duel|tackl|ball winning|intercept/.test(value)) {
    if (group === "midfielder") return "wins the ball in midfield";
    if (group === "forward") return "challenges defenders for loose balls";
    return "wins defensive duels";
  }
  if (/defend|cover|clear|block|screen|protect/.test(value)) {
    if (group === "midfielder") return "covers central space";
    if (group === "forward") return "helps defend from the front";
    return "protects space near the box";
  }
  if (/second ball|loose ball/.test(value)) return "reacts quickly to loose balls";
  if (/between-lines|pocket|receiv|first touch|turns?/.test(value)) return "receives between the lines and turns";
  if (/tempo|press resistance|pressure escape|circulation|short pass|simple pass|possession|ball retention/.test(value)) return "keeps possession under pressure";
  if (/pass|progression|build-up|switching/.test(value)) return "moves the ball forward with simple passes";
  if (/leadership|organi[sz]|line control|communication|command/.test(value)) return "organizes teammates";
  return "";
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

function observableActions(profile, fact) {
  const group = roleGroup(profile, fact);
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const actions = [];
  for (const skill of [...skills, ...roleSkills(profile, fact)]) {
    const action = actionForSkill(skill, group);
    if (action && !actions.some((existing) => actionsOverlap(existing, action))) actions.push(action);
    if (actions.length === 2) break;
  }
  for (const action of defaultActions(group)) {
    if (!actions.some((existing) => actionsOverlap(existing, action))) actions.push(action);
    if (actions.length === 2) break;
  }
  return actions;
}

function actionSentence(profile, fact) {
  const [first, second] = observableActions(profile, fact);
  return `He ${first}. He also ${second}.`;
}

function englishNote(profileName, profile, fact, teamsById) {
  const name = shortName(profileName, profile);
  const team = fact.teamName;
  const goals = fact.goals || [];
  const assists = fact.assists || [];
  const goalOpponents = opponentNames(goals, teamsById);
  const assistOpponents = opponentNames(assists, teamsById);
  let evidence;

  if (goals.length && assists.length) {
    evidence = `${name} has ${goals.length} ${goals.length === 1 ? "goal" : "goals"} and ${assists.length} ${assists.length === 1 ? "assist" : "assists"} for ${team} at this World Cup.`;
  } else if (goals.length === 1) {
    evidence = `${name} scored against ${goalOpponents[0] || "their opponent"} for ${team} at this World Cup.`;
  } else if (goals.length > 1) {
    evidence = `${name} has scored ${goals.length} goals for ${team} at this World Cup, against ${listNames(goalOpponents)}.`;
  } else if (assists.length === 1) {
    evidence = `${name} has one assist for ${team} at this World Cup${assistOpponents[0] ? `, against ${assistOpponents[0]}` : ""}.`;
  } else if (assists.length > 1) {
    evidence = `${name} has ${assists.length} assists for ${team} at this World Cup, against ${listNames(assistOpponents)}.`;
  } else {
    evidence = `${name} is ${positionWithArticle(profile, fact)} for ${team}.`;
  }

  return `${evidence} ${actionSentence(profile, fact)}`;
}

function positionLabelZh(profile, fact) {
  const position = positionLabel(profile, fact);
  if (/goalkeeper/.test(position)) return "门将";
  if (/centre-back|center-back|central defender|sweeper/.test(position)) return "中后卫";
  if (/right-back|right wing-back/.test(position)) return "右后卫";
  if (/left-back|left wing-back/.test(position)) return "左后卫";
  if (/full-back|wing-back/.test(position)) return "边后卫";
  if (/defensive midfielder/.test(position)) return "防守型中场";
  if (/attacking midfielder/.test(position)) return "攻击型中场";
  if (/central midfielder|midfielder/.test(position)) return "中场";
  if (/right winger|right midfielder/.test(position)) return "右边锋";
  if (/left winger|left midfielder/.test(position)) return "左边锋";
  if (/winger|wide midfielder/.test(position)) return "边锋";
  if (/striker|centre-forward|center-forward/.test(position)) return "中锋";
  if (/forward/.test(position)) return "前锋";
  if (/defender/.test(position)) return "后卫";
  return "球员";
}

function actionForSkillZh(skill, group) {
  const value = cleanSkill(skill).toLowerCase();
  if (!value || /^(?:tournament|match|squad|team)\b/.test(value)) return "";
  if (/penalt(?:y|ies).*(?:save|stop)|(?:save|stop).*penalt/.test(value)) return "扑点球";
  if (/shot.?stop|reaction|reflex|one-on-one sav|quick saves?/.test(value)) return "快速应对射门";
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

function chineseNote(profileName, profile, fact, teamsById) {
  const team = teamNameZh(fact.teamId, fact.teamName);
  const goals = fact.goals || [];
  const assists = fact.assists || [];
  const goalOpponents = [...new Set(goals.map((item) => item.opponentId).filter(Boolean))]
    .map((teamId) => teamNameZh(teamId, teamsById.get(teamId)?.name));
  const assistOpponents = [...new Set(assists.map((item) => item.opponentId).filter(Boolean))]
    .map((teamId) => teamNameZh(teamId, teamsById.get(teamId)?.name));
  const [firstAction, secondAction] = observableActionsZh(profile, fact);
  let evidence;

  if (goals.length && assists.length) {
    evidence = `他在本届世界杯为${team}打进${goals.length}球，并送出${assists.length}次助攻。`;
  } else if (goals.length === 1) {
    evidence = goalOpponents[0]
      ? `他在本届世界杯对${goalOpponents[0]}的比赛中为${team}打进一球。`
      : `他在本届世界杯为${team}打进一球。`;
  } else if (goals.length > 1) {
    evidence = `他在本届世界杯为${team}打进${goals.length}球。`;
  } else if (assists.length === 1) {
    evidence = assistOpponents[0]
      ? `他在本届世界杯对${assistOpponents[0]}的比赛中为${team}送出一次助攻。`
      : `他在本届世界杯为${team}送出一次助攻。`;
  } else if (assists.length > 1) {
    evidence = `他在本届世界杯为${team}送出${assists.length}次助攻。`;
  } else {
    evidence = `他在${team}司职${positionLabelZh(profile, fact)}。`;
  }

  return `${evidence}比赛中，他${firstAction}，也${secondAction}。`;
}

function targetTeams(teamsData) {
  const explicit = parseList(getArgValue("teams")).map((teamId) => teamId.toUpperCase());
  if (explicit.length) return explicit;

  const exclude = new Set(parseList(getArgValue("exclude-teams")).map((teamId) => teamId.toUpperCase()));
  if (hasArg("exclude-qf")) {
    for (const teamId of QF_TEAMS) exclude.add(teamId);
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
let updatedProfiles = 0;
let updatedOverrides = 0;

for (const teamId of teams) {
  const overridePath = path.join(overrideDir, `${teamId}.json`);
  const overrideData = existsSync(overridePath) ? await readJson(overridePath) : null;

  for (const [profileName, profile] of Object.entries(profilesData.profiles || {})) {
    if (profile?.teamId !== teamId) continue;
    const fact = facts.get(getUsageKey(teamId, profileName));
    if (!fact) continue;

    const note = zhOnly ? profile.note : englishNote(profileName, profile, fact, teamsById);
    const noteZh = chineseNote(profileName, profile, fact, teamsById);
    const skills = zhOnly ? profile.skills : nextSkills(profile, fact);
    if (!zhOnly) {
      profile.note = note;
      profile.skills = skills;
    }
    profile.noteZh = noteZh;
    updatedProfiles += 1;

    if (!skipOverrides && overrideData?.profiles?.[profileName]) {
      if (!zhOnly) {
        overrideData.profiles[profileName].note = note;
        overrideData.profiles[profileName].skills = skills;
      }
      overrideData.profiles[profileName].noteZh = noteZh;
      updatedOverrides += 1;
    }
  }

  if (overrideData && !skipOverrides && !dryRun) {
    await writeFile(overridePath, `${JSON.stringify(overrideData, null, 2)}\n`);
  }
}

if (!dryRun) {
  await writeFile(profilesPath, `${JSON.stringify(profilesData, null, 2)}\n`);
}

console.log(
  `${dryRun ? "Would refresh" : "Refreshed"} ${updatedProfiles} generated profile notes, ${updatedOverrides} override entries, and ${repairedDisplayNames} canonical display names for ${teams.length} teams.`
);
