#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;

try {
  ({ chromium } = require("playwright"));
} catch (error) {
  console.error("Playwright is required for locale smoke tests. Run pnpm install first.");
  console.error(error.message);
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ballBoyOnly = process.argv.includes("--ball-boy-only");
const requestedLocale = process.argv
  .find((argument) => argument.startsWith("--locale="))
  ?.slice("--locale=".length);
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".webp", "image/webp"]
]);

const localeCases = [
  {
    code: "es",
    htmlLang: "es-419",
    appName: "Mundial simplificado",
    matches: "Partidos",
    catchUp: "Ponte al día",
    catchUpDialog: "Resumen rápido",
    catchUpContentPattern: /\b(?:el|la|los|las|de|del|en|con|por|para|y|se)\b/iu,
    catchUpHeadline: "Argentina supera por la mínima a Inglaterra y llega a la final",
    catchUpBody: "La victoria 2-1 llevó a Argentina a la final.",
    catchUpDynamicPattern: /Bota de Oro/u,
    sourceNote: "Las fuentes exactas varían según el partido.",
    venue: "Estadio de Atlanta • Atlanta, Georgia, Estados Unidos",
    latestReleaseTitle:
      "Español y coreano, navegación histórica más rápida y controles más pulidos",
    adminLabel: "Nota del sitio",
    adminEmphasis: "Ya están definidos los cuartos de final",
    adminMessage:
      "Ya están definidos los cuartos de final: la campeona vigente Argentina, las excampeonas Francia, España e Inglaterra, y las aspirantes a un primer título Bélgica, Marruecos, Noruega y Suiza forman el cuadro de ocho.",
    semiFinal: "Semifinales",
    final: "Final",
    keyInformation: "Información clave",
    searchQuery: "Japón",
    searchTitle: "Japón",
    olderWorldCups: "Ver Mundiales anteriores",
    firstOrdinal: "1.º",
    playerName: "Julián Álvarez",
    playerPosition: "delantero",
    coachName: "Thomas Tuchel",
    coachRole: "Director técnico",
    coachTeam: "Inglaterra",
    ballBoyName: "Ball Boy",
    ballBoyStatus: "Pregúntame sobre fútbol",
    ballBoyIdentity: "Soy Ball Boy. Hago que el fútbol sea más fácil de entender.",
    ballBoyPlayerQuestion: "Háblame de Julian Alvarez",
    ballBoyTimeZonePrompt: "cambiar zona horaria",
    ballBoyTimeZoneRegion: "Estados Unidos",
    ballBoyTimeZoneLead: "¿Qué zona horaria de Estados Unidos?",
    ballBoyTimeZoneChoices: ["Los Ángeles", "Nueva York", "Phoenix"],
    lazyCurrentPlayerQuestion: "¿En qué club juega Harry Kane?",
    lazyCurrentPlayerName: "Harry Kane",
    lazyCurrentClub: "Bayern Munich",
    lazyCurrentLeague: "Bundesliga",
    lazyLoanPlayerQuestion: "¿En qué club juega Marcus Rashford?",
    lazyLoanPlayerName: "Marcus Rashford",
    lazyLoanClub: "Barcelona (cedido por Manchester United F.C., Manchester United)",
    lazyMissQuestion: "Háblame de Raúl",
    lazyRuleQuestion: "Explícame el fuera de juego",
    lazyHelpQuestion: "¿Qué puedo preguntar?",
    lazyCountryQuestion: "¿Cómo juega Argentina?",
    lazyMatchQuestion: "¿Quién ganó Francia vs España?",
    archivePlayerName: "Lionel Messi",
    archivePosition: "delantero",
    archiveClub: "Archivo del Mundial 2022 de Argentina",
    archiveStats: "Mundial 2022: 7 goles",
    archiveNote: "Messi controla el ataque con toques cortos",
    archiveVenue: "Lusail Iconic Stadium, Lusail",
    archiveStory: "para conquistar el Mundial de 2022",
    rejectedPlayerNotePatterns: [/\bparto\b/iu, /\bcontrapeso\b/iu],
    currentNotePlayerName: "Yoel Bárcenas",
    currentNote: "Varía la altura y la velocidad de sus centros",
    archiveRounds: ["Octavos de final", "Cuartos de final", "Semifinales", "Final"],
    report: {
      heading: "Reportar un problema",
      issue: "Alineación o información de jugadores",
      placeholder: "¿Qué debemos corregir?",
      submit: "Enviar reporte",
      back: "Volver"
    }
  },
  {
    code: "ko",
    htmlLang: "ko",
    appName: "월드컵 한눈에",
    matches: "경기",
    catchUp: "한눈에 보기",
    catchUpDialog: "경기 요약",
    catchUpContentPattern: /[가-힣]/u,
    catchUpHeadline: "아르헨티나가 잉글랜드를 한 골 차로 꺾고 결승에 올랐다",
    catchUpBody: "아르헨티나의 2-1 승리로 결승 진출이 확정됐다.",
    catchUpDynamicPattern: /골든부트/u,
    sourceNote: "경기별 세부 출처는 다를 수 있습니다.",
    venue: "애틀랜타 스타디움 • 미국 조지아주 애틀랜타",
    latestReleaseTitle: "스페인어·한국어 지원, 더 빠른 역대 기록 탐색과 세련된 조작",
    adminLabel: "운영자 알림",
    adminEmphasis: "8강 대진 확정",
    adminMessage:
      "8강 대진 확정: 디펜딩 챔피언 아르헨티나, 역대 우승국 프랑스·스페인·잉글랜드, 첫 우승에 도전하는 벨기에·모로코·노르웨이·스위스가 8강을 구성합니다.",
    semiFinal: "준결승",
    final: "결승",
    keyInformation: "핵심 정보",
    searchQuery: "일본",
    searchTitle: "일본",
    olderWorldCups: "이전 월드컵 보기",
    firstOrdinal: "1위",
    playerName: "훌리안 알바레스",
    playerPosition: "공격수",
    coachName: "토마스 투헬",
    coachRole: "감독",
    coachTeam: "잉글랜드",
    ballBoyName: "볼보이",
    ballBoyStatus: "축구에 관해 물어보세요",
    ballBoyIdentity: "저는 볼보이예요. 축구를 쉽게 설명합니다.",
    ballBoyPlayerQuestion: "훌리안 알바레스를 알려 줘",
    ballBoyTimeZonePrompt: "시간대 바꾸기",
    ballBoyTimeZoneRegion: "미국",
    ballBoyTimeZoneLead: "미국의 어느 시간대를 사용할까요?",
    ballBoyTimeZoneChoices: ["로스앤젤레스", "뉴욕", "피닉스"],
    lazyCurrentPlayerQuestion: "해리 케인의 클럽을 알려 줘",
    lazyCurrentPlayerName: "해리 케인",
    lazyCurrentClub: "바이에른 뮌헨",
    lazyCurrentLeague: "분데스리가",
    lazyLoanPlayerQuestion: "마커스 래시퍼드의 클럽을 알려 줘",
    lazyLoanPlayerName: "마커스 래시퍼드",
    lazyLoanClub: "바르셀로나(맨체스터 유나이티드 FC, 맨체스터 유나이티드에서 임대)",
    lazyMissQuestion: "라울 곤살레스를 알려 줘",
    lazyRuleQuestion: "오프사이드를 설명해 줘",
    lazyHelpQuestion: "무엇을 물어볼 수 있어?",
    lazyCountryQuestion: "아르헨티나는 어떻게 뛰어?",
    lazyMatchQuestion: "프랑스 대 스페인에서 누가 이겼어?",
    archivePlayerName: "리오넬 메시",
    archivePosition: "공격수",
    archiveClub: "아르헨티나 2022 월드컵 아카이브",
    archiveStats: "2022 월드컵: 7골",
    archiveNote: "메시는 짧은 터치와 한발 빠른 시야로 공격을 지휘한다",
    archiveVenue: "루사일 아이코닉 스타디움, 루사일",
    archiveStory: "2022 월드컵 우승을 차지했다",
    rejectedPlayerNotePatterns: [/초기 이미지/u, /총격로/u],
    currentNotePlayerName: "에드가르 요엘 바르세나스",
    currentNote: "크로스의 높이와 속도를 조절한다",
    archiveRounds: ["16강", "8강", "준결승", "결승"],
    report: {
      heading: "오류 제보",
      issue: "라인업 또는 선수 정보",
      placeholder: "어떤 내용을 수정해야 하나요?",
      submit: "제보 보내기",
      back: "돌아가기"
    }
  }
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(String(urlPath || "/").split("?")[0]);
  const resolved = path.resolve(root, decoded === "/" ? "index.html" : `.${decoded}`);

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    return null;
  }

  return resolved;
}

const server = createServer(async (request, response) => {
  const filePath = safePath(request.url);

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
      "Cache-Control": "no-store",
      "Content-Length": fileStat.size,
      "Content-Type": mimeTypes.get(path.extname(filePath)) || "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

function getUrl(pathname = "/") {
  return new URL(pathname, baseUrl).href;
}

async function waitForApp(page, locale, options = {}) {
  const { expectRows = true } = options;
  await page.waitForFunction(
    ({ expectedLanguage, expectedLocale, shouldHaveRows }) => {
      const controls = document.querySelector("#header-controls");
      const hasRows = document.querySelectorAll("#match-list .match-row").length > 0;
      return (
        document.documentElement.lang === expectedLanguage &&
        document.querySelector("#language-select")?.value === expectedLocale &&
        controls &&
        !controls.classList.contains("is-loading") &&
        (!shouldHaveRows || hasRows)
      );
    },
    {
      expectedLanguage: locale.htmlLang,
      expectedLocale: locale.code,
      shouldHaveRows: expectRows
    },
    { timeout: 30000 }
  );
}

async function openMatch(page, matchId) {
  const row = page.locator(`[data-match-id="${matchId}"]`);
  await row.waitFor({ state: "visible" });
  await row.locator(".match-row-trigger").click();
  await page.locator("#match-info:not(.is-hidden)").waitFor({ state: "visible" });
}

async function assertLanguageControlContract(page) {
  const contract = await page.evaluate(() => {
    const language = document.querySelector("#language-select");
    const timeZone = document.querySelector("#timezone-select");
    const timeZoneTrigger = document.querySelector("#timezone-picker-trigger");
    const timeZoneTriggerValue = document.querySelector("#timezone-picker-value");
    const timeZoneSearch = document.querySelector("#timezone-search-input");
    const languageStyles = getComputedStyle(language);
    const timeZoneValueStyles = getComputedStyle(timeZoneTriggerValue);
    const typographyKeys = ["fontFamily", "fontSize", "fontWeight", "letterSpacing", "lineHeight"];

    return {
      classes: [...language.classList],
      options: [...language.options].map((option) => ({
        label: option.textContent.trim(),
        value: option.value
      })),
      tagName: language.tagName,
      timeZoneAriaHidden: timeZone.getAttribute("aria-hidden"),
      timeZoneHidden: timeZone.hidden,
      timeZoneSearchTagName: timeZoneSearch?.tagName || "",
      timeZoneTabIndex: timeZone.tabIndex,
      timeZoneTagName: timeZone.tagName,
      timeZoneTriggerControls: timeZoneTrigger?.getAttribute("aria-controls") || "",
      timeZoneTriggerHasPopup: timeZoneTrigger?.getAttribute("aria-haspopup") || "",
      timeZoneTriggerTagName: timeZoneTrigger?.tagName || "",
      typographyMatches: typographyKeys.every(
        (key) => languageStyles[key] === timeZoneValueStyles[key]
      )
    };
  });

  assert(
    contract.tagName === "SELECT" &&
      contract.timeZoneTagName === "SELECT" &&
      contract.classes.includes("timezone-select") &&
      contract.classes.includes("language-select") &&
      contract.timeZoneAriaHidden === "true" &&
      contract.timeZoneHidden &&
      contract.timeZoneTabIndex === -1 &&
      contract.timeZoneTriggerTagName === "BUTTON" &&
      contract.timeZoneTriggerControls === "timezone-picker" &&
      contract.timeZoneTriggerHasPopup === "dialog" &&
      contract.timeZoneSearchTagName === "INPUT" &&
      contract.typographyMatches &&
      JSON.stringify(contract.options) === JSON.stringify([
        { label: "English", value: "en" },
        { label: "中文", value: "zh" },
        { label: "Español", value: "es" },
        { label: "한국어", value: "ko" }
      ]),
    `Language should stay a native select while timezone uses a searchable picker backed by the native timezone values. Measured ${JSON.stringify(contract)}.`
  );
}

async function getMobileLocaleLayout(page) {
  return page.evaluate(() => {
    const getRect = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect
        ? {
            height: rect.height,
            left: rect.left,
            top: rect.top,
            width: rect.width
          }
        : null;
    };
    return {
      language: getRect("#language-select"),
      main: getRect("main"),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      settingsButton: getRect("#settings-button"),
      timeZone: getRect("#timezone-picker-trigger")
    };
  });
}

async function assertMobileLocale(locale, browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(
    getUrl("/?view=matches&date=2026-07-15&lang=en&tz=America%2FLos_Angeles"),
    { waitUntil: "domcontentloaded" }
  );
  await waitForApp(page, { code: "en", htmlLang: "en" });
  await page.locator("#settings-button").click();
  await page.locator("#settings-popover:not(.is-hidden)").waitFor({ state: "visible" });
  const before = await getMobileLocaleLayout(page);

  await page.locator("#language-select").selectOption(locale.code);
  await waitForApp(page, locale);
  if (!(await page.locator("#settings-popover").isVisible())) {
    await page.locator("#settings-button").click();
  }
  await page.locator("#settings-popover:not(.is-hidden)").waitFor({ state: "visible" });
  const after = await getMobileLocaleLayout(page);

  assert(
    pageErrors.length === 0 &&
      before.overflow <= 0 &&
      after.overflow <= 0 &&
      before.language?.height === after.language?.height &&
      before.language?.width === after.language?.width &&
      before.timeZone?.height === after.timeZone?.height &&
      before.timeZone?.width === after.timeZone?.width &&
      after.language?.width === after.timeZone?.width &&
      Math.abs((before.main?.top || 0) - (after.main?.top || 0)) <= 1 &&
      Math.abs(
        (before.settingsButton?.left || 0) - (after.settingsButton?.left || 0)
      ) <= 1,
    `${locale.code}: switching locale on mobile should not introduce overflow or move the page shell. Measured ${JSON.stringify({ before, after, pageErrors })}.`
  );

  await context.close();
}

async function askBallBoy(page, question) {
  const input = page.locator("#scout-input");
  await input.fill(question);
  await page.locator(".scout-send").click();
}

async function assertBallBoyLazyLoading(locale, browser) {
  const context = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const page = await context.newPage();
  const requestedPaths = [];
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => requestedPaths.push(new URL(request.url()).pathname));

  await page.goto(
    getUrl("/?view=matches&date=2026-07-15&lang=en&tz=America%2FLos_Angeles&ballBoyLazyLocaleSmoke=1"),
    { waitUntil: "domcontentloaded" }
  );
  await waitForApp(page, { code: "en", htmlLang: "en" });
  requestedPaths.length = 0;

  const nonPlayerReplies = await page.evaluate(async (testCase) => {
    const knowledge = await import("./chatbot-knowledge.js?locale-lazy-smoke=1");
    knowledge.resetBallBoyContext();
    const rule = await knowledge.getBallBoyReply(testCase.rule, { locale: testCase.code });
    const help = await knowledge.getBallBoyReply(testCase.help, { locale: testCase.code });
    const country = await knowledge.getBallBoyReply(testCase.country, { locale: testCase.code });
    const match = await knowledge.getBallBoyReply(testCase.match, { locale: testCase.code });
    return {
      country: country?.kind || "",
      help: help?.kind || "",
      match: match?.kind || "",
      rule: rule?.kind || ""
    };
  }, {
    code: locale.code,
    country: locale.lazyCountryQuestion,
    help: locale.lazyHelpQuestion,
    match: locale.lazyMatchQuestion,
    rule: locale.lazyRuleQuestion
  });
  const playerNamePath = `/locales/${locale.code}/player-names.js`;
  const archiveNamePath = `/locales/${locale.code}/player-names-archive.js`;
  const currentContentPath = `/locales/${locale.code}/content-current.js`;
  assert(
    ["rule", "offside"].includes(nonPlayerReplies.rule) &&
      nonPlayerReplies.help === "help" &&
      nonPlayerReplies.country === "country" &&
      ["match", "matchup"].includes(nonPlayerReplies.match) &&
      !requestedPaths.includes(playerNamePath) &&
      !requestedPaths.includes(archiveNamePath) &&
      !requestedPaths.includes(currentContentPath),
    `${locale.code}: rule, help, and country queries should not fetch player-name or current entity modules. Measured ${JSON.stringify({ nonPlayerReplies, requestedPaths })}.`
  );

  const currentPlayerReply = await page.evaluate(async (testCase) => {
    const knowledge = await import("./chatbot-knowledge.js?locale-lazy-smoke=1");
    knowledge.resetBallBoyContext();
    const reply = await knowledge.getBallBoyReply(testCase.question, {
      locale: testCase.code
    });
    return {
      club: reply?.profile?.club || "",
      kind: reply?.kind || "",
      league: reply?.profile?.league || "",
      name: reply?.profile?.displayName || ""
    };
  }, {
    code: locale.code,
    question: locale.lazyCurrentPlayerQuestion
  });
  assert(
    currentPlayerReply.kind === "player" &&
      currentPlayerReply.name === locale.lazyCurrentPlayerName &&
      currentPlayerReply.club === locale.lazyCurrentClub &&
      currentPlayerReply.league === locale.lazyCurrentLeague &&
      requestedPaths.includes(playerNamePath) &&
      requestedPaths.includes(currentContentPath) &&
      !requestedPaths.includes(archiveNamePath),
    `${locale.code}: a current player intent should load current names/entities only and localize the full club line. Measured ${JSON.stringify({ currentPlayerReply, requestedPaths })}.`
  );

  const loanPlayerReply = await page.evaluate(async (testCase) => {
    const knowledge = await import("./chatbot-knowledge.js?locale-lazy-smoke=1");
    knowledge.resetBallBoyContext();
    const reply = await knowledge.getBallBoyReply(testCase.question, {
      locale: testCase.code
    });
    return {
      club: reply?.profile?.club || "",
      kind: reply?.kind || "",
      name: reply?.profile?.displayName || ""
    };
  }, {
    code: locale.code,
    question: locale.lazyLoanPlayerQuestion
  });
  assert(
    loanPlayerReply.kind === "player" &&
      loanPlayerReply.name === locale.lazyLoanPlayerName &&
      loanPlayerReply.club === locale.lazyLoanClub &&
      !requestedPaths.includes(archiveNamePath),
    `${locale.code}: loan clubs should apply the locale policy without loading archive names. Measured ${JSON.stringify({ loanPlayerReply, requestedPaths })}.`
  );

  const archiveFallbackReply = await page.evaluate(async (testCase) => {
    const knowledge = await import("./chatbot-knowledge.js?locale-lazy-smoke=1");
    knowledge.resetBallBoyContext();
    const reply = await knowledge.getBallBoyReply(testCase.question, {
      locale: testCase.code
    });
    return {
      hasPastOption: Boolean(reply?.options?.some((option) => option.era === "past")),
      kind: reply?.kind || ""
    };
  }, {
    code: locale.code,
    question: locale.lazyMissQuestion
  });
  assert(
    requestedPaths.includes(archiveNamePath) &&
      ["clarify", "player"].includes(archiveFallbackReply.kind) &&
      (
        archiveFallbackReply.kind === "player" ||
        archiveFallbackReply.hasPastOption
      ),
    `${locale.code}: archive names should load after a current-player miss and expose a historical result. Measured ${JSON.stringify({ archiveFallbackReply, requestedPaths })}.`
  );
  assert(
    pageErrors.length === 0,
    `${locale.code}: Ball Boy lazy locale checks raised browser errors: ${JSON.stringify(pageErrors)}.`
  );
  await context.close();
}

async function assertLocale(locale, browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const clarityRequests = [];
  const pageErrors = [];
  const requestedPaths = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    requestedPaths.push(url.pathname);
    if (/(?:^|\.)clarity\.ms$/u.test(url.hostname)) {
      clarityRequests.push(url.href);
    }
  });
  await page.route("**/data/admin-message.json*", async (route) => {
    await route.fulfill({
      json: {
        updatedAt: "2026-07-16T00:00:00.000Z",
        messages: [
          {
            active: true,
            emphasis: "Quarterfinals are set",
            endsAt: "2099-01-01T00:00:00.000Z",
            id: "locale-smoke-quarterfinals-set",
            message:
              "Quarterfinals are set: Defending champions Argentina, former winners France, Spain, and England, and first-time hopefuls Belgium, Morocco, Norway, and Switzerland make up the final eight.",
            startsAt: "2020-01-01T00:00:00.000Z"
          }
        ]
      }
    });
  });

  await page.goto(
    getUrl("/?view=matches&date=2026-07-15&lang=en&tz=America%2FLos_Angeles&ballBoySmoke=1"),
    { waitUntil: "domcontentloaded" }
  );
  await waitForApp(page, { code: "en", htmlLang: "en" });
  await assertLanguageControlContract(page);
  assert(
    clarityRequests.length === 0,
    `Local locale smoke should not load production Clarity analytics. Measured ${JSON.stringify(clarityRequests)}.`
  );
  const initialLanguagePackRequests = requestedPaths.filter((pathname) =>
    /^\/locales\/(?:es|ko)\//u.test(pathname)
  );
  assert(
    initialLanguagePackRequests.length === 0,
    `English startup should not download Spanish or Korean packs. Measured ${JSON.stringify(initialLanguagePackRequests)}.`
  );
  requestedPaths.length = 0;

  await page.locator("#scout-launcher").click();
  await askBallBoy(page, "who are you?");
  await page.locator(".scout-message.is-assistant.is-personality").waitFor({ state: "visible" });
  const beforeSwitch = await page.evaluate(() => ({
    assistantTurns: document.querySelectorAll(".scout-message.is-assistant").length,
    controlsHeight: document.querySelector("#header-controls")?.getBoundingClientRect().height || 0,
    controlsWidth: document.querySelector("#header-controls")?.getBoundingClientRect().width || 0,
    headerHeight: document.querySelector(".site-header")?.getBoundingClientRect().height || 0,
    personalityTurns: document.querySelectorAll(".scout-message.is-assistant.is-personality").length,
    userTurns: document.querySelectorAll(".scout-message.is-user").length
  }));
  await page.evaluate(() => {
    window.__localeSmokeBallBoyPersonalityAdds = 0;
    window.__localeSmokeBallBoyObserver = new MutationObserver((records) => {
      for (const node of records.flatMap((record) => [...record.addedNodes])) {
        if (
          node instanceof Element &&
          (node.matches(".scout-message.is-assistant.is-personality") ||
            node.querySelector(".scout-message.is-assistant.is-personality"))
        ) {
          window.__localeSmokeBallBoyPersonalityAdds += 1;
        }
      }
    });
    window.__localeSmokeBallBoyObserver.observe(document.querySelector("#scout-messages"), {
      childList: true,
      subtree: true
    });
  });
  await page.locator("#scout-close").click();

  await page.locator("#settings-button").click();
  await page.locator("#language-select").selectOption(locale.code);
  await page.waitForFunction(
    ({ expectedIdentity, expectedLanguage, expectedLocale, expectedName }) =>
      document.documentElement.lang === expectedLanguage &&
      document.querySelector("#language-select")?.value === expectedLocale &&
      document.querySelector("#language-select")?.disabled === false &&
      document.querySelector(".scout-title")?.textContent.trim() === expectedName &&
      document
        .querySelector(".scout-message.is-assistant.is-personality > p:not(.scout-speaker)")
        ?.textContent.trim() === expectedIdentity,
    {
      expectedIdentity: locale.ballBoyIdentity,
      expectedLanguage: locale.htmlLang,
      expectedLocale: locale.code,
      expectedName: locale.ballBoyName
    },
    { timeout: 30000 }
  );

  const switched = await page.evaluate(() => ({
    appName: document.querySelector(".brand-label")?.textContent.trim() || "",
    assistantTurns: document.querySelectorAll(".scout-message.is-assistant").length,
    controlsHeight: document.querySelector("#header-controls")?.getBoundingClientRect().height || 0,
    controlsWidth: document.querySelector("#header-controls")?.getBoundingClientRect().width || 0,
    headerHeight: document.querySelector(".site-header")?.getBoundingClientRect().height || 0,
    language: new URL(window.location.href).searchParams.get("lang"),
    matches: document.querySelector("#matches-tab")?.textContent.trim() || "",
    personalityAdds: window.__localeSmokeBallBoyPersonalityAdds,
    personalityTurns: document.querySelectorAll(".scout-message.is-assistant.is-personality").length,
    saved: localStorage.getItem("world-cup-simplified-language"),
    sourceNote: document.querySelector(".source-tooltip-note")?.textContent.trim() || "",
    status: document.querySelector(".scout-status")?.textContent.trim() || "",
    userQuestion: document.querySelector(".scout-message.is-user")?.textContent.trim() || "",
    userTurns: document.querySelectorAll(".scout-message.is-user").length
  }));
  assert(
    switched.appName === locale.appName &&
      switched.matches === locale.matches &&
      switched.language === locale.code &&
      switched.saved === locale.code &&
      switched.sourceNote === locale.sourceNote &&
      switched.status === locale.ballBoyStatus &&
      switched.userQuestion === "who are you?" &&
      switched.assistantTurns === switched.personalityTurns &&
      switched.personalityAdds === 1 &&
      switched.personalityTurns === beforeSwitch.personalityTurns &&
      switched.userTurns === beforeSwitch.userTurns &&
      Math.abs(switched.headerHeight - beforeSwitch.headerHeight) < 1 &&
      Math.abs(switched.controlsHeight - beforeSwitch.controlsHeight) < 1 &&
      Math.abs(switched.controlsWidth - beforeSwitch.controlsWidth) < 1,
    `${locale.code}: language switching should update URL/storage and rerender the existing Ball Boy turn exactly once. Measured ${JSON.stringify({ beforeSwitch, switched })}.`
  );
  const adminMessage = await page.evaluate(() => ({
    emphasis: document.querySelector("#admin-message-text strong")?.textContent.trim() || "",
    hidden: document.querySelector("#admin-message-banner")?.hidden ?? true,
    label: document.querySelector("#admin-message-label")?.textContent.trim() || "",
    text: document.querySelector("#admin-message-text")?.textContent.trim() || ""
  }));
  assert(
    !adminMessage.hidden &&
      adminMessage.label === locale.adminLabel &&
      adminMessage.emphasis === locale.adminEmphasis &&
      adminMessage.text === locale.adminMessage,
    `${locale.code}: an active English-only admin message should use the lazy locale dictionary, including its emphasized lead. Measured ${JSON.stringify(adminMessage)}.`
  );
  const releaseContentPath = `/locales/${locale.code}/content-release.js`;
  const archiveContentPath = `/locales/${locale.code}/content-archive.js`;
  assert(
    !requestedPaths.includes(releaseContentPath) &&
      !requestedPaths.includes(archiveContentPath),
    `${locale.code}: switching languages should load neither release nor archive copy before user intent. Measured ${JSON.stringify(requestedPaths)}.`
  );

  await page.locator(".release-tooltip-trigger").focus();
  await page.waitForFunction(
    (expectedTitle) =>
      document.querySelector("#release-tooltip strong")?.textContent.includes(expectedTitle),
    locale.latestReleaseTitle,
    { timeout: 30000 }
  );
  const releaseTooltip = await page.evaluate(() => ({
    busy: document.querySelector("#release-tooltip")?.getAttribute("aria-busy") || "",
    title: document.querySelector("#release-tooltip strong")?.textContent.trim() || ""
  }));
  assert(
    releaseTooltip.busy === "false" &&
      releaseTooltip.title.includes(locale.latestReleaseTitle) &&
      requestedPaths.filter((pathname) => pathname === releaseContentPath).length === 1 &&
      !requestedPaths.includes(archiveContentPath),
    `${locale.code}: release copy should load once on tooltip intent without pulling archive copy. Measured ${JSON.stringify({ releaseTooltip, requestedPaths })}.`
  );
  await page.evaluate(() => window.__localeSmokeBallBoyObserver?.disconnect());

  if (await page.locator("#settings-popover").isVisible()) {
    await page.locator("#settings-button").click();
  }
  await page.locator("#scout-launcher").click();
  await page.locator("#scout-reset").click();
  await askBallBoy(page, locale.ballBoyPlayerQuestion);
  await page.getByRole("heading", { name: locale.playerName }).waitFor({ state: "visible" });
  assert(
    (await page.locator(".scout-answer.is-player").last().locator("h3").textContent())?.trim() === locale.playerName,
    `${locale.code}: Ball Boy should use the shared newsroom player name.`
  );
  await page.locator("#scout-reset").click();
  await askBallBoy(page, locale.ballBoyTimeZonePrompt);
  await page.locator(".scout-answer.is-settings").last().waitFor({ state: "visible" });
  const timeZoneReplyCount = await page.locator(".scout-answer.is-settings").count();
  await askBallBoy(page, locale.ballBoyTimeZoneRegion);
  await page.waitForFunction(
    (previousCount) =>
      document.querySelectorAll(".scout-answer.is-settings").length > previousCount,
    timeZoneReplyCount
  );
  const timeZoneReply = page.locator(".scout-answer.is-settings").last();
  await timeZoneReply.locator(".scout-answer-lead").waitFor({ state: "visible" });
  const localizedTimeZoneChoices = await timeZoneReply
    .locator("[data-scout-setting-value]")
    .evaluateAll((buttons) =>
      buttons.map((button) => ({
        label: button.textContent.trim(),
        value: button.dataset.scoutSettingValue
      }))
    );
  assert(
    (await timeZoneReply.locator(".scout-answer-lead").textContent())?.trim() ===
      locale.ballBoyTimeZoneLead &&
      locale.ballBoyTimeZoneChoices.every((label) =>
      localizedTimeZoneChoices.some((choice) => choice.label === label)
    ) &&
      ["America/Los_Angeles", "America/New_York", "America/Phoenix"].every((value) =>
        localizedTimeZoneChoices.some((choice) => choice.value === value)
      ),
    `${locale.code}: localized country aliases should produce localized timezone choices through the shared label resolver. Measured ${JSON.stringify(localizedTimeZoneChoices)}.`
  );
  await page.locator("#scout-close").click();

  await openMatch(page, "match-102-semi-final-2026-07-15");
  assert(
    (await page.locator("#match-info .match-summary .info-kicker").textContent())?.trim() === locale.semiFinal,
    `${locale.code}: the current semifinal label should be localized.`
  );
  assert(
    (await page.locator("#match-info .match-summary .summary-title + p").textContent())?.trim() ===
      locale.venue,
    `${locale.code}: the current match venue and location should use the locale venue glossary.`
  );
  const keyInformation = await page.locator("#match-info .match-key-info-block").evaluate((block) => ({
    heading: block.querySelector("h3")?.textContent.trim() || "",
    text: block.innerText.replace(/\s+/g, " ").trim()
  }));
  assert(
    keyInformation.heading === locale.keyInformation &&
      keyInformation.text.length > keyInformation.heading.length + 40 &&
      locale.catchUpContentPattern.test(keyInformation.text),
    `${locale.code}: the current match information card should render localized editorial copy. Measured ${JSON.stringify(keyInformation)}.`
  );

  const currentCards = await page.evaluate(
    ({ expectedCoach, expectedPlayer }) => {
      const playerMarker = document.querySelector('[data-lineup-player-name="Julian Alvarez"]');
      const playerCard = playerMarker?.querySelector(".player-card");
      const coachCards = [...document.querySelectorAll("#match-info .lineup-coach-card")];
      const coachCard = coachCards.find(
        (card) => card.querySelector(".player-card-name")?.textContent.trim() === expectedCoach
      );
      return {
        coachName: coachCard?.querySelector(".player-card-name")?.textContent.trim() || "",
        coachRole: coachCard?.querySelector(".player-card-position")?.textContent.trim() || "",
        playerName: playerCard?.querySelector(".player-card-name")?.textContent.trim() || "",
        playerPosition: playerCard?.querySelector(".player-card-position")?.textContent.trim() || "",
        triggerName: playerMarker?.querySelector("[data-player-card-trigger]")?.textContent.trim() || "",
        foundExpectedPlayer: playerCard?.querySelector(".player-card-name")?.textContent.trim() === expectedPlayer
      };
    },
    { expectedCoach: locale.coachName, expectedPlayer: locale.playerName }
  );
  assert(
    currentCards.foundExpectedPlayer &&
      currentCards.triggerName === locale.playerName &&
      currentCards.playerPosition === locale.playerPosition &&
      currentCards.coachName === locale.coachName &&
      currentCards.coachRole.includes(locale.coachTeam) &&
      currentCards.coachRole.includes(locale.coachRole) &&
      !/\b(?:Forward|Head Coach)\b/u.test(`${currentCards.playerPosition} ${currentCards.coachRole}`),
    `${locale.code}: current player and coach cards should localize names, roles, and positions. Measured ${JSON.stringify(currentCards)}.`
  );

  await page.locator("#catch-up-button").click();
  await page.locator("#catch-up-popover:not(.is-hidden) .catch-up-item").first().waitFor({ state: "visible" });
  await page.waitForFunction(
    (language) => {
      const text = document.querySelector("#catch-up-list")?.innerText.replace(/\s+/g, " ").trim() || "";
      return text.length > 30 &&
        !/(?:Cargando el resumen|요약을 불러오는 중)/u.test(text) &&
        (language !== "ko" || /[가-힣]/u.test(text));
    },
    locale.code,
    { timeout: 30000 }
  );
  const catchUp = await page.evaluate(() => ({
    button: document.querySelector("#catch-up-button")?.getAttribute("aria-label") || "",
    dialog: document.querySelector("#catch-up-popover")?.getAttribute("aria-label") || "",
    text: document.querySelector("#catch-up-list")?.innerText.replace(/\s+/g, " ").trim() || ""
  }));
  assert(
    catchUp.button === locale.catchUp &&
      catchUp.dialog === locale.catchUpDialog &&
      catchUp.text.length > 30 &&
      locale.catchUpContentPattern.test(catchUp.text) &&
      ((catchUp.text.includes(locale.catchUpHeadline) &&
        catchUp.text.includes(locale.catchUpBody)) ||
        locale.catchUpDynamicPattern.test(catchUp.text)),
    `${locale.code}: Catch Up shell and loaded editorial copy should be localized. Measured ${JSON.stringify(catchUp)}.`
  );
  await page.locator("#catch-up-button").click();

  await page.locator("#team-search-toggle").click();
  await page.locator("#team-search-input").fill(locale.searchQuery);
  await page.waitForFunction(
    ({ expectedQuery, expectedTitle }) =>
      new URL(window.location.href).searchParams.get("team") === expectedQuery &&
      document.querySelector(".team-search-summary h2")?.textContent.trim() === expectedTitle &&
      document.querySelectorAll(".is-country-search-row").length > 0,
    { expectedQuery: locale.searchQuery, expectedTitle: locale.searchTitle },
    { timeout: 30000 }
  );
  const search = await page.evaluate(() => ({
    heading: document.querySelector(".team-search-summary h2")?.textContent.trim() || "",
    historyToggle:
      document.querySelector(".team-search-history-button")?.textContent.trim() || "",
    resultCount: document.querySelectorAll(".is-country-search-row").length,
    text: document.querySelector("#match-list")?.innerText.replace(/\s+/g, " ").trim() || ""
  }));
  assert(
    search.heading === locale.searchTitle &&
      search.resultCount > 0 &&
      search.text.includes(locale.searchTitle) &&
      search.historyToggle.startsWith(locale.olderWorldCups),
    `${locale.code}: localized country aliases should return localized search results. Measured ${JSON.stringify(search)}.`
  );

  await page.goto(
    getUrl(
      `/?view=standings&standingsMode=third-place&lang=${locale.code}&tz=America%2FLos_Angeles`
    ),
    { waitUntil: "domcontentloaded" }
  );
  await waitForApp(page, locale, { expectRows: false });
  await page.waitForFunction(
    () =>
      document.querySelectorAll(
        ".third-place-table tbody tr:not(.third-place-cut-row)"
      ).length === 12,
    null,
    { timeout: 30000 }
  );
  assert(
    (await page.locator(".third-place-rank-cell").first().textContent())?.trim() ===
      locale.firstOrdinal,
    `${locale.code}: the third-place race should use locale ordinals.`
  );

  await page.goto(
    getUrl(`/?view=matches&date=2026-06-23&lang=${locale.code}&tz=America%2FLos_Angeles`),
    { waitUntil: "domcontentloaded" }
  );
  await waitForApp(page, locale);
  await openMatch(page, "panama-croatia-2026-06-23");
  await page.waitForFunction(
    (expectedName) =>
      [...document.querySelectorAll("#match-info .player-card")].some(
        (card) => card.querySelector(".player-card-name")?.textContent.trim() === expectedName
      ),
    locale.currentNotePlayerName,
    { timeout: 30000 }
  );
  const currentNoteCard = await page.evaluate((expectedName) => {
    const card = [...document.querySelectorAll("#match-info .player-card")].find(
      (item) => item.querySelector(".player-card-name")?.textContent.trim() === expectedName
    );
    return card?.textContent.replace(/\s+/g, " ").trim() || "";
  }, locale.currentNotePlayerName);
  assert(
    currentNoteCard.includes(locale.currentNote) &&
      locale.rejectedPlayerNotePatterns.every((pattern) => !pattern.test(currentNoteCard)),
    `${locale.code}: the current player card should use the controlled football-note template without old machine-translation artifacts. Measured ${JSON.stringify(currentNoteCard)}.`
  );

  await page.goto(
    getUrl("/?view=matches&date=2026-07-19&tz=America%2FLos_Angeles&ballBoySmoke=1"),
    { waitUntil: "domcontentloaded" }
  );
  await waitForApp(page, locale);
  await openMatch(page, "match-104-final-2026-07-19");
  assert(
    (await page.locator("#match-info .match-summary .info-kicker").textContent())?.trim() === locale.final &&
      (await page.locator("#language-select").inputValue()) === locale.code,
    `${locale.code}: a URL without lang should restore the saved locale and localize the final label.`
  );

  await page.goto(
    getUrl(`/?view=matches&date=2022-12-18&lang=${locale.code}&tz=America%2FLos_Angeles`),
    { waitUntil: "domcontentloaded" }
  );
  await waitForApp(page, locale);
  await page.evaluate(() => {
    window.__localeSmokeArchiveEnglishLeaks = [];
    window.__localeSmokeArchiveObserver = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          const text = node.textContent?.replace(/\s+/g, " ").trim() || "";
          if (/\b(?:Forward|World Cup archive|This World Cup)\b/u.test(text)) {
            window.__localeSmokeArchiveEnglishLeaks.push(text);
          }
        }
      }
    });
    window.__localeSmokeArchiveObserver.observe(document.querySelector("#match-info"), {
      childList: true,
      subtree: true
    });
  });
  await openMatch(page, "wc-2022-2022-12-18-final-argentina-france");
  await page.waitForFunction(
    (expectedName) =>
      [...document.querySelectorAll("#match-info .player-card")].some(
        (card) =>
          !card.classList.contains("is-profile-loading") &&
          card.querySelector(".player-card-name")?.textContent.trim() === expectedName
      ),
    locale.archivePlayerName,
    { timeout: 30000 }
  );
  const archiveCard = await page.evaluate((expectedName) => {
    const card = [...document.querySelectorAll("#match-info .player-card")].find(
      (item) => item.querySelector(".player-card-name")?.textContent.trim() === expectedName
    );
    return {
      club: card?.querySelector(".player-card-club")?.textContent.trim() || "",
      name: card?.querySelector(".player-card-name")?.textContent.trim() || "",
      note:
        card
          ?.querySelector(".player-card-copy .player-card-note:not(.player-card-tournament-stats)")
          ?.textContent.trim() || "",
      position: card?.querySelector(".player-card-position")?.textContent.trim() || "",
      stats:
        card?.querySelector(".player-card-tournament-stats")?.textContent.trim() || "",
      text: card?.textContent.replace(/\s+/g, " ").trim() || ""
    };
  }, locale.archivePlayerName);
  const archiveEnglishLeaks = await page.evaluate(() => {
    window.__localeSmokeArchiveObserver?.disconnect();
    return window.__localeSmokeArchiveEnglishLeaks || [];
  });
  const archiveMatchCopy = await page.evaluate(() => ({
    story:
      document
        .querySelector(".result-story-highlights")
        ?.textContent.replace(/\s+/g, " ")
        .trim() || "",
    venue:
      document
        .querySelector("#match-info .match-summary .summary-title + p")
        ?.textContent.trim() || ""
  }));
  assert(
    archiveCard.name === locale.archivePlayerName &&
      archiveCard.position === locale.archivePosition &&
      archiveCard.club === locale.archiveClub &&
      archiveCard.stats === locale.archiveStats &&
      archiveCard.note.includes(locale.archiveNote) &&
      locale.rejectedPlayerNotePatterns.every((pattern) => !pattern.test(archiveCard.text)) &&
      !/\b(?:Forward|World Cup archive|This World Cup)\b/u.test(archiveCard.text) &&
      archiveEnglishLeaks.length === 0 &&
      archiveMatchCopy.venue === locale.archiveVenue &&
      archiveMatchCopy.story.includes(locale.archiveStory) &&
      requestedPaths.filter((pathname) => pathname === archiveContentPath).length === 1,
    `${locale.code}: the archived final should lazily load structured venue/result templates and localize its newsroom player card without an English flash. Measured ${JSON.stringify({ archiveCard, archiveEnglishLeaks, archiveMatchCopy, requestedPaths })}.`
  );

  await page.goto(
    getUrl(`/?view=standings&standingsYear=2022&standingsMode=tournament&lang=${locale.code}&tz=America%2FLos_Angeles`),
    { waitUntil: "domcontentloaded" }
  );
  await waitForApp(page, locale, { expectRows: false });
  await page.locator("#standings-grid .historical-tournament-view").waitFor({ state: "visible" });
  const archiveYear = await page.evaluate(() => ({
    headings: [...document.querySelectorAll("#standings-grid .progress-round h3")]
      .map((heading) => heading.textContent.trim()),
    urlYear: new URL(window.location.href).searchParams.get("standingsYear"),
    year: document.querySelector("#standings-year-button")?.textContent.trim() || ""
  }));
  assert(
    archiveYear.year === "2022" &&
      archiveYear.urlYear === "2022" &&
      locale.archiveRounds.every((round) => archiveYear.headings.includes(round)),
    `${locale.code}: the 2022 archive year and knockout rounds should be localized. Measured ${JSON.stringify(archiveYear)}.`
  );

  const reportPage = await context.newPage();
  const reportErrors = [];
  reportPage.on("pageerror", (error) => reportErrors.push(error.message));
  await reportPage.goto(
    getUrl(
      `/report.html?lang=${locale.code}&type=lineup-player&date=2026-07-15&tz=America%2FLos_Angeles`
    ),
    { waitUntil: "domcontentloaded" }
  );
  await reportPage.waitForFunction(
    ({ expectedHeading, expectedLanguage }) =>
      document.documentElement.lang === expectedLanguage &&
      document.querySelector("#report-heading")?.textContent.trim() === expectedHeading,
    { expectedHeading: locale.report.heading, expectedLanguage: locale.htmlLang },
    { timeout: 30000 }
  );
  await reportPage.setViewportSize({ width: 390, height: 844 });
  await reportPage.locator(".source-tooltip-trigger").scrollIntoViewIfNeeded();
  await reportPage.locator(".source-tooltip-trigger").dispatchEvent("pointerdown", {
    bubbles: true,
    button: 0,
    cancelable: true,
    pointerType: "touch"
  });
  await reportPage.evaluate(() =>
    new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
  const report = await reportPage.evaluate(() => ({
    back: document.querySelector("#back-link-label")?.textContent.trim() || "",
    backHref: document.querySelector("#back-link")?.getAttribute("href") || "",
    heading: document.querySelector("#report-heading")?.textContent.trim() || "",
    issue: document.querySelector("#issue-type option:checked")?.textContent.trim() || "",
    placeholder: document.querySelector("#issue-details")?.getAttribute("placeholder") || "",
    sourceActive: document.querySelector(".source-tooltip-trigger")?.classList.contains("is-touch-tooltip-open") || false,
    sourceBounds: (() => {
      const rect = document.querySelector(".source-tooltip")?.getBoundingClientRect();
      return rect
        ? { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top }
        : null;
    })(),
    sourceNote: document.querySelector(".source-tooltip-note")?.textContent.trim() || "",
    submit: document.querySelector("#report-form button[type='submit']")?.textContent.trim() || ""
  }));
  assert(
    report.heading === locale.report.heading &&
      report.issue === locale.report.issue &&
      report.placeholder === locale.report.placeholder &&
      report.submit === locale.report.submit &&
      report.back === locale.report.back &&
      report.sourceNote === locale.sourceNote &&
      report.sourceActive &&
      report.sourceBounds?.left >= 5 &&
      report.sourceBounds?.right <= 385 &&
      report.sourceBounds?.top >= 0 &&
      report.sourceBounds?.bottom <= 844 &&
      new URL(report.backHref, reportPage.url()).searchParams.get("lang") === locale.code,
    `${locale.code}: the report-issue page and return link should preserve the locale. Measured ${JSON.stringify(report)}.`
  );

  assert(
    pageErrors.length === 0 && reportErrors.length === 0,
    `${locale.code}: locale UI should not raise browser errors. Measured ${JSON.stringify({ pageErrors, reportErrors })}.`
  );
  await context.close();
}

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const browser = await chromium.launch();

try {
  const selectedLocaleCases = requestedLocale
    ? localeCases.filter((locale) => locale.code === requestedLocale)
    : localeCases;
  assert(
    selectedLocaleCases.length > 0,
    `Unknown locale smoke selection: ${requestedLocale || "(none)"}`
  );
  for (const locale of selectedLocaleCases) {
    await assertBallBoyLazyLoading(locale, browser);
    if (!ballBoyOnly) {
      await assertLocale(locale, browser);
      await assertMobileLocale(locale, browser);
    }
  }
  console.log(
    ballBoyOnly
      ? "Spanish and Korean Ball Boy locale smoke tests passed."
      : "Spanish and Korean locale smoke tests passed."
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
