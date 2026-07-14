import { resolvePredictionAuditRevision } from "../lineup-prediction-history.mjs";

export function mergeFrozenDelayedPredictions({
  auditDocument,
  document,
  expectedLineupsAuditData,
  expectedLineupsData,
  externalSourceIds = [],
  frozenDelayedRecords = [],
  predictionRevisionLedgerData,
  targetFixtureCount = 0
}) {
  if (!frozenDelayedRecords.length) return { auditDocument, document };

  const frozenAuditRevision = resolvePredictionAuditRevision({
    auditData: expectedLineupsAuditData,
    expectedLineupsData,
    revisionLedgerData: predictionRevisionLedgerData
  });
  if (!frozenAuditRevision) {
    throw new Error("Cannot preserve delayed predictions without their exact immutable audit revision");
  }

  const frozenFixtureIds = new Set(frozenDelayedRecords.map((record) => record.fixtureId));
  const frozenAuditFixtures = (frozenAuditRevision.fixtures || [])
    .filter((record) => frozenFixtureIds.has(record.fixture?.id || record.prediction?.fixtureId));
  if (frozenAuditFixtures.length !== frozenFixtureIds.size) {
    throw new Error("Delayed prediction audit revision is missing fixture candidate evidence");
  }

  document.fixtures.push(...structuredClone(frozenDelayedRecords));
  auditDocument.fixtures.push(...structuredClone(frozenAuditFixtures));
  const externalSourceIdSet = new Set(externalSourceIds);
  const retainedSources = [
    ...(expectedLineupsData.sources || []),
    ...(frozenAuditRevision.sources || [])
  ].filter((source) => source?.id && !externalSourceIdSet.has(source.id));
  document.sources = [...new Map(
    [...(document.sources || []), ...retainedSources].map((source) => [source.id, source])
  ).values()];
  document.run.fixtureCount = document.fixtures.length;
  document.run.skippedFixtureCount = Math.max(0, targetFixtureCount - document.fixtures.length);

  return { auditDocument, document };
}
