#!/usr/bin/env node
import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
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
  [".svg", "image/svg+xml; charset=utf-8"],
  [".webp", "image/webp"]
]);

function safeFilePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl || "/", "http://127.0.0.1").pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const resolved = path.resolve(root, relative);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}

const server = createServer(async (request, response) => {
  try {
    let filePath = safeFilePath(request.url);
    if (!filePath) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const metadata = await stat(filePath);
    if (metadata.isDirectory()) filePath = path.join(filePath, "index.html");
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": mimeTypes.get(path.extname(filePath)) || "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}/`;
const browser = await chromium.launch({ args: ["--blink-settings=imagesEnabled=false"] });

async function openFixture(page, { date, fixtureId, language = "en" }) {
  await page.goto(
    `${baseUrl}?view=matches&date=${date}&lang=${language}&tz=America%2FLos_Angeles`,
    { waitUntil: "load" }
  );
  const row = page.locator(`[data-match-id="${fixtureId}"]`);
  await row.waitFor({ state: "visible" });
  await row.click();
  await page.locator("#match-info:not([hidden]) .key-info-grid").waitFor({ state: "visible" });
  return page.locator("#match-info .key-info-team p").allInnerTexts();
}

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  desktop.setDefaultTimeout(30_000);

  const finalCopy = await openFixture(desktop, {
    date: "2026-07-19",
    fixtureId: "match-104-final-2026-07-19"
  });
  assert.equal(finalCopy.length, 2);
  assert.match(finalCopy[0], /Spain are 6-1-0 with a goal balance of 13–1/);
  assert.match(finalCopy[0], /FIFA's revised layout, published after kickoff.*4-1-2-3/);
  assert.match(finalCopy[0], /Lamine Yamal starts on Spain's right opposite Nicolas Tagliafico on Argentina's left/);
  assert.match(finalCopy[0], /Rodri/);
  assert.match(finalCopy[0], /Lamine Yamal/);
  assert.doesNotMatch(finalCopy[0], /\b(?:Pedri|Nico Williams)\b/);
  assert.match(finalCopy[1], /Argentina/);
  assert.doesNotMatch(finalCopy.join(" "), /must test|contest central space|tracks .*runs|connect the phases/i);
  assert((await desktop.locator("#match-info .key-info-team .player-link").count()) >= 10);

  const italyBrazil = await openFixture(desktop, {
    date: "1982-07-05",
    fixtureId: "wc-1982-1982-07-05-matchday-6-italy-brazil"
  });
  assert(
    italyBrazil.some((copy) => /Italy must (?:win|beat Brazil).*reach the semi-finals/i.test(copy)),
    `Rendered Italy-Brazil copy must preserve Italy's win requirement: ${JSON.stringify(italyBrazil)}`
  );
  assert(
    italyBrazil.some((copy) => /Brazil need only a draw .*reach the semi-finals/i.test(copy)),
    `Rendered Italy-Brazil copy must preserve Brazil's draw requirement: ${JSON.stringify(italyBrazil)}`
  );
  assert(italyBrazil.every((copy) => copy.split(/(?<=[.!?])\s+/u).filter(Boolean).length === 4));
  assert.doesNotMatch(italyBrazil.join(" "), /Briegel.*Maradona|Kohler.*Maradona|tracks .*runs/i);

  const reviewed2002Checks = {
    es: [/Suecia llega con 4 puntos tras 2 partidos/, /ganar o empatar garantiza los octavos de final/, /Argentina llega con 3 puntos tras 2 partidos/, /empatar exige que Nigeria venza a Inglaterra/],
    ko: [/스웨덴.*2경기 4점/, /승리하거나 비기면 16강 진출이 확정/, /아르헨티나.*2경기 3점/, /나이지리아의 잉글랜드전 승리/],
    zh: [/瑞典2场4分/, /胜或平即可确保十六强席位/, /阿根廷2场3分/, /尼日利亚击败英格兰/]
  };
  for (const [language, patterns] of Object.entries(reviewed2002Checks)) {
    const copy = (await openFixture(desktop, {
      date: "2002-06-12",
      fixtureId: "wc-2002-2002-06-12-matchday-3-sweden-argentina",
      language
    })).join(" ");
    for (const pattern of patterns) {
      assert.match(copy, pattern, `${language} must preserve the reviewed Sweden-Argentina 2002 qualification scenario`);
    }
  }

  const scotland = await openFixture(desktop, {
    date: "1958-06-08",
    fixtureId: "wc-1958-1958-06-08-matchday-1-yugoslavia-scotland"
  });
  assert(scotland.some((copy) => copy.includes("Scotland") && copy.includes("Dawson Walker")));
  assert.equal(
    await desktop.locator("#match-info .key-info-team p .player-link", { hasText: "Dawson Walker" }).count(),
    0
  );

  const localizedFinal = await openFixture(desktop, {
    date: "2026-07-19",
    fixtureId: "match-104-final-2026-07-19",
    language: "zh"
  });
  assert(localizedFinal.some((copy) => copy.includes("西班牙") && copy.includes("开球后发布的修订版官方战术站位显示4-1-2-3阵型")));
  assert(localizedFinal.some((copy) => copy.includes("面对阿根廷")));
  assert(localizedFinal.every((copy) => copy.includes("阵型对照") && copy.includes("官方首发布置") && copy.includes("首发结构")));
  assert.doesNotMatch(localizedFinal.join(" "), /结构性风险/);
  assert.doesNotMatch(localizedFinal.join(" "), /Against |They want|The risk is/);

  const unsupportedModelFallback = await desktop.evaluate(() => {
    const hook = window.__worldCupTestHooks?.localization?.formatStructuredKeyInformation;
    return hook?.(
      { version: 99, kind: "future", slots: {} },
      { id: "ESP", name: "Spain" },
      { id: "ARG", name: "Argentina" }
    );
  });
  assert.equal(unsupportedModelFallback, "");

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.setDefaultTimeout(30_000);
  await openFixture(mobile, {
    date: "1950-07-16",
    fixtureId: "wc-1950-1950-07-16-final-round-uruguay-brazil"
  });
  const mobileMetrics = await mobile.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    cards: [...document.querySelectorAll("#match-info .key-info-team")].map((card) => {
      const bounds = card.getBoundingClientRect();
      return { left: bounds.left, right: bounds.right, width: bounds.width };
    })
  }));
  assert(mobileMetrics.bodyScrollWidth <= mobileMetrics.viewportWidth + 1);
  assert.equal(mobileMetrics.cards.length, 2);
  assert(mobileMetrics.cards.every((card) => card.left >= 0 && card.right <= mobileMetrics.viewportWidth + 1));

  await desktop.close();
  await mobile.close();
  console.log("Key information UI smoke passed for the 2026 final, reviewed 2002 ES/KO/ZH stakes, historical stakes, manager-link safety, Chinese v2 rendering, unknown-version fallback, and mobile layout.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
