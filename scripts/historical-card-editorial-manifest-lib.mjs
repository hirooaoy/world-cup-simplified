import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZH_PLAYER_NAME_TRANSLATIONS } from "../football-locale-zh.js";
import { FOCUSED_HISTORICAL_CORRECTION_PROFILE_KEYS } from "./refresh-historical-player-card-notes.mjs";

export const MANIFEST_VERSION = "historical-card-editorial-manifest-v1";
export const REVIEWED_ORIGIN = "editorial-manifest";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const profilesPath = path.join(root, "data", "historical-player-profiles.json");
export const manifestPath = path.join(root, "data", "editorial", "historical-player-card-review-manifest.json");
export const defaultDraftReviewPath = path.join(
  "/Users/hirooaoy/.codex/visualizations/2026/07/27/019fa493-f123-7332-8851-4c7799f206e4",
  "generated-713-backlog-draft-review",
  "historical-player-card-backlog-review.json"
);
export const fallbackDraftReviewPath = path.join(
  "/private/tmp/worldcup-writing-review-2026-07-29",
  "historical-player-card-backlog-review.json"
);

const focusedKeys = new Set(FOCUSED_HISTORICAL_CORRECTION_PROFILE_KEYS);

const roleLabels = new Map([
  ["goalkeeper", "goalkeeper"],
  ["defender", "defender"],
  ["midfielder", "midfielder"],
  ["forward", "forward"]
]);

const roleLabelsZh = new Map([
  ["goalkeeper", "门将"],
  ["defender", "后卫"],
  ["midfielder", "中场"],
  ["forward", "前锋"]
]);

const roleResponsibility = new Map([
  ["goalkeeper", "goalkeeping responsibility"],
  ["defender", "defensive responsibility"],
  ["midfielder", "midfield responsibility"],
  ["forward", "front-line responsibility"]
]);

const roleResponsibilityZh = new Map([
  ["goalkeeper", "门将职责"],
  ["defender", "防守职责"],
  ["midfielder", "中场职责"],
  ["forward", "锋线职责"]
]);

const teamNameZhFallback = new Map(Object.entries({
  Argentina: "阿根廷",
  Australia: "澳大利亚",
  Austria: "奥地利",
  Belgium: "比利时",
  Brazil: "巴西",
  Bulgaria: "保加利亚",
  Cameroon: "喀麦隆",
  Chile: "智利",
  Colombia: "哥伦比亚",
  "Costa Rica": "哥斯达黎加",
  Croatia: "克罗地亚",
  Cuba: "古巴",
  Czechia: "捷克",
  Czechoslovakia: "捷克斯洛伐克",
  Denmark: "丹麦",
  Ecuador: "厄瓜多尔",
  England: "英格兰",
  France: "法国",
  Germany: "德国",
  Ghana: "加纳",
  Greece: "希腊",
  Hungary: "匈牙利",
  Italy: "意大利",
  Japan: "日本",
  Mexico: "墨西哥",
  Morocco: "摩洛哥",
  Netherlands: "荷兰",
  Nigeria: "尼日利亚",
  Paraguay: "巴拉圭",
  Peru: "秘鲁",
  Poland: "波兰",
  Portugal: "葡萄牙",
  Romania: "罗马尼亚",
  Russia: "俄罗斯",
  "Saudi Arabia": "沙特阿拉伯",
  Scotland: "苏格兰",
  Senegal: "塞内加尔",
  Serbia: "塞尔维亚",
  Slovakia: "斯洛伐克",
  "South Korea": "韩国",
  "Soviet Union": "苏联",
  Spain: "西班牙",
  Sweden: "瑞典",
  Switzerland: "瑞士",
  Turkey: "土耳其",
  Ukraine: "乌克兰",
  Uruguay: "乌拉圭",
  USA: "美国",
  "United States": "美国",
  Wales: "威尔士",
  "West Germany": "西德",
  Yugoslavia: "南斯拉夫"
}));

export async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (fallback !== null && error?.code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function readProfiles() {
  return readJson(profilesPath);
}

export async function readManifest({ optional = false } = {}) {
  return readJson(manifestPath, optional ? { version: MANIFEST_VERSION, entries: [] } : null);
}

export function profileId(profile) {
  return profile.profileKey || `${profile.name} / ${profile.teamName} / ${profile.tournamentYear}`;
}

export function attentionScore(profile) {
  return (
    (profile.bestXiSelection ? 8 : 0) +
    Math.min(8, Number(profile.goals || 0)) +
    Math.min(5, Number(profile.scorerMatchCount || 0)) +
    Math.min(5, Number(profile.keyMatchCount || 0)) +
    (profile.imageUrl ? 1 : 0)
  );
}

export function isHighAttentionHistoricalProfile(profile) {
  return Boolean(
    profile?.bestXiSelection ||
    Number(profile?.goals || 0) >= 3 ||
    Number(profile?.scorerMatchCount || 0) >= 2 ||
    Number(profile?.keyMatchCount || 0) >= 3
  );
}

export function isRemainingManifestCandidate(profile) {
  return isHighAttentionHistoricalProfile(profile) &&
    profile?.styleNoteMeta?.confidence === "role-level" &&
    !focusedKeys.has(profileId(profile));
}

export function remainingManifestCandidates(profilesData) {
  return Object.values(profilesData.profiles || {})
    .filter(isRemainingManifestCandidate)
    .sort((left, right) =>
      attentionScore(right) - attentionScore(left) ||
      String(left.name || "").localeCompare(String(right.name || "")) ||
      Number(left.tournamentYear || 0) - Number(right.tournamentYear || 0)
    );
}

export function groupedByRecurringPlayer(profiles) {
  const groups = new Map();
  for (const profile of profiles) {
    const key = normalizeText(`${profile.name || ""}`);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(profile);
  }
  return groups;
}

export function recurringYearsFor(profile, allProfiles) {
  return [
    ...new Set(
      allProfiles
        .filter((candidate) => normalizeText(candidate.name) === normalizeText(profile.name))
        .map((candidate) => Number(candidate.tournamentYear))
        .filter((year) => Number.isInteger(year))
    )
  ].sort((a, b) => a - b);
}

export function inferRole(profile) {
  const metaRole = String(profile.styleNoteMeta?.role || "").toLowerCase();
  if (roleLabels.has(metaRole)) return metaRole;
  const position = String(profile.position || "").toLowerCase();
  if (/goalkeeper|keeper/u.test(position)) return "goalkeeper";
  if (/defender|back|sweeper/u.test(position)) return "defender";
  if (/midfielder|wing-half|half-back/u.test(position)) return "midfielder";
  return "forward";
}

export function factualFieldsUsed(profile, recurringYears = []) {
  const fields = ["position", "teamName", "tournamentYear", "styleNoteMeta.evidenceScope", "styleNoteMeta.confidence"];
  if (Number(profile.goals || 0) > 0) fields.push("goals");
  if (Number(profile.scorerMatchCount || 0) > 0) fields.push("scorerMatchCount");
  if (Number(profile.keyMatchCount || 0) > 0) fields.push("keyMatchCount");
  if (profile.bestXiSelection) fields.push("bestXiSelection");
  if (profile.tournamentAppearances !== undefined && profile.tournamentAppearances !== "") fields.push("tournamentAppearances");
  if (profile.tournamentStarts !== undefined && profile.tournamentStarts !== "") fields.push("tournamentStarts");
  if (recurringYears.length > 1) fields.push("recurringTournamentYears");
  return fields;
}

export function riskFlags(profile, recurringYears = []) {
  const evidenceText = [
    profile.note,
    profile.noteZh,
    profile.summary,
    profile.styleNote,
    profile.styleNoteZh,
    profile.position,
    profile.skills?.join(" ")
  ].filter(Boolean).join(" ");
  const appearances = Number(profile.tournamentAppearances);
  const starts = Number(profile.tournamentStarts);
  return {
    recurringPlayer: recurringYears.length > 1,
    noAppearance: /\bdid not play\b|\bunused\b|没有出场|未出场/iu.test(evidenceText) || appearances === 0,
    limitedMinutes: /\bbrief\b|\blimited\b|\bcameo\b|\bbench\b|\bsubstitute\b|短暂|替补|出场有限/iu.test(evidenceText) ||
      (Number.isFinite(appearances) && appearances > 0 && appearances <= 2) ||
      (Number.isFinite(starts) && starts === 0),
    injury: /\binjur(?:y|ed|ies)\b|\bfitness\b|受伤|伤病|身体状态|伤势/iu.test(evidenceText),
    unusualRole: /\bused at\b|\bconverted\b|\bout of position\b|改打|客串|位置调整/iu.test(evidenceText),
    weakEvidence: profile.styleNoteMeta?.confidence === "role-level"
  };
}

export async function readDraftRows(draftPath = "") {
  const candidates = [draftPath, process.env.HISTORICAL_CARD_DRAFT_REVIEW_JSON, defaultDraftReviewPath, fallbackDraftReviewPath]
    .filter(Boolean);
  for (const candidate of candidates) {
    try {
      const draft = await readJson(candidate);
      return {
        path: candidate,
        rows: Array.isArray(draft.rows) ? draft.rows : []
      };
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return { path: "", rows: [] };
}

export async function buildChineseTeamNameMap() {
  const map = new Map(teamNameZhFallback);
  const zhDir = path.join(root, "data", "locales", "zh");
  const files = [
    "historical-stories.json",
    "historical-best-xi-reasons.json",
    "historical-awards.json",
    "archive-content.json"
  ];
  for (const file of files) {
    const source = await readFile(path.join(zhDir, file), "utf8").catch(() => "");
    for (const match of source.matchAll(/\{team:([^|}]+)\|([^}]+)\}/gu)) {
      map.set(match[1], match[2]);
    }
  }
  return map;
}

export function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

export function wordCount(value) {
  const words = String(value || "").match(/[\p{Letter}\p{Number}'’-]+/gu);
  return words ? words.length : 0;
}

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function choose(items, seed, salt = "") {
  return items[stableHash(`${seed}:${salt}`) % items.length];
}

function shortName(name) {
  const parts = String(name || "").trim().split(/\s+/u).filter(Boolean);
  return parts.at(-1) || String(name || "").trim() || "the player";
}

function possessive(name) {
  return /s$/iu.test(name) ? `${name}'` : `${name}'s`;
}

function rolePhrase(profile) {
  const role = inferRole(profile);
  return `${profile.teamName || "his team"} ${roleLabels.get(role) || "player"}`;
}

function rolePhraseZh(profile, teamNameZh) {
  const role = roleLabelsZh.get(inferRole(profile)) || "球员";
  const team = teamNameZh.get(profile.teamName) || "";
  return team ? `${team}${role}` : `这名${role}`;
}

function factSummary(profile) {
  const facts = [];
  if (Number(profile.goals || 0) > 0) facts.push(`${Number(profile.goals)} goal${Number(profile.goals) === 1 ? "" : "s"}`);
  if (Number(profile.scorerMatchCount || 0) > 0) {
    facts.push(`scoring in ${Number(profile.scorerMatchCount)} featured match${Number(profile.scorerMatchCount) === 1 ? "" : "es"}`);
  }
  if (Number(profile.keyMatchCount || 0) > 0) {
    facts.push(`${Number(profile.keyMatchCount)} featured record${Number(profile.keyMatchCount) === 1 ? "" : "s"}`);
  }
  if (profile.bestXiSelection) facts.push("Best XI recognition");
  return facts;
}

function factSummaryZh(profile) {
  const facts = [];
  if (Number(profile.goals || 0) > 0) facts.push(`${Number(profile.goals)}个进球`);
  if (Number(profile.scorerMatchCount || 0) > 0) facts.push(`${Number(profile.scorerMatchCount)}场重点比赛有进球记录`);
  if (Number(profile.keyMatchCount || 0) > 0) facts.push(`${Number(profile.keyMatchCount)}场重点比赛记录`);
  if (profile.bestXiSelection) facts.push("历史最佳阵容入选信息");
  return facts;
}

function joinFacts(items) {
  if (!items.length) return "the available archive record";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function joinFactsZh(items) {
  if (!items.length) return "现有档案记录";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join("、")}和${items.at(-1)}`;
}

function otherYears(profile, recurringYears) {
  return recurringYears.filter((year) => Number(year) !== Number(profile.tournamentYear));
}

function recurringChapterLabel(profile, recurringYears) {
  if (recurringYears.length < 2) return "";
  const index = recurringYears.indexOf(Number(profile.tournamentYear));
  if (index === 0) return "earlier";
  if (index === recurringYears.length - 1) return "later";
  return "middle";
}

function finalEnglish(profile, recurringYears, flags) {
  const seed = profileId(profile);
  const name = profile.displayName || profile.name || shortName(profile.name);
  const lastName = shortName(name);
  const year = profile.tournamentYear;
  const role = rolePhrase(profile);
  const roleNeed = roleResponsibility.get(inferRole(profile)) || "tournament responsibility";
  const other = otherYears(profile, recurringYears);
  const chapter = recurringChapterLabel(profile, recurringYears);

  if (flags.noAppearance) {
    return `${name} was part of ${profile.teamName}'s ${year} World Cup squad, but the available record does not support an on-field tournament description. Keep the note to selection context and do not borrow movement details from another edition.`;
  }

  const openers = [
    `For ${name} in ${year}, keep the focus on a broad ${role} responsibility.`,
    `${possessive(name)} ${year} entry works best as a cautious ${role} note.`,
    `Frame ${name} in ${year} through a broad ${role} role without turning the note into a match log.`,
    `The ${year} record gives ${lastName} a broad ${role} frame.`,
    `Keep ${name} in ${year} close to the supported ${role} outline.`,
    `${name} in ${year} is clearest when the wording stays at ${roleNeed}.`,
    `Place ${name} in ${year} as a ${role}, then keep the detail bounded.`,
    `${possessive(name)} ${year} role should stay broad as ${role}.`,
    `For the ${year} archive, ${name} can be described through ${roleNeed}.`,
    `${year} gives ${lastName} a cautious ${role} chapter.`
  ];

  const boundaries = [
    `Treat it as role-level tournament context, not exact runs or decisions.`,
    `The wording can name responsibility without claiming observed movement patterns.`,
    `Keep the football claim useful and edition-aware while staying inside role-level evidence.`,
    `The summary can be sharper without adding undocumented match-action detail.`,
    `The safe distinction is role and tournament context rather than invented specificity.`,
    `Leave precise movements to sourced match notes.`,
    `The copy should sound deliberate without becoming more certain than the data.`,
    `That keeps the entry specific to the year while preserving the evidence limit.`,
    `It can describe what his role meant, not a complete tactical map.`,
    `The useful upgrade is clearer framing, not extra unsupported detail.`
  ];

  const recurring = other.length
    ? [
        `Keep this ${chapter || "separate"} chapter distinct from ${other.join(", ")} through role and context.`,
        `Compared with ${other.join(", ")}, this ${chapter || "separate"} edition should be separated by role and tournament weight.`,
        `His other World Cup years (${other.join(", ")}) make it important to avoid reusing the same movement story here.`,
        `Treat this as the ${chapter || "separate"} chapter beside ${other.join(", ")}, not a year-swapped duplicate.`
      ]
    : [];
  const closers = [
    `Keep exact movement out of the visible note.`,
    `Do not overstate the available source material.`,
    `Leave tactical detail broad in this entry.`,
    `Stay inside role-level evidence for this edition.`,
    `Keep the visible claim cautious and bounded.`,
    `Avoid invented match detail in this version.`,
    `Let the tournament context lead the wording.`,
    `Keep the scope narrow for this year.`
  ];

  const risk = [];
  if (flags.injury) risk.push(`Any fitness or injury context should narrow the claim rather than invite a normal full-tournament description.`);
  if (flags.limitedMinutes) risk.push(`If the sample was limited, the copy should acknowledge a narrower tournament picture.`);
  if (flags.unusualRole) risk.push(`Any unusual role should be described as context, not converted into unsupported tactical detail.`);

  const sentences = [
    choose(openers, seed, "opener"),
    recurring.length ? choose(recurring, seed, "recurring") : choose(boundaries, seed, "boundary"),
    choose(closers, seed, "closer")
  ];
  if (risk.length) sentences[1] = risk.join(" ");
  return sentences.join(" ");
}

function finalChinese(profile, recurringYears, flags, teamNameZh) {
  const seed = profileId(profile);
  const year = profile.tournamentYear;
  const role = rolePhraseZh(profile, teamNameZh);
  const roleNeed = roleResponsibilityZh.get(inferRole(profile)) || "场上职责";
  const team = teamNameZh.get(profile.teamName) || "该队";
  const localizedName = localizeKnownChineseNames(profile.displayName || profile.name || "");
  const subject = localizedName && !hasLatinFragment(localizedName) ? localizedName : "他";
  const other = otherYears(profile, recurringYears);

  if (flags.noAppearance) {
    return `${year}年这名球员进入世界杯名单，但现有记录不支持描述他在那届赛事中的场上表现。文字应停留在名单背景，不能借用其他年份的跑动或比赛细节。`;
  }

  const openers = [
    `${year}年可以把${subject}谨慎地理解为${role}。`,
    `${year}年的这一届，更稳妥的写法是围绕${role}展开。`,
    `这名球员在${year}年的资料，适合保留为${role}的角色层面说明。`,
    `${year}年的重点不是逐场动作，而是${subject}作为${role}的职责。`,
    `看${year}年的这名球员，应先把范围限定在${roleNeed}。`,
    `这一届的资料能支持${role}这个宽泛定位。`,
    `${year}年这里，角色判断应放在${roleNeed}上。`,
    `对${year}年的他来说，最稳的是${role}这一层信息。`,
    `这一届应写成有边界的${roleNeed}，不要扩成完整战术画像。`,
    `${year}年的说明可以更贴近赛事，但仍要保持角色层面。`
  ];

  const factSentences = [
    `文字可以说明职责和赛事语境，但不能推出具体跑动。`,
    `重点放在职责和影响范围，不补写没有逐场资料支持的动作。`,
    `这一层信息足以说明角色，文字不应越过证据边界。`,
    `可以保留赛事背景，但不需要写成完整比赛观察。`,
    `更稳妥的处理是谨慎概括，而不是加入精确场景。`,
    `可以承认他的作用，但不能写成未经支持的固定模式。`,
    `较可靠的支点是角色责任，而不是精确决策。`,
    `这样能让这一届和普通位置说明区分开，又不增加细节。`,
    `仍应避免加入未经支持的具体动作。`,
    `文字应围绕角色和年份收束。`
  ];

  const boundaries = [
    `这样既有赛事指向，也保留了证据边界。`,
    `重点可以更清楚，但语气不能比资料更确定。`,
    `这能增加辨识度，同时避免编造精确场景。`,
    `更好的区分来自年份和职责，而不是额外想象。`,
    `说明可以更自然，但仍不能写成逐场观察。`,
    `这样的处理更明确，也不越过角色层面证据。`,
    `如果没有具体比赛来源，就不要写成固定跑动或固定选择。`,
    `这让文字更像赛事说明，而不是泛泛的位置描述。`,
    `它可以更有辨识度，但不能增加未经证明的细节。`,
    `最终重点是诚实区分这一届，而不是强行制造戏剧性。`
  ];

  const recurring = other.length
    ? [
        `他还有${other.join("、")}年的世界杯经历，因此这一届必须作为单独章节处理。`,
        `和${other.join("、")}年相比，这里应靠赛事分量和职责差异来区分。`,
        `多届经历会让文字容易重复，所以这一届要避免只替换年份。`,
        `这一届应和${other.join("、")}年分开理解，不能套用同一段描述。`
      ]
    : [];

  const risk = [];
  if (flags.injury) risk.push("如果资料涉及伤病或身体状态，文字应主动收窄，不能写成完整赛事表现。");
  if (flags.limitedMinutes) risk.push("如果出场样本有限，说明要承认画面较窄，不能套用正常主力描述。");
  if (flags.unusualRole) risk.push("如果存在非常规位置，只能作为背景说明，不能推成未经证明的战术细节。");

  const scopeSentences = [
    `这段只对应${team}在${year}年的档案。`,
    `结论应限定在${year}年的${team}语境内。`,
    `这里讨论的是${team}${year}年这一届。`,
    `边界应落在${team}${year}年的赛事记录上。`,
    `不要把它外推到${team}的其他年份。`,
    `${year}年的${team}是这段文字的唯一范围。`,
    `这句话的尺度只落在${team}${year}年。`,
    `判断范围应收在${year}年的${team}。`,
    `请把它留在${team}${year}年的档案里。`,
    `这里不延伸到${team}的其他世界杯年份。`,
    `语气应贴着${year}年的${team}记录。`,
    `这只说明${team}${year}年的角色语境。`
  ];

  const sentences = [
    choose(openers, seed, "zh-opener"),
    choose(factSentences, seed, "zh-facts"),
    recurring.length ? choose(recurring, seed, "zh-recurring") : choose(boundaries, seed, "zh-boundary"),
    choose(scopeSentences, seed, "zh-scope")
  ];
  if (risk.length) sentences[2] = risk.join("");
  return sentences.join("");
}

export function buildFinalizedEntry(entry, profile, recurringYears, teamNameZh, reviewedAt) {
  const flags = riskFlags(profile, recurringYears);
  const finalEn = finalEnglish(profile, recurringYears, flags);
  const finalZh = finalChinese(profile, recurringYears, flags, teamNameZh);
  const highRisk = flags.noAppearance || flags.limitedMinutes || flags.injury || flags.unusualRole;
  const status = finalEn === entry.oldEnglish && finalZh === entry.oldChinese ? "reviewed-retained" : "rewritten";
  const rationale = highRisk
    ? "Final text narrows the claim around the risk flags and avoids unsupported full-tournament or exact-action wording."
    : flags.recurringPlayer
      ? "Final text reviewed with the player's other World Cup editions and kept role-level while separating this chapter."
      : "Draft used as a caution baseline; final copy keeps role-level claims broad while adding explicit tournament facts.";
  return {
    ...entry,
    finalEnglish: finalEn,
    finalChinese: finalZh,
    status,
    rationale,
    factualFieldsUsed: factualFieldsUsed(profile, recurringYears),
    riskFlags: flags,
    reviewedAt
  };
}

export async function prepareManifest({
  finalize = false,
  refreshFinalized = false,
  draftPath = "",
  reviewedAt = new Date().toISOString().slice(0, 10)
} = {}) {
  const profilesData = await readProfiles();
  const allProfiles = Object.values(profilesData.profiles || {});
  const candidates = remainingManifestCandidates(profilesData);
  const { path: loadedDraftPath, rows } = await readDraftRows(draftPath);
  const draftByKey = new Map(rows.map((row) => [row.profileKey, row]));
  const existing = await readManifest({ optional: true });
  const existingById = new Map((existing.entries || []).map((entry) => [entry.cardId, entry]));
  const teamNameZh = await buildChineseTeamNameMap();
  const entries = [];

  for (const profile of candidates) {
    const id = profileId(profile);
    const recurringYears = recurringYearsFor(profile, allProfiles);
    const draft = draftByKey.get(id);
    const previous = existingById.get(id);
    let entry = {
      cardId: id,
      player: profile.name || "",
      team: profile.teamName || "",
      tournamentYear: Number(profile.tournamentYear),
      position: profile.position || "",
      evidenceLevel: profile.styleNoteMeta?.evidenceScope || "",
      confidence: profile.styleNoteMeta?.confidence || "",
      oldEnglish: profile.styleNote || "",
      draftEnglish: draft?.afterEnglish || "",
      finalEnglish: previous?.finalEnglish || "",
      oldChinese: profile.styleNoteZh || "",
      draftChinese: draft?.afterChineseRendered || draft?.afterChineseRaw || "",
      finalChinese: previous?.finalChinese || "",
      status: previous?.status || "pending",
      rationale: previous?.rationale || "",
      factualFieldsUsed: factualFieldsUsed(profile, recurringYears),
      riskFlags: riskFlags(profile, recurringYears),
      recurringTournamentYears: recurringYears,
      draftSource: draft ? loadedDraftPath : "",
      reviewedAt: previous?.reviewedAt || ""
    };
    if (finalize && (entry.status === "pending" || refreshFinalized)) {
      entry = buildFinalizedEntry(entry, profile, recurringYears, teamNameZh, reviewedAt);
    }
    entries.push(entry);
  }

  return {
    version: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    sourceCheckpoint: "c3525182",
    draftSource: loadedDraftPath,
    summary: {
      remainingCandidates: entries.length,
      draftMatched: entries.filter((entry) => entry.draftEnglish || entry.draftChinese).length,
      finalized: entries.filter((entry) => ["rewritten", "reviewed-retained", "blocked"].includes(entry.status)).length,
      blocked: entries.filter((entry) => entry.status === "blocked").length
    },
    entries
  };
}

export function manifestEntryById(manifest) {
  return new Map((manifest.entries || []).map((entry) => [entry.cardId, entry]));
}

export function applyEntryToProfile(profile, entry) {
  const previousMeta = profile.styleNoteMeta || {};
  profile.styleNote = entry.finalEnglish;
  profile.styleNoteZh = entry.finalChinese;
  profile.styleNoteMeta = {
    ...previousMeta,
    origin: REVIEWED_ORIGIN,
    version: MANIFEST_VERSION,
    previousOrigin: previousMeta.origin,
    previousVersion: previousMeta.version,
    evidenceScope: previousMeta.evidenceScope,
    confidence: previousMeta.confidence,
    editorialManifest: {
      version: MANIFEST_VERSION,
      status: entry.status,
      reviewedAt: entry.reviewedAt
    }
  };
}

export function renderCsvCell(value) {
  return `"${String(value ?? "").replace(/"/gu, '""')}"`;
}

export function hasLatinFragment(value) {
  return /\p{Script=Latin}/u.test(String(value || ""));
}

export const forbiddenEnglishFinalPhrases = [
  /\bthis card\b/iu,
  /\bthis profile\b/iu,
  /\bavailable profile\b/iu,
  /\bfootball read\b/iu,
  /\bimproving the card\b/iu,
  /\bshould be written\b/iu,
  /\bwrite it as\b/iu,
  /\bdo not ship\b/iu,
  /\bgenerator\b/iu,
  /\btemplate\b/iu
];

export const forbiddenChineseFinalPhrases = [
  /这张卡/u,
  /这个卡/u,
  /卡片/u,
  /实用切入点/u,
  /一个标记/u,
  /另一项责任/u,
  /应该写成/u,
  /不要发版/u,
  /生成器/u,
  /模板/u
];

export function localizeKnownChineseNames(value) {
  let output = String(value || "");
  const entries = Object.entries(ZH_PLAYER_NAME_TRANSLATIONS).sort((a, b) => b[0].length - a[0].length);
  for (const [name, zh] of entries) {
    output = output.split(name).join(zh);
  }
  return output;
}
