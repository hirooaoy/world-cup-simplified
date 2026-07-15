#!/usr/bin/env node
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const beforeMinutes = Number(process.env.LINEUP_MATCHDAY_BEFORE_MINUTES || 90);
const afterMinutes = Number(process.env.LINEUP_MATCHDAY_AFTER_MINUTES || 20);
const now = new Date(process.env.LINEUP_MATCHDAY_NOW || Date.now());

if (
  !Number.isFinite(beforeMinutes) || beforeMinutes <= 0 ||
  !Number.isFinite(afterMinutes) || afterMinutes <= 0 ||
  Number.isNaN(now.getTime())
) {
  throw new Error("Lineup matchday window settings must contain positive minute values and a valid current time.");
}

const fixturesData = JSON.parse(await readFile(path.join(root, "data", "fixtures.json"), "utf8"));
const eligibleFixtures = (fixturesData.fixtures || []).filter((fixture) => {
  if (
    !["SCHEDULED", "DELAYED", "LIVE"].includes(fixture?.status) ||
    !fixture?.homeTeamId ||
    !fixture?.awayTeamId
  ) {
    return false;
  }

  const kickoff = new Date(fixture.kickoffUtc || "").getTime();
  if (!Number.isFinite(kickoff)) {
    return false;
  }

  const minutesSinceKickoff = (now.getTime() - kickoff) / 60000;
  return minutesSinceKickoff >= -beforeMinutes && minutesSinceKickoff <= afterMinutes;
});

const eligible = eligibleFixtures.length > 0;
const fixtureIds = eligibleFixtures.map((fixture) => fixture.id).join(",");
console.log(
  eligible
    ? `Lineup matchday window is open for ${fixtureIds}.`
    : `No fixture is between ${beforeMinutes} minutes before and ${afterMinutes} minutes after kickoff.`
);

if (process.argv.includes("--github-output")) {
  if (!process.env.GITHUB_OUTPUT) {
    throw new Error("GITHUB_OUTPUT is required with --github-output.");
  }
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `eligible=${eligible ? "true" : "false"}\nfixtures=${fixtureIds}\n`
  );
}
