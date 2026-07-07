import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePredictionDocument } from "./validation.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

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
  validate = true
} = {}) {
  const fixturesById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  const sortedDocument = sortDocument(document, fixturesById);
  if (validate) {
    validatePredictionDocument(sortedDocument, { externalSourceIds });
  }
  await writeFile(outputPath, `${JSON.stringify(sortedDocument, null, 2)}\n`);
  return sortedDocument;
}
