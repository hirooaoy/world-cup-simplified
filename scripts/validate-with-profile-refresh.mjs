#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const maxProfileRefreshAttempts = 3;

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
  for (let attempt = 0; attempt <= maxProfileRefreshAttempts; attempt += 1) {
    console.log(
      attempt
        ? "\nProfile-aware validation: validating data after profile refresh."
        : "Profile-aware validation: validating data."
    );
    const validation = await runNodeScript({
      allowFailure: true,
      capture: true,
      label: attempt ? "Validate data after profile refresh" : "Validate data",
      script: "scripts/validate-data.mjs"
    });

    if (validation.code === 0) {
      return;
    }

    if (!validationNeedsCurrentProfiles(validation.output)) {
      throw new Error("Validation failed for a non-profile reason. Fix the reported data issue before continuing.");
    }

    if (attempt === maxProfileRefreshAttempts) {
      throw new Error(
        `Validation still needs current player profiles after ${maxProfileRefreshAttempts} profile refresh attempts.`
      );
    }

    console.log(
      `\nValidation found missing or stale current player profiles. Regenerating profile cards (${attempt + 1}/${maxProfileRefreshAttempts}).`
    );
    await runNodeScript({
      args: getProfileRefreshArgs(validation.output),
      label: "Regenerate player profiles",
      script: "scripts/populate-player-profiles.mjs"
    });
  }
}

main().catch((error) => {
  console.error(`\nProfile-aware validation failed: ${error.message}`);
  process.exit(1);
});
