#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profilesPath = path.join(root, "data/historical-player-profiles.json");
const profileData = JSON.parse(await readFile(profilesPath, "utf8"));
const profiles = Object.values(profileData.profiles || {});

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

function isHighAttention(profile) {
  return profile.bestXiSelection ||
    Number(profile.goals || 0) >= 3 ||
    Number(profile.scorerMatchCount || 0) >= 2 ||
    Number(profile.keyMatchCount || 0) >= 3;
}

const missing = profiles.filter((profile) =>
  !String(profile.styleNote || "").trim() ||
  !String(profile.styleNoteZh || "").trim() ||
  !profile.styleNoteMeta
);

const highAttention = profiles.filter(isHighAttention);
const highAttentionRoleLevel = highAttention
  .filter((profile) => profile.styleNoteMeta?.confidence === "role-level")
  .sort((a, b) => attentionScore(b) - attentionScore(a) || a.name.localeCompare(b.name));
const highAttentionReviewed = highAttention
  .filter((profile) => ["reviewed", "editorial"].includes(profile.styleNoteMeta?.confidence))
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

console.log("Historical writing quality audit passed.");
console.log(`Profiles checked: ${profiles.length}`);
console.log(`High-attention profiles: ${highAttention.length}`);
console.log(`High-attention reviewed/editorial: ${highAttentionReviewed}`);
console.log(`High-attention still role-level: ${highAttentionRoleLevel.length}`);
console.log("");
console.log("Top role-level high-attention targets:");
for (const profile of highAttentionRoleLevel.slice(0, 20)) {
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
