#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUTHORED_HISTORICAL_STYLE_KEYS,
  HISTORICAL_EDITORIAL_STYLE_PHRASES,
  HISTORICAL_PROFILE_SOURCE_SEMANTICS,
  HISTORICAL_REVIEWED_ROLE_OVERRIDES,
  HISTORICAL_REVIEWED_SEMANTIC_OVERRIDES,
  HISTORICAL_REVIEWED_VISIBLE_PROFILE_CORRECTIONS,
  HISTORICAL_SPECIAL_STYLE_PHRASES,
  HISTORICAL_STYLE_CATALOGS,
  HISTORICAL_STYLE_COPY_VERSION,
  HISTORICAL_STYLE_SHAPES,
  configureHistoricalRoleEvidence,
  historicalActionFamily,
  historicalActionSupportsSignature,
  historicalEditorialHintIds,
  historicalEditorialHintIdsForReason,
  historicalExpectedStyleSemanticSelection,
  historicalGeneratedStyleUpdatePlan,
  historicalPlayerReferenceName,
  historicalSignatureActionConflict,
  historicalStyleCatalogKeyForRole,
  inferHistoricalStyleRole,
  inferHistoricalStyleRoleEvidence
} from "./refresh-historical-player-card-notes.mjs";
import { historicalIdentityNameKey } from "./historical-player-identity.mjs";
import { normalizePlayerName } from "./player-name-matching.mjs";
import { getGeneratedPlayerCardCopy } from "../locales/player-note-templates.js";
import { HISTORICAL_STORY_PROFILE_OVERRIDES } from "../data/highlights-history.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profilesPath = path.join(root, "data", "historical-player-profiles.json");
const historyPath = path.join(root, "data", "history.json");
const currentProfilesPath = path.join(root, "data", "player-profiles.json");
const teamsPath = path.join(root, "data", "teams.json");
const archiveLocalePaths = {
  es: path.join(root, "data", "locales", "es", "archive-content.json"),
  ko: path.join(root, "data", "locales", "ko", "archive-content.json")
};
const args = process.argv.slice(2);
const MIN_NOTE_WORDS = 24;
const MAX_NOTE_WORDS = 65;
const MIN_NOTE_ZH_CHARACTERS = 36;
const MAX_NOTE_CHARACTERS = 300;
const MAX_AUTHORED_NOTE_CHARACTERS = 320;
const MAX_NOTE_ZH_CHARACTERS = 200;
const CONCENTRATION_WARNING_SHARE = 0.18;
const CONCENTRATION_WARNING_MIN_COUNT = 3;
const STRUCTURE_WARNING_SHARE = 0.08;
const MIN_STRUCTURE_DIVERSITY_SHARE = 0.1;
const nestedWhenJoinPattern =
  /\bwhen\s+(?:he|they|He|They|[\p{Lu}][\p{L}'’-]*(?:\s+[\p{Lu}][\p{L}'’-]*){0,2})\s+[^,.;!?]{0,140}\bwhen\b/u;

const forbiddenPhrases = [
  {
    pattern: /\barchive lens\b/i,
    message: "archive lens sounds like internal generation language"
  },
  {
    pattern: /\bmatch lens\b/i,
    message: "match lens sounds like internal generation language"
  },
  {
    pattern: /\bsquad-context\b/i,
    message: "squad-context sounds like internal generation language"
  },
  {
    pattern: /\bsupporting a scoring route\b/i,
    message: "supporting a scoring route is too formulaic"
  },
  {
    pattern: /\bread .{0,64}\brole through\b/i,
    message: "describe the role responsibility directly instead of reading the role through a gerund"
  },
  {
    pattern: /\brole points toward\b/i,
    message: "role points toward is an artificial role-guide frame"
  },
  {
    pattern: /\b(?:start|begin) with [^.]{0,160}\bwhen (?:watching|following)\b/i,
    message: "put the player-viewing clause first instead of joining two when-phrases"
  },
  {
    pattern: /\bWhen (?:watching|following|assessing) [^.]{0,160}\bwhen\b/i,
    message: "avoid stacking an observation when-clause around a temporal style phrase"
  },
  {
    pattern: /\bWhen [^.]{0,80}\b(?:works|operates) here\b[^.]{0,120}\bwhen\b/i,
    message: "use a direct position-led opener before a temporal style phrase"
  },
  {
    pattern: /\bbuilds (?:his|her|their) game around [^.]{0,100}\bthe game\b/i,
    message: "avoid repeating game in the same headline sentence"
  },
  {
    pattern: /\bAt [^.]{1,80}(?:'s|’s) position\b/i,
    message: "use In, not At, for a player's position"
  },
  {
    pattern: /^Start with [^.]{1,160}\bfor \p{Lu}[\p{L}'’.-]*(?:\s+\p{Lu}[\p{L}'’.-]*){0,3}\./u,
    message: "lead with the player before a long style phrase"
  },
  {
    pattern: /\bgives away the harder finish\b/i,
    message: "make the goalkeeper force the attacker toward the harder finish"
  },
  {
    pattern: /\buse .{0,96}\bas a guide to .{0,48}\brole\b/i,
    message: "state the role demand directly instead of using a guide frame"
  },
  {
    pattern: /\bMatchday\s+\d+\b/i,
    message: "hide source matchday labels from reader-facing archive cards"
  },
  {
    pattern: /\b(?:World Cup|tournament|match touchpoints?|scored|hat[ -]?trick)\b/i,
    message: "keep historical results and achievements out of the evergreen play-style paragraph",
    generatedOnly: true
  },
  {
    pattern: /\b\d+\s+(?:goals?|assists?|matches?)\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten) (?:goals?|assists?)\b/i,
    message: "keep historical totals in the separate year-labeled stat row",
    generatedOnly: true
  },
  {
    pattern: /\(\d+\s*[-–—]\s*\d+\s+(?:win|loss|tie)\)/i,
    message: "keep archived scorelines out of the evergreen play-style paragraph",
    generatedOnly: true
  }
];

const forbiddenChineseConstructions = [
  { pattern: /从从/u, message: "avoid a doubled 从 when a template meets a semantic phrase" },
  { pattern: /用用/u, message: "avoid a doubled 用 when a template meets a semantic phrase" },
  { pattern: /把把/u, message: "avoid a doubled 把 when a template meets a semantic phrase" },
  { pattern: /先(?:看|注意|留意)[^。]{0,12}先/u, message: "avoid repeating 先 in an observation opener and its first semantic beat" },
  { pattern: /同一特点(?:也出现在|还体现在)他会/u, message: "join the repeated feature to an action before introducing 他会" },
  { pattern: /这一特点还体现在他会/u, message: "join the repeated feature to an action before introducing 他会" },
  { pattern: /下一处相同线索是他会/u, message: "make the next action the source of the clue instead of equating the clue with 他会" },
  { pattern: /观察他会/u, message: "use 观察他如何 before an observable action" },
  { pattern: /可以通过[^。]{1,80}理解他的场上任务/u, message: "lead with 要理解他的场上任务 before the observation" },
  { pattern: /跟随他的比赛时/u, message: "use 观察他的比赛时 rather than a literal follow-the-match frame" },
  { pattern: /这项要求也包括/u, message: "connect the same demand to the next observable action" },
  { pattern: /同一思路也在这里出现/u, message: "state how the next action extends the same idea" },
  { pattern: /他会在[^。]{0,36}会[^。]{0,36}时/u, message: "avoid stacking 会 in the action and its condition" },
  { pattern: /他会看到[^。]{1,30}时/u, message: "lead temporal action clauses with 在 rather than 他会看到…时" },
  {
    pattern: /他会(?:传球者|进攻发展|防守分工|第一道(?:压力|逼抢)|线路打开)[^。]{0,30}(?:时|前|后)/u,
    message: "Chinese temporal action clause is missing 在 before the condition"
  },
  {
    pattern: /他会(?:单刀面对前锋|防守阵型重组|身边角色变化|进攻打开线路|射门线路出现|对方中场形成压迫|防守注意力转向别处)[^。]{0,30}(?:时|前|后)/u,
    message: "Chinese temporal action clause needs 在 before its opening condition"
  },
  {
    pattern: /同一(?:角色要求还体现在|要求也出现在)他会/u,
    message: "replace the machine-assembled repeated-demand join with a direct observation"
  },
  { pattern: /松散触球/u, message: "describe a loose ball or heavy touch directly instead of using the calque 松散触球" },
  { pattern: /球在一个阶段时/u, message: "avoid machine-assembled phase wording" },
  { pattern: /比赛逻辑来自/u, message: "avoid machine-assembled thesis wording" },
  { pattern: /建立在在/u, message: "avoid duplicated 在 in the Chinese foundation sentence" },
  { pattern: /他如何没有/u, message: "use 在没有…时 after 如何" },
  { pattern: /他如何直接线路/u, message: "use 在直接线路…时 after 如何" },
  { pattern: /他如何下脚抢断前/u, message: "use 在下脚抢断前 after 如何" },
  { pattern: /他如何(?:队友|防守者|边后卫|接球队员|压力集中|进攻在|球权变化|第二名防守者|第一次对抗)/u, message: "Chinese action clause is missing a player-led connector" },
  { pattern: /他如何能稳稳接住时/u, message: "goalkeeper catch clause must express a decision, not attach 时 after 如何" },
  { pattern: /他如何只有能/u, message: "goalkeeper cross clause must express the decision before leaving the line" },
  { pattern: /如何只有/u, message: "Chinese action clauses cannot place 只有 directly after 如何" },
  { pattern: /(?:如何|他|会)移动中到位/u, message: "use 在跑动中到位 for a grammatical moving-finish clause" },
  {
    pattern: /如何(?:完成进攻触球后|丢球后|半转身接球前|传球后|带球前进会|向前传球会|转身会|对侧边锋接球前|前场丢球后)/u,
    message: "Chinese time and condition clauses must include 在 after 如何"
  },
  {
    pattern: /如何(?:最后一传到来前|夺回球后|跟向边线前|向前线路关闭时|压迫接球队员前|延缓反击时|把球转移出压力前|队友需要时间前移时|中路传球线路出现时|单挑没有干净出口时|持球人被困住前|进入下一处空间前|中路拥挤时|发现球权变化后)/u,
    message: "Chinese subordinate clauses need an explicit 在 connector after 如何"
  },
  { pattern: /到了不同阶段也没有/u, message: "avoid stacking a phase transition before a conditional action" }
];

function getArgValue(name) {
  const flag = `--${name}=`;
  const arg = args.find((item) => item.startsWith(flag));
  return arg ? arg.slice(flag.length) : "";
}

function parseYears(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((year) => Number.isInteger(year));
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function formatCounts(map) {
  return [...map.entries()]
    .sort((left, right) => Number(left[0]) - Number(right[0]) || left[0].localeCompare(right[0]))
    .map(([label, count]) => `${label}:${count}`)
    .join(", ");
}

function splitSentences(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
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
    const connectors = sentence.match(/(?:,\s*|\s+)(?:and|or|but|then|while|before|after|later)\b/gi) || [];
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

const SUPPORT_RELATION_TEXT_PATTERNS = Object.freeze({
  en: Object.freeze({
    "additional-trait": Object.freeze([
      /\bseparately\b/i,
      /\bbeyond that\b/i,
      /\belsewhere, he\b/i,
      /\bin another part of (?:his game|the role|the job)\b/i,
      /\ba separate responsibility\b/i,
      /\balso note\b/i,
      /\bin a separate phase\b/i,
      /\ba different clue\b/i,
      /\banother (?:part of the job|responsibility)\b/i
    ]),
    "reinforces-headline": Object.freeze([
      /\btwo cues\b/i,
      /\ba second cue\b/i,
      /\banother (?:cue|clue)\b/i,
      /\banother is how\b/i,
      /\banother appears when\b/i,
      /\bthe same (?:quality|demand|responsibility)\b/i,
      /\bagain when\b/i,
      /\bthe idea carries into\b/i,
      /\bthe same (?:thread|reading|idea)\b/i,
      /\bthe same edge\b/i,
      /\bthat pattern (?:continues|returns)\b/i,
      /\b(?:a second|the next) expression of that idea\b/i,
      /\bit matters again\b/i
    ])
  }),
  zh: Object.freeze({
    "additional-trait": Object.freeze([
      /另外/u,
      /除此之外/u,
      /另一项(?:任务|要求|工作|责任)/u,
      /另一处表现/u,
      /不同的线索/u,
      /在比赛的另一部分/u,
      /在另一部分/u,
      /还要看/u
    ]),
    "reinforces-headline": Object.freeze([
      /同一特点/u,
      /同一角色要求/u,
      /同一要求/u,
      /这一特点/u,
      /同样可以看到/u,
      /这一点/u,
      /这种处理/u,
      /同一思路/u,
      /这项要求也/u,
      /相同线索/u,
      /同样值得注意/u
    ])
  })
});

function parseSupportRelationFromCopy(value, language) {
  const text = String(value || "");
  const matches = Object.entries(SUPPORT_RELATION_TEXT_PATTERNS[language] || {})
    .filter(([, patterns]) => patterns.some((pattern) => pattern.test(text)))
    .map(([relation]) => relation);
  return matches.length === 1 ? matches[0] : "";
}

function getPlayerMentions(profileKey, profile = {}) {
  const mentions = new Set();
  for (const value of [
    profile?.name,
    profile?.displayName,
    String(profileKey || "").split(" / ")[0],
    ...(Array.isArray(profile?.aliases) ? profile.aliases : [])
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

function copyWithoutKnownPlayerMentions(profileKey, profile, value) {
  let copy = String(value || "");
  for (const mention of getPlayerMentions(profileKey, profile)) {
    copy = copy.replace(new RegExp(escapeRegExp(mention), "giu"), "");
  }
  return copy;
}

function normalizeNoteStructure(profileKey, profile, note) {
  let normalized = normalizeCopyText(note);
  for (const mention of getPlayerMentions(profileKey, profile)) {
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

function getSignatureBeatKey(profileKey, profile, note) {
  const firstSentence = splitSentences(note)[0]?.replace(/[.!?。！？]+$/gu, "") || "";
  const normalized = normalizeNoteStructure(profileKey, profile, firstSentence);
  const patterns = [
    /^watch .+? for (.+)$/u,
    /^.+? stands out for (.+)$/u,
    /^.+?'s style is built around (.+)$/u,
    /^.+?'s edge is (.+)$/u
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) return match[1];
  }
  return normalized;
}

function getActionBeatKeys(profileKey, profile, note) {
  return splitSentences(note)
    .slice(1)
    .map((sentence) => normalizeNoteStructure(profileKey, profile, sentence))
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
  const structureCounts = new Map();
  const signatureCounts = new Map();
  const actionCounts = new Map();
  const wordCounts = [];
  const lowBeatProfiles = [];

  for (const [profileKey, profile] of profiles) {
    const note = String(profile?.styleNote || "").trim();
    if (!note) continue;
    increment(sentenceShapes, String(splitSentences(note).length));
    wordCounts.push(countWords(note));
    increment(structureCounts, normalizeNoteStructure(profileKey, profile, note));
    increment(signatureCounts, getSignatureBeatKey(profileKey, profile, note));
    if (countContentBeats(note) < 3) lowBeatProfiles.push(profileKey);
    for (const action of getActionBeatKeys(profileKey, profile, note)) increment(actionCounts, action);
  }

  const noteCount = wordCounts.length;
  if (!noteCount) {
    console.log("No populated historical style notes were available for corpus-quality reporting.");
    return ["no populated historical style notes were available"];
  }
  const repeatedStructures = [...structureCounts.values()].filter((count) => count > 1).length;
  const [topStructure = ["", 0]] = topEntries(structureCounts, 1);
  const [topSignature = ["", 0]] = topEntries(signatureCounts, 1);
  const [topAction = ["", 0]] = topEntries(actionCounts, 1);
  const warnings = [];

  if (lowBeatProfiles.length) {
    warnings.push(
      `${lowBeatProfiles.length}/${noteCount} notes have fewer than three detectable content beats; editorial review needed`
    );
  }
  if (topStructure[1] >= 3 && topStructure[1] / noteCount >= STRUCTURE_WARNING_SHARE) {
    warnings.push(
      `largest normalized full-note structure appears ${topStructure[1]}/${noteCount} times (${formatShare(topStructure[1], noteCount)})`
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
  if (structureCounts.size / noteCount < MIN_STRUCTURE_DIVERSITY_SHARE) {
    warnings.push(
      `only ${structureCounts.size}/${noteCount} normalized full-note structures are distinct (${formatShare(structureCounts.size, noteCount)})`
    );
  }

  console.log(
    `Historical note-shape baseline: sentences ${formatCounts(sentenceShapes)}; words min:${Math.min(...wordCounts)}, `
      + `median:${percentile(wordCounts, 0.5)}, p90:${percentile(wordCounts, 0.9)}, max:${Math.max(...wordCounts)}.`
  );
  console.log(
    `Historical content-beat review baseline: ${noteCount - lowBeatProfiles.length}/${noteCount} notes have at least three detectable beats.`
  );
  console.log(
    `Historical structure baseline: ${structureCounts.size}/${noteCount} normalized full-note structures; `
      + `${repeatedStructures} repeated structure groups; largest group ${topStructure[1]}.`
  );
  console.log("Most common historical signature beats:");
  for (const [value, count] of topEntries(signatureCounts)) {
    console.log(`- ${formatMetricLabel(value)}: ${count}/${noteCount} (${formatShare(count, noteCount)})`);
  }
  console.log("Most common historical action beats:");
  for (const [value, count] of topEntries(actionCounts)) {
    console.log(`- ${formatMetricLabel(value)}: ${count}/${noteCount} (${formatShare(count, noteCount)})`);
  }
  if (warnings.length) {
    console.log("Blocking historical copy-concentration findings:");
    for (const warning of warnings) console.log(`- ${warning}`);
  } else {
    console.log("No historical copy-concentration findings at the current thresholds.");
  }
  return warnings;
}

function addIssue(issues, profileKey, kind, message) {
  issues.push({ profileKey, kind, message });
}

function normalizeTeamName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function historicalFactKey(name, teamName, year) {
  return [historicalIdentityNameKey(name, teamName), normalizeTeamName(teamName), Number(year)].join("|");
}

function collectPenaltyEvidence(historyData) {
  const evidence = new Map();
  const entryFor = (key) => {
    if (!evidence.has(key)) evidence.set(key, { penaltyGoal: false, converted: false, missed: false });
    return evidence.get(key);
  };
  for (const fixture of historyData.fixtures || []) {
    for (const side of ["home", "away"]) {
      const teamName = side === "home" ? fixture.homeSlot : fixture.awaySlot;
      const goals = side === "home" ? fixture.goalsHome || [] : fixture.goalsAway || [];
      for (const goal of goals) {
        if (!goal?.name || goal.ownGoal || !goal.penalty) continue;
        entryFor(historicalFactKey(goal.name, teamName, fixture.tournamentYear)).penaltyGoal = true;
      }
      for (const player of fixture.keyPlayers?.[side] || []) {
        if (!player?.name) continue;
        const entry = entryFor(historicalFactKey(player.name, teamName, fixture.tournamentYear));
        if (/converted in the shootout/i.test(player.note || "")) entry.converted = true;
        if (/took a shootout penalty/i.test(player.note || "")) entry.missed = true;
      }
    }
  }
  return evidence;
}

function semanticMap(items) {
  return new Map(items.map((item) => [item.id, item]));
}

const ALL_SIGNATURES = new Map();
const ALL_ACTIONS = new Map();
for (const catalog of Object.values(HISTORICAL_STYLE_CATALOGS)) {
  for (const item of catalog.signatures) ALL_SIGNATURES.set(item.id, item);
  for (const item of catalog.actions) ALL_ACTIONS.set(item.id, item);
}
for (const catalog of Object.values(HISTORICAL_EDITORIAL_STYLE_PHRASES)) {
  for (const item of catalog.signatures) ALL_SIGNATURES.set(item.id, item);
  for (const item of catalog.actions) ALL_ACTIONS.set(item.id, item);
}
for (const special of [
  HISTORICAL_SPECIAL_STYLE_PHRASES.penalty,
  HISTORICAL_SPECIAL_STYLE_PHRASES.impact,
  ...Object.values(HISTORICAL_SPECIAL_STYLE_PHRASES.goal)
]) {
  ALL_SIGNATURES.set(special.signature.id, special.signature);
  for (const item of special.actions) ALL_ACTIONS.set(item.id, item);
}
const FACT_ONLY_SPECIAL_SEMANTIC_IDS = new Set([
  HISTORICAL_SPECIAL_STYLE_PHRASES.penalty,
  HISTORICAL_SPECIAL_STYLE_PHRASES.impact,
  ...Object.values(HISTORICAL_SPECIAL_STYLE_PHRASES.goal)
].flatMap((special) => [special.signature.id, ...special.actions.map((item) => item.id)]));
const EDITORIAL_ONLY_SEMANTIC_IDS = new Set(
  Object.values(HISTORICAL_EDITORIAL_STYLE_PHRASES)
    .flatMap((catalog) => [...catalog.signatures, ...catalog.actions])
    .map((item) => item.id)
);
const EXACT_EDITORIAL_ACTION_SOURCE_KINDS = new Set([
  "best-xi-rationale",
  "reviewed-best-xi-rationale"
]);
const REVIEWED_TOURNAMENT_ACTION_SOURCE_KIND = "reviewed-tournament-evidence";
const EXACT_EDITION_ACTION_SOURCE_KINDS = new Set([
  ...EXACT_EDITORIAL_ACTION_SOURCE_KINDS,
  REVIEWED_TOURNAMENT_ACTION_SOURCE_KIND
]);
const RECURRING_ACTION_SOURCE_KINDS = new Set([
  "recurring-best-xi-rationale",
  "reviewed-recurring-best-xi-rationale"
]);
const REVIEWED_ACTION_SOURCE_REQUIREMENTS = Object.freeze({
  "gk-one-v-one": /\bone-on-one\b|\bone v one\b|\b1v1\b/i,
  "mf-counterpress": /\bcounter-?press|\bpress[^.;]{0,36}\b(?:after|when|once)\b[^.;]{0,24}\b(?:ball|possession)\b[^.;]{0,16}\blost\b/i,
  "wing-counterpress": /\bcounter-?press|\bpress[^.;]{0,36}\b(?:after|when|once)\b[^.;]{0,24}\b(?:ball|possession)\b[^.;]{0,16}\blost\b/i,
  "wing-stop-start": /\bstop-start\b|\bpause[^.;]{0,48}\baccelerat|\bslow[^.;]{0,48}\baccelerat|\bchange of pace after (?:the )?defender\b/i,
  "dm-open-body": /\b(?:receive|receives|received|receiving) side-on\b|\bopen(?:s|ed|ing)? (?:his )?body (?:to|before|when) receiv/i,
  "mf-side-on": /\b(?:receive|receives|received|receiving) side-on\b|\bopen(?:s|ed|ing)? (?:his )?body (?:to|before|when) receiv/i,
  "cb-open-pass": /\bopen(?:s|ed|ing)? (?:his )?body (?:after|once|when) (?:the )?(?:ball is won|recovery|interception|turnover|duel is won)\b|\b(?:after|once|when) (?:the )?(?:ball is won|recovery|interception|turnover|duel is won)[^.;]{0,48}\bopen(?:s|ed|ing)? (?:his )?body\b/i
});
const AUTHORED_KEYS = new Set(AUTHORED_HISTORICAL_STYLE_KEYS);
let authoredLocaleTranslations = { es: {}, ko: {} };

function semanticSourceKindsForAction(meta, actionId) {
  return (meta?.semanticSources || [])
    .filter((source) => source?.semanticIds?.includes(actionId))
    .map((source) => source.kind);
}

// This is intentionally route-based rather than a second call into the rationale parser. It
// independently checks what actually supplied the two observable action beats recorded on a card.
function independentlyDerivedEvidenceScope(meta) {
  const actionSourceKinds = (meta?.actions || []).flatMap((actionId) => (
    semanticSourceKindsForAction(meta, actionId)
  ));
  const signatureSourceKinds = (meta?.semanticSources || [])
    .filter((source) => source?.semanticIds?.includes(meta?.signature))
    .map((source) => source.kind);
  if (
    signatureSourceKinds.some((kind) => EXACT_EDITION_ACTION_SOURCE_KINDS.has(kind))
    && actionSourceKinds.some((kind) => EXACT_EDITION_ACTION_SOURCE_KINDS.has(kind))
  ) {
    return "exact-edition";
  }
  if (
    signatureSourceKinds.some((kind) => RECURRING_ACTION_SOURCE_KINDS.has(kind))
    && actionSourceKinds.some((kind) => RECURRING_ACTION_SOURCE_KINDS.has(kind))
  ) {
    return "recurring-cross-edition";
  }
  return "role-level";
}

function allowedSemantics(_profile, role, _penaltyEvidence) {
  const catalogKey = historicalStyleCatalogKeyForRole(role);
  const catalog = HISTORICAL_STYLE_CATALOGS[catalogKey];
  const signatures = semanticMap(catalog.signatures);
  const actions = semanticMap(catalog.actions);
  const editorialCatalog = HISTORICAL_EDITORIAL_STYLE_PHRASES[catalogKey];
  for (const item of editorialCatalog?.signatures || []) signatures.set(item.id, item);
  for (const item of editorialCatalog?.actions || []) actions.set(item.id, item);
  return { signatures, actions };
}

function independentlyAuditMetadata(issues, profileKey, profile, penaltyEvidence) {
  const meta = profile.styleNoteMeta;
  const expectedAuthored = AUTHORED_KEYS.has(profileKey);
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    addIssue(issues, profileKey, "missing-provenance", "styleNoteMeta is required for every historical profile");
    return;
  }
  if (expectedAuthored || meta.origin === "authored") {
    if (meta.origin !== "authored") {
      addIssue(issues, profileKey, "authored-provenance", "editorial spotlight must retain authored provenance");
    }
    if (meta.version !== "historical-style-authored-v1") {
      addIssue(issues, profileKey, "authored-provenance", "editorial spotlight must retain the authored copy version");
    }
    if (!['authored-prose', 'legacy-three'].includes(meta.structureId)) {
      addIssue(issues, profileKey, "authored-provenance", `unsupported authored structureId ${meta.structureId || "none"}`);
    }
    const semanticRoute = getGeneratedPlayerCardCopy(profile.styleNote, { historical: true });
    for (const locale of ["es", "ko"]) {
      const exactOverlay = String(authoredLocaleTranslations[locale]?.[profile.styleNote] || "").trim();
      if (!exactOverlay && !semanticRoute) {
        addIssue(
          issues,
          profileKey,
          "authored-locale-route",
          `${locale} requires an exact archive-content overlay or a valid semantic parser route`
        );
      }
    }
    return;
  }
  if (meta.origin !== "generated") {
    addIssue(issues, profileKey, "generated-provenance", "non-spotlight historical copy must identify its generated origin");
    return;
  }
  if (meta.version !== HISTORICAL_STYLE_COPY_VERSION) {
    addIssue(issues, profileKey, "generator-version", `expected ${HISTORICAL_STYLE_COPY_VERSION}, found ${meta.version || "none"}`);
  }
  const expectedRole = inferHistoricalStyleRole(profile);
  if (meta.role !== expectedRole) {
    addIssue(issues, profileKey, "role-mismatch", `metadata role ${meta.role || "none"} does not match supported role ${expectedRole}`);
  }
  const expectedRoleEvidence = inferHistoricalStyleRoleEvidence(profile);
  if (meta.roleSource !== expectedRoleEvidence.source) {
    addIssue(
      issues,
      profileKey,
      "role-source-mismatch",
      `metadata role source ${meta.roleSource || "none"} does not match ${expectedRoleEvidence.source}`
    );
  }
  let expectedSelection = null;
  try {
    expectedSelection = historicalExpectedStyleSemanticSelection(profile);
  } catch (error) {
    addIssue(issues, profileKey, "semantic-source-selection", error.message);
  }
  if (!HISTORICAL_STYLE_SHAPES.includes(meta.structureId)) {
    addIssue(issues, profileKey, "structure-id", `unknown historical structureId ${meta.structureId || "none"}`);
  }
  if (
    !Array.isArray(meta.sources)
    || !Array.isArray(meta.semanticSources)
    || !Array.isArray(meta.evidence)
    || !/^role-guide-\d+$/u.test(meta.roleGuideVariant || "")
    || !/^role-guide-\d+$/u.test(meta.roleGuidePreferredVariant || "")
    || typeof meta.roleGuideCollisionResolved !== "boolean"
    || !["reinforces-headline", "additional-trait"].includes(meta.supportRelation)
    || !["exact-edition", "recurring-cross-edition", "role-level"].includes(meta.evidenceScope)
    || !meta.confidence
  ) {
    addIssue(
      issues,
      profileKey,
      "provenance-shape",
      "metadata must include its role-guide variant, used profile sources, semantic sources, support relation, evidence scope, evidence tags and confidence"
    );
  }
  if (!Array.isArray(meta.evidence) || !meta.evidence.length) {
    addIssue(issues, profileKey, "evidence-tier", "generated metadata must name concrete evidence or role-inference");
  }
  if (meta.evidence?.includes("editorial-best-xi") && expectedRole === "player") {
    addIssue(issues, profileKey, "editorial-role", "a Best XI position code must never resolve to the generic player role");
  }
  const selectedSemanticIds = [meta.signature, ...(Array.isArray(meta.actions) ? meta.actions : [])];
  if (expectedSelection) {
    if (
      meta.signature !== expectedSelection.signatureId
      || JSON.stringify(meta.actions || []) !== JSON.stringify(expectedSelection.actionIds)
    ) {
      addIssue(
        issues,
        profileKey,
        "semantic-source-selection",
        `selected ${selectedSemanticIds.join(", ")} instead of source-backed ${[
          expectedSelection.signatureId,
          ...expectedSelection.actionIds
        ].join(", ")}`
      );
    }
    if (JSON.stringify(meta.sources || []) !== JSON.stringify(expectedSelection.sourceSkills)) {
      addIssue(
        issues,
        profileKey,
        "recorded-unused-source",
        `recorded sources ${JSON.stringify(meta.sources || [])} do not equal used sources ${JSON.stringify(expectedSelection.sourceSkills)}`
      );
    }
    if (JSON.stringify(meta.semanticSources || []) !== JSON.stringify(expectedSelection.semanticSources)) {
      addIssue(
        issues,
        profileKey,
        "semantic-source-provenance",
        "semanticSources do not match the independently recomputed rationale, profile-source and role routes"
      );
    }
    if (meta.confidence !== expectedSelection.confidence) {
      addIssue(
        issues,
        profileKey,
        "semantic-source-confidence",
        `confidence ${meta.confidence || "none"} does not match ${expectedSelection.confidence}`
      );
    }
    if (meta.evidenceScope !== expectedSelection.evidenceScope) {
      addIssue(
        issues,
        profileKey,
        "semantic-source-scope",
        `evidence scope ${meta.evidenceScope || "none"} does not match ${expectedSelection.evidenceScope}`
      );
    }
    if (meta.roleGuideVariant !== expectedSelection.roleGuideVariant) {
      addIssue(
        issues,
        profileKey,
        "role-guide-variant",
        `role guide ${meta.roleGuideVariant || "none"} does not match roster-aware ${expectedSelection.roleGuideVariant}`
      );
    }
    if (
      meta.roleGuidePreferredVariant !== expectedSelection.roleGuidePreferredVariant
      || meta.roleGuideCollisionResolved !== expectedSelection.roleGuideCollisionResolved
    ) {
      addIssue(
        issues,
        profileKey,
        "role-guide-identity-preference",
        `preferred guide/collision ${meta.roleGuidePreferredVariant || "none"}/${String(meta.roleGuideCollisionResolved)} does not match ${expectedSelection.roleGuidePreferredVariant}/${String(expectedSelection.roleGuideCollisionResolved)}`
      );
    }
    if (meta.supportRelation !== expectedSelection.supportRelation) {
      addIssue(
        issues,
        profileKey,
        "semantic-support-relation",
        `support relation ${meta.supportRelation || "none"} does not match ${expectedSelection.supportRelation}`
      );
    }
  }
  if (Array.isArray(meta.semanticSources)) {
    const selectedIdSet = new Set(selectedSemanticIds);
    for (const source of meta.semanticSources) {
      if (
        !source
        || typeof source.kind !== "string"
        || typeof source.source !== "string"
        || !Array.isArray(source.semanticIds)
        || !source.semanticIds.length
      ) {
        addIssue(issues, profileKey, "semantic-source-shape", "every semantic source must name its kind, source and selected ids");
        continue;
      }
      if (
        source.kind === "reviewed-tournament-evidence"
        && (
          !Array.isArray(source.sourceUrls)
          || !source.sourceUrls.length
          || source.sourceUrls.some((url) => !/^https:\/\//u.test(url))
        )
      ) {
        addIssue(
          issues,
          profileKey,
          "reviewed-source-url",
          "reviewed tournament evidence must retain one or more HTTPS source URLs"
        );
      }
      const unusedIds = source.semanticIds.filter((id) => !selectedIdSet.has(id));
      if (unusedIds.length) {
        addIssue(
          issues,
          profileKey,
          "recorded-unused-source",
          `${source.kind}:${source.source} records unselected semantics ${unusedIds.join(", ")}`
        );
      }
      if (
        source.kind === "role-default"
        && source.semanticIds.some((id) => EDITORIAL_ONLY_SEMANTIC_IDS.has(id))
      ) {
        addIssue(
          issues,
          profileKey,
          "role-guide-editorial-semantic",
          `role-default guide selected editorial-only semantics ${source.semanticIds.filter((id) => EDITORIAL_ONLY_SEMANTIC_IDS.has(id)).join(", ")}`
        );
      }
    }
    const sourcedIds = new Set(meta.semanticSources.flatMap((source) => source?.semanticIds || []));
    const unsourcedIds = selectedSemanticIds.filter((id) => !sourcedIds.has(id));
    if (unsourcedIds.length) {
      addIssue(
        issues,
        profileKey,
        "semantic-source-provenance",
        `selected semantics lack an independently checkable source: ${unsourcedIds.join(", ")}`
      );
    }
    for (const source of meta.sources || []) {
      const used = meta.semanticSources.some((item) => (
        item?.kind === "profile-source"
        && item.source === source
        && item.semanticIds?.some((id) => selectedIdSet.has(id))
      ));
      if (!used) {
        addIssue(issues, profileKey, "recorded-unused-source", `${source} is recorded but drives no selected semantic`);
      }
    }
    const secondActionId = meta.actions?.[1];
    const secondBeatSources = meta.semanticSources.filter((source) => source?.semanticIds?.includes(secondActionId));
    if (secondActionId && secondBeatSources.length !== 1) {
      addIssue(
        issues,
        profileKey,
        "second-beat-source",
        `second action ${secondActionId} must resolve to exactly one semantic source, found ${secondBeatSources.length}`
      );
    }
  }
  const parsedEnglishRelation = parseSupportRelationFromCopy(profile.styleNote, "en");
  const parsedChineseRelation = parseSupportRelationFromCopy(profile.styleNoteZh, "zh");
  if (parsedEnglishRelation !== meta.supportRelation) {
    addIssue(
      issues,
      profileKey,
      "support-relation-copy-en",
      `English copy independently parses as ${parsedEnglishRelation || "ambiguous"}, metadata says ${meta.supportRelation || "none"}`
    );
  }
  if (parsedChineseRelation !== meta.supportRelation) {
    addIssue(
      issues,
      profileKey,
      "support-relation-copy-zh",
      `Chinese copy independently parses as ${parsedChineseRelation || "ambiguous"}, metadata says ${meta.supportRelation || "none"}`
    );
  }
  if (meta.supportRelation === "additional-trait") {
    if (/\b(?:again when|two cues|a second cue|another (?:cue|clue)|another is how|another appears when|the same (?:quality|demand|responsibility))\b/i.test(profile.styleNote || "")) {
      addIssue(issues, profileKey, "causal-additional-join-en", "an additional trait cannot be framed as another clue or repeated proof of the headline");
    }
    if (/(?:同一特点|同一角色要求|同一要求|再次(?:体现|出现|说明)|另一个线索|第二个线索)/u.test(profile.styleNoteZh || "")) {
      addIssue(issues, profileKey, "causal-additional-join-zh", "an additional trait cannot be framed as repeated proof of the headline in Chinese");
    }
  }
  const exactEditorialActionIds = (meta.actions || []).filter((actionId) => (
    semanticSourceKindsForAction(meta, actionId)
      .some((kind) => EXACT_EDITORIAL_ACTION_SOURCE_KINDS.has(kind))
  ));
  const reviewedActionIds = (meta.actions || []).filter((actionId) => (
    semanticSourceKindsForAction(meta, actionId)
      .includes(REVIEWED_TOURNAMENT_ACTION_SOURCE_KIND)
  ));
  const recurringActionIds = (meta.actions || []).filter((actionId) => (
    semanticSourceKindsForAction(meta, actionId)
      .some((kind) => RECURRING_ACTION_SOURCE_KINDS.has(kind))
  ));
  const roleDefaultActionIds = (meta.actions || []).filter((actionId) => (
    semanticSourceKindsForAction(meta, actionId).includes("role-default")
  ));
  const signatureSourceKinds = (meta.semanticSources || [])
    .filter((source) => source?.semanticIds?.includes(meta.signature))
    .map((source) => source.kind);
  const exactEditionSignatureMatch = signatureSourceKinds
    .some((kind) => EXACT_EDITION_ACTION_SOURCE_KINDS.has(kind));
  const independentlyDerivedScope = independentlyDerivedEvidenceScope(meta);
  if (meta.evidenceScope !== independentlyDerivedScope) {
    addIssue(
      issues,
      profileKey,
      "independent-evidence-scope",
      `recorded ${meta.evidenceScope || "none"}, but selected action routes independently resolve to ${independentlyDerivedScope}`
    );
  }
  if (meta.confidence === "editorial" && !meta.evidence?.includes("editorial-best-xi")) {
    addIssue(issues, profileKey, "evidence-tier", "editorial confidence requires Best XI context");
  }
  if (
    meta.confidence === "editorial"
    && (
      meta.evidenceScope !== "exact-edition"
      || !exactEditionSignatureMatch
      || !exactEditorialActionIds.length
      || !meta.evidence?.includes("editorial-hint-match")
      || !meta.evidence?.includes("editorial-action-match")
    )
  ) {
    addIssue(
      issues,
      profileKey,
      "evidence-tier",
      "editorial confidence requires a headline and at least one observable action from this edition's Best XI rationale"
    );
  }
  if (
    meta.evidence?.includes("editorial-hint-match")
    && !exactEditorialActionIds.length
  ) {
    addIssue(
      issues,
      profileKey,
      "evidence-tier",
      "editorial-hint-match cannot be inferred from a headline-only or cross-edition route"
    );
  }
  if (
    meta.confidence === "editorial"
    && roleDefaultActionIds.length === (meta.actions || []).length
  ) {
    addIssue(
      issues,
      profileKey,
      "editorial-role-default-actions",
      "editorial confidence cannot be attached to two role-default actions"
    );
  }
  if (meta.confidence === "role-level" && !meta.evidence?.includes("role-inference")) {
    addIssue(issues, profileKey, "evidence-tier", "role-level copy must disclose role-inference evidence");
  }
  if (
    meta.confidence === "role-level"
    && meta.evidenceScope === "role-level"
    && (exactEditorialActionIds.length || reviewedActionIds.length)
    && !meta.evidence?.includes("exact-edition-partial-context")
  ) {
    addIssue(
      issues,
      profileKey,
      "partial-exact-context",
      "a mixed exact-edition action and role-level headline must disclose partial context"
    );
  }
  if (
    meta.evidenceScope === "recurring-cross-edition"
    && (
      !recurringActionIds.length
      || meta.confidence !== "role-level"
      || !meta.evidence?.includes("recurring-cross-edition-context")
    )
  ) {
    addIssue(
      issues,
      profileKey,
      "cross-edition-tier",
      "cross-edition action context must stay explicitly marked and use role-level visible prose"
    );
  }
  if (meta.confidence === "reviewed" && !meta.evidence?.includes("reviewed-semantic-override")) {
    addIssue(issues, profileKey, "evidence-tier", "reviewed copy must disclose its reviewed semantic override");
  }
  if (
    meta.confidence === "reviewed"
    && (
      meta.evidenceScope !== "exact-edition"
      || !exactEditionSignatureMatch
      || !reviewedActionIds.length
      || !meta.evidence?.includes("reviewed-action-match")
    )
  ) {
    addIssue(
      issues,
      profileKey,
      "evidence-tier",
      "reviewed confidence requires an exact-edition headline plus an observable action from URL-backed tournament evidence"
    );
  }
  if (
    meta.confidence === "reviewed"
    && !meta.semanticSources?.some((source) => (
      source.kind === "reviewed-tournament-evidence" && source.sourceUrls?.length
    ))
  ) {
    addIssue(issues, profileKey, "evidence-tier", "reviewed copy must retain at least one machine-readable source URL");
  }
  if (meta.confidence === "supported") {
    addIssue(
      issues,
      profileKey,
      "evidence-tier",
      "a goal, converted penalty or substitute appearance cannot support a precise technique claim"
    );
  }
  if (!["editorial", "reviewed", "role-level"].includes(meta.confidence)) {
    addIssue(issues, profileKey, "evidence-tier", `unknown confidence tier ${meta.confidence || "none"}`);
  }
  if (!Array.isArray(meta.actions) || meta.actions.length !== 2 || new Set(meta.actions).size !== 2) {
    addIssue(issues, profileKey, "semantic-actions", "metadata must identify two distinct action ids");
    return;
  }
  if (historicalActionFamily(meta.actions[0]) === historicalActionFamily(meta.actions[1])) {
    addIssue(
      issues,
      profileKey,
      "semantic-action-family",
      `actions ${meta.actions.join(" and ")} repeat the same tactical family`
    );
  }
  for (const actionId of meta.actions) {
    if (historicalSignatureActionConflict(meta.signature, actionId)) {
      addIssue(
        issues,
        profileKey,
        "semantic-thesis-mechanism",
        `signature ${meta.signature} and action ${actionId} restate the same claim`
      );
    }
  }

  if (!historicalActionSupportsSignature(meta.signature, meta.actions[0])) {
    addIssue(
      issues,
      profileKey,
      "semantic-thesis-mechanism",
      `first action ${meta.actions[0]} does not demonstrate signature ${meta.signature}`
    );
  }
  const factOnlyClaims = selectedSemanticIds.filter((id) => FACT_ONLY_SPECIAL_SEMANTIC_IDS.has(id));
  if (factOnlyClaims.length) {
    addIssue(
      issues,
      profileKey,
      "fact-to-technique",
      `archive result facts cannot establish technique claims ${factOnlyClaims.join(", ")}`
    );
  }

  const allowed = allowedSemantics(profile, expectedRole, penaltyEvidence);
  const signature = allowed.signatures.get(meta.signature);
  if (!signature) {
    addIssue(issues, profileKey, "role-claim", `signature ${meta.signature || "none"} is unsupported for ${expectedRole}`);
  }
  const actionPhrases = meta.actions.map((id) => allowed.actions.get(id));
  for (const [index, action] of actionPhrases.entries()) {
    if (!action) {
      addIssue(issues, profileKey, "role-claim", `action ${meta.actions[index]} is unsupported for ${expectedRole}`);
    }
  }

  const claimsPenaltyTechnique = meta.signature === HISTORICAL_SPECIAL_STYLE_PHRASES.penalty.signature.id
    || meta.actions.some((id) => HISTORICAL_SPECIAL_STYLE_PHRASES.penalty.actions.some((item) => item.id === id));
  if (claimsPenaltyTechnique) {
    addIssue(issues, profileKey, "penalty-claim", "a recorded kick alone cannot establish a repeatable penalty technique");
  }
  if (penaltyEvidence?.missed && !(penaltyEvidence.penaltyGoal || penaltyEvidence.converted) && (profile.skills || []).includes("Penalty pressure")) {
    addIssue(issues, profileKey, "penalty-skill", "miss-only shootout participation must not retain the Penalty pressure skill");
  }

  if (signature) {
    if (!normalizeCopyText(profile.styleNote).includes(normalizeCopyText(signature.en))) {
      addIssue(issues, profileKey, "semantic-en", `English copy is missing signature phrase ${meta.signature}`);
    }
    if (!String(profile.styleNoteZh || "").includes(signature.zh)) {
      addIssue(issues, profileKey, "semantic-zh", `Chinese copy is missing signature phrase ${meta.signature}`);
    }
  }
  for (const action of actionPhrases.filter(Boolean)) {
    if (!normalizeCopyText(profile.styleNote).includes(normalizeCopyText(action.en))) {
      addIssue(issues, profileKey, "semantic-en", `English copy is missing action phrase ${action.id}`);
    }
    if (!String(profile.styleNoteZh || "").includes(action.zh)) {
      addIssue(issues, profileKey, "semantic-zh", `Chinese copy is missing action phrase ${action.id}`);
    }
  }
  const mention = historicalPlayerReferenceName(profile);
  if (
    mention
    && !String(profile.styleNote || "").toLocaleLowerCase("en-US")
      .includes(mention.toLocaleLowerCase("en-US"))
  ) {
    addIssue(issues, profileKey, "player-mention", `English copy must use the intact player reference "${mention}"`);
  }
}

function auditSemanticConcentration(issues, profiles) {
  const byRole = new Map();
  const repeatedPlayerStructures = new Map();
  const confidenceCounts = new Map();
  const evidenceScopeCounts = new Map();
  const editorialExactActionCounts = new Map();
  const shapeCounts = new Map();
  let bothActionsRoleDefault = 0;
  let editorialWithBothActionsRoleDefault = 0;
  let partialExactEditionContext = 0;
  let authoredCount = 0;
  for (const [profileKey, profile] of profiles) {
    const meta = profile.styleNoteMeta;
    if (meta?.origin !== "generated") {
      if (meta?.origin === "authored") authoredCount += 1;
      continue;
    }
    increment(confidenceCounts, meta.confidence || "missing");
    increment(evidenceScopeCounts, meta.evidenceScope || "missing");
    increment(shapeCounts, meta.structureId || "missing");
    const exactEditorialActionCount = (meta.actions || []).filter((actionId) => (
      semanticSourceKindsForAction(meta, actionId)
        .some((kind) => EXACT_EDITORIAL_ACTION_SOURCE_KINDS.has(kind))
    )).length;
    const reviewedActionCount = (meta.actions || []).filter((actionId) => (
      semanticSourceKindsForAction(meta, actionId)
        .includes(REVIEWED_TOURNAMENT_ACTION_SOURCE_KIND)
    )).length;
    if (meta.confidence === "editorial") {
      increment(editorialExactActionCounts, String(exactEditorialActionCount));
    }
    const roleDefaultActionCount = (meta.actions || []).filter((actionId) => (
      semanticSourceKindsForAction(meta, actionId).includes("role-default")
    )).length;
    if (roleDefaultActionCount === 2) {
      bothActionsRoleDefault += 1;
      if (meta.confidence === "editorial") editorialWithBothActionsRoleDefault += 1;
    }
    if (
      meta.confidence === "role-level"
      && meta.evidenceScope === "role-level"
      && (exactEditorialActionCount || reviewedActionCount)
    ) {
      partialExactEditionContext += 1;
    }
    if (meta.confidence === "role-level") {
      if (!byRole.has(meta.role)) {
        byRole.set(meta.role, { total: 0, signatures: new Map(), actions: new Map(), triples: new Map() });
      }
      const role = byRole.get(meta.role);
      role.total += 1;
      increment(role.signatures, meta.signature);
      for (const action of meta.actions || []) increment(role.actions, action);
      increment(role.triples, [meta.signature, ...(meta.actions || [])].join("|"));
    }

    const playerKey = `${normalizePlayerName(profile.name)}|${normalizeTeamName(profile.teamName)}`;
    const structure = `${meta.signature}|${(meta.actions || []).join("|")}|${meta.structureId}`;
    if (!repeatedPlayerStructures.has(playerKey)) repeatedPlayerStructures.set(playerKey, new Map());
    const playerStructures = repeatedPlayerStructures.get(playerKey);
    if (playerStructures.has(structure)) {
      addIssue(
        issues,
        profileKey,
        "repeat-across-editions",
        `repeats the same signature, actions and shape used in ${playerStructures.get(structure)}`
      );
    } else {
      playerStructures.set(structure, profileKey);
    }
  }
  const generatedTotal = [...shapeCounts.values()].reduce((sum, count) => sum + count, 0);
  const [topShape = ["", 0]] = topEntries(shapeCounts, 1);
  if (shapeCounts.size !== HISTORICAL_STYLE_SHAPES.length) {
    addIssue(
      issues,
      "corpus",
      "cadence-diversity",
      `generated cards use ${shapeCounts.size}/${HISTORICAL_STYLE_SHAPES.length} required cadence families`
    );
  }
  if (generatedTotal && topShape[1] / generatedTotal > 0.12) {
    addIssue(
      issues,
      "corpus",
      "cadence-concentration",
      `${topShape[0]} covers ${formatShare(topShape[1], generatedTotal)} of generated cards`
    );
  }
  console.log(
    `Historical cadence baseline: ${shapeCounts.size}/${HISTORICAL_STYLE_SHAPES.length} families; `
      + `largest ${topShape[0]}:${formatShare(topShape[1], generatedTotal)}.`
  );
  const roleSourceLimits = [...byRole.entries()]
    .filter(([, role]) => role.total >= 20)
    .map(([roleName, role]) => {
      const [topSignature = ["", 0]] = topEntries(role.signatures, 1);
      return `${roleName}:${topSignature[0]} ${formatShare(topSignature[1], role.total)}`;
  });
  console.log(`Historical source-limited role cores: ${roleSourceLimits.join("; ")}.`);
  const roleTripleLimits = [...byRole.entries()]
    .filter(([, role]) => role.total >= 20)
    .map(([roleName, role]) => {
      const [topTriple = ["", 0]] = topEntries(role.triples, 1);
      return `${roleName}:${formatShare(topTriple[1], role.total)}`;
    });
  console.log(`Historical source-limited full triples: ${roleTripleLimits.join("; ")}.`);
  console.log(
    `Historical provenance baseline: authored:${authoredCount}; generated confidence ${[...confidenceCounts.entries()]
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([label, count]) => `${label}:${count}`)
      .join(", ")}.`
  );
  console.log(
    `Historical evidence-scope baseline: ${[...evidenceScopeCounts.entries()]
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([label, count]) => `${label}:${count}`)
      .join(", ")}; editorial exact-action coverage ${[...editorialExactActionCounts.entries()]
      .sort((left, right) => Number(left[0]) - Number(right[0]))
      .map(([count, cards]) => `${count}-action:${cards}`)
      .join(", ") || "none"}.`
  );
  console.log(
    `Historical role-default action baseline: ${bothActionsRoleDefault} cards use two role-default actions; `
      + `${editorialWithBothActionsRoleDefault} are labeled editorial; `
      + `${partialExactEditionContext} mixed cards retain exact-edition action context under role-level prose.`
  );
  if (editorialWithBothActionsRoleDefault) {
    addIssue(
      issues,
      "corpus",
      "editorial-role-default-actions",
      `${editorialWithBothActionsRoleDefault} cards label two role-default actions as editorial`
    );
  }
}

function auditGeneratorContracts(issues, profiles = []) {
  for (const [profileKey, override] of Object.entries(HISTORICAL_REVIEWED_SEMANTIC_OVERRIDES)) {
    for (const actionId of override.actionIds || []) {
      const requirement = REVIEWED_ACTION_SOURCE_REQUIREMENTS[actionId];
      if (requirement && !requirement.test(String(override.source || ""))) {
        addIssue(
          issues,
          profileKey,
          "reviewed-action-source",
          `${actionId} requires an observable action in the reviewed source label; found "${override.source || "none"}"`
        );
      }
    }
  }

  const referenceCases = [
    [{ displayName: "Alexis Mac Allister", teamName: "Argentina" }, "Mac Allister"],
    [{ displayName: "Vinícius Júnior", teamName: "Brazil" }, "Vinícius Júnior"],
    [{ displayName: "Neymar Jr.", teamName: "Brazil" }, "Neymar Jr"],
    [{ displayName: "Hong Myung-bo", teamName: "South Korea" }, "Hong Myung-bo"],
    [{ displayName: "Myung-bo Hong", teamName: "Korea Republic" }, "Myung-bo Hong"],
    [{ displayName: "Ahmed Ben Salah", teamName: "Tunisia" }, "Ben Salah"],
    [{ displayName: "Carlos El Ghali", teamName: "Morocco" }, "El Ghali"],
    [{ displayName: "Jean St. Clair", teamName: "France" }, "St. Clair"]
  ];
  for (const [profile, expected] of referenceCases) {
    const actual = historicalPlayerReferenceName(profile);
    if (actual !== expected) {
      addIssue(issues, "generator contract", "reference-name", `${profile.displayName} resolved to ${actual}; expected ${expected}`);
    }
  }

  if (
    historicalIdentityNameKey("Myung-bo Hong", "South Korea")
      !== historicalIdentityNameKey("Hong Myung-bo", "South Korea")
    || historicalIdentityNameKey("Sang-chul Yoo", "South Korea")
      !== historicalIdentityNameKey("Yoo Sang-chul", "South Korea")
  ) {
    addIssue(issues, "generator contract", "korean-identity", "reversed Korean source spellings must resolve to one fact identity");
  }

  const profilesByKey = new Map(profiles);
  const roleRegressionCases = [
    ["Yann Sommer / Switzerland / 2018", ["goalkeeper"]],
    ["Noel Valladares / Honduras / 2014", ["goalkeeper"]],
    ["Carles Puyol / Spain / 2002", ["full-back"]],
    ["Maxime Bossis / France / 1982", ["centre-back", "defender"]],
    ["Blaise Matuidi / France / 2014", ["defensive-midfielder", "central-midfielder", "attacking-midfielder", "midfielder"]],
    ["Sami Khedira / Germany / 2014", ["defensive-midfielder", "central-midfielder", "attacking-midfielder", "midfielder"]],
    ["Lionel Messi / Argentina / 2018", ["wide-attacker", "attacking-midfielder", "second-striker"]],
    ["Andrés Iniesta / Spain / 2018", ["wide-attacker"]],
    ["Garrincha / Brazil / 1966", ["wide-attacker"]],
    ["Cafu / Brazil / 2006", ["full-back", "wing-back"]],
    ["Dani Alves / Brazil / 2014", ["full-back", "wing-back"]],
    ["Marcelo / Brazil / 2014", ["full-back", "wing-back"]],
    ["Mohamed Salah / Egypt / 2018", ["wide-attacker"]],
    ["Cristiano Ronaldo / Portugal / 2006", ["wide-attacker"]],
    ["Roberto Baggio / Italy / 1990", ["second-striker"]],
    ["Roberto Baggio / Italy / 1994", ["second-striker"]],
    ["Roberto Baggio / Italy / 1998", ["second-striker"]],
    ["Gerd Müller / West Germany / 1970", ["striker"]],
    ["Gerd Müller / West Germany / 1974", ["striker"]],
    ["Sergio Ramos / Spain / 2018", ["centre-back"]],
    ["Robin van Persie / Netherlands / 2014", ["striker"]],
    ["Kevin De Bruyne / Belgium / 2022", ["midfielder", "attacking-midfielder"]],
    ["Xavi / Spain / 2002", ["central-midfielder"]],
    ["Ronaldinho / Brazil / 2006", ["attacking-midfielder", "second-striker"]]
  ];
  for (const [profileKey, expectedRoles] of roleRegressionCases) {
    const profile = profilesByKey.get(profileKey);
    if (!profile) continue;
    const resolvedRole = inferHistoricalStyleRole(profile);
    if (!expectedRoles.includes(resolvedRole) || profile.styleNoteMeta?.role !== resolvedRole) {
      addIssue(
        issues,
        profileKey,
        "role-evidence-regression",
        `resolved ${resolvedRole || "none"}; expected one of ${expectedRoles.join(", ")}`
      );
    }
  }

  for (const profileKey of [
    "Roberto Baggio / Italy / 1990",
    "Roberto Baggio / Italy / 1994",
    "Roberto Baggio / Italy / 1998"
  ]) {
    const profile = profilesByKey.get(profileKey);
    if (!profile) continue;
    if (profile.styleNoteMeta?.origin === "authored") continue;
    const selectedIds = [profile.styleNoteMeta?.signature, ...(profile.styleNoteMeta?.actions || [])];
    const forbidden = selectedIds.filter((id) => ["fw-press", "fw-press-curve"].includes(id));
    if (
      profile.styleNoteMeta?.role !== "second-striker"
      || profile.styleNoteMeta?.signature !== "fw-separation"
      || forbidden.length
    ) {
      addIssue(
        issues,
        profileKey,
        "second-striker-identity-regression",
        `Baggio needs a separation-led second-striker guide, not ${selectedIds.join(", ")}`
      );
    }
  }

  for (const profileKey of [
    "Dani Alves / Brazil / 2014",
    "Marcelo / Brazil / 2014"
  ]) {
    const profile = profilesByKey.get(profileKey);
    if (!profile) continue;
    const selectedIds = [profile.styleNoteMeta?.signature, ...(profile.styleNoteMeta?.actions || [])];
    if (
      !["full-back", "wing-back"].includes(profile.styleNoteMeta?.role)
      || selectedIds.some((id) => /^cb-/.test(id || ""))
    ) {
      addIssue(
        issues,
        profileKey,
        "full-back-identity-regression",
        `a reviewed full-back cannot retain centre-back semantics ${selectedIds.join(", ")}`
      );
    }
  }

  for (const profileKey of [
    "Mohamed Salah / Egypt / 2018",
    "Cristiano Ronaldo / Portugal / 2006"
  ]) {
    const profile = profilesByKey.get(profileKey);
    if (!profile) continue;
    const selectedIds = [profile.styleNoteMeta?.signature, ...(profile.styleNoteMeta?.actions || [])];
    if (
      profile.styleNoteMeta?.role !== "wide-attacker"
      || selectedIds.some((id) => /^fw-/.test(id || ""))
    ) {
      addIssue(
        issues,
        profileKey,
        "wide-attacker-identity-regression",
        `the wide-attacker role cannot retain centre-forward semantics ${selectedIds.join(", ")}`
      );
    }
  }

  for (const profileKey of [
    "Gerd Müller / West Germany / 1970",
    "Gerd Müller / West Germany / 1974"
  ]) {
    const profile = profilesByKey.get(profileKey);
    if (!profile) continue;
    if (profile.styleNoteMeta?.origin === "authored") continue;
    const selectedIds = [profile.styleNoteMeta?.signature, ...(profile.styleNoteMeta?.actions || [])];
    const hasRunIdentity = selectedIds.some((id) => ["fw-run", "fw-start-run", "fw-delay-run"].includes(id));
    const hasFinishIdentity = selectedIds.some((id) => [
      "fw-finish", "fw-one-touch", "fw-shot-early", "fw-box-pause"
    ].includes(id));
    const forbidden = selectedIds.filter((id) => [
      "fw-reference", "fw-link", "fw-pin", "fw-body-return", "fw-pull-wide"
    ].includes(id));
    if (
      profile.styleNoteMeta?.role !== "striker"
      || !hasRunIdentity
      || !hasFinishIdentity
      || forbidden.length
    ) {
      addIssue(
        issues,
        profileKey,
        "finisher-runner-identity-regression",
        `Müller's evidence calls for finishing and run timing, not ${selectedIds.join(", ")}`
      );
    }
  }

  const ronaldinho2006 = profilesByKey.get("Ronaldinho / Brazil / 2006");
  if (ronaldinho2006) {
    const selectedIds = [
      ronaldinho2006.styleNoteMeta?.signature,
      ...(ronaldinho2006.styleNoteMeta?.actions || [])
    ];
    if (
      !["attacking-midfielder", "second-striker"].includes(ronaldinho2006.styleNoteMeta?.role)
      || selectedIds.some((id) => ["fw-run", "fw-start-run"].includes(id))
    ) {
      addIssue(
        issues,
        ronaldinho2006.profileKey,
        "edition-role-regression",
        `Ronaldinho 2006 needs the reviewed attacking-midfield role carried from 2002 evidence, not ${selectedIds.join(", ")}`
      );
    }
  }

  const puskas = profilesByKey.get("Ferenc Puskás / Hungary / 1954");
  if (puskas && puskas.styleNoteMeta?.origin !== "authored" && (
    puskas.styleNoteMeta?.confidence !== "role-level"
    || [puskas.styleNoteMeta?.signature, ...(puskas.styleNoteMeta?.actions || [])]
      .some((id) => ["mf-transition", "mf-counterpress"].includes(id))
  )) {
    addIssue(
      issues,
      puskas.profileKey,
      "fact-to-technique-regression",
      "Puskás 1954 has scoring and injury context, not evidence for a defining transition technique"
    );
  }
  const modric2022 = profilesByKey.get("Luka Modrić / Croatia / 2022");
  if (modric2022 && /从从|用用|松散触球/u.test(modric2022.styleNoteZh || "")) {
    addIssue(issues, modric2022.profileKey, "chinese-regression", "Modrić 2022 retains a doubled token or loose-touch calque");
  }
  for (const profileKey of [
    "Enrique Ballestrero / Uruguay / 1930",
    "Gilmar / Brazil / 1962"
  ]) {
    const profile = profilesByKey.get(profileKey);
    if (!profile) continue;
    const hints = historicalEditorialHintIds(profile);
    const falseCrossIds = new Set(["gk-box", "gk-cross"]);
    if ([...hints.signatureIds, ...hints.actionIds].some((id) => falseCrossIds.has(id))) {
      addIssue(issues, profileKey, "editorial-substring", "the word across must not be treated as cross handling evidence");
    }
  }
  const maradona = profilesByKey.get("Diego Maradona / Argentina / 1986");
  if (maradona) {
    const hints = historicalEditorialHintIds(maradona);
    if (
      !hints.signatureIds.includes("mf-progression")
      || !hints.actionIds.includes("mf-carry-gap")
      || hints.actionIds.includes("mf-counterpress")
    ) {
      addIssue(
        issues,
        maradona.profileKey,
        "editorial-inflection",
        "carried must map to ball progression, while pressure alone must not imply counterpressing"
      );
    }
  }

  for (const profileKey of [
    "Aldair / Brazil / 1994",
    "Márcio Santos / Brazil / 1994"
  ]) {
    const profile = profilesByKey.get(profileKey);
    if (!profile) continue;
    const hints = historicalEditorialHintIds(profile);
    if (
      hints.signatureIds.includes("cb-aerial")
      || hints.actionIds.includes("cb-aerial-contact")
    ) {
      addIssue(
        issues,
        profileKey,
        "editorial-substring",
        "the player name Aldair must not be treated as evidence of aerial defending"
      );
    }
  }

  const forbiddenEditorialCases = [
    {
      keys: ["José Santamaría / Uruguay / 1954"],
      ids: ["cb-first-pass", "cb-open-pass"],
      message: "carrying the holders through a tie is not ball progression"
    },
    {
      keys: ["Guido Buchwald / West Germany / 1990"],
      ids: ["cb-first-pass", "cb-open-pass"],
      message: "carried out a marking job is not ball progression"
    },
    {
      keys: [
        "Teófilo Cubillas / Peru / 1970",
        "Dirceu / Brazil / 1978",
        "Michel Platini / France / 1982",
        "Lionel Messi / Argentina / 2014",
        "Ivan Rakitić / Croatia / 2018"
      ],
      ids: ["mf-progression", "mf-carry-gap"],
      message: "carrying a team, creative responsibility, creation, or workload is not an on-ball carry"
    },
    {
      keys: ["Berti Vogts / West Germany / 1970"],
      ids: ["fb-recovery", "fb-recovery-run"],
      message: "a team recovering from a result is not a full-back recovery action"
    },
    {
      keys: ["Sune Andersson / Sweden / 1950", "Patrick Vieira / France / 2006"],
      ids: ["mf-transition", "mf-counterpress"],
      message: "recovering from a result or recovering authority is not a defensive transition"
    },
    {
      keys: ["Werner Liebrich / West Germany / 1954", "Raphaël Varane / France / 2022"],
      ids: ["cb-cover", "cb-track-channel"],
      message: "recovered must not match the cover root inside the word"
    },
    {
      keys: ["Luis Regueiro / Spain / 1934", "Guillermo Stábile / Argentina / 1930"],
      ids: ["fw-link", "fw-body-return"],
      message: "replay and played must not match lay as link-play evidence"
    },
    {
      keys: ["Antonín Puč / Czechoslovakia / 1934", "Ángel Di María / Argentina / 2014"],
      ids: ["wing-isolation", "wing-touch-away"],
      message: "a shot beating a goalkeeper or team is not dribbling past a defender"
    },
    {
      keys: ["Brian Laudrup / Denmark / 1998"],
      ids: ["fw-run", "fw-start-run"],
      message: "a quarter-final run is not an attacking run behind the defence"
    }
  ];
  for (const testCase of forbiddenEditorialCases) {
    for (const profileKey of testCase.keys) {
      const profile = profilesByKey.get(profileKey);
      if (!profile) continue;
      const hints = historicalEditorialHintIds(profile);
      const hintedIds = [...hints.signatureIds, ...hints.actionIds];
      const selectedIds = [profile.styleNoteMeta?.signature, ...(profile.styleNoteMeta?.actions || [])];
      const forbiddenIds = testCase.ids.filter(
        (id) => hintedIds.includes(id) || selectedIds.includes(id)
      );
      if (forbiddenIds.length) {
        addIssue(
          issues,
          profileKey,
          "editorial-narrative-verb",
          `${testCase.message}; found ${forbiddenIds.join(", ")}`
        );
      }
    }
  }

  const onBallCarryCases = [
    ...[
      "José Leandro Andrade / Uruguay / 1930",
      "Didi / Brazil / 1958",
      "Yuri Voynov / Soviet Union / 1958",
      "Josef Masopust / Czechoslovakia / 1962",
      "Bobby Charlton / England / 1966",
      "Jean Tigana / France / 1986",
      "Enzo Scifo / Belgium / 1986",
      "Paul Gascoigne / England / 1990",
      "Krasimir Balakov / Bulgaria / 1994",
      "Ronaldinho / Brazil / 2002",
      "Patrick Vieira / France / 2006",
      "Bastian Schweinsteiger / Germany / 2010"
    ].map((profileKey) => [profileKey, "mf-progression", "mf-carry-gap"]),
    ["Hasan Şaş / Turkey / 2002", "wing-transition", "wing-carry-head-up"]
  ];
  for (const [profileKey, expectedSignatureId, expectedActionId] of onBallCarryCases) {
    const profile = profilesByKey.get(profileKey);
    if (!profile) continue;
    const hints = historicalEditorialHintIds(profile);
    if (
      !hints.signatureIds.includes(expectedSignatureId)
      || !hints.actionIds.includes(expectedActionId)
    ) {
      addIssue(
        issues,
        profileKey,
        "editorial-carry-action",
        "explicit on-ball carrying language must retain progression and carry-action evidence"
      );
    }
  }

  for (const profileKey of [
    "Sergio Batista / Argentina / 1986",
    "Didier Deschamps / France / 1998",
    "Mark van Bommel / Netherlands / 2010"
  ]) {
    const profile = profilesByKey.get(profileKey);
    if (!profile) continue;
    const hints = historicalEditorialHintIds(profile);
    if (
      inferHistoricalStyleRole(profile) !== "defensive-midfielder"
      || profile.styleNoteMeta?.role !== "defensive-midfielder"
      || profile.styleNoteMeta?.signature !== "dm-screen"
      || !hints.signatureIds.includes("dm-screen")
    ) {
      addIssue(
        issues,
        profileKey,
        "editorial-screen-role",
        "a central midfielder explicitly screening the back line, back four, or transitions needs holding-midfielder semantics"
      );
    }
  }

  const exactEditorialSemantics = [
    {
      key: "Kalle Svensson / Sweden / 1958",
      required: [],
      forbidden: ["gk-patience", "gk-one-v-one"]
    },
    {
      key: "Gianluigi Buffon / Italy / 2006",
      required: [],
      forbidden: ["gk-patience", "gk-one-v-one"]
    },
    {
      key: "Enrique Guaita / Italy / 1934",
      required: ["wing-inside", "wing-halfspace"],
      forbidden: ["wing-width", "wing-early-cross"]
    },
    {
      key: "Éder / Brazil / 1982",
      required: ["wing-width"],
      forbidden: ["wing-inside", "wing-halfspace"]
    },
    {
      key: "Silvio Piola / Italy / 1938",
      required: ["fw-finish"],
      forbidden: ["fw-separation"]
    },
    {
      key: "Tostão / Brazil / 1970",
      required: ["fw-organise-movement", "fw-draw-release"],
      forbidden: ["fw-run", "fw-separation", "fw-start-run", "fw-reference"]
    },
    {
      key: "Romário / Brazil / 1994",
      required: ["fw-finish"],
      forbidden: ["fw-reference", "fw-near-post"]
    },
    {
      key: "Davor Šuker / Croatia / 1998",
      required: ["fw-separation", "fw-finish"],
      forbidden: ["fw-reference", "fw-near-post", "fw-start-run"]
    },
    {
      key: "Diego Forlán / Uruguay / 2010",
      required: ["fw-separation"],
      forbidden: ["fw-reference", "fw-near-post", "fw-start-run"]
    },
    {
      key: "Sándor Kocsis / Hungary / 1954",
      required: ["fw-finish", "fw-near-post"],
      forbidden: ["fw-reference"]
    },
    {
      key: "Miroslav Klose / Germany / 2002",
      required: ["fw-finish", "fw-near-post"],
      forbidden: ["fw-reference"]
    },
    {
      key: "Mario Kempes / Argentina / 1978",
      required: ["mf-late-run", "mf-late-box"],
      forbidden: ["mf-transition"]
    },
    {
      key: "Aldair / Brazil / 1994",
      required: ["cb-cover", "cb-calm-distribution"],
      forbidden: ["cb-aerial"]
    }
  ];
  for (const testCase of exactEditorialSemantics) {
    const profile = profilesByKey.get(testCase.key);
    if (!profile) continue;
    const hints = historicalEditorialHintIds(profile);
    const hintedIds = [...hints.signatureIds, ...hints.actionIds];
    const selectedIds = [profile.styleNoteMeta?.signature, ...(profile.styleNoteMeta?.actions || [])];
    const combinedIds = new Set([...hintedIds, ...selectedIds]);
    const missing = testCase.required.filter((id) => !combinedIds.has(id));
    const forbidden = testCase.forbidden.filter((id) => combinedIds.has(id));
    if (missing.length || forbidden.length) {
      addIssue(
        issues,
        testCase.key,
        "editorial-exact-semantics",
        `missing ${missing.join(", ") || "none"}; forbidden ${forbidden.join(", ") || "none"}`
      );
    }
  }

  const reviewedSemanticRoutes = [
    {
      key: "Gianluca Zambrotta / Italy / 2006",
      signature: "fb-carry-balance",
      actions: ["fb-carry-out-pressure", "fb-reset-line"],
      forbidden: ["fb-duel", "fb-show-line", "fb-block-cross"]
    },
    {
      key: "Alexis Mac Allister / Argentina / 2022",
      signature: "mf-versatility",
      actions: ["mf-balance-two-way", "mf-final-pass-runner"],
      forbidden: ["mf-angle", "mf-move-after", "mf-simple-reset"]
    },
    {
      key: "Zinedine Zidane / France / 1998",
      signature: "mf-corner-seam",
      actions: ["mf-corner-arrival", "mf-repeat-corner-route"],
      forbidden: ["mf-angle", "mf-side-on", "mf-late-box"]
    },
    {
      key: "Kaká / Brazil / 2006",
      signature: "mf-progression",
      actions: ["mf-beat-defender-carry", "mf-left-foot-finish"],
      forbidden: ["mf-carry-gap", "mf-release-runner"]
    },
    {
      key: "Fabio Cannavaro / Italy / 2006",
      signature: "cb-aerial",
      actions: ["cb-aerial-contact", "cb-step-possession"],
      forbidden: ["cb-open-pass"]
    },
    {
      key: "Thomas Müller / Germany / 2014",
      signature: "fw-space-arrival",
      actions: ["fw-leave-expected-zone", "fw-arrive-decisive-zone"],
      forbidden: ["fw-pull-wide", "fw-near-post"]
    },
    {
      key: "Sergio Busquets / Spain / 2010",
      signature: "dm-screen",
      actions: ["dm-delay-counter", "dm-break-line"],
      forbidden: ["dm-switch", "dm-open-body"]
    },
    {
      key: "Xavi / Spain / 2010",
      signature: "mf-tempo",
      actions: ["mf-receive-beyond-press", "mf-corner-delivery"],
      forbidden: ["mf-pause", "mf-counterpress"]
    },
    {
      key: "Enzo Fernández / Argentina / 2022",
      signature: "mf-progression",
      actions: ["mf-early-forward-pass", "mf-cover-advanced-side"],
      forbidden: ["mf-release-runner", "mf-simple-reset"]
    },
    {
      key: "Vincenzo Iaquinta / Italy / 2006",
      signature: "wing-backpass-run",
      actions: ["wing-attack-backpass", "wing-round-goalkeeper"],
      forbidden: ["wing-carry-head-up", "wing-return-pass"]
    }
  ];
  for (const testCase of reviewedSemanticRoutes) {
    const profile = profilesByKey.get(testCase.key);
    if (!profile) continue;
    if (profile.styleNoteMeta?.origin === "authored") continue;
    const selectedActions = profile.styleNoteMeta?.actions || [];
    const routeMismatch =
      profile.styleNoteMeta?.signature !== testCase.signature
      || selectedActions.length !== testCase.actions.length
      || testCase.actions.some((id, index) => selectedActions[index] !== id);
    const forbidden = [profile.styleNoteMeta?.signature, ...selectedActions]
      .filter((id) => testCase.forbidden.includes(id));
    if (routeMismatch || forbidden.length) {
      addIssue(
        issues,
        testCase.key,
        "reviewed-semantic-route",
        `expected ${testCase.signature} -> ${testCase.actions.join(", ")}; found ${profile.styleNoteMeta?.signature || "none"} -> ${selectedActions.join(", ") || "none"}; forbidden ${forbidden.join(", ") || "none"}`
      );
    }
  }

  const substringHardeningCases = [
    ["goalkeeper", "The opposition kept the ball.", ["gk-angle"]],
    ["central_defender", "He faced Denmark.", ["cb-position", "cb-goal-side"]],
    ["wide_defender", "He faced Denmark.", ["fb-duel", "fb-show-line"]],
    ["holding_midfielder", "He bypassed pressure.", ["dm-tempo", "dm-open-body"]],
    ["player", "He bypassed pressure.", ["pl-support", "pl-angle"]],
    ["wide_defender", "He became the transition outlet.", ["fb-recovery", "fb-recovery-run"]],
    ["goalkeeper", "He saved two penalties in the shootout.", ["gk-patience", "gk-one-v-one"]],
    ["midfielder", "He carried through the first press and resisted pressure.", ["mf-transition", "mf-counterpress"]],
    ["wide_attacker", "His pace, speed and acceleration threatened the flank.", ["wing-change-pace", "wing-stop-start"]],
    ["holding_midfielder", "His passing and tempo controlled midfield.", ["dm-open-body"]],
    ["midfielder", "His passing and tempo controlled midfield.", ["mf-side-on"]],
    ["central_defender", "His passing and distribution started attacks.", ["cb-open-pass"]]
  ];
  for (const [catalogKey, reason, forbiddenIds] of substringHardeningCases) {
    const hints = historicalEditorialHintIdsForReason(catalogKey, reason);
    const matched = [...hints.signatureIds, ...hints.actionIds].filter((id) => forbiddenIds.includes(id));
    if (matched.length) {
      addIssue(
        issues,
        `generator contract / ${catalogKey}`,
        "editorial-word-boundary",
        `${reason} incorrectly matched ${matched.join(", ")}`
      );
    }
  }

  const observableActionCases = [
    ["goalkeeper", "He stayed patient in a one-on-one.", ["gk-patience", "gk-one-v-one"]],
    ["midfielder", "He counterpressed immediately after possession was lost.", ["mf-transition", "mf-counterpress"]],
    ["wide_attacker", "He used a stop-start before accelerating again.", ["wing-change-pace", "wing-stop-start"]],
    ["holding_midfielder", "He received side-on before passing forward.", ["dm-open-body"]],
    ["central_defender", "He opened his body after the recovery.", ["cb-open-pass"]]
  ];
  for (const [catalogKey, reason, requiredIds] of observableActionCases) {
    const hints = historicalEditorialHintIdsForReason(catalogKey, reason);
    const matchedIds = new Set([...hints.signatureIds, ...hints.actionIds]);
    const missingIds = requiredIds.filter((id) => !matchedIds.has(id));
    if (missingIds.length) {
      addIssue(
        issues,
        `generator contract / ${catalogKey}`,
        "observable-action-evidence",
        `${reason} failed to match ${missingIds.join(", ")}`
      );
    }
  }

  const beckenbauer = profilesByKey.get("Franz Beckenbauer / West Germany / 1974");
  if (
    beckenbauer
    && (
      beckenbauer.styleNoteMeta?.signature !== "cb-libero-progress"
      || !beckenbauer.styleNoteMeta?.actions?.includes("cb-reset-after-setback")
    )
  ) {
    addIssue(
      issues,
      beckenbauer.profileKey,
      "editorial-marquee",
      "Beckenbauer 1974 must pair libero progression with the distinct setback-reset cue from its rationale"
    );
  }

  const updatePlan = historicalGeneratedStyleUpdatePlan(
    {
      styleNote: "Existing English copy.",
      styleNoteZh: "已有中文文案。",
      styleNoteMeta: { origin: "generated", version: "older-contract" }
    },
    { origin: "generated", version: HISTORICAL_STYLE_COPY_VERSION },
    { authored: false, missingOnly: true, zhOnly: true }
  );
  if (
    !updatePlan.generatedSemanticDrift
    || !updatePlan.canUpdateEnglishStyleNote
    || !updatePlan.canUpdateChineseStyleNote
  ) {
    addIssue(
      issues,
      "generator contract",
      "atomic-style-refresh",
      "generated metadata drift must refresh English and Chinese text together, even in zh-only or missing-only mode"
    );
  }
}

function auditIdentityUniquenessAndRecurringCore(issues, profiles) {
  const identityGroups = new Map();
  const exactGeneratedEnglishGroups = new Map();
  const exactZhGroups = new Map();
  const recurringGroups = new Map();
  for (const [profileKey, profile] of profiles) {
    const identity = [
      historicalIdentityNameKey(profile.name, profile.teamName),
      normalizeTeamName(profile.teamName),
      Number(profile.tournamentYear)
    ].join("|");
    if (!identityGroups.has(identity)) identityGroups.set(identity, []);
    identityGroups.get(identity).push(profileKey);

    const styleNoteZh = String(profile.styleNoteZh || "").replace(/\s+/gu, "").trim();
    if (styleNoteZh) {
      if (!exactZhGroups.has(styleNoteZh)) exactZhGroups.set(styleNoteZh, []);
      exactZhGroups.get(styleNoteZh).push(profileKey);
    }

    if (profile.styleNoteMeta?.origin === "generated") {
      const styleNote = String(profile.styleNote || "").replace(/\s+/gu, " ").trim();
      if (styleNote) {
        if (!exactGeneratedEnglishGroups.has(styleNote)) exactGeneratedEnglishGroups.set(styleNote, []);
        exactGeneratedEnglishGroups.get(styleNote).push(profileKey);
      }
      const recurringKey = [
        historicalIdentityNameKey(profile.name, profile.teamName),
        normalizeTeamName(profile.teamName),
        historicalStyleCatalogKeyForRole(profile.styleNoteMeta.role)
      ].join("|");
      if (!recurringGroups.has(recurringKey)) recurringGroups.set(recurringKey, []);
      recurringGroups.get(recurringKey).push([profileKey, profile]);
    }
  }

  const duplicateIdentityGroups = [...identityGroups.values()].filter((group) => group.length > 1);
  for (const group of duplicateIdentityGroups) {
    addIssue(issues, group[0], "duplicate-identity", `one player/team/year identity appears as ${group.join(", ")}`);
  }
  const duplicateZhGroups = [...exactZhGroups.values()].filter((group) => group.length > 1);
  for (const group of duplicateZhGroups) {
    addIssue(
      issues,
      group[0],
      "duplicate-zh-copy",
      `exact Chinese style copy is shared by ${group.length} cards, including ${group.slice(0, 3).join(", ")}`
    );
  }
  const duplicateGeneratedEnglishGroups = [...exactGeneratedEnglishGroups.values()]
    .filter((group) => group.length > 1);
  for (const group of duplicateGeneratedEnglishGroups) {
    addIssue(
      issues,
      group[0],
      "duplicate-english-copy",
      `exact generated English style copy is shared by ${group.length} cards, including ${group.slice(0, 3).join(", ")}`
    );
  }

  let recurringGroupCount = 0;
  let eligibleCoreGroupCount = 0;
  let consistentCoreGroupCount = 0;
  let collisionResolvedCoreGroupCount = 0;
  let preferredLensStableGroupCount = 0;
  for (const group of recurringGroups.values()) {
    if (group.length < 2) continue;
    recurringGroupCount += 1;
    const nonEditorial = group.filter(([, profile]) => (
      !(profile.styleNoteMeta.semanticSources || []).some((source) => /best-xi-rationale/.test(source.kind || ""))
    ));
    if (nonEditorial.length < 2) continue;
    const byEvidenceBasis = new Map();
    for (const entry of nonEditorial) {
      const profile = entry[1];
      const basis = [
        profile.styleNoteMeta.role,
        profile.styleNoteMeta.roleSource,
        ...(profile.styleNoteMeta.semanticSources || [])
          .filter((source) => !/best-xi-rationale/.test(source.kind || ""))
          .map((source) => `${source.kind}:${source.source}`)
      ].join("|");
      if (!byEvidenceBasis.has(basis)) byEvidenceBasis.set(basis, []);
      byEvidenceBasis.get(basis).push(entry);
    }
    for (const evidenceGroup of byEvidenceBasis.values()) {
      if (evidenceGroup.length < 2) continue;
      eligibleCoreGroupCount += 1;
      const signatures = new Set(evidenceGroup.map(([, profile]) => profile.styleNoteMeta.signature));
      const preferredVariants = new Set(evidenceGroup.map(([, profile]) => (
        profile.styleNoteMeta.roleGuidePreferredVariant
      )));
      if (preferredVariants.size === 1) preferredLensStableGroupCount += 1;
      if (signatures.size === 1) {
        consistentCoreGroupCount += 1;
      } else if (
        preferredVariants.size === 1
        && evidenceGroup.every(([, profile]) => (
          profile.styleNoteMeta.roleGuideCollisionResolved
          || profile.styleNoteMeta.roleGuideVariant === profile.styleNoteMeta.roleGuidePreferredVariant
        ))
        && evidenceGroup.some(([, profile]) => profile.styleNoteMeta.roleGuideCollisionResolved)
      ) {
        collisionResolvedCoreGroupCount += 1;
      } else {
        addIssue(
          issues,
          evidenceGroup[0][0],
          "recurring-player-core",
          `the same role and source basis yields inconsistent signatures ${[...signatures].join(", ")}`
        );
      }
    }
  }
  console.log(
    `Historical identity baseline: ${duplicateIdentityGroups.length} duplicate player/team/year groups; `
      + `${duplicateGeneratedEnglishGroups.length} exact generated English and ${duplicateZhGroups.length} exact Chinese duplicate groups.`
  );
  console.log(
    `Recurring-player core baseline: ${consistentCoreGroupCount}/${eligibleCoreGroupCount} eligible groups use one visible signature; `
      + `${collisionResolvedCoreGroupCount} more differ only after recorded same-roster collision resolution; `
      + `${preferredLensStableGroupCount}/${eligibleCoreGroupCount} retain one preferred identity lens across editions `
      + `within ${recurringGroupCount} recurring player/team/catalog groups.`
  );
}

function auditReviewedVisibleProfileCorrections(issues, profiles) {
  const profilesByKey = new Map(profiles);
  for (const [profileKey, correction] of Object.entries(HISTORICAL_REVIEWED_VISIBLE_PROFILE_CORRECTIONS)) {
    const profile = profilesByKey.get(profileKey);
    if (!profile) continue;
    if (!HISTORICAL_REVIEWED_ROLE_OVERRIDES[profileKey]) {
      addIssue(issues, profileKey, "visible-correction-allowlist", "visible correction must also have an exact reviewed role override");
    }
    if (profile.position !== correction.position) {
      addIssue(
        issues,
        profileKey,
        "visible-position",
        `visible position ${profile.position || "none"} does not match reviewed ${correction.position}`
      );
    }
    for (const skill of correction.addSkills) {
      if (!(profile.skills || []).includes(skill)) {
        addIssue(issues, profileKey, "visible-role-skill", `reviewed role skill ${skill} is missing`);
      }
    }
    for (const skill of correction.removeSkills) {
      if ((profile.skills || []).includes(skill)) {
        addIssue(issues, profileKey, "visible-role-skill", `contradicted role skill ${skill} remains visible`);
      }
    }
    const broadRole = /goalkeeper/i.test(correction.position)
      ? "goalkeeper"
      : /back|defender/i.test(correction.position)
        ? "defender"
        : /midfielder/i.test(correction.position)
          ? "midfielder"
          : /striker|winger|forward/i.test(correction.position)
            ? "forward"
            : "player";
    if (!new RegExp(`\\bWorld Cup ${broadRole}\\b`, "i").test(profile.note || "")) {
      addIssue(issues, profileKey, "visible-note-role", `fallback note does not reflect corrected ${broadRole} position`);
    }
  }
}

function visiblePositionFamily(value) {
  const position = String(value || "").toLocaleLowerCase("en-US");
  if (/\b(?:gk|goalkeeper)\b/u.test(position)) return "goalkeeper";
  if (/\b(?:defender|back)\b/u.test(position)) return "defender";
  if (/\b(?:midfielder|midfield)\b/u.test(position)) return "midfielder";
  if (/\b(?:forward|striker|winger)\b/u.test(position)) return "forward";
  return "player";
}

function resolvedRoleFamily(role) {
  if (role === "goalkeeper") return "goalkeeper";
  if (["centre-back", "full-back", "wing-back", "defender"].includes(role)) return "defender";
  if (["defensive-midfielder", "central-midfielder", "attacking-midfielder", "midfielder"].includes(role)) {
    return "midfielder";
  }
  if (["wide-attacker", "striker", "second-striker", "forward"].includes(role)) return "forward";
  return "player";
}

function auditVisiblePositionCoherence(issues, profiles) {
  let checked = 0;
  for (const [profileKey, profile] of profiles) {
    checked += 1;
    const resolvedRole = profile.styleNoteMeta?.role || inferHistoricalStyleRoleEvidence(profile).role;
    const resolvedFamily = resolvedRoleFamily(resolvedRole);
    const visibleFamily = visiblePositionFamily(profile.position);
    const hasGenericPlayerSkill = (profile.skills || []).includes("Player");

    if (String(profile.position || "").trim().toLocaleLowerCase("en-US") === "player") {
      addIssue(
        issues,
        profileKey,
        "visible-position-role",
        `visible position Player remains unresolved (semantic role: ${resolvedRole})`
      );
    }
    if (hasGenericPlayerSkill) {
      addIssue(
        issues,
        profileKey,
        "visible-player-skill",
        `generic Player skill remains (semantic role: ${resolvedRole})`
      );
    }
    if (visibleFamily !== "player" && resolvedFamily !== "player" && visibleFamily !== resolvedFamily) {
      addIssue(
        issues,
        profileKey,
        "visible-position-family",
        `visible ${profile.position} position conflicts with resolved ${resolvedRole} role`
      );
    }
  }
  console.log(`Historical visible-position coherence baseline: ${checked} cards checked.`);
}

function auditStoryProfileOverrides(issues) {
  let checked = 0;
  for (const [storyKey, profile] of Object.entries(HISTORICAL_STORY_PROFILE_OVERRIDES)) {
    checked += 1;
    const profileKey = `story override ${storyKey}`;
    const styleNote = String(profile.styleNote || "").trim();
    const styleNoteZh = String(profile.styleNoteZh || "").trim();
    if (!styleNote || splitSentences(styleNote).length < 2 || countWords(styleNote) < MIN_NOTE_WORDS) {
      addIssue(issues, profileKey, "story-style-note", "story-linked profile requires a substantive English style note");
    }
    if (!styleNoteZh || splitSentences(styleNoteZh).length < 2 || countReadableCharacters(styleNoteZh) < MIN_NOTE_ZH_CHARACTERS) {
      addIssue(issues, profileKey, "story-style-note-zh", "story-linked profile requires a substantive Chinese style note");
    }
    if (/[A-Za-z]/.test(styleNoteZh)) {
      addIssue(issues, profileKey, "story-latin-leak", "Chinese story style note contains Latin letters");
    }
    if (profile.styleNoteMeta?.origin !== "authored" || profile.styleNoteMeta?.confidence !== "editorial") {
      addIssue(issues, profileKey, "story-provenance", "story-linked copy must retain authored editorial provenance");
    }
    const semanticRoute = getGeneratedPlayerCardCopy(styleNote, { historical: true });
    for (const locale of ["es", "ko"]) {
      const exactOverlay = String(authoredLocaleTranslations[locale]?.[styleNote] || "").trim();
      if (!semanticRoute && !exactOverlay) {
        addIssue(issues, profileKey, "story-locale-route", `${locale} has no semantic parser route or exact overlay`);
      }
    }
  }
  console.log(`Historical story-profile copy baseline: ${checked} authored overrides checked.`);
}

const [
  profilesData,
  historyData,
  currentProfiles,
  teams,
  esArchiveLocale,
  koArchiveLocale
] = await Promise.all([
  readFile(profilesPath, "utf8").then(JSON.parse),
  readFile(historyPath, "utf8").then(JSON.parse),
  readFile(currentProfilesPath, "utf8").then(JSON.parse),
  readFile(teamsPath, "utf8").then(JSON.parse),
  readFile(archiveLocalePaths.es, "utf8").then(JSON.parse),
  readFile(archiveLocalePaths.ko, "utf8").then(JSON.parse)
]);
authoredLocaleTranslations = {
  es: esArchiveLocale.translations || {},
  ko: koArchiveLocale.translations || {}
};
configureHistoricalRoleEvidence(
  profilesData.profiles || {},
  historyData,
  { currentProfiles, teams }
);
const penaltyEvidenceByProfile = collectPenaltyEvidence(historyData);
const requestedYears = parseYears(getArgValue("years"));
const years = new Set(
  requestedYears.length
    ? requestedYears
    : [
        ...new Set(
          Object.values(profilesData.profiles || {})
            .map((profile) => Number(profile.tournamentYear))
            .filter((year) => Number.isInteger(year))
        )
      ]
);
const issues = [];
const auditedProfiles = [];
let checked = 0;

for (const [profileKey, profile] of Object.entries(profilesData.profiles || {})) {
  if (!years.has(Number(profile.tournamentYear))) continue;
  checked += 1;
  auditedProfiles.push([profileKey, profile]);

  const styleNote = String(profile.styleNote || "").trim();
  const styleNoteZh = String(profile.styleNoteZh || "").trim();
  const note = String(profile.note || "").trim();
  const noteZh = String(profile.noteZh || "").trim();
  const isAuthoredSpotlight = profile.styleNoteMeta?.origin === "authored";
  const visibleNameTokens = String(profile.displayName || profile.name || "")
    .split(/\s+/u)
    .map((token) => normalizeCopyText(token))
    .filter(Boolean);
  if (visibleNameTokens.some((token, index) => index > 0 && token === visibleNameTokens[index - 1])) {
    addIssue(issues, profileKey, "duplicate-name-token", "visible player name repeats an adjacent token");
  }
  const penaltyEvidence = penaltyEvidenceByProfile.get(
    historicalFactKey(profile.name, profile.teamName, profile.tournamentYear)
  );

  independentlyAuditMetadata(issues, profileKey, profile, penaltyEvidence);

  if (!styleNote) {
    addIssue(issues, profileKey, "missing-style-note", "historical profile has no visible styleNote");
    continue;
  }
  if (!styleNoteZh) {
    addIssue(issues, profileKey, "missing-style-note-zh", "historical profile has no Chinese styleNoteZh");
  }
  if (!note) {
    addIssue(issues, profileKey, "missing-note", "historical profile has no fallback note");
  }
  if (!noteZh) {
    addIssue(issues, profileKey, "missing-note-zh", "historical profile has no Chinese noteZh");
  }
  if (!isAuthoredSpotlight && /[;]/.test(styleNote)) {
    addIssue(issues, profileKey, "punctuation", "avoid semicolons in historical player-card styleNote");
  }
  if (/[\u2013\u2014]/.test(styleNote)) {
    addIssue(issues, profileKey, "punctuation", "avoid en dash and em dash sentence structure");
  }
  if (nestedWhenJoinPattern.test(styleNote)) {
    addIssue(
      issues,
      profileKey,
      "nested-when-join",
      "rewrite an action phrase instead of nesting a second when-clause inside a generated when-clause"
    );
  }
  const sentenceCount = splitSentences(styleNote).length;
  const wordCount = countWords(styleNote);
  if (sentenceCount < 2 || sentenceCount > 4) {
    addIssue(
      issues,
      profileKey,
      "shape",
      `styleNote has ${sentenceCount} sentences; carry three content beats in a natural 2-4 sentence shape`
    );
  }
  if (wordCount < MIN_NOTE_WORDS) {
    addIssue(
      issues,
      profileKey,
      "substance",
      `styleNote has ${wordCount} words; generic profile notes need at least ${MIN_NOTE_WORDS} words of substance`
    );
  }
  if (wordCount > MAX_NOTE_WORDS) {
    addIssue(issues, profileKey, "length", `styleNote has ${wordCount} words; keep it below ${MAX_NOTE_WORDS}`);
  }
  const maxNoteCharacters = isAuthoredSpotlight
    ? MAX_AUTHORED_NOTE_CHARACTERS
    : MAX_NOTE_CHARACTERS;
  if (styleNote.length > maxNoteCharacters) {
    addIssue(
      issues,
      profileKey,
      "length",
      `styleNote is ${styleNote.length} characters; limit is ${maxNoteCharacters}`
    );
  }
  if (styleNoteZh) {
    const sentenceCountZh = splitSentences(styleNoteZh).length;
    const readableCharactersZh = countReadableCharacters(styleNoteZh);
    if (sentenceCountZh < 2 || sentenceCountZh > 4) {
      addIssue(
        issues,
        profileKey,
        "shape-zh",
        `styleNoteZh has ${sentenceCountZh} sentences; carry the same beats in a natural 2-4 sentence shape`
      );
    }
    if (readableCharactersZh < MIN_NOTE_ZH_CHARACTERS) {
      addIssue(
        issues,
        profileKey,
        "substance-zh",
        `styleNoteZh has ${readableCharactersZh} readable characters; expected at least ${MIN_NOTE_ZH_CHARACTERS}`
      );
    }
    if (styleNoteZh.length > MAX_NOTE_ZH_CHARACTERS) {
      addIssue(issues, profileKey, "length-zh", `styleNoteZh is ${styleNoteZh.length} characters`);
    }
  }
  if (/[A-Za-z]/.test(copyWithoutKnownPlayerMentions(profileKey, profile, styleNoteZh))) {
    addIssue(issues, profileKey, "latin-leak", "Chinese styleNoteZh contains Latin letters outside the canonical player name");
  }
  if (/[A-Za-z]/.test(noteZh)) {
    addIssue(issues, profileKey, "latin-leak", "Chinese noteZh contains Latin letters");
  }
  for (const check of forbiddenChineseConstructions) {
    if (check.pattern.test(styleNoteZh)) {
      addIssue(issues, profileKey, "chinese-grammar", check.message);
    }
  }

  const sentenceKeys = styleNote
    .split(/[.!?]+/)
    .map((sentence) => sentence.toLowerCase().replace(/\b(?:he|also)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim())
    .filter(Boolean);
  if (new Set(sentenceKeys).size !== sentenceKeys.length) {
    addIssue(issues, profileKey, "repeated-action", "styleNote repeats the same explanation more than once");
  }

  for (const check of forbiddenPhrases) {
    if (isAuthoredSpotlight && check.generatedOnly) continue;
    if (check.pattern.test(styleNote)) {
      addIssue(issues, profileKey, "generic-voice", check.message);
    }
  }
  if (profile.styleNoteMeta?.origin === "generated") {
    const gameMentions = styleNote.match(/\bgame\b/giu) || [];
    if (gameMentions.length > 1) {
      addIssue(
        issues,
        profileKey,
        "repeated-headline-word",
        "generated styleNote repeats game in the same three-beat description"
      );
    }
    const chinesePlayerName = String(profile.displayName || profile.name || "").replace(/\s+/gu, " ").trim();
    if (chinesePlayerName && !styleNoteZh.includes(chinesePlayerName)) {
      addIssue(
        issues,
        profileKey,
        "player-mention-zh",
        `Chinese generated copy must use the intact canonical player name "${chinesePlayerName}"`
      );
    }
    const lowerCaseSentence = splitSentences(styleNote).find((sentence) => /^\p{Lowercase_Letter}/u.test(sentence));
    if (lowerCaseSentence) {
      addIssue(
        issues,
        profileKey,
        "sentence-case",
        `sentence begins with a lowercase player reference: ${lowerCaseSentence}`
      );
    }
    if (profile.styleNoteMeta.confidence === "role-level") {
      const catalogKey = historicalStyleCatalogKeyForRole(profile.styleNoteMeta.role);
      const supportedSkills = (profile.skills || []).filter((skill) => (
        HISTORICAL_PROFILE_SOURCE_SEMANTICS[catalogKey]?.[skill]
      ));
      const hasPlayerSpecificRoute = profile.styleNoteMeta.semanticSources?.some((source) => (
        /^reviewed-/u.test(source.kind || "")
        || /best-xi-rationale/u.test(source.kind || "")
      ));
      if (
        supportedSkills.length
        && !hasPlayerSpecificRoute
        && !profile.styleNoteMeta.semanticSources?.some((source) => source.kind === "profile-source")
      ) {
        addIssue(
          issues,
          profileKey,
          "profile-source-priority",
          `supported profile tags ${supportedSkills.join(", ")} were displaced by role-default copy`
        );
      }
      if (!profile.styleNoteMeta.semanticSources?.some((source) => (
        source.kind === "role-default"
        || source.kind === "profile-source"
        || /^reviewed-/u.test(source.kind || "")
        || /best-xi-rationale/u.test(source.kind || "")
      ))) {
        addIssue(
          issues,
          profileKey,
          "role-guide-source",
          "role-level copy must retain a profile source, player-specific context or recorded role-default guide"
        );
      }
      if (/\b(?:signature|defines?|stands out|what separates|edge comes|builds his game|the key to)\b/i.test(styleNote)) {
        addIssue(issues, profileKey, "role-guide", "role-level copy must not present an inferred role action as a defining trait");
      }
    }
  }
}

console.log(`Historical player-card note audit: ${checked} profiles checked for ${[...years].sort((a, b) => b - a).join(", ")}.`);
for (const finding of reportCorpusQuality(auditedProfiles)) {
  addIssue(issues, "corpus", "copy-concentration", finding);
}
auditGeneratorContracts(issues, auditedProfiles);
auditIdentityUniquenessAndRecurringCore(issues, auditedProfiles);
auditReviewedVisibleProfileCorrections(issues, auditedProfiles);
auditVisiblePositionCoherence(issues, auditedProfiles);
auditSemanticConcentration(issues, auditedProfiles);
auditStoryProfileOverrides(issues);

if (issues.length) {
  console.error(`Historical player-card note audit found ${issues.length} issue${issues.length === 1 ? "" : "s"}:`);
  for (const issue of issues.slice(0, 80)) {
    console.error(`- ${issue.profileKey}: ${issue.kind}: ${issue.message}`);
  }
  if (issues.length > 80) {
    console.error(`...and ${issues.length - 80} more`);
  }
  process.exit(1);
}

console.log("No historical player-card note issues found.");
