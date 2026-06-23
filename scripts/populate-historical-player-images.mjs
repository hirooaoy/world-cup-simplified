#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isPlayerNameMatch, normalizePlayerName } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const historicalProfilesPath = path.join(dataDir, "historical-player-profiles.json");
const currentProfilesPath = path.join(dataDir, "player-profiles.json");
const wikipediaApiUrl = "https://en.wikipedia.org/w/api.php";
const commonsSourceId = "wikimedia-commons";
const wikipediaSummarySourceId = "wikipedia-page-summaries";
const inheritedImageSource = "current-player-profile";
const requestDelayMs = Number(process.env.HISTORICAL_IMAGE_REQUEST_DELAY_MS || 100);
const lookupLimit = Number(process.env.HISTORICAL_IMAGE_LOOKUP_LIMIT || 0);
const dryRun = process.argv.includes("--dry-run");
const allWikimediaLookup = process.argv.includes("--all") || process.env.HISTORICAL_IMAGE_CURATED_ONLY === "0";
const curatedOnly = !allWikimediaLookup;
const apiUserAgent = "WorldCupSimplified/0.1 (local historical player image enrichment)";

const curatedTitleOverrides = new Map(
  [
    ["Pelé", "Pelé"],
    ["Pele", "Pelé"],
    ["Diego Maradona", "Diego Maradona"],
    ["Garrincha", "Garrincha"],
    ["Just Fontaine", "Just Fontaine"],
    ["Ronaldo", "Ronaldo (Brazilian footballer)"],
    ["Gerd Müller", "Gerd Müller"],
    ["Miroslav Klose", "Miroslav Klose"],
    ["Zinedine Zidane", "Zinedine Zidane"],
    ["Franz Beckenbauer", "Franz Beckenbauer"],
    ["Johan Cruyff", "Johan Cruyff"],
    ["Paolo Rossi", "Paolo Rossi"],
    ["Roberto Baggio", "Roberto Baggio"],
    ["Romário", "Romário"],
    ["Rivaldo", "Rivaldo"],
    ["Ronaldinho", "Ronaldinho"],
    ["Cafu", "Cafu"],
    ["Roberto Carlos", "Roberto Carlos"],
    ["Carlos Alberto", "Carlos Alberto Torres"],
    ["Jairzinho", "Jairzinho"],
    ["Mario Kempes", "Mario Kempes"],
    ["Lothar Matthäus", "Lothar Matthäus"],
    ["Gary Lineker", "Gary Lineker"],
    ["Bobby Charlton", "Bobby Charlton"],
    ["Geoff Hurst", "Geoff Hurst"],
    ["Ferenc Puskás", "Ferenc Puskás"],
    ["Sándor Kocsis", "Sándor Kocsis"],
    ["Sandor Kocsis", "Sándor Kocsis"],
    ["Eusébio", "Eusébio"],
    ["Eusebio", "Eusébio"],
    ["Michel Platini", "Michel Platini"],
    ["Dino Zoff", "Dino Zoff"],
    ["Lev Yashin", "Lev Yashin"],
    ["Gordon Banks", "Gordon Banks"],
    ["Diego Forlán", "Diego Forlán"],
    ["Davor Šuker", "Davor Šuker"],
    ["Hristo Stoichkov", "Hristo Stoichkov"],
    ["Roger Milla", "Roger Milla"],
    ["Zico", "Zico"],
    ["Sócrates", "Sócrates"],
    ["Socrates", "Sócrates"],
    ["Paolo Maldini", "Paolo Maldini"],
    ["Fabio Cannavaro", "Fabio Cannavaro"],
    ["Andrea Pirlo", "Andrea Pirlo"],
    ["Gianluigi Buffon", "Gianluigi Buffon"],
    ["Thierry Henry", "Thierry Henry"],
    ["Andrés Iniesta", "Andrés Iniesta"],
    ["Andres Iniesta", "Andrés Iniesta"],
    ["Xavi", "Xavi"],
    ["Carles Puyol", "Carles Puyol"],
    ["David Villa", "David Villa"],
    ["Iker Casillas", "Iker Casillas"],
    ["Thomas Müller", "Thomas Müller"],
    ["Philipp Lahm", "Philipp Lahm"],
    ["Bastian Schweinsteiger", "Bastian Schweinsteiger"],
    ["Mesut Özil", "Mesut Özil"]
  ].map(([name, title]) => [normalizePlayerName(name), title])
);
const curatedPriorityByName = new Map([...curatedTitleOverrides.keys()].map((nameKey, index) => [nameKey, index]));

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCommonsImageUrl(fileName) {
  const cleaned = String(fileName || "").replace(/^File:/i, "").trim();
  if (!cleaned) {
    return "";
  }

  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(cleaned)}?width=160`;
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function getTitleCore(title) {
  return String(title || "").replace(/\s*\([^)]*\)\s*$/g, "").trim();
}

function hasJuniorMismatch(profileName, title) {
  const profileKey = normalizePlayerName(profileName);
  const titleKey = normalizePlayerName(title);
  return /\b(jr|junior)\b/.test(titleKey) && !/\b(jr|junior)\b/.test(profileKey);
}

function isFootballerExtract(extract) {
  return /\b(footballer|football player|association football|soccer player|football manager|played as a)\b/i.test(extract || "");
}

function hasTeamClue(profile, text) {
  const textKey = normalizePlayerName(text);
  return (profile.teams || []).some((team) => {
    const teamKey = normalizePlayerName(team);
    return teamKey.length >= 4 && textKey.includes(teamKey);
  });
}

function isLikelyPlayerPage(profile, page, overrideTitle = "") {
  if (!page?.title || !page?.extract || !page?.pageimage) {
    return false;
  }

  if (hasJuniorMismatch(profile.name, page.title)) {
    return false;
  }

  const titleCore = getTitleCore(page.title);
  const profileNameKey = normalizePlayerName(profile.name);
  const titleCoreKey = normalizePlayerName(titleCore);
  const fullTitleKey = normalizePlayerName(page.title);
  const nameTokens = profileNameKey.split(" ").filter(Boolean);
  const exactishTitle =
    titleCoreKey === profileNameKey ||
    fullTitleKey === profileNameKey ||
    isPlayerNameMatch(profile.name, titleCore) ||
    nameTokens.every((token) => fullTitleKey.includes(token));

  if (!overrideTitle && !exactishTitle) {
    return false;
  }

  if (!isFootballerExtract(page.extract)) {
    return false;
  }

  if (overrideTitle) {
    return true;
  }

  if (nameTokens.length === 1) {
    return titleCoreKey === profileNameKey && hasTeamClue(profile, page.extract);
  }

  return exactishTitle && (hasTeamClue(profile, page.extract) || page.extract.length >= 120);
}

async function fetchWikipedia(params, attempt = 0) {
  const url = new URL(wikipediaApiUrl);
  for (const [key, value] of Object.entries({
    action: "query",
    format: "json",
    origin: "*",
    ...params
  })) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      "Api-User-Agent": apiUserAgent,
      "User-Agent": apiUserAgent
    }
  });
  if (response.status === 429 && attempt < 5) {
    const retryAfterSeconds = Number(response.headers.get("retry-after") || 0);
    const backoffMs = retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 2 ** attempt * 3000;
    await sleep(backoffMs);
    return fetchWikipedia(params, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`Wikipedia API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchPageSummary(title) {
  const normalizedTitle = String(title || "").trim().replace(/ /g, "_");
  const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(normalizedTitle)}`, {
    headers: {
      "Api-User-Agent": apiUserAgent,
      "User-Agent": apiUserAgent
    }
  });
  if (!response.ok) {
    throw new Error(`Wikipedia summary request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function getPagesFromQuery(data) {
  return Object.values(data?.query?.pages || {})
    .filter((page) => !page.missing)
    .sort((a, b) => (a.index || 0) - (b.index || 0));
}

async function fetchPageByTitle(title) {
  const data = await fetchWikipedia({
    redirects: "1",
    titles: title,
    prop: "pageimages|extracts|info",
    piprop: "name",
    exintro: "1",
    explaintext: "1",
    inprop: "url"
  });
  return getPagesFromQuery(data)[0] || null;
}

async function searchPages(profile) {
  const team = profile.teams?.[0] || "";
  const search = `${profile.name} ${team} footballer`.trim();
  const data = await fetchWikipedia({
    generator: "search",
    gsrsearch: search,
    gsrlimit: "6",
    prop: "pageimages|extracts|info",
    piprop: "name",
    exintro: "1",
    explaintext: "1",
    inprop: "url"
  });
  return getPagesFromQuery(data);
}

async function fetchImageInfo(fileName) {
  const title = `File:${String(fileName || "").replace(/^File:/i, "").trim()}`;
  const data = await fetchWikipedia({
    titles: title,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "160"
  });
  const page = getPagesFromQuery(data)[0];
  return page?.imageinfo?.[0] || null;
}

function createCurrentImageLookup(currentProfilesData) {
  const lookup = new Map();
  for (const profile of Object.values(currentProfilesData?.profiles || {})) {
    if (!profile?.imageUrl) {
      continue;
    }

    for (const name of [profile.name, profile.displayName]) {
      const key = normalizePlayerName(name);
      if (key && !lookup.has(key)) {
        lookup.set(key, {
          imageUrl: profile.imageUrl,
          imageSource: inheritedImageSource,
          imageSourceUrl: profile.sourceUrl || profile.imageUrl
        });
      }
    }
  }
  return lookup;
}

function applyImageFields(profile, imageFields) {
  for (const [key, value] of Object.entries(imageFields || {})) {
    if (value !== undefined && value !== "") {
      profile[key] = value;
    }
  }
}

async function lookupCommonsImage(profile) {
  const overrideTitle = curatedTitleOverrides.get(normalizePlayerName(profile.name)) || "";
  let pages = [];

  if (overrideTitle) {
    const summary = await fetchPageSummary(overrideTitle);
    const summaryImageUrl = summary?.thumbnail?.source || summary?.originalimage?.source || "";
    const summaryPage = {
      title: summary?.title || overrideTitle,
      extract: summary?.extract || "",
      pageimage: summaryImageUrl,
      fullurl: summary?.content_urls?.desktop?.page || ""
    };

    if (summaryImageUrl && isLikelyPlayerPage(profile, summaryPage, overrideTitle)) {
      return {
        imageUrl: summaryImageUrl,
        imageSource: wikipediaSummarySourceId,
        imageSourceUrl: summaryPage.fullurl,
        imagePageTitle: summaryPage.title,
        imagePageUrl: summaryPage.fullurl
      };
    }

    if (curatedOnly) {
      return null;
    }

    const page = await fetchPageByTitle(overrideTitle);
    pages = page ? [page] : [];
  } else {
    pages = await searchPages(profile);
  }

  for (const page of pages) {
    if (!isLikelyPlayerPage(profile, page, overrideTitle)) {
      continue;
    }

    const imageInfo = await fetchImageInfo(page.pageimage);
    const descriptionUrl = imageInfo?.descriptionurl || "";
    if (!descriptionUrl.includes("commons.wikimedia.org/wiki/File:")) {
      continue;
    }

    return {
      imageUrl: getCommonsImageUrl(page.pageimage),
      imageSource: commonsSourceId,
      imageSourceUrl: descriptionUrl,
      imageCredit: stripHtml(imageInfo?.extmetadata?.Artist?.value),
      imageLicense: stripHtml(
        imageInfo?.extmetadata?.LicenseShortName?.value ||
          imageInfo?.extmetadata?.UsageTerms?.value ||
          imageInfo?.extmetadata?.License?.value
      ),
      imagePageTitle: page.title,
      imagePageUrl: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`
    };
  }

  return null;
}

const [historicalProfilesData, currentProfilesData] = await Promise.all([
  readJson(historicalProfilesPath),
  readJson(currentProfilesPath)
]);

const currentImageLookup = createCurrentImageLookup(currentProfilesData);
const profiles = historicalProfilesData.profiles || {};
let inheritedCount = 0;
let wikimediaCount = 0;
let skippedExistingCount = 0;
let lookedUpCount = 0;
const lookupFailures = [];

for (const profile of Object.values(profiles)) {
  if (profile.imageUrl) {
    skippedExistingCount += 1;
    continue;
  }

  const inheritedImageFields = currentImageLookup.get(normalizePlayerName(profile.name));
  if (inheritedImageFields?.imageUrl) {
    applyImageFields(profile, inheritedImageFields);
    inheritedCount += 1;
    continue;
  }
}

const missingProfiles = Object.values(profiles).filter((profile) => {
  if (profile.imageUrl) {
    return false;
  }
  if (!curatedOnly) {
    return true;
  }
  return curatedTitleOverrides.has(normalizePlayerName(profile.name));
}).sort((a, b) => {
  const priorityA = curatedPriorityByName.get(normalizePlayerName(a.name)) ?? Number.MAX_SAFE_INTEGER;
  const priorityB = curatedPriorityByName.get(normalizePlayerName(b.name)) ?? Number.MAX_SAFE_INTEGER;
  return priorityA - priorityB || a.name.localeCompare(b.name);
});
const lookupProfiles = lookupLimit > 0 ? missingProfiles.slice(0, lookupLimit) : missingProfiles;

for (const [index, profile] of lookupProfiles.entries()) {
  try {
    const imageFields = await lookupCommonsImage(profile);
    lookedUpCount += 1;
    if (imageFields?.imageUrl) {
      applyImageFields(profile, imageFields);
      wikimediaCount += 1;
    }
  } catch (error) {
    lookupFailures.push(`${profile.name}: ${error.message}`);
  }

  if ((index + 1) % 100 === 0 || index + 1 === lookupProfiles.length) {
    console.log(`Historical image lookup progress: ${index + 1}/${lookupProfiles.length}`);
  }

  if (requestDelayMs > 0 && index + 1 < lookupProfiles.length) {
    await sleep(requestDelayMs);
  }
}

const imageCount = Object.values(profiles).filter((profile) => profile.imageUrl).length;
const sourceIds = new Set(historicalProfilesData.sourceIds || []);
if (imageCount > 0) {
  sourceIds.add(commonsSourceId);
}
if (Object.values(profiles).some((profile) => profile.imageSource === wikipediaSummarySourceId)) {
  sourceIds.add(wikipediaSummarySourceId);
}

const output = {
  ...historicalProfilesData,
  updatedAt: new Date().toISOString(),
  sourceIds: [...sourceIds],
  coverage: {
    ...(historicalProfilesData.coverage || {}),
    imageStatus: "current-card-reuse-plus-curated-wikipedia-wikimedia",
    imageNote:
      "Historical cards reuse current profile photos for matching active players and add Wikipedia/Wikimedia photos only when the page match passes conservative footballer checks or a curated title override."
  },
  profiles
};

if (!dryRun) {
  await writeFile(historicalProfilesPath, `${JSON.stringify(output, null, 2)}\n`);
}

console.log(
  [
    `Historical player images ${dryRun ? "checked" : "populated"}: ${imageCount}/${Object.keys(profiles).length} profiles now have photos.`,
    `Inherited from current profiles: ${inheritedCount}.`,
    `Added from Wikipedia/Wikimedia: ${wikimediaCount}.`,
    `Already had photos: ${skippedExistingCount}.`,
    `Wikimedia lookups attempted: ${lookedUpCount}.`,
    lookupLimit > 0 ? `Lookup limit applied: ${lookupLimit}.` : "",
    curatedOnly ? "Curated-only Wikimedia mode: yes." : "",
    lookupFailures.length ? `Lookup failures: ${lookupFailures.slice(0, 8).join("; ")}` : ""
  ]
    .filter(Boolean)
    .join("\n")
);
