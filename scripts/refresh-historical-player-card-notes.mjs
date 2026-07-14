#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayerName } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const profilesPath = path.join(dataDir, "historical-player-profiles.json");
const historyPath = path.join(dataDir, "history.json");
const args = process.argv.slice(2);

const TARGET_SPOTLIGHTS = new Map([
  [
    "Lionel Messi / Argentina / 2022",
    "Messi's 2022 card is the whole Argentina story in miniature. He scored 7 times, including twice in the final, and carried the pressure into the shootout win."
  ],
  [
    "Kylian Mbappé / France / 2022",
    "Mbappé made France's final feel alive until the last kick. His eight-goal tournament finished with a hat trick against Argentina."
  ],
  [
    "Ángel Di María / Argentina / 2022",
    "Di Maria gave Argentina the final's cleanest early release. His goal against France made the first half feel like Argentina had found the perfect extra runner."
  ],
  [
    "Emiliano Martínez / Argentina / 2022",
    "Martínez is the calm behind Argentina's most chaotic 2022 nights. His card is about the goalkeeper who kept the run from feeling finished too early."
  ],
  [
    "Luka Modrić / Croatia / 2018",
    "Modrić made Croatia's 2018 run feel calmer than the matches around him. His card is control, legs, and the next pass after the scramble."
  ],
  [
    "Kylian Mbappé / France / 2018",
    "Mbappé was the speed that made France frightening in 2018. His four-goal tournament included two against Argentina and one in the final."
  ],
  [
    "Antoine Griezmann / France / 2018",
    "Griezmann was France's scoreboard pressure in 2018. Four goals, three from the spot, kept opponents chasing the game state as much as the ball."
  ],
  [
    "Paul Pogba / France / 2018",
    "Pogba's 2018 card belongs to the final stage. His goal against Croatia turned France's control into something the scoreboard could not ignore."
  ],
  [
    "Ivan Perišić / Croatia / 2018",
    "Perisic kept Croatia's 2018 attack breathing in the biggest moments. He scored in the semi-final and again in the final."
  ],
  [
    "Guillermo Stábile / Argentina / 1930",
    "Stábile is the first World Cup's pure scoring card. Eight goals in four matches made Argentina's route feel fast and fragile at once."
  ],
  [
    "Pedro Cea / Uruguay / 1930",
    "Cea gives Uruguay's first title run its scoring spine. Five goals, including a semi-final hat trick, kept the hosts moving toward the final."
  ],
  [
    "Héctor Castro / Uruguay / 1930",
    "Castro's 1930 card is simple and enormous. He scored in Uruguay's opener against Peru and again in the final against Argentina."
  ],
  [
    "Lucien Laurent / France / 1930",
    "Laurent owns the first goal in World Cup history. In this archive, that single France strike against Mexico is the point of the card."
  ],
  [
    "Bert Patenaude / United States / 1930",
    "Patenaude gave the first World Cup one of its first scoring legends. Four goals across two matches made the United States run feel bigger than its finish."
  ]
]);

const TARGET_SPOTLIGHTS_ZH = new Map([
  [
    "Lionel Messi / Argentina / 2022",
    "梅西的2022卡片几乎就是阿根廷故事的缩影。他打进7球，包括决赛梅开二度，并把压力一路带到点球大战胜利。"
  ],
  [
    "Kylian Mbappé / France / 2022",
    "姆巴佩让法国的决赛悬念一直活到最后。他以8球结束赛事，其中包括对阿根廷的帽子戏法。"
  ],
  [
    "Ángel Di María / Argentina / 2022",
    "迪马利亚给了阿根廷决赛上半场最清楚的释放点。他对法国的进球，让比赛一度像是阿根廷找到了完美的额外跑动。"
  ],
  [
    "Emiliano Martínez / Argentina / 2022",
    "马丁内斯是阿根廷2022那些混乱夜晚背后的冷静。这张卡讲的是那个让征程没有太早结束的门将。"
  ],
  [
    "Luka Modrić / Croatia / 2018",
    "莫德里奇让克罗地亚的2018征程比比赛本身更冷静。这张卡是控制、体能，以及混乱之后的下一脚传球。"
  ],
  [
    "Kylian Mbappé / France / 2018",
    "姆巴佩是法国2018最吓人的速度。他那届打进4球，包括对阿根廷的两个进球和决赛一球。"
  ],
  [
    "Antoine Griezmann / France / 2018",
    "格列兹曼是法国2018的比分压力。4个进球里有3个点球，让对手追的不只是球，也是比赛状态。"
  ],
  [
    "Paul Pogba / France / 2018",
    "博格巴的2018卡片属于决赛舞台。他对克罗地亚的进球，把法国的控制变成了比分上无法忽视的东西。"
  ],
  [
    "Ivan Perišić / Croatia / 2018",
    "佩里希奇让克罗地亚2018的进攻在最大场面里仍有呼吸。他在半决赛进球，也在决赛进球。"
  ],
  [
    "Guillermo Stábile / Argentina / 1930",
    "斯塔比莱是第一届世界杯最纯粹的得分卡。4场8球，让阿根廷的路线既快速又脆弱。"
  ],
  [
    "Pedro Cea / Uruguay / 1930",
    "塞亚给乌拉圭首冠征程提供了得分脊梁。5个进球，包括半决赛帽子戏法，让东道主一路走向决赛。"
  ],
  [
    "Héctor Castro / Uruguay / 1930",
    "卡斯特罗的1930卡片简单但巨大。他在乌拉圭对秘鲁的首战进球，也在对阿根廷的决赛进球。"
  ],
  [
    "Lucien Laurent / France / 1930",
    "洛朗拥有世界杯历史上的第一个进球。在这个档案里，他对墨西哥的那粒法国进球就是这张卡的意义。"
  ],
  [
    "Bert Patenaude / United States / 1930",
    "帕特诺德给第一届世界杯留下了早期得分传奇之一。两场4球，让美国队的征程比最终名次更大。"
  ]
]);

const TEAM_ZH = new Map([
  ["Algeria", "阿尔及利亚"],
  ["Angola", "安哥拉"],
  ["Argentina", "阿根廷"],
  ["Australia", "澳大利亚"],
  ["Austria", "奥地利"],
  ["Belgium", "比利时"],
  ["Bolivia", "玻利维亚"],
  ["Bosnia-Herzegovina", "波黑"],
  ["Brazil", "巴西"],
  ["Bulgaria", "保加利亚"],
  ["Cameroon", "喀麦隆"],
  ["Canada", "加拿大"],
  ["Chile", "智利"],
  ["China", "中国"],
  ["Colombia", "哥伦比亚"],
  ["Costa Rica", "哥斯达黎加"],
  ["Croatia", "克罗地亚"],
  ["Cuba", "古巴"],
  ["Czech Republic", "捷克共和国"],
  ["Czechoslovakia", "捷克斯洛伐克"],
  ["Côte d'Ivoire", "科特迪瓦"],
  ["Denmark", "丹麦"],
  ["Dutch East Indies", "荷属东印度"],
  ["East Germany", "东德"],
  ["Ecuador", "厄瓜多尔"],
  ["Egypt", "埃及"],
  ["El Salvador", "萨尔瓦多"],
  ["England", "英格兰"],
  ["France", "法国"],
  ["Germany", "德国"],
  ["Ghana", "加纳"],
  ["Greece", "希腊"],
  ["Haiti", "海地"],
  ["Honduras", "洪都拉斯"],
  ["Hungary", "匈牙利"],
  ["Iceland", "冰岛"],
  ["Iran", "伊朗"],
  ["Iraq", "伊拉克"],
  ["Ireland", "爱尔兰"],
  ["Israel", "以色列"],
  ["Italy", "意大利"],
  ["Jamaica", "牙买加"],
  ["Japan", "日本"],
  ["Kuwait", "科威特"],
  ["Mexico", "墨西哥"],
  ["Morocco", "摩洛哥"],
  ["Netherlands", "荷兰"],
  ["New Zealand", "新西兰"],
  ["Nigeria", "尼日利亚"],
  ["North Korea", "朝鲜"],
  ["Northern Ireland", "北爱尔兰"],
  ["Norway", "挪威"],
  ["Panama", "巴拿马"],
  ["Paraguay", "巴拉圭"],
  ["Peru", "秘鲁"],
  ["Poland", "波兰"],
  ["Portugal", "葡萄牙"],
  ["Qatar", "卡塔尔"],
  ["Romania", "罗马尼亚"],
  ["Russia", "俄罗斯"],
  ["Saudi Arabia", "沙特阿拉伯"],
  ["Scotland", "苏格兰"],
  ["Senegal", "塞内加尔"],
  ["Serbia", "塞尔维亚"],
  ["Serbia and Montenegro", "塞尔维亚和黑山"],
  ["Slovakia", "斯洛伐克"],
  ["Slovenia", "斯洛文尼亚"],
  ["South Africa", "南非"],
  ["South Korea", "韩国"],
  ["Soviet Union", "苏联"],
  ["Spain", "西班牙"],
  ["Sweden", "瑞典"],
  ["Switzerland", "瑞士"],
  ["Togo", "多哥"],
  ["Trinidad and Tobago", "特立尼达和多巴哥"],
  ["Tunisia", "突尼斯"],
  ["Turkey", "土耳其"],
  ["Ukraine", "乌克兰"],
  ["United Arab Emirates", "阿联酋"],
  ["United States", "美国"],
  ["Uruguay", "乌拉圭"],
  ["USA", "美国"],
  ["Wales", "威尔士"],
  ["West Germany", "西德"],
  ["Yugoslavia", "南斯拉夫"],
  ["Zaire", "扎伊尔"]
]);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function getArgValue(name) {
  const flag = `--${name}=`;
  const arg = args.find((item) => item.startsWith(flag));
  return arg ? arg.slice(flag.length) : "";
}

function hasArg(name) {
  return args.includes(`--${name}`) || args.some((item) => item.startsWith(`--${name}=`));
}

function parseYears(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((year) => Number.isInteger(year));
}

function normalizeTeamName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function factKey(name, teamName, year) {
  return [normalizePlayerName(name), normalizeTeamName(teamName), year].join("|");
}

function shortName(profile) {
  const display = String(profile?.displayName || profile?.name || "").trim();
  const parts = display.split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts.at(-1).replace(/[.,]$/, "") : display || "This player";
}

function roleLabel(position = "") {
  if (/goalkeeper/i.test(position)) return "goalkeeper";
  if (/defender|back/i.test(position)) return "defender";
  if (/midfielder|midfield/i.test(position)) return "midfielder";
  if (/forward|striker|winger/i.test(position)) return "forward";
  return "player";
}

function teamZh(value = "") {
  return TEAM_ZH.get(String(value || "").trim()) || String(value || "").trim() || "球队";
}

function roleLabelZh(position = "") {
  if (/goalkeeper/i.test(position)) return "门将";
  if (/defender|back/i.test(position)) return "后卫";
  if (/midfielder|midfield/i.test(position)) return "中场";
  if (/forward|striker|winger/i.test(position)) return "前锋";
  return "球员";
}

function possessive(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  return /s$/i.test(text) ? `${text}'` : `${text}'s`;
}

function roleStructure(role) {
  if (role === "goalkeeper") return "goalkeeping setup";
  if (role === "defender") return "back line";
  if (role === "midfielder") return "midfield";
  if (role === "forward") return "front line";
  return "squad";
}

function roleStructureZh(role) {
  if (role === "goalkeeper") return "门将位置";
  if (role === "defender") return "后防线";
  if (role === "midfielder") return "中场";
  if (role === "forward") return "锋线";
  return "阵容";
}

function isStarter(profile, fact) {
  if (Array.isArray(profile.skills) && profile.skills.some((skill) => /^starter$/i.test(skill))) {
    return true;
  }
  return fact.keyEvents.some((event) => /\bstarted\b/i.test(event.note));
}

function upperFirst(value) {
  const text = String(value || "").trim();
  return text ? `${text[0].toLocaleUpperCase("en-US")}${text.slice(1)}` : "";
}

function lowerFirst(value) {
  const text = String(value || "").trim();
  return text ? `${text[0].toLocaleLowerCase("en-US")}${text.slice(1)}` : "";
}

function stableHash(value) {
  let hash = 0;
  for (const char of String(value || "")) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function chooseZhVariant(profile, bucket, variants) {
  const seed = `${profile.profileKey || profile.name || "player"}:${bucket}`;
  return variants[stableHash(seed) % variants.length]();
}

const GENERIC_ROLE_SKILL_REPLACEMENTS = new Map([
  ["Goalkeeper", "Shot stopping"],
  ["Defender", "Physical duels"],
  ["Midfielder", "Tempo control"],
  ["Forward", "Runs in behind"]
]);

function refinedSkills(profile) {
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  return [...new Set(skills.map((skill) => GENERIC_ROLE_SKILL_REPLACEMENTS.get(skill) || skill).filter(Boolean))];
}

function listItems(items, limit = 2) {
  const clean = [...new Set(items.filter(Boolean))].slice(0, limit);
  if (!clean.length) return "";
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join(", ")} and ${clean.at(-1)}`;
}

function listItemsZh(items, limit = 2) {
  const clean = [...new Set(items.filter(Boolean))].slice(0, limit);
  if (!clean.length) return "";
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join("、")}和${clean.at(-1)}`;
}

function fixtureTeams(fixture) {
  return {
    home: fixture.homeSlot,
    away: fixture.awaySlot
  };
}

function opponentName(fixture, side) {
  const teams = fixtureTeams(fixture);
  return side === "home" ? teams.away : teams.home;
}

function teamScore(fixture, side) {
  const score = fixture.score || {};
  return Number(score[side]);
}

function opponentScore(fixture, side) {
  return teamScore(fixture, side === "home" ? "away" : "home");
}

function resultPhrase(fixture, side, teamName) {
  const scoreFor = teamScore(fixture, side);
  const scoreAgainst = opponentScore(fixture, side);
  const scoreText =
    Number.isFinite(scoreFor) && Number.isFinite(scoreAgainst) ? `${scoreFor}-${scoreAgainst}` : "";
  const winner = fixture.winner || "";
  const won = normalizeTeamName(winner) === normalizeTeamName(teamName);
  const lost = winner && normalizeTeamName(winner) !== normalizeTeamName(teamName) && !/^draw$/i.test(winner);
  const outcome = won ? "win" : lost ? "loss" : "draw";
  const penalties = fixture.scoreDetails?.penalties;

  if (penalties && Number.isFinite(Number(penalties.home)) && Number.isFinite(Number(penalties.away))) {
    const pensFor = side === "home" ? penalties.home : penalties.away;
    const pensAgainst = side === "home" ? penalties.away : penalties.home;
    return `${scoreText} shootout ${outcome}, ${pensFor}-${pensAgainst} pens`;
  }

  return scoreText ? `${scoreText} ${outcome}` : outcome;
}

function resultPhraseZh(fixture, side, teamName) {
  const scoreFor = teamScore(fixture, side);
  const scoreAgainst = opponentScore(fixture, side);
  const scoreText =
    Number.isFinite(scoreFor) && Number.isFinite(scoreAgainst) ? `${scoreFor}-${scoreAgainst}` : "";
  const winner = fixture.winner || "";
  const won = normalizeTeamName(winner) === normalizeTeamName(teamName);
  const lost = winner && normalizeTeamName(winner) !== normalizeTeamName(teamName) && !/^draw$/i.test(winner);
  const outcome = won ? "胜" : lost ? "负" : "平";
  const penalties = fixture.scoreDetails?.penalties;

  if (penalties && Number.isFinite(Number(penalties.home)) && Number.isFinite(Number(penalties.away))) {
    const pensFor = side === "home" ? penalties.home : penalties.away;
    const pensAgainst = side === "home" ? penalties.away : penalties.home;
    return `${scoreText}后点球大战${pensFor}-${pensAgainst}${outcome}`;
  }

  return scoreText ? `${scoreText}${outcome}` : outcome;
}

function roundPhrase(round = "") {
  if (!round || /^group/i.test(round) || /^matchday/i.test(round)) return "";
  if (/^final$/i.test(round)) return " in the Final";
  if (/semi-finals/i.test(round)) return " in the Semi-finals";
  if (/quarter-finals/i.test(round)) return " in the Quarter-finals";
  if (/round of 16/i.test(round)) return " in the Round of 16";
  if (/third/i.test(round)) return " in the third-place match";
  return ` in the ${round}`;
}

function roundPhraseZh(round = "") {
  const groupPlayoffMatch = String(round).match(/^Group\s+(\d+)\s+Play-off$/i);
  if (groupPlayoffMatch) return `第${groupPlayoffMatch[1]}组附加赛`;
  if (!round || /^group/i.test(round) || /^matchday/i.test(round)) return "";
  if (/preliminary round/i.test(round)) return "预赛轮";
  if (/first round,\s*replays/i.test(round)) return "第一轮重赛";
  if (/first round/i.test(round)) return "第一轮";
  if (/final round/i.test(round)) return "决赛轮";
  if (/^final$/i.test(round)) return "决赛";
  if (/semifinals|semi-finals/i.test(round)) return "半决赛";
  if (/quarter-finals,\s*replays/i.test(round)) return "四分之一决赛重赛";
  if (/quarterfinals|quarter-finals/i.test(round)) return "四分之一决赛";
  if (/round of 16/i.test(round)) return "十六强赛";
  if (/match for third place|third-place match|third place match/i.test(round)) return "季军赛";
  if (/third-place play-off|third place play-off/i.test(round)) return "季军赛";
  return "历史比赛";
}

function goalAction(count, penaltyCount = 0) {
  if (count === 1) return penaltyCount === 1 ? "scored a penalty" : "scored";
  if (count === 2) return penaltyCount === 2 ? "scored twice from the spot" : "scored twice";
  if (count === 3) return penaltyCount === 3 ? "scored a penalty hat trick" : "scored a hat trick";
  return penaltyCount === count ? `scored ${count} penalties` : `scored ${count} times`;
}

function goalDetail(count, penaltyCount = 0) {
  if (count === 1) return penaltyCount === 1 ? "a penalty" : "a goal";
  if (count === 2) return penaltyCount === 2 ? "twice from the spot" : "twice";
  if (count === 3) return penaltyCount === 3 ? "a penalty hat trick" : "a hat trick";
  return penaltyCount === count ? `${count} penalties` : `${count} goals`;
}

function scoredTotalPhrase(count) {
  if (count === 2) return "scored twice";
  if (count === 3) return "scored three times";
  return `scored ${count} times`;
}

function goalDetailZh(count, penaltyCount = 0) {
  if (count === 1) return penaltyCount === 1 ? "点球破门" : "进球";
  if (count === 2) return penaltyCount === 2 ? "两次点球破门" : "梅开二度";
  if (count === 3) return penaltyCount === 3 ? "点球帽子戏法" : "上演帽子戏法";
  return penaltyCount === count ? `打进${count}个点球` : `打进${count}球`;
}

function groupGoalEvents(goalEvents) {
  const grouped = new Map();
  for (const event of goalEvents) {
    const key = event.fixture.id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        fixture: event.fixture,
        side: event.side,
        teamName: event.teamName,
        opponent: event.opponent,
        round: event.fixture.round,
        count: 0,
        penaltyCount: 0
      });
    }
    const group = grouped.get(key);
    group.count += 1;
    if (event.penalty) group.penaltyCount += 1;
  }

  return [...grouped.values()].sort((a, b) => {
    const roundScore = (round) =>
      /^final$/i.test(round) ? 4 : /semi-finals/i.test(round) ? 3 : /quarter-finals|round of 16/i.test(round) ? 2 : 1;
    return b.count - a.count || roundScore(b.round) - roundScore(a.round) || String(a.fixture.date).localeCompare(String(b.fixture.date));
  });
}

function goalFragment(group) {
  return `${goalDetail(group.count, group.penaltyCount)} against ${group.opponent}${roundPhrase(group.round)} (${resultPhrase(
    group.fixture,
    group.side,
    group.teamName
  )})`;
}

function goalFragmentZh(group) {
  const round = roundPhraseZh(group.round);
  const matchText = round ? `${round}对阵${teamZh(group.opponent)}` : `对阵${teamZh(group.opponent)}`;
  return `${matchText}时${goalDetailZh(group.count, group.penaltyCount)}（${resultPhraseZh(
    group.fixture,
    group.side,
    group.teamName
  )}）`;
}

function goalEvidenceSentence(profile, fact) {
  const groups = groupGoalEvents(fact.goalEvents);
  const total = Number(profile.goals || fact.goalEvents.length || 0);
  if (!groups.length || total <= 0) return "";

  if (total >= 5) {
    return `He scored ${total} times across ${groups.length} matches, led by ${goalFragment(groups[0])}.`;
  }

  if (groups.length === 1) {
    const group = groups[0];
    return `He ${goalAction(group.count, group.penaltyCount)} against ${group.opponent}${roundPhrase(group.round)} (${resultPhrase(
      group.fixture,
      group.side,
      group.teamName
    )}).`;
  }

  const visible = groups.slice(0, 2).map((group) => goalFragment(group));
  return `He ${scoredTotalPhrase(total)}, including ${listItems(visible, 2)}.`;
}

function goalEvidenceSentenceZh(profile, fact) {
  const groups = groupGoalEvents(fact.goalEvents);
  const total = Number(profile.goals || fact.goalEvents.length || 0);
  if (!groups.length || total <= 0) return "";

  if (total >= 5) {
    return `他在${groups.length}场比赛里打进${total}球，代表作是${goalFragmentZh(groups[0])}。`;
  }

  if (groups.length === 1) {
    return `他${goalFragmentZh(groups[0])}。`;
  }

  const visible = groups.slice(0, 2).map((group) => goalFragmentZh(group));
  return `他打进${total}球，包括${listItemsZh(visible, 2)}。`;
}

function appearanceGroupText(event) {
  return `${event.opponent}${roundPhrase(event.fixture.round)} (${resultPhrase(event.fixture, event.side, event.teamName)})`;
}

function appearanceGroupTextZh(event) {
  const round = roundPhraseZh(event.fixture.round);
  const matchText = round ? `${round}对阵${teamZh(event.opponent)}` : `对阵${teamZh(event.opponent)}`;
  return `${matchText}（${resultPhraseZh(event.fixture, event.side, event.teamName)}）`;
}

function appearanceSentence(profile, fact) {
  const keyEvents = fact.keyEvents;
  if (!keyEvents.length) return "";

  const shootoutConverted = keyEvents.filter((event) => /converted in the shootout/i.test(event.note));
  if (shootoutConverted.length) {
    return `He converted in the shootout against ${listItems(shootoutConverted.map(appearanceGroupText), 2)}.`;
  }

  const starts = keyEvents.filter((event) => /\bstarted\b/i.test(event.note));
  if (starts.length) {
    return `He started against ${listItems(starts.map(appearanceGroupText), 2)}.`;
  }

  const substitutes = keyEvents.filter((event) => /substitute/i.test(event.note));
  if (substitutes.length) {
    return `He came from the bench against ${listItems(substitutes.map(appearanceGroupText), 2)}.`;
  }

  if (keyEvents.length === 1) {
    return `His match touchpoint is ${appearanceGroupText(keyEvents[0])}.`;
  }

  return `His match touchpoints include ${listItems(keyEvents.map(appearanceGroupText), 2)}.`;
}

function appearanceSentenceZh(profile, fact) {
  const keyEvents = fact.keyEvents;
  if (!keyEvents.length) return "";

  const shootoutConverted = keyEvents.filter((event) => /converted in the shootout/i.test(event.note));
  if (shootoutConverted.length) {
    return `他在${listItemsZh(shootoutConverted.map(appearanceGroupTextZh), 2)}的点球大战中罚进。`;
  }

  const starts = keyEvents.filter((event) => /\bstarted\b/i.test(event.note));
  if (starts.length) {
    return `他在${listItemsZh(starts.map(appearanceGroupTextZh), 2)}首发。`;
  }

  const substitutes = keyEvents.filter((event) => /substitute/i.test(event.note));
  if (substitutes.length) {
    return `他在${listItemsZh(substitutes.map(appearanceGroupTextZh), 2)}替补登场。`;
  }

  if (keyEvents.length === 1) {
    return `他的比赛触点是${appearanceGroupTextZh(keyEvents[0])}。`;
  }

  return `他的比赛触点包括${listItemsZh(keyEvents.map(appearanceGroupTextZh), 2)}。`;
}

function buildGoalStyleNote(profile, fact) {
  const name = shortName(profile);
  const team = profile.teamName;
  const year = profile.tournamentYear;
  const total = Number(profile.goals || fact.goalEvents.length || 0);
  const hasFinalGoal = fact.goalEvents.some((event) => /^final$/i.test(event.fixture.round || ""));
  const hasKnockoutGoal = fact.goalEvents.some((event) => /final|semi-finals|quarter-finals|round of 16/i.test(event.fixture.round || ""));
  const evidence = goalEvidenceSentence(profile, fact);

  if (hasFinalGoal) {
    return `${name}'s ${year} card belongs to the final stage for ${team}. ${evidence}`;
  }
  if (total >= 5) {
    return `${name} was ${team}'s scoring story at the ${year} World Cup. ${evidence}`;
  }
  if (hasKnockoutGoal) {
    return `${name} gave ${team} a knockout moment in ${year}. ${evidence}`;
  }
  if (total >= 2) {
    return `${name} made ${team}'s ${year} attack feel alive whenever the chance opened. ${evidence}`;
  }
  return `${name} gave ${team} one of its ${year} tournament moments. ${evidence}`;
}

function buildGoalStyleNoteZh(profile, fact) {
  const team = teamZh(profile.teamName);
  const year = profile.tournamentYear;
  const total = Number(profile.goals || fact.goalEvents.length || 0);
  const hasFinalGoal = fact.goalEvents.some((event) => /^final$/i.test(event.fixture.round || ""));
  const hasKnockoutGoal = fact.goalEvents.some((event) => /final|semi-finals|quarter-finals|round of 16/i.test(event.fixture.round || ""));
  const evidence = goalEvidenceSentenceZh(profile, fact);

  if (hasFinalGoal) {
    return chooseZhVariant(profile, "final-goal", [
      () => `决赛是他在${team}${year}年世界杯最值得回看的舞台。${evidence}`,
      () => `${team}走到${year}年世界杯决赛时，他也留下了自己的进球印记。${evidence}`,
      () => `他在${team}${year}年世界杯的决赛阶段抓住了机会。${evidence}`
    ]);
  }
  if (total >= 5) {
    return chooseZhVariant(profile, "high-scoring", [
      () => `他是${team}${year}年世界杯最重要的得分手之一。${evidence}`,
      () => `${team}${year}年世界杯的进攻很大程度依赖他的终结。${evidence}`,
      () => `对手很难忽略他在${team}${year}年世界杯的持续得分威胁。${evidence}`
    ]);
  }
  if (hasKnockoutGoal) {
    return chooseZhVariant(profile, "knockout-goal", [
      () => `淘汰赛是他在${team}${year}年世界杯最值得回看的部分。${evidence}`,
      () => `${team}进入${year}年世界杯淘汰赛后，他依然能找到射门空间。${evidence}`,
      () => `他在${team}${year}年世界杯的淘汰赛阶段抓住了关键机会。${evidence}`
    ]);
  }
  if (total >= 2) {
    return chooseZhVariant(profile, "multiple-goals", [
      () => `他让${team}${year}年世界杯的进攻多了一个稳定得分点。${evidence}`,
      () => `对手不能把他当作一次性的威胁；他在${team}${year}年世界杯不止一次完成终结。${evidence}`,
      () => `他多次把${team}${year}年世界杯的进攻变成进球。${evidence}`
    ]);
  }
  return chooseZhVariant(profile, "single-goal", [
    () => `他为${team}${year}年世界杯留下一粒有明确比赛背景的进球。${evidence}`,
    () => `他的${team}${year}年世界杯记忆里有一个值得回看的终结瞬间。${evidence}`,
    () => `${team}${year}年世界杯的进球名单里有他的名字。${evidence}`
  ]);
}

function buildAppearanceStyleNote(profile, fact) {
  const name = shortName(profile);
  const team = profile.teamName;
  const year = profile.tournamentYear;
  const role = roleLabel(profile.position);
  const teamPossessive = possessive(team);
  const structure = roleStructure(role);
  const appearance = appearanceSentence(profile, fact);

  if (isStarter(profile, fact)) {
    return `${name} was part of ${teamPossessive} ${year} ${structure}. ${appearance}`;
  }
  if (fact.keyEvents.length > 1) {
    return `${name} helps fill out ${teamPossessive} ${year} ${structure}. ${appearance}`;
  }
  if (fact.keyEvents.length === 1) {
    return `${name} gives ${teamPossessive} ${year} ${structure} a concrete match point. ${appearance}`;
  }
  return `${name} is part of ${teamPossessive} ${year} World Cup squad picture. His card helps place the roster around the better-known names.`;
}

function buildAppearanceStyleNoteZh(profile, fact) {
  const team = teamZh(profile.teamName);
  const year = profile.tournamentYear;
  const role = roleLabelZh(profile.position);
  const appearance = appearanceSentenceZh(profile, fact);

  if (isStarter(profile, fact)) {
    return chooseZhVariant(profile, "starter", [
      () => `他是${team}${year}年世界杯常用的${role}。${appearance}`,
      () => `${team}在${year}年世界杯的重要比赛里使用了这名${role}。${appearance}`,
      () => `作为${role}，他进入了${team}${year}年世界杯的主要比赛安排。${appearance}`
    ]);
  }
  if (fact.keyEvents.length > 1) {
    return chooseZhVariant(profile, "rotation", [
      () => `他为${team}${year}年世界杯提供${role}位置的轮换选择。${appearance}`,
      () => `${team}在${year}年世界杯多次用到这名${role}。${appearance}`,
      () => `他补充了${team}${year}年世界杯在${role}位置上的阵容深度。${appearance}`
    ]);
  }
  if (fact.keyEvents.length === 1) {
    return chooseZhVariant(profile, "one-appearance", [
      () => `他在${team}${year}年世界杯有一场明确的重点比赛记录。${appearance}`,
      () => `这名${role}在${team}${year}年世界杯留下了一次具体出场记录。${appearance}`,
      () => `他的${team}${year}年世界杯档案里有一场可回看的比赛。${appearance}`
    ]);
  }
  return chooseZhVariant(profile, "squad-context", [
    () => `他是${team}${year}年世界杯阵容中的${role}，帮助补全这支球队的人员轮廓。`,
    () => `${team}${year}年世界杯名单里包括这名${role}。这张卡让当届阵容更容易理解。`,
    () => `作为${role}，他属于${team}${year}年世界杯阵容的一员。`
  ]);
}

function buildStyleNote(profile, fact) {
  const spotlight = TARGET_SPOTLIGHTS.get(profile.profileKey);
  if (spotlight) return spotlight;
  if (Number(profile.goals || 0) > 0 || fact.goalEvents.length) {
    return buildGoalStyleNote(profile, fact);
  }
  return buildAppearanceStyleNote(profile, fact);
}

function buildStyleNoteZh(profile, fact) {
  const spotlight = TARGET_SPOTLIGHTS_ZH.get(profile.profileKey);
  if (spotlight) return spotlight;
  if (Number(profile.goals || 0) > 0 || fact.goalEvents.length) {
    return buildGoalStyleNoteZh(profile, fact);
  }
  return buildAppearanceStyleNoteZh(profile, fact);
}

function buildNote(profile, fact) {
  const team = profile.teamName;
  const year = profile.tournamentYear;
  const role = roleLabel(profile.position);
  const teamPossessive = possessive(team);
  const goals = Number(profile.goals || 0);
  const keyMatches = Number(profile.keyMatchCount || fact.keyEvents.length || 0);
  const goalText = goals > 0 ? ` Credited with ${goals} World Cup ${goals === 1 ? "goal" : "goals"}.` : "";
  const matchText = keyMatches > 0 ? ` Appears in ${keyMatches} featured ${keyMatches === 1 ? "match" : "matches"}.` : "";
  return `${teamPossessive} ${year} World Cup ${role}.${goalText}${matchText}`.trim();
}

function buildNoteZh(profile, fact) {
  const team = teamZh(profile.teamName);
  const year = profile.tournamentYear;
  const role = roleLabelZh(profile.position);
  const goals = Number(profile.goals || 0);
  const keyMatches = Number(profile.keyMatchCount || fact.keyEvents.length || 0);
  const roleText = role === "球员" ? "具体位置未细分" : `位置是${role}`;
  const goalText = goals > 0 ? `本届打进${goals}球。` : "";
  const matchText = keyMatches > 0 ? `本站收录了他${keyMatches}场重点比赛。` : "";
  return `他在${year}年世界杯代表${team}，${roleText}。${goalText}${matchText}`.replace(/\s+/g, " ").trim();
}

function cleanNote(note) {
  return String(note || "")
    .replace(/\barchive lens\b/gi, "archive")
    .replace(/\bsquad-context\b/gi, "squad")
    .replace(/\bsupporting a scoring route through\b/gi, "connected to")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanNoteZh(note) {
  return String(note || "")
    .replace(/\s+/g, "")
    .trim();
}

function createFactIndex(profiles, targetYears) {
  const facts = new Map();
  for (const profile of Object.values(profiles)) {
    if (!targetYears.has(Number(profile.tournamentYear))) continue;
    const key = factKey(profile.name, profile.teamName, profile.tournamentYear);
    facts.set(key, {
      profile,
      goalEvents: [],
      keyEvents: []
    });
  }
  return facts;
}

function historicalYears(profiles) {
  return [
    ...new Set(
      Object.values(profiles)
        .map((profile) => Number(profile.tournamentYear))
        .filter((year) => Number.isInteger(year))
    )
  ];
}

function addFixtureFacts(facts, fixture) {
  const teams = fixtureTeams(fixture);
  for (const side of ["home", "away"]) {
    const teamName = teams[side];
    const opponent = opponentName(fixture, side);
    const goals = side === "home" ? fixture.goalsHome || [] : fixture.goalsAway || [];
    for (const goal of goals) {
      if (!goal?.name || goal.ownGoal) continue;
      const fact = facts.get(factKey(goal.name, teamName, fixture.tournamentYear));
      if (!fact) continue;
      fact.goalEvents.push({
        fixture,
        side,
        teamName,
        opponent,
        penalty: Boolean(goal.penalty)
      });
    }

    for (const player of fixture.keyPlayers?.[side] || []) {
      if (!player?.name) continue;
      const fact = facts.get(factKey(player.name, teamName, fixture.tournamentYear));
      if (!fact) continue;
      fact.keyEvents.push({
        fixture,
        side,
        teamName,
        opponent,
        note: player.note || "",
        position: player.position || ""
      });
    }
  }
}

const dryRun = hasArg("dry-run");
const zhOnly = hasArg("zh-only");
const [profilesData, historyData] = await Promise.all([readJson(profilesPath), readJson(historyPath)]);
const profiles = profilesData.profiles || {};
const requestedYears = parseYears(getArgValue("years"));
const targetYears = new Set(requestedYears.length ? requestedYears : historicalYears(profiles));
const facts = createFactIndex(profiles, targetYears);

for (const fixture of historyData.fixtures || []) {
  if (targetYears.has(Number(fixture.tournamentYear))) {
    addFixtureFacts(facts, fixture);
  }
}

let updated = 0;
for (const fact of facts.values()) {
  const profile = fact.profile;
  const styleNote = zhOnly ? profile.styleNote : cleanNote(buildStyleNote(profile, fact));
  const styleNoteZh = cleanNoteZh(buildStyleNoteZh(profile, fact));
  const note = zhOnly ? profile.note : cleanNote(buildNote(profile, fact));
  const noteZh = cleanNoteZh(buildNoteZh(profile, fact));
  const skills = refinedSkills(profile);
  if (
    profile.styleNote !== styleNote ||
    profile.styleNoteZh !== styleNoteZh ||
    profile.note !== note ||
    profile.noteZh !== noteZh ||
    JSON.stringify(profile.skills || []) !== JSON.stringify(skills)
  ) {
    if (!zhOnly) {
      profile.styleNote = styleNote;
      profile.note = note;
    }
    profile.styleNoteZh = styleNoteZh;
    profile.noteZh = noteZh;
    profile.skills = skills;
    updated += 1;
  }
}

if (updated && !dryRun) {
  profilesData.updatedAt = new Date().toISOString();
  await writeFile(profilesPath, `${JSON.stringify(profilesData, null, 2)}\n`);
}

console.log(
  `${dryRun ? "Would refresh" : "Refreshed"} ${updated} historical player cards for ${[...targetYears].sort((a, b) => b - a).join(", ")}.`
);
