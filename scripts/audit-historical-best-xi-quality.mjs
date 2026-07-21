#!/usr/bin/env node
import fs from "node:fs";
import {
  buildHistoricalBestXiDescriptionParagraphs,
  buildHistoricalBestXiEvidence
} from "../historical-best-xi-copy.js";
import { HISTORICAL_HIGHLIGHTS } from "../data/highlights-history.js";

const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(new URL(relativePath, import.meta.url), "utf8")
);

const EXPECTED_EDITION_COUNT = 22;
const EXPECTED_PLAYERS_PER_EDITION = 22;
const EXPECTED_STARTERS_PER_EDITION = 11;
const EXPECTED_HONOURABLES_PER_EDITION = 11;
const EXPECTED_PROFILE_COUNT = EXPECTED_EDITION_COUNT * EXPECTED_PLAYERS_PER_EDITION;
const EXPECTED_LANGUAGE_COUNT = 4;
const EXPECTED_APPEARANCE_TUPLES = 308;
const TOURNAMENT_VALUE_POLICY_START_YEAR = 2004;
const MINIMUM_TOURNAMENT_VALUE_COVERAGE = Object.freeze({
  2006: 7,
  2010: 21
});
const EXACT_TOURNAMENT_VALUE_COVERAGE = Object.freeze({
  2014: 22,
  2018: 22,
  2022: 22
});
const LANGUAGES = Object.freeze(["en", "es", "ko", "zh"]);
const PARAGRAPH_LENGTH_LIMITS = Object.freeze({
  en: Object.freeze({ minimum: 70, maximum: 300 }),
  es: Object.freeze({ minimum: 70, maximum: 340 }),
  ko: Object.freeze({ minimum: 30, maximum: 150 }),
  zh: Object.freeze({ minimum: 25, maximum: 110 })
});
const CLOSING_PUNCTUATION = /[.!?…。！？]$/u;

const profilesData = readJson("../data/historical-player-profiles.json");
const history = readJson("../data/history.json");
const rationaleLocales = new Map([
  ["es", readJson("../data/locales/es/historical-best-xi-reasons.json")],
  ["ko", readJson("../data/locales/ko/historical-best-xi-reasons.json")],
  ["zh", readJson("../data/locales/zh/historical-best-xi-reasons.json")]
]);

const issues = [];
const addIssue = (context, message) => {
  issues.push(`${context}: ${message}`);
};
const normalizeName = (value) => String(value || "")
  .normalize("NFD")
  .replace(/\p{Diacritic}/gu, "")
  .replace(/[^a-z0-9]/gi, "")
  .toLowerCase();
const normalizeParagraph = (value) => String(value || "").replace(/\s+/gu, " ").trim();
const normalizeRationale = (value) => normalizeParagraph(
  Array.isArray(value) ? value.join(" ") : value
);
const isStrictIsoDate = (value) => {
  const text = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
};
const isHttpsUrl = (value) => {
  try {
    return new URL(String(value || "")).protocol === "https:";
  } catch {
    return false;
  }
};
const hasContent = (value) => String(value || "").trim().length > 0;
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const isPositiveNumber = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;
const getAgeOnDate = (birthDate, referenceDate) => {
  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const [referenceYear, referenceMonth, referenceDay] = referenceDate.split("-").map(Number);
  const birthdayHasPassed = referenceMonth > birthMonth
    || (referenceMonth === birthMonth && referenceDay >= birthDay);
  return referenceYear - birthYear - (birthdayHasPassed ? 0 : 1);
};

for (const [language, localeData] of rationaleLocales) {
  if (localeData?.schemaVersion !== 1) {
    addIssue(language, "historical Best XI rationale pack must use schemaVersion 1");
  }
  if (localeData?.language !== language) {
    addIssue(language, "historical Best XI rationale pack has the wrong language tag");
  }
  if (!localeData?.reasons || typeof localeData.reasons !== "object") {
    addIssue(language, "historical Best XI rationale pack has no reasons object");
  }
}

const openingDateByYear = new Map(
  (history.tournaments || []).map((tournament) => [Number(tournament.year), tournament.startDate])
);
const editions = Object.entries(HISTORICAL_HIGHLIGHTS.editions || {})
  .map(([year, edition]) => [Number(year), edition])
  .sort(([left], [right]) => left - right);
if (editions.length !== EXPECTED_EDITION_COUNT) {
  addIssue("editions", `expected ${EXPECTED_EDITION_COUNT}, found ${editions.length}`);
}

const profileEntries = Object.entries(profilesData.profiles || {});
const bestXiProfileEntries = profileEntries.filter(([, profile]) => profile?.bestXiSelection === true);
if (bestXiProfileEntries.length !== EXPECTED_PROFILE_COUNT) {
  addIssue(
    "profiles",
    `expected exactly ${EXPECTED_PROFILE_COUNT} profiles marked bestXiSelection, found ${bestXiProfileEntries.length}`
  );
}

const profilesByYearAndName = new Map();
for (const [profileId, profile] of profileEntries) {
  const key = `${Number(profile?.tournamentYear)}|${normalizeName(profile?.name)}`;
  const candidates = profilesByYearAndName.get(key) || [];
  candidates.push({ profileId, profile });
  profilesByYearAndName.set(key, candidates);
}

const makeCoverage = () => ({
  selections: 0,
  starters: 0,
  honourables: 0,
  profiles: 0,
  births: 0,
  evidenceRecords: 0,
  localeDescriptions: 0,
  tournamentValues: 0,
  unavailableValues: 0,
  peakValues: 0
});
const coverageByYear = new Map(editions.map(([year]) => [year, makeCoverage()]));
const selectionRecords = [];

for (const [year, edition] of editions) {
  const coverage = coverageByYear.get(year);
  const starters = (edition.rows || []).flat();
  const honourables = starters.flatMap((starter) => starter.honourables || []);
  coverage.starters = starters.length;
  coverage.honourables = honourables.length;
  if (starters.length !== EXPECTED_STARTERS_PER_EDITION) {
    addIssue(year, `expected ${EXPECTED_STARTERS_PER_EDITION} starters, found ${starters.length}`);
  }
  if (honourables.length !== EXPECTED_HONOURABLES_PER_EDITION) {
    addIssue(year, `expected ${EXPECTED_HONOURABLES_PER_EDITION} honourable mentions, found ${honourables.length}`);
  }

  for (const [kind, entries] of [["starter", starters], ["honourable", honourables]]) {
    for (const entry of entries) {
      coverage.selections += 1;
      selectionRecords.push({ year, kind, entry });
    }
  }
}

if (selectionRecords.length !== EXPECTED_PROFILE_COUNT) {
  addIssue(
    "selections",
    `expected exactly ${EXPECTED_PROFILE_COUNT} starter and honourable player cards, found ${selectionRecords.length}`
  );
}

const selectedProfileIds = new Set();
let validBirthCount = 0;
let validEvidenceRecordCount = 0;
let appearanceTupleCount = 0;
let validLocaleDescriptionCount = 0;

for (const record of selectionRecords) {
  const { year, kind, entry } = record;
  const context = `${year} ${entry?.playerName || "unnamed player"} (${kind})`;
  const coverage = coverageByYear.get(year);
  const openingDate = openingDateByYear.get(year);
  if (!isStrictIsoDate(openingDate)) {
    addIssue(context, `edition has no valid tournament opening date (${openingDate || "missing"})`);
  }

  const lookupKey = `${year}|${normalizeName(entry?.playerName)}`;
  const candidates = profilesByYearAndName.get(lookupKey) || [];
  const teamMatches = candidates.filter(({ profile }) => (
    normalizeName(profile?.teamName) === normalizeName(entry?.teamName)
  ));
  const resolved = teamMatches.length === 1
    ? teamMatches[0]
    : candidates.length === 1
      ? candidates[0]
      : null;
  if (!resolved) {
    addIssue(context, `expected one matching historical profile, found ${teamMatches.length || candidates.length}`);
    continue;
  }

  const { profileId, profile } = resolved;
  coverage.profiles += 1;
  if (selectedProfileIds.has(profileId)) {
    addIssue(context, `profile ${profileId} is reused by more than one displayed player card`);
  }
  selectedProfileIds.add(profileId);
  if (profile?.bestXiSelection !== true) {
    addIssue(context, "profile is not marked bestXiSelection");
  }
  if (!Array.isArray(profile?.bestXiSelectionKinds) || !profile.bestXiSelectionKinds.includes(kind)) {
    addIssue(context, `profile is not marked for the ${kind} selection kind`);
  }
  if (normalizeName(profile?.teamName) !== normalizeName(entry?.teamName)) {
    addIssue(context, `profile team ${profile?.teamName || "missing"} does not match ${entry?.teamName || "missing"}`);
  }

  let validBirth = true;
  if (!isStrictIsoDate(profile?.birthDate)) {
    validBirth = false;
    addIssue(context, `birthDate must be a real ISO date, found ${profile?.birthDate || "missing"}`);
  } else if (isStrictIsoDate(openingDate)) {
    const age = getAgeOnDate(profile.birthDate, openingDate);
    if (age < 16 || age > 46) {
      validBirth = false;
      addIssue(context, `age ${age} on ${openingDate} is not plausible for a World Cup player`);
    }
  }
  if (!hasContent(profile?.birthDateSource)) {
    validBirth = false;
    addIssue(context, "birthDate needs a source identifier");
  }
  if (!isHttpsUrl(profile?.birthDateSourceUrl)) {
    validBirth = false;
    addIssue(context, "birthDate needs an HTTPS source URL");
  }
  if (validBirth) {
    coverage.births += 1;
    validBirthCount += 1;
  }

  let validEvidenceRecord = true;
  for (const field of [
    "teamTournamentMatchCount",
    "teamTournamentCleanSheets",
    "teamTournamentGoalsFor",
    "teamTournamentGoalsAgainst"
  ]) {
    if (!isNonNegativeInteger(profile?.[field])) {
      validEvidenceRecord = false;
      addIssue(context, `${field} must be a non-negative integer`);
    }
  }
  if (isNonNegativeInteger(profile?.teamTournamentMatchCount) && profile.teamTournamentMatchCount < 1) {
    validEvidenceRecord = false;
    addIssue(context, "teamTournamentMatchCount must be positive");
  }
  if (
    isNonNegativeInteger(profile?.teamTournamentCleanSheets)
    && isNonNegativeInteger(profile?.teamTournamentMatchCount)
    && profile.teamTournamentCleanSheets > profile.teamTournamentMatchCount
  ) {
    validEvidenceRecord = false;
    addIssue(context, "teamTournamentCleanSheets cannot exceed teamTournamentMatchCount");
  }
  if (!hasContent(profile?.tournamentTeamPerformance)) {
    validEvidenceRecord = false;
    addIssue(context, "tournamentTeamPerformance is missing");
  }
  const hasAppearances = hasOwn(profile, "tournamentAppearances");
  const hasStarts = hasOwn(profile, "tournamentStarts");
  if (hasAppearances !== hasStarts) {
    validEvidenceRecord = false;
    addIssue(context, "tournamentAppearances and tournamentStarts must be supplied together");
  } else if (hasAppearances && hasStarts) {
    appearanceTupleCount += 1;
    if (!isNonNegativeInteger(profile.tournamentAppearances) || profile.tournamentAppearances < 1) {
      validEvidenceRecord = false;
      addIssue(context, "tournamentAppearances must be a positive integer when supplied");
    }
    if (!isNonNegativeInteger(profile.tournamentStarts)) {
      validEvidenceRecord = false;
      addIssue(context, "tournamentStarts must be a non-negative integer when supplied");
    }
    if (
      isNonNegativeInteger(profile.tournamentStarts)
      && isNonNegativeInteger(profile.tournamentAppearances)
      && profile.tournamentStarts > profile.tournamentAppearances
    ) {
      validEvidenceRecord = false;
      addIssue(context, "tournamentStarts cannot exceed tournamentAppearances");
    }
    if (
      isNonNegativeInteger(profile.tournamentAppearances)
      && isNonNegativeInteger(profile.teamTournamentMatchCount)
      && profile.tournamentAppearances > profile.teamTournamentMatchCount
    ) {
      validEvidenceRecord = false;
      addIssue(context, "tournamentAppearances cannot exceed the team's tournament match count");
    }
  }
  if (validEvidenceRecord) {
    coverage.evidenceRecords += 1;
    validEvidenceRecordCount += 1;
  }

  const tournamentValue = profile?.marketValueAtTournamentEurMillions;
  const hasTournamentValue = isPositiveNumber(tournamentValue);
  const unavailableReason = String(profile?.marketValueAtTournamentUnavailableReason || "").trim();
  if (hasTournamentValue) {
    coverage.tournamentValues += 1;
    if (unavailableReason) {
      addIssue(context, "available tournament value conflicts with marketValueAtTournamentUnavailableReason");
    }
    if (!isStrictIsoDate(profile?.marketValueAtTournamentDate)) {
      addIssue(context, "positive tournament value needs a real ISO marketValueAtTournamentDate");
    } else if (isStrictIsoDate(openingDate) && profile.marketValueAtTournamentDate > openingDate) {
      addIssue(
        context,
        `tournament value date ${profile.marketValueAtTournamentDate} is after the ${openingDate} opening`
      );
    }
    if (!hasContent(profile?.marketValueAtTournamentSource)) {
      addIssue(context, "positive tournament value needs a source identifier");
    }
    if (!isHttpsUrl(profile?.marketValueAtTournamentSourceUrl)) {
      addIssue(context, "positive tournament value needs an HTTPS source URL");
    }
  } else {
    if (hasOwn(profile, "marketValueAtTournamentEurMillions") && tournamentValue != null) {
      addIssue(context, "marketValueAtTournamentEurMillions must be a positive number or be absent");
    }
    if (!unavailableReason) {
      addIssue(context, "missing tournament value needs marketValueAtTournamentUnavailableReason");
    } else {
      coverage.unavailableValues += 1;
    }
    for (const field of [
      "marketValueAtTournamentDate",
      "marketValueAtTournamentSource",
      "marketValueAtTournamentSourceUrl"
    ]) {
      if (hasContent(profile?.[field])) {
        addIssue(context, `${field} must be absent when the tournament value is unavailable`);
      }
    }
  }
  if (year < TOURNAMENT_VALUE_POLICY_START_YEAR && hasTournamentValue) {
    addIssue(
      context,
      `pre-${TOURNAMENT_VALUE_POLICY_START_YEAR} editions must not claim tournament-date values without a reviewed source-policy change`
    );
  }

  const peakValue = profile?.peakMarketValueEurMillions;
  const peakTuplePresent = [
    peakValue,
    profile?.peakMarketValueSource,
    profile?.peakMarketValueSourceUrl
  ].some((value) => value !== undefined && value !== null && value !== "");
  const hasPeakValue = isPositiveNumber(peakValue);
  if (peakTuplePresent) {
    if (!hasPeakValue) {
      addIssue(context, "peakMarketValueEurMillions must be a positive number when peak provenance is present");
    } else {
      coverage.peakValues += 1;
    }
    if (!hasContent(profile?.peakMarketValueSource)) {
      addIssue(context, "peak market value needs a source identifier");
    }
    if (!isHttpsUrl(profile?.peakMarketValueSourceUrl)) {
      addIssue(context, "peak market value needs an HTTPS source URL");
    }
  }
  if (hasTournamentValue) {
    if (!hasPeakValue) {
      addIssue(context, "positive tournament value needs a sourced peak market-value tuple");
    } else if (peakValue < tournamentValue) {
      addIssue(context, `peak market value ${peakValue} is below tournament value ${tournamentValue}`);
    }
  }

  for (const language of LANGUAGES) {
    const rationaleKey = `${year}|player|${entry.playerName}`;
    const rawRationale = language === "en"
      ? entry?.reason?.en
      : rationaleLocales.get(language)?.reasons?.[rationaleKey];
    const rationale = normalizeRationale(rawRationale);
    const localeContext = `${context} ${language}`;
    let validDescription = true;
    if (!rationale) {
      validDescription = false;
      addIssue(localeContext, `missing localized player rationale ${rationaleKey}`);
    }

    const copyInput = {
      ...profile,
      profile,
      language,
      locale: language,
      playerName: entry.playerName,
      teamName: entry.teamName,
      tournamentYear: year,
      position: entry.position || profile.position,
      existingRationale: rationale,
      fallbackRationale: rationale
    };
    let evidenceParagraph = "";
    let paragraphs = null;
    try {
      evidenceParagraph = normalizeParagraph(buildHistoricalBestXiEvidence(copyInput));
      paragraphs = buildHistoricalBestXiDescriptionParagraphs(copyInput, rationale);
    } catch (error) {
      validDescription = false;
      addIssue(localeContext, `copy helper threw: ${error?.message || error}`);
    }

    if (!Array.isArray(paragraphs) || paragraphs.length !== 2) {
      validDescription = false;
      addIssue(localeContext, "copy helper must return exactly two paragraphs");
    } else {
      const normalizedParagraphs = paragraphs.map(normalizeParagraph);
      if (normalizedParagraphs.some((paragraph) => !paragraph)) {
        validDescription = false;
        addIssue(localeContext, "both description paragraphs must be nonempty");
      }
      if (normalizedParagraphs[0] !== evidenceParagraph) {
        validDescription = false;
        addIssue(localeContext, "first paragraph must be the evidence helper output");
      }
      if (normalizedParagraphs[1] !== rationale) {
        validDescription = false;
        addIssue(localeContext, "second paragraph must preserve the existing localized rationale");
      }
      if (normalizedParagraphs[0] && normalizedParagraphs[0] === normalizedParagraphs[1]) {
        validDescription = false;
        addIssue(localeContext, "evidence and rationale paragraphs must not be duplicates");
      }
      const limits = PARAGRAPH_LENGTH_LIMITS[language];
      for (const [index, paragraph] of normalizedParagraphs.entries()) {
        const paragraphNumber = index + 1;
        const length = [...paragraph].length;
        if (!CLOSING_PUNCTUATION.test(paragraph)) {
          validDescription = false;
          addIssue(localeContext, `paragraph ${paragraphNumber} needs closing punctuation`);
        }
        if (length < limits.minimum || length > limits.maximum) {
          validDescription = false;
          addIssue(
            localeContext,
            `paragraph ${paragraphNumber} length ${length} is outside ${limits.minimum}-${limits.maximum}`
          );
        }
      }
    }
    if (validDescription) {
      coverage.localeDescriptions += 1;
      validLocaleDescriptionCount += 1;
    }
  }
}

if (selectedProfileIds.size !== EXPECTED_PROFILE_COUNT) {
  addIssue(
    "profiles",
    `expected ${EXPECTED_PROFILE_COUNT} unique displayed profile records, resolved ${selectedProfileIds.size}`
  );
}
for (const [profileId] of bestXiProfileEntries) {
  if (!selectedProfileIds.has(profileId)) {
    addIssue("profiles", `${profileId} is marked bestXiSelection but is not a displayed starter or honourable player`);
  }
}
if (validBirthCount !== EXPECTED_PROFILE_COUNT) {
  addIssue("birth dates", `expected ${EXPECTED_PROFILE_COUNT} valid sourced dates, found ${validBirthCount}`);
}
if (validEvidenceRecordCount !== EXPECTED_PROFILE_COUNT) {
  addIssue("evidence", `expected ${EXPECTED_PROFILE_COUNT} complete team evidence records, found ${validEvidenceRecordCount}`);
}
if (appearanceTupleCount !== EXPECTED_APPEARANCE_TUPLES) {
  addIssue(
    "evidence",
    `expected ${EXPECTED_APPEARANCE_TUPLES} sourced appearance/start tuples for 1970-2022, found ${appearanceTupleCount}`
  );
}
const expectedLocaleDescriptions = EXPECTED_PROFILE_COUNT * EXPECTED_LANGUAGE_COUNT;
if (validLocaleDescriptionCount !== expectedLocaleDescriptions) {
  addIssue(
    "descriptions",
    `expected ${expectedLocaleDescriptions} valid two-paragraph localized descriptions, found ${validLocaleDescriptionCount}`
  );
}

for (const [year, coverage] of coverageByYear) {
  if (year < TOURNAMENT_VALUE_POLICY_START_YEAR && coverage.tournamentValues !== 0) {
    addIssue(year, `expected no tournament-date values before ${TOURNAMENT_VALUE_POLICY_START_YEAR}`);
  }
  const minimum = MINIMUM_TOURNAMENT_VALUE_COVERAGE[year];
  if (minimum != null && coverage.tournamentValues < minimum) {
    addIssue(year, `expected at least ${minimum} sourced tournament values, found ${coverage.tournamentValues}`);
  }
  const exact = EXACT_TOURNAMENT_VALUE_COVERAGE[year];
  if (exact != null && coverage.tournamentValues !== exact) {
    addIssue(year, `expected exactly ${exact} sourced tournament values, found ${coverage.tournamentValues}`);
  }
}

console.log("Historical Best XI quality coverage (coaches excluded):");
for (const [year, coverage] of coverageByYear) {
  console.log(
    `- ${year}: profiles ${coverage.profiles}/${EXPECTED_PLAYERS_PER_EDITION}; `
    + `births ${coverage.births}/${EXPECTED_PLAYERS_PER_EDITION}; `
    + `evidence ${coverage.evidenceRecords}/${EXPECTED_PLAYERS_PER_EDITION}; `
    + `two-paragraph locale descriptions ${coverage.localeDescriptions}/${EXPECTED_PLAYERS_PER_EDITION * EXPECTED_LANGUAGE_COUNT}; `
    + `tournament values ${coverage.tournamentValues}/${EXPECTED_PLAYERS_PER_EDITION}; `
    + `unavailable ${coverage.unavailableValues}/${EXPECTED_PLAYERS_PER_EDITION}; `
    + `peaks ${coverage.peakValues}/${EXPECTED_PLAYERS_PER_EDITION}.`
  );
}

if (issues.length) {
  console.error(`Historical Best XI quality audit found ${issues.length} issue${issues.length === 1 ? "" : "s"}:`);
  for (const issue of issues.slice(0, 120)) {
    console.error(`- ${issue}`);
  }
  if (issues.length > 120) {
    console.error(`...and ${issues.length - 120} more`);
  }
  process.exit(1);
}

console.log(
  `Historical Best XI quality audit passed: ${EXPECTED_PROFILE_COUNT} player profiles, `
  + `${EXPECTED_PROFILE_COUNT} sourced birth dates, ${EXPECTED_PROFILE_COUNT} evidence records, `
  + `${expectedLocaleDescriptions} two-paragraph localized descriptions, and complete tournament-value provenance checks.`
);
