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
  await page.locator(".player-link").first().hover();
  const playerCard = page.locator(".player-card").first();
  await playerCard.waitFor({ state: "visible" });
  assert(
    (await playerCard.locator(".player-photo img, .player-photo-fallback").count()) === 1,
    "Player hover card should include a face or initials fallback."
  );
  assert(
    (await playerCard.locator(".player-card-title span").count()) >= 2,
    "Player hover card should include position and club lines."
  );
  assert(
    (await playerCard.locator(".player-skill-list span").count()) > 0,
    "Player hover card should include skill chips."
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

  const catchUpCheck = await openPageAtTime("2026-06-18T05:30:00.000Z");
  await catchUpCheck.page.locator("#catch-up-button").click();
  const catchUpText = await catchUpCheck.page.locator("#catch-up-popover").innerText();
  const catchUpItems = await catchUpCheck.page.locator(".catch-up-item").evaluateAll((items) =>
    items.map((item) => ({
      time: item.querySelector("time")?.textContent.trim(),
      headline: item.querySelector("h3")?.textContent.trim(),
      standouts: item.querySelector(".catch-up-standouts")?.textContent.trim() || "",
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
    englandCatchUpItem?.standouts ===
      "Standouts: Harry Kane scored twice, while Jude Bellingham and Marcus Rashford added second-half goals.",
    "The completed England/Croatia match should include sourced standout player context."
  );
  assert(
    !/main goal threat|Golden Boot chase/i.test(catchUpText),
    "The catch-up feed should not show unsourced generic player-watch headlines."
  );
  await catchUpCheck.context.close();

  const sourceFreshnessCheck = await openPageAtTime("2026-06-18T15:57:00.000Z");
  const sourceNoteText = await sourceFreshnessCheck.page.locator("#source-note").innerText();
  assert(
    sourceNoteText.includes("Core data needs refresh"),
    "The source note should warn when core official data is stale."
  );
  assert(
    sourceNoteText.includes("Core checks:") &&
      sourceNoteText.includes("standings: Jun 17, 2026, 3:40 PM") &&
      sourceNoteText.includes("Latest match reports checked Jun 18, 2026, 8:54 AM"),
    "The source note should separate core-source freshness from latest match-report checks."
  );
  assert(
    !sourceNoteText.includes("Source data checked Jun 17, 2026, 3:40 PM"),
    "The source note should not hide freshness behind one generic timestamp."
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
    groupOrderCheck.groupB?.join("|") === "Canada|Bosnia and Herz...|Qatar|Switzerland",
    "Group B should preserve the checked FIFA table order."
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
