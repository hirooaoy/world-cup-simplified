import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildProviderPlayerNameTranslations,
  getCurrentPlayerNameAliasCoverage,
  getProviderAliasProvenance
} from "./locale-player-name-aliases.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const profilePath = path.join(rootDir, "data", "player-profiles.json");
const historicalProfilePath = path.join(rootDir, "data", "historical-player-profiles.json");
const coachProfilePath = path.join(rootDir, "data", "coach-profiles.json");
const overridePath = path.join(rootDir, "data", "locales", "player-name-overrides.json");
const transliterationPath = path.join(
  rootDir,
  "data",
  "locales",
  "player-name-transliterations.json"
);
const provenancePath = path.join(rootDir, "data", "locales", "player-name-provenance.json");
const outputPaths = {
  es: {
    current: path.join(rootDir, "locales", "es", "player-names.js"),
    archive: path.join(rootDir, "locales", "es", "player-names-archive.js")
  },
  ko: {
    current: path.join(rootDir, "locales", "ko", "player-names.js"),
    archive: path.join(rootDir, "locales", "ko", "player-names-archive.js")
  }
};
const shouldWrite = process.argv.includes("--write");
const shouldCheck = process.argv.includes("--check");
const shouldWriteFromProvenance = process.argv.includes("--write-from-provenance");
const BATCH_SIZE = 120;
const MAX_ATTEMPTS = 4;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function escapeSparqlString(value) {
  return JSON.stringify(String(value));
}

function isWikipediaProfile(profile) {
  return String(profile?.sourceUrl || "").startsWith("https://en.wikipedia.org/wiki/");
}

function getBindingValue(binding, key) {
  return String(binding?.[key]?.value || "").trim();
}

function getWikidataId(binding) {
  return getBindingValue(binding, "item").split("/").at(-1) || "";
}

function getArticleDisplayName(binding, language) {
  const articleUrl = getBindingValue(binding, `${language}Article`);
  if (!articleUrl) {
    return "";
  }
  try {
    return normalizeDisplayName(
      decodeURIComponent(new URL(articleUrl).pathname.replace(/^\/wiki\//u, ""))
        .replaceAll("_", " ")
        .replace(/\s+\([^)]*\)$/u, "")
    );
  } catch {
    return "";
  }
}

function normalizeDisplayName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function getNameWords(value) {
  return normalizeDisplayName(value).split(/\s+/u).filter(Boolean);
}

function getBaseNameWord(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .toLocaleLowerCase("es");
}

function countDiacritics(value) {
  return String(value || "").normalize("NFD").match(/\p{Mark}/gu)?.length || 0;
}

function getSpanishNewsroomName(canonicalValue, sourcedValue) {
  const canonical = normalizeDisplayName(canonicalValue);
  const sourced = normalizeDisplayName(sourcedValue);
  if (!canonical || !sourced) {
    return sourced || canonical;
  }

  const canonicalWords = getNameWords(canonical);
  const sourcedWords = getNameWords(sourced);
  if (sourcedWords.length > canonicalWords.length) {
    return canonical;
  }
  if (sourcedWords.length < canonicalWords.length) {
    return sourced;
  }
  if (
    !canonicalWords.every(
      (word, index) => getBaseNameWord(word) === getBaseNameWord(sourcedWords[index])
    )
  ) {
    return canonical;
  }

  return canonicalWords
    .map((word, index) =>
      countDiacritics(sourcedWords[index]) > countDiacritics(word)
        ? sourcedWords[index]
        : word
    )
    .join(" ");
}

function isUsableLocalizedName(language, value) {
  const name = normalizeDisplayName(value);
  if (!name || /\s\((?:footballer|futbolista|축구 선수)\)$/iu.test(name)) {
    return false;
  }
  return language !== "ko" || /\p{Script=Hangul}/u.test(name);
}

function getNameSourcePriority(language, source) {
  if (source === "editorial-override") {
    return 5;
  }
  if (source === `${language}wiki`) {
    return 4;
  }
  if (source === "wikidata") {
    return 3;
  }
  if (source === "phonetic-transliteration") {
    return 2;
  }
  return 1;
}

function buildResolvedNameTranslations(language, entries) {
  const bestByCanonicalName = new Map();
  for (const [sourceName, entry] of Object.entries(entries || {})) {
    const canonicalName = normalizeDisplayName(entry?.canonicalName || sourceName);
    const displayName = normalizeDisplayName(entry?.displayName || canonicalName);
    const priority = getNameSourcePriority(language, entry?.source);
    const current = bestByCanonicalName.get(canonicalName);
    if (!current || priority > current.priority) {
      bestByCanonicalName.set(canonicalName, { displayName, priority });
    }
  }

  const resolved = {};
  for (const [sourceName, entry] of Object.entries(entries || {})) {
    const canonicalName = normalizeDisplayName(entry?.canonicalName || sourceName);
    const displayName =
      bestByCanonicalName.get(canonicalName)?.displayName ||
      normalizeDisplayName(entry?.displayName || canonicalName);
    for (const alias of [sourceName, canonicalName]) {
      if (displayName && displayName !== alias) {
        resolved[alias] = displayName;
      }
    }
  }
  return resolved;
}

async function queryBatch(profiles) {
  const values = profiles
    .map((profile) => `(${escapeSparqlString(profile.name)} <${profile.sourceUrl}>)`)
    .join("\n");
  const query = `
PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?sourceName ?item ?esArticle ?koArticle ?esLabel ?koLabel WHERE {
  VALUES (?sourceName ?enArticle) {
    ${values}
  }
  ?enArticle schema:about ?item;
             schema:isPartOf <https://en.wikipedia.org/>.
  OPTIONAL { ?esArticle schema:about ?item; schema:isPartOf <https://es.wikipedia.org/>. }
  OPTIONAL { ?koArticle schema:about ?item; schema:isPartOf <https://ko.wikipedia.org/>. }
  OPTIONAL { ?item rdfs:label ?esLabel FILTER(LANG(?esLabel) = "es") }
  OPTIONAL { ?item rdfs:label ?koLabel FILTER(LANG(?koLabel) = "ko") }
}`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch("https://query.wikidata.org/sparql", {
      method: "POST",
      headers: {
        Accept: "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "WorldCupSimplified/0.1 (locale-name sync; world-cup-simplified.vercel.app)"
      },
      body: new URLSearchParams({ query })
    });

    if (response.ok) {
      const payload = await response.json();
      return payload.results?.bindings || [];
    }

    if (attempt === MAX_ATTEMPTS) {
      const detail = (await response.text()).slice(0, 240);
      throw new Error(`Wikidata query failed (${response.status}): ${detail}`);
    }

    await wait(500 * 2 ** (attempt - 1));
  }

  return [];
}

async function loadSourcedNames(profiles) {
  const sourced = new Map();
  const candidates = profiles.filter(isWikipediaProfile);

  for (let index = 0; index < candidates.length; index += BATCH_SIZE) {
    const bindings = await queryBatch(candidates.slice(index, index + BATCH_SIZE));
    bindings.forEach((binding) => {
      const sourceName = getBindingValue(binding, "sourceName");
      if (sourceName) {
        sourced.set(sourceName, binding);
      }
    });
  }

  return sourced;
}

function sortObject(value) {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right, "en"))
  );
}

function buildLocaleModule(language, scope, translations) {
  const exportName = scope === "archive"
    ? `${language.toUpperCase()}_ARCHIVE_PLAYER_NAME_TRANSLATIONS`
    : `${language.toUpperCase()}_PLAYER_NAME_TRANSLATIONS`;
  return `// Generated by scripts/sync-locale-player-names.mjs.\n// Do not hand-edit; use data/locales/player-name-overrides.json.\n\nexport const ${exportName} = Object.freeze(${JSON.stringify(sortObject(translations), null, 2)});\n`;
}

function writeOrCheck(filePath, content) {
  if (shouldWrite) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    return;
  }

  if (shouldCheck && (!fs.existsSync(filePath) || fs.readFileSync(filePath, "utf8") !== content)) {
    throw new Error(`${path.relative(rootDir, filePath)} is stale; run pnpm locales:names:sync`);
  }
}

const profileData = readJson(profilePath);
const historicalProfileData = readJson(historicalProfilePath);
const coachProfileData = readJson(coachProfilePath);
const scopeNames = {
  current: new Set(),
  archive: new Set()
};

function addScopeNames(scope, profile) {
  [
    profile?.name,
    profile?.displayName
  ].forEach((value) => {
    const name = normalizeDisplayName(value);
    if (name) {
      scopeNames[scope].add(name);
    }
  });
}

Object.values(profileData.profiles || {}).forEach((profile) => addScopeNames("current", profile));
Object.values(coachProfileData.profiles || {}).forEach((profile) => addScopeNames("current", profile));
Object.values(historicalProfileData.profiles || {}).forEach((profile) => addScopeNames("archive", profile));
const profilesByName = new Map();
[
  ...Object.values(profileData.profiles || {}).map((profile) => ({
    ...profile,
    sourceScope: "current"
  })),
  ...Object.values(historicalProfileData.profiles || {}).map((profile) => ({
    ...profile,
    sourceScope: "archive",
    sourceUrl: profile.imagePageUrl || profile.sourceUrl
  })),
  ...Object.values(coachProfileData.profiles || {}).map((profile) => ({
    ...profile,
    displayName: profile.name,
    sourceScope: "coach"
  }))
].forEach((profile) => {
  const name = normalizeDisplayName(profile.name);
  if (!name) {
    return;
  }
  const normalizedProfile = {
    ...profile,
    name,
    displayName: normalizeDisplayName(profile.displayName || profile.name)
  };
  const existing = profilesByName.get(name);
  if (!existing || (!isWikipediaProfile(existing) && isWikipediaProfile(normalizedProfile))) {
    profilesByName.set(name, normalizedProfile);
  }
});
const profiles = [...profilesByName.values()];
const overrides = fs.existsSync(overridePath) ? readJson(overridePath) : { es: {}, ko: {} };
const transliterations = fs.existsSync(transliterationPath)
  ? readJson(transliterationPath)
  : { ko: {} };
const providerCoverage = getCurrentPlayerNameAliasCoverage(rootDir);
for (const sourceName of Object.keys(providerCoverage.resolutions)) {
  scopeNames.current.add(sourceName);
}
const checkedInProvenance =
  (shouldCheck || shouldWriteFromProvenance) && fs.existsSync(provenancePath)
    ? readJson(provenancePath)
    : null;
const shouldUseCheckedInProvenance = shouldCheck || shouldWriteFromProvenance;
const sourcedNames = shouldUseCheckedInProvenance
  ? new Map()
  : await loadSourcedNames(profiles);
const translations = { es: {}, ko: {} };
const provenance = shouldUseCheckedInProvenance
  ? {
      es: checkedInProvenance?.names?.es || {},
      ko: checkedInProvenance?.names?.ko || {}
    }
  : { es: {}, ko: {} };

if (shouldUseCheckedInProvenance) {
  const profileNames = new Set(profiles.map((profile) => profile.name));
  for (const language of ["es", "ko"]) {
    const provenanceNames = Object.keys(provenance[language]);
    const missingProvenance = [...profileNames].filter(
      (name) => !Object.hasOwn(provenance[language], name)
    );
    const extraProvenance = provenanceNames.filter((name) => !profileNames.has(name));
    if (missingProvenance.length || extraProvenance.length) {
      throw new Error(
        `Player-name provenance is out of sync for ${language}: ${missingProvenance.length} missing, ${extraProvenance.length} extra; run pnpm locales:names:sync`
      );
    }

    translations[language] = buildResolvedNameTranslations(
      language,
      provenance[language]
    );
  }
} else {
  for (const profile of profiles) {
    const binding = sourcedNames.get(profile.name);
    const wikidataId = getWikidataId(binding);

    for (const language of ["es", "ko"]) {
      const override = normalizeDisplayName(overrides?.[language]?.[profile.name]);
      const rawSourced = normalizeDisplayName(
        getArticleDisplayName(binding, language) ||
        getBindingValue(binding, `${language}Label`)
      );
      const sourced =
        language === "es"
          ? getSpanishNewsroomName(profile.displayName, rawSourced)
          : rawSourced;
      const transliteration =
        language === "ko" ? normalizeDisplayName(transliterations?.ko?.[profile.name]) : "";
      const localized =
        override ||
        (isUsableLocalizedName(language, sourced) ? sourced : "") ||
        (isUsableLocalizedName(language, transliteration) ? transliteration : "") ||
        profile.displayName;
      const articleUrl = getBindingValue(binding, `${language}Article`);
      let source = "canonical";
      let sourceUrl = profile.sourceUrl || "";

      if (override) {
        source = "editorial-override";
        sourceUrl = "data/locales/player-name-overrides.json";
      } else if (sourced && sourced !== profile.displayName && articleUrl) {
        source = `${language}wiki`;
        sourceUrl = articleUrl;
      } else if (sourced && sourced !== profile.displayName && wikidataId) {
        source = "wikidata";
        sourceUrl = `https://www.wikidata.org/wiki/${wikidataId}`;
      } else if (transliteration) {
        source = "phonetic-transliteration";
        sourceUrl = "data/locales/player-name-transliterations.json";
      }

      if (localized !== profile.displayName) {
        translations[language][profile.name] = localized;
        if (profile.displayName !== profile.name) {
          translations[language][profile.displayName] = localized;
        }
      }

      provenance[language][profile.name] = {
        canonicalName: profile.displayName,
        displayName: localized,
        source,
        sourceUrl
      };
    }
  }
}

if (!shouldCheck) {
  for (const language of ["es", "ko"]) {
    translations[language] = buildResolvedNameTranslations(
      language,
      provenance[language]
    );
  }
}

for (const language of ["es", "ko"]) {
  const providerTranslations = buildProviderPlayerNameTranslations({
    language,
    overrides,
    profileTranslations: translations[language],
    providerCoverage,
    transliterations
  });
  for (const scope of ["current", "archive"]) {
    const scopedTranslations = Object.fromEntries(
      Object.entries(translations[language]).filter(([name]) => scopeNames[scope].has(name))
    );
    if (scope === "current") {
      Object.assign(scopedTranslations, providerTranslations);
    }
    writeOrCheck(
      outputPaths[language][scope],
      buildLocaleModule(language, scope, scopedTranslations)
    );
  }
}

const summary = shouldCheck && checkedInProvenance?.summary
  ? checkedInProvenance.summary
  : Object.fromEntries(
      ["es", "ko"].map((language) => {
        const entries = Object.values(provenance[language]);
        return [language, {
          canonicalFallbacks: entries.filter((entry) => entry.source === "canonical").length,
          editorialOverrides: entries.filter((entry) => entry.source === "editorial-override").length,
          localizedNames: entries.filter((entry) => entry.displayName !== entry.canonicalName).length,
          sourcedNames: entries.filter((entry) => !["canonical", "editorial-override"].includes(entry.source)).length,
          totalProfiles: entries.length
        }];
      })
    );
const provenanceContent = `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  methodology: "Locale-specific player labels from linked Wikipedia/Wikidata records, followed by checked-in editorial overrides and canonical-name fallback. Rendered match-provider aliases are resolved conservatively against canonical profiles and team roster overrides. Current and archive browser modules are split so historical names load only with archive views.",
  providerNameCoverage: {
    renderedCurrentNames: providerCoverage.renderedNameCount,
    currentAliases: getProviderAliasProvenance(providerCoverage)
  },
  profileDataUpdatedAt: {
    archive: historicalProfileData.updatedAt || "",
    coaches: coachProfileData.updatedAt || "",
    current: profileData.updatedAt || ""
  },
  summary,
  names: {
    es: sortObject(provenance.es),
    ko: sortObject(provenance.ko)
  }
}, null, 2)}\n`;

if (shouldWrite) {
  fs.writeFileSync(provenancePath, provenanceContent);
}

console.log(`Locale player-name sync: ${profiles.length} profiles`);
console.log(`Spanish: ${summary.es.localizedNames} localized, ${summary.es.canonicalFallbacks} canonical fallbacks`);
console.log(`Korean: ${summary.ko.localizedNames} localized, ${summary.ko.canonicalFallbacks} canonical fallbacks`);
if (!shouldWrite && !shouldCheck) {
  console.log("Dry run only. Pass --write to update checked-in locale files.");
}
