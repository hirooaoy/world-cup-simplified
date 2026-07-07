import { CONFIDENCE_LABELS, EXPECTED_LINEUP_MODES } from "./model.mjs";

const DEFAULT_MAX_AGE_HOURS = 72;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isPlainObject(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.prototype.toString.call(value) === "[object Object]"
  );
}

function parseTime(value, owner) {
  const date = new Date(value);
  assert(!Number.isNaN(date.getTime()), `${owner} must be a valid date-time`);
  return date;
}

function validateConfidence(confidence, owner) {
  assert(isPlainObject(confidence), `${owner} must be an object`);
  assert(CONFIDENCE_LABELS.has(String(confidence.label || "").toLowerCase()), `${owner}.label must be low, medium, or high`);
  assert(Number.isFinite(Number(confidence.score)), `${owner}.score must be a number`);
  assert(Number(confidence.score) >= 0 && Number(confidence.score) <= 1, `${owner}.score must be from 0 to 1`);
}

function validateSourceIds(sourceIds, knownSourceIds, owner) {
  assert(Array.isArray(sourceIds), `${owner}.sourceIds must be an array`);
  for (const sourceId of sourceIds || []) {
    assert(knownSourceIds.has(sourceId), `${owner}.sourceIds references unknown source "${sourceId}"`);
  }
}

function validatePlayer(player, owner) {
  assert(isPlainObject(player), `${owner} must be an object`);
  assert(typeof player.name === "string" && player.name.trim(), `${owner}.name must be a non-empty string`);
  assert(typeof player.position === "string" && player.position.trim(), `${owner}.position must be a non-empty string`);
  if (player.x !== undefined) {
    assert(Number.isFinite(Number(player.x)), `${owner}.x must be a number`);
  }
  if (player.y !== undefined) {
    assert(Number.isFinite(Number(player.y)), `${owner}.y must be a number`);
  }
}

function validateSide(side, owner) {
  assert(isPlainObject(side), `${owner} must be an object`);
  assert(typeof side.formation === "string" && side.formation.trim(), `${owner}.formation must be a non-empty string`);
  assert(Array.isArray(side.players), `${owner}.players must be an array`);
  assert(side.players.length === 11, `${owner}.players must include exactly 11 starters`);
  for (const [index, player] of side.players.entries()) {
    validatePlayer(player, `${owner}.players[${index}]`);
  }
  if (side.bench !== undefined) {
    assert(Array.isArray(side.bench), `${owner}.bench must be an array`);
    for (const [index, player] of side.bench.entries()) {
      validatePlayer(player, `${owner}.bench[${index}]`);
    }
  }
}

function validateRecord(record, knownSourceIds, owner) {
  assert(isPlainObject(record), `${owner} must be an object`);
  assert(typeof record.fixtureId === "string" && record.fixtureId.trim(), `${owner}.fixtureId must be a non-empty string`);
  assert(EXPECTED_LINEUP_MODES.has(String(record.mode || "").toLowerCase()), `${owner}.mode must be expected or probable`);
  validateSourceIds(record.sourceIds, knownSourceIds, owner);
  parseTime(record.lastUpdated, `${owner}.lastUpdated`);
  validateConfidence(record.confidence, `${owner}.confidence`);
  assert(isPlainObject(record.lineup), `${owner}.lineup must be an object`);
  validateSide(record.lineup.home, `${owner}.lineup.home`);
  validateSide(record.lineup.away, `${owner}.lineup.away`);
}

export function validatePredictionDocument(document, {
  maxAgeHours = DEFAULT_MAX_AGE_HOURS,
  now = new Date()
} = {}) {
  assert(isPlainObject(document), "Prediction document must be an object");
  assert(typeof document.schemaVersion === "string" && document.schemaVersion.trim(), "Prediction document schemaVersion is required");
  const generatedAt = parseTime(document.generatedAt, "Prediction document generatedAt");
  assert(Array.isArray(document.fixtures), "Prediction document fixtures must be an array");

  const sourceIds = new Set();
  if (document.sources !== undefined) {
    assert(Array.isArray(document.sources), "Prediction document sources must be an array");
    for (const [index, source] of document.sources.entries()) {
      const owner = `Prediction document sources[${index}]`;
      assert(isPlainObject(source), `${owner} must be an object`);
      assert(typeof source.id === "string" && source.id.trim(), `${owner}.id must be a non-empty string`);
      assert(!sourceIds.has(source.id), `${owner}.id duplicates source "${source.id}"`);
      assert(typeof source.label === "string" && source.label.trim(), `${owner}.label must be a non-empty string`);
      assert(typeof source.type === "string" && source.type.trim(), `${owner}.type must be a non-empty string`);
      parseTime(source.checkedAt, `${owner}.checkedAt`);
      sourceIds.add(source.id);
    }
  }

  if (document.fixtures.length) {
    const ageMs = new Date(now).getTime() - generatedAt.getTime();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    assert(ageMs <= maxAgeMs, `Prediction document is stale: generatedAt is older than ${maxAgeHours} hours`);
  }

  const seenFixtures = new Set();
  for (const [index, record] of document.fixtures.entries()) {
    validateRecord(record, sourceIds, `Prediction document fixtures[${index}]`);
    assert(!seenFixtures.has(record.fixtureId), `Prediction document duplicates fixture "${record.fixtureId}"`);
    seenFixtures.add(record.fixtureId);
  }

  return true;
}
