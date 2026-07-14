#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;

try {
  ({ chromium } = require("playwright"));
} catch (error) {
  console.error("Playwright is required for tournament forecast smoke tests. Run npm install first.");
  console.error(error.message);
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturesData = JSON.parse(await readFile(path.join(root, "data/fixtures.json"), "utf8"));
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"]
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const resolved = path.resolve(root, decoded === "/" ? "index.html" : `.${decoded}`);

  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}

const server = createServer(async (request, response) => {
  const filePath = safePath(request.url || "/");
  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Content-Length": fileStat.size,
      "Content-Type": mimeTypes.get(path.extname(filePath)) || "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

async function readFinalCard(fixtureTransform = () => {}) {
  const patchedFixtures = structuredClone(fixturesData);
  fixtureTransform(patchedFixtures);
  const context = await browser.newContext();

  await context.addInitScript(() => {
    const RealDate = Date;
    const mockNow = new RealDate("2026-07-14T16:00:00-07:00");
    class MockDate extends RealDate {
      constructor(...args) {
        return args.length === 0 ? new RealDate(mockNow) : new RealDate(...args);
      }

      static now() {
        return mockNow.getTime();
      }
    }
    window.Date = MockDate;
  });
  await context.route("**/data/fixtures.json*", (route) =>
    route.fulfill({ body: JSON.stringify(patchedFixtures), contentType: "application/json", status: 200 })
  );

  const page = await context.newPage();
  await page.goto(`${baseUrl}/?view=standings&standingsMode=tournament&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForFunction(() => {
    const matchList = document.querySelector("#match-list");
    return matchList && !matchList.hasAttribute("aria-busy") &&
      document.querySelector('.progress-match[data-match-number="104"]');
  });

  const result = await page.evaluate(() => {
    const finalCard = document.querySelector('.progress-match[data-match-number="104"]');
    const pills = [...finalCard.querySelectorAll(".knockout-likelihood")];
    return {
      basis: finalCard.querySelector(".knockout-likelihood-list")?.dataset.outcomeBasis || "",
      keys: pills.map((pill) => pill.dataset.outcome || ""),
      teamIds: [...finalCard.querySelectorAll(".knockout-team[data-team-id]")].map(
        (team) => team.dataset.teamId || ""
      ),
      texts: pills.map((pill) => pill.textContent.replace(/\s+/g, " ").trim()),
      tooltips: pills.map((pill) => pill.getAttribute("data-tooltip") || "")
    };
  });

  await context.close();
  return result;
}

try {
  const englandFinal = await readFinalCard();
  assert(
    englandFinal.teamIds.join("|") === "ESP|ENG" &&
      englandFinal.basis === "conditional-online" &&
      englandFinal.keys.join("|") === "home|away" &&
      englandFinal.texts.join("|") === "ESP 57%|ENG 43%" &&
      englandFinal.tooltips.every((tooltip) =>
        tooltip.includes("including extra time and penalties") &&
        tooltip.includes("Conditional forecast from Opta and current markets")
      ),
    `Spain-England should use the sourced conditional final forecast. Measured ${JSON.stringify(englandFinal)}.`
  );

  const argentinaFinal = await readFinalCard((data) => {
    const semiFinal = data.fixtures.find((fixture) => fixture.matchNumber === 102);
    semiFinal.projection = { ...semiFinal.projection, home: 31, draw: 32, away: 37 };
  });
  assert(
    argentinaFinal.teamIds.join("|") === "ESP|ARG" &&
      argentinaFinal.basis === "conditional-online" &&
      argentinaFinal.keys.join("|") === "home|away" &&
      argentinaFinal.texts.join("|") === "ESP 58%|ARG 42%" &&
      argentinaFinal.tooltips.every((tooltip) =>
        tooltip.includes("including extra time and penalties") &&
        tooltip.includes("Conditional forecast from Opta and current markets")
      ),
    `Spain-Argentina should use the sourced conditional final forecast. Measured ${JSON.stringify(argentinaFinal)}.`
  );

  const unsourcedFinal = await readFinalCard((data) => {
    const final = data.fixtures.find((fixture) => fixture.matchNumber === 104);
    delete final.conditionalProjections;
  });
  assert(
    unsourcedFinal.teamIds.join("|") === "ESP|ENG" &&
      unsourcedFinal.basis === "" &&
      unsourcedFinal.keys.length === 0 &&
      unsourcedFinal.texts.length === 0,
    `An unsourced projected final must not fall back to ranking percentages. Measured ${JSON.stringify(unsourcedFinal)}.`
  );

  console.log("Tournament forecast smoke passed: sourced conditional pairs render and rank fallback stays disabled.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
