#!/usr/bin/env node
import assert from "node:assert/strict";

const previousFetch = globalThis.fetch;
const previousEnv = {
  FIFA_GOAL_EVENTS_ENABLED: process.env.FIFA_GOAL_EVENTS_ENABLED,
  FIFA_LIVE_LINEUP_WINDOW_BEFORE_MINUTES: process.env.FIFA_LIVE_LINEUP_WINDOW_BEFORE_MINUTES,
  LIVE_DATA_PROVIDER: process.env.LIVE_DATA_PROVIDER
};

process.env.FIFA_GOAL_EVENTS_ENABLED = "0";
process.env.FIFA_LIVE_LINEUP_WINDOW_BEFORE_MINUTES = "3000";
process.env.LIVE_DATA_PROVIDER = "fifa";

function localized(value) {
  return [{ Locale: "en-GB", Description: value }];
}

function calendarMatch({
  awayAbbreviation,
  awayScore = null,
  awayTeam,
  date,
  homeAbbreviation,
  homeScore = null,
  homeTeam,
  idMatch,
  matchNumber,
  statusName = "Live",
  statusCode = 3
}) {
  return {
    IdCompetition: "17",
    IdSeason: "285023",
    IdStage: "108852",
    IdMatch: String(idMatch),
    MatchNumber: matchNumber,
    Date: date,
    MatchStatus: statusCode,
    MatchStatusName: localized(statusName),
    HomeTeamScore: homeScore,
    AwayTeamScore: awayScore,
    Home: {
      Abbreviation: homeAbbreviation,
      IdCountry: homeAbbreviation,
      TeamName: localized(homeTeam)
    },
    Away: {
      Abbreviation: awayAbbreviation,
      IdCountry: awayAbbreviation,
      TeamName: localized(awayTeam)
    }
  };
}

function player(id, name, number, position, status = 1) {
  return {
    IdPlayer: String(id),
    PlayerName: localized(name),
    ShortName: localized(name),
    ShirtNumber: number,
    Position: position,
    Status: status
  };
}

function coach(name) {
  return {
    IdCoach: `coach-${name.replace(/\s+/g, "-").toLowerCase()}`,
    Alias: localized(name),
    Name: localized(name),
    Role: 0,
    PictureUrl: `https://digitalhub.fifa.com/transform/${encodeURIComponent(name)}.png`
  };
}

function liveFootballMatch({ away, awayFormation, base, home, homeFormation }) {
  return {
    ...base,
    HomeTeam: {
      Tactics: homeFormation,
      Players: home.players,
      Coaches: [coach(home.coach)],
      Bookings: [],
      Substitutions: []
    },
    AwayTeam: {
      Tactics: awayFormation,
      Players: away.players,
      Coaches: [coach(away.coach)],
      Bookings: [],
      Substitutions: []
    }
  };
}

const argentinaEgyptCalendar = calendarMatch({
  idMatch: "400021528",
  matchNumber: 95,
  date: "2026-07-07T16:00:00Z",
  homeTeam: "Argentina",
  homeAbbreviation: "ARG",
  homeScore: 0,
  awayTeam: "Egypt",
  awayAbbreviation: "EGY",
  awayScore: 1,
  statusCode: 0,
  statusName: "Played"
});

const switzerlandColombiaCalendar = calendarMatch({
  idMatch: "400021535",
  matchNumber: 96,
  date: "2026-07-07T20:00:00Z",
  homeTeam: "Switzerland",
  homeAbbreviation: "SUI",
  awayTeam: "Colombia",
  awayAbbreviation: "COL",
  statusCode: 1,
  statusName: "Scheduled"
});

const franceMoroccoCalendar = calendarMatch({
  idMatch: "400021536",
  matchNumber: 97,
  date: "2026-07-09T20:00:00Z",
  homeTeam: "France",
  homeAbbreviation: "FRA",
  awayTeam: "Morocco",
  awayAbbreviation: "MAR",
  statusCode: 1,
  statusName: "Scheduled"
});

const franceSpainCalendar = calendarMatch({
  idMatch: "400021541",
  matchNumber: 101,
  date: "2026-07-14T19:00:00Z",
  homeTeam: "France",
  homeAbbreviation: "FRA",
  awayTeam: "Spain",
  awayAbbreviation: "ESP",
  statusCode: 3,
  statusName: "Live"
});

const livePayloads = new Map([
  [
    "400021528",
    liveFootballMatch({
      base: argentinaEgyptCalendar,
      homeFormation: "4-1-3-2",
      awayFormation: "4-2-3-1",
      home: {
        coach: "Lionel Scaloni",
        players: [
          player(1, "Emiliano Martinez", 23, 0),
          player(2, "Nicolas Tagliafico", 3, 1),
          player(3, "Lisandro Martinez", 6, 1),
          player(4, "Cristian Romero", 13, 1),
          player(5, "Nahuel Molina", 26, 1),
          player(6, "Leandro Paredes", 5, 2),
          player(7, "Rodrigo De Paul", 7, 2),
          player(8, "Alexis Mac Allister", 20, 2),
          player(9, "Enzo Fernandez", 24, 2),
          player(10, "Julian Alvarez", 9, 3),
          player(11, "Lionel Messi", 10, 3),
          player(12, "Geronimo Rulli", 12, 0, 2),
          player(13, "Lautaro Martinez", 22, 3, 2)
        ]
      },
      away: {
        coach: "Hossam Hassan",
        players: [
          player(21, "Mostafa Shoubir", 23, 0),
          player(22, "Yasser Ibrahim", 2, 1),
          player(23, "Mohamed Hany", 3, 1),
          player(24, "Ramy Rabia", 5, 1),
          player(25, "Karim Hafez", 15, 1),
          player(26, "Emam Ashour", 8, 2),
          player(27, "Mostafa Zico", 11, 2),
          player(28, "Mohanad Lashin", 17, 2),
          player(29, "Marawan Attia", 19, 2),
          player(30, "Mohamed Salah", 10, 3),
          player(31, "Haissem Hassan", 12, 3),
          player(32, "Mohamed El Shenawy", 1, 0, 2),
          player(33, "Trezeguet", 7, 3, 2)
        ]
      }
    })
  ],
  [
    "400021541",
    liveFootballMatch({
      base: franceSpainCalendar,
      homeFormation: "4-3-3",
      awayFormation: "4-2-3-1",
      home: {
        coach: "Didier Deschamps",
        players: [
          player(41, "Mike Maignan", 16, 0),
          player(42, "Jules Kounde", 5, 1),
          player(43, "William Saliba", 17, 1),
          player(44, "Dayot Upamecano", 4, 1),
          player(45, "Theo Hernandez", 22, 1),
          player(46, "Aurelien Tchouameni", 8, 2),
          player(47, "Eduardo Camavinga", 6, 2),
          player(48, "Antoine Griezmann", 7, 2),
          player(49, "Ousmane Dembele", 11, 3),
          player(50, "Kylian Mbappe", 10, 3),
          player(51, "Marcus Thuram", 9, 3),
          player(52, "Brice Samba", 23, 0, 2),
          player(53, "Bradley Barcola", 20, 3, 2)
        ]
      },
      away: {
        coach: "Luis de la Fuente",
        players: [
          player(61, "Unai Simon", 23, 0),
          player(62, "Dani Carvajal", 2, 1),
          player(63, "Robin Le Normand", 3, 1),
          player(64, "Aymeric Laporte", 14, 1),
          player(65, "Marc Cucurella", 24, 1),
          player(66, "Rodri", 16, 2),
          player(67, "Fabian Ruiz", 8, 2),
          player(68, "Dani Olmo", 10, 2),
          player(69, "Lamine Yamal", 19, 3),
          player(70, "Mikel Oyarzabal", 21, 3),
          player(71, "Nico Williams", 17, 3),
          player(72, "David Raya", 1, 0, 2),
          player(73, "Ferran Torres", 11, 3, 2)
        ]
      }
    })
  ]
]);

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    async json() {
      return payload;
    }
  };
}

const fetchHits = {
  calendar: 0,
  liveFootball: new Map()
};

globalThis.fetch = async (url) => {
  const href = String(url);
  if (href.includes("/api/v3/calendar/matches")) {
    fetchHits.calendar += 1;
    return jsonResponse({
      Results: [argentinaEgyptCalendar, switzerlandColombiaCalendar, franceMoroccoCalendar, franceSpainCalendar]
    });
  }

  const liveMatch = href.match(/\/api\/v3\/live\/football\/([^?]+)/);
  if (liveMatch) {
    const idMatch = liveMatch[1];
    fetchHits.liveFootball.set(idMatch, (fetchHits.liveFootball.get(idMatch) || 0) + 1);
    const payload = livePayloads.get(idMatch);
    assert(payload, `Unexpected FIFA live-football request for ${idMatch}`);
    return jsonResponse(payload);
  }

  throw new Error(`Unexpected fetch: ${href}`);
};

try {
  const { default: handler } = await import("../api/live-data.js");
  const chunks = [];
  const response = {
    statusCode: 0,
    setHeader() {},
    removeHeader() {},
    end(chunk = "") {
      chunks.push(String(chunk));
    }
  };

  await handler({ method: "GET" }, response);
  assert.equal(response.statusCode, 200);

  const payload = JSON.parse(chunks.join(""));
  const byId = new Map((payload.fixturesData?.fixtures || []).map((fixture) => [fixture.id, fixture]));
  const liveFixture = byId.get("match-101-semi-final-2026-07-14");
  const newlyCompletedFixture = byId.get("match-97-quarter-final-2026-07-09");
  const completedStaticFixture = byId.get("match-95-round-of-16-2026-07-07");

  assert.equal(liveFixture?.lineups?.mode, "live");
  assert.equal(liveFixture.lineups.teamSheetSource, "fifa-official");
  assert.equal(liveFixture.lineups.layoutSource, "derived-team-sheet-order");
  assert.equal(liveFixture.lineups.layoutVerification?.status, "unverified");
  assert.equal(liveFixture.lineups.layoutVerification?.exact, false);
  assert.equal(liveFixture.lineups.home.players.length, 11);
  assert.equal(liveFixture.lineups.away.players.length, 11);

  assert.equal(newlyCompletedFixture?.lineups?.mode, "final");
  assert.equal(newlyCompletedFixture.lineups.teamSheetSource, "fifa-official");
  assert.equal(newlyCompletedFixture.lineups.layoutSource, "derived-team-sheet-order");
  assert.equal(newlyCompletedFixture.lineups.layoutVerification?.status, "unverified");
  assert.equal(newlyCompletedFixture.lineups.layoutVerification?.exact, false);
  assert.equal(newlyCompletedFixture.lineups.home.players.length, 11);
  assert.equal(newlyCompletedFixture.lineups.away.players.length, 11);

  assert.equal(completedStaticFixture?.lineups?.mode, "final");
  assert.equal(completedStaticFixture.lineups.teamSheetSource, "fifa-official");
  assert.equal(completedStaticFixture.lineups.home.players.length, 11);
  assert.equal(completedStaticFixture.lineups.away.players.length, 11);

  assert(fetchHits.calendar >= 1 && fetchHits.calendar <= 2, `Expected 1 or 2 calendar fetches, got ${fetchHits.calendar}`);
  assert.equal(fetchHits.liveFootball.get("400021528") || 0, 0);
  assert.equal(fetchHits.liveFootball.get("400021535") || 0, 0);
  assert.equal(fetchHits.liveFootball.get("400021536") || 0, 0);
  assert.equal(fetchHits.liveFootball.get("400021538") || 0, 0);
  assert.equal(fetchHits.liveFootball.get("400021539") || 0, 0);
  assert.equal(fetchHits.liveFootball.get("400021541"), 1);
  assert.equal(payload.syncStatus.lineupFixtures, 1);
  assert.equal(payload.syncStatus.lineupUpdates, 1);
  assert(payload.syncStatus.staticLineupFixtures >= 1);
  assert(payload.syncStatus.staticLineupUpdates >= 1);

  console.log("Live lineup smoke passed: FIFA team sheets and completed static lineups reached /api/live-data.");
} finally {
  globalThis.fetch = previousFetch;
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
