const DEFAULT_LOOKAHEAD_REGISTRATION_COUNT = 16;
const MAX_LOOKAHEAD_REGISTRATION_COUNT = 100;
const MAX_EXTENDED_LOOKAHEAD_REGISTRATION_COUNT = 1024;

function positiveInteger(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function buildFifaTacticalLineupUrl({
  competitionEditionId,
  registrationId,
  language = "English"
}) {
  const editionId = positiveInteger(competitionEditionId);
  const reportRegistrationId = positiveInteger(registrationId);
  const safeLanguage = String(language || "English").trim();
  if (!editionId || !reportRegistrationId || !/^[A-Za-z]+$/.test(safeLanguage)) {
    return "";
  }

  return (
    `https://fdp.fifa.org/assetspublic/ce${editionId}/r${reportRegistrationId}` +
    `/pdf/TacticalLineup-${safeLanguage}.pdf`
  );
}

export function validateFifaTacticalLineupIndex(index) {
  const issues = [];
  if (!index || typeof index !== "object" || Array.isArray(index)) {
    return ["FIFA tactical lineup index must be an object"];
  }

  if (index.schemaVersion !== "1.0") {
    issues.push("schemaVersion must be 1.0");
  }
  if (typeof index.updatedAt !== "string" || !Number.isFinite(Date.parse(index.updatedAt))) {
    issues.push("updatedAt must be a valid timestamp");
  }

  if (!positiveInteger(index.competitionEditionId)) {
    issues.push("competitionEditionId must be a positive integer string or number");
  }
  if (!positiveInteger(index.minimumRegistrationId)) {
    issues.push("minimumRegistrationId must be a positive integer");
  }
  if (!positiveInteger(index.maximumKnownRegistrationId)) {
    issues.push("maximumKnownRegistrationId must be a positive integer");
  }
  if (
    positiveInteger(index.minimumRegistrationId) &&
    positiveInteger(index.maximumKnownRegistrationId) &&
    Number(index.minimumRegistrationId) > Number(index.maximumKnownRegistrationId)
  ) {
    issues.push("minimumRegistrationId must not exceed maximumKnownRegistrationId");
  }
  if (
    index.lookaheadRegistrationCount !== undefined &&
    (!positiveInteger(index.lookaheadRegistrationCount) || Number(index.lookaheadRegistrationCount) > MAX_LOOKAHEAD_REGISTRATION_COUNT)
  ) {
    issues.push(`lookaheadRegistrationCount must be between 1 and ${MAX_LOOKAHEAD_REGISTRATION_COUNT}`);
  }
  if (index.extendedLookaheadRegistrationCount !== undefined) {
    const immediateCount = positiveInteger(index.lookaheadRegistrationCount, DEFAULT_LOOKAHEAD_REGISTRATION_COUNT);
    const extendedCount = positiveInteger(index.extendedLookaheadRegistrationCount);
    if (!extendedCount || extendedCount < immediateCount || extendedCount > MAX_EXTENDED_LOOKAHEAD_REGISTRATION_COUNT) {
      issues.push(
        `extendedLookaheadRegistrationCount must be between lookaheadRegistrationCount and ${MAX_EXTENDED_LOOKAHEAD_REGISTRATION_COUNT}`
      );
    }
  }
  if (
    index.registrationsByMatchNumber === null ||
    typeof index.registrationsByMatchNumber !== "object" ||
    Array.isArray(index.registrationsByMatchNumber)
  ) {
    issues.push("registrationsByMatchNumber must be an object");
  } else {
    const registrationOwners = new Map();
    for (const [matchNumber, registrationId] of Object.entries(index.registrationsByMatchNumber)) {
      if (!positiveInteger(matchNumber) || !positiveInteger(registrationId)) {
        issues.push(`registration mapping ${matchNumber} must use positive integer identifiers`);
        continue;
      }
      const key = String(registrationId);
      if (registrationOwners.has(key) && registrationOwners.get(key) !== String(matchNumber)) {
        issues.push(
          `registration ${registrationId} is mapped to matches ${registrationOwners.get(key)} and ${matchNumber}`
        );
      }
      registrationOwners.set(key, String(matchNumber));
    }
  }

  if (index.documents !== undefined) {
    if (index.documents === null || typeof index.documents !== "object" || Array.isArray(index.documents)) {
      issues.push("documents must be an object when provided");
    } else {
      for (const [matchNumber, document] of Object.entries(index.documents)) {
        const prefix = `documents.${matchNumber}`;
        const mappedRegistrationId = positiveInteger(index.registrationsByMatchNumber?.[matchNumber]);
        const registrationId = positiveInteger(document?.registrationId);
        if (!positiveInteger(matchNumber) || !document || typeof document !== "object" || Array.isArray(document)) {
          issues.push(`${prefix} must be an object keyed by a positive match number`);
          continue;
        }
        if (typeof document.fixtureId !== "string" || !document.fixtureId.trim()) {
          issues.push(`${prefix}.fixtureId must be a non-empty string`);
        }
        if (!registrationId || registrationId !== mappedRegistrationId) {
          issues.push(`${prefix}.registrationId must match registrationsByMatchNumber`);
        }
        const expectedUrl = buildFifaTacticalLineupUrl({
          competitionEditionId: index.competitionEditionId,
          registrationId
        });
        if (!expectedUrl || document.url !== expectedUrl) {
          issues.push(`${prefix}.url must be the canonical official FIFA Tactical Line-up PDF URL`);
        }
        if (!positiveInteger(document.version)) {
          issues.push(`${prefix}.version must be a positive integer`);
        }
        if (typeof document.publishedAt !== "string" || !Number.isFinite(Date.parse(document.publishedAt))) {
          issues.push(`${prefix}.publishedAt must be a valid timestamp`);
        }
        if (!/^[a-f0-9]{64}$/.test(String(document.sha256 || ""))) {
          issues.push(`${prefix}.sha256 must be a lowercase SHA-256 digest`);
        }
        if (
          document.archiveUrl !== undefined &&
          !/^https:\/\/web\.archive\.org\/web\/\d{14}id_\/https:\/\/fdp\.fifa\.org\//.test(String(document.archiveUrl || ""))
        ) {
          issues.push(`${prefix}.archiveUrl must be an exact Wayback replay of an official FIFA document`);
        }
        if (
          document.capturedAt !== undefined &&
          (typeof document.capturedAt !== "string" || !Number.isFinite(Date.parse(document.capturedAt)))
        ) {
          issues.push(`${prefix}.capturedAt must be a valid timestamp when provided`);
        }
      }
    }
  }

  return issues;
}

export function getFifaTacticalRegistrationCandidates(index, matchNumber, { probeBatchOffset = 0 } = {}) {
  const targetMatchNumber = positiveInteger(matchNumber);
  if (!targetMatchNumber || validateFifaTacticalLineupIndex(index).length) {
    return [];
  }

  const mappings = index.registrationsByMatchNumber || {};
  const directRegistrationId = positiveInteger(mappings[String(targetMatchNumber)]);
  const knownRegistrationIds = new Set(
    Object.values(mappings).map((value) => positiveInteger(value)).filter(Boolean)
  );
  const minimumRegistrationId = positiveInteger(index.minimumRegistrationId);
  const maximumKnownRegistrationId = positiveInteger(index.maximumKnownRegistrationId);
  const lookaheadRegistrationCount = Math.min(
    positiveInteger(index.lookaheadRegistrationCount, DEFAULT_LOOKAHEAD_REGISTRATION_COUNT),
    MAX_LOOKAHEAD_REGISTRATION_COUNT
  );
  const candidates = [];

  if (directRegistrationId) {
    candidates.push(directRegistrationId);
  }

  // Registration identifiers are allocated by FIFA's data platform and do not
  // follow match-number order. Recheck unresolved gaps before probing forward.
  for (let registrationId = minimumRegistrationId; registrationId <= maximumKnownRegistrationId; registrationId += 1) {
    if (!knownRegistrationIds.has(registrationId)) {
      candidates.push(registrationId);
    }
  }
  for (
    let registrationId = maximumKnownRegistrationId + 1;
    registrationId <= maximumKnownRegistrationId + lookaheadRegistrationCount;
    registrationId += 1
  ) {
    candidates.push(registrationId);
  }

  // A temporal 404 cannot be persisted as terminal because FIFA may allocate
  // that report id later. Sweep one additional bounded batch on each poll,
  // rotating by the caller's five-minute bucket, while always retrying the
  // immediate frontier above. This prevents a gap larger than the immediate
  // lookahead from stalling discovery forever without creating polling-state
  // commits or forgetting ids that were checked before publication.
  const extendedLookaheadRegistrationCount = Math.min(
    positiveInteger(index.extendedLookaheadRegistrationCount),
    MAX_EXTENDED_LOOKAHEAD_REGISTRATION_COUNT
  );
  const extendedRangeCount = Math.max(0, extendedLookaheadRegistrationCount - lookaheadRegistrationCount);
  const extendedBatchCount = Math.ceil(extendedRangeCount / lookaheadRegistrationCount);
  if (extendedBatchCount > 0) {
    const safeOffset = Math.abs(Math.trunc(Number(probeBatchOffset) || 0)) % extendedBatchCount;
    const batchStart = maximumKnownRegistrationId + lookaheadRegistrationCount + 1 + safeOffset * lookaheadRegistrationCount;
    const batchEnd = Math.min(
      batchStart + lookaheadRegistrationCount - 1,
      maximumKnownRegistrationId + extendedLookaheadRegistrationCount
    );
    for (let registrationId = batchStart; registrationId <= batchEnd; registrationId += 1) {
      candidates.push(registrationId);
    }
  }

  return [...new Set(candidates)];
}

export function recordFifaTacticalRegistration(index, { matchNumber, registrationId }) {
  const targetMatchNumber = positiveInteger(matchNumber);
  const targetRegistrationId = positiveInteger(registrationId);
  if (!targetMatchNumber || !targetRegistrationId) {
    throw new Error("FIFA tactical registration mapping requires positive match and registration ids");
  }

  const mappings = index.registrationsByMatchNumber || (index.registrationsByMatchNumber = {});
  const matchKey = String(targetMatchNumber);
  const existingRegistrationId = positiveInteger(mappings[matchKey]);
  if (existingRegistrationId && existingRegistrationId !== targetRegistrationId) {
    throw new Error(
      `FIFA tactical match ${targetMatchNumber} is already mapped to registration ${existingRegistrationId}`
    );
  }
  const conflictingMatch = Object.entries(mappings).find(
    ([candidateMatchNumber, candidateRegistrationId]) =>
      candidateMatchNumber !== matchKey && positiveInteger(candidateRegistrationId) === targetRegistrationId
  );
  if (conflictingMatch) {
    throw new Error(
      `FIFA tactical registration ${targetRegistrationId} is already mapped to match ${conflictingMatch[0]}`
    );
  }

  let changed = false;
  if (!existingRegistrationId) {
    mappings[matchKey] = targetRegistrationId;
    changed = true;
  }
  if (targetRegistrationId > positiveInteger(index.maximumKnownRegistrationId)) {
    index.maximumKnownRegistrationId = targetRegistrationId;
    changed = true;
  }
  if (!positiveInteger(index.minimumRegistrationId) || targetRegistrationId < Number(index.minimumRegistrationId)) {
    index.minimumRegistrationId = targetRegistrationId;
    changed = true;
  }
  return changed;
}

export function recordFifaTacticalDocument(index, {
  fixtureId,
  matchNumber,
  registrationId,
  url,
  version,
  publishedAt,
  sha256,
  archiveUrl = "",
  capturedAt = ""
}) {
  let changed = recordFifaTacticalRegistration(index, { matchNumber, registrationId });
  const documentRecord = {
    fixtureId,
    registrationId: positiveInteger(registrationId),
    url,
    version: positiveInteger(version),
    publishedAt,
    sha256,
    ...(archiveUrl ? { archiveUrl } : {}),
    ...(capturedAt ? { capturedAt } : {})
  };
  const matchKey = String(positiveInteger(matchNumber));
  const documents = index.documents || (index.documents = {});
  if (JSON.stringify(documents[matchKey] || null) !== JSON.stringify(documentRecord)) {
    documents[matchKey] = documentRecord;
    changed = true;
  }
  return changed;
}
