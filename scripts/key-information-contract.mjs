import assert from "node:assert/strict";
import {
  KEY_INFORMATION_MODEL_VERSION,
  assertKeyInformationModel
} from "../locales/key-information-runtime.js";

export const KEY_INFORMATION_SOURCE_ID = "matchup-archive-present-tense-2026-07-22";
export const KEY_INFORMATION_MODE = "archive-present-tense";
export const KEY_INFORMATION_SCHEMA_VERSION = 4;

export const ALLOWED_EVIDENCE_INPUTS = Object.freeze([
  "teams",
  "stage",
  "officialStartingXI",
  "confirmedStartingXI",
  "officialTacticalLayout",
  "priorTournamentMatches",
  "manager",
  "hostStatus",
  "tournamentFormatRules",
  "registeredSquadContext"
]);

export const EXCLUDED_CURRENT_MATCH_INPUTS = Object.freeze([
  "score",
  "winner",
  "currentMatchEvents",
  "cards",
  "substitutions",
  "shootout"
]);

// Kept as an explicit alias while older validation callers migrate to the
// evidence-based name. The values, not the legacy name, remain authoritative.
export const ALLOWED_PRE_KICKOFF_INPUTS = ALLOWED_EVIDENCE_INPUTS;

const CURRENT_MATCH_RESULT_KEYS = new Set([
  "score",
  "scoredetails",
  "goalshome",
  "goalsaway",
  "matchevents",
  "currentmatchevents",
  "events",
  "cards",
  "staffcards",
  "substitutions",
  "penalties",
  "penaltykicks",
  "resulthighlights",
  "resultstorybullets",
  "resultstorybulletszh",
  "winner",
  "winnerteamid",
  "shootout",
  "awards",
  "matchstatistics",
  "laterroundprogression"
]);

const OUTCOME_INVARIANT_FIXTURE_FIELDS = Object.freeze([
  "id",
  "stage",
  "round",
  "groupId",
  "group",
  "kickoffUtc",
  "date",
  "localTime",
  "homeTeamId",
  "awayTeamId",
  "homeSlot",
  "awaySlot",
  "tournamentYear",
  "tournamentName"
]);

const RESULT_LEAK_PATTERN =
  /(?<![-‑–])\bwon\b|\b(?:lost|defeated|equalised|equalized|assisted|booked|sent off|came on|substitut(?:e|ed|ion)|shootout|on penalties|after extra time|opened the scoring|doubled (?:the|their) lead|final score)\b|\b\d+(?:\+\d+)?(?:st|nd|rd|th)?\s+minute\b/iu;
const UNSUPPORTED_TACTICAL_PATTERN =
  /\b(?:must test|closes? (?:the )?(?:central )?space|contest(?:s|ed)? (?:the )?central space|tracks? .{0,60} runs?|marks? .{0,60}(?:forward|striker)|connect(?:s|ing)? the phases|leads? the attack|runs? beyond|press(?:es|ing)? the (?:first|next) pass)\b/iu;
const MALFORMED_QUANTITY_PATTERN =
  /\b1\s+(?:goals|matches|wins|draws|losses|clean sheets|appearances)\b|\ballowed\s+1\s+(?:in|across)\s+earlier matches\b/iu;
const MALFORMED_TEXT_PATTERN = /\b(?:undefined|null|NaN)\b|\s{2,}|[,.!?]{2,}/u;
const SINGULAR_TEAM_VERBS = "is|was|runs|needs|wants|has|plays|uses|looks|leads|starts|enters|carries";
const sentenceSegmenter = new Intl.Segmenter("en", { granularity: "sentence" });
const EVIDENCE_REF_INPUT = Object.freeze({
  "fjelstul:manager-appearances": "manager",
  "fjelstul:player-appearances": "confirmedStartingXI",
  "fixture:earlier-tournament-results": "priorTournamentMatches",
  "fixture:opponent-earlier-tournament-results": "priorTournamentMatches",
  "fixture:pre-match-standings": "priorTournamentMatches",
  "fixture:stage": "stage",
  "tournament:format-rules": "tournamentFormatRules"
});

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
}

function normalizeSearchText(value) {
  return normalizeWhitespace(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function includesSearchPhrase(text, phrase) {
  const normalizedPhrase = normalizeSearchText(phrase);
  return Boolean(normalizedPhrase) && ` ${normalizeSearchText(text)} `.includes(` ${normalizedPhrase} `);
}

function wordCount(value) {
  const normalized = normalizeWhitespace(value);
  return normalized ? normalized.split(" ").length : 0;
}

function sentenceList(value) {
  return [...sentenceSegmenter.segment(normalizeWhitespace(value))]
    .map(({ segment }) => segment.trim())
    .filter(Boolean);
}

function playerName(value) {
  return typeof value === "string" ? value : value?.name;
}

function lineupSide(lineup, side) {
  const source = lineup?.[side];
  const starters = source?.starters || source?.players || [];
  const bench = source?.bench || [];
  return {
    formation: normalizeWhitespace(source?.formation),
    starters: starters.map(playerName).map(normalizeWhitespace).filter(Boolean),
    bench: bench.map(playerName).map(normalizeWhitespace).filter(Boolean)
  };
}

function formatFixtureLabel(collection, fixture) {
  const year = collection.getYear?.(fixture);
  return `${collection.name}${year ? ` ${year}` : ""} fixture "${fixture.id}"`;
}

function validateRecord(record, label, issues, { requireCleanSheets = false } = {}) {
  const fields = ["matches", "wins", "draws", "losses", "goalsFor", "goalsAgainst"];
  if (requireCleanSheets) fields.push("cleanSheets");
  for (const field of fields) {
    if (!Number.isInteger(record?.[field]) || record[field] < 0) {
      issues.push(`${label}.${field} must be a non-negative integer`);
    }
  }
  if (record?.points !== undefined && (!Number.isInteger(record.points) || record.points < 0)) {
    issues.push(`${label}.points must be a non-negative integer when present`);
  }
  if (record?.groupPoints !== undefined && (!Number.isInteger(record.groupPoints) || record.groupPoints < 0)) {
    issues.push(`${label}.groupPoints must be a non-negative integer when present`);
  }
  if (record?.pointsApplicable !== undefined && typeof record.pointsApplicable !== "boolean") {
    issues.push(`${label}.pointsApplicable must be boolean when present`);
  }
}

function validateEvidenceSlot(slot, label, declaredInputs, issues) {
  if (!normalizeWhitespace(slot?.claimClass)) {
    issues.push(`${label}.claimClass is required`);
  }
  if (!Array.isArray(slot?.evidenceRefs) || !slot.evidenceRefs.length) {
    issues.push(`${label}.evidenceRefs must be a non-empty array`);
    return;
  }
  for (const evidenceRef of slot.evidenceRefs) {
    const normalizedRef = normalizeWhitespace(evidenceRef);
    if (!normalizedRef) {
      issues.push(`${label}.evidenceRefs must not contain empty references`);
    } else if (!declaredInputs.has(normalizedRef) && !declaredInputs.has(EVIDENCE_REF_INPUT[normalizedRef])) {
      issues.push(`${label}.evidenceRefs contains undeclared evidence input "${normalizedRef}"`);
    }
  }
}

function normalizeLayoutSourceIds(layoutEvidence) {
  if (Array.isArray(layoutEvidence?.sourceIds)) {
    return layoutEvidence.sourceIds.map(normalizeWhitespace).filter(Boolean);
  }
  const sourceId = normalizeWhitespace(layoutEvidence?.sourceId);
  return sourceId ? [sourceId] : [];
}

function validateLayoutEvidence(keyInformation, fixture, label, issues) {
  const layout = keyInformation?.layoutEvidence;
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) {
    issues.push(`${label}.layoutEvidence is required for an official tactical layout`);
    return;
  }

  const sourceIds = normalizeLayoutSourceIds(layout);
  if (!sourceIds.length) {
    issues.push(`${label}.layoutEvidence must identify at least one source`);
  }
  const researchSourceIds = new Set(keyInformation.researchSourceIds || []);
  for (const sourceId of sourceIds) {
    if (!researchSourceIds.has(sourceId)) {
      issues.push(`${label}.layoutEvidence source "${sourceId}" must also appear in researchSourceIds`);
    }
  }

  const publishedAt = Date.parse(layout.publishedAt);
  const kickoffAt = Date.parse(fixture?.kickoffUtc);
  if (!Number.isFinite(publishedAt)) {
    issues.push(`${label}.layoutEvidence.publishedAt must be a valid timestamp`);
  }
  if (!Number.isFinite(kickoffAt)) {
    issues.push(`${label} cannot verify layout timing without fixture.kickoffUtc`);
  }
  if (Number.isFinite(publishedAt) && Number.isFinite(kickoffAt)) {
    const expectedTiming = publishedAt <= kickoffAt ? "pre-kickoff" : "post-kickoff";
    const declaredTiming = layout.timing || layout.relationToKickoff;
    if (declaredTiming !== expectedTiming) {
      issues.push(`${label}.layoutEvidence timing must be derived as "${expectedTiming}" from publishedAt and kickoffUtc`);
    }
    if (layout.minutesFromKickoff !== undefined) {
      const expectedMinutes = Number(((publishedAt - kickoffAt) / 60000).toFixed(1));
      if (Number(layout.minutesFromKickoff) !== expectedMinutes) {
        issues.push(`${label}.layoutEvidence.minutesFromKickoff must be ${expectedMinutes}`);
      }
    }
  }

  if (!["nominal", "observed", "revised"].includes(layout.perspective)) {
    issues.push(`${label}.layoutEvidence.perspective must be nominal, observed, or revised`);
  }
  if (!Number.isInteger(layout.documentVersion) || layout.documentVersion < 1) {
    issues.push(`${label}.layoutEvidence.documentVersion must be a positive integer`);
  }
  if (layout.exactLayout !== true) {
    issues.push(`${label}.layoutEvidence.exactLayout must be true`);
  }
  if (!normalizeWhitespace(layout.note)) {
    issues.push(`${label}.layoutEvidence.note must explain the layout perspective`);
  }
}

function validateMetadata(keyInformation, fixture, collection, hasLineup, hasFormation, isCanceled, issues) {
  const label = `${formatFixtureLabel(collection, fixture)} keyInformation`;
  if (keyInformation?.sourceId !== KEY_INFORMATION_SOURCE_ID) {
    issues.push(`${label}.sourceId must be "${KEY_INFORMATION_SOURCE_ID}"`);
  }
  if (keyInformation?.mode !== KEY_INFORMATION_MODE) {
    issues.push(`${label}.mode must be "${KEY_INFORMATION_MODE}"`);
  }
  if (keyInformation?.schemaVersion !== KEY_INFORMATION_SCHEMA_VERSION) {
    issues.push(`${label}.schemaVersion must be ${KEY_INFORMATION_SCHEMA_VERSION}`);
  }
  if (keyInformation?.narrativeMoment !== "team-entrance") {
    issues.push(`${label}.narrativeMoment must be "team-entrance"`);
  }
  if (keyInformation?.outcomeCutoff !== "kickoff") {
    issues.push(`${label}.outcomeCutoff must be "kickoff"`);
  }
  if (Object.hasOwn(keyInformation || {}, "temporalCutoff") || Object.hasOwn(keyInformation || {}, "preKickoffInputs")) {
    issues.push(`${label} must not retain legacy temporalCutoff or preKickoffInputs fields`);
  }
  if (!normalizeWhitespace(keyInformation?.generatedBy)) {
    issues.push(`${label}.generatedBy must identify the generator`);
  }
  if (!Array.isArray(keyInformation?.researchSourceIds) || !keyInformation.researchSourceIds.length) {
    issues.push(`${label}.researchSourceIds must be a non-empty array`);
  } else {
    const sourceIds = keyInformation.researchSourceIds.map(normalizeWhitespace);
    if (sourceIds.some((sourceId) => !sourceId)) {
      issues.push(`${label}.researchSourceIds must not contain empty references`);
    }
    if (new Set(sourceIds).size !== sourceIds.length) {
      issues.push(`${label}.researchSourceIds must not contain duplicates`);
    }
    const knownSourceIds = collection.validResearchSourceIds instanceof Set
      ? collection.validResearchSourceIds
      : new Set(collection.validResearchSourceIds || []);
    if (knownSourceIds.size) {
      for (const sourceId of sourceIds) {
        if (!knownSourceIds.has(sourceId)) {
          issues.push(`${label}.researchSourceIds contains unknown source "${sourceId}"`);
        }
      }
    }
    for (const sourceId of collection.requiredResearchSourceIds || []) {
      if (!sourceIds.includes(sourceId)) {
        issues.push(`${label}.researchSourceIds must include "${sourceId}"`);
      }
    }
  }

  const inputs = keyInformation?.evidenceInputs;
  if (!Array.isArray(inputs) || !inputs.length) {
    issues.push(`${label}.evidenceInputs must be a non-empty array`);
    return;
  }
  const inputSet = new Set(inputs);
  if (inputSet.size !== inputs.length) {
    issues.push(`${label}.evidenceInputs must not contain duplicates`);
  }
  for (const input of inputs) {
    if (!ALLOWED_EVIDENCE_INPUTS.includes(input)) {
      issues.push(`${label}.evidenceInputs contains unsupported input "${input}"`);
    }
  }
  const requiredInputs = isCanceled
    ? ["teams", "stage", "registeredSquadContext"]
    : [
        "teams",
        ...(collection.requiresStageEvidence === false ? [] : ["stage"]),
        ...(collection.requiredInputs || [])
      ];
  for (const input of requiredInputs) {
    if (!inputSet.has(input)) {
      issues.push(`${label}.evidenceInputs must include "${input}"`);
    }
  }

  const exclusions = keyInformation?.excludedInputs;
  const expectedExclusions = [...EXCLUDED_CURRENT_MATCH_INPUTS];
  if (!Array.isArray(exclusions) || JSON.stringify(exclusions) !== JSON.stringify(expectedExclusions)) {
    issues.push(`${label}.excludedInputs must exactly equal ${JSON.stringify(expectedExclusions)}`);
  }

  const startingInputs = ["officialStartingXI", "confirmedStartingXI"].filter((input) => inputSet.has(input));
  const expectedStartingInput = collection.lineupInput || "officialStartingXI";
  if (hasLineup) {
    if (startingInputs.length !== 1 || startingInputs[0] !== expectedStartingInput) {
      issues.push(`${label}.evidenceInputs must use only "${expectedStartingInput}" for starting-XI evidence`);
    }
  } else if (startingInputs.length) {
    issues.push(`${label}.evidenceInputs must not claim unavailable starting-XI evidence`);
  }
  if (isCanceled && !inputSet.has("registeredSquadContext")) {
    issues.push(`${label}.evidenceInputs must include registeredSquadContext for the canceled fixture`);
  }
  if (!isCanceled && inputSet.has("registeredSquadContext")) {
    issues.push(`${label}.evidenceInputs may use registeredSquadContext only for a canceled fixture`);
  }
  if (hasFormation && collection.requiresLayoutEvidence && !inputSet.has("officialTacticalLayout")) {
    issues.push(`${label}.evidenceInputs must include officialTacticalLayout`);
  }
  if (collection.requiresLayoutEvidence) {
    validateLayoutEvidence(keyInformation, fixture, label, issues);
  }
}

function normalizePlayerRecords(records) {
  const merged = new Map();
  for (const record of records) {
    const name = normalizeWhitespace(record?.name);
    const normalizedName = normalizeSearchText(name);
    if (!normalizedName) continue;
    const key = `${record.side || ""}|${normalizedName}`;
    const current = merged.get(key) || { name, normalizedName, side: record.side, roles: new Set() };
    current.roles.add(record.role || "roster");
    merged.set(key, current);
  }
  return [...merged.values()];
}

function getPlayerRecords(collection, fixture, lineup) {
  const records = [];
  for (const side of ["home", "away"]) {
    const resolved = lineupSide(lineup, side);
    for (const name of resolved.starters) records.push({ name, side, role: "starter" });
    for (const name of resolved.bench) records.push({ name, side, role: "bench" });
    for (const name of collection.getRosterNames?.(fixture, side) || []) {
      records.push({ name, side, role: "roster" });
    }
  }
  return normalizePlayerRecords(records);
}

function detectPlayerMentions(copy, records) {
  const text = ` ${normalizeSearchText(copy)} `;
  const found = [];
  for (const record of records) {
    if (record.normalizedName.length >= 4 && text.includes(` ${record.normalizedName} `)) found.push(record);
  }
  return found;
}

function collectModelPlayers(model) {
  const slots = model?.slots || {};
  const own = [];
  const opponent = [];
  const add = (target, value) => {
    if (Array.isArray(value)) value.forEach((nested) => add(target, nested));
    else if (typeof value === "string" && value.trim()) target.push(value.trim());
    else if (value && typeof value === "object" && typeof value.name === "string") target.push(value.name.trim());
  };

  if (model?.kind === "current-lineup") {
    add(own, slots.matchup?.ownStarter);
    add(opponent, [slots.matchup?.opposingStarter, slots.matchup?.opponentReference]);
    add(own, slots.plan?.starters);
    add(opponent, slots.risk?.starters);
  } else if (model?.kind === "historical-evidence") {
    add(own, [slots.identity?.confirmedStarters, slots.identity?.confirmedStarterFacts]);
    add(opponent, slots.risk?.opponentConfirmedStarterFacts);
  }
  return { own: [...new Set(own)], opponent: [...new Set(opponent)] };
}

function findForbiddenModelKeys(value, path = "localeModel", found = []) {
  if (Array.isArray(value)) {
    value.forEach((nested, index) => findForbiddenModelKeys(nested, `${path}[${index}]`, found));
    return found;
  }
  if (!value || typeof value !== "object") return found;
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (CURRENT_MATCH_RESULT_KEYS.has(key.toLowerCase())) found.push(nextPath);
    findForbiddenModelKeys(nested, nextPath, found);
  }
  return found;
}

function validateCurrentModel({ model, collection, fixture, side, lineup, evidenceInputs, label, issues }) {
  const opponentSide = side === "home" ? "away" : "home";
  const ownLineup = lineupSide(lineup, side);
  const opponentLineup = lineupSide(lineup, opponentSide);
  const year = Number(collection.getYear?.(fixture));
  const teamId = normalizeWhitespace(collection.getTeamId?.(fixture, side));
  const opponentId = normalizeWhitespace(collection.getTeamId?.(fixture, opponentSide));

  if (model.team?.id !== teamId) issues.push(`${label}.team.id must match fixture ${side}TeamId ${teamId}`);
  if (model.opponent?.id !== opponentId) issues.push(`${label}.opponent.id must match fixture ${opponentSide}TeamId ${opponentId}`);
  if (model.stage?.id !== fixture.stage || Number(model.stage?.year) !== year) {
    issues.push(`${label}.stage must match fixture stage and edition`);
  }
  if (model.slots.identity?.formation !== ownLineup.formation) {
    issues.push(`${label}.slots.identity.formation must match the official tactical layout`);
  }
  if (model.slots.matchup?.opponentFormation !== opponentLineup.formation) {
    issues.push(`${label}.slots.matchup.opponentFormation must match the opponent tactical layout`);
  }
  if (model.slots.identity?.variant !== "structure-and-players") {
    issues.push(`${label}.slots.identity.variant must be structure-and-players`);
  }
  if (Object.hasOwn(model.slots.identity || {}, "profileId")) {
    issues.push(`${label}.slots.identity.profileId must not carry an unsourced editorial profile`);
  }
  if (Object.hasOwn(model.slots.matchup || {}, "opponentProfileId")) {
    issues.push(`${label}.slots.matchup.opponentProfileId must not carry an unsourced editorial profile`);
  }
  if (!["left", "right", "central"].includes(model.slots.matchup?.lane)) {
    issues.push(`${label}.slots.matchup.lane must be left, right, or central`);
  }
  if (!Array.isArray(model.slots.identity?.namedStarters) || model.slots.identity.namedStarters.length !== 2) {
    issues.push(`${label}.slots.identity.namedStarters must contain two starting-layout references`);
  } else {
    const ownStarterNames = new Set(ownLineup.starters.map(normalizeSearchText));
    for (const starter of model.slots.identity.namedStarters) {
      if (!ownStarterNames.has(normalizeSearchText(starter?.name))) {
        issues.push(`${label}.slots.identity.namedStarters references ${starter?.name || "an unnamed player"} outside the confirmed starting XI`);
      }
    }
  }
  for (const slotName of ["identity", "matchup", "plan", "risk"]) {
    validateEvidenceSlot(model.slots[slotName], `${label}.slots.${slotName}`, evidenceInputs, issues);
  }
}

function validateHistoricalModel({ model, collection, fixture, hasLineup, evidenceInputs, label, issues }) {
  if (Number(model.stage?.year) !== Number(collection.getYear?.(fixture))) {
    issues.push(`${label}.stage.year must match the historical edition`);
  }
  if (normalizeWhitespace(model.stage?.round) !== normalizeWhitespace(fixture.round)) {
    issues.push(`${label}.stage.round must match the fixture round`);
  }
  if (
    normalizeWhitespace(fixture.group) &&
    !["second-group-stage", "group-play-off"].includes(model.stage?.phase) &&
    normalizeWhitespace(model.stage?.group) !== normalizeWhitespace(fixture.group)
  ) {
    issues.push(`${label}.stage.group must match the fixture group`);
  }
  const identity = model.slots.identity;
  const isLineupComparison = identity?.displayMode === "lineup-comparison";
  if (!Array.isArray(identity?.managers) || identity.managers.some((name) => !normalizeWhitespace(name))) {
    issues.push(`${label}.slots.identity.managers must preserve all non-empty manager records`);
  }
  const starterCount = identity?.confirmedStarters?.length;
  if (
    !Array.isArray(identity?.confirmedStarters) ||
    (hasLineup ? starterCount < 1 || starterCount > 3 : starterCount !== 0)
  ) {
    issues.push(`${label}.slots.identity.confirmedStarters must contain ${hasLineup ? "one to three" : "zero"} selected starters`);
  }
  if (isLineupComparison) {
    if (!hasLineup) {
      issues.push(`${label}.slots.identity.displayMode lineup-comparison requires two confirmed starting XIs`);
    }
    for (const [factsLabel, facts] of [
      ["identity.confirmedStarterFacts", identity?.confirmedStarterFacts],
      ["risk.opponentConfirmedStarterFacts", model.slots.risk?.opponentConfirmedStarterFacts]
    ]) {
      if (!Array.isArray(facts) || facts.length < 1 || facts.length > 3) {
        issues.push(`${label}.slots.${factsLabel} must contain one to three named starting-role facts`);
        continue;
      }
      for (const fact of facts) {
        if (!normalizeWhitespace(fact?.name) || !["goalkeeper", "defender", "midfielder", "forward", "player"].includes(fact?.position)) {
          issues.push(`${label}.slots.${factsLabel} contains an invalid named starting-role fact`);
        }
      }
    }
    for (const [countsLabel, counts] of [
      ["identity.roleCounts", identity?.roleCounts],
      ["risk.opponentRoleCounts", model.slots.risk?.opponentRoleCounts]
    ]) {
      const total = ["goalkeeper", "defender", "midfielder", "forward", "player"]
        .reduce((sum, role) => sum + (Number.isInteger(counts?.[role]) ? counts[role] : 0), 0);
      if (counts?.goalkeeper !== 1 || total !== 11) {
        issues.push(`${label}.slots.${countsLabel} must describe exactly 11 starters with one goalkeeper`);
      }
    }
    if (!Array.isArray(model.slots.risk?.opponentManagers) || model.slots.risk.opponentManagers.some((name) => !normalizeWhitespace(name))) {
      issues.push(`${label}.slots.risk.opponentManagers must preserve all non-empty opponent manager records`);
    }
  }
  validateRecord(identity?.prior, `${label}.slots.identity.prior`, issues, { requireCleanSheets: true });
  validateRecord(model.slots.plan?.prior, `${label}.slots.plan.prior`, issues, { requireCleanSheets: true });
  validateRecord(model.slots.risk?.opponentPrior, `${label}.slots.risk.opponentPrior`, issues, { requireCleanSheets: true });
  validateRecord(identity?.phasePrior, `${label}.slots.identity.phasePrior`, issues, { requireCleanSheets: true });
  validateRecord(model.slots.plan?.phasePrior, `${label}.slots.plan.phasePrior`, issues, { requireCleanSheets: true });
  validateRecord(model.slots.risk?.phasePrior, `${label}.slots.risk.phasePrior`, issues, { requireCleanSheets: true });
  for (const [recordLabel, record] of [
    ["identity.prior", identity?.prior],
    ["plan.prior", model.slots.plan?.prior],
    ["risk.opponentPrior", model.slots.risk?.opponentPrior]
  ]) {
    if (typeof record?.pointsApplicable !== "boolean") {
      issues.push(`${label}.slots.${recordLabel}.pointsApplicable must be boolean`);
    }
  }
  for (const [slotName, slot] of [
    ["identity", identity],
    ["plan", model.slots.plan],
    ["risk", model.slots.risk]
  ]) {
    if (!["tournament", "current-phase"].includes(slot?.scope)) {
      issues.push(`${label}.slots.${slotName}.scope must be tournament or current-phase`);
    }
    if (typeof slot?.phasePrior?.pointsApplicable !== "boolean") {
      issues.push(`${label}.slots.${slotName}.phasePrior.pointsApplicable must be boolean`);
    }
    if (slot?.phasePrior?.scope !== "current-phase") {
      issues.push(`${label}.slots.${slotName}.phasePrior.scope must be current-phase`);
    }
    const tournamentPrior = slotName === "risk" ? slot?.opponentPrior : slot?.prior;
    if (slot?.scope === "current-phase" && tournamentPrior?.pointsApplicable !== false) {
      issues.push(`${label}.slots.${slotName}.prior must not carry cumulative points into a reset phase`);
    }
  }
  const matchup = model.slots.matchup;
  if (matchup?.terminalScenario !== undefined) {
    const scenario = matchup.terminalScenario;
    if (scenario?.method !== "points-only-top-two-guarantee") {
      issues.push(`${label}.slots.matchup.terminalScenario.method must describe the conservative points-only calculation`);
    }
    for (const result of ["win", "draw", "loss"]) {
      if (!["guarantees", "dependent", "eliminates"].includes(scenario?.[result])) {
        issues.push(`${label}.slots.matchup.terminalScenario.${result} has an unsupported status`);
      }
    }
    if (!Array.isArray(scenario?.otherFixtureTeams) || scenario.otherFixtureTeams.length !== 2) {
      issues.push(`${label}.slots.matchup.terminalScenario.otherFixtureTeams must identify the concurrent fixture`);
    }
    if (!normalizeWhitespace(matchup.scenarioKey) || matchup.scenarioKey !== scenario?.scenarioKey) {
      issues.push(`${label}.slots.matchup.scenarioKey must match terminalScenario.scenarioKey`);
    }
  }
  for (const slotName of ["identity", "matchup", "plan", "risk"]) {
    validateEvidenceSlot(model.slots[slotName], `${label}.slots.${slotName}`, evidenceInputs, issues);
  }
}

function validateLocaleModel({ collection, fixture, side, keyInformation, teamName, opponentName, lineup, hasLineup, isCanceled, issues }) {
  const fixtureLabel = formatFixtureLabel(collection, fixture);
  const label = `${fixtureLabel} keyInformation.localeModel.${side}`;
  const container = keyInformation?.localeModel;
  if (!container || container.version !== KEY_INFORMATION_MODEL_VERSION) {
    issues.push(`${fixtureLabel} keyInformation.localeModel must use version ${KEY_INFORMATION_MODEL_VERSION}`);
    return;
  }
  const model = container[side];
  try {
    assertKeyInformationModel(model);
  } catch (error) {
    issues.push(`${label} ${error.message}`);
    return;
  }

  const expectedKind = isCanceled ? "cancelled" : collection.modelKind || (collection.requiresLayoutEvidence ? "current-lineup" : "historical-evidence");
  if (model.kind !== expectedKind) issues.push(`${label} must use kind "${expectedKind}"; found "${model.kind}"`);
  if (normalizeWhitespace(model.team?.name) !== teamName) issues.push(`${label}.team.name must be ${teamName}`);
  if (normalizeWhitespace(model.opponent?.name) !== opponentName) issues.push(`${label}.opponent.name must be ${opponentName}`);

  for (const forbiddenPath of findForbiddenModelKeys(model, label)) {
    issues.push(`${forbiddenPath} must not contain current-match result or event fields`);
  }
  const evidenceInputs = new Set(keyInformation.evidenceInputs || []);
  if (model.kind === "current-lineup") {
    validateCurrentModel({ model, collection, fixture, side, lineup, evidenceInputs, label, issues });
  } else if (model.kind === "historical-evidence") {
    validateHistoricalModel({ model, collection, fixture, hasLineup, evidenceInputs, label, issues });
  } else if (model.kind === "cancelled") {
    if (model.slots.risk?.confirmedParticipants !== false || !Array.isArray(model.slots.risk?.squadOptions)) {
      issues.push(`${label} canceled model must prohibit confirmed participants and expose squadOptions`);
    }
  }

  if (hasLineup && ["current-lineup", "historical-evidence"].includes(model.kind)) {
    const opponentSide = side === "home" ? "away" : "home";
    const ownStarters = new Set(lineupSide(lineup, side).starters.map(normalizeSearchText));
    const opponentStarters = new Set(lineupSide(lineup, opponentSide).starters.map(normalizeSearchText));
    const modelPlayers = collectModelPlayers(model);
    for (const name of modelPlayers.own) {
      if (!ownStarters.has(normalizeSearchText(name))) {
        issues.push(`${label} references ${name} outside the ${teamName} confirmed starting XI`);
      }
    }
    for (const name of modelPlayers.opponent) {
      if (!opponentStarters.has(normalizeSearchText(name))) {
        issues.push(`${label} references ${name} outside the ${opponentName} confirmed starting XI`);
      }
    }
  }
}

function validateCopy({ collection, fixture, side, copy, teamName, opponentName, lineup, playerRecords, model, fingerprints, issues }) {
  const label = `${formatFixtureLabel(collection, fixture)} keyInformation.${side}`;
  const isCanceled = fixture.status === "CANCELLED";
  const isHistoricalLineupComparison =
    model?.kind === "historical-evidence" && model.slots.identity?.displayMode === "lineup-comparison";
  const minWords = isCanceled
    ? 35
    : isHistoricalLineupComparison
      ? collection.lineupComparisonMinWords ?? 40
      : collection.minWords ?? 50;
  const maxWords = isHistoricalLineupComparison
    ? collection.lineupComparisonMaxWords ?? 80
    : collection.maxWords ?? 90;
  const count = wordCount(copy);
  if (!copy) {
    issues.push(`${label} is missing`);
    return;
  }
  if (count < minWords || count > maxWords) issues.push(`${label} must contain ${minWords}-${maxWords} words; found ${count}`);
  const sentences = sentenceList(copy);
  if (sentences.length !== 4) issues.push(`${label} must contain exactly four sentences; found ${sentences.length}`);
  if (!includesSearchPhrase(sentences[0], teamName)) issues.push(`${label} sentence 1 must identify ${teamName}`);
  if (
    !isCanceled &&
    model?.kind !== "current-lineup" &&
    !isHistoricalLineupComparison &&
    !includesSearchPhrase(sentences[1], opponentName)
  ) {
    issues.push(`${label} sentence 2 must identify ${opponentName}`);
  }
  if (model?.kind === "current-lineup" && !includesSearchPhrase(sentences.slice(2).join(" "), opponentName)) {
    issues.push(`${label} sentences 3-4 must identify ${opponentName}`);
  }
  if (isHistoricalLineupComparison && !includesSearchPhrase(sentences[2], opponentName)) {
    issues.push(`${label} sentence 3 must identify ${opponentName}`);
  }
  if (isCanceled && !includesSearchPhrase(copy, opponentName)) issues.push(`${label} must identify canceled opponent ${opponentName}`);
  if (isCanceled && !/\bcancell?ed\b/iu.test(copy)) issues.push(`${label} must explicitly say the fixture is canceled`);
  if (RESULT_LEAK_PATTERN.test(copy)) issues.push(`${label} contains current-match result or event leakage`);
  if (UNSUPPORTED_TACTICAL_PATTERN.test(copy)) issues.push(`${label} contains an unsupported inferred tactical assignment`);
  if (MALFORMED_QUANTITY_PATTERN.test(copy)) issues.push(`${label} contains malformed singular/plural quantity wording`);
  if (MALFORMED_TEXT_PATTERN.test(copy)) issues.push(`${label} contains malformed text or placeholder output`);

  for (const subject of [teamName, opponentName]) {
    const pattern = new RegExp(`\\b${escapeRegExp(subject)}\\s+(?:${SINGULAR_TEAM_VERBS})\\b`, "iu");
    if (pattern.test(copy)) issues.push(`${label} must keep football-team agreement plural for ${subject}`);
  }
  if (/\bthey\s+(?:is|was|has|needs|wants|plays|uses|enters)\b/iu.test(copy)) {
    issues.push(`${label} must keep the team pronoun plural`);
  }

  const hasLineup = lineupSide(lineup, "home").starters.length > 0 && lineupSide(lineup, "away").starters.length > 0;
  if (hasLineup) {
    const managerNames = new Set(
      (
        model?.kind === "historical-evidence"
          ? [...(model.slots.identity?.managers || []), ...(model.slots.risk?.opponentManagers || [])]
          : []
      ).map(normalizeSearchText)
    );
    for (const mention of detectPlayerMentions(copy, playerRecords)) {
      if (managerNames.has(mention.normalizedName)) continue;
      if (!mention.roles.has("starter")) issues.push(`${label} names non-starter ${mention.name}`);
    }
  }

  const modelPlayers = collectModelPlayers(model);
  for (const name of [...modelPlayers.own, ...modelPlayers.opponent]) {
    if (!includesSearchPhrase(copy, name)) issues.push(`${label} omits model player ${name}`);
  }
  if (model?.kind === "historical-evidence") {
    for (const manager of model.slots.identity?.managers || []) {
      if (!includesSearchPhrase(copy, manager)) issues.push(`${label} omits documented manager ${manager}`);
    }
    if (isHistoricalLineupComparison) {
      for (const manager of model.slots.risk?.opponentManagers || []) {
        if (!includesSearchPhrase(copy, manager)) issues.push(`${label} omits documented opponent manager ${manager}`);
      }
    }
  }

  const year = collection.getYear?.(fixture) || "unknown";
  const fingerprint = `${year}|${teamName}|${normalizeSearchText(copy)}`;
  if (fingerprints.has(fingerprint)) {
    const prior = fingerprints.get(fingerprint);
    issues.push(`${label} exactly repeats fixture "${prior.fixtureId}" keyInformation.${prior.side}`);
  } else {
    fingerprints.set(fingerprint, { fixtureId: fixture.id, side });
  }
}

function validateHistoricalCoverage(collection, fixture, lineup, issues) {
  if (collection.noPlayerNamesBeforeYear === undefined || fixture.status === "CANCELLED") return;
  const year = Number(collection.getYear?.(fixture));
  const label = formatFixtureLabel(collection, fixture);
  const home = lineupSide(lineup, "home");
  const away = lineupSide(lineup, "away");
  const hasLineup = home.starters.length > 0 && away.starters.length > 0;
  if (year < collection.noPlayerNamesBeforeYear && hasLineup) {
    issues.push(`${label} must not claim confirmed match starters before ${collection.noPlayerNamesBeforeYear}`);
  }
  if (year >= collection.noPlayerNamesBeforeYear && (!hasLineup || home.starters.length !== 11 || away.starters.length !== 11)) {
    issues.push(`${label} must preserve two complete confirmed starting XIs`);
  }
}

export function auditKeyInformationCollections(collections, options = {}) {
  const issues = [];
  const fingerprints = new Map();
  const fixtureIds = new Set();
  const stats = { fixtures: 0, sides: 0, playedSides: 0, canceledSides: 0, lineupCheckedSides: 0, editions: new Map() };

  for (const collection of collections) {
    for (const fixture of collection.fixtures || []) {
      stats.fixtures += 1;
      if (!fixture?.id || fixtureIds.has(fixture.id)) issues.push(`${collection.name} has a missing or duplicate fixture id "${fixture?.id || ""}"`);
      fixtureIds.add(fixture?.id);
      const year = collection.getYear?.(fixture);
      if (year) stats.editions.set(year, (stats.editions.get(year) || 0) + 1);

      const lineup = collection.getLineup?.(fixture) || null;
      const hasLineup = lineupSide(lineup, "home").starters.length > 0 && lineupSide(lineup, "away").starters.length > 0;
      const hasFormation = Boolean(lineupSide(lineup, "home").formation && lineupSide(lineup, "away").formation);
      const keyInformation = fixture.keyInformation;
      validateMetadata(keyInformation, fixture, collection, hasLineup, hasFormation, fixture.status === "CANCELLED", issues);
      validateHistoricalCoverage(collection, fixture, lineup, issues);
      const playerRecords = getPlayerRecords(collection, fixture, lineup);

      for (const side of ["home", "away"]) {
        stats.sides += 1;
        const opponentSide = side === "home" ? "away" : "home";
        const teamName = normalizeWhitespace(collection.getTeamName?.(fixture, side));
        const opponentName = normalizeWhitespace(collection.getTeamName?.(fixture, opponentSide));
        if (!teamName || !opponentName) {
          issues.push(`${formatFixtureLabel(collection, fixture)} cannot resolve both team names`);
          continue;
        }
        validateLocaleModel({ collection, fixture, side, keyInformation, teamName, opponentName, lineup, hasLineup, isCanceled: fixture.status === "CANCELLED", issues });
        const model = keyInformation?.localeModel?.[side];
        validateCopy({ collection, fixture, side, copy: normalizeWhitespace(keyInformation?.[side]), teamName, opponentName, lineup, playerRecords, model, fingerprints, issues });
        if (fixture.status === "CANCELLED") stats.canceledSides += 1;
        else stats.playedSides += 1;
        if (hasLineup) stats.lineupCheckedSides += 1;
      }
    }
  }

  const minimumFixtureCount = options.minimumFixtureCount ?? 0;
  const minimumSideCount = options.minimumSideCount ?? minimumFixtureCount * 2;
  if (stats.fixtures < minimumFixtureCount) issues.push(`Key information audit must cover at least ${minimumFixtureCount} fixtures; found ${stats.fixtures}`);
  if (stats.sides < minimumSideCount) issues.push(`Key information audit must cover at least ${minimumSideCount} sides; found ${stats.sides}`);
  if (stats.sides !== stats.fixtures * 2) issues.push(`Key information audit covered ${stats.sides} sides for ${stats.fixtures} fixtures`);

  return {
    ok: issues.length === 0,
    issues,
    stats: { ...stats, editions: Object.fromEntries([...stats.editions.entries()].sort(([a], [b]) => Number(a) - Number(b))) }
  };
}

function sanitizeOutcomeDependentValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeOutcomeDependentValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !CURRENT_MATCH_RESULT_KEYS.has(key.toLowerCase()))
      .map(([key, nested]) => [key, sanitizeOutcomeDependentValue(nested)])
  );
}

export function createCurrentMatchArchiveEvidenceSnapshot(fixture, lineup) {
  const sanitizedFixture = Object.fromEntries(
    OUTCOME_INVARIANT_FIXTURE_FIELDS
      .filter((field) => fixture?.[field] !== undefined)
      .map((field) => [field, sanitizeOutcomeDependentValue(fixture[field])])
  );
  const snapshotLineup = {};
  for (const side of ["home", "away"]) {
    const resolved = lineupSide(lineup, side);
    snapshotLineup[side] = { formation: resolved.formation, starters: resolved.starters };
  }
  return { fixture: sanitizedFixture, lineup: snapshotLineup };
}

export const createCurrentMatchPreKickoffSnapshot = createCurrentMatchArchiveEvidenceSnapshot;

export function assertCurrentMatchOutcomeInvariant(originalFixture, mutatedFixture, originalLineup, mutatedLineup = originalLineup) {
  assert.deepEqual(
    createCurrentMatchArchiveEvidenceSnapshot(originalFixture, originalLineup),
    createCurrentMatchArchiveEvidenceSnapshot(mutatedFixture, mutatedLineup),
    "Current-match outcomes and events must not alter Key information evidence inputs"
  );
}
