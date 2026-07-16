import fs from "node:fs";
import path from "node:path";

import {
  getCanonicalPlayerKey,
  normalizePlayerName,
  resolvePlayerNameInPool
} from "./player-name-matching.mjs";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeDisplayName(value) {
  return String(value || "").trim().replace(/\s+/gu, " ");
}

function getGermanAsciiName(value) {
  return normalizeDisplayName(value)
    .replace(/Ä/gu, "Ae")
    .replace(/Ö/gu, "Oe")
    .replace(/Ü/gu, "Ue")
    .replace(/ä/gu, "ae")
    .replace(/ö/gu, "oe")
    .replace(/ü/gu, "ue")
    .replace(/ẞ/gu, "SS")
    .replace(/ß/gu, "ss");
}

function addRenderedName(evidence, value, source) {
  const name = normalizeDisplayName(value);
  if (!name) {
    return;
  }
  const sources = evidence.get(name) || new Set();
  sources.add(source);
  evidence.set(name, sources);
}

function collectLineupSide(evidence, side, source) {
  for (const listName of ["players", "bench"]) {
    for (const player of side?.[listName] || []) {
      addRenderedName(evidence, player?.name, source);
    }
  }

  for (const card of side?.events?.cards || []) {
    if (!card?.staff) {
      addRenderedName(evidence, card?.playerName, source);
    }
  }

  for (const substitution of side?.events?.substitutions || []) {
    addRenderedName(evidence, substitution?.onName, source);
    addRenderedName(evidence, substitution?.offName, source);
  }
}

function collectFixtureEventSide(evidence, side, source) {
  for (const goal of side?.goals || []) {
    addRenderedName(evidence, goal?.playerName, source);
    addRenderedName(evidence, goal?.assistName, source);
  }

  for (const card of side?.cards || []) {
    if (!card?.staff) {
      addRenderedName(evidence, card?.playerName, source);
    }
  }

  for (const substitution of side?.substitutions || []) {
    addRenderedName(evidence, substitution?.onName, source);
    addRenderedName(evidence, substitution?.offName, source);
  }
}

function collectRenderedCurrentPlayerNames({ lineups, fixtures, expectedLineups }) {
  const evidence = new Map();

  for (const lineup of Object.values(lineups?.lineups || {})) {
    collectLineupSide(evidence, lineup?.home, "data/lineups.json");
    collectLineupSide(evidence, lineup?.away, "data/lineups.json");
  }

  for (const fixture of fixtures?.fixtures || []) {
    for (const side of ["home", "away"]) {
      for (const player of fixture?.keyPlayers?.[side] || []) {
        addRenderedName(
          evidence,
          player?.name,
          "data/fixtures.json"
        );
      }
    }
    for (const listName of ["goalsHome", "goalsAway"]) {
      for (const goal of fixture?.[listName] || []) {
        addRenderedName(evidence, goal?.name, "data/fixtures.json");
        addRenderedName(evidence, goal?.assistName, "data/fixtures.json");
      }
    }
    for (const item of fixture?.shootoutOutlook?.evidence || []) {
      addRenderedName(evidence, item?.player, "data/fixtures.json");
    }
    collectFixtureEventSide(
      evidence,
      fixture?.matchEvents?.home,
      "data/fixtures.json"
    );
    collectFixtureEventSide(
      evidence,
      fixture?.matchEvents?.away,
      "data/fixtures.json"
    );
  }

  for (const expected of Object.values(expectedLineups?.fixtures || {})) {
    collectLineupSide(
      evidence,
      expected?.lineup?.home,
      "data/expected-lineups.json"
    );
    collectLineupSide(
      evidence,
      expected?.lineup?.away,
      "data/expected-lineups.json"
    );
  }

  return evidence;
}

function buildIdentityPool(profileData) {
  return Object.entries(profileData?.profiles || {}).map(([profileName, profile]) => ({
    profileName,
    canonicalName: normalizeDisplayName(profile?.displayName || profile?.name || profileName),
    names: [...new Set([
      profileName,
      profile?.name,
      profile?.displayName,
      ...(Array.isArray(profile?.aliases) ? profile.aliases : [])
    ].flatMap((name) => [name, getGermanAsciiName(name)])
      .map(normalizeDisplayName)
      .filter(Boolean))]
  }));
}

function resolveFromPool(value, pool) {
  const sourceName = normalizeDisplayName(value);
  const exactProfileMatches = pool.filter(
    (candidate) => candidate.profileName === sourceName
  );
  if (exactProfileMatches.length === 1) {
    return {
      candidate: exactProfileMatches[0],
      matchType: "profile-source",
      status: "matched"
    };
  }

  const resolved = resolvePlayerNameInPool(value, pool, {
    getIdentityKey: (candidate) => candidate.profileName,
    getNames: (candidate) => candidate.names
  });
  if (resolved.status !== "ambiguous") {
    return resolved;
  }

  const sourceKey = getCanonicalPlayerKey(sourceName);
  const exactAliasMatches = pool.filter((candidate) =>
    candidate.names.some((name) => getCanonicalPlayerKey(name) === sourceKey)
  );
  const canonicalNames = new Set(
    exactAliasMatches.map((candidate) => candidate.canonicalName)
  );
  if (exactAliasMatches.length > 1 && canonicalNames.size === 1) {
    return {
      candidate: exactAliasMatches[0],
      matchType: "shared-canonical",
      status: "matched"
    };
  }
  return resolved;
}

function loadRosterAliasResolutions(rootDir, pool) {
  const overrideDir = path.join(
    rootDir,
    "data",
    "player-profile-overrides",
    "2026"
  );
  const resolutions = new Map();
  if (!fs.existsSync(overrideDir)) {
    return resolutions;
  }

  for (const fileName of fs.readdirSync(overrideDir).sort()) {
    if (!fileName.endsWith(".json")) {
      continue;
    }
    const data = readJson(path.join(overrideDir, fileName));
    for (const [rawName, rawCandidates] of Object.entries(
      data?.rosterNameOverrides || {}
    )) {
      const candidates = Array.isArray(rawCandidates)
        ? rawCandidates
        : [rawCandidates];
      const matchedProfiles = new Map();
      for (const candidateName of candidates) {
        const resolved = resolveFromPool(candidateName, pool);
        if (resolved.status === "matched") {
          matchedProfiles.set(
            resolved.candidate.profileName,
            resolved.candidate
          );
        }
      }
      if (matchedProfiles.size === 1) {
        resolutions.set(
          normalizePlayerName(rawName),
          [...matchedProfiles.values()][0]
        );
      }
    }
  }
  return resolutions;
}

export function getCurrentPlayerNameAliasCoverage(rootDir) {
  const profileData = readJson(path.join(rootDir, "data", "player-profiles.json"));
  const renderedEvidence = collectRenderedCurrentPlayerNames({
    expectedLineups: readJson(
      path.join(rootDir, "data", "expected-lineups.json")
    ),
    fixtures: readJson(path.join(rootDir, "data", "fixtures.json")),
    lineups: readJson(path.join(rootDir, "data", "lineups.json"))
  });
  const pool = buildIdentityPool(profileData);
  const rosterAliases = loadRosterAliasResolutions(rootDir, pool);
  const resolutions = {};

  for (const sourceName of [...renderedEvidence.keys()].sort((left, right) =>
    left.localeCompare(right, "en")
  )) {
    const rosterMatch = rosterAliases.get(normalizePlayerName(sourceName));
    const resolved = rosterMatch
      ? {
          candidate: rosterMatch,
          matchType: "roster-override",
          status: "matched"
        }
      : resolveFromPool(sourceName, pool);
    const profile = resolved.status === "matched" ? resolved.candidate : null;
    resolutions[sourceName] = {
      canonicalName: profile?.canonicalName || sourceName,
      profileName: profile?.profileName || "",
      resolution: profile ? resolved.matchType : "provider-only",
      sources: [...renderedEvidence.get(sourceName)].sort()
    };
  }

  return {
    renderedNameCount: renderedEvidence.size,
    resolutions
  };
}

export function buildProviderPlayerNameTranslations({
  language,
  profileTranslations,
  providerCoverage,
  overrides,
  transliterations
}) {
  const translations = {};
  for (const [sourceName, resolution] of Object.entries(
    providerCoverage?.resolutions || {}
  )) {
    const canonicalName = normalizeDisplayName(
      resolution?.canonicalName || sourceName
    );
    const localizedName = resolution?.profileName
      ? normalizeDisplayName(
          profileTranslations?.[resolution.profileName] ||
          profileTranslations?.[canonicalName] ||
          canonicalName
        )
      : normalizeDisplayName(
          overrides?.[language]?.[sourceName] ||
          (language === "ko" ? transliterations?.ko?.[sourceName] : "") ||
          canonicalName
        );
    if (localizedName && localizedName !== sourceName) {
      translations[sourceName] = localizedName;
    }
  }
  return translations;
}

export function getProviderAliasProvenance(providerCoverage) {
  return Object.fromEntries(
    Object.entries(providerCoverage?.resolutions || {})
      .filter(
        ([sourceName, resolution]) =>
          !resolution?.profileName ||
          sourceName !== resolution?.canonicalName
      )
      .map(([sourceName, resolution]) => [sourceName, resolution])
  );
}
