#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPlayerNameMatchScore, normalizePlayerName } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profilePath = path.join(root, "data", "historical-player-profiles.json");
const sourceRevision = "35a8667f518b07469182ae16d35574dd0e7a00fb";
const sourceId = `fjelstul-worldcup-wikipedia-squad-pages-${sourceRevision.slice(0, 7)}`;
const rawSourceBase = `https://raw.githubusercontent.com/jfjelstul/worldcup/${sourceRevision}`;
const sourcePageBase = `https://github.com/jfjelstul/worldcup/blob/${sourceRevision}`;
const checkOnly = process.argv.includes("--check");
const sourceDirArgument = process.argv.find((argument) => argument.startsWith("--source-dir="));
const sourceRoot = sourceDirArgument ? path.resolve(sourceDirArgument.slice("--source-dir=".length)) : "";

const ignoredHeadings = new Set([
  "Contents",
  "Search",
  "References",
  "External links",
  "Notes",
  "Player representation by league",
  "Player representation by league system",
  "Player representation by club",
  "Player representation by age",
  "Average age of squads",
  "Age",
  "Coaches representation by country",
  "Player representation by club confederation",
  "Player statistics",
  "Navigation menu",
  "Personal tools",
  "Namespaces",
  "Views",
  "Navigation",
  "Contribute",
  "Tools",
  "Print/export",
  "In other projects",
  "Languages"
]);

// These are identity aliases where the archive page and our historical card use
// different spellings or a familiar short name. Keeping them edition-scoped
// prevents a same-name player from a different tournament inheriting a club.
const playerLinkOverrides = new Map([
  ["Pedro Suárez / Argentina / 1930", "/wiki/Arico_Su%C3%A1rez"],
  ["Enrique Ballestrero / Uruguay / 1930", "/wiki/Enrique_Ballesteros"],
  ["Ernest Wilimowski / Poland / 1938", "/wiki/Ernst_Wilimowski"],
  ["Martim Silveira / Brazil / 1938", "/wiki/Martim_Silveira"],
  ["Danilo Alvim / Brazil / 1950", "/wiki/Danilo_Alvim"],
  ["Yuri Voynov / Soviet Union / 1958", "/wiki/Yuri_Voinov"],
  ["Bellini / Brazil / 1958", "/wiki/Hilderaldo_Bellini"],
  ["Mauro / Brazil / 1962", "/wiki/Mauro_Ramos"],
  ["Vicente Lucas / Portugal / 1966", "/wiki/Vicente_Lucas"],
  ["Wilson Piazza / Brazil / 1970", "/wiki/Wilson_da_Silva_Piazza"],
  ["Wim van Hanegem / Netherlands / 1974", "/wiki/Willem_van_Hanegem"],
  ["Georg Schwarzenbeck / West Germany / 1974", "/wiki/Hans-Georg_Schwarzenbeck"],
  ["Rivellino / Brazil / 1978", "/wiki/Roberto_Rivelino"],
  ["Oleksandr Zavarov / Soviet Union / 1986", "/wiki/Aleksandr_Zavarov"],
  ["Vasyl Rats / Soviet Union / 1986", "/wiki/Vasiliy_Rats"],
  ["Gennadiy Litovchenko / Soviet Union / 1990", "/wiki/Hennadiy_Lytovchenko"],
  ["Leo Clijsters / Belgium / 1990", "/wiki/Lei_Clijsters"],
  ["Fuad Anwar / Saudi Arabia / 1994", "/wiki/Fuad_Anwar_Amin"],
  ["Hong Myung-bo / South Korea / 2002", "/wiki/Hong_Myung-bo"],
  ["Lee Young-pyo / South Korea / 2002", "/wiki/Lee_Young-pyo"],
  ["Yoo Sang-chul / South Korea / 2002", "/wiki/Yoo_Sang-chul"],
  ["Yahya Attiat-Allah / Morocco / 2022", "/wiki/Yahia_Attiyat_Allah"]
]);

// Two archived squad rows do not expose a usable club value. These narrow
// exceptions use the clubs' own historical records instead.
const directClubOverrides = new Map([
  [
    "Jorge Góngora / Peru / 1930",
    {
      club: "Universitario",
      source: "universitario-player-history",
      sourceUrl: "https://universitario.pe/noticias/historia-jugador/jorge-gongora-el-primer-centro-delantero-de-la-u"
    }
  ],
  [
    "Nils Liedholm / Sweden / 1950",
    {
      club: "AC Milan",
      source: "ac-milan-roster-archive",
      sourceUrl: "https://www.acmilan.com/en/roster-archive/men-first-team-archive/acmilan-1950-roster"
    }
  ]
]);

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([\da-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function visibleText(value) {
  return decodeHtml(
    String(value || "")
      .replace(/<span\b[^>]*style=["'][^"']*display\s*:\s*none[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, "")
      .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, "")
      .replace(/<img\b[^>]*>/gi, "")
      .replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ").trim();
}

function extractHeadings(html, level) {
  return [...html.matchAll(new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)<\\/h${level}>`, "gi"))]
    .map((match) => visibleText(match[1]).replace(/\s*\[\s*edit\s*\]\s*$/i, "").trim())
    .filter((heading) => heading && !ignoredHeadings.has(heading));
}

function extractSquadRows(tableHtml) {
  const rows = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].slice(1);
  if (rows.length < 15) {
    return [];
  }

  const parsed = [];
  for (const rowMatch of rows) {
    const row = rowMatch[1];
    const playerCell = row.match(/<th\b[^>]*scope=["']row["'][^>]*>([\s\S]*?)<\/th>/i);
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
    if (!playerCell || cells.length < 5) {
      continue;
    }

    const name = visibleText(playerCell[1]);
    const playerHref = playerCell[1].match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] || "";
    const shirtNumber = Number(visibleText(cells[0][1]));
    const club = visibleText(cells.at(-1)[1]);
    if (name && club) {
      parsed.push({ name, club, playerHref, shirtNumber });
    }
  }
  return parsed;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...values] = rows;
  return values
    .filter((items) => items.some(Boolean))
    .map((items) => Object.fromEntries(headers.map((header, index) => [header, items[index] || ""])));
}

function canonicalPlayerName(row) {
  return row.given_name === "not applicable"
    ? row.family_name
    : `${row.given_name} ${row.family_name}`.trim();
}

function normalizeTeam(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function loadSource(relativePath) {
  if (sourceRoot) {
    return readFile(path.join(sourceRoot, relativePath), "utf8");
  }

  const response = await fetch(`${rawSourceBase}/${relativePath}`);
  if (!response.ok) {
    throw new Error(`Could not download ${relativePath}: HTTP ${response.status}`);
  }
  return response.text();
}

function editionSourcePath(year) {
  return `data-raw/Wikipedia-squad-pages/men-${year}-squads.html`;
}

async function extractEdition(year, canonicalNameByWikipediaPath) {
  const html = await loadSource(editionSourcePath(year));
  const h2 = extractHeadings(html, 2);
  const h3 = extractHeadings(html, 3);
  const countries = h2.length > h3.length ? h2 : h3;
  const squads = [...html.matchAll(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/gi)]
    .map((match) => extractSquadRows(match[1]))
    .filter((rows) => rows.length >= 15);

  if (countries.length !== squads.length) {
    throw new Error(`${year}: found ${countries.length} country headings but ${squads.length} squad tables`);
  }

  return countries.map((team, index) => ({
    team,
    players: squads[index].map((player) => ({
      ...player,
      canonicalName: canonicalNameByWikipediaPath.get(player.playerHref) || player.name
    }))
  }));
}

function resolveProfileClub(profile, squads) {
  const direct = directClubOverrides.get(profile.profileKey);
  if (direct) {
    return direct;
  }

  const archiveSourceUrl = `${sourcePageBase}/${editionSourcePath(profile.tournamentYear)}`;
  const linkOverride = playerLinkOverrides.get(profile.profileKey);
  if (linkOverride) {
    const linked = squads.flatMap((squad) => squad.players).filter((player) => player.playerHref === linkOverride);
    if (linked.length !== 1) {
      throw new Error(`${profile.profileKey}: link override resolved ${linked.length} rows`);
    }
    return { club: linked[0].club, source: sourceId, sourceUrl: archiveSourceUrl };
  }

  const allPlayers = squads.flatMap((squad) =>
    squad.players.map((player) => ({ ...player, team: squad.team }))
  );
  const exactEditionCandidates = allPlayers.filter(
    (player) => normalizePlayerName(profile.name) === normalizePlayerName(player.canonicalName)
  );
  const teamMatches = squads.filter((squad) => normalizeTeam(squad.team) === normalizeTeam(profile.teamName));
  const candidatePool = exactEditionCandidates.length === 1
    ? exactEditionCandidates
    : teamMatches.length === 1
      ? teamMatches[0].players
      : allPlayers;
  let candidates = candidatePool
    .map((player) => ({
      ...player,
      score: getPlayerNameMatchScore(profile.name, player.canonicalName)
    }))
    .filter((player) => player.score >= 0.8)
    .sort((left, right) => right.score - left.score);

  const profileNumber = Number(profile.uniformNumber);
  if (candidates.length > 1 && Number.isInteger(profileNumber) && profileNumber > 0) {
    const numberMatches = candidates.filter((candidate) => Number(candidate.shirtNumber) === profileNumber);
    if (numberMatches.length) {
      candidates = numberMatches;
    }
  }

  if (candidates.length !== 1 && candidates[0]?.score === candidates[1]?.score) {
    throw new Error(`${profile.profileKey}: ambiguous club candidates`);
  }
  if (!candidates[0]) {
    throw new Error(`${profile.profileKey}: no squad club match`);
  }

  return { club: candidates[0].club, source: sourceId, sourceUrl: archiveSourceUrl };
}

const profileData = JSON.parse(await readFile(profilePath, "utf8"));
const playerRows = parseCsv(await loadSource("data-csv/players.csv"));
const canonicalNameByWikipediaPath = new Map();
for (const row of playerRows) {
  if (/^https?:\/\//.test(row.player_wikipedia_link)) {
    canonicalNameByWikipediaPath.set(new URL(row.player_wikipedia_link).pathname, canonicalPlayerName(row));
  }
}

const editions = new Map();
const years = [...new Set(Object.values(profileData.profiles || {}).map((profile) => Number(profile.tournamentYear)))]
  .sort((left, right) => left - right);
for (const year of years) {
  editions.set(year, await extractEdition(year, canonicalNameByWikipediaPath));
}

let changedProfiles = 0;
for (const profile of Object.values(profileData.profiles || {})) {
  const resolved = resolveProfileClub(profile, editions.get(Number(profile.tournamentYear)) || []);
  const changed =
    profile.club !== resolved.club ||
    profile.clubAtTournament !== resolved.club ||
    profile.clubAtTournamentSource !== resolved.source ||
    profile.clubAtTournamentSourceUrl !== resolved.sourceUrl;

  if (changed) {
    changedProfiles += 1;
  }
  if (!checkOnly) {
    profile.club = resolved.club;
    profile.clubAtTournament = resolved.club;
    profile.clubAtTournamentSource = resolved.source;
    profile.clubAtTournamentSourceUrl = resolved.sourceUrl;
  }
}

if (checkOnly) {
  if (changedProfiles) {
    throw new Error(`${changedProfiles} historical player club records are out of sync`);
  }
  console.log(`Historical player clubs are current: ${Object.keys(profileData.profiles || {}).length} profiles.`);
  process.exit(0);
}

profileData.updatedAt = new Date().toISOString();
profileData.sourceIds = [
  ...new Set([
    ...(profileData.sourceIds || []),
    sourceId,
    ...[...directClubOverrides.values()].map((entry) => entry.source)
  ])
];
profileData.coverage = {
  ...(profileData.coverage || {}),
  clubStatus: "complete-tournament-time-clubs-1930-2022",
  clubProfileCount: Object.keys(profileData.profiles || {}).length,
  clubNote: "Club is the player's club at that World Cup, resolved per player, team and tournament year."
};

await writeFile(profilePath, `${JSON.stringify(profileData, null, 2)}\n`);
console.log(`Historical player clubs synchronized: ${Object.keys(profileData.profiles || {}).length} profiles (${changedProfiles} changed).`);
