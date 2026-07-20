#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const FIFA_API_URL = "https://api.fifa.com/api/v3/calendar/matches";
const DEFAULT_FIFA_SCHEDULE_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums";
const COMPLETED_STATUSES = new Set(["FT", "AET", "PEN"]);
const OFFICIAL_STAGE_NAMES = new Map([
  ["group", new Set(["first stage", "group stage"])],
  ["round-of-32", new Set(["round of 32"])],
  ["round-of-16", new Set(["round of 16"])],
  ["quarter-finals", new Set(["quarter final", "quarter finals"])],
  ["semi-finals", new Set(["semi final", "semi finals"])],
  ["bronze-final", new Set(["bronze final", "third place play off"])],
  ["final", new Set(["final"])]
]);
const OFFICIAL_VENUE_ALIASES = new Map([
  ["estadio guadalajara", "guadalajara stadium"],
  ["estadio monterrey", "monterrey stadium"]
]);

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

function descriptions(values) {
  return Array.isArray(values)
    ? values.map((value) => value?.Description).filter(Boolean)
    : [];
}

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function normalizedOfficialVenue(value) {
  const key = normalizeKey(value);
  return OFFICIAL_VENUE_ALIASES.get(key) || key;
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildTeamLookup(teams) {
  const byName = new Map();

  for (const team of teams || []) {
    for (const value of [team.id, team.name, team.officialName, team.standingName, ...(team.aliases || [])]) {
      const key = normalizeKey(value);
      if (key && !byName.has(key)) {
        byName.set(key, team.id);
      }
    }
  }

  return byName;
}

function participantAbbreviation(match, side) {
  return match?.[side]?.Abbreviation || "";
}

function getOfficialParticipantNames(participant) {
  if (!participant) {
    return [];
  }

  return [
    participant.Abbreviation,
    participant.IdCountry,
    participant.IdAssociation,
    participant.Name,
    participant.ShortName,
    participant.DisplayName,
    ...descriptions(participant.TeamName),
    ...descriptions(participant.NameLocalized),
    ...descriptions(participant.ShortClubName)
  ].filter(Boolean);
}

function findOfficialParticipantTeamId(match, side, teamLookup) {
  for (const name of getOfficialParticipantNames(match?.[side])) {
    const teamId = teamLookup.get(normalizeKey(name));
    if (teamId) {
      return teamId;
    }
  }

  return "";
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
  url.searchParams.set("idCompetition", fifaCompetitionId);
  url.searchParams.set("idSeason", fifaSeasonId);
  url.searchParams.set("from", from);
  url.searchParams.set("to", addDays(to, 1));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`FIFA schedule request failed with ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

function scoreWinnerTeamId(fixture, score = fixture?.score) {
  const home = Number(score?.home);
  const away = Number(score?.away);
  if (!Number.isFinite(home) || !Number.isFinite(away) || home === away) return "";
  return home > away ? fixture.homeTeamId : fixture.awayTeamId;
}

function localWinnerTeamId(fixture) {
  return String(fixture.winnerTeamId || "").trim() ||
    scoreWinnerTeamId(fixture, fixture.scoreDetails?.penalties) ||
    scoreWinnerTeamId(fixture);
}

function officialWinnerTeamId(match, teamLookup) {
  const winnerId = String(match?.Winner || "");
  if (!winnerId) return "";
  if (winnerId === String(match?.Home?.IdTeam || "")) {
    return findOfficialParticipantTeamId(match, "Home", teamLookup);
  }
  if (winnerId === String(match?.Away?.IdTeam || "")) {
    return findOfficialParticipantTeamId(match, "Away", teamLookup);
  }
  return "";
}

const [fixturesData, teamsData, lifecycle] = await Promise.all([
  readJson("fixtures.json"),
  readJson("teams.json"),
  readJson("edition-lifecycle.json")
]);
const fifaCompetitionId = process.env.FIFA_COMPETITION_ID || lifecycle.liveData?.competitionId;
const fifaSeasonId = process.env.FIFA_SEASON_ID || lifecycle.liveData?.seasonId;
const fifaScheduleUrl = lifecycle.liveData?.scheduleUrl || DEFAULT_FIFA_SCHEDULE_URL;
if (lifecycle.liveData?.provider !== "fifa" || !fifaCompetitionId || !fifaSeasonId) {
  throw new Error("Edition lifecycle must include FIFA live-data competition and season identifiers.");
}
const officialData = await fetchOfficialSchedule(fixturesData);
const officialMatches = officialData.Results || [];
const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
const teamLookup = buildTeamLookup(teamsData.teams);
const officialByMatchNumber = new Map();
const officialByParticipants = new Map();
const failures = [];
let checkedResultCount = 0;
let checkedPenaltyCount = 0;
let checkedExtraTimeCount = 0;

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

  const officialStage = normalizeKey(description(officialMatch.StageName));
  const allowedStageNames = OFFICIAL_STAGE_NAMES.get(fixture.stage);
  if (!allowedStageNames?.has(officialStage)) {
    failures.push(
      `${fixtureLabel(teamsById, fixture)} stage mismatch. Local data: ${fixture.stage}; FIFA feed: ${description(officialMatch.StageName) || "unknown"}.`
    );
  }

  const officialVenue = description(officialMatch.Stadium?.Name);
  if (normalizedOfficialVenue(fixture.venue) !== normalizedOfficialVenue(officialVenue)) {
    failures.push(
      `${fixtureLabel(teamsById, fixture)} venue mismatch. Local data: ${fixture.venue}; FIFA feed: ${officialVenue || "unknown"}.`
    );
  }

  if (
    officialMatch.IdMatch &&
    String(fixture.providerIds?.fifa?.matchId || "") !== String(officialMatch.IdMatch)
  ) {
    failures.push(
      `${fixtureLabel(teamsById, fixture)} FIFA match id mismatch. Local data: ${fixture.providerIds?.fifa?.matchId || "missing"}; FIFA feed: ${officialMatch.IdMatch}.`
    );
  }

  for (const side of ["Home", "Away"]) {
    const officialTeamId = findOfficialParticipantTeamId(officialMatch, side, teamLookup);
    const localTeamId = side === "Home" ? fixture.homeTeamId : fixture.awayTeamId;
    if (officialTeamId && localTeamId !== officialTeamId) {
      failures.push(
        [
          `${fixtureLabel(teamsById, fixture)} ${side.toLowerCase()} participant mismatch.`,
          `  Local data: ${localTeamId || "TBD"}`,
          `  FIFA feed:  ${officialTeamId}`,
          `  FIFA row:   ${participantName(officialMatch, "Home")} vs ${participantName(officialMatch, "Away")}`
        ].join("\n")
      );
    }
  }

  const officialHomeScore = optionalNumber(officialMatch.HomeTeamScore ?? officialMatch.Home?.Score);
  const officialAwayScore = optionalNumber(officialMatch.AwayTeamScore ?? officialMatch.Away?.Score);
  const hasOfficialResult = officialHomeScore !== null && officialAwayScore !== null;
  if (!hasOfficialResult) {
    if (COMPLETED_STATUSES.has(fixture.status)) {
      failures.push(`${fixtureLabel(teamsById, fixture)} is final locally but FIFA's feed has no final score.`);
    }
    continue;
  }

  checkedResultCount += 1;
  if (!COMPLETED_STATUSES.has(fixture.status)) {
    failures.push(`${fixtureLabel(teamsById, fixture)} has a FIFA result but local status is ${fixture.status || "missing"}.`);
  }
  if (fixture.score?.home !== officialHomeScore || fixture.score?.away !== officialAwayScore) {
    failures.push(
      `${fixtureLabel(teamsById, fixture)} score mismatch. Local data: ${fixture.score?.home ?? "?"}-${fixture.score?.away ?? "?"}; FIFA feed: ${officialHomeScore}-${officialAwayScore}.`
    );
  }

  const officialHomePenalties = optionalNumber(officialMatch.HomeTeamPenaltyScore);
  const officialAwayPenalties = optionalNumber(officialMatch.AwayTeamPenaltyScore);
  const hasOfficialPenalties = officialHomePenalties !== null && officialAwayPenalties !== null;
  if (hasOfficialPenalties) {
    checkedPenaltyCount += 1;
    if (
      fixture.scoreDetails?.penalties?.home !== officialHomePenalties ||
      fixture.scoreDetails?.penalties?.away !== officialAwayPenalties
    ) {
      failures.push(
        `${fixtureLabel(teamsById, fixture)} shootout mismatch. Local data: ${fixture.scoreDetails?.penalties?.home ?? "?"}-${fixture.scoreDetails?.penalties?.away ?? "?"}; FIFA feed: ${officialHomePenalties}-${officialAwayPenalties}.`
      );
    }
  } else if (fixture.scoreDetails?.penalties) {
    failures.push(`${fixtureLabel(teamsById, fixture)} has a local shootout score but FIFA's feed does not.`);
  }

  if (Number(officialMatch.ResultType) === 3) checkedExtraTimeCount += 1;
  if (Number(officialMatch.ResultType) === 2 && !hasOfficialPenalties) {
    failures.push(`${fixtureLabel(teamsById, fixture)} is a FIFA shootout result without penalty totals.`);
  }

  const officialWinner = officialWinnerTeamId(officialMatch, teamLookup);
  const localWinner = localWinnerTeamId(fixture);
  if (officialWinner !== localWinner) {
    failures.push(
      `${fixtureLabel(teamsById, fixture)} winner mismatch. Local data: ${localWinner || "draw"}; FIFA feed: ${officialWinner || "draw"}.`
    );
  }
}

const expectedFixtureCount = Number(lifecycle.expected?.fixtureCount) || (fixturesData.fixtures || []).length;
if ((fixturesData.fixtures || []).length !== expectedFixtureCount) {
  failures.push(
    `Local fixture count is ${(fixturesData.fixtures || []).length}; lifecycle expects ${expectedFixtureCount}.`
  );
}
if (officialMatches.length !== expectedFixtureCount) {
  failures.push(
    `Fixture count mismatch. Lifecycle expects ${expectedFixtureCount}; FIFA feed returned ${officialMatches.length}.`
  );
}

console.log(`FIFA schedule source: ${fifaScheduleUrl}`);
console.log(`Checked ${(fixturesData.fixtures || []).length} local fixture(s) against ${officialMatches.length} FIFA fixture(s).`);
console.log(`Verified ${checkedResultCount} scores and winners, including ${checkedPenaltyCount} shootouts and ${checkedExtraTimeCount} extra-time results.`);

if (failures.length) {
  console.log("");
  console.log(`Failures: ${failures.length}`);
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
  process.exit(1);
}

console.log("All local kickoffs, participants, stages, venues, provider ids, scores, shootouts, and winners match FIFA's current feed.");
