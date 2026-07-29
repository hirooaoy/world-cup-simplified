#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZH_PLAYER_NAME_TRANSLATIONS } from "../football-locale-zh.js";
import {
  HISTORICAL_HIGH_ATTENTION_REVIEW_VERSION,
  isHighAttentionHistoricalProfile
} from "./refresh-historical-player-card-notes.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profilesPath = path.join(root, "data/historical-player-profiles.json");
const refreshScriptPath = path.join(root, "scripts/refresh-historical-player-card-notes.mjs");
const profileData = JSON.parse(await readFile(profilesPath, "utf8"));
const refreshScriptSource = await readFile(refreshScriptPath, "utf8");
const profiles = Object.values(profileData.profiles || {});

function parseRefreshScriptKeySet(name) {
  const match = refreshScriptSource.match(new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\n\\]\\);`, "u"));
  if (!match) {
    throw new Error(`Unable to find ${name} in refresh-historical-player-card-notes.mjs`);
  }
  return [...match[1].matchAll(/"([^"]+)"/gu)].map((item) => item[1]);
}

function countBy(values) {
  const counts = new Map();
  for (const value of values) {
    const key = String(value || "(missing)");
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function firstSentence(value) {
  return String(value || "").split(/[.!?]/)[0].trim();
}

function attentionScore(profile) {
  return (
    (profile.bestXiSelection ? 8 : 0) +
    Math.min(8, Number(profile.goals || 0)) +
    Math.min(5, Number(profile.scorerMatchCount || 0)) +
    Math.min(5, Number(profile.keyMatchCount || 0)) +
    (profile.imageUrl ? 1 : 0)
  );
}

function normalizeReviewText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\b(?:19|20)\d{2}\b/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

function localizeKnownChineseEntities(value) {
  let output = String(value || "");
  const entries = Object.entries(ZH_PLAYER_NAME_TRANSLATIONS)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [source, localized] of entries) {
    output = output.split(source).join(localized);
  }
  return output;
}

const firstFocusedKeys = parseRefreshScriptKeySet("FIRST_FOCUSED_HISTORICAL_STYLE_POLISH_PROFILE_KEYS");
const secondFocusedKeys = parseRefreshScriptKeySet("SECOND_FOCUSED_HISTORICAL_STYLE_POLISH_PROFILE_KEYS");
const focusedReviewKeys = [...firstFocusedKeys, ...secondFocusedKeys];
const focusedReviewKeySet = new Set(focusedReviewKeys);
const focusedReviewProfiles = focusedReviewKeys.map((key) => profileData.profiles?.[key]).filter(Boolean);
const focusedReviewIssues = [];
const bannedEnglishPhrases = [
  /\bpractical lens\b/iu,
  /\bthis card\b/iu,
  /\bthis profile\b/iu,
  /\bthis version\b/iu,
  /\bone marker\b/iu,
  /\banother responsibility\b/iu,
  /\bfootball read\b/iu,
  /\bimproving the card\b/iu,
  /\bcautious (?!way to read\b)[^.]{0,96} read\b/iu
];
const bannedChinesePhrases = [
  /这张卡/u,
  /实用切入点/u,
  /一个标记/u,
  /另一项责任/u,
  /这个\d{4}年的/u,
  /进入.+场上任务/u
];

if (focusedReviewKeys.length !== 80 || focusedReviewProfiles.length !== 80) {
  focusedReviewIssues.push(`focused review key coverage expected 80, found ${focusedReviewKeys.length}/${focusedReviewProfiles.length}`);
}

function hasHighAttentionCopyReview(profile) {
  return focusedReviewKeySet.has(profile.profileKey) ||
    profile.styleNoteMeta?.copyReview === HISTORICAL_HIGH_ATTENTION_REVIEW_VERSION ||
    ["reviewed", "editorial"].includes(profile.styleNoteMeta?.confidence);
}

for (const profile of focusedReviewProfiles) {
  const key = profile.profileKey;
  const english = String(profile.styleNote || "");
  const renderedChinese = localizeKnownChineseEntities(profile.styleNoteZh || "");
  const englishPhrase = bannedEnglishPhrases.find((pattern) => pattern.test(english));
  const chinesePhrase = bannedChinesePhrases.find((pattern) => pattern.test(renderedChinese));
  if (englishPhrase) {
    focusedReviewIssues.push(`${key}: English keeps mechanical phrase ${englishPhrase}`);
  }
  if (chinesePhrase) {
    focusedReviewIssues.push(`${key}: Chinese keeps mechanical phrase ${chinesePhrase}`);
  }
  if (/\p{Script=Latin}/u.test(renderedChinese)) {
    focusedReviewIssues.push(`${key}: rendered Chinese still contains Latin-script fragments`);
  }
}

const highAttention = profiles.filter(isHighAttentionHistoricalProfile);
const highAttentionReviewProfiles = highAttention.filter((profile) => (
  focusedReviewKeySet.has(profile.profileKey) ||
  profile.styleNoteMeta?.copyReview === HISTORICAL_HIGH_ATTENTION_REVIEW_VERSION
));

for (const profile of highAttentionReviewProfiles) {
  const key = profile.profileKey;
  const english = String(profile.styleNote || "");
  const renderedChinese = localizeKnownChineseEntities(profile.styleNoteZh || "");
  const englishPhrase = bannedEnglishPhrases.find((pattern) => pattern.test(english));
  const chinesePhrase = bannedChinesePhrases.find((pattern) => pattern.test(renderedChinese));
  if (englishPhrase) {
    focusedReviewIssues.push(`${key}: reviewed high-attention English keeps mechanical phrase ${englishPhrase}`);
  }
  if (chinesePhrase) {
    focusedReviewIssues.push(`${key}: reviewed high-attention Chinese keeps mechanical phrase ${chinesePhrase}`);
  }
  if (/\p{Script=Latin}/u.test(renderedChinese)) {
    focusedReviewIssues.push(`${key}: reviewed high-attention Chinese still contains Latin-script fragments`);
  }
}

const recurringFocusedGroups = new Map();
for (const profile of focusedReviewProfiles) {
  const groupKey = `${profile.name} / ${profile.teamName}`;
  if (!recurringFocusedGroups.has(groupKey)) recurringFocusedGroups.set(groupKey, []);
  recurringFocusedGroups.get(groupKey).push(profile);
}
for (const [groupKey, group] of recurringFocusedGroups) {
  if (group.length < 2) continue;
  const normalizedNotes = new Set(group.map((profile) => normalizeReviewText(profile.styleNote)));
  if (normalizedNotes.size !== group.length) {
    focusedReviewIssues.push(`${groupKey}: recurring editions still have interchangeable English notes`);
  }
}

const recurringHighAttentionGroups = new Map();
for (const profile of highAttentionReviewProfiles) {
  const groupKey = `${profile.name} / ${profile.teamName}`;
  if (!recurringHighAttentionGroups.has(groupKey)) recurringHighAttentionGroups.set(groupKey, []);
  recurringHighAttentionGroups.get(groupKey).push(profile);
}
for (const [groupKey, group] of recurringHighAttentionGroups) {
  if (group.length < 2) continue;
  const normalizedNotes = new Set(group.map((profile) => normalizeReviewText(profile.styleNote)));
  if (normalizedNotes.size !== group.length) {
    focusedReviewIssues.push(`${groupKey}: reviewed high-attention recurring editions still have interchangeable English notes`);
  }
}

const bobbyCharlton1958 = profileData.profiles?.["Bobby Charlton / England / 1958"];
if (
  bobbyCharlton1958 &&
  !/did not play|没有出场/iu.test(`${bobbyCharlton1958.styleNote} ${bobbyCharlton1958.styleNoteZh}`)
) {
  focusedReviewIssues.push("Bobby Charlton / England / 1958: card must state that he did not play");
}

const missing = profiles.filter((profile) =>
  !String(profile.styleNote || "").trim() ||
  !String(profile.styleNoteZh || "").trim() ||
  !profile.styleNoteMeta
);

const highAttentionUnreviewed = highAttention
  .filter((profile) => profile.styleNoteMeta?.confidence === "role-level" && !hasHighAttentionCopyReview(profile))
  .sort((a, b) => attentionScore(b) - attentionScore(a) || a.name.localeCompare(b.name));
const highAttentionReviewed = highAttention
  .filter((profile) => ["reviewed", "editorial"].includes(profile.styleNoteMeta?.confidence))
  .length;
const highAttentionCopyReviewed = highAttention
  .filter((profile) => (
    profile.styleNoteMeta?.confidence === "role-level" &&
    (
      focusedReviewKeySet.has(profile.profileKey) ||
      profile.styleNoteMeta?.copyReview === HISTORICAL_HIGH_ATTENTION_REVIEW_VERSION
    )
  ))
  .length;

const repeatedStarts = countBy(profiles.map((profile) => firstSentence(profile.styleNote)))
  .filter(([, count]) => count > 1)
  .slice(0, 12);
const signatureCounts = countBy(profiles.map((profile) => profile.styleNoteMeta?.signature)).slice(0, 12);
const actionCounts = countBy(
  profiles.map((profile) => (profile.styleNoteMeta?.actions || []).join(" + "))
).slice(0, 12);

if (missing.length) {
  console.error("Historical writing quality audit failed.");
  console.error(`Missing style notes, Chinese notes, or metadata: ${missing.length}`);
  for (const profile of missing.slice(0, 20)) {
    console.error(`- ${profile.profileKey || `${profile.name} / ${profile.teamName} / ${profile.tournamentYear}`}`);
  }
  process.exit(1);
}

if (focusedReviewIssues.length) {
  console.error("Historical focused writing review audit failed.");
  for (const issue of focusedReviewIssues.slice(0, 80)) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

if (highAttentionUnreviewed.length) {
  console.error("Historical writing quality audit failed.");
  console.error(`Unreviewed high-attention role-level cards: ${highAttentionUnreviewed.length}`);
  for (const profile of highAttentionUnreviewed.slice(0, 40)) {
    console.error(
      `- ${profile.name} / ${profile.teamName} / ${profile.tournamentYear} ` +
      `(score ${attentionScore(profile)}, ${profile.styleNoteMeta?.signature || "no signature"})`
    );
  }
  process.exit(1);
}

console.log("Historical writing quality audit passed.");
console.log(`Profiles checked: ${profiles.length}`);
console.log(`High-attention profiles: ${highAttention.length}`);
console.log(`High-attention reviewed/editorial: ${highAttentionReviewed}`);
console.log(`High-attention copy-reviewed with preserved evidence level: ${highAttentionCopyReviewed}`);
console.log(`High-attention unreviewed role-level: ${highAttentionUnreviewed.length}`);
console.log(`Focused reviewed-batch cards checked: ${focusedReviewProfiles.length}`);
console.log("");
console.log("Top unreviewed role-level high-attention targets:");
for (const profile of highAttentionUnreviewed.slice(0, 20)) {
  console.log(
    `- ${profile.name} / ${profile.teamName} / ${profile.tournamentYear} ` +
    `(score ${attentionScore(profile)}, ${profile.styleNoteMeta?.signature || "no signature"})`
  );
}
console.log("");
console.log("Most repeated first sentences:");
for (const [sentence, count] of repeatedStarts) {
  console.log(`- ${count}x ${sentence}`);
}
console.log("");
console.log("Most common signatures:");
for (const [signature, count] of signatureCounts) {
  console.log(`- ${count}x ${signature}`);
}
console.log("");
console.log("Most common action pairs:");
for (const [actions, count] of actionCounts) {
  console.log(`- ${count}x ${actions}`);
}
