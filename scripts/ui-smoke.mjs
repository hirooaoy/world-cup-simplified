#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

let chromium;
const require = createRequire(import.meta.url);

try {
  ({ chromium } = require("playwright"));
} catch (error) {
  console.error("Playwright is required for UI smoke tests. Run npm install first.");
  console.error(error.message);
  process.exit(1);
}

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

const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const browser = await chromium.launch();
const page = await browser.newPage();

async function openPageAtTime(nowIso, path = "/?view=matches&date=2026-06-17&tz=America%2FLos_Angeles") {
  const context = await browser.newContext();
  await context.addInitScript((mockNowIso) => {
    const RealDate = Date;
    const mockNow = new RealDate(mockNowIso);

    class MockDate extends RealDate {
      constructor(...args) {
        return args.length === 0 ? new RealDate(mockNow) : new RealDate(...args);
      }

      static now() {
        return mockNow.getTime();
      }
    }

    window.Date = MockDate;
  }, nowIso);

  const mockedPage = await context.newPage();
  await mockedPage.goto(`${baseUrl}${path}`, { waitUntil: "load" });
  await mockedPage.waitForSelector(".match-row");

  return { context, page: mockedPage };
}

try {
  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector(".match-row");

  assert(
    !(await page.locator("#match-info").isVisible()),
    "Match detail should stay hidden until a match is chosen."
  );
  assert(
    (await page.locator(".match-row.is-selected").count()) === 0,
    "No match row should be selected on load."
  );

  await page.locator(".match-row").first().click();
  assert(
    await page.locator("#match-info").isVisible(),
    "Choosing a match should reveal match detail."
  );

  await page.locator("#matches-tab").focus();
  await page.keyboard.press("ArrowRight");
  assert(
    await page.locator("#standings-tab").evaluate((tab) => tab.getAttribute("aria-selected") === "true"),
    "Arrow key navigation should activate the Standings tab."
  );

  const visibility = await page.evaluate(() => ({
    matchesDisplay: getComputedStyle(document.querySelector("#matches-view")).display,
    standingsDisplay: getComputedStyle(document.querySelector("#standings-view")).display
  }));
  assert(visibility.matchesDisplay === "none", "Matches panel should be hidden on Standings.");
  assert(visibility.standingsDisplay !== "none", "Standings panel should be visible.");

  await page.locator("#matches-tab").click();
  await page.locator("#day-label").click();
  const calendarMonth = await page.locator("#calendar-month-label").evaluate((label) => ({
    text: label.textContent.trim(),
    visible: getComputedStyle(label).display !== "none"
  }));
  assert(calendarMonth.visible, "Calendar month label should be visible.");
  assert(/\w+ \d{4}/.test(calendarMonth.text), "Calendar month label should include month and year.");

  await page.locator("#day-label").click();
  const beforeTimeZoneText = await page.locator("#day-label").innerText();
  assert(beforeTimeZoneText.trim() === "Today", "Initial default date should be Today.");
  await page.locator("#timezone-select").selectOption("Asia/Tokyo");
  assert(
    (await page.locator("#day-label").innerText()).trim() === "Today",
    "Changing timezone while viewing Today should keep the view on Today."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-18&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  assert(
    (await page.locator("#day-label").innerText()).trim() === "Jun 18",
    "Dated links should open the requested match date."
  );

  const matchStateCheck = await openPageAtTime("2026-06-17T20:05:00.000Z");
  const livePillCount = await matchStateCheck.page.locator(".live-pill").count();
  if (livePillCount > 0) {
    assert(livePillCount === 1, "A live match should show one Live pill.");
    assert(
      (await matchStateCheck.page.locator(".match-row.is-live .match-score").innerText()).trim() === "2-2",
      "A loaded live score should be shown for the live match."
    );
    assert(
      (await matchStateCheck.page.locator(".up-next-pill").count()) === 0,
      "Up next should be hidden while a match is live."
    );
    assert(
      (await matchStateCheck.page.locator(".match-row.is-live").getAttribute("aria-label")).startsWith(
        "Live, England vs Croatia"
      ),
      "The live state should be shown for England vs Croatia."
    );
  } else {
    assert(
      (await matchStateCheck.page.locator(".up-next-pill").count()) === 1,
      "The next scheduled match should show one Up next pill."
    );
    assert(
      (await matchStateCheck.page.locator(".up-next-pill").innerText()).trim() === "Up next",
      "The Up next pill should use the expected label."
    );
  }
  await matchStateCheck.context.close();

  const tomorrowDuringKickoff = await openPageAtTime(
    "2026-06-17T20:05:00.000Z",
    "/?view=matches&date=2026-06-18&tz=America%2FLos_Angeles"
  );
  assert(
    (await tomorrowDuringKickoff.page.locator(".up-next-pill").count()) === 0,
    "Tomorrow's first match should not show Up next while a match is live."
  );
  await tomorrowDuringKickoff.context.close();

  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(
    () => document.querySelector("#day-label")?.textContent.trim() === "Today"
  );
  const todayLosAngelesKey = await page.evaluate(() => {
    const parts = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "America/Los_Angeles",
      year: "numeric"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  });
  assert(
    new URL(page.url()).searchParams.get("date") === todayLosAngelesKey,
    "Reload should replace stale date state with today's date."
  );

  await page.locator("#standings-tab").click();
  const groupOrderCheck = await page.evaluate(() => {
    const groups = new Map(
      [...document.querySelectorAll(".standings-card")].map((card) => [
        card.querySelector("h2")?.textContent.trim(),
        [...card.querySelectorAll(".standing-name")].map((team) => team.textContent.trim())
      ])
    );

    return {
      groupB: groups.get("Group B"),
      groupK: groups.get("Group K")
    };
  });
  assert(
    groupOrderCheck.groupB?.join("|") === "Switzerland|Canada|Qatar|Bosnia and Herz...",
    "Group B should preserve the current FIFA-published table order."
  );
  assert(
    groupOrderCheck.groupK?.join("|") === "DR Congo|Portugal|Colombia|Uzbekistan",
    "Group K should preserve the current FIFA-published table order."
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-17&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator(".match-row").first().click();
  await page.waitForFunction(() => window.scrollY > 100);

  console.log("UI smoke tests passed.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
