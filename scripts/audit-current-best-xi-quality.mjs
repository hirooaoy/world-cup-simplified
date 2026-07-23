import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const dataDir = path.join(rootDir, "data");
const locales = ["en", "es", "zh", "ko"];

const minimumCopyDepth = {
  en: 35,
  es: 40,
  zh: 65,
  ko: 22
};

const numberWords = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven"
];

const tournamentEvidencePattern = new RegExp(
  `\\b(?:\\d+(?:\\.\\d+)?|${numberWords.join("|")}|golden ball|golden glove|champions?|final|semifinal|quarterfinal|knockout|tournament|title|record)\\b`,
  "i"
);

const mechanismPatterns = {
  GK: /\b(?:balanced?|centre|commit|distribution|one-on-one|patience|position|reach|reflex|save|set|shot|starting)\w*/i,
  defender: /\b(?:advance|aerial|balance|body|carry|channel|close|cover|deliver|dribbl|full-back|lane|line|overlap|pass|position|press|recover|run|scan|space|tackle|turn|width)\w*/i,
  midfielder: /\b(?:arriv|ball|buildup|carry|combination|control|half-space|line|move|pass|press|progress|receive|recover|release|run|shoulder|switch|tackle)\w*/i,
  attacker: /\b(?:accelerat|blind side|carry|channel|combination|cross|defender|dribbl|drop|finish|full-back|half-turn|line|movement|near-post|pass|penalty-area|press|receive|run|set-piece|speed|width)\w*/i
};

const vagueHeadlinePatterns = [
  /\bgame[- ]breaking\b/i,
  /\bheadline finisher\b/i,
  /\bturns? one (?:ball|pass).{0,30}\bpanic\b/i,
  /\bstill chasing\b.{0,50}\bresume\b/i
];

const claimMetricPattern = new RegExp(
  `\\b(\\d+(?:\\.\\d+)?|${numberWords.join("|")})[- ]?(goals?|assists?|appearances?|starts?|matches?|minutes?|saves?|clean sheets?|chances?|duels?|passes?|crosses?|tackles?)\\b`,
  "gi"
);

function readJson(file) {
  return readFile(file, "utf8").then(JSON.parse);
}

function compact(value) {
  return value.replace(/\s+/g, " ").trim();
}

function flattenReason(reason) {
  return Array.isArray(reason) ? reason.join(" ") : reason;
}

function copyDepth(text, locale) {
  if (locale === "zh") {
    return [...text.replace(/[\s\p{P}\p{S}]/gu, "")].length;
  }
  return compact(text).split(" ").filter(Boolean).length;
}

function sentenceCount(text, locale) {
  const pattern = locale === "zh" ? /[。！？]/g : /[.!?](?=\s|$)/g;
  return text.match(pattern)?.length || 0;
}

function splitSentences(text, locale) {
  const pattern = locale === "zh" ? /(?<=[。！？])/u : /(?<=[.!?])(?=\s|$)/u;
  return text.split(pattern).map(compact).filter(Boolean);
}

function normalizedSentence(text) {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function roleGroup(position) {
  if (position === "GK") return "GK";
  if (["CB", "LB", "RB"].includes(position)) return "defender";
  if (["DM", "LCM", "RCM"].includes(position)) return "midfielder";
  return "attacker";
}

function claimKeys(text) {
  return [...text.matchAll(claimMetricPattern)].map((match) =>
    `${match[1].toLowerCase()} ${match[2].toLowerCase()}`
  );
}

function startsWithPlayerName(sentence, playerName) {
  const normalized = normalizedSentence(sentence);
  return normalizedSentence(playerName)
    .split(" ")
    .filter((part) => part.length >= 3)
    .some((part) => normalized === part || normalized.startsWith(`${part} `));
}

function rationaleOpeningStructure(sentence, playerName) {
  let normalized = normalizedSentence(sentence);
  for (const part of normalizedSentence(playerName).split(" ")) {
    if (part.length >= 3) normalized = normalized.replaceAll(part, "[name]");
  }
  return normalized
    .replace(/\b\d+(?:\.\d+)?\b/gu, "[number]")
    .split(" ")
    .slice(0, 5)
    .join(" ");
}

function withoutEditorialCopy(data) {
  const normalized = structuredClone(data);
  delete normalized.updatedAt;
  delete normalized.selection?.methodology;
  delete normalized.selection?.methodologyLocalized;
  if (normalized.selection?.coach) delete normalized.selection.coach.reason;
  for (const slot of normalized.selection?.slots || []) {
    for (const player of [slot.starter, ...(slot.honourables || [])]) {
      if (player) delete player.reason;
    }
  }
  return normalized;
}

function assertProtectedSelectionUnchanged(current, archived) {
  assert.deepEqual(
    withoutEditorialCopy(current),
    withoutEditorialCopy(archived),
    "2026 Best XI protected selections, positions, visibility, facts, identities, or sources changed relative to the immutable archive. Copy is editable; tournament facts are not."
  );
}

function assertLocalizedShape({ displayed, label, reason }) {
  const expectedContainer = displayed ? "array" : "string";
  for (const locale of locales) {
    const value = reason?.[locale];
    assert(
      displayed ? Array.isArray(value) : typeof value === "string",
      `${label} ${locale} rationale must preserve the ${expectedContainer} locale shape.`
    );
    if (displayed) {
      assert.equal(value.length, 2, `${label} ${locale} rationale must contain exactly two beats.`);
      assert(value.every((beat) => typeof beat === "string" && compact(beat)), `${label} ${locale} has an empty rationale beat.`);
    } else {
      assert.equal(sentenceCount(value, locale), 2, `${label} ${locale} researched rationale must contain exactly two sentences.`);
    }

    const text = compact(flattenReason(value));
    assert(
      copyDepth(text, locale) >= minimumCopyDepth[locale],
      `${label} ${locale} rationale is too shallow (${copyDepth(text, locale)}; minimum ${minimumCopyDepth[locale]}).`
    );
    if (locale !== "en") {
      assert.notEqual(
        normalizedSentence(text),
        normalizedSentence(compact(flattenReason(reason.en))),
        `${label} ${locale} rationale repeats the English copy instead of localizing it.`
      );
    }
  }
}

const [currentBestXi, manifest, playerProfiles] = await Promise.all([
  readJson(path.join(dataDir, "highlights-best-xi.json")),
  readJson(path.join(dataDir, "archives", "world-cup-2026-manifest.json")),
  readJson(path.join(dataDir, "player-profiles.json"))
]);

const latestEntry = manifest.entries?.at(-1);
assert(latestEntry?.file?.startsWith("data/archives/"), "Latest 2026 archive entry is missing or points outside data/archives.");
const latestArchive = await readJson(path.join(rootDir, latestEntry.file));
assert(latestArchive.highlightsBestXi, "Latest immutable 2026 archive does not contain Best XI data.");
assertProtectedSelectionUnchanged(currentBestXi, latestArchive.highlightsBestXi);

const selection = currentBestXi.selection;
assert.equal(selection.slots?.length, 11, "Current Best XI must retain 11 slots.");

const allSentenceOwners = new Map();
const allRationaleOwners = new Map();
const displayedPlayers = [];
const researchedPlayers = [];
const displayedOpeningStructures = new Map();
let displayedNamePronounScaffolds = 0;
let protectedHiddenPositionConflicts = 0;

for (const slot of selection.slots) {
  const candidates = [
    { kind: "starter", displayed: true, player: slot.starter },
    ...(slot.honourables || []).map((player, index) => ({
      kind: "honourable",
      displayed: index === 0 || player.showInHonourableMentions === true,
      player
    }))
  ];

  for (const { kind, displayed, player } of candidates) {
    const label = `${kind} ${player.playerName}`;
    researchedPlayers.push(player);
    if (displayed) displayedPlayers.push(player);
    assertLocalizedShape({ displayed, label, reason: player.reason });

    const english = compact(flattenReason(player.reason.en));
    assert(tournamentEvidencePattern.test(english), `${label} lacks a tournament-specific selection case.`);
    assert(mechanismPatterns[roleGroup(player.position)].test(english), `${label} lacks an observable ${roleGroup(player.position)} mechanism.`);
    assert(vagueHeadlinePatterns.every((pattern) => !pattern.test(english)), `${label} falls back to generic headline copy.`);

    const factTypes = (player.facts || []).map((fact) => fact.type);
    assert.equal(new Set(factTypes).size, factTypes.length, `${label} repeats a tournament fact type.`);

    const claims = claimKeys(english);
    assert.equal(new Set(claims).size, claims.length, `${label} repeats the same numeric fact in its rationale: ${claims.join(", ")}.`);

    if (displayed) {
      const [openingSentence, secondSentence = ""] = splitSentences(english, "en");
      const nameThenPronoun = startsWithPlayerName(openingSentence, player.playerName)
        && /^(?:he|his)\b/iu.test(secondSentence);
      if (nameThenPronoun) displayedNamePronounScaffolds += 1;
      const structure = rationaleOpeningStructure(openingSentence, player.playerName);
      const owners = displayedOpeningStructures.get(structure) || [];
      owners.push(player.playerName);
      displayedOpeningStructures.set(structure, owners);
    }

    if (player.playerName === "Keito Nakamura") {
      const canonicalProfile = playerProfiles.profiles?.[player.playerName];
      assert.equal(displayed, false, "The protected Keito Nakamura LB role conflict must remain hidden from the displayed Honourable Mentions panel.");
      assert.equal(player.position, "LB", "The protected archive currently records Keito Nakamura in the LB slot; changing it requires a reviewed archive correction.");
      assert(
        /left winger|forward/iu.test(canonicalProfile?.summary || ""),
        "The Keito Nakamura position exception must remain traceable to the canonical winger/forward profile."
      );
      assert(
        /3-4-3|nominal left-back/iu.test(english),
        "Keito Nakamura's hidden rationale must explain the tournament deployment behind the protected LB slot."
      );
      protectedHiddenPositionConflicts += 1;
    }

    for (const locale of locales) {
      const localized = compact(flattenReason(player.reason[locale]));
      const rationaleKey = `${locale}|${normalizedSentence(localized)}`;
      assert(!allRationaleOwners.has(rationaleKey), `${label} duplicates the full ${locale} rationale used by ${allRationaleOwners.get(rationaleKey)}.`);
      allRationaleOwners.set(rationaleKey, label);

      for (const sentence of splitSentences(localized, locale)) {
        const sentenceKey = `${locale}|${normalizedSentence(sentence)}`;
        assert(!allSentenceOwners.has(sentenceKey), `${label} duplicates a ${locale} sentence used by ${allSentenceOwners.get(sentenceKey)}.`);
        allSentenceOwners.set(sentenceKey, label);
      }
    }
  }
}

const coach = selection.coach;
for (const locale of locales) {
  const text = compact(coach.reason?.[locale] || "");
  assert.equal(sentenceCount(text, locale), 2, `Best Coach ${locale} rationale must contain exactly two sentences.`);
  assert(copyDepth(text, locale) >= minimumCopyDepth[locale], `Best Coach ${locale} rationale is too shallow.`);
}
const coachEnglish = compact(coach.reason.en);
assert(tournamentEvidencePattern.test(coachEnglish), "Best Coach rationale lacks tournament-specific evidence.");
assert(/\b(?:4-3-3|possession|press|shape|substitut)\w*/i.test(coachEnglish), "Best Coach rationale lacks an observable tactical mechanism.");

assert.equal(displayedPlayers.length, 26, "Current Best XI must retain 26 displayed player cards.");
assert.equal(researchedPlayers.length, 34, "Current Best XI must retain all 34 researched players.");
assert(
  displayedNamePronounScaffolds <= 6,
  `Displayed Best XI copy overuses the Name + evidence / His-or-He + mechanism scaffold (${displayedNamePronounScaffolds}/26; maximum 6).`
);
const largestDisplayedOpeningReuse = Math.max(
  0,
  ...[...displayedOpeningStructures.values()].map((owners) => owners.length)
);
assert(
  displayedOpeningStructures.size >= 20 && largestDisplayedOpeningReuse <= 2,
  `Displayed Best XI openings are too repetitive (${displayedOpeningStructures.size}/26 distinct five-token structures; largest reuse ${largestDisplayedOpeningReuse}).`
);
assert.equal(
  protectedHiddenPositionConflicts,
  1,
  "Expected exactly one source-documented, archive-protected hidden position conflict."
);

console.log(
  `Current Best XI copy audit passed: ${displayedPlayers.length} displayed players, ${researchedPlayers.length - displayedPlayers.length} additional researched candidates, 1 coach, ${locales.length} locales, ${displayedOpeningStructures.size} displayed opening structures (largest reuse ${largestDisplayedOpeningReuse}), ${displayedNamePronounScaffolds} repeated name/pronoun scaffolds, 1 audited hidden position conflict, protected selection parity with ${latestArchive.archiveVersion}.`
);
