#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isPlayerNameMatch, normalizePlayerName } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const errors = [];

async function readJson(fileName) {
  const filePath = path.join(dataDir, fileName);
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readOptionalJson(fileName) {
  try {
    return await readJson(fileName);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
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

function isDayKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime());
}

function isLocalizedCopy(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getDefaultCopyText(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (!isLocalizedCopy(value)) {
    return "";
  }

  return String(value.en || "").trim();
}

function validateLocalizedCopy(value, owner) {
  if (!isLocalizedCopy(value)) {
    return;
  }

  assert(typeof value.en === "string" && value.en.trim(), `${owner} localized copy must include en`);
  assert(typeof value.zh === "string" && value.zh.trim(), `${owner} localized copy must include zh`);

  for (const [language, text] of Object.entries(value)) {
    assert(typeof text === "string" && text.trim(), `${owner}.${language} must be a non-empty string`);
  }
}

function wordCount(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function findUnavailablePlayer(records, playerName) {
  if (!records?.length || !playerName) {
    return null;
  }

  const playerNameKey = normalizePlayerName(playerName);
  return (
    records.find((record) => normalizePlayerName(record.name) === playerNameKey) ||
    records.find((record) => isPlayerNameMatch(playerName, record.name) || isPlayerNameMatch(record.name, playerName)) ||
    null
  );
}

function isPlayerInCurrentSquad(playerName, includedNames) {
  return (includedNames || []).some((rosterName) => isPlayerNameMatch(playerName, rosterName));
}

function requireSourceIds(sourceIds, sourceIdSet, owner) {
  assert(Array.isArray(sourceIds), `${owner} must include sourceIds`);
  for (const sourceId of sourceIds || []) {
    assert(sourceIdSet.has(sourceId), `${owner} references unknown source "${sourceId}"`);
  }
}

function isGeneratedScorerNote(note) {
  return /^Scored for .+ in .+ vs .+\.$/.test(String(note || "").trim());
}

function createEmptyStanding(teamId) {
  return {
    teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0
  };
}

function applyGroupResult(table, fixture) {
  const home = table.get(fixture.homeTeamId);
  const away = table.get(fixture.awayTeamId);
  const homeScore = fixture.score.home;
  const awayScore = fixture.score.away;

  home.played += 1;
  away.played += 1;
  home.gf += homeScore;
  home.ga += awayScore;
  away.gf += awayScore;
  away.ga += homeScore;

  if (homeScore > awayScore) {
    home.wins += 1;
    away.losses += 1;
  } else if (awayScore > homeScore) {
    away.wins += 1;
    home.losses += 1;
  } else {
    home.draws += 1;
    away.draws += 1;
  }
}

const [
  fixturesData,
  historyData,
  matchupResearchData,
  playerAvailabilityData,
  playerProfilesData,
  standingsData,
  teamsData,
  tournamentData
] = await Promise.all([
  readJson("fixtures.json"),
  readJson("history.json"),
  readOptionalJson("matchup-research-notes.json"),
  readOptionalJson("player-availability.json"),
  readOptionalJson("player-profiles.json"),
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

const tournamentCatchUpItems = [tournamentData.catchUp, tournamentData.news].flatMap((items) =>
  Array.isArray(items) ? items : []
);

for (const [index, item] of tournamentCatchUpItems.entries()) {
  const owner = `tournament catch-up item ${index + 1}`;
  const timestamp = item?.publishedAt || item?.updatedAt || "";

  assert(getDefaultCopyText(item?.headline), `${owner} must include a headline`);
  for (const key of ["headline", "body", "meta", "sourceLabel"]) {
    validateLocalizedCopy(item?.[key], `${owner}.${key}`);
  }
  if (Array.isArray(item?.standouts)) {
    item.standouts.forEach((standout, standoutIndex) => {
      validateLocalizedCopy(standout, `${owner}.standouts[${standoutIndex}]`);
    });
  } else {
    validateLocalizedCopy(item?.standouts, `${owner}.standouts`);
  }
  assert(
    isDayKey(item?.date) || !Number.isNaN(new Date(timestamp).getTime()),
    `${owner} must include a valid date, publishedAt, or updatedAt`
  );

  if (item?.sourceId) {
    assert(sourceIds.has(item.sourceId), `${owner} references unknown source "${item.sourceId}"`);
  }

  if (item?.priority !== undefined) {
    assert(Number.isFinite(Number(item.priority)), `${owner} priority must be numeric`);
  }
}

requireSourceIds(fixturesData.sourceIds, sourceIds, "fixtures.json");
requireSourceIds(historyData.sourceIds, sourceIds, "history.json");
if (playerAvailabilityData) {
  requireSourceIds(playerAvailabilityData.sourceIds, sourceIds, "player-availability.json");
}
if (playerProfilesData) {
  requireSourceIds(playerProfilesData.sourceIds, sourceIds, "player-profiles.json");
}
if (matchupResearchData) {
  requireSourceIds(matchupResearchData.sourceIds, sourceIds, "matchup-research-notes.json");
}
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
  for (const field of ["name", "officialName", "standingName"]) {
    if (team[field]) {
      assert(
        !String(team[field]).includes("...") && !String(team[field]).includes("…"),
        `Team "${team.id}" ${field} must not include a hard-coded ellipsis`
      );
    }
  }
  if (team.styleTags !== undefined) {
    assert(Array.isArray(team.styleTags), `Team "${team.id}" styleTags must be an array`);
    assert(
      team.styleTags.length >= 2 && team.styleTags.length <= 3,
      `Team "${team.id}" styleTags must include 2-3 tags`
    );
    for (const [index, tag] of team.styleTags.entries()) {
      assert(
        typeof tag === "string" && tag.trim(),
        `Team "${team.id}" styleTags[${index}] must be a non-empty string`
      );
      assert(
        !tag.includes("...") && !tag.includes("…"),
        `Team "${team.id}" styleTags[${index}] must not include a hard-coded ellipsis`
      );
      assert(!tag.includes(":"), `Team "${team.id}" styleTags[${index}] must not include a category prefix`);
    }
  }
  assert(groups.has(team.groupId), `Team "${team.id}" references unknown group "${team.groupId}"`);
  assert(isNumber(team.fifaRank), `Team "${team.id}" must have a numeric fifaRank`);
  teams.set(team.id, team);
}

if (playerProfilesData) {
  assert(
    typeof playerProfilesData.updatedAt === "string" &&
      !Number.isNaN(new Date(playerProfilesData.updatedAt).getTime()),
    "player-profiles.json must include a valid updatedAt"
  );
  assert(
    playerProfilesData.profiles && typeof playerProfilesData.profiles === "object",
    "player-profiles.json must include profiles"
  );
}

const playerProfiles = new Map(Object.entries(playerProfilesData?.profiles || {}));
const playerAvailabilityByTeam = new Map();
const fixtureUnavailableRefs = [];
const requiredProfileNames = new Set();

for (const group of groups.values()) {
  for (const teamId of group.teamIds) {
    assert(teams.has(teamId), `Group "${group.id}" references unknown team "${teamId}"`);
    assert(teams.get(teamId)?.groupId === group.id, `Team "${teamId}" group does not match group "${group.id}"`);
  }
}

if (playerAvailabilityData) {
  assert(
    typeof playerAvailabilityData.updatedAt === "string" &&
      !Number.isNaN(new Date(playerAvailabilityData.updatedAt).getTime()),
    "player-availability.json must include a valid updatedAt"
  );
  assert(
    playerAvailabilityData.teams && typeof playerAvailabilityData.teams === "object",
    "player-availability.json must include teams"
  );

  for (const [teamId, availability] of Object.entries(playerAvailabilityData.teams || {})) {
    assert(teams.has(teamId), `player-availability.json references unknown team "${teamId}"`);
    assert(
      availability && typeof availability === "object" && !Array.isArray(availability),
      `player-availability.json team "${teamId}" must be an object`
    );
    if (!availability || typeof availability !== "object" || Array.isArray(availability)) {
      continue;
    }
    assert(
      !availability.included || Array.isArray(availability.included),
      `player-availability.json team "${teamId}" included must be an array`
    );
    assert(
      !availability.unavailable || Array.isArray(availability.unavailable),
      `player-availability.json team "${teamId}" unavailable must be an array`
    );

    const includedNames = (availability.included || []).filter((name) => typeof name === "string" && name.trim());
    const unavailable = [];
    const fixtureUnavailableByFixture = new Map();

    for (const [index, player] of (availability.unavailable || []).entries()) {
      assert(
        typeof player?.name === "string" && player.name.trim(),
        `player-availability.json team "${teamId}" unavailable[${index}] must include a player name`
      );
      assert(
        typeof player?.reason === "string" && player.reason.trim(),
        `player-availability.json team "${teamId}" unavailable[${index}] must include a reason`
      );
      assert(
        typeof player?.sourceId === "string" && sourceIds.has(player.sourceId),
        `player-availability.json team "${teamId}" unavailable[${index}] references unknown source`
      );

      unavailable.push(player);
    }

    assert(
      !availability.fixtureUnavailable || Array.isArray(availability.fixtureUnavailable),
      `player-availability.json team "${teamId}" fixtureUnavailable must be an array`
    );

    for (const [index, player] of (availability.fixtureUnavailable || []).entries()) {
      assert(
        typeof player?.fixtureId === "string" && player.fixtureId.trim(),
        `player-availability.json team "${teamId}" fixtureUnavailable[${index}] must include a fixtureId`
      );
      assert(
        typeof player?.name === "string" && player.name.trim(),
        `player-availability.json team "${teamId}" fixtureUnavailable[${index}] must include a player name`
      );
      assert(
        typeof player?.reason === "string" && player.reason.trim(),
        `player-availability.json team "${teamId}" fixtureUnavailable[${index}] must include a reason`
      );
      assert(
        typeof player?.sourceId === "string" && sourceIds.has(player.sourceId),
        `player-availability.json team "${teamId}" fixtureUnavailable[${index}] references unknown source`
      );

      fixtureUnavailableRefs.push({ teamId, index, player });
      const fixturePlayers = fixtureUnavailableByFixture.get(player.fixtureId) || [];
      fixturePlayers.push(player);
      fixtureUnavailableByFixture.set(player.fixtureId, fixturePlayers);
    }

    playerAvailabilityByTeam.set(teamId, { includedNames, unavailable, fixtureUnavailableByFixture });
  }
}

const computedStandings = new Map(
  [...groups.values()].map((group) => [
    group.id,
    new Map(group.teamIds.map((teamId) => [teamId, createEmptyStanding(teamId)]))
  ])
);

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

    if (
      fixture.stage === "group" &&
      groups.has(fixture.groupId) &&
      teams.has(fixture.homeTeamId) &&
      teams.has(fixture.awayTeamId) &&
      isNumber(fixture.score?.home) &&
      isNumber(fixture.score?.away)
    ) {
      applyGroupResult(computedStandings.get(fixture.groupId), fixture);
    }
  }

  if (fixture.resultHighlights !== undefined) {
    assert(fixture.status === "FT", `Fixture "${fixture.id}" resultHighlights should only be used after full time`);
    assert(Array.isArray(fixture.resultHighlights), `Fixture "${fixture.id}" resultHighlights must be an array`);

    for (const [index, highlight] of (fixture.resultHighlights || []).entries()) {
      assert(
        typeof highlight === "string" && highlight.trim(),
        `Fixture "${fixture.id}" resultHighlights[${index}] must be a non-empty string`
      );
      assert(
        typeof highlight === "string" && highlight.trim().length <= 95,
        `Fixture "${fixture.id}" resultHighlights[${index}] should stay compact`
      );
    }
  }

  if (fixture.projection) {
    const total = fixture.projection.home + fixture.projection.draw + fixture.projection.away;
    assert(sourceIds.has(fixture.projection.sourceId), `Fixture "${fixture.id}" projection references unknown source`);
    assert(total === 100, `Fixture "${fixture.id}" projection must total 100`);
  }

  for (const field of ["goalsHome", "goalsAway"]) {
    if (fixture[field] === undefined) {
      continue;
    }

    assert(Array.isArray(fixture[field]), `Fixture "${fixture.id}" ${field} must be an array`);
    for (const [index, goal] of (fixture[field] || []).entries()) {
      assert(
        typeof goal?.name === "string" && goal.name.trim(),
        `Fixture "${fixture.id}" ${field}[${index}] must include a scorer name`
      );
      if (typeof goal?.name === "string" && goal.name.trim()) {
        requiredProfileNames.add(goal.name);
      }
    }
  }

  if (fixture.keyPlayers) {
    assert(sourceIds.has(fixture.keyPlayers.sourceId), `Fixture "${fixture.id}" keyPlayers references unknown source`);
    assert(Array.isArray(fixture.keyPlayers.home), `Fixture "${fixture.id}" keyPlayers.home must be an array`);
    assert(Array.isArray(fixture.keyPlayers.away), `Fixture "${fixture.id}" keyPlayers.away must be an array`);

    if (fixture.stage === "group") {
      for (const side of ["home", "away"]) {
        const teamId = side === "home" ? fixture.homeTeamId : fixture.awayTeamId;
        const availability = playerAvailabilityByTeam.get(teamId);

        for (const [index, player] of (fixture.keyPlayers[side] || []).entries()) {
          assert(
            typeof player === "object" && typeof player.name === "string" && player.name.trim(),
            `Fixture "${fixture.id}" keyPlayers.${side}[${index}] must include a player name`
          );
          if (typeof player?.name === "string" && player.name.trim()) {
            const unavailablePlayer =
              findUnavailablePlayer(availability?.unavailable, player.name) ||
              findUnavailablePlayer(availability?.fixtureUnavailableByFixture.get(fixture.id), player.name);

            assert(
              !unavailablePlayer,
              `Fixture "${fixture.id}" keyPlayers.${side}[${index}] lists unavailable ${teamId} player "${player.name}": ${unavailablePlayer?.reason || "unavailable"}`
            );

            if (availability?.includedNames.length) {
              assert(
                isPlayerInCurrentSquad(player.name, availability.includedNames),
                `Fixture "${fixture.id}" keyPlayers.${side}[${index}] lists "${player.name}", who is not in player-availability.json current squad for ${teamId}`
              );
            }

            requiredProfileNames.add(player.name);
          }
          assert(
            typeof player === "object" && typeof player.note === "string" && player.note.trim(),
            `Fixture "${fixture.id}" keyPlayers.${side}[${index}] must include a player note`
          );
        }
      }
    }
  }

  if (fixture.keyInformation) {
    assert(
      sourceIds.has(fixture.keyInformation.sourceId),
      `Fixture "${fixture.id}" keyInformation references unknown source`
    );
    if (fixture.keyInformation.researchSourceIds !== undefined) {
      requireSourceIds(
        fixture.keyInformation.researchSourceIds,
        sourceIds,
        `Fixture "${fixture.id}" keyInformation.researchSourceIds`
      );
    }
  }

  if (fixture.stage === "group") {
    assert(fixture.keyInformation, `Group fixture "${fixture.id}" must include matchup-aware keyInformation`);

    for (const side of ["home", "away"]) {
      const copy = fixture.keyInformation?.[side];
      assert(
        typeof copy === "string" && copy.trim().length >= 180,
        `Group fixture "${fixture.id}" keyInformation.${side} must include a detailed matchup note`
      );
      assert(
        typeof copy === "string" && copy.trim().split(/\s+/).length <= 85,
        `Group fixture "${fixture.id}" keyInformation.${side} should stay concise`
      );
      assert(
        !/main names to track|key information is not loaded/i.test(copy || ""),
        `Group fixture "${fixture.id}" keyInformation.${side} uses generic placeholder wording`
      );
      assert(
        /Against /.test(copy || ""),
        `Group fixture "${fixture.id}" keyInformation.${side} must describe the opponent relationship`
      );
    }
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

if (matchupResearchData) {
  assert(
    typeof matchupResearchData.updatedAt === "string" &&
      !Number.isNaN(new Date(matchupResearchData.updatedAt).getTime()),
    "matchup-research-notes.json must include a valid updatedAt"
  );
  assert(
    matchupResearchData.fixtures && typeof matchupResearchData.fixtures === "object" && !Array.isArray(matchupResearchData.fixtures),
    "matchup-research-notes.json must include fixtures"
  );

  for (const [fixtureId, research] of Object.entries(matchupResearchData.fixtures || {})) {
    assert(fixtureIds.has(fixtureId), `matchup-research-notes.json references unknown fixture "${fixtureId}"`);
    assert(
      research && typeof research === "object" && !Array.isArray(research),
      `matchup-research-notes.json fixture "${fixtureId}" must be an object`
    );
    if (!research || typeof research !== "object" || Array.isArray(research)) {
      continue;
    }

    assert(
      ["researched", "needs-refresh"].includes(research.status),
      `matchup-research-notes.json fixture "${fixtureId}" has invalid status`
    );
    assert(
      typeof research.checkedAt === "string" && !Number.isNaN(new Date(research.checkedAt).getTime()),
      `matchup-research-notes.json fixture "${fixtureId}" must include a valid checkedAt`
    );
    requireSourceIds(research.sourceIds, sourceIds, `matchup-research-notes.json fixture "${fixtureId}"`);

    for (const side of ["home", "away"]) {
      const sideResearch = research[side];
      assert(
        sideResearch && typeof sideResearch === "object" && !Array.isArray(sideResearch),
        `matchup-research-notes.json fixture "${fixtureId}" ${side} must be an object`
      );
      if (!sideResearch || typeof sideResearch !== "object" || Array.isArray(sideResearch)) {
        continue;
      }

      for (const field of ["summary", "matchupProblem", "attackPlan", "threat"]) {
        assert(
          typeof sideResearch[field] === "string" && sideResearch[field].trim(),
          `matchup-research-notes.json fixture "${fixtureId}" ${side}.${field} must be a non-empty string`
        );
      }

      if (sideResearch.contextSentence !== undefined) {
        assert(
          typeof sideResearch.contextSentence === "string" && sideResearch.contextSentence.trim(),
          `matchup-research-notes.json fixture "${fixtureId}" ${side}.contextSentence must be a non-empty string`
        );
      }

      if (sideResearch.keyPlayers !== undefined) {
        assert(
          Array.isArray(sideResearch.keyPlayers) && sideResearch.keyPlayers.length >= 3,
          `matchup-research-notes.json fixture "${fixtureId}" ${side}.keyPlayers must include at least three players`
        );
        for (const [index, player] of (sideResearch.keyPlayers || []).entries()) {
          assert(
            typeof player?.name === "string" && player.name.trim(),
            `matchup-research-notes.json fixture "${fixtureId}" ${side}.keyPlayers[${index}] must include a name`
          );
          assert(
            typeof player?.note === "string" && player.note.trim(),
            `matchup-research-notes.json fixture "${fixtureId}" ${side}.keyPlayers[${index}] must include a note`
          );
        }
      }
    }
  }
}

for (const { teamId, index, player } of fixtureUnavailableRefs) {
  assert(
    fixtureIds.has(player.fixtureId),
    `player-availability.json team "${teamId}" fixtureUnavailable[${index}] references unknown fixture "${player.fixtureId}"`
  );
}

for (const playerName of requiredProfileNames) {
  if (!playerProfilesData) {
    continue;
  }

  const profile = playerProfiles.get(playerName);
  assert(profile, `player-profiles.json is missing "${playerName}"`);
  if (!profile) {
    continue;
  }

  assert(
    typeof profile.position === "string" && profile.position.trim(),
    `player-profiles.json "${playerName}" must include position`
  );
  assert(
    typeof profile.club === "string" && profile.club.trim(),
    `player-profiles.json "${playerName}" must include club`
  );
  assert(
    Array.isArray(profile.skills) && profile.skills.length > 0,
    `player-profiles.json "${playerName}" must include skills`
  );
  if (profile.summary !== undefined) {
    assert(
      typeof profile.summary === "string" && profile.summary.trim(),
      `player-profiles.json "${playerName}" summary must be a non-empty string when present`
    );
  }
  if (isGeneratedScorerNote(profile.note)) {
    assert(
      typeof profile.summary === "string" && profile.summary.trim(),
      `player-profiles.json "${playerName}" must include summary because its note is only scorer context`
    );
  }
  if (profile.uniformNumber !== undefined) {
    assert(
      Number.isInteger(profile.uniformNumber) && profile.uniformNumber > 0,
      `player-profiles.json "${playerName}" uniformNumber must be a positive integer`
    );
  }
}

for (const [groupId, rows] of Object.entries(standingsData.groups || {})) {
  const expectedRows = computedStandings.get(groupId);

  for (const row of rows || []) {
    const expected = expectedRows?.get(row.teamId);
    if (!expected) {
      continue;
    }

    for (const key of ["played", "wins", "draws", "losses", "gf", "ga"]) {
      assert(
        row[key] === expected[key],
        `Standings row "${row.teamId}" ${key} is ${row[key]}, expected ${expected[key]} from final group fixtures`
      );
    }
  }
}

const historicalTournamentYears = new Set();
for (const tournament of historyData.tournaments || []) {
  assert(isNumber(tournament.year), "Each historical tournament must have a numeric year");
  assert(tournament.name, `Historical tournament "${tournament.year}" must have a name`);
  assert(isDayKey(tournament.startDate), `Historical tournament "${tournament.year}" must include a valid startDate`);
  assert(isDayKey(tournament.endDate), `Historical tournament "${tournament.year}" must include a valid endDate`);
  assert(isNumber(tournament.matchCount), `Historical tournament "${tournament.year}" must include matchCount`);
  assert(isNumber(tournament.teamCount), `Historical tournament "${tournament.year}" must include teamCount`);
  assert(Array.isArray(tournament.teams), `Historical tournament "${tournament.year}" must include teams`);
  historicalTournamentYears.add(tournament.year);
}

const historicalFixtureIds = new Set();
for (const fixture of historyData.fixtures || []) {
  assert(fixture.id, "Each historical fixture must have an id");
  assert(!historicalFixtureIds.has(fixture.id), `Duplicate historical fixture id "${fixture.id}"`);
  historicalFixtureIds.add(fixture.id);
  assert(fixture.isHistorical === true, `Historical fixture "${fixture.id}" must be marked isHistorical`);
  assert(sourceIds.has(fixture.sourceId), `Historical fixture "${fixture.id}" references unknown source`);
  assert(fixture.sourcePath, `Historical fixture "${fixture.id}" must include sourcePath`);
  assert(isNumber(fixture.tournamentYear), `Historical fixture "${fixture.id}" must include tournamentYear`);
  assert(
    historicalTournamentYears.has(fixture.tournamentYear),
    `Historical fixture "${fixture.id}" references unknown tournament year "${fixture.tournamentYear}"`
  );
  assert(fixture.tournamentName, `Historical fixture "${fixture.id}" must include tournamentName`);
  assert(isDayKey(fixture.date), `Historical fixture "${fixture.id}" must include a valid date`);
  assert(fixture.sortKey, `Historical fixture "${fixture.id}" must include sortKey`);
  assert(fixture.round, `Historical fixture "${fixture.id}" must include round`);
  assert(fixture.homeSlot, `Historical fixture "${fixture.id}" must include homeSlot`);
  assert(fixture.awaySlot, `Historical fixture "${fixture.id}" must include awaySlot`);
  assert(fixture.venue, `Historical fixture "${fixture.id}" must include venue`);
  assert(
    ["FT", "SCHEDULED", "CANCELLED"].includes(fixture.status),
    `Historical fixture "${fixture.id}" has invalid status`
  );
  if (fixture.localTime) {
    assert(
      /^\d{1,2}:\d{2}(?: UTC[+-]\d{1,2})?$/.test(fixture.localTime),
      `Historical fixture "${fixture.id}" has invalid localTime`
    );
  }
  if (fixture.status === "FT") {
    assert(fixture.score, `Historical final fixture "${fixture.id}" must include score`);
    assert(isNumber(fixture.score?.home), `Historical final fixture "${fixture.id}" must include numeric home score`);
    assert(isNumber(fixture.score?.away), `Historical final fixture "${fixture.id}" must include numeric away score`);
  }
  assert(Array.isArray(fixture.goalsHome), `Historical fixture "${fixture.id}" goalsHome must be an array`);
  assert(Array.isArray(fixture.goalsAway), `Historical fixture "${fixture.id}" goalsAway must be an array`);

  assert(fixture.keyInformation, `Historical fixture "${fixture.id}" must include historical keyInformation`);
  assert(
    sourceIds.has(fixture.keyInformation?.sourceId),
    `Historical fixture "${fixture.id}" keyInformation references unknown source`
  );
  for (const side of ["home", "away"]) {
    const copy = fixture.keyInformation?.[side];
    const opponentName = side === "home" ? fixture.awaySlot : fixture.homeSlot;
    assert(
      typeof copy === "string" && copy.trim().length >= 160,
      `Historical fixture "${fixture.id}" keyInformation.${side} must include a detailed historical matchup note`
    );
    assert(
      wordCount(copy) <= 95,
      `Historical fixture "${fixture.id}" keyInformation.${side} should stay concise`
    );
    assert(
      copy?.includes(`Against ${opponentName}`),
      `Historical fixture "${fixture.id}" keyInformation.${side} must describe the historical opponent relationship`
    );
    if (fixture.status !== "CANCELLED") {
      assert(
        copy?.includes(" had to beat "),
        `Historical fixture "${fixture.id}" keyInformation.${side} must describe the matchup pressure`
      );
    }
  }

  assert(fixture.keyPlayers, `Historical fixture "${fixture.id}" must include historical keyPlayers`);
  assert(
    sourceIds.has(fixture.keyPlayers?.sourceId),
    `Historical fixture "${fixture.id}" keyPlayers references unknown source`
  );
  assert(Array.isArray(fixture.keyPlayers?.home), `Historical fixture "${fixture.id}" keyPlayers.home must be an array`);
  assert(Array.isArray(fixture.keyPlayers?.away), `Historical fixture "${fixture.id}" keyPlayers.away must be an array`);
  for (const side of ["home", "away"]) {
    const players = fixture.keyPlayers?.[side] || [];
    if (fixture.status !== "CANCELLED") {
      assert(players.length >= 2, `Historical fixture "${fixture.id}" keyPlayers.${side} must include at least two historical players`);
    }
    for (const [index, player] of players.entries()) {
      assert(
        typeof player?.name === "string" && player.name.trim(),
        `Historical fixture "${fixture.id}" keyPlayers.${side}[${index}] must include a player name`
      );
      assert(
        typeof player?.note === "string" && player.note.trim(),
        `Historical fixture "${fixture.id}" keyPlayers.${side}[${index}] must include a historical note`
      );
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
  `Data validation passed: ${teams.size} teams, ${groups.size} groups, ${fixtureIds.size} fixtures, ${historicalFixtureIds.size} historical fixtures, ${sourceIds.size} sources.`
);
