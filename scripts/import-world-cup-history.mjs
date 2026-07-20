#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const historyPath = path.join(root, "data", "history.json");
const sourceId = "openfootball-worldcup-json-2026-06-17";
const sourceUrl = "https://github.com/openfootball/worldcup.json";
const rawBaseUrl =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master";
const years = [
  1930,
  1934,
  1938,
  1950,
  1954,
  1958,
  1962,
  1966,
  1970,
  1974,
  1978,
  1982,
  1986,
  1990,
  1994,
  1998,
  2002,
  2006,
  2010,
  2014,
  2018,
  2022
];

const hostCountryByYear = new Map([
  [1930, "Uruguay"],
  [1934, "Italy"],
  [1938, "France"],
  [1950, "Brazil"],
  [1954, "Switzerland"],
  [1958, "Sweden"],
  [1962, "Chile"],
  [1966, "England"],
  [1970, "Mexico"],
  [1974, "West Germany"],
  [1978, "Argentina"],
  [1982, "Spain"],
  [1986, "Mexico"],
  [1990, "Italy"],
  [1994, "USA"],
  [1998, "France"],
  [2006, "Germany"],
  [2010, "South Africa"],
  [2014, "Brazil"],
  [2018, "Russia"],
  [2022, "Qatar"]
]);

const southKorea2002VenueCities = new Set([
  "Busan",
  "Daegu",
  "Daejeon",
  "Gwangju",
  "Incheon",
  "Jeju",
  "Jeonju",
  "Seoul",
  "Suwon",
  "Ulsan"
]);

function normalizeVenue(venue, year) {
  if (year === 1982 && venue === "Estadio Santiago Bernabéu") {
    return "Estadio Santiago Bernabéu, Madrid";
  }
  return venue;
}

function getVenueCountry(venue, year) {
  if (year === 2002) {
    const city = String(venue || "").split(",").at(-1)?.trim() || "";
    return southKorea2002VenueCities.has(city) ? "South Korea" : "Japan";
  }
  return hostCountryByYear.get(year) || "";
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getScorePair(score = {}) {
  const pair = score.et || score.ft;
  if (!Array.isArray(pair)) {
    return null;
  }

  return { home: Number(pair[0]), away: Number(pair[1]) };
}

function getScoreDetails(score = {}) {
  return {
    ...(Array.isArray(score.ft)
      ? { fullTime: { home: Number(score.ft[0]), away: Number(score.ft[1]) } }
      : {}),
    ...(Array.isArray(score.ht)
      ? { halfTime: { home: Number(score.ht[0]), away: Number(score.ht[1]) } }
      : {}),
    ...(Array.isArray(score.et)
      ? { extraTime: { home: Number(score.et[0]), away: Number(score.et[1]) } }
      : {}),
    ...(Array.isArray(score.p)
      ? { penalties: { home: Number(score.p[0]), away: Number(score.p[1]) } }
      : {})
  };
}

function normalizeGoal(goal = {}) {
  return {
    name: goal.name || "",
    minute: Number.isFinite(Number(goal.minute)) ? Number(goal.minute) : null,
    ...(Number.isFinite(Number(goal.offset)) ? { offset: Number(goal.offset) } : {}),
    ...(goal.penalty ? { penalty: true } : {}),
    ...(goal.owngoal ? { ownGoal: true } : {})
  };
}

function getStatus(match) {
  if (match.status === "canceled") {
    return "CANCELLED";
  }

  return match.score ? "FT" : "SCHEDULED";
}

function getSortKey(match, index) {
  const time = match.time || "12:00";
  return `${match.date}T${time.padStart(5, "0")}:${String(index).padStart(3, "0")}`;
}

function winnerName(match) {
  const score = getScorePair(match.score);
  const penalties = getScoreDetails(match.score).penalties;

  if (!score || score.home === score.away) {
    if (!penalties || penalties.home === penalties.away) {
      return "";
    }

    return penalties.home > penalties.away ? match.team1 : match.team2;
  }

  return score.home > score.away ? match.team1 : match.team2;
}

function normalizeFixture(match, year, tournamentName, index, duplicateCounts) {
  const slugBase = [
    "wc",
    year,
    match.date,
    slugify(match.round),
    slugify(match.team1),
    slugify(match.team2)
  ]
    .filter(Boolean)
    .join("-");
  const duplicateCount = duplicateCounts.get(slugBase) || 0;
  duplicateCounts.set(slugBase, duplicateCount + 1);
  const score = getScorePair(match.score);
  const sourcePath = `${year}/worldcup.json`;
  const venue = normalizeVenue(match.ground || "", year);

  return {
    id: duplicateCount ? `${slugBase}-${duplicateCount + 1}` : slugBase,
    sourceId,
    sourcePath,
    isHistorical: true,
    tournamentYear: year,
    tournamentName,
    matchNumber: index + 1,
    date: match.date,
    ...(match.time ? { localTime: match.time } : {}),
    sortKey: getSortKey(match, index),
    round: match.round || "",
    ...(match.group ? { group: match.group } : {}),
    homeSlot: match.team1 || "TBD",
    awaySlot: match.team2 || "TBD",
    venue,
    venueCountry: getVenueCountry(venue, year),
    status: getStatus(match),
    ...(score ? { score } : {}),
    scoreDetails: getScoreDetails(match.score),
    goalsHome: Array.isArray(match.goals1) ? match.goals1.map(normalizeGoal) : [],
    goalsAway: Array.isArray(match.goals2) ? match.goals2.map(normalizeGoal) : [],
    ...(winnerName(match) ? { winner: winnerName(match) } : {})
  };
}

async function fetchTournament(year) {
  const response = await fetch(`${rawBaseUrl}/${year}/worldcup.json`);

  if (!response.ok) {
    throw new Error(`Unable to fetch ${year} World Cup data: ${response.status}`);
  }

  return response.json();
}

const duplicateCounts = new Map();
const tournaments = [];
const fixtures = [];
const existingHistory = JSON.parse(await readFile(historyPath, "utf8"));

for (const year of years) {
  const tournament = await fetchTournament(year);
  const normalizedFixtures = tournament.matches.map((match, index) =>
    normalizeFixture(match, year, tournament.name || `World Cup ${year}`, index, duplicateCounts)
  );
  const dates = normalizedFixtures.map((fixture) => fixture.date).sort();
  const teams = [
    ...new Set(
      normalizedFixtures.flatMap((fixture) => [fixture.homeSlot, fixture.awaySlot])
    )
  ].sort((a, b) => a.localeCompare(b));

  tournaments.push({
    year,
    name: tournament.name || `World Cup ${year}`,
    startDate: dates[0],
    endDate: dates.at(-1),
    matchCount: normalizedFixtures.length,
    teamCount: teams.length,
    teams
  });
  fixtures.push(...normalizedFixtures);
}

const existing2026Tournament = (existingHistory.tournaments || []).find((tournament) => tournament.year === 2026);
const existing2026Fixtures = (existingHistory.fixtures || []).filter((fixture) => fixture.tournamentYear === 2026);
if (existing2026Tournament && existing2026Fixtures.length === 104) {
  tournaments.push(existing2026Tournament);
  fixtures.push(...existing2026Fixtures);
}

fixtures.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

const history = {
  updatedAt: "2026-06-17T15:08:00-07:00",
  sourceIds: [...new Set([sourceId, ...(existing2026Fixtures.length === 104 ? existingHistory.sourceIds || [] : [])])],
  coverage: {
    status: existing2026Fixtures.length === 104 ? "complete-men-1930-2026" : "complete-men-1930-2022",
    note:
      existing2026Fixtures.length === 104
        ? "Historical men's World Cup data through 2022 was refreshed from openfootball without deleting the finalized, versioned 2026 archive."
        : "Historical men's World Cup match data imported from the public-domain openfootball/worldcup.json project. Date-only matches are preserved on their tournament local date."
  },
  source: {
    id: sourceId,
    label: "openfootball World Cup JSON",
    url: sourceUrl,
    license: "CC0-1.0/public domain"
  },
  tournaments,
  fixtures
};

await writeFile(historyPath, `${JSON.stringify(history, null, 2)}\n`);
console.log(
  `Wrote ${fixtures.length} historical fixtures across ${tournaments.length} tournaments to ${path.relative(
    root,
    historyPath
  )}.`
);
