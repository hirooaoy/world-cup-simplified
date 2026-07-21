#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"]
]);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const historicalPlayerIndex = JSON.parse(
  await readFile(path.join(root, "data", "ball-boy-historical-players.json"), "utf8")
);

function getHistoricalPersonYearGroups(displayName, teamName) {
  return (historicalPlayerIndex.players || [])
    .filter((player) => player.displayName === displayName && player.teamName === teamName)
    .map((player) => [...(player.tournamentYears || [])].sort((left, right) => left - right))
    .sort((left, right) => left[0] - right[0]);
}

function assertHistoricalPersonYearGroups(displayName, teamName, expected) {
  const actual = getHistoricalPersonYearGroups(displayName, teamName);
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${displayName} (${teamName}) historical person grouping should be ${JSON.stringify(expected)}; measured ${JSON.stringify(actual)}.`
  );
}

// Portrait provenance changes between these editions; both must remain one person.
assertHistoricalPersonYearGroups("Luis Suárez", "Uruguay", [[2010, 2014, 2018]]);
assertHistoricalPersonYearGroups("Neymar", "Brazil", [[2014, 2018, 2022]]);

// Exact-name/team collisions are separate people and must not be merged by the fallback.
assertHistoricalPersonYearGroups("Ali Karimi", "Iran", [[2006], [2022]]);
assertHistoricalPersonYearGroups("Andoni Goikoetxea", "Spain", [[1986], [1994]]);
assertHistoricalPersonYearGroups("Juanito", "Spain", [[1982], [2006]]);
assertHistoricalPersonYearGroups("József Tóth", "Hungary", [[1954], [1982]]);
assertHistoricalPersonYearGroups("Júlio César", "Brazil", [[1986], [2010, 2014]]);
assertHistoricalPersonYearGroups("Júnior", "Brazil", [[1982], [2002]]);
assertHistoricalPersonYearGroups("Oscar", "Brazil", [[1982], [2014]]);

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const resolved = path.resolve(root, decoded === "/" ? "index.html" : `.${decoded}`);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    return null;
  }
  return resolved;
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
    if (!fileStat.isFile()) {
      throw new Error("Not a file");
    }
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
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const requestedPaths = [];
  page.on("request", (request) => {
    requestedPaths.push(new URL(request.url()).pathname);
  });
  await page.goto(`${baseUrl}?ballBoyPlayerSearchSmoke=1&date=2026-06-20`, { waitUntil: "load" });
  await page.locator("#scout-launcher").click();
  const input = page.locator("#scout-input");
  const send = page.locator(".scout-send");

  await input.fill("messi");
  await send.click();
  const messiAnswer = page.locator(".scout-answer.is-player").last();
  await messiAnswer.getByRole("heading", { name: "Lionel Messi" }).waitFor({ state: "visible" });
  assert(
    (await messiAnswer.locator(".scout-answer-lead").textContent())?.trim() ===
      "Here’s more about Lionel Messi.",
    "A shorthand player search should introduce the player before rendering the card."
  );

  await page.locator("#scout-reset").click();
  await input.fill("who is raul");
  await send.click();
  const clarification = page.locator(".scout-answer.is-clarify").last();
  await clarification.waitFor({ state: "visible" });
  const clarificationMetrics = await clarification.evaluate((answer) => ({
    groupLabels: [...answer.querySelectorAll(".scout-clarify-group > .scout-section-label")]
      .map((label) => label.textContent.trim()),
    followUps: answer.querySelectorAll(".scout-followup").length,
    lead: answer.querySelector(".scout-answer-lead")?.textContent.trim() || "",
    options: [...answer.querySelectorAll(".scout-clarify-list button")]
      .map((button) => button.textContent.replace(/\s+/g, " ").trim()),
    overflow: answer.scrollWidth - answer.clientWidth
  }));
  assert(
    clarificationMetrics.lead === "Do you mean:" &&
      clarificationMetrics.groupLabels.join("|") === "Current World Cup|Past World Cups" &&
      clarificationMetrics.followUps === 0 &&
      clarificationMetrics.options.length === 6 &&
      clarificationMetrics.options.some((text) =>
        text.includes("Raúl Jiménez") &&
        text.includes("Mexico · Striker • 2026")
      ) &&
      clarificationMetrics.options.some((text) =>
        text.includes("Raúl Rangel") &&
        text.includes("Mexico · Goalkeeper • 2026")
      ) &&
      clarificationMetrics.options.some((text) =>
        text.includes("Raúl") &&
        text.includes("Spain · Forward • 1998, 2002, 2006")
      ) &&
      clarificationMetrics.options.some((text) =>
        text.includes("Raul Meireles") &&
        text.includes("Portugal · Position unavailable • 2010")
      ) &&
      requestedPaths.includes("/data/ball-boy-historical-players.json") &&
      !requestedPaths.includes("/data/historical-player-profiles.json") &&
      clarificationMetrics.overflow <= 1,
    `Raul clarification should include current and historical players with position and year metadata. Measured ${JSON.stringify(clarificationMetrics)}.`
  );

  await clarification.locator("button", { hasText: "Spain · Forward" }).click();
  const historicalCard = page.locator(".scout-player-card.is-historical").last();
  await historicalCard.waitFor({ state: "visible" });
  assert(
    requestedPaths.includes("/data/historical-player-profiles.json"),
    "The full historical profile dataset should load only after a historical player is selected."
  );
  const historicalMetrics = await historicalCard.evaluate((card) => ({
    factValues: [...card.querySelectorAll(".scout-player-fact-row > div")]
      .map((fact) => ({
        label: fact.querySelector("span")?.textContent.trim() || "",
        value: fact.querySelector("strong")?.textContent.trim() || ""
      })),
    header: card.querySelector(".scout-entity-header")?.textContent.replace(/\s+/g, " ").trim() || "",
    hasPlayerDetails: Boolean(card.querySelector('[aria-label="Player details"]')),
    lead: card.closest(".scout-answer")?.querySelector(".scout-answer-lead")?.textContent.trim() || ""
  }));
  assert(
    historicalMetrics.lead === "Here’s more about Raúl." &&
      historicalMetrics.header.includes("Raúl") &&
      historicalMetrics.header.includes("Spain · Forward • 1998, 2002, 2006") &&
      historicalMetrics.factValues.some((fact) => fact.label === "Goals" && fact.value === "5") &&
      historicalMetrics.factValues.some((fact) => fact.label === "World Cups" && fact.value === "3") &&
      !historicalMetrics.hasPlayerDetails,
    `Selecting historical Raúl should open a grouped archive player card. Measured ${JSON.stringify(historicalMetrics)}.`
  );

  await page.locator(".scout-followup", { hasText: "How many World Cup goals did Raúl score?" }).last().click();
  await page.waitForFunction(() => {
    const answers = [...document.querySelectorAll(".scout-answer.is-player")];
    return answers.length >= 2 && answers.at(-1)?.querySelector(".scout-answer-lead")
      ?.textContent.includes("5 goals");
  });

  await page.locator("#scout-reset").click();
  await input.fill("Who is Raul from Spain in 2002?");
  await send.click();
  const singleEditionCard = page.locator(".scout-player-card.is-historical").last();
  await singleEditionCard.waitFor({ state: "visible" });
  const singleEditionMetrics = await singleEditionCard.evaluate((card) => ({
    facts: [...card.querySelectorAll(".scout-player-fact-row > div")].map((fact) => ({
      label: fact.querySelector("span")?.textContent.trim() || "",
      value: fact.querySelector("strong")?.textContent.trim() || ""
    })),
    header: card.querySelector(".scout-entity-header")?.textContent.replace(/\s+/g, " ").trim() || ""
  }));
  assert(
    singleEditionMetrics.header.includes("Spain · Forward • 2002") &&
      singleEditionMetrics.facts.some((fact) => fact.label === "Goals" && fact.value === "3") &&
      singleEditionMetrics.facts.some((fact) => fact.label === "World Cups" && fact.value === "1"),
    `A year-qualified historical search should narrow to that tournament edition. Measured ${JSON.stringify(singleEditionMetrics)}.`
  );

  await page.locator("#scout-reset").click();
  await input.fill("who is raul jimene");
  await send.click();
  const partialCurrentCard = page.locator(".scout-player-card:not(.is-historical)").last();
  await partialCurrentCard.waitFor({ state: "visible" });
  assert(
    (await partialCurrentCard.innerText()).includes("Raúl Jiménez"),
    "A bounded partial full-name search should resolve the current player."
  );

  console.log("Ball Boy player search smoke passed.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
