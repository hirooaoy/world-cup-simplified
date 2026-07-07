import { createProviderEvidence, normalizeConfidence } from "./model.mjs";

function normalizeString(value) {
  return String(value || "").trim();
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => normalizeString(value)).filter(Boolean))];
}

function requireFunction(value, owner) {
  if (typeof value !== "function") {
    throw new Error(`${owner} must be a function`);
  }
}

export function definePredictionProvider(provider) {
  if (!provider || typeof provider !== "object" || Array.isArray(provider)) {
    throw new Error("Prediction provider must be an object");
  }

  const id = normalizeString(provider.id);
  if (!id) {
    throw new Error("Prediction provider requires id");
  }
  requireFunction(provider.collect, `Prediction provider "${id}".collect`);
  requireFunction(provider.normalize, `Prediction provider "${id}".normalize`);

  return {
    id,
    label: normalizeString(provider.label) || id,
    version: normalizeString(provider.version) || "1",
    source: provider.source || null,
    collect: provider.collect,
    normalize: provider.normalize
  };
}

export class PredictionProviderRegistry {
  #providers = new Map();

  constructor(providers = []) {
    for (const provider of providers) {
      this.register(provider);
    }
  }

  register(providerDefinition) {
    const provider = definePredictionProvider(providerDefinition);
    if (this.#providers.has(provider.id)) {
      throw new Error(`Duplicate prediction provider "${provider.id}"`);
    }
    this.#providers.set(provider.id, provider);
    return provider;
  }

  list() {
    return [...this.#providers.values()];
  }

  get(providerId) {
    return this.#providers.get(providerId);
  }

  async collect(context) {
    const collections = [];
    for (const provider of this.list()) {
      const raw = await provider.collect(context);
      collections.push({
        providerId: provider.id,
        providerVersion: provider.version,
        raw
      });
    }
    return collections;
  }

  async normalize(collections, context) {
    const candidates = [];
    for (const collection of collections) {
      const provider = this.get(collection.providerId);
      if (!provider) {
        throw new Error(`Cannot normalize unknown provider "${collection.providerId}"`);
      }
      const normalized = await provider.normalize(collection.raw, context);
      const providerCandidates = Array.isArray(normalized) ? normalized : normalized?.candidates || [];
      candidates.push(
        ...providerCandidates.map((candidate) =>
          normalizeProviderCandidate({
            ...candidate,
            providerId: candidate.providerId || provider.id,
            providerVersion: candidate.providerVersion || provider.version
          })
        )
      );
    }
    return candidates;
  }
}

export function normalizeProviderPlayer(player = {}) {
  const name = normalizeString(player.name);
  if (!name) {
    throw new Error("Provider player candidate requires name");
  }

  return {
    name,
    number: normalizeString(player.number),
    position: normalizeString(player.position || player.role),
    ...(Number.isFinite(Number(player.x)) ? { x: Number(player.x) } : {}),
    ...(Number.isFinite(Number(player.y)) ? { y: Number(player.y) } : {}),
    rank: Number.isFinite(Number(player.rank)) ? Number(player.rank) : null,
    confidence: normalizeConfidence(player.confidence),
    sourceIds: uniqueStrings(player.sourceIds),
    evidence: uniqueStrings(player.evidence),
    notes: uniqueStrings(player.notes)
  };
}

export function normalizeProviderSide(side = {}) {
  const teamId = normalizeString(side.teamId);
  if (!teamId) {
    throw new Error("Provider side candidate requires teamId");
  }

  return {
    teamId,
    formation: normalizeString(side.formation),
    confidence: normalizeConfidence(side.confidence),
    starters: (Array.isArray(side.starters) ? side.starters : []).map(normalizeProviderPlayer),
    benchCandidates: (Array.isArray(side.benchCandidates) ? side.benchCandidates : []).map(normalizeProviderPlayer),
    unavailable: (Array.isArray(side.unavailable) ? side.unavailable : []).map((player) => ({
      name: normalizeString(player.name),
      reason: normalizeString(player.reason),
      sourceIds: uniqueStrings(player.sourceIds)
    })).filter((player) => player.name),
    sourceIds: uniqueStrings(side.sourceIds),
    evidence: Array.isArray(side.evidence) ? side.evidence : [],
    notes: uniqueStrings(side.notes)
  };
}

export function normalizeProviderCandidate(candidate = {}) {
  const providerId = normalizeString(candidate.providerId);
  const fixtureId = normalizeString(candidate.fixtureId);
  if (!providerId) {
    throw new Error("Provider candidate requires providerId");
  }
  if (!fixtureId) {
    throw new Error("Provider candidate requires fixtureId");
  }

  const sides = {
    home: normalizeProviderSide(candidate.sides?.home || candidate.home),
    away: normalizeProviderSide(candidate.sides?.away || candidate.away)
  };
  const sourceIds = uniqueStrings([
    ...(candidate.sourceIds || []),
    ...sides.home.sourceIds,
    ...sides.away.sourceIds
  ]);

  return {
    providerId,
    providerVersion: normalizeString(candidate.providerVersion) || "1",
    fixtureId,
    mode: normalizeString(candidate.mode) || "expected",
    updatedAt: candidate.updatedAt,
    confidence: normalizeConfidence(candidate.confidence),
    sourceIds,
    sides,
    evidence: (Array.isArray(candidate.evidence) ? candidate.evidence : []).map((evidence) =>
      createProviderEvidence({
        ...evidence,
        fixtureId: evidence.fixtureId || fixtureId,
        providerId: evidence.providerId || providerId,
        sourceIds: uniqueStrings([...(evidence.sourceIds || []), ...sourceIds])
      })
    ),
    notes: uniqueStrings(candidate.notes)
  };
}
