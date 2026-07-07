#!/usr/bin/env node
import assert from "node:assert/strict";
import { buildFifaLineupsFromLiveMatch } from "./fifa-live-lineup-parser.mjs";
import { applyLineupLayoutOverride, compareLineupsToLayoutOverride } from "./lineup-layout-overrides.mjs";
import {
  DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE,
  getLineupLayoutStatus,
  normalizeLayoutSource,
  VERIFIED_LAYOUT_SOURCE
} from "./lineup-layout-sources.mjs";

const checkedAt = "2026-07-07T18:00:00.000Z";

function localized(value) {
  return [{ Locale: "en-GB", Description: value }];
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

function side(baseId, names) {
  return {
    Tactics: "4-3-3",
    Players: [
      player(baseId, names[0], 1, 0),
      player(baseId + 1, names[1], 2, 1),
      player(baseId + 2, names[2], 3, 1),
      player(baseId + 3, names[3], 4, 1),
      player(baseId + 4, names[4], 5, 1),
      player(baseId + 5, names[5], 6, 2),
      player(baseId + 6, names[6], 7, 2),
      player(baseId + 7, names[7], 8, 2),
      player(baseId + 8, names[8], 9, 3),
      player(baseId + 9, names[9], 10, 3),
      player(baseId + 10, names[10], 11, 3),
      player(baseId + 11, `${names[0]} Bench`, 12, 0, 2)
    ],
    Coaches: [],
    Bookings: [],
    Substitutions: []
  };
}

const fixture = {
  id: "match-layout-smoke",
  homeTeamId: "AAA",
  awayTeamId: "BBB",
  providerIds: { fifa: { matchId: "400000000", stageId: "108852" } }
};

const liveMatch = {
  IdCompetition: "17",
  IdSeason: "285023",
  IdStage: "108852",
  IdMatch: "400000000",
  HomeTeam: side(100, [
    "Home Keeper",
    "Home Right Back",
    "Home Centre Back One",
    "Home Centre Back Two",
    "Home Left Back",
    "Home Mid One",
    "Home Mid Two",
    "Home Mid Three",
    "Home Right Wing",
    "Home Striker",
    "Home Left Wing"
  ]),
  AwayTeam: side(200, [
    "Away Keeper",
    "Away Right Back",
    "Away Centre Back One",
    "Away Centre Back Two",
    "Away Left Back",
    "Away Mid One",
    "Away Mid Two",
    "Away Mid Three",
    "Away Right Wing",
    "Away Striker",
    "Away Left Wing"
  ])
};

const lineups = buildFifaLineupsFromLiveMatch({
  checkedAt,
  fixture,
  liveMatch,
  teamsById: new Map([
    ["AAA", { id: "AAA", name: "Home" }],
    ["BBB", { id: "BBB", name: "Away" }]
  ]),
  profileLookup: null,
  sourceIds: ["fifa-lineups-live-smoke"],
  sourceUrl: "https://www.fifa.com/en/match-centre/match/17/285023/108852/400000000",
  mode: "live"
});

assert.equal(lineups.layoutSource, DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE);
assert.equal(lineups.layoutVerification.status, "unverified");
assert.equal(lineups.layoutVerification.exact, false);
assert.equal(getLineupLayoutStatus(lineups).provisional, true);
assert.equal(getLineupLayoutStatus(lineups).exact, false);
assert.equal(normalizeLayoutSource("editorial-verified"), VERIFIED_LAYOUT_SOURCE);

const override = {
  status: "verified",
  layoutSource: "editorial-verified",
  checkedAt,
  sourceIds: ["lineup-layout-verification-smoke"],
  sources: [
    {
      name: "Smoke verified board",
      url: "https://example.com/verified-lineup",
      status: "matched",
      exactLayout: true
    }
  ],
  note: "Smoke override confirms exact pitch layout.",
  home: {
    formation: lineups.home.formation,
    players: lineups.home.players.map((player) => ({ ...player }))
  },
  away: {
    formation: lineups.away.formation,
    players: lineups.away.players.map((player) => ({ ...player }))
  }
};

const verifiedLineups = applyLineupLayoutOverride(lineups, override);
assert.equal(verifiedLineups.layoutSource, VERIFIED_LAYOUT_SOURCE);
assert.equal(verifiedLineups.layoutVerification.status, "verified");
assert.equal(getLineupLayoutStatus(verifiedLineups).provisional, false);
assert.equal(getLineupLayoutStatus(verifiedLineups).exact, true);
assert.deepEqual(compareLineupsToLayoutOverride(verifiedLineups, override), []);

console.log("Lineup layout source smoke passed: derived layouts stay unverified until an exact override is applied.");
