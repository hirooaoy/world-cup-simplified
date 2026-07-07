import { isPlayerNameMatch } from "../../player-name-matching.mjs";

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

function hasUnavailableStarter(starters, unavailableEntries) {
  return starters.some((starter) =>
    unavailableEntries.some((entry) => isPlayerNameMatch(playerName(starter), entry.name))
  );
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

function normalizeSide({ fixtureId, playerAvailabilityData, sideData, sourceEntry, sourceId, side }) {
  const teamId = normalizeString(sideData?.teamId);
  const starters = Array.isArray(sideData?.starters) ? sideData.starters : [];
  if (!teamId || starters.length !== 11) {
    return null;
  }

  const unavailableEntries = getAvailabilityEntries(playerAvailabilityData, teamId, fixtureId);
  if (hasUnavailableStarter(starters, unavailableEntries)) {
    return null;
  }

  const confidenceScore = Number(sourceEntry.confidence?.score ?? sourceEntry.confidence ?? 0.82);
  return {
    teamId,
    formation: normalizeString(sideData.formation || sourceEntry.formation || "4-2-3-1"),
    starters: starters.map((player) => normalizePlayer(player, sourceId, confidenceScore)),
    benchCandidates: (Array.isArray(sideData.bench) ? sideData.bench : []).map((player) =>
      normalizePlayer(player, sourceId, Math.max(0.45, confidenceScore - 0.2))
    ),
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
        updatedAt: sourceEntry.checkedAt || sourceEntry.updatedAt || new Date().toISOString(),
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
        sourceDocument: context.freeLineupPredictionsData || {},
        targetFixtures: context.targetFixtures || []
      };
    },
    async normalize(raw) {
      const targetFixtureIds = new Set((raw.targetFixtures || []).map((fixture) => fixture.id));
      const candidates = [];

      for (const fixtureEntry of raw.sourceDocument.fixtures || []) {
        const fixtureId = normalizeString(fixtureEntry.fixtureId);
        if (!fixtureId || !targetFixtureIds.has(fixtureId)) {
          continue;
        }

        for (const sourceEntry of fixtureEntry.sources || []) {
          const sourceId = normalizeString(sourceEntry.sourceId);
          const home = normalizeSide({
            fixtureId,
            playerAvailabilityData: raw.playerAvailabilityData,
            side: "home",
            sideData: sourceEntry.teams?.home,
            sourceEntry,
            sourceId
          });
          const away = normalizeSide({
            fixtureId,
            playerAvailabilityData: raw.playerAvailabilityData,
            side: "away",
            sideData: sourceEntry.teams?.away,
            sourceEntry,
            sourceId
          });

          if (!sourceId || !home || !away) {
            continue;
          }

          candidates.push({
            fixtureId,
            providerId: FREE_PUBLIC_LINEUPS_PROVIDER_ID,
            providerVersion: "1",
            updatedAt: sourceEntry.checkedAt || raw.checkedAt,
            confidence: {
              score: Number(sourceEntry.confidence?.score ?? sourceEntry.confidence ?? 0.82),
              reason: "Free public probable-lineup source"
            },
            sourceIds: uniqueStrings([sourceId, ...home.sourceIds, ...away.sourceIds]),
            sides: { home, away },
            notes: uniqueStrings([sourceEntry.note, "Free public provider candidate"])
          });
        }
      }

      return candidates;
    }
  };
}
