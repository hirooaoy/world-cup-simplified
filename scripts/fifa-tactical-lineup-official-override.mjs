import {
  applyLineupLayoutOverride,
  compareLineupsToLayoutOverride
} from "./lineup-layout-overrides.mjs";
import { FIFA_OFFICIAL_LAYOUT_SOURCE } from "./lineup-layout-sources.mjs";

export function sourceIdForFifaTacticalDocument(matchNumber, version, sha256) {
  return `fifa-tactical-lineup-match-${matchNumber}-v${version}-${sha256.slice(0, 12)}`;
}

function layoutPlayers(players) {
  return players.map((player) => ({
    number: String(player.number),
    name: player.name,
    position: player.position,
    x: player.x,
    y: player.y
  }));
}

export function buildFifaOfficialLayoutOverride({
  fixture,
  parsed,
  registrationId,
  url,
  publishedAt,
  archiveUrl = "",
  capturedAt = "",
  checkedAt = ""
}) {
  const sourceId = sourceIdForFifaTacticalDocument(parsed.matchNumber, parsed.version, parsed.sha256);
  const observed = parsed.layoutPerspective === "observed";
  const revised = parsed.layoutPerspective === "revised";
  const sourceDetail = observed
    ? "Positioned text from FIFA's updated post-observation Tactical Line-up PDF matched all 22 starters one-to-one against FIFA's official team sheet."
    : revised
      ? "Positioned text from FIFA's updated Tactical Line-up PDF matched all 22 starters one-to-one against FIFA's official team sheet."
    : archiveUrl
      ? "Positioned text from an archived capture of FIFA's official Tactical Line-up PDF matched all 22 starters one-to-one against FIFA's official team sheet."
      : "Positioned text from FIFA's official Tactical Line-up PDF matched all 22 starters one-to-one against FIFA's official team sheet.";
  return {
    status: "verified",
    layoutSource: FIFA_OFFICIAL_LAYOUT_SOURCE,
    verificationMethod: "fifa-tactical-lineup-pdf-v1",
    checkedAt: publishedAt,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    sourceIds: [sourceId],
    sources: [
      {
        name: "FIFA Tactical Line-up PDF",
        adapter: "fifa-tactical-pdf",
        url,
        ...(archiveUrl ? { archiveUrl } : {}),
        ...(capturedAt ? { capturedAt } : {}),
        status: "matched",
        exactLayout: true,
        sourceDetail,
        matchNumber: parsed.matchNumber,
        registrationId,
        documentVersion: parsed.version,
        publishedAt,
        sha256: parsed.sha256,
        layoutPerspective: parsed.layoutPerspective,
        isUpdatedVersion: parsed.isUpdatedVersion,
        ...(parsed.revisionComment ? { revisionComment: parsed.revisionComment } : {})
      }
    ],
    note: observed
      ? "FIFA's updated Tactical Line-up PDF, published after observation of the game, supplied the observed starting shape and exact player placement."
      : revised
        ? "FIFA's updated Tactical Line-up PDF supplied the latest official starting shape and exact player placement."
      : "FIFA's official Tactical Line-up PDF supplied the nominal tactical rows and left/right placement; all 22 starters matched FIFA's official team sheet.",
    home: {
      formation: parsed.home.formation,
      players: layoutPlayers(parsed.home.players)
    },
    away: {
      formation: parsed.away.formation,
      players: layoutPlayers(parsed.away.players)
    }
  };
}

export function officialFifaTacticalSourceFromOverride(override) {
  return (override?.sources || []).find(
    (source) => source?.adapter === "fifa-tactical-pdf" && source?.status === "matched"
  );
}

export function applyFifaOfficialLayoutOverride(lineups, override, previousOverride) {
  const previousSourceIds = new Set(previousOverride?.sourceIds || []);
  const withoutSupersededLayoutSource = {
    ...lineups,
    sourceIds: (lineups.sourceIds || []).filter((sourceId) => !previousSourceIds.has(sourceId))
  };
  const applied = applyLineupLayoutOverride(withoutSupersededLayoutSource, override);
  const issues = compareLineupsToLayoutOverride(applied, override);
  if (issues.length) {
    throw new Error(`official FIFA geometry could not be applied: ${issues.join("; ")}`);
  }
  return applied;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function tournamentSourceForOverride(fixture, override) {
  const source = officialFifaTacticalSourceFromOverride(override);
  if (!source) return null;
  const sourceId = override.sourceIds?.[0];
  if (!sourceId) return null;
  return {
    id: sourceId,
    label: `FIFA official Tactical Line-up - match ${source.matchNumber}`,
    url: source.url,
    type: "official",
    checkedAt: override.checkedAt,
    note: source.layoutPerspective === "observed"
      ? `FIFA Tactical Line-up version ${source.documentVersion}, updated after observation of the game, supplied the observed rows and left/right geometry for all 22 starters.`
      : source.layoutPerspective === "revised"
        ? `FIFA Tactical Line-up version ${source.documentVersion} supplied FIFA's latest revised rows and left/right geometry for all 22 starters.`
      : `FIFA Tactical Line-up version ${source.documentVersion} supplied the nominal rows and left/right geometry for all 22 starters.`
  };
}

export function upsertFifaTacticalTournamentSource(tournamentData, fixture, override) {
  const nextSource = tournamentSourceForOverride(fixture, override);
  if (!nextSource) return false;
  const sources = Array.isArray(tournamentData.sources) ? tournamentData.sources : [];
  const index = sources.findIndex((source) => source?.id === nextSource.id);
  if (index >= 0 && sameJson(sources[index], nextSource)) return false;
  if (index >= 0) {
    sources[index] = nextSource;
  } else {
    sources.push(nextSource);
  }
  tournamentData.sources = sources;
  return true;
}
