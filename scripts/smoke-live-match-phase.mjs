#!/usr/bin/env node
import assert from "node:assert/strict";

const previousFetch = globalThis.fetch;
const previousEnv = {
  FIFA_GOAL_EVENTS_ENABLED: process.env.FIFA_GOAL_EVENTS_ENABLED,
  FIFA_LIVE_LINEUP_TIMEOUT_MS: process.env.FIFA_LIVE_LINEUP_TIMEOUT_MS,
  FOOTBALL_DATA_API_KEY: process.env.FOOTBALL_DATA_API_KEY,
  LIVE_DATA_PROVIDER: process.env.LIVE_DATA_PROVIDER
};

process.env.FIFA_GOAL_EVENTS_ENABLED = "0";
process.env.FIFA_LIVE_LINEUP_TIMEOUT_MS = "100";
process.env.FOOTBALL_DATA_API_KEY = "test-token";
process.env.LIVE_DATA_PROVIDER = "footballData";

function localized(value) {
  return [{ Locale: "en-GB", Description: value }];
}

function footballDataLiveMatch() {
  return {
    id: 537382,
    utcDate: "2026-07-07T20:00:00Z",
    status: "IN_PLAY",
    homeTeam: { id: 788, name: "Switzerland", tla: "SUI" },
    awayTeam: { id: 818, name: "Colombia", tla: "COL" },
    score: {
      fullTime: {
        home: 0,
        away: 0
      }
    }
  };
}

function fifaCalendarMatch({
  firstHalfExtraTime = null,
  matchTime = "",
  secondHalfExtraTime = null,
  statusName = "Live"
} = {}) {
  return {
    IdCompetition: "17",
    IdSeason: "285023",
    IdStage: "289288",
    IdMatch: "400021535",
    MatchNumber: 96,
    Date: "2026-07-07T20:00:00Z",
    MatchStatus: 3,
    MatchStatusName: localized(statusName),
    MatchTime: matchTime,
    FirstHalfExtraTime: firstHalfExtraTime,
    SecondHalfExtraTime: secondHalfExtraTime,
    ResultType: 0,
    HomeTeamScore: 0,
    AwayTeamScore: 0,
    Home: {
      Abbreviation: "SUI",
      IdCountry: "SUI",
      TeamName: localized("Switzerland")
    },
    Away: {
      Abbreviation: "COL",
      IdCountry: "COL",
      TeamName: localized("Colombia")
    }
  };
}

function fifaLiveFootballMatch({
  firstHalfExtraTime = null,
  matchTime = "",
  period = null,
  secondHalfExtraTime = null,
  statusName = "Live"
} = {}) {
  return {
    ...fifaCalendarMatch({ firstHalfExtraTime, matchTime, secondHalfExtraTime, statusName }),
    Period: period,
    HomeTeam: {
      Tactics: "",
      Players: [],
      Coaches: []
    },
    AwayTeam: {
      Tactics: "",
      Players: [],
      Coaches: []
    }
  };
}

let currentFifaCalendarMatch = fifaCalendarMatch();
let currentFifaLiveFootballMatch = fifaLiveFootballMatch();
const fetchHits = {
  fifaCalendar: 0,
  footballData: 0,
  liveFootball: 0
};

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    async json() {
      return payload;
    }
  };
}

globalThis.fetch = async (url) => {
  const href = String(url);
  if (href.includes("football-data.org")) {
    fetchHits.footballData += 1;
    return jsonResponse({ matches: [footballDataLiveMatch()] });
  }

  if (href.includes("/api/v3/calendar/matches")) {
    fetchHits.fifaCalendar += 1;
    return jsonResponse({ Results: [currentFifaCalendarMatch] });
  }

  if (href.includes("/api/v3/live/football/")) {
    fetchHits.liveFootball += 1;
    return jsonResponse(currentFifaLiveFootballMatch);
  }

  throw new Error(`Unexpected fetch: ${href}`);
};

async function getLiveFixture(handler) {
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
  return (payload.fixturesData?.fixtures || []).find((fixture) => fixture.matchNumber === 96);
}

try {
  const { default: handler } = await import("../api/live-data.js");

  currentFifaCalendarMatch = fifaCalendarMatch({ matchTime: "" });
  currentFifaLiveFootballMatch = fifaLiveFootballMatch({ matchTime: "", period: 4 });
  const halfTimeFixture = await getLiveFixture(handler);

  assert.equal(halfTimeFixture.status, "LIVE");
  assert.deepEqual(halfTimeFixture.score, { away: 0, home: 0 });
  assert.equal(halfTimeFixture.officialMatchPhase, "Half-time");
  assert.equal(halfTimeFixture.officialMatchTime, undefined);
  assert.ok(halfTimeFixture.officialMatchTimeUpdatedAt);

  currentFifaCalendarMatch = fifaCalendarMatch({ matchTime: "" });
  currentFifaLiveFootballMatch = fifaLiveFootballMatch({ matchTime: "", period: 5 });
  const unavailableFixture = await getLiveFixture(handler);

  assert.equal(unavailableFixture.status, "LIVE");
  assert.deepEqual(unavailableFixture.score, { away: 0, home: 0 });
  assert.equal(unavailableFixture.officialMatchPhase, undefined);
  assert.equal(unavailableFixture.officialMatchTime, undefined);

  currentFifaCalendarMatch = fifaCalendarMatch({
    matchTime: "97'",
    secondHalfExtraTime: 10,
    statusName: "Second half"
  });
  currentFifaLiveFootballMatch = fifaLiveFootballMatch();
  const addedTimeFixture = await getLiveFixture(handler);

  assert.equal(addedTimeFixture.status, "LIVE");
  assert.equal(addedTimeFixture.officialMatchTime, "97'");
  assert.equal(addedTimeFixture.officialMatchAddedTime, 10);
  assert.ok(addedTimeFixture.officialMatchTimeUpdatedAt);

  currentFifaCalendarMatch = fifaCalendarMatch({
    matchTime: "110'",
    secondHalfExtraTime: 10,
    statusName: "Extra time"
  });
  currentFifaLiveFootballMatch = fifaLiveFootballMatch();
  const extraTimeFixture = await getLiveFixture(handler);

  assert.equal(extraTimeFixture.status, "LIVE");
  assert.equal(extraTimeFixture.officialMatchPhase, "Extra time");
  assert.equal(extraTimeFixture.officialMatchTime, "110'");
  assert.equal(extraTimeFixture.officialMatchAddedTime, undefined);
  assert.ok(extraTimeFixture.officialMatchTimeUpdatedAt);

  currentFifaCalendarMatch = fifaCalendarMatch({
    matchTime: "118'",
    secondHalfExtraTime: 10
  });
  currentFifaLiveFootballMatch = fifaLiveFootballMatch({
    matchTime: "118'",
    period: 9,
    secondHalfExtraTime: 10
  });
  const periodExtraTimeFixture = await getLiveFixture(handler);

  assert.equal(periodExtraTimeFixture.status, "LIVE");
  assert.equal(periodExtraTimeFixture.officialMatchPhase, "Extra time");
  assert.equal(periodExtraTimeFixture.officialMatchTime, "118'");
  assert.equal(periodExtraTimeFixture.officialMatchAddedTime, undefined);
  assert.ok(periodExtraTimeFixture.officialMatchTimeUpdatedAt);

  currentFifaCalendarMatch = fifaCalendarMatch();
  currentFifaLiveFootballMatch = fifaLiveFootballMatch({ period: 16 });
  const periodPenaltyFixture = await getLiveFixture(handler);

  assert.equal(periodPenaltyFixture.status, "LIVE");
  assert.equal(periodPenaltyFixture.officialMatchPhase, "Penalty shootout");
  assert.equal(periodPenaltyFixture.officialMatchTime, undefined);
  assert.equal(periodPenaltyFixture.officialMatchAddedTime, undefined);
  assert.ok(periodPenaltyFixture.officialMatchTimeUpdatedAt);

  assert(fetchHits.footballData >= 2);
  assert(fetchHits.fifaCalendar >= 6);
  assert(fetchHits.liveFootball >= 4);

  console.log("Live match phase smoke passed: FIFA Period fills half-time without wall-clock guessing.");
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
