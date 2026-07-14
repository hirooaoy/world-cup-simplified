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
  const usagePositionText = usage?.positions ? [...usage.positions.keys()].join(" ") : "";
  const defenderPattern = /\b(?:centre-back|center-back|defender|full-back|right-back|left-back|wing-back|CB|RB|LB|RWB|LWB)\b/i;
  const midfielderPattern = /\b(?:midfielder|midfield|defensive midfielder|central midfielder|attacking midfielder|CM|DM|AM|RM|LM)\b/i;
  const forwardPattern = /\b(?:forward|striker|winger|centre-forward|center-forward|ST|RW|LW)\b/i;

  if (defenderPattern.test(profilePosition)) {
    return "defender";
  }
  if (midfielderPattern.test(profilePosition)) {
    return "midfielder";
  }
  if (forwardPattern.test(profilePosition)) {
    return "forward";
  }

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

function hashText(value) {
  let hash = 0;
  for (const char of String(value || "")) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function renderVariant(seed, variants, values = {}) {
  const choice = variants[hashText(seed) % variants.length];
  return choice(values);
}

function variantSeed(fact, profileName, bucket) {
  return `${fact.teamId}:${profileName}:${bucket}`;
}

function englishNote(profileName, profile, fact, teamsById) {
  const name = shortName(profileName, profile);
  const team = fact.teamName;
  const group = roleGroup(profile, fact);
  const goals = fact.goals || [];
  const assists = fact.assists || [];
  const goalOpponents = opponentNames(goals, teamsById);
  const assistOpponents = opponentNames(assists, teamsById);
  const keyMentioned = fact.keyMentions.length > 0;
  const regular = fact.starts >= 3;
  const bench = fact.substitutionsOn > fact.starts || fact.starts <= 1;
  const topPosition = topCount(fact.positions);
  const note = (bucket, variants, values = {}) =>
    renderVariant(variantSeed(fact, profileName, bucket), variants, { name, team, ...values });

  if (goals.length >= 2 && assists.length) {
    return note("goals-assists", [
      ({ name, team, opponents }) => `${name} has already shaped ${team}'s tournament with goals against ${opponents} and service for teammates. Watch how quickly his next action follows the first touch.`,
      ({ name, team, opponents }) => `${name} has given ${team} both the finish and the pass, including goals against ${opponents}. That double threat is why defenders cannot settle on one answer.`,
      ({ name, team, opponents }) => `${name} has put goals and service into ${team}'s tournament, with finishes against ${opponents}. His card is the next action after the first touch.`
    ], { opponents: listNames(goalOpponents) });
  }
  if (goals.length >= 2) {
    return note("multi-goal", [
      ({ name, team, opponents }) => `${name} has been one of ${team}'s real scoring stories, with goals against ${opponents}. His danger is arriving before defenders have finished sorting the first problem.`,
      ({ name, team, opponents }) => `${name} has already punished ${opponents} for ${team}. The watch point is how little room he needs once the chance is alive.`,
      ({ name, team, opponents }) => `${name} gives ${team} a scorer opponents now have to carry in their heads. His goals against ${opponents} make every loose ball feel heavier.`
    ], { opponents: listNames(goalOpponents) });
  }
  if (goals.length === 1 && assists.length) {
    return note("goal-assist", [
      ({ name, team }) => `${name} has both scored and created for ${team} in this run. He matters because the same movement can become the shot or the pass before it.`,
      ({ name, team }) => `${name} has already given ${team} a goal and a setup in this tournament. Defenders have to read shot and pass at the same time.`,
      ({ name, team }) => `${name} has shown both sides of the attacking job for ${team}. One action can pull the defender, and the next one can decide the chance.`
    ]);
  }
  if (goals.length === 1) {
    return note("one-goal", [
      ({ name, opponent }) => `${name} already has a World Cup goal in this run, against ${opponent}. His card is about finding the moment before the match settles again.`,
      ({ name, team, opponent }) => `${name} is on the scoresheet for ${team}, with his goal coming against ${opponent}. One finish can change how opponents defend the next run.`,
      ({ name, opponent }) => `${name} has already turned one tournament chance into a goal against ${opponent}. Watch whether defenders start giving him the extra step.`,
      ({ name, opponent }) => `${name}'s World Cup has already included a goal against ${opponent}. The next one may come from the same small window before the shape resets.`
    ], { opponent: goalOpponents[0] || "the group" });
  }
  if (assists.length >= 2) {
    return note("multi-assist", [
      ({ name, team, opponents }) => `${name} has been a provider for ${team}, creating goals against ${opponents}. His best moments come when he plays the pass before the defense is ready.`,
      ({ name, team, opponents }) => `${name} has already made goals for ${team} against ${opponents}. Watch the pass before the chance looks obvious.`,
      ({ name, team, opponents }) => `${name}'s tournament has been about supply for ${team}, especially against ${opponents}. He sees the runner before the block finishes shifting.`
    ], { opponents: listNames(assistOpponents) });
  }
  if (assists.length === 1) {
    return note("one-assist", [
      ({ name, team }) => `${name} has already created a goal for ${team} in this tournament. Watch the timing of his release, because the pass often matters more than the carry.`,
      ({ name, team }) => `${name} has one tournament assist in the bank for ${team}. The detail is the touch just before the obvious chance appears.`,
      ({ name, team }) => `${name} has already made a goal happen for ${team}. His value is picking the moment when the defense is still moving.`,
      ({ name, team }) => `${name} has supplied one of ${team}'s tournament goals. The pass matters because it arrives before the defender can fully turn.`
    ]);
  }

  if (group === "goalkeeper") {
    if (regular) {
      return note("gk-regular", [
        ({ name, team }) => `${name} has been ${team}'s goalkeeper through this run. His value is keeping the box calm long enough for the next attack to start cleanly.`,
        ({ name, team }) => `${name} gives ${team} the calmest first pass from the back. Watch how quickly he turns a save or claim into a reset.`,
        ({ name, team }) => `${name} has carried the keeper minutes for ${team}. The card is clean hands, clear restarts, and defenders who do not have to rush.`,
        ({ name, team }) => `${name} is the last voice in ${team}'s defensive shape. When pressure sticks, his job is to make the next action feel simple.`
      ]);
    }
    return note("gk-cover", [
      ({ name, team }) => `${name} is goalkeeper cover for ${team}. The role is readiness: saves, restarts, and no panic if the match suddenly needs him.`,
      ({ name, team }) => `${name} gives ${team} a keeper option if the night turns sideways. His card is about being warm enough for one big save.`,
      ({ name, team }) => `${name} sits behind the starter for ${team}, but the role is not decorative. He has to be ready for crosses, restarts, and a cold first touch.`,
      ({ name, team }) => `${name} is ${team}'s safety net in goal. The job is simple to say and hard to do: enter cold and make the box quieter.`
    ]);
  }

  if (group === "defender") {
    if (regular) {
      return note("defender-regular", [
        ({ name, team }) => `${name} has been part of ${team}'s main defensive shape. He keeps the first duel clean so the team does not spend the next phase chasing.`,
        ({ name, team }) => `${name} has been part of ${team}'s answer without the ball. He matters when the first runner has to be slowed before the whole shape breaks.`,
        ({ name, team }) => `${name} gives ${team} one of the steady pieces in the back line. Watch the small choices: step, hold, or clear the lane.`,
        ({ name, team }) => `${name} is in the quiet-work part of ${team}'s setup. He keeps attacks from becoming scrambles.`
      ]);
    }
    if (bench) {
      return note("defender-cover", [
        ({ name, team }) => `${name} is defensive cover for ${team}'s harder minutes. He is there to win the first contact and make the next pass simple.`,
        ({ name, team }) => `${name} is the kind of defender ${team} can turn to when the match gets narrow. His job is first contact, clean clearance, simple pass.`,
        ({ name, team }) => `${name} gives ${team} cover for the minutes when defending becomes more about nerve than shape. One solid duel can calm the whole line.`,
        ({ name, team }) => `${name} is back-line insurance for ${team}. The card is not glamorous: win the ball, keep the pass safe, reset the shape.`
      ]);
    }
    return note("defender-rotation", [
      ({ name, team }) => `${name} gives ${team} defensive range. His job is to make the opponent's first opening feel smaller than it looked.`,
      ({ name, team }) => `${name} is defensive rotation for ${team}. The watch point is how early he closes the lane that looked open.`,
      ({ name, team }) => `${name} gives ${team} another way to protect the edge of the box. His value shows up when the obvious pass disappears.`
    ]);
  }

  if (group === "midfielder") {
    if (regular) {
      return note("midfield-regular", [
        ({ name, team }) => `${name} has been one of ${team}'s midfield connectors in this tournament. He keeps the next pass alive and helps the team avoid rushed choices.`,
        ({ name, team }) => `${name} has been one of ${team}'s players who keeps possessions from fraying. The detail to watch is how early he knows the next pass.`,
        ({ name, team }) => `${name} is a tempo player for ${team}. He turns crowded touches into cleaner angles for the next runner.`,
        ({ name, team }) => `${name} gives ${team} structure when the ball changes feet. He is often most valuable in the second after a loose touch.`
      ]);
    }
    if (/AM/i.test(topPosition)) {
      return note("midfield-attacking", [
        ({ name, team }) => `${name} is the midfield player ${team} can use when possession needs a sharper touch near the box. He tries to make one small gap matter.`,
        ({ name, team }) => `${name} gives ${team} a different midfield rhythm near the box. He looks for the little pause before the pass or shot.`,
        ({ name, team }) => `${name} is the midfielder ${team} can use when the attack needs a softer touch. One clean receive can change the angle.`,
        ({ name, team }) => `${name} matters for ${team} when possession reaches crowded areas. He is there to turn a small opening into a real choice.`
      ]);
    }
    return note("midfield-cover", [
      ({ name, team }) => `${name} gives ${team} midfield depth for games that get stretched. He helps turn a loose ball into a calmer next pass.`,
      ({ name, team }) => `${name} is midfield insurance for ${team}. He is there for the messy phase: second ball, one calmer touch, then the next pass.`,
      ({ name, team }) => `${name} gives ${team} a way to settle the middle if the match opens up. His best work is making the next decision less hurried.`,
      ({ name, team }) => `${name} is there for the part of the game where spacing gets ugly. For ${team}, that can mean one clean touch before pressure arrives.`
    ]);
  }

  if (group === "forward") {
    if (keyMentioned) {
      return note("forward-key", [
        ({ name, team }) => `${name} is one of ${team}'s named attacking routes in this tournament. His job is to make the first defender move so the finish or final pass can appear.`,
        ({ name, team }) => `${name} is one of ${team}'s attacking paths this tournament. Watch how the first defender reacts when he receives facing goal.`,
        ({ name, team }) => `${name} is in the scouting report now. For ${team}, that means his touches can pull help away from the next runner.`,
        ({ name, team }) => `${name} gives ${team} a route when possession needs to become pressure. He is there to make a defender choose.`
      ]);
    }
    if (regular) {
      return note("forward-regular", [
        ({ name, team }) => `${name} has been part of ${team}'s front-line plan. He stretches defenders first, then looks for the touch that turns pressure into a chance.`,
        ({ name, team }) => `${name} has been part of how ${team} turns territory into chances. Watch the run before the pass, not only the shot after it.`,
        ({ name, team }) => `${name} gives ${team} a front-line rhythm that keeps defenders facing their own goal. His value often starts before the ball reaches him.`,
        ({ name, team }) => `${name} is part of ${team}'s attacking shape, even when he is not the finisher. His movement decides who gets the next clear touch.`
      ]);
    }
    return note("forward-cover", [
      ({ name, team }) => `${name} is an attacking change-up for ${team}. He gives the front line fresh running when the first plan starts to look predictable.`,
      ({ name, team }) => `${name} is the forward ${team} can use when the match needs new legs. His first job is to make tired defenders turn.`,
      ({ name, team }) => `${name} gives ${team} a different attacking speed from the bench. The important touch may be the run that opens space for someone else.`,
      ({ name, team }) => `${name} is attacking depth for ${team}. If the game slows down, he is there to make the back line move again.`
    ]);
  }

  return note("player-fallback", [
    ({ name, team }) => `${name} gives ${team} a tournament role built on clean decisions. Watch whether his first touch settles the team or speeds the next attack.`,
    ({ name, team }) => `${name} is part of ${team}'s tournament depth. His card is about making the simple play feel available under pressure.`,
    ({ name, team }) => `${name} gives ${team} another trusted body for the awkward minutes. One clean decision can keep the match from tilting.`
  ]);
}

function chineseNote(profileName, profile, fact) {
  const team = teamNameZh(fact.teamId, fact.teamName);
  const group = roleGroup(profile, fact);
  const goals = fact.goals || [];
  const assists = fact.assists || [];
  const regular = fact.starts >= 3;
  const keyMentioned = fact.keyMentions.length > 0;
  const note = (bucket, variants, values = {}) =>
    renderVariant(variantSeed(fact, profileName, `zh-${bucket}`), variants, { team, ...values });

  if (goals.length >= 2 && assists.length) {
    return note("goals-assists", [
      ({ team }) => `他已经用进球和助攻影响了${team}的这届世界杯。注意第一脚触球之后，他能多快做出下一步选择。`,
      ({ team }) => `他这届世界杯既为${team}进球，也为队友创造机会。防守者不能只防他的一种选择。`,
      ({ team }) => `他已经为${team}贡献进球和助攻。看点是第一脚之后，第二个动作有多快。`
    ]);
  }
  if (goals.length >= 2) {
    return note("multi-goal", [
      ({ team }) => `他已经成为${team}这届世界杯的重要得分点。防守者还没落好位置时，他往往已经到位。`,
      ({ team }) => `他已经多次为${team}把机会变成进球。看他需要的空间有多小。`,
      ({ team }) => `他是${team}必须优先寻找的得分点。禁区里的二点球也可能被他变成射门。`
    ]);
  }
  if (goals.length === 1 && assists.length) {
    return note("goal-assist", [
      () => `他在这段征程中既进球也创造机会。同一次跑动，可能变成射门，也可能变成射门前的一脚传球。`,
      ({ team }) => `他这届世界杯已经为${team}贡献进球和助攻。防守者必须同时判断射门和分球。`,
      ({ team }) => `他既能为${team}终结机会，也能为队友创造机会。一脚拉开防守，下一脚就可能决定进攻。`
    ]);
  }
  if (goals.length === 1) {
    return note("one-goal", [
      () => `他这届世界杯已经有进球。他的看点是在比赛重新稳定前，先找到属于自己的那个瞬间。`,
      ({ team }) => `他已经为${team}攻入一球。一次终结会改变对手下一次防他的方式。`,
      () => `他已经把一次世界杯机会变成进球。接下来要看防守者会不会因此贴得更紧。`,
      () => `他的世界杯已经有了进球。下一次机会也许仍来自阵型重新站稳前的那一小段时间。`
    ]);
  }
  if (assists.length >= 2) {
    return note("multi-assist", [
      ({ team }) => `他已经多次为${team}送出助攻。他最好的时刻，常常来自防线还没准备好时的那一脚传球。`,
      ({ team }) => `他已经多次帮${team}制造进球。看的是明显机会出现前的那脚传球。`,
      ({ team }) => `他这届赛事的价值在于为${team}组织进攻。他能在防线移动还没完成时看见队友的跑动。`
    ]);
  }
  if (assists.length === 1) {
    return note("one-assist", [
      ({ team }) => `他这届世界杯已经为${team}送出助攻。注意出球时机，因为那一脚传球往往比继续带球更重要。`,
      ({ team }) => `他已经为${team}送出一次助攻。重点是明显机会出现前的那次触球。`,
      ({ team }) => `他已经帮${team}制造过进球。价值在于防线还在移动时，选对出球瞬间。`,
      ({ team }) => `他已经参与了${team}的一粒世界杯进球。那脚传球的意义，是在防守者完全转身前到达。`
    ]);
  }

  if (group === "goalkeeper") {
    return regular
      ? note("gk-regular", [
          ({ team }) => `他是${team}这段征程中的门将。价值在于让禁区保持冷静，并让下一次进攻能干净开始。`,
          ({ team }) => `他是${team}后场组织的第一步。看他如何把扑救或摘球变成一次稳妥的重新组织。`,
          ({ team }) => `他在${team}多次出任门将。重点看接球是否稳妥、开球是否清楚，以及如何指挥身前防线。`,
          ({ team }) => `他是${team}指挥防线的最后一道声音。对手持续施压时，他要让禁区里的每个决定更简单。`
        ])
      : note("gk-cover", [
          ({ team }) => `他是${team}的替补门将。任务是随时准备好扑救和开球，并在突然登场时保持冷静。`,
          ({ team }) => `他给${team}保留另一个门将选择。真正需要他时，重点可能就是一次大扑救。`,
          ({ team }) => `他在${team}首发门将身后等待，但这个角色不是装饰。他要随时处理传中、开球，并在替补登场后马上进入节奏。`,
          ({ team }) => `他是${team}门线上的后备选择。临时登场后，也要尽快让禁区恢复秩序。`
        ]);
  }
  if (group === "defender") {
    return regular
      ? note("defender-regular", [
          ({ team }) => `他是${team}主力防守体系的一员。他要处理好第一下对抗，避免球队随后只能追着球跑。`,
          ({ team }) => `他是${team}无球防守的重要一环。先拖慢第一个跑动，整体阵型才不容易散。`,
          ({ team }) => `他是${team}后防线的稳定成员。看的是那些小选择：上抢、站住，还是先封住传球线路。`,
          ({ team }) => `他在${team}体系里做的是不显眼但重要的工作，让对手的进攻不容易制造混乱。`
        ])
      : note("defender-cover", [
          ({ team }) => `他是${team}在艰难阶段可用的后卫轮换。他要赢下第一下对抗，并让下一脚传球简单起来。`,
          ({ team }) => `他是${team}在比赛进入拉锯时可以使用的后卫。任务是赢下第一下对抗、果断解围、简单出球。`,
          ({ team }) => `他能在${team}需要守住比分时提供保障。一次扎实对抗就能让整条防线冷静下来。`,
          ({ team }) => `他是${team}后防线的保险。任务并不花哨：赢下对抗、稳妥传球、迅速回到位置。`
        ]);
  }
  if (group === "midfielder") {
    return regular
      ? note("midfield-regular", [
          ({ team }) => `他是${team}这届赛事中的中场连接点之一，让球队始终有安全的下一脚选择。`,
          ({ team }) => `他是${team}让控球不散掉的球员之一。看点是他多早就知道下一脚传给谁。`,
          ({ team }) => `他帮助${team}控制节奏。拥挤区域里的触球，能为下一名队友创造更舒服的接球角度。`,
          ({ team }) => `他让${team}在攻防转换时更有结构。最有价值的往往是刚刚夺回球权后的那一秒。`
        ])
      : note("midfield-cover", [
          ({ team }) => `他给${team}提供中场轮换，适合攻防被拉开的时候。他能把二点球处理成更稳妥的下一脚。`,
          ({ team }) => `他是${team}的中场保险。那些混乱阶段里，他要抢第二点、稳一下，再把球送出去。`,
          ({ team }) => `他给${team}一种在攻防拉开后稳住中路的办法。最好的工作，是让下一次决定没那么仓促。`,
          ({ team }) => `他适合中路变得拥挤的时间段。对${team}来说，一次稳妥触球就能缓解压力。`
        ]);
  }
  if (group === "forward") {
    return keyMentioned
      ? note("forward-key", [
          ({ team }) => `他是${team}这届赛事的主要进攻选择之一。他先让第一名防守者移动，再寻找射门或最后一传。`,
          ({ team }) => `他是${team}这届赛事的主要进攻点之一。看他面向球门接球时，第一名防守者如何应对。`,
          ({ team }) => `他已经成为对手赛前必须注意的人。对${team}来说，他的触球能吸引协防，为队友的跑动打开空间。`,
          ({ team }) => `他给${team}一种把控球变成威胁的办法，迫使防守者做出选择。`
        ])
      : note("forward-cover", [
          ({ team }) => `他是${team}前场计划的一部分。他先拉扯防守者，再寻找把压力变成机会的触球。`,
          ({ team }) => `他是${team}需要增加速度时可以使用的前锋。第一项工作，是迫使疲劳的后卫转身回追。`,
          ({ team }) => `他给${team}替补席上的另一种进攻速度。有时关键触球，是那次帮队友拉开空间的跑动。`,
          ({ team }) => `他是${team}的前锋轮换。如果比赛慢下来，他要让对方后防线重新移动。`
        ]);
  }
  return note("player-fallback", [
    ({ team }) => `他在${team}的价值来自稳妥决定。看他的第一脚触球，是让球队稳下来，还是让下一次进攻加速。`,
    ({ team }) => `他是${team}阵容轮换的一部分。压力下仍能找到简单选择，就是他的价值。`,
    ({ team }) => `他给${team}在困难阶段多一个可信选择。一次正确决定，就能避免局面失控。`
  ]);
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
  `${dryRun ? "Would refresh" : "Refreshed"} ${updatedProfiles} generated profile notes and ${updatedOverrides} override entries for ${teams.length} teams.`
);
