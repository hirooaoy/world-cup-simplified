#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localeSmokePath = path.join(root, "scripts", "smoke-locales.mjs");

for (const locale of ["en", "zh", "es", "ko"]) {
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [localeSmokePath, "--highlights-club-lines-only", `--locale=${locale}`],
      { cwd: root, stdio: "inherit" }
    );
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(
        `${locale} player club-line smoke failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}.`
      ));
    });
  });
}

console.log("Four-locale main app, awards, and Best XI club-line smoke tests passed.");
