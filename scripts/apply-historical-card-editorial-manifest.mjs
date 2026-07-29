#!/usr/bin/env node
import {
  applyEntryToProfile,
  manifestEntryById,
  manifestPath,
  profilesPath,
  readManifest,
  readProfiles,
  remainingManifestCandidates,
  writeJson
} from "./historical-card-editorial-manifest-lib.mjs";

const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const manifest = await readManifest();
const entries = manifestEntryById(manifest);
const profilesData = await readProfiles();
const candidates = remainingManifestCandidates(profilesData);
const issues = [];
let applied = 0;

for (const profile of candidates) {
  const entry = entries.get(profile.profileKey);
  if (!entry) {
    issues.push(`${profile.profileKey}: missing manifest entry`);
    continue;
  }
  if (entry.status === "blocked") continue;
  if (!["rewritten", "reviewed-retained"].includes(entry.status)) {
    issues.push(`${entry.cardId}: status must be finalized before apply`);
    continue;
  }
  if (!entry.finalEnglish || !entry.finalChinese) {
    issues.push(`${entry.cardId}: finalized entries require final English and Chinese`);
    continue;
  }
  if (write) {
    applyEntryToProfile(profile, entry);
  }
  applied += 1;
}

if (issues.length) {
  console.error("Historical editorial manifest apply failed.");
  for (const issue of issues.slice(0, 80)) console.error(`- ${issue}`);
  if (issues.length > 80) console.error(`...and ${issues.length - 80} more`);
  process.exit(1);
}

if (write) {
  profilesData.updatedAt = new Date().toISOString();
  await writeJson(profilesPath, profilesData);
}

console.log(`${write ? "Applied" : "Would apply"} historical player-card editorial manifest.`);
console.log(`Manifest: ${manifestPath}`);
console.log(`Finalized entries applied: ${applied}`);
console.log(`Blocked entries left unchanged: ${(manifest.entries || []).filter((entry) => entry.status === "blocked").length}`);
if (!write) console.log("Run with --write to update historical-player-profiles.json.");
