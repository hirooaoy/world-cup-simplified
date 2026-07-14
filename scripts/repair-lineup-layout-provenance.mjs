#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLayoutOverrideProvenanceIssues } from "./lineup-layout-overrides.mjs";
import { DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE } from "./lineup-layout-sources.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const write = process.argv.includes("--write");
const checkedAt = new Date().toISOString();

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function signatureKey(source) {
  const home = String(source?.signature?.home || "").trim();
  const away = String(source?.signature?.away || "").trim();
  return home || away ? `${home}::${away}` : "";
}

function matchedSources(override) {
  return (override.sources || []).filter((source) => source?.status === "matched");
}

function hasConflict(override) {
  const signatures = new Set(matchedSources(override).map(signatureKey).filter(Boolean));
  return signatures.size > 1 || /row-order disagreement/i.test(override.note || "");
}

function honestVerifiedNote(override) {
  const names = [...new Set(
    matchedSources(override)
      .filter((source) => source.exactLayout === true)
      .map((source) => String(source.name || "").trim())
      .filter(Boolean)
  )];
  if (names.length > 1) {
    return `FIFA official team sheet kept for facts; ${names.join(" and ")} agreed on the tactical layout.`;
  }
  return `FIFA official team sheet kept for facts; ${names[0] || "the stored public board source"} supplied exact board geometry.`;
}

function summarizedSources(sources) {
  return (sources || []).map((source) => ({
    name: source.name,
    url: source.url,
    status: source.status,
    ...(source.sourceDetail ? { sourceDetail: source.sourceDetail } : {}),
    ...(source.exactLayout !== undefined ? { exactLayout: source.exactLayout } : {}),
    ...(source.note ? { note: source.note } : {})
  }));
}

const [overridesData, lineupsData] = await Promise.all([
  readJson("data/lineup-layout-overrides.json"),
  readJson("data/lineups.json")
]);

let correctedNotes = 0;
let downgradedConflicts = 0;

for (const [fixtureId, override] of Object.entries(overridesData.fixtures || {})) {
  if (override?.status !== "verified") {
    continue;
  }

  const lineup = lineupsData.lineups?.[fixtureId];
  if (hasConflict(override)) {
    override.status = "unresolved";
    override.unresolvedReason = "conflict";
    delete override.layoutSource;
    override.sources = (override.sources || []).map((source) =>
      source?.status === "matched" ? { ...source, status: "conflict" } : source
    );
    override.note = "Trusted public boards disagreed on tactical row order; stored pitch placement remains provisional.";

    if (lineup) {
      lineup.layoutSource = DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE;
      lineup.layoutVerification = {
        status: "unverified",
        source: DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE,
        exact: false,
        checkedAt: override.checkedAt,
        sourceIds: override.sourceIds || [],
        sources: summarizedSources(override.sources),
        unresolvedReason: "conflict",
        note: override.note
      };
    }
    downgradedConflicts += 1;
    continue;
  }

  const note = honestVerifiedNote(override);
  if (override.note !== note) {
    override.note = note;
    if (lineup?.layoutVerification?.status === "verified") {
      lineup.layoutVerification.note = note;
      lineup.layoutVerification.sources = summarizedSources(override.sources);
    }
    correctedNotes += 1;
  }
}

const remainingIssues = [];
for (const [fixtureId, override] of Object.entries(overridesData.fixtures || {})) {
  for (const issue of getLayoutOverrideProvenanceIssues(override)) {
    remainingIssues.push(`${fixtureId}: ${issue}`);
  }
}
if (remainingIssues.length) {
  throw new Error(`Layout provenance repair left ${remainingIssues.length} issue(s):\n${remainingIssues.join("\n")}`);
}

console.log(
  `Layout provenance repair: ${correctedNotes} note${correctedNotes === 1 ? "" : "s"} corrected; ` +
  `${downgradedConflicts} conflicting layout${downgradedConflicts === 1 ? "" : "s"} marked provisional.`
);

if (write) {
  overridesData.updatedAt = checkedAt;
  lineupsData.updatedAt = checkedAt;
  await Promise.all([
    writeFile(
      path.join(root, "data/lineup-layout-overrides.json"),
      `${JSON.stringify(overridesData, null, 2)}\n`
    ),
    writeFile(
      path.join(root, "data/lineups.json"),
      `${JSON.stringify(lineupsData, null, 2)}\n`
    )
  ]);
} else {
  console.log("Dry run only; pass --write to update the stored artifacts.");
}
