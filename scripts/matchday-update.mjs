#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPipelineFingerprint,
  readPipelineCache,
  writePipelineCache
} from "./pipeline-fingerprint.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const verificationCachePath = path.join(root, ".tmp-data", "pipeline-cache.json");
const verificationCacheKey = "matchday-verification-v1";
const verificationInputs = [
  "app-config.js",
  "app.js",
  "chatbot-knowledge.js",
  "chatbot.css",
  "chatbot.js",
  "data",
  "football-locale-zh.js",
  "index.html",
  "locales",
  "package.json",
  "pnpm-lock.yaml",
  "report.html",
  "report.js",
  "scripts",
  "styles",
  "styles.css",
  "theme-init.js"
];
const forceVerification = process.argv.includes("--force-verify") || process.env.CI === "true";
const steps = [
  {
    label: "Sync FIFA scores and statuses",
    script: "scripts/sync-fifa-results.mjs",
    args: ["--skip-unchanged"]
  },
  {
    label: "Sync FIFA confirmed and final lineups",
    script: "scripts/sync-fifa-lineups.mjs",
    args: ["--include-live"]
  },
  {
    label: "Verify kickoff-window lineup layouts",
    script: "scripts/verify-lineup-layouts.mjs",
    args: ["--scope=live-start"]
  },
  {
    label: "Refresh expected lineups for confirmed fixtures",
    script: "scripts/generate-expected-lineups.mjs",
    args: ["--if-needed"]
  },
  {
    label: "Sync FIFA goal events",
    script: "scripts/sync-fifa-goal-events.mjs"
  },
  {
    label: "Sync FIFA cards and substitutions",
    script: "scripts/sync-fifa-match-events.mjs"
  },
  {
    label: "Refresh confirmed-fixture key-player/H2H baselines",
    script: "scripts/populate-enrichment-baselines.mjs"
  },
  {
    label: "Sync verified H2H results",
    script: "scripts/sync-h2h-results.mjs"
  },
  {
    label: "Refresh confirmed-fixture projections",
    script: "scripts/populate-projections.mjs"
  },
  {
    label: "Refresh confirmed-fixture matchup key information",
    script: "scripts/populate-matchup-key-information.mjs"
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
    label: "Verify lineup prediction engine",
    script: "scripts/smoke-lineup-prediction-engine.mjs"
  },
  {
    label: "Verify lineup prediction history",
    script: "scripts/smoke-lineup-prediction-history.mjs"
  },
  {
    label: "Verify lineup prediction audit revisions",
    script: "scripts/smoke-lineup-prediction-audit.mjs"
  },
  {
    label: "Audit lineup prediction accuracy",
    script: "scripts/audit-lineup-prediction-history.mjs"
  },
  {
    label: "Verify live official lineup ingestion",
    script: "scripts/smoke-live-lineups.mjs"
  },
  {
    label: "Verify live lineup rendering",
    script: "scripts/smoke-live-lineup-rendering.mjs"
  },
  {
    label: "Verify lineup layout provenance",
    script: "scripts/smoke-lineup-layout-sources.mjs"
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

function getProfileRefreshArgs(output) {
  const names = [
    ...new Set(
      [...output.matchAll(/player-profiles\.json(?: is missing)?\s+"([^"]+)"/g)].map((match) => match[1])
    )
  ];

  if (!names.length) {
    return [];
  }

  console.log(`Profile refresh scope: ${names.join(", ")}`);
  return [`--players=${names.join(",")}`];
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
    args: getProfileRefreshArgs(validation.output),
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

async function runVerificationSteps(stepIndex) {
  const current = await createPipelineFingerprint({ inputs: verificationInputs, root });
  const cached = await readPipelineCache({
    cachePath: verificationCachePath,
    key: verificationCacheKey
  });

  if (!forceVerification && cached?.fingerprint === current.fingerprint) {
    console.log(
      formatStep(
        stepIndex,
        `Skip unchanged verification (${current.fileCount} input files match the last successful run)`
      )
    );
    return stepIndex + 1;
  }

  for (const step of verificationSteps) {
    console.log(formatStep(stepIndex, step.label));
    await runNodeScript(step);
    stepIndex += 1;
  }

  await writePipelineCache({
    cachePath: verificationCachePath,
    key: verificationCacheKey,
    entry: current
  });
  return stepIndex;
}

async function main() {
  let stepIndex = 1;

  console.log("Matchday update: syncing scores, scorers, factual result context, videos, and verification checks.");

  for (const step of steps) {
    console.log(formatStep(stepIndex, step.label));
    await runNodeScript(step);
    stepIndex += 1;
  }

  stepIndex = await runValidatedProfileRefresh(stepIndex);

  console.log(formatStep(stepIndex, "Refresh factual result highlights"));
  await runNodeScript({
    label: "Refresh factual result highlights",
    script: "scripts/populate-result-highlights.mjs"
  });
  stepIndex += 1;

  console.log(formatStep(stepIndex, "Sync official highlight videos"));
  await runNodeScript({
    label: "Sync official highlight videos",
    script: "scripts/sync-youtube-highlights.mjs"
  });
  stepIndex += 1;

  console.log(formatStep(stepIndex, "Report result-story research queue"));
  await runNodeScript({
    label: "Report result-story research queue",
    script: "scripts/sync-result-story-research.mjs"
  });
  stepIndex += 1;

  stepIndex = await runVerificationSteps(stepIndex);

  console.log("\nMatchday update complete. Review the data diff, then commit and deploy if it looks sane.");
}

main().catch((error) => {
  console.error(`\nMatchday update failed: ${error.message}`);
  process.exit(1);
});
