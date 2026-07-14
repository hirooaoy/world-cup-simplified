import {
  getCanonicalPlayerKey,
  resolvePlayerNameInPool
} from "../../player-name-matching.mjs";

export const FREE_PUBLIC_LINEUPS_PROVIDER_ID = "free-public-lineups";

function normalizeString(value) {
  return String(value || "").trim();
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => normalizeString(value)).filter(Boolean))];
}

function playerName(player) {
  return normalizeString(player?.name || player?.fullName || player?.displayName);
}

function getAvailabilityEntries(playerAvailabilityData, teamId, fixtureId) {
  const teamAvailability = playerAvailabilityData?.teams?.[teamId] || {};
  return [
    ...(Array.isArray(teamAvailability.unavailable) ? teamAvailability.unavailable : []),
    ...(Array.isArray(teamAvailability.fixtureUnavailable)
      ? teamAvailability.fixtureUnavailable.filter((entry) => entry.fixtureId === fixtureId)
      : [])
  ];
}

function getTeamRoster(playerProfilesData, teamId) {
  const profiles = playerProfilesData?.profiles || playerProfilesData?.players || playerProfilesData || {};
  return Object.values(profiles).filter((profile) => profile?.teamId === teamId);
}

function createIdentityResolver({ candidatePool, playerProfilesData, teamId }) {
  const roster = getTeamRoster(playerProfilesData, teamId);
  const primaryPool = roster.length ? roster : candidatePool;

  return (value) => {
    const primary = resolvePlayerNameInPool(value, primaryPool, roster.length
      ? {
          getIdentityKey: (profile) => profile.name || profile.displayName,
          getNames: (profile) => [profile.name, profile.displayName]
        }
      : { getName: playerName });
    if (primary.status !== "unmatched" || primaryPool === candidatePool) return primary;
    return resolvePlayerNameInPool(value, candidatePool, { getName: playerName });
  };
}

function sameResolvedPlayer(left, right, resolveIdentity) {
  const leftIdentity = resolveIdentity(left);
  const rightIdentity = resolveIdentity(right);
  if (leftIdentity.status === "matched" && rightIdentity.status === "matched") {
    return leftIdentity.key === rightIdentity.key;
  }
  const leftKey = getCanonicalPlayerKey(playerName(left));
  return Boolean(leftKey && leftKey === getCanonicalPlayerKey(playerName(right)));
}

function applyLateralOrder(players, lateralOrder) {
  const output = players.map((player) => ({ ...player }));
  if (lateralOrder !== "right-to-left") return output;

  const assign = (position, roles) => {
    const indexes = output
      .map((player, index) => String(player.position || player.role || "").toUpperCase() === position ? index : -1)
      .filter((index) => index >= 0);
    if (indexes.length !== roles.length) return;
    indexes.forEach((playerIndex, roleIndex) => {
      output[playerIndex].position = roles[roleIndex];
    });
  };

  const centreBackCount = output.filter((player) => String(player.position || player.role || "").toUpperCase() === "CB").length;
  if (centreBackCount === 2) assign("CB", ["RCB", "LCB"]);
  if (centreBackCount === 3) assign("CB", ["RCB", "CB", "LCB"]);
  const centralMidfieldCount = output.filter((player) => String(player.position || player.role || "").toUpperCase() === "CM").length;
  if (centralMidfieldCount === 2) assign("CM", ["RCM", "LCM"]);
  if (centralMidfieldCount === 3) assign("CM", ["RCM", "CM", "LCM"]);
  return output;
}

function normalizePlayer(player, sourceId, confidence) {
  return {
    name: playerName(player),
    number: normalizeString(player.number),
    position: normalizeString(player.position || player.role),
    confidence: {
      score: Number(player.confidence?.score ?? confidence),
      reason: player.confidence?.reason || "Free public probable-lineup source"
    },
    sourceIds: [sourceId],
    evidence: [player.evidence || "Free public probable-lineup source"]
  };
}

function normalizeSide({ expectedTeamId, fixtureId, playerAvailabilityData, playerProfilesData, sideData, sourceEntry, sourceId, side }) {
  const teamId = normalizeString(sideData?.teamId);
  const starters = Array.isArray(sideData?.starters)
    ? applyLateralOrder(sideData.starters, sourceEntry.lateralOrder)
    : [];
  if (!teamId || !starters.length || starters.length > 11 || (expectedTeamId && teamId !== expectedTeamId)) {
    return null;
  }

  const unavailableEntries = getAvailabilityEntries(playerAvailabilityData, teamId, fixtureId);
  const rawBench = Array.isArray(sideData.bench) ? sideData.bench : [];
  const candidatePool = [...starters, ...rawBench];
  const resolveIdentity = createIdentityResolver({ candidatePool, playerProfilesData, teamId });
  const unavailableKeys = new Set(
    unavailableEntries
      .map((entry) => resolveIdentity(entry.name))
      .filter((identity) => identity.status === "matched")
      .map((identity) => identity.key)
  );
  const isUnavailablePlayer = (player) => {
    const identity = resolveIdentity(player);
    return identity.status === "matched" && unavailableKeys.has(identity.key);
  };
  const availableStarters = starters.filter((player) => !isUnavailablePlayer(player));
  if (!availableStarters.length) return null;

  const confidenceScore = Number(sourceEntry.confidence?.score ?? sourceEntry.confidence ?? 0.82);
  return {
    teamId,
    formation: normalizeString(sideData.formation || sourceEntry.formation || "4-2-3-1"),
    starters: availableStarters.map((player) => normalizePlayer(player, sourceId, confidenceScore)),
    benchCandidates: rawBench
      .filter((player) => !isUnavailablePlayer(player))
      .filter((player) => !availableStarters.some((starter) => sameResolvedPlayer(starter, player, resolveIdentity)))
      .map((player) => normalizePlayer(player, sourceId, Math.max(0.45, confidenceScore - 0.2))),
    unavailable: unavailableEntries.map((entry) => ({
      name: entry.name,
      reason: entry.reason,
      sourceIds: [entry.sourceId].filter(Boolean)
    })),
    sourceIds: uniqueStrings([sourceId, ...unavailableEntries.map((entry) => entry.sourceId)]),
    confidence: {
      score: confidenceScore,
      reason: `${side} lineup from ${sourceId}`
    },
    notes: uniqueStrings([
      sourceEntry.note,
      sideData.note,
      `${unavailableEntries.length} availability exclusion${unavailableEntries.length === 1 ? "" : "s"} checked`
    ]),
    evidence: [
      {
        fixtureId,
        teamId,
        type: "free-public-probable-lineup",
        weight: Number(sourceEntry.weight || 1),
        confidence: { score: confidenceScore },
        sourceIds: [sourceId],
        updatedAt: sourceEntry.checkedAt || sourceEntry.updatedAt || "1970-01-01T00:00:00.000Z",
        notes: uniqueStrings([sourceEntry.note, sideData.note])
      }
    ]
  };
}

export function createFreePublicLineupsProvider({ checkedAt } = {}) {
  return {
    id: FREE_PUBLIC_LINEUPS_PROVIDER_ID,
    label: "Free public probable lineups",
    version: "1",
    async collect(context) {
      return {
        checkedAt,
        playerAvailabilityData: context.playerAvailabilityData || {},
        playerProfilesData: context.playerProfilesData || {},
        sourceDocument: context.freeLineupPredictionsData || {},
        targetFixtures: context.targetFixtures || []
      };
    },
    async normalize(raw) {
      const targetFixturesById = new Map((raw.targetFixtures || []).map((fixture) => [fixture.id, fixture]));
      const sourceMetadataById = new Map(
        (raw.sourceDocument.sources || []).map((source) => [source.id, source])
      );
      const candidates = [];

      for (const fixtureEntry of raw.sourceDocument.fixtures || []) {
        const fixtureId = normalizeString(fixtureEntry.fixtureId);
        const fixture = targetFixturesById.get(fixtureId);
        if (!fixtureId || !fixture) {
          continue;
        }

        for (const sourceEntry of fixtureEntry.sources || []) {
          const sourceId = normalizeString(sourceEntry.sourceId);
          if (!sourceId) {
            continue;
          }
          const sourceMetadata = sourceMetadataById.get(sourceId) || {};
          const resolvedCheckedAt = sourceEntry.checkedAt || sourceMetadata.checkedAt || undefined;
          const normalizedSourceEntry = {
            ...sourceMetadata,
            ...sourceEntry,
            lateralOrder: sourceEntry.lateralOrder || sourceMetadata.lateralOrder || raw.sourceDocument.defaultLateralOrder,
            ...(resolvedCheckedAt ? { checkedAt: resolvedCheckedAt } : {})
          };
          const home = normalizeSide({
            expectedTeamId: fixture.homeTeamId,
            fixtureId,
            playerAvailabilityData: raw.playerAvailabilityData,
            playerProfilesData: raw.playerProfilesData,
            side: "home",
            sideData: sourceEntry.teams?.home,
            sourceEntry: normalizedSourceEntry,
            sourceId
          });
          const away = normalizeSide({
            expectedTeamId: fixture.awayTeamId,
            fixtureId,
            playerAvailabilityData: raw.playerAvailabilityData,
            playerProfilesData: raw.playerProfilesData,
            side: "away",
            sideData: sourceEntry.teams?.away,
            sourceEntry: normalizedSourceEntry,
            sourceId
          });

          if (!home && !away) {
            continue;
          }

          candidates.push({
            fixtureId,
            providerId: FREE_PUBLIC_LINEUPS_PROVIDER_ID,
            providerVersion: "1",
            claimStrength: Math.max(0.5, Math.min(3, Number(normalizedSourceEntry.claimStrength || 1))),
            predictionClass: normalizedSourceEntry.predictionClass === "reported-xi" ? "reported-xi" : "forecast",
            updatedAt: resolvedCheckedAt,
            confidence: {
              score: Number(normalizedSourceEntry.confidence?.score ?? normalizedSourceEntry.confidence ?? 0.82),
              reason: "Free public probable-lineup source"
            },
            sourceIds: uniqueStrings([sourceId, ...(home?.sourceIds || []), ...(away?.sourceIds || [])]),
            lineupSourceIds: [sourceId],
            sides: {
              ...(home ? { home } : {}),
              ...(away ? { away } : {})
            },
            notes: uniqueStrings([normalizedSourceEntry.note, "Free public provider candidate"])
          });
        }
      }

      return candidates;
    }
  };
}
