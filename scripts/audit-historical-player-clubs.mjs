#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatPlayerCardWorldCupContext,
  getPlayerCardWorldCupReferenceDate
} from "../player-card-ui.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const historicalData = JSON.parse(
  await readFile(path.join(root, "data", "historical-player-profiles.json"), "utf8")
);
const currentData = JSON.parse(
  await readFile(path.join(root, "data", "player-profiles.json"), "utf8")
);
const profiles = historicalData.profiles || {};

assert.ok(Object.keys(profiles).length > 0, "Historical player profiles must not be empty");
assert.equal(
  historicalData.coverage?.clubProfileCount,
  Object.keys(profiles).length,
  "Historical club coverage count must match the profile count"
);

for (const [profileKey, profile] of Object.entries(profiles)) {
  assert.ok(String(profile.club || "").trim(), `${profileKey}: missing tournament-time club`);
  assert.equal(profile.clubAtTournament, profile.club, `${profileKey}: card club must be tournament-time club`);
  assert.ok(profile.clubAtTournamentSource, `${profileKey}: missing tournament-time club source`);
  assert.match(
    String(profile.clubAtTournamentSourceUrl || ""),
    /^https:\/\//,
    `${profileKey}: missing tournament-time club source URL`
  );
  assert.doesNotMatch(
    `${profile.club} ${profile.clubAtTournament}`,
    /World Cup archive/i,
    `${profileKey}: archive label must not be used as a club`
  );
}

const expectedHistoricalClubs = new Map([
  ["Jorge Góngora / Peru / 1930", "Universitario"],
  ["Nils Liedholm / Sweden / 1950", "AC Milan"],
  ["Garrincha / Brazil / 1958", "Botafogo"],
  ["Franz Beckenbauer / West Germany / 1974", "Bayern Munich"],
  ["Gary Stevens / England / 1986", "Everton"],
  ["Nam-chol Pak / North Korea / 2010", "April 25"],
  ["Kylian Mbappé / France / 2018", "Paris Saint-Germain"],
  ["Kylian Mbappé / France / 2022", "Paris Saint-Germain"],
  ["Yassine Bounou / Morocco / 2022", "Sevilla"]
]);
for (const [profileKey, club] of expectedHistoricalClubs) {
  assert.equal(profiles[profileKey]?.club, club, `${profileKey}: unexpected tournament-time club`);
}
assert.equal(
  currentData.profiles?.["Kylian Mbappe"]?.club,
  "Real Madrid",
  "The 2026 card must retain Mbappé's 2026 club rather than a historical edition's club"
);

assert.equal(getPlayerCardWorldCupReferenceDate(2022), "2022-12-18");
assert.equal(getPlayerCardWorldCupReferenceDate(2026), "2026-07-19");
assert.equal(formatPlayerCardWorldCupContext({ year: 2026, language: "en" }), "At the 2026 World Cup");
assert.equal(formatPlayerCardWorldCupContext({ year: 2026, language: "es" }), "En el Mundial de 2026");
assert.equal(formatPlayerCardWorldCupContext({ year: 2026, language: "zh" }), "2026年世界杯期间");
assert.equal(formatPlayerCardWorldCupContext({ year: 2026, language: "ko" }), "2026년 월드컵 당시");

for (const relativePath of ["app.js", "highlights.js", "data/highlights-history.js"]) {
  const source = await readFile(path.join(root, relativePath), "utf8");
  assert.doesNotMatch(
    source,
    /club:\s*["'`][^"'`\n]*World Cup archive/iu,
    `${relativePath}: hard-coded archive label must not be used as a club`
  );
}

console.log(`Historical player club audit passed: ${Object.keys(profiles).length} tournament-time clubs.`);
