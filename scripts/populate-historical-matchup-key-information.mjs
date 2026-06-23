#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const historyPath = path.join(dataDir, "history.json");
const fjelstulCachePath = process.env.FJELSTUL_WORLDCUP_JSON || "/tmp/fjelstul-worldcup.json";
const fjelstulUrl = "https://raw.githubusercontent.com/jfjelstul/worldcup/master/data-json/worldcup.json";
const sourceId = "fjelstul-worldcup-json-2026-06-23";

const teamAliases = new Map([
  ["usa", "united states"],
  ["u s a", "united states"],
  ["bosnia herzegovina", "bosnia and herzegovina"],
  ["cote d ivoire", "ivory coast"],
  ["cote d ivoire", "ivory coast"],
  ["ireland", "republic of ireland"]
]);

const positionWeights = {
  GK: 9,
  DF: 12,
  LB: 12,
  RB: 12,
  CB: 12,
  SW: 12,
  MF: 15,
  CM: 15,
  DM: 15,
  AM: 15,
  LM: 15,
  RM: 15,
  FW: 17,
  CF: 17,
  ST: 17,
  LW: 17,
  RW: 17
};

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function loadFjelstulData() {
  try {
    return await readJson(fjelstulCachePath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  const response = await fetch(fjelstulUrl);
  if (!response.ok) {
    throw new Error(`Unable to fetch ${fjelstulUrl}: ${response.status} ${response.statusText}`);
  }

  return response.json();
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
  return [given, family].filter(Boolean).join(" ") || family || given || row?.player_name || "";
}

function positionGroup(row) {
  const code = String(row?.position_code || "").toUpperCase();
  if (code === "GK") {
    return "goalkeeper";
  }
  if (["DF", "LB", "RB", "CB", "SW"].includes(code)) {
    return "defender";
  }
  if (["MF", "CM", "DM", "AM", "LM", "RM"].includes(code)) {
    return "midfielder";
  }
  if (["FW", "CF", "ST", "LW", "RW"].includes(code)) {
    return "forward";
  }

  return row?.position_name && row.position_name !== "not applicable" ? row.position_name : "player";
}

function positionWeight(row) {
  return positionWeights[String(row?.position_code || "").toUpperCase()] || 10;
}

function nameSeries(names) {
  const cleanNames = names.filter(Boolean);
  if (cleanNames.length <= 1) {
    return cleanNames.join("");
  }
  if (cleanNames.length === 2) {
    return cleanNames.join(" and ");
  }

  return `${cleanNames.slice(0, -1).join(", ")}, and ${cleanNames.at(-1)}`;
}

function formatScore(score) {
  if (!score || !Number.isFinite(Number(score.home)) || !Number.isFinite(Number(score.away))) {
    return "";
  }

  return `${score.home}-${score.away}`;
}

function sideScore(fixture, side) {
  if (!fixture.score) {
    return { for: null, against: null };
  }

  return side === "home"
    ? { for: fixture.score.home, against: fixture.score.away }
    : { for: fixture.score.away, against: fixture.score.home };
}

function getSourceSide(fixture, sourceMatch, side) {
  const fixtureTeam = side === "home" ? fixture.homeSlot : fixture.awaySlot;
  if (normalizeTeamName(fixtureTeam) === normalizeTeamName(sourceMatch.home_team_name)) {
    return "home";
  }
  if (normalizeTeamName(fixtureTeam) === normalizeTeamName(sourceMatch.away_team_name)) {
    return "away";
  }

  return side;
}

function getSourceTeam(sourceMatch, sourceSide) {
  return sourceSide === "home"
    ? {
        teamId: sourceMatch.home_team_id,
        teamName: sourceMatch.home_team_name,
        teamCode: sourceMatch.home_team_code
      }
    : {
        teamId: sourceMatch.away_team_id,
        teamName: sourceMatch.away_team_name,
        teamCode: sourceMatch.away_team_code
      };
}

function createPlayerRecord(row) {
  return {
    id: row?.player_id || normalizePersonKey(personName(row)),
    name: personName(row),
    shirtNumber: Number(row?.shirt_number) > 0 ? Number(row.shirt_number) : undefined,
    positionCode: row?.position_code || "",
    position: positionGroup(row),
    score: positionWeight(row),
    evidence: [],
    evidenceRanks: []
  };
}

function addEvidence(record, label, rank, score) {
  if (!record.evidence.includes(label)) {
    record.evidence.push(label);
  }
  record.evidenceRanks.push(rank);
  record.score += score;
}

function ensurePlayer(playersById, row) {
  const name = personName(row);
  if (!name) {
    return null;
  }

  const id = row?.player_id || normalizePersonKey(name);
  const existing = playersById.get(id);
  if (existing) {
    if (!existing.shirtNumber && Number(row?.shirt_number) > 0) {
      existing.shirtNumber = Number(row.shirt_number);
    }
    if (!existing.positionCode && row?.position_code) {
      existing.positionCode = row.position_code;
      existing.position = positionGroup(row);
    }
    return existing;
  }

  const record = createPlayerRecord(row);
  playersById.set(id, record);
  return record;
}

function goalLabel(goals) {
  if (goals.length > 1) {
    return `scored ${goals.length} goals in this match`;
  }

  return `scored at ${goals[0].minute_label || `${goals[0].minute_regulation}'`}`;
}

function selectKeyPlayers(sideData) {
  const playersById = new Map();
  const goalsByPlayer = groupBy(sideData.goals, (goal) => goal.player_id || normalizePersonKey(personName(goal)));
  const penaltiesByPlayer = groupBy(sideData.penalties, (penalty) => penalty.player_id || normalizePersonKey(personName(penalty)));
  const bookingsByPlayer = groupBy(sideData.bookings, (booking) => booking.player_id || normalizePersonKey(personName(booking)));

  for (const appearance of sideData.appearances) {
    const record = ensurePlayer(playersById, appearance);
    if (!record) {
      continue;
    }
    if (Number(appearance.starter) === 1) {
      addEvidence(record, `started as a ${positionGroup(appearance)}`, 30, 35);
    } else if (Number(appearance.substitute) === 1) {
      addEvidence(record, "appeared as a substitute", 20, 18);
    }
  }

  for (const goal of sideData.goals) {
    const record = ensurePlayer(playersById, goal);
    if (record) {
      addEvidence(record, goalLabel(goalsByPlayer.get(goal.player_id || normalizePersonKey(personName(goal))) || [goal]), 50, 100);
    }
  }

  for (const penalty of sideData.penalties) {
    const record = ensurePlayer(playersById, penalty);
    if (record) {
      addEvidence(record, Number(penalty.converted) === 1 ? "converted in the shootout" : "took a shootout penalty", 40, Number(penalty.converted) === 1 ? 45 : 20);
    }
  }

  for (const booking of sideData.bookings) {
    const record = ensurePlayer(playersById, booking);
    if (record && (Number(booking.red_card) === 1 || Number(booking.sending_off) === 1 || Number(booking.second_yellow_card) === 1)) {
      addEvidence(record, "was sent off", 10, 5);
    } else if (record) {
      bookingsByPlayer.get(record.id);
    }
  }

  if (!playersById.size || sideData.appearances.length === 0) {
    for (const squadPlayer of sideData.squad) {
      const record = ensurePlayer(playersById, squadPlayer);
      if (record) {
        addEvidence(record, `listed in the tournament squad as a ${positionGroup(squadPlayer)}`, 5, positionWeight(squadPlayer));
      }
    }
  }

  if (sideData.score.against === 0) {
    for (const record of playersById.values()) {
      if (record.position === "goalkeeper" || record.position === "defender") {
        record.score += record.position === "goalkeeper" ? 18 : 10;
      }
    }
  }

  return [...playersById.values()]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 3)
    .map((player) => ({
      name: player.name,
      note: player.evidence
        .sort((a, b) => {
          const rankA = player.evidenceRanks[player.evidence.indexOf(a)] || 0;
          const rankB = player.evidenceRanks[player.evidence.indexOf(b)] || 0;
          return rankB - rankA;
        })
        .slice(0, 2)
        .join("; "),
      shirtNumber: player.shirtNumber,
      position: player.position
    }));
}

function countPositions(appearances) {
  return appearances.reduce(
    (counts, appearance) => {
      const group = positionGroup(appearance);
      counts[group] = (counts[group] || 0) + 1;
      return counts;
    },
    { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0 }
  );
}

function sidePlan(sideData, players) {
  const goalNames = nameSeries([...new Set(sideData.goals.map(personName).filter(Boolean))].slice(0, 3));
  const penaltyNames = nameSeries(
    sideData.penalties
      .filter((penalty) => Number(penalty.converted) === 1)
      .map(personName)
      .filter(Boolean)
      .slice(0, 3)
  );
  const playerNames = nameSeries(players.map((player) => player.name).slice(0, 3));
  const positions = countPositions(sideData.appearances.filter((appearance) => Number(appearance.starter) === 1));

  if (goalNames) {
    return `turning ${goalNames} into the scoring route`;
  }
  if (penaltyNames) {
    return `reaching the shootout and trusting ${penaltyNames}`;
  }
  if (sideData.score.against === 0 && sideData.score.for === 0) {
    return `keeping the box protected around ${playerNames || "their defensive shape"}`;
  }
  if (positions.forward >= 3) {
    return `using a forward-heavy shape around ${playerNames}`;
  }
  if (positions.midfielder >= 4) {
    return `using midfield numbers around ${playerNames} to control the game`;
  }
  if (positions.defender >= 5) {
    return `keeping a defensive base around ${playerNames}`;
  }

  return playerNames
    ? `making ${playerNames} the spine of the match plan`
    : "staying connected through the tournament squad shape";
}

function opponentProblem(opponentName, opponentData, opponentPlayers) {
  const opponentScorers = nameSeries([...new Set(opponentData.goals.map(personName).filter(Boolean))].slice(0, 3));
  const opponentPlayerNames = nameSeries(opponentPlayers.map((player) => player.name).slice(0, 3));

  if (opponentScorers) {
    return `${opponentName}'s scoring threat through ${opponentScorers}`;
  }
  if (opponentData.score.against === 0) {
    return `${opponentName}'s clean-sheet structure`;
  }
  if (opponentPlayerNames) {
    return `${opponentName}'s match spine of ${opponentPlayerNames}`;
  }

  return `${opponentName}'s tournament shape`;
}

function riskSentence(opponentName, opponentData, opponentPlayers) {
  const opponentNames = nameSeries(opponentPlayers.map((player) => player.name).slice(0, 3));
  if (opponentData.goals.length) {
    return `${opponentName} had already shown the finish to make that pressure count.`;
  }
  if (opponentData.score.against === 0) {
    return `${opponentName} could make the match about patience rather than chances.`;
  }
  if (opponentNames) {
    return `${opponentName} could still tilt the game through ${opponentNames}.`;
  }

  return `${opponentName} could still turn the same matchup with one clean spell.`;
}

function resultClause(fixture, side) {
  if (fixture.status === "CANCELLED") {
    return "the match was canceled before that test happened";
  }

  const score = formatScore(fixture.score);
  if (!score) {
    return "the record does not include a final score";
  }

  const sideResult = sideScore(fixture, side);
  if (sideResult.for > sideResult.against) {
    return `that route held in the ${score} win`;
  }
  if (sideResult.for < sideResult.against) {
    return `that route was not enough in the ${score} loss`;
  }

  return `that route produced a ${score} draw`;
}

function generationBasis(sideData) {
  if (sideData.appearances.length) {
    return "actual match roster";
  }
  if (sideData.goals.length) {
    return "match scoring record and tournament squad";
  }
  if (sideData.squad.length) {
    return "tournament squad record";
  }

  return "historical fixture record";
}

function buildSideData({ fixture, sourceMatch, side, sourceSide, indexes }) {
  const sourceTeam = getSourceTeam(sourceMatch, sourceSide);
  const allAppearances = indexes.appearancesByMatch.get(sourceMatch.match_id) || [];
  const allGoals = indexes.goalsByMatch.get(sourceMatch.match_id) || [];
  const allBookings = indexes.bookingsByMatch.get(sourceMatch.match_id) || [];
  const allPenalties = indexes.penaltiesByMatch.get(sourceMatch.match_id) || [];
  const squad = indexes.squadsByTeam.get(`${sourceMatch.tournament_id}|${sourceTeam.teamId}`) || [];

  return {
    teamId: sourceTeam.teamId,
    teamName: sourceTeam.teamName,
    fixtureTeamName: side === "home" ? fixture.homeSlot : fixture.awaySlot,
    sourceSide,
    score: sideScore(fixture, side),
    appearances: allAppearances.filter((appearance) => appearance.team_id === sourceTeam.teamId),
    goals: allGoals.filter((goal) => goal.team_id === sourceTeam.teamId && Number(goal.own_goal) !== 1),
    ownGoalsFor: allGoals.filter((goal) => goal.team_id === sourceTeam.teamId && Number(goal.own_goal) === 1),
    bookings: allBookings.filter((booking) => booking.team_id === sourceTeam.teamId),
    penalties: allPenalties.filter((penalty) => penalty.team_id === sourceTeam.teamId),
    squad
  };
}

function buildHistoricalCopy({ fixture, side, sideData, opponentData, players, opponentPlayers }) {
  const teamName = side === "home" ? fixture.homeSlot : fixture.awaySlot;
  const opponentName = side === "home" ? fixture.awaySlot : fixture.homeSlot;
  const year = fixture.tournamentYear;
  const playerNames = nameSeries(players.map((player) => player.name).slice(0, 3));
  const basis = generationBasis(sideData);

  if (fixture.status === "CANCELLED") {
    const playerContext = playerNames
      ? `The period-specific baseline still comes from ${playerNames} in the ${basis}.`
      : `The imported historical datasets do not include a usable ${teamName} player baseline for this canceled fixture.`;
    return `${teamName}'s ${year} fixture with ${opponentName} was canceled, so there is no match roster to analyze. ${playerContext} Against ${opponentName}, the useful read is the matchup that never got played, not a confirmed tactical plan. Treat this as squad context, not match usage.`;
  }

  const plan = sidePlan(sideData, players);
  const problem = opponentProblem(opponentName, opponentData, opponentPlayers);
  const risk = riskSentence(opponentName, opponentData, opponentPlayers);
  const result = resultClause(fixture, side);
  const playerLine = playerNames
    ? `${teamName}'s ${year} match lens runs through ${playerNames}, based on the ${basis}.`
    : `${teamName}'s ${year} match lens comes from the ${basis}.`;

  return `${playerLine} Against ${opponentName}, ${teamName} had to beat ${problem}. Their own route was ${plan}, and ${result}. The risk was that ${risk}`;
}

function buildFallbackSide(fixture, side, indexes) {
  const teamName = side === "home" ? fixture.homeSlot : fixture.awaySlot;
  const opponentName = side === "home" ? fixture.awaySlot : fixture.homeSlot;
  const tournamentId = `WC-${fixture.tournamentYear}`;
  const squad =
    indexes.squadsByTournamentTeam.get(`${tournamentId}|${normalizeTeamName(teamName)}`) ||
    [];
  const sideData = {
    score: sideScore(fixture, side),
    appearances: [],
    goals: [],
    ownGoalsFor: [],
    bookings: [],
    penalties: [],
    squad
  };
  const opponentSquad =
    indexes.squadsByTournamentTeam.get(`${tournamentId}|${normalizeTeamName(opponentName)}`) ||
    [];
  const opponentData = {
    score: sideScore(fixture, side === "home" ? "away" : "home"),
    appearances: [],
    goals: [],
    ownGoalsFor: [],
    bookings: [],
    penalties: [],
    squad: opponentSquad
  };
  const players = selectKeyPlayers(sideData);
  const opponentPlayers = selectKeyPlayers(opponentData);

  return {
    players,
    copy: buildHistoricalCopy({ fixture, side, sideData, opponentData, players, opponentPlayers })
  };
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

  const squads = (fjelstulData.squads || []).filter((record) => /FIFA Men's World Cup/.test(record.tournament_name || ""));
  return {
    matchesByFixtureKey,
    appearancesByMatch: groupBy(fjelstulData.player_appearances || [], (record) => record.match_id),
    goalsByMatch: groupBy(fjelstulData.goals || [], (record) => record.match_id),
    bookingsByMatch: groupBy(fjelstulData.bookings || [], (record) => record.match_id),
    penaltiesByMatch: groupBy(fjelstulData.penalty_kicks || [], (record) => record.match_id),
    squadsByTeam: groupBy(squads, (record) => `${record.tournament_id}|${record.team_id}`),
    squadsByTournamentTeam: groupBy(squads, (record) => `${record.tournament_id}|${normalizeTeamName(record.team_name)}`)
  };
}

const [historyData, fjelstulData] = await Promise.all([readJson(historyPath), loadFjelstulData()]);
const indexes = createIndexes(fjelstulData);
let matched = 0;
let fallback = 0;

const fixtures = (historyData.fixtures || []).map((fixture) => {
  const sourceMatch = indexes.matchesByFixtureKey.get(
    matchKey(fixture.tournamentYear, fixture.date, fixture.homeSlot, fixture.awaySlot)
  );

  if (!sourceMatch) {
    fallback += 1;
    const home = buildFallbackSide(fixture, "home", indexes);
    const away = buildFallbackSide(fixture, "away", indexes);

    return {
      ...fixture,
      keyPlayers: {
        sourceId,
        method: "historical-squad-context",
        basis: "No exact match-level Fjelstul record was matched; copy uses available tournament squad records and the openfootball fixture result.",
        home: home.players,
        away: away.players
      },
      keyInformation: {
        sourceId,
        historicalCoverage: "squad-context",
        home: home.copy,
        away: away.copy
      }
    };
  }

  matched += 1;
  const homeSourceSide = getSourceSide(fixture, sourceMatch, "home");
  const awaySourceSide = homeSourceSide === "home" ? "away" : "home";
  const homeData = buildSideData({ fixture, sourceMatch, side: "home", sourceSide: homeSourceSide, indexes });
  const awayData = buildSideData({ fixture, sourceMatch, side: "away", sourceSide: awaySourceSide, indexes });
  const homePlayers = selectKeyPlayers(homeData);
  const awayPlayers = selectKeyPlayers(awayData);

  return {
    ...fixture,
    keyPlayers: {
      sourceId,
      method: homeData.appearances.length || awayData.appearances.length
        ? "historical-match-roster"
        : "historical-squad-and-scorer-context",
      basis: "Fixture-specific historical copy generated from Fjelstul World Cup Database match records, goals, penalties, bookings, player appearances where available, and tournament squads.",
      historicalMatchId: sourceMatch.match_id,
      home: homePlayers,
      away: awayPlayers
    },
    keyInformation: {
      sourceId,
      historicalMatchId: sourceMatch.match_id,
      historicalCoverage: homeData.appearances.length || awayData.appearances.length
        ? "match-roster"
        : "squad-and-scorer-context",
      home: buildHistoricalCopy({
        fixture,
        side: "home",
        sideData: homeData,
        opponentData: awayData,
        players: homePlayers,
        opponentPlayers: awayPlayers
      }),
      away: buildHistoricalCopy({
        fixture,
        side: "away",
        sideData: awayData,
        opponentData: homeData,
        players: awayPlayers,
        opponentPlayers: homePlayers
      })
    }
  };
});

const sourceIds = [...new Set([...(historyData.sourceIds || []), sourceId])];
const nextHistoryData = {
  ...historyData,
  updatedAt: new Date().toISOString(),
  sourceIds,
  fixtures
};

await writeFile(historyPath, `${JSON.stringify(nextHistoryData, null, 2)}\n`);
console.log(
  `Historical matchup key information populated: ${fixtures.length} fixtures (${matched} match-level matches, ${fallback} squad-context fallbacks).`
);
