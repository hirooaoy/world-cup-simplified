#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const historyPath = path.join(root, "data", "history.json");
const defaultReportDir = path.join("/tmp", "worldcup-historical-youtube");
const FIFA_CHANNEL_ID = "UCpcTrCXblq78GZrTUTLWeBw";
const FIFA_SOURCE_NAME = "FIFA";
const TIME_ZONE = "America/Los_Angeles";
const SEARCH_DELAY_MS = 150;
const WATCH_DELAY_MS = 100;
const MAX_RESULTS_PER_SEARCH = 12;
const MAX_VIDEO_SECONDS = 25 * 60;
const MIN_VIDEO_SECONDS = 45;

const TEAM_ALIASES = new Map(
  Object.entries({
    "Bosnia-Herzegovina": ["Bosnia and Herzegovina", "Bosnia"],
    "Côte d'Ivoire": ["Ivory Coast", "Cote d'Ivoire", "Cote d Ivoire"],
    "Czech Republic": ["Czechia", "Czech Rep"],
    Czechoslovakia: ["Czechoslovakia", "CSSR"],
    "Dutch East Indies": ["Indonesia", "Dutch East Indies"],
    "East Germany": ["East Germany", "German Democratic Republic", "GDR"],
    Iran: ["Iran", "IR Iran"],
    Ireland: ["Republic of Ireland", "Ireland"],
    "North Korea": ["Korea DPR", "DPR Korea", "North Korea"],
    Russia: ["Russia", "Russian Federation"],
    "Saudi Arabia": ["Saudi Arabia", "KSA"],
    "Serbia and Montenegro": ["Serbia and Montenegro", "Serbia & Montenegro"],
    "South Korea": ["Korea Republic", "South Korea"],
    "Soviet Union": ["Soviet Union", "USSR"],
    Turkey: ["Turkey", "Turkiye", "Türkiye"],
    USA: ["USA", "United States", "U.S.A."],
    "United Arab Emirates": ["United Arab Emirates", "UAE"],
    "United States": ["United States", "USA", "U.S.A."],
    "West Germany": ["West Germany", "Germany FR", "FR Germany", "Federal Republic of Germany"],
    Yugoslavia: ["Yugoslavia", "Jugoslavia"],
    Zaire: ["Zaire", "DR Congo", "Congo DR"]
  })
);

const SEARCH_NAME_OVERRIDES = new Map(
  Object.entries({
    "Côte d'Ivoire": "Ivory Coast",
    Iran: "IR Iran",
    Ireland: "Republic of Ireland",
    "North Korea": "Korea DPR",
    "South Korea": "Korea Republic",
    USA: "United States"
  })
);

const REJECT_TITLE_PATTERNS = [
  /\bfull match\b/i,
  /\bfull replay\b/i,
  /\bmatch replay\b/i,
  /\buncut\b/i,
  /\bquick cut\b/i,
  /\balternate angle\b/i,
  /\bpenalty shoot(?:out|-out)?\b/i,
  /\bshoot(?:out|-out) only\b/i,
  /\bevery goal\b/i,
  /\ball (?:of )?(?:the )?.* goals\b/i,
  /\btop \d+\b/i,
  /\bbest goals\b/i,
  /\bpreview\b/i,
  /\btrailer\b/i,
  /\broad to\b/i,
  /\bclassic match\b/i,
  /\b(?:1|10|15)[- ]minute\b/i,
  /\bshorts?\b/i
];

const args = parseArgs(process.argv.slice(2));
const searchCache = new Map();
const watchCache = new Map();

function parseArgs(rawArgs) {
  const parsed = {
    dryRun: false,
    includeReviewed: false,
    refreshExisting: false,
    verifyExisting: false,
    verbose: false,
    concurrency: 1,
    limit: null,
    fromYear: null,
    toYear: null,
    onlyId: "",
    reportPath: ""
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    const next = () => rawArgs[++index];

    if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--include-reviewed") parsed.includeReviewed = true;
    else if (arg === "--refresh-existing") parsed.refreshExisting = true;
    else if (arg === "--verify-existing") parsed.verifyExisting = true;
    else if (arg === "--verbose") parsed.verbose = true;
    else if (arg === "--concurrency") parsed.concurrency = Number(next());
    else if (arg.startsWith("--concurrency=")) parsed.concurrency = Number(arg.slice("--concurrency=".length));
    else if (arg === "--limit") parsed.limit = Number(next());
    else if (arg.startsWith("--limit=")) parsed.limit = Number(arg.slice("--limit=".length));
    else if (arg === "--from-year") parsed.fromYear = Number(next());
    else if (arg.startsWith("--from-year=")) parsed.fromYear = Number(arg.slice("--from-year=".length));
    else if (arg === "--to-year") parsed.toYear = Number(next());
    else if (arg.startsWith("--to-year=")) parsed.toYear = Number(arg.slice("--to-year=".length));
    else if (arg === "--only-id") parsed.onlyId = String(next() || "");
    else if (arg.startsWith("--only-id=")) parsed.onlyId = arg.slice("--only-id=".length);
    else if (arg === "--report") parsed.reportPath = String(next() || "");
    else if (arg.startsWith("--report=")) parsed.reportPath = arg.slice("--report=".length);
    else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (parsed.limit !== null && (!Number.isInteger(parsed.limit) || parsed.limit < 1)) {
    throw new Error("--limit must be a positive integer");
  }

  if (!Number.isInteger(parsed.concurrency) || parsed.concurrency < 1 || parsed.concurrency > 8) {
    throw new Error("--concurrency must be an integer from 1 to 8");
  }

  for (const [name, value] of [
    ["--from-year", parsed.fromYear],
    ["--to-year", parsed.toYear]
  ]) {
    if (value !== null && (!Number.isInteger(value) || value < 1900)) {
      throw new Error(`${name} must be a valid year`);
    }
  }

  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))];
}

function aliasesFor(teamName) {
  return unique([teamName, ...(TEAM_ALIASES.get(teamName) || [])]);
}

function searchName(teamName) {
  return SEARCH_NAME_OVERRIDES.get(teamName) || teamName;
}

function containsNormalizedPhrase(text, phrase) {
  const normalizedPhrase = normalize(phrase);
  if (!normalizedPhrase) {
    return false;
  }

  return new RegExp(`(?:^| )${escapeRegExp(normalizedPhrase)}(?: |$)`).test(text);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractText(value) {
  if (!value) {
    return "";
  }

  if (typeof value.simpleText === "string") {
    return value.simpleText;
  }

  if (Array.isArray(value.runs)) {
    return value.runs.map((run) => run.text || "").join("");
  }

  if (typeof value.text === "string") {
    return value.text;
  }

  return "";
}

function extractInitialData(html) {
  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);
  if (start < 0) {
    throw new Error("Could not find ytInitialData");
  }

  return parseBalancedJson(html, start + marker.length);
}

function extractPlayerResponse(html) {
  const markers = ["var ytInitialPlayerResponse = ", "ytInitialPlayerResponse = "];

  for (const marker of markers) {
    const start = html.indexOf(marker);
    if (start >= 0) {
      try {
        return parseBalancedJson(html, start + marker.length);
      } catch {
        continue;
      }
    }
  }

  const inlineMatch = html.match(/"ytInitialPlayerResponse"\s*:\s*(\{)/);
  if (inlineMatch?.index !== undefined) {
    try {
      return parseBalancedJson(html, inlineMatch.index + inlineMatch[0].lastIndexOf("{"));
    } catch {
      return null;
    }
  }

  return null;
}

function parseBalancedJson(source, start) {
  let index = start;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let cursor = index; cursor < source.length; cursor += 1) {
    const char = source[cursor];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(source.slice(index, cursor + 1));
      }
    }
  }

  throw new Error("Could not parse balanced JSON");
}

function collectVideoRenderers(value, out = []) {
  if (!value || typeof value !== "object") {
    return out;
  }

  if (value.videoRenderer) {
    out.push(value.videoRenderer);
  }

  const children = Array.isArray(value) ? value : Object.values(value);
  for (const child of children) {
    collectVideoRenderers(child, out);
  }

  return out;
}

function rendererToCandidate(renderer, source, query) {
  const videoId = renderer.videoId;
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || "")) {
    return null;
  }

  return {
    videoId,
    source,
    query,
    title: extractText(renderer.title),
    description: extractText(renderer.detailedMetadataSnippets?.[0]?.snippetText),
    durationText: extractText(renderer.lengthText),
    publishedText: extractText(renderer.publishedTimeText),
    url: `https://www.youtube.com/watch?v=${videoId}`
  };
}

function buildQueries(fixture) {
  const home = searchName(fixture.homeSlot);
  const away = searchName(fixture.awaySlot);
  const year = fixture.tournamentYear;
  const queries = [
    `${home} ${away} ${year} FIFA World Cup highlights`,
    `${home} v ${away} ${year} FIFA World Cup`,
    `${away} ${home} ${year} FIFA World Cup highlights`
  ];

  if (Number.isFinite(fixture.score?.home) && Number.isFinite(fixture.score?.away)) {
    queries.push(`${home} ${fixture.score.home}-${fixture.score.away} ${away} ${year} FIFA World Cup`);
    queries.push(`${away} ${fixture.score.away}-${fixture.score.home} ${home} ${year} FIFA World Cup`);
  }

  return unique(queries);
}

function fixtureShouldBeProcessed(fixture) {
  if (args.onlyId && fixture.id !== args.onlyId) {
    return false;
  }

  if (args.fromYear !== null && fixture.tournamentYear < args.fromYear) {
    return false;
  }

  if (args.toYear !== null && fixture.tournamentYear > args.toYear) {
    return false;
  }

  if (fixture.highlightVideo && !args.refreshExisting) {
    return false;
  }

  if (fixture.highlightVideoReview && !args.includeReviewed) {
    return false;
  }

  return fixture.status === "FT";
}

function fixtureLabel(fixture) {
  return `${fixture.tournamentYear} ${fixture.round}: ${fixture.homeSlot} ${fixture.score?.home ?? ""}-${fixture.score?.away ?? ""} ${fixture.awaySlot}`;
}

function titleRejectReason(title) {
  for (const pattern of REJECT_TITLE_PATTERNS) {
    if (pattern.test(title)) {
      return `Rejected title pattern: ${pattern}`;
    }
  }

  return "";
}

function matchTeamInText(text, teamName) {
  const aliases = aliasesFor(teamName);
  return aliases.find((alias) => containsNormalizedPhrase(text, alias)) || "";
}

function titleHasWorldCupContext(titleText, allText) {
  return /\bworld cup\b/.test(titleText) || /\bfifa\b/.test(titleText) || /\bworld cup\b/.test(allText);
}

function evaluateCandidate(fixture, candidate, metadata) {
  const title = metadata.title || candidate.title || "";
  const description = metadata.description || candidate.description || "";
  const titleText = normalize(title);
  const allText = normalize(`${title} ${description}`);
  const year = String(fixture.tournamentYear);
  const homeMatch = matchTeamInText(titleText, fixture.homeSlot);
  const awayMatch = matchTeamInText(titleText, fixture.awaySlot);
  const rejectReason = titleRejectReason(title);
  const durationSeconds = Number(metadata.lengthSeconds);
  const reasons = [];

  if (metadata.channelId !== FIFA_CHANNEL_ID) {
    reasons.push(`channel ${metadata.channelId || "unknown"} is not official FIFA`);
  }

  if (!metadata.publishedAt || Number.isNaN(new Date(metadata.publishedAt).getTime())) {
    reasons.push("missing valid publish date");
  }

  if (!titleText.includes(year) && !allText.includes(year)) {
    reasons.push(`missing tournament year ${year}`);
  }

  if (!titleHasWorldCupContext(titleText, allText)) {
    reasons.push("missing World Cup context");
  }

  if (!homeMatch) {
    reasons.push(`title does not match ${fixture.homeSlot}`);
  }

  if (!awayMatch) {
    reasons.push(`title does not match ${fixture.awaySlot}`);
  }

  if (rejectReason) {
    reasons.push(rejectReason);
  }

  if (Number.isFinite(durationSeconds) && durationSeconds > MAX_VIDEO_SECONDS) {
    reasons.push(`duration ${durationSeconds}s is too long for highlight button`);
  }

  if (Number.isFinite(durationSeconds) && durationSeconds < MIN_VIDEO_SECONDS) {
    reasons.push(`duration ${durationSeconds}s is too short for match highlights`);
  }

  const accepted = reasons.length === 0;
  let score = 0;
  if (accepted) {
    score += 100;
    if (/\bmatch highlights?\b/i.test(title)) score += 20;
    else if (/\bhighlights?\b/i.test(title)) score += 12;
    if (/\bfinal\b/i.test(title) && /\bfinal\b/i.test(fixture.round || "")) score += 4;
    if (/\bsemi[- ]?finals?\b/i.test(title) && /\bsemi/i.test(fixture.round || "")) score += 3;
    if (Number.isFinite(durationSeconds) && durationSeconds >= 90 && durationSeconds <= 900) score += 4;
    if (candidate.source === "channel") score += 2;
  }

  return {
    accepted,
    score,
    reasons,
    title,
    homeMatch,
    awayMatch,
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function searchYouTube(query, source) {
  const cacheKey = `${source}:${query}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  const url =
    source === "channel"
      ? `https://www.youtube.com/@fifa/search?query=${encodeURIComponent(query)}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(`FIFA ${query}`)}`;
  await sleep(SEARCH_DELAY_MS);
  const html = await fetchText(url);
  const initialData = extractInitialData(html);
  const renderers = collectVideoRenderers(initialData);
  const candidates = renderers
    .slice(0, MAX_RESULTS_PER_SEARCH)
    .map((renderer) => rendererToCandidate(renderer, source, query))
    .filter(Boolean);
  searchCache.set(cacheKey, candidates);
  return candidates;
}

function looksPossibleFromSearch(fixture, candidate) {
  const titleText = normalize(candidate.title);
  const allText = normalize(`${candidate.title} ${candidate.description}`);

  return (
    allText.includes(String(fixture.tournamentYear)) &&
    titleHasWorldCupContext(titleText, allText) &&
    Boolean(matchTeamInText(titleText, fixture.homeSlot)) &&
    Boolean(matchTeamInText(titleText, fixture.awaySlot)) &&
    !titleRejectReason(candidate.title)
  );
}

async function getWatchMetadata(videoId) {
  if (watchCache.has(videoId)) {
    return watchCache.get(videoId);
  }

  await sleep(WATCH_DELAY_MS);
  const html = await fetchText(`https://www.youtube.com/watch?v=${videoId}`);
  const player = extractPlayerResponse(html);
  const videoDetails = player?.videoDetails || {};
  const microformat = player?.microformat?.playerMicroformatRenderer || {};
  const title =
    videoDetails.title ||
    extractText(microformat.title) ||
    html.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/\s+-\s+YouTube$/, "") ||
    "";
  const description = videoDetails.shortDescription || extractText(microformat.description) || "";
  const publishedAt =
    html.match(/"publishDate":"([^"]+)"/)?.[1] ||
    microformat.publishDate ||
    microformat.uploadDate ||
    html.match(/"uploadDate":"([^"]+)"/)?.[1] ||
    "";
  const metadata = {
    videoId,
    title,
    description,
    channelId: videoDetails.channelId || microformat.externalChannelId || "",
    sourceName:
      html.match(/"ownerChannelName":"([^"]+)"/)?.[1] ||
      videoDetails.author ||
      microformat.ownerChannelName ||
      "",
    lengthSeconds: Number(videoDetails.lengthSeconds || microformat.lengthSeconds),
    publishedAt: publishedAt ? decodeJsonString(publishedAt) : "",
    url: `https://www.youtube.com/watch?v=${videoId}`
  };
  watchCache.set(videoId, metadata);
  return metadata;
}

function decodeJsonString(value) {
  try {
    return JSON.parse(`"${String(value).replace(/"/g, '\\"')}"`);
  } catch {
    return value;
  }
}

async function evaluateSearchCandidates(fixture, candidates, seenVideoIds, evaluated) {
  for (const candidate of candidates) {
    if (seenVideoIds.has(candidate.videoId)) {
      continue;
    }

    seenVideoIds.add(candidate.videoId);

    if (!looksPossibleFromSearch(fixture, candidate)) {
      continue;
    }

    const metadata = await getWatchMetadata(candidate.videoId);
    const evaluation = evaluateCandidate(fixture, candidate, metadata);
    evaluated.push({ candidate, metadata, evaluation });
  }
}

function selectedAccepted(evaluated) {
  return (
    evaluated
      .filter((entry) => entry.evaluation.accepted)
      .sort((a, b) => b.evaluation.score - a.evaluation.score)[0] || null
  );
}

async function findHighlightVideo(fixture) {
  const queries = buildQueries(fixture);
  const sources = ["channel", "youtube"];
  const seenVideoIds = new Set();
  const evaluated = [];

  for (const source of sources) {
    for (const query of queries) {
      const candidates = await searchYouTube(query, source);
      await evaluateSearchCandidates(fixture, candidates, seenVideoIds, evaluated);
      const accepted = selectedAccepted(evaluated);
      if (accepted) {
        return {
          selected: accepted,
          evaluated
        };
      }
    }
  }

  return {
    selected: null,
    evaluated
  };
}

function makeHighlightVideo(metadata, checkedAt) {
  return {
    platform: "youtube",
    url: metadata.url,
    sourceName: FIFA_SOURCE_NAME,
    channelId: FIFA_CHANNEL_ID,
    publishedAt: metadata.publishedAt,
    checkedAt
  };
}

function makeReview(checkedAt) {
  return {
    status: "not-found",
    platform: "youtube",
    sourceName: FIFA_SOURCE_NAME,
    channelId: FIFA_CHANNEL_ID,
    checkedAt,
    note: "No clean official FIFA YouTube highlight-style video matched this fixture."
  };
}

function localIso(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "shortOffset"
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  const offset = normalizeOffset(parts.timeZoneName);
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}${offset}`;
}

function normalizeOffset(value) {
  if (value === "GMT" || value === "UTC") {
    return "+00:00";
  }

  const match = String(value || "").match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) {
    return "Z";
  }

  return `${match[1]}${match[2].padStart(2, "0")}:${match[3] || "00"}`;
}

function summarizeEntry(entry) {
  return {
    videoId: entry.candidate.videoId,
    url: entry.metadata.url,
    title: entry.evaluation.title,
    source: entry.candidate.source,
    query: entry.candidate.query,
    durationSeconds: entry.evaluation.durationSeconds,
    score: entry.evaluation.score,
    reasons: entry.evaluation.reasons
  };
}

async function writeReport(report, checkedAt) {
  const reportPath =
    args.reportPath ||
    path.join(defaultReportDir, `historical-youtube-${checkedAt.replace(/[:]/g, "-")}${args.dryRun ? "-dry-run" : ""}.json`);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
}

function dataSummary(history) {
  const summary = {
    total: 0,
    highlightVideo: 0,
    highlightVideoReview: 0,
    missingDisposition: 0
  };

  for (const fixture of history.fixtures || []) {
    summary.total += 1;
    if (fixture.highlightVideo) summary.highlightVideo += 1;
    if (fixture.highlightVideoReview) summary.highlightVideoReview += 1;
    if (!fixture.highlightVideo && !fixture.highlightVideoReview) summary.missingDisposition += 1;
  }

  return summary;
}

const history = JSON.parse(await readFile(historyPath, "utf8"));
const checkedAt = localIso();
const fixtures = (history.fixtures || []).filter(fixtureShouldBeProcessed).slice(0, args.limit || undefined);
const report = {
  generatedAt: new Date().toISOString(),
  checkedAt,
  dryRun: args.dryRun,
  filters: {
    includeReviewed: args.includeReviewed,
    refreshExisting: args.refreshExisting,
    verifyExisting: args.verifyExisting,
    concurrency: args.concurrency,
    limit: args.limit,
    fromYear: args.fromYear,
    toYear: args.toYear,
    onlyId: args.onlyId
  },
  before: dataSummary(history),
  processed: [],
  errors: []
};

console.log(
  `Historical YouTube sweep: ${fixtures.length} fixture${fixtures.length === 1 ? "" : "s"} queued (${args.dryRun ? "dry run" : "write mode"}, concurrency ${args.concurrency}).`
);

let added = 0;
let reviewed = 0;

async function processFixture(fixture, index) {
  const label = fixtureLabel(fixture);
  console.log(`[${index + 1}/${fixtures.length}] ${label}`);

  try {
    const result = await findHighlightVideo(fixture);
    const accepted = result.selected;
    const bestRejected = result.evaluated
      .filter((entry) => !entry.evaluation.accepted)
      .sort((a, b) => b.evaluation.score - a.evaluation.score)
      .slice(0, 5)
      .map(summarizeEntry);

    if (accepted) {
      if (!args.dryRun) {
        fixture.highlightVideo = makeHighlightVideo(accepted.metadata, checkedAt);
        delete fixture.highlightVideoReview;
      }
      added += 1;
      console.log(`  linked ${accepted.metadata.url} (${accepted.evaluation.title})`);
      report.processed.push({
        order: index,
        id: fixture.id,
        label,
        status: "linked",
        selected: summarizeEntry(accepted),
        rejected: bestRejected
      });
    } else {
      if (!args.dryRun) {
        delete fixture.highlightVideo;
        fixture.highlightVideoReview = makeReview(checkedAt);
      }
      reviewed += 1;
      console.log("  no official FIFA highlight-style YouTube video found");
      report.processed.push({
        order: index,
        id: fixture.id,
        label,
        status: "not-found",
        rejected: bestRejected
      });
    }
  } catch (error) {
    console.log(`  error: ${error.message}`);
    report.errors.push({
      order: index,
      id: fixture.id,
      label,
      message: error.message,
      stack: args.verbose ? error.stack : undefined
    });
  }
}

let nextFixtureIndex = 0;
async function worker() {
  while (nextFixtureIndex < fixtures.length) {
    const index = nextFixtureIndex;
    nextFixtureIndex += 1;
    await processFixture(fixtures[index], index);
  }
}

await Promise.all(Array.from({ length: Math.min(args.concurrency, fixtures.length) }, () => worker()));

if (!args.dryRun && (added || reviewed)) {
  history.updatedAt = new Date().toISOString();
  await writeFile(historyPath, `${JSON.stringify(history, null, 2)}\n`);
}

report.processed.sort((a, b) => a.order - b.order);
report.errors.sort((a, b) => a.order - b.order);
report.after = dataSummary(history);
report.added = added;
report.reviewed = reviewed;
report.searches = searchCache.size;
report.watchPages = watchCache.size;
const reportPath = await writeReport(report, checkedAt);

console.log(
  `Historical YouTube sweep complete: ${added} linked, ${reviewed} reviewed not-found, ${report.errors.length} error${report.errors.length === 1 ? "" : "s"}.`
);
console.log(`Report: ${reportPath}`);

if (report.errors.length) {
  process.exitCode = 1;
}
