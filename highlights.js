import { LANGUAGE_STORAGE_KEY } from "./app-config.js?v=2026-07-20-highlights-locales-1";
import {
  getLanguageConfig,
  loadLocaleDomain,
  normalizeLanguage
} from "./locales/locale-runtime.js?v=2026-07-20-full-localization-audit-1";

const AWARD_NAME_IDS = Object.freeze({
  goldenBall: "golden-ball-name",
  goldenBoot: "golden-boot-name",
  goldenGlove: "golden-glove-name",
  youngPlayer: "young-player-name"
});

const DEFAULT_AWARD_NAMES = Object.freeze({
  goldenBall: "Rodri",
  goldenBoot: "Kylian Mbappe",
  goldenGlove: "Unai Simon",
  youngPlayer: "Pau Cubarsi"
});

const CHINESE_HIGHLIGHTS_LOCALE = Object.freeze({
  schemaVersion: 1,
  language: "zh",
  domain: "highlights",
  text: Object.freeze({
    aboutHighlights: "关于这些亮点",
    alsoLabel: "同样值得记住：",
    alsoText: "约安·维萨打进民主刚果队史首粒世界杯进球；首次参赛的库拉索攻破德国球门，并以0比0战平厄瓜多尔。",
    awardSources: "奖项来源：",
    awardSourcesAnd: "以及",
    awardsLead: "每个奖项代表什么、由谁获得，以及获奖原因。",
    backToMatches: "返回比赛",
    caboBody: "他们在小组赛中先后战平西班牙、乌拉圭和沙特阿拉伯，随后把阿根廷拖入加时赛，最终2比3惜败。首次世界杯之旅表现非凡。",
    caboTitle: "卡博韦尔德让世界杯首秀值得铭记。",
    championName: "西班牙",
    championStatsLabel: "西班牙本届赛事概览",
    championSummary: "西班牙通过加时赛以1比0击败阿根廷，费兰·托雷斯在第106分钟打进制胜球。",
    cleanSheets: "零封",
    fairPlay: "FIFA公平竞赛奖",
    fairPlayMeaning: "体育精神",
    fairPlayMeta: "球队奖项",
    fairPlayName: "荷兰",
    fairPlayWhy: "FIFA将这一表彰公平竞赛和体育精神的球队奖项颁给了荷兰。",
    fanDiscussion: "球迷讨论",
    footer: "世界杯简明指南 · 2026奖项与亮点",
    goldenBall: "金球奖",
    goldenBallMeaning: "赛事最佳球员",
    goldenBallMeta: "🇪🇸 西班牙",
    goldenBallWhy: "他在中场掌控比赛节奏，并让西班牙在压力下保持组织。他的稳定发挥和领导力是球队夺冠的关键。",
    goldenBoot: "金靴奖",
    goldenBootMeaning: "最佳射手",
    goldenBootMeta: "🇫🇷 法国",
    goldenBootTotal: "{goals}球 · {assists}次助攻。",
    goldenBootWhy: "他在季军赛对阵英格兰时打进两球，超越利昂内尔·梅西并锁定金靴。",
    goldenGlove: "金手套奖",
    goldenGloveMeaning: "最佳门将",
    goldenGloveMeta: "🇪🇸 西班牙",
    goldenGloveStat: "8场比赛7次零封。",
    goldenGloveWhy: "“零封”指整场不失球；他整届赛事只丢了1球。",
    highlightsLead: "终场哨响后仍被反复谈起的故事。",
    intro: "西班牙在加时赛中以1比0击败阿根廷，费兰·托雷斯在第106分钟破门。对比赛的控制和稳固防守贯穿了他们的夺冠之路。",
    language: "语言",
    loadError: "无法更新奖项得主姓名。",
    matches: "比赛",
    metaDescription: "回顾西班牙的2026年世界杯冠军、官方奖项得主和几段值得记住的赛事故事。",
    metaTitle: "2026年世界杯奖项与亮点 | 世界杯简明指南",
    methodology: "球迷讨论帮助我们挑选了这些时刻。奖项、比分和球员数据则另行通过比赛报告及本站使用的赛事数据核对。",
    moreHighlights: "更多赛事亮点",
    moroccoBody: "继2022年历史性闯入四强后，摩洛哥再次进入八强——他们通过点球大战淘汰荷兰，又以3比0击败加拿大。",
    moroccoTitle: "摩洛哥再次走得很远。",
    officialAwards: "官方奖项",
    ogDescription: "冠军、官方奖项，以及值得记住的赛事故事。",
    ogTitle: "2026年世界杯奖项与亮点",
    pageContext: "2026奖项",
    pageTitle: "西班牙成为世界冠军。",
    paraguayBody: "双方1比1战平后，奥兰多·希尔在点球大战中扑出凯·哈弗茨和尼克·沃尔特马德的射门，帮助巴拉圭以4比3获胜。",
    paraguayTitle: "巴拉圭淘汰了德国。",
    siteBrand: "世界杯简明指南",
    siteHome: "世界杯简明指南首页",
    sourcesAndMethodology: "来源和方法",
    themeDark: "切换到深色模式",
    themeLight: "切换到浅色模式",
    worldChampions: "世界冠军",
    worldCup: "2026年世界杯 · 奖项与亮点",
    worldTitles: "世界杯冠军",
    youngPlayer: "最佳年轻球员",
    youngPlayerMeaning: "最佳年轻球员",
    youngPlayerMeta: "🇪🇸 西班牙",
    youngPlayerStat: "年仅19岁，却踢满每一分钟。",
    youngPlayerWhy: "作为中后卫，他既能提前阻断进攻，也能用沉着准确的传球帮助西班牙发起进攻。"
  }),
  entities: Object.freeze({
    players: Object.freeze({
      "Kylian Mbappe": "基利安·姆巴佩",
      "Pau Cubarsi": "保·库巴西",
      Rodri: "罗德里",
      "Unai Simon": "乌奈·西蒙"
    }),
    teams: Object.freeze({
      Netherlands: "荷兰",
      Spain: "西班牙"
    })
  })
});

function getElement(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = getElement(id);
  if (element && value) {
    element.textContent = value;
  }
}

function captureEnglishLocale() {
  const text = {};
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (key && text[key] === undefined) {
      text[key] = element.textContent.trim();
    }
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    const key = element.dataset.i18nAria;
    if (key && text[key] === undefined) {
      text[key] = element.getAttribute("aria-label") || "";
    }
  });
  Object.assign(text, {
    goldenBootTotal: "{goals} goals · {assists} assists.",
    loadError: "Unable to refresh the award names.",
    metaDescription: getElement("meta-description")?.content || "",
    metaTitle: document.title,
    ogDescription: getElement("og-description")?.content || "",
    ogTitle: getElement("og-title")?.content || "",
    themeDark: "Switch to dark mode",
    themeLight: "Switch to light mode"
  });
  return Object.freeze({
    schemaVersion: 1,
    language: "en",
    domain: "highlights",
    text: Object.freeze(text),
    entities: Object.freeze({
      players: Object.freeze({}),
      teams: Object.freeze({})
    })
  });
}

const ENGLISH_HIGHLIGHTS_LOCALE = captureEnglishLocale();
const REQUIRED_TEXT_KEYS = Object.freeze(Object.keys(ENGLISH_HIGHLIGHTS_LOCALE.text).sort());
let currentLanguage = "en";
let activeLocale = ENGLISH_HIGHLIGHTS_LOCALE;
let loadedAwards = null;
let loadedProfiles = null;

function resolveInitialLanguage() {
  const params = new URLSearchParams(window.location.search);
  return normalizeLanguage(
    params.get("lang") || localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en"
  );
}

function validateHighlightsLocale(locale, language) {
  const missingKeys = REQUIRED_TEXT_KEYS.filter(
    (key) => !String(locale?.text?.[key] || "").trim()
  );
  if (
    locale?.schemaVersion !== 1 ||
    locale?.language !== language ||
    locale?.domain !== "highlights" ||
    missingKeys.length
  ) {
    throw new TypeError(
      `Invalid highlights locale ${language}; missing keys: ${missingKeys.join(", ") || "none"}`
    );
  }
  return locale;
}

async function loadHighlightsLocale(language) {
  if (language === "en") {
    return ENGLISH_HIGHLIGHTS_LOCALE;
  }
  if (language === "zh") {
    return CHINESE_HIGHLIGHTS_LOCALE;
  }
  return validateHighlightsLocale(
    await loadLocaleDomain(language, "highlights"),
    language
  );
}

function formatMessage(template, values = {}) {
  return String(template || "").replace(/\{([a-zA-Z0-9]+)\}/g, (_, key) =>
    values[key] === undefined ? `{${key}}` : String(values[key])
  );
}

function localizeEntity(group, value) {
  return activeLocale?.entities?.[group]?.[value] || "";
}

function updateMetadata() {
  document.title = activeLocale.text.metaTitle;
  getElement("meta-description")?.setAttribute("content", activeLocale.text.metaDescription);
  getElement("og-title")?.setAttribute("content", activeLocale.text.ogTitle);
  getElement("og-description")?.setAttribute("content", activeLocale.text.ogDescription);
  getElement("twitter-title")?.setAttribute("content", activeLocale.text.ogTitle);
  getElement("twitter-description")?.setAttribute("content", activeLocale.text.ogDescription);
}

function updateInternalLinks() {
  const suffix = currentLanguage === "en" ? "" : `?lang=${encodeURIComponent(currentLanguage)}`;
  document.querySelectorAll("[data-preserve-language]").forEach((link) => {
    link.setAttribute("href", `./${suffix}`);
  });
}

function updateThemeLabel() {
  const button = getElement("theme-toggle");
  if (!button || !window.worldCupTheme) {
    return;
  }
  const isDark = window.worldCupTheme.getTheme() === "dark";
  button.setAttribute("aria-label", activeLocale.text[isDark ? "themeLight" : "themeDark"]);
}

function applyLocale() {
  const config = getLanguageConfig(currentLanguage);
  document.documentElement.lang = config.htmlLang;
  document.documentElement.dir = config.direction;
  document.body.dataset.language = currentLanguage;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = activeLocale.text[element.dataset.i18n];
    if (value) {
      element.textContent = value;
    }
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    const value = activeLocale.text[element.dataset.i18nAria];
    if (value) {
      element.setAttribute("aria-label", value);
    }
  });
  const languageSelect = getElement("language-select");
  if (languageSelect) {
    languageSelect.value = currentLanguage;
  }
  updateMetadata();
  updateInternalLinks();
  updateThemeLabel();
  renderAwards(loadedAwards || {}, loadedProfiles || {});
}

function updateLanguageUrl() {
  const url = new URL(window.location.href);
  if (currentLanguage === "en") {
    url.searchParams.delete("lang");
  } else {
    url.searchParams.set("lang", currentLanguage);
  }
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

async function setLanguage(language, options = {}) {
  const nextLanguage = normalizeLanguage(language);
  const locale = await loadHighlightsLocale(nextLanguage);
  currentLanguage = nextLanguage;
  activeLocale = validateHighlightsLocale(locale, nextLanguage);
  localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  if (options.updateUrl !== false) {
    updateLanguageUrl();
  }
  applyLocale();
}

function setupLanguageSelect() {
  const select = getElement("language-select");
  if (!select) {
    return;
  }
  select.addEventListener("change", async () => {
    select.disabled = true;
    try {
      await setLanguage(select.value);
    } catch (error) {
      console.error("Unable to switch highlights language", error);
      select.value = currentLanguage;
    } finally {
      select.disabled = false;
    }
  });
}

function setupThemeToggle() {
  const button = getElement("theme-toggle");
  if (!button || !window.worldCupTheme) {
    return;
  }
  button.addEventListener("click", () => {
    const isDark = window.worldCupTheme.getTheme() === "dark";
    window.worldCupTheme.setTheme(isDark ? "light" : "dark");
    updateThemeLabel();
  });
  window.worldCupTheme.subscribe(updateThemeLabel);
  updateThemeLabel();
}

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load ${url}: ${response.status}`);
  }
  return response.json();
}

function renderAwards(awards, profiles) {
  Object.entries(AWARD_NAME_IDS).forEach(([awardKey, elementId]) => {
    const playerName = awards[awardKey]?.playerName || DEFAULT_AWARD_NAMES[awardKey];
    const displayName = profiles[playerName]?.displayName || playerName;
    setText(elementId, localizeEntity("players", playerName) || displayName);
  });

  const goldenBoot = awards.goldenBoot;
  const goals = Number.isFinite(Number(goldenBoot?.goals)) ? Number(goldenBoot.goals) : 10;
  const assists = Number.isFinite(Number(goldenBoot?.assists)) ? Number(goldenBoot.assists) : 4;
  setText(
    "golden-boot-total",
    formatMessage(activeLocale.text.goldenBootTotal, { goals, assists })
  );

  const fairPlayName = awards.fairPlay?.teamName || "Netherlands";
  setText("fair-play-name", localizeEntity("teams", fairPlayName) || fairPlayName);
}

async function initialize() {
  setupLanguageSelect();
  setupThemeToggle();

  try {
    await setLanguage(resolveInitialLanguage(), { updateUrl: false });
    const [tournament, playerData] = await Promise.all([
      loadJson("data/tournament.json"),
      loadJson("data/player-profiles.json")
    ]);
    loadedAwards = tournament.awards || {};
    loadedProfiles = playerData.profiles || {};
    renderAwards(loadedAwards, loadedProfiles);
  } catch (error) {
    console.error(activeLocale.text.loadError, error);
    currentLanguage = "en";
    activeLocale = ENGLISH_HIGHLIGHTS_LOCALE;
    applyLocale();
  } finally {
    document.body.classList.remove("is-locale-loading");
  }
}

initialize();
