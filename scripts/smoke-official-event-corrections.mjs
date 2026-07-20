#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  applyEventCorrectionsToFixtureMatchEvents,
  applyEventCorrectionsToLineup
} from "./official-event-corrections.mjs";

const correction = {
  checkedAt: "2026-07-20T00:33:46.000Z",
  sourceIds: ["reviewed-final-report"],
  home: {
    substitutions: [{ offName: "Starter One", onName: "Sub One", minute: "ET" }]
  },
  away: {
    cards: [{ playerName: "Player Two", type: "red", minute: "90+3" }]
  }
};

const lineup = {
  sourceIds: ["official-team-sheet"],
  checkedAt: "2026-07-19T23:00:00.000Z",
  home: {
    events: {
      cards: [],
      staffCards: [],
      substitutions: [{ offName: "Starter Zero", onName: "Sub Zero", minute: 80 }]
    }
  },
  away: {
    events: { cards: [], staffCards: [], substitutions: [] }
  }
};

const matchEvents = {
  sourceIds: ["official-timeline"],
  checkedAt: "2026-07-19T23:00:00.000Z",
  home: { cards: [], substitutions: [{ offName: "Starter Zero", onName: "Sub Zero", minute: 80 }] },
  away: { cards: [], substitutions: [] }
};

const correctedLineup = applyEventCorrectionsToLineup(lineup, correction);
const correctedMatchEvents = applyEventCorrectionsToFixtureMatchEvents(matchEvents, correction);

assert.deepEqual(correctedLineup.sourceIds, ["official-team-sheet", "reviewed-final-report"]);
assert.equal(correctedLineup.checkedAt, correction.checkedAt);
assert.deepEqual(correctedLineup.home.events.substitutions.map((event) => event.minute), [80, "ET"]);
assert.equal(correctedLineup.away.events.cards[0].playerName, "Player Two");
assert.equal(correctedMatchEvents.away.cards[0].side, "away");
assert.equal(correctedMatchEvents.home.substitutions[1].side, "home");

// Corrections must be deterministic and idempotent so repeated provider syncs cannot duplicate facts.
assert.deepEqual(applyEventCorrectionsToLineup(correctedLineup, correction), correctedLineup);
assert.deepEqual(applyEventCorrectionsToFixtureMatchEvents(correctedMatchEvents, correction), correctedMatchEvents);
assert.equal(lineup.home.events.substitutions.length, 1, "The input lineup must remain immutable.");
assert.equal(matchEvents.away.cards.length, 0, "The input fixture events must remain immutable.");

console.log("Official event correction smoke passed: provenance, ordering, immutability, and idempotence are preserved.");
