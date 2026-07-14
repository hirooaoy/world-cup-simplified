import { getCanonicalPlayerKey, resolvePlayerNameInPool } from "../player-name-matching.mjs";
import { CONFIDENCE_LABELS, EXPECTED_LINEUP_MODES } from "./model.mjs";
import {
  formationLayoutMatchesPlayers,
  getFormationDisplayPositions,
  normalizeFormationLabel,
  resolveFormationLayout
} from "./formations.mjs";

const DEFAULT_MAX_AGE_HOURS = 72;
const VALID_POSITIONS = new Set([
  "GK", "RB", "RWB", "RCB", "CB", "LCB", "LB", "LWB",
  "RM", "CM", "DM", "AM", "LM", "RW", "LW", "ST", "SUB"
]);
function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  const seen = new Set();
  for (const sourceId of sourceIds || []) {
    assert(typeof sourceId === "string" && sourceId.trim(), `${owner}.sourceIds entries must be non-empty strings`);
    assert(!seen.has(sourceId), `${owner}.sourceIds duplicates source "${sourceId}"`);
    assert(knownSourceIds.has(sourceId), `${owner}.sourceIds references unknown source "${sourceId}"`);
    seen.add(sourceId);
  }
}

function validatePlayer(player, owner, { requireCoordinates = false } = {}) {
  assert(isPlainObject(player), `${owner} must be an object`);
  assert(typeof player.name === "string" && player.name.trim(), `${owner}.name must be a non-empty string`);
  assert(typeof player.position === "string" && player.position.trim(), `${owner}.position must be a non-empty string`);
  assert(VALID_POSITIONS.has(player.position), `${owner}.position "${player.position}" is unsupported`);
  if (requireCoordinates) {
    assert(player.x !== undefined && player.y !== undefined, `${owner} must include pitch coordinates`);
  }
  for (const coordinate of ["x", "y"]) {
    if (player[coordinate] === undefined) continue;
    assert(Number.isFinite(Number(player[coordinate])), `${owner}.${coordinate} must be a number`);
    assert(Number(player[coordinate]) >= 0 && Number(player[coordinate]) <= 100, `${owner}.${coordinate} must be from 0 to 100`);
  }
  if (player.confidence !== undefined) validateConfidence(player.confidence, `${owner}.confidence`);
}

function findDuplicate(players) {
  for (let index = 0; index < players.length; index += 1) {
    const key = getCanonicalPlayerKey(players[index]?.name);
    const duplicateIndex = players.slice(0, index)
      .findIndex((candidate) => key && getCanonicalPlayerKey(candidate?.name) === key);
    if (duplicateIndex >= 0) return [players[duplicateIndex], players[index]];
  }
  return null;
}

function validateRosterMembership(players, roster, owner) {
  if (!Array.isArray(roster) || roster.length < 11) return;
  for (const player of players) {
    const match = resolvePlayerNameInPool(player.name, roster, {
      getIdentityKey: (profile) => profile?.name || profile?.displayName,
      getNames: (profile) => [profile?.name, profile?.displayName]
    });
    assert(match.status === "matched", `${owner} includes "${player.name}", who is not on the known team roster`);
  }
}

function sortedPositions(players) {
  return players.map((player) => player.position).sort().join("|");
}

function validateSide(side, owner, { expectedTeamId = "", roster = [] } = {}) {
  assert(isPlainObject(side), `${owner} must be an object`);
  assert(typeof side.teamId === "string" && side.teamId.trim(), `${owner}.teamId must be a non-empty string`);
  if (expectedTeamId) assert(side.teamId === expectedTeamId, `${owner}.teamId must be ${expectedTeamId}, not ${side.teamId}`);
  assert(typeof side.formation === "string" && side.formation.trim(), `${owner}.formation must be a non-empty string`);
  const normalizedFormation = normalizeFormationLabel(side.formation);
  const formationResolution = resolveFormationLayout(normalizedFormation);
  assert(
    formationResolution.formation === normalizedFormation,
    `${owner}.formation "${side.formation}" is unsupported; normalize it before display`
  );
  assert(Array.isArray(side.players), `${owner}.players must be an array`);
  assert(side.players.length === 11, `${owner}.players must include exactly 11 starters`);
  for (const [index, player] of side.players.entries()) {
    validatePlayer(player, `${owner}.players[${index}]`, { requireCoordinates: true });
  }
  const starterDuplicate = findDuplicate(side.players);
  assert(!starterDuplicate, `${owner}.players duplicates starter "${starterDuplicate?.[1]?.name || ""}"`);
  const expectedPositions = getFormationDisplayPositions(normalizedFormation);
  assert(
    sortedPositions(side.players) === [...expectedPositions].sort().join("|"),
    `${owner}.players positions do not match ${side.formation}`
  );
  assert(
    formationLayoutMatchesPlayers(normalizedFormation, side.players),
    `${owner}.players roles/coordinates do not match ${side.formation}`
  );

  const bench = side.bench || [];
  assert(Array.isArray(bench), `${owner}.bench must be an array`);
  for (const [index, player] of bench.entries()) validatePlayer(player, `${owner}.bench[${index}]`);
  const benchDuplicate = findDuplicate(bench);
  assert(!benchDuplicate, `${owner}.bench duplicates player "${benchDuplicate?.[1]?.name || ""}"`);
  const overlap = bench.find((player) => {
    const key = getCanonicalPlayerKey(player?.name);
    return key && side.players.some((starter) => getCanonicalPlayerKey(starter?.name) === key);
  });
  assert(!overlap, `${owner} lists "${overlap?.name || ""}" as both starter and bench`);
  validateRosterMembership([...side.players, ...bench], roster, owner);
}

function buildRosters(playerProfilesData) {
  const profiles = playerProfilesData?.profiles || playerProfilesData?.players || playerProfilesData || {};
  const rosters = new Map();
  for (const profile of Object.values(profiles)) {
    const teamId = String(profile?.teamId || "").trim();
    if (!teamId) continue;
    const roster = rosters.get(teamId) || [];
    roster.push(profile);
    rosters.set(teamId, roster);
  }
  return rosters;
}

function validateRecord(record, knownSourceIds, owner, { fixture, rosters }) {
  assert(isPlainObject(record), `${owner} must be an object`);
  assert(typeof record.fixtureId === "string" && record.fixtureId.trim(), `${owner}.fixtureId must be a non-empty string`);
  assert(EXPECTED_LINEUP_MODES.has(String(record.mode || "").toLowerCase()), `${owner}.mode must be expected or probable`);
  assert(
    ["forecast", "reported-xi-assisted"].includes(record.predictionClass || "forecast"),
    `${owner}.predictionClass must be forecast or reported-xi-assisted`
  );
  validateSourceIds(record.sourceIds, knownSourceIds, owner);
  parseTime(record.lastUpdated, `${owner}.lastUpdated`);
  validateConfidence(record.confidence, `${owner}.confidence`);
  assert(isPlainObject(record.lineup), `${owner}.lineup must be an object`);
  validateSide(record.lineup.home, `${owner}.lineup.home`, {
    expectedTeamId: fixture?.homeTeamId,
    roster: rosters.get(fixture?.homeTeamId || record.lineup.home?.teamId)
  });
  validateSide(record.lineup.away, `${owner}.lineup.away`, {
    expectedTeamId: fixture?.awayTeamId,
    roster: rosters.get(fixture?.awayTeamId || record.lineup.away?.teamId)
  });
}

export function validatePredictionDocument(document, {
  externalSourceIds = [],
  fixtures = [],
  maxAgeHours = DEFAULT_MAX_AGE_HOURS,
  now = new Date(),
  playerProfilesData = {}
} = {}) {
  assert(isPlainObject(document), "Prediction document must be an object");
  assert(typeof document.schemaVersion === "string" && document.schemaVersion.trim(), "Prediction document schemaVersion is required");
  const generatedAt = parseTime(document.generatedAt, "Prediction document generatedAt");
  assert(Array.isArray(document.fixtures), "Prediction document fixtures must be an array");

  const sourceIds = new Set(externalSourceIds);
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
    assert(ageMs >= 0, "Prediction document generatedAt cannot be in the future");
    assert(ageMs <= maxAgeMs, `Prediction document is stale: generatedAt is older than ${maxAgeHours} hours`);
  }

  const fixturesById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  const rosters = buildRosters(playerProfilesData);
  const seenFixtures = new Set();
  for (const [index, record] of document.fixtures.entries()) {
    const fixture = fixturesById.get(record?.fixtureId);
    if (fixturesById.size) assert(fixture, `Prediction document references unknown fixture "${record?.fixtureId}"`);
    validateRecord(record, sourceIds, `Prediction document fixtures[${index}]`, { fixture, rosters });
    assert(!seenFixtures.has(record.fixtureId), `Prediction document duplicates fixture "${record.fixtureId}"`);
    seenFixtures.add(record.fixtureId);
  }

  return true;
}
