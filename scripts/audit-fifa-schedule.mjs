#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const FIFA_API_URL = "https://api.fifa.com/api/v3/calendar/matches";
const FIFA_SCHEDULE_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums";
const FIFA_COMPETITION_ID = "17";
const FIFA_SEASON_ID = "285023";

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

function addDays(dayKey, days) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function description(values) {
  return values?.find((value) => value.Locale === "en-GB")?.Description || values?.[0]?.Description || "";
}

function participantAbbreviation(match, side) {
  return match?.[side]?.Abbreviation || "";
}

function participantName(match, side) {
  return description(match?.[side]?.TeamName) || participantAbbreviation(match, side) || "TBD";
}

function localParticipantName(teamsById, fixture, side) {
  const teamId = side === "Home" ? fixture.homeTeamId : fixture.awayTeamId;
  const slot = side === "Home" ? fixture.homeSlot : fixture.awaySlot;
  return teamsById.get(teamId)?.name || slot || teamId || "TBD";
}

function fixtureLabel(teamsById, fixture) {
  const matchNumber = fixture.matchNumber ? ` #${fixture.matchNumber}` : "";
  return `${fixture.id}${matchNumber} (${localParticipantName(teamsById, fixture, "Home")} vs ${localParticipantName(teamsById, fixture, "Away")})`;
}

async function fetchOfficialSchedule(fixturesData) {
  const [from, to] = fixturesData.coverage?.loadedDateRange || ["2026-06-11", "2026-07-19"];
  const url = new URL(FIFA_API_URL);
  url.searchParams.set("language", "en");
  url.searchParams.set("count", "500");
  url.searchParams.set("idCompetition", FIFA_COMPETITION_ID);
  url.searchParams.set("idSeason", FIFA_SEASON_ID);
  url.searchParams.set("from", from);
  url.searchParams.set("to", addDays(to, 1));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`FIFA schedule request failed with ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

const [fixturesData, teamsData] = await Promise.all([readJson("fixtures.json"), readJson("teams.json")]);
const officialData = await fetchOfficialSchedule(fixturesData);
const officialMatches = officialData.Results || [];
const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
const officialByMatchNumber = new Map();
const officialByParticipants = new Map();
const failures = [];

for (const match of officialMatches) {
  if (match.MatchNumber) {
    officialByMatchNumber.set(Number(match.MatchNumber), match);
  }

  const home = participantAbbreviation(match, "Home");
  const away = participantAbbreviation(match, "Away");
  if (home && away) {
    officialByParticipants.set(`${home}:${away}`, match);
  }
}

for (const fixture of fixturesData.fixtures || []) {
  const officialMatch = fixture.matchNumber
    ? officialByMatchNumber.get(Number(fixture.matchNumber))
    : officialByParticipants.get(`${fixture.homeTeamId}:${fixture.awayTeamId}`);

  if (!officialMatch) {
    failures.push(`${fixtureLabel(teamsById, fixture)} was not found in FIFA's schedule feed.`);
    continue;
  }

  if (fixture.kickoffUtc !== officialMatch.Date) {
    failures.push(
      [
        `${fixtureLabel(teamsById, fixture)} kickoff mismatch.`,
        `  Local data: ${fixture.kickoffUtc}`,
        `  FIFA feed:  ${officialMatch.Date}`,
        `  FIFA local: ${officialMatch.LocalDate || "unknown"}`,
        `  FIFA row:   ${participantName(officialMatch, "Home")} vs ${participantName(officialMatch, "Away")}`
      ].join("\n")
    );
  }
}

if (officialMatches.length !== (fixturesData.fixtures || []).length) {
  failures.push(
    `Fixture count mismatch. Local data has ${(fixturesData.fixtures || []).length}; FIFA feed returned ${officialMatches.length}.`
  );
}

console.log(`FIFA schedule source: ${FIFA_SCHEDULE_URL}`);
console.log(`Checked ${(fixturesData.fixtures || []).length} local fixture(s) against ${officialMatches.length} FIFA fixture(s).`);

if (failures.length) {
  console.log("");
  console.log(`Failures: ${failures.length}`);
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
  process.exit(1);
}

console.log("All local kickoff times match FIFA's schedule feed.");
