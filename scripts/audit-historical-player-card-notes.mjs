#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profilesPath = path.join(root, "data", "historical-player-profiles.json");
const args = process.argv.slice(2);

const forbiddenPhrases = [
  {
    pattern: /\barchive lens\b/i,
    message: "archive lens sounds like internal generation language"
  },
  {
    pattern: /\bmatch lens\b/i,
    message: "match lens sounds like internal generation language"
  },
  {
    pattern: /\bsquad-context\b/i,
    message: "squad-context sounds like internal generation language"
  },
  {
    pattern: /\bsupporting a scoring route\b/i,
    message: "supporting a scoring route is too formulaic"
  },
  {
    pattern: /\bMatchday\s+\d+\b/i,
    message: "hide source matchday labels from reader-facing archive cards"
  }
];

function getArgValue(name) {
  const flag = `--${name}=`;
  const arg = args.find((item) => item.startsWith(flag));
  return arg ? arg.slice(flag.length) : "";
}

function parseYears(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((year) => Number.isInteger(year));
}

function countSentences(note) {
  const matches = String(note || "").match(/[.!?。！？]+/g);
  return matches ? matches.length : 0;
}

function addIssue(issues, profileKey, kind, message) {
  issues.push({ profileKey, kind, message });
}

const profilesData = JSON.parse(await readFile(profilesPath, "utf8"));
const requestedYears = parseYears(getArgValue("years"));
const years = new Set(
  requestedYears.length
    ? requestedYears
    : [
        ...new Set(
          Object.values(profilesData.profiles || {})
            .map((profile) => Number(profile.tournamentYear))
            .filter((year) => Number.isInteger(year))
        )
      ]
);
const issues = [];
let checked = 0;

for (const [profileKey, profile] of Object.entries(profilesData.profiles || {})) {
  if (!years.has(Number(profile.tournamentYear))) continue;
  checked += 1;

  const styleNote = String(profile.styleNote || "").trim();
  const styleNoteZh = String(profile.styleNoteZh || "").trim();
  const note = String(profile.note || "").trim();
  const noteZh = String(profile.noteZh || "").trim();

  if (!styleNote) {
    addIssue(issues, profileKey, "missing-style-note", "historical profile has no visible styleNote");
    continue;
  }
  if (!styleNoteZh) {
    addIssue(issues, profileKey, "missing-style-note-zh", "historical profile has no Chinese styleNoteZh");
  }
  if (!note) {
    addIssue(issues, profileKey, "missing-note", "historical profile has no fallback note");
  }
  if (!noteZh) {
    addIssue(issues, profileKey, "missing-note-zh", "historical profile has no Chinese noteZh");
  }
  if (/[;]/.test(styleNote)) {
    addIssue(issues, profileKey, "punctuation", "avoid semicolons in historical player-card styleNote");
  }
  if (/[\u2013\u2014]/.test(styleNote)) {
    addIssue(issues, profileKey, "punctuation", "avoid en dash and em dash sentence structure");
  }
  if (countSentences(styleNote) > 3) {
    addIssue(issues, profileKey, "length", "styleNote has more than 3 sentences");
  }
  if (styleNote.length > 260) {
    addIssue(issues, profileKey, "length", `styleNote is ${styleNote.length} characters`);
  }
  if (styleNoteZh && countSentences(styleNoteZh) > 3) {
    addIssue(issues, profileKey, "length", "styleNoteZh has more than 3 sentences");
  }
  if (styleNoteZh.length > 160) {
    addIssue(issues, profileKey, "length", `styleNoteZh is ${styleNoteZh.length} characters`);
  }
  if (/[A-Za-z]/.test(styleNoteZh)) {
    addIssue(issues, profileKey, "latin-leak", "Chinese styleNoteZh contains Latin letters");
  }
  if (/[A-Za-z]/.test(noteZh)) {
    addIssue(issues, profileKey, "latin-leak", "Chinese noteZh contains Latin letters");
  }

  for (const check of forbiddenPhrases) {
    if (check.pattern.test(styleNote)) {
      addIssue(issues, profileKey, "generic-voice", check.message);
    }
  }
}

if (issues.length) {
  console.error(`Historical player-card note audit found ${issues.length} issue${issues.length === 1 ? "" : "s"}:`);
  for (const issue of issues.slice(0, 80)) {
    console.error(`- ${issue.profileKey}: ${issue.kind}: ${issue.message}`);
  }
  if (issues.length > 80) {
    console.error(`...and ${issues.length - 80} more`);
  }
  process.exit(1);
}

console.log(`Historical player-card note audit: ${checked} profiles checked for ${[...years].sort((a, b) => b - a).join(", ")}.`);
console.log("No historical player-card note issues found.");
