export const VERIFIED_LAYOUT_SOURCE = "verified-layout";
export const PROVIDER_LAYOUT_SOURCE = "provider-layout";
export const FIFA_OFFICIAL_LAYOUT_SOURCE = "fifa-official-layout";
export const DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE = "derived-team-sheet-order";

export const LEGACY_VERIFIED_LAYOUT_SOURCE = "editorial-verified";

const EXACT_LAYOUT_SOURCES = new Set([
  VERIFIED_LAYOUT_SOURCE,
  PROVIDER_LAYOUT_SOURCE,
  FIFA_OFFICIAL_LAYOUT_SOURCE
]);

const LAYOUT_SOURCE_ALIASES = new Map([
  [VERIFIED_LAYOUT_SOURCE, VERIFIED_LAYOUT_SOURCE],
  [PROVIDER_LAYOUT_SOURCE, PROVIDER_LAYOUT_SOURCE],
  [FIFA_OFFICIAL_LAYOUT_SOURCE, FIFA_OFFICIAL_LAYOUT_SOURCE],
  [DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE, DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE],
  [LEGACY_VERIFIED_LAYOUT_SOURCE, VERIFIED_LAYOUT_SOURCE],
  ["editorial", VERIFIED_LAYOUT_SOURCE],
  ["provider", PROVIDER_LAYOUT_SOURCE],
  ["fifa-official", FIFA_OFFICIAL_LAYOUT_SOURCE]
]);

export function normalizeLayoutSource(value) {
  const key = String(value || "").trim().toLowerCase();
  return LAYOUT_SOURCE_ALIASES.get(key) || "";
}

export function isKnownLayoutSource(value) {
  return Boolean(normalizeLayoutSource(value));
}

export function isDerivedLayoutSource(value) {
  return normalizeLayoutSource(value) === DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE;
}

export function isExactLayoutSource(value) {
  return EXACT_LAYOUT_SOURCES.has(normalizeLayoutSource(value));
}

export function getLineupLayoutStatus(lineups = {}) {
  const source = normalizeLayoutSource(lineups.layoutSource);
  const verificationStatus = String(lineups.layoutVerification?.status || "").trim().toLowerCase();
  const derived = source === DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE;
  const exact = !derived && (isExactLayoutSource(source) || verificationStatus === "verified");

  return {
    source,
    exact,
    provisional: derived || !exact,
    verified: exact && verificationStatus !== "unverified",
    status: exact ? "verified" : "unverified"
  };
}

export function buildDerivedLayoutVerification(checkedAt = "") {
  return {
    status: "unverified",
    source: DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE,
    exact: false,
    ...(checkedAt ? { checkedAt } : {}),
    note: "Official team sheet confirms players, bench, events, and formation; pitch coordinates are generated from formation slots and are not exact left/right placements."
  };
}
