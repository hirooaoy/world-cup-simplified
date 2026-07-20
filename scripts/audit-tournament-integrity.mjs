#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const shouldCheckArchiveSource = process.argv.includes("--online");
const archiveBaseUrl = "https://raw.githubusercontent.com/openfootball/worldcup.json/master";
const failures = [];
let checks = 0;

const expectedStageCounts = {
  group: 72,
  "round-of-32": 16,
  "round-of-16": 8,
  "quarter-finals": 4,
  "semi-finals": 2,
  "bronze-final": 1,
  final: 1
};
const expected2026Awards = {
  goldenBall: { field: "playerName", value: "Rodri", teamId: "ESP" },
  goldenBoot: { field: "playerName", value: "Kylian Mbappe", teamId: "FRA", goals: 10, assists: 4 },
  goldenGlove: { field: "playerName", value: "Unai Simon", teamId: "ESP" },
  youngPlayer: { field: "playerName", value: "Pau Cubarsi", teamId: "ESP" },
  fairPlay: { field: "teamName", value: "Netherlands", teamId: "NED" }
};
const officialHighlightChannelId = "UCwNqHDsnBCKT-olwJwIFyfg";
const expectedChampions = {
  1930: "Uruguay",
  1934: "Italy",
  1938: "Italy",
  1950: "Uruguay",
  1954: "West Germany",
  1958: "Brazil",
  1962: "Brazil",
  1966: "England",
  1970: "Brazil",
  1974: "West Germany",
  1978: "Argentina",
  1982: "Italy",
  1986: "Argentina",
  1990: "West Germany",
  1994: "Brazil",
  1998: "France",
  2002: "Brazil",
  2006: "Italy",
  2010: "Spain",
  2014: "Germany",
  2018: "France",
  2022: "Argentina"
};
const historicalTiebreakOrders = {
  "1954:Group 2": ["West Germany", "Turkey"],
  "1954:Group 4": ["Switzerland", "Italy"],
  "1958:Group 1": ["Northern Ireland", "Czechoslovakia"],
  "1958:Group 3": ["Wales", "Hungary"],
  "1958:Group 4": ["Soviet Union", "England"],
  "1990:Group F": ["Ireland", "Netherlands"],
  "1994:Group D": ["Nigeria", "Bulgaria", "Argentina"],
  "1994:Group E": ["Mexico", "Ireland", "Italy", "Norway"],
  "1994:Group F": ["Netherlands", "Saudi Arabia", "Belgium"],
  "2018:Group H": ["Japan", "Senegal"]
};
const finalGroupStageRanges = {
  1950: [17, 22],
  1974: [25, 36],
  1978: [25, 36],
  1982: [37, 48]
};

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

function check(condition, message) {
  checks += 1;
  if (!condition) {
    failures.push(message);
  }
}

function points(row, winPoints = 3) {
  return row.wins * winPoints + row.draws;
}

function goalDifference(row) {
  return row.gf - row.ga;
}

function createStanding(teamId, source = {}) {
  return {
    teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    sourceOrder: source.sourceOrder ?? 0,
    ...Object.fromEntries(
      ["teamConductScore", "conductScore", "fairPlayScore", "fairPlayPoints"]
        .filter((key) => source[key] !== undefined)
        .map((key) => [key, source[key]])
    )
  };
}

function applyResult(table, fixture) {
  const home = table.get(fixture.homeTeamId || fixture.homeSlot);
  const away = table.get(fixture.awayTeamId || fixture.awaySlot);
  const homeScore = Number(fixture.score?.home);
  const awayScore = Number(fixture.score?.away);

  if (!home || !away || !Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
    return;
  }

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

function getConductScore(row) {
  const value = row.teamConductScore ?? row.conductScore ?? row.fairPlayScore ?? row.fairPlayPoints;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function splitEqualRuns(rows, signature) {
  const groups = [];
  for (const row of rows) {
    const key = signature(row);
    const group = groups.at(-1);
    if (group?.key === key) {
      group.rows.push(row);
    } else {
      groups.push({ key, rows: [row] });
    }
  }
  return groups.map((group) => group.rows);
}

function rankCurrentGroup(rows, fixtures, groupId, teamsById) {
  const compareFallback = (a, b) => {
    const conductA = getConductScore(a);
    const conductB = getConductScore(b);
    const rankA = Number(teamsById.get(a.teamId)?.fifaRank) || Number.POSITIVE_INFINITY;
    const rankB = Number(teamsById.get(b.teamId)?.fifaRank) || Number.POSITIVE_INFINITY;
    return (
      goalDifference(b) - goalDifference(a) ||
      b.gf - a.gf ||
      (conductA !== null && conductB !== null ? conductB - conductA : 0) ||
      rankA - rankB ||
      a.teamId.localeCompare(b.teamId)
    );
  };
  const rankTied = (tiedRows) => {
    if (tiedRows.length <= 1) return tiedRows;
    const ids = new Set(tiedRows.map((row) => row.teamId));
    const h2h = new Map(tiedRows.map((row, index) => [row.teamId, createStanding(row.teamId, { sourceOrder: index })]));
    fixtures
      .filter((fixture) => fixture.groupId === groupId && ids.has(fixture.homeTeamId) && ids.has(fixture.awayTeamId))
      .forEach((fixture) => applyResult(h2h, fixture));
    const sorted = [...tiedRows].sort((a, b) => {
      const rowA = h2h.get(a.teamId);
      const rowB = h2h.get(b.teamId);
      return points(rowB) - points(rowA) || goalDifference(rowB) - goalDifference(rowA) || rowB.gf - rowA.gf;
    });
    const runs = splitEqualRuns(sorted, (row) => {
      const h2hRow = h2h.get(row.teamId);
      return `${points(h2hRow)}|${goalDifference(h2hRow)}|${h2hRow.gf}`;
    });
    if (runs.length === 1) return [...tiedRows].sort(compareFallback);
    return runs.flatMap((run) => run.length === 1 ? run : [...run].sort(compareFallback));
  };
  const byPoints = [...rows].sort((a, b) => points(b) - points(a));
  return splitEqualRuns(byPoints, (row) => String(points(row))).flatMap(rankTied);
}

function scoreWinner(fixture, score = fixture?.score) {
  const home = Number(score?.home);
  const away = Number(score?.away);
  if (!Number.isFinite(home) || !Number.isFinite(away) || home === away) return "";
  return home > away
    ? fixture.homeTeamId || fixture.homeSlot
    : fixture.awayTeamId || fixture.awaySlot;
}

function fixtureWinner(fixture) {
  return String(fixture?.winnerTeamId || fixture?.winner || "").trim() ||
    scoreWinner(fixture, fixture?.scoreDetails?.penalties) ||
    scoreWinner(fixture);
}

function fixtureLoser(fixture) {
  const winner = fixtureWinner(fixture);
  const home = fixture.homeTeamId || fixture.homeSlot;
  const away = fixture.awayTeamId || fixture.awaySlot;
  return winner === home ? away : winner === away ? home : "";
}

function normalizeHistoricalRows(fixtures, year) {
  const rows = new Map();
  const winPoints = year < 1994 ? 2 : 3;
  for (const fixture of fixtures) {
    for (const teamName of [fixture.homeSlot, fixture.awaySlot]) {
      if (!rows.has(teamName)) {
        rows.set(teamName, createStanding(teamName, { sourceOrder: rows.size }));
      }
    }
    if (fixture.status === "FT") applyResult(rows, fixture);
  }
  return [...rows.values()].map((row) => ({
    ...row,
    points: points(row, winPoints),
    teamName: row.teamId
  })).sort((a, b) =>
    b.points - a.points || goalDifference(b) - goalDifference(a) || b.gf - a.gf || a.sourceOrder - b.sourceOrder
  );
}

function applyHistoricalTiebreakOrder(rows, year, groupName) {
  const order = historicalTiebreakOrders[`${year}:${groupName}`] || [];
  const ranks = new Map(order.map((teamName, index) => [teamName, index]));
  return rows.sort((a, b) => {
    if (a.points !== b.points) return 0;
    const aRank = ranks.get(a.teamName);
    const bRank = ranks.get(b.teamName);
    if (aRank === undefined && bRank === undefined) return 0;
    return (aRank ?? Number.POSITIVE_INFINITY) - (bRank ?? Number.POSITIVE_INFINITY);
  });
}

function isGroupPlayoff(fixture) {
  return /^Group\s+.+\s+Play-?off$/i.test(String(fixture?.round || "").trim());
}

function isFinalGroupStageFixture(fixture) {
  const range = finalGroupStageRanges[fixture?.tournamentYear];
  const matchNumber = Number(fixture?.matchNumber);
  return Boolean(range && matchNumber >= range[0] && matchNumber <= range[1]);
}

function isThirdPlace(fixture) {
  return /(?:third|3rd).*(?:place|play-?off|match)/i.test(String(fixture?.round || ""));
}

function auditCurrentTournament(fixturesData, standingsData, teamsData, tournamentData) {
  const fixtures = fixturesData.fixtures || [];
  const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
  const groupFixtures = fixtures.filter((fixture) => fixture.stage === "group");
  const qualifiedTeamIds = new Set();

  check(fixtures.length === 104, `2026 fixture count is ${fixtures.length}; expected 104.`);
  for (const [stage, count] of Object.entries(expectedStageCounts)) {
    check(fixtures.filter((fixture) => fixture.stage === stage).length === count, `2026 ${stage} count must be ${count}.`);
  }
  check((tournamentData.groups || []).length === 12, "2026 must contain 12 groups.");
  check(fixturesData.coverage?.status === "complete", "2026 fixture coverage must be marked complete after the final.");
  check(fixtures.every((fixture) => fixture.status === "FT"), "All 104 fixtures must be final after the tournament.");
  check(fixtures.every((fixture) => Number.isInteger(fixture.score?.home) && Number.isInteger(fixture.score?.away)), "Every 2026 fixture must have an integer final score.");
  check(fixtures.every((fixture) => (fixture.goalsHome || []).length === fixture.score.home && (fixture.goalsAway || []).length === fixture.score.away), "Every 2026 fixture goal-event count must match its final score.");
  check(fixtures.every((fixture) => {
    const english = fixture.resultStoryBullets || [];
    const chinese = fixture.resultStoryBulletsZh || [];
    return english.length >= 1 && english.length <= 3 && chinese.length === english.length;
  }), "Every 2026 fixture must have matching English and Chinese result coverage.");
  check(fixtures.every((fixture) =>
    fixture.highlightVideo?.channelId === officialHighlightChannelId ||
    (fixture.highlightVideoReview?.status === "not-found" && fixture.highlightVideoReview?.channelId === officialHighlightChannelId)
  ), "Every 2026 fixture must retain an approved official highlight or reviewed not-found disposition.");

  const sourcesById = new Map((tournamentData.sources || []).map((source) => [source.id, source]));
  for (const [awardId, expected] of Object.entries(expected2026Awards)) {
    const award = tournamentData.awards?.[awardId];
    check(award?.status === "confirmed", `2026 ${awardId} must be confirmed.`);
    check(award?.[expected.field] === expected.value && award?.teamId === expected.teamId, `2026 ${awardId} recipient must match the verified official result.`);
    if (expected.goals !== undefined) {
      check(award?.goals === expected.goals && award?.assists === expected.assists, "2026 Golden Boot totals must be 10 goals and 4 assists.");
    }
    const source = sourcesById.get(award?.sourceId);
    check(Boolean(source && /^https:\/\//.test(source.url || "")), `2026 ${awardId} must retain resolvable HTTPS source provenance.`);
  }

  for (const group of tournamentData.groups || []) {
    const fixturesForGroup = groupFixtures.filter((fixture) => fixture.groupId === group.id);
    const storedRows = standingsData.groups?.[group.id] || [];
    const pairs = new Set(fixturesForGroup.map((fixture) => [fixture.homeTeamId, fixture.awayTeamId].sort().join(":")));
    const computed = new Map(group.teamIds.map((teamId, index) => [teamId, createStanding(teamId, { sourceOrder: index })]));
    fixturesForGroup.filter((fixture) => fixture.status === "FT").forEach((fixture) => applyResult(computed, fixture));
    const ranked = rankCurrentGroup([...computed.values()], fixturesForGroup, group.id, teamsById);

    check(group.teamIds.length === 4 && new Set(group.teamIds).size === 4, `Group ${group.id} must have four unique teams.`);
    check(fixturesForGroup.length === 6 && pairs.size === 6, `Group ${group.id} must contain each of its six pairings once.`);
    check(storedRows.length === 4, `Group ${group.id} standings must contain four rows.`);
    check(storedRows.map((row) => row.teamId).join("|") === ranked.map((row) => row.teamId).join("|"), `Group ${group.id} stored order does not follow 2026 tie-break rules.`);
    for (const row of storedRows) {
      const expected = computed.get(row.teamId);
      check(Boolean(expected), `Group ${group.id} has unknown standings team ${row.teamId}.`);
      for (const field of ["played", "wins", "draws", "losses", "gf", "ga"]) {
        check(row[field] === expected?.[field], `Group ${group.id} ${row.teamId} ${field} is ${row[field]}, expected ${expected?.[field]}.`);
      }
      check(row.played === row.wins + row.draws + row.losses, `Group ${group.id} ${row.teamId} W-D-L does not total played.`);
    }
    storedRows.slice(0, 2).forEach((row) => qualifiedTeamIds.add(row.teamId));
  }

  const thirdPlaceRows = (tournamentData.groups || []).map((group) => ({
    groupId: group.id,
    row: standingsData.groups?.[group.id]?.[2]
  })).sort((a, b) => {
    const conductA = getConductScore(a.row);
    const conductB = getConductScore(b.row);
    const rankA = Number(teamsById.get(a.row.teamId)?.fifaRank) || Number.POSITIVE_INFINITY;
    const rankB = Number(teamsById.get(b.row.teamId)?.fifaRank) || Number.POSITIVE_INFINITY;
    return points(b.row) - points(a.row) || goalDifference(b.row) - goalDifference(a.row) || b.row.gf - a.row.gf ||
      (conductA !== null && conductB !== null ? conductB - conductA : 0) || rankA - rankB || a.groupId.localeCompare(b.groupId);
  });
  thirdPlaceRows.slice(0, 8).forEach(({ row }) => qualifiedTeamIds.add(row.teamId));

  const roundOf32 = fixtures.filter((fixture) => fixture.stage === "round-of-32");
  const roundOf32TeamIds = roundOf32.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId]);
  check(roundOf32TeamIds.length === 32 && new Set(roundOf32TeamIds).size === 32, "Round of 32 must contain 32 unique resolved teams.");
  check([...qualifiedTeamIds].sort().join("|") === [...roundOf32TeamIds].sort().join("|"), "Round of 32 participants must equal the top two plus eight best third-place teams.");

  const byMatchNumber = new Map(fixtures.map((fixture) => [Number(fixture.matchNumber), fixture]));
  const thirdPlace = byMatchNumber.get(103);
  const final = byMatchNumber.get(104);
  check(thirdPlace?.stage === "bronze-final" && thirdPlace?.status === "FT", "Match 103 must be the completed bronze final.");
  check(final?.stage === "final" && final?.status === "FT", "Match 104 must be the completed final.");
  check(fixtureWinner(final) === "ESP", "Spain must be recorded as the verified 2026 champion.");
  check(final?.score?.home === 1 && final?.score?.away === 0, "The 2026 final must retain Spain's verified 1-0 extra-time result.");
  check([...byMatchNumber.keys()].sort((a, b) => a - b).join("|") === Array.from({ length: 104 }, (_, index) => index + 1).join("|"), "2026 match numbers must be unique and continuous from 1 to 104.");
  for (const fixture of fixtures.filter((item) => item.stage !== "group")) {
    if (fixture.status === "FT") {
      const winner = fixtureWinner(fixture);
      check(Boolean(winner), `Completed knockout match ${fixture.matchNumber} must have a winner.`);
      check([fixture.homeTeamId, fixture.awayTeamId].includes(winner), `Match ${fixture.matchNumber} winner must be a participant.`);
    }
    for (const side of ["home", "away"]) {
      const slotText = fixture[`${side}Slot`] || "";
      const source = /^(Winner|Runner-up) match (\d+)$/i.exec(slotText);
      if (!source) continue;
      const sourceFixture = byMatchNumber.get(Number(source[2]));
      check(Boolean(sourceFixture) && Number(source[2]) < Number(fixture.matchNumber), `Match ${fixture.matchNumber} ${side} slot has an invalid source.`);
      if (sourceFixture?.status === "FT") {
        const expectedTeamId = source[1].toLowerCase() === "winner" ? fixtureWinner(sourceFixture) : fixtureLoser(sourceFixture);
        check(fixture[`${side}TeamId`] === expectedTeamId, `Match ${fixture.matchNumber} ${side} participant must resolve from match ${source[2]}.`);
      }
    }
    if (fixture.projection) {
      check(Number(fixture.projection.home) + Number(fixture.projection.draw) + Number(fixture.projection.away) === 100, `Match ${fixture.matchNumber} projection must total 100.`);
    }
  }
}

function auditHistoricalArchive(historyData) {
  const fixtures = historyData.fixtures || [];
  const fixturesByYear = new Map();
  for (const fixture of fixtures) {
    const entries = fixturesByYear.get(fixture.tournamentYear) || [];
    entries.push(fixture);
    fixturesByYear.set(fixture.tournamentYear, entries);
  }

  const hasFinalized2026 = (historyData.tournaments || []).some((tournament) => tournament.year === 2026);
  const expectedEditionCount = hasFinalized2026 ? 23 : 22;
  const expectedFixtureCount = hasFinalized2026 ? 1069 : 965;
  check(
    (historyData.tournaments || []).length === expectedEditionCount,
    `Historical archive must contain ${expectedEditionCount} editions through ${hasFinalized2026 ? 2026 : 2022}.`
  );
  check(
    fixtures.length === expectedFixtureCount,
    `Historical archive has ${fixtures.length} fixtures; expected ${expectedFixtureCount} for its edition lifecycle.`
  );
  if (hasFinalized2026) {
    check(
      (fixturesByYear.get(2026) || []).length === 104,
      "Finalized 2026 archive must contain all 104 fixtures."
    );
  }

  for (const tournament of historyData.tournaments || []) {
    const editionFixtures = (fixturesByYear.get(tournament.year) || []).sort((a, b) => Number(a.matchNumber) - Number(b.matchNumber));
    const participants = [...new Set(editionFixtures.flatMap((fixture) => [fixture.homeSlot, fixture.awaySlot]))].sort();
    const matchNumbers = editionFixtures.map((fixture) => Number(fixture.matchNumber));
    check(editionFixtures.length === tournament.matchCount, `${tournament.year} fixture count does not match tournament metadata.`);
    check(participants.length === tournament.teamCount, `${tournament.year} team count does not match tournament metadata.`);
    check(participants.join("|") === [...tournament.teams].sort().join("|"), `${tournament.year} tournament team list does not match its fixtures.`);
    check(matchNumbers.join("|") === Array.from({ length: editionFixtures.length }, (_, index) => index + 1).join("|"), `${tournament.year} match numbers must be unique and continuous.`);

    for (const fixture of editionFixtures) {
      check(Boolean(fixture.id && fixture.date && fixture.round && fixture.homeSlot && fixture.awaySlot && fixture.venue), `${tournament.year} match ${fixture.matchNumber} is missing core archive fields.`);
      if (fixture.status === "FT") {
        check(Number.isFinite(Number(fixture.score?.home)) && Number.isFinite(Number(fixture.score?.away)), `${tournament.year} match ${fixture.matchNumber} must have a final score.`);
        const winner = fixtureWinner(fixture);
        if (winner) check([fixture.homeSlot, fixture.awaySlot].includes(winner), `${tournament.year} match ${fixture.matchNumber} winner must be a participant.`);
      }
    }

    const groups = [...new Set(editionFixtures.filter((fixture) => fixture.group).map((fixture) => fixture.group))];
    for (const groupName of groups) {
      const groupFixtures = editionFixtures.filter((fixture) => fixture.group === groupName).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
      const rows = applyHistoricalTiebreakOrder(normalizeHistoricalRows(groupFixtures, tournament.year), tournament.year, groupName);
      check(rows.reduce((sum, row) => sum + row.played, 0) === groupFixtures.filter((fixture) => fixture.status === "FT").length * 2, `${tournament.year} ${groupName} played totals do not match fixtures.`);

      const groupEnd = groupFixtures.map((fixture) => fixture.sortKey).sort().at(-1);
      const laterAdvancementParticipants = new Set(
        editionFixtures
          .filter((fixture) => fixture.sortKey > groupEnd && (isFinalGroupStageFixture(fixture) || (!fixture.group && !isGroupPlayoff(fixture))))
          .flatMap((fixture) => [fixture.homeSlot, fixture.awaySlot])
      );
      const advancers = rows.filter((row) => laterAdvancementParticipants.has(row.teamName)).map((row) => row.teamName);
      if (advancers.length) {
        check(rows.slice(0, advancers.length).every((row) => advancers.includes(row.teamName)), `${tournament.year} ${groupName} archived order places an eliminated team above an advancer.`);
      }

      const override = historicalTiebreakOrders[`${tournament.year}:${groupName}`] || [];
      if (override.length) {
        const positions = override.map((teamName) => rows.findIndex((row) => row.teamName === teamName));
        check(positions.every((position, index) => index === 0 || position > positions[index - 1]), `${tournament.year} ${groupName} does not preserve its recorded playoff/head-to-head/fair-play order.`);
      }
    }

    let champion = "";
    if (tournament.year === 1950) {
      champion = normalizeHistoricalRows(editionFixtures.filter((fixture) => /^Final Round$/i.test(fixture.round)), 1950)[0]?.teamName || "";
    } else {
      const final = editionFixtures.find((fixture) => /^Final$/i.test(fixture.round));
      champion = fixtureWinner(final);
    }
    check(champion === expectedChampions[tournament.year], `${tournament.year} champion is ${champion || "unknown"}; expected ${expectedChampions[tournament.year]}.`);

    const ordered = [...editionFixtures].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    for (const fixture of ordered) {
      if (fixture.group || fixture.status !== "FT" || !fixtureWinner(fixture) || isFinalGroupStageFixture(fixture) || /^Final$/i.test(fixture.round) || isThirdPlace(fixture)) continue;
      const winner = fixtureWinner(fixture);
      const laterFixtures = ordered.filter((candidate) => candidate.sortKey > fixture.sortKey);
      check(laterFixtures.some((candidate) => candidate.homeSlot === winner || candidate.awaySlot === winner), `${tournament.year} match ${fixture.matchNumber} winner ${winner} never appears in a later tournament match.`);
    }
  }
}

function rawScorePair(score = {}) {
  const pair = score.et || score.ft;
  return Array.isArray(pair) ? `${Number(pair[0])}:${Number(pair[1])}` : "";
}

async function auditArchiveSource(historyData) {
  const localByYear = new Map((historyData.tournaments || []).map((tournament) => [
    tournament.year,
    (historyData.fixtures || []).filter((fixture) => fixture.tournamentYear === tournament.year)
  ]));
  for (const tournament of historyData.tournaments || []) {
    const response = await fetch(`${archiveBaseUrl}/${tournament.year}/worldcup.json`);
    check(response.ok, `${tournament.year} openfootball source could not be fetched (${response.status}).`);
    if (!response.ok) continue;
    const raw = await response.json();
    const local = localByYear.get(tournament.year) || [];
    check(raw.matches?.length === local.length, `${tournament.year} local fixture count differs from the current declared archive source.`);
    for (let index = 0; index < Math.min(raw.matches?.length || 0, local.length); index += 1) {
      const source = raw.matches[index];
      const fixture = local.find((item) => Number(item.matchNumber) === index + 1);
      check(Boolean(fixture), `${tournament.year} source match ${index + 1} is missing locally.`);
      if (!fixture) continue;
      check(source.date === fixture.date && (source.round || "") === fixture.round && (source.group || "") === (fixture.group || ""), `${tournament.year} match ${index + 1} date/round/group differs from the declared source.`);
      check(source.team1 === fixture.homeSlot && source.team2 === fixture.awaySlot, `${tournament.year} match ${index + 1} participants differ from the declared source.`);
      check(rawScorePair(source.score) === (fixture.score ? `${fixture.score.home}:${fixture.score.away}` : ""), `${tournament.year} match ${index + 1} score differs from the declared source.`);
    }
  }
}

const [fixturesData, standingsData, teamsData, tournamentData, historyData] = await Promise.all([
  readJson("fixtures.json"),
  readJson("standings.json"),
  readJson("teams.json"),
  readJson("tournament.json"),
  readJson("history.json")
]);

auditCurrentTournament(fixturesData, standingsData, teamsData, tournamentData);
auditHistoricalArchive(historyData);
if (shouldCheckArchiveSource) {
  await auditArchiveSource(historyData);
}

console.log("Tournament and standings integrity audit");
console.log(`2026: ${(fixturesData.fixtures || []).length} fixtures, ${(tournamentData.groups || []).length} groups, 32-team knockout path`);
console.log(`Archive: ${(historyData.fixtures || []).length} fixtures across ${(historyData.tournaments || []).length} tournaments`);
console.log(`Declared archive source comparison: ${shouldCheckArchiveSource ? "checked online" : "skipped (use --online)"}`);
console.log(`Checks: ${checks}`);

if (failures.length) {
  console.log(`Failures: ${failures.length}`);
  failures.forEach((failure) => console.log(`- ${failure}`));
  process.exit(1);
}

console.log("Failures: 0");
