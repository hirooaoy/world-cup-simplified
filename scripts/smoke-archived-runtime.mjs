#!/usr/bin/env node
import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getEditionLiveSyncStatus,
  requestLiveDataForActiveEdition
} from "../edition-runtime.js";
import { DATA_VERSION } from "../app-config.js";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const liveLifecyclePath = fileURLToPath(
  new URL("./fixtures/edition-lifecycle-live.json", import.meta.url)
);
const archivedLifecyclePath = fileURLToPath(
  new URL("./fixtures/edition-lifecycle-archived.json", import.meta.url)
);
const liveLifecycle = JSON.parse(await readFile(liveLifecyclePath, "utf8"));
const archivedLifecycle = JSON.parse(await readFile(archivedLifecyclePath, "utf8"));

const activeNow = "2026-07-14T18:00:00Z";
assert.equal(getEditionLiveSyncStatus(liveLifecycle, activeNow).active, true);
assert.equal(getEditionLiveSyncStatus(archivedLifecycle, activeNow).active, false);
assert.equal(
  getEditionLiveSyncStatus(liveLifecycle, liveLifecycle.liveSyncEndsAt).active,
  false,
  "The live window must remain half-open at its end boundary."
);
assert.equal(
  getEditionLiveSyncStatus({ ...liveLifecycle, liveSyncEndsAt: "invalid" }, activeNow).active,
  false,
  "Invalid lifecycle data must fail closed."
);

let loaderCalls = 0;
const archivedLoad = await requestLiveDataForActiveEdition(archivedLifecycle, async () => {
  loaderCalls += 1;
  return { unexpected: true };
}, activeNow);
assert.equal(archivedLoad.requested, false);
assert.equal(archivedLoad.value, null);
assert.equal(loaderCalls, 0, "Archived mode must not invoke its live-data loader.");

const activeLoad = await requestLiveDataForActiveEdition(liveLifecycle, async () => {
  loaderCalls += 1;
  return { ok: true };
}, activeNow);
assert.equal(activeLoad.requested, true);
assert.deepEqual(activeLoad.value, { ok: true });
assert.equal(loaderCalls, 1, "Active mode must preserve the live-data loader call.");

function createMockResponse() {
  const chunks = [];
  const headers = new Map();
  return {
    chunks,
    headers,
    response: {
      statusCode: 0,
      setHeader(name, value) {
        headers.set(String(name).toLowerCase(), String(value));
      },
      removeHeader(name) {
        headers.delete(String(name).toLowerCase());
      },
      end(chunk = "") {
        chunks.push(String(chunk));
      }
    }
  };
}

async function invokeApi(handler) {
  const result = createMockResponse();
  await handler({ method: "GET" }, result.response);
  assert.equal(result.response.statusCode, 200);
  return {
    headers: result.headers,
    payload: JSON.parse(result.chunks.join("")),
    size: result.chunks.join("").length
  };
}

const previousFetch = globalThis.fetch;
const previousEnv = {
  FIFA_GOAL_EVENTS_ENABLED: process.env.FIFA_GOAL_EVENTS_ENABLED,
  FIFA_LIVE_LINEUP_OVERALL_TIMEOUT_MS: process.env.FIFA_LIVE_LINEUP_OVERALL_TIMEOUT_MS,
  LIVE_DATA_PROVIDER: process.env.LIVE_DATA_PROVIDER,
  TOURNAMENT_LIFECYCLE_FILE: process.env.TOURNAMENT_LIFECYCLE_FILE,
  TOURNAMENT_LIFECYCLE_NOW: process.env.TOURNAMENT_LIFECYCLE_NOW
};

let providerRequests = 0;
try {
  globalThis.fetch = async () => {
    providerRequests += 1;
    return {
      ok: true,
      status: 200,
      async json() {
        return { Results: [] };
      }
    };
  };
  process.env.FIFA_GOAL_EVENTS_ENABLED = "0";
  process.env.FIFA_LIVE_LINEUP_OVERALL_TIMEOUT_MS = "100";
  process.env.LIVE_DATA_PROVIDER = "fifa";
  process.env.TOURNAMENT_LIFECYCLE_FILE = archivedLifecyclePath;
  process.env.TOURNAMENT_LIFECYCLE_NOW = activeNow;

  const { default: handler } = await import("../api/live-data.js");
  const archivedApi = await invokeApi(handler);
  assert.equal(providerRequests, 0, "Archived API mode must make zero upstream provider requests.");
  assert.equal(archivedApi.payload.syncStatus.mode, "static");
  assert.equal(archivedApi.payload.syncStatus.active, false);
  assert.equal(
    archivedApi.payload.syncStatus.checkedAt,
    new Date(archivedLifecycle.archivedAt).toISOString()
  );
  assert.equal(archivedApi.payload.fixturesData, undefined);
  assert.equal(archivedApi.payload.staticData.fixturesDataUrl, "/data/fixtures.json");
  assert(archivedApi.size < 1500, "Archived API response should stay compact.");
  assert.match(
    archivedApi.headers.get("vercel-cdn-cache-control") || "",
    /s-maxage=86400/,
    "Archived API response should use the long static cache policy."
  );

  process.env.TOURNAMENT_LIFECYCLE_FILE = liveLifecyclePath;
  process.env.TOURNAMENT_LIFECYCLE_NOW = activeNow;
  const activeApi = await invokeApi(handler);
  assert(providerRequests > 0, "Active API mode must retain provider synchronization.");
  assert(Array.isArray(activeApi.payload.fixturesData?.fixtures));
  assert(activeApi.payload.standingsData?.groups);
  assert(Array.isArray(activeApi.payload.tournamentData?.groups));
  assert.notEqual(activeApi.payload.syncStatus.mode, "static");

  providerRequests = 0;
  process.env.TOURNAMENT_LIFECYCLE_NOW = liveLifecycle.liveSyncEndsAt;
  const closedWindowApi = await invokeApi(handler);
  assert.equal(providerRequests, 0, "A closed live-state window must also make zero provider requests.");
  assert.equal(closedWindowApi.payload.syncStatus.mode, "static");
} finally {
  globalThis.fetch = previousFetch;
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"]
]);
const fixturesData = JSON.parse(await readFile(path.join(root, "data", "fixtures.json"), "utf8"));
const standingsData = JSON.parse(await readFile(path.join(root, "data", "standings.json"), "utf8"));
const tournamentData = JSON.parse(await readFile(path.join(root, "data", "tournament.json"), "utf8"));
let browserLifecycle = archivedLifecycle;
let browserLifecycleRequests = 0;
const browserLifecycleVersions = [];
let browserLiveDataRequests = 0;

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", "http://127.0.0.1");

  if (requestUrl.pathname === "/data/edition-lifecycle.json") {
    browserLifecycleRequests += 1;
    browserLifecycleVersions.push(requestUrl.searchParams.get("v"));
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(browserLifecycle));
    return;
  }

  if (requestUrl.pathname === "/api/live-data") {
    browserLiveDataRequests += 1;
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({
      fixturesData,
      standingsData,
      tournamentData,
      syncStatus: {
        checkedAt: activeNow,
        ok: true,
        provider: "test"
      }
    }));
    return;
  }

  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const filePath = path.resolve(root, `.${decodeURIComponent(pathname)}`);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error("Not a file");
    }
    response.writeHead(200, {
      "Content-Type": mimeTypes.get(path.extname(filePath)) || "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

async function waitFor(predicate, message, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(message);
}

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext();
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/u, (route) => route.abort());

  const archivedHome = await context.newPage();
  await archivedHome.goto(origin, { waitUntil: "domcontentloaded" });
  await archivedHome.waitForFunction(() => document.body?.dataset.editionState === "review");
  const archivedHomeFooter = await archivedHome.locator("#source-note").evaluate((note) => ({
    releaseTooltipCreatorCount: note.querySelectorAll(".release-tooltip .source-credit, .release-tooltip-note").length,
    text: note.innerText.replace(/\s+/g, " ").trim()
  }));
  assert.deepEqual(
    archivedHomeFooter,
    { releaseTooltipCreatorCount: 0, text: "Sources • Release notes • Made by HA" },
    "Archived homepage footer must show the creator credit outside Release notes."
  );
  await archivedHome.locator("#scout-launcher").click();
  await waitFor(
    () => browserLifecycleRequests >= 2,
    "Ball Boy did not load the shared edition lifecycle."
  );
  assert.deepEqual(
    [...new Set(browserLifecycleVersions)],
    [DATA_VERSION],
    "Homepage and Ball Boy must share the current data cache version so archived lifecycle state cannot stay stale."
  );

  const archivedReport = await context.newPage();
  await archivedReport.goto(`${origin}/report.html`, { waitUntil: "domcontentloaded" });
  await archivedReport.waitForFunction(() =>
    document.querySelector("#source-note")?.innerText.includes("Release notes")
  );
  assert.equal(
    await archivedReport.locator("#source-note .source-freshness").count(),
    0,
    "Archived footers must omit the obsolete data-refresh timestamp."
  );
  const archivedReportFooter = await archivedReport.locator("#source-note").evaluate((note) => ({
    releaseTooltipCreatorCount: note.querySelectorAll(".release-tooltip .source-credit, .release-tooltip-note").length,
    text: note.innerText.replace(/\s+/g, " ").trim()
  }));
  assert.deepEqual(
    archivedReportFooter,
    { releaseTooltipCreatorCount: 0, text: "Sources • Release notes • Made by HA" },
    "Archived Report footer must show the creator credit outside Release notes."
  );
  await archivedReport.waitForTimeout(250);
  assert.equal(
    browserLiveDataRequests,
    0,
    "Archived homepage and Report must make zero /api/live-data requests."
  );

  const localizedFooterExpectations = {
    es: "Fuentes • Notas de la versión • Creado por HA",
    ko: "출처 • 릴리스 노트 • HA 제작",
    zh: "来源 • 发布说明 • 由 HA 制作"
  };
  for (const [language, expectedText] of Object.entries(localizedFooterExpectations)) {
    for (const pathname of ["/", "/report.html"]) {
      const page = await context.newPage();
      await page.goto(`${origin}${pathname}?lang=${language}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction((expected) => {
        const note = document.querySelector("#source-note");
        return note?.innerText.replace(/\s+/g, " ").trim() === expected;
      }, expectedText);
      const footerState = await page.locator("#source-note").evaluate((note) => ({
        releaseTooltipCreatorCount: note.querySelectorAll(".release-tooltip .source-credit, .release-tooltip-note").length,
        text: note.innerText.replace(/\s+/g, " ").trim()
      }));
      assert.deepEqual(
        footerState,
        { releaseTooltipCreatorCount: 0, text: expectedText },
        `${language} ${pathname} footer must keep the creator credit outside Release notes.`
      );
      await page.close();
    }
  }

  browserLifecycle = {
    ...liveLifecycle,
    tournamentStartsAt: "2025-01-01T00:00:00Z",
    liveSyncEndsAt: "2035-01-01T00:00:00Z",
    archiveEligibleAfter: "2035-01-01T00:00:00Z"
  };

  const activeHome = await context.newPage();
  await activeHome.goto(origin, { waitUntil: "domcontentloaded" });
  await waitFor(
    () => browserLiveDataRequests >= 1,
    "Active homepage did not preserve its /api/live-data request."
  );
  await activeHome.locator("#scout-launcher").click();
  await waitFor(
    () => browserLiveDataRequests >= 2,
    "Active Ball Boy did not preserve its /api/live-data request."
  );

  const activeReport = await context.newPage();
  await activeReport.goto(`${origin}/report.html`, { waitUntil: "domcontentloaded" });
  await activeReport.waitForTimeout(250);
  assert.equal(
    browserLiveDataRequests,
    2,
    "Report must not request /api/live-data after its freshness timestamp is removed."
  );

  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

console.log(
  "Archived runtime smoke passed: archived pages make zero live/provider requests, and active mode limits live requests to the homepage and Ball Boy."
);
