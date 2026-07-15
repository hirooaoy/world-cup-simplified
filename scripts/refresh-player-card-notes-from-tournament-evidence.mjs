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

function skillInsight(skill, group) {
  const value = cleanSkill(skill).toLowerCase();
  const insight = (quality, action, qualityZh, actionZh) => ({ quality, action, qualityZh, actionZh });

  if (/penalt(?:y|ies).*(?:save|stop|presence)|(?:save|stop).*penalt/.test(value)) {
    return insight("the patience to read a penalty taker's last movement", "waits for the strike before committing", "耐心判断点球手最后一下动作", "等到对方触球前再做扑救选择");
  }
  if (/shot.?stop|reaction|reflex|one-on-one sav|quick saves?|reach/.test(value) && group === "goalkeeper") {
    return insight("sharp reactions backed by early positioning", "sets his feet before the shot and reacts without an extra step", "提前站位后的快速反应", "在射门前站稳脚步，再用最少动作完成扑救");
  }
  if (/cross.*(?:claim|handl|command)|claim.*cross|box command|penalty-area command|high balls?|set-piece control/.test(value) && group === "goalkeeper") {
    return insight("command of the crowded space around goal", "judges when to leave his line and takes pressure off his defenders", "掌控门前拥挤空间的能力", "判断何时出击，替后卫化解高球压力");
  }
  if (/distribution|restart|throwing|goal kicks?|keeper passing|short build-up|long distribution/.test(value) && group === "goalkeeper") {
    return insight("turning a save into the first pass of an attack", "chooses the simple restart before pressure can close in", "把一次扑救变成进攻第一传", "在逼抢靠近前选择最稳妥的出球方式");
  }
  if (/sweeper|high starting|outside.*box/.test(value) && group === "goalkeeper") {
    return insight("starting high enough to protect the space behind his defense", "leaves his line early when a through ball escapes the back line", "用靠前站位保护后防身后空间", "直塞球越过后防时及时出击");
  }
  if (/goalkeeper (?:depth|experience|leadership)|veteran goalkeeping|tournament calm/.test(value)) {
    return insight("staying ready through long quiet spells", "keeps his decisions calm when a sudden save is required", "在长时间无事可做后依然保持专注", "突然需要扑救时仍能冷静判断");
  }
  if (/tournament experience|veteran|experience/.test(value)) {
    return insight("calm decisions shaped by experience in high-pressure moments", "recognizes when to slow the play and when to take the risk", "高压时刻由经验带来的冷静判断", "判断何时放慢节奏，何时承担风险");
  }
  if (/set.?piece|dead-ball|free.?kick|corner/.test(value)) {
    return insight("repeatable technique on dead balls", "varies the height and pace of his delivery", "定位球上稳定而多变的脚法", "通过改变落点和球速寻找防线最薄弱的区域");
  }
  if (/near.?post/.test(value)) {
    return insight("the timing of his run across the nearest defender", "attacks the near-post lane before the marker can turn", "抢到近门柱身前的跑动时机", "在盯防者转身前冲向近门柱线路");
  }
  if (/penalty[- ]?(?:box|area) timing|box timing|striker movement|box movement|penalty[- ]?(?:box|area) movement/.test(value)) {
    return insight("waiting for a defender's attention to shift before moving", "arrives in the box late enough to be difficult to track", "等防守者注意力转移后再启动", "稍晚进入禁区，让盯防者难以持续跟住");
  }
  if (/box presence|aerial target|target-forward power|target play/.test(value)) {
    return insight("giving centre-backs a physical problem they cannot ignore", "pins a defender and creates room for the next runner", "让中后卫无法忽视的身体支点作用", "牵制一名后卫，为后插上的队友腾出空间");
  }
  if (/left-footed finish|right-footed finish|first-time finish|quick finish|inside finish|wide finish|aerial finish|box finish|penalty[- ]?(?:box|area) finish|finishing|goal threat|inside shooting|quick shooting|shooting/.test(value)) {
    const foot = /left-foot/.test(value) ? "left foot" : /right-foot/.test(value) ? "right foot" : "stronger foot";
    const footZh = /left-foot/.test(value) ? "左脚" : /right-foot/.test(value) ? "右脚" : "惯用脚";
    return insight("creating a clean shot before the defense can reset", `shifts onto his ${foot} and shoots with little backlift`, "在防线重组前制造干净射门", `把球调整到${footZh}，用很小的摆腿迅速完成射门`);
  }
  if (/long.?range|long shooting|shooting range|distance shooting/.test(value)) {
    return insight("making defenders respect the shot from outside the box", "uses a clean first touch to open a shooting lane from distance", "让防守者必须提防禁区外远射", "用干净的第一脚触球打开远射线路");
  }
  if (/chance pass|chance creat|creative pass|final pass|final ball|through ball|playmak|vision|assist|creation|invention/.test(value)) {
    return insight("seeing the decisive pass one beat before it opens", "draws a defender in and releases the runner behind him", "比防线早一步看到决定性的传球", "先吸引防守者靠近，再把球送到其身后的跑动线路");
  }
  if (/overlap|wing-back timing|forward support|box-area support/.test(value)) {
    return insight("choosing the moment to join an attack from deep", "waits until the wide defender looks inside before running beyond him", "从后场加入进攻的启动时机", "等边路防守者看向内侧后再从外线套上");
  }
  if (/cross prevention|stop.*cross/.test(value)) {
    return insight("closing the crossing angle without losing the runner", "gets close enough to block the delivery without diving in", "封住传中角度时仍不丢掉跑动者", "靠近到能封堵传中，但不贸然出脚");
  }
  if (/cross|service|delivery/.test(value)) {
    return insight("delivering the ball without needing much space", "looks up before crossing and picks a runner rather than an empty area", "在很小空间里也能送出传中的能力", "传中前先观察，再把球送向具体跑动者");
  }
  if (/dribbl|ball carrying|direct carr|progressive carr|close control|tight-space|take-ons?|flair/.test(value)) {
    return insight("changing direction without losing control of the ball", "draws the first challenge, then carries through the gap", "变向时仍把球控制在脚下", "主动吸引第一次上抢，再带球穿过由此出现的空当");
  }
  if (/run.*behind|channel run|counter run|transition run|inside run|diagonal run|vertical run|forward run|wide-to-inside|forward movement|late run|box arrival|arrival|off-ball|movement/.test(value)) {
    return insight("starting his run while defenders are still watching the ball", "moves through the gap between full-back and centre-back", "在防守者仍盯着球时提前启动", "从边后卫与中后卫之间的空当穿过");
  }
  if (/acceleration|pace|speed|direct running|wide running|counter threat|transition (?:threat|terror)|burst|explosive/.test(value)) {
    if (group === "defender") return insight("recovery speed when the defensive line is exposed", "turns early and closes the runner before the box", "防线暴露后的回追速度", "提前转身，在对手进入禁区前缩短距离");
    if (group === "midfielder") return insight("carrying momentum through open midfield", "pushes the ball beyond the first challenge and accelerates after it", "带球穿过开放中场的推进力", "把球趟过第一道上抢后再加速");
    return insight("explosive speed once open grass appears", "changes pace after the defender has committed his feet", "看到空当后的爆发速度", "等防守者脚步固定后突然变速");
  }
  if (!/press resistance/.test(value) && /counter-press|\bpressing\b|\bpress\b|work rate|defensive work|intensity|energy/.test(value)) {
    return insight("pressing with a clear target rather than simply chasing", "angles his run to block the easy pass as he closes the ball", "带着明确目标逼抢，而不是只追着球跑", "接近持球人时调整路线，同时封住最简单的传球");
  }
  if (/hold-up|forward linking|link play|combination|quick combinations|wall pass/.test(value)) {
    return insight("making the next teammate's action easier", "protects the ball with his body and returns it into a runner's path", "让队友下一步处理更轻松", "用身体护住球，再把球送回跑动队友的线路");
  }
  if (/aerial|heading|headers?|high-ball/.test(value)) {
    return insight("reading the flight of the ball before the duel begins", "meets the ball early instead of waiting underneath it", "在争顶前先判断球的飞行轨迹", "主动在最合适的高点迎球，而不是站在原地等球落下");
  }
  if (/recover/.test(value)) {
    return insight("recovering position without panicking after the first line is broken", "turns early and protects the route toward goal", "第一道防线被突破后仍能冷静回位", "提前转身，优先封住通向球门的路线");
  }
  if (/track|mark|back-post/.test(value)) {
    return insight("staying connected to runners when the ball moves elsewhere", "checks the runner over his shoulder before the final pass arrives", "球转移到别处时仍能跟住无球跑动", "最后一传到来前回头确认跑动者的位置");
  }
  if (/duel|tackl|ball winning|intercept|aggress|combative|bite/.test(value)) {
    return insight("choosing the moment of contact instead of diving in", "waits for a loose touch and then steps through the ball", "选择身体接触时机，而不是贸然上抢", "等对手触球稍大后再连人带球一起压上");
  }
  if (/second ball|loose ball/.test(value)) {
    return insight("reacting first when a duel leaves the ball free", "positions himself for the next touch before the first contest is over", "对抗后球权松动时的第一反应", "第一次争抢还没结束，就先为下一脚触球站好位置");
  }
  if (/defend|cover|clear|block|screen|protect|discipline|compact/.test(value)) {
    const area = group === "midfielder" ? "the passing lane into midfield" : "the route into the box";
    const areaZh = group === "midfielder" ? "通向中场核心区域的传球线路" : "进入禁区的路线";
    return insight("protecting the most dangerous space before stepping to the ball", `holds ${area} until support arrives`, "先保护最危险空间，再考虑上抢", `守住${areaZh}，直到队友能对持球人施压`);
  }
  if (/between-lines|pocket|receiv|first touch|turns?|interior/.test(value)) {
    return insight("receiving in tight spaces with his next action already planned", "opens his body on the first touch so he can play forward", "在狭小空间接球前就想好下一步", "第一脚触球时打开身体，准备向前处理");
  }
  if (/tempo|rhythm|press resistance|pressure escape|circulation|short pass|simple pass|possession|ball retention|control|calm|composure|security/.test(value)) {
    return insight("keeping the ball calm when pressure arrives", "uses his first touch to escape pressure before choosing the pass", "压力到来时仍能让球保持稳定", "第一脚触球先摆脱压力，再选择传球方向");
  }
  if (/pass|progression|build-up|switching|range|first-pass/.test(value)) {
    return insight("moving the defense with the weight and angle of his passing", "plays through nearby pressure instead of around it", "用传球的力度和角度移动防线", "穿过最近一层逼抢，而不总是绕开压力");
  }
  if (/leadership|organi[sz]|line control|communication|command|authority/.test(value)) {
    return insight("organizing teammates before danger becomes obvious", "keeps the line connected with constant small instructions", "在危险出现前组织好队友", "用持续而简短的提醒保持整条防线连接");
  }
  if (/intelligen|awareness|reading|decision|timing|positioning|tactical/.test(value)) {
    return insight("reading the next phase before the space fully opens", "adjusts his position early enough to make the difficult action look simple", "在空当完全出现前读懂下一阶段", "提前调整位置，让困难处理看起来简单");
  }
  if (/versatil|depth|cover|upside|mobility|range/.test(value)) {
    return insight("the flexibility to fill different roles without breaking the team's shape", "changes position while keeping his priorities simple", "在多个角色之间切换时仍保持球队结构", "改变起始位置，但始终坚持清晰简单的处理原则");
  }
  if (/power|strength|physical/.test(value)) {
    return insight("using strength without slowing the next action", "absorbs contact and keeps the ball close enough to continue forward", "在对抗中用力量但不拖慢下一步", "承受身体接触后仍把球留在可继续推进的位置");
  }

  if (group === "goalkeeper") return insight("staying balanced until the shot reveals its direction", "keeps his feet active and makes the save with the fewest movements", "在射门方向明确前保持身体平衡", "保持脚下轻快，用最少动作完成扑救");
  if (group === "defender") return insight("making the safer decision before a duel becomes an emergency", "protects the route to goal and challenges only when the touch is loose", "在对抗变成险情前做出更安全的选择", "先封住通向球门的路线，再等待对手触球失误时上抢");
  if (group === "midfielder") return insight("creating a better angle for the next pass", "moves after releasing the ball so the receiver still has support", "为下一脚传球制造更好的角度", "出球后继续移动，让接球队友始终有支援");
  return insight("making purposeful movement away from the ball", "changes his position early enough to give the passer a clear target", "用有目的的无球移动创造接应点", "提前改变位置，为传球队友提供清晰目标");
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

function playerInsights(profile, fact) {
  const group = roleGroup(profile, fact);
  const skills = nextSkills(profile, fact);
  const insights = [];
  for (const skill of [...skills, ...roleSkills(profile, fact)]) {
    const insight = skillInsight(skill, group);
    if (insights.length && insights.some((existing) => actionsOverlap(existing.action, insight.action))) continue;
    insights.push(insight);
    if (insights.length === 3) break;
  }
  return insights;
}

function stableVariant(value, count) {
  let hash = 0;
  for (const char of String(value || "")) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return count ? hash % count : 0;
}

function englishNote(profileName, profile, fact) {
  const name = shortName(profileName, profile);
  const [primary, second, third] = playerInsights(profile, fact);
  const actionOne = second?.action || defaultActions(roleGroup(profile, fact))[0];
  const actionTwo = third?.action || defaultActions(roleGroup(profile, fact))[1];
  const variants = [
    `${name} stands out for ${primary.quality}. He ${actionOne}. He ${actionTwo}.`,
    `${name}'s signature is ${primary.quality}. He ${actionOne}. He ${actionTwo}.`,
    `Watch ${name} for ${primary.quality}. He ${actionOne}. He ${actionTwo}.`,
    `${name}'s edge is ${primary.quality}. He ${actionOne}. He ${actionTwo}.`,
    `${name} is defined by ${primary.quality}. He ${actionOne}. He ${actionTwo}.`
  ];
  return variants[stableVariant(profileName, variants.length)];
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

function chineseNote(profileName, profile, fact) {
  const [primary, second, third] = playerInsights(profile, fact);
  const group = roleGroup(profile, fact);
  const fallbacks = defaultActionsZh(group);
  const actionOne = second?.actionZh || fallbacks[0];
  const actionTwo = third?.actionZh || fallbacks[1];
  const variants = [
    `他的突出特点是${primary.qualityZh}。他会${actionOne}。他也会${actionTwo}。`,
    `他的比赛方式建立在${primary.qualityZh}上。他会${actionOne}。他也会${actionTwo}。`,
    `要看懂他的作用，关键是${primary.qualityZh}。留意他如何${actionOne}。他也会${actionTwo}。`,
    `他最特别的地方是${primary.qualityZh}。他会${actionOne}。他也会${actionTwo}。`,
    `他靠${primary.qualityZh}与同位置球员拉开差异。他会${actionOne}。他也会${actionTwo}。`
  ];
  return variants[stableVariant(profileName, variants.length)];
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

    const overrideProfile = overrideData?.profiles?.[profileName];
    const copyProfile = Array.isArray(overrideProfile?.skills) && overrideProfile.skills.length
      ? { ...profile, skills: overrideProfile.skills }
      : profile;
    const note = zhOnly ? profile.note : englishNote(profileName, copyProfile, fact);
    const noteZh = chineseNote(profileName, copyProfile, fact);
    const skills = zhOnly ? profile.skills : nextSkills(copyProfile, fact);
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
