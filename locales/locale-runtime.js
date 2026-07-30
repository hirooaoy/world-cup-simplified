const DEFAULT_LANGUAGE = "en";
export const LOCALE_SCHEMA_VERSION = 1;
export const LOCALE_PACK_VERSION = "2026-07-30-locale-leak-cleanup-1";

function deepFreeze(value, seen = new WeakSet()) {
  if ((typeof value !== "object" && typeof value !== "function") || value === null || seen.has(value)) {
    return value;
  }
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key], seen);
  }
  return Object.freeze(value);
}

export const SHELL_MESSAGES = deepFreeze({
  en: {
    adminMessage: "Admin message",
    adminMessageDismiss: "Dismiss message",
    adminMessageLabel: "Admin note",
    appName: "World Cup Simplified",
    appHomeLabel: "World Cup Simplified home",
    calendarNextMonth: "Next month",
    calendarPrevious: "Previous",
    calendarPreviousMonth: "Previous month",
    calendarToday: "Today",
    calendarWeekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    calendarYesterday: "Yesterday",
    catchUp: "Catch Up",
    catchUpDialog: "Catch Up",
    chooseMatchDate: "Choose match date",
    chooseStandingsYear: "Choose standings year",
    clearCountrySearch: "Clear country search",
    countrySearch: "Search country matches",
    groups: "Groups",
    darkMode: "Dark mode",
    language: "Language",
    languageEnglish: "English",
    languageChinese: "中文",
    languageSpanish: "Español",
    languageKorean: "한국어",
    languageLoadFailed: "Unable to switch language",
    languageSwitching: "Switching language",
    juggleBall: "Soccer ball",
    juggleCurrent: "Current juggling streak",
    juggleRecord: "Best juggling streak",
    juggleRecordAction: "Drop soccer ball",
    matches: "Matches",
    matchDetails: "Match details",
    matchDetailsClose: "Close match details",
    matchesHeading: "Matches and selected match details",
    matchesList: "Matches",
    month: "Month",
    past24Hours: "Recent matches",
    reportIssue: "Report issue",
    searchCountryPlaceholder: "Search country",
    settings: "Settings",
    showYesterday: "Show recent matches",
    standings: "Standings",
    standingsSections: "Standings sections",
    standingsSummary:
      "Top two in each group advance. The best eight third-place teams also reach the Round of 32.",
    thirdPlaceRace: "Third-Place Race",
    timeZone: "Time zone",
    timeZoneChoose: "Choose time zone",
    timeZoneClose: "Close time zone picker",
    timeZoneDefault: "Default",
    timeZoneNoResults: "No matching time zones",
    timeZonePopular: "Popular",
    timeZoneRecent: "Recent",
    timeZoneSearchPlaceholder: "Search city, country, or abbreviation",
    timeZoneSearchResults: "Search results",
    tournament: "Tournament",
    viewRecap: "View highlights",
    worldCupViews: "World Cup views"
  },
  zh: {
    adminMessage: "站内消息",
    adminMessageDismiss: "关闭消息",
    adminMessageLabel: "站内便笺",
    appName: "世界杯简明指南",
    appHomeLabel: "世界杯简明指南首页",
    calendarNextMonth: "下个月",
    calendarPrevious: "上一场",
    calendarPreviousMonth: "上个月",
    calendarToday: "今天",
    calendarWeekdays: ["日", "一", "二", "三", "四", "五", "六"],
    calendarYesterday: "昨天",
    catchUp: "速览",
    catchUpDialog: "比赛速览",
    chooseMatchDate: "选择比赛日期",
    chooseStandingsYear: "选择积分榜年份",
    clearCountrySearch: "清除国家队搜索",
    countrySearch: "搜索国家队比赛",
    groups: "小组",
    darkMode: "深色模式",
    language: "语言",
    languageEnglish: "English",
    languageChinese: "中文",
    languageSpanish: "Español",
    languageKorean: "한국어",
    languageLoadFailed: "无法切换语言",
    languageSwitching: "正在切换语言",
    juggleBall: "足球",
    juggleCurrent: "当前颠球次数",
    juggleRecord: "最佳颠球纪录",
    juggleRecordAction: "让足球落下",
    matches: "赛程",
    matchDetails: "比赛详情",
    matchDetailsClose: "关闭比赛详情",
    matchesHeading: "比赛和已选比赛详情",
    matchesList: "比赛",
    month: "月份",
    past24Hours: "近期比赛",
    reportIssue: "报告问题",
    searchCountryPlaceholder: "搜索国家队",
    settings: "设置",
    showYesterday: "显示近期比赛",
    standings: "积分榜",
    standingsSections: "积分榜分区",
    standingsSummary: "每组前两名晋级，成绩最好的八支第三名球队也将进入32强。",
    thirdPlaceRace: "最佳小组第三排名",
    timeZone: "时区",
    timeZoneChoose: "选择时区",
    timeZoneClose: "关闭时区选择器",
    timeZoneDefault: "默认",
    timeZoneNoResults: "没有匹配的时区",
    timeZonePopular: "常用",
    timeZoneRecent: "最近使用",
    timeZoneSearchPlaceholder: "搜索城市、国家或缩写",
    timeZoneSearchResults: "搜索结果",
    tournament: "淘汰赛",
    viewRecap: "查看亮点",
    worldCupViews: "世界杯视图"
  },
  es: {
    adminMessage: "Mensaje del sitio",
    adminMessageDismiss: "Cerrar mensaje",
    adminMessageLabel: "Nota del sitio",
    appName: "Mundial simplificado",
    appHomeLabel: "Inicio de Mundial simplificado",
    calendarNextMonth: "Mes siguiente",
    calendarPrevious: "Anterior",
    calendarPreviousMonth: "Mes anterior",
    calendarToday: "Hoy",
    calendarWeekdays: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
    calendarYesterday: "Ayer",
    catchUp: "Ponte al día",
    catchUpDialog: "Resumen rápido",
    chooseMatchDate: "Elegir fecha del partido",
    chooseStandingsYear: "Elegir año de la clasificación",
    clearCountrySearch: "Borrar búsqueda de selección",
    countrySearch: "Buscar partidos por selección",
    groups: "Grupos",
    darkMode: "Modo oscuro",
    language: "Idioma",
    languageEnglish: "English",
    languageChinese: "中文",
    languageSpanish: "Español",
    languageKorean: "한국어",
    languageLoadFailed: "No se pudo cambiar el idioma",
    languageSwitching: "Cambiando idioma",
    juggleBall: "Balón de fútbol",
    juggleCurrent: "Racha actual de toques",
    juggleRecord: "Mejor racha de toques",
    juggleRecordAction: "Dejar caer el balón",
    matches: "Partidos",
    matchDetails: "Detalles del partido",
    matchDetailsClose: "Cerrar detalles del partido",
    matchesHeading: "Partidos y detalles del partido seleccionado",
    matchesList: "Partidos",
    month: "Mes",
    past24Hours: "Partidos recientes",
    reportIssue: "Reportar un problema",
    searchCountryPlaceholder: "Buscar selección",
    settings: "Configuración",
    showYesterday: "Mostrar partidos recientes",
    standings: "Clasificación",
    standingsSections: "Secciones de la clasificación",
    standingsSummary:
      "Los dos primeros de cada grupo avanzan. Los ocho mejores terceros también pasan a dieciseisavos de final.",
    thirdPlaceRace: "Clasificación de terceros",
    timeZone: "Zona horaria",
    timeZoneChoose: "Elegir zona horaria",
    timeZoneClose: "Cerrar selector de zona horaria",
    timeZoneDefault: "Predeterminado",
    timeZoneNoResults: "No hay zonas horarias coincidentes",
    timeZonePopular: "Populares",
    timeZoneRecent: "Recientes",
    timeZoneSearchPlaceholder: "Buscar ciudad, país o abreviatura",
    timeZoneSearchResults: "Resultados de búsqueda",
    tournament: "Fase eliminatoria",
    viewRecap: "Ver momentos destacados",
    worldCupViews: "Secciones del Mundial"
  },
  ko: {
    adminMessage: "공지 메시지",
    adminMessageDismiss: "메시지 닫기",
    adminMessageLabel: "운영자 알림",
    appName: "월드컵 한눈에",
    appHomeLabel: "월드컵 한눈에 홈",
    calendarNextMonth: "다음 달",
    calendarPrevious: "이전 경기",
    calendarPreviousMonth: "이전 달",
    calendarToday: "오늘",
    calendarWeekdays: ["일", "월", "화", "수", "목", "금", "토"],
    calendarYesterday: "어제",
    catchUp: "한눈에 보기",
    catchUpDialog: "경기 요약",
    chooseMatchDate: "경기 날짜 선택",
    chooseStandingsYear: "순위표 연도 선택",
    clearCountrySearch: "대표팀 검색 지우기",
    countrySearch: "대표팀 경기 검색",
    groups: "조별리그",
    darkMode: "다크 모드",
    language: "언어",
    languageEnglish: "English",
    languageChinese: "中文",
    languageSpanish: "Español",
    languageKorean: "한국어",
    languageLoadFailed: "언어를 변경할 수 없습니다",
    languageSwitching: "언어 변경 중",
    juggleBall: "축구공",
    juggleCurrent: "현재 리프팅 기록",
    juggleRecord: "최고 리프팅 기록",
    juggleRecordAction: "축구공 떨어뜨리기",
    matches: "경기",
    matchDetails: "경기 상세",
    matchDetailsClose: "경기 상세 닫기",
    matchesHeading: "경기 목록 및 선택한 경기 상세",
    matchesList: "경기 목록",
    month: "월",
    past24Hours: "최근 경기",
    reportIssue: "오류 제보",
    searchCountryPlaceholder: "대표팀 검색",
    settings: "설정",
    showYesterday: "최근 경기 보기",
    standings: "순위",
    standingsSections: "순위 섹션",
    standingsSummary: "각 조 1·2위가 진출합니다. 성적이 좋은 조 3위 8개 팀도 32강에 오릅니다.",
    thirdPlaceRace: "조 3위 순위",
    timeZone: "시간대",
    timeZoneChoose: "시간대 선택",
    timeZoneClose: "시간대 선택기 닫기",
    timeZoneDefault: "기본값",
    timeZoneNoResults: "일치하는 시간대가 없습니다",
    timeZonePopular: "자주 사용하는 시간대",
    timeZoneRecent: "최근 사용",
    timeZoneSearchPlaceholder: "도시, 국가 또는 약어 검색",
    timeZoneSearchResults: "검색 결과",
    tournament: "토너먼트",
    viewRecap: "하이라이트 보기",
    worldCupViews: "월드컵 메뉴"
  }
});

const LANGUAGE_CONFIGS = Object.freeze({
  en: Object.freeze({
    code: "en",
    urlCode: "en",
    storageCode: "en",
    intlLocale: "en-US",
    htmlLang: "en",
    nativeName: "English",
    direction: "ltr"
  }),
  zh: Object.freeze({
    code: "zh",
    urlCode: "zh",
    storageCode: "zh",
    intlLocale: "zh-CN",
    htmlLang: "zh-Hans",
    nativeName: "中文",
    direction: "ltr"
  }),
  es: Object.freeze({
    code: "es",
    urlCode: "es",
    storageCode: "es",
    intlLocale: "es-419",
    htmlLang: "es-419",
    nativeName: "Español",
    direction: "ltr"
  }),
  ko: Object.freeze({
    code: "ko",
    urlCode: "ko",
    storageCode: "ko",
    intlLocale: "ko-KR",
    htmlLang: "ko",
    nativeName: "한국어",
    direction: "ltr"
  })
});

const SUPPORTED_LANGUAGE_CONFIGS = Object.freeze(Object.values(LANGUAGE_CONFIGS));
const SUPPORTED_DOMAINS = new Set(["app", "report", "chatbot", "highlights"]);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const DOMAIN_PACK_VALIDATORS = Object.freeze({
  app: (pack) =>
    isRecord(pack.ui) &&
    isRecord(pack.text) &&
    isRecord(pack.entities) &&
    isRecord(pack.helpers) &&
    typeof pack.helpers.translateText === "function",
  report: (pack) => isRecord(pack.text) && isRecord(pack.footerText),
  chatbot: (pack) => isRecord(pack.copy) && isRecord(pack.knowledge),
  highlights: (pack) => isRecord(pack.text) && isRecord(pack.entities)
});

const DOMAIN_LOADERS = Object.freeze({
  es: Object.freeze({
    app: () => import(`./es/app.js?v=${LOCALE_PACK_VERSION}`),
    report: () => import(`./es/report.js?v=${LOCALE_PACK_VERSION}`),
    chatbot: () => import(`./es/chatbot.js?v=${LOCALE_PACK_VERSION}`),
    highlights: () => import(`./es/highlights.js?v=${LOCALE_PACK_VERSION}`)
  }),
  ko: Object.freeze({
    app: () => import(`./ko/app.js?v=${LOCALE_PACK_VERSION}`),
    report: () => import(`./ko/report.js?v=${LOCALE_PACK_VERSION}`),
    chatbot: () => import(`./ko/chatbot.js?v=${LOCALE_PACK_VERSION}`),
    highlights: () => import(`./ko/highlights.js?v=${LOCALE_PACK_VERSION}`)
  })
});

const domainCache = new Map();

export function normalizeLanguage(value, fallback = DEFAULT_LANGUAGE) {
  const normalizedFallback = String(fallback || DEFAULT_LANGUAGE)
    .trim()
    .toLocaleLowerCase("en-US")
    .split(/[-_]/u)[0];
  const fallbackCode = LANGUAGE_CONFIGS[normalizedFallback] ? normalizedFallback : DEFAULT_LANGUAGE;
  const language = String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .split(/[-_]/u)[0];
  return LANGUAGE_CONFIGS[language] ? language : fallbackCode;
}

export function getLanguageConfig(language) {
  return LANGUAGE_CONFIGS[normalizeLanguage(language)];
}

export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGE_CONFIGS;
}

export function getLocaleShellMessages(language) {
  return SHELL_MESSAGES[normalizeLanguage(language)];
}

export async function loadLocaleDomain(language, domain) {
  const languageCode = normalizeLanguage(language);
  const domainName = String(domain || "").trim().toLocaleLowerCase("en-US");

  if (!SUPPORTED_DOMAINS.has(domainName)) {
    throw new RangeError(`Unsupported locale domain: ${domainName || "(empty)"}`);
  }

  // English and Chinese continue to use the existing eager dictionaries while the
  // application migrates to domain packs. Returning null makes that fallback explicit.
  if (languageCode === "en" || languageCode === "zh") {
    return null;
  }

  const cacheKey = `${languageCode}:${domainName}`;
  if (domainCache.has(cacheKey)) {
    return domainCache.get(cacheKey);
  }

  const loader = DOMAIN_LOADERS[languageCode]?.[domainName];
  if (!loader) {
    throw new RangeError(`No locale pack for ${cacheKey}`);
  }

  const loadPromise = loader()
    .then((module) => {
      const pack = module.default;
      const validatesDomainShape = DOMAIN_PACK_VALIDATORS[domainName];
      if (
        !isRecord(pack) ||
        pack.schemaVersion !== LOCALE_SCHEMA_VERSION ||
        pack.language !== languageCode ||
        pack.domain !== domainName ||
        !validatesDomainShape?.(pack)
      ) {
        throw new TypeError(`Invalid locale pack for ${cacheKey}`);
      }
      return pack;
    })
    .catch((error) => {
      domainCache.delete(cacheKey);
      throw error;
    });

  domainCache.set(cacheKey, loadPromise);
  return loadPromise;
}
