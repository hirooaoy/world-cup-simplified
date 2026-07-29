#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  manifestPath,
  readManifest,
  renderCsvCell
} from "./historical-card-editorial-manifest-lib.mjs";

const getArgValue = (name) => {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || "";
};

const outDir = getArgValue("out-dir") || "/private/tmp/worldcup-writing-review-2026-07-29";
const baseName = "historical-player-card-editorial-manifest-review";
const manifest = await readManifest();
await mkdir(outDir, { recursive: true });

const entries = [...(manifest.entries || [])].sort((left, right) =>
  Number(left.tournamentYear || 0) - Number(right.tournamentYear || 0) ||
  String(left.team || "").localeCompare(String(right.team || "")) ||
  String(left.player || "").localeCompare(String(right.player || ""))
);

const htmlEscape = (value) => String(value ?? "")
  .replace(/&/gu, "&amp;")
  .replace(/</gu, "&lt;")
  .replace(/>/gu, "&gt;")
  .replace(/"/gu, "&quot;");

const summary = {
  total: entries.length,
  rewritten: entries.filter((entry) => entry.status === "rewritten").length,
  retained: entries.filter((entry) => entry.status === "reviewed-retained").length,
  blocked: entries.filter((entry) => entry.status === "blocked").length,
  recurring: entries.filter((entry) => entry.riskFlags?.recurringPlayer).length,
  limited: entries.filter((entry) => entry.riskFlags?.limitedMinutes || entry.riskFlags?.noAppearance).length,
  injury: entries.filter((entry) => entry.riskFlags?.injury).length
};

const htmlRows = entries.map((entry) => `
  <article class="card status-${htmlEscape(entry.status)}">
    <header>
      <h2>${htmlEscape(entry.player)} <span>${htmlEscape(entry.team)} ${htmlEscape(entry.tournamentYear)}</span></h2>
      <p>${htmlEscape(entry.position)} · ${htmlEscape(entry.evidenceLevel)} · ${htmlEscape(entry.confidence)} · ${htmlEscape(entry.status)}</p>
    </header>
    <section class="grid">
      <div><h3>Before English</h3><p>${htmlEscape(entry.oldEnglish)}</p></div>
      <div><h3>Final English</h3><p>${htmlEscape(entry.finalEnglish)}</p></div>
      <div><h3>Before Chinese</h3><p lang="zh">${htmlEscape(entry.oldChinese)}</p></div>
      <div><h3>Final Chinese</h3><p lang="zh">${htmlEscape(entry.finalChinese)}</p></div>
    </section>
    <footer>
      <p><strong>Rationale:</strong> ${htmlEscape(entry.rationale)}</p>
      <p><strong>Fields:</strong> ${htmlEscape((entry.factualFieldsUsed || []).join(", "))}</p>
      <p><strong>Flags:</strong> ${htmlEscape(Object.entries(entry.riskFlags || {}).filter(([, value]) => value).map(([key]) => key).join(", ") || "none")}</p>
    </footer>
  </article>
`).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Historical Player-Card Editorial Manifest Review</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #17202a; background: #f7f8fa; }
    main { max-width: 1180px; margin: 0 auto; padding: 32px 20px 56px; }
    h1 { margin: 0 0 12px; font-size: 28px; }
    .summary { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 28px; }
    .summary span { border: 1px solid #d8dee7; background: #fff; border-radius: 6px; padding: 6px 10px; font-size: 13px; }
    .card { background: #fff; border: 1px solid #d8dee7; border-radius: 8px; margin: 0 0 16px; padding: 18px; }
    .card h2 { margin: 0; font-size: 20px; }
    .card h2 span { color: #526070; font-weight: 500; }
    .card header p, .card footer p { color: #526070; margin: 6px 0; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 14px 0; }
    .grid div { border: 1px solid #e2e7ef; border-radius: 6px; padding: 12px; background: #fbfcfe; }
    h3 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: #526070; }
    p { line-height: 1.5; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <h1>Historical Player-Card Editorial Manifest Review</h1>
    <p>Generated from ${htmlEscape(manifestPath)}.</p>
    <div class="summary">
      ${Object.entries(summary).map(([key, value]) => `<span>${htmlEscape(key)}: ${htmlEscape(value)}</span>`).join("\n")}
    </div>
    ${htmlRows}
  </main>
</body>
</html>
`;

const md = [
  "# Historical Player-Card Editorial Manifest Review",
  "",
  `Manifest: ${manifestPath}`,
  "",
  ...Object.entries(summary).map(([key, value]) => `- ${key}: ${value}`),
  "",
  ...entries.flatMap((entry) => [
    `## ${entry.player} / ${entry.team} / ${entry.tournamentYear}`,
    "",
    `Status: ${entry.status}`,
    `Position: ${entry.position}`,
    `Evidence: ${entry.evidenceLevel} / ${entry.confidence}`,
    `Flags: ${Object.entries(entry.riskFlags || {}).filter(([, value]) => value).map(([key]) => key).join(", ") || "none"}`,
    "",
    `Before EN: ${entry.oldEnglish}`,
    "",
    `Final EN: ${entry.finalEnglish}`,
    "",
    `Before ZH: ${entry.oldChinese}`,
    "",
    `Final ZH: ${entry.finalChinese}`,
    "",
    `Rationale: ${entry.rationale}`,
    "",
    `Fields: ${(entry.factualFieldsUsed || []).join(", ")}`,
    ""
  ])
].join("\n");

const csvHeaders = [
  "cardId",
  "player",
  "team",
  "tournamentYear",
  "position",
  "evidenceLevel",
  "confidence",
  "status",
  "oldEnglish",
  "finalEnglish",
  "oldChinese",
  "finalChinese",
  "rationale",
  "factualFieldsUsed",
  "riskFlags",
  "reviewedAt"
];
const csv = [
  csvHeaders.map(renderCsvCell).join(","),
  ...entries.map((entry) => csvHeaders.map((header) => {
    if (header === "factualFieldsUsed") return renderCsvCell((entry.factualFieldsUsed || []).join("; "));
    if (header === "riskFlags") {
      return renderCsvCell(Object.entries(entry.riskFlags || {}).filter(([, value]) => value).map(([key]) => key).join("; "));
    }
    return renderCsvCell(entry[header]);
  }).join(","))
].join("\n");

const htmlPath = path.join(outDir, `${baseName}.html`);
const mdPath = path.join(outDir, `${baseName}.md`);
const csvPath = path.join(outDir, `${baseName}.csv`);
await Promise.all([
  writeFile(htmlPath, html),
  writeFile(mdPath, md),
  writeFile(csvPath, `${csv}\n`)
]);

console.log("Built historical player-card editorial review artifacts.");
console.log(`HTML: ${htmlPath}`);
console.log(`Markdown: ${mdPath}`);
console.log(`CSV: ${csvPath}`);
