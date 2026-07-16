const UPDATED_PERSPECTIVES = new Set(["observed", "revised"]);

export function canAutoApplyFifaTacticalDocument({
  publishedAt,
  kickoffMs,
  layoutPerspective
}) {
  const publishedMs = new Date(publishedAt || "").getTime();
  if (!Number.isFinite(publishedMs) || !Number.isFinite(kickoffMs)) return false;
  if (publishedMs <= kickoffMs) return true;
  return UPDATED_PERSPECTIVES.has(layoutPerspective);
}

export function fifaTacticalVersionDecision({ parsed, existingSource }) {
  if (!existingSource) return { action: "accept", reason: "" };
  const incomingVersion = Number(parsed?.version);
  const existingVersion = Number(existingSource?.documentVersion);
  if (!Number.isInteger(incomingVersion) || !Number.isInteger(existingVersion)) {
    return { action: "reject", reason: "document version metadata is invalid" };
  }
  if (incomingVersion < existingVersion) {
    return {
      action: "preserve",
      reason: `version ${existingVersion} is already stored`
    };
  }
  if (
    incomingVersion === existingVersion &&
    existingSource.sha256 &&
    parsed?.sha256 !== existingSource.sha256
  ) {
    return {
      action: "reject",
      reason: `version ${incomingVersion} changed content without a version increase`
    };
  }
  return { action: "accept", reason: "" };
}
