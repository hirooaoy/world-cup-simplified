#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildFifaTacticalLineupUrl,
  getFifaTacticalRegistrationCandidates,
  recordFifaTacticalRegistration,
  validateFifaTacticalLineupIndex
} from "./fifa-tactical-lineup-discovery.mjs";

const index = {
  schemaVersion: "1.0",
  updatedAt: "2026-07-15T17:41:37.000Z",
  competitionEditionId: "281",
  minimumRegistrationId: 12548,
  maximumKnownRegistrationId: 12550,
  lookaheadRegistrationCount: 4,
  extendedLookaheadRegistrationCount: 12,
  registrationsByMatchNumber: {
    "99": 12548,
    "101": 12550,
    "102": 12549
  }
};

assert.deepEqual(validateFifaTacticalLineupIndex(index), []);
assert.equal(
  buildFifaTacticalLineupUrl({ competitionEditionId: "281", registrationId: 12549 }),
  "https://fdp.fifa.org/assetspublic/ce281/r12549/pdf/TacticalLineup-English.pdf"
);
assert.deepEqual(
  getFifaTacticalRegistrationCandidates(index, 103, { probeBatchOffset: 0 }),
  [12551, 12552, 12553, 12554, 12555, 12556, 12557, 12558],
  "Unmapped future matches should retry the immediate frontier and one bounded sweep batch."
);
assert.deepEqual(
  getFifaTacticalRegistrationCandidates(index, 103, { probeBatchOffset: 1 }),
  [12551, 12552, 12553, 12554, 12559, 12560, 12561, 12562],
  "The extended sweep should rotate without persisting temporal 404s as terminal state."
);

const indexWithGap = structuredClone(index);
delete indexWithGap.registrationsByMatchNumber["102"];
assert.deepEqual(
  getFifaTacticalRegistrationCandidates(indexWithGap, 103, { probeBatchOffset: 0 }),
  [12549, 12551, 12552, 12553, 12554, 12555, 12556, 12557, 12558],
  "Unresolved gaps must be retried because registration ids do not follow match order."
);

assert.equal(
  recordFifaTacticalRegistration(index, { matchNumber: 103, registrationId: 12552 }),
  true
);
assert.equal(
  getFifaTacticalRegistrationCandidates(index, 103)[0],
  12552,
  "A discovered direct mapping must be checked before scanning unresolved candidates."
);
assert.throws(
  () => recordFifaTacticalRegistration(index, { matchNumber: 104, registrationId: 12552 }),
  /already mapped/,
  "A registration id must never be silently reassigned to another match."
);

const invalidDocumentIndex = structuredClone(index);
invalidDocumentIndex.documents = {
  "102": {
    fixtureId: "match-102",
    registrationId: 12549,
    url: "https://example.com/not-fifa.pdf",
    version: 1,
    publishedAt: "2026-07-15T17:41:37.000Z",
    sha256: "cda8da4f98a5a9493b526b49558ab3d39e494b5647d5a703f00b19fa232a8f83"
  }
};
assert(
  validateFifaTacticalLineupIndex(invalidDocumentIndex).some((issue) => issue.includes("canonical official")),
  "Stored tactical documents must retain their canonical FIFA URL."
);

console.log("FIFA tactical document discovery smoke passed: cached mappings and bounded gap scans are deterministic.");
