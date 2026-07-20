#!/usr/bin/env node
import assert from "node:assert/strict";
import { evaluateEditionLifecycle } from "./tournament-edition-window.mjs";

const lifecycle = {
  edition: 2030,
  state: "live",
  tournamentStartsAt: "2030-06-08T00:00:00.000Z",
  liveSyncEndsAt: "2030-07-22T00:00:00.000Z",
  archiveEligibleAfter: "2030-07-22T00:00:00.000Z"
};

assert.equal(
  evaluateEditionLifecycle(lifecycle, "2030-06-07T23:59:59.999Z").active,
  false,
  "sync must stay closed before the edition begins"
);
assert.equal(
  evaluateEditionLifecycle(lifecycle, lifecycle.tournamentStartsAt).active,
  true,
  "sync must open at the start boundary"
);
assert.equal(
  evaluateEditionLifecycle(lifecycle, "2030-07-21T23:59:59.999Z").active,
  true,
  "sync must remain open immediately before the end boundary"
);
const endBoundary = evaluateEditionLifecycle(lifecycle, lifecycle.liveSyncEndsAt);
assert.equal(endBoundary.active, false, "sync must close at the archive boundary");
assert.equal(endBoundary.archiveEligible, true, "archive eligibility may begin at the closed boundary");

assert.equal(
  evaluateEditionLifecycle({ ...lifecycle, state: "review" }, "2030-07-01T00:00:00.000Z").active,
  false,
  "review state must close recurring sync even inside the timestamp window"
);
assert.equal(
  evaluateEditionLifecycle({ ...lifecycle, state: "archived" }, "2030-07-01T00:00:00.000Z").active,
  false,
  "archived state must close recurring sync even inside the timestamp window"
);

assert.throws(
  () => evaluateEditionLifecycle({ ...lifecycle, edition: "next" }, lifecycle.tournamentStartsAt),
  /valid edition year/
);
assert.throws(
  () => evaluateEditionLifecycle({ ...lifecycle, liveSyncEndsAt: lifecycle.tournamentStartsAt }, lifecycle.tournamentStartsAt),
  /must end after it starts/
);
assert.throws(
  () => evaluateEditionLifecycle({ ...lifecycle, archiveEligibleAfter: "2030-07-21T00:00:00.000Z" }, lifecycle.tournamentStartsAt),
  /before live synchronization closes/
);

console.log("Edition lifecycle smoke passed: edition-neutral validation, half-open sync boundaries, archive handoff, and closed review/archive states.");
