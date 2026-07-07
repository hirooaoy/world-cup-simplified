import { createPredictionDocument } from "./model.mjs";
import { PredictionProviderRegistry } from "./providers.mjs";
import { generateFixturePredictions } from "./generator.mjs";

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

  return {
    collections,
    candidates,
    document,
    registry
  };
}
