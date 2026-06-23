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
  const paragraphPlayerDecorationStyle = await page
    .locator(".key-info-team p .player-link")
    .first()
    .evaluate((link) => getComputedStyle(link).textDecorationStyle);
  const paragraphPlayerOpacity = await page
    .locator(".key-info-team p .player-link")
    .first()
    .evaluate((link) => Number(getComputedStyle(link).opacity));
  const paragraphPlayerWeight = await page
    .locator(".key-info-team p .player-link")
    .first()
    .evaluate((link) => Number(getComputedStyle(link).fontWeight));
  assert(
    paragraphPlayerDecoration === "underline" && paragraphPlayerDecorationStyle === "dotted",
    "Paragraph player mentions should use a soft dotted underline."
  );
  assert(
    paragraphPlayerOpacity === 1 && paragraphPlayerWeight <= 450,
    "Paragraph player mentions should use full opacity and regular paragraph weight."
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

  await page.goto(`${baseUrl}?view=matches&date=2026-06-20&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="netherlands-sweden-2026-06-20"]').click();
  const summervilleLink = page.locator(".player-link", { hasText: "Crysencio Summerville" }).first();
  await summervilleLink.hover();
  const summervilleCard = summervilleLink
    .locator("xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' player-hover ')]")
    .locator(".player-card");
  await summervilleCard.waitFor({ state: "visible" });
  assert(
    (await summervilleCard.locator(".player-card-position").innerText()).trim() === "Winger",
    "Player hover card should normalize lowercase source positions for display."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-22&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="france-iraq-2026-06-22"]').click();
  const franceMentionCommaGap = await page
    .locator(".key-info-team")
    .first()
    .locator("p")
    .evaluate((paragraph) => {
      const link = [...paragraph.querySelectorAll(".player-link")].find(
        (candidate) => candidate.textContent.trim() === "Kylian Mbappe"
      );
      const hover = link?.closest(".player-hover");
      const nextText = hover?.nextSibling;

      if (!link || nextText?.nodeType !== Node.TEXT_NODE || !nextText.textContent.startsWith(",")) {
        return Number.POSITIVE_INFINITY;
      }

      const commaRange = document.createRange();
      commaRange.setStart(nextText, 0);
      commaRange.setEnd(nextText, 1);

      return commaRange.getBoundingClientRect().left - link.getBoundingClientRect().right;
    });
  assert(
    franceMentionCommaGap >= 0 && franceMentionCommaGap < 1,
    "Linked player mentions should not insert spaces before comma punctuation."
  );

  await page.setViewportSize({ width: 360, height: 760 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-21&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="new-zealand-egypt-2026-06-21"]').click();
  const scorerHighlightMetrics = await page.locator("#match-info .scorer-highlight").evaluate((item) => {
    const segments = [...item.querySelectorAll(".goal-scorer-segment")];

    return {
      hasStandaloneSoccerIcon: [...item.children].some((child) => child.textContent.trim() === "⚽"),
      segmentCount: segments.length,
      segmentTexts: segments.map((segment) => segment.textContent.trim()),
      segmentFlags: segments.map((segment) => {
        const flag = segment.querySelector(".goal-scorer-flag .flag");
        const minute = segment.querySelector(".goal-minute");
        const flagBox = flag?.getBoundingClientRect();
        const minuteBox = minute?.getBoundingClientRect();

        return {
          label: flag?.getAttribute("aria-label") || "",
          hasFlag: Boolean(flag),
          flagBeforeMinute: Boolean(flagBox && minuteBox && flagBox.right <= minuteBox.left),
          verticalDelta:
            flagBox && minuteBox
              ? Math.abs((flagBox.top + flagBox.bottom - minuteBox.top - minuteBox.bottom) / 2)
              : Number.POSITIVE_INFINITY
        };
      })
    };
  });
  const scorerPlayerDecoration = await page
    .locator("#match-info .scorer-highlight .player-link")
    .first()
    .evaluate((link) => getComputedStyle(link).textDecorationLine);
  const scorerPlayerDecorationStyle = await page
    .locator("#match-info .scorer-highlight .player-link")
    .first()
    .evaluate((link) => getComputedStyle(link).textDecorationStyle);
  assert(
    !scorerHighlightMetrics.hasStandaloneSoccerIcon &&
      scorerHighlightMetrics.segmentCount === 4 &&
      scorerHighlightMetrics.segmentTexts[0].includes("15'") &&
      scorerHighlightMetrics.segmentTexts[0].includes("Finn Surman") &&
      scorerHighlightMetrics.segmentTexts[1].includes("58'") &&
      scorerHighlightMetrics.segmentTexts[1].includes("Mostafa Ziko") &&
      scorerHighlightMetrics.segmentFlags[0]?.label === "New Zealand flag" &&
      scorerHighlightMetrics.segmentFlags.slice(1).every((flag) => flag.label === "Egypt flag") &&
      scorerHighlightMetrics.segmentFlags.every(
        (flag) => flag.hasFlag && flag.flagBeforeMinute && flag.verticalDelta <= 4
      ),
    "Scorer highlights should replace the standalone soccer ball with country flags before each scorer minute."
  );
  assert(
    scorerPlayerDecoration === "underline" && scorerPlayerDecorationStyle === "dotted",
    "Scorer player mentions should use the same soft dotted underline as paragraph mentions."
  );
  await page.setViewportSize({ width: 1280, height: 720 });

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

  await page.goto(`${baseUrl}?view=matches&date=2026-06-20&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="tunisia-japan-2026-06-20"]').click();
  const japanTunisiaChineseInfo = await page.locator(".key-info-team").last().locator("p").innerText();
  assert(
    japanTunisiaChineseInfo.includes("上田绮世") &&
      japanTunisiaChineseInfo.includes("堂安律") &&
      japanTunisiaChineseInfo.includes("镰田大地") &&
      japanTunisiaChineseInfo.includes("对阵突尼斯"),
    "Chinese Japan key information should localize the post-Kubo key-player trio against Tunisia."
  );
  assert(
    !/Takefusa Kubo|久保建英|Ayase Ueda/.test(japanTunisiaChineseInfo),
    "Chinese Japan key information should not surface Kubo or raw English Ueda after the Tunisia absence update."
  );
  const uedaChineseLink = page.locator(".key-info-team").last().locator(".player-link", { hasText: "上田绮世" }).first();
  assert(
    (await uedaChineseLink.count()) === 1,
    "Chinese key information should link Ayase Ueda's localized name."
  );
  await uedaChineseLink.hover();
  const uedaChineseCard = uedaChineseLink
    .locator("xpath=ancestor::span[contains(concat(' ', normalize-space(@class), ' '), ' player-hover ')][1]")
    .locator(".player-card");
  await uedaChineseCard.waitFor({ state: "visible" });
  assert(
    (await uedaChineseCard.locator(".player-card-name").innerText()).trim() === "上田绮世" &&
      (await uedaChineseCard.locator(".player-card-club").innerText()).includes("费耶诺德"),
    "Chinese Ayase Ueda hover card should localize the display name and club."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-25&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="japan-sweden-2026-06-25"]').click();
  const japanSwedenChineseInfo = await page.locator(".key-info-team").first().locator("p").innerText();
  assert(
    japanSwedenChineseInfo.includes("上田绮世") &&
      japanSwedenChineseInfo.includes("对阵瑞典") &&
      !/Takefusa Kubo|久保建英|Ayase Ueda/.test(japanSwedenChineseInfo),
    "Chinese Japan key information should carry the non-Kubo Japan trio forward against Sweden."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-11&lang=en&tz=America%2FLos_Angeles`, {
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
  assert(
    (await page.locator("#match-info .standings-table .rank-pill").count()) >= 4,
    "Current match detail group standings should show FIFA ranking pills."
  );
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
    .evaluateAll((items) => items.map((item) => item.textContent.replace(/\s+/g, " ").trim()));
  const historicalScorerHighlight = await page.locator("#match-info .scorer-highlight").evaluate((item) => {
    const segments = [...item.querySelectorAll(".goal-scorer-segment")];
    return {
      hasStandaloneSoccerIcon: [...item.children].some((child) => child.textContent.trim() === "⚽"),
      segmentFlags: segments.map((segment) => segment.querySelector(".goal-scorer-flag .flag")?.getAttribute("aria-label") || ""),
      segmentTexts: segments.map((segment) => segment.textContent.replace(/\s+/g, " ").trim())
    };
  });
  assert(
    !historicalScorerHighlight.hasStandaloneSoccerIcon &&
      historicalScorerHighlight.segmentFlags.every((label) => label === "Ecuador flag") &&
      historicalScorerHighlight.segmentTexts.some((text) => text.includes("16' Enner Valencia")) &&
      historicalScorerHighlight.segmentTexts.some((text) => text.includes("31' Enner Valencia")),
    "Historical result details should show country flags before archived scorer names and minutes."
  );
  const historicalNarrativeHighlights = historicalResultHighlights.filter(
    (text) => !text.includes("16' Enner Valencia") && !text.includes("31' Enner Valencia")
  );
  assert(
    historicalNarrativeHighlights.length >= 2 &&
      historicalNarrativeHighlights.every((text) => text.length <= 95) &&
      historicalNarrativeHighlights.some((text) => text.startsWith("🌟")),
    "Historical result bullets should stay compact and use the rewritten outcome/moment/impact style."
  );
  assert(
    !historicalGroupDetailText.includes("Archived result shown instead of a pre-match probability"),
    "Historical match details should use the back-then prediction card instead of the archive-only result copy."
  );
  assert(
    historicalGroupDetailText.includes("Qatar's 2022 match lens runs through Akram Afif, Almoez Ali, and Abdulaziz Hatem") &&
      historicalGroupDetailText.includes("Against Ecuador, Qatar had to beat Ecuador's scoring threat through Enner Valencia") &&
      historicalGroupDetailText.includes("Ecuador's 2022 match lens runs through Enner Valencia"),
    "Historical key information should use era-specific roster and matchup copy."
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
  await page.locator("#settings-button").click();
  assert(
    await page.locator("#settings-popover").isVisible(),
    "Settings should reveal language and timezone controls."
  );
  await page.locator("#timezone-select").selectOption("Asia/Tokyo");
  assert(
    (await page.locator("#day-label").innerText()).trim() === "Today",
    "Changing timezone while viewing Today should keep the view on Today."
  );
  assert(
    (await page.evaluate(() => localStorage.getItem("world-cup-simplified-timezone"))) === "Asia/Tokyo",
    "Changing timezone should persist the selection for account-free reloads."
  );
  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector(".match-row");
  assert(
    (await page.locator("#timezone-select").inputValue()) === "Asia/Tokyo",
    "A saved timezone should be restored on a clean visit without requiring an account."
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
  assert(
    (await page.locator(".yesterday-section").count()) === 1,
    "Past 24 hours banner should be shown by default when previous-day matches are available."
  );
  assert(
    (await page.locator(".yesterday-section-header h2").innerText()).includes("Past 24 hours (Jun 17)"),
    "Previous-day match banner should use the Past 24 hours title with an abbreviated date."
  );
  assert(
    (await page.locator(".yesterday-dismiss-icon").count()) === 1,
    "Past 24 hours dismiss control should render an icon glyph."
  );
  await page.locator(".yesterday-dismiss").click();
  assert(
    (await page.evaluate(() => localStorage.getItem("world-cup-simplified-show-yesterday"))) === "false",
    "Closing the Past 24 hours banner should persist the account-free display preference."
  );
  assert(
    (await page.locator(".yesterday-section").count()) === 0,
    "Closing the Past 24 hours banner should hide it immediately."
  );
  await page.goto(`${baseUrl}?view=matches&date=2026-06-18&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  assert(
    (await page.locator(".yesterday-section").count()) === 0,
    "A closed Past 24 hours banner should stay hidden on reload."
  );
  await page.locator("#settings-button").click();
  assert(
    await page.evaluate(() => document.querySelector("#show-yesterday-toggle")?.checked === false),
    "Closing the Past 24 hours banner should also turn off the Show yesterday setting."
  );
  await page.locator(".settings-toggle-control").click();
  assert(
    (await page.locator(".yesterday-section").count()) === 1 &&
      (await page.evaluate(() => localStorage.getItem("world-cup-simplified-show-yesterday"))) === "true",
    "Turning Show yesterday back on should restore the Past 24 hours banner."
  );
  await page.keyboard.press("Escape");
  assert(
    !(await page.locator("#settings-popover").isVisible()),
    "Settings should close before testing match-row interactions underneath it."
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
  const june17Scores = await matchStateCheck.page.locator("#match-list > .match-row .match-score").evaluateAll((scores) =>
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
      dateTime: row.querySelector(".match-date")?.textContent.trim() || "",
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
  assert(
    japanSearchRows.some(
      (row) =>
        row.id === "japan-sweden-2026-06-25" &&
        row.dateTime === "June 25 4:00PM" &&
        row.label.includes("June 25, 4:00PM")
    ),
    "Current country search rows should show and announce the match date and time on one line."
  );
  await japanSearchCheck.page.locator('[data-team-history-toggle="true"]').click();
  const japanArchiveRows = await japanSearchCheck.page
    .locator(".team-search-section.is-archive .match-row")
    .evaluateAll((rows) =>
      rows.map((row) => ({
        dateTime: row.querySelector(".match-date")?.textContent.trim() || "",
        label: row.getAttribute("aria-label") || ""
      }))
    );
  assert(
    japanArchiveRows.some(
      (row) =>
        /^June \d{1,2}, \d{4}$/.test(row.dateTime) &&
        !/\d{1,2}:\d{2}/.test(row.dateTime) &&
        row.label.includes(row.dateTime)
    ),
    "Archived country search rows should show and announce date-only labels with the year."
  );
  await japanSearchCheck.context.close();

  const japanChineseSearchCheck = await openPageAtTime(
    "2026-06-21T21:00:00.000Z",
    "/?view=matches&team=%E6%97%A5%E6%9C%AC&lang=zh&tz=America%2FLos_Angeles"
  );
  const japanChineseSearchRows = await japanChineseSearchCheck.page.locator(".match-row").evaluateAll((rows) =>
    rows.map((row) => ({
      id: row.dataset.matchId,
      label: row.getAttribute("aria-label") || ""
    }))
  );
  assert(
    japanChineseSearchRows.some((row) => row.id === "japan-sweden-2026-06-25"),
    "Chinese Japan country search should include Japan vs Sweden."
  );
  assert(
    japanChineseSearchRows.every((row) => row.label.includes("\u65e5\u672c")) &&
      !japanChineseSearchRows.some((row) => row.id === "panama-croatia-2026-06-23"),
    "Chinese Japan country search should not include Panama fixtures through the PAN team id."
  );
  assert(
    (await japanChineseSearchCheck.page.locator(".team-search-summary h2").innerText()).trim() ===
      "\u65e5\u672c",
    "Chinese Japan country search should show the localized team name in the heading."
  );
  await japanChineseSearchCheck.context.close();

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
    liveFallbackMetaText === "LIVE|SCORE PENDING",
    "The live row should label score-pending state when no verified score is loaded."
  );
  assert(
    (await liveFallbackRow.locator(".score-status.is-pending").count()) === 1,
    "A live fixture without a loaded score should show Score pending."
  );
  assert(
    (await liveFallbackRow.innerText()).includes("Score pending"),
    "The visible live row text should include Score pending."
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
    englandCatchUpItem?.headline === "England look sharp against Croatia" &&
      englandCatchUpItem.subtitle?.includes("England's 4-2 win gives them an early foothold in Group L") &&
      englandCatchUpItem.subtitle?.includes("scored twice"),
    "The completed England/Croatia match should render a title plus result description."
  );
  const catchUpKaneLink = catchUpCheck.page
    .locator(".catch-up-subtitle .player-link", { hasText: "Harry Kane" })
    .first();
  assert((await catchUpKaneLink.count()) === 1, "Catch-up player mentions should become player links.");
  const catchUpKaneDecoration = await catchUpKaneLink.evaluate(
    (link) => getComputedStyle(link).textDecorationLine
  );
  const catchUpKaneDecorationStyle = await catchUpKaneLink.evaluate(
    (link) => getComputedStyle(link).textDecorationStyle
  );
  assert(
    catchUpKaneDecoration === "underline" && catchUpKaneDecorationStyle === "dotted",
    "Catch-up player mentions should use the same soft dotted underline as paragraph mentions."
  );
  await catchUpKaneLink.hover();
  await catchUpKaneLink
    .locator("xpath=ancestor::span[contains(concat(' ', normalize-space(@class), ' '), ' player-hover ')][1]")
    .locator(".player-card")
    .waitFor({ state: "visible" });
  await catchUpCheck.page.locator("#settings-button").click();
  await catchUpCheck.page.locator('[data-language="zh"]').click();
  await catchUpCheck.page.locator("#catch-up-button").click();
  await catchUpCheck.page.locator("#catch-up-popover").waitFor({ state: "visible" });
  const catchUpChineseLinks = await catchUpCheck.page
    .locator(".catch-up-subtitle .player-link")
    .evaluateAll((links) => links.map((link) => link.textContent.trim()));
  assert(
    catchUpChineseLinks.includes("哈里·凯恩") && catchUpChineseLinks.includes("若昂·内维斯"),
    "Chinese catch-up player mentions should use localized player links."
  );
  assert(
    catchUpItems.every((item) => item.subtitle && !item.standouts && item.standoutBullets.length === 0),
    "The catch-up feed should show each news item as a headline with an inline subtitle."
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
    item.headline?.includes("Mexico narrowly beat South Korea")
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

  const tournamentCatchUpCheck = await openPageAtTime(
    "2026-06-23T02:08:00.000Z",
    "/?view=matches&date=2026-06-22&tz=America%2FLos_Angeles"
  );
  await tournamentCatchUpCheck.page.locator("#catch-up-button").click();
  const tournamentCatchUpItems = await tournamentCatchUpCheck.page
    .locator(".catch-up-item")
    .evaluateAll((items) =>
      items.map((item) => ({
        headline: item.querySelector(".catch-up-title-row h3 > span")?.textContent.trim(),
        subtitle: item.querySelector(".catch-up-subtitle")?.textContent.trim() || "",
        sourceHref: item.querySelector(".catch-up-source")?.getAttribute("href") || ""
      }))
    );
  const messiLeaderboardItem = tournamentCatchUpItems.find((item) =>
    item.headline?.includes("Messi leads all scorers with five World Cup goals")
  );
  assert(messiLeaderboardItem, "Tournament-level catch-up should include the Messi scoring-leader story.");
  assert(
    messiLeaderboardItem?.subtitle.includes("five goals from Argentina's first two matches") &&
      messiLeaderboardItem?.subtitle.includes("Golden Boot race"),
    "Tournament-level catch-up should show the scoring-leader story description."
  );
  assert(
    tournamentCatchUpItems.every((item) => !/[⚽🌟📊]/u.test(item.subtitle)),
    "Catch-up subtitles should render clean prose without result-highlight icons."
  );
  assert(
    messiLeaderboardItem?.sourceHref.includes("argentina-austria-match-report-highlights"),
    "Tournament-level catch-up should resolve source links from tournament source IDs."
  );
  await tournamentCatchUpCheck.page.locator("#settings-button").click();
  await tournamentCatchUpCheck.page.locator('[data-language="zh"]').click();
  await tournamentCatchUpCheck.page.locator("#catch-up-button").click();
  await tournamentCatchUpCheck.page.locator("#catch-up-popover").waitFor({ state: "visible" });
  const tournamentCatchUpChineseText = await tournamentCatchUpCheck.page.locator("#catch-up-popover").innerText();
  assert(
    tournamentCatchUpChineseText.includes("梅西以5球领跑世界杯射手榜"),
    "Tournament-level catch-up should translate authored news in Chinese."
  );
  assert(
    tournamentCatchUpChineseText.includes("前两场比赛后达到5球") &&
      tournamentCatchUpChineseText.includes("独自领跑金靴奖竞争"),
    "Tournament-level localized catch-up objects should render Chinese subtitles from data."
  );
  await tournamentCatchUpCheck.context.close();

  const sourceFreshnessCheck = await openPageAtTime("2026-06-18T15:57:00.000Z");
  const sourceNote = sourceFreshnessCheck.page.locator("#source-note");
  const sourceNoteText = await sourceNote.innerText();
  const sourceLinkLabels = await sourceNote.locator("a").evaluateAll((links) =>
    links.map((link) => link.textContent.trim()).join("|")
  );
  const reportIssueHref = await sourceNote.locator("a", { hasText: "Report issue" }).getAttribute("href");
  const creatorHref = await sourceNote.locator("a", { hasText: "Hirooaoy" }).getAttribute("href");
  const expectedSourceUpdatedAt = formatExpectedSourceUpdatedAt(getLatestUpdatedAt(sourceNoteData));
  assert(
    sourceNoteText ===
      `Sources: FIFA schedule, debutants, ranking, standings. Predictions are unofficial. Last updated ${expectedSourceUpdatedAt}. Report issue. Made by Hirooaoy`,
    "The source note should stay short and show the latest website update time."
  );
  assert(
    sourceLinkLabels === "FIFA schedule|debutants|ranking|standings|Report issue|Hirooaoy",
    "The source note should keep the compact official source links."
  );
  assert(reportIssueHref === "report.html", "The source note should link to the report issue page.");
  assert(
    creatorHref === "https://www.linkedin.com/in/hirooaoy",
    "The source note should link Hirooaoy to LinkedIn."
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

  const todayUrlDate = getDayKeyForTimeZone(new Date().toISOString());
  await page.goto(`${baseUrl}?view=matches&date=${todayUrlDate}&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(
    () => document.querySelector("#day-label")?.textContent.trim() === "Today"
  );
  await page
    .waitForFunction(() => !new URL(window.location.href).searchParams.has("date"), null, {
      timeout: 1000
    })
    .catch(() => {});
  const reloadedTodayUrl = page.url();
  assert(
    !new URL(reloadedTodayUrl).searchParams.has("date"),
    `Reload should replace stale date state with a clean today URL. Current URL: ${reloadedTodayUrl}`
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
  const groupStandingsRhythm = await page.evaluate(() => {
    const title = document.querySelector(".standings-title").getBoundingClientRect();
    const summary = document.querySelector("#standings-summary").getBoundingClientRect();
    const tabs = document.querySelector("#standings-mode-tabs").getBoundingClientRect();
    const grid = document.querySelector("#standings-grid").getBoundingClientRect();
    const shell = document.querySelector(".page-shell").getBoundingClientRect();

    return {
      gridGap: Math.round(grid.top - title.bottom),
      shellTop: Math.round(shell.top),
      tabsGap: Math.round(tabs.top - summary.bottom),
      titleTop: Math.round(title.top)
    };
  });
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
      (await page.locator("#standings-summary").innerText()).includes("Third-place standings across all groups") &&
      !(await page.locator(".third-place-race-header").isVisible()) &&
      (await page.locator(".third-place-table").isVisible()),
    "The third-place race should keep the standings heading, mode-specific summary, and section tabs visible."
  );
  const thirdPlaceStandingsRhythm = await page.evaluate(() => {
    const title = document.querySelector(".standings-title").getBoundingClientRect();
    const summary = document.querySelector("#standings-summary").getBoundingClientRect();
    const tabs = document.querySelector("#standings-mode-tabs").getBoundingClientRect();
    const grid = document.querySelector("#standings-grid").getBoundingClientRect();
    const shell = document.querySelector(".page-shell").getBoundingClientRect();

    return {
      gridGap: Math.round(grid.top - title.bottom),
      shellTop: Math.round(shell.top),
      tabsGap: Math.round(tabs.top - summary.bottom),
      titleTop: Math.round(title.top)
    };
  });
  assert(
    Math.abs(thirdPlaceStandingsRhythm.shellTop - groupStandingsRhythm.shellTop) <= 1 &&
      Math.abs(thirdPlaceStandingsRhythm.titleTop - groupStandingsRhythm.titleTop) <= 1 &&
      Math.abs(thirdPlaceStandingsRhythm.tabsGap - groupStandingsRhythm.tabsGap) <= 1 &&
      Math.abs(thirdPlaceStandingsRhythm.gridGap - groupStandingsRhythm.gridGap) <= 1,
    "The third-place race should use the same page, tab, and content spacing as the Groups standings section."
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
      document.querySelectorAll('.progress-match[data-match-number="74"]').length === 1 &&
      document.querySelector('.progress-match[data-match-number="89"]')
  );
  await page.waitForFunction(() => document.querySelectorAll(".progress-connectors path").length >= 30);
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
      m73ProgressText: text('.progress-match[data-match-number="73"]'),
      m74ProgressText: text('.progress-match[data-match-number="74"]'),
      m81TeamIds: [...document.querySelectorAll('.progress-match[data-match-number="81"] .knockout-team[data-team-id]')]
        .map((element) => element.dataset.teamId),
      m81Text: text('.progress-match[data-match-number="81"]'),
      m89Text: text('.progress-match[data-match-number="89"]'),
      m97Text: text('.progress-match[data-match-number="97"]'),
      oldWinnerCopy: allText(".tournament-view").includes(["Winner", "advances"].join(" ")),
      posterMetaCount: document.querySelectorAll(".poster-match-meta").length,
      posterSeedCount: document.querySelectorAll(".poster-team-seed").length,
      posterVisible: Boolean(document.querySelector(".tournament-poster-bracket")),
      progressCount: document.querySelectorAll(".progress-match").length,
      connectorPathCount: document.querySelectorAll(".progress-connectors path").length,
      progressText: allText(".progress-match"),
      r32Count: document.querySelectorAll(".r32-match").length,
      r32Text: allText(".r32-match"),
      sectionHeadingVisible: Boolean(document.querySelector(".tournament-section-heading")),
      sideCount: document.querySelectorAll(".poster-side").length,
      norwayTooltip: document.querySelector('.knockout-team[data-team-id="NOR"]')?.getAttribute("data-tooltip") || "",
      slotOddsCount: document.querySelectorAll(".knockout-slot-odds").length,
      slotOddsToneMismatches: [...document.querySelectorAll(".knockout-slot-odds")]
        .filter((element) => {
          const percentText = element.textContent.match(/(?:<1|>99|\d+)%/)?.[0]?.replace("%", "");

          if (!percentText) {
            return true;
          }

          const percent =
            percentText === "<1" ? 0.5 : percentText === ">99" ? 99.5 : Number(percentText);
          const expectedClass = percent >= 75 ? "is-high" : percent <= 25 ? "is-low" : "is-neutral";
          return !element.classList.contains(expectedClass);
        })
        .map((element) => element.textContent.replace(/\s+/g, " ").trim()),
      slotOddsText: allText(".knockout-slot-odds"),
      roundHeadings: [...document.querySelectorAll(".progress-round h3")].map((heading) =>
        heading.textContent.trim()
      ),
      summary: document.querySelector("#standings-summary")?.textContent.trim(),
      tournamentVisible: Boolean(document.querySelector(".tournament-view"))
    };
  });
  assert(
    tournamentCheck.tournamentVisible &&
      !tournamentCheck.posterVisible &&
      tournamentCheck.sideCount === 0 &&
      tournamentCheck.r32Count === 0 &&
      tournamentCheck.connectorPathCount >= 30 &&
      tournamentCheck.progressCount === 31,
    "The tournament section should show a progression-only bracket from the Round of 32 through the final."
  );
  assert(
    tournamentCheck.summary.includes("Round of 32 slots") &&
      tournamentCheck.m73ProgressText.includes("Jun 28 12:00PM") &&
      !tournamentCheck.m73ProgressText.includes("Jun 28 / 12:00PM") &&
      tournamentCheck.m74ProgressText.includes(getTeam(standingsData.groups?.E?.[0]?.teamId).id) &&
      tournamentCheck.m74ProgressText.includes("Group E Top 1") &&
      !tournamentCheck.m74ProgressText.includes("Group E Top 1 /") &&
      tournamentCheck.m81TeamIds.length === 2 &&
      !tournamentCheck.m81Text.includes("Group B/E/F/I/J third place") &&
      tournamentCheck.norwayTooltip === "Norway" &&
      tournamentCheck.slotOddsCount >= 16 &&
      tournamentCheck.slotOddsToneMismatches.length === 0 &&
      tournamentCheck.slotOddsText.includes("here") &&
      tournamentCheck.m89Text.includes("TBD") &&
      tournamentCheck.m97Text.includes("TBD") &&
      !tournamentCheck.m89Text.includes("Likely for now") &&
      !tournamentCheck.m97Text.includes("Likely for now") &&
      !tournamentCheck.sectionHeadingVisible &&
      !tournamentCheck.oldWinnerCopy &&
      tournamentCheck.posterMetaCount === 0 &&
      tournamentCheck.posterSeedCount === 0 &&
      !/\bWinner match \d+\b/.test(tournamentCheck.progressText) &&
      !/\b(?:M\d+|To M\d+|Winner M\d+|W M\d+)\b/.test(`${tournamentCheck.r32Text} ${tournamentCheck.progressText}`) &&
      tournamentCheck.roundHeadings.join("|") === "Round of 32|Round of 16|Quarter-finals|Semi-finals|Final",
    "The tournament section should show Round of 32 slot odds while leaving later rounds unfilled."
  );
  const tournamentLayoutChecks = [];
  for (const viewport of [
    { height: 900, width: 1280 },
    { height: 900, width: 700 },
    { height: 844, width: 390 },
    { height: 720, width: 320 }
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(80);
    tournamentLayoutChecks.push(
      await page.evaluate((viewportWidth) => {
        const documentElement = document.documentElement;
        const progression = document.querySelector(".tournament-progression");
        const match74 = document.querySelector('.progress-match[data-match-number="74"]');
        const seedLabels = [...document.querySelectorAll('.progress-match[data-match-number="74"] .knockout-seed-label')]
          .map((label) => [...label.children].map((line) => line.textContent.trim()).join("|"));
        const connector = document.querySelector(".progress-connectors");
        const connectorDisplay = connector ? getComputedStyle(connector).display : "";
        const progressionStyle = progression ? getComputedStyle(progression) : null;
        const matchStyle = match74 ? getComputedStyle(match74) : null;
        const matchRect = match74?.getBoundingClientRect();
        const overflowingParticipantLabels = [...document.querySelectorAll(".progress-match .knockout-team-copy")]
          .filter((copy) => {
            const copyRect = copy.getBoundingClientRect();
            const cardRect = copy.closest(".progress-match")?.getBoundingClientRect();

            return Boolean(
              cardRect &&
                (copyRect.left < cardRect.left - 1 ||
                  copyRect.right > cardRect.right + 1)
            );
          })
          .length;

        return {
          cardPadding: matchStyle ? Math.round(parseFloat(matchStyle.paddingLeft)) : 0,
          cardWithinViewport: Boolean(matchRect && matchRect.left >= 0 && matchRect.right <= viewportWidth),
          connectorDisplay,
          connectorPathCount: document.querySelectorAll(".progress-connectors path").length,
          overflowingParticipantLabels,
          progressionPadding: progressionStyle ? Math.round(parseFloat(progressionStyle.paddingLeft)) : 0,
          seedLines: seedLabels,
          scrollOverflow: Math.ceil(documentElement.scrollWidth - documentElement.clientWidth),
          viewportWidth
        };
      }, viewport.width)
    );
  }
  assert(
    tournamentLayoutChecks.every(
      (check) =>
        check.seedLines.includes("Group E|Top 1") &&
        check.overflowingParticipantLabels === 0 &&
        check.scrollOverflow <= 1 &&
        check.progressionPadding >= 10 &&
        check.cardPadding >= 8 &&
        check.cardWithinViewport &&
        (check.viewportWidth > 1250 ||
          (check.connectorDisplay === "none" && check.connectorPathCount === 0))
    ),
    "Tournament bracket seed labels should wrap cleanly with correct padding and no horizontal overflow at phone and desktop sizes."
  );
  await page.setViewportSize({ width: 1280, height: 720 });
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
    const match74 = document.querySelector('.progress-match[data-match-number="74"]');
    const match77 = document.querySelector('.progress-match[data-match-number="77"]');
    const match89 = document.querySelector('.progress-match[data-match-number="89"]');
    const match97Source = document.querySelector(
      '.progress-match[data-match-number="97"] .knockout-team[data-source-match="89"]'
    );

    return {
      m74Winner: match74?.dataset.winnerTeamId,
      m77Winner: match77?.dataset.winnerTeamId,
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
    progressionResolved.m89TeamIds.join("|") ===
      [progressionResolved.m74Winner, progressionResolved.m77Winner].join("|") &&
      progressionResolved.m89Winner === progressionResolved.m74Winner &&
      progressionResolved.m97SourceTeamId === progressionResolved.m74Winner &&
      progressionResolved.m89Text.includes(`${progressionResolved.m74Winner} won`) &&
      !progressionResolved.m97Text.includes("Winner match") &&
      !progressionResolved.m89Text.includes("M97") &&
      progressionResolved.m97Text.includes(progressionResolved.m74Winner),
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

  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-17&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  const tabletHeaderMetrics = await page.evaluate(() => {
    const catchUpButton = document.querySelector("#catch-up-button").getBoundingClientRect();
    const settingsButton = document.querySelector("#settings-button").getBoundingClientRect();

    return {
      overlapsSettings:
        catchUpButton.right > settingsButton.left &&
        catchUpButton.left < settingsButton.right &&
        catchUpButton.bottom > settingsButton.top &&
        catchUpButton.top < settingsButton.bottom
    };
  });
  assert(
    !tabletHeaderMetrics.overlapsSettings,
    "Catch Up should not overlap the Settings button at tablet widths."
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-17&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  const mobileHeaderMetrics = await page.evaluate(() => {
    const headerControls = document.querySelector("#header-controls").getBoundingClientRect();
    const catchUpButton = document.querySelector("#catch-up-button").getBoundingClientRect();
    const settingsButton = document.querySelector("#settings-button").getBoundingClientRect();

    return {
      controlsGap: settingsButton.left - catchUpButton.right,
      centerOffset: Math.abs(
        settingsButton.top +
          settingsButton.height / 2 -
          (catchUpButton.top + catchUpButton.height / 2)
      ),
      controlsRightGap: document.documentElement.clientWidth - headerControls.right,
      scrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  assert(
    mobileHeaderMetrics.controlsGap >= 0 && mobileHeaderMetrics.controlsGap <= 10,
    "Mobile Catch Up and Settings buttons should sit beside each other."
  );
  assert(
    mobileHeaderMetrics.centerOffset <= 4 &&
      mobileHeaderMetrics.controlsRightGap <= 22 &&
      mobileHeaderMetrics.scrollOverflow <= 1,
    "Mobile header controls should stay right-aligned without page overflow."
  );
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
