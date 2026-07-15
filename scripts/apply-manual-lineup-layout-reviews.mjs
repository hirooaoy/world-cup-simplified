#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildExactLayoutConsensus } from "./lineup-layout-consensus.mjs";
import {
  applyLineupLayoutOverride,
  compareLineupsToLayoutOverride,
  getLayoutOverrideProvenanceIssues,
  VERIFIED_LAYOUT_SOURCE
} from "./lineup-layout-overrides.mjs";
import { assignRolesFromPitchGeometry } from "./lineup-layout-roles.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const shouldWrite = !process.argv.includes("--check");

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

async function writeJson(fileName, value) {
  await writeFile(path.join(dataDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

const [reviewsData, fixturesData, lineupsData, overridesData, tournamentData] = await Promise.all([
  readJson("lineup-layout-manual-reviews.json"),
  readJson("fixtures.json"),
  readJson("lineups.json"),
  readJson("lineup-layout-overrides.json"),
  readJson("tournament.json")
]);

const checkedAt = reviewsData.checkedAt;
const sourceId = `lineup-layout-manual-review-${checkedAt.slice(0, 10)}`;
const fixturesById = new Map((fixturesData.fixtures || []).map((fixture) => [fixture.id, fixture]));
const applied = [];

for (const [fixtureId, review] of Object.entries(reviewsData.matches || {})) {
  const fixture = fixturesById.get(fixtureId);
  const lineups = lineupsData.lineups?.[fixtureId];
  const existing = overridesData.fixtures?.[fixtureId];
  if (!fixture || !lineups || !existing) {
    throw new Error(`${fixtureId} is missing its fixture, official lineup, or provider audit record.`);
  }
  if (Number(fixture.matchNumber) !== Number(review.matchNumber)) {
    throw new Error(`${fixtureId} manual review match number did not match fixtures.json.`);
  }

  const sofaScoreSource = (existing.sources || []).find(
    (source) => source?.name === review.selectedProvider && source?.exactLayout === true
  );
  if (!sofaScoreSource?.home || !sofaScoreSource?.away) {
    throw new Error(`${fixtureId} did not retain a complete ${review.selectedProvider} source board.`);
  }
  if (
    sofaScoreSource.home.formation !== review.homeFormation ||
    sofaScoreSource.away.formation !== review.awayFormation
  ) {
    throw new Error(`${fixtureId} manual formation evidence did not match the selected source board.`);
  }

  const selectedSource = {
    ...sofaScoreSource,
    status: "matched"
  };
  const consensus = buildExactLayoutConsensus([selectedSource], { minimumExactSources: 1 });
  if (consensus.status !== "agreed") {
    throw new Error(`${fixtureId} selected source could not be normalized to the canonical formation grid.`);
  }

  const googleSource = {
    name: "Google",
    adapter: "google-search",
    url: review.evidenceUrl,
    status: "matched",
    sourceDetail: `Google-indexed ${review.indexedSourceName} match-board text confirmed ${review.homeFormation} and ${review.awayFormation}.`,
    exactLayout: false,
    note: `Indexed match board: ${review.indexedSourceUrl}`
  };
  const sources = (existing.sources || [])
    .filter((source) => source?.name !== review.selectedProvider && source?.name !== "Google")
    .concat(selectedSource, googleSource);
  const conflictNames = sources
    .filter((source) => source?.status === "conflict")
    .map((source) => source.name)
    .filter(Boolean);

  const override = {
    status: "verified",
    layoutSource: VERIFIED_LAYOUT_SOURCE,
    verificationMethod: "manual-review-v1",
    manualReview: {
      selectedProvider: review.selectedProvider,
      formationEvidenceProvider: "Google",
      checkedAt
    },
    checkedAt,
    sourceIds: [sourceId],
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    sources,
    note: `FIFA official team sheet kept for facts; ${review.selectedProvider} supplied the complete tactical rows and left-to-right order, while Google-indexed ${review.indexedSourceName} match-board text confirmed both formations.${conflictNames.length ? ` ${conflictNames.join(" and ")} differed and were retained for audit.` : ""}`,
    home: {
      ...consensus.home,
      players: assignRolesFromPitchGeometry(consensus.home.formation, consensus.home.players)
    },
    away: {
      ...consensus.away,
      players: assignRolesFromPitchGeometry(consensus.away.formation, consensus.away.players)
    }
  };

  const provenanceIssues = getLayoutOverrideProvenanceIssues(override);
  if (provenanceIssues.length) {
    throw new Error(`${fixtureId} manual override failed provenance validation: ${provenanceIssues.join("; ")}`);
  }
  const nextLineups = applyLineupLayoutOverride(lineups, override);
  const comparisonIssues = compareLineupsToLayoutOverride(nextLineups, override);
  if (comparisonIssues.length) {
    throw new Error(`${fixtureId} manual override failed to apply: ${comparisonIssues.join("; ")}`);
  }

  overridesData.fixtures[fixtureId] = override;
  lineupsData.lineups[fixtureId] = nextLineups;
  applied.push({ fixtureId, matchNumber: fixture.matchNumber });
}

overridesData.sourceIds = [...new Set([...(overridesData.sourceIds || []), sourceId])];
overridesData.updatedAt = checkedAt;
lineupsData.sourceIds = [...new Set([...(lineupsData.sourceIds || []), sourceId])];
lineupsData.updatedAt = checkedAt;
tournamentData.sources = (tournamentData.sources || []).filter((source) => source.id !== sourceId);
tournamentData.sources.push({
  id: sourceId,
  label: "Manual lineup layout review",
  url: Object.values(reviewsData.matches || {})[0]?.evidenceUrl,
  type: "editorial",
  checkedAt,
  note: `${applied.length} provider ties were reviewed one by one; complete SofaScore rows were used only where Google-indexed ESPN board text confirmed both formations.`
});
tournamentData.updatedAt = checkedAt;

if (shouldWrite) {
  await Promise.all([
    writeJson("lineup-layout-overrides.json", overridesData),
    writeJson("lineups.json", lineupsData),
    writeJson("tournament.json", tournamentData)
  ]);
}

console.log(`${shouldWrite ? "Applied" : "Validated"} ${applied.length} manual lineup layout reviews:`);
for (const item of applied.sort((left, right) => left.matchNumber - right.matchNumber)) {
  console.log(`  Match ${item.matchNumber}: ${item.fixtureId}`);
}
