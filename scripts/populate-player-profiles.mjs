#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const fixturesPath = path.join(dataDir, "fixtures.json");
const teamsPath = path.join(dataDir, "teams.json");
const outputPath = path.join(dataDir, "player-profiles.json");
const userAgent = "WorldCupSimplified/0.1 (local profile enrichment)";
const requestDelayMs = Number(process.env.WIKI_REQUEST_DELAY_MS || 1800);
const pageTitleOverrides = new Map([
  ["Cristiano Ronaldo", "Cristiano Ronaldo"],
  ["Luis Suarez", "Luis Suárez (footballer, born 1997)"],
  ["Martin Odegaard", "Martin Ødegaard"],
  ["Neymar", "Neymar"]
]);

const skillRules = [
  ["goalkeeper|shot-stopper|saves?|keeper", "Shot-stopping"],
  ["set-piece|dead-ball|restart", "Set pieces"],
  ["aerial|crosses|crossing|second balls|box", "Box presence"],
  ["finisher|finishing|striker|scorer|penalty-box|goal", "Finishing"],
  ["creative|creator|invention|final passes|connects|orchestrator", "Chance creation"],
  ["tempo|control|rhythm|dictate|passing", "Tempo setting"],
  ["direct|behind|space|runner|runs|pace|speed", "Runs in behind"],
  ["wide|width|winger|stretch", "Wide threat"],
  ["press|pressure|counter-press", "Pressing"],
  ["defensive|defender|shield|anchor|organizer|back line", "Defensive control"],
  ["ball-carrier|carries|dribble|surges", "Ball carrying"],
  ["long-range|left-footed", "Long-range shooting"],
  ["target|reference|hold-up|power", "Target play"],
  ["leadership|captain|experienced|veteran|calm", "Leadership"]
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&[^;\s]+;/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function cleanWikiText(value) {
  let text = decodeEntities(value)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref\b[^/>]*\/>/gi, "")
    .replace(/''+/g, "")
    .trim();

  for (let index = 0; index < 8 && /\{\{[^{}]*\}\}/.test(text); index += 1) {
    text = text.replace(/\{\{[^{}]*\}\}/g, (template) => {
      const inner = template.slice(2, -2).trim();
      const parts = inner.split("|").map((part) => part.trim()).filter(Boolean);
      if (!parts.length) {
        return "";
      }

      const name = parts[0].toLowerCase();
      if (["nowrap", "nobold", "small", "ubl", "plainlist"].includes(name)) {
        return parts.slice(1).join(", ");
      }
      if (name === "flagicon" || name === "flagdeco") {
        return "";
      }
      return parts.at(-1) || "";
    });
  }

  text = text
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[[a-z]+:\/\/[^\s\]]+\s+([^\]]+)\]/gi, "$1")
    .replace(/→/g, "")
    .replace(/\s*\(loan\)\s*/gi, "")
    .replace(/([A-Za-z0-9])\(/g, "$1 (")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return text.replace(/^[-–—]\s*/, "");
}

function getInfoboxFields(wikitext) {
  const start = wikitext.search(/\{\{Infobox football biography/i);
  if (start < 0) {
    return {};
  }

  let depth = 0;
  let end = -1;
  for (let index = start; index < wikitext.length - 1; index += 1) {
    const pair = wikitext.slice(index, index + 2);
    if (pair === "{{") {
      depth += 1;
      index += 1;
    } else if (pair === "}}") {
      depth -= 1;
      index += 1;
      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
  }

  const infobox = wikitext.slice(start, end > start ? end : undefined);
  const fields = {};
  let currentKey = "";

  for (const line of infobox.split(/\r?\n/)) {
    const match = line.match(/^\|\s*([^=]+?)\s*=\s*(.*)$/);
    if (match) {
      currentKey = match[1].trim().toLowerCase();
      fields[currentKey] = match[2].trim();
    } else if (currentKey && !line.startsWith("|")) {
      fields[currentKey] = `${fields[currentKey] || ""} ${line.trim()}`.trim();
    }
  }

  return fields;
}

function getOpenEndedClub(fields) {
  const clubs = [];
  for (const [key, value] of Object.entries(fields)) {
    const match = key.match(/^years(\d+)$/);
    if (!match) {
      continue;
    }

    const yearText = cleanWikiText(value);
    const clubText = cleanWikiText(fields[`clubs${match[1]}`] || "");
    if (!clubText) {
      continue;
    }

    if (/[–-]\s*$/.test(yearText) || /\bpresent\b/i.test(yearText)) {
      clubs.push(clubText);
    }
  }

  return clubs.at(-1) || "";
}

function getCommonsImageUrl(fileName) {
  const cleaned = cleanWikiText(fileName);
  if (!cleaned || /^yes$/i.test(cleaned)) {
    return "";
  }

  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(cleaned)}?width=160`;
}

function inferSkills(note) {
  const lower = normalizeText(note);
  const skills = [];

  for (const [pattern, label] of skillRules) {
    if (new RegExp(pattern, "i").test(lower) && !skills.includes(label)) {
      skills.push(label);
    }
  }

  return skills.slice(0, 4);
}

async function wikiJson(params) {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("origin", "*");

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(url, {
      headers: { "User-Agent": userAgent }
    });
    const text = await response.text();

    if (response.ok && text.trim().startsWith("{")) {
      return JSON.parse(text);
    }

    const retryable =
      response.status === 429 ||
      /too many requests|ratelimit|rate limit|maxlag/i.test(text) ||
      response.status >= 500;

    if (!retryable || attempt === 5) {
      throw new Error(
        text.trim().slice(0, 120) ||
          `Wikipedia API returned ${response.status} for ${url.searchParams.get("action")}`
      );
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const backoffMs = Number.isFinite(retryAfter)
      ? retryAfter * 1000
      : Math.min(60000, 8000 * 2 ** attempt);
    await sleep(backoffMs);
  }

  throw new Error("Wikipedia API request failed after retries");
}

function scoreSearchResult(result, player, team) {
  const title = normalizeText(result.title);
  const snippet = normalizeText(result.snippet);
  const playerName = normalizeText(player.name);
  const teamTerms = [
    normalizeText(team.name),
    normalizeText(team.officialName),
    normalizeText(team.id)
  ].filter(Boolean);

  let score = 0;
  if (title === playerName) {
    score += 30;
  }
  if (title.includes(playerName) || playerName.includes(title)) {
    score += 16;
  }
  if (title.includes("footballer") || title.includes("soccer player")) {
    score += 8;
  }
  if (snippet.includes("footballer") || snippet.includes("soccer player")) {
    score += 8;
  }
  if (snippet.includes("professional")) {
    score += 2;
  }
  if (teamTerms.some((term) => term && snippet.includes(term))) {
    score += 14;
  }
  if (teamTerms.some((term) => term && title.includes(term))) {
    score += 5;
  }
  if (
    title.includes("disambiguation") ||
    title.startsWith("list ") ||
    title.startsWith("career of ") ||
    title.startsWith("international goals ")
  ) {
    score -= 30;
  }

  return score;
}

async function searchPlayerPage(player, team) {
  if (pageTitleOverrides.has(player.name)) {
    return pageTitleOverrides.get(player.name);
  }

  const query = `${player.name} ${team.officialName || team.name} footballer`;
  const data = await wikiJson({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "5"
  });
  const results = data.query?.search || [];
  const scored = results
    .map((result) => ({ ...result, score: scoreSearchResult(result, player, team) }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.title || "";
}

async function fetchPageWikitext(title) {
  const data = await wikiJson({
    action: "query",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    titles: title
  });
  const page = data.query?.pages?.[0];
  return page?.revisions?.[0]?.slots?.main?.content || "";
}

async function fetchPageWikitextBatch(titles) {
  const data = await wikiJson({
    action: "query",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    titles: titles.join("|")
  });
  const pages = new Map();

  for (const page of data.query?.pages || []) {
    pages.set(page.title, page.revisions?.[0]?.slots?.main?.content || "");
  }

  return pages;
}

function getUniquePlayers(fixturesData, teamsById) {
  const players = new Map();

  for (const fixture of fixturesData.fixtures || []) {
    for (const side of ["home", "away"]) {
      const teamId = side === "home" ? fixture.homeTeamId : fixture.awayTeamId;
      const team = teamsById.get(teamId);
      for (const player of fixture.keyPlayers?.[side] || []) {
        if (!player?.name || !team) {
          continue;
        }

        const existing = players.get(player.name) || {
          name: player.name,
          note: player.note || "",
          team
        };
        if (!existing.note && player.note) {
          existing.note = player.note;
        }
        players.set(player.name, existing);
      }
    }
  }

  return [...players.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function buildProfile(player) {
  const title = await searchPlayerPage(player, player.team);
  if (!title) {
    return {
      name: player.name,
      teamId: player.team.id,
      skills: inferSkills(player.note),
      note: player.note,
      sourceUrl: ""
    };
  }

  await sleep(requestDelayMs);
  const wikitext = await fetchPageWikitext(title);
  const fields = getInfoboxFields(wikitext);
  const position = cleanWikiText(fields.position || "");
  const club = cleanWikiText(fields.currentclub || "") || getOpenEndedClub(fields);
  const imageUrl = getCommonsImageUrl(fields.image || "");

  return {
    name: player.name,
    displayName: cleanWikiText(fields.name || "") || title.replace(/_/g, " "),
    teamId: player.team.id,
    position,
    club,
    imageUrl,
    skills: inferSkills(player.note),
    note: player.note,
    sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`
  };
}

function buildProfileFromWikitext(player, title, wikitext) {
  if (!title || !wikitext) {
    return {
      name: player.name,
      teamId: player.team.id,
      skills: inferSkills(player.note),
      note: player.note,
      sourceUrl: title ? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}` : ""
    };
  }

  const fields = getInfoboxFields(wikitext);
  const position = cleanWikiText(fields.position || "");
  const club = cleanWikiText(fields.currentclub || "") || getOpenEndedClub(fields);
  const imageUrl = getCommonsImageUrl(fields.image || "");

  return {
    name: player.name,
    displayName: cleanWikiText(fields.name || "") || title.replace(/_/g, " "),
    teamId: player.team.id,
    position,
    club,
    imageUrl,
    skills: inferSkills(player.note),
    note: player.note,
    sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`
  };
}

const [fixturesData, teamsData] = await Promise.all([readJson(fixturesPath), readJson(teamsPath)]);
const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
const players = getUniquePlayers(fixturesData, teamsById);
const profiles = {};
const warnings = [];
const titleByPlayerName = new Map();
const wikitextByTitle = new Map();

console.log(`Finding Wikipedia pages for ${players.length} players...`);

for (const [index, player] of players.entries()) {
  try {
    const title = await searchPlayerPage(player, player.team);
    titleByPlayerName.set(player.name, title);
    console.log(`${index + 1}/${players.length} ${player.name} -> ${title || "page missing"}`);
  } catch (error) {
    warnings.push(`${player.name}: ${error.message}`);
    titleByPlayerName.set(player.name, "");
    console.log(`${index + 1}/${players.length} ${player.name} -> page failed`);
  }

  await sleep(requestDelayMs);
}

const titles = [...new Set([...titleByPlayerName.values()].filter(Boolean))];
console.log("");
console.log(`Fetching ${titles.length} profile pages in batches...`);

for (let index = 0; index < titles.length; index += 20) {
  const batch = titles.slice(index, index + 20);
  try {
    const pages = await fetchPageWikitextBatch(batch);
    for (const [title, wikitext] of pages) {
      wikitextByTitle.set(title, wikitext);
    }
    console.log(`${Math.min(index + batch.length, titles.length)}/${titles.length} pages fetched`);
  } catch (error) {
    warnings.push(`Batch starting with "${batch[0]}": ${error.message}`);
    console.log(`${Math.min(index + batch.length, titles.length)}/${titles.length} pages failed`);
  }
  await sleep(requestDelayMs);
}

console.log("");
console.log(`Building player profiles...`);

for (const [index, player] of players.entries()) {
  const title = titleByPlayerName.get(player.name) || "";
  const profile = buildProfileFromWikitext(player, title, wikitextByTitle.get(title) || "");
  profiles[player.name] = profile;
  const missing = ["position", "club", "imageUrl"].filter((key) => !profile[key]);
  if (missing.length) {
    warnings.push(`${player.name}: missing ${missing.join(", ")}`);
  }
  console.log(`${index + 1}/${players.length} ${player.name} -> ${profile.club || "club missing"}`);
}

const output = {
  updatedAt: new Date().toISOString(),
  sourceIds: ["wikipedia-football-infobox", "wikimedia-commons"],
  profiles
};

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

console.log("");
console.log(`Wrote ${path.relative(root, outputPath)}`);
console.log(`Warnings: ${warnings.length}`);
for (const warning of warnings) {
  console.log(`- ${warning}`);
}
