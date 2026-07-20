#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
let checkCount = 0;

function check(area, condition, detail) {
  checkCount += 1;
  if (!condition) {
    failures.push({ area, detail });
  }
}

async function readText(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeAuditEntityKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function formatSamples(items, limit = 6) {
  const values = [...new Set(items.filter(Boolean))];
  const shown = values.slice(0, limit);
  return `${shown.join("; ")}${values.length > limit ? `; +${values.length - limit} more` : ""}`;
}

function getMappedStringValues(source, key) {
  const needle = JSON.stringify(key);
  const values = [];
  let offset = 0;

  while (offset < source.length) {
    const index = source.indexOf(needle, offset);
    if (index < 0) {
      break;
    }
    const lineStart = source.lastIndexOf("\n", index - 1) + 1;
    if (!/^\s*$/.test(source.slice(lineStart, index))) {
      offset = index + needle.length;
      continue;
    }
    const tail = source.slice(index + needle.length);
    const valueMatch = tail.match(/^\s*:\s*("(?:\\.|[^"\\])*")/s);
    if (valueMatch) {
      try {
        values.push(JSON.parse(valueMatch[1]));
      } catch {
        // A malformed source string is reported by the normal syntax checks.
      }
    }
    offset = index + needle.length;
  }

  if (/^[A-Za-z_$][\w$]*$/.test(key)) {
    const identifierPattern = new RegExp(
      `^\\s*${escapeRegExp(key)}\\s*:\\s*("(?:\\\\.|[^"\\\\])*")`,
      "gm"
    );
    for (const match of source.matchAll(identifierPattern)) {
      try {
        values.push(JSON.parse(match[1]));
      } catch {
        // A malformed source string is reported by the normal syntax checks.
      }
    }
  }

  return [...new Set(values)];
}

function getFunctionSource(source, functionName) {
  const start = source.search(new RegExp(`function\\s+${escapeRegExp(functionName)}\\s*\\(`));
  if (start < 0) {
    return "";
  }
  const bodyStart = source.indexOf("{", start);
  if (bodyStart < 0) {
    return "";
  }

  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = "";
      }
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  return "";
}

function decodeStringLiteral(value) {
  try {
    return JSON.parse(value);
  } catch {
    return "";
  }
}

function getDoubleQuotedMappings(source) {
  const mappings = [];
  const pattern = /("(?:\\.|[^"\\])*")\s*:\s*("(?:\\.|[^"\\])*")/gs;
  for (const match of source.matchAll(pattern)) {
    const key = decodeStringLiteral(match[1]);
    const value = decodeStringLiteral(match[2]);
    if (key && value) {
      mappings.push({ key, value });
    }
  }
  return mappings;
}

function containsRawTeamName(text, teamNames) {
  return teamNames.find((teamName) => {
    const pattern = new RegExp(`(^|[^A-Za-z])${escapeRegExp(teamName)}(?=$|[^A-Za-z])`, "i");
    return pattern.test(String(text || ""));
  });
}

function getSourceSideKeyInformationZh(fixture, side) {
  const keyInformation = fixture?.keyInformation || {};
  const sideValue = keyInformation?.[side];
  return (
    fixture?.keyInformationZh?.[side] ||
    keyInformation?.zh?.[side] ||
    keyInformation?.[`${side}Zh`] ||
    (sideValue && typeof sideValue === "object" ? sideValue.zh : "") ||
    ""
  );
}

function getEnglishKeyInformation(fixture, side) {
  const value = fixture?.keyInformation?.[side];
  if (typeof value === "string") {
    return value.trim();
  }
  return value && typeof value === "object" ? String(value.en || value.english || "").trim() : "";
}

function getChineseFacingFixtureStrings(fixtures) {
  const strings = [];
  for (const fixture of fixtures) {
    for (const bullet of fixture.resultStoryBulletsZh || []) {
      strings.push({ location: `${fixture.id}.resultStoryBulletsZh`, text: bullet });
    }
    for (const side of ["home", "away"]) {
      const text = getSourceSideKeyInformationZh(fixture, side);
      if (text) {
        strings.push({ location: `${fixture.id}.keyInformation.${side}.zh`, text });
      }
    }
  }
  return strings;
}

function hasCompleteKeyPlayers(fixture) {
  return ["home", "away"].every((side) => {
    const players = fixture?.keyPlayers?.[side];
    return (
      Array.isArray(players) &&
      players.length >= 3 &&
      players.every((player) => String(player?.name || "").trim() && String(player?.note || "").trim())
    );
  });
}

function hasCompleteResultStories(fixture) {
  const english = fixture?.resultStoryBullets;
  const chinese = fixture?.resultStoryBulletsZh;
  return (
    Array.isArray(english) &&
    Array.isArray(chinese) &&
    english.length >= 2 &&
    english.length === chinese.length &&
    [...english, ...chinese].every((value) => typeof value === "string" && value.trim())
  );
}

function auditRenderedFixtureSample(fixture, teamsById, semanticCheck = () => true) {
  if (!fixture) {
    return false;
  }
  const score = fixture.score || {};
  return (
    teamsById.has(fixture.homeTeamId) &&
    teamsById.has(fixture.awayTeamId) &&
    !Number.isNaN(Date.parse(fixture.kickoffUtc)) &&
    Number.isFinite(Number(score.home)) &&
    Number.isFinite(Number(score.away)) &&
    getEnglishKeyInformation(fixture, "home") &&
    getEnglishKeyInformation(fixture, "away") &&
    hasCompleteKeyPlayers(fixture) &&
    hasCompleteResultStories(fixture) &&
    semanticCheck(fixture)
  );
}

function auditRenderedPlayerSample(profile, expected) {
  return (
    profile &&
    profile.name === expected.name &&
    profile.teamId === expected.teamId &&
    /^\d{4}-\d{2}-\d{2}$/.test(profile.birthDate || "") &&
    String(profile.position || "").trim() &&
    String(profile.note || "").trim() &&
    String(profile.noteZh || "").trim() &&
    Array.isArray(profile.skills) &&
    profile.skills.length >= 3
  );
}

function installBallBoyAuditEnvironment(dataByPath) {
  const documentStub = { documentElement: { lang: "zh-CN" } };
  globalThis.document = documentStub;
  globalThis.window = {
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    document: documentStub,
    location: { search: "?lang=zh" },
    setTimeout: globalThis.setTimeout.bind(globalThis)
  };
  globalThis.fetch = async (input) => {
    const rawUrl = typeof input === "string" ? input : input?.url || "";
    const url = new URL(rawUrl, "http://world-cup-audit.local/");
    if (url.pathname === "/api/live-data") {
      return { ok: false, status: 503, json: async () => ({}) };
    }
    const data = dataByPath.get(url.pathname.replace(/^\//, ""));
    return data === undefined
      ? { ok: false, status: 404, json: async () => ({}) }
      : { ok: true, status: 200, json: async () => structuredClone(data) };
  };
}

async function auditBallBoyChineseIntents(dataByPath) {
  installBallBoyAuditEnvironment(dataByPath);
  try {
    const moduleUrl = `${pathToFileURL(path.join(root, "chatbot-knowledge.js")).href}?zh-semantic-audit=${Date.now()}`;
    const ballBoy = await import(moduleUrl);
    for (const setterName of ["setBallBoyLocale", "setBallBoyLanguage"]) {
      if (typeof ballBoy[setterName] === "function") {
        await ballBoy[setterName]("zh");
      }
    }

    const samples = [
      {
        question: "what can u do",
        locale: "en",
        matches: (reply) =>
          reply?.kind === "help" &&
          reply?.lead === "Choose a topic.",
        expected: "English help intent from common shorthand"
      },
      {
        question: "who r u",
        locale: "en",
        matches: (reply) =>
          reply?.kind === "personality" &&
          reply?.topic === "identity",
        expected: "English identity intent with u shorthand"
      },
      {
        question: "wats offside",
        locale: "en",
        matches: (reply) => reply?.kind === "offside",
        expected: "offside intent with wats shorthand"
      },
      {
        question: "whos mbappe",
        locale: "en",
        matches: (reply) =>
          reply?.kind === "player" &&
          /mbapp/i.test(reply?.profile?.canonicalName || ""),
        expected: "player intent with whos shorthand"
      },
      {
        question: "top player in argentina",
        locale: "en",
        matches: (reply) =>
          reply?.kind === "player-list" &&
          reply?.players?.length >= 1 &&
          reply.players.every((player) => player?.team?.id === "ARG"),
        expected: "top player as an Argentina key-player list"
      },
      {
        question: "wats ur prediction france vs spain",
        locale: "en",
        matches: (reply) =>
          reply?.kind === "matchup" &&
          reply?.focus === "prediction",
        expected: "matchup prediction with wats and ur shorthand"
      },
      {
        question: "can you dance?",
        locale: "en",
        matches: (reply) =>
          reply?.kind === "unknown" &&
          reply?.team?.id !== "CAN",
        expected: "ordinary English can without a false Canada match"
      },
      {
        question: "Who are you?",
        locale: "en",
        matches: (reply) =>
          reply?.kind === "personality" &&
          reply?.text === "I’m Ball Boy. I make football easier to understand." &&
          reply?.followUps?.length === 0,
        expected: "direct English identity"
      },
      {
        question: "你是谁？",
        matches: (reply) =>
          reply?.kind === "personality" &&
          reply?.text === "我是球童。我把足球讲明白。" &&
          reply?.followUps?.length === 0,
        expected: "direct Chinese identity"
      },
      {
        question: "人生是什么？",
        matches: (reply) => reply?.kind === "personality" && reply?.text === "不知道。",
        expected: "short life answer"
      },
      {
        question: "什么是soccer？",
        matches: (reply) => reply?.kind === "personality" && reply?.text === "你是说足球。",
        expected: "short soccer answer"
      },
      {
        question: "为什么叫soccer？",
        matches: (reply) =>
          reply?.kind === "personality" &&
          reply?.topic === "soccer-etymology" &&
          reply?.text.includes("association football"),
        expected: "soccer etymology answer"
      },
      {
        question: "足球为什么特别？",
        matches: (reply) =>
          reply?.kind === "personality" &&
          reply?.topic === "football-special" &&
          reply?.text === "入门很简单，踢好很难。",
        expected: "short football-special answer"
      },
      {
        question: "你是机器人吗？",
        matches: (reply) => reply?.kind === "personality" && reply?.text === "我是聊天机器人。",
        expected: "direct reality answer"
      },
      {
        question: "Tell me a joke",
        locale: "en",
        matches: (reply) => reply?.kind === "personality" && reply?.text === "No good ones.",
        expected: "short English joke refusal"
      },
      {
        question: "解释越位",
        matches: (reply) => reply?.kind === "offside",
        expected: "offside"
      },
      {
        question: "红牌是什么？",
        matches: (reply) =>
          reply?.kind === "rule" &&
          reply?.rule?.id === "red-card" &&
          reply?.rule?.takeaway === "球队会少一名球员继续比赛。",
        expected: "red-card rule"
      },
      {
        question: "介绍一下姆巴佩",
        matches: (reply) =>
          reply?.kind === "player" &&
          reply?.profile?.note === profiles["Kylian Mbappe"]?.noteZh &&
          /mbapp/i.test(
            String(reply?.profile?.canonicalName || reply?.profile?.displayName || reply?.profile?.name || "")
          ),
        expected: "Kylian Mbappe player"
      },
      {
        question: "阿根廷怎么踢？",
        matches: (reply) =>
          reply?.kind === "country" && reply?.team?.id === "ARG" && reply?.focus === "style",
        expected: "Argentina country"
      },
      {
        question: "谁赢了挪威对英格兰？",
        matches: (reply) =>
          reply?.kind === "match" &&
          [reply?.fixture?.homeTeamId, reply?.fixture?.awayTeamId].includes("NOR") &&
          [reply?.fixture?.homeTeamId, reply?.fixture?.awayTeamId].includes("ENG") &&
          reply?.focus === "result" &&
          reply?.fixture?.recap?.every((bullet) => /[\u3400-\u9fff]/u.test(bullet)) &&
          reply?.timeline?.every(
            (goal) => !/[A-Za-z]/.test(`${goal?.name || ""}${goal?.assistName || ""}`)
          ),
        expected: "Norway-England match with localized goal names"
      },
      {
        question: "墨西哥有哪些球员值得关注？",
        matches: (reply) => reply?.kind === "player-list" && reply?.players?.length >= 3,
        expected: "Mexico players-to-watch list"
      },
      {
        question: "挪威对英格兰是谁进球？",
        matches: (reply) =>
          reply?.kind === "match" &&
          [reply?.fixture?.homeTeamId, reply?.fixture?.awayTeamId].includes("NOR") &&
          [reply?.fixture?.homeTeamId, reply?.fixture?.awayTeamId].includes("ENG") &&
          reply?.focus === "scorers",
        expected: "Norway-England scorer follow-up"
      },
      {
        question: "介绍一下Abduvohid Nematov",
        matches: (reply) =>
          reply?.kind === "player" &&
          reply?.profile?.displayName === "阿卜杜沃希德·内马托夫" &&
          reply?.profile?.club === "纳萨夫" &&
          reply?.profile?.league === "乌兹别克斯坦超级联赛",
        expected: "fully localized Nematov player card"
      }
    ];

    for (const sample of samples) {
      const reply = await ballBoy.getBallBoyReply(sample.question, { locale: sample.locale || "zh" });
      check(
        "ball-boy-intent",
        sample.matches(reply),
        `${JSON.stringify(sample.question)} resolved to ${reply?.kind || "nothing"}; expected ${sample.expected}`
      );
    }

    ballBoy.resetBallBoyContext();
    const keyPlayerReply = await ballBoy.getBallBoyReply("key player in argentina", { locale: "en" });
    ballBoy.resetBallBoyContext();
    const topPlayerReply = await ballBoy.getBallBoyReply("top player in argentina", { locale: "en" });
    check(
      "ball-boy-intent",
      JSON.stringify(topPlayerReply) === JSON.stringify(keyPlayerReply),
      "top player in argentina should return the same reply as key player in argentina"
    );
  } catch (error) {
    check("ball-boy-intent", false, `Chinese intent samples could not run: ${error?.stack || error}`);
  }
}

const [
  appSource,
  chatbotSource,
  chatbotKnowledgeSource,
  footballLocaleSource,
  fixturesData,
  playerProfilesData,
  historicalProfilesData,
  teamsData,
  standingsData
] = await Promise.all([
  readText("app.js"),
  readText("chatbot.js"),
  readText("chatbot-knowledge.js"),
  readText("football-locale-zh.js"),
  readJson("data/fixtures.json"),
  readJson("data/player-profiles.json"),
  readJson("data/historical-player-profiles.json"),
  readJson("data/teams.json"),
  readJson("data/standings.json")
]);

const fixtures = fixturesData.fixtures || [];
const profiles = playerProfilesData.profiles || {};
const historicalProfiles = historicalProfilesData.profiles || {};
const teams = teamsData.teams || [];
const teamsById = new Map(teams.map((team) => [team.id, team]));
const fixturesById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
const appMappings = getDoubleQuotedMappings(appSource);
const footballLocaleMappings = getDoubleQuotedMappings(footballLocaleSource);
const sharedFootballLocale = await import(
  `${pathToFileURL(path.join(root, "football-locale-zh.js")).href}?zh-semantic-audit=${Date.now()}`
);

// Ball Boy is a direct football guide, not a disguised player or invented stadium employee.
const ballBoySource = `${chatbotSource}\n${chatbotKnowledgeSource}`;
check(
  "ball-boy-persona",
  ballBoySource.includes("I’m Ball Boy. I make football easier to understand.") &&
    ballBoySource.includes("我是球童。我把足球讲明白。"),
  "direct Ball Boy identity copy is missing in English or Chinese"
);
const retiredPersonaPhrases = [
  "very tall Norwegian",
  "Nothing suspicious",
  "completely neutral panel",
  "collect the footballs",
  "stadium employee",
  "never get a break",
  "I was resting",
  "standing still very efficiently",
  "corner flag",
  "asked for a raise",
  "On stadium duty",
  "Digital stadium staff",
  "球场值班中",
  "数字球场员工",
  "从来没有休息时间",
  "站着不动",
  "角旗",
  "加薪",
  "挪威球童",
  "完全不可疑",
  "没有任何可疑之处",
  "无可奉告"
];
const retiredPersonaLeaks = retiredPersonaPhrases.filter((phrase) => ballBoySource.includes(phrase));
check(
  "ball-boy-persona",
  !retiredPersonaLeaks.length,
  `retired Haaland-in-disguise persona remnants: ${retiredPersonaLeaks.join(", ")}`
);
check(
  "ball-boy-persona",
  !chatbotSource.includes("scout-personality-stamp") &&
    !chatbotSource.includes("statusLabel:") &&
    !chatbotKnowledgeSource.includes("badge:"),
  "retired personality badges, stamps, or status labels are still rendered"
);
check(
  "ball-boy-persona",
  chatbotSource.includes('className: "is-personality"') &&
    chatbotKnowledgeSource.includes("followUps: []"),
  "personality replies must render as semantic chat bubbles without follow-up chips"
);
check(
  "ball-boy-rules",
  [
    "Five kicks each, then one kick each if the score is still level.",
    "The team plays one player short.",
    "Two yellow cards in one match mean a red card.",
    "Contact with the hand or arm alone is not enough.",
    "Extra time is two more 15-minute periods.",
    "The board shows the minimum time to be added."
  ].every((text) => chatbotKnowledgeSource.includes(text)),
  "one or more factual English rule takeaways are missing"
);
check(
  "ball-boy-localization",
  /profile\.noteZh\s*\|\|/.test(chatbotKnowledgeSource),
  "Chinese player answers are not visibly sourced from profile.noteZh"
);

// Match-clock terminology: ET is the end of extra time; HT is the halftime boundary.
const etValues = getMappedStringValues(appSource, "ET");
const htValues = getMappedStringValues(appSource, "HT");
check(
  "match-clock",
  etValues.includes("加时结束"),
  `ET must map to 加时结束, found ${JSON.stringify(etValues)}`
);
check(
  "match-clock",
  htValues.some((value) => ["半场结束", "中场休息"].includes(value)),
  `HT must describe halftime, found ${JSON.stringify(htValues)}`
);
check("match-clock", !etValues.includes("加时前"), "ET still says 加时前 (before extra time)");

// Stoppage time keeps its 90+N notation and must never be described as extra time.
const appStoppageIssues = appMappings
  .filter(({ key, value }) => /\b90\+\d+/.test(key) && /[\u3400-\u9fff]/u.test(value))
  .filter(({ key, value }) => {
    const minute = key.match(/\b90\+\d+/)?.[0] || "";
    return !value.includes(minute) || /加时\s*\d+\s*分钟/u.test(value);
  })
  .map(({ key, value }) => `${key} -> ${value}`);
const fixtureStoppageIssues = fixtures.flatMap((fixture) => {
  const english = fixture.resultStoryBullets || [];
  const chinese = fixture.resultStoryBulletsZh || [];
  return english.flatMap((source, index) => {
    const minutes = [...String(source).matchAll(/\b90\+\d+/g)].map((match) => match[0]);
    if (!minutes.length || !chinese[index]) {
      return [];
    }
    const translated = chinese[index];
    return minutes.every((minute) => translated.includes(minute)) && !/加时\s*\d+\s*分钟/u.test(translated)
      ? []
      : [`${fixture.id}: ${source} -> ${translated}`];
  });
});
check(
  "stoppage-time",
  !appStoppageIssues.length && !fixtureStoppageIssues.length && !appSource.includes("加时4分钟"),
  formatSamples([...appStoppageIssues, ...fixtureStoppageIssues, appSource.includes("加时4分钟") ? "app.js contains 加时4分钟" : ""])
);

// A drawn match and tied standings are different concepts in Chinese.
const tieOrderValues = getMappedStringValues(
  appSource,
  "Tie order follows points, goal difference, goals scored, loaded fair-play conduct when available, then FIFA ranking as the final deterministic fallback."
);
check(
  "standings-tie",
  tieOrderValues.some((value) => value.includes("同分排序")) && !tieOrderValues.some((value) => value.includes("平局排序")),
  `standings tie order must say 同分排序, found ${JSON.stringify(tieOrderValues)}`
);
check(
  "standings-tie",
  !appSource.includes("平局排序"),
  "app.js still uses 平局排序 for tied standings"
);
check(
  "standings-tie",
  Boolean(standingsData?.tiebreakerNote) && /tie/i.test(standingsData.tiebreakerNote),
  "standings semantic sample has no tiebreaker source note"
);

// Keep one canonical label for the best third-place table and one for the bronze match.
const thirdPlaceRaceValues = [
  ...getMappedStringValues(appSource, "Best third-place race"),
  ...getMappedStringValues(appSource, "Third-Place Race")
];
check(
  "third-place",
  thirdPlaceRaceValues.length >= 2 && thirdPlaceRaceValues.every((value) => value === "最佳小组第三排名"),
  `third-place table must consistently say 最佳小组第三排名, found ${JSON.stringify(thirdPlaceRaceValues)}`
);
const thirdPlaceMatchKeys = [
  "3rd place match",
  "Match for third place",
  "Third place match",
  "Third place play-off",
  "Third-place match",
  "Third-place play-off"
];
const thirdPlaceMatchValues = thirdPlaceMatchKeys.flatMap((key) => getMappedStringValues(appSource, key));
check(
  "third-place",
  thirdPlaceMatchValues.length >= 4 && thirdPlaceMatchValues.every((value) => value === "季军赛"),
  `bronze-match aliases must consistently say 季军赛, found ${JSON.stringify(thirdPlaceMatchValues)}`
);
const chineseFixtureStrings = getChineseFacingFixtureStrings(fixtures);
const thirdPlaceForbidden = ["第三名竞争", "最佳第三名竞争", "三四名决赛", "季军附加赛"];
const thirdPlaceLeaks = [
  ...thirdPlaceForbidden.filter((term) => appSource.includes(term)).map((term) => `app.js: ${term}`),
  ...Object.entries(historicalProfiles).flatMap(([key, profile]) =>
    [profile.noteZh, profile.styleNoteZh]
      .filter((value) => thirdPlaceForbidden.some((term) => String(value || "").includes(term)))
      .map((value) => `${key}: ${value}`)
  ),
  ...chineseFixtureStrings
    .filter(({ text }) => thirdPlaceForbidden.some((term) => String(text).includes(term)))
    .map(({ location, text }) => `${location}: ${text}`)
];
check("third-place", !thirdPlaceLeaks.length, formatSamples(thirdPlaceLeaks));

// Canonical player-name mappings prevent card-to-card spelling drift.
const canonicalPlayerNames = new Map([
  ["Lionel Messi", "利昂内尔·梅西"],
  ["Messi", "梅西"],
  ["Breel Embolo", "布雷尔·恩博洛"],
  ["Embolo", "恩博洛"],
  ["Junya Ito", "伊东纯也"],
  ["Keito Nakamura", "中村敬斗"]
]);
for (const [sourceName, expectedName] of canonicalPlayerNames) {
  const mapped = getMappedStringValues(footballLocaleSource, sourceName);
  check(
    "player-name",
    mapped.includes(expectedName),
    `${sourceName} must map to ${expectedName}, found ${JSON.stringify(mapped)}`
  );
}
const incorrectNameVariants = ["布雷尔·安博洛", "布里尔·恩博洛", "布里尔·安博洛"];
const incorrectNameLeaks = [
  ...incorrectNameVariants.filter((variant) => appSource.includes(variant)).map((variant) => `app.js: ${variant}`),
  ...incorrectNameVariants
    .filter((variant) => footballLocaleSource.includes(variant))
    .map((variant) => `football-locale-zh.js: ${variant}`),
  ...chineseFixtureStrings
    .filter(({ text }) => incorrectNameVariants.some((variant) => String(text).includes(variant)))
    .map(({ location, text }) => `${location}: ${text}`),
  ...Object.entries(profiles).flatMap(([key, profile]) =>
    [profile.noteZh]
      .filter((text) => incorrectNameVariants.some((variant) => String(text || "").includes(variant)))
      .map((text) => `${key}.noteZh: ${text}`)
  ),
  ...Object.entries(historicalProfiles).flatMap(([key, profile]) =>
    [profile.noteZh, profile.styleNoteZh]
      .filter((text) => incorrectNameVariants.some((variant) => String(text || "").includes(variant)))
      .map((text) => `${key}: ${text}`)
  )
];
check("player-name", !incorrectNameLeaks.length, formatSamples(incorrectNameLeaks));
const rawCanonicalPlayerNameLeaks = [...appMappings, ...footballLocaleMappings]
  .filter(({ value }) => /[\u3400-\u9fff]/u.test(value))
  .filter(({ value }) => ["Lionel Messi", "Breel Embolo", "Junya Ito", "Keito Nakamura"].some((name) => value.includes(name)))
  .map(({ key, value }) => `${key} -> ${value}`);
check(
  "player-name",
  !rawCanonicalPlayerNameLeaks.length,
  `Chinese translation values still contain raw canonical player names: ${formatSamples(rawCanonicalPlayerNameLeaks)}`
);

// Every current scorer, assister, and curated key player must have one canonical Chinese display name.
const normalizedLocaleNameKeys = new Set(
  footballLocaleMappings
    .filter(({ value }) => /[\u3400-\u9fff]/u.test(value))
    .map(({ key }) => normalizeAuditEntityKey(key))
);
const currentEventNames = [...new Set(fixtures.flatMap((fixture) =>
  ["goalsHome", "goalsAway"].flatMap((field) =>
    (fixture[field] || []).flatMap((goal) => [goal.name, goal.assistName])
  )
).filter(Boolean))];
const currentKeyPlayerNames = [...new Set(fixtures.flatMap((fixture) =>
  ["home", "away"].flatMap((side) => (fixture.keyPlayers?.[side] || []).map((player) => player.name))
).filter(Boolean))];
const uncoveredCurrentNames = [...currentEventNames, ...currentKeyPlayerNames]
  .filter((name, index, items) => items.indexOf(name) === index)
  .filter((name) => !normalizedLocaleNameKeys.has(normalizeAuditEntityKey(name)));
check(
  "player-name-coverage",
  !uncoveredCurrentNames.length,
  `${uncoveredCurrentNames.length} current scorer, assister, or key-player names lack Chinese mappings: ${formatSamples(uncoveredCurrentNames)}`
);

const sharedClubNames = sharedFootballLocale.ZH_CLUB_NAME_TRANSLATIONS || {};
const sharedLeagueNames = sharedFootballLocale.ZH_LEAGUE_NAME_TRANSLATIONS || {};
function hasStructuredChineseClubName(value) {
  const name = String(value || "").trim();
  if (!name) return true;
  if (sharedClubNames[name]) return true;
  const loan = name.match(/^(.+?)\s*\((?:on\s+)?loan(?:\s+from)?\s+(.+?)\)$/i);
  return Boolean(
    loan &&
      sharedClubNames[loan[1]] &&
      loan[2].split(/,\s*/).every((club) => sharedClubNames[club])
  );
}
const currentClubNames = [...new Set(Object.values(profiles).map((profile) => profile.club).filter(Boolean))];
const uncoveredCurrentClubs = currentClubNames.filter((club) => !hasStructuredChineseClubName(club));
check(
  "club-name-coverage",
  !uncoveredCurrentClubs.length,
  `${uncoveredCurrentClubs.length} current club names lack direct or structured Chinese localization: ${formatSamples(uncoveredCurrentClubs)}`
);
const currentLeagueNames = [...new Set(Object.values(profiles).map((profile) => profile.league).filter(Boolean))];
const uncoveredCurrentLeagues = currentLeagueNames.filter((league) => {
  if (sharedLeagueNames[league]) return false;
  const lastClub = league.match(/^Last club:\s*(.+)$/i);
  return !lastClub || !hasStructuredChineseClubName(lastClub[1]);
});
check(
  "league-name-coverage",
  !uncoveredCurrentLeagues.length,
  `${uncoveredCurrentLeagues.length} current league labels lack direct or structured Chinese localization: ${formatSamples(uncoveredCurrentLeagues)}`
);

// Small glossary samples are exact because a CJK-looking mistranslation still harms beginners.
const glossaryExpectations = new Map([
  ["Defender", ["后卫"]],
  ["Midfielder", ["中场", "中场球员"]],
  ["Early service", ["尽早传入禁区", "尽早传球", "提前传球", "早传"]],
  ["Final", ["决赛"]]
]);
for (const [term, allowedValues] of glossaryExpectations) {
  const mapped = getMappedStringValues(appSource, term);
  check(
    "glossary",
    mapped.some((value) => allowedValues.includes(value)),
    `${term} must use ${allowedValues.join(" / ")}, found ${JSON.stringify(mapped)}`
  );
}
check("glossary", !appSource.includes('"Early service": "早供给"'), "Early service still uses the word-for-word 早供给");

// Existing authored resultStoryBulletsZh must be selected before any English retranslating path.
const resultStorySelectionPatterns = [
  /(?:currentLanguage|language|locale)\s*===\s*["']zh["'][\s\S]{0,900}resultStoryBulletsZh/,
  /resultStoryBulletsZh[\s\S]{0,900}(?:currentLanguage|language|locale)\s*===\s*["']zh["']/
];
check(
  "result-story",
  resultStorySelectionPatterns.some((pattern) => pattern.test(appSource)),
  "app.js does not visibly prefer resultStoryBulletsZh in Chinese mode"
);
const fixturesWithChineseStories = fixtures.filter((fixture) => Array.isArray(fixture.resultStoryBulletsZh));
const completedCurrentFixtures = fixtures.filter(
  (fixture) =>
    ["FT", "AET", "PEN"].includes(String(fixture.status || "").toUpperCase()) &&
    Number.isFinite(Number(fixture.score?.home)) &&
    Number.isFinite(Number(fixture.score?.away))
);
const storyParityIssues = completedCurrentFixtures.filter(
  (fixture) =>
    !Array.isArray(fixture.resultStoryBullets) ||
    !Array.isArray(fixture.resultStoryBulletsZh) ||
    fixture.resultStoryBullets.length !== 3 ||
    fixture.resultStoryBulletsZh.length !== 3 ||
    fixture.resultStoryBulletsZh.some((bullet) => !String(bullet || "").trim())
);
check(
  "result-story",
  fixturesWithChineseStories.length === completedCurrentFixtures.length && !storyParityIssues.length,
  `found ${fixturesWithChineseStories.length}/${completedCurrentFixtures.length} bilingual current story sets; parity issues: ${formatSamples(storyParityIssues.map((fixture) => fixture.id))}`
);

// All current preview paragraphs need either authored Chinese fields or a guaranteed structured route.
const previewSides = fixtures.flatMap((fixture) =>
  ["home", "away"]
    .filter((side) => getEnglishKeyInformation(fixture, side))
    .map((side) => ({ fixture, side }))
);
const sourceSideChinesePreviews = previewSides.filter(({ fixture, side }) =>
  String(getSourceSideKeyInformationZh(fixture, side)).trim()
);
const keyInformationFunction = getFunctionSource(appSource, "getKeyInformationText");
const currentLanguageBranch = keyInformationFunction.search(/currentLanguage\s*===\s*["']zh["']/);
const wordByWordCall = keyInformationFunction.search(
  /translateCurrentMatchPreviewToZh|localizedCopy\s*===\s*specificCopy/
);
const localizeEnglishCall = keyInformationFunction.search(/localizeText\s*\(\s*specificCopy\s*\)/);
const hasStructuredPreviewRoute =
  keyInformationFunction.includes("buildLocalizedKeyInformationFallback") &&
  currentLanguageBranch >= 0 &&
  wordByWordCall < 0 &&
  (localizeEnglishCall < 0 || currentLanguageBranch < localizeEnglishCall);
check(
  "match-preview",
  previewSides.length >= 204,
  `expected at least the audited 204 preview paragraphs, found ${previewSides.length}`
);
check(
  "match-preview",
  sourceSideChinesePreviews.length === previewSides.length || hasStructuredPreviewRoute,
  `${sourceSideChinesePreviews.length}/${previewSides.length} paragraphs have source-side Chinese and getKeyInformationText still permits the word-by-word path`
);

// Chinese player notes must not expose raw English country names.
const teamNames = [...new Set([
  ...teams.flatMap((team) => [team.name, team.officialName]),
  ...Object.values(historicalProfiles).flatMap((profile) => [profile.teamName, ...(profile.teams || [])])
].filter((name) => /[A-Za-z]/.test(String(name || ""))))].sort((left, right) => right.length - left.length);
const currentNoteLeaks = Object.entries(profiles).flatMap(([key, profile]) => {
  const leakedName = containsRawTeamName(profile.noteZh, teamNames);
  return leakedName ? [`${key}: ${leakedName} in ${profile.noteZh}`] : [];
});
const historicalNoteLeaks = Object.entries(historicalProfiles).flatMap(([key, profile]) =>
  ["noteZh", "styleNoteZh"].flatMap((field) => {
    const leakedName = containsRawTeamName(profile[field], teamNames);
    return leakedName ? [`${key}.${field}: ${leakedName} in ${profile[field]}`] : [];
  })
);
check(
  "player-note-country",
  !currentNoteLeaks.length && !historicalNoteLeaks.length,
  `${currentNoteLeaks.length} current and ${historicalNoteLeaks.length} historical raw-country leaks. ${formatSamples([...currentNoteLeaks, ...historicalNoteLeaks])}`
);
const repeatedHistoricalPhrases = ["变得有生命力", "世界杯的得分故事", "淘汰赛留下了一个关键时刻"];
const repeatedHistoricalLeaks = Object.entries(historicalProfiles).flatMap(([key, profile]) => {
  const combined = `${profile.noteZh || ""} ${profile.styleNoteZh || ""}`;
  return repeatedHistoricalPhrases
    .filter((phrase) => combined.includes(phrase))
    .map((phrase) => `${key}: ${phrase}`);
});
check(
  "historical-player-copy",
  !repeatedHistoricalLeaks.length,
  `${repeatedHistoricalLeaks.length} repeated-template remnants. ${formatSamples(repeatedHistoricalLeaks)}`
);

// Representative complete source records protect the semantics of full rendered cards.
check(
  "render-card-fixture",
  auditRenderedFixtureSample(
    fixturesById.get("match-90-round-of-16-2026-07-04"),
    teamsById,
    (fixture) =>
      fixture.resultStoryBullets.some((bullet) => /90\+8/.test(bullet)) &&
      fixture.resultStoryBulletsZh.some((bullet) => /90\+8/.test(bullet) && !/加时\s*8\s*分钟/u.test(bullet))
  ),
  "stoppage-time Morocco-Canada card source is incomplete or semantically wrong"
);
check(
  "render-card-fixture",
  auditRenderedFixtureSample(
    fixturesById.get("match-96-round-of-16-2026-07-07"),
    teamsById,
    (fixture) =>
      Number.isFinite(Number(fixture.scoreDetails?.penalties?.home)) &&
      fixture.resultStoryBulletsZh.some((bullet) => bullet.includes("点球大战"))
  ),
  "shootout Switzerland-Colombia card source is incomplete or semantically wrong"
);
check(
  "render-card-fixture",
  auditRenderedFixtureSample(
    fixturesById.get("match-99-quarter-final-2026-07-11"),
    teamsById,
    (fixture) =>
      [...(fixture.goalsHome || []), ...(fixture.goalsAway || [])].some(
        (goal) => Number(goal.minute) > 90 && Number(goal.minute) <= 120
      ) && fixture.resultStoryBulletsZh.some((bullet) => bullet.includes("加时"))
  ),
  "extra-time Norway-England card source is incomplete or semantically wrong"
);
check(
  "render-card-fixture",
  auditRenderedFixtureSample(
    fixturesById.get("match-100-quarter-final-2026-07-11"),
    teamsById,
    (fixture) =>
      fixture.keyPlayers.home.some((player) => player.name === "Lionel Messi") &&
      fixture.keyPlayers.away.some((player) => player.name === "Breel Embolo") &&
      fixture.resultStoryBulletsZh.some((bullet) => bullet.includes("梅西")) &&
      fixture.resultStoryBulletsZh.some((bullet) => bullet.includes("恩博洛"))
  ),
  "Argentina-Switzerland canonical-name card source is incomplete or semantically wrong"
);

for (const expected of [
  { name: "Lionel Messi", teamId: "ARG" },
  { name: "Breel Embolo", teamId: "SUI" },
  { name: "Junya Ito", teamId: "JPN" },
  { name: "Keito Nakamura", teamId: "JPN" }
]) {
  check(
    "render-card-player",
    auditRenderedPlayerSample(profiles[expected.name], expected),
    `${expected.name} player-card source is incomplete`
  );
}

await auditBallBoyChineseIntents(
  new Map([
    ["data/fixtures.json", fixturesData],
    ["data/player-profiles.json", playerProfilesData],
    ["data/standings.json", standingsData],
    ["data/teams.json", teamsData]
  ])
);

if (failures.length) {
  console.error(`Chinese semantic audit failed: ${failures.length}/${checkCount} checks failed.`);
  for (const failure of failures) {
    console.error(`- [${failure.area}] ${failure.detail}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Chinese semantic audit passed: ${checkCount} checks, ${previewSides.length} preview paragraphs, ` +
      `${fixturesWithChineseStories.length} bilingual current result-story sets, ${currentEventNames.length} event names, ` +
      `${currentClubNames.length} clubs, ${currentLeagueNames.length} leagues, and 8 complete card samples.`
  );
}
