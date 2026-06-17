#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const now = new Date();
const timeZone = process.env.WORLD_CUP_TZ || "America/Los_Angeles";
const staleSourceHours = Number(process.env.STALE_SOURCE_HOURS || 12);
const staleLiveHours = Number(process.env.STALE_LIVE_HOURS || 4);
const scheduledLiveWindowHours = Number(process.env.SCHEDULED_LIVE_WINDOW_HOURS || 2.25);
const enrichmentWindowHours = Number(process.env.ENRICHMENT_WINDOW_HOURS || 48);
const warnings = [];
const failures = [];

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

function getDayKey(date, zone = timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: zone,
    year: "numeric"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getReadableDateTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone
  }).format(date);
}

function hoursBetween(later, earlier) {
  return (later.getTime() - earlier.getTime()) / 36e5;
}

function addDays(dayKey, days) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function teamName(teamsById, teamId) {
  return teamsById.get(teamId)?.name || teamId;
}

function participantName(teamsById, fixture, side) {
  const teamId = side === "home" ? fixture.homeTeamId : fixture.awayTeamId;
  const slot = side === "home" ? fixture.homeSlot : fixture.awaySlot;
  return teamId ? teamName(teamsById, teamId) : slot || "TBD";
}

const [fixturesData, standingsData, teamsData, tournamentData] = await Promise.all([
  readJson("fixtures.json"),
  readJson("standings.json"),
  readJson("teams.json"),
  readJson("tournament.json")
]);

const teamsById = new Map(teamsData.teams.map((team) => [team.id, team]));
const todayKey = getDayKey(now);
const tomorrowKey = addDays(todayKey, 1);
const fixtures = [...fixturesData.fixtures].sort(
  (a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc)
);
const loadedDayKeys = [...new Set(fixtures.map((fixture) => getDayKey(new Date(fixture.kickoffUtc))))].sort();

console.log(`World Cup data audit`);
console.log(`Timezone: ${timeZone}`);
console.log(`Now: ${getReadableDateTime(now)}`);
console.log("");

console.log(`Coverage: ${fixturesData.coverage?.status || "unknown"}`);
console.log(`Loaded fixture dates: ${loadedDayKeys.join(", ") || "none"}`);
if (!["complete", "complete-schedule"].includes(fixturesData.coverage?.status)) {
  warnings.push("Fixture coverage is partial. Public users will see Not loaded for dates outside the loaded range.");
}

console.log("");
console.log("Sources:");
for (const source of tournamentData.sources || []) {
  const checkedAt = new Date(source.checkedAt);
  const ageHours = hoursBetween(now, checkedAt);
  const ageText = Number.isFinite(ageHours) ? `${ageHours.toFixed(1)}h old` : "invalid date";
  console.log(`- ${source.label}: ${ageText}`);

  if (!Number.isFinite(ageHours)) {
    failures.push(`Source "${source.id}" has invalid checkedAt.`);
  } else if (ageHours > staleSourceHours) {
    warnings.push(`Source "${source.label}" is older than ${staleSourceHours} hours.`);
  }
}

function printDay(dayKey, label) {
  const rows = fixtures.filter((fixture) => getDayKey(new Date(fixture.kickoffUtc)) === dayKey);
  console.log("");
  console.log(`${label} (${dayKey}): ${rows.length ? `${rows.length} loaded fixture(s)` : "no loaded fixtures"}`);
  for (const fixture of rows) {
    const kickoff = new Date(fixture.kickoffUtc);
    console.log(
      `- ${getReadableDateTime(kickoff)} ${participantName(teamsById, fixture, "home")} vs ${participantName(teamsById, fixture, "away")} [${fixture.status}]`
    );
  }
}

printDay(todayKey, "Today");
printDay(tomorrowKey, "Tomorrow");

for (const fixture of fixtures) {
  const kickoff = new Date(fixture.kickoffUtc);
  const hoursSinceKickoff = hoursBetween(now, kickoff);
  const hoursUntilKickoff = hoursBetween(kickoff, now);
  const label = `${participantName(teamsById, fixture, "home")} vs ${participantName(teamsById, fixture, "away")} (${fixture.id})`;
  const shouldAuditEnrichment =
    fixture.stage === "group" &&
    hoursUntilKickoff <= enrichmentWindowHours &&
    hoursSinceKickoff <= 6;

  if (fixture.status === "SCHEDULED" && hoursSinceKickoff > scheduledLiveWindowHours) {
    failures.push(`${label} kicked off ${hoursSinceKickoff.toFixed(1)}h ago but is still SCHEDULED.`);
  } else if (fixture.status === "SCHEDULED" && hoursSinceKickoff > 0) {
    warnings.push(
      `${label} kicked off ${hoursSinceKickoff.toFixed(1)}h ago and is being treated as live until the status updates.`
    );
  }

  if (fixture.status === "LIVE" && hoursSinceKickoff > staleLiveHours) {
    warnings.push(`${label} has been LIVE for ${hoursSinceKickoff.toFixed(1)}h. Confirm status or final score.`);
  }

  if (fixture.status === "LIVE" && hoursSinceKickoff < -0.05) {
    failures.push(`${label} is marked LIVE before kickoff.`);
  }

  if (fixture.status === "FT" && !fixture.score) {
    failures.push(`${label} is FT but has no score.`);
  }

  if (shouldAuditEnrichment && !fixture.projection) {
    warnings.push(`${label} has no projection data.`);
  }

  if (shouldAuditEnrichment && (!fixture.keyPlayers?.home?.length || !fixture.keyPlayers?.away?.length)) {
    warnings.push(`${label} has incomplete key player notes.`);
  }

  if (shouldAuditEnrichment && (!fixture.h2h || fixture.h2h.status === "not-loaded")) {
    warnings.push(`${label} has H2H marked not-loaded.`);
  }
}

const standingGroups = Object.keys(standingsData.groups || {});
if (standingGroups.length !== (tournamentData.groups || []).length) {
  failures.push(`Standings include ${standingGroups.length} groups, expected ${(tournamentData.groups || []).length}.`);
}

console.log("");
console.log(`Warnings: ${warnings.length}`);
for (const warning of warnings) {
  console.log(`- ${warning}`);
}

console.log("");
console.log(`Failures: ${failures.length}`);
for (const failure of failures) {
  console.log(`- ${failure}`);
}

if (failures.length) {
  process.exit(1);
}
