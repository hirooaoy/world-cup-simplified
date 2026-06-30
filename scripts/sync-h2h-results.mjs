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
const shouldWrite = !process.argv.includes("--check");
const overwrite = process.argv.includes("--overwrite");
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

function shouldSyncFixture(fixture, teamIds) {
  if (fixtureFilter.size && !fixtureFilter.has(fixture.id) && !fixtureFilter.has(String(fixture.matchNumber))) {
    return false;
  }

  if (!fixtureHasConfirmedTeams(fixture, teamIds)) {
    return false;
  }

  if (overwrite) {
    return true;
  }

  return !fixture.h2h || ["not-loaded", "research-pending"].includes(fixture.h2h.status);
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status} ${response.statusText}`);
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
    return [];
  }

  const tableEnd = html.indexOf("</table>", tableStart);
  const table = tableEnd === -1 ? html.slice(tableStart) : html.slice(tableStart, tableEnd + "</table>".length);
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
  return `(${teamName(winnerTeamId, teamsById)} won ${winnerScore}-${loserScore} on penalties)`;
}

function parseEncounterResults({ awayCountry, awayTeam, homeCountry, homeTeam, html, teamsById, url }) {
  const providerIdToTeamId = sourceTeamMap(homeTeam, awayTeam, homeCountry, awayCountry);

  return parseMatchRows(html)
    .map((row) => {
      const dateLink = row.match(/<td class="date[\s\S]*?<a href="([^"]+)">([^<]+)<\/a>/);
      const countryIds = parseCountryIds(row);
      const rowHomeTeamId = providerIdToTeamId.get(countryIds[0]);
      const rowAwayTeamId = providerIdToTeamId.get(countryIds[1]);
      const score = parseScore(row);
      const competition = row.match(/<td class="event"[^>]*>([\s\S]*?)<\/td>/)?.[1] || "";
      const stadium = row.match(/<td class="stadium">[\s\S]*?<span itemprop="name">([^<]+)<\/span>/)?.[1] || "";

      if (!dateLink || !rowHomeTeamId || !rowAwayTeamId || !score) {
        return null;
      }

      const result = {
        date: dateLink[2],
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

function summarizeH2h(fixture, results, teamsById) {
  const homeName = teamName(fixture.homeTeamId, teamsById);
  const awayName = teamName(fixture.awayTeamId, teamsById);

  if (!results.length) {
    return `${homeName} and ${awayName} have never met in a verified senior men's international. This is their first head-to-head meeting.`;
  }

  const record = results.reduce(
    (summary, result) => {
      const winnerTeamId = resultWinnerTeamId(result);

      summary.goals += result.homeScore + result.awayScore;
      if (!winnerTeamId) {
        summary.draws += 1;
      } else if (winnerTeamId === fixture.homeTeamId) {
        summary.homeWins += 1;
      } else if (winnerTeamId === fixture.awayTeamId) {
        summary.awayWins += 1;
      }

      return summary;
    },
    { awayWins: 0, draws: 0, goals: 0, homeWins: 0 }
  );
  const leader =
    record.homeWins > record.awayWins
      ? homeName
      : record.awayWins > record.homeWins
        ? awayName
        : "";
  const prefix = leader
    ? `${leader} had the edge in the verified senior series`
    : "the verified senior series was level";

  return `Before this fixture, ${prefix}: ${record.homeWins} ${homeName} ${plural(record.homeWins, "win")}, ${record.draws} ${plural(record.draws, "draw")}, ${record.awayWins} ${awayName} ${plural(record.awayWins, "win")}, ${record.goals} total ${plural(record.goals, "goal")}.`;
}

function buildH2h(fixture, results, sourceUrl, teamsById) {
  return {
    status: results.length ? "loaded" : "verified-empty",
    sourceId,
    summary: summarizeH2h(fixture, results, teamsById),
    results,
    sourceUrl
  };
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
  const [fixturesData, teamsData, tournamentData] = await Promise.all([
    readJson("fixtures.json"),
    readJson("teams.json"),
    readJson("tournament.json")
  ]);
  const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
  const teamIds = new Set(teamsById.keys());
  const countryIndex = await loadNationalFootballTeamsIndex();
  const targetFixtures = (fixturesData.fixtures || []).filter((fixture) => shouldSyncFixture(fixture, teamIds));
  const warnings = [];
  let updatedCount = 0;
  let loadedCount = 0;
  let emptyCount = 0;

  for (const fixture of targetFixtures) {
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
      if (results.length) {
        loadedCount += 1;
      } else {
        emptyCount += 1;
      }
    }
  }

  if (updatedCount) {
    fixturesData.sourceIds = [...new Set([...(fixturesData.sourceIds || []), sourceId])];
    fixturesData.updatedAt = checkedAt;
    upsertSource(
      tournamentData,
      `${updatedCount} fixture H2H update${updatedCount === 1 ? "" : "s"} merged from National Football Teams encounter pages.`
    );
  }

  if (updatedCount && shouldWrite) {
    await Promise.all([writeJson("fixtures.json", fixturesData), writeJson("tournament.json", tournamentData)]);
  }

  console.log(
    `National Football Teams H2H sync: ${updatedCount} update${updatedCount === 1 ? "" : "s"} ${shouldWrite ? "written" : "detected"} (${loadedCount} loaded, ${emptyCount} verified empty).`
  );

  for (const warning of warnings) {
    console.warn(`Warning: ${warning}`);
  }

  if (updatedCount && !shouldWrite) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`H2H sync failed: ${error.message}`);
  process.exit(1);
});
