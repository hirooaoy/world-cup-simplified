#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const RELEASE_NOTES_PATH = "data/release-notes.json";
const ZERO_SHA = /^0+$/;
const PRODUCT_PATH_PATTERNS = [
  /^api\/.+\.js$/,
  /^app\.js$/,
  /^index\.html$/,
  /^report\.html$/,
  /^report\.js$/,
  /^styles\.css$/,
  /^assets\//
];

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...valueParts] = arg.replace(/^--/, "").split("=");
    return [key, valueParts.length ? valueParts.join("=") : "true"];
  })
);

function git(argsList, options = {}) {
  try {
    return execFileSync("git", argsList, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", options.allowFailure ? "ignore" : "pipe"]
    }).trim();
  } catch (error) {
    if (options.allowFailure) {
      return "";
    }

    throw error;
  }
}

function isUsableRef(ref) {
  return Boolean(ref && !ZERO_SHA.test(ref));
}

function getGithubEventBase() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    return null;
  }

  let event;
  try {
    event = JSON.parse(readFileSync(eventPath, "utf8"));
  } catch {
    return null;
  }

  if (isUsableRef(event?.pull_request?.base?.sha)) {
    return { mode: "merge-base", ref: event.pull_request.base.sha };
  }

  if (isUsableRef(event?.before)) {
    return { mode: "range", ref: event.before };
  }

  return null;
}

function getFallbackBase() {
  const explicitBase = args.get("base") || process.env.RELEASE_NOTES_BASE_REF;
  if (isUsableRef(explicitBase)) {
    return { mode: args.get("mode") === "merge-base" ? "merge-base" : "range", ref: explicitBase };
  }

  const eventBase = getGithubEventBase();
  if (eventBase) {
    return eventBase;
  }

  const previousCommit = git(["rev-parse", "--verify", "HEAD~1"], { allowFailure: true });
  return isUsableRef(previousCommit) ? { mode: "range", ref: previousCommit } : null;
}

function getRangeFiles(base) {
  if (!base) {
    return [];
  }

  const range = base.mode === "merge-base" ? `${base.ref}...HEAD` : `${base.ref}..HEAD`;
  return git(["diff", "--name-only", range], { allowFailure: true })
    .split(/\r?\n/)
    .filter(Boolean);
}

function getWorkingTreeFiles() {
  return [
    ...git(["diff", "--name-only"], { allowFailure: true }).split(/\r?\n/),
    ...git(["diff", "--name-only", "--cached"], { allowFailure: true }).split(/\r?\n/)
  ].filter(Boolean);
}

function isProductPath(filePath) {
  return PRODUCT_PATH_PATTERNS.some((pattern) => pattern.test(filePath));
}

function formatFiles(files) {
  return files.map((file) => `- ${file}`).join("\n");
}

function main() {
  const base = getFallbackBase();
  const includeWorkingTree =
    args.has("include-working-tree") || process.env.RELEASE_NOTES_INCLUDE_WORKING_TREE === "1";
  const warnOnly = args.has("warn-only") || process.env.RELEASE_NOTES_WARN_ONLY === "1";
  const changedFiles = new Set(getRangeFiles(base));

  if (includeWorkingTree) {
    for (const file of getWorkingTreeFiles()) {
      changedFiles.add(file);
    }
  }

  if (!changedFiles.size) {
    console.log("Release-note check skipped: no changed files found.");
    return;
  }

  const changed = [...changedFiles].sort();
  const productFiles = changed.filter((file) => file !== RELEASE_NOTES_PATH && isProductPath(file));
  const releaseNotesChanged = changed.includes(RELEASE_NOTES_PATH);

  if (!productFiles.length) {
    console.log("Release-note check passed: no app/API/UI files changed.");
    return;
  }

  if (releaseNotesChanged) {
    console.log("Release-note check passed: product changes include a release-note update.");
    return;
  }

  const message = [
    "Release-note check failed: app/API/UI files changed without data/release-notes.json.",
    "",
    "Changed product files:",
    formatFiles(productFiles),
    "",
    "Add a concise release note, or rerun with RELEASE_NOTES_WARN_ONLY=1 only for intentional exceptions."
  ].join("\n");

  if (warnOnly) {
    console.warn(message);
    return;
  }

  console.error(message);
  process.exit(1);
}

main();
