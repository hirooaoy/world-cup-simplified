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
  ["Ali Olwan", "Ali Olwan"],
  ["Ayoub El Kaabi", "Ayoub El Kaabi"],
  ["Brahim Diaz", "Brahim Díaz"],
  ["Chris Wood", "Chris Wood (footballer, born 1991)"],
  ["Cristiano Ronaldo", "Cristiano Ronaldo"],
  ["Daichi Kamada", "Daichi Kamada"],
  ["Evann Guessand", "Evann Guessand"],
  ["Ismael Diaz", "Ismael Díaz (footballer, born 1997)"],
  ["Konrad Laimer", "Konrad Laimer"],
  ["Leandro Trossard", "Leandro Trossard"],
  ["Luis Chavez", "Luis Chávez (footballer)"],
  ["Luis Diaz", "Luis Díaz (footballer, born 1997)"],
  ["Luis Suarez", "Luis Suárez (footballer, born 1997)"],
  ["Martin Odegaard", "Martin Ødegaard"],
  ["Mousa Al-Taamari", "Musa Al-Taamari"],
  ["Neymar", "Neymar"],
  ["Ritsu Doan", "Ritsu Dōan"],
  ["Roberto Lopes", "Roberto Lopes (footballer, born 1992)"],
  ["Tahith Chong", "Tahith Chong"],
  ["Teboho Mokoena", "Teboho Mokoena"],
  ["Yasin Ayari", "Yasin Ayari"]
]);
const profileFieldOverrides = {
  "Adalberto Carrasquilla": {
    imageUrl: "https://assets.sorare.com/playerpicture/5c665510-6358-445f-8cee-f1580e299661/picture/avatar-0d77a3aa9a930def1134beb8eca6f2e0.png"
  },
  "Ali Jasim": {
    imageUrl: "https://resources.saudi-pro-league.pulselive.com/saudi-pro-league/photo/2025/11/13/287545ca-8c56-428c-81ba-cb4620bb94c8/05c43886-bdda-4649-a88b-b22c4eac68af________.jpg"
  },
  "Ali Olwan": { club: "Al Sailiya SC" },
  "Amine Gouiri": {
    imageUrl: "https://assets.sorare.com/playerpicture/3f3077b9-e071-425a-bf5d-d6f4b5797192/picture/avatar-8e78185244d819fa519a4964d757da5d.png"
  },
  "Ayoub El Kaabi": { club: "Olympiacos" },
  "Brahim Diaz": { club: "Real Madrid" },
  "Chris Wood": {
    imageUrl: "https://assets.sorare.com/playerpicture/55068de4-3ec7-4111-bc72-04acadd6271b/avatar-chris-wood_new-zealand_football_2025_home_card_edition_name%3Dcolors_holo_base.png"
  },
  "Christian Volpato": {
    imageUrl: "https://romapress.net/wp-content/uploads/2023/07/Volpato-Christian_sassuolo.jpg"
  },
  "Esmir Bajraktarevic": {
    imageUrl: "https://media.reprezentacija.ba/2025/01/esmir-bajraktarevic-psv-1200x800.jpg"
  },
  "Evann Guessand": { club: "Crystal Palace" },
  "Frantzdy Pierrot": {
    imageUrl: "https://www.eaguingamp.com/voy_content/uploads/2020/09/frantzdy-pierrot.png"
  },
  "Homam Ahmed": {
    imageUrl: "https://assets.sorare.com/player/9f4c177b-3447-4eab-8275-03ca450574f0/picture/avatar-1d48558ecaadf12ea98960c37ae7d9d4.png"
  },
  "Ismael Diaz": {
    imageUrl: "https://imagenes.primicias.ec/files/og_thumbnail/uploads/2024/05/25/665295a4a90f8.jpeg"
  },
  "James Rodriguez": { club: "Minnesota United" },
  "Jean-Ricner Bellegarde": {
    imageUrl: "https://assets.sorare.com/playerpicture/563dce7e-7150-4db5-acd0-166ab7f619ee/picture/avatar-dbb7b5dc63acbb97714f8946e94f05de.png"
  },
  "Daichi Kamada": { club: "Crystal Palace" },
  "Kenan Yildiz": {
    position: "Attacking midfielder, winger",
    imageUrl: "https://www.juventus.com/images/image/private/t_portrait_tablet_desktop/f_png/dev/qwsdrvbuik2f2d7q1qcf.png"
  },
  "Lamine Yamal": {
    imageUrl: "https://assets.sorare.com/playerpicture/c8dd7fff-b3bc-4e8e-a199-99ddaeacaf0a/picture/avatar-44bdd68923075c1703d3b4241f082bb4.png"
  },
  "Konrad Laimer": { club: "Bayern Munich" },
  "Leandro Bacuna": {
    imageUrl: "https://assets.sorare.com/playerpicture/dff6b137-2d96-485d-9e6b-9a98f34031ab/picture/avatar-09b13e7e02f8289016e9f98ff71d4c7a.png"
  },
  "Leandro Trossard": { club: "Arsenal" },
  "Luis Suarez": {
    imageUrl: "https://assets.sorare.com/playerpicture/f945c83f-4b62-4d89-8a50-4408abefa6b7/picture/avatar-a920b0effd55be927d6b9b0a19d85061.png"
  },
  "Mohammed Al-Owais": {
    imageUrl: "https://static-files.saudi-pro-league.pulselive.com/players/headshot/p153885.png"
  },
  "Noah Sadiki": {
    imageUrl: "https://assets.sorare.com/playerpicture/a862377c-35dc-42f1-b2bf-9b1d67677f15/picture/avatar-b5c2d5aee9242262172f9b052897cd41.png"
  },
  "Noor Al-Rawabdeh": {
    imageUrl: "https://assets.selangorfc.com/images/players/t_4607862961048618.%20NOOR%20AL-RAWABDEH.PNG"
  },
  Pedri: {
    imageUrl: "https://assets.sorare.com/playerpicture/2a201362-28b2-46f3-b775-3b46655a89d6/picture/avatar-77add04ba37e6223eb5f2fff5b5aa2e5.png"
  },
  "Ronwen Williams": {
    imageUrl: "https://sundownsfc.co.za/wp-content/uploads/2025/09/Williams-1.jpg"
  },
  "Ritsu Doan": { club: "Eintracht Frankfurt" },
  "Ryan Mendes": {
    imageUrl: "https://assets.sorare.com/playerpicture/19e5f623-11d5-4cb7-b305-610eaf822599/picture/avatar-ed0ebe5f0ea84b8710b99b5ec23451c0.png"
  },
  "Sadio Mane": {
    imageUrl: "https://static-files.saudi-pro-league.pulselive.com/players/headshot/p110979.png"
  },
  "Salem Al-Dawsari": {
    imageUrl: "https://static-files.saudi-pro-league.pulselive.com/players/headshot/p109763.png"
  },
  "Sarpreet Singh": {
    imageUrl: "https://assets.sorare.com/playerpicture/5657430a-5e7f-4308-9a11-96b78a856c52/picture/avatar-2ec9453bc6a55005cefb6a3d193422e6.png"
  },
  "Tahith Chong": { club: "Sheffield United" },
  "Teboho Mokoena": {
    position: "Midfielder",
    club: "Mamelodi Sundowns",
    imageUrl: "https://sundownsfc.co.za/wp-content/uploads/2025/09/Mokoena-1.jpg"
  },
  "Tomas Soucek": {
    imageUrl: "https://assets.sorare.com/playerpicture/79be9611-63e4-4e00-8052-ff2d3825e916/picture/avatar-24c525970580228cb644fcbb1c646cc2.png"
  },
  Vozinha: {
    club: "G.D. Chaves",
    imageUrl: "https://i0.statig.com.br/bancodeimagens/2n/0q/4s/2n0q4syuxijl44exjduci4s7k.jpg"
  },
  "Yoane Wissa": {
    imageUrl: "https://assets.sorare.com/playerpicture/daf7c63d-e2c2-4ef3-ada9-8fcc2951029a/picture/avatar-8dbbfde85f2c3e796388dccc9cb63dad.png"
  },
  "Yasin Ayari": { club: "Brighton & Hove Albion" }
};
const clubLeagueOverrides = {
  "AC Milan": "Serie A",
  "Ajax Amateurs": "Vierde Divisie",
  "Al Hilal": "Saudi Pro League",
  "Al Sadd": "Qatar Stars League",
  "Al-Ahli": "Saudi Pro League",
  "Al-Arabi": "Qatar Stars League",
  "Al-Duhail": "Qatar Stars League",
  "Al-Hilal": "Saudi Pro League",
  "Al-Ittihad": "Saudi Pro League",
  "Al-Karma": "Iraq Stars League",
  "Al-Najma": "Saudi First Division League",
  "Al-Nassr": "Saudi Pro League",
  "Al-Ula": "Saudi First Division League",
  Arsenal: "Premier League",
  "Aston Villa": "Premier League",
  Atalanta: "Serie A",
  "Athletic Bilbao": "La Liga",
  "Atlanta United": "Major League Soccer",
  "Atlético Madrid": "La Liga",
  Barcelona: "La Liga",
  "Bayer Leverkusen": "Bundesliga",
  "Bayern Munich": "Bundesliga",
  Beşiktaş: "Süper Lig",
  "Borussia Dortmund": "Bundesliga",
  Bournemouth: "Premier League",
  "Brighton & Hove Albion": "Premier League",
  Burnley: "EFL Championship",
  Chelsea: "Premier League",
  "Cultural Leonesa": "Segunda División",
  "Dender EH": "Belgian Pro League",
  "Dinamo Zagreb": "Croatian Football League",
  "Dynamo Moscow": "Russian Premier League",
  "Eintracht Frankfurt": "Bundesliga",
  Esteghlal: "Persian Gulf Pro League",
  "FC St. Pauli": "Bundesliga",
  Fenerbahçe: "Süper Lig",
  "G.D. Chaves": "Liga Portugal 2",
  "Hannover 96": "2. Bundesliga",
  "Inter Milan": "Serie A",
  Iğdır: "TFF First League",
  "Iğdır FK": "TFF First League",
  Juventus: "Serie A",
  "Leicester City": "EFL Championship",
  Levante: "La Liga",
  León: "Liga MX",
  Liverpool: "Premier League",
  "Los Angeles": "Major League Soccer",
  "Los Angeles FC": "Major League Soccer",
  "Mamelodi Sundowns": "South African Premiership",
  "Manchester City": "Premier League",
  "Manchester United": "Premier League",
  Marseille: "Ligue 1",
  "Minnesota United": "Major League Soccer",
  Monaco: "Ligue 1",
  Nantes: "Ligue 1",
  Napoli: "Serie A",
  "Newcastle United": "Premier League",
  "Nottingham Forest": "Premier League",
  Olympiacos: "Super League Greece",
  PSV: "Eredivisie",
  Pachuca: "Liga MX",
  Palmeiras: "Campeonato Brasileiro Série A",
  "Paris Saint-Germain": "Ligue 1",
  "Pumas UNAM": "Liga MX",
  "RB Leipzig": "Bundesliga",
  "Real Madrid": "La Liga",
  "Real Sociedad": "La Liga",
  Rennes: "Ligue 1",
  Santos: "Campeonato Brasileiro Série A",
  Sassuolo: "Serie A",
  "Schalke 04": "2. Bundesliga",
  Selangor: "Malaysia Super League",
  "Shabab Al Ahli": "UAE Pro League",
  "Shamrock Rovers": "League of Ireland Premier Division",
  "Sporting CP": "Primeira Liga",
  Strasbourg: "Ligue 1",
  Sunderland: "Premier League",
  "TSG Hoffenheim": "Bundesliga",
  "Thep Xanh Nam Dinh FC": "V.League 1",
  "Tottenham Hotspur": "Premier League",
  Utrecht: "Eredivisie",
  Volendam: "Eredivisie",
  "Wellington Phoenix": "A-League Men",
  "West Ham United": "Premier League",
  "Wolverhampton Wanderers": "Premier League",
  Wrexham: "EFL Championship",
  "Wydad AC": "Botola Pro",
  "Çaykur Rizespor": "Süper Lig",
  "İstanbul Başakşehir": "Süper Lig"
};

const skillRules = [
  ["goalkeeper|shot-stopper|saves?|keeper", "Shot-stopping"],
  ["set-piece|set piece|dead-ball|dead ball|restart", "Set pieces"],
  ["aerial|crosses|crossing|second balls|box", "Box presence"],
  ["finisher|finishing|striker|scorer|penalty-box|goal", "Finishing"],
  ["creative|creator|invention|final passes|connects|orchestrator|spark", "Chance creation"],
  ["connect|connector|combine|link|first pass", "Link-up play"],
  ["tempo|control|rhythm|dictate|passing|stabilizer|balance|midfield", "Midfield control"],
  ["direct|behind|space|runner|runs|pace|speed", "Runs in behind"],
  ["channel|drift|mobile|movement|arrives late", "Movement"],
  ["wide|width|winger|stretch", "Wide threat"],
  ["press|pressure|counter-press", "Pressing"],
  ["ball-winning|duels?", "Ball winning"],
  ["defensive|defender|shield|anchor|organizer|back line|screen|compact|security|stopping counters|killing counters", "Defensive control"],
  ["ball-carrier|carries|carry|dribble|surges|outlet|serve early", "Ball carrying"],
  ["long-range|long range|left-footed|left footed", "Long-range shooting"],
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
      if (
        ["nowrap", "nobold", "small", "ubl", "unbulleted list", "plainlist"].includes(name)
      ) {
        return parts.slice(1).join(", ");
      }
      if (name === "post-nominals" || name === "postnominals") {
        return "";
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
    .replace(/\[\[|\]\]/g, "")
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
  const start = wikitext.search(/\{\{Infobox (?:football biography|footballer)/i);
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

function getTitleFromSourceUrl(sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    const title = decodeURIComponent(url.pathname.split("/wiki/")[1] || "");
    return title.replace(/_/g, " ");
  } catch {
    return "";
  }
}

function getBaseClubName(club) {
  return String(club || "").replace(/\s+\(on loan from .+\)$/i, "").trim();
}

function getLeagueForClub(club) {
  return clubLeagueOverrides[club] || clubLeagueOverrides[getBaseClubName(club)] || "";
}

function getUniformNumberOverride(player, overrides = {}) {
  const value = overrides.uniformNumber ?? existingProfilesData.profiles?.[player.name]?.uniformNumber;
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function inferSkills(note) {
  const lower = normalizeText(note);
  const skills = [];

  for (const [pattern, label] of skillRules) {
    if (new RegExp(pattern, "i").test(lower) && !skills.includes(label)) {
      skills.push(label);
    }
  }

  return (skills.length ? skills : ["Match impact"]).slice(0, 4);
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
    redirects: "1",
    rvprop: "content",
    rvslots: "main",
    titles: titles.join("|")
  });
  const pages = new Map();
  const redirectTargets = new Map(
    (data.query?.redirects || []).map((redirect) => [redirect.from, redirect.to])
  );

  for (const page of data.query?.pages || []) {
    pages.set(page.title, page.revisions?.[0]?.slots?.main?.content || "");
  }

  for (const [from, to] of redirectTargets) {
    if (pages.has(to)) {
      pages.set(from, pages.get(to));
    }
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
    const overrides = profileFieldOverrides[player.name] || {};

    return {
      name: player.name,
      teamId: player.team.id,
      uniformNumber: getUniformNumberOverride(player, overrides),
      skills: inferSkills(player.note),
      note: player.note,
      sourceUrl: ""
    };
  }

  await sleep(requestDelayMs);
  const wikitext = await fetchPageWikitext(title);
  const fields = getInfoboxFields(wikitext);
  const overrides = profileFieldOverrides[player.name] || {};
  const position = cleanWikiText(fields.position || "");
  const club = cleanWikiText(fields.currentclub || "") || getOpenEndedClub(fields);
  const imageUrl = getCommonsImageUrl(fields.image || "");
  const profileClub = overrides.club || club;

  return {
    name: player.name,
    displayName: cleanWikiText(fields.name || "") || title.replace(/_/g, " "),
    teamId: player.team.id,
    position: overrides.position || position,
    club: profileClub,
    league: overrides.league || getLeagueForClub(profileClub),
    uniformNumber: getUniformNumberOverride(player, overrides),
    imageUrl: overrides.imageUrl || imageUrl,
    skills: inferSkills(player.note),
    note: player.note,
    sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`
  };
}

function buildProfileFromWikitext(player, title, wikitext) {
  if (!title || !wikitext) {
    const overrides = profileFieldOverrides[player.name] || {};

    return {
      name: player.name,
      teamId: player.team.id,
      uniformNumber: getUniformNumberOverride(player, overrides),
      skills: inferSkills(player.note),
      note: player.note,
      sourceUrl: title ? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}` : ""
    };
  }

  const fields = getInfoboxFields(wikitext);
  const overrides = profileFieldOverrides[player.name] || {};
  const position = cleanWikiText(fields.position || "");
  const club = cleanWikiText(fields.currentclub || "") || getOpenEndedClub(fields);
  const imageUrl = getCommonsImageUrl(fields.image || "");
  const profileClub = overrides.club || club;

  return {
    name: player.name,
    displayName: cleanWikiText(fields.name || "") || title.replace(/_/g, " "),
    teamId: player.team.id,
    position: overrides.position || position,
    club: profileClub,
    league: overrides.league || getLeagueForClub(profileClub),
    uniformNumber: getUniformNumberOverride(player, overrides),
    imageUrl: overrides.imageUrl || imageUrl,
    skills: inferSkills(player.note),
    note: player.note,
    sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`
  };
}

const [fixturesData, teamsData] = await Promise.all([readJson(fixturesPath), readJson(teamsPath)]);
const existingProfilesData = await readJson(outputPath).catch(() => ({ profiles: {} }));
const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
const players = getUniquePlayers(fixturesData, teamsById);
const profiles = {};
const warnings = [];
const titleByPlayerName = new Map();
const wikitextByTitle = new Map();

console.log(`Finding Wikipedia pages for ${players.length} players...`);

for (const [index, player] of players.entries()) {
  try {
    const title =
      pageTitleOverrides.get(player.name) ||
      getTitleFromSourceUrl(existingProfilesData.profiles?.[player.name]?.sourceUrl) ||
      (await searchPlayerPage(player, player.team));
    titleByPlayerName.set(player.name, title);
    console.log(`${index + 1}/${players.length} ${player.name} -> ${title || "page missing"}`);
    if (title === pageTitleOverrides.get(player.name) || existingProfilesData.profiles?.[player.name]?.sourceUrl) {
      continue;
    }
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
  sourceIds: ["wikipedia-football-infobox", "wikimedia-commons", "fifa-squad-list-2026-06-21"],
  profiles
};

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

console.log("");
console.log(`Wrote ${path.relative(root, outputPath)}`);
console.log(`Warnings: ${warnings.length}`);
for (const warning of warnings) {
  console.log(`- ${warning}`);
}
