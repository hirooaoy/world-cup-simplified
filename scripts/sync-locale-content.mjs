import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import esAppPack from "../locales/es/app.js";
import { parseHistoricalResultStory } from "../locales/historical-result-templates.js";
import koAppPack from "../locales/ko/app.js";
import { isGeneratedPlayerCardCopy } from "../locales/player-note-templates.js";
import { getCurrentFactualCopyOverride } from "./locale-current-factual-copy.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRootDir = path.resolve(scriptDir, "..");
const LANGUAGES = ["es", "ko"];
const SCOPES = ["current", "archive", "release"];
const shouldWrite = process.argv.includes("--write");
const APP_PACKS = Object.freeze({
  es: esAppPack,
  ko: koAppPack
});
const MANIFEST_NAME_OVERRIDES = Object.freeze({
  es: Object.freeze({
    "Théo Hernandez": "Théo Hernández"
  }),
  ko: Object.freeze({
    "Gonçalo Ramos": "곤살루 하무스",
    "Iñaki Williams": "이냐키 윌리암스",
    "Rafael Leão": "하파엘 레앙"
  })
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeControlledKey(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[‐‑‒–—-]/gu, " ")
    .replace(/\s+/gu, " ");
}

function getNormalizedTranslationMap(values = {}) {
  return new Map(
    Object.entries(values).map(([source, translation]) => [
      normalizeControlledKey(source),
      String(translation || "").trim()
    ])
  );
}

function translateClubList(value, language, glossary) {
  return String(value || "")
    .split(/\s*,\s*/u)
    .map((club) => translateStructuredClub(club, language, glossary))
    .join(", ");
}

export function translateStructuredClub(value, language, glossary) {
  const club = String(value || "").trim();
  if (!club) {
    return club;
  }

  const loanMatch =
    club.match(/^(.+?)\s+\((?:on\s+)?loan\s+from\s+(.+)\)$/iu) ||
    club.match(/^(.+?)\s+\(on\s+loan\s+(.+)\)$/iu);
  if (loanMatch) {
    const currentClub = translateStructuredClub(loanMatch[1], language, glossary);
    const parentClubs = translateClubList(loanMatch[2], language, glossary);
    return language === "ko"
      ? `${currentClub}(${parentClubs}에서 임대)`
      : `${currentClub} (cedido por ${parentClubs})`;
  }

  return String(glossary?.clubs?.[language]?.[club] || club).trim();
}

export function translateStructuredLeague(value, language, glossary) {
  const league = String(value || "").trim();
  if (!league) {
    return league;
  }

  const lastClubMatch = league.match(/^Last club:\s*(.+)$/iu);
  if (lastClubMatch) {
    const club = translateStructuredClub(lastClubMatch[1], language, glossary);
    return language === "ko" ? `마지막 소속팀: ${club}` : `Último club: ${club}`;
  }

  const translations = getNormalizedTranslationMap(glossary?.leagues?.[language]);
  return translations.get(normalizeControlledKey(league)) || league;
}

function getPositionRoleMap(language, glossary, appPack) {
  const roleMap = getNormalizedTranslationMap(appPack?.entities?.playerPositions);
  for (const [source, translation] of Object.entries(
    appPack?.entities?.lineupPositions || {}
  )) {
    roleMap.set(normalizeControlledKey(source), String(translation || "").trim());
  }

  for (const [alias, canonical] of Object.entries(glossary?.positionAliases || {})) {
    const canonicalTranslation = roleMap.get(normalizeControlledKey(canonical));
    if (!canonicalTranslation) {
      throw new Error(
        `Structured position alias ${alias} points to unknown role ${canonical}`
      );
    }
    roleMap.set(normalizeControlledKey(alias), canonicalTranslation);
  }

  return roleMap;
}

export function translateStructuredPosition(value, language, glossary, appPack = APP_PACKS[language]) {
  const position = String(value || "").trim();
  if (!position) {
    return position;
  }

  const roleMap = getPositionRoleMap(language, glossary, appPack);
  const normalized = normalizeControlledKey(position);
  const direct = roleMap.get(normalized);
  if (direct) {
    return direct;
  }

  const roleKeys = [...roleMap.keys()]
    .map((role) => role.split(" "))
    .sort((left, right) => right.length - left.length);
  const normalizedSegments = position
    .replace(/[‐‑‒–—-]/gu, " ")
    .split(/\s*[,/;]\s*/u)
    .map(normalizeControlledKey)
    .filter(Boolean);
  const translatedRoles = [];

  for (const segment of normalizedSegments) {
    const words = segment.split(" ");
    let index = 0;
    while (index < words.length) {
      const roleWords = roleKeys.find(
        (candidate) =>
          candidate.length <= words.length - index &&
          candidate.every((word, offset) => words[index + offset] === word)
      );
      if (!roleWords) {
        return "";
      }
      const translated = roleMap.get(roleWords.join(" "));
      if (translated && translatedRoles.at(-1) !== translated) {
        translatedRoles.push(translated);
      }
      index += roleWords.length;
    }
  }

  return translatedRoles.join(", ");
}

export function translateStructuredFootballTerm(
  value,
  language,
  glossary,
  appPack = APP_PACKS[language]
) {
  const controlledTerms = {
    ...(appPack?.entities?.styleTerms || {}),
    ...(glossary?.skills?.[language] || {})
  };
  return (
    getNormalizedTranslationMap(controlledTerms).get(normalizeControlledKey(value)) || ""
  );
}

export function readStructuredContentGlossary(rootDir = defaultRootDir) {
  const glossary = readJson(
    path.join(rootDir, "data", "locales", "structured-content-glossary.json")
  );
  if (
    glossary?.schemaVersion !== 1 ||
    !glossary?.clubs?.es ||
    !glossary?.clubs?.ko ||
    !glossary?.leagues?.es ||
    !glossary?.leagues?.ko ||
    !glossary?.skills?.es ||
    !glossary?.skills?.ko
  ) {
    throw new Error("Invalid data/locales/structured-content-glossary.json");
  }
  return glossary;
}

function collectStructuredCurrentValues(rootDir = defaultRootDir) {
  const profiles = readJson(path.join(rootDir, "data", "player-profiles.json"));
  const historicalProfiles = readJson(path.join(rootDir, "data", "historical-player-profiles.json"));
  const teams = readJson(path.join(rootDir, "data", "teams.json"));
  const values = {
    clubs: new Set(),
    leagues: new Set(),
    positions: new Set(),
    teamStyleTags: new Set()
  };

  for (const profile of Object.values(profiles.profiles || {})) {
    addString(values.clubs, profile.club);
    addString(values.leagues, profile.league);
    addString(values.positions, profile.position);
  }
  for (const profile of Object.values(historicalProfiles.profiles || {})) {
    addString(values.leagues, profile.league);
  }
  for (const team of teams.teams || []) {
    addStringArray(values.teamStyleTags, team.styleTags);
  }

  return values;
}

function setStructuredTranslation(target, source, translation, owner) {
  const english = String(source || "").trim();
  const localized = String(translation || "").trim();
  if (!english || !localized) {
    throw new Error(`Empty structured ${owner} translation for ${english || "(blank)"}`);
  }
  const existing = target[english];
  if (existing && existing !== localized) {
    throw new Error(
      `Conflicting structured translations for ${english}: ${existing} / ${localized}`
    );
  }
  target[english] = localized;
}

export function getStructuredContentTranslations(
  language,
  rootDir = defaultRootDir,
  appPack = APP_PACKS[language]
) {
  if (!LANGUAGES.includes(language) || !appPack) {
    throw new Error(`Unsupported structured-content language ${language}`);
  }

  const glossary = readStructuredContentGlossary(rootDir);
  const values = collectStructuredCurrentValues(rootDir);
  const translations = {};

  for (const club of values.clubs) {
    setStructuredTranslation(
      translations,
      club,
      translateStructuredClub(club, language, glossary),
      "club"
    );
  }
  for (const league of values.leagues) {
    setStructuredTranslation(
      translations,
      league,
      translateStructuredLeague(league, language, glossary),
      "league"
    );
  }
  for (const position of values.positions) {
    const translation = translateStructuredPosition(
      position,
      language,
      glossary,
      appPack
    );
    if (!translation) {
      throw new Error(`Unrecognized controlled position ${JSON.stringify(position)}`);
    }
    setStructuredTranslation(translations, position, translation, "position");
  }
  for (const styleTag of values.teamStyleTags) {
    const translation = translateStructuredFootballTerm(
      styleTag,
      language,
      glossary,
      appPack
    );
    if (!translation) {
      throw new Error(`Missing controlled team-style translation for ${styleTag}`);
    }
    setStructuredTranslation(translations, styleTag, translation, "team style");
  }

  return Object.freeze(translations);
}

function manifestRoleLabel(entry, language, glossary = readStructuredContentGlossary(defaultRootDir)) {
  const translated = translateStructuredPosition(entry.position, language, glossary, APP_PACKS[language]);
  if (translated) return translated.split(/\s*,\s*/u)[0];
  const position = String(entry.position || "").toLocaleLowerCase("en-US");
  if (language === "ko") {
    if (/goalkeeper/u.test(position)) return "골키퍼";
    if (/defender|back/u.test(position)) return "수비수";
    if (/midfielder/u.test(position)) return "미드필더";
    return "공격수";
  }
  if (/goalkeeper/u.test(position)) return "portero";
  if (/defender|back/u.test(position)) return "defensor";
  if (/midfielder/u.test(position)) return "centrocampista";
  return "delantero";
}

function manifestFacts(entry, language) {
  const fields = new Set(entry.factualFieldsUsed || []);
  const facts = [];
  const source = `${entry.oldEnglish || ""} ${entry.finalEnglish || ""}`;
  const goals = source.match(/\b(\d+)\s+goals?\b/iu)?.[1];
  const scoringMatches = source.match(/scoring in\s+(\d+)\s+featured matches?/iu)?.[1];
  const featuredRecords = source.match(/\b(\d+)\s+featured records?\b/iu)?.[1];
  if (goals) facts.push(language === "ko" ? `${goals}골` : `${goals} ${goals === "1" ? "gol" : "goles"}`);
  if (scoringMatches) {
    facts.push(language === "ko"
      ? `중점 경기 ${scoringMatches}경기 득점 기록`
      : `goles en ${scoringMatches} ${scoringMatches === "1" ? "partido destacado" : "partidos destacados"}`);
  }
  if (featuredRecords) {
    facts.push(language === "ko"
      ? `중점 경기 ${featuredRecords}경기 기록`
      : `${featuredRecords} ${featuredRecords === "1" ? "registro de partido destacado" : "registros de partidos destacados"}`);
  }
  if (fields.has("bestXiSelection")) {
    facts.push(language === "ko" ? "역사 베스트 XI 선정" : "selección en el once histórico ideal");
  }
  if (!facts.length) return language === "ko" ? "기존 기록" : "el registro disponible";
  if (language === "ko") return facts.join(", ");
  if (facts.length === 1) return facts[0];
  return `${facts.slice(0, -1).join(", ")} y ${facts.at(-1)}`;
}

function koreanTopicParticle(value) {
  const text = String(value || "");
  const last = text.match(/\p{Script=Hangul}/u) ? text.at(-1) : "";
  if (!last) return "는";
  const code = last.codePointAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "는";
  return (code - 0xac00) % 28 === 0 ? "는" : "은";
}

function koreanInstrumentParticle(value) {
  const text = String(value || "");
  const last = text.match(/\p{Script=Hangul}/u) ? text.at(-1) : "";
  if (!last) return "로";
  const code = last.codePointAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "로";
  const jong = (code - 0xac00) % 28;
  return jong === 0 || jong === 8 ? "로" : "으로";
}

function translateManifestEntry(entry, language, glossary, playerNames) {
  const playerName = MANIFEST_NAME_OVERRIDES[language]?.[entry.player] ||
    playerNames?.[entry.player]?.displayName ||
    entry.player;
  const team = APP_PACKS[language]?.helpers?.translateTeamName?.(entry.team) || entry.team;
  const role = manifestRoleLabel(entry, language, glossary);
  const facts = manifestFacts(entry, language);
  const otherYears = (entry.recurringTournamentYears || [])
    .filter((year) => Number(year) !== Number(entry.tournamentYear))
    .join(", ");

  if (language === "ko") {
    const base = `${entry.tournamentYear}년의 ${playerName}${koreanTopicParticle(playerName)} ${team}의 ${role}${koreanInstrumentParticle(role)} 넓게 보는 편이 안전하며, 근거는 ${facts}이다.`;
    const ending = entry.riskFlags?.recurringPlayer && otherYears
      ? ` ${otherYears}년과 구분하되, 확인되지 않은 움직임이나 세부 전술은 덧붙이지 않는다.`
      : " 역할과 대회 비중은 설명할 수 있지만, 확인되지 않은 움직임이나 결정은 쓰지 않는다.";
    return `${base}${ending}`;
  }

  const base = `Para ${playerName} en ${entry.tournamentYear}, conviene mantener una lectura amplia como ${role} de ${team}, apoyada en ${facts}.`;
  const ending = entry.riskFlags?.recurringPlayer && otherYears
    ? ` La nota debe diferenciar esta edición de ${otherYears} sin añadir movimientos no documentados.`
    : " Eso permite describir responsabilidad e impacto sin convertirlo en acciones exactas no documentadas.";
  return `${base}${ending}`;
}

function getManifestArchiveTranslations(language, rootDir = defaultRootDir) {
  const sourcePath = path.join(rootDir, "data", "editorial", "historical-player-card-review-manifest.json");
  if (!fs.existsSync(sourcePath)) return {};
  const manifest = readJson(sourcePath);
  const glossary = readStructuredContentGlossary(rootDir);
  const provenance = readJson(path.join(rootDir, "data", "locales", "player-name-provenance.json"));
  const playerNames = provenance?.names?.[language] || {};
  return Object.fromEntries(
    (manifest.entries || [])
      .filter((entry) => ["rewritten", "reviewed-retained"].includes(entry.status))
      .filter((entry) => entry.finalEnglish && entry.finalChinese)
      .map((entry) => [entry.finalEnglish, translateManifestEntry(entry, language, glossary, playerNames)])
  );
}

function addString(target, value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (
    text &&
    !/^https?:\/\//iu.test(text) &&
    !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/u.test(text) &&
    !/^[a-f0-9]{24,}$/iu.test(text) &&
    !/^(?:\.{0,2}\/|data\/|scripts\/|locales\/)/u.test(text) &&
    !/^[^\s/]+\.(?:csv|js|json|md|mjs|tsv|txt)$/iu.test(text)
  ) {
    target.add(text);
  }
}

function addStringArray(target, values) {
  if (Array.isArray(values)) {
    values.forEach((value) => addString(target, value));
  }
}

function addLocalizedEnglish(target, value) {
  if (typeof value === "string") {
    addString(target, value);
    return;
  }
  if (value && typeof value === "object") {
    addString(target, value.en);
  }
}

const NON_VISIBLE_KEYS = new Set([
  "basis",
  "code",
  "confidence",
  "date",
  "highlight",
  "id",
  "image",
  "imageUrl",
  "input",
  "inputs",
  "file",
  "files",
  "hash",
  "hashes",
  "layoutSource",
  "market",
  "method",
  "path",
  "paths",
  "publishedAt",
  "prices",
  "recoveredAt",
  "semantics",
  "sortKey",
  "sortValue",
  "source",
  "sourceId",
  "sourceIds",
  "sourcePath",
  "sourceUrl",
  "time",
  "timestamp",
  "type",
  "updatedAt",
  "url"
]);

function addVisibleObjectStrings(target, value, key = "") {
  if (
    NON_VISIBLE_KEYS.has(key) ||
    /(?:Hash|Id|Ids|Input|Inputs|File|Files|Path|Paths|Url|Urls)$/u.test(key)
  ) {
    return;
  }
  if (typeof value === "string") {
    if (
      !/(?:Zh|Es|Ko)$/u.test(key) &&
      !/(?:name|player|team|club|league|venue)$/iu.test(key)
    ) {
      addString(target, value);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => addVisibleObjectStrings(target, item, key));
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  if (typeof value.en === "string") {
    addString(target, value.en);
    return;
  }
  for (const [childKey, childValue] of Object.entries(value)) {
    if (["en", "es", "ko", "zh"].includes(childKey)) {
      continue;
    }
    addVisibleObjectStrings(target, childValue, childKey);
  }
}

function collectFixtureCopy(target, fixture) {
  addStringArray(target, fixture?.resultStoryBullets);
  addStringArray(target, fixture?.resultHighlights);
  addVisibleObjectStrings(target, fixture?.scoreDetails);
  addVisibleObjectStrings(target, fixture?.shootoutOutlook);
  addVisibleObjectStrings(target, fixture?.shootoutForecast);
  addVisibleObjectStrings(target, fixture?.conditionalProjections);
  addVisibleObjectStrings(target, fixture?.catchUp);
}

function collectProfileCopy(target, profiles, options = {}) {
  for (const profile of Object.values(profiles || {})) {
    if (options.historical) {
      const hasAuthoredStyleNote = profile.styleNoteMeta?.origin === "authored";
      if (
        hasAuthoredStyleNote ||
        !isGeneratedPlayerCardCopy(profile.styleNote, {
          historical: true,
          copyMeta: profile.styleNoteMeta,
          localizedName: profile.displayName || profile.name
        })
      ) {
        addString(target, profile.styleNote);
      }
    }
    if (!isGeneratedPlayerCardCopy(profile.note, {
      historical: Boolean(options.historical),
      copyMeta: options.historical ? null : profile.noteMeta,
      localizedName: profile.displayName || profile.name
    })) {
      addString(target, profile.note);
    }
    // Player-card skill chips are localized through the compact deterministic
    // category formatter in each app pack. Shipping every generated English
    // phrase in this overlay adds weight and makes literal machine translation
    // regressions possible.
  }
}

function collectCoachCopy(target, profiles) {
  for (const profile of Object.values(profiles || {})) {
    addLocalizedEnglish(target, profile.note);
    addLocalizedEnglish(target, profile.history);
    addStringArray(target, profile.styles);
  }
}

function collectAvailabilityCopy(target, value) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectAvailabilityCopy(target, item));
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (
      ["cause", "detail", "ends", "explanation", "label", "origin", "reason"].includes(
        key
      )
    ) {
      addLocalizedEnglish(target, child);
    } else {
      collectAvailabilityCopy(target, child);
    }
  }
}

export function getSourceFingerprint(strings) {
  return crypto
    .createHash("sha256")
    .update([...strings].sort((left, right) => left.localeCompare(right, "en")).join("\n"))
    .digest("hex");
}

export function collectLocaleContentScopes(rootDir = defaultRootDir) {
  const current = new Set();
  const archive = new Set();
  const release = new Set();

  const fixtures = readJson(path.join(rootDir, "data", "fixtures.json"));
  addString(current, fixtures.coverage?.note);
  for (const fixture of fixtures.fixtures || []) {
    collectFixtureCopy(current, fixture);
  }

  const playerProfiles = readJson(path.join(rootDir, "data", "player-profiles.json"));
  collectProfileCopy(current, playerProfiles.profiles);

  const coachProfiles = readJson(path.join(rootDir, "data", "coach-profiles.json"));
  collectCoachCopy(current, coachProfiles.profiles);

  // Team style tags are exact reviewed app-pack terms, so the current overlay
  // must not duplicate them.

  const tournament = readJson(path.join(rootDir, "data", "tournament.json"));
  for (const item of tournament.catchUp || []) {
    for (const key of ["body", "headline", "label", "meta", "sourceLabel", "standouts", "summary"]) {
      addLocalizedEnglish(current, item[key]);
    }
  }

  // Expected-lineup provider metadata, evidence labels, formation ids, and
  // internal notes are not rendered. Visible coach/player copy is sourced from
  // the canonical profile and fixture files above, so collecting this whole
  // object would ship audit/debug text in every locale payload.

  const availability = readJson(path.join(rootDir, "data", "player-availability.json"));
  collectAvailabilityCopy(current, availability);

  const adminMessages = readJson(path.join(rootDir, "data", "admin-message.json"));
  for (const message of adminMessages.messages || []) {
    addLocalizedEnglish(current, message.message || message);
    addLocalizedEnglish(current, message.emphasis);
  }

  const history = readJson(path.join(rootDir, "data", "history.json"));
  addString(archive, history.coverage?.note);
  addString(archive, history.source?.label);
  for (const fixture of history.fixtures || []) {
    for (const story of fixture.resultStoryBullets || []) {
      if (!parseHistoricalResultStory(story)) {
        throw new Error(
          `Historical result story does not match a reviewed template: ${story}`
        );
      }
    }
  }

  const historicalProfiles = readJson(
    path.join(rootDir, "data", "historical-player-profiles.json")
  );
  collectProfileCopy(archive, historicalProfiles.profiles, { historical: true });

  const releaseNotes = readJson(path.join(rootDir, "data", "release-notes.json"));
  const latestRelease = [...(releaseNotes.releases || [])]
    .filter((item) => item && typeof item === "object")
    .sort(
      (left, right) =>
        new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime()
    )[0];
  if (latestRelease) {
    addString(release, latestRelease.title);
    addStringArray(release, latestRelease.highlights?.slice(0, 3));
  }

  return { current, archive, release };
}

export function getHistoricalVenueEntities(language, rootDir = defaultRootDir) {
  const source = readJson(
    path.join(rootDir, "data", "locales", "historical-venues.json")
  );
  const history = readJson(path.join(rootDir, "data", "history.json"));
  const expectedVenues = new Set(
    (history.fixtures || [])
      .map((fixture) => String(fixture?.venue || "").trim())
      .filter(Boolean)
  );
  const sourceVenues = source?.venues || {};
  const missing = [...expectedVenues].filter(
    (venue) => !String(sourceVenues[venue]?.[language] || "").trim()
  );
  const extra = Object.keys(sourceVenues).filter((venue) => !expectedVenues.has(venue));

  if (
    source?.schemaVersion !== 1 ||
    source?.coverage?.status !== "complete" ||
    Number(source?.coverage?.uniqueVenueCount) !== expectedVenues.size ||
    missing.length ||
    extra.length
  ) {
    throw new Error(
      `Historical venue map is invalid for ${language}: ${missing.length} missing, ${extra.length} extra`
    );
  }

  return Object.freeze({
    historicalVenues: Object.freeze(
      Object.fromEntries(
        [...expectedVenues]
          .sort((left, right) => left.localeCompare(right, "en"))
          .map((venue) => [venue, String(sourceVenues[venue][language]).trim()])
      )
    )
  });
}

function sortObject(value) {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right, "en"))
  );
}

function buildModule(source, scope, entities = {}) {
  const metadata = {
    schemaVersion: source.schemaVersion,
    language: source.language,
    scope: source.scope,
    sourceFingerprint: source.sourceFingerprint
  };
  const archiveImports =
    scope === "archive"
      ? `import {\n  localizeHistoricalResultStoryData,\n  parseHistoricalResultStory\n} from "../historical-result-templates.js";\nimport { formatHistoricalResultStory as formatLocaleHistoricalResultStory } from "./historical-results.js";\n\n`
      : "";
  const archiveFormatter =
    scope === "archive"
      ? `export function formatHistoricalResultStory(value, localizers = {}) {\n  const parsed = parseHistoricalResultStory(value);\n  return parsed\n    ? formatLocaleHistoricalResultStory(\n        localizeHistoricalResultStoryData(parsed, localizers)\n      )\n    : "";\n}\n\n`
      : "";
  const defaultFormatter =
    scope === "archive" ? ",\n  formatHistoricalResultStory" : "";
  return `// Generated by scripts/sync-locale-content.mjs.\n// Edit the matching data/locales source dictionary, not this module.\n\n${archiveImports}export const CONTENT_METADATA = Object.freeze(${JSON.stringify(metadata, null, 2)});\nexport const CONTENT_TRANSLATIONS = Object.freeze(${JSON.stringify(sortObject(source.translations), null, 2)});\nexport const CONTENT_ENTITIES = Object.freeze(${JSON.stringify(entities, null, 2)});\n\n${archiveFormatter}export default Object.freeze({\n  ...CONTENT_METADATA,\n  translations: CONTENT_TRANSLATIONS,\n  entities: CONTENT_ENTITIES${defaultFormatter}\n});\n`;
}

function validateSource(
  source,
  language,
  scope,
  requiredStrings,
  structuredTranslations = {}
) {
  const expectedFingerprint = getSourceFingerprint(requiredStrings);
  if (
    source?.schemaVersion !== 1 ||
    source?.language !== language ||
    source?.scope !== scope ||
    source?.sourceFingerprint !== expectedFingerprint ||
    !source?.translations ||
    typeof source.translations !== "object"
  ) {
    throw new Error(
      `Invalid or stale data/locales/${language}/${scope}-content.json metadata`
    );
  }

  const missing = [...requiredStrings].filter(
    (text) => !String(source.translations[text] || "").trim()
  );
  const extra = Object.keys(source.translations).filter((text) => !requiredStrings.has(text));
  const structuredMismatches = Object.entries(structuredTranslations)
    .filter(([text]) => requiredStrings.has(text))
    .filter(([text, expected]) => source.translations[text] !== expected)
    .map(
      ([text, expected]) =>
        `${text}: expected ${expected}; found ${source.translations[text] || "(missing)"}`
    );
  if (missing.length || extra.length) {
    throw new Error(
      `Locale ${language}/${scope} is out of sync: ${missing.length} missing, ${extra.length} extra`
    );
  }
  if (structuredMismatches.length) {
    throw new Error(
      `Locale ${language}/${scope} differs from the structured glossary: ${structuredMismatches
        .slice(0, 8)
        .join(" | ")}`
    );
  }
}

async function main() {
  const scopes = collectLocaleContentScopes(defaultRootDir);
  for (const language of LANGUAGES) {
    for (const scope of SCOPES) {
      const sourcePath = path.join(
        defaultRootDir,
        "data",
        "locales",
        language,
        `${scope}-content.json`
      );
      const outputPath = path.join(
        defaultRootDir,
        "locales",
        language,
        `content-${scope}.js`
      );
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Missing ${path.relative(defaultRootDir, sourcePath)}`);
      }
      const source = readJson(sourcePath);
      const structuredTranslations =
        scope === "current"
          ? getStructuredContentTranslations(language, defaultRootDir)
          : {};
      const factualTranslations =
        scope === "current"
          ? Object.fromEntries(
              [...scopes[scope]]
                .map((english) => [
                  english,
                  getCurrentFactualCopyOverride(language, english)
                ])
                .filter(([, localized]) => localized)
            )
          : {};
      const deterministicTranslations = {
        ...factualTranslations,
        ...(scope === "archive" ? getManifestArchiveTranslations(language, defaultRootDir) : {})
      };
      if (shouldWrite) {
        source.sourceFingerprint = getSourceFingerprint(scopes[scope]);
        source.translations = Object.fromEntries(
          [...scopes[scope]]
            .sort((left, right) => left.localeCompare(right, "en"))
            .map((english) => [
              english,
              deterministicTranslations[english] ||
                String(source.translations[english] || "").trim()
            ])
        );
      }
      validateSource(
        source,
        language,
        scope,
        scopes[scope],
        deterministicTranslations
      );
      if (shouldWrite) {
        fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 2)}\n`);
      }
      const entities =
        scope === "current"
          ? {
              structuredTranslations: Object.fromEntries(
                Object.entries(structuredTranslations)
                  .filter(
                    ([source, localized]) =>
                      source !== localized &&
                      !APP_PACKS[language]?.entities?.styleTerms?.[source]
                  )
                  .sort(([left], [right]) => left.localeCompare(right, "en"))
              )
            }
          : scope === "archive"
            ? getHistoricalVenueEntities(language, defaultRootDir)
            : {};
      const moduleContent = buildModule(source, scope, entities);

      if (shouldWrite) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, moduleContent);
      } else if (
        !fs.existsSync(outputPath) ||
        fs.readFileSync(outputPath, "utf8") !== moduleContent
      ) {
        throw new Error(`${path.relative(defaultRootDir, outputPath)} is stale`);
      }
    }
  }

  console.log(
    `Locale content sync passed: ${Object.entries(scopes)
      .map(([scope, values]) => `${scope} ${values.size}`)
      .join(", ")}`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
