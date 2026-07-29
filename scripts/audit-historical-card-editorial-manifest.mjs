#!/usr/bin/env node
import {
  MANIFEST_VERSION,
  REVIEWED_ORIGIN,
  forbiddenChineseFinalPhrases,
  forbiddenEnglishFinalPhrases,
  hasLatinFragment,
  localizeKnownChineseNames,
  manifestEntryById,
  manifestPath,
  normalizeText,
  readManifest,
  readProfiles,
  remainingManifestCandidates,
  wordCount
} from "./historical-card-editorial-manifest-lib.mjs";

const args = new Set(process.argv.slice(2));
const allowUnapplied = args.has("--allow-unapplied");
const manifest = await readManifest();
const entries = manifestEntryById(manifest);
const profilesData = await readProfiles();
const candidates = remainingManifestCandidates(profilesData);
const expectedIds = new Set(candidates.map((profile) => profile.profileKey));
const issues = [];
const finalTexts = new Map();
const finalTextsZh = new Map();
const englishNgramStopWords = new Set([
  "the",
  "and",
  "with",
  "that",
  "this",
  "from",
  "into",
  "role",
  "level",
  "record",
  "records",
  "archive",
  "evidence",
  "supported",
  "supports",
  "support",
  "tournament",
  "world",
  "cup",
  "goal",
  "goals",
  "scoring",
  "featured",
  "match",
  "matches",
  "historical",
  "best",
  "selection",
  "entry",
  "note",
  "notes",
  "edition",
  "exact",
  "context",
  "responsibility",
  "presence"
]);

function issue(message) {
  issues.push(message);
}

if (manifest.version !== MANIFEST_VERSION) {
  issue(`manifest version expected ${MANIFEST_VERSION}, found ${manifest.version || "(missing)"}`);
}

for (const id of expectedIds) {
  if (!entries.has(id)) issue(`${id}: missing manifest entry`);
}
for (const id of entries.keys()) {
  if (!expectedIds.has(id)) issue(`${id}: manifest entry is not part of the remaining high-attention queue`);
}

for (const profile of candidates) {
  const entry = entries.get(profile.profileKey);
  if (!entry) continue;
  const status = entry.status;
  if (!["rewritten", "reviewed-retained", "blocked"].includes(status)) {
    issue(`${entry.cardId}: status must be rewritten, reviewed-retained, or blocked`);
    continue;
  }
  if (!entry.rationale || String(entry.rationale).trim().length < 16) {
    issue(`${entry.cardId}: finalized status requires a concise rationale`);
  }
  if (!Array.isArray(entry.factualFieldsUsed) || !entry.factualFieldsUsed.length) {
    issue(`${entry.cardId}: factualFieldsUsed must be auto-populated`);
  }
  if (status !== "blocked" && !entry.reviewedAt) {
    issue(`${entry.cardId}: reviewedAt must be populated when finalized`);
  }
  if (status === "blocked") {
    if (!/blocked|insufficient|conflict|unsafe|missing/iu.test(entry.rationale)) {
      issue(`${entry.cardId}: blocked entries need a specific blocking rationale`);
    }
    continue;
  }
  const finalEnglish = String(entry.finalEnglish || "").replace(/\s+/gu, " ").trim();
  const finalChinese = String(entry.finalChinese || "").replace(/\s+/gu, "").trim();
  if (!finalEnglish) issue(`${entry.cardId}: finalEnglish is missing`);
  if (!finalChinese) issue(`${entry.cardId}: finalChinese is missing`);
  const words = wordCount(finalEnglish);
  if (words < 22 || words > 65) issue(`${entry.cardId}: finalEnglish word count ${words} is outside 22-65`);
  if (finalChinese.length < 38 || finalChinese.length > 190) {
    issue(`${entry.cardId}: finalChinese length ${finalChinese.length} is outside 38-190 characters`);
  }
  for (const pattern of forbiddenEnglishFinalPhrases) {
    if (pattern.test(finalEnglish)) issue(`${entry.cardId}: finalEnglish contains forbidden process/template language ${pattern}`);
  }
  for (const pattern of forbiddenChineseFinalPhrases) {
    if (pattern.test(finalChinese)) issue(`${entry.cardId}: finalChinese contains forbidden process/template language ${pattern}`);
  }
  const renderedChinese = localizeKnownChineseNames(finalChinese);
  if (hasLatinFragment(renderedChinese)) {
    issue(`${entry.cardId}: finalChinese has avoidable Latin-script fragments`);
  }
  if (!allowUnapplied) {
    if (profile.styleNote !== finalEnglish) issue(`${entry.cardId}: profile English does not match manifest finalEnglish`);
    if (profile.styleNoteZh !== entry.finalChinese) issue(`${entry.cardId}: profile Chinese does not match manifest finalChinese`);
    if (profile.styleNoteMeta?.origin !== REVIEWED_ORIGIN) issue(`${entry.cardId}: profile metadata is not marked as manifest-reviewed`);
    if (profile.styleNoteMeta?.confidence !== entry.confidence) issue(`${entry.cardId}: confidence changed from manifest evidence level`);
    if (profile.styleNoteMeta?.evidenceScope !== entry.evidenceLevel) issue(`${entry.cardId}: evidence scope changed from manifest evidence level`);
  }
  finalTexts.set(entry.cardId, finalEnglish);
  finalTextsZh.set(entry.cardId, finalChinese);
}

const archiveEnglish = Object.values(profilesData.profiles || {}).map((profile) => {
  const entry = entries.get(profile.profileKey);
  return {
    id: profile.profileKey,
    text: entry && entry.status !== "blocked" ? entry.finalEnglish : profile.styleNote || ""
  };
});

const ngrams = new Map();
for (const { id, text } of archiveEnglish) {
  const words = normalizeText(text).split(/\s+/u).filter((word) =>
    (/\d/u.test(word) || word.length > 2) &&
    !englishNgramStopWords.has(word)
  );
  for (let index = 0; index <= words.length - 5; index += 1) {
    const gram = words.slice(index, index + 5).join(" ");
    if (!ngrams.has(gram)) ngrams.set(gram, new Set());
    ngrams.get(gram).add(id);
  }
}
for (const [gram, ids] of ngrams) {
  if (ids.size >= 160 && [...ids].some((id) => finalTexts.has(id))) {
    issue(`repeated English five-word sequence across archive (${ids.size}x): ${gram}`);
  }
}

const chineseSequences = new Map();
for (const [id, text] of finalTextsZh) {
  const compact = String(text || "").replace(/[，。；：、！？\s]/gu, "");
  for (let index = 0; index <= compact.length - 8; index += 1) {
    const sequence = compact.slice(index, index + 8);
    if (/重点|比赛|进球|球记录|最佳阵容|入选信息/u.test(sequence)) continue;
    if (!chineseSequences.has(sequence)) chineseSequences.set(sequence, new Set());
    chineseSequences.get(sequence).add(id);
  }
}
for (const [sequence, ids] of chineseSequences) {
  if (ids.size >= 120) {
    issue(`repeated Chinese sequence across finalized entries (${ids.size}x): ${sequence}`);
  }
}

const recurringGroups = new Map();
for (const entry of manifest.entries || []) {
  if (!["rewritten", "reviewed-retained"].includes(entry.status)) continue;
  const key = normalizeText(entry.player);
  if (!recurringGroups.has(key)) recurringGroups.set(key, []);
  recurringGroups.get(key).push(entry);
}
for (const group of recurringGroups.values()) {
  if (group.length < 2) continue;
  for (let leftIndex = 0; leftIndex < group.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < group.length; rightIndex += 1) {
      const left = new Set(normalizeText(group[leftIndex].finalEnglish).split(/\s+/u).filter(Boolean));
      const right = new Set(normalizeText(group[rightIndex].finalEnglish).split(/\s+/u).filter(Boolean));
      const overlap = [...left].filter((word) => right.has(word)).length;
      const union = new Set([...left, ...right]).size || 1;
      const similarity = overlap / union;
      if (similarity > 0.82) {
        issue(`${group[leftIndex].player}: recurring editions too similar (${group[leftIndex].tournamentYear}/${group[rightIndex].tournamentYear}, ${similarity.toFixed(2)})`);
      }
    }
  }
}

if (issues.length) {
  console.error("Historical player-card editorial manifest audit failed.");
  for (const item of issues.slice(0, 120)) console.error(`- ${item}`);
  if (issues.length > 120) console.error(`...and ${issues.length - 120} more`);
  process.exit(1);
}

console.log("Historical player-card editorial manifest audit passed.");
console.log(`Manifest: ${manifestPath}`);
console.log(`Remaining high-attention entries: ${candidates.length}`);
console.log(`Finalized entries: ${(manifest.entries || []).filter((entry) => ["rewritten", "reviewed-retained"].includes(entry.status)).length}`);
console.log(`Blocked entries: ${(manifest.entries || []).filter((entry) => entry.status === "blocked").length}`);
console.log(`Applied check: ${allowUnapplied ? "skipped" : "verified"}`);
