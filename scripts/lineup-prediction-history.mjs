const PRE_MATCH_STATUSES = new Set(["SCHEDULED", "DELAYED"]);

function compactPlayer(player = {}) {
  return {
    name: player.name || "",
    number: String(player.number || ""),
    position: player.position || "",
    x: Number(player.x),
    y: Number(player.y),
    confidence: player.confidence || null
  };
}

function compactSide(side = {}, teamId = "") {
  return {
    teamId,
    formation: side.formation || "",
    starters: (side.players || []).map(compactPlayer)
  };
}

function relevantSources(expectedLineupsData, record) {
  const sourceIds = new Set(record.sourceIds || record.lineup?.sourceIds || []);
  return (expectedLineupsData.sources || [])
    .filter((source) => sourceIds.has(source.id))
    .map((source) => ({
      id: source.id,
      label: source.label,
      type: source.type,
      checkedAt: source.checkedAt,
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
  snapshotRef = ""
}) {
  return {
    fixtureId: fixture.id,
    kickoffUtc: fixture.kickoffUtc,
    capturedAt,
    predictionGeneratedAt: expectedLineupsData.generatedAt,
    captureMethod,
    ...(snapshotRef ? { snapshotRef } : {}),
    mode: record.mode || record.lineup?.mode || "expected",
    confidence: record.confidence || record.lineup?.confidence || null,
    providers: record.providers || [],
    sourceIds: record.sourceIds || record.lineup?.sourceIds || [],
    sources: relevantSources(expectedLineupsData, record),
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

