#!/usr/bin/env node
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
const fixturesData = JSON.parse(await readFile(path.join(root, "data/fixtures.json"), "utf8"));
const browser = await chromium.launch();
const page = await browser.newPage();

async function openPageAtTime(
  nowIso,
  path = "/?view=matches&date=2026-06-17&tz=America%2FLos_Angeles",
  options = {}
) {
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

  if (options.fixtureTransform) {
    const patchedFixturesData = JSON.parse(JSON.stringify(fixturesData));
    options.fixtureTransform(patchedFixturesData);
    await context.route("**/data/fixtures.json*", async (route) => {
      await route.fulfill({
        body: JSON.stringify(patchedFixturesData),
        contentType: "application/json",
        status: 200
      });
    });
  }

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
  const keyInformationText = await page.locator(".key-info-team p").first().innerText();
  assert(
    keyInformationText.includes("Against "),
    "Key information should include matchup-specific opponent context."
  );
  assert(
    !/main names to track/i.test(keyInformationText),
    "Key information should not use generic player-list placeholder copy."
  );
  assert(
    (await page.locator(".player-link").count()) > 0,
    "Key information should link highlighted player names."
  );
  assert(
    (await page.locator(".key-info-team h4 .player-link").count()) > 0,
    "Key information headings should link player-name taglines."
  );
  const headingPlayerDecoration = await page
    .locator(".key-info-team h4 .player-link")
    .first()
    .evaluate((link) => getComputedStyle(link).textDecorationLine);
  const paragraphPlayerDecoration = await page
    .locator(".key-info-team p .player-link")
    .first()
    .evaluate((link) => getComputedStyle(link).textDecorationLine);
  assert(
    headingPlayerDecoration.includes("underline") && paragraphPlayerDecoration === "none",
    "Key information should underline heading player mentions, not paragraph mentions."
  );
  await page.locator(".player-link").first().hover();
  const playerCard = page.locator(".player-card").first();
  await playerCard.waitFor({ state: "visible" });
  assert(
    (await playerCard.locator(".player-photo img, .player-photo-fallback").count()) === 1,
    "Player hover card should include a face or initials fallback."
  );
  assert(
    (await playerCard.locator(".player-card-title strong").count()) === 1 &&
      (await playerCard.locator(".player-card-title span").count()) === 1,
    "Player hover card should include position and club lines without repeating the name."
  );
  assert(
    (await playerCard.locator(".player-skill-list span").count()) > 0,
    "Player hover card should include skill chips."
  );
  const firstCardBox = await playerCard.boundingBox();
  const viewportSize = page.viewportSize();
  assert(
    firstCardBox &&
      viewportSize &&
      firstCardBox.x >= 0 &&
      firstCardBox.x + firstCardBox.width <= viewportSize.width,
    "Player hover card should stay inside the viewport horizontally."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-11&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="mexico-south-africa-2026-06-11"]').click();
  const mexicoHeadingLinks = await page
    .locator(".key-info-team")
    .first()
    .locator("h4 .player-link")
    .evaluateAll((links) => links.map((link) => link.textContent.trim()));
  assert(
    mexicoHeadingLinks.includes("Gimenez") && mexicoHeadingLinks.includes("Alvarez"),
    "Mexico's accented player aliases should link from the team tagline."
  );
  const gimenezLink = page
    .locator(".key-info-team")
    .first()
    .locator("h4 .player-link", { hasText: "Gimenez" });
  const gimenezCard = gimenezLink
    .locator("xpath=ancestor::span[contains(concat(' ', normalize-space(@class), ' '), ' player-hover ')][1]")
    .locator(".player-card");
  await gimenezLink.hover();
  await gimenezCard.waitFor({ state: "visible" });
  assert(
    (await gimenezLink.getAttribute("aria-label"))?.startsWith("Santiago Giménez:"),
    "Mexico's unaccented Gimenez tagline alias should open Santiago Giménez's hover card."
  );
  assert(
    (await gimenezCard.locator(".player-card-title strong").innerText()).trim() === "Striker",
    "Player hover card should not repeat the linked player name as a subtitle."
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

  await page.goto(`${baseUrl}?view=matches&date=2026-06-17&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator("#day-label").click();
  const calendarMonth = await page.locator("#calendar-month-label").evaluate((label) => ({
    text: label.textContent.trim(),
    visible: getComputedStyle(label).display !== "none"
  }));
  assert(calendarMonth.visible, "Calendar month label should be visible.");
  assert(/\w+ \d{4}/.test(calendarMonth.text), "Calendar month label should include month and year.");
  assert(
    await page.locator('#calendar-grid [data-day-key="2026-06-10"]').evaluate((button) => button.disabled),
    "Dates before the loaded World Cup schedule should be disabled."
  );
  assert(
    !(await page.locator('#calendar-grid [data-day-key="2026-06-11"]').evaluate((button) => button.disabled)),
    "The first loaded World Cup match date should be selectable."
  );
  assert(
    !(await page.locator("#calendar-prev-month").isDisabled()),
    "The calendar should page to the previous loaded World Cup month."
  );
  await page.locator("#calendar-prev-month").click();
  assert(
    (await page.locator("#calendar-month-label").innerText()).trim() === "December 2022",
    "The previous month control should jump from June 2026 to December 2022."
  );
  assert(
    !(await page.locator('#calendar-grid [data-day-key="2022-12-18"]').evaluate((button) => button.disabled)),
    "The 2022 World Cup final date should be selectable."
  );
  assert(
    await page.locator('#calendar-grid [data-day-key="2022-12-19"]').evaluate((button) => button.disabled),
    "Dates outside the 2022 World Cup should be disabled."
  );
  await page.locator("#calendar-prev-month").click();
  assert(
    (await page.locator("#calendar-month-label").innerText()).trim() === "November 2022",
    "The calendar should include the first 2022 tournament month."
  );
  assert(
    !(await page.locator('#calendar-grid [data-day-key="2022-11-20"]').evaluate((button) => button.disabled)),
    "The 2022 World Cup opening date should be selectable."
  );
  await page.locator("#calendar-next-month").click();
  await page.locator("#calendar-next-month").click();
  assert(
    (await page.locator("#calendar-month-label").innerText()).trim() === "June 2026",
    "The next month control should jump over empty years back to June 2026."
  );
  assert(
    !(await page.locator("#calendar-next-month").isDisabled()),
    "The calendar should page to the next loaded World Cup month."
  );
  await page.locator("#calendar-next-month").click();
  assert(
    (await page.locator("#calendar-month-label").innerText()).trim() === "July 2026",
    "The next month control should jump to July 2026."
  );
  assert(
    await page.locator('#calendar-grid [data-day-key="2026-07-08"]').evaluate((button) => button.disabled),
    "World Cup rest days should be disabled."
  );
  assert(
    await page.locator("#calendar-next-month").isDisabled(),
    "The calendar should stop at the final loaded World Cup month."
  );
  await page.locator("#calendar-prev-month").click();
  assert(
    (await page.locator("#calendar-month-label").innerText()).trim() === "June 2026",
    "The previous month control should return to the previous loaded World Cup month."
  );

  const calendarShortcutCheck = await openPageAtTime(
    "2026-06-18T16:00:00.000Z",
    "/?view=matches&date=2026-06-18&tz=America%2FLos_Angeles"
  );
  await calendarShortcutCheck.page.locator("#day-label").click();
  const yesterdayShortcut = calendarShortcutCheck.page.locator("#calendar-yesterday");
  const todayShortcut = calendarShortcutCheck.page.locator("#calendar-today");
  const yesterdayBox = await yesterdayShortcut.boundingBox();
  const todayBox = await todayShortcut.boundingBox();
  assert(yesterdayBox && todayBox, "Calendar shortcut buttons should be visible.");
  assert(
    yesterdayBox.x < todayBox.x,
    "The Yesterday shortcut should sit to the left of Today."
  );
  assert(
    !(await yesterdayShortcut.isDisabled()),
    "The Yesterday shortcut should be selectable when yesterday has matches."
  );
  await yesterdayShortcut.click();
  assert(
    (await calendarShortcutCheck.page.locator("#day-label").innerText()).trim() === "Jun 17",
    "The Yesterday shortcut should jump to the previous calendar day."
  );
  await calendarShortcutCheck.context.close();

  await page.goto(`${baseUrl}?view=matches&date=2022-11-20&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  assert(
    (await page.locator("#day-label").innerText()).trim() === "Nov 20, 2022",
    "Historical dated links should include the year in the date label."
  );
  assert(
    (await page.locator(".match-row").first().innerText()).includes("Qatar"),
    "Historical dates should render archived World Cup matches."
  );
  await page.locator(".match-row").first().click();
  const historicalGroupDetailText = await page.locator("#match-info").innerText();
  assert(
    historicalGroupDetailText.includes("World Cup 2022"),
    "Historical match details should show tournament context."
  );
  assert(
    historicalGroupDetailText.includes("Group standings"),
    "Historical group matches should show computed group standings."
  );
  assert(
    (await page.locator("#match-info .standings-table .flag").count()) >= 4,
    "Historical match group standings should render team flags."
  );
  assert(
    historicalGroupDetailText.includes("Prediction") &&
      historicalGroupDetailText.includes("Key information") &&
      historicalGroupDetailText.includes("Past matches"),
    "Historical match details should follow the current detail section structure."
  );
  assert(
    !historicalGroupDetailText.includes("Archived result shown instead of a pre-match probability"),
    "Historical match details should use the back-then prediction card instead of the archive-only result copy."
  );
  assert(
    historicalGroupDetailText.includes("Ecuador: won 2-0") &&
      historicalGroupDetailText.includes("Enner Valencia scored twice") &&
      historicalGroupDetailText.includes("Next: Matchday 6 vs Netherlands"),
    "Historical key information should summarize archived scorers and next-match context."
  );
  assert(
    !historicalGroupDetailText.includes("Source") && !historicalGroupDetailText.includes("Goals"),
    "Historical match details should not show source or goals sections."
  );

  await page.goto(`${baseUrl}?view=matches&date=2022-12-14&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator(".match-row").first().click();
  const historicalKnockoutDetailText = await page.locator("#match-info").innerText();
  assert(
    historicalKnockoutDetailText.includes("Knockout context") &&
      historicalKnockoutDetailText.includes("France vs Morocco") &&
      historicalKnockoutDetailText.includes("Argentina vs France"),
    "Historical knockout matches should show bracket context."
  );
  assert(
    !historicalKnockoutDetailText.includes("Half-time") &&
      (await page.locator(".historical-goals").count()) === 0,
    "Historical knockout detail should avoid the old facts/goals record layout."
  );

  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector(".match-row");
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
  const datedLinkLabel = (await page.locator("#day-label").innerText()).trim();
  assert(
    datedLinkLabel === "Jun 18" || datedLinkLabel === "Today",
    "Dated links should open the requested match date."
  );
  await page.locator('[data-match-id="switzerland-bosnia-2026-06-18"]').click();
  const finalMatchDetailText = await page.locator("#match-info").innerText();
  assert(
    finalMatchDetailText.includes("Result") &&
      finalMatchDetailText.includes("Prediction") &&
      finalMatchDetailText.includes("Switzerland beat Bosnia and Herzegovina 4-1."),
    "Final match details should keep the prediction card below the result."
  );

  const matchStateCheck = await openPageAtTime("2026-06-18T05:30:00.000Z");
  const june17Scores = await matchStateCheck.page.locator(".match-score").evaluateAll((scores) =>
    scores.map((score) => score.textContent.trim())
  );
  assert(
    june17Scores.join("|") === "1-1|4-2|1-0|1-3",
    "The finalized Jun 17 match list should show all four score pills."
  );
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
    const upNextPillCount = await matchStateCheck.page.locator(".up-next-pill").count();
    if (upNextPillCount > 0) {
      assert(upNextPillCount === 1, "The next scheduled match should show one Up next pill.");
      assert(
        (await matchStateCheck.page.locator(".up-next-pill").innerText()).trim() === "Up next",
        "The Up next pill should use the expected label."
      );
    } else {
      const finalRows = await matchStateCheck.page.locator(".match-row .match-score").count();
      const totalRows = await matchStateCheck.page.locator(".match-row").count();
      assert(
        finalRows === totalRows,
        "If no Up next pill is shown in the mocked state, every listed match should be final."
      );
    }
  }
  await matchStateCheck.context.close();

  const liveFallbackScoreCheck = await openPageAtTime(
    "2026-06-18T16:05:00.000Z",
    "/?view=matches&date=2026-06-18&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const liveFixture = data.fixtures.find(
          (fixture) => fixture.id === "czechia-south-africa-2026-06-18"
        );
        liveFixture.status = "SCHEDULED";
        delete liveFixture.score;
      }
    }
  );
  const liveFallbackRow = liveFallbackScoreCheck.page.locator(
    '[data-match-id="czechia-south-africa-2026-06-18"]'
  );
  assert(
    (await liveFallbackRow.locator(".match-score").innerText()).trim() === "0-0",
    "A live fixture without a loaded score should show a 0-0 fallback score."
  );
  const liveFallbackText = (await liveFallbackRow.innerText()).replace(/\s+/g, " ").trim();
  const liveFallbackOrder = ["Czechia", "vs", "South Africa", "LIVE", "0-0"].map((text) =>
    liveFallbackText.indexOf(text)
  );
  assert(
    liveFallbackOrder.every((index) => index >= 0) &&
      liveFallbackOrder.every((index, itemIndex) => itemIndex === 0 || index > liveFallbackOrder[itemIndex - 1]),
    "A live fixture without a loaded score should keep vs between teams and show 0-0 after Live."
  );
  const liveFallbackMetaText = await liveFallbackRow
    .locator(".match-row-meta > *")
    .evaluateAll((items) => items.map((item) => item.innerText.trim()).join("|"));
  assert(
    liveFallbackMetaText === "LIVE|0-0",
    "The live score should sit to the right of the Live pill."
  );
  assert(
    (await liveFallbackRow.locator(".score-status").count()) === 0,
    "A live fixture without a loaded score should not show Score pending."
  );
  assert(
    !(await liveFallbackRow.innerText()).includes("Score pending"),
    "The visible live row text should not include Score pending."
  );
  const liveFallbackBox = await liveFallbackRow.boundingBox();
  assert(
    liveFallbackBox && liveFallbackBox.height < 44,
    "The live fallback row should remain a single line."
  );
  await liveFallbackScoreCheck.context.close();

  const pendingScoreCheck = await openPageAtTime(
    "2026-06-18T05:30:00.000Z",
    "/?view=matches&date=2026-06-17&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const staleFixture = data.fixtures.find((fixture) => fixture.id === "ghana-panama-2026-06-17");
        staleFixture.status = "SCHEDULED";
        delete staleFixture.score;
      }
    }
  );
  const pendingScoreRow = pendingScoreCheck.page.locator('[data-match-id="ghana-panama-2026-06-17"]');
  assert(
    (await pendingScoreRow.locator(".score-status").innerText()).trim() === "Final pending",
    "A post-match fixture with no loaded score should show a visible pending status."
  );
  assert(
    (await pendingScoreRow.getAttribute("aria-label")).includes("final pending"),
    "A post-match fixture with no loaded score should expose the pending status to assistive tech."
  );
  await pendingScoreCheck.context.close();

  const nextScheduledFixture = fixturesData.fixtures
    .filter((fixture) => fixture.status === "SCHEDULED" && fixture.kickoffUtc)
    .sort((a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc))[0];
  if (nextScheduledFixture) {
    const beforeKickoff = new Date(
      new Date(nextScheduledFixture.kickoffUtc).getTime() - 5 * 60 * 1000
    );
    const upNextCheck = await openPageAtTime(
      beforeKickoff.toISOString(),
      `/?view=matches&date=${nextScheduledFixture.date}&tz=America%2FLos_Angeles`
    );
    await upNextCheck.page.waitForSelector(".match-row");
    assert(
      (await upNextCheck.page.locator(".up-next-pill").count()) === 1,
      "The next scheduled match should show one Up next pill."
    );
    assert(
      (await upNextCheck.page.locator(".up-next-pill").innerText()).trim() === "Up next",
      "The Up next pill should use the expected label."
    );
    await upNextCheck.context.close();
  }

  const pendingScoreFixture = fixturesData.fixtures
    .filter((fixture) => fixture.status === "SCHEDULED" && fixture.kickoffUtc && !fixture.score)
    .sort((a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc))[0];
  if (pendingScoreFixture) {
    const afterLiveWindow = new Date(
      new Date(pendingScoreFixture.kickoffUtc).getTime() + 2.5 * 60 * 60 * 1000
    );
    const pendingScoreCheck = await openPageAtTime(
      afterLiveWindow.toISOString(),
      `/?view=matches&date=${pendingScoreFixture.date}&tz=America%2FLos_Angeles`
    );
    await pendingScoreCheck.page.waitForSelector(".match-row");
    assert(
      (
        await pendingScoreCheck.page
          .locator(`.match-row[data-match-id="${pendingScoreFixture.id}"] .score-status.is-pending`)
          .innerText()
      ).trim() === "Final pending",
      "A kicked-off scheduled match without a verified score should show Final pending."
    );
    await pendingScoreCheck.context.close();
  }

  const catchUpCheck = await openPageAtTime("2026-06-18T05:30:00.000Z");
  await catchUpCheck.page.locator("#catch-up-button").click();
  const catchUpText = await catchUpCheck.page.locator("#catch-up-popover").innerText();
  const catchUpItems = await catchUpCheck.page.locator(".catch-up-item").evaluateAll((items) =>
    items.map((item) => ({
      time: item.closest(".catch-up-group")?.querySelector(".catch-up-group-date")?.textContent.trim(),
      headline: item.querySelector(".catch-up-title-row h3 > span")?.textContent.trim(),
      subtitle: item.querySelector(".catch-up-subtitle")?.textContent.trim() || "",
      standouts: item.querySelector(".catch-up-standouts")?.textContent.trim() || "",
      standoutBullets: Array.from(item.querySelectorAll(".catch-up-standouts .catch-up-point")).map(
        (point) => point.textContent.trim()
      ),
      sourceHref: item.querySelector(".catch-up-source")?.getAttribute("href") || ""
    }))
  );
  const catchUpHeadlines = catchUpItems.map((item) => item.headline);
  const portugalCatchUpItem = catchUpItems.find((item) =>
    item.headline?.includes("Portugal and DR Congo split the points")
  );
  const englandCatchUpItem = catchUpItems.find((item) =>
    item.headline?.includes("England look sharp against Croatia")
  );
  const ghanaCatchUpItem = catchUpItems.find((item) =>
    item.headline?.includes("Ghana leave it late against Panama")
  );
  const colombiaCatchUpItem = catchUpItems.find((item) =>
    item.headline?.includes("Colombia take control of Group K")
  );
  assert(
    catchUpHeadlines.join("|") ===
      [
        "Austria look sharp against Jordan",
        "Portugal and DR Congo split the points",
        "England look sharp against Croatia",
        "Ghana leave it late against Panama",
        "Colombia take control of Group K"
      ].join("|"),
    "The catch-up feed should show the latest updates in chronological order."
  );
  assert(
    portugalCatchUpItem?.sourceHref.includes("portugal-dr-congo-world-cup-2026-group-k-match-report"),
    "The Portugal/DR Congo catch-up item should link to the match report."
  );
  assert(
    ghanaCatchUpItem?.sourceHref.includes("ghana-panama-highlights-match-report"),
    "The Ghana/Panama catch-up item should link to the FIFA match report."
  );
  assert(
    colombiaCatchUpItem?.sourceHref.includes("uzbekistan-colombia-match-report-highlights"),
    "The Uzbekistan/Colombia catch-up item should link to the FIFA match report."
  );
  assert(
    catchUpText.includes("England look sharp against Croatia") &&
      catchUpText.includes("England's 4-2 win gives them an early foothold in Group L"),
    "The completed England/Croatia match should use the final-score catch-up story."
  );
  assert(
    englandCatchUpItem?.standoutBullets.join("|") ===
      [
        "Harry Kane scored twice",
        "Jude Bellingham and Marcus Rashford added second-half goals."
      ].join("|"),
    "The completed England/Croatia match should include sourced standout player context."
  );
  assert(
    !/main goal threat|Golden Boot chase/i.test(catchUpText),
    "The catch-up feed should not show unsourced generic player-watch headlines."
  );
  await catchUpCheck.context.close();

  const sourceFreshnessCheck = await openPageAtTime("2026-06-18T15:57:00.000Z");
  const sourceNote = sourceFreshnessCheck.page.locator("#source-note");
  const sourceNoteText = await sourceNote.innerText();
  const sourceLinkLabels = await sourceNote.locator("a").evaluateAll((links) =>
    links.map((link) => link.textContent.trim()).join("|")
  );
  assert(
    sourceNoteText ===
      "Sources: FIFA schedule, debutants, ranking, standings. Predictions are unofficial.",
    "The source note should stay short and readable."
  );
  assert(
    sourceLinkLabels === "FIFA schedule|debutants|ranking|standings",
    "The source note should keep the compact official source links."
  );
  assert(
    !sourceNoteText.includes("Core data") &&
      !sourceNoteText.includes("Core checks:") &&
      !sourceNoteText.includes("Latest result data checked") &&
      !sourceNoteText.includes("Source data checked"),
    "The source note should not show diagnostic freshness details."
  );
  await sourceFreshnessCheck.context.close();

  const tomorrowDuringKickoff = await openPageAtTime(
    "2026-06-18T15:55:00.000Z",
    "/?view=matches&date=2026-06-19&tz=America%2FLos_Angeles"
  );
  assert(
    (await tomorrowDuringKickoff.page.locator(".up-next-pill").count()) === 0,
    "Tomorrow's first match should not show Up next for today's upcoming match."
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
  assert(
    (await page.locator("#standings-heading").innerText()).replace(/\s+/g, " ").trim() ===
      "2026 Standings",
    "The current standings heading should specify 2026."
  );
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
    "Group B should preserve the checked table order."
  );
  const bosniaStandingTeam = page
    .locator(".standings-card", { hasText: "Group B" })
    .locator(".standing-team.has-name-tooltip", { hasText: "Bosnia and Herz..." });
  await bosniaStandingTeam.hover();
  await page.waitForTimeout(160);
  const bosniaTooltip = await bosniaStandingTeam.evaluate((team) => {
    const tooltipStyle = getComputedStyle(team, "::after");
    return {
      content: tooltipStyle.content,
      opacity: Number(tooltipStyle.opacity),
      tooltip: team.getAttribute("data-tooltip")
    };
  });
  assert(
    bosniaTooltip.tooltip === "Bosnia and Herzegovina" &&
      bosniaTooltip.content.includes("Bosnia and Herzegovina") &&
      bosniaTooltip.opacity > 0.9,
    "Bosnia and Herzegovina should reveal its full name when the shortened standings row is hovered."
  );
  assert(
    groupOrderCheck.groupK?.join("|") === "Colombia|Portugal|DR Congo|Uzbekistan",
    "Group K should preserve the checked FIFA table order."
  );
  const currentStandingsMarkerCheck = await page.evaluate(() => {
    return {
      advancingCount: document.querySelectorAll(".standings-card tbody tr.is-advancing").length,
      advancementPillCount: document.querySelectorAll(".advancement-pill").length
    };
  });
  assert(
    currentStandingsMarkerCheck.advancingCount === 0,
    "The current 2026 standings should not mark provisional advancing teams."
  );
  assert(
    currentStandingsMarkerCheck.advancementPillCount === 0,
    "The current 2026 standings should not show Round of 32 markers."
  );
  await page.locator("#standings-year-button").click();
  assert(
    await page.locator("#standings-year-popover").isVisible(),
    "The standings year picker should open from the heading year."
  );
  await page.locator('.standings-year-option[data-standings-year="2022"]').click();
  assert(
    (await page.locator("#standings-heading").innerText()).replace(/\s+/g, " ").trim() ===
      "2022 Standings",
    "Choosing a past year should update the standings heading."
  );
  assert(
    new URL(page.url()).searchParams.get("standingsYear") === "2022",
    "The selected standings year should be reflected in the URL."
  );
  const historicalStandingsCheck = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".standings-card")];
    const groups = new Map(
      cards.map((card) => [
        card.querySelector("h2")?.textContent.trim(),
        [...card.querySelectorAll(".standing-name")].map((team) => team.textContent.trim())
      ])
    );
    const groupACard = cards.find((card) => card.querySelector("h2")?.textContent.trim() === "Group A");

    return {
      groupA: groups.get("Group A"),
      groupAFlagCount: groupACard?.querySelectorAll(".standing-team .flag").length || 0,
      summary: document.querySelector("#standings-summary")?.textContent.trim()
    };
  });
  assert(
    historicalStandingsCheck.groupA?.join("|") === "Netherlands|Senegal|Ecuador|Qatar",
    "The 2022 standings view should render archived group tables."
  );
  assert(
    historicalStandingsCheck.groupAFlagCount === 4,
    "The 2022 standings view should render a flag for each archived group team."
  );
  assert(
    historicalStandingsCheck.summary === "Final group tables computed from archived match results.",
    "Historical standings should explain their archived data source."
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
