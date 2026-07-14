import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePredictionDocument } from "./validation.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function compactPlayer(player = {}) {
  return {
    name: player.name,
    number: player.number,
    position: player.position,
    ...(player.x !== undefined ? { x: player.x } : {}),
    ...(player.y !== undefined ? { y: player.y } : {}),
    confidence: player.confidence,
    sourceIds: player.sourceIds || []
  };
}

function compactSideEvidence(evidence = {}) {
  return {
    confidence: evidence.confidence,
    semantics: evidence.semantics,
    independentSourceCount: evidence.independentSourceCount,
    ...(evidence.formationResolution ? { formationResolution: evidence.formationResolution } : {}),
    formationScores: (evidence.formationScores || []).map((formation) => ({
      formation: formation.formation,
      score: formation.score,
      independentVotes: formation.independentVotes,
      sourceIds: formation.sourceIds || []
    })),
    disputedSlots: evidence.disputedSlots || [],
    ...(evidence.notes?.length ? { notes: evidence.notes } : {})
  };
}

export function compactPredictionDocumentForBrowser(document) {
  return {
    ...document,
    fixtures: (document.fixtures || []).map((record) => ({
      ...record,
      evidence: {
        home: compactSideEvidence(record.evidence?.home),
        away: compactSideEvidence(record.evidence?.away)
      },
      lineup: {
        ...record.lineup,
        home: {
          ...record.lineup.home,
          players: (record.lineup.home?.players || []).map(compactPlayer),
          bench: (record.lineup.home?.bench || []).map(compactPlayer),
          evidence: undefined
        },
        away: {
          ...record.lineup.away,
          players: (record.lineup.away?.players || []).map(compactPlayer),
          bench: (record.lineup.away?.bench || []).map(compactPlayer),
          evidence: undefined
        }
      }
    }))
  };
}

function sortDocument(document, fixturesById = new Map()) {
  return {
    ...document,
    sources: [...(document.sources || [])].sort((left, right) => left.id.localeCompare(right.id)),
    fixtures: [...(document.fixtures || [])].sort((left, right) => {
      const leftFixture = fixturesById.get(left.fixtureId);
      const rightFixture = fixturesById.get(right.fixtureId);
      return (
        new Date(leftFixture?.kickoffUtc || 0).getTime() - new Date(rightFixture?.kickoffUtc || 0).getTime() ||
        Number(leftFixture?.matchNumber || 0) - Number(rightFixture?.matchNumber || 0) ||
        left.fixtureId.localeCompare(right.fixtureId)
      );
    })
  };
}

export async function writeExpectedLineupsDocument(document, {
  externalSourceIds = [],
  fixtures = [],
  outputPath = path.join(root, "data/expected-lineups.json"),
  playerProfilesData = document?._validationContext?.playerProfilesData || {},
  validate = true
} = {}) {
  const validationFixtures = fixtures.length ? fixtures : document?._validationContext?.fixtures || [];
  const fixturesById = new Map(validationFixtures.map((fixture) => [fixture.id, fixture]));
  const sortedDocument = sortDocument(compactPredictionDocumentForBrowser(document), fixturesById);
  if (validate) {
    validatePredictionDocument(sortedDocument, {
      externalSourceIds,
      fixtures: validationFixtures,
      playerProfilesData
    });
  }
  await writeFile(outputPath, `${JSON.stringify(sortedDocument, null, 2)}\n`);
  return sortedDocument;
}

export async function writePredictionAuditDocument(auditDocument, {
  outputPath = path.join(root, "data/expected-lineups-audit.json")
} = {}) {
  await writeFile(outputPath, `${JSON.stringify(auditDocument, null, 2)}\n`);
  return auditDocument;
}
