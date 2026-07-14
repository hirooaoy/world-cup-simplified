#!/usr/bin/env node
import assert from "node:assert/strict";
import { archiveCompletedExpectedLineups } from "./lineup-prediction-history.mjs";

const capturedAt = "2026-07-14T12:00:00.000Z";
const player = (name, index) => ({
  name,
  number: String(index + 1),
  position: index === 0 ? "GK" : "CM",
  x: 50,
  y: 90 - index * 6,
  confidence: { label: "medium", score: 0.7 }
});
const side = (prefix) => ({
  formation: "4-2-3-1",
  players: Array.from({ length: 11 }, (_, index) => player(`${prefix} ${index + 1}`, index))
});
const expectedLineupsData = {
  generatedAt: "2026-07-14T10:00:00.000Z",
  sources: [],
  fixtures: [
    {
      fixtureId: "fixture-complete",
      mode: "expected",
      lineup: { home: side("Home"), away: side("Away") }
    },
    {
      fixtureId: "fixture-scheduled",
      mode: "expected",
      lineup: { home: side("Future Home"), away: side("Future Away") }
    }
  ]
};
const fixturesData = {
  fixtures: [
    {
      id: "fixture-complete",
      kickoffUtc: "2026-07-14T11:00:00.000Z",
      status: "FT",
      homeTeamId: "HOM",
      awayTeamId: "AWY"
    },
    {
      id: "fixture-scheduled",
      kickoffUtc: "2026-07-15T11:00:00.000Z",
      status: "SCHEDULED",
      homeTeamId: "FHM",
      awayTeamId: "FAW"
    }
  ]
};

const first = archiveCompletedExpectedLineups({
  historyData: { schemaVersion: "1.0", updatedAt: capturedAt, fixtures: [] },
  expectedLineupsData,
  fixturesData,
  capturedAt
});
assert.equal(first.archivedCount, 1);
assert.equal(first.historyData.fixtures.length, 1);
assert.equal(first.historyData.fixtures[0].fixtureId, "fixture-complete");
assert.equal(first.historyData.fixtures[0].home.starters.length, 11);

const repeated = archiveCompletedExpectedLineups({
  historyData: first.historyData,
  expectedLineupsData,
  fixturesData,
  capturedAt
});
assert.equal(repeated.archivedCount, 0);
assert.equal(repeated.historyData.fixtures.length, 1);

console.log("Lineup prediction history smoke passed: completed predictions archive once; scheduled predictions stay live.");

