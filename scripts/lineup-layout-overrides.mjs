import { isPlayerNameMatch, normalizePlayerName } from "./player-name-matching.mjs";
import { getLineupGeometryIssues } from "./lineup-geometry.mjs";
import {
  DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE,
  FIFA_OFFICIAL_LAYOUT_SOURCE,
  isDerivedLayoutSource,
  normalizeLayoutSource,
  VERIFIED_LAYOUT_SOURCE
} from "./lineup-layout-sources.mjs";

export { FIFA_OFFICIAL_LAYOUT_SOURCE, VERIFIED_LAYOUT_SOURCE };

const LAYOUT_OVERRIDE_SOURCE_STATUSES = new Set(["matched", "unavailable", "blocked", "error", "conflict"]);
const VERIFIED_OVERRIDE_LAYOUT_SOURCES = new Set([
  VERIFIED_LAYOUT_SOURCE,
  FIFA_OFFICIAL_LAYOUT_SOURCE
]);
const FIFA_TACTICAL_VERIFICATION_METHOD = "fifa-tactical-lineup-pdf-v1";
const FIFA_TACTICAL_DOCUMENT_URL_PATTERN =
  /^https:\/\/fdp\.fifa\.org\/assetspublic\/ce(\d+)\/r(\d+)\/pdf\/TacticalLineup-English\.pdf$/;

export function normalizeLayoutPlayerName(value) {
  return normalizePlayerName(value || "");
}

function playerName(player) {
  return String(player?.name || player?.fullName || player?.displayName || "").trim();
}

function layoutPlayerKey(player) {
  return normalizeLayoutPlayerName(playerName(player));
}

function sameLayoutPlayer(left, right) {
  const leftName = playerName(left);
  const rightName = playerName(right);
  if (!leftName || !rightName) {
    return false;
  }

  return (
    normalizeLayoutPlayerName(leftName) === normalizeLayoutPlayerName(rightName) ||
    isPlayerNameMatch(leftName, rightName) ||
    isPlayerNameMatch(rightName, leftName)
  );
}

function findOverridePlayer(player, overridePlayers, usedIndexes) {
  const number = String(player?.number || "").trim();
  const exactNumberMatch = number
    ? overridePlayers.findIndex(
        (overridePlayer, index) =>
          !usedIndexes.has(index) &&
          String(overridePlayer?.number || "").trim() === number &&
          sameLayoutPlayer(player, overridePlayer)
      )
    : -1;
  if (exactNumberMatch >= 0) {
    return exactNumberMatch;
  }

  return overridePlayers.findIndex(
    (overridePlayer, index) =>
      !usedIndexes.has(index) &&
      (sameLayoutPlayer(player, overridePlayer) ||
        (number && String(overridePlayer?.number || "").trim() === number))
  );
}

function applyLayoutSideOverride(teamLineup, sideOverride) {
  if (!teamLineup || !Array.isArray(teamLineup.players) || !sideOverride || !Array.isArray(sideOverride.players)) {
    return teamLineup;
  }

  const usedIndexes = new Set();
  const players = teamLineup.players.map((player) => {
    const overrideIndex = findOverridePlayer(player, sideOverride.players, usedIndexes);
    if (overrideIndex < 0) {
      return player;
    }

    usedIndexes.add(overrideIndex);
    const overridePlayer = sideOverride.players[overrideIndex];
    return {
      ...player,
      position: overridePlayer.position || player.position,
      x: overridePlayer.x,
      y: overridePlayer.y
    };
  });

  return {
    ...teamLineup,
    formation: sideOverride.formation || teamLineup.formation,
    players
  };
}

export function getVerifiedLayoutOverride(overridesData, fixtureId) {
  const override = overridesData?.fixtures?.[fixtureId];
  if (!override || override.status !== "verified") {
    return null;
  }

  if (getLayoutOverrideProvenanceIssues(override).length) {
    return null;
  }

  return override;
}

export function isFifaOfficialLayoutOverride(override) {
  return (
    override?.status === "verified" &&
    normalizeLayoutSource(override.layoutSource) === FIFA_OFFICIAL_LAYOUT_SOURCE
  );
}

export function shouldPreserveLayoutOverride(override, { reverify = false } = {}) {
  return Boolean(override && (!reverify || isFifaOfficialLayoutOverride(override)));
}

export function applyLineupLayoutOverride(lineups, override) {
  if (
    !lineups ||
    !override ||
    override.status !== "verified" ||
    getLayoutOverrideProvenanceIssues(override).length
  ) {
    return lineups;
  }

  const layoutSource = normalizeLayoutSource(override.layoutSource) || VERIFIED_LAYOUT_SOURCE;
  const overrideSourceIds = Array.isArray(override.sourceIds) ? override.sourceIds : [];

  return {
    ...lineups,
    layoutSource,
    sourceIds: [...new Set([...(lineups.sourceIds || []), ...overrideSourceIds])],
    layoutVerification: {
      status: "verified",
      checkedAt: override.checkedAt,
      sourceIds: overrideSourceIds,
      sources: summarizeOverrideSources(override.sources),
      note: override.note || ""
    },
    home: applyLayoutSideOverride(lineups.home, override.home),
    away: applyLayoutSideOverride(lineups.away, override.away)
  };
}

export function canApplyLineupLayoutOverride(lineups, override) {
  if (!lineups || !override) return false;
  const applied = applyLineupLayoutOverride(lineups, override);
  return compareLineupsToLayoutOverride(applied, override).length === 0;
}

function summarizeOverrideSources(sources) {
  return (Array.isArray(sources) ? sources : []).map((source) => ({
    name: source.name,
    ...(source.adapter ? { adapter: source.adapter } : {}),
    url: source.url,
    status: source.status,
    ...(source.sourceDetail ? { sourceDetail: source.sourceDetail } : {}),
    ...(source.exactLayout !== undefined ? { exactLayout: source.exactLayout } : {}),
    ...(source.matchNumber !== undefined ? { matchNumber: source.matchNumber } : {}),
    ...(source.registrationId !== undefined ? { registrationId: source.registrationId } : {}),
    ...(source.documentVersion !== undefined ? { documentVersion: source.documentVersion } : {}),
    ...(source.publishedAt ? { publishedAt: source.publishedAt } : {}),
    ...(source.archiveUrl ? { archiveUrl: source.archiveUrl } : {}),
    ...(source.capturedAt ? { capturedAt: source.capturedAt } : {}),
    ...(source.sha256 ? { sha256: source.sha256 } : {}),
    ...(source.note ? { note: source.note } : {})
  }));
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isHttpUrl(value) {
  return /^https?:\/\//.test(String(value || ""));
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isMatchedExactLayoutSource(source) {
  return source?.status === "matched" && source?.exactLayout === true;
}

function isPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

function isValidTimestamp(value) {
  return hasText(value) && Number.isFinite(Date.parse(value));
}

function getFifaTacticalSourceIssues(source, prefix) {
  const issues = [];
  const urlMatch = String(source?.url || "").match(FIFA_TACTICAL_DOCUMENT_URL_PATTERN);
  if (source?.adapter !== "fifa-tactical-pdf") {
    issues.push(`${prefix}.adapter must be fifa-tactical-pdf`);
  }
  if (!urlMatch) {
    issues.push(`${prefix}.url must be an official FIFA Tactical Line-up PDF URL`);
  }
  if (!isPositiveInteger(source?.matchNumber)) {
    issues.push(`${prefix}.matchNumber must be a positive integer`);
  }
  if (!isPositiveInteger(source?.registrationId)) {
    issues.push(`${prefix}.registrationId must be a positive integer`);
  } else if (urlMatch && Number(urlMatch[2]) !== Number(source.registrationId)) {
    issues.push(`${prefix}.registrationId must match the official document URL`);
  }
  if (!isPositiveInteger(source?.documentVersion)) {
    issues.push(`${prefix}.documentVersion must be a positive integer`);
  }
  if (!isValidTimestamp(source?.publishedAt)) {
    issues.push(`${prefix}.publishedAt must be a valid timestamp`);
  }
  if (!/^[a-f0-9]{64}$/.test(String(source?.sha256 || ""))) {
    issues.push(`${prefix}.sha256 must be a lowercase SHA-256 digest`);
  }
  if (
    source?.archiveUrl !== undefined &&
    !/^https:\/\/web\.archive\.org\/web\/\d{14}id_\/https:\/\/fdp\.fifa\.org\//.test(String(source.archiveUrl || ""))
  ) {
    issues.push(`${prefix}.archiveUrl must be an exact Wayback replay of the official FIFA PDF`);
  }
  if (source?.capturedAt !== undefined && !isValidTimestamp(source.capturedAt)) {
    issues.push(`${prefix}.capturedAt must be a valid timestamp when provided`);
  }
  return issues;
}

function layoutClaimSignature(source) {
  const home = String(source?.signature?.home || "").trim();
  const away = String(source?.signature?.away || "").trim();
  return home || away ? `${home}::${away}` : "";
}

function noteClaimsMissingSource(note, sources) {
  const sourceNames = new Set(
    sources.map((source) => String(source?.name || "").trim().toLowerCase()).filter(Boolean)
  );
  const text = String(note || "").toLowerCase();
  return ["ESPN", "FotMob", "Google", "Sofascore"]
    .filter((name) => text.includes(name.toLowerCase()) && !sourceNames.has(name.toLowerCase()));
}

export function getLayoutOverrideProvenanceIssues(override) {
  const issues = [];
  if (!isPlainObject(override)) {
    return ["override must be an object"];
  }

  if (!Array.isArray(override.sourceIds) || override.sourceIds.length === 0) {
    issues.push("sourceIds must include at least one source id");
  }

  const sources = Array.isArray(override.sources) ? override.sources : [];
  if (!Array.isArray(override.sources) || sources.length === 0) {
    issues.push("sources must include at least one checked source");
  }

  for (const [index, source] of sources.entries()) {
    const prefix = `sources[${index}]`;
    if (!isPlainObject(source)) {
      issues.push(`${prefix} must be an object`);
      continue;
    }
    if (!hasText(source.name)) {
      issues.push(`${prefix}.name must be a non-empty string`);
    }
    if (!isHttpUrl(source.url)) {
      issues.push(`${prefix}.url must be an http(s) URL`);
    }
    if (!LAYOUT_OVERRIDE_SOURCE_STATUSES.has(source.status)) {
      issues.push(`${prefix}.status must be matched, unavailable, blocked, error, or conflict`);
    }
    if (source.exactLayout !== undefined && typeof source.exactLayout !== "boolean") {
      issues.push(`${prefix}.exactLayout must be a boolean when provided`);
    }
    if (isMatchedExactLayoutSource(source) && !hasText(source.sourceDetail)) {
      issues.push(`${prefix}.sourceDetail must describe the exact layout evidence`);
    }
  }

  if (override.status === "verified") {
    const normalizedLayoutSource = normalizeLayoutSource(override.layoutSource);
    if (!VERIFIED_OVERRIDE_LAYOUT_SOURCES.has(normalizedLayoutSource)) {
      issues.push(
        `layoutSource must be ${VERIFIED_LAYOUT_SOURCE} or ${FIFA_OFFICIAL_LAYOUT_SOURCE} for verified overrides`
      );
    }
    if (!hasText(override.note)) {
      issues.push("note must explain what was verified");
    }
    if (!sources.some(isMatchedExactLayoutSource)) {
      issues.push("verified overrides must include at least one matched source with exactLayout true");
    }
    if (normalizedLayoutSource === FIFA_OFFICIAL_LAYOUT_SOURCE) {
      if (override.verificationMethod !== FIFA_TACTICAL_VERIFICATION_METHOD) {
        issues.push(`FIFA official overrides must use ${FIFA_TACTICAL_VERIFICATION_METHOD}`);
      }
      const officialSources = sources
        .map((source, index) => ({ source, index }))
        .filter(({ source }) => isMatchedExactLayoutSource(source) && source?.adapter === "fifa-tactical-pdf");
      if (officialSources.length !== 1) {
        issues.push("FIFA official overrides must include exactly one matched FIFA tactical PDF source");
      }
      for (const { source, index } of officialSources) {
        issues.push(...getFifaTacticalSourceIssues(source, `sources[${index}]`));
      }
    } else if (override.verificationMethod === FIFA_TACTICAL_VERIFICATION_METHOD) {
      issues.push(`${FIFA_TACTICAL_VERIFICATION_METHOD} requires ${FIFA_OFFICIAL_LAYOUT_SOURCE}`);
    }
    if (["source-consensus-v1", "source-majority-v1"].includes(override.verificationMethod)) {
      const exactProviderIds = new Set(
        sources
          .filter(isMatchedExactLayoutSource)
          .map((source) => String(source.adapter || source.name || "").trim().toLowerCase())
          .filter(Boolean)
      );
      if (exactProviderIds.size < 2) {
        issues.push(`${override.verificationMethod} overrides must include two distinct matched exact-layout providers`);
      }
      if (override.consensus?.aggregation !== "canonical-formation-grid") {
        issues.push(`${override.verificationMethod} overrides must record canonical-formation-grid aggregation`);
      }
      const conflictingProviderNames = sources
        .filter((source) => source?.status === "conflict")
        .map((source) => String(source?.name || "").trim())
        .filter(Boolean);
      if (override.verificationMethod === "source-consensus-v1" && conflictingProviderNames.length) {
        issues.push("source-consensus-v1 overrides must not contain source conflicts");
      }
      if (override.verificationMethod === "source-majority-v1") {
        const matchedExactCount = sources.filter(isMatchedExactLayoutSource).length;
        const conflictingExactCount = sources.filter(
          (source) => source?.status === "conflict" && source?.exactLayout === true
        ).length;
        const recordedDissenters = new Set(
          Array.isArray(override.consensus?.dissentingProviders)
            ? override.consensus.dissentingProviders.map((name) => String(name || "").trim()).filter(Boolean)
            : []
        );
        if (!conflictingProviderNames.length) {
          issues.push("source-majority-v1 overrides must retain at least one conflicting provider");
        }
        if (matchedExactCount <= conflictingExactCount) {
          issues.push("source-majority-v1 overrides must retain a strict majority of matched exact-layout providers");
        }
        if (
          conflictingProviderNames.some((name) => !recordedDissenters.has(name)) ||
          [...recordedDissenters].some((name) => !conflictingProviderNames.includes(name))
        ) {
          issues.push("source-majority-v1 dissentingProviders must match the retained source conflicts");
        }
      }
    }
    if (override.verificationMethod === "manual-review-v1") {
      const selectedProvider = String(override.manualReview?.selectedProvider || "").trim();
      const formationEvidenceProvider = String(
        override.manualReview?.formationEvidenceProvider || ""
      ).trim();
      if (!selectedProvider) {
        issues.push("manual-review-v1 overrides must record manualReview.selectedProvider");
      }
      if (!isValidTimestamp(override.manualReview?.checkedAt)) {
        issues.push("manual-review-v1 overrides must record a valid manualReview.checkedAt");
      }
      if (!formationEvidenceProvider) {
        issues.push("manual-review-v1 overrides must record manualReview.formationEvidenceProvider");
      }
      if (!sources.some((source) =>
        source?.status === "matched" &&
        source?.exactLayout === true &&
        String(source?.name || "").trim() === selectedProvider
      )) {
        issues.push("manual-review-v1 selectedProvider must be a matched exact-layout source");
      }
      if (!sources.some((source) =>
        source?.status === "matched" &&
        String(source?.name || "").trim() === formationEvidenceProvider
      )) {
        issues.push("manual-review-v1 formationEvidenceProvider must be stored as a matched source");
      }
    }
    if (
      sources.some((source) => source?.status === "conflict") &&
      !["source-majority-v1", "manual-review-v1"].includes(override.verificationMethod)
    ) {
      issues.push("verified overrides must not contain unresolved source conflicts");
    }
    const matchedSignatures = new Set(
      sources
        .filter((source) => source?.status === "matched")
        .map(layoutClaimSignature)
        .filter(Boolean)
    );
    if (matchedSignatures.size > 1) {
      issues.push("verified overrides must not contain conflicting tactical signatures");
    }
    if (/\bagreed\b/i.test(override.note || "") && sources.filter((source) => source?.status === "matched").length < 2) {
      issues.push("note must not claim source agreement when fewer than two matched sources are stored");
    }
    const missingNamedSources = noteClaimsMissingSource(override.note, sources);
    if (missingNamedSources.length) {
      issues.push(`note names sources that are not stored: ${missingNamedSources.join(", ")}`);
    }
    issues.push(...getLineupGeometryIssues(override?.home?.players, { owner: "home override" }));
    issues.push(...getLineupGeometryIssues(override?.away?.players, { owner: "away override" }));
  }

  if (override.status === "unresolved" && !hasText(override.unresolvedReason)) {
    issues.push("unresolvedReason must explain why the layout was not verified");
  }

  return issues;
}

function coordinatesMatch(left, right) {
  return Math.abs(Number(left) - Number(right)) < 0.05;
}

function compareLayoutSide(teamLineup, sideOverride, owner) {
  const issues = [];
  const players = Array.isArray(teamLineup?.players) ? teamLineup.players : [];
  const overridePlayers = Array.isArray(sideOverride?.players) ? sideOverride.players : [];

  issues.push(...getLineupGeometryIssues(players, { owner }));

  if (players.length !== 11) {
    issues.push(`${owner} must keep 11 starters`);
  }
  if (overridePlayers.length !== 11) {
    issues.push(`${owner} override must include 11 starters`);
  }

  const byKey = new Map();
  for (const player of players) {
    const key = layoutPlayerKey(player);
    if (key) {
      byKey.set(key, player);
    }
  }

  for (const overridePlayer of overridePlayers) {
    const overrideName = playerName(overridePlayer);
    const key = layoutPlayerKey(overridePlayer);
    const player =
      byKey.get(key) ||
      players.find((candidate) => sameLayoutPlayer(candidate, overridePlayer)) ||
      players.find((candidate) => String(candidate?.number || "").trim() === String(overridePlayer?.number || "").trim());

    if (!player) {
      issues.push(`${owner} is missing verified layout player "${overrideName}"`);
      continue;
    }

    if (String(player.position || "").trim() !== String(overridePlayer.position || "").trim()) {
      issues.push(`${owner} ${overrideName} position fell back to ${player.position || "(blank)"}`);
    }
    if (!coordinatesMatch(player.x, overridePlayer.x) || !coordinatesMatch(player.y, overridePlayer.y)) {
      issues.push(`${owner} ${overrideName} coordinates fell back to ${player.x},${player.y}`);
    }
  }

  return issues;
}

export function compareLineupsToLayoutOverride(lineups, override) {
  if (!lineups || !override || override.status !== "verified") {
    return [];
  }

  const issues = [];
  const expectedSource = normalizeLayoutSource(override.layoutSource) || VERIFIED_LAYOUT_SOURCE;
  const actualSource = normalizeLayoutSource(lineups.layoutSource);

  if (actualSource !== expectedSource) {
    issues.push(`layoutSource must be ${expectedSource}, not ${lineups.layoutSource || "(blank)"}`);
  }
  if (isDerivedLayoutSource(lineups.layoutSource)) {
    issues.push(`verified layout must not use ${DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE}`);
  }

  const lineupsSourceIds = new Set(Array.isArray(lineups.sourceIds) ? lineups.sourceIds : []);
  for (const sourceId of override.sourceIds || []) {
    if (!lineupsSourceIds.has(sourceId)) {
      issues.push(`sourceIds must include verified layout source "${sourceId}"`);
    }
  }

  issues.push(...compareLayoutSide(lineups.home, override.home, "home layout"));
  issues.push(...compareLayoutSide(lineups.away, override.away, "away layout"));

  return issues;
}
