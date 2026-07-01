#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const historyPath = path.join(root, "data", "history.json");
const tournamentPath = path.join(root, "data", "tournament.json");
const wikidataSourceId = "wikidata-world-cup-kickoff-times-2026-06-30";
const wikidataSource = {
  id: wikidataSourceId,
  label: "Wikidata World Cup match kickoff times",
  url: "https://www.wikidata.org/wiki/Wikidata:WikiProject_Football",
  type: "cross-check",
  checkedAt: "2026-06-30T17:47:10-07:00",
  license: "CC0-1.0",
  note:
    "Historical kickoff wall-clock times synced from Wikidata match-item date/time-of-day qualifiers. Cancelled date-only fixtures remain without kickoff time."
};

const directWikidataTimes = new Map([
  [
    "wc-1954-1954-07-04-final-hungary-west-germany",
    { localTime: "17:00", wikidataId: "Q665946" }
  ],
  [
    "wc-1990-1990-07-08-final-west-germany-argentina",
    { localTime: "20:00", wikidataId: "Q3745599" }
  ],
  [
    "wc-2006-2006-07-09-final-italy-france",
    { localTime: "20:00", wikidataId: "Q268567" }
  ]
]);

function normalizeTeamName(value) {
  let normalized = String(value || "")
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/côte/g, "cote");

  for (const suffix of [
    " men's national association football team",
    " men's national football team",
    " men's national soccer team",
    " national association football team",
    " national football team",
    " national soccer team"
  ]) {
    normalized = normalized.replace(suffix, "");
  }

  const exactAliases = new Map([
    ["canadian", "canada"],
    ["cuban", "cuba"],
    ["emirates", "united arab emirates"],
    ["republic of ireland", "ireland"],
    ["czechia", "czech republic"],
    ["ivory coast", "cote d'ivoire"],
    ["dr congo", "zaire"],
    ["united states", "usa"],
    ["west germany", "germany"],
    ["serbia and montenegro", "yugoslavia"]
  ]);

  normalized = exactAliases.get(normalized) || normalized;
  return normalized
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTeamKey(values) {
  return values.map(normalizeTeamName).sort().join("|");
}

function getSortKey(fixture, localTime) {
  const timeMatch = /^(\d{1,2}:\d{2})/.exec(String(localTime || fixture.localTime || ""));
  const time = timeMatch ? timeMatch[1].padStart(5, "0") : "12:00";
  const index = Number.isFinite(Number(fixture.matchNumber))
    ? Math.max(0, Number(fixture.matchNumber) - 1)
    : 0;
  return `${fixture.date}T${time}:${String(index).padStart(3, "0")}`;
}

function withLocalTime(fixture, localTime) {
  const next = {};

  for (const [key, value] of Object.entries(fixture)) {
    if (key === "localTime" || key === "localTimeSourceId") {
      continue;
    }

    if (key === "sortKey") {
      next.sortKey = getSortKey(fixture, localTime);
      continue;
    }

    next[key] = value;

    if (key === "date") {
      next.localTime = localTime;
      next.localTimeSourceId = wikidataSourceId;
    }
  }

  return next;
}

async function fetchWikidataKickoffTimes(years) {
  const yearPattern = years.join("|");
  const query = `
SELECT ?match ?matchLabel ?tournamentLabel ?date ?timeOfDayLabel (GROUP_CONCAT(DISTINCT ?participantLabel; separator="|") AS ?participants) WHERE {
  ?match wdt:P31 wd:Q17315159 .
  ?match (wdt:P179|wdt:P361|wdt:P361/wdt:P361|wdt:P361/wdt:P361/wdt:P361) ?tournament .
  ?tournament rdfs:label ?tournamentLabel .
  FILTER(LANG(?tournamentLabel) = "en")
  FILTER(REGEX(?tournamentLabel, "^(${yearPattern}) FIFA World Cup$"))
  ?match (p:P580|p:P585) ?startStmt .
  ?startStmt (ps:P580|ps:P585) ?date .
  ?startStmt pq:P4241 ?timeOfDay .
  OPTIONAL {
    ?match wdt:P1923 ?participant .
    ?participant rdfs:label ?participantLabel .
    FILTER(LANG(?participantLabel) = "en")
  }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
    ?match rdfs:label ?matchLabel.
    ?timeOfDay rdfs:label ?timeOfDayLabel.
  }
}
GROUP BY ?match ?matchLabel ?tournamentLabel ?date ?timeOfDayLabel
`;
  const params = new URLSearchParams({ query, format: "json" });
  const response = await fetch(`https://query.wikidata.org/sparql?${params}`, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "WorldCupSimplified/1.0 historical kickoff time sync"
    }
  });

  if (!response.ok) {
    throw new Error(`Wikidata kickoff query failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return payload.results.bindings.map((item) => {
    const participants = String(item.participants?.value || "")
      .split("|")
      .filter(Boolean);
    return {
      year: Number(String(item.tournamentLabel.value).slice(0, 4)),
      date: String(item.date.value).slice(0, 10),
      localTime: item.timeOfDayLabel.value,
      participants
    };
  });
}

function upsertSource(tournament) {
  const sources = Array.isArray(tournament.sources) ? tournament.sources : [];
  const index = sources.findIndex((source) => source.id === wikidataSourceId);
  if (index >= 0) {
    sources[index] = { ...sources[index], ...wikidataSource };
  } else {
    sources.push(wikidataSource);
  }
  tournament.sources = sources;
  tournament.updatedAt = wikidataSource.checkedAt;
}

const history = JSON.parse(await readFile(historyPath, "utf8"));
const tournament = JSON.parse(await readFile(tournamentPath, "utf8"));
const missingFixtures = history.fixtures.filter(
  (fixture) => fixture.isHistorical && !fixture.localTime && fixture.status !== "CANCELLED"
);
const years = [...new Set(missingFixtures.map((fixture) => fixture.tournamentYear))].sort();

if (!years.length) {
  console.log("No historical kickoff times need syncing.");
  process.exit(0);
}

const wikidataRows = await fetchWikidataKickoffTimes(years);
const wikidataByFixtureKey = new Map();

for (const item of wikidataRows) {
  if (item.participants.length !== 2) {
    continue;
  }

  const key = `${item.year}|${item.date}|${getTeamKey(item.participants)}`;
  if (!wikidataByFixtureKey.has(key)) {
    wikidataByFixtureKey.set(key, []);
  }
  wikidataByFixtureKey.get(key).push(item);
}

let syncedCount = 0;
let directCount = 0;
const unmatched = [];

history.fixtures = history.fixtures.map((fixture) => {
  if (!fixture.isHistorical || fixture.localTime || fixture.status === "CANCELLED") {
    return fixture;
  }

  const directTime = directWikidataTimes.get(fixture.id);
  if (directTime) {
    directCount += 1;
    syncedCount += 1;
    return withLocalTime(fixture, directTime.localTime);
  }

  const key = `${fixture.tournamentYear}|${fixture.date}|${getTeamKey([
    fixture.homeSlot,
    fixture.awaySlot
  ])}`;
  const candidates = wikidataByFixtureKey.get(key) || [];

  if (candidates.length !== 1) {
    unmatched.push({
      id: fixture.id,
      date: fixture.date,
      homeSlot: fixture.homeSlot,
      awaySlot: fixture.awaySlot,
      candidates: candidates.length
    });
    return fixture;
  }

  syncedCount += 1;
  return withLocalTime(fixture, candidates[0].localTime);
});

if (!history.sourceIds.includes(wikidataSourceId)) {
  history.sourceIds.push(wikidataSourceId);
}

history.updatedAt = wikidataSource.checkedAt;
history.coverage = {
  ...history.coverage,
  note:
    "Historical men's World Cup match data imported from the public-domain openfootball/worldcup.json project. Historical kickoff wall-clock times are synced from Wikidata match-item time-of-day qualifiers when available; date-only cancelled fixtures remain without kickoff time."
};

upsertSource(tournament);

await writeFile(historyPath, `${JSON.stringify(history, null, 2)}\n`);
await writeFile(tournamentPath, `${JSON.stringify(tournament, null, 2)}\n`);

console.log(
  `Synced ${syncedCount} historical kickoff times from Wikidata (${directCount} direct final entity overrides).`
);

if (unmatched.length) {
  console.log(`Left ${unmatched.length} historical fixtures without kickoff time:`);
  for (const item of unmatched) {
    console.log(
      `- ${item.id}: ${item.date} ${item.homeSlot} vs ${item.awaySlot} (${item.candidates} candidates)`
    );
  }
}
