#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const errors = [];

async function readJson(fileName) {
  const filePath = path.join(dataDir, fileName);
  return JSON.parse(await readFile(filePath, "utf8"));
}

function fail(message) {
  errors.push(message);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function requireSourceIds(sourceIds, sourceIdSet, owner) {
  assert(Array.isArray(sourceIds), `${owner} must include sourceIds`);
  for (const sourceId of sourceIds || []) {
    assert(sourceIdSet.has(sourceId), `${owner} references unknown source "${sourceId}"`);
  }
}

const [fixturesData, standingsData, teamsData, tournamentData] = await Promise.all([
  readJson("fixtures.json"),
  readJson("standings.json"),
  readJson("teams.json"),
  readJson("tournament.json")
]);

const sourceIds = new Set();
for (const source of tournamentData.sources || []) {
  assert(source.id, "Each source must have an id");
  assert(!sourceIds.has(source.id), `Duplicate source id "${source.id}"`);
  sourceIds.add(source.id);
  assert(source.label, `Source "${source.id}" must have a label`);
  assert(source.type, `Source "${source.id}" must have a type`);
  assert(!Number.isNaN(new Date(source.checkedAt).getTime()), `Source "${source.id}" must have a valid checkedAt`);
}

requireSourceIds(fixturesData.sourceIds, sourceIds, "fixtures.json");
requireSourceIds(standingsData.sourceIds, sourceIds, "standings.json");
requireSourceIds(teamsData.sourceIds, sourceIds, "teams.json");

const groups = new Map();
for (const group of tournamentData.groups || []) {
  assert(group.id, "Each group must have an id");
  assert(group.label, `Group "${group.id}" must have a label`);
  assert(!groups.has(group.id), `Duplicate group id "${group.id}"`);
  assert(Array.isArray(group.teamIds), `Group "${group.id}" must include teamIds`);
  assert(group.teamIds.length === 4, `Group "${group.id}" must have exactly four teams`);
  groups.set(group.id, group);
}

const stages = new Set();
for (const stage of tournamentData.stages || []) {
  assert(stage.id, "Each stage must have an id");
  assert(stage.type === "group" || stage.type === "knockout", `Stage "${stage.id}" has invalid type`);
  stages.add(stage.id);
}

const teams = new Map();
for (const team of teamsData.teams || []) {
  assert(team.id, "Each team must have an id");
  assert(!teams.has(team.id), `Duplicate team id "${team.id}"`);
  assert(team.name, `Team "${team.id}" must have a display name`);
  assert(team.officialName, `Team "${team.id}" must have an officialName`);
  assert(groups.has(team.groupId), `Team "${team.id}" references unknown group "${team.groupId}"`);
  assert(isNumber(team.fifaRank), `Team "${team.id}" must have a numeric fifaRank`);
  teams.set(team.id, team);
}

for (const group of groups.values()) {
  for (const teamId of group.teamIds) {
    assert(teams.has(teamId), `Group "${group.id}" references unknown team "${teamId}"`);
    assert(teams.get(teamId)?.groupId === group.id, `Team "${teamId}" group does not match group "${group.id}"`);
  }
}

for (const [groupId, rows] of Object.entries(standingsData.groups || {})) {
  assert(groups.has(groupId), `standings.json includes unknown group "${groupId}"`);
  assert(Array.isArray(rows), `Standings for group "${groupId}" must be an array`);
  assert(rows.length === 4, `Standings for group "${groupId}" must have four rows`);
  const rowTeams = new Set();

  for (const row of rows) {
    assert(teams.has(row.teamId), `Standings group "${groupId}" references unknown team "${row.teamId}"`);
    assert(!rowTeams.has(row.teamId), `Standings group "${groupId}" duplicates team "${row.teamId}"`);
    rowTeams.add(row.teamId);
    assert(groups.get(groupId)?.teamIds.includes(row.teamId), `Standings team "${row.teamId}" is not in group "${groupId}"`);

    for (const key of ["played", "wins", "draws", "losses", "gf", "ga"]) {
      assert(isNumber(row[key]), `Standings row "${row.teamId}" has invalid ${key}`);
      assert(row[key] >= 0, `Standings row "${row.teamId}" has negative ${key}`);
    }

    assert(
      row.played === row.wins + row.draws + row.losses,
      `Standings row "${row.teamId}" played must equal wins + draws + losses`
    );
  }
}

const fixtureIds = new Set();
for (const fixture of fixturesData.fixtures || []) {
  assert(fixture.id, "Each fixture must have an id");
  assert(!fixtureIds.has(fixture.id), `Duplicate fixture id "${fixture.id}"`);
  fixtureIds.add(fixture.id);
  assert(stages.has(fixture.stage), `Fixture "${fixture.id}" references unknown stage "${fixture.stage}"`);
  assert(!Number.isNaN(new Date(fixture.kickoffUtc).getTime()), `Fixture "${fixture.id}" must have a valid kickoffUtc`);
  const hasHomeTeam = fixture.homeTeamId && teams.has(fixture.homeTeamId);
  const hasAwayTeam = fixture.awayTeamId && teams.has(fixture.awayTeamId);
  const hasHomeSlot = typeof fixture.homeSlot === "string" && fixture.homeSlot.length > 0;
  const hasAwaySlot = typeof fixture.awaySlot === "string" && fixture.awaySlot.length > 0;

  assert(hasHomeTeam || hasHomeSlot, `Fixture "${fixture.id}" must include a valid homeTeamId or homeSlot`);
  assert(hasAwayTeam || hasAwaySlot, `Fixture "${fixture.id}" must include a valid awayTeamId or awaySlot`);
  if (fixture.homeTeamId) {
    assert(hasHomeTeam, `Fixture "${fixture.id}" has unknown homeTeamId "${fixture.homeTeamId}"`);
  }
  if (fixture.awayTeamId) {
    assert(hasAwayTeam, `Fixture "${fixture.id}" has unknown awayTeamId "${fixture.awayTeamId}"`);
  }
  if (hasHomeTeam && hasAwayTeam) {
    assert(fixture.homeTeamId !== fixture.awayTeamId, `Fixture "${fixture.id}" cannot use the same team twice`);
  }
  assert(fixture.venue, `Fixture "${fixture.id}" must have a venue`);
  assert(["SCHEDULED", "LIVE", "FT", "POSTPONED", "CANCELLED"].includes(fixture.status), `Fixture "${fixture.id}" has invalid status`);

  if (fixture.stage === "group") {
    assert(groups.has(fixture.groupId), `Fixture "${fixture.id}" references unknown group "${fixture.groupId}"`);
    assert(hasHomeTeam, `Group fixture "${fixture.id}" must include a known homeTeamId`);
    assert(hasAwayTeam, `Group fixture "${fixture.id}" must include a known awayTeamId`);
    assert(teams.get(fixture.homeTeamId)?.groupId === fixture.groupId, `Fixture "${fixture.id}" home team is not in group "${fixture.groupId}"`);
    assert(teams.get(fixture.awayTeamId)?.groupId === fixture.groupId, `Fixture "${fixture.id}" away team is not in group "${fixture.groupId}"`);
  }

  if (fixture.status === "FT") {
    assert(fixture.score, `Final fixture "${fixture.id}" must include score`);
    assert(isNumber(fixture.score?.home), `Final fixture "${fixture.id}" must include numeric home score`);
    assert(isNumber(fixture.score?.away), `Final fixture "${fixture.id}" must include numeric away score`);
  }

  if (fixture.projection) {
    const total = fixture.projection.home + fixture.projection.draw + fixture.projection.away;
    assert(sourceIds.has(fixture.projection.sourceId), `Fixture "${fixture.id}" projection references unknown source`);
    assert(total === 100, `Fixture "${fixture.id}" projection must total 100`);
  }

  if (fixture.keyPlayers) {
    assert(sourceIds.has(fixture.keyPlayers.sourceId), `Fixture "${fixture.id}" keyPlayers references unknown source`);
    assert(Array.isArray(fixture.keyPlayers.home), `Fixture "${fixture.id}" keyPlayers.home must be an array`);
    assert(Array.isArray(fixture.keyPlayers.away), `Fixture "${fixture.id}" keyPlayers.away must be an array`);
  }

  assert(fixture.h2h, `Fixture "${fixture.id}" must include h2h status`);
  assert(
    ["loaded", "verified-empty", "not-loaded", "research-pending"].includes(fixture.h2h.status),
    `Fixture "${fixture.id}" has invalid h2h status`
  );
  if (fixture.h2h.sourceId) {
    assert(sourceIds.has(fixture.h2h.sourceId), `Fixture "${fixture.id}" h2h references unknown source`);
  }
  assert(
    fixture.h2h.results === null || Array.isArray(fixture.h2h.results),
    `Fixture "${fixture.id}" h2h.results must be null or an array`
  );

  if (Array.isArray(fixture.h2h.results)) {
    for (const [index, result] of fixture.h2h.results.entries()) {
      assert(result.date, `Fixture "${fixture.id}" h2h result ${index + 1} must include date`);
      assert(result.competition, `Fixture "${fixture.id}" h2h result ${index + 1} must include competition`);
      assert(result.venue, `Fixture "${fixture.id}" h2h result ${index + 1} must include venue`);

      const hasTextScore = typeof result.score === "string" && result.score.length > 0;
      const hasStructuredScore =
        result.homeTeamId &&
        result.awayTeamId &&
        isNumber(result.homeScore) &&
        isNumber(result.awayScore);

      assert(
        hasTextScore || hasStructuredScore,
        `Fixture "${fixture.id}" h2h result ${index + 1} must include either score text or structured team scores`
      );

      if (hasStructuredScore) {
        assert(teams.has(result.homeTeamId), `Fixture "${fixture.id}" h2h result ${index + 1} has unknown homeTeamId "${result.homeTeamId}"`);
        assert(teams.has(result.awayTeamId), `Fixture "${fixture.id}" h2h result ${index + 1} has unknown awayTeamId "${result.awayTeamId}"`);
        assert(result.homeTeamId !== result.awayTeamId, `Fixture "${fixture.id}" h2h result ${index + 1} cannot use the same team twice`);
      }
    }
  }
}

if (errors.length) {
  console.error(`Data validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Data validation passed: ${teams.size} teams, ${groups.size} groups, ${fixtureIds.size} fixtures, ${sourceIds.size} sources.`
);
