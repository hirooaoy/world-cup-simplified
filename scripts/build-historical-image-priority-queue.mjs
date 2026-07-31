#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(root, "data", "editorial", "historical-image-priority-queue.json");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function normalizeName(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function addSignal(record, label, points) {
  record.score += points;
  record.signals.push(label);
}

function indexKey(name, team, year) {
  return `${normalizeName(name)}|${normalizeName(team)}|${Number(year)}`;
}

function nameYearKey(name, year) {
  return `${normalizeName(name)}|${Number(year)}`;
}

function includesNormalizedName(haystack, needle) {
  if (!haystack || !needle) return false;
  return new RegExp(`(^| )${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`).test(haystack);
}

const profilesData = readJson("data/historical-player-profiles.json");
const historyData = readJson("data/history.json");
const worldCupAwardsData = readJson("data/world-cup-awards.json");
const historicalAwardsData = readJson("data/historical-awards.json");
const historicalIndexData = readJson("data/ball-boy-historical-players.json");
const manifestData = readJson("data/editorial/historical-player-card-review-manifest.json");

const profiles = Object.values(profilesData.profiles || {});
const missingProfiles = profiles.filter((profile) => !profile.imageUrl);
const recordsByProfileKey = new Map(
  missingProfiles.map((profile) => [
    profile.profileKey,
    {
      profileKey: profile.profileKey,
      player: profile.displayName || profile.name,
      team: profile.teamName,
      tournamentYear: profile.tournamentYear,
      position: profile.position || null,
      club: profile.clubAtTournament || profile.club || null,
      goals: Number(profile.goals || 0),
      scorerMatchCount: Number(profile.scorerMatchCount || 0),
      keyMatchCount: Number(profile.keyMatchCount || 0),
      score: 0,
      signals: [],
      reviewState: "needs-manual-image-source-verification"
    }
  ])
);

const byExact = new Map();
const byNameYear = new Map();
for (const profile of missingProfiles) {
  byExact.set(indexKey(profile.displayName || profile.name, profile.teamName, profile.tournamentYear), profile.profileKey);
  const looseKey = nameYearKey(profile.displayName || profile.name, profile.tournamentYear);
  if (!byNameYear.has(looseKey)) byNameYear.set(looseKey, []);
  byNameYear.get(looseKey).push(profile.profileKey);
}

function applyToExact(name, team, year, label, points) {
  const profileKey = byExact.get(indexKey(name, team, year));
  if (profileKey && recordsByProfileKey.has(profileKey)) {
    addSignal(recordsByProfileKey.get(profileKey), label, points);
  }
}

function applyToNameYear(name, year, label, points) {
  for (const profileKey of byNameYear.get(nameYearKey(name, year)) || []) {
    if (recordsByProfileKey.has(profileKey)) addSignal(recordsByProfileKey.get(profileKey), label, points);
  }
}

for (const [year, edition] of Object.entries(worldCupAwardsData.editions || {})) {
  for (const [awardName, award] of Object.entries(edition || {})) {
    for (const recipient of award.recipients || []) {
      if (!recipient.playerName || !recipient.teamName) continue;
      applyToExact(recipient.playerName, recipient.teamName, year, `award:${awardName}`, 100);
    }
  }
}

for (const [year, edition] of Object.entries(historicalAwardsData.editions || {})) {
  for (const [awardName, award] of Object.entries(edition || {})) {
    for (const name of award.recipientNames || []) {
      applyToNameYear(name, year, `historical-awards:${awardName}`, 100);
    }
    const captainMeta = normalizeName(award.captainMeta || "");
    if (captainMeta) {
      for (const profile of missingProfiles.filter((item) => Number(item.tournamentYear) === Number(year))) {
        const name = normalizeName(profile.displayName || profile.name);
        if (includesNormalizedName(captainMeta, name)) {
          addSignal(recordsByProfileKey.get(profile.profileKey), `captain-meta:${awardName}`, 80);
        }
      }
    }
  }
}

for (const fixture of historyData.fixtures || []) {
  if (fixture.round !== "Final" && fixture.stage !== "Final") continue;
  const year = fixture.tournamentYear;
  for (const team of [fixture.homeSlot, fixture.awaySlot].filter(Boolean)) {
    for (const profile of missingProfiles.filter((item) => item.teamName === team && Number(item.tournamentYear) === Number(year))) {
      addSignal(recordsByProfileKey.get(profile.profileKey), "finalist-squad", 35);
    }
  }
  for (const goal of fixture.goalsHome || []) {
    applyToExact(goal.name, fixture.homeSlot, year, "final-scorer", 90);
  }
  for (const goal of fixture.goalsAway || []) {
    applyToExact(goal.name, fixture.awaySlot, year, "final-scorer", 90);
  }
}

for (const person of historicalIndexData.players || []) {
  const years = person.tournamentYears || [];
  if (years.length < 2) continue;
  for (const year of years) {
    applyToExact(person.displayName, person.teamName, year, "recurring-player", 25);
  }
}

for (const entry of manifestData.entries || []) {
  if (!entry?.factualFieldsUsed?.includes("bestXiSelection")) continue;
  const profileKey = `${entry.player} / ${entry.team} / ${entry.tournamentYear}`;
  if (recordsByProfileKey.has(profileKey)) addSignal(recordsByProfileKey.get(profileKey), "best-xi-selection", 120);
}

for (const record of recordsByProfileKey.values()) {
  if (record.goals > 0) addSignal(record, `goals:${record.goals}`, Math.min(record.goals * 10, 60));
  if (record.scorerMatchCount > 0) {
    addSignal(record, `scoring-matches:${record.scorerMatchCount}`, Math.min(record.scorerMatchCount * 8, 32));
  }
  if (record.keyMatchCount > 0) {
    addSignal(record, `featured-matches:${record.keyMatchCount}`, Math.min(record.keyMatchCount * 4, 20));
  }
  record.signals = [...new Set(record.signals)];
}

const ranked = [...recordsByProfileKey.values()].sort((left, right) => {
  if (right.score !== left.score) return right.score - left.score;
  if (right.goals !== left.goals) return right.goals - left.goals;
  if (right.keyMatchCount !== left.keyMatchCount) return right.keyMatchCount - left.keyMatchCount;
  return left.profileKey.localeCompare(right.profileKey);
});

const signalCounts = {};
for (const record of ranked) {
  for (const signal of record.signals) {
    const family = signal.split(":")[0];
    signalCounts[family] = (signalCounts[family] || 0) + 1;
  }
}

const output = {
  generatedAt: new Date().toISOString(),
  sourceProfileUpdatedAt: profilesData.updatedAt,
  coverage: {
    totalProfiles: profiles.length,
    withImages: profiles.length - missingProfiles.length,
    missingImages: missingProfiles.length
  },
  methodology: {
    purpose: "Rank remaining historical player image gaps for curated manual source review.",
    caution: "This file is a queue, not proof that an image exists or that an automated match is safe.",
    scoreWeights: {
      "best-xi-selection": 120,
      "award:*": 100,
      "historical-awards:*": 100,
      "final-scorer": 90,
      "captain-meta:*": 80,
      "goals": "10 each, capped at 60",
      "finalist-squad": 35,
      "scoring-matches": "8 each, capped at 32",
      "recurring-player": 25,
      "featured-matches": "4 each, capped at 20"
    }
  },
  signalCounts,
  recommendedNextBatchSize: 100,
  recommendedNextBatch: ranked.slice(0, 100),
  deferredMissingProfileCount: Math.max(0, ranked.length - 100)
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(
  `Historical image priority queue written: ${ranked.length} missing profiles, top ${output.recommendedNextBatch.length} recommended.`
);
