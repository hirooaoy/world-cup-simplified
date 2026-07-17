#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const GROUPS = Object.freeze({
  "ball-boy": ["scripts/smoke-ball-boy-player-search.mjs"],
  lineups: [
    "scripts/smoke-lineup-prediction-engine.mjs",
    "scripts/smoke-lineup-formations.mjs",
    "scripts/smoke-lineup-prediction-history.mjs",
    "scripts/smoke-lineup-prediction-audit.mjs",
    "scripts/audit-lineup-prediction-history.mjs",
    "scripts/audit-lineup-geometry.mjs",
    "scripts/smoke-live-lineups.mjs",
    "scripts/smoke-live-lineup-rendering.mjs",
    "scripts/smoke-lineup-layout-sources.mjs",
    "scripts/smoke-fifa-tactical-lineup-discovery.mjs",
    "scripts/smoke-fifa-tactical-lineup-pdf.mjs"
  ],
  locales: ["scripts/smoke-locales.mjs"],
  shell: ["scripts/ui-smoke.mjs"],
  tournament: [
    "scripts/smoke-live-match-phase.mjs",
    "scripts/smoke-tournament-forecasts.mjs"
  ]
});

const SHARDS = Object.freeze([
  ["lineups"],
  ["locales", "ball-boy", "tournament"],
  ["shell"]
]);

function parseArgs() {
  const parsed = { groups: [], list: false, shard: null };
  for (const argument of process.argv.slice(2)) {
    if (argument === "--") continue;
    if (argument === "--list") parsed.list = true;
    else if (argument === "--all") parsed.groups = Object.keys(GROUPS);
    else if (argument.startsWith("--group=")) {
      parsed.groups.push(...argument.slice("--group=".length).split(",").filter(Boolean));
    } else if (argument.startsWith("--shard=")) {
      parsed.shard = argument.slice("--shard=".length);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return parsed;
}

function resolveGroups(parsed) {
  if (parsed.shard) {
    if (parsed.groups.length) throw new Error("Use --group or --shard, not both.");
    const match = parsed.shard.match(/^(\d+)\/(\d+)$/);
    if (!match) throw new Error("Shard must use INDEX/TOTAL, for example --shard=1/3.");
    const index = Number(match[1]);
    const total = Number(match[2]);
    if (total !== SHARDS.length || index < 1 || index > total) {
      throw new Error(`Smoke shards are fixed at 1/${SHARDS.length} through ${SHARDS.length}/${SHARDS.length}.`);
    }
    return SHARDS[index - 1];
  }

  const groups = [...new Set(parsed.groups)];
  if (!groups.length) {
    throw new Error("Choose --group=<name>, --shard=INDEX/3, --all, or --list.");
  }
  const unknown = groups.filter((group) => !GROUPS[group]);
  if (unknown.length) throw new Error(`Unknown smoke group(s): ${unknown.join(", ")}`);
  return groups;
}

function runScript(script) {
  const startedAt = Date.now();
  console.log(`\n[smoke] ${script}`);
  const result = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });
  const durationSeconds = Math.round((Date.now() - startedAt) / 100) / 10;
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${script} failed with exit code ${result.status}.`);
  }
  console.log(`[smoke] passed ${script} (${durationSeconds}s)`);
  return { script, durationSeconds };
}

function printList() {
  console.log("Available smoke groups:");
  for (const [group, scripts] of Object.entries(GROUPS)) {
    console.log(`- ${group}: ${scripts.length} script${scripts.length === 1 ? "" : "s"}`);
  }
  console.log("\nFixed CI shards:");
  SHARDS.forEach((groups, index) => console.log(`- ${index + 1}/${SHARDS.length}: ${groups.join(", ")}`));
}

function main() {
  const parsed = parseArgs();
  if (parsed.list) {
    printList();
    return;
  }

  const groups = resolveGroups(parsed);
  const scripts = [...new Set(groups.flatMap((group) => GROUPS[group]))];
  const results = scripts.map(runScript);
  const totalSeconds = Math.round(results.reduce((sum, result) => sum + result.durationSeconds, 0) * 10) / 10;
  console.log(
    `\nSmoke groups passed: ${groups.join(", ")} (${scripts.length} scripts, ${totalSeconds}s cumulative).`
  );
}

try {
  main();
} catch (error) {
  console.error(`Smoke group failed: ${error.message}`);
  process.exit(1);
}
