#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturesPath = path.join(root, "data", "fixtures.json");
const historyPath = path.join(root, "data", "history.json");
const teamsPath = path.join(root, "data", "teams.json");
const evidencePath = path.join(root, "data", "shootout-evidence.json");
const archiveSourceId = "openfootball-worldcup-json-2026-06-17";

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

function getHistoricalTeamKey(teamName) {
  const normalizedName = normalizeName(teamName);
  return normalizedName === "west germany" ? "germany" : normalizedName;
}

function isHistoricalGroupPlayoffFixture(fixture) {
  return /^Group\s+.+\s+Play-?off$/i.test(String(fixture?.round || "").trim());
}

function isHistoricalShootoutOutlookFixture(fixture) {
  return (
    Number(fixture?.tournamentYear) >= 1978 &&
    !fixture?.group &&
    !isHistoricalGroupPlayoffFixture(fixture)
  );
}

function buildHistoricalShootoutEvents(historyData) {
  const eventsByTeam = new Map();

  for (const fixture of historyData.fixtures || []) {
    const penalties = getPenaltyScore(fixture);
    if (!penalties) {
      continue;
    }

    const sourceIds = [fixture.sourceId || archiveSourceId];
    addTeamEvent(eventsByTeam, getHistoricalTeamKey(fixture.homeSlot), {
      sortKey: fixture.sortKey,
      won: penalties.home > penalties.away,
      sourceIds
    });
    addTeamEvent(eventsByTeam, getHistoricalTeamKey(fixture.awaySlot), {
      sortKey: fixture.sortKey,
      won: penalties.away > penalties.home,
      sourceIds
    });
  }

  return eventsByTeam;
}

function buildHistoricalTeamRecord(eventsByTeam, teamName, cutoffKey) {
  const events = (eventsByTeam.get(getHistoricalTeamKey(teamName)) || []).filter(
    (event) => String(event.sortKey || "").localeCompare(String(cutoffKey || "")) < 0
  );
  const wins = events.filter((event) => event.won).length;

  return {
    wins,
    losses: events.length - wins,
    appearances: events.length,
    sourceIds: [...new Set(events.flatMap((event) => event.sourceIds || []))]
  };
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

    const fixtureDay = String(fixture.kickoffUtc || "").slice(0, 10);
    const officialResultSourceId = `fifa-official-results-sync-${fixtureDay}`;
    const sourceIds = [
      ...((fixturesData.sourceIds || []).includes(officialResultSourceId) ? [officialResultSourceId] : []),
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

function getSourcedOutlook(evidenceData, fixture) {
  const fixtureTeamKey = [fixture.homeTeamId, fixture.awayTeamId].sort().join("|");
  const kickoffTime = new Date(fixture.kickoffUtc).getTime();
  return (evidenceData.matchups || [])
    .filter((candidate) => {
      const candidateTeamKey = [candidate.homeTeamId, candidate.awayTeamId].sort().join("|");
      const capturedTime = new Date(candidate.capturedAt).getTime();
      const expiresTime = new Date(candidate.expiresAt).getTime();
      return candidateTeamKey === fixtureTeamKey &&
        Number.isFinite(capturedTime) && capturedTime < kickoffTime &&
        Number.isFinite(expiresTime) && kickoffTime <= expiresTime;
    })
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())[0] || null;
}

function getGeneratedAt(existingOutlook, fixture, sourcedOutlook, fallback) {
  const matchesFixture = existingOutlook?.homeTeamId === fixture.homeTeamId &&
    existingOutlook?.awayTeamId === fixture.awayTeamId &&
    existingOutlook?.cutoffAt === fixture.kickoffUtc;
  return matchesFixture && existingOutlook?.generatedAt
    ? existingOutlook.generatedAt
    : sourcedOutlook?.capturedAt || fallback;
}

const [fixturesData, historyData, teamsData, evidenceData] = await Promise.all([
  readJson(fixturesPath),
  readJson(historyPath),
  readJson(teamsPath),
  readJson(evidencePath)
]);

const eventsByTeam = buildShootoutEvents(historyData, fixturesData, teamsData);
const historicalEventsByTeam = buildHistoricalShootoutEvents(historyData);
const usedSourceIds = new Set(fixturesData.sourceIds || []);
let populated = 0;
let historicalPopulated = 0;

fixturesData.fixtures = fixturesData.fixtures.map((fixture) => {
  if (fixture.stage === "group" || !fixture.homeTeamId || !fixture.awayTeamId) {
    return fixture;
  }

  const homeRecord = buildTeamRecord(eventsByTeam, fixture.homeTeamId, fixture.kickoffUtc);
  const awayRecord = buildTeamRecord(eventsByTeam, fixture.awayTeamId, fixture.kickoffUtc);
  const sourcedOutlook = getSourcedOutlook(evidenceData, fixture);
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
      generatedAt: getGeneratedAt(
        fixture.shootoutOutlook,
        fixture,
        sourcedOutlook,
        fixturesData.updatedAt || new Date().toISOString()
      ),
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
      ...(sourcedOutlook
        ? Object.fromEntries(Object.entries(sourcedOutlook).filter(([key]) => !["id", "homeTeamId", "awayTeamId", "expiresAt"].includes(key)))
        : {})
    }
  };
});

fixturesData.sourceIds = [...usedSourceIds];
historyData.fixtures = (historyData.fixtures || []).map((fixture) => {
  if (!isHistoricalShootoutOutlookFixture(fixture)) {
    if (fixture.shootoutOutlook === undefined) {
      return fixture;
    }

    const { shootoutOutlook: _removedShootoutOutlook, ...fixtureWithoutOutlook } = fixture;
    return fixtureWithoutOutlook;
  }

  const homeRecord = buildHistoricalTeamRecord(
    historicalEventsByTeam,
    fixture.homeSlot,
    fixture.sortKey
  );
  const awayRecord = buildHistoricalTeamRecord(
    historicalEventsByTeam,
    fixture.awaySlot,
    fixture.sortKey
  );
  const sourceIds = [
    fixture.sourceId || archiveSourceId,
    ...homeRecord.sourceIds,
    ...awayRecord.sourceIds
  ];

  historicalPopulated += 1;
  return {
    ...fixture,
    shootoutOutlook: {
      method: "world-cup-shootout-history",
      sourceIds: [...new Set(sourceIds)],
      generatedAt: fixture.shootoutOutlook?.generatedAt || historyData.updatedAt || new Date().toISOString(),
      cutoffAt: fixture.date,
      cutoffKey: fixture.sortKey,
      homeTeamName: fixture.homeSlot,
      awayTeamName: fixture.awaySlot,
      home: {
        wins: homeRecord.wins,
        losses: homeRecord.losses,
        appearances: homeRecord.appearances
      },
      away: {
        wins: awayRecord.wins,
        losses: awayRecord.losses,
        appearances: awayRecord.appearances
      }
    }
  };
});
await writeFile(fixturesPath, `${JSON.stringify(fixturesData, null, 2)}\n`);
await writeFile(historyPath, `${JSON.stringify(historyData, null, 2)}\n`);

console.log(`Populated sourced shootout outlooks for ${populated} confirmed knockout fixtures.`);
console.log(`Populated cutoff-safe shootout outlooks for ${historicalPopulated} historical knockout fixtures.`);
