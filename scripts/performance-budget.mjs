#!/usr/bin/env node

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch (error) {
  console.error("Playwright is required for performance budget checks. Run pnpm install first.");
  console.error(error.message);
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const locales = ["en", "zh", "es", "ko"];
const desktop = { width: 1440, height: 950 };
const mobile = { width: 390, height: 844, isMobile: true };
const waitAfterIdleMs = Number(process.env.PERF_BUDGET_SETTLE_MS || 4500);
const mimeTypes = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"]
]);

const scenarios = [
  ...locales.flatMap((locale) => [
    {
      label: `home ${locale} desktop`,
      url: `/?lang=${locale}`,
      viewport: desktop,
      selector: "#match-list",
      budget: { transferKB: 12000, decodedKB: 12000 },
      forbiddenPaths: ["/data/history.json", "/data/historical-player-profiles.json"]
    },
    {
      label: `home ${locale} mobile`,
      url: `/?lang=${locale}`,
      viewport: mobile,
      selector: "#match-list",
      budget: { transferKB: 12000, decodedKB: 12000 },
      forbiddenPaths: ["/data/history.json", "/data/historical-player-profiles.json"]
    },
    {
      label: `highlights 2026 ${locale}`,
      url: `/highlights.html?lang=${locale}`,
      viewport: desktop,
      selector: ".best-xi-section, main",
      budget: { transferKB: 11000, decodedKB: 11000 },
      forbiddenPaths: ["/data/history.json", "/data/historical-player-profiles.json"]
    },
    {
      label: `highlights 2022 ${locale}`,
      url: `/highlights.html?year=2022&lang=${locale}`,
      viewport: desktop,
      selector: ".best-xi-section, main",
      budget: { transferKB: 11000, decodedKB: 11000 },
      forbiddenPaths: ["/data/history.json", "/data/historical-player-profiles.json"],
      requiredPaths: ["/data/history/2022.json", "/data/historical-player-profiles/2022.json"]
    }
  ])
];

function safePath(url) {
  const decoded = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const resolved = path.resolve(root, decoded === "/" ? "index.html" : `.${decoded}`);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    return null;
  }
  return resolved;
}

function kb(value) {
  return Number.isFinite(value) && value > 0 ? Math.round(value / 1024) : 0;
}

function createStaticServer() {
  return createServer(async (request, response) => {
    const filePath = safePath(request.url);
    if (!filePath) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    try {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      response.writeHead(200, {
        "Content-Length": String(fileStat.size),
        "Content-Type": mimeTypes.get(path.extname(filePath)) || "application/octet-stream"
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
}

async function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address().port);
    });
  });
}

async function measure(browser, baseUrl, scenario) {
  const context = await browser.newContext({
    viewport: {
      width: scenario.viewport.width,
      height: scenario.viewport.height
    },
    isMobile: Boolean(scenario.viewport.isMobile),
    userAgent: scenario.viewport.isMobile
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      : undefined
  });
  const page = await context.newPage();
  const startedAt = Date.now();
  await page.goto(`${baseUrl}${scenario.url}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector(scenario.selector, { timeout: 15000 });
  const selectorMs = Date.now() - startedAt;
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(waitAfterIdleMs);

  const result = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource").map((entry) => ({
      name: entry.name,
      transferSize: entry.transferSize,
      decodedBodySize: entry.decodedBodySize
    }));
    return {
      resources,
      cards: document.querySelectorAll(".player-card, .highlights-card, .standings-card").length
    };
  });
  await context.close();

  const localResources = result.resources.filter((entry) => entry.name.startsWith(baseUrl));
  const transferKB = kb(localResources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0));
  const decodedKB = kb(localResources.reduce((sum, entry) => sum + (entry.decodedBodySize || 0), 0));
  const paths = localResources.map((entry) => new URL(entry.name).pathname);
  return {
    label: scenario.label,
    selectorMs,
    transferKB,
    decodedKB,
    cards: result.cards,
    paths
  };
}

function assertScenario(scenario, result) {
  const failures = [];
  if (result.transferKB > scenario.budget.transferKB) {
    failures.push(`transfer ${result.transferKB} KB > ${scenario.budget.transferKB} KB`);
  }
  if (result.decodedKB > scenario.budget.decodedKB) {
    failures.push(`decoded ${result.decodedKB} KB > ${scenario.budget.decodedKB} KB`);
  }
  for (const forbiddenPath of scenario.forbiddenPaths || []) {
    if (result.paths.includes(forbiddenPath)) {
      failures.push(`loaded forbidden aggregate payload ${forbiddenPath}`);
    }
  }
  for (const requiredPath of scenario.requiredPaths || []) {
    if (!result.paths.includes(requiredPath)) {
      failures.push(`did not load required split payload ${requiredPath}`);
    }
  }
  if (failures.length) {
    throw new Error(`${scenario.label}: ${failures.join("; ")}`);
  }
}

const server = createStaticServer();
const port = await listen(server);
const baseUrl = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const scenario of scenarios) {
    const result = await measure(browser, baseUrl, scenario);
    assertScenario(scenario, result);
    results.push(result);
  }
} finally {
  await browser.close();
  server.close();
}

console.log("Performance budget passed.");
for (const result of results) {
  console.log(
    `${result.label}: selector ${result.selectorMs} ms, transfer ${result.transferKB} KB, decoded ${result.decodedKB} KB, cards ${result.cards}`
  );
}
