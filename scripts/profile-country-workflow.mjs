#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const args = process.argv.slice(2);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const trackerPath = path.join(root, "data/profile-curation-tracker.json");
const playerProfilesPath = path.join(root, "data/player-profiles.json");

function getArgValue(name) {
  const flag = `--${name}=`;
  const arg = args.find((item) => item.startsWith(flag));
  return arg ? arg.slice(flag.length) : "";
}

function hasArg(name) {
  return args.includes(`--${name}`) || args.some((item) => item.startsWith(`--${name}=`));
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function normalizeProfileEdition(value) {
  const raw = String(value || "").trim();
  const year = raw.match(/\b(?:19|20)\d{2}\b/)?.[0];
  return year || raw || "2026";
}

function getTrackerProfileEdition() {
  if (!existsSync(trackerPath)) {
    return "";
  }

  try {
    return JSON.parse(readFileSync(trackerPath, "utf8"))?.currentTournament?.edition || "";
  } catch {
    return "";
  }
}

function runStep(label, commandArgs) {
  console.log("");
  console.log(`== ${label} ==`);
  const result = spawnSync(process.execPath, commandArgs, {
    stdio: "inherit"
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function updateCurationTracker(teamIds) {
  if (!existsSync(trackerPath)) {
    return;
  }

  const tracker = JSON.parse(readFileSync(trackerPath, "utf8"));
  const profilesData = JSON.parse(readFileSync(playerProfilesPath, "utf8"));
  const profiles = Object.values(profilesData.profiles || {});
  const now = new Date().toISOString();
  const teamSet = new Set(teamIds);

  tracker.updatedAt = now;
  for (const team of tracker.currentTournament?.teams || []) {
    if (!teamSet.has(team.teamId)) {
      continue;
    }

    team.status = "ready";
    team.profileCount = profiles.filter((profile) => profile?.teamId === team.teamId).length;
    team.lastAudit = `passed strict country workflow at ${now}`;
  }

  writeFileSync(trackerPath, `${JSON.stringify(tracker, null, 2)}\n`);
}

const teams = (getArgValue("teams") || getArgValue("squad-teams"))
  .split(",")
  .map((teamId) => teamId.trim().toUpperCase())
  .filter(Boolean)
  .join(",");
const teamIds = teams.split(",").filter(Boolean);
const minProfiles = positiveInteger(getArgValue("min-profiles"), 26);
const profileEdition = normalizeProfileEdition(
  getArgValue("profile-edition") ||
    getArgValue("edition") ||
    process.env.PROFILE_EDITION ||
    getTrackerProfileEdition() ||
    "2026"
);
const skipSmoke = hasArg("skip-smoke");
const skipChecks = hasArg("skip-checks");

if (!teams) {
  console.error("Usage: pnpm profiles:country -- --teams=CRO,PAN");
  process.exit(1);
}

runStep("Preflight squad candidates", [
  "scripts/populate-player-profiles.mjs",
  "--include-squad-profiles",
  `--squad-teams=${teams}`,
  `--profile-edition=${profileEdition}`,
  "--audit-squad-candidates",
  "--strict-squad-audit",
  `--expected-squad-candidates=${minProfiles}`
]);

runStep("Generate country profiles", [
  "scripts/populate-player-profiles.mjs",
  "--include-squad-profiles",
  `--squad-teams=${teams}`,
  `--profile-edition=${profileEdition}`,
  "--squad-only"
]);

runStep("Audit generated country profiles", [
  "scripts/audit-country-player-profiles.mjs",
  `--teams=${teams}`,
  `--min-profiles=${minProfiles}`,
  `--max-profiles=${minProfiles}`
]);

if (!skipChecks) {
  runStep("Validate data", ["scripts/validate-data.mjs"]);
  runStep("Audit player-card coverage", ["scripts/audit-player-card-coverage.mjs"]);
  if (!skipSmoke) {
    runStep("UI smoke test", ["scripts/ui-smoke.mjs"]);
  }
}

updateCurationTracker(teamIds);
console.log("");
console.log(`Country profile workflow passed for ${teams}.`);
