#!/usr/bin/env node
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lifecyclePath = process.env.TOURNAMENT_LIFECYCLE_FILE
  ? path.resolve(process.env.TOURNAMENT_LIFECYCLE_FILE)
  : path.join(root, "data", "edition-lifecycle.json");

function validDate(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? null : date;
}

export function evaluateEditionLifecycle(lifecycle, nowValue = Date.now()) {
  const now = validDate(nowValue);
  const startsAt = validDate(lifecycle?.tournamentStartsAt);
  const endsAt = validDate(lifecycle?.liveSyncEndsAt);
  const archiveEligibleAfter = validDate(lifecycle?.archiveEligibleAfter);
  const edition = Number(lifecycle?.edition);

  if (!Number.isInteger(edition) || edition < 1930) {
    throw new Error("Edition lifecycle must include a valid edition year.");
  }
  if (!now || !startsAt || !endsAt || !archiveEligibleAfter) {
    throw new Error(`Edition ${edition} lifecycle must include valid live-sync and archive timestamps.`);
  }
  if (startsAt >= endsAt) {
    throw new Error(`Edition ${edition} live-sync window must end after it starts.`);
  }
  if (archiveEligibleAfter < endsAt) {
    throw new Error(`Edition ${edition} cannot become archive-eligible before live synchronization closes.`);
  }
  if (!["live", "review", "archived"].includes(lifecycle?.state)) {
    throw new Error(`Edition ${edition} lifecycle state must be live, review, or archived.`);
  }

  return {
    active: lifecycle.state === "live" && now >= startsAt && now < endsAt,
    archiveEligible: now >= archiveEligibleAfter,
    edition,
    endsAt,
    now,
    startsAt,
    state: lifecycle.state
  };
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || "")) {
  const lifecycle = JSON.parse(await readFile(lifecyclePath, "utf8"));
  const result = evaluateEditionLifecycle(
    lifecycle,
    process.env.TOURNAMENT_LIFECYCLE_NOW || Date.now()
  );
  console.log(
    result.active
      ? `${result.edition} live-sync lifecycle is open until ${result.endsAt.toISOString()}.`
      : `${result.edition} live-sync lifecycle is closed (state ${result.state}, checked ${result.now.toISOString()}).`
  );

  if (process.argv.includes("--github-output")) {
    if (!process.env.GITHUB_OUTPUT) {
      throw new Error("GITHUB_OUTPUT is required with --github-output.");
    }
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `active=${result.active ? "true" : "false"}\nedition=${result.edition}\nstate=${result.state}\n`
    );
  }

  if (process.argv.includes("--require-active") && !result.active) {
    process.exitCode = 1;
  }
}
