#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HISTORICAL_HIGHLIGHTS } from "../data/highlights-history.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const historyPath = path.join(root, "data/history.json");
const profilesPath = path.join(root, "data/historical-player-profiles.json");
const archiveCalendarPath = path.join(root, "data/archive-calendar.json");
const titleHistoryPath = path.join(root, "data/world-cup-title-history.json");
const historyOutDir = path.join(root, "data/history");
const profilesOutDir = path.join(root, "data/historical-player-profiles");

function byYear(value) {
  return Number(value) || 0;
}

function profileBelongsToYear(profile, year) {
  const tournamentYear = Number(profile?.tournamentYear);
  if (tournamentYear === year) {
    return true;
  }

  return Array.isArray(profile?.tournamentYears) &&
    profile.tournamentYears.some((candidate) => Number(candidate) === year);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

const [historyData, profileData] = await Promise.all([
  readJson(historyPath),
  readJson(profilesPath)
]);

const years = [
  ...new Set([
    ...(historyData.tournaments || []).map((edition) => Number(edition.year)).filter(Boolean),
    ...(historyData.fixtures || []).map((fixture) => Number(fixture.tournamentYear)).filter(Boolean)
  ])
].sort((a, b) => a - b);
const dayCounts = {};
for (const fixture of historyData.fixtures || []) {
  const dayKey = String(fixture.date || "").trim();
  if (!dayKey) {
    continue;
  }
  dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
}

await Promise.all([
  mkdir(historyOutDir, { recursive: true }),
  mkdir(profilesOutDir, { recursive: true })
]);

await writeJson(archiveCalendarPath, {
  updatedAt: historyData.updatedAt,
  coverage: {
    editionYears: years,
    dayCount: Object.keys(dayCounts).length,
    fixtureCount: Object.values(dayCounts).reduce((sum, count) => sum + count, 0)
  },
  days: Object.fromEntries(Object.entries(dayCounts).sort(([a], [b]) => a.localeCompare(b)))
});

await writeJson(titleHistoryPath, {
  updatedAt: historyData.updatedAt,
  titles: Object.entries(HISTORICAL_HIGHLIGHTS.editions)
    .map(([year, edition]) => ({
      year: Number(year),
      winner: edition.champion
    }))
    .filter((entry) => Number.isInteger(entry.year) && entry.winner)
    .sort((a, b) => a.year - b.year)
});

for (const year of years) {
  const nextYear = years.find((candidate) => candidate > year) || null;
  const includedHistoryYears = new Set([year, nextYear].filter(Boolean));
  const tournaments = (historyData.tournaments || [])
    .filter((edition) => includedHistoryYears.has(Number(edition.year)))
    .sort((a, b) => byYear(a.year) - byYear(b.year));
  const fixtures = (historyData.fixtures || [])
    .filter((fixture) => includedHistoryYears.has(Number(fixture.tournamentYear)))
    .sort((a, b) => String(a.sortKey || a.date || "").localeCompare(String(b.sortKey || b.date || "")));
  const profiles = Object.fromEntries(
    Object.entries(profileData.profiles || {})
      .filter(([, profile]) => profileBelongsToYear(profile, year))
      .sort(([a], [b]) => a.localeCompare(b))
  );

  await Promise.all([
    writeJson(path.join(historyOutDir, `${year}.json`), {
      updatedAt: historyData.updatedAt,
      sourceIds: historyData.sourceIds || [],
      coverage: {
        ...(historyData.coverage || {}),
        editionYear: year,
        tournamentCount: tournaments.length,
        fixtureCount: fixtures.length
      },
      source: historyData.source || null,
      tournaments,
      fixtures,
      keyInformationGeneration: historyData.keyInformationGeneration || null
    }),
    writeJson(path.join(profilesOutDir, `${year}.json`), {
      updatedAt: profileData.updatedAt,
      sourceIds: profileData.sourceIds || [],
      coverage: {
        ...(profileData.coverage || {}),
        editionYear: year,
        profileCount: Object.keys(profiles).length
      },
      profiles,
      sources: profileData.sources || []
    })
  ]);
}

console.log(`Built historical edition payloads for ${years.length} editions.`);
