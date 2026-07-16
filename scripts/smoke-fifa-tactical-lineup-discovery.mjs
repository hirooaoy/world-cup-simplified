#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildFifaTacticalLineupUrl,
  getFifaTacticalRegistrationCandidates,
  recordFifaTacticalDocument,
  recordFifaTacticalRegistration,
  validateFifaTacticalLineupIndex
} from "./fifa-tactical-lineup-discovery.mjs";
import {
  canAutoApplyFifaTacticalDocument,
  fifaTacticalVersionDecision
} from "./fifa-tactical-lineup-document-policy.mjs";

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

const versionedIndex = {
  schemaVersion: "1.0",
  updatedAt: "2026-07-15T17:41:37.000Z",
  competitionEditionId: "281",
  minimumRegistrationId: 12549,
  maximumKnownRegistrationId: 12549,
  registrationsByMatchNumber: { "102": 12549 },
  documents: {}
};
const commonDocument = {
  fixtureId: "match-102",
  matchNumber: 102,
  registrationId: 12549,
  url: buildFifaTacticalLineupUrl({ competitionEditionId: "281", registrationId: 12549 })
};
recordFifaTacticalDocument(versionedIndex, {
  ...commonDocument,
  version: 1,
  publishedAt: "2026-07-15T17:41:00.000Z",
  sha256: "a".repeat(64)
});
recordFifaTacticalDocument(versionedIndex, {
  ...commonDocument,
  version: 2,
  publishedAt: "2026-07-15T19:29:00.000Z",
  sha256: "b".repeat(64)
});
assert.equal(versionedIndex.documents["102"].version, 2);
assert.deepEqual(
  versionedIndex.documents["102"].history.map(({ version, sha256 }) => ({ version, sha256 })),
  [{ version: 1, sha256: "a".repeat(64) }],
  "Selecting FIFA's observed update must retain the superseded nominal document."
);
assert.deepEqual(validateFifaTacticalLineupIndex(versionedIndex), []);

const kickoffMs = Date.parse("2026-07-19T19:00:00.000Z");
assert.equal(
  canAutoApplyFifaTacticalDocument({
    publishedAt: "2026-07-19T17:40:00.000Z",
    kickoffMs,
    layoutPerspective: "nominal"
  }),
  true,
  "The latest nominal FIFA board should apply before kickoff."
);
assert.equal(
  canAutoApplyFifaTacticalDocument({
    publishedAt: "2026-07-19T19:20:00.000Z",
    kickoffMs,
    layoutPerspective: "observed"
  }),
  true,
  "FIFA's marked post-observation update should replace the nominal board."
);
assert.equal(
  canAutoApplyFifaTacticalDocument({
    publishedAt: "2026-07-19T19:20:00.000Z",
    kickoffMs,
    layoutPerspective: "nominal"
  }),
  false,
  "An unmarked post-kickoff document must not replace a trusted board automatically."
);
assert.deepEqual(
  fifaTacticalVersionDecision({
    parsed: { version: 2, sha256: "b".repeat(64) },
    existingSource: { documentVersion: 1, sha256: "a".repeat(64) }
  }),
  { action: "accept", reason: "" }
);
assert.equal(
  fifaTacticalVersionDecision({
    parsed: { version: 2, sha256: "c".repeat(64) },
    existingSource: { documentVersion: 2, sha256: "b".repeat(64) }
  }).action,
  "reject",
  "FIFA content must not mutate silently without a document-version increase."
);

console.log("FIFA tactical document discovery smoke passed: cached mappings and bounded gap scans are deterministic.");
