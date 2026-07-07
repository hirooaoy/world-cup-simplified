#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const fixturesPath = path.join(dataDir, "fixtures.json");
const lineupsPath = path.join(dataDir, "lineups.json");
const teamsPath = path.join(dataDir, "teams.json");
const outputPath = path.join(dataDir, "coach-profiles.json");
const requestDelayMs = Number(process.env.WIKI_REQUEST_DELAY_MS || 1500);
const requestMaxAttempts = Number(process.env.WIKI_REQUEST_MAX_ATTEMPTS || 5);
const wikipediaApiUrl = "https://en.wikipedia.org/w/api.php";
const userAgent = "WorldCupSimplified/0.1 (coach profile generation)";
const wikipediaSearchLimit = 6;
const fetchBatchSize = 20;
const wikiProfileSourceIds = [
  "wikipedia-coach-search",
  "wikipedia-page-summaries",
  "wikimedia-commons"
];
const COACH_PAGE_TITLE_OVERRIDES = {
  "hong myungbo": "Hong Myung-bo",
  "amir ghalehnoy": "Amir Ghalenoei",
  "z dalic": "Zlatko Dalić"
};
const COACH_STYLE_FALLBACK = ["Tactical control", "Match management", "Balanced transitions"];
const COACH_STYLE_RULES = [
  { label: "Counter-pressing", patterns: ["gegenpress", "gegen press", "gegen-press", "counter-press", "counter pressing", "counterpress"] },
  { label: "High press", patterns: ["high press", "pressing high", "pressing up", "intense pressing", "press", "pressing"] },
  { label: "Counter-attack", patterns: ["counter-attack", "counterattack", "counter attacking", "quick transition", "break quickly", "on the break"] },
  { label: "Possession control", patterns: ["possession", "ball retention", "build-up", "build up", "short passing", "keeping the ball", "control the ball", "positional play"] },
  { label: "Direct transitions", patterns: ["vertical", "verticality", "direct play", "direct style", "long ball", "quick balls", "vertical transitions"] },
  { label: "Defensive organization", patterns: ["defensive", "defence", "compact", "deep block", "back line", "defensive shape", "low block"] },
  { label: "Tactical flexibility", patterns: ["tactically flexible", "tactical flexibility", "adaptive", "adaptable", "multiple formations", "in-game", "formation switch"] },
  { label: "Set-piece focus", patterns: ["set piece", "set-piece", "dead-ball", "corner", "corners", "free-kick", "free kick"] },
  { label: "Wing overloads", patterns: ["wide", "wing", "crosses", "fullbacks", "flank", "overlaps"] },
  { label: "Youth pipeline", patterns: ["youth", "academy", "developmental", "young talent", "youth players"] },
  { label: "Attacking structure", patterns: ["attacking", "offensive", "goal threat", "penetration", "chance creation", "attack"] },
  { label: "Positional discipline", patterns: ["organization", "organisation", "organized", "organised", "disciplined", "disciplined shape"] },
  { label: "Match control", patterns: ["management", "tempo", "game control", "controlling the game", "game management"] }
];
const COACH_STYLE_OVERRIDES = {
  "graham arnold": ["Counter-attack", "High press", "Direct transitions"],
  "ralf rangnick": ["Counter-pressing", "High press", "Direct transitions"],
  "marcelo bielsa": ["High press", "Counter-pressing", "Direct transitions"],
  "thomas tuchel": ["Counter-pressing", "Possession control", "Attacking structure"],
  "didier deschamps": ["Defensive organization", "Counter-attack", "Set-piece focus"],
  "carlo ancelotti": ["Possession control", "Counter-pressing", "Defensive organization"],
  "ronald koeman": ["Set-piece focus", "Possession control", "Defensive organization"],
  "zlatko dalic": ["Counter-attack", "High press", "Defensive organization"],
  "sergej barbarez": ["Counter-pressing", "Possession control", "Attacking structure"],
  "javier aguirre": ["Counter-attack", "Defensive organization", "Attacking structure"],
  "hugo broos": ["Defensive organization", "Counter-attack", "Set-piece focus"],
  "hong myungbo": ["Defensive organization", "Counter-pressing", "Counter-attack"],
  "miroslav koubek": ["Counter-pressing", "Defensive organization", "Counter-attack"],
  "jesse marsch": ["Counter-pressing", "High press", "Direct transitions"],
  "mauricio pochettino": ["High press", "Positional discipline", "Youth pipeline"],
  "gustavo alfaro": ["Counter-attack", "Set-piece focus", "Defensive organization"],
  "murat yakin": ["Defensive organization", "Counter-attack", "Set-piece focus"],
  "julen lopetegui": ["Possession control", "Counter-pressing", "Set-piece focus"],
  "mohamed ouahbi": ["Youth pipeline", "Defensive organization", "Counter-pressing"],
  "sebastien migne": ["Defensive organization", "Set-piece focus", "Counter-attack"],
  "steve clarke": ["Defensive organization", "Counter-attack", "Set-piece focus"],
  "tony popovic": ["Defensive organization", "Counter-pressing", "Direct transitions"],
  "vincenzo montella": ["Attacking structure", "Possession control", "High press"],
  "julian nagelsmann": ["High press", "Counter-pressing", "Possession control"],
  "dick advocaat": ["Defensive organization", "Counter-pressing", "Set-piece focus"],
  "hajime moriyasu": ["Possession control", "Counter-attack", "Direct transitions"],
  "emerse fae": ["Counter-attack", "Defensive organization", "Set-piece focus"],
  "sebastian beccacece": ["Attacking structure", "Possession control", "High press"],
  "graham potter": ["Possession control", "Attacking structure", "Wing overloads"],
  "sabri lamouchi": ["Counter-pressing", "Possession control", "Direct transitions"],
  "luis de la fuente": ["Youth pipeline", "Possession control", "Defensive organization"],
  "bubista": ["Defensive organization", "Counter-attack", "Set-piece focus"],
  "rudi garcia": ["Attacking structure", "Possession control", "High press"],
  "hossam hassan": ["Counter-attack", "Defensive organization", "Set-piece focus"],
  "georgios donis": ["Wing overloads", "Attacking structure", "Possession control"],
  "amir ghalehnoy": ["Counter-pressing", "Defensive organization", "Counter-attack"],
  "darren bazeley": ["Counter-pressing", "Positional discipline", "Set-piece focus"],
  "pape thiaw": ["Attacking structure", "Direct transitions", "Counter-attack"],
  "lionel scaloni": ["Possession control", "Counter-pressing", "Attacking structure"],
  "vladimir petkovic": ["Defensive organization", "Counter-pressing", "Set-piece focus"],
  "jamal sellami": ["Defensive organization", "Counter-attack", "Counter-pressing"],
  "stale solbakken": ["Counter-attack", "Direct transitions", "Defensive organization"],
  "sebastien desabre": ["Counter-attack", "Direct transitions", "High press"],
  "carlos queiroz": ["Defensive organization", "Counter-pressing", "Counter-attack"],
  "thomas christiansen": ["Attacking structure", "Direct transitions", "Counter-attack"],
  "nestor lorenzo": ["Defensive organization", "Counter-pressing", "Counter-attack"],
  "herve renard": ["Defensive organization", "Set-piece focus", "Counter-pressing"],
  "roberto martinez": ["Defensive organization", "Counter-attack", "Set-piece focus"],
  "fabio cannavaro": ["Defensive organization", "Set-piece focus", "Counter-attack"],
  "z dalic": ["Counter-pressing", "Defensive organization", "Counter-attack"]
};

function getCoachStyleOverrides(coachName = "") {
  return COACH_STYLE_OVERRIDES[normalizeText(coachName)] || null;
}

function normalizeStyleText(value) {
  return cleanWikiText(value).toLowerCase();
}

function inferCoachStyles(profileText = "", fields = {}, coachName = "") {
  const overrideStyles = getCoachStyleOverrides(coachName);
  if (overrideStyles?.length) {
    return [...new Set(overrideStyles)].slice(0, 3);
  }

  const styleFieldText = [
    fields["style"] || "",
    fields["style of play"] || "",
    fields["playing style"] || "",
    fields["managerial style"] || "",
    fields["tactical philosophy"] || "",
    fields["tactics"] || ""
  ]
    .map((item) => normalizeStyleText(item))
    .join(" ");

  const sourceText = [normalizeStyleText(profileText), styleFieldText]
    .join(" ")
    .replace(/[^a-z0-9\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const scores = COACH_STYLE_RULES
    .map(({ label, patterns }) => {
      let score = 0;
      for (const rawPattern of patterns) {
        const escaped = rawPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "g");
        const matches = sourceText.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      return { label, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

  const styles = [];
  const seen = new Set();
  for (const { label } of scores) {
    const key = label.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    styles.push(label);
    if (styles.length >= 3) {
      break;
    }
  }

  if (styles.length >= 2) {
    return styles;
  }

  for (const { label, patterns } of COACH_STYLE_RULES) {
    if (styles.includes(label)) {
      continue;
    }

    const hits = patterns.some((pattern) => {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${escaped}\\b`, "i").test(sourceText);
    });
    if (hits) {
      const key = label.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        styles.push(label);
      }
      if (styles.length >= 3) {
        break;
      }
    }
  }

  const fallback = [...COACH_STYLE_FALLBACK];
  for (const label of fallback) {
    const lower = label.toLowerCase();
    if (!seen.has(lower)) {
      styles.push(label);
      seen.add(lower);
      if (styles.length >= 3) {
        break;
      }
    }
  }

  return styles.slice(0, 3);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function encodePageTitle(title) {
  return encodeURIComponent(String(title || "").replace(/ /g, "_"));
}

async function readJson(filePath, fallback = null) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function loadJson(filePath, fallback = null) {
  try {
    return await readJson(filePath, fallback);
  } catch (error) {
    if (fallback !== null) {
      return fallback;
    }
    throw error;
  }
}

async function wikiJson(params, attempt = 0) {
  const url = new URL(wikipediaApiUrl);
  for (const [key, value] of Object.entries({ format: "json", origin: "*", ...params })) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": userAgent
    }
  });

  const text = await response.text();
  let data = null;
  try {
    data = text.trim() ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (response.ok && data && typeof data === "object") {
    return data;
  }

  const retryable = response.status === 429 || response.status >= 500;
  if (!retryable || attempt >= requestMaxAttempts) {
    throw new Error(
      `Wikipedia API failed (status ${response.status}): ${String(text).slice(0, 200) || "empty response"}`
    );
  }

  const retryAfter = Number(response.headers.get("retry-after"));
  const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : Math.min(60000, 8000 * 2 ** attempt);
  await sleep(delay);
  return wikiJson(params, attempt + 1);
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
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
      if (["nowrap", "nobold", "small", "ubl", "unbulleted list", "plainlist"].includes(name)) {
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
  const start = wikitext.search(/\{\{Infobox /i);
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

function getCommonsImageUrl(fileName) {
  const cleaned = cleanWikiText(fileName);
  if (!cleaned || /^yes$/i.test(cleaned)) {
    return "";
  }

  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(cleaned)}?width=160`;
}

function parseCoachBirthDate(value = "") {
  const source = String(value || "");
  const templateMatch = source.match(
    /\{\{\s*(?:birth date and age|birth date|birth-date and age|birth-date)\s*(?:\|\s*df\s*=\s*y)?\s*\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/i
  );
  if (templateMatch) {
    return [
      templateMatch[1],
      templateMatch[2].padStart(2, "0"),
      templateMatch[3].padStart(2, "0")
    ].join("-");
  }

  const textMatch = cleanWikiText(source).match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!textMatch) {
    return "";
  }

  const months = new Map(
    [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december"
    ].map((month, index) => [month, String(index + 1).padStart(2, "0")])
  );
  const month = months.get(textMatch[2].toLowerCase());
  return month ? [textMatch[3], month, textMatch[1].padStart(2, "0")].join("-") : "";
}

function scoreSearchResult(result, name, teamName) {
  const resultTitle = normalizeText(result.title);
  const snippet = normalizeText(result.snippet);
  const coachName = normalizeText(name);
  const teamTerms = normalizeText(teamName).split(" ").filter(Boolean);

  let score = 0;
  if (resultTitle === coachName) {
    score += 35;
  }
  if (resultTitle.includes(coachName) || coachName.includes(resultTitle)) {
    score += 20;
  }
  if (resultTitle.includes("coach") || snippet.includes("coach") || snippet.includes("manager")) {
    score += 12;
  }
  if (teamTerms.some((term) => term.length > 2 && snippet.includes(term))) {
    score += 10;
  }

  if (
    resultTitle.includes("list ") ||
    resultTitle.includes("career of ") ||
    resultTitle.includes("disambiguation") ||
    resultTitle.includes("statistics of ")
  ) {
    score -= 30;
  }

  return score;
}

async function searchCoachPage(coach, teamName) {
  const override = COACH_PAGE_TITLE_OVERRIDES[normalizeText(coach)];
  if (override) {
    return override;
  }

  const query = `${coach} ${teamName || ""} football coach`.trim();
  const data = await wikiJson({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: String(wikipediaSearchLimit)
  });
  const results = Array.isArray(data?.query?.search) ? data.query.search : [];
  const scored = results
    .map((result) => ({ ...result, score: scoreSearchResult(result, coach, teamName) }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.title || "";
}

async function fetchPageDataBatch(titles) {
  const data = await wikiJson({
    action: "query",
    prop: "revisions|extracts|pageimages",
    redirects: "1",
    exintro: "1",
    explaintext: "1",
    rvprop: "content",
    rvslots: "main",
    pithumbsize: "160",
    piprop: "thumbnail",
    titles: titles.join("|")
  });

  const pages = new Map();
  const rawPages = data.query?.pages;
  const pageList = Array.isArray(rawPages)
    ? rawPages
    : rawPages && typeof rawPages === "object"
      ? Object.values(rawPages)
      : [];

  const redirectTargets = new Map(
    (data.query?.redirects || []).map((redirect) => [redirect.from, redirect.to])
  );

  for (const page of pageList) {
    pages.set(page.title, {
      extract: page.extract || "",
      wikitext: page.revisions?.[0]?.slots?.main?.content || "",
      thumbnail: page.thumbnail?.source || ""
    });
  }

  for (const [from, to] of redirectTargets) {
    if (pages.has(to)) {
      pages.set(from, pages.get(to));
    }
  }

  return pages;
}

function getLineupCoachCandidates(fixturesData, lineupsData, teamsById) {
  const seen = new Set();
  const candidates = [];

  const fixtures = Array.isArray(fixturesData?.fixtures) ? fixturesData.fixtures : [];
  const lineups = lineupsData?.lineups || {};

  for (const fixture of fixtures) {
    const teamIdHome = String(fixture?.homeTeamId || "").trim().toUpperCase();
    const teamIdAway = String(fixture?.awayTeamId || "").trim().toUpperCase();
    const lineup = lineups[fixture?.id] || {};
    const homeCoach = lineup?.home?.coach?.name;
    const awayCoach = lineup?.away?.coach?.name;

    if (homeCoach) {
      const teamName = teamsById.get(teamIdHome)?.name || "";
      const key = `${teamIdHome}||${normalizeText(homeCoach)}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({ name: homeCoach, teamId: teamIdHome, teamName });
      }
    }

    if (awayCoach) {
      const teamName = teamsById.get(teamIdAway)?.name || "";
      const key = `${teamIdAway}||${normalizeText(awayCoach)}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({ name: awayCoach, teamId: teamIdAway, teamName });
      }
    }
  }

  return candidates;
}

function buildCoachProfile(candidate, existingProfile = {}, title, pageData = {}) {
  const normalizedExistingImage = existingProfile.imageUrl || "";
  const fields = getInfoboxFields(pageData.wikitext || "");
  const styles = inferCoachStyles(pageData.extract, fields, existingProfile.name || candidate.name);
  const infoboxImage = getCommonsImageUrl(fields.image || fields.manager || fields.coach || "");
  const imageUrl = infoboxImage || pageData.thumbnail || normalizedExistingImage;
  const sourceUrl = existingProfile.sourceUrl || (title ? `https://en.wikipedia.org/wiki/${encodePageTitle(title)}` : "");
  const birthDate = existingProfile.birthDate || parseCoachBirthDate(fields.birth_date || fields["birth date"] || "");

  return {
    ...existingProfile,
    name: candidate.name,
    teamId: candidate.teamId,
    teamName: existingProfile.teamName || candidate.teamName || "",
    ...(imageUrl ? { imageUrl } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(birthDate ? { birthDate } : {}),
    ...(styles ? { styles } : {})
  };
}

(async () => {
  const fixturesData = await loadJson(fixturesPath);
  const lineupsData = await loadJson(lineupsPath, { lineups: {} });
  const teamsData = await loadJson(teamsPath);
  const existingProfilesData = await loadJson(outputPath, { profiles: {}, sourceIds: [] });
  const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
  const existingProfiles = existingProfilesData.profiles || {};
  const candidates = getLineupCoachCandidates(fixturesData, lineupsData, teamsById);

  if (!candidates.length) {
    console.log("No lineup coaches found; coach profile file will stay unchanged.");
    return;
  }

  console.log(`Searching ${candidates.length} coach pages...`);
  const titleByCoach = new Map();
  for (const [index, candidate] of candidates.entries()) {
    const cachedTitle = existingProfiles[candidate.name]?.sourceUrl?.split("/wiki/")[1]
      ? decodeURIComponent(existingProfiles[candidate.name].sourceUrl.split("/wiki/")[1])
      : "";
    if (cachedTitle) {
      titleByCoach.set(candidate.name, cachedTitle.replace(/_/g, " "));
      continue;
    }

    const title = await searchCoachPage(candidate.name, candidate.teamName);
    titleByCoach.set(candidate.name, title);
    console.log(`${index + 1}/${candidates.length} ${candidate.name} -> ${title || "page not found"}`);
    await sleep(requestDelayMs);
  }

  const uniqueTitles = [...new Set(titleByCoach.values())].filter(Boolean);
  const pageDataByTitle = new Map();
  console.log(`Fetching ${uniqueTitles.length} wikipedia pages...`);
  for (let index = 0; index < uniqueTitles.length; index += fetchBatchSize) {
    const batch = uniqueTitles.slice(index, index + fetchBatchSize);
    const pages = await fetchPageDataBatch(batch);
    for (const [title, pageData] of pages) {
      pageDataByTitle.set(title, pageData);
    }
    console.log(`${Math.min(index + batch.length, uniqueTitles.length)}/${uniqueTitles.length} pages fetched`);
    await sleep(requestDelayMs);
  }

  const profiles = { ...existingProfiles };
  for (const candidate of candidates) {
    const title = titleByCoach.get(candidate.name) || "";
    const existingProfile = existingProfiles[candidate.name] || {};
    const pageData = pageDataByTitle.get(title) || {};
    profiles[candidate.name] = buildCoachProfile(candidate, existingProfile, title, pageData);
  }

  const next = {
    updatedAt: new Date().toISOString(),
    sourceIds: [...new Set([...wikiProfileSourceIds, ...(existingProfilesData.sourceIds || [])])],
    profiles
  };

  await writeFile(outputPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Wrote ${path.relative(root, outputPath)}`);
  console.log(`Profiles updated: ${candidates.length}`);
  console.log(`Generated image URLs: ${Object.values(profiles).filter((entry) => entry?.imageUrl).length}`);
})(); 
