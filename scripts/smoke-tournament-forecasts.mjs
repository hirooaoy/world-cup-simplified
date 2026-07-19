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
const historyData = JSON.parse(await readFile(path.join(root, "data/history.json"), "utf8"));
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

async function readProjectedCard(matchNumber, fixtureTransform = () => {}) {
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

  const result = await page.evaluate((targetMatchNumber) => {
    const card = document.querySelector(`.progress-match[data-match-number="${targetMatchNumber}"]`);
    const pills = [...card.querySelectorAll(".knockout-likelihood")];
    return {
      basis: card.querySelector(".knockout-likelihood-list")?.dataset.outcomeBasis || "",
      keys: pills.map((pill) => pill.dataset.outcome || ""),
      teamIds: [...card.querySelectorAll(".knockout-team[data-team-id]")].map(
        (team) => team.dataset.teamId || ""
      ),
      texts: pills.map((pill) => pill.textContent.replace(/\s+/g, " ").trim()),
      tooltips: pills.map((pill) => pill.getAttribute("data-tooltip") || "")
    };
  }, matchNumber);

  const fixture = patchedFixtures.fixtures.find((candidate) => Number(candidate.matchNumber) === Number(matchNumber));
  const [renderedHomeTeamId, renderedAwayTeamId] = result.teamIds;
  const storedProjection = fixture?.projection || (fixture?.conditionalProjections || []).find((candidate) => {
    const storedKey = [candidate.homeTeamId, candidate.awayTeamId].sort().join("|");
    return storedKey === [renderedHomeTeamId, renderedAwayTeamId].sort().join("|");
  });
  const reversed = storedProjection?.homeTeamId === renderedAwayTeamId;
  const expectedHome = reversed ? storedProjection?.away : storedProjection?.home;
  const expectedAway = reversed ? storedProjection?.home : storedProjection?.away;
  result.expectedTexts = storedProjection
    ? [`${renderedHomeTeamId} ${expectedHome}%`, `TIE ${storedProjection.draw}%`, `${renderedAwayTeamId} ${expectedAway}%`]
    : [];

  await context.close();
  return result;
}

try {
  assert(
    fixturesData.fixtures
      .filter((fixture) => fixture.stage === "group")
      .every((fixture) => fixture.shootoutOutlook === undefined && fixture.shootoutForecast === undefined),
    "Group-stage ties must end as ties without penalty-shootout tooltip data."
  );
  assert(
    historyData.fixtures
      .filter((fixture) => fixture.group)
      .every((fixture) => fixture.shootoutOutlook === undefined),
    "Historical group-stage ties must not receive penalty-shootout tooltip data."
  );

  const englandArgentina = await readProjectedCard(102);
  assert(
    englandArgentina.teamIds.join("|") === "ENG|ARG" &&
      englandArgentina.basis === "" &&
      englandArgentina.keys.length === 0 &&
      englandArgentina.texts.length === 0,
    `Completed England-Argentina should no longer display a pre-match forecast. Measured ${JSON.stringify(englandArgentina)}.`
  );

  const englandFinal = await readProjectedCard(104, (data) => {
    const final = data.fixtures.find((fixture) => fixture.matchNumber === 104);
    final.awayTeamId = "ENG";
    delete final.projection;
  });
  assert(
    englandFinal.teamIds.join("|") === "ESP|ENG" &&
      englandFinal.basis === "conditional-model" &&
      englandFinal.keys.join("|") === "home|tie|away" &&
      englandFinal.texts.join("|") === englandFinal.expectedTexts.join("|") &&
      englandFinal.tooltips[0].includes("Online-calibrated from Opta and markets") &&
      englandFinal.tooltips[1].startsWith("If it goes to penalties") &&
      englandFinal.tooltips[2].includes("direct odds replace it once set"),
    `Spain-England should use the sourced conditional final forecast. Measured ${JSON.stringify(englandFinal)}.`
  );

  const argentinaFinal = await readProjectedCard(104);
  assert(
    argentinaFinal.teamIds.join("|") === "ESP|ARG" &&
      argentinaFinal.basis === "loaded" &&
      argentinaFinal.keys.join("|") === "home|tie|away" &&
      argentinaFinal.texts.join("|") === argentinaFinal.expectedTexts.join("|") &&
      argentinaFinal.tooltips[1].startsWith("If it goes to penalties"),
    `Confirmed Spain-Argentina should use its promoted direct fixture forecast. Measured ${JSON.stringify(argentinaFinal)}.`
  );

  const argentinaThirdPlace = await readProjectedCard(103, (data) => {
    const thirdPlace = data.fixtures.find((fixture) => fixture.matchNumber === 103);
    thirdPlace.awayTeamId = "ARG";
    thirdPlace.status = "SCHEDULED";
    delete thirdPlace.projection;
    delete thirdPlace.score;
    delete thirdPlace.goalsHome;
    delete thirdPlace.goalsAway;
  });
  assert(
    argentinaThirdPlace.teamIds.join("|") === "FRA|ARG" &&
      argentinaThirdPlace.basis === "conditional-model" &&
      argentinaThirdPlace.keys.join("|") === "home|tie|away" &&
      argentinaThirdPlace.texts.join("|") === argentinaThirdPlace.expectedTexts.join("|") &&
      argentinaThirdPlace.tooltips[1].startsWith("If it goes to penalties"),
    `France-Argentina should use the online-calibrated third-place scenario. Measured ${JSON.stringify(argentinaThirdPlace)}.`
  );

  const englandThirdPlace = await readProjectedCard(103);
  assert(
    englandThirdPlace.teamIds.join("|") === "FRA|ENG" &&
      englandThirdPlace.basis === "" &&
      englandThirdPlace.keys.length === 0 &&
      englandThirdPlace.texts.length === 0,
    `Completed France-England should no longer display a pre-match forecast. Measured ${JSON.stringify(englandThirdPlace)}.`
  );

  const unsourcedFinal = await readProjectedCard(104, (data) => {
    const final = data.fixtures.find((fixture) => fixture.matchNumber === 104);
    delete final.projection;
    delete final.conditionalProjections;
  });
  assert(
    unsourcedFinal.teamIds.join("|") === "ESP|ARG" &&
      unsourcedFinal.basis === "" &&
      unsourcedFinal.keys.length === 0 &&
      unsourcedFinal.texts.length === 0,
    `An unsourced projected final must not fall back to ranking percentages. Measured ${JSON.stringify(unsourcedFinal)}.`
  );

  console.log("Tournament forecast smoke passed: every remaining scenario renders 1X2 with tie-to-penalties context.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
