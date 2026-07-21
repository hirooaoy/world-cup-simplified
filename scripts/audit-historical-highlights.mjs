import assert from "node:assert/strict";
import fs from "node:fs";
import {
  HISTORICAL_HIGHLIGHTS,
  HISTORICAL_NEXT_WORLD_CUP_PREVIEWS,
  HISTORICAL_STORY_PROFILE_OVERRIDES
} from "../data/highlights-history.js";

const readJson = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
const history = readJson("../data/history.json");
const awards = readJson("../data/world-cup-awards.json");
const historicalAwardLocales = new Map([
  ["en", readJson("../data/historical-awards.json")],
  ["es", readJson("../data/locales/es/historical-awards.json")],
  ["ko", readJson("../data/locales/ko/historical-awards.json")],
  ["zh", readJson("../data/locales/zh/historical-awards.json")]
]);
const historicalStoryLocales = new Map([
  ["en", readJson("../data/historical-stories.json")],
  ["es", readJson("../data/locales/es/historical-stories.json")],
  ["ko", readJson("../data/locales/ko/historical-stories.json")],
  ["zh", readJson("../data/locales/zh/historical-stories.json")]
]);
const historicalRankings = readJson("../data/historical-rankings.json");
const historicalProfiles = readJson("../data/historical-player-profiles.json");
const coachProfiles = readJson("../data/coach-profiles.json");
const expectedYears = history.tournaments.map(({ year }) => year);
const editorialYears = Object.keys(HISTORICAL_HIGHLIGHTS.editions).map(Number);
const previewYears = Object.keys(HISTORICAL_NEXT_WORLD_CUP_PREVIEWS).map(Number);
const sourceIds = new Set(awards.sources.map(({ id }) => id));
const validPositions = new Set(["GK", "RB", "CB", "LB", "DM", "CM", "RCM", "LCM", "RW", "AM", "LM", "LW", "SS", "F9", "ST"]);
const validQualificationModes = new Set(["host_must_qualify", "replacement_host", "hosts_and_holders", "hosts_only"]);
const normalizeName = (value) => String(value || "")
  .normalize("NFD")
  .replace(/\p{Diacritic}/gu, "")
  .replace(/[^a-z0-9]/gi, "")
  .toLowerCase();
const STORY_ENTITY_PATTERN = /\{(team|player):([^|{}]+)\|([^{}]+)\}/gu;
const getStoryEntityTokens = (story) => [story?.title, story?.body]
  .flatMap((value) => [...String(value || "").matchAll(STORY_ENTITY_PATTERN)])
  .map(([, type, canonicalName, visibleText]) => ({
    type,
    canonicalName: canonicalName.trim(),
    visibleText: visibleText.trim()
  }));
const stripStoryEntityTokens = (value) => String(value || "")
  .replace(STORY_ENTITY_PATTERN, (_, type, canonicalName, visibleText) => visibleText)
  .trim();
const findHistoricalProfile = (year, playerName) => Object.values(historicalProfiles.profiles || {})
  .find((profile) =>
    Number(profile?.tournamentYear) === Number(year)
      && normalizeName(profile?.name) === normalizeName(playerName)
  ) || null;
const resolveHistoricalStoryProfile = (year, playerName) => {
  const directProfile = findHistoricalProfile(year, playerName);
  if (directProfile) return directProfile;
  const override = HISTORICAL_STORY_PROFILE_OVERRIDES[`${year}|${playerName}`];
  if (!override) return null;
  const sourceProfile = override.profileYear
    ? findHistoricalProfile(override.profileYear, playerName)
    : null;
  return { ...(sourceProfile || {}), ...override };
};
const ambiguousPortraitIdentities = new Map([
  ["1978:oscar", {
    birthDate: "1954-06-20",
    displayName: "Oscar Bernardi",
    wrongReference: /20141118[_%]|born_1991/i
  }],
  ["1982:eder", {
    birthDate: "1957-05-25",
    wrongReference: /Eder-Sao-Paulo-Juventude|born_1986/i
  }],
  ["1982:junior", {
    birthDate: "1954-06-29",
    wrongReference: /Jen(?:%C3%AD|í)lson|born_1973/i
  }],
  ["1986:juliocesar", {
    birthDate: "1963-03-08",
    wrongReference: /FC_Internazionale|football_goalkeeper/i
  }],
  ["2006:patrickvieira", {
    birthDate: "1976-06-23",
    wrongReference: /224852|1991-01-22/i
  }],
  ["2010:luissuarez", {
    birthDate: "1987-01-24",
    wrongReference: /f945c83f-4b62-4d89-8a50-4408abefa6b7|born_1997/i
  }]
]);
const curatedPortraitReferences = new Map([
  ["1930:enriqueballestrero", /Enrique%20ballestrero%20en%20el%20arco/i],
  ["1930:ernestomascheroni", /ernesto_mascheroni\.jpg/i],
  ["1938:martimsilveira", /w500_h140_qfl_fto_14332\.webp/i],
  ["1950:chico", /w500_h360_qfl_fto_12982\.webp/i],
  ["1954:wernerkohlmeyer", /Werner%20Kohlmeyer%201954/i],
  ["1958:svenaxbom", /Sven%20Axbom%201960/i],
  ["1958:yurivoynov", /vionov\.jpg/i],
  ["1966:raywilson", /ray-800-wilson-action\.ashx/i]
]);
const historicalProfileByYearAndName = new Map(
  Object.values(historicalProfiles.profiles || {}).map((profile) => [
    `${Number(profile?.tournamentYear)}:${normalizeName(profile?.name)}`,
    profile
  ])
);
const coachProfileByName = new Map(
  Object.values(coachProfiles.profiles || {}).map((profile) => [normalizeName(profile?.name), profile])
);
const reasonLength = (reason) => (Array.isArray(reason) ? reason.join(" ") : String(reason || "")).trim().length;
const expectedHistoricalAwardLabelKeys = [
  "fairPlay",
  "goldenBall",
  "goldenBoot",
  "goldenGlove",
  "goldenShoe",
  "jointLeadingScorers",
  "leadingScorer",
  "yashinAward",
  "youngPlayer"
];
const historicalAwardMinimumLengths = Object.freeze({
  en: Object.freeze({ stat: 8, context: 20 }),
  es: Object.freeze({ stat: 8, context: 20 }),
  ko: Object.freeze({ stat: 3, context: 15 }),
  zh: Object.freeze({ stat: 3, context: 15 })
});
const expectedFairPlayCaptains = Object.freeze({
  1970: ["Héctor Chumpitaz"],
  1974: ["Franz Beckenbauer"],
  1978: ["Daniel Passarella"],
  1982: ["Sócrates"],
  1986: ["Edinho"],
  1990: ["Bryan Robson", "Peter Shilton", "Terry Butcher"],
  1994: ["Raí", "Dunga"],
  1998: ["Alan Shearer", "Didier Deschamps"],
  2002: ["Marc Wilmots"],
  2006: ["Cafu", "Iker Casillas", "Raúl González"],
  2010: ["Iker Casillas"],
  2014: ["Mario Yepes"],
  2018: ["Sergio Ramos"],
  2022: ["Harry Kane"]
});
const historicalBestXiReasonByKey = new Map();
for (const [year, edition] of Object.entries(HISTORICAL_HIGHLIGHTS.editions)) {
  historicalBestXiReasonByKey.set(`${year}|coach|${edition.coach.name}`, edition.coach.reason?.en || "");
  for (const row of edition.rows) {
    for (const starter of row) {
      historicalBestXiReasonByKey.set(`${year}|player|${starter.playerName}`, starter.reason?.en || "");
      for (const honourable of starter.honourables || []) {
        historicalBestXiReasonByKey.set(`${year}|player|${honourable.playerName}`, honourable.reason?.en || "");
      }
    }
  }
}
const reasonLocaleMinimumLengths = Object.freeze({ es: 90, zh: 25, ko: 35 });
assert.equal(historicalBestXiReasonByKey.size, 506, "Historical Best XI rationale keys must stay unique by edition and subject.");
for (const [language, minimumLength] of Object.entries(reasonLocaleMinimumLengths)) {
  const localeData = readJson(`../data/locales/${language}/historical-best-xi-reasons.json`);
  assert.equal(localeData.schemaVersion, 1, `${language}: invalid historical Best XI rationale schema.`);
  assert.equal(localeData.language, language, `${language}: historical Best XI rationale language mismatch.`);
  const localizedReasons = localeData.reasons || {};
  assert.deepEqual(
    Object.keys(localizedReasons).sort(),
    [...historicalBestXiReasonByKey.keys()].sort(),
    `${language}: historical Best XI rationale keys must exactly match every coach and displayed player.`
  );
  for (const [reasonKey, englishReason] of historicalBestXiReasonByKey) {
    const localizedReason = String(localizedReasons[reasonKey] || "").trim();
    assert.ok(localizedReason.length >= minimumLength, `${language}: ${reasonKey} rationale is too shallow.`);
    assert.notEqual(localizedReason, englishReason, `${language}: ${reasonKey} still falls back to English.`);
  }
}

assert.deepEqual(editorialYears, expectedYears, "Editorial coverage must match every history.json edition in order.");
assert.deepEqual(previewYears, expectedYears, "Next-World-Cup previews must match every historical edition in order.");
assert.equal(HISTORICAL_HIGHLIGHTS.schemaVersion, 1);
assert.ok(HISTORICAL_HIGHLIGHTS.methodology.length >= 180, "Methodology must explain the editorial selection lens.");

for (const [language, localeData] of historicalAwardLocales) {
  assert.equal(localeData.schemaVersion, 1, `${language}: invalid historical awards schema version.`);
  assert.equal(localeData.language, language, `${language}: historical awards language mismatch.`);
  assert.equal(localeData.domain, "historical-awards", `${language}: historical awards domain mismatch.`);
  assert.ok(localeData.methodology?.length >= 80, `${language}: historical awards methodology is too thin.`);
  assert.deepEqual(
    Object.keys(localeData.labels || {}).sort(),
    expectedHistoricalAwardLabelKeys,
    `${language}: historical award labels are incomplete.`
  );
  assert.deepEqual(
    Object.keys(localeData.editions || {}).map(Number),
    expectedYears,
    `${language}: historical award copy must cover every archived edition in order.`
  );
}

assert.deepEqual(
  Object.keys(historicalRankings.editions || {}).map(Number),
  expectedYears,
  "Historical ranking snapshots must cover every archived edition in order."
);
for (const [language, localeData] of historicalStoryLocales) {
  assert.equal(localeData.schemaVersion, 1, `${language}: invalid historical stories schema version.`);
  assert.equal(localeData.language, language, `${language}: historical stories language mismatch.`);
  assert.equal(localeData.domain, "historical-stories", `${language}: historical stories domain mismatch.`);
  assert.ok(localeData.methodology?.trim().length >= 25, `${language}: historical stories methodology is too thin.`);
  assert.deepEqual(
    Object.keys(localeData.editions || {}).map(Number),
    expectedYears,
    `${language}: historical stories must cover every archived edition in order.`
  );
}

for (const [yearIndex, year] of expectedYears.entries()) {
  const tournament = history.tournaments.find((item) => item.year === year);
  const edition = HISTORICAL_HIGHLIGHTS.editions[year];
  const preview = HISTORICAL_NEXT_WORLD_CUP_PREVIEWS[year];
  const expectedNextYear = expectedYears[yearIndex + 1] || 2026;
  const starters = edition.rows.flat();
  const honourables = starters.flatMap((entry) => entry.honourables || []);
  const teamNames = new Set(tournament.teams);
  const starterNames = starters.map(({ playerName }) => playerName);
  const displayedNames = [...starters, ...honourables].map(({ playerName }) => normalizeName(playerName));
  const rankingSnapshot = historicalRankings.editions[String(year)];
  const englishStories = historicalStoryLocales.get("en").editions[String(year)];

  assert.equal(starters.length, 11, `${year}: expected 11 starters.`);
  assert.equal(new Set(starterNames).size, 11, `${year}: starter names must be unique.`);
  assert.equal(honourables.length, 11, `${year}: every slot needs one visible honourable mention.`);
  assert.equal(new Set(displayedNames).size, 22, `${year}: starters and honourable mentions must be unique across the full displayed selection.`);
  assert.equal(edition.highlights.length, 3, `${year}: expected exactly three defining stories.`);
  assert.equal(rankingSnapshot?.rankingSystem, year <= 1990 ? "elo" : "fifa", `${year}: historical ranking system mismatch.`);
  assert.match(rankingSnapshot?.rankingDate || "", /^\d{4}-\d{2}-\d{2}$/, `${year}: missing historical ranking date.`);
  assert.ok(edition.formation, `${year}: missing formation.`);
  assert.deepEqual(
    edition.formation.split("-").map(Number),
    edition.rows.slice(1).map((row) => row.length),
    `${year}: formation label does not match the rendered rows.`
  );
  assert.ok(edition.coach?.name && edition.coach?.teamName, `${year}: missing coach.`);
  assert.ok(edition.coach.reason?.en?.length >= 100, `${year}: coach reasoning is too shallow.`);
  const coachProfile = coachProfileByName.get(normalizeName(edition.coach.name));
  const coachImageUrl = edition.coach.imageUrl || coachProfile?.imageUrl || "";
  const coachImageSourceUrl = edition.coach.imageSourceUrl || coachProfile?.sourceUrl || "";
  assert.match(coachImageUrl, /^https:\/\//, `${year}: ${edition.coach.name} needs a durable HTTPS portrait.`);
  assert.match(coachImageSourceUrl, /^https:\/\//, `${year}: ${edition.coach.name} needs an HTTPS portrait source page.`);
  if (edition.coach.imageUrl) {
    assert.ok(edition.coach.imageCredit?.trim(), `${year}: ${edition.coach.name} needs portrait credit.`);
    assert.ok(edition.coach.imageLicense?.trim(), `${year}: ${edition.coach.name} needs portrait licensing context.`);
  }
  assert.ok(edition.intro.length >= 150, `${year}: champion summary is too shallow.`);
  assert.ok(teamNames.has(edition.champion), `${year}: champion did not participate.`);
  assert.ok(teamNames.has(edition.coach.teamName), `${year}: coach team did not participate.`);

  assert.equal(preview.nextYear, expectedNextYear, `${year}: preview must point to the next World Cup.`);
  assert.ok(preview.hosts.length >= 1, `${year}: preview must name at least one host.`);
  assert.ok(validQualificationModes.has(preview.qualificationMode), `${year}: unsupported qualification mode.`);
  assert.match(preview.drawDate, /^\d{4}-\d{2}-\d{2}$/, `${year}: invalid final-draw date.`);
  assert.ok(preview.drawLocation, `${year}: missing final-draw location.`);
  assert.ok(preview.sources.length >= 1, `${year}: preview must include research sources.`);
  for (const sourceUrl of preview.sources) {
    assert.match(sourceUrl, /^https:\/\//, `${year}: preview source must be an HTTPS URL.`);
  }
  for (const textKey of ["lead", "firstTitle", "firstBody", "drawTitle", "drawBody", "openingBody"]) {
    assert.ok(preview[textKey]?.length >= (textKey.endsWith("Title") ? 8 : 25), `${year}: preview ${textKey} is too thin.`);
  }
  assert.match(preview.firstDate, /^\d{4}-\d{2}-\d{2}$/, `${year}: missing or invalid first-milestone date.`);
  assert.ok(preview.firstDate <= preview.drawDate, `${year}: first milestone must not follow the draw.`);
  assert.ok(preview.drawDate < (preview.startDate || "9999-12-31"), `${year}: draw must precede the tournament start.`);
  if (preview.qualificationMode !== "host_must_qualify") {
    const expectedHolderName = year === 1990 ? "Germany" : edition.champion;
    assert.equal(preview.holder, expectedHolderName, `${year}: defending champion must match the completed edition's winner.`);
  }
  if (preview.nextYear === 2026) {
    assert.match(preview.startDate, /^\d{4}-\d{2}-\d{2}$/, `${year}: 2026 preview needs an opening date.`);
    assert.ok(preview.opening?.home && preview.opening?.away && preview.opening?.venue, `${year}: 2026 preview needs the opening fixture and venue.`);
  } else {
    const nextTournament = history.tournaments.find(({ year: tournamentYear }) => tournamentYear === preview.nextYear);
    const openingFixture = history.fixtures.find(({ id }) => id === preview.openingFixtureId);
    assert.ok(nextTournament, `${year}: next tournament ${preview.nextYear} is missing from history.json.`);
    assert.ok(openingFixture, `${year}: unknown opening fixture ${preview.openingFixtureId}.`);
    assert.equal(openingFixture.tournamentYear, preview.nextYear, `${year}: opening fixture belongs to the wrong edition.`);
    assert.equal(openingFixture.date, nextTournament.startDate, `${year}: opening fixture must fall on the tournament start date.`);
    for (const host of preview.hosts) {
      const historyHostName = host === "United States" ? "USA" : host;
      assert.ok(nextTournament.teams.includes(historyHostName), `${year}: host ${host} did not participate in ${preview.nextYear}.`);
    }
    assert.ok(preview.drawDate < openingFixture.date, `${year}: draw must precede the opening fixture.`);
  }

  for (const [kind, entries] of [["starter", starters], ["honourable", honourables]]) {
    for (const entry of entries) {
      const profile = historicalProfileByYearAndName.get(`${year}:${normalizeName(entry.playerName)}`);
      assert.ok(entry.playerName, `${year}: unnamed Best XI entry.`);
      assert.ok(teamNames.has(entry.teamName), `${year}: ${entry.playerName}'s team ${entry.teamName} did not participate.`);
      assert.ok(validPositions.has(entry.position), `${year}: ${entry.playerName} has unsupported position ${entry.position}.`);
      assert.ok(reasonLength(entry.reason?.en) >= 100, `${year}: ${entry.playerName}'s ${kind} reasoning is too shallow.`);
      assert.ok(profile, `${year}: ${entry.playerName} is missing a historical Best XI profile.`);
      assert.equal(profile?.bestXiSelection, true, `${year}: ${entry.playerName}'s profile is not marked as a Best XI selection.`);
      assert.ok(profile?.bestXiSelectionKinds?.includes(kind), `${year}: ${entry.playerName}'s profile is missing its ${kind} selection role.`);
      assert.match(profile?.imageUrl || "", /^https:\/\//, `${year}: ${entry.playerName} needs a durable HTTPS portrait.`);
      assert.match(
        profile?.imageSourceUrl || profile?.imagePageUrl || profile?.sourceUrl || "",
        /^https:\/\//,
        `${year}: ${entry.playerName} needs an HTTPS portrait source page.`
      );
      const portraitIdentity = ambiguousPortraitIdentities.get(`${year}:${normalizeName(entry.playerName)}`);
      if (portraitIdentity) {
        assert.equal(
          profile?.birthDate,
          portraitIdentity.birthDate,
          `${year}: ${entry.playerName}'s portrait identity has the wrong birth date.`
        );
        if (portraitIdentity.displayName) {
          assert.equal(
            profile?.displayName,
            portraitIdentity.displayName,
            `${year}: ${entry.playerName}'s ambiguous display name is not disambiguated.`
          );
        }
        assert.doesNotMatch(
          [
            profile?.imageUrl,
            profile?.imageSourceUrl,
            profile?.imagePageTitle,
            profile?.imagePageUrl
          ].filter(Boolean).join(" "),
          portraitIdentity.wrongReference,
          `${year}: ${entry.playerName}'s portrait still resolves to a known namesake.`
        );
      }
      const curatedPortraitReference = curatedPortraitReferences.get(`${year}:${normalizeName(entry.playerName)}`);
      if (curatedPortraitReference) {
        assert.match(
          profile?.imageUrl || "",
          curatedPortraitReference,
          `${year}: ${entry.playerName}'s reviewed individual portrait was replaced by a lower-quality fallback.`
        );
      }
      assert.doesNotMatch(
        profile?.imageUrl || "",
        /Gunnar_Gren_1957|Valznerweiher_1961/i,
        `${year}: ${entry.playerName}'s portrait is a known wrong-subject image.`
      );
    }
  }
  for (const entry of starters) {
    assert.notEqual(entry.playerName, entry.honourables?.[0]?.playerName, `${year}: starter duplicated as his own honourable mention.`);
  }
  for (const story of edition.highlights) {
    assert.ok(story.title.length >= 18 && story.body.length >= 100, `${year}: highlight copy is too thin.`);
    if (story.matchId) {
      const match = history.fixtures.find(({ id }) => id === story.matchId);
      assert.ok(match, `${year}: unknown highlight fixture ${story.matchId}.`);
      assert.equal(match.tournamentYear, year, `${year}: highlight fixture belongs to another edition.`);
    }
  }
  assert.equal(englishStories?.length, 3, `${year}: English story pack must contain exactly three stories.`);
  for (const [language, localeData] of historicalStoryLocales) {
    const localizedStories = localeData.editions[String(year)];
    const minimumCopyLength = ["en", "es"].includes(language)
      ? { title: 12, body: 60 }
      : { title: 4, body: 25 };
    assert.equal(localizedStories?.length, 3, `${language} ${year}: expected exactly three localized stories.`);
    for (const [storyIndex, story] of localizedStories.entries()) {
      const storyLabel = `${language} ${year} story ${storyIndex + 1}`;
      const title = stripStoryEntityTokens(story.title);
      const body = stripStoryEntityTokens(story.body);
      const tokens = getStoryEntityTokens(story);
      const englishTokens = getStoryEntityTokens(englishStories[storyIndex]);
      assert.ok(title.length >= minimumCopyLength.title, `${storyLabel}: title is too thin.`);
      assert.ok(body.length >= minimumCopyLength.body, `${storyLabel}: body is too thin.`);
      assert.doesNotMatch(`${story.title} ${story.body}`, /https?:\/\/|↗/iu, `${storyLabel}: video link copy must not appear.`);
      assert.doesNotMatch(`${title} ${body}`, /\{(?:team|player):/u, `${storyLabel}: contains a malformed entity token.`);
      assert.deepEqual(
        tokens.map(({ type, canonicalName }) => `${type}:${canonicalName}`),
        englishTokens.map(({ type, canonicalName }) => `${type}:${canonicalName}`),
        `${storyLabel}: canonical entity sequence must match the English source story.`
      );
      for (const { type, canonicalName, visibleText } of tokens) {
        assert.ok(visibleText, `${storyLabel}: ${type} ${canonicalName} has no visible text.`);
        if (type === "team") {
          const rank = Number(rankingSnapshot?.teams?.[canonicalName]);
          assert.ok(Number.isInteger(rank) && rank > 0, `${storyLabel}: ${canonicalName} has no edition-specific ranking.`);
          continue;
        }
        const profile = resolveHistoricalStoryProfile(year, canonicalName);
        assert.ok(profile, `${storyLabel}: ${canonicalName} has no player-card profile.`);
        assert.ok(profile?.teamName, `${storyLabel}: ${canonicalName}'s player card has no team.`);
        assert.ok(profile?.position, `${storyLabel}: ${canonicalName}'s player card has no position.`);
        assert.ok(profile?.skills?.length, `${storyLabel}: ${canonicalName}'s player card has no skills.`);
        assert.ok(
          String(profile?.note || profile?.styleNote || "").trim().length >= 20,
          `${storyLabel}: ${canonicalName}'s player card note is too thin.`
        );
      }
    }
  }

  const editionAwards = awards.editions[String(year)];
  assert.ok(editionAwards?.goldenBoot, `${year}: missing leading-scorer record.`);
  assert.equal(Boolean(editionAwards.goldenBall), year >= 1978, `${year}: Golden Ball applicability mismatch.`);
  assert.equal(Boolean(editionAwards.fairPlay), year >= 1970, `${year}: Fair Play applicability mismatch.`);
  assert.equal(Boolean(editionAwards.goldenGlove), year >= 1994, `${year}: Golden Glove applicability mismatch.`);
  assert.equal(Boolean(editionAwards.youngPlayer), year >= 2006, `${year}: Young Player applicability mismatch.`);
  for (const award of Object.values(editionAwards)) {
    assert.ok(sourceIds.has(award.sourceId), `${year}: unknown award source ${award.sourceId}.`);
    assert.ok(award.recipients?.length, `${year}: award has no recipients.`);
    for (const recipient of award.recipients) {
      assert.ok(teamNames.has(recipient.teamName), `${year}: award recipient team ${recipient.teamName} did not participate.`);
    }
  }

  for (const [language, localeData] of historicalAwardLocales) {
    const localizedAwards = localeData.editions[String(year)];
    const minimumLengths = historicalAwardMinimumLengths[language];
    assert.deepEqual(
      Object.keys(localizedAwards || {}),
      Object.keys(editionAwards),
      `${language} ${year}: award copy coverage does not match the official award records.`
    );
    for (const [awardKey, award] of Object.entries(editionAwards)) {
      const copy = localizedAwards[awardKey];
      assert.ok(copy?.stat?.trim().length >= minimumLengths.stat, `${language} ${year} ${awardKey}: stat line is too thin.`);
      assert.ok(copy?.context?.trim().length >= minimumLengths.context, `${language} ${year} ${awardKey}: context line is too thin.`);
      assert.match(copy.stat, /[.!?。！？]$/u, `${language} ${year} ${awardKey}: stat line needs closing punctuation.`);
      assert.match(copy.context, /[.!?。！？]$/u, `${language} ${year} ${awardKey}: context line needs closing punctuation.`);
      const playerRecipients = award.recipients.filter(({ playerName }) => playerName);
      if (playerRecipients.length) {
        assert.equal(
          copy.recipientNames?.length,
          playerRecipients.length,
          `${language} ${year} ${awardKey}: display names must align with every recipient.`
        );
      }
      if (awardKey === "goldenBoot") {
        const goalTotals = [...new Set(award.recipients.map(({ goals }) => goals))];
        assert.equal(goalTotals.length, 1, `${year}: leading scorers must share the recorded goal total.`);
        assert.match(copy.stat, new RegExp(`\\b${goalTotals[0]}\\b`), `${language} ${year}: scoring copy must state the verified goal total.`);
      }
      if (awardKey === "fairPlay") {
        assert.ok(
          copy.captainMeta?.trim().length >= (language === "en" || language === "es" ? 12 : 6),
          `${language} ${year}: Fair Play captain metadata is missing or too thin.`
        );
        assert.doesNotMatch(copy.captainMeta, /[\p{Regional_Indicator}🤝]/u, `${language} ${year}: captain metadata must not repeat flag or handshake symbols.`);
        if (language === "en") {
          for (const captainName of expectedFairPlayCaptains[year] || []) {
            assert.match(copy.captainMeta, new RegExp(captainName), `${year}: Fair Play metadata is missing captain ${captainName}.`);
          }
        }
      }
      if (language === "en") {
        assert.doesNotMatch(
          `${copy.stat} ${copy.context}`,
          /style is built|stands out for|watch .+ for|winner of FIFA's|officially named the tournament/iu,
          `${year} ${awardKey}: award copy fell back to generic player-profile prose.`
        );
      }
    }
  }
}

const historicalStoryEntityReferences = Object.values(historicalStoryLocales.get("en").editions)
  .flat()
  .reduce((count, story) => count + getStoryEntityTokens(story).length, 0);
console.log(`Historical highlights audit passed: ${editorialYears.length} editions, ${previewYears.length} next-tournament previews, ${editorialYears.length * 11} starters, ${editorialYears.length * 11} honourable mentions, ${editorialYears.length} coaches with researched reasons and portraits, ${Object.keys(reasonLocaleMinimumLengths).length} complete localized rationale packs, ${historicalStoryLocales.size} localized story packs with ${historicalStoryEntityReferences} ranking/player references each, ${editorialYears.length * 3} stories, and 61 award cards in four locales.`);
