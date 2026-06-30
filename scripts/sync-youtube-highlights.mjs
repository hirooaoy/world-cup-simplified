#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturesPath = path.join(root, "data", "fixtures.json");
const teamsPath = path.join(root, "data", "teams.json");
const defaultReportDir = path.join("/tmp", "worldcup-youtube-highlights");
const FOX_CHANNEL_ID = "UCwNqHDsnBCKT-olwJwIFyfg";
const FOX_SOURCE_NAME = "FOX Sports";
const FOX_HANDLE = "@foxsports";
const TIME_ZONE = "America/Los_Angeles";
const FETCH_RETRY_COUNT = 4;
const SEARCH_DELAY_MS = 650;
const OEMBED_DELAY_MS = 250;
const MAX_RESULTS_PER_SEARCH = 14;
const MAX_HIGHLIGHT_SECONDS = 45 * 60;
const MIN_HIGHLIGHT_SECONDS = 30;

const EXTRA_TEAM_ALIASES = new Map(
  Object.entries({
    BIH: ["Bosnia", "Bosnia-Herzegovina"],
    CIV: ["Cote d'Ivoire", "Cote d Ivoire", "Ivory Coast"],
    COD: ["Congo DR", "Democratic Republic of Congo"],
    CPV: ["Cape Verde"],
    CUW: ["Curacao"],
    IRN: ["Iran"],
    KOR: ["Korea Republic"],
    KSA: ["Saudi Arabia"],
    TUR: ["Turkiye", "Turkey"],
    USA: ["USA", "U.S.A.", "US", "United States"]
  })
);

const SEARCH_NAME_OVERRIDES = new Map(
  Object.entries({
    CIV: "Ivory Coast",
    COD: "Congo DR",
    CUW: "Curacao",
    IRN: "Iran",
    KOR: "South Korea",
    TUR: "Turkey",
    USA: "United States"
  })
);

const REJECT_TITLE_PATTERNS = [
  /\bfull match\b/i,
  /\bfull replay\b/i,
  /\bmatch replay\b/i,
  /\bwatchalong\b/i,
  /\bwatch along\b/i,
  /\blive stream\b/i,
  /\bpreview\b/i,
  /\bpredictions?\b/i,
  /\btrailer\b/i,
  /\bpress conference\b/i,
  /\binterview\b/i,
  /\breaction\b/i,
  /\btraining\b/i,
  /\bbehind the scenes\b/i,
  /\bevery goal\b/i,
  /\btop \d+\b/i,
  /\bbest goals\b/i,
  /\bshorts?\b/i
];

const args = parseArgs(process.argv.slice(2));
const searchCache = new Map();
const oembedCache = new Map();

function parseArgs(rawArgs) {
  const parsed = {
    dryRun: false,
    refreshExisting: false,
    refreshReviewedChecks: false,
    skipReviewed: false,
    strict: false,
    verbose: false,
    concurrency: 1,
    limit: null,
    onlyId: "",
    reportPath: ""
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    const next = () => rawArgs[++index];

    if (arg === "--") continue;
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--refresh-existing") parsed.refreshExisting = true;
    else if (arg === "--refresh-reviewed-checks") parsed.refreshReviewedChecks = true;
    else if (arg === "--skip-reviewed") parsed.skipReviewed = true;
    else if (arg === "--strict") parsed.strict = true;
    else if (arg === "--verbose") parsed.verbose = true;
    else if (arg === "--concurrency") parsed.concurrency = Number(next());
    else if (arg.startsWith("--concurrency=")) parsed.concurrency = Number(arg.slice("--concurrency=".length));
    else if (arg === "--limit") parsed.limit = Number(next());
    else if (arg.startsWith("--limit=")) parsed.limit = Number(arg.slice("--limit=".length));
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

  if (!Number.isInteger(parsed.concurrency) || parsed.concurrency < 1 || parsed.concurrency > 6) {
    throw new Error("--concurrency must be an integer from 1 to 6");
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unique(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))];
}

function containsNormalizedPhrase(text, phrase) {
  const normalizedPhrase = normalize(phrase);
  if (!normalizedPhrase) {
    return false;
  }

  return new RegExp(`(?:^| )${escapeRegExp(normalizedPhrase)}(?: |$)`).test(text);
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
  const markers = ["var ytInitialData = ", "ytInitialData = "];

  for (const marker of markers) {
    const start = html.indexOf(marker);
    if (start >= 0) {
      return parseBalancedJson(html, start + marker.length);
    }
  }

  const inlineMatch = html.match(/"ytInitialData"\s*:\s*(\{)/);
  if (inlineMatch?.index !== undefined) {
    return parseBalancedJson(html, inlineMatch.index + inlineMatch[0].lastIndexOf("{"));
  }

  throw new Error("Could not find ytInitialData");
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

function extractChannelRun(renderer) {
  const runs = [
    ...(renderer.ownerText?.runs || []),
    ...(renderer.shortBylineText?.runs || []),
    ...(renderer.longBylineText?.runs || [])
  ];
  return runs.find((run) => run?.navigationEndpoint?.browseEndpoint?.browseId) || runs[0] || null;
}

function rendererToCandidate(renderer, query) {
  const videoId = renderer.videoId;
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || "")) {
    return null;
  }

  const channelRun = extractChannelRun(renderer);

  return {
    videoId,
    query,
    title: extractText(renderer.title),
    description: extractText(renderer.detailedMetadataSnippets?.[0]?.snippetText),
    durationText: extractText(renderer.lengthText),
    publishedText: extractText(renderer.publishedTimeText),
    channelId: channelRun?.navigationEndpoint?.browseEndpoint?.browseId || "",
    channelHandle: channelRun?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl || "",
    sourceName: channelRun?.text || extractText(renderer.ownerText) || extractText(renderer.shortBylineText),
    url: `https://www.youtube.com/watch?v=${videoId}`
  };
}

function teamAliases(team) {
  if (!team) {
    return [];
  }

  return unique([team.name, team.officialName, ...(EXTRA_TEAM_ALIASES.get(team.id) || [])]);
}

function searchName(team) {
  return SEARCH_NAME_OVERRIDES.get(team.id) || team.name || team.officialName || team.id;
}

function buildQueries(fixture, homeTeam, awayTeam) {
  const home = searchName(homeTeam);
  const away = searchName(awayTeam);
  const queries = [
    `${home} vs ${away} Highlights 2026 FIFA World Cup`,
    `${home} ${away} 2026 FIFA World Cup highlights`,
    `${away} vs ${home} Highlights 2026 FIFA World Cup`
  ];

  if (Number.isFinite(fixture.score?.home) && Number.isFinite(fixture.score?.away)) {
    queries.push(`${home} ${fixture.score.home}-${fixture.score.away} ${away} 2026 FIFA World Cup highlights`);
    queries.push(`${away} ${fixture.score.away}-${fixture.score.home} ${home} 2026 FIFA World Cup highlights`);
  }

  return unique(queries);
}

function fixtureShouldBeProcessed(fixture) {
  if (args.onlyId && fixture.id !== args.onlyId) {
    return false;
  }

  if (fixture.status !== "FT") {
    return false;
  }

  if (!fixture.homeTeamId || !fixture.awayTeamId) {
    return false;
  }

  if (fixture.highlightVideo && !args.refreshExisting) {
    return false;
  }

  if (fixture.highlightVideoReview && args.skipReviewed) {
    return false;
  }

  return true;
}

function fixtureLabel(fixture, teamsById) {
  const home = teamsById.get(fixture.homeTeamId)?.name || fixture.homeTeamId;
  const away = teamsById.get(fixture.awayTeamId)?.name || fixture.awayTeamId;
  const score =
    Number.isFinite(fixture.score?.home) && Number.isFinite(fixture.score?.away)
      ? ` ${fixture.score.home}-${fixture.score.away}`
      : "";
  return `${home}${score} ${away}`;
}

function titleRejectReason(title) {
  for (const pattern of REJECT_TITLE_PATTERNS) {
    if (pattern.test(title)) {
      return `Rejected title pattern: ${pattern}`;
    }
  }

  return "";
}

function matchTeamInTitle(titleText, team) {
  return teamAliases(team).find((alias) => containsNormalizedPhrase(titleText, alias)) || "";
}

function scorelinesInTitle(title) {
  return [...String(title || "").matchAll(/(?:^|[^\d])(\d{1,2})\s*[-:]\s*(\d{1,2})(?!\d)/g)].map((match) => [
    Number(match[1]),
    Number(match[2])
  ]);
}

function scorelineMatchesFixture(fixture, title) {
  const homeScore = Number(fixture.score?.home);
  const awayScore = Number(fixture.score?.away);
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
    return false;
  }

  return scorelinesInTitle(title).some(
    ([first, second]) =>
      (first === homeScore && second === awayScore) || (first === awayScore && second === homeScore)
  );
}

function parseDurationSeconds(durationText) {
  const text = String(durationText || "").trim();
  if (!/^\d+(?::\d{1,2}){1,2}$/.test(text)) {
    return null;
  }

  const parts = text.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  return parts.reduce((total, part) => total * 60 + part, 0);
}

function titleHasWorldCupContext(titleText) {
  return /\bworld cup\b/.test(titleText) || /\bfifa\b/.test(titleText);
}

function isFoxOembed(oembed) {
  return (
    normalize(oembed?.author_name) === normalize(FOX_SOURCE_NAME) &&
    /\/@foxsports\/?$/.test(String(oembed?.author_url || ""))
  );
}

function evaluateCandidate(fixture, homeTeam, awayTeam, candidate, oembed) {
  const title = oembed?.title || candidate.title || "";
  const titleText = normalize(title);
  const homeMatch = matchTeamInTitle(titleText, homeTeam);
  const awayMatch = matchTeamInTitle(titleText, awayTeam);
  const rejectReason = titleRejectReason(title);
  const durationSeconds = parseDurationSeconds(candidate.durationText);
  const reasons = [];

  if (candidate.channelId && candidate.channelId !== FOX_CHANNEL_ID) {
    reasons.push(`channel ${candidate.channelId} is not ${FOX_SOURCE_NAME}`);
  }

  if (!candidate.channelId && candidate.channelHandle && candidate.channelHandle !== `/${FOX_HANDLE}`) {
    reasons.push(`channel handle ${candidate.channelHandle} is not ${FOX_HANDLE}`);
  }

  if (!isFoxOembed(oembed)) {
    reasons.push(`oEmbed author is ${oembed?.author_name || "unknown"}, not ${FOX_SOURCE_NAME}`);
  }

  if (!/\b2026\b/.test(titleText)) {
    reasons.push("title missing 2026");
  }

  if (!titleHasWorldCupContext(titleText)) {
    reasons.push("title missing FIFA World Cup context");
  }

  if (!/\bhighlights?\b/i.test(title)) {
    reasons.push("title is not a highlights video");
  }

  if (!homeMatch) {
    reasons.push(`title does not match ${homeTeam.name}`);
  }

  if (!awayMatch) {
    reasons.push(`title does not match ${awayTeam.name}`);
  }

  if (rejectReason) {
    reasons.push(rejectReason);
  }

  if (scorelinesInTitle(title).length && !scorelineMatchesFixture(fixture, title)) {
    reasons.push("title scoreline does not match fixture");
  }

  if (Number.isFinite(durationSeconds) && durationSeconds > MAX_HIGHLIGHT_SECONDS) {
    reasons.push(`duration ${durationSeconds}s is too long for a highlight button`);
  }

  if (Number.isFinite(durationSeconds) && durationSeconds < MIN_HIGHLIGHT_SECONDS) {
    reasons.push(`duration ${durationSeconds}s is too short for match highlights`);
  }

  const accepted = reasons.length === 0;
  let score = 0;
  if (accepted) {
    score += 100;
    if (candidate.channelId === FOX_CHANNEL_ID) score += 15;
    if (isFoxOembed(oembed)) score += 15;
    if (/\bmatch highlights?\b/i.test(title)) score += 10;
    if (/round of 32/i.test(title) && /round-of-32/i.test(fixture.round || "")) score += 4;
    if (Number.isFinite(durationSeconds) && durationSeconds >= 60 && durationSeconds <= MAX_HIGHLIGHT_SECONDS) {
      score += 3;
    }
  }

  return {
    accepted,
    score,
    reasons,
    title,
    homeMatch,
    awayMatch,
    durationSeconds
  };
}

async function fetchText(url) {
  let lastError = null;

  for (let attempt = 1; attempt <= FETCH_RETRY_COUNT; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
        }
      });

      if (!response.ok) {
        const error = new Error(`${response.status} ${response.statusText}`);
        error.status = response.status;
        throw error;
      }

      return response.text();
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_RETRY_COUNT) {
        await sleep(error?.status === 429 ? 15000 * attempt : 1000 * attempt);
      }
    }
  }

  throw lastError || new Error("fetch failed");
}

async function fetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(text);
}

async function searchOfficialChannel(query) {
  if (searchCache.has(query)) {
    return searchCache.get(query);
  }

  await sleep(SEARCH_DELAY_MS);
  const url = `https://www.youtube.com/${FOX_HANDLE}/search?query=${encodeURIComponent(query)}`;
  const html = await fetchText(url);
  const initialData = extractInitialData(html);
  const candidates = collectVideoRenderers(initialData)
    .slice(0, MAX_RESULTS_PER_SEARCH)
    .map((renderer) => rendererToCandidate(renderer, query))
    .filter(Boolean);

  searchCache.set(query, candidates);
  return candidates;
}

async function getOembed(videoId) {
  if (oembedCache.has(videoId)) {
    return oembedCache.get(videoId);
  }

  await sleep(OEMBED_DELAY_MS);
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`
  )}&format=json`;
  const metadata = await fetchJson(url);
  oembedCache.set(videoId, metadata);
  return metadata;
}

function looksPossibleFromSearch(fixture, homeTeam, awayTeam, candidate) {
  const titleText = normalize(candidate.title);
  return (
    /\b2026\b/.test(titleText) &&
    titleHasWorldCupContext(titleText) &&
    /\bhighlights?\b/i.test(candidate.title) &&
    Boolean(matchTeamInTitle(titleText, homeTeam)) &&
    Boolean(matchTeamInTitle(titleText, awayTeam)) &&
    !titleRejectReason(candidate.title) &&
    (!scorelinesInTitle(candidate.title).length || scorelineMatchesFixture(fixture, candidate.title))
  );
}

function selectedAccepted(evaluated) {
  const accepted = evaluated
    .filter((entry) => entry.evaluation.accepted)
    .sort((a, b) => b.evaluation.score - a.evaluation.score);

  if (!accepted.length) {
    return { selected: null, ambiguous: [] };
  }

  const topScore = accepted[0].evaluation.score;
  const ambiguous = accepted.filter((entry) => entry.evaluation.score === topScore);
  if (ambiguous.length > 1) {
    return { selected: null, ambiguous };
  }

  return { selected: accepted[0], ambiguous: [] };
}

async function findHighlightVideo(fixture, homeTeam, awayTeam) {
  const queries = buildQueries(fixture, homeTeam, awayTeam);
  const seenVideoIds = new Set();
  const evaluated = [];

  for (const query of queries) {
    const candidates = await searchOfficialChannel(query);

    for (const candidate of candidates) {
      if (seenVideoIds.has(candidate.videoId)) {
        continue;
      }

      seenVideoIds.add(candidate.videoId);
      if (!looksPossibleFromSearch(fixture, homeTeam, awayTeam, candidate)) {
        continue;
      }

      const oembed = await getOembed(candidate.videoId);
      const evaluation = evaluateCandidate(fixture, homeTeam, awayTeam, candidate, oembed);
      evaluated.push({ candidate, oembed, evaluation });
    }

    const accepted = selectedAccepted(evaluated);
    if (accepted.selected || accepted.ambiguous.length) {
      return {
        ...accepted,
        evaluated
      };
    }
  }

  return {
    selected: null,
    ambiguous: [],
    evaluated
  };
}

function makeHighlightVideo(entry, checkedAt) {
  return {
    platform: "youtube",
    url: entry.candidate.url,
    sourceName: FOX_SOURCE_NAME,
    channelId: FOX_CHANNEL_ID,
    publishedAt: checkedAt,
    checkedAt
  };
}

function makeReview(status, checkedAt, note) {
  return {
    status,
    platform: "youtube",
    sourceName: FOX_SOURCE_NAME,
    channelId: FOX_CHANNEL_ID,
    checkedAt,
    note
  };
}

function shouldWriteReview(fixture, nextReview) {
  const current = fixture.highlightVideoReview;
  if (!current || typeof current !== "object" || Array.isArray(current)) {
    return true;
  }

  if (args.refreshReviewedChecks) {
    return true;
  }

  return (
    current.status !== nextReview.status ||
    current.platform !== nextReview.platform ||
    current.sourceName !== nextReview.sourceName ||
    current.channelId !== nextReview.channelId ||
    current.note !== nextReview.note
  );
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
    url: entry.candidate.url,
    title: entry.evaluation.title,
    query: entry.candidate.query,
    sourceName: entry.candidate.sourceName,
    channelId: entry.candidate.channelId,
    durationSeconds: entry.evaluation.durationSeconds,
    score: entry.evaluation.score,
    reasons: entry.evaluation.reasons
  };
}

function dataSummary(fixturesData) {
  const summary = {
    completed: 0,
    highlightVideo: 0,
    highlightVideoReview: 0,
    missingDisposition: 0
  };

  for (const fixture of fixturesData.fixtures || []) {
    if (fixture.status !== "FT") {
      continue;
    }

    summary.completed += 1;
    if (fixture.highlightVideo) summary.highlightVideo += 1;
    if (fixture.highlightVideoReview) summary.highlightVideoReview += 1;
    if (!fixture.highlightVideo && !fixture.highlightVideoReview) summary.missingDisposition += 1;
  }

  return summary;
}

async function writeReport(report, checkedAt) {
  const reportPath =
    args.reportPath ||
    path.join(
      defaultReportDir,
      `youtube-highlights-${checkedAt.replace(/[:]/g, "-")}-${process.pid}${args.dryRun ? "-dry-run" : ""}.json`
    );
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
}

const [fixturesData, teamsData] = await Promise.all([
  JSON.parse(await readFile(fixturesPath, "utf8")),
  JSON.parse(await readFile(teamsPath, "utf8"))
]);
const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
const checkedAt = localIso();
const fixtures = (fixturesData.fixtures || [])
  .filter((fixture) => fixtureShouldBeProcessed(fixture) && teamsById.has(fixture.homeTeamId) && teamsById.has(fixture.awayTeamId))
  .slice(0, args.limit || undefined);
const report = {
  generatedAt: new Date().toISOString(),
  checkedAt,
  dryRun: args.dryRun,
  filters: {
    refreshExisting: args.refreshExisting,
    refreshReviewedChecks: args.refreshReviewedChecks,
    skipReviewed: args.skipReviewed,
    strict: args.strict,
    concurrency: args.concurrency,
    limit: args.limit,
    onlyId: args.onlyId
  },
  before: dataSummary(fixturesData),
  processed: [],
  errors: []
};

console.log(
  `Current YouTube highlight sync: ${fixtures.length} fixture${fixtures.length === 1 ? "" : "s"} queued (${args.dryRun ? "dry run" : "write mode"}, concurrency ${args.concurrency}).`
);

let linked = 0;
let reviewed = 0;
let unchangedReviews = 0;

async function processFixture(fixture, index) {
  const homeTeam = teamsById.get(fixture.homeTeamId);
  const awayTeam = teamsById.get(fixture.awayTeamId);
  const label = fixtureLabel(fixture, teamsById);
  console.log(`[${index + 1}/${fixtures.length}] ${label}`);

  try {
    const result = await findHighlightVideo(fixture, homeTeam, awayTeam);
    const bestRejected = result.evaluated
      .filter((entry) => !entry.evaluation.accepted)
      .sort((a, b) => b.evaluation.score - a.evaluation.score)
      .slice(0, 5)
      .map(summarizeEntry);

    if (result.selected) {
      if (!args.dryRun) {
        fixture.highlightVideo = makeHighlightVideo(result.selected, checkedAt);
        delete fixture.highlightVideoReview;
      }
      linked += 1;
      console.log(`  [${index + 1}/${fixtures.length}] linked ${result.selected.candidate.url} (${result.selected.evaluation.title})`);
      report.processed.push({
        order: index,
        id: fixture.id,
        label,
        status: "linked",
        selected: summarizeEntry(result.selected),
        rejected: bestRejected
      });
      return;
    }

    if (result.ambiguous.length) {
      const review = makeReview(
        "needs-review",
        checkedAt,
        "Multiple official FOX Sports YouTube highlight candidates matched this fixture; choose one manually before showing a play button."
      );
      if (!args.dryRun && shouldWriteReview(fixture, review)) {
        delete fixture.highlightVideo;
        fixture.highlightVideoReview = review;
        reviewed += 1;
      } else {
        unchangedReviews += 1;
      }
      console.log(`  [${index + 1}/${fixtures.length}] multiple official candidates matched; left button hidden for review`);
      report.processed.push({
        order: index,
        id: fixture.id,
        label,
        status: "needs-review",
        candidates: result.ambiguous.map(summarizeEntry),
        rejected: bestRejected
      });
      return;
    }

    const review = makeReview(
      "not-found",
      checkedAt,
      "No official FOX Sports YouTube highlights video matched this fixture during the automated channel check."
    );
    if (!args.dryRun && shouldWriteReview(fixture, review)) {
      delete fixture.highlightVideo;
      fixture.highlightVideoReview = review;
      reviewed += 1;
      console.log(`  [${index + 1}/${fixtures.length}] no official FOX Sports highlight found; recorded checked status`);
    } else {
      unchangedReviews += 1;
      console.log(`  [${index + 1}/${fixtures.length}] no official FOX Sports highlight found; existing checked status unchanged`);
    }
    report.processed.push({
      order: index,
      id: fixture.id,
      label,
      status: "not-found",
      rejected: bestRejected
    });
  } catch (error) {
    console.log(`  [${index + 1}/${fixtures.length}] error: ${error.message}`);
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

await Promise.all(Array.from({ length: Math.min(args.concurrency, Math.max(fixtures.length, 1)) }, () => worker()));

if (!args.dryRun && (linked || reviewed)) {
  fixturesData.updatedAt = new Date().toISOString();
  await writeFile(fixturesPath, `${JSON.stringify(fixturesData, null, 2)}\n`);
}

report.processed.sort((a, b) => a.order - b.order);
report.errors.sort((a, b) => a.order - b.order);
report.after = dataSummary(fixturesData);
report.summary = {
  queued: fixtures.length,
  linked,
  reviewed,
  unchangedReviews,
  errors: report.errors.length
};

const reportPath = await writeReport(report, checkedAt);
console.log(`Current YouTube highlight report: ${reportPath}`);
console.log(
  `Current YouTube highlight sync complete: linked ${linked}, reviewed ${reviewed}, unchanged reviewed checks ${unchangedReviews}, errors ${report.errors.length}.`
);

if (report.errors.length && args.strict) {
  process.exitCode = 1;
}
