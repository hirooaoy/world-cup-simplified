#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturesPath = path.join(root, "data", "fixtures.json");
const existing = JSON.parse(await readFile(fixturesPath, "utf8"));
const existingById = new Map(existing.fixtures.map((fixture) => [fixture.id, fixture]));

const sourceIds = ["fifa-schedule-2026-06-17", "fox-schedule-2026-06-17", "editorial-preview-2026-06-17"];

function groupFixture({
  id,
  kickoffUtc,
  groupId,
  homeTeamId,
  awayTeamId,
  venue,
  status = "SCHEDULED",
  score
}) {
  return {
    id,
    stage: "group",
    round: "group-stage",
    groupId,
    kickoffUtc,
    homeTeamId,
    awayTeamId,
    venue,
    status,
    ...(score ? { score } : {}),
    h2h: {
      status: "not-loaded",
      summary: "Past senior H2H records are not loaded yet for this fixture.",
      results: null
    }
  };
}

function knockoutFixture({
  id,
  matchNumber,
  stage,
  round,
  kickoffUtc,
  homeSlot,
  awaySlot,
  venue
}) {
  return {
    id,
    matchNumber,
    stage,
    round,
    kickoffUtc,
    homeSlot,
    awaySlot,
    venue,
    status: "SCHEDULED",
    h2h: {
      status: "not-loaded",
      summary: "Teams are not known yet. Past match research will load after the matchup is set.",
      results: null
    }
  };
}

const skeleton = [
  groupFixture({ id: "mexico-south-africa-2026-06-11", kickoffUtc: "2026-06-11T19:00:00Z", groupId: "A", homeTeamId: "MEX", awayTeamId: "RSA", venue: "Mexico City Stadium", status: "FT", score: { home: 2, away: 0 } }),
  groupFixture({ id: "south-korea-czechia-2026-06-11", kickoffUtc: "2026-06-12T01:00:00Z", groupId: "A", homeTeamId: "KOR", awayTeamId: "CZE", venue: "Estadio Guadalajara", status: "FT", score: { home: 2, away: 1 } }),
  groupFixture({ id: "canada-bosnia-2026-06-12", kickoffUtc: "2026-06-12T19:00:00Z", groupId: "B", homeTeamId: "CAN", awayTeamId: "BIH", venue: "Toronto Stadium", status: "FT", score: { home: 1, away: 1 } }),
  groupFixture({ id: "united-states-paraguay-2026-06-12", kickoffUtc: "2026-06-13T02:00:00Z", groupId: "D", homeTeamId: "USA", awayTeamId: "PAR", venue: "Los Angeles Stadium", status: "FT", score: { home: 4, away: 1 } }),
  groupFixture({ id: "qatar-switzerland-2026-06-13", kickoffUtc: "2026-06-13T19:00:00Z", groupId: "B", homeTeamId: "QAT", awayTeamId: "SUI", venue: "San Francisco Bay Area Stadium", status: "FT", score: { home: 1, away: 1 } }),
  groupFixture({ id: "brazil-morocco-2026-06-13", kickoffUtc: "2026-06-13T22:00:00Z", groupId: "C", homeTeamId: "BRA", awayTeamId: "MAR", venue: "New York New Jersey Stadium", status: "FT", score: { home: 1, away: 1 } }),
  groupFixture({ id: "haiti-scotland-2026-06-13", kickoffUtc: "2026-06-14T01:00:00Z", groupId: "C", homeTeamId: "HAI", awayTeamId: "SCO", venue: "Boston Stadium", status: "FT", score: { home: 0, away: 1 } }),
  groupFixture({ id: "australia-turkiye-2026-06-13", kickoffUtc: "2026-06-14T04:00:00Z", groupId: "D", homeTeamId: "AUS", awayTeamId: "TUR", venue: "BC Place Vancouver", status: "FT", score: { home: 2, away: 0 } }),
  groupFixture({ id: "germany-curacao-2026-06-14", kickoffUtc: "2026-06-14T17:00:00Z", groupId: "E", homeTeamId: "GER", awayTeamId: "CUW", venue: "Houston Stadium", status: "FT", score: { home: 7, away: 1 } }),
  groupFixture({ id: "netherlands-japan-2026-06-14", kickoffUtc: "2026-06-14T20:00:00Z", groupId: "F", homeTeamId: "NED", awayTeamId: "JPN", venue: "Dallas Stadium", status: "FT", score: { home: 2, away: 2 } }),
  groupFixture({ id: "cote-divoire-ecuador-2026-06-14", kickoffUtc: "2026-06-14T23:00:00Z", groupId: "E", homeTeamId: "CIV", awayTeamId: "ECU", venue: "Philadelphia Stadium", status: "FT", score: { home: 1, away: 0 } }),
  groupFixture({ id: "sweden-tunisia-2026-06-14", kickoffUtc: "2026-06-15T02:00:00Z", groupId: "F", homeTeamId: "SWE", awayTeamId: "TUN", venue: "Estadio Monterrey", status: "FT", score: { home: 5, away: 1 } }),
  groupFixture({ id: "spain-cabo-verde-2026-06-15", kickoffUtc: "2026-06-15T16:00:00Z", groupId: "H", homeTeamId: "ESP", awayTeamId: "CPV", venue: "Atlanta Stadium", status: "FT", score: { home: 0, away: 0 } }),
  groupFixture({ id: "belgium-egypt-2026-06-15", kickoffUtc: "2026-06-15T22:00:00Z", groupId: "G", homeTeamId: "BEL", awayTeamId: "EGY", venue: "Seattle Stadium", status: "FT", score: { home: 1, away: 1 } }),
  groupFixture({ id: "saudi-arabia-uruguay-2026-06-15", kickoffUtc: "2026-06-15T22:00:00Z", groupId: "H", homeTeamId: "KSA", awayTeamId: "URU", venue: "Miami Stadium", status: "FT", score: { home: 1, away: 1 } }),
  groupFixture({ id: "ir-iran-new-zealand-2026-06-15", kickoffUtc: "2026-06-16T04:00:00Z", groupId: "G", homeTeamId: "IRN", awayTeamId: "NZL", venue: "Los Angeles Stadium", status: "FT", score: { home: 2, away: 2 } }),
  groupFixture({ id: "france-senegal-2026-06-16", kickoffUtc: "2026-06-16T19:00:00Z", groupId: "I", homeTeamId: "FRA", awayTeamId: "SEN", venue: "New York New Jersey Stadium", status: "FT", score: { home: 3, away: 1 } }),
  groupFixture({ id: "iraq-norway-2026-06-16", kickoffUtc: "2026-06-16T22:00:00Z", groupId: "I", homeTeamId: "IRQ", awayTeamId: "NOR", venue: "Boston Stadium", status: "FT", score: { home: 1, away: 4 } }),
  groupFixture({ id: "argentina-algeria-2026-06-16", kickoffUtc: "2026-06-17T01:00:00Z", groupId: "J", homeTeamId: "ARG", awayTeamId: "ALG", venue: "Kansas City Stadium", status: "FT", score: { home: 3, away: 0 } }),
  groupFixture({ id: "austria-jordan-2026-06-16", kickoffUtc: "2026-06-17T04:00:00Z", groupId: "J", homeTeamId: "AUT", awayTeamId: "JOR", venue: "San Francisco Bay Area Stadium", status: "FT", score: { home: 3, away: 1 } }),
  groupFixture({ id: "portugal-dr-congo-2026-06-17", kickoffUtc: "2026-06-17T17:00:00Z", groupId: "K", homeTeamId: "POR", awayTeamId: "COD", venue: "Houston Stadium", status: "LIVE" }),
  groupFixture({ id: "england-croatia-2026-06-17", kickoffUtc: "2026-06-17T20:00:00Z", groupId: "L", homeTeamId: "ENG", awayTeamId: "CRO", venue: "Dallas Stadium" }),
  groupFixture({ id: "ghana-panama-2026-06-17", kickoffUtc: "2026-06-17T23:00:00Z", groupId: "L", homeTeamId: "GHA", awayTeamId: "PAN", venue: "Toronto Stadium" }),
  groupFixture({ id: "uzbekistan-colombia-2026-06-17", kickoffUtc: "2026-06-18T02:00:00Z", groupId: "K", homeTeamId: "UZB", awayTeamId: "COL", venue: "Mexico City Stadium" }),
  groupFixture({ id: "czechia-south-africa-2026-06-18", kickoffUtc: "2026-06-18T16:00:00Z", groupId: "A", homeTeamId: "CZE", awayTeamId: "RSA", venue: "Atlanta Stadium" }),
  groupFixture({ id: "switzerland-bosnia-2026-06-18", kickoffUtc: "2026-06-18T19:00:00Z", groupId: "B", homeTeamId: "SUI", awayTeamId: "BIH", venue: "Los Angeles Stadium" }),
  groupFixture({ id: "canada-qatar-2026-06-18", kickoffUtc: "2026-06-18T22:00:00Z", groupId: "B", homeTeamId: "CAN", awayTeamId: "QAT", venue: "BC Place Vancouver" }),
  groupFixture({ id: "mexico-south-korea-2026-06-18", kickoffUtc: "2026-06-19T01:00:00Z", groupId: "A", homeTeamId: "MEX", awayTeamId: "KOR", venue: "Estadio Guadalajara" }),
  groupFixture({ id: "united-states-australia-2026-06-19", kickoffUtc: "2026-06-19T19:00:00Z", groupId: "D", homeTeamId: "USA", awayTeamId: "AUS", venue: "Seattle Stadium" }),
  groupFixture({ id: "scotland-morocco-2026-06-19", kickoffUtc: "2026-06-19T19:00:00Z", groupId: "C", homeTeamId: "SCO", awayTeamId: "MAR", venue: "Boston Stadium" }),
  groupFixture({ id: "brazil-haiti-2026-06-19", kickoffUtc: "2026-06-20T01:00:00Z", groupId: "C", homeTeamId: "BRA", awayTeamId: "HAI", venue: "Philadelphia Stadium" }),
  groupFixture({ id: "turkiye-paraguay-2026-06-19", kickoffUtc: "2026-06-20T04:00:00Z", groupId: "D", homeTeamId: "TUR", awayTeamId: "PAR", venue: "San Francisco Bay Area Stadium" }),
  groupFixture({ id: "netherlands-sweden-2026-06-20", kickoffUtc: "2026-06-20T17:00:00Z", groupId: "F", homeTeamId: "NED", awayTeamId: "SWE", venue: "Houston Stadium" }),
  groupFixture({ id: "germany-cote-divoire-2026-06-20", kickoffUtc: "2026-06-20T20:00:00Z", groupId: "E", homeTeamId: "GER", awayTeamId: "CIV", venue: "Toronto Stadium" }),
  groupFixture({ id: "ecuador-curacao-2026-06-20", kickoffUtc: "2026-06-21T00:00:00Z", groupId: "E", homeTeamId: "ECU", awayTeamId: "CUW", venue: "Kansas City Stadium" }),
  groupFixture({ id: "tunisia-japan-2026-06-20", kickoffUtc: "2026-06-21T04:00:00Z", groupId: "F", homeTeamId: "TUN", awayTeamId: "JPN", venue: "Estadio Monterrey" }),
  groupFixture({ id: "spain-saudi-arabia-2026-06-21", kickoffUtc: "2026-06-21T16:00:00Z", groupId: "H", homeTeamId: "ESP", awayTeamId: "KSA", venue: "Atlanta Stadium" }),
  groupFixture({ id: "belgium-ir-iran-2026-06-21", kickoffUtc: "2026-06-21T19:00:00Z", groupId: "G", homeTeamId: "BEL", awayTeamId: "IRN", venue: "Los Angeles Stadium" }),
  groupFixture({ id: "uruguay-cabo-verde-2026-06-21", kickoffUtc: "2026-06-21T22:00:00Z", groupId: "H", homeTeamId: "URU", awayTeamId: "CPV", venue: "Miami Stadium" }),
  groupFixture({ id: "new-zealand-egypt-2026-06-21", kickoffUtc: "2026-06-22T01:00:00Z", groupId: "G", homeTeamId: "NZL", awayTeamId: "EGY", venue: "BC Place Vancouver" }),
  groupFixture({ id: "argentina-austria-2026-06-22", kickoffUtc: "2026-06-22T17:00:00Z", groupId: "J", homeTeamId: "ARG", awayTeamId: "AUT", venue: "Dallas Stadium" }),
  groupFixture({ id: "france-iraq-2026-06-22", kickoffUtc: "2026-06-22T21:00:00Z", groupId: "I", homeTeamId: "FRA", awayTeamId: "IRQ", venue: "Philadelphia Stadium" }),
  groupFixture({ id: "norway-senegal-2026-06-22", kickoffUtc: "2026-06-23T00:00:00Z", groupId: "I", homeTeamId: "NOR", awayTeamId: "SEN", venue: "New York New Jersey Stadium" }),
  groupFixture({ id: "jordan-algeria-2026-06-22", kickoffUtc: "2026-06-23T03:00:00Z", groupId: "J", homeTeamId: "JOR", awayTeamId: "ALG", venue: "San Francisco Bay Area Stadium" }),
  groupFixture({ id: "portugal-uzbekistan-2026-06-23", kickoffUtc: "2026-06-23T17:00:00Z", groupId: "K", homeTeamId: "POR", awayTeamId: "UZB", venue: "Houston Stadium" }),
  groupFixture({ id: "england-ghana-2026-06-23", kickoffUtc: "2026-06-23T20:00:00Z", groupId: "L", homeTeamId: "ENG", awayTeamId: "GHA", venue: "Boston Stadium" }),
  groupFixture({ id: "panama-croatia-2026-06-23", kickoffUtc: "2026-06-23T23:00:00Z", groupId: "L", homeTeamId: "PAN", awayTeamId: "CRO", venue: "Toronto Stadium" }),
  groupFixture({ id: "colombia-dr-congo-2026-06-23", kickoffUtc: "2026-06-24T02:00:00Z", groupId: "K", homeTeamId: "COL", awayTeamId: "COD", venue: "Estadio Guadalajara" }),
  groupFixture({ id: "switzerland-canada-2026-06-24", kickoffUtc: "2026-06-24T19:00:00Z", groupId: "B", homeTeamId: "SUI", awayTeamId: "CAN", venue: "BC Place Vancouver" }),
  groupFixture({ id: "bosnia-qatar-2026-06-24", kickoffUtc: "2026-06-24T19:00:00Z", groupId: "B", homeTeamId: "BIH", awayTeamId: "QAT", venue: "Seattle Stadium" }),
  groupFixture({ id: "scotland-brazil-2026-06-24", kickoffUtc: "2026-06-24T22:00:00Z", groupId: "C", homeTeamId: "SCO", awayTeamId: "BRA", venue: "Miami Stadium" }),
  groupFixture({ id: "morocco-haiti-2026-06-24", kickoffUtc: "2026-06-24T22:00:00Z", groupId: "C", homeTeamId: "MAR", awayTeamId: "HAI", venue: "Atlanta Stadium" }),
  groupFixture({ id: "czechia-mexico-2026-06-24", kickoffUtc: "2026-06-25T01:00:00Z", groupId: "A", homeTeamId: "CZE", awayTeamId: "MEX", venue: "Mexico City Stadium" }),
  groupFixture({ id: "south-africa-south-korea-2026-06-24", kickoffUtc: "2026-06-25T01:00:00Z", groupId: "A", homeTeamId: "RSA", awayTeamId: "KOR", venue: "Estadio Monterrey" }),
  groupFixture({ id: "ecuador-germany-2026-06-25", kickoffUtc: "2026-06-25T20:00:00Z", groupId: "E", homeTeamId: "ECU", awayTeamId: "GER", venue: "New York New Jersey Stadium" }),
  groupFixture({ id: "curacao-cote-divoire-2026-06-25", kickoffUtc: "2026-06-25T20:00:00Z", groupId: "E", homeTeamId: "CUW", awayTeamId: "CIV", venue: "Philadelphia Stadium" }),
  groupFixture({ id: "japan-sweden-2026-06-25", kickoffUtc: "2026-06-25T23:00:00Z", groupId: "F", homeTeamId: "JPN", awayTeamId: "SWE", venue: "Dallas Stadium" }),
  groupFixture({ id: "tunisia-netherlands-2026-06-25", kickoffUtc: "2026-06-25T23:00:00Z", groupId: "F", homeTeamId: "TUN", awayTeamId: "NED", venue: "Kansas City Stadium" }),
  groupFixture({ id: "turkiye-united-states-2026-06-25", kickoffUtc: "2026-06-26T02:00:00Z", groupId: "D", homeTeamId: "TUR", awayTeamId: "USA", venue: "Los Angeles Stadium" }),
  groupFixture({ id: "paraguay-australia-2026-06-25", kickoffUtc: "2026-06-26T02:00:00Z", groupId: "D", homeTeamId: "PAR", awayTeamId: "AUS", venue: "San Francisco Bay Area Stadium" }),
  groupFixture({ id: "norway-france-2026-06-26", kickoffUtc: "2026-06-26T19:00:00Z", groupId: "I", homeTeamId: "NOR", awayTeamId: "FRA", venue: "Boston Stadium" }),
  groupFixture({ id: "senegal-iraq-2026-06-26", kickoffUtc: "2026-06-26T19:00:00Z", groupId: "I", homeTeamId: "SEN", awayTeamId: "IRQ", venue: "Toronto Stadium" }),
  groupFixture({ id: "cabo-verde-saudi-arabia-2026-06-26", kickoffUtc: "2026-06-27T00:00:00Z", groupId: "H", homeTeamId: "CPV", awayTeamId: "KSA", venue: "Houston Stadium" }),
  groupFixture({ id: "uruguay-spain-2026-06-26", kickoffUtc: "2026-06-27T00:00:00Z", groupId: "H", homeTeamId: "URU", awayTeamId: "ESP", venue: "Estadio Guadalajara" }),
  groupFixture({ id: "egypt-ir-iran-2026-06-26", kickoffUtc: "2026-06-27T03:00:00Z", groupId: "G", homeTeamId: "EGY", awayTeamId: "IRN", venue: "Seattle Stadium" }),
  groupFixture({ id: "new-zealand-belgium-2026-06-26", kickoffUtc: "2026-06-27T03:00:00Z", groupId: "G", homeTeamId: "NZL", awayTeamId: "BEL", venue: "BC Place Vancouver" }),
  groupFixture({ id: "panama-england-2026-06-27", kickoffUtc: "2026-06-27T21:00:00Z", groupId: "L", homeTeamId: "PAN", awayTeamId: "ENG", venue: "New York New Jersey Stadium" }),
  groupFixture({ id: "croatia-ghana-2026-06-27", kickoffUtc: "2026-06-27T21:00:00Z", groupId: "L", homeTeamId: "CRO", awayTeamId: "GHA", venue: "Philadelphia Stadium" }),
  groupFixture({ id: "colombia-portugal-2026-06-27", kickoffUtc: "2026-06-27T23:30:00Z", groupId: "K", homeTeamId: "COL", awayTeamId: "POR", venue: "Miami Stadium" }),
  groupFixture({ id: "dr-congo-uzbekistan-2026-06-27", kickoffUtc: "2026-06-27T23:30:00Z", groupId: "K", homeTeamId: "COD", awayTeamId: "UZB", venue: "Atlanta Stadium" }),
  groupFixture({ id: "algeria-austria-2026-06-27", kickoffUtc: "2026-06-28T02:00:00Z", groupId: "J", homeTeamId: "ALG", awayTeamId: "AUT", venue: "Kansas City Stadium" }),
  groupFixture({ id: "jordan-argentina-2026-06-27", kickoffUtc: "2026-06-28T02:00:00Z", groupId: "J", homeTeamId: "JOR", awayTeamId: "ARG", venue: "Dallas Stadium" }),
  knockoutFixture({ id: "match-73-round-of-32-2026-06-28", matchNumber: 73, stage: "round-of-32", round: "round-of-32", kickoffUtc: "2026-06-28T19:00:00Z", homeSlot: "Group A runner-up", awaySlot: "Group B runner-up", venue: "Los Angeles Stadium" }),
  knockoutFixture({ id: "match-74-round-of-32-2026-06-29", matchNumber: 74, stage: "round-of-32", round: "round-of-32", kickoffUtc: "2026-06-29T20:30:00Z", homeSlot: "Group E winner", awaySlot: "Group A/B/C/D/F third place", venue: "Boston Stadium" }),
  knockoutFixture({ id: "match-75-round-of-32-2026-06-29", matchNumber: 75, stage: "round-of-32", round: "round-of-32", kickoffUtc: "2026-06-30T01:00:00Z", homeSlot: "Group F winner", awaySlot: "Group C runner-up", venue: "Estadio Monterrey" }),
  knockoutFixture({ id: "match-76-round-of-32-2026-06-29", matchNumber: 76, stage: "round-of-32", round: "round-of-32", kickoffUtc: "2026-06-29T17:00:00Z", homeSlot: "Group C winner", awaySlot: "Group F runner-up", venue: "Houston Stadium" }),
  knockoutFixture({ id: "match-77-round-of-32-2026-06-30", matchNumber: 77, stage: "round-of-32", round: "round-of-32", kickoffUtc: "2026-06-30T21:00:00Z", homeSlot: "Group I winner", awaySlot: "Group C/D/F/G/H third place", venue: "New York New Jersey Stadium" }),
  knockoutFixture({ id: "match-78-round-of-32-2026-06-30", matchNumber: 78, stage: "round-of-32", round: "round-of-32", kickoffUtc: "2026-06-30T17:00:00Z", homeSlot: "Group E runner-up", awaySlot: "Group I runner-up", venue: "Dallas Stadium" }),
  knockoutFixture({ id: "match-79-round-of-32-2026-06-30", matchNumber: 79, stage: "round-of-32", round: "round-of-32", kickoffUtc: "2026-07-01T01:00:00Z", homeSlot: "Group A winner", awaySlot: "Group C/E/F/H/I third place", venue: "Mexico City Stadium" }),
  knockoutFixture({ id: "match-80-round-of-32-2026-07-01", matchNumber: 80, stage: "round-of-32", round: "round-of-32", kickoffUtc: "2026-07-01T16:00:00Z", homeSlot: "Group L winner", awaySlot: "Group E/H/I/J/K third place", venue: "Atlanta Stadium" }),
  knockoutFixture({ id: "match-81-round-of-32-2026-07-01", matchNumber: 81, stage: "round-of-32", round: "round-of-32", kickoffUtc: "2026-07-02T00:00:00Z", homeSlot: "Group D winner", awaySlot: "Group B/E/F/I/J third place", venue: "San Francisco Bay Area Stadium" }),
  knockoutFixture({ id: "match-82-round-of-32-2026-07-01", matchNumber: 82, stage: "round-of-32", round: "round-of-32", kickoffUtc: "2026-07-01T20:00:00Z", homeSlot: "Group G winner", awaySlot: "Group A/E/H/I/J third place", venue: "Seattle Stadium" }),
  knockoutFixture({ id: "match-83-round-of-32-2026-07-02", matchNumber: 83, stage: "round-of-32", round: "round-of-32", kickoffUtc: "2026-07-02T23:00:00Z", homeSlot: "Group K runner-up", awaySlot: "Group L runner-up", venue: "Toronto Stadium" }),
  knockoutFixture({ id: "match-84-round-of-32-2026-07-02", matchNumber: 84, stage: "round-of-32", round: "round-of-32", kickoffUtc: "2026-07-02T19:00:00Z", homeSlot: "Group H winner", awaySlot: "Group J runner-up", venue: "Los Angeles Stadium" }),
  knockoutFixture({ id: "match-85-round-of-32-2026-07-02", matchNumber: 85, stage: "round-of-32", round: "round-of-32", kickoffUtc: "2026-07-03T03:00:00Z", homeSlot: "Group B winner", awaySlot: "Group E/F/G/I/J third place", venue: "BC Place Vancouver" }),
  knockoutFixture({ id: "match-86-round-of-32-2026-07-03", matchNumber: 86, stage: "round-of-32", round: "round-of-32", kickoffUtc: "2026-07-03T22:00:00Z", homeSlot: "Group J winner", awaySlot: "Group H runner-up", venue: "Miami Stadium" }),
  knockoutFixture({ id: "match-87-round-of-32-2026-07-03", matchNumber: 87, stage: "round-of-32", round: "round-of-32", kickoffUtc: "2026-07-04T01:30:00Z", homeSlot: "Group K winner", awaySlot: "Group D/E/I/J/L third place", venue: "Kansas City Stadium" }),
  knockoutFixture({ id: "match-88-round-of-32-2026-07-03", matchNumber: 88, stage: "round-of-32", round: "round-of-32", kickoffUtc: "2026-07-03T18:00:00Z", homeSlot: "Group D runner-up", awaySlot: "Group G runner-up", venue: "Dallas Stadium" }),
  knockoutFixture({ id: "match-89-round-of-16-2026-07-04", matchNumber: 89, stage: "round-of-16", round: "round-of-16", kickoffUtc: "2026-07-04T21:00:00Z", homeSlot: "Winner match 74", awaySlot: "Winner match 77", venue: "Philadelphia Stadium" }),
  knockoutFixture({ id: "match-90-round-of-16-2026-07-04", matchNumber: 90, stage: "round-of-16", round: "round-of-16", kickoffUtc: "2026-07-04T17:00:00Z", homeSlot: "Winner match 73", awaySlot: "Winner match 75", venue: "Houston Stadium" }),
  knockoutFixture({ id: "match-91-round-of-16-2026-07-05", matchNumber: 91, stage: "round-of-16", round: "round-of-16", kickoffUtc: "2026-07-05T20:00:00Z", homeSlot: "Winner match 76", awaySlot: "Winner match 78", venue: "New York New Jersey Stadium" }),
  knockoutFixture({ id: "match-92-round-of-16-2026-07-05", matchNumber: 92, stage: "round-of-16", round: "round-of-16", kickoffUtc: "2026-07-06T00:00:00Z", homeSlot: "Winner match 79", awaySlot: "Winner match 80", venue: "Mexico City Stadium" }),
  knockoutFixture({ id: "match-93-round-of-16-2026-07-06", matchNumber: 93, stage: "round-of-16", round: "round-of-16", kickoffUtc: "2026-07-06T19:00:00Z", homeSlot: "Winner match 83", awaySlot: "Winner match 84", venue: "Dallas Stadium" }),
  knockoutFixture({ id: "match-94-round-of-16-2026-07-06", matchNumber: 94, stage: "round-of-16", round: "round-of-16", kickoffUtc: "2026-07-07T00:00:00Z", homeSlot: "Winner match 81", awaySlot: "Winner match 82", venue: "Seattle Stadium" }),
  knockoutFixture({ id: "match-95-round-of-16-2026-07-07", matchNumber: 95, stage: "round-of-16", round: "round-of-16", kickoffUtc: "2026-07-07T16:00:00Z", homeSlot: "Winner match 86", awaySlot: "Winner match 88", venue: "Atlanta Stadium" }),
  knockoutFixture({ id: "match-96-round-of-16-2026-07-07", matchNumber: 96, stage: "round-of-16", round: "round-of-16", kickoffUtc: "2026-07-07T20:00:00Z", homeSlot: "Winner match 85", awaySlot: "Winner match 87", venue: "BC Place Vancouver" }),
  knockoutFixture({ id: "match-97-quarter-final-2026-07-09", matchNumber: 97, stage: "quarter-finals", round: "quarter-finals", kickoffUtc: "2026-07-09T20:00:00Z", homeSlot: "Winner match 89", awaySlot: "Winner match 90", venue: "Boston Stadium" }),
  knockoutFixture({ id: "match-98-quarter-final-2026-07-10", matchNumber: 98, stage: "quarter-finals", round: "quarter-finals", kickoffUtc: "2026-07-10T19:00:00Z", homeSlot: "Winner match 93", awaySlot: "Winner match 94", venue: "Los Angeles Stadium" }),
  knockoutFixture({ id: "match-99-quarter-final-2026-07-11", matchNumber: 99, stage: "quarter-finals", round: "quarter-finals", kickoffUtc: "2026-07-11T21:00:00Z", homeSlot: "Winner match 91", awaySlot: "Winner match 92", venue: "Miami Stadium" }),
  knockoutFixture({ id: "match-100-quarter-final-2026-07-11", matchNumber: 100, stage: "quarter-finals", round: "quarter-finals", kickoffUtc: "2026-07-12T01:00:00Z", homeSlot: "Winner match 95", awaySlot: "Winner match 96", venue: "Kansas City Stadium" }),
  knockoutFixture({ id: "match-101-semi-final-2026-07-14", matchNumber: 101, stage: "semi-finals", round: "semi-finals", kickoffUtc: "2026-07-14T19:00:00Z", homeSlot: "Winner match 97", awaySlot: "Winner match 98", venue: "Dallas Stadium" }),
  knockoutFixture({ id: "match-102-semi-final-2026-07-15", matchNumber: 102, stage: "semi-finals", round: "semi-finals", kickoffUtc: "2026-07-15T19:00:00Z", homeSlot: "Winner match 99", awaySlot: "Winner match 100", venue: "Atlanta Stadium" }),
  knockoutFixture({ id: "match-103-bronze-final-2026-07-18", matchNumber: 103, stage: "bronze-final", round: "bronze-final", kickoffUtc: "2026-07-18T21:00:00Z", homeSlot: "Runner-up match 101", awaySlot: "Runner-up match 102", venue: "Miami Stadium" }),
  knockoutFixture({ id: "match-104-final-2026-07-19", matchNumber: 104, stage: "final", round: "final", kickoffUtc: "2026-07-19T19:00:00Z", homeSlot: "Winner match 101", awaySlot: "Winner match 102", venue: "New York New Jersey Stadium" })
];

const fixtures = skeleton.map((fixture) => ({
  ...fixture,
  ...existingById.get(fixture.id),
  id: fixture.id,
  stage: fixture.stage,
  round: fixture.round,
  groupId: fixture.groupId,
  kickoffUtc: fixture.kickoffUtc,
  homeTeamId: fixture.homeTeamId,
  awayTeamId: fixture.awayTeamId,
  homeSlot: fixture.homeSlot,
  awaySlot: fixture.awaySlot,
  venue: fixture.venue,
  matchNumber: fixture.matchNumber
}));

const nextData = {
  updatedAt: "2026-06-17T11:40:00-07:00",
  sourceIds,
  coverage: {
    status: "complete-schedule",
    loadedDateRange: ["2026-06-11", "2026-07-19"],
    note:
      "Full tournament fixture skeleton is loaded. Rich previews, H2H, live status, scores and knockout participants are updated progressively."
  },
  fixtures
};

await writeFile(fixturesPath, `${JSON.stringify(nextData, null, 2)}\n`);
console.log(`Wrote ${fixtures.length} fixtures to ${path.relative(root, fixturesPath)}.`);
