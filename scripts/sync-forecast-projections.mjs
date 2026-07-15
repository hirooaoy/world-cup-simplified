#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildConditionalRegulationProjection,
  buildSourceConsensusProjection,
  sameProjectionValues
} from "./forecast-math.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturesPath = path.join(root, "data", "fixtures.json");
const checkOnly = process.argv.includes("--check");
const fixturesData = JSON.parse(await readFile(fixturesPath, "utf8"));
let derivedForecasts = 0;
let changedForecasts = 0;

function synchronizeProjection(projection, expected, owner) {
  if (!expected) {
    throw new Error(`${owner} does not have enough valid source inputs to derive a displayed 1X2 forecast.`);
  }

  derivedForecasts += 1;
  if (sameProjectionValues(projection, expected)) {
    return projection;
  }

  changedForecasts += 1;
  return { ...projection, ...expected };
}

fixturesData.fixtures = (fixturesData.fixtures || []).map((fixture) => {
  let nextFixture = fixture;

  if (fixture.projection?.method === "online-source-consensus" && Array.isArray(fixture.projection.inputs)) {
    nextFixture = {
      ...nextFixture,
      projection: synchronizeProjection(
        fixture.projection,
        buildSourceConsensusProjection(fixture.projection.inputs),
        `Fixture "${fixture.id}" projection`
      )
    };
  }

  if (Array.isArray(fixture.conditionalProjections)) {
    nextFixture = {
      ...nextFixture,
      conditionalProjections: fixture.conditionalProjections.map((projection, index) =>
        synchronizeProjection(
          projection,
          buildConditionalRegulationProjection(projection.inputs, projection.drawInputs),
          `Fixture "${fixture.id}" conditionalProjections[${index}]`
        )
      )
    };
  }

  return nextFixture;
});

if (checkOnly && changedForecasts) {
  throw new Error(
    `${changedForecasts} displayed forecast${changedForecasts === 1 ? " is" : "s are"} out of sync with stored source inputs. Run pnpm forecasts:sync.`
  );
}

if (!checkOnly && changedForecasts) {
  await writeFile(fixturesPath, `${JSON.stringify(fixturesData, null, 2)}\n`);
}

console.log(
  `${checkOnly ? "Checked" : "Synchronized"} ${derivedForecasts} source-derived forecast${derivedForecasts === 1 ? "" : "s"}; ${changedForecasts} percentage set${changedForecasts === 1 ? "" : "s"} changed.`
);
