#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyHistoricalRegulationResult,
  buildHistoricalProjection,
  normalizeHistoricalForecastModel
} from "./historical-forecast-model.mjs";
import { getRequestedWorldCupYear } from "../chatbot-knowledge.js";

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
const uiSmokeLiveLifecycle = {
  ...JSON.parse(
    await readFile(path.join(root, "scripts", "fixtures", "edition-lifecycle-live.json"), "utf8")
  ),
  tournamentStartsAt: "2000-01-01T00:00:00.000Z",
  liveSyncEndsAt: "2100-01-01T00:00:00.000Z"
};
const uiSmokeLiveLifecycleContents = JSON.stringify(uiSmokeLiveLifecycle);
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

assert(
  getRequestedWorldCupYear("who won the last world cup this year", 2026, 2022, true, 2026) === 2022 &&
    getRequestedWorldCupYear("who won the last world cup", 2026, 2022, true, 2027) === 2026 &&
    getRequestedWorldCupYear("who won the 2026 world cup", 2026, 2022, true, 2026) === 2026,
  "Ball Boy should treat 2026 as this World Cup through 2026, then treat it as the last World Cup from 2027 onward."
);

function githubAnnotationValue(value) {
  return String(value || "")
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
}

function reportGithubActionsError(title, error) {
  if (!process.env.GITHUB_ACTIONS) {
    return;
  }

  const details = error?.stack || error?.message || error;
  console.error(`::error title=${githubAnnotationValue(title)}::${githubAnnotationValue(details)}`);
}

async function getLineupRowSpacingMetrics(lineupRootLocator) {
  return lineupRootLocator.evaluate((root) => {
    const markerPartSelector = [
      ".lineup-avatar-event-lane",
      ".lineup-avatar-wrap",
      ".lineup-player-number",
      ".lineup-player-name",
      ".lineup-player-value",
      ".lineup-player-event-row"
    ].join(", ");
    const round = (value) => Math.round(value * 10) / 10;
    const visiblePanels = root.matches(".lineup-tab-panel")
      ? [root]
      : [...root.querySelectorAll(".lineup-tab-panel:not([hidden])")];
    const panels = visiblePanels.length ? visiblePanels : [root];
    const readBounds = (element) => {
      const styles = getComputedStyle(element);
      if (styles.display === "none" || styles.visibility === "hidden") {
        return null;
      }

      const bounds = element.getBoundingClientRect();
      if (!bounds.width && !bounds.height) {
        return null;
      }

      return {
        bottom: bounds.bottom,
        top: bounds.top
      };
    };
    const readMarker = (marker) => {
      const y = Number.parseFloat(marker.style.getPropertyValue("--y"));
      const parts = [...marker.querySelectorAll(markerPartSelector)].map(readBounds).filter(Boolean);
      if (!parts.length || !Number.isFinite(y)) {
        return null;
      }

      return {
        bottom: Math.max(...parts.map((part) => part.bottom)),
        name: marker.dataset.lineupPlayerName || marker.dataset.lineupStarterName || "",
        top: Math.min(...parts.map((part) => part.top)),
        y
      };
    };
    const collectPanelRows = (panel, panelIndex) => {
      const rows = [];
      const markers = [...panel.querySelectorAll(".lineup-player-marker")]
        .map(readMarker)
        .filter(Boolean)
        .sort((a, b) => a.y - b.y);

      markers.forEach((marker) => {
        const row = rows[rows.length - 1];
        if (row && Math.abs(row.y - marker.y) <= 1) {
          row.bottom = Math.max(row.bottom, marker.bottom);
          row.names.push(marker.name);
          row.top = Math.min(row.top, marker.top);
          return;
        }

        rows.push({
          bottom: marker.bottom,
          names: [marker.name],
          top: marker.top,
          y: marker.y
        });
      });

      const rowGaps = rows.slice(1).map((row, index) => {
        const previous = rows[index];
        return {
          fromNames: previous.names,
          fromY: previous.y,
          gap: row.top - previous.bottom,
          toNames: row.names,
          toY: row.y
        };
      });

      return {
        minRowGap: rowGaps.length ? Math.min(...rowGaps.map((gap) => gap.gap)) : null,
        panelIndex,
        rowCount: rows.length,
        rowGaps: rowGaps.map((gap) => ({
          ...gap,
          gap: round(gap.gap)
        })),
        rows: rows.map((row) => ({
          ...row,
          bottom: round(row.bottom),
          top: round(row.top)
        }))
      };
    };
    const panelMetrics = panels.map(collectPanelRows);
    const rowGaps = panelMetrics.flatMap((panel) => panel.rowGaps.map((gap) => gap.gap));
    const pitchBounds = root.querySelector(".lineup-pitch")?.getBoundingClientRect();
    const contentRows = panelMetrics.flatMap((panel) => panel.rows);

    return {
      bottomClearance: pitchBounds && contentRows.length
        ? round(pitchBounds.bottom - Math.max(...contentRows.map((row) => row.bottom)))
        : null,
      collisionCount: rowGaps.filter((gap) => gap < 0).length,
      minRowGap: rowGaps.length ? Math.min(...rowGaps) : null,
      panels: panelMetrics,
      pitchHeight: round(pitchBounds?.height || 0),
      topClearance: pitchBounds && contentRows.length
        ? round(Math.min(...contentRows.map((row) => row.top)) - pitchBounds.top)
        : null
    };
  });
}

async function assertPlayerCardTriggersStayInternal(rootLocator, message) {
  const triggers = await rootLocator.locator(".player-link[data-player-card-trigger]").evaluateAll((items) =>
    items.map((trigger) => ({
      href: trigger.getAttribute("href") || "",
      role: trigger.getAttribute("role") || "",
      tabIndex: trigger.getAttribute("tabindex") || "",
      tagName: trigger.tagName,
      target: trigger.getAttribute("target") || "",
      text: trigger.textContent.replace(/\s+/g, " ").trim()
    }))
  );
  const navigationLeaks = triggers.filter((trigger) =>
    trigger.tagName !== "SPAN" ||
      trigger.href ||
      trigger.target ||
      trigger.role !== "button" ||
      trigger.tabIndex !== "0"
  );

  assert(
    triggers.length > 0 && navigationLeaks.length === 0,
    `${message} Measured ${JSON.stringify({ count: triggers.length, navigationLeaks })}.`
  );
}

async function waitForHistoricalStandingsYear(pageInstance, year, mode) {
  await pageInstance.waitForFunction(
    ({ expectedMode, expectedYear }) => {
      const params = new URL(window.location.href).searchParams;
      const bodyText = document.body?.innerText || "";
      const heading = document.querySelector("#standings-heading");
      const headingText = heading?.textContent?.replace(/\s+/g, " ").trim() || "";
      const headingLabel = heading?.getAttribute("aria-label") || "";
      const yearIsApplied =
        params.get("standingsYear") === String(expectedYear) &&
        (headingText === String(expectedYear) ||
          headingLabel === String(expectedYear) ||
          bodyText.includes(`Standings ${expectedYear}`));

      if (!yearIsApplied) {
        return false;
      }

      if (expectedMode === "groups") {
        return document.querySelectorAll(".standings-card").length > 0;
      }

      if (expectedMode === "tournament") {
        return Boolean(document.querySelector(".historical-tournament-view"));
      }

      return true;
    },
    { expectedMode: mode, expectedYear: String(year) },
    { timeout: 30000 }
  );
}

function stripFlagEmoji(text) {
  return String(text || "").replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "");
}

function normalizeFlaggedText(text) {
  return stripFlagEmoji(text).replace(/\s+/g, " ").trim();
}

function getCssColorAlpha(colorText) {
  const match = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*([\d.]+))?\s*\)/.exec(colorText || "");
  return match ? Number(match[1] ?? 1) : 0;
}

async function getMatchRowMetaCollisionMetrics(pageInstance, rowSelector = ".match-row") {
  return pageInstance.locator(rowSelector).evaluateAll((rows) =>
    rows
      .map((row) => {
        const chips = Array.from(
          row.querySelectorAll(".match-row-meta .live-pill, .match-row-meta .up-next-pill, .match-row-meta .match-score, .match-row-meta .score-status")
        );

        if (!chips.length) {
          return null;
        }

        const textPieces = Array.from(
          row.querySelectorAll(".match-teams .flag, .match-teams .team-name, .match-teams .versus")
        );
        const toRect = (element) => {
          const rect = element.getBoundingClientRect();

          return {
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            text: element.textContent.replace(/\s+/g, " ").trim(),
            top: rect.top
          };
        };
        const chipRects = chips.map(toRect);
        const textRects = textPieces.map(toRect);
        const collisions = [];
        let minHorizontalGap = Number.POSITIVE_INFINITY;

        chipRects.forEach((chipRect) => {
          textRects.forEach((textRect) => {
            const verticalOverlap =
              Math.min(chipRect.bottom, textRect.bottom) - Math.max(chipRect.top, textRect.top);

            if (verticalOverlap <= 0.5) {
              return;
            }

            const horizontalGap =
              textRect.right <= chipRect.left
                ? chipRect.left - textRect.right
                : chipRect.right <= textRect.left
                  ? textRect.left - chipRect.right
                  : -Math.min(textRect.right, chipRect.right) + Math.max(textRect.left, chipRect.left);

            minHorizontalGap = Math.min(minHorizontalGap, horizontalGap);

            if (horizontalGap < -0.5) {
              collisions.push(`${textRect.text} / ${chipRect.text}`);
            }
          });
        });

        return {
          chipTexts: chipRects.map((rect) => rect.text),
          collisions,
          documentScrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          minHorizontalGap: Number.isFinite(minHorizontalGap) ? minHorizontalGap : null,
          rowScrollOverflow: row.scrollWidth - row.clientWidth,
          text: row.innerText.replace(/\s+/g, " ").trim()
        };
      })
      .filter(Boolean)
  );
}

function assertCleanMatchMetaLayout(metrics, message) {
  assert(
    metrics.length > 0 &&
      metrics.every(
        (metric) =>
          metric.collisions.length === 0 &&
          metric.rowScrollOverflow <= 1 &&
          (metric.minHorizontalGap === null || metric.minHorizontalGap >= 2)
      ),
    `${message} Measured ${JSON.stringify(metrics)}.`
  );
}

async function getMobileMatchupGridMetrics(pageInstance, fixtureId) {
  const rowLocator = pageInstance.locator(`[data-match-id="${fixtureId}"]:visible`).first();
  await rowLocator.waitFor({ state: "visible" });
  return rowLocator.evaluate((row) => {
    const rect = (selector) => {
      const element = row.querySelector(selector);
      const bounds = element?.getBoundingClientRect();

      return bounds
        ? {
            bottom: Math.round(bounds.bottom),
            center: Math.round(bounds.top + bounds.height / 2),
            height: Math.round(bounds.height),
            left: Math.round(bounds.left),
            right: Math.round(bounds.right),
            text: element.textContent.replace(/\s+/g, " ").trim(),
            top: Math.round(bounds.top),
            width: Math.round(bounds.width)
          }
        : null;
    };

    const meta = row.querySelector(".match-row-meta");
    const matchupRights = Array.from(
      row.querySelectorAll(".match-teams .flag, .match-teams .team-name, .match-teams .match-versus")
    ).map((element) => element.getBoundingClientRect().right);
    const matchupRight = Math.max(...matchupRights);

    return {
      away: rect(".match-team-away"),
      awayFlag: rect(".match-team-away .flag"),
      awayName: rect(".match-team-away .team-name"),
      rankCount: row.querySelectorAll(".match-teams .rank-pill").length,
      hasWrappedClass: row.classList.contains("has-wrapped-matchup"),
      home: rect(".match-team-home"),
      homeName: rect(".match-team-home .team-name"),
      meta: rect(".match-row-meta"),
      metaGapFromMatchup:
        meta && Number.isFinite(matchupRight)
          ? Math.round(meta.getBoundingClientRect().left - matchupRight)
          : null,
      rowScrollOverflow: row.scrollWidth - row.clientWidth,
      text: row.innerText.replace(/\s+/g, " ").trim(),
      versus: rect(".match-versus")
    };
  });
}

function assertCompactMobileMatchupGrid(metrics, message) {
  assert(
    metrics.hasWrappedClass &&
      metrics.home &&
      metrics.homeName &&
      metrics.away &&
      metrics.awayFlag &&
      metrics.awayName &&
      metrics.versus &&
      metrics.home.center < metrics.versus.center &&
      Math.abs(metrics.versus.center - metrics.awayFlag.center) <= 2 &&
      metrics.versus.right <= metrics.awayFlag.left + 1 &&
      metrics.homeName.right <= metrics.home.right + 1 &&
      metrics.awayName.right <= metrics.away.right + 1 &&
      metrics.rowScrollOverflow <= 1,
    `${message} Measured ${JSON.stringify(metrics)}.`
  );
}

function assertCompactOrComfortableMobileMatchup(metrics, message) {
  const hasCompactShape =
    metrics.hasWrappedClass &&
    metrics.home &&
    metrics.awayFlag &&
    metrics.versus &&
    metrics.home.center < metrics.versus.center &&
    Math.abs(metrics.versus.center - metrics.awayFlag.center) <= 2 &&
    metrics.versus.right <= metrics.awayFlag.left + 1;

  const hasComfortableInlineShape =
    !metrics.hasWrappedClass &&
    metrics.metaGapFromMatchup !== null &&
    metrics.metaGapFromMatchup >= 12 &&
    metrics.versus &&
    metrics.home &&
    metrics.away &&
    Math.abs(metrics.home.center - metrics.versus.center) <= 2 &&
    Math.abs(metrics.versus.center - metrics.away.center) <= 2;

  assert(
    (hasCompactShape || hasComfortableInlineShape) &&
      metrics.homeName &&
      metrics.awayName &&
      metrics.homeName.right <= metrics.home.right + 1 &&
      metrics.awayName.right <= metrics.away.right + 1 &&
      metrics.rowScrollOverflow <= 1,
    `${message} Measured ${JSON.stringify(metrics)}.`
  );
}

async function getMatchRowEdgeMetrics(pageInstance, rowSelector = ".match-row") {
  const rows = pageInstance.locator(rowSelector);
  const rowCount = await rows.count();
  const metrics = [];

  for (let index = 0; index < rowCount; index += 1) {
    const row = rows.nth(index);
    metrics.push(
      await row.evaluate((rowElement) => {
        const chips = Array.from(
          rowElement.querySelectorAll(
            ".match-row-meta .live-pill, .match-row-meta .up-next-pill, .match-row-meta .match-score, .match-row-meta .score-status"
          )
        );

        if (!chips.length) {
          return null;
        }

        const rowRect = rowElement.getBoundingClientRect();
        const layoutRect = rowElement.closest(".match-layout")?.getBoundingClientRect();
        const chipRects = chips.map((chip) => {
          const rect = chip.getBoundingClientRect();

          return {
            right: rect.right,
            text: chip.textContent.replace(/\s+/g, " ").trim()
          };
        });
        const rightmostChip = chipRects.reduce((rightmost, chip) =>
          !rightmost || chip.right > rightmost.right ? chip : rightmost
        );

        return {
          chipTexts: chipRects.map((chip) => chip.text),
          layoutRightGap: layoutRect ? layoutRect.right - rightmostChip.right : 0,
          rightmostChipText: rightmostChip.text,
          rowRightGap: rowRect.right - rightmostChip.right,
          rowScrollOverflow: rowElement.scrollWidth - rowElement.clientWidth,
          scoreRightOverflow: layoutRect ? Math.max(0, rightmostChip.right - layoutRect.right) : 0,
          text: rowElement.innerText.replace(/\s+/g, " ").trim(),
          transform: getComputedStyle(rowElement).transform
        };
      })
    );
  }

  return metrics.filter(Boolean);
}

function assertCleanHoveredMatchRowEdges(metrics, message, options = {}) {
  const { expectNoTransform = false, minLayoutRightGap = -1 } = options;

  assert(
    metrics.length > 0 &&
      metrics.every(
        (metric) =>
          (!expectNoTransform || metric.transform === "none") &&
          metric.rowScrollOverflow <= 1 &&
          metric.scoreRightOverflow <= 1 &&
          metric.layoutRightGap >= minLayoutRightGap
      ),
    `${message} Measured ${JSON.stringify(metrics)}.`
  );
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
  const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
  if (requestUrl.pathname === "/data/edition-lifecycle.json") {
    response.writeHead(200, {
      "Content-Length": Buffer.byteLength(uiSmokeLiveLifecycleContents),
      "Content-Type": "application/json; charset=utf-8"
    });
    response.end(uiSmokeLiveLifecycleContents);
    return;
  }

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
const [chatbotSource, chatbotCssSource, appSource] = await Promise.all([
  readFile(path.join(root, "chatbot.js"), "utf8"),
  readFile(path.join(root, "chatbot.css"), "utf8"),
  readFile(path.join(root, "app.js"), "utf8")
]);
assert(
  appSource.includes("const PLAYER_CARD_HOVER_HANDOFF_MS = 220;") &&
    /function queueFloatingPlayerCardHide\(\)[\s\S]*?window\.setTimeout\([\s\S]*?PLAYER_CARD_HOVER_HANDOFF_MS\);/.test(
      appSource
    ),
  "Floating player cards should preserve the 220ms pointer handoff grace period."
);
assert(
  chatbotSource.includes("const SCOUT_IDLE_BLINK_MIN_MS = 9000;") &&
    chatbotSource.includes("const SCOUT_IDLE_BLINK_RANGE_MS = 6000;") &&
    chatbotSource.includes("const SCOUT_BLINK_COOLDOWN_MS = 5000;") &&
    !chatbotSource.includes("is-eye-touch-release") &&
    !chatbotCssSource.includes("scout-eye-touch-release"),
  "Ball Boy should use the calmer idle cadence and shared blink cooldown without a touch-release blink animation."
);
assert(
  chatbotSource.includes('className: "is-eye-puzzled", duration: 900') &&
    chatbotSource.includes('className: "is-eye-puzzled", duration: 760') &&
    chatbotSource.includes('className: "is-eye-downcast", duration: 760') &&
    chatbotSource.includes('className: "is-eye-amused", duration: 720') &&
    chatbotSource.includes('className: "is-eye-pleased", duration: 760, pupil: { x: 0, y: -0.35 }') &&
    chatbotSource.includes('widget.classList.add("is-eye-juggle-tap")') &&
    chatbotCssSource.includes(".scout-widget.is-eye-downcast .scout-eye") &&
    chatbotCssSource.includes(".scout-widget.is-eye-puzzled .scout-eye:first-child") &&
    chatbotCssSource.includes(".scout-widget.is-eye-pleased .scout-eyes::before") &&
    chatbotCssSource.includes(".scout-widget.is-eye-pleased .scout-pupil") &&
    chatbotCssSource.includes("border-top: 3px solid #0a0a0a;") &&
    chatbotCssSource.includes(".scout-widget.is-eye-amused .scout-eyes::before") &&
    chatbotCssSource.includes(".scout-widget.is-eye-amused .scout-pupil") &&
    chatbotCssSource.includes("transform: scale(1.12);") &&
    chatbotCssSource.includes("animation: scout-eye-juggle-tap 150ms ease-out;"),
  "Ball Boy should keep downcast and puzzled, use eyebrow-led pleased and larger-eye amused expressions, and preserve tap feedback while juggling."
);
const fixturesData = JSON.parse(await readFile(path.join(root, "data/fixtures.json"), "utf8"));
const [playerAvailabilityData, freeLineupPredictionSourcesData] = await Promise.all(
  ["player-availability.json", "free-lineup-prediction-sources.json"].map(async (fileName) =>
    JSON.parse(await readFile(path.join(root, "data", fileName), "utf8"))
  )
);
const englandAvailability = playerAvailabilityData.teams?.ENG;
const englandSemiFinalUnavailable = (englandAvailability?.fixtureUnavailable || [])
  .filter((entry) => entry.fixtureId === "match-102-semi-final-2026-07-15")
  .map((entry) => entry.name)
  .sort();
assert(
  englandAvailability?.included?.includes("Nico O'Reilly") &&
    englandAvailability?.included?.includes("Nico Oreilly") &&
    JSON.stringify(englandSemiFinalUnavailable) === JSON.stringify(["Jarell Quansah", "Jordan Henderson"]),
  `England lineup availability should canonicalize Nico O'Reilly and exclude Quansah and Jordan Henderson from the semifinal. Measured ${JSON.stringify({ englandSemiFinalUnavailable, includedAliases: englandAvailability?.included?.filter((name) => /o.?reilly/i.test(name)) })}.`
);
const franceSpainPredictionSources = freeLineupPredictionSourcesData.fixtures
  ?.find((fixture) => fixture.fixtureId === "match-101-semi-final-2026-07-14")
  ?.sources || [];
const franceAttackRoles = franceSpainPredictionSources
  .filter((source) => source.teams?.home)
  .map((source) => ({
  dembele: source.teams?.home?.starters?.find((player) => player.name === "Ousmane Dembele")?.position,
  olise: source.teams?.home?.starters?.find((player) => player.name === "Michael Olise")?.position,
  sourceId: source.sourceId
  }));
assert(
  franceAttackRoles.length >= 2 &&
    franceAttackRoles.every((entry) => entry.dembele === "RW" && entry.olise === "AM"),
  `Every current France-Spain prediction source should preserve Dembele at RW and Olise at AM. Measured ${JSON.stringify(franceAttackRoles)}.`
);
const publishedSpainSource = franceSpainPredictionSources.find(
  (source) => source.sourceId === "elpais-france-spain-published-spain-xi-2026-07-14"
);
assert(
  publishedSpainSource?.teams?.away?.starters?.some((player) => player.name === "Fabian Ruiz") &&
    !publishedSpainSource?.teams?.away?.starters?.some((player) => player.name === "Pedri"),
  "The published Spain XI source should preserve Fabian Ruiz over Pedri."
);
const sourceNoteData = await Promise.all(
  [
    "fixtures.json",
    "history.json",
    "historical-rankings.json",
    "lineups.json",
    "historical-player-profiles.json",
    "player-profiles.json",
    "release-notes.json",
    "teams.json",
    "standings.json",
    "tournament.json"
  ].map(async (fileName) => JSON.parse(await readFile(path.join(root, "data", fileName), "utf8")))
);
const [
  ,
  historyData,
  ,
  lineupsData,
  ,
  playerProfilesData,
  releaseNotesData,
  teamsData,
  standingsData,
  tournamentData
] = sourceNoteData;
const haalandProfileBirthDate = playerProfilesData.profiles?.["Erling Haaland"]?.birthDate;
assert(
  haalandProfileBirthDate === "2000-07-21",
  `Erling Haaland's sourced birth date should remain 2000-07-21. Measured ${haalandProfileBirthDate}.`
);

function normalizeResultMentionName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeResultMentionPattern(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getResultMentionPlayerName(player) {
  if (Array.isArray(player)) {
    return String(player[2] || player[1] || "").trim();
  }
  return String(player?.name || player?.fullName || player?.displayName || player?.label || "").trim();
}

const currentPlayerProfilesByName = new Map(
  Object.values(playerProfilesData.profiles || {}).flatMap((profile) =>
    [profile?.name, profile?.displayName]
      .filter(Boolean)
      .map((name) => [normalizeResultMentionName(name), profile])
  )
);

function getCurrentResultLinkCoverageCases() {
  const cases = [];

  for (const fixture of fixturesData.fixtures || []) {
    const bullets = Array.isArray(fixture.resultStoryBullets)
      ? fixture.resultStoryBullets.filter((bullet) => typeof bullet === "string" && bullet.trim())
      : [];
    if (fixture.status !== "FT" || !bullets.length) {
      continue;
    }

    const storyText = bullets.join(" ");
    const lineup = lineupsData.lineups?.[fixture.id];
    const keyPlayers = [...(fixture.keyPlayers?.home || []), ...(fixture.keyPlayers?.away || [])];
    const goals = [...(fixture.goalsHome || []), ...(fixture.goalsAway || [])];
    const scorers = goals.map((goal) => ({ name: goal?.name })).filter((player) => player.name);
    const assists = goals.map((goal) => ({ name: goal?.assistName })).filter((player) => player.name);
    const lineupPlayers = [lineup?.home, lineup?.away].flatMap((teamLineup) => [
      ...(teamLineup?.players || []),
      ...(teamLineup?.starters || []),
      ...(teamLineup?.bench || [])
    ]);
    const playersByName = new Map();

    for (const player of [...keyPlayers, ...scorers, ...assists, ...lineupPlayers]) {
      const name = getResultMentionPlayerName(player);
      const key = normalizeResultMentionName(name);
      if (!key || playersByName.has(key)) {
        continue;
      }
      const profile = currentPlayerProfilesByName.get(key);
      playersByName.set(key, {
        name,
        displayName: String(profile?.displayName || profile?.name || name).trim()
      });
    }

    const players = [...playersByName.values()];
    const partCounts = new Map();
    for (const player of players) {
      const parts = player.name.split(/\s+/).filter(Boolean);
      for (const part of new Set([parts[0], parts.at(-1)].filter(Boolean).map(normalizeResultMentionName))) {
        partCounts.set(part, (partCounts.get(part) || 0) + 1);
      }
    }

    const baselinePlayerKeys = new Set([
      ...keyPlayers.map(getResultMentionPlayerName),
      ...scorers.map(getResultMentionPlayerName),
      ...players
        .filter((player) => [player.name, player.displayName].some((name) => name.includes(" ") && storyText.includes(name)))
        .map((player) => player.name)
    ].map(normalizeResultMentionName).filter(Boolean));
    const expectedLabels = new Set();

    for (const player of players) {
      if (baselinePlayerKeys.has(normalizeResultMentionName(player.name))) {
        continue;
      }

      const aliases = [...new Set([player.name, player.displayName].flatMap((name) => {
        const parts = name.split(/\s+/).filter(Boolean);
        return [name, parts[0], parts.at(-1)];
      }))]
        .filter((alias) => alias && alias.length >= 3)
        .filter((alias) => /\s/.test(alias) || partCounts.get(normalizeResultMentionName(alias)) === 1)
        .sort((left, right) => right.length - left.length);

      for (const alias of aliases) {
        const mentionPattern = new RegExp(
          `(^|[^A-Za-z])(${escapeResultMentionPattern(alias)})('s)?(?=$|[^A-Za-z])`,
          "g"
        );
        for (const match of storyText.matchAll(mentionPattern)) {
          expectedLabels.add(`${match[2]}${match[3] || ""}`);
        }
      }
    }

    if (expectedLabels.size) {
      cases.push({
        dayKey: String(fixture.kickoffUtc || "").slice(0, 10),
        expectedLabels: [...expectedLabels],
        fixtureId: fixture.id
      });
    }
  }

  return cases;
}

const currentResultPlayerLinkCoverageCases = getCurrentResultLinkCoverageCases();
assert(
  currentResultPlayerLinkCoverageCases.some(
    (entry) => entry.fixtureId === "match-101-semi-final-2026-07-14" && entry.expectedLabels.includes("Olmo")
  ),
  `The all-current-results audit should include the assist-only Olmo mention. Measured ${JSON.stringify(currentResultPlayerLinkCoverageCases)}.`
);

function getExpectedHistoricalProjection(fixtureId) {
  const fixture = (historyData.fixtures || []).find((candidate) => candidate.id === fixtureId);
  assert(fixture, `Missing historical fixture ${fixtureId}`);
  const model = normalizeHistoricalForecastModel(
    tournamentData?.forecastModels?.historicalWorldCupForm || {}
  );
  const ratings = new Map();
  const previousFixtures = (historyData.fixtures || [])
    .filter((candidate) => String(candidate.sortKey || "") < String(fixture.sortKey || ""))
    .sort((a, b) => String(a.sortKey || "").localeCompare(String(b.sortKey || "")));
  for (const previousFixture of previousFixtures) {
    applyHistoricalRegulationResult(ratings, previousFixture, model);
  }

  return buildHistoricalProjection(
    ratings.get(fixture.homeSlot) ?? model.initialRating,
    ratings.get(fixture.awaySlot) ?? model.initialRating,
    Boolean(fixture.group),
    model
  );
}

const matchLiveWindowMs = 2.25 * 60 * 60 * 1000;
const browser = await chromium.launch({ args: ["--blink-settings=imagesEnabled=false"] });
const page = await browser.newPage();
page.setDefaultTimeout(60_000);
const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
const thirdPlaceStandingIndex = 2;
const expectedThirdPlaceAdvancementEstimateCache = new Map();
const expectedThirdPlaceGroupScenarioCache = new Map();
const expectedGroupThirdPlacePointFloorCache = new Map();
const expectedTeamGroupStageEliminationCache = new Map();
const expectedTeamMaximumGroupPointsCache = new Map();

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

function isFixtureLive(fixture, currentTime = Date.now()) {
  if (fixture.status === "LIVE") {
    return true;
  }

  if (fixture.status !== "SCHEDULED" || !fixture.kickoffUtc) {
    return false;
  }

  const kickoffTime = new Date(fixture.kickoffUtc).getTime();
  return Number.isFinite(kickoffTime) && currentTime >= kickoffTime && currentTime < kickoffTime + matchLiveWindowMs;
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

  return isInside
    ? { kind: "in", label: "Advancing", detail: "Advancing to Round of 32." }
    : { kind: "eliminated", label: "Eliminated", detail: "Eliminated at group stage." };
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

  return annotatedRows.map((row) => {
    const isEliminated = isExpectedTeamEliminatedFromGroupStage(row.teamId, row.groupId);
    const candidate = { ...row, isEliminated };
    const advancementEstimate = getExpectedThirdPlaceAdvancementEstimate(candidate);
    const candidateWithEstimate = { ...candidate, advancementEstimate };

    return {
      ...candidateWithEstimate,
      status: getExpectedThirdPlaceStatus(candidateWithEstimate, advancerCount)
    };
  });
}

function getExpectedThirdPlaceRaceRows() {
  const rows = (tournamentData.groups || [])
    .map((group, groupIndex) => {
      const row = standingsData.groups?.[group.id]?.[thirdPlaceStandingIndex];

      if (!row) {
        return null;
      }

      return {
        ...row,
        gd: row.gf - row.ga,
        gamesLeft: getExpectedRemainingTeamGroupFixtures(row.teamId, group.id).length,
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

function getExpectedThirdPlaceComparisonTarget(candidate, rows = getExpectedThirdPlaceRaceRows()) {
  if (rows.length <= 1) {
    return null;
  }

  const advancerCount = getThirdPlaceAdvancerCount();
  const targetIndex = candidate.position <= advancerCount ? advancerCount : advancerCount - 1;
  return rows[targetIndex] || null;
}

function getExpectedThirdPlaceComparisonDecider(candidate, target) {
  if (candidate.pts !== target.pts) {
    return {
      label: "points",
      candidateValue: formatStandingPoints(candidate.pts),
      targetValue: formatStandingPoints(target.pts)
    };
  }

  if (candidate.gd !== target.gd) {
    return {
      label: "goal difference",
      candidateValue: formatGoalDifference(candidate.gd),
      targetValue: formatGoalDifference(target.gd)
    };
  }

  if (candidate.gf !== target.gf) {
    return {
      label: "goals scored",
      candidateValue: String(candidate.gf),
      targetValue: String(target.gf)
    };
  }

  const candidateConduct = getTeamConductScore(candidate);
  const targetConduct = getTeamConductScore(target);
  if (candidateConduct !== null && targetConduct !== null && candidateConduct !== targetConduct) {
    return {
      label: "loaded fair-play conduct",
      candidateValue: String(candidateConduct),
      targetValue: String(targetConduct)
    };
  }

  const candidateRank = getFifaRankValue(candidate.team);
  const targetRank = getFifaRankValue(target.team);
  if (Number.isFinite(candidateRank) && Number.isFinite(targetRank) && candidateRank !== targetRank) {
    return {
      label: "FIFA ranking fallback",
      candidateValue: `#${candidateRank}`,
      targetValue: `#${targetRank}`
    };
  }

  return {
    label: "deterministic loaded order",
    candidateValue: formatOrdinal(candidate.position),
    targetValue: formatOrdinal(target.position)
  };
}

function formatExpectedThirdPlaceDeciderLabel(label) {
  const labels = {
    "FIFA ranking fallback": "FIFA ranking",
    "deterministic loaded order": "loaded order",
    "loaded fair-play conduct": "fair-play score"
  };
  return labels[label] || label;
}

function formatExpectedThirdPlaceShortComparison(decider) {
  const deciderLabel = formatExpectedThirdPlaceDeciderLabel(decider.label);
  const stripPointLabel = (value) => String(value).replace(/ points?$/, "");
  if (decider.label === "points") {
    return `points ${stripPointLabel(decider.candidateValue)}-${stripPointLabel(decider.targetValue)}`;
  }

  if (decider.label === "goals scored") {
    return `goals ${decider.candidateValue}-${decider.targetValue}`;
  }

  return `${deciderLabel} ${decider.candidateValue} vs ${decider.targetValue}`;
}

function formatExpectedThirdPlaceTooltipChanceLine(candidate) {
  const estimate = candidate.advancementEstimate;

  if (estimate?.displayPercent) {
    return `${estimate.displayPercent} to advance`;
  }

  return candidate.status?.label || "";
}

function getExpectedThirdPlaceTooltipSituationLine(candidate) {
  const estimate = candidate.advancementEstimate;
  const advancerCount = getThirdPlaceAdvancerCount();
  const probability = estimate?.probability;

  if (candidate.status?.kind === "eliminated" || candidate.isEliminated || probability <= 0) {
    return "No modeled route reaches the Round of 32 from here.";
  }

  if (Number.isFinite(probability) && probability >= 1) {
    return `Remaining matches can change ${candidate.team.name}'s Round of 32 opponent, but not whether they qualify.`;
  }

  if (candidate.isCutLineTie) {
    return `Top-8 place is tied from ${formatOrdinal(candidate.tieGroupStart)}-${formatOrdinal(candidate.tieGroupEnd)}; fair-play data is pending.`;
  }

  if (candidate.position <= advancerCount) {
    return Number.isFinite(probability) && probability >= 0.66
      ? "Most paths keep them inside the top 8."
      : "They are inside the top 8, but more groups can still catch them.";
  }

  return Number.isFinite(probability) && probability >= 0.45
    ? "They are just outside the top 8, but one swing can pull them in."
    : "They need help to climb into the top 8.";
}

function formatExpectedThirdPlaceShortPoints(points) {
  return `${points} pt${points === 1 ? "" : "s"}`;
}

function getExpectedFixtureSortValue(fixture) {
  if (fixture.sortKey) {
    return fixture.sortKey;
  }

  return fixture.kickoffUtc || `${fixture.date || ""}T12:00:00Z`;
}

function getExpectedThirdPlaceWatchOutcomeLabel(fixture, result) {
  if (Number(result.homeGoals) === Number(result.awayGoals)) {
    return "A tie";
  }

  const winner = Number(result.homeGoals) > Number(result.awayGoals)
    ? getTeam(fixture.homeTeamId)
    : getTeam(fixture.awayTeamId);
  const article = /^[AEIO]/i.test(winner.name.trim()) ? "An" : "A";

  return `${article} ${winner.name} win`;
}

function getExpectedThirdPlaceSingleResultRow(fixture, result) {
  const group = (tournamentData.groups || []).find((groupItem) => groupItem.id === fixture?.groupId);
  if (!group) {
    return null;
  }

  const projection = createExpectedGroupQualificationProjection(group);
  if (!projection) {
    return null;
  }

  const states = cloneExpectedGroupQualificationStates(projection.baseStates);
  applyExpectedGroupQualificationResult(states, result);

  return getExpectedGroupQualificationScenarioRows(group, states, [
    ...projection.completedResults,
    result
  ])[thirdPlaceStandingIndex] || null;
}

function getExpectedThirdPlaceWatchGroupOrder(candidate, rows) {
  const groupIds = [];
  const addGroupId = (groupId) => {
    if (groupId && !groupIds.includes(groupId)) {
      groupIds.push(groupId);
    }
  };
  const comparisonTarget = getExpectedThirdPlaceComparisonTarget(candidate, rows);

  addGroupId(comparisonTarget?.groupId);
  addGroupId(candidate.groupId);
  fixturesData.fixtures
    .filter((fixture) => fixture.stage === "group" && fixture.status !== "FT")
    .sort((a, b) => getExpectedFixtureSortValue(a).localeCompare(getExpectedFixtureSortValue(b)))
    .forEach((fixture) => addGroupId(fixture.groupId));

  return groupIds;
}

function getExpectedThirdPlaceWatchEffect(candidate, rows = getExpectedThirdPlaceRaceRows()) {
  const estimate = candidate.advancementEstimate;

  if (
    !estimate ||
    !Number.isFinite(estimate.probability) ||
    estimate.probability <= 0 ||
    estimate.probability >= 1 ||
    candidate.isEliminated ||
    candidate.isCutLineTie
  ) {
    return null;
  }

  const advancerCount = getThirdPlaceAdvancerCount();
  const isInside = candidate.position <= advancerCount;

  for (const groupId of getExpectedThirdPlaceWatchGroupOrder(candidate, rows)) {
    const currentThirdPlaceRow = rows.find((row) => row.groupId === groupId);
    const currentGroupIsAbove = currentThirdPlaceRow
      ? compareThirdPlaceCandidates(currentThirdPlaceRow, candidate) < 0
      : false;
    const groupFixtures = getGroupFixtures(groupId)
      .filter((fixture) => fixture.status !== "FT" && fixture.homeTeamId && fixture.awayTeamId)
      .sort((a, b) => getExpectedFixtureSortValue(a).localeCompare(getExpectedFixtureSortValue(b)));
    const effects = [];

    for (const fixture of groupFixtures) {
      getExpectedProjectedGroupQualificationResults(fixture).forEach((result, resultIndex) => {
        const thirdPlaceRow = getExpectedThirdPlaceSingleResultRow(fixture, result);
        if (!thirdPlaceRow) {
          return;
        }

        const resultMovesGroupAbove = compareThirdPlaceCandidates(thirdPlaceRow, candidate) < 0;
        if (!isInside || currentGroupIsAbove || !resultMovesGroupAbove) {
          return;
        }

        const group = (tournamentData.groups || []).find((groupItem) => groupItem.id === groupId);
        const groupLabel = group?.label || `Group ${groupId}`;
        const line =
          candidate.position === advancerCount
            ? `${getExpectedThirdPlaceWatchOutcomeLabel(fixture, result)} would move ${groupLabel}'s third-place team to ${formatExpectedThirdPlaceShortPoints(thirdPlaceRow.pts)}, pushing ${candidate.team.name} out of the current top 8 unless another group falls back.`
            : `${getExpectedThirdPlaceWatchOutcomeLabel(fixture, result)} would move ${groupLabel}'s third-place team to ${formatExpectedThirdPlaceShortPoints(thirdPlaceRow.pts)}, shrinking ${candidate.team.name}'s cushion above the cut line.`;

        effects.push({
          fixture,
          line,
          pointSwing: thirdPlaceRow.pts - candidate.pts,
          resultIndex
        });
      });
    }

    if (effects.length) {
      return effects.sort(
        (a, b) =>
          b.pointSwing - a.pointSwing ||
          getExpectedFixtureSortValue(a.fixture).localeCompare(getExpectedFixtureSortValue(b.fixture)) ||
          a.resultIndex - b.resultIndex
      )[0];
    }
  }

  return null;
}

function getExpectedThirdPlaceWatchLines(candidate, rows = getExpectedThirdPlaceRaceRows()) {
  const effect = getExpectedThirdPlaceWatchEffect(candidate, rows);
  if (!effect) {
    return [];
  }

  return [
    `Watch: ${getTeam(effect.fixture.homeTeamId).name} vs ${getTeam(effect.fixture.awayTeamId).name}`,
    effect.line
  ];
}

function getExpectedThirdPlaceReason(candidate, rows = getExpectedThirdPlaceRaceRows()) {
  const topLines = [
    formatExpectedThirdPlaceTooltipChanceLine(candidate),
    "",
    getExpectedThirdPlaceTooltipSituationLine(candidate)
  ].filter((line, index) => index === 1 || Boolean(line));
  const watchLines = getExpectedThirdPlaceWatchLines(candidate, rows);

  return [...topLines, ...(watchLines.length ? ["", ...watchLines] : [])].join("\n");
}

function getExpectedThirdPlaceRaceStatusReason(candidate) {
  return candidate.status?.detail || "Eliminated at group stage.";
}

function getExpectedThirdPlaceStandingBadgeReason(candidate) {
  return candidate.status?.label === "Advancing"
    ? "Advancing to Round of 32 as a top-eight third-place team."
    : "Not advancing. Eliminated at group stage.";
}

function getAutomaticAdvancersPerGroup() {
  const value = Number(tournamentData.format?.automaticAdvancersPerGroup);
  return Number.isFinite(value) ? value : 2;
}

function getGroupStagePathPlaceCount(rowCount = 0) {
  const possiblePlaces = getAutomaticAdvancersPerGroup() + (getThirdPlaceAdvancerCount() > 0 ? 1 : 0);
  return rowCount > 0 ? Math.min(rowCount, possiblePlaces) : possiblePlaces;
}

function hasUsableScore(fixture) {
  return Number.isFinite(Number(fixture?.score?.home)) && Number.isFinite(Number(fixture?.score?.away));
}

function getGroupFixtures(groupId) {
  return fixturesData.fixtures.filter((fixture) => fixture.stage === "group" && fixture.groupId === groupId);
}

function getExpectedRemainingTeamGroupFixtures(teamId, groupId) {
  return getGroupFixtures(groupId).filter(
    (fixture) =>
      fixture.status !== "FT" &&
      fixture.homeTeamId &&
      fixture.awayTeamId &&
      (fixture.homeTeamId === teamId || fixture.awayTeamId === teamId)
  );
}

function isGroupStageFinished() {
  const groupFixtures = fixturesData.fixtures.filter((fixture) => fixture.stage === "group");
  return groupFixtures.length > 0 && groupFixtures.every((fixture) => fixture.status === "FT");
}

function isExpectedGroupFinished(groupId) {
  const groupFixtures = getGroupFixtures(groupId);
  return groupFixtures.length > 0 && groupFixtures.every((fixture) => fixture.status === "FT");
}

function createExpectedGroupQualificationStates(group) {
  const sourceRowsByTeamId = new Map((standingsData.groups?.[group.id] || []).map((row) => [row.teamId, row]));
  return new Map(
    (group.teamIds || []).map((teamId, index) => [
      teamId,
      {
        conductScore: getTeamConductScore(sourceRowsByTeamId.get(teamId)),
        ga: 0,
        gd: 0,
        gf: 0,
        played: 0,
        pts: 0,
        seededOrder: index,
        teamId
      }
    ])
  );
}

function cloneExpectedGroupQualificationStates(states) {
  return new Map([...states.entries()].map(([teamId, state]) => [teamId, { ...state }]));
}

function applyExpectedGroupQualificationResult(states, result) {
  const home = states.get(result.homeTeamId);
  const away = states.get(result.awayTeamId);

  if (!home || !away) {
    return;
  }

  const homeGoals = Number(result.homeGoals);
  const awayGoals = Number(result.awayGoals);
  home.played += 1;
  away.played += 1;
  home.gf += homeGoals;
  home.ga += awayGoals;
  home.gd += homeGoals - awayGoals;
  away.gf += awayGoals;
  away.ga += homeGoals;
  away.gd += awayGoals - homeGoals;

  if (homeGoals > awayGoals) {
    home.pts += 3;
  } else if (awayGoals > homeGoals) {
    away.pts += 3;
  } else {
    home.pts += 1;
    away.pts += 1;
  }
}

function getExpectedCompletedGroupQualificationResults(groupFixtures) {
  return groupFixtures
    .filter((fixture) => fixture.status === "FT" && hasUsableScore(fixture))
    .map((fixture) => ({
      awayGoals: Number(fixture.score.away),
      awayTeamId: fixture.awayTeamId,
      fixed: true,
      homeGoals: Number(fixture.score.home),
      homeTeamId: fixture.homeTeamId
    }));
}

function getExpectedProjectedGroupQualificationResults(fixture) {
  return [
    {
      awayGoals: 0,
      awayTeamId: fixture.awayTeamId,
      fixed: false,
      homeGoals: 1,
      homeTeamId: fixture.homeTeamId
    },
    {
      awayGoals: 0,
      awayTeamId: fixture.awayTeamId,
      fixed: false,
      homeGoals: 0,
      homeTeamId: fixture.homeTeamId
    },
    {
      awayGoals: 1,
      awayTeamId: fixture.awayTeamId,
      fixed: false,
      homeGoals: 0,
      homeTeamId: fixture.homeTeamId
    }
  ];
}

function createExpectedGroupQualificationProjection(group) {
  const groupFixtures = getGroupFixtures(group?.id);
  const completedGroupFixtures = groupFixtures.filter((fixture) => fixture.status === "FT");

  if (completedGroupFixtures.some((fixture) => !hasUsableScore(fixture))) {
    return null;
  }

  const baseStates = createExpectedGroupQualificationStates(group);
  const completedResults = getExpectedCompletedGroupQualificationResults(groupFixtures);
  completedResults.forEach((result) => applyExpectedGroupQualificationResult(baseStates, result));

  return {
    baseStates,
    completedResults,
    remainingFixtures: groupFixtures.filter(
      (fixture) => fixture.status !== "FT" && fixture.homeTeamId && fixture.awayTeamId
    )
  };
}

function compareExpectedGroupQualificationScenarioRows(a, b, scenarioRows, states, results) {
  if (a.pts !== b.pts) {
    return b.pts - a.pts;
  }

  const tiedTeamIds = scenarioRows
    .filter((row) => row.pts === a.pts)
    .map((row) => row.teamId);

  if (isExpectedTeamDefinitelyAboveInTie(a.teamId, b.teamId, tiedTeamIds, states, results)) {
    return -1;
  }

  if (isExpectedTeamDefinitelyAboveInTie(b.teamId, a.teamId, tiedTeamIds, states, results)) {
    return 1;
  }

  const conductA = getTeamConductScore(a);
  const conductB = getTeamConductScore(b);

  return (
    b.gd - a.gd ||
    b.gf - a.gf ||
    (conductA !== null && conductB !== null ? conductB - conductA : 0) ||
    getFifaRankValue(getTeam(a.teamId)) - getFifaRankValue(getTeam(b.teamId)) ||
    a.seededOrder - b.seededOrder ||
    getTeam(a.teamId).name.localeCompare(getTeam(b.teamId).name)
  );
}

function getExpectedGroupQualificationScenarioRows(group, states, results) {
  const groupIndex = (tournamentData.groups || []).findIndex((groupItem) => groupItem.id === group?.id);
  const scenarioRows = [...states.values()];

  return [...scenarioRows]
    .sort((a, b) => compareExpectedGroupQualificationScenarioRows(a, b, scenarioRows, states, results))
    .map((row, index) => ({
      ...row,
      conductScore: getTeamConductScore(row),
      groupId: group.id,
      groupIndex,
      groupLabel: group.label || `Group ${group.id}`,
      position: index + 1,
      team: getTeam(row.teamId)
    }));
}

function getExpectedFallbackGroupQualificationScenarios(group) {
  const groupIndex = (tournamentData.groups || []).findIndex((groupItem) => groupItem.id === group?.id);
  const rows = (standingsData.groups?.[group.id] || []).map((row, index) => ({
    ...row,
    conductScore: getTeamConductScore(row),
    gd: row.gf - row.ga,
    groupId: group.id,
    groupIndex,
    groupLabel: group.label || `Group ${group.id}`,
    position: index + 1,
    pts: row.wins * 3 + row.draws,
    team: getTeam(row.teamId)
  }));

  return [
    {
      isFallback: true,
      results: [],
      rows
    }
  ];
}

function getExpectedGroupQualificationScenarios(group) {
  const cacheKey = String(group?.id || "");
  if (expectedThirdPlaceGroupScenarioCache.has(cacheKey)) {
    return expectedThirdPlaceGroupScenarioCache.get(cacheKey);
  }

  const projection = createExpectedGroupQualificationProjection(group);
  if (!projection) {
    const fallbackScenarios = getExpectedFallbackGroupQualificationScenarios(group);
    expectedThirdPlaceGroupScenarioCache.set(cacheKey, fallbackScenarios);
    return fallbackScenarios;
  }

  const scenarios = [];

  function visit(fixtureIndex, states, results) {
    if (fixtureIndex >= projection.remainingFixtures.length) {
      scenarios.push({
        isFallback: false,
        results,
        rows: getExpectedGroupQualificationScenarioRows(group, states, results)
      });
      return;
    }

    const fixture = projection.remainingFixtures[fixtureIndex];
    getExpectedProjectedGroupQualificationResults(fixture).forEach((result) => {
      const nextStates = cloneExpectedGroupQualificationStates(states);
      applyExpectedGroupQualificationResult(nextStates, result);
      visit(fixtureIndex + 1, nextStates, [...results, result]);
    });
  }

  visit(0, projection.baseStates, projection.completedResults);

  const scenarioRows = scenarios.length ? scenarios : getExpectedFallbackGroupQualificationScenarios(group);
  expectedThirdPlaceGroupScenarioCache.set(cacheKey, scenarioRows);
  return scenarioRows;
}

function formatExpectedThirdPlaceAdvancementPercent(probability) {
  if (!Number.isFinite(probability)) {
    return "";
  }

  const percent = probability * 100;
  if (probability > 0 && percent < 1) {
    return "<1%";
  }

  if (probability < 1 && percent > 99) {
    return "99%";
  }

  return `${Math.round(percent)}%`;
}

function getExpectedThirdPlaceScenarioAdvancementProbability(targetThirdPlaceRow, targetGroupId) {
  const advancerCount = getThirdPlaceAdvancerCount();
  let distribution = [1];
  let totalCombinations = 1;

  for (const group of tournamentData.groups || []) {
    if (group.id === targetGroupId) {
      continue;
    }

    const scenarios = getExpectedGroupQualificationScenarios(group);
    const scenarioCount = scenarios.length || 1;
    const aboveCount = scenarios.filter((scenario) => {
      const thirdPlaceRow = scenario.rows[thirdPlaceStandingIndex];
      return thirdPlaceRow && compareThirdPlaceCandidates(thirdPlaceRow, targetThirdPlaceRow) < 0;
    }).length;
    const notAboveCount = scenarioCount - aboveCount;
    const nextDistribution = Array.from({ length: distribution.length + 1 }, () => 0);

    distribution.forEach((count, index) => {
      nextDistribution[index] += count * notAboveCount;
      nextDistribution[index + 1] += count * aboveCount;
    });

    distribution = nextDistribution;
    totalCombinations *= scenarioCount;
  }

  if (!totalCombinations) {
    return 0;
  }

  const advancingCombinations = distribution.reduce(
    (total, count, aboveCount) => (aboveCount < advancerCount ? total + count : total),
    0
  );

  return advancingCombinations / totalCombinations;
}

function getExpectedThirdPlaceAdvancementEstimate(candidate) {
  const cacheKey = `${candidate.groupId || ""}:${candidate.teamId || ""}:${candidate.pts}:${candidate.gd}:${candidate.gf}:${candidate.isEliminated ? "out" : "live"}`;
  if (expectedThirdPlaceAdvancementEstimateCache.has(cacheKey)) {
    return expectedThirdPlaceAdvancementEstimateCache.get(cacheKey);
  }

  const group = (tournamentData.groups || []).find((groupItem) => groupItem.id === candidate.groupId);
  const targetScenarios = getExpectedGroupQualificationScenarios(group);
  let automaticScenarioCount = 0;
  let thirdPlaceScenarioCount = 0;
  let outScenarioCount = 0;
  let chanceTotal = 0;

  targetScenarios.forEach((scenario) => {
    const targetRow = scenario.rows.find((row) => row.teamId === candidate.teamId);
    const automaticPlaces = Math.min(scenario.rows.length, getAutomaticAdvancersPerGroup());

    if (!targetRow) {
      outScenarioCount += 1;
      return;
    }

    if (targetRow.position <= automaticPlaces) {
      automaticScenarioCount += 1;
      chanceTotal += 1;
      return;
    }

    if (targetRow.position === thirdPlaceStandingIndex + 1) {
      thirdPlaceScenarioCount += 1;
      chanceTotal += getExpectedThirdPlaceScenarioAdvancementProbability(targetRow, candidate.groupId);
      return;
    }

    outScenarioCount += 1;
  });

  const modeledScenarioCount = targetScenarios.length;
  const rawProbability = modeledScenarioCount > 0 ? chanceTotal / modeledScenarioCount : null;
  const probability = candidate.isEliminated ? 0 : rawProbability;
  const estimate = {
    automaticScenarioCount,
    displayPercent: formatExpectedThirdPlaceAdvancementPercent(probability),
    groupScenarioCount: modeledScenarioCount,
    outScenarioCount,
    probability,
    remainingGroupMatchCount: fixturesData.fixtures.filter((fixture) => fixture.stage === "group" && fixture.status !== "FT").length,
    thirdPlaceScenarioCount,
    usesFallback: targetScenarios.some((scenario) => scenario.isFallback)
  };

  expectedThirdPlaceAdvancementEstimateCache.set(cacheKey, estimate);
  return estimate;
}

function getExpectedGroupThirdPlacePointFloor(group) {
  const cacheKey = String(group?.id || "");
  if (expectedGroupThirdPlacePointFloorCache.has(cacheKey)) {
    return expectedGroupThirdPlacePointFloorCache.get(cacheKey);
  }

  const projection = createExpectedGroupQualificationProjection(group);
  if (!projection) {
    expectedGroupThirdPlacePointFloorCache.set(cacheKey, null);
    return null;
  }

  let floor = Number.POSITIVE_INFINITY;

  function visit(fixtureIndex, states) {
    if (fixtureIndex >= projection.remainingFixtures.length) {
      const points = [...states.values()].map((state) => state.pts).sort((a, b) => b - a);
      const thirdPlacePoints = points[thirdPlaceStandingIndex];

      if (Number.isFinite(thirdPlacePoints)) {
        floor = Math.min(floor, thirdPlacePoints);
      }
      return;
    }

    const fixture = projection.remainingFixtures[fixtureIndex];
    getExpectedProjectedGroupQualificationResults(fixture).forEach((result) => {
      const nextStates = cloneExpectedGroupQualificationStates(states);
      applyExpectedGroupQualificationResult(nextStates, result);
      visit(fixtureIndex + 1, nextStates);
    });
  }

  visit(0, projection.baseStates);

  const pointFloor = Number.isFinite(floor) ? floor : null;
  expectedGroupThirdPlacePointFloorCache.set(cacheKey, pointFloor);
  return pointFloor;
}

function getExpectedTeamMaximumPossibleGroupPoints(teamId, group) {
  const cacheKey = `${group?.id || ""}:${teamId || ""}`;
  if (expectedTeamMaximumGroupPointsCache.has(cacheKey)) {
    return expectedTeamMaximumGroupPointsCache.get(cacheKey);
  }

  const projection = createExpectedGroupQualificationProjection(group);
  const state = projection?.baseStates.get(teamId);
  if (!state) {
    expectedTeamMaximumGroupPointsCache.set(cacheKey, null);
    return null;
  }

  const maximumPoints =
    state.pts +
    projection.remainingFixtures.filter(
      (fixture) => fixture.homeTeamId === teamId || fixture.awayTeamId === teamId
    ).length *
      3;

  expectedTeamMaximumGroupPointsCache.set(cacheKey, maximumPoints);
  return maximumPoints;
}

function getExpectedHeadToHeadStats(tiedTeamIds, results) {
  const tiedTeamSet = new Set(tiedTeamIds);
  const stats = new Map(
    tiedTeamIds.map((teamId) => [
      teamId,
      {
        fixedOnly: true,
        gd: 0,
        gf: 0,
        pts: 0,
        teamId
      }
    ])
  );

  results
    .filter((result) => tiedTeamSet.has(result.homeTeamId) && tiedTeamSet.has(result.awayTeamId))
    .forEach((result) => {
      const home = stats.get(result.homeTeamId);
      const away = stats.get(result.awayTeamId);
      const homeGoals = Number(result.homeGoals);
      const awayGoals = Number(result.awayGoals);

      home.fixedOnly = home.fixedOnly && result.fixed;
      away.fixedOnly = away.fixedOnly && result.fixed;
      home.gf += homeGoals;
      home.gd += homeGoals - awayGoals;
      away.gf += awayGoals;
      away.gd += awayGoals - homeGoals;

      if (homeGoals > awayGoals) {
        home.pts += 3;
      } else if (awayGoals > homeGoals) {
        away.pts += 3;
      } else {
        home.pts += 1;
        away.pts += 1;
      }
    });

  return stats;
}

function hasUnfixedExpectedResultForTeams(teamIds, results) {
  const teamIdSet = new Set(teamIds);
  return results.some(
    (result) => !result.fixed && (teamIdSet.has(result.homeTeamId) || teamIdSet.has(result.awayTeamId))
  );
}

function isExpectedTeamDefinitelyAboveInTie(otherTeamId, targetTeamId, tiedTeamIds, states, results) {
  const headToHeadStats = getExpectedHeadToHeadStats(tiedTeamIds, results);
  const otherHeadToHead = headToHeadStats.get(otherTeamId);
  const targetHeadToHead = headToHeadStats.get(targetTeamId);

  if (!otherHeadToHead || !targetHeadToHead) {
    return false;
  }

  if (otherHeadToHead.pts !== targetHeadToHead.pts) {
    return otherHeadToHead.pts > targetHeadToHead.pts;
  }

  const fixedHeadToHead = [...headToHeadStats.values()].every((stat) => stat.fixedOnly);
  if (!fixedHeadToHead) {
    return false;
  }

  if (otherHeadToHead.gd !== targetHeadToHead.gd) {
    return otherHeadToHead.gd > targetHeadToHead.gd;
  }

  if (otherHeadToHead.gf !== targetHeadToHead.gf) {
    return otherHeadToHead.gf > targetHeadToHead.gf;
  }

  if (hasUnfixedExpectedResultForTeams(tiedTeamIds, results)) {
    return false;
  }

  const other = states.get(otherTeamId);
  const target = states.get(targetTeamId);
  if (!other || !target) {
    return false;
  }

  if (other.gd !== target.gd) {
    return other.gd > target.gd;
  }

  if (other.gf !== target.gf) {
    return other.gf > target.gf;
  }

  const otherConduct = getTeamConductScore(other);
  const targetConduct = getTeamConductScore(target);
  if (otherConduct === null || targetConduct === null) {
    return false;
  }

  if (otherConduct !== targetConduct) {
    return otherConduct > targetConduct;
  }

  return getFifaRankValue(getTeam(otherTeamId)) < getFifaRankValue(getTeam(targetTeamId));
}

function canExpectedTeamReachGroupStagePathInScenario(teamId, states, results, pathPlaceCount) {
  const target = states.get(teamId);

  if (!target) {
    return false;
  }

  const tiedTeamIds = [...states.values()]
    .filter((state) => state.pts === target.pts)
    .map((state) => state.teamId);
  const teamsDefinitelyAbove = [...states.values()].filter((state) => {
    if (state.teamId === teamId) {
      return false;
    }

    if (state.pts !== target.pts) {
      return state.pts > target.pts;
    }

    return isExpectedTeamDefinitelyAboveInTie(state.teamId, teamId, tiedTeamIds, states, results);
  });

  return teamsDefinitelyAbove.length < pathPlaceCount;
}

function canExpectedTeamStillReachGroupStagePath(teamId, group, pathPlaceCount) {
  const projection = createExpectedGroupQualificationProjection(group);
  if (!projection) {
    return true;
  }

  function visit(fixtureIndex, states, results) {
    if (fixtureIndex >= projection.remainingFixtures.length) {
      return canExpectedTeamReachGroupStagePathInScenario(teamId, states, results, pathPlaceCount);
    }

    const fixture = projection.remainingFixtures[fixtureIndex];
    return getExpectedProjectedGroupQualificationResults(fixture).some((result) => {
      const nextStates = cloneExpectedGroupQualificationStates(states);
      applyExpectedGroupQualificationResult(nextStates, result);
      return visit(fixtureIndex + 1, nextStates, [...results, result]);
    });
  }

  return visit(0, projection.baseStates, projection.completedResults);
}

function canExpectedTeamStillAdvanceAsThirdPlace(teamId, group) {
  const thirdPlaceAdvancerCount = getThirdPlaceAdvancerCount();
  if (thirdPlaceAdvancerCount <= 0) {
    return false;
  }

  const pathPlaceCount = getGroupStagePathPlaceCount(group?.teamIds?.length || 0);
  if (!canExpectedTeamStillReachGroupStagePath(teamId, group, pathPlaceCount)) {
    return false;
  }

  const maximumPoints = getExpectedTeamMaximumPossibleGroupPoints(teamId, group);
  if (!Number.isFinite(maximumPoints)) {
    return true;
  }

  const guaranteedAboveCount = (tournamentData.groups || []).filter((groupItem) => {
    if (groupItem.id === group?.id) {
      return false;
    }

    const pointFloor = getExpectedGroupThirdPlacePointFloor(groupItem);
    return Number.isFinite(pointFloor) && pointFloor > maximumPoints;
  }).length;

  return guaranteedAboveCount < thirdPlaceAdvancerCount;
}

function isExpectedTeamEliminatedFromGroupStage(teamId, group) {
  if (!teamId || !group?.id) {
    return false;
  }

  const cacheKey = `${group.id}:${teamId}`;
  if (expectedTeamGroupStageEliminationCache.has(cacheKey)) {
    return expectedTeamGroupStageEliminationCache.get(cacheKey);
  }

  const automaticPlaces = Math.min(group.teamIds?.length || getAutomaticAdvancersPerGroup(), getAutomaticAdvancersPerGroup());
  const canReachAutomaticPlace = canExpectedTeamStillReachGroupStagePath(teamId, group, automaticPlaces);
  const isEliminated =
    !canReachAutomaticPlace && !canExpectedTeamStillAdvanceAsThirdPlace(teamId, group);

  expectedTeamGroupStageEliminationCache.set(cacheKey, isEliminated);
  return isEliminated;
}

function getExpectedEliminatedTeamNames() {
  const eliminated = [];
  const thirdPlaceRaceByTeamId = new Set(getExpectedThirdPlaceRaceRows().map((candidate) => candidate.teamId));

  for (const group of tournamentData.groups || []) {
    const rows = standingsData.groups?.[group.id] || [];

    for (const row of rows) {
      if (!thirdPlaceRaceByTeamId.has(row.teamId) && isExpectedTeamEliminatedFromGroupStage(row.teamId, group)) {
        eliminated.push(getTeam(row.teamId).name);
      }
    }
  }

  return eliminated.sort();
}

function getExpectedConfirmedAdvancingStandingTeamNames() {
  const confirmed = [];
  const thirdPlaceRaceByTeamId = new Map(getExpectedThirdPlaceRaceRows().map((candidate) => [candidate.teamId, candidate]));
  const groupStageFinished = isGroupStageFinished();
  const thirdPlaceAdvancerCount = getThirdPlaceAdvancerCount();

  for (const group of tournamentData.groups || []) {
    const rows = standingsData.groups?.[group.id] || [];
    const automaticPlaces = Math.min(group.teamIds?.length || rows.length || getAutomaticAdvancersPerGroup(), getAutomaticAdvancersPerGroup());
    const groupFinished = isExpectedGroupFinished(group.id);

    rows.forEach((row, index) => {
      const thirdPlaceCandidate = thirdPlaceRaceByTeamId.get(row.teamId);
      const madeAutomatic = groupFinished && index < automaticPlaces;
      const madeThirdPlace =
        groupStageFinished &&
        thirdPlaceCandidate?.position <= thirdPlaceAdvancerCount &&
        !thirdPlaceCandidate.isCutLineTie;

      if (madeAutomatic || madeThirdPlace) {
        confirmed.push(getTeam(row.teamId).name);
      }
    });
  }

  return confirmed.sort();
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

function getExpectedReleaseTooltipText(data) {
  const release = [...(data.releases || [])]
    .filter((item) => item && typeof item === "object")
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0];
  const title = String(release?.title || "Latest changes").trim();
  const highlights = Array.isArray(release?.highlights)
    ? release.highlights.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3)
    : [];

  return [`Release notes: ${title}`, ...highlights].filter(Boolean).join(" ");
}

async function useDesktopPointerMedia(context) {
  await context.addInitScript(() => {
    const realMatchMedia = window.matchMedia?.bind(window);
    const makeMediaResult = (query, matches) => ({
      matches,
      media: String(query),
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      }
    });

    window.matchMedia = (query) => {
      const queryText = String(query);
      if (/(hover:\s*none|pointer:\s*coarse)/.test(queryText)) {
        return makeMediaResult(queryText, false);
      }
      if (/(hover:\s*hover|pointer:\s*fine)/.test(queryText)) {
        return makeMediaResult(queryText, true);
      }
      return realMatchMedia ? realMatchMedia(query) : makeMediaResult(queryText, false);
    };
  });
}

async function openPageAtTime(
  nowIso,
  path = "/?view=matches&date=2026-06-17&tz=America%2FLos_Angeles",
  options = {}
) {
  const context = await browser.newContext(options.contextOptions || {});
  let resolveLiveDataRequest;
  const liveDataRequested = options.liveDataResponse
    ? new Promise((resolve) => {
        resolveLiveDataRequest = resolve;
      })
    : Promise.resolve();
  if (options.desktopPointerMedia) {
    await useDesktopPointerMedia(context);
  }
  if (options.beforePage) {
    await options.beforePage(context);
  }
  if (options.initScript) {
    await context.addInitScript(options.initScript);
  }
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

  if (options.tournamentTransform) {
    const patchedTournamentData = JSON.parse(JSON.stringify(tournamentData));
    options.tournamentTransform(patchedTournamentData);
    await context.route("**/data/tournament.json*", async (route) => {
      await route.fulfill({
        body: JSON.stringify(patchedTournamentData),
        contentType: "application/json",
        status: 200
      });
    });
  }

  if (options.liveDataResponse) {
    await context.route("**/api/live-data*", async (route) => {
      await route.fulfill({
        body: JSON.stringify(options.liveDataResponse),
        contentType: "application/json",
        status: 200
      });
      resolveLiveDataRequest?.();
    });
  }

  const mockedPage = await context.newPage();
  await mockedPage.goto(`${baseUrl}${path}`, { waitUntil: "load" });
  await mockedPage.waitForSelector(
    path.includes("view=standings")
      ? ".standings-card, .third-place-table, .tournament-view"
      : ".match-row, #match-list > .empty-state",
    { state: "attached", timeout: 60_000 }
  );
  await mockedPage.waitForFunction(() => {
    const matchList = document.querySelector("#match-list");
    return matchList && !matchList.hasAttribute("aria-busy");
  });

  return { context, liveDataRequested, page: mockedPage };
}

async function waitForCatchUpItems(pageInstance) {
  await pageInstance.locator("#catch-up-popover").waitFor({ state: "visible" });
  await pageInstance.waitForSelector(".catch-up-item:not(.catch-up-loading-item)", {
    state: "attached"
  });
}

async function openCatchUp(pageInstance) {
  await pageInstance.locator("#catch-up-button").click();
  await waitForCatchUpItems(pageInstance);
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
  const systemThemeContext = await browser.newContext({ colorScheme: "dark" });
  await systemThemeContext.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      window.__worldCupThemeAtDomContentLoaded = document.documentElement.dataset.theme || "";
    }, { once: true });
  });
  const systemThemePage = await systemThemeContext.newPage();
  await systemThemePage.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await systemThemePage.waitForSelector("#dark-mode-toggle", { state: "attached" });
  await systemThemePage.waitForFunction(() => document.documentElement.dataset.themeReady === "true");
  const systemDarkThemeState = await systemThemePage.evaluate(() => {
    const headChildren = [...document.head.children];
    const themeScriptIndex = headChildren.findIndex((node) =>
      node.matches?.('script[src^="theme-init.js"]')
    );
    const firstStylesheetIndex = headChildren.findIndex((node) =>
      node.matches?.('link[rel="stylesheet"]')
    );
    return {
      atDomContentLoaded: window.__worldCupThemeAtDomContentLoaded,
      checked: document.querySelector("#dark-mode-toggle")?.checked,
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
      firstStylesheetIndex,
      metaThemeColor: document.querySelector('meta[name="theme-color"]')?.content.toLowerCase(),
      preference: window.worldCupTheme?.getPreference(),
      stored: localStorage.getItem("world-cup-simplified-theme"),
      theme: document.documentElement.dataset.theme,
      themeScriptIndex
    };
  });
  assert(
    systemDarkThemeState.theme === "dark" &&
      systemDarkThemeState.atDomContentLoaded === "dark" &&
      systemDarkThemeState.checked === true &&
      systemDarkThemeState.colorScheme.includes("dark") &&
      systemDarkThemeState.metaThemeColor === "#0b0d10" &&
      systemDarkThemeState.preference === null &&
      systemDarkThemeState.stored === null &&
      systemDarkThemeState.themeScriptIndex >= 0 &&
      systemDarkThemeState.firstStylesheetIndex > systemDarkThemeState.themeScriptIndex,
    `A first visit should apply the device dark theme before CSS and without turning it into a saved preference. Measured ${JSON.stringify(systemDarkThemeState)}.`
  );
  await systemThemePage.emulateMedia({ colorScheme: "light" });
  await systemThemePage.waitForFunction(() => document.documentElement.dataset.theme === "light");
  assert(
    (await systemThemePage.evaluate(() => ({
      checked: document.querySelector("#dark-mode-toggle")?.checked,
      preference: window.worldCupTheme?.getPreference(),
      stored: localStorage.getItem("world-cup-simplified-theme")
    }))).checked === false,
    "An unsaved theme should continue following a live system preference change."
  );
  await systemThemeContext.close();

  const storedLightContext = await browser.newContext({ colorScheme: "dark" });
  await storedLightContext.addInitScript(() => {
    localStorage.setItem("world-cup-simplified-theme", "light");
  });
  const storedLightPage = await storedLightContext.newPage();
  await storedLightPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await storedLightPage.waitForSelector("#dark-mode-toggle", { state: "attached" });
  const storedLightState = await storedLightPage.evaluate(() => ({
    checked: document.querySelector("#dark-mode-toggle")?.checked,
    preference: window.worldCupTheme?.getPreference(),
    theme: document.documentElement.dataset.theme
  }));
  assert(
    storedLightState.theme === "light" &&
      storedLightState.preference === "light" &&
      storedLightState.checked === false,
    `A saved light preference should override a dark device. Measured ${JSON.stringify(storedLightState)}.`
  );
  await storedLightContext.close();

  const themeToggleContext = await browser.newContext({ colorScheme: "light" });
  const themeTogglePage = await themeToggleContext.newPage();
  const themeReportPage = await themeToggleContext.newPage();
  await themeTogglePage.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await themeReportPage.goto(`${baseUrl}/report.html`, { waitUntil: "domcontentloaded" });
  await themeTogglePage.waitForSelector("#dark-mode-toggle", { state: "attached" });
  const sharedHeaderVisibility = await Promise.all(
    [themeTogglePage, themeReportPage].map((headerPage) =>
      headerPage.evaluate(() => {
        const header = document.querySelector(".site-header");
        const settingsButton = document.querySelector("#settings-button");
        const headerBounds = header?.getBoundingClientRect();
        const settingsBounds = settingsButton?.getBoundingClientRect();
        return {
          display: header ? getComputedStyle(header).display : "",
          headerHeight: headerBounds?.height || 0,
          settingsHeight: settingsBounds?.height || 0,
          settingsWidth: settingsBounds?.width || 0
        };
      })
    )
  );
  assert(
    sharedHeaderVisibility.every(
      (headerState) =>
        headerState.display !== "none" &&
        headerState.headerHeight > 0 &&
        headerState.settingsHeight > 0 &&
        headerState.settingsWidth > 0
    ),
    `The main and Report issue pages should keep their shared header and Settings control visible. Measured ${JSON.stringify(sharedHeaderVisibility)}.`
  );
  await themeTogglePage.locator("#settings-button").click();
  const themeToggleOrder = await themeTogglePage.evaluate(() => {
    const yesterdaySetting = document.querySelector("#show-yesterday-toggle")?.closest(".settings-section");
    const darkModeSetting = document.querySelector("#dark-mode-toggle")?.closest(".settings-section");
    return {
      darkModeIsNext: yesterdaySetting?.nextElementSibling === darkModeSetting,
      darkModeIsLast: darkModeSetting?.nextElementSibling === null,
      hasReportIssue: Boolean(document.querySelector("#settings-report-link"))
    };
  });
  assert(
    themeToggleOrder.darkModeIsNext &&
      themeToggleOrder.darkModeIsLast &&
      !themeToggleOrder.hasReportIssue,
    `Settings should end with Dark mode and leave Report issue to Ball Boy. Measured ${JSON.stringify(themeToggleOrder)}.`
  );
  await themeTogglePage
    .locator("label.settings-toggle-control:has(#dark-mode-toggle)")
    .click();
  await themeTogglePage.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  await themeReportPage.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  const toggledDarkState = await themeTogglePage.evaluate(() => {
    const pitchProbe = document.createElement("div");
    const numberProbe = document.createElement("span");
    pitchProbe.className = "lineup-pitch";
    numberProbe.className = "lineup-player-number";
    pitchProbe.append(numberProbe);
    document.body.append(pitchProbe);
    const numberStyles = getComputedStyle(numberProbe);
    const lineupNumber = {
      background: numberStyles.backgroundColor,
      border: numberStyles.borderColor,
      color: numberStyles.color
    };
    pitchProbe.remove();

    return {
      checked: document.querySelector("#dark-mode-toggle")?.checked,
      lineupNumber,
      metaThemeColor: document.querySelector('meta[name="theme-color"]')?.content.toLowerCase(),
      preference: window.worldCupTheme?.getPreference(),
      stored: localStorage.getItem("world-cup-simplified-theme"),
      theme: document.documentElement.dataset.theme
    };
  });
  const reportDarkState = await themeReportPage.evaluate(() => ({
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
    metaThemeColor: document.querySelector('meta[name="theme-color"]')?.content.toLowerCase(),
    stored: localStorage.getItem("world-cup-simplified-theme"),
    theme: document.documentElement.dataset.theme
  }));
  await themeTogglePage.waitForFunction(() => {
    const launcher = document.querySelector(".scout-launcher");
    const appBackground = getComputedStyle(document.body).backgroundColor;
    return launcher &&
      appBackground === "rgb(11, 13, 16)" &&
      getComputedStyle(launcher).backgroundColor === appBackground;
  });
  const ballBoyCanvasState = await themeTogglePage.evaluate(() => {
    const backgroundColor = (selector) => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element).backgroundColor : null;
    };
    return {
      app: getComputedStyle(document.body).backgroundColor,
      face: backgroundColor(".scout-face"),
      header: backgroundColor(".scout-header"),
      launcher: backgroundColor(".scout-launcher"),
      widget: backgroundColor(".scout-widget")
    };
  });
  assert(
    Object.values(ballBoyCanvasState).every(
      (backgroundColor) => backgroundColor === ballBoyCanvasState.app
    ),
    `Ball Boy's black launcher, face, header, and shell should use the exact app canvas in dark mode. Measured ${JSON.stringify(ballBoyCanvasState)}.`
  );
  assert(
    toggledDarkState.theme === "dark" &&
      toggledDarkState.checked === true &&
      toggledDarkState.preference === "dark" &&
      toggledDarkState.stored === "dark" &&
      toggledDarkState.metaThemeColor === "#0b0d10" &&
      toggledDarkState.lineupNumber.background === "rgb(10, 10, 10)" &&
      toggledDarkState.lineupNumber.border === "rgb(18, 44, 33)" &&
      toggledDarkState.lineupNumber.color === "rgb(255, 255, 255)" &&
      reportDarkState.theme === "dark" &&
      reportDarkState.stored === "dark" &&
      reportDarkState.colorScheme.includes("dark") &&
      reportDarkState.metaThemeColor === "#0b0d10",
    `The Settings toggle should persist, update browser chrome, sync across tabs, and carry onto the report page. Measured ${JSON.stringify({ reportDarkState, toggledDarkState })}.`
  );
  await themeTogglePage.reload({ waitUntil: "domcontentloaded" });
  await themeTogglePage.waitForSelector("#dark-mode-toggle", { state: "attached" });
  assert(
    await themeTogglePage.evaluate(() =>
      document.documentElement.dataset.theme === "dark" &&
      document.querySelector("#dark-mode-toggle")?.checked === true
    ),
    "A saved dark preference should be restored on reload."
  );
  await themeTogglePage.locator("#settings-button").click();
  await themeTogglePage.locator("#language-select").selectOption("zh");
  await themeTogglePage.waitForFunction(() =>
    document.querySelector("#settings-dark-mode-label")?.textContent === "深色模式"
  );
  assert(
    (await themeTogglePage.locator("#dark-mode-toggle").getAttribute("aria-label")) === "深色模式" &&
      (await themeTogglePage.locator("#settings-report-link").count()) === 0,
    "The dark-mode setting should localize in Chinese while Report issue stays out of Settings."
  );
  await themeToggleContext.close();

  const loadingContext = await browser.newContext();
  let releaseFixtures;
  const fixturesDelay = new Promise((resolve) => {
    releaseFixtures = resolve;
  });
  await loadingContext.route("**/data/fixtures.json*", async (route) => {
    await fixturesDelay;
    await route.fulfill({
      body: JSON.stringify(fixturesData),
      contentType: "application/json",
      status: 200
    });
  });
  const loadingPage = await loadingContext.newPage();
  await loadingPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await loadingPage.waitForSelector(".header-controls:not(.is-loading)");
  await loadingPage.locator("#settings-button").click();
  await loadingPage
    .locator("label.settings-toggle-control:has(#show-yesterday-toggle)")
    .click();
  assert(
    (await loadingPage.locator("#match-list .empty-state").count()) === 0,
    "Toggling Show yesterday during initial data load should not show the no-data report state."
  );
  assert(
    (await loadingPage.locator("#match-list .match-loading-row").count()) === 4,
    "Toggling Show yesterday during initial data load should keep the match skeleton visible."
  );
  releaseFixtures();
  await loadingPage.waitForSelector(".match-row, .empty-state");
  await loadingContext.close();

  const thirdPlaceLoadingContext = await browser.newContext();
  let releaseStandings;
  const standingsDelay = new Promise((resolve) => {
    releaseStandings = resolve;
  });
  await thirdPlaceLoadingContext.route("**/data/standings.json*", async (route) => {
    await standingsDelay;
    await route.fulfill({
      body: JSON.stringify(standingsData),
      contentType: "application/json",
      status: 200
    });
  });
  const thirdPlaceLoadingPage = await thirdPlaceLoadingContext.newPage();
  await thirdPlaceLoadingPage.goto(`${baseUrl}?view=standings&standingsMode=third-place`, {
    waitUntil: "domcontentloaded"
  });
  await thirdPlaceLoadingPage.waitForSelector(".third-place-loading-row");
  const thirdPlaceLoadingState = await thirdPlaceLoadingPage.evaluate(() => ({
    ariaBusy: document.querySelector("#standings-grid")?.getAttribute("aria-busy"),
    headers: [...document.querySelectorAll(".third-place-table thead th")].map((header) =>
      header.textContent.trim()
    ),
    rowCount: document.querySelectorAll(".third-place-loading-row").length,
    realRowCount: document.querySelectorAll(".third-place-table tbody tr:not(.third-place-loading-row)").length,
    summary: document.querySelector("#standings-summary")?.textContent.trim(),
    tabPressed: document.querySelector("#standings-third-place-tab")?.getAttribute("aria-pressed")
  }));
  assert(
    thirdPlaceLoadingState.ariaBusy === "true" &&
      thirdPlaceLoadingState.tabPressed === "true" &&
      thirdPlaceLoadingState.summary.includes("Third-place standings across all groups") &&
      thirdPlaceLoadingState.headers.join("|") === "Rank|Team|Group|Pts|GD|Goals|Status" &&
      thirdPlaceLoadingState.rowCount === 8 &&
      thirdPlaceLoadingState.realRowCount === 0,
    "Direct third-place standings loads should show a table-shaped skeleton while standings data is loading."
  );
  releaseStandings();
  await thirdPlaceLoadingPage.waitForFunction(
    () => document.querySelectorAll(".third-place-table tbody tr:not(.third-place-cut-row)").length === 12
  );
  await thirdPlaceLoadingContext.close();

  const tournamentLoadingContext = await browser.newContext();
  let releaseTournamentStandings;
  const tournamentStandingsDelay = new Promise((resolve) => {
    releaseTournamentStandings = resolve;
  });
  await tournamentLoadingContext.route("**/data/standings.json*", async (route) => {
    await tournamentStandingsDelay;
    await route.fulfill({
      body: JSON.stringify(standingsData),
      contentType: "application/json",
      status: 200
    });
  });
  const tournamentLoadingPage = await tournamentLoadingContext.newPage();
  await tournamentLoadingPage.goto(`${baseUrl}?view=standings&standingsMode=tournament`, {
    waitUntil: "domcontentloaded"
  });
  await tournamentLoadingPage.waitForSelector(".tournament-loading-match");
  const tournamentLoadingState = await tournamentLoadingPage.evaluate(() => ({
    ariaBusy: document.querySelector("#standings-grid")?.getAttribute("aria-busy"),
    loadingCards: document.querySelectorAll(".tournament-loading-match").length,
    realCards: document.querySelectorAll(".progress-match:not(.tournament-loading-match)").length,
    roundHeadings: [...document.querySelectorAll(".progress-round h3")].map((heading) =>
      heading.textContent.trim()
    ),
    summary: document.querySelector("#standings-summary")?.textContent.trim(),
    tabPressed: document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed")
  }));
  assert(
    tournamentLoadingState.ariaBusy === "true" &&
      tournamentLoadingState.tabPressed === "true" &&
      tournamentLoadingState.summary.includes("Round of 32 slots") &&
      tournamentLoadingState.roundHeadings.join("|") === "Round of 32|Round of 16|Quarter-finals|Semi-finals|Final" &&
      tournamentLoadingState.loadingCards === 32 &&
      tournamentLoadingState.realCards === 0,
    "Direct tournament standings loads should show a bracket-shaped skeleton while standings data is loading."
  );
  releaseTournamentStandings();
  await tournamentLoadingPage.waitForFunction(
    () =>
      document.querySelectorAll(".progress-match:not(.tournament-loading-match)").length === 32 &&
      document.querySelectorAll(".tournament-loading-match").length === 0
  );
  await tournamentLoadingContext.close();

  const releaseNotesLoadingContext = await browser.newContext();
  let releaseReleaseNotes;
  const releaseNotesDelay = new Promise((resolve) => {
    releaseReleaseNotes = resolve;
  });
  await releaseNotesLoadingContext.route("**/data/release-notes.json*", async (route) => {
    await releaseNotesDelay;
    await route.fulfill({
      body: JSON.stringify(releaseNotesData),
      contentType: "application/json",
      status: 200
    });
  });
  const releaseNotesLoadingPage = await releaseNotesLoadingContext.newPage();
  await releaseNotesLoadingPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await releaseNotesLoadingPage.waitForSelector(".match-row, .empty-state");
  const releaseNotesLoadingTooltip = releaseNotesLoadingPage.locator("#source-note .release-tooltip");
  const releaseNotesLoadingState = await releaseNotesLoadingTooltip.evaluate((tooltip) => ({
    title: tooltip.querySelector("strong")?.textContent?.trim(),
    status: tooltip.querySelector(".release-tooltip-loading .visually-hidden")?.textContent?.trim(),
    rows: tooltip.querySelectorAll(".release-tooltip-loading-row").length,
    lines: tooltip.querySelectorAll(".release-tooltip-loading .match-loading-line").length
  }));
  assert(
    (await releaseNotesLoadingTooltip.getAttribute("aria-busy")) === "true",
    "The release notes tooltip should be marked busy while release notes are loading."
  );
  assert(
    releaseNotesLoadingState.title === "Release notes: Latest changes" &&
      releaseNotesLoadingState.status === "Loading release notes" &&
      releaseNotesLoadingState.rows === 3 &&
      releaseNotesLoadingState.lines === 3,
    "The release notes tooltip should show a compact skeleton state while release notes are loading."
  );
  releaseReleaseNotes();
  await releaseNotesLoadingPage.waitForFunction((expectedText) => {
    const tooltip = document.querySelector("#source-note .release-tooltip");
    const tooltipText = [
      tooltip?.querySelector("strong")?.textContent?.trim(),
      ...Array.from(tooltip?.querySelectorAll("li") || []).map((item) => item.textContent.trim()),
      tooltip?.querySelector(".release-tooltip-note")?.textContent?.trim()
    ]
      .filter(Boolean)
      .join(" ");

    return (
      tooltip?.getAttribute("aria-busy") === "false" &&
      tooltipText === expectedText
    );
  }, getExpectedReleaseTooltipText(releaseNotesData));
  await releaseNotesLoadingContext.close();

  const compactFooterContext = await browser.newContext();
  let releaseHomeLiveData;
  let resolveHomeLiveDataRequest;
  const homeLiveDataDelay = new Promise((resolve) => {
    releaseHomeLiveData = resolve;
  });
  const homeLiveDataRequested = new Promise((resolve) => {
    resolveHomeLiveDataRequest = resolve;
  });
  await compactFooterContext.route("**/api/live-data*", async (route) => {
    resolveHomeLiveDataRequest();
    await homeLiveDataDelay;
    await route.fulfill({
      body: JSON.stringify({
        fixturesData,
        standingsData,
        syncStatus: { checkedAt: "2026-07-19T16:32:00.000Z", ok: true },
        tournamentData
      }),
      contentType: "application/json",
      status: 200
    });
  });
  const compactHomeFooterPage = await compactFooterContext.newPage();
  await compactHomeFooterPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await homeLiveDataRequested;
  const compactHomeFooterState = await compactHomeFooterPage.locator("#source-note").evaluate((note) => ({
    creator: note.querySelector(".source-credit")?.textContent.trim(),
    freshnessCount: note.querySelectorAll(".source-freshness").length,
    releaseTooltipCreatorCount: note.querySelectorAll(".release-tooltip .source-credit, .release-tooltip-note").length,
    sourceButton: note.querySelector(".source-tooltip-trigger")?.textContent.trim(),
    releaseButton: note.querySelector(".release-tooltip-trigger")?.textContent.trim()
  }));
  assert(
    compactHomeFooterState.creator === "Made by HA" &&
      compactHomeFooterState.freshnessCount === 0 &&
      compactHomeFooterState.releaseTooltipCreatorCount === 0 &&
      compactHomeFooterState.sourceButton === "Sources" &&
      compactHomeFooterState.releaseButton === "Release notes",
    `The home footer should show its creator credit outside the Release notes tooltip while live data loads. Measured ${JSON.stringify(compactHomeFooterState)}.`
  );
  releaseHomeLiveData();
  const compactReportFooterPage = await compactFooterContext.newPage();
  await compactReportFooterPage.goto(`${baseUrl}/report.html`, { waitUntil: "domcontentloaded" });
  const compactReportFooterState = await compactReportFooterPage.locator("#source-note").evaluate((note) => ({
    creator: note.querySelector(".source-credit")?.textContent.trim(),
    freshnessCount: note.querySelectorAll(".source-freshness").length,
    releaseTooltipCreatorCount: note.querySelectorAll(".release-tooltip .source-credit, .release-tooltip-note").length,
    sourceButton: note.querySelector(".source-tooltip-trigger")?.textContent.trim(),
    releaseButton: note.querySelector(".release-tooltip-trigger")?.textContent.trim()
  }));
  assert(
    compactReportFooterState.creator === "Made by HA" &&
      compactReportFooterState.freshnessCount === 0 &&
      compactReportFooterState.releaseTooltipCreatorCount === 0 &&
      compactReportFooterState.sourceButton === "Sources" &&
      compactReportFooterState.releaseButton === "Release notes",
    `The Report footer should show its creator credit outside the Release notes tooltip. Measured ${JSON.stringify(compactReportFooterState)}.`
  );
  await compactFooterContext.close();

  {
  const defaultMatchViewCheck = await openPageAtTime("2026-07-07T12:00:00-07:00", "/", {
    contextOptions: { timezoneId: "America/Los_Angeles" }
  });
  const page = defaultMatchViewCheck.page;

  const defaultMatchUrl = new URL(page.url());
  const unexpectedDefaultMatchParams = [...new Set(defaultMatchUrl.searchParams.keys())].filter(
    (key) => key !== "date"
  );
  assert(
    unexpectedDefaultMatchParams.length === 0,
    `The default match view should omit redundant match-view URL state. Saw ${defaultMatchUrl.search || "(empty)"}.`
  );
  assert(
    !(await page.locator("#match-info").isVisible()),
    "Match detail should stay hidden until a match is chosen."
  );
  assert(
    (await page.locator(".match-row.is-selected").count()) === 0,
    "No match row should be selected on load."
  );
  assert(
    await page.locator(".site-footer").isVisible(),
    "The bottom disclaimer should remain visible on the Matches tab."
  );

  const startingHistoryLength = await page.evaluate(() => history.length);
  await page.locator("#standings-tab").click();
  await page.waitForFunction(
    () =>
      new URL(location.href).searchParams.get("view") === "standings" &&
      document.querySelector("#standings-view")?.hidden === false
  );
  const mainTabIndicatorGeometry = await page.evaluate(() => {
    const shell = document.querySelector(".view-tabs");
    const activeTab = document.querySelector(".view-tab.is-active");
    const shellRect = shell.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    const indicatorLeft =
      shellRect.left + shell.clientLeft +
      Number.parseFloat(shell.style.getPropertyValue("--active-tab-left"));
    const indicatorWidth = Number.parseFloat(
      shell.style.getPropertyValue("--active-tab-width")
    );

    return {
      leftDelta: Math.abs(indicatorLeft - tabRect.left),
      rightDelta: Math.abs(indicatorLeft + indicatorWidth - tabRect.right)
    };
  });
  assert(
    mainTabIndicatorGeometry.leftDelta <= 0.25 &&
      mainTabIndicatorGeometry.rightDelta <= 0.25,
    `The selected main-tab fill should align with both edges of its tab, keeping an even inset to the outer pill. Measured ${JSON.stringify(mainTabIndicatorGeometry)}.`
  );
  assert(
    !(await page.locator(".site-footer").isVisible()),
    "The bottom disclaimer should stay hidden across the Standings tab."
  );
  const standingsHistoryLength = await page.evaluate(() => history.length);
  assert(
    standingsHistoryLength > startingHistoryLength,
    "Choosing Standings should push a browser history entry."
  );
  await page.goBack();
  await page.waitForFunction(
    () => {
      const params = new URL(location.href).searchParams;
      const unexpectedParams = [...new Set(params.keys())].filter((key) => key !== "date");
      return (
        location.origin.startsWith("http://127.0.0.1") &&
        unexpectedParams.length === 0 &&
        document.querySelector("#matches-view")?.hidden === false
      );
    }
  );
  assert(
    await page.locator(".site-footer").isVisible(),
    "Returning to Matches should restore the bottom disclaimer."
  );
  await page.goForward();
  await page.waitForFunction(
    () =>
      new URL(location.href).searchParams.get("view") === "standings" &&
      document.querySelector("#standings-view")?.hidden === false
  );
  assert(
    !(await page.locator(".site-footer").isVisible()),
    "Returning to Standings should hide the bottom disclaimer again."
  );

  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector(".match-row");
  const searchHistoryStart = await page.evaluate(() => history.length);
  await page.locator("#team-search-toggle").click();
  await page.locator("#team-search-input").fill("Ja");
  await page.waitForFunction(() => new URL(location.href).searchParams.get("team") === "Ja");
  const searchHistoryAfterFirstQuery = await page.evaluate(() => history.length);
  assert(
    searchHistoryAfterFirstQuery > searchHistoryStart,
    "Starting a country search should push a browser history entry."
  );
  await page.locator("#team-search-input").fill("Japan");
  await page.waitForFunction(() => new URL(location.href).searchParams.get("team") === "Japan");
  await page.waitForTimeout(250);
  assert(
    (await page.evaluate(() => history.length)) === searchHistoryAfterFirstQuery,
    "Refining a country search should replace the current search URL instead of pushing each edit."
  );
  await page.goBack();
  await page.waitForFunction(
    () =>
      location.origin.startsWith("http://127.0.0.1") &&
      !new URL(location.href).searchParams.has("team") &&
      document.querySelector("#matches-view")?.hidden === false
  );

  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector(".match-row");
  const homeSeoState = await page.evaluate(() => ({
    canonical: document.querySelector('link[rel="canonical"]')?.href || "",
    description: document.querySelector('meta[name="description"]')?.content || "",
    historyLength: history.length,
    title: document.title,
    url: location.href
  }));
  await page.locator(".match-row").first().dispatchEvent("pointerenter", { pointerType: "mouse" });
  const hoverSeoState = await page.evaluate(() => ({
    canonical: document.querySelector('link[rel="canonical"]')?.href || "",
    historyLength: history.length,
    title: document.title,
    url: location.href
  }));
  assert(
    homeSeoState.title === "World Cup Simplified" &&
      homeSeoState.description.includes("verified lineups") &&
      homeSeoState.canonical === "https://world-cup-simplified.vercel.app/" &&
      hoverSeoState.title === homeSeoState.title &&
      hoverSeoState.canonical === homeSeoState.canonical &&
      hoverSeoState.url === homeSeoState.url &&
      hoverSeoState.historyLength === homeSeoState.historyLength,
    `Desktop hover previews should leave SEO metadata, the URL, and browser history untouched. Measured ${JSON.stringify({ homeSeoState, hoverSeoState })}.`
  );
  await page.locator(".match-row").first().click();
  await page.waitForFunction(() => new URL(location.href).searchParams.has("match"));
  const selectedMatchSeoState = await page.evaluate(() => {
    const matchId = new URL(location.href).searchParams.get("match");
    const structuredData = JSON.parse(document.querySelector("#seo-structured-data")?.textContent || "{}");
    return {
      canonical: document.querySelector('link[rel="canonical"]')?.href || "",
      matchId,
      structuredTypes: (structuredData["@graph"] || []).map((item) => item["@type"]),
      title: document.title
    };
  });
  assert(
    selectedMatchSeoState.matchId &&
      selectedMatchSeoState.canonical ===
        `https://world-cup-simplified.vercel.app/?match=${selectedMatchSeoState.matchId}` &&
      selectedMatchSeoState.title.includes(" vs ") &&
      selectedMatchSeoState.title.includes("World Cup 2026") &&
      selectedMatchSeoState.structuredTypes.includes("SportsEvent"),
    `A deliberate match selection should publish match-specific metadata and SportsEvent data. Measured ${JSON.stringify(selectedMatchSeoState)}.`
  );
  await page.goBack();
  await page.waitForFunction(
    () =>
      location.origin.startsWith("http://127.0.0.1") &&
      !new URL(location.href).searchParams.has("match") &&
      document.querySelectorAll(".match-row.is-selected").length === 0 &&
      document.title === "World Cup Simplified" &&
      document.querySelector('link[rel="canonical"]')?.href === "https://world-cup-simplified.vercel.app/"
  );
  await page.goForward();
  await page.waitForFunction(
    () =>
      new URL(location.href).searchParams.has("match") &&
      document.querySelectorAll(".match-row.is-selected").length === 1 &&
      document.title.includes(" vs ") &&
      document.querySelector('link[rel="canonical"]')?.href.includes("?match=")
  );

  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector(".match-row");
  await page.locator(".match-row").first().click();
  assert(
    await page.locator("#match-info").isVisible(),
    "Choosing a match should reveal match detail."
  );
  const matchInfoCloseButton = page.locator("#match-info .match-info-close");
  assert(
    (await matchInfoCloseButton.count()) === 1 &&
      (await matchInfoCloseButton.getAttribute("aria-label")) === "Close match details",
    "Match details should expose one clearly labelled close control."
  );
  const matchInfoCloseMetrics = await page.locator("#match-info").evaluate((card) => {
    const button = card.querySelector(".match-info-close");
    const cardRect = card.getBoundingClientRect();
    const buttonRect = button?.getBoundingClientRect();
    const buttonStyle = button ? getComputedStyle(button) : null;

    return {
      buttonHeight: buttonRect?.height || 0,
      buttonWidth: buttonRect?.width || 0,
      position: buttonStyle?.position || "",
      rightInset: buttonRect ? cardRect.right - buttonRect.right : Number.POSITIVE_INFINITY,
      topInset: buttonRect ? buttonRect.top - cardRect.top : Number.POSITIVE_INFINITY
    };
  });
  assert(
    matchInfoCloseMetrics.position === "absolute" &&
      matchInfoCloseMetrics.buttonWidth >= 36 &&
      matchInfoCloseMetrics.buttonHeight >= 36 &&
      matchInfoCloseMetrics.rightInset >= 0 &&
      matchInfoCloseMetrics.rightInset <= 16 &&
      matchInfoCloseMetrics.topInset >= 0 &&
      matchInfoCloseMetrics.topInset <= 16,
    `The close control should overlay the card's top-right corner without joining document flow. Measured ${JSON.stringify(matchInfoCloseMetrics)}.`
  );
  await matchInfoCloseButton.click();
  await page.waitForFunction(
    () =>
      document.querySelector("#match-info")?.hidden === true &&
      !new URL(location.href).searchParams.has("match")
  );
  const dismissedMatchInfoState = await page.evaluate(() => ({
    focusedRowTrigger: document.activeElement?.matches(".match-row-trigger, .yesterday-match-button") || false,
    selectedRows: document.querySelectorAll(".match-row.is-selected, .yesterday-match-card.is-selected").length
  }));
  assert(
    dismissedMatchInfoState.focusedRowTrigger && dismissedMatchInfoState.selectedRows === 0,
    `Closing match details should clear selection and return keyboard focus to the originating match. Measured ${JSON.stringify(dismissedMatchInfoState)}.`
  );
  await page.goBack();
  await page.waitForFunction(
    () =>
      new URL(location.href).searchParams.has("match") &&
      document.querySelector("#match-info")?.hidden === false &&
      document.querySelectorAll(".match-row.is-selected, .yesterday-match-card.is-selected").length === 1
  );
  const keyInformationText = await page.locator(".key-info-team p").first().innerText();
  const selectedKeyInformationFixture = fixturesData.fixtures.find(
    (fixture) => fixture.id === selectedMatchSeoState.matchId
  );
  const selectedHomeName = teamsById.get(selectedKeyInformationFixture?.homeTeamId)?.name || "";
  const selectedAwayName = teamsById.get(selectedKeyInformationFixture?.awayTeamId)?.name || "";
  assert(
    selectedHomeName &&
      selectedAwayName &&
      keyInformationText.includes(selectedHomeName) &&
      keyInformationText.includes(selectedAwayName),
    "Key information should include matchup-specific opponent context."
  );
  assert(
    !/main names to track/i.test(keyInformationText),
    "Key information should not use generic player-list placeholder copy."
  );
  assert(
    (await page.locator(".player-link").count()) > 0,
    "Key information should expose highlighted player names as player-card triggers."
  );
  await assertPlayerCardTriggersStayInternal(
    page.locator("#match-info"),
    "Current match player-card triggers should not navigate to Wikipedia or other source pages."
  );
  const keyboardPlayerTrigger = page.locator("#match-info .key-info-team p .player-link[data-player-card-trigger]").first();
  await keyboardPlayerTrigger.focus();
  await page.keyboard.press("Enter");
  await page.locator(".player-card:visible").first().waitFor({ state: "visible" });
  assert(
    (await keyboardPlayerTrigger.getAttribute("aria-expanded")) === "true",
    "Keyboard activation should open the in-app player card without relying on a source link."
  );
  await page.keyboard.press("Escape");
  await page.mouse.move(0, 0);
  await page.locator("#day-label").focus();
  await page.waitForFunction(() => {
    const expandedTriggers = document.querySelectorAll(".player-link[data-player-card-trigger][aria-expanded='true']");

    return expandedTriggers.length === 0;
  });
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
    .evaluate((link) => {
      const style = getComputedStyle(link);
      const matchesDottedUnderlineRule = (rule) => {
        if (rule.selectorText) {
          const ruleLine = rule.style.getPropertyValue("text-decoration-line") || rule.style.textDecorationLine;
          const ruleStyle = rule.style.getPropertyValue("text-decoration-style") || rule.style.textDecorationStyle;
          const selectorMatches = rule.selectorText.split(",").some((selector) => {
            try {
              return link.matches(selector.trim());
            } catch {
              return false;
            }
          });

          return selectorMatches && ruleLine === "underline" && ruleStyle === "dotted";
        }

        return rule.cssRules ? [...rule.cssRules].some(matchesDottedUnderlineRule) : false;
      };
      const hasDottedUnderlineRule = [...document.styleSheets].some((sheet) => {
        try {
          return [...sheet.cssRules].some(matchesDottedUnderlineRule);
        } catch {
          return false;
        }
      });

      return {
        hasDottedUnderlineRule,
        line: style.textDecorationLine,
        style: style.textDecorationStyle
      };
    });
  const paragraphPlayerOpacity = await page
    .locator(".key-info-team p .player-link")
    .first()
    .evaluate((link) => Number(getComputedStyle(link).opacity));
  const paragraphPlayerWeight = await page
    .locator(".key-info-team p .player-link")
    .first()
    .evaluate((link) => Number(getComputedStyle(link).fontWeight));
  assert(
    (paragraphPlayerDecoration.line === "underline" && paragraphPlayerDecoration.style === "dotted") ||
      paragraphPlayerDecoration.hasDottedUnderlineRule,
    `Paragraph player mentions should use a soft dotted underline. Measured ${JSON.stringify(paragraphPlayerDecoration)}.`
  );
  assert(
    paragraphPlayerOpacity >= 0.99 && paragraphPlayerWeight <= 500,
    `Paragraph player mentions should use full opacity and regular paragraph weight. Measured ${JSON.stringify({ paragraphPlayerOpacity, paragraphPlayerWeight })}.`
  );
  await page.locator(".key-info-team p .player-link").first().focus();
  const playerCard = page.locator(".player-card:visible").first();
  await playerCard.waitFor({ state: "visible" });
  const playerCardTextAlign = await playerCard.evaluate((card) => getComputedStyle(card).textAlign);
  assert(
    playerCardTextAlign === "left" || playerCardTextAlign === "start",
    `Player hover cards should keep their content left aligned regardless of the trigger's parent alignment. Measured ${playerCardTextAlign}.`
  );
  const playerCardPhotoCount = await playerCard.locator(".player-photo img").count();
  const playerCardFallbackCount = await playerCard.locator(".player-photo-fallback").count();
  assert(
    (playerCardPhotoCount === 1 && playerCardFallbackCount === 1) ||
      (playerCardPhotoCount === 0 && playerCardFallbackCount === 1),
    "Player hover card should keep initials available behind a remote face or as the final fallback."
  );
  const playerCardPhoto = playerCard.locator(".player-photo img");
  if ((await playerCardPhoto.count()) === 1) {
    const playerCardPhotoPosition = await playerCardPhoto.evaluate(
      (image) => getComputedStyle(image).objectPosition
    );
    assert(
      playerCardPhotoPosition === "50% 12%",
      `Player hover card photos should keep the face-biased crop position. Measured ${playerCardPhotoPosition}.`
    );
  }
  const playerPhotoRetryState = await page.evaluate(async () => {
    const photo = document.createElement("span");
    photo.className = "player-photo";
    const fallback = document.createElement("span");
    fallback.className = "player-photo-fallback";
    fallback.textContent = "JV";
    const image = document.createElement("img");
    image.alt = "";
    image.dataset.playerInitials = "JV";
    image.dataset.playerImageOriginalUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Jorge_Valdano_Cropped.jpg/330px-Jorge_Valdano_Cropped.jpg";
    image.dataset.playerImageFallbackUrl =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='58' height='58'%3E%3Crect width='58' height='58' fill='white'/%3E%3C/svg%3E";
    photo.append(fallback, image);
    document.body.append(photo);
    image.dispatchEvent(new Event("error"));
    await new Promise((resolve, reject) => {
      const startedAt = performance.now();
      const checkRetry = () => {
        if (image.src.startsWith("data:image/svg+xml")) {
          resolve();
          return;
        }
        if (performance.now() - startedAt > 3000) {
          reject(new Error("Timed out waiting for the player-photo fallback URL."));
          return;
        }
        window.setTimeout(checkRetry, 25);
      };
      checkRetry();
    });
    image.dispatchEvent(new Event("load"));
    const state = {
      fallbackText: fallback.textContent,
      hasImage: image.isConnected,
      imageReady: image.classList.contains("is-image-ready"),
      parentReady: photo.classList.contains("is-image-ready"),
      retryAttempt: image.dataset.playerImageRetryAttempt,
      retriedWithAlternate: image.src.startsWith("data:image/svg+xml")
    };
    photo.remove();
    return state;
  });
  assert(
    playerPhotoRetryState.fallbackText === "JV" &&
      playerPhotoRetryState.hasImage &&
      playerPhotoRetryState.imageReady &&
      playerPhotoRetryState.parentReady &&
      playerPhotoRetryState.retryAttempt === "1" &&
      playerPhotoRetryState.retriedWithAlternate,
    `Player photos should keep initials visible and retry a failed Wikimedia URL through its alternate route. Measured ${JSON.stringify(playerPhotoRetryState)}.`
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
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await page.mouse.move(0, 0);
  await keyboardPlayerTrigger.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const scrollTop = document.querySelector("#match-info")?.scrollTop || 0;
    const now = performance.now();
    const previous = window.__worldCupPlayerCardScrollSettle;
    if (!previous || Math.abs(previous.scrollTop - scrollTop) > 0.5) {
      window.__worldCupPlayerCardScrollSettle = { scrollTop, since: now };
      return false;
    }
    return now - previous.since >= 120;
  });
  await page.evaluate(() => {
    delete window.__worldCupPlayerCardScrollSettle;
  });
  const hoverTriggerBox = await keyboardPlayerTrigger.boundingBox();
  assert(hoverTriggerBox, "Floating player-card hover trigger geometry should be measurable.");
  await page.mouse.move(
    hoverTriggerBox.x + hoverTriggerBox.width / 2,
    hoverTriggerBox.y + hoverTriggerBox.height / 2
  );
  const floatingHoverCard = page.locator(".player-card-floating");
  await floatingHoverCard.waitFor({ state: "visible" });
  await floatingHoverCard.dispatchEvent("pointerenter", { pointerType: "mouse" });
  await page.keyboard.press("Tab");
  const floatingValueHelp = floatingHoverCard.locator(".player-card-value-help").first();
  assert(
    (await floatingValueHelp.count()) === 1,
    "Floating player cards should expose a keyboard-focusable Value help control."
  );
  await floatingValueHelp.evaluate((value) => value.focus({ preventScroll: true }));
  await page.waitForFunction(() => {
    const card = document.querySelector(".player-card-floating");
    const value = card?.querySelector(".player-card-value-help");
    const tooltip = value ? getComputedStyle(value, "::after") : null;
    return (
      document.activeElement === value &&
      card?.classList.contains("is-visible") &&
      card.getAttribute("aria-hidden") === "false" &&
      Number.parseFloat(tooltip?.opacity || "0") >= 0.99 &&
      tooltip?.visibility === "visible"
    );
  });
  const floatingHoverState = await floatingHoverCard.evaluate((card) => {
    const value = card.querySelector(".player-card-value-help");
    const tooltip = value ? getComputedStyle(value, "::after") : null;
    return {
      cardVisible: card.classList.contains("is-visible") && card.getAttribute("aria-hidden") === "false",
      focused: document.activeElement === value,
      tooltipOpacity: Number.parseFloat(tooltip?.opacity || "0"),
      tooltipVisibility: tooltip?.visibility || ""
    };
  });
  assert(
    floatingHoverState.cardVisible &&
      floatingHoverState.focused &&
      floatingHoverState.tooltipOpacity >= 0.99 &&
      floatingHoverState.tooltipVisibility === "visible",
    `Floating player cards should preserve keyboard focus and expose Value help. Measured ${JSON.stringify(floatingHoverState)}.`
  );
  await floatingValueHelp.evaluate((value) => value.blur());
  await page.mouse.move(0, 0);
  await page.waitForFunction(() => {
    const card = document.querySelector(".player-card-floating");
    const styles = card ? getComputedStyle(card) : null;
    const opacity = Number.parseFloat(styles?.opacity || "1");
    return (
      card &&
      !card.classList.contains("is-visible") &&
      card.getAttribute("aria-hidden") === "true" &&
      (opacity < 1 || styles?.visibility === "hidden")
    );
  });
  const floatingFadeOutState = await floatingHoverCard.evaluate((card) => {
    const styles = getComputedStyle(card);
    return {
      opacity: Number.parseFloat(styles.opacity || "0"),
      visibility: styles.visibility,
      transitionProperty: styles.transitionProperty
    };
  });
  assert(
    floatingFadeOutState.opacity >= 0 &&
      floatingFadeOutState.opacity < 1 &&
      floatingFadeOutState.transitionProperty.includes("opacity"),
    `Floating player cards should fade out after the hover handoff. Measured ${JSON.stringify(floatingFadeOutState)}.`
  );
  await page.waitForTimeout(280);
  await floatingHoverCard.waitFor({ state: "hidden" });
  await defaultMatchViewCheck.context.close();
  }

  await page.goto(`${baseUrl}?view=matches&date=2026-06-20&lang=en&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="netherlands-sweden-2026-06-20"]').click();
  const summervilleCard = page
    .locator("#match-info .result-story-highlights .player-hover")
    .filter({ has: page.locator(".player-link", { hasText: "Crysencio Summerville" }) })
    .first()
    .locator(".player-card");
  await page.waitForFunction(() =>
    [...document.querySelectorAll("#match-info .result-story-highlights .player-hover")].some(
      (hover) =>
        hover.querySelector(".player-link")?.textContent?.trim() === "Crysencio Summerville" &&
        hover.querySelector(".player-card-position")?.textContent?.trim() === "Winger"
    )
  );
  assert(
    (await summervilleCard.locator(".player-card-position").innerText()).trim() === "Winger",
    "Player hover card should normalize lowercase source positions for display."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-22&lang=en&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="france-iraq-2026-06-22"]').click();
  const expectedMbappeGenericCardNote =
    "Mbappé's signature is explosive speed once open grass appears. Near goal, he shifts onto his stronger foot and shoots with little backlift. When defenders crowd him, he looks for the next pass instead of forcing a shot.";
  const mbappeGenericCardNoteLocator = page
    .locator("#match-info .key-info-team")
    .first()
    .locator(".player-hover")
    .filter({ has: page.locator(".player-link", { hasText: "Kylian Mbappe" }) })
    .first()
    .locator(
      ".player-card-copy > .player-card-note:not(.player-card-tournament-stats):not(.player-card-meta):not(.player-card-world-cup-context)"
    );
  await page.waitForFunction((expectedNote) =>
    [...document.querySelectorAll("#match-info .key-info-team .player-hover")].some((hover) =>
      hover.querySelector(".player-link")?.textContent?.trim() === "Kylian Mbappe" &&
      [...hover.querySelectorAll(".player-card-copy > .player-card-note")].some(
        (note) => note.textContent?.trim() === expectedNote
      )
    ), expectedMbappeGenericCardNote, { timeout: 30000 });
  const mbappeGenericCardNote = await mbappeGenericCardNoteLocator.innerText();
  assert(
    mbappeGenericCardNote.trim() === expectedMbappeGenericCardNote,
    `Generic player cards opened from a fixture should use Mbappé's detailed canonical profile, not the short match teaser. Measured ${JSON.stringify(mbappeGenericCardNote.trim())}.`
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
    .evaluate((link) => {
      const style = getComputedStyle(link);
      const isVisible = Boolean(link.offsetWidth || link.offsetHeight || link.getClientRects().length);
      const matchesDottedUnderlineRule = (rule) => {
        if (rule.selectorText) {
          const ruleLine =
            rule.style.getPropertyValue("text-decoration-line") || rule.style.textDecorationLine;
          const ruleStyle =
            rule.style.getPropertyValue("text-decoration-style") || rule.style.textDecorationStyle;
          const selectorMatches = rule.selectorText.split(",").some((selector) => {
            try {
              return link.matches(selector.trim());
            } catch {
              return false;
            }
          });

          return selectorMatches && ruleLine === "underline" && ruleStyle === "dotted";
        }

        return rule.cssRules ? [...rule.cssRules].some(matchesDottedUnderlineRule) : false;
      };
      const hasDottedUnderlineRule = [...document.styleSheets].some((sheet) => {
        try {
          return [...sheet.cssRules].some(matchesDottedUnderlineRule);
        } catch {
          return false;
        }
      });

      return {
        hasDottedUnderlineRule,
        isVisible,
        line: style.textDecorationLine,
        style: style.textDecorationStyle,
        text: link.textContent.trim()
      };
    });
  assert(
    !scorerHighlightMetrics.hasStandaloneSoccerIcon &&
      scorerHighlightMetrics.segmentCount >= 1 &&
      scorerHighlightMetrics.segmentTexts.every((text) => /\b\d+(?:\+\d+)?'/.test(text)) &&
      scorerHighlightMetrics.segmentFlags.every(
        (flag) =>
          flag.hasFlag &&
          / flag$/.test(flag.label) &&
          flag.flagBeforeMinute &&
          flag.verticalDelta <= 4
      ),
    `Scorer highlights should use full-strength country flags before each scorer minute. Measured ${JSON.stringify(scorerHighlightMetrics)}.`
  );
  assert(
    scorerPlayerDecoration.text &&
      ((scorerPlayerDecoration.line === "underline" && scorerPlayerDecoration.style === "dotted") ||
        scorerPlayerDecoration.hasDottedUnderlineRule),
    `Scorer player mentions should use the same soft dotted underline as paragraph mentions. Measured ${JSON.stringify(scorerPlayerDecoration)}.`
  );
  await page.setViewportSize({ width: 1280, height: 720 });

  const runtimeScorerCheck = await openPageAtTime(
    "2026-06-21T20:30:00.000Z",
    "/?view=matches&date=2026-06-21&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const fixture = data.fixtures.find((item) => item.id === "new-zealand-egypt-2026-06-21");
        fixture.status = "FT";
        fixture.score = { home: 1, away: 0 };
        fixture.goalsHome = [{ minute: 54, name: "Runtime Scorer" }];
        fixture.goalsAway = [];
      }
    }
  );
  await runtimeScorerCheck.page.locator('[data-match-id="new-zealand-egypt-2026-06-21"]').click();
  const runtimeScorerCard = runtimeScorerCheck.page
    .locator("#match-info .scorer-highlight .player-hover")
    .filter({ has: runtimeScorerCheck.page.locator(".player-link", { hasText: "Runtime Scorer" }) })
    .first()
    .locator(".player-card");
  const runtimeScorerCardText = await runtimeScorerCard.innerText();
  assert(
    runtimeScorerCardText.includes("Runtime Scorer") &&
      runtimeScorerCardText.includes("Goal scorer") &&
      runtimeScorerCardText.includes("New Zealand match card") &&
      runtimeScorerCardText.includes("Goal threat") &&
      !/Position to verify|Club to verify|Match plan/.test(runtimeScorerCardText),
    "Runtime-only scorers should get contextual goal cards instead of verification placeholders."
  );
  await runtimeScorerCheck.context.close();

  const brazilJapanRecapCheck = await openPageAtTime(
    "2026-06-29T20:00:00.000Z",
    "/?view=matches&date=2026-06-29&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const fixture = data.fixtures.find((item) => item.id === "match-76-round-of-32-2026-06-29");
        fixture.status = "FT";
        fixture.score = { home: 2, away: 1 };
        fixture.goalsHome = [
          { minute: 56, name: "Casemiro" },
          { minute: 90, offset: 5, name: "Gabriel Martinelli" }
        ];
        fixture.goalsAway = [{ minute: 29, name: "Kaishu Sano" }];
      }
    }
  );
  await brazilJapanRecapCheck.page.locator('[data-match-id="match-76-round-of-32-2026-06-29"]').click();
  const brazilJapanResultBlock = await brazilJapanRecapCheck.page.locator("#match-info").evaluate((root) => {
    const visibleText = (node) => {
      if (!node) {
        return "";
      }

      const clone = node.cloneNode(true);
      clone.querySelectorAll(".player-card").forEach((card) => card.remove());
      return clone.textContent.replace(/\s+/g, " ").trim();
    };
    const scoreSummary = root.querySelector(".result-score-summary");
    const highlightLink = root.querySelector(".result-video-link");
    const storyItems = [...root.querySelectorAll(".result-story-highlights li")].map(visibleText);
    return {
      scoreText: visibleText(scoreSummary),
      scoreWeight: Number(scoreSummary ? getComputedStyle(scoreSummary).fontWeight : 0),
      scorerText: visibleText(root.querySelector(".result-scorer-highlights")),
      highlightHref: highlightLink?.getAttribute("href") || "",
      highlightRel: highlightLink?.getAttribute("rel") || "",
      highlightTarget: highlightLink?.getAttribute("target") || "",
      highlightTooltip: highlightLink?.getAttribute("data-tooltip") || "",
      storyItems,
      storyLinkTexts: [...root.querySelectorAll(".result-story-highlights .player-link")].map((link) =>
        link.textContent.trim()
      )
    };
  });
  assert(
    brazilJapanResultBlock.scoreText === "Brazil beat Japan 2-1." &&
      brazilJapanResultBlock.scoreWeight >= 600 &&
      brazilJapanResultBlock.scorerText.includes("29' Kaishū Sano") &&
      brazilJapanResultBlock.scorerText.includes("56' Casemiro") &&
      brazilJapanResultBlock.scorerText.includes("90+5' Gabriel Martinelli") &&
      brazilJapanResultBlock.highlightHref === "https://www.youtube.com/watch?v=QgUSOlN0Tt0" &&
      brazilJapanResultBlock.highlightTarget === "_blank" &&
      brazilJapanResultBlock.highlightRel.includes("noopener") &&
      brazilJapanResultBlock.highlightTooltip === "Play highlights on YouTube" &&
      brazilJapanResultBlock.storyItems.length === 3 &&
      brazilJapanResultBlock.storyItems.every((item) => !/[⚽🌟📊]/u.test(item)) &&
      brazilJapanResultBlock.storyItems[0].includes("Kaishu Sano punished Brazil in the 29th minute") &&
      brazilJapanResultBlock.storyItems[1].includes("Casemiro levelled at 56'") &&
      brazilJapanResultBlock.storyItems[1].includes("Gabriel Martinelli won it for Brazil at 90+5'") &&
      brazilJapanResultBlock.storyItems[2].includes(
        "Brazil's 2-1 comeback carried them into the round of 16 and eliminated Japan"
      ) &&
      brazilJapanResultBlock.storyItems.every((item) => !/chase the match/i.test(item)) &&
      brazilJapanResultBlock.storyLinkTexts.includes("Kaishu Sano") &&
      brazilJapanResultBlock.storyLinkTexts.includes("Casemiro") &&
      brazilJapanResultBlock.storyLinkTexts.includes("Gabriel Martinelli"),
    `Brazil-Japan result recap should render score, scorer timeline, official video, and plain story bullets. Measured ${JSON.stringify(brazilJapanResultBlock)}.`
  );
  const brazilJapanVideoTooltipContent = await brazilJapanRecapCheck.page
    .locator("#match-info .result-video-link")
    .evaluate((link) => getComputedStyle(link, "::after").content);
  assert(
    brazilJapanVideoTooltipContent.includes("Play highlights on YouTube"),
    `Brazil-Japan highlight button should expose the YouTube tooltip text. Measured content ${brazilJapanVideoTooltipContent}.`
  );
  await brazilJapanRecapCheck.page.locator('[data-match-id="match-75-round-of-32-2026-06-29"]').click();
  const netherlandsMoroccoShootoutBlock = await brazilJapanRecapCheck.page
    .locator("#match-info")
    .evaluate((root) => {
      const visibleText = (node) => {
        if (!node) {
          return "";
        }

        const clone = node.cloneNode(true);
        clone.querySelectorAll(".player-card").forEach((card) => card.remove());
        return clone.textContent.replace(/\s+/g, " ").trim();
      };
      const scoreSummary = root.querySelector(".result-score-summary");
      const rowScore = document
        .querySelector('[data-match-id="match-75-round-of-32-2026-06-29"] .match-score')
        ?.textContent.replace(/\s+/g, " ")
        .trim() || "";
      const storyItems = [...root.querySelectorAll(".result-story-highlights li")].map(visibleText);

      return {
        rowScore,
        scoreText: visibleText(scoreSummary),
        storyItems
      };
    });
  assert(
      netherlandsMoroccoShootoutBlock.rowScore === "1-1 (2-3 pens)" &&
      netherlandsMoroccoShootoutBlock.scoreText === "Morocco beat Netherlands on penalties after a 1-1 tie." &&
      netherlandsMoroccoShootoutBlock.storyItems.some((item) =>
        item.includes("Issa Diop answered in stoppage time to force extra time")
      ) &&
      netherlandsMoroccoShootoutBlock.storyItems.some((item) =>
        item.includes("Saibari converted the deciding penalty after five misses in the shootout")
      ),
    `Netherlands-Morocco should render the official shootout row and textured Result bullets. Measured ${JSON.stringify(netherlandsMoroccoShootoutBlock)}.`
  );
  await brazilJapanRecapCheck.context.close();

  const scheduledHighlightGuardCheck = await openPageAtTime(
    "2026-06-29T16:30:00.000Z",
    "/?view=matches&date=2026-06-29&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const fixture = data.fixtures.find((item) => item.id === "match-76-round-of-32-2026-06-29");
        fixture.status = "SCHEDULED";
        delete fixture.score;
        delete fixture.goalsHome;
        delete fixture.goalsAway;
      }
    }
  );
  await scheduledHighlightGuardCheck.page.locator('[data-match-id="match-76-round-of-32-2026-06-29"]').click();
  assert(
    (await scheduledHighlightGuardCheck.page.locator("#match-info .result-video-link").count()) === 0,
    "Scheduled fixtures should not render a highlight video button even when stale highlightVideo data is present."
  );
  await scheduledHighlightGuardCheck.context.close();

  await page.goto(`${baseUrl}?view=matches&date=2026-06-21&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="belgium-ir-iran-2026-06-21"]').click();
  const tielemansCard = page
    .locator("#match-info .key-info-team .player-hover")
    .filter({ has: page.locator(".player-link", { hasText: "Youri Tielemans" }) })
    .first()
    .locator(".player-card");
  assert(
    (await tielemansCard.locator(".player-card-name").innerText()).trim() === "Youri Tielemans" &&
      (await tielemansCard.locator(".player-card-number").innerText()).trim() === "#8",
    "Player hover card should show the country-team uniform number beside the name when available."
  );
  assert(
    (await tielemansCard.locator(".player-card-name-line .player-card-flag .flag").getAttribute("aria-label")) ===
      "Belgium flag",
    "Player hover card should show the player's country flag before the name."
  );
  const tielemansCardText = await tielemansCard.innerText();
  assert(
    tielemansCardText.includes("Value €30m (Prime €55m)") &&
      tielemansCardText.includes("At the 2026 World Cup"),
    "Current player cards should show Prime value and identify the 2026 World Cup snapshot."
  );
  const playerTournamentStatsCheck = await openPageAtTime(
    "2026-06-21T12:00:00.000Z",
    "/?view=matches&date=2026-06-21&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        for (const fixture of data.fixtures || []) {
          delete fixture.goalsHome;
          delete fixture.goalsAway;
        }

        const fixture = data.fixtures.find((item) => item.id === "belgium-ir-iran-2026-06-21");
        fixture.status = "FT";
        fixture.score = { home: 3, away: 0 };
        fixture.goalsHome = [
          { minute: 12, name: "Romelu Lukaku", assistName: "Leandro Trossard" },
          { minute: 44, name: "Romelu Lukaku" },
          { minute: 80, name: "Leandro Trossard", assistName: "Romelu Lukaku" }
        ];
        fixture.goalsAway = [];
      }
    }
  );
  await playerTournamentStatsCheck.page.locator('[data-match-id="belgium-ir-iran-2026-06-21"]').click();
  const syntheticLukakuCard = playerTournamentStatsCheck.page
    .locator("#match-info .scorer-highlight .player-hover")
    .filter({ has: playerTournamentStatsCheck.page.locator(".player-link", { hasText: "Romelu Lukaku" }) })
    .first()
    .locator(".player-card");
  const syntheticTielemansCard = playerTournamentStatsCheck.page
    .locator("#match-info .key-info-team .player-hover")
    .filter({ has: playerTournamentStatsCheck.page.locator(".player-link", { hasText: "Youri Tielemans" }) })
    .first()
    .locator(".player-card");
  assert(
    (await syntheticLukakuCard.locator(".player-card-tournament-stats").innerText()).trim() ===
      "This World Cup: 2 goals, 1 assist" &&
      (await syntheticTielemansCard.locator(".player-card-tournament-stats").count()) === 0,
    "Current player cards should omit the tournament stats row when both goals and assists are zero."
  );
  await playerTournamentStatsCheck.context.close();

  await page.goto(`${baseUrl}?view=matches&date=2026-06-20&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="tunisia-japan-2026-06-20"]').click();
  const japanTunisiaChineseInfo = await page.locator(".key-info-team").last().locator("p").innerText();
  assert(
    japanTunisiaChineseInfo.includes("伊东纯也") &&
      japanTunisiaChineseInfo.includes("阿奥·塔纳卡") &&
      japanTunisiaChineseInfo.includes("镰田大地") &&
      japanTunisiaChineseInfo.includes("日本采用3-4-3阵型") &&
      japanTunisiaChineseInfo.includes("首发布置使用") &&
      japanTunisiaChineseInfo.includes("突尼斯的右侧通道") &&
      japanTunisiaChineseInfo.includes("中路的首发结构") &&
      japanTunisiaChineseInfo.includes("双前锋身后"),
    `Chinese Japan key information should render the four model-backed slots and confirmed matchup facts against Tunisia. Measured ${JSON.stringify(japanTunisiaChineseInfo)}.`
  );
  assert(
    !/Takefusa Kubo|久保建英|Ayase Ueda|日本的基本思路是|最值得关注的是|重点看/.test(
      japanTunisiaChineseInfo
    ),
    "Chinese Japan key information should not fall back to the legacy template or absent-player copy."
  );
  const itoChineseLink = page.locator(".key-info-team").last().locator(".player-link", { hasText: "伊东纯也" }).first();
  assert(
    (await itoChineseLink.count()) === 1,
    "Chinese key information should link Junya Ito's localized name."
  );
  const itoChineseCard = page
    .locator("#match-info .key-info-team .player-hover")
    .filter({ has: page.locator(".player-link", { hasText: "伊东纯也" }) })
    .first()
    .locator(".player-card");
  assert(
    (await itoChineseCard.locator(".player-card-name").innerText()).trim() === "伊东纯也",
    "Chinese Junya Ito hover card should preserve the localized display name from the model-backed paragraph."
  );
  const chinesePlayerCardLocalizationLeaks = await page.evaluate(async () => {
    const hasLowercaseLatinWord = (value) => /[A-Za-zÀ-ÖØ-öø-ÿ][a-zà-öø-ÿ]{2,}/.test(String(value || ""));
    const hasUnlocalizedFallback = (value) => /俱乐部待译/.test(String(value || ""));
    const hooks = window.__worldCupTestHooks?.playerCards;
    if (
      typeof hooks?.getLocalizedPlayerPosition !== "function" ||
      typeof hooks?.getLocalizedPlayerClubLine !== "function"
    ) {
      return [{ player: "runtime", field: "helpers", value: "Player card localization helpers unavailable" }];
    }

    const profilesData = await fetch("data/player-profiles.json").then((response) => response.json());
    return Object.entries(profilesData.profiles || [])
      .flatMap(([profileName, profile]) => {
        const player = { name: profile.name || profileName, teamId: profile.teamId };
        return [
          { field: "position", value: hooks.getLocalizedPlayerPosition(player, profile) },
          { field: "club", value: hooks.getLocalizedPlayerClubLine(player, profile) }
        ]
          .filter((entry) => hasLowercaseLatinWord(entry.value) || hasUnlocalizedFallback(entry.value))
          .map((entry) => ({ player: profileName, ...entry }));
      })
      .slice(0, 20);
  });
  assert(
    chinesePlayerCardLocalizationLeaks.length === 0,
    `Chinese current player-card position and club lines should not leak English words. Leaks: ${JSON.stringify(chinesePlayerCardLocalizationLeaks)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-23&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="portugal-uzbekistan-2026-06-23"]').click();
  const portugalChineseScorerText = await page.locator("#match-info .scorer-highlight").innerText();
  assert(
    portugalChineseScorerText.includes("努诺·门德斯") &&
      portugalChineseScorerText.includes("阿卜杜沃希德·内马托夫") &&
      portugalChineseScorerText.includes("拉斐尔·莱奥") &&
      !/Nuno Mendes|Abduvohid Nematov|Rafael Le(?:ao|ão)/.test(portugalChineseScorerText),
    "Chinese Portugal scorer highlights should localize newly loaded scorer and own-goal names."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-26&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="norway-france-2026-06-26"]').click();
  const dembeleChineseLink = page
    .locator("#match-info .scorer-highlight .player-link", { hasText: "奥斯曼·登贝莱" })
    .first();
  const dembeleChineseCard = page
    .locator("#match-info .scorer-highlight .player-hover")
    .filter({ has: page.locator(".player-link", { hasText: "奥斯曼·登贝莱" }) })
    .first()
    .locator(".player-card");
  assert(
    (await dembeleChineseCard.locator(".player-card-position").innerText()).trim() === "前锋、右边锋" &&
      (await dembeleChineseCard.locator(".player-card-club").innerText()).trim() === "巴黎圣日耳曼（法甲）",
    "Chinese Ousmane Dembele scorer card should localize the compound position and club league."
  );
  const aasgaardChineseLink = page
    .locator("#match-info .scorer-highlight .player-link", { hasText: "泰洛·奥斯加德" })
    .first();
  const aasgaardChineseCard = page
    .locator("#match-info .scorer-highlight .player-hover")
    .filter({ has: page.locator(".player-link", { hasText: "泰洛·奥斯加德" }) })
    .first()
    .locator(".player-card");
  assert(
    (await aasgaardChineseCard.locator(".player-card-position").innerText()).trim() === "中场" &&
      (await aasgaardChineseCard.locator(".player-card-club").innerText()).trim() ===
        "格拉斯哥流浪者（苏格兰超级联赛）",
    "Chinese Thelo Aasgaard scorer card should localize Rangers and Scottish Premiership."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-25&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="japan-sweden-2026-06-25"]').click();
  const japanSwedenChineseInfo = await page.locator(".key-info-team").first().locator("p").innerText();
  assert(
    japanSwedenChineseInfo.includes("阿奥·塔纳卡") &&
      japanSwedenChineseInfo.includes("堂安律") &&
      japanSwedenChineseInfo.includes("前田大然") &&
      japanSwedenChineseInfo.includes("日本采用3-4-3阵型") &&
      japanSwedenChineseInfo.includes("首发布置使用") &&
      japanSwedenChineseInfo.includes("瑞典的左侧通道") &&
      japanSwedenChineseInfo.includes("边路通道的首发结构") &&
      japanSwedenChineseInfo.includes("锋线") &&
      japanSwedenChineseInfo.includes("3-4-3") &&
      !/Takefusa Kubo|Ritsu Doan|Daichi Kamada|Ayase Ueda/.test(japanSwedenChineseInfo),
    "Chinese Japan key information should render the four model-backed slots and confirmed matchup facts against Sweden."
  );

  const pendingH2hFixture = fixturesData.fixtures.find(
    (fixture) => fixture.h2h?.status === "research-pending" && fixture.h2h?.summary === "Past meetings not loaded yet."
  );
  if (pendingH2hFixture) {
    const pendingH2hDate = getDayKeyForTimeZone(pendingH2hFixture.kickoffUtc || pendingH2hFixture.date);
    await page.goto(`${baseUrl}?view=matches&date=${pendingH2hDate}&lang=zh&tz=America%2FLos_Angeles`, {
      waitUntil: "load"
    });
    await page.waitForSelector(`[data-match-id="${pendingH2hFixture.id}"]`);
    await page.locator(`[data-match-id="${pendingH2hFixture.id}"]`).click();
    await page.waitForSelector("#match-info .h2h-summary");
    const pendingH2hChineseSummary = (await page.locator("#match-info .h2h-summary").first().innerText()).trim();
    const pendingH2hChineseDetails = await page.locator("#match-info").innerText();
    assert(
      pendingH2hChineseSummary === "历史交锋尚未载入。" &&
        !/H2H research|Add API-backed|Past meetings unavailable|Past meetings not loaded yet/.test(pendingH2hChineseDetails),
      "Chinese pending H2H empty state should show concise localized not-loaded copy without internal research text."
    );
  }
  await page.goto(`${baseUrl}?view=matches&date=2026-06-29&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="match-76-round-of-32-2026-06-29"]').click();
  const brazilJapanChineseInfo = await page.locator(".key-info-team p").evaluateAll((nodes) =>
    nodes.map((node) => node.innerText)
  );
  const brazilChineseInfo = brazilJapanChineseInfo[0] || "";
  const japanBrazilChineseInfo = brazilJapanChineseInfo[1] || "";
  assert(
    brazilChineseInfo.includes("巴西") &&
      brazilChineseInfo.includes("日本") &&
      brazilChineseInfo.includes("巴西采用4-1-2-3阵型") &&
      brazilChineseInfo.includes("首发布置使用") &&
      brazilChineseInfo.includes("日本的右侧通道") &&
      brazilChineseInfo.includes("边路通道的首发结构") &&
      !brazilChineseInfo.includes("内马尔") &&
      !/球队特点|风格关键词|基本思路|最值得关注|重点看|They want|the risk is|Neymar has returned|Vinicius isolated|[A-Za-z]{3,}/.test(brazilChineseInfo),
    `Chinese Brazil key information should use the starters named in the match-specific brief, not a stale bench-based key-player list. Measured ${JSON.stringify(brazilChineseInfo)}.`
  );
  assert(
    japanBrazilChineseInfo.includes("日本") &&
      japanBrazilChineseInfo.includes("巴西") &&
      japanBrazilChineseInfo.includes("日本采用3-4-3阵型") &&
      japanBrazilChineseInfo.includes("首发布置使用") &&
      japanBrazilChineseInfo.includes("巴西的右侧通道") &&
      japanBrazilChineseInfo.includes("边路通道的首发结构") &&
      !japanBrazilChineseInfo.includes("久保") &&
      !/球队特点|风格关键词|基本思路|最值得关注|重点看|They want|the risk is|Kubo could play|Brazil breaking|[A-Za-z]{3,}/.test(japanBrazilChineseInfo),
    `Chinese Japan key information should use the starters named in the match-specific brief, not a stale bench-based key-player list. Measured ${JSON.stringify(japanBrazilChineseInfo)}.`
  );
  const chineseKeyInformationCoverageIssues = await page.evaluate(async () => {
    const localizationHooks = window.__worldCupTestHooks?.localization;
    const formatStructuredPreview = localizationHooks?.formatStructuredKeyInformation;
    const getLocalizedTeamName = localizationHooks?.getLocalizedTeamName;
    if (typeof formatStructuredPreview !== "function" || typeof getLocalizedTeamName !== "function") {
      return [{ fixtureId: "test-hooks", side: "all", issue: "missing localization test hook" }];
    }

    const [fixturesData, teamsData] = await Promise.all([
      fetch(`data/fixtures.json?coverage=${Date.now()}`).then((response) => response.json()),
      fetch(`data/teams.json?coverage=${Date.now()}`).then((response) => response.json())
    ]);
    const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
    const hasLatinLeak = (value) =>
      /\p{Script=Latin}[\p{Script=Latin}'-]{2,}/u.test(
        String(value || "").replace(/\bFIFA\b/g, "")
      );
    const issues = [];

    for (const fixture of fixturesData.fixtures || []) {
      if (!fixture.homeTeamId || !fixture.awayTeamId || !fixture.keyInformation) {
        continue;
      }

      for (const side of ["home", "away"]) {
        const source = fixture.keyInformation?.[side];
        const model = fixture.keyInformation?.localeModel?.[side];
        if (!source || !model) {
          issues.push({ fixtureId: fixture.id, side, issue: "missing-source-or-model" });
          continue;
        }

        const teamId = side === "home" ? fixture.homeTeamId : fixture.awayTeamId;
        const opponentId = side === "home" ? fixture.awayTeamId : fixture.homeTeamId;
        const team = teamsById.get(teamId);
        const opponent = teamsById.get(opponentId);
        const translated = team && opponent
          ? formatStructuredPreview(model, team, opponent)
          : "";
        const localizedTeamName = team ? getLocalizedTeamName(team) : "";
        const localizedOpponentName = opponent ? getLocalizedTeamName(opponent) : "";
        const identityFormation = model.slots?.identity?.formation || "__missing-formation__";
        const sentenceCount = (translated.match(/[。！？]/g) || []).length;
        const stale =
          !translated ||
          translated === source ||
          sentenceCount !== 4 ||
          !translated.includes(localizedTeamName) ||
          !translated.includes(localizedOpponentName) ||
          !translated.includes(identityFormation) ||
          !translated.includes("阵型") ||
          !translated.includes("首发布置") ||
          !translated.includes("首发结构") ||
          /Against |They want|The risk is|has to beat|led by|main names to track|key information|球队特点|风格关键词/i.test(translated);

        if (stale || hasLatinLeak(translated)) {
          issues.push({
            fixtureId: fixture.id,
            side,
            issue: stale ? "stale-or-fallback" : "latin-leak",
            translated
          });
        }
      }
    }

    return issues.slice(0, 8);
  });
  assert(
    chineseKeyInformationCoverageIssues.length === 0,
    `All current Chinese key-information paragraphs should render through the structured bilingual template without stale English. Issues: ${JSON.stringify(chineseKeyInformationCoverageIssues)}.`
  );
  const chineseResultBulletCoverageIssues = await page.evaluate(async () => {
    const translateTextToZh = window.__worldCupTestHooks?.localization?.translateTextToZh;
    const getResultHighlights = window.__worldCupTestHooks?.localization?.getResultHighlights;
    if (typeof translateTextToZh !== "function" || typeof getResultHighlights !== "function") {
      return [{ file: "test-hooks", fixtureId: "all", field: "all", issue: "missing localization test hook" }];
    }

    const staleEnglishGrammarPattern =
      /\b(?:won\s+(?:the|on|after)|survived|shootout|after|draw|stayed|scoreless|penalties|eventually|forced|gave|reply|winner|settled|kept|pulled|chase|match|through|goal|point|teams?|Group|Round|lifted|title|level|unresolved)\b/i;
    const allowedLatinTerms = new Set(["AFC", "CAF", "CONCACAF", "CONMEBOL", "FIFA", "FOX", "GD", "UEFA", "USA", "VAR"]);
    const getLatinLeaks = (value) =>
      [...String(value || "").matchAll(/\p{Script=Latin}[\p{Script=Latin}'-]{2,}/gu)]
        .map((match) => match[0])
        .filter((term) => !allowedLatinTerms.has(term.toUpperCase()));
    const issues = [];

    for (const file of ["data/fixtures.json", "data/history.json"]) {
      const response = await fetch(`${file}?resultZhCoverage=${Date.now()}`);
      const data = await response.json();

      for (const fixture of data.fixtures || []) {
        if (file === "data/fixtures.json" && Array.isArray(fixture.resultStoryBulletsZh)) {
          const selected = getResultHighlights(fixture);
          if (JSON.stringify(selected) !== JSON.stringify(fixture.resultStoryBulletsZh)) {
            issues.push({
              file,
              fixtureId: fixture.id,
              field: "resultStoryBulletsZh",
              issue: "authored-zh-not-selected"
            });
          }
        }

        for (const field of ["resultStoryBullets", "resultHighlights"]) {
          if (
            file === "data/fixtures.json" &&
            field === "resultStoryBullets" &&
            Array.isArray(fixture.resultStoryBulletsZh) &&
            fixture.resultStoryBulletsZh.length
          ) {
            continue;
          }
          for (const [index, source] of (fixture[field] || []).entries()) {
            if (typeof source !== "string" || !/[A-Za-z]/.test(source)) {
              continue;
            }

            const translated = translateTextToZh(source).trim();
            const latinLeaks = getLatinLeaks(translated);
            if (translated === source || staleEnglishGrammarPattern.test(translated) || latinLeaks.length) {
              issues.push({
                file,
                fixtureId: fixture.id,
                field,
                index,
                latinLeaks,
                source,
                translated
              });
            }
          }
        }
      }
    }

    return issues.slice(0, 12);
  });
  assert(
    chineseResultBulletCoverageIssues.length === 0,
    `Chinese result bullet translation should cover current and historical story bullets without stale English grammar. Issues: ${JSON.stringify(chineseResultBulletCoverageIssues)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-07-04&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="match-90-round-of-16-2026-07-04"]');
  await page.locator('[data-match-id="match-90-round-of-16-2026-07-04"]').click();
  const moroccoCanadaRenderedStories = await page
    .locator("#match-info .result-story-highlights li")
    .evaluateAll((items) => items.map((item) => item.innerText.replace(/\s+/g, " ").trim()));
  assert(
    moroccoCanadaRenderedStories.some((story) => story.includes("90+8分钟")) &&
      !moroccoCanadaRenderedStories.some((story) => /加时\s*8\s*分钟/.test(story)),
    `The complete Chinese Morocco-Canada card should keep 90+8 as stoppage time, not extra time. Measured ${JSON.stringify(moroccoCanadaRenderedStories)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-07-11&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="match-99-quarter-final-2026-07-11"]');
  const norwayEnglandAccessibleRow = await page
    .locator('[data-match-id="match-99-quarter-final-2026-07-11"]')
    .evaluate((row) => ({
      controls: row.querySelector(".match-row-trigger")?.getAttribute("aria-controls") || "",
      label: row.getAttribute("aria-label") || ""
    }));
  assert(
    norwayEnglandAccessibleRow.controls === "match-info" &&
      norwayEnglandAccessibleRow.label.startsWith("全场结束, 挪威 对 英格兰") &&
      norwayEnglandAccessibleRow.label.includes("四分之一决赛") &&
      norwayEnglandAccessibleRow.label.includes("英格兰获胜"),
    `Chinese completed-match labels should announce status, stage, score context, and outcome without changing visible copy. Measured ${JSON.stringify(norwayEnglandAccessibleRow)}.`
  );
  await page.locator('[data-match-id="match-99-quarter-final-2026-07-11"]').click();
  const norwayEnglandRenderedCard = await page.locator("#match-info").evaluate((card) => ({
    stories: [...card.querySelectorAll(".result-story-highlights li")]
      .map((item) => item.innerText.replace(/\s+/g, " ").trim()),
    text: card.innerText.replace(/\s+/g, " ").trim()
  }));
  const bellinghamRenderedCard = page
    .locator("#match-info .player-hover")
    .filter({ has: page.locator('.player-link', { hasText: "裘德·贝林厄姆" }) })
    .first()
    .locator(".player-card");
  const bellinghamRenderedText = (await bellinghamRenderedCard.innerText()).replace(/\s+/g, " ").trim();
  assert(
    JSON.stringify(norwayEnglandRenderedCard.stories) === JSON.stringify([
      "施耶尔德鲁普第36分钟让挪威领先，但裘德·贝林厄姆半场前扳平，英格兰撑过了紧张的上半场。",
      "挪威下半场一粒进球因哈兰德犯规被判无效，随后还曾击中横梁，比赛以1比1进入加时。",
      "裘德·贝林厄姆加时赛开局再度破门完成梅开二度，英格兰2比1晋级并将在半决赛对阵阿根廷。"
    ]) &&
      norwayEnglandRenderedCard.text.includes("加时赛") &&
      !/Bellingham|after extra time|England survived|Norway had a second-half goal/i.test(norwayEnglandRenderedCard.text),
    `The complete Chinese Norway-England card should render the authored resultStoryBulletsZh exactly. Measured ${JSON.stringify(norwayEnglandRenderedCard)}.`
  );
  assert(
    bellinghamRenderedText.includes("裘德·贝林厄姆") &&
      bellinghamRenderedText.includes("中场") &&
      bellinghamRenderedText.includes("皇家马德里（西甲）") &&
      bellinghamRenderedText.includes("23岁") &&
      bellinghamRenderedText.includes("稍晚进入禁区") &&
      !/Jude|Midfielder|Real Madrid|La Liga|Age/.test(bellinghamRenderedText),
    `The complete Chinese Bellingham card should localize its identity, role, club, age, and note. Measured ${bellinghamRenderedText}.`
  );

  await page.locator('[data-match-id="match-100-quarter-final-2026-07-11"]').click();
  await page.waitForFunction(() => {
    const row = document.querySelector('[data-match-id="match-100-quarter-final-2026-07-11"]');
    const stories = [...document.querySelectorAll("#match-info .result-story-highlights li")]
      .map((item) => item.innerText.replace(/\s+/g, " ").trim());

    return row?.classList.contains("is-selected") &&
      stories[0] === "麦卡利斯特开场阶段接梅西角球头球破门，阿根廷取得控制权，但瑞士随后把四分之一决赛拖进硬仗。";
  });
  const argentinaSwitzerlandRenderedStories = await page
    .locator("#match-info .result-story-highlights li")
    .evaluateAll((items) => items.map((item) => item.innerText.replace(/\s+/g, " ").trim()));
  const emboloRenderedCard = page
    .locator("#match-info .player-hover")
    .filter({ has: page.locator('.player-link', { hasText: "恩博洛" }) })
    .first()
    .locator(".player-card");
  const emboloRenderedText = (await emboloRenderedCard.innerText()).replace(/\s+/g, " ").trim();
  assert(
    JSON.stringify(argentinaSwitzerlandRenderedStories) === JSON.stringify([
      "麦卡利斯特开场阶段接梅西角球头球破门，阿根廷取得控制权，但瑞士随后把四分之一决赛拖进硬仗。",
      "恩多耶第67分钟为瑞士扳平，不过恩博洛第二张黄牌离场，让瑞士只能十人守住1比1。",
      "阿尔瓦雷斯第112分钟弧线球帮助阿根廷再度领先，劳塔罗·马丁内斯尾声锁定胜局，半决赛将对阵英格兰。"
    ]),
    `The complete Chinese Argentina-Switzerland card should use its authored result story and canonical player spellings. Measured ${JSON.stringify(argentinaSwitzerlandRenderedStories)}.`
  );
  assert(
    emboloRenderedText.includes("布雷尔·恩博洛") &&
      emboloRenderedText.includes("前锋") &&
      emboloRenderedText.includes("雷恩（法甲）") &&
      emboloRenderedText.includes("29岁") &&
      emboloRenderedText.includes("让队友下一步处理更轻松") &&
      !/Breel|Forward|Rennes|Ligue|Age|安博洛/.test(emboloRenderedText),
    `The complete Chinese Embolo card should keep one canonical name and localize every detail. Measured ${emboloRenderedText}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-11&lang=en&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="mexico-south-africa-2026-06-11"]').click();
  const mexicoParagraphLinks = await page
    .locator(".key-info-team")
    .last()
    .locator("p .player-link")
    .evaluateAll((links) => links.map((link) => link.textContent.trim()));
  const normalizedMexicoParagraphLinks = mexicoParagraphLinks.map((text) =>
    text.normalize("NFD").replace(/\p{Diacritic}/gu, "")
  );
  assert(
    normalizedMexicoParagraphLinks.some((text) => text.includes("Raul Jimenez")) &&
      normalizedMexicoParagraphLinks.some((text) => text.includes("Julian Quinones")),
    "Mexico's accented player aliases should link from the matchup paragraph."
  );
  const jimenezLink = page
    .locator(".key-info-team")
    .last()
    .locator("p .player-link", { hasText: /^Ra[uú]l Jim[eé]nez$/ })
    .first();
  const jimenezCard = page
    .locator("#match-info .key-info-team .player-hover")
    .filter({ has: page.locator(".player-link", { hasText: /^Ra[uú]l Jim[eé]nez$/ }) })
    .first()
    .locator(".player-card");
  await page.waitForFunction(() =>
    [...document.querySelectorAll("#match-info .key-info-team p .player-link")].some(
      (link) =>
        /^Ra[uú]l Jim[eé]nez$/.test(link.textContent?.trim() || "") &&
        link.getAttribute("aria-label")?.startsWith("Raúl Jiménez:")
    )
  );
  assert(
    (await jimenezLink.getAttribute("aria-label"))?.startsWith("Raúl Jiménez:"),
    "Mexico's unaccented Raul Jimenez paragraph alias should open Raúl Jiménez's hover card."
  );
  assert(
    (await jimenezCard.locator(".player-card-name").innerText()).trim() === "Raúl Jiménez" &&
      (await jimenezCard.locator(".player-card-position").innerText()).trim() === "Striker",
    "Player hover card should show the display name above the position."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-26&lang=en&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="cabo-verde-saudi-arabia-2026-06-26"]').click();
  assert(
    (await page.locator("#match-info .standings-table .rank-pill").count()) >= 4,
    "Current match detail group standings should show FIFA ranking pills."
  );
  const expectedGroupHThirdPlaceCandidate = getExpectedThirdPlaceRaceRows().find(
    (candidate) => candidate.groupId === "H"
  );
  const matchInfoThirdPlacePill = page.locator("#match-info .third-place-pill").first();
  assert(
    expectedGroupHThirdPlaceCandidate &&
      (await matchInfoThirdPlacePill.getAttribute("data-tooltip")) ===
        getExpectedThirdPlaceStandingBadgeReason(expectedGroupHThirdPlaceCandidate),
    "Home match detail third-place race pills should explain whether the team is advancing or not advancing."
  );
  const matchInfoRankPill = page.locator("#match-info .standings-table .rank-pill").first();
  assert(
    (await matchInfoRankPill.getAttribute("data-tooltip")) ===
      "FIFA world ranking during the 2026 World Cup" &&
      (await matchInfoRankPill.getAttribute("aria-label"))?.includes(
        "FIFA world ranking during the 2026 World Cup"
      ),
    "FIFA ranking pills should explain the ranking source on hover and focus."
  );
  const matchInfoRankTooltipContent = await matchInfoRankPill.evaluate(
    (pill) => getComputedStyle(pill, "::after").content
  );
  assert(
    matchInfoRankTooltipContent.includes("FIFA world ranking during the 2026 World Cup"),
    `FIFA ranking pills should expose the ranking source tooltip text. Measured content ${matchInfoRankTooltipContent}.`
  );
  const originalTooltipTheme = await page.evaluate(() => document.documentElement.dataset.theme || "");
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.querySelector("#match-info .standings-table .rank-pill")?.classList.add("is-touch-tooltip-open");
  });
  await page.waitForFunction(() => {
    const sourceTooltip = document.querySelector("#source-note .source-tooltip");
    const releaseTooltip = document.querySelector("#source-note .release-tooltip");
    return (
      sourceTooltip &&
      releaseTooltip &&
      getComputedStyle(sourceTooltip).backgroundColor === "rgb(26, 30, 36)" &&
      getComputedStyle(releaseTooltip).backgroundColor === "rgb(26, 30, 36)"
    );
  });
  const darkTooltipSurfaceState = await page.evaluate(() => {
    const rankPill = document.querySelector("#match-info .standings-table .rank-pill");
    const rankTooltipStyle = rankPill ? getComputedStyle(rankPill, "::after") : null;
    const sourceTooltip = document.querySelector("#source-note .source-tooltip");
    const releaseTooltip = document.querySelector("#source-note .release-tooltip");
    const playerCard = document.querySelector("#match-info .player-card");

    return {
      playerCardBackground: playerCard ? getComputedStyle(playerCard).backgroundColor : "",
      rankHostOpacity: rankPill ? getComputedStyle(rankPill).opacity : "",
      rankTooltipBackground: rankTooltipStyle?.backgroundColor || "",
      rankTooltipOpacity: rankTooltipStyle?.opacity || "",
      releaseTooltipBackground: releaseTooltip ? getComputedStyle(releaseTooltip).backgroundColor : "",
      sourceTooltipBackground: sourceTooltip ? getComputedStyle(sourceTooltip).backgroundColor : ""
    };
  });
  assert(
    darkTooltipSurfaceState.rankHostOpacity === "1" &&
      darkTooltipSurfaceState.rankTooltipOpacity === "1" &&
      darkTooltipSurfaceState.rankTooltipBackground === "rgb(39, 45, 54)" &&
      darkTooltipSurfaceState.sourceTooltipBackground === "rgb(26, 30, 36)" &&
      darkTooltipSurfaceState.releaseTooltipBackground === "rgb(26, 30, 36)" &&
      darkTooltipSurfaceState.playerCardBackground === "rgb(26, 30, 36)",
    `Dark-mode tooltip surfaces should remain fully opaque even when their trigger is normally muted. Measured ${JSON.stringify(darkTooltipSurfaceState)}.`
  );
  await page.evaluate((theme) => {
    const rankPill = document.querySelector("#match-info .standings-table .rank-pill");
    rankPill?.classList.remove("is-touch-tooltip-open");
    if (theme) {
      document.documentElement.dataset.theme = theme;
    } else {
      delete document.documentElement.dataset.theme;
    }
  }, originalTooltipTheme);
  await page.goto(`${baseUrl}?view=matches&date=2026-06-29&lang=en&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="match-76-round-of-32-2026-06-29"]');
  await page.locator('[data-match-id="match-76-round-of-32-2026-06-29"]').click();
  const casemiroLink = page.locator(".key-info-team .player-link", { hasText: "Casemiro" }).first();
  assert(
    (await casemiroLink.count()) === 1,
    "Single-name player aliases should link from key information."
  );
  const casemiroCard = page
    .locator("#match-info .key-info-team .player-hover")
    .filter({ has: page.locator(".player-link", { hasText: "Casemiro" }) })
    .first()
    .locator(".player-card");
  assert(
    (await casemiroCard.locator(".player-photo img, .player-photo-fallback").count()) >= 1,
    "Single-name player hover cards should include a face or initials fallback."
  );

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-28&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="match-73-round-of-32-2026-06-28"]').click();
  const roundOf32DetailText = normalizeFlaggedText(await page.locator("#match-info").innerText());
  assert(
    roundOf32DetailText.includes("Previous: Group round") &&
      roundOf32DetailText.includes("South Africa won 1-0 against South Korea #25, tied 1-1 against Czechia #40, and lost 0-2 to Mexico #14") &&
      roundOf32DetailText.includes("Canada won 6-0 against Qatar #56, tied 1-1 against Bosnia and Herzegovina #64, and lost 1-2 to Switzerland #19") &&
      !roundOf32DetailText.includes("Mexico #14.") &&
      !roundOf32DetailText.includes("Switzerland #19.") &&
      roundOf32DetailText.includes("Next: Round of 16") &&
      /Winner will face Morocco #\d+ who won 3-2 on penalties after a 1-1 tie against Netherlands #\d+(?!\.)/.test(
        roundOf32DetailText
      ) &&
      !roundOf32DetailText.includes("Winner will face winner of Netherlands") &&
      roundOf32DetailText.includes("Prediction") &&
      roundOf32DetailText.includes("Key information") &&
      roundOf32DetailText.includes("Past matches") &&
      !roundOf32DetailText.includes("bracket details are not loaded yet"),
    "Round of 32 match detail should summarize group-round form with opponent rankings and the next winner path before normal prediction/context blocks."
  );
  const roundOf32ContextMetrics = await page.locator("#match-info").evaluate((info) => ({
    contextFlags: info.querySelectorAll(".knockout-context-team-flag .flag").length,
    subjectRankCount: info.querySelectorAll(".knockout-context-list .knockout-context-team.is-subject .rank-pill")
      .length,
    groupRoundRanks: [...info.querySelectorAll(".knockout-context-list .rank-pill")].map((pill) =>
      pill.textContent.trim()
    ),
    nextPathRanks: [...info.querySelectorAll(".knockout-next-line .rank-pill")].map((pill) =>
      pill.textContent.trim()
    ),
    nextPathSubjectNames: [
      ...info.querySelectorAll(".knockout-next-line .knockout-context-team.is-subject .knockout-context-team-name")
    ].map((name) => name.textContent.trim()),
    rankHeights: [...info.querySelectorAll(".knockout-context-list .rank-pill, .knockout-next-line .rank-pill")].map(
      (pill) => pill.getBoundingClientRect().height
    ),
    rankCenterDeltas: [...info.querySelectorAll(".knockout-context-list .knockout-context-team")]
      .map((team) => {
        const name = team.querySelector(".knockout-context-team-name");
        const rank = team.querySelector(".rank-pill");

        if (!name || !rank) {
          return null;
        }

        const textNode = [...name.childNodes].find(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
        );
        const text = textNode?.textContent || "";
        const textEnd = text.search(/\s*$/);
        const textStart = text.slice(0, textEnd).search(/\S+$/);
        const range = document.createRange();

        if (textNode && textStart >= 0 && textEnd > textStart) {
          range.setStart(textNode, textStart);
          range.setEnd(textNode, textEnd);
        } else {
          range.selectNodeContents(name);
        }

        const nameRect = range.getBoundingClientRect();
        const rankRect = rank.getBoundingClientRect();

        return Math.abs(rankRect.top + rankRect.height / 2 - (nameRect.top + nameRect.height / 2));
      })
      .filter((delta) => Number.isFinite(delta)),
    rankHorizontalGaps: [...info.querySelectorAll(".knockout-context-list .knockout-context-team")]
      .map((team) => {
        const name = team.querySelector(".knockout-context-team-name");
        const rank = team.querySelector(".rank-pill");
        const nextTextNode =
          team.nextSibling?.nodeType === Node.TEXT_NODE && team.nextSibling.textContent.trim()
            ? team.nextSibling
            : null;

        if (!name || !rank || !nextTextNode) {
          return null;
        }

        const nextCharIndex = nextTextNode.textContent.search(/\S/);

        if (nextCharIndex < 0) {
          return null;
        }

        const nextTextRange = document.createRange();
        nextTextRange.setStart(nextTextNode, nextCharIndex);
        nextTextRange.setEnd(nextTextNode, nextCharIndex + 1);

        const nameRect = name.getBoundingClientRect();
        const rankRect = rank.getBoundingClientRect();
        const nextTextRect = nextTextRange.getBoundingClientRect();

        return {
          nameToRank: rankRect.left - nameRect.right,
          rankToNextText: nextTextRect.left - rankRect.right,
          nextText: nextTextNode.textContent.trim().slice(0, 1)
        };
      })
      .filter(Boolean)
  }));
  assert(
    roundOf32ContextMetrics.contextFlags === 0 &&
      roundOf32ContextMetrics.subjectRankCount === 0 &&
      ["#25", "#40", "#14", "#56", "#64", "#19"].every((rank) =>
        roundOf32ContextMetrics.groupRoundRanks.includes(rank)
      ) &&
      roundOf32ContextMetrics.nextPathRanks.includes("#7") &&
      roundOf32ContextMetrics.nextPathRanks.includes("#8") &&
      roundOf32ContextMetrics.nextPathSubjectNames.length === 1 &&
      roundOf32ContextMetrics.nextPathSubjectNames.includes("Morocco") &&
      roundOf32ContextMetrics.rankHeights.every((height) => height <= 15.5) &&
      roundOf32ContextMetrics.rankCenterDeltas.length >= 6 &&
      roundOf32ContextMetrics.rankCenterDeltas.every((delta) => delta <= 1) &&
      roundOf32ContextMetrics.rankHorizontalGaps.length >= 4 &&
      roundOf32ContextMetrics.rankHorizontalGaps.every(
        (gap) =>
          gap.nameToRank >= 2.5 &&
          gap.nameToRank <= 4.5 &&
          gap.rankToNextText >= 2.75 &&
          gap.rankToNextText <= 3.75 &&
          Math.abs(gap.nameToRank - gap.rankToNextText) <= 0.75
      ),
    `Round of 32 match detail should use compact ranking pills without context flags or subject-team ranks. Measured ${JSON.stringify(roundOf32ContextMetrics)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-07-02&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="match-85-round-of-32-2026-07-02"]');
  await page.locator('[data-match-id="match-85-round-of-32-2026-07-02"]').click();
  const switzerlandAlgeriaDetailText = normalizeFlaggedText(await page.locator("#match-info").innerText());
  const switzerlandAlgeriaContextLines = await page
    .locator("#match-info .knockout-context-list li")
    .evaluateAll((items) => items.map((item) => item.textContent.replace(/\s+/g, " ").trim()));
  const switzerlandAlgeriaNextText = await page
    .locator("#match-info .knockout-next-line")
    .evaluate((line) => line.textContent.replace(/\s+/g, " ").trim());
  assert(
    switzerlandAlgeriaDetailText.includes("Previous: Group round") &&
      switzerlandAlgeriaContextLines.includes(
        "Switzerland won 4-1 against Bosnia and Herzegovina #64 and 2-1 against Canada #30 and tied 1-1 against Qatar #56 See all"
      ) &&
      switzerlandAlgeriaContextLines.includes(
        "Algeria won 2-1 against Jordan #63, tied 3-3 against Austria #24, and lost 0-3 to Argentina #1 See all"
      ) &&
      switzerlandAlgeriaDetailText.includes("Next: Round of 16") &&
      /^Winner will face(?:\s+(winner of Colombia #13 vs Ghana #73|Colombia #13 who (?:won|lost).+against Ghana #73 See all))$/.test(
        switzerlandAlgeriaNextText
      ),
    `Switzerland-Algeria context should support current expected opponent-copy formats while preserving ranked opponent copy. Measured ${JSON.stringify({
      switzerlandAlgeriaContextLines,
      switzerlandAlgeriaNextText
    })}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-29&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.waitForSelector(".yesterday-section");
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 700, height: 720 },
    { width: 390, height: 844 },
    { width: 280, height: 760 }
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(80);
    const singlePast24Layout = await page.locator(".yesterday-section").evaluate((section) => {
      const grid = section.querySelector(".yesterday-match-grid");
      const card = grid?.querySelector(".yesterday-match-card");
      const gridRect = grid?.getBoundingClientRect();
      const cardRect = card?.getBoundingClientRect();

      return {
        cardCount: grid?.querySelectorAll(".yesterday-match-card").length || 0,
        cardLeftGap: gridRect && cardRect ? Math.round(cardRect.left - gridRect.left) : null,
        cardRightGap: gridRect && cardRect ? Math.round(gridRect.right - cardRect.right) : null,
        cardWidth: cardRect ? Math.round(cardRect.width) : null,
        gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns : "",
        gridScrollOverflow: grid ? grid.scrollWidth - grid.clientWidth : 0,
        gridWidth: gridRect ? Math.round(gridRect.width) : null,
        hasSingleMatchClass: grid?.classList.contains("has-single-match") || false,
        sectionScrollOverflow: section.scrollWidth - section.clientWidth
      };
    });
    assert(
      singlePast24Layout.cardCount === 1 &&
        singlePast24Layout.hasSingleMatchClass &&
        singlePast24Layout.cardLeftGap === 0 &&
        Math.abs(singlePast24Layout.cardRightGap) <= 1 &&
        singlePast24Layout.gridScrollOverflow <= 1 &&
        singlePast24Layout.sectionScrollOverflow <= 1,
      `A single Recent matches card should span the full available row at ${viewport.width}px. Measured ${JSON.stringify(singlePast24Layout)}.`
    );
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator('[data-match-id="match-76-round-of-32-2026-06-29"]').click();
  const unconfirmedRoundOf32DetailText = normalizeFlaggedText(await page.locator("#match-info").innerText());
  assert(
    unconfirmedRoundOf32DetailText.includes("Brazil won 3-0 against Haiti #83 and 3-0 against Scotland #42 and tied 1-1 against Morocco #7") &&
      unconfirmedRoundOf32DetailText.includes("Japan won 4-0 against Tunisia #45 and tied 2-2 against Netherlands #8 and 1-1 against Sweden #38") &&
      !unconfirmedRoundOf32DetailText.includes("Morocco #7.") &&
      !unconfirmedRoundOf32DetailText.includes("Sweden #38.") &&
      !unconfirmedRoundOf32DetailText.includes("Group F runner-up is not confirmed yet."),
    "Round of 32 match detail should summarize both teams once the opponent slot is locked."
  );

  const stackedPast24Check = await openPageAtTime(
    "2026-06-30T16:31:00.000Z",
    "/?view=matches&date=2026-06-30&tz=America%2FLos_Angeles"
  );
  await stackedPast24Check.page.setViewportSize({ width: 1280, height: 720 });
  await stackedPast24Check.page.waitForSelector(".yesterday-section .yesterday-match-card");
  const stackedPast24Layout = await stackedPast24Check.page.locator(".yesterday-section").evaluate((section) => {
    const grid = section.querySelector(".yesterday-match-grid");
    const gridRect = grid?.getBoundingClientRect();
    const cardRects = Array.from(grid?.querySelectorAll(".yesterday-match-card") || []).map((card) => {
      const rect = card.getBoundingClientRect();
      return {
        leftGap: gridRect ? Math.round(rect.left - gridRect.left) : null,
        rightGap: gridRect ? Math.round(gridRect.right - rect.right) : null,
        top: Math.round(rect.top),
        width: Math.round(rect.width)
      };
    });

    return {
      cardCount: cardRects.length,
      cardRects,
      gridScrollOverflow: grid ? grid.scrollWidth - grid.clientWidth : 0,
      gridWidth: gridRect ? Math.round(gridRect.width) : null,
      sectionScrollOverflow: section.scrollWidth - section.clientWidth
    };
  });
  assert(
    stackedPast24Layout.cardCount >= 3 &&
      stackedPast24Layout.cardRects.every(
        (rect) => Math.abs(rect.leftGap) <= 1 && Math.abs(rect.rightGap) <= 1 && rect.width === stackedPast24Layout.gridWidth
      ) &&
      new Set(stackedPast24Layout.cardRects.map((rect) => rect.top)).size === stackedPast24Layout.cardCount &&
      stackedPast24Layout.gridScrollOverflow <= 1 &&
      stackedPast24Layout.sectionScrollOverflow <= 1,
    `Multiple Recent matches cards should stay stacked in one full-width column. Measured ${JSON.stringify(stackedPast24Layout)}.`
  );
  await stackedPast24Check.context.close();

  await page.goto(`${baseUrl}?view=matches&date=2026-06-30&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="match-78-round-of-32-2026-06-30"]');
  await page.locator('[data-match-id="match-78-round-of-32-2026-06-30"]').click();
  const norwayRoundOf32DetailText = normalizeFlaggedText(await page.locator("#match-info").innerText());
  assert(
    norwayRoundOf32DetailText.includes("Next: Round of 16") &&
      norwayRoundOf32DetailText.includes("Winner will face Brazil #6 who won 2-1 against Japan #18") &&
      !norwayRoundOf32DetailText.includes("Japan #18."),
    "Round of 32 normal-score next path should show ranking pills for both the winning opponent and defeated team."
  );
  const norwayNextSearchAction = page.locator(
    '#match-info .knockout-next-line .knockout-context-search-action[data-team-search-query="Brazil"]'
  );
  assert(
    (await norwayNextSearchAction.count()) === 1 &&
      (await norwayNextSearchAction.innerText()).trim() === "See all",
    "Resolved next-path winners should show one inline See all action for the opponent winner."
  );
  await norwayNextSearchAction.click();
  await page.waitForFunction(() => new URL(location.href).searchParams.get("team") === "Brazil");
  assert(
    (await page.locator("#team-search-input").inputValue()) === "Brazil" &&
      (await page.locator(".team-search-summary h2").innerText()).trim() === "Brazil",
    "Clicking a next-path See all action should open the same country search as typing the winner name."
  );
  await page.goBack();
  await page.waitForFunction(
    () =>
      !new URL(location.href).searchParams.has("team") &&
      document.querySelector("#team-search-input")?.value === "" &&
      !document.querySelector("#team-search")?.classList.contains("has-value")
  );
  assert(
    (await page.locator("#team-search-input").inputValue()) === "",
    "Browser Back after a See all country search should clear the visible search value."
  );
  await page.goForward();
  await page.waitForFunction(
    () =>
      new URL(location.href).searchParams.get("team") === "Brazil" &&
      document.querySelector("#team-search-input")?.value === "Brazil"
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-07-07&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  const roundOf16ProjectedRowText = normalizeFlaggedText(
    await page.locator('[data-match-id="match-96-round-of-16-2026-07-07"]').innerText()
  );
  await page.locator('[data-match-id="match-96-round-of-16-2026-07-07"]').click();
  const roundOf16DetailText = normalizeFlaggedText(await page.locator("#match-info").innerText());
  const roundOf16SourceStatusReady =
    /\bis (?:scheduled|live at \d+-\d+|predicted)\b/.test(roundOf16DetailText) ||
    /\b(?:beat|tied) [^.]+ \d+-\d+\b/.test(roundOf16DetailText);
  const roundOf16MatchupStateReady =
    roundOf16DetailText.includes("Predicted matchup; participants come from current knockout-path estimates.") ||
    /Round of 16 .+#\d+ vs .+#\d+/.test(roundOf16DetailText);
  const roundOf16NextPathReady =
    /Winner will face winner of [^#]+ #\d+ vs [^#]+ #\d+(?!\.)/.test(roundOf16DetailText) ||
    /Winner will face [^#]+ #\d+ who won \d+-\d+(?: on penalties after a \d+-\d+ tie)? against [^#]+ #\d+(?!\.)/.test(
      roundOf16DetailText
    );
  assert(
    !roundOf16ProjectedRowText.includes("Predicted") &&
      roundOf16MatchupStateReady &&
      roundOf16DetailText.includes("Previous: Round of 32") &&
      roundOf16SourceStatusReady &&
      roundOf16DetailText.includes("Next: Quarter-finals") &&
      roundOf16NextPathReady &&
      roundOf16DetailText.includes("Prediction") &&
      !roundOf16DetailText.includes("Previous: Group round") &&
      !roundOf16DetailText.includes("bracket details are not loaded yet"),
    `Round of 16 and later match rows should skip redundant predicted chips while details show either a projected note or resolved participants plus source matches scheduled, live, predicted, or completed. Measured ${JSON.stringify({ roundOf16ProjectedRowText, roundOf16DetailText })}.`
  );
  const roundOf16ContextMetrics = await page.locator("#match-info").evaluate((info) => ({
    contextFlags: info.querySelectorAll(".knockout-context-team-flag .flag").length,
    previousRoundRanks: info.querySelectorAll(".knockout-context-list .rank-pill").length,
    nextPathRanks: info.querySelectorAll(".knockout-next-line .rank-pill").length
  }));
  assert(
    roundOf16ContextMetrics.contextFlags === 0 &&
      roundOf16ContextMetrics.previousRoundRanks >= 4 &&
      roundOf16ContextMetrics.nextPathRanks >= 2,
    `Round of 16 and later match detail should show compact ranking pills without context flags in source and next-path matchups. Measured ${JSON.stringify(roundOf16ContextMetrics)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-07-11&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="match-99-quarter-final-2026-07-11"]');
  await page.locator('[data-match-id="match-99-quarter-final-2026-07-11"]').click();
  const quarterFinalContextSearchActions = await page.locator("#match-info").evaluate((root) => {
    const previousSection = [...root.querySelectorAll(":scope > .match-info-content > .info-block")].find(
      (section) => section.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() === "Previous: Round of 16"
    );
    const nextSection = [...root.querySelectorAll(":scope > .match-info-content > .info-block")].find(
      (section) => section.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() === "Next: Semi-finals"
    );

    return {
      nextButtons: [...(nextSection?.querySelectorAll(".knockout-context-search-action") || [])].map((button) => ({
        query: button.getAttribute("data-team-search-query") || "",
        text: button.textContent.trim()
      })),
      nextButtonCount: nextSection?.querySelectorAll(".knockout-context-search-action").length || 0,
      nextText: nextSection?.textContent.replace(/\s+/g, " ").trim() || "",
      previousButtons: [...(previousSection?.querySelectorAll(".knockout-context-search-action") || [])].map(
        (button) => ({
          query: button.getAttribute("data-team-search-query") || "",
          text: button.textContent.trim()
        })
      ),
      previousText: previousSection?.textContent.replace(/\s+/g, " ").trim() || ""
    };
  });
  assert(
    quarterFinalContextSearchActions.previousText.includes("Norway #31 beat Brazil #6 2-1 See all") &&
      quarterFinalContextSearchActions.previousText.includes("England #4 beat Mexico #14 3-2 See all") &&
      quarterFinalContextSearchActions.previousButtons.map((button) => button.query).join("|") === "Norway|England" &&
      quarterFinalContextSearchActions.previousButtons.every((button) => button.text === "See all") &&
      quarterFinalContextSearchActions.nextText.includes("Winner will face Argentina #1 who won 3-1 against Switzerland #19 See all") &&
      quarterFinalContextSearchActions.nextButtonCount === 1 &&
      quarterFinalContextSearchActions.nextButtons.map((button) => button.query).join("|") === "Argentina" &&
      quarterFinalContextSearchActions.nextButtons.every((button) => button.text === "See all"),
    `Quarter-final context should add See all to resolved previous winners and the resolved next-match winner. Measured ${JSON.stringify(quarterFinalContextSearchActions)}.`
  );

  await page.setViewportSize({ width: 1142, height: 720 });
  await page.locator('[data-match-id="match-100-quarter-final-2026-07-11"]').click();
  const wrappedPenaltySearchActionLayout = await page
    .locator("#match-info .knockout-context-list li")
    .nth(1)
    .evaluate((row) => {
      const tail = row.querySelector(".knockout-context-search-tail");
      const action = tail?.querySelector(".knockout-context-search-action");
      const tailRect = tail?.getBoundingClientRect();
      const actionRect = action?.getBoundingClientRect();

      return {
        actionFollowsTail: Boolean(tailRect && actionRect && actionRect.left > tailRect.left),
        actionTopDelta: tailRect && actionRect ? Math.abs(actionRect.top - tailRect.top) : null,
        documentScrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        rowScrollOverflow: row.scrollWidth - row.clientWidth,
        tailRectCount: tail?.getClientRects().length || 0,
        tailText: tail?.textContent.replace(/\s+/g, " ").trim() || ""
      };
    });
  assert(
    wrappedPenaltySearchActionLayout.tailText === "(4-3 pens) See all" &&
      wrappedPenaltySearchActionLayout.tailRectCount === 1 &&
      wrappedPenaltySearchActionLayout.actionFollowsTail &&
      wrappedPenaltySearchActionLayout.actionTopDelta <= 2 &&
      wrappedPenaltySearchActionLayout.rowScrollOverflow <= 1 &&
      wrappedPenaltySearchActionLayout.documentScrollOverflow <= 1,
    `A wrapped penalty result should keep its final score fragment and See all action together without overflow. Measured ${JSON.stringify(wrappedPenaltySearchActionLayout)}.`
  );
  await page.setViewportSize({ width: 1280, height: 720 });

  const currentFranceSpainSemiFinal = fixturesData.fixtures.find((fixture) => fixture.matchNumber === 101);
  const franceSpainScore = currentFranceSpainSemiFinal?.score;
  const franceSpainIsFinal = currentFranceSpainSemiFinal?.status === "FT" && franceSpainScore;
  const franceSpainHomeWon = franceSpainIsFinal && franceSpainScore.home > franceSpainScore.away;
  const expectedFranceSpainSourceSummary = franceSpainIsFinal
    ? franceSpainHomeWon
      ? `France #3 beat Spain #2 ${franceSpainScore.home}-${franceSpainScore.away} See all`
      : `Spain #2 beat France #3 ${franceSpainScore.away}-${franceSpainScore.home} See all`
    : currentFranceSpainSemiFinal?.status === "LIVE" && franceSpainScore
      ? `France #3 vs Spain #2 is live at ${franceSpainScore.home}-${franceSpainScore.away}.`
      : "France #3 vs Spain #2 is scheduled.";
  const currentEnglandArgentinaSemiFinal = fixturesData.fixtures.find((fixture) => fixture.matchNumber === 102);
  const englandArgentinaScore = currentEnglandArgentinaSemiFinal?.score;
  const englandArgentinaIsFinal = currentEnglandArgentinaSemiFinal?.status === "FT" && englandArgentinaScore;
  const englandArgentinaHomeWon = englandArgentinaIsFinal && englandArgentinaScore.home > englandArgentinaScore.away;
  const expectedEnglandArgentinaSourceSummary = englandArgentinaIsFinal
    ? englandArgentinaHomeWon
      ? `England #4 beat Argentina #1 ${englandArgentinaScore.home}-${englandArgentinaScore.away} See all`
      : `Argentina #1 beat England #4 ${englandArgentinaScore.away}-${englandArgentinaScore.home} See all`
    : currentEnglandArgentinaSemiFinal?.status === "LIVE" && englandArgentinaScore
      ? `England #4 vs Argentina #1 is live at ${englandArgentinaScore.home}-${englandArgentinaScore.away}.`
      : "England #4 vs Argentina #1 is scheduled.";
  const expectedFinalParticipantText = `${
    franceSpainIsFinal ? (franceSpainHomeWon ? "France #3" : "Spain #2") : "Winner match 101"
  } vs ${
    englandArgentinaIsFinal ? (englandArgentinaHomeWon ? "England #4" : "Argentina #1") : "Winner match 102"
  }`;
  const expectedBronzeParticipantText = `${
    franceSpainIsFinal ? (franceSpainHomeWon ? "Spain #2" : "France #3") : "Runner-up match 101"
  } vs ${
    englandArgentinaIsFinal ? (englandArgentinaHomeWon ? "Argentina #1" : "England #4") : "Runner-up match 102"
  }`;

  await page.goto(`${baseUrl}?view=matches&date=2026-07-19&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="match-104-final-2026-07-19"]');
  const unresolvedFinalRowText = normalizeFlaggedText(
    await page.locator('[data-match-id="match-104-final-2026-07-19"]').innerText()
  );
  await page.locator('[data-match-id="match-104-final-2026-07-19"]').click();
  const unresolvedFinalDetailText = normalizeFlaggedText(await page.locator("#match-info").innerText());
  assert(
    !unresolvedFinalRowText.includes("Predicted") &&
      unresolvedFinalDetailText.includes(expectedFinalParticipantText) &&
      !unresolvedFinalDetailText.includes("Predicted matchup") &&
      unresolvedFinalDetailText.includes("Previous: Semi-finals") &&
      unresolvedFinalDetailText.includes(expectedFranceSpainSourceSummary) &&
      unresolvedFinalDetailText.includes(expectedEnglandArgentinaSourceSummary) &&
      !unresolvedFinalDetailText.includes("Round path") &&
      !unresolvedFinalDetailText.includes("No next knockout match is loaded yet."),
    "The Final detail should use confirmed semi-final winners, reflect source status, and omit predicted or dead-end path copy."
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-07-18&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="match-103-bronze-final-2026-07-18"]');
  const unresolvedBronzeRowText = normalizeFlaggedText(
    await page.locator('[data-match-id="match-103-bronze-final-2026-07-18"]').innerText()
  );
  await page.locator('[data-match-id="match-103-bronze-final-2026-07-18"]').click();
  const unresolvedBronzeDetailText = normalizeFlaggedText(await page.locator("#match-info").innerText());
  assert(
    !unresolvedBronzeRowText.includes("Predicted") &&
      unresolvedBronzeDetailText.includes(expectedBronzeParticipantText) &&
      !unresolvedBronzeDetailText.includes("Predicted matchup") &&
      unresolvedBronzeDetailText.includes("Previous: Semi-finals") &&
      unresolvedBronzeDetailText.includes(expectedFranceSpainSourceSummary) &&
      unresolvedBronzeDetailText.includes(expectedEnglandArgentinaSourceSummary) &&
      !unresolvedBronzeDetailText.includes("Round path") &&
      !unresolvedBronzeDetailText.includes("No next knockout match is loaded yet."),
    "The third-place detail should use confirmed semi-final runners-up, reflect source status, and omit predicted or dead-end path copy."
  );

  const resolvedFinalCheck = await openPageAtTime(
    "2026-07-19T18:00:00.000Z",
    "/?view=matches&date=2026-07-19&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const finishSemiFinal = (matchNumber, homeTeamId, awayTeamId, homeScore, awayScore) => {
          const fixture = data.fixtures.find((item) => item.matchNumber === matchNumber);

          fixture.homeTeamId = homeTeamId;
          fixture.awayTeamId = awayTeamId;
          fixture.homeSlot = null;
          fixture.awaySlot = null;
          fixture.status = "FT";
          fixture.score = { home: homeScore, away: awayScore };
        };

        finishSemiFinal(101, "FRA", "ESP", 2, 0);
        finishSemiFinal(102, "ENG", "ARG", 0, 1);
        [103, 104].forEach((matchNumber) => {
          const fixture = data.fixtures.find((item) => item.matchNumber === matchNumber);
          delete fixture.homeTeamId;
          delete fixture.awayTeamId;
        });
      }
    }
  );
  await resolvedFinalCheck.page.waitForSelector('[data-match-id="match-104-final-2026-07-19"]');
  const resolvedFinalRowText = normalizeFlaggedText(
    await resolvedFinalCheck.page.locator('[data-match-id="match-104-final-2026-07-19"]').innerText()
  );
  await resolvedFinalCheck.page.locator('[data-match-id="match-104-final-2026-07-19"]').click();
  const resolvedFinalSummaryText = normalizeFlaggedText(
    await resolvedFinalCheck.page.locator("#match-info .match-summary").innerText()
  );
  const resolvedFinalDetailText = normalizeFlaggedText(await resolvedFinalCheck.page.locator("#match-info").innerText());
  assert(
    resolvedFinalRowText.includes("France") &&
      resolvedFinalRowText.includes("Argentina") &&
      !resolvedFinalRowText.includes("Winner match") &&
      resolvedFinalSummaryText.includes("France #3 vs Argentina #1") &&
      resolvedFinalDetailText.includes("France #3 beat Spain #2 2-0") &&
      resolvedFinalDetailText.includes("Argentina #1 beat England #4 1-0") &&
      !resolvedFinalDetailText.includes("Winner match") &&
      !resolvedFinalDetailText.includes("Predicted matchup") &&
      !resolvedFinalRowText.includes("Predicted") &&
      !resolvedFinalDetailText.includes("Round path"),
    `The Final row and detail should resolve to semi-final winners once those source matches are final. Measured ${JSON.stringify({ resolvedFinalRowText, resolvedFinalSummaryText, resolvedFinalDetailText })}.`
  );
  await resolvedFinalCheck.context.close();

  const resolvedBronzeCheck = await openPageAtTime(
    "2026-07-18T22:00:00.000Z",
    "/?view=matches&date=2026-07-18&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const finishSemiFinal = (matchNumber, homeTeamId, awayTeamId, homeScore, awayScore) => {
          const fixture = data.fixtures.find((item) => item.matchNumber === matchNumber);

          fixture.homeTeamId = homeTeamId;
          fixture.awayTeamId = awayTeamId;
          fixture.homeSlot = null;
          fixture.awaySlot = null;
          fixture.status = "FT";
          fixture.score = { home: homeScore, away: awayScore };
        };

        finishSemiFinal(101, "FRA", "ESP", 2, 0);
        finishSemiFinal(102, "ENG", "ARG", 0, 1);
        [103, 104].forEach((matchNumber) => {
          const fixture = data.fixtures.find((item) => item.matchNumber === matchNumber);
          delete fixture.homeTeamId;
          delete fixture.awayTeamId;
        });
      }
    }
  );
  await resolvedBronzeCheck.page.waitForSelector('[data-match-id="match-103-bronze-final-2026-07-18"]');
  const resolvedBronzeRowText = normalizeFlaggedText(
    await resolvedBronzeCheck.page.locator('[data-match-id="match-103-bronze-final-2026-07-18"]').innerText()
  );
  await resolvedBronzeCheck.page.locator('[data-match-id="match-103-bronze-final-2026-07-18"]').click();
  const resolvedBronzeSummaryText = normalizeFlaggedText(
    await resolvedBronzeCheck.page.locator("#match-info .match-summary").innerText()
  );
  const resolvedBronzeDetailText = normalizeFlaggedText(await resolvedBronzeCheck.page.locator("#match-info").innerText());
  assert(
    resolvedBronzeRowText.includes("Spain") &&
      resolvedBronzeRowText.includes("England") &&
      !resolvedBronzeRowText.includes("Runner-up match") &&
      resolvedBronzeSummaryText.includes("Spain #2 vs England #4") &&
      !resolvedBronzeDetailText.includes("Runner-up match") &&
      !resolvedBronzeDetailText.includes("Predicted matchup") &&
      !resolvedBronzeRowText.includes("Predicted") &&
      !resolvedBronzeDetailText.includes("Round path"),
    `The third-place row and detail should resolve to semi-final runners-up once those source matches are final. Measured ${JSON.stringify({ resolvedBronzeRowText, resolvedBronzeSummaryText, resolvedBronzeDetailText })}.`
  );
  await resolvedBronzeCheck.context.close();

  await page.setViewportSize({ width: 540, height: 760 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-24&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="scotland-brazil-2026-06-24"]');
  const midWidthCompletedRowMetrics = await page
    .locator('[data-match-id="scotland-brazil-2026-06-24"]')
    .evaluate((row) => {
      const teams = row.querySelector(".match-teams");
      const score = row.querySelector(".match-score");
      const teamsBox = teams.getBoundingClientRect();
      const scoreBox = score?.getBoundingClientRect();

      return {
        gapToScore: scoreBox ? scoreBox.left - teamsBox.right : null,
        lineHeight: Number.parseFloat(getComputedStyle(teams).lineHeight),
        rankCount: row.querySelectorAll(".match-teams .rank-pill").length,
        rowHeight: row.getBoundingClientRect().height,
        scrollOverflow: row.scrollWidth - row.clientWidth,
        teamsHeight: teamsBox.height,
        text: row.innerText.replace(/\s+/g, " ").trim()
      };
  });
  assert(
    /^3:00PM Scotland\s*vs/.test(midWidthCompletedRowMetrics.text) &&
      midWidthCompletedRowMetrics.rankCount === 0 &&
      midWidthCompletedRowMetrics.teamsHeight <= midWidthCompletedRowMetrics.lineHeight * 1.25 &&
      midWidthCompletedRowMetrics.gapToScore >= 16 &&
      midWidthCompletedRowMetrics.rowHeight <= 32 &&
      midWidthCompletedRowMetrics.scrollOverflow <= 1,
    `Completed mid-width rows should hide rank pills and use available space instead of wrapping before the away team. Measured ${JSON.stringify(midWidthCompletedRowMetrics)}.`
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-24&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  const openMatchDetailById = async (matchId, expectedSummaryText) => {
    await page.waitForFunction((id) => {
      const rows = [...document.querySelectorAll(`[data-match-id="${id}"]`)];
      return rows.some((row) => {
        const bounds = row.getBoundingClientRect();
        const style = getComputedStyle(row);

        return bounds.width > 0 && bounds.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      });
    }, matchId);
    await page.locator(`[data-match-id="${matchId}"]`).evaluateAll((rows, id) => {
      const visibleRow = rows.find((row) => {
        const bounds = row.getBoundingClientRect();
        const style = getComputedStyle(row);

        return bounds.width > 0 && bounds.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      });

      if (!visibleRow) {
        throw new Error(`No visible match row found for ${id}.`);
      }

      visibleRow.click();
    }, matchId);
    await page.waitForFunction(
      (expectedText) =>
        [...document.querySelectorAll("#match-info .summary-title")].some((summary) => {
          const bounds = summary.getBoundingClientRect();
          const style = getComputedStyle(summary);

          return (
            bounds.width > 0 &&
            bounds.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            summary.textContent.includes(expectedText)
          );
        }),
      expectedSummaryText
    );
  };

  await openMatchDetailById("bosnia-qatar-2026-06-24", "Qatar");
  assert(
    (await page.locator("#match-info .standing-status-pill.is-eliminated", { hasText: "Eliminated" }).count()) === 1,
    "Match detail group standings should mark eliminated teams after a group is complete."
  );
  await page.setViewportSize({ width: 696, height: 760 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-24&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await openMatchDetailById("bosnia-qatar-2026-06-24", "Qatar");
  const qatarStandingTeamSelector = '#match-info .standings-table tbody .standing-team[data-team-id="QAT"]';
  const readQatarStandingBadgeLayout = async () => {
    const layoutHandle = await page.waitForFunction((selector) => {
      const teams = [...document.querySelectorAll(selector)];
      const isVisibleTeam = (team) => {
        const bounds = team.getBoundingClientRect();
        const style = getComputedStyle(team);

        return (
          bounds.width > 0 &&
          bounds.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      };
      const candidates = teams
        .map((team) => {
          const bounds = team.getBoundingClientRect();
          const style = getComputedStyle(team);

          return {
            teamId: team.getAttribute("data-team-id") || "",
            height: Math.round(bounds.height),
            text: team.textContent.replace(/\s+/g, " ").trim(),
            visible: bounds.width > 0 && bounds.height > 0 && style.display !== "none" && style.visibility !== "hidden",
            width: Math.round(bounds.width)
          };
        });
      const team = teams.find(isVisibleTeam);

      if (!team) {
        return false;
      }

      const rect = (node) => {
        const bounds = node?.getBoundingClientRect();

        return bounds
          ? {
              top: Math.round(bounds.top),
              left: Math.round(bounds.left),
              width: Math.round(bounds.width),
              height: Math.round(bounds.height)
            }
          : null;
      };

      return {
        candidates,
        name: rect(team.querySelector(".standing-name")),
        badgeRow: rect(team.querySelector(".standing-badge-row")),
        rank: rect(team.querySelector(".rank-pill")),
        eliminated: rect(team.querySelector(".standing-status-pill.is-eliminated"))
      };
    }, qatarStandingTeamSelector);

    return layoutHandle.jsonValue();
  };
  const qatarWideBadgeLayout = await readQatarStandingBadgeLayout();
  assert(
    qatarWideBadgeLayout.name &&
      qatarWideBadgeLayout.rank &&
      qatarWideBadgeLayout.eliminated &&
      Math.abs(qatarWideBadgeLayout.name.top - qatarWideBadgeLayout.rank.top) <= 3 &&
      Math.abs(qatarWideBadgeLayout.name.top - qatarWideBadgeLayout.eliminated.top) <= 3,
    `Short eliminated standings rows should keep the name, ranking, and status on one line when space allows. Measured ${JSON.stringify(qatarWideBadgeLayout)}.`
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-24&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await openMatchDetailById("bosnia-qatar-2026-06-24", "Qatar");
  const qatarMobileBadgeLayout = await readQatarStandingBadgeLayout();
  assert(
    qatarMobileBadgeLayout.name &&
      qatarMobileBadgeLayout.rank &&
      qatarMobileBadgeLayout.eliminated &&
      qatarMobileBadgeLayout.badgeRow &&
      qatarMobileBadgeLayout.rank.left >= qatarMobileBadgeLayout.badgeRow.left &&
      Math.abs(qatarMobileBadgeLayout.rank.top - qatarMobileBadgeLayout.eliminated.top) <= 3 &&
      qatarMobileBadgeLayout.name.top < qatarMobileBadgeLayout.rank.top,
    `Short eliminated standings rows should wrap the rank and status together on narrow screens. Measured ${JSON.stringify(qatarMobileBadgeLayout)}.`
  );
  await page.setViewportSize({ width: 1180, height: 760 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-25&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await openMatchDetailById("ecuador-germany-2026-06-25", "Germany");
  const ecuadorGermanySummaryGap = await page.locator("#match-info .summary-title").evaluate((summary) => {
    const homeTeam = summary.querySelector(".summary-team:first-of-type");
    const versus = summary.querySelector(".versus");
    const awayTeam = summary.querySelector(".summary-team:last-of-type");
    const ranks = Array.from(summary.querySelectorAll(".rank-pill"));
    const homeRect = homeTeam?.getBoundingClientRect();
    const versusRect = versus?.getBoundingClientRect();
    const awayRect = awayTeam?.getBoundingClientRect();
    const rankRects = ranks.map((rank) => rank.getBoundingClientRect());
    const rankFontSizes = ranks.map((rank) => Number.parseFloat(getComputedStyle(rank).fontSize));

    return {
      homeToVs: homeRect && versusRect ? Math.round(versusRect.left - homeRect.right) : null,
      maxRankFontSize: Math.max(0, ...rankFontSizes),
      maxRankHeight: Math.max(0, ...rankRects.map((rect) => rect.height)),
      rankCount: ranks.length,
      vsToAway: versusRect && awayRect ? Math.round(awayRect.left - versusRect.right) : null,
      text: summary.textContent.replace(/\s+/g, " ").trim()
    };
  });
  assert(
    ecuadorGermanySummaryGap.homeToVs >= 0 &&
      ecuadorGermanySummaryGap.homeToVs <= 8 &&
      ecuadorGermanySummaryGap.rankCount === 2 &&
      ecuadorGermanySummaryGap.maxRankHeight <= 18 &&
      ecuadorGermanySummaryGap.maxRankFontSize <= 11 &&
      ecuadorGermanySummaryGap.vsToAway >= 0 &&
      ecuadorGermanySummaryGap.vsToAway <= 8,
    `Ecuador vs Germany detail heading should keep compact spacing around vs with small world-rank pills in the title. Measured ${JSON.stringify(ecuadorGermanySummaryGap)}.`
  );
  await openMatchDetailById("turkiye-united-states-2026-06-25", "United States");
  assert(
    (await page.locator("#match-info .standing-team", { hasText: "Türkiye" }).locator(".standing-status-pill.is-eliminated").innerText()) === "Eliminated",
    "Match detail group standings should mathematically mark eliminated teams before their group is complete."
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

  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto(`${baseUrl}?view=standings&standingsMode=groups`, { waitUntil: "load" });
  await page.waitForSelector('.standings-card[data-group-id="C"] .standing-team');
  const scotlandStandingTeam = page
    .locator('.standings-card[data-group-id="C"] .standing-team', { hasText: "Scotland" })
    .first();
  const scotlandBadgeLayoutState = await scotlandStandingTeam.evaluate((team) => {
    const name = team.querySelector(".standing-name");
    const badge = team.querySelector(".third-place-pill");
    const nameRect = name?.getBoundingClientRect();

    return {
      badgeText: badge?.textContent.trim() || "",
      nameText: name?.textContent.trim() || "",
      nameWidth: nameRect?.width || 0,
      whiteSpace: name ? getComputedStyle(name).whiteSpace : "",
      hasBadgeClass: team.classList.contains("has-standing-badges"),
      hasTooltipClass: team.classList.contains("has-name-tooltip")
    };
  });
  assert(
    scotlandBadgeLayoutState.hasBadgeClass &&
      scotlandBadgeLayoutState.nameText === "Scotland" &&
      scotlandBadgeLayoutState.nameWidth > 40 &&
      scotlandBadgeLayoutState.whiteSpace === "normal" &&
      scotlandBadgeLayoutState.badgeText.includes("3rd race") &&
      !scotlandBadgeLayoutState.hasTooltipClass,
    "Badge-bearing standings rows should keep the team name visible instead of collapsing into a tooltip-only row."
  );

  const truncatedStandingTeam = page
    .locator(".standings-card[data-group-id] .standing-team.has-name-tooltip:not(.has-standing-badges)")
    .first();
  assert(
    (await truncatedStandingTeam.count()) > 0,
    "Current standings should include at least one non-badge row that needs a full-name tooltip."
  );
  const truncatedStandingTooltipState = await truncatedStandingTeam.evaluate((team) => ({
    anchor: team.style.getPropertyValue("--name-tooltip-anchor"),
    hasBadgeClass: team.classList.contains("has-standing-badges"),
    hasTooltipClass: team.classList.contains("has-name-tooltip"),
    nameText: team.querySelector(".standing-name")?.textContent.trim() || "",
    title: team.getAttribute("title"),
    tooltip: team.getAttribute("data-tooltip")
  }));
  assert(
    truncatedStandingTooltipState.hasTooltipClass &&
      !truncatedStandingTooltipState.hasBadgeClass &&
      truncatedStandingTooltipState.nameText.length > 0 &&
      truncatedStandingTooltipState.title === truncatedStandingTooltipState.tooltip &&
      truncatedStandingTooltipState.tooltip.length > 0 &&
      truncatedStandingTooltipState.anchor.length > 0,
    "Truncated non-badge standings rows should expose a full-name tooltip with a usable anchor."
  );
  const truncatedStandingTooltipContent = await truncatedStandingTeam.evaluate(
    (team) => getComputedStyle(team, "::after").content
  );
  assert(
    truncatedStandingTooltipContent.includes(truncatedStandingTooltipState.tooltip),
    `Truncated non-badge standings rows should expose full-name tooltip text. Measured content ${truncatedStandingTooltipContent}.`
  );
  await page.setViewportSize({ width: 1280, height: 720 });

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
  await page.locator("#calendar-prev-month").click();
  await page
    .locator("#calendar-month-label")
    .filter({ hasText: /^December 2022$/ })
    .waitFor({ state: "visible" });
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
  await page
    .locator("#calendar-month-label")
    .filter({ hasText: /^November 2022$/ })
    .waitFor({ state: "visible" });
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
  await page
    .locator("#calendar-month-label")
    .filter({ hasText: /^June 2026$/ })
    .waitFor({ state: "visible" });
  assert(
    (await page.locator("#calendar-month-label").innerText()).trim() === "June 2026",
    "The next month control should jump over empty years back to June 2026."
  );
  assert(
    !(await page.locator("#calendar-next-month").isDisabled()),
    "The calendar should page to the next loaded World Cup month."
  );
  await page.locator("#calendar-next-month").click();
  await page
    .locator("#calendar-month-label")
    .filter({ hasText: /^July 2026$/ })
    .waitFor({ state: "visible" });
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
  await page
    .locator("#calendar-month-label")
    .filter({ hasText: /^June 2026$/ })
    .waitFor({ state: "visible" });
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
    (await yesterdayShortcut.innerText()).trim() === "Yesterday" &&
      !(await yesterdayShortcut.isDisabled()),
    "The Yesterday shortcut should be enabled when yesterday has a match."
  );
  assert(
    (await todayShortcut.innerText()).trim() === "Today" && !(await todayShortcut.isDisabled()),
    "The Today shortcut should stay enabled and labeled Today when today has matches."
  );
  await yesterdayShortcut.click();
  assert(
    (await calendarShortcutCheck.page.locator("#day-label").innerText()).trim() === "Jun 17",
    "The Yesterday shortcut should jump to yesterday."
  );
  await calendarShortcutCheck.context.close();

  const calendarRestDayCheck = await openPageAtTime(
    "2026-07-16T18:08:00.000Z",
    "/?view=matches&date=2026-07-15&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const nextFixture = data.fixtures.find(
          (fixture) => fixture.id === "match-103-bronze-final-2026-07-18"
        );
        if (!nextFixture) {
          return;
        }
        ["22:00:00Z", "23:00:00Z", "00:00:00Z"].forEach((kickoffTime, index) => {
          const extraFixture = JSON.parse(JSON.stringify(nextFixture));
          extraFixture.id = `${nextFixture.id}-extra-${index + 1}`;
          extraFixture.matchNumber = Number(nextFixture.matchNumber) + index + 1;
          extraFixture.kickoffUtc = `${index === 2 ? "2026-07-19" : "2026-07-18"}T${kickoffTime}`;
          data.fixtures.push(extraFixture);
        });
      }
    }
  );
  await calendarRestDayCheck.page.locator("#day-label").click();
  const previousShortcut = calendarRestDayCheck.page.locator("#calendar-yesterday");
  const todayRestDayShortcut = calendarRestDayCheck.page.locator("#calendar-today");
  const todayRestDayCell = calendarRestDayCheck.page.locator(
    '#calendar-grid [data-day-key="2026-07-16"]'
  );
  const disabledRestDayCell = calendarRestDayCheck.page.locator(
    '#calendar-grid [data-day-key="2026-07-17"]'
  );
  const [todayRestDayColor, disabledRestDayColor] = await Promise.all([
    todayRestDayCell.evaluate((button) => getComputedStyle(button).color),
    disabledRestDayCell.evaluate((button) => getComputedStyle(button).color)
  ]);
  assert(
    (await previousShortcut.innerText()).trim() === "Yesterday" &&
      !(await previousShortcut.isDisabled()),
    "The calendar should keep the literal Yesterday shortcut when yesterday has a match."
  );
  assert(
    (await todayRestDayShortcut.innerText()).trim() === "Today" &&
      !(await todayRestDayShortcut.isDisabled()) &&
      !(await todayRestDayCell.isDisabled()) &&
      (await todayRestDayCell.getAttribute("class"))?.includes("is-disabled") &&
      todayRestDayColor === disabledRestDayColor,
    "Today should stay selectable on a rest day while retaining the disabled-looking calendar style."
  );
  await todayRestDayCell.click();
  assert(
    (await calendarRestDayCheck.page.locator("#day-label").innerText()).trim() === "Today" &&
      (await calendarRestDayCheck.page.locator(".empty-state h2").count()) === 0,
    "Selecting a rest-day Today should show the no-match state."
  );
  const nextMatchButton = calendarRestDayCheck.page.locator(
    '.empty-state [data-select-calendar-day="2026-07-18"]'
  );
  const nextMatchDescription = calendarRestDayCheck.page.locator(".empty-state-next-description");
  const emptyStateTypography = await calendarRestDayCheck.page.locator(".empty-state").evaluate((root) => {
    const description = root.querySelector(".empty-state-next-description");
    const descriptionStyle = getComputedStyle(description);
    const matchupStyle = getComputedStyle(root.querySelector(".empty-state-next-matchup"));
    const flagStyle = getComputedStyle(root.querySelector(".empty-state-next-matchup .flag"));
    const teamStyle = getComputedStyle(root.querySelector(".empty-state-next-team"));
    const versusStyle = getComputedStyle(root.querySelector(".empty-state-next-versus"));
    const action = root.querySelector(".empty-state-next-action");
    return {
      action: action?.textContent.trim() || "",
      actionUsesPrimaryUi: action?.classList.contains("primary-button") || false,
      descriptionFontSize: descriptionStyle.fontSize,
      descriptionFontWeight: descriptionStyle.fontWeight,
      descriptionText: description?.textContent.replace(/\s+/g, " ").trim() || "",
      daysPillCount: root.querySelectorAll(".empty-state-days-pill").length,
      flagCount: root.querySelectorAll(".empty-state-next-matchup .flag").length,
      flagVerticalAlign: flagStyle.verticalAlign,
      matchupDisplay: matchupStyle.display,
      matchupUnderlineStyle: matchupStyle.borderBottomStyle,
      teamVerticalAlign: teamStyle.verticalAlign,
      versusVerticalAlign: versusStyle.verticalAlign
    };
  });
  assert(
    emptyStateTypography.descriptionText ===
      "The next match is on July 18 for 🇫🇷 France vs England and 3 more" &&
      emptyStateTypography.descriptionFontWeight === "400" &&
      emptyStateTypography.action === "View next match" &&
      emptyStateTypography.actionUsesPrimaryUi &&
      emptyStateTypography.daysPillCount === 0 &&
      emptyStateTypography.flagCount === 2 &&
      emptyStateTypography.flagVerticalAlign === "middle" &&
      emptyStateTypography.matchupDisplay === "inline" &&
      emptyStateTypography.matchupUnderlineStyle === "none" &&
      emptyStateTypography.teamVerticalAlign === "middle" &&
      emptyStateTypography.versusVerticalAlign === "middle",
    `The no-match state should preserve the approved wording, use normal spacing around vs, keep both flags, and show a dedicated CTA. Measured ${JSON.stringify(emptyStateTypography)}.`
  );
  await calendarRestDayCheck.page.setViewportSize({ width: 390, height: 844 });
  const mobileEmptyStateStyle = await calendarRestDayCheck.page.locator(".empty-state").evaluate((root) => {
    const action = root.querySelector(".empty-state-next-action");
    const actionStyle = getComputedStyle(action);
    const actionHitAreaStyle = getComputedStyle(action, "::after");
    return {
      actionFontSize: actionStyle.fontSize,
      actionHeight: actionStyle.height,
      actionHitAreaBottom: actionHitAreaStyle.bottom,
      actionHitAreaTop: actionHitAreaStyle.top,
      actionMinHeight: actionStyle.minHeight,
      actionPaddingLeft: actionStyle.paddingLeft,
      actionPaddingRight: actionStyle.paddingRight,
      descriptionFontSize: getComputedStyle(root.querySelector(".empty-state-next-description")).fontSize
    };
  });
  assert(
    mobileEmptyStateStyle.actionHeight === "34px" &&
      mobileEmptyStateStyle.actionMinHeight === "34px" &&
      mobileEmptyStateStyle.actionFontSize === "12px" &&
      mobileEmptyStateStyle.actionPaddingLeft === "14px" &&
      mobileEmptyStateStyle.actionPaddingRight === "14px" &&
      mobileEmptyStateStyle.actionHitAreaTop === "-5px" &&
      mobileEmptyStateStyle.actionHitAreaBottom === "-5px",
    `The mobile CTA should use a compact 34px capsule with a 44px hit area. Measured ${JSON.stringify(mobileEmptyStateStyle)}.`
  );
  const restDayUrlBeforeHover = calendarRestDayCheck.page.url();
  await nextMatchDescription.hover();
  await calendarRestDayCheck.page.waitForTimeout(200);
  assert(
    !(await calendarRestDayCheck.page.locator("#match-info").isVisible()) &&
      calendarRestDayCheck.page.url() === restDayUrlBeforeHover &&
      (await calendarRestDayCheck.page.locator("#day-label").innerText()).trim() === "Today",
    "Hovering the plain next-match sentence should not open match information or leave Today."
  );
  await nextMatchButton.click();
  await calendarRestDayCheck.page.locator("#match-info:not(.is-hidden)").waitFor({ state: "visible" });
  await calendarRestDayCheck.page
    .locator('.match-row.is-selected[data-match-id="match-103-bronze-final-2026-07-18"]')
    .waitFor({ state: "attached" });
  const nextMatchRowFontSize = await calendarRestDayCheck.page
    .locator(".match-row .match-teams")
    .first()
    .evaluate((matchTeams) => getComputedStyle(matchTeams).fontSize);
  assert(
      (await calendarRestDayCheck.page.locator("#day-label").innerText()).trim() === "Jul 18" &&
      (await calendarRestDayCheck.page.locator(".match-row").count()) === 4 &&
      mobileEmptyStateStyle.descriptionFontSize === nextMatchRowFontSize &&
      (await calendarRestDayCheck.page.locator("#match-info").innerText()).includes("France") &&
      (await calendarRestDayCheck.page.locator("#match-info").innerText()).includes("England") &&
      new URL(calendarRestDayCheck.page.url()).searchParams.get("match") ===
        "match-103-bronze-final-2026-07-18",
    "The View next match button should jump to that date and preselect the specific next match."
  );
  await calendarRestDayCheck.context.close();

  const postFinalCelebrationCheck = await openPageAtTime(
    "2026-07-20T19:30:00Z",
    "/?view=matches&tz=America%2FLos_Angeles",
    {
      initScript: () => {
        window.__initialBannerOpacitySamples = [];
        const trackPreBannerTitle = () => {
          if (document.querySelector("#final-celebration-banner")) return;
          const pageTitle = document.querySelector("#matches-view .page-title");
          if (pageTitle) {
            window.__preBannerTitleTop = pageTitle.getBoundingClientRect().top;
          }
          window.requestAnimationFrame(trackPreBannerTitle);
        };
        window.requestAnimationFrame(trackPreBannerTitle);
        const recordBannerOpacity = (label) => {
          const banner = document.querySelector("#final-celebration-banner");
          if (!banner) return;
          const pageTitle = document.querySelector("#matches-view .page-title");
          const reveal = document.querySelector("#final-celebration-reveal");
          window.__initialBannerOpacitySamples.push({
            label,
            bannerHeight: banner.getBoundingClientRect().height,
            loadingPlaceholderCount: document.querySelectorAll("#match-list > .match-loading").length,
            matchListTop: document.querySelector("#match-list")?.getBoundingClientRect().top ?? -1,
            nextElementClass: reveal?.nextElementSibling?.className || "",
            opacity: Number.parseFloat(getComputedStyle(banner).opacity),
            preBannerTitleTop: window.__preBannerTitleTop ?? -1,
            revealHeight: reveal?.getBoundingClientRect().height ?? -1,
            titleTop: pageTitle?.getBoundingClientRect().top ?? -1,
            titleOpacity: pageTitle ? Number.parseFloat(getComputedStyle(pageTitle).opacity) : -1
          });
        };
        const attachObserver = () => {
          if (!document.documentElement) {
            window.requestAnimationFrame(attachObserver);
            return;
          }
          const observer = new MutationObserver(() => {
            if (!document.querySelector("#final-celebration-banner")) return;
            observer.disconnect();
            recordBannerOpacity("insert");
            window.requestAnimationFrame(() => {
              recordBannerOpacity("raf-1");
              window.requestAnimationFrame(() => recordBannerOpacity("raf-2"));
            });
            window.setTimeout(() => recordBannerOpacity("mid"), 180);
            window.setTimeout(() => recordBannerOpacity("end"), 1150);
          });
          observer.observe(document.documentElement, { childList: true, subtree: true });
        };
        attachObserver();
      }
    }
  );
  await postFinalCelebrationCheck.page.waitForFunction(
    () => window.__initialBannerOpacitySamples?.some((sample) => sample.label === "end")
  );
  await postFinalCelebrationCheck.page.waitForFunction(
    () => !document.body.classList.contains("is-initial-page-load")
  );
  await postFinalCelebrationCheck.page.waitForFunction(
    () =>
      document.querySelectorAll("#final-celebration-banner .final-celebration-bullets li")
        .length === 3
  );
  const postFinalCelebrationState = await postFinalCelebrationCheck.page.evaluate(() => {
    const body = document.body;
    const emptyState = document.querySelector("#match-list > .empty-state");
    const recapLink = emptyState?.querySelector(".empty-state-recap-action");
    const postTournamentMessage = emptyState?.querySelector(".empty-state-post-tournament-description");
    const banner = document.querySelector("#final-celebration-banner");
    const pageTitle = document.querySelector("#matches-view .page-title");
    const bannerBounds = banner?.getBoundingClientRect();
    const pageTitleBounds = pageTitle?.getBoundingClientRect();
    const recapLinkBounds = recapLink?.getBoundingClientRect();
    const messageBounds = postTournamentMessage?.getBoundingClientRect();
    const bannerStyles = banner ? getComputedStyle(banner) : null;
    const recapLinkStyles = recapLink ? getComputedStyle(recapLink) : null;
    return {
      bulletCount: document.querySelectorAll("#final-celebration-banner .final-celebration-bullets li").length,
      bannerAboveToday: Boolean(
        bannerBounds &&
        pageTitleBounds &&
        bannerBounds.bottom <= pageTitleBounds.top
      ),
      bannerEntranceSamples: window.__initialBannerOpacitySamples || [],
      hasCelebration: body.classList.contains("has-final-celebration"),
      hasFinalAction: Boolean(emptyState?.querySelector("[data-select-final-match]")),
      hasFinalInRecentMatches: Boolean(
        document.querySelector('.yesterday-section [data-match-id="match-104-final-2026-07-19"]')
      ),
      hasSummary: Boolean(document.querySelector("#final-celebration-banner .final-celebration-summary")),
      isCalm: body.classList.contains("is-final-celebration-calm"),
      message: postTournamentMessage?.textContent.trim() || "",
      hasBannerAwardsLink: Boolean(banner?.querySelector(".final-celebration-awards-link")),
      initialEntranceComplete: !body.classList.contains("is-initial-page-load"),
      loadingPlaceholderCount: document.querySelectorAll("#match-list > .match-loading").length,
      settledOpacities: [
        banner,
        document.querySelector("#matches-view .page-title"),
        emptyState,
        document.querySelector("#match-list > .yesterday-section")
      ].map((element) => element ? getComputedStyle(element).opacity : "missing"),
      recapHref: recapLink?.getAttribute("href") || "",
      recapLabel: recapLink?.textContent.trim() || "",
      recapBackground: recapLinkStyles?.backgroundColor || "",
      recapHeight: recapLinkBounds?.height || 0,
      recapWidth: recapLinkBounds?.width || 0,
      recapBelowMessage: Boolean(messageBounds && recapLinkBounds && recapLinkBounds.top >= messageBounds.bottom + 12),
      bannerAnimationName: bannerStyles?.animationName || "",
      bannerTransitionDuration: bannerStyles?.transitionDuration || "",
      bannerTransitionProperty: bannerStyles?.transitionProperty || "",
      bannerPaddingBalanced: Boolean(
        bannerStyles &&
        Number.parseFloat(bannerStyles.paddingTop) >= 20 &&
        Math.abs(Number.parseFloat(bannerStyles.paddingTop) - Number.parseFloat(bannerStyles.paddingBottom)) <= 1 &&
        Math.abs(Number.parseFloat(bannerStyles.paddingLeft) - Number.parseFloat(bannerStyles.paddingRight)) <= 1
      ),
      recentMatchesTitle: document.querySelector(".yesterday-section-header h2")?.textContent.trim() || "",
      title: document.querySelector("#final-celebration-banner")?.textContent.replace(/\s+/g, " ").trim() || ""
    };
  });
  const bannerEntranceStart = postFinalCelebrationState.bannerEntranceSamples.find(
    (sample) => sample.label === "insert"
  );
  const bannerEntranceMid = postFinalCelebrationState.bannerEntranceSamples.find(
    (sample) => sample.label === "mid"
  );
  const bannerEntranceEnd = postFinalCelebrationState.bannerEntranceSamples.find(
    (sample) => sample.label === "end"
  );
  assert(
    bannerEntranceStart?.opacity === 0 &&
      bannerEntranceStart?.loadingPlaceholderCount === 0 &&
      bannerEntranceStart?.nextElementClass === "page-title" &&
      bannerEntranceStart?.revealHeight <= 1 &&
      Math.abs(bannerEntranceStart?.titleTop - bannerEntranceStart?.preBannerTitleTop) <= 1 &&
      bannerEntranceStart?.titleOpacity === 1 &&
      bannerEntranceMid?.opacity > 0 &&
      bannerEntranceMid?.opacity < 1 &&
      bannerEntranceMid?.revealHeight > bannerEntranceStart?.revealHeight &&
      bannerEntranceMid?.revealHeight < bannerEntranceEnd?.revealHeight &&
      bannerEntranceMid?.titleTop > bannerEntranceStart?.titleTop &&
      bannerEntranceMid?.titleTop < bannerEntranceEnd?.titleTop &&
      bannerEntranceMid?.matchListTop > bannerEntranceStart?.matchListTop &&
      bannerEntranceMid?.matchListTop < bannerEntranceEnd?.matchListTop &&
      bannerEntranceEnd?.opacity === 1 &&
      Math.abs(bannerEntranceEnd?.revealHeight - bannerEntranceEnd?.bannerHeight) <= 1 &&
      postFinalCelebrationState.message === "The 2026 World Cup is over." &&
      postFinalCelebrationState.bannerAboveToday &&
      postFinalCelebrationState.bulletCount === 3 &&
      postFinalCelebrationState.hasCelebration &&
      !postFinalCelebrationState.hasFinalAction &&
      postFinalCelebrationState.hasFinalInRecentMatches &&
      !postFinalCelebrationState.hasSummary &&
      !postFinalCelebrationState.isCalm &&
      !postFinalCelebrationState.hasBannerAwardsLink &&
      postFinalCelebrationState.initialEntranceComplete &&
      postFinalCelebrationState.loadingPlaceholderCount === 0 &&
      postFinalCelebrationState.settledOpacities.every((opacity) => opacity === "1") &&
      postFinalCelebrationState.recapHref === "highlights.html" &&
      postFinalCelebrationState.recapLabel === "View highlights" &&
      postFinalCelebrationState.recapHeight >= 38 &&
      postFinalCelebrationState.recapHeight <= 46 &&
      postFinalCelebrationState.recapWidth >= 80 &&
      postFinalCelebrationState.recapWidth <= 132 &&
      postFinalCelebrationState.recapBelowMessage &&
      postFinalCelebrationState.bannerAnimationName === "none" &&
      postFinalCelebrationState.bannerTransitionDuration.includes("0.9s") &&
      postFinalCelebrationState.bannerTransitionProperty.includes("opacity") &&
      postFinalCelebrationState.bannerPaddingBalanced &&
      postFinalCelebrationState.recapBackground !== "rgba(0, 0, 0, 0)" &&
      postFinalCelebrationState.recentMatchesTitle.includes("Recent matches (Jul 19)") &&
      postFinalCelebrationState.title.includes("Spain are 2026 world champions") &&
      postFinalCelebrationState.title.includes(
        "Spain's philosophy is possession: keep the ball, stretch the pitch and swarm as soon as it is lost."
      ),
    `July 20 should keep the animated champion cover, leave the final in Recent matches, and put one compact recap action below the post-tournament message. Measured ${JSON.stringify(postFinalCelebrationState)}.`
  );

  await postFinalCelebrationCheck.page.locator("#day-label").click();
  await postFinalCelebrationCheck.page
    .locator('#calendar-grid [data-day-key="2026-07-01"]')
    .click();
  await postFinalCelebrationCheck.page.waitForFunction(() =>
    document.documentElement.classList.contains("is-calendar-transition-new")
  );
  const calendarTransitionStart = await postFinalCelebrationCheck.page.evaluate(() => ({
    active: Boolean(document.activeViewTransition),
    dateLabel: document.querySelector("#day-label")?.textContent.trim() || "",
    duration: getComputedStyle(document.documentElement, "::view-transition-new(root)").animationDuration,
    rootTransitionName: getComputedStyle(document.documentElement).viewTransitionName,
    matchesTransitionName: getComputedStyle(document.querySelector("#matches-view")).viewTransitionName,
    headerTransitionName: getComputedStyle(document.querySelector(".site-header")).viewTransitionName,
    dateControlsTransitionName: getComputedStyle(
      document.querySelector("#matches-view .page-title")
    ).viewTransitionName,
    isContentTransition: document.documentElement.classList.contains("is-calendar-content-transition"),
    isSceneTransition: document.documentElement.classList.contains("is-calendar-scene-transition"),
    hasLegacyExitState: Boolean(
      document.querySelector(".final-celebration-banner.is-exiting, .match-list.is-date-transitioning, .match-info.is-exiting")
    )
  }));
  await postFinalCelebrationCheck.page.evaluate(() => document.activeViewTransition?.finished);
  const calendarTransitionEnd = await postFinalCelebrationCheck.page.evaluate(() => ({
    dateLabel: document.querySelector("#day-label")?.textContent.trim() || "",
    hasBanner: Boolean(document.querySelector("#final-celebration-banner")),
    hasTransitionScope: document.documentElement.classList.contains("is-calendar-date-transition"),
    headerTransitionName: getComputedStyle(document.querySelector(".site-header")).viewTransitionName,
    matchList: document.querySelector("#match-list")?.textContent.replace(/\s+/g, " ").trim() || "",
    urlDate: new URL(location.href).searchParams.get("date")
  }));
  assert(
    calendarTransitionStart.active &&
      calendarTransitionStart.dateLabel === "Jul 1" &&
      calendarTransitionStart.duration === "0.18s" &&
      calendarTransitionStart.rootTransitionName === "root" &&
      calendarTransitionStart.matchesTransitionName === "none" &&
      calendarTransitionStart.headerTransitionName === "calendar-header" &&
      calendarTransitionStart.dateControlsTransitionName === "none" &&
      !calendarTransitionStart.isContentTransition &&
      calendarTransitionStart.isSceneTransition &&
      !calendarTransitionStart.hasLegacyExitState &&
      calendarTransitionEnd.dateLabel === "Jul 1" &&
      !calendarTransitionEnd.hasBanner &&
      !calendarTransitionEnd.hasTransitionScope &&
      calendarTransitionEnd.headerTransitionName === "none" &&
      calendarTransitionEnd.matchList.includes("England") &&
      calendarTransitionEnd.urlDate === "2026-07-01",
    `Leaving the championship should use one short scene dissolve while the date controls and persistent chrome stay stable. Measured ${JSON.stringify({ start: calendarTransitionStart, end: calendarTransitionEnd })}.`
  );

  await postFinalCelebrationCheck.page.locator("#day-label").click();
  await postFinalCelebrationCheck.page
    .locator('#calendar-grid [data-day-key="2026-07-02"]')
    .click();
  await postFinalCelebrationCheck.page.waitForFunction(() =>
    document.querySelector("#day-label")?.textContent.trim() === "Jul 2" &&
    document.querySelector("#match-list")?.textContent.includes("Portugal")
  );
  const ordinaryDateChangeState = await postFinalCelebrationCheck.page.evaluate(() => ({
    active: Boolean(document.activeViewTransition),
    dateLabel: document.querySelector("#day-label")?.textContent.trim() || "",
    hasTransitionScope: document.documentElement.classList.contains("is-calendar-date-transition"),
    isContentTransition: document.documentElement.classList.contains("is-calendar-content-transition"),
    isSceneTransition: document.documentElement.classList.contains("is-calendar-scene-transition"),
    matchListOpacity: getComputedStyle(document.querySelector("#match-list")).opacity,
    matchListTransitionName: getComputedStyle(document.querySelector("#match-list")).viewTransitionName,
    matchList: document.querySelector("#match-list")?.textContent.replace(/\s+/g, " ").trim() || "",
    runningMatchListAnimations: document
      .querySelector("#match-list")
      ?.getAnimations()
      .filter((animation) => animation.playState === "running" || animation.playState === "pending")
      .length || 0,
    headerTransitionName: getComputedStyle(document.querySelector(".site-header")).viewTransitionName,
    urlDate: new URL(location.href).searchParams.get("date")
  }));
  assert(
    !ordinaryDateChangeState.active &&
      ordinaryDateChangeState.dateLabel === "Jul 2" &&
      !ordinaryDateChangeState.hasTransitionScope &&
      !ordinaryDateChangeState.isContentTransition &&
      !ordinaryDateChangeState.isSceneTransition &&
      ordinaryDateChangeState.matchListOpacity === "1" &&
      ordinaryDateChangeState.matchListTransitionName === "none" &&
      ordinaryDateChangeState.runningMatchListAnimations === 0 &&
      ordinaryDateChangeState.headerTransitionName === "none" &&
      ordinaryDateChangeState.matchList.includes("Portugal") &&
      ordinaryDateChangeState.urlDate === "2026-07-02",
    `Ordinary dates should replace their schedule immediately without a fade or view transition. Measured ${JSON.stringify(ordinaryDateChangeState)}.`
  );

  await postFinalCelebrationCheck.page.evaluate(() => {
    document.querySelector('[data-match-id="match-83-round-of-32-2026-07-02"] .match-row-trigger')?.click();
  });
  await postFinalCelebrationCheck.page.waitForFunction(() => {
    const info = document.querySelector("#match-info");
    return !info?.hidden && Boolean(info.querySelector(":scope > .match-info-content"));
  });
  const firstMatchInfoEntrance = await postFinalCelebrationCheck.page.evaluate(() => {
    const info = document.querySelector("#match-info");
    window.__stableMatchInfoShell = info;
    window.__stableMatchInfoClose = info?.querySelector(":scope > .match-info-close");
    const styles = info ? getComputedStyle(info) : null;
    return {
      animationDuration: styles?.animationDuration || "",
      entering: info?.classList.contains("is-entering") || false,
      hasContentWrapper: Boolean(info?.querySelector(":scope > .match-info-content")),
      hasCloseControl: Boolean(window.__stableMatchInfoClose)
    };
  });
  assert(
    firstMatchInfoEntrance.entering &&
      firstMatchInfoEntrance.animationDuration === "0.24s" &&
      firstMatchInfoEntrance.hasContentWrapper &&
      firstMatchInfoEntrance.hasCloseControl,
    `The first match-detail reveal should be one short, subtle shell entrance. Measured ${JSON.stringify(firstMatchInfoEntrance)}.`
  );

  await postFinalCelebrationCheck.page.evaluate(() => {
    document.querySelector('[data-match-id="match-84-round-of-32-2026-07-02"] .match-row-trigger')?.click();
  });
  await postFinalCelebrationCheck.page.waitForFunction(() =>
    document.documentElement.classList.contains("is-match-info-transition-new")
  );
  const matchInfoContentTransitionStart = await postFinalCelebrationCheck.page.evaluate(() => {
    const info = document.querySelector("#match-info");
    const close = info?.querySelector(":scope > .match-info-close");
    const content = info?.querySelector(":scope > .match-info-content");
    return {
      active: Boolean(document.activeViewTransition),
      duration: getComputedStyle(
        document.documentElement,
        "::view-transition-new(match-info-content-new)"
      ).animationDuration,
      rootTransitionName: getComputedStyle(document.documentElement).viewTransitionName,
      contentTransitionName: content ? getComputedStyle(content).viewTransitionName : "",
      entering: info?.classList.contains("is-entering") || false,
      shellStable: info === window.__stableMatchInfoShell,
      closeStable: close === window.__stableMatchInfoClose
    };
  });
  await postFinalCelebrationCheck.page.evaluate(() => document.activeViewTransition?.finished);
  const matchInfoContentTransitionEnd = await postFinalCelebrationCheck.page.evaluate(() => ({
    hasTransitionScope: document.documentElement.classList.contains("is-match-info-content-transition"),
    text: document.querySelector("#match-info")?.textContent.replace(/\s+/g, " ").trim() || ""
  }));
  assert(
    matchInfoContentTransitionStart.active &&
      matchInfoContentTransitionStart.duration === "0.16s" &&
      matchInfoContentTransitionStart.rootTransitionName === "none" &&
      matchInfoContentTransitionStart.contentTransitionName === "match-info-content-new" &&
      !matchInfoContentTransitionStart.entering &&
      matchInfoContentTransitionStart.shellStable &&
      matchInfoContentTransitionStart.closeStable &&
      !matchInfoContentTransitionEnd.hasTransitionScope &&
      matchInfoContentTransitionEnd.text.includes("Spain") &&
      matchInfoContentTransitionEnd.text.includes("Austria"),
    `Switching matches should dissolve only the inner details while the card shell and close control remain stable. Measured ${JSON.stringify({ start: matchInfoContentTransitionStart, end: matchInfoContentTransitionEnd })}.`
  );
  await postFinalCelebrationCheck.context.close();

  let releaseProgressiveCelebrationHistory;
  const progressiveCelebrationHistoryGate = new Promise((resolve) => {
    releaseProgressiveCelebrationHistory = resolve;
  });
  const progressiveCelebrationHistoricalProfileRequests = [];
  const progressiveCelebrationHistoryRequests = [];
  const progressiveCelebrationCheck = await openPageAtTime(
    "2026-07-20T19:30:00Z",
    "/?view=matches&tz=America%2FLos_Angeles",
    {
      desktopPointerMedia: true,
      beforePage: async (context) => {
        context.on("request", (request) => {
          if (/\/data\/historical-player-profiles\.json(?:\?|$)/.test(request.url())) {
            progressiveCelebrationHistoricalProfileRequests.push(request.url());
          }
        });
        await context.route("**/data/history.json*", async (route) => {
          progressiveCelebrationHistoryRequests.push(route.request().url());
          await progressiveCelebrationHistoryGate;
          await route.continue();
        });
      }
    }
  );
  await progressiveCelebrationCheck.page.waitForSelector("#final-celebration-banner", {
    state: "visible"
  });
  const progressiveCelebrationInitialState = await progressiveCelebrationCheck.page.evaluate(() => ({
    bulletCount: document.querySelectorAll(
      "#final-celebration-banner .final-celebration-bullets li"
    ).length,
    hasCelebration: document.body.classList.contains("has-final-celebration"),
    headline:
      document.querySelector("#final-celebration-banner .final-celebration-headline")
        ?.textContent.trim() || ""
  }));
  assert(
    progressiveCelebrationInitialState.hasCelebration &&
      progressiveCelebrationInitialState.headline === "Spain are 2026 world champions" &&
      progressiveCelebrationInitialState.bulletCount === 3 &&
      progressiveCelebrationHistoricalProfileRequests.length === 0 &&
      progressiveCelebrationHistoryRequests.length === 0,
    `The championship cover should render its essential content without waiting for full archive history or historical player profiles. Measured ${JSON.stringify({
      ...progressiveCelebrationInitialState,
      historyRequests: progressiveCelebrationHistoryRequests.length,
      historicalProfileRequests: progressiveCelebrationHistoricalProfileRequests.length
    })}.`
  );

  releaseProgressiveCelebrationHistory();
  assert(
    progressiveCelebrationHistoricalProfileRequests.length === 0 &&
      progressiveCelebrationHistoryRequests.length === 0,
    "The passive championship cover should not load aggregate archive history or historical player profiles."
  );
  await progressiveCelebrationCheck.context.close();

  const reducedMotionEntranceCheck = await openPageAtTime(
    "2026-07-20T19:30:00Z",
    "/?view=matches&tz=America%2FLos_Angeles",
    { contextOptions: { reducedMotion: "reduce" } }
  );
  await reducedMotionEntranceCheck.page.waitForFunction(() =>
    [
      "#final-celebration-banner",
      "#matches-view .page-title",
      "#match-list > .empty-state",
      "#match-list > .yesterday-section"
    ].every((selector) => document.querySelector(selector))
  );
  const reducedMotionEntranceState = await reducedMotionEntranceCheck.page.evaluate(() => {
    const elements = [
      document.querySelector("#final-celebration-banner"),
      document.querySelector("#matches-view .page-title"),
      document.querySelector("#match-list > .empty-state"),
      document.querySelector("#match-list > .yesterday-section")
    ];
    return {
      activeAnimationCounts: elements.map((element) =>
        element
          ? element.getAnimations().filter((animation) =>
              animation.playState === "running" || animation.playState === "pending"
            ).length
          : -1
      ),
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      opacities: elements.map((element) => element ? getComputedStyle(element).opacity : "missing"),
      transforms: elements.map((element) => element ? getComputedStyle(element).transform : "missing"),
      transitionDurations: elements.map(
        (element) => element ? getComputedStyle(element).transitionDuration : "missing"
      )
    };
  });
  assert(
    reducedMotionEntranceState.reduced &&
      reducedMotionEntranceState.opacities.every((opacity) => opacity === "1") &&
      reducedMotionEntranceState.transforms.every((transform) => transform === "none") &&
      reducedMotionEntranceState.activeAnimationCounts.every((count) => count === 0),
    `Reduced-motion visitors should see the complete first-load page immediately. Measured ${JSON.stringify(reducedMotionEntranceState)}.`
  );
  await reducedMotionEntranceCheck.page.locator("#day-label").click();
  await reducedMotionEntranceCheck.page
    .locator('#calendar-grid [data-day-key="2026-07-01"]')
    .click();
  const reducedMotionDateChange = await reducedMotionEntranceCheck.page.evaluate(() => ({
    activeTransition: Boolean(document.activeViewTransition),
    dateLabel: document.querySelector("#day-label")?.textContent.trim() || "",
    matchList: document.querySelector("#match-list")?.textContent.replace(/\s+/g, " ").trim() || ""
  }));
  assert(
    !reducedMotionDateChange.activeTransition &&
      reducedMotionDateChange.dateLabel === "Jul 1" &&
      reducedMotionDateChange.matchList.includes("England"),
    `Reduced-motion date changes should update immediately without a view transition. Measured ${JSON.stringify(reducedMotionDateChange)}.`
  );
  await reducedMotionEntranceCheck.context.close();

  const postFinalMobileCalendarCheck = await openPageAtTime(
    "2026-07-20T19:30:00Z",
    "/?view=matches&tz=America%2FLos_Angeles",
    { contextOptions: { viewport: { width: 430, height: 732 } } }
  );
  const postFinalMobileRecapLayout = await postFinalMobileCalendarCheck.page.evaluate(() => {
    const banner = document.querySelector("#final-celebration-banner");
    const emptyState = document.querySelector("#match-list > .empty-state");
    const message = emptyState?.querySelector(".empty-state-post-tournament-description");
    const recapLink = emptyState?.querySelector(".empty-state-recap-action");
    const emptyBounds = emptyState?.getBoundingClientRect();
    const messageBounds = message?.getBoundingClientRect();
    const linkBounds = recapLink?.getBoundingClientRect();
    return {
      belowMessage: Boolean(messageBounds && linkBounds && linkBounds.top >= messageBounds.bottom + 12),
      hasBannerLink: Boolean(banner?.querySelector(".final-celebration-awards-link")),
      hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
      leftAligned: Boolean(emptyBounds && linkBounds && Math.abs(emptyBounds.left - linkBounds.left) <= 1),
      label: recapLink?.textContent.trim() || "",
      height: linkBounds?.height || 0,
      width: linkBounds?.width || 0
    };
  });
  assert(
    postFinalMobileRecapLayout.belowMessage &&
      !postFinalMobileRecapLayout.hasBannerLink &&
      !postFinalMobileRecapLayout.hasOverflow &&
      postFinalMobileRecapLayout.leftAligned &&
      postFinalMobileRecapLayout.label === "View highlights" &&
      postFinalMobileRecapLayout.height === 34 &&
      postFinalMobileRecapLayout.width >= 76 &&
      postFinalMobileRecapLayout.width <= 130,
    `The compact post-tournament empty state should place a right-sized View highlights action below its message. Measured ${JSON.stringify(postFinalMobileRecapLayout)}.`
  );
  await postFinalMobileCalendarCheck.page.locator("#day-label").click();
  const postFinalCalendarLayerState = await postFinalMobileCalendarCheck.page.evaluate(() => {
    const calendar = document.querySelector("#date-popover");
    const footer = document.querySelector(".site-footer");
    const pageShell = document.querySelector(".page-shell");
    const calendarBounds = calendar?.getBoundingClientRect();
    const footerBounds = footer?.getBoundingClientRect();
    const overlapPoint = calendarBounds && footerBounds
      ? {
          x: Math.max(calendarBounds.left, footerBounds.left) + 12,
          y: Math.max(calendarBounds.top, footerBounds.top) + 8
        }
      : null;
    const topElement = overlapPoint
      ? document.elementFromPoint(overlapPoint.x, overlapPoint.y)
      : null;

    return {
      calendarBottom: calendarBounds?.bottom ?? null,
      footerTop: footerBounds?.top ?? null,
      overlapsFooter: Boolean(
        calendarBounds && footerBounds && calendarBounds.bottom > footerBounds.top
      ),
      overlapTopElementInsideCalendar: Boolean(topElement?.closest("#date-popover")),
      pageShellLayer: Number.parseInt(getComputedStyle(pageShell).zIndex, 10),
      footerLayer: Number.parseInt(getComputedStyle(footer).zIndex, 10)
    };
  });
  assert(
    postFinalCalendarLayerState.pageShellLayer > postFinalCalendarLayerState.footerLayer &&
      (
        !postFinalCalendarLayerState.overlapsFooter ||
        postFinalCalendarLayerState.overlapTopElementInsideCalendar
      ),
    `The open mobile calendar should paint above the championship footer wherever their bounds overlap. Measured ${JSON.stringify(postFinalCalendarLayerState)}.`
  );
  await postFinalMobileCalendarCheck.context.close();

  const finalCelebrationLocaleCases = [
    {
      recapLabel: "查看亮点",
      body: "西班牙在决赛中以1-0击败阿根廷。",
      headline: "西班牙成为2026年世界杯冠军",
      history: "2010年",
      language: "zh",
      philosophy: "西班牙的理念是控球：掌控球权、拉开场地宽度，并在丢球后立即合围反抢。"
    },
    {
      recapLabel: "Ver momentos destacados",
      body: "España venció 1-0 a Argentina en la final.",
      headline: "España gana el Mundial de 2026",
      history: "2010",
      language: "es",
      philosophy: "La filosofía de España es la posesión: conservar el balón, estirar el campo y rodear al rival en cuanto lo pierde."
    },
    {
      recapLabel: "하이라이트 보기",
      body: "스페인이 결승에서 아르헨티나를 1-0으로 꺾었다.",
      headline: "스페인이 2026년 세계 챔피언에 올랐다",
      history: "2010년",
      language: "ko",
      philosophy: "스페인의 철학은 점유다: 공을 소유하고 경기장을 넓게 쓰며 공을 잃는 순간 상대를 에워싸 압박한다."
    }
  ];
  for (const localeCase of finalCelebrationLocaleCases) {
    const localeCheck = await openPageAtTime(
      "2026-07-20T19:30:00Z",
      `/?view=matches&tz=America%2FLos_Angeles&lang=${localeCase.language}`
    );
    await localeCheck.page.waitForFunction(
      ({ recapLabel, body, headline, history, language, philosophy }) => {
        const banner = document.querySelector("#final-celebration-banner");
        const recapLink = document.querySelector("#match-list > .empty-state .empty-state-recap-action");
        const bullets = [...(banner?.querySelectorAll(".final-celebration-bullets li") || [])]
          .map((item) => item.innerText.trim());
        return (
          banner?.querySelector(".final-celebration-headline")?.textContent.trim() === headline &&
          !banner.querySelector(".final-celebration-summary") &&
          !banner.querySelector(".final-celebration-awards-link") &&
          recapLink?.textContent.trim() === recapLabel &&
          recapLink?.getAttribute("href") === `highlights.html?lang=${language}` &&
          bullets.length === 3 &&
          bullets[0] === body &&
          bullets[1].includes(history) &&
          bullets[2] === philosophy
        );
      },
      localeCase
    );
    await localeCheck.context.close();
  }

  const celebrationLastDayCheck = await openPageAtTime(
    "2026-08-02T19:30:00Z",
    "/?view=matches&tz=America%2FLos_Angeles"
  );
  const celebrationLastDayState = await celebrationLastDayCheck.page.evaluate(() => ({
    hasCelebration: document.body.classList.contains("has-final-celebration"),
    isCalm: document.body.classList.contains("is-final-celebration-calm"),
    message: document.querySelector(".empty-state-post-tournament-description")?.textContent.trim() || ""
  }));
  assert(
    celebrationLastDayState.hasCelebration &&
      !celebrationLastDayState.isCalm &&
      celebrationLastDayState.message === "The 2026 World Cup is over.",
    `August 2 should remain the final day of the full champion celebration. Measured ${JSON.stringify(celebrationLastDayState)}.`
  );
  await celebrationLastDayCheck.context.close();

  const calmArchiveCheck = await openPageAtTime(
    "2026-08-03T19:30:00Z",
    "/?view=matches&tz=America%2FLos_Angeles"
  );
  const calmArchiveState = await calmArchiveCheck.page.evaluate(() => ({
    hasBackground: Boolean(document.querySelector("#final-celebration-background")),
    hasBanner: Boolean(document.querySelector("#final-celebration-banner")),
    hasCelebration: document.body.classList.contains("has-final-celebration"),
    message: document.querySelector(".empty-state-post-tournament-description")?.textContent.trim() || ""
  }));
  assert(
    !calmArchiveState.hasCelebration &&
      !calmArchiveState.hasBanner &&
      !calmArchiveState.hasBackground &&
      calmArchiveState.message === "The 2026 World Cup is over.",
    `From August 3 onward, the cover and motion should leave while the calm archive guidance remains. Measured ${JSON.stringify(calmArchiveState)}.`
  );
  await calmArchiveCheck.context.close();

  const postTournamentLocaleCases = [
    { action: "查看亮点", language: "zh", message: "2026年世界杯已结束。" },
    { action: "Ver momentos destacados", language: "es", message: "El Mundial 2026 ha terminado." },
    { action: "하이라이트 보기", language: "ko", message: "2026 월드컵이 끝났습니다." }
  ];
  for (const localeCase of postTournamentLocaleCases) {
    const localeCheck = await openPageAtTime(
      "2026-08-03T19:30:00Z",
      `/?view=matches&tz=America%2FLos_Angeles&lang=${localeCase.language}`
    );
    await localeCheck.page.waitForFunction(
      ({ action, language, message }) =>
        document.querySelector(".empty-state-post-tournament-description")?.textContent.trim() === message &&
        document.querySelector(".empty-state-recap-action")?.textContent.trim() === action &&
        document.querySelector(".empty-state-recap-action")?.getAttribute("href") === `highlights.html?lang=${language}` &&
        !document.querySelector("[data-select-final-match]"),
      localeCase
    );
    await localeCheck.context.close();
  }

  const historicalProfileLoadingContext = await browser.newContext();
  let historicalProfileLoadingRequestCount = 0;
  let releaseHistoricalProfiles;
  const historicalProfilesDelay = new Promise((resolve) => {
    releaseHistoricalProfiles = resolve;
  });
  await historicalProfileLoadingContext.route("**/data/historical-player-profiles.json*", async (route) => {
    historicalProfileLoadingRequestCount += 1;
    await historicalProfilesDelay;
    await route.continue();
  });
  const historicalProfileLoadingPage = await historicalProfileLoadingContext.newPage();
  await historicalProfileLoadingPage.goto(`${baseUrl}?view=matches&date=2022-11-20&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await historicalProfileLoadingPage.waitForSelector(
    '[data-match-id="wc-2022-2022-11-20-matchday-1-qatar-ecuador"]'
  );
  await historicalProfileLoadingPage
    .locator('[data-match-id="wc-2022-2022-11-20-matchday-1-qatar-ecuador"]')
    .click();
  const pendingHistoricalCard = historicalProfileLoadingPage
    .locator("#match-info .player-card.is-profile-loading[aria-busy='true']")
    .first();
  await pendingHistoricalCard.waitFor({ state: "attached" });
  const pendingHistoricalCardState = await pendingHistoricalCard.evaluate((card) => ({
    busy: card.getAttribute("aria-busy"),
    hasPhotoSkeleton: Boolean(card.querySelector(".player-photo-loading")),
    hasPositionSkeleton: Boolean(card.querySelector(".player-card-loading-position")),
    hasClubSkeleton: Boolean(card.querySelector(".player-card-loading-club")),
    loadingPills: card.querySelectorAll(".player-card-loading-pill").length,
    text: card.textContent.replace(/\s+/g, " ").trim()
  }));
  assert(
    pendingHistoricalCardState.busy === "true" &&
      pendingHistoricalCardState.hasPhotoSkeleton &&
      pendingHistoricalCardState.hasPositionSkeleton &&
      pendingHistoricalCardState.hasClubSkeleton &&
      pendingHistoricalCardState.loadingPills === 2 &&
      pendingHistoricalCardState.text.includes("Enner Valencia") &&
      !pendingHistoricalCardState.text.includes("Position to verify") &&
      !pendingHistoricalCardState.text.includes("World Cup archive"),
    `Historical cards should show a tiny skeleton state while archive profiles lazy-load. Measured ${JSON.stringify(pendingHistoricalCardState)}.`
  );
  releaseHistoricalProfiles();
  await historicalProfileLoadingPage.waitForFunction(() =>
    [...document.querySelectorAll("#match-info .player-card")].some((card) =>
      !card.classList.contains("is-profile-loading") &&
        card.getAttribute("aria-busy") !== "true" &&
        card.textContent.includes("Fenerbahçe") &&
        card.textContent.includes("At the 2022 World Cup")
    )
  );
  assert(
    historicalProfileLoadingRequestCount === 1,
    "Concurrent historical player cards should share one lazy profile-data request within an app lifecycle."
  );
  await historicalProfileLoadingContext.close();

  const currentProfilePreloadContext = await browser.newContext();
  const currentProfilePreloadRequests = [];
  currentProfilePreloadContext.on("request", (request) => {
    if (/\/data\/historical-player-profiles\.json(?:\?|$)/.test(request.url())) {
      currentProfilePreloadRequests.push(request.url());
    }
  });
  const currentProfilePreloadPage = await currentProfilePreloadContext.newPage();
  await currentProfilePreloadPage.goto(
    `${baseUrl}?view=matches&date=2026-07-18&tz=America%2FLos_Angeles`,
    { waitUntil: "load" }
  );
  await currentProfilePreloadPage.waitForFunction(() => {
    const matchList = document.querySelector("#match-list");
    return matchList && !matchList.hasAttribute("aria-busy") && matchList.querySelector(".match-row");
  });
  await currentProfilePreloadPage.waitForTimeout(250);
  assert(
    currentProfilePreloadRequests.length === 0,
    "Plain current schedule browsing should not preload the historical player profile dataset."
  );
  await currentProfilePreloadContext.close();
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
  await page.waitForFunction(() =>
    [...document.querySelectorAll("#match-info .player-card")].some((card) =>
      card.textContent.includes("Fenerbahçe") &&
        card.textContent.includes("At the 2022 World Cup")
    )
  );
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
      historicalGroupDetailText.includes("Past World Cup meetings"),
    "Historical match details should follow the current detail section structure."
  );
  assert(
    historicalGroupDetailText.includes("Ecuador beat Qatar 2-0") &&
      historicalGroupDetailText.includes("Enner Valencia put Ecuador ahead early") &&
      historicalGroupDetailText.includes("Enner Valencia scored twice as Ecuador kept widening the gap") &&
      !historicalGroupDetailText.includes("Ecuador took three points from World Cup 2022 / Group A"),
    "Historical result details should summarize the archived final score with authored story bullets instead of points fallback."
  );
  const historicalResultHighlights = await page
    .locator("#match-info .result-highlights li")
    .evaluateAll((items) => items.map((item) => {
      const clone = item.cloneNode(true);
      clone.querySelectorAll(".player-card").forEach((card) => card.remove());
      return clone.textContent.replace(/\s+/g, " ").trim();
    }));
  const historicalScorerHighlight = await page.locator("#match-info .scorer-highlight").evaluate((item) => {
    const segments = [...item.querySelectorAll(".goal-scorer-segment")];
    return {
      hasStandaloneSoccerIcon: [...item.children].some((child) => child.textContent.trim() === "⚽"),
      segmentFlags: segments.map((segment) => {
        const flag = segment.querySelector(".goal-scorer-flag .flag");
        return {
          label: flag?.getAttribute("aria-label") || "",
          hasFlag: Boolean(flag)
        };
      }),
      segmentTexts: segments.map((segment) => segment.textContent.replace(/\s+/g, " ").trim())
    };
  });
  assert(
    !historicalScorerHighlight.hasStandaloneSoccerIcon &&
      historicalScorerHighlight.segmentFlags.every(
        (flag) => flag.hasFlag && flag.label === "Ecuador flag"
      ) &&
      historicalScorerHighlight.segmentTexts.some((text) => text.includes("16' Enner Valencia")) &&
      historicalScorerHighlight.segmentTexts.some((text) => text.includes("31' Enner Valencia")),
    "Historical result details should show full-strength country flags before archived scorer names and minutes."
  );
  assert(
    (await page.locator("#match-info .scorer-highlight .player-link", { hasText: "Enner Valencia" }).count()) === 2,
    "Historical scorer names should expose player-card triggers."
  );
  const historicalKeyInformationPlayerLinks = await page
    .locator("#match-info .key-info-team .player-link")
    .allTextContents();
  assert(
    historicalKeyInformationPlayerLinks.length >= 5 &&
      historicalKeyInformationPlayerLinks.includes("Akram Afif") &&
      historicalKeyInformationPlayerLinks.includes("Enner Valencia"),
    `Historical key information should expose era-specific key-player card triggers. Measured ${JSON.stringify(historicalKeyInformationPlayerLinks)}.`
  );
  const historicalMentionCommaGap = await page
    .locator("#match-info .key-info-team")
    .first()
    .locator("p")
    .evaluate((paragraph) => {
      const link = [...paragraph.querySelectorAll(".player-link")].find((candidate) => {
        const nextText = candidate.closest(".player-hover")?.nextSibling;
        return nextText?.nodeType === Node.TEXT_NODE && nextText.textContent.startsWith(",");
      });
      const nextText = link?.closest(".player-hover")?.nextSibling;

      if (!link || nextText?.nodeType !== Node.TEXT_NODE || !nextText.textContent.startsWith(",")) {
        return null;
      }

      const commaRange = document.createRange();
      commaRange.setStart(nextText, 0);
      commaRange.setEnd(nextText, 1);

      return commaRange.getBoundingClientRect().left - link.getBoundingClientRect().right;
    });
  assert(
    historicalMentionCommaGap === null ||
      (historicalMentionCommaGap >= 0 && historicalMentionCommaGap < 1),
    "Player-card mentions should not insert spaces before comma punctuation."
  );
  await assertPlayerCardTriggersStayInternal(
    page.locator("#match-info"),
    "Historical archive player-card triggers should not navigate to source pages."
  );
  const historicalScorerLink = page.locator("#match-info .scorer-highlight .player-link", { hasText: "Enner Valencia" }).first();
  const historicalScorerTriggerMeta = await historicalScorerLink.evaluate((trigger) => ({
    cardTrigger: trigger.getAttribute("data-player-card-trigger") || "",
    href: trigger.getAttribute("href") || "",
    tagName: trigger.tagName
  }));
  assert(
    historicalScorerTriggerMeta.tagName === "SPAN" &&
      historicalScorerTriggerMeta.cardTrigger === "true" &&
      historicalScorerTriggerMeta.href === "",
    `Historical archive player-card triggers should not navigate to the raw dataset. Measured ${JSON.stringify(historicalScorerTriggerMeta)}.`
  );
  await historicalScorerLink.focus();
  await page.keyboard.press("Enter");
  const historicalScorerCard = page.locator(".player-card:visible").first();
  await historicalScorerCard.waitFor({ state: "visible" });
  const historicalScorerCardText = await historicalScorerCard.innerText();
  assert(
      historicalScorerCardText.includes("Enner Valencia") &&
      historicalScorerCardText.includes("Forward") &&
      historicalScorerCardText.includes("Fenerbahçe") &&
      historicalScorerCardText.includes(
        "With Valencia, start with finding the inside channel without crowding the central attacker."
      ) &&
      historicalScorerCardText.includes(
        "He threatens outside before cutting behind midfield."
      ) &&
      historicalScorerCardText.includes("2022 World Cup: 3 goals") &&
      historicalScorerCardText.includes("Age 33") &&
      historicalScorerCardText.includes("Peak value €11m") &&
      historicalScorerCardText.includes("At the 2022 World Cup") &&
      !historicalScorerCardText.includes("Qatar (2-0 win)") &&
      !historicalScorerCardText.includes("scored 2 goals in this match"),
    "Historical player cards should separate evergreen play-style copy from the fixed year-labeled stat row."
  );
  const historicalNarrativeHighlights = historicalResultHighlights.filter(
    (text) => !text.includes("16' Enner Valencia") && !text.includes("31' Enner Valencia")
  );
  assert(
    historicalNarrativeHighlights.length >= 3 &&
      historicalNarrativeHighlights.every((text) => text.length <= 160) &&
      historicalNarrativeHighlights.every((text) => !/^(?:⚽|🔥|🛡️|🧤|🌟|📊)/u.test(text)) &&
      historicalNarrativeHighlights.some((text) => text.includes("Enner Valencia scored twice")),
    "Historical result bullets should stay compact and use plain authored story copy."
  );
  assert(
    !historicalGroupDetailText.includes("Archived result shown instead of a pre-match probability"),
    "Historical match details should use the back-then prediction card instead of the archive-only result copy."
  );
  const historicalKeyInformationParagraphs = await page
    .locator("#match-info .key-info-team p")
    .allInnerTexts();
  const qatarHistoricalKeyInformation = historicalKeyInformationParagraphs[0] || "";
  const ecuadorHistoricalKeyInformation = historicalKeyInformationParagraphs[1] || "";
  assert(
    historicalKeyInformationParagraphs.length === 2 &&
      historicalKeyInformationParagraphs.every((paragraph) =>
        paragraph.split(/(?<=[.!?])\s+/).filter(Boolean).length === 4
      ) &&
      qatarHistoricalKeyInformation.includes("Félix Sánchez selects a Qatar XI") &&
      qatarHistoricalKeyInformation.includes("Qatar start Akram Afif and Almoez Ali in attack") &&
      qatarHistoricalKeyInformation.includes("Ecuador's confirmed XI contains 4 defenders") &&
      qatarHistoricalKeyInformation.includes("Ecuador start Michael Estrada and Enner Valencia in attack") &&
      ecuadorHistoricalKeyInformation.includes("Gustavo Alfaro selects an Ecuador XI") &&
      ecuadorHistoricalKeyInformation.includes("Ecuador start Michael Estrada and Enner Valencia in attack") &&
      ecuadorHistoricalKeyInformation.includes("Qatar's confirmed XI contains 5 defenders") &&
      ecuadorHistoricalKeyInformation.includes("Qatar start Akram Afif and Almoez Ali in attack") &&
      !/contest central space|tracks .*runs|connect the phases/i.test(historicalGroupDetailText) &&
      !historicalGroupDetailText.includes("2022 match lens") &&
      !historicalGroupDetailText.includes("actual match roster") &&
      !historicalGroupDetailText.includes("0-2 loss"),
    `Historical key information should render two four-sentence, lineup-backed pre-match briefs without result hindsight. Measured ${JSON.stringify(historicalKeyInformationParagraphs)}.`
  );
  assert(
    !historicalGroupDetailText.includes("Source") && !historicalGroupDetailText.includes("Goals"),
    "Historical match details should not show source or goals sections."
  );

  for (const language of ["en", "zh", "es", "ko"]) {
    await page.goto(
      `${baseUrl}?view=matches&date=1950-07-16&lang=${language}&tz=America%2FLos_Angeles`,
      { waitUntil: "load" }
    );
    await page.waitForSelector('[data-match-id="wc-1950-1950-07-16-final-round-uruguay-brazil"]');
    await page.locator('[data-match-id="wc-1950-1950-07-16-final-round-uruguay-brazil"]').click();
    const historicalContextKeyInfo = await page.locator("#match-info .key-info-grid").evaluate((grid) => ({
      homeText: grid.querySelector(".key-info-team p")?.textContent.replace(/\s+/g, " ").trim() || "",
      playerLinks: grid.querySelectorAll(".key-info-team p .player-link").length
    }));
    assert(
      historicalContextKeyInfo.homeText.includes("Juan López") && historicalContextKeyInfo.playerLinks === 0,
      `Historical-context Key information must keep manager Juan López as plain text with no player links in ${language}. Measured ${JSON.stringify(historicalContextKeyInfo)}.`
    );
  }

  await page.goto(`${baseUrl}?view=matches&date=1982-06-29&lang=en&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="wc-1982-1982-06-29-matchday-4-italy-argentina"]');
  await page.locator('[data-match-id="wc-1982-1982-06-29-matchday-4-italy-argentina"]').click();
  await page.waitForSelector("#match-info .key-info-team h4");
  const italyArgentinaHistoricalHeadings = (await page.locator("#match-info .key-info-team h4").allInnerTexts())
    .map(normalizeFlaggedText);
  const italyHistoricalHeading = italyArgentinaHistoricalHeadings.find((heading) => heading.startsWith("Italy")) || "";
  const argentinaHistoricalHeading = italyArgentinaHistoricalHeadings.find((heading) => heading.startsWith("Argentina")) || "";
  assert(
    /^Italy: \S/.test(italyHistoricalHeading) &&
      italyHistoricalHeading.includes("Possession patience") &&
      italyHistoricalHeading.includes("box entries") &&
      /^Argentina: \S/.test(argentinaHistoricalHeading) &&
      !argentinaHistoricalHeading.includes("Pressing forwards and midfield control protect the rhythm"),
    `Historical key-information headings should use team-style titles, not plain country names or current-team taglines. Measured ${JSON.stringify(italyArgentinaHistoricalHeadings)}.`
  );
  assert(
    !/\b(?:held|could not|not enough|win|loss|result)\b/i.test(italyArgentinaHistoricalHeadings.join(" ")),
    `Historical key-information headings should describe team style, not match outcome. Measured ${JSON.stringify(italyArgentinaHistoricalHeadings)}.`
  );
  assert(
    !/Marco Tardelli|Antonio Cabrini|Daniel Passarella|Américo Gallego|Daniel Bertoni/.test(
      italyArgentinaHistoricalHeadings.join(" ")
    ),
    `Historical key-information headings should stay player-name-free. Measured ${JSON.stringify(italyArgentinaHistoricalHeadings)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=1978-06-25&lang=en&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.mouse.move(0, 0);
  await page.waitForFunction(
    () => !document.querySelector(".player-card-floating.is-visible")
  );
  await page.locator('[data-match-id="wc-1978-1978-06-25-final-netherlands-argentina"]').click();
  const firstEligibleShootoutTieTooltip = await page
    .locator("#match-info .match-prediction-block .prediction-row")
    .nth(1)
    .getAttribute("data-tooltip");
  assert(
    firstEligibleShootoutTieTooltip ===
      "If it goes to penalties, it would be a first World Cup shootout for both Netherlands and Argentina.",
    `The 1978 final should include shootout context because the tiebreak was available, even though it was not needed. Measured ${firstEligibleShootoutTieTooltip}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=1982-07-08&lang=en&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.locator('[data-match-id="wc-1982-1982-07-08-semi-finals-west-germany-france"]').click();
  const firstWorldCupShootoutTieRow = await page
    .locator("#match-info .match-prediction-block .prediction-row")
    .nth(1)
    .evaluate((row) => ({
      label: row.querySelector(".prediction-label")?.textContent.trim() || "",
      tooltip: row.getAttribute("data-tooltip") || "",
      hasTooltip: row.classList.contains("has-label-tooltip"),
      tabIndex: row.getAttribute("tabindex") || ""
    }));
  assert(
    firstWorldCupShootoutTieRow.label === "Tie" &&
      firstWorldCupShootoutTieRow.tooltip ===
        "If it goes to penalties, it would be a first World Cup shootout for both West Germany and France." &&
      firstWorldCupShootoutTieRow.hasTooltip &&
      firstWorldCupShootoutTieRow.tabIndex === "0",
    `The first historical shootout forecast should use only the record known before kickoff and expose an accessible Tie tooltip. Measured ${JSON.stringify(firstWorldCupShootoutTieRow)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=1930-07-30&lang=en&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  const scaronePhilosophyLink = page.locator(
    "#final-celebration-banner .final-celebration-bullets li:nth-child(3) .player-link"
  );
  await scaronePhilosophyLink.waitFor({ state: "visible" });
  const scaronePhilosophyLinkState = await scaronePhilosophyLink.evaluate((link) => ({
    ariaLabel: link.getAttribute("aria-label") || "",
    hasPlayerLinkClass: link.classList.contains("player-link"),
    role: link.getAttribute("role") || "",
    text: link.textContent.trim()
  }));
  assert(
    scaronePhilosophyLinkState.text === "Scarone" &&
      scaronePhilosophyLinkState.ariaLabel.startsWith("Héctor Scarone:") &&
      scaronePhilosophyLinkState.hasPlayerLinkClass &&
      scaronePhilosophyLinkState.role === "button",
    `The 1930 philosophy should link its short Scarone mention to Héctor Scarone. Measured ${JSON.stringify(scaronePhilosophyLinkState)}.`
  );

  const finalCelebrationAuthoredPlayerCases = [
    {
      date: "1958-06-29",
      expectedCardNote:
        "Making the wide defender guard more than one route defines the way Garrincha plays. Look for how he takes the first touch away from the full-back's strongest challenge. Separately, he reaches the byline with enough control to pick a cutback target.",
      expectedCardPosition: "Right winger",
      expectedLinks: ["Pelé", "Garrincha"],
      playerName: "Garrincha",
      year: 1958
    },
    {
      date: "1974-07-07",
      expectedCardNote:
        "What separates Beckenbauer is stepping beyond the first pressure to change the point of attack. Beckenbauer uses the next simple pass to settle the line after a sudden setback. Separately, he holds the dangerous lane until a teammate can pressure the ball.",
      expectedCardPosition: "Centre-back",
      expectedLinks: ["Beckenbauer", "Müller"],
      playerName: "Beckenbauer",
      year: 1974
    }
  ];
  for (const playerCase of finalCelebrationAuthoredPlayerCases) {
    await page.goto(
      `${baseUrl}?view=matches&date=${playerCase.date}&lang=en&tz=America%2FLos_Angeles`,
      { waitUntil: "load" }
    );
    const philosophyLinks = page.locator(
      "#final-celebration-banner .final-celebration-bullets li:nth-child(3) .player-link"
    );
    await philosophyLinks.first().waitFor({ state: "visible" });
    const linkedNames = await philosophyLinks.allTextContents();
    assert(
      linkedNames.join("|") === playerCase.expectedLinks.join("|"),
      `The ${playerCase.year} philosophy should link every authored player name. Measured ${JSON.stringify(linkedNames)}.`
    );
    const authoredPlayerLink = philosophyLinks.filter({ hasText: playerCase.playerName });
    const canonicalProfileCard = authoredPlayerLink
      .locator("xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' player-hover ')][1]")
      .locator(".player-card");
    await canonicalProfileCard.locator(".player-card-position").waitFor({ state: "attached" });
    await authoredPlayerLink.click();
    await page.waitForFunction(
      ({ expectedCardNote, expectedCardPosition, playerName }) => {
        const playerLink = [...document.querySelectorAll(
          "#final-celebration-banner .final-celebration-bullets li:nth-child(3) .player-link"
        )].find((link) => link.textContent.trim() === playerName);
        const sourceCard = playerLink?.closest(".player-hover")?.querySelector(".player-card");
        const floatingCard = document.querySelector(".player-card-floating.is-visible");
        return [sourceCard, floatingCard].some((card) =>
          card?.querySelector(".player-card-position")?.textContent.trim() === expectedCardPosition &&
          card?.querySelector(".player-card-note")?.textContent.trim() === expectedCardNote
        );
      },
      playerCase
    );
    const canonicalProfileCardState = await canonicalProfileCard.evaluate((card) => ({
      note: card.querySelector(".player-card-note")?.textContent.trim() || "",
      position: card.querySelector(".player-card-position")?.textContent.trim() || ""
    }));
    assert(
      canonicalProfileCardState.note === playerCase.expectedCardNote &&
        canonicalProfileCardState.position === playerCase.expectedCardPosition,
      `The ${playerCase.year} final-celebration card for ${playerCase.playerName} should replace its immediate fallback with the canonical historical play-style profile. Measured ${JSON.stringify(canonicalProfileCardState)}.`
    );
  }

  await page.goto(`${baseUrl}?view=matches&date=2022-12-18&lang=en&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector("#final-celebration-background .final-firework");
  const argentina2022Celebration = await page.evaluate(() => {
    const firework = document.querySelector("#final-celebration-background .final-firework");
    return {
      fireworkAnimation: firework ? getComputedStyle(firework, "::after").animationName : "",
      fireworkColor: firework ? getComputedStyle(firework, "::after").backgroundColor : "",
      fireworkCount: document.querySelectorAll("#final-celebration-background .final-firework").length,
      isCalm: document.body.classList.contains("is-final-celebration-calm"),
      palette: document.body.dataset.finalCelebrationPalette || ""
    };
  });
  assert(
    !argentina2022Celebration.isCalm &&
      argentina2022Celebration.palette === "argentina" &&
      argentina2022Celebration.fireworkCount === 6 &&
      argentina2022Celebration.fireworkAnimation === "final-firework-core" &&
      argentina2022Celebration.fireworkColor === "rgb(112, 188, 227)",
    `Historical final days should replay the winner-colored fireworks. Measured ${JSON.stringify(argentina2022Celebration)}.`
  );
  const argentina2022Style = await page
    .locator("#final-celebration-banner .final-celebration-bullets li")
    .nth(2)
    .innerText();
  assert(
    argentina2022Style ===
      "Argentina's philosophy was adaptability: free Messi, win the midfield battles and change shape whenever the match demanded it.",
    `The 2022 champion story should describe that Argentina side instead of reusing a country-level template. Measured ${argentina2022Style}.`
  );
  const argentina2022BannerLink = page.locator(
    "#final-celebration-banner .final-celebration-link"
  );
  const argentina2022BannerLinkState = await page.evaluate(() => {
    const banner = document.querySelector("#final-celebration-banner");
    const link = banner?.querySelector(".final-celebration-link");
    const copy = banner?.querySelector(".final-celebration-copy");
    const playerLink = banner?.querySelector(".player-link");
    const bannerBounds = banner?.getBoundingClientRect();
    const linkBounds = link?.getBoundingClientRect();
    return {
      ariaLabel: link?.getAttribute("aria-label") || "",
      copyPointerEvents: copy ? getComputedStyle(copy).pointerEvents : "",
      coversBanner: Boolean(
        bannerBounds &&
        linkBounds &&
        Math.abs(bannerBounds.width - linkBounds.width) <= 2.1 &&
        Math.abs(bannerBounds.height - linkBounds.height) <= 2.1
      ),
      href: link?.getAttribute("href") || "",
      hoverCapable: matchMedia("(hover: hover) and (pointer: fine)").matches,
      playerPointerEvents: playerLink ? getComputedStyle(playerLink).pointerEvents : "",
      restingOverlayOpacity: banner ? getComputedStyle(banner, "::after").opacity : ""
    };
  });
  await argentina2022BannerLink.hover();
  await page.waitForTimeout(220);
  const argentina2022BannerHoverOpacity = await page
    .locator("#final-celebration-banner")
    .evaluate((banner) => getComputedStyle(banner, "::after").opacity);
  assert(
    argentina2022BannerLinkState.href === "highlights.html?year=2022" &&
      argentina2022BannerLinkState.ariaLabel === "View highlights: FIFA World Cup 2022" &&
      argentina2022BannerLinkState.coversBanner &&
      argentina2022BannerLinkState.copyPointerEvents === "none" &&
      argentina2022BannerLinkState.playerPointerEvents === "auto" &&
      argentina2022BannerLinkState.restingOverlayOpacity === "0" &&
      argentina2022BannerHoverOpacity ===
        (argentina2022BannerLinkState.hoverCapable ? "1" : "0"),
    `The full champion banner should link to its edition highlights, keep player links interactive, and show a slight wash only on hover-capable devices. Measured ${JSON.stringify({ ...argentina2022BannerLinkState, hoverOpacity: argentina2022BannerHoverOpacity })}.`
  );
  await page.locator('[data-match-id="wc-2022-2022-12-18-final-argentina-france"]').click();
  const historicalFinalProjectionRows = await page
    .locator("#match-info .match-prediction-block .prediction-row")
    .evaluateAll((rows) => rows.map((row) => ({
      label: row.querySelector(".prediction-label")?.textContent?.trim() || "",
      percent: Number.parseInt(row.querySelector("strong")?.textContent || "", 10)
    })));
  const expectedHistoricalFinalProjection = getExpectedHistoricalProjection(
    "wc-2022-2022-12-18-final-argentina-france"
  );
  assert(
    historicalFinalProjectionRows.map((row) => row.label).join("|") === "Argentina|Tie|France" &&
      historicalFinalProjectionRows.map((row) => row.percent).join("|") === [
        expectedHistoricalFinalProjection.home,
        expectedHistoricalFinalProjection.draw,
        expectedHistoricalFinalProjection.away
      ].join("|"),
    `Historical HOME / TIE / AWAY UI should stay unchanged while its percentages come from the versioned regulation model. Measured ${JSON.stringify(historicalFinalProjectionRows)}.`
  );
  const historicalFinalTieTooltip = await page
    .locator("#match-info .match-prediction-block .prediction-row")
    .nth(1)
    .getAttribute("data-tooltip");
  assert(
    historicalFinalTieTooltip ===
      "If it goes to penalties, Argentina may have a slight record edge: 5 wins in 6 World Cup shootouts, compared with 2 in 4 for France.",
    `The 2022 final Tie tooltip should use each team's pre-final World Cup shootout record. Measured ${historicalFinalTieTooltip}.`
  );

  await argentina2022BannerLink.click();
  await page.waitForURL(`${baseUrl}/highlights.html?year=2022`);
  assert(
    new URL(page.url()).searchParams.get("year") === "2022" &&
      (await page.locator("#edition-picker-button").getAttribute("data-edition")) === "2022",
    `Clicking the 2022 champion banner should open the 2022 highlights page. Measured ${page.url()}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2022-12-18&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  const argentina2022StyleZh = await page
    .locator("#final-celebration-banner .final-celebration-bullets li")
    .nth(2)
    .innerText();
  assert(
    argentina2022StyleZh ===
      "阿根廷的理念是适应：释放梅西、赢下中场对抗，并根据比赛需要灵活变阵。",
    `The localized 2022 champion story should preserve Argentina's edition-specific identity. Measured ${argentina2022StyleZh}.`
  );
  await page.locator('[data-match-id="wc-2022-2022-12-18-final-argentina-france"]').click();
  const historicalFinalTieTooltipZh = await page
    .locator("#match-info .match-prediction-block .prediction-row")
    .nth(1)
    .getAttribute("data-tooltip");
  assert(
    historicalFinalTieTooltipZh ===
      "如果进入点球大战，阿根廷可能略占历史战绩优势：世界杯点球大战6次5胜，法国则是4次2胜。" &&
      !/If it goes|World Cup|shootout|Argentina|France/.test(historicalFinalTieTooltipZh || ""),
    `Historical shootout context should localize fully in Chinese. Measured ${historicalFinalTieTooltipZh}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=1934-05-31&lang=en&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.locator('[data-match-id="wc-1934-1934-05-31-quarter-finals-italy-spain"]').click();
  const replayEraTieRow = await page
    .locator("#match-info .match-prediction-block .prediction-row")
    .nth(1)
    .evaluate((row) => ({
      tooltip: row.getAttribute("data-tooltip") || "",
      hasTooltip: row.classList.contains("has-label-tooltip")
    }));
  assert(
    replayEraTieRow.tooltip === "Tie" && !replayEraTieRow.hasTooltip,
    `Pre-1978 archive forecasts should not imply that tied knockout matches used penalty shootouts. Measured ${JSON.stringify(replayEraTieRow)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2022-11-23&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="wc-2022-2022-11-23-matchday-4-germany-japan"]');
  await page.locator('[data-match-id="wc-2022-2022-11-23-matchday-4-germany-japan"]').click();
  const germanyJapanHistoricalPast = await page.locator("#match-info").evaluate((root) => {
    const pastSection = [...root.querySelectorAll(":scope > .match-info-content > .info-block")].find(
      (section) => section.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() === "Past World Cup meetings"
    );

    return {
      listRows: pastSection?.querySelectorAll(".past-list li").length || 0,
      recordRows: pastSection?.querySelectorAll(".past-record-row").length || 0,
      text: pastSection?.textContent.replace(/\s+/g, " ").trim() || ""
    };
  });
  assert(
    germanyJapanHistoricalPast.text.includes("Germany and Japan had not met in a men's World Cup before this match.") &&
      !/\bloaded\b/i.test(germanyJapanHistoricalPast.text) &&
      germanyJapanHistoricalPast.listRows === 0 &&
      germanyJapanHistoricalPast.recordRows === 0,
    `Germany-Japan 2022 should show a factual first World Cup meeting empty state, not a loaded-data warning. Measured ${JSON.stringify(germanyJapanHistoricalPast)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-06-12&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="canada-bosnia-2026-06-12"]');
  await page.locator('[data-match-id="canada-bosnia-2026-06-12"]').click();
  const currentUnknownCoveragePast = await page.locator("#match-info").evaluate((root) => {
    const pastSection = [...root.querySelectorAll(":scope > .match-info-content > .info-block")].find(
      (section) => section.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() === "Past matches"
    );

    return pastSection?.textContent.replace(/\s+/g, " ").trim() || "";
  });
  assert(
    currentUnknownCoveragePast.includes(
      "No previous meetings were returned by this source. Complete historical coverage has not been confirmed."
    ) &&
      !/never met|first (?:head-to-head )?meeting/i.test(currentUnknownCoveragePast) &&
      !currentUnknownCoveragePast.includes("men's World Cup"),
    `An empty current H2H source must remain an unknown coverage state, not become a first-meeting football fact. Measured ${JSON.stringify(currentUnknownCoveragePast)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2014-07-08&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator('[data-match-id="wc-2014-2014-07-08-semi-finals-brazil-germany"]').click();
  const historicalBrazilGermanyResult = await page.locator("#match-info").evaluate((root) => {
    const visibleText = (node) => {
      if (!node) {
        return "";
      }

      const clone = node.cloneNode(true);
      clone.querySelectorAll(".player-card").forEach((card) => card.remove());
      return clone.textContent.replace(/\s+/g, " ").trim();
    };
    const storyList = root.querySelector(".result-story-highlights");
    const pastSection = [...root.querySelectorAll(":scope > .match-info-content > .info-block")].find(
      (section) => section.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() === "Past World Cup meetings"
    );
    return {
      pastRecordRows: pastSection?.querySelectorAll(".past-record-row").length || 0,
      pastRows: [...(pastSection?.querySelectorAll(".past-list li") || [])].map(visibleText),
      pastText: visibleText(pastSection),
      scoreText: visibleText(root.querySelector(".result-score-summary")),
      scorerText: visibleText(root.querySelector(".result-scorer-highlights")),
      storyHrefs: [...root.querySelectorAll(".result-story-highlights .player-link")].map((trigger) =>
        trigger.getAttribute("href") || ""
      ),
      storyItems: [...root.querySelectorAll(".result-story-highlights li")].map(visibleText),
      storyListStyle: storyList ? getComputedStyle(storyList).listStyleType : ""
    };
  });
  assert(
    historicalBrazilGermanyResult.scoreText === "Germany beat Brazil 7-1." &&
      historicalBrazilGermanyResult.scorerText.includes("11' Thomas Müller") &&
      historicalBrazilGermanyResult.scorerText.includes("79' André Schürrle") &&
      historicalBrazilGermanyResult.storyItems.length === 3 &&
      historicalBrazilGermanyResult.storyListStyle === "disc" &&
      historicalBrazilGermanyResult.storyItems[0].includes("Thomas Müller put Germany ahead early") &&
      historicalBrazilGermanyResult.storyItems[1].includes("André Schürrle added the final word") &&
      historicalBrazilGermanyResult.storyItems[2].includes("Toni Kroos scored twice") &&
      historicalBrazilGermanyResult.storyHrefs.every((href) => href === "") &&
      historicalBrazilGermanyResult.pastRecordRows === 3 &&
      historicalBrazilGermanyResult.pastRows.length === 1 &&
      historicalBrazilGermanyResult.pastRows[0].includes("2002-06-30") &&
      historicalBrazilGermanyResult.pastRows[0].includes("World Cup 2002 / Final") &&
      historicalBrazilGermanyResult.pastRows[0].includes("Brazil") &&
      historicalBrazilGermanyResult.pastRows[0].includes("2-0") &&
      historicalBrazilGermanyResult.pastRows[0].includes("Germany") &&
      !historicalBrazilGermanyResult.pastText.includes("had not met"),
    `Brazil-Germany archive Result block should match current recap structure without raw source links. Measured ${JSON.stringify(historicalBrazilGermanyResult)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=1970-06-21&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator(".match-row").first().click();
  const scorerOnlyHistoricalLink = page.locator("#match-info .scorer-highlight .player-link", { hasText: "Carlos Alberto" }).first();
  await scorerOnlyHistoricalLink.hover();
  await page.waitForFunction(() =>
    [...document.querySelectorAll("#match-info .scorer-highlight .player-card")].some((card) =>
      card.textContent.includes("Carlos Alberto chooses the overlap only after Brazil can protect the space behind him.")
    )
  );
  const scorerOnlyHistoricalCard = page
    .locator("#match-info .scorer-highlight .player-hover")
    .filter({ has: page.locator(".player-link", { hasText: "Carlos Alberto" }) })
    .first()
    .locator(".player-card");
  const scorerOnlyHistoricalCardText = await scorerOnlyHistoricalCard.evaluate((card) =>
    card.textContent.replace(/\s+/g, " ").trim()
  );
  assert(
      scorerOnlyHistoricalCardText.includes("Carlos Alberto") &&
      scorerOnlyHistoricalCardText.includes("Santos") &&
      scorerOnlyHistoricalCardText.includes("Carlos Alberto chooses the overlap only after Brazil can protect the space behind him.") &&
      scorerOnlyHistoricalCardText.includes("Pelé then releases the captain’s run into the open right flank") &&
      scorerOnlyHistoricalCardText.includes("1970 World Cup: 1 goal") &&
      scorerOnlyHistoricalCardText.includes("At the 1970 World Cup") &&
      !scorerOnlyHistoricalCardText.includes("Italy in the Final (4-1 win)") &&
      !scorerOnlyHistoricalCardText.includes("Credited with 1 World Cup goal"),
    "Historical scorer-only names should separate evergreen play-style copy from the fixed year-labeled stat row."
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
      firstHistoricalDetailText.includes("Lucien Laurent put France ahead early") &&
      firstHistoricalDetailText.includes("André Maschinot scored twice as France kept widening the gap") &&
      !firstHistoricalDetailText.includes("France took three points from World Cup 1930 / Group 1"),
    "Historical result details should reach back to the first loaded World Cup match with authored result copy."
  );

  await page.goto(`${baseUrl}?view=matches&date=1934-05-27&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="wc-1934-1934-05-27-preliminary-round-hungary-egypt"]');
  await page.locator('[data-match-id="wc-1934-1934-05-27-preliminary-round-hungary-egypt"]').click();
  const historical1934FirstRoundDetail = await page.locator("#match-info").evaluate((root) => {
    const text = root.innerText;
    const sectionHeadings = [...root.querySelectorAll(":scope > .match-info-content > .info-block")]
      .map((section) => section.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() || "")
      .filter(Boolean);

    return {
      nextIndex: sectionHeadings.findIndex((heading) => heading === "Next: Quarter-finals"),
      previousIndex: sectionHeadings.findIndex((heading) => heading.startsWith("Previous:")),
      resultIndex: sectionHeadings.findIndex((heading) => heading.startsWith("Result")),
      sectionHeadings,
      text
    };
  });
  assert(
    historical1934FirstRoundDetail.previousIndex === -1 &&
      historical1934FirstRoundDetail.nextIndex >= 0 &&
      historical1934FirstRoundDetail.resultIndex > historical1934FirstRoundDetail.nextIndex &&
      !historical1934FirstRoundDetail.text.includes("No loaded group-round results yet") &&
      historical1934FirstRoundDetail.text.includes("Winner faced Austria #2 who won 3-2 against France."),
    `Historical first-round knockout matches without group fixtures should omit fake Previous group-round context. Measured ${JSON.stringify(historical1934FirstRoundDetail)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2022-12-14&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  await page.locator(".match-row").first().click();
  const historicalKnockoutDetail = await page.locator("#match-info").evaluate((root) => {
    const text = root.innerText;
    const sectionHeadings = [...root.querySelectorAll(":scope > .match-info-content > .info-block")]
      .map((section) => section.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() || "")
      .filter(Boolean);

    return {
      hasHistoricalBracket: Boolean(root.querySelector(".historical-bracket")),
      resultIndex: sectionHeadings.findIndex((heading) => heading.startsWith("Result")),
      previousIndex: sectionHeadings.findIndex((heading) => heading === "Previous: Quarter-finals"),
      nextIndex: sectionHeadings.findIndex((heading) => heading === "Next: Final / Third-place play-off"),
      sectionHeadings,
      text
    };
  });
  assert(
    !historicalKnockoutDetail.sectionHeadings.some((heading) =>
      /Knockout context|archive/i.test(heading)
    ) &&
      !historicalKnockoutDetail.hasHistoricalBracket &&
      historicalKnockoutDetail.previousIndex >= 0 &&
      historicalKnockoutDetail.nextIndex > historicalKnockoutDetail.previousIndex &&
      historicalKnockoutDetail.resultIndex > historicalKnockoutDetail.nextIndex,
    `Historical knockout matches should use current-style Previous/Next context before Result. Measured ${JSON.stringify(historicalKnockoutDetail)}.`
  );
  assert(
    !historicalKnockoutDetail.text.includes("Half-time") &&
      (await page.locator(".historical-goals").count()) === 0,
    "Historical knockout detail should avoid the old facts/goals record layout."
  );

  await page.goto(`${baseUrl}?view=matches&date=2022-12-13&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="wc-2022-2022-12-13-semi-finals-argentina-croatia"]');
  await page.locator('[data-match-id="wc-2022-2022-12-13-semi-finals-argentina-croatia"]').click();
  const historicalSemiPreviousWinners = await page.locator("#match-info").evaluate((root) => {
    const previousSection = [...root.querySelectorAll(":scope > .match-info-content > .info-block")].find(
      (section) => section.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() === "Previous: Quarter-finals"
    );
    const winnerNodes = [...(previousSection?.querySelectorAll(".knockout-context-team.is-subject") || [])];

    return {
      names: winnerNodes.map((node) => node.querySelector(".knockout-context-team-name")?.textContent.trim() || ""),
      weights: winnerNodes.map((node) => Number.parseFloat(window.getComputedStyle(node).fontWeight))
    };
  });
  assert(
    historicalSemiPreviousWinners.names.join("|") === "Argentina|Croatia" &&
      historicalSemiPreviousWinners.weights.every((weight) => weight >= 600),
    `Historical semi-final Previous context should semibold the prior-round winners. Measured ${JSON.stringify(historicalSemiPreviousWinners)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2022-12-06&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="wc-2022-2022-12-06-round-of-16-morocco-spain"]');
  await page.locator('[data-match-id="wc-2022-2022-12-06-round-of-16-morocco-spain"]').click();
  const historicalRoundOf16NextWinner = await page.locator("#match-info").evaluate((root) => {
    const nextSection = [...root.querySelectorAll(":scope > .match-info-content > .info-block")].find(
      (section) => section.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() === "Next: Quarter-finals"
    );
    const winnerNodes = [...(nextSection?.querySelectorAll(".knockout-context-team.is-subject") || [])];

    return {
      nextText: nextSection?.textContent.replace(/\s+/g, " ").trim() || "",
      names: winnerNodes.map((node) => node.querySelector(".knockout-context-team-name")?.textContent.trim() || ""),
      weights: winnerNodes.map((node) => Number.parseFloat(window.getComputedStyle(node).fontWeight))
    };
  });
  assert(
    /Winner faced Portugal(?: #\d+)? who won 6-1 against Switzerland\./.test(
      historicalRoundOf16NextWinner.nextText
    ) &&
      historicalRoundOf16NextWinner.names.includes("Portugal") &&
      historicalRoundOf16NextWinner.weights.every((weight) => weight >= 600),
    `Historical Round of 16 Next context should semibold the resolved opponent winner. Measured ${JSON.stringify(historicalRoundOf16NextWinner)}.`
  );
  const historicalRoundOf16StageLink = await page
    .locator("#match-info [data-open-tournament-tab]")
    .evaluate((link) => ({
      className: link.className,
      matchNumber: link.dataset.tournamentMatchNumber || "",
      tagName: link.tagName,
      text: link.textContent.trim(),
      textDecorationLine: getComputedStyle(link).textDecorationLine,
      tournamentYear: link.dataset.tournamentYear || ""
    }));
  assert(
    historicalRoundOf16StageLink.tagName === "BUTTON" &&
      historicalRoundOf16StageLink.className.includes("match-stage-link") &&
      historicalRoundOf16StageLink.text === "World Cup 2022 / Round of 16" &&
      historicalRoundOf16StageLink.matchNumber === "55" &&
      historicalRoundOf16StageLink.tournamentYear === "2022" &&
      historicalRoundOf16StageLink.textDecorationLine.includes("underline"),
    `Historical knockout headings should match the current tournament stage-link treatment and carry their archive target. Measured ${JSON.stringify(historicalRoundOf16StageLink)}.`
  );
  await page.locator("#match-info [data-open-tournament-tab]").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#standings-tab")?.getAttribute("aria-selected") === "true" &&
      document.querySelector("#standings-year-button")?.textContent.trim() === "2022" &&
      document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed") === "true" &&
      document
        .querySelector('.historical-tournament-view .progress-match[data-match-number="55"]')
        ?.classList.contains("is-drill-target") &&
      document.activeElement ===
        document.querySelector('.historical-tournament-view .progress-match[data-match-number="55"]')
  );
  const historicalRoundOf16CanvasTarget = await page.evaluate(() => {
    const params = new URL(window.location.href).searchParams;
    const target = document.querySelector(
      '.historical-tournament-view .progress-match[data-match-number="55"]'
    );

    return {
      activeMatchNumber: document.activeElement?.dataset?.matchNumber || "",
      highlighted: target?.classList.contains("is-drill-target") || false,
      standingsMode: params.get("standingsMode"),
      standingsYear: params.get("standingsYear"),
      view: params.get("view")
    };
  });
  assert(
    historicalRoundOf16CanvasTarget.activeMatchNumber === "55" &&
      historicalRoundOf16CanvasTarget.highlighted === true &&
      historicalRoundOf16CanvasTarget.standingsMode === null &&
      historicalRoundOf16CanvasTarget.standingsYear === "2022" &&
      historicalRoundOf16CanvasTarget.view === "standings",
    `Clicking a historical knockout heading should open its archived Tournament canvas and focus the exact match. Measured ${JSON.stringify(historicalRoundOf16CanvasTarget)}.`
  );

  const languageTimezoneCheck = await openPageAtTime(
    "2026-07-07T12:00:00-07:00",
    "/?lang=en&tz=America%2FLos_Angeles"
  );
  const languageTimezonePage = languageTimezoneCheck.page;
  await languageTimezonePage.waitForFunction(
    () =>
      document.documentElement.lang === "en" &&
      document.querySelector("#language-select")?.value === "en" &&
      document.querySelector("#language-select")?.disabled === false &&
      localStorage.getItem("world-cup-simplified-language") === "en"
  );
  const beforeTimeZoneText = await languageTimezonePage.locator("#day-label").innerText();
  assert(beforeTimeZoneText.trim() === "Today", "Initial default date should be Today.");
  await languageTimezonePage.locator("#settings-button").click();
  assert(
    await languageTimezonePage.locator("#settings-popover").isVisible(),
    "Settings should reveal language and timezone controls."
  );
  await languageTimezonePage.locator("#timezone-picker-trigger").click();
  assert(
    await languageTimezonePage.locator("#timezone-picker").isVisible(),
    "The time zone setting should open a searchable picker."
  );
  assert(
    (await languageTimezonePage.locator("#timezone-picker-results .timezone-picker-group-label").first().innerText()).trim() === "DEFAULT",
    "The device time zone should appear in a clearly labeled Default section."
  );
  assert(
    !(await languageTimezonePage.locator("#timezone-picker-results").innerText()).includes("ALL TIME ZONES"),
    "The picker should keep the full timezone list behind search instead of exposing an oversized All section."
  );
  assert(
    (await languageTimezonePage.locator("#timezone-search-input").getAttribute("placeholder")) ===
      "Search city, country, or abbreviation",
    "The time zone picker should explain that city, country, and abbreviation searches are supported."
  );
  await languageTimezonePage.locator("#timezone-search-input").fill("Japan");
  const tokyoTimeZoneOption = languageTimezonePage.locator(
    '.timezone-picker-option[data-time-zone="Asia/Tokyo"]'
  );
  assert(
    await tokyoTimeZoneOption.isVisible(),
    "Searching for Japan should reveal the canonical Tokyo time zone."
  );
  const tokyoTimeZoneMeta = await tokyoTimeZoneOption.locator(".timezone-picker-option-meta").innerText();
  assert(
    /^UTC\+9$/.test(tokyoTimeZoneMeta.trim()),
    `Generic GMT offsets should not repeat the equivalent UTC offset. Measured ${JSON.stringify(tokyoTimeZoneMeta)}.`
  );
  await tokyoTimeZoneOption.click();
  assert(
    (await languageTimezonePage.locator("#day-label").innerText()).trim() === "Today",
    "Changing timezone while viewing Today should keep the view on Today."
  );
  assert(
    (await languageTimezonePage.evaluate(() => localStorage.getItem("world-cup-simplified-timezone"))) === "Asia/Tokyo",
    "Changing timezone should persist the selection for account-free reloads."
  );
  const languageSwitchWidthBefore = await languageTimezonePage
    .locator("#language-select")
    .evaluate((element) => Math.round(element.getBoundingClientRect().width));
  let releaseSpanishLocaleModule;
  const spanishLocaleModuleGate = new Promise((resolve) => {
    releaseSpanishLocaleModule = resolve;
  });
  await languageTimezonePage.route("**/locales/es/app.js*", async (route) => {
    await spanishLocaleModuleGate;
    await route.continue();
  });
  await languageTimezonePage.locator("#language-select").selectOption("es");
  await languageTimezonePage.waitForFunction(
    () => document.querySelector(".language-control")?.getAttribute("aria-busy") === "true"
  );
  await languageTimezonePage.waitForTimeout(190);
  const pendingLanguageCheck = await languageTimezonePage.evaluate(() => {
    const control = document.querySelector(".language-control");
    const select = document.querySelector("#language-select");
    const spinnerStyle = control ? window.getComputedStyle(control, "::after") : null;

    return {
      disabled: Boolean(select?.disabled),
      pending: Boolean(control?.classList.contains("is-pending")),
      spinnerOpacity: Number(spinnerStyle?.opacity || 0),
      switchBusy: control?.getAttribute("aria-busy") || "",
      width: select ? Math.round(select.getBoundingClientRect().width) : 0
    };
  });
  assert(
    pendingLanguageCheck.pending &&
      pendingLanguageCheck.switchBusy === "true" &&
      pendingLanguageCheck.disabled &&
      pendingLanguageCheck.spinnerOpacity > 0.5 &&
      Math.abs(pendingLanguageCheck.width - languageSwitchWidthBefore) <= 1,
    `A delayed locale should show the dropdown's pending spinner without resizing the control. Measured ${JSON.stringify(pendingLanguageCheck)} with starting width ${languageSwitchWidthBefore}.`
  );
  releaseSpanishLocaleModule();
  await languageTimezonePage.waitForFunction(
    () =>
      document.documentElement.lang === "es-419" &&
      document.querySelector("#language-select")?.value === "es" &&
      document.querySelector("#language-select")?.disabled === false
  );
  await languageTimezonePage.unroute("**/locales/es/app.js*");
  await languageTimezonePage.locator("#language-select").selectOption("zh");
  await languageTimezonePage.waitForFunction(
    () =>
      document.documentElement.lang === "zh-Hans" &&
      document.querySelector("#language-select")?.disabled === false
  );
  const chineseAppliedCheck = await languageTimezonePage.evaluate(() => ({
    activeLanguage: document.querySelector("#language-select")?.value || "",
    documentLanguage: document.documentElement.lang,
    languageOptions: [...document.querySelectorAll("#language-select option")].map((option) => ({
      language: option.value,
      text: option.textContent.trim()
    })),
    savedLanguage: localStorage.getItem("world-cup-simplified-language") || "",
    switchBusy: document.querySelector(".language-control")?.getAttribute("aria-busy") || "",
    width: Math.round(document.querySelector("#language-select")?.getBoundingClientRect().width || 0)
  }));
  const chineseEnglishOption = chineseAppliedCheck.languageOptions.find((option) => option.language === "en");
  assert(
    chineseAppliedCheck.activeLanguage === "zh" &&
      chineseAppliedCheck.documentLanguage === "zh-Hans" &&
      chineseEnglishOption?.text === "English" &&
      chineseAppliedCheck.savedLanguage === "zh" &&
      chineseAppliedCheck.switchBusy === "false" &&
      Math.abs(chineseAppliedCheck.width - languageSwitchWidthBefore) <= 1,
    `Chinese should apply after the pending language spinner clears without resizing the control. Measured ${JSON.stringify(chineseAppliedCheck)} with starting width ${languageSwitchWidthBefore}.`
  );
  const zhLocalizationRegressionPage = await browser.newPage();
  await zhLocalizationRegressionPage.goto(
    `${baseUrl}?view=standings&standingsMode=groups&lang=zh&tz=America%2FLos_Angeles`,
    { waitUntil: "load" }
  );
  await zhLocalizationRegressionPage.waitForFunction(
    () => document.querySelectorAll(".standings-card[data-group-id] > h2").length === 12
  );
  const zhGroupLabelRegressionCheck = await zhLocalizationRegressionPage.evaluate(() => ({
    badTokens: [...document.querySelectorAll("#language-select option, .standings-card[data-group-id] > h2, #source-note a")]
      .map((element) => element.textContent.trim())
      .filter((text) => /^(?:[阿布克德埃夫格赫伊杰勒]|恩格利什|菲法)$/.test(text)),
    footerLinks: [...document.querySelectorAll("#source-note a")].map((link) => link.textContent.trim()),
    groupHeadings: [...document.querySelectorAll(".standings-card[data-group-id] > h2")].map((heading) =>
      heading.textContent.trim()
    ),
    languageOptions: [...document.querySelectorAll("#language-select option")].map((option) => ({
      language: option.value,
      text: option.textContent.trim()
    }))
  }));
  assert(
    zhGroupLabelRegressionCheck.badTokens.length === 0 &&
      zhGroupLabelRegressionCheck.groupHeadings.length === 12 &&
      zhGroupLabelRegressionCheck.groupHeadings.every((heading) => /^[A-L]组$/.test(heading)) &&
      zhGroupLabelRegressionCheck.languageOptions.some(
        (option) => option.language === "en" && option.text === "English"
      ) &&
      zhGroupLabelRegressionCheck.footerLinks.includes("FIFA") &&
      zhGroupLabelRegressionCheck.footerLinks.includes("HA"),
    `Chinese localization should not phonetically transliterate language tabs, group labels, FIFA, or creator initials. Measured ${JSON.stringify(zhGroupLabelRegressionCheck)}.`
  );
  await zhLocalizationRegressionPage.goto(
    `${baseUrl}?view=standings&standingsMode=third-place&lang=zh&tz=America%2FLos_Angeles`,
    { waitUntil: "load" }
  );
  await zhLocalizationRegressionPage.waitForFunction(
    () => document.querySelectorAll(".third-place-group-button").length === 12
  );
  const zhThirdPlaceGroupLabelRegressionCheck = await zhLocalizationRegressionPage.evaluate(() => ({
    groupLabels: [...document.querySelectorAll(".third-place-group-button")]
      .map((button) => button.textContent.trim()),
    note: document.querySelector(".third-place-note")?.textContent.replace(/\s+/g, " ").trim() || "",
    sectionLabel: document.querySelector(".third-place-race")?.getAttribute("aria-label") || ""
  }));
  assert(
    zhThirdPlaceGroupLabelRegressionCheck.groupLabels.length === 12 &&
      zhThirdPlaceGroupLabelRegressionCheck.groupLabels.every((label) => /^[A-L]组$/.test(label)) &&
      zhThirdPlaceGroupLabelRegressionCheck.sectionLabel === "最佳小组第三排名" &&
      zhThirdPlaceGroupLabelRegressionCheck.note.includes("同分排序") &&
      !zhThirdPlaceGroupLabelRegressionCheck.note.includes("平局排序"),
    `Chinese third-place group buttons should keep group-letter labels instead of phonetic one-character fallbacks. Measured ${JSON.stringify(zhThirdPlaceGroupLabelRegressionCheck)}.`
  );
  await zhLocalizationRegressionPage.goto(
    `${baseUrl}?view=standings&standingsYear=2022&standingsMode=groups&lang=zh&tz=America%2FLos_Angeles`,
    { waitUntil: "load" }
  );
  await zhLocalizationRegressionPage.waitForFunction(
    () => document.querySelectorAll(".standings-card > h2").length >= 8
  );
  const zhHistoricalGroupLabelRegressionCheck = await zhLocalizationRegressionPage
    .locator(".standings-card > h2")
    .evaluateAll((headings) => headings.map((heading) => heading.textContent.trim()).filter(Boolean));
  assert(
    zhHistoricalGroupLabelRegressionCheck.length >= 8 &&
      zhHistoricalGroupLabelRegressionCheck.every((heading) => /^[A-L]组$/.test(heading)),
    `Chinese historical group headings should keep group-letter labels instead of phonetic one-character fallbacks. Measured ${JSON.stringify(zhHistoricalGroupLabelRegressionCheck)}.`
  );
  await zhLocalizationRegressionPage.close();
  await languageTimezonePage.locator("#language-select").selectOption("en");
  await languageTimezonePage.waitForFunction(
    () => document.querySelector("#language-select")?.disabled === false
  );
  assert(
    (await languageTimezonePage.evaluate(
      () =>
        document.documentElement.lang === "en" &&
        document.querySelector("#language-select")?.value === "en" &&
        localStorage.getItem("world-cup-simplified-language") === "en"
    )) === true,
    "Switching back to English should clear the pending spinner and restore English before later smoke checks."
  );
  await languageTimezonePage.goto(baseUrl, { waitUntil: "load" });
  await languageTimezonePage.waitForSelector(".match-row");
  assert(
    (await languageTimezonePage.locator("#timezone-select").inputValue()) === "Asia/Tokyo",
    "A saved timezone should be restored on a clean visit without requiring an account."
  );
  const resolvedDeviceTimeZone = await languageTimezonePage.evaluate(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  await languageTimezonePage.locator("#settings-button").click();
  await languageTimezonePage.locator("#timezone-picker-trigger").click();
  await languageTimezonePage
    .locator('.timezone-picker-option[data-time-zone-mode="device"]')
    .click();
  const storedDeviceTimeZonePreference = await languageTimezonePage.evaluate(() => ({
    mode: localStorage.getItem("world-cup-simplified-timezone-mode"),
    timeZone: localStorage.getItem("world-cup-simplified-timezone")
  }));
  assert(
    storedDeviceTimeZonePreference.mode === "device" &&
      storedDeviceTimeZonePreference.timeZone === "device" &&
      (await languageTimezonePage.locator("#timezone-select").inputValue()) === resolvedDeviceTimeZone,
    "The Default timezone should persist a device mode instead of freezing the currently resolved city."
  );
  await languageTimezonePage.reload({ waitUntil: "load" });
  await languageTimezonePage.waitForSelector(".match-row");
  assert(
    (await languageTimezonePage.locator("#timezone-select").inputValue()) === resolvedDeviceTimeZone,
    "Device timezone mode should resolve the browser's current timezone again on a later visit."
  );
  await languageTimezoneCheck.context.close();

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
    "Recent matches should be shown by default when previous-day matches are available."
  );
  assert(
    (await page.locator(".yesterday-section-header h2").innerText()).includes("Recent matches (Jun 17)"),
    "Previous-day match section should use the Recent matches title with an abbreviated date."
  );
  const recentMatchesGapCheck = await openPageAtTime(
    "2026-07-09T12:00:00-07:00",
    "/?view=matches&date=2026-07-09&tz=America%2FLos_Angeles"
  );
  assert(
    (await recentMatchesGapCheck.page.locator(".yesterday-section-header h2").innerText()).includes(
      "Recent matches (Jul 7)"
    ),
    "Recent matches should use the latest earlier matchday when the previous calendar day had no matches."
  );
  await recentMatchesGapCheck.context.close();
  const futureRecentMatchesCheck = await openPageAtTime(
    "2026-07-16T09:29:00-07:00",
    "/?view=matches&date=2026-07-18&tz=America%2FLos_Angeles"
  );
  const futureRecentMatchesTitle = await futureRecentMatchesCheck.page
    .locator(".yesterday-section-header h2")
    .innerText();
  assert(
    futureRecentMatchesTitle.includes("Recent matches (Jul 15)"),
    `A future fixture page should still show the latest completed earlier matchday. Measured ${JSON.stringify(futureRecentMatchesTitle)}.`
  );
  await futureRecentMatchesCheck.context.close();
  const noMatchTodayPositionCheck = await openPageAtTime(
    "2026-07-17T10:00:00-07:00",
    "/?view=matches&date=2026-07-17&tz=America%2FLos_Angeles",
    {
      contextOptions: { viewport: { width: 1280, height: 900 } },
      initScript: () => {
        localStorage.setItem("world-cup-simplified-language", "en");
        localStorage.setItem("world-cup-simplified-show-yesterday", "true");
      }
    }
  );
  const noMatchTodayList = noMatchTodayPositionCheck.page.locator("#match-list");
  const noMatchTodayTopWithRecent = await noMatchTodayList.evaluate((list) =>
    Math.round(list.getBoundingClientRect().top)
  );
  await noMatchTodayPositionCheck.page.locator("#settings-button").click();
  await noMatchTodayPositionCheck.page
    .locator("label.settings-toggle-control:has(#show-yesterday-toggle)")
    .click();
  await noMatchTodayPositionCheck.page.waitForTimeout(460);
  const noMatchTodayHiddenState = await noMatchTodayList.evaluate((list) => ({
    isOffset: list.closest("#matches-view")?.classList.contains("is-yesterday-suppressed") || false,
    top: Math.round(list.getBoundingClientRect().top)
  }));
  assert(
    noMatchTodayHiddenState.isOffset &&
      noMatchTodayHiddenState.top - noMatchTodayTopWithRecent >= 40,
    `Hiding Recent matches should apply the usual desktop positioning adjustment even when Today has no matches. Measured ${JSON.stringify({ noMatchTodayHiddenState, noMatchTodayTopWithRecent })}.`
  );
  await noMatchTodayPositionCheck.context.close();
  assert(
    (await page.locator(".yesterday-dismiss-icon").count()) === 1,
    "Recent matches dismiss control should render an icon glyph."
  );
  await page.locator(".yesterday-dismiss").click();
  assert(
    (await page.evaluate(() => localStorage.getItem("world-cup-simplified-show-yesterday"))) === "false",
    "Closing Recent matches should persist the account-free display preference."
  );
  assert(
    (await page.locator(".yesterday-section").count()) === 0,
    "Closing Recent matches should hide it immediately."
  );
  await page.goto(`${baseUrl}?view=matches&date=2026-06-18&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector(".match-row");
  assert(
    (await page.locator(".yesterday-section").count()) === 0,
    "Closed Recent matches should stay hidden on reload."
  );
  await page.setViewportSize({ width: 640, height: 720 });
  await page.waitForTimeout(480);
  await page.locator(".match-row").first().click();
  await page.waitForSelector("#match-info:not(.is-hidden)");
  const suppressedYesterdayMobileGap = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("#match-list > .match-row"));
    const lastTodayRow = rows.at(-1);
    const matchInfo = document.querySelector("#match-info");
    const matchLayout = document.querySelector(".match-layout");

    if (!lastTodayRow || !matchInfo || !matchLayout) {
      return null;
    }

    const rowRect = lastTodayRow.getBoundingClientRect();
    const infoRect = matchInfo.getBoundingClientRect();
    const layoutStyle = getComputedStyle(matchLayout);
    return {
      actual: Math.round(infoRect.top - rowRect.bottom),
      expected: Math.round(parseFloat(layoutStyle.rowGap || layoutStyle.gap))
    };
  });
  assert(
    suppressedYesterdayMobileGap &&
      Math.abs(suppressedYesterdayMobileGap.actual - suppressedYesterdayMobileGap.expected) <= 5,
    `Dismissed Recent matches mobile layout should preserve the normal gap between today's rows and the match detail card. Measured ${JSON.stringify(suppressedYesterdayMobileGap)}.`
  );
  await page.locator("#settings-button").click();
  assert(
    await page.evaluate(() => document.querySelector("#show-yesterday-toggle")?.checked === false),
    "Closing Recent matches should also turn off the Show recent matches setting."
  );
  await page
    .locator("label.settings-toggle-control:has(#show-yesterday-toggle)")
    .click();
  assert(
    (await page.locator(".yesterday-section").count()) === 1 &&
      (await page.evaluate(() => localStorage.getItem("world-cup-simplified-show-yesterday"))) === "true",
    "Turning Show recent matches back on should restore the Recent matches section."
  );
  await page.keyboard.press("Escape");
  assert(
    !(await page.locator("#settings-popover").isVisible()),
    "Settings should close before testing match-row interactions underneath it."
  );
  await page.setViewportSize({ width: 640, height: 720 });
  await page.waitForTimeout(80);
  const switzerlandBosniaRow = page.locator('[data-match-id="switzerland-bosnia-2026-06-18"]');
  const bosniaMatchTeam = switzerlandBosniaRow.locator(".team", {
    hasText: "Bosnia and Herzegovina"
  });
  const qatarMatchTeam = page.locator('[data-match-id="canada-qatar-2026-06-18"] .team', {
    hasText: "Qatar"
  });
  assert(
    !(await qatarMatchTeam.evaluate((team) => team.classList.contains("has-team-tooltip"))),
    "Short match row names should not show full-name tooltips when they are not truncated."
  );
  const bosniaScoreAlignment = await switzerlandBosniaRow.evaluate((row) => {
    const meta = row.querySelector(".match-row-meta");
    const score = row.querySelector(".match-score");
    const rowRect = row.getBoundingClientRect();
    const metaRect = meta?.getBoundingClientRect();
    const scoreRect = score?.getBoundingClientRect();
    const textPieces = Array.from(row.querySelectorAll(".match-teams .team-name, .match-teams .versus"));
    const rightmostTextRight = textPieces.reduce((right, piece) => {
      const range = document.createRange();
      range.selectNodeContents(piece);
      const rects = Array.from(range.getClientRects());
      range.detach();

      if (!rects.length) {
        return Math.max(right, piece.getBoundingClientRect().right);
      }

      return Math.max(right, ...rects.map((rect) => rect.right));
    }, rowRect.left);

    return {
      hasWrappedClass: row.classList.contains("has-wrapped-matchup"),
      metaGapFromText: metaRect ? Math.round(metaRect.left - rightmostTextRight) : null,
      rowScrollOverflow: row.scrollWidth - row.clientWidth,
      scoreRightGap: scoreRect ? Math.round(rowRect.right - scoreRect.right) : null
    };
  });
  assert(
    bosniaScoreAlignment.rowScrollOverflow <= 1 &&
      (bosniaScoreAlignment.hasWrappedClass
        ? bosniaScoreAlignment.metaGapFromText >= 6 &&
          bosniaScoreAlignment.metaGapFromText <= 28 &&
          bosniaScoreAlignment.scoreRightGap >= 24
        : bosniaScoreAlignment.metaGapFromText >= 8 &&
          bosniaScoreAlignment.scoreRightGap >= 0 &&
          bosniaScoreAlignment.scoreRightGap <= 12),
    `Tablet match rows should keep the right rail when they fit, or place score pills just after wrapped matchup text. Measured ${JSON.stringify(bosniaScoreAlignment)}.`
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(80);
  const bosniaMatchWrap = await bosniaMatchTeam.evaluate((team) => {
    const row = team.closest(".match-row");
    const name = team.querySelector(".team-name");
    const teams = team.closest(".match-teams");
    const score = row?.querySelector(".match-score");
    const rowBox = row?.getBoundingClientRect();
    const scoreBox = score?.getBoundingClientRect();
    const nameStyle = getComputedStyle(name);
    const teamsStyle = getComputedStyle(teams);
    const nameBox = name.getBoundingClientRect();
    return {
      hasTooltip: team.classList.contains("has-team-tooltip"),
      hasWrappedClass: row?.classList.contains("has-wrapped-matchup") || false,
      lineHeight: Number.parseFloat(teamsStyle.lineHeight),
      nameLabel: name.getAttribute("aria-label"),
      nameWidth: nameBox.width,
      overflow: nameStyle.overflow,
      scrollWidth: name.scrollWidth,
      scoreRightGap: rowBox && scoreBox ? Math.round(rowBox.right - scoreBox.right) : null,
      textOverflow: nameStyle.textOverflow,
      teamsHeight: teams.getBoundingClientRect().height,
      visibleWidth: name.clientWidth,
      whiteSpace: nameStyle.whiteSpace
    };
  });
  assert(
    bosniaMatchWrap.nameLabel === "Bosnia and Herzegovina" &&
      bosniaMatchWrap.whiteSpace === "normal" &&
      bosniaMatchWrap.overflow === "visible" &&
      bosniaMatchWrap.textOverflow === "clip" &&
      bosniaMatchWrap.nameWidth > 0 &&
      bosniaMatchWrap.teamsHeight > bosniaMatchWrap.lineHeight * 1.4 &&
      bosniaMatchWrap.hasWrappedClass &&
      bosniaMatchWrap.scoreRightGap >= 0 &&
      bosniaMatchWrap.scoreRightGap <= 12 &&
      !bosniaMatchWrap.hasTooltip,
    `Long match row names should wrap visibly instead of becoming tooltip-only truncation. Measured ${JSON.stringify(bosniaMatchWrap)}.`
  );
  await page.goto(`${baseUrl}?view=matches&date=2026-06-27&lang=zh&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForSelector(".match-row");
  await page.waitForTimeout(160);
  const chineseMatchNameWrap = await page.locator("#match-list > .match-row").evaluateAll((rows) =>
    rows.map((row) => {
      const rowBox = row.getBoundingClientRect();
      const nameMetrics = [...row.querySelectorAll(".match-teams .team-name")].map((name) => {
        const textNode = [...name.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
        const lineMap = new Map();

        if (textNode) {
          [...textNode.textContent].forEach((char, index) => {
            const range = document.createRange();
            range.setStart(textNode, index);
            range.setEnd(textNode, index + char.length);
            const rect = range.getBoundingClientRect();
            range.detach();
            const topKey = Math.round(rect.top);
            lineMap.set(topKey, (lineMap.get(topKey) || 0) + 1);
          });
        }

        return {
          label: name.getAttribute("aria-label") || name.textContent.trim(),
          lineCharCounts: [...lineMap.values()],
          width: Math.round(name.getBoundingClientRect().width)
        };
      });

      return {
        id: row.dataset.matchId || "",
        nameMetrics,
        rowScrollOverflow: Math.round(row.scrollWidth - row.clientWidth),
        rowWidth: Math.round(rowBox.width)
      };
    })
  );
  const chineseSingleColumnNames = chineseMatchNameWrap.flatMap((row) =>
    row.nameMetrics
      .filter(
        (metric) =>
          [...metric.label].length >= 3 &&
          metric.lineCharCounts.length >= 3 &&
          Math.max(...metric.lineCharCounts) <= 1
      )
      .map((metric) => ({ id: row.id, ...metric }))
  );
  assert(
    chineseSingleColumnNames.length === 0 &&
      chineseMatchNameWrap.every((row) => row.rowScrollOverflow <= 1),
    `Chinese match row names should not collapse into one-character columns on mobile. Measured ${JSON.stringify(chineseMatchNameWrap)}.`
  );
  await page.goto(`${baseUrl}?view=matches&date=2026-06-18&lang=en&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="switzerland-bosnia-2026-06-18"]');
  await page.setViewportSize({ width: 1280, height: 720 });
  await switzerlandBosniaRow.click();
  const finalMatchDetailText = await page.locator("#match-info").innerText();
  assert(
    finalMatchDetailText.includes("Result") &&
      finalMatchDetailText.includes("Prediction") &&
    finalMatchDetailText.includes("Switzerland beat Bosnia and Herzegovina 4-1."),
    "Final match details should keep the prediction card below the result."
  );

  const lineupProductionTrustCheck = await openPageAtTime(
    "2026-07-02T02:45:00.000Z",
    "/?view=matches&date=2026-07-01&tz=America%2FLos_Angeles"
  );
  const trustedLineupFixtureIds = [
    "match-80-round-of-32-2026-07-01",
    "match-81-round-of-32-2026-07-01",
    "match-82-round-of-32-2026-07-01"
  ];
  const lineupProductionStates = [];
  const hasFinalLineupTooltip = (helpLabel) => helpLabel === "This was the final lineup for the match.";
  for (const fixtureId of trustedLineupFixtureIds) {
    await lineupProductionTrustCheck.page.locator(`[data-match-id="${fixtureId}"]`).click();
    await lineupProductionTrustCheck.page.waitForSelector("#match-info .match-result-block", { state: "attached" });
    lineupProductionStates.push({
      fixtureId,
      lineupBlocks: await lineupProductionTrustCheck.page.locator("#match-info .lineup-preview-block").count(),
      eventTimelineBlocks: await lineupProductionTrustCheck.page.locator("#match-info .match-event-summary").count(),
      helpLabel: await lineupProductionTrustCheck.page
        .locator("#match-info .lineup-heading .info-tooltip-button")
        .first()
        .getAttribute("aria-label"),
      detailText: await lineupProductionTrustCheck.page.locator("#match-info").innerText()
    });
  }
  assert(
    lineupProductionStates.every(
      (state) =>
        state.lineupBlocks === 1 &&
        state.eventTimelineBlocks === 0 &&
        hasFinalLineupTooltip(state.helpLabel) &&
        !/Formation & events|Predicted lineups/.test(state.detailText)
    ),
    `Production match details should render trusted final line-up boards and suppress the old event timeline. Measured ${JSON.stringify(lineupProductionStates)}.`
  );
  await lineupProductionTrustCheck.context.close();

  const exactLineupGeometryCheck = await openPageAtTime(
    "2026-06-22T02:00:00.000Z",
    "/?view=matches&date=2026-06-21&tz=America%2FLos_Angeles"
  );
  await exactLineupGeometryCheck.page
    .locator('[data-match-id="uruguay-cabo-verde-2026-06-21"]')
    .click();
  const exactLineupBlock = exactLineupGeometryCheck.page.locator("#match-info .lineup-preview-block");
  await exactLineupBlock.locator("[data-lineup-panel='home'] [data-lineup-tab='away']").click();
  const caboVerdeExactState = await exactLineupBlock
    .locator("[data-lineup-panel='away']:not([hidden])")
    .evaluate((panel) => {
      const trackedNames = new Set([
        "Garry Rodrigues",
        "Jamiro Monteiro",
        "Telmo Arcanjo",
        "Ryan Mendes"
      ]);
      const rowMarkers = [...panel.querySelectorAll(".lineup-player-marker")]
        .filter((marker) => trackedNames.has(marker.dataset.lineupStarterName || ""))
        .map((marker) => ({
          name: marker.dataset.lineupStarterName || "",
          position: marker.dataset.lineupPosition || "",
          y: marker.style.getPropertyValue("--y")
        }));

      return {
        formation: panel.querySelector(".lineup-formation-pill")?.textContent.trim() || "",
        rowMarkers
      };
    });
  const caboVerdeExactMarkers = new Map(
    caboVerdeExactState.rowMarkers.map((marker) => [marker.name, marker])
  );
  assert(
    caboVerdeExactState.formation === "4-1-2-3" &&
      caboVerdeExactState.rowMarkers.length === 4 &&
      caboVerdeExactMarkers.get("Garry Rodrigues")?.position === "LW" &&
      caboVerdeExactMarkers.get("Telmo Arcanjo")?.position === "RW" &&
      caboVerdeExactMarkers.get("Jamiro Monteiro")?.position === "CM" &&
      caboVerdeExactMarkers.get("Ryan Mendes")?.position === "CM" &&
      caboVerdeExactMarkers.get("Garry Rodrigues")?.y === caboVerdeExactMarkers.get("Telmo Arcanjo")?.y &&
      caboVerdeExactMarkers.get("Jamiro Monteiro")?.y === caboVerdeExactMarkers.get("Ryan Mendes")?.y &&
      caboVerdeExactMarkers.get("Garry Rodrigues")?.y !== caboVerdeExactMarkers.get("Jamiro Monteiro")?.y,
    `Verified FIFA observed geometry should preserve Cabo Verde's 4-1-2-3 wing and central-midfield rows. Measured ${JSON.stringify(caboVerdeExactState)}.`
  );
  await exactLineupGeometryCheck.context.close();

  const finalLineupModeCheck = await openPageAtTime(
    "2026-07-02T02:45:00.000Z",
    "/?view=matches&date=2026-07-01&tz=America%2FLos_Angeles&lineupPrototype=1",
    { desktopPointerMedia: true }
  );
  await finalLineupModeCheck.page.locator('[data-match-id="match-81-round-of-32-2026-07-01"]').click();
  const finalLineupState = await finalLineupModeCheck.page.locator("#match-info .lineup-preview-block").evaluate((block) => ({
    ariaLabel: block.getAttribute("aria-label") || "",
    helpLabel: block.querySelector(".lineup-heading .info-tooltip-button")?.getAttribute("aria-label") || "",
    hasPredictedLineupsCopy: block.textContent.includes("Predicted lineups"),
    hasPredictionHeadingCopy: block.textContent.includes("Line-ups (prediction)"),
    heading: block.querySelector(".lineup-heading span")?.textContent.replace(/\s+/g, " ").trim() || "",
    ...(() => {
      const visibleTablist = [...block.querySelectorAll(".lineup-card-tabs")].find((tablist) => {
        const bounds = tablist.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0;
      });
      const visibleTabs = [...(visibleTablist?.querySelectorAll(".lineup-tab") || [])];
      const tabWidths = visibleTabs.map((tab) => Math.round(tab.getBoundingClientRect().width));
      const tablistBounds = visibleTablist?.getBoundingClientRect();
      const formationPillBounds = visibleTablist
        ?.closest(".lineup-team-band")
        ?.querySelector(".lineup-formation-pill")
        ?.getBoundingClientRect();
      return {
        tabAriaLabels: visibleTabs.map((tab) => tab.getAttribute("aria-label") || ""),
        tabCompactLabels: visibleTabs.map(
          (tab) => tab.querySelector(".lineup-tab-label-compact")?.textContent.replace(/\s+/g, " ").trim() || ""
        ),
        tabFullLabelsHidden: visibleTabs.every(
          (tab) => getComputedStyle(tab.querySelector(".lineup-tab-label-full")).display === "none"
        ),
        tablistOverflow: visibleTablist ? visibleTablist.scrollWidth - visibleTablist.clientWidth : null,
        tablistWidth: tablistBounds ? Math.round(tablistBounds.width) : null,
        tablistHeight: tablistBounds ? Math.round(tablistBounds.height) : null,
        tabMaxWidth: tabWidths.length ? Math.max(...tabWidths) : null,
        formationPillHeight: formationPillBounds ? Math.round(formationPillBounds.height) : null,
        tabWidthDelta: tabWidths.length ? Math.max(...tabWidths) - Math.min(...tabWidths) : null
      };
    })()
  }));
  assert(
      finalLineupState.heading === "Line-ups" &&
      finalLineupState.ariaLabel === "Line-ups" &&
      finalLineupState.tabCompactLabels.length === 2 &&
      finalLineupState.tabCompactLabels.every((label) => /^[A-Z0-9]{3}$/.test(label)) &&
      finalLineupState.tabAriaLabels.length === 2 &&
      finalLineupState.tabAriaLabels.every((label, index) => label && label !== finalLineupState.tabCompactLabels[index]) &&
      finalLineupState.tabFullLabelsHidden &&
      finalLineupState.tablistOverflow <= 1 &&
      finalLineupState.tablistWidth <= 170 &&
      finalLineupState.tabMaxWidth <= 80 &&
      Math.abs(finalLineupState.tablistHeight - finalLineupState.formationPillHeight) <= 1 &&
      hasFinalLineupTooltip(finalLineupState.helpLabel) &&
      !finalLineupState.hasPredictionHeadingCopy &&
      !finalLineupState.hasPredictedLineupsCopy,
    `Finished matches should not keep a prediction lineup heading, and team tabs should use compact visible codes. Measured ${JSON.stringify(finalLineupState)}.`
  );

  const lineupInfoButton = finalLineupModeCheck.page.locator(
    "#match-info .lineup-heading .info-tooltip-button"
  );
  await lineupInfoButton.evaluate((button) => {
    const matchInfo = button.closest("#match-info");
    const cardTop = matchInfo.getBoundingClientRect().top;
    const buttonTop = button.getBoundingClientRect().top;
    matchInfo.scrollTop += buttonTop - cardTop - 4;
  });
  const lineupInfoButtonBounds = await lineupInfoButton.boundingBox();
  await finalLineupModeCheck.page.mouse.move(
    lineupInfoButtonBounds.x + lineupInfoButtonBounds.width / 2,
    lineupInfoButtonBounds.y + lineupInfoButtonBounds.height / 2
  );
  await finalLineupModeCheck.page.waitForFunction(() =>
    document
      .querySelector("#match-info .lineup-heading .info-tooltip-button")
      ?.classList.contains("is-tooltip-below")
  );
  const clippedLineupInfoTooltipState = await lineupInfoButton.evaluate((button) => {
    const matchInfo = button.closest("#match-info");
    const buttonBounds = button.getBoundingClientRect();
    const cardBounds = matchInfo.getBoundingClientRect();
    const tooltipStyle = getComputedStyle(button, "::after");
    const tooltipTop = buttonBounds.top + (Number.parseFloat(tooltipStyle.top) || 0);

    return {
      buttonTopGap: Math.round((buttonBounds.top - cardBounds.top) * 10) / 10,
      cardTop: Math.round(cardBounds.top * 10) / 10,
      isBelow: button.classList.contains("is-tooltip-below"),
      overflowY: getComputedStyle(matchInfo).overflowY,
      tooltipBottom: tooltipStyle.bottom,
      tooltipTop: Math.round(tooltipTop * 10) / 10,
      tooltipTopProperty: tooltipStyle.top
    };
  });
  assert(
    clippedLineupInfoTooltipState.buttonTopGap <= 6 &&
      clippedLineupInfoTooltipState.isBelow &&
      clippedLineupInfoTooltipState.overflowY === "auto" &&
      clippedLineupInfoTooltipState.tooltipTopProperty !== "auto" &&
      clippedLineupInfoTooltipState.tooltipTop > clippedLineupInfoTooltipState.cardTop,
    `A line-up info tooltip near the top of the desktop scroll card should flip below its trigger instead of being clipped. Measured ${JSON.stringify(clippedLineupInfoTooltipState)}.`
  );

  await finalLineupModeCheck.page.locator('[data-match-id="match-80-round-of-32-2026-07-01"]').click();
  const lineupCornerEventState = await finalLineupModeCheck.page
    .locator("#match-info .lineup-preview-block")
    .evaluate((block) => {
      const labelState = (selector) =>
        [...block.querySelectorAll(selector)].map((badge) => ({
          ariaLabel: badge.getAttribute("aria-label") || "",
          text: badge.textContent.replace(/\s+/g, " ").trim(),
          tooltip: badge.getAttribute("data-tooltip") || "",
          title: badge.getAttribute("title") || ""
        }));
      return {
        cardLabels: labelState(".lineup-avatar-card-events .lineup-event-card"),
        scoreLabels: labelState(".lineup-avatar-score-events .lineup-event-score")
      };
    });
  const kaneGoalLabels = lineupCornerEventState.scoreLabels.filter(
    (label) => label.ariaLabel.includes("Harry Kane") && label.ariaLabel.includes("Goal")
  );
  assert(
    lineupCornerEventState.cardLabels.some(
      (label) =>
        label.ariaLabel.includes("19'") &&
          label.ariaLabel.includes("Jude Bellingham") &&
          label.ariaLabel.includes("Yellow card") &&
          label.text === "" &&
          label.tooltip === "19' Yellow card" &&
          label.title === ""
    ) &&
      kaneGoalLabels.length === 1 &&
      kaneGoalLabels[0].ariaLabel.includes("75'") &&
      kaneGoalLabels[0].ariaLabel.includes("86'") &&
      kaneGoalLabels[0].text === "2G" &&
      kaneGoalLabels[0].tooltip === "75' goal, 86' goal" &&
      kaneGoalLabels[0].title === "" &&
      lineupCornerEventState.scoreLabels.some(
        (label) =>
          label.ariaLabel.includes("7'") &&
          label.ariaLabel.includes("Chancel Mbemba") &&
          label.ariaLabel.includes("Assist") &&
          label.tooltip === "7' assist" &&
          label.title === ""
      ),
    `Line-up player thumbnails should expose full event aria labels while goal and assist tooltips stay compact. Measured ${JSON.stringify(lineupCornerEventState)}.`
  );
  const lineupEventBadge = finalLineupModeCheck.page
    .locator(
      '#match-info .lineup-tab-panel:not([hidden]) .lineup-event-score[aria-label*="Harry Kane"][aria-label*="Goal"]'
    )
    .first();
  await lineupEventBadge.scrollIntoViewIfNeeded();
  await lineupEventBadge.focus();
  assert(
    await lineupEventBadge.evaluate((badge) => document.activeElement === badge),
    "Line-up event badges should accept keyboard focus."
  );
  await lineupEventBadge.dispatchEvent("focusin", { bubbles: true });
  await finalLineupModeCheck.page.waitForFunction(() => {
    const tooltip = document.querySelector(".lineup-event-tooltip-floating");
    const styles = tooltip ? getComputedStyle(tooltip) : null;
    return (
      tooltip?.textContent.trim() === "75' goal, 86' goal" &&
      tooltip?.classList.contains("is-visible") &&
      styles?.visibility === "visible" &&
      Number(styles.opacity) > 0.05
    );
  });
  await lineupEventBadge.dispatchEvent("pointerleave", {
    bubbles: false,
    pointerType: "mouse"
  });
  await finalLineupModeCheck.page.waitForTimeout(120);
  const lineupEventTooltipState = await finalLineupModeCheck.page.evaluate(() => {
    const tooltip = document.querySelector(".lineup-event-tooltip-floating");
    const tooltipBounds = tooltip?.getBoundingClientRect();
    const visiblePlayerCards = [...document.querySelectorAll(".player-card")]
      .filter((card) => {
        const styles = getComputedStyle(card);
        const bounds = card.getBoundingClientRect();
        return (
          styles.display !== "none" &&
          styles.visibility !== "hidden" &&
          Number(styles.opacity) > 0.05 &&
          bounds.width > 0 &&
          bounds.height > 0
        );
      })
      .map((card) => card.querySelector(".player-card-name")?.textContent.trim() || "");
    return {
      activeElement: document.activeElement?.className || document.activeElement?.tagName || "",
      badgeFocused: document.activeElement?.matches?.(
        '.lineup-event-score[aria-label*="Harry Kane"][aria-label*="Goal"]'
      ) || false,
      tooltipText: tooltip?.textContent.trim() || "",
      tooltipVisible: Boolean(tooltip?.classList.contains("is-visible")),
      tooltipBounds: tooltipBounds
        ? {
            bottom: Math.round(tooltipBounds.bottom),
            left: Math.round(tooltipBounds.left),
            right: Math.round(tooltipBounds.right),
            top: Math.round(tooltipBounds.top)
          }
        : null,
      viewport: {
        height: window.innerHeight,
        width: window.innerWidth
      },
      visiblePlayerCards
    };
  });
  assert(
    lineupEventTooltipState.tooltipVisible &&
      lineupEventTooltipState.tooltipText === "75' goal, 86' goal" &&
      lineupEventTooltipState.tooltipBounds &&
      lineupEventTooltipState.tooltipBounds.left >= 0 &&
      lineupEventTooltipState.tooltipBounds.right <= lineupEventTooltipState.viewport.width &&
      lineupEventTooltipState.tooltipBounds.top >= 0 &&
      lineupEventTooltipState.tooltipBounds.bottom <= lineupEventTooltipState.viewport.height &&
      lineupEventTooltipState.visiblePlayerCards.length === 0,
    `Line-up event badges should show one unclipped floating tooltip without also showing a player card. Measured ${JSON.stringify(lineupEventTooltipState)}.`
  );
  await finalLineupModeCheck.page.keyboard.press("Escape");
  await finalLineupModeCheck.page.waitForFunction(() => {
    const tooltip = document.querySelector(".lineup-event-tooltip-floating");
    return !tooltip || !tooltip.classList.contains("is-visible");
  });
  await finalLineupModeCheck.page
    .locator("#match-info .lineup-tab-panel:not([hidden]) .lineup-tab[data-lineup-tab='away']")
    .dispatchEvent("click");
  const desktopLineupTriggerState = await finalLineupModeCheck.page.evaluate(() => {
    const readTrigger = (selector) => {
      const element = document.querySelector(selector);
      return element
        ? {
            ariaExpanded: element.getAttribute("aria-expanded") || "",
            href: element.getAttribute("href") || "",
            rel: element.getAttribute("rel") || "",
            role: element.getAttribute("role") || "",
            tabIndex: element.tabIndex,
            tagName: element.tagName,
            target: element.getAttribute("target") || "",
            text: element.textContent.replace(/\s+/g, " ").trim()
          }
        : null;
    };

    return {
      coach: readTrigger(
        "#match-info .lineup-preview-block .lineup-coach-trigger, #match-info .lineup-preview-block .lineup-coach-icon-trigger"
      ),
      formation: readTrigger("#match-info .lineup-tab-panel:not([hidden]) .lineup-formation-pill"),
      player: readTrigger("#match-info .lineup-tab-panel:not([hidden]) .lineup-player-name")
    };
  });
  assert(
    desktopLineupTriggerState.player?.role === "button" &&
      desktopLineupTriggerState.player?.tabIndex === 0 &&
      desktopLineupTriggerState.player?.href === "" &&
      desktopLineupTriggerState.formation?.role === "button" &&
      desktopLineupTriggerState.formation?.tabIndex === 0 &&
      desktopLineupTriggerState.formation?.href === "" &&
      desktopLineupTriggerState.coach?.tagName === "SPAN" &&
      desktopLineupTriggerState.coach?.role === "button" &&
      desktopLineupTriggerState.coach?.tabIndex === 0 &&
      desktopLineupTriggerState.coach?.href === "" &&
      desktopLineupTriggerState.coach?.target === "" &&
      desktopLineupTriggerState.coach?.rel === "",
    `Desktop lineup triggers should keep player, formation, and coach controls internal with no coach source link. Measured ${JSON.stringify(desktopLineupTriggerState)}.`
  );
  const hoverLineupPlayerTrigger = finalLineupModeCheck.page
    .locator("#match-info .lineup-tab-panel:not([hidden]) .lineup-player-name")
    .first();
  await hoverLineupPlayerTrigger.scrollIntoViewIfNeeded();
  await hoverLineupPlayerTrigger.hover();
  await finalLineupModeCheck.page.waitForFunction(() => {
    const card = document.querySelector(".player-card-floating.is-visible");
    return card && Number(getComputedStyle(card).opacity) > 0.8;
  });
  await finalLineupModeCheck.page.evaluate(() => window.scrollBy(0, window.scrollY > 220 ? -220 : 220));
  await finalLineupModeCheck.page.mouse.click(24, 24);
  await finalLineupModeCheck.page.waitForFunction(() => {
    const card = document.querySelector(".player-card-floating");
    const styles = card ? getComputedStyle(card) : null;
    const visibleCards = [...document.querySelectorAll(".player-card")].filter((playerCard) => {
      const cardStyles = getComputedStyle(playerCard);
      const bounds = playerCard.getBoundingClientRect();
      return (
        cardStyles.display !== "none" &&
        cardStyles.visibility !== "hidden" &&
        Number(cardStyles.opacity) > 0.05 &&
        bounds.width > 0 &&
        bounds.height > 0
      );
    });
    return (
      !document.querySelector(".player-hover.is-card-portaled, .player-hover.is-card-open") &&
      visibleCards.length === 0 &&
      (!card ||
        !card.classList.contains("is-visible") ||
        styles?.visibility === "hidden" ||
        Number(styles?.opacity || 0) <= 0.05)
    );
  });
  const desktopHoverScrollClickCardState = await finalLineupModeCheck.page.evaluate(() => {
    const card = document.querySelector(".player-card-floating");
    const styles = card ? getComputedStyle(card) : null;
    return {
      floatingCardVisible: Boolean(
        card?.classList.contains("is-visible") &&
          styles?.visibility !== "hidden" &&
          Number(styles?.opacity || 0) > 0.05
      ),
      portaledSources: document.querySelectorAll(".player-hover.is-card-portaled").length,
      openSources: document.querySelectorAll(".player-hover.is-card-open").length,
      visibleCards: [...document.querySelectorAll(".player-card")]
        .filter((playerCard) => {
          const cardStyles = getComputedStyle(playerCard);
          const bounds = playerCard.getBoundingClientRect();
          return (
            cardStyles.display !== "none" &&
            cardStyles.visibility !== "hidden" &&
            Number(cardStyles.opacity) > 0.05 &&
            bounds.width > 0 &&
            bounds.height > 0
          );
        })
        .map((playerCard) => playerCard.querySelector(".player-card-name")?.textContent.trim() || "")
    };
  });
  assert(
    !desktopHoverScrollClickCardState.floatingCardVisible &&
      desktopHoverScrollClickCardState.portaledSources === 0 &&
      desktopHoverScrollClickCardState.openSources === 0 &&
      desktopHoverScrollClickCardState.visibleCards.length === 0,
    `Desktop lineup hover cards should fade away after scrolling and clicking outside. Measured ${JSON.stringify(desktopHoverScrollClickCardState)}.`
  );
  const focusedCoachTrigger = finalLineupModeCheck.page
    .locator(
      "#match-info .lineup-tab-panel:not([hidden]) .lineup-coach-trigger, #match-info .lineup-tab-panel:not([hidden]) .lineup-coach-icon-trigger"
    )
    .first();
  await focusedCoachTrigger.focus();
  await finalLineupModeCheck.page.waitForFunction(() =>
    [...document.querySelectorAll(".player-card")]
      .filter((card) => {
        const style = getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0.05 &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .some((card) => card.textContent.includes("Head Coach"))
  );
  await finalLineupModeCheck.page.keyboard.press("Escape");
  await finalLineupModeCheck.page.waitForFunction(() =>
    [...document.querySelectorAll(".player-card")].every((card) => {
      const style = getComputedStyle(card);
      const rect = card.getBoundingClientRect();
      return (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) <= 0.05 ||
        rect.width === 0 ||
        rect.height === 0
      );
    })
  );
  const desktopCoachFocusCloseState = await finalLineupModeCheck.page.evaluate(() => ({
    activeHoverText:
      document.activeElement?.closest?.(".player-hover")?.querySelector(".player-link")?.textContent.trim() || "",
    visibleCards: [...document.querySelectorAll(".player-card")]
      .filter((card) => {
        const style = getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0.05 &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .map((card) => card.querySelector(".player-card-name")?.textContent.trim() || "")
  }));
  assert(
    desktopCoachFocusCloseState.activeHoverText === "" && desktopCoachFocusCloseState.visibleCards.length === 0,
    `Escape should close focus-only coach cards by blurring the transient trigger. Measured ${JSON.stringify(desktopCoachFocusCloseState)}.`
  );
  const focusedFormationPill = finalLineupModeCheck.page
    .locator("#match-info .lineup-tab-panel:not([hidden]) .lineup-formation-pill")
    .first();
  const focusedFormationLabel = (await focusedFormationPill.textContent())?.trim() || "";
  await focusedFormationPill.focus();
  await finalLineupModeCheck.page.waitForFunction(() =>
    [...document.querySelectorAll(".player-card")]
      .filter((card) => {
        const style = getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0.05 &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .some(
        (card) =>
          card.querySelector(".player-card-position")?.textContent.trim() === "Formation" &&
          /\d/.test(card.querySelector(".player-card-name")?.textContent || "")
      )
  );
  await finalLineupModeCheck.page.keyboard.press("Escape");
  await finalLineupModeCheck.page.waitForFunction(() =>
    [...document.querySelectorAll(".player-card")].every((card) => {
      const style = getComputedStyle(card);
      const rect = card.getBoundingClientRect();
      return (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) <= 0.05 ||
        rect.width === 0 ||
        rect.height === 0
      );
    })
  );
  const desktopFormationFocusCloseState = await finalLineupModeCheck.page.evaluate(() => ({
    activeHoverText:
      document.activeElement?.closest?.(".player-hover")?.querySelector(".player-link")?.textContent.trim() || "",
    visibleCards: [...document.querySelectorAll(".player-card")]
      .filter((card) => {
        const style = getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0.05 &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .map((card) => card.querySelector(".player-card-name")?.textContent.trim() || "")
  }));
  assert(
    desktopFormationFocusCloseState.activeHoverText === "" && desktopFormationFocusCloseState.visibleCards.length === 0,
    `Escape should close focus-only formation cards by blurring the transient trigger. Measured ${JSON.stringify(desktopFormationFocusCloseState)}.`
  );
  const cipengaLineupTrigger = finalLineupModeCheck.page
    .locator("#match-info .lineup-tab-panel:not([hidden]) .lineup-player-name", { hasText: /Cipenga/ })
    .first();
  const sadikiLineupTrigger = finalLineupModeCheck.page
    .locator("#match-info .lineup-tab-panel:not([hidden]) .lineup-player-name", { hasText: /Sadiki/ })
    .first();
  await finalLineupModeCheck.page
    .locator("#match-info .lineup-tab-panel:not([hidden]) .lineup-formation-pill")
    .click();
  await sadikiLineupTrigger.focus();
  await finalLineupModeCheck.page.keyboard.press("Enter");
  await finalLineupModeCheck.page.waitForFunction(() =>
    [...document.querySelectorAll(".player-card")]
      .filter((card) => {
        const style = getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0.05 &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .some((card) => card.querySelector(".player-card-name")?.textContent.trim() === "Noah Sadiki")
  );
  const desktopLineupFormationCardState = await finalLineupModeCheck.page.evaluate(() => {
    const visibleCards = [...document.querySelectorAll(".player-card")]
      .filter((card) => {
        const style = getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0.05 &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .map((card) => card.querySelector(".player-card-name")?.textContent.trim() || "");

    return {
      activeHoverText:
        document.activeElement?.closest?.(".player-hover")?.querySelector(".player-link")?.textContent.trim() || "",
      visibleCards
    };
  });
  assert(
    desktopLineupFormationCardState.activeHoverText !== focusedFormationLabel &&
      desktopLineupFormationCardState.visibleCards.includes("Noah Sadiki"),
    `Desktop formation-card clicks should not block the next keyboard-opened player card. Measured ${JSON.stringify(desktopLineupFormationCardState)}.`
  );
  await finalLineupModeCheck.page.keyboard.press("Escape");
  await cipengaLineupTrigger.click();
  await sadikiLineupTrigger.focus();
  await finalLineupModeCheck.page.keyboard.press("Enter");
  await finalLineupModeCheck.page.evaluate(() => {
    window.dispatchEvent(new Event("scroll"));
  });
  await finalLineupModeCheck.page.waitForFunction(() =>
    [...document.querySelectorAll(".player-card")]
      .filter((card) => {
        const style = getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0.05 &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .some((card) => card.querySelector(".player-card-name")?.textContent.trim() === "Noah Sadiki")
  );
  const desktopLineupPlayerCardState = await finalLineupModeCheck.page.evaluate(() => {
    const visibleCards = [...document.querySelectorAll(".player-card")]
      .filter((card) => {
        const style = getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0.05 &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .map((card) => card.querySelector(".player-card-name")?.textContent.trim() || "");

    return {
      activePlayerText:
        document.activeElement?.closest?.(".player-hover")?.querySelector(".player-link")?.textContent.trim() || "",
      visibleCards
    };
  });
  assert(
    desktopLineupPlayerCardState.activePlayerText !== "B. Cipenga" &&
      desktopLineupPlayerCardState.visibleCards.includes("Noah Sadiki"),
    `Desktop player-card clicks should not pin a clicked lineup card over the next keyboard-opened card. Measured ${JSON.stringify(desktopLineupPlayerCardState)}.`
  );
  await finalLineupModeCheck.page.evaluate(() => {
    document.querySelector("#juggle-record")?.click();
  });
  await finalLineupModeCheck.page.waitForFunction(() =>
    document.body.classList.contains("is-juggle-active")
  );
  await sadikiLineupTrigger.dispatchEvent("pointerenter", {
    bubbles: false,
    pointerType: "mouse"
  });
  await sadikiLineupTrigger.focus();
  await finalLineupModeCheck.page.keyboard.press("Enter");
  await finalLineupModeCheck.page.waitForFunction(() => {
    if (!document.body.classList.contains("is-juggle-active")) return false;
    return [...document.querySelectorAll(".player-card")].every((card) => {
      const style = getComputedStyle(card);
      const rect = card.getBoundingClientRect();
      return (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) <= 0.05 ||
        rect.width <= 0 ||
        rect.height <= 0
      );
    });
  });
  const activeJugglePlayerCardState = await finalLineupModeCheck.page.evaluate(() => ({
    activeElementIsPlayerTrigger: Boolean(
      document.activeElement?.matches?.("[data-player-card-trigger='true']")
    ),
    activeRun: document.body.classList.contains("is-juggle-active"),
    expandedTriggers: [...document.querySelectorAll("[data-player-card-trigger='true']")]
      .filter((trigger) => trigger.getAttribute("aria-expanded") === "true")
      .map((trigger) => trigger.textContent.replace(/\s+/g, " ").trim()),
    openSources: document.querySelectorAll(".player-hover.is-card-open").length,
    portaledSources: document.querySelectorAll(".player-hover.is-card-portaled").length,
    visibleCards: [...document.querySelectorAll(".player-card")]
      .filter((card) => {
        const style = getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0.05 &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .map((card) => card.querySelector(".player-card-name")?.textContent.trim() || "")
  }));
  assert(
    activeJugglePlayerCardState.activeRun &&
      !activeJugglePlayerCardState.activeElementIsPlayerTrigger &&
      activeJugglePlayerCardState.expandedTriggers.length === 0 &&
      activeJugglePlayerCardState.openSources === 0 &&
      activeJugglePlayerCardState.portaledSources === 0 &&
      activeJugglePlayerCardState.visibleCards.length === 0,
    `Starting the soccer game should dismiss an already-open lineup card and block mouse or keyboard player-card reopening for the active run. Measured ${JSON.stringify(activeJugglePlayerCardState)}.`
  );
  await finalLineupModeCheck.page.waitForFunction(() =>
    !document.body.classList.contains("is-juggle-active")
  );
  await finalLineupModeCheck.page.mouse.move(8, 8);
  await sadikiLineupTrigger.hover();
  await finalLineupModeCheck.page.waitForFunction(() =>
    [...document.querySelectorAll(".player-card")].some((card) => {
      const style = getComputedStyle(card);
      const rect = card.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0.8 &&
        rect.width > 0 &&
        rect.height > 0 &&
        card.querySelector(".player-card-name")?.textContent.trim() === "Noah Sadiki"
      );
    })
  );

  await finalLineupModeCheck.page.goto(
    `${baseUrl}?view=matches&date=2026-06-11&tz=America%2FLos_Angeles&lineupPrototype=1`,
    { waitUntil: "load" }
  );
  await finalLineupModeCheck.page.waitForSelector(".match-row", { state: "attached" });
  await finalLineupModeCheck.page.locator('[data-match-id="mexico-south-africa-2026-06-11"]').click();
  await finalLineupModeCheck.page.locator("#match-info .lineup-preview-block").waitFor({ state: "attached" });
  const redCardPillState = await finalLineupModeCheck.page
    .locator("#match-info .lineup-preview-block")
    .evaluate((block) => {
      const formationCards = [...block.querySelectorAll(".lineup-formation-card")].map((card) => ({
        title: card.querySelector(".player-card-name")?.textContent.trim() || "",
        notes: [...card.querySelectorAll(".lineup-formation-note")].map((note) =>
          note.textContent.replace(/\s+/g, " ").trim()
        )
      }));
      const redCards = [...block.querySelectorAll(".lineup-avatar-card-events .lineup-event-card.is-red")].map((badge) => {
        const bounds = badge.getBoundingClientRect();
        return {
          ariaLabel: badge.getAttribute("aria-label") || "",
          text: badge.textContent.replace(/\s+/g, " ").trim(),
          tooltip: badge.getAttribute("data-tooltip") || "",
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
          radius: getComputedStyle(badge).borderTopLeftRadius
        };
      });
      return { formationCards, redCards };
    });
  assert(
    redCardPillState.formationCards.every(
      (card) =>
        /^\d(?:-\d+)+$/.test(card.title) &&
        card.notes.length === 2 &&
        card.notes.some((note) => note.includes("Good at") && note.length > 24) &&
        card.notes.some((note) => note.includes("Can struggle with") && note.length > 32)
    ) &&
      redCardPillState.redCards.some(
        (card) =>
          card.ariaLabel.includes("90+2'") &&
          card.ariaLabel.includes("Cesar Montes") &&
          card.ariaLabel.includes("Red card") &&
          card.text === "" &&
          card.height >= 14 &&
          card.radius !== "2px" &&
          card.tooltip === "90+2' Red card"
      ),
    `Corrected exact formations should render populated formation-card notes, and floating red cards should keep timing in the tooltip instead of visible text. Measured ${JSON.stringify(redCardPillState)}.`
  );
  await finalLineupModeCheck.context.close();

  const coveredLineupCoachCases = [
    {
      date: "2026-06-30",
      matchId: "match-77-round-of-32-2026-06-30",
      coaches: ["Didier Deschamps", "Graham Potter"],
      source: "fifa"
    },
    {
      date: "2026-06-30",
      matchId: "match-78-round-of-32-2026-06-30",
      coaches: ["Emerse Fae", "Stale Solbakken"],
      source: "fifa"
    },
    {
      date: "2026-06-30",
      matchId: "match-79-round-of-32-2026-06-30",
      coaches: ["Javier Aguirre", "Sebastian Beccacece"],
      source: "fifa"
    },
    {
      date: "2026-07-01",
      matchId: "match-80-round-of-32-2026-07-01",
      coaches: ["Thomas Tuchel", "Sebastien Desabre"],
      source: "fifa"
    },
    {
      date: "2026-07-01",
      matchId: "match-81-round-of-32-2026-07-01",
      coaches: ["Mauricio Pochettino", "Sergej Barbarez"],
      source: "fifa"
    },
    {
      date: "2026-07-01",
      matchId: "match-82-round-of-32-2026-07-01",
      coaches: ["Rudi Garcia", "Pape Thiaw"],
      source: "fifa"
    },
    {
      date: "2026-07-02",
      matchId: "match-83-round-of-32-2026-07-02",
      coaches: ["Roberto Martínez", "Z. Dalić"],
      source: "fifa"
    },
    {
      date: "2026-07-02",
      matchId: "match-84-round-of-32-2026-07-02",
      coaches: ["Luis De La Fuente", "Ralf Rangnick"],
      source: "fifa"
    },
    {
      date: "2026-07-02",
      matchId: "match-85-round-of-32-2026-07-02",
      coaches: ["Murat Yakin", "Vladimir Petkovic"],
      source: "fifa"
    },
    {
      date: "2026-07-07",
      matchId: "match-95-round-of-16-2026-07-07",
      coaches: ["Lionel Scaloni", "Hossam Hassan"],
      source: "fifa"
    }
  ];
  const lineupCoachCoverageCheck = await openPageAtTime(
    "2026-07-01T22:00:00.000Z",
    "/?view=matches&date=2026-06-30&tz=America%2FLos_Angeles&lineupPrototype=1"
  );
  const normalizeCoachName = (name) =>
    (name || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\./g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  const normalizeCoachNameTokens = (name) =>
    normalizeCoachName(name)
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
  const canonicalCoachNames = (name) => {
    const tokens = normalizeCoachNameTokens(name);
    if (tokens.length === 0) {
      return new Set([]);
    }
    const canonical = new Set();
    canonical.add(tokens.join(" "));
    if (tokens.length >= 2) {
      canonical.add(`${tokens[0][0]} ${tokens[tokens.length - 1]}`);
      canonical.add(tokens[tokens.length - 1]);
    }
    return canonical;
  };
  const coachNameMatches = (actual, expected) => {
    const actualNames = canonicalCoachNames(actual);
    for (const name of actualNames) {
      if (canonicalCoachNames(expected).has(name)) {
        return true;
      }
    }
    return false;
  };
  let activeLineupCoachDate = "2026-06-30";
  for (const coachCase of coveredLineupCoachCases) {
    if (coachCase.date !== activeLineupCoachDate) {
      await lineupCoachCoverageCheck.page.goto(
        `${baseUrl}?view=matches&date=${coachCase.date}&tz=America%2FLos_Angeles&lineupPrototype=1`,
        { waitUntil: "load" }
      );
      await lineupCoachCoverageCheck.page.waitForSelector(".match-row", { state: "attached" });
      activeLineupCoachDate = coachCase.date;
    }

    await lineupCoachCoverageCheck.page.locator(`[data-match-id="${coachCase.matchId}"]`).click();
    await lineupCoachCoverageCheck.page.locator("#match-info .lineup-preview-block").waitFor({
      state: "attached"
    });
    await lineupCoachCoverageCheck.page.waitForFunction(
      (expectedCoaches) => {
        const normalizeCoachName = (name) =>
          (name || "")
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .replace(/\./g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
        const canonicalCoachNames = (name) => {
          const tokens = normalizeCoachName(name)
            .split(/\s+/)
            .map((part) => part.trim())
            .filter(Boolean);
          if (tokens.length === 0) {
            return new Set([]);
          }
          const canonical = new Set([tokens.join(" ")]);
          if (tokens.length >= 2) {
            canonical.add(`${tokens[0][0]} ${tokens[tokens.length - 1]}`);
            canonical.add(tokens[tokens.length - 1]);
          }
          return canonical;
        };
        const coachNameMatches = (actual, expected) => {
          const actualNames = canonicalCoachNames(actual);
          for (const name of actualNames) {
            if (canonicalCoachNames(expected).has(name)) {
              return true;
            }
          }
          return false;
        };
        const names = [...document.querySelectorAll("#match-info .lineup-coach-icon-trigger")].map((trigger) =>
          (trigger.getAttribute("aria-label") || "").split(":")[0].trim()
        );
        return (
          names.length === expectedCoaches.length &&
          names.every((name, index) => coachNameMatches(name, expectedCoaches[index]))
        );
      },
      coachCase.coaches,
      { timeout: 10_000 }
    );
    const coachState = await lineupCoachCoverageCheck.page
      .locator("#match-info .lineup-preview-block")
      .evaluate((block) => {
        const triggers = [...block.querySelectorAll(".lineup-coach-icon-trigger")];
        return {
          avatarCircleStates: [...block.querySelectorAll(".lineup-coach-avatar")].map((avatar) => {
            const bounds = avatar.getBoundingClientRect();
            const radius = getComputedStyle(avatar).borderTopLeftRadius;
            return {
              radius,
              width: Math.round(bounds.width),
              height: Math.round(bounds.height),
              circular: radius === "50%" || parseFloat(radius) >= Math.min(bounds.width, bounds.height) / 2 - 1
            };
          }),
          avatarTexts: [...block.querySelectorAll(".lineup-coach-avatar")].map((avatar) =>
            avatar.textContent.replace(/\s+/g, " ").trim()
          ),
          cardPhotoRadii: [...block.querySelectorAll(".lineup-coach-card-photo")].map(
            (photo) => getComputedStyle(photo).borderTopLeftRadius
          ),
          copyNoteCounts: [...block.querySelectorAll(".lineup-coach-card")].map(
            (card) => card.querySelectorAll(".lineup-coach-copy .player-card-note").length
          ),
          hrefs: triggers.map((trigger) => trigger.getAttribute("href") || ""),
          imageUrls: triggers.map((trigger) => trigger.querySelector("img")?.getAttribute("src") || ""),
          names: triggers.map((trigger) => (trigger.getAttribute("aria-label") || "").split(":")[0].trim())
        };
      });
    const coachCoveragePass =
      coachState.names.length === coachCase.coaches.length &&
      coachState.names.every((name, index) => coachNameMatches(name, coachCase.coaches[index])) &&
      coachState.hrefs.length === 2 &&
      coachState.hrefs.every((href) => href === "") &&
      coachState.imageUrls.length === 2 &&
      (coachState.imageUrls.every((url) =>
        coachCase.source === "fifa"
          ? url.startsWith("https://digitalhub.fifa.com/transform/")
          : url.startsWith("https://commons.wikimedia.org/wiki/Special:FilePath/")
      ) ||
        (coachState.avatarTexts.length === 2 && coachState.avatarTexts.every(Boolean))) &&
      coachState.cardPhotoRadii.length === 2 &&
      coachState.cardPhotoRadii.every((radius) => radius === "13px") &&
      coachState.avatarCircleStates.length === 2 &&
      coachState.avatarCircleStates.every((state) => state.circular) &&
      coachState.copyNoteCounts.length === 2 &&
      coachState.copyNoteCounts.every((count) => count === 3);
    assert(
      coachCoveragePass,
      `Covered line-up match ${coachCase.matchId} should render both coach icons without links and with the expected portrait source and card copy shape. Measured ${JSON.stringify(coachState)}.`
    );

    const brokenCoachFallbackState = await lineupCoachCoverageCheck.page
      .locator("#match-info .lineup-preview-block")
      .evaluate((block) => {
        const images = [...block.querySelectorAll(".lineup-coach-avatar img, .lineup-coach-card-photo img")];
        images.forEach((image) => image.dispatchEvent(new Event("error")));

        return {
          avatarTexts: [...block.querySelectorAll(".lineup-coach-avatar")].map((avatar) =>
            avatar.textContent.replace(/\s+/g, " ").trim()
          ),
          cardPhotoTexts: [...block.querySelectorAll(".lineup-coach-card-photo")].map((photo) =>
            photo.textContent.replace(/\s+/g, " ").trim()
          ),
          nestedAvatarCount: block.querySelectorAll(".lineup-coach-avatar .lineup-coach-avatar").length,
          nestedCardPhotoCount: block.querySelectorAll(".lineup-coach-card-photo .lineup-coach-card-photo").length
        };
      });
    assert(
      brokenCoachFallbackState.nestedAvatarCount === 0 &&
        brokenCoachFallbackState.nestedCardPhotoCount === 0 &&
        brokenCoachFallbackState.avatarTexts.length === 2 &&
        brokenCoachFallbackState.avatarTexts.every(Boolean) &&
        brokenCoachFallbackState.cardPhotoTexts.length === 2 &&
        brokenCoachFallbackState.cardPhotoTexts.every(Boolean),
      `Broken coach-image fallbacks should keep one visual shell instead of nesting a second circle or card photo. Measured ${JSON.stringify(brokenCoachFallbackState)}.`
    );

    const lineupSideState = await lineupCoachCoverageCheck.page
      .locator("#match-info .lineup-preview-block")
      .evaluate((block) => {
        const rightSidePositions = new Set(["RB", "RWB", "RM", "RW"]);
        const leftSidePositions = new Set(["LB", "LWB", "LM", "LW"]);
        const markers = [...block.querySelectorAll(".lineup-player-marker")].map((marker) => {
          const position = marker.dataset.lineupPosition || "";
          const x = Number.parseFloat(marker.style.getPropertyValue("--x"));
          const name = marker.dataset.lineupPlayerName || marker.dataset.lineupStarterName || "";
          return { name, position, x };
        });
        const sideIssues = markers.filter(({ position, x }) => {
          if (!Number.isFinite(x)) return true;
          if (rightSidePositions.has(position)) return x < 50;
          if (leftSidePositions.has(position)) return x > 50;
          return false;
        });
        const byName = Object.fromEntries(markers.map((marker) => [marker.name, marker]));

        return { byName, markers, sideIssues };
      });
    assert(
      lineupSideState.sideIssues.length === 0,
      `Covered line-up match ${coachCase.matchId} should keep side-specific roles on the correct visual side. Measured ${JSON.stringify(lineupSideState.sideIssues)}.`
    );

    if (coachCase.matchId === "match-84-round-of-32-2026-07-02") {
      const spainWideRightWing = lineupSideState.markers.find(({ position }) => position === "RW");
      const spainWideLeftWing = lineupSideState.markers.find(({ position }) => position === "LW");
      const spainRightBack = lineupSideState.markers.find(({ position }) => position === "RB");
      const spainLeftBack = lineupSideState.markers.find(({ position }) => position === "LB");
      const spainWideState = [
        spainWideRightWing,
        spainWideLeftWing,
        spainRightBack,
        spainLeftBack
      ];
      assert(
        spainWideRightWing &&
          spainWideLeftWing &&
          spainWideRightWing.name !== spainWideLeftWing.name &&
          spainWideRightWing.x > 50 &&
          spainWideLeftWing.x < 50 &&
          spainRightBack?.x > 50 &&
          spainLeftBack?.x < 50,
        `Spain predicted line-up should place right-side attackers on the right and left-side attackers on the left. Measured ${JSON.stringify(spainWideState)}.`
      );
    }
  }
  await lineupCoachCoverageCheck.page.goto(
    `${baseUrl}?view=matches&date=2026-07-07&lang=zh&tz=America%2FLos_Angeles&lineupPrototype=1`,
    { waitUntil: "load" }
  );
  await lineupCoachCoverageCheck.page.waitForSelector(".match-row", { state: "attached" });
  await lineupCoachCoverageCheck.page.locator('[data-match-id="match-95-round-of-16-2026-07-07"]').click();
  await lineupCoachCoverageCheck.page.locator("#match-info .lineup-preview-block").waitFor({
    state: "attached"
  });
  const argentinaEgyptZhLineupState = await lineupCoachCoverageCheck.page
    .locator("#match-info .lineup-preview-block")
    .evaluate((block) => {
      const macAllisterMarker = block.querySelector('[data-lineup-player-name="Alexis Mac Allister"]');
      const macAllisterLabel = macAllisterMarker?.querySelector(".lineup-player-name")?.textContent
        .replace(/\s+/g, " ")
        .trim() || "";
      const coachCardText = [...block.querySelectorAll(".lineup-coach-card")]
        .map((card) => card.textContent.replace(/\s+/g, " ").trim())
        .join(" ");

      return {
        coachCardText,
        macAllisterLabel
      };
    });
  assert(
    argentinaEgyptZhLineupState.macAllisterLabel === "亚历克西斯·麦卡利斯特" &&
      argentinaEgyptZhLineupState.coachCardText.includes("斯卡洛尼打造了一支紧凑而聪明的阿根廷队") &&
      argentinaEgyptZhLineupState.coachCardText.includes("2022年世界杯") &&
      !argentinaEgyptZhLineupState.macAllisterLabel.includes("Alexis") &&
      !argentinaEgyptZhLineupState.coachCardText.includes("Scaloni builds") &&
      !argentinaEgyptZhLineupState.coachCardText.includes("Appointed in 2018"),
    `Argentina-Egypt Chinese lineup cards should fully localize Mac Allister and Scaloni coach copy. Measured ${JSON.stringify(argentinaEgyptZhLineupState)}.`
  );
  const argentinaEgyptDesktopLineupGeometry = await lineupCoachCoverageCheck.page
    .locator("#match-info .lineup-preview-block")
    .evaluate((block) => {
      const readMarker = (name) => {
        const marker = block.querySelector(`[data-lineup-player-name="${name}"]`);
        const avatar = marker?.querySelector(".lineup-avatar-wrap");
        const label = marker?.querySelector(".lineup-player-name");
        const value = marker?.querySelector(".lineup-player-value");
        const scoreEvents = marker?.querySelector(".lineup-avatar-score-events");
        const eventRow = marker?.querySelector(".lineup-player-event-row");
        const avatarRightEvents = marker?.querySelector(".lineup-avatar-right-events");
        if (!marker || !avatar || !label || !value) {
          return null;
        }

        const markerBounds = marker.getBoundingClientRect();
        const avatarBounds = avatar.getBoundingClientRect();
        const labelBounds = label.getBoundingClientRect();
        const valueBounds = value.getBoundingClientRect();
        const scoreBounds = scoreEvents?.getBoundingClientRect();
        const eventRowBounds = eventRow?.getBoundingClientRect();
        const avatarRightEventBounds = avatarRightEvents?.getBoundingClientRect();
        const avatarCenterX = (avatarBounds.left + avatarBounds.right) / 2;
        const labelCenterX = (labelBounds.left + labelBounds.right) / 2;
        const valueCenterX = (valueBounds.left + valueBounds.right) / 2;

        return {
          avatarCenterX,
          avatarCenterY: (avatarBounds.top + avatarBounds.bottom) / 2,
          avatarRightEvents: marker.querySelectorAll(".lineup-avatar-right-events").length,
          avatarRightEventOverlapTop: avatarRightEventBounds ? avatarRightEventBounds.bottom - avatarBounds.top : null,
          eventRows: marker.querySelectorAll(".lineup-player-event-row").length,
          eventRowGap: eventRowBounds ? eventRowBounds.top - valueBounds.bottom : null,
          labelValueGap: valueBounds.top - labelBounds.bottom,
          labelCenterX,
          markerHeight: markerBounds.height,
          nameCenterDelta: labelCenterX - avatarCenterX,
          scoreOverlapRight: scoreBounds ? scoreBounds.right - avatarBounds.right : null,
          scoreOverlapsAvatar: scoreBounds ? scoreBounds.left < avatarBounds.right : null,
          subToggles: marker.querySelectorAll(".lineup-avatar-right-events [data-lineup-substitution-toggle]").length,
          valueCenterDelta: valueCenterX - avatarCenterX,
          valueCount: marker.querySelectorAll(".lineup-player-value").length,
          valueText: value.textContent.replace(/\s+/g, " ").trim()
        };
      };

      return {
        alvarez: readMarker("Julian Alvarez"),
        messi: readMarker("Lionel Messi")
      };
    });
  assert(
    argentinaEgyptDesktopLineupGeometry.alvarez &&
      argentinaEgyptDesktopLineupGeometry.messi &&
      Math.abs(argentinaEgyptDesktopLineupGeometry.alvarez.nameCenterDelta) <= 1 &&
      Math.abs(argentinaEgyptDesktopLineupGeometry.messi.nameCenterDelta) <= 1 &&
      Math.abs(argentinaEgyptDesktopLineupGeometry.alvarez.valueCenterDelta) <= 1 &&
      Math.abs(argentinaEgyptDesktopLineupGeometry.messi.valueCenterDelta) <= 1 &&
      Math.abs(argentinaEgyptDesktopLineupGeometry.alvarez.avatarCenterY - argentinaEgyptDesktopLineupGeometry.messi.avatarCenterY) <= 1 &&
      argentinaEgyptDesktopLineupGeometry.alvarez.valueCount === 1 &&
      argentinaEgyptDesktopLineupGeometry.messi.valueCount === 1 &&
      argentinaEgyptDesktopLineupGeometry.alvarez.valueText.includes("€") &&
      argentinaEgyptDesktopLineupGeometry.messi.valueText.includes("€") &&
      argentinaEgyptDesktopLineupGeometry.alvarez.labelValueGap >= 0.75 &&
      argentinaEgyptDesktopLineupGeometry.alvarez.labelValueGap <= 4 &&
      argentinaEgyptDesktopLineupGeometry.messi.labelValueGap >= 0.75 &&
      argentinaEgyptDesktopLineupGeometry.messi.labelValueGap <= 4 &&
      argentinaEgyptDesktopLineupGeometry.alvarez.eventRows === 0 &&
      argentinaEgyptDesktopLineupGeometry.alvarez.avatarRightEvents === 1 &&
      argentinaEgyptDesktopLineupGeometry.alvarez.subToggles === 1 &&
      argentinaEgyptDesktopLineupGeometry.alvarez.avatarRightEventOverlapTop >= 7 &&
      argentinaEgyptDesktopLineupGeometry.alvarez.avatarRightEventOverlapTop <= 10 &&
      argentinaEgyptDesktopLineupGeometry.messi.eventRows === 0 &&
      argentinaEgyptDesktopLineupGeometry.messi.scoreOverlapsAvatar &&
      argentinaEgyptDesktopLineupGeometry.messi.scoreOverlapRight <= 28,
    `Argentina-Egypt desktop striker markers should anchor avatar/name together without sub or G/A pills shifting the row. Measured ${JSON.stringify(argentinaEgyptDesktopLineupGeometry)}.`
  );
  const argentinaEgyptDesktopRowSpacing = await getLineupRowSpacingMetrics(
    lineupCoachCoverageCheck.page.locator("#match-info [data-lineup-panel='home']:not([hidden])")
  );
  assert(
    argentinaEgyptDesktopRowSpacing.topClearance >= 0 &&
      argentinaEgyptDesktopRowSpacing.bottomClearance >= 0 &&
      argentinaEgyptDesktopRowSpacing.pitchHeight >= 539 &&
      argentinaEgyptDesktopRowSpacing.pitchHeight <= 551 &&
      argentinaEgyptDesktopRowSpacing.collisionCount === 0 &&
      argentinaEgyptDesktopRowSpacing.minRowGap >= 4,
    `Argentina-Egypt desktop line-up rows should keep event pills and value text separated from adjacent rows. Measured ${JSON.stringify(argentinaEgyptDesktopRowSpacing)}.`
  );
  await lineupCoachCoverageCheck.page.setViewportSize({ width: 560, height: 720 });
  const argentinaEgyptLargeMobileRowSpacing = await getLineupRowSpacingMetrics(
    lineupCoachCoverageCheck.page.locator("#match-info [data-lineup-panel='home']:not([hidden])")
  );
  assert(
    argentinaEgyptLargeMobileRowSpacing.topClearance >= 0 &&
      argentinaEgyptLargeMobileRowSpacing.bottomClearance >= 0 &&
      argentinaEgyptLargeMobileRowSpacing.pitchHeight >= 619 &&
      argentinaEgyptLargeMobileRowSpacing.pitchHeight <= 621 &&
      argentinaEgyptLargeMobileRowSpacing.collisionCount === 0 &&
      argentinaEgyptLargeMobileRowSpacing.minRowGap >= 4,
    `Argentina-Egypt large-mobile line-up rows should stay clear at the mobile height cap. Measured ${JSON.stringify(argentinaEgyptLargeMobileRowSpacing)}.`
  );
  await lineupCoachCoverageCheck.page.setViewportSize({ width: 1000, height: 720 });
  const argentinaEgyptCompactDesktopRowSpacing = await getLineupRowSpacingMetrics(
    lineupCoachCoverageCheck.page.locator("#match-info [data-lineup-panel='home']:not([hidden])")
  );
  assert(
    argentinaEgyptCompactDesktopRowSpacing.topClearance >= 0 &&
      argentinaEgyptCompactDesktopRowSpacing.bottomClearance >= 0 &&
      argentinaEgyptCompactDesktopRowSpacing.pitchHeight >= 539 &&
      argentinaEgyptCompactDesktopRowSpacing.pitchHeight <= 541 &&
      argentinaEgyptCompactDesktopRowSpacing.collisionCount === 0 &&
      argentinaEgyptCompactDesktopRowSpacing.minRowGap >= 0,
    `Argentina-Egypt compact desktop line-up rows should stay clear at the minimum pitch height. Measured ${JSON.stringify(argentinaEgyptCompactDesktopRowSpacing)}.`
  );
  await lineupCoachCoverageCheck.page.setViewportSize({ width: 1280, height: 720 });
  await lineupCoachCoverageCheck.page.goto(
    `${baseUrl}?view=matches&date=2026-07-09&lang=zh&tz=America%2FLos_Angeles&lineupPrototype=1`,
    { waitUntil: "load" }
  );
  await lineupCoachCoverageCheck.page.waitForSelector(".match-row", { state: "attached" });
  await lineupCoachCoverageCheck.page.locator('[data-match-id="match-97-quarter-final-2026-07-09"]').click();
  await lineupCoachCoverageCheck.page.locator("#match-info .lineup-preview-block").waitFor({
    state: "attached"
  });
  const franceMoroccoHomeBadgeRowState = await lineupCoachCoverageCheck.page
    .locator('#match-info [data-lineup-panel="home"]:not([hidden]) [data-lineup-player-name="Kylian Mbappe"]')
    .evaluate((marker) => {
      const avatar = marker.querySelector(".lineup-avatar-wrap");
      const lane = marker.querySelector(".lineup-avatar-right-events");
      const badges = [...lane.querySelectorAll(".lineup-event-badge")];
      const avatarBounds = avatar.getBoundingClientRect();
      const laneBounds = lane.getBoundingClientRect();
      return {
        markerY: Number.parseFloat(marker.style.getPropertyValue("--y")),
        badgeLefts: badges.map((badge) =>
          Math.round((badge.getBoundingClientRect().left - avatarBounds.left) * 10) / 10
        ),
        badges: badges.map((badge) => ({
          ariaLabel: badge.getAttribute("aria-label") || "",
          text: badge.textContent.replace(/\s+/g, " ").trim(),
          title: badge.getAttribute("title") || "",
          tooltip: badge.getAttribute("data-tooltip") || ""
        })),
        badgeTexts: badges.map((badge) => badge.textContent.replace(/\s+/g, " ").trim()),
        laneLeftDelta: Math.round((laneBounds.left - avatarBounds.left) * 10) / 10,
        laneRightDelta: Math.round((laneBounds.right - avatarBounds.right) * 10) / 10
      };
    });
  assert(
    franceMoroccoHomeBadgeRowState.markerY >= 14 &&
      franceMoroccoHomeBadgeRowState.markerY <= 16 &&
      franceMoroccoHomeBadgeRowState.badgeTexts.join(" ") === "G A ↓77'" &&
      franceMoroccoHomeBadgeRowState.laneLeftDelta >= 19 &&
      Math.abs(
        franceMoroccoHomeBadgeRowState.badgeLefts[0] -
          franceMoroccoHomeBadgeRowState.laneLeftDelta
      ) <= 1 &&
      franceMoroccoHomeBadgeRowState.laneRightDelta > 44 &&
      franceMoroccoHomeBadgeRowState.badgeLefts.every(
        (left, index, lefts) => index === 0 || left > lefts[index - 1]
      ) &&
      franceMoroccoHomeBadgeRowState.badges[0]?.ariaLabel === "60' 基利安·姆巴佩 进球" &&
      franceMoroccoHomeBadgeRowState.badges[0]?.tooltip === "60' 进球" &&
      franceMoroccoHomeBadgeRowState.badges[1]?.ariaLabel === "66' 基利安·姆巴佩 助攻" &&
      franceMoroccoHomeBadgeRowState.badges[1]?.tooltip === "66' 助攻" &&
      franceMoroccoHomeBadgeRowState.badges[2]?.ariaLabel ===
        "77' 基利安·姆巴佩 被换下。切换显示让-菲利普·马特塔" &&
      franceMoroccoHomeBadgeRowState.badges[2]?.title ===
        "77' 基利安·姆巴佩 被换下。切换显示让-菲利普·马特塔",
    `France-Morocco Mbappe G/A/sub badges should share a fixed left start, grow rightward, and keep Chinese labels localized. Measured ${JSON.stringify(franceMoroccoHomeBadgeRowState)}.`
  );
  await lineupCoachCoverageCheck.page.locator('#match-info .lineup-card-tabs [data-lineup-tab="away"]').first().click();
  const franceMoroccoZhLineupState = await lineupCoachCoverageCheck.page
    .locator("#match-info .lineup-preview-block")
    .evaluate((block) => {
      const coachCardText = [...block.querySelectorAll(".lineup-coach-card")]
        .map((card) => card.textContent.replace(/\s+/g, " ").trim())
        .join(" ");
      const coachCardCompactText = coachCardText.replace(/\s+/g, "");
      const hakimiMarker = block.querySelector('[data-lineup-player-name="Achraf Hakimi"]');
      const hakimiLabel = hakimiMarker?.querySelector(".lineup-player-name")?.textContent
        .replace(/\s+/g, " ")
        .trim() || "";
      const hakimiNumber = hakimiMarker?.querySelector(".lineup-player-number")?.textContent
        .replace(/\s+/g, " ")
        .trim() || "";

      return { coachCardText, coachCardCompactText, hakimiLabel, hakimiNumber };
    });
  assert(
    franceMoroccoZhLineupState.coachCardText.includes("德尚让法国保持务实") &&
      franceMoroccoZhLineupState.coachCardCompactText.includes("2018年世界杯") &&
      franceMoroccoZhLineupState.coachCardText.includes("瓦赫比把培养型教练视角带到摩洛哥") &&
      franceMoroccoZhLineupState.coachCardText.includes("摩洛哥青训体系") &&
      franceMoroccoZhLineupState.hakimiLabel === "阿什拉夫·哈基米" &&
      franceMoroccoZhLineupState.hakimiNumber === "2(C)" &&
      !franceMoroccoZhLineupState.coachCardText.includes("Deschamps keeps France pragmatic") &&
      !franceMoroccoZhLineupState.coachCardText.includes("Deschamps keeps France ruthlessly practical") &&
      !franceMoroccoZhLineupState.coachCardText.includes("Appointed in 2012") &&
      !franceMoroccoZhLineupState.coachCardText.includes("Ouahbi brings a development coach") &&
      !franceMoroccoZhLineupState.coachCardText.includes("Promoted after work"),
    `France-Morocco predicted Chinese lineup coach cards should merge profile zh copy instead of leaking English. Measured ${JSON.stringify(franceMoroccoZhLineupState)}.`
  );
  await lineupCoachCoverageCheck.page.goto(
    `${baseUrl}?view=matches&date=2026-07-10&lang=zh&tz=America%2FLos_Angeles&lineupPrototype=1`,
    { waitUntil: "load" }
  );
  await lineupCoachCoverageCheck.page.waitForSelector(".match-row", { state: "attached" });
  await lineupCoachCoverageCheck.page.locator('[data-match-id="match-98-quarter-final-2026-07-10"]').click();
  await lineupCoachCoverageCheck.page.locator("#match-info .lineup-preview-block").waitFor({
    state: "attached"
  });
  const spainBelgiumZhHomeCaptainState = await lineupCoachCoverageCheck.page
    .locator('#match-info [data-lineup-panel="home"]:not([hidden])')
    .evaluate((panel) => {
      const rodriMarker = panel.querySelector('[data-lineup-player-name="Rodri"]');
      return {
        number: rodriMarker?.querySelector(".lineup-player-number")?.textContent.replace(/\s+/g, " ").trim() || "",
        visibleName: rodriMarker?.querySelector(".lineup-player-name")?.textContent.replace(/\s+/g, " ").trim() || ""
      };
    });
  assert(
    spainBelgiumZhHomeCaptainState.visibleName === "罗德里" &&
      spainBelgiumZhHomeCaptainState.number === "16(C)",
    `Spain-Belgium Chinese home captain should put captain marker in the shirt-number pill. Measured ${JSON.stringify(spainBelgiumZhHomeCaptainState)}.`
  );
  await lineupCoachCoverageCheck.page.locator('#match-info .lineup-card-tabs [data-lineup-tab="away"]').first().click();
  const belgiumSpainZhBadgeState = await lineupCoachCoverageCheck.page
    .locator('#match-info [data-lineup-panel="away"]:not([hidden])')
    .evaluate((panel) => {
      const readRelativeBounds = (node, anchor) => {
        if (!node || !anchor) {
          return null;
        }
        const bounds = node.getBoundingClientRect();
        const anchorBounds = anchor.getBoundingClientRect();
        return {
          bottom: Math.round((bounds.bottom - anchorBounds.top) * 10) / 10,
          left: Math.round((bounds.left - anchorBounds.left) * 10) / 10,
          right: Math.round((bounds.right - anchorBounds.right) * 10) / 10,
          top: Math.round((bounds.top - anchorBounds.top) * 10) / 10
        };
      };
      const readMarker = (name) => {
        const marker = panel.querySelector(`[data-lineup-player-name="${name}"]`);
        const avatar = marker?.querySelector(".lineup-avatar-wrap");
        const card = marker?.querySelector(".lineup-avatar-card-events .lineup-event-card");
        const cardFace = card?.querySelector("span");
        const number = marker?.querySelector(".lineup-player-number");
        const rightLane = marker?.querySelector(".lineup-avatar-right-events");
        const sub = marker?.querySelector(".lineup-avatar-right-events [data-lineup-substitution-toggle]");
        return {
          card: {
            ariaLabel: card?.getAttribute("aria-label") || "",
            text: card?.textContent.replace(/\s+/g, " ").trim() || "",
            tooltip: card?.getAttribute("data-tooltip") || "",
            bounds: readRelativeBounds(cardFace, avatar)
          },
          number: number?.textContent.replace(/\s+/g, " ").trim() || "",
          rightLane: {
            bounds: readRelativeBounds(rightLane, avatar),
            text: rightLane?.textContent.replace(/\s+/g, " ").trim() || ""
          },
          sub: {
            ariaLabel: sub?.getAttribute("aria-label") || "",
            text: sub?.textContent.replace(/\s+/g, " ").trim() || "",
            title: sub?.getAttribute("title") || ""
          },
          visibleName: marker?.querySelector(".lineup-player-name")?.textContent.replace(/\s+/g, " ").trim() || ""
        };
      };

      return {
        castagne: readMarker("Timothy Castagne"),
        courtois: readMarker("Thibaut Courtois"),
        deBruyne: readMarker("Kevin De Bruyne"),
        deCuyper: readMarker("Maxim De Cuyper")
      };
    });
  assert(
    belgiumSpainZhBadgeState.deBruyne.visibleName === "凯文·德布劳内" &&
      belgiumSpainZhBadgeState.deBruyne.number === "7(C)" &&
      belgiumSpainZhBadgeState.deBruyne.card.text === "" &&
      belgiumSpainZhBadgeState.deBruyne.card.ariaLabel === "85' 凯文·德布劳内 黄牌" &&
      belgiumSpainZhBadgeState.deBruyne.card.tooltip === "85' 黄牌" &&
      belgiumSpainZhBadgeState.deBruyne.card.bounds?.left >= -2 &&
      belgiumSpainZhBadgeState.deBruyne.card.bounds?.left <= 1 &&
      belgiumSpainZhBadgeState.deBruyne.card.bounds?.bottom >= 6 &&
      belgiumSpainZhBadgeState.deBruyne.card.bounds?.bottom <= 9 &&
      belgiumSpainZhBadgeState.deBruyne.sub.text === "↓86'" &&
      belgiumSpainZhBadgeState.deBruyne.rightLane.bounds?.left >= 9 &&
      belgiumSpainZhBadgeState.deBruyne.rightLane.bounds?.left <= 11 &&
      belgiumSpainZhBadgeState.deBruyne.sub.ariaLabel ===
        "86' 凯文·德布劳内 被换下。切换显示亚历克西斯·萨勒马克尔斯" &&
      belgiumSpainZhBadgeState.deBruyne.sub.title ===
        "86' 凯文·德布劳内 被换下。切换显示亚历克西斯·萨勒马克尔斯" &&
      belgiumSpainZhBadgeState.castagne.rightLane.text === "A" &&
      belgiumSpainZhBadgeState.castagne.rightLane.bounds?.left >= 19 &&
      belgiumSpainZhBadgeState.castagne.rightLane.bounds?.left <= 21 &&
      belgiumSpainZhBadgeState.courtois.sub.ariaLabel ===
        "71' 蒂博·库尔图瓦 被换下。切换显示森内·拉门斯" &&
      belgiumSpainZhBadgeState.deCuyper.sub.ariaLabel ===
        "60' 马克西姆·德屈佩尔 被换下。切换显示若阿金·塞斯",
    `Spain-Belgium Chinese lineup badges should localize card, keeper sub, and Belgium sub target names. Measured ${JSON.stringify(belgiumSpainZhBadgeState)}.`
  );
  await lineupCoachCoverageCheck.page.emulateMedia({ reducedMotion: "reduce" });
  const belgiumSpainZhSubstituteMarker = lineupCoachCoverageCheck.page.locator(
    '#match-info [data-lineup-panel="away"]:not([hidden]) [data-lineup-player-name="Joaquin Seys"]'
  );
  await lineupCoachCoverageCheck.page
    .locator(
      '#match-info [data-lineup-panel="away"]:not([hidden]) [data-lineup-player-name="Maxim De Cuyper"] [data-lineup-substitution-toggle]'
    )
    .click();
  await belgiumSpainZhSubstituteMarker.waitFor({ state: "attached" });
  const belgiumSpainZhPreviewState = await belgiumSpainZhSubstituteMarker.evaluate((marker) => {
    const sub = marker.querySelector(".lineup-avatar-right-events [data-lineup-substitution-toggle]");
    return {
      sub: {
        ariaLabel: sub?.getAttribute("aria-label") || "",
        text: sub?.textContent.replace(/\s+/g, " ").trim() || "",
        title: sub?.getAttribute("title") || ""
      },
      visibleName: marker.querySelector(".lineup-player-name")?.textContent.replace(/\s+/g, " ").trim() || ""
    };
  });
  assert(
    belgiumSpainZhPreviewState.visibleName === "若阿金·塞斯" &&
      belgiumSpainZhPreviewState.sub.text === "↑60'" &&
      belgiumSpainZhPreviewState.sub.ariaLabel ===
        "60' 若阿金·塞斯 替补登场。切换显示马克西姆·德屈佩尔" &&
      belgiumSpainZhPreviewState.sub.title ===
        "60' 若阿金·塞斯 替补登场。切换显示马克西姆·德屈佩尔",
    `Clicked Spain-Belgium substitution preview should keep Chinese substitute labels readable. Measured ${JSON.stringify(belgiumSpainZhPreviewState)}.`
  );
  await lineupCoachCoverageCheck.context.close();

  const matchStateCheck = await openPageAtTime("2026-06-18T05:30:00.000Z");
  const june17Scores = await matchStateCheck.page.locator("#match-list > .match-row .match-score").evaluateAll((scores) =>
    scores.map((score) => score.textContent.trim())
  );
  assert(
    june17Scores.join("|") === "1-1|4-2|1-0|1-3",
    "The finalized Jun 17 match list should show all four score pills."
  );
  const matchAccessibilityStructure = await matchStateCheck.page.evaluate(() => ({
    announcerAriaAtomic: document.querySelector("#match-status-announcer")?.getAttribute("aria-atomic") || "",
    announcerAriaLive: document.querySelector("#match-status-announcer")?.getAttribute("aria-live") || "",
    announcerRole: document.querySelector("#match-status-announcer")?.getAttribute("role") || "",
    detailsAriaLabel: document.querySelector("#match-info")?.getAttribute("aria-label") || "",
    detailsAriaLive: document.querySelector("#match-info")?.getAttribute("aria-live"),
    listAriaLive: document.querySelector("#match-list")?.getAttribute("aria-live"),
    rowControls: document.querySelector(".match-row-trigger")?.getAttribute("aria-controls") || "",
    rowLabel: document.querySelector(".match-row")?.getAttribute("aria-label") || ""
  }));
  assert(
    matchAccessibilityStructure.announcerRole === "status" &&
      matchAccessibilityStructure.announcerAriaLive === "polite" &&
      matchAccessibilityStructure.announcerAriaAtomic === "true" &&
      matchAccessibilityStructure.detailsAriaLabel === "Match details" &&
      matchAccessibilityStructure.detailsAriaLive === null &&
      matchAccessibilityStructure.listAriaLive === null &&
      matchAccessibilityStructure.rowControls === "match-info" &&
      matchAccessibilityStructure.rowLabel.includes("Group"),
    `Match accessibility updates should use one quiet status channel and explicitly connect rows to named details. Measured ${JSON.stringify(matchAccessibilityStructure)}.`
  );
  const liveAccessibilityAnnouncementCopy = await matchStateCheck.page.evaluate(async () => {
    const appModuleUrl = document.querySelector('script[src^="app.js"]')?.src;
    const { getLiveMatchAccessibilityAnnouncements } = await import(appModuleUrl);
    const base = {
      away: "Brazil",
      home: "Japan",
      id: "accessibility-test",
      penalties: null,
      phase: "Second half",
      score: { away: 1, home: 1 },
      status: "LIVE",
      winnerSide: ""
    };
    const announcementsFor = (next) =>
      getLiveMatchAccessibilityAnnouncements(
        new Map([[base.id, base]]),
        new Map([[base.id, { ...base, ...next }]])
      );

    return {
      final: announcementsFor({ score: { away: 1, home: 2 }, status: "FT", winnerSide: "home" }),
      phase: announcementsFor({ phase: "Half-time" }),
      quiet: announcementsFor({}),
      score: announcementsFor({ score: { away: 1, home: 2 } })
    };
  });
  assert(
    JSON.stringify(liveAccessibilityAnnouncementCopy.score) ===
      JSON.stringify(["Score update. Japan 2, Brazil 1."]) &&
      JSON.stringify(liveAccessibilityAnnouncementCopy.phase) ===
        JSON.stringify(["Half-time. Japan 1, Brazil 1."]) &&
      JSON.stringify(liveAccessibilityAnnouncementCopy.final) ===
        JSON.stringify(["Full time. Japan 2, Brazil 1. Japan won."]) &&
      liveAccessibilityAnnouncementCopy.quiet.length === 0,
    `Live accessibility announcements should report only meaningful match changes. Measured ${JSON.stringify(liveAccessibilityAnnouncementCopy)}.`
  );
  const livePillCount = await matchStateCheck.page.locator("#match-list .live-pill").count();
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

  const liveShootoutLayoutCheck = await openPageAtTime(
    "2026-06-30T21:01:00.000Z",
    "/?view=matches&date=2026-06-30&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const shootoutFixture = data.fixtures.find(
          (fixture) => fixture.id === "match-77-round-of-32-2026-06-30"
        );
        shootoutFixture.status = "LIVE";
        shootoutFixture.score = { home: 1, away: 1 };
        shootoutFixture.scoreDetails = { penalties: { home: 3, away: 4 } };
        shootoutFixture.scoreUpdatedAt = "2026-06-30T21:00:00.000Z";
      }
    }
  );
  await liveShootoutLayoutCheck.page.setViewportSize({ width: 340, height: 780 });
  await liveShootoutLayoutCheck.page.waitForTimeout(250);
  const liveShootoutRowMetrics = await liveShootoutLayoutCheck.page
    .locator('[data-match-id="match-77-round-of-32-2026-06-30"]')
    .evaluate((row) => {
      const score = row.querySelector(".match-score");
      const scoreRect = score?.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const matchupRight = Math.max(
        ...Array.from(
          row.querySelectorAll(".match-teams .flag, .match-teams .team-name, .match-teams .match-versus")
        ).map((element) => element.getBoundingClientRect().right)
      );

      return {
        documentScrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        hasWrappedClass: row.classList.contains("has-wrapped-matchup"),
        metaGapFromTeams: scoreRect ? Math.round(scoreRect.left - matchupRight) : null,
        rowScrollOverflow: row.scrollWidth - row.clientWidth,
        scoreRightGap: scoreRect ? Math.round(rowRect.right - scoreRect.right) : null,
        scoreText: score?.textContent.replace(/\s+/g, " ").trim() || ""
      };
    });
  assert(
    liveShootoutRowMetrics.scoreText === "1-1 (3-4 pens) · 1 min ago" &&
      liveShootoutRowMetrics.hasWrappedClass &&
      liveShootoutRowMetrics.metaGapFromTeams >= 12 &&
      liveShootoutRowMetrics.scoreRightGap >= 0 &&
      liveShootoutRowMetrics.rowScrollOverflow <= 1 &&
      liveShootoutRowMetrics.documentScrollOverflow <= 1,
    `Live shootout score text should stay readable without overlapping the tiny-mobile match row. Measured ${JSON.stringify(liveShootoutRowMetrics)}.`
  );
  await liveShootoutLayoutCheck.context.close();

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
  await japanSearchCheck.page.setViewportSize({ width: 390, height: 844 });
  const japanHistoryToggle = japanSearchCheck.page.locator('[data-team-history-toggle="true"]');
  const japanCollapsedHistoryLabel = (await japanHistoryToggle.innerText()).trim();
  await japanHistoryToggle.evaluate((button) => {
    button.dataset.smokeToggleIdentity = "preserved";
  });
  const japanCollapsedHistoryChevron = await japanHistoryToggle
    .locator(".past-reveal-action")
    .evaluate((action) => getComputedStyle(action, "::after").transform);
  assert(
    /^See previous World Cups \(\d+\)$/.test(japanCollapsedHistoryLabel) &&
      (await japanHistoryToggle.getAttribute("aria-expanded")) === "false",
    "Collapsed country history should offer to show the number of previous World Cup matches."
  );
  await japanHistoryToggle.click();
  await japanSearchCheck.page.waitForTimeout(200);
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
      (row) => {
        const match = /^([A-Z][a-z]+ \d{1,2}, \d{4}) (.+)$/.exec(row.dateTime);

        return (
          match &&
          /\d{1,2}:\d{2}/.test(match[2]) &&
          row.label.includes(match[1]) &&
          row.label.includes(match[2]) &&
          !row.label.includes("local local")
        );
      }
    ),
    "Archived country search rows should show and announce date and loaded kickoff time labels with the year."
  );
  assert(
    (await japanHistoryToggle.innerText()).trim() === "Hide previous World Cups" &&
      (await japanHistoryToggle.getAttribute("aria-expanded")) === "true" &&
      (await japanHistoryToggle.getAttribute("data-smoke-toggle-identity")) === "preserved" &&
      (await japanHistoryToggle.getAttribute("aria-busy")) === null &&
      (await japanHistoryToggle
        .locator(".past-reveal-action")
        .evaluate((action) => getComputedStyle(action, "::after").transform)) !==
        japanCollapsedHistoryChevron,
    "Expanded country history should offer to hide the previous World Cups."
  );
  await japanHistoryToggle.click();
  assert(
    (await japanSearchCheck.page.locator(".team-search-section.is-archive").count()) === 0 &&
      (await japanHistoryToggle.innerText()).trim() === japanCollapsedHistoryLabel &&
      (await japanHistoryToggle.getAttribute("aria-expanded")) === "false" &&
      (await japanHistoryToggle.getAttribute("data-smoke-toggle-identity")) === "preserved",
    "Hiding country history should collapse the archive and restore the See action."
  );
  await japanSearchCheck.context.close();

  const desktopSearchRevealCheck = await openPageAtTime(
    "2026-07-14T23:00:00.000Z",
    "/?view=matches&team=Spain&tz=America%2FLos_Angeles",
    {
      contextOptions: { viewport: { width: 1440, height: 800 } },
      desktopPointerMedia: true,
      initScript: () => {
        const realSetInterval = window.setInterval.bind(window);
        let capturedScheduledRender = false;
        window.setInterval = (handler, timeout, ...args) => {
          if (!capturedScheduledRender && Number(timeout) === 60_000) {
            capturedScheduledRender = true;
            window.__runScheduledMatchRender = () => handler(...args);
            return 2_147_483_646;
          }
          return realSetInterval(handler, timeout, ...args);
        };
      }
    }
  );
  await desktopSearchRevealCheck.page.locator('[data-team-history-toggle="true"]').click();
  const finalSpainArchiveRow = desktopSearchRevealCheck.page
    .locator(".team-search-section.is-archive .match-row")
    .last();
  await finalSpainArchiveRow.scrollIntoViewIfNeeded();
  const desktopSearchScrollBeforeSelection = await desktopSearchRevealCheck.page.evaluate(
    () => window.scrollY
  );
  await finalSpainArchiveRow.locator(".match-row-trigger").click({
    position: { x: 8, y: 8 }
  });
  await desktopSearchRevealCheck.page.waitForFunction(() => {
    const info = document.querySelector("#match-info");
    return !info?.hidden && info?.clientHeight > 0 && info.scrollHeight > info.clientHeight;
  });
  await desktopSearchRevealCheck.page.evaluate(() => {
    window.__runScheduledMatchRender?.();
  });
  await desktopSearchRevealCheck.page.waitForFunction(() => {
    const info = document.querySelector("#match-info");
    return !info?.hidden && info?.clientHeight > 0 && info.scrollHeight > info.clientHeight;
  });
  const desktopSearchRevealMetrics = await desktopSearchRevealCheck.page.evaluate(() => {
    const infoElement = document.querySelector("#match-info");
    const info = infoElement?.getBoundingClientRect();
    const styles = infoElement ? getComputedStyle(infoElement) : null;

    return {
      infoBottom: info?.bottom ?? null,
      infoClientHeight: infoElement?.clientHeight ?? null,
      infoOverflowY: styles?.overflowY || "",
      infoScrollHeight: infoElement?.scrollHeight ?? null,
      infoTop: info?.top ?? null,
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight
    };
  });
  assert(
    desktopSearchScrollBeforeSelection > 100 &&
      Math.abs(desktopSearchRevealMetrics.scrollY - desktopSearchScrollBeforeSelection) <= 2 &&
      desktopSearchRevealMetrics.infoTop >= 0 &&
      desktopSearchRevealMetrics.infoBottom <= desktopSearchRevealMetrics.viewportHeight + 1 &&
      desktopSearchRevealMetrics.infoOverflowY === "auto" &&
      desktopSearchRevealMetrics.infoScrollHeight > desktopSearchRevealMetrics.infoClientHeight,
    `Choosing a desktop country-search row from deep in the archive should preserve the list position while a viewport-height match detail card follows alongside it. Measured ${JSON.stringify({ desktopSearchScrollBeforeSelection, desktopSearchRevealMetrics })}.`
  );
  await desktopSearchRevealCheck.page.evaluate(() => {
    window.scrollTo({
      top: Math.max(0, window.scrollY - Math.round(window.innerHeight * 0.75)),
      behavior: "auto"
    });
  });
  await desktopSearchRevealCheck.page.waitForFunction(() => {
    const info = document.querySelector("#match-info");
    const bounds = info?.getBoundingClientRect();

    return (
      info?.classList.contains("is-viewport-docked") &&
      info.clientHeight >= window.innerHeight - 34 &&
      bounds?.bottom <= window.innerHeight + 1
    );
  });
  const desktopExpandedCardMetrics = await desktopSearchRevealCheck.page.evaluate(() => {
    const info = document.querySelector("#match-info");
    const infoBounds = info?.getBoundingClientRect();
    const headerBounds = document.querySelector(".site-header")?.getBoundingClientRect();
    const footerBounds = document.querySelector(".site-footer")?.getBoundingClientRect();
    const styles = info ? getComputedStyle(info) : null;

    return {
      bottomGap: infoBounds ? Math.round(window.innerHeight - infoBounds.bottom) : null,
      clientHeight: info?.clientHeight ?? null,
      docked: info?.classList.contains("is-viewport-docked") || false,
      footerTop: footerBounds?.top ?? null,
      headerBottom: headerBounds?.bottom ?? null,
      top: infoBounds?.top ?? null,
      transitionDuration: styles?.transitionDuration || "",
      viewportHeight: window.innerHeight
    };
  });
  assert(
    desktopExpandedCardMetrics.docked &&
      desktopExpandedCardMetrics.headerBottom <= 0 &&
      desktopExpandedCardMetrics.footerTop >= desktopExpandedCardMetrics.viewportHeight &&
      Math.abs(desktopExpandedCardMetrics.top - 16) <= 1 &&
      Math.abs(desktopExpandedCardMetrics.bottomGap - 16) <= 2 &&
      desktopExpandedCardMetrics.clientHeight >= desktopExpandedCardMetrics.viewportHeight - 34 &&
      desktopExpandedCardMetrics.transitionDuration !== "0s",
    `The sticky desktop card should occupy the viewport-height rail while both the site header and disclaimer are offscreen. Measured ${JSON.stringify(desktopExpandedCardMetrics)}.`
  );
  const matchInfoScrollBeforeHoverSwitch = await desktopSearchRevealCheck.page
    .locator("#match-info")
    .evaluate((info) => {
      info.scrollTop = Math.min(240, info.scrollHeight - info.clientHeight);
      return info.scrollTop;
    });
  await desktopSearchRevealCheck.page
    .locator('[data-match-id="match-101-semi-final-2026-07-14"]')
    .hover();
  await desktopSearchRevealCheck.page.waitForFunction(() => {
    const selectedRow = document.querySelector(".match-row.is-selected");
    const info = document.querySelector("#match-info");
    return (
      selectedRow?.dataset.matchId === "match-101-semi-final-2026-07-14" &&
      info?.scrollTop === 0 &&
      !info.classList.contains("is-entering")
    );
  });
  assert(
    matchInfoScrollBeforeHoverSwitch > 0,
    `The sticky card should have an internal scroll position to reset before previewing another row. Measured ${matchInfoScrollBeforeHoverSwitch}.`
  );
  await desktopSearchRevealCheck.page.locator('[data-team-history-toggle="true"]').click();
  await desktopSearchRevealCheck.page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "auto" });
  });
  await desktopSearchRevealCheck.page.waitForTimeout(360);
  await desktopSearchRevealCheck.page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "auto" });
  });
  await desktopSearchRevealCheck.page.waitForFunction(() => {
    const info = document.querySelector("#match-info");
    const infoBounds = info?.getBoundingClientRect();
    const footerBounds = document.querySelector(".site-footer")?.getBoundingClientRect();

    return (
      info?.classList.contains("is-footer-constrained") &&
      infoBounds?.top >= 15 &&
      footerBounds?.top < window.innerHeight &&
      infoBounds?.bottom <= footerBounds.top - 15
    );
  });
  const desktopCollapsedHistoryCardMetrics = await desktopSearchRevealCheck.page.evaluate(() => {
    const info = document.querySelector("#match-info");
    const infoBounds = info?.getBoundingClientRect();
    const footerBounds = document.querySelector(".site-footer")?.getBoundingClientRect();

    return {
      bottom: infoBounds?.bottom ?? null,
      clientHeight: info?.clientHeight ?? null,
      constrained: info?.classList.contains("is-footer-constrained") || false,
      docked: info?.classList.contains("is-viewport-docked") || false,
      footerGap: infoBounds && footerBounds ? footerBounds.top - infoBounds.bottom : null,
      footerTop: footerBounds?.top ?? null,
      scrollHeight: info?.scrollHeight ?? null,
      top: infoBounds?.top ?? null,
      viewportHeight: window.innerHeight
    };
  });
  assert(
    desktopCollapsedHistoryCardMetrics.docked &&
      desktopCollapsedHistoryCardMetrics.constrained &&
      Math.abs(desktopCollapsedHistoryCardMetrics.top - 16) <= 1 &&
      desktopCollapsedHistoryCardMetrics.footerTop < desktopCollapsedHistoryCardMetrics.viewportHeight &&
      desktopCollapsedHistoryCardMetrics.footerGap >= 15 &&
      desktopCollapsedHistoryCardMetrics.scrollHeight > desktopCollapsedHistoryCardMetrics.clientHeight,
    `Collapsing previous World Cups should keep the tall desktop detail card pinned to the top while its bottom yields to the visible footer. Measured ${JSON.stringify(desktopCollapsedHistoryCardMetrics)}.`
  );
  await desktopSearchRevealCheck.context.close();

  const desktopShortPageCardCheck = await openPageAtTime(
    "2026-07-15T16:15:00.000Z",
    "/?view=matches&date=2026-07-04&tz=America%2FLos_Angeles",
    {
      contextOptions: { viewport: { width: 2048, height: 1112 } },
      desktopPointerMedia: true
    }
  );
  await desktopShortPageCardCheck.page
    .locator('[data-match-id="match-90-round-of-16-2026-07-04"]')
    .click();
  const desktopShortCardInitialHeight = await desktopShortPageCardCheck.page
    .locator("#match-info")
    .evaluate((info) => info.clientHeight);
  await desktopShortPageCardCheck.page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "auto" });
  });
  await desktopShortPageCardCheck.page.waitForTimeout(360);
  await desktopShortPageCardCheck.page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "auto" });
  });
  await desktopShortPageCardCheck.page.waitForTimeout(380);
  await desktopShortPageCardCheck.page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "auto" });
  });
  await desktopShortPageCardCheck.page.waitForTimeout(80);
  await desktopShortPageCardCheck.page.waitForFunction(() => {
    const info = document.querySelector("#match-info");
    const infoBounds = info?.getBoundingClientRect();
    const footerBounds = document.querySelector(".site-footer")?.getBoundingClientRect();

    return (
      info?.classList.contains("is-viewport-docked") &&
      info.classList.contains("is-footer-constrained") &&
      infoBounds?.top >= 15 &&
      footerBounds?.top < window.innerHeight &&
      infoBounds?.bottom <= footerBounds.top - 15
    );
  });
  const desktopShortCardExpandedState = await desktopShortPageCardCheck.page.evaluate(() => {
    const info = document.querySelector("#match-info");
    const infoBounds = info?.getBoundingClientRect();
    const footerBounds = document.querySelector(".site-footer")?.getBoundingClientRect();

    return {
      bottom: infoBounds?.bottom ?? null,
      clientHeight: info?.clientHeight ?? null,
      constrained: info?.classList.contains("is-footer-constrained") || false,
      docked: info?.classList.contains("is-viewport-docked") || false,
      footerGap: infoBounds && footerBounds ? footerBounds.top - infoBounds.bottom : null,
      footerTop: footerBounds?.top ?? null,
      scrollY: window.scrollY,
      top: infoBounds?.top ?? null,
      viewportHeight: window.innerHeight
    };
  });
  assert(
    desktopShortCardExpandedState.docked &&
      desktopShortCardExpandedState.constrained &&
      desktopShortCardExpandedState.scrollY > 0 &&
      Math.abs(desktopShortCardExpandedState.top - 16) <= 1 &&
      desktopShortCardExpandedState.clientHeight > desktopShortCardInitialHeight &&
      desktopShortCardExpandedState.footerTop < desktopShortCardExpandedState.viewportHeight &&
      desktopShortCardExpandedState.footerGap >= 15,
    `A short desktop match page should grow its detail card into available space without letting the visible footer push the card above its sticky top. Measured ${JSON.stringify({ desktopShortCardInitialHeight, desktopShortCardExpandedState })}.`
  );
  await desktopShortPageCardCheck.context.close();

  const franceSearchCheck = await openPageAtTime(
    "2026-07-14T23:00:00.000Z",
    "/?view=matches&team=France&tz=America%2FLos_Angeles"
  );
  const franceSearchRows = await franceSearchCheck.page.locator(".match-row").evaluateAll((rows) =>
    rows.map((row) => ({
      ariaLabel: row.getAttribute("aria-label") || "",
      id: row.dataset.matchId,
      scoreAriaLabel: row.querySelector(".match-score")?.getAttribute("aria-label") || "",
      scoreText: row.querySelector(".match-score")?.textContent.replace(/\s+/g, " ").trim() || "",
      teams: [...row.querySelectorAll(".match-teams .team-name")].map((team) => team.textContent.trim())
    }))
  );
  const norwayFranceSearchRow = franceSearchRows.find(
    (row) => row.id === "norway-france-2026-06-26"
  );
  const paraguayFranceSearchRow = franceSearchRows.find(
    (row) => row.id === "match-89-round-of-16-2026-07-04"
  );
  assert(
    franceSearchRows.length > 0 &&
      franceSearchRows.every((row) => row.teams[0] === "France") &&
      norwayFranceSearchRow?.teams.join("|") === "France|Norway" &&
      norwayFranceSearchRow.scoreText === "4-1" &&
      norwayFranceSearchRow.ariaLabel.includes("France vs Norway") &&
      norwayFranceSearchRow.ariaLabel.includes("final score 4-1") &&
      norwayFranceSearchRow.scoreAriaLabel.includes("France 4, Norway 1") &&
      paraguayFranceSearchRow?.teams.join("|") === "France|Paraguay" &&
      paraguayFranceSearchRow.scoreText === "1-0",
    `France country search should always put France first and keep every score aligned with the reordered teams. Measured ${JSON.stringify(franceSearchRows)}.`
  );
  await franceSearchCheck.page.setViewportSize({ width: 390, height: 844 });
  await franceSearchCheck.page.locator('[data-match-id="match-101-semi-final-2026-07-14"]').click();
  await franceSearchCheck.page.waitForSelector("#match-info:not(.is-hidden)");
  const olmoResultLink = franceSearchCheck.page
    .locator("#match-info .result-story-highlights .player-link", { hasText: /^Olmo$/ })
    .first();
  const olmoResultLinkDecoration = await olmoResultLink.evaluate((link) => {
    const styles = getComputedStyle(link);
    return {
      line: styles.textDecorationLine,
      style: styles.textDecorationStyle
    };
  });
  assert(
    (await olmoResultLink.count()) === 1 &&
      olmoResultLinkDecoration.line.includes("underline") &&
      olmoResultLinkDecoration.style === "dotted",
    `Assist-only Result mentions such as Olmo should render as player links with the shared dotted underline. Measured ${JSON.stringify(olmoResultLinkDecoration)}.`
  );
  await franceSearchCheck.page.waitForFunction(() => {
    const info = document.querySelector("#match-info")?.getBoundingClientRect();
    const list = document.querySelector("#match-list")?.getBoundingClientRect();

    return Boolean(
      info &&
        list &&
        info.top >= 0 &&
        info.top < window.innerHeight * 0.25 &&
        info.top > list.bottom &&
        info.top - list.bottom >= 20
    );
  });
  const mobileSearchDetailMetrics = await franceSearchCheck.page.evaluate(() => {
    const info = document.querySelector("#match-info")?.getBoundingClientRect();
    const list = document.querySelector("#match-list")?.getBoundingClientRect();

    return {
      gapAfterList: info && list ? Math.round(info.top - list.bottom) : null,
      infoTop: info?.top || 0,
      listBottom: list?.bottom || 0,
      viewportHeight: window.innerHeight
    };
  });
  assert(
    mobileSearchDetailMetrics.infoTop >= 0 &&
      mobileSearchDetailMetrics.infoTop < mobileSearchDetailMetrics.viewportHeight * 0.25 &&
      mobileSearchDetailMetrics.infoTop > mobileSearchDetailMetrics.listBottom &&
      mobileSearchDetailMetrics.gapAfterList >= 20,
    `Opening a mobile country-search match should place and reveal the detail card below the match list. Measured ${JSON.stringify(mobileSearchDetailMetrics)}.`
  );
  const currentResultPlayerLinkCoverageIssues = [];
  for (const coverageCase of currentResultPlayerLinkCoverageCases) {
    await franceSearchCheck.page.goto(
      `${baseUrl}/?view=matches&date=${encodeURIComponent(coverageCase.dayKey)}&match=${encodeURIComponent(coverageCase.fixtureId)}&tz=UTC`,
      { waitUntil: "load" }
    );
    await franceSearchCheck.page.waitForFunction(
      (fixtureId) => document.querySelector(".match-row.is-selected")?.dataset.matchId === fixtureId,
      coverageCase.fixtureId
    );
    await franceSearchCheck.page.waitForSelector("#match-info .result-story-highlights");
    await franceSearchCheck.page.waitForFunction(
      (expectedLabels) => {
        const actualLabels = [
          ...document.querySelectorAll("#match-info .result-story-highlights .player-link")
        ].map((link) => link.textContent?.trim() || "");
        return expectedLabels.every((label) => actualLabels.includes(label));
      },
      coverageCase.expectedLabels
    );
    const actualLabels = await franceSearchCheck.page
      .locator("#match-info .result-story-highlights .player-link")
      .evaluateAll((links) => links.map((link) => link.textContent.trim()));
    const missingLabels = coverageCase.expectedLabels.filter((label) => !actualLabels.includes(label));
    if (missingLabels.length) {
      currentResultPlayerLinkCoverageIssues.push({
        fixtureId: coverageCase.fixtureId,
        missingLabels
      });
    }
  }
  assert(
    currentResultPlayerLinkCoverageIssues.length === 0,
    `Every unambiguous current-World-Cup Result mention newly supplied by verified lineups or assists should render as a player link. Measured ${JSON.stringify(currentResultPlayerLinkCoverageIssues)}.`
  );
  await franceSearchCheck.context.close();

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

  const japanPinyinSearchCheck = await openPageAtTime(
    "2026-06-21T21:00:00.000Z",
    "/?view=matches&team=riben&tz=America%2FLos_Angeles"
  );
  const japanPinyinSearchRows = await japanPinyinSearchCheck.page.locator(".match-row").evaluateAll((rows) =>
    rows.map((row) => ({
      id: row.dataset.matchId,
      label: row.getAttribute("aria-label") || ""
    }))
  );
  assert(
    japanPinyinSearchRows.some((row) => row.id === "japan-sweden-2026-06-25"),
    "Pinyin Japan country search should include Japan vs Sweden."
  );
  assert(
    japanPinyinSearchRows.every((row) => row.label.includes("Japan")) &&
      !japanPinyinSearchRows.some((row) => row.id === "panama-croatia-2026-06-23"),
    "Pinyin Japan country search should not include Panama fixtures through the PAN team id."
  );
  assert(
    (await japanPinyinSearchCheck.page.locator(".team-search-summary h2").innerText()).trim() === "Japan",
    "Pinyin Japan country search should show the canonical team name in the heading."
  );
  await japanPinyinSearchCheck.context.close();

  const usaTraditionalSearchCheck = await openPageAtTime(
    "2026-06-21T21:00:00.000Z",
    "/?view=matches&team=%E7%BE%8E%E5%9C%8B&lang=zh&tz=America%2FLos_Angeles"
  );
  const usaTraditionalSearchRows = await usaTraditionalSearchCheck.page.locator(".match-row").evaluateAll((rows) =>
    rows.map((row) => ({
      id: row.dataset.matchId,
      label: row.getAttribute("aria-label") || ""
    }))
  );
  assert(
    usaTraditionalSearchRows.some((row) => row.id === "turkiye-united-states-2026-06-25"),
    "Traditional Chinese USA country search should include Türkiye vs United States."
  );
  assert(
    usaTraditionalSearchRows.every((row) => row.label.includes("美国")),
    "Traditional Chinese USA country search should show localized United States rows."
  );
  assert(
    (await usaTraditionalSearchCheck.page.locator(".team-search-summary h2").innerText()).trim() === "美国",
    "Traditional Chinese USA country search should show the localized team name in the heading."
  );
  await usaTraditionalSearchCheck.context.close();

  const ghanaPinyinSearchCheck = await openPageAtTime(
    "2026-06-21T21:00:00.000Z",
    "/?view=matches&team=jiana&tz=America%2FLos_Angeles"
  );
  const ghanaPinyinSearchRows = await ghanaPinyinSearchCheck.page.locator(".match-row").evaluateAll((rows) =>
    rows.map((row) => ({
      id: row.dataset.matchId,
      label: row.getAttribute("aria-label") || ""
    }))
  );
  assert(
    ghanaPinyinSearchRows.some((row) => row.id === "ghana-panama-2026-06-17"),
    "Exact pinyin Ghana country search should include Ghana vs Panama."
  );
  assert(
    ghanaPinyinSearchRows.every((row) => row.label.includes("Ghana")) &&
      !ghanaPinyinSearchRows.some((row) => row.id === "canada-qatar-2026-06-18"),
    "Exact pinyin Ghana country search should not pull in Canada through the longer jianada alias."
  );
  await ghanaPinyinSearchCheck.context.close();

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

  const belgiumPrefixSearchCheck = await openPageAtTime(
    "2026-06-21T21:00:00.000Z",
    "/?view=matches&team=be&tz=America%2FLos_Angeles"
  );
  const belgiumPrefixSearchRows = await belgiumPrefixSearchCheck.page.locator(".match-row").evaluateAll((rows) =>
    rows.map((row) => ({
      id: row.dataset.matchId,
      label: row.getAttribute("aria-label") || ""
    }))
  );
  assert(
    belgiumPrefixSearchRows.some((row) => row.id === "belgium-egypt-2026-06-15"),
    "English Belgium prefix search should include Belgium vs Egypt."
  );
  assert(
    belgiumPrefixSearchRows.every((row) => row.label.includes("Belgium")) &&
      !belgiumPrefixSearchRows.some((row) => row.id === "japan-sweden-2026-06-25"),
    "English Belgium prefix search should not match Japan through the pinyin ri ben alias."
  );
  await belgiumPrefixSearchCheck.context.close();

  const mexicoPrefixSearchCheck = await openPageAtTime(
    "2026-06-21T21:00:00.000Z",
    "/?view=matches&team=me&tz=America%2FLos_Angeles"
  );
  const mexicoPrefixSearchRows = await mexicoPrefixSearchCheck.page.locator(".match-row").evaluateAll((rows) =>
    rows.map((row) => ({
      id: row.dataset.matchId,
      label: row.getAttribute("aria-label") || ""
    }))
  );
  assert(
    mexicoPrefixSearchRows.some((row) => row.id === "mexico-south-africa-2026-06-11"),
    "English Mexico prefix search should include Mexico vs South Africa."
  );
  assert(
    mexicoPrefixSearchRows.every((row) => row.label.includes("Mexico")) &&
      !mexicoPrefixSearchRows.some((row) => row.id === "turkiye-united-states-2026-06-25"),
    "English Mexico prefix search should not match United States through the pinyin mei guo alias."
  );
  await mexicoPrefixSearchCheck.context.close();

  const applyLiveFallbackFixture = (data) => {
    const liveFixture = data.fixtures.find(
      (fixture) => fixture.id === "czechia-south-africa-2026-06-18"
    );
    liveFixture.status = "SCHEDULED";
    liveFixture.officialMatchPhase = "First half";
    liveFixture.officialMatchTime = "5'";
    liveFixture.officialMatchTimeUpdatedAt = "2026-06-18T16:02:00.000Z";
    delete liveFixture.score;
  };
  const liveFallbackScoreCheck = await openPageAtTime(
    "2026-06-18T16:05:00.000Z",
    "/?view=matches&date=2026-06-18&tz=America%2FLos_Angeles",
    {
      fixtureTransform: applyLiveFallbackFixture
    }
  );
  const liveFallbackRow = liveFallbackScoreCheck.page.locator(
    '[data-match-id="czechia-south-africa-2026-06-18"]'
  );
  assert(
    (await liveFallbackRow.locator(".match-score").count()) === 0,
    "A live fixture without a loaded score should not show a fallback score."
  );
  assert(
    (await liveFallbackRow.getAttribute("aria-label")).includes("5th minute"),
    "A live match row should turn the official clock snapshot into a screen-reader-friendly minute label."
  );
  const liveScorePill = liveFallbackRow.locator(".live-pill");
  assert(
    (await liveScorePill.count()) === 1,
    "A live fixture without a loaded score should show one Live pill."
  );
  assert(
    (await liveScorePill.evaluate((pill) => pill.tagName)) === "SPAN" &&
      (await liveScorePill.getAttribute("href")) === null &&
      (await liveScorePill.getAttribute("title")) === null &&
      (await liveScorePill.getAttribute("role")) === "button" &&
      (await liveScorePill.getAttribute("tabindex")) === "0" &&
      (await liveScorePill.getAttribute("aria-label")) === "Live: FIFA snapshot: 5' · checked 3 min ago" &&
      (await liveScorePill.getAttribute("data-tooltip")) === "FIFA snapshot: 5' · checked 3 min ago",
    "The live pill should expose official snapshot freshness without linking away to FIFA."
  );
  const desktopPageCountBeforeLiveClick = liveFallbackScoreCheck.context.pages().length;
  const desktopUrlBeforeLiveClick = liveFallbackScoreCheck.page.url();
  await liveScorePill.click();
  await liveFallbackScoreCheck.page.waitForFunction(() => {
    const pill = document.querySelector(
      '[data-match-id="czechia-south-africa-2026-06-18"] .live-pill.is-touch-tooltip-open'
    );
    return pill && Number(getComputedStyle(pill, "::after").opacity) > 0.8;
  });
  const desktopLiveTooltipState = await liveFallbackScoreCheck.page.evaluate(() => {
    const pill = document.querySelector(
      '[data-match-id="czechia-south-africa-2026-06-18"] .live-pill.is-touch-tooltip-open'
    );

    return {
      href: pill?.getAttribute("href"),
      pageUrl: window.location.href,
      tooltip: pill?.getAttribute("data-tooltip") || "",
      visibleText: pill?.textContent.replace(/\s+/g, " ").trim() || ""
    };
  });
  assert(
    liveFallbackScoreCheck.context.pages().length === desktopPageCountBeforeLiveClick &&
      desktopLiveTooltipState.visibleText === "5'" &&
      desktopLiveTooltipState.tooltip === "FIFA snapshot: 5' · checked 3 min ago" &&
      desktopLiveTooltipState.href === null &&
      desktopLiveTooltipState.pageUrl === desktopUrlBeforeLiveClick,
    `Clicking the Live pill should open the snapshot tooltip without navigating. Measured ${JSON.stringify(desktopLiveTooltipState)}.`
  );
  const liveFallbackTouchCheck = await openPageAtTime(
    "2026-06-18T16:05:00.000Z",
    "/?view=matches&date=2026-06-18&tz=America%2FLos_Angeles",
    {
      contextOptions: {
        hasTouch: true,
        isMobile: true,
        viewport: { width: 390, height: 844 }
      },
      fixtureTransform: applyLiveFallbackFixture
    }
  );
  const liveFallbackTouchRow = liveFallbackTouchCheck.page.locator(
    '[data-match-id="czechia-south-africa-2026-06-18"]'
  );
  const touchPageCountBeforeLiveTap = liveFallbackTouchCheck.context.pages().length;
  const touchUrlBeforeLiveTap = liveFallbackTouchCheck.page.url();
  await liveFallbackTouchRow.locator(".live-pill").tap();
  await liveFallbackTouchCheck.page.waitForFunction(() => {
    const pill = document.querySelector(
      '[data-match-id="czechia-south-africa-2026-06-18"] .live-pill.is-touch-tooltip-open'
    );
    return pill && Number(getComputedStyle(pill, "::after").opacity) > 0.8;
  });
  const touchLiveTooltipState = await liveFallbackTouchCheck.page.evaluate(() => {
    const pill = document.querySelector(
      '[data-match-id="czechia-south-africa-2026-06-18"] .live-pill.is-touch-tooltip-open'
    );

    return {
      href: pill?.getAttribute("href"),
      pageUrl: window.location.href,
      tooltip: pill?.getAttribute("data-tooltip") || "",
      visibleText: pill?.textContent.replace(/\s+/g, " ").trim() || ""
    };
  });
  assert(
    liveFallbackTouchCheck.context.pages().length === touchPageCountBeforeLiveTap &&
      touchLiveTooltipState.visibleText === "5'" &&
      touchLiveTooltipState.tooltip === "FIFA snapshot: 5' · checked 3 min ago" &&
      touchLiveTooltipState.href === null &&
      touchLiveTooltipState.pageUrl === touchUrlBeforeLiveTap,
    `On touch devices, tapping the Live pill should open the time tooltip without navigating. Measured ${JSON.stringify(touchLiveTooltipState)}.`
  );
  await liveFallbackTouchCheck.context.close();
  const liveFallbackText = (await liveFallbackRow.innerText()).replace(/\s+/g, " ").trim();
  const liveFallbackUpperText = liveFallbackText.toUpperCase();
  const liveFallbackOrder = ["CZECHIA", "VS", "SOUTH AFRICA", "5'"].map((text) =>
    liveFallbackUpperText.indexOf(text)
  );
  assert(
    liveFallbackOrder.every((index) => index >= 0) &&
      liveFallbackOrder.every((index, itemIndex) => itemIndex === 0 || index > liveFallbackOrder[itemIndex - 1]),
    "A live fixture without a loaded score should keep vs between teams and show the official match time after the matchup."
  );
  assert(
    !liveFallbackText.includes("0-0"),
    "The visible live row text should not include a guessed 0-0 score."
  );
  const liveFallbackMetaText = await liveFallbackRow
    .locator(".match-row-meta > *")
    .evaluateAll((items) => items.map((item) => item.innerText.trim().toUpperCase()).join("|"));
  assert(
    liveFallbackMetaText === "5'|LIVE SCORE PENDING",
    "The live row should label the official match time and score-pending state when no verified score is loaded."
  );
  assert(
    (await liveFallbackRow.locator(".score-status.is-pending").count()) === 1,
    "A live fixture without a loaded score should show Live score pending."
  );
  assert(
    (await liveFallbackRow.innerText()).includes("Live score pending"),
    "The visible live row text should include Live score pending."
  );
  await liveFallbackScoreCheck.page.waitForTimeout(180);
  const liveTodayFocusState = await liveFallbackScoreCheck.page.locator("#match-list").evaluate((list) => {
    const liveRow = list.querySelector(":scope > .match-row.is-live");
    const fadedRows = Array.from(list.querySelectorAll(":scope > .match-row:not(.is-live)"));
    const yesterdaySection = list.querySelector(":scope > .yesterday-section");
    return {
      hasLiveTodayMatch: list.classList.contains("has-live-today-match"),
      liveOpacity: liveRow ? Number(getComputedStyle(liveRow).opacity) : 0,
      fadedOpacities: fadedRows.map((row) => Number(getComputedStyle(row).opacity)),
      yesterdaySectionOpacity: yesterdaySection ? Number(getComputedStyle(yesterdaySection).opacity) : null
    };
  });
  assert(
    liveTodayFocusState.hasLiveTodayMatch &&
      liveTodayFocusState.liveOpacity === 1 &&
      liveTodayFocusState.fadedOpacities.length > 0 &&
      liveTodayFocusState.fadedOpacities.every((opacity) => opacity < 0.6) &&
      liveTodayFocusState.yesterdaySectionOpacity !== null &&
      liveTodayFocusState.yesterdaySectionOpacity < 0.6,
    `When Today has a live match, non-live rows and the Recent matches section should fade while live rows stay full opacity. Measured ${JSON.stringify(liveTodayFocusState)}.`
  );
  const liveDetailPredictionCheck = await openPageAtTime(
    "2026-07-01T20:05:00.000Z",
    "/?view=matches&date=2026-07-01&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const fixture = data.fixtures.find((item) => item.id === "match-82-round-of-32-2026-07-01");
        fixture.status = "LIVE";
        fixture.score = { home: 0, away: 0 };
        fixture.officialMatchPhase = "Second half";
        fixture.officialMatchTime = "97'";
        fixture.officialMatchAddedTime = 10;
        fixture.officialMatchTimeUpdatedAt = "2026-07-01T20:04:00.000Z";
      }
    }
  );
  await liveDetailPredictionCheck.page.locator('[data-match-id="match-82-round-of-32-2026-07-01"]').click();
  const liveDetailBlockOrder = await liveDetailPredictionCheck.page
    .locator("#match-info .info-block")
    .evaluateAll((blocks) =>
      blocks.map((block) => ({
        hasLive: block.classList.contains("match-live-block"),
        hasPrediction: block.classList.contains("match-prediction-block"),
        text: block.textContent.replace(/\s+/g, " ").trim()
      }))
    );
  const liveDetailPredictionRows = await liveDetailPredictionCheck.page
    .locator("#match-info .match-prediction-block .prediction-row")
    .evaluateAll((rows) => rows.map((row) => row.textContent.replace(/\s+/g, " ").trim()));
  const liveDetailLiveIndex = liveDetailBlockOrder.findIndex((block) => block.hasLive);
  const liveDetailPredictionIndex = liveDetailBlockOrder.findIndex((block) => block.hasPrediction);
  assert(
    liveDetailLiveIndex >= 0 &&
      liveDetailPredictionIndex > liveDetailLiveIndex &&
      liveDetailBlockOrder[liveDetailLiveIndex].text.includes("Live score") &&
      liveDetailPredictionRows.length === 3 &&
      /^Belgium \d+%$/.test(liveDetailPredictionRows[0]) &&
      /^Tie \d+%$/.test(liveDetailPredictionRows[1]) &&
      /^Senegal \d+%$/.test(liveDetailPredictionRows[2]),
    `Live match detail should keep the prediction card below the live score. Measured ${JSON.stringify({ liveDetailBlockOrder, liveDetailPredictionRows })}.`
  );
  const liveDetailStoppageState = await liveDetailPredictionCheck.page.locator("#match-info").evaluate((info) => {
    const heading = info.querySelector(".match-live-block h3");
    return {
      headingAria: heading?.getAttribute("aria-label") || "",
      headingText: heading?.textContent.replace(/\s+/g, " ").trim() || "",
      sourceText: info.querySelector(".live-source-note")?.textContent.replace(/\s+/g, " ").trim() || ""
    };
  });
  assert(
    liveDetailStoppageState.headingText === "Live score 97' (+10 added)" &&
      liveDetailStoppageState.headingAria === "Live score, 97' (+10 added)" &&
      liveDetailStoppageState.sourceText.includes("Current time 97' (+10 added)") &&
      liveDetailStoppageState.sourceText.includes("Checked 1 min ago") &&
      liveDetailStoppageState.sourceText.includes("See latest"),
    `Live match details should show FIFA's announced added time beside official minute snapshots. Measured ${JSON.stringify(liveDetailStoppageState)}.`
  );
  await liveDetailPredictionCheck.context.close();

  const applyLivePhaseFixture = (phase, matchTime, addedTime = 10) => (data) => {
    const fixture = data.fixtures.find((item) => item.id === "match-82-round-of-32-2026-07-01");
    fixture.status = "LIVE";
    fixture.score = { home: 0, away: 0 };
    fixture.officialMatchPhase = phase;
    fixture.officialMatchTime = matchTime;
    fixture.officialMatchAddedTime = addedTime;
    fixture.officialMatchTimeUpdatedAt = "2026-07-01T20:04:00.000Z";
  };
  const liveExtraTimeCheck = await openPageAtTime(
    "2026-07-01T20:05:00.000Z",
    "/?view=matches&date=2026-07-01&tz=America%2FLos_Angeles",
    {
      fixtureTransform: applyLivePhaseFixture("Extra time", "118'")
    }
  );
  await liveExtraTimeCheck.page.locator('[data-match-id="match-82-round-of-32-2026-07-01"]').click();
  const liveExtraTimeState = await liveExtraTimeCheck.page.locator("#match-info").evaluate((info) => {
    const heading = info.querySelector(".match-live-block h3");
    return {
      headingAria: heading?.getAttribute("aria-label") || "",
      headingText: heading?.textContent.replace(/\s+/g, " ").trim() || "",
      sourceText: info.querySelector(".live-source-note")?.textContent.replace(/\s+/g, " ").trim() || ""
    };
  });
  assert(
    liveExtraTimeState.headingText === "Live score 118' (Extra time)" &&
      liveExtraTimeState.headingAria === "Live score, 118' (Extra time)" &&
      liveExtraTimeState.sourceText.includes("Current time 118' (Extra time)") &&
      !liveExtraTimeState.sourceText.includes("+10 added"),
    `Live extra-time labels should show the phase without reusing regulation added time. Measured ${JSON.stringify(liveExtraTimeState)}.`
  );
  await liveExtraTimeCheck.context.close();

  const livePenaltyCheck = await openPageAtTime(
    "2026-07-01T20:05:00.000Z",
    "/?view=matches&date=2026-07-01&tz=America%2FLos_Angeles",
    {
      fixtureTransform: applyLivePhaseFixture("Penalty shootout", "120'")
    }
  );
  await livePenaltyCheck.page.locator('[data-match-id="match-82-round-of-32-2026-07-01"]').click();
  const livePenaltyState = await livePenaltyCheck.page.locator("#match-info").evaluate((info) => {
    const heading = info.querySelector(".match-live-block h3");
    return {
      headingAria: heading?.getAttribute("aria-label") || "",
      headingText: heading?.textContent.replace(/\s+/g, " ").trim() || "",
      sourceText: info.querySelector(".live-source-note")?.textContent.replace(/\s+/g, " ").trim() || ""
    };
  });
  assert(
    livePenaltyState.headingText === "Live score Penalty shootout" &&
      livePenaltyState.headingAria === "Live score, Penalty shootout" &&
      livePenaltyState.sourceText.includes("Current time Penalty shootout") &&
      !livePenaltyState.sourceText.includes("+10 added"),
    `Live penalty labels should prefer the shootout phase instead of a minute or regulation added time. Measured ${JSON.stringify(livePenaltyState)}.`
  );
  await livePenaltyCheck.context.close();

  const applyHalfTimeLiveFixture = (data) => {
    const fixture = data.fixtures.find(
      (item) => item.id === "czechia-south-africa-2026-06-18"
    );
    fixture.status = "LIVE";
    fixture.score = { home: 0, away: 1 };
    fixture.scoreUpdatedAt = "2026-06-18T16:03:00.000Z";
    fixture.officialMatchTime = "HT";
    fixture.officialMatchTimeUpdatedAt = "2026-06-18T16:03:00.000Z";
    delete fixture.officialMatchPhase;
  };
  const liveHalfTimeCheck = await openPageAtTime(
    "2026-06-18T16:05:00.000Z",
    "/?view=matches&date=2026-06-18&tz=America%2FLos_Angeles",
    {
      fixtureTransform: applyHalfTimeLiveFixture
    }
  );
  const liveHalfTimeRow = liveHalfTimeCheck.page.locator(
    '[data-match-id="czechia-south-africa-2026-06-18"]'
  );
  const liveHalfTimeRowState = await liveHalfTimeRow.evaluate((row) => {
    const pill = row.querySelector(".live-pill");
    return {
      ariaLabel: pill?.getAttribute("aria-label") || "",
      pillText: pill?.textContent.replace(/\s+/g, " ").trim() || "",
      scoreText: row.querySelector(".match-score")?.textContent.replace(/\s+/g, " ").trim() || "",
      tooltip: pill?.getAttribute("data-tooltip") || ""
    };
  });
  assert(
    liveHalfTimeRowState.pillText === "Half-time" &&
      liveHalfTimeRowState.scoreText === "0-1 · 2 min ago" &&
      liveHalfTimeRowState.tooltip === "FIFA snapshot: Half-time · checked 2 min ago" &&
      liveHalfTimeRowState.ariaLabel === "Live: FIFA snapshot: Half-time · checked 2 min ago",
    `A live row should show official half-time position from MatchTime=HT instead of only Live. Measured ${JSON.stringify(liveHalfTimeRowState)}.`
  );
  await liveHalfTimeRow.locator(".match-row-trigger").click();
  const liveHalfTimeDetailState = await liveHalfTimeCheck.page.locator("#match-info").evaluate((info) => {
    const heading = info.querySelector(".match-live-block h3");
    return {
      headingAria: heading?.getAttribute("aria-label") || "",
      headingText: heading?.textContent.replace(/\s+/g, " ").trim() || "",
      sourceText: info.querySelector(".live-source-note")?.textContent.replace(/\s+/g, " ").trim() || ""
    };
  });
  assert(
    liveHalfTimeDetailState.headingText === "Live score Half-time" &&
      liveHalfTimeDetailState.headingAria === "Live score, Half-time" &&
      liveHalfTimeDetailState.sourceText.includes("Current time Half-time") &&
      liveHalfTimeDetailState.sourceText.includes("Checked 2 min ago") &&
      liveHalfTimeDetailState.sourceText.includes("See latest"),
    `Live match details should keep the official match position visible in the heading and source row. Measured ${JSON.stringify(liveHalfTimeDetailState)}.`
  );
  await liveHalfTimeCheck.context.close();

  const liveHalfTimeZhCheck = await openPageAtTime(
    "2026-06-18T16:05:00.000Z",
    "/?view=matches&date=2026-06-18&lang=zh&tz=America%2FLos_Angeles",
    {
      fixtureTransform: applyHalfTimeLiveFixture
    }
  );
  const liveHalfTimeZhRow = liveHalfTimeZhCheck.page.locator(
    '[data-match-id="czechia-south-africa-2026-06-18"]'
  );
  assert(
    (await liveHalfTimeZhRow.locator(".live-pill").innerText()).trim() === "半场结束",
    "A live half-time pill should localize the official match position in Chinese."
  );
  await liveHalfTimeZhRow.locator(".match-row-trigger").click();
  await liveHalfTimeZhCheck.page.waitForFunction(() => {
    const info = document.querySelector("#match-info");
    const headingText =
      info?.querySelector(".match-live-block h3")?.textContent.replace(/\s+/g, " ").trim() || "";
    const sourceText =
      info?.querySelector(".live-source-note")?.textContent.replace(/\s+/g, " ").trim() || "";
    return (
      headingText.includes("实时比分") &&
      headingText.includes("半场结束") &&
      sourceText.includes("当前时间") &&
      sourceText.includes("半场结束")
    );
  });
  const liveHalfTimeZhDetailText = normalizeFlaggedText(
    await liveHalfTimeZhCheck.page.locator("#match-info").innerText()
  );
  assert(
    liveHalfTimeZhDetailText.includes("实时比分 半场结束") &&
      liveHalfTimeZhDetailText.includes("当前时间 半场结束") &&
      liveHalfTimeZhDetailText.includes("查看最新"),
    `Live half-time details should localize the position label in Chinese. Measured ${JSON.stringify(liveHalfTimeZhDetailText)}.`
  );
  await liveHalfTimeZhCheck.context.close();

  await liveFallbackScoreCheck.page.setViewportSize({ width: 390, height: 844 });
  await liveFallbackScoreCheck.page.waitForTimeout(80);
  const liveFallbackLayout = await liveFallbackRow.evaluate((row) => {
    const hiddenNames = Array.from(row.querySelectorAll(".match-teams .team-name")).filter(
      (name) => name.scrollWidth > name.clientWidth + 1 && getComputedStyle(name).overflow !== "visible"
    );
    const rowRect = row.getBoundingClientRect();
    const scoreStatusRect = row.querySelector(".score-status")?.getBoundingClientRect();
    return {
      hiddenNameCount: hiddenNames.length,
      rowHeight: row.getBoundingClientRect().height,
      scrollOverflow: row.scrollWidth - row.clientWidth,
      statusRightGap: scoreStatusRect ? rowRect.right - scoreStatusRect.right : 0
    };
  });
  assert(
      liveFallbackLayout.hiddenNameCount === 0 &&
      liveFallbackLayout.rowHeight < 72 &&
      liveFallbackLayout.scrollOverflow <= 1 &&
      liveFallbackLayout.statusRightGap >= 2,
    `The live fallback row should wrap cleanly without hidden team names, horizontal overflow, or a clipped status pill. Measured ${JSON.stringify(liveFallbackLayout)}.`
  );
  await liveFallbackScoreCheck.page.setViewportSize({ width: 280, height: 760 });
  await liveFallbackScoreCheck.page.waitForTimeout(80);
  const liveTinyChipLayout = await getMatchRowMetaCollisionMetrics(liveFallbackScoreCheck.page);
  assertCleanMatchMetaLayout(
    liveTinyChipLayout,
    "Tiny live/current-score rows should keep live, score, and pending chips out of the matchup text."
  );
  await liveFallbackScoreCheck.context.close();

  const applyDelayedKickoffFixture = (data) => {
    const delayedFixture = data.fixtures.find(
      (fixture) => fixture.id === "czechia-south-africa-2026-06-18"
    );
    delayedFixture.status = "DELAYED";
    delete delayedFixture.officialMatchAddedTime;
    delete delayedFixture.officialMatchPhase;
    delete delayedFixture.officialMatchTime;
    delete delayedFixture.officialMatchTimeUpdatedAt;
    delete delayedFixture.score;
    delete delayedFixture.scoreDetails;
    delete delayedFixture.scoreUpdatedAt;
  };
  const delayedKickoffCheck = await openPageAtTime(
    "2026-06-18T16:05:00.000Z",
    "/?view=matches&date=2026-06-18&tz=America%2FLos_Angeles",
    {
      fixtureTransform: applyDelayedKickoffFixture
    }
  );
  const delayedKickoffRow = delayedKickoffCheck.page.locator(
    '[data-match-id="czechia-south-africa-2026-06-18"]'
  );
  const delayedKickoffState = await delayedKickoffRow.evaluate((row) => ({
    ariaLabel: row.getAttribute("aria-label") || "",
    delayedCount: row.querySelectorAll(".delayed-pill").length,
    liveCount: row.querySelectorAll(".live-pill").length,
    metaText: Array.from(row.querySelectorAll(".match-row-meta > *"))
      .map((item) => item.textContent.replace(/\s+/g, " ").trim().toUpperCase())
      .join("|"),
    pendingCount: row.querySelectorAll(".score-status").length,
    scoreCount: row.querySelectorAll(".match-score").length,
    state: row.dataset.state,
    text: row.textContent.replace(/\s+/g, " ").trim()
  }));
  assert(
    delayedKickoffState.state === "delayed" &&
      delayedKickoffState.delayedCount === 1 &&
      delayedKickoffState.liveCount === 0 &&
      delayedKickoffState.pendingCount === 0 &&
      delayedKickoffState.scoreCount === 0 &&
      delayedKickoffState.metaText === "DELAYED" &&
      delayedKickoffState.ariaLabel.startsWith("Delayed, Czechia vs South Africa") &&
      !delayedKickoffState.text.includes("Live") &&
      !delayedKickoffState.text.includes("Pending") &&
      !delayedKickoffState.text.includes("0-0"),
    `A delayed kickoff should stay non-live with a Delayed chip and no score/pending shell. Measured ${JSON.stringify(delayedKickoffState)}.`
  );
  await delayedKickoffRow.click();
  const delayedKickoffDetailText = normalizeFlaggedText(
    await delayedKickoffCheck.page.locator("#match-info").innerText()
  );
  assert(
    delayedKickoffDetailText.includes("Kickoff delayed") &&
      delayedKickoffDetailText.includes("Official feed has not marked this match live yet.") &&
      !delayedKickoffDetailText.includes("Live score"),
    `Delayed match details should explain the kickoff delay without showing the live-score panel. Measured ${JSON.stringify(delayedKickoffDetailText)}.`
  );
  await delayedKickoffCheck.context.close();

  const delayedKickoffZhCheck = await openPageAtTime(
    "2026-06-18T16:05:00.000Z",
    "/?view=matches&date=2026-06-18&lang=zh&tz=America%2FLos_Angeles",
    {
      fixtureTransform: applyDelayedKickoffFixture
    }
  );
  const delayedKickoffZhRow = delayedKickoffZhCheck.page.locator(
    '[data-match-id="czechia-south-africa-2026-06-18"]'
  );
  assert(
    (await delayedKickoffZhRow.locator(".delayed-pill").innerText()).trim() === "延迟",
    "A delayed kickoff should localize the Delayed chip in Chinese."
  );
  await delayedKickoffZhRow.click();
  const delayedKickoffZhDetailText = normalizeFlaggedText(
    await delayedKickoffZhCheck.page.locator("#match-info").innerText()
  );
  assert(
    delayedKickoffZhDetailText.includes("开球延迟") &&
      delayedKickoffZhDetailText.includes("官方数据源尚未将这场比赛标记为直播。"),
    `Delayed match details should localize the kickoff-delay explanation in Chinese. Measured ${JSON.stringify(delayedKickoffZhDetailText)}.`
  );
  await delayedKickoffZhCheck.context.close();

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
    (await pendingScoreRow.locator(".score-status").innerText()).trim() === "Pending",
    "A post-match fixture with no loaded score should show a visible pending status."
  );
  assert(
    (await pendingScoreRow.getAttribute("aria-label")).includes("pending"),
    "A post-match fixture with no loaded score should expose the pending status to assistive tech."
  );
  await pendingScoreCheck.page.setViewportSize({ width: 280, height: 760 });
  await pendingScoreCheck.page.waitForTimeout(80);
  const pendingTinyChipLayout = await getMatchRowMetaCollisionMetrics(pendingScoreCheck.page);
  assertCleanMatchMetaLayout(
    pendingTinyChipLayout,
    "Tiny completed/pending rows should keep score and pending chips out of the matchup text."
  );
  await pendingScoreCheck.context.close();

  const compactLiveMatchupCheck = await openPageAtTime(
    "2026-06-25T21:08:00.000Z",
    "/?view=matches&date=2026-06-25&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const compactFixture = data.fixtures.find(
          (fixture) => fixture.id === "curacao-cote-divoire-2026-06-25"
        );
        const gutterFixture = data.fixtures.find(
          (fixture) => fixture.id === "ecuador-germany-2026-06-25"
        );
        compactFixture.status = "LIVE";
        compactFixture.score = { home: 0, away: 1 };
        gutterFixture.status = "LIVE";
        gutterFixture.score = { home: 1, away: 1 };
      }
    }
  );
  await compactLiveMatchupCheck.page.setViewportSize({ width: 390, height: 844 });
  await compactLiveMatchupCheck.page.waitForTimeout(80);
  const compactLiveMatchupMetrics = await getMobileMatchupGridMetrics(
    compactLiveMatchupCheck.page,
    "curacao-cote-divoire-2026-06-25"
  );
  assert(
    compactLiveMatchupMetrics.homeName?.text === "Curaçao" &&
      compactLiveMatchupMetrics.awayFlag?.text === "🇨🇮" &&
      compactLiveMatchupMetrics.awayName?.text === "Côte d'Ivoire" &&
      compactLiveMatchupMetrics.rankCount === 0,
    `Curaçao vs Côte d'Ivoire compact live row should render the expected teams without rank pills. Measured ${JSON.stringify(compactLiveMatchupMetrics)}.`
  );
  assertCompactMobileMatchupGrid(
    compactLiveMatchupMetrics,
    "Curaçao vs Côte d'Ivoire should use the compact mobile matchup grid when a live row does not fit."
  );
  const gutterLiveMatchupMetrics = await getMobileMatchupGridMetrics(
    compactLiveMatchupCheck.page,
    "ecuador-germany-2026-06-25"
  );
  assert(
    gutterLiveMatchupMetrics.homeName?.text === "Ecuador" &&
      gutterLiveMatchupMetrics.awayFlag?.text === "🇩🇪" &&
      gutterLiveMatchupMetrics.awayName?.text === "Germany" &&
      gutterLiveMatchupMetrics.rankCount === 0,
    `Ecuador vs Germany compact live row should render the expected teams without rank pills. Measured ${JSON.stringify(gutterLiveMatchupMetrics)}.`
  );
  assertCompactOrComfortableMobileMatchup(
    gutterLiveMatchupMetrics,
    "Ecuador vs Germany should use the compact mobile matchup grid only when the inline live row would crowd the LIVE pill."
  );
  assertCleanMatchMetaLayout(
    await getMatchRowMetaCollisionMetrics(compactLiveMatchupCheck.page, ".match-row.is-live"),
    "Compact live matchup rows should keep live and score chips out of the matchup text."
  );
  await compactLiveMatchupCheck.context.close();

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

            if (fixture.id === nextScheduledFixture.id) {
              fixture.status = "SCHEDULED";
              fixture.score = { home: 0, away: 0 };
              fixture.scoreUpdatedAt = beforeKickoff.toISOString();
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
    const upNextScoreLeakCheck = await upNextCheck.page.locator(".match-row.is-next").evaluateAll((rows) =>
      rows.map((row) => ({
        ariaLabel: row.getAttribute("aria-label") || "",
        fixtureId: row.dataset.matchId || "",
        liveCount: row.querySelectorAll(".live-pill").length,
        pendingCount: row.querySelectorAll(".score-status").length,
        scoreCount: row.querySelectorAll(".match-score").length,
        text: row.textContent.replace(/\s+/g, " ").trim(),
        upNextCount: row.querySelectorAll(".up-next-pill").length
      }))
    );
    assert(
      upNextScoreLeakCheck.length === nextScheduledFixtureIds.length &&
        upNextScoreLeakCheck.every(
          (row) =>
            row.upNextCount === 1 &&
            row.scoreCount === 0 &&
            row.liveCount === 0 &&
            row.pendingCount === 0 &&
            !/\b\d+\s*-\s*\d+\b/.test(row.text) &&
            !/\b\d+\s*-\s*\d+\b|current score|final score/i.test(row.ariaLabel)
        ),
      `Up next rows should not render or announce score, live, or pending pills, even when a provider sends a 0-0 shell. Measured ${JSON.stringify(upNextScoreLeakCheck)}.`
    );
    for (const width of [390, 430]) {
      await upNextCheck.page.setViewportSize({ width, height: 844 });
      await upNextCheck.page.waitForTimeout(80);
      const upNextRailMetrics = await upNextCheck.page.evaluate((fixtureIds) => {
        return fixtureIds.map((fixtureId) => {
          const row = document.querySelector(`.match-row[data-match-id="${fixtureId}"]`);
          const pill = row?.querySelector(".up-next-pill");
          const rowRect = row?.getBoundingClientRect();
          const pillRect = pill?.getBoundingClientRect();

          return {
            fixtureId,
            rightGap: rowRect && pillRect ? Math.round(rowRect.right - pillRect.right) : null,
            rowScrollOverflow: row ? row.scrollWidth - row.clientWidth : null
          };
        });
      }, nextScheduledFixtureIds);
      const rightGaps = upNextRailMetrics
        .map((metric) => metric.rightGap)
        .filter((gap) => Number.isFinite(gap));
      assert(
        rightGaps.length === nextScheduledFixtureIds.length &&
          rightGaps.every((gap) => gap >= 0 && gap <= 8) &&
          Math.max(...rightGaps) - Math.min(...rightGaps) <= 4 &&
          upNextRailMetrics.every((metric) => metric.rowScrollOverflow <= 1),
        `Mobile Up next pills should share the same right rail at ${width}px. Measured ${JSON.stringify(upNextRailMetrics)}.`
      );

      if (width === 390 && nextScheduledFixtureIds.includes("ecuador-germany-2026-06-25")) {
        const ecuadorGermanyVsPlacement = await upNextCheck.page
          .locator('[data-match-id="ecuador-germany-2026-06-25"]')
          .evaluate((row) => {
            const versus = row.querySelector(".versus");
            const versusRect = versus?.getBoundingClientRect();
            const sameLineTeamPieces = Array.from(row.querySelectorAll(".match-teams .team-name"))
              .filter((piece) => {
                const rect = piece.getBoundingClientRect();
                return versusRect && Math.abs(rect.top - versusRect.top) <= 1;
              })
              .map((piece) => piece.textContent.replace(/\s+/g, " ").trim());

            return {
              hasWrappedClass: row.classList.contains("has-wrapped-matchup"),
              rowScrollOverflow: row.scrollWidth - row.clientWidth,
              sameLineTeamPieces,
              text: row.innerText.replace(/\s+/g, " ").trim()
            };
          });
        assert(
          (!ecuadorGermanyVsPlacement.hasWrappedClass ||
            ecuadorGermanyVsPlacement.sameLineTeamPieces.length > 0) &&
            ecuadorGermanyVsPlacement.rowScrollOverflow <= 1,
          `Ecuador vs Germany should not leave vs alone on its own mobile line. Measured ${JSON.stringify(ecuadorGermanyVsPlacement)}.`
        );
      }

      if (width === 390 && nextScheduledFixtureIds.includes("curacao-cote-divoire-2026-06-25")) {
        const curacaoCoteWrap = await upNextCheck.page
          .locator('[data-match-id="curacao-cote-divoire-2026-06-25"]')
          .evaluate((row) => {
            const rect = (selector) => {
              const element = row.querySelector(selector);
              const bounds = element?.getBoundingClientRect();

              return bounds
                ? {
                    bottom: Math.round(bounds.bottom),
                    center: Math.round(bounds.top + bounds.height / 2),
                    height: Math.round(bounds.height),
                    left: Math.round(bounds.left),
                    right: Math.round(bounds.right),
                    text: element.textContent.replace(/\s+/g, " ").trim(),
                    top: Math.round(bounds.top),
                    width: Math.round(bounds.width)
                  }
                : null;
            };

            return {
              away: rect(".match-team-away"),
              awayFlag: rect(".match-team-away .flag"),
              awayName: rect(".match-team-away .team-name"),
              rankCount: row.querySelectorAll(".match-teams .rank-pill").length,
              hasWrappedClass: row.classList.contains("has-wrapped-matchup"),
              home: rect(".match-team-home"),
              homeName: rect(".match-team-home .team-name"),
              meta: rect(".match-row-meta"),
              rowScrollOverflow: row.scrollWidth - row.clientWidth,
              text: row.innerText.replace(/\s+/g, " ").trim(),
              versus: rect(".match-versus")
            };
          });
        assert(
          curacaoCoteWrap.homeName?.text === "Curaçao" &&
            curacaoCoteWrap.awayFlag?.text === "🇨🇮" &&
            curacaoCoteWrap.awayName?.text === "Côte d'Ivoire" &&
            curacaoCoteWrap.rankCount === 0 &&
            curacaoCoteWrap.homeName.right <= curacaoCoteWrap.home.right + 1 &&
            curacaoCoteWrap.awayName.right <= curacaoCoteWrap.away.right + 1 &&
            (!curacaoCoteWrap.hasWrappedClass ||
              (curacaoCoteWrap.home.center < curacaoCoteWrap.versus.center &&
                Math.abs(curacaoCoteWrap.versus.center - curacaoCoteWrap.awayFlag.center) <= 2 &&
                curacaoCoteWrap.versus.right <= curacaoCoteWrap.awayFlag.left + 1)) &&
            curacaoCoteWrap.rowScrollOverflow <= 1,
          `Curaçao vs Côte d'Ivoire should stay readable inline when it fits, or use the compact mobile matchup grid after wrapping is detected. Measured ${JSON.stringify(curacaoCoteWrap)}.`
        );
      }
    }
    await upNextCheck.context.close();
  }

  const nextScheduledKnockoutFixture = fixturesData.fixtures
    .filter((fixture) => fixture.stage && fixture.stage !== "group" && fixture.status === "SCHEDULED" && fixture.kickoffUtc)
    .sort((a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc))[0];
  if (nextScheduledKnockoutFixture) {
    const nextKnockoutKickoffUtc = nextScheduledKnockoutFixture.kickoffUtc;
    const nextScheduledKnockoutMatchNumbers = fixturesData.fixtures
      .filter(
        (fixture) =>
          fixture.stage &&
          fixture.stage !== "group" &&
          fixture.status === "SCHEDULED" &&
          fixture.kickoffUtc === nextKnockoutKickoffUtc
      )
      .map((fixture) => String(fixture.matchNumber));
    const beforeKnockoutKickoff = new Date(new Date(nextKnockoutKickoffUtc).getTime() - 5 * 60 * 1000);
    const tournamentUpNextCheck = await openPageAtTime(
      beforeKnockoutKickoff.toISOString(),
      "/?view=standings&standingsMode=tournament&tz=America%2FLos_Angeles",
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
    await tournamentUpNextCheck.page.waitForSelector(".progress-match");
    await tournamentUpNextCheck.page.waitForFunction(
      (expectedBadgeCount) =>
        document.querySelectorAll(".progress-match").length >= 32 &&
        document.querySelectorAll(".tournament-view .tournament-up-next-pill").length === expectedBadgeCount,
      nextScheduledKnockoutMatchNumbers.length
    );
    const tournamentUpNextState = await tournamentUpNextCheck.page.evaluate((matchNumbers) => {
      const expected = new Set(matchNumbers);
      const cardsWithBadges = [...document.querySelectorAll(".progress-match .tournament-up-next-pill")]
        .map((pill) => {
          const card = pill.closest(".progress-match");
          const header = pill.closest(".knockout-match-header");
          const meta = header?.querySelector(".knockout-match-meta");
          const cardRect = card?.getBoundingClientRect();
          const metaRect = meta?.getBoundingClientRect();
          const pillRect = pill.getBoundingClientRect();

          return {
            cardIsNext: card?.classList.contains("is-next") || false,
            headerHasUpNext: header?.classList.contains("has-up-next") || false,
            headerOverflow: header ? header.scrollWidth - header.clientWidth : null,
            isExpected: expected.has(card?.dataset.matchNumber || ""),
            label: pill.textContent.replace(/\s+/g, " ").trim(),
            matchNumber: card?.dataset.matchNumber || "",
            rightGap: cardRect ? Math.round(cardRect.right - pillRect.right) : null,
            verticalCenterGap: metaRect
              ? Math.abs((metaRect.top + metaRect.height / 2) - (pillRect.top + pillRect.height / 2))
              : null
          };
        });

      return {
        cardsWithBadges,
        tournamentBadgeCount: document.querySelectorAll(".tournament-view .tournament-up-next-pill").length
      };
    }, nextScheduledKnockoutMatchNumbers);
    assert(
      tournamentUpNextState.tournamentBadgeCount === nextScheduledKnockoutMatchNumbers.length &&
        tournamentUpNextState.cardsWithBadges.every(
          (badge) =>
            badge.isExpected &&
            badge.cardIsNext &&
            badge.headerHasUpNext &&
            badge.headerOverflow <= 1 &&
            badge.label === "Up next" &&
            badge.rightGap >= 6 &&
            badge.rightGap <= 12 &&
            badge.verticalCenterGap !== null &&
            badge.verticalCenterGap <= 2
        ),
      `Tournament cards should mark only the next scheduled knockout match with a top-right Up next pill aligned to the date and venue. Measured ${JSON.stringify(tournamentUpNextState)}.`
    );
    await tournamentUpNextCheck.context.close();

    const tournamentShowNextFloatingCheck = await openPageAtTime(
      beforeKnockoutKickoff.toISOString(),
      "/?view=standings&standingsMode=tournament&tz=America%2FLos_Angeles",
      {
        contextOptions: {
          hasTouch: true,
          isMobile: true,
          viewport: { width: 390, height: 844 }
        },
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
    await tournamentShowNextFloatingCheck.page.waitForSelector(".tournament-show-next-button");
    await tournamentShowNextFloatingCheck.page.evaluate(() => {
      window.dispatchEvent(new Event("resize"));
    });
    await tournamentShowNextFloatingCheck.page.waitForTimeout(450);
    const tournamentShowNextFloatingState = await tournamentShowNextFloatingCheck.page.evaluate(() => {
      const button = document.querySelector(".tournament-show-next-button");
      const ballBoy = document.querySelector(".scout-widget");
      const progression = document.querySelector(".tournament-progression");
      const rect = button?.getBoundingClientRect();
      const ballBoyRect = ballBoy?.getBoundingClientRect();
      const style = button ? getComputedStyle(button) : null;

      return {
        ballBoyBottom: ballBoyRect ? Math.round(ballBoyRect.bottom) : null,
        ballBoyClearsButton: Boolean(
          ballBoyRect && rect && ballBoyRect.bottom <= rect.top - 10
        ),
        ballBoyHasAvoidance: Boolean(ballBoy?.classList.contains("has-tournament-show-next")),
        ballBoyObstacleTranslateY:
          ballBoy?.style.getPropertyValue("--scout-obstacle-translate-y") || "",
        ballBoyShowNextHeight:
          ballBoy?.style.getPropertyValue("--tournament-show-next-height") || "",
        ballBoyTransformTransitionDuration: ballBoy
          ? getComputedStyle(ballBoy).transitionDuration.split(",").map((value) => value.trim())[2] || ""
          : "",
        bottomGapToLayoutViewport: rect ? Math.round(window.innerHeight - rect.bottom) : null,
        buttonInsideProgression: Boolean(button?.closest(".tournament-progression")),
        buttonAriaHidden: button?.getAttribute("aria-hidden") || "",
        buttonDisabled: Boolean(button?.disabled),
        buttonParentClass: button?.parentElement?.className || "",
        buttonPosition: style?.position || "",
        buttonOpacityTransitionDuration:
          style?.transitionDuration.split(",").map((value) => value.trim())[0] || "",
        buttonTransform: style?.transform || "",
        label: button?.textContent.replace(/\s+/g, " ").trim() || "",
        pairGap: rect && ballBoyRect ? Math.round(rect.top - ballBoyRect.bottom) : null,
        progressionContainsButton: Boolean(button && progression?.contains(button)),
        rightGap: rect ? Math.round(window.innerWidth - rect.right) : null,
        rightEdgeDelta: rect && ballBoyRect ? Math.round(Math.abs(rect.right - ballBoyRect.right)) : null,
        rootHasDockController: document.documentElement.classList.contains(
          "has-scout-tournament-dock-controller"
        ),
        targetMatchNumber: button?.dataset.showNextTournamentMatch || "",
      };
    });
    assert(
      tournamentShowNextFloatingState.label === "Show next" &&
        tournamentShowNextFloatingState.ballBoyClearsButton &&
        tournamentShowNextFloatingState.ballBoyHasAvoidance &&
        tournamentShowNextFloatingState.buttonAriaHidden === "false" &&
        !tournamentShowNextFloatingState.buttonDisabled &&
        Boolean(tournamentShowNextFloatingState.ballBoyObstacleTranslateY) &&
        tournamentShowNextFloatingState.ballBoyShowNextHeight === "50px" &&
        nextScheduledKnockoutMatchNumbers.includes(tournamentShowNextFloatingState.targetMatchNumber) &&
        tournamentShowNextFloatingState.buttonParentClass.includes("tournament-view") &&
        !tournamentShowNextFloatingState.buttonInsideProgression &&
        !tournamentShowNextFloatingState.progressionContainsButton &&
        tournamentShowNextFloatingState.buttonPosition === "fixed" &&
        tournamentShowNextFloatingState.buttonOpacityTransitionDuration === "0.18s" &&
        tournamentShowNextFloatingState.buttonTransform === "none" &&
        tournamentShowNextFloatingState.ballBoyTransformTransitionDuration === "0.18s" &&
        tournamentShowNextFloatingState.bottomGapToLayoutViewport >= 12 &&
        tournamentShowNextFloatingState.bottomGapToLayoutViewport <= 16 &&
        tournamentShowNextFloatingState.pairGap >= 12 &&
        tournamentShowNextFloatingState.pairGap <= 16 &&
        tournamentShowNextFloatingState.rightGap >= 12 &&
        tournamentShowNextFloatingState.rightGap <= 16 &&
        tournamentShowNextFloatingState.rightEdgeDelta <= 1 &&
        tournamentShowNextFloatingState.rootHasDockController,
      `Mobile Show next and Ball Boy should form one native fixed dock at the page bottom-right without a duplicate viewport offset. Measured ${JSON.stringify(tournamentShowNextFloatingState)}.`
    );

    const tournamentShowNextFooterState = await tournamentShowNextFloatingCheck.page.evaluate(() => {
      const note = document.querySelector("#source-note");
      return {
        hidden: note?.closest(".site-footer")?.hidden ?? false,
        layoutRectCount: note?.getClientRects().length ?? -1
      };
    });
    assert(
      tournamentShowNextFooterState.hidden &&
        tournamentShowNextFooterState.layoutRectCount === 0,
      `The bottom disclaimer should be absent from the mobile tournament layout. Measured ${JSON.stringify(tournamentShowNextFooterState)}.`
    );

    const tournamentStaleInsetState = await tournamentShowNextFloatingCheck.page.evaluate(async () => {
      const button = document.querySelector(".tournament-show-next-button");
      const ballBoy = document.querySelector(".scout-widget");
      const beforeButton = button?.getBoundingClientRect();
      const beforeBallBoy = ballBoy?.getBoundingClientRect();
      document.documentElement.style.setProperty("--visual-viewport-bottom-inset", "180px");
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterButton = button?.getBoundingClientRect();
      const afterBallBoy = ballBoy?.getBoundingClientRect();
      document.documentElement.style.removeProperty("--visual-viewport-bottom-inset");
      return {
        ballBoyShift: beforeBallBoy && afterBallBoy ? Math.round(afterBallBoy.top - beforeBallBoy.top) : null,
        buttonShift: beforeButton && afterButton ? Math.round(afterButton.top - beforeButton.top) : null
      };
    });
    assert(
      tournamentStaleInsetState.buttonShift === 0 && tournamentStaleInsetState.ballBoyShift === 0,
      `A stale or over-reported visual viewport inset must not lift the closed Tournament dock. Measured ${JSON.stringify(tournamentStaleInsetState)}.`
    );

    const traceTournamentDockTransition = async (
      actionSelector,
      durationMs = 620,
      options = {}
    ) =>
      tournamentShowNextFloatingCheck.page.evaluate(
        async ({
          selector,
          duration,
          replacementDelayMs,
          openDelayMs,
          closeDelayMs,
          scrollTargetThenReverse
        }) => {
          const frames = [];
          const startedAt = performance.now();
          let scrollReversed = false;
          const readFrame = () => {
            const button = document.querySelector(".tournament-show-next-button");
            const ballBoy = document.querySelector(".scout-widget");
            const buttonRect = button?.getBoundingClientRect();
            const ballBoyRect = ballBoy?.getBoundingClientRect();
            if (!button || !ballBoy || !buttonRect || !ballBoyRect) {
              return;
            }

            frames.push({
              awareness: ballBoy.classList.contains("is-eye-aware-below"),
              ariaHidden: button.getAttribute("aria-hidden") || "",
              avoidance: ballBoy.classList.contains("has-tournament-show-next"),
              ballBoyTransformDuration: (() => {
                const style = getComputedStyle(ballBoy);
                const properties = style.transitionProperty
                  .split(",")
                  .map((value) => value.trim());
                const durations = style.transitionDuration
                  .split(",")
                  .map((value) => value.trim());
                return durations[properties.indexOf("transform")] || "";
              })(),
              elapsed: Math.round(performance.now() - startedAt),
              disabled: button.disabled,
              gap: Math.round((buttonRect.top - ballBoyRect.bottom) * 10) / 10,
              opacity: Number.parseFloat(getComputedStyle(button).opacity) || 0,
              overlapHeight: Math.max(
                0,
                Math.min(buttonRect.bottom, ballBoyRect.bottom) -
                  Math.max(buttonRect.top, ballBoyRect.top)
              ),
              overlapWidth: Math.max(
                0,
                Math.min(buttonRect.right, ballBoyRect.right) -
                  Math.max(buttonRect.left, ballBoyRect.left)
              ),
              open: ballBoy.classList.contains("is-open"),
              ready: button.classList.contains("is-scout-clearance-ready"),
              replaced: button.dataset.dockTestReplacement === "true",
              releasing: ballBoy.classList.contains(
                "is-releasing-tournament-show-next"
              ),
              rightEdgeDelta: Math.abs(buttonRect.right - ballBoyRect.right),
              scrollReversed,
              targetVisible: button.classList.contains("is-target-visible")
            });
          };

          document
            .querySelector(".tournament-show-next-button")
            ?.removeAttribute("data-dock-test-replacement");
          readFrame();
          if (selector) {
            document.querySelector(selector)?.click();
          }
          if (scrollTargetThenReverse) {
            const button = document.querySelector(".tournament-show-next-button");
            const progression = button?.closest(".tournament-view")?.querySelector(
              ".tournament-progression"
            );
            const target = progression?.querySelector(
              `.progress-match[data-match-number="${CSS.escape(
                button?.dataset.showNextTournamentMatch || ""
              )}"]`
            );
            const progressionRect = progression?.getBoundingClientRect();
            const targetRect = target?.getBoundingClientRect();
            if (progression && progressionRect && targetRect) {
              const nextLeft = Math.max(
                0,
                progression.scrollLeft +
                  targetRect.left -
                  progressionRect.left -
                  (progression.clientWidth - targetRect.width) / 2
              );
              const nextTop = Math.max(
                0,
                progression.scrollTop +
                  targetRect.top -
                  progressionRect.top -
                  (progression.clientHeight - targetRect.height) / 2
              );
              progression.scrollTo({
                behavior: "auto",
                left: nextLeft,
                top: nextTop
              });
              progression.dispatchEvent(new Event("scroll", { bubbles: true }));
            }
          }
          if (Number.isFinite(replacementDelayMs)) {
            window.setTimeout(() => {
              const button = document.querySelector(".tournament-show-next-button");
              if (!button) {
                return;
              }
              const replacement = button.cloneNode(true);
              replacement.dataset.dockTestReplacement = "true";
              button.replaceWith(replacement);
            }, replacementDelayMs);
          }
          if (Number.isFinite(openDelayMs)) {
            window.setTimeout(() => {
              document.querySelector("#scout-launcher")?.click();
            }, openDelayMs);
          }
          if (Number.isFinite(closeDelayMs)) {
            window.setTimeout(() => {
              document.querySelector("#scout-close")?.click();
            }, closeDelayMs);
          }
          while (performance.now() - startedAt < duration) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
            readFrame();
            if (
              scrollTargetThenReverse &&
              !scrollReversed &&
              document
                .querySelector(".scout-widget")
                ?.classList.contains("is-releasing-tournament-show-next")
            ) {
              const progression = document.querySelector(".tournament-progression");
              if (progression) {
                progression.scrollTo({ behavior: "auto", left: 0, top: 0 });
                progression.dispatchEvent(new Event("scroll", { bubbles: true }));
                scrollReversed = true;
              }
            }
          }
          return frames;
        },
        { selector: actionSelector, duration: durationMs, ...options }
      );

    const tournamentDockHideFrames = await traceTournamentDockTransition(
      ".tournament-show-next-button"
    );
    const tournamentDockHideEnd = tournamentDockHideFrames.at(-1);
    const tournamentDockHideVisibleCollisions = tournamentDockHideFrames.filter(
      (frame) =>
        frame.opacity > 0.02 &&
        frame.overlapHeight > 0.5 &&
        frame.overlapWidth > 0.5
    );
    assert(
      tournamentDockHideFrames.length >= 8 &&
        tournamentDockHideFrames.some(
          (frame) => frame.opacity > 0.05 && frame.opacity < 0.95
        ) &&
        tournamentDockHideVisibleCollisions.length === 0 &&
        tournamentDockHideFrames.some(
          (frame) => frame.releasing && frame.ballBoyTransformDuration === "0.18s"
        ) &&
        tournamentDockHideEnd &&
        tournamentDockHideEnd.ariaHidden === "true" &&
        tournamentDockHideEnd.disabled &&
        tournamentDockHideEnd.opacity <= 0.02 &&
        !tournamentDockHideEnd.avoidance &&
        !tournamentDockHideEnd.ready &&
        !tournamentDockHideEnd.releasing,
      `Mobile Show next should finish fading before Ball Boy lowers, with no visible-frame collision. Measured ${JSON.stringify(tournamentDockHideFrames)}.`
    );

    await tournamentShowNextFloatingCheck.page.click("#standings-groups-tab");
    await tournamentShowNextFloatingCheck.page.waitForSelector(
      ".tournament-show-next-button",
      { state: "detached" }
    );
    await tournamentShowNextFloatingCheck.page.waitForFunction(
      () =>
        !document
          .querySelector(".scout-widget")
          ?.classList.contains("has-tournament-show-next")
    );
    const tournamentDockShowFrames = await traceTournamentDockTransition(
      "#standings-tournament-tab",
      800,
      { replacementDelayMs: 45 }
    );
    const tournamentDockShowEnd = tournamentDockShowFrames.at(-1);
    const tournamentDockShowVisibleCollisions = tournamentDockShowFrames.filter(
      (frame) =>
        frame.opacity > 0.02 &&
        frame.overlapHeight > 0.5 &&
        frame.overlapWidth > 0.5
    );
    assert(
      tournamentDockShowFrames.length >= 8 &&
        tournamentDockShowFrames.some(
          (frame) =>
            frame.ariaHidden === "true" &&
            frame.disabled &&
            !frame.ready &&
            frame.opacity <= 0.02 &&
            frame.overlapHeight > 0.5
        ) &&
        tournamentDockShowFrames.some((frame) => frame.awareness) &&
        tournamentDockShowFrames.some(
          (frame) =>
            frame.replaced &&
            !frame.ready &&
            frame.disabled &&
            frame.ariaHidden === "true"
        ) &&
        tournamentDockShowFrames.some(
          (frame) => frame.opacity > 0.05 && frame.opacity < 0.95
        ) &&
        tournamentDockShowVisibleCollisions.length === 0 &&
        tournamentDockShowEnd &&
        tournamentDockShowEnd.ariaHidden === "false" &&
        tournamentDockShowEnd.replaced &&
        !tournamentDockShowEnd.disabled &&
        tournamentDockShowEnd.ready &&
        tournamentDockShowEnd.avoidance &&
        tournamentDockShowEnd.opacity >= 0.98 &&
        tournamentDockShowEnd.gap >= 12 &&
        tournamentDockShowEnd.gap <= 16 &&
        tournamentDockShowEnd.rightEdgeDelta <= 1,
      `Mobile Ball Boy should rise before Show next fades in, keep the downward glance, and never cross a visible CTA. Measured ${JSON.stringify(tournamentDockShowFrames)}.`
    );

    const tournamentDockStableOpenFrames = await traceTournamentDockTransition(
      "#scout-launcher",
      320
    );
    const tournamentDockStableOpenVisibleCollisions =
      tournamentDockStableOpenFrames.filter(
        (frame) =>
          frame.opacity > 0.02 &&
          frame.overlapHeight > 0.5 &&
          frame.overlapWidth > 0.5
      );
    const tournamentDockStableOpenPanelFrames =
      tournamentDockStableOpenFrames.filter((frame) => frame.open);
    const tournamentDockStableOpenEnd = tournamentDockStableOpenFrames.at(-1);
    assert(
      tournamentDockStableOpenPanelFrames.length > 0 &&
        tournamentDockStableOpenPanelFrames.every(
          (frame) =>
            !frame.ready &&
            frame.disabled &&
            frame.ariaHidden === "true"
        ) &&
        tournamentDockStableOpenVisibleCollisions.length === 0 &&
        tournamentDockStableOpenEnd &&
        tournamentDockStableOpenEnd.open &&
        tournamentDockStableOpenEnd.opacity <= 0.02,
      `Opening Ball Boy from the settled mobile dock should conceal Show next before the panel expands. Measured ${JSON.stringify(tournamentDockStableOpenFrames)}.`
    );

    const tournamentDockStableCloseFrames = await traceTournamentDockTransition(
      "#scout-close",
      900,
      { replacementDelayMs: 120 }
    );
    const tournamentDockStableCloseEnd = tournamentDockStableCloseFrames.at(-1);
    const tournamentDockStableCloseFirstAuthorizedFrame =
      tournamentDockStableCloseFrames.find(
        (frame) =>
          !frame.open &&
          frame.ready &&
          !frame.disabled &&
          frame.ariaHidden === "false"
      );
    const tournamentDockStableCloseVisibleCollisions =
      tournamentDockStableCloseFrames.filter(
        (frame) =>
          frame.ready &&
          !frame.open &&
          frame.opacity > 0.02 &&
          frame.overlapHeight > 0.5 &&
          frame.overlapWidth > 0.5
      );
    assert(
      tournamentDockStableCloseFrames.some((frame) => frame.replaced) &&
        tournamentDockStableCloseFirstAuthorizedFrame?.elapsed >= 420 &&
        tournamentDockStableCloseVisibleCollisions.length === 0 &&
        tournamentDockStableCloseEnd &&
        !tournamentDockStableCloseEnd.open &&
        tournamentDockStableCloseEnd.ready &&
        !tournamentDockStableCloseEnd.disabled &&
        tournamentDockStableCloseEnd.ariaHidden === "false" &&
        tournamentDockStableCloseEnd.opacity >= 0.98 &&
        tournamentDockStableCloseEnd.gap >= 12 &&
        tournamentDockStableCloseEnd.gap <= 16,
      `A CTA replacement while Ball Boy closes should preserve the full panel-clearance deadline. Measured ${JSON.stringify(tournamentDockStableCloseFrames)}.`
    );

    const tournamentDockScrollReversalFrames = await traceTournamentDockTransition(
      "",
      950,
      { scrollTargetThenReverse: true }
    );
    const tournamentDockScrollReversalEnd =
      tournamentDockScrollReversalFrames.at(-1);
    const tournamentDockScrollReversalVisibleCollisions =
      tournamentDockScrollReversalFrames.filter(
        (frame) =>
          frame.opacity > 0.02 &&
          frame.overlapHeight > 0.5 &&
          frame.overlapWidth > 0.5
      );
    assert(
      tournamentDockScrollReversalFrames.some((frame) => frame.targetVisible) &&
        tournamentDockScrollReversalFrames.some((frame) => frame.releasing) &&
        tournamentDockScrollReversalFrames.some((frame) => frame.scrollReversed) &&
        tournamentDockScrollReversalVisibleCollisions.length === 0 &&
        tournamentDockScrollReversalEnd &&
        tournamentDockScrollReversalEnd.scrollReversed &&
        !tournamentDockScrollReversalEnd.targetVisible &&
        tournamentDockScrollReversalEnd.ready &&
        !tournamentDockScrollReversalEnd.disabled &&
        tournamentDockScrollReversalEnd.ariaHidden === "false" &&
        tournamentDockScrollReversalEnd.opacity >= 0.98 &&
        tournamentDockScrollReversalEnd.gap >= 12 &&
        tournamentDockScrollReversalEnd.gap <= 16,
      `A real Tournament-board scroll reversal while Ball Boy lowers should return the dock without a visible crossing. Measured ${JSON.stringify(tournamentDockScrollReversalFrames)}.`
    );

    await tournamentShowNextFloatingCheck.page.click("#standings-groups-tab");
    await tournamentShowNextFloatingCheck.page.waitForSelector(
      ".tournament-show-next-button",
      { state: "detached" }
    );
    await tournamentShowNextFloatingCheck.page.waitForFunction(
      () =>
        !document
          .querySelector(".scout-widget")
          ?.classList.contains("has-tournament-show-next")
    );
    const tournamentDockInterruptedShowFrames = await traceTournamentDockTransition(
      "#standings-tournament-tab",
      1100,
      { openDelayMs: 50, closeDelayMs: 100 }
    );
    const tournamentDockInterruptedShowEnd =
      tournamentDockInterruptedShowFrames.at(-1);
    const tournamentDockInterruptedVisibleCollisions =
      tournamentDockInterruptedShowFrames.filter(
        (frame) =>
          frame.ready &&
          !frame.open &&
          frame.opacity > 0.02 &&
          frame.overlapHeight > 0.5 &&
          frame.overlapWidth > 0.5
      );
    const tournamentDockInterruptedOpenFrames =
      tournamentDockInterruptedShowFrames.filter((frame) => frame.open);
    assert(
      tournamentDockInterruptedOpenFrames.length > 0 &&
        tournamentDockInterruptedOpenFrames.every(
          (frame) =>
            !frame.ready &&
            frame.disabled &&
            frame.ariaHidden === "true" &&
            frame.opacity <= 0.02
        ) &&
        tournamentDockInterruptedVisibleCollisions.length === 0 &&
        tournamentDockInterruptedShowEnd &&
        !tournamentDockInterruptedShowEnd.open &&
        tournamentDockInterruptedShowEnd.ready &&
        !tournamentDockInterruptedShowEnd.disabled &&
        tournamentDockInterruptedShowEnd.ariaHidden === "false" &&
        tournamentDockInterruptedShowEnd.opacity >= 0.98 &&
        tournamentDockInterruptedShowEnd.gap >= 12 &&
        tournamentDockInterruptedShowEnd.gap <= 16,
      `Opening and closing Ball Boy during the mobile lift should restart clearance before Show next returns. Measured ${JSON.stringify(tournamentDockInterruptedShowFrames)}.`
    );

    await tournamentShowNextFloatingCheck.page.click("#matches-tab");
    await tournamentShowNextFloatingCheck.page.waitForTimeout(80);
    const ballBoyAfterTournamentState = await tournamentShowNextFloatingCheck.page.evaluate(() => {
      const ballBoy = document.querySelector(".scout-widget");
      const rect = ballBoy?.getBoundingClientRect();
      return {
        bottomGap: rect ? Math.round(window.innerHeight - rect.bottom) : null,
        hasAvoidance: Boolean(ballBoy?.classList.contains("has-tournament-show-next")),
        obstacleTranslateY:
          ballBoy?.style.getPropertyValue("--scout-obstacle-translate-y") || "",
        standingsHidden: Boolean(document.querySelector("#standings-view")?.hidden)
      };
    });
    assert(
        ballBoyAfterTournamentState.standingsHidden &&
        !ballBoyAfterTournamentState.hasAvoidance &&
        ballBoyAfterTournamentState.obstacleTranslateY === "" &&
        ballBoyAfterTournamentState.bottomGap >= 10 &&
        ballBoyAfterTournamentState.bottomGap <= 14,
      `Closed Ball Boy should snap back to its normal mobile bottom edge as soon as Tournament is hidden. Measured ${JSON.stringify(ballBoyAfterTournamentState)}.`
    );

    await tournamentShowNextFloatingCheck.page.click("#scout-launcher");
    await tournamentShowNextFloatingCheck.page.waitForSelector(".scout-widget.is-open");
    await tournamentShowNextFloatingCheck.page.evaluate(() => {
      Object.defineProperty(window, "visualViewport", {
        configurable: true,
        value: {
          addEventListener() {},
          removeEventListener() {},
          get height() {
            return Math.max(0, window.innerHeight - 112);
          },
          get offsetTop() {
            return 0;
          },
          get pageLeft() {
            return window.scrollX;
          },
          get pageTop() {
            return window.scrollY;
          },
          get scale() {
            return 1;
          },
          get width() {
            return window.innerWidth;
          }
        }
      });
      window.dispatchEvent(new Event("resize"));
    });
    await tournamentShowNextFloatingCheck.page.waitForFunction(() => {
      const ballBoy = document.querySelector(".scout-widget");
      return (
        Number.parseFloat(ballBoy?.style.getPropertyValue("--scout-visual-bottom-inset") || "0") >= 100
      );
    });
    const ballBoyOpenViewportState = await tournamentShowNextFloatingCheck.page.evaluate(() => {
      const ballBoy = document.querySelector(".scout-widget");
      return {
        innerHeight: window.innerHeight,
        visualHeight: window.visualViewport?.height || 0,
        visualOffsetTop: window.visualViewport?.offsetTop || 0,
        visualBottomInset: Math.round(
          Number.parseFloat(
            ballBoy?.style.getPropertyValue("--scout-visual-bottom-inset") || "0"
          ) || 0
        )
      };
    });
    assert(
      ballBoyOpenViewportState.visualBottomInset >= 100,
      `Open mobile Ball Boy should still follow the reduced visual viewport. Measured ${JSON.stringify(ballBoyOpenViewportState)}.`
    );

    await tournamentShowNextFloatingCheck.page.click("#scout-close");
    await tournamentShowNextFloatingCheck.page.waitForTimeout(80);
    const ballBoyAfterCloseState = await tournamentShowNextFloatingCheck.page.evaluate(() => {
      const ballBoy = document.querySelector(".scout-widget");
      const rect = ballBoy?.getBoundingClientRect();
      return {
        bottomGap: rect ? Math.round(window.innerHeight - rect.bottom) : null,
        isKeyboardOpen: Boolean(ballBoy?.classList.contains("is-keyboard-open")),
        isOpen: Boolean(ballBoy?.classList.contains("is-open")),
        visualBottomInset:
          ballBoy?.style.getPropertyValue("--scout-visual-bottom-inset") || "",
        visualHeight: ballBoy?.style.getPropertyValue("--scout-visual-height") || ""
      };
    });
    assert(
      !ballBoyAfterCloseState.isOpen &&
        !ballBoyAfterCloseState.isKeyboardOpen &&
        ballBoyAfterCloseState.visualBottomInset === "" &&
        ballBoyAfterCloseState.visualHeight === "" &&
        ballBoyAfterCloseState.bottomGap >= 10 &&
        ballBoyAfterCloseState.bottomGap <= 14,
      `Closed Ball Boy should immediately discard the mobile visual-viewport offset. Measured ${JSON.stringify(ballBoyAfterCloseState)}.`
    );

    await tournamentShowNextFloatingCheck.page.setViewportSize({
      width: 844,
      height: 390
    });
    await tournamentShowNextFloatingCheck.page.click("#standings-tab");
    await tournamentShowNextFloatingCheck.page.waitForSelector(
      ".tournament-show-next-button.is-scout-clearance-ready"
    );
    const tournamentLandscapeDockState =
      await tournamentShowNextFloatingCheck.page.evaluate(() => {
        const button = document.querySelector(".tournament-show-next-button");
        const ballBoy = document.querySelector(".scout-widget");
        const buttonRect = button?.getBoundingClientRect();
        const ballBoyRect = ballBoy?.getBoundingClientRect();
        return {
          gap:
            buttonRect && ballBoyRect
              ? Math.round((buttonRect.top - ballBoyRect.bottom) * 10) / 10
              : null,
          mobileDock: window.matchMedia(
            "(max-width: 560px), (max-width: 900px) and (pointer: coarse)"
          ).matches,
          rightEdgeDelta:
            buttonRect && ballBoyRect
              ? Math.abs(buttonRect.right - ballBoyRect.right)
              : null
        };
      });
    assert(
      tournamentLandscapeDockState.mobileDock &&
        tournamentLandscapeDockState.gap >= 12 &&
        tournamentLandscapeDockState.gap <= 16 &&
        tournamentLandscapeDockState.rightEdgeDelta <= 1,
      `A coarse-pointer phone in short landscape should keep the same ordered Tournament dock. Measured ${JSON.stringify(tournamentLandscapeDockState)}.`
    );
    await tournamentShowNextFloatingCheck.context.close();

    const tournamentReducedMotionCheck = await openPageAtTime(
      beforeKnockoutKickoff.toISOString(),
      "/?view=standings&standingsMode=tournament&tz=America%2FLos_Angeles",
      {
        contextOptions: {
          hasTouch: true,
          isMobile: true,
          reducedMotion: "reduce",
          viewport: { width: 390, height: 844 }
        },
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
    await tournamentReducedMotionCheck.page.waitForSelector(
      ".tournament-show-next-button.is-scout-clearance-ready"
    );
    const tournamentReducedMotionState = await tournamentReducedMotionCheck.page.evaluate(() => {
      const button = document.querySelector(".tournament-show-next-button");
      const ballBoy = document.querySelector(".scout-widget");
      return {
        awareness: ballBoy?.classList.contains("is-eye-aware-below") || false,
        ballBoyDurations: ballBoy
          ? getComputedStyle(ballBoy).transitionDuration.split(",").map((value) => value.trim())
          : [],
        buttonDurations: button
          ? getComputedStyle(button).transitionDuration.split(",").map((value) => value.trim())
          : [],
        reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      };
    });
    assert(
      tournamentReducedMotionState.reduced &&
        !tournamentReducedMotionState.awareness &&
        tournamentReducedMotionState.ballBoyDurations.every(
          (duration) => duration === "0.001s"
        ) &&
        tournamentReducedMotionState.buttonDurations.every(
          (duration) => duration === "0s"
        ),
      `Reduced-motion Tournament controls should settle effectively immediately without the eye sequence. Measured ${JSON.stringify(tournamentReducedMotionState)}.`
    );
    await tournamentReducedMotionCheck.page.click(".tournament-show-next-button");
    await tournamentReducedMotionCheck.page.waitForTimeout(40);
    const tournamentReducedMotionHiddenState =
      await tournamentReducedMotionCheck.page.evaluate(() => {
        const button = document.querySelector(".tournament-show-next-button");
        const ballBoy = document.querySelector(".scout-widget");
        return {
          awareness: ballBoy?.classList.contains("is-eye-aware-below") || false,
          avoidance: ballBoy?.classList.contains("has-tournament-show-next") || false,
          buttonClass: button?.className || "",
          controllerReady: document.documentElement.classList.contains(
            "has-scout-tournament-dock-controller"
          ),
          innerWidth: window.innerWidth,
          mobile: window.matchMedia("(max-width: 560px)").matches,
          opacity: Number.parseFloat(button ? getComputedStyle(button).opacity : "1"),
          ready: button?.classList.contains("is-scout-clearance-ready") || false
        };
      });
    assert(
      !tournamentReducedMotionHiddenState.awareness &&
        !tournamentReducedMotionHiddenState.avoidance &&
        tournamentReducedMotionHiddenState.opacity <= 0.02 &&
        !tournamentReducedMotionHiddenState.ready,
      `Reduced-motion Show next should hide and release Ball Boy immediately. Measured ${JSON.stringify(tournamentReducedMotionHiddenState)}.`
    );
    await tournamentReducedMotionCheck.context.close();

    const tournamentDelayedCheckTime = new Date(
      new Date(nextKnockoutKickoffUtc).getTime() + 5 * 60 * 1000
    );
    const tournamentDelayedMatchNumber = String(nextScheduledKnockoutFixture.matchNumber);
    const tournamentDelayedCheck = await openPageAtTime(
      tournamentDelayedCheckTime.toISOString(),
      "/?view=standings&standingsMode=tournament&tz=America%2FLos_Angeles",
      {
        fixtureTransform(data) {
          for (const fixture of data.fixtures || []) {
            if (fixture.status === "LIVE") {
              fixture.status = "FT";
              fixture.score ||= { home: 0, away: 0 };
            }

            if (fixture.id === nextScheduledKnockoutFixture.id) {
              fixture.status = "DELAYED";
              delete fixture.officialMatchAddedTime;
              delete fixture.officialMatchPhase;
              delete fixture.officialMatchTime;
              delete fixture.officialMatchTimeUpdatedAt;
              delete fixture.score;
              delete fixture.scoreDetails;
              delete fixture.scoreUpdatedAt;
            }
          }
        }
      }
    );
    await tournamentDelayedCheck.page.waitForSelector(
      `.progress-match[data-match-number="${tournamentDelayedMatchNumber}"] .tournament-delayed-pill`
    );
    const tournamentDelayedState = await tournamentDelayedCheck.page.evaluate((matchNumber) => {
      const card = document.querySelector(`.progress-match[data-match-number="${matchNumber}"]`);
      const header = card?.querySelector(".knockout-match-header");
      const pill = card?.querySelector(".tournament-delayed-pill");
      const cardRect = card?.getBoundingClientRect();
      const pillRect = pill?.getBoundingClientRect();

      return {
        cardIsDelayed: card?.classList.contains("is-delayed") || false,
        delayedCount: card?.querySelectorAll(".tournament-delayed-pill").length || 0,
        headerHasDelayed: header?.classList.contains("has-delayed") || false,
        headerOverflow: header ? header.scrollWidth - header.clientWidth : null,
        label: pill?.textContent.replace(/\s+/g, " ").trim() || "",
        liveCount: card?.querySelectorAll(".tournament-live-pill").length || 0,
        rightGap: cardRect && pillRect ? Math.round(cardRect.right - pillRect.right) : null,
        upNextCount: card?.querySelectorAll(".tournament-up-next-pill").length || 0
      };
    }, tournamentDelayedMatchNumber);
    assert(
      tournamentDelayedState.cardIsDelayed &&
        tournamentDelayedState.headerHasDelayed &&
        tournamentDelayedState.delayedCount === 1 &&
        tournamentDelayedState.liveCount === 0 &&
        tournamentDelayedState.upNextCount === 0 &&
        tournamentDelayedState.label === "Delayed" &&
        tournamentDelayedState.headerOverflow <= 1 &&
        tournamentDelayedState.rightGap >= 6 &&
        tournamentDelayedState.rightGap <= 12,
      `Tournament cards should show a delayed kickoff as Delayed, not Live or Up next. Measured ${JSON.stringify(tournamentDelayedState)}.`
    );
    await tournamentDelayedCheck.context.close();

    const tournamentLiveCheckTime = new Date(
      new Date(nextKnockoutKickoffUtc).getTime() + 5 * 60 * 1000
    );
    const tournamentLiveTooltipCheckedAt = new Date(
      new Date(nextKnockoutKickoffUtc).getTime() + 2 * 60 * 1000
    );
    const tournamentLiveMatchNumber = String(nextScheduledKnockoutFixture.matchNumber);
    const tournamentLiveTooltipCheck = await openPageAtTime(
      tournamentLiveCheckTime.toISOString(),
      "/?view=standings&standingsMode=tournament&tz=America%2FLos_Angeles",
      {
        contextOptions: { hasTouch: true },
        fixtureTransform(data) {
          for (const fixture of data.fixtures || []) {
            if (fixture.status === "LIVE") {
              fixture.status = "FT";
              fixture.score ||= { home: 0, away: 0 };
            }

            if (fixture.id === nextScheduledKnockoutFixture.id) {
              fixture.officialMatchTime = "5'";
              fixture.officialMatchTimeUpdatedAt = tournamentLiveTooltipCheckedAt.toISOString();
            }
          }
        }
      }
    );
    const tournamentLivePillSelector = `.progress-match[data-match-number="${tournamentLiveMatchNumber}"] .tournament-live-pill`;
    const tournamentLivePill = tournamentLiveTooltipCheck.page.locator(tournamentLivePillSelector);
    await tournamentLivePill.waitFor({ state: "attached" });
    await tournamentLiveTooltipCheck.page.waitForFunction(async (selector) => {
      const pill = document.querySelector(selector);
      if (!pill) {
        return false;
      }
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      );
      return pill === document.querySelector(selector);
    }, tournamentLivePillSelector);
    const tournamentLiveTooltipContent = await tournamentLivePill.evaluate(
      (pill) => getComputedStyle(pill, "::after").content
    );
    assert(
      tournamentLiveTooltipContent.includes("FIFA snapshot"),
      `Tournament live pill should expose FIFA snapshot tooltip text. Measured content ${tournamentLiveTooltipContent}.`
    );
    const tournamentPageCountBeforeLiveClick = tournamentLiveTooltipCheck.context.pages().length;
    const tournamentUrlBeforeLiveClick = tournamentLiveTooltipCheck.page.url();
    await tournamentLivePill.tap();
    await tournamentLiveTooltipCheck.page.waitForFunction((selector) => {
      const pill = document.querySelector(selector);
      const styles = pill ? getComputedStyle(pill, "::after") : null;
      return (
        pill?.classList.contains("is-touch-tooltip-open") &&
        styles?.content.includes("FIFA snapshot")
      );
    }, tournamentLivePillSelector);
    const tournamentLiveTooltipState = await tournamentLiveTooltipCheck.page.evaluate((selector) => {
      const pill = document.querySelector(selector);
      const header = pill?.closest(".knockout-match-header");
      const card = pill?.closest(".progress-match");
      const styles = pill ? getComputedStyle(pill, "::after") : null;
      const parsePx = (value) => Number.parseFloat(value) || 0;
      const parseZIndex = (element) => {
        const value = element ? getComputedStyle(element).zIndex : "";
        const number = Number.parseInt(value, 10);
        return Number.isFinite(number) ? number : 0;
      };
      const getTransform = (value) => {
        if (!value || value === "none") {
          return { x: 0, y: 0 };
        }

        const match = value.match(/^matrix\((.+)\)$/);
        if (!match) {
          return { x: 0, y: 0 };
        }

        const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
        return {
          x: Number.isFinite(parts[4]) ? parts[4] : 0,
          y: Number.isFinite(parts[5]) ? parts[5] : 0
        };
      };
      const getTooltipRect = (element, style) => {
        if (!element || !style) {
          return null;
        }

        const rect = element.getBoundingClientRect();
        const transform = getTransform(style.transform);
        const width =
          parsePx(style.width) +
          parsePx(style.paddingLeft) +
          parsePx(style.paddingRight) +
          parsePx(style.borderLeftWidth) +
          parsePx(style.borderRightWidth);
        const height =
          parsePx(style.height) +
          parsePx(style.paddingTop) +
          parsePx(style.paddingBottom) +
          parsePx(style.borderTopWidth) +
          parsePx(style.borderBottomWidth);

        if (!width || !height) {
          return null;
        }

        const left =
          style.left !== "auto"
            ? rect.left + parsePx(style.left) + transform.x
            : rect.right - parsePx(style.right) - width + transform.x;
        const top =
          style.top !== "auto"
            ? rect.top + parsePx(style.top) + transform.y
            : rect.bottom - parsePx(style.bottom) - height + transform.y;

        return {
          bottom: top + height,
          left,
          right: left + width,
          top
        };
      };
      const tooltipRect = getTooltipRect(pill, styles);
      const overlappingCards =
        card && tooltipRect
          ? [...document.querySelectorAll(".progress-match:not(.tournament-loading-match)")].filter((otherCard) => {
              if (otherCard === card) {
                return false;
              }

              const rect = otherCard.getBoundingClientRect();
              return (
                tooltipRect.left < rect.right &&
                tooltipRect.right > rect.left &&
                tooltipRect.top < rect.bottom &&
                tooltipRect.bottom > rect.top
              );
            })
          : [];
      const overlappingCardZIndexes = overlappingCards.map(parseZIndex);

      return {
        ariaLabel: pill?.getAttribute("aria-label") || "",
        cardZIndex: parseZIndex(card),
        href: pill?.getAttribute("href"),
        headerHasLive: header?.classList.contains("has-live") || false,
        label: pill?.textContent.replace(/\s+/g, " ").trim() || "",
        maxOverlappingCardZIndex: Math.max(0, ...overlappingCardZIndexes),
        overlappingCardCount: overlappingCards.length,
        overlappingCardNumbers: overlappingCards.map((overlappingCard) => overlappingCard.dataset.matchNumber || ""),
        role: pill?.getAttribute("role") || "",
        tabindex: pill?.getAttribute("tabindex") || "",
        title: pill?.getAttribute("title"),
        tooltip: pill?.getAttribute("data-tooltip") || "",
        tooltipContent: styles?.content || "",
        tooltipOpacity: styles ? Number(styles.opacity) : 0,
        tooltipRect: tooltipRect
          ? {
              bottom: Math.round(tooltipRect.bottom),
              left: Math.round(tooltipRect.left),
              right: Math.round(tooltipRect.right),
              top: Math.round(tooltipRect.top)
            }
          : null
      };
    }, tournamentLivePillSelector);
    assert(
      tournamentLiveTooltipState.headerHasLive &&
        tournamentLiveTooltipCheck.context.pages().length === tournamentPageCountBeforeLiveClick &&
        tournamentLiveTooltipCheck.page.url() === tournamentUrlBeforeLiveClick &&
        tournamentLiveTooltipState.href === null &&
        tournamentLiveTooltipState.label === "5'" &&
        tournamentLiveTooltipState.role === "button" &&
        tournamentLiveTooltipState.tabindex === "0" &&
        tournamentLiveTooltipState.title === null &&
        tournamentLiveTooltipState.tooltip === "FIFA snapshot: 5' · checked 3 min ago" &&
        tournamentLiveTooltipState.ariaLabel === "Live: FIFA snapshot: 5' · checked 3 min ago" &&
        tournamentLiveTooltipState.tooltipContent.replace(/^"|"$/g, "").includes("FIFA snapshot: 5") &&
        tournamentLiveTooltipState.cardZIndex > tournamentLiveTooltipState.maxOverlappingCardZIndex,
      `Tournament-card Live pills should expose the same official match-time tooltip on hover and click without linking away. Measured ${JSON.stringify(tournamentLiveTooltipState)}.`
    );
    await tournamentLiveTooltipCheck.context.close();
  }

  const catchUpCheck = await openPageAtTime(
    "2026-06-18T05:30:00.000Z",
    "/?view=matches&date=2026-06-17&tz=America%2FLos_Angeles",
    { desktopPointerMedia: true }
  );
  const immediateCatchUpOpenState = await catchUpCheck.page.locator("#catch-up-button").evaluate((button) => {
    button.click();
    const popover = document.querySelector("#catch-up-popover");
    const list = document.querySelector("#catch-up-list");

    return {
      expanded: button.getAttribute("aria-expanded"),
      hidden: popover?.classList.contains("is-hidden"),
      loadingItems: list?.querySelectorAll(".catch-up-loading-item").length || 0,
      busy: list?.getAttribute("aria-busy"),
      realItems: list?.querySelectorAll(".catch-up-item:not(.catch-up-loading-item)").length || 0
    };
  });
  assert(
    immediateCatchUpOpenState.expanded === "true" &&
      immediateCatchUpOpenState.hidden === false &&
      immediateCatchUpOpenState.loadingItems === 3 &&
      immediateCatchUpOpenState.busy === "true" &&
      immediateCatchUpOpenState.realItems === 0,
    `Opening catch-up should show the skeleton immediately before rendering news. Measured ${JSON.stringify(immediateCatchUpOpenState)}.`
  );
  await waitForCatchUpItems(catchUpCheck.page);
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
  assert((await catchUpKaneLink.count()) === 1, "Catch-up player mentions should become player-card triggers.");
  await assertPlayerCardTriggersStayInternal(
    catchUpCheck.page.locator("#catch-up-popover"),
    "Catch-up player-card triggers should not navigate to Wikipedia or other source pages."
  );
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
  await catchUpKaneLink.focus();
  await catchUpCheck.page.waitForFunction(() => {
    const card = document.querySelector(".player-card-floating");
    const styles = card ? getComputedStyle(card) : null;
    const box = card?.getBoundingClientRect();
    return Boolean(
      card &&
        card.classList.contains("is-visible") &&
        styles &&
        styles.display !== "none" &&
        styles.visibility !== "hidden" &&
        box &&
        box.width > 0 &&
        box.height > 0
    );
  });
  const catchUpKaneCardState = await catchUpCheck.page.evaluate(() => {
    const activeLink = document.activeElement?.closest?.(".player-link");
    const card = document.querySelector(".player-card-floating");
    const styles = card ? getComputedStyle(card) : null;
    const box = card?.getBoundingClientRect();

    return {
      ariaHidden: card?.getAttribute("aria-hidden") || "",
      box: box
        ? {
            height: box.height,
            width: box.width,
            x: box.x,
            y: box.y
          }
        : null,
      className: card?.className || "",
      activeLinkText: activeLink?.textContent.trim() || "",
      text: card?.textContent?.replace(/\s+/g, " ").trim().slice(0, 160) || "",
      visible: Boolean(
        card &&
          card.classList.contains("is-visible") &&
          styles &&
          styles.display !== "none" &&
          styles.visibility !== "hidden" &&
          box &&
          box.width > 0 &&
          box.height > 0
      ),
      viewport: {
        height: window.innerHeight,
        width: window.innerWidth
      }
    };
  });
  const catchUpKaneCardBox = catchUpKaneCardState.box;
  const catchUpViewport = catchUpKaneCardState.viewport;
  assert(
    catchUpKaneCardState.visible &&
    catchUpKaneCardBox &&
      catchUpViewport &&
      catchUpKaneCardBox.x >= 0 &&
      catchUpKaneCardBox.y >= 0 &&
      catchUpKaneCardBox.x + catchUpKaneCardBox.width <= catchUpViewport.width &&
      catchUpKaneCardBox.y + catchUpKaneCardBox.height <= catchUpViewport.height,
    `Catch-up player cards should be placed within the viewport. Measured ${JSON.stringify(catchUpKaneCardState)}.`
  );
  await catchUpCheck.page.locator("#settings-button").click();
  await catchUpCheck.page.locator("#language-select").selectOption("zh");
  await openCatchUp(catchUpCheck.page);
  const catchUpChineseLinks = await catchUpCheck.page
    .locator(".catch-up-subtitle .player-link")
    .evaluateAll((links) => links.map((link) => link.textContent.trim()));
  assert(
    catchUpChineseLinks.includes("哈里·凯恩") && catchUpChineseLinks.includes("若昂·内维斯"),
    "Chinese catch-up player mentions should use localized player-card triggers."
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
  await openCatchUp(latestCatchUpCheck.page);
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
  const rangelCatchUpLink = latestCatchUpCheck.page
    .locator(".catch-up-item", { hasText: "Mexico narrowly beat South Korea" })
    .locator(".catch-up-subtitle .player-link", { hasText: "Raúl Rangel" })
    .first();
  const rangelCatchUpDecoration = await rangelCatchUpLink.evaluate((link) => {
    const styles = getComputedStyle(link);
    return {
      line: styles.textDecorationLine,
      style: styles.textDecorationStyle
    };
  });
  assert(
    (await rangelCatchUpLink.count()) === 1 &&
      rangelCatchUpDecoration.line.includes("underline") &&
      rangelCatchUpDecoration.style === "dotted",
    `Catch Up should link lineup-only player mentions such as Raúl Rangel with the shared dotted underline. Measured ${JSON.stringify(rangelCatchUpDecoration)}.`
  );
  await latestCatchUpCheck.context.close();

  const tournamentCatchUpCheck = await openPageAtTime(
    "2026-06-23T02:08:00.000Z",
    "/?view=matches&date=2026-06-22&tz=America%2FLos_Angeles"
  );
  await openCatchUp(tournamentCatchUpCheck.page);
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
  const tournamentMessiLink = tournamentCatchUpCheck.page
    .locator(".catch-up-item", { hasText: "Messi leads all scorers" })
    .locator(".catch-up-subtitle .player-link", { hasText: "Lionel Messi" })
    .first();
  const tournamentMessiDecoration = await tournamentMessiLink.evaluate((link) => {
    const styles = getComputedStyle(link);
    return {
      line: styles.textDecorationLine,
      style: styles.textDecorationStyle
    };
  });
  assert(
    (await tournamentMessiLink.count()) === 1 &&
      tournamentMessiDecoration.line.includes("underline") &&
      tournamentMessiDecoration.style === "dotted",
    `Tournament-level Catch Up player mentions should remain linked and dotted-underlined. Measured ${JSON.stringify(tournamentMessiDecoration)}.`
  );
  await tournamentCatchUpCheck.page.locator("#settings-button").click();
  await tournamentCatchUpCheck.page.locator("#language-select").selectOption("zh");
  await openCatchUp(tournamentCatchUpCheck.page);
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

  const quietDayCatchUpCheck = await openPageAtTime(
    "2026-07-13T19:00:00.000Z",
    "/?view=matches&date=2026-07-13&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const finalFixture = (data.fixtures || []).find(
          (fixture) => Number(fixture.matchNumber) === 104
        );
        if (finalFixture) {
          finalFixture.status = "SCHEDULED";
          delete finalFixture.score;
          delete finalFixture.goalsHome;
          delete finalFixture.goalsAway;
        }
      },
      tournamentTransform(data) {
        delete data.awards;
      }
    }
  );
  await openCatchUp(quietDayCatchUpCheck.page);
  const quietDayCatchUpItem = await quietDayCatchUpCheck.page.locator(".catch-up-item").evaluate((item) => {
    const visibleText = (node) => {
      const clone = node?.cloneNode(true);
      clone?.querySelectorAll(".player-card").forEach((card) => card.remove());
      return clone?.textContent.replace(/\s+/g, " ").trim() || "";
    };

    return {
      count: document.querySelectorAll(".catch-up-item").length,
      headline: visibleText(item.querySelector(".catch-up-title-row h3 > span")),
      sourceHref: item.querySelector(".catch-up-source")?.getAttribute("href") || "",
      subtitle: visibleText(item.querySelector(".catch-up-subtitle"))
    };
  });
  assert(
      quietDayCatchUpItem.count === 1 &&
      quietDayCatchUpItem.headline ===
        "Kylian Mbappe leads the Golden Boot race with 10 goals" &&
      quietDayCatchUpItem.subtitle.includes("Kylian Mbappe has 10 goals") &&
      quietDayCatchUpItem.subtitle.includes("Lionel Messi is next on 8") &&
      quietDayCatchUpItem.subtitle.includes("Jude Bellingham and Erling Haaland on 7") &&
      quietDayCatchUpItem.sourceHref.includes("fifa.com"),
    `A tournament rest day should replace the empty state with one sourced Golden Boot story. Measured ${JSON.stringify(quietDayCatchUpItem)}.`
  );
  await quietDayCatchUpCheck.page.locator("#settings-button").click();
  await quietDayCatchUpCheck.page.locator("#language-select").selectOption("zh");
  await openCatchUp(quietDayCatchUpCheck.page);
  const quietDayChineseText = await quietDayCatchUpCheck.page.locator("#catch-up-popover").evaluate((popover) => {
    const clone = popover.cloneNode(true);
    clone.querySelectorAll(".player-card").forEach((card) => card.remove());
    return clone.textContent.replace(/\s+/g, " ").trim();
  });
  assert(
    quietDayChineseText.includes("基利安·姆巴佩以10球领跑金靴奖竞争") &&
      quietDayChineseText.includes("基利安·姆巴佩以10球领跑") &&
      quietDayChineseText.includes("利昂内尔·梅西以8球紧随其后") &&
      quietDayChineseText.includes("裘德·贝林厄姆和埃尔林·哈兰德同为7球") &&
      !/Golden Boot|goals|next on/i.test(quietDayChineseText),
    `The generated rest-day Golden Boot story should be fully bilingual. Measured ${quietDayChineseText}.`
  );
  await quietDayCatchUpCheck.context.close();

  const completeMockTournamentFixtures = (data) => {
    const resultsByMatchNumber = new Map([
      [101, { homeTeamId: "FRA", awayTeamId: "ESP", score: { home: 2, away: 1 }, goalsHome: [{ name: "Kylian Mbappe", minute: 31 }, { name: "Ousmane Dembele", minute: 74 }], goalsAway: [{ name: "Mikel Oyarzabal", minute: 58 }] }],
      [102, { homeTeamId: "ENG", awayTeamId: "ARG", score: { home: 1, away: 2 }, goalsHome: [{ name: "Harry Kane", minute: 44 }], goalsAway: [{ name: "Lionel Messi", minute: 18 }, { name: "Lionel Messi", minute: 82 }] }],
      [103, { homeTeamId: "ESP", awayTeamId: "ENG", score: { home: 1, away: 0 }, goalsHome: [{ name: "Mikel Oyarzabal", minute: 67 }], goalsAway: [] }],
      [104, { homeTeamId: "FRA", awayTeamId: "ARG", score: { home: 1, away: 0 }, goalsHome: [{ name: "Kylian Mbappe", minute: 63 }], goalsAway: [] }]
    ]);

    for (const fixture of data.fixtures || []) {
      const result = resultsByMatchNumber.get(Number(fixture.matchNumber));
      if (!result) {
        continue;
      }
      Object.assign(fixture, result, { status: "FT" });
    }
  };
  const confirmMockGoldenBootAward = (data) => {
    data.awards = {
      ...(data.awards || {}),
      goldenBoot: {
        assists: 4,
        goals: 10,
        playerName: "Kylian Mbappe",
        sourceId: "fifa-official-results-sync-2026-07-12",
        status: "confirmed"
      }
    };
  };

  const finalDayCatchUpCheck = await openPageAtTime(
    "2026-07-19T23:00:00.000Z",
    "/?view=matches&date=2026-07-19&tz=America%2FLos_Angeles",
    {
      fixtureTransform: completeMockTournamentFixtures,
      tournamentTransform: confirmMockGoldenBootAward
    }
  );
  await openCatchUp(finalDayCatchUpCheck.page);
  const finalDayCatchUpHeadlines = await finalDayCatchUpCheck.page
    .locator(".catch-up-title-row h3 > span")
    .allTextContents();
  assert(
    finalDayCatchUpHeadlines[0]?.trim() === "France win the World Cup" &&
      finalDayCatchUpHeadlines.some((headline) => headline.trim() === "Kylian Mbappe wins the Golden Boot") &&
      finalDayCatchUpHeadlines.some((headline) => headline.includes("The 2026 World Cup: 104 matches")) &&
      !finalDayCatchUpHeadlines.some((headline) => headline.includes("are 2026 world champions")),
    `Immediately after the final, Catch Up should lead with the match recap and add the confirmed award without duplicating the champion story. Measured ${JSON.stringify(finalDayCatchUpHeadlines)}.`
  );
  await finalDayCatchUpCheck.context.close();

  const postTournamentCatchUpCheck = await openPageAtTime(
    "2026-08-01T19:00:00.000Z",
    "/?view=matches&date=2026-07-19&tz=America%2FLos_Angeles",
    {
      fixtureTransform: completeMockTournamentFixtures,
      tournamentTransform: confirmMockGoldenBootAward
    }
  );
  await openCatchUp(postTournamentCatchUpCheck.page);
  const postTournamentCatchUpItems = await postTournamentCatchUpCheck.page.locator(".catch-up-item").evaluateAll((items) =>
    items.map((item) => {
      const visibleText = (node) => {
        const clone = node?.cloneNode(true);
        clone?.querySelectorAll(".player-card").forEach((card) => card.remove());
        return clone?.textContent.replace(/\s+/g, " ").trim() || "";
      };

      return {
        headline: visibleText(item.querySelector(".catch-up-title-row h3 > span")),
        subtitle: visibleText(item.querySelector(".catch-up-subtitle"))
      };
    })
  );
  assert(
    postTournamentCatchUpItems.length === 3 &&
      postTournamentCatchUpItems[0]?.headline === "France are 2026 world champions" &&
      postTournamentCatchUpItems[1]?.headline === "Kylian Mbappe wins the Golden Boot" &&
      postTournamentCatchUpItems[1]?.subtitle ===
        "Kylian Mbappe finished the tournament with 10 goals and 4 assists." &&
      postTournamentCatchUpItems[2]?.headline.includes("The 2026 World Cup: 104 matches"),
    `After the rolling window expires, Catch Up should keep the three-item tournament wrap. Measured ${JSON.stringify(postTournamentCatchUpItems)}.`
  );
  await postTournamentCatchUpCheck.context.close();

  const knockoutCatchUpCheck = await openPageAtTime(
    "2026-06-28T23:30:00.000Z",
    "/?view=matches&date=2026-06-28&tz=America%2FLos_Angeles"
  );
  await openCatchUp(knockoutCatchUpCheck.page);
  const knockoutCatchUpItems = await knockoutCatchUpCheck.page
    .locator(".catch-up-item")
    .evaluateAll((items) =>
      items.map((item) => {
        const visibleText = (node) => {
          if (!node) {
            return "";
          }

          const clone = node.cloneNode(true);
          clone.querySelectorAll(".player-card").forEach((card) => card.remove());
          return clone.textContent.replace(/\s+/g, " ").trim();
        };

        return {
          headline: visibleText(item.querySelector(".catch-up-title-row h3 > span")),
          subtitle: visibleText(item.querySelector(".catch-up-subtitle"))
        };
      })
    );
  const canadaKnockoutItem = knockoutCatchUpItems.find((item) =>
    item.headline?.includes("Canada edge South Africa to reach the Round of 16")
  );
  assert(
    canadaKnockoutItem?.subtitle.includes("Canada's 1-0 win moved them into the Round of 16") &&
      canadaKnockoutItem?.subtitle.includes("Stephen Eustaquio's 90+2' winner settled it for Canada") &&
      canadaKnockoutItem?.subtitle.includes("Canada reached the Round of 16 and South Africa exited"),
    "Completed knockout catch-up should describe the scorer, progression, and elimination instead of group points."
  );
  assert(
    !/\b(?:points|foothold)\b/i.test(`${canadaKnockoutItem?.headline || ""} ${canadaKnockoutItem?.subtitle || ""}`),
    "Completed knockout catch-up should not use group-stage points or foothold language."
  );
  await knockoutCatchUpCheck.page.locator('[data-match-id="match-73-round-of-32-2026-06-28"]').click();
  const canadaKnockoutDetailText = await knockoutCatchUpCheck.page.locator("#match-info").innerText();
  assert(
    canadaKnockoutDetailText.includes("Canada beat South Africa 1-0.") &&
      !canadaKnockoutDetailText.includes("Canada beat South Africa 0-1.") &&
      canadaKnockoutDetailText.includes("90+2'") &&
      canadaKnockoutDetailText.includes("Stephen Eustaquio") &&
      canadaKnockoutDetailText.includes("Stephen Eustaquio scored two minutes into stoppage time to put Canada ahead.") &&
      canadaKnockoutDetailText.includes("Canada kept South Africa out and turned the late goal into a knockout win.") &&
      !/chasing a 1-0 match/i.test(canadaKnockoutDetailText) &&
      !canadaKnockoutDetailText.includes("South Africa stayed close enough to keep the final minutes tense.") &&
      !/Canada reached the Round of 16 and South Africa exited|took three points from Round of 32|foothold in Round of 32/i.test(canadaKnockoutDetailText),
    "Completed knockout match detail should show winner-oriented score, scorer timeline, and match-specific bullets without bracket-impact or group-table copy."
  );
  await knockoutCatchUpCheck.context.close();

  const latestKnockoutChineseCheck = await openPageAtTime(
    "2026-06-30T16:31:00.000Z",
    "/?view=matches&date=2026-06-29&tz=America%2FLos_Angeles"
  );
  await latestKnockoutChineseCheck.page.locator("#settings-button").click();
  await latestKnockoutChineseCheck.page.locator("#language-select").selectOption("zh");
  await openCatchUp(latestKnockoutChineseCheck.page);
  const latestKnockoutChineseItems = await latestKnockoutChineseCheck.page
    .locator(".catch-up-item")
    .evaluateAll((items) =>
      items.map((item) => {
        const visibleText = (node) => {
          if (!node) {
            return "";
          }

          const clone = node.cloneNode(true);
          clone.querySelectorAll(".player-card").forEach((card) => card.remove());
          return clone.textContent.replace(/\s+/g, " ").trim();
        };

        return {
          headline: visibleText(item.querySelector(".catch-up-title-row h3 > span")),
          subtitle: visibleText(item.querySelector(".catch-up-subtitle"))
        };
      })
    );
  const moroccoChineseCatchUpItem = latestKnockoutChineseItems.find((item) =>
    item.headline?.includes("摩洛哥 点球淘汰 荷兰")
  );
  const paraguayChineseCatchUpItem = latestKnockoutChineseItems.find((item) =>
    item.headline?.includes("巴拉圭 点球淘汰 德国")
  );
  const brazilChineseCatchUpItem = latestKnockoutChineseItems.find((item) =>
    item.headline?.includes("巴西 险胜 日本，晋级16强赛")
  );
  const norwayChineseCatchUpItem = latestKnockoutChineseItems.find((item) =>
    item.headline?.includes("挪威 险胜 科特迪瓦，晋级16强赛")
  );
  const knockoutChineseSubtitleText = [
    moroccoChineseCatchUpItem?.subtitle || "",
    paraguayChineseCatchUpItem?.subtitle || "",
    brazilChineseCatchUpItem?.subtitle || "",
    norwayChineseCatchUpItem?.subtitle || ""
  ].join(" ");
  assert(
    moroccoChineseCatchUpItem?.subtitle.includes("科迪·加克波帮助荷兰领先") &&
      moroccoChineseCatchUpItem?.subtitle.includes("摩洛哥晋级16强赛，荷兰出局") &&
      paraguayChineseCatchUpItem?.subtitle.includes("胡利奥·塞萨尔·恩西索首开纪录，凯·哈弗茨完成最后一击") &&
      paraguayChineseCatchUpItem?.subtitle.includes("巴拉圭晋级16强赛，德国出局") &&
      (brazilChineseCatchUpItem
        ? brazilChineseCatchUpItem.subtitle.includes("加布里埃尔·马丁内利在90+5'打入制胜球") &&
          brazilChineseCatchUpItem.subtitle.includes("巴西晋级16强赛，日本出局")
        : norwayChineseCatchUpItem?.subtitle.includes("埃尔林·哈兰德在86'打入制胜球") &&
          norwayChineseCatchUpItem?.subtitle.includes("挪威晋级16强赛，科特迪瓦出局")) &&
      !/\b(?:put|before|opened|finished|winner|settled|reached|Round of 16|exited|chased|scoring)\b/i.test(knockoutChineseSubtitleText),
    "Chinese knockout catch-up should localize generated story and advancement standouts without leftover English result grammar."
  );
  await latestKnockoutChineseCheck.page.locator('[data-match-id="match-74-round-of-32-2026-06-29"]').click();
  await latestKnockoutChineseCheck.page.waitForFunction(
    () => {
      const text = document.querySelector("#match-info")?.innerText || "";
      return (
        /巴拉圭\s*在\s*1-1\s*战平后通过点球击败\s*德国。/.test(text) &&
        text.includes("恩西索接加拉尔萨传中头球破门让巴拉圭领先")
      );
    },
    null,
    { timeout: 10_000 }
  );
  const paraguayGermanyChineseDetail = await latestKnockoutChineseCheck.page.locator("#match-info").innerText();
  await latestKnockoutChineseCheck.page.locator('[data-match-id="match-75-round-of-32-2026-06-29"]').click();
  await latestKnockoutChineseCheck.page.waitForFunction(
    () => {
      const text = document.querySelector("#match-info")?.innerText || "";
      return (
        /摩洛哥\s*在\s*1-1\s*战平后通过点球击败\s*荷兰。/.test(text) &&
        text.includes("加克波第72分钟打破僵局")
      );
    },
    null,
    { timeout: 10_000 }
  );
  const moroccoNetherlandsChineseDetail = await latestKnockoutChineseCheck.page.locator("#match-info").innerText();
  const knockoutChineseDetailText = `${paraguayGermanyChineseDetail} ${moroccoNetherlandsChineseDetail}`.replace(/\s+/g, " ");
  assert(
    /巴拉圭\s*在\s*1-1\s*战平后通过点球击败\s*德国。/.test(paraguayGermanyChineseDetail) &&
      paraguayGermanyChineseDetail.includes("恩西索接加拉尔萨传中头球破门让巴拉圭领先") &&
      paraguayGermanyChineseDetail.includes("巴拉圭大部分时间保持紧凑的4-5-1") &&
      paraguayGermanyChineseDetail.includes("吉尔先后扑出哈弗茨和沃尔特马德的点球") &&
      !paraguayGermanyChineseDetail.includes("2026年世界杯 - 32强赛") &&
      !paraguayGermanyChineseDetail.includes("（巴拉圭点球大战4-3胜出）") &&
      /摩洛哥\s*在\s*1-1\s*战平后通过点球击败\s*荷兰。/.test(moroccoNetherlandsChineseDetail) &&
      moroccoNetherlandsChineseDetail.includes("加克波第72分钟打破僵局") &&
      moroccoNetherlandsChineseDetail.includes("摩洛哥的年轻替补改变比赛") &&
      moroccoNetherlandsChineseDetail.includes("萨伊巴里罚入决定性点球") &&
      !moroccoNetherlandsChineseDetail.includes("2026年世界杯 - 32强赛") &&
      !moroccoNetherlandsChineseDetail.includes("（摩洛哥点球大战3-2胜出）") &&
      !/\b(?:beat|penalties|draw|counters|right-side|surges|relevant|shootout|World Cup|Round of|controlled buildup|ON PENALTIES|stoppage|substitutes|physical|finish)\b/i.test(knockoutChineseDetailText) &&
      !knockoutChineseDetailText.includes("德德容") &&
      !knockoutChineseDetailText.includes("Netherlands'"),
    "Chinese knockout Result details should localize shootout summaries and keep current fixtures out of H2H past matches."
  );
  await latestKnockoutChineseCheck.context.close();

  const compactSourceFooterCheck = await openPageAtTime(
    "2026-07-18T08:00:00.000Z",
    "/?view=matches&date=2026-06-17&tz=America%2FLos_Angeles"
  );
  const sourceNote = compactSourceFooterCheck.page.locator("#source-note");
  const sourceNoteText = await sourceNote.innerText();
  const normalizedSourceNoteText = sourceNoteText
    .replace(/\s+/g, " ")
    .replace(/\s+([.,。])/g, "$1")
    .trim();
  const sourceLinkLabels = await sourceNote.locator("a").evaluateAll((links) =>
    links.map((link) => link.textContent.trim()).join("|")
  );
  const sourceTriggerTag = await sourceNote
    .locator(".source-tooltip-trigger")
    .evaluate((trigger) => trigger.tagName.toLowerCase());
  const releaseTriggerTag = await sourceNote
    .locator(".release-tooltip-trigger")
    .evaluate((trigger) => trigger.tagName.toLowerCase());
  const sourceTriggerHref = await sourceNote.locator(".source-tooltip-trigger").getAttribute("href");
  const releaseTriggerHref = await sourceNote.locator(".release-tooltip-trigger").getAttribute("href");
  const sourceTooltipText = await sourceNote.locator(".source-tooltip").evaluate((tooltip) =>
    [
      tooltip.querySelector("strong")?.textContent?.trim(),
      ...Array.from(tooltip.querySelectorAll(".source-tooltip-row")).map((row) =>
        row.textContent.replace(/\s+/g, " ").trim()
      ),
      tooltip.querySelector(".source-tooltip-note")?.textContent?.trim()
    ]
      .filter(Boolean)
      .join(" ")
  );
  const releaseTooltipText = await sourceNote.locator(".release-tooltip").evaluate((tooltip) =>
    [
      tooltip.querySelector("strong")?.textContent?.trim(),
      ...Array.from(tooltip.querySelectorAll("li")).map((item) => item.textContent.trim()),
      tooltip.querySelector(".release-tooltip-note")?.textContent?.trim()
    ]
      .filter(Boolean)
      .join(" ")
  );
  await compactSourceFooterCheck.page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await compactSourceFooterCheck.page.mouse.move(0, 0);
  await compactSourceFooterCheck.page.waitForFunction(() => {
    const sourceTooltip = document.querySelector("#source-note .source-tooltip");
    const releaseTooltip = document.querySelector("#source-note .release-tooltip");
    if (!sourceTooltip || !releaseTooltip) {
      return false;
    }
    const sourceStyles = getComputedStyle(sourceTooltip);
    const releaseStyles = getComputedStyle(releaseTooltip);
    return (
      sourceStyles.opacity === "0" &&
      sourceStyles.pointerEvents === "none" &&
      sourceStyles.visibility === "hidden" &&
      releaseStyles.opacity === "0" &&
      releaseStyles.pointerEvents === "none" &&
      releaseStyles.visibility === "hidden"
    );
  });
  const sourceTooltipStateBeforeHover = await sourceNote.locator(".source-tooltip").evaluate((tooltip) => {
    const styles = getComputedStyle(tooltip);
    return {
      opacity: styles.opacity,
      pointerEvents: styles.pointerEvents,
      visibility: styles.visibility
    };
  });
  const releaseTooltipStateBeforeHover = await sourceNote.locator(".release-tooltip").evaluate((tooltip) => {
    const styles = getComputedStyle(tooltip);
    return {
      opacity: styles.opacity,
      pointerEvents: styles.pointerEvents,
      visibility: styles.visibility
    };
  });
  const creatorHref = await sourceNote.locator("a", { hasText: /^HA$/ }).getAttribute("href");
  const footerLabelTypography = await sourceNote.evaluate((note) => {
    const typography = (element) => {
      const styles = getComputedStyle(element);
      return {
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
        fontStyle: styles.fontStyle,
        fontWeight: styles.fontWeight,
        letterSpacing: styles.letterSpacing,
        lineHeight: styles.lineHeight,
        textRendering: styles.textRendering
      };
    };
    return {
      creator: typography(note.querySelector(".source-credit a")),
      releaseNotes: typography(note.querySelector(".release-tooltip-trigger")),
      sources: typography(note.querySelector(".source-tooltip-trigger"))
    };
  });
  const expectedSourceNoteText = "Sources • Release notes • Made by HA";
  assert(
    normalizedSourceNoteText === expectedSourceNoteText,
    `The source note should show Sources, Release notes, and the creator credit. Expected "${expectedSourceNoteText}", received "${normalizedSourceNoteText}".`
  );
  assert(
    sourceLinkLabels ===
      "FIFA|Opta Analyst|public betting markets|FIFA|Sports Mole|Racing Post|Sky Sports|Wikipedia|Wikimedia Commons|Transfermarkt|engsoccerdata|National Football Teams|11v11|FIFA|FOX Sports|HA",
    "The source note should link each main source family and the creator without repeating the Settings report link."
  );
  assert(
    sourceTriggerTag === "button" &&
      releaseTriggerTag === "button" &&
      sourceTriggerHref === null &&
      releaseTriggerHref === null,
    "The source and release note triggers should be in-page tooltip buttons, not navigation links."
  );
  assert(
    footerLabelTypography.creator.fontFamily === footerLabelTypography.sources.fontFamily &&
      footerLabelTypography.creator.fontFamily === footerLabelTypography.releaseNotes.fontFamily &&
      footerLabelTypography.creator.fontSize === footerLabelTypography.sources.fontSize &&
      footerLabelTypography.creator.fontSize === footerLabelTypography.releaseNotes.fontSize &&
      footerLabelTypography.creator.fontStyle === footerLabelTypography.sources.fontStyle &&
      footerLabelTypography.creator.fontStyle === footerLabelTypography.releaseNotes.fontStyle &&
      footerLabelTypography.creator.fontWeight === footerLabelTypography.sources.fontWeight &&
      footerLabelTypography.creator.fontWeight === footerLabelTypography.releaseNotes.fontWeight &&
      footerLabelTypography.creator.letterSpacing === footerLabelTypography.sources.letterSpacing &&
      footerLabelTypography.creator.letterSpacing === footerLabelTypography.releaseNotes.letterSpacing &&
      footerLabelTypography.creator.lineHeight === footerLabelTypography.sources.lineHeight &&
      footerLabelTypography.creator.lineHeight === footerLabelTypography.releaseNotes.lineHeight &&
      footerLabelTypography.creator.textRendering === footerLabelTypography.sources.textRendering &&
      footerLabelTypography.creator.textRendering === footerLabelTypography.releaseNotes.textRendering,
    `The HA creator link should use the same typography as Sources and Release notes. Measured ${JSON.stringify(footerLabelTypography)}.`
  );
  assert(
    sourceTooltipText ===
      "Sources: Tournament facts & confirmed lineups — FIFA Forecasts — Opta Analyst · public betting markets Predicted lineups & team news — FIFA · Sports Mole · Racing Post · Sky Sports Player information — Wikipedia · Wikimedia Commons · Transfermarkt · engsoccerdata Head-to-head records — National Football Teams · 11v11 Official highlights — FIFA · FOX Sports Exact sources vary by match.",
    `The source tooltip should explain the app's main source families without implying that one fixed list covers every match. Measured "${sourceTooltipText}".`
  );
  assert(
    releaseTooltipText === getExpectedReleaseTooltipText(releaseNotesData),
    `The release notes tooltip should show a compact change summary. Expected "${getExpectedReleaseTooltipText(releaseNotesData)}", received "${releaseTooltipText}".`
  );
  assert(
    sourceTooltipStateBeforeHover.opacity === "0" &&
      sourceTooltipStateBeforeHover.pointerEvents === "none" &&
      sourceTooltipStateBeforeHover.visibility === "hidden",
    "The source tooltip should be hidden before hover or focus."
  );
  assert(
    releaseTooltipStateBeforeHover.opacity === "0" &&
      releaseTooltipStateBeforeHover.pointerEvents === "none" &&
      releaseTooltipStateBeforeHover.visibility === "hidden",
    "The release notes tooltip should be hidden before hover or focus."
  );
  await sourceNote.locator(".source-tooltip-trigger").focus();
  await compactSourceFooterCheck.page.waitForFunction(() => {
    const tooltip = document.querySelector("#source-note .source-tooltip");
    if (!tooltip) {
      return false;
    }
    const styles = getComputedStyle(tooltip);
    return (
      Number(styles.opacity) > 0 &&
      styles.pointerEvents === "auto" &&
      styles.visibility === "visible"
    );
  });
  const sourceTooltipStateAfterHover = await sourceNote.locator(".source-tooltip").evaluate((tooltip) => {
    const styles = getComputedStyle(tooltip);
    return {
      opacity: Number(styles.opacity),
      pointerEvents: styles.pointerEvents,
      visibility: styles.visibility
    };
  });
  assert(
    sourceTooltipStateAfterHover.opacity > 0 &&
      sourceTooltipStateAfterHover.pointerEvents === "auto" &&
      sourceTooltipStateAfterHover.visibility === "visible",
    "The source tooltip should appear on focus."
  );
  await sourceNote.locator(".release-tooltip-trigger").focus();
  await compactSourceFooterCheck.page.waitForFunction(() => {
    const tooltip = document.querySelector("#source-note .release-tooltip");
    if (!tooltip) {
      return false;
    }
    const styles = getComputedStyle(tooltip);
    return (
      Number(styles.opacity) > 0 &&
      styles.pointerEvents === "auto" &&
      styles.visibility === "visible"
    );
  });
  const releaseTooltipStateAfterHover = await sourceNote.locator(".release-tooltip").evaluate((tooltip) => {
    const styles = getComputedStyle(tooltip);
    return {
      opacity: Number(styles.opacity),
      pointerEvents: styles.pointerEvents,
      visibility: styles.visibility
    };
  });
  assert(
    releaseTooltipStateAfterHover.opacity > 0 &&
      releaseTooltipStateAfterHover.pointerEvents === "auto" &&
      releaseTooltipStateAfterHover.visibility === "visible",
    "The release notes tooltip should appear on focus."
  );
  assert(
    creatorHref === "https://www.linkedin.com/in/hirooaoy",
    "The visible footer creator credit should link HA to LinkedIn."
  );
  assert(
    !sourceNoteText.includes("Core data") &&
      !sourceNoteText.includes("Core checks:") &&
      !sourceNoteText.includes("Latest result data checked") &&
      !sourceNoteText.includes("Source data checked"),
    "The source note should not show diagnostic freshness details."
  );
  await compactSourceFooterCheck.page.locator("#settings-button").click();
  await compactSourceFooterCheck.page.locator("#timezone-picker-trigger").click();
  await compactSourceFooterCheck.page.locator("#timezone-search-input").fill("Japan");
  await compactSourceFooterCheck.page
    .locator('.timezone-picker-option[data-time-zone="Asia/Tokyo"]')
    .click();
  const tokyoSourceNoteText = (await sourceNote.innerText())
    .replace(/\s+/g, " ")
    .replace(/\s+([.,。])/g, "$1")
    .trim();
  assert(
    tokyoSourceNoteText === expectedSourceNoteText,
    `Changing timezone should leave the compact footer unchanged. Measured "${tokyoSourceNoteText}".`
  );

  const reportFooterPage = await compactSourceFooterCheck.context.newPage();
  await reportFooterPage.goto(`${baseUrl}/report.html`, { waitUntil: "load" });
  const reportFooterText = (await reportFooterPage.locator("#source-note").innerText())
    .replace(/\s+/g, " ")
    .replace(/\s+([.,。])/g, "$1")
    .trim();
  assert(
    reportFooterText === expectedSourceNoteText &&
      (await reportFooterPage.locator("#source-note .source-freshness").count()) === 0,
    `The report footer should show Sources, Release notes, and the creator credit. Measured "${reportFooterText}".`
  );
  await reportFooterPage.close();
  await compactSourceFooterCheck.context.close();

  const tomorrowDuringKickoff = await openPageAtTime(
    "2026-06-18T15:55:00.000Z",
    "/?view=matches&date=2026-06-19&tz=America%2FLos_Angeles"
  );
  assert(
    (await tomorrowDuringKickoff.page.locator(".up-next-pill").count()) === 0,
    "Tomorrow's first match should not show Up next for today's upcoming match."
  );
  await tomorrowDuringKickoff.context.close();

  const futureSelectedDayUpNextCheck = await openPageAtTime(
    "2026-07-08T12:00:00-07:00",
    "/?view=matches&date=2026-07-09&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        for (const fixture of data.fixtures || []) {
          if (fixture.status === "LIVE") {
            fixture.status = "FT";
            fixture.score ||= { home: 0, away: 0 };
          }
        }

        const franceMoroccoFixture = data.fixtures.find(
          (fixture) => fixture.id === "match-97-quarter-final-2026-07-09"
        );
        if (franceMoroccoFixture) {
          franceMoroccoFixture.status = "SCHEDULED";
          delete franceMoroccoFixture.score;
        }
      }
    }
  );
  const futureSelectedDayUpNextState = await futureSelectedDayUpNextCheck.page
    .locator('[data-match-id="match-97-quarter-final-2026-07-09"]')
    .evaluate((row) => ({
      ariaLabel: row.getAttribute("aria-label") || "",
      label: row.querySelector(".up-next-pill")?.textContent.trim() || "",
      rowIsNext: row.classList.contains("is-next"),
      scoreCount: row.querySelectorAll(".match-score, .score-status").length,
      text: row.textContent.replace(/\s+/g, " ").trim(),
      upNextCount: row.querySelectorAll(".up-next-pill").length
    }));
  assert(
    futureSelectedDayUpNextState.rowIsNext &&
      futureSelectedDayUpNextState.upNextCount === 1 &&
      futureSelectedDayUpNextState.label === "Up next" &&
      futureSelectedDayUpNextState.scoreCount === 0 &&
      futureSelectedDayUpNextState.ariaLabel.startsWith("Up next, France vs Morocco"),
    `The next global fixture should show Up next even when it is on a future selected day. Measured ${JSON.stringify(futureSelectedDayUpNextState)}.`
  );
  await futureSelectedDayUpNextCheck.context.close();

  const tomorrowPast24DuringLive = await openPageAtTime(
    "2026-06-29T21:34:00.000Z",
    "/?view=matches&date=2026-06-30&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        for (const fixture of data.fixtures || []) {
          if (
            fixture.id === "match-74-round-of-32-2026-06-29" ||
            fixture.id === "match-76-round-of-32-2026-06-29"
          ) {
            fixture.status = "LIVE";
            fixture.score = { home: 0, away: 1 };
          }
          if (fixture.id === "match-75-round-of-32-2026-06-29") {
            fixture.status = "SCHEDULED";
            delete fixture.score;
          }
        }
      }
    }
  );
  assert(
    (await tomorrowPast24DuringLive.page.locator(".yesterday-section").count()) === 0,
    "Recent matches should stay hidden when the latest earlier matchday has no completed matches yet."
  );
  await tomorrowPast24DuringLive.context.close();

  const cleanTodayUrlCheck = await openPageAtTime(
    "2026-07-07T12:00:00-07:00",
    "/?view=matches&date=2026-07-07&tz=America%2FLos_Angeles"
  );
  await cleanTodayUrlCheck.page.reload({ waitUntil: "load" });
  await cleanTodayUrlCheck.page.waitForFunction(
    () => document.querySelector("#day-label")?.textContent.trim() === "Today"
  );
  await cleanTodayUrlCheck.page
    .waitForFunction(() => !new URL(window.location.href).searchParams.has("date"), null, {
      timeout: 1000
    })
    .catch(() => {});
  const reloadedTodayUrl = cleanTodayUrlCheck.page.url();
  assert(
    !new URL(reloadedTodayUrl).searchParams.has("date"),
    `Reload should replace stale date state with a clean today URL. Current URL: ${reloadedTodayUrl}`
  );
  await cleanTodayUrlCheck.context.close();

  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector(".match-row, #match-list > .empty-state");

  await page.locator("#standings-tab").click();
  assert(
    (await page.locator("#standings-heading").innerText()).replace(/\s+/g, " ").trim() ===
      "2026",
    "The current standings heading should show just the selected year."
  );
  assert(
    (await page.locator("#standings-heading").getAttribute("aria-label")) === "2026",
    "The current standings heading label should not add a redundant Standings suffix."
  );
  const standingsYearChevron = await page.locator("#standings-year-button").evaluate((button) => {
    const style = getComputedStyle(button, "::after");
    return {
      borderBottomWidth: Number.parseFloat(style.borderBottomWidth),
      borderRightWidth: Number.parseFloat(style.borderRightWidth),
      height: Number.parseFloat(style.height),
      marginLeft: Number.parseFloat(style.marginLeft),
      width: Number.parseFloat(style.width)
    };
  });
  assert(
    standingsYearChevron.width >= 5 &&
      standingsYearChevron.height >= 5 &&
      standingsYearChevron.marginLeft >= 8 &&
      standingsYearChevron.borderBottomWidth > 0 &&
      standingsYearChevron.borderRightWidth > 0,
    `The standings year heading should show a dropdown chevron like Today. Measured ${JSON.stringify(standingsYearChevron)}.`
  );
  await page.locator("#standings-groups-tab").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#standings-groups-tab")?.getAttribute("aria-pressed") === "true" &&
      document.querySelectorAll(".standings-card[data-group-id]").length === 12
  );
  const groupOrderCheck = await page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll(".standings-card[data-group-id]")].map((card) => [
        card.dataset.groupId,
        [...card.querySelectorAll(".standing-name")].map((team) => team.textContent.trim())
      ])
    )
  );
  const groupOrderMismatches = (tournamentData.groups || [])
    .map((group) => ({
      actual: groupOrderCheck[group.id]?.join("|") || "",
      expected: getExpectedStandingOrder(group.id),
      groupId: group.id
    }))
    .filter((group) => group.actual !== group.expected);
  assert(
    groupOrderMismatches.length === 0,
    `Every current group should preserve the checked table order. Mismatches: ${JSON.stringify(groupOrderMismatches)}.`
  );
  const bosniaStandingTeam = page
    .locator(".standings-card", { hasText: "Group B" })
    .locator(".standing-team", { hasText: "Bosnia and Herzegovina" });
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
          Math.abs(bosniaTooltip.anchor - bosniaTooltip.expectedAnchor) <= 1)),
    "Bosnia and Herzegovina should use the available standings row width and only show a tooltip if it actually overflows."
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(80);
  const bosniaStandingFlagAlignment = await bosniaStandingTeam.evaluate((team) => {
    const flag = team.querySelector(".flag");
    const teamRect = team.getBoundingClientRect();
    const flagRect = flag?.getBoundingClientRect();
    return {
      flagCenter: flagRect ? flagRect.top + flagRect.height / 2 : 0,
      scrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      teamCenter: teamRect.top + teamRect.height / 2
    };
  });
  assert(
    Math.abs(bosniaStandingFlagAlignment.flagCenter - bosniaStandingFlagAlignment.teamCenter) <= 1 &&
      bosniaStandingFlagAlignment.scrollOverflow <= 1,
    `Wrapped standings rows should vertically center the flag against the full team block. Measured ${JSON.stringify(bosniaStandingFlagAlignment)}.`
  );
  await page.setViewportSize({ width: 1280, height: 720 });
  const currentStandingsMarkerCheck = await page.evaluate(() => {
    const getRowTeamName = (row) => row.querySelector(".standing-name")?.textContent.trim() || "";

    return {
      advancingNames: [...document.querySelectorAll(".standings-card tbody tr.is-advancing")]
        .map(getRowTeamName)
        .filter(Boolean)
        .sort(),
      madeItPillCount: document.querySelectorAll(".standing-status-pill.is-made-it, .third-place-status.is-made-it").length,
      advancementPillCount: document.querySelectorAll(".advancement-pill").length
    };
  });
  const expectedConfirmedAdvancingStandingTeamNames = getExpectedConfirmedAdvancingStandingTeamNames();
  assert(
    currentStandingsMarkerCheck.advancingNames.join("|") === expectedConfirmedAdvancingStandingTeamNames.join("|"),
    `The current 2026 standings should highlight only confirmed advancing teams with the archived row treatment. Expected ${expectedConfirmedAdvancingStandingTeamNames.join("|")}, received ${currentStandingsMarkerCheck.advancingNames.join("|")}.`
  );
  assert(
    currentStandingsMarkerCheck.advancementPillCount === 0 &&
      currentStandingsMarkerCheck.madeItPillCount === 0,
    "The current 2026 standings should not add a text pill for confirmed advancement."
  );
  const expectedGroupBThirdPlaceCandidate = getExpectedThirdPlaceRaceRows().find(
    (candidate) => candidate.groupId === "B"
  );
  const groupBThirdPlacePill = page.locator(".standings-card", { hasText: "Group B" }).locator(".third-place-pill");
  assert(
    expectedGroupBThirdPlaceCandidate &&
      (await groupBThirdPlacePill.innerText()).trim() ===
        `3rd race ${formatOrdinal(expectedGroupBThirdPlaceCandidate.position)}`,
    "Group standings should show each current third-place team's cross-group race position."
  );
  const groupBThirdPlacePillTooltip = await groupBThirdPlacePill.getAttribute("data-tooltip");
  assert(
    groupBThirdPlacePillTooltip ===
      getExpectedThirdPlaceStandingBadgeReason(expectedGroupBThirdPlaceCandidate),
    "Group standings third-place race pills should explain whether the team is advancing or not advancing."
  );
  const groupStandingsLiveRows = await page.evaluate(() =>
    [...document.querySelectorAll(".standings-card tbody tr")].map((row) => ({
      eliminated: row.querySelector(".standing-status-pill.is-eliminated")?.textContent.trim() || "",
      live: row.querySelector(".standing-live-pill")?.textContent.trim() || "",
      race: row.querySelector(".third-place-pill")?.textContent.trim() || "",
      team: row.querySelector(".standing-name")?.textContent.trim() || ""
    }))
  );
  assert(
    groupStandingsLiveRows.every((row) => row.live === ""),
    "Group standings should not show LIVE pills now that the group stage live-tracking surface is retired."
  );
  assert(
    groupStandingsLiveRows.every((row) => !row.race || !row.eliminated),
    "Group standings should not stack an Eliminated pill beside a third-place race pill."
  );
  await page.setViewportSize({ width: 1280, height: 720 });
  const scheduledLiveWindowCheck = await openPageAtTime(
    "2026-06-26T19:30:00.000Z",
    "/?view=standings&standingsMode=groups&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const scheduledWindowFixture = data.fixtures.find(
          (fixture) => fixture.id === "senegal-iraq-2026-06-26"
        );

        scheduledWindowFixture.status = "SCHEDULED";
        delete scheduledWindowFixture.score;
        delete scheduledWindowFixture.goalsHome;
        delete scheduledWindowFixture.goalsAway;
        delete scheduledWindowFixture.resultHighlights;
      }
    }
  );
  await scheduledLiveWindowCheck.page.waitForSelector('.standings-card[data-group-id="I"] .standing-team');
  const groupIScheduledWindowRows = await scheduledLiveWindowCheck.page.evaluate(() =>
    [...document.querySelectorAll('.standings-card[data-group-id="I"] tbody tr')].map((row) => ({
      live: row.querySelector(".standing-live-pill")?.textContent.trim() || "",
      race: row.querySelector(".third-place-pill")?.textContent.trim() || "",
      team: row.querySelector(".standing-name")?.textContent.trim() || ""
    }))
  );
  assert(
    groupIScheduledWindowRows.every((row) => row.live === "") &&
      groupIScheduledWindowRows.some((row) => row.team === "Senegal" && row.race.startsWith("3rd race")),
    "Group standings should keep third-place race pills but suppress LIVE pills during the scheduled live window."
  );
  await scheduledLiveWindowCheck.page.locator("#standings-third-place-tab").click();
  await scheduledLiveWindowCheck.page.waitForFunction(
    () => document.querySelectorAll(".third-place-table tbody tr:not(.third-place-cut-row)").length === 12
  );
  const thirdPlaceScheduledWindowRows = await scheduledLiveWindowCheck.page.evaluate(() =>
    [...document.querySelectorAll(".third-place-table tbody tr:not(.third-place-cut-row)")].map((row) => ({
      live: row.querySelector(".standing-live-pill")?.textContent.trim() || "",
      team: row.querySelector(".standing-name")?.textContent.trim() || ""
    }))
  );
  assert(
    thirdPlaceScheduledWindowRows.every((row) => row.live === ""),
    "The third-place race table should not show LIVE pills during the scheduled live window."
  );
  await scheduledLiveWindowCheck.context.close();
  assert(
    (await page
      .locator('.standings-card[data-group-id="B"] .standing-team', { hasText: "Qatar" })
      .locator(".standing-status-pill.is-eliminated")
      .innerText()) === "Eliminated",
    "Completed group standings should mark teams outside any group-stage path as eliminated."
  );
  assert(
    (await page
      .locator('.standings-card[data-group-id="D"] .standing-team', { hasText: "Türkiye" })
      .locator(".standing-status-pill.is-eliminated")
      .innerText()) === "Eliminated",
    "Group standings should use completed head-to-head results to mark mathematically eliminated teams before the group is complete."
  );
  const expectedEliminatedTeamNames = getExpectedEliminatedTeamNames();
  const actualEliminatedTeamNames = (
    await page.evaluate(() =>
      [...document.querySelectorAll(".standings-card tbody tr")]
        .filter((row) => row.querySelector(".standing-status-pill.is-eliminated"))
        .map((row) => row.querySelector(".standing-name")?.textContent.trim() || "")
        .filter(Boolean)
    )
  ).sort();
  assert(
    actualEliminatedTeamNames.join("|") === expectedEliminatedTeamNames.join("|"),
    `Current standings eliminated pills should match every group. Expected ${expectedEliminatedTeamNames.join("|")}, received ${actualEliminatedTeamNames.join("|")}.`
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
      livePillCount: document.querySelectorAll(".third-place-table .standing-live-pill").length,
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
    thirdPlaceRaceCheck.headers.join("|") === "Rank|Team|Group|Pts|GD|Goals|Status" &&
      !thirdPlaceRaceCheck.headers.includes("GF"),
    "The third-place race should show Goals and Status without GF jargon."
  );
  assert(
      thirdPlaceRaceCheck.visibleReasonCount === 0 &&
      thirdPlaceRaceCheck.rowSummaries.every((row) => row.tooltip && !row.tooltip.includes("GF")) &&
      thirdPlaceRaceCheck.rowSummaries.every((row) => !row.tooltip.includes("Estimated Round of 32 chance:")) &&
      thirdPlaceRaceCheck.rowSummaries.every((row) => !row.tooltip.includes("Simple model:")) &&
      thirdPlaceRaceCheck.rowSummaries.every((row) => row.status === "Advancing" || row.status === "Eliminated") &&
      thirdPlaceRaceCheck.rowSummaries.some((row) => row.status === "Advancing" && row.tooltip === "Advancing to Round of 32.") &&
      thirdPlaceRaceCheck.rowSummaries.some((row) => row.status === "Eliminated" && row.tooltip === "Eliminated at group stage."),
    "The third-place race should show binary status pill tooltips without probability or GF jargon."
  );
  assert(
    thirdPlaceRaceCheck.livePillCount === 0,
    "The third-place race should not carry standings LIVE pill state."
  );
  assert(
    thirdPlaceRaceCheck.rowSummaries.every((row) => !/^(?:<1%|\d+%) advancing$/.test(row.status || "")),
    "The third-place race should use binary status labels instead of percentage advancing copy."
  );
  assert(
    thirdPlaceRaceCheck.rowSummaries.every((row) => row.status !== "Made it"),
    "The third-place race should not add a Made it pill; final qualifiers use the archived row highlight in group standings."
  );
  assert(
    expectedCutLineInside &&
      expectedFirstOut &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount() - 1]?.team === expectedCutLineInside.team.name &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount() - 1]?.status === expectedCutLineInside.status.label &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount() - 1]?.tooltip ===
        getExpectedThirdPlaceRaceStatusReason(expectedCutLineInside) &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount()]?.team === expectedFirstOut.team.name &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount()]?.status === expectedFirstOut.status.label &&
      thirdPlaceRaceCheck.rowSummaries[getThirdPlaceAdvancerCount()]?.tooltip ===
        getExpectedThirdPlaceRaceStatusReason(expectedFirstOut),
    "The cut-line rows should show final advancing and eliminated status."
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
    new URL(page.url()).searchParams.get("standingsMode") === "groups" &&
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
    new URL(page.url()).searchParams.get("standingsMode") === "groups",
    "Clicking a race table group should leave the URL on the Groups section."
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
  await page.waitForFunction(() => document.querySelectorAll(".progress-connectors path").length >= 29);
  assert(
    !new URL(page.url()).searchParams.has("standingsMode"),
    "The tournament section should be linkable from the URL."
  );
  const tournamentCheck = await page.evaluate(() => {
    const text = (selector) => document.querySelector(selector)?.textContent.replace(/\s+/g, " ").trim() || "";
    const allText = (selector) =>
      [...document.querySelectorAll(selector)]
        .map((element) => element.textContent.replace(/\s+/g, " ").trim())
        .join(" ");
    const getTeamVisual = (team) => {
      const flag = team.querySelector(".knockout-team-flag");
      const strong = team.querySelector(".knockout-team-copy strong");
      const rank = team.querySelector(".rank-pill");
      const flagStyle = flag ? getComputedStyle(flag) : null;
      const strongStyle = strong ? getComputedStyle(strong) : null;
      const rankStyle = rank ? getComputedStyle(rank) : null;

      return {
        className: team.className,
        flagFilter: flagStyle?.filter || "",
        flagOpacity: flagStyle?.opacity || "",
        rankOpacity: rankStyle?.opacity || "",
        strongColor: strongStyle?.color || "",
        teamId: team.dataset.teamId || "",
        text: team.textContent.replace(/\s+/g, " ").trim()
      };
    };
    const getMatchTeamVisuals = (matchNumber) =>
      [...document.querySelectorAll(`.progress-match[data-match-number="${matchNumber}"] .knockout-team`)].map(
        getTeamVisual
      );
    const getOutcomeTooltip = (matchNumber, outcome) =>
      document
        .querySelector(`.progress-match[data-match-number="${matchNumber}"] .knockout-likelihood[data-outcome="${outcome}"]`)
        ?.getAttribute("data-tooltip") || "";
    const getRectSummary = (selector) => {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect();

      return rect
        ? {
            bottom: Math.round(rect.bottom),
            center: Math.round(rect.top + rect.height / 2),
            left: Math.round(rect.left),
            top: Math.round(rect.top)
          }
        : null;
    };

    return {
      m73ProgressText: text('.progress-match[data-match-number="73"]'),
      m74ProgressText: text('.progress-match[data-match-number="74"]'),
      m81TeamIds: [...document.querySelectorAll('.progress-match[data-match-number="81"] .knockout-team[data-team-id]')]
        .map((element) => element.dataset.teamId),
      m81OutcomeKeys: [...document.querySelectorAll('.progress-match[data-match-number="81"] .knockout-likelihood')]
        .map((element) => element.dataset.outcome || ""),
      m81OutcomeTexts: [...document.querySelectorAll('.progress-match[data-match-number="81"] .knockout-likelihood')]
        .map((element) => element.textContent.replace(/\s+/g, " ").trim()),
      m81PillCount: document.querySelectorAll('.progress-match[data-match-number="81"] .knockout-likelihood').length,
      m81Text: text('.progress-match[data-match-number="81"]'),
      m89TeamIds: [...document.querySelectorAll('.progress-match[data-match-number="89"] .knockout-team[data-team-id]')]
        .map((element) => element.dataset.teamId),
      m89Text: text('.progress-match[data-match-number="89"]'),
      m97TeamIds: [...document.querySelectorAll('.progress-match[data-match-number="97"] .knockout-team[data-team-id]')]
        .map((element) => element.dataset.teamId),
      m97Text: text('.progress-match[data-match-number="97"]'),
      m103OutcomeBasis: document.querySelector('.progress-match[data-match-number="103"] .knockout-likelihood-list')?.dataset.outcomeBasis || "",
      m103OutcomeKeys: [...document.querySelectorAll('.progress-match[data-match-number="103"] .knockout-likelihood')]
        .map((element) => element.dataset.outcome || ""),
      m103OutcomeTexts: [...document.querySelectorAll('.progress-match[data-match-number="103"] .knockout-likelihood')]
        .map((element) => element.textContent.replace(/\s+/g, " ").trim()),
      m103OutcomeTooltips: [...document.querySelectorAll('.progress-match[data-match-number="103"] .knockout-likelihood')]
        .map((element) => element.getAttribute("data-tooltip") || ""),
      m103PillCount: document.querySelectorAll('.progress-match[data-match-number="103"] .knockout-likelihood').length,
      m103Projected: document.querySelector('.progress-match[data-match-number="103"]')?.classList.contains("is-projected"),
      m103Rect: getRectSummary('.progress-match[data-match-number="103"]'),
      m103TeamIds: [...document.querySelectorAll('.progress-match[data-match-number="103"] .knockout-team[data-team-id]')]
        .map((element) => element.dataset.teamId),
      m103Text: text('.progress-match[data-match-number="103"]'),
      m103TimeText: document.querySelector('.progress-match[data-match-number="103"] time')?.textContent.trim() || "",
      m104TeamIds: [...document.querySelectorAll('.progress-match[data-match-number="104"] .knockout-team[data-team-id]')]
        .map((element) => element.dataset.teamId),
      m104OutcomeBasis: document.querySelector('.progress-match[data-match-number="104"] .knockout-likelihood-list')?.dataset.outcomeBasis || "",
      m104OutcomeKeys: [...document.querySelectorAll('.progress-match[data-match-number="104"] .knockout-likelihood')]
        .map((element) => element.dataset.outcome || ""),
      m104OutcomeTexts: [...document.querySelectorAll('.progress-match[data-match-number="104"] .knockout-likelihood')]
        .map((element) => element.textContent.replace(/\s+/g, " ").trim()),
      m104OutcomeTooltips: [...document.querySelectorAll('.progress-match[data-match-number="104"] .knockout-likelihood')]
        .map((element) => element.getAttribute("data-tooltip") || ""),
      m104Rect: getRectSummary('.progress-match[data-match-number="104"]'),
      m104TimeText: document.querySelector('.progress-match[data-match-number="104"] time')?.textContent.trim() || "",
      oldWinnerCopy: allText(".tournament-view").includes(["Winner", "advances"].join(" ")),
      posterMetaCount: document.querySelectorAll(".poster-match-meta").length,
      posterSeedCount: document.querySelectorAll(".poster-team-seed").length,
      posterVisible: Boolean(document.querySelector(".tournament-poster-bracket")),
      progressCount: document.querySelectorAll(".progress-match").length,
      connectorPathCount: document.querySelectorAll(".progress-connectors path").length,
      progressText: allText(".progress-match"),
      projectedCount: document.querySelectorAll(".progress-match.is-projected").length,
      roundOf32OpenMatchIds: [
        ...document.querySelectorAll(".progress-round.is-round-of-32 .progress-match[data-open-match-id]")
      ].map((element) => element.dataset.openMatchId || ""),
      roundOf32ProjectedCount: document.querySelectorAll(
        ".progress-round.is-round-of-32 .progress-match.is-projected"
      ).length,
      roundOf32ProjectedMatchNumbers: [
        ...document.querySelectorAll(".progress-round.is-round-of-32 .progress-match.is-projected")
      ].map((element) => element.dataset.matchNumber || ""),
      roundOf32TeamVisuals: [
        ...document.querySelectorAll(".progress-round.is-round-of-32 .progress-match .knockout-team")
      ].map(getTeamVisual),
      likelihoodCount: document.querySelectorAll(".knockout-likelihood").length,
      likelihoodListCount: document.querySelectorAll(".knockout-likelihood-list").length,
      likelihoodText: allText(".knockout-likelihood"),
      likelihoodNonNeutralCount: [...document.querySelectorAll(".knockout-likelihood")]
        .filter((element) => !element.classList.contains("is-neutral"))
        .length,
      likelihoodTooltips: [...document.querySelectorAll(".knockout-likelihood")]
        .map((element) => element.getAttribute("data-tooltip") || "")
        .join(" "),
      likelihoodTooltipMaxLength: Math.max(
        0,
        ...[...document.querySelectorAll(".knockout-likelihood")]
          .map((element) => (element.getAttribute("data-tooltip") || "").length)
      ),
      likelihoodTooltipCount: [...document.querySelectorAll(".knockout-likelihood")]
        .filter((element) => Boolean(element.getAttribute("data-tooltip") || ""))
        .length,
      outcomePillFlagCount: document.querySelectorAll(".knockout-likelihood .flag").length,
      tiePillCount: document.querySelectorAll('.knockout-likelihood[data-outcome="tie"]').length,
      tiePillFlagCount: document.querySelectorAll('.knockout-likelihood[data-outcome="tie"] .flag').length,
      finalRailConnectorPathCount: document.querySelectorAll(".progress-connectors path.is-final-rail").length,
      finalRailMoveCount:
        (document.querySelector(".progress-connectors path.is-final-rail")?.getAttribute("d") || "").match(/\bM\b/g)
          ?.length || 0,
      connectorStrokeValues: [...new Set([...document.querySelectorAll(".progress-connectors path")]
        .map((path) => getComputedStyle(path).stroke))],
      connectorStrokeWidths: [...new Set([...document.querySelectorAll(".progress-connectors path")]
        .map((path) => Number.parseFloat(getComputedStyle(path).strokeWidth)))],
      semi101Rect: getRectSummary('.progress-match[data-match-number="101"]'),
      semi102Rect: getRectSummary('.progress-match[data-match-number="102"]'),
      semi101RunnerUpNextMatch: document.querySelector('.progress-match[data-match-number="101"]')?.dataset.runnerUpNextMatch || "",
      semi102RunnerUpNextMatch: document.querySelector('.progress-match[data-match-number="102"]')?.dataset.runnerUpNextMatch || "",
      m73OpenMatchId: document.querySelector('.progress-match[data-match-number="73"]')?.dataset.openMatchId || "",
      m74OpenMatchId: document.querySelector('.progress-match[data-match-number="74"]')?.dataset.openMatchId || "",
      m73OutcomeKeys: [...document.querySelectorAll('.progress-match[data-match-number="73"] .knockout-likelihood')]
        .map((element) => element.dataset.outcome || ""),
      m73OutcomeTexts: [...document.querySelectorAll('.progress-match[data-match-number="73"] .knockout-likelihood')]
        .map((element) => element.textContent.replace(/\s+/g, " ").trim()),
      m74ResultPills: [...document.querySelectorAll('.progress-match[data-match-number="74"] .knockout-result-pill')]
        .map((element) => element.textContent.replace(/\s+/g, " ").trim()),
      m74Winner: document.querySelector('.progress-match[data-match-number="74"]')?.dataset.winnerTeamId || "",
      m75ResultPills: [...document.querySelectorAll('.progress-match[data-match-number="75"] .knockout-result-pill')]
        .map((element) => element.textContent.replace(/\s+/g, " ").trim()),
      m75Winner: document.querySelector('.progress-match[data-match-number="75"]')?.dataset.winnerTeamId || "",
      m77TieTooltip: getOutcomeTooltip(77, "tie"),
      m80TieTooltip: getOutcomeTooltip(80, "tie"),
      m83TieTooltip: getOutcomeTooltip(83, "tie"),
      m86TieTooltip: getOutcomeTooltip(86, "tie"),
      m92TieTooltip: getOutcomeTooltip(92, "tie"),
      m101TieTooltip: getOutcomeTooltip(101, "tie"),
      m102TieTooltip: getOutcomeTooltip(102, "tie"),
      m103TieTooltip: getOutcomeTooltip(103, "tie"),
      m104TieTooltip: getOutcomeTooltip(104, "tie"),
      m88AwayTooltip: getOutcomeTooltip(88, "away"),
      m73PillCount: document.querySelectorAll('.progress-match[data-match-number="73"] .knockout-likelihood').length,
      m89PillCount: document.querySelectorAll('.progress-match[data-match-number="89"] .knockout-likelihood').length,
      m89SeedLabelCount: document.querySelectorAll('.progress-match[data-match-number="89"] .knockout-team-copy small').length,
      m89VersusColor: getComputedStyle(
        document.querySelector('.progress-match[data-match-number="89"] .knockout-versus')
      ).color,
      m97PillCount: document.querySelectorAll('.progress-match[data-match-number="97"] .knockout-likelihood').length,
      m97SeedLabelCount: document.querySelectorAll('.progress-match[data-match-number="97"] .knockout-team-copy small').length,
      m104PillCount: document.querySelectorAll('.progress-match[data-match-number="104"] .knockout-likelihood').length,
      m73FooterCount: document.querySelectorAll('.progress-match[data-match-number="73"] .knockout-match-footer').length,
      m73Projected: document.querySelector('.progress-match[data-match-number="73"]')?.classList.contains("is-projected"),
      m74Projected: document.querySelector('.progress-match[data-match-number="74"]')?.classList.contains("is-projected"),
      m79Projected: document.querySelector('.progress-match[data-match-number="79"]')?.classList.contains("is-projected"),
      m89Projected: document.querySelector('.progress-match[data-match-number="89"]')?.classList.contains("is-projected"),
      m92Projected: document.querySelector('.progress-match[data-match-number="92"]')?.classList.contains("is-projected"),
      m79SlotPills: [...document.querySelectorAll('.progress-match[data-match-number="79"] .knockout-slot-odds')]
        .map((element) => ({
          slotLabel: element.dataset.slotLabel || "",
          teamId: element.dataset.teamId || "",
          text: element.textContent.replace(/\s+/g, " ").trim()
        })),
      m79TeamVisuals: getMatchTeamVisuals(79),
      m89TeamVisuals: getMatchTeamVisuals(89),
      m92TeamVisuals: getMatchTeamVisuals(92),
      m92VersusColor: getComputedStyle(
        document.querySelector('.progress-match[data-match-number="92"] .knockout-versus')
      ).color,
      laterRoundLikelyVisuals: [
        ...document.querySelectorAll(
          ".progress-round:not(.is-round-of-32) .progress-match.is-projected .knockout-team.is-likely"
        )
      ].map(getTeamVisual),
      m89Tooltips: [...document.querySelectorAll('.progress-match[data-match-number="89"] .knockout-likelihood')]
        .map((element) => element.getAttribute("data-tooltip") || "")
        .join(" "),
      m97Tooltips: [...document.querySelectorAll('.progress-match[data-match-number="97"] .knockout-likelihood')]
        .map((element) => element.getAttribute("data-tooltip") || "")
        .join(" "),
      r32Count: document.querySelectorAll(".r32-match").length,
      r32Text: allText(".r32-match"),
      sectionHeadingVisible: Boolean(document.querySelector(".tournament-section-heading")),
      sideCount: document.querySelectorAll(".poster-side").length,
      countryTooltipCount: document.querySelectorAll(".progress-match .knockout-team[data-tooltip]").length,
      m74VenueText: document.querySelector('.progress-match[data-match-number="74"] .knockout-match-venue')?.textContent.trim() || "",
      m74VenueTooltip: document.querySelector('.progress-match[data-match-number="74"] .knockout-match-venue')?.getAttribute("data-tooltip") || "",
      rankCount: document.querySelectorAll(".progress-match .knockout-team-copy .rank-pill").length,
      thirdPlaceSeedTeamIds: [...document.querySelectorAll(".progress-round.is-round-of-32 .progress-match .knockout-slot-odds[data-team-id]")]
        .filter((element) => /^Group [A-L]3$/.test(element.dataset.slotLabel || ""))
        .map((element) => element.dataset.teamId),
      slotOddsCount: document.querySelectorAll(".knockout-slot-odds").length,
      slotOddsFlagCount: document.querySelectorAll(".knockout-slot-odds .flag").length,
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
      tournamentCheck.connectorPathCount >= 29 &&
      tournamentCheck.progressCount === 32,
    "The tournament section should show a progression-only bracket from the Round of 32 through the final and third-place play-off."
  );
  const m79MexicoVisual = tournamentCheck.m79TeamVisuals.find((team) => team.teamId === "MEX");
  const m79UnresolvedVisual = tournamentCheck.m79TeamVisuals.find((team) => team.teamId !== "MEX");
  const m92LikelyVisuals = tournamentCheck.m92TeamVisuals.filter((team) =>
    team.className.includes("is-likely")
  );
  const m92LockedVisuals = tournamentCheck.m92TeamVisuals.filter((team) =>
    team.className.includes("is-locked")
  );
  const isLockedResolvedCountry = (team) =>
    team.className.includes("is-locked") &&
    team.className.includes("is-resolved") &&
    !team.className.includes("is-likely") &&
    team.flagFilter === "none" &&
    team.flagOpacity === "1" &&
    Number(team.rankOpacity) >= 0.7 &&
    getCssColorAlpha(team.strongColor) >= 0.8;
  const isCompletedLoserCountry = (team) =>
    team.className.includes("is-locked") &&
    team.className.includes("is-resolved") &&
    team.className.includes("is-loser") &&
    team.flagFilter.includes("grayscale") &&
    Number(team.flagOpacity) < 1 &&
    Number(team.rankOpacity) < 1 &&
    getCssColorAlpha(team.strongColor) < 0.7;
  const isResolvedRoundOf16Country = (team) => isLockedResolvedCountry(team) || isCompletedLoserCountry(team);
  const isResolvedRoundOf32Country = (team) => isLockedResolvedCountry(team) || isCompletedLoserCountry(team);
  const isMutedProjectedCountry = (team) =>
    !team.className.includes("is-locked") &&
    team.flagFilter.includes("grayscale") &&
    Number(team.flagOpacity) < 1 &&
    Number(team.rankOpacity) < 1 &&
    getCssColorAlpha(team.strongColor) < 0.7;
  const m92ResolvedState =
    tournamentCheck.m92Projected === false &&
    tournamentCheck.m92TeamVisuals.length === 2 &&
    tournamentCheck.m92TeamVisuals.every(isResolvedRoundOf16Country) &&
    getCssColorAlpha(tournamentCheck.m92VersusColor) >= 0.35;
  const m92ProjectedState =
    tournamentCheck.m92Projected === true &&
    tournamentCheck.m92TeamVisuals.length === 2 &&
    m92LikelyVisuals.length >= 1 &&
    m92LikelyVisuals.every(isMutedProjectedCountry) &&
    m92LockedVisuals.every(isLockedResolvedCountry) &&
    getCssColorAlpha(tournamentCheck.m92VersusColor) < 0.7;
  assert(
    tournamentCheck.m79Projected === false &&
      tournamentCheck.m79TeamVisuals.length === 2 &&
      tournamentCheck.m79TeamVisuals.every(isResolvedRoundOf32Country) &&
      tournamentCheck.roundOf32TeamVisuals.length === 32 &&
      tournamentCheck.roundOf32TeamVisuals.every(isResolvedRoundOf32Country) &&
      tournamentCheck.m79SlotPills.length === 0 &&
      isLockedResolvedCountry(m79MexicoVisual) &&
      m79UnresolvedVisual &&
      isResolvedRoundOf32Country(m79UnresolvedVisual),
    `Locked Round of 32 teams should render as visually confirmed resolved cards with completed losers muted and no slot odds. Measured ${JSON.stringify({ m79MexicoVisual, m79UnresolvedVisual, m79SlotPills: tournamentCheck.m79SlotPills, roundOf32ProjectedMatchNumbers: tournamentCheck.roundOf32ProjectedMatchNumbers })}.`
  );
  assert(
    tournamentCheck.m89Projected === false &&
      tournamentCheck.m89TeamVisuals.length === 2 &&
      tournamentCheck.m89TeamVisuals.every(isResolvedRoundOf16Country) &&
      getCssColorAlpha(tournamentCheck.m89VersusColor) >= 0.35 &&
      (m92ResolvedState || m92ProjectedState) &&
      tournamentCheck.laterRoundLikelyVisuals.every(isMutedProjectedCountry),
    `Resolved knockout country picks should stay full-strength while any remaining projected teams stay muted. Measured ${JSON.stringify({ m89TeamVisuals: tournamentCheck.m89TeamVisuals, m89VersusColor: tournamentCheck.m89VersusColor, m92LikelyVisuals, m92LockedVisuals, m92VersusColor: tournamentCheck.m92VersusColor, laterRoundLikelyVisuals: tournamentCheck.laterRoundLikelyVisuals })}.`
  );
  const groupETopTeam = getTeam(standingsData.groups?.E?.[0]?.teamId);
  const groupETopTeamName = groupETopTeam.standingName || groupETopTeam.name;
  const expectedProjectedRoundOf32Count = fixturesData.fixtures.filter(
    (fixture) => fixture.stage === "round-of-32" && (!fixture.homeTeamId || !fixture.awayTeamId)
  ).length;
  const fixturesByMatchNumber = new Map(
    fixturesData.fixtures
      .filter((fixture) => Number.isInteger(Number(fixture.matchNumber)))
      .map((fixture) => [Number(fixture.matchNumber), fixture])
  );
  const getFixtureWinnerTeamId = (fixture) => {
    if (!fixture || fixture.status !== "FT") {
      return "";
    }

    const explicitWinner = String(fixture.winnerTeamId || fixture.winner || "").trim();
    if (explicitWinner) {
      return explicitWinner;
    }

    const scoreWinner = (score) => {
      const home = Number(score?.home);
      const away = Number(score?.away);
      if (!Number.isFinite(home) || !Number.isFinite(away) || home === away) {
        return "";
      }

      return home > away ? fixture.homeTeamId : fixture.awayTeamId;
    };

    return scoreWinner(fixture.scoreDetails?.penalties) || scoreWinner(fixture.score);
  };
  const isKnockoutSideConfirmed = (fixture, side) => {
    if (!fixture?.[`${side}TeamId`]) {
      return false;
    }

    const sourceMatch = /^(?:Winner|Loser) match (\d+)$/i.exec(fixture[`${side}Slot`] || "");
    if (!sourceMatch) {
      return true;
    }

    return Boolean(getFixtureWinnerTeamId(fixturesByMatchNumber.get(Number(sourceMatch[1]))));
  };
  const expectedProjectedLaterRoundCount = fixturesData.fixtures.filter((fixture) =>
    ["round-of-16", "quarter-finals", "semi-finals", "bronze-final", "final"].includes(fixture.stage) &&
    !(isKnockoutSideConfirmed(fixture, "home") && isKnockoutSideConfirmed(fixture, "away"))
  ).length;
  const remainingGroupIds = new Set(
    fixturesData.fixtures
      .filter((fixture) => fixture.stage === "group" && fixture.status !== "FT" && fixture.groupId)
      .map((fixture) => fixture.groupId)
  );
  const shouldRenderRoundOf32SlotOdds = (fixture, side) => {
    if (fixture?.[`${side}TeamId`]) {
      return false;
    }

    const slotText = fixture?.[`${side}Slot`] || "";
    const groupPlaceMatch = /^Group ([A-L]) (?:winner|runner-up)$/i.exec(slotText);

    if (groupPlaceMatch) {
      return remainingGroupIds.has(groupPlaceMatch[1].toUpperCase());
    }

    return /^Group [A-L](?:\/[A-L])* third place$/i.test(slotText);
  };
  const expectedRoundOf32SlotOddsCount = fixturesData.fixtures
    .filter((fixture) => fixture.stage === "round-of-32")
    .reduce(
      (count, fixture) =>
        count +
        (shouldRenderRoundOf32SlotOdds(fixture, "home") ? 1 : 0) +
        (shouldRenderRoundOf32SlotOdds(fixture, "away") ? 1 : 0),
      0
    );
  const expectedRoundOf32OpenMatchIds = fixturesData.fixtures
    .filter((fixture) => fixture.stage === "round-of-32" && fixture.homeTeamId && fixture.awayTeamId)
    .map((fixture) => fixture.id)
    .sort();
  const knockoutStagesWithOutcomePills = new Set([
    "round-of-32",
    "round-of-16",
    "quarter-finals",
    "semi-finals",
    "bronze-final",
    "final"
  ]);
  const isUnresolvedPenaltyFinal = (fixture) =>
    fixture.status === "FT" &&
    fixture.score?.home === fixture.score?.away &&
    fixture.scoreDetails?.penalties &&
    !fixture.winnerTeamId &&
    !fixture.winner;
  const hasSourcedOutcomeForecast = (fixture) => Boolean(
    fixture?.projection || Array.isArray(fixture?.conditionalProjections) && fixture.conditionalProjections.length
  );
  const expectedOutcomeListCount = fixturesData.fixtures.filter(
    (fixture) =>
      knockoutStagesWithOutcomePills.has(fixture.stage) &&
      !fixture.winnerTeamId &&
      !fixture.winner &&
      (fixture.status !== "FT" || isUnresolvedPenaltyFinal(fixture)) &&
      hasSourcedOutcomeForecast(fixture)
  ).length;
  const expectedOutcomePillCount = fixturesData.fixtures.reduce((count, fixture) => {
    if (
      !knockoutStagesWithOutcomePills.has(fixture.stage) ||
      fixture.winnerTeamId ||
      fixture.winner ||
      !(fixture.status !== "FT" || isUnresolvedPenaltyFinal(fixture))
    ) {
      return count;
    }
    if (fixture.projection) return count + 3;
    if (Array.isArray(fixture.conditionalProjections) && fixture.conditionalProjections.length) return count + 3;
    return count;
  }, 0);
  const expectedTiePillCount = fixturesData.fixtures.filter(
    (fixture) =>
      knockoutStagesWithOutcomePills.has(fixture.stage) &&
      !fixture.winnerTeamId &&
      !fixture.winner &&
      (fixture.status !== "FT" || isUnresolvedPenaltyFinal(fixture)) &&
      (fixture.projection || Array.isArray(fixture.conditionalProjections) && fixture.conditionalProjections.length)
  ).length;
  const expectedMatch74OpenMatchId =
    fixturesData.fixtures.find((fixture) => fixture.matchNumber === 74)?.id || "";
  const shouldShowOutcomePills = (fixture) => Boolean(
    fixture &&
      (fixture.status !== "FT" || isUnresolvedPenaltyFinal(fixture)) &&
      !fixture.winnerTeamId &&
      !fixture.winner &&
      hasSourcedOutcomeForecast(fixture)
  );
  const expectedMatch81Fixture = fixturesData.fixtures.find((fixture) => fixture.matchNumber === 81);
  const expectedMatch97Fixture = fixturesData.fixtures.find((fixture) => fixture.matchNumber === 97);
  const expectedMatch101Fixture = fixturesData.fixtures.find((fixture) => fixture.matchNumber === 101);
  const expectedMatch102Fixture = fixturesData.fixtures.find((fixture) => fixture.matchNumber === 102);
  const expectedMatch103Fixture = fixturesData.fixtures.find((fixture) => fixture.matchNumber === 103);
  const expectedMatch104Fixture = fixturesData.fixtures.find((fixture) => fixture.matchNumber === 104);
  const expectedM81HasOutcomePills = shouldShowOutcomePills(expectedMatch81Fixture);
  const expectedM97HasOutcomePills = shouldShowOutcomePills(expectedMatch97Fixture);
  const expectedM101HasOutcomePills = shouldShowOutcomePills(expectedMatch101Fixture);
  const expectedM102HasOutcomePills = shouldShowOutcomePills(expectedMatch102Fixture);
  const expectedM103HasOutcomePills = shouldShowOutcomePills(expectedMatch103Fixture);
  const expectedM104HasOutcomePills = shouldShowOutcomePills(expectedMatch104Fixture);
  const expectedM97ResultText = expectedMatch97Fixture?.score
    ? `${expectedMatch97Fixture.score.home}-${expectedMatch97Fixture.score.away}`
    : "";
  const expectedM81OutcomeTexts = expectedM81HasOutcomePills
    ? [
        `${expectedMatch81Fixture.homeTeamId} ${expectedMatch81Fixture.projection.home}%`,
        `TIE ${expectedMatch81Fixture.projection.draw}%`,
        `${expectedMatch81Fixture.awayTeamId} ${expectedMatch81Fixture.projection.away}%`
      ]
    : [];
  const expectedM81ResultText = expectedMatch81Fixture?.score
    ? `${expectedMatch81Fixture.score.home}-${expectedMatch81Fixture.score.away}`
    : "";
  const getExpectedKnockoutPathPicks = (fixture) => {
    const resolvedWinnerTeamId = getFixtureWinnerTeamId(fixture);
    if (resolvedWinnerTeamId) {
      const loserTeamId =
        fixture.homeTeamId === resolvedWinnerTeamId ? fixture.awayTeamId : fixture.homeTeamId;
      return { loserTeamId, winnerTeamId: resolvedWinnerTeamId };
    }

    const home = Number(fixture?.projection?.home);
    const tie = Number(fixture?.projection?.draw);
    const away = Number(fixture?.projection?.away);
    if (
      !fixture?.homeTeamId ||
      !fixture?.awayTeamId ||
      !Number.isFinite(home) ||
      !Number.isFinite(tie) ||
      !Number.isFinite(away)
    ) {
      return null;
    }

    const forecast = fixture.shootoutForecast;
    const forecastHome = Number(forecast?.home);
    const forecastAway = Number(forecast?.away);
    const forecastTotal = forecastHome + forecastAway;
    const forecastMatches =
      forecast?.homeTeamId === fixture.homeTeamId && forecast?.awayTeamId === fixture.awayTeamId;
    const decisiveTotal = home + away;
    const homeDrawShare =
      forecastMatches && Number.isFinite(forecastTotal) && forecastTotal > 0
        ? forecastHome / forecastTotal
        : decisiveTotal > 0
          ? home / decisiveTotal
          : 0.5;
    const homeAdvance = home + tie * homeDrawShare;
    const awayAdvance = away + tie * (1 - homeDrawShare);
    const winnerTeamId = homeAdvance >= awayAdvance ? fixture.homeTeamId : fixture.awayTeamId;
    const loserTeamId = winnerTeamId === fixture.homeTeamId ? fixture.awayTeamId : fixture.homeTeamId;

    return { loserTeamId, winnerTeamId };
  };
  const expectedSemiFinalPathPicks = [101, 102]
    .map((matchNumber) => fixturesByMatchNumber.get(matchNumber))
    .map(getExpectedKnockoutPathPicks);
  const expectedFinalTeamIds = expectedSemiFinalPathPicks.map((pick) => pick?.winnerTeamId).filter(Boolean);
  const expectedThirdPlaceTeamIds = expectedSemiFinalPathPicks.map((pick) => pick?.loserTeamId).filter(Boolean);
  const expectedFinalTeamNames = expectedFinalTeamIds.map((teamId) => {
    const team = getTeam(teamId);
    return team.standingName || team.name;
  });
  const expectedFinalFixture = fixturesByMatchNumber.get(104);
  const expectedThirdPlaceFixture = expectedMatch103Fixture;
  const getExpectedConditionalProjection = (fixture, teamIds) =>
    (fixture?.conditionalProjections || []).find(
      (projection) =>
        teamIds.length === 2 &&
        teamIds.every((teamId) => [projection.homeTeamId, projection.awayTeamId].includes(teamId))
    );
  const getExpectedConditionalTexts = (projection, teamIds) => projection
    ? [
        `${teamIds[0]} ${teamIds[0] === projection.homeTeamId ? projection.home : projection.away}%`,
        `TIE ${projection.draw}%`,
        `${teamIds[1]} ${teamIds[1] === projection.homeTeamId ? projection.home : projection.away}%`
      ]
    : [];
  const expectedFinalConditionalProjection = getExpectedConditionalProjection(
    expectedFinalFixture,
    expectedFinalTeamIds
  );
  const expectedThirdPlaceConditionalProjection = getExpectedConditionalProjection(
    expectedThirdPlaceFixture,
    expectedThirdPlaceTeamIds
  );
  const expectedFinalConditionalTexts = getExpectedConditionalTexts(
    expectedFinalConditionalProjection,
    expectedFinalTeamIds
  );
  const expectedThirdPlaceConditionalTexts = getExpectedConditionalTexts(
    expectedThirdPlaceConditionalProjection,
    expectedThirdPlaceTeamIds
  );
  const getExpectedLoadedTexts = (fixture, teamIds) => fixture?.projection
    ? [
        `${teamIds[0]} ${fixture.projection.home}%`,
        `TIE ${fixture.projection.draw}%`,
        `${teamIds[1]} ${fixture.projection.away}%`
      ]
    : [];
  const expectedFinalOutcomeBasis = !expectedM104HasOutcomePills
    ? ""
    : expectedFinalFixture?.projection
      ? "loaded"
      : "conditional-model";
  const expectedThirdPlaceOutcomeBasis = !expectedM103HasOutcomePills
    ? ""
    : expectedThirdPlaceFixture?.projection
      ? "loaded"
      : "conditional-model";
  const expectedFinalOutcomeTexts = !expectedM104HasOutcomePills
    ? []
    : expectedFinalFixture?.projection
      ? getExpectedLoadedTexts(expectedFinalFixture, expectedFinalTeamIds)
      : expectedFinalConditionalTexts;
  const expectedThirdPlaceOutcomeTexts = !expectedM103HasOutcomePills
    ? []
    : expectedThirdPlaceFixture?.projection
      ? getExpectedLoadedTexts(expectedThirdPlaceFixture, expectedThirdPlaceTeamIds)
      : expectedThirdPlaceConditionalTexts;
  const tournamentCheckPredicates = [
    ["summaryHasRoundOf32", tournamentCheck.summary.includes("Round of 32 slots")],
    ["m73ProgressDate", tournamentCheck.m73ProgressText.includes("Jun 28 12:00PM")],
    ["m73ProgressNotDatedWithSlash", !tournamentCheck.m73ProgressText.includes("Jun 28 / 12:00PM")],
    ["m74ProgressIncludesGroupETop", tournamentCheck.m74ProgressText.includes(groupETopTeamName)],
    ["m74ProgressIncludesParaguay", tournamentCheck.m74ProgressText.includes("Paraguay")],
    ["m74VenueText", tournamentCheck.m74VenueText === "Massachusetts, USA"],
    ["m74NoBostonMention", !tournamentCheck.m74ProgressText.includes("Boston Stadium")],
    ["m74NoFoxboroughMention", !tournamentCheck.m74ProgressText.includes("Foxborough")],
    ["m74VenueTooltip", tournamentCheck.m74VenueTooltip === "Boston Stadium • Foxborough, Massachusetts, USA"],
    ["m74NoGroupE1", !tournamentCheck.m74ProgressText.includes("Group E1")],
    ["m74NoGroupETop", !tournamentCheck.m74ProgressText.includes("Group E Top 1")],
    ["m81TeamIds", tournamentCheck.m81TeamIds.length === 2],
    ["m81NotThirdPlace", !tournamentCheck.m81Text.includes("Group B/E/F/I/J third place")],
    ["countryTooltipCount", tournamentCheck.countryTooltipCount === 0],
    ["slotOddsCount", tournamentCheck.slotOddsCount === 0],
    ["slotOddsToneMismatches", tournamentCheck.slotOddsToneMismatches.length === 0],
    [
      "projectedCount",
      tournamentCheck.projectedCount === expectedProjectedRoundOf32Count + expectedProjectedLaterRoundCount
    ],
    ["roundOf32ProjectedCount", tournamentCheck.roundOf32ProjectedCount === expectedProjectedRoundOf32Count],
    ["roundOf32ProjectedMatchNumbers", tournamentCheck.roundOf32ProjectedMatchNumbers.length === expectedProjectedRoundOf32Count],
    [
      "roundOf32OpenMatchIds",
      tournamentCheck.roundOf32OpenMatchIds.slice().sort().join("|") === expectedRoundOf32OpenMatchIds.join("|")
    ],
    ["m73FooterCount", tournamentCheck.m73FooterCount === 1],
    ["m73Projected", tournamentCheck.m73Projected === false],
    ["m74Projected", tournamentCheck.m74Projected === false],
    ["m73OpenMatchId", tournamentCheck.m73OpenMatchId === "match-73-round-of-32-2026-06-28"],
    ["m74OpenMatchId", tournamentCheck.m74OpenMatchId === expectedMatch74OpenMatchId],
    ["m74Winner", tournamentCheck.m74Winner === "PAR"],
    ["m74ResultPills", tournamentCheck.m74ResultPills.join("|") === "1-1 (3-4 pens)"],
    ["m75Winner", tournamentCheck.m75Winner === "MAR"],
    ["m75ResultPills", tournamentCheck.m75ResultPills.join("|") === "1-1 (2-3 pens)"],
    ["m73NoRoundOf32", !tournamentCheck.m73ProgressText.includes("Round of 32")],
    ["likelihoodCount", tournamentCheck.likelihoodCount === expectedOutcomePillCount],
    ["likelihoodNonNeutralCount", tournamentCheck.likelihoodNonNeutralCount === 0],
    ["likelihoodTooltipCount", tournamentCheck.likelihoodTooltipCount === tournamentCheck.likelihoodCount],
    ["likelihoodTooltipMaxLength", tournamentCheck.likelihoodTooltipMaxLength <= 240],
    ["likelihoodListCount", tournamentCheck.likelihoodListCount === expectedOutcomeListCount],
    ["outcomePillFlagCount", tournamentCheck.outcomePillFlagCount === 0],
    ["tiePillCount", tournamentCheck.tiePillCount === expectedTiePillCount],
    ["tiePillFlagCount", tournamentCheck.tiePillFlagCount === 0],
    ["m81PillCount", tournamentCheck.m81PillCount === (expectedM81HasOutcomePills ? 3 : 0)],
    ["m81OutcomeKeys", !expectedM81HasOutcomePills || tournamentCheck.m81OutcomeKeys.join("|") === "home|tie|away"],
    [
      "m81OutcomeTexts",
      !expectedM81HasOutcomePills || tournamentCheck.m81OutcomeTexts.join("|") === expectedM81OutcomeTexts.join("|")
    ],
    [
      "m81OutcomeTextFormats",
      !expectedM81HasOutcomePills || tournamentCheck.m81OutcomeTexts.every((text) => /^(?:[A-Z]{3}|TIE)\s+\d+%$/.test(text))
    ],
    [
      "m81ResultText",
      expectedM81HasOutcomePills || (expectedM81ResultText && tournamentCheck.m81Text.includes(expectedM81ResultText))
    ],
    ["m89PillCount", tournamentCheck.m89PillCount === 0 || tournamentCheck.m89PillCount === 3],
    ["m89SeedLabelCount", tournamentCheck.m89SeedLabelCount === 0],
    ["m97PillCount", tournamentCheck.m97PillCount === (expectedM97HasOutcomePills ? 3 : 0)],
    [
      "m97ResultText",
      expectedM97HasOutcomePills || (expectedM97ResultText && tournamentCheck.m97Text.includes(expectedM97ResultText))
    ],
    ["m97SeedLabelCount", tournamentCheck.m97SeedLabelCount === 0],
    ["m103PillCount", tournamentCheck.m103PillCount === (expectedM103HasOutcomePills ? 3 : 0)],
    [
      "m103Projected",
      tournamentCheck.m103Projected ===
        !(isKnockoutSideConfirmed(expectedThirdPlaceFixture, "home") && isKnockoutSideConfirmed(expectedThirdPlaceFixture, "away"))
    ],
    ["m103ConditionalBasis", tournamentCheck.m103OutcomeBasis === expectedThirdPlaceOutcomeBasis],
    [
      "m103ConditionalKeys",
      tournamentCheck.m103OutcomeKeys.join("|") === (expectedM103HasOutcomePills ? "home|tie|away" : "")
    ],
    [
      "m103ConditionalTexts",
      tournamentCheck.m103OutcomeTexts.join("|") === expectedThirdPlaceOutcomeTexts.join("|")
    ],
    ["m104PillCount", tournamentCheck.m104PillCount === (expectedM104HasOutcomePills ? 3 : 0)],
    ["m104ConditionalBasis", tournamentCheck.m104OutcomeBasis === expectedFinalOutcomeBasis],
    [
      "m104ConditionalKeys",
      tournamentCheck.m104OutcomeKeys.join("|") === (expectedM104HasOutcomePills ? "home|tie|away" : "")
    ],
    [
      "m104ConditionalTexts",
      tournamentCheck.m104OutcomeTexts.join("|") === expectedFinalOutcomeTexts.join("|")
    ],
    [
      "m104ConditionalTooltips",
      !expectedM104HasOutcomePills ||
        (tournamentCheck.m104OutcomeTooltips.length === 3 &&
          tournamentCheck.m104OutcomeTooltips[1].startsWith("If it goes to penalties") &&
          (expectedFinalOutcomeBasis === "loaded"
            ? tournamentCheck.m104OutcomeTooltips[0].includes("chance to win in regulation") &&
              tournamentCheck.m104OutcomeTooltips[2].includes("chance to win in regulation")
            : tournamentCheck.m104OutcomeTooltips[0].includes("Online-calibrated from Opta and markets") &&
              tournamentCheck.m104OutcomeTooltips[2].includes("direct odds replace it once set")))
    ],
    ["connectorStrokeValues", tournamentCheck.connectorStrokeValues.length === 1],
    ["connectorStrokeValue", tournamentCheck.connectorStrokeValues[0] === "rgb(217, 217, 217)"],
    ["connectorStrokeWidths", tournamentCheck.connectorStrokeWidths.length === 1],
    ["connectorStrokeWidth", tournamentCheck.connectorStrokeWidths[0] >= 2.5],
    ["m89TeamIds", tournamentCheck.m89TeamIds.length === 2],
    ["m97TeamIds", tournamentCheck.m97TeamIds.length === 2],
    [
      "m103TeamIdsFollowSemiFinalForecasts",
      expectedThirdPlaceTeamIds.length === 2 &&
        tournamentCheck.m103TeamIds.join("|") === expectedThirdPlaceTeamIds.join("|")
    ],
    [
      "m104TeamIdsFollowSemiFinalForecasts",
      expectedFinalTeamIds.length === 2 &&
        tournamentCheck.m104TeamIds.join("|") === expectedFinalTeamIds.join("|")
    ],
    ["finalRailConnectorPathCount", tournamentCheck.finalRailConnectorPathCount === 1],
    ["finalRailMoveCount", tournamentCheck.finalRailMoveCount >= 5],
    ["semi101RunnerUpNextMatch", tournamentCheck.semi101RunnerUpNextMatch === "103"],
    ["semi102RunnerUpNextMatch", tournamentCheck.semi102RunnerUpNextMatch === "103"],
    ["m104Rect", Boolean(tournamentCheck.m104Rect)],
    ["m103Rect", Boolean(tournamentCheck.m103Rect)],
    ["semi101Rect", Boolean(tournamentCheck.semi101Rect)],
    ["semi102Rect", Boolean(tournamentCheck.semi102Rect)],
    ["m104LeftAligned", Math.abs(tournamentCheck.m104Rect.left - tournamentCheck.m103Rect.left) <= 1],
    ["m104RightOfSemi101", tournamentCheck.m104Rect.center > tournamentCheck.semi101Rect.center + 24],
    ["m103LeftOfSemi102", tournamentCheck.m103Rect.center < tournamentCheck.semi102Rect.center - 24],
    ["m103BelowM104", tournamentCheck.m103Rect.top > tournamentCheck.m104Rect.bottom],
    ["m103CloseToM104", tournamentCheck.m103Rect.top - tournamentCheck.m104Rect.bottom <= 180],
    ["likelihoodTextHasTie", expectedTiePillCount === 0 || tournamentCheck.likelihoodText.includes("TIE")],
    ["likelihoodTextNoHere", !tournamentCheck.likelihoodText.includes("here")],
    ["likelihoodTextNoNamedCountryWithPercent", !/\d+%\s+(?:Germany|Sweden|France|Canada|Argentina|Spain|Morocco|Japan)\b/.test(tournamentCheck.likelihoodText)],
    ["slotOddsNoGermany", !tournamentCheck.slotOddsText.includes("Germany ")],
    ["slotOddsNoBosnia", !tournamentCheck.slotOddsText.includes("Bosnia and Herzegovina ")],
    ["slotOddsFlagCount", tournamentCheck.slotOddsFlagCount === 0],
    ["rankCount", tournamentCheck.rankCount >= 32],
    ["m89NoGroupLabel", !/\bGroup [A-L]\d\b/.test(tournamentCheck.m89Text)],
    ["m97NoGroupLabel", !/\bGroup [A-L]\d\b/.test(tournamentCheck.m97Text)],
    [
      "m89TooltipProjectsWin",
      tournamentCheck.m89PillCount === 0 || tournamentCheck.m89Tooltips.includes("chance to win in regulation")
    ],
    [
      "m97TooltipChanceWin",
      !expectedM97HasOutcomePills || tournamentCheck.m97Tooltips.includes("chance to win in regulation")
    ],
    ["likelihoodTooltipsShootoutFirst", expectedTiePillCount === 0 || tournamentCheck.likelihoodTooltips.includes("If it goes to penalties")],
    ["likelihoodTooltipsNoRegulationPreamble", !tournamentCheck.likelihoodTooltips.includes("chance of a tie after 90 minutes")],
    ["likelihoodTooltipsNoUpset", !tournamentCheck.likelihoodTooltips.includes("pull off the upset")],
    [
      "m88AwayTooltip",
      !tournamentCheck.m88AwayTooltip ||
        tournamentCheck.m88AwayTooltip.includes("Egypt have a 40% chance to win in regulation.")
    ],
    ["m88AwayNoUpset", !tournamentCheck.m88AwayTooltip.includes("upset")],
    [
      "likelihoodTooltipsNoRefNames",
      !/(Michael Olise|Robin Risser|Oliver Baumann|Alexander Nübel|Alexander Nubel)/.test(tournamentCheck.likelihoodTooltips)
    ],
    ["likelihoodTooltipsNoMarketNeutral", !tournamentCheck.likelihoodTooltips.includes("no clear edge")],
    [
      "likelihoodTooltipsNoUnsupportedPlayerEdge",
      !/(shootout edge through|Kylian Mbappé|Ousmane Dembélé|Diogo Costa)/.test(
        tournamentCheck.likelihoodTooltips
      )
    ],
    [
      "m101TieTooltip",
      !expectedM101HasOutcomePills ||
        (tournamentCheck.m101TieTooltip.includes("Unai Simón has saved 8 of 22 shootout kicks") &&
          tournamentCheck.m101TieTooltip.includes("Oyarzabal converts 89% of career penalties"))
    ],
    [
      "m102TieTooltip",
      !expectedM102HasOutcomePills ||
        (tournamentCheck.m102TieTooltip.includes("won 6 of 7 World Cup shootouts") &&
          tournamentCheck.m102TieTooltip.includes("Emiliano Martínez has never lost one for his country"))
    ],
    [
      "m103TieTooltip",
      !expectedM103HasOutcomePills || tournamentCheck.m103TieTooltip.startsWith("If it goes to penalties")
    ],
    [
      "m104TieTooltip",
      !expectedM104HasOutcomePills ||
        (tournamentCheck.m104TieTooltip.startsWith("If it goes to penalties") &&
          expectedFinalTeamNames.length === 2)
    ],
    [
      "m83TieTooltip",
      !tournamentCheck.m83TieTooltip || tournamentCheck.m83TieTooltip.includes("If it goes to penalties")
    ],
    [
      "m86TieTooltip",
      !tournamentCheck.m86TieTooltip || tournamentCheck.m86TieTooltip.includes("If it goes to penalties")
    ],
    ["m89NoTbd", !tournamentCheck.m89Text.includes("TBD")],
    ["m97NoTbd", !tournamentCheck.m97Text.includes("TBD")],
    ["m103NoTbd", !tournamentCheck.m103Text.includes("TBD")],
    ["m103TimeText", tournamentCheck.m103TimeText === "Jul 18 2:00PM (3rd place match)"],
    ["m104TimeText", tournamentCheck.m104TimeText === "Jul 19 12:00PM (Final)"],
    ["m103NoThirdPlaceText", !tournamentCheck.m103Text.includes("Third-place play-off")],
    ["m103NoRunnerUpText", !tournamentCheck.m103Text.includes("Runner-up match")],
    ["m89NoLikelyForNow", !tournamentCheck.m89Text.includes("Likely for now")],
    ["m97NoLikelyForNow", !tournamentCheck.m97Text.includes("Likely for now")],
    ["sectionHeadingVisible", !tournamentCheck.sectionHeadingVisible],
    ["noOldWinnerCopy", !tournamentCheck.oldWinnerCopy],
    ["posterMetaCount", tournamentCheck.posterMetaCount === 0],
    ["posterSeedCount", tournamentCheck.posterSeedCount === 0],
    ["thirdPlaceSeedTeamIds", tournamentCheck.thirdPlaceSeedTeamIds.length === 0],
    ["noWinnerMatchCopy", !/\bWinner match \d+\b/.test(tournamentCheck.progressText)],
    ["noWinnerToken", !/\b(?:M\d+|To M\d+|Winner M\d+|W M\d+)\b/.test(`${tournamentCheck.r32Text} ${tournamentCheck.progressText}`)],
    ["roundHeadings", tournamentCheck.roundHeadings.join("|") === "Round of 32|Round of 16|Quarter-finals|Semi-finals|Final"]
  ];
  const failedTournamentPredicates = tournamentCheckPredicates.filter(([, check]) => !check).map(([name]) => name);
  if (failedTournamentPredicates.length > 0) {
    console.log("FAILED TOURNAMENT PREDICATES", failedTournamentPredicates.join(", "));
  }
  assert(
    failedTournamentPredicates.length === 0,
    `The tournament section should show sourced three-way forecasts for confirmed and projected matchups, including tie-to-extra-time context, without a rank-only fallback. Measured ${JSON.stringify({ ...tournamentCheck, expectedRoundOf32OpenMatchIds, expectedRoundOf32SlotOddsCount, expectedOutcomePillCount, expectedOutcomeListCount })}.`
  );

  const argentinaFinalProjectionCheck = await openPageAtTime(
    "2026-07-14T23:00:00.000Z",
    "/?view=standings&standingsMode=tournament&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const final = data.fixtures.find((fixture) => fixture.matchNumber === 104);
        final.status = "SCHEDULED";
        delete final.score;
        delete final.scoreDetails;
        delete final.winnerTeamId;
        delete final.winner;
        delete final.goalsHome;
        delete final.goalsAway;
        delete final.projection;
      }
    }
  );
  await argentinaFinalProjectionCheck.page.waitForSelector('.progress-match[data-match-number="104"]');
  const argentinaFinalProjection = await argentinaFinalProjectionCheck.page.evaluate(() => {
    const match = document.querySelector('.progress-match[data-match-number="104"]');
    return {
      basis: match?.querySelector(".knockout-likelihood-list")?.dataset.outcomeBasis || "",
      teamIds: [...(match?.querySelectorAll(".knockout-team[data-team-id]") || [])].map(
        (element) => element.dataset.teamId
      ),
      texts: [...(match?.querySelectorAll(".knockout-likelihood") || [])].map((element) =>
        element.textContent.replace(/\s+/g, " ").trim()
      ),
      tooltips: [...(match?.querySelectorAll(".knockout-likelihood") || [])].map(
        (element) => element.getAttribute("data-tooltip") || ""
      ),
      tieCount: match?.querySelectorAll('[data-outcome="tie"]').length || 0
    };
  });
  assert(
    argentinaFinalProjection.basis === "conditional-model" &&
      argentinaFinalProjection.teamIds.join("|") === "ESP|ARG" &&
      argentinaFinalProjection.texts.join("|") === "ESP 40%|TIE 31%|ARG 29%" &&
      argentinaFinalProjection.tieCount === 1 &&
      argentinaFinalProjection.tooltips[0].includes("Online-calibrated from Opta and markets") &&
      argentinaFinalProjection.tooltips[1].startsWith("If it goes to penalties") &&
      argentinaFinalProjection.tooltips[2].includes("direct odds replace it once set"),
    `A projected Spain-Argentina final should use its sourced regulation 1X2 scenario with tie-to-penalties context. Measured ${JSON.stringify(argentinaFinalProjection)}.`
  );
  await argentinaFinalProjectionCheck.context.close();



  const zhTournamentTooltipCheck = await openPageAtTime(
    "2026-06-27T23:30:00.000Z",
    "/?view=standings&standingsMode=tournament&lang=zh&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const final = data.fixtures.find((fixture) => fixture.matchNumber === 104);
        final.status = "SCHEDULED";
        delete final.score;
        delete final.scoreDetails;
        delete final.winnerTeamId;
        delete final.winner;
        delete final.goalsHome;
        delete final.goalsAway;
        delete final.projection;
      }
    }
  );
  await zhTournamentTooltipCheck.page.waitForSelector('.progress-match[data-match-number="88"]');
  const zhTournamentTooltips = await zhTournamentTooltipCheck.page.evaluate(() => {
    const getOutcomeTooltip = (matchNumber, outcome) =>
      document
        .querySelector(`.progress-match[data-match-number="${matchNumber}"] .knockout-likelihood[data-outcome="${outcome}"]`)
        ?.getAttribute("data-tooltip") || "";
    const all = [...document.querySelectorAll(".knockout-likelihood")]
      .map((element) => element.getAttribute("data-tooltip") || "")
      .join(" ");

    return {
      all,
      m88Away: getOutcomeTooltip(88, "away"),
      m101Tie: getOutcomeTooltip(101, "tie"),
      m102Tie: getOutcomeTooltip(102, "tie"),
      m103Tie: getOutcomeTooltip(103, "tie"),
      m104Tie: getOutcomeTooltip(104, "tie"),
      m104Home: getOutcomeTooltip(104, "home"),
      m104Away: getOutcomeTooltip(104, "away")
    };
  });
  const hasM88AwayTooltip = Boolean(zhTournamentTooltips.m88Away);
  assert(
    (!hasM88AwayTooltip ||
      (zhTournamentTooltips.m88Away.includes("埃及点球前取胜概率约35%。这场很接近，但澳大利亚略占优势。") &&
        !zhTournamentTooltips.m88Away.includes("爆冷"))) &&
      (!expectedM101HasOutcomePills ||
        (zhTournamentTooltips.m101Tie.includes("面对22次点球大战罚球扑出8次") &&
          zhTournamentTooltips.m101Tie.includes("职业生涯点球命中率为89%"))) &&
      (!expectedM102HasOutcomePills ||
        (zhTournamentTooltips.m102Tie.includes("7次世界杯点球大战中赢下6次") &&
          zhTournamentTooltips.m102Tie.includes("代表国家队参加点球大战从未失利"))) &&
      (!expectedM103HasOutcomePills || zhTournamentTooltips.m103Tie.startsWith("如果进入点球大战")) &&
      zhTournamentTooltips.m104Tie.startsWith("如果进入点球大战") &&
      zhTournamentTooltips.m104Home.includes("常规时间取胜概率约为") &&
      zhTournamentTooltips.m104Home.includes("条件模型综合Opta与市场") &&
      zhTournamentTooltips.m104Away.includes("对阵确定后改用直接赔率") &&
      !/chance|penalties|shootout|goalkeeper|favored|upset|projects|before penalties/i.test(zhTournamentTooltips.all),
    `Chinese tournament outcome tooltips should use localized close-match wording and avoid stale English/upset templates. Measured ${JSON.stringify(zhTournamentTooltips)}.`
  );
  await zhTournamentTooltipCheck.context.close();

  await page.locator('.progress-match[data-match-number="73"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector("#matches-tab")?.getAttribute("aria-selected") === "true" &&
      document.querySelector('.match-row[data-match-id="match-73-round-of-32-2026-06-28"]')?.classList.contains("is-selected") &&
      document.querySelector("#match-info:not([hidden])")
  );
  const lockedBracketNavigation = await page.evaluate(() => {
    const params = new URL(window.location.href).searchParams;
    return {
      date: params.get("date"),
      match: params.get("match"),
      selectedRowPressed: document
        .querySelector('.match-row[data-match-id="match-73-round-of-32-2026-06-28"] .match-row-trigger')
        ?.getAttribute("aria-pressed"),
      stageLinkTarget: document.querySelector("#match-info [data-open-tournament-tab]")?.dataset.tournamentMatchNumber || "",
      stageLinkText: document.querySelector("#match-info [data-open-tournament-tab]")?.textContent.trim() || "",
      view: params.get("view")
    };
  });
  assert(
    (lockedBracketNavigation.date === "2026-06-28" || lockedBracketNavigation.date === null) &&
      (lockedBracketNavigation.match === "match-73-round-of-32-2026-06-28" ||
        lockedBracketNavigation.match === null) &&
      lockedBracketNavigation.selectedRowPressed === "true" &&
      lockedBracketNavigation.stageLinkTarget === "73" &&
      lockedBracketNavigation.stageLinkText === "Round of 32" &&
      lockedBracketNavigation.view === null,
    `Locked tournament cards should open the matching date, row, and info card. Measured ${JSON.stringify(lockedBracketNavigation)}.`
  );

  await page.locator("#match-info [data-open-tournament-tab]").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#standings-tab")?.getAttribute("aria-selected") === "true" &&
      document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed") === "true" &&
      document.querySelector(".tournament-view") &&
      document.querySelector('.progress-match[data-match-number="73"]')?.classList.contains("is-drill-target") &&
      document.activeElement === document.querySelector('.progress-match[data-match-number="73"]')
  );
  assert(
    !new URL(page.url()).searchParams.has("standingsMode"),
    "Clicking the knockout round label in match info should jump back to the Tournament tab."
  );
  const roundOf32StageLinkTarget = await page.evaluate(() => ({
    activeMatchNumber: document.activeElement?.dataset?.matchNumber || "",
    highlighted: document
      .querySelector('.progress-match[data-match-number="73"]')
      ?.classList.contains("is-drill-target"),
    view: new URL(window.location.href).searchParams.get("view")
  }));
  assert(
    roundOf32StageLinkTarget.activeMatchNumber === "73" &&
      roundOf32StageLinkTarget.highlighted === true &&
      roundOf32StageLinkTarget.view === "standings",
    `Clicking a knockout round label should focus and highlight the exact bracket card. Measured ${JSON.stringify(roundOf32StageLinkTarget)}.`
  );

  await page.goto(`${baseUrl}?view=matches&date=2026-07-15&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('.match-row[data-match-id="match-102-semi-final-2026-07-15"]');
  await page.locator('[data-match-id="match-102-semi-final-2026-07-15"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector("#match-info:not([hidden])") &&
      document.querySelector("#match-info [data-open-tournament-tab]")?.dataset.tournamentMatchNumber === "102"
  );
  await page.waitForSelector("#match-info .lineup-preview-block");
  await page.locator('#match-info [data-lineup-bench-toggle="home"]').click();
  await page.waitForFunction(() =>
    document.querySelector('#match-info [data-lineup-bench-panel="home"]')?.classList.contains("is-open")
  );
  const englandSuspendedBenchState = await page.evaluate(() => {
    const button = document.querySelector('#match-info [data-lineup-bench-toggle="home"]');
    const panel = document.querySelector('#match-info [data-lineup-bench-panel="home"]');
    const rows = [...(panel?.querySelectorAll(".lineup-bench-player") || [])];
    const unavailableRows = rows.filter((row) => row.classList.contains("is-unavailable"));
    const quansah = unavailableRows.find((row) => row.dataset.lineupPlayerName === "Jarell Quansah");
    const cardTrigger = quansah?.querySelector('[data-player-card-trigger="true"]');
    const redCard = quansah?.querySelector(".lineup-bench-availability-icon.is-red");
    const styles = quansah ? getComputedStyle(quansah) : null;

    return {
      benchAriaLabel: button?.getAttribute("aria-label") || "",
      benchCount: button?.querySelector(".lineup-bench-count")?.textContent.trim() || "",
      cardAriaLabel: cardTrigger?.getAttribute("aria-label") || "",
      eligibleRows: rows.filter((row) => !row.classList.contains("is-unavailable")).length,
      lastPlayerName: rows.at(-1)?.dataset.lineupPlayerName || "",
      playerCardTriggers: quansah?.querySelectorAll('[data-player-card-trigger="true"]').length || 0,
      position: quansah?.querySelector(".lineup-bench-position")?.textContent.trim() || "",
      redCardAriaLabel: redCard?.getAttribute("aria-label") || "",
      redCardTooltip: redCard?.getAttribute("data-tooltip") || "",
      rowAriaLabel: quansah?.getAttribute("aria-label") || "",
      rowColor: styles?.color || "",
      rowCount: rows.length,
      visibleStatusCount: quansah?.querySelectorAll(".lineup-bench-availability-status").length || 0,
      substitutionControls: quansah?.querySelectorAll("[data-lineup-substitution-toggle]").length || 0,
      unavailableRows: unavailableRows.length,
      uniformNumber: quansah?.querySelector(".lineup-bench-number")?.textContent.trim() || ""
    };
  });
  assert(
    englandSuspendedBenchState.benchAriaLabel === "Bench: 14" &&
      englandSuspendedBenchState.benchCount === "14" &&
      englandSuspendedBenchState.eligibleRows === 14 &&
      englandSuspendedBenchState.rowCount === 15 &&
      englandSuspendedBenchState.unavailableRows === 1 &&
      englandSuspendedBenchState.lastPlayerName === "Jarell Quansah" &&
      englandSuspendedBenchState.uniformNumber === "26" &&
      englandSuspendedBenchState.position === "CB" &&
      englandSuspendedBenchState.visibleStatusCount === 0 &&
      englandSuspendedBenchState.substitutionControls === 0 &&
      englandSuspendedBenchState.playerCardTriggers === 1 &&
      englandSuspendedBenchState.cardAriaLabel.includes("Jarell Quansah") &&
      englandSuspendedBenchState.rowAriaLabel.includes("Suspended and unavailable") &&
      englandSuspendedBenchState.redCardAriaLabel.includes("Suspended and unavailable") &&
      englandSuspendedBenchState.redCardTooltip ===
        "Red-card suspension • Sent off against Mexico • Second of two matches; ends after England vs Argentina" &&
      englandSuspendedBenchState.rowColor === "rgba(10, 10, 10, 0.38)",
    `England's semifinal bench should announce 14 eligible substitutes and append Quansah as a grey unavailable player whose suspension stays in the tooltip and accessibility copy. Measured ${JSON.stringify(englandSuspendedBenchState)}.`
  );
  const quansahSuspensionBadge = page.locator(
    '#match-info [data-lineup-player-name="Jarell Quansah"] .lineup-bench-availability-icon.is-red'
  );
  await page.evaluate(() => {
    const originalMatchMedia = window.matchMedia.bind(window);
    window.__uiSmokeOriginalMatchMedia = window.matchMedia;
    window.matchMedia = (query) => {
      const result = originalMatchMedia(query);
      if (query !== "(hover: none), (pointer: coarse)") {
        return result;
      }

      return new Proxy(result, {
        get(target, property) {
          if (property === "matches") {
            return true;
          }
          const value = Reflect.get(target, property, target);
          return typeof value === "function" ? value.bind(target) : value;
        }
      });
    };
  });
  await quansahSuspensionBadge.scrollIntoViewIfNeeded();
  const suspensionTooltipState = await quansahSuspensionBadge.evaluate((badge) => {
    badge.focus();
    badge.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    const tooltip = document.querySelector(".lineup-event-tooltip-floating.is-visible");
    const bounds = tooltip?.getBoundingClientRect();
    const styles = tooltip ? getComputedStyle(tooltip) : null;
    return {
      badgeFocused: document.activeElement === badge,
      bounds: bounds
        ? {
            bottom: Math.round(bounds.bottom),
            left: Math.round(bounds.left),
            right: Math.round(bounds.right),
            top: Math.round(bounds.top)
          }
        : null,
      clientWidth: tooltip?.clientWidth || 0,
      scrollWidth: tooltip?.scrollWidth || 0,
      text: tooltip?.textContent.trim() || "",
      viewport: { height: window.innerHeight, width: window.innerWidth },
      whiteSpace: styles?.whiteSpace || ""
    };
  });
  await page.evaluate(() => {
    window.matchMedia = window.__uiSmokeOriginalMatchMedia;
    delete window.__uiSmokeOriginalMatchMedia;
  });
  assert(
    suspensionTooltipState.badgeFocused &&
      suspensionTooltipState.text ===
      "Red-card suspension • Sent off against Mexico • Second of two matches; ends after England vs Argentina" &&
      suspensionTooltipState.whiteSpace === "normal" &&
      suspensionTooltipState.scrollWidth <= suspensionTooltipState.clientWidth + 1 &&
      suspensionTooltipState.bounds?.left >= 0 &&
      suspensionTooltipState.bounds?.right <= suspensionTooltipState.viewport.width &&
      suspensionTooltipState.bounds?.top >= 0 &&
      suspensionTooltipState.bounds?.bottom <= suspensionTooltipState.viewport.height,
    `The suspension tooltip should wrap inside its floating box and stay within the viewport. Measured ${JSON.stringify(suspensionTooltipState)}.`
  );
  await page.keyboard.press("Escape");
  const quansahBenchProfileTrigger = page.locator(
    '#match-info [data-lineup-player-name="Jarell Quansah"] [data-player-card-trigger="true"]'
  );
  await quansahBenchProfileTrigger.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".player-card")].some((card) => {
      const style = getComputedStyle(card);
      const bounds = card.getBoundingClientRect();
      return (
        card.querySelector(".player-card-name")?.textContent.trim() === "Jarell Quansah" &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0.05 &&
        bounds.width > 0 &&
        bounds.height > 0
      );
    })
  );
  await page.keyboard.press("Escape");
  await page.locator("#match-info [data-open-tournament-tab]").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed") === "true" &&
      document.querySelector('.progress-match[data-match-number="102"]')?.classList.contains("is-drill-target") &&
      document.activeElement === document.querySelector('.progress-match[data-match-number="102"]')
  );
  const semiFinalStageLinkTarget = await page.evaluate(() => ({
    activeMatchNumber: document.activeElement?.dataset?.matchNumber || "",
    highlighted: document
      .querySelector('.progress-match[data-match-number="102"]')
      ?.classList.contains("is-drill-target"),
    tabIndex: document.querySelector('.progress-match[data-match-number="102"]')?.getAttribute("tabindex") || ""
  }));
  assert(
    semiFinalStageLinkTarget.activeMatchNumber === "102" &&
      semiFinalStageLinkTarget.highlighted === true &&
      semiFinalStageLinkTarget.tabIndex === "0",
    `Clicking a semi-final round label should focus and highlight its scheduled bracket card. Measured ${JSON.stringify(semiFinalStageLinkTarget)}.`
  );
	  await page.goto(`${baseUrl}?view=standings&tz=America%2FLos_Angeles`, {
	    waitUntil: "load"
	  });
	  await page.waitForFunction(
	    () =>
	      document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed") === "true" &&
	      document.querySelector('.progress-match[data-match-number="74"]')
	  );
	  let directTournamentConnectorsReady = true;
	  try {
	    await page.waitForFunction(
	      () => document.querySelectorAll(".progress-connectors path").length >= 29,
	      null,
	      { timeout: 5000 }
	    );
	  } catch {
	    directTournamentConnectorsReady = false;
	  }
	  const directTournamentConnectorState = await page.evaluate(() => {
	    const svgRect = document.querySelector(".progress-connectors")?.getBoundingClientRect();

	    return {
	      pathCount: document.querySelectorAll(".progress-connectors path").length,
	      svgBox: svgRect
	        ? {
	            height: Math.round(svgRect.height),
	            width: Math.round(svgRect.width)
	          }
	        : null,
	      tournamentVisible: !document.querySelector("#standings-panel")?.hidden
	    };
	  });
	  assert(
	    directTournamentConnectorsReady && directTournamentConnectorState.pathCount >= 29,
	    `Direct Tournament loads should draw connector rails without needing a tab switch. Measured ${JSON.stringify(directTournamentConnectorState)}.`
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
        const match74Pair = match74?.querySelector(".knockout-match-pair");
        const match74PairStyle = match74Pair ? getComputedStyle(match74Pair) : null;
        const match74Teams = [...(match74?.querySelectorAll(".knockout-team") || [])];
        const match74TeamTops = match74Teams.map((team) => Math.round(team.getBoundingClientRect().top));
        const match74VsTop = Math.round(match74?.querySelector(".knockout-versus")?.getBoundingClientRect().top || 0);
        const match74Venue = match74?.querySelector(".knockout-match-venue");
        const match74VenueStyle = match74Venue ? getComputedStyle(match74Venue) : null;
        const match74OutcomePills = [...(match74?.querySelectorAll(".knockout-likelihood") || [])];
        const match74ResultPills = [...(match74?.querySelectorAll(".knockout-result-pill") || [])]
          .map((pill) => pill.textContent.replace(/\s+/g, " ").trim());
        const seedLabels = [...document.querySelectorAll('.progress-match .knockout-team-copy small')]
          .map((label) => label.textContent.trim());
        const match74OutcomeKeys = [...document.querySelectorAll('.progress-match[data-match-number="74"] .knockout-likelihood')]
          .map((pill) => pill.dataset.outcome || "");
        const connector = document.querySelector(".progress-connectors");
        const connectorDisplay = connector ? getComputedStyle(connector).display : "";
        const connectorPath = connector?.querySelector("path");
        const connectorPathStyle = connectorPath ? getComputedStyle(connectorPath) : null;
        const progressionStyle = progression ? getComputedStyle(progression) : null;
        const progressionRect = progression?.getBoundingClientRect();
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
          cardWidth: matchRect ? Math.round(matchRect.width) : 0,
          connectorDisplay,
          connectorLineCap: connectorPathStyle?.strokeLinecap || "",
          connectorStroke: connectorPathStyle?.stroke || "",
          connectorPathCount: document.querySelectorAll(".progress-connectors path").length,
          connectorStrokeWidth: connectorPathStyle ? Number.parseFloat(connectorPathStyle.strokeWidth) : 0,
          match74PairJustifyContent: match74PairStyle?.justifyContent || "",
          match74OutcomeKeys,
          match74ResultPills,
          match74TieFlagCount: match74?.querySelectorAll('.knockout-likelihood[data-outcome="tie"] .flag').length || 0,
          match74SingleLine: match74TeamTops.length === 2 && match74TeamTops.every((top) => Math.abs(top - match74VsTop) <= 2),
          match74VenueCursor: match74VenueStyle?.cursor || "",
          match74VenueText: match74Venue?.textContent.trim() || "",
          match74VenueTooltip: match74Venue?.getAttribute("data-tooltip") || "",
          match74VenueFontWeight: match74VenueStyle ? Number.parseFloat(match74VenueStyle.fontWeight) : 0,
          overflowingParticipantLabels,
          progressionContentWidth: progressionRect && progressionStyle
            ? Math.round(progressionRect.width - 2 * parseFloat(progressionStyle.paddingLeft))
            : 0,
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
        check.seedLines.length === 0 &&
        check.match74OutcomeKeys.length === 0 &&
        check.match74ResultPills.join("|") === "1-1 (3-4 pens)" &&
        check.match74TieFlagCount === 0 &&
        check.match74PairJustifyContent === "flex-start" &&
        check.match74VenueCursor === "help" &&
        check.match74VenueText === "Massachusetts, USA" &&
        check.match74VenueTooltip === "Boston Stadium \u2022 Foxborough, Massachusetts, USA" &&
        check.match74VenueFontWeight > 0 &&
        check.match74VenueFontWeight < 600 &&
        check.overflowingParticipantLabels === 0 &&
        check.scrollOverflow <= 1 &&
        (check.viewportWidth > 900
          ? check.cardWidth >= 288 && check.cardWidth <= 300
          : check.cardWidth >= 208 &&
            check.cardWidth <= 250 &&
            check.cardWidth < check.progressionContentWidth) &&
        check.progressionPadding >= 10 &&
        check.cardPadding >= 8 &&
        check.cardWithinViewport &&
        check.connectorDisplay === "block" &&
        check.connectorPathCount >= 29 &&
        check.connectorLineCap === "round" &&
        check.connectorStroke === "rgb(217, 217, 217)" &&
        check.connectorStrokeWidth >= 2.5
    ),
    `Tournament bracket outcome pills should stay readable with connector rails and no horizontal overflow at phone and desktop sizes. Measured ${JSON.stringify(tournamentLayoutChecks)}.`
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}?view=standings&standingsMode=tournament`, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelectorAll(".progress-connectors path").length >= 29);
  const mobileTournamentCanvasInitial = await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    const rounds = progression?.querySelector(".progress-rounds");
    const firstRound = document.querySelector('.progress-round[data-round-index="0"]');
    const finalRound = document.querySelector('.progress-round[data-round-index="4"]');
    const progressionRect = progression?.getBoundingClientRect();
    const firstRoundRect = firstRound?.getBoundingClientRect();
    const finalRoundRect = finalRound?.getBoundingClientRect();
    const firstCard = firstRound?.querySelector(".progress-match");
    const firstCardRect = firstCard.getBoundingClientRect();

    return {
      activeRoundId: progression.dataset.mobileActiveRoundId || "",
      activeRoundIndex: progression.dataset.mobileActiveRoundIndex || "",
      ariaLabel: progression.getAttribute("aria-label") || "",
      boardClass: progression.classList.contains("is-mobile-board"),
      cardWidth: Math.round(firstCardRect.width),
      connectorDisplay: getComputedStyle(document.querySelector(".progress-connectors")).display,
      finalRoundRight: Math.round(finalRoundRect.right - progressionRect.left),
      firstRoundLeft: Math.round(firstRoundRect.left - progressionRect.left),
      hiddenRounds: [...document.querySelectorAll(".progress-round.is-before-mobile-window")].length,
      mobilePathSpan: firstCard.style.getPropertyValue("--mobile-path-span").trim(),
      pathCount: document.querySelectorAll(".progress-connectors path").length,
      roundsWidth: rounds ? Math.round(rounds.getBoundingClientRect().width) : 0,
      scrollHeightOverflow: progression.scrollHeight - progression.clientHeight,
      scrollLeft: progression.scrollLeft,
      scrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  const tournamentProgression = page.locator(".tournament-progression");
  const tournamentZoomInitial = await tournamentProgression.evaluate((progression) => {
    const nativeHeadingStyle = getComputedStyle(
      progression.querySelector(".progress-round h3")
    );
    const connectorPath = progression.querySelector(".progress-connectors path");
    const connectorPathStyle = getComputedStyle(connectorPath);
    const connectorMatrix = connectorPath.getScreenCTM();
    const scale = Number.parseFloat(progression.dataset.tournamentZoom || "0");

    return {
      connectorRenderedStrokeWidth:
        Number.parseFloat(connectorPathStyle.strokeWidth) *
        (connectorPathStyle.vectorEffect === "non-scaling-stroke"
          ? 1
          : Math.hypot(connectorMatrix.a, connectorMatrix.b)),
      nativeHeadingFontSize: Number.parseFloat(nativeHeadingStyle.fontSize),
      minimum: Number.parseFloat(progression.dataset.tournamentZoomMinimum || "0"),
      nativeHeadingStyle: {
        background: nativeHeadingStyle.backgroundColor,
        border: nativeHeadingStyle.borderColor,
        color: nativeHeadingStyle.color
      },
      resetCount: document.querySelectorAll(".tournament-zoom-reset").length,
      scale,
      visibleControls: document.querySelectorAll(".tournament-zoom-controls").length
    };
  });
  assert(
    tournamentZoomInitial.scale === 1 &&
      tournamentZoomInitial.minimum === 0.6 &&
      tournamentZoomInitial.resetCount === 0 &&
      tournamentZoomInitial.visibleControls === 0,
    `Tournament zoom should open at full size, stop at a 60% phone minimum, and render no zoom controls. Measured ${JSON.stringify(tournamentZoomInitial)}.`
  );
  await tournamentProgression.focus();
  for (let zoomStep = 0; zoomStep < 3; zoomStep += 1) {
    await page.keyboard.press("-");
    await page.waitForTimeout(45);
  }
  const tournamentDetailedZoomState = await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    const progressionRect = progression.getBoundingClientRect();
    const progressionStyle = getComputedStyle(progression);
    const stickyOverlay = progression.querySelector(".tournament-sticky-round-overlay");
    const stickyOverlayRect = stickyOverlay.getBoundingClientRect();
    const headings = [...progression.querySelectorAll(".progress-round > h3")];
    const labels = [...progression.querySelectorAll(".tournament-sticky-round-label")];
    const stickyLabelStyle = getComputedStyle(labels[0]);
    const borderLeft = Number.parseFloat(progressionStyle.borderLeftWidth) || 0;
    const borderRight = Number.parseFloat(progressionStyle.borderRightWidth) || 0;
    const scale = Number.parseFloat(progression.dataset.tournamentZoom || "0");
    const screenPoint = (path, atEnd) => {
      const point = path.getPointAtLength(atEnd ? path.getTotalLength() : 0);
      return new DOMPoint(point.x, point.y).matrixTransform(path.getScreenCTM());
    };
    const ordinaryPaths = [
      ...progression.querySelectorAll(".progress-connectors path:not(.is-final-rail)")
    ];
    const connectorEndpointErrors = ordinaryPaths.flatMap((path) => {
      const source = progression.querySelector(
        `.progress-match[data-match-number="${CSS.escape(path.dataset.sourceMatchNumber || "")}"]`
      );
      const target = progression.querySelector(
        `.progress-match[data-match-number="${CSS.escape(path.dataset.targetMatchNumber || "")}"]`
      );
      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const start = screenPoint(path, false);
      const end = screenPoint(path, true);

      return [
        Math.abs(start.x - sourceRect.right),
        Math.abs(start.y - (sourceRect.top + sourceRect.height / 2)),
        Math.abs(end.x - targetRect.left),
        Math.abs(end.y - (targetRect.top + targetRect.height / 2))
      ];
    });
    const connectorPath = ordinaryPaths[0];
    const connectorPathStyle = getComputedStyle(connectorPath);
    const connectorMatrix = connectorPath.getScreenCTM();
    const headingGeometry = labels.map((label, index) => {
      const heading = headings[index];
      const headingRect = heading.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();

      return {
        fontSize: Number.parseFloat(getComputedStyle(label).fontSize),
        heightDelta: Math.abs(labelRect.height - headingRect.height),
        leftDelta: Math.abs(labelRect.left - headingRect.left),
        widthDelta: Math.abs(labelRect.width - headingRect.width)
      };
    });

    return {
      cardWidth: Math.round(progression.querySelector(".progress-match").getBoundingClientRect().width),
      connectorEndpointMaxError: Math.max(...connectorEndpointErrors),
      connectorOrdinaryPathCount: ordinaryPaths.length,
      connectorPathCount: progression.querySelectorAll(".progress-connectors path").length,
      connectorRenderedStrokeWidth:
        Number.parseFloat(connectorPathStyle.strokeWidth) *
        (connectorPathStyle.vectorEffect === "non-scaling-stroke"
          ? 1
          : Math.hypot(connectorMatrix.a, connectorMatrix.b)),
      headingGeometry,
      metaDisplay: getComputedStyle(
        progression.querySelector(".progress-match .knockout-match-meta")
      ).display,
      minimum: Number.parseFloat(progression.dataset.tournamentZoomMinimum || "0"),
      nativeHeadingVisibility: [...progression.querySelectorAll(".progress-round > h3")].map(
        (heading) => getComputedStyle(heading).visibility
      ),
      overview: progression.classList.contains("is-zoom-overview"),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      progressionClientWidth: progression.clientWidth,
      rankDisplay: getComputedStyle(
        progression.querySelector(".progress-match .rank-pill")
      ).display,
      resetCount: document.querySelectorAll(".tournament-zoom-reset").length,
      scale,
      scrollWidth: progression.scrollWidth,
      stickyLabelCount: progression.querySelectorAll(".tournament-sticky-round-label").length,
      stickyOverlayLeftInset:
        Math.round((stickyOverlayRect.left - progressionRect.left - borderLeft) * 10) / 10,
      stickyOverlayRightInset:
        Math.round((progressionRect.right - borderRight - stickyOverlayRect.right) * 10) / 10,
      stickyLabelStyle: {
        background: stickyLabelStyle.backgroundColor,
        border: stickyLabelStyle.borderColor,
        color: stickyLabelStyle.color
      },
      stickyOverlay: progression.classList.contains("is-round-labels-sticky")
    };
  });
  assert(
    tournamentDetailedZoomState.scale === 0.7 &&
      tournamentDetailedZoomState.minimum === 0.6 &&
      Math.abs(
        tournamentDetailedZoomState.cardWidth / mobileTournamentCanvasInitial.cardWidth - 0.7
      ) <= 0.015 &&
      tournamentDetailedZoomState.connectorPathCount >= 29 &&
      tournamentDetailedZoomState.connectorOrdinaryPathCount > 0 &&
      tournamentDetailedZoomState.connectorEndpointMaxError <= 1 &&
      Math.abs(
        tournamentDetailedZoomState.connectorRenderedStrokeWidth /
          tournamentZoomInitial.connectorRenderedStrokeWidth -
          0.7
      ) <= 0.03 &&
      tournamentDetailedZoomState.stickyOverlay &&
      tournamentDetailedZoomState.stickyLabelCount === 5 &&
      tournamentDetailedZoomState.headingGeometry.every(
        (geometry) =>
          geometry.leftDelta <= 1 &&
          geometry.widthDelta <= 1 &&
          geometry.heightDelta <= 1 &&
          Math.abs(
            geometry.fontSize / tournamentZoomInitial.nativeHeadingFontSize - 0.7
          ) <= 0.02
      ) &&
      Math.abs(tournamentDetailedZoomState.stickyOverlayLeftInset) <= 0.5 &&
      Math.abs(tournamentDetailedZoomState.stickyOverlayRightInset) <= 0.5 &&
      tournamentDetailedZoomState.stickyLabelStyle.background ===
        tournamentZoomInitial.nativeHeadingStyle.background &&
      tournamentDetailedZoomState.stickyLabelStyle.border ===
        tournamentZoomInitial.nativeHeadingStyle.border &&
      tournamentDetailedZoomState.stickyLabelStyle.color ===
        tournamentZoomInitial.nativeHeadingStyle.color &&
      tournamentDetailedZoomState.nativeHeadingVisibility.every(
        (visibility) => visibility === "hidden"
      ) &&
      !tournamentDetailedZoomState.overview &&
      tournamentDetailedZoomState.metaDisplay !== "none" &&
      tournamentDetailedZoomState.rankDisplay !== "none" &&
      tournamentDetailedZoomState.resetCount === 0 &&
      tournamentDetailedZoomState.scrollWidth >
        tournamentDetailedZoomState.progressionClientWidth + 2 &&
      tournamentDetailedZoomState.scrollWidth < mobileTournamentCanvasInitial.roundsWidth &&
      tournamentDetailedZoomState.pageOverflow <= 1,
    `The 70% phone zoom step should retain detailed cards, scaled sticky labels, aligned connectors, and no reset badge. Measured ${JSON.stringify(tournamentDetailedZoomState)}.`
  );
  await tournamentProgression.focus();
  await page.keyboard.press("-");
  await page.waitForTimeout(70);
  const tournamentZoomedOut = await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    const firstCard = progression.querySelector(".progress-match");
    const score = firstCard.querySelector(".knockout-result-pill");
    const scoreStyle = getComputedStyle(score);
    const connectorPath = progression.querySelector(
      ".progress-connectors path:not(.is-final-rail)"
    );
    const connectorPathStyle = getComputedStyle(connectorPath);
    const connectorMatrix = connectorPath.getScreenCTM();
    const screenPoint = (path, atEnd) => {
      const point = path.getPointAtLength(atEnd ? path.getTotalLength() : 0);
      return new DOMPoint(point.x, point.y).matrixTransform(path.getScreenCTM());
    };
    const connectorEndpointErrors = [
      ...progression.querySelectorAll(".progress-connectors path:not(.is-final-rail)")
    ].flatMap((path) => {
      const source = progression.querySelector(
        `.progress-match[data-match-number="${CSS.escape(path.dataset.sourceMatchNumber || "")}"]`
      );
      const target = progression.querySelector(
        `.progress-match[data-match-number="${CSS.escape(path.dataset.targetMatchNumber || "")}"]`
      );
      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const start = screenPoint(path, false);
      const end = screenPoint(path, true);

      return [
        Math.abs(start.x - sourceRect.right),
        Math.abs(start.y - (sourceRect.top + sourceRect.height / 2)),
        Math.abs(end.x - targetRect.left),
        Math.abs(end.y - (targetRect.top + targetRect.height / 2))
      ];
    });

    return {
      cardWidth: Math.round(firstCard.getBoundingClientRect().width),
      connectorEndpointMaxError: Math.max(...connectorEndpointErrors),
      connectorPathCount: progression.querySelectorAll(".progress-connectors path").length,
      connectorRenderedStrokeWidth:
        Number.parseFloat(connectorPathStyle.strokeWidth) *
        (connectorPathStyle.vectorEffect === "non-scaling-stroke"
          ? 1
          : Math.hypot(connectorMatrix.a, connectorMatrix.b)),
      headingFontSizes: [...progression.querySelectorAll(".progress-round > h3")].map(
        (heading) => Number.parseFloat(getComputedStyle(heading).fontSize)
      ),
      metaDisplay: getComputedStyle(firstCard.querySelector(".knockout-match-meta")).display,
      minimum: Number.parseFloat(progression.dataset.tournamentZoomMinimum || "0"),
      nativeHeadingVisibility: [...progression.querySelectorAll(".progress-round > h3")].map(
        (heading) => getComputedStyle(heading).visibility
      ),
      overview: progression.classList.contains("is-zoom-overview"),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      progressionClientWidth: progression.clientWidth,
      rankDisplay: getComputedStyle(firstCard.querySelector(".rank-pill")).display,
      resetCount: document.querySelectorAll(".tournament-zoom-reset").length,
      scale: Number.parseFloat(progression.dataset.tournamentZoom || "0"),
      scoreBackground: scoreStyle.backgroundColor,
      scoreBorderWidth: scoreStyle.borderTopWidth,
      scoreBorderRadius: scoreStyle.borderRadius,
      scoreFontSize: Number.parseFloat(scoreStyle.fontSize),
      scrollWidth: progression.scrollWidth,
      stickyLabelCount: progression.querySelectorAll(".tournament-sticky-round-label").length,
      stickyOverlay: progression.classList.contains("is-round-labels-sticky"),
      teamFontSize: Number.parseFloat(
        getComputedStyle(firstCard.querySelector(".knockout-team-copy strong")).fontSize
      )
    };
  });
  assert(
    tournamentZoomedOut.scale === 0.6 &&
      Math.abs(tournamentZoomedOut.scale - tournamentZoomedOut.minimum) <= 0.002 &&
      Math.abs(
        tournamentZoomedOut.cardWidth / mobileTournamentCanvasInitial.cardWidth - 0.6
      ) <= 0.015 &&
      tournamentZoomedOut.overview &&
      tournamentZoomedOut.metaDisplay === "none" &&
      tournamentZoomedOut.rankDisplay === "none" &&
      tournamentZoomedOut.teamFontSize === 12 &&
      tournamentZoomedOut.scoreFontSize === 11 &&
      tournamentZoomedOut.scoreBackground === "rgba(0, 0, 0, 0)" &&
      tournamentZoomedOut.scoreBorderWidth === "0px" &&
      tournamentZoomedOut.scoreBorderRadius === "0px" &&
      tournamentZoomedOut.connectorPathCount >= 29 &&
      tournamentZoomedOut.connectorEndpointMaxError <= 1 &&
      Math.abs(
        tournamentZoomedOut.connectorRenderedStrokeWidth /
          tournamentZoomInitial.connectorRenderedStrokeWidth -
          0.6
      ) <= 0.03 &&
      tournamentZoomedOut.headingFontSizes.every((fontSize) => fontSize === 12) &&
      tournamentZoomedOut.nativeHeadingVisibility.every(
        (visibility) => visibility === "visible"
      ) &&
      !tournamentZoomedOut.stickyOverlay &&
      tournamentZoomedOut.stickyLabelCount === 0 &&
      tournamentZoomedOut.resetCount === 0 &&
      tournamentZoomedOut.scrollWidth > tournamentZoomedOut.progressionClientWidth + 2 &&
      tournamentZoomedOut.scrollWidth < mobileTournamentCanvasInitial.roundsWidth &&
      tournamentZoomedOut.pageOverflow <= 1,
    `Zooming fully out on a phone should stop at a readable 60% compact overview with hidden metadata and ranks, plain scores, aligned connectors, and native round labels. Measured ${JSON.stringify(tournamentZoomedOut)}.`
  );
  await tournamentProgression.focus();
  await page.keyboard.press("0");
  await page.waitForTimeout(70);
  const tournamentZoomResetState = await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    return {
      connectorPathCount: progression.querySelectorAll(".progress-connectors path").length,
      resetCount: document.querySelectorAll(".tournament-zoom-reset").length,
      scale: Number.parseFloat(progression.dataset.tournamentZoom || "0"),
      scrollHeight: progression.scrollHeight,
      scrollWidth: progression.scrollWidth,
      stickyOverlay: progression.classList.contains("is-round-labels-sticky")
    };
  });
  assert(
    tournamentZoomResetState.scale === 1 &&
      tournamentZoomResetState.connectorPathCount >= 29 &&
      tournamentZoomResetState.resetCount === 0 &&
      !tournamentZoomResetState.stickyOverlay &&
      tournamentZoomResetState.scrollWidth >= mobileTournamentCanvasInitial.roundsWidth &&
      tournamentZoomResetState.scrollHeight - page.viewportSize().height > 120,
    `The keyboard reset should restore the exact current-size board without adding a visible reset badge. Measured ${JSON.stringify(tournamentZoomResetState)}.`
  );
  await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    const rect = progression.getBoundingClientRect();
    const originalSetPointerCapture = Element.prototype.setPointerCapture;
    const originalReleasePointerCapture = Element.prototype.releasePointerCapture;
    Element.prototype.setPointerCapture = function setPointerCaptureNoop() {};
    Element.prototype.releasePointerCapture = function releasePointerCaptureNoop() {};
    const pointer = (type, pointerId, clientX, clientY, isPrimary, buttons = 1) =>
      progression.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          buttons,
          cancelable: true,
          clientX,
          clientY,
          isPrimary,
          pointerId,
          pointerType: "touch"
        })
      );
    const centerY = rect.top + Math.min(rect.height - 80, 260);
    pointer("pointerdown", 31, rect.left + 70, centerY, true);
    pointer("pointerdown", 32, rect.left + 270, centerY, false);
    pointer("pointermove", 31, rect.left + 155, centerY, true);
    pointer("pointermove", 32, rect.left + 185, centerY, false);
    pointer("pointerup", 31, rect.left + 155, centerY, true, 0);
    pointer("pointerup", 32, rect.left + 185, centerY, false, 0);
    Element.prototype.setPointerCapture = originalSetPointerCapture;
    Element.prototype.releasePointerCapture = originalReleasePointerCapture;
  });
  await page.waitForTimeout(80);
  const tournamentPinchZoomState = await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    return {
      minimum: Number.parseFloat(progression.dataset.tournamentZoomMinimum || "0"),
      overview: progression.classList.contains("is-zoom-overview"),
      resetCount: document.querySelectorAll(".tournament-zoom-reset").length,
      scale: Number.parseFloat(progression.dataset.tournamentZoom || "0"),
      stickyOverlay: progression.classList.contains("is-round-labels-sticky")
    };
  });
  assert(
    tournamentPinchZoomState.scale === 0.6 &&
      Math.abs(tournamentPinchZoomState.scale - tournamentPinchZoomState.minimum) <= 0.002 &&
      tournamentPinchZoomState.overview &&
      tournamentPinchZoomState.resetCount === 0 &&
      !tournamentPinchZoomState.stickyOverlay,
    `A two-finger pinch should reach the same 60% compact minimum without adding zoom UI. Measured ${JSON.stringify(tournamentPinchZoomState)}.`
  );
  await tournamentProgression.focus();
  await page.keyboard.press("0");
  await page.waitForTimeout(70);
  const tournamentBoardBox = await page.locator(".tournament-progression").boundingBox();
  assert(tournamentBoardBox, "Mobile tournament board should have a measurable canvas.");
  await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    const rect = progression.getBoundingClientRect();
    const startX = rect.right - 34;
    const startY = rect.top + Math.min(rect.height - 34, 460);
    const endX = rect.left + 46;
    const endY = rect.top + Math.max(40, Math.min(rect.height - 170, 300));
    const eventBase = {
      bubbles: true,
      button: 0,
      buttons: 1,
      cancelable: true,
      isPrimary: true,
      pointerId: 17,
      pointerType: "touch"
    };
    progression.dispatchEvent(new PointerEvent("pointerdown", { ...eventBase, clientX: startX, clientY: startY }));
    progression.dispatchEvent(new PointerEvent("pointermove", { ...eventBase, clientX: endX, clientY: endY }));
    progression.dispatchEvent(new PointerEvent("pointerup", { ...eventBase, buttons: 0, clientX: endX, clientY: endY }));
  });
  await page.waitForTimeout(80);
  const mobileTournamentCanvasAfterDrag = await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    const firstRound = document.querySelector('.progress-round[data-round-index="0"]');
    const secondRound = document.querySelector('.progress-round[data-round-index="1"]');
    const progressionRect = progression.getBoundingClientRect();
    const firstRoundRect = firstRound.getBoundingClientRect();
    const secondRoundRect = secondRound.getBoundingClientRect();

    return {
      activeRoundId: progression.dataset.mobileActiveRoundId || "",
      activeRoundIndex: progression.dataset.mobileActiveRoundIndex || "",
      firstRoundLeft: Math.round(firstRoundRect.left - progressionRect.left),
      hiddenRounds: [...document.querySelectorAll(".progress-round.is-before-mobile-window")].length,
      pathCount: document.querySelectorAll(".progress-connectors path").length,
      scrollLeft: Math.round(progression.scrollLeft),
      scrollTop: Math.round(progression.scrollTop),
      secondRoundLeft: Math.round(secondRoundRect.left - progressionRect.left),
      urlView: new URL(window.location.href).searchParams.get("view") || "",
      urlMatch: new URL(window.location.href).searchParams.get("match") || ""
    };
  });
  assert(
    mobileTournamentCanvasInitial.boardClass &&
      mobileTournamentCanvasInitial.ariaLabel === "Knockout winner progression" &&
      mobileTournamentCanvasInitial.activeRoundIndex === "" &&
      mobileTournamentCanvasInitial.activeRoundId === "" &&
      mobileTournamentCanvasInitial.firstRoundLeft >= 10 &&
      mobileTournamentCanvasInitial.firstRoundLeft <= 18 &&
      mobileTournamentCanvasInitial.finalRoundRight > mobileTournamentCanvasInitial.roundsWidth - 8 &&
      mobileTournamentCanvasInitial.cardWidth >= 208 &&
      mobileTournamentCanvasInitial.cardWidth <= 250 &&
      mobileTournamentCanvasInitial.connectorDisplay === "block" &&
      mobileTournamentCanvasInitial.pathCount >= 29 &&
      mobileTournamentCanvasInitial.mobilePathSpan === "" &&
      mobileTournamentCanvasInitial.hiddenRounds === 0 &&
      mobileTournamentCanvasInitial.scrollHeightOverflow > 120 &&
      mobileTournamentCanvasInitial.scrollOverflow <= 1 &&
      mobileTournamentCanvasAfterDrag.activeRoundIndex === "" &&
      mobileTournamentCanvasAfterDrag.activeRoundId === "" &&
      mobileTournamentCanvasAfterDrag.hiddenRounds === 0 &&
      mobileTournamentCanvasAfterDrag.pathCount >= 29 &&
      mobileTournamentCanvasAfterDrag.scrollLeft >= 120 &&
      mobileTournamentCanvasAfterDrag.scrollTop >= 80 &&
      mobileTournamentCanvasAfterDrag.firstRoundLeft < mobileTournamentCanvasInitial.firstRoundLeft - 100 &&
      mobileTournamentCanvasAfterDrag.secondRoundLeft < mobileTournamentCanvasInitial.cardWidth &&
      mobileTournamentCanvasAfterDrag.urlView === "standings" &&
      mobileTournamentCanvasAfterDrag.urlMatch === "",
    `Mobile tournament should behave like a draggable two-axis canvas with all rounds still present. Measured ${JSON.stringify({ mobileTournamentCanvasInitial, mobileTournamentCanvasAfterDrag })}.`
  );
  const mobileTournamentCanvasTopContainment = await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    window.scrollTo(0, 120);
    progression.scrollTop = 0;
    const startPageScrollY = Math.round(window.scrollY);

    const calls = [];
    const originalScrollTo = window.scrollTo.bind(window);
    const originalSetPointerCapture = Element.prototype.setPointerCapture;
    const originalReleasePointerCapture = Element.prototype.releasePointerCapture;
    window.scrollTo = (leftOrOptions, top) => {
      const requestedTop = typeof leftOrOptions === "object" ? Number(leftOrOptions.top) : Number(top);
      calls.push({ top: requestedTop });
      return originalScrollTo(leftOrOptions, top);
    };
    Element.prototype.setPointerCapture = function setPointerCaptureNoop() {};
    Element.prototype.releasePointerCapture = function releasePointerCaptureNoop() {};

    const rect = progression.getBoundingClientRect();
    const eventBase = {
      bubbles: true,
      button: 0,
      buttons: 1,
      cancelable: true,
      clientX: rect.left + 44,
      isPrimary: true,
      pointerId: 19,
      pointerType: "touch"
    };
    progression.dispatchEvent(new PointerEvent("pointerdown", { ...eventBase, clientY: rect.top + 44 }));
    progression.dispatchEvent(new PointerEvent("pointermove", { ...eventBase, clientY: rect.top + 118 }));
    progression.dispatchEvent(new PointerEvent("pointerup", { ...eventBase, buttons: 0, clientY: rect.top + 118 }));

    Element.prototype.setPointerCapture = originalSetPointerCapture;
    Element.prototype.releasePointerCapture = originalReleasePointerCapture;
    window.scrollTo = originalScrollTo;

    return {
      calls,
      overscrollBehaviorY: getComputedStyle(progression).overscrollBehaviorY,
      pageScrollY: Math.round(window.scrollY),
      startPageScrollY,
      scrollTop: Math.round(progression.scrollTop)
    };
  });
  assert(
    mobileTournamentCanvasTopContainment.calls.length === 0 &&
      mobileTournamentCanvasTopContainment.pageScrollY ===
        mobileTournamentCanvasTopContainment.startPageScrollY &&
      mobileTournamentCanvasTopContainment.scrollTop === 0 &&
      mobileTournamentCanvasTopContainment.overscrollBehaviorY === "contain",
    `Dragging past the top of the mobile tournament canvas should stay inside the canvas without scrolling the page. Measured ${JSON.stringify(mobileTournamentCanvasTopContainment)}.`
  );
  await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    window.scrollTo(0, 0);
    progression.scrollTop = progression.scrollHeight - progression.clientHeight;
  });
  await page.waitForTimeout(60);
  const mobileTournamentCanvasBottomContainment = await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    const maxScrollTop = progression.scrollHeight - progression.clientHeight;
    const calls = [];
    const originalScrollTo = window.scrollTo.bind(window);
    const originalSetPointerCapture = Element.prototype.setPointerCapture;
    const originalReleasePointerCapture = Element.prototype.releasePointerCapture;

    window.scrollTo(0, 0);
    progression.scrollTop = maxScrollTop;
    window.scrollTo = (leftOrOptions, top) => {
      const requestedTop = typeof leftOrOptions === "object" ? Number(leftOrOptions.top) : Number(top);
      calls.push({ top: requestedTop });
      return originalScrollTo(leftOrOptions, top);
    };
    Element.prototype.setPointerCapture = function setPointerCaptureNoop() {};
    Element.prototype.releasePointerCapture = function releasePointerCaptureNoop() {};

    const rect = progression.getBoundingClientRect();
    const eventBase = {
      bubbles: true,
      button: 0,
      buttons: 1,
      cancelable: true,
      clientX: rect.left + rect.width / 2,
      isPrimary: true,
      pointerId: 23,
      pointerType: "touch"
    };
    progression.dispatchEvent(new PointerEvent("pointerdown", { ...eventBase, clientY: rect.top + 500 }));
    progression.dispatchEvent(new PointerEvent("pointermove", { ...eventBase, clientY: rect.top + 180 }));
    progression.dispatchEvent(new PointerEvent("pointerup", { ...eventBase, buttons: 0, clientY: rect.top + 180 }));

    Element.prototype.setPointerCapture = originalSetPointerCapture;
    Element.prototype.releasePointerCapture = originalReleasePointerCapture;
    window.scrollTo = originalScrollTo;

    return {
      activeRoundId: progression.dataset.mobileActiveRoundId || "",
      canvasRemainingBottom: Math.round(maxScrollTop - progression.scrollTop),
      calls,
      hiddenRounds: [...document.querySelectorAll(".progress-round.is-before-mobile-window")].length,
      pageScrollY: Math.round(window.scrollY),
      scrollTop: Math.round(progression.scrollTop),
      urlMatch: new URL(window.location.href).searchParams.get("match") || ""
    };
  });
  assert(
    mobileTournamentCanvasBottomContainment.activeRoundId === "" &&
      mobileTournamentCanvasBottomContainment.calls.length === 0 &&
      mobileTournamentCanvasBottomContainment.hiddenRounds === 0 &&
      mobileTournamentCanvasBottomContainment.canvasRemainingBottom <= 2 &&
      mobileTournamentCanvasBottomContainment.pageScrollY === 0 &&
      mobileTournamentCanvasBottomContainment.urlMatch === "",
    `Dragging past the bottom of the mobile tournament canvas should stay inside the canvas without scrolling the page. Measured ${JSON.stringify(mobileTournamentCanvasBottomContainment)}.`
  );
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(90);
  await tournamentProgression.focus();
  for (let zoomStep = 0; zoomStep < 4; zoomStep += 1) {
    await page.keyboard.press("-");
    await page.waitForTimeout(45);
  }
  await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    const top = progression.getBoundingClientRect().top + window.scrollY + 260;
    window.scrollTo(0, top);
  });
  await page.waitForTimeout(80);
  const desktopTournamentZoomState = await page.evaluate(() => {
    const progression = document.querySelector(".tournament-progression");
    const overlay = progression.querySelector(".tournament-sticky-round-overlay");
    const labels = [...(overlay?.querySelectorAll(".tournament-sticky-round-label") || [])];
    const rounds = [...progression.querySelectorAll(".progress-round")];

    return {
      clientWidth: progression.clientWidth,
      connectorPathCount: progression.querySelectorAll(".progress-connectors path").length,
      labelLefts: labels.map((label) => Math.round(label.getBoundingClientRect().left)),
      labelWidths: labels.map((label) => Math.round(label.getBoundingClientRect().width)),
      minimum: Number.parseFloat(progression.dataset.tournamentZoomMinimum || "0"),
      overlayTop: Math.round(overlay?.getBoundingClientRect().top || 0),
      resetCount: document.querySelectorAll(".tournament-zoom-reset").length,
      roundLefts: rounds.map((round) => Math.round(round.getBoundingClientRect().left)),
      roundWidths: rounds.map((round) => Math.round(round.getBoundingClientRect().width)),
      scale: Number.parseFloat(progression.dataset.tournamentZoom || "0"),
      scrollWidth: progression.scrollWidth,
      sticky: progression.classList.contains("is-round-labels-sticky")
    };
  });
  assert(
    desktopTournamentZoomState.scale >= 0.7 &&
      desktopTournamentZoomState.scale <= 0.8 &&
      Math.abs(desktopTournamentZoomState.scale - desktopTournamentZoomState.minimum) <= 0.002 &&
      desktopTournamentZoomState.scrollWidth - desktopTournamentZoomState.clientWidth <= 1 &&
      desktopTournamentZoomState.connectorPathCount >= 29 &&
      desktopTournamentZoomState.resetCount === 0 &&
      desktopTournamentZoomState.sticky &&
      desktopTournamentZoomState.overlayTop >= 16 &&
      desktopTournamentZoomState.overlayTop <= 20 &&
      desktopTournamentZoomState.labelLefts.every(
        (left, index) => Math.abs(left - desktopTournamentZoomState.roundLefts[index]) <= 1
      ) &&
      desktopTournamentZoomState.labelWidths.every(
        (width, index) => Math.abs(width - desktopTournamentZoomState.roundWidths[index]) <= 1
      ),
    `Laptop zoom should stop when the whole bracket fits while its fixed round labels stay aligned to the scaled columns. Measured ${JSON.stringify(desktopTournamentZoomState)}.`
  );
  await page.setViewportSize({ width: 1280, height: 720 });
  const canadaPathCheck = await openPageAtTime(
    "2026-07-04T12:00:00.000Z",
    "/?view=standings&standingsMode=tournament&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const fixture = data.fixtures.find((item) => item.matchNumber === 73);

        fixture.status = "FT";
        fixture.score = { home: 1, away: 2 };
      }
    }
  );
  await canadaPathCheck.page.waitForFunction(
    () => document.querySelector('.progress-match[data-match-number="90"] .knockout-team[data-team-id="CAN"]')
  );
  const canadaPathState = await canadaPathCheck.page.evaluate(() => {
    const getVisual = (element) => {
      const flag = element?.querySelector(".knockout-team-flag");
      const rank = element?.querySelector(".rank-pill");
      const strong = element?.querySelector(".knockout-team-copy strong");

      return {
        className: element?.className || "",
        flagFilter: flag ? getComputedStyle(flag).filter : "",
        flagOpacity: flag ? getComputedStyle(flag).opacity : "",
        rankOpacity: rank ? getComputedStyle(rank).opacity : "",
        strongColor: strong ? getComputedStyle(strong).color : "",
        strongWeight: strong ? Number.parseFloat(getComputedStyle(strong).fontWeight) : 0,
        teamId: element?.dataset.teamId || ""
      };
    };
    const match73 = document.querySelector('.progress-match[data-match-number="73"]');
    const match90 = document.querySelector('.progress-match[data-match-number="90"]');
    const canada73 = match73?.querySelector('.knockout-team[data-team-id="CAN"]');
    const southAfrica73 = match73?.querySelector('.knockout-team[data-team-id="RSA"]');
    const canada90 = match90?.querySelector('.knockout-team[data-team-id="CAN"]');
    const morocco90 = match90?.querySelector('.knockout-team[data-team-id="MAR"]');

    return {
      m73OutcomePillCount: match73?.querySelectorAll(".knockout-likelihood").length || 0,
      m73Projected: match73?.classList.contains("is-projected"),
      m73ResultPills: [...(match73?.querySelectorAll(".knockout-result-pill") || [])].map((pill) =>
        pill.textContent.trim()
      ),
      m73Winner: match73?.dataset.winnerTeamId || "",
      m90OpenMatchId: match90?.dataset.openMatchId || "",
      m90Projected: match90?.classList.contains("is-projected"),
      m90Text: match90?.textContent.replace(/\s+/g, " ").trim() || "",
      canada73: getVisual(canada73),
      canada90: getVisual(canada90),
      morocco90: getVisual(morocco90),
      southAfrica73: getVisual(southAfrica73)
    };
  });
  assert(
    canadaPathState.m73Winner === "CAN" &&
      canadaPathState.m73ResultPills.join("|") === "1-2" &&
      canadaPathState.m73OutcomePillCount === 0 &&
      canadaPathState.m73Projected === false &&
      canadaPathState.canada73.className.includes("is-winner") &&
      canadaPathState.canada73.flagFilter === "none" &&
      canadaPathState.canada73.flagOpacity === "1" &&
      Number(canadaPathState.canada73.rankOpacity) === 1 &&
      canadaPathState.canada73.strongWeight >= 750 &&
      canadaPathState.southAfrica73.className.includes("is-loser") &&
      canadaPathState.southAfrica73.flagFilter.includes("grayscale") &&
      Number(canadaPathState.southAfrica73.flagOpacity) < 1 &&
      Number(canadaPathState.southAfrica73.rankOpacity) < 1 &&
      getCssColorAlpha(canadaPathState.southAfrica73.strongColor) < 0.7 &&
      canadaPathState.southAfrica73.strongWeight < canadaPathState.canada73.strongWeight &&
      canadaPathState.m90Projected === false &&
      canadaPathState.m90OpenMatchId === "match-90-round-of-16-2026-07-04" &&
      canadaPathState.canada90.teamId === "CAN" &&
      canadaPathState.canada90.className.includes("is-locked") &&
      canadaPathState.canada90.className.includes("is-resolved") &&
      (canadaPathState.canada90.className.includes("is-loser")
        ? canadaPathState.canada90.flagFilter.includes("grayscale") &&
          Number(canadaPathState.canada90.flagOpacity) < 1 &&
          Number(canadaPathState.canada90.rankOpacity) < 1 &&
          getCssColorAlpha(canadaPathState.canada90.strongColor) < 0.7
        : canadaPathState.canada90.flagFilter === "none" &&
          canadaPathState.canada90.flagOpacity === "1" &&
          Number(canadaPathState.canada90.rankOpacity) >= 0.7) &&
      canadaPathState.morocco90.teamId === "MAR" &&
      canadaPathState.morocco90.className.includes("is-locked") &&
      canadaPathState.morocco90.className.includes("is-resolved") &&
      canadaPathState.morocco90.flagFilter === "none" &&
      canadaPathState.morocco90.flagOpacity === "1" &&
      Number(canadaPathState.morocco90.rankOpacity) >= 0.7 &&
      !canadaPathState.m90Text.includes("Winner match"),
    `Completed source matches should mute eliminated Round of 32 sides and lock the confirmed Canada-Morocco Round of 16 card. Measured ${JSON.stringify(canadaPathState)}.`
  );
  await canadaPathCheck.context.close();

  const knockoutProgressionCheck = await openPageAtTime(
    "2026-07-05T12:00:00.000Z",
    "/?view=matches&date=2026-06-17&tz=America%2FLos_Angeles",
    {
      fixtureTransform(data) {
        const clearParticipants = (matchNumber) => {
          const fixture = data.fixtures.find((item) => item.matchNumber === matchNumber);

          if (!fixture) {
            return;
          }

          delete fixture.homeTeamId;
          delete fixture.awayTeamId;
        };
        const finishMatch = (matchNumber, homeScore, awayScore, scoreDetails = null) => {
          const fixture = data.fixtures.find((item) => item.matchNumber === matchNumber);

          fixture.status = "FT";
          fixture.score = { home: homeScore, away: awayScore };
          delete fixture.scoreDetails;
          delete fixture.winnerTeamId;
          delete fixture.winner;
          if (scoreDetails) {
            fixture.scoreDetails = scoreDetails;
          }
        };

        clearParticipants(89);
        clearParticipants(90);
        clearParticipants(97);
        finishMatch(73, 1, 2);
        finishMatch(74, 2, 0);
        finishMatch(75, 1, 0);
        finishMatch(77, 1, 0);
        finishMatch(89, 0, 0, { penalties: { home: 5, away: 4 } });
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
    const match75 = document.querySelector('.progress-match[data-match-number="75"]');
    const match77 = document.querySelector('.progress-match[data-match-number="77"]');
    const match90 = document.querySelector('.progress-match[data-match-number="90"]');
    const match89 = document.querySelector('.progress-match[data-match-number="89"]');
    const match97Source = document.querySelector(
      '.progress-match[data-match-number="97"] .knockout-team[data-source-match="89"]'
    );

    return {
      m74Winner: match74?.dataset.winnerTeamId,
      m75Winner: match75?.dataset.winnerTeamId,
      m77Winner: match77?.dataset.winnerTeamId,
      m89OutcomePillCount: match89?.querySelectorAll(".knockout-likelihood").length || 0,
      m89ResultPills: [...(match89?.querySelectorAll(".knockout-result-pill") || [])].map((pill) =>
        pill.textContent.trim()
      ),
      m89TeamIds: [...match89.querySelectorAll(".knockout-team[data-team-id]")].map(
        (team) => team.dataset.teamId
      ),
      m89Text: match89.textContent.replace(/\s+/g, " ").trim(),
      m89Winner: match89.dataset.winnerTeamId,
      m90OpenMatchId: match90?.dataset.openMatchId || "",
      m90OutcomePillCount: match90?.querySelectorAll(".knockout-likelihood").length || 0,
      m90Projected: match90?.classList.contains("is-projected"),
      m90TeamIds: [...(match90?.querySelectorAll(".knockout-team[data-team-id]") || [])].map(
        (team) => team.dataset.teamId
      ),
      m90Text: match90?.textContent.replace(/\s+/g, " ").trim() || "",
      m97SourceTeamId: match97Source?.dataset.teamId,
      m97Text: document
        .querySelector('.progress-match[data-match-number="97"]')
        ?.textContent.replace(/\s+/g, " ")
        .trim()
    };
  });
  const progressionWinnerTeam = getTeam(progressionResolved.m74Winner);
  const progressionWinnerName = progressionWinnerTeam.standingName || progressionWinnerTeam.name;
  assert(
    progressionResolved.m89TeamIds.join("|") ===
      [progressionResolved.m74Winner, progressionResolved.m77Winner].join("|") &&
      progressionResolved.m89Winner === progressionResolved.m74Winner &&
      progressionResolved.m97SourceTeamId === progressionResolved.m74Winner &&
      progressionResolved.m89ResultPills.join("|") === "0-0 (5-4 pens)" &&
      progressionResolved.m89OutcomePillCount === 0 &&
      progressionResolved.m90TeamIds.join("|") === "CAN|NED" &&
      progressionResolved.m90Projected === false &&
      progressionResolved.m90OpenMatchId === "match-90-round-of-16-2026-07-04" &&
      (progressionResolved.m90Projected ? progressionResolved.m90OutcomePillCount === 3 : progressionResolved.m90OutcomePillCount === 0) &&
      !progressionResolved.m90Text.includes("Winner match") &&
      !progressionResolved.m97Text.includes("Winner match") &&
      !progressionResolved.m89Text.includes("M97") &&
      progressionResolved.m97Text.includes(progressionWinnerName),
    `Finished knockout source matches should automatically place their winners into later fixture slots. Measured ${JSON.stringify(progressionResolved)}.`
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
      "2022",
    "Choosing a past year should update the standings heading to just that year."
  );
  assert(
    (await page.locator("#standings-heading").getAttribute("aria-label")) === "2022",
    "Choosing a past year should keep the standings heading label to just that year."
  );
  assert(
    new URL(page.url()).searchParams.get("standingsYear") === "2022",
    "The selected standings year should be reflected in the URL."
  );
  assert(
    !new URL(page.url()).searchParams.has("standingsMode"),
    "Archived standings should default to the Tournament tab."
  );
  await page.locator("#standings-year-button").click();
  const currentYearOptionState = await page
    .locator('.standings-year-option[data-standings-year="2026"]')
    .evaluate((button) => ({
      ariaCurrent: button.getAttribute("aria-current"),
      borderColor: getComputedStyle(button).borderColor,
      borderWidth: Number.parseFloat(getComputedStyle(button).borderWidth),
      isCurrent: button.classList.contains("is-current"),
      isSelected: button.classList.contains("is-selected")
    }));
  assert(
    currentYearOptionState.isCurrent &&
      !currentYearOptionState.isSelected &&
      currentYearOptionState.ariaCurrent === "date" &&
      currentYearOptionState.borderColor !== "rgba(0, 0, 0, 0)" &&
      currentYearOptionState.borderWidth > 0,
    `The current year should stay outlined when a past year is selected. Measured ${JSON.stringify(currentYearOptionState)}.`
  );
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () =>
      document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed") === "true" &&
      document.querySelectorAll(".historical-tournament-view .progress-match").length >= 16
  );
  await page.waitForFunction(
    () =>
      document.querySelectorAll(".historical-tournament-view .progress-connectors path.is-final-rail")
        .length === 1
  );
  const historicalTournamentCheck = await page.evaluate(() => {
    const finalCard = document.querySelector('.historical-tournament-view .progress-match[data-match-number="64"]');
    const bronzeCard = document.querySelector('.historical-tournament-view .progress-match[data-match-number="63"]');
    const getRectSummary = (selector) => {
      const element = document.querySelector(selector);

      if (!element) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      return {
        bottom: Math.round(rect.bottom),
        center: Math.round(rect.top + rect.height / 2),
        left: Math.round(rect.left),
        top: Math.round(rect.top)
      };
    };

    return {
      bronzeRect: getRectSummary('.historical-tournament-view .progress-match[data-match-number="63"]'),
      bronzeText: bronzeCard?.textContent.replace(/\s+/g, " ").trim() || "",
      bronzeTimeText: bronzeCard?.querySelector("time")?.textContent.trim() || "",
      finalRailConnectorPathCount: document.querySelectorAll(".historical-tournament-view .progress-connectors path.is-final-rail").length,
      finalRect: getRectSummary('.historical-tournament-view .progress-match[data-match-number="64"]'),
      finalText: finalCard?.textContent.replace(/\s+/g, " ").trim() || "",
      finalTimeText: finalCard?.querySelector("time")?.textContent.trim() || "",
      hiddenThirdPlaceTab: document.querySelector("#standings-third-place-tab")?.hidden === true,
      resultPills: [...document.querySelectorAll(".historical-tournament-view .knockout-result-pill")].map((pill) =>
        pill.textContent.trim()
      ),
      roundHeadings: [...document.querySelectorAll(".historical-tournament-view .progress-round h3")].map((heading) =>
        heading.textContent.trim()
      ),
      semi61Rect: getRectSummary('.historical-tournament-view .progress-match[data-match-number="61"]'),
      semi62Rect: getRectSummary('.historical-tournament-view .progress-match[data-match-number="62"]'),
      summary: document.querySelector("#standings-summary")?.textContent.trim(),
      tabLabels: [...document.querySelectorAll(".standings-mode-tab:not([hidden])")].map((tab) =>
        tab.textContent.trim()
      ),
      tournamentPressed: document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed")
    };
  });
  assert(
    historicalTournamentCheck.tournamentPressed === "true" &&
      historicalTournamentCheck.tabLabels.join("|") === "Tournament|Groups" &&
      historicalTournamentCheck.hiddenThirdPlaceTab &&
      historicalTournamentCheck.summary === "Tournament path uses archived match results." &&
      historicalTournamentCheck.roundHeadings.join("|") ===
        "Round of 16|Quarter-finals|Semi-finals|Final" &&
      historicalTournamentCheck.finalText.includes("Argentina") &&
      historicalTournamentCheck.finalText.includes("France") &&
      historicalTournamentCheck.finalTimeText === "Dec 18 6:00PM local (Final)" &&
      historicalTournamentCheck.bronzeTimeText === "Dec 17 6:00PM local (3rd place match)" &&
      !historicalTournamentCheck.bronzeText.includes("Third-place play-off") &&
      historicalTournamentCheck.resultPills.includes("3-3 (4-2 pens)") &&
      historicalTournamentCheck.finalRailConnectorPathCount === 1 &&
      historicalTournamentCheck.finalRect &&
      historicalTournamentCheck.bronzeRect &&
      historicalTournamentCheck.semi61Rect &&
      historicalTournamentCheck.semi62Rect &&
      Math.abs(historicalTournamentCheck.finalRect.left - historicalTournamentCheck.bronzeRect.left) <= 1 &&
      historicalTournamentCheck.finalRect.center > historicalTournamentCheck.semi61Rect.center + 24 &&
      historicalTournamentCheck.bronzeRect.center < historicalTournamentCheck.semi62Rect.center - 24 &&
      historicalTournamentCheck.bronzeRect.top > historicalTournamentCheck.finalRect.bottom &&
      historicalTournamentCheck.bronzeRect.top - historicalTournamentCheck.finalRect.bottom <= 180,
    `The 2022 archived standings should open on a completed Tournament bracket with Groups still available. Measured ${JSON.stringify(historicalTournamentCheck)}.`
  );
  await page.locator("#standings-groups-tab").click();
  await page.waitForFunction(() => document.querySelectorAll(".standings-card").length >= 8);
  assert(
    new URL(page.url()).searchParams.get("standingsMode") === "groups",
    "Archived Groups should be linkable from the URL when it is not the default mode."
  );
  const historicalStandingsCheck = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".standings-card")];
    const groups = new Map(
      cards.map((card) => [
        card.querySelector("h2")?.textContent.trim(),
        [...card.querySelectorAll(".standing-name")].map((team) => team.textContent.trim())
      ])
    );
    const advancingGroups = new Map(
      cards.map((card) => [
        card.querySelector("h2")?.textContent.trim(),
        [...card.querySelectorAll("tbody tr.is-advancing .standing-name")]
          .map((team) => team.textContent.trim())
          .sort()
      ])
    );
    const groupACard = cards.find((card) => card.querySelector("h2")?.textContent.trim() === "Group A");

    return {
      advancingGroupA: advancingGroups.get("Group A"),
      advancingTotal: [...document.querySelectorAll(".standings-card tbody tr.is-advancing")].length,
      groupA: groups.get("Group A"),
      groupAFlagCount: groupACard?.querySelectorAll(".standing-team .flag").length || 0,
      groupARanks: [...(groupACard?.querySelectorAll(".rank-pill") || [])].map((pill) => ({
        ariaLabel: pill.getAttribute("aria-label") || "",
        text: pill.textContent.trim(),
        tooltip: pill.getAttribute("data-tooltip") || ""
      })),
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
    historicalStandingsCheck.groupARanks.map((entry) => entry.text).join("|") === "#8|#18|#44|#50" &&
      historicalStandingsCheck.groupARanks.every(
        (entry) =>
          entry.tooltip === "FIFA world ranking during the 2022 World Cup" &&
          entry.ariaLabel.includes("(2022)")
      ),
    `The 2022 archived standings should use the final pre-tournament FIFA ranking snapshot and year-scoped tooltip. Measured ${JSON.stringify(historicalStandingsCheck.groupARanks)}.`
  );
  assert(
    historicalStandingsCheck.advancingGroupA?.join("|") === "Netherlands|Senegal" &&
      historicalStandingsCheck.advancingTotal === 16,
    `The 2022 archived Groups tab should highlight the teams that reached the Tournament stage. Measured ${JSON.stringify(historicalStandingsCheck)}.`
  );
  assert(
    historicalStandingsCheck.summary === "Final group tables use archived results and tournament-era tie-breakers.",
    "Historical standings should explain their archived data source."
  );
  for (const knockoutOnlyYear of [1934, 1938]) {
    await page.goto(
      `${baseUrl}?view=standings&standingsYear=${knockoutOnlyYear}&standingsMode=groups`,
      { waitUntil: "load" }
    );
    await waitForHistoricalStandingsYear(page, knockoutOnlyYear, "tournament");
    await page.waitForSelector(".historical-tournament-view .progress-match");
    const knockoutOnlyArchiveCheck = await page.evaluate(() => ({
      emptyGroupMessageVisible: [...document.querySelectorAll(".past-empty")].some((element) =>
        element.textContent.includes("Group standings are not available")
      ),
      groupsTabHidden: document.querySelector("#standings-groups-tab")?.hidden === true,
      modeTabsHidden: document.querySelector("#standings-mode-tabs")?.hidden === true,
      tournamentCardCount: document.querySelectorAll(".historical-tournament-view .progress-match").length,
      urlMode: new URL(window.location.href).searchParams.get("standingsMode") || ""
    }));
    const expectedTournamentCardCount = knockoutOnlyYear === 1934 ? 17 : 19;

    assert(
      knockoutOnlyArchiveCheck.groupsTabHidden &&
        knockoutOnlyArchiveCheck.modeTabsHidden &&
        !knockoutOnlyArchiveCheck.emptyGroupMessageVisible &&
        knockoutOnlyArchiveCheck.tournamentCardCount === expectedTournamentCardCount &&
        knockoutOnlyArchiveCheck.urlMode === "",
      `The ${knockoutOnlyYear} straight-knockout archive should expose only Tournament, including when a Groups URL is requested. Measured ${JSON.stringify(knockoutOnlyArchiveCheck)}.`
    );

    const historicalReplayAlignmentCheck = await page.evaluate(() =>
      [...document.querySelectorAll(".historical-tournament-view .progress-round")]
        .filter((round) => /replay/i.test(round.dataset.roundId || round.getAttribute("aria-label") || ""))
        .flatMap((round) =>
          [...round.querySelectorAll(".progress-match")].map((replayMatch) => {
            const replayRoundIndex = Number(replayMatch.dataset.roundIndex);
            const source = [...document.querySelectorAll(
              `.historical-tournament-view .progress-match[data-next-match="${CSS.escape(replayMatch.dataset.matchNumber || "")}"]`
            )]
              .filter((candidate) => Number(candidate.dataset.roundIndex) < replayRoundIndex)
              .sort((a, b) => Number(b.dataset.roundIndex) - Number(a.dataset.roundIndex))[0];
            const path = document.querySelector(
              `.historical-tournament-view .progress-connectors path[data-source-match-number="${CSS.escape(source?.dataset.matchNumber || "")}"][data-target-match-number="${CSS.escape(replayMatch.dataset.matchNumber || "")}"]`
            );
            const sourceRect = source?.getBoundingClientRect();
            const replayRect = replayMatch.getBoundingClientRect();
            const sourceCenterY = sourceRect ? sourceRect.top + sourceRect.height / 2 : 0;
            const replayCenterY = replayRect.top + replayRect.height / 2;
            const pathData = path?.getAttribute("d") || "";

            return {
              pathData,
              replayMatchNumber: replayMatch.dataset.matchNumber || "",
              sourceMatchNumber: source?.dataset.matchNumber || "",
              verticalDelta: Math.abs(sourceCenterY - replayCenterY),
              isStraightPath: /^M\s+[\d.]+\s+[\d.]+\s+H\s+[\d.]+$/.test(pathData)
            };
          })
        )
    );
    assert(
      historicalReplayAlignmentCheck.length > 0 &&
        historicalReplayAlignmentCheck.every(
          (entry) => entry.sourceMatchNumber && entry.verticalDelta <= 1 && entry.isStraightPath
        ),
      `Every ${knockoutOnlyYear} replay should sit directly right of its original drawn match at the same height with a straight connector. Measured ${JSON.stringify(historicalReplayAlignmentCheck)}.`
    );

    if (knockoutOnlyYear === 1934) {
      const historicalVenueCheck = await page.evaluate(() => {
        const venue = document.querySelector(
          '.historical-tournament-view .progress-match[data-match-number="6"] .knockout-match-venue'
        );
        return {
          label: venue?.textContent.trim() || "",
          tooltip: venue?.getAttribute("data-tooltip") || ""
        };
      });
      assert(
        historicalVenueCheck.label === "Milan, Italy" &&
          historicalVenueCheck.tooltip === "Stadio San Siro • Milan, Italy",
        `Historical venue cards should show a complete city and country, with the stadium in the tooltip. Measured ${JSON.stringify(historicalVenueCheck)}.`
      );

      const historical1934ReplayPathCheck = await page.evaluate(() => {
        const svg = document.querySelector(".historical-tournament-view .progress-connectors");
        const directPath = svg?.querySelector(
          'path[data-source-match-number="12"][data-target-match-number="14"]'
        );
        const replayPath = svg?.querySelector(
          'path[data-source-match-number="13"][data-target-match-number="14"]'
        );
        const originalDrawPath = svg?.querySelector(
          'path[data-source-match-number="11"][data-target-match-number="13"]'
        );
        const originalDraw = document.querySelector(
          '.historical-tournament-view .progress-match[data-match-number="11"]'
        );
        const replayMatch = document.querySelector(
          '.historical-tournament-view .progress-match[data-match-number="13"]'
        );
        const replayRound = document.querySelector(
          '.historical-tournament-view .progress-round[data-round-index="2"]'
        );
        const semiFinal = document.querySelector(
          '.historical-tournament-view .progress-match[data-match-number="14"]'
        );
        const svgRect = svg?.getBoundingClientRect();
        const viewBoxWidth = svg?.viewBox?.baseVal?.width || 0;
        const scaleX = svgRect?.width ? viewBoxWidth / svgRect.width : 1;
        const relativeX = (value) => (value - (svgRect?.left || 0)) * scaleX;
        const directPathData = directPath?.getAttribute("d") || "";
        const originalDrawPathData = originalDrawPath?.getAttribute("d") || "";
        const replayPathData = replayPath?.getAttribute("d") || "";
        const getJoinX = (pathData) => Number(/\bH\s+([\d.]+)/.exec(pathData)?.[1] || 0);
        const getCenterY = (element) => {
          const rect = element?.getBoundingClientRect();
          return rect ? rect.top + rect.height / 2 : 0;
        };

        return {
          directJoinX: getJoinX(directPathData),
          directPathClass: directPath?.getAttribute("class") || "",
          directPathData,
          originalDrawCenterY: getCenterY(originalDraw),
          originalDrawPathData,
          originalDrawPathStraight: /^M\s+[\d.]+\s+[\d.]+\s+H\s+[\d.]+$/.test(
            originalDrawPathData
          ),
          replayMatchCenterY: getCenterY(replayMatch),
          replayJoinX: getJoinX(replayPathData),
          replayPathData,
          replayRoundRight: relativeX(replayRound?.getBoundingClientRect().right || 0),
          semiFinalLeft: relativeX(semiFinal?.getBoundingClientRect().left || 0)
        };
      });

      assert(
        historical1934ReplayPathCheck.directPathClass.includes("is-round-skip") &&
          historical1934ReplayPathCheck.directJoinX > historical1934ReplayPathCheck.replayRoundRight &&
          historical1934ReplayPathCheck.directJoinX < historical1934ReplayPathCheck.semiFinalLeft &&
          Math.abs(
            historical1934ReplayPathCheck.directJoinX - historical1934ReplayPathCheck.replayJoinX
          ) <= 1 &&
          Math.abs(
            historical1934ReplayPathCheck.originalDrawCenterY -
              historical1934ReplayPathCheck.replayMatchCenterY
          ) <= 1 &&
          historical1934ReplayPathCheck.originalDrawPathStraight,
        `The Austria-Hungary quarter-final path should bypass the Replay column, while the Italy-Spain replay should sit directly right of the drawn match on a straight horizontal path. Measured ${JSON.stringify(historical1934ReplayPathCheck)}.`
      );
    }
  }
  await page.goto(`${baseUrl}?view=standings&standingsYear=2010`, { waitUntil: "load" });
  await waitForHistoricalStandingsYear(page, 2010, "tournament");
  await page.waitForSelector('.historical-tournament-view .progress-match[data-match-number="49"]');
  const historical2010TournamentCheck = await page.evaluate(() => {
    const opener = document.querySelector('.historical-tournament-view .progress-match[data-match-number="49"]');
    const finalCard = document.querySelector('.historical-tournament-view .progress-match[data-match-number="64"]');

    return {
      finalText: finalCard?.textContent.replace(/\s+/g, " ").trim() || "",
      finalRanks: [...(finalCard?.querySelectorAll(".rank-pill") || [])].map((pill) => pill.textContent.trim()),
      openerText: opener?.textContent.replace(/\s+/g, " ").trim() || "",
      openerRanks: [...(opener?.querySelectorAll(".rank-pill") || [])].map((pill) => pill.textContent.trim()),
      roundHeadings: [...document.querySelectorAll(".historical-tournament-view .progress-round h3")].map((heading) =>
        heading.textContent.trim()
      ),
      tournamentPressed: document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed"),
      urlMode: new URL(window.location.href).searchParams.get("standingsMode") || ""
    };
  });
  assert(
    historical2010TournamentCheck.tournamentPressed === "true" &&
      historical2010TournamentCheck.urlMode === "" &&
      historical2010TournamentCheck.roundHeadings.join("|") ===
        "Round of 16|Quarter-finals|Semi-finals|Final" &&
      historical2010TournamentCheck.openerText.includes("Uruguay") &&
      historical2010TournamentCheck.openerText.includes("South Korea") &&
      historical2010TournamentCheck.openerRanks.join("|") === "#16|#47" &&
      historical2010TournamentCheck.finalText.includes("Netherlands") &&
      historical2010TournamentCheck.finalText.includes("Spain") &&
      historical2010TournamentCheck.finalRanks.join("|") === "#4|#2" &&
      historical2010TournamentCheck.finalText.includes("0-1"),
    `The 2010 archived standings direct link should open on its Tournament bracket. Measured ${JSON.stringify(historical2010TournamentCheck)}.`
  );
  await page.goto(`${baseUrl}?view=standings&standingsYear=1958`, { waitUntil: "load" });
  await waitForHistoricalStandingsYear(page, 1958, "tournament");
  await page.waitForSelector('.historical-tournament-view .progress-match[data-match-number="28"]');
  const historical1958TournamentCheck = await page.evaluate(() => {
    const progress = document.querySelector(".historical-tournament-view");
    const matchNumbers = [...document.querySelectorAll(".historical-tournament-view .progress-match")].map((match) =>
      match.getAttribute("data-match-number")
    );
    const matchText = (matchNumber) =>
      document
        .querySelector(`.historical-tournament-view .progress-match[data-match-number="${matchNumber}"]`)
        ?.textContent.replace(/\s+/g, " ")
        .trim() || "";
    const matchRanks = (matchNumber) =>
      [...document.querySelectorAll(
        `.historical-tournament-view .progress-match[data-match-number="${matchNumber}"] .rank-pill`
      )].map((pill) => ({
        text: pill.textContent.trim(),
        tooltip: pill.getAttribute("data-tooltip") || ""
      }));

    return {
      finalText: matchText(35),
      finalRanks: matchRanks(35),
      matchCount: matchNumbers.length,
      matchNumbers,
      rankPillCount: progress?.querySelectorAll(".rank-pill").length || 0,
      progressText: progress?.textContent.replace(/\s+/g, " ").trim() || "",
      quarterFinalText: matchText(28),
      quarterFinalRanks: matchRanks(28),
      roundHeadings: [...document.querySelectorAll(".historical-tournament-view .progress-round h3")].map((heading) =>
        heading.textContent.trim()
      ),
      summary: document.querySelector("#standings-summary")?.textContent.trim(),
      tournamentPressed: document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed"),
      urlMode: new URL(window.location.href).searchParams.get("standingsMode") || ""
    };
  });
  assert(
    historical1958TournamentCheck.tournamentPressed === "true" &&
      historical1958TournamentCheck.urlMode === "" &&
      historical1958TournamentCheck.summary === "Tournament path uses archived match results." &&
      historical1958TournamentCheck.roundHeadings.join("|") === "Quarter-finals|Semi-finals|Final" &&
      historical1958TournamentCheck.matchCount === 8 &&
      historical1958TournamentCheck.rankPillCount === 16 &&
      historical1958TournamentCheck.quarterFinalRanks.map((entry) => entry.text).join("|") === "#14|#26" &&
      historical1958TournamentCheck.finalRanks.map((entry) => entry.text).join("|") === "#18|#4" &&
      [...historical1958TournamentCheck.quarterFinalRanks, ...historical1958TournamentCheck.finalRanks].every(
        (entry) => entry.tooltip === "Retrospective Elo ranking during the 1958 World Cup"
      ) &&
      !historical1958TournamentCheck.matchNumbers.includes("7") &&
      !historical1958TournamentCheck.matchNumbers.includes("20") &&
      !historical1958TournamentCheck.matchNumbers.includes("27") &&
      !historical1958TournamentCheck.progressText.includes("Group 1 Play-off") &&
      !historical1958TournamentCheck.progressText.includes("Group 3 Play-off") &&
      !historical1958TournamentCheck.progressText.includes("Group 4 Play-off") &&
      historical1958TournamentCheck.quarterFinalText.includes("France") &&
      historical1958TournamentCheck.quarterFinalText.includes("Northern Ireland") &&
      historical1958TournamentCheck.finalText.includes("Sweden") &&
      historical1958TournamentCheck.finalText.includes("Brazil"),
    `The 1958 archived Tournament tab should start at the quarter-finals and exclude group tie-breaker play-offs. Measured ${JSON.stringify(historical1958TournamentCheck)}.`
  );
  await page.goto(`${baseUrl}?view=matches&date=1958-06-19&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="wc-1958-1958-06-19-quarter-finals-france-northern-ireland"]');
  await page.locator('[data-match-id="wc-1958-1958-06-19-quarter-finals-france-northern-ireland"]').click();
  const historical1958QuarterFinalDetail = await page.locator("#match-info").evaluate((root) => {
    const sectionHeadings = [...root.querySelectorAll(":scope > .match-info-content > .info-block")]
      .map((section) => section.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() || "")
      .filter(Boolean);

    return {
      previousHeading: sectionHeadings.find((heading) => heading.startsWith("Previous:")) || "",
      sectionHeadings,
      text: root.innerText
    };
  });
  assert(
    historical1958QuarterFinalDetail.previousHeading === "Previous: Group round" &&
      !historical1958QuarterFinalDetail.text.includes("Previous: Group 1 Play-off"),
    `The 1958 quarter-final detail should treat the group play-off as a group tie-breaker, not prior knockout context. Measured ${JSON.stringify(historical1958QuarterFinalDetail)}.`
  );
  await page.goto(`${baseUrl}?view=standings&standingsYear=1958&standingsMode=groups`, { waitUntil: "load" });
  await waitForHistoricalStandingsYear(page, 1958, "groups");
  await page.waitForFunction(() => document.querySelectorAll(".standings-card tbody tr.is-advancing").length >= 8);
  const historical1958GroupAdvancementCheck = await page.evaluate(() => {
    const getAdvancing = (groupName) => {
      const card = [...document.querySelectorAll(".standings-card")].find(
        (item) => item.querySelector("h2")?.textContent.trim() === groupName
      );
      return [...(card?.querySelectorAll("tbody tr.is-advancing .standing-name") || [])]
        .map((team) => team.textContent.trim())
        .sort();
    };
    const getOrder = (groupName) => {
      const card = [...document.querySelectorAll(".standings-card")].find(
        (item) => item.querySelector("h2")?.textContent.trim() === groupName
      );
      return [...(card?.querySelectorAll("tbody tr .standing-name") || [])].map((team) => team.textContent.trim());
    };

    return {
      group1: getAdvancing("Group 1"),
      group1Order: getOrder("Group 1"),
      group2: getAdvancing("Group 2"),
      group3: getAdvancing("Group 3"),
      group3Order: getOrder("Group 3"),
      group4: getAdvancing("Group 4"),
      group4Order: getOrder("Group 4"),
      highlightedCount: document.querySelectorAll(".standings-card tbody tr.is-advancing").length
    };
  });
  assert(
    historical1958GroupAdvancementCheck.group1.join("|") === "Northern Ireland|West Germany" &&
      historical1958GroupAdvancementCheck.group2.join("|") === "France|Yugoslavia" &&
      historical1958GroupAdvancementCheck.group3.join("|") === "Sweden|Wales" &&
      historical1958GroupAdvancementCheck.group4.join("|") === "Brazil|Soviet Union" &&
      historical1958GroupAdvancementCheck.group1Order.slice(0, 3).join("|") ===
        "West Germany|Northern Ireland|Czechoslovakia" &&
      historical1958GroupAdvancementCheck.group3Order.slice(0, 3).join("|") === "Sweden|Wales|Hungary" &&
      historical1958GroupAdvancementCheck.group4Order.slice(0, 3).join("|") === "Brazil|Soviet Union|England" &&
      historical1958GroupAdvancementCheck.highlightedCount === 8,
    `The 1958 archived Groups tab should highlight the teams that actually reached the knockout bracket, including group-playoff winners only. Measured ${JSON.stringify(historical1958GroupAdvancementCheck)}.`
  );
  await page.goto(`${baseUrl}?view=standings&standingsYear=1954`, { waitUntil: "load" });
  await waitForHistoricalStandingsYear(page, 1954, "tournament");
  await page.waitForSelector('.historical-tournament-view .progress-match[data-match-number="19"]');
  const historical1954TournamentCheck = await page.evaluate(() => {
    const progress = document.querySelector(".historical-tournament-view");
    const matchNumbers = [...document.querySelectorAll(".historical-tournament-view .progress-match")].map((match) =>
      match.getAttribute("data-match-number")
    );

    return {
      matchCount: matchNumbers.length,
      matchNumbers,
      progressText: progress?.textContent.replace(/\s+/g, " ").trim() || "",
      roundHeadings: [...document.querySelectorAll(".historical-tournament-view .progress-round h3")].map((heading) =>
        heading.textContent.trim()
      )
    };
  });
  assert(
    historical1954TournamentCheck.roundHeadings.join("|") === "Quarter-finals|Semi-finals|Final" &&
      historical1954TournamentCheck.matchCount === 8 &&
      !historical1954TournamentCheck.matchNumbers.includes("9") &&
      !historical1954TournamentCheck.matchNumbers.includes("18") &&
      !historical1954TournamentCheck.progressText.includes("Group 2 Play-off") &&
      !historical1954TournamentCheck.progressText.includes("Group 4 Play-off"),
    `The 1954 archived Tournament tab should also exclude group tie-breaker play-offs. Measured ${JSON.stringify(historical1954TournamentCheck)}.`
  );
  await page.goto(`${baseUrl}?view=standings&standingsYear=1954&standingsMode=groups`, { waitUntil: "load" });
  await waitForHistoricalStandingsYear(page, 1954, "groups");
  await page.waitForFunction(() => document.querySelectorAll(".standings-card tbody tr.is-advancing").length >= 8);
  const historical1954GroupAdvancementCheck = await page.evaluate(() => {
    const getAdvancing = (groupName) => {
      const card = [...document.querySelectorAll(".standings-card")].find(
        (item) => item.querySelector("h2")?.textContent.trim() === groupName
      );
      return [...(card?.querySelectorAll("tbody tr.is-advancing .standing-name") || [])]
        .map((team) => team.textContent.trim())
        .sort();
    };
    const getOrder = (groupName) => {
      const card = [...document.querySelectorAll(".standings-card")].find(
        (item) => item.querySelector("h2")?.textContent.trim() === groupName
      );
      return [...(card?.querySelectorAll("tbody tr .standing-name") || [])].map((team) => team.textContent.trim());
    };

    return {
      group2: getAdvancing("Group 2"),
      group2Order: getOrder("Group 2"),
      group4: getAdvancing("Group 4"),
      group4Order: getOrder("Group 4"),
      highlightedCount: document.querySelectorAll(".standings-card tbody tr.is-advancing").length
    };
  });
  assert(
    historical1954GroupAdvancementCheck.group2.join("|") === "Hungary|West Germany" &&
      historical1954GroupAdvancementCheck.group4.join("|") === "England|Switzerland" &&
      historical1954GroupAdvancementCheck.group2Order.slice(0, 3).join("|") ===
        "Hungary|West Germany|Turkey" &&
      historical1954GroupAdvancementCheck.group4Order.slice(0, 3).join("|") ===
        "England|Switzerland|Italy" &&
      historical1954GroupAdvancementCheck.highlightedCount === 8,
    `The 1954 archived Groups tab should highlight group-playoff winners without highlighting eliminated playoff losers. Measured ${JSON.stringify(historical1954GroupAdvancementCheck)}.`
  );
  await page.goto(`${baseUrl}?view=standings&standingsYear=1994&standingsMode=groups`, { waitUntil: "load" });
  await waitForHistoricalStandingsYear(page, 1994, "groups");
  await page.waitForFunction(() => document.querySelectorAll(".standings-card tbody tr.is-advancing").length >= 16);
  const historical1994TiebreakOrderCheck = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".standings-card")];
    const getOrder = (groupName) => {
      const card = cards.find(
        (item) => item.querySelector("h2")?.textContent.trim() === groupName
      );
      return [...(card?.querySelectorAll("tbody tr .standing-name") || [])].map((team) => team.textContent.trim());
    };
    const groupECard = cards.find((card) => card.querySelector("h2")?.textContent.trim() === "Group E");

    return {
      groupD: getOrder("Group D"),
      groupE: getOrder("Group E"),
      groupF: getOrder("Group F"),
      groupERanks: [...(groupECard?.querySelectorAll(".rank-pill") || [])].map((pill) => ({
        text: pill.textContent.trim(),
        tooltip: pill.getAttribute("data-tooltip") || ""
      })),
      groupHeadings: [...document.querySelectorAll(".standings-card h2")].map((heading) => heading.textContent.trim()),
      rankPillCount: document.querySelectorAll(".standings-card .rank-pill").length
    };
  });
  assert(
    historical1994TiebreakOrderCheck.groupD.join("|") === "Nigeria|Bulgaria|Argentina|Greece" &&
      historical1994TiebreakOrderCheck.groupE.join("|") === "Mexico|Ireland|Italy|Norway" &&
      historical1994TiebreakOrderCheck.groupF.join("|") === "Netherlands|Saudi Arabia|Belgium|Morocco" &&
      historical1994TiebreakOrderCheck.groupERanks.map((entry) => entry.text).join("|") === "#16|#14|#4|#6" &&
      historical1994TiebreakOrderCheck.groupERanks.every(
        (entry) => entry.tooltip === "FIFA world ranking during the 1994 World Cup"
      ) &&
      historical1994TiebreakOrderCheck.rankPillCount === 24 &&
      historical1994TiebreakOrderCheck.groupHeadings.join("|") === "Group A|Group B|Group C|Group D|Group E|Group F",
    `The 1994 archived tables should preserve the complete official order when three or four teams finish level on points. Measured ${JSON.stringify(historical1994TiebreakOrderCheck)}.`
  );
  await page.goto(`${baseUrl}?view=standings&standingsYear=1930&standingsMode=groups`, { waitUntil: "load" });
  await waitForHistoricalStandingsYear(page, 1930, "groups");
  await page.waitForFunction(() => document.querySelectorAll(".standings-card tbody tr.is-advancing").length >= 4);
  const historical1930GroupAdvancementCheck = await page.evaluate(() => {
    const getAdvancing = (groupName) => {
      const card = [...document.querySelectorAll(".standings-card")].find(
        (item) => item.querySelector("h2")?.textContent.trim() === groupName
      );
      return [...(card?.querySelectorAll("tbody tr.is-advancing .standing-name") || [])]
        .map((team) => team.textContent.trim())
        .sort();
    };
    const group1Card = [...document.querySelectorAll(".standings-card")].find(
      (item) => item.querySelector("h2")?.textContent.trim() === "Group 1"
    );

    return {
      group1: getAdvancing("Group 1"),
      group2: getAdvancing("Group 2"),
      group3: getAdvancing("Group 3"),
      group4: getAdvancing("Group 4"),
      group1Ranks: [...(group1Card?.querySelectorAll(".rank-pill") || [])].map((pill) => ({
        text: pill.textContent.trim(),
        tooltip: pill.getAttribute("data-tooltip") || ""
      })),
      highlightedCount: document.querySelectorAll(".standings-card tbody tr.is-advancing").length,
      rankPillCount: document.querySelectorAll(".standings-card .rank-pill").length
    };
  });
  assert(
    historical1930GroupAdvancementCheck.group1.join("|") === "Argentina" &&
      historical1930GroupAdvancementCheck.group2.join("|") === "Yugoslavia" &&
      historical1930GroupAdvancementCheck.group3.join("|") === "Uruguay" &&
      historical1930GroupAdvancementCheck.group4.join("|") === "United States" &&
      historical1930GroupAdvancementCheck.highlightedCount === 4 &&
      historical1930GroupAdvancementCheck.rankPillCount === 13 &&
      historical1930GroupAdvancementCheck.group1Ranks.map((entry) => entry.text).join("|") ===
        "#1|#34|#41|#28" &&
      historical1930GroupAdvancementCheck.group1Ranks.every(
        (entry) => entry.tooltip === "Retrospective Elo ranking during the 1930 World Cup"
      ),
    `The 1930 archived Groups tab should highlight only the single group winner that reached the semi-finals. Measured ${JSON.stringify(historical1930GroupAdvancementCheck)}.`
  );
  await page.goto(`${baseUrl}?view=standings&standingsYear=1950`, { waitUntil: "load" });
  await waitForHistoricalStandingsYear(page, 1950, "tournament");
  await page.waitForSelector('.historical-tournament-view .progress-match[data-match-number="22"]');
  const historical1950ChampionshipPoolCheck = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".historical-tournament-view .progress-match")];

    return {
      cardCount: cards.length,
      linkedPathCount: cards.filter(
        (card) => card.hasAttribute("data-next-match") || card.hasAttribute("data-runner-up-next-match")
      ).length,
      matchNumbers: cards.map((card) => card.getAttribute("data-match-number")),
      progressionLabel: document
        .querySelector(".historical-tournament-view .tournament-progression")
        ?.getAttribute("aria-label"),
      roundClassCount: document.querySelectorAll(".historical-tournament-view .progress-round.is-final-group").length,
      roundHeadings: [...document.querySelectorAll(".historical-tournament-view .progress-round h3")].map((heading) =>
        heading.textContent.trim()
      ),
      formatNote: document
        .querySelector(".historical-tournament-format-note")
        ?.textContent.replace(/\s+/g, " ")
        .trim(),
      summary: document.querySelector("#standings-summary")?.textContent.trim(),
      viewLabel: document.querySelector(".historical-tournament-view")?.getAttribute("aria-label")
    };
  });
  assert(
    historical1950ChampionshipPoolCheck.cardCount === 1 &&
      historical1950ChampionshipPoolCheck.matchNumbers.join("|") === "22" &&
      historical1950ChampionshipPoolCheck.roundHeadings.join("|") === "Title decider" &&
      historical1950ChampionshipPoolCheck.roundClassCount === 0 &&
      historical1950ChampionshipPoolCheck.linkedPathCount === 0 &&
      historical1950ChampionshipPoolCheck.summary ===
        "1950 ended with a four-team final round. Uruguay–Brazil was the title decider." &&
      historical1950ChampionshipPoolCheck.formatNote ===
        "No knockout final Four group winners played a round-robin. Uruguay–Brazil decided the title on the last matchday. See the Groups tab for the complete final-round table." &&
      historical1950ChampionshipPoolCheck.viewLabel === "Tournament path" &&
      historical1950ChampionshipPoolCheck.progressionLabel === "Tournament progression",
    `The 1950 archived Tournament tab should explain the format and show only the title decider, without presenting the championship pool as a knockout path. Measured ${JSON.stringify(historical1950ChampionshipPoolCheck)}.`
  );
  await page.goto(`${baseUrl}?view=standings&standingsYear=1950&standingsMode=groups`, { waitUntil: "load" });
  await waitForHistoricalStandingsYear(page, 1950, "groups");
  await page.waitForSelector(".historical-championship-table");
  await page.waitForFunction(() => {
    const championshipCard = document.querySelector(".historical-championship-table");
    return (
      document.querySelectorAll(".standings-card h2").length >= 5 &&
      championshipCard?.querySelectorAll("tbody .standing-name").length === 4 &&
      championshipCard?.querySelector(".standing-status-pill.is-champion")
    );
  });
  const historical1950FinalStandingsCheck = await page.evaluate(() => {
    const championshipCard = document.querySelector(".historical-championship-table");
    return {
      championBadges: [...championshipCard.querySelectorAll(".standing-status-pill.is-champion")].map((badge) =>
        badge.textContent.trim()
      ),
      groupHeadings: [...document.querySelectorAll(".standings-card h2")].map((heading) => heading.textContent.trim()),
      note: championshipCard
        .querySelector(".historical-championship-table-note")
        ?.textContent.trim(),
      order: [...championshipCard.querySelectorAll("tbody .standing-name")].map((team) => team.textContent.trim()),
      pointsHelp: championshipCard
        .querySelector("thead th:nth-child(2) .standing-help")
        ?.getAttribute("data-tooltip"),
      summary: document.querySelector("#standings-summary")?.textContent.trim()
    };
  });
  assert(
    historical1950FinalStandingsCheck.groupHeadings.join("|") ===
      "Group 1|Group 2|Group 3|Group 4|Final round standings" &&
      historical1950FinalStandingsCheck.order.join("|") === "Uruguay|Brazil|Sweden|Spain" &&
      historical1950FinalStandingsCheck.championBadges.join("|") === "Champion" &&
      historical1950FinalStandingsCheck.note ===
        "This four-team table decided the 1950 world champion." &&
      historical1950FinalStandingsCheck.pointsHelp ===
        "Points use this tournament's scoring: 2 for a win, 1 for a tie, 0 for a loss." &&
      historical1950FinalStandingsCheck.summary ===
        "First-round groups and the final-round championship table use archived results and tournament-era tie-breakers.",
    `The 1950 archived Groups tab should include the complete final-round championship table with Uruguay marked as champion. Measured ${JSON.stringify(historical1950FinalStandingsCheck)}.`
  );
  const historicalFinalGroupTournamentCases = [
    {
      excludedMatchNumbers: ["25", "36"],
      expectedMatchNumbers: ["37", "38"],
      expectedRoundHeadings: "Final",
      expectedTextByMatchNumber: {
        37: ["Brazil", "Poland"],
        38: ["Netherlands", "West Germany"]
      },
      forbiddenText: ["Final round Group", "Second round Group"],
      waitMatchNumber: "38",
      year: 1974
    },
    {
      excludedMatchNumbers: ["25", "36"],
      expectedMatchNumbers: ["37", "38"],
      expectedRoundHeadings: "Final",
      expectedTextByMatchNumber: {
        37: ["Brazil", "Italy"],
        38: ["Netherlands", "Argentina"]
      },
      forbiddenText: ["Final round Group", "Second round Group"],
      waitMatchNumber: "38",
      year: 1978
    },
    {
      excludedMatchNumbers: ["37", "48"],
      expectedMatchNumbers: ["49", "50", "51", "52"],
      expectedRoundHeadings: "Semi-finals|Final",
      expectedTextByMatchNumber: {
        49: ["Poland", "Italy"],
        50: ["West Germany", "France"],
        51: ["Poland", "France"],
        52: ["Italy", "West Germany"]
      },
      forbiddenText: ["Final round Group", "Second round Group"],
      waitMatchNumber: "52",
      year: 1982
    }
  ];

  for (const historicalTournamentCase of historicalFinalGroupTournamentCases) {
    await page.goto(`${baseUrl}?view=standings&standingsYear=${historicalTournamentCase.year}`, { waitUntil: "load" });
    await waitForHistoricalStandingsYear(page, historicalTournamentCase.year, "tournament");
    await page.waitForSelector(
      `.historical-tournament-view .progress-match[data-match-number="${historicalTournamentCase.waitMatchNumber}"]`
    );
    const historicalFinalGroupTournamentCheck = await page.evaluate((expectedTextByMatchNumber) => {
      const matchText = (matchNumber) =>
        document
          .querySelector(`.historical-tournament-view .progress-match[data-match-number="${matchNumber}"]`)
          ?.textContent.replace(/\s+/g, " ")
          .trim() || "";

      return {
        groupPoolRoundCount: document.querySelectorAll(".historical-tournament-view .progress-round.is-final-group").length,
        matchNumbers: [...document.querySelectorAll(".historical-tournament-view .progress-match")].map((match) =>
          match.getAttribute("data-match-number")
        ),
        matchTextByNumber: Object.fromEntries(
          Object.keys(expectedTextByMatchNumber).map((matchNumber) => [matchNumber, matchText(matchNumber)])
        ),
        progressText: document.querySelector(".historical-tournament-view")?.textContent.replace(/\s+/g, " ").trim() || "",
        roundHeadings: [...document.querySelectorAll(".historical-tournament-view .progress-round h3")].map((heading) =>
          heading.textContent.trim()
        ),
        summary: document.querySelector("#standings-summary")?.textContent.trim(),
        tournamentPressed: document.querySelector("#standings-tournament-tab")?.getAttribute("aria-pressed"),
        urlMode: new URL(window.location.href).searchParams.get("standingsMode") || ""
      };
    }, historicalTournamentCase.expectedTextByMatchNumber);
    const matchTextIsCorrect = Object.entries(historicalTournamentCase.expectedTextByMatchNumber).every(
      ([matchNumber, expectedTexts]) =>
        expectedTexts.every((expectedText) =>
          historicalFinalGroupTournamentCheck.matchTextByNumber[matchNumber]?.includes(expectedText)
        )
    );
    const tournamentMatchNumbers = new Set(historicalFinalGroupTournamentCheck.matchNumbers);
    const onlyExpectedMatches =
      historicalFinalGroupTournamentCheck.matchNumbers.length === historicalTournamentCase.expectedMatchNumbers.length &&
      historicalTournamentCase.expectedMatchNumbers.every((matchNumber) => tournamentMatchNumbers.has(matchNumber)) &&
      historicalTournamentCase.excludedMatchNumbers.every((matchNumber) => !tournamentMatchNumbers.has(matchNumber));
    const noForbiddenGroupText = historicalTournamentCase.forbiddenText.every(
      (text) => !historicalFinalGroupTournamentCheck.progressText.includes(text)
    );

    assert(
      historicalFinalGroupTournamentCheck.tournamentPressed === "true" &&
        historicalFinalGroupTournamentCheck.urlMode === "" &&
        historicalFinalGroupTournamentCheck.summary === "Tournament path uses archived match results." &&
        historicalFinalGroupTournamentCheck.roundHeadings.join("|") === historicalTournamentCase.expectedRoundHeadings &&
        historicalFinalGroupTournamentCheck.groupPoolRoundCount === 0 &&
        onlyExpectedMatches &&
        matchTextIsCorrect &&
        noForbiddenGroupText,
      `The ${historicalTournamentCase.year} archived Tournament tab should hide second-stage group pools and show only placement/bracket matches. Measured ${JSON.stringify(historicalFinalGroupTournamentCheck)}.`
    );
  }
  await page.goto(`${baseUrl}?view=standings&standingsYear=1978&standingsMode=groups`, { waitUntil: "load" });
  await waitForHistoricalStandingsYear(page, 1978, "groups");
  await page.waitForFunction(() => document.querySelectorAll(".standings-card tbody tr.is-advancing").length >= 12);
  const historical1978GroupAdvancementCheck = await page.evaluate(() => {
    const getAdvancing = (groupName) => {
      const card = [...document.querySelectorAll(".standings-card")].find(
        (item) => item.querySelector("h2")?.textContent.trim() === groupName
      );
      return [...(card?.querySelectorAll("tbody tr.is-advancing .standing-name") || [])]
        .map((team) => team.textContent.trim())
        .sort();
    };

    return {
      finalGroupA: getAdvancing("Group A"),
      finalGroupB: getAdvancing("Group B"),
      group1: getAdvancing("Group 1"),
      highlightedCount: document.querySelectorAll(".standings-card tbody tr.is-advancing").length
    };
  });
  assert(
    historical1978GroupAdvancementCheck.group1.join("|") === "Argentina|Italy" &&
      historical1978GroupAdvancementCheck.finalGroupA.join("|") === "Italy|Netherlands" &&
      historical1978GroupAdvancementCheck.finalGroupB.join("|") === "Argentina|Brazil" &&
      historical1978GroupAdvancementCheck.highlightedCount === 12,
    `The 1978 archived Groups tab should highlight first-stage advancers and final-round teams that reached placement matches. Measured ${JSON.stringify(historical1978GroupAdvancementCheck)}.`
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
  const mobileTimeZoneLabel = await page.locator("#timezone-select option:checked").textContent();
  assert(
    mobileTimeZoneLabel?.includes("America/Los Angeles"),
    "Mobile settings timezone should keep the full desktop-style timezone label."
  );
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
  const mobileToolbarMetrics = await page.evaluate(() => {
    const toolbar = document.querySelector(".match-toolbar")?.getBoundingClientRect();
    const dayLabel = document.querySelector("#day-label")?.getBoundingClientRect();
    const search = document.querySelector("#team-search")?.getBoundingClientRect();
    const searchToggle = document.querySelector("#team-search-toggle")?.getBoundingClientRect();

    if (!toolbar || !dayLabel || !search || !searchToggle) {
      return null;
    }

    return {
      gapFromDate: Math.round(search.left - dayLabel.right),
      searchRightGap: Math.round(toolbar.right - search.right),
      toggleRightGap: Math.round(toolbar.right - searchToggle.right)
    };
  });
  assert(
    mobileToolbarMetrics &&
      mobileToolbarMetrics.gapFromDate >= 24 &&
      mobileToolbarMetrics.searchRightGap <= 2 &&
      mobileToolbarMetrics.toggleRightGap <= 2,
    "Mobile match search icon should be right-aligned instead of sitting next to the Today chevron."
  );
  await page.locator("#team-search-toggle").click();
  await page.waitForTimeout(220);
  const activeMobileToolbarMetrics = await page.evaluate(() => {
    const toolbar = document.querySelector(".match-toolbar")?.getBoundingClientRect();
    const dayLabel = document.querySelector("#day-label")?.getBoundingClientRect();
    const searchField = document.querySelector(".team-search-field")?.getBoundingClientRect();
    const searchInputElement = document.querySelector("#team-search-input");
    const searchInput = searchInputElement?.getBoundingClientRect();

    if (!toolbar || !dayLabel || !searchField || !searchInput || !searchInputElement) {
      return null;
    }

    return {
      fieldGapFromDate: Math.round(searchField.left - dayLabel.right),
      fieldRightGap: Math.round(toolbar.right - searchField.right),
      fieldTopOffset: Math.round(searchField.top - toolbar.top),
      inputFontSize: Number.parseFloat(getComputedStyle(searchInputElement).fontSize),
      inputWidth: Math.round(searchInput.width),
      scrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      toolbarHeight: Math.round(toolbar.height)
    };
  });
  assert(
    activeMobileToolbarMetrics &&
      activeMobileToolbarMetrics.toolbarHeight <= 42 &&
      activeMobileToolbarMetrics.fieldTopOffset <= 1 &&
      activeMobileToolbarMetrics.fieldGapFromDate >= 8 &&
      activeMobileToolbarMetrics.fieldRightGap <= 2 &&
      activeMobileToolbarMetrics.inputFontSize >= 13 &&
      activeMobileToolbarMetrics.inputFontSize <= 14 &&
      activeMobileToolbarMetrics.inputWidth >= 120 &&
      activeMobileToolbarMetrics.scrollOverflow <= 1,
    "Active mobile match search should expand on the toolbar row without dropping below the date."
  );
  await page.locator("#team-search-input").press("Escape");
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
      metaCenter: metaBox ? metaBox.top + metaBox.height / 2 : null,
      rankCount: rankPills.length,
      rowHeight: row.getBoundingClientRect().height,
      teamsCenter: teamsBox.top + teamsBox.height / 2,
      teamsFont: Number.parseFloat(teamsStyle.fontSize),
      teamsHeight: teamsBox.height,
      timeCenter: timeBox.top + timeBox.height / 2,
      timeFont: Number.parseFloat(timeStyle.fontSize),
      timeHeight: timeBox.height
    };
  });
  assert(
    mobileRowMetrics.timeFont <= 12.5 &&
      mobileRowMetrics.teamsFont <= 14.5 &&
      mobileRowMetrics.rankCount === 0,
    "Mobile match rows should keep compact time/team text with ranking pills hidden."
  );
  assert(
    Math.abs(mobileRowMetrics.timeCenter - mobileRowMetrics.teamsCenter) <= 3 &&
      Math.abs(mobileRowMetrics.metaCenter - mobileRowMetrics.teamsCenter) <= 3,
    "Mobile match rows should vertically center time and status chips against wrapped matchup text."
  );

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator("#team-search-toggle").click();
  await page.locator("#team-search-input").fill("England");
  await page.waitForFunction(
    () => document.querySelector(".team-search-summary h2")?.textContent.trim() === "England"
  );
  await page.evaluate(() => {
    window.__matchInfoScrollBehavior = null;
    const originalScrollIntoView = Element.prototype.scrollIntoView;

    Element.prototype.scrollIntoView = function scrollIntoView(options) {
      if (this.id === "match-info") {
        window.__matchInfoScrollBehavior = options?.behavior || null;
      }
      return originalScrollIntoView.call(this, options);
    };
  });
  await page.locator("#match-list .match-row").first().click();
  await page.waitForFunction(() => window.__matchInfoScrollBehavior !== null);
  assert(
    (await page.evaluate(() => window.__matchInfoScrollBehavior)) === "smooth",
    "Choosing a country-search result in the stacked match layout should smoothly scroll to match details."
  );

  await page.setViewportSize({ width: 640, height: 844 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-24&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="switzerland-canada-2026-06-24"]');
  const tabletMatchHoverMetrics = await getMatchRowEdgeMetrics(page, "#match-list > .match-row");
  assertCleanHoveredMatchRowEdges(
    tabletMatchHoverMetrics,
    "Tablet-width match rows should keep score and pending chips inside the clipped match layout.",
    { expectNoTransform: true, minLayoutRightGap: 3 }
  );

  await page.setViewportSize({ width: 558, height: 768 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-24&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="bosnia-qatar-2026-06-24"]');
  const completedScoreRailMetrics = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("#match-list > .match-row"));
    return rows
      .map((row) => {
        const score = row.querySelector(".match-score");
        if (!score) {
          return null;
        }
        const rowRect = row.getBoundingClientRect();
        const scoreRect = score.getBoundingClientRect();
        const textPieces = Array.from(row.querySelectorAll(".match-teams .flag, .match-teams .team-name, .match-teams .match-versus"));
        const rightmostTextRight = textPieces.reduce((right, piece) => {
          const range = document.createRange();
          range.selectNodeContents(piece);
          const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
          range.detach();

          if (!rects.length) {
            return Math.max(right, piece.getBoundingClientRect().right);
          }

          return Math.max(right, ...rects.map((rect) => rect.right));
        }, rowRect.left);

        return {
          hasWrappedClass: row.classList.contains("has-wrapped-matchup"),
          id: row.getAttribute("data-match-id"),
          rightGap: Math.round(rowRect.right - scoreRect.right),
          scrollOverflow: row.scrollWidth - row.clientWidth,
          textScoreGap: Math.round(scoreRect.left - rightmostTextRight)
        };
      })
      .filter(Boolean);
  });
  assert(
    completedScoreRailMetrics.length >= 6 &&
      completedScoreRailMetrics.some((metric) => metric.id === "bosnia-qatar-2026-06-24") &&
      completedScoreRailMetrics.every(
        (metric) =>
          metric.scrollOverflow <= 1 &&
          (metric.hasWrappedClass
            ? metric.textScoreGap >= 6 && metric.textScoreGap <= 28 && metric.rightGap >= 12
            : metric.rightGap >= 0 && metric.rightGap <= 12)
      ),
    `Completed score pills should follow wrapped matchup text, while unwrapped rows keep the right rail. Measured ${JSON.stringify(completedScoreRailMetrics)}.`
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}?view=matches&date=2026-06-24&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await page.waitForSelector('[data-match-id="bosnia-qatar-2026-06-24"]');
  const currentDayWrappedRowMetrics = await page
    .locator('[data-match-id="bosnia-qatar-2026-06-24"]')
    .evaluate((row) => {
      const time = row.querySelector(".match-time");
      const teams = row.querySelector(".match-teams");
      const meta = row.querySelector(".match-row-meta");
      const timeBox = time.getBoundingClientRect();
      const teamsBox = teams.getBoundingClientRect();
      const metaBox = meta?.getBoundingClientRect();
      const hiddenNames = Array.from(row.querySelectorAll(".match-teams .team-name")).filter(
        (name) => name.scrollWidth > name.clientWidth + 1 && getComputedStyle(name).overflow !== "visible"
      );

      return {
        hiddenNameCount: hiddenNames.length,
        metaCenter: metaBox ? metaBox.top + metaBox.height / 2 : null,
        rowHeight: row.getBoundingClientRect().height,
        scrollOverflow: row.scrollWidth - row.clientWidth,
        teamsCenter: teamsBox.top + teamsBox.height / 2,
        timeCenter: timeBox.top + timeBox.height / 2
      };
    });
  assert(
    currentDayWrappedRowMetrics.hiddenNameCount === 0 &&
      currentDayWrappedRowMetrics.rowHeight <= 58 &&
      currentDayWrappedRowMetrics.scrollOverflow <= 1 &&
      Math.abs(currentDayWrappedRowMetrics.timeCenter - currentDayWrappedRowMetrics.teamsCenter) <= 3 &&
      Math.abs(currentDayWrappedRowMetrics.metaCenter - currentDayWrappedRowMetrics.teamsCenter) <= 3,
    `Wrapped current-day rows should center time and status pills against visible team text. Measured ${JSON.stringify(currentDayWrappedRowMetrics)}.`
  );
  const currentDayMobileRailMetrics = await page.locator(".match-row").evaluateAll((rows) =>
    rows
      .map((row) => {
        const chip = row.querySelector(
          ".match-row-meta .live-pill, .match-row-meta .up-next-pill, .match-row-meta .match-score, .match-row-meta .score-status"
        );

        if (!chip) {
          return null;
        }

        const rowRect = row.getBoundingClientRect();
        const chipRect = chip.getBoundingClientRect();
        const textPieces = Array.from(
          row.querySelectorAll(".match-teams .flag, .match-teams .team-name, .match-teams .match-versus")
        );
        const homePieces = Array.from(
          row.querySelectorAll(".match-team-home .flag, .match-team-home .team-name")
        );
        const versus = row.querySelector(".match-versus");
        const awayFlag = row.querySelector(".match-team-away .flag");
        const collisions = [];
        let maxTextRight = Number.NEGATIVE_INFINITY;
        let maxHomeTextRight = Number.NEGATIVE_INFINITY;
        const getVisualRects = (piece) => {
          if (!piece.classList.contains("team-name")) {
            return [piece.getBoundingClientRect()];
          }

          const range = document.createRange();
          range.selectNodeContents(piece);
          const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
          range.detach();
          return rects.length ? rects : [piece.getBoundingClientRect()];
        };

        textPieces.forEach((piece) => {
          getVisualRects(piece).forEach((pieceRect) => {
            const verticalOverlap =
              Math.min(chipRect.bottom, pieceRect.bottom) - Math.max(chipRect.top, pieceRect.top);
            const horizontalOverlap =
              Math.min(chipRect.right, pieceRect.right) - Math.max(chipRect.left, pieceRect.left);

            maxTextRight = Math.max(maxTextRight, pieceRect.right);

            if (verticalOverlap > 0.5 && horizontalOverlap > 0.5) {
              collisions.push(piece.textContent.replace(/\s+/g, " ").trim());
            }
          });
        });

        homePieces.forEach((piece) => {
          getVisualRects(piece).forEach((pieceRect) => {
            maxHomeTextRight = Math.max(maxHomeTextRight, pieceRect.right);
          });
        });

        const hasWrappedClass = row.classList.contains("has-wrapped-matchup");
        const homeRect = row.querySelector(".match-team-home")?.getBoundingClientRect();
        const versusRect = versus?.getBoundingClientRect();
        const awayFlagRect = awayFlag?.getBoundingClientRect();
        const compactShapeOk =
          !hasWrappedClass ||
          (homeRect &&
            versusRect &&
            awayFlagRect &&
            homeRect.top < versusRect.top &&
            Math.abs(versusRect.top + versusRect.height / 2 - (awayFlagRect.top + awayFlagRect.height / 2)) <= 2 &&
            versusRect.right <= awayFlagRect.left + 1);

        return {
          chipRight: chipRect.right,
          compactShapeOk,
          collisions,
          documentScrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          hasWrappedClass,
          homeVisualGap:
            versus && Number.isFinite(maxHomeTextRight)
              ? versus.getBoundingClientRect().left - maxHomeTextRight
              : null,
          id: row.getAttribute("data-match-id"),
          rowRightGap: rowRect.right - chipRect.right,
          rowScrollOverflow: row.scrollWidth - row.clientWidth,
          textScoreGap: Number.isFinite(maxTextRight) ? chipRect.left - maxTextRight : null,
          text: row.innerText.replace(/\s+/g, " ").trim()
        };
      })
      .filter(Boolean)
  );
  const currentDayMobileRailRights = currentDayMobileRailMetrics.map((metric) => metric.chipRight);
  assert(
    currentDayMobileRailMetrics.length >= 6 &&
      Math.max(...currentDayMobileRailRights) - Math.min(...currentDayMobileRailRights) <= 1 &&
      currentDayMobileRailMetrics.every(
        (metric) =>
          metric.collisions.length === 0 &&
          metric.documentScrollOverflow <= 1 &&
          metric.rowScrollOverflow <= 1 &&
          metric.rowRightGap >= 2 &&
          metric.rowRightGap <= 8 &&
          metric.compactShapeOk &&
          (metric.textScoreGap === null || metric.textScoreGap >= 2) &&
          (metric.homeVisualGap === null ||
            metric.hasWrappedClass ||
            (metric.homeVisualGap >= 0 && metric.homeVisualGap <= 12))
      ),
    `Mobile match rows should keep the vs label close to the left team and reserve a clean right rail for pills. Measured ${JSON.stringify(currentDayMobileRailMetrics)}.`
  );
  const mobileCompletedHoverRow = page.locator('[data-match-id="switzerland-canada-2026-06-24"]');
  const mobileCompletedHoverMetrics = await mobileCompletedHoverRow.evaluate((row) => {
    const rowRect = row.getBoundingClientRect();
    const layoutRect = row.closest(".match-layout")?.getBoundingClientRect();
    const scoreRect = row.querySelector(".match-score")?.getBoundingClientRect();

    return {
      layoutRightGap: layoutRect && scoreRect ? layoutRect.right - scoreRect.right : 0,
      rowRightGap: scoreRect ? rowRect.right - scoreRect.right : 0,
      rowScrollOverflow: row.scrollWidth - row.clientWidth,
      scoreRightOverflow:
        layoutRect && scoreRect ? Math.max(0, scoreRect.right - layoutRect.right) : Number.POSITIVE_INFINITY,
      transform: getComputedStyle(row).transform
    };
  });
  assert(
    mobileCompletedHoverMetrics.transform === "none" &&
      mobileCompletedHoverMetrics.rowRightGap >= 2 &&
      mobileCompletedHoverMetrics.layoutRightGap >= 2 &&
      mobileCompletedHoverMetrics.rowScrollOverflow <= 1 &&
      mobileCompletedHoverMetrics.scoreRightOverflow <= 1,
    `Mobile completed rows should not nudge score pills into the clipped edge. Measured ${JSON.stringify(mobileCompletedHoverMetrics)}.`
  );
  const southAfricaSouthKoreaRowMetrics = await page
    .locator('[data-match-id="south-africa-south-korea-2026-06-24"]')
    .evaluate((row) => {
      const rowRect = row.getBoundingClientRect();
      const awayTeam = row.querySelector(".match-team-away");
      const awayFlag = awayTeam?.querySelector(".flag");
      const awayName = awayTeam?.querySelector(".team-name");
      const getLineRects = (element) => {
        if (!element) {
          return [];
        }

        const range = document.createRange();
        range.selectNodeContents(element);
        const rects = Array.from(range.getClientRects()).map((bounds) => ({
          center: bounds.top + bounds.height / 2,
          right: bounds.right,
          top: bounds.top
        }));
        range.detach();
        return rects;
      };
      const awayNameLines = getLineRects(awayName);
      const pieces = Array.from(row.querySelectorAll(".match-teams .flag, .match-teams .team-name"));
      const pieceRightOverflow = pieces.map((piece) => piece.getBoundingClientRect().right - rowRect.right);

      return {
        awayFlag: awayFlag?.textContent.replace(/\s+/g, " ").trim() || "",
        awayName: awayName?.textContent.replace(/\s+/g, " ").trim() || "",
        awayNameLineCount: awayNameLines.length,
        pieceRightOverflow: Math.max(0, ...pieceRightOverflow),
        rankCount: row.querySelectorAll(".match-teams .rank-pill").length,
        scrollOverflow: row.scrollWidth - row.clientWidth,
        text: row.innerText.replace(/\s+/g, " ").trim()
      };
    });
  assert(
    southAfricaSouthKoreaRowMetrics.text.startsWith("6:00PM") &&
      southAfricaSouthKoreaRowMetrics.awayFlag === "🇰🇷" &&
      southAfricaSouthKoreaRowMetrics.awayName === "South Korea" &&
      southAfricaSouthKoreaRowMetrics.awayNameLineCount >= 1 &&
      southAfricaSouthKoreaRowMetrics.rankCount === 0 &&
      southAfricaSouthKoreaRowMetrics.pieceRightOverflow <= 1 &&
      southAfricaSouthKoreaRowMetrics.scrollOverflow <= 1,
    `South Africa vs South Korea should keep wrapped country names visible with no home-row rank pills. Measured ${JSON.stringify(southAfricaSouthKoreaRowMetrics)}.`
  );
  await page.locator('[data-match-id="bosnia-qatar-2026-06-24"]').click();
  await page.waitForSelector("#match-info .info-tooltip-button");
  const predictionOutcomeLabels = await page
    .locator("#match-info .prediction-row")
    .evaluateAll((rows) => rows.map((row) => row.textContent.replace(/\s+/g, " ").trim()));
  assert(
    predictionOutcomeLabels.some((label) => /^Tie\b/.test(label)) &&
      predictionOutcomeLabels.every((label) => !/^Draw\b/.test(label)),
    `Prediction rows should use Tie instead of Draw. Measured ${JSON.stringify(predictionOutcomeLabels)}.`
  );
  const predictionHelpLabel = await page
    .locator("#match-info .match-prediction-block .info-tooltip-button")
    .first()
    .getAttribute("aria-label");
  assert(
    predictionHelpLabel &&
      !predictionHelpLabel.includes("This feature is still work in progress and may not be accurate."),
    `Prediction info button should not include the lineup work-in-progress disclaimer. Measured ${JSON.stringify(predictionHelpLabel)}.`
  );
  const matchInfoStandingHeaders = await page
    .locator("#match-info .standings-table th")
    .evaluateAll((headers) => headers.map((header) => header.textContent.replace(/\s+/g, " ").trim()));
  assert(
    matchInfoStandingHeaders.includes("W-T-L") && !matchInfoStandingHeaders.includes("W-D-L"),
    `Standing headers should use W-T-L instead of W-D-L in English. Measured ${JSON.stringify(matchInfoStandingHeaders)}.`
  );
  const mobileInfoHeadingAlignment = await page.locator("#match-info .info-heading").evaluateAll((headings) => {
    const center = (rect) => (rect.top + rect.bottom) / 2;

    return headings
      .map((heading) => {
        const label = heading.querySelector("span:not(.visually-hidden)");
        const control = heading.querySelector(".info-tooltip-button");

        if (!label || !control) {
          return null;
        }

        const labelRect = label.getBoundingClientRect();
        const controlRect = control.getBoundingClientRect();

        return {
          delta: center(controlRect) - center(labelRect),
          text: label.textContent.replace(/\s+/g, " ").trim()
        };
      })
      .filter(Boolean);
  });
  assert(
    mobileInfoHeadingAlignment.some((item) => item.text === "Prediction" && Math.abs(item.delta) <= 0.75) &&
      mobileInfoHeadingAlignment
        .filter((item) => item.text === "Result" || item.text === "Prediction")
        .every((item) => Math.abs(item.delta) <= 0.75),
    `Mobile info-card heading controls should be vertically centered with their labels. Measured ${JSON.stringify(mobileInfoHeadingAlignment)}.`
  );
  const mobileTooltipBounds = await page.evaluate(() => {
    const selectors = [
      ".info-tooltip-button[data-tooltip]",
      ".rank-pill[data-tooltip]",
      ".standing-help[data-tooltip]",
      ".standing-team.has-name-tooltip[data-tooltip]",
      ".prediction-row.has-label-tooltip[data-tooltip]",
      ".past-record-row.has-label-tooltip[data-tooltip]",
      ".team.has-team-tooltip[data-tooltip]",
      ".summary-team.has-team-tooltip[data-tooltip]",
      ".live-pill[data-tooltip]",
      ".knockout-likelihood[data-tooltip]",
      ".player-card-value-help[data-tooltip]"
    ];
    const parsePx = (value) => Number.parseFloat(value) || 0;
    const positionOffset = (value, anchorSize) => {
      const text = String(value || "").trim();
      if (!text || text === "auto") {
        return 0;
      }

      const percentOffsets = [...text.matchAll(/(-?\d+(?:\.\d+)?)%/g)].reduce(
        (total, match) => total + (Number(match[1]) / 100) * anchorSize,
        0
      );
      const pixelOffsets = [...text.matchAll(/(-?\d+(?:\.\d+)?)px/g)].reduce(
        (total, match) => total + Number(match[1]),
        0
      );

      if (percentOffsets || pixelOffsets || /%|px/.test(text)) {
        return percentOffsets + pixelOffsets;
      }

      return parsePx(text);
    };
    const transformX = (value) => {
      if (!value || value === "none") {
        return 0;
      }
      const match = value.match(/^matrix\((.+)\)$/);
      if (!match) {
        return 0;
      }
      const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
      return Number.isFinite(parts[4]) ? parts[4] : 0;
    };
    const measureTooltipWidth = (element, style) => {
      const numericWidth =
        parsePx(style.width) +
        parsePx(style.paddingLeft) +
        parsePx(style.paddingRight) +
        parsePx(style.borderLeftWidth) +
        parsePx(style.borderRightWidth);
      if (numericWidth) {
        return numericWidth;
      }

      const tooltipText = element.getAttribute("data-tooltip") || "";
      if (!tooltipText) {
        return 0;
      }

      const probe = document.createElement("span");
      probe.textContent = tooltipText;
      Object.assign(probe.style, {
        position: "fixed",
        display: "block",
        visibility: "hidden",
        pointerEvents: "none",
        left: "0",
        top: "0",
        width: style.width,
        maxWidth: style.maxWidth,
        boxSizing: style.boxSizing,
        padding: `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`,
        borderStyle: style.borderStyle,
        borderWidth: `${style.borderTopWidth} ${style.borderRightWidth} ${style.borderBottomWidth} ${style.borderLeftWidth}`,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontStyle: style.fontStyle,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing,
        lineHeight: style.lineHeight,
        textTransform: style.textTransform,
        whiteSpace: style.whiteSpace
      });

      document.body.append(probe);
      const measuredWidth = probe.getBoundingClientRect().width;
      probe.remove();

      return Number.isFinite(measuredWidth) ? measuredWidth : 0;
    };
    const tooltipBoundsFor = (element, style, width) => {
      const rect = element.getBoundingClientRect();
      let translateX = transformX(style.transform);

      if (style.left !== "auto") {
        if (!translateX && String(style.left).includes("%")) {
          translateX = -width / 2;
        }

        const left = rect.left + positionOffset(style.left, rect.width) + translateX;
        return {
          left,
          right: left + width
        };
      }

      if (style.right !== "auto") {
        const right = rect.right - positionOffset(style.right, rect.width) + translateX;
        return {
          left: right - width,
          right
        };
      }

      return null;
    };
    const clipRectFor = (element) => {
      const viewportRight = document.documentElement.clientWidth || window.innerWidth;
      const knockoutCard = element.matches(".knockout-likelihood[data-tooltip]")
        ? element.closest(".progress-match")
        : null;
      if (knockoutCard) {
        const rect = knockoutCard.getBoundingClientRect();
        if (rect.width > 0) {
          return {
            left: Math.max(0, rect.left),
            right: Math.min(viewportRight, rect.right)
          };
        }
      }
      let node = element.parentElement;
      while (node && node !== document.documentElement) {
        const style = getComputedStyle(node);
        if (style.overflowX !== "visible") {
          const rect = node.getBoundingClientRect();
          if (rect.width > 0) {
            return {
              left: Math.max(0, rect.left),
              right: Math.min(viewportRight, rect.right)
            };
          }
        }
        node = node.parentElement;
      }
      return { left: 0, right: viewportRight };
    };
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        getComputedStyle(element).visibility !== "hidden" &&
        !element.closest("[hidden], .is-hidden")
      );
    };

    return selectors
      .flatMap((selector) =>
        Array.from(document.querySelectorAll(selector))
          .filter(isVisible)
          .map((element) => {
            const style = getComputedStyle(element, "::after");
            if (style.left === "auto") {
              return null;
            }

            const width = measureTooltipWidth(element, style);
            if (!width) {
              return null;
            }

            const tooltipBounds = tooltipBoundsFor(element, style, width);
            if (!tooltipBounds) {
              return null;
            }

            const clip = clipRectFor(element);
            const edgeGap = 6;
            return {
              selector,
              tooltip: element.getAttribute("data-tooltip") || "",
              shift: element.style.getPropertyValue("--tooltip-shift-x"),
              overflowLeft: Math.max(0, clip.left + edgeGap - tooltipBounds.left),
              overflowRight: Math.max(0, tooltipBounds.right - (clip.right - edgeGap))
            };
          })
      )
      .filter(Boolean);
  });
  const hasMarketConsensusTooltip = mobileTooltipBounds.some((item) =>
    item.tooltip.includes("Market consensus")
  );
  assert(
    !hasMarketConsensusTooltip ||
      mobileTooltipBounds.some(
        (item) =>
          item.selector === ".info-tooltip-button[data-tooltip]" &&
          item.tooltip.includes("Market consensus") &&
          (Boolean(item.shift) || (item.overflowLeft <= 3 && item.overflowRight <= 3))
      ),
    `Mobile prediction source tooltip should be shifted inside the match card bounds. Measured ${JSON.stringify(mobileTooltipBounds)}.`
  );
  assert(
    mobileTooltipBounds.every(
      (item) =>
        item.selector === ".rank-pill[data-tooltip]" ||
        (item.overflowLeft <= 3 && item.overflowRight <= 3)
    ),
    `Mobile centered tooltips should stay inside their clipping bounds. Measured ${JSON.stringify(mobileTooltipBounds)}.`
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
  await touchPage.goto(`${baseUrl}?view=matches&date=2026-06-18&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await touchPage.waitForSelector(".match-row");
  const touchCatchUpOpenState = await touchPage.locator("#catch-up-button").evaluate((button) => {
    button.click();
    const popover = document.querySelector("#catch-up-popover");
    const list = document.querySelector("#catch-up-list");

    return {
      expanded: button.getAttribute("aria-expanded"),
      hidden: popover?.classList.contains("is-hidden"),
      loadingItems: list?.querySelectorAll(".catch-up-loading-item").length || 0,
      realItems: list?.querySelectorAll(".catch-up-item:not(.catch-up-loading-item)").length || 0
    };
  });
  assert(
    touchCatchUpOpenState.expanded === "true" &&
      touchCatchUpOpenState.hidden === false &&
      touchCatchUpOpenState.loadingItems === 3 &&
      touchCatchUpOpenState.realItems === 0,
    `On touch devices, opening catch-up should show the skeleton immediately. Measured ${JSON.stringify(touchCatchUpOpenState)}.`
  );
  const readTouchFooterTooltipState = () => touchPage.evaluate(() => {
    const readTooltip = (selector) => {
      const element = document.querySelector(selector);
      if (!element) {
        return null;
      }

      const styles = getComputedStyle(element);
      return {
        opacity: Number(styles.opacity),
        pointerEvents: styles.pointerEvents,
        visibility: styles.visibility
      };
    };
    const sourceTrigger = document.querySelector(".source-tooltip-trigger");
    const releaseTrigger = document.querySelector(".release-tooltip-trigger");

    return {
      coarsePointer: matchMedia("(hover: none), (pointer: coarse)").matches,
      release: readTooltip(".release-tooltip"),
      releaseActive: releaseTrigger?.classList.contains("is-touch-tooltip-open") || false,
      source: readTooltip(".source-tooltip"),
      sourceActive: sourceTrigger?.classList.contains("is-touch-tooltip-open") || false
    };
  });
  await touchPage.locator(".source-tooltip-trigger").tap();
  const touchFooterSourceTapState = await readTouchFooterTooltipState();
  await touchPage.locator(".release-tooltip-trigger").tap();
  const touchFooterReleaseTapState = await readTouchFooterTooltipState();
  await touchPage.locator("#catch-up-button").dispatchEvent("pointerdown", {
    bubbles: true,
    button: 0,
    cancelable: true,
    pointerType: "touch"
  });
  await touchPage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const touchFooterOutsideTapState = await readTouchFooterTooltipState();
  const touchFooterTooltipState = {
    coarsePointer: touchFooterSourceTapState.coarsePointer,
    releaseActiveAfterReleaseTap: touchFooterReleaseTapState.releaseActive,
    releaseAfterOutsideTap: touchFooterOutsideTapState.release,
    releaseTapped: touchFooterReleaseTapState.release,
    sourceAfterOutsideTap: touchFooterOutsideTapState.source,
    sourceActiveAfterReleaseTap: touchFooterReleaseTapState.sourceActive,
    sourceActiveAfterSourceTap: touchFooterSourceTapState.sourceActive,
    sourceTapped: touchFooterSourceTapState.source
  };
  assert(
    touchFooterTooltipState.coarsePointer &&
      touchFooterTooltipState.sourceActiveAfterSourceTap &&
      touchFooterTooltipState.sourceTapped?.visibility === "visible" &&
      touchFooterTooltipState.sourceTapped.opacity > 0.8 &&
      !touchFooterTooltipState.sourceActiveAfterReleaseTap &&
      touchFooterTooltipState.releaseActiveAfterReleaseTap &&
      touchFooterTooltipState.releaseTapped?.visibility === "visible" &&
      touchFooterTooltipState.releaseTapped.opacity > 0.8 &&
      touchFooterTooltipState.sourceAfterOutsideTap?.visibility === "hidden" &&
      touchFooterTooltipState.releaseAfterOutsideTap?.visibility === "hidden",
    `On touch devices, footer source/release tooltips should open on tap, switch cleanly, and close on outside tap. Measured ${JSON.stringify(touchFooterTooltipState)}.`
  );
  await waitForCatchUpItems(touchPage);
  await touchPage.locator("#catch-up-button").click();
  const touchTodayRow = touchPage.locator('[data-match-id="switzerland-bosnia-2026-06-18"]');
  const touchYesterdayCard = touchPage.locator(
    '.yesterday-match-card[data-match-id="england-croatia-2026-06-17"]'
  );
  await touchTodayRow.evaluate((row) => {
    row.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "touch" }));
  });
  await touchYesterdayCard.evaluate((card) => {
    card.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "touch" }));
  });
  assert(
    !(await touchPage.locator("#match-info").isVisible()) &&
      (await touchPage.locator(".match-row.is-selected, .yesterday-match-card.is-selected").count()) === 0,
    "On touch devices, today and Recent matches rows should not open match details from hover preview events."
  );
  await touchTodayRow.click();
  await touchPage.waitForSelector("#match-info:not(.is-hidden)");
  const touchTodayDetailText = await touchPage.locator("#match-info").innerText();
  assert(
    touchTodayDetailText.includes("Switzerland") &&
      touchTodayDetailText.includes("Bosnia and Herzegovina") &&
      (await touchTodayRow.locator(".match-row-trigger").getAttribute("aria-pressed")) === "true",
    "On touch devices, tapping a today's match row should open its match detail card."
  );
  const touchSelectedMatchUrl = touchPage.url();
  await touchPage.goBack();
  await touchPage.waitForFunction(
    () =>
      !new URL(location.href).searchParams.has("match") &&
      document.querySelectorAll(".match-row.is-selected, .yesterday-match-card.is-selected").length === 0 &&
      document.querySelector("#match-info")?.hidden === true &&
      document.querySelector('link[rel="canonical"]')?.href === "https://world-cup-simplified.vercel.app/"
  );
  await touchPage.goForward();
  await touchPage.waitForFunction(
    (expectedUrl) =>
      location.href === expectedUrl &&
      document.querySelector('.match-row[data-match-id="switzerland-bosnia-2026-06-18"]')?.classList.contains("is-selected") &&
      document.querySelector("#match-info:not([hidden])") &&
      document.querySelector('link[rel="canonical"]')?.href.includes("?match=switzerland-bosnia-2026-06-18"),
    touchSelectedMatchUrl
  );
  await touchYesterdayCard.click();
  const touchYesterdayDetailText = await touchPage.locator("#match-info").innerText();
  assert(
    touchYesterdayDetailText.includes("England") &&
      touchYesterdayDetailText.includes("Croatia") &&
      (await touchYesterdayCard.locator(".yesterday-match-button").getAttribute("aria-pressed")) === "true",
    "On touch devices, tapping a Recent matches card should open its match detail card."
  );

  await touchPage.goto(`${baseUrl}?view=matches&date=2026-07-01&tz=America%2FLos_Angeles&lineupPrototype=1`, {
    waitUntil: "load"
  });
  await touchPage.waitForSelector(".match-row");
  await touchPage.locator('[data-match-id="match-80-round-of-32-2026-07-01"]').tap();
  await touchPage.locator("#match-info .lineup-preview-block").waitFor({ state: "attached" });
  const touchLineupEventTapStates = [];
  const checkTouchLineupEventTap = async ({ playerName, selector, tooltip }) => {
    const badge = touchPage
      .locator(`#match-info .lineup-tab-panel:not([hidden]) [data-lineup-player-name="${playerName}"] ${selector}`)
      .first();
    await badge.scrollIntoViewIfNeeded();
    await badge.tap();
    await touchPage.waitForFunction((expectedTooltip) => {
      const floatingTooltip = document.querySelector(".lineup-event-tooltip-floating");
      return (
        floatingTooltip?.textContent.trim() === expectedTooltip &&
        floatingTooltip.classList.contains("is-visible") &&
        document.querySelectorAll(".lineup-event-badge.is-event-tooltip-open").length === 1
      );
    }, tooltip);
    const openState = await touchPage.evaluate(() => ({
      openBadges: document.querySelectorAll(".lineup-event-badge.is-event-tooltip-open").length,
      tooltip: document.querySelector(".lineup-event-tooltip-floating.is-visible")?.textContent.trim() || ""
    }));
    await touchPage.locator("#match-info .lineup-heading > span").tap();
    await touchPage.waitForFunction(() =>
      !document.querySelector(".lineup-event-tooltip-floating.is-visible") &&
      !document.querySelector(".lineup-event-badge.is-event-tooltip-open")
    );
    touchLineupEventTapStates.push({
      ...openState,
      closedAfterOutsideTap: true,
      expectedTooltip: tooltip
    });
  };
  await checkTouchLineupEventTap({
    playerName: "Jude Bellingham",
    selector: ".lineup-event-card.is-yellow",
    tooltip: "19' Yellow card"
  });
  await checkTouchLineupEventTap({
    playerName: "Harry Kane",
    selector: ".lineup-event-score.is-goal",
    tooltip: "75' goal, 86' goal"
  });
  await touchPage
    .locator("#match-info .lineup-tab-panel:not([hidden]) .lineup-tab[data-lineup-tab='away']")
    .tap();
  await checkTouchLineupEventTap({
    playerName: "Chancel Mbemba",
    selector: ".lineup-event-score.is-assist",
    tooltip: "7' assist"
  });
  assert(
    touchLineupEventTapStates.length === 3 &&
      touchLineupEventTapStates.every(
        (state) =>
          state.openBadges === 1 &&
          state.tooltip === state.expectedTooltip &&
          state.closedAfterOutsideTap
      ),
    `On touch devices, yellow-card, goal, and assist badges should open on a normal tap and close on an outside tap. Measured ${JSON.stringify(touchLineupEventTapStates)}.`
  );

  await touchPage.goto(`${baseUrl}?view=matches&date=2026-07-07&tz=America%2FLos_Angeles&lineupPrototype=1`, {
    waitUntil: "load"
  });
  await touchPage.waitForSelector(".match-row");
  await touchPage.locator('[data-match-id="match-95-round-of-16-2026-07-07"]').tap();
  await touchPage.locator("#match-info .lineup-preview-block").waitFor({
    state: "attached"
  });
  const touchArgentinaEgyptLineupGeometry = await touchPage
    .locator("#match-info .lineup-preview-block")
    .evaluate((block) => {
      const readMarker = (name) => {
        const marker = block.querySelector(`[data-lineup-player-name="${name}"]`);
        const avatar = marker?.querySelector(".lineup-avatar-wrap");
        const label = marker?.querySelector(".lineup-player-name");
        const value = marker?.querySelector(".lineup-player-value");
        const scoreEvents = marker?.querySelector(".lineup-avatar-score-events");
        const eventRow = marker?.querySelector(".lineup-player-event-row");
        const avatarRightEvents = marker?.querySelector(".lineup-avatar-right-events");
        if (!marker || !avatar || !label || !value) {
          return null;
        }

        const avatarBounds = avatar.getBoundingClientRect();
        const labelBounds = label.getBoundingClientRect();
        const valueBounds = value.getBoundingClientRect();
        const scoreBounds = scoreEvents?.getBoundingClientRect();
        const eventRowBounds = eventRow?.getBoundingClientRect();
        const avatarRightEventBounds = avatarRightEvents?.getBoundingClientRect();
        const avatarCenterX = (avatarBounds.left + avatarBounds.right) / 2;
        const labelCenterX = (labelBounds.left + labelBounds.right) / 2;
        const valueCenterX = (valueBounds.left + valueBounds.right) / 2;

        return {
          avatarCenterX,
          avatarCenterY: (avatarBounds.top + avatarBounds.bottom) / 2,
          avatarRightEvents: marker.querySelectorAll(".lineup-avatar-right-events").length,
          avatarRightEventOverlapTop: avatarRightEventBounds ? avatarRightEventBounds.bottom - avatarBounds.top : null,
          eventRows: marker.querySelectorAll(".lineup-player-event-row").length,
          eventRowGap: eventRowBounds ? eventRowBounds.top - valueBounds.bottom : null,
          labelValueGap: valueBounds.top - labelBounds.bottom,
          labelCenterX,
          nameCenterDelta: labelCenterX - avatarCenterX,
          scoreOverlapRight: scoreBounds ? scoreBounds.right - avatarBounds.right : null,
          scoreOverlapsAvatar: scoreBounds ? scoreBounds.left < avatarBounds.right : null,
          subToggles: marker.querySelectorAll(".lineup-avatar-right-events [data-lineup-substitution-toggle]").length,
          valueCenterDelta: valueCenterX - avatarCenterX,
          valueCount: marker.querySelectorAll(".lineup-player-value").length,
          valueText: value.textContent.replace(/\s+/g, " ").trim()
        };
      };

      return {
        alvarez: readMarker("Julian Alvarez"),
        messi: readMarker("Lionel Messi")
      };
    });
  assert(
    touchArgentinaEgyptLineupGeometry.alvarez &&
      touchArgentinaEgyptLineupGeometry.messi &&
      Math.abs(touchArgentinaEgyptLineupGeometry.alvarez.nameCenterDelta) <= 1 &&
      Math.abs(touchArgentinaEgyptLineupGeometry.messi.nameCenterDelta) <= 1 &&
      Math.abs(touchArgentinaEgyptLineupGeometry.alvarez.valueCenterDelta) <= 1 &&
      Math.abs(touchArgentinaEgyptLineupGeometry.messi.valueCenterDelta) <= 1 &&
      Math.abs(touchArgentinaEgyptLineupGeometry.alvarez.avatarCenterY - touchArgentinaEgyptLineupGeometry.messi.avatarCenterY) <= 1 &&
      touchArgentinaEgyptLineupGeometry.alvarez.valueCount === 1 &&
      touchArgentinaEgyptLineupGeometry.messi.valueCount === 1 &&
      touchArgentinaEgyptLineupGeometry.alvarez.valueText.includes("€") &&
      touchArgentinaEgyptLineupGeometry.messi.valueText.includes("€") &&
      touchArgentinaEgyptLineupGeometry.alvarez.labelValueGap >= 0.75 &&
      touchArgentinaEgyptLineupGeometry.alvarez.labelValueGap <= 4 &&
      touchArgentinaEgyptLineupGeometry.messi.labelValueGap >= 0.75 &&
      touchArgentinaEgyptLineupGeometry.messi.labelValueGap <= 4 &&
      touchArgentinaEgyptLineupGeometry.alvarez.eventRows === 0 &&
      touchArgentinaEgyptLineupGeometry.alvarez.avatarRightEvents === 1 &&
      touchArgentinaEgyptLineupGeometry.alvarez.subToggles === 1 &&
      touchArgentinaEgyptLineupGeometry.alvarez.avatarRightEventOverlapTop >= 7 &&
      touchArgentinaEgyptLineupGeometry.alvarez.avatarRightEventOverlapTop <= 10 &&
      touchArgentinaEgyptLineupGeometry.messi.eventRows === 0 &&
      touchArgentinaEgyptLineupGeometry.messi.scoreOverlapsAvatar &&
      touchArgentinaEgyptLineupGeometry.messi.scoreOverlapRight <= 28,
    `Argentina-Egypt mobile striker markers should keep avatar/name anchored while event pills float independently. Measured ${JSON.stringify(touchArgentinaEgyptLineupGeometry)}.`
  );
  const touchArgentinaEgyptRowSpacing = await getLineupRowSpacingMetrics(
    touchPage.locator("#match-info [data-lineup-panel='home']:not([hidden])")
  );
  assert(
    touchArgentinaEgyptRowSpacing.topClearance >= 0 &&
      touchArgentinaEgyptRowSpacing.bottomClearance >= 0 &&
    touchArgentinaEgyptRowSpacing.pitchHeight >= 561 &&
      touchArgentinaEgyptRowSpacing.pitchHeight <= 563 &&
      touchArgentinaEgyptRowSpacing.collisionCount === 0 &&
      touchArgentinaEgyptRowSpacing.minRowGap >= 4,
    `Argentina-Egypt mobile line-up rows should keep event pills and value text separated from adjacent rows. Measured ${JSON.stringify(touchArgentinaEgyptRowSpacing)}.`
  );
  const touchMessiGoalBadge = touchPage
    .locator('#match-info [data-lineup-player-name="Lionel Messi"] .lineup-avatar-score-events .lineup-event-score.is-goal')
    .first();
  await touchMessiGoalBadge.scrollIntoViewIfNeeded();
  await touchPage.evaluate(() =>
    new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
  await touchMessiGoalBadge.tap();
  await touchPage.waitForFunction(() => {
    const tooltip = document.querySelector(".lineup-event-tooltip-floating");
    const styles = tooltip ? getComputedStyle(tooltip) : null;
    return (
      tooltip?.textContent.trim() === "83' goal" &&
      tooltip?.classList.contains("is-visible") &&
      styles?.visibility === "visible" &&
      Number(styles.opacity) > 0.05
    );
  });
  const touchLineupEventTooltipOpen = await touchPage.evaluate(() => {
    const tooltip = document.querySelector(".lineup-event-tooltip-floating");
    const tooltipBounds = tooltip?.getBoundingClientRect();
    const badge = document.querySelector(".lineup-event-badge.is-event-tooltip-open");
    return {
      badgeText: badge?.textContent.replace(/\s+/g, " ").trim() || "",
      playerCardsVisible: [...document.querySelectorAll(".player-card")].filter((card) => {
        const styles = getComputedStyle(card);
        const bounds = card.getBoundingClientRect();
        return styles.visibility !== "hidden" && Number(styles.opacity) > 0.05 && bounds.width > 0 && bounds.height > 0;
      }).length,
      tooltipBounds: tooltipBounds
        ? {
            bottom: Math.round(tooltipBounds.bottom),
            left: Math.round(tooltipBounds.left),
            right: Math.round(tooltipBounds.right),
            top: Math.round(tooltipBounds.top)
          }
        : null,
      tooltipText: tooltip?.textContent.trim() || "",
      tooltipVisible: Boolean(tooltip?.classList.contains("is-visible")),
      viewport: {
        height: window.innerHeight,
        width: window.innerWidth
      }
    };
  });
  assert(
    touchLineupEventTooltipOpen.badgeText === "G" &&
      touchLineupEventTooltipOpen.tooltipVisible &&
      touchLineupEventTooltipOpen.tooltipText === "83' goal" &&
      touchLineupEventTooltipOpen.tooltipBounds &&
      touchLineupEventTooltipOpen.tooltipBounds.left >= 0 &&
      touchLineupEventTooltipOpen.tooltipBounds.right <= touchLineupEventTooltipOpen.viewport.width &&
      touchLineupEventTooltipOpen.tooltipBounds.top >= 0 &&
      touchLineupEventTooltipOpen.tooltipBounds.bottom <= touchLineupEventTooltipOpen.viewport.height &&
      touchLineupEventTooltipOpen.playerCardsVisible === 0,
    `On touch devices, tapping a line-up G/A badge should open the compact event tooltip without a player card. Measured ${JSON.stringify(touchLineupEventTooltipOpen)}.`
  );
  await touchPage.evaluate(() => {
    window.scrollBy(0, window.scrollY > 120 ? -120 : 120);
  });
  await touchPage.waitForFunction(() => {
    const tooltip = document.querySelector(".lineup-event-tooltip-floating");
    return !tooltip?.classList.contains("is-visible") && !document.querySelector(".lineup-event-badge.is-event-tooltip-open");
  });
  const touchLineupEventTooltipClosed = await touchPage.evaluate(() => ({
    openBadges: document.querySelectorAll(".lineup-event-badge.is-event-tooltip-open").length,
    tooltipVisible: Boolean(document.querySelector(".lineup-event-tooltip-floating.is-visible"))
  }));
  assert(
    touchLineupEventTooltipClosed.openBadges === 0 && !touchLineupEventTooltipClosed.tooltipVisible,
    `On touch devices, scrolling away from an open line-up event tooltip should close it. Measured ${JSON.stringify(touchLineupEventTooltipClosed)}.`
  );
  await touchPage.goto(`${baseUrl}?view=matches&date=2026-07-10&tz=America%2FLos_Angeles&lineupPrototype=1`, {
    waitUntil: "load"
  });
  await touchPage.waitForSelector(".match-row");
  await touchPage.locator('[data-match-id="match-98-quarter-final-2026-07-10"]').click();
  await touchPage.locator('#match-info .lineup-tab-panel:not([hidden]) .lineup-card-tabs [data-lineup-tab="away"]').tap();
  const touchBelgiumSubToggle = touchPage.locator(
    '#match-info [data-lineup-panel="away"]:not([hidden]) [data-lineup-player-name="Maxim De Cuyper"] [data-lineup-substitution-toggle]'
  );
  await touchBelgiumSubToggle.scrollIntoViewIfNeeded();
  await touchBelgiumSubToggle.tap();
  await touchPage.waitForFunction(() =>
    document.querySelector('#match-info [data-lineup-panel="away"]:not([hidden]) [data-lineup-player-name="Joaquin Seys"]')
  );
  await touchPage
    .locator(
      '#match-info [data-lineup-panel="away"]:not([hidden]) [data-lineup-player-name="Joaquin Seys"] [data-lineup-substitution-toggle]'
    )
    .scrollIntoViewIfNeeded();
  const touchLineupSubstitutionState = await touchPage
    .locator('#match-info [data-lineup-panel="away"]:not([hidden]) [data-lineup-player-name="Joaquin Seys"]')
    .evaluate((marker) => {
      const button = marker.querySelector("[data-lineup-substitution-toggle]");
      const avatar = marker.querySelector(".lineup-avatar-wrap");
      const lane = marker.querySelector(".lineup-avatar-right-events");
      const buttonBounds = button?.getBoundingClientRect();
      const avatarBounds = avatar?.getBoundingClientRect();
      const y = buttonBounds ? buttonBounds.top + buttonBounds.height / 2 : 0;
      const hitXs = buttonBounds
        ? [
            buttonBounds.left + 2,
            buttonBounds.left + 6,
            buttonBounds.left + 10,
            buttonBounds.left + buttonBounds.width / 2,
            buttonBounds.right - 2
          ]
        : [];
      const visibleCards = [...document.querySelectorAll(".player-card")].filter((card) => {
        const styles = getComputedStyle(card);
        const bounds = card.getBoundingClientRect();
        return styles.visibility !== "hidden" && Number(styles.opacity) > 0.05 && bounds.width > 0 && bounds.height > 0;
      });

      return {
        ariaPressed: button?.getAttribute("aria-pressed") || "",
        buttonBackground: button ? getComputedStyle(button).backgroundColor : "",
        buttonText: button?.textContent.replace(/\s+/g, " ").trim() || "",
        laneLeftDelta: lane && avatarBounds
          ? Math.round((lane.getBoundingClientRect().left - avatarBounds.left) * 10) / 10
          : null,
        openPlayerHovers: document.querySelectorAll(".player-hover.is-card-open, .player-hover.is-card-portaled").length,
        overlapWidth: buttonBounds && avatarBounds
          ? Math.round(Math.max(0, Math.min(buttonBounds.right, avatarBounds.right) - Math.max(buttonBounds.left, avatarBounds.left)) * 10) / 10
          : null,
        topHitTags: hitXs.map((x) => {
          const element = document.elementFromPoint(x, y);
          return {
            className: element?.className || "",
            tagName: element?.tagName || "",
            text: element?.textContent.replace(/\s+/g, " ").trim() || ""
          };
        }),
        visibleCards: visibleCards.map((card) => card.querySelector(".player-card-name")?.textContent.trim() || ""),
        markerName: marker.dataset.lineupPlayerName || "",
        visibleName: marker.querySelector(".lineup-player-name")?.textContent.replace(/\s+/g, " ").trim() || ""
      };
    });
  assert(
    touchLineupSubstitutionState.markerName === "Joaquin Seys" &&
      touchLineupSubstitutionState.buttonText === "↑60'" &&
      touchLineupSubstitutionState.ariaPressed === "true" &&
      touchLineupSubstitutionState.buttonBackground === "rgb(243, 243, 243)" &&
      touchLineupSubstitutionState.visibleCards.length === 0 &&
      touchLineupSubstitutionState.openPlayerHovers === 0 &&
      touchLineupSubstitutionState.overlapWidth <= 16 &&
      touchLineupSubstitutionState.laneLeftDelta >= 18 &&
      touchLineupSubstitutionState.topHitTags.every(
        (hit) => hit.tagName === "BUTTON" && hit.className.includes("lineup-substitution-toggle")
      ),
    `On touch devices, tapping a line-up sub pill should swap the player without auto-opening the player card, and the return pill should stay above the portrait edge. Measured ${JSON.stringify(touchLineupSubstitutionState)}.`
  );
  await touchPage.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
  });
  const darkPressedSubBackground = await touchPage
    .locator(
      '#match-info [data-lineup-panel="away"]:not([hidden]) [data-lineup-player-name="Joaquin Seys"] [data-lineup-substitution-toggle]'
    )
    .evaluate((button) => getComputedStyle(button).backgroundColor);
  assert(
    darkPressedSubBackground === "rgb(39, 53, 69)",
    `The dark-mode pressed substitution pill should stay opaque so the player portrait cannot bleed through it. Measured ${darkPressedSubBackground}.`
  );
  await touchPage.waitForTimeout(350);
  const touchFormationPill = touchPage
    .locator("#match-info .lineup-tab-panel:not([hidden]) .lineup-formation-pill")
    .first();
  await touchFormationPill.tap();
  await touchPage.waitForFunction(() => {
    const card = document.querySelector(".player-card-floating.is-visible");
    return (
      card &&
      card.querySelector(".player-card-position")?.textContent.trim() === "Formation" &&
      /\d/.test(card.querySelector(".player-card-name")?.textContent || "")
    );
  });
  await touchPage.locator("#standings-tab").tap();
  await touchPage.waitForFunction(() => {
    const visibleCards = [...document.querySelectorAll(".player-card")].filter((card) => {
      const styles = getComputedStyle(card);
      const bounds = card.getBoundingClientRect();
      return styles.visibility !== "hidden" && Number(styles.opacity) > 0.05 && bounds.width > 0 && bounds.height > 0;
    });
    return (
      document.querySelector("#standings-tab")?.getAttribute("aria-selected") === "true" &&
      visibleCards.length === 0 &&
      !document.querySelector(".player-hover.is-card-open, .player-hover.is-card-portaled") &&
      !document.querySelector(".is-touch-tooltip-open") &&
      !document.querySelector(".lineup-event-tooltip-floating.is-visible")
    );
  });
  const touchFormationTabSwitchState = await touchPage.evaluate(() => {
    const visibleCards = [...document.querySelectorAll(".player-card")].filter((card) => {
      const styles = getComputedStyle(card);
      const bounds = card.getBoundingClientRect();
      return styles.visibility !== "hidden" && Number(styles.opacity) > 0.05 && bounds.width > 0 && bounds.height > 0;
    });
    return {
      activePlayerHovers: document.querySelectorAll(".player-hover.is-card-open, .player-hover.is-card-portaled").length,
      activeTouchTooltips: document.querySelectorAll(".is-touch-tooltip-open").length,
      selectedStandings: document.querySelector("#standings-tab")?.getAttribute("aria-selected") || "",
      visibleCards: visibleCards.map((card) => card.querySelector(".player-card-name")?.textContent.trim() || "")
    };
  });
  assert(
    touchFormationTabSwitchState.selectedStandings === "true" &&
      touchFormationTabSwitchState.visibleCards.length === 0 &&
      touchFormationTabSwitchState.activePlayerHovers === 0 &&
      touchFormationTabSwitchState.activeTouchTooltips === 0,
    `On touch devices, switching main tabs should clear an open formation/player card and any touch tooltip state. Measured ${JSON.stringify(touchFormationTabSwitchState)}.`
  );

  const touchTournamentOddsCheck = await openPageAtTime(
    "2026-07-14T23:00:00.000Z",
    "/?view=standings&standingsMode=tournament&tz=America%2FLos_Angeles",
    {
      contextOptions: {
        hasTouch: true,
        isMobile: true,
        viewport: { width: 390, height: 844 }
      },
      fixtureTransform(data) {
        const final = data.fixtures.find((fixture) => fixture.matchNumber === 104);
        final.status = "SCHEDULED";
        delete final.score;
        delete final.scoreDetails;
        delete final.winnerTeamId;
        delete final.winner;
        delete final.goalsHome;
        delete final.goalsAway;
        delete final.projection;
      }
    }
  );
  const touchTournamentOddsPage = touchTournamentOddsCheck.page;
  await touchTournamentOddsPage.waitForFunction(
    () =>
      document.querySelectorAll(".progress-connectors path").length >= 29 &&
      document.querySelector(".progress-match[data-open-match-id] .knockout-likelihood[data-tooltip]")
  );
  const touchTournamentOddsPill = touchTournamentOddsPage
    .locator(".progress-match[data-open-match-id] .knockout-likelihood[data-tooltip]")
    .first();
  await touchTournamentOddsPill.evaluate((pill) => {
    pill.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerType: "touch"
      })
    );
  });
  await touchTournamentOddsPage.waitForFunction(() => {
    const pill = document.querySelector(".knockout-likelihood.is-touch-tooltip-open");
    return pill && Number(getComputedStyle(pill, "::after").opacity) > 0.8;
  });
  const touchTournamentTooltipOpen = await touchTournamentOddsPage.evaluate(() => {
    const params = new URL(window.location.href).searchParams;
    const pill = document.querySelector(".knockout-likelihood.is-touch-tooltip-open");

    return {
      activeText: pill?.textContent.replace(/\s+/g, " ").trim() || "",
      activeTooltip: pill?.getAttribute("data-tooltip") || "",
      match: params.get("match") || "",
      selectedMatches: document.querySelector("#matches-tab")?.getAttribute("aria-selected") || "",
      selectedStandings: document.querySelector("#standings-tab")?.getAttribute("aria-selected") || "",
      view: params.get("view") || ""
    };
  });
  assert(
    touchTournamentTooltipOpen.activeText &&
      touchTournamentTooltipOpen.activeTooltip &&
      touchTournamentTooltipOpen.view === "standings" &&
      touchTournamentTooltipOpen.match === "" &&
      touchTournamentTooltipOpen.selectedStandings === "true" &&
      touchTournamentTooltipOpen.selectedMatches === "false",
    `On touch devices, tapping a tournament odds tooltip should not open the parent match card. Measured ${JSON.stringify(touchTournamentTooltipOpen)}.`
  );
  await touchTournamentOddsPage.locator("#standings-heading").tap();
  await touchTournamentOddsPage.waitForFunction(() => !document.querySelector(".is-touch-tooltip-open"));
  const touchTournamentTooltipClosed = await touchTournamentOddsPage.evaluate(() => {
    const params = new URL(window.location.href).searchParams;

    return {
      activeTooltipCount: document.querySelectorAll(".is-touch-tooltip-open").length,
      focusedTooltip: Boolean(document.activeElement?.matches?.(".knockout-likelihood[data-tooltip]")),
      match: params.get("match") || "",
      view: params.get("view") || ""
    };
  });
  assert(
    touchTournamentTooltipClosed.activeTooltipCount === 0 &&
      !touchTournamentTooltipClosed.focusedTooltip &&
      touchTournamentTooltipClosed.view === "standings" &&
      touchTournamentTooltipClosed.match === "",
    `On touch devices, tapping outside an open tournament odds tooltip should close it without navigating. Measured ${JSON.stringify(touchTournamentTooltipClosed)}.`
  );
  await touchTournamentOddsPill.evaluate((pill) => {
    pill.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerType: "touch"
      })
    );
  });
  await touchTournamentOddsPage.waitForFunction(() =>
    document.querySelector(".knockout-likelihood.is-touch-tooltip-open")
  );
  await touchTournamentOddsPage.locator("#matches-tab").tap();
  await touchTournamentOddsPage.waitForFunction(() => {
    const params = new URL(window.location.href).searchParams;
    return (
      document.querySelector("#matches-tab")?.getAttribute("aria-selected") === "true" &&
      !params.get("view") &&
      !document.querySelector(".is-touch-tooltip-open")
    );
  });
  const touchTournamentTooltipTabSwitchState = await touchTournamentOddsPage.evaluate(() => {
    const params = new URL(window.location.href).searchParams;
    return {
      activeTooltipCount: document.querySelectorAll(".is-touch-tooltip-open").length,
      selectedMatches: document.querySelector("#matches-tab")?.getAttribute("aria-selected") || "",
      selectedStandings: document.querySelector("#standings-tab")?.getAttribute("aria-selected") || "",
      view: params.get("view") || ""
    };
  });
  assert(
    touchTournamentTooltipTabSwitchState.activeTooltipCount === 0 &&
      touchTournamentTooltipTabSwitchState.selectedMatches === "true" &&
      touchTournamentTooltipTabSwitchState.selectedStandings === "false" &&
      touchTournamentTooltipTabSwitchState.view === "",
    `On touch devices, switching main tabs should clear an open tournament odds tooltip. Measured ${JSON.stringify(touchTournamentTooltipTabSwitchState)}.`
  );
  await touchTournamentOddsCheck.context.close();

  await touchPage.goto(`${baseUrl}?view=matches&date=2026-06-21&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await touchPage.waitForSelector(".match-row");
  await touchPage.locator('[data-match-id="belgium-ir-iran-2026-06-21"]').click();
  const touchPlayerLink = touchPage.locator(".key-info-team .player-link", { hasText: "Youri Tielemans" }).first();
  await touchPlayerLink.click();
  const touchPlayerCard = touchPage.locator(".player-card:visible").first();
  await touchPlayerCard.waitFor({ state: "visible" });
  assert(
    (await touchPlayerLink.getAttribute("aria-expanded")) === "true" &&
      (await touchPlayerCard.locator(".player-card-name").innerText()).trim() === "Youri Tielemans",
    "On touch devices, the first player-name tap should open the player card without navigating away."
  );
  await touchPage.locator(".player-card-floating .player-card-value-help").first().tap();
  await touchPage.waitForFunction(() => {
    const card = document.querySelector(".player-card-floating.is-visible");
    const help = card?.querySelector(".player-card-value-help.is-touch-tooltip-open");
    const helpStyles = help ? getComputedStyle(help, "::after") : null;
    return (
      card &&
      help &&
      helpStyles?.visibility !== "hidden" &&
      Number(helpStyles?.opacity || 0) > 0.8
    );
  });
  const touchPlayerValueHelpState = await touchPage.evaluate(() => {
    const card = document.querySelector(".player-card-floating");
    const cardStyles = card ? getComputedStyle(card) : null;
    const help = card?.querySelector(".player-card-value-help.is-touch-tooltip-open");
    const helpStyles = help ? getComputedStyle(help, "::after") : null;
    return {
      cardOpen: Boolean(card?.classList.contains("is-visible") && cardStyles?.visibility !== "hidden"),
      cardOpacity: cardStyles?.opacity || "",
      cardVisible: Boolean(
        card?.classList.contains("is-visible") &&
          cardStyles?.visibility !== "hidden" &&
          Number(cardStyles?.opacity || 0) > 0.8
      ),
      floatingPointerEvents: cardStyles?.pointerEvents || "",
      openPlayerCards: document.querySelectorAll(".player-hover.is-card-open, .player-hover.is-card-portaled").length,
      tooltipLabel: help?.textContent.trim() || "",
      tooltipText: help?.getAttribute("data-tooltip") || "",
      tooltipVisible: Boolean(
        help &&
          helpStyles?.visibility !== "hidden" &&
          Number(helpStyles?.opacity || 0) > 0.8
      )
    };
  });
  assert(
    touchPlayerValueHelpState.cardOpen &&
      touchPlayerValueHelpState.floatingPointerEvents !== "none" &&
      touchPlayerValueHelpState.openPlayerCards === 1 &&
      touchPlayerValueHelpState.tooltipVisible &&
      /^(Value|Est\. value|身价|估值)$/.test(touchPlayerValueHelpState.tooltipLabel) &&
      Boolean(touchPlayerValueHelpState.tooltipText),
    `On touch devices, tapping Value inside an open player card should keep the card open and show the value tooltip. Measured ${JSON.stringify(touchPlayerValueHelpState)}.`
  );
  const secondTouchPlayerLink = touchPage.locator(".key-info-team .player-link", { hasText: "Kevin De Bruyne" }).first();
  await secondTouchPlayerLink.evaluate((link) => {
    link.closest(".player-hover")?.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "touch" }));
  });
  const visibleTouchHoverPlayerCards = touchPage.locator(".player-card:visible");
  assert(
    (await visibleTouchHoverPlayerCards.count()) === 1 &&
      (await visibleTouchHoverPlayerCards.first().locator(".player-card-name").innerText()).trim() === "Youri Tielemans",
    "On touch devices, touch hover events should not preview a second player card before tap."
  );
  await secondTouchPlayerLink.click();
  const visibleTouchPlayerCards = touchPage.locator(".player-card:visible");
  await visibleTouchPlayerCards.first().waitFor({ state: "visible" });
  assert(
    (await visibleTouchPlayerCards.count()) === 1 &&
      (await secondTouchPlayerLink.getAttribute("aria-expanded")) === "true" &&
      (await touchPlayerLink.getAttribute("aria-expanded")) === "false" &&
      (await visibleTouchPlayerCards.first().locator(".player-card-name").innerText()).trim() === "Kevin De Bruyne",
    "On touch devices, tapping a second player name should replace the first player card instead of showing two."
  );
  await touchPage.locator("#match-info .match-summary").click();
  await touchPage.waitForSelector(".player-card:visible", { state: "hidden" });
  assert(
    (await touchPage.locator(".player-card:visible").count()) === 0 &&
      (await secondTouchPlayerLink.getAttribute("aria-expanded")) === "false",
    "On touch devices, tapping outside an open player card should close it."
  );
  await touchPage.goto(`${baseUrl}?view=matches&date=2026-06-23&tz=America%2FLos_Angeles`, {
    waitUntil: "load"
  });
  await touchPage.waitForSelector(".match-row");
  await touchPage.locator('[data-match-id="england-ghana-2026-06-23"]').click();
  const bellinghamTouchLink = touchPage
    .locator(".key-info-team .player-link", { hasText: "Jude Bellingham" })
    .first();
  const riceTouchLink = touchPage.locator(".key-info-team .player-link", { hasText: "Declan Rice" }).first();
  await bellinghamTouchLink.click();
  await touchPage.locator(".player-card-floating:visible").waitFor({ state: "visible" });
  await riceTouchLink.focus();
  assert(
    (await touchPage.locator(".player-card:visible").count()) === 1 &&
      (await touchPage.locator(".player-hover > .player-card:visible").count()) === 0,
    "On touch devices, player-link focus should not reveal an inline source card beside the floating card."
  );
  await riceTouchLink.click();
  await touchPage.locator(".player-card-floating:visible").waitFor({ state: "visible" });
  const englandGhanaTouchCards = touchPage.locator(".player-card:visible");
  const englandGhanaVisibleNames = await englandGhanaTouchCards
    .locator(".player-card-name")
    .evaluateAll((names) => names.map((name) => name.textContent.trim()));
  assert(
    (await englandGhanaTouchCards.count()) === 1 &&
      (await touchPage.locator(".player-hover > .player-card:visible").count()) === 0 &&
      (await touchPage.locator(".player-card-floating:visible").count()) === 1 &&
      englandGhanaVisibleNames[0] === "Declan Rice" &&
      (await bellinghamTouchLink.getAttribute("aria-expanded")) === "false" &&
      (await riceTouchLink.getAttribute("aria-expanded")) === "true",
    "On touch devices, England-Ghana player taps should render only one floating player card with no inline source card."
  );

  const compactBallBoyContext = await browser.newContext({
    viewport: { width: 595, height: 382 }
  });
  const compactBallBoyPage = await compactBallBoyContext.newPage();
  await compactBallBoyPage.goto(`${baseUrl}?ballBoySmoke=1`, { waitUntil: "load" });
  await compactBallBoyPage.locator("#source-note").scrollIntoViewIfNeeded();
  await compactBallBoyPage.waitForFunction(() =>
    document.querySelector("#source-note")?.classList.contains("has-scout-collision")
  );
  await compactBallBoyPage.locator(".release-tooltip-trigger").focus();
  await compactBallBoyPage.waitForTimeout(100);
  const compactBallBoyCollision = await compactBallBoyPage.evaluate(() => {
    const tooltip = document.querySelector(".release-tooltip")?.getBoundingClientRect();
    const scout = document.querySelector("#scout-widget")?.getBoundingClientRect();
    if (!tooltip || !scout) {
      return null;
    }

    return {
      gap: scout.left - tooltip.right,
      scout: { left: scout.left, top: scout.top },
      tooltip: {
        bottom: tooltip.bottom,
        left: tooltip.left,
        right: tooltip.right,
        top: tooltip.top
      },
      overlaps:
        tooltip.right > scout.left &&
        tooltip.left < scout.right &&
        tooltip.bottom > scout.top &&
        tooltip.top < scout.bottom
    };
  });
  assert(
    compactBallBoyCollision &&
      !compactBallBoyCollision.overlaps &&
      compactBallBoyCollision.gap >= 7.5,
    `At the compact 595x382 desktop viewport, the release-notes card should clear Ball Boy. Measured ${JSON.stringify(compactBallBoyCollision)}.`
  );
  await compactBallBoyContext.close();

  await touchPage.setViewportSize({ width: 390, height: 844 });
  await touchPage.goto(`${baseUrl}?ballBoySmoke=1`, { waitUntil: "load" });
  await touchPage.locator("#source-note").scrollIntoViewIfNeeded();
  await touchPage.waitForFunction(() =>
    document.querySelector("#source-note")?.classList.contains("has-scout-collision")
  );
  const ballBoyFooterBeforeOpen = await touchPage.locator("#source-note").evaluate((note) => ({
    height: note.getBoundingClientRect().height,
    paddingLeft: getComputedStyle(note).paddingLeft
  }));
  await touchPage.locator("#scout-launcher").click();
  await touchPage.waitForTimeout(500);
  const ballBoyFooterAfterOpen = await touchPage.locator("#source-note").evaluate((note) => ({
    hasCollision: note.classList.contains("has-scout-collision"),
    height: note.getBoundingClientRect().height,
    paddingLeft: getComputedStyle(note).paddingLeft
  }));
  assert(
    ballBoyFooterAfterOpen.hasCollision &&
      Math.abs(ballBoyFooterAfterOpen.height - ballBoyFooterBeforeOpen.height) < 1 &&
      ballBoyFooterAfterOpen.paddingLeft === ballBoyFooterBeforeOpen.paddingLeft,
    `Opening Ball Boy should keep the mobile disclaimer locked in its collision-safe layout. Measured ${JSON.stringify({ before: ballBoyFooterBeforeOpen, after: ballBoyFooterAfterOpen })}.`
  );
  const ballBoySend = touchPage.locator(".scout-send");
  const ballBoyInput = touchPage.locator("#scout-input");
  assert(await ballBoySend.isDisabled(), "Ball Boy send should begin disabled when its input is empty.");
  const initialBallBoyPrompts = await touchPage
    .locator("#scout-suggestions [data-scout-prompt]")
    .evaluateAll((buttons) => buttons.map((button) => button.dataset.scoutPrompt));
  const initialReportIssueControl = await touchPage
    .locator('#scout-suggestions [data-scout-prompt="Report issue"]')
    .evaluate((control) => ({ href: control.getAttribute("href"), tagName: control.tagName }));
  assert(
    JSON.stringify(initialBallBoyPrompts) === JSON.stringify([
      "Explain offside",
      "Who won?",
      "How does Argentina play?",
      "Report issue"
    ]) &&
      initialReportIssueControl.tagName === "BUTTON" &&
      initialReportIssueControl.href === null,
    `Ball Boy should open with the four curated actions in order. Measured ${JSON.stringify(initialBallBoyPrompts)}.`
  );
  const initialBallBoySheetState = await touchPage.evaluate(() => {
    const widget = document.querySelector("#scout-widget")?.getBoundingClientRect();
    return {
      activeInput: document.activeElement?.id === "scout-input",
      hasConversation: document.querySelector("#scout-widget")?.classList.contains("has-conversation") || false,
      height: widget?.height || 0
    };
  });
  assert(
    !initialBallBoySheetState.activeInput &&
      !initialBallBoySheetState.hasConversation &&
      initialBallBoySheetState.height <= 456,
    `Ball Boy should open as a medium mobile sheet without summoning the keyboard. Measured ${JSON.stringify(initialBallBoySheetState)}.`
  );
  await touchPage.waitForFunction(() =>
    !document.querySelector("#scout-widget")?.classList.contains("is-eye-wide")
  );
  await touchPage.evaluate(() => {
    const widget = document.querySelector("#scout-widget");
    window.__ballBoyBlinkClasses = [];
    window.__ballBoyBlinkObserver = new MutationObserver(() => {
      if (
        widget?.classList.contains("is-blinking") ||
        widget?.classList.contains("is-eye-double-blink") ||
        widget?.classList.contains("is-eye-record") ||
        widget?.classList.contains("is-eye-touch-release")
      ) {
        window.__ballBoyBlinkClasses.push(widget.className);
      }
    });
    window.__ballBoyBlinkObserver.observe(widget, {
      attributes: true,
      attributeFilter: ["class"]
    });
  });
  await touchPage.locator(".scout-status").tap();
  await touchPage.waitForTimeout(80);
  const ballBoyTouchGazeActive = await touchPage.evaluate(() => {
    const eyes = document.querySelector(".scout-eyes");
    return {
      x: eyes?.style.getPropertyValue("--scout-pupil-x") || "",
      y: eyes?.style.getPropertyValue("--scout-pupil-y") || ""
    };
  });
  await touchPage.waitForTimeout(560);
  const ballBoyTouchReleaseState = await touchPage.evaluate(() => {
    const eyes = document.querySelector(".scout-eyes");
    window.__ballBoyBlinkObserver?.disconnect();
    const result = {
      blinkClasses: window.__ballBoyBlinkClasses || [],
      x: eyes?.style.getPropertyValue("--scout-pupil-x") || "",
      y: eyes?.style.getPropertyValue("--scout-pupil-y") || ""
    };
    delete window.__ballBoyBlinkClasses;
    delete window.__ballBoyBlinkObserver;
    return result;
  });
  assert(
    (ballBoyTouchGazeActive.x !== "0.00px" || ballBoyTouchGazeActive.y !== "0.00px") &&
      ballBoyTouchReleaseState.x === "0.00px" &&
      ballBoyTouchReleaseState.y === "0.00px" &&
      ballBoyTouchReleaseState.blinkClasses.length === 0,
    `Ball Boy should follow a touch, recenter after release, and not blink. Measured ${JSON.stringify({ active: ballBoyTouchGazeActive, released: ballBoyTouchReleaseState })}.`
  );
  await touchPage.evaluate(() => {
    const widget = document.querySelector("#scout-widget");
    window.__ballBoyDoubleBlinkCount = 0;
    window.__ballBoyCooldownObserver = new MutationObserver(() => {
      if (widget?.classList.contains("is-eye-double-blink")) {
        window.__ballBoyDoubleBlinkCount += 1;
      }
    });
    window.__ballBoyCooldownObserver.observe(widget, {
      attributes: true,
      attributeFilter: ["class"]
    });
  });
  await touchPage.locator(".scout-reset").click();
  await touchPage.waitForTimeout(620);
  await touchPage.locator(".scout-reset").click();
  await touchPage.waitForTimeout(100);
  const ballBoyCooldownBlinkCount = await touchPage.evaluate(() => {
    window.__ballBoyCooldownObserver?.disconnect();
    const count = window.__ballBoyDoubleBlinkCount || 0;
    delete window.__ballBoyDoubleBlinkCount;
    delete window.__ballBoyCooldownObserver;
    return count;
  });
  assert(
    ballBoyCooldownBlinkCount === 1,
    `Ball Boy should suppress a second contextual blink inside the shared cooldown. Measured ${ballBoyCooldownBlinkCount}.`
  );
  const ballBoyClosedHeaderLayerState = await touchPage.evaluate(() => {
    const catchUpButton = document.querySelector("#catch-up-button");
    const settingsButton = document.querySelector("#settings-button");
    const widget = document.querySelector("#scout-widget");
    return {
      catchUpButtonLayer: Number.parseInt(getComputedStyle(catchUpButton).zIndex, 10),
      settingsButtonLayer: Number.parseInt(getComputedStyle(settingsButton).zIndex, 10),
      widgetLayer: Number.parseInt(getComputedStyle(widget).zIndex, 10)
    };
  });
  assert(
    ballBoyClosedHeaderLayerState.catchUpButtonLayer < ballBoyClosedHeaderLayerState.widgetLayer &&
      ballBoyClosedHeaderLayerState.settingsButtonLayer < ballBoyClosedHeaderLayerState.widgetLayer,
    `Ball Boy should cover the closed Catch Up and Settings buttons. Measured ${JSON.stringify(ballBoyClosedHeaderLayerState)}.`
  );
  await touchPage.evaluate(() => document.querySelector("#settings-button")?.click());
  const ballBoyOpenHeaderLayerState = await touchPage.evaluate(() => {
    const settingsPopover = document.querySelector("#settings-popover");
    const widget = document.querySelector("#scout-widget");
    return {
      popoverLayer: Number.parseInt(getComputedStyle(settingsPopover).zIndex, 10),
      settingsVisible: !settingsPopover?.classList.contains("is-hidden"),
      widgetLayer: Number.parseInt(getComputedStyle(widget).zIndex, 10)
    };
  });
  assert(
    ballBoyOpenHeaderLayerState.settingsVisible &&
      ballBoyOpenHeaderLayerState.popoverLayer > ballBoyOpenHeaderLayerState.widgetLayer,
    `An open header popover should still sit above Ball Boy. Measured ${JSON.stringify(ballBoyOpenHeaderLayerState)}.`
  );
  await touchPage.evaluate(() => document.querySelector("#settings-button")?.click());
  await touchPage.evaluate(() => document.querySelector("#catch-up-button")?.click());
  const ballBoyOpenCatchUpLayerState = await touchPage.evaluate(() => {
    const catchUpPopover = document.querySelector("#catch-up-popover");
    const widget = document.querySelector("#scout-widget");
    return {
      popoverLayer: Number.parseInt(getComputedStyle(catchUpPopover).zIndex, 10),
      catchUpVisible: !catchUpPopover?.classList.contains("is-hidden"),
      widgetLayer: Number.parseInt(getComputedStyle(widget).zIndex, 10)
    };
  });
  assert(
    ballBoyOpenCatchUpLayerState.catchUpVisible &&
      ballBoyOpenCatchUpLayerState.popoverLayer > ballBoyOpenCatchUpLayerState.widgetLayer,
    `An open Catch Up popover should still sit above Ball Boy. Measured ${JSON.stringify(ballBoyOpenCatchUpLayerState)}.`
  );
  await touchPage.evaluate(() => document.querySelector("#catch-up-button")?.click());
  const ballBoyKeyboardState = await touchPage.evaluate(async () => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return { supported: false };
    }

    const originalHeight = viewport.height;
    const originalOffsetTop = viewport.offsetTop;
    let measured;

    try {
      Object.defineProperty(viewport, "height", { configurable: true, value: 420 });
      Object.defineProperty(viewport, "offsetTop", { configurable: true, value: 0 });
      document.querySelector("#scout-input")?.focus();
      viewport.dispatchEvent(new Event("resize"));
      await new Promise((resolve) => window.setTimeout(resolve, 450));

      const composer = document.querySelector("#scout-composer")?.getBoundingClientRect();
      const widget = document.querySelector("#scout-widget")?.getBoundingClientRect();
      measured = {
        activeInput: document.activeElement?.id === "scout-input",
        composerBottom: composer?.bottom || 0,
        keyboardClass: document.querySelector("#scout-widget")?.classList.contains("is-keyboard-open") || false,
        leftGap: widget?.left || 0,
        rightGap: window.innerWidth - (widget?.right || 0),
        supported: true,
        visualBottom: viewport.offsetTop + viewport.height,
        widgetBottom: widget?.bottom || 0,
        widgetTop: widget?.top || 0,
        widgetWidth: widget?.width || 0
      };
    } finally {
      delete viewport.height;
      delete viewport.offsetTop;
      viewport.dispatchEvent(new Event("resize"));
      await new Promise((resolve) => window.setTimeout(resolve, 450));
    }

    return {
      ...measured,
      restoredHeight: Math.round(viewport.height) === Math.round(originalHeight),
      restoredOffsetTop: Math.round(viewport.offsetTop) === Math.round(originalOffsetTop)
    };
  });
  assert(
    ballBoyKeyboardState.supported &&
      ballBoyKeyboardState.activeInput &&
      ballBoyKeyboardState.keyboardClass &&
      ballBoyKeyboardState.widgetTop >= 0 &&
      ballBoyKeyboardState.widgetBottom <= ballBoyKeyboardState.visualBottom + 1 &&
      ballBoyKeyboardState.composerBottom <= ballBoyKeyboardState.visualBottom + 1 &&
      Math.abs(ballBoyKeyboardState.rightGap - 12) <= 1 &&
      Math.abs(ballBoyKeyboardState.widgetWidth - (390 - 24)) <= 1 &&
      ballBoyKeyboardState.restoredHeight &&
      ballBoyKeyboardState.restoredOffsetTop,
    `Ball Boy should attach its typing layout to the open mobile keyboard. Measured ${JSON.stringify(ballBoyKeyboardState)}.`
  );
  await ballBoyInput.fill("Tell me about Haaland");
  await ballBoySend.click();
  await touchPage.getByRole("heading", { name: "Erling Haaland" }).waitFor({ state: "visible" });
  await touchPage.waitForFunction(async () => {
    const conversation = document.querySelector("#scout-conversation");
    if (!conversation) return false;
    const positions = [];
    for (let index = 0; index < 4; index += 1) {
      positions.push(conversation.scrollTop);
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
    }
    return positions.every((position, index) =>
      index === 0 ? true : Math.abs(position - positions[index - 1]) < 0.5
    );
  });
  const haalandBallBoyMetrics = await touchPage.evaluate((birthDate) => {
    const conversation = document.querySelector("#scout-conversation");
    const answer = [...document.querySelectorAll(".scout-answer")].at(-1);
    const card = answer?.querySelector(".scout-player-card");
    const valueCell = card?.querySelector(".scout-player-fact-section:last-child .is-value");
    const inlineFlag = card?.querySelector(".scout-inline-flag");
    const inlineFlagStyle = inlineFlag ? getComputedStyle(inlineFlag) : null;
    const lead = answer?.querySelector(".scout-answer-lead")?.textContent.replace(/\s+/g, " ").trim() || "";
    const noteBlock = [...card?.querySelectorAll(".scout-explainer") || []].at(-1);
    const noteBullets = [...(noteBlock?.querySelectorAll(".scout-player-watch-points li") || [])]
      .map((item) => item.textContent.replace(/\s+/g, " ").trim());
    const note = noteBullets.join(" ");
    const prompts = [...(answer?.querySelectorAll("[data-scout-prompt]") || [])]
      .map((item) => item.dataset.scoutPrompt.trim().toLowerCase());
    const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
    const now = new Date();
    const expectedAge =
      now.getFullYear() -
      birthYear -
      (now.getMonth() + 1 < birthMonth ||
      (now.getMonth() + 1 === birthMonth && now.getDate() < birthDay)
        ? 1
        : 0);

    return {
      avatarFlagCount: card?.querySelectorAll(".scout-avatar-flag").length,
      cardOverflow: card ? card.scrollWidth - card.clientWidth : null,
      club: card?.querySelector(".scout-entity-copy small")?.textContent.trim() || "",
      conversationOverflow: conversation ? conversation.scrollWidth - conversation.clientWidth : null,
      expectedAge,
      followUpCount: answer?.querySelectorAll(".scout-followup").length,
      inlineFlagCount: card?.querySelectorAll(".scout-inline-flag").length,
      inlineFlagColor: inlineFlagStyle?.color || "",
      inlineFlagFilter: inlineFlagStyle?.filter || "",
      inlineFlagOpacity: inlineFlagStyle?.opacity || "",
      lead,
      moreHidden: document.querySelector("#scout-more")?.hidden,
      note,
      noteBullets,
      promptCount: prompts.length,
      promptUniqueCount: new Set(prompts).size,
      remaining: conversation
        ? conversation.scrollHeight - conversation.clientHeight - conversation.scrollTop
        : null,
      beginnerSectionCount: [...(card?.querySelectorAll(".scout-section-label") || [])]
        .filter((item) => item.textContent.trim() === "Beginner version").length,
      scopes: [...(card?.querySelectorAll(".scout-player-fact-section > .scout-section-label") || [])]
        .map((item) => item.textContent.trim()),
      signatureArrowCount: card?.querySelectorAll(".scout-skill-section .scout-flow-arrow").length || 0,
      signatureLabel: card?.querySelector(".scout-skill-section > .scout-section-label")?.textContent.trim() || "",
      signaturePillCount: card?.querySelectorAll(".scout-player-skill-list > span").length || 0,
      signaturePillRadius: getComputedStyle(card?.querySelector(".scout-player-skill-list > span")).borderRadius,
      signatureWrap: getComputedStyle(card?.querySelector(".scout-player-skill-list")).flexWrap,
      statCells: [...(card?.querySelectorAll(".scout-player-fact-row > div") || [])]
        .map((item) => item.innerText.replace(/\s+/g, " ").trim()),
      valueTitle: valueCell?.getAttribute("title") || ""
    };
  }, haalandProfileBirthDate);
  assert(
    haalandBallBoyMetrics.lead === "Here’s more about Erling Haaland." &&
      haalandBallBoyMetrics.club === "Manchester City (Premier League)" &&
      JSON.stringify(haalandBallBoyMetrics.scopes) === JSON.stringify(["This World Cup", "Player details"]) &&
      haalandBallBoyMetrics.statCells[0] === "7 Goals" &&
      haalandBallBoyMetrics.statCells[1] === "0 Assists" &&
      haalandBallBoyMetrics.statCells[2] === `${haalandBallBoyMetrics.expectedAge} Age` &&
      haalandBallBoyMetrics.statCells[3] === "€200m Value" &&
      haalandBallBoyMetrics.valueTitle.includes("sourced public player data") &&
      haalandBallBoyMetrics.beginnerSectionCount === 0 &&
      haalandBallBoyMetrics.signatureLabel === "Signature traits" &&
      haalandBallBoyMetrics.signatureArrowCount === 0 &&
      haalandBallBoyMetrics.signaturePillCount === 3 &&
      haalandBallBoyMetrics.signaturePillRadius === "999px" &&
      haalandBallBoyMetrics.signatureWrap === "wrap" &&
      haalandBallBoyMetrics.avatarFlagCount === 0 &&
      haalandBallBoyMetrics.inlineFlagCount === 1 &&
      haalandBallBoyMetrics.inlineFlagColor === "rgb(10, 10, 10)" &&
      haalandBallBoyMetrics.inlineFlagFilter === "none" &&
      haalandBallBoyMetrics.inlineFlagOpacity === "1" &&
      haalandBallBoyMetrics.note.startsWith("Watch Haaland for reading the flight of the ball before the duel begins") &&
      haalandBallBoyMetrics.noteBullets[1] ===
        "The clearest example is how he starts outside his marker and attacks the dropping ball." &&
      !/\b(?:World Cup|\d+ goals?|\d+ assists?)\b/i.test(haalandBallBoyMetrics.note) &&
      haalandBallBoyMetrics.noteBullets.length === 3 &&
      haalandBallBoyMetrics.followUpCount === 3 &&
      haalandBallBoyMetrics.promptCount === haalandBallBoyMetrics.promptUniqueCount &&
      haalandBallBoyMetrics.remaining > 8 &&
      haalandBallBoyMetrics.moreHidden === false &&
      haalandBallBoyMetrics.cardOverflow <= 4 &&
      haalandBallBoyMetrics.conversationOverflow <= 1,
    `Ball Boy's Haaland card should show complete, current, scoped player facts. Measured ${JSON.stringify(haalandBallBoyMetrics)}.`
  );

  const ballBoyMore = touchPage.locator("#scout-more");
  for (let attempt = 0; attempt < 6 && !(await ballBoyMore.isHidden()); attempt += 1) {
    const scrollStep = await touchPage.locator("#scout-conversation").evaluate((conversation) => ({
      target: Math.min(
        conversation.scrollHeight - conversation.clientHeight,
        conversation.scrollTop + Math.max(160, conversation.clientHeight * 0.7)
      )
    }));
    await ballBoyMore.click();
    await touchPage.waitForFunction(
      ({ target }) => {
        const conversation = document.querySelector("#scout-conversation");
        const more = document.querySelector("#scout-more");
        return Boolean(more?.hidden || (conversation && conversation.scrollTop >= target - 1));
      },
      scrollStep
    );
  }
  const ballBoyBottomMetrics = await touchPage.evaluate(() => {
    const conversation = document.querySelector("#scout-conversation");
    const conversationBounds = conversation?.getBoundingClientRect();
    const lastFollowUp = document.querySelector(".scout-followup:last-child")?.getBoundingClientRect();
    return {
      lastFollowUpVisible: Boolean(
        conversationBounds &&
          lastFollowUp &&
          lastFollowUp.top >= conversationBounds.top &&
          lastFollowUp.bottom <= conversationBounds.bottom
      ),
      maskImage: conversation ? getComputedStyle(conversation).maskImage : "",
      moreHidden: document.querySelector("#scout-more")?.hidden,
      remaining: conversation
        ? conversation.scrollHeight - conversation.clientHeight - conversation.scrollTop
        : null
    };
  });
  assert(
    ballBoyBottomMetrics.lastFollowUpVisible &&
      ballBoyBottomMetrics.moreHidden === true &&
      ballBoyBottomMetrics.remaining <= 1 &&
      ballBoyBottomMetrics.maskImage === "none",
    `Ball Boy's continuation control should reveal the note and all follow-ups, then clear. Measured ${JSON.stringify(ballBoyBottomMetrics)}.`
  );

  await ballBoyInput.fill("What is his value?");
  assert(!(await ballBoySend.isDisabled()), "Ball Boy send should enable after text is entered.");
  await ballBoySend.click();
  await touchPage
    .getByText("Erling Haaland's market value is €200m.", { exact: true })
    .waitFor({ state: "visible" });
  const valueFocusMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer.is-player")].at(-1);
    const card = answer?.querySelector(".scout-player-card");
    return {
      cardClass: card?.className || "",
      facts: card?.querySelectorAll(".scout-player-facts").length || 0,
      note: card?.querySelectorAll(".scout-explainer").length || 0,
      role: card?.querySelectorAll(".scout-role-block").length || 0,
      skills: card?.querySelectorAll(".scout-skill-section").length || 0
    };
  });
  assert(
    valueFocusMetrics.cardClass.includes("is-focus-value") &&
      valueFocusMetrics.facts === 0 &&
      valueFocusMetrics.note === 0 &&
      valueFocusMetrics.role === 0 &&
      valueFocusMetrics.skills === 0,
    `A direct player-value question should not append unrelated stats, role, skills, or editorial notes. Measured ${JSON.stringify(valueFocusMetrics)}.`
  );

  await ballBoyInput.fill("How old is he?");
  await ballBoySend.click();
  await touchPage
    .getByText(`Erling Haaland is ${haalandBallBoyMetrics.expectedAge}.`, { exact: true })
    .waitFor({ state: "visible" });
  const ageFocusMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer.is-player")].at(-1);
    const card = answer?.querySelector(".scout-player-card");
    return {
      cardClass: card?.className || "",
      extraSections: card?.querySelectorAll(".scout-player-facts, .scout-role-block, .scout-skill-section, .scout-explainer").length || 0,
      overflow: card ? card.scrollWidth - card.clientWidth : null
    };
  });
  assert(
    ageFocusMetrics.cardClass.includes("is-focus-age") &&
      ageFocusMetrics.extraSections === 0 &&
      ageFocusMetrics.overflow <= 1,
    `A direct player-age question should stay compact and unclipped. Measured ${JSON.stringify(ageFocusMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await ballBoyInput.fill("How many goals and assists does Mbappe have?");
  await ballBoySend.click();
  await touchPage.getByRole("heading", { name: "Kylian Mbappé" }).waitFor({ state: "visible" });
  const statsFocusMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer.is-player")].at(-1);
    const card = answer?.querySelector(".scout-player-card");
    return {
      cardClass: card?.className || "",
      factSections: card?.querySelectorAll(".scout-player-fact-section").length || 0,
      labels: [...(card?.querySelectorAll(".scout-player-fact-section .scout-section-label") || [])]
        .map((item) => item.textContent.trim()),
      unrelatedSections: card?.querySelectorAll(".scout-role-block, .scout-skill-section, .scout-explainer").length || 0
    };
  });
  assert(
    statsFocusMetrics.cardClass.includes("is-focus-stats") &&
      statsFocusMetrics.factSections === 1 &&
      JSON.stringify(statsFocusMetrics.labels) === JSON.stringify(["This World Cup"]) &&
      statsFocusMetrics.unrelatedSections === 0,
    `A player-stats question should show only the tournament stat strip. Measured ${JSON.stringify(statsFocusMetrics)}.`
  );

  await touchPage.setViewportSize({ width: 320, height: 568 });
  await touchPage.locator("#scout-reset").click();
  await ballBoyInput.fill("How does Ibrahim Mbaye play?");
  await ballBoySend.click();
  await touchPage.getByRole("heading", { name: "Ibrahim Mbaye" }).waitFor({ state: "visible" });
  const narrowBallBoyMetrics = await touchPage.evaluate(() => {
    const conversation = document.querySelector("#scout-conversation");
    const widget = document.querySelector("#scout-widget")?.getBoundingClientRect();
    return {
      cardClass: document.querySelector(".scout-player-card")?.className || "",
      conversationOverflow: conversation ? conversation.scrollWidth - conversation.clientWidth : null,
      unrelatedFacts: document.querySelectorAll(".scout-player-card .scout-player-facts").length,
      skillOverflow: [...document.querySelectorAll(".scout-player-card .scout-player-skill-list > span")]
        .map((skill) => ({
          overflow: skill.scrollWidth - skill.clientWidth,
          text: skill.textContent.trim()
        })),
      widget: widget
        ? { bottom: widget.bottom, left: widget.left, right: widget.right, top: widget.top }
        : null
    };
  });
  assert(
    narrowBallBoyMetrics.cardClass.includes("is-focus-style") &&
      narrowBallBoyMetrics.unrelatedFacts === 0 &&
      narrowBallBoyMetrics.conversationOverflow <= 1 &&
      narrowBallBoyMetrics.skillOverflow.length === 3 &&
      narrowBallBoyMetrics.skillOverflow.every((skill) => skill.overflow <= 1) &&
      narrowBallBoyMetrics.skillOverflow.some((skill) => skill.text === "Wing explosiveness") &&
      narrowBallBoyMetrics.widget &&
      narrowBallBoyMetrics.widget.left >= 0 &&
      narrowBallBoyMetrics.widget.top >= 0 &&
      narrowBallBoyMetrics.widget.right <= 320 &&
      narrowBallBoyMetrics.widget.bottom <= 568,
    `Ball Boy's focused player-style card should fit a 320px-wide phone without unrelated facts or clipped skills. Measured ${JSON.stringify(narrowBallBoyMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await ballBoyInput.fill("Tell me about Abduvohid Nematov");
  await ballBoySend.click();
  await touchPage.getByRole("heading", { name: "Abduvohid Nematov" }).waitFor({ state: "visible" });
  const estimatedValueMetrics = await touchPage.evaluate(() => {
    const card = document.querySelector(".scout-player-card");
    const facts = card?.querySelector(".scout-player-facts");
    const valueCell = card?.querySelector(".scout-player-fact-section:last-child .is-value");
    const valueLabel = valueCell?.querySelector(".scout-value-label");
    const valueLabelStyle = valueLabel ? getComputedStyle(valueLabel) : null;
    return {
      statOverflow: facts ? facts.scrollWidth - facts.clientWidth : null,
      value: valueCell?.innerText.replace(/\s+/g, " ").trim() || "",
      valueLabel: valueLabel?.textContent.replace(/\s+/g, " ").trim() || "",
      valueLabelHeight: valueLabel?.getBoundingClientRect().height || 0,
      valueLabelLineHeight: valueLabelStyle ? parseFloat(valueLabelStyle.lineHeight) : 0,
      valueLabelWhiteSpace: valueLabelStyle?.whiteSpace || "",
      valueOverflow: valueCell ? valueCell.scrollWidth - valueCell.clientWidth : null
    };
  });
  assert(
    estimatedValueMetrics.value === "€600k Est. value (Prime €1.5m)" &&
      estimatedValueMetrics.valueLabel === "Est. value (Prime €1.5m)" &&
      estimatedValueMetrics.valueLabelWhiteSpace === "nowrap" &&
      estimatedValueMetrics.valueLabelHeight <= estimatedValueMetrics.valueLabelLineHeight + 1 &&
      estimatedValueMetrics.statOverflow <= 1 &&
      estimatedValueMetrics.valueOverflow <= 1,
    `Ball Boy should label estimated and prime values without overflowing at 320px. Measured ${JSON.stringify(estimatedValueMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await ballBoyInput.fill("How does Argentina play?");
  await ballBoySend.click();
  await touchPage.locator(".scout-answer.is-country").waitFor({ state: "visible" });
  const countryBallBoyMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer")].at(-1);
    const conversation = document.querySelector("#scout-conversation");
    const card = answer.querySelector(".scout-country-card");
    const widget = document.querySelector(".scout-widget").getBoundingClientRect();
    const lead = answer.querySelector(".scout-answer-lead")?.textContent.replace(/\s+/g, " ").trim() || "";
    const flowSteps = [...answer.querySelectorAll(".scout-country-card .scout-flow-step")];
    const isTransparent = (value) => value === "transparent" || value === "rgba(0, 0, 0, 0)";
    return {
      cardBackground: getComputedStyle(card).backgroundColor,
      cardClass: card.className,
      cardOverflow: card.scrollWidth - card.clientWidth,
      conversationOverflow: conversation.scrollWidth - conversation.clientWidth,
      countryFlags: answer.querySelectorAll(".scout-country-flag").length,
      fixtureCount: answer.querySelectorAll(".scout-compact-fixture").length,
      flowIsPlain: flowSteps.every((item) => {
        const style = getComputedStyle(item);
        return isTransparent(style.backgroundColor) && parseFloat(style.borderRadius) === 0;
      }),
      flowOverflow: flowSteps.map((item) => item.scrollWidth - item.clientWidth),
      flowStepCount: flowSteps.length,
      formCount: answer.querySelectorAll(".scout-form-result").length,
      goalBalanceCount: answer.querySelectorAll(".scout-goal-balance").length,
      keyPlayerCount: answer.querySelectorAll(".scout-key-players").length,
      labelsUseSentenceCase: [...card.querySelectorAll(".scout-section-label")]
        .every((item) => getComputedStyle(item).textTransform === "none"),
      lead,
      meta: card.querySelector(".scout-country-header p")?.textContent.replace(/\s+/g, " ").trim() || "",
      recordCellCount: answer.querySelectorAll(".scout-stat-strip > div").length,
      topScorerCount: answer.querySelectorAll(".scout-top-scorer").length,
      widget: {
        bottom: widget.bottom,
        left: widget.left,
        right: widget.right,
        top: widget.top
      }
    };
  });
  assert(
    countryBallBoyMetrics.cardBackground === "rgb(255, 255, 255)" &&
      countryBallBoyMetrics.cardClass.includes("is-focus-style") &&
      countryBallBoyMetrics.countryFlags === 1 &&
      countryBallBoyMetrics.lead === "Argentina can keep the ball patiently, but they become much quicker after winning it. Julián Álvarez leads the press, Lionel Messi finds space behind midfield, and Enzo Fernández changes the angle with forward passes. Without the ball, their priority is closing central counters before they reach Emiliano Martinez's box." &&
      countryBallBoyMetrics.meta.includes("FIFA rank 1 (2026)") &&
      countryBallBoyMetrics.flowStepCount === 3 &&
      countryBallBoyMetrics.flowIsPlain &&
      countryBallBoyMetrics.flowOverflow.every((overflow) => overflow <= 1) &&
      countryBallBoyMetrics.recordCellCount === 0 &&
      countryBallBoyMetrics.goalBalanceCount === 0 &&
      countryBallBoyMetrics.formCount === 0 &&
      countryBallBoyMetrics.keyPlayerCount === 0 &&
      countryBallBoyMetrics.topScorerCount === 0 &&
      countryBallBoyMetrics.fixtureCount === 0 &&
      countryBallBoyMetrics.labelsUseSentenceCase &&
      countryBallBoyMetrics.cardOverflow <= 1 &&
      countryBallBoyMetrics.conversationOverflow <= 1 &&
      countryBallBoyMetrics.widget.left >= 0 &&
      countryBallBoyMetrics.widget.top >= 0 &&
      countryBallBoyMetrics.widget.right <= 320 &&
      countryBallBoyMetrics.widget.bottom <= 568,
    `Ball Boy's country-style answer should show only the style explanation and visual, without unrelated record, player, or fixture sections. Measured ${JSON.stringify(countryBallBoyMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await ballBoyInput.fill("How many wins does Norway have?");
  await ballBoySend.click();
  await touchPage.locator(".scout-country-card.is-focus-record").waitFor({ state: "visible" });
  const countryRecordFocusMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer.is-country")].at(-1);
    const card = answer?.querySelector(".scout-country-card");
    return {
      fixtures: card?.querySelectorAll(".scout-compact-fixture").length || 0,
      goals: card?.querySelectorAll(".scout-goal-balance").length || 0,
      players: card?.querySelectorAll(".scout-key-players, .scout-top-scorer").length || 0,
      recordCells: card?.querySelectorAll(".scout-stat-strip > div").length || 0,
      style: card?.querySelectorAll(".scout-skill-flow, .scout-explainer").length || 0
    };
  });
  assert(
    countryRecordFocusMetrics.recordCells === 3 &&
      countryRecordFocusMetrics.goals === 1 &&
      countryRecordFocusMetrics.players === 0 &&
      countryRecordFocusMetrics.style === 0 &&
      countryRecordFocusMetrics.fixtures === 0,
    `A country-record question should show the record and goal balance without unrelated style, players, or fixtures. Measured ${JSON.stringify(countryRecordFocusMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await ballBoyInput.fill("Who do Argentina play next?");
  await ballBoySend.click();
  const argentinaSemiFinalIsLive = currentEnglandArgentinaSemiFinal?.status === "LIVE";
  const expectedArgentinaNextFixture = fixturesData.fixtures
    .filter((fixture) =>
      fixture.status !== "FT" &&
      [fixture.homeTeamId, fixture.awayTeamId].includes("ARG")
    )
    .sort((left, right) => new Date(left.kickoffUtc) - new Date(right.kickoffUtc))[0];
  const expectedArgentinaNextTeams = expectedArgentinaNextFixture
    ? [expectedArgentinaNextFixture.homeTeamId, expectedArgentinaNextFixture.awayTeamId].map((teamId) => {
        const team = getTeam(teamId);
        return team.standingName || team.name;
      })
    : [];
  const argentinaHasNoNextFixture = !expectedArgentinaNextFixture;
  await touchPage.locator(
    argentinaSemiFinalIsLive || argentinaHasNoNextFixture
      ? ".scout-country-card.is-focus-next"
      : ".scout-match-card.is-focus-when"
  ).waitFor({ state: "visible" });
  const nextFixtureMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer")].at(-1);
    return {
      highlightLinks: answer?.querySelectorAll(".scout-highlight-link").length || 0,
      lead: answer?.querySelector(".scout-answer-lead")?.textContent.trim() || "",
      matchCards: answer?.querySelectorAll(".scout-match-card").length || 0,
      teamVisuals: [...(answer?.querySelectorAll(".scout-scoreboard > div:not(.scout-score-value)") || [])]
        .map((team) => ({
          columnOpacity: getComputedStyle(team).opacity,
          nameOpacity: getComputedStyle(team.querySelector("strong")).opacity
        })),
      teams: [...(answer?.querySelectorAll(".scout-scoreboard strong") || [])]
        .map((team) => team.textContent.trim()),
      unrelatedSections: answer?.querySelectorAll(".scout-match-timeline, .scout-match-plans, .scout-match-recap, .scout-match-card > .scout-explainer").length || 0
    };
  });
  assert(
    argentinaSemiFinalIsLive || argentinaHasNoNextFixture
      ? nextFixtureMetrics.lead === "Argentina do not currently have another match scheduled." &&
        nextFixtureMetrics.matchCards === 0 &&
        nextFixtureMetrics.highlightLinks === 0
      : expectedArgentinaNextFixture &&
        nextFixtureMetrics.lead.startsWith(`${expectedArgentinaNextTeams.join(" vs ")}:`) &&
        JSON.stringify(nextFixtureMetrics.teams) === JSON.stringify(expectedArgentinaNextTeams) &&
        nextFixtureMetrics.teamVisuals.length === 2 &&
        nextFixtureMetrics.teamVisuals.every((team) => team.columnOpacity === "1" && team.nameOpacity === "0.58") &&
        nextFixtureMetrics.highlightLinks === 0 &&
        nextFixtureMetrics.unrelatedSections === 0,
    `Ball Boy should answer the exact Argentina next-match question for the current fixture state without crashing on a missing highlight. Measured ${JSON.stringify(nextFixtureMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await ballBoyInput.fill("Who won Norway vs England?");
  await ballBoySend.click();
  await touchPage.locator(".scout-answer.is-match").waitFor({ state: "visible" });
  const matchBallBoyMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer")].at(-1);
    const prompts = [...answer.querySelectorAll("[data-scout-prompt]")]
      .map((item) => item.dataset.scoutPrompt.trim().toLowerCase());
    const flags = [...answer.querySelectorAll(".scout-score-flag")];
    return {
      cardClass: answer.querySelector(".scout-match-card")?.className || "",
      englandFlag: flags.some((flag) => flag.classList.contains("flag-england")),
      flagSizes: flags.map((flag) => {
        const bounds = flag.getBoundingClientRect();
        return { height: bounds.height, width: bounds.width };
      }),
      teamVisuals: [...answer.querySelectorAll(".scout-scoreboard > div:not(.scout-score-value)")]
        .map((team) => ({
          columnOpacity: getComputedStyle(team).opacity,
          nameOpacity: getComputedStyle(team.querySelector("strong")).opacity
        })),
      overflow: answer.scrollWidth - answer.clientWidth,
      recapCount: answer.querySelectorAll(".scout-match-recap").length,
      promptCount: prompts.length,
      promptUniqueCount: new Set(prompts).size,
      status: answer.querySelector(".scout-match-meta")?.innerText.replace(/\s+/g, " ").trim() || "",
      timelineCount: answer.querySelectorAll(".scout-match-timeline").length,
      unrelatedSections: answer.querySelectorAll(".scout-match-plans, .scout-match-card > .scout-explainer, .scout-highlight-link").length
    };
  });
  assert(
    matchBallBoyMetrics.cardClass.includes("is-focus-result") &&
      matchBallBoyMetrics.flagSizes.length === 2 &&
      matchBallBoyMetrics.flagSizes.every((flag) => flag.width > 0 && flag.height > 0) &&
      matchBallBoyMetrics.teamVisuals.every((team) => team.columnOpacity === "1") &&
      matchBallBoyMetrics.teamVisuals.some((team) => team.nameOpacity === "1") &&
      matchBallBoyMetrics.teamVisuals.some((team) => team.nameOpacity === "0.58") &&
      matchBallBoyMetrics.englandFlag &&
      matchBallBoyMetrics.status.includes("After extra time") &&
      matchBallBoyMetrics.recapCount === 1 &&
      matchBallBoyMetrics.timelineCount === 0 &&
      matchBallBoyMetrics.unrelatedSections === 0 &&
      matchBallBoyMetrics.promptCount === matchBallBoyMetrics.promptUniqueCount &&
      matchBallBoyMetrics.overflow <= 1,
    `Ball Boy's result answer should show the scoreboard and key moments without unrelated timeline, plan, H2H, or highlight sections. Measured ${JSON.stringify(matchBallBoyMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await ballBoyInput.fill("Who scored in Norway vs England?");
  await ballBoySend.click();
  await touchPage.locator(".scout-match-card.is-focus-scorers").waitFor({ state: "visible" });
  const matchScorerFocusMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer.is-match")].at(-1);
    return {
      recap: answer.querySelectorAll(".scout-match-recap").length,
      timeline: answer.querySelectorAll(".scout-match-timeline").length,
      timelineRows: answer.querySelectorAll(".scout-goal-row").length,
      text: answer.querySelector(".scout-answer-lead")?.textContent.trim() || ""
    };
  });
  assert(
    matchScorerFocusMetrics.timeline === 1 &&
      matchScorerFocusMetrics.timelineRows === 3 &&
      matchScorerFocusMetrics.recap === 0 &&
      /Andreas Schjelderup|Jude Bellingham/.test(matchScorerFocusMetrics.text),
    `A match-scorer question should show the scorer lead and timeline without repeating the recap. Measured ${JSON.stringify(matchScorerFocusMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await ballBoyInput.fill("When was Norway vs England?");
  await ballBoySend.click();
  await touchPage.locator(".scout-match-card.is-focus-when").waitFor({ state: "visible" });
  const matchWhenFocusMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer.is-match")].at(-1);
    return {
      lead: answer.querySelector(".scout-answer-lead")?.textContent.trim() || "",
      sections: answer.querySelectorAll(".scout-match-timeline, .scout-match-plans, .scout-match-recap, .scout-match-card > .scout-explainer, .scout-highlight-link").length
    };
  });
  assert(
    matchWhenFocusMetrics.lead.includes("Norway vs England:") &&
      matchWhenFocusMetrics.sections === 0,
    `A match-time question should answer with the localized kickoff and no unrelated story sections. Measured ${JSON.stringify(matchWhenFocusMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await ballBoyInput.fill("Explain offside");
  await ballBoySend.click();
  await touchPage.locator(".scout-answer.is-offside").waitFor({ state: "visible" });
  const offsideBallBoyMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer")].at(-1);
    const source = answer.querySelector(".scout-source-link")?.getBoundingClientRect();
    return {
      decorativeHeaderCount: answer.querySelectorAll(".offside-summary-heading").length,
      overflow: answer.scrollWidth - answer.clientWidth,
      scenarioColumns: [...answer.querySelectorAll(".offside-scenario")]
        .map((scenario) => getComputedStyle(scenario).gridTemplateColumns.split(" ").length),
      scenarioCount: answer.querySelectorAll(".offside-scenario").length,
      sourceHeight: source?.height || 0
    };
  });
  assert(
    offsideBallBoyMetrics.decorativeHeaderCount === 0 &&
      offsideBallBoyMetrics.scenarioCount === 2 &&
      offsideBallBoyMetrics.scenarioColumns.every((count) => count === 1) &&
      offsideBallBoyMetrics.sourceHeight >= 40 &&
      offsideBallBoyMetrics.overflow <= 1,
    `Ball Boy's visual offside answer should stack cleanly and keep its source touchable at 320px. Measured ${JSON.stringify(offsideBallBoyMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await ballBoyInput.fill("Explain a red card");
  await ballBoySend.click();
  await touchPage.locator(".scout-answer.is-rule").waitFor({ state: "visible" });
  const ruleBallBoyMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer")].at(-1);
    const card = answer.querySelector(".scout-rule-card");
    const source = answer.querySelector(".scout-source-link")?.getBoundingClientRect();
    const takeaway = answer.querySelector(".scout-takeaway");
    const prompts = [...answer.querySelectorAll("[data-scout-prompt]")]
      .map((item) => item.dataset.scoutPrompt.trim().toLowerCase());
    return {
      flowSteps: answer.querySelectorAll(".scout-rule-step").length,
      overflow: answer.scrollWidth - answer.clientWidth,
      pointCount: answer.querySelectorAll(".scout-rule-points > div").length,
      promptCount: prompts.length,
      promptUniqueCount: new Set(prompts).size,
      sourceHeight: source?.height || 0,
      sourceWidthDifference: card && source ? Math.abs(card.clientWidth - source.width) : null,
      takeawayBackground: takeaway ? getComputedStyle(takeaway).backgroundColor : "",
      takeawayText: takeaway?.textContent.trim() || "",
      takeawayTextAlign: takeaway ? getComputedStyle(takeaway).textAlign : ""
    };
  });
  assert(
    ruleBallBoyMetrics.flowSteps === 3 &&
      ruleBallBoyMetrics.pointCount === 2 &&
      ruleBallBoyMetrics.sourceHeight >= 40 &&
      ruleBallBoyMetrics.sourceWidthDifference <= 1 &&
      ruleBallBoyMetrics.takeawayBackground !== "rgb(10, 10, 10)" &&
      ruleBallBoyMetrics.takeawayText === "The team plays one player short." &&
      ruleBallBoyMetrics.takeawayTextAlign === "left" &&
      ruleBallBoyMetrics.promptCount === ruleBallBoyMetrics.promptUniqueCount &&
      ruleBallBoyMetrics.overflow <= 1,
    `Ball Boy's standard rule card should end as one continuous, readable, touchable surface at 320px. Measured ${JSON.stringify(ruleBallBoyMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await ballBoyInput.fill("What can I ask?");
  await ballBoySend.click();
  await touchPage.locator(".scout-answer.is-help").waitFor({ state: "visible" });
  const helpBallBoyMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer")].at(-1);
    const prompts = [...answer.querySelectorAll("[data-scout-prompt]")]
      .map((item) => item.dataset.scoutPrompt.trim().toLowerCase());
    const example = answer.querySelector(".scout-help-grid small");
    return {
      cards: answer.querySelectorAll(".scout-help-grid button").length,
      exampleFont: example ? Number.parseFloat(getComputedStyle(example).fontSize) : 0,
      followUps: answer.querySelectorAll(".scout-followup").length,
      lead: answer.querySelector(".scout-answer-lead")?.textContent.trim() || "",
      overflow: answer.scrollWidth - answer.clientWidth,
      promptCount: prompts.length,
      promptUniqueCount: new Set(prompts).size
    };
  });
  assert(
    helpBallBoyMetrics.cards === 4 &&
      helpBallBoyMetrics.followUps === 0 &&
      helpBallBoyMetrics.lead === "Choose a topic." &&
      helpBallBoyMetrics.promptCount === helpBallBoyMetrics.promptUniqueCount &&
      helpBallBoyMetrics.exampleFont >= 10 &&
      helpBallBoyMetrics.overflow <= 1,
    `Ball Boy's help grid should be the single clear set of choices with readable examples. Measured ${JSON.stringify(helpBallBoyMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await ballBoyInput.fill("Who should I watch for Norway?");
  await ballBoySend.click();
  await touchPage.locator(".scout-answer.is-player-list").waitFor({ state: "visible" });
  const watchBallBoyMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer")].at(-1);
    const cards = [...answer.querySelectorAll(".scout-watch-card")];
    const prompts = cards.map((item) => item.dataset.scoutPrompt.trim().toLowerCase());
    const note = answer.querySelector(".scout-watch-card em");
    return {
      cardCount: cards.length,
      countryNames: cards.map((card) => card.querySelector("small")?.textContent.trim() || ""),
      flagCounts: cards.map((card) => card.querySelectorAll(".scout-avatar-flag").length),
      followUps: answer.querySelectorAll(".scout-followup").length,
      noteFont: note ? Number.parseFloat(getComputedStyle(note).fontSize) : 0,
      overflow: answer.scrollWidth - answer.clientWidth,
      promptCount: prompts.length,
      promptUniqueCount: new Set(prompts).size
    };
  });
  assert(
    watchBallBoyMetrics.cardCount === 3 &&
      watchBallBoyMetrics.flagCounts.every((count) => count === 1) &&
      watchBallBoyMetrics.countryNames.every((text) => / · /.test(text)) &&
      watchBallBoyMetrics.followUps === 0 &&
      watchBallBoyMetrics.noteFont >= 10 &&
      watchBallBoyMetrics.promptCount === watchBallBoyMetrics.promptUniqueCount &&
      watchBallBoyMetrics.overflow <= 1,
    `Ball Boy's player list should use one contextual flag per card without repeated follow-up actions. Measured ${JSON.stringify(watchBallBoyMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await ballBoyInput.fill("Tell me about Emiliano Martinez");
  await ballBoySend.click();
  await touchPage.locator(".scout-answer.is-clarify").waitFor({ state: "visible" });
  const clarifyBallBoyMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer")].at(-1);
    const prompts = [...answer.querySelectorAll("[data-scout-prompt]")]
      .map((item) => item.dataset.scoutPrompt.trim().toLowerCase());
    return {
      followUps: answer.querySelectorAll(".scout-followup").length,
      options: answer.querySelectorAll(".scout-clarify-list button").length,
      overflow: answer.scrollWidth - answer.clientWidth,
      promptCount: prompts.length,
      promptUniqueCount: new Set(prompts).size
    };
  });
  assert(
    clarifyBallBoyMetrics.options === 2 &&
      clarifyBallBoyMetrics.followUps === 0 &&
      clarifyBallBoyMetrics.promptCount === clarifyBallBoyMetrics.promptUniqueCount &&
      clarifyBallBoyMetrics.overflow <= 1,
    `Ball Boy's clarification choices should appear once without duplicate pills. Measured ${JSON.stringify(clarifyBallBoyMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await ballBoyInput.fill("Who are you?");
  await ballBoySend.click();
  await touchPage.locator(".scout-message.is-assistant.is-personality").waitFor({ state: "visible" });
  const personalityBallBoyMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-message.is-assistant.is-personality")].at(-1);
    return {
      dataCards: answer.querySelectorAll(".scout-data-card").length,
      followUps: answer.querySelectorAll(".scout-followup").length,
      headings: answer.querySelectorAll(".scout-answer-heading").length,
      overflow: answer.scrollWidth - answer.clientWidth,
      response: answer.querySelector(":scope > p:not(.scout-speaker)")?.textContent.trim() || "",
      stamps: answer.querySelectorAll(".scout-personality-stamp").length
    };
  });
  assert(
    personalityBallBoyMetrics.response === "I’m Ball Boy. I make football easier to understand." &&
      personalityBallBoyMetrics.stamps === 0 &&
      personalityBallBoyMetrics.dataCards === 0 &&
      personalityBallBoyMetrics.headings === 0 &&
      personalityBallBoyMetrics.followUps === 0 &&
      personalityBallBoyMetrics.overflow <= 1,
    `Ball Boy's identity should be a direct semantic chat bubble without a badge, card, heading, or follow-ups. Measured ${JSON.stringify(personalityBallBoyMetrics)}.`
  );

  const worldCupHistoryQuestions = [
    ["who won the most", "Brazil have won the most men's World Cups: 5. Germany and Italy are next with 4 each."],
    ["when did Brazil last win", "Brazil last won the World Cup in 2002; they have 5 titles."],
    ["when did Brazil win", "Brazil won the World Cup 5 times: 1958, 1962, 1970, 1994, and 2002."],
    ["which year did Brazil win", "Brazil won the World Cup 5 times: 1958, 1962, 1970, 1994, and 2002."],
    ["has the Netherlands ever won the World Cup", "Netherlands have never won the men's World Cup."]
  ];
  const worldCupHistoryMetrics = [];
  for (const [question, expected] of worldCupHistoryQuestions) {
    await touchPage.locator("#scout-reset").click();
    await ballBoyInput.fill(question);
    await ballBoySend.click();
    await touchPage.locator(".scout-answer.is-world-cup-history").waitFor({ state: "visible" });
    worldCupHistoryMetrics.push(await touchPage.evaluate(() => {
      const answer = [...document.querySelectorAll(".scout-answer.is-world-cup-history")].at(-1);
      return {
        followUps: answer.querySelectorAll(".scout-followup").length,
        overflow: answer.scrollWidth - answer.clientWidth,
        text: answer.querySelector(".scout-answer-lead")?.textContent.trim() || ""
      };
    }));
    assert(
      worldCupHistoryMetrics.at(-1).text === expected,
      `Ball Boy should answer "${question}" from World Cup title history. Measured ${JSON.stringify(worldCupHistoryMetrics.at(-1))}.`
    );
  }
  assert(
    worldCupHistoryMetrics.every((answer) => answer.followUps >= 2 && answer.followUps <= 3 && answer.overflow <= 1),
    `Ball Boy's World Cup history answers should keep useful, non-repeated follow-ups without overflowing. Measured ${JSON.stringify(worldCupHistoryMetrics)}.`
  );

  for (const [question, expected] of [
    ["When is the next World Cup?", ["2030", "Morocco", "Portugal", "Spain", "Argentina", "Paraguay", "Uruguay", "8-9 June 2030"]],
    ["Where is the next World Cup?", ["2030", "Morocco", "Portugal", "Spain", "Argentina", "Paraguay", "Uruguay"]]
  ]) {
    await touchPage.locator("#scout-reset").click();
    await ballBoyInput.fill(question);
    await ballBoySend.click();
    await touchPage.locator(".scout-answer.is-world-cup-history").waitFor({ state: "visible" });
    const nextWorldCupMetrics = await touchPage.evaluate(() => {
      const answer = [...document.querySelectorAll(".scout-answer.is-world-cup-history")].at(-1);
      return {
        followUps: answer.querySelectorAll(".scout-followup").length,
        overflow: answer.scrollWidth - answer.clientWidth,
        text: answer.querySelector(".scout-answer-lead")?.textContent.trim() || ""
      };
    });
    assert(
      expected.every((piece) => nextWorldCupMetrics.text.includes(piece)) &&
        nextWorldCupMetrics.followUps >= 2 &&
        nextWorldCupMetrics.followUps <= 3 &&
        nextWorldCupMetrics.overflow <= 1,
      `Ball Boy should answer "${question}" with the next World Cup timing and host countries. Measured ${JSON.stringify(nextWorldCupMetrics)}.`
    );
  }

  for (const question of ["Who won the previous World Cup?"]) {
    await touchPage.locator("#scout-reset").click();
    await ballBoyInput.fill(question);
    await ballBoySend.click();
    await touchPage.locator(".scout-answer.is-match").waitFor({ state: "visible" });
    const previousWorldCupFinalMetrics = await touchPage.evaluate(() => {
      const answer = [...document.querySelectorAll(".scout-answer.is-match")].at(-1);
      return {
        followUps: answer.querySelectorAll(".scout-followup").length,
        goalRows: answer.querySelectorAll(".scout-goal-row").length,
        hasFifaHighlights: /FIFA/.test(answer.querySelector(".scout-highlight-link")?.textContent || ""),
        lead: answer.querySelector(".scout-answer-lead")?.textContent.trim() || "",
        overflow: answer.scrollWidth - answer.clientWidth,
        recapItems: answer.querySelectorAll(".scout-match-recap li").length,
        score: answer.querySelector(".scout-score-value")?.textContent.trim() || "",
        shootout: answer.querySelector(".scout-shootout-line")?.textContent.trim() || "",
        stage: answer.querySelector(".scout-match-meta span")?.textContent.trim() || "",
        teams: [...answer.querySelectorAll(".scout-scoreboard strong")].map((item) => item.textContent.trim())
      };
    });
    assert(
      previousWorldCupFinalMetrics.lead === "Argentina won the 2022 World Cup, beating France 4-2 on penalties after a 3-3 draw." &&
        previousWorldCupFinalMetrics.stage === "2022 World Cup final" &&
        JSON.stringify(previousWorldCupFinalMetrics.teams) === JSON.stringify(["Argentina", "France"]) &&
        previousWorldCupFinalMetrics.score === "3–3" &&
        previousWorldCupFinalMetrics.shootout.includes("4–2") &&
        previousWorldCupFinalMetrics.goalRows === 6 &&
        previousWorldCupFinalMetrics.recapItems === 3 &&
        previousWorldCupFinalMetrics.hasFifaHighlights &&
        previousWorldCupFinalMetrics.followUps >= 2 &&
        previousWorldCupFinalMetrics.followUps <= 3 &&
        previousWorldCupFinalMetrics.overflow <= 1,
      `Ball Boy should answer "${question}" with the complete Argentina-France 2022 final card. Measured ${JSON.stringify(previousWorldCupFinalMetrics)}.`
    );
  }

  for (const [question, expected] of [
    ["Who won?", { lead: "Spain won the 2026 World Cup, beating Argentina 1-0 in the final.", score: "1–0", stage: "2026 World Cup final", teams: ["Spain", "Argentina"] }],
    ["Who won the last World Cup?", { lead: "Argentina won the 2022 World Cup, beating France 4-2 on penalties after a 3-3 draw.", score: "3–3", stage: "2022 World Cup final", teams: ["Argentina", "France"] }],
    ["Who won the 2018 World Cup?", { lead: "France won the 2018 World Cup, beating Croatia 4-2 in the final.", score: "4–2", stage: "2018 World Cup final", teams: ["France", "Croatia"] }]
  ]) {
    await touchPage.locator("#scout-reset").click();
    await ballBoyInput.fill(question);
    await ballBoySend.click();
    await touchPage.locator(".scout-answer.is-match").waitFor({ state: "visible" });
    const finalMetrics = await touchPage.evaluate(() => {
      const answer = [...document.querySelectorAll(".scout-answer.is-match")].at(-1);
      return {
        followUps: answer.querySelectorAll(".scout-followup").length,
        lead: answer.querySelector(".scout-answer-lead")?.textContent.trim() || "",
        overflow: answer.scrollWidth - answer.clientWidth,
        score: answer.querySelector(".scout-score-value")?.textContent.trim() || "",
        stage: answer.querySelector(".scout-match-meta span")?.textContent.trim() || "",
        teams: [...answer.querySelectorAll(".scout-scoreboard strong")].map((item) => item.textContent.trim())
      };
    });
    assert(
      finalMetrics.lead === expected.lead &&
        finalMetrics.score === expected.score &&
        finalMetrics.stage === expected.stage &&
        JSON.stringify(finalMetrics.teams) === JSON.stringify(expected.teams) &&
        finalMetrics.followUps >= 2 &&
        finalMetrics.followUps <= 3 &&
        finalMetrics.overflow <= 1,
      `Ball Boy should answer "${question}" with the matching edition's final card. Measured ${JSON.stringify(finalMetrics)}.`
    );
  }

  for (const [question, expectedYear, expectedNames, expectedRows] of [
    ["Who won the World Cup awards?", "2026", ["Rodri", "Kylian Mbappe", "Unai Simon", "Pau Cubarsi", "Netherlands"], 5],
    ["Who won the awards at the previous World Cup?", "2022", ["Lionel Messi", "Kylian Mbappe", "Emiliano Martinez", "Enzo Fernandez", "England"], 5],
    ["Who won the Golden Ball in 2018?", "2018", ["Luka Modric"], 1]
  ]) {
    await touchPage.locator("#scout-reset").click();
    await ballBoyInput.fill(question);
    await ballBoySend.click();
    await touchPage.locator(".scout-answer.is-tournament-awards").waitFor({ state: "visible" });
    const awardMetrics = await touchPage.evaluate(() => {
      const answer = [...document.querySelectorAll(".scout-answer.is-tournament-awards")].at(-1);
      return {
        followUps: answer.querySelectorAll(".scout-followup").length,
        names: [...answer.querySelectorAll(".scout-tournament-award-row strong")].map((item) => item.textContent.trim()),
        overflow: answer.scrollWidth - answer.clientWidth,
        rows: answer.querySelectorAll(".scout-tournament-award-row").length,
        sources: answer.querySelectorAll(".scout-tournament-sources a").length,
        year: answer.querySelector(".scout-tournament-card-header > div > span")?.textContent.trim() || ""
      };
    });
    assert(
      awardMetrics.year === expectedYear &&
        awardMetrics.rows === expectedRows &&
        expectedNames.every((name) => awardMetrics.names.includes(name)) &&
        awardMetrics.sources >= 1 &&
        awardMetrics.followUps >= 2 &&
        awardMetrics.followUps <= 3 &&
        awardMetrics.overflow <= 1,
      `Ball Boy should answer "${question}" with verified, edition-aware award rows. Measured ${JSON.stringify(awardMetrics)}.`
    );
  }

  for (const [question, expected] of [
    ["How far did Argentina go in 2026?", { finish: "Runners-up", fragment: "with a 7-0-1 record." }],
    ["How far did Brazil go in 2022?", { finish: "Quarter-finals", fragment: "with a 3-1-1 record." }]
  ]) {
    await touchPage.locator("#scout-reset").click();
    await ballBoyInput.fill(question);
    await ballBoySend.click();
    await touchPage.locator(".scout-answer.is-country").waitFor({ state: "visible" });
    const finishMetrics = await touchPage.evaluate(() => {
      const answer = [...document.querySelectorAll(".scout-answer.is-country")].at(-1);
      return {
        finish: answer.querySelector(".scout-tournament-finish strong")?.textContent.trim() || "",
        followUps: answer.querySelectorAll(".scout-followup").length,
        lead: answer.querySelector(".scout-answer-lead")?.textContent.trim() || "",
        overflow: answer.scrollWidth - answer.clientWidth
      };
    });
    assert(
      finishMetrics.finish === expected.finish &&
        finishMetrics.lead.includes(expected.fragment) &&
        finishMetrics.followUps >= 2 &&
        finishMetrics.followUps <= 3 &&
        finishMetrics.overflow <= 1,
      `Ball Boy should answer "${question}" with that team's edition finish and record. Measured ${JSON.stringify(finishMetrics)}.`
    );
  }

  for (const [question, expected] of [
    ["Summarize the 2026 World Cup", { goals: "308", matches: "104", winner: "Spain", year: "2026" }],
    ["Summarize the 2022 World Cup", { goals: "172", matches: "64", winner: "Argentina", year: "2022" }]
  ]) {
    await touchPage.locator("#scout-reset").click();
    await ballBoyInput.fill(question);
    await ballBoySend.click();
    await touchPage.locator(".scout-answer.is-tournament-wrap").waitFor({ state: "visible" });
    const wrapMetrics = await touchPage.evaluate(() => {
      const answer = [...document.querySelectorAll(".scout-answer.is-tournament-wrap")].at(-1);
      const stats = [...answer.querySelectorAll(".scout-tournament-stat-strip strong")].map((item) => item.textContent.trim());
      return {
        awards: answer.querySelectorAll(".scout-tournament-award-row").length,
        followUps: answer.querySelectorAll(".scout-followup").length,
        overflow: answer.scrollWidth - answer.clientWidth,
        stats,
        winner: answer.querySelector(".scout-tournament-card-header strong")?.textContent.trim() || "",
        year: answer.querySelector(".scout-tournament-card-header > div > span")?.textContent.trim() || ""
      };
    });
    assert(
      wrapMetrics.year === expected.year &&
        wrapMetrics.winner === expected.winner &&
        JSON.stringify(wrapMetrics.stats) === JSON.stringify([expected.matches, expected.goals]) &&
        wrapMetrics.awards === 5 &&
        wrapMetrics.followUps >= 2 &&
        wrapMetrics.followUps <= 3 &&
        wrapMetrics.overflow <= 1,
      `Ball Boy should answer "${question}" with a complete edition wrap card. Measured ${JSON.stringify(wrapMetrics)}.`
    );
  }

  await touchPage.locator("#scout-reset").click();
  await ballBoyInput.fill("purple bananas");
  await ballBoySend.click();
  await touchPage.locator(".scout-answer.is-unknown").waitFor({ state: "visible" });
  const unknownBallBoyMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer")].at(-1);
    const promptItems = [...answer.querySelectorAll("[data-scout-prompt]")];
    const prompts = promptItems.map((item) => item.dataset.scoutPrompt.trim().toLowerCase());
    const reportControl = promptItems[0];
    return {
      decorationCount: answer.querySelectorAll(".scout-answer-type, .scout-unknown-mark").length,
      overflow: answer.scrollWidth - answer.clientWidth,
      promptCount: prompts.length,
      prompts,
      promptUniqueCount: new Set(prompts).size,
      reportIsButton: reportControl?.tagName === "BUTTON",
      text: answer.querySelector(".scout-answer-lead")?.textContent.trim() || ""
    };
  });
  assert(
    unknownBallBoyMetrics.decorationCount === 0 &&
      unknownBallBoyMetrics.text === "I didn’t understand that. Try a player, team, match, or rule." &&
      unknownBallBoyMetrics.promptCount === 3 &&
      unknownBallBoyMetrics.promptCount === unknownBallBoyMetrics.promptUniqueCount &&
      unknownBallBoyMetrics.prompts[0] === "report issue" &&
      unknownBallBoyMetrics.reportIsButton &&
      unknownBallBoyMetrics.overflow <= 1,
    `Ball Boy's fallback should stay direct without an answer-type pill or decorative face. Measured ${JSON.stringify(unknownBallBoyMetrics)}.`
  );
  await touchPage
    .locator('.scout-answer.is-unknown [data-scout-prompt="Report issue"]')
    .last()
    .click();
  await touchPage.locator(".scout-answer.is-report-issue").last().waitFor({ state: "visible" });
  const reportIssueBallBoyMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer.is-report-issue")].at(-1);
    const cta = answer?.querySelector(".scout-settings-report");
    return {
      ctaHref: cta?.getAttribute("href") || "",
      ctaText: cta?.textContent.trim() || "",
      lead: answer?.querySelector(".scout-answer-lead")?.textContent.trim() || ""
    };
  });
  assert(
    reportIssueBallBoyMetrics.lead === "Here is the form to report issue." &&
      reportIssueBallBoyMetrics.ctaText === "Report issue" &&
      reportIssueBallBoyMetrics.ctaHref.startsWith("report.html?"),
    `Ball Boy should introduce the report form before showing its CTA. Measured ${JSON.stringify(reportIssueBallBoyMetrics)}.`
  );

  await touchPage.setViewportSize({ width: 568, height: 320 });
  await touchPage.waitForTimeout(450);
  const shortBallBoyMetrics = await touchPage.evaluate(() => {
    const conversation = document.querySelector("#scout-conversation")?.getBoundingClientRect();
    const widget = document.querySelector("#scout-widget")?.getBoundingClientRect();
    return {
      conversationHeight: conversation?.height || 0,
      headerButtonWidths: [...document.querySelectorAll(".scout-reset, .scout-close")]
        .map((button) => button.getBoundingClientRect().width),
      inputFont: Number.parseFloat(getComputedStyle(document.querySelector("#scout-input")).fontSize),
      widget: widget ? { bottom: widget.bottom, left: widget.left, right: widget.right, top: widget.top } : null
    };
  });
  assert(
    shortBallBoyMetrics.conversationHeight >= 100 &&
      shortBallBoyMetrics.headerButtonWidths.every((width) => width >= 40) &&
      shortBallBoyMetrics.inputFont >= 16 &&
      shortBallBoyMetrics.widget?.left >= 0 &&
      shortBallBoyMetrics.widget?.top >= 0 &&
      shortBallBoyMetrics.widget?.right <= 568 &&
      shortBallBoyMetrics.widget?.bottom <= 320,
    `Ball Boy's short landscape layout should preserve usable conversation and controls. Measured ${JSON.stringify(shortBallBoyMetrics)}.`
  );

  await touchPage.setViewportSize({ width: 390, height: 844 });
  await touchPage.goto(`${baseUrl}?ballBoySmoke=1&lang=zh`, { waitUntil: "load" });
  await touchPage.waitForFunction(
    () => document.documentElement.lang === "zh-Hans" && document.querySelector(".scout-title")?.textContent === "球童"
  );
  await touchPage.locator("#scout-launcher").click();
  const zhBallBoyInput = touchPage.locator("#scout-input");
  const zhBallBoySend = touchPage.locator(".scout-send");
  const zhBallBoyShell = await touchPage.evaluate(() => ({
    chatAria: document.querySelector("#scout-panel")?.getAttribute("aria-label") || "",
    closeAria: document.querySelector("#scout-close")?.getAttribute("aria-label") || "",
    initial: document.querySelector("#scout-messages")?.innerText.replace(/\s+/g, " ").trim() || "",
    inputAria: document.querySelector("label[for='scout-input']")?.textContent.trim() || "",
    openAria: document.querySelector("#scout-launcher")?.getAttribute("aria-label") || "",
    placeholder: document.querySelector("#scout-input")?.getAttribute("placeholder") || "",
    prompts: [...document.querySelectorAll("#scout-suggestions [data-scout-prompt]")]
      .map((button) => button.dataset.scoutPrompt),
    resetAria: document.querySelector("#scout-reset")?.getAttribute("aria-label") || "",
    sendAria: document.querySelector(".scout-send")?.getAttribute("aria-label") || "",
    status: document.querySelector(".scout-status")?.textContent.trim() || "",
    suggestionsAria: document.querySelector("#scout-suggestions")?.getAttribute("aria-label") || "",
    title: document.querySelector(".scout-title")?.textContent.trim() || ""
  }));
  assert(
    zhBallBoyShell.title === "球童" &&
      zhBallBoyShell.status === "问我足球问题" &&
      zhBallBoyShell.initial === "球童 你可以问我球员、国家队、比赛或规则。" &&
      zhBallBoyShell.openAria === "打开球童聊天" &&
      zhBallBoyShell.chatAria === "球童聊天窗口" &&
      zhBallBoyShell.resetAria === "开始新对话" &&
      zhBallBoyShell.closeAria === "关闭球童聊天" &&
      zhBallBoyShell.suggestionsAria === "推荐问题" &&
      zhBallBoyShell.inputAria === "向球童提问" &&
      zhBallBoyShell.placeholder === "问一个足球问题…" &&
      zhBallBoyShell.sendAria === "发送问题" &&
      JSON.stringify(zhBallBoyShell.prompts) === JSON.stringify([
        "解释越位",
        "谁赢了？",
        "阿根廷怎么踢？",
        "报告问题"
      ]) &&
      (await zhBallBoySend.isDisabled()),
    `Chinese Ball Boy shell, curated prompts, and accessibility copy should render together. Measured ${JSON.stringify(zhBallBoyShell)}.`
  );

  await zhBallBoyInput.fill("解释越位");
  assert(!(await zhBallBoySend.isDisabled()), "Chinese Ball Boy send should enable after text is entered.");
  await zhBallBoySend.click();
  await touchPage.locator(".scout-answer.is-offside").waitFor({ state: "visible" });
  const zhOffsideBallBoyMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer")].at(-1);
    return {
      imageLabels: [...answer.querySelectorAll('[role="img"]')].map((item) => item.getAttribute("aria-label") || ""),
      overflow: answer.scrollWidth - answer.clientWidth,
      source: answer.querySelector(".scout-source-link")?.textContent.trim() || "",
      text: answer.innerText.replace(/\s+/g, " ").trim()
    };
  });
  assert(
      !zhOffsideBallBoyMetrics.text.includes("只看一个时刻") &&
      !zhOffsideBallBoyMetrics.text.includes("进攻方向") &&
      zhOffsideBallBoyMetrics.text.includes("P传球时，A已经越过越位线") &&
      zhOffsideBallBoyMetrics.text.includes("P传球时，A与越位线平行") &&
      zhOffsideBallBoyMetrics.source === "阅读IFAB官方规则 ↗" &&
      zhOffsideBallBoyMetrics.imageLabels.length >= 2 &&
      zhOffsideBallBoyMetrics.imageLabels.every((label) => /越位示例|不越位示例/.test(label)) &&
      !/The one check|Offside example|Onside example|Read the official/.test(zhOffsideBallBoyMetrics.text) &&
      zhOffsideBallBoyMetrics.overflow <= 1,
    `Chinese Ball Boy offside answer should be visual, concise, accessible, and fully localized. Measured ${JSON.stringify(zhOffsideBallBoyMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await zhBallBoyInput.fill("介绍一下姆巴佩");
  await zhBallBoySend.click();
  await touchPage.getByRole("heading", { name: "基利安·姆巴佩" }).waitFor({ state: "visible" });
  const zhPlayerBallBoyMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer")].at(-1);
    const card = answer.querySelector(".scout-player-card");
    const noteBlock = [...card.querySelectorAll(".scout-explainer")].at(-1);
    return {
      lead: answer.querySelector(".scout-answer-lead")?.textContent.trim() || "",
      labels: [...card.querySelectorAll(".scout-section-label")].map((item) => item.textContent.trim()),
      noteBullets: [...(noteBlock?.querySelectorAll(".scout-player-watch-points li") || [])]
        .map((item) => item.textContent.trim()),
      overflow: card.scrollWidth - card.clientWidth,
      text: card.innerText.replace(/\s+/g, " ").trim(),
      valueLabel: card.querySelector(".is-value .scout-value-label")?.textContent.trim() || "",
      worldCupAria: card.querySelector(".scout-player-facts")?.getAttribute("aria-label") || ""
    };
  });
  assert(
    zhPlayerBallBoyMetrics.lead === "下面是更多关于基利安·姆巴佩的信息。" &&
      zhPlayerBallBoyMetrics.text.includes("基利安·姆巴佩") &&
      zhPlayerBallBoyMetrics.text.includes("法国") &&
      zhPlayerBallBoyMetrics.labels.includes("本届世界杯") &&
      zhPlayerBallBoyMetrics.labels.includes("球员资料") &&
      !zhPlayerBallBoyMetrics.labels.includes("常见活动区域") &&
      !zhPlayerBallBoyMetrics.labels.includes("新手版") &&
      zhPlayerBallBoyMetrics.labels.includes("标志性特点") &&
      zhPlayerBallBoyMetrics.noteBullets.length === 3 &&
      zhPlayerBallBoyMetrics.noteBullets.every((bullet) => bullet.length >= 16) &&
      !/[A-Za-z]/.test(zhPlayerBallBoyMetrics.noteBullets.join(" ")) &&
      zhPlayerBallBoyMetrics.valueLabel === "身价（巅峰 €200m）" &&
      zhPlayerBallBoyMetrics.worldCupAria === "世界杯数据和球员资料" &&
      !/This World Cup|Player details|Usual role zone|Beginner version|Signature traits/.test(zhPlayerBallBoyMetrics.text) &&
      zhPlayerBallBoyMetrics.overflow <= 1,
    `Chinese Ball Boy player cards should localize their complete content and accessibility labels. Measured ${JSON.stringify(zhPlayerBallBoyMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await zhBallBoyInput.fill("介绍一下Abduvohid Nematov");
  await zhBallBoySend.click();
  await touchPage.getByRole("heading", { name: "阿卜杜沃希德·内马托夫" }).waitFor({ state: "visible" });
  const zhNematovCard = await touchPage.evaluate(() => {
    const card = [...document.querySelectorAll(".scout-answer.is-player")].at(-1)?.querySelector(".scout-player-card");
    return {
      club: card?.querySelector(".scout-entity-copy small")?.textContent.trim() || "",
      overflow: card ? card.scrollWidth - card.clientWidth : null,
      text: card?.innerText.replace(/\s+/g, " ").trim() || ""
    };
  });
  assert(
    zhNematovCard.club === "纳萨夫 (乌兹别克斯坦超级联赛)" &&
      !/Nasaf|Uzbekistan Super League/.test(zhNematovCard.text) &&
      zhNematovCard.overflow <= 1,
    `Chinese Ball Boy should localize less prominent player, club, and league names on the complete card. Measured ${JSON.stringify(zhNematovCard)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await zhBallBoyInput.fill("阿根廷怎么踢？");
  await zhBallBoySend.click();
  await touchPage.locator(".scout-answer.is-country").waitFor({ state: "visible" });
  const zhCountryBallBoyMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer")].at(-1);
    const card = answer.querySelector(".scout-country-card");
    return {
      cardClass: card.className,
      fixtures: card.querySelectorAll(".scout-compact-fixture").length,
      keyPlayers: card.querySelectorAll(".scout-key-players").length,
      lead: answer.querySelector(".scout-answer-lead")?.textContent.replace(/\s+/g, " ").trim() || "",
      meta: card.querySelector(".scout-country-header p")?.textContent.replace(/\s+/g, " ").trim() || "",
      overflow: card.scrollWidth - card.clientWidth,
      record: card.querySelectorAll(".scout-stat-strip").length,
      text: card.innerText.replace(/\s+/g, " ").trim()
    };
  });
  assert(
    zhCountryBallBoyMetrics.text.includes("阿根廷") &&
      zhCountryBallBoyMetrics.cardClass.includes("is-focus-style") &&
      zhCountryBallBoyMetrics.text.includes("他们怎么踢") &&
      zhCountryBallBoyMetrics.meta.includes("FIFA排名第1（2026）") &&
      zhCountryBallBoyMetrics.lead.includes("胡利安·阿尔瓦雷斯负责带动逼抢") &&
      zhCountryBallBoyMetrics.lead.includes("无球时，他们最需要阻止对手摆脱第一层逼抢后从中路快速反击") &&
      zhCountryBallBoyMetrics.keyPlayers === 0 &&
      zhCountryBallBoyMetrics.fixtures === 0 &&
      zhCountryBallBoyMetrics.record === 0 &&
      !/How they play|Key players|Last match|Next match/.test(zhCountryBallBoyMetrics.text) &&
      zhCountryBallBoyMetrics.overflow <= 1,
    `Chinese Ball Boy country-style answers should localize the focused visual without unrelated record, player, or fixture sections. Measured ${JSON.stringify(zhCountryBallBoyMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await zhBallBoyInput.fill("墨西哥有哪些球员值得关注？");
  await zhBallBoySend.click();
  await touchPage.locator(".scout-answer.is-player-list").waitFor({ state: "visible" });
  const zhWatchListBallBoyMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer")].at(-1);
    const cards = [...answer.querySelectorAll(".scout-watch-card")];
    return {
      cardCount: cards.length,
      countries: cards.map((card) => card.querySelector("small")?.textContent.trim() || ""),
      lead: answer.querySelector(".scout-answer-lead")?.textContent.trim() || "",
      overflow: answer.scrollWidth - answer.clientWidth
    };
  });
  assert(
    zhWatchListBallBoyMetrics.cardCount === 3 &&
      zhWatchListBallBoyMetrics.countries.every((country) => country.startsWith("墨西哥 · ")) &&
      zhWatchListBallBoyMetrics.lead.includes("三名墨西哥球员") &&
      zhWatchListBallBoyMetrics.overflow <= 1,
    `A generated Chinese country follow-up should round-trip to three players from that country. Measured ${JSON.stringify(zhWatchListBallBoyMetrics)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await zhBallBoyInput.fill("谁赢了挪威对英格兰？");
  await zhBallBoySend.click();
  await touchPage.locator(".scout-answer.is-match").waitFor({ state: "visible" });
  const zhMatchBallBoyMetrics = await touchPage.evaluate(() => {
    const answer = [...document.querySelectorAll(".scout-answer")].at(-1);
    const card = answer.querySelector(".scout-match-card");
    return {
      cardClass: card.className,
      overflow: card.scrollWidth - card.clientWidth,
      recap: card.querySelector(".scout-match-recap")?.innerText.replace(/\s+/g, " ").trim() || "",
      status: card.querySelector(".scout-match-meta")?.innerText.replace(/\s+/g, " ").trim() || "",
      text: card.innerText.replace(/\s+/g, " ").trim(),
      timelineCount: card.querySelectorAll(".scout-match-timeline").length
    };
  });
  assert(
    zhMatchBallBoyMetrics.text.includes("挪威") &&
      zhMatchBallBoyMetrics.text.includes("英格兰") &&
      zhMatchBallBoyMetrics.cardClass.includes("is-focus-result") &&
      zhMatchBallBoyMetrics.status.includes("加时赛后") &&
      zhMatchBallBoyMetrics.recap.includes("关键时刻") &&
      zhMatchBallBoyMetrics.timelineCount === 0 &&
      !/After extra time|What changed the match|Goal timeline/.test(zhMatchBallBoyMetrics.text) &&
      zhMatchBallBoyMetrics.overflow <= 1,
    `Chinese Ball Boy result cards should preserve extra-time semantics and structured Chinese key moments without an unrelated timeline. Measured ${JSON.stringify(zhMatchBallBoyMetrics)}.`
  );

  const zhMatchAnswerCount = await touchPage.locator(".scout-answer.is-match").count();
  await touchPage
    .locator('.scout-answer.is-match [data-scout-prompt="挪威对英格兰是谁进球？"]')
    .click();
  await touchPage.waitForFunction(
    (count) => document.querySelectorAll(".scout-answer.is-match").length === count + 1,
    zhMatchAnswerCount
  );
  assert(
    (await touchPage.locator(".scout-answer.is-match").count()) === zhMatchAnswerCount + 1 &&
      (await touchPage.locator(".scout-answer.is-country").count()) === 0 &&
      (await touchPage.locator(".scout-answer.is-match").last().locator(".scout-match-card.is-focus-scorers").count()) === 1 &&
      (await touchPage.locator(".scout-answer.is-match").last().locator(".scout-goal-row").count()) === 3,
    "The generated Chinese scorer follow-up should remain a match intent instead of becoming a country card."
  );

  await touchPage.locator("#scout-reset").click();
  await zhBallBoyInput.fill("你是谁？");
  await zhBallBoySend.click();
  await touchPage.locator(".scout-message.is-assistant.is-personality").waitFor({ state: "visible" });
  const zhPersonalityText = await touchPage
    .locator(".scout-message.is-assistant.is-personality > p:not(.scout-speaker)")
    .textContent();
  assert(
    zhPersonalityText.trim() === "我是球童。我把足球讲明白。" &&
      !/哈兰德|挪威|可疑|无可奉告/.test(zhPersonalityText),
    `Ball Boy's Chinese identity should be direct and free of the retired Haaland disguise. Measured ${JSON.stringify(zhPersonalityText)}.`
  );

  await touchPage.locator("#scout-close").click();
  await touchPage.locator("#settings-button").click();
  await touchPage.locator("#language-select").selectOption("en");
  await touchPage.waitForFunction(
    () =>
      document.documentElement.lang === "en" &&
      document.querySelector("#language-select")?.disabled === false &&
      document.querySelector(".scout-title")?.textContent === "Ball Boy" &&
      document.querySelector(".scout-message.is-assistant.is-personality > p:not(.scout-speaker)")?.textContent.includes("I’m Ball Boy.")
  );
  if (await touchPage.locator("#settings-popover").isVisible()) {
    await touchPage.locator("#settings-button").click();
  }
  await touchPage.locator("#scout-launcher").click();
  const englishRerenderedBallBoy = await touchPage.evaluate(() => ({
    answer: document.querySelector(".scout-message.is-assistant.is-personality > p:not(.scout-speaker)")?.textContent.trim() || "",
    initialUserQuestion: document.querySelector(".scout-message.is-user")?.textContent.trim() || "",
    status: document.querySelector(".scout-status")?.textContent.trim() || ""
  }));
  assert(
    englishRerenderedBallBoy.answer ===
      "I’m Ball Boy. I make football easier to understand." &&
      englishRerenderedBallBoy.initialUserQuestion === "你是谁？" &&
      englishRerenderedBallBoy.status === "Ask me about football",
    `Language switching should rebuild the existing Ball Boy answer in English without losing the turn. Measured ${JSON.stringify(englishRerenderedBallBoy)}.`
  );

  await touchPage.locator("#scout-close").click();
  await touchPage.locator("#settings-button").click();
  await touchPage.locator("#language-select").selectOption("zh");
  await touchPage.waitForFunction(
    () =>
      document.documentElement.lang === "zh-Hans" &&
      document.querySelector("#language-select")?.disabled === false &&
      document.querySelector(".scout-title")?.textContent === "球童" &&
      document.querySelector(".scout-message.is-assistant.is-personality > p:not(.scout-speaker)")?.textContent.includes("我是球童。")
  );
  if (await touchPage.locator("#settings-popover").isVisible()) {
    await touchPage.locator("#settings-button").click();
  }
  await touchPage.locator("#scout-launcher").click();
  await touchPage.waitForTimeout(450);
  const chineseRerenderedBallBoy = await touchPage.evaluate(() => ({
    answer: document.querySelector(".scout-message.is-assistant.is-personality > p:not(.scout-speaker)")?.textContent.trim() || "",
    status: document.querySelector(".scout-status")?.textContent.trim() || "",
    widgetOpen: document.querySelector("#scout-widget")?.classList.contains("is-open") || false,
    widgetOverflow: document.querySelector("#scout-widget")?.scrollWidth - document.querySelector("#scout-widget")?.clientWidth
  }));
  assert(
    chineseRerenderedBallBoy.answer === "我是球童。我把足球讲明白。" &&
      chineseRerenderedBallBoy.status === "问我足球问题" &&
      chineseRerenderedBallBoy.widgetOpen &&
      chineseRerenderedBallBoy.widgetOverflow <= 1,
    `Switching back to Chinese should rebuild the same turn and keep the mobile widget unclipped. Measured ${JSON.stringify(chineseRerenderedBallBoy)}.`
  );
  await touchPage.goto(`${baseUrl}?ballBoySmoke=1&lang=en`, { waitUntil: "load" });
  await touchPage.waitForFunction(
    () =>
      document.documentElement.lang === "en" &&
      document.querySelector(".scout-title")?.textContent === "Ball Boy"
  );
  const explicitEnglishBallBoyLocale = await touchPage.evaluate(() => ({
    launcher: document.querySelector("#scout-launcher")?.getAttribute("aria-label") || "",
    saved: localStorage.getItem("world-cup-simplified-language") || "",
    status: document.querySelector(".scout-status")?.textContent.trim() || ""
  }));
  assert(
    explicitEnglishBallBoyLocale.launcher === "Open Ball Boy" &&
      explicitEnglishBallBoyLocale.saved === "en" &&
      explicitEnglishBallBoyLocale.status === "Ask me about football",
    `An explicit English URL should override the previously saved Chinese locale during Ball Boy initialization. Measured ${JSON.stringify(explicitEnglishBallBoyLocale)}.`
  );

  const availableTimeZoneCheck = await touchPage.locator("#timezone-select option").evaluateAll((options) => ({
    count: options.length,
    values: options.map((option) => option.value)
  }));
  assert(
    availableTimeZoneCheck.count >= 300 &&
      ["Asia/Tokyo", "America/Phoenix", "Pacific/Auckland", "Australia/Brisbane"]
        .every((timeZone) => availableTimeZoneCheck.values.includes(timeZone)),
    `Settings should derive hundreds of canonical IANA time zones from the browser. Measured ${JSON.stringify({ count: availableTimeZoneCheck.count, samples: availableTimeZoneCheck.values.filter((value) => ["Asia/Tokyo", "America/Phoenix", "Pacific/Auckland", "Australia/Brisbane"].includes(value)) })}.`
  );

  await touchPage.locator("#scout-launcher").click();
  const timeZoneBallBoyInput = touchPage.locator("#scout-input");
  const timeZoneBallBoySend = touchPage.locator(".scout-send");
  await timeZoneBallBoyInput.fill("change timezone");
  await timeZoneBallBoySend.click();
  await touchPage.getByText(
    "Which time zone would you like to use? You can also change it from the Settings icon in the top right.",
    { exact: true }
  ).waitFor({ state: "visible" });
  await timeZoneBallBoyInput.fill("USA");
  await timeZoneBallBoySend.click();
  await touchPage.getByText("Which United States time zone?", { exact: true }).waitFor({ state: "visible" });
  const unitedStatesChoices = await touchPage.locator("[data-scout-setting-value]").evaluateAll((buttons) =>
    buttons.map((button) => ({ label: button.textContent.trim(), value: button.dataset.scoutSettingValue }))
  );
  assert(
    ["America/Los_Angeles", "America/Chicago", "America/New_York"]
      .every((timeZone) => unitedStatesChoices.some((choice) => choice.value === timeZone)) &&
      !(await touchPage.locator(".scout-answer.is-country").count()),
    `A country-only answer to Ball Boy's pending timezone question should offer that country's time zones instead of becoming a football country card. Measured ${JSON.stringify(unitedStatesChoices)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await touchPage.locator("#timezone-select").evaluate((select) => {
    select.value = "Asia/Tokyo";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await timeZoneBallBoyInput.fill("change timezone");
  await timeZoneBallBoySend.click();
  await touchPage.getByText(
    "Which time zone would you like to use? You can also change it from the Settings icon in the top right.",
    { exact: true }
  ).waitFor({ state: "visible" });
  await timeZoneBallBoyInput.fill("PDT");
  await timeZoneBallBoySend.click();
  const pdtAction = touchPage.locator('[data-scout-setting-value="America/Los_Angeles"]');
  await pdtAction.waitFor({ state: "visible" });
  assert(
    (await pdtAction.count()) === 1 && !(await touchPage.locator(".scout-answer.is-country").count()),
    "A PDT reply to the pending timezone question should resolve to America/Los_Angeles."
  );

  await touchPage.locator("#scout-reset").click();
  await timeZoneBallBoyInput.fill("change timezone to AEDT");
  await timeZoneBallBoySend.click();
  const aedtAction = touchPage.locator('[data-scout-setting-value="Australia/Sydney"]');
  await aedtAction.waitFor({ state: "visible" });
  assert(
    (await aedtAction.count()) === 1,
    "Ball Boy should recognize a common international timezone abbreviation such as AEDT."
  );

  await touchPage.locator("#scout-reset").click();
  await timeZoneBallBoyInput.fill("change timezone to UTC");
  await timeZoneBallBoySend.click();
  const utcAction = touchPage.locator('[data-scout-setting-value="UTC"]');
  await utcAction.waitFor({ state: "visible" });
  assert(
    (await utcAction.count()) === 1,
    "Ball Boy should resolve UTC and GMT to a real UTC setting instead of a seasonal city timezone."
  );

  await touchPage.locator("#scout-reset").click();
  await timeZoneBallBoyInput.fill("timezone to Phoenix");
  await timeZoneBallBoySend.click();
  const phoenixAction = touchPage.locator('[data-scout-setting-value="America/Phoenix"]');
  await phoenixAction.waitFor({ state: "visible" });
  assert(
    (await phoenixAction.count()) === 1,
    "Ball Boy should derive Phoenix from the browser's canonical IANA city list."
  );

  await touchPage.locator("#scout-reset").click();
  await timeZoneBallBoyInput.fill("change timezone to Australia");
  await timeZoneBallBoySend.click();
  await touchPage.getByText("Which Australian time zone?", { exact: true }).waitFor({ state: "visible" });
  const australianChoices = await touchPage.locator("[data-scout-setting-value]").evaluateAll((buttons) =>
    buttons.map((button) => ({ label: button.textContent.trim(), value: button.dataset.scoutSettingValue }))
  );
  assert(
    ["Australia/Sydney", "Australia/Brisbane", "Australia/Perth"]
      .every((timeZone) => australianChoices.some((choice) => choice.value === timeZone)) &&
      australianChoices.some((choice) => choice.label === "Sydney") &&
      australianChoices.some((choice) => choice.label === "Brisbane") &&
      australianChoices.some((choice) => choice.label === "Perth"),
    `An ambiguous country should offer concise major-city choices. Measured ${JSON.stringify(australianChoices)}.`
  );
  await touchPage.locator('[data-scout-setting-value="Australia/Brisbane"]').click();
  await touchPage.getByText(/Time zone changed to Australia\/Brisbane/).waitFor({ state: "visible" });
  const australiaHistoryText = await touchPage.locator("#scout-messages").innerText();
  assert(
    australiaHistoryText.includes("change timezone to Australia") &&
      australiaHistoryText.includes("Which Australian time zone?") &&
      australiaHistoryText.includes("Time zone changed to Australia/Brisbane"),
    `Selecting a country choice should append its result without rewriting chat history. Measured ${JSON.stringify(australiaHistoryText)}.`
  );

  await touchPage.locator("#scout-reset").click();
  await timeZoneBallBoyInput.fill("change timezone to Springfield");
  await timeZoneBallBoySend.click();
  await touchPage.getByText(
    "I couldn’t match “Springfield” to one time zone. Try a nearby major city or choose from Settings.",
    { exact: true }
  ).waitFor({ state: "visible" });
  const unmatchedTimeZoneActions = await touchPage.locator(".scout-settings-actions").last().innerText();
  assert(
    unmatchedTimeZoneActions.includes("Open Settings") && unmatchedTimeZoneActions.includes("Report issue"),
    `An unmatched location should offer Settings before escalating to a report. Measured ${JSON.stringify(unmatchedTimeZoneActions)}.`
  );
  await touchPage.locator("[data-scout-open-settings]").click();
  assert(
    await touchPage.locator("#settings-popover").isVisible(),
    "Ball Boy's Open Settings action should reveal the real timezone picker."
  );
  await touchContext.close();

  console.log("UI smoke tests passed.");
} catch (error) {
  reportGithubActionsError("UI smoke failed", error);
  throw error;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
