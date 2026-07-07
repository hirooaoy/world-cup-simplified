#!/usr/bin/env node
import assert from "node:assert/strict";
import { runLineupPredictionEngine } from "./lineup-prediction-engine/engine.mjs";
import { createPredictionSource } from "./lineup-prediction-engine/model.mjs";
import { validatePredictionDocument } from "./lineup-prediction-engine/validation.mjs";

const generatedAt = "2026-07-07T18:30:00.000Z";
const source = createPredictionSource({
  id: "lineup-prediction-smoke-source",
  label: "Lineup prediction smoke source",
  type: "lineup-prediction-smoke",
  checkedAt: generatedAt,
  note: "Synthetic provider source used by smoke tests."
});
const sourceTwo = createPredictionSource({
  id: "lineup-prediction-smoke-source-two",
  label: "Lineup prediction smoke source two",
  type: "lineup-prediction-smoke",
  checkedAt: generatedAt,
  note: "Second independent synthetic provider source used by smoke tests."
});

function player(index, name, position, sourceId = source.id) {
  return {
    name,
    number: String(index + 1),
    position,
    confidence: { score: 0.82 },
    sourceIds: [sourceId]
  };
}

function side(teamId, names, sourceId = source.id) {
  const positions = ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "RW", "AM", "LW", "ST"];
  return {
    teamId,
    formation: "4-2-3-1",
    starters: names.map((name, index) => player(index, name, positions[index], sourceId)),
    benchCandidates: [
      player(11, `${teamId} Bench One`, "ST", sourceId),
      player(12, `${teamId} Bench Two`, "CM", sourceId)
    ],
    sourceIds: [sourceId],
    notes: ["Synthetic provider candidate"]
  };
}

function fixtureCandidate(sourceId, providerId = "smoke-provider") {
  return {
    providerId,
    fixtureId: "fixture-smoke",
    updatedAt: generatedAt,
    confidence: { score: 0.82 },
    sourceIds: [sourceId],
    sides: {
      home: side("HOM", [
        "Home Keeper",
        "Home Right Back",
        "Home Right Center Back",
        "Home Left Center Back",
        "Home Left Back",
        "Home Midfielder One",
        "Home Midfielder Two",
        "Home Right Wing",
        "Home Attacking Midfielder",
        "Home Left Wing",
        "Home Striker"
      ], sourceId),
      away: side("AWY", [
        "Away Keeper",
        "Away Right Back",
        "Away Right Center Back",
        "Away Left Center Back",
        "Away Left Back",
        "Away Midfielder One",
        "Away Midfielder Two",
        "Away Right Wing",
        "Away Attacking Midfielder",
        "Away Left Wing",
        "Away Striker"
      ], sourceId)
    }
  };
}

const provider = {
  id: "smoke-provider",
  label: "Smoke provider",
  version: "1",
  async collect() {
    return { fixtureIds: ["fixture-smoke"] };
  },
  async normalize() {
    return [
      fixtureCandidate(source.id),
      fixtureCandidate(sourceTwo.id)
    ];
  }
};

const { document } = await runLineupPredictionEngine({
  context: {},
  generatedAt,
  options: {
    sourceIndependenceKeys: {
      [source.id]: "smoke-one",
      [sourceTwo.id]: "smoke-two"
    }
  },
  providers: [provider],
  sources: [source, sourceTwo],
  targetFixtures: [{ id: "fixture-smoke" }]
});

validatePredictionDocument(document, { now: "2026-07-07T19:00:00.000Z" });
assert.equal(document.fixtures.length, 1);
assert.equal(document.fixtures[0].lineup.home.players.length, 11);
assert.equal(document.fixtures[0].lineup.away.players.length, 11);
assert(document.fixtures[0].lineup.confidence.score >= 0.75);
assert.equal(document.fixtures[0].lineup.confidence.label, "high");

const localOnlyProvider = {
  id: "local-official-history",
  label: "Local-only smoke provider",
  version: "1",
  async collect() {
    return { fixtureIds: ["fixture-smoke"] };
  },
  async normalize() {
    return [fixtureCandidate(source.id, "local-official-history")];
  }
};
const localOnlyResult = await runLineupPredictionEngine({
  context: {},
  generatedAt,
  providers: [localOnlyProvider],
  sources: [source],
  targetFixtures: [{ id: "fixture-smoke" }]
});
assert(localOnlyResult.document.fixtures[0].lineup.confidence.score < 0.75);
assert.equal(localOnlyResult.document.fixtures[0].lineup.confidence.label, "medium");

const malformedDocument = structuredClone(document);
malformedDocument.fixtures[0].lineup.home.players.pop();
assert.throws(
  () => validatePredictionDocument(malformedDocument, { now: "2026-07-07T19:00:00.000Z" }),
  /exactly 11 starters/
);

const staleDocument = structuredClone(document);
staleDocument.generatedAt = "2026-07-01T18:30:00.000Z";
assert.throws(
  () => validatePredictionDocument(staleDocument, { now: "2026-07-07T19:00:00.000Z" }),
  /stale/
);

console.log("Lineup prediction engine smoke passed: output, confidence caps, malformed, and stale cases covered.");
