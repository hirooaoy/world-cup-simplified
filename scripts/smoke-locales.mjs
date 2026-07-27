#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  HISTORICAL_AWARD_CONTEXT_PLAYERS,
  HISTORICAL_HIGHLIGHTS
} from "../data/highlights-history.js";
import { formatPlayerNote as formatSpanishPlayerNote } from "../locales/es/app.js";
import { ES_ARCHIVE_PLAYER_NAME_TRANSLATIONS } from "../locales/es/player-names-archive.js";
import { formatPlayerNote as formatKoreanPlayerNote } from "../locales/ko/app.js";
import { KO_ARCHIVE_PLAYER_NAME_TRANSLATIONS } from "../locales/ko/player-names-archive.js";

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
const highlightsClubLinesOnly = process.argv.includes("--highlights-club-lines-only");
const historicalHighlightNotesOnly = process.argv.includes("--historical-highlight-notes-only");
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
    catchUpHeadline: "Inglaterra asegura el tercer puesto",
    catchUpBody: "La victoria 6-4 de Inglaterra ante Francia aseguró el tercer puesto.",
    catchUpDynamicPattern: /(?:triplete|España (?:gana|ganó) el Mundial)/u,
    sourceNote: "Las fuentes exactas varían según el partido.",
    venue: "Estadio de Atlanta • Atlanta, Georgia, Estados Unidos",
    latestReleaseTitle: "Notas de la versión: Fichas históricas y resúmenes de partido más claros",
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
    archiveClub: "Paris Saint-Germain (Ligue 1)",
    archiveContext: "En el Mundial de 2022",
    currentContext: "En el Mundial de 2026",
    archiveStats: "Mundial 2022: 7 goles",
    archiveNote: "Messi controla el ataque con toques cortos",
    archiveVenue: "Lusail Iconic Stadium",
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
    catchUpHeadline: "잉글랜드가 3위를 확정했다",
    catchUpBody: "잉글랜드가 프랑스를 6-4로 꺾고 3위를 차지했다.",
    catchUpDynamicPattern: /(?:해트트릭|스페인.+(?:월드컵|세계 챔피언))/u,
    sourceNote: "경기별 세부 출처는 다를 수 있습니다.",
    venue: "애틀랜타 스타디움 • 미국 조지아주 애틀랜타",
    latestReleaseTitle: "릴리스 노트: 더 선명해진 역대 선수 카드와 경기 브리프",
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
    archiveClub: "파리 생제르맹 (리그 1)",
    archiveContext: "2022년 월드컵 당시",
    currentContext: "2026년 월드컵 당시",
    archiveStats: "2022 월드컵: 7골",
    archiveNote: "메시는 짧은 터치와 한발 빠른 시야로 공격을 지휘한다",
    archiveVenue: "루사일 아이코닉 스타디움",
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

const highlightsLocaleCases = [
  {
    code: "en",
    htmlLang: "en",
    pageTitle: "Spain are 2026 world champions.",
    goldenBallMeaning: "Best overall player",
    goldenBallImpact: "His consistency and leadership were central to their title run.",
    goldenGloveStat: "Seven clean sheets in eight games.",
    fairPlayStat: "They finished their last three matches without a card.",
    vanDijkClubLine: "Liverpool (Premier League)",
    historicalClubLine: "Barcelona (La Liga)",
    oldHistoricalClubLine: "Liverpool (Football League Second Division)",
    bestXiClubLine: "Athletic Bilbao (La Liga)",
    worldCupContext: "At the 2026 World Cup",
    zeroTournamentStats: "",
    goldenBootName: "Kylian Mbappé",
    bestXiInfo: "Selected by admin",
    bestCoachLabel: "Best coach",
    bestCoachReason: "Spain conceded only once in eight matches without becoming passive. De la Fuente kept the same clear 4-3-3 identity while shifting between patient possession, aggressive pressing and a more secure knockout shape; two of his substitutes then combined for the winning goal in the final.",
    bestXiTitle: "Best XI of 2026",
    storiesTitle: "Stories worth remembering",
    starterGoalkeeper: "G. Kobel",
    honourableGoalkeeper: "U. Simón",
    benchLabel: "Bench",
    honourableMentions: "Honorable Mentions",
    backLabel: "Back",
    settingsLabel: "Settings",
    languageLabel: "Language",
    darkModeLabel: "Dark mode",
    homeLabel: "Back to Home"
  },
  {
    code: "zh",
    htmlLang: "zh-Hans",
    pageTitle: "西班牙成为2026年世界杯冠军。",
    goldenBallMeaning: "赛事最佳球员",
    goldenBallImpact: "他的稳定发挥和领导力是球队夺冠的关键。",
    goldenGloveStat: "8场比赛7次零封。",
    fairPlayStat: "他们在最后三场比赛中没有领到任何牌。",
    vanDijkClubLine: "利物浦（英超）",
    historicalClubLine: "巴塞罗那（西甲）",
    oldHistoricalClubLine: "利物浦（英格兰足球联赛乙级联赛）",
    bestXiClubLine: "毕尔巴鄂竞技（西甲）",
    worldCupContext: "2026年世界杯期间",
    zeroTournamentStats: "",
    goldenBootName: "基利安·姆巴佩",
    bestXiInfo: "管理员精选",
    bestCoachLabel: "最佳教练",
    bestCoachReason: "西班牙8场比赛只丢1球，却没有因此变得保守。德拉富恩特始终保持清晰的4-3-3体系，同时在耐心控球、主动逼抢与更稳固的淘汰赛结构之间灵活调整；决赛中，两名替补球员又联手制造了制胜球。",
    bestXiTitle: "2026年最佳阵容",
    storiesTitle: "值得记住的故事",
    starterGoalkeeper: "格雷戈·科贝尔",
    honourableGoalkeeper: "乌奈·西蒙",
    benchLabel: "替补席",
    honourableMentions: "荣誉提名",
    backLabel: "返回",
    settingsLabel: "设置",
    languageLabel: "语言",
    darkModeLabel: "深色模式",
    homeLabel: "返回首页"
  },
  {
    code: "es",
    htmlLang: "es-419",
    pageTitle: "España es campeona del Mundial 2026.",
    goldenBallMeaning: "Mejor jugador del torneo",
    goldenBallImpact: "Su regularidad y liderazgo fueron claves en el título.",
    goldenGloveStat: "Siete porterías a cero en ocho partidos.",
    fairPlayStat: "Terminó sus últimos tres partidos sin recibir tarjetas.",
    vanDijkClubLine: "Liverpool (Premier League)",
    historicalClubLine: "Barcelona (LaLiga)",
    oldHistoricalClubLine: "Liverpool (Segunda División de la Football League)",
    bestXiClubLine: "Athletic Bilbao (LaLiga)",
    worldCupContext: "En el Mundial de 2026",
    zeroTournamentStats: "",
    goldenBootName: "Kylian Mbappé",
    bestXiInfo: "Selección del administrador",
    bestCoachLabel: "Mejor entrenador",
    bestCoachReason: "España solo encajó una vez en ocho partidos sin volverse pasiva. De la Fuente mantuvo una identidad clara de 4-3-3 mientras alternaba posesión paciente, presión agresiva y una estructura más segura en las eliminatorias; dos de sus suplentes combinaron después para el gol del título en la final.",
    bestXiTitle: "Mejor once de 2026",
    storiesTitle: "Historias para recordar",
    starterGoalkeeper: "G. Kobel",
    honourableGoalkeeper: "U. Simón",
    benchLabel: "Suplentes",
    honourableMentions: "Menciones honoríficas",
    backLabel: "Volver",
    settingsLabel: "Configuración",
    languageLabel: "Idioma",
    darkModeLabel: "Modo oscuro",
    homeLabel: "Volver al inicio"
  },
  {
    code: "ko",
    htmlLang: "ko",
    pageTitle: "스페인이 2026년 월드컵 챔피언이 됐다.",
    goldenBallMeaning: "대회 최우수 선수",
    goldenBallImpact: "꾸준함과 리더십은 우승의 핵심이었다.",
    goldenGloveStat: "8경기에서 7번 무실점.",
    fairPlayStat: "마지막 세 경기에서는 카드를 한 장도 받지 않았다.",
    vanDijkClubLine: "리버풀 (프리미어리그)",
    historicalClubLine: "바르셀로나 (라리가)",
    oldHistoricalClubLine: "리버풀 (풋볼 리그 2부)",
    bestXiClubLine: "아틀레틱 빌바오 (라리가)",
    worldCupContext: "2026년 월드컵 당시",
    zeroTournamentStats: "",
    goldenBootName: "킬리안 음바페",
    bestXiInfo: "운영자 선정",
    bestCoachLabel: "최우수 감독",
    bestCoachReason: "스페인은 8경기에서 단 1골만 내주면서도 수동적으로 변하지 않았다. 데 라 푸엔테는 명확한 4-3-3 정체성을 유지한 채 차분한 점유, 적극적인 압박과 더 안정적인 토너먼트 구조를 오갔고, 결승에서는 교체 선수 두 명이 결승골을 합작했다.",
    bestXiTitle: "2026년 베스트 11",
    storiesTitle: "기억할 이야기",
    starterGoalkeeper: "그. 코벨",
    honourableGoalkeeper: "우. 시몬",
    benchLabel: "교체 명단",
    honourableMentions: "명예 선정",
    backLabel: "뒤로",
    settingsLabel: "설정",
    languageLabel: "언어",
    darkModeLabel: "다크 모드",
    homeLabel: "홈으로 돌아가기"
  }
];

const timelineLocaleContracts = Object.freeze({
  en: {
    heading: "See you next time",
    lead: "Morocco, Portugal, and Spain will host, with special 100th-anniversary matches in Argentina, Paraguay, and Uruguay.",
    dates: ["4 Oct 2023", "Date TBA", "13 Jun 2030"],
    titles: ["Six teams have their places", "The groups are drawn", "The 2030 World Cup begins"],
    hostsBody: "Morocco, Portugal, and Spain will host the main tournament. Argentina, Paraguay, and Uruguay will stage the centenary matches. All six qualify automatically.",
  },
  zh: {
    heading: "下次见",
    lead: "摩洛哥、葡萄牙和西班牙将主办2030年世界杯，阿根廷、巴拉圭和乌拉圭将承办百年纪念赛。",
    dates: ["2023年10月4日", "日期待定", "2030年6月13日"],
    titles: ["六支球队已锁定席位", "小组抽签", "2030年世界杯开幕"],
    hostsBody: "摩洛哥、葡萄牙和西班牙将主办主要赛事；阿根廷、巴拉圭和乌拉圭将承办百年纪念赛。六队均自动晋级。",
  },
  es: {
    heading: "Nos vemos la próxima vez",
    lead: "Marruecos, Portugal y España serán las sedes, con partidos del centenario en Argentina, Paraguay y Uruguay.",
    dates: ["4 oct 2023", "Fecha por confirmar", "13 jun 2030"],
    titles: ["Seis selecciones ya tienen su lugar", "Se sortean los grupos", "Comienza el Mundial de 2030"],
    hostsBody: "Marruecos, Portugal y España albergarán el torneo principal. Argentina, Paraguay y Uruguay recibirán los partidos del centenario. Las seis selecciones se clasifican automáticamente.",
  },
  ko: {
    heading: "다음에 또 만나요",
    lead: "모로코·포르투갈·스페인이 개최하며, 아르헨티나·파라과이·우루과이에서는 100주년 기념 경기가 열린다.",
    dates: ["2023년 10월 4일", "날짜 미정", "2030년 6월 13일"],
    titles: ["여섯 팀은 이미 본선에 진출했다", "조 추첨이 열린다", "2030 월드컵 개막"],
    hostsBody: "모로코·포르투갈·스페인이 본 대회를 개최한다. 아르헨티나·파라과이·우루과이는 100주년 기념 경기를 연다. 여섯 팀 모두 자동 진출한다.",
  }
});

const historical2022TimelineContracts = Object.freeze({
  en: {
    heading: "See you next time",
    lead: "Canada, Mexico, and the United States will stage the first 48-team World Cup and the first hosted by three countries.",
    dates: ["13 Jun 2018", "5 Dec 2025", "11 Jun 2026"],
    titles: ["Three hosts have their places", "The groups are drawn", "The 2026 World Cup begins"]
  },
  zh: {
    heading: "下次见",
    lead: "加拿大、墨西哥和美国将共同举办首届48队世界杯，也是首次由三个国家共同主办。",
    dates: ["2018年6月13日", "2025年12月5日", "2026年6月11日"],
    titles: ["三个东道主已锁定席位", "小组抽签", "2026年世界杯开幕"]
  },
  es: {
    heading: "Nos vemos la próxima vez",
    lead: "Canadá, México y Estados Unidos albergarán el primer Mundial de 48 selecciones y el primero organizado por tres países.",
    dates: ["13 jun 2018", "5 dic 2025", "11 jun 2026"],
    titles: ["Tres anfitriones tienen su lugar", "Se sortean los grupos", "Comienza el Mundial de 2026"]
  },
  ko: {
    heading: "다음에 또 만나요",
    lead: "캐나다·멕시코·미국이 사상 첫 48개 팀 월드컵이자 세 나라가 공동 개최하는 첫 대회를 연다.",
    dates: ["2018년 6월 13일", "2025년 12월 5일", "2026년 6월 11일"],
    titles: ["세 개최국은 이미 본선에 진출했다", "조 추첨이 열린다", "2026 월드컵 개막"]
  }
});

const historicalPreviewChain = Object.freeze([
  [1930, 1934], [1934, 1938], [1938, 1950], [1950, 1954], [1954, 1958],
  [1958, 1962], [1962, 1966], [1966, 1970], [1970, 1974], [1974, 1978],
  [1978, 1982], [1982, 1986], [1986, 1990], [1990, 1994], [1994, 1998],
  [1998, 2002], [2002, 2006], [2006, 2010], [2010, 2014], [2014, 2018],
  [2018, 2022], [2022, 2026]
]);

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

async function assertArchivedHomeSeo(browser) {
  const cases = [
    { code: "en", htmlLang: "en", required: "completed 2026 World Cup", forbidden: /\blive results\b|\bpredictions\b/iu },
    { code: "zh", htmlLang: "zh-Hans", required: "已结束的2026世界杯", forbidden: /实时赛果|预测/u },
    { code: "es", htmlLang: "es-419", required: "Mundial 2026 ya terminado", forbidden: /resultados en vivo|pronósticos/iu },
    { code: "ko", htmlLang: "ko", required: "종료된 2026 월드컵", forbidden: /실시간 결과|전망|예측/u }
  ];
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const locale of cases) {
    await page.goto(getUrl(`/?view=matches&lang=${locale.code}`), { waitUntil: "domcontentloaded" });
    await waitForApp(page, locale, { expectRows: false });
    await page.waitForFunction(
      (required) => [
        document.querySelector('meta[name="description"]')?.content || "",
        document.querySelector('meta[property="og:description"]')?.content || "",
        document.querySelector('meta[name="twitter:description"]')?.content || ""
      ].every((value) => value.includes(required)),
      locale.required,
      { timeout: 30000 }
    );
    const metadata = await page.evaluate(() => ({
      description: document.querySelector('meta[name="description"]')?.content || "",
      openGraph: document.querySelector('meta[property="og:description"]')?.content || "",
      structuredDescription: (() => {
        try {
          return JSON.parse(document.querySelector("#seo-structured-data")?.textContent || "{}").description || "";
        } catch {
          return "";
        }
      })(),
      twitter: document.querySelector('meta[name="twitter:description"]')?.content || ""
    }));
    const values = Object.values(metadata);
    assert(
      values.every((value) => value.includes(locale.required) && value.includes("104") && !locale.forbidden.test(value)),
      `${locale.code}: archived home metadata must describe the completed 104-match edition without live-results or live-predictions wording. Measured ${JSON.stringify(metadata)}.`
    );
  }
  await context.close();
}

async function assertHistoricalRankTooltipBounds(browser) {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();
  await page.goto(getUrl("/highlights.html?year=1930&lang=en"), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      !document.body.classList.contains("is-locale-loading") &&
      !document.body.classList.contains("is-initial-page-load") &&
      document.querySelector("#edition-picker-button")?.dataset.edition === "1930",
    null,
    { timeout: 30000 }
  );
  const pill = page.locator(
    '[data-historical-story-index="1"] p .rank-pill[aria-label^="Argentina retrospective Elo ranking 1 (1930)."]'
  );
  await pill.dispatchEvent("pointerdown", {
    bubbles: true,
    button: 0,
    cancelable: true,
    pointerType: "touch"
  });
  const bounds = await pill.evaluate((element) => {
    const parsePx = (value) => Number.parseFloat(value) || 0;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element, "::after");
    const width = [
      style.width,
      style.paddingLeft,
      style.paddingRight,
      style.borderLeftWidth,
      style.borderRightWidth
    ].reduce((total, value) => total + parsePx(value), 0);
    const transformParts = style.transform.match(/^matrix\((.+)\)$/)?.[1]
      .split(",")
      .map((value) => parsePx(value));
    const left = rect.left + parsePx(style.left) + (transformParts?.[4] || 0);
    return {
      active: element.classList.contains("is-touch-tooltip-open"),
      left,
      right: left + width,
      viewportWidth: document.documentElement.clientWidth
    };
  });
  assert(
    bounds.active && bounds.left >= 5.5 && bounds.right <= bounds.viewportWidth - 5.5,
    `1930: the mobile retrospective Elo tooltip should stay inside the viewport. Measured ${JSON.stringify(bounds)}.`
  );
  await context.close();
}

async function assertHistoricalHighlightPlayerNotes(browser) {
  const historicalPlayerData = JSON.parse(
    await readFile(path.join(root, "data/historical-player-profiles.json"), "utf8")
  );
  const andradeProfile = historicalPlayerData.profiles?.["José Leandro Andrade / Uruguay / 1930"];
  const ademirProfile = historicalPlayerData.profiles?.["Ademir / Brazil / 1950"];
  assert(
    andradeProfile?.styleNoteMeta?.origin === "generated" &&
      ademirProfile?.styleNoteMeta?.origin === "generated",
    "Historical smoke profiles should retain generated-copy metadata."
  );
  const andradeLocalizedNames = {
    es: ES_ARCHIVE_PLAYER_NAME_TRANSLATIONS[andradeProfile.name] || andradeProfile.displayName,
    ko: KO_ARCHIVE_PLAYER_NAME_TRANSLATIONS[andradeProfile.name] || andradeProfile.displayName
  };
  const expectedAndradeNotes = {
    en: andradeProfile.styleNote,
    zh: andradeProfile.styleNoteZh,
    es: formatSpanishPlayerNote(andradeProfile.styleNote, {
      historical: true,
      copyMeta: andradeProfile.styleNoteMeta,
      localizedName: andradeLocalizedNames.es
    }),
    ko: formatKoreanPlayerNote(andradeProfile.styleNote, {
      historical: true,
      copyMeta: andradeProfile.styleNoteMeta,
      localizedName: andradeLocalizedNames.ko
    })
  };
  const localeCases = [
    {
      code: "en",
      andrade: expectedAndradeNotes.en,
      andradeMinimumLength: 140,
      stabile: "Stábile plays as a direct central forward who attacks space before defenders can settle. He stays ready between centre-backs and meets the final pass with minimal extra touches."
    },
    {
      code: "zh",
      andrade: expectedAndradeNotes.zh,
      andradeMinimumLength: 60,
      stabile: "斯塔比莱是直接攻击空当的中锋，会在防守者站稳前启动。他始终在两名中后卫之间准备接应，并尽量减少终结前的多余触球。"
    },
    {
      code: "es",
      andrade: expectedAndradeNotes.es,
      andradeMinimumLength: 140,
      stabile: "Stábile juega como un delantero centro vertical que ataca el espacio antes de que la defensa se acomode. Se mantiene preparado entre los centrales y remata el último pase con muy pocos toques."
    },
    {
      code: "ko",
      andrade: expectedAndradeNotes.ko,
      andradeMinimumLength: 100,
      stabile: "스타빌레는 수비가 자리 잡기 전에 공간을 공략하는 직선적인 중앙 공격수다. 센터백 사이에서 준비한 뒤 불필요한 터치를 줄여 마지막 패스를 슈팅으로 연결한다."
    }
  ];
  const readCard = async (page, playerName) => {
    const trigger = page.locator(
      `[data-highlight-player-name="${playerName}"] [data-highlight-player-trigger]`
    ).first();
    await trigger.tap();
    await page.locator("#highlight-player-card.is-visible").waitFor({ state: "visible" });
    return page.locator("#highlight-player-card").evaluate((card) => {
      const rect = card.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft || 0;
      const viewportTop = viewport?.offsetTop || 0;
      const viewportWidth = viewport?.width || window.innerWidth;
      const viewportHeight = viewport?.height || window.innerHeight;
      return {
        bounds: { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top },
        context: card.querySelector(".player-card-world-cup-context")?.textContent.trim() || "",
        meta: card.querySelector(".player-card-meta")?.textContent.replace(/\s+/gu, " ").trim() || "",
        note: card.querySelector('[data-player-copy-paragraph="1"]')?.textContent.trim() || "",
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        position: card.querySelector(".player-card-position")?.textContent.trim() || "",
        stats: card.querySelector(".player-card-tournament-stats")?.textContent.trim() || "",
        viewport: {
          bottom: viewportTop + viewportHeight,
          left: viewportLeft,
          right: viewportLeft + viewportWidth,
          top: viewportTop
        }
      };
    });
  };
  const isInsideViewport = (state) =>
    state.bounds.left >= state.viewport.left + 11 &&
    state.bounds.right <= state.viewport.right - 11 &&
    state.bounds.top >= state.viewport.top + 11 &&
    state.bounds.bottom <= state.viewport.bottom - 11 &&
    state.overflow <= 1;

  for (const locale of localeCases) {
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 }
    });
    const page = await context.newPage();
    const query = locale.code === "en" ? "?year=1930" : `?year=1930&lang=${locale.code}`;
    await page.goto(getUrl(`/highlights.html${query}`), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () =>
        !document.body.classList.contains("is-locale-loading") &&
        !document.body.classList.contains("is-initial-page-load") &&
        document.querySelector("#edition-picker-button")?.dataset.edition === "1930",
      null,
      { timeout: 30000 }
    );

    const andrade = await readCard(page, "José Leandro Andrade");
    const andradeIsLocalized =
      locale.code !== "es" && locale.code !== "ko"
        ? true
        : andrade.note !== andradeProfile.styleNote &&
          (locale.code === "es"
            ? /\b(?:balón|carril|compañeros)\b/iu.test(andrade.note)
            : /\p{Script=Hangul}/u.test(andrade.note));
    assert(
      andrade.note === locale.andrade &&
        andrade.note.length >= locale.andradeMinimumLength &&
        andradeIsLocalized &&
        andrade.stats === "" &&
        andrade.meta.includes("28") &&
        andrade.context.includes("1930") &&
        isInsideViewport(andrade),
      `${locale.code}: José Leandro Andrade's 1930 mobile card should use the rich localized play-style description and stay within the viewport. Measured ${JSON.stringify(andrade)}.`
    );
    await page.keyboard.press("Escape");

    const stabile = await readCard(page, "Guillermo Stábile");
    assert(
      stabile.note === locale.stabile &&
        stabile.stats.includes("1930") &&
        stabile.stats.includes("8") &&
        isInsideViewport(stabile),
      `${locale.code}: Guillermo Stábile's authored historical description should use its reviewed locale overlay. Measured ${JSON.stringify(stabile)}.`
    );
    await page.keyboard.press("Escape");

    if (locale.code === "en") {
      await page.goto(getUrl("/highlights.html?year=1950"), { waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        () =>
          !document.body.classList.contains("is-locale-loading") &&
          !document.body.classList.contains("is-initial-page-load") &&
          document.querySelector("#edition-picker-button")?.dataset.edition === "1950",
        null,
        { timeout: 30000 }
      );
      const ademir = await readCard(page, "Ademir de Menezes");
      assert(
        ademir.note === ademirProfile.styleNote &&
          ademir.note.length >= 140 &&
          ademir.position === "Forward" &&
          ademir.stats.includes("9 goals") &&
          isInsideViewport(ademir),
        `1950: Ademir de Menezes should resolve to Ademir's complete historical profile instead of a synthetic generic card. Measured ${JSON.stringify(ademir)}.`
      );
    }
    await context.close();
  }
}

async function assertHighlightsLocales(browser) {
  const selectedHighlightsLocaleCases = highlightsClubLinesOnly && requestedLocale
    ? highlightsLocaleCases.filter((locale) => locale.code === requestedLocale)
    : highlightsLocaleCases;
  assert(
    selectedHighlightsLocaleCases.length > 0,
    `Unknown highlights locale smoke selection: ${requestedLocale || "(none)"}`
  );
  for (const locale of selectedHighlightsLocaleCases) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const query = locale.code === "en" ? "" : `?lang=${locale.code}`;
    await page.goto(getUrl(`/highlights.html${query}`), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      ({ expectedLanguage, expectedTitle }) =>
        !document.body.classList.contains("is-locale-loading") &&
        !document.body.classList.contains("is-initial-page-load") &&
        document.documentElement.lang === expectedLanguage &&
        document.querySelector("#page-title")?.textContent.trim() === expectedTitle,
      { expectedLanguage: locale.htmlLang, expectedTitle: locale.pageTitle },
      { timeout: 30000 }
    );
    const measured = await page.evaluate(() => ({
      awardCount: document.querySelectorAll(".award-row").length,
      championIllustration: Boolean(
        document.querySelector(".champion-illustration .champion-illustration-trophy")
      ),
      championPhotoCount: document.querySelectorAll(".champion-photo-image").length,
      pageTitleTypography: (() => {
        const title = document.querySelector("#page-title");
        const style = title ? getComputedStyle(title) : null;
        return {
          family: style?.fontFamily || "",
          size: Number.parseFloat(style?.fontSize || "0"),
          style: style?.fontStyle || "",
          transform: style?.textTransform || ""
        };
      })(),
      brandHref: document.querySelector(".site-brand")?.getAttribute("href") || "",
      goldenBallMeaning:
        document.querySelector('[data-i18n="goldenBallMeaning"]')?.textContent.trim() || "",
      goldenBallImpact:
        document.querySelector('strong[data-i18n="goldenBallImpact"]')?.textContent.trim() || "",
      goldenBootName:
        document.querySelector("#golden-boot-name [data-highlight-player-trigger]")?.textContent.trim() ||
        Array.from(document.querySelector("#golden-boot-name")?.childNodes || [])
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent || "")
          .join("")
          .trim(),
      awardPlayerNumbers: ["golden-ball-name", "golden-boot-name", "golden-glove-name", "young-player-name"]
        .map((id) => document.querySelector(`#${id} .player-card-number`)?.textContent.trim() || ""),
      goldenGloveStat:
        document.querySelector('[data-i18n="goldenGloveStat"]')?.textContent.trim() || "",
      fairPlayStat:
        document.querySelector('strong[data-i18n="fairPlayStat"]')?.textContent.trim() || "",
      vanDijkClubLine:
        document.querySelector('[data-highlight-player-name="Virgil van Dijk"] .player-card-club')?.textContent.trim() || "",
      highlightCount: document.querySelectorAll(".highlight-row").length,
      highlightPlayerCardCount: document.querySelectorAll(
        ".highlight-player-card:not(.lineup-coach-card)"
      ).length,
      highlightPlayerCardsHaveAgeAndValue: Array.from(
        document.querySelectorAll(".highlight-player-card:not(.lineup-coach-card)")
      ).every((card) => {
        const meta = card.querySelector(".player-card-meta");
        return Boolean(
          meta &&
          meta.textContent.includes("•") &&
          meta.textContent.includes("€") &&
          /\d/.test(meta.textContent) &&
          meta.querySelector(".player-card-value-help")
        );
      }),
      bestXiTitle: document.querySelector("#best-xi-title")?.textContent.trim() || "",
      storiesTitle: document.querySelector("#highlights-title")?.textContent.trim() || "",
      bestXiInfo: document.querySelector(".best-xi-tabs .lineup-tab")?.getAttribute("aria-label") || "",
      bestXiHeaderInfoAbsent: !document.querySelector(".best-xi-info-button"),
      bestXiTabHasWorldMapEmoji: Boolean(
        document.querySelector(
          '.best-xi-tabs .lineup-tab-label-compact[aria-hidden="true"] .best-xi-world-map-icon'
        )?.textContent.trim() === "🗺️"
      ),
      bestXiTabText:
        document.querySelector(".best-xi-tabs .lineup-tab-label-compact")?.textContent.replace(/\s+/g, " ").trim() || "",
      bestCoachTriggerText: document.querySelector(".best-xi-coach-trigger")?.textContent.trim() || "",
      bestCoachAria: document.querySelector(".best-xi-coach-trigger")?.getAttribute("aria-label") || "",
      bestCoachCardCopy: document.querySelector(".best-xi-coach-card")?.textContent.trim() || "",
      bestCoachHasPortrait: Boolean(document.querySelector("#best-xi-coach-avatar img[src]")),
      bestCoachBeforeHonourables: (() => {
        const coach = document.querySelector(".best-xi-coach-trigger")?.getBoundingClientRect();
        const honourables = document.querySelector(".best-xi-honourables-button")?.getBoundingClientRect();
        return Boolean(coach && honourables && coach.right <= honourables.left);
      })(),
      bestXiFormationAbsent: !document.querySelector(".best-xi-band .lineup-formation-pill"),
      bestXiMarkerCount: document.querySelectorAll(".best-xi-marker").length,
      bestXiToggleCount: document.querySelectorAll("[data-best-xi-toggle]").length,
      honourableMentionsLabel:
        document.querySelector(".best-xi-honourables-button > span:first-child")?.textContent.trim() || "",
      honourableMentionsCount:
        document.querySelector(".best-xi-honourables-button .lineup-bench-count")?.textContent.trim() || "",
      honourableMentionsExpanded:
        document.querySelector(".best-xi-honourables-button")?.getAttribute("aria-expanded") || "",
      honourableMentionsHidden:
        document.querySelector(".best-xi-honourables-panel")?.getAttribute("aria-hidden") || "",
      honourableMentionsPlayerCount:
        document.querySelectorAll(".best-xi-honourables-panel .lineup-bench-player").length,
      honourableMentionsNumericBadgeCount:
        document.querySelectorAll(".best-xi-honourables-panel .lineup-bench-number").length,
      hasLegacyBestXiViewToggle: Boolean(document.querySelector(".best-xi-view-toggle")),
      bestXiNumericBadgeCount: document.querySelectorAll(".best-xi-marker .lineup-player-number").length,
      bestXiScoringBadgeCount: document.querySelectorAll(".best-xi-marker .lineup-avatar-score-events .lineup-event-score").length,
      bestXiRodriScoringBadges: Array.from(
        document.querySelectorAll('[data-best-xi-slot="dm"] .lineup-avatar-score-events .lineup-event-score-label'),
        (badge) => badge.textContent.trim()
      ),
      bestXiJudeScoringBadges: Array.from(
        document.querySelectorAll('[data-best-xi-slot="rcm"] .lineup-avatar-score-events .lineup-event-score-label'),
        (badge) => badge.textContent.trim()
      ),
      bestXiMbappeScoringBadges: Array.from(
        document.querySelectorAll('[data-best-xi-slot="lw"] .lineup-avatar-score-events .lineup-event-score-label'),
        (badge) => badge.textContent.trim()
      ),
      hasBestXiLegend: Boolean(document.querySelector(".best-xi-legend")),
      hasBestXiSourceStrip: Boolean(document.querySelector(".best-xi-source")),
      hasChampionStats: Boolean(document.querySelector(".intro-stats")),
      hasHighlightFootnote: Boolean(document.querySelector(".small-note")),
      hasMethodologyNote: Boolean(document.querySelector(".methodology-note")),
      hasAwardsFooter: Boolean(document.querySelector(".awards-footer")),
      headerVisible: (() => {
        const header = document.querySelector(".site-header");
        const bounds = header?.getBoundingClientRect();
        return Boolean(
          header &&
          getComputedStyle(header).display !== "none" &&
          bounds &&
          bounds.width > 0 &&
          bounds.height > 0
        );
      })(),
      starterGoalkeeper:
        document.querySelector('[data-best-xi-slot="gk"] .lineup-player-name')?.textContent.trim() || "",
      portraitCount: document.querySelectorAll(".award-player-photo").length,
      portraitImageCount: document.querySelectorAll(".award-player-photo img[src]").length,
      identityMetaCount: document.querySelectorAll(".award-row .award-meta").length,
      awardReadingOrder: Array.from(document.querySelectorAll(".award-row")).every((row) => {
        const summary = row.querySelector(".award-summary")?.getBoundingClientRect();
        const details = row.querySelector(".award-details")?.getBoundingClientRect();
        const recipient = row.querySelector(".award-recipient")?.getBoundingClientRect();
        const explanation = row.querySelector(".award-explanation")?.getBoundingClientRect();
        const portrait = row.querySelector(".award-player-photo")?.getBoundingClientRect();
        const name = row.querySelector(".award-player-name")?.getBoundingClientRect();
        const country = row.querySelector(".award-meta")?.getBoundingClientRect();
        if (!summary || !details || !recipient || !explanation || !name || !country) {
          return false;
        }
        return summary.right <= details.left && recipient.bottom <= explanation.top &&
          (!portrait || portrait.right <= name.left) && name.bottom <= country.top;
      }),
      alignedWinnerNames:
        new Set(
          Array.from(document.querySelectorAll(".award-player-name"), (name) =>
            Math.round(name.getBoundingClientRect().left * 10) / 10
          )
        ).size <= 2,
      fairPlayHasPortrait: Boolean(
        document.querySelector("#fair-play-name")?.closest(".award-row")?.querySelector(".award-player-photo")
      ),
      language: document.documentElement.lang,
      languageOptions: document.querySelectorAll("#language-select option").length,
      selectedLanguage: document.querySelector("#language-select")?.value || "",
      backLabel: document.querySelector("#back-link-label")?.textContent.trim() || "",
      editionPickerLabel: document.querySelector("#edition-picker-button")?.getAttribute("aria-label") || "",
      editionOptionCount: document.querySelectorAll("#edition-picker-grid .standings-year-option").length,
      selectedEdition: document.querySelector("#edition-picker-grid [aria-current=\"page\"]")?.textContent.trim() || "",
      hasSettingsEditionSelect: Boolean(document.querySelector("#settings-popover #edition-select")),
      settingsLabel: document.querySelector("#settings-button")?.getAttribute("aria-label") || "",
      languageLabel: document.querySelector("#settings-language-label")?.textContent.trim() || "",
      darkModeLabel: document.querySelector("#settings-dark-mode-label")?.textContent.trim() || "",
      homeLabel: document.querySelector("#settings-home-label")?.textContent.trim() || "",
      homeHref: document.querySelector("#settings-home-link")?.getAttribute("href") || "",
      hasSettingsPopover: Boolean(document.querySelector("#settings-popover")),
      hasDarkModeToggle: Boolean(document.querySelector("#dark-mode-toggle")),
      hasLegacyThemeButton: Boolean(document.querySelector("#theme-toggle")),
      timeline: {
        count: document.querySelectorAll(".next-world-cup-timeline .timeline-item").length,
        heading: document.querySelector("#next-world-cup-title")?.textContent.trim() || "",
        lead: document.querySelector('[data-i18n="nextWorldCupLead"]')?.textContent.trim() || "",
        dates: Array.from(document.querySelectorAll(".next-world-cup-timeline .timeline-date"), (node) =>
          node.textContent.replace(/\s+/gu, " ").trim()
        ),
        titles: Array.from(document.querySelectorAll(".next-world-cup-timeline .timeline-copy h3"), (node) =>
          node.textContent.trim()
        ),
        hostsBody: document.querySelector('[data-i18n="timelineHostsBody"]')?.textContent.trim() || "",
        markerLabels: Array.from(document.querySelectorAll(".next-world-cup-timeline .timeline-marker i"), (node) =>
          node.textContent.trim()
        ),
        stateOrder: Array.from(document.querySelectorAll(".next-world-cup-timeline .timeline-item"), (item) =>
          item.classList.contains("is-complete") ? "complete" : item.classList.contains("is-scheduled") ? "scheduled" : "pending"
        ),
        sourceCount: document.querySelectorAll(".next-world-cup-source").length
      },
      title: document.querySelector("#page-title")?.textContent.trim() || "",
      urlLanguage: new URL(window.location.href).searchParams.get("lang") || "en"
    }));

    assert(
      measured.headerVisible,
      `${locale.code}: The Awards page should keep its shared Back and Settings header visible.`
    );

    if (highlightsClubLinesOnly) {
      assert(
        measured.vanDijkClubLine === locale.vanDijkClubLine &&
          JSON.stringify(measured.awardPlayerNumbers) === JSON.stringify(["#16", "#10", "#23", "#22"]),
        `${locale.code}: awards cards should show localized club and league copy plus tournament shirt numbers. Measured ${JSON.stringify({ club: measured.vanDijkClubLine, numbers: measured.awardPlayerNumbers })}.`
      );
      await page.locator(".best-xi-honourables-button").click();
      await page.locator(
        '.best-xi-honourables-panel [data-best-xi-slot="gk"][data-best-xi-player-index="0"] [data-best-xi-player-trigger]'
      ).click();
      const bestXiClubLine = await page.locator("#best-xi-player-card .player-card-club").innerText();
      const bestXiWorldCupContext = await page.locator("#best-xi-player-card .player-card-world-cup-context").innerText();
      const bestXiFlagCount = await page.locator("#best-xi-player-card .player-card-flag .flag").count();
      const bestXiNumber = await page.locator("#best-xi-player-card .player-card-number").innerText();
      assert(
        bestXiClubLine.trim() === locale.bestXiClubLine &&
          bestXiWorldCupContext.trim() === locale.worldCupContext &&
          bestXiFlagCount === 1 &&
          bestXiNumber.trim() === "#23",
        `${locale.code}: the Best XI card should show its flag, tournament shirt number, and localized club and league instead of the national team. Measured ${JSON.stringify({ club: bestXiClubLine.trim(), flagCount: bestXiFlagCount, number: bestXiNumber.trim() })}.`
      );
      await page.keyboard.press("Escape");
      await page.locator(".best-xi-honourables-button").click();
      await page.locator(
        '.best-xi-marker[data-best-xi-slot="rcm"] [data-best-xi-player-trigger]'
      ).click();
      const judeMetadata = await page.evaluate(() => {
        const card = document.querySelector("#best-xi-player-card");
        return {
          context: card?.querySelector(".player-card-world-cup-context")?.textContent.trim() || "",
          club: card?.querySelector(".player-card-club")?.textContent.trim() || "",
          flagClass: card?.querySelector(".player-card-flag .flag")?.className || "",
          flagLabel: card?.querySelector(".player-card-flag .flag")?.getAttribute("aria-label") || ""
        };
      });
      assert(
        judeMetadata.club.length > 4 &&
          /[（(].+[）)]/u.test(judeMetadata.club) &&
          judeMetadata.flagClass.split(/\s+/u).includes("flag-england") &&
          judeMetadata.flagLabel.length > 4,
        `${locale.code}: Jude Bellingham's Best XI card should render the CSS-drawn England flag and profile club metadata. Measured ${JSON.stringify(judeMetadata)}.`
      );
      await page.keyboard.press("Escape");
      await page.locator(".best-xi-honourables-button").click();
      await page.locator(
        '.best-xi-honourables-panel [data-best-xi-player-name="Michael Olise"] [data-best-xi-player-trigger]'
      ).click();
      const oliseMetadata = await page.evaluate(() => {
        const card = document.querySelector("#best-xi-player-card");
        return {
          club: card?.querySelector(".player-card-club")?.textContent.trim() || "",
          flagCount: card?.querySelectorAll(".player-card-flag .flag").length || 0,
          number: card?.querySelector(".player-card-number")?.textContent.trim() || "",
          position: card?.querySelector(".player-card-position")?.textContent.trim() || "",
          skillCount: card?.querySelectorAll(".player-skill-list > span").length || 0
        };
      });
      assert(
        oliseMetadata.flagCount === 1 &&
          oliseMetadata.number === "#11" &&
          oliseMetadata.skillCount >= 3 &&
          /[（(].+[）)]/u.test(oliseMetadata.club) &&
          oliseMetadata.position.length > 4 &&
          (locale.code !== "en" || (
            oliseMetadata.position === "Winger, Attacking midfielder" &&
            oliseMetadata.club === "Bayern Munich (Bundesliga)"
          )),
        `${locale.code}: Michael Olise should reuse the original profile card metadata. Measured ${JSON.stringify(oliseMetadata)}.`
      );
      assert(
        pageErrors.length === 0,
        `${locale.code}: club-line rendering should not raise browser errors. Measured ${JSON.stringify(pageErrors)}.`
      );
      await page.goto(getUrl(`/${query}`), { waitUntil: "domcontentloaded" });
      await waitForApp(page, locale, { expectRows: false });
      const mainAppClubLines = await page.evaluate(async () => {
        const [playerData, historicalPlayerData] = await Promise.all([
          fetch("data/player-profiles.json").then((response) => response.json()),
          fetch("data/historical-player-profiles.json").then((response) => response.json())
        ]);
        const getLine = window.__worldCupTestHooks?.playerCards?.getLocalizedPlayerClubLine;
        const profile = playerData.profiles?.["Virgil van Dijk"];
        const historicalProfile = historicalPlayerData.profiles?.["Gerard Piqué / Spain / 2010"];
        const oldHistoricalProfile = historicalPlayerData.profiles?.["Alan A'Court / England / 1958"];
        return {
          current: getLine?.({ name: "Virgil van Dijk" }, profile) || "",
          historical: getLine?.(historicalProfile, historicalProfile) || "",
          oldHistorical: getLine?.(oldHistoricalProfile, oldHistoricalProfile) || ""
        };
      });
      assert(
        mainAppClubLines.current === locale.vanDijkClubLine &&
          mainAppClubLines.historical === locale.historicalClubLine &&
          mainAppClubLines.oldHistorical === locale.oldHistoricalClubLine,
        `${locale.code}: the main app should use the same localized club and league formatter for current and historical cards. Measured ${JSON.stringify(mainAppClubLines)}.`
      );
      await context.close();
      continue;
    }

    const expectedBrandHref = locale.code === "en" ? "./" : `./?lang=${locale.code}`;
    const timelineContract = timelineLocaleContracts[locale.code];
    assert(
      measured.awardCount === 5 &&
        !measured.championIllustration &&
        measured.championPhotoCount === 1 &&
        measured.pageTitleTypography.family.includes("Avenir Next Condensed") &&
        measured.pageTitleTypography.size <= 30 &&
        measured.pageTitleTypography.style === "italic" &&
        measured.pageTitleTypography.transform === "uppercase" &&
        measured.highlightCount === 3 &&
        measured.highlightPlayerCardCount > 0 &&
        measured.highlightPlayerCardsHaveAgeAndValue &&
        measured.vanDijkClubLine === locale.vanDijkClubLine &&
        measured.bestXiTitle === locale.bestXiTitle &&
        measured.storiesTitle === locale.storiesTitle &&
        measured.bestXiInfo === locale.bestXiInfo &&
        measured.bestXiHeaderInfoAbsent &&
        measured.bestXiTabHasWorldMapEmoji &&
        measured.bestXiTabText === `🗺️ ${locale.bestXiInfo}` &&
        measured.bestCoachTriggerText === "" &&
        measured.bestCoachAria.includes("Luis de la Fuente") &&
        measured.bestCoachAria.includes(locale.bestCoachReason) &&
        measured.bestCoachCardCopy.includes("Luis de la Fuente") &&
        measured.bestCoachCardCopy.includes(locale.bestCoachReason) &&
        measured.bestCoachHasPortrait &&
        measured.bestCoachBeforeHonourables &&
        measured.bestXiFormationAbsent &&
        measured.bestXiMarkerCount === 11 &&
        measured.bestXiToggleCount === 0 &&
        measured.honourableMentionsLabel === locale.benchLabel &&
        measured.honourableMentionsCount === "15" &&
        measured.honourableMentionsExpanded === "false" &&
        measured.honourableMentionsHidden === "true" &&
        measured.honourableMentionsPlayerCount === 15 &&
        measured.honourableMentionsNumericBadgeCount === 0 &&
        !measured.hasLegacyBestXiViewToggle &&
        measured.bestXiNumericBadgeCount === 0 &&
        measured.bestXiScoringBadgeCount === 10 &&
        measured.bestXiRodriScoringBadges.length === 0 &&
        JSON.stringify(measured.bestXiJudeScoringBadges) === JSON.stringify(["7G", "1A"]) &&
        JSON.stringify(measured.bestXiMbappeScoringBadges) === JSON.stringify(["10G", "4A"]) &&
        !measured.hasBestXiLegend &&
        !measured.hasBestXiSourceStrip &&
        !measured.hasChampionStats &&
        !measured.hasHighlightFootnote &&
        !measured.hasMethodologyNote &&
        measured.hasAwardsFooter &&
        measured.headerVisible &&
        measured.starterGoalkeeper === locale.starterGoalkeeper &&
        measured.portraitCount === 4 &&
        measured.portraitImageCount === 4 &&
        measured.identityMetaCount === 5 &&
        measured.awardReadingOrder &&
        measured.alignedWinnerNames &&
        !measured.fairPlayHasPortrait &&
        measured.languageOptions === 4 &&
        measured.language === locale.htmlLang &&
        measured.selectedLanguage === locale.code &&
        measured.urlLanguage === locale.code &&
        measured.brandHref === expectedBrandHref &&
        measured.title === locale.pageTitle &&
        measured.goldenBallMeaning === locale.goldenBallMeaning &&
        measured.goldenBallImpact === locale.goldenBallImpact &&
        measured.goldenGloveStat === locale.goldenGloveStat &&
        measured.fairPlayStat === locale.fairPlayStat &&
        measured.goldenBootName === locale.goldenBootName &&
        JSON.stringify(measured.awardPlayerNumbers) === JSON.stringify(["#16", "#10", "#23", "#22"]) &&
        measured.backLabel === locale.backLabel &&
        measured.editionPickerLabel.length > 4 &&
        measured.editionOptionCount === 23 &&
        measured.selectedEdition === "2026" &&
        !measured.hasSettingsEditionSelect &&
        measured.settingsLabel === locale.settingsLabel &&
        measured.languageLabel === locale.languageLabel &&
        measured.darkModeLabel === locale.darkModeLabel &&
        measured.homeLabel === locale.homeLabel &&
        measured.homeHref === expectedBrandHref &&
        measured.timeline.count === 3 &&
        measured.timeline.heading === timelineContract.heading &&
        measured.timeline.lead === timelineContract.lead &&
        JSON.stringify(measured.timeline.dates) === JSON.stringify(timelineContract.dates) &&
        JSON.stringify(measured.timeline.titles) === JSON.stringify(timelineContract.titles) &&
        measured.timeline.hostsBody === timelineContract.hostsBody &&
        JSON.stringify(measured.timeline.stateOrder) === JSON.stringify(["complete", "pending", "scheduled"]) &&
        JSON.stringify(measured.timeline.markerLabels) === JSON.stringify(["✓", "", ""]) &&
        measured.timeline.sourceCount === 0 &&
        measured.hasSettingsPopover &&
        measured.hasDarkModeToggle &&
        !measured.hasLegacyThemeButton &&
        pageErrors.length === 0,
      `${locale.code}: the awards page should render complete, localized copy and navigation without browser errors. Measured ${JSON.stringify({ measured, pageErrors })}.`
    );

    if (locale.code === "en") {
      const ferranHover = page.locator('[data-highlight-player-name="Ferran Torres"]');
      const ferranTrigger = ferranHover.locator("[data-highlight-player-trigger]");
      const ferranCard = ferranHover.locator(".highlight-player-card");
      for (const shouldOpenBelow of [false, true]) {
        if (shouldOpenBelow) {
          const triggerDocumentTop = await ferranTrigger.evaluate(
            (trigger) => trigger.getBoundingClientRect().top + window.scrollY
          );
          await page.evaluate((top) => window.scrollTo(0, Math.max(0, top - 80)), triggerDocumentTop);
        } else {
          await page.evaluate(() => window.scrollTo(0, 0));
        }
        await ferranTrigger.hover();
        await ferranCard.waitFor({ state: "visible" });
        const triggerBox = await ferranTrigger.boundingBox();
        const cardBox = await ferranCard.boundingBox();
        assert(triggerBox && cardBox, "Ferran Torres hover geometry should be measurable.");
        const bridgeX = Math.min(
          cardBox.x + cardBox.width - 4,
          Math.max(cardBox.x + 4, triggerBox.x + triggerBox.width / 2)
        );
        const cardIsAbove = cardBox.y + cardBox.height <= triggerBox.y;
        const bridgeY = cardIsAbove
          ? (cardBox.y + cardBox.height + triggerBox.y) / 2
          : (triggerBox.y + triggerBox.height + cardBox.y) / 2;
        await page.mouse.move(triggerBox.x + triggerBox.width / 2, triggerBox.y + triggerBox.height / 2);
        await page.mouse.move(bridgeX, bridgeY, { steps: 8 });
        await page.waitForTimeout(30);
        const visibleAcrossGap = await ferranCard.isVisible();
        const valueHelp = ferranCard.locator(".player-card-value-help").first();
        const valueBox = await valueHelp.boundingBox();
        assert(valueBox, "Ferran Torres Value help geometry should be measurable.");
        await page.mouse.move(valueBox.x + valueBox.width / 2, valueBox.y + valueBox.height / 2, { steps: 8 });
        await page.waitForTimeout(160);
        const hoverState = await ferranCard.evaluate((card) => {
          const value = card.querySelector(".player-card-value-help");
          const tooltip = value ? getComputedStyle(value, "::after") : null;
          const bridge = getComputedStyle(card, "::before");
          return {
            below: card.closest(".highlight-player-hover")?.classList.contains("is-card-below") || false,
            bridgeHeight: Number.parseFloat(bridge.height || "0"),
            cardVisible: getComputedStyle(card).visibility === "visible",
            tooltipOpacity: Number.parseFloat(tooltip?.opacity || "0"),
            tooltipVisibility: tooltip?.visibility || ""
          };
        });
        assert(
          visibleAcrossGap &&
            hoverState.cardVisible &&
            hoverState.below === shouldOpenBelow &&
            hoverState.bridgeHeight >= 10 &&
            hoverState.tooltipOpacity >= 0.99 &&
            hoverState.tooltipVisibility === "visible",
          `Highlights player cards should stay open across the ${shouldOpenBelow ? "below" : "above"} hover gap and expose Value help. Measured ${JSON.stringify(hoverState)}.`
        );
        await page.mouse.move(0, 0);
        await page.waitForTimeout(35);
        const fadeOutState = await ferranCard.evaluate((card) => {
          const styles = getComputedStyle(card);
          return {
            display: styles.display,
            opacity: Number.parseFloat(styles.opacity || "0"),
            visibility: styles.visibility
          };
        });
        assert(
          fadeOutState.display === "grid" &&
            fadeOutState.opacity > 0 &&
            fadeOutState.opacity < 1 &&
            fadeOutState.visibility === "visible",
          `Highlights player cards should fade out instead of disappearing immediately. Measured ${JSON.stringify(fadeOutState)}.`
        );
        await page.waitForTimeout(280);
        await ferranCard.waitFor({ state: "hidden" });
      }
      await page.evaluate(() => window.scrollTo(0, 0));
    }

    const coachTrigger = page.locator(".best-xi-coach-trigger");
    await coachTrigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(50);
    await page.mouse.move(0, 0);
    await coachTrigger.hover();
    await page.waitForFunction(
      () => document.querySelector(".best-xi-coach-trigger")?.getAttribute("aria-expanded") === "true",
      null,
      { timeout: 5000 }
    );
    const coachHoverState = await page.evaluate(() => {
      const trigger = document.querySelector(".best-xi-coach-trigger");
      const sourceCard = document.querySelector(".best-xi-coach-card");
      const card = document.querySelector("#highlight-player-card");
      const rect = card?.getBoundingClientRect();
      return {
        expanded: trigger?.getAttribute("aria-expanded") || "",
        open: trigger?.closest(".best-xi-coach-hover")?.classList.contains("is-card-open") || false,
        portaled: trigger?.closest(".best-xi-coach-hover")?.classList.contains("is-card-portaled") || false,
        display: card ? getComputedStyle(card).display : "",
        visibility: card ? getComputedStyle(card).visibility : "",
        sourceDisplay: sourceCard ? getComputedStyle(sourceCard).display : "",
        sourceHidden: sourceCard ? (
          getComputedStyle(sourceCard).display === "none" ||
          getComputedStyle(sourceCard).visibility === "hidden" ||
          Number.parseFloat(getComputedStyle(sourceCard).opacity || "1") === 0 ||
          sourceCard.getClientRects().length === 0
        ) : false,
        withinViewport: Boolean(
          rect && rect.left >= 0 && rect.top >= 0 &&
          rect.right <= window.innerWidth && rect.bottom <= window.innerHeight
        ),
        triggerText: trigger?.textContent.trim() || ""
      };
    });
    assert(
        coachHoverState.expanded === "true" && coachHoverState.open && coachHoverState.portaled &&
        coachHoverState.display === "grid" && coachHoverState.visibility === "visible" &&
        coachHoverState.sourceHidden && coachHoverState.withinViewport &&
        coachHoverState.triggerText === "",
      `${locale.code}: The avatar-only coach control should open its full card on hover. Measured ${JSON.stringify(coachHoverState)}.`
    );
    await coachTrigger.click();
    const coachCardState = await page.evaluate(() => {
      const trigger = document.querySelector(".best-xi-coach-trigger");
      const card = document.querySelector("#highlight-player-card");
      const rect = card?.getBoundingClientRect();
      return {
        expanded: trigger?.getAttribute("aria-expanded") || "",
        display: card ? getComputedStyle(card).display : "",
        hasPortrait: Boolean(card?.querySelector(".lineup-coach-card-photo img[src]")),
        hasProfileStructure: Boolean(
          card?.querySelector(".player-card-header") &&
          card?.querySelectorAll(".player-skill-list span").length === 3 &&
          card?.querySelectorAll(".lineup-coach-copy .player-card-note").length === 2 &&
          card?.querySelector(".player-card-club")
        ),
        sinceText: card?.querySelector(".player-card-club")?.textContent.trim() || "",
        styles: Array.from(
          card?.querySelectorAll(".player-skill-list span") || [],
          (node) => node.textContent.trim()
        ),
        copy: Array.from(
          card?.querySelectorAll(".lineup-coach-copy .player-card-note") || [],
          (node) => node.textContent.trim()
        ),
        withinViewport: Boolean(
          rect && rect.left >= 0 && rect.top >= 0 && rect.right <= window.innerWidth && rect.bottom <= window.innerHeight
        )
      };
    });
    assert(
      coachCardState.expanded === "true" && coachCardState.display === "grid" &&
        coachCardState.hasPortrait && coachCardState.hasProfileStructure &&
        coachCardState.sinceText.includes("2022") &&
        coachCardState.styles.every(Boolean) &&
        coachCardState.copy[0] === locale.bestCoachReason &&
        coachCardState.copy[1]?.includes("65") &&
        coachCardState.withinViewport,
      `${locale.code}: Best coach should keep its tournament rationale while reusing localized lineup tenure, style, and age details. Measured ${JSON.stringify(coachCardState)}.`
    );
    await page.keyboard.press("Escape");

    await page.locator(".best-xi-honourables-button").click();
    const honourableState = await page.evaluate(() => ({
      cardHidden: document.querySelector("#best-xi-player-card")?.getAttribute("aria-hidden"),
      expanded: document.querySelector(".best-xi-honourables-button")?.getAttribute("aria-expanded") || "",
      panelHidden: document.querySelector(".best-xi-honourables-panel")?.getAttribute("aria-hidden") || "",
      panelOpen: document.querySelector(".best-xi-honourables-panel")?.classList.contains("is-open") || false,
      playerCount: document.querySelectorAll(".best-xi-honourables-panel .best-xi-honourable-player").length,
      goalkeeperName:
        document.querySelector('.best-xi-honourables-panel [data-best-xi-slot="gk"][data-best-xi-player-index="0"] [data-best-xi-player-trigger]')?.textContent.trim() || "",
      extraPlayerCount: document.querySelectorAll(
        '.best-xi-honourables-panel [data-best-xi-player-index="1"]'
      ).length,
      vozinhaCount: document.querySelectorAll(
        '.best-xi-honourables-panel [data-best-xi-player-name="Vozinha"]'
      ).length,
      enzoStarterCount: document.querySelectorAll(
        '.best-xi-marker[data-best-xi-slot="lcm"] [data-best-xi-player-name="Enzo Fernandez"]'
      ).length,
      fabianHonourableCount: document.querySelectorAll(
        '.best-xi-honourables-panel [data-best-xi-slot="lcm"][data-best-xi-player-name="Fabian Ruiz"]'
      ).length,
      positionCodes: Array.from(
        document.querySelectorAll(".best-xi-honourables-panel .lineup-bench-position")
      ).map((position) => position.textContent.trim()),
      starterGoalkeeper:
        document.querySelector('.best-xi-marker[data-best-xi-slot="gk"] .lineup-player-name')?.textContent.trim() || "",
      subToggleCount: document.querySelectorAll("[data-best-xi-toggle]").length
    }));
    assert(
      honourableState.expanded === "true" &&
        honourableState.panelHidden === "false" &&
        honourableState.panelOpen &&
        honourableState.playerCount === 15 &&
        honourableState.extraPlayerCount === 4 &&
        honourableState.vozinhaCount === 1 &&
        honourableState.enzoStarterCount === 1 &&
        honourableState.fabianHonourableCount === 1 &&
        JSON.stringify(honourableState.positionCodes) === JSON.stringify([
          "GK", "GK", "RB", "CB", "CB", "CB", "LB", "DM", "DM", "CM", "CM", "RW", "RW", "ST", "RW"
        ]) &&
        honourableState.goalkeeperName === locale.honourableGoalkeeper &&
        honourableState.starterGoalkeeper === locale.starterGoalkeeper &&
        honourableState.subToggleCount === 0 &&
        honourableState.cardHidden === "true",
      `${locale.code}: Honorable Mentions should open as a 15-player bench with four researched additions, keep Enzo in the XI and move Fabián to the bench. Measured ${JSON.stringify(honourableState)}.`
    );

    const honourableGoalkeeperTrigger = page.locator(
      '.best-xi-honourables-panel [data-best-xi-slot="gk"][data-best-xi-player-index="0"] [data-best-xi-player-trigger]'
    );
    await honourableGoalkeeperTrigger.click();
    const cardState = await page.evaluate(() => {
      const trigger = document.querySelector('.best-xi-honourables-panel [data-best-xi-slot="gk"] [data-best-xi-player-trigger]');
      const card = document.querySelector("#best-xi-player-card");
      const rect = card?.getBoundingClientRect();
      return {
        describedBy: trigger?.getAttribute("aria-describedby") || "",
        expanded: trigger?.getAttribute("aria-expanded") || "",
        hidden: card?.getAttribute("aria-hidden") || "",
        hasAgeAndValue: Boolean(
          card?.querySelector(".player-card-meta")?.textContent.includes("•") &&
          card?.querySelector(".player-card-meta")?.textContent.includes("€") &&
          /\d/.test(card?.querySelector(".player-card-meta")?.textContent || "") &&
          card?.querySelector(".player-card-meta .player-card-value-help")
        ),
        skillPills: Array.from(
          card?.querySelectorAll(".player-skill-list > span") || [],
          (item) => item.textContent.trim()
        ),
        referenceSkillPills: Array.from(
          document.querySelectorAll("#golden-glove-name .player-skill-list > span"),
          (item) => item.textContent.trim()
        ),
        hasFlag: Boolean(card?.querySelector(".player-card-flag .flag")),
        number: card?.querySelector(".player-card-number")?.textContent.trim() || "",
        clubLine: card?.querySelector(".player-card-club")?.textContent.trim() || "",
        tournamentStats: card?.querySelector(".player-card-tournament-stats")?.textContent.trim() || "",
        reasonParagraphs: Array.from(
          card?.querySelectorAll(".best-xi-player-reason") || [],
          (paragraph) => paragraph.textContent.trim()
        ),
        withinViewport: Boolean(
          rect && rect.left >= 0 && rect.top >= 0 && rect.right <= window.innerWidth && rect.bottom <= window.innerHeight
        )
      };
    });
    assert(
      cardState.describedBy === "best-xi-player-card" &&
        cardState.expanded === "true" &&
        cardState.hidden === "false" &&
        cardState.clubLine === locale.bestXiClubLine &&
        cardState.hasAgeAndValue &&
        cardState.skillPills.length > 0 &&
        JSON.stringify(cardState.skillPills) === JSON.stringify(cardState.referenceSkillPills) &&
        cardState.hasFlag &&
        cardState.number === "#23" &&
        cardState.tournamentStats === locale.zeroTournamentStats &&
        /[（(].+[）)]/u.test(cardState.clubLine) &&
        cardState.reasonParagraphs.length === 2 &&
        cardState.reasonParagraphs.every(Boolean) &&
        cardState.withinViewport,
      `${locale.code}: the player trigger should open one associated, readable card inside the viewport. Measured ${JSON.stringify(cardState)}.`
    );
    if (locale.code === "en") {
      const bestXiCard = page.locator("#best-xi-player-card");
      const triggerBox = await honourableGoalkeeperTrigger.boundingBox();
      const cardBox = await bestXiCard.boundingBox();
      assert(triggerBox && cardBox, "Best XI hover geometry should be measurable.");
      const bridgeX = Math.min(
        cardBox.x + cardBox.width - 4,
        Math.max(cardBox.x + 4, triggerBox.x + triggerBox.width / 2)
      );
      const cardIsAbove = cardBox.y + cardBox.height <= triggerBox.y;
      const bridgeY = cardIsAbove
        ? (cardBox.y + cardBox.height + triggerBox.y) / 2
        : (triggerBox.y + triggerBox.height + cardBox.y) / 2;
      await page.mouse.move(triggerBox.x + triggerBox.width / 2, triggerBox.y + triggerBox.height / 2);
      await page.mouse.move(bridgeX, bridgeY, { steps: 6 });
      await page.waitForTimeout(150);
      const visibleDuringHandoff = await bestXiCard.isVisible();
      const valueHelp = bestXiCard.locator(".player-card-value-help").first();
      const valueBox = await valueHelp.boundingBox();
      assert(valueBox, "Best XI Value help geometry should be measurable.");
      await page.mouse.move(valueBox.x + valueBox.width / 2, valueBox.y + valueBox.height / 2, { steps: 6 });
      await valueHelp.focus();
      try {
        await page.waitForFunction(
          () => {
            const card = document.querySelector("#best-xi-player-card");
            const value = card?.querySelector(".player-card-value-help");
            const tooltip = value ? getComputedStyle(value, "::after") : null;
            return (
              card?.classList.contains("is-visible") &&
              card.getAttribute("aria-hidden") === "false" &&
              Number.parseFloat(tooltip?.opacity || "0") >= 0.99 &&
              tooltip?.visibility === "visible"
            );
          },
          null,
          { timeout: 1000 }
        );
      } catch {
        // Fall through to the measured assertion below for the detailed failure message.
      }
      const bestXiHoverState = await bestXiCard.evaluate((card) => {
        const value = card.querySelector(".player-card-value-help");
        const tooltip = value ? getComputedStyle(value, "::after") : null;
        const cardRect = card.getBoundingClientRect();
        const valueRect = value?.getBoundingClientRect();
        const transform = tooltip?.transform.match(/^matrix\((.+)\)$/);
        const translateX = transform
          ? Number.parseFloat(transform[1].split(",")[4]) || 0
          : 0;
        const tooltipWidth = tooltip
          ? Number.parseFloat(tooltip.width || "0") +
            Number.parseFloat(tooltip.paddingLeft || "0") +
            Number.parseFloat(tooltip.paddingRight || "0") +
            Number.parseFloat(tooltip.borderLeftWidth || "0") +
            Number.parseFloat(tooltip.borderRightWidth || "0")
          : 0;
        const tooltipLeft = valueRect && tooltip
          ? valueRect.left + Number.parseFloat(tooltip.left || "0") + translateX
          : 0;
        const clipLeft = cardRect.left + card.clientLeft;
        const clipRight = clipLeft + card.clientWidth;
        return {
          cardVisible: card.classList.contains("is-visible") && card.getAttribute("aria-hidden") === "false",
          tooltipOpacity: Number.parseFloat(tooltip?.opacity || "0"),
          tooltipVisibility: tooltip?.visibility || "",
          tooltipWithinCard: tooltipLeft >= clipLeft + 5 && tooltipLeft + tooltipWidth <= clipRight - 5,
          tooltipBounds: {
            clipLeft,
            clipRight,
            left: tooltipLeft,
            right: tooltipLeft + tooltipWidth
          }
        };
      });
      assert(
        visibleDuringHandoff &&
          bestXiHoverState.cardVisible &&
          bestXiHoverState.tooltipOpacity >= 0.99 &&
          bestXiHoverState.tooltipVisibility === "visible" &&
          bestXiHoverState.tooltipWithinCard,
        `Best XI player cards should survive the hover handoff and expose Value help. Measured ${JSON.stringify(bestXiHoverState)}.`
      );
      await page.mouse.move(0, 0);
      await page.waitForTimeout(255);
      const bestXiFadeOutState = await bestXiCard.evaluate((card) => {
        const styles = getComputedStyle(card);
        return {
          opacity: Number.parseFloat(styles.opacity || "0"),
          visibility: styles.visibility
        };
      });
      assert(
        bestXiFadeOutState.opacity > 0 &&
          bestXiFadeOutState.opacity < 1 &&
          bestXiFadeOutState.visibility === "visible",
        `Best XI player cards should fade out after the hover handoff. Measured ${JSON.stringify(bestXiFadeOutState)}.`
      );
      await page.waitForTimeout(280);
      await bestXiCard.waitFor({ state: "hidden" });
    }
    await page.keyboard.press("Escape");

    for (const width of [390, 360, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      ));
      await coachTrigger.click();
      const responsiveAwardLayout = await page.evaluate(() => {
        const pitch = document.querySelector("#best-xi-pitch")?.getBoundingClientRect();
        const band = document.querySelector(".best-xi-band")?.getBoundingClientRect();
        const coach = document.querySelector(".best-xi-coach-trigger")?.getBoundingClientRect();
        const honourables = document.querySelector(".best-xi-honourables-button")?.getBoundingClientRect();
        const coachCard = document.querySelector("#highlight-player-card")?.getBoundingClientRect();
        const timeline = document.querySelector(".next-world-cup-section")?.getBoundingClientRect();
        const timelineItems = Array.from(document.querySelectorAll(".next-world-cup-timeline .timeline-item"));
        const scoringBadges = Array.from(document.querySelectorAll(".best-xi-marker .lineup-avatar-score-events"));
        const playerTargets = Array.from(document.querySelectorAll(
          ".best-xi-marker :is(.lineup-avatar-frame, .lineup-player-name)"
        ));
        const overlaps = (first, second) =>
          first.left < second.right && first.right > second.left &&
          first.top < second.bottom && first.bottom > second.top;
        const scoringBadgeIssues = scoringBadges.flatMap((badge) => {
          const badgeBounds = badge.getBoundingClientRect();
          const ownMarker = badge.closest(".best-xi-marker");
          const issues = [];
          if (pitch && (badgeBounds.left < pitch.left - 1 || badgeBounds.right > pitch.right + 1 || badgeBounds.top < pitch.top - 1 || badgeBounds.bottom > pitch.bottom + 1)) {
            issues.push("outside-pitch");
          }
          for (const target of playerTargets) {
            if (target.closest(".best-xi-marker") !== ownMarker && overlaps(badgeBounds, target.getBoundingClientRect())) {
              issues.push(`overlap:${target.closest(".best-xi-marker")?.dataset.bestXiSlot || "unknown"}`);
            }
          }
          return issues.map((issue) => ({
            badge: badge.textContent.replace(/\s+/gu, " ").trim(),
            badgeBounds: { left: badgeBounds.left, right: badgeBounds.right },
            issue,
            pitchBounds: pitch ? { left: pitch.left, right: pitch.right } : null,
            slot: ownMarker?.dataset.bestXiSlot || ""
          }));
        });
        return {
          bestCoachLayoutClear: Boolean(band && coach && honourables) &&
            coach.left >= band.left && honourables.right <= band.right &&
            (coach.bottom <= honourables.top || coach.right <= honourables.left) &&
            Boolean(coachCard) && coachCard.left >= 0 && coachCard.right <= window.innerWidth &&
            coachCard.top >= 0 && coachCard.bottom <= window.innerHeight,
          bestXiScoringBadgesClear: Boolean(pitch) && scoringBadgeIssues.length === 0,
          bestXiScoringBadgeIssues: scoringBadgeIssues,
          hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
          timelineContained: Boolean(timeline) &&
            timeline.left >= 0 && timeline.right <= window.innerWidth &&
            timelineItems.length === 3 && timelineItems.every((item) => {
              const bounds = item.getBoundingClientRect();
              return bounds.left >= 0 && bounds.right <= window.innerWidth;
            }),
          rowsFollowReadingOrder: Array.from(document.querySelectorAll(".award-row")).every((row) => {
          const summary = row.querySelector(".award-summary")?.getBoundingClientRect();
          const details = row.querySelector(".award-details")?.getBoundingClientRect();
          const recipient = row.querySelector(".award-recipient")?.getBoundingClientRect();
          const explanation = row.querySelector(".award-explanation")?.getBoundingClientRect();
          const portrait = row.querySelector(".award-player-photo")?.getBoundingClientRect();
          const name = row.querySelector(".award-player-name")?.getBoundingClientRect();
          const country = row.querySelector(".award-meta")?.getBoundingClientRect();
          if (!summary || !details || !recipient || !explanation || !name || !country) {
            return false;
          }
          return summary.right <= details.left && recipient.bottom <= explanation.top &&
            (!portrait || portrait.right <= name.left) && name.bottom <= country.top;
          })
        };
      });
      await page.keyboard.press("Escape");
      assert(
        !responsiveAwardLayout.hasOverflow && responsiveAwardLayout.rowsFollowReadingOrder &&
          responsiveAwardLayout.bestCoachLayoutClear && responsiveAwardLayout.bestXiScoringBadgesClear &&
          responsiveAwardLayout.timelineContained,
        `${locale.code}: awards and Best XI controls should preserve their reading order and collision-free mobile layout at ${width}px. Measured ${JSON.stringify(responsiveAwardLayout)}.`
      );
    }

    const jointFairPlayQuery = locale.code === "en" ? "?year=1998" : `?year=1998&lang=${locale.code}`;
    await page.goto(getUrl(`/highlights.html${jointFairPlayQuery}`), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () =>
        !document.body.classList.contains("is-locale-loading") &&
        !document.body.classList.contains("is-initial-page-load") &&
        document.querySelector("#edition-picker-button")?.dataset.edition === "1998",
      undefined,
      { timeout: 30000 }
    );
    const jointFairPlayCard = await page.evaluate(async (language) => {
      const sourcePath = language === "en"
        ? "data/historical-awards.json"
        : `data/locales/${language}/historical-awards.json`;
      const expected = (await (await fetch(sourcePath, { cache: "no-store" })).json()).editions["1998"].fairPlay;
      const normalize = (value) => String(value || "").replace(/\s+/gu, " ").trim();
      const meta = document.querySelector("#fair-play-meta");
      const flags = Array.from(document.querySelectorAll("#fair-play-flag .flag"));
      return {
        actualFlags: flags.map((flag) => normalize(flag.textContent)),
        actualFlagClasses: flags.map((flag) => flag.className),
        allFlagsAriaHidden: flags.every((flag) => flag.getAttribute("aria-hidden") === "true"),
        flagContainerAriaHidden: document.querySelector("#fair-play-flag")?.getAttribute("aria-hidden") === "true",
        actualMeta: normalize(meta?.innerText),
        actualName: normalize(document.querySelector("#fair-play-name")?.textContent),
        captainTriggerCount: meta?.querySelectorAll("[data-highlight-player-trigger]").length || 0,
        expectedMeta: normalize(expected.captainMeta),
        staleMention: meta?.getAttribute("data-highlight-player-mentions") || ""
      };
    }, locale.code);
    assert(
      jointFairPlayCard.actualFlagClasses.some((className) => className.split(/\s+/u).includes("flag-england")) &&
        jointFairPlayCard.actualFlags.includes("🇫🇷") &&
        !jointFairPlayCard.actualFlags.includes("🤝") &&
        jointFairPlayCard.allFlagsAriaHidden &&
        jointFairPlayCard.flagContainerAriaHidden &&
        jointFairPlayCard.actualName.length > 0 &&
        jointFairPlayCard.captainTriggerCount === 2 &&
        jointFairPlayCard.actualMeta === jointFairPlayCard.expectedMeta &&
        jointFairPlayCard.staleMention === "",
      `${locale.code}: the 1998 joint Fair Play card should show both correct flags and player-card links for both localized captains without stale 2026 metadata. Measured ${JSON.stringify(jointFairPlayCard)}.`
    );

    if (locale.code === "en") {
      await page.goto(getUrl("/highlights.html?year=1966"), { waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        () =>
          !document.body.classList.contains("is-locale-loading") &&
          !document.body.classList.contains("is-initial-page-load") &&
          document.querySelector("#edition-picker-button")?.dataset.edition === "1966",
        undefined,
        { timeout: 30000 }
      );
      const championFallbackFlag = await page.evaluate(() => {
        document.querySelector("#champion-photo .champion-photo-image")?.dispatchEvent(new Event("error"));
        const flag = document.querySelector("#champion-flag");
        const bounds = flag?.getBoundingClientRect();
        return {
          className: flag?.className || "",
          text: flag?.textContent.trim() || "",
          width: bounds?.width || 0,
          height: bounds?.height || 0
        };
      });
      assert(
        championFallbackFlag.className.split(/\s+/u).includes("flag-england") &&
          championFallbackFlag.text === "" &&
          championFallbackFlag.width > championFallbackFlag.height &&
          championFallbackFlag.height > 0,
        `The 1966 champion-photo fallback should render the shared CSS-drawn England flag. Measured ${JSON.stringify(championFallbackFlag)}.`
      );
    }

    const historicalQuery = locale.code === "en" ? "?year=2022" : `?year=2022&lang=${locale.code}`;
    const historicalTimelineContract = historical2022TimelineContracts[locale.code];
    await page.goto(getUrl(`/highlights.html${historicalQuery}`), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      ({ expectedHeading, expectedLanguage }) =>
        !document.body.classList.contains("is-locale-loading") &&
        !document.body.classList.contains("is-initial-page-load") &&
        document.documentElement.lang === expectedLanguage &&
        document.querySelector("#edition-picker-button")?.dataset.edition === "2022" &&
        document.querySelector("#next-world-cup-title")?.textContent.trim() === expectedHeading,
      { expectedHeading: historicalTimelineContract.heading, expectedLanguage: locale.htmlLang },
      { timeout: 30000 }
    );
    const historicalTimeline = await page.evaluate(() => ({
      dates: Array.from(document.querySelectorAll(".next-world-cup-timeline .timeline-date"), (node) =>
        node.textContent.replace(/\s+/gu, " ").trim()
      ),
      hasArchivedNextLink: Boolean(document.querySelector(".historical-next-edition-link")),
      heading: document.querySelector("#next-world-cup-title")?.textContent.trim() || "",
      lead: document.querySelector("#next-world-cup-lead")?.textContent.trim() || "",
      markerLabels: Array.from(document.querySelectorAll(".next-world-cup-timeline .timeline-marker i"), (node) =>
        node.textContent.trim()
      ),
      stateClasses: Array.from(document.querySelectorAll(".next-world-cup-timeline .timeline-item"), (item) =>
        ["is-complete", "is-pending", "is-scheduled", "is-final"].filter((className) => item.classList.contains(className))
      ),
      titles: Array.from(document.querySelectorAll(".next-world-cup-timeline .timeline-copy h3"), (node) =>
        node.textContent.trim()
      )
    }));
    assert(
      historicalTimeline.heading === historicalTimelineContract.heading &&
        historicalTimeline.lead === historicalTimelineContract.lead &&
        JSON.stringify(historicalTimeline.dates) === JSON.stringify(historicalTimelineContract.dates) &&
        JSON.stringify(historicalTimeline.titles) === JSON.stringify(historicalTimelineContract.titles) &&
        JSON.stringify(historicalTimeline.stateClasses) === JSON.stringify([["is-complete"], ["is-complete"], ["is-complete"]]) &&
        JSON.stringify(historicalTimeline.markerLabels) === JSON.stringify(["✓", "✓", "✓"]) &&
        !historicalTimeline.hasArchivedNextLink,
      `${locale.code}: the 2022 highlights page should show the researched, localized 2026 preview with three completed milestones. Measured ${JSON.stringify(historicalTimeline)}.`
    );
    const historicalStorySurface = await page.evaluate(async ({ language, expectedTitle }) => {
      const sourcePath = language === "en"
        ? "data/historical-stories.json"
        : `data/locales/${language}/historical-stories.json`;
      const source = await (await fetch(sourcePath, { cache: "no-store" })).json();
      const tokenPattern = /\{(team|player):([^|{}]+)\|([^{}]+)\}/gu;
      const normalize = (value) => String(value || "")
        .replace(/\s+/gu, " ")
        .replace(/\s+(['’][\p{Letter}])/gu, "$1")
        .replace(/\s+([,.;:!?])/gu, "$1")
        .trim();
      const visibleCopy = (value) => normalize(String(value || "").replace(
        tokenPattern,
        (_, type, canonicalName, visibleText) => visibleText
      ));
      const renderedVisibleCopy = (element) => {
        const clone = element?.cloneNode(true);
        clone?.querySelectorAll(".football-team-rank-token").forEach((token) => {
          token.querySelectorAll(".rank-pill").forEach((pill) => pill.remove());
          token.textContent = token.textContent.trimEnd();
        });
        clone?.querySelectorAll(".player-card").forEach((node) => node.remove());
        return normalize(clone?.textContent);
      };
      const expectedStories = source.editions["2022"];
      const expectedTokenTypes = expectedStories.flatMap((story) =>
        [story.title, story.body].flatMap((value) =>
          [...String(value || "").matchAll(tokenPattern)].map((match) => match[1])
        )
      );
      const renderedStories = Array.from(document.querySelectorAll("#highlight-list .highlight-row"), (row) => ({
        title: renderedVisibleCopy(row.querySelector("h3")),
        body: renderedVisibleCopy(row.querySelector("p"))
      }));
      return {
        expectedStories: expectedStories.map((story) => ({
          title: visibleCopy(story.title),
          body: visibleCopy(story.body)
        })),
        renderedStories,
        heading: normalize(document.querySelector("#highlights-title")?.textContent),
        expectedTitle,
        linkCount: document.querySelectorAll("#highlight-list a").length,
        rawTokenCount: Array.from(document.querySelectorAll("#highlight-list .highlight-row"))
          .filter((row) => /\{(?:team|player):/u.test(row.textContent || "")).length,
        rankPillCount: document.querySelectorAll("#highlight-list .rank-pill").length,
        expectedRankPillCount: expectedTokenTypes.filter((type) => type === "team").length,
        playerTriggerCount: document.querySelectorAll("#highlight-list [data-highlight-player-trigger]").length,
        expectedPlayerTriggerCount: expectedTokenTypes.filter((type) => type === "player").length,
        allRankTooltipsUseFifa: Array.from(document.querySelectorAll("#highlight-list .rank-pill"))
          .every((pill) => String(pill.getAttribute("data-tooltip") || "").includes("FIFA")),
        allPlayerTriggersHaveCards: Array.from(
          document.querySelectorAll("#highlight-list [data-highlight-player-trigger]")
        ).every((trigger) => Boolean(trigger.parentElement?.querySelector(".highlight-player-card")))
      };
    }, { language: locale.code, expectedTitle: locale.storiesTitle });
    assert(
      historicalStorySurface.heading === historicalStorySurface.expectedTitle &&
        JSON.stringify(historicalStorySurface.renderedStories) ===
          JSON.stringify(historicalStorySurface.expectedStories) &&
        historicalStorySurface.linkCount === 0 &&
        historicalStorySurface.rawTokenCount === 0 &&
        historicalStorySurface.rankPillCount === historicalStorySurface.expectedRankPillCount &&
        historicalStorySurface.playerTriggerCount === historicalStorySurface.expectedPlayerTriggerCount &&
        historicalStorySurface.allRankTooltipsUseFifa &&
        historicalStorySurface.allPlayerTriggersHaveCards,
      `${locale.code}: the 2022 story section should use localized copy, ranking pills and player cards without video links. Measured ${JSON.stringify(historicalStorySurface)}.`
    );
    const localizedHistoricalAwards = await page.evaluate(async (language) => {
      const sourcePath = language === "en"
        ? "data/historical-awards.json"
        : `data/locales/${language}/historical-awards.json`;
      const response = await fetch(sourcePath, { cache: "no-store" });
      const source = await response.json();
      const expected = source.editions["2022"];
      const normalize = (value) => String(value || "").replace(/\s+/gu, " ").trim();
      const visibleText = (element) => {
        const clone = element?.cloneNode(true);
        clone?.querySelectorAll(".player-card").forEach((card) => card.remove());
        return normalize(clone?.textContent);
      };
      const awardPlayerTriggers = Array.from(
        document.querySelectorAll('.award-list [data-award-key]:not([hidden]) .award-player-name [data-highlight-player-trigger]')
      );
      const awardDescriptionTriggers = Array.from(
        document.querySelectorAll('.award-list [data-award-key]:not([hidden]) .award-explanation [data-highlight-player-trigger]')
      );
      const fairPlayCaptainTriggers = Array.from(
        document.querySelectorAll("#fair-play-meta [data-highlight-player-trigger]")
      );
      const captainCardFlag = fairPlayCaptainTriggers[0]
        ?.closest(".highlight-player-hover")
        ?.querySelector(".highlight-player-card .player-card-flag .flag");
      const textWithoutPlayerCards = (selector) => {
        const clone = document.querySelector(selector)?.cloneNode(true);
        clone?.querySelectorAll(".highlight-player-card").forEach((card) => card.remove());
        return normalize(clone?.textContent);
      };
      return {
        actualBootLabel: normalize(document.querySelector('[data-award-key="goldenBoot"] .award-label')?.textContent),
        actualBootName: visibleText(document.querySelector("#golden-boot-name")),
        actualBootCopy: textWithoutPlayerCards("#golden-boot-explanation"),
        actualFairPlayCopy: textWithoutPlayerCards("#fair-play-explanation"),
        actualFairPlayMeta: normalize(document.querySelector("#fair-play-meta")?.innerText),
        awardPlayerTriggerCount: awardPlayerTriggers.length,
        awardDescriptionTriggerCount: awardDescriptionTriggers.length,
        fairPlayCaptainTriggerCount: fairPlayCaptainTriggers.length,
        allAwardTriggersHaveCards: [...awardPlayerTriggers, ...awardDescriptionTriggers, ...fairPlayCaptainTriggers].every((trigger) =>
          Boolean(trigger.closest(".highlight-player-hover")?.querySelector(".highlight-player-card"))
        ),
        fairPlayFlagClass: document.querySelector("#fair-play-flag .flag")?.className || "",
        fairPlayFlagsAriaHidden: Array.from(document.querySelectorAll("#fair-play-flag .flag")).every(
          (flag) => flag.getAttribute("aria-hidden") === "true"
        ),
        captainCardFlagClass: captainCardFlag?.className || "",
        captainCardFlagLabel: captainCardFlag?.getAttribute("aria-label") || "",
        expectedBootLabel: source.labels.goldenBoot.label,
        expectedBootName: expected.goldenBoot.recipientNames[0],
        expectedBootCopy: normalize(`${expected.goldenBoot.stat} ${expected.goldenBoot.context}`),
        expectedFairPlayCopy: normalize(`${expected.fairPlay.context} ${expected.fairPlay.stat}`),
        expectedFairPlayMeta: normalize(expected.fairPlay.captainMeta)
      };
    }, locale.code);
    assert(
      localizedHistoricalAwards.actualBootLabel === localizedHistoricalAwards.expectedBootLabel &&
        localizedHistoricalAwards.actualBootName === localizedHistoricalAwards.expectedBootName &&
        localizedHistoricalAwards.actualBootCopy === localizedHistoricalAwards.expectedBootCopy &&
        localizedHistoricalAwards.actualFairPlayCopy === localizedHistoricalAwards.expectedFairPlayCopy &&
        localizedHistoricalAwards.actualFairPlayMeta === localizedHistoricalAwards.expectedFairPlayMeta &&
        localizedHistoricalAwards.awardPlayerTriggerCount === 4 &&
        localizedHistoricalAwards.awardDescriptionTriggerCount === Object.entries(HISTORICAL_AWARD_CONTEXT_PLAYERS)
          .filter(([key]) => key.startsWith("2022|"))
          .reduce((count, [, references]) => count + references.length, 0) &&
        localizedHistoricalAwards.fairPlayCaptainTriggerCount === 1 &&
        localizedHistoricalAwards.allAwardTriggersHaveCards &&
        localizedHistoricalAwards.fairPlayFlagClass.split(/\s+/u).includes("flag-england") &&
        localizedHistoricalAwards.fairPlayFlagsAriaHidden &&
        localizedHistoricalAwards.captainCardFlagClass.split(/\s+/u).includes("flag-england") &&
        localizedHistoricalAwards.captainCardFlagLabel.length > 4,
      `${locale.code}: the historical award cards should use the researched locale pack, correct flags and player cards for every profiled recipient and captain. Measured ${JSON.stringify(localizedHistoricalAwards)}.`
    );
    await page.locator(
      '[data-best-xi-player-name="Kylian Mbappé"] [data-best-xi-player-trigger]'
    ).click();
    const historicalMbappeCard = await page.evaluate(() => {
      const card = document.querySelector("#best-xi-player-card");
      const cardRect = card?.getBoundingClientRect();
      const valueHelp = Array.from(card?.querySelectorAll(".player-card-meta .player-card-value-help") || []);
      return {
        context: card?.querySelector(".player-card-world-cup-context")?.textContent.trim() || "",
        tournamentStats: card?.querySelector(".player-card-tournament-stats")?.textContent.trim() || "",
        meta: card?.querySelector(".player-card-meta")?.textContent.replace(/\s+/gu, " ").trim() || "",
        paragraphs: Array.from(
          card?.querySelectorAll(".best-xi-player-reason[data-player-copy-paragraph]") || [],
          (paragraph) => paragraph.textContent.trim()
        ),
        paragraphIndexes: Array.from(
          card?.querySelectorAll(".best-xi-player-reason[data-player-copy-paragraph]") || [],
          (paragraph) => paragraph.dataset.playerCopyParagraph
        ),
        valueHelpCount: valueHelp.length,
        valueTooltips: valueHelp.map((item) => item.getAttribute("data-tooltip") || ""),
        withinViewport: Boolean(
          cardRect &&
          cardRect.left >= 0 &&
          cardRect.top >= 0 &&
          cardRect.right <= window.innerWidth &&
          cardRect.bottom <= window.innerHeight
        )
      };
    });
    const historicalWorldCupContexts = {
      en: "At the 2022 World Cup",
      es: "En el Mundial de 2022",
      ko: "2022년 월드컵 당시",
      zh: "2022年世界杯期间"
    };
    const historicalTournamentStats = {
      en: "2022 World Cup: 8 goals",
      es: "Mundial 2022: 8 goles",
      ko: "2022 월드컵: 8골",
      zh: "2022年世界杯：8球"
    };
    assert(
      historicalMbappeCard.paragraphs.length === 2 &&
        historicalMbappeCard.paragraphs.every(
          (paragraph) => paragraph.length >= (locale.code === "zh" ? 28 : locale.code === "ko" ? 40 : 70)
        ) &&
        JSON.stringify(historicalMbappeCard.paragraphIndexes) === JSON.stringify(["1", "2"]) &&
        historicalMbappeCard.meta.includes("23") &&
        historicalMbappeCard.meta.includes("•") &&
        historicalMbappeCard.meta.includes("€160m") &&
        historicalMbappeCard.meta.includes("€200m") &&
        historicalMbappeCard.valueHelpCount === 2 &&
        historicalMbappeCard.valueTooltips.every(Boolean) &&
        historicalMbappeCard.context === historicalWorldCupContexts[locale.code] &&
        historicalMbappeCard.tournamentStats === historicalTournamentStats[locale.code] &&
        historicalMbappeCard.withinViewport,
      `${locale.code}: the 2022 Mbappé card should use tournament-age/value metadata and two substantial evidence/context paragraphs. Measured ${JSON.stringify(historicalMbappeCard)}.`
    );
    if (locale.code !== "en") {
      await page.keyboard.press("Escape");
      await page.locator(".best-xi-honourables-button").click();
      await page.locator(
        '.best-xi-honourables-panel [data-best-xi-player-name="Yassine Bounou"] [data-best-xi-player-trigger]'
      ).click();
      const localizedHistoricalReason = await page.evaluate(async (language) => {
        const response = await fetch(`data/locales/${language}/historical-best-xi-reasons.json`, { cache: "no-store" });
        const expected = (await response.json()).reasons["2022|player|Yassine Bounou"];
        const actual = Array.from(
          document.querySelectorAll("#best-xi-player-card .best-xi-player-reason[data-player-copy-paragraph]"),
          (paragraph) => paragraph.textContent.trim()
        );
        return {
          actual,
          actualClub: document.querySelector("#best-xi-player-card .player-card-club")?.textContent.trim() || "",
          context: document.querySelector("#best-xi-player-card .player-card-world-cup-context")?.textContent.trim() || "",
          actualName: document.querySelector("#best-xi-player-card .player-card-name")?.textContent.trim() || "",
          ageText: document.querySelector("#best-xi-player-card .player-card-meta")?.textContent.trim() || "",
          expected,
          skills: Array.from(
            document.querySelectorAll("#best-xi-player-card .player-skill-list > span"),
            (node) => node.textContent.trim()
          )
        };
      }, locale.code);
      const expectedHistoricalNames = {
        es: "Yassine Bounou",
        ko: "야신 보누",
        zh: "亚辛·布努"
      };
      const expectedHistoricalClubs = {
        es: "Sevilla (LaLiga)",
        ko: "Sevilla (라리가)",
        zh: "塞维利亚（西甲）"
      };
      assert(
        localizedHistoricalReason.actual.length === 2 &&
          localizedHistoricalReason.actual.every(
            (paragraph) => paragraph.length >= (locale.code === "zh" ? 25 : 35)
          ) &&
          localizedHistoricalReason.actual[1] === localizedHistoricalReason.expected &&
          localizedHistoricalReason.actualName === expectedHistoricalNames[locale.code] &&
          localizedHistoricalReason.actualClub === expectedHistoricalClubs[locale.code] &&
          localizedHistoricalReason.context === historicalWorldCupContexts[locale.code] &&
          !localizedHistoricalReason.actualClub.includes("World Cup archive") &&
          localizedHistoricalReason.ageText.includes("31") &&
          localizedHistoricalReason.ageText.includes("•") &&
          localizedHistoricalReason.ageText.includes("€") &&
          (
            locale.code !== "zh" ||
            JSON.stringify(localizedHistoricalReason.skills) ===
              JSON.stringify(["扑救", "首发", "防守控制", "历史评估"])
          ),
        `${locale.code}: the historical Best XI card should localize its name, archive club, skills, tournament-age metadata, and researched rationale. Measured ${JSON.stringify(localizedHistoricalReason)}.`
      );
      if (locale.code === "ko") {
        await page.keyboard.press("Escape");
        await page.locator(
          '[data-best-xi-player-name="Theo Hernández"] [data-best-xi-player-trigger]'
        ).click();
        const localizedAliasName = await page.locator(
          "#best-xi-player-card .player-card-name"
        ).textContent();
        assert(
          localizedAliasName?.trim() === "테오 에르난데스",
          `ko: the normalized historical-name lookup should resolve Theo Hernández through the Théo Hernandez profile key. Measured ${JSON.stringify(localizedAliasName)}.`
        );
      }
      const localizedHistoricalCoach = await page.evaluate(async (language) => {
        const response = await fetch(`data/locales/${language}/historical-best-xi-reasons.json`, { cache: "no-store" });
        const expected = (await response.json()).reasons["2022|coach|Lionel Scaloni"];
        return {
          copy: Array.from(
            document.querySelectorAll(".best-xi-coach-card .lineup-coach-copy .player-card-note"),
            (node) => node.textContent.trim()
          ),
          expected,
          sinceText: document.querySelector(".best-xi-coach-card .player-card-club")?.textContent.trim() || "",
          skillCount: document.querySelectorAll(".best-xi-coach-card .player-skill-list > span").length
        };
      }, locale.code);
      assert(
        localizedHistoricalCoach.copy[0] === localizedHistoricalCoach.expected &&
          localizedHistoricalCoach.copy[1]?.includes("44") &&
          localizedHistoricalCoach.skillCount === 3 &&
          localizedHistoricalCoach.sinceText.includes("2018"),
        `${locale.code}: the historical coach card should show its localized tournament rationale, tournament age, appointment year, and three style pills. Measured ${JSON.stringify(localizedHistoricalCoach)}.`
      );
      await page.keyboard.press("Escape");
      if (locale.code === "ko") {
        await page.goto(getUrl("/highlights.html?year=1950&lang=ko"), { waitUntil: "domcontentloaded" });
        await page.waitForFunction(
          () =>
            !document.body.classList.contains("is-locale-loading") &&
            !document.body.classList.contains("is-initial-page-load") &&
            document.querySelector("#edition-picker-button")?.dataset.edition === "1950",
          null,
          { timeout: 30000 }
        );
        await page.locator(".best-xi-honourables-button").click();
        await page.locator(
          '.best-xi-honourables-panel [data-best-xi-player-name="Óscar Míguez"] [data-best-xi-player-trigger]'
        ).click();
        const localizedAliasName = await page.locator(
          "#best-xi-player-card .player-card-name"
        ).textContent();
        assert(
          localizedAliasName?.trim() === "오스카르 미게스",
          `ko: the normalized historical-name lookup should resolve Óscar Míguez through the Oscar Míguez profile key. Measured ${JSON.stringify(localizedAliasName)}.`
        );
        await page.keyboard.press("Escape");
      }
    }
    if (locale.code === "en") {
      await assertHistoricalRankTooltipBounds(browser);
      const historicalRankingStoryContracts = [
        {
          year: 1950,
          storyIndex: 2,
          expectedRank: "#47",
          expectedTooltip: "Retrospective Elo ranking during the 1950 World Cup",
          playerName: "Joe Gaetjens"
        },
        {
          year: 1978,
          storyIndex: 2,
          expectedRank: "#38",
          expectedTooltip: "Retrospective Elo ranking during the 1978 World Cup"
        },
        {
          year: 1994,
          storyIndex: 1,
          expectedRank: "#34",
          expectedTooltip: "FIFA world ranking during the 1994 World Cup"
        },
        {
          year: 2010,
          storyIndex: 1,
          expectedRank: "#78",
          expectedTooltip: "FIFA world ranking during the 2010 World Cup"
        }
      ];
      for (const contract of historicalRankingStoryContracts) {
        await page.goto(getUrl(`/highlights.html?year=${contract.year}&lang=en`), { waitUntil: "domcontentloaded" });
        await page.waitForFunction(
          (expectedEdition) =>
            !document.body.classList.contains("is-locale-loading") &&
            !document.body.classList.contains("is-initial-page-load") &&
            document.querySelector("#edition-picker-button")?.dataset.edition === String(expectedEdition) &&
            document.querySelectorAll("#highlight-list .highlight-row").length === 3,
          contract.year,
          { timeout: 30000 }
        );
        const rankingPill = await page.evaluate((storyIndex) => {
          const pill = document.querySelector(
            `[data-historical-story-index="${storyIndex}"] h3 .rank-pill`
          );
          return {
            rank: pill?.textContent.trim() || "",
            tooltip: pill?.getAttribute("data-tooltip") || "",
            linkCount: document.querySelectorAll("#highlight-list a").length
          };
        }, contract.storyIndex);
        assert(
          rankingPill.rank === contract.expectedRank &&
            rankingPill.tooltip === contract.expectedTooltip &&
            rankingPill.linkCount === 0,
          `${contract.year}: historical story ranking pill should use the edition's ${contract.year <= 1990 ? "retrospective Elo" : "FIFA"} snapshot. Measured ${JSON.stringify(rankingPill)}.`
        );
        if (contract.year === 1950) {
          await page.locator(
            '[data-best-xi-player-name="Roque Máspoli"] [data-best-xi-player-trigger]'
          ).click();
          const earlyEraBestXiCard = await page.evaluate(() => {
            const card = document.querySelector("#best-xi-player-card");
            return {
              meta: card?.querySelector(".player-card-meta")?.textContent.replace(/\s+/gu, " ").trim() || "",
              paragraphCount: card?.querySelectorAll(
                ".best-xi-player-reason[data-player-copy-paragraph]"
              ).length || 0,
              valueHelpCount: card?.querySelectorAll(
                ".player-card-meta .player-card-value-help"
              ).length || 0
            };
          });
          assert(
            earlyEraBestXiCard.meta.includes("32") &&
              !earlyEraBestXiCard.meta.includes("€") &&
              earlyEraBestXiCard.paragraphCount === 2 &&
              earlyEraBestXiCard.valueHelpCount === 0,
            `1950: early-era Best XI cards should show tournament age and two paragraphs without inventing a euro value. Measured ${JSON.stringify(earlyEraBestXiCard)}.`
          );
          await page.keyboard.press("Escape");
        }
        if (contract.playerName) {
          const trigger = page.locator(
            `[data-historical-story-index="${contract.storyIndex}"] [data-highlight-player-name="${contract.playerName}"] [data-highlight-player-trigger]`
          ).first();
          await trigger.click();
          const playerCard = await page.evaluate((playerName) => {
            const wrapper = document.querySelector(`[data-highlight-player-name="${playerName}"]`);
            return {
              expanded: wrapper?.querySelector("[data-highlight-player-trigger]")?.getAttribute("aria-expanded") || "",
              name: wrapper?.querySelector(".player-card-name")?.textContent.trim() || "",
              note: wrapper?.querySelector(".player-card-note")?.textContent.trim() || ""
            };
          }, contract.playerName);
          assert(
            playerCard.expanded === "true" &&
              playerCard.name === contract.playerName &&
              playerCard.note.length >= 20,
            `${contract.year}: ${contract.playerName}'s story mention should open a researched player card. Measured ${JSON.stringify(playerCard)}.`
          );
          await page.keyboard.press("Escape");
        }
      }
      for (const [editionYear, nextYear] of historicalPreviewChain) {
        await page.goto(getUrl(`/highlights.html?year=${editionYear}&lang=en`), { waitUntil: "domcontentloaded" });
        await page.waitForFunction(
          ({ expectedEdition, expectedOpeningTitle }) =>
            !document.body.classList.contains("is-locale-loading") &&
            !document.body.classList.contains("is-initial-page-load") &&
            document.querySelector("#edition-picker-button")?.dataset.edition === String(expectedEdition) &&
            document.querySelector("#timeline-third-title")?.textContent.trim() === expectedOpeningTitle,
          { expectedEdition: editionYear, expectedOpeningTitle: `The ${nextYear} World Cup begins` },
          { timeout: 30000 }
        );
        const expectedIntroPlayers = HISTORICAL_HIGHLIGHTS.editions[editionYear].introPlayers
          .map((entry) => typeof entry === "string" ? entry : entry.playerName);
        const expectedIntroCopy = HISTORICAL_HIGHLIGHTS.editions[editionYear].intro;
        const introPlayerSurface = await page.evaluate(() => {
          const intro = document.querySelector(".intro-copy");
          const visibleCopy = intro?.cloneNode(true);
          visibleCopy?.querySelectorAll(".player-card").forEach((card) => card.remove());
          const wrappers = Array.from(intro?.querySelectorAll(".highlight-player-hover") || []);
          const interactions = wrappers.map((wrapper) => {
            const trigger = wrapper.querySelector("[data-highlight-player-trigger]");
            trigger?.click();
            const card = wrapper.querySelector(".highlight-player-card");
            return {
              expanded: trigger?.getAttribute("aria-expanded") || "",
              name: card?.querySelector(".player-card-name")?.textContent.trim() || "",
              note: card?.querySelector(".player-card-note")?.textContent.trim() || "",
              position: card?.querySelector(".player-card-position")?.textContent.trim() || "",
              skillCount: card?.querySelectorAll(".player-skill-list > span").length || 0
            };
          });
          document.body.click();
          return {
            canonicalNames: wrappers.map((wrapper) => wrapper.dataset.highlightPlayerName || ""),
            interactions,
            visibleCopy: visibleCopy?.textContent.replace(/\s+/gu, " ").trim() || ""
          };
        });
        assert(
          JSON.stringify(introPlayerSurface.canonicalNames) === JSON.stringify(expectedIntroPlayers) &&
            introPlayerSurface.visibleCopy === expectedIntroCopy &&
            introPlayerSurface.interactions.every((card) =>
              card.expanded === "true" &&
              card.name.length > 0 &&
              card.note.length >= 20 &&
              card.position.length > 0 &&
              card.skillCount > 0
            ),
          `${editionYear}: every champion-summary player introduction should preserve the copy and open a complete player card. Measured ${JSON.stringify(introPlayerSurface)}.`
        );
        const previewChainItem = await page.evaluate(() => ({
          dates: Array.from(document.querySelectorAll(".next-world-cup-timeline .timeline-date"), (node) =>
            node.textContent.replace(/\s+/gu, " ").trim()
          ),
          firstUndated: document.querySelector(".next-world-cup-timeline .timeline-item")?.classList.contains("is-undated") || false,
          coachAvatarText: document.querySelector("#best-xi-coach-avatar")?.textContent.trim() || "",
          coachHasPortrait: Boolean(document.querySelector("#best-xi-coach-avatar img[src]")),
          heading: document.querySelector("#next-world-cup-title")?.textContent.trim() || "",
          itemCount: document.querySelectorAll(".next-world-cup-timeline .timeline-item").length,
          lead: document.querySelector("#next-world-cup-lead")?.textContent.trim() || "",
          markerLabels: Array.from(document.querySelectorAll(".next-world-cup-timeline .timeline-marker i"), (node) =>
            node.textContent.trim()
          ),
          stateClasses: Array.from(document.querySelectorAll(".next-world-cup-timeline .timeline-item"), (item) =>
            ["is-complete", "is-pending", "is-scheduled", "is-final"].filter((className) => item.classList.contains(className))
          )
        }));
        assert(
          previewChainItem.itemCount === 3 &&
            (previewChainItem.coachHasPortrait || previewChainItem.coachAvatarText.length >= 2) &&
            previewChainItem.dates.every((date) => date.length > 0) &&
            !previewChainItem.firstUndated &&
            previewChainItem.heading === "See you next time" &&
            JSON.stringify(previewChainItem.stateClasses) === JSON.stringify([["is-complete"], ["is-complete"], ["is-complete"]]) &&
            JSON.stringify(previewChainItem.markerLabels) === JSON.stringify(["✓", "✓", "✓"]) &&
            !previewChainItem.lead.includes("2030") &&
            !previewChainItem.lead.includes("Morocco, Portugal, and Spain"),
          `${editionYear}: the historical highlights page should render its own completed ${nextYear} preview. Measured ${JSON.stringify(previewChainItem)}.`
        );
      }
    }
    await context.close();
  }
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
        playerContext: playerCard?.querySelector(".player-card-world-cup-context")?.textContent.trim() || "",
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
      currentCards.playerContext === locale.currentContext &&
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
    currentNoteCard.toLocaleLowerCase(locale.htmlLang).includes(
      locale.currentNote.toLocaleLowerCase(locale.htmlLang)
    ) &&
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
  const archiveRequestsBefore = requestedPaths.filter(
    (pathname) => pathname === archiveContentPath
  ).length;
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
      context: card?.querySelector(".player-card-world-cup-context")?.textContent.trim() || "",
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
      archiveCard.context === locale.archiveContext &&
      archiveCard.stats === locale.archiveStats &&
      archiveCard.note.includes(locale.archiveNote) &&
      locale.rejectedPlayerNotePatterns.every((pattern) => !pattern.test(archiveCard.text)) &&
      !/\b(?:Forward|World Cup archive|This World Cup)\b/u.test(archiveCard.text) &&
      archiveEnglishLeaks.length === 0 &&
      archiveMatchCopy.venue.includes(locale.archiveVenue) &&
      archiveMatchCopy.story.includes(locale.archiveStory) &&
      requestedPaths.filter((pathname) => pathname === archiveContentPath).length -
        archiveRequestsBefore <=
        1,
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
  await reportPage.waitForFunction(() => {
    const trigger = document.querySelector(".source-tooltip-trigger");
    const rect = document.querySelector(".source-tooltip")?.getBoundingClientRect();
    return Boolean(
      trigger?.classList.contains("is-touch-tooltip-open") &&
      rect && rect.left >= 5 && rect.right <= 385 && rect.top >= 0 && rect.bottom <= 844
    );
  }, null, { timeout: 5000 });
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
  if (historicalHighlightNotesOnly) {
    await assertHistoricalHighlightPlayerNotes(browser);
    console.log("Four-locale historical highlights player-note smoke tests passed.");
    process.exitCode = 0;
  } else if (highlightsClubLinesOnly) {
    await assertHighlightsLocales(browser);
    console.log(
      requestedLocale
        ? `${requestedLocale} main app, awards, and Best XI club-line smoke test passed.`
        : "Four-locale main app, awards, and Best XI club-line smoke tests passed."
    );
    process.exitCode = 0;
  } else {
  const selectedLocaleCases = requestedLocale
    ? localeCases.filter((locale) => locale.code === requestedLocale)
    : localeCases;
  assert(
    selectedLocaleCases.length > 0,
    `Unknown locale smoke selection: ${requestedLocale || "(none)"}`
  );
  if (!ballBoyOnly) {
    await assertArchivedHomeSeo(browser);
    await assertHistoricalHighlightPlayerNotes(browser);
    await assertHighlightsLocales(browser);
  }
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
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
