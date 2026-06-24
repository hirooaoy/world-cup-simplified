#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function validationNeedsCurrentProfiles(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => /^-?\s*player-profiles\.json\b/.test(line));
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

async function main() {
  console.log("Profile-aware validation: validating data.");
  const validation = await runNodeScript({
    allowFailure: true,
    capture: true,
    label: "Validate data",
    script: "scripts/validate-data.mjs"
  });

  if (validation.code === 0) {
    return;
  }

  if (!validationNeedsCurrentProfiles(validation.output)) {
    throw new Error("Validation failed for a non-profile reason. Fix the reported data issue before continuing.");
  }

  console.log("\nValidation found missing or stale current player profiles. Regenerating profile cards.");
  await runNodeScript({
    args: getProfileRefreshArgs(validation.output),
    label: "Regenerate player profiles",
    script: "scripts/populate-player-profiles.mjs"
  });

  console.log("\nProfile-aware validation: validating data after profile refresh.");
  await runNodeScript({
    label: "Validate data after profile refresh",
    script: "scripts/validate-data.mjs"
  });
}

main().catch((error) => {
  console.error(`\nProfile-aware validation failed: ${error.message}`);
  process.exit(1);
});
