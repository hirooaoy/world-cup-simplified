#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verify2026Archive } from "./verify-2026-archive-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const verifyReleaseSurface = process.argv.includes("--verify-release-surface");
const result = await verify2026Archive({ dataDir: path.join(root, "data"), surfaceRoot: root, verifyReleaseSurface });
const latest = result.verifiedEntries.at(-1);

console.log(`Verified ${result.entryCount} immutable 2026 archive snapshot${result.entryCount === 1 ? "" : "s"}.`);
console.log(`Latest: ${result.latestArchiveVersion}`);
console.log(`SHA-256: ${latest.sha256}`);
console.log(`${latest.fixtureCount} fixtures, ${latest.teamCount} teams, ${latest.playerProfileCount} player profiles, ${latest.coachProfileCount} coach profiles.`);
if (result.releaseSurfaceVerified) {
  console.log("Release surface hashes match the archived cutover bytes.");
}
