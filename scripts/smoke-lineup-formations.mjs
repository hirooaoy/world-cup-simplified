#!/usr/bin/env node
import assert from "node:assert/strict";
import { runLineupPredictionEngine } from "./lineup-prediction-engine/engine.mjs";
import {
  formationLayoutMatchesPlayers,
  getFormationDisplayPositions,
  resolveFormationLayout
} from "./lineup-prediction-engine/formations.mjs";
import { createPredictionSource } from "./lineup-prediction-engine/model.mjs";
import { compactPredictionDocumentForBrowser } from "./lineup-prediction-engine/output.mjs";
import { validatePredictionDocument } from "./lineup-prediction-engine/validation.mjs";

const generatedAt = "2026-07-14T18:00:00.000Z";
const sourceIds = ["formation-smoke-a", "formation-smoke-b"];
const sources = sourceIds.map((id, index) => createPredictionSource({
  id,
  label: `Formation smoke source ${index + 1}`,
  checkedAt: generatedAt,
  type: "lineup-prediction-smoke"
}));

function starter(teamId, index, position, sourceId) {
  return {
    name: `${teamId} Player ${index + 1}`,
    number: String(index + 1),
    position,
    confidence: { score: 0.84 },
    sourceIds: [sourceId]
  };
}

function side(teamId, formation, positions, sourceId) {
  return {
    teamId,
    formation,
    starters: positions.map((position, index) => starter(teamId, index, position, sourceId)),
    benchCandidates: [],
    sourceIds: [sourceId]
  };
}

function candidate(fixture, sourceId, homeFormation, homePositions, awayFormation, awayPositions) {
  return {
    fixtureId: fixture.id,
    providerId: "formation-smoke-provider",
    updatedAt: generatedAt,
    confidence: { score: 0.84 },
    sourceIds: [sourceId],
    sides: {
      home: side(fixture.homeTeamId, homeFormation, homePositions, sourceId),
      away: side(fixture.awayTeamId, awayFormation, awayPositions, sourceId)
    }
  };
}

async function predict(fixture, homeFormation, homePositions, awayFormation, awayPositions) {
  const provider = {
    id: "formation-smoke-provider",
    label: "Formation smoke provider",
    version: "1",
    async collect() { return {}; },
    async normalize() {
      return sourceIds.map((sourceId) =>
        candidate(fixture, sourceId, homeFormation, homePositions, awayFormation, awayPositions)
      );
    }
  };
  return runLineupPredictionEngine({
    context: {},
    generatedAt,
    providers: [provider],
    sources,
    targetFixtures: [fixture],
    options: {
      sourceIndependenceKeys: Object.fromEntries(sourceIds.map((sourceId) => [sourceId, sourceId]))
    }
  });
}

const fourTwoTwoTwo = resolveFormationLayout("4-2-2-2");
assert.equal(fourTwoTwoTwo.resolution, "known-layout");
assert.deepEqual(getFormationDisplayPositions("4-2-2-2"), [
  "GK", "RB", "CB", "CB", "LB", "CM", "CM", "AM", "AM", "ST", "ST"
]);
const threeFourTwoOne = resolveFormationLayout("3-4-2-1");
assert.equal(threeFourTwoOne.resolution, "known-layout");
assert.deepEqual(getFormationDisplayPositions("3-4-2-1"), [
  "GK", "RCB", "CB", "LCB", "RM", "CM", "CM", "LM", "AM", "AM", "ST"
]);

const parsed = resolveFormationLayout("4–4–1–1");
assert.equal(parsed.formation, "4-4-1-1", "Unicode separators should normalize deterministically");
assert.equal(parsed.resolution, "deterministic-parsed-layout");
assert.match(parsed.caveat, /exact player placement remains inferred/);
assert.equal(resolveFormationLayout("4231").formation, "4-2-3-1", "Compact numeric labels should normalize");
assert.deepEqual(
  getFormationDisplayPositions("4-1-2-1-2"),
  ["GK", "RB", "CB", "CB", "LB", "DM", "CM", "CM", "AM", "ST", "ST"],
  "Five-line formations should use the same deterministic parser instead of a silent default grid"
);

const shapedFixture = {
  id: "fixture-formation-shapes",
  kickoffUtc: "2026-07-15T18:00:00.000Z",
  status: "SCHEDULED",
  homeTeamId: "F22",
  awayTeamId: "F32"
};
const shaped = await predict(
  shapedFixture,
  "4-2-2-2",
  ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "AM", "AM", "ST", "ST"],
  "3-4-2-1",
  ["GK", "CB", "CB", "CB", "RM", "CM", "CM", "LM", "AM", "AM", "ST"]
);
const shapedRecord = shaped.document.fixtures[0];
assert.equal(shapedRecord.lineup.home.formation, "4-2-2-2");
assert.equal(shapedRecord.lineup.away.formation, "3-4-2-1");
assert(formationLayoutMatchesPlayers("4-2-2-2", shapedRecord.lineup.home.players));
assert(formationLayoutMatchesPlayers("3-4-2-1", shapedRecord.lineup.away.players));
assert.deepEqual(
  shapedRecord.lineup.home.players.filter((player) => player.position === "AM").map((player) => player.x),
  [66, 34]
);
assert.deepEqual(
  shapedRecord.lineup.away.players.filter((player) => player.position === "AM").map((player) => player.x),
  [62, 38]
);

const malformedFixture = {
  ...shapedFixture,
  id: "fixture-malformed-formation",
  homeTeamId: "BAD",
  awayTeamId: "STD"
};
const fourTwoThreeOnePositions = ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "RW", "AM", "LW", "ST"];
const malformed = await predict(
  malformedFixture,
  "4-x-5",
  fourTwoThreeOnePositions,
  "4-2-3-1",
  fourTwoThreeOnePositions
);
const malformedRecord = malformed.document.fixtures[0];
assert.equal(
  malformedRecord.lineup.home.formation,
  "4-2-3-1",
  "An unsupported source label must not survive on a borrowed fallback grid"
);
assert.equal(malformedRecord.evidence.home.formationResolution.requestedFormation, "4-x-5");
assert.equal(malformedRecord.evidence.home.formationResolution.method, "normalized-fallback");
assert.match(malformedRecord.evidence.home.formationResolution.caveat, /displayed label matches its role grid/);

const browserDocument = compactPredictionDocumentForBrowser({
  ...shaped.document,
  fixtures: [...shaped.document.fixtures, malformedRecord]
});
assert.equal(
  browserDocument.fixtures[1].evidence.home.formationResolution.method,
  "normalized-fallback",
  "Browser output must retain the formation-normalization provenance"
);
validatePredictionDocument(browserDocument, {
  fixtures: [shapedFixture, malformedFixture],
  now: generatedAt
});

const mislabeledDocument = structuredClone(browserDocument);
mislabeledDocument.fixtures[0].lineup.home.formation = "4-2-3-1";
assert.throws(
  () => validatePredictionDocument(mislabeledDocument, {
    fixtures: [shapedFixture, malformedFixture],
    now: generatedAt
  }),
  /positions do not match|roles\/coordinates do not match/,
  "Validation must reject a formation label whose public roles or grid do not match"
);

console.log("Lineup formation smoke passed: 4-2-2-2, 3-4-2-1, parsed shapes, honest fallback, and shared validation covered.");
