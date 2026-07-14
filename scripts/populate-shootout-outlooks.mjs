#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturesPath = path.join(root, "data", "fixtures.json");
const historyPath = path.join(root, "data", "history.json");
const teamsPath = path.join(root, "data", "teams.json");
const generatedAt = "2026-07-13T15:25:20-07:00";
const archiveSourceId = "openfootball-worldcup-json-2026-06-17";
const currentResultsSourceId = "fifa-official-results-sync-2026-07-12";

const historicalTeamAliases = {
  "Congo DR": "COD",
  "Côte d'Ivoire": "CIV",
  Iran: "IRN",
  "Ivory Coast": "CIV",
  "Korea Republic": "KOR",
  "South Korea": "KOR",
  Turkey: "TUR",
  USA: "USA",
  "United States": "USA",
  "West Germany": "GER"
};

const sourcedOutlooksByMatchNumber = new Map([
  [
    101,
    {
      method: "sourced-shootout-evidence",
      sourceIds: [
        "ladbrokes-france-spain-method-victory-2026-07-13",
        "as-unai-simon-shootout-record-2026-07-06",
        "uefa-spain-croatia-shootout-2023",
        "as-spain-penalty-takers-2026-07-10"
      ],
      capturedAt: "2026-07-13T15:25:20-07:00",
      leanTeamId: "ESP",
      confidence: "slight",
      evidence: [
        {
          type: "goalkeeper-shootout-record",
          teamId: "ESP",
          player: "Unai Simón",
          saved: 8,
          faced: 22,
          highlightSaved: 2,
          highlight: "2023 Nations League final"
        },
        {
          type: "taker-penalty-record",
          teamId: "ESP",
          player: "Mikel Oyarzabal",
          scored: 51,
          taken: 57
        }
      ]
    }
  ],
  [
    102,
    {
      method: "sourced-shootout-evidence",
      sourceIds: [
        "betfair-england-argentina-method-victory-2026-07-13",
        archiveSourceId,
        "conmebol-emiliano-martinez-shootout-record-2024"
      ],
      capturedAt: "2026-07-13T15:25:20-07:00",
      leanTeamId: "ARG",
      confidence: "slight",
      evidence: [
        {
          type: "team-world-cup-shootout-record",
          teamId: "ARG",
          wins: 6,
          appearances: 7
        },
        {
          type: "goalkeeper-unbeaten-national-shootouts",
          teamId: "ARG",
          player: "Emiliano Martínez"
        }
      ]
    }
  ]
]);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getPenaltyScore(fixture) {
  const home = Number(fixture?.scoreDetails?.penalties?.home);
  const away = Number(fixture?.scoreDetails?.penalties?.away);
  return Number.isFinite(home) && Number.isFinite(away) && home !== away ? { home, away } : null;
}

function addTeamEvent(eventsByTeam, teamId, event) {
  if (!teamId) {
    return;
  }

  const events = eventsByTeam.get(teamId) || [];
  events.push(event);
  eventsByTeam.set(teamId, events);
}

function buildShootoutEvents(historyData, fixturesData, teamsData) {
  const teamIdsByName = new Map();
  for (const team of teamsData.teams || []) {
    for (const name of [team.name, team.officialName, team.shortName]) {
      if (name) {
        teamIdsByName.set(normalizeName(name), team.id);
      }
    }
  }
  for (const [name, teamId] of Object.entries(historicalTeamAliases)) {
    teamIdsByName.set(normalizeName(name), teamId);
  }

  const eventsByTeam = new Map();
  for (const fixture of historyData.fixtures || []) {
    const penalties = getPenaltyScore(fixture);
    if (!penalties) {
      continue;
    }

    const sourceIds = [fixture.sourceId || archiveSourceId];
    const homeTeamId = teamIdsByName.get(normalizeName(fixture.homeSlot));
    const awayTeamId = teamIdsByName.get(normalizeName(fixture.awaySlot));
    const kickoff = `${fixture.date || `${fixture.tournamentYear}-12-31`}T23:59:59Z`;
    addTeamEvent(eventsByTeam, homeTeamId, {
      kickoff,
      won: penalties.home > penalties.away,
      sourceIds
    });
    addTeamEvent(eventsByTeam, awayTeamId, {
      kickoff,
      won: penalties.away > penalties.home,
      sourceIds
    });
  }

  for (const fixture of fixturesData.fixtures || []) {
    const penalties = getPenaltyScore(fixture);
    if (!penalties || !fixture.homeTeamId || !fixture.awayTeamId) {
      continue;
    }

    const sourceIds = [
      currentResultsSourceId,
      ...(fixture.resultStoryResearch?.sourceIds || [])
    ];
    addTeamEvent(eventsByTeam, fixture.homeTeamId, {
      kickoff: fixture.kickoffUtc,
      won: penalties.home > penalties.away,
      sourceIds
    });
    addTeamEvent(eventsByTeam, fixture.awayTeamId, {
      kickoff: fixture.kickoffUtc,
      won: penalties.away > penalties.home,
      sourceIds
    });
  }

  return eventsByTeam;
}

function buildTeamRecord(eventsByTeam, teamId, cutoffAt) {
  const cutoffTime = new Date(cutoffAt).getTime();
  const events = (eventsByTeam.get(teamId) || []).filter(
    (event) => new Date(event.kickoff).getTime() < cutoffTime
  );
  const wins = events.filter((event) => event.won).length;

  return {
    wins,
    losses: events.length - wins,
    appearances: events.length,
    sourceIds: [...new Set(events.flatMap((event) => event.sourceIds || []))]
  };
}

const [fixturesData, historyData, teamsData] = await Promise.all([
  readJson(fixturesPath),
  readJson(historyPath),
  readJson(teamsPath)
]);

const eventsByTeam = buildShootoutEvents(historyData, fixturesData, teamsData);
const usedSourceIds = new Set(fixturesData.sourceIds || []);
let populated = 0;

fixturesData.fixtures = fixturesData.fixtures.map((fixture) => {
  if (fixture.stage === "group" || !fixture.homeTeamId || !fixture.awayTeamId) {
    return fixture;
  }

  const homeRecord = buildTeamRecord(eventsByTeam, fixture.homeTeamId, fixture.kickoffUtc);
  const awayRecord = buildTeamRecord(eventsByTeam, fixture.awayTeamId, fixture.kickoffUtc);
  const sourcedOutlook = sourcedOutlooksByMatchNumber.get(Number(fixture.matchNumber));
  const sourceIds = [
    archiveSourceId,
    ...homeRecord.sourceIds,
    ...awayRecord.sourceIds,
    ...(sourcedOutlook?.sourceIds || [])
  ];
  const uniqueSourceIds = [...new Set(sourceIds)];
  uniqueSourceIds.forEach((sourceId) => usedSourceIds.add(sourceId));

  populated += 1;
  return {
    ...fixture,
    shootoutOutlook: {
      method: sourcedOutlook?.method || "world-cup-shootout-history",
      sourceIds: uniqueSourceIds,
      generatedAt,
      cutoffAt: fixture.kickoffUtc,
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      home: {
        wins: homeRecord.wins,
        losses: homeRecord.losses,
        appearances: homeRecord.appearances
      },
      away: {
        wins: awayRecord.wins,
        losses: awayRecord.losses,
        appearances: awayRecord.appearances
      },
      ...(sourcedOutlook || {})
    }
  };
});

fixturesData.sourceIds = [...usedSourceIds];
fixturesData.updatedAt = generatedAt;
await writeFile(fixturesPath, `${JSON.stringify(fixturesData, null, 2)}\n`);

console.log(`Populated sourced shootout outlooks for ${populated} confirmed knockout fixtures.`);
