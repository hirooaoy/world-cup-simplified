const PRE_MATCH_STATUSES = new Set(["SCHEDULED", "DELAYED"]);

function assertPreKickoffPrediction(expectedLineupsData, fixture, record = null) {
  const generatedAt = Date.parse(record?.lastUpdated || expectedLineupsData?.generatedAt || "");
  const kickoffAt = Date.parse(fixture?.kickoffUtc || "");

  if (!Number.isFinite(generatedAt) || !Number.isFinite(kickoffAt) || generatedAt >= kickoffAt) {
    throw new Error(`${fixture?.id || "Unknown fixture"} prediction was not generated before kickoff`);
  }
}

function collectReferencedSourceIds(value, target = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectReferencedSourceIds(item, target);
    }
    return target;
  }
  if (!value || typeof value !== "object") {
    return target;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (key === "sourceId" && typeof entry === "string" && entry.trim()) {
      target.add(entry.trim());
      continue;
    }
    if (key === "sourceIds" && Array.isArray(entry)) {
      for (const sourceId of entry) {
        if (typeof sourceId === "string" && sourceId.trim()) {
          target.add(sourceId.trim());
        }
      }
      continue;
    }
    collectReferencedSourceIds(entry, target);
  }

  return target;
}

function predictionAuditMatchesExpected(auditDocument, expectedLineupsData) {
  if (!auditDocument?.revisionId || !expectedLineupsData?.engine) {
    return false;
  }

  const expectedEngine = expectedLineupsData.engine;
  const auditEngine = auditDocument.engine || {};
  if (expectedEngine.revisionId) {
    return auditDocument.revisionId === expectedEngine.revisionId;
  }

  if (expectedEngine.inputFingerprint && expectedEngine.modelFingerprint) {
    return (
      auditEngine.inputFingerprint === expectedEngine.inputFingerprint &&
      auditEngine.modelFingerprint === expectedEngine.modelFingerprint
    );
  }

  return (
    auditDocument.generatedAt === expectedLineupsData.generatedAt &&
    auditEngine.runId === expectedEngine.runId
  );
}

export function resolvePredictionAuditRevision({ auditData, expectedLineupsData, revisionLedgerData }) {
  const revisions = [
    auditData,
    ...(Array.isArray(revisionLedgerData?.revisions) ? revisionLedgerData.revisions : [])
  ].filter(Boolean);

  return revisions.find((revision) =>
    predictionAuditMatchesExpected(revision, expectedLineupsData)
  ) || null;
}

export function getExpectedLineupTransitionFixtureIds({ expectedLineupsData, fixturesData }) {
  const fixturesById = new Map((fixturesData?.fixtures || []).map((fixture) => [fixture.id, fixture]));

  return (expectedLineupsData?.fixtures || [])
    .map((record) => fixturesById.get(record?.fixtureId))
    .filter((fixture) => fixture && !PRE_MATCH_STATUSES.has(fixture.status))
    .map((fixture) => fixture.id);
}

function compactPlayer(player = {}) {
  return {
    name: player.name || "",
    number: String(player.number || ""),
    position: player.position || "",
    x: Number(player.x),
    y: Number(player.y),
    confidence: player.confidence || null,
    sourceIds: player.sourceIds || [],
    evidence: player.evidence || [],
    notes: player.notes || []
  };
}

function compactSide(side = {}, teamId = "") {
  return {
    teamId,
    formation: side.formation || "",
    starters: (side.players || []).map(compactPlayer),
    bench: (side.bench || []).map(compactPlayer),
    sourceIds: side.sourceIds || [],
    evidence: side.evidence || null
  };
}

function relevantSources(expectedLineupsData, record, externalSources = []) {
  const sourceIds = new Set(record.sourceIds || record.lineup?.sourceIds || []);
  const sourcesById = new Map(
    [...externalSources, ...(expectedLineupsData.sources || [])]
      .filter((source) => source?.id)
      .map((source) => [source.id, source])
  );
  return [...sourcesById.values()]
    .filter((source) => sourceIds.has(source.id))
    .map((source) => ({
      id: source.id,
      label: source.label,
      type: source.type,
      checkedAt: source.checkedAt,
      ...(source.sourceRole ? { sourceRole: source.sourceRole } : {}),
      ...(source.suppliesLineup ? { suppliesLineup: true } : {}),
      ...(source.url ? { url: source.url } : {}),
      ...(source.note ? { note: source.note } : {})
    }));
}

export function createPredictionHistoryRecord({
  expectedLineupsData,
  fixture,
  record,
  capturedAt,
  captureMethod,
  externalSources = [],
  revisionId = "",
  snapshotRef = ""
}) {
  return {
    fixtureId: fixture.id,
    kickoffUtc: fixture.kickoffUtc,
    capturedAt,
    predictionGeneratedAt: record.lastUpdated || expectedLineupsData.generatedAt,
    captureMethod,
    ...(revisionId ? { revisionId } : {}),
    ...(snapshotRef ? { snapshotRef } : {}),
    mode: record.mode || record.lineup?.mode || "expected",
    predictionClass: record.predictionClass || record.lineup?.predictionClass || "forecast",
    confidence: record.confidence || record.lineup?.confidence || null,
    engine: expectedLineupsData.engine || null,
    providers: record.providers || [],
    sourceIds: record.sourceIds || record.lineup?.sourceIds || [],
    sources: relevantSources(expectedLineupsData, record, externalSources),
    evidence: record.evidence || null,
    candidates: record.candidates || [],
    home: compactSide(record.lineup?.home, fixture.homeTeamId),
    away: compactSide(record.lineup?.away, fixture.awayTeamId)
  };
}

export function archiveCompletedExpectedLineups({
  historyData,
  expectedLineupsData,
  fixturesData,
  capturedAt,
  captureMethod = "fifa-results-prune",
  externalSources = [],
  snapshotRef = ""
}) {
  const base = historyData && typeof historyData === "object"
    ? historyData
    : { schemaVersion: "1.0", updatedAt: capturedAt, fixtures: [] };
  const existing = new Set((base.fixtures || []).map((record) => record.fixtureId));
  const fixturesById = new Map((fixturesData.fixtures || []).map((fixture) => [fixture.id, fixture]));
  const archived = [];

  for (const record of expectedLineupsData?.fixtures || []) {
    const fixture = fixturesById.get(record?.fixtureId);
    if (!fixture || PRE_MATCH_STATUSES.has(fixture.status) || existing.has(fixture.id)) {
      continue;
    }

    archived.push(createPredictionHistoryRecord({
      expectedLineupsData,
      fixture,
      record,
      capturedAt,
      captureMethod,
      externalSources,
      snapshotRef
    }));
    existing.add(fixture.id);
  }

  return {
    historyData: {
      ...base,
      schemaVersion: base.schemaVersion || "1.0",
      updatedAt: archived.length ? capturedAt : base.updatedAt,
      fixtures: [...(base.fixtures || []), ...archived]
        .sort((a, b) => String(a.kickoffUtc).localeCompare(String(b.kickoffUtc)))
    },
    archivedCount: archived.length
  };
}

export function archiveExpectedLineupsForFixtures({
  auditData = null,
  historyData,
  expectedLineupsData,
  fixturesData,
  fixtureIds,
  capturedAt,
  captureMethod = "fifa-lineup-confirmation",
  externalSources = [],
  requireAuditRevision = false,
  revisionLedgerData = null,
  snapshotRef = ""
}) {
  const base = historyData && typeof historyData === "object"
    ? historyData
    : { schemaVersion: "1.0", updatedAt: capturedAt, fixtures: [] };
  const requestedFixtureIds = new Set(fixtureIds || []);
  const existing = new Set((base.fixtures || []).map((record) => record.fixtureId));
  const fixturesById = new Map((fixturesData.fixtures || []).map((fixture) => [fixture.id, fixture]));
  const archived = [];
  let auditRevision;
  let auditRevisionResolved = false;

  for (const record of expectedLineupsData?.fixtures || []) {
    const fixture = fixturesById.get(record?.fixtureId);
    if (!fixture || !requestedFixtureIds.has(fixture.id) || existing.has(fixture.id)) {
      continue;
    }

    assertPreKickoffPrediction(expectedLineupsData, fixture, record);
    if (!auditRevisionResolved) {
      auditRevision = resolvePredictionAuditRevision({
        auditData,
        expectedLineupsData,
        revisionLedgerData
      });
      auditRevisionResolved = true;
    }
    if (requireAuditRevision && !auditRevision) {
      throw new Error(`${fixture.id} cannot archive without the matching prediction audit revision`);
    }

    let archiveRecord = record;
    let archiveSources = externalSources;
    let revisionId = "";
    if (auditRevision) {
      const auditFixture = (auditRevision.fixtures || []).find((entry) =>
        (entry?.fixture?.id || entry?.prediction?.fixtureId) === fixture.id
      );
      const providerCandidates = Array.isArray(auditFixture?.providerCandidates)
        ? auditFixture.providerCandidates
        : [];
      if (requireAuditRevision && (!auditFixture?.prediction || !providerCandidates.length)) {
        throw new Error(`${fixture.id} matching prediction audit revision is missing provider candidates`);
      }
      if (auditFixture?.prediction) {
        const sourceIds = collectReferencedSourceIds({
          prediction: auditFixture.prediction,
          providerCandidates
        });
        archiveRecord = {
          ...auditFixture.prediction,
          sourceIds: [...sourceIds],
          candidates: providerCandidates
        };
      }
      archiveSources = [...externalSources, ...(auditRevision.sources || [])];
      revisionId = auditRevision.revisionId;
    }

    archived.push(createPredictionHistoryRecord({
      expectedLineupsData,
      fixture,
      record: archiveRecord,
      capturedAt,
      captureMethod,
      externalSources: archiveSources,
      revisionId,
      snapshotRef
    }));
    existing.add(fixture.id);
  }

  return {
    historyData: {
      ...base,
      schemaVersion: base.schemaVersion || "1.0",
      updatedAt: archived.length ? capturedAt : base.updatedAt,
      fixtures: [...(base.fixtures || []), ...archived]
        .sort((a, b) => String(a.kickoffUtc).localeCompare(String(b.kickoffUtc)))
    },
    archivedCount: archived.length
  };
}

export async function commitPredictionArchiveBeforeOfficialPersistence({
  archiveResult,
  persistHistory,
  persistOfficial
}) {
  if (archiveResult?.archivedCount > 0) {
    if (typeof persistHistory !== "function") {
      throw new Error("Prediction history persistence is required before official lineup persistence");
    }
    await persistHistory(archiveResult.historyData);
  }

  if (typeof persistOfficial === "function") {
    await persistOfficial();
  }
}
