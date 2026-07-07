#!/usr/bin/env node
import { collectLineupPredictionData } from "./lineup-prediction-engine/data-collection.mjs";
import { runLineupPredictionEngine } from "./lineup-prediction-engine/engine.mjs";
import { createPredictionSource } from "./lineup-prediction-engine/model.mjs";
import { writeExpectedLineupsDocument } from "./lineup-prediction-engine/output.mjs";
import { createLocalOfficialHistoryProvider } from "./lineup-prediction-engine/providers/local-official-history.mjs";

const generatedAt = new Date();
const sourceDate = generatedAt.toISOString().slice(0, 10);
const officialHistorySourceId = `lineup-prediction-official-history-${sourceDate}`;
const officialHistorySource = createPredictionSource({
  id: officialHistorySourceId,
  label: "Lineup prediction official-history provider",
  type: "lineup-prediction-provider",
  checkedAt: generatedAt,
  note: "Uses local FIFA official lineup history, recent formations, minutes/load, cards, and player availability."
});

const context = await collectLineupPredictionData();
const provider = createLocalOfficialHistoryProvider({
  checkedAt: generatedAt,
  sourceId: officialHistorySourceId
});
const { document } = await runLineupPredictionEngine({
  context,
  generatedAt,
  generator: {
    runId: `lineup-prediction-${sourceDate}`
  },
  inputs: [
    { file: "data/fixtures.json", role: "target fixtures and kickoff dates" },
    { file: "data/lineups.json", role: "last verified XI, formation, bench, cards, substitutions" },
    { file: "data/player-availability.json", role: "injury, omission, and fixture availability exclusions" }
  ],
  providers: [provider],
  sources: [officialHistorySource],
  targetFixtures: context.targetFixtures
});
const externalSourceIds = (context.tournamentData.sources || []).map((source) => source.id);
const output = await writeExpectedLineupsDocument(document, {
  externalSourceIds,
  fixtures: context.fixturesData.fixtures
});

console.log(
  `Expected lineups generated: ${output.fixtures.length}/${context.targetFixtures.length} target fixtures ` +
    `(${output.run?.candidateCount || 0} provider candidates).`
);
