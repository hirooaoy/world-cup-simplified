#!/usr/bin/env node
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lifecycle = JSON.parse(await readFile(path.join(root, "data", "edition-lifecycle.json"), "utf8"));
const now = new Date(process.env.TOURNAMENT_LIFECYCLE_NOW || Date.now());
const startsAt = new Date(lifecycle.tournamentStartsAt || "");
const endsAt = new Date(lifecycle.liveSyncEndsAt || "");

if (
  lifecycle.edition !== 2026 ||
  Number.isNaN(now.getTime()) ||
  Number.isNaN(startsAt.getTime()) ||
  Number.isNaN(endsAt.getTime())
) {
  throw new Error("Edition lifecycle must identify 2026 and include valid live-sync timestamps.");
}

const active = lifecycle.state === "live" && now >= startsAt && now <= endsAt;
console.log(
  active
    ? `2026 live-sync lifecycle is open until ${endsAt.toISOString()}.`
    : `2026 live-sync lifecycle is closed (state ${lifecycle.state}, checked ${now.toISOString()}).`
);

if (process.argv.includes("--github-output")) {
  if (!process.env.GITHUB_OUTPUT) {
    throw new Error("GITHUB_OUTPUT is required with --github-output.");
  }
  await appendFile(process.env.GITHUB_OUTPUT, `active=${active ? "true" : "false"}\n`);
}

if (process.argv.includes("--require-active") && !active) {
  process.exitCode = 1;
}
