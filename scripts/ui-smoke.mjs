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
const sourceNoteData = await Promise.all(
  [
    "fixtures.json",
    "history.json",
    "player-profiles.json",
    "teams.json",
    "standings.json",
    "tournament.json"
  ].map(async (fileName) => JSON.parse(await readFile(path.join(root, "data", fileName), "utf8")))
);
const [, , , teamsData, standingsData, tournamentData] = sourceNoteData;
const fifaWorldCupScoresUrl =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures";
const browser = await chromium.launch();
const page = await browser.newPage();
const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));

function getTeam(teamId) {
  return teamsById.get(teamId) || {
    fifaRank: Number.POSITIVE_INFINITY,
    id: teamId,
    name: teamId,
    officialName: teamId
  };
}

function formatOrdinal(value) {
  const number = Number(value);
  const suffix =
    number % 100 >= 11 && number % 100 <= 13
      ? "th"
      : { 1: "st", 2: "nd", 3: "rd" }[number % 10] || "th";

  return `${number}${suffix}`;
}

function formatGoalDifference(goalDifference) {
  return goalDifference > 0 ? `+${goalDifference}` : String(goalDifference);
}

function formatStandingPoints(points) {
  return `${points} ${points === 1 ? "point" : "points"}`;
}

function formatGoalsScored(goals) {
  return `${goals} ${goals === 1 ? "goal" : "goals"} scored`;
}

function getThirdPlaceAdvancerCount() {
  const groupCount = tournamentData.groups?.length || 0;
  const configuredAdvancers = Number(tournamentData.format?.bestThirdPlaceAdvancers);

  return Number.isInteger(configuredAdvancers) && configuredAdvancers >= 0
    ? Math.min(configuredAdvancers, groupCount)
    : Math.min(8, groupCount);
}

function getTeamConductScore(row) {
  const value = row.teamConductScore ?? row.conductScore ?? row.fairPlayScore ?? row.fairPlayPoints;
  const score = Number(value);

  return Number.isFinite(score) ? score : null;
}

function getFifaRankValue(team) {
  const rank = Number(team.fifaRank);

  return Number.isFinite(rank) ? rank : Number.POSITIVE_INFINITY;
}

function compareThirdPlaceCandidates(a, b) {
  const conductA = getTeamConductScore(a);
  const conductB = getTeamConductScore(b);

  return (
    b.pts - a.pts ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    (conductA !== null && conductB !== null ? conductB - conductA : 0) ||
    getFifaRankValue(a.team) - getFifaRankValue(b.team) ||
    a.groupIndex - b.groupIndex ||
    a.team.name.localeCompare(b.team.name)
  );
}

function getThirdPlaceTieSignature(row) {
  return `${row.pts}|${row.gd}|${row.gf}`;
}

function getExpectedThirdPlaceStatus(candidate, advancerCount) {
  const isInside = candidate.position <= advancerCount;

  if (candidate.isCutLineTie) {
    return { kind: "pending", label: "Tiebreak pending" };
  }

  if (isInside && candidate.position >= advancerCount - 1) {
    return { kind: "bubble-in", label: "Just inside" };
  }

  if (isInside) {
    return { kind: "in", label: "Advancing now" };
  }

  if (candidate.position === advancerCount + 1) {
    return { kind: "first-out", label: "Just outside" };
  }

  return { kind: "out", label: "Outside now" };
}

function annotateExpectedThirdPlaceRaceRows(rows, advancerCount) {
  const annotatedRows = rows.map((row, index) => ({
    ...row,
    isCutLineTie: false,
    isUnresolvedTie: false,
    position: index + 1,
    tieGroupEnd: index + 1,
    tieGroupStart: index + 1
  }));

  let index = 0;
  while (index < annotatedRows.length) {
    const signature = getThirdPlaceTieSignature(annotatedRows[index]);
    let endIndex = index + 1;

    while (
      endIndex < annotatedRows.length &&
      getThirdPlaceTieSignature(annotatedRows[endIndex]) === signature
    ) {
      endIndex += 1;
    }

    const tieGroup = annotatedRows.slice(index, endIndex);
    const hasMissingConduct = tieGroup.some((row) => getTeamConductScore(row) === null);
    const isUnresolvedTie = tieGroup.length > 1 && hasMissingConduct;
    const isCutLineTie = isUnresolvedTie && index < advancerCount && endIndex > advancerCount;

    for (let tieIndex = index; tieIndex < endIndex; tieIndex += 1) {
      annotatedRows[tieIndex].isCutLineTie = isCutLineTie;
      annotatedRows[tieIndex].isUnresolvedTie = isUnresolvedTie;
      annotatedRows[tieIndex].tieGroupStart = index + 1;
      annotatedRows[tieIndex].tieGroupEnd = endIndex;
    }

    index = endIndex;
  }

  return annotatedRows.map((row) => ({
    ...row,
    status: getExpectedThirdPlaceStatus(row, advancerCount)
  }));
}

function getExpectedThirdPlaceRaceRows() {
  const rows = (tournamentData.groups || [])
    .map((group, groupIndex) => {
      const row = standingsData.groups?.[group.id]?.[2];

      if (!row) {
        return null;
      }

      return {
        ...row,
        gd: row.gf - row.ga,
        groupId: group.id,
        groupIndex,
        groupLabel: group.label || `Group ${group.id}`,
        pts: row.wins * 3 + row.draws,
        team: getTeam(row.teamId)
      };
    })
    .filter(Boolean)
    .sort(compareThirdPlaceCandidates);

  return annotateExpectedThirdPlaceRaceRows(rows, getThirdPlaceAdvancerCount());
}

function getExpectedThirdPlaceReason(candidate, rows = getExpectedThirdPlaceRaceRows()) {
  if (candidate.isCutLineTie) {
    return `Tied on loaded stats for ${formatOrdinal(candidate.tieGroupStart)}-${formatOrdinal(candidate.tieGroupEnd)}.`;
  }

  const nearestCandidate =
    candidate.position <= getThirdPlaceAdvancerCount()
      ? rows[candidate.position]
      : rows[candidate.position - 2];

  if (!nearestCandidate) {
    return `${formatStandingPoints(candidate.pts)}, ${formatGoalDifference(candidate.gd)} goal difference, ${formatGoalsScored(candidate.gf)}.`;
  }

  if (candidate.pts !== nearestCandidate.pts) {
    return `${formatStandingPoints(candidate.pts)}; ${candidate.position <= getThirdPlaceAdvancerCount() ? "above" : "behind"} next team on points.`;
  }

  if (candidate.gd !== nearestCandidate.gd) {
    return `${formatGoalDifference(candidate.gd)} goal difference; ${candidate.position <= getThirdPlaceAdvancerCount() ? "ahead" : "behind"} on goal difference.`;
  }

  if (candidate.gf !== nearestCandidate.gf) {
    return `${formatGoalsScored(candidate.gf)}; ${candidate.position <= getThirdPlaceAdvancerCount() ? "ahead" : "behind"} on total goals scored.`;
  }

  return `${formatStandingPoints(candidate.pts)}, ${formatGoalDifference(candidate.gd)} goal difference, ${formatGoalsScored(candidate.gf)}.`;
}

function getExpectedStandingOrder(groupId) {
  return (standingsData.groups?.[groupId] || []).map((row) => getTeam(row.teamId).name).join("|");
}

function getDayKeyForTimeZone(value, timeZone = "America/Los_Angeles") {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function getLatestUpdatedAt(items) {
  const latestTimestamp = items.reduce((latest, item) => {
    const timestamp = new Date(item?.updatedAt || "").getTime();
    return Number.isFinite(timestamp) && timestamp > latest ? timestamp : latest;
  }, 0);

  return latestTimestamp ? new Date(latestTimestamp).toISOString() : "";
}

function formatExpectedSourceUpdatedAt(value) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "America/Los_Angeles",
    timeZoneName: "short",
    year: "numeric"
  }).format(new Date(value));
}

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

function hideFutureStartedFixtures(data, nowIso) {
  const now = new Date(nowIso).getTime();

  for (const fixture of data.fixtures || []) {
    if (!fixture.kickoffUtc || new Date(fixture.kickoffUtc).getTime() <= now) {
      continue;
    }

    fixture.status = "SCHEDULED";
    delete fixture.score;
  }
}

try {
  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector(".match-row");

  assert(new URL(page.url()).search === "", "The default match view should keep the URL clean.");
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
    (await page.locator(".key-info-team h4 .key-info-heading .flag").count()) > 0,
    "Key information headings should show the country flag before the label."
  );
  assert(
    (await page.locator(".key-info-team h4 .player-link").count()) === 0,
    "Key information headings should use tactical subtext, not player links."
  );
  assert(
    (await page.locator(".key-info-team .team-style-tags li").count()) >= 2,
    "Key information should show compact tactical style pills."
  );
  const paragraphPlayerDecoration = await page
    .locator(".key-info-team p .player-link")
    .first()
    .evaluate((link) => getComputedStyle(link).textDecorationLine);
  const paragraphPlayerOpacity = await page
    .locator(".key-info-team p .player-link")
    .first()
    .evaluate((link) => Number(getComputedStyle(link).opacity));
  const paragraphPlayerWeight = await page
    .locator(".key-info-team p .player-link")
    .first()
    .evaluate((link) => Number(getComputedStyle(link).fontWeight));
  assert(paragraphPlayerDecoration === "none", "Paragraph player mentions should not be underlined.");
  assert(
    paragraphPlayerOpacity === 1 && paragraphPlayerWeight >= 500,
    "Paragraph player mentions should use full opacity and medium emphasis."
  );
  await page.locator(".player-link").first().hover();
  const playerCard = page.locator(".player-card").first();
  await playerCard.waitFor({ state: "visible" });
  assert(
    (await playerCard.locator(".player-photo img, .player-photo-fallback").count()) === 1,
    "Player hover card should include a face or initials fallback."
  );
  assert(
    (await playerCard.locator(".player-card-name").count()) === 1 &&
      (await playerCard.locator(".player-card-position").count()) === 1 &&
      (await playerCard.locator(".player-card-club").count()) === 1,
    "Player hover card should include name, position, and club lines."
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

  await page.goto(`${baseUrl}?view=matches&date=2026-06-21&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="belgium-ir-iran-2026-06-21"]').click();
  const lukakuLink = page.locator(".key-info-team .player-link", { hasText: "Romelu Lukaku" }).first();
  const lukakuCard = lukakuLink
    .locator("xpath=ancestor::span[contains(concat(' ', normalize-space(@class), ' '), ' player-hover ')][1]")
    .locator(".player-card");
  await lukakuLink.hover();
  await lukakuCard.waitFor({ state: "visible" });
  assert(
    (await lukakuCard.locator(".player-card-name").innerText()).trim() === "Romelu Lukaku" &&
      (await lukakuCard.locator(".player-card-number").innerText()).trim() === "#9",
    "Player hover card should show the country-team uniform number beside the name when available."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-11&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="mexico-south-africa-2026-06-11"]').click();
  const mexicoParagraphLinks = await page
    .locator(".key-info-team")
    .first()
    .locator("p .player-link")
    .evaluateAll((links) => links.map((link) => link.textContent.trim()));
  const normalizedMexicoParagraphLinks = mexicoParagraphLinks.map((text) =>
    text.normalize("NFD").replace(/\p{Diacritic}/gu, "")
  );
  assert(
    normalizedMexicoParagraphLinks.some((text) => text.includes("Gimenez")) &&
      normalizedMexicoParagraphLinks.some((text) => text.includes("Alvarez")),
    "Mexico's accented player aliases should link from the matchup paragraph."
  );
  const gimenezLink = page
    .locator(".key-info-team")
    .first()
    .locator("p .player-link", { hasText: /^Gim[eé]nez$/ })
    .first();
  const gimenezCard = gimenezLink
    .locator("xpath=ancestor::span[contains(concat(' ', normalize-space(@class), ' '), ' player-hover ')][1]")
    .locator(".player-card");
  await gimenezLink.hover();
  await gimenezCard.waitFor({ state: "visible" });
  assert(
    (await gimenezLink.getAttribute("aria-label"))?.startsWith("Santiago Giménez:"),
    "Mexico's unaccented Gimenez paragraph alias should open Santiago Giménez's hover card."
  );
  assert(
    (await gimenezCard.locator(".player-card-name").innerText()).trim() === "Santiago Giménez" &&
      (await gimenezCard.locator(".player-card-position").innerText()).trim() === "Striker",
    "Player hover card should show the display name above the position."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-26&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="cabo-verde-saudi-arabia-2026-06-26"]').click();
  const vozinhaLink = page.locator(".key-info-team .player-link", { hasText: "Vozinha" }).first();
  assert(
    (await vozinhaLink.count()) === 1,
    "Single-name player aliases should link from key information."
  );
  const vozinhaCard = vozinhaLink
    .locator("xpath=ancestor::span[contains(concat(' ', normalize-space(@class), ' '), ' player-hover ')][1]")
    .locator(".player-card");
  await vozinhaLink.hover();
  await vozinhaCard.waitFor({ state: "visible" });
  assert(
    (await vozinhaCard.locator(".player-photo img, .player-photo-fallback").count()) === 1,
    "Single-name player hover cards should include a face or initials fallback."
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
      historicalGroupDetailText.includes("Result") &&
      historicalGroupDetailText.includes("Key information") &&
      historicalGroupDetailText.includes("Past matches"),
    "Historical match details should follow the current detail section structure."
  );
  assert(
    historicalGroupDetailText.includes("Ecuador beat Qatar 2-0") &&
      historicalGroupDetailText.includes("Ecuador took three points from World Cup 2022 / Group A"),
    "Historical result details should summarize the archived final score."
  );
  const historicalResultHighlights = await page
    .locator("#match-info .result-highlights li")
    .evaluateAll((items) => items.map((item) => item.textContent.trim()));
  assert(
    historicalResultHighlights.length >= 3 &&
      historicalResultHighlights.every((text) => text.length <= 95) &&
      historicalResultHighlights.some((text) => text.startsWith("🌟")),
    "Historical result bullets should stay compact and use the rewritten outcome/moment/impact style."
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

  await page.goto(`${baseUrl}?view=matches&date=1930-07-13&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator(".match-row").first().click();
  const firstHistoricalDetailText = await page.locator("#match-info").innerText();
  assert(
    firstHistoricalDetailText.includes("World Cup 1930") &&
      firstHistoricalDetailText.includes("France beat Mexico 4-1") &&
      firstHistoricalDetailText.includes("France took three points from World Cup 1930 / Group 1"),
    "Historical result details should reach back to the first loaded World Cup match."
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
  await page.setViewportSize({ width: 640, height: 720 });
  await page.waitForTimeout(80);
  const switzerlandBosniaRow = page.locator('[data-match-id="switzerland-bosnia-2026-06-18"]');
  const bosniaMatchTeam = switzerlandBosniaRow.locator(".team.has-team-tooltip", {
    hasText: "Bosnia and Herzegovina"
  });
  const qatarMatchTeam = page.locator('[data-match-id="canada-qatar-2026-06-18"] .team', {
    hasText: "Qatar"
  });
  assert(
    !(await qatarMatchTeam.evaluate((team) => team.classList.contains("has-team-tooltip"))),
    "Short match row names should not show full-name tooltips when they are not truncated."
  );
  await bosniaMatchTeam.hover();
  await page.waitForTimeout(160);
  const bosniaMatchTooltip = await bosniaMatchTeam.evaluate((team) => {
    const name = team.querySelector(".team-name");
    const teamRect = team.getBoundingClientRect();
    const nameRect = name.getBoundingClientRect();
    const tooltipStyle = getComputedStyle(team, "::after");
    return {
      anchor: Number(getComputedStyle(team).getPropertyValue("--name-tooltip-anchor").replace("px", "")),
      content: tooltipStyle.content,
      expectedAnchor: Math.round(nameRect.left - teamRect.left + nameRect.width / 2),
      opacity: Number(tooltipStyle.opacity),
      tooltip: team.getAttribute("data-tooltip")
    };
  });
  assert(
    bosniaMatchTooltip.tooltip === "Bosnia and Herzegovina" &&
      bosniaMatchTooltip.content.includes("Bosnia and Herzegovina") &&
      Math.abs(bosniaMatchTooltip.anchor - bosniaMatchTooltip.expectedAnchor) <= 1 &&
      bosniaMatchTooltip.opacity > 0.9,
    "Bosnia and Herzegovina should reveal its full name when the shortened match row label is hovered."
  );
  await page.setViewportSize({ width: 1280, height: 720 });
  await switzerlandBosniaRow.click();
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

  const japanSearchCheck = await openPageAtTime(
    "2026-06-21T21:00:00.000Z",
    "/?view=matches&team=japan&tz=America%2FLos_Angeles"
  );
  const japanSearchRows = await japanSearchCheck.page.locator(".match-row").evaluateAll((rows) =>
    rows.map((row) => ({
      id: row.dataset.matchId,
      label: row.getAttribute("aria-label") || ""
    }))
  );
  assert(
    japanSearchRows.some((row) => row.id === "japan-sweden-2026-06-25"),
    "Japan country search should include Japan vs Sweden."
  );
  assert(
    japanSearchRows.every((row) => row.label.includes("Japan")) &&
      !japanSearchRows.some((row) => row.id === "panama-croatia-2026-06-23"),
    "Japan country search should not include Panama fixtures through the PAN team id."
  );
  await japanSearchCheck.context.close();

  const panSearchCheck = await openPageAtTime(
    "2026-06-21T21:00:00.000Z",
    "/?view=matches&team=PAN&tz=America%2FLos_Angeles"
  );
  const panSearchRows = await panSearchCheck.page.locator(".match-row").evaluateAll((rows) =>
    rows.map((row) => ({
      id: row.dataset.matchId,
      label: row.getAttribute("aria-label") || ""
    }))
  );
  assert(
    panSearchRows.some((row) => row.id === "panama-croatia-2026-06-23"),
    "PAN country search should include Panama vs Croatia."
  );
  assert(
    panSearchRows.every((row) => row.label.includes("Panama")) &&
      !panSearchRows.some((row) => row.id === "japan-sweden-2026-06-25"),
    "PAN country search should not include Japan fixtures through text inside Japan."
  );
  await panSearchCheck.context.close();

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
    (await liveFallbackRow.locator(".match-score").count()) === 0,
    "A live fixture without a loaded score should not show a fallback score."
  );
  const liveScoreLink = liveFallbackRow.locator(".live-pill");
  assert(
    (await liveScoreLink.count()) === 1,
    "A live fixture without a loaded score should show a Live score link."
  );
  assert(
    (await liveScoreLink.getAttribute("href")) === fifaWorldCupScoresUrl &&
      (await liveScoreLink.getAttribute("title")) === "Check latest score at FIFA" &&
      (await liveScoreLink.getAttribute("data-tooltip")) === "Check latest score at FIFA",
    "The live pill should link to FIFA scores and expose the hover tooltip copy."
  );
  const liveFallbackText = (await liveFallbackRow.innerText()).replace(/\s+/g, " ").trim();
  const liveFallbackUpperText = liveFallbackText.toUpperCase();
  const liveFallbackOrder = ["CZECHIA", "VS", "SOUTH AFRICA", "LIVE"].map((text) =>
    liveFallbackUpperText.indexOf(text)
  );
  assert(
    liveFallbackOrder.every((index) => index >= 0) &&
      liveFallbackOrder.every((index, itemIndex) => itemIndex === 0 || index > liveFallbackOrder[itemIndex - 1]),
    "A live fixture without a loaded score should keep vs between teams and show Live after the matchup."
  );
  assert(
    !liveFallbackText.includes("0-0"),
    "The visible live row text should not include a guessed 0-0 score."
  );
  const liveFallbackMetaText = await liveFallbackRow
    .locator(".match-row-meta > *")
    .evaluateAll((items) => items.map((item) => item.innerText.trim().toUpperCase()).join("|"));
  assert(
    liveFallbackMetaText === "LIVE",
    "The Live pill should be the only live-state metadata when no verified score is loaded."
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
    const nextKickoffUtc = nextScheduledFixture.kickoffUtc;
    const nextScheduledFixtureIds = fixturesData.fixtures
      .filter(
        (fixture) =>
          fixture.status === "SCHEDULED" &&
          fixture.kickoffUtc === nextKickoffUtc
      )
      .map((fixture) => fixture.id);
    const beforeKickoff = new Date(
      new Date(nextScheduledFixture.kickoffUtc).getTime() - 5 * 60 * 1000
    );
    const nextScheduledDate = getDayKeyForTimeZone(nextScheduledFixture.kickoffUtc);
    const upNextCheck = await openPageAtTime(
      beforeKickoff.toISOString(),
      `/?view=matches&date=${nextScheduledDate}&tz=America%2FLos_Angeles`,
      {
        fixtureTransform(data) {
          for (const fixture of data.fixtures || []) {
            if (fixture.status === "LIVE") {
              fixture.status = "FT";
              fixture.score ||= { home: 0, away: 0 };
            }
          }
        }
      }
    );
    await upNextCheck.page.waitForSelector(".match-row");
    assert(
      (await upNextCheck.page.locator(".up-next-pill").count()) === nextScheduledFixtureIds.length,
      "Every match at the next scheduled kickoff should show an Up next pill."
    );
    for (const fixtureId of nextScheduledFixtureIds) {
      assert(
        (await upNextCheck.page
          .locator(`.match-row[data-match-id="${fixtureId}"] .up-next-pill`)
          .count()) === 1,
        "Each next scheduled match row should show its own Up next pill."
      );
    }
    assert(
      (await upNextCheck.page.locator(".match-row.is-next").count()) === nextScheduledFixtureIds.length,
      "Every match at the next scheduled kickoff should use the next row state."
    );
    const upNextPillLabels = await upNextCheck.page.locator(".up-next-pill").evaluateAll((pills) =>
      pills.map((pill) => pill.textContent.trim())
    );
    assert(
      upNextPillLabels.every((label) => label === "Up next"),
      "Every Up next pill should use the expected label."
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
  assert(
    (await catchUpCheck.page.locator(".catch-up-header").count()) === 0 &&
      (await catchUpCheck.page.locator("#catch-up-popover").getAttribute("aria-label")) === "Catch Up",
    "The catch-up popover should not show a header title or date range."
  );
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
        "Colombia take control of Group K",
        "Ghana leave it late against Panama",
        "England look sharp against Croatia",
        "Portugal and DR Congo split the points",
        "Austria look sharp against Jordan"
      ].join("|"),
    "The catch-up feed should show the latest updates first."
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

  const latestCatchUpNow = "2026-06-19T18:20:00.000Z";
  const latestCatchUpCheck = await openPageAtTime(
    latestCatchUpNow,
    "/?view=matches&date=2026-06-19&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        hideFutureStartedFixtures(data, latestCatchUpNow);
      }
    }
  );
  await latestCatchUpCheck.page.locator("#catch-up-button").click();
  const latestCatchUpItems = await latestCatchUpCheck.page.locator(".catch-up-item").evaluateAll((items) =>
    items.map((item) => ({
      headline: item.querySelector(".catch-up-title-row h3 > span")?.textContent.trim(),
      sourceHref: item.querySelector(".catch-up-source")?.getAttribute("href") || ""
    }))
  );
  const mexicoCatchUpItem = latestCatchUpItems.find((item) =>
    item.headline?.includes("Mexico edge South Korea")
  );
  const canadaCatchUpItem = latestCatchUpItems.find((item) =>
    item.headline?.includes("Canada make a statement against Qatar")
  );
  assert(
    mexicoCatchUpItem?.sourceHref.includes("mexico-south-korea-world-cup-2026-group-a-match-report"),
    "Generated Mexico/South Korea result catch-up should link to its report source."
  );
  assert(
    canadaCatchUpItem?.sourceHref.includes("canada-qatar-world-cup-2026-group-b-match-report"),
    "Generated Canada/Qatar result catch-up should link to its report source."
  );
  await latestCatchUpCheck.context.close();

  const sourceFreshnessCheck = await openPageAtTime("2026-06-18T15:57:00.000Z");
  const sourceNote = sourceFreshnessCheck.page.locator("#source-note");
  const sourceNoteText = await sourceNote.innerText();
  const sourceLinkLabels = await sourceNote.locator("a").evaluateAll((links) =>
    links.map((link) => link.textContent.trim()).join("|")
  );
  const reportIssueHref = await sourceNote.locator("a", { hasText: "Report issue" }).getAttribute("href");
  const expectedSourceUpdatedAt = formatExpectedSourceUpdatedAt(getLatestUpdatedAt(sourceNoteData));
  assert(
    sourceNoteText ===
      `Sources: FIFA schedule, debutants, ranking, standings. Predictions are unofficial. Last updated ${expectedSourceUpdatedAt}. Report issue.`,
    "The source note should stay short and show the latest website update time."
  );
  assert(
    sourceLinkLabels === "FIFA schedule|debutants|ranking|standings|Report issue",
    "The source note should keep the compact official source links."
  );
  assert(reportIssueHref === "report.html", "The source note should link to the report issue page.");
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
  assert(
    !new URL(page.url()).searchParams.has("date"),
    "Reload should replace stale date state with a clean today URL."
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
    groupOrderCheck.groupB?.join("|") === getExpectedStandingOrder("B"),
    "Group B should preserve the checked table order."
  );
  const bosniaStandingTeam = page
    .locator(".standings-card", { hasText: "Group B" })
    .locator(".standing-team", { hasText: "Bosnia and Herzegovina" });
  await bosniaStandingTeam.hover();
  await page.waitForTimeout(160);
  const bosniaTooltip = await bosniaStandingTeam.evaluate((team) => {
    const name = team.querySelector(".standing-name");
    const teamRect = team.getBoundingClientRect();
    const nameRect = name.getBoundingClientRect();
    const tooltipStyle = getComputedStyle(team, "::after");
    return {
      anchor: Number(getComputedStyle(team).getPropertyValue("--name-tooltip-anchor").replace("px", "")),
      content: tooltipStyle.content,
      expectedAnchor: Math.round(nameRect.left - teamRect.left + nameRect.width / 2),
      hasTooltip: team.classList.contains("has-name-tooltip"),
      opacity: Number(tooltipStyle.opacity),
      tooltip: team.getAttribute("data-tooltip")
    };
  });
  assert(
    bosniaTooltip.tooltip === "Bosnia and Herzegovina" &&
      (!bosniaTooltip.hasTooltip ||
        (bosniaTooltip.content.includes("Bosnia and Herzegovina") &&
          Math.abs(bosniaTooltip.anchor - bosniaTooltip.expectedAnchor) <= 1 &&
          bosniaTooltip.opacity > 0.9)),
    "Bosnia and Herzegovina should use the available standings row width and only show a tooltip if it actually overflows."
  );
  assert(
    groupOrderCheck.groupK?.join("|") === getExpectedStandingOrder("K"),
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
  assert(
    getExpectedThirdPlaceRaceRows().some((candidate) => candidate.groupId === "B") &&
    (await page.locator(".standings-card", { hasText: "Group B" }).locator(".third-place-pill").innerText()).trim() ===
      `3rd race ${formatOrdinal(getExpectedThirdPlaceRaceRows().find((candidate) => candidate.groupId === "B").position)}`,
    "Group standings should show each current third-place team's cross-group race position."
  );
  await page.locator("#standings-third-place-tab").click();
  await page.waitForFunction(
    () => document.querySelectorAll(".third-place-table tbody tr:not(.third-place-cut-row)").length === 12
  );
  assert(
    new URL(page.url()).searchParams.get("standingsMode") === "third-place",
    "The third-place race section should be linkable from the URL."
  );
  assert(
    (await page.locator("#standings-mode-tabs").isVisible()) &&
      (await page.locator("#standings-third-place-tab").evaluate((tab) => tab.getAttribute("aria-pressed") === "true")) &&
      (await page.locator("#standings-heading").isVisible()) &&
      (await page.locator("#standings-summary").innerText()).includes("Current third-place teams") &&
      !(await page.locator(".third-place-race-header").isVisible()) &&
      (await page.locator(".third-place-table").isVisible()),
    "The third-place race should keep the standings heading, mode-specific summary, and section tabs visible."
  );
  const thirdPlaceRaceCheck = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".third-place-table tbody tr:not(.third-place-cut-row)")];
    const rowSummaries = rows.map((row) => {
      const statusPill = row.querySelector(".third-place-status");

      return {
        rank: row.children[0]?.textContent.trim(),
        team: row.querySelector(".standing-name")?.textContent.trim(),
        group: row.children[2]?.textContent.trim(),
        status: statusPill?.textContent.trim(),
        statusLabel: statusPill?.getAttribute("aria-label"),
        tooltip: statusPill?.getAttribute("data-tooltip")
      };
    });

    return {
      cutLineCount: document.querySelectorAll(".third-place-cut-row").length,
      cutLineText: document.querySelector(".third-place-cut-row")?.textContent.replace(/\s+/g, " ").trim(),
      headers: [...document.querySelectorAll(".third-place-table thead th")].map((header) =>
        header.textContent.trim()
      ),
      note: document.querySelector(".third-place-note")?.textContent.trim(),
      rowCount: rows.length,
      rowSummaries,
      visibleReasonCount: document.querySelectorAll(".third-place-reason").length
    };
  });
  const expectedThirdPlaceRaceRows = getExpectedThirdPlaceRaceRows();
  const expectedThirdPlaceTopFour = expectedThirdPlaceRaceRows
    .slice(0, 4)
    .map((row) => `${formatOrdinal(row.position)}:${row.team.name}`)
    .join("|");
  const expectedCutLineInside = expectedThirdPlaceRaceRows[getThirdPlaceAdvancerCount() - 1];
  const expectedFirstOut = expectedThirdPlaceRaceRows[getThirdPlaceAdvancerCount()];
  assert(thirdPlaceRaceCheck.rowCount === 12, "The third-place race should rank all 12 groups.");
  assert(
    thirdPlaceRaceCheck.rowSummaries
      .slice(0, 4)
      .map((row) => `${row.rank}:${row.team}`)
      .join("|") === expectedThirdPlaceTopFour,
    "The third-place race should sort by points, goal difference, goals scored, then deterministic fallback."
  );
  assert(
    thirdPlaceRaceCheck.cutLineCount === 1 &&
      thirdPlaceRaceCheck.cutLineText === "Top 8 advance",
    "The third-place race should draw one clear top-eight advancement line."
  );
  assert(
    thirdPlaceRaceCheck.headers.includes("Goals") && !thirdPlaceRaceCheck.headers.includes("GF"),
    "The third-place race should use the short Goals label instead of GF jargon."
  );
  assert(
    thirdPlaceRaceCheck.visibleReasonCount === 0 &&
      thirdPlaceRaceCheck.rowSummaries.every((row) => row.tooltip && !row.tooltip.includes("GF")),
    "The third-place race should hide row explanations behind status pill tooltips without GF jargon."
  );
  assert(
    thirdPlaceRaceCheck.rowSummaries.some((row) => row.status === "Just inside") &&
      thirdPlaceRaceCheck.rowSummaries.every((row) => row.status !== "Bubble in"),
    "The third-place race should use plain edge-of-cut-line status copy."
  );
  assert(
    expectedCutLineInside &&
      expectedFirstOut &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount() - 1]?.team === expectedCutLineInside.team.name &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount() - 1]?.status === expectedCutLineInside.status.label &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount() - 1]?.tooltip ===
        getExpectedThirdPlaceReason(expectedCutLineInside, expectedThirdPlaceRaceRows) &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount()]?.team === expectedFirstOut.team.name &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount()]?.status === expectedFirstOut.status.label &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount()]?.tooltip ===
        getExpectedThirdPlaceReason(expectedFirstOut, expectedThirdPlaceRaceRows),
    "A cut-line tie without loaded fair-play data should be marked pending on both sides of the line."
  );
  assert(
    thirdPlaceRaceCheck.note.includes("fair-play conduct"),
    "The third-place race note should explain unresolved fair-play tiebreaks."
  );
  await page.locator("#standings-groups-tab").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#standings-groups-tab")?.getAttribute("aria-pressed") === "true" &&
      document.querySelectorAll(".standings-card").length === 12
  );
  assert(
    !new URL(page.url()).searchParams.has("standingsMode") &&
      (await page.locator(".third-place-table").count()) === 0,
    "The visible section tabs should let users leave the third-place race."
  );
  await page.locator("#standings-third-place-tab").click();
  await page.waitForFunction(
    () => document.querySelectorAll(".third-place-table tbody tr:not(.third-place-cut-row)").length === 12
  );
  await page.locator(".third-place-group-button", { hasText: "Group F" }).click();
  await page.waitForFunction(
    () => document.activeElement === document.querySelector('.standings-card[data-group-id="F"]')
  );
  assert(
    await page.locator("#standings-groups-tab").evaluate((tab) => tab.getAttribute("aria-pressed") === "true"),
    "Clicking a race table group should switch back to the Groups section."
  );
  assert(
    !new URL(page.url()).searchParams.has("standingsMode"),
    "Clicking a race table group should leave the URL on the default Groups section."
  );
  assert(
    (await page.locator('.standings-card[data-group-id="F"] h2').innerText()).trim() === "Group F",
    "Clicking a race table group should focus the matching group card."
  );
  await page.locator("#standings-tournament-tab").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed") === "true" &&
      document.querySelectorAll(".r32-match").length === 16 &&
      document.querySelector('.progress-match[data-match-number="89"]')
  );
  assert(
    new URL(page.url()).searchParams.get("standingsMode") === "tournament",
    "The tournament section should be linkable from the URL."
  );
  const tournamentCheck = await page.evaluate(() => {
    const text = (selector) => document.querySelector(selector)?.textContent.replace(/\s+/g, " ").trim() || "";
    const allText = (selector) =>
      [...document.querySelectorAll(selector)]
        .map((element) => element.textContent.replace(/\s+/g, " ").trim())
        .join(" ");

    return {
      m74Text: text('.r32-match[data-match-number="74"]'),
      m89Text: text('.progress-match[data-match-number="89"]'),
      m97Text: text('.progress-match[data-match-number="97"]'),
      posterMetaCount: document.querySelectorAll(".poster-match-meta").length,
      posterSeedCount: document.querySelectorAll(".poster-team-seed").length,
      posterVisible: Boolean(document.querySelector(".tournament-poster-bracket")),
      progressCount: document.querySelectorAll(".progress-match").length,
      progressText: allText(".progress-match"),
      r32Count: document.querySelectorAll(".r32-match").length,
      r32Text: allText(".r32-match"),
      sideCount: document.querySelectorAll(".poster-side").length,
      roundHeadings: [...document.querySelectorAll(".progress-round h3")].map((heading) =>
        heading.textContent.trim()
      ),
      summary: document.querySelector("#standings-summary")?.textContent.trim(),
      tournamentVisible: Boolean(document.querySelector(".tournament-view"))
    };
  });
  assert(
    tournamentCheck.tournamentVisible &&
      tournamentCheck.posterVisible &&
      tournamentCheck.sideCount === 2 &&
      tournamentCheck.r32Count === 16 &&
      tournamentCheck.progressCount === 15,
    "The tournament section should show a two-sided Round of 32 poster plus progression rounds through the final."
  );
  assert(
    tournamentCheck.summary.includes("Finished knockout winners automatically fill the next round") &&
      tournamentCheck.m74Text.includes(getTeam(standingsData.groups?.E?.[0]?.teamId).id) &&
      tournamentCheck.m89Text.includes("Winner") &&
      tournamentCheck.m97Text.includes("Winner") &&
      tournamentCheck.posterMetaCount === 0 &&
      tournamentCheck.posterSeedCount === 0 &&
      !/\b(?:M\d+|To M\d+|Winner M\d+|W M\d+)\b/.test(`${tournamentCheck.r32Text} ${tournamentCheck.progressText}`) &&
      tournamentCheck.roundHeadings.join("|") === "Round of 16|Quarter-finals|Semi-finals|Final",
    "The tournament section should keep pending future slots readable without exposing match-number shorthand."
  );
  const knockoutProgressionCheck = await openPageAtTime(
    "2026-07-05T12:00:00.000Z",
    "/?view=matches&date=2026-06-17&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const finishMatch = (matchNumber, homeScore, awayScore) => {
          const fixture = data.fixtures.find((item) => item.matchNumber === matchNumber);

          fixture.status = "FT";
          fixture.score = { home: homeScore, away: awayScore };
        };

        finishMatch(74, 2, 0);
        finishMatch(77, 1, 0);
        finishMatch(89, 3, 1);
      }
    }
  );
  await knockoutProgressionCheck.page.locator("#standings-tab").click();
  await knockoutProgressionCheck.page.locator("#standings-tournament-tab").click();
  await knockoutProgressionCheck.page.waitForFunction(
    () => document.querySelector('.progress-match[data-match-number="97"] .knockout-team[data-source-match="89"]')
  );
  const progressionResolved = await knockoutProgressionCheck.page.evaluate(() => {
    const match89 = document.querySelector('.progress-match[data-match-number="89"]');
    const match97Source = document.querySelector(
      '.progress-match[data-match-number="97"] .knockout-team[data-source-match="89"]'
    );

    return {
      m89TeamIds: [...match89.querySelectorAll(".knockout-team[data-team-id]")].map(
        (team) => team.dataset.teamId
      ),
      m89Text: match89.textContent.replace(/\s+/g, " ").trim(),
      m89Winner: match89.dataset.winnerTeamId,
      m97SourceTeamId: match97Source?.dataset.teamId,
      m97Text: document
        .querySelector('.progress-match[data-match-number="97"]')
        ?.textContent.replace(/\s+/g, " ")
        .trim()
    };
  });
  assert(
    progressionResolved.m89TeamIds.join("|") === "GER|NOR" &&
      progressionResolved.m89Winner === "GER" &&
      progressionResolved.m97SourceTeamId === "GER" &&
      progressionResolved.m89Text.includes("GER advances") &&
      !progressionResolved.m89Text.includes("M97") &&
      progressionResolved.m97Text.includes("GER"),
    "Finished knockout source matches should automatically place their winners into later fixture slots."
  );
  await knockoutProgressionCheck.context.close();
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
  const mobileRowMetrics = await page.locator(".match-row").first().evaluate((row) => {
    const time = row.querySelector(".match-time");
    const teams = row.querySelector(".match-teams");
    const meta = row.querySelector(".match-row-meta");
    const rankPills = row.querySelectorAll(".match-teams .rank-pill");
    const timeStyle = getComputedStyle(time);
    const teamsStyle = getComputedStyle(teams);
    const timeBox = time.getBoundingClientRect();
    const teamsBox = teams.getBoundingClientRect();
    const metaBox = meta?.getBoundingClientRect();

    return {
      metaTop: metaBox?.top || 0,
      rankCount: rankPills.length,
      rowHeight: row.getBoundingClientRect().height,
      teamsFont: Number.parseFloat(teamsStyle.fontSize),
      teamsTop: teamsBox.top,
      timeFont: Number.parseFloat(timeStyle.fontSize),
      timeTop: timeBox.top
    };
  });
  assert(
    mobileRowMetrics.timeFont <= 14.5 &&
      mobileRowMetrics.teamsFont <= 15.5 &&
      mobileRowMetrics.rankCount >= 1,
    "Mobile match rows should keep compact time/team text with ranking pills visible."
  );
  assert(
    Math.abs(mobileRowMetrics.timeTop - mobileRowMetrics.teamsTop) <= 4 &&
      Math.abs(mobileRowMetrics.metaTop - mobileRowMetrics.teamsTop) <= 8,
    "Mobile match rows should keep the teams and score on the same visual row."
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator(".match-row").first().click();
  await page.waitForFunction(() => window.scrollY > 100);

  const touchContext = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 }
  });
  const touchPage = await touchContext.newPage();
  await touchPage.goto(`${baseUrl}?view=matches&date=2026-06-21&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await touchPage.waitForSelector(".match-row");
  await touchPage.locator('[data-match-id="belgium-ir-iran-2026-06-21"]').click();
  const touchPlayerLink = touchPage.locator(".key-info-team .player-link", { hasText: "Romelu Lukaku" }).first();
  await touchPlayerLink.click();
  const touchPlayerCard = touchPlayerLink
    .locator("xpath=ancestor::span[contains(concat(' ', normalize-space(@class), ' '), ' player-hover ')][1]")
    .locator(".player-card");
  await touchPlayerCard.waitFor({ state: "visible" });
  assert(
    (await touchPlayerLink.getAttribute("aria-expanded")) === "true" &&
      (await touchPlayerCard.locator(".player-card-name").innerText()).trim() === "Romelu Lukaku",
    "On touch devices, the first player-name tap should open the player card instead of navigating away."
  );
  await touchContext.close();

  console.log("UI smoke tests passed.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
