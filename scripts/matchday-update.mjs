#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const steps = [
  {
    label: "Sync FIFA scores and statuses",
    script: "scripts/sync-fifa-results.mjs",
    args: ["--skip-unchanged"]
  },
  {
    label: "Sync FIFA goal events",
    script: "scripts/sync-fifa-goal-events.mjs"
  }
];
const verificationSteps = [
  {
    label: "Validate data",
    script: "scripts/validate-data.mjs"
  },
  {
    label: "Audit data freshness/status",
    script: "scripts/audit-data.mjs"
  },
  {
    label: "Audit result enrichment",
    script: "scripts/audit-result-enrichment.mjs"
  },
  {
    label: "Audit player-card coverage",
    script: "scripts/audit-player-card-coverage.mjs"
  },
  {
    label: "Run UI smoke tests",
    script: "scripts/ui-smoke.mjs"
  }
];

function formatStep(index, label) {
  return `\n[${index}] ${label}`;
}

function runNodeScript({ allowFailure = false, args = [], capture = false, label, script }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: root,
      env: process.env,
      stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit"
    });
    let output = "";

    if (capture) {
      for (const stream of [child.stdout, child.stderr]) {
        stream.on("data", (chunk) => {
          const text = chunk.toString();
          output += text;
          process.stdout.write(text);
        });
      }
    }

    child.on("error", reject);
    child.on("close", (code) => {
      const result = { code, output };

      if (code === 0 || allowFailure) {
        resolve(result);
        return;
      }

      reject(new Error(`${label} failed with exit code ${code}`));
    });
  });
}

function validationNeedsProfiles(output) {
  return /player-profiles\.json/.test(output);
}

async function runValidatedProfileRefresh(stepIndex) {
  console.log(formatStep(stepIndex, "Validate data"));
  const validation = await runNodeScript({
    allowFailure: true,
    capture: true,
    label: "Validate data",
    script: "scripts/validate-data.mjs"
  });

  if (validation.code === 0) {
    return stepIndex + 1;
  }

  if (!validationNeedsProfiles(validation.output)) {
    throw new Error("Validation failed for a non-profile reason. Fix the reported data issue before continuing.");
  }

  console.log("\nValidation found stale/missing player profiles. Regenerating profile cards.");
  console.log(formatStep(stepIndex + 1, "Regenerate player profiles"));
  await runNodeScript({
    label: "Regenerate player profiles",
    script: "scripts/populate-player-profiles.mjs"
  });

  console.log(formatStep(stepIndex + 2, "Validate data after profile refresh"));
  await runNodeScript({
    label: "Validate data after profile refresh",
    script: "scripts/validate-data.mjs"
  });

  return stepIndex + 3;
}

async function main() {
  let stepIndex = 1;

  console.log("Matchday update: syncing scores, scorers, result copy, and verification checks.");

  for (const step of steps) {
    console.log(formatStep(stepIndex, step.label));
    await runNodeScript(step);
    stepIndex += 1;
  }

  stepIndex = await runValidatedProfileRefresh(stepIndex);

  console.log(formatStep(stepIndex, "Refresh result highlights"));
  await runNodeScript({
    label: "Refresh result highlights",
    script: "scripts/populate-result-highlights.mjs"
  });
  stepIndex += 1;

  for (const step of verificationSteps) {
    console.log(formatStep(stepIndex, step.label));
    await runNodeScript(step);
    stepIndex += 1;
  }

  console.log("\nMatchday update complete. Review the data diff, then commit and deploy if it looks sane.");
}

main().catch((error) => {
  console.error(`\nMatchday update failed: ${error.message}`);
  process.exit(1);
});
