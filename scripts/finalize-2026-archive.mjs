#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ARCHIVE_MANIFEST_NAME,
  ARCHIVE_SURFACE_INPUT_FILES,
  assert2026ArchiveReviewPlanMatches,
  build2026ArchivePlan,
  build2026ArchiveReviewPlan,
  buildArchiveInputProvenance,
  buildArchiveSurfaceProvenance,
  stringifyArchiveJson
} from "./finalize-2026-archive-lib.mjs";
import { commit2026Archive } from "./finalize-2026-archive-transaction.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const shouldWrite = process.argv.includes("--write");
const shouldCreatePlan = process.argv.includes("--create-plan");
const allowLateCorrection = process.argv.includes("--late-correction");
const inputSnapshots = new Map();
const surfaceSnapshots = new Map();

function argumentValue(name) {
  const exactIndex = process.argv.indexOf(name);
  if (exactIndex !== -1) return process.argv[exactIndex + 1];
  const prefix = `${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function resolveWorkspacePath(fileName) {
  const resolved = path.resolve(root, fileName);
  const relative = path.relative(root, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Archive plan path must be a file inside the repository: ${fileName}`);
  }
  return resolved;
}

if (shouldWrite && shouldCreatePlan) {
  throw new Error("Use --create-plan to review an archive or --write to consume one, not both at once.");
}

const planFileArgument = argumentValue("--plan-file");
const archiveAtArgument = argumentValue("--archive-at");
if (shouldWrite && !planFileArgument) {
  throw new Error("Refusing an unreviewed archive write. Create a durable plan first, then pass its path with --plan-file.");
}
if (planFileArgument && !shouldCreatePlan && archiveAtArgument) {
  throw new Error("--archive-at cannot be combined with a reviewed plan; the plan supplies the immutable timestamp.");
}

let reviewPlan = null;
if (planFileArgument && !shouldCreatePlan) {
  reviewPlan = JSON.parse(await readFile(resolveWorkspacePath(planFileArgument), "utf8"));
  if (Boolean(reviewPlan.lateCorrection) !== allowLateCorrection) {
    throw new Error("--late-correction must match the reviewed archive plan.");
  }
}
const now = new Date(reviewPlan?.archiveAt || archiveAtArgument || Date.now());

async function readJson(fileName, { optional = false } = {}) {
  try {
    const contents = await readFile(path.join(dataDir, fileName), "utf8");
    inputSnapshots.set(fileName, contents);
    return JSON.parse(contents);
  } catch (error) {
    if (error?.code === "ENOENT" && optional) {
      inputSnapshots.set(fileName, null);
      return null;
    }
    throw error;
  }
}

async function readSurface(fileName) {
  const contents = await readFile(path.join(root, fileName), "utf8");
  surfaceSnapshots.set(fileName, contents);
}

const [fixturesData, teamsData, standingsData, tournamentData, historyData, lifecycle, lineupsData, expectedLineupsData, predictionHistory, lineupLayoutOverridesData, fifaTacticalLineupIndexData, expectedLineupsAuditData, lineupPredictionRevisionsData, officialEventCorrectionsData, highlightsBestXiData, localeEsCurrentContent, localeKoCurrentContent, playerProfilesData, coachProfilesData, playerAvailabilityData, chatbotH2hData, teamStyleProfilesData, worldCupAwardsData, manifestData] =
  await Promise.all([
    readJson("fixtures.json"),
    readJson("teams.json"),
    readJson("standings.json"),
    readJson("tournament.json"),
    readJson("history.json"),
    readJson("edition-lifecycle.json"),
    readJson("lineups.json"),
    readJson("expected-lineups.json"),
    readJson("lineup-prediction-history.json"),
    readJson("lineup-layout-overrides.json"),
    readJson("fifa-tactical-lineup-index.json"),
    readJson("expected-lineups-audit.json"),
    readJson("lineup-prediction-revisions.json"),
    readJson("official-event-corrections.json"),
    readJson("highlights-best-xi.json"),
    readJson(path.join("locales", "es", "current-content.json")),
    readJson(path.join("locales", "ko", "current-content.json")),
    readJson("player-profiles.json"),
    readJson("coach-profiles.json"),
    readJson("player-availability.json"),
    readJson("chatbot-h2h.json"),
    readJson("team-style-profiles.json"),
    readJson("world-cup-awards.json"),
    readJson(path.join("archives", ARCHIVE_MANIFEST_NAME), { optional: true })
  ]);

await Promise.all(ARCHIVE_SURFACE_INPUT_FILES.map((fileName) => readSurface(fileName)));

const inputProvenance = buildArchiveInputProvenance(inputSnapshots);
const surfaceProvenance = buildArchiveSurfaceProvenance(surfaceSnapshots);

const plan = build2026ArchivePlan({
  fixturesData,
  teamsData,
  standingsData,
  tournamentData,
  historyData,
  lifecycle,
  lineupsData,
  expectedLineupsData,
  predictionHistory,
  lineupLayoutOverridesData,
  fifaTacticalLineupIndexData,
  expectedLineupsAuditData,
  lineupPredictionRevisionsData,
  officialEventCorrectionsData,
  highlightsBestXiData,
  playerProfilesData,
  coachProfilesData,
  playerAvailabilityData,
  chatbotH2hData,
  teamStyleProfilesData,
  worldCupAwardsData,
  inputProvenance,
  surfaceProvenance,
  localeCurrentContent: {
    es: localeEsCurrentContent,
    ko: localeKoCurrentContent
  },
  manifestData
}, { now, allowLateCorrection });

if (reviewPlan) {
  assert2026ArchiveReviewPlanMatches(reviewPlan, plan, inputProvenance);
  console.log(`Reviewed plan matches the current inputs and exact planned SHA-256: ${plan.archiveSha256}.`);
}

console.log(`2026 archive is ready: ${plan.qualitySummary.fixtureCount} fixtures, ${plan.qualitySummary.teamCount} teams (${plan.archiveVersion}).`);
console.log(`Immutable file: ${plan.archiveRelativePath}`);
console.log(`SHA-256: ${plan.archiveSha256}`);
console.log("history.json remains unchanged while 2026 is the active fixture dataset, preventing duplicate calendar entries.");

if (shouldCreatePlan) {
  const review = build2026ArchiveReviewPlan(plan, inputProvenance);
  const defaultPlanRelativePath = path.join("data", "archive-plans", `world-cup-${plan.archiveVersion}.plan.json`);
  const planPath = resolveWorkspacePath(planFileArgument || defaultPlanRelativePath);
  await mkdir(path.dirname(planPath), { recursive: true });
  await writeFile(planPath, stringifyArchiveJson(review), { flag: "wx" });
  const planRelativePath = path.relative(root, planPath);
  console.log(`Durable review plan: ${planRelativePath}`);
  console.log(`After review, write this exact snapshot with: pnpm archive:2026 -- --plan-file ${planRelativePath}${allowLateCorrection ? " --late-correction" : ""}`);
  process.exit(0);
}

if (!shouldWrite) {
  console.log(
    reviewPlan
      ? `Reviewed-plan dry run only. Consume it with: pnpm archive:2026 -- --plan-file ${planFileArgument}${allowLateCorrection ? " --late-correction" : ""}`
      : `Dry run only. Pin this exact timestamp with --archive-at ${plan.archivedAt}, or create a durable plan with pnpm archive:2026:plan.`
  );
  process.exit(0);
}

await commit2026Archive({ dataDir, rootDir: root, plan, snapshots: inputSnapshots, surfaceSnapshots });
console.log("Archived 2026, published the manifest, and closed live-era jobs. Late official corrections require --write --late-correction and create a new immutable snapshot.");
