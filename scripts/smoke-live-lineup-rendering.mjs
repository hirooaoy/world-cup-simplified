#!/usr/bin/env node
import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

let chromium;
const require = createRequire(import.meta.url);

try {
  ({ chromium } = require("playwright"));
} catch (error) {
  console.error("Playwright is required for live lineup rendering smoke tests. Run npm install first.");
  console.error(error.message);
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const matchId = "match-95-round-of-16-2026-07-07";
const checkedAt = "2026-07-07T17:36:51.017Z";
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"]
]);

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const resolved = path.resolve(root, decoded === "/" ? "index.html" : `.${decoded}`);

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    return null;
  }

  return resolved;
}

function player(name, number, position) {
  return { name, number, position };
}

function benchPlayer(name, number, position) {
  return { name, number, position };
}

const homeStarters = [
  player("Emiliano Martinez", 23, "GK"),
  player("Nicolas Tagliafico", 3, "LB"),
  player("Lisandro Martinez", 6, "CB"),
  player("Cristian Romero", 13, "CB"),
  player("Nahuel Molina", 26, "RB"),
  player("Leandro Paredes", 5, "DM"),
  player("Rodrigo De Paul", 7, "RW"),
  player("Alexis Mac Allister", 20, "AM"),
  player("Enzo Fernandez", 24, "LW"),
  player("Julian Alvarez", 9, "ST"),
  player("Lionel Messi", 10, "ST")
];

const homeBench = [
  benchPlayer("Geronimo Rulli", 12, "GK"),
  benchPlayer("Lautaro Martinez", 22, "ST"),
  benchPlayer("Nico Gonzalez", 15, "LW"),
  benchPlayer("Gonzalo Montiel", 4, "RB"),
  benchPlayer("Paulo Dybala", 21, "AM"),
  benchPlayer("Exequiel Palacios", 14, "CM"),
  benchPlayer("Giovani Lo Celso", 18, "CM")
];

const awayStarters = [
  player("Mostafa Shoubir", 23, "GK"),
  player("Yasser Ibrahim", 2, "CB"),
  player("Mohamed Hany", 3, "RB"),
  player("Ramy Rabia", 5, "CB"),
  player("Karim Hafez", 15, "LB"),
  player("Emam Ashour", 8, "DM"),
  player("Mostafa Zico", 11, "DM"),
  player("Mohanad Lashin", 17, "AM"),
  player("Marawan Attia", 19, "AM"),
  player("Mohamed Salah", 10, "RW"),
  player("Haissem Hassan", 12, "ST")
];

function computeScenarioOnField(starters, substitutions = []) {
  const onField = new Set(starters.map((starter) => starter.name));

  for (const substitution of substitutions) {
    onField.delete(substitution.offName);
    onField.add(substitution.onName);
  }

  return [...onField];
}

function buildLiveLineups({ mode = "live", substitutions = [] } = {}) {
  return {
    mode,
    teamSheetSource: "fifa-official",
    eventSource: "fifa-official",
    layoutSource: "derived-team-sheet-order",
    layoutVerification: {
      status: "unverified",
      exact: false,
      source: "derived-team-sheet-order",
      checkedAt
    },
    sourceIds: ["fifa-lineups-live-rendering-smoke"],
    checkedAt,
    home: {
      formation: "4-1-3-2",
      coach: { name: "Lionel Scaloni", teamName: "Argentina" },
      players: homeStarters,
      bench: homeBench,
      events: {
        cards: [],
        staffCards: [],
        substitutions
      },
      onFieldPlayers: computeScenarioOnField(homeStarters, substitutions)
    },
    away: {
      formation: "4-2-3-1",
      coach: { name: "Hossam Hassan", teamName: "Egypt" },
      players: awayStarters,
      bench: [
        benchPlayer("Mohamed El Shenawy", 1, "GK"),
        benchPlayer("Trezeguet", 7, "LW")
      ],
      events: {
        cards: [],
        staffCards: [],
        substitutions: []
      },
      onFieldPlayers: awayStarters.map((starter) => starter.name)
    }
  };
}

function buildLivePayload(fixturesData, standingsData, tournamentData, scenario) {
  const fixturesDataCopy = JSON.parse(JSON.stringify(fixturesData));
  const fixture = fixturesDataCopy.fixtures.find((item) => item.id === matchId);
  assert(fixture, `Missing fixture ${matchId} in data/fixtures.json`);

  fixture.status = scenario.status;
  fixture.homeTeamId = "ARG";
  fixture.awayTeamId = "EGY";
  fixture.score = { home: 0, away: 2 };
  fixture.lineups = buildLiveLineups(scenario);

  return {
    fixturesData: fixturesDataCopy,
    standingsData,
    tournamentData,
    syncStatus: {
      checkedAt,
      lineupFixtures: 1,
      lineupUpdates: 1,
      liveFixtures: 1,
      provider: "fifa"
    }
  };
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
      response.writeHead(404);
      response.end("Not found");
      return;
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

let browser;
try {
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const [fixturesData, standingsData, tournamentData] = await Promise.all(
    ["fixtures.json", "standings.json", "tournament.json"].map(async (fileName) =>
      JSON.parse(await readFile(path.join(root, "data", fileName), "utf8"))
    )
  );
  browser = await chromium.launch({ args: ["--blink-settings=imagesEnabled=false"] });

  const scenarios = [
    {
      label: "live no substitutions",
      mode: "live",
      status: "LIVE",
      substitutions: []
    },
    {
      label: "live one substitution",
      mode: "live",
      status: "LIVE",
      substitutions: [
        { minute: 61, offName: "Nicolas Tagliafico", onName: "Nico Gonzalez" }
      ]
    },
    {
      label: "live multiple substitutions",
      mode: "live",
      status: "LIVE",
      substitutions: [
        { minute: 61, offName: "Nicolas Tagliafico", onName: "Nico Gonzalez" },
        { minute: 62, offName: "Rodrigo De Paul", onName: "Lautaro Martinez" }
      ]
    },
    {
      label: "live halftime substitution",
      mode: "live",
      status: "LIVE",
      substitutions: [
        { minute: "HT", offName: "Leandro Paredes", onName: "Gonzalo Montiel" }
      ]
    },
    {
      label: "completed match many substitutions",
      mode: "final",
      status: "FT",
      substitutions: [
        { minute: 46, offName: "Nicolas Tagliafico", onName: "Nico Gonzalez" },
        { minute: 58, offName: "Rodrigo De Paul", onName: "Lautaro Martinez" },
        { minute: 65, offName: "Leandro Paredes", onName: "Gonzalo Montiel" },
        { minute: 72, offName: "Julian Alvarez", onName: "Paulo Dybala" },
        { minute: 84, offName: "Enzo Fernandez", onName: "Exequiel Palacios" }
      ]
    }
  ];

  async function runScenario(scenario) {
    const livePayload = buildLivePayload(fixturesData, standingsData, tournamentData, scenario);
    let liveDataServed;
    const liveDataPromise = new Promise((resolve) => {
      liveDataServed = resolve;
    });
    const context = await browser.newContext();

    await context.addInitScript(() => {
      const RealDate = Date;
      const mockNow = new RealDate("2026-07-07T17:45:00Z");

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
    await context.route("**/data/lineups.json*", async (route) => {
      await route.fulfill({
        body: JSON.stringify({ lineups: {} }),
        contentType: "application/json",
        status: 200
      });
    });
    await context.route("**/api/live-data*", async (route) => {
      liveDataServed();
      await route.fulfill({
        body: JSON.stringify(livePayload),
        contentType: "application/json",
        status: 200
      });
    });

    const page = await context.newPage();
    await page.goto(`${baseUrl}/?view=matches&date=2026-07-07&tz=America%2FLos_Angeles`, {
      waitUntil: "load"
    });
    await page.waitForSelector(`[data-match-id="${matchId}"]`, { state: "attached" });
    await liveDataPromise;
    await page.locator(`[data-match-id="${matchId}"] .match-row-trigger`).click();
    await page.waitForSelector("#match-info .lineup-preview-block", { state: "attached" });

    const homePanel = page.locator("#match-info [data-lineup-panel='home']:not([hidden])");
    const homeState = await homePanel.evaluate((panel) => ({
      markers: [...panel.querySelectorAll(".lineup-player-marker")].map((marker) => ({
        currentName: marker.dataset.lineupPlayerName || "",
        starterName: marker.dataset.lineupStarterName || "",
        position: marker.dataset.lineupPosition || ""
      })),
      substitutionToggles: [...panel.querySelectorAll("[data-lineup-substitution-toggle]")].map((toggle) => ({
        minute: toggle.dataset.lineupMinute || "",
        offName: toggle.dataset.lineupOffName || "",
        onName: toggle.dataset.lineupOnName || ""
      }))
    }));
    const starterNames = homeState.markers.map((marker) => marker.starterName);

    assert.equal(
      homeState.markers.length,
      11,
      `${scenario.label}: Argentina should render 11 official starters. Rendered ${JSON.stringify(homeState.markers)}.`
    );
    assert.deepEqual(
      starterNames,
      homeStarters.map((starter) => starter.name),
      `${scenario.label}: starter markers should remain the official XI in team-sheet order.`
    );
    assert.equal(
      homeState.substitutionToggles.length,
      scenario.substitutions.length,
      `${scenario.label}: substitution events should be represented as starter marker toggles.`
    );

    for (const substitution of scenario.substitutions) {
      assert(
        starterNames.includes(substitution.offName),
        `${scenario.label}: substituted-off starter ${substitution.offName} should remain visible.`
      );
      assert(
        homeState.substitutionToggles.some(
          (toggle) => toggle.offName === substitution.offName && toggle.onName === substitution.onName
        ),
        `${scenario.label}: substitute appearance ${substitution.onName} for ${substitution.offName} should remain represented.`
      );
    }

    if (scenario.substitutions.length) {
      await homePanel.locator("[data-lineup-substitution-toggle]").first().click();
      await page.waitForFunction(
        ({ expectedName }) =>
          [...document.querySelectorAll("#match-info [data-lineup-panel='home']:not([hidden]) .lineup-player-marker")]
            .some((marker) => marker.dataset.lineupPlayerName === expectedName),
        { expectedName: scenario.substitutions[0].onName },
        { timeout: 3000 }
      );
      const previewState = await homePanel.evaluate((panel) => ({
        currentNames: [...panel.querySelectorAll(".lineup-player-marker")].map((marker) => marker.dataset.lineupPlayerName || ""),
        markerCount: panel.querySelectorAll(".lineup-player-marker").length,
        starterNames: [...panel.querySelectorAll(".lineup-player-marker")].map((marker) => marker.dataset.lineupStarterName || "")
      }));
      assert.equal(
        previewState.markerCount,
        11,
        `${scenario.label}: substitution preview should not change marker count.`
      );
      assert(
        previewState.currentNames.includes(scenario.substitutions[0].onName),
        `${scenario.label}: substitution preview should show the substitute ${scenario.substitutions[0].onName}.`
      );
      assert(
        previewState.starterNames.includes(scenario.substitutions[0].offName),
        `${scenario.label}: substitution preview should keep the starter identity for ${scenario.substitutions[0].offName}.`
      );
    }

    const awayMarkers = await page
      .locator("#match-info [data-lineup-panel='away'] .lineup-player-marker")
      .evaluateAll((markers) => markers.map((marker) => marker.dataset.lineupStarterName || marker.dataset.lineupPlayerName || ""));

    assert.equal(awayMarkers.length, 11, `${scenario.label}: Egypt should render 11 official starters. Rendered ${JSON.stringify(awayMarkers)}.`);
    await context.close();
  }

  for (const scenario of scenarios) {
    await runScenario(scenario);
  }

  console.log("Live lineup rendering smoke passed: official XI stays at 11 across substitution scenarios.");
} finally {
  if (browser) {
    await browser.close();
  }
  await new Promise((resolve) => server.close(resolve));
}
