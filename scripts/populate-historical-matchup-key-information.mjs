#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const historyPath = path.join(root, "data", "history.json");
const historyOutputPath = process.env.HISTORICAL_MATCHUP_OUTPUT_PATH
  ? path.resolve(process.env.HISTORICAL_MATCHUP_OUTPUT_PATH)
  : historyPath;
const historicalProfilesPath = path.join(root, "data", "historical-player-profiles.json");
const fjelstulCommit = "35a8667f518b07469182ae16d35574dd0e7a00fb";
const fjelstulSha256 = "8b8888a0c4446840ac5fe65f594ba93f9fa13f3627c03f7c39c5dd2ed0b40018";
const fjelstulCachePath = process.env.FJELSTUL_WORLDCUP_JSON || "/tmp/fjelstul-worldcup.json";
const fjelstulUrl = `https://raw.githubusercontent.com/jfjelstul/worldcup/${fjelstulCommit}/data-json/worldcup.json`;
const sourceId = "matchup-archive-present-tense-2026-07-22";
const fjelstulSourceId = "fjelstul-worldcup-json-35a8667f";
const supersededFjelstulSourceId = "fjelstul-worldcup-json-2026-06-23";
const supersededNarrativeSourceId = "matchup-pre-match-reconstruction-2026-07-22";
const fixtureSourceId = "openfootball-worldcup-json-2026-06-17";
const generator = "scripts/populate-historical-matchup-key-information.mjs";
const schemaVersion = 4;
const localeModelVersion = 2;
const excludedInputs = ["score", "winner", "currentMatchEvents", "cards", "substitutions", "shootout"];

const teamAliases = new Map([
  ["usa", "united states"],
  ["u s a", "united states"],
  ["bosnia herzegovina", "bosnia and herzegovina"],
  ["cote d ivoire", "ivory coast"],
  ["ireland", "republic of ireland"]
]);

const forwardCodes = new Set(["FW", "CF", "ST", "SS", "LW", "RW", "LF", "RF"]);
const midfieldCodes = new Set(["MF", "CM", "DM", "AM", "LM", "RM"]);
const defenderCodes = new Set(["DF", "LB", "RB", "CB", "SW", "LWB", "RWB", "WB"]);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function loadFjelstulData() {
  try {
    const raw = await readFile(fjelstulCachePath, "utf8");
    return parsePinnedFjelstul(raw, fjelstulCachePath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  const response = await fetch(fjelstulUrl);
  if (!response.ok) {
    throw new Error(`Unable to fetch ${fjelstulUrl}: ${response.status} ${response.statusText}`);
  }

  return parsePinnedFjelstul(await response.text(), fjelstulUrl);
}

function parsePinnedFjelstul(raw, origin) {
  const digest = createHash("sha256").update(raw).digest("hex");
  if (digest !== fjelstulSha256) {
    throw new Error(`Pinned Fjelstul checksum mismatch for ${origin}: expected ${fjelstulSha256}, found ${digest}`);
  }
  return JSON.parse(raw);
}

function normalizeTeamName(value) {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return teamAliases.get(normalized) || normalized;
}

function normalizePersonKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function teamPairKey(teamA, teamB) {
  return [normalizeTeamName(teamA), normalizeTeamName(teamB)].sort().join("|");
}

function matchKey(year, date, teamA, teamB) {
  return [year, date, teamPairKey(teamA, teamB)].join("|");
}

function groupBy(items, getKey) {
  const grouped = new Map();
  for (const item of items || []) {
    const key = getKey(item);
    const bucket = grouped.get(key) || [];
    bucket.push(item);
    grouped.set(key, bucket);
  }
  return grouped;
}

function personName(row) {
  const given = row?.given_name && row.given_name !== "not applicable" ? row.given_name : "";
  const family = row?.family_name && row.family_name !== "not applicable" ? row.family_name : "";
  if (given && family && normalizePersonKey(given).endsWith(normalizePersonKey(family))) {
    return given;
  }
  return [given, family].filter(Boolean).join(" ") || row?.player_name || "";
}

function managerName(row) {
  return personName(row);
}

function positionGroup(row) {
  const code = String(row?.position_code || "").toUpperCase();
  if (code === "GK") {
    return "goalkeeper";
  }
  if (defenderCodes.has(code)) {
    return "defender";
  }
  if (midfieldCodes.has(code)) {
    return "midfielder";
  }
  if (forwardCodes.has(code)) {
    return "forward";
  }
  return "player";
}

function nameSeries(names) {
  const cleanNames = [...new Set(names.filter(Boolean))];
  if (cleanNames.length <= 1) {
    return cleanNames.join("");
  }
  if (cleanNames.length === 2) {
    return cleanNames.join(" and ");
  }
  return `${cleanNames.slice(0, -1).join(", ")}, and ${cleanNames.at(-1)}`;
}

function possessive(teamName) {
  const value = String(teamName || "").trim();
  return /s$/iu.test(value) ? `${value}'` : `${value}'s`;
}

function naturalizeEnglishTeamArticles(value) {
  let copy = String(value || "");
  for (const teamName of ["United States", "Soviet Union", "Netherlands"]) {
    const bareTeam = new RegExp(`(?<!\\bthe\\s)\\b${teamName}\\b`, "giu");
    copy = copy.replace(bareTeam, (match, offset, fullCopy) => {
      const prefix = fullCopy.slice(0, offset);
      const startsSentence = !prefix.trim() || /[.!?]\s*$/u.test(prefix);
      return `${startsSentence ? "The" : "the"} ${match}`;
    });
  }
  return copy;
}

function sourceTeamForFixtureSide(fixture, sourceMatch, side) {
  const fixtureTeam = side === "home" ? fixture.homeSlot : fixture.awaySlot;
  if (normalizeTeamName(fixtureTeam) === normalizeTeamName(sourceMatch.home_team_name)) {
    return { sourceSide: "home", teamId: sourceMatch.home_team_id, teamName: sourceMatch.home_team_name };
  }
  if (normalizeTeamName(fixtureTeam) === normalizeTeamName(sourceMatch.away_team_name)) {
    return { sourceSide: "away", teamId: sourceMatch.away_team_id, teamName: sourceMatch.away_team_name };
  }
  throw new Error(`Unable to align ${fixture.id} ${side} side with ${sourceMatch.match_id}`);
}

function emptyRecordContext() {
  return {
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    cleanSheets: 0,
    points: 0
  };
}

function emptyTeamContext() {
  return {
    ...emptyRecordContext(),
    byStage: new Map()
  };
}

function getTeamContext(contextByTeam, tournamentYear, teamName) {
  const key = `${tournamentYear}|${normalizeTeamName(teamName)}`;
  if (!contextByTeam.has(key)) {
    contextByTeam.set(key, emptyTeamContext());
  }
  return contextByTeam.get(key);
}

function countWord(number, singular, plural = `${singular}s`) {
  return `${number} ${number === 1 ? singular : plural}`;
}

function goalsScoredPhrase(number) {
  return Number(number) === 0 ? "no goals scored" : `${countWord(number, "goal")} scored`;
}

function goalsConcededPhrase(number) {
  return Number(number) === 0 ? "no goals conceded" : `${countWord(number, "goal")} conceded`;
}

function hasGroupStagePoints(tournamentYear) {
  return ![1934, 1938].includes(Number(tournamentYear));
}

function recordSnapshot(
  context,
  tournamentYear,
  { pointsApplicable = hasGroupStagePoints(tournamentYear), scope = "tournament" } = {}
) {
  return {
    matches: context.matches,
    wins: context.wins,
    draws: context.draws,
    losses: context.losses,
    goalsFor: context.goalsFor,
    goalsAgainst: context.goalsAgainst,
    cleanSheets: context.cleanSheets,
    points: context.points,
    pointsApplicable,
    scope
  };
}

function phaseUsesStandings(phase) {
  return ["group-stage", "second-group-stage", "final-round"].includes(phase);
}

function phaseStartsNewStandings(phase) {
  return ["second-group-stage", "final-round"].includes(phase);
}

function stableVariant(value, count = 3) {
  let hash = 0;
  for (const character of String(value || "")) {
    hash = (hash * 31 + character.codePointAt(0)) >>> 0;
  }
  return hash % count;
}

function sourceStagePhase(fixture, sourceMatch) {
  const round = String(fixture.round || "");
  const lower = round.toLowerCase();
  if (lower.includes("third") || lower.includes("match for third")) {
    return "third-place-match";
  }
  if (lower.includes("replay")) {
    return "knockout-replay";
  }
  if (lower.includes("play-off")) {
    return "group-play-off";
  }
  const sourceStage = String(sourceMatch?.stage_name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (sourceStage) {
    return sourceStage;
  }
  if (lower === "final round") return "final-round";
  if (lower === "final") return "final";
  if (lower.includes("third")) return "third-place-match";
  if (lower.includes("semi")) return "semi-finals";
  if (lower.includes("quarter")) return "quarter-finals";
  if (lower.includes("round of 16") || lower.includes("first round")) return "round-of-16";
  return fixture.group ? "group-stage" : "tournament-stage";
}

function sourceGroup(fixture, sourceMatch) {
  const sourceValue = String(sourceMatch?.group_name || "");
  if (sourceValue && sourceValue !== "not applicable") return sourceValue;
  return String(fixture.group || "");
}

function stagePhrase(fixture, sourceMatch) {
  const round = String(fixture.round || "");
  const lower = round.toLowerCase();
  const year = fixture.tournamentYear;
  const phase = sourceStagePhase(fixture, sourceMatch);
  const group = sourceGroup(fixture, sourceMatch);

  if (phase === "second-group-stage") {
    return group ? `${group} of the ${year} second group stage` : `the ${year} second group stage`;
  }
  if (phase === "group-stage") {
    return `${group || "the group stage"} at the ${year} tournament`;
  }
  if (phase === "final-round") {
    return `the ${year} final-round group`;
  }
  if (phase === "final") {
    return `the ${year} final`;
  }
  if (phase === "third-place-match") {
    return `the ${year} third-place match`;
  }
  if (phase === "semi-finals") {
    return `a ${year} semi-final`;
  }
  if (phase === "quarter-finals") {
    return `a ${year} quarter-final`;
  }
  if (phase === "round-of-16") {
    return `a ${year} round-of-16 match`;
  }
  if (phase === "knockout-replay") {
    if (lower.includes("quarter")) return `a ${year} quarter-final replay`;
    if (lower.includes("round of 16") || lower.includes("first round")) return `a ${year} round-of-16 replay`;
    return `a ${year} knockout replay`;
  }
  if (phase === "group-play-off") {
    return `the ${year} ${round || "group play-off"}`;
  }
  return `${round || "this stage"} at the ${year} tournament`;
}

function historicalStageModel(fixture, sourceMatch) {
  return {
    year: Number(fixture.tournamentYear),
    round: String(fixture.round || ""),
    group: sourceGroup(fixture, sourceMatch),
    phase: sourceStagePhase(fixture, sourceMatch)
  };
}

function stageContextKey(fixture, sourceMatch) {
  return `${sourceStagePhase(fixture, sourceMatch)}|${sourceGroup(fixture, sourceMatch)}`;
}

function getStageContext(teamContext, fixture, sourceMatch) {
  const key = stageContextKey(fixture, sourceMatch);
  if (!teamContext.byStage.has(key)) {
    teamContext.byStage.set(key, emptyRecordContext());
  }
  return teamContext.byStage.get(key);
}

function fixtureKickoffMoment(fixture) {
  const localTime = String(fixture.localTime || "00:00").trim();
  const parsed = localTime.match(/^(\d{1,2}):(\d{2})(?:\s+UTC([+-])(\d{1,2})(?::(\d{2}))?)?$/i);
  if (!parsed || !parsed[3]) {
    return `${fixture.date}T${localTime}`;
  }
  const [, hours, minutes, sign, offsetHours, offsetMinutes = "0"] = parsed;
  const offset = (Number(offsetHours) * 60 + Number(offsetMinutes)) * (sign === "+" ? 1 : -1);
  const [year, month, day] = String(fixture.date).split("-").map(Number);
  const utcMillis = Date.UTC(year, month - 1, day, Number(hours), Number(minutes)) - offset * 60_000;
  return new Date(utcMillis).toISOString().slice(0, 16);
}

function stageTableKey(fixture, sourceMatch) {
  return `${fixture.tournamentYear}|${sourceStagePhase(fixture, sourceMatch)}|${sourceGroup(fixture, sourceMatch)}`;
}

function buildPreMatchTableEvidence(fixtures, indexes) {
  const entries = [];
  const tableRecords = new Map();
  const lastMomentByTable = new Map();

  for (const fixture of fixtures) {
    if (fixture.status === "CANCELLED") continue;
    const sourceMatch = indexes.matchesByFixtureKey.get(
      matchKey(fixture.tournamentYear, fixture.date, fixture.homeSlot, fixture.awaySlot)
    );
    if (!sourceMatch) continue;
    const phase = sourceStagePhase(fixture, sourceMatch);
    if (!phaseUsesStandings(phase)) continue;
    const tableKey = stageTableKey(fixture, sourceMatch);
    const moment = fixtureKickoffMoment(fixture);
    const records = tableRecords.get(tableKey) || new Map();
    for (const teamName of [fixture.homeSlot, fixture.awaySlot]) {
      const normalizedTeam = normalizeTeamName(teamName);
      if (!records.has(normalizedTeam)) {
        records.set(normalizedTeam, { teamName, ...emptyRecordContext() });
      }
    }
    tableRecords.set(tableKey, records);
    if (!lastMomentByTable.has(tableKey) || moment > lastMomentByTable.get(tableKey)) {
      lastMomentByTable.set(tableKey, moment);
    }
    entries.push({ fixture, sourceMatch, phase, tableKey, moment });
  }

  const evidenceByFixtureId = new Map();
  const entriesByMoment = groupBy(entries, (entry) => entry.moment);
  for (const moment of [...entriesByMoment.keys()].sort()) {
    const batch = entriesByMoment.get(moment);
    for (const entry of batch) {
      const concurrentEntries = batch.filter((candidate) => candidate.tableKey === entry.tableKey);
      const records = tableRecords.get(entry.tableKey);
      evidenceByFixtureId.set(entry.fixture.id, {
        phase: entry.phase,
        group: sourceGroup(entry.fixture, entry.sourceMatch),
        isTerminal: lastMomentByTable.get(entry.tableKey) === moment,
        records: [...records.values()].map((record) => ({ ...record })),
        concurrentFixtures: concurrentEntries.map(({ fixture }) => ({
          id: fixture.id,
          home: fixture.homeSlot,
          away: fixture.awaySlot
        }))
      });
    }

    // Results at one kickoff are applied only after every concurrent fixture has
    // received the same pre-match table snapshot.
    for (const { fixture, tableKey } of batch) {
      if (!fixture.score) continue;
      const records = tableRecords.get(tableKey);
      const homeRecord = records.get(normalizeTeamName(fixture.homeSlot));
      const awayRecord = records.get(normalizeTeamName(fixture.awaySlot));
      updateRecordContext(homeRecord, fixture.score.home, fixture.score.away, fixture.tournamentYear, true);
      updateRecordContext(awayRecord, fixture.score.away, fixture.score.home, fixture.tournamentYear, true);
    }
  }

  return evidenceByFixtureId;
}

function tableRecordForTeam(tableEvidence, teamName) {
  return tableEvidence?.records?.find(
    (record) => normalizeTeamName(record.teamName) === normalizeTeamName(teamName)
  );
}

function standingModel(tableEvidence, teamName, opponentName) {
  const teamRecord = tableRecordForTeam(tableEvidence, teamName);
  const opponentRecord = tableRecordForTeam(tableEvidence, opponentName);
  if (!teamRecord || !opponentRecord) return null;
  const higherPointsTeams = tableEvidence.records.filter((record) => record.points > teamRecord.points).length;
  const equalPointsTeams = tableEvidence.records.filter((record) => record.points === teamRecord.points).length;
  return {
    teamMatches: teamRecord.matches,
    opponentMatches: opponentRecord.matches,
    pointRelation:
      teamRecord.points > opponentRecord.points
        ? "ahead"
        : teamRecord.points < opponentRecord.points
          ? "behind"
          : "level",
    pointBandStart: higherPointsTeams + 1,
    pointBandSize: equalPointsTeams,
    tableTeamCount: tableEvidence.records.length
  };
}

function resultPoints(result) {
  if (result === "win") return 3;
  if (result === "draw") return 1;
  return 0;
}

function deriveTerminalScenario(fixture, teamName, tableEvidence) {
  const year = Number(fixture.tournamentYear);
  if (
    year < 1998 ||
    year > 2022 ||
    tableEvidence?.phase !== "group-stage" ||
    !tableEvidence.isTerminal ||
    tableEvidence.records.length !== 4 ||
    tableEvidence.concurrentFixtures.length !== 2
  ) {
    return null;
  }

  const concurrentTeams = new Set(
    tableEvidence.concurrentFixtures.flatMap((candidate) => [
      normalizeTeamName(candidate.home),
      normalizeTeamName(candidate.away)
    ])
  );
  if (concurrentTeams.size !== 4 || ![...tableEvidence.records].every((record) => record.matches === 2)) {
    return null;
  }

  const normalizedTeam = normalizeTeamName(teamName);
  const currentFixture = tableEvidence.concurrentFixtures.find(
    (candidate) =>
      normalizeTeamName(candidate.home) === normalizedTeam || normalizeTeamName(candidate.away) === normalizedTeam
  );
  const otherFixture = tableEvidence.concurrentFixtures.find((candidate) => candidate.id !== currentFixture?.id);
  if (!currentFixture || !otherFixture) return null;

  const teamRecord = tableRecordForTeam(tableEvidence, teamName);
  const currentOpponentName =
    normalizeTeamName(currentFixture.home) === normalizedTeam ? currentFixture.away : currentFixture.home;
  const currentOpponentRecord = tableRecordForTeam(tableEvidence, currentOpponentName);
  if (!teamRecord || !currentOpponentRecord) return null;
  const otherOutcomes = ["home-win", "draw", "away-win"];
  const resultDetails = {};
  for (const result of ["win", "draw", "loss"]) {
    const classifications = [];
    for (const otherOutcome of otherOutcomes) {
      const finalPoints = new Map(tableEvidence.records.map((record) => [normalizeTeamName(record.teamName), record.points]));
      finalPoints.set(normalizedTeam, teamRecord.points + resultPoints(result));
      const normalizedCurrentOpponent = normalizeTeamName(currentOpponentName);
      finalPoints.set(
        normalizedCurrentOpponent,
        currentOpponentRecord.points + (result === "win" ? 0 : result === "draw" ? 1 : 3)
      );
      const otherHome = normalizeTeamName(otherFixture.home);
      const otherAway = normalizeTeamName(otherFixture.away);
      finalPoints.set(otherHome, finalPoints.get(otherHome) + (otherOutcome === "home-win" ? 3 : otherOutcome === "draw" ? 1 : 0));
      finalPoints.set(otherAway, finalPoints.get(otherAway) + (otherOutcome === "away-win" ? 3 : otherOutcome === "draw" ? 1 : 0));
      const target = finalPoints.get(normalizedTeam);
      const opponentTotals = [...finalPoints.entries()]
        .filter(([candidate]) => candidate !== normalizedTeam)
        .map(([, points]) => points);
      const atLeastTarget = opponentTotals.filter((points) => points >= target).length;
      const aboveTarget = opponentTotals.filter((points) => points > target).length;
      classifications.push({
        otherOutcome,
        status: atLeastTarget <= 1 ? "guarantees" : aboveTarget >= 2 ? "eliminates" : "dependent"
      });
    }
    const statuses = new Set(classifications.map(({ status }) => status));
    resultDetails[result] = {
      status: statuses.size === 1 ? classifications[0].status : "dependent",
      otherOutcomes: classifications
    };
  }

  const scenario = {
    method: "points-only-top-two-guarantee",
    scope: "standard-four-team-final-group-kickoff",
    qualifyingPlaces: 2,
    win: resultDetails.win.status,
    draw: resultDetails.draw.status,
    loss: resultDetails.loss.status,
    otherFixtureTeams: [otherFixture.home, otherFixture.away],
    resultDetails
  };
  scenario.scenarioKey = `terminal-win-${scenario.win}-draw-${scenario.draw}-loss-${scenario.loss}`;
  return scenario;
}

function pointsPositionPhrase(standing) {
  const pointBandStart = standing?.pointBandStart;
  const higher = Number(pointBandStart) - 1;
  if (higher <= 0) return standing?.pointBandSize > 1 ? "joint-top on points" : "top on points";
  const ordinal = ["first", "second", "third", "fourth"][Number(pointBandStart) - 1] || `${pointBandStart}th`;
  return `${standing?.pointBandSize > 1 ? "joint-" : ""}${ordinal} on points`;
}

function standingTaskText(teamName, opponentName, group, stageContext, opponentStageContext, standing, variant = 0) {
  const groupName = group || "this phase";
  const teamMatches = standing?.teamMatches ?? stageContext.matches;
  const opponentMatches = standing?.opponentMatches ?? opponentStageContext.matches;
  const position = standing ? pointsPositionPhrase(standing) : "in the current points picture";
  if (stageContext.points === opponentStageContext.points) {
    if (teamMatches === opponentMatches) {
      const options = [
        `${teamName} enter ${groupName} ${position} with ${opponentName}, both on ${countWord(stageContext.points, "point")} from ${countWord(teamMatches, "match", "matches")}`,
        `${teamName} and ${opponentName} are ${position} in ${groupName}, each with ${countWord(stageContext.points, "point")} from ${countWord(teamMatches, "match", "matches")}`,
        `with ${countWord(stageContext.points, "point")} from ${countWord(teamMatches, "match", "matches")}, ${teamName} are ${position} in ${groupName} alongside ${opponentName}`
      ];
      return options[variant % options.length];
    }
    const options = [
      `${teamName} enter ${groupName} ${position}: ${countWord(stageContext.points, "point")} from ${countWord(teamMatches, "match", "matches")}, level with ${possessive(opponentName)} ${countWord(opponentStageContext.points, "point")} from ${countWord(opponentMatches, "match", "matches")}`,
      `${teamName} are ${position} in ${groupName} on ${countWord(stageContext.points, "point")} from ${countWord(teamMatches, "match", "matches")}; ${opponentName} are level on points after ${countWord(opponentMatches, "match", "matches")}`,
      `the points are level in ${groupName}: ${teamName} have ${countWord(stageContext.points, "point")} from ${countWord(teamMatches, "match", "matches")}, while ${opponentName} have the same total from ${countWord(opponentMatches, "match", "matches")}`
    ];
    return options[variant % options.length];
  }
  const options = [
    `${teamName} enter ${groupName} ${position}: ${countWord(stageContext.points, "point")} from ${countWord(teamMatches, "match", "matches")} to ${possessive(opponentName)} ${countWord(opponentStageContext.points, "point")} from ${countWord(opponentMatches, "match", "matches")}`,
    `${teamName} are ${position} in ${groupName} with ${countWord(stageContext.points, "point")} from ${countWord(teamMatches, "match", "matches")}; ${opponentName} have ${countWord(opponentStageContext.points, "point")} from ${countWord(opponentMatches, "match", "matches")}`,
    `${teamName} bring ${countWord(stageContext.points, "point")} from ${countWord(teamMatches, "match", "matches")} into ${groupName}, compared with ${possessive(opponentName)} ${countWord(opponentStageContext.points, "point")} from ${countWord(opponentMatches, "match", "matches")}`
  ];
  return options[variant % options.length];
}

function sameHistoricalMatch(fixture, year, teamA, teamB) {
  return Number(fixture.tournamentYear) === year && teamPairKey(fixture.homeSlot, fixture.awaySlot) === teamPairKey(teamA, teamB);
}

function explicitStake(fixture, teamName, stageContext, opponentStageContext, baseModel, terminalScenario) {
  const team = normalizeTeamName(teamName);
  const withPoints = (key, text, extraModel = {}) => ({
    text,
    model: {
      ...baseModel,
      key,
      teamPoints: stageContext.points,
      opponentPoints: opponentStageContext.points,
      claimClass: "documented-stakes",
      evidenceRefs: ["fixture:pre-match-standings", "tournament:format-rules"],
      ...extraModel
    }
  });
  const withReviewedScenario = (key, text, reviewedScenario) => withPoints(key, text, {
    scenarioKey: key,
    reviewedScenario: {
      key,
      reviewed: true,
      method: "reviewed-tournament-format-scenario",
      ...reviewedScenario
    }
  });

  if (sameHistoricalMatch(fixture, 2002, "Sweden", "Argentina")) {
    if (team === "sweden") {
      return withPoints(
        "group-position",
        "Sweden enter Group F on 4 points from 2 matches, one ahead of Argentina; a win or draw guarantees the round of 16, while defeat requires Nigeria to beat England before the tiebreakers decide",
        {
          scenarioKey: "2002-group-f-sweden-final-day",
          terminalScenario: {
            ...terminalScenario,
            scenarioKey: "2002-group-f-sweden-final-day",
            reviewed: true,
            dependentCondition: "Nigeria beat England, then tiebreakers"
          }
        }
      );
    }
    return withPoints(
      "group-position",
      "Argentina enter Group F on 3 points from 2 matches, one behind Sweden; a win guarantees the round of 16, a draw requires Nigeria to beat England and favorable tiebreakers, and defeat eliminates them",
      {
        scenarioKey: "2002-group-f-argentina-final-day",
        terminalScenario: {
          ...terminalScenario,
          scenarioKey: "2002-group-f-argentina-final-day",
          reviewed: true,
          dependentCondition: "Nigeria beat England, then tiebreakers"
        }
      }
    );
  }

  if (sameHistoricalMatch(fixture, 1950, "Brazil", "Yugoslavia")) {
    return team === "brazil"
      ? withPoints("1950-group1-brazil-win", "Brazil must win to overtake them, finish first in Group 1, and reach the final round; a draw sends Yugoslavia through")
      : withPoints("1950-group1-yugoslavia-draw", "Yugoslavia need only a draw to stay first in Group 1 and reach the final round; defeat lets Brazil overtake them");
  }
  if (sameHistoricalMatch(fixture, 1950, "Uruguay", "Bolivia")) {
    return team === "uruguay"
      ? withReviewedScenario(
          "1950-group4-uruguay-win",
          "victory sends Uruguay into the final round, while a draw leaves Group 4's only place unresolved",
          {
            qualifyingDestination: "final-round",
            qualifyingPlaces: 1,
            statusByResult: { win: "guarantees", draw: "dependent", loss: "eliminates" }
          }
        )
      : withReviewedScenario(
          "1950-group4-bolivia-win",
          "victory sends Bolivia into the final round, while a draw leaves Group 4's only place unresolved",
          {
            qualifyingDestination: "final-round",
            qualifyingPlaces: 1,
            statusByResult: { win: "guarantees", draw: "dependent", loss: "eliminates" }
          }
        );
  }
  if (sameHistoricalMatch(fixture, 1950, "Chile", "United States")) {
    return team === "chile"
      ? withReviewedScenario(
          "1950-group2-chile-eliminated",
          "Chile are already eliminated from final-round contention",
          {
            qualifyingDestination: "final-round",
            qualifyingPlaces: 1,
            statusByResult: { win: "eliminates", draw: "eliminates", loss: "eliminates" }
          }
        )
      : withReviewedScenario(
          "1950-group2-usa-win-dependent",
          "the United States must win and need England to beat Spain before the tiebreaker can send them into the final round",
          {
            qualifyingDestination: "final-round",
            qualifyingPlaces: 1,
            statusByResult: { win: "dependent", draw: "eliminates", loss: "eliminates" },
            dependentCondition: "England beat Spain, then tiebreaker"
          }
        );
  }
  if (sameHistoricalMatch(fixture, 1962, "Brazil", "Spain")) {
    return team === "brazil"
      ? withReviewedScenario(
          "1962-group3-brazil-draw",
          "Brazil are one point ahead; a win or draw guarantees a quarter-final place, while defeat leaves them dependent on Mexico beating Czechoslovakia and the tiebreaker",
          {
            qualifyingDestination: "quarter-finals",
            qualifyingPlaces: 2,
            statusByResult: { win: "guarantees", draw: "guarantees", loss: "dependent" },
            dependentCondition: "Mexico beat Czechoslovakia, then tiebreaker"
          }
        )
      : withReviewedScenario(
          "1962-group3-spain-win",
          "Spain trail by one point; a win guarantees a quarter-final place, a draw leaves them dependent on Mexico beating Czechoslovakia and the tiebreaker, and defeat eliminates them",
          {
            qualifyingDestination: "quarter-finals",
            qualifyingPlaces: 2,
            statusByResult: { win: "guarantees", draw: "dependent", loss: "eliminates" },
            dependentCondition: "Mexico beat Czechoslovakia, then tiebreaker"
          }
        );
  }
  if (sameHistoricalMatch(fixture, 1950, "Sweden", "Spain")) {
    return team === "sweden"
      ? withPoints("1950-third-place-sweden-win", "Sweden must win to overtake them and finish third in the final-round group; a draw leaves Spain above them")
      : withPoints("1950-third-place-spain-draw", "Spain need only a draw to stay above Sweden and finish third in the final-round group; defeat lets Sweden overtake them");
  }
  if (sameHistoricalMatch(fixture, 1950, "Brazil", "Uruguay")) {
    return team === "brazil"
      ? withPoints("1950-title-brazil-draw", "Brazil need only a draw to finish first in the final-round group and become champions; defeat gives Uruguay the title")
      : withPoints("1950-title-uruguay-win", "Uruguay must win to finish first in the final-round group and become champions; a draw leaves Brazil first");
  }
  if (sameHistoricalMatch(fixture, 1982, "Italy", "Brazil")) {
    return team === "italy"
      ? withPoints("1982-group3-italy-win", "Italy must win to take second-group-stage Group 3 and reach the semi-finals; a draw sends Brazil through on goal difference")
      : withPoints("1982-group3-brazil-draw", "Brazil need only a draw to win second-group-stage Group 3 on goal difference and reach the semi-finals; defeat sends Italy through");
  }
  if (sameHistoricalMatch(fixture, 2002, "Tunisia", "Belgium")) {
    return team === "tunisia"
      ? withReviewedScenario(
          "2002-grouph-tunisia-loss",
          "defeat eliminates Tunisia, while a win or draw leaves qualification dependent on the remaining Group H matches",
          {
            qualifyingDestination: "round-of-16",
            qualifyingPlaces: 2,
            statusByResult: { win: "dependent", draw: "dependent", loss: "eliminates" }
          }
        )
      : withReviewedScenario(
          "2002-grouph-belgium-tunisia-loss",
          "a win eliminates Tunisia, while Belgium's own qualification remains unsettled",
          {
            qualifyingDestination: "round-of-16",
            qualifyingPlaces: 2,
            statusByResult: { win: "dependent", draw: "dependent", loss: "dependent" },
            opponentStatusByResult: { win: "eliminates", draw: "dependent", loss: "dependent" }
          }
        );
  }
  if (sameHistoricalMatch(fixture, 2006, "Brazil", "Australia")) {
    return team === "brazil"
      ? withReviewedScenario(
          "2006-groupf-brazil-win",
          "victory guarantees Brazil a round-of-16 place; a draw or defeat leaves qualification unresolved",
          {
            qualifyingDestination: "round-of-16",
            qualifyingPlaces: 2,
            statusByResult: { win: "guarantees", draw: "dependent", loss: "dependent" }
          }
        )
      : withReviewedScenario(
          "2006-groupf-australia-win",
          "victory guarantees Australia a round-of-16 place; a draw or defeat leaves qualification unresolved",
          {
            qualifyingDestination: "round-of-16",
            qualifyingPlaces: 2,
            statusByResult: { win: "guarantees", draw: "dependent", loss: "dependent" }
          }
        );
  }
  if (sameHistoricalMatch(fixture, 2018, "England", "Panama")) {
    return team === "england"
      ? withReviewedScenario(
          "2018-groupg-england-win",
          "a win sends England and Belgium into the round of 16 while eliminating Panama and Tunisia",
          {
            qualifyingDestination: "round-of-16",
            qualifyingPlaces: 2,
            statusByResult: { win: "guarantees", draw: "dependent", loss: "dependent" },
            opponentStatusByResult: { win: "eliminates", draw: "dependent", loss: "dependent" }
          }
        )
      : withReviewedScenario(
          "2018-groupg-panama-loss",
          "defeat eliminates Panama and Tunisia while sending England and Belgium into the round of 16",
          {
            qualifyingDestination: "round-of-16",
            qualifyingPlaces: 2,
            statusByResult: { win: "dependent", draw: "dependent", loss: "eliminates" },
            opponentStatusByResult: { win: "dependent", draw: "dependent", loss: "guarantees" }
          }
        );
  }
  if (sameHistoricalMatch(fixture, 2022, "Poland", "Saudi Arabia")) {
    return team === "poland"
      ? withReviewedScenario(
          "2022-groupc-poland-saudi-win",
          "Poland begin on one point, while a Saudi Arabia win guarantees the Saudis a round-of-16 place",
          {
            qualifyingDestination: "round-of-16",
            qualifyingPlaces: 2,
            opponentStatusByResult: { win: "guarantees", draw: "dependent", loss: "dependent" }
          }
        )
      : withReviewedScenario(
          "2022-groupc-saudi-win",
          "Saudi Arabia qualify for the round of 16 with a win; a draw or defeat leaves their progress unresolved",
          {
            qualifyingDestination: "round-of-16",
            qualifyingPlaces: 2,
            statusByResult: { win: "guarantees", draw: "dependent", loss: "dependent" }
          }
        );
  }
  if (sameHistoricalMatch(fixture, 2022, "Ecuador", "Senegal")) {
    return team === "ecuador"
      ? withPoints(
          "2022-groupa-ecuador-draw",
          "a draw guarantees Ecuador a round-of-16 place, while Senegal need victory to guarantee their own progress",
          {
            scenarioKey: "2022-group-a-ecuador-final-day",
            terminalScenario: {
              ...terminalScenario,
              scenarioKey: "2022-group-a-ecuador-final-day",
              reviewed: true,
              dependentCondition: "Qatar beat Netherlands, then tiebreakers"
            }
          }
        )
      : withPoints(
          "2022-groupa-senegal-win",
          "a win guarantees Senegal a round-of-16 place; a draw leaves them dependent on the Netherlands losing heavily to Qatar",
          {
            scenarioKey: "2022-group-a-senegal-final-day",
            terminalScenario: {
              ...terminalScenario,
              scenarioKey: "2022-group-a-senegal-final-day",
              reviewed: true,
              dependentCondition: "Netherlands lose heavily to Qatar"
            }
          }
        );
  }
  return null;
}

function terminalResultClause(result, status) {
  if (result === "win") {
    if (status === "guarantees") return "a win guarantees the round of 16";
    if (status === "eliminates") return "even a win leaves them eliminated";
    return "a win leaves qualification dependent on the other result or tiebreakers";
  }
  if (result === "draw") {
    if (status === "guarantees") return "a draw also guarantees progress";
    if (status === "eliminates") return "a draw eliminates them";
    return "a draw leaves qualification dependent on the other result or tiebreakers";
  }
  if (status === "guarantees") return "even defeat cannot deny them progress";
  if (status === "eliminates") return "defeat eliminates them";
  return "defeat leaves qualification dependent on the other result or tiebreakers";
}

function terminalScenarioText(scenario) {
  const pattern = `${scenario.win}|${scenario.draw}|${scenario.loss}`;
  const concisePatterns = new Map([
    ["guarantees|guarantees|guarantees", "they are already guaranteed a round-of-16 place"],
    ["guarantees|guarantees|dependent", "a win or draw guarantees progress; defeat depends on the other game or tiebreakers"],
    ["guarantees|guarantees|eliminates", "a win or draw guarantees progress; defeat eliminates them"],
    ["guarantees|dependent|dependent", "a win guarantees progress; a draw or defeat depends on the other game or tiebreakers"],
    ["guarantees|dependent|eliminates", "a win guarantees progress, a draw remains dependent, and defeat eliminates them"],
    ["guarantees|eliminates|eliminates", "only a win guarantees progress"],
    ["dependent|dependent|dependent", "every result depends on the other group result or tiebreakers"],
    ["dependent|dependent|eliminates", "a win or draw remains dependent; defeat eliminates them"],
    ["dependent|eliminates|eliminates", "only a win preserves hope; the other game or tiebreakers then decide"],
    ["eliminates|eliminates|eliminates", "they are already eliminated from round-of-16 contention"]
  ]);
  if (concisePatterns.has(pattern)) return concisePatterns.get(pattern);
  return nameSeries([
    terminalResultClause("win", scenario.win),
    terminalResultClause("draw", scenario.draw),
    terminalResultClause("loss", scenario.loss)
  ]);
}

function knockoutDestination(phase, fixture) {
  if (phase === "semi-finals") return "the final";
  if (phase === "quarter-finals") return "the semi-finals";
  if (phase === "round-of-16") return "the quarter-finals";
  if (phase === "knockout-replay") {
    const lower = String(fixture.round || "").toLowerCase();
    if (lower.includes("quarter")) return "the semi-finals";
    if (lower.includes("round of 16") || lower.includes("first round")) return "the quarter-finals";
  }
  return "the next round";
}

function matchupTask(
  fixture,
  sourceMatch,
  teamName,
  opponentName,
  stageContext,
  opponentStageContext,
  tableEvidence
) {
  const phase = sourceStagePhase(fixture, sourceMatch);
  const group = sourceGroup(fixture, sourceMatch);
  const standing = standingModel(tableEvidence, teamName, opponentName);
  const terminalScenario = deriveTerminalScenario(fixture, teamName, tableEvidence);
  const variant = stableVariant(`${fixture.id}|${teamName}|matchup`, 6);
  const baseModel = {
    teamPoints: stageContext.points,
    opponentPoints: opponentStageContext.points,
    claimClass: "documented-stakes",
    evidenceRefs: ["fixture:stage", "fixture:pre-match-standings"],
    ...(standing || {})
  };
  const special = explicitStake(
    fixture,
    teamName,
    stageContext,
    opponentStageContext,
    baseModel,
    terminalScenario
  );
  if (special) return special;

  if (phase === "final") {
    const options = [
      `${teamName} are playing for the world title`,
      `victory makes ${teamName} world champions`,
      `${teamName} can become world champions with victory`
    ];
    return { text: options[variant % options.length], model: { ...baseModel, key: "final-title" } };
  }
  if (phase === "third-place-match") {
    const options = [
      `${teamName} are playing for third place and the tournament's remaining medal position`,
      `the result decides whether ${teamName} finish third or fourth in the tournament`,
      `third place is at stake for ${teamName} in their final match of the tournament`
    ];
    return { text: options[variant % options.length], model: { ...baseModel, key: "third-place" } };
  }
  if (["semi-finals", "quarter-finals", "round-of-16", "knockout-replay", "group-play-off"].includes(phase)) {
    const destination = phase === "group-play-off" ? "the next tournament stage" : knockoutDestination(phase, fixture);
    const continuation = phase === "group-play-off" ? "continue in the tournament" : `advance to ${destination}`;
    const options = [
      `${teamName} need victory to ${continuation}; defeat ends their tournament`,
      `victory sends ${teamName} to ${destination}, while defeat ends their tournament`,
      `${teamName} are one win from ${destination}; losing this tie ends their run`,
      `this tie decides a place in ${destination}, and ${teamName} must win it to advance`,
      `${teamName} must win to reach ${destination} and remain in the tournament`,
      `a win takes ${teamName} into ${destination} and keeps their tournament alive; defeat brings elimination`
    ];
    return {
      text: options[variant % options.length],
      model: { ...baseModel, key: "knockout-advance", destination }
    };
  }
  if (phase === "second-group-stage") {
    return {
      text: standingTaskText(teamName, opponentName, group || "the second group stage", stageContext, opponentStageContext, standing, variant),
      model: { ...baseModel, key: "second-group-position" }
    };
  }
  if (phase === "final-round") {
    return {
      text: standingTaskText(teamName, opponentName, "the final-round group", stageContext, opponentStageContext, standing, variant),
      model: { ...baseModel, key: "final-round-position" }
    };
  }
  if (phase === "group-stage" && stageContext.matches === 0 && opponentStageContext.matches === 0) {
    const winPoints = tournamentWinPoints(fixture.tournamentYear);
    const options = [
      `a win gives ${teamName} ${countWord(winPoints, "point")}, while a draw gives both teams one`,
      `this opening group fixture offers ${countWord(winPoints, "point")} for victory and one to each side for a draw`,
      `${teamName} can begin with ${countWord(winPoints, "point")} by winning; a draw leaves both teams on one`
    ];
    return {
      text: options[variant % options.length],
      model: { ...baseModel, key: "group-opening-points", winPoints, drawPoints: 1 }
    };
  }
  const standingText = standingTaskText(teamName, opponentName, group || "the group stage", stageContext, opponentStageContext, standing, variant);
  if (terminalScenario) {
    return {
      text: `${standingText}; ${terminalScenarioText(terminalScenario)}`,
      model: {
        ...baseModel,
        key: "group-position",
        scenarioKey: terminalScenario.scenarioKey,
        terminalScenario
      }
    };
  }
  if (stageContext.matches === 0) {
    return {
      text: standingText,
      model: { ...baseModel, key: "group-opening-points" }
    };
  }
  return {
    text: standingText,
    model: { ...baseModel, key: "group-position" }
  };
}

function wonDrawnLostPhrase(context) {
  return `${context.wins}W-${context.draws}D-${context.losses}L`;
}

function recordEvidencePhrase(context) {
  const parts = [
    `${wonDrawnLostPhrase(context)}`,
    goalsScoredPhrase(context.goalsFor),
    goalsConcededPhrase(context.goalsAgainst)
  ];
  if (context.cleanSheets > 0 && context.goalsAgainst > 0) {
    parts.push(countWord(context.cleanSheets, "clean sheet"));
  }
  return nameSeries(parts);
}

function recordSentence({ teamName, context, overallContext, phase, tournamentYear, compact = false, variant = 0 }) {
  if (phaseStartsNewStandings(phase)) {
    if (!context.matches) {
      const overall = overallContext.matches
        ? `${wonDrawnLostPhrase(overallContext)}, with ${goalsScoredPhrase(overallContext.goalsFor)} and ${goalsConcededPhrase(overallContext.goalsAgainst)}`
        : "no earlier tournament result";
      const compactOptions = [
        `${teamName} begin this new phase after ${overall}.`,
        `The new phase resets the table after ${possessive(teamName)} overall ${overall}.`,
        `${possessive(teamName)} current-phase record starts here, following ${overall}.`
      ];
      const fullOptions = [
        `${teamName} begin a new phase table after an overall tournament record of ${overall}.`,
        `This phase starts a fresh table after ${possessive(teamName)} overall tournament record of ${overall}.`,
        `${possessive(teamName)} earlier-round results remain in their tournament record, but this phase begins anew after ${overall}.`
      ];
      return (compact ? compactOptions : fullOptions)[variant % 3];
    }
    const phaseEvidence = recordEvidencePhrase(context);
    const cleanSheetEvidence = context.cleanSheets && context.goalsAgainst > 0
      ? `, and ${countWord(context.cleanSheets, "clean sheet")}`
      : "";
    const compactOptions = [
      `In this phase, ${teamName} are ${wonDrawnLostPhrase(context)} with ${goalsScoredPhrase(context.goalsFor)}, ${goalsConcededPhrase(context.goalsAgainst)}${cleanSheetEvidence}.`,
      `${possessive(teamName)} phase record is ${wonDrawnLostPhrase(context)}: ${goalsScoredPhrase(context.goalsFor)}, ${goalsConcededPhrase(context.goalsAgainst)}${cleanSheetEvidence}.`,
      `${teamName} bring a ${wonDrawnLostPhrase(context)} phase record and a ${context.goalsFor}-${context.goalsAgainst} goal line.`
    ];
    const fullOptions = [
      `${possessive(teamName)} current-phase record is ${phaseEvidence} across ${countWord(context.matches, "match", "matches")}; earlier-round results sit outside this table.`,
      `Within this phase, ${teamName} are ${phaseEvidence} from ${countWord(context.matches, "match", "matches")}, with the table reset after the earlier round.`,
      `${teamName} carry ${phaseEvidence} from ${countWord(context.matches, "current-phase match", "current-phase matches")}; only results from this phase count in its table.`
    ];
    return (compact ? compactOptions : fullOptions)[variant % 3];
  }

  if (!context.matches) {
    const options = compact
      ? [
          `${teamName} have no earlier edition result, so a same-tournament form line is not yet available.`,
          `This is ${possessive(teamName)} first edition match, before a tournament scoring or defensive record exists.`,
          `${teamName} begin with no prior edition result or goal record.`,
          `No earlier edition match supplies a scoring or defensive baseline for ${teamName}.`,
          `${possessive(teamName)} tournament record is blank before this opening fixture.`,
          `The edition begins here for ${teamName}, with no previous result to carry into the match.`
        ]
      : [
          `${teamName} have no earlier match in this edition, so their scoring and defensive record begins with this fixture.`,
          `This is ${possessive(teamName)} first match of the edition, before any same-tournament result or goal record is available.`,
          `No previous result from this edition is available for ${teamName}; this fixture establishes their first scoring and defensive line.`,
          `${teamName} are opening their edition, with no earlier win, draw, loss, or goal record to bring into the match.`,
          `${possessive(teamName)} tournament record is still empty at kickoff, making this their first same-edition form reference.`,
          `The edition starts here for ${teamName}, before they have produced a tournament result, scoring line, or defensive return.`
        ];
    return options[variant % options.length];
  }

  const evidence = recordEvidencePhrase(context);
  const compactOptions = [
    `${possessive(teamName)} prior record is ${evidence}.`,
    `${teamName} bring an edition record of ${evidence}.`,
    `${teamName} bring a tournament line of ${evidence}.`,
    `${teamName} are ${evidence}.`,
    `${possessive(teamName)} earlier results add up to ${evidence}.`,
    `So far, ${teamName} have recorded ${evidence}.`
  ];
  const fullOptions = [
    `Across ${countWord(context.matches, "earlier match", "earlier matches")}, ${possessive(teamName)} tournament record is ${evidence}.`,
    `${possessive(teamName)} same-tournament record spans ${countWord(context.matches, "earlier match", "earlier matches")}: ${evidence}.`,
    `${teamName} hold an edition record of ${evidence} across ${countWord(context.matches, "match", "matches")}.`,
    `The record ${teamName} carry into this fixture is ${evidence} from ${countWord(context.matches, "earlier match", "earlier matches")}.`,
    `From ${countWord(context.matches, "previous tournament match", "previous tournament matches")}, ${teamName} are ${evidence}.`,
    `${possessive(teamName)} results so far read ${evidence} across ${countWord(context.matches, "match", "matches")}.`
  ];
  const options = compact ? compactOptions : fullOptions;
  return options[variant % options.length];
}

function planModel(context, stageContext, tournamentYear, phase) {
  return {
    key: context.matches ? "prior-record" : "no-prior-record",
    prior: recordSnapshot(context, tournamentYear, {
      pointsApplicable: phase === "group-stage" && hasGroupStagePoints(tournamentYear),
      scope: "tournament"
    }),
    phasePrior: recordSnapshot(stageContext, tournamentYear, {
      pointsApplicable: phaseUsesStandings(phase),
      scope: "current-phase"
    }),
    scope: phaseStartsNewStandings(phase) ? "current-phase" : "tournament",
    claimClass: "documented-prior-record",
    evidenceRefs: ["fixture:earlier-tournament-results"]
  };
}

function riskKey(opponentContext) {
  if (!opponentContext.matches) return "opponent-no-prior";
  if (opponentContext.goalsFor >= Math.max(3, opponentContext.matches * 2)) return "opponent-high-scoring";
  if (opponentContext.cleanSheets >= 2) return "opponent-clean-sheets";
  return "opponent-record";
}

function riskSentence({
  teamName,
  opponentName,
  teamContext,
  opponentContext,
  opponentOverallContext,
  phase,
  tournamentYear,
  compact = false,
  variant = 0
}) {
  const key = riskKey(opponentContext);
  if (phaseStartsNewStandings(phase) && !opponentContext.matches) {
    const overall = opponentOverallContext.matches
      ? `${wonDrawnLostPhrase(opponentOverallContext)}, ${opponentOverallContext.goalsFor}-for, ${opponentOverallContext.goalsAgainst}-against record`
      : "record with no earlier tournament result";
    return compact
      ? `${opponentName} also start this new phase after an overall ${overall}.`
      : `${opponentName} also begin in a fresh phase table; their earlier evidence is an overall ${overall}.`;
  }
  if (key === "opponent-no-prior") {
    if (!teamContext.matches) {
      const sharedOpeningOptions = compact
        ? [
            `${opponentName} begin on the same blank slate, so neither side has a same-tournament form edge.`,
            `${opponentName} also have no edition result; this match supplies the first tournament evidence for both teams.`,
            `Neither side bring a previous edition result into the fixture, leaving the opening comparison level.`,
            `${opponentName} are also starting their edition, with both tournament records still empty.`,
            `Both teams enter without a previous edition result, so the matchup begins from an even record.`,
            `${possessive(opponentName)} edition also starts here; neither team has an earlier tournament line.`
          ]
        : [
            `${opponentName} begin on the same blank slate, so neither side brings a same-tournament form edge into the fixture.`,
            `${opponentName} also have no edition result; this matchup supplies the first tournament evidence for both teams.`,
            `Neither side bring a previous edition result into the fixture, leaving their first same-tournament comparison level.`,
            `${opponentName} are also starting their edition, with both teams yet to establish a scoring or defensive record.`,
            `Both teams enter without a previous edition result, so neither team has a tournament form advantage at kickoff.`,
            `${possessive(opponentName)} edition also starts here; the two teams arrive with equally empty tournament records.`
          ];
      return sharedOpeningOptions[variant % sharedOpeningOptions.length];
    }
    const compactOptions = [
      `${opponentName} have no earlier edition result, so no same-tournament form line is available.`,
      `${opponentName} have not yet played in this edition and bring no prior goal record.`,
      `No earlier tournament result is available for ${opponentName}.`,
      `${possessive(opponentName)} edition record is still empty before this fixture.`,
      `${opponentName} are entering their first match, without a result from this edition.`,
      `This is ${possessive(opponentName)} first tournament match, before any same-edition scoring line exists.`
    ];
    const fullOptions = [
      `${opponentName} have no earlier match in this edition, so no same-tournament scoring or defensive record is available.`,
      `${teamName} face an opponent entering their first edition match, before ${opponentName} have established a tournament form line.`,
      `${opponentName} are yet to play in this edition, leaving no previous tournament result for comparison.`,
      `${possessive(opponentName)} tournament record is empty before this fixture, with no earlier goals scored or conceded.`,
      `This is also ${possessive(opponentName)} opening tournament match, so their first scoring and defensive evidence begins here.`,
      `No earlier edition result exists for ${opponentName}; the opponent comparison therefore starts with this match.`
    ];
    const options = compact ? compactOptions : fullOptions;
    return options[variant % options.length];
  }
  if (key === "opponent-high-scoring") {
    // Sentence two already carries the table and scenario totals. Keep this
    // sentence on the opponent's results and goal evidence.
    const pointLead = "";
    const pointTail = "";
    const compactOptions = [
      `${opponentName} bring ${pointLead}${countWord(opponentContext.goalsFor, "goal")} from ${countWord(opponentContext.matches, "earlier match", "earlier matches")}.`,
      `${possessive(opponentName)} attacking return is ${countWord(opponentContext.goalsFor, "goal")} in ${countWord(opponentContext.matches, "match", "matches")}${pointTail}.`,
      `${opponentName} have scored ${opponentContext.goalsFor} times in ${countWord(opponentContext.matches, "match", "matches")}${pointTail}.`,
      `In ${countWord(opponentContext.matches, "match", "matches")}, ${opponentName} have ${countWord(opponentContext.goalsFor, "goal")}${pointTail}.`,
      `${opponentName} have scored ${countWord(opponentContext.goalsFor, "goal")} in ${countWord(opponentContext.matches, "earlier match", "earlier matches")}${pointTail}.`,
      `${possessive(opponentName)} prior scoring line reads ${opponentContext.goalsFor} in ${countWord(opponentContext.matches, "match", "matches")}${pointTail}.`
    ];
    const fullOptions = [
      `${opponentName} arrive with ${pointLead}${countWord(opponentContext.goalsFor, "goal")} from ${countWord(opponentContext.matches, "earlier match", "earlier matches")}, within a ${wonDrawnLostPhrase(opponentContext)} record that includes ${goalsConcededPhrase(opponentContext.goalsAgainst)}.`,
      `In ${countWord(opponentContext.matches, "earlier match", "earlier matches")}, ${opponentName} have scored ${countWord(opponentContext.goalsFor, "goal")}${pointTail}, with ${goalsConcededPhrase(opponentContext.goalsAgainst)} in a ${wonDrawnLostPhrase(opponentContext)} record.`,
      `${teamName} face an opponent with ${countWord(opponentContext.goalsFor, "goal")} from ${countWord(opponentContext.matches, "earlier match", "earlier matches")}${pointTail}; ${opponentName} are ${wonDrawnLostPhrase(opponentContext)} with ${goalsConcededPhrase(opponentContext.goalsAgainst)}.`,
      `In ${countWord(opponentContext.matches, "earlier match", "earlier matches")}, ${opponentName} have scored ${opponentContext.goalsFor} times${pointTail} and conceded ${opponentContext.goalsAgainst} in a ${wonDrawnLostPhrase(opponentContext)} record.`,
      `${possessive(opponentName)} tournament scoring line stands at ${countWord(opponentContext.goalsFor, "goal")} in ${countWord(opponentContext.matches, "match", "matches")}${pointTail}, alongside ${goalsConcededPhrase(opponentContext.goalsAgainst)} and a ${wonDrawnLostPhrase(opponentContext)} record.`,
      `${opponentName} have scored ${countWord(opponentContext.goalsFor, "goal")} in ${countWord(opponentContext.matches, "match", "matches")}${pointTail}, with ${goalsConcededPhrase(opponentContext.goalsAgainst)} in a ${wonDrawnLostPhrase(opponentContext)} line.`
    ];
    const options = compact ? compactOptions : fullOptions;
    return options[variant % options.length];
  }
  if (key === "opponent-clean-sheets") {
    const matches = countWord(opponentContext.matches, "earlier match", "earlier matches");
    const cleanSheets = countWord(opponentContext.cleanSheets, "clean sheet");
    const compactOptions = opponentContext.goalsAgainst === 0
      ? [
          `${opponentName} have not conceded in ${matches}.`,
          `${opponentName} are yet to concede after ${matches}.`,
          `No opponent has scored against ${opponentName} in ${matches}.`,
          `${teamName} face a side that have not conceded in ${matches}.`,
          `${opponentName} have kept a clean sheet in every earlier match.`,
          `In ${matches}, ${opponentName} have kept every opponent out.`
        ]
      : [
          `${opponentName} have kept ${cleanSheets} and conceded ${countWord(opponentContext.goalsAgainst, "goal")}.`,
          `${opponentName} bring ${cleanSheets} from ${matches}, conceding ${countWord(opponentContext.goalsAgainst, "goal")}.`,
          `${teamName} face a side with ${cleanSheets} and ${goalsConcededPhrase(opponentContext.goalsAgainst)}.`,
          `In ${matches}, ${opponentName} have kept ${cleanSheets} and conceded ${countWord(opponentContext.goalsAgainst, "goal")}.`,
          `${possessive(opponentName)} record includes ${cleanSheets} with ${goalsConcededPhrase(opponentContext.goalsAgainst)}.`,
          `${opponentName} have kept ${cleanSheets} while conceding ${countWord(opponentContext.goalsAgainst, "goal")}.`
        ];
    const fullOptions = opponentContext.goalsAgainst === 0
      ? [
          `${opponentName} have not conceded in ${matches}, alongside a ${wonDrawnLostPhrase(opponentContext)} record.`,
          `${opponentName} are yet to concede after ${matches}, with results of ${wonDrawnLostPhrase(opponentContext)}.`,
          `No opponent has scored against ${opponentName} in ${matches}; their result line is ${wonDrawnLostPhrase(opponentContext)}.`,
          `${teamName} face a side that have kept every opponent out in ${matches} and are ${wonDrawnLostPhrase(opponentContext)}.`,
          `${possessive(opponentName)} ${wonDrawnLostPhrase(opponentContext)} record comes without a goal conceded in ${matches}.`,
          `In ${matches}, ${opponentName} are ${wonDrawnLostPhrase(opponentContext)} and have not conceded.`
        ]
      : [
          `${opponentName} have kept ${cleanSheets} in ${matches}, conceding ${countWord(opponentContext.goalsAgainst, "goal")} in a ${wonDrawnLostPhrase(opponentContext)} record.`,
          `${opponentName} bring ${cleanSheets} and ${goalsConcededPhrase(opponentContext.goalsAgainst)} from ${matches}, with results of ${wonDrawnLostPhrase(opponentContext)}.`,
          `${teamName} face a side that are ${wonDrawnLostPhrase(opponentContext)}, with ${cleanSheets} and ${goalsConcededPhrase(opponentContext.goalsAgainst)} in ${matches}.`,
          `In ${matches}, ${opponentName} have kept ${cleanSheets} and conceded ${countWord(opponentContext.goalsAgainst, "goal")} in a ${wonDrawnLostPhrase(opponentContext)} record.`,
          `${possessive(opponentName)} ${wonDrawnLostPhrase(opponentContext)} record includes ${cleanSheets} and ${goalsConcededPhrase(opponentContext.goalsAgainst)}.`,
          `${opponentName} have kept ${cleanSheets} in ${matches}, while conceding ${countWord(opponentContext.goalsAgainst, "goal")} overall.`
        ];
    const options = compact ? compactOptions : fullOptions;
    return options[variant % options.length];
  }
  // Avoid repeating standings points already stated in sentence two.
  const points = "";
  const compactOptions = [
    `${opponentName} have ${goalsScoredPhrase(opponentContext.goalsFor)} and ${goalsConcededPhrase(opponentContext.goalsAgainst)} from ${countWord(opponentContext.matches, "match", "matches")}.`,
    `${possessive(opponentName)} prior line is ${wonDrawnLostPhrase(opponentContext)}: ${points}${goalsScoredPhrase(opponentContext.goalsFor)}, ${goalsConcededPhrase(opponentContext.goalsAgainst)}.`,
    `${opponentName} are ${wonDrawnLostPhrase(opponentContext)} with ${points}${goalsScoredPhrase(opponentContext.goalsFor)} and ${goalsConcededPhrase(opponentContext.goalsAgainst)}.`,
    `${teamName} face ${possessive(opponentName)} ${points}${opponentContext.goalsFor}-for, ${opponentContext.goalsAgainst}-against return.`,
    `${possessive(opponentName)} tournament record is ${wonDrawnLostPhrase(opponentContext)}, with ${points}${goalsScoredPhrase(opponentContext.goalsFor)} and ${goalsConcededPhrase(opponentContext.goalsAgainst)}.`,
    `Across ${countWord(opponentContext.matches, "match", "matches")}, ${opponentName} have ${points}${goalsScoredPhrase(opponentContext.goalsFor)} and ${goalsConcededPhrase(opponentContext.goalsAgainst)}.`
  ];
  const fullOptions = [
    `${opponentName} have ${goalsScoredPhrase(opponentContext.goalsFor)} and ${goalsConcededPhrase(opponentContext.goalsAgainst)} across ${countWord(opponentContext.matches, "earlier match", "earlier matches")}.`,
    `${possessive(opponentName)} prior line is ${wonDrawnLostPhrase(opponentContext)}, with ${points}${goalsScoredPhrase(opponentContext.goalsFor)} and ${goalsConcededPhrase(opponentContext.goalsAgainst)} across ${countWord(opponentContext.matches, "tournament match", "tournament matches")}.`,
    `${teamName} face ${possessive(opponentName)} ${wonDrawnLostPhrase(opponentContext)} record: ${points}${goalsScoredPhrase(opponentContext.goalsFor)} and ${goalsConcededPhrase(opponentContext.goalsAgainst)} across ${countWord(opponentContext.matches, "earlier match", "earlier matches")}.`,
    `Across ${countWord(opponentContext.matches, "earlier match", "earlier matches")}, ${opponentName} are ${wonDrawnLostPhrase(opponentContext)} with ${points}${goalsScoredPhrase(opponentContext.goalsFor)} and ${goalsConcededPhrase(opponentContext.goalsAgainst)}.`,
    `${possessive(opponentName)} tournament return stands at ${wonDrawnLostPhrase(opponentContext)}, ${points}${goalsScoredPhrase(opponentContext.goalsFor)}, and ${goalsConcededPhrase(opponentContext.goalsAgainst)} from ${countWord(opponentContext.matches, "match", "matches")}.`,
    `${teamName} face ${possessive(opponentName)} ${wonDrawnLostPhrase(opponentContext)} line, with ${points}${goalsScoredPhrase(opponentContext.goalsFor)} and ${goalsConcededPhrase(opponentContext.goalsAgainst)} across ${countWord(opponentContext.matches, "match", "matches")}.`
  ];
  const options = compact ? compactOptions : fullOptions;
  return options[variant % options.length];
}

function riskModel(opponentContext, opponentStageContext, tournamentYear, phase, openingIdentity = {}) {
  const scopedContext = phaseStartsNewStandings(phase) ? opponentStageContext : opponentContext;
  return {
    key: riskKey(scopedContext),
    opponentPrior: recordSnapshot(opponentContext, tournamentYear, {
      pointsApplicable: phase === "group-stage" && hasGroupStagePoints(tournamentYear),
      scope: "tournament"
    }),
    phasePrior: recordSnapshot(opponentStageContext, tournamentYear, {
      pointsApplicable: phaseUsesStandings(phase),
      scope: "current-phase"
    }),
    scope: phaseStartsNewStandings(phase) ? "current-phase" : "tournament",
    claimClass: "documented-prior-record",
    evidenceRefs: ["fixture:opponent-earlier-tournament-results"],
    ...(scopedContext.matches === 0 && openingIdentity.openingIdentityUsed ? openingIdentity : {})
  };
}

function managerClause(managers) {
  return managers.length ? ` under ${nameSeries(managers)}` : "";
}

function identitySentence({ teamName, fixture, sourceMatch, isHost, managers, starters, variant = 0 }) {
  const hostClause = isHost ? " as the host side" : "";
  const leadership = managerClause(managers);
  const stage = stagePhrase(fixture, sourceMatch);
  const openings = [
    `${teamName} are entering ${stage}${hostClause}${leadership}`,
    `In ${stage}, ${teamName} are${isHost ? " the host side" : " competing"}${leadership}`,
    `${teamName} are contesting ${stage}${leadership}${hostClause}`
  ];
  const opening = openings[variant % openings.length];
  if (starters.length) {
    if (starters.length === 1) {
      return `${opening}, with ${starters[0]} starting.`;
    }
    const starterClauses = [
      `, with ${nameSeries(starters)} among the confirmed starters.`,
      `; the confirmed XI includes ${nameSeries(starters)}.`,
      `, and the confirmed starting side contains ${nameSeries(starters)}.`
    ];
    return `${opening}${starterClauses[variant % starterClauses.length]}`;
  }
  return `${opening}.`;
}

function opponentOpeningIdentitySentence({ opponentName, isHost, managers, starters, variant = 0 }) {
  const leadership = managers.length ? nameSeries(managers) : "their tournament staff";
  const hostClause = isHost ? " as the host side" : "";
  if (starters.length) {
    const namedStarters = nameSeries(starters.slice(0, 2));
    const options = [
      `${opponentName} are under ${leadership}${hostClause}, with ${namedStarters} among their confirmed starters.`,
      `${opponentName} are managed by ${leadership}${hostClause}; their confirmed XI includes ${namedStarters}.`,
      `${opponentName} are entering under ${leadership}${hostClause}, and ${namedStarters} are confirmed in their starting side.`
    ];
    return options[variant % options.length];
  }
  const options = [
    `${opponentName} enter their first tournament match under ${leadership}${hostClause}, with their edition beginning here.`,
    `${opponentName} are managed by ${leadership}${hostClause}; they begin their own World Cup campaign here.`,
    `${opponentName} arrive under ${leadership}${hostClause} for their opening fixture of the tournament.`
  ];
  return options[variant % options.length];
}

function copyWordCount(value) {
  return String(value).trim().split(/\s+/).filter(Boolean).length;
}

function historicalRoleCounts(starters) {
  const counts = { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0, player: 0 };
  for (const starter of starters || []) {
    const role = Object.hasOwn(counts, starter.position) ? starter.position : "player";
    counts[role] += 1;
  }
  return counts;
}

function historicalRoleBalancePhrase(counts) {
  const roles = [
    counts.defender ? countWord(counts.defender, "defender") : "",
    counts.midfielder ? countWord(counts.midfielder, "midfielder") : "",
    counts.forward ? countWord(counts.forward, "forward") : "",
    counts.player ? countWord(counts.player, "other starter", "other starters") : ""
  ].filter(Boolean);
  const outfield = nameSeries(roles);
  if (counts.goalkeeper === 1) return `${outfield} in front of the goalkeeper`;
  if (counts.goalkeeper > 1) return `${outfield}, with ${countWord(counts.goalkeeper, "goalkeeper")}`;
  return outfield;
}

function teamXiLabel(teamName) {
  const value = String(teamName || "").trim();
  if (/^(?:the\s+)?(?:Netherlands|Soviet Union|United States)\b/i.test(value)) {
    return `the ${value.replace(/^the\s+/i, "")} XI`;
  }
  const article = /^(?:United|Uruguay|USA)\b/i.test(value) ? "a" : /^[AEIOU]/i.test(value) ? "an" : "a";
  return `${article} ${value} XI`;
}

function historicalLineupRoleSentence(teamName, managers, roleCounts, variant = 0) {
  const roles = historicalRoleBalancePhrase(roleCounts);
  const leadership = managers.length ? nameSeries(managers) : "";
  const options = leadership
    ? [
        `Under ${leadership}, ${possessive(teamName)} confirmed XI lists ${roles}.`,
        `${leadership} ${managers.length === 1 ? "selects" : "select"} ${teamXiLabel(teamName)} with ${roles}.`,
        `${possessive(teamName)} confirmed XI contains ${roles}, with ${leadership} in charge.`
      ]
    : [
        `${possessive(teamName)} confirmed XI lists ${roles}.`,
        `${teamName} name a starting XI with ${roles}.`,
        `${possessive(teamName)} starting side contains ${roles}.`
      ];
  return options[variant % options.length];
}

function historicalPlayerRolePhrases(players) {
  const labels = {
    forward: "in attack",
    midfielder: "in midfield",
    defender: "in defence",
    goalkeeper: "in goal",
    player: "in the starting side"
  };
  return ["forward", "midfielder", "defender", "goalkeeper", "player"]
    .map((position) => {
      const names = players.filter((player) => player.position === position).map((player) => player.name);
      return names.length ? `${nameSeries(names)} ${labels[position]}` : "";
    })
    .filter(Boolean);
}

function historicalPlayerLineupSentence(teamName, players) {
  const phrases = historicalPlayerRolePhrases(players);
  if (!phrases.length) return `${teamName} have no named starting roles available.`;
  if (phrases.length === 1) return `${teamName} start ${phrases[0]}.`;
  if (phrases.length === 2) return `${teamName} start ${phrases[0]}, with ${phrases[1]}.`;
  return `${teamName} start ${nameSeries(phrases)}.`;
}

export function buildHistoricalEvidenceContent({
  fixture,
  sourceMatch,
  side,
  managers,
  context,
  opponentContext,
  stageContext,
  opponentStageContext,
  tableEvidence,
  hostTeams,
  copyPlayers = [],
  allStarters = [],
  opponentManagers = [],
  opponentCopyPlayers = [],
  opponentAllStarters = []
}) {
  const teamName = side === "home" ? fixture.homeSlot : fixture.awaySlot;
  const opponentName = side === "home" ? fixture.awaySlot : fixture.homeSlot;
  const isHost = hostTeams.has(normalizeTeamName(teamName));
  const opponentIsHost = hostTeams.has(normalizeTeamName(opponentName));
  const phase = sourceStagePhase(fixture, sourceMatch);
  const task = matchupTask(
    fixture,
    sourceMatch,
    teamName,
    opponentName,
    stageContext,
    opponentStageContext,
    tableEvidence
  );
  const taskText = task.text;
  const scopedContext = phaseUsesStandings(phase) ? stageContext : context;
  const scopedOpponentContext = phaseUsesStandings(phase) ? opponentStageContext : opponentContext;
  const variant = stableVariant(`${fixture.id}|${side}`, 6);
  const availableStarters = copyPlayers.map((player) => player.name);
  const availableOpponentStarters = opponentCopyPlayers.map((player) => player.name);
  const confirmedStarterFacts = copyPlayers.map(({ name, position }) => ({ name, position }));
  const opponentConfirmedStarterFacts = opponentCopyPlayers.map(({ name, position }) => ({ name, position }));
  const roleCounts = historicalRoleCounts(allStarters);
  const opponentRoleCounts = historicalRoleCounts(opponentAllStarters);
  const hasLineupComparison = allStarters.length === 11 && opponentAllStarters.length === 11;
  if (hasLineupComparison) {
    if (roleCounts.goalkeeper !== 1 || opponentRoleCounts.goalkeeper !== 1) {
      throw new Error(`${fixture.id} ${side} historical lineup comparison needs exactly one goalkeeper per side`);
    }
    const copy = naturalizeEnglishTeamArticles([
      historicalLineupRoleSentence(teamName, managers, roleCounts, variant),
      historicalPlayerLineupSentence(teamName, confirmedStarterFacts),
      historicalLineupRoleSentence(opponentName, opponentManagers, opponentRoleCounts, (variant + 1) % 3),
      historicalPlayerLineupSentence(opponentName, opponentConfirmedStarterFacts)
    ].join(" "));
    const words = copyWordCount(copy);
    if (words < 40 || words > 80) {
      throw new Error(`${fixture.id} ${side} historical lineup comparison expected 40-80 words, found ${words}: ${copy}`);
    }
    return {
      copy,
      wordCount: words,
      localeModel: {
        version: localeModelVersion,
        kind: "historical-evidence",
        team: { name: teamName },
        opponent: { name: opponentName },
        stage: historicalStageModel(fixture, sourceMatch),
        slots: {
          identity: {
            displayMode: "lineup-comparison",
            isHost,
            managers,
            confirmedStarters: availableStarters,
            confirmedStarterFacts,
            roleCounts,
            prior: recordSnapshot(context, fixture.tournamentYear, {
              pointsApplicable: phase === "group-stage" && hasGroupStagePoints(fixture.tournamentYear),
              scope: "tournament"
            }),
            phasePrior: recordSnapshot(stageContext, fixture.tournamentYear, {
              pointsApplicable: phaseUsesStandings(phase),
              scope: "current-phase"
            }),
            scope: phaseStartsNewStandings(phase) ? "current-phase" : "tournament",
            claimClass: "documented-starting-lineup",
            evidenceRefs: ["fjelstul:manager-appearances", "fjelstul:player-appearances"]
          },
          matchup: task.model,
          plan: planModel(context, stageContext, fixture.tournamentYear, phase),
          risk: {
            ...riskModel(opponentContext, opponentStageContext, fixture.tournamentYear, phase),
            opponentManagers,
            opponentConfirmedStarterFacts,
            opponentRoleCounts
          }
        }
      }
    };
  }
  const sharedTournamentOpening = context.matches === 0 && opponentContext.matches === 0;
  const starterCounts = availableStarters.length
    ? [Math.min(3, availableStarters.length), Math.min(2, availableStarters.length), 1]
    : [0];
  const candidates = [];
  for (const starterCount of [...new Set(starterCounts)]) {
    const starters = availableStarters.slice(0, starterCount);
    for (const [planCompact, riskCompact] of [
      [false, false],
      [false, true],
      [true, false],
      [true, true]
    ]) {
      const copy = naturalizeEnglishTeamArticles([
        identitySentence({ teamName, fixture, sourceMatch, isHost, managers, starters, variant }),
        `Against ${opponentName}, ${taskText}.`,
        recordSentence({
          teamName,
          context: scopedContext,
          overallContext: context,
          phase,
          tournamentYear: fixture.tournamentYear,
          compact: planCompact,
          variant
        }),
        sharedTournamentOpening
          ? opponentOpeningIdentitySentence({
              opponentName,
              isHost: opponentIsHost,
              managers: opponentManagers,
              starters: availableOpponentStarters,
              variant: (variant + 1) % 6
            })
          : riskSentence({
              teamName,
              opponentName,
              teamContext: scopedContext,
              opponentContext: scopedOpponentContext,
              opponentOverallContext: opponentContext,
              phase,
              tournamentYear: fixture.tournamentYear,
              compact: riskCompact,
              variant: (variant + 1) % 6
            })
      ].join(" "));
      candidates.push({ copy, starters, planCompact, riskCompact });
    }
  }
  const minimumWords = 50;
  const selected = candidates.find((candidate) => {
    const words = copyWordCount(candidate.copy);
    return words >= minimumWords && words <= 85;
  }) || candidates.find((candidate) => copyWordCount(candidate.copy) <= 85) || candidates.at(-1);
  const words = copyWordCount(selected.copy);
  if (words > 85) {
    throw new Error(`${fixture.id} ${side} historical evidence copy remains over 85 words (${words}): ${selected.copy}`);
  }

  const identityEvidenceRefs = ["fjelstul:manager-appearances", "fixture:earlier-tournament-results"];
  if (selected.starters.length) identityEvidenceRefs.push("fjelstul:player-appearances");
  return {
    copy: selected.copy,
    wordCount: words,
    localeModel: {
      version: localeModelVersion,
      kind: "historical-evidence",
      team: { name: teamName },
      opponent: { name: opponentName },
      stage: historicalStageModel(fixture, sourceMatch),
      slots: {
        identity: {
          isHost,
          managers,
          confirmedStarters: selected.starters,
          prior: recordSnapshot(context, fixture.tournamentYear, {
            pointsApplicable: phase === "group-stage" && hasGroupStagePoints(fixture.tournamentYear),
            scope: "tournament"
          }),
          phasePrior: recordSnapshot(stageContext, fixture.tournamentYear, {
            pointsApplicable: phaseUsesStandings(phase),
            scope: "current-phase"
          }),
          scope: phaseStartsNewStandings(phase) ? "current-phase" : "tournament",
          claimClass: "documented-context",
          evidenceRefs: identityEvidenceRefs
        },
        matchup: task.model,
        plan: planModel(context, stageContext, fixture.tournamentYear, phase),
        risk: riskModel(opponentContext, opponentStageContext, fixture.tournamentYear, phase, {
          opponentManagers,
          opponentConfirmedStarters: availableOpponentStarters,
          opponentIsHost,
          openingIdentityUsed: sharedTournamentOpening
        })
      }
    }
  };
}

function buildCancelledLocaleModel(fixture, side, squadOptions = []) {
  const teamName = side === "home" ? fixture.homeSlot : fixture.awaySlot;
  const opponentName = side === "home" ? fixture.awaySlot : fixture.homeSlot;
  return {
    version: localeModelVersion,
    kind: "cancelled",
    team: { name: teamName },
    opponent: { name: opponentName },
    stage: historicalStageModel(fixture),
    slots: {
      identity: { state: "cancelled" },
      matchup: { state: "not-played" },
      plan: { state: "no-plan" },
      risk: {
        state: "squad-only",
        confirmedParticipants: false,
        squadOptions: squadOptions.map((player) => player?.name || player).filter(Boolean)
      }
    }
  };
}

function buildCancelledEnglishCopy(fixture, side, squadOptions = []) {
  const teamName = side === "home" ? fixture.homeSlot : fixture.awaySlot;
  const opponentName = side === "home" ? fixture.awaySlot : fixture.homeSlot;
  const round = String(fixture.round || "tournament").trim().toLowerCase().replace(/\s+/g, "-");
  const names = squadOptions.map((player) => player?.name || player).filter(Boolean);
  const squadContext = names.length
    ? `${possessive(teamName)} registered squad options include ${nameSeries(names)}.`
    : `${teamName} do not have a confirmed player list for this fixture.`;
  const participationLimit = names.length
    ? "Those names are squad context only; no player is a confirmed participant."
    : "No player should be treated as a confirmed participant in this match.";

  return `${possessive(teamName)} scheduled ${round} fixture with ${opponentName} at the ${fixture.tournamentYear} World Cup is canceled before kickoff. The ${teamName}-${opponentName} match will not be played, so there is no opponent-specific match plan or tactical risk to assess. ${squadContext} ${participationLimit}`;
}

function startersForTeam(indexes, sourceMatch, teamId) {
  return (indexes.appearancesByMatch.get(sourceMatch.match_id) || [])
    .filter((appearance) => appearance.team_id === teamId && Number(appearance.starter) === 1)
    .map((appearance) => ({
      id: appearance.player_id || normalizePersonKey(personName(appearance)),
      name: personName(appearance),
      shirtNumber: Number(appearance.shirt_number) > 0 ? Number(appearance.shirt_number) : undefined,
      positionCode: String(appearance.position_code || "").toUpperCase(),
      position: positionGroup(appearance)
    }));
}

function playerStatsKey(tournamentId, teamId) {
  return `${tournamentId}|${teamId}`;
}

function getPlayerStatsMap(priorPlayerStats, tournamentId, teamId) {
  const key = playerStatsKey(tournamentId, teamId);
  if (!priorPlayerStats.has(key)) {
    priorPlayerStats.set(key, new Map());
  }
  return priorPlayerStats.get(key);
}

function baseSelectionScore(player) {
  if (player.position === "forward") {
    return 35;
  }
  if (player.position === "midfielder") {
    return 30;
  }
  if (player.position === "defender") {
    return 23;
  }
  if (player.position === "goalkeeper") {
    return 16;
  }
  return 20;
}

function selectKeyPlayers(starters, statsMap, isEligible = () => true, teamContext = null) {
  const ranked = starters
    .filter((player) => isEligible(player.name))
    .map((player) => {
      const prior = statsMap.get(player.id) || { appearances: 0, starts: 0, goals: 0 };
      const goalkeeperEvidenceBonus = player.position === "goalkeeper" &&
        teamContext?.matches >= 5 &&
        prior.starts === prior.appearances &&
        prior.starts === teamContext.matches &&
        teamContext.matches - teamContext.cleanSheets <= 1
          ? teamContext.cleanSheets * 5
          : 0;
      return {
        ...player,
        prior,
        selectionScore: baseSelectionScore(player) + prior.starts * 3 + prior.appearances + prior.goals * 14 + goalkeeperEvidenceBonus
      };
    })
    .sort(
      (a, b) =>
        b.selectionScore - a.selectionScore ||
        (a.shirtNumber || 99) - (b.shirtNumber || 99) ||
        a.name.localeCompare(b.name)
    );

  const selected = [];
  const add = (player) => {
    if (player && !selected.some((candidate) => candidate.id === player.id)) {
      selected.push(player);
    }
  };

  add(ranked.find((player) => player.position !== "goalkeeper"));
  add(
    selected[0]?.position === "midfielder"
      ? ranked.find((player) => player.position === "forward")
      : ranked.find((player) => player.position === "midfielder")
  );
  for (const player of ranked) {
    add(player);
    if (selected.length === 3) {
      break;
    }
  }

  return selected.slice(0, 3).map((player) => {
    const earlier = player.prior.appearances
      ? `${countWord(player.prior.appearances, "earlier appearance")}${player.prior.goals ? ` and ${countWord(player.prior.goals, "goal")}` : ""} in this edition`
      : "no earlier match appearance in this edition";
    return {
      name: player.name,
      note: `Confirmed starter as a ${player.position}; enters with ${earlier}.`,
      ...(player.shirtNumber ? { shirtNumber: player.shirtNumber } : {}),
      position: player.position,
      selectionEvidence: "confirmed-starting-xi-and-prior-tournament-matches"
    };
  });
}

function tournamentWinPoints(tournamentYear) {
  return Number(tournamentYear) >= 1994 ? 3 : 2;
}

function updateRecordContext(record, goalsFor, goalsAgainst, tournamentYear, awardPoints) {
  record.matches += 1;
  record.goalsFor += goalsFor;
  record.goalsAgainst += goalsAgainst;
  if (goalsFor > goalsAgainst) {
    record.wins += 1;
    if (awardPoints) record.points += tournamentWinPoints(tournamentYear);
  } else if (goalsFor < goalsAgainst) {
    record.losses += 1;
  } else {
    record.draws += 1;
    if (awardPoints) record.points += 1;
  }
  if (goalsAgainst === 0) {
    record.cleanSheets += 1;
  }
}

function updateTeamContext(fixture, sourceMatch, side, context) {
  if (!fixture.score || fixture.status === "CANCELLED") {
    return;
  }
  const goalsFor = side === "home" ? fixture.score.home : fixture.score.away;
  const goalsAgainst = side === "home" ? fixture.score.away : fixture.score.home;
  const awardPoints = Number(sourceMatch.group_stage) === 1 && sourceStagePhase(fixture, sourceMatch) !== "group-play-off";
  updateRecordContext(context, goalsFor, goalsAgainst, fixture.tournamentYear, awardPoints);
  updateRecordContext(
    getStageContext(context, fixture, sourceMatch),
    goalsFor,
    goalsAgainst,
    fixture.tournamentYear,
    awardPoints
  );
}

function updatePriorPlayerStats({ indexes, sourceMatch, sourceTeam, priorPlayerStats }) {
  const statsMap = getPlayerStatsMap(priorPlayerStats, sourceMatch.tournament_id, sourceTeam.teamId);
  const appearances = (indexes.appearancesByMatch.get(sourceMatch.match_id) || []).filter(
    (appearance) => appearance.team_id === sourceTeam.teamId
  );
  for (const appearance of appearances) {
    const id = appearance.player_id || normalizePersonKey(personName(appearance));
    const stats = statsMap.get(id) || { appearances: 0, starts: 0, goals: 0 };
    stats.appearances += 1;
    if (Number(appearance.starter) === 1) {
      stats.starts += 1;
    }
    statsMap.set(id, stats);
  }

  const goals = (indexes.goalsByMatch.get(sourceMatch.match_id) || []).filter(
    (goal) => goal.team_id === sourceTeam.teamId && Number(goal.own_goal) !== 1
  );
  for (const goal of goals) {
    const id = goal.player_id || normalizePersonKey(personName(goal));
    const stats = statsMap.get(id) || { appearances: 0, starts: 0, goals: 0 };
    stats.goals += 1;
    statsMap.set(id, stats);
  }
}

function createIndexes(fjelstulData) {
  const matches = (fjelstulData.matches || []).filter((match) => /FIFA Men's World Cup/.test(match.tournament_name || ""));
  const matchesByFixtureKey = new Map();
  for (const match of matches) {
    matchesByFixtureKey.set(
      matchKey(match.tournament_id.replace("WC-", ""), match.match_date, match.home_team_name, match.away_team_name),
      match
    );
  }

  const hostTeamsByTournament = new Map();
  for (const host of fjelstulData.host_countries || []) {
    const bucket = hostTeamsByTournament.get(host.tournament_id) || new Set();
    bucket.add(normalizeTeamName(host.team_name));
    hostTeamsByTournament.set(host.tournament_id, bucket);
  }

  return {
    matchesByFixtureKey,
    appearancesByMatch: groupBy(fjelstulData.player_appearances || [], (record) => record.match_id),
    goalsByMatch: groupBy(fjelstulData.goals || [], (record) => record.match_id),
    managersByMatch: groupBy(fjelstulData.manager_appearances || [], (record) => record.match_id),
    hostTeamsByTournament
  };
}

function managersForTeam(indexes, sourceMatch, teamId) {
  const records = (indexes.managersByMatch.get(sourceMatch.match_id) || []).filter((record) => record.team_id === teamId);
  let names = [...new Set(records.map(managerName).filter(Boolean))];
  const year = Number(String(sourceMatch.tournament_id || "").replace("WC-", ""));
  const team = normalizeTeamName(records[0]?.team_name || "");

  if (year === 1966 && team === "north korea") {
    names = names.map((name) => normalizePersonKey(name) === "rye hyun myung" ? "Myung Rye-hyun" : name);
  }

  if (year === 1958 && team === "scotland") {
    names = names.filter((name) => normalizePersonKey(name) === "dawson walker");
  } else if (year === 1998 && team === "saudi arabia") {
    names = names.filter((name) =>
      sourceMatch.match_date < "1998-06-24"
        ? normalizePersonKey(name) === "carlos alberto parreira"
        : normalizePersonKey(name) === "mohammed al kharashy"
    );
  } else if (year === 1998 && team === "tunisia") {
    names = names.filter((name) =>
      sourceMatch.match_date < "1998-06-26"
        ? normalizePersonKey(name) === "henryk kasperczak"
        : normalizePersonKey(name) === "ali selmi"
    );
  }

  if (!names.length && records.length) {
    throw new Error(`Unable to resolve the active manager for ${sourceMatch.match_id} ${records[0].team_name}`);
  }
  return names;
}

function commonMetadata(evidenceInputs) {
  return {
    sourceId,
    mode: "archive-present-tense",
    schemaVersion,
    narrativeMoment: "team-entrance",
    outcomeCutoff: "kickoff",
    generatedBy: generator,
    evidenceInputs,
    excludedInputs,
    researchSourceIds: [fjelstulSourceId, fixtureSourceId]
  };
}

function createHistoricalProfileVersionSet(historicalProfilesData) {
  const versions = new Set();
  for (const [profileName, profile] of Object.entries(historicalProfilesData?.profiles || {})) {
    const names = [profileName.split(" / ")[0], profile?.name, profile?.displayName, ...(profile?.aliases || [])].filter(Boolean);
    const teams = [profile?.teamName, ...(profile?.teams || [])].filter(Boolean);
    const years = [profile?.tournamentYear, ...(profile?.tournamentYears || [])]
      .map(Number)
      .filter((year) => Number.isInteger(year) && year > 0);
    for (const name of names) {
      for (const team of teams) {
        for (const year of years) {
          versions.add(`${year}|${normalizeTeamName(team)}|${normalizePersonKey(name)}`);
        }
      }
    }
  }
  return versions;
}

async function main() {
const [historyData, fjelstulData, historicalProfilesData] = await Promise.all([
  readJson(historyPath),
  loadFjelstulData(),
  readJson(historicalProfilesPath)
]);
const indexes = createIndexes(fjelstulData);
const historicalProfileVersions = createHistoricalProfileVersionSet(historicalProfilesData);
const contextByTeam = new Map();
const priorPlayerStats = new Map();
const generatedByFixtureId = new Map();
let matched = 0;
let earlyContextFixtures = 0;
let lineupFixtures = 0;
let cancelled = 0;

const sortedFixtures = [...(historyData.fixtures || [])].sort((a, b) =>
  String(a.sortKey || `${a.date}T${a.localTime || "00:00"}`).localeCompare(
    String(b.sortKey || `${b.date}T${b.localTime || "00:00"}`)
  ) || a.id.localeCompare(b.id)
);
const preMatchTableEvidenceByFixtureId = buildPreMatchTableEvidence(sortedFixtures, indexes);
const terminalScenarioFixtures = sortedFixtures.filter((fixture) =>
  deriveTerminalScenario(fixture, fixture.homeSlot, preMatchTableEvidenceByFixtureId.get(fixture.id))
);
if (terminalScenarioFixtures.length !== 112) {
  throw new Error(
    `Historical terminal-scenario regression: expected 112 standard final-group fixtures from 1998-2022, found ${terminalScenarioFixtures.length}`
  );
}
const swedenArgentina2002 = sortedFixtures.find((fixture) => sameHistoricalMatch(fixture, 2002, "Sweden", "Argentina"));
if (!swedenArgentina2002) throw new Error("Historical terminal-scenario regression: missing Sweden-Argentina 2002");
const swedenArgentinaEvidence = preMatchTableEvidenceByFixtureId.get(swedenArgentina2002.id);
const swedenScenario = deriveTerminalScenario(swedenArgentina2002, "Sweden", swedenArgentinaEvidence);
const argentinaScenario = deriveTerminalScenario(swedenArgentina2002, "Argentina", swedenArgentinaEvidence);
if (
  `${swedenScenario?.win}|${swedenScenario?.draw}|${swedenScenario?.loss}` !==
    "guarantees|guarantees|dependent" ||
  `${argentinaScenario?.win}|${argentinaScenario?.draw}|${argentinaScenario?.loss}` !==
    "guarantees|dependent|eliminates"
) {
  throw new Error(
    `Historical terminal-scenario regression: Sweden-Argentina 2002 classifications are ${swedenScenario?.scenarioKey} / ${argentinaScenario?.scenarioKey}`
  );
}

for (const fixture of sortedFixtures) {
  if (fixture.status === "CANCELLED") {
    cancelled += 1;
    const inputs = ["teams", "stage", "registeredSquadContext"];
    const metadata = commonMetadata(inputs);
    generatedByFixtureId.set(fixture.id, {
      ...fixture,
      keyPlayers: {
        ...metadata,
        method: "cancelled-registered-squad-context",
        basis: "The fixture was cancelled before kickoff; any named player is explicitly an available registered-squad option, not a confirmed match participant.",
        home: fixture.keyPlayers?.home || [],
        away: fixture.keyPlayers?.away || []
      },
      keyInformation: {
        ...metadata,
        historicalCoverage: "cancelled-squad-context",
        home: buildCancelledEnglishCopy(fixture, "home", fixture.keyPlayers?.home || []),
        away: buildCancelledEnglishCopy(fixture, "away", fixture.keyPlayers?.away || []),
        localeModel: {
          version: localeModelVersion,
          home: buildCancelledLocaleModel(fixture, "home", fixture.keyPlayers?.home || []),
          away: buildCancelledLocaleModel(fixture, "away", fixture.keyPlayers?.away || [])
        }
      }
    });
    continue;
  }

  const sourceMatch = indexes.matchesByFixtureKey.get(
    matchKey(fixture.tournamentYear, fixture.date, fixture.homeSlot, fixture.awaySlot)
  );
  if (!sourceMatch) {
    throw new Error(`No pinned Fjelstul match matched played historical fixture ${fixture.id}`);
  }
  matched += 1;

  const homeSourceTeam = sourceTeamForFixtureSide(fixture, sourceMatch, "home");
  const awaySourceTeam = sourceTeamForFixtureSide(fixture, sourceMatch, "away");
  const homeContext = getTeamContext(contextByTeam, fixture.tournamentYear, fixture.homeSlot);
  const awayContext = getTeamContext(contextByTeam, fixture.tournamentYear, fixture.awaySlot);
  const homeStageContext = getStageContext(homeContext, fixture, sourceMatch);
  const awayStageContext = getStageContext(awayContext, fixture, sourceMatch);
  const homeManagers = managersForTeam(indexes, sourceMatch, homeSourceTeam.teamId);
  const awayManagers = managersForTeam(indexes, sourceMatch, awaySourceTeam.teamId);
  const hostTeams = indexes.hostTeamsByTournament.get(sourceMatch.tournament_id) || new Set();
  const hasConfirmedStartingXI = fixture.tournamentYear >= 1970;

  let keyPlayers;
  let homeStarters = [];
  let awayStarters = [];
  let homeCopyPlayers = [];
  let awayCopyPlayers = [];
  let historicalCoverage;

  if (!hasConfirmedStartingXI) {
    earlyContextFixtures += 1;
    const keyPlayerMetadata = commonMetadata(["teams"]);
    keyPlayers = {
      ...keyPlayerMetadata,
      method: "archive-team-stage-context",
      basis: "The pinned source has no match appearance records for 1930-1966, so no squad player is represented as a confirmed participant.",
      home: [],
      away: []
    };
    historicalCoverage = "team-stage-evidence";
  } else {
    lineupFixtures += 1;
    const keyPlayerMetadata = commonMetadata(["teams", "confirmedStartingXI", "priorTournamentMatches"]);
    homeStarters = startersForTeam(indexes, sourceMatch, homeSourceTeam.teamId);
    awayStarters = startersForTeam(indexes, sourceMatch, awaySourceTeam.teamId);
    if (homeStarters.length !== 11 || awayStarters.length !== 11) {
      throw new Error(
        `${fixture.id} expected 11 confirmed starters per side, found ${homeStarters.length}-${awayStarters.length}`
      );
    }
    const homeStats = getPlayerStatsMap(priorPlayerStats, sourceMatch.tournament_id, homeSourceTeam.teamId);
    const awayStats = getPlayerStatsMap(priorPlayerStats, sourceMatch.tournament_id, awaySourceTeam.teamId);
    homeCopyPlayers = selectKeyPlayers(homeStarters, homeStats, () => true, homeContext);
    awayCopyPlayers = selectKeyPlayers(awayStarters, awayStats, () => true, awayContext);
    const homePlayers = selectKeyPlayers(
      homeStarters,
      homeStats,
      (name) => historicalProfileVersions.has(`${fixture.tournamentYear}|${normalizeTeamName(fixture.homeSlot)}|${normalizePersonKey(name)}`),
      homeContext
    );
    const awayPlayers = selectKeyPlayers(
      awayStarters,
      awayStats,
      (name) => historicalProfileVersions.has(`${fixture.tournamentYear}|${normalizeTeamName(fixture.awaySlot)}|${normalizePersonKey(name)}`),
      awayContext
    );
    if (homePlayers.length < 2 || awayPlayers.length < 2) {
      throw new Error(
        `${fixture.id} needs at least two profile-backed confirmed starters per side, found ${homePlayers.length}-${awayPlayers.length}`
      );
    }
    keyPlayers = {
      ...keyPlayerMetadata,
      displayInputs: ["historicalPlayerProfiles"],
      method: "confirmed-starter-archive-context",
      basis: "Card players are profile-backed members of the confirmed starting XI recorded by the pinned historical cross-check. Paragraph names use only that XI and evidence from earlier matches in the same tournament; no player-to-player tactical duty is inferred.",
      home: homePlayers,
      away: awayPlayers
    };
    historicalCoverage = "confirmed-starting-lineup-evidence";
  }

  const keyInformationInputs = hasConfirmedStartingXI
    ? ["teams", "stage", "manager", "confirmedStartingXI", "priorTournamentMatches", "tournamentFormatRules"]
    : ["teams", "stage", "manager", "hostStatus", "priorTournamentMatches", "tournamentFormatRules"];
  const homeContent = buildHistoricalEvidenceContent({
    fixture,
    sourceMatch,
    side: "home",
    managers: homeManagers,
    context: homeContext,
    opponentContext: awayContext,
    stageContext: homeStageContext,
    opponentStageContext: awayStageContext,
    tableEvidence: preMatchTableEvidenceByFixtureId.get(fixture.id),
    hostTeams,
    copyPlayers: homeCopyPlayers,
    allStarters: homeStarters,
    opponentManagers: awayManagers,
    opponentCopyPlayers: awayCopyPlayers,
    opponentAllStarters: awayStarters
  });
  const awayContent = buildHistoricalEvidenceContent({
    fixture,
    sourceMatch,
    side: "away",
    managers: awayManagers,
    context: awayContext,
    opponentContext: homeContext,
    stageContext: awayStageContext,
    opponentStageContext: homeStageContext,
    tableEvidence: preMatchTableEvidenceByFixtureId.get(fixture.id),
    hostTeams,
    copyPlayers: awayCopyPlayers,
    allStarters: awayStarters,
    opponentManagers: homeManagers,
    opponentCopyPlayers: homeCopyPlayers,
    opponentAllStarters: homeStarters
  });
  const keyInformation = {
    ...commonMetadata(keyInformationInputs),
    historicalMatchId: sourceMatch.match_id,
    historicalCoverage,
    ...(hasConfirmedStartingXI
      ? {
          confirmedStarters: {
            home: homeStarters.map((player) => player.name),
            away: awayStarters.map((player) => player.name)
          }
        }
      : {}),
    home: homeContent.copy,
    away: awayContent.copy,
    localeModel: {
      version: localeModelVersion,
      home: homeContent.localeModel,
      away: awayContent.localeModel
    }
  };

  generatedByFixtureId.set(fixture.id, { ...fixture, keyPlayers, keyInformation });

  updateTeamContext(fixture, sourceMatch, "home", homeContext);
  updateTeamContext(fixture, sourceMatch, "away", awayContext);
  updatePriorPlayerStats({ indexes, sourceMatch, sourceTeam: homeSourceTeam, priorPlayerStats });
  updatePriorPlayerStats({ indexes, sourceMatch, sourceTeam: awaySourceTeam, priorPlayerStats });
}

const fixtures = (historyData.fixtures || []).map((fixture) => generatedByFixtureId.get(fixture.id));
const requiredStakeKeys = [
  [1950, "Uruguay", "Bolivia", "Uruguay", "1950-group4-uruguay-win"],
  [1950, "Uruguay", "Bolivia", "Bolivia", "1950-group4-bolivia-win"],
  [1950, "Chile", "United States", "Chile", "1950-group2-chile-eliminated"],
  [1950, "Chile", "United States", "United States", "1950-group2-usa-win-dependent"],
  [1950, "Brazil", "Yugoslavia", "Brazil", "1950-group1-brazil-win"],
  [1950, "Brazil", "Yugoslavia", "Yugoslavia", "1950-group1-yugoslavia-draw"],
  [1950, "Sweden", "Spain", "Sweden", "1950-third-place-sweden-win"],
  [1950, "Sweden", "Spain", "Spain", "1950-third-place-spain-draw"],
  [1950, "Brazil", "Uruguay", "Brazil", "1950-title-brazil-draw"],
  [1950, "Brazil", "Uruguay", "Uruguay", "1950-title-uruguay-win"],
  [1982, "Italy", "Brazil", "Italy", "1982-group3-italy-win"],
  [1982, "Italy", "Brazil", "Brazil", "1982-group3-brazil-draw"],
  [1962, "Brazil", "Spain", "Brazil", "1962-group3-brazil-draw"],
  [1962, "Brazil", "Spain", "Spain", "1962-group3-spain-win"],
  [2002, "Tunisia", "Belgium", "Tunisia", "2002-grouph-tunisia-loss"],
  [2002, "Tunisia", "Belgium", "Belgium", "2002-grouph-belgium-tunisia-loss"],
  [2006, "Brazil", "Australia", "Brazil", "2006-groupf-brazil-win"],
  [2006, "Brazil", "Australia", "Australia", "2006-groupf-australia-win"],
  [2018, "England", "Panama", "England", "2018-groupg-england-win"],
  [2018, "England", "Panama", "Panama", "2018-groupg-panama-loss"],
  [2022, "Poland", "Saudi Arabia", "Poland", "2022-groupc-poland-saudi-win"],
  [2022, "Poland", "Saudi Arabia", "Saudi Arabia", "2022-groupc-saudi-win"],
  [2022, "Ecuador", "Senegal", "Ecuador", "2022-groupa-ecuador-draw"],
  [2022, "Ecuador", "Senegal", "Senegal", "2022-groupa-senegal-win"]
];
for (const [year, teamA, teamB, teamName, expectedKey] of requiredStakeKeys) {
  const fixture = fixtures.find((candidate) => sameHistoricalMatch(candidate, year, teamA, teamB));
  if (!fixture) throw new Error(`Historical key-information regression: missing ${year} ${teamA}-${teamB}`);
  const side = normalizeTeamName(fixture.homeSlot) === normalizeTeamName(teamName) ? "home" : "away";
  const actualKey = fixture.keyInformation?.localeModel?.[side]?.slots?.matchup?.key;
  if (actualKey !== expectedKey) {
    throw new Error(`Historical key-information regression: ${year} ${teamName} expected ${expectedKey}, found ${actualKey}`);
  }
}

const forbiddenTacticalClaims = /\b(?:tracks?|guards?|marks|marking|contest(?:s|ing)? central|connect(?:s|ing)? (?:the )?phases|runs? beyond|lead(?:s|ing)? the attack|support runs?|press(?:es|ing)? the next pass|attack(?:s|ing)? the space behind)\b/i;
const unsupportedEditorialJudgment = /\b(?:proven scoring|decisive kickoff|documented warning|clearest threat|cannot ignore|must account for|must weigh|must solve|must overcome)\b/i;
const awkwardTeamPossessive = /(?<!the )\b(?:Netherlands|United States)'|\bDutch East Indies's\b/i;
const bareArticleTeam = /(?<!the )\b(?:United States|Soviet Union|Netherlands)\b/i;
const databaseLikeTemplate = /\b(?:the points comparison|prior defensive evidence|the earlier record for\b[^.!?]*\bcontains|completing the managerial matchup|providing the opposing tournament leadership|other side of the touchline matchup)\b/i;
const malformedScoringTemplate = /\bface\s+(?:the\s+)?(?:[A-Z][\p{L}'’.-]*\s*)+'\s+\d+\s+goals?\b/iu;
for (const fixture of fixtures) {
  for (const side of ["home", "away"]) {
    const copy = fixture.keyInformation?.[side] || "";
    const sentences = copy.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length !== 4) {
      throw new Error(`${fixture.id} ${side} expected four Key-information sentences, found ${sentences.length}`);
    }
    if (fixture.status !== "CANCELLED") {
      const words = copyWordCount(copy);
      const displayMode = fixture.keyInformation?.localeModel?.[side]?.slots?.identity?.displayMode;
      const minimumWords = displayMode === "lineup-comparison" ? 40 : 50;
      const maximumWords = displayMode === "lineup-comparison" ? 80 : 85;
      if (words < minimumWords || words > maximumWords) {
        throw new Error(`${fixture.id} ${side} expected ${minimumWords}-${maximumWords} words, found ${words}: ${copy}`);
      }
      if (forbiddenTacticalClaims.test(copy)) {
        throw new Error(`${fixture.id} ${side} contains an inferred player-duty claim: ${copy}`);
      }
      if (unsupportedEditorialJudgment.test(copy)) {
        throw new Error(`${fixture.id} ${side} contains an unsupported editorial judgment: ${copy}`);
      }
      if (awkwardTeamPossessive.test(copy)) {
        throw new Error(`${fixture.id} ${side} contains an awkward team possessive: ${copy}`);
      }
      if (bareArticleTeam.test(copy)) {
        throw new Error(`${fixture.id} ${side} omits the English definite article for a team name: ${copy}`);
      }
      if (databaseLikeTemplate.test(copy) || malformedScoringTemplate.test(copy)) {
        throw new Error(`${fixture.id} ${side} contains database-like or malformed prose: ${copy}`);
      }
      if (/\b(?:a the (?:Netherlands|Soviet Union|United States)|an USA) XI\b/i.test(copy)) {
        throw new Error(`${fixture.id} ${side} contains a malformed team article: ${copy}`);
      }
      if (/\bearlier matches have produced\b|\b\d+ goals? across 1 match\b|\bacross 1 matches\b|\b1 times\b|\bas the host side as\b|\bhave no goals conceded\b/i.test(copy)) {
        throw new Error(`${fixture.id} ${side} contains a known number-agreement or zero-conceded wording defect: ${copy}`);
      }
      if (/alongside\b[^.;]*\balongside\b/i.test(copy)) {
        throw new Error(`${fixture.id} ${side} repeats "alongside" within one clause: ${copy}`);
      }
      if (/(?:no goals|0 goals?|0) conceded,?\s+(?:and\s+)?\d+ clean sheets?/i.test(copy)) {
        throw new Error(`${fixture.id} ${side} redundantly states a shutout and clean-sheet count: ${copy}`);
      }
      const model = fixture.keyInformation?.localeModel?.[side];
      if (phaseUsesStandings(model?.stage?.phase) && sentences.slice(2).some((sentence) => /\bpoints?\b/i.test(sentence))) {
        throw new Error(`${fixture.id} ${side} repeats table points after the matchup sentence: ${copy}`);
      }
      if (
        displayMode === "lineup-comparison" &&
        /\b(?:goal balance|before this|at stake|group points?|published (?:before|after) kickoff|round-of-|quarter-final|semi-final|world title|\d+W-\d+D-\d+L)\b/i.test(copy)
      ) {
        throw new Error(`${fixture.id} ${side} lineup comparison contains removed match administration: ${copy}`);
      }
      if (Number(fixture.tournamentYear) >= 1970) {
        const selectedStarters = model?.slots?.identity?.confirmedStarters || [];
        if (selectedStarters.length < 1 || selectedStarters.length > 3) {
          throw new Error(`${fixture.id} ${side} must retain 1-3 named confirmed starters; found ${selectedStarters.length}`);
        }
      }
      if (fixture.keyInformation?.localeModel?.[side]?.kind !== "historical-evidence") {
        throw new Error(`${fixture.id} ${side} must use the historical-evidence locale model`);
      }
    }
  }
}

const belgiumRussia2002 = fixtures.find((fixture) => sameHistoricalMatch(fixture, 2002, "Belgium", "Russia"));
if (!belgiumRussia2002) throw new Error("Historical copy regression: missing Belgium-Russia 2002");
const belgiumSide = normalizeTeamName(belgiumRussia2002.homeSlot) === "belgium" ? "home" : "away";
const belgiumCopy = belgiumRussia2002.keyInformation[belgiumSide];
if (/\b(?:progress|qualif|eliminat|points?|at stake)\b/i.test(belgiumCopy)) {
  throw new Error(`Belgium-Russia 2002 lineup comparison must omit match administration: ${belgiumCopy}`);
}

for (const fixture of fixtures.filter((candidate) => Number(candidate.tournamentYear) === 1958 && [candidate.homeSlot, candidate.awaySlot].includes("Scotland"))) {
  const side = fixture.homeSlot === "Scotland" ? "home" : "away";
  const managers = fixture.keyInformation.localeModel[side].slots.identity.managers;
  if (managers.length !== 1 || managers[0] !== "Dawson Walker" || fixture.keyInformation[side].includes("Matt Busby")) {
    throw new Error(`${fixture.id} must identify Dawson Walker, not Matt Busby, as Scotland's tournament manager`);
  }
}
for (const fixture of fixtures.filter((candidate) => Number(candidate.tournamentYear) === 1966 && [candidate.homeSlot, candidate.awaySlot].includes("North Korea"))) {
  const side = fixture.homeSlot === "North Korea" ? "home" : "away";
  const managers = fixture.keyInformation.localeModel[side].slots.identity.managers;
  if (managers.length !== 1 || managers[0] !== "Myung Rye-hyun" || fixture.keyInformation[side].includes("Rye-hyun Myung")) {
    throw new Error(`${fixture.id} must use the reviewed 1966 North Korea manager rendering Myung Rye-hyun`);
  }
}

const brazilGermany2002 = fixtures.find((fixture) => sameHistoricalMatch(fixture, 2002, "Brazil", "Germany"));
if (!brazilGermany2002) throw new Error("Historical player-salience regression: missing Brazil-Germany 2002 final");
const germanySide = normalizeTeamName(brazilGermany2002.homeSlot) === "germany" ? "home" : "away";
const germanyCopyPlayers = brazilGermany2002.keyInformation.localeModel[germanySide].slots.identity.confirmedStarters;
const germanyCardPlayers = brazilGermany2002.keyPlayers[germanySide].map((player) => player.name);
if (!germanyCopyPlayers.includes("Oliver Kahn") || !germanyCardPlayers.includes("Oliver Kahn")) {
  throw new Error(`Brazil-Germany 2002 must retain Oliver Kahn from the confirmed XI after six prior starts and five clean sheets`);
}
const sourceIds = [
  ...new Set([
    ...(historyData.sourceIds || []).filter(
      (id) => id !== supersededFjelstulSourceId && id !== supersededNarrativeSourceId
    ),
    sourceId,
    fjelstulSourceId
  ])
];
const nextHistoryData = {
  ...historyData,
  sourceIds,
  keyInformationGeneration: {
    sourceId,
    mode: "archive-present-tense",
    schemaVersion,
    narrativeMoment: "team-entrance",
    outcomeCutoff: "kickoff",
    generatedBy: generator,
    coverage: "all-played-men-1930-2022",
    evidenceInputs: [
      "teams",
      "stage",
      "confirmedStartingXI",
      "manager",
      "hostStatus",
      "priorTournamentMatches",
      "tournamentFormatRules",
      "registeredSquadContext"
    ],
    excludedInputs,
    researchSources: [
      {
        id: fjelstulSourceId,
        label: "Fjelstul World Cup Database",
        type: "cross-check",
        checkedAt: "2026-07-22T00:00:00Z",
        commit: fjelstulCommit,
        sha256: fjelstulSha256,
        license: "CC-BY-SA-4.0",
        url: fjelstulUrl
      }
    ],
    temporalPolicy: "Each brief is written in present tense at team entrance. The current match's score, winner, events, cards, substitutions, and shootout are excluded; earlier tournament matches may inform later briefs."
  },
  fixtures
};

await writeFile(historyOutputPath, `${JSON.stringify(nextHistoryData, null, 2)}\n`);
console.log(
  `Historical archive-present-tense key information populated: ${fixtures.length} fixtures (${matched} played matches; ${earlyContextFixtures} team-context, ${lineupFixtures} confirmed-lineup, ${cancelled} cancelled preserved).`
);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
