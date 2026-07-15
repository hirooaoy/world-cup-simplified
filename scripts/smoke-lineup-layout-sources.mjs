#!/usr/bin/env node
import assert from "node:assert/strict";
import { buildFifaLineupsFromLiveMatch } from "./fifa-live-lineup-parser.mjs";
import {
  applyLineupLayoutOverride,
  canApplyLineupLayoutOverride,
  compareLineupsToLayoutOverride,
  getVerifiedLayoutOverride,
  getLayoutOverrideProvenanceIssues,
  isFifaOfficialLayoutOverride,
  shouldPreserveLayoutOverride
} from "./lineup-layout-overrides.mjs";
import { getLineupGeometryIssues } from "./lineup-geometry.mjs";
import { assignRolesFromPitchGeometry } from "./lineup-layout-roles.mjs";
import { buildExactLayoutConsensus } from "./lineup-layout-consensus.mjs";
import {
  DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE,
  FIFA_OFFICIAL_LAYOUT_SOURCE,
  getLineupLayoutStatus,
  normalizeLayoutSource,
  VERIFIED_LAYOUT_SOURCE
} from "./lineup-layout-sources.mjs";
import { isPlayerNameMatch } from "./player-name-matching.mjs";

const checkedAt = "2026-07-07T18:00:00.000Z";

function localized(value) {
  return [{ Locale: "en-GB", Description: value }];
}

function player(id, name, number, position, status = 1) {
  return {
    IdPlayer: String(id),
    PlayerName: localized(name),
    ShortName: localized(name),
    ShirtNumber: number,
    Position: position,
    Status: status
  };
}

function side(baseId, names) {
  return {
    Tactics: "4-3-3",
    Players: [
      player(baseId, names[0], 1, 0),
      player(baseId + 1, names[1], 2, 1),
      player(baseId + 2, names[2], 3, 1),
      player(baseId + 3, names[3], 4, 1),
      player(baseId + 4, names[4], 5, 1),
      player(baseId + 5, names[5], 6, 2),
      player(baseId + 6, names[6], 7, 2),
      player(baseId + 7, names[7], 8, 2),
      player(baseId + 8, names[8], 9, 3),
      player(baseId + 9, names[9], 10, 3),
      player(baseId + 10, names[10], 11, 3),
      player(baseId + 11, `${names[0]} Bench`, 12, 0, 2)
    ],
    Coaches: [],
    Bookings: [],
    Substitutions: []
  };
}

const fixture = {
  id: "match-layout-smoke",
  homeTeamId: "AAA",
  awayTeamId: "BBB",
  providerIds: { fifa: { matchId: "400000000", stageId: "108852" } }
};

const liveMatch = {
  IdCompetition: "17",
  IdSeason: "285023",
  IdStage: "108852",
  IdMatch: "400000000",
  HomeTeam: side(100, [
    "Home Keeper",
    "Home Right Back",
    "Home Centre Back One",
    "Home Centre Back Two",
    "Home Left Back",
    "Home Mid One",
    "Home Mid Two",
    "Home Mid Three",
    "Home Right Wing",
    "Home Striker",
    "Home Left Wing"
  ]),
  AwayTeam: side(200, [
    "Away Keeper",
    "Away Right Back",
    "Away Centre Back One",
    "Away Centre Back Two",
    "Away Left Back",
    "Away Mid One",
    "Away Mid Two",
    "Away Mid Three",
    "Away Right Wing",
    "Away Striker",
    "Away Left Wing"
  ])
};

const lineups = buildFifaLineupsFromLiveMatch({
  checkedAt,
  fixture,
  liveMatch,
  teamsById: new Map([
    ["AAA", { id: "AAA", name: "Home" }],
    ["BBB", { id: "BBB", name: "Away" }]
  ]),
  profileLookup: null,
  sourceIds: ["fifa-lineups-live-smoke"],
  sourceUrl: "https://www.fifa.com/en/match-centre/match/17/285023/108852/400000000",
  mode: "live"
});

assert.equal(lineups.layoutSource, DERIVED_TEAM_SHEET_ORDER_LAYOUT_SOURCE);
assert.equal(lineups.layoutVerification.status, "unverified");
assert.equal(lineups.layoutVerification.exact, false);
assert.equal(getLineupLayoutStatus(lineups).provisional, true);
assert.equal(getLineupLayoutStatus(lineups).exact, false);
assert.equal(normalizeLayoutSource("editorial-verified"), VERIFIED_LAYOUT_SOURCE);

const override = {
  status: "verified",
  layoutSource: "editorial-verified",
  checkedAt,
  sourceIds: ["lineup-layout-verification-smoke"],
  sources: [
    {
      name: "Smoke verified board",
      url: "https://example.com/verified-lineup",
      status: "matched",
      sourceDetail: "synthetic public board geometry",
      exactLayout: true
    }
  ],
  note: "Smoke override confirms exact pitch layout.",
  home: {
    formation: lineups.home.formation,
    players: lineups.home.players.map((player) => ({ ...player }))
  },
  away: {
    formation: lineups.away.formation,
    players: lineups.away.players.map((player) => ({ ...player }))
  }
};

assert.deepEqual(getLayoutOverrideProvenanceIssues(override), []);

const fifaOfficialOverride = structuredClone(override);
fifaOfficialOverride.layoutSource = FIFA_OFFICIAL_LAYOUT_SOURCE;
fifaOfficialOverride.verificationMethod = "fifa-tactical-lineup-pdf-v1";
fifaOfficialOverride.sourceIds = ["fifa-tactical-lineup-pdf-smoke"];
fifaOfficialOverride.sources = [
  {
    name: "FIFA Tactical Line-up PDF",
    adapter: "fifa-tactical-pdf",
    url: "https://fdp.fifa.org/assetspublic/ce281/r12549/pdf/TacticalLineup-English.pdf",
    status: "matched",
    sourceDetail: "positioned text from the official FIFA tactical document",
    exactLayout: true,
    matchNumber: 102,
    registrationId: 12549,
    documentVersion: 1,
    publishedAt: "2026-07-15T17:41:37.000Z",
    sha256: "cda8da4f98a5a9493b526b49558ab3d39e494b5647d5a703f00b19fa232a8f83"
  }
];
fifaOfficialOverride.note = "FIFA's official tactical document supplied exact pitch geometry.";
assert.deepEqual(
  getLayoutOverrideProvenanceIssues(fifaOfficialOverride),
  [],
  "A single official FIFA tactical document should be valid exact-layout evidence."
);
assert.equal(isFifaOfficialLayoutOverride(fifaOfficialOverride), true);
assert.equal(
  shouldPreserveLayoutOverride(fifaOfficialOverride, { reverify: true }),
  true,
  "Routine third-party reverification must preserve an official FIFA tactical override."
);
assert.equal(
  shouldPreserveLayoutOverride(override, { reverify: true }),
  false,
  "Explicit reverification may still refresh a non-official verified override."
);
assert.equal(
  getVerifiedLayoutOverride({ fixtures: { [fixture.id]: fifaOfficialOverride } }, fixture.id),
  fifaOfficialOverride,
  "Official FIFA tactical geometry should be returned as a verified override."
);
const fifaOfficialLineups = applyLineupLayoutOverride(lineups, fifaOfficialOverride);
assert.equal(fifaOfficialLineups.layoutSource, FIFA_OFFICIAL_LAYOUT_SOURCE);
assert.deepEqual(compareLineupsToLayoutOverride(fifaOfficialLineups, fifaOfficialOverride), []);
assert.equal(canApplyLineupLayoutOverride(lineups, fifaOfficialOverride), true);

const changedOfficialXi = structuredClone(lineups);
changedOfficialXi.home.players[0] = {
  ...changedOfficialXi.home.players[0],
  number: "99",
  name: "Last Minute Replacement"
};
assert.equal(
  canApplyLineupLayoutOverride(changedOfficialXi, fifaOfficialOverride),
  false,
  "An official tactical document must stop blocking fallback discovery if the official XI later changes."
);

const refreshedFifaLineups = buildFifaLineupsFromLiveMatch({
  checkedAt: "2026-07-15T19:10:00.000Z",
  fixture,
  liveMatch,
  teamsById: new Map([
    ["AAA", { id: "AAA", name: "Home" }],
    ["BBB", { id: "BBB", name: "Away" }]
  ]),
  profileLookup: null,
  sourceIds: ["fifa-lineups-later-refresh-smoke"],
  sourceUrl: "https://www.fifa.com/en/match-centre/match/17/285023/108852/400000000",
  mode: "live"
});
const refreshedWithOfficialGeometry = applyLineupLayoutOverride(refreshedFifaLineups, fifaOfficialOverride);
assert.deepEqual(
  compareLineupsToLayoutOverride(refreshedWithOfficialGeometry, fifaOfficialOverride),
  [],
  "A later FIFA XI refresh must reapply and preserve the official tactical geometry."
);

const forgedOfficialOverride = structuredClone(fifaOfficialOverride);
forgedOfficialOverride.sources[0].url = "https://example.fifa.com/tactical-lineup.pdf";
assert(
  getLayoutOverrideProvenanceIssues(forgedOfficialOverride).some((issue) =>
    issue.includes("official FIFA Tactical Line-up PDF URL")
  ),
  "An untrusted URL must not be accepted as FIFA official geometry."
);

const weakOverride = structuredClone(override);
weakOverride.sources = [
  {
    name: "Smoke source without exact geometry",
    url: "https://example.com/lineup",
    status: "matched",
    exactLayout: false,
    sourceDetail: "team-sheet order only"
  }
];
assert(
  getLayoutOverrideProvenanceIssues(weakOverride).some((issue) =>
    issue.includes("exactLayout true")
  ),
  "Verified layout overrides must require at least one matched exact-layout source."
);

const overstatedAgreementOverride = structuredClone(override);
overstatedAgreementOverride.note = "ESPN and FotMob agreed on the tactical layout.";
assert(
  getLayoutOverrideProvenanceIssues(overstatedAgreementOverride).some((issue) =>
    issue.includes("FotMob") || issue.includes("agreement")
  ),
  "Verified layout notes must not claim agreement from a source that is not stored."
);

const conflictingOverride = structuredClone(override);
conflictingOverride.sources.push({
  ...structuredClone(conflictingOverride.sources[0]),
  name: "Second board",
  url: "https://example.com/conflicting-lineup",
  signature: { home: "different-home", away: "different-away" }
});
conflictingOverride.sources[0].signature = { home: "home", away: "away" };
assert(
  getLayoutOverrideProvenanceIssues(conflictingOverride).some((issue) =>
    issue.includes("conflicting tactical signatures")
  ),
  "Conflicting tactical signatures must remain unresolved rather than selecting a preferred source."
);

const verifiedLineups = applyLineupLayoutOverride(lineups, override);
assert.equal(verifiedLineups.layoutSource, VERIFIED_LAYOUT_SOURCE);
assert.equal(verifiedLineups.layoutVerification.status, "verified");
assert.equal(getLineupLayoutStatus(verifiedLineups).provisional, false);
assert.equal(getLineupLayoutStatus(verifiedLineups).exact, true);
assert.deepEqual(compareLineupsToLayoutOverride(verifiedLineups, override), []);

assert.deepEqual(
  getLineupGeometryIssues(lineups.home.players, { owner: "current World Cup lineup" }),
  [],
  "The shared geometry contract should accept a normally distributed formation."
);

const collapsedArchiveOverride = structuredClone(override);
collapsedArchiveOverride.home.players = collapsedArchiveOverride.home.players.map((player, index) => ({
  ...player,
  x: index === 1 ? 99.6 : 0.1 + (index % 5) * 0.2,
  y: 0.1 + (index % 5) * 0.2
}));
const collapsedArchiveIssues = getLayoutOverrideProvenanceIssues(collapsedArchiveOverride);
assert(
  collapsedArchiveIssues.some((issue) => issue.includes("spread") || issue.includes("visible pitch")),
  "Collapsed archived World Cup geometry must be rejected even when its coordinates remain between 0 and 100."
);
assert.equal(
  getVerifiedLayoutOverride({ fixtures: { "world-cup-archive-1998": collapsedArchiveOverride } }, "world-cup-archive-1998"),
  null,
  "Malformed archived overrides must not be treated as verified."
);
assert.equal(
  applyLineupLayoutOverride(lineups, collapsedArchiveOverride),
  lineups,
  "Malformed overrides must fail safely instead of replacing a usable provisional formation."
);

const futureImportPlayers = lineups.away.players.map((player) => ({ ...player }));
futureImportPlayers[0] = { ...futureImportPlayers[0], x: 100, y: 0 };
assert(
  getLineupGeometryIssues(futureImportPlayers, { owner: "future World Cup import" })
    .some((issue) => issue.includes("visible pitch")),
  "Future World Cup imports must keep markers inside the visible pitch inset."
);

assert(
  isPlayerNameMatch("Nawaf Boushal", "Nawaf Al-Boushail"),
  "Team-scoped lineup verification should tolerate the known Arabic transliteration variant."
);

const measuredFourTwoThreeOne = [
  { name: "Goalkeeper", x: 50, y: 90 },
  { name: "Right back", x: 87.5, y: 70.8 },
  { name: "Right centre back", x: 62.5, y: 70.8 },
  { name: "Left centre back", x: 37.5, y: 70.8 },
  { name: "Left back", x: 12.5, y: 70.8 },
  { name: "Right central midfielder", x: 70, y: 51.5 },
  { name: "Left central midfielder", x: 30, y: 51.5 },
  { name: "Right wing", x: 83.8, y: 32.2 },
  { name: "Attacking midfielder", x: 50, y: 32.2 },
  { name: "Left wing", x: 16.3, y: 32.2 },
  { name: "Striker", x: 50, y: 13 }
];
const geometryAssignedRoles = Object.fromEntries(
  assignRolesFromPitchGeometry("4-1-2-3", measuredFourTwoThreeOne).map((player) => [
    player.name,
    player.position
  ])
);
assert.deepEqual(
  geometryAssignedRoles,
  {
    Goalkeeper: "GK",
    "Right back": "RB",
    "Right centre back": "CB",
    "Left centre back": "CB",
    "Left back": "LB",
    "Right central midfielder": "CM",
    "Left central midfielder": "CM",
    "Right wing": "RW",
    "Attacking midfielder": "AM",
    "Left wing": "LW",
    Striker: "ST"
  },
  "Role labels should follow the verified pitch bands when they differ from a compact formation label."
);

function exactConsensusClaim(name, adapter, coordinateDelta = 0) {
  const side = (team, signature) => ({
    formation: team.formation,
    players: team.players.map((entry, index) => ({
      ...entry,
      x: Number(entry.x) + (index === 1 ? coordinateDelta : 0)
    })),
    signature
  });
  const home = side(lineups.home, "4-3-3::home-row-signature");
  const away = side(lineups.away, "4-3-3::away-row-signature");
  return {
    name,
    adapter,
    url: `https://example.com/${adapter}`,
    status: "matched",
    exactLayout: true,
    sourceDetail: "synthetic normalized tactical board",
    signature: { home: home.signature, away: away.signature },
    home: { formation: home.formation, players: home.players },
    away: { formation: away.formation, players: away.players }
  };
}

const espnConsensusClaim = exactConsensusClaim("ESPN", "espn");
assert.equal(
  buildExactLayoutConsensus([espnConsensusClaim]).status,
  "insufficient",
  "One exact provider must not create an automatic matchday override."
);
assert.equal(
  buildExactLayoutConsensus([
    espnConsensusClaim,
    { ...structuredClone(espnConsensusClaim), url: "https://example.com/espn-duplicate" }
  ]).status,
  "insufficient",
  "Two URLs from the same provider must still count as one source."
);

const fotmobConsensusClaim = exactConsensusClaim("FotMob", "fotmob", 4);
const agreedConsensus = buildExactLayoutConsensus([espnConsensusClaim, fotmobConsensusClaim]);
assert.equal(agreedConsensus.status, "agreed");
assert.equal(
  agreedConsensus.home.players[1].x,
  Number(lineups.home.players[1].x) + 2,
  "Agreed normalized coordinates should use the per-player median."
);

const rowConflictClaim = structuredClone(fotmobConsensusClaim);
rowConflictClaim.signature.away = "4-4-2::different-away-order";
assert.equal(
  buildExactLayoutConsensus([espnConsensusClaim, rowConflictClaim]).status,
  "conflict",
  "A formation, row, or left-to-right disagreement on either team must stay unresolved."
);

const geometryConflictClaim = exactConsensusClaim("FotMob", "fotmob", 9);
assert.equal(
  buildExactLayoutConsensus([espnConsensusClaim, geometryConflictClaim]).status,
  "conflict",
  "Coordinate drift beyond the normalized tolerance must stay unresolved."
);

const consensusOverride = structuredClone(override);
consensusOverride.verificationMethod = "source-consensus-v1";
consensusOverride.consensus = {
  providers: ["ESPN", "FotMob"],
  minimumExactSources: 2,
  coordinateTolerance: { x: 8, y: 10 },
  aggregation: "median-normalized-coordinates"
};
consensusOverride.note = "ESPN and FotMob agreed on the tactical layout.";
consensusOverride.sources = [espnConsensusClaim, fotmobConsensusClaim].map((claim) => ({
  name: claim.name,
  adapter: claim.adapter,
  url: claim.url,
  status: claim.status,
  sourceDetail: claim.sourceDetail,
  exactLayout: claim.exactLayout,
  signature: claim.signature
}));
assert.deepEqual(
  getLayoutOverrideProvenanceIssues(consensusOverride),
  [],
  "A source-consensus-v1 override should require and accept two distinct exact providers."
);
const singleProviderConsensusOverride = structuredClone(consensusOverride);
singleProviderConsensusOverride.sources = [singleProviderConsensusOverride.sources[0]];
assert(
  getLayoutOverrideProvenanceIssues(singleProviderConsensusOverride).some((issue) =>
    issue.includes("two distinct matched exact-layout providers")
  ),
  "Automatic consensus metadata must not validate with only one provider."
);
assert.deepEqual(
  getLayoutOverrideProvenanceIssues(override),
  [],
  "Legacy/manual single-source verified overrides must remain valid."
);

console.log("Lineup layout source smoke passed: derived layouts stay unverified until an exact override is applied.");
