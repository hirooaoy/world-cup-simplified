import { LANGUAGE_STORAGE_KEY } from "./app-config.js?v=2026-07-20-final-cutover-1";
import { appendFootballInlineText } from "./football-typography.js?v=2026-07-20-final-cutover-1";
import { ZH_CLUB_NAME_TRANSLATIONS, ZH_LEAGUE_NAME_TRANSLATIONS } from "./football-locale-zh.js?v=2026-07-20-final-celebration-bullets-1";
import {
  formatLineupShortName,
  renderLineupAvatarFrame,
  renderLineupBenchPanel,
  renderLineupControlBand,
  renderLineupPitchCard,
  renderLineupPlayerMarkerShell,
  updateLineupTabIndicators
} from "./lineup-ui.js?v=2026-07-20-final-cutover-1";
import {
  formatPlayerClubLine,
  formatPlayerPosition,
  getPlayerCardUniformNumber
} from "./player-card-ui.js?v=2026-07-20-final-cutover-1";
import {
  getLanguageConfig,
  getLocaleShellMessages,
  loadLocaleDomain,
  normalizeLanguage
} from "./locales/locale-runtime.js?v=2026-07-20-final-cutover-1";

const AWARD_NAME_IDS = Object.freeze({
  goldenBall: "golden-ball-name",
  goldenBoot: "golden-boot-name",
  goldenGlove: "golden-glove-name",
  youngPlayer: "young-player-name"
});

const AWARD_PHOTO_IDS = Object.freeze({
  goldenBall: "golden-ball-photo",
  goldenBoot: "golden-boot-photo",
  goldenGlove: "golden-glove-photo",
  youngPlayer: "young-player-photo"
});

const AWARD_PHOTO_RETRY_DELAY_MS = 350;
const BEST_XI_CARD_ID = "best-xi-player-card";
const BEST_XI_IMAGE_RETRY_DELAY_MS = 350;
const HIGHLIGHT_PLAYER_CARD_ID = "highlight-player-card";
const CHAMPION_PHOTO_SCOUT_EXPRESSION_SOURCE = "champion-photo";
const PLAYER_CARD_HOVER_HANDOFF_MS = 220;

const HIGHLIGHT_STORIES = Object.freeze([
  Object.freeze({
    teamId: "CPV",
    titleKey: "caboTitle",
    bodyKey: "caboBody",
    bodyTeamIds: Object.freeze(["ESP", "URU", "KSA", "ARG"])
  }),
  Object.freeze({ teamId: "PAR", titleKey: "paraguayTitle", additionalTeamIds: Object.freeze(["GER"]) }),
  Object.freeze({ teamId: "CUW", titleKey: "curacaoTitle" })
]);

const POSITION_TEXT_KEYS = Object.freeze({
  GK: "positionGoalkeeper",
  RB: "positionRightBack",
  CB: "positionCentreBack",
  LB: "positionLeftBack",
  DM: "positionDefensiveMidfielder",
  CM: "positionCentralMidfielder",
  RCM: "positionRightCentralMidfielder",
  LCM: "positionLeftCentralMidfielder",
  RW: "positionRightWinger",
  AM: "positionAttackingMidfielder",
  LW: "positionLeftWinger",
  ST: "positionStriker"
});

const FACT_TEXT_KEYS = Object.freeze({
  assists: "factAssists",
  champion: "factChampion",
  cleanSheets: "factCleanSheets",
  goals: "factGoals",
  goldenBall: "factGoldenBall",
  goldenGlove: "factGoldenGlove",
  starts: "factStarts",
  youngPlayer: "factYoungPlayer"
});

const ZH_PLAYER_POSITIONS = Object.freeze({
  "attacking midfielder": "攻击型中场",
  "centre-back": "中后卫",
  forward: "前锋",
  goalkeeper: "门将",
  midfielder: "中场",
  "right-back": "右后卫",
  "wide midfielder": "边前卫",
  winger: "边锋"
});

const ZH_PLAYER_SKILLS = Object.freeze({
  "Aerial timing": "空中球时机",
  "Box command": "禁区指挥",
  "Central creation": "中路组织",
  "Chance passes": "威胁传球",
  "Defensive leadership": "防守领导力",
  "Final pass": "关键传球",
  "Goal threat": "进球威胁",
  "Goalkeeper reflexes": "门将反应",
  "Hybrid forward play": "混合型前锋踢法",
  "Left-footed carries": "左脚推进",
  "Midfield leadership": "中场领导力",
  "Penalty-area reach": "禁区覆盖",
  "Penalty-box timing": "禁区跑位时机",
  "Quick finishing": "快速终结",
  "Premier League experience": "英超经验",
  "Set pieces": "定位球",
  "Set-piece delivery": "定位球输送",
  "Shot stopping": "扑救",
  "Soft first touch": "柔和的第一脚触球",
  "Tall forward link play": "高大中锋串联",
  "Veteran goalkeeping": "老将门将经验",
  "Veteran versatility": "老将多面性",
  "Wing versatility": "边路多面性",
  "Box finishing": "禁区终结",
  "Wide-to-inside runs": "边路内切跑动"
});

const DEFAULT_AWARD_NAMES = Object.freeze({
  goldenBall: "Rodri",
  goldenBoot: "Kylian Mbappe",
  goldenGlove: "Unai Simon",
  youngPlayer: "Pau Cubarsi"
});

const BACK_LABELS = Object.freeze({
  en: "Back",
  es: "Volver",
  ko: "뒤로",
  zh: "返回"
});

const HOME_LABELS = Object.freeze({
  en: "Back to Home",
  es: "Volver al inicio",
  ko: "홈으로 돌아가기",
  zh: "返回首页"
});

const FOOTER_TOP_LABELS = Object.freeze({
  en: "Back to top",
  es: "Volver arriba",
  ko: "맨 위로",
  zh: "返回顶部"
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
    bestCoachAria: "最佳教练：{name}。{reason}",
    bestCoachLabel: "最佳教练",
    bestXiFormationLabel: "阵型4-3-3",
    bestXiInfo: "由网站管理员选出。",
    benchLabel: "替补席",
    formationLabel: "阵型",
    bestXiLead: "“荣誉提名”面板按11个位置展示15名球员；部分位置包含额外的资料核查候选人。",
    bestXiPitchLabel: "世界杯简明指南2026年最佳阵容",
    bestXiTitle: "2026年最佳阵容",
    caboBody: "他们在小组赛中先后战平西班牙、乌拉圭和沙特阿拉伯，随后把阿根廷拖入加时赛，最终2比3惜败。首次世界杯之旅表现非凡。",
    caboTitle: "卡博韦尔德让世界杯首秀值得铭记",
    championName: "西班牙",
    championStatsLabel: "西班牙本届赛事概览",
    championSummary: "西班牙通过加时赛以1比0击败阿根廷，费兰·托雷斯在第106分钟打进制胜球。",
    cleanSheets: "零封",
    curacaoBody: "埃洛伊·鲁姆完成零封，队长莱安德罗·巴库纳和塔希斯·钟也帮助库拉索0比0战平厄瓜多尔，拿到队史世界杯首个积分。",
    curacaoTitle: "库拉索拿到了世界杯首个积分",
    fairPlay: "FIFA公平竞赛奖",
    fairPlayMeaning: "体育精神",
    fairPlayMeta: "由队长维吉尔·范戴克领衔",
    fairPlayName: "荷兰",
    fairPlayStat: "他们在最后三场比赛中没有领到任何牌。",
    fairPlayWhy: "荷兰队在整届赛事中踢得自律，也尊重对手。",
    fanDiscussion: "球迷讨论",
    factAssists: "{count}次助攻",
    factChampion: "世界冠军",
    factCleanSheets: "零封{count}场",
    factGoals: "{count}个进球",
    factGoldenBall: "金球奖",
    factGoldenGlove: "金手套奖",
    factStarts: "首发{count}场",
    factYoungPlayer: "最佳年轻球员",
    footer: "世界杯简明指南 · 2026奖项与亮点",
    goldenBall: "金球奖",
    goldenBallMeaning: "赛事最佳球员",
    goldenBallMeta: "🇪🇸 西班牙",
    goldenBallImpact: "他的稳定发挥和领导力是球队夺冠的关键。",
    goldenBallWhy: "他在中场掌控比赛节奏，并让西班牙在压力下保持组织。",
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
    honourableMentions: "荣誉提名",
    honourableMentionsAria: "荣誉提名：{count}人",
    honourableTeam: "荣誉阵容",
    intro: "西班牙在加时赛中以1比0击败阿根廷，费兰·托雷斯在第106分钟破门。对比赛的控制和稳固防守贯穿了他们的夺冠之路。",
    language: "语言",
    loadError: "无法更新奖项得主姓名。",
    matches: "比赛",
    metaDescription: "回顾西班牙的2026年世界杯冠军、编辑部评选的最佳阵容、官方奖项得主和几段值得记住的赛事故事。",
    metaTitle: "2026年世界杯奖项与亮点 | 世界杯简明指南",
    methodology: "球迷讨论帮助我们挑选了这些时刻。奖项、比分和球员数据则另行通过比赛报告及本站使用的赛事数据核对。",
    moreHighlights: "黑马亮点",
    nextWorldCupLead: "摩洛哥、葡萄牙和西班牙将主办2030年世界杯，阿根廷、巴拉圭和乌拉圭将承办百年纪念赛。",
    officialAwards: "官方奖项",
    ogDescription: "冠军、编辑部评选的最佳阵容、官方奖项，以及值得记住的赛事故事。",
    ogTitle: "2026年世界杯奖项与亮点",
    pageContext: "2026奖项",
    pageTitle: "西班牙成为2026年世界杯冠军。",
    paraguayBody: "双方1比1战平后，奥兰多·希尔在点球大战中扑出凯·哈弗茨和尼克·沃尔特马德的射门，帮助巴拉圭以4比3获胜。",
    paraguayTitle: "巴拉圭淘汰了德国",
    positionAttackingMidfielder: "攻击型中场",
    positionCentralMidfielder: "中前卫",
    positionCentreBack: "中后卫",
    positionDefensiveMidfielder: "防守型中场",
    positionGoalkeeper: "门将",
    positionLeftBack: "左后卫",
    positionLeftCentralMidfielder: "左中前卫",
    positionLeftWinger: "左边锋",
    positionRightBack: "右后卫",
    positionRightCentralMidfielder: "右中前卫",
    positionRightWinger: "右边锋",
    positionStriker: "中锋",
    playerAge: "{age}岁",
    playerEstimatedValue: "估值",
    playerEstimatedValueTooltip: "估算市场价值，参考公开估值、年龄、俱乐部层级、角色和近期表现。",
    playerPrime: "巅峰",
    playerPrimeTooltip: "来自Transfermarkt数据集的球员生涯峰值市场价值。",
    playerValue: "身价",
    playerValueTooltip: "来自公开球员估值数据的市场价值。",
    rankAria: "{label}。{tooltip}",
    rankLabel: "{teamName} FIFA世界排名 {rank}（{year}）",
    rankTooltip: "{year}年世界杯期间的FIFA世界排名",
    selectionSources: "评选来源：",
    sourceFifaAwards: "FIFA奖项",
    sourceFinalReport: "世界杯决赛报道",
    sourceFoxSports: "FOX Sports球员排名",
    sourceOptaAnalyst: "Opta Analyst最佳阵容",
    sourceStatLeaders: "赛事数据榜",
    sourceTournamentData: "赛事数据",
    seeYouNextTime: "下次见",
    siteBrand: "世界杯简明指南",
    siteHome: "世界杯简明指南首页",
    sourcesAndMethodology: "来源和方法",
    themeDark: "切换到深色模式",
    themeLight: "切换到浅色模式",
    startingXi: "最佳阵容",
    worldChampions: "世界冠军",
    worldCup: "2026年世界杯 · 奖项与亮点",
    worldTitles: "世界杯冠军",
    timelineAlreadySet: "已经确定",
    timelineDrawBody: "最终抽签将确定赛事小组。",
    timelineDrawTitle: "小组抽签",
    timelineHostsBody: "摩洛哥、葡萄牙和西班牙将主办主要赛事；阿根廷、巴拉圭和乌拉圭将承办百年纪念赛。六队均自动晋级。",
    timelineHostsTitle: "六支球队已锁定席位",
    timelineStartBody: "百年纪念届世界杯将在南美洲拉开帷幕。",
    timelineStartDate: "2030年6月8日",
    timelineStartTitle: "2030年世界杯开幕",
    youngPlayer: "最佳年轻球员",
    youngPlayerMeaning: "最佳年轻球员",
    youngPlayerMeta: "🇪🇸 西班牙",
    youngPlayerStat: "年仅19岁，却踢满每一分钟。",
    youngPlayerWhy: "作为中后卫，他既能提前阻断进攻，也能用沉着准确的传球帮助西班牙发起进攻。"
  }),
  entities: Object.freeze({
    players: Object.freeze({
      "Aymeric Laporte": "艾默里克·拉波尔特",
      "Achraf Hakimi": "阿什拉夫·哈基米",
      "Dani Olmo": "达尼·奥尔莫",
      "Damian Emiliano Martinez": "埃米利亚诺·马丁内斯",
      "Dayot Upamecano": "达约·于帕梅卡诺",
      "Enzo Fernandez": "恩佐·费尔南德斯",
      "Eloy Room": "埃洛伊·鲁姆",
      "Erling Haaland": "埃尔林·哈兰德",
      "Ferran Torres": "费兰·托雷斯",
      "Fabian Ruiz": "法比安·鲁伊斯",
      "Gregor Kobel": "格雷戈·科贝尔",
      "Granit Xhaka": "格拉尼特·扎卡",
      "Harry Kane": "哈里·凯恩",
      "Jude Bellingham": "裘德·贝林厄姆",
      "Kai Havertz": "凯·哈弗茨",
      "Kylian Mbappe": "基利安·姆巴佩",
      "Keito Nakamura": "中村敬斗",
      "Lamine Yamal": "拉明·亚马尔",
      "Lionel Messi": "利昂内尔·梅西",
      "Leandro Bacuna": "莱安德罗·巴库纳",
      "Leandro Paredes": "莱昂德罗·帕雷德斯",
      "Lisandro Martinez": "利桑德罗·马丁内斯",
      "Marc Cucurella": "马克·库库雷利亚",
      "Manuel Akanji": "曼努埃尔·阿坎吉",
      "Marvin Senaya": "马文·塞纳亚",
      "Michael Olise": "迈克尔·奥利塞",
      "Mikel Oyarzabal": "米克尔·奥亚萨瓦尔",
      "Nuno Mendes": "努诺·门德斯",
      "Nick Woltemade": "尼克·沃尔特马德",
      "Orlando Gill": "奥兰多·希尔",
      "Ousmane Dembele": "奥斯曼·登贝莱",
      "Pau Cubarsi": "保·库巴西",
      "Pedro Porro": "佩德罗·波罗",
      "Pedro Vite": "佩德罗·维特",
      Rodri: "罗德里",
      "Tahith Chong": "塔希斯·钟",
      "Unai Simon": "乌奈·西蒙",
      "Virgil van Dijk": "维吉尔·范戴克",
      "William Saliba": "威廉·萨利巴",
      "Vinicius Junior": "维尼修斯·儒尼奥尔",
      "Weston McKennie": "韦斯顿·麦肯尼"
    }),
    teams: Object.freeze({
      Argentina: "阿根廷",
      Brazil: "巴西",
      "Cabo Verde": "卡博韦尔德",
      "Curaçao": "库拉索",
      Ecuador: "厄瓜多尔",
      England: "英格兰",
      France: "法国",
      Germany: "德国",
      Ghana: "加纳",
      Japan: "日本",
      Morocco: "摩洛哥",
      Netherlands: "荷兰",
      Norway: "挪威",
      Paraguay: "巴拉圭",
      Portugal: "葡萄牙",
      "Saudi Arabia": "沙特阿拉伯",
      Spain: "西班牙",
      Switzerland: "瑞士",
      Uruguay: "乌拉圭",
      "United States": "美国"
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

function setupChampionPhotoScoutReaction() {
  const championPhoto = document.querySelector(".champion-photo-frame");
  if (!championPhoto) {
    return;
  }

  const setHappy = (active) => {
    window.dispatchEvent(new CustomEvent("worldcup:scoutexpression", {
      detail: {
        active,
        expression: "pleased",
        source: CHAMPION_PHOTO_SCOUT_EXPRESSION_SOURCE
      }
    }));
  };

  championPhoto.addEventListener("pointerenter", () => setHappy(true));
  championPhoto.addEventListener("pointerleave", () => setHappy(false));
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
    bestCoachAria: "Best coach: {name}. {reason}",
    benchLabel: "Bench",
    bestXiInfo:
      document.querySelector('[data-i18n-tooltip="bestXiInfo"]')?.getAttribute("data-tooltip") ||
      "Selected by the site admin.",
    bestXiPitchLabel: "World Cup Simplified Best XI",
    formationLabel: "Formation",
    honourableMentionsAria: "Honorable Mentions: {count}",
    factAssists: "{count} assists",
    factChampion: "World champion",
    factCleanSheets: "{count} clean sheets",
    factGoals: "{count} goals",
    factGoldenBall: "Golden Ball",
    factGoldenGlove: "Golden Glove",
    factStarts: "{count} starts",
    factYoungPlayer: "Best Young Player",
    goldenBootTotal: "{goals} goals · {assists} assists.",
    loadError: "Unable to refresh the award names.",
    metaDescription: getElement("meta-description")?.content || "",
    metaTitle: document.title,
    ogDescription: getElement("og-description")?.content || "",
    ogTitle: getElement("og-title")?.content || "",
    positionAttackingMidfielder: "Attacking midfielder",
    positionCentralMidfielder: "Central midfielder",
    positionCentreBack: "Centre-back",
    positionDefensiveMidfielder: "Defensive midfielder",
    positionGoalkeeper: "Goalkeeper",
    positionLeftBack: "Left-back",
    positionLeftCentralMidfielder: "Left central midfielder",
    positionLeftWinger: "Left winger",
    positionRightBack: "Right-back",
    positionRightCentralMidfielder: "Right central midfielder",
    positionRightWinger: "Right winger",
    positionStriker: "Striker",
    playerAge: "Age {age}",
    playerEstimatedValue: "Est. value",
    playerEstimatedValueTooltip: "Estimated market value, shaped by public valuations, age, club level, role, and recent form.",
    playerPrime: "Prime",
    playerPrimeTooltip: "Career-high market value from the Transfermarkt dataset.",
    playerValue: "Value",
    playerValueTooltip: "Market value from sourced player valuation data.",
    rankAria: "{label}. {tooltip}",
    rankLabel: "{teamName} FIFA world ranking {rank} ({year})",
    rankTooltip: "FIFA world ranking during the {year} World Cup",
    sourceFifaAwards: "FIFA awards",
    sourceFinalReport: "World Cup final report",
    sourceFoxSports: "FOX Sports player ranking",
    sourceOptaAnalyst: "Opta Analyst Best XI",
    sourceStatLeaders: "Tournament stat leaders",
    sourceTournamentData: "Tournament data"
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
let activeAppLocalePack = null;
let loadedAwards = null;
let loadedProfiles = null;
let loadedCoachProfiles = null;
let loadedTeams = null;
let loadedStructuredGlossary = null;
let loadedBestXi = null;
let loadedRankingYear = null;
let activeHighlightRankPill = null;
let activeHighlightPlayerHover = null;
let activeBestXiPlayer = null;
let highlightPlayerCardHideTimer = 0;
let bestXiCardHideTimer = 0;

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

function updateShell() {
  const shellText = getLocaleShellMessages(currentLanguage);
  const settingsButton = getElement("settings-button");
  const settingsPopover = getElement("settings-popover");
  const languageSelect = getElement("language-select");
  const darkModeToggle = getElement("dark-mode-toggle");

  setText("back-link-label", BACK_LABELS[currentLanguage] || BACK_LABELS.en);
  setText("settings-language-label", shellText.language);
  setText("settings-dark-mode-label", shellText.darkMode);
  setText("settings-home-label", HOME_LABELS[currentLanguage] || HOME_LABELS.en);
  setText("footer-top-label", FOOTER_TOP_LABELS[currentLanguage] || FOOTER_TOP_LABELS.en);

  settingsButton?.setAttribute("aria-label", shellText.settings);
  settingsButton?.setAttribute("title", shellText.settings);
  settingsPopover?.setAttribute("aria-label", shellText.settings);
  darkModeToggle?.setAttribute("aria-label", shellText.darkMode);

  if (languageSelect) {
    languageSelect.value = currentLanguage;
  }
  if (darkModeToggle) {
    darkModeToggle.checked = window.worldCupTheme?.getTheme() === "dark";
  }
}

function applyLocale() {
  const config = getLanguageConfig(currentLanguage);
  document.documentElement.lang = config.htmlLang;
  document.documentElement.dir = config.direction;
  document.body.dataset.language = currentLanguage;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = activeLocale.text[element.dataset.i18n];
    if (value && !element.matches("[data-highlight-team-id]")) {
      element.textContent = value;
    }
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    const value = activeLocale.text[element.dataset.i18nAria];
    if (value) {
      element.setAttribute("aria-label", value);
    }
  });
  document.querySelectorAll("[data-i18n-tooltip]").forEach((element) => {
    const value = activeLocale.text[element.dataset.i18nTooltip];
    if (value) {
      element.setAttribute("data-tooltip", value);
      element.setAttribute("aria-label", value);
    }
  });
  updateMetadata();
  updateInternalLinks();
  updateShell();
  hideBestXiPlayerCard();
  renderAwards(loadedAwards || {}, loadedProfiles || {});
  renderBestXi();
  renderHighlightStoryTitles();
  renderHighlightPlayerMentions();
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
  const [locale, appLocalePack] = await Promise.all([
    loadHighlightsLocale(nextLanguage),
    ["es", "ko"].includes(nextLanguage)
      ? loadLocaleDomain(nextLanguage, "app")
      : Promise.resolve(null)
  ]);
  currentLanguage = nextLanguage;
  activeLocale = validateHighlightsLocale(locale, nextLanguage);
  activeAppLocalePack = appLocalePack;
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
    const control = select.closest(".language-control");
    select.disabled = true;
    select.setAttribute("aria-busy", "true");
    control?.classList.add("is-pending");
    try {
      await setLanguage(select.value);
    } catch (error) {
      console.error("Unable to switch highlights language", error);
      select.value = currentLanguage;
    } finally {
      select.disabled = false;
      select.removeAttribute("aria-busy");
      control?.classList.remove("is-pending");
    }
  });
}

function setSettingsOpen(isOpen) {
  const button = getElement("settings-button");
  const popover = getElement("settings-popover");
  if (!button || !popover) {
    return;
  }
  popover.classList.toggle("is-hidden", !isOpen);
  button.setAttribute("aria-expanded", String(isOpen));
}

function setupSettings() {
  const button = getElement("settings-button");
  const popover = getElement("settings-popover");
  const darkModeToggle = getElement("dark-mode-toggle");
  if (!button || !popover || !darkModeToggle) {
    return;
  }

  button.addEventListener("click", () => {
    setSettingsOpen(button.getAttribute("aria-expanded") !== "true");
  });

  darkModeToggle.addEventListener("change", () => {
    window.worldCupTheme?.setTheme(darkModeToggle.checked ? "dark" : "light");
  });

  window.worldCupTheme?.subscribe(({ theme }) => {
    darkModeToggle.checked = theme === "dark";
  });

  document.addEventListener("click", (event) => {
    if (
      button.getAttribute("aria-expanded") === "true"
      && !popover.contains(event.target)
      && !button.contains(event.target)
    ) {
      setSettingsOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
      setSettingsOpen(false);
      button.focus();
    }
  });
}

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load ${url}: ${response.status}`);
  }
  return response.json();
}

function getPlayerInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getHighlightTeamName(team) {
  return localizeEntity("teams", team?.name) || team?.name || "";
}

function getHighlightRankingYear(team) {
  const teamYear = Number(team?.fifaRankingYear);
  if (Number.isInteger(teamYear) && teamYear > 0) {
    return teamYear;
  }
  return Number.isInteger(loadedRankingYear) && loadedRankingYear > 0
    ? loadedRankingYear
    : 2026;
}

function createHighlightRankPill(team) {
  const rank = Number(team?.fifaRank);
  if (!Number.isInteger(rank) || rank <= 0) {
    return null;
  }

  const year = getHighlightRankingYear(team);
  const teamName = getHighlightTeamName(team);
  const label = formatMessage(activeLocale.text.rankLabel, { rank, teamName, year });
  const tooltip = formatMessage(activeLocale.text.rankTooltip, { year });
  const ariaLabel = formatMessage(activeLocale.text.rankAria, { label, tooltip });
  const pill = document.createElement("span");
  pill.className = "rank-pill";
  pill.tabIndex = 0;
  pill.textContent = `#${rank}`;
  pill.setAttribute("aria-label", ariaLabel);
  pill.setAttribute("data-tooltip", tooltip);
  return pill;
}

function getHighlightTitleSuffixSeparator(suffix) {
  if (["zh", "ko"].includes(currentLanguage) || /^[.,!?;:）)]/u.test(suffix)) {
    return "";
  }
  return " ";
}

function appendHighlightRankedTeamName(element, teamName, pill) {
  const lastSpaceIndex = teamName.lastIndexOf(" ");
  const prefix = lastSpaceIndex >= 0 ? teamName.slice(0, lastSpaceIndex + 1) : "";
  const finalNamePart = lastSpaceIndex >= 0 ? teamName.slice(lastSpaceIndex + 1) : teamName;
  if (prefix) {
    element.append(document.createTextNode(prefix));
  }
  const token = document.createElement("span");
  token.className = "football-team-rank-token";
  token.append(document.createTextNode(finalNamePart), document.createTextNode(" "), pill);
  element.append(token);
}

function appendHighlightRankedCopy(element, copy, teamIds = []) {
  const [teamId, ...remainingTeamIds] = teamIds;
  if (!teamId) {
    appendFootballInlineText(element, copy);
    return;
  }

  const team = loadedTeams?.[teamId];
  const teamName = getHighlightTeamName(team);
  const nameIndex = teamName ? copy.indexOf(teamName) : -1;
  const pill = createHighlightRankPill(team);
  if (nameIndex < 0 || !pill) {
    appendHighlightRankedCopy(element, copy, remainingTeamIds);
    return;
  }

  const suffix = copy.slice(nameIndex + teamName.length).trimStart();
  appendFootballInlineText(element, copy.slice(0, nameIndex));
  appendHighlightRankedTeamName(element, teamName, pill);
  element.append(document.createTextNode(getHighlightTitleSuffixSeparator(suffix)));
  appendHighlightRankedCopy(element, suffix, remainingTeamIds);
}

function renderHighlightStoryBody(teamId, bodyKey, bodyTeamIds) {
  if (!bodyKey || !bodyTeamIds?.length) {
    return;
  }
  const body = document.querySelector(`[data-highlight-body-team-id="${teamId}"]`);
  const copy = activeLocale.text[bodyKey];
  if (!body || !copy) {
    return;
  }
  body.replaceChildren();
  appendHighlightRankedCopy(body, copy, bodyTeamIds);
}

function renderHighlightStoryTitles() {
  closeHighlightRankTooltip();
  HIGHLIGHT_STORIES.forEach(({
    teamId,
    titleKey,
    additionalTeamIds = [],
    bodyKey,
    bodyTeamIds = []
  }) => {
    renderHighlightStoryBody(teamId, bodyKey, bodyTeamIds);
    const heading = document.querySelector(`[data-highlight-team-id="${teamId}"]`);
    const title = activeLocale.text[titleKey];
    const team = loadedTeams?.[teamId];
    if (!heading || !title) {
      return;
    }

    heading.textContent = title;
    const pill = createHighlightRankPill(team);
    if (!pill) {
      return;
    }

    const teamName = getHighlightTeamName(team);
    const startsWithTeamName = title.startsWith(teamName);
    const remainder = startsWithTeamName ? title.slice(teamName.length).trimStart() : title;
    heading.replaceChildren();
    if (startsWithTeamName) {
      appendHighlightRankedTeamName(heading, teamName, pill);
    } else {
      heading.append(pill);
    }
    heading.append(document.createTextNode(getHighlightTitleSuffixSeparator(remainder)));
    appendHighlightRankedCopy(heading, remainder, additionalTeamIds);
  });
}

function getHighlightPlayerName(playerName, profile = loadedProfiles?.[playerName]) {
  return localizeEntity("players", playerName) || profile?.displayName || playerName || "";
}

function getHighlightPlayerPosition(profile) {
  const position = formatPlayerPosition(profile?.position);
  if (!position) {
    return "";
  }
  const parts = position.split(",").map((part) => part.trim()).filter(Boolean);
  if (currentLanguage === "zh") {
    return parts
      .map((part) => ZH_PLAYER_POSITIONS[part.toLocaleLowerCase("en-US")] || part)
      .join("、");
  }
  if (["es", "ko"].includes(currentLanguage)) {
    return parts
      .map((part) =>
        activeAppLocalePack?.helpers?.translateLineupPosition?.(part)
        || activeAppLocalePack?.helpers?.translateText?.(part)
        || part
      )
      .join(currentLanguage === "ko" ? " · " : ", ");
  }
  return position;
}

function getHighlightPlayerSkills(profile) {
  return (profile?.skills || []).map((skill) => {
    if (currentLanguage === "zh") {
      return ZH_PLAYER_SKILLS[skill] || skill;
    }
    if (["es", "ko"].includes(currentLanguage)) {
      return activeAppLocalePack?.helpers?.formatPlayerSkill?.(skill) || skill;
    }
    return skill;
  }).filter(Boolean);
}

function renderHighlightPlayerSkillList(profile) {
  const skills = getHighlightPlayerSkills(profile).slice(0, 4);
  return skills.length
    ? `<span class="player-skill-list">${skills.map((skill) => `<span>${escapeHtml(skill)}</span>`).join("")}</span>`
    : "";
}

function getHighlightPlayerNote(playerName, profile) {
  if (currentLanguage === "zh") {
    return profile?.noteZh || profile?.note || "";
  }
  if (["es", "ko"].includes(currentLanguage)) {
    return activeAppLocalePack?.helpers?.formatPlayerNote?.(profile?.note, {
      localizedName: getHighlightPlayerName(playerName, profile)
    }) || getHighlightPlayerSkills(profile).join(" · ");
  }
  return profile?.note || "";
}

function getHighlightPlayerAge(profile, referenceDate = new Date()) {
  const birthDate = String(profile?.birthDate || profile?.dateOfBirth || "").trim();
  const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  let age = referenceDate.getFullYear() - year;
  const hasHadBirthday =
    referenceDate.getMonth() + 1 > month ||
    (referenceDate.getMonth() + 1 === month && referenceDate.getDate() >= day);
  if (!hasHadBirthday) {
    age -= 1;
  }
  return Number.isInteger(age) && age >= 0 && age < 100 ? age : null;
}

function formatHighlightMarketValueEur(value) {
  const millions = Number(value);
  if (!Number.isFinite(millions) || millions <= 0) {
    return "";
  }
  if (millions < 1) {
    return `€${Math.round(millions * 1000)}k`;
  }
  if (millions >= 1000) {
    const billions = millions / 1000;
    return `€${Number.isInteger(billions) ? billions : billions.toFixed(1)}bn`;
  }
  return `€${Number.isInteger(millions) ? millions : millions.toFixed(1)}m`;
}

function getHighlightPlayerMarketValueInfo(profile) {
  const sourcedValue = Number(profile?.marketValueEurMillions);
  if (Number.isFinite(sourcedValue) && sourcedValue > 0) {
    return { estimated: false, value: sourcedValue };
  }
  const estimatedValue = Number(profile?.estimatedMarketValueEurMillions);
  if (Number.isFinite(estimatedValue) && estimatedValue > 0) {
    return { estimated: true, value: estimatedValue };
  }
  return null;
}

function renderHighlightPlayerValueLine(profile) {
  const marketValue = getHighlightPlayerMarketValueInfo(profile);
  const value = formatHighlightMarketValueEur(marketValue?.value);
  if (!marketValue || !value) {
    return "";
  }

  const label = marketValue.estimated
    ? activeLocale.text.playerEstimatedValue
    : activeLocale.text.playerValue;
  const tooltip = marketValue.estimated
    ? activeLocale.text.playerEstimatedValueTooltip
    : activeLocale.text.playerValueTooltip;
  const peakValue = Number(profile?.peakMarketValueEurMillions);
  const primeValue = Number.isFinite(peakValue) && peakValue > marketValue.value
    ? formatHighlightMarketValueEur(peakValue)
    : "";
  const primeSuffix = primeValue
    ? ` (<span class="player-card-value-help" tabindex="0" aria-label="${escapeHtml(activeLocale.text.playerPrimeTooltip)}" data-tooltip="${escapeHtml(activeLocale.text.playerPrimeTooltip)}">${escapeHtml(activeLocale.text.playerPrime)}</span> ${escapeHtml(primeValue)})`
    : "";

  return `<span class="player-card-value-help" tabindex="0" aria-label="${escapeHtml(tooltip)}" data-tooltip="${escapeHtml(tooltip)}">${escapeHtml(label)}</span> ${escapeHtml(value)}${primeSuffix}`;
}

function renderHighlightPlayerCopy(note, profile, noteClass = "") {
  const age = getHighlightPlayerAge(profile);
  const ageLine = age === null
    ? ""
    : escapeHtml(formatMessage(activeLocale.text.playerAge, { age }));
  const valueLine = renderHighlightPlayerValueLine(profile);
  const metaLine = [ageLine, valueLine].filter(Boolean).join(" • ");
  const noteParagraphs = (Array.isArray(note) ? note : [note])
    .map((paragraph) => String(paragraph || "").trim())
    .filter(Boolean);
  const noteMarkup = noteParagraphs
    .map(
      (paragraph, index) =>
        `<span class="player-card-note${noteClass ? ` ${escapeHtml(noteClass)}` : ""}" data-player-copy-paragraph="${index + 1}">${escapeHtml(paragraph)}</span>`
    )
    .join("");
  const metaMarkup = metaLine
    ? `<span class="player-card-note player-card-meta">${metaLine}</span>`
    : "";
  return noteMarkup || metaMarkup
    ? `<span class="player-card-copy">${noteMarkup}${metaMarkup}</span>`
    : "";
}

function createHighlightPlayerMention(playerName) {
  const profile = loadedProfiles?.[playerName];
  if (!profile) {
    return null;
  }
  const displayName = getHighlightPlayerName(playerName, profile);
  const position = getHighlightPlayerPosition(profile);
  const club = getHighlightPlayerClubLine(profile);
  const note = getHighlightPlayerNote(playerName, profile);
  const uniformNumber = getPlayerCardUniformNumber(getBestXiPlayerByName(playerName), profile);
  const numberBadge = uniformNumber
    ? `<span class="player-card-number">#${escapeHtml(uniformNumber)}</span>`
    : "";
  const initials = getPlayerInitials(displayName);
  const cardFlag = renderHighlightPlayerFlag(profile);
  const photoMarkup = profile.imageUrl
    ? `
      <span class="player-photo-fallback">${escapeHtml(initials)}</span>
      <img
        src="${escapeHtml(profile.imageUrl)}"
        alt=""
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
        data-best-xi-image="true"
        data-best-xi-image-url="${escapeHtml(profile.imageUrl)}"
      />
    `
    : `<span class="player-photo-fallback">${escapeHtml(initials)}</span>`;

  const wrapper = document.createElement("span");
  wrapper.className = "player-hover highlight-player-hover";
  wrapper.dataset.highlightPlayerName = playerName;
  const trigger = document.createElement("span");
  trigger.className = "player-link highlight-player-link";
  trigger.setAttribute("role", "button");
  trigger.tabIndex = 0;
  trigger.dataset.highlightPlayerTrigger = "true";
  trigger.textContent = displayName;
  trigger.setAttribute("aria-label", [displayName, position, club].filter(Boolean).join(", "));
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", HIGHLIGHT_PLAYER_CARD_ID);

  const card = document.createElement("span");
  card.className = "player-card highlight-player-card";
  card.setAttribute("role", "tooltip");
  card.innerHTML = `
    <span class="player-card-header">
      <span class="player-photo">${photoMarkup}</span>
      <span class="player-card-title">
        <span class="player-card-name-line">
          ${cardFlag}
          <strong class="player-card-name">${escapeHtml(displayName)}</strong>
          ${numberBadge}
        </span>
        <span class="player-card-position">${escapeHtml(position)}</span>
        <span class="player-card-club">${escapeHtml(club)}</span>
      </span>
    </span>
    ${renderHighlightPlayerSkillList(profile)}
    ${renderHighlightPlayerCopy(note, profile)}
  `;
  wrapper.append(trigger, card);
  activateBestXiImages(wrapper);
  return wrapper;
}

function appendHighlightPlayerCopy(element, copy, playerNames = [], teamIds = []) {
  const playerCandidates = playerNames.map((playerName) => {
    const profile = loadedProfiles?.[playerName];
    const label = getHighlightPlayerName(playerName, profile);
    return { type: "player", key: playerName, label, index: label ? copy.indexOf(label) : -1 };
  });
  const teamCandidates = teamIds.map((teamId) => {
    const team = loadedTeams?.[teamId];
    const label = getHighlightTeamName(team);
    return { type: "team", key: teamId, label, index: label ? copy.indexOf(label) : -1 };
  });
  const candidate = [...playerCandidates, ...teamCandidates]
    .filter(({ index }) => index >= 0)
    .sort((left, right) => left.index - right.index)[0];
  if (!candidate) {
    appendFootballInlineText(element, copy);
    return;
  }

  appendFootballInlineText(element, copy.slice(0, candidate.index));
  const remainingPlayerNames = candidate.type === "player"
    ? playerNames.filter((playerName) => playerName !== candidate.key)
    : playerNames;
  const remainingTeamIds = candidate.type === "team"
    ? teamIds.filter((teamId) => teamId !== candidate.key)
    : teamIds;

  if (candidate.type === "player") {
    const mention = createHighlightPlayerMention(candidate.key);
    element.append(mention || document.createTextNode(candidate.label));
    appendHighlightPlayerCopy(
      element,
      copy.slice(candidate.index + candidate.label.length),
      remainingPlayerNames,
      remainingTeamIds
    );
    return;
  }

  const pill = createHighlightRankPill(loadedTeams?.[candidate.key]);
  const suffix = copy.slice(candidate.index + candidate.label.length).trimStart();
  if (pill) {
    appendHighlightRankedTeamName(element, candidate.label, pill);
    element.append(document.createTextNode(getHighlightTitleSuffixSeparator(suffix)));
  } else {
    element.append(document.createTextNode(candidate.label));
    element.append(document.createTextNode(getHighlightTitleSuffixSeparator(suffix)));
  }
  appendHighlightPlayerCopy(
    element,
    suffix,
    remainingPlayerNames,
    remainingTeamIds
  );
}

function renderHighlightPlayerMentions() {
  closeHighlightPlayerCard();
  document.querySelectorAll("[data-highlight-player-mentions]").forEach((element) => {
    const copy = activeLocale.text[element.dataset.i18n] || element.textContent || "";
    const playerNames = String(element.dataset.highlightPlayerMentions || "")
      .split("|")
      .map((name) => name.trim())
      .filter(Boolean);
    const teamIds = String(element.dataset.highlightBodyTeamIds || "")
      .split("|")
      .map((teamId) => teamId.trim())
      .filter(Boolean);
    element.replaceChildren();
    appendHighlightPlayerCopy(element, copy, playerNames, teamIds);
  });
}

function renderAwardPlayerName(elementId, playerName) {
  const element = getElement(elementId);
  const mention = createHighlightPlayerMention(playerName);
  if (!element || !mention) {
    setText(elementId, getHighlightPlayerName(playerName));
    return;
  }
  element.replaceChildren(mention);
}

function getHighlightPlayerHover(target) {
  return target instanceof Element ? target.closest(".highlight-player-hover") : null;
}

function updateHighlightPlayerValueTooltipBounds(card) {
  if (!(card instanceof HTMLElement)) {
    return;
  }

  const cardRect = card.getBoundingClientRect();
  if (!cardRect.width || getComputedStyle(card).overflowX === "visible") {
    return;
  }

  const edgeGap = 6;
  const clipLeft = cardRect.left + card.clientLeft;
  const clipRight = clipLeft + card.clientWidth;

  card.querySelectorAll(".player-card-value-help[data-tooltip]").forEach((help) => {
    help.style.removeProperty("--tooltip-shift-x");
    const helpRect = help.getBoundingClientRect();
    const tooltip = getComputedStyle(help, "::after");
    const tooltipWidth =
      Number.parseFloat(tooltip.width || "0") +
      Number.parseFloat(tooltip.paddingLeft || "0") +
      Number.parseFloat(tooltip.paddingRight || "0") +
      Number.parseFloat(tooltip.borderLeftWidth || "0") +
      Number.parseFloat(tooltip.borderRightWidth || "0");
    if (!helpRect.width || !tooltipWidth) {
      return;
    }

    const idealLeft = helpRect.left + helpRect.width / 2 - tooltipWidth / 2;
    const minLeft = clipLeft + edgeGap;
    const maxLeft = Math.max(minLeft, clipRight - edgeGap - tooltipWidth);
    const boundedLeft = Math.min(maxLeft, Math.max(minLeft, idealLeft));
    const shift = boundedLeft - idealLeft;
    if (Math.abs(shift) > 0.5) {
      help.style.setProperty("--tooltip-shift-x", `${shift.toFixed(2)}px`);
    }
  });
}

function positionHighlightInlinePlayerCard(playerHover) {
  const trigger = playerHover?.querySelector("[data-highlight-player-trigger]");
  const card = playerHover?.querySelector(".highlight-player-card");
  if (!trigger || !card) {
    return;
  }
  const viewportMargin = 18;
  const cardWidth = Math.min(292, Math.max(0, window.innerWidth - viewportMargin * 2));
  const triggerRect = trigger.getBoundingClientRect();
  const desiredLeft = Math.min(
    Math.max(triggerRect.left, viewportMargin),
    Math.max(viewportMargin, window.innerWidth - cardWidth - viewportMargin)
  );
  card.style.setProperty("--player-card-width", `${cardWidth}px`);
  card.style.setProperty("--player-card-shift", `${Math.round(desiredLeft - triggerRect.left)}px`);
  playerHover.classList.toggle("is-card-below", triggerRect.top < 270);
  updateHighlightPlayerValueTooltipBounds(card);
}

function positionHighlightFloatingPlayerCard(playerHover) {
  const trigger = playerHover?.querySelector("[data-highlight-player-trigger]");
  const card = getElement(HIGHLIGHT_PLAYER_CARD_ID);
  if (!trigger || !card) {
    return;
  }
  const viewportMargin = 12;
  const gap = 9;
  const viewport = window.visualViewport;
  const viewportLeft = viewport?.offsetLeft || 0;
  const viewportTop = viewport?.offsetTop || 0;
  const viewportWidth = viewport?.width || window.innerWidth;
  const viewportHeight = viewport?.height || window.innerHeight;
  const viewportRight = viewportLeft + viewportWidth;
  const viewportBottom = viewportTop + viewportHeight;
  const width = Math.min(292, viewportWidth - viewportMargin * 2);
  card.style.setProperty("--player-card-width", `${width}px`);
  card.style.setProperty("--player-card-floating-left", `${viewportLeft + viewportMargin}px`);
  card.style.setProperty("--player-card-floating-top", `${viewportTop + viewportMargin}px`);
  const triggerRect = trigger.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const left = Math.min(
    viewportRight - width - viewportMargin,
    Math.max(viewportLeft + viewportMargin, triggerRect.left + triggerRect.width / 2 - width / 2)
  );
  const above = triggerRect.top - cardRect.height - gap;
  const below = triggerRect.bottom + gap;
  const top = above >= viewportTop + viewportMargin
    ? above
    : Math.min(below, viewportBottom - cardRect.height - viewportMargin);
  card.style.setProperty("--player-card-floating-left", `${Math.round(left)}px`);
  card.style.setProperty(
    "--player-card-floating-top",
    `${Math.max(viewportTop + viewportMargin, Math.round(top))}px`
  );
  updateHighlightPlayerValueTooltipBounds(card);
}

function shouldUseHighlightFloatingCard(playerHover) {
  return Boolean(
    playerHover?.classList?.contains("best-xi-coach-hover") || isBestXiTouchMode()
  );
}

function queueHighlightPlayerCardClose(playerHover = activeHighlightPlayerHover) {
  window.clearTimeout(highlightPlayerCardHideTimer);
  highlightPlayerCardHideTimer = window.setTimeout(() => {
    if (activeHighlightPlayerHover === playerHover) {
      closeHighlightPlayerCard();
    }
  }, PLAYER_CARD_HOVER_HANDOFF_MS);
}

function closeHighlightPlayerCard(options = {}) {
  const { restoreFocus = false } = options;
  window.clearTimeout(highlightPlayerCardHideTimer);
  const floatingCard = getElement(HIGHLIGHT_PLAYER_CARD_ID);
  floatingCard?.classList.remove("is-visible");
  floatingCard?.setAttribute("aria-hidden", "true");
  if (!activeHighlightPlayerHover) {
    return;
  }
  const trigger = activeHighlightPlayerHover.querySelector("[data-highlight-player-trigger]");
  activeHighlightPlayerHover.classList.remove("is-card-open");
  activeHighlightPlayerHover.classList.remove("is-card-portaled");
  trigger?.setAttribute("aria-expanded", "false");
  activeHighlightPlayerHover = null;
  if (restoreFocus) {
    trigger?.focus({ preventScroll: true });
  }
}

function openHighlightPlayerCard(playerHover) {
  if (!(playerHover instanceof HTMLElement)) {
    return;
  }
  window.clearTimeout(highlightPlayerCardHideTimer);
  if (activeHighlightPlayerHover && activeHighlightPlayerHover !== playerHover) {
    closeHighlightPlayerCard();
  }
  activeHighlightPlayerHover = playerHover;
  activeHighlightPlayerHover.classList.add("is-card-open");
  const trigger = activeHighlightPlayerHover.querySelector("[data-highlight-player-trigger]");
  trigger?.setAttribute("aria-expanded", "true");
  positionHighlightInlinePlayerCard(activeHighlightPlayerHover);
  if (!shouldUseHighlightFloatingCard(activeHighlightPlayerHover)) {
    return;
  }
  const sourceCard = activeHighlightPlayerHover.querySelector(".highlight-player-card");
  const floatingCard = getElement(HIGHLIGHT_PLAYER_CARD_ID);
  if (!sourceCard || !floatingCard) {
    return;
  }
  activeHighlightPlayerHover.classList.add("is-card-portaled");
  floatingCard.innerHTML = sourceCard.innerHTML;
  floatingCard.setAttribute("aria-hidden", "false");
  activateBestXiImages(floatingCard);
  positionHighlightFloatingPlayerCard(activeHighlightPlayerHover);
  floatingCard.classList.add("is-visible");
  floatingCard.querySelectorAll("img").forEach((image) => {
    image.addEventListener("load", () => {
      if (
        activeHighlightPlayerHover === playerHover
        && shouldUseHighlightFloatingCard(playerHover)
      ) {
        positionHighlightFloatingPlayerCard(playerHover);
      }
    }, { once: true });
  });
}

function setupHighlightPlayerInteractions() {
  document.addEventListener("pointerover", (event) => {
    const playerHover = getHighlightPlayerHover(event.target);
    if (playerHover && !isBestXiTouchMode()) {
      if (playerHover.classList.contains("best-xi-coach-hover")) {
        if (!playerHover.contains(event.relatedTarget)) {
          openHighlightPlayerCard(playerHover);
        }
      } else {
        positionHighlightInlinePlayerCard(playerHover);
      }
    }
  }, true);
  document.addEventListener("pointerout", (event) => {
    const playerHover = getHighlightPlayerHover(event.target);
    const floatingCard = getElement(HIGHLIGHT_PLAYER_CARD_ID);
    if (
      playerHover?.classList.contains("best-xi-coach-hover")
      && !isBestXiTouchMode()
      && !playerHover.contains(event.relatedTarget)
      && !floatingCard?.contains(event.relatedTarget)
    ) {
      queueHighlightPlayerCardClose(playerHover);
    }
  }, true);
  document.addEventListener("focusin", (event) => {
    const playerHover = getHighlightPlayerHover(event.target);
    if (!playerHover) {
      return;
    }
    if (playerHover.classList.contains("best-xi-coach-hover")) {
      openHighlightPlayerCard(playerHover);
      return;
    }
    positionHighlightInlinePlayerCard(playerHover);
    playerHover.querySelector("[data-highlight-player-trigger]")?.setAttribute("aria-expanded", "true");
  }, true);
  document.addEventListener("focusout", (event) => {
    const playerHover = getHighlightPlayerHover(event.target);
    if (
      playerHover
      && !playerHover.contains(event.relatedTarget)
      && playerHover !== activeHighlightPlayerHover
    ) {
      playerHover.querySelector("[data-highlight-player-trigger]")?.setAttribute("aria-expanded", "false");
    }
  }, true);
  document.addEventListener("click", (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest("[data-highlight-player-trigger]")
      : null;
    if (!trigger) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const playerHover = trigger.closest(".highlight-player-hover");
    if (playerHover?.classList.contains("best-xi-coach-hover") && !isBestXiTouchMode()) {
      openHighlightPlayerCard(playerHover);
      trigger.focus({ preventScroll: true });
    } else if (activeHighlightPlayerHover === playerHover) {
      closeHighlightPlayerCard({ restoreFocus: true });
    } else {
      openHighlightPlayerCard(playerHover);
      trigger.focus({ preventScroll: true });
    }
  }, true);
  document.addEventListener("keydown", (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest("[data-highlight-player-trigger]")
      : null;
    if (trigger && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      const playerHover = trigger.closest(".highlight-player-hover");
      if (activeHighlightPlayerHover === playerHover) {
        closeHighlightPlayerCard({ restoreFocus: true });
      } else {
        openHighlightPlayerCard(playerHover);
      }
      return;
    }
    if (event.key === "Escape" && activeHighlightPlayerHover) {
      closeHighlightPlayerCard({ restoreFocus: true });
    }
  }, true);
  document.addEventListener("pointerdown", (event) => {
    if (
      activeHighlightPlayerHover
      && !activeHighlightPlayerHover.contains(event.target)
      && !getElement(HIGHLIGHT_PLAYER_CARD_ID)?.contains(event.target)
    ) {
      closeHighlightPlayerCard();
    }
  });
  const floatingCard = getElement(HIGHLIGHT_PLAYER_CARD_ID);
  floatingCard?.addEventListener("pointerenter", () => {
    window.clearTimeout(highlightPlayerCardHideTimer);
  });
  floatingCard?.addEventListener("pointerleave", () => {
    if (activeHighlightPlayerHover?.classList.contains("best-xi-coach-hover")) {
      queueHighlightPlayerCardClose(activeHighlightPlayerHover);
    }
  });
  window.addEventListener("resize", () => {
    document.querySelectorAll(".highlight-player-hover").forEach(positionHighlightInlinePlayerCard);
    if (
      activeHighlightPlayerHover
      && shouldUseHighlightFloatingCard(activeHighlightPlayerHover)
    ) {
      positionHighlightFloatingPlayerCard(activeHighlightPlayerHover);
    }
  });
  window.addEventListener("scroll", () => {
    if (
      activeHighlightPlayerHover
      && shouldUseHighlightFloatingCard(activeHighlightPlayerHover)
    ) {
      closeHighlightPlayerCard();
    }
  }, { passive: true });
}

function closeHighlightRankTooltip() {
  if (!activeHighlightRankPill) {
    return;
  }
  if (document.activeElement === activeHighlightRankPill) {
    activeHighlightRankPill.blur();
  }
  activeHighlightRankPill.classList.remove("is-touch-tooltip-open");
  activeHighlightRankPill = null;
}

function updateHighlightRankTooltipBounds(pill) {
  if (!(pill instanceof HTMLElement)) {
    return;
  }
  pill.style.removeProperty("--tooltip-shift-x");
  const rect = pill.getBoundingClientRect();
  const width = Math.min(230, window.innerWidth * 0.72);
  const edgeGap = 6;
  const idealLeft = rect.left + rect.width / 2 - width / 2;
  const clampedLeft = Math.min(
    window.innerWidth - width - edgeGap,
    Math.max(edgeGap, idealLeft)
  );
  pill.style.setProperty("--tooltip-shift-x", `${Math.round(clampedLeft - idealLeft)}px`);
}

function setupHighlightRankInteractions() {
  const getPill = (target) => target instanceof Element
    ? target.closest(".highlight-row .rank-pill[data-tooltip]")
    : null;

  document.addEventListener("pointerover", (event) => {
    updateHighlightRankTooltipBounds(getPill(event.target));
  }, true);
  document.addEventListener("focusin", (event) => {
    updateHighlightRankTooltipBounds(getPill(event.target));
  }, true);
  document.addEventListener("pointerdown", (event) => {
    const pill = getPill(event.target);
    const isTouch = event.pointerType === "touch"
      || event.pointerType === "pen"
      || (!event.pointerType && window.matchMedia?.("(hover: none), (pointer: coarse)").matches);
    if (!pill || !isTouch) {
      if (!pill) {
        closeHighlightRankTooltip();
      }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (activeHighlightRankPill && activeHighlightRankPill !== pill) {
      closeHighlightRankTooltip();
    }
    activeHighlightRankPill = pill;
    activeHighlightRankPill.classList.add("is-touch-tooltip-open");
    activeHighlightRankPill.focus({ preventScroll: true });
    updateHighlightRankTooltipBounds(activeHighlightRankPill);
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeHighlightRankPill) {
      const pill = activeHighlightRankPill;
      closeHighlightRankTooltip();
      pill.focus({ preventScroll: true });
    }
  });
  window.addEventListener("resize", () => {
    document.querySelectorAll(".highlight-row .rank-pill[data-tooltip]")
      .forEach(updateHighlightRankTooltipBounds);
  });
  window.addEventListener("scroll", closeHighlightRankTooltip, { passive: true });
}

function getBestXiSelection() {
  return loadedBestXi?.selection || null;
}

function getBestXiTeam(teamId) {
  return loadedTeams?.[teamId] || null;
}

function getHighlightPlayerTeam(profile, fallbackTeamId = "") {
  return getBestXiTeam(profile?.teamId || fallbackTeamId);
}

function getHighlightPlayerClubLine(profile) {
  const localizeValue = (translations, glossaryField) => (value) => {
    if (currentLanguage === "zh") {
      return translations[value] || value;
    }
    if (["es", "ko"].includes(currentLanguage)) {
      return loadedStructuredGlossary?.[glossaryField]?.[currentLanguage]?.[value]
        || activeAppLocalePack?.helpers?.translateText?.(value)
        || value;
    }
    return value;
  };
  return formatPlayerClubLine({
    club: profile?.club,
    league: profile?.league,
    language: currentLanguage,
    localizeClub: localizeValue(ZH_CLUB_NAME_TRANSLATIONS, "clubs"),
    localizeLeague: localizeValue(ZH_LEAGUE_NAME_TRANSLATIONS, "leagues")
  });
}

function renderHighlightPlayerFlag(profile, fallbackTeamId = "") {
  const team = getHighlightPlayerTeam(profile, fallbackTeamId);
  if (!team || (!team.flag && !team.flagClass)) {
    return "";
  }
  const className = ["flag", team.flagClass].filter(Boolean).join(" ");
  const content = team.flagClass ? "" : escapeHtml(team.flag);
  const teamName = getBestXiTeamName(team.id);
  const label = currentLanguage === "zh"
    ? `${teamName}旗帜`
    : activeAppLocalePack?.helpers?.formatAppMessage?.("flag-label", { teamName }) || `${teamName} flag`;
  return `<span class="player-card-flag"><span class="${escapeHtml(className)}" role="img" aria-label="${escapeHtml(label)}">${content}</span></span>`;
}

function getBestXiHonourables(slot) {
  if (Array.isArray(slot?.honourables)) {
    return slot.honourables.filter(
      (player, index) => Boolean(player) && (index === 0 || player.showInHonourableMentions === true)
    );
  }
  return slot?.honourable ? [slot.honourable] : [];
}

function getBestXiPlayer(slot, kind = "starter", index = 0) {
  return kind === "honourable"
    ? getBestXiHonourables(slot)[Number(index) || 0]
    : slot?.starter;
}

function getBestXiPlayerByName(playerName) {
  const requestedName = String(playerName || "").trim();
  if (!requestedName) {
    return null;
  }
  for (const slot of getBestXiSelection()?.slots || []) {
    const match = [slot?.starter, ...getBestXiHonourables(slot)]
      .find((player) => player?.playerName === requestedName);
    if (match) {
      return match;
    }
  }
  return null;
}

function getBestXiDisplayName(player) {
  const profile = loadedProfiles?.[player?.playerName];
  const fallbackName = profile?.displayName || player?.playerName || "";
  return localizeEntity("players", player?.playerName) || fallbackName;
}

function getBestXiTeamName(teamId) {
  const team = getBestXiTeam(teamId);
  return localizeEntity("teams", team?.name) || team?.name || teamId || "";
}

function getBestXiPositionLabel(position) {
  return activeLocale.text[POSITION_TEXT_KEYS[position]] || position || "";
}

function getBestXiReason(player) {
  return player?.reason?.[currentLanguage] || player?.reason?.en || "";
}

function formatBestXiFact(fact) {
  const template = activeLocale.text[FACT_TEXT_KEYS[fact?.type]];
  return template ? formatMessage(template, { count: fact?.value }) : "";
}

function getBestXiScoringFacts(player) {
  return (player?.facts || []).filter(
    (fact) => ["goals", "assists"].includes(fact?.type) && Number(fact?.value) > 0
  );
}

function renderBestXiScoringBadges(player) {
  const badges = getBestXiScoringFacts(player)
    .map((fact) => {
      const kind = fact.type === "assists" ? "assist" : "goal";
      const suffix = kind === "assist" ? "A" : "G";
      return `
        <span class="lineup-event-badge lineup-event-score is-${kind} is-count">
          <span class="lineup-event-score-label">${escapeHtml(`${fact.value}${suffix}`)}</span>
        </span>
      `;
    })
    .join("");
  return badges
    ? `
      <span class="lineup-avatar-event-lane lineup-avatar-right-events" aria-hidden="true">
        <span class="lineup-event-list lineup-avatar-score-events">${badges}</span>
      </span>
    `
    : "";
}

function renderBestXiAvatar(player, profile) {
  const displayName = getBestXiDisplayName(player);
  const initials = getPlayerInitials(displayName);
  const fallback = `<span class="lineup-avatar">${escapeHtml(initials)}</span>`;
  if (!profile?.imageUrl) {
    return fallback;
  }
  return `
    ${fallback}
    <img
      class="lineup-avatar-image"
      src="${escapeHtml(profile.imageUrl)}"
      alt=""
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      data-best-xi-image="true"
      data-best-xi-image-url="${escapeHtml(profile.imageUrl)}"
    />
  `;
}

function renderBestXiLineupValueLine(profile) {
  const marketValue = getHighlightPlayerMarketValueInfo(profile);
  const value = formatHighlightMarketValueEur(marketValue?.value);
  return value ? `<span class="lineup-player-value">(${escapeHtml(value)})</span>` : "";
}

function renderBestXiPlayerOption(slot, player, { kind, index = 0 } = {}) {
  if (!player) {
    return "";
  }
  const profile = loadedProfiles?.[player.playerName];
  const displayName = getBestXiDisplayName(player);
  const clubLine = getHighlightPlayerClubLine(profile);
  const positionLabel = getHighlightPlayerPosition(profile) || getBestXiPositionLabel(player.position);
  const uniformNumber = getPlayerCardUniformNumber(player, profile);
  const scoringSummary = getBestXiScoringFacts(player).map(formatBestXiFact).filter(Boolean);
  const lineupLabel = currentLanguage === "zh" ? displayName : formatLineupShortName(displayName);
  const avatarMarkup = renderLineupAvatarFrame({
    avatarMarkup: renderBestXiAvatar(player, profile),
    rightEventsMarkup: renderBestXiScoringBadges(player)
  });

  return `
    <span
      class="player-hover lineup-player-hover best-xi-player-hover best-xi-player-option"
      data-best-xi-player-kind="${escapeHtml(kind)}"
      data-best-xi-player-index="${escapeHtml(index)}"
      data-best-xi-player-name="${escapeHtml(player.playerName)}"
    >
      ${avatarMarkup}
      <span
        class="player-link lineup-player-name"
        role="button"
        tabindex="0"
        data-best-xi-player-trigger="true"
        aria-label="${escapeHtml([displayName, positionLabel, clubLine, ...scoringSummary].filter(Boolean).join(", "))}"
        aria-controls="${BEST_XI_CARD_ID}"
        aria-expanded="false"
      >${escapeHtml(lineupLabel)}</span>
      ${renderBestXiLineupValueLine(profile)}
    </span>
  `;
}

function renderBestXiMarker(slot) {
  const player = slot?.starter;
  const positionLabel = getBestXiPositionLabel(slot.starter?.position);
  const displayName = getBestXiDisplayName(player);

  return renderLineupPlayerMarkerShell({
    className: "best-xi-marker",
    style: `--x: ${escapeHtml(slot.x)}%; --y: ${escapeHtml(slot.y)}%;`,
    attributes: `
      role="listitem"
      data-best-xi-slot="${escapeHtml(slot.id)}"
      data-best-xi-kind="starter"
      aria-label="${escapeHtml([positionLabel, displayName].filter(Boolean).join(", "))}"
    `,
    content: renderBestXiPlayerOption(slot, player, { kind: "starter" })
  });
}

function getBestXiHonourableEntries(selection) {
  return (selection?.slots || [])
    .flatMap((slot) => getBestXiHonourables(slot).map((player, index) => ({ slot, player, index })));
}

function renderBestXiHonourablePlayer(slot, player, index = 0) {
  const profile = loadedProfiles?.[player.playerName];
  const displayName = getBestXiDisplayName(player);
  const lineupLabel = currentLanguage === "zh" ? displayName : formatLineupShortName(displayName);
  const positionLabel = getHighlightPlayerPosition(profile) || getBestXiPositionLabel(player.position || slot?.starter?.position);
  const clubLine = getHighlightPlayerClubLine(profile);
  const scoringSummary = getBestXiScoringFacts(player).map(formatBestXiFact).filter(Boolean);
  return `
    <li
      class="lineup-bench-player best-xi-player-option best-xi-honourable-player"
      data-best-xi-slot="${escapeHtml(slot.id)}"
      data-best-xi-player-kind="honourable"
      data-best-xi-player-index="${escapeHtml(index)}"
      data-best-xi-player-name="${escapeHtml(player.playerName)}"
    >
      <span class="lineup-bench-name">
        <span
          class="player-link"
          role="button"
          tabindex="0"
          data-best-xi-player-trigger="true"
          aria-label="${escapeHtml([displayName, positionLabel, clubLine, ...scoringSummary].filter(Boolean).join(", "))}"
          aria-controls="${BEST_XI_CARD_ID}"
          aria-expanded="false"
        >${escapeHtml(lineupLabel)}</span>
      </span>
      <span class="lineup-bench-position">${escapeHtml(positionLabel)}</span>
    </li>
  `;
}

function renderBestXiHonourables(selection) {
  const entries = getBestXiHonourableEntries(selection);
  const list = getElement("best-xi-honourables-list");
  const count = getElement("best-xi-honourables-count");
  const button = document.querySelector(".best-xi-honourables-button");
  if (!list || !count || !(button instanceof HTMLButtonElement)) {
    return;
  }
  list.innerHTML = entries
    .map(({ slot, player, index }) => renderBestXiHonourablePlayer(slot, player, index))
    .join("");
  count.textContent = String(entries.length);
  button.setAttribute(
    "aria-label",
    formatMessage(activeLocale.text.honourableMentionsAria, { count: entries.length })
  );
}

function activateBestXiImages(root = document) {
  root.querySelectorAll("img[data-best-xi-image]:not([data-best-xi-image-bound])").forEach((image) => {
    image.dataset.bestXiImageBound = "true";
    const setReady = () => {
      image.classList.add("is-image-ready");
      image.closest(".player-photo")?.classList.add("is-image-ready");
    };
    image.addEventListener("load", setReady);
    image.addEventListener("error", () => {
      if (image.dataset.bestXiImageRetryAttempt !== "1") {
        image.dataset.bestXiImageRetryAttempt = "1";
        image.classList.remove("is-image-ready");
        image.closest(".player-photo")?.classList.remove("is-image-ready");
        window.setTimeout(() => {
          if (image.isConnected) {
            image.src = image.dataset.bestXiImageUrl || image.src;
          }
        }, BEST_XI_IMAGE_RETRY_DELAY_MS);
        return;
      }
      image.closest(".player-photo")?.classList.remove("is-image-ready");
      image.remove();
    });
    if (image.complete && image.naturalWidth > 0) {
      setReady();
    }
  });
}

function renderBestXiCoach(selection) {
  const coach = selection?.coach;
  const trigger = document.querySelector(".best-xi-coach-trigger");
  const avatar = getElement("best-xi-coach-avatar");
  const card = document.querySelector(".best-xi-coach-card");
  if (!(trigger instanceof HTMLElement) || !avatar || !card) {
    return;
  }
  if (!coach?.name) {
    trigger.closest(".best-xi-coach-hover")?.setAttribute("hidden", "");
    return;
  }

  trigger.closest(".best-xi-coach-hover")?.removeAttribute("hidden");
  const reason = coach.reason?.[currentLanguage] || coach.reason?.en || "";
  trigger.setAttribute(
    "aria-label",
    formatMessage(activeLocale.text.bestCoachAria, { name: coach.name, reason })
  );

  const profile = getBestXiCoachProfile(coach);
  card.innerHTML = renderBestXiCoachCard(coach, profile);
  activateBestXiImages(card);

  const initials = getPlayerInitials(coach.name);
  avatar.replaceChildren();
  if (!coach.imageUrl) {
    avatar.textContent = initials;
    return;
  }
  const image = document.createElement("img");
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.addEventListener("load", () => image.classList.add("is-image-ready"));
  image.addEventListener("error", () => {
    avatar.textContent = initials;
  });
  avatar.append(image);
  image.src = coach.imageUrl;
  if (image.complete && image.naturalWidth > 0) {
    image.classList.add("is-image-ready");
  }
}

function getBestXiCoachProfile(coach) {
  const requestedName = String(coach?.name || "").trim().toLocaleLowerCase("en-US");
  return Object.values(loadedCoachProfiles || {}).find((profile) =>
    String(profile?.name || "").trim().toLocaleLowerCase("en-US") === requestedName
  ) || null;
}

function getBestXiCoachCopy(value) {
  if (value && typeof value === "object") {
    return String(value[currentLanguage] || value.en || value.zh || "").trim();
  }
  return String(value || "").trim();
}

function getBestXiCoachAge(profile) {
  const match = String(profile?.birthDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const now = new Date();
  const birthYear = Number(match[1]);
  const birthMonth = Number(match[2]);
  const birthDay = Number(match[3]);
  let age = now.getFullYear() - birthYear;
  if (now.getMonth() + 1 < birthMonth || (now.getMonth() + 1 === birthMonth && now.getDate() < birthDay)) {
    age -= 1;
  }
  return Number.isFinite(age) && age >= 0 ? age : null;
}

function renderBestXiCoachCard(coach, profile) {
  const displayName = profile?.name || coach?.name || "";
  const team = loadedTeams?.[coach?.teamId || profile?.teamId];
  const teamName = getHighlightTeamName(team) || profile?.teamName || "";
  const role = currentLanguage === "zh"
    ? `${teamName}主教练`
    : activeAppLocalePack?.helpers?.formatAppMessage?.("coach-role", { teamText: teamName }) || `${teamName} Head Coach`;
  const since = profile?.sinceYear
    ? currentLanguage === "zh"
      ? `${profile.sinceYear} 年起`
      : activeAppLocalePack?.helpers?.formatAppMessage?.("coach-since", { year: profile.sinceYear }) || `Since ${profile.sinceYear}`
    : "";
  const age = getBestXiCoachAge(profile);
  const ageText = age === null
    ? ""
    : currentLanguage === "zh"
      ? `${age}岁`
      : activeAppLocalePack?.helpers?.translateText?.(`Age ${age}`) || `Age ${age}`;
  const styles = (profile?.styles || []).slice(0, 3).map(getBestXiCoachCopy).filter(Boolean);
  const note = getBestXiCoachCopy(profile?.note);
  const history = getBestXiCoachCopy(profile?.history);
  const initials = getPlayerInitials(displayName);
  const imageUrl = profile?.imageUrl || coach?.imageUrl || "";
  const photoMarkup = imageUrl
    ? `
      <span class="lineup-coach-card-photo" aria-hidden="true">
        <img
          src="${escapeHtml(imageUrl)}"
          alt=""
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          data-best-xi-image="true"
          data-best-xi-image-url="${escapeHtml(imageUrl)}"
        />
      </span>
    `
    : `<span class="player-photo-fallback">${escapeHtml(initials)}</span>`;
  const copyItems = [note, history, ageText]
    .filter(Boolean)
    .map((item) => `<span class="player-card-note">${escapeHtml(item)}</span>`)
    .join("");

  return `
    <span class="player-card-header">
      <span class="player-photo">${photoMarkup}</span>
      <span class="player-card-title">
        <span class="player-card-name-line">
          <strong class="player-card-name">${escapeHtml(displayName)}</strong>
        </span>
        <span class="player-card-position">${escapeHtml(role)}</span>
        ${since ? `<span class="player-card-club">${escapeHtml(since)}</span>` : ""}
      </span>
    </span>
    ${styles.length
      ? `<span class="player-skill-list">${styles.map((style) => `<span>${escapeHtml(style)}</span>`).join("")}</span>`
      : ""}
    ${copyItems ? `<span class="player-card-copy lineup-coach-copy">${copyItems}</span>` : ""}
  `;
}

function getBestXiAppText(text) {
  return activeAppLocalePack?.helpers?.translateText?.(text) || text;
}

function renderBestXiCoachMention() {
  return `
    <span class="player-hover lineup-coach-hover lineup-coach-icon-hover best-xi-coach-hover highlight-player-hover">
      <span
        class="player-link lineup-coach-icon-trigger best-xi-coach-trigger"
        role="button"
        tabindex="0"
        aria-expanded="false"
        aria-controls="highlight-player-card"
        data-highlight-player-trigger="true"
      >
        <span class="lineup-coach-avatar" id="best-xi-coach-avatar" aria-hidden="true">LF</span>
      </span>
      <span class="player-card lineup-coach-card highlight-player-card best-xi-coach-card" role="tooltip"></span>
    </span>
  `;
}

function renderBestXiBand(selection) {
  const entries = getBestXiHonourableEntries(selection);
  const benchLabel = activeLocale.text.benchLabel || getBestXiAppText("Bench");
  const tabLabel = activeLocale.text.bestXiTitle || "Best XI";
  return renderLineupControlBand({
    bandClass: "best-xi-band",
    actionsClass: "best-xi-band-details",
    tabsClass: "best-xi-tabs",
    tabsAttributes: `role="tablist" aria-label="${escapeHtml(tabLabel)}"`,
    tabsMarkup: `
      <button
        class="lineup-tab is-active"
        type="button"
        role="tab"
        aria-selected="true"
        aria-label="${escapeHtml(tabLabel)}"
      >
        <span class="lineup-tab-label lineup-tab-label-full">${escapeHtml(tabLabel)}</span>
        <span class="lineup-tab-label lineup-tab-label-compact" aria-hidden="true">
          <span class="best-xi-world-map-icon">🗺️</span>
        </span>
      </button>
    `,
    actionsMarkup: `
      ${renderBestXiCoachMention()}
      <button
        class="lineup-bench-button best-xi-honourables-button"
        type="button"
        aria-expanded="false"
        aria-controls="best-xi-honourables-panel"
        aria-label="${escapeHtml(formatMessage(activeLocale.text.honourableMentionsAria, { count: entries.length }))}"
      >
        <span>${escapeHtml(benchLabel)}</span>
        <span class="lineup-bench-count" id="best-xi-honourables-count">${escapeHtml(entries.length)}</span>
      </button>
    `
  });
}

function renderBestXiPitchCard(selection) {
  const entries = getBestXiHonourableEntries(selection);
  return renderLineupPitchCard({
    cardClass: "best-xi-card",
    bandMarkup: renderBestXiBand(selection),
    benchMarkup: renderLineupBenchPanel({
      id: "best-xi-honourables-panel",
      panelClass: "best-xi-honourables-panel",
      listId: "best-xi-honourables-list",
      itemsMarkup: entries
        .map(({ slot, player, index }) => renderBestXiHonourablePlayer(slot, player, index))
        .join("")
    }),
    pitchClass: "best-xi-pitch",
    surfaceAttributes: `id="best-xi-pitch" role="list" aria-label="${escapeHtml(activeLocale.text.bestXiPitchLabel)}"`,
    markerMarkup: selection.slots.map((slot) => renderBestXiMarker(slot)).join("")
  });
}

function renderBestXi() {
  const root = getElement("best-xi-lineup-root");
  const selection = getBestXiSelection();
  if (!root || !selection?.slots?.length || !loadedProfiles || !loadedTeams) {
    return;
  }
  root.innerHTML = renderBestXiPitchCard(selection);
  renderBestXiCoach(selection);
  renderBestXiHonourables(selection);
  activateBestXiImages(root);
  updateLineupTabIndicators(root);
  updateBestXiInfoTooltipBounds();
}

function getBestXiPlayerFromElement(playerElement) {
  const selection = getBestXiSelection();
  const slotElement = playerElement?.closest?.("[data-best-xi-slot]");
  const slot = selection?.slots?.find((item) => item.id === slotElement?.dataset.bestXiSlot);
  return getBestXiPlayer(
    slot,
    playerElement?.dataset.bestXiPlayerKind,
    playerElement?.dataset.bestXiPlayerIndex
  );
}

function renderBestXiPlayerCard(playerElement) {
  const player = getBestXiPlayerFromElement(playerElement);
  const card = getElement(BEST_XI_CARD_ID);
  if (!player || !card) {
    return;
  }
  const profile = loadedProfiles?.[player.playerName];
  const displayName = getBestXiDisplayName(player);
  const clubLine = getHighlightPlayerClubLine(profile);
  const positionLabel = getHighlightPlayerPosition(profile) || getBestXiPositionLabel(player.position);
  const uniformNumber = getPlayerCardUniformNumber(player, profile);
  const initials = getPlayerInitials(displayName);
  const photoMarkup = profile?.imageUrl
    ? `
      <span class="player-photo-fallback">${escapeHtml(initials)}</span>
      <img
        src="${escapeHtml(profile.imageUrl)}"
        alt=""
        loading="eager"
        decoding="async"
        referrerpolicy="no-referrer"
        data-best-xi-image="true"
        data-best-xi-image-url="${escapeHtml(profile.imageUrl)}"
      />
    `
    : `<span class="player-photo-fallback">${escapeHtml(initials)}</span>`;
  card.innerHTML = `
    <span class="player-card-header">
      <span class="player-photo">${photoMarkup}</span>
      <span class="player-card-title">
        <span class="player-card-name-line">
          ${renderHighlightPlayerFlag(profile, player.teamId)}
          <strong class="player-card-name">${escapeHtml(displayName)}</strong>
          ${uniformNumber ? `<span class="player-card-number">#${escapeHtml(uniformNumber)}</span>` : ""}
        </span>
        <span class="player-card-position">${escapeHtml(positionLabel)}</span>
        <span class="player-card-club">${escapeHtml(clubLine)}</span>
      </span>
    </span>
    ${renderHighlightPlayerSkillList(profile)}
    ${renderHighlightPlayerCopy(getBestXiReason(player), profile, "best-xi-player-reason")}
  `;
  activateBestXiImages(card);
}

function isBestXiTouchMode() {
  return window.matchMedia?.("(hover: none), (pointer: coarse)")?.matches ?? false;
}

function positionBestXiPlayerCard() {
  const card = getElement(BEST_XI_CARD_ID);
  if (!card || !activeBestXiPlayer?.isConnected) {
    return;
  }
  const viewportMargin = 12;
  const gap = 10;
  const viewport = window.visualViewport;
  const viewportLeft = viewport?.offsetLeft || 0;
  const viewportTop = viewport?.offsetTop || 0;
  const viewportWidth = viewport?.width || window.innerWidth;
  const viewportHeight = viewport?.height || window.innerHeight;
  const viewportRight = viewportLeft + viewportWidth;
  const viewportBottom = viewportTop + viewportHeight;
  const width = Math.min(292, viewportWidth - viewportMargin * 2);
  card.style.setProperty("--player-card-width", `${width}px`);
  card.style.setProperty("--player-card-max-height", `${Math.max(160, viewportHeight - viewportMargin * 2)}px`);
  const markerRect = activeBestXiPlayer.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const left = Math.min(
    viewportRight - width - viewportMargin,
    Math.max(viewportLeft + viewportMargin, markerRect.left + markerRect.width / 2 - width / 2)
  );
  let top = markerRect.top - cardRect.height - gap;
  if (top < viewportTop + viewportMargin) {
    top = markerRect.bottom + gap;
  }
  top = Math.min(
    viewportBottom - cardRect.height - viewportMargin,
    Math.max(viewportTop + viewportMargin, top)
  );
  card.style.setProperty("--player-card-floating-left", `${Math.round(left)}px`);
  card.style.setProperty("--player-card-floating-top", `${Math.round(top)}px`);
  updateHighlightPlayerValueTooltipBounds(card);
}

function showBestXiPlayerCard(playerElement) {
  const card = getElement(BEST_XI_CARD_ID);
  if (!card || !(playerElement instanceof HTMLElement)) {
    return;
  }
  window.clearTimeout(bestXiCardHideTimer);
  if (activeBestXiPlayer && activeBestXiPlayer !== playerElement) {
    activeBestXiPlayer.classList.remove("is-card-open");
    activeBestXiPlayer.querySelector("[data-best-xi-player-trigger]")?.setAttribute("aria-expanded", "false");
  }
  activeBestXiPlayer = playerElement;
  renderBestXiPlayerCard(playerElement);
  playerElement.classList.add("is-card-open");
  const trigger = playerElement.querySelector("[data-best-xi-player-trigger]");
  trigger?.setAttribute("aria-expanded", "true");
  trigger?.setAttribute("aria-describedby", BEST_XI_CARD_ID);
  card.setAttribute("aria-hidden", "false");
  positionBestXiPlayerCard();
  card.classList.add("is-visible");
  window.requestAnimationFrame(positionBestXiPlayerCard);
}

function hideBestXiPlayerCard() {
  window.clearTimeout(bestXiCardHideTimer);
  activeBestXiPlayer?.classList.remove("is-card-open");
  activeBestXiPlayer
    ?.querySelector("[data-best-xi-player-trigger]")
    ?.setAttribute("aria-expanded", "false");
  activeBestXiPlayer
    ?.querySelector("[data-best-xi-player-trigger]")
    ?.removeAttribute("aria-describedby");
  activeBestXiPlayer = null;
  const card = getElement(BEST_XI_CARD_ID);
  card?.classList.remove("is-visible");
  card?.setAttribute("aria-hidden", "true");
}

function queueBestXiPlayerCardHide() {
  window.clearTimeout(bestXiCardHideTimer);
  bestXiCardHideTimer = window.setTimeout(hideBestXiPlayerCard, PLAYER_CARD_HOVER_HANDOFF_MS);
}

function toggleBestXiHonourables() {
  const button = document.querySelector(".best-xi-honourables-button");
  const panel = getElement("best-xi-honourables-panel");
  if (!(button instanceof HTMLButtonElement) || !panel) {
    return;
  }
  const isOpen = button.getAttribute("aria-expanded") === "true";
  const nextOpen = !isOpen;
  hideBestXiPlayerCard();
  button.setAttribute("aria-expanded", String(nextOpen));
  button.classList.toggle("is-open", nextOpen);
  panel.classList.toggle("is-open", nextOpen);
  panel.setAttribute("aria-hidden", String(!nextOpen));
}

function updateBestXiInfoTooltipBounds() {
  [
    [document.querySelector(".best-xi-info-button"), Math.min(224, window.innerWidth * 0.72)]
  ].forEach(([button, width]) => {
    if (!(button instanceof HTMLElement)) {
      return;
    }
    button.style.removeProperty("--tooltip-shift-x");
    const buttonRect = button.getBoundingClientRect();
    const margin = 10;
    const idealLeft = buttonRect.left + buttonRect.width / 2 - width / 2;
    const clampedLeft = Math.min(window.innerWidth - width - margin, Math.max(margin, idealLeft));
    button.style.setProperty("--tooltip-shift-x", `${Math.round(clampedLeft - idealLeft)}px`);
  });
}

function setupBestXiInteractions() {
  const section = document.querySelector(".best-xi-section");
  const card = getElement(BEST_XI_CARD_ID);
  const infoButton = document.querySelector(".best-xi-info-button");
  if (!section || !card) {
    return;
  }

  section.addEventListener("pointerover", (event) => {
    if (isBestXiTouchMode()) {
      return;
    }
    const playerElement = event.target.closest?.(".best-xi-player-option");
    if (playerElement && !playerElement.contains(event.relatedTarget)) {
      showBestXiPlayerCard(playerElement);
    }
  });
  section.addEventListener("pointerout", (event) => {
    if (isBestXiTouchMode()) {
      return;
    }
    const playerElement = event.target.closest?.(".best-xi-player-option");
    if (playerElement && !playerElement.contains(event.relatedTarget)) {
      queueBestXiPlayerCardHide();
    }
  });
  section.addEventListener("focusin", (event) => {
    const trigger = event.target.closest?.("[data-best-xi-player-trigger]");
    const playerElement = trigger?.closest(".best-xi-player-option");
    if (playerElement) {
      showBestXiPlayerCard(playerElement);
    }
  });
  section.addEventListener("focusout", (event) => {
    const playerElement = event.target.closest?.(".best-xi-player-option");
    if (playerElement && !playerElement.contains(event.relatedTarget)) {
      queueBestXiPlayerCardHide();
    }
  });
  section.addEventListener("click", (event) => {
    if (event.target.closest?.(".best-xi-honourables-button")) {
      event.preventDefault();
      event.stopPropagation();
      toggleBestXiHonourables();
      return;
    }
    const playerElement = event.target.closest?.(".best-xi-player-option");
    if (!playerElement) {
      return;
    }
    if (isBestXiTouchMode() && playerElement === activeBestXiPlayer && card.classList.contains("is-visible")) {
      hideBestXiPlayerCard();
    } else {
      showBestXiPlayerCard(playerElement);
    }
  });
  section.addEventListener("keydown", (event) => {
    if (!event.target.closest?.("[data-best-xi-player-trigger]") || !["Enter", " "].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const playerElement = event.target.closest(".best-xi-player-option");
    if (playerElement === activeBestXiPlayer && card.classList.contains("is-visible")) {
      hideBestXiPlayerCard();
    } else {
      showBestXiPlayerCard(playerElement);
    }
  });

  card.addEventListener("pointerenter", () => window.clearTimeout(bestXiCardHideTimer));
  card.addEventListener("pointerleave", queueBestXiPlayerCardHide);
  infoButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    updateBestXiInfoTooltipBounds();
    infoButton.classList.toggle("is-touch-tooltip-open");
  });

  document.addEventListener("pointerdown", (event) => {
    if (
      activeBestXiPlayer
      && !activeBestXiPlayer.contains(event.target)
      && !card.contains(event.target)
    ) {
      hideBestXiPlayerCard();
    }
    if (infoButton && !infoButton.contains(event.target)) {
      infoButton.classList.remove("is-touch-tooltip-open");
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (activeBestXiPlayer) {
      hideBestXiPlayerCard();
    }
    if (infoButton?.classList.contains("is-touch-tooltip-open")) {
      infoButton.classList.remove("is-touch-tooltip-open");
      infoButton.focus();
    }
    const honourablesButton = document.querySelector(".best-xi-honourables-button");
    if (honourablesButton?.getAttribute("aria-expanded") === "true") {
      toggleBestXiHonourables();
      honourablesButton.focus();
    }
  });
  window.addEventListener("resize", () => {
    positionBestXiPlayerCard();
    updateBestXiInfoTooltipBounds();
    updateLineupTabIndicators(getElement("best-xi-lineup-root"));
  });
  window.addEventListener("scroll", positionBestXiPlayerCard, { passive: true });
}

function renderAwardPhoto(elementId, displayName, profile) {
  const photo = getElement(elementId);
  if (!photo) {
    return;
  }

  const initials = getPlayerInitials(displayName);
  const existingImage = photo.querySelector("img");
  if (
    profile?.imageUrl
    && existingImage?.dataset.playerImageOriginalUrl === profile.imageUrl
  ) {
    const existingFallback = photo.querySelector(".player-photo-fallback");
    if (existingFallback) {
      existingFallback.textContent = initials;
    }
    if (existingImage.complete && existingImage.naturalWidth > 0) {
      existingImage.classList.add("is-image-ready");
      photo.classList.add("is-image-ready");
    }
    return;
  }

  const fallback = document.createElement("span");
  fallback.className = "player-photo-fallback";
  fallback.textContent = initials;
  photo.classList.remove("is-image-ready");

  if (!profile?.imageUrl) {
    photo.replaceChildren(fallback);
    return;
  }

  const image = document.createElement("img");
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.dataset.playerImageOriginalUrl = profile.imageUrl;

  image.addEventListener("load", () => {
    image.classList.add("is-image-ready");
    photo.classList.add("is-image-ready");
  });

  image.addEventListener("error", () => {
    if (image.dataset.playerImageRetryAttempt !== "1") {
      image.dataset.playerImageRetryAttempt = "1";
      image.classList.remove("is-image-ready");
      photo.classList.remove("is-image-ready");
      window.setTimeout(() => {
        if (image.isConnected) {
          image.src = profile.imageUrl;
        }
      }, AWARD_PHOTO_RETRY_DELAY_MS);
      return;
    }
    image.remove();
    photo.classList.remove("is-image-ready");
  });

  photo.replaceChildren(fallback, image);
  image.src = profile.imageUrl;
  if (image.complete && image.naturalWidth > 0) {
    image.classList.add("is-image-ready");
    photo.classList.add("is-image-ready");
  }
}

function renderAwards(awards, profiles) {
  Object.entries(AWARD_NAME_IDS).forEach(([awardKey, elementId]) => {
    const playerName = awards[awardKey]?.playerName || DEFAULT_AWARD_NAMES[awardKey];
    const profile = profiles[playerName];
    const displayName = profile?.displayName || playerName;
    const localizedName = localizeEntity("players", playerName) || displayName;
    renderAwardPlayerName(elementId, playerName);
    renderAwardPhoto(AWARD_PHOTO_IDS[awardKey], localizedName, profile);
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
  setupSettings();
  setupChampionPhotoScoutReaction();
  setupBestXiInteractions();
  setupHighlightRankInteractions();
  setupHighlightPlayerInteractions();

  try {
    await setLanguage(resolveInitialLanguage(), { updateUrl: false });
  } catch (error) {
    console.error("Unable to load highlights language", error);
    currentLanguage = "en";
    activeLocale = ENGLISH_HIGHLIGHTS_LOCALE;
    activeAppLocalePack = null;
    applyLocale();
  }

  try {
    const [tournament, playerData, coachData, teamData, structuredGlossary] = await Promise.all([
      loadJson("data/tournament.json"),
      loadJson("data/player-profiles.json"),
      loadJson("data/coach-profiles.json"),
      loadJson("data/teams.json"),
      loadJson("data/locales/structured-content-glossary.json")
    ]);
    loadedAwards = tournament.awards || {};
    loadedProfiles = playerData.profiles || {};
    loadedCoachProfiles = coachData.profiles || {};
    loadedTeams = Object.fromEntries((teamData.teams || []).map((team) => [team.id, team]));
    loadedStructuredGlossary = structuredGlossary || {};
    loadedRankingYear = Number(teamData.rankingYear) || null;
    renderAwards(loadedAwards, loadedProfiles);
    renderHighlightStoryTitles();
    renderHighlightPlayerMentions();
  } catch (error) {
    console.error(activeLocale.text.loadError, error);
  }

  try {
    loadedBestXi = await loadJson("data/highlights-best-xi.json");
    renderAwards(loadedAwards || {}, loadedProfiles || {});
    renderHighlightStoryTitles();
    renderHighlightPlayerMentions();
    renderBestXi();
  } catch (error) {
    console.error("Unable to load Best XI", error);
  }

  if (!loadedBestXi || !loadedProfiles || !loadedTeams) {
    document.querySelector(".best-xi-section")?.setAttribute("hidden", "");
  }
  document.body.classList.remove("is-locale-loading");
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.body.classList.add("is-initial-content-ready");
      window.setTimeout(() => {
        document.body.classList.remove("is-initial-page-load", "is-initial-content-ready");
      }, 1100);
    });
  });
}

initialize();
