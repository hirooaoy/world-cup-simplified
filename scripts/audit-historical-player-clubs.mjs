#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatPlayerClubLine,
  formatPlayerCardWorldCupContext,
  getPlayerCardWorldCupReferenceDate
} from "../player-card-ui.js";
import {
  ZH_CLUB_NAME_TRANSLATIONS,
  ZH_LEAGUE_NAME_TRANSLATIONS
} from "../football-locale-zh.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const historicalData = JSON.parse(
  await readFile(path.join(root, "data", "historical-player-profiles.json"), "utf8")
);
const currentData = JSON.parse(
  await readFile(path.join(root, "data", "player-profiles.json"), "utf8")
);
const structuredGlossary = JSON.parse(
  await readFile(path.join(root, "data", "locales", "structured-content-glossary.json"), "utf8")
);
const profiles = historicalData.profiles || {};
const sourceIds = new Set(historicalData.sourceIds || []);
const localSourcesById = new Map((historicalData.sources || []).map((source) => [source.id, source]));

assert.ok(Object.keys(profiles).length > 0, "Historical player profiles must not be empty");
assert.equal(
  historicalData.coverage?.clubProfileCount,
  Object.keys(profiles).length,
  "Historical club coverage count must match the profile count"
);
for (const sourceId of [
  "engsoccerdata-872c5c3",
  "historical-league-association-era-rules-2026-07-21",
  "historical-league-club-era-overrides-2026-07-21"
]) {
  assert.ok(sourceIds.has(sourceId), `${sourceId}: missing from historical profile sourceIds`);
  assert.ok(localSourcesById.has(sourceId), `${sourceId}: missing historical profile source registration`);
}
assert.equal(
  historicalData.coverage?.leagueProfileCount + historicalData.coverage?.leagueNotApplicableProfileCount,
  Object.keys(profiles).length,
  "Historical league coverage and justified exceptions must match the profile count"
);

const allowedLeagueResolutionMethods = new Set([
  "season-membership",
  "curated-club-era-override",
  "association-era-default",
  "not-applicable"
]);
const expectedLeagueExceptions = new Set(["Alberto Tarantini / Argentina / 1978"]);

for (const [profileKey, profile] of Object.entries(profiles)) {
  assert.ok(String(profile.club || "").trim(), `${profileKey}: missing tournament-time club`);
  assert.equal(profile.clubAtTournament, profile.club, `${profileKey}: card club must be tournament-time club`);
  assert.ok(profile.clubAtTournamentSource, `${profileKey}: missing tournament-time club source`);
  assert.match(
    String(profile.clubAtTournamentSourceUrl || ""),
    /^https:\/\//,
    `${profileKey}: missing tournament-time club source URL`
  );
  assert.ok(
    sourceIds.has(profile.leagueAtTournamentSource),
    `${profileKey}: tournament-time league source is not registered`
  );
  assert.doesNotMatch(
    `${profile.club} ${profile.clubAtTournament}`,
    /World Cup archive/i,
    `${profileKey}: archive label must not be used as a club`
  );
  assert.equal(profile.leagueAtTournament, profile.league, `${profileKey}: card league must be tournament-time league`);
  assert.ok(
    allowedLeagueResolutionMethods.has(profile.leagueAtTournamentResolution),
    `${profileKey}: unknown historical league resolution method`
  );
  assert.match(
    String(profile.leagueAtTournamentSourceUrl || ""),
    /^https:\/\//,
    `${profileKey}: missing tournament-time league source URL`
  );
  if (expectedLeagueExceptions.has(profileKey)) {
    assert.equal(profile.club, "Free agent", `${profileKey}: the no-league exception must remain a free agent`);
    assert.equal(profile.league, "", `${profileKey}: a free agent must not be assigned a fictional league`);
    assert.equal(profile.leagueAtTournamentResolution, "not-applicable");
  } else {
    assert.ok(String(profile.league || "").trim(), `${profileKey}: missing tournament-time league`);
    assert.ok(String(profile.leagueAtTournamentAssociation || "").trim(), `${profileKey}: missing club association`);
  }
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

const expectedHistoricalLeagues = new Map([
  ["Fritz Szepan / Germany / 1938", "Gauliga system"],
  ["Nils Liedholm / Sweden / 1950", "Serie A"],
  ["Garrincha / Brazil / 1958", "Campeonato Carioca"],
  ["Alan A'Court / England / 1958", "Football League Second Division"],
  ["Franz Beckenbauer / West Germany / 1974", "Bundesliga"],
  ["Colin Clarke / Northern Ireland / 1986", "Football League Third Division"],
  ["Gerard Piqué / Spain / 2010", "La Liga"],
  ["Kylian Mbappé / France / 2018", "Ligue 1"],
  ["Gareth Bale / Wales / 2022", "Major League Soccer"]
]);
for (const [profileKey, league] of expectedHistoricalLeagues) {
  assert.equal(profiles[profileKey]?.league, league, `${profileKey}: unexpected tournament-time league`);
}
assert.equal(profiles["Gerard Piqué / Spain / 2010"]?.leagueAtTournamentSeason, 2009);
assert.equal(profiles["Gerard Piqué / Spain / 2010"]?.leagueAtTournamentTier, 1);
assert.equal(profiles["Alan A'Court / England / 1958"]?.leagueAtTournamentTier, 2);
assert.equal(profiles["Colin Clarke / Northern Ireland / 1986"]?.leagueAtTournamentTier, 3);

const historicalLeagueNames = [...new Set(Object.values(profiles).map((profile) => profile.league).filter(Boolean))];
for (const league of historicalLeagueNames) {
  assert.ok(ZH_LEAGUE_NAME_TRANSLATIONS[league], `${league}: missing Chinese historical league translation`);
  assert.ok(structuredGlossary.leagues?.es?.[league], `${league}: missing Spanish historical league translation`);
  assert.ok(structuredGlossary.leagues?.ko?.[league], `${league}: missing Korean historical league translation`);
}

const formatLocalizedClubLine = (language, profileKey) => {
  const profile = profiles[profileKey];
  const clubTranslations = language === "zh"
    ? ZH_CLUB_NAME_TRANSLATIONS
    : structuredGlossary.clubs?.[language] || {};
  const leagueTranslations = language === "zh"
    ? ZH_LEAGUE_NAME_TRANSLATIONS
    : structuredGlossary.leagues?.[language] || {};
  return formatPlayerClubLine({
    club: profile.club,
    league: profile.league,
    language,
    localizeClub: (value) => clubTranslations[value] || value,
    localizeLeague: (value) => leagueTranslations[value] || value
  });
};
assert.equal(formatLocalizedClubLine("en", "Gerard Piqué / Spain / 2010"), "Barcelona (La Liga)");
assert.equal(formatLocalizedClubLine("zh", "Gerard Piqué / Spain / 2010"), "巴塞罗那（西甲）");
assert.equal(formatLocalizedClubLine("es", "Gerard Piqué / Spain / 2010"), "Barcelona (LaLiga)");
assert.equal(formatLocalizedClubLine("ko", "Gerard Piqué / Spain / 2010"), "바르셀로나 (라리가)");
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

console.log(`Historical player club and league audit passed: ${Object.keys(profiles).length} tournament-time profiles.`);
