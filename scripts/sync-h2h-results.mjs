#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const nationalFootballTeamsBaseUrl = "https://www.national-football-teams.com";
const continentPaths = [
  "/continent/1/Europe.html",
  "/continent/2/Africa.html",
  "/continent/3/Asia.html",
  "/continent/4/Oceania.html",
  "/continent/5/South_America.html",
  "/continent/6/North_America.html"
];
const sourceAliasesByTeamId = {
  BIH: "Bosnia Herzegovina",
  CIV: "Ivory Coast",
  COD: "Dr Congo",
  CPV: "Cape Verde",
  CUW: "Curacao",
  IRN: "Iran",
  KOR: "South Korea",
  TUR: "Turkey"
};
const checkedAt = process.env.H2H_CHECKED_AT || new Date().toISOString();
const sourceId = `national-football-teams-h2h-sync-${checkedAt.slice(0, 10)}`;
const fixtureTimeZone = "America/Los_Angeles";
const shouldWrite = !process.argv.includes("--check");
const overwrite = process.argv.includes("--overwrite");
const warnOnly =
  process.env.H2H_WARN_ONLY === "1" || process.env.H2H_SOURCE_OPTIONAL === "1" || process.argv.includes("--warn-only");
const fixtureFilter = new Set(
  process.argv
    .filter((arg) => arg.startsWith("--fixture="))
    .flatMap((arg) => arg.slice("--fixture=".length).split(","))
    .map((value) => value.trim())
    .filter(Boolean)
);

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

async function writeJson(fileName, value) {
  await writeFile(path.join(dataDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)));
}

function textContent(value) {
  return decodeHtml(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getFixtureDayKey(fixture) {
  if (fixture?.date) {
    return fixture.date;
  }

  if (!fixture?.kickoffUtc) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: fixtureTimeZone,
    year: "numeric"
  }).formatToParts(new Date(fixture.kickoffUtc));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fixtureHasConfirmedTeams(fixture, teamIds) {
  return Boolean(fixture?.homeTeamId && fixture?.awayTeamId && teamIds.has(fixture.homeTeamId) && teamIds.has(fixture.awayTeamId));
}

function matchupKey(fixture) {
  return [fixture?.homeTeamId, fixture?.awayTeamId].filter(Boolean).sort().join("-");
}

function shouldSyncFixture(fixture, teamIds, authoritativePairs) {
  if (fixtureFilter.size && !fixtureFilter.has(fixture.id) && !fixtureFilter.has(String(fixture.matchNumber))) {
    return false;
  }

  if (!fixtureHasConfirmedTeams(fixture, teamIds)) {
    return false;
  }

  if (overwrite) {
    return true;
  }

  const authoritative = authoritativePairs?.[matchupKey(fixture)];
  if (
    authoritative &&
    (
      fixture.h2h?.coverageStatus !== "complete" ||
      fixture.h2h?.loadedMeetingCount !== authoritative.officialAggregateCount
    )
  ) {
    return true;
  }

  return !fixture.h2h || ["not-loaded", "research-pending"].includes(fixture.h2h.status);
}

async function fetchText(url) {
  let response;

  try {
    response = await fetch(url);
  } catch (error) {
    const detail = error.cause?.code ? `${error.message} (${error.cause.code})` : error.message;
    const fetchError = new Error(`${url} fetch failed: ${detail}`);
    fetchError.h2hFetchError = true;
    throw fetchError;
  }

  if (!response.ok) {
    const error = new Error(`${url} returned ${response.status} ${response.statusText}`);
    error.h2hFetchError = true;
    throw error;
  }

  return response.text();
}

async function loadNationalFootballTeamsIndex() {
  const countries = new Map();

  for (const continentPath of continentPaths) {
    const html = await fetchText(`${nationalFootballTeamsBaseUrl}${continentPath}`);
    const matches = html.matchAll(/\/country\/(\d+)\/(?:\d+\/)?([^"/]+)\.html/g);

    for (const match of matches) {
      const id = match[1];
      const name = decodeURIComponent(match[2]).replace(/_/g, " ");
      const key = normalizeName(name);

      if (key && !countries.has(key)) {
        countries.set(key, { id, name });
      }
    }
  }

  return countries;
}

function sourceCountryNames(team) {
  return [
    sourceAliasesByTeamId[team.id],
    team.officialName,
    team.name,
    ...(Array.isArray(team.aliases) ? team.aliases : [])
  ].filter(Boolean);
}

function resolveSourceCountry(team, countryIndex) {
  for (const name of sourceCountryNames(team)) {
    const country = countryIndex.get(normalizeName(name));

    if (country) {
      return country;
    }
  }

  return null;
}

function encounterSlug(country) {
  return country.name.replace(/\s+/g, "_");
}

function encounterUrl(homeCountry, awayCountry) {
  return `${nationalFootballTeamsBaseUrl}/encounter/teams/${homeCountry.id}/${awayCountry.id}/${encounterSlug(homeCountry)}_vs_${encounterSlug(awayCountry)}.html`;
}

function parseMatchRows(html) {
  const tableStart = html.indexOf('<table class="table countries matches');

  if (tableStart === -1) {
    const parseError = new Error("National Football Teams encounter table was not found; provider markup may have changed");
    parseError.h2hParseError = true;
    throw parseError;
  }

  const tableEnd = html.indexOf("</table>", tableStart);
  if (tableEnd === -1) {
    const parseError = new Error("National Football Teams encounter table did not close; provider markup may have changed");
    parseError.h2hParseError = true;
    throw parseError;
  }

  const table = html.slice(tableStart, tableEnd + "</table>".length);
  return [...table.matchAll(/<tr itemscope[\s\S]*?<\/tr>/g)].map((match) => match[0]);
}

function parseCountryIds(row) {
  const countryIds = [...row.matchAll(/\/country\/(\d+)\/\d+\//g)].map((match) => match[1]);
  return [...new Set(countryIds)].slice(0, 2);
}

function parseScore(row) {
  const resultCell = row.match(/<td class="result">([\s\S]*?)<\/td>/)?.[1] || "";
  const resultText = textContent(resultCell);
  const score = resultText.match(/(\d+)\s*:\s*(\d+)/);
  const shootout = resultText.match(/\(\s*(\d+)\s*:\s*(\d+)\s*\)/);

  if (!score) {
    return null;
  }

  return {
    homeScore: Number(score[1]),
    awayScore: Number(score[2]),
    shootoutHomeScore: shootout ? Number(shootout[1]) : null,
    shootoutAwayScore: shootout ? Number(shootout[2]) : null
  };
}

function sourceTeamMap(homeTeam, awayTeam, homeCountry, awayCountry) {
  return new Map([
    [homeCountry.id, homeTeam.id],
    [awayCountry.id, awayTeam.id]
  ]);
}

function teamName(teamId, teamsById) {
  return teamsById.get(teamId)?.name || teamId;
}

function penaltyScoreNote(score, rowHomeTeamId, rowAwayTeamId, teamsById) {
  if (!Number.isFinite(score.shootoutHomeScore) || !Number.isFinite(score.shootoutAwayScore)) {
    return "";
  }

  const winnerTeamId = score.shootoutHomeScore > score.shootoutAwayScore ? rowHomeTeamId : rowAwayTeamId;
  const winnerScore = Math.max(score.shootoutHomeScore, score.shootoutAwayScore);
  const loserScore = Math.min(score.shootoutHomeScore, score.shootoutAwayScore);
  return `(${winnerScore}-${loserScore} pens)`;
}

function parseEncounterResults({ awayCountry, awayTeam, fixtureDayKey, homeCountry, homeTeam, html, teamsById, url }) {
  const providerIdToTeamId = sourceTeamMap(homeTeam, awayTeam, homeCountry, awayCountry);
  const rows = parseMatchRows(html);
  let invalidRowCount = 0;

  const results = rows
    .map((row) => {
      const dateLink = row.match(/<td class="date[\s\S]*?<a href="([^"]+)">([^<]+)<\/a>/);
      const countryIds = parseCountryIds(row);
      const rowHomeTeamId = providerIdToTeamId.get(countryIds[0]);
      const rowAwayTeamId = providerIdToTeamId.get(countryIds[1]);
      const score = parseScore(row);
      const competition = row.match(/<td class="event"[^>]*>([\s\S]*?)<\/td>/)?.[1] || "";
      const stadium = row.match(/<td class="stadium">[\s\S]*?<span itemprop="name">([^<]+)<\/span>/)?.[1] || "";

      if (!dateLink || !rowHomeTeamId || !rowAwayTeamId || !score) {
        invalidRowCount += 1;
        return null;
      }

      const resultDate = dateLink[2];
      if (fixtureDayKey && resultDate >= fixtureDayKey) {
        return null;
      }

      const result = {
        date: resultDate,
        competition: textContent(competition),
        homeTeamId: rowHomeTeamId,
        awayTeamId: rowAwayTeamId,
        homeScore: score.homeScore,
        awayScore: score.awayScore,
        venue: textContent(stadium) || "Venue not listed",
        sourceUrl: new URL(dateLink[1], url).href
      };
      const scoreNote = penaltyScoreNote(score, rowHomeTeamId, rowAwayTeamId, teamsById);

      if (scoreNote) {
        result.scoreNote = scoreNote;
      }

      return result;
    })
    .filter(Boolean)
    .sort((left, right) => right.date.localeCompare(left.date));

  if (invalidRowCount || (rows.length && !results.length)) {
    const parseError = new Error(
      `National Football Teams returned ${rows.length} match rows, with ${invalidRowCount} structurally invalid and ${results.length} trustworthy prior results`
    );
    parseError.h2hParseError = true;
    throw parseError;
  }

  return results;
}

function plural(count, singular, pluralValue = `${singular}s`) {
  return count === 1 ? singular : pluralValue;
}

function resultWinnerTeamId(result) {
  if (result.homeScore === result.awayScore) {
    return "";
  }

  return result.homeScore > result.awayScore ? result.homeTeamId : result.awayTeamId;
}

function calculateRecord(fixture, results) {
  return results.reduce(
    (summary, result) => {
      const winnerTeamId = resultWinnerTeamId(result);

      if (!winnerTeamId) {
        summary.draws += 1;
      } else if (winnerTeamId === fixture.homeTeamId) {
        summary.homeWins += 1;
      } else if (winnerTeamId === fixture.awayTeamId) {
        summary.awayWins += 1;
      }

      return summary;
    },
    { awayWins: 0, draws: 0, homeWins: 0 }
  );
}

function recordText(fixture, results, teamsById) {
  const homeName = teamName(fixture.homeTeamId, teamsById);
  const awayName = teamName(fixture.awayTeamId, teamsById);
  const record = calculateRecord(fixture, results);
  const order = record.homeWins >= record.awayWins
    ? [[homeName, record.homeWins], [awayName, record.awayWins]]
    : [[awayName, record.awayWins], [homeName, record.homeWins]];

  return `${order[0][0]} ${order[0][1]} ${plural(order[0][1], "win")}, ${order[1][0]} ${order[1][1]}, ${record.draws} ${plural(record.draws, "draw")}`;
}

function summarizeH2h(fixture, results, teamsById, coverageStatus) {
  const loadedMeetingCount = results.length;

  if (!loadedMeetingCount) {
    return "No previous meetings were returned by this source. Complete historical coverage has not been confirmed.";
  }

  const record = recordText(fixture, results, teamsById);

  if (coverageStatus === "complete") {
    return `${loadedMeetingCount} verified senior ${plural(loadedMeetingCount, "meeting")}: ${record}.`;
  }

  return `${loadedMeetingCount} selected senior ${plural(loadedMeetingCount, "meeting")} available in our dataset: ${record}. Complete historical coverage has not been confirmed.`;
}

function buildH2h(fixture, results, sourceUrl, teamsById, authoritative = null) {
  const officialAggregateCount = authoritative?.officialAggregateCount ?? null;
  const coverageStatus = authoritative
    ? results.length === officialAggregateCount ? "complete" : "partial"
    : "unknown";

  return {
    status: "loaded",
    coverageStatus,
    loadedMeetingCount: results.length,
    officialAggregateCount,
    aggregateSourceId: authoritative?.aggregateSourceId ?? null,
    aggregateCheckedAt: authoritative?.aggregateSource?.checkedAt ?? null,
    sourceId: authoritative?.resultsSourceId || sourceId,
    summary: summarizeH2h(fixture, results, teamsById, coverageStatus),
    results,
    sourceUrl: authoritative?.resultsSource?.url || sourceUrl
  };
}

function resultIdentity(result) {
  return [result.date, result.homeTeamId, result.awayTeamId, result.homeScore, result.awayScore].join("|");
}

function mergeResults(...collections) {
  const results = new Map();
  for (const result of collections.flat()) {
    if (result) {
      results.set(resultIdentity(result), result);
    }
  }
  return [...results.values()].sort((left, right) => right.date.localeCompare(left.date));
}

function normalizeExistingCoverage(fixture, teamsById) {
  if (!fixture.h2h || ["not-loaded", "research-pending"].includes(fixture.h2h.status)) {
    return false;
  }

  if (
    fixture.h2h.status === "loaded" &&
    ["complete", "partial", "unknown"].includes(fixture.h2h.coverageStatus) &&
    Number.isInteger(fixture.h2h.loadedMeetingCount)
  ) {
    return false;
  }

  const results = Array.isArray(fixture.h2h.results) ? fixture.h2h.results : [];
  const nextH2h = buildH2h(fixture, results, fixture.h2h.sourceUrl, teamsById);
  if (sameJson(fixture.h2h, nextH2h)) {
    return false;
  }
  fixture.h2h = nextH2h;
  return true;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function upsertSource(tournamentData, note) {
  tournamentData.sources = (tournamentData.sources || []).filter((source) => source.id !== sourceId);
  tournamentData.sources.push({
    id: sourceId,
    label: "National Football Teams H2H sync",
    url: nationalFootballTeamsBaseUrl,
    type: "cross-check",
    checkedAt,
    note
  });
}

async function main() {
  const [fixturesData, teamsData, tournamentData, coverageData] = await Promise.all([
    readJson("fixtures.json"),
    readJson("teams.json"),
    readJson("tournament.json"),
    readJson("h2h-authoritative-coverage.json")
  ]);
  const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
  const teamIds = new Set(teamsById.keys());
  const authoritativePairs = coverageData.pairs || {};
  const warnings = [];
  let updatedCount = 0;
  let loadedCount = 0;
  let unknownCount = 0;

  for (const fixture of fixturesData.fixtures || []) {
    if (normalizeExistingCoverage(fixture, teamsById)) {
      updatedCount += 1;
    }
  }

  const targetFixtures = (fixturesData.fixtures || []).filter((fixture) =>
    shouldSyncFixture(fixture, teamIds, authoritativePairs)
  );

  if (!targetFixtures.length) {
    if (!updatedCount) {
      console.log(`H2H coverage sync: 0 updates ${shouldWrite ? "written" : "detected"}.`);
      return;
    }
  }

  const providerTargets = targetFixtures.filter((fixture) => !authoritativePairs[matchupKey(fixture)]);
  const countryIndex = providerTargets.length ? await loadNationalFootballTeamsIndex() : null;

  for (const fixture of targetFixtures) {
    const authoritative = authoritativePairs[matchupKey(fixture)] || null;
    if (authoritative) {
      const results = mergeResults(fixture.h2h?.results || [], authoritative.additionalResults || []);
      const nextH2h = buildH2h(fixture, results, authoritative.resultsSource?.url, teamsById, authoritative);

      if (!sameJson(fixture.h2h, nextH2h)) {
        fixture.h2h = nextH2h;
        updatedCount += 1;
        loadedCount += 1;
      }
      continue;
    }

    const homeTeam = teamsById.get(fixture.homeTeamId);
    const awayTeam = teamsById.get(fixture.awayTeamId);
    const homeCountry = resolveSourceCountry(homeTeam, countryIndex);
    const awayCountry = resolveSourceCountry(awayTeam, countryIndex);

    if (!homeCountry || !awayCountry) {
      warnings.push(`${fixture.id}: missing National Football Teams country id for ${homeTeam?.name || fixture.homeTeamId} vs ${awayTeam?.name || fixture.awayTeamId}`);
      continue;
    }

    const url = encounterUrl(homeCountry, awayCountry);
    const html = await fetchText(url);
    const results = parseEncounterResults({
      awayCountry,
      awayTeam,
      fixtureDayKey: getFixtureDayKey(fixture),
      homeCountry,
      homeTeam,
      html,
      teamsById,
      url
    });
    const nextH2h = buildH2h(fixture, results, url, teamsById);

    if (!sameJson(fixture.h2h, nextH2h)) {
      fixture.h2h = nextH2h;
      updatedCount += 1;
      results.length ? loadedCount += 1 : unknownCount += 1;
    }
  }

  if (updatedCount) {
    const coverageSourceIds = Object.values(authoritativePairs).flatMap((record) => [
      record.aggregateSourceId,
      record.resultsSourceId
    ]).filter(Boolean);
    fixturesData.sourceIds = [...new Set([...(fixturesData.sourceIds || []), sourceId, ...coverageSourceIds])];
    fixturesData.updatedAt = checkedAt;
    upsertSource(
      tournamentData,
      `${updatedCount} fixture H2H update${updatedCount === 1 ? "" : "s"} merged from National Football Teams encounter pages.`
    );
    for (const record of Object.values(authoritativePairs)) {
      for (const source of [record.aggregateSource, record.resultsSource]) {
        if (!source) continue;
        tournamentData.sources = (tournamentData.sources || []).filter((item) => item.id !== (source === record.aggregateSource ? record.aggregateSourceId : record.resultsSourceId));
        tournamentData.sources.push({
          id: source === record.aggregateSource ? record.aggregateSourceId : record.resultsSourceId,
          ...source
        });
      }
    }
  }

  if (updatedCount && shouldWrite) {
    await Promise.all([writeJson("fixtures.json", fixturesData), writeJson("tournament.json", tournamentData)]);
  }

  console.log(
    `H2H coverage sync: ${updatedCount} update${updatedCount === 1 ? "" : "s"} ${shouldWrite ? "written" : "detected"} (${loadedCount} reconciled, ${unknownCount} empty with unknown coverage).`
  );

  for (const warning of warnings) {
    console.warn(`Warning: ${warning}`);
  }

  if (updatedCount && !shouldWrite) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  if (warnOnly && (error.h2hFetchError || error.h2hParseError)) {
    console.warn(`Warning: H2H sync skipped because the source could not be trusted: ${error.message}`);
    return;
  }

  console.error(`H2H sync failed: ${error.message}`);
  process.exit(1);
});
