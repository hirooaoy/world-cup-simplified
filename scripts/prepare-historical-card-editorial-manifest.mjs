#!/usr/bin/env node
import { manifestPath, prepareManifest, writeJson } from "./historical-card-editorial-manifest-lib.mjs";

const args = new Set(process.argv.slice(2));
const getArgValue = (name) => {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || "";
};

const finalize = args.has("--finalize-draft-candidates");
const refreshFinalized = args.has("--refresh-finalized");
const write = args.has("--write");
const draftPath = getArgValue("draft");
const reviewedAt = getArgValue("reviewed-at") || new Date().toISOString().slice(0, 10);
const manifest = await prepareManifest({ finalize, refreshFinalized, draftPath, reviewedAt });

if (write) {
  await writeJson(manifestPath, manifest);
}

console.log(`${write ? "Wrote" : "Prepared"} historical player-card editorial manifest.`);
console.log(`Path: ${manifestPath}`);
console.log(`Remaining candidates: ${manifest.summary.remainingCandidates}`);
console.log(`Draft candidates matched: ${manifest.summary.draftMatched}`);
console.log(`Finalized entries: ${manifest.summary.finalized}`);
console.log(`Blocked entries: ${manifest.summary.blocked}`);
if (!write) {
  console.log("Run with --write to save the manifest.");
}
