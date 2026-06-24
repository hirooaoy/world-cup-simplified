#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const timeZone = process.env.WORLD_CUP_TZ || "America/Los_Angeles";
const now = process.env.MATCHDAY_NOW ? new Date(process.env.MATCHDAY_NOW) : new Date();
const statusStaleHours = Number(process.env.MATCHDAY_STATUS_STALE_HOURS || 2.25);
const marketFreshHours = Number(process.env.MATCHDAY_MARKET_FRESH_HOURS || 24);
const contextFreshHours = Number(process.env.MATCHDAY_CONTEXT_FRESH_HOURS || 72);
const squadFreshHours = Number(process.env.MATCHDAY_SQUAD_FRESH_HOURS || 24);
const matchupResearchFreshHours = Number(process.env.MATCHDAY_MATCHUP_RESEARCH_FRESH_HOURS || 24);
const editorialWarnOnly = /^(1|true|yes)$/i.test(process.env.MATCHDAY_EDITORIAL_WARN_ONLY || "");

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

function getDayKey(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(dayKey, days) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone
  }).format(date);
}

function hoursBetween(later, earlier) {
  return (later.getTime() - earlier.getTime()) / 36e5;
}

function sourceAgeHours(source) {
  const checkedAt = new Date(source?.checkedAt || "");
  return Number.isNaN(checkedAt.getTime()) ? Infinity : hoursBetween(now, checkedAt);
}

function teamName(teamsById, teamId) {
  return teamsById.get(teamId)?.name || teamId || "TBD";
}

function fixtureName(fixture, teamsById) {
  const home = fixture.homeTeamId ? teamName(teamsById, fixture.homeTeamId) : fixture.homeSlot || "TBD";
  const away = fixture.awayTeamId ? teamName(teamsById, fixture.awayTeamId) : fixture.awaySlot || "TBD";
  return `${home} vs ${away}`;
}

function fixtureSourceIds(fixture) {
  return [
    fixture.projection?.sourceId,
    fixture.keyPlayers?.sourceId,
    fixture.keyInformation?.sourceId,
    ...(fixture.keyInformation?.researchSourceIds || []),
    fixture.h2h?.sourceId
  ].filter(Boolean);
}

function sourceThresholdHours(source) {
  if (!source) {
    return contextFreshHours;
  }

  if (source.type === "market-odds") {
    return marketFreshHours;
  }

  if (/squad|availability/i.test(`${source.id} ${source.label}`)) {
    return squadFreshHours;
  }

  if (["official", "cross-check"].includes(source.type)) {
    return contextFreshHours;
  }

  return contextFreshHours;
}

function summarizeSource(source) {
  const age = sourceAgeHours(source);
  const ageText = Number.isFinite(age) ? `${age.toFixed(1)}h old` : "invalid checkedAt";
  return `${source?.label || source?.id || "Unknown source"} (${ageText})`;
}

function getFixtureUnavailable(playerAvailabilityData, fixture) {
  const rows = [];

  for (const teamId of [fixture.homeTeamId, fixture.awayTeamId]) {
    const teamAvailability = playerAvailabilityData?.teams?.[teamId];
    for (const record of teamAvailability?.fixtureUnavailable || []) {
      if (record.fixtureId === fixture.id) {
        rows.push({ ...record, teamId });
      }
    }
  }

  return rows;
}

const [
  fixturesData,
  matchupResearchData,
  playerAvailabilityData,
  teamsData,
  tournamentData
] = await Promise.all([
  readJson("fixtures.json"),
  readJson("matchup-research-notes.json"),
  readJson("player-availability.json"),
  readJson("teams.json"),
  readJson("tournament.json")
]);

const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
const sourceById = new Map((tournamentData.sources || []).map((source) => [source.id, source]));
const todayKey = getDayKey(now);
const tomorrowKey = addDays(todayKey, 1);
const fixtures = [...(fixturesData.fixtures || [])].sort(
  (a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc)
);
const focusFixtures = fixtures.filter((fixture) => {
  const dayKey = getDayKey(new Date(fixture.kickoffUtc));
  return dayKey === todayKey || dayKey === tomorrowKey;
});
const blockers = [];
const editorialWarnings = [];
const actions = [];
const sourceRefreshes = new Map();
const matchupResearchRows = [];

function getFixtureResearch(fixture) {
  return matchupResearchData?.fixtures?.[fixture.id] || null;
}

function addEditorialFreshnessIssue(message) {
  if (editorialWarnOnly) {
    editorialWarnings.push(message);
  } else {
    blockers.push(message);
  }
}

for (const fixture of focusFixtures) {
  const kickoff = new Date(fixture.kickoffUtc);
  const hoursSinceKickoff = hoursBetween(now, kickoff);
  const hoursUntilKickoff = hoursBetween(kickoff, now);
  const label = fixtureName(fixture, teamsById);
  const fixtureResearch = getFixtureResearch(fixture);

  if (fixture.status === "SCHEDULED" && hoursSinceKickoff > 0) {
    const message = `${label} kicked off ${hoursSinceKickoff.toFixed(1)}h ago but is still SCHEDULED. Run pnpm sync:fifa, then verify live status if FIFA has no update.`;
    if (hoursSinceKickoff > statusStaleHours) {
      blockers.push(message);
    } else {
      actions.push(message);
    }
  }

  if (fixture.status === "LIVE" && hoursSinceKickoff > statusStaleHours) {
    blockers.push(`${label} has been LIVE for ${hoursSinceKickoff.toFixed(1)}h. Run pnpm sync:fifa and confirm FT score/status.`);
  } else if (fixture.status === "LIVE") {
    actions.push(`${label} is LIVE. Re-run pnpm sync:fifa after full time.`);
  }

  if (fixture.status === "FT" && !fixture.score) {
    blockers.push(`${label} is FT but has no score.`);
  }

  if (fixture.stage === "group" && fixture.status !== "FT" && fixture.homeTeamId && fixture.awayTeamId) {
    if (!fixtureResearch || fixtureResearch.status !== "researched") {
      const message = `${label} needs fixture-specific matchup research before publishing.`;
      if (hoursUntilKickoff <= 24) {
        addEditorialFreshnessIssue(message);
      } else {
        actions.push(message);
      }
    } else {
      const checkedAt = new Date(fixtureResearch.checkedAt || "");
      const age = Number.isNaN(checkedAt.getTime()) ? Infinity : hoursBetween(now, checkedAt);
      matchupResearchRows.push({ fixture, label, research: fixtureResearch, age });
      if (age > matchupResearchFreshHours) {
        const message = `${label} matchup research is ${Number.isFinite(age) ? `${age.toFixed(1)}h` : "invalid"} old; refresh source search and rerun matchup generation.`;
        if (hoursUntilKickoff <= 24) {
          addEditorialFreshnessIssue(message);
        } else {
          actions.push(message);
        }
      }
    }
  }

  for (const sourceId of fixtureSourceIds(fixture)) {
    const source = sourceById.get(sourceId);
    const age = sourceAgeHours(source);
    const threshold = sourceThresholdHours(source);
    if (age > threshold) {
      sourceRefreshes.set(sourceId, {
        age,
        fixtures: [...(sourceRefreshes.get(sourceId)?.fixtures || []), label],
        source,
        threshold
      });
    }
  }
}

const squadSources = (playerAvailabilityData.sourceIds || [])
  .map((sourceId) => sourceById.get(sourceId))
  .filter(Boolean);
for (const source of squadSources) {
  const age = sourceAgeHours(source);
  if (age > sourceThresholdHours(source)) {
    sourceRefreshes.set(source.id, {
      age,
      fixtures: ["tournament squad baseline"],
      source,
      threshold: sourceThresholdHours(source)
    });
  }
}

console.log("Matchday readiness");
console.log(`Timezone: ${timeZone}`);
console.log(`Now: ${formatDateTime(now)}`);
console.log(`Editorial freshness: ${editorialWarnOnly ? "warn-only" : "strict"}`);
console.log("");

console.log(`Today (${todayKey}) and tomorrow (${tomorrowKey})`);
for (const fixture of focusFixtures) {
  const kickoff = new Date(fixture.kickoffUtc);
  const score = fixture.score ? ` ${fixture.score.home}-${fixture.score.away}` : "";
  console.log(`- ${formatDateTime(kickoff)} ${fixtureName(fixture, teamsById)} [${fixture.status}${score}]`);
}

console.log("");
console.log("Fixture availability");
let printedAvailability = false;
for (const fixture of focusFixtures) {
  const unavailable = getFixtureUnavailable(playerAvailabilityData, fixture);
  for (const record of unavailable) {
    printedAvailability = true;
    console.log(`- ${fixtureName(fixture, teamsById)}: ${record.name} unavailable for ${teamName(teamsById, record.teamId)} (${record.reason})`);
  }
}
if (!printedAvailability) {
  console.log("- No fixture-specific absences recorded for today/tomorrow.");
}

console.log("");
console.log("Fixture matchup research");
if (!matchupResearchRows.length) {
  console.log("- No source-backed fixture research notes loaded for today/tomorrow.");
} else {
  for (const row of matchupResearchRows) {
    const sourceCount = row.research.sourceIds?.length || 0;
    const ageText = Number.isFinite(row.age) ? `${row.age.toFixed(1)}h old` : "invalid checkedAt";
    console.log(`- ${row.label}: ${row.research.status}, ${ageText}, ${sourceCount} source(s).`);
  }
}

console.log("");
console.log("Actions");
if (!blockers.length && !editorialWarnings.length && !actions.length) {
  console.log("- No status blockers. Keep the live provider/sync cadence running.");
} else {
  for (const blocker of blockers) {
    console.log(`- BLOCKER: ${blocker}`);
  }
  for (const warning of editorialWarnings) {
    console.log(`- WARNING: ${warning}`);
  }
  for (const action of actions) {
    console.log(`- ${action}`);
  }
}

console.log("");
console.log("Source freshness for today/tomorrow");
if (!sourceRefreshes.size) {
  console.log("- No focused source refreshes needed.");
} else {
  for (const { fixtures: labels, source, threshold } of [...sourceRefreshes.values()].sort((a, b) => b.age - a.age)) {
    const usedBy = [...new Set(labels)].slice(0, 3).join("; ");
    console.log(`- Refresh ${summarizeSource(source)}; threshold ${threshold}h; used by ${usedBy}.`);
  }
}

console.log("");
console.log("Automation note");
console.log("- Production auto updates require /api/live-data with a configured provider key.");
console.log("- Committed static JSON updates require pnpm sync:fifa and a commit/deploy.");

if (blockers.length) {
  process.exitCode = 1;
}
