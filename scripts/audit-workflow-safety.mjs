#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowDir = path.join(root, ".github", "workflows");
const workflowPaths = {
  dataQuality: path.join(workflowDir, "data-quality.yml"),
  lineup: path.join(workflowDir, "lineup-matchday-geometry.yml"),
  results: path.join(workflowDir, "sync-fifa-results-pr.yml")
};

const workflows = Object.fromEntries(
  await Promise.all(
    Object.entries(workflowPaths).map(async ([name, filePath]) => [name, await readFile(filePath, "utf8")])
  )
);

const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function checkManualWorkflow(name, source) {
  check(/\n  workflow_dispatch:\n/.test(source), `${name} must remain manually dispatchable.`);
  check(!/\n  schedule:\n/.test(source), `${name} must not have a recurring schedule while the tournament is archived.`);
  check(/\n        default: preview\n/.test(source), `${name} must default to preview mode.`);
  check(/\n        default: false\n/.test(source), `${name} write confirmation must default to false.`);
  check(source.includes("- late-correction"), `${name} must expose an explicit late-correction operation.`);
  check(source.includes("correction_reason:"), `${name} must require a reason for archived-edition corrections.`);
  check(source.includes("correction_fixture:"), `${name} must identify the fixture for an archived-edition correction.`);
  check(
    source.includes('if [ "$ACTIVE" != "true" ]'),
    `${name} live updates must require an active configured edition lifecycle.`
  );
  check(
    source.includes('if [ "$LIFECYCLE_STATE" != "archived" ]'),
    `${name} late corrections must require an archived lifecycle state.`
  );
  check(
    source.includes('if [ "$CONFIRM_WRITE" != "true" ]'),
    `${name} persistent changes must require explicit write confirmation.`
  );
  check(source.includes("persist-credentials: false"), `${name} checkout credentials must not persist into preview steps.`);
  check(!/git push[^\n]*\bmain\b/.test(source), `${name} must never push directly to main.`);
  check(!source.includes("--force"), `${name} must not overwrite a prior review branch.`);
  check(source.includes("${GITHUB_RUN_ID}"), `${name} must use a run-specific review branch.`);
  check(source.includes("gh pr create"), `${name} persistent candidates must go through a pull request.`);
  check(
    /(?:steps\.operation|needs\.[a-z_]+)\.outputs\.allow_write == 'true'/.test(source),
    `${name} persistent changes must be gated by validated write intent.`
  );
  check(
    source.includes("must include a superseding archive version and checksum before merge"),
    `${name} late-correction pull requests must preserve the archive supersession requirement.`
  );
  check(
    source.includes('--fixture="$CORRECTION_FIXTURE"'),
    `${name} late-correction tactical sync must target the reviewed fixture.`
  );
}

checkManualWorkflow("Lineup Matchday Geometry", workflows.lineup);
checkManualWorkflow("Sync FIFA Results Hybrid", workflows.results);
check(
  workflows.results.includes("pnpm results -- --current-only"),
  "The 2026 FIFA correction workflow must limit result enrichment to the current edition."
);
check(
  !workflows.results.includes("data/history.json"),
  "The 2026 FIFA correction workflow must not detect, package, stage, or publish legacy history.json."
);

check(
  workflows.dataQuality.includes('- cron: "17 15 1 * *"'),
  "Data Quality must use the monthly off-season archive-health schedule."
);
check(
  !workflows.dataQuality.includes('- cron: "0 15 * * *"'),
  "Data Quality must not retain its former daily schedule."
);
check(
  workflows.dataQuality.includes("pnpm archive:verify"),
  "Monthly archive health must verify the committed archive checksum chain."
);
check(
  workflows.dataQuality.includes("if: github.event_name == 'schedule'"),
  "Scheduled Data Quality runs must route to the read-only archive-health job."
);
check(
  workflows.dataQuality.includes("inputs.refresh_live_data == true"),
  "Manual Data Quality dispatches must opt in before refreshing active-edition data."
);
check(
  workflows.dataQuality.includes("needs.edition-window.outputs.active == 'true'"),
  "Data Quality refreshes must remain gated by the configured edition lifecycle."
);

if (failures.length > 0) {
  console.error(`Workflow safety audit failed (${failures.length}/${checks} checks):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Workflow safety audit passed (${checks} checks).`);
}
