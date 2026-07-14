import { createPredictionDocument } from "./model.mjs";
import { PredictionProviderRegistry } from "./providers.mjs";
import { generateFixturePredictions } from "./generator.mjs";

export function createPredictionAuditDocument({ candidates = [], document, targetFixtures = [] }) {
  const fixturesById = new Map(targetFixtures.map((fixture) => [fixture.id, fixture]));
  const predictionsById = new Map((document?.fixtures || []).map((record) => [record.fixtureId, record]));
  const fixtureIds = [...new Set([
    ...targetFixtures.map((fixture) => fixture.id),
    ...candidates.map((candidate) => candidate.fixtureId)
  ])].sort();

  return {
    schemaVersion: "1",
    generatedAt: document?.generatedAt,
    revisionId: `${document?.generatedAt || "unknown"}:${document?.engine?.runId || "adhoc"}`,
    engine: document?.engine || {},
    inputs: document?.inputs || [],
    sources: document?.sources || [],
    fixtures: fixtureIds.map((fixtureId) => {
      const fixture = fixturesById.get(fixtureId) || { id: fixtureId };
      return {
      fixture: {
        id: fixture.id,
        matchNumber: fixture.matchNumber,
        stage: fixture.stage,
        round: fixture.round,
        kickoffUtc: fixture.kickoffUtc,
        status: fixture.status,
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId
      },
      prediction: predictionsById.get(fixtureId) || null,
      providerCandidates: candidates.filter((candidate) => candidate.fixtureId === fixtureId)
    };
    })
  };
}

export async function runLineupPredictionEngine({
  context,
  generatedAt = new Date(),
  generator = {},
  inputs = [],
  options = {},
  providers = [],
  sources = [],
  targetFixtures = []
}) {
  const registry = providers instanceof PredictionProviderRegistry
    ? providers
    : new PredictionProviderRegistry(providers);
  const collections = await registry.collect(context);
  const candidates = await registry.normalize(collections, context);
  const document = createPredictionDocument({
    generatedAt,
    generator,
    inputs,
    sources
  });

  document.fixtures = generateFixturePredictions({
    candidates,
    fixtures: targetFixtures,
    generatedAt,
    options
  });
  document.run = {
    providerCount: registry.list().length,
    candidateCount: candidates.length,
    fixtureCount: document.fixtures.length,
    skippedFixtureCount: Math.max(0, targetFixtures.length - document.fixtures.length)
  };
  Object.defineProperty(document, "_validationContext", {
    enumerable: false,
    value: {
      fixtures: targetFixtures,
      playerProfilesData: options.playerProfilesData || {}
    }
  });
  const auditDocument = createPredictionAuditDocument({ candidates, document, targetFixtures });

  return {
    auditDocument,
    collections,
    candidates,
    document,
    registry
  };
}
