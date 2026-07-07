#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getVerifiedLayoutOverride } from "./lineup-layout-overrides.mjs";
import { VERIFIED_LAYOUT_SOURCE } from "./lineup-layout-sources.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const DEFAULT_BEFORE_MINUTES = 5;
const DEFAULT_AFTER_MINUTES = 20;
const KICKOFF_STATUSES = new Set(["LIVE", "SCHEDULED", "DELAYED"]);

const requestedFixtureFilter = new Set(
  args
    .filter((arg) => arg.startsWith("--fixture="))
    .flatMap((arg) => arg.slice("--fixture=".length).split(","))
    .map((value) => value.trim())
    .filter(Boolean)
);

function hasFlag(flag) {
  return args.includes(flag);
}

function getArgValue(prefix, fallback = "") {
  const arg = args.find((candidate) => candidate.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim() : fallback;
}

function getPositiveNumberArg({ argPrefix, envName, fallback }) {
  const raw = getArgValue(argPrefix) || process.env[envName] || "";
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    console.error(`${argPrefix.replace(/=$/, "")} must be a non-negative number. Received: ${raw}`);
    process.exit(1);
  }

  return parsed;
}

function getAuditNow() {
  const value = process.env.LINEUP_GOOGLE_KICKOFF_NOW || process.env.LINEUP_LAYOUT_NOW || "";
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    console.error(`LINEUP_GOOGLE_KICKOFF_NOW must be a valid date-time. Received: ${value}`);
    process.exit(1);
  }

  return parsed;
}

const beforeMinutes = getPositiveNumberArg({
  argPrefix: "--before-minutes=",
  envName: "LINEUP_GOOGLE_KICKOFF_BEFORE_MINUTES",
  fallback: DEFAULT_BEFORE_MINUTES
});
const afterMinutes = getPositiveNumberArg({
  argPrefix: "--after-minutes=",
  envName: "LINEUP_GOOGLE_KICKOFF_AFTER_MINUTES",
  fallback: DEFAULT_AFTER_MINUTES
});
const auditNow = getAuditNow();
const outputJson = hasFlag("--json");

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

async function readOptionalJson(fileName, fallback) {
  try {
    return await readJson(fileName);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

function teamName(teamsById, teamId) {
  const team = teamsById.get(teamId);
  return team?.name || team?.officialName || teamId || "TBD";
}

function getFixtureTimestamp(fixture) {
  const kickoff = fixture?.kickoffUtc || fixture?.date;
  const parsed = new Date(kickoff);
  return Number.isNaN(parsed.getTime()) ? Number.NaN : parsed.getTime();
}

function minutesSinceKickoff(fixture) {
  const fixtureTime = getFixtureTimestamp(fixture);
  return Number.isFinite(fixtureTime) ? (auditNow.getTime() - fixtureTime) / 60000 : Number.NaN;
}

function isRequestedFixture(fixture) {
  if (!requestedFixtureFilter.size) {
    return true;
  }

  return requestedFixtureFilter.has(fixture.id) || requestedFixtureFilter.has(String(fixture.matchNumber));
}

function isInKickoffWindow(fixture) {
  const minutes = minutesSinceKickoff(fixture);
  if (!Number.isFinite(minutes)) {
    return false;
  }

  return minutes >= -beforeMinutes && minutes <= afterMinutes;
}

function isOfficialLineupReady(lineups) {
  if (!lineups) {
    return false;
  }

  const modeReady = ["confirmed", "final", "live"].includes(String(lineups.mode || "").trim().toLowerCase());
  const sourceReady = modeReady && lineups.teamSheetSource === "fifa-official" && lineups.eventSource === "fifa-official";
  const homePlayers = Array.isArray(lineups?.home?.players) ? lineups.home.players : [];
  const awayPlayers = Array.isArray(lineups?.away?.players) ? lineups.away.players : [];
  return sourceReady && homePlayers.length === 11 && awayPlayers.length === 11;
}

function hasVerifiedLayout(lineups, overridesData, fixtureId) {
  if (getVerifiedLayoutOverride(overridesData, fixtureId)) {
    return true;
  }

  return (
    lineups?.layoutSource === VERIFIED_LAYOUT_SOURCE &&
    String(lineups?.layoutVerification?.status || "").trim().toLowerCase() === "verified"
  );
}

function buildGoogleLineupUrl(homeName, awayName) {
  const query = `${homeName} ${awayName} World Cup 2026 lineups`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function buildItem({ fixture, lineups, overridesData, teamsById }) {
  const homeName = teamName(teamsById, fixture.homeTeamId);
  const awayName = teamName(teamsById, fixture.awayTeamId);
  const minutes = minutesSinceKickoff(fixture);
  const status = String(fixture.status || "").trim().toUpperCase();
  const inWindow = isInKickoffWindow(fixture);
  const statusEligible = KICKOFF_STATUSES.has(status);
  const officialLineupsReady = isOfficialLineupReady(lineups);
  const verifiedLayout = hasVerifiedLayout(lineups, overridesData, fixture.id);
  let checkStatus = "needs_google_visual_check";
  let action = "Open the Google lineup board once; if exact geometry is confirmed or wrong, add an audited manual verified-layout override.";

  if (verifiedLayout) {
    checkStatus = "already_verified";
    action = "Skip; this fixture already has verified exact layout metadata.";
  } else if (!inWindow) {
    checkStatus = "outside_kickoff_window";
    action = "Skip for the kickoff pass; use a manual override later only if a visible layout issue is noticed.";
  } else if (!statusEligible) {
    checkStatus = "status_not_ready";
    action = "Skip until the fixture is live or in the scheduled kickoff window.";
  } else if (!officialLineupsReady) {
    checkStatus = "missing_fifa_official_lineups";
    action = "Run pnpm sync:fifa:lineups:live first; do not verify Google geometry until FIFA official starters are stored.";
  }

  return {
    fixtureId: fixture.id,
    matchNumber: fixture.matchNumber || null,
    status,
    homeTeamId: fixture.homeTeamId || "",
    awayTeamId: fixture.awayTeamId || "",
    homeName,
    awayName,
    kickoffUtc: fixture.kickoffUtc || fixture.date || "",
    minutesSinceKickoff: Number.isFinite(minutes) ? Math.round(minutes * 10) / 10 : null,
    inKickoffWindow: inWindow,
    officialLineupsReady,
    verifiedLayout,
    googleLineupUrl: buildGoogleLineupUrl(homeName, awayName),
    checkStatus,
    action
  };
}

function summarize(items) {
  return items.reduce(
    (acc, item) => {
      acc[item.checkStatus] = (acc[item.checkStatus] || 0) + 1;
      return acc;
    },
    {}
  );
}

function formatMinutes(value) {
  if (value === null) {
    return "unknown";
  }

  return value >= 0 ? `+${value}` : String(value);
}

function printHumanReport(report) {
  console.log("Kickoff Google lineup visual check");
  console.log(`Now: ${report.now}`);
  console.log(`Window: -${report.window.beforeMinutes} to +${report.window.afterMinutes} minutes from kickoff`);
  console.log(`Fixtures considered: ${report.items.length}`);
  console.log(
    `Summary: ${
      Object.entries(report.summary)
        .map(([key, count]) => `${key}=${count}`)
        .join(", ") || "none"
    }`
  );

  if (!report.items.length) {
    console.log("No fixtures matched the kickoff check filter.");
    return;
  }

  for (const item of report.items) {
    console.log("");
    console.log(
      `- ${item.fixtureId}: ${item.homeName} vs ${item.awayName} [${item.checkStatus}]`
    );
    console.log(
      `  kickoff=${item.kickoffUtc || "unknown"} minutes=${formatMinutes(item.minutesSinceKickoff)} status=${item.status || "unknown"}`
    );
    console.log(`  fifaOfficialLineups=${item.officialLineupsReady ? "ready" : "missing"} verifiedLayout=${item.verifiedLayout ? "yes" : "no"}`);
    console.log(`  google=${item.googleLineupUrl}`);
    console.log(`  action=${item.action}`);
  }
}

const [fixturesData, teamsData, lineupsData, overridesData] = await Promise.all([
  readJson("fixtures.json"),
  readJson("teams.json"),
  readJson("lineups.json"),
  readOptionalJson("lineup-layout-overrides.json", { fixtures: {} })
]);

const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
const items = (fixturesData.fixtures || [])
  .filter((fixture) => fixture?.id && isRequestedFixture(fixture))
  .filter((fixture) => requestedFixtureFilter.size || isInKickoffWindow(fixture))
  .map((fixture) =>
    buildItem({
      fixture,
      lineups: lineupsData.lineups?.[fixture.id],
      overridesData,
      teamsById
    })
  );

const report = {
  now: auditNow.toISOString(),
  window: {
    beforeMinutes,
    afterMinutes
  },
  policy: {
    source: "Google visual board is a manual geometry check only; FIFA remains authoritative for starters, bench, events, coaches, and formation.",
    automation: "This script does not fetch Google and does not write overrides."
  },
  summary: summarize(items),
  items
};

if (outputJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printHumanReport(report);
}
