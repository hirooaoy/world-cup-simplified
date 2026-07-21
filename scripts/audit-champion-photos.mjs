import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { CHAMPION_PHOTOS } from "../data/champion-photos.js";
import { HISTORICAL_HIGHLIGHTS } from "../data/highlights-history.js";

const coveragePath = new URL("../data/champion-photo-coverage.json", import.meta.url);
const coverage = JSON.parse(await readFile(coveragePath, "utf8"));
const expectedEditions = [
  ...Object.entries(HISTORICAL_HIGHLIGHTS.editions).map(([year, edition]) => ({
    year: Number(year),
    champion: edition.champion
  })),
  { year: 2026, champion: "Spain" }
];
const errors = [];

if (coverage.schemaVersion !== 1) {
  errors.push(`Unsupported coverage schema: ${coverage.schemaVersion}`);
}

if (coverage.editions.length !== expectedEditions.length) {
  errors.push(`Coverage has ${coverage.editions.length} editions; expected ${expectedEditions.length}`);
}

const coverageByYear = new Map();
for (const entry of coverage.editions) {
  if (coverageByYear.has(entry.year)) {
    errors.push(`Duplicate coverage entry for ${entry.year}`);
  }
  coverageByYear.set(entry.year, entry);
}

for (const expected of expectedEditions) {
  const entry = coverageByYear.get(expected.year);
  if (!entry) {
    errors.push(`Missing coverage entry for ${expected.year}`);
    continue;
  }
  if (entry.champion !== expected.champion) {
    errors.push(`${expected.year} champion is ${entry.champion}; expected ${expected.champion}`);
  }
  if (!["photo", "illustration"].includes(entry.status)) {
    errors.push(`${expected.year} has invalid status ${entry.status}`);
  }

  const photo = CHAMPION_PHOTOS[expected.year];
  if ((entry.status === "photo") !== Boolean(photo)) {
    errors.push(`${expected.year} coverage status does not match the photo manifest`);
  }
  if (!photo) continue;

  if (photo.champion !== expected.champion) {
    errors.push(`${expected.year} photo champion is ${photo.champion}; expected ${expected.champion}`);
  }
  for (const language of ["en", "es", "ko", "zh"]) {
    if (!photo.alt?.[language]?.trim()) {
      errors.push(`${expected.year} is missing ${language} alt text`);
    }
  }
  for (const field of ["author", "license", "licenseUrl", "sourceUrl", "jpg", "avif"]) {
    if (!photo[field]?.trim()) {
      errors.push(`${expected.year} is missing ${field}`);
    }
  }

  for (const field of ["jpg", "avif"]) {
    const relativePath = photo[field].split("?")[0];
    const assetPath = fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
    try {
      const asset = await stat(assetPath);
      if (!asset.isFile() || asset.size === 0) {
        errors.push(`${expected.year} ${field} asset is empty`);
      }
    } catch {
      errors.push(`${expected.year} ${field} asset does not exist: ${relativePath}`);
    }
  }
}

for (const year of Object.keys(CHAMPION_PHOTOS).map(Number)) {
  if (!coverageByYear.has(year)) {
    errors.push(`Photo manifest has unaudited edition ${year}`);
  }
}

if (errors.length) {
  console.error(`Champion photo audit failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const photoCount = coverage.editions.filter((entry) => entry.status === "photo").length;
  console.log(`Champion photo audit passed: ${coverage.editions.length} editions reviewed, ${photoCount} photos, ${coverage.editions.length - photoCount} illustration fallbacks.`);
}
