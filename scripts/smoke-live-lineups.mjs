#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildFifaLineupsFromLiveMatch,
  buildProfileLookup,
  getRetainedOfficialLayoutReference
} from "./fifa-live-lineup-parser.mjs";

const previousFetch = globalThis.fetch;
const previousEnv = {
  FIFA_LIVE_LINEUP_CONCURRENCY: process.env.FIFA_LIVE_LINEUP_CONCURRENCY,
  FIFA_GOAL_EVENTS_ENABLED: process.env.FIFA_GOAL_EVENTS_ENABLED,
  FIFA_LIVE_LINEUP_WINDOW_BEFORE_MINUTES: process.env.FIFA_LIVE_LINEUP_WINDOW_BEFORE_MINUTES,
  FOOTBALL_DATA_API_KEY: process.env.FOOTBALL_DATA_API_KEY,
  FOOTBALLDATA_API_KEY: process.env.FOOTBALLDATA_API_KEY,
  FOOTBALL_DATA_TOKEN: process.env.FOOTBALL_DATA_TOKEN,
  LIVE_DATA_PROVIDER: process.env.LIVE_DATA_PROVIDER
};

process.env.FIFA_GOAL_EVENTS_ENABLED = "0";
process.env.FIFA_LIVE_LINEUP_CONCURRENCY = "4";
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

const englandArgentinaCalendar = calendarMatch({
  idMatch: "400021540",
  matchNumber: 102,
  date: "2026-07-15T19:00:00Z",
  homeTeam: "England",
  homeAbbreviation: "ENG",
  awayTeam: "Argentina",
  awayAbbreviation: "ARG",
  statusCode: 1,
  statusName: "Scheduled"
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
      homeFormation: "4-2-3-1",
      awayFormation: "4-1-2-3",
      home: {
        coach: "Didier Deschamps",
        players: [
          player(41, "Mike Maignan", 16, 0),
          player(42, "Lucas Digne", 3, 1),
          player(43, "Dayot Upamecano", 4, 1),
          player(44, "Jules Kounde", 5, 1),
          player(45, "William Saliba", 17, 1),
          player(46, "Aurelien Tchouameni", 8, 2),
          player(47, "Adrien Rabiot", 14, 2),
          player(48, "Ousmane Dembele", 7, 3),
          player(49, "Kylian Mbappe", 10, 3),
          player(50, "Michael Olise", 11, 3),
          player(51, "Bradley Barcola", 12, 3),
          player(52, "Brice Samba", 23, 0, 2),
          player(53, "Desire Doue", 20, 3, 2)
        ]
      },
      away: {
        coach: "Luis de la Fuente",
        players: [
          player(61, "Unai Simon", 23, 0),
          player(62, "Pedro Porro", 12, 1),
          player(63, "Aymeric Laporte", 14, 1),
          player(64, "Pau Cubarsi", 22, 1),
          player(65, "Marc Cucurella", 24, 1),
          player(66, "Rodri", 16, 2),
          player(67, "Fabian Ruiz", 8, 2),
          player(68, "Dani Olmo", 10, 2),
          player(69, "Lamine Yamal", 19, 3),
          player(70, "Mikel Oyarzabal", 21, 3),
          player(71, "Alex Baena", 7, 3),
          player(72, "David Raya", 1, 0, 2),
          player(73, "Ferran Torres", 11, 3, 2)
        ]
      }
    })
  ],
  [
    "400021540",
    liveFootballMatch({
      base: englandArgentinaCalendar,
      homeFormation: "4-2-3-1",
      awayFormation: "4-3-3",
      home: {
        coach: "Thomas Tuchel",
        players: [
          player(81, "Jordan Pickford", 1, 0),
          player(82, "Reece James", 2, 1),
          player(83, "John Stones", 5, 1),
          player(84, "Marc Guehi", 6, 1),
          player(85, "Myles Lewis-Skelly", 3, 1),
          player(86, "Declan Rice", 4, 2),
          player(87, "Adam Wharton", 8, 2),
          player(88, "Bukayo Saka", 7, 3),
          player(89, "Jude Bellingham", 10, 2),
          player(90, "Anthony Gordon", 11, 3),
          player(91, "Harry Kane", 9, 3),
          player(92, "Dean Henderson", 13, 0, 2),
          player(93, "Cole Palmer", 20, 2, 2)
        ]
      },
      away: {
        coach: "Lionel Scaloni",
        players: [
          player(101, "Emiliano Martinez", 23, 0),
          player(102, "Nahuel Molina", 26, 1),
          player(103, "Cristian Romero", 13, 1),
          player(104, "Lisandro Martinez", 6, 1),
          player(105, "Nicolas Tagliafico", 3, 1),
          player(106, "Rodrigo De Paul", 7, 2),
          player(107, "Enzo Fernandez", 24, 2),
          player(108, "Alexis Mac Allister", 20, 2),
          player(109, "Lionel Messi", 10, 3),
          player(110, "Julian Alvarez", 9, 3),
          player(111, "Nico Gonzalez", 15, 3),
          player(112, "Geronimo Rulli", 12, 0, 2),
          player(113, "Lautaro Martinez", 22, 3, 2)
        ]
      }
    })
  ]
]);

const parserFixture = {
  id: "parser-smoke-4-1-3-2",
  homeTeamId: "ARG",
  awayTeamId: "EGY",
  providerIds: {
    fifa: {
      matchId: "400021528"
    }
  }
};
const parserTeamsById = new Map([
  ["ARG", { id: "ARG", name: "Argentina" }],
  ["EGY", { id: "EGY", name: "Egypt" }]
]);
const emptyProfileLookup = buildProfileLookup({ profiles: {} });
const parsed4132 = buildFifaLineupsFromLiveMatch({
  fixture: parserFixture,
  liveMatch: livePayloads.get("400021528"),
  teamsById: parserTeamsById,
  profileLookup: emptyProfileLookup,
  checkedAt: "2026-07-07T16:15:00.000Z",
  sourceIds: ["parser-smoke"],
  sourceUrl: "https://www.fifa.com/parser-smoke",
  mode: "final"
});
assert.deepEqual(
  parsed4132.home.players.map((entry) => entry.position).sort(),
  ["CB", "CB", "CM", "CM", "CM", "DM", "GK", "LB", "RB", "ST", "ST"].sort(),
  "A parsed 4-1-3-2 must contain one holding midfielder plus three midfielders, not a fictional RW/AM/LW line"
);

const retainedLayout = {
  ...parsed4132,
  teamSheetSource: "fifa-official",
  checkedAt: "2026-07-14T21:28:49.403Z",
  layoutVerification: {
    inferenceSources: [
      {
        type: "retained-official-role-layout",
        revisionId: "immutable-prediction-revision"
      }
    ]
  }
};
const retainedLayoutReference = getRetainedOfficialLayoutReference(retainedLayout);
assert.equal(retainedLayoutReference?.type, "retained-official-role-layout");
assert.equal(retainedLayoutReference?.revisionId, "immutable-prediction-revision");
assert.equal(
  retainedLayoutReference?.lineup,
  retainedLayout,
  "Repeated official refreshes must preserve a role-informed layout that was retained by an earlier refresh"
);

const distinctIdentityMatch = structuredClone(livePayloads.get("400021528"));
distinctIdentityMatch.HomeTeam.Players[0] = player(1, "Ederson", 23, 0);
distinctIdentityMatch.HomeTeam.Players[1] = player(2, "Danilo", 13, 1);
distinctIdentityMatch.HomeTeam.Players[11] = player(12, "Ederson Silva", 2, 2, 2);
distinctIdentityMatch.HomeTeam.Players[12] = player(13, "Danilo Santos", 18, 2, 2);
distinctIdentityMatch.HomeTeam.Substitutions = [
  {
    PlayerOffName: localized("Rodrigo De Paul"),
    PlayerOnName: localized("Danilo Oliveira"),
    Minute: "55'"
  },
  {
    IdPlayerOff: "6",
    IdPlayerOn: "12",
    Minute: "60'"
  },
  {
    PlayerOffName: localized("Alexis Mac Allister"),
    PlayerOnName: localized("Ederson"),
    Minute: "70'"
  },
  {
    PlayerOffName: localized("Enzo Fernandez"),
    PlayerOnName: localized("Danilo"),
    Minute: "75'"
  }
];
const identityProfileLookup = buildProfileLookup({
  profiles: {
    "Danilo Santos": {
      name: "Danilo Santos",
      displayName: "Danilo Santos",
      aliases: ["Danilo Oliveira"],
      teamId: "ARG",
      position: "Central midfielder"
    }
  }
});
const parsedDistinctIdentities = buildFifaLineupsFromLiveMatch({
  fixture: parserFixture,
  liveMatch: distinctIdentityMatch,
  teamsById: parserTeamsById,
  profileLookup: identityProfileLookup,
  checkedAt: "2026-07-07T16:45:00.000Z",
  sourceIds: ["parser-identity-smoke"],
  sourceUrl: "https://www.fifa.com/parser-identity-smoke",
  mode: "live"
});
assert.deepEqual(
  parsedDistinctIdentities.home.events.substitutions.map(({ offName, onName }) => ({ offName, onName })),
  [
    { offName: "Rodrigo De Paul", onName: "Danilo Santos" },
    { offName: "Leandro Paredes", onName: "Ederson Silva" }
  ],
  "A starter's shorter name must not fuzzy-authorize a different longer-named bench player"
);
assert.equal(parsedDistinctIdentities.home.onFieldPlayers.length, 11);
assert(parsedDistinctIdentities.home.onFieldPlayers.includes("Ederson"));
assert(parsedDistinctIdentities.home.onFieldPlayers.includes("Ederson Silva"));
assert(parsedDistinctIdentities.home.onFieldPlayers.includes("Danilo"));
assert(parsedDistinctIdentities.home.onFieldPlayers.includes("Danilo Santos"));

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
  footballData: 0,
  liveFootball: new Map()
};
let activeLiveFootballRequests = 0;
let maxConcurrentLiveFootballRequests = 0;
const failingLiveMatchIds = new Set();

globalThis.fetch = async (url) => {
  const href = String(url);
  if (href.includes("api.football-data.org")) {
    fetchHits.footballData += 1;
    throw new Error("Simulated primary score-provider failure");
  }
  if (href.includes("/api/v3/calendar/matches")) {
    fetchHits.calendar += 1;
    return jsonResponse({
      Results: [
        argentinaEgyptCalendar,
        switzerlandColombiaCalendar,
        franceMoroccoCalendar,
        franceSpainCalendar,
        englandArgentinaCalendar
      ]
    });
  }

  const liveMatch = href.match(/\/api\/v3\/live\/football\/([^?]+)/);
  if (liveMatch) {
    const idMatch = liveMatch[1];
    fetchHits.liveFootball.set(idMatch, (fetchHits.liveFootball.get(idMatch) || 0) + 1);
    activeLiveFootballRequests += 1;
    maxConcurrentLiveFootballRequests = Math.max(
      maxConcurrentLiveFootballRequests,
      activeLiveFootballRequests
    );
    try {
      await new Promise((resolve) => setTimeout(resolve, 20));
      if (failingLiveMatchIds.has(idMatch)) {
        throw new Error(`Simulated FIFA lineup failure for ${idMatch}`);
      }
      const payload = livePayloads.get(idMatch);
      assert(payload, `Unexpected FIFA live-football request for ${idMatch}`);
      return jsonResponse(payload);
    } finally {
      activeLiveFootballRequests -= 1;
    }
  }

  throw new Error(`Unexpected fetch: ${href}`);
};

try {
  const genericLiveMatch = structuredClone(livePayloads.get("400021541"));
  genericLiveMatch.HomeTeam.Tactics = "4-2-2-2";
  const genericLineup = buildFifaLineupsFromLiveMatch({
    checkedAt: "2026-07-14T18:00:00.000Z",
    fixture: {
      id: "generic-formation-smoke",
      homeTeamId: "FRA",
      awayTeamId: "ESP",
      kickoffUtc: "2026-07-14T19:00:00.000Z"
    },
    liveMatch: genericLiveMatch,
    mode: "confirmed",
    profileLookup: buildProfileLookup({ profiles: {} }),
    sourceIds: ["fifa-lineups-live"],
    teamsById: new Map()
  });
  assert.equal(genericLineup.home.formation, "4-2-2-2");
  assert.equal(genericLineup.home.players.length, 11);

  const { default: handler } = await import("../api/live-data.js");
  async function invokeHandler() {
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
    return JSON.parse(chunks.join(""));
  }

  const payload = await invokeHandler();
  const byId = new Map((payload.fixturesData?.fixtures || []).map((fixture) => [fixture.id, fixture]));
  const liveFixture = byId.get("match-101-semi-final-2026-07-14");
  const concurrentFixture = byId.get("match-102-semi-final-2026-07-15");
  const newlyCompletedFixture = byId.get("match-97-quarter-final-2026-07-09");
  const completedStaticFixture = byId.get("match-95-round-of-16-2026-07-07");

  assert.equal(liveFixture?.status, "FT");
  assert.equal(liveFixture?.lineups?.mode, "final");
  assert.equal(liveFixture.lineups.teamSheetSource, "fifa-official");
  assert.equal(liveFixture.lineups.layoutSource, "derived-team-sheet-order");
  assert.equal(liveFixture.lineups.layoutVerification?.status, "unverified");
  assert.equal(liveFixture.lineups.layoutVerification?.exact, false);
  assert.equal(liveFixture.lineups.home.players.length, 11);
  assert.equal(liveFixture.lineups.away.players.length, 11);
  assert.equal(liveFixture.lineups.home.formation, "4-2-3-1");
  assert.equal(liveFixture.lineups.away.formation, "4-1-2-3");
  assert.equal(liveFixture.lineups.layoutVerification?.method, "role-informed-formation-slots");
  const playerKey = (name) => String(name || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const playerByName = (players, name) => players.find((player) => playerKey(player.name) === playerKey(name));
  assert.equal(playerByName(liveFixture.lineups.home.players, "Jules Kounde")?.position, "RB");
  assert.equal(playerByName(liveFixture.lineups.home.players, "Dayot Upamecano")?.position, "CB");
  assert.equal(playerByName(liveFixture.lineups.home.players, "William Saliba")?.position, "CB");
  assert.equal(playerByName(liveFixture.lineups.home.players, "Ousmane Dembele")?.position, "RW");
  assert.equal(playerByName(liveFixture.lineups.home.players, "Michael Olise")?.position, "AM");
  assert.equal(playerByName(liveFixture.lineups.home.players, "Bradley Barcola")?.position, "LW");
  assert.equal(playerByName(liveFixture.lineups.home.players, "Kylian Mbappe")?.position, "ST");
  assert(playerByName(liveFixture.lineups.away.players, "Pau Cubarsi")?.x > 50, "Cubarsi should occupy Spain's right centre-back slot");
  assert(playerByName(liveFixture.lineups.away.players, "Aymeric Laporte")?.x < 50, "Laporte should occupy Spain's left centre-back slot");
  assert.equal(playerByName(liveFixture.lineups.away.players, "Rodri")?.position, "DM");
  assert(playerByName(liveFixture.lineups.away.players, "Fabian Ruiz")?.x < 50, "Fabian should retain the left central-midfield hint");
  assert(playerByName(liveFixture.lineups.away.players, "Dani Olmo")?.x > 50, "Olmo should fill the remaining right central-midfield slot");
  assert.equal(concurrentFixture?.lineups?.mode, "confirmed");
  assert.equal(concurrentFixture.lineups.home.players.length, 11);
  assert.equal(
    maxConcurrentLiveFootballRequests,
    Math.min(payload.syncStatus.lineupFixtures, 4),
    "Expected every eligible FIFA lineup request to use the configured concurrent worker pool"
  );

  assert.equal(newlyCompletedFixture?.lineups?.mode, "final");
  assert.equal(newlyCompletedFixture.lineups.teamSheetSource, "fifa-official");
  assert.equal(newlyCompletedFixture.lineups.layoutSource, "verified-layout");
  assert.equal(newlyCompletedFixture.lineups.layoutVerification?.status, "verified");
  assert(
    newlyCompletedFixture.lineups.layoutVerification?.sources?.some(
      (source) => source.exactLayout === true
    )
  );
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
  assert.equal(fetchHits.liveFootball.get("400021541") || 0, 0);
  assert.equal(fetchHits.liveFootball.get("400021540"), 1);
  assert.equal(payload.syncStatus.lineupFixtures, 1);
  assert.equal(payload.syncStatus.lineupUpdates, 1);
  assert(payload.syncStatus.staticLineupFixtures >= 1);
  assert(payload.syncStatus.staticLineupUpdates >= 1);

  delete process.env.FOOTBALL_DATA_API_KEY;
  delete process.env.FOOTBALLDATA_API_KEY;
  delete process.env.FOOTBALL_DATA_TOKEN;
  process.env.LIVE_DATA_PROVIDER = "football-data";
  const liveHitsBeforeFallback = fetchHits.liveFootball.get("400021540") || 0;
  const fallbackPayload = await invokeHandler();
  const fallbackFixture = fallbackPayload.fixturesData.fixtures.find(
    (fixture) => fixture.id === "match-102-semi-final-2026-07-15"
  );
  assert.equal(fallbackPayload.syncStatus.fallback, true);
  assert.equal(fallbackPayload.syncStatus.primaryProvider, "football-data.org");
  assert.equal(fallbackFixture?.lineups?.teamSheetSource, "fifa-official");
  assert.equal(fallbackFixture.lineups.home.players.length, 11);
  assert(
    (fetchHits.liveFootball.get("400021540") || 0) > liveHitsBeforeFallback,
    "Expected official lineup enrichment even when the requested score provider is unavailable"
  );

  process.env.FOOTBALL_DATA_API_KEY = "test-token";
  const failedProviderPayload = await invokeHandler();
  const failedProviderFixture = failedProviderPayload.fixturesData.fixtures.find(
    (fixture) => fixture.id === "match-102-semi-final-2026-07-15"
  );
  assert.equal(failedProviderPayload.syncStatus.fallback, true);
  assert.match(failedProviderPayload.syncStatus.fallbackReason, /Simulated primary score-provider failure/);
  assert.equal(failedProviderFixture?.lineups?.teamSheetSource, "fifa-official");
  assert(fetchHits.footballData >= 1);

  const retainedCheckedAt = failedProviderFixture.lineups.checkedAt;
  failingLiveMatchIds.add("400021540");
  process.env.LIVE_DATA_PROVIDER = "fifa";
  const retainedPayload = await invokeHandler();
  const retainedFixture = retainedPayload.fixturesData.fixtures.find(
    (fixture) => fixture.id === "match-102-semi-final-2026-07-15"
  );
  assert.equal(retainedFixture?.lineups?.teamSheetSource, "fifa-official");
  assert.equal(retainedFixture.lineups.checkedAt, retainedCheckedAt);
  assert.match(retainedPayload.syncStatus.lineupReason, /Simulated FIFA lineup failure/);

  console.log("Live lineup smoke passed: exact teammate identities, central 4-1-3-2 roles, generic formations, concurrent FIFA fetches, fallback enrichment, and confirmed-lineup retention are resilient.");
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
