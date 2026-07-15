import {
  getBallBoyReply,
  normalizeBallBoyLocale,
  preloadBallBoyCore,
  rememberBallBoyReply,
  resetBallBoyContext
} from "./chatbot-knowledge.js?v=2026-07-14-next-fixture-replies-1";

const SCOUT_PUPIL_TRAVEL = 3.6;
const SCOUT_REPLY_DELAY_MS = 650;
const SCOUT_SHOW_NEXT_GAP = 14;
const SCOUT_TOUCH_GAZE_LINGER_MS = 420;
const SCOUT_IDLE_BLINK_MIN_MS = 9000;
const SCOUT_IDLE_BLINK_RANGE_MS = 6000;
const SCOUT_BLINK_COOLDOWN_MS = 5000;
const SCOUT_JUGGLE_RECORD_STORAGE_KEY = "world-cup-simplified-juggle-record";
const SCOUT_BLINK_EXPRESSION_CLASSES = new Set([
  "is-eye-double-blink",
  "is-eye-record"
]);
const SCOUT_EYE_EXPRESSION_CLASSES = [
  "is-eye-aware-below",
  "is-eye-wide",
  "is-eye-double-blink",
  "is-eye-side-glance",
  "is-eye-pleased",
  "is-eye-record",
  "is-eye-amused"
];

const SCOUT_COPY = {
  en: {
    assistantName: "Ball Boy",
    status: "Ask me about football",
    initialMessage: "You can ask me about players, countries, matches, or rules.",
    open: "Open Ball Boy",
    chatLabel: "Ball Boy chat",
    reset: "Start a new chat",
    newChat: "New chat",
    close: "Close Ball Boy",
    suggestedQuestions: "Suggested questions",
    suggestions: ["Explain offside", "Change timezone", "How does Argentina play?"],
    showMore: "Show more of Ball Boy's answer",
    moreBelow: "More below",
    askLabel: "Ask Ball Boy a question",
    placeholder: "Ask about football…",
    send: "Send question",
    thinking: "Ball Boy is thinking",
    followUps: "Follow-up questions",
    country: "Country",
    player: "Player",
    match: "Match",
    ruleSimple: "Rule made simple",
    whatIKnow: "What you can ask",
    whichPlayer: "Which player?",
    dataProblem: "Data problem",
    tryAgain: "Try again",
    countryUnavailable: "Country unavailable",
    theirCountry: "their country",
    playerFallback: "Player",
    flag: "flag",
    officialLaw: "Read the official IFAB law ↗",
    worldCupStats: "World Cup statistics and player details",
    thisWorldCup: "This World Cup",
    playerDetails: "Player details",
    goals: "Goals",
    assists: "Assists",
    recordedAssists: (count) => `${count} recorded assists`,
    assistsTitle: "Assists recorded in World Cup match events.",
    age: "Age",
    estimatedValue: "Est. value",
    value: "Value",
    estimatedValueTitle: "Estimated market value based on sourced public player data.",
    valueTitle: "Market value from sourced public player data.",
    prime: "Prime",
    signatureTraits: "Signature traits",
    threeTraits: "Three signature traits",
    readPlay: "Read the play",
    whyWatch: "Why watch them",
    lastMatch: "Last match",
    nextMatch: "Next match",
    score: (home, away) => `Score ${home} to ${away}`,
    penaltiesScore: (home, away) => `Penalties ${home} to ${away}`,
    versus: "Versus",
    pens: "pens",
    fifaRank: (rank) => `FIFA rank ${rank}`,
    group: (group) => `Group ${group}`,
    groupPosition: (position, points) => `${position} in group · ${points} pts`,
    recentForm: "Recent tournament form",
    form: "Form",
    resultLabels: {
      draw: "Draw",
      loss: "Loss",
      "shootout-loss": "Lost on penalties; counted as a draw",
      "shootout-win": "Advanced on penalties; counted as a draw",
      win: "Win"
    },
    adaptMatch: "Adapt to the match",
    keyPlayers: "Key players",
    topScorer: "Top scorer",
    goalCount: (count) => `${count} ${count === 1 ? "goal" : "goals"}`,
    fullRecord: "Full tournament record",
    wins: "Wins",
    draws: "Draws",
    losses: "Losses",
    goalsBalance: (scored, conceded) => `${scored} scored · ${conceded} conceded`,
    onPenalties: "On penalties",
    advancedOnce: "advanced once",
    advancedTimes: (count) => `advanced ${count} times`,
    exitedOnce: "went out once",
    exitedTimes: (count) => `went out ${count} times`,
    shootoutDrawNote: "Shootout matches count as draws in W–D–L.",
    howTheyPlay: "How they play",
    teamStyleFlow: "Team style flow",
    afterPenalties: "After penalties",
    afterExtraTime: "After extra time",
    fullTime: "Full time",
    live: "Live",
    penalties: "Penalties",
    goalTimeline: "Goal timeline",
    scoringTeam: "Scoring team",
    assist: "Assist",
    penaltyShort: "pen.",
    matchChanges: "Key moments",
    playPlans: "How they may play",
    currentComparison: "Current tournament comparison",
    pastMeetings: "Past meetings",
    prediction90: "Verified 90-minute projection",
    verifiedH2hSource: "Verified head-to-head source ↗",
    verifiedPredictionSource: "Verified prediction source ↗",
    noH2h: "No verified previous senior meetings before this fixture.",
    checkingH2h: "Previous-meeting history is still being checked.",
    beforeMatch: "Before this match",
    verifiedHighlights: "Watch verified highlights",
    official: "Official",
    tbd: "TBD",
    scoreAria: (home, away) => `${home} to ${away}`,
    flowAriaSeparator: "; ",
    watchListTitle: "Players to watch",
    languageActionIntro: "I can do that. You can also change your language from the Settings icon in the top right.",
    timeZoneActionIntro: "I can do that. You can also change your time zone from the Settings icon in the top right.",
    timeZoneClarification: "Which time zone would you like to use? You can also change it from the Settings icon in the top right.",
    timeZoneRegionClarification: (region) => `Which ${region} time zone?`,
    timeZoneUnmatched: (location) => `I couldn’t match “${location}” to one time zone. Try a nearby major city or choose from Settings.`,
    switchLanguage: (language) => `Switch to ${language}`,
    switchTimeZone: (timeZone) => `Switch to ${timeZone}`,
    openSettings: "Open Settings",
    languageAlreadySet: (language) => `You’re already using ${language}. You can also change your language from the Settings icon in the top right.`,
    timeZoneAlreadySet: (timeZone) => `You’re already using ${timeZone}. You can also change your time zone from the Settings icon in the top right.`,
    languageChanged: (language) => `Language changed to ${language}.`,
    timeZoneChanged: (timeZone) => `Time zone changed to ${timeZone}.`,
    unsupportedLanguage: "I currently support English and Chinese.",
    unsupportedTimeZone: "That time zone isn’t available yet.",
    reportIssue: "Report issue",
    errorText: "I couldn’t load the data. Try again.",
    errorFollowUps: []
  },
  zh: {
    assistantName: "球童",
    status: "问我足球问题",
    initialMessage: "你可以问我球员、国家队、比赛或规则。",
    open: "打开球童聊天",
    chatLabel: "球童聊天窗口",
    reset: "开始新对话",
    newChat: "新对话",
    close: "关闭球童聊天",
    suggestedQuestions: "推荐问题",
    suggestions: ["解释越位", "更改时区", "阿根廷怎么踢？"],
    showMore: "显示球童回答的更多内容",
    moreBelow: "下方还有内容",
    askLabel: "向球童提问",
    placeholder: "问一个足球问题…",
    send: "发送问题",
    thinking: "球童正在思考",
    followUps: "后续问题",
    country: "国家队",
    player: "球员",
    match: "比赛",
    ruleSimple: "简单讲规则",
    whatIKnow: "你可以问什么",
    whichPlayer: "你指哪名球员？",
    dataProblem: "数据出了点问题",
    tryAgain: "再试一次",
    countryUnavailable: "暂无国家队信息",
    theirCountry: "所属国家队",
    playerFallback: "球员",
    flag: "国旗",
    officialLaw: "阅读IFAB官方规则 ↗",
    worldCupStats: "世界杯数据和球员资料",
    thisWorldCup: "本届世界杯",
    playerDetails: "球员资料",
    goals: "进球",
    assists: "助攻",
    recordedAssists: (count) => `已记录${count}次助攻`,
    assistsTitle: "助攻数据来自世界杯比赛事件。",
    age: "年龄",
    estimatedValue: "估算身价",
    value: "身价",
    estimatedValueTitle: "依据已注明来源的公开球员资料估算。",
    valueTitle: "身价数据来自已注明来源的公开球员资料。",
    prime: "巅峰",
    signatureTraits: "标志性特点",
    threeTraits: "三项标志性特点",
    readPlay: "阅读比赛",
    whyWatch: "为什么值得关注",
    lastMatch: "上一场",
    nextMatch: "下一场",
    score: (home, away) => `比分${home}比${away}`,
    penaltiesScore: (home, away) => `点球大战${home}比${away}`,
    versus: "对阵",
    pens: "点球",
    fifaRank: (rank) => `FIFA排名第${rank}`,
    group: (group) => `${group}组`,
    groupPosition: (position, points) => `小组第${position} · ${points}分`,
    recentForm: "近期世界杯战绩",
    form: "近期战绩",
    resultLabels: {
      draw: "平局",
      loss: "失利",
      "shootout-loss": "点球大战出局；胜平负按平局计算",
      "shootout-win": "点球大战晋级；胜平负按平局计算",
      win: "获胜"
    },
    adaptMatch: "根据比赛调整",
    keyPlayers: "关键球员",
    topScorer: "队内最佳射手",
    goalCount: (count) => `${count}个进球`,
    fullRecord: "完整赛事战绩",
    wins: "胜",
    draws: "平",
    losses: "负",
    goalsBalance: (scored, allowed) => `进${scored}球 · 失${allowed}球`,
    onPenalties: "点球大战",
    advancedOnce: "晋级1次",
    advancedTimes: (count) => `晋级${count}次`,
    exitedOnce: "出局1次",
    exitedTimes: (count) => `出局${count}次`,
    shootoutDrawNote: "点球大战在胜平负统计中按平局计算。",
    howTheyPlay: "他们怎么踢",
    teamStyleFlow: "球队打法流程",
    afterPenalties: "点球大战后",
    afterExtraTime: "加时赛后",
    fullTime: "全场结束",
    live: "进行中",
    penalties: "点球大战",
    goalTimeline: "进球时间线",
    scoringTeam: "进球队",
    assist: "助攻",
    penaltyShort: "点球",
    matchChanges: "关键时刻",
    playPlans: "可能的比赛方式",
    currentComparison: "本届赛事对比",
    pastMeetings: "过往交锋",
    prediction90: "已核验的90分钟赛果预测",
    verifiedH2hSource: "查看已核验的交锋来源 ↗",
    verifiedPredictionSource: "查看已核验的预测来源 ↗",
    noH2h: "这场比赛前，双方没有经过核验的成年国家队交锋记录。",
    checkingH2h: "双方过往交锋记录仍在核验中。",
    beforeMatch: "赛前交锋",
    verifiedHighlights: "观看已核验的官方集锦",
    official: "官方",
    tbd: "待定",
    scoreAria: (home, away) => `${home}比${away}`,
    flowAriaSeparator: "；",
    watchListTitle: "值得关注的球员",
    languageActionIntro: "可以。你也可以通过右上角的设置图标更改语言。",
    timeZoneActionIntro: "可以。你也可以通过右上角的设置图标更改时区。",
    timeZoneClarification: "你想使用哪个时区？也可以通过右上角的设置图标更改时区。",
    timeZoneRegionClarification: (region) => `${region}的哪个时区？`,
    timeZoneUnmatched: (location) => `我无法将“${location}”对应到唯一时区。请尝试附近的大城市，或前往设置中选择。`,
    switchLanguage: (language) => `切换到${language}`,
    switchTimeZone: (timeZone) => `切换到${timeZone}`,
    openSettings: "打开设置",
    languageAlreadySet: (language) => `你已在使用${language}。也可以通过右上角的设置图标更改语言。`,
    timeZoneAlreadySet: (timeZone) => `你已在使用${timeZone}。也可以通过右上角的设置图标更改时区。`,
    languageChanged: (language) => `语言已切换为${language}。`,
    timeZoneChanged: (timeZone) => `时区已切换为${timeZone}。`,
    unsupportedLanguage: "我目前支持英文和中文。",
    unsupportedTimeZone: "目前还不支持这个时区。",
    reportIssue: "报告问题",
    errorText: "我无法载入数据。请再试一次。",
    errorFollowUps: []
  }
};

const SCOUT_LANGUAGE_ALIASES = {
  chinese: "zh",
  mandarin: "zh",
  "simplified chinese": "zh",
  中文: "zh",
  汉语: "zh",
  普通话: "zh",
  english: "en",
  英文: "en",
  英语: "en"
};
const SCOUT_UNSUPPORTED_LANGUAGE_NAMES = {
  arabic: "Arabic",
  french: "French",
  german: "German",
  hindi: "Hindi",
  italian: "Italian",
  japanese: "Japanese",
  korean: "Korean",
  portuguese: "Portuguese",
  russian: "Russian",
  spanish: "Spanish",
  西班牙语: "西班牙语",
  法语: "法语",
  德语: "德语",
  日语: "日语",
  韩语: "韩语",
  葡萄牙语: "葡萄牙语",
  阿拉伯语: "阿拉伯语"
};
const SCOUT_TIME_ZONE_ALIASES = {
  utc: "UTC",
  gmt: "UTC",
  "coordinated universal time": "UTC",
  california: "America/Los_Angeles",
  "bay area": "America/Los_Angeles",
  "san francisco bay area": "America/Los_Angeles",
  "west coast": "America/Los_Angeles",
  加州: "America/Los_Angeles",
  加利福尼亚: "America/Los_Angeles",
  湾区: "America/Los_Angeles",
  美国西海岸: "America/Los_Angeles",
  la: "America/Los_Angeles",
  "los angeles": "America/Los_Angeles",
  pacific: "America/Los_Angeles",
  "pacific time": "America/Los_Angeles",
  pt: "America/Los_Angeles",
  pst: "America/Los_Angeles",
  pdt: "America/Los_Angeles",
  mountain: "America/Denver",
  "mountain time": "America/Denver",
  mt: "America/Denver",
  mst: "America/Denver",
  mdt: "America/Denver",
  central: "America/Chicago",
  "central time": "America/Chicago",
  ct: "America/Chicago",
  cst: "America/Chicago",
  cdt: "America/Chicago",
  eastern: "America/New_York",
  "eastern time": "America/New_York",
  et: "America/New_York",
  est: "America/New_York",
  edt: "America/New_York",
  "east coast": "America/New_York",
  美国东海岸: "America/New_York",
  akt: "America/Anchorage",
  akst: "America/Anchorage",
  akdt: "America/Anchorage",
  hst: "Pacific/Honolulu",
  uk: "Europe/London",
  "uk time": "Europe/London",
  britain: "Europe/London",
  "great britain": "Europe/London",
  bst: "Europe/London",
  英国: "Europe/London",
  cet: "Europe/Paris",
  cest: "Europe/Paris",
  eet: "Europe/Athens",
  eest: "Europe/Athens",
  china: "Asia/Shanghai",
  "china time": "Asia/Shanghai",
  中国: "Asia/Shanghai",
  india: "Asia/Kolkata",
  "india time": "Asia/Kolkata",
  ist: "Asia/Kolkata",
  "india standard time": "Asia/Kolkata",
  印度: "Asia/Kolkata",
  gst: "Asia/Dubai",
  "gulf standard time": "Asia/Dubai",
  ict: "Asia/Bangkok",
  sgt: "Asia/Singapore",
  kst: "Asia/Seoul",
  japan: "Asia/Tokyo",
  "japan time": "Asia/Tokyo",
  jst: "Asia/Tokyo",
  "japan standard time": "Asia/Tokyo",
  aest: "Australia/Sydney",
  aedt: "Australia/Sydney",
  acst: "Australia/Adelaide",
  acdt: "Australia/Adelaide",
  awst: "Australia/Perth",
  nzst: "Pacific/Auckland",
  nzdt: "Pacific/Auckland",
  brt: "America/Sao_Paulo",
  brst: "America/Sao_Paulo",
  art: "America/Buenos_Aires",
  sast: "Africa/Johannesburg",
  wat: "Africa/Lagos",
  eat: "Africa/Nairobi",
  日本: "Asia/Tokyo"
};
const SCOUT_TIME_ZONE_GROUPS = [
  {
    aliases: ["america", "us", "usa", "united states", "united states of america", "美国", "美利坚合众国"],
    label: "United States",
    labelZh: "美国",
    options: [
      ["America/Los_Angeles", "Los Angeles", "洛杉矶"],
      ["America/Denver", "Denver", "丹佛"],
      ["America/Chicago", "Chicago", "芝加哥"],
      ["America/New_York", "New York", "纽约"],
      ["America/Phoenix", "Phoenix", "菲尼克斯"],
      ["America/Anchorage", "Anchorage", "安克雷奇"],
      ["Pacific/Honolulu", "Honolulu", "檀香山"]
    ]
  },
  {
    aliases: ["australia", "australian", "澳大利亚", "澳洲"],
    label: "Australian",
    labelZh: "澳大利亚",
    options: [
      ["Australia/Sydney", "Sydney", "悉尼"],
      ["Australia/Brisbane", "Brisbane", "布里斯班"],
      ["Australia/Adelaide", "Adelaide", "阿德莱德"],
      ["Australia/Darwin", "Darwin", "达尔文"],
      ["Australia/Perth", "Perth", "珀斯"]
    ]
  },
  {
    aliases: ["canada", "canadian", "加拿大"],
    label: "Canadian",
    labelZh: "加拿大",
    options: [
      ["America/Vancouver", "Vancouver", "温哥华"],
      ["America/Edmonton", "Edmonton", "埃德蒙顿"],
      ["America/Winnipeg", "Winnipeg", "温尼伯"],
      ["America/Toronto", "Toronto", "多伦多"],
      ["America/Halifax", "Halifax", "哈利法克斯"],
      ["America/St_Johns", "St. John’s", "圣约翰斯"]
    ]
  },
  {
    aliases: ["brazil", "brazilian", "巴西"],
    label: "Brazilian",
    labelZh: "巴西",
    options: [
      ["America/Noronha", "Fernando de Noronha", "费尔南多-迪诺罗尼亚"],
      ["America/Sao_Paulo", "São Paulo", "圣保罗"],
      ["America/Cuiaba", "Cuiabá", "库亚巴"],
      ["America/Manaus", "Manaus", "马瑙斯"],
      ["America/Rio_Branco", "Rio Branco", "里奥布兰科"]
    ]
  },
  {
    aliases: ["mexico", "mexican", "墨西哥"],
    label: "Mexican",
    labelZh: "墨西哥",
    options: [
      ["America/Tijuana", "Tijuana", "蒂华纳"],
      ["America/Chihuahua", "Chihuahua", "奇瓦瓦"],
      ["America/Mexico_City", "Mexico City", "墨西哥城"],
      ["America/Cancun", "Cancún", "坎昆"]
    ]
  },
  {
    aliases: ["indonesia", "indonesian", "印度尼西亚", "印尼"],
    label: "Indonesian",
    labelZh: "印度尼西亚",
    options: [
      ["Asia/Jakarta", "Jakarta", "雅加达"],
      ["Asia/Makassar", "Makassar", "望加锡"],
      ["Asia/Jayapura", "Jayapura", "查亚普拉"]
    ]
  },
  {
    aliases: ["russia", "russian federation", "俄罗斯"],
    label: "Russian",
    labelZh: "俄罗斯",
    options: [
      ["Europe/Kaliningrad", "Kaliningrad", "加里宁格勒"],
      ["Europe/Moscow", "Moscow", "莫斯科"],
      ["Asia/Yekaterinburg", "Yekaterinburg", "叶卡捷琳堡"],
      ["Asia/Omsk", "Omsk", "鄂木斯克"],
      ["Asia/Krasnoyarsk", "Krasnoyarsk", "克拉斯诺亚尔斯克"],
      ["Asia/Irkutsk", "Irkutsk", "伊尔库茨克"],
      ["Asia/Yakutsk", "Yakutsk", "雅库茨克"],
      ["Asia/Vladivostok", "Vladivostok", "符拉迪沃斯托克"],
      ["Asia/Kamchatka", "Kamchatka", "堪察加"]
    ]
  },
  {
    aliases: ["chile", "chilean", "智利"],
    label: "Chilean",
    labelZh: "智利",
    options: [
      ["America/Santiago", "Santiago", "圣地亚哥"],
      ["Pacific/Easter", "Easter Island", "复活节岛"]
    ]
  },
  {
    aliases: ["ecuador", "ecuadorian", "厄瓜多尔"],
    label: "Ecuadorian",
    labelZh: "厄瓜多尔",
    options: [
      ["America/Guayaquil", "Guayaquil", "瓜亚基尔"],
      ["Pacific/Galapagos", "Galápagos", "加拉帕戈斯"]
    ]
  },
  {
    aliases: ["portugal", "portuguese time", "葡萄牙"],
    label: "Portuguese",
    labelZh: "葡萄牙",
    options: [
      ["Europe/Lisbon", "Lisbon", "里斯本"],
      ["Atlantic/Madeira", "Madeira", "马德拉"],
      ["Atlantic/Azores", "Azores", "亚速尔群岛"]
    ]
  },
  {
    aliases: ["spain", "spanish time", "西班牙"],
    label: "Spanish",
    labelZh: "西班牙",
    options: [
      ["Europe/Madrid", "Madrid", "马德里"],
      ["Atlantic/Canary", "Canary Islands", "加那利群岛"]
    ]
  }
];
const SCOUT_TIME_ZONE_GROUP_ALIASES = Object.fromEntries(
  SCOUT_TIME_ZONE_GROUPS.flatMap((group) => group.aliases.map((alias) => [alias, group]))
);

function readScoutLocale() {
  try {
    const rawUrlLocale = new URLSearchParams(window.location.search).get("lang");
    if (rawUrlLocale && /^(?:en|zh)(?:[-_][a-z]+)?$/i.test(rawUrlLocale)) {
      return normalizeBallBoyLocale(rawUrlLocale);
    }
  } catch {
    // The document and saved preference below remain safe fallbacks.
  }
  const documentLocale = normalizeBallBoyLocale(document.documentElement.lang);
  if (documentLocale === "zh") {
    return "zh";
  }
  try {
    return normalizeBallBoyLocale(localStorage.getItem("world-cup-simplified-language"));
  } catch {
    return documentLocale;
  }
}

let scoutLocale = readScoutLocale();

function scoutText(key, ...args) {
  const value = SCOUT_COPY[scoutLocale]?.[key] ?? SCOUT_COPY.en[key] ?? key;
  return typeof value === "function" ? value(...args) : value;
}

function normalizeScoutSettingsText(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[“”"'’]/g, "")
    .replace(/[?!。！？]+$/g, "")
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ");
}

function getScoutLanguageName(language, locale = scoutLocale) {
  if (normalizeBallBoyLocale(locale) === "zh") {
    return language === "zh" ? "中文" : "英文";
  }
  return language === "zh" ? "Chinese" : "English";
}

function getScoutLanguageIntent(question) {
  const normalized = normalizeScoutSettingsText(question);
  const hasAction = /\b(?:change|set|switch|use)\b/.test(normalized) ||
    /(?:切换|改成|换成|设置为|使用|用)/.test(normalized);
  if (!hasAction) {
    return null;
  }

  const targetPatterns = [
    /^(?:please )?(?:change|set|switch|use)(?: my| the| app| site| page)*(?: language| locale)?(?: to| as)? (.+?)(?: language)?$/,
    /^(?:请)?(?:把)?(?:语言|语种)?(?:切换|改成|换成|设置为|使用|用)(?:到|为)?(.+)$/
  ];
  const requestedTarget = targetPatterns
    .map((pattern) => normalized.match(pattern)?.[1]?.trim())
    .find(Boolean);
  if (!requestedTarget) {
    return null;
  }

  const supportedLanguage = SCOUT_LANGUAGE_ALIASES[requestedTarget];
  if (supportedLanguage) {
    return {
      kind: "settings-action",
      setting: "language",
      status: supportedLanguage === scoutLocale ? "already" : "pending",
      value: supportedLanguage
    };
  }

  const unsupportedLanguage = SCOUT_UNSUPPORTED_LANGUAGE_NAMES[requestedTarget];
  if (unsupportedLanguage) {
    return {
      kind: "settings-action",
      requestedLabel: unsupportedLanguage,
      setting: "language",
      status: "unsupported",
      value: ""
    };
  }

  return null;
}

function normalizeScoutTimeZoneTarget(value) {
  return normalizeScoutSettingsText(value)
    .replace(/\b(?:please|my|the|app|site|page|timezone|time zone|time)\b/g, " ")
    .replace(/(?:请|我的|网站|页面|时区|时间)/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getScoutAvailableTimeZones() {
  const selectValues = [...(document.querySelector("#timezone-select")?.options || [])]
    .map((option) => option.value)
    .filter(Boolean);
  let browserValues = [];
  try {
    browserValues = typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [];
  } catch {
    browserValues = [];
  }
  return [...new Set([...selectValues, ...browserValues])];
}

function getScoutTimeZoneMatches(target) {
  const normalizedTarget = normalizeScoutTimeZoneTarget(target);
  if (!normalizedTarget) {
    return [];
  }

  const availableTimeZones = getScoutAvailableTimeZones();
  const availableSet = new Set(availableTimeZones);
  const aliasValue = SCOUT_TIME_ZONE_ALIASES[normalizeScoutSettingsText(target)] ||
    SCOUT_TIME_ZONE_ALIASES[normalizedTarget];
  if (aliasValue) {
    return availableSet.has(aliasValue) ? [aliasValue] : [];
  }

  return availableTimeZones.filter((timeZone) => {
    const parts = timeZone.split("/");
    const candidates = [
      timeZone,
      parts.at(-1),
      parts.slice(1).join(" ")
    ].map((candidate) => normalizeScoutSettingsText(candidate));
    return candidates.includes(normalizedTarget);
  });
}

function getScoutTimeZoneOption(target) {
  const timeZoneSelect = document.querySelector("#timezone-select");
  if (!timeZoneSelect) {
    return null;
  }
  const matches = getScoutTimeZoneMatches(target);
  if (matches.length !== 1) {
    return null;
  }
  return [...timeZoneSelect.options].find((option) => option.value === matches[0]) || null;
}

function getScoutLocationLabel(value) {
  const label = String(value || "").replace(/[_/]+/g, " ").replace(/\s+/g, " ").trim();
  if (!label || /[\u3400-\u9fff]/.test(label)) {
    return label;
  }
  return label
    .split(" ")
    .map((word) => word ? `${word[0].toLocaleUpperCase("en-US")}${word.slice(1)}` : "")
    .join(" ");
}

function getScoutTimeZoneRequest(question) {
  const normalized = normalizeScoutSettingsText(question);
  const timeZoneFirstMatch = normalized.match(/^(?:time ?zone)(?: to| for)? (.+)$/);
  const hasAction = /\b(?:change|set|switch|use)\b/.test(normalized) ||
    /(?:切换|改成|换成|设置为|使用|用)/.test(normalized) ||
    Boolean(timeZoneFirstMatch);
  if (!hasAction) {
    return null;
  }

  const needsTimeZoneTarget =
    /^(?:please )?(?:change|set|switch)(?: my| the| this| app| site| page)*(?: time ?zone| timezone)$/.test(normalized) ||
    /^(?:请)?(?:切换|更改|修改|设置)(?:我的|网站|页面)?时区$/.test(normalized);
  if (needsTimeZoneTarget) {
    return {
      kind: "settings-action",
      setting: "timezone",
      status: "needs-target",
      value: ""
    };
  }

  const patterns = [
    /^(?:time ?zone)(?: to| for)? (.+)$/,
    /^(?:please )?(?:change|set|switch)(?: my| the| this| app| site| page)*(?: time ?zone| timezone)(?: to)? (.+)$/,
    /^(?:please )?(?:change|set|switch|use)(?: to)? (.+?) (?:time|time ?zone|timezone)$/,
    /^(?:please )?(?:change|set|switch|use)(?: to)? (.+)$/,
    /(?:把)?(?:我的|网站|页面)?时区(?:切换|改成|换成|设置为|用)?(?:到|为)?(.+)$/,
    /(?:切换|改成|换成|设置为|使用|用)(?:到|为)?(.+?)(?:时区|时间)$/
  ];
  const matchedPattern = patterns
    .map((pattern) => normalized.match(pattern))
    .find(Boolean);
  const requestedTarget = matchedPattern?.[1]?.trim() || "";
  if (!requestedTarget) {
    return null;
  }

  const timeZoneGroup = SCOUT_TIME_ZONE_GROUP_ALIASES[normalizeScoutTimeZoneTarget(requestedTarget)];
  if (timeZoneGroup) {
    const availableValues = new Set(getScoutAvailableTimeZones());
    const availableOptions = timeZoneGroup.options
      .filter(([value]) => availableValues.has(value));
    return {
      kind: "settings-action",
      optionLabels: Object.fromEntries(availableOptions.map(([value, label]) => [value, label])),
      optionLabelsZh: Object.fromEntries(availableOptions.map(([value, , labelZh]) => [value, labelZh])),
      options: availableOptions.map(([value]) => value),
      requestedLabel: timeZoneGroup.label,
      requestedLabelZh: timeZoneGroup.labelZh,
      setting: "timezone",
      status: "choose-target",
      value: ""
    };
  }

  const option = getScoutTimeZoneOption(requestedTarget);
  if (option) {
    const timeZoneSelect = document.querySelector("#timezone-select");
    return {
      kind: "settings-action",
      setting: "timezone",
      status: option.value === timeZoneSelect?.value ? "already" : "pending",
      value: option.value
    };
  }

  const hasTimeZoneCue = /\b(?:time|time ?zone|timezone)\b/.test(normalized) ||
    /(?:时区|时间)/.test(normalized);
  if (hasTimeZoneCue) {
    return {
      kind: "settings-action",
      requestedLabel: getScoutLocationLabel(requestedTarget),
      setting: "timezone",
      status: "unmatched",
      value: ""
    };
  }
  return null;
}

function isScoutSettingsFollowUpCandidate(question) {
  const normalized = normalizeScoutSettingsText(question);
  if (!normalized || normalized.split(/\s+/).length > 5) {
    return false;
  }
  return !/\b(?:who|what|when|where|why|how|match|game|player|team|country|rule|score|play|won|beat)\b/.test(normalized) &&
    !/(谁|什么|何时|哪里|为什么|怎么|比赛|球员|球队|国家|规则|比分|踢|赢)/.test(normalized);
}

function getScoutSettingsReply(question) {
  const languageReply = getScoutLanguageIntent(question);
  if (languageReply) {
    return { ...languageReply, originalQuestion: String(question || "").trim() };
  }
  const timeZoneReply = getScoutTimeZoneRequest(question);
  if (timeZoneReply) {
    return { ...timeZoneReply, originalQuestion: String(question || "").trim() };
  }
  if (
    pendingScoutSettingsRequest?.setting === "timezone" &&
    isScoutSettingsFollowUpCandidate(question)
  ) {
    const followUpReply = getScoutTimeZoneRequest(`change timezone to ${question}`);
    if (followUpReply) {
      return { ...followUpReply, originalQuestion: String(question || "").trim() };
    }
  }
  return null;
}

async function getScoutReply(question, options = {}) {
  return getScoutSettingsReply(question) || getBallBoyReply(question, options);
}

function getScoutInitialMessageHtml() {
  return `
    <div class="scout-message is-assistant">
      <p class="scout-speaker">${scoutText("assistantName")}</p>
      <p>${scoutText("initialMessage")}</p>
    </div>
  `;
}

function getScoutSuggestionsHtml() {
  return scoutText("suggestions")
    .map((prompt) => `<button class="scout-chip" type="button" data-scout-prompt="${prompt}">${prompt}</button>`)
    .join("");
}

const widget = document.createElement("aside");
widget.className = "scout-widget";
widget.id = "scout-widget";
widget.lang = scoutLocale === "zh" ? "zh-Hans" : "en";
widget.innerHTML = `
  <button class="scout-launcher" id="scout-launcher" type="button" aria-label="${scoutText("open")}" aria-expanded="false" aria-controls="scout-panel">
    <span class="scout-visually-hidden">${scoutText("open")}</span>
  </button>
  <span class="scout-face" aria-hidden="true">
    <span class="scout-eyes">
      <span class="scout-eye"><span class="scout-pupil"></span></span>
      <span class="scout-eye"><span class="scout-pupil"></span></span>
    </span>
  </span>
  <section class="scout-panel" id="scout-panel" role="dialog" aria-label="${scoutText("chatLabel")}" aria-hidden="true" inert>
    <header class="scout-header">
      <div class="scout-heading">
        <p class="scout-title">${scoutText("assistantName")}</p>
        <p class="scout-status">${scoutText("status")}</p>
      </div>
      <button class="scout-reset" id="scout-reset" type="button" aria-label="${scoutText("reset")}" title="${scoutText("newChat")}">
        <svg class="scout-reset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
        </svg>
      </button>
      <button class="scout-close" id="scout-close" type="button" aria-label="${scoutText("close")}"></button>
    </header>
    <div class="scout-conversation" id="scout-conversation">
      <div class="scout-messages" id="scout-messages" aria-live="polite">
        ${getScoutInitialMessageHtml()}
      </div>
      <div class="scout-suggestions" id="scout-suggestions" aria-label="${scoutText("suggestedQuestions")}">
        ${getScoutSuggestionsHtml()}
      </div>
    </div>
    <button class="scout-more" id="scout-more" type="button" aria-label="${scoutText("showMore")}" hidden>
      <span class="scout-more-label">${scoutText("moreBelow")}</span> <span aria-hidden="true">↓</span>
    </button>
    <form class="scout-composer" id="scout-composer">
      <label class="scout-visually-hidden" for="scout-input">${scoutText("askLabel")}</label>
      <input class="scout-input" id="scout-input" type="text" maxlength="180" autocomplete="off" placeholder="${scoutText("placeholder")}" />
      <button class="scout-send" type="submit" aria-label="${scoutText("send")}" disabled>↑</button>
    </form>
  </section>
`;

document.body.append(widget);

const launcher = widget.querySelector("#scout-launcher");
const panel = widget.querySelector("#scout-panel");
const resetButton = widget.querySelector("#scout-reset");
const closeButton = widget.querySelector("#scout-close");
const conversation = widget.querySelector("#scout-conversation");
const messages = widget.querySelector("#scout-messages");
const suggestions = widget.querySelector("#scout-suggestions");
const composer = widget.querySelector("#scout-composer");
const input = widget.querySelector("#scout-input");
const sendButton = widget.querySelector(".scout-send");
const moreButton = widget.querySelector("#scout-more");
const eyes = widget.querySelector(".scout-eyes");
const launcherHiddenLabel = launcher.querySelector(".scout-visually-hidden");
const title = widget.querySelector(".scout-title");
const status = widget.querySelector(".scout-status");
const composerLabel = widget.querySelector("label[for='scout-input']");
const moreLabel = widget.querySelector(".scout-more-label");
const juggleRecord = document.querySelector("#juggle-record");
const tournamentView = document.querySelector("#standings-view");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

panel.inert = true;

let isOpen = false;
let pointerFrame = 0;
let latestPointer = null;
let blinkTimer = 0;
let lastBlinkAt = 0;
let touchGazeTimer = 0;
let isTouchGazeActive = false;
let replyTimer = 0;
let replyRequestToken = 0;
let isReplyPending = false;
let currentAnswerPrompt = "";
let eyeExpressionTimer = 0;
let eyeExpressionToken = 0;
let isEyeExpressionActive = false;
let isJuggleActive = false;
let juggleTrackingFrame = 0;
let juggleStartTimer = 0;
let juggleTapTimer = 0;
let activeJuggleBall = null;
let juggleEyeCenter = null;
let juggleEyeCenterUnlockAt = 0;
let currentJuggleCount = 0;
let knownJuggleBest = 0;
let juggleBestBeforeRun = 0;
let tournamentShowNextFrame = 0;
let tournamentShowNextObserver = null;
let isAvoidingTournamentShowNext = false;
let scoutVisualViewportFrame = 0;
let canonicalTurns = [];
let localeRenderToken = 0;
let pendingScoutSettingsRequest = null;

function isScoutZh() {
  return scoutLocale === "zh";
}

function applyScoutStaticLocale() {
  widget.lang = isScoutZh() ? "zh-Hans" : "en";
  launcher.setAttribute("aria-label", scoutText("open"));
  launcherHiddenLabel.textContent = scoutText("open");
  panel.setAttribute("aria-label", scoutText("chatLabel"));
  title.textContent = scoutText("assistantName");
  status.textContent = scoutText("status");
  resetButton.setAttribute("aria-label", scoutText("reset"));
  resetButton.setAttribute("title", scoutText("newChat"));
  closeButton.setAttribute("aria-label", scoutText("close"));
  suggestions.setAttribute("aria-label", scoutText("suggestedQuestions"));
  if (!canonicalTurns.length) {
    suggestions.innerHTML = getScoutSuggestionsHtml();
  }
  moreButton.setAttribute("aria-label", scoutText("showMore"));
  moreLabel.textContent = scoutText("moreBelow");
  composerLabel.textContent = scoutText("askLabel");
  input.setAttribute("placeholder", scoutText("placeholder"));
  sendButton.setAttribute("aria-label", scoutText("send"));
}

function setPupilPosition(x = 0, y = 0) {
  eyes.style.setProperty("--scout-pupil-x", `${x.toFixed(2)}px`);
  eyes.style.setProperty("--scout-pupil-y", `${y.toFixed(2)}px`);
}

function pointPupilsAt(targetX, targetY, center = null) {
  let centerX = center?.x;
  let centerY = center?.y;
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
    const bounds = eyes.getBoundingClientRect();
    centerX = bounds.left + bounds.width / 2;
    centerY = bounds.top + bounds.height / 2;
  }

  const deltaX = targetX - centerX;
  const deltaY = targetY - centerY;
  const distance = Math.hypot(deltaX, deltaY);
  const strength = Math.min(1, distance / 90);
  const unitX = distance ? deltaX / distance : 0;
  const unitY = distance ? deltaY / distance : 0;
  setPupilPosition(unitX * SCOUT_PUPIL_TRAVEL * strength, unitY * SCOUT_PUPIL_TRAVEL * strength);
}

function updatePupils() {
  pointerFrame = 0;
  if (isJuggleActive || isEyeExpressionActive || isReplyPending) {
    return;
  }

  if (!latestPointer || !eyes.isConnected) {
    setPupilPosition();
    return;
  }

  pointPupilsAt(latestPointer.x, latestPointer.y);
}

function queuePupilUpdate(event) {
  if (event.pointerType === "touch") {
    return;
  }

  latestPointer = { x: event.clientX, y: event.clientY };
  if (!isJuggleActive && !isEyeExpressionActive && !isReplyPending && !pointerFrame) {
    pointerFrame = window.requestAnimationFrame(updatePupils);
  }
}

function queueTouchPupilUpdate(event) {
  const touch = event.touches?.[0] || event.changedTouches?.[0];
  if (!touch) {
    return;
  }

  window.clearTimeout(touchGazeTimer);
  touchGazeTimer = 0;
  isTouchGazeActive = true;
  latestPointer = { x: touch.clientX, y: touch.clientY };
  pauseRandomBlink();
  if (!isJuggleActive && !isEyeExpressionActive && !isReplyPending && !pointerFrame) {
    pointerFrame = window.requestAnimationFrame(updatePupils);
  }
}

function cancelTouchGaze({ recenter = false } = {}) {
  window.clearTimeout(touchGazeTimer);
  touchGazeTimer = 0;
  isTouchGazeActive = false;
  if (recenter) {
    latestPointer = null;
    setPupilPosition();
  }
}

function scheduleTouchGazeRelease(event) {
  if (event.touches?.length) {
    queueTouchPupilUpdate(event);
    return;
  }

  window.clearTimeout(touchGazeTimer);
  touchGazeTimer = window.setTimeout(() => {
    touchGazeTimer = 0;
    isTouchGazeActive = false;
    latestPointer = null;
    syncEyeAttention();
    scheduleBlink();
  }, SCOUT_TOUCH_GAZE_LINGER_MS);
}

function pauseRandomBlink() {
  window.clearTimeout(blinkTimer);
  blinkTimer = 0;
  widget.classList.remove("is-blinking");
}

function getBlinkCooldownRemaining() {
  return Math.max(0, SCOUT_BLINK_COOLDOWN_MS - (Date.now() - lastBlinkAt));
}

function markBlinkActivity() {
  lastBlinkAt = Date.now();
}

function scheduleBlink() {
  pauseRandomBlink();
  if (
    reducedMotion.matches ||
    document.hidden ||
    isJuggleActive ||
    isEyeExpressionActive ||
    isReplyPending ||
    isTouchGazeActive
  ) {
    return;
  }

  const idleDelay = SCOUT_IDLE_BLINK_MIN_MS + Math.random() * SCOUT_IDLE_BLINK_RANGE_MS;
  blinkTimer = window.setTimeout(() => {
    blinkTimer = 0;
    if (
      document.hidden ||
      isJuggleActive ||
      isEyeExpressionActive ||
      isReplyPending ||
      isTouchGazeActive
    ) {
      scheduleBlink();
      return;
    }
    if (getBlinkCooldownRemaining() > 0) {
      scheduleBlink();
      return;
    }
    markBlinkActivity();
    widget.classList.add("is-blinking");
    blinkTimer = window.setTimeout(() => {
      blinkTimer = 0;
      widget.classList.remove("is-blinking");
      scheduleBlink();
    }, 135);
  }, Math.max(idleDelay, getBlinkCooldownRemaining()));
}

function removeEyeExpressionClasses() {
  widget.classList.remove(...SCOUT_EYE_EXPRESSION_CLASSES);
}

function syncEyeAttention() {
  const shouldLookAtThinking = isReplyPending && !isJuggleActive && !isEyeExpressionActive;
  widget.classList.toggle("is-eye-thinking", shouldLookAtThinking);

  if (isJuggleActive || isEyeExpressionActive) {
    return;
  }

  if (shouldLookAtThinking) {
    setPupilPosition(0, 3.25);
    return;
  }

  updatePupils();
}

function clearEyeExpression({ restore = true } = {}) {
  eyeExpressionToken += 1;
  window.clearTimeout(eyeExpressionTimer);
  eyeExpressionTimer = 0;
  isEyeExpressionActive = false;
  removeEyeExpressionClasses();
  if (restore) {
    syncEyeAttention();
    scheduleBlink();
  }
}

function playEyeSequence(steps) {
  const availableSteps = getBlinkCooldownRemaining() > 0
    ? steps.filter((step) => !SCOUT_BLINK_EXPRESSION_CLASSES.has(step.className))
    : steps;
  clearEyeExpression({ restore: false });
  pauseRandomBlink();

  if (reducedMotion.matches || !availableSteps.length) {
    syncEyeAttention();
    scheduleBlink();
    return;
  }

  if (availableSteps.some((step) => SCOUT_BLINK_EXPRESSION_CLASSES.has(step.className))) {
    markBlinkActivity();
  }

  const sequenceToken = eyeExpressionToken;
  isEyeExpressionActive = true;
  widget.classList.remove("is-eye-thinking");

  const advance = (index) => {
    if (sequenceToken !== eyeExpressionToken) {
      return;
    }

    removeEyeExpressionClasses();
    const step = availableSteps[index];
    if (!step) {
      eyeExpressionTimer = 0;
      isEyeExpressionActive = false;
      syncEyeAttention();
      scheduleBlink();
      return;
    }

    if (step.className) {
      widget.classList.add(step.className);
    }
    if (step.pupil) {
      setPupilPosition(step.pupil.x, step.pupil.y);
    }

    eyeExpressionTimer = window.setTimeout(() => advance(index + 1), step.duration);
  };

  advance(0);
}

function getVisibleTournamentShowNextButton() {
  const button = tournamentView?.querySelector(".tournament-show-next-button");
  if (
    !button ||
    button.hidden ||
    button.disabled ||
    button.getAttribute("aria-hidden") === "true" ||
    button.classList.contains("is-target-visible") ||
    button.closest("[hidden]") ||
    !button.getClientRects().length
  ) {
    return null;
  }

  const style = window.getComputedStyle(button);
  if (
    style.display === "none" ||
    style.visibility === "hidden"
  ) {
    return null;
  }

  const bounds = button.getBoundingClientRect();
  if (
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    bounds.right <= 0 ||
    bounds.left >= window.innerWidth ||
    bounds.bottom <= 0 ||
    bounds.top >= window.innerHeight
  ) {
    return null;
  }

  return { bounds, button };
}

function playTournamentShowNextAwareness() {
  if (isOpen || isJuggleActive || isReplyPending) {
    return;
  }
  playEyeSequence([
    {
      className: "is-eye-aware-below",
      duration: 680,
      pupil: { x: 0, y: 3.35 }
    }
  ]);
}

function syncTournamentShowNextAvoidance() {
  tournamentShowNextFrame = 0;
  const result = getVisibleTournamentShowNextButton();
  const shouldAvoid = Boolean(result);

  if (result) {
    const obstacleBottom = Math.ceil(
      window.innerHeight - result.bounds.top + SCOUT_SHOW_NEXT_GAP
    );
    widget.style.setProperty("--scout-obstacle-bottom", `${obstacleBottom}px`);
  } else {
    widget.style.removeProperty("--scout-obstacle-bottom");
  }

  widget.classList.toggle("has-tournament-show-next", shouldAvoid);
  if (shouldAvoid && !isAvoidingTournamentShowNext) {
    playTournamentShowNextAwareness();
  }
  isAvoidingTournamentShowNext = shouldAvoid;
}

function queueTournamentShowNextSync() {
  if (!tournamentShowNextFrame) {
    tournamentShowNextFrame = window.requestAnimationFrame(
      syncTournamentShowNextAvoidance
    );
  }
}

function initializeTournamentShowNextAvoidance() {
  if (!tournamentView || typeof MutationObserver === "undefined") {
    return;
  }

  tournamentShowNextObserver = new MutationObserver(
    queueTournamentShowNextSync
  );
  tournamentShowNextObserver.observe(tournamentView, {
    attributes: true,
    attributeFilter: ["aria-hidden", "class", "disabled", "hidden"],
    childList: true,
    subtree: true
  });
  queueTournamentShowNextSync();
}

function readJuggleDisplayValue() {
  const match = juggleRecord?.textContent?.match(/\((\d+)\)/);
  return match ? Number(match[1]) : 0;
}

function readStoredJuggleBest() {
  try {
    const value = Number(localStorage.getItem(SCOUT_JUGGLE_RECORD_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function getJuggleBallTarget() {
  const transform = activeJuggleBall?.style.transform || "";
  const match = transform.match(
    /translate3d\(\s*(-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px,\s*0(?:px)?\s*\)/
  );
  if (!match) {
    return null;
  }

  const size = Number.parseFloat(
    activeJuggleBall.style.getPropertyValue("--juggle-ball-size")
  );
  const radius = Number.isFinite(size) ? size / 2 : 19;
  return {
    x: Number(match[1]) + radius,
    y: Number(match[2]) + radius
  };
}

function getJuggleEyeCenter() {
  if (!juggleEyeCenter || performance.now() < juggleEyeCenterUnlockAt) {
    const bounds = eyes.getBoundingClientRect();
    const center = {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2
    };
    if (performance.now() >= juggleEyeCenterUnlockAt) {
      juggleEyeCenter = center;
    }
    return center;
  }
  return juggleEyeCenter;
}

function trackJuggleBallWithEyes() {
  juggleTrackingFrame = 0;
  if (!isJuggleActive) {
    return;
  }

  const target = getJuggleBallTarget();
  if (target) {
    pointPupilsAt(target.x, target.y, getJuggleEyeCenter());
  }
  juggleTrackingFrame = window.requestAnimationFrame(trackJuggleBallWithEyes);
}

function triggerJuggleTapReaction() {
  if (reducedMotion.matches) {
    return;
  }

  window.clearTimeout(juggleTapTimer);
  widget.classList.remove("is-eye-juggle-tap");
  void eyes.offsetWidth;
  widget.classList.add("is-eye-juggle-tap");
  juggleTapTimer = window.setTimeout(() => {
    widget.classList.remove("is-eye-juggle-tap");
    juggleTapTimer = 0;
  }, 150);
}

function startJuggleEyeTracking() {
  cancelTouchGaze({ recenter: true });
  isJuggleActive = true;
  currentJuggleCount = 0;
  juggleBestBeforeRun = Math.max(knownJuggleBest, readStoredJuggleBest());
  activeJuggleBall = document.querySelector(".juggle-ball.is-active");
  juggleEyeCenter = null;

  if (isOpen) {
    setOpen(false, { focus: false });
    juggleEyeCenterUnlockAt = performance.now() + 420;
  } else {
    juggleEyeCenterUnlockAt = 0;
  }

  clearEyeExpression({ restore: false });
  pauseRandomBlink();
  widget.classList.remove("is-eye-thinking", "is-eye-juggle-tap");
  window.clearTimeout(juggleStartTimer);
  if (!reducedMotion.matches) {
    widget.classList.add("is-eye-juggle-start");
    juggleStartTimer = window.setTimeout(() => {
      widget.classList.remove("is-eye-juggle-start");
      juggleStartTimer = 0;
    }, 380);
  }

  window.cancelAnimationFrame(juggleTrackingFrame);
  trackJuggleBallWithEyes();
}

function finishJuggleEyeTracking() {
  const finalCount = currentJuggleCount;
  const isNewBest = finalCount > juggleBestBeforeRun;

  isJuggleActive = false;
  window.cancelAnimationFrame(juggleTrackingFrame);
  juggleTrackingFrame = 0;
  window.clearTimeout(juggleStartTimer);
  window.clearTimeout(juggleTapTimer);
  juggleStartTimer = 0;
  juggleTapTimer = 0;
  widget.classList.remove("is-eye-juggle-start", "is-eye-juggle-tap");
  activeJuggleBall = null;
  juggleEyeCenter = null;
  knownJuggleBest = Math.max(knownJuggleBest, finalCount, readStoredJuggleBest());

  if (document.hidden || reducedMotion.matches) {
    syncEyeAttention();
    scheduleBlink();
    return;
  }

  if (finalCount === 0) {
    playEyeSequence([{ className: "is-eye-amused", duration: 900, pupil: { x: -1.4, y: 0.8 } }]);
    return;
  }

  if (isNewBest) {
    playEyeSequence([
      { className: "is-eye-record", duration: 590 },
      { className: "is-eye-pleased", duration: 560 }
    ]);
    return;
  }

  playEyeSequence([{ className: "is-eye-pleased", duration: 900 }]);
}

function reconcileJuggleState() {
  const nextJuggleActive = document.body.classList.contains("is-juggle-active");
  if (nextJuggleActive === isJuggleActive) {
    return;
  }

  if (nextJuggleActive) {
    startJuggleEyeTracking();
  } else {
    finishJuggleEyeTracking();
  }
}

function handleJuggleRecordChange() {
  reconcileJuggleState();
  const value = readJuggleDisplayValue();
  if (isJuggleActive) {
    if (value > currentJuggleCount) {
      currentJuggleCount = value;
      triggerJuggleTapReaction();
    }
    return;
  }

  knownJuggleBest = Math.max(knownJuggleBest, value, readStoredJuggleBest());
}

function initializeJuggleEyeReactions() {
  if (!juggleRecord || typeof MutationObserver === "undefined") {
    return;
  }

  knownJuggleBest = Math.max(readJuggleDisplayValue(), readStoredJuggleBest());

  const bodyObserver = new MutationObserver(reconcileJuggleState);
  bodyObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"]
  });

  const recordObserver = new MutationObserver(handleJuggleRecordChange);
  recordObserver.observe(juggleRecord, {
    childList: true,
    characterData: true,
    subtree: true
  });

  reconcileJuggleState();
}

function syncScoutVisualViewport() {
  scoutVisualViewportFrame = 0;
  const viewport = window.visualViewport;

  if (!isOpen || !viewport) {
    widget.style.removeProperty("--scout-visual-height");
    widget.style.removeProperty("--scout-visual-bottom-inset");
    widget.classList.remove("is-keyboard-open");
    return;
  }

  const layoutHeight = Math.max(
    window.innerHeight || 0,
    document.documentElement.clientHeight || 0
  );
  const visualHeight = Math.max(0, viewport.height);
  const visualBottom = viewport.offsetTop + visualHeight;
  const bottomInset = Math.max(0, layoutHeight - visualBottom);
  const keyboardOpen =
    window.matchMedia("(max-width: 560px)").matches &&
    document.activeElement === input &&
    layoutHeight - visualHeight >= 120;

  widget.style.setProperty("--scout-visual-height", `${Math.round(visualHeight)}px`);
  widget.style.setProperty("--scout-visual-bottom-inset", `${Math.round(bottomInset)}px`);
  widget.classList.toggle("is-keyboard-open", keyboardOpen);
}

function queueScoutVisualViewportSync() {
  if (scoutVisualViewportFrame) {
    return;
  }

  scoutVisualViewportFrame = window.requestAnimationFrame(syncScoutVisualViewport);
}

function setOpen(nextOpen, { focus = true } = {}) {
  if (isOpen === nextOpen) {
    return;
  }

  isOpen = nextOpen;
  widget.classList.toggle("is-open", isOpen);
  launcher.setAttribute("aria-expanded", String(isOpen));
  launcher.tabIndex = isOpen ? -1 : 0;
  panel.setAttribute("aria-hidden", String(!isOpen));
  panel.inert = !isOpen;

  if (isOpen) {
    queueScoutVisualViewportSync();
    void preloadBallBoyCore();
    playEyeSequence([{ className: "is-eye-wide", duration: 380 }]);
    queueScoutMoreButtonSync();
    window.setTimeout(() => {
      const shouldFocusInput =
        focus && !window.matchMedia("(max-width: 560px)").matches;
      if (isOpen && shouldFocusInput) {
        input.focus({ preventScroll: true });
      }
    }, reducedMotion.matches ? 0 : 360);
  } else {
    queueScoutVisualViewportSync();
    syncScoutMoreButton();
    if (focus) {
      launcher.focus({ preventScroll: true });
    }
    if (isAvoidingTournamentShowNext) {
      playTournamentShowNextAwareness();
    }
  }
}

function appendMessage(text, speaker, { className = "", scroll = true } = {}) {
  const message = document.createElement("div");
  message.className = `scout-message is-${speaker}`;
  if (className) {
    message.classList.add(className);
  }
  if (speaker === "assistant") {
    const label = document.createElement("p");
    label.className = "scout-speaker";
    label.textContent = scoutText("assistantName");
    message.append(label);
  }

  const copy = document.createElement("p");
  copy.textContent = text;
  message.append(copy);
  messages.append(message);
  if (scroll) {
    conversation.scrollTo({ top: conversation.scrollHeight, behavior: reducedMotion.matches ? "auto" : "smooth" });
  }
  queueScoutMoreButtonSync();
  return message;
}

function appendThinkingMessage() {
  const message = document.createElement("div");
  message.className = "scout-message is-assistant is-thinking";
  message.setAttribute("role", "status");

  const label = document.createElement("p");
  label.className = "scout-speaker";
  label.textContent = scoutText("assistantName");

  const accessibleStatus = document.createElement("span");
  accessibleStatus.className = "scout-visually-hidden";
  accessibleStatus.textContent = scoutText("thinking");

  const dots = document.createElement("span");
  dots.className = "scout-thinking-dots";
  dots.setAttribute("aria-hidden", "true");
  for (let index = 0; index < 3; index += 1) {
    dots.append(document.createElement("span"));
  }

  message.append(label, accessibleStatus, dots);
  messages.append(message);
  conversation.scrollTo({ top: conversation.scrollHeight, behavior: reducedMotion.matches ? "auto" : "smooth" });
  queueScoutMoreButtonSync();
  return message;
}

function updateSendState() {
  sendButton.disabled = isReplyPending || !input.value.trim();
}

function resetConversation() {
  const shouldRestoreInputFocus =
    document.activeElement === input || widget.classList.contains("is-keyboard-open");
  replyRequestToken += 1;
  isReplyPending = false;
  resetBallBoyContext();
  pendingScoutSettingsRequest = null;
  canonicalTurns = [];
  currentAnswerPrompt = "";
  messages.innerHTML = getScoutInitialMessageHtml();
  suggestions.innerHTML = getScoutSuggestionsHtml();
  suggestions.hidden = false;
  input.value = "";
  updateSendState();
  conversation.scrollTo({ top: 0, behavior: "auto" });
  widget.classList.remove("has-conversation");
  queueScoutMoreButtonSync();
  if (shouldRestoreInputFocus || !window.matchMedia("(max-width: 560px)").matches) {
    input.focus({ preventScroll: true });
  }
  queueScoutVisualViewportSync();
  playEyeSequence([{ className: "is-eye-double-blink", duration: 540 }]);
}

function rememberScoutReplyContext(reply) {
  pendingScoutSettingsRequest = reply?.kind === "settings-action" &&
    ["needs-target", "choose-target"].includes(reply.status)
    ? { setting: reply.setting, status: reply.status }
    : null;
}

function appendOffsideExplanation({ scroll = true } = {}) {
  const copy = isScoutZh()
    ? {
        intro: "越位规则防止进攻球员守在对方球门前等传球。",
        check: "只看一个时刻",
        direction: "进攻方向 →",
        summary: "看队友触球传球的一刻。如果进攻球员身处对方半场，而且比球和倒数第二名防守队员都更靠近球门，他就处于越位位置。",
        legend: "P = 传球者 · A = 进攻球员 · D = 防守球员 · GK = 门将",
        offside: "越位",
        tooEarly: "启动太早",
        offsideAria: "越位示例。传球瞬间，进攻球员已经越过倒数第二名防守队员形成的越位线。",
        line: "越位线",
        offsideExample: "P传球时，A已经越过越位线，随后参与进攻。",
        onside: "不越位",
        legalRun: "合法跑动",
        onsideAria: "不越位示例。传球瞬间，进攻球员与倒数第二名防守队员平行，之后才向前跑。",
        onsideExample: "P传球时，A与越位线平行；之后再向前跑。",
        alsoOnside: "另外两种不越位：",
        alsoOnsideText: "A仍在本方半场，或位于球的后方。",
        noDirect: "不会直接判越位：",
        noDirectText: "直接接到球门球、界外球或角球。",
        whySecondLast: "为什么是倒数第二名？",
        whySecondLastText: "门将通常是最后一名防守队员，所以越位线往往由最后一名后卫决定。",
        involvement: "只站在越位位置还不够。",
        involvementText: "A还必须触球、争抢、遮挡门将视线或以其他方式影响比赛，才会被判越位犯规。",
        followUps: ["解释红牌", "VAR是什么？", "解释点球"]
      }
    : {
        intro: "Offside stops attackers waiting by the opponent’s goal for a pass.",
        check: "The one check",
        direction: "Attacking →",
        summary: "Check the moment a teammate plays the ball. An attacker is in an offside position if they are in the opponent’s half and closer to goal than both the ball and the second-last opponent.",
        legend: "P = passer · A = attacker · D = defender · GK = goalkeeper",
        offside: "Offside",
        tooEarly: "Too early",
        offsideAria: "Offside example. The attacker is beyond the second-last opponent line when a teammate plays the ball.",
        line: "Line",
        offsideExample: "A is already past the line when P passes, then plays the ball.",
        onside: "Onside",
        legalRun: "Legal run",
        onsideAria: "Onside example. The attacker is level with the second-last opponent line when a teammate plays the ball, then runs forward.",
        onsideExample: "A is level with the line, then runs past it after P plays the ball.",
        alsoOnside: "Also onside:",
        alsoOnsideText: "A is in their own half or behind the ball.",
        noDirect: "No direct offside:",
        noDirectText: "goal kick, throw-in, or corner.",
        whySecondLast: "Why second-last?",
        whySecondLastText: "The goalkeeper is usually the last opponent, so the last outfield defender often sets the line.",
        involvement: "Position alone is not enough.",
        involvementText: "It becomes an offence only if A plays the ball, challenges an opponent, blocks a view, or otherwise affects play.",
        followUps: ["Explain a red card", "What is VAR?", "Explain a penalty kick"]
      };
  const message = document.createElement("div");
  message.className = "scout-message is-assistant is-visual scout-answer is-offside";
  message.innerHTML = `
    <div class="scout-rule-intro">
      <p class="scout-speaker">${escapeScoutHtml(scoutText("assistantName"))}</p>
      <p>${escapeScoutHtml(copy.intro)}</p>
    </div>
    <div class="offside-card">
      <div class="offside-rule-summary">
        <div class="offside-summary-heading">
          <span>${escapeScoutHtml(copy.check)}</span>
          <span>${escapeScoutHtml(copy.direction)}</span>
        </div>
        <p>${escapeScoutHtml(copy.summary)}</p>
        <p class="offside-legend">${escapeScoutHtml(copy.legend)}</p>
      </div>
      <div class="offside-scenarios">
        <article class="offside-scenario is-offside">
          <div class="offside-scenario-heading">
            <span>${escapeScoutHtml(copy.offside)}</span>
            <small>${escapeScoutHtml(copy.tooEarly)}</small>
          </div>
          <div class="offside-mini-pitch is-offside" role="img" aria-label="${escapeScoutHtml(copy.offsideAria)}">
            <div class="offside-mini-visual" aria-hidden="true">
              <span class="offside-mini-zone"></span>
              <span class="offside-mini-goal"></span>
              <span class="offside-mini-line"><span>${escapeScoutHtml(copy.line)}</span></span>
              <span class="offside-mini-pass"></span>
              <span class="offside-mini-player is-passer">P</span>
              <span class="offside-mini-ball"></span>
              <span class="offside-mini-player is-cover">D</span>
              <span class="offside-mini-player is-line-defender">D</span>
              <span class="offside-mini-player is-keeper">GK</span>
              <span class="offside-mini-player is-attacker">A</span>
            </div>
          </div>
          <p><strong>${escapeScoutHtml(copy.offsideExample)}</strong></p>
        </article>
        <article class="offside-scenario is-onside">
          <div class="offside-scenario-heading">
            <span>${escapeScoutHtml(copy.onside)}</span>
            <small>${escapeScoutHtml(copy.legalRun)}</small>
          </div>
          <div class="offside-mini-pitch is-onside" role="img" aria-label="${escapeScoutHtml(copy.onsideAria)}">
            <div class="offside-mini-visual" aria-hidden="true">
              <span class="offside-mini-zone"></span>
              <span class="offside-mini-goal"></span>
              <span class="offside-mini-line"><span>${escapeScoutHtml(copy.line)}</span></span>
              <span class="offside-mini-pass"></span>
              <span class="offside-mini-player is-passer">P</span>
              <span class="offside-mini-ball"></span>
              <span class="offside-mini-player is-cover">D</span>
              <span class="offside-mini-player is-line-defender">D</span>
              <span class="offside-mini-player is-keeper">GK</span>
              <span class="offside-mini-player is-attacker">A</span>
            </div>
          </div>
          <p><strong>${escapeScoutHtml(copy.onsideExample)}</strong></p>
        </article>
      </div>
      <div class="offside-quick-notes">
        <p><strong>${escapeScoutHtml(copy.alsoOnside)}</strong> ${escapeScoutHtml(copy.alsoOnsideText)}</p>
        <p><strong>${escapeScoutHtml(copy.noDirect)}</strong> ${escapeScoutHtml(copy.noDirectText)}</p>
      </div>
      <div class="offside-explainers">
        <p><strong>${escapeScoutHtml(copy.whySecondLast)}</strong> ${escapeScoutHtml(copy.whySecondLastText)}</p>
        <p><strong>${escapeScoutHtml(copy.involvement)}</strong> ${escapeScoutHtml(copy.involvementText)}</p>
      </div>
    </div>
    <a class="scout-source-link" href="https://www.theifab.com/laws/latest/offside/" target="_blank" rel="noreferrer">${escapeScoutHtml(scoutText("officialLaw"))}</a>
    ${renderScoutFollowUps(copy.followUps)}
  `;
  messages.append(message);
  if (scroll) {
    scrollScoutMessageIntoView(message);
  }
}

function escapeScoutHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSafeScoutUrl(value) {
  const candidate = String(value || "").trim();
  if (!candidate) {
    return "";
  }
  try {
    const url = new URL(candidate, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function getScoutInitials(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase() || "?";
}

function truncateScoutText(value, limit = 190) {
  const text = String(value || "").trim();
  if (text.length <= limit) {
    return text;
  }
  const shortened = text.slice(0, limit + 1).replace(/\s+\S*$/, "").trim();
  return `${shortened || text.slice(0, limit).trim()}…`;
}

function getScoutPromptKey(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[?!.]+$/g, "")
    .replace(/\s+/g, " ");
}

function renderScoutFollowUps(prompts = [], excludedPrompts = []) {
  const excludedKeys = new Set(
    [currentAnswerPrompt, ...excludedPrompts].map(getScoutPromptKey).filter(Boolean)
  );
  const seenKeys = new Set();
  const uniquePrompts = prompts
    .filter(Boolean)
    .filter((prompt) => {
      const key = getScoutPromptKey(prompt);
      if (!key || excludedKeys.has(key) || seenKeys.has(key)) {
        return false;
      }
      seenKeys.add(key);
      return true;
    })
    .slice(0, 3);
  if (!uniquePrompts.length) {
    return "";
  }
  return `
    <div class="scout-followups" aria-label="${escapeScoutHtml(scoutText("followUps"))}">
      ${uniquePrompts
        .map(
          (prompt) => `
            <button class="scout-followup" type="button" data-scout-prompt="${escapeScoutHtml(prompt)}">
              ${escapeScoutHtml(prompt)}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderScoutAnswerHeading() {
  return `
    <div class="scout-answer-heading">
      <p class="scout-speaker">${escapeScoutHtml(scoutText("assistantName"))}</p>
    </div>
  `;
}

function renderScoutFlag(team, className = "", { decorative = false } = {}) {
  const flagClass = /^flag-[a-z0-9-]+$/i.test(String(team?.flagClass || ""))
    ? team.flagClass
    : "";
  if (!team || (!team.flag && !flagClass)) {
    return "";
  }
  const classes = ["scout-team-flag", className, flagClass ? "flag" : "", flagClass]
    .filter(Boolean)
    .join(" ");
  const accessibility = decorative
    ? 'aria-hidden="true"'
    : `role="img" aria-label="${escapeScoutHtml(`${team.name || scoutText("country")} ${scoutText("flag")}`)}"`;
  return `<span class="${escapeScoutHtml(classes)}" ${accessibility}>${flagClass ? "" : escapeScoutHtml(team.flag)}</span>`;
}

function renderScoutAvatar(person, team, className = "", { showFlagBadge = false } = {}) {
  const name = person?.displayName || person?.name || scoutText("playerFallback");
  const imageUrl = getSafeScoutUrl(person?.imageUrl);
  return `
    <span class="scout-avatar ${escapeScoutHtml(className)}" aria-hidden="true">
      <span class="scout-avatar-fallback">${escapeScoutHtml(getScoutInitials(name))}</span>
      ${imageUrl ? `<img src="${escapeScoutHtml(imageUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />` : ""}
      ${showFlagBadge ? renderScoutFlag(team, "scout-avatar-flag", { decorative: true }) : ""}
    </span>
  `;
}

function finishScoutVisualMessage(message, { scroll = true } = {}) {
  message.querySelectorAll(".scout-avatar img").forEach((image) => {
    image.addEventListener(
      "error",
      () => {
        image.hidden = true;
        image.closest(".scout-avatar")?.classList.add("is-fallback");
      },
      { once: true }
    );
  });
  messages.append(message);
  if (scroll) {
    scrollScoutMessageIntoView(message);
  }
}

function syncScoutMoreButton() {
  const remaining = conversation.scrollHeight - conversation.clientHeight - conversation.scrollTop;
  const shouldShow = isOpen && remaining > 8;
  moreButton.hidden = !shouldShow;
  moreButton.tabIndex = shouldShow ? 0 : -1;
}

function queueScoutMoreButtonSync() {
  window.requestAnimationFrame(syncScoutMoreButton);
}

function scrollScoutMessageIntoView(message) {
  window.requestAnimationFrame(() => {
    conversation.scrollTo({
      top: Math.max(0, message.offsetTop - 10),
      behavior: reducedMotion.matches ? "auto" : "smooth"
    });
    syncScoutMoreButton();
  });
}

function createScoutVisualMessage(kind, lead, body, followUps = [], options = {}) {
  const message = document.createElement("div");
  message.className = `scout-message is-assistant is-visual scout-answer is-${kind}`;
  message.innerHTML = `
    <div class="scout-answer-intro ${lead ? "" : "has-no-lead"}">
      ${renderScoutAnswerHeading()}
      ${lead ? `<p class="scout-answer-lead">${escapeScoutHtml(lead)}</p>` : ""}
    </div>
    ${body}
  `;
  const embeddedPrompts = [...message.querySelectorAll("[data-scout-prompt]")]
    .map((item) => item.dataset.scoutPrompt || "");
  message.insertAdjacentHTML("beforeend", renderScoutFollowUps(followUps, embeddedPrompts));
  finishScoutVisualMessage(message, options);
}

function getOrdinal(value) {
  const number = Number(value);
  if (!Number.isInteger(number)) {
    return "";
  }
  if (isScoutZh()) {
    return String(number);
  }
  const mod100 = number % 100;
  const suffix = mod100 >= 11 && mod100 <= 13
    ? "th"
    : number % 10 === 1
      ? "st"
      : number % 10 === 2
        ? "nd"
        : number % 10 === 3
          ? "rd"
          : "th";
  return `${number}${suffix}`;
}

function formatScoutMarketValue(value) {
  const millions = Number(value);
  if (!Number.isFinite(millions) || millions <= 0) {
    return "—";
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

function renderScoutWatchList(note) {
  const points = String(note || "")
    .trim()
    .match(/[^.!?。！？]+(?:[.!?。！？]+|$)/gu) || [];
  const cleanPoints = points
    .map((point) => point.trim())
    .filter(Boolean);
  if (!cleanPoints.length) {
    return "";
  }
  return `
    <ul class="scout-player-watch-points">
      ${cleanPoints.map((point) => `<li>${escapeScoutHtml(point)}</li>`).join("")}
    </ul>
  `;
}

function appendPlayerReply(reply, options = {}) {
  const { age, profile, stats, team } = reply;
  const focus = reply.focus || "overview";
  const shirt = profile.shirtNumber !== "" && focus !== "number" ? ` · #${profile.shirtNumber}` : "";
  const clubLine = profile.club && !["club", "league"].includes(focus)
    ? `${profile.club}${profile.league ? ` (${profile.league})` : ""}`
    : "";
  const marketValue = formatScoutMarketValue(profile.marketValue?.value);
  const marketValueLabel = profile.marketValue?.estimated ? scoutText("estimatedValue") : scoutText("value");
  const marketValueTitle = profile.marketValue?.estimated
    ? scoutText("estimatedValueTitle")
    : scoutText("valueTitle");
  const primeValue = profile.peakMarketValue
    ? `<em>${escapeScoutHtml(isScoutZh() ? `（${scoutText("prime")} ${formatScoutMarketValue(profile.peakMarketValue)}）` : `(${scoutText("prime")} ${formatScoutMarketValue(profile.peakMarketValue)})`)}</em>`
    : "";
  const skills = profile.skills.length
    ? profile.skills.map((skill) => `<span>${escapeScoutHtml(skill)}</span>`).join("")
    : `<span>${escapeScoutHtml(scoutText("readPlay"))}</span>`;
  const note = profile.note
    ? `
      <div class="scout-explainer">
        <p class="scout-section-label">${escapeScoutHtml(scoutText("whyWatch"))}</p>
        ${renderScoutWatchList(profile.note)}
      </div>
    `
    : "";
  const showTournamentStats = ["overview", "stats", "penalty-goals"].includes(focus);
  const showPlayerDetails = focus === "overview";
  const showSkills = ["overview", "style"].includes(focus);
  const showNote = focus === "overview";
  const playerFacts = showTournamentStats || showPlayerDetails
    ? `
      <div class="scout-player-facts" aria-label="${escapeScoutHtml(scoutText("worldCupStats"))}">
        ${showTournamentStats ? `
          <section class="scout-player-fact-section" aria-label="${escapeScoutHtml(scoutText("thisWorldCup"))}">
            <p class="scout-section-label">${escapeScoutHtml(scoutText("thisWorldCup"))}</p>
            <div class="scout-player-fact-row">
              <div><strong>${stats.goals}</strong><span>${escapeScoutHtml(scoutText("goals"))}</span></div>
              <div aria-label="${escapeScoutHtml(scoutText("recordedAssists", stats.assists))}" title="${escapeScoutHtml(scoutText("assistsTitle"))}"><strong>${stats.assists}</strong><span>${escapeScoutHtml(scoutText("assists"))}</span></div>
            </div>
          </section>
        ` : ""}
        ${showPlayerDetails ? `
          <section class="scout-player-fact-section" aria-label="${escapeScoutHtml(scoutText("playerDetails"))}">
            <p class="scout-section-label">${escapeScoutHtml(scoutText("playerDetails"))}</p>
            <div class="scout-player-fact-row">
              <div><strong>${age ?? "—"}</strong><span>${escapeScoutHtml(scoutText("age"))}</span></div>
              <div class="is-value" title="${escapeScoutHtml(marketValueTitle)}"><strong>${escapeScoutHtml(marketValue)}</strong><span class="scout-value-label">${escapeScoutHtml(marketValueLabel)}${primeValue ? `${isScoutZh() ? "" : " "}${primeValue}` : ""}</span></div>
            </div>
          </section>
        ` : ""}
      </div>
    `
    : "";
  const skillBlock = showSkills
    ? `
      <div class="scout-skill-section">
        <p class="scout-section-label">${escapeScoutHtml(scoutText("signatureTraits"))}</p>
        <div class="player-skill-list scout-player-skill-list" aria-label="${escapeScoutHtml(scoutText("threeTraits"))}">
          ${skills}
        </div>
      </div>
    `
    : "";

  const body = `
    <article class="scout-data-card scout-player-card is-focus-${escapeScoutHtml(focus)}">
      <header class="scout-entity-header">
        ${renderScoutAvatar(profile, team, "is-large")}
        <div class="scout-entity-copy">
          <h3>${escapeScoutHtml(profile.displayName)}</h3>
          <p>${renderScoutFlag(team, "scout-inline-flag", { decorative: true })}<span>${escapeScoutHtml(team?.name || "")}${team ? " · " : ""}${escapeScoutHtml(profile.position)}${escapeScoutHtml(shirt)}</span></p>
          ${clubLine ? `<small title="${escapeScoutHtml(clubLine)}">${escapeScoutHtml(clubLine)}</small>` : ""}
        </div>
      </header>
      ${playerFacts}
      ${skillBlock}
      ${showNote ? note : ""}
    </article>
  `;
  createScoutVisualMessage(
    "player",
    reply.focus === "overview" ? "" : reply.lead,
    body,
    reply.followUps,
    options
  );
}

function renderCompactFixture(match, label) {
  if (!match?.home || !match?.away) {
    return "";
  }
  const hasScore = Number.isFinite(match.score?.home) && Number.isFinite(match.score?.away);
  const hasPenalties = Number.isFinite(match.penalties?.home) && Number.isFinite(match.penalties?.away);
  const center = hasScore
    ? `<strong>${Number(match.score.home)}–${Number(match.score.away)}</strong>${hasPenalties ? `<small>${escapeScoutHtml(scoutText("pens"))} ${Number(match.penalties.home)}–${Number(match.penalties.away)}</small>` : ""}`
    : `<strong>${isScoutZh() ? "对" : "vs"}</strong><small>${escapeScoutHtml(match.kickoffLabel)}</small>`;
  const centerLabel = hasScore
    ? `${scoutText("score", Number(match.score.home), Number(match.score.away))}${hasPenalties ? `${isScoutZh() ? "。" : ". "}${scoutText("penaltiesScore", Number(match.penalties.home), Number(match.penalties.away))}` : ""}`
    : `${scoutText("versus")}${isScoutZh() ? "。" : ". "}${match.kickoffLabel}`;
  return `
    <div class="scout-compact-fixture">
      <span class="scout-section-label">${escapeScoutHtml(label)}</span>
      <div class="scout-compact-score">
        <span class="scout-compact-team ${match.winnerTeamId === match.home.id ? "is-winner" : ""}">${renderScoutFlag(match.home, "scout-compact-flag", { decorative: true })}<span>${escapeScoutHtml(match.home.name)}</span></span>
        <span class="scout-compact-score-center" aria-label="${escapeScoutHtml(centerLabel)}">${center}</span>
        <span class="scout-compact-team is-away ${match.winnerTeamId === match.away.id ? "is-winner" : ""}">${renderScoutFlag(match.away, "scout-compact-flag", { decorative: true })}<span>${escapeScoutHtml(match.away.name)}</span></span>
      </div>
    </div>
  `;
}

function appendCountryReply(reply, options = {}) {
  const { groupStanding, record, team } = reply;
  const focus = reply.focus || "overview";
  const showRecord = ["overview", "record"].includes(focus);
  const showGoals = ["overview", "record", "goals", "goal-difference"].includes(focus);
  const showStyle = ["overview", "style"].includes(focus);
  const showScorer = ["overview", "top-scorer"].includes(focus);
  const showKeyPlayers = focus === "overview";
  const shownLastMatch = focus === "overview" ? reply.lastMatch : null;
  const shownNextMatch = ["overview", "next"].includes(focus) ? reply.nextMatch : null;
  const groupMeta = [
    Number.isFinite(Number(team.fifaRank)) ? scoutText("fifaRank", team.fifaRank) : "",
    team.groupId ? scoutText("group", team.groupId) : "",
    groupStanding ? scoutText("groupPosition", getOrdinal(groupStanding.position), groupStanding.points) : ""
  ].filter(Boolean).join(" · ");
  const form = record.form.length
    ? `
      <div class="scout-form-row" aria-label="${escapeScoutHtml(scoutText("recentForm"))}">
        <span class="scout-section-label">${escapeScoutHtml(scoutText("form"))}</span>
        <div>
          ${record.form
            .map((item) => {
              const title = scoutText("resultLabels")[item.result] || item.result;
              const label = isScoutZh()
                ? { draw: "平", loss: "负", "shootout-loss": "点负", "shootout-win": "点胜", win: "胜" }[item.result] || item.label
                : item.label;
              return `<span class="scout-form-result is-${escapeScoutHtml(item.result)}" title="${escapeScoutHtml(title)}" aria-label="${escapeScoutHtml(title)}">${escapeScoutHtml(label)}</span>`;
            })
            .join("")}
        </div>
      </div>
    `
    : "";
  const styleTags = (team.styleTags || []).slice(0, 3);
  const styleFlow = styleTags.length
    ? styleTags
        .map(
          (tag, index) => `
            <span class="scout-flow-step">${escapeScoutHtml(tag)}</span>
            ${index < styleTags.length - 1 ? '<span class="scout-flow-arrow" aria-hidden="true">→</span>' : ""}
          `
        )
        .join("")
    : `<span class="scout-flow-step">${escapeScoutHtml(scoutText("adaptMatch"))}</span>`;
  const keyPlayers = reply.keyPlayers.length
    ? `
      <div class="scout-key-players">
        <p class="scout-section-label">${escapeScoutHtml(scoutText("keyPlayers"))}</p>
        <div>
          ${reply.keyPlayers
            .map(
              (player) => `<button type="button" data-scout-prompt="${isScoutZh() ? "介绍一下" : "Tell me about "}${escapeScoutHtml(player.name)}">${escapeScoutHtml(player.name)}</button>`
            )
            .join("")}
        </div>
      </div>
    `
    : "";
  const scorer = reply.topScorer
    ? `
      <p class="scout-top-scorer">
        <span class="scout-section-label">${escapeScoutHtml(scoutText("topScorer"))}</span>
        <span><strong>${escapeScoutHtml(reply.topScorer.name)}</strong> · ${escapeScoutHtml(scoutText("goalCount", reply.topScorer.goals))}</span>
      </p>
    `
    : "";
  const shootoutResults = [
    record.shootoutAdvances
      ? record.shootoutAdvances === 1 ? scoutText("advancedOnce") : scoutText("advancedTimes", record.shootoutAdvances)
      : "",
    record.shootoutExits
      ? record.shootoutExits === 1 ? scoutText("exitedOnce") : scoutText("exitedTimes", record.shootoutExits)
      : ""
  ].filter(Boolean);
  const shootoutNote = shootoutResults.length
    ? `<p class="scout-stat-note">${escapeScoutHtml(scoutText("onPenalties"))}：${escapeScoutHtml(shootoutResults.join(isScoutZh() ? "，" : " and "))}${isScoutZh() ? "。" : ". "}${escapeScoutHtml(scoutText("shootoutDrawNote"))}</p>`
    : "";
  const fixtureCount = [shownLastMatch, shownNextMatch].filter(Boolean).length;
  const repeatsLead = getScoutPromptKey(reply.lead) === getScoutPromptKey(reply.beginnerStyle);

  const body = `
    <article class="scout-data-card scout-country-card is-focus-${escapeScoutHtml(focus)}">
      <header class="scout-country-header">
        ${renderScoutFlag(team, "scout-country-flag", { decorative: true })}
        <div>
          <h3>${escapeScoutHtml(team.name)}</h3>
          <p>${escapeScoutHtml(groupMeta)}</p>
        </div>
      </header>
      ${showRecord ? `
        <div class="scout-stat-strip" aria-label="${escapeScoutHtml(scoutText("fullRecord"))}">
          <div><strong>${record.wins}</strong><span>${escapeScoutHtml(scoutText("wins"))}</span></div>
          <div><strong>${record.draws}</strong><span>${escapeScoutHtml(scoutText("draws"))}</span></div>
          <div><strong>${record.losses}</strong><span>${escapeScoutHtml(scoutText("losses"))}</span></div>
        </div>
      ` : ""}
      ${showGoals ? `<p class="scout-goal-balance">${isScoutZh()
        ? `<strong>${record.goalsFor}</strong>进球 <span>·</span> <strong>${record.goalsAgainst}</strong>失球`
        : `<strong>${record.goalsFor}</strong> scored <span>·</span> <strong>${record.goalsAgainst}</strong> conceded`}</p>` : ""}
      ${showRecord ? shootoutNote : ""}
      ${showRecord ? form : ""}
      ${showStyle ? `<div class="scout-explainer">
        <p class="scout-section-label">${escapeScoutHtml(scoutText("howTheyPlay"))}</p>
        ${repeatsLead ? "" : `<p>${escapeScoutHtml(reply.beginnerStyle)}</p>`}
      </div>
      <div class="scout-skill-flow" aria-label="${escapeScoutHtml(scoutText("teamStyleFlow"))}">${styleFlow}</div>` : ""}
      ${showScorer ? scorer : ""}
      ${showKeyPlayers ? keyPlayers : ""}
      ${fixtureCount ? `<div class="scout-fixture-pair ${fixtureCount === 1 ? "has-one" : ""}">
        ${renderCompactFixture(shownLastMatch, scoutText("lastMatch"))}
        ${renderCompactFixture(shownNextMatch, scoutText("nextMatch"))}
      </div>` : ""}
    </article>
  `;
  createScoutVisualMessage("country", reply.lead, body, reply.followUps, options);
}

function appendMatchupReply(reply, options = {}) {
  const focus = reply.focus || "overview";
  const showComparison = focus === "overview";
  const showHistory = focus !== "prediction";
  const comparison = reply.comparison
    .map(({ record, team }) => {
      const meta = Number.isFinite(Number(team.fifaRank))
        ? scoutText("fifaRank", team.fifaRank)
        : "";
      const styles = (team.styleTags || []).slice(0, 3).join(" · ");
      return `
        <section class="scout-matchup-team">
          <header>
            ${renderScoutFlag(team, "scout-matchup-flag", { decorative: true })}
            <div>
              <h3>${escapeScoutHtml(team.name)}</h3>
              ${meta ? `<p>${escapeScoutHtml(meta)}</p>` : ""}
            </div>
          </header>
          <div class="scout-matchup-record" aria-label="${escapeScoutHtml(scoutText("fullRecord"))}">
            <span><strong>${record.wins}</strong>${escapeScoutHtml(scoutText("wins"))}</span>
            <span><strong>${record.draws}</strong>${escapeScoutHtml(scoutText("draws"))}</span>
            <span><strong>${record.losses}</strong>${escapeScoutHtml(scoutText("losses"))}</span>
          </div>
          <p class="scout-matchup-goals">${escapeScoutHtml(scoutText("goalsBalance", record.goalsFor, record.goalsAgainst))}</p>
          ${styles ? `<p class="scout-matchup-styles">${escapeScoutHtml(styles)}</p>` : ""}
        </section>
      `;
    })
    .join("");
  const history = reply.history.length
    ? `
      <div class="scout-h2h-results">
        ${reply.history
          .map(
            (result) => `
              <div class="scout-h2h-result">
                <time>${escapeScoutHtml(result.dateLabel)}</time>
                <span class="${result.winnerTeamId === result.home.id ? "is-winner" : ""}">${renderScoutFlag(result.home, "scout-h2h-flag", { decorative: true })}<span>${escapeScoutHtml(result.home.name)}</span></span>
                <strong aria-label="${escapeScoutHtml(scoutText("scoreAria", result.homeScore, result.awayScore))}">${result.homeScore}–${result.awayScore}</strong>
                <span class="is-away ${result.winnerTeamId === result.away.id ? "is-winner" : ""}"><span>${escapeScoutHtml(result.away.name)}</span>${renderScoutFlag(result.away, "scout-h2h-flag", { decorative: true })}</span>
                ${result.competition ? `<small>${escapeScoutHtml(result.competition)}</small>` : ""}
              </div>
            `
          )
          .join("")}
      </div>
    `
    : "";
  const prediction = reply.prediction
    ? `
      <div class="scout-matchup-prediction">
        <p class="scout-section-label">${escapeScoutHtml(scoutText("prediction90"))}</p>
        <div>
          ${reply.prediction.outcomes
            .map((outcome) => {
              const value = Math.max(0, Math.min(100, Number(outcome.value) || 0));
              return `
                <div class="scout-prediction-row">
                  <span>${escapeScoutHtml(outcome.label)}</span>
                  <div aria-hidden="true"><i style="width:${value}%"></i></div>
                  <strong>${value}%</strong>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `
    : "";
  const sourceUrl = reply.sourceUrl ? getSafeScoutUrl(reply.sourceUrl) : "";
  const cardContent = `
      ${showComparison ? `<div class="scout-matchup-section">
        <p class="scout-section-label">${escapeScoutHtml(scoutText("currentComparison"))}</p>
        <div class="scout-matchup-grid">${comparison}</div>
      </div>` : ""}
      ${prediction}
      ${showHistory ? `<div class="scout-matchup-history">
        <p class="scout-section-label">${escapeScoutHtml(reply.historyLabel || scoutText("pastMeetings"))}</p>
        <p class="scout-matchup-history-summary">${escapeScoutHtml(reply.historySummary)}</p>
        ${history}
      </div>` : ""}
      ${sourceUrl ? `<a class="scout-source-link" href="${escapeScoutHtml(sourceUrl)}" target="_blank" rel="noreferrer">${escapeScoutHtml(scoutText(focus === "prediction" ? "verifiedPredictionSource" : "verifiedH2hSource"))}</a>` : ""}
  `;
  const body = cardContent.trim()
    ? `
    <article class="scout-data-card scout-matchup-card">
      ${cardContent}
    </article>
  `
    : "";
  createScoutVisualMessage("matchup", reply.lead, body, reply.followUps, options);
}

function appendMatchReply(reply, options = {}) {
  const { fixture, teams } = reply;
  const focus = reply.focus || "overview";
  const showTimeline = ["overview", "scorers"].includes(focus);
  const showPlans = focus === "overview";
  const showRecap = ["overview", "result"].includes(focus);
  const showH2h = focus === "h2h";
  const showHighlight = ["overview", "highlights"].includes(focus);
  const status = String(fixture.status || "").toUpperCase();
  const isFinished = ["FT", "AET", "PEN"].includes(status);
  const isLive = status === "LIVE";
  const reachedExtraTime = status === "AET" || reply.timeline.some(
    (goal) => Number.parseInt(String(goal.minute || ""), 10) > 90
  ) || fixture.recap.some((item) => /extra time/i.test(item));
  const statusLabel = fixture.penalties || status === "PEN"
    ? scoutText("afterPenalties")
    : reachedExtraTime
      ? scoutText("afterExtraTime")
      : status === "FT"
        ? scoutText("fullTime")
        : isLive
          ? scoutText("live")
          : "";
  const hasScore = Number.isFinite(fixture.score?.home) && Number.isFinite(fixture.score?.away);
  const score = (isFinished || isLive) && hasScore
    ? `${Number(fixture.score.home)}<span aria-hidden="true">–</span>${Number(fixture.score.away)}`
    : `<span class="scout-versus">${isScoutZh() ? "对" : "vs"}</span>`;
  const penalties = fixture.penalties
    ? `<p class="scout-shootout-line">${escapeScoutHtml(scoutText("penalties"))}：${Number(fixture.penalties.home)}–${Number(fixture.penalties.away)}</p>`
    : "";
  const timeline = reply.timeline.length
    ? `
      <div class="scout-match-timeline">
        <p class="scout-section-label">${escapeScoutHtml(scoutText("goalTimeline"))}</p>
        ${reply.timeline
          .map((goal) => {
            const scoringTeam = goal.side === "home" ? teams.home : teams.away;
            return `
              <div class="scout-goal-row is-${escapeScoutHtml(goal.side)}">
                <time>${escapeScoutHtml(goal.minute)}</time>
                <span class="scout-goal-team" aria-label="${escapeScoutHtml(scoringTeam?.name || scoutText("scoringTeam"))}">${escapeScoutHtml(scoringTeam?.id || (isScoutZh() ? "球队" : "TEAM"))}</span>
                <span class="scout-goal-dot" aria-hidden="true">⚽</span>
                <span><strong>${escapeScoutHtml(goal.name)}</strong>${goal.penalty ? ` (${escapeScoutHtml(scoutText("penaltyShort"))})` : ""}${goal.assistName ? `<small>${escapeScoutHtml(scoutText("assist"))}：${escapeScoutHtml(goal.assistName)}</small>` : ""}</span>
              </div>
            `;
          })
          .join("")}
      </div>
    `
    : "";
  const recap = fixture.recap.length
    ? `
      <div class="scout-match-recap">
        <p class="scout-section-label">${escapeScoutHtml(scoutText("matchChanges"))}</p>
        <ul>${fixture.recap.map((item) => `<li>${escapeScoutHtml(item)}</li>`).join("")}</ul>
      </div>
    `
    : "";
  const plans = !isFinished && teams.home && teams.away
    ? `
      <div class="scout-match-plans">
        <p class="scout-section-label">${escapeScoutHtml(scoutText("playPlans"))}</p>
        <div>
          ${[teams.home, teams.away]
            .map(
              (team) => `
                <div>
                  <strong>${escapeScoutHtml(team.name)}</strong>
                  <span>${escapeScoutHtml((team.styleTags || []).slice(0, 2).join(" · "))}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    `
    : "";
  let h2h = "";
  if (fixture.h2h) {
    const h2hText = fixture.h2h.status === "loaded"
      ? fixture.h2h.summary
      : fixture.h2h.status === "verified-empty"
        ? scoutText("noH2h")
        : scoutText("checkingH2h");
    h2h = `
      <div class="scout-explainer">
        <p class="scout-section-label">${escapeScoutHtml(scoutText("beforeMatch"))}</p>
        <p>${escapeScoutHtml(h2hText)}</p>
      </div>
    `;
  }
  const highlightUrl = getSafeScoutUrl(fixture.highlightVideo?.url);
  const highlight = highlightUrl
    ? `<a class="scout-highlight-link" href="${escapeScoutHtml(highlightUrl)}" target="_blank" rel="noreferrer">▶ ${escapeScoutHtml(scoutText("verifiedHighlights"))} <span>${escapeScoutHtml(fixture.highlightVideo?.sourceName || scoutText("official"))}</span></a>`
    : "";

  const body = `
    <article class="scout-data-card scout-match-card is-focus-${escapeScoutHtml(focus)}">
      <div class="scout-match-meta">
        <span>${escapeScoutHtml(fixture.stage)}</span>
        <span>${statusLabel ? escapeScoutHtml(statusLabel) : ""}${focus !== "when" ? `${statusLabel ? " · " : ""}${escapeScoutHtml(fixture.kickoffLabel)}` : ""}</span>
      </div>
      <div class="scout-scoreboard">
        <div class="${reply.winnerTeamId && reply.winnerTeamId === teams.home?.id ? "is-winner" : ""}">
          ${renderScoutFlag(teams.home, "scout-score-flag", { decorative: true })}
          <strong>${escapeScoutHtml(teams.home?.name || scoutText("tbd"))}</strong>
        </div>
        <div class="scout-score-value" aria-label="${escapeScoutHtml(hasScore ? scoutText("scoreAria", fixture.score.home, fixture.score.away) : scoutText("versus"))}">${score}</div>
        <div class="${reply.winnerTeamId && reply.winnerTeamId === teams.away?.id ? "is-winner" : ""}">
          ${renderScoutFlag(teams.away, "scout-score-flag", { decorative: true })}
          <strong>${escapeScoutHtml(teams.away?.name || scoutText("tbd"))}</strong>
        </div>
      </div>
      ${penalties}
      ${showTimeline ? timeline : ""}
      ${showPlans ? plans : ""}
      ${showRecap ? recap : ""}
      ${showH2h ? h2h : ""}
      ${showHighlight ? highlight : ""}
    </article>
  `;
  createScoutVisualMessage("match", reply.lead, body, reply.followUps, options);
}

function appendRuleReply(reply, options = {}) {
  const { rule } = reply;
  const sourceUrl = getSafeScoutUrl(rule.sourceUrl);
  const flow = rule.flow
    .map(
      (step, index) => `
        <div class="scout-rule-step">
          <strong>${escapeScoutHtml(step.value)}</strong>
          <span>${escapeScoutHtml(step.label)}</span>
        </div>
        ${index < rule.flow.length - 1 ? '<span class="scout-rule-arrow" aria-hidden="true">→</span>' : ""}
      `
    )
    .join("");
  const body = `
    <article class="scout-data-card scout-rule-card">
      <h3>${escapeScoutHtml(rule.title)}</h3>
      <div class="scout-rule-flow" role="img" aria-label="${escapeScoutHtml(rule.flow.map((step) => `${step.value}，${step.label}`).join(scoutText("flowAriaSeparator")))}">
        ${flow}
      </div>
      <div class="scout-rule-points">
        ${rule.points
          .map(
            (point) => `
              <div>
                <strong>${escapeScoutHtml(point.title)}</strong>
                <p>${escapeScoutHtml(point.text)}</p>
              </div>
            `
          )
          .join("")}
      </div>
      <p class="scout-takeaway">${escapeScoutHtml(rule.takeaway)}</p>
      ${sourceUrl ? `<a class="scout-source-link" href="${escapeScoutHtml(sourceUrl)}" target="_blank" rel="noreferrer">${escapeScoutHtml(scoutText("officialLaw"))}</a>` : ""}
    </article>
  `;
  createScoutVisualMessage("rule", rule.lead, body, isScoutZh()
    ? [
        "解释越位",
        rule.id === "red-card" ? "解释黄牌" : "解释红牌",
        rule.id === "penalty-kick" ? "什么是点球大战？" : "解释点球"
      ]
    : [
        "Explain offside",
        rule.id === "red-card" ? "Explain a yellow card" : "Explain a red card",
        rule.id === "penalty-kick" ? "What is a penalty shootout?" : "Explain a penalty kick"
      ], options);
}

function appendHelpReply(reply, options = {}) {
  const body = `
    <div class="scout-help-grid">
      ${reply.categories
        .map(
          (category) => `
            <button type="button" data-scout-prompt="${escapeScoutHtml(category.example)}">
              <span>${escapeScoutHtml(category.icon)}</span>
              <strong>${escapeScoutHtml(category.title)}</strong>
              <small>${escapeScoutHtml(category.example)}</small>
            </button>
          `
        )
        .join("")}
    </div>
  `;
  createScoutVisualMessage("help", reply.lead, body, [], options);
}

function appendPlayerListReply(reply, options = {}) {
  const body = `
    <div class="scout-watch-list">
      ${reply.players
        .map(
          (player) => `
            <button type="button" class="scout-watch-card" data-scout-prompt="${isScoutZh() ? "介绍一下" : "Tell me about "}${escapeScoutHtml(player.profile.displayName)}${isScoutZh() ? "（" : " from "}${escapeScoutHtml(player.team?.name || scoutText("theirCountry"))}${isScoutZh() ? "）" : ""}">
              ${renderScoutAvatar(player.profile, player.team, "", { showFlagBadge: true })}
              <span>
                <strong>${escapeScoutHtml(player.profile.displayName)}</strong>
                <small>${escapeScoutHtml(player.team?.name || scoutText("countryUnavailable"))} · ${escapeScoutHtml(player.profile.position)}</small>
                <em>${escapeScoutHtml(truncateScoutText(player.note, 120))}</em>
              </span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
  createScoutVisualMessage("player-list", reply.lead, body, [], options);
}

function appendClarificationReply(reply, options = {}) {
  const body = `
    <div class="scout-clarify-list">
      ${reply.options
        .map(
          (option) => `
            <button type="button" data-scout-prompt="${isScoutZh() ? "介绍一下" : "Tell me about "}${escapeScoutHtml(option.name)}${isScoutZh() ? "（" : " from "}${escapeScoutHtml(option.team?.name || scoutText("theirCountry"))}${isScoutZh() ? "）" : ""}">
              <strong>${escapeScoutHtml(option.name)}</strong>
              <span>${renderScoutFlag(option.team, "scout-clarify-flag", { decorative: true })}<span>${escapeScoutHtml(option.team?.name || scoutText("countryUnavailable"))}</span></span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
  createScoutVisualMessage("clarify", reply.lead, body, [], options);
}

function appendPersonalityReply(reply, options = {}) {
  appendMessage(reply.text, "assistant", { ...options, className: "is-personality" });
}

function getScoutTimeZoneLabel(timeZone) {
  const option = [...(document.querySelector("#timezone-select")?.options || [])]
    .find((candidate) => candidate.value === timeZone);
  return option?.textContent?.trim() || String(timeZone || "").replace(/_/g, " ");
}

function getScoutReportIssueUrl(reply) {
  const params = new URLSearchParams({
    type: "other",
    from: window.location.href,
    details: isScoutZh()
      ? `Ball Boy 暂不支持这个请求：${reply.originalQuestion}`
      : `Ball Boy does not currently support this request: ${reply.originalQuestion}`
  });
  const timeZone = document.querySelector("#timezone-select")?.value;
  if (timeZone) {
    params.set("tz", timeZone);
  }
  if (scoutLocale !== "en") {
    params.set("lang", scoutLocale);
  }
  return `report.html?${params.toString()}`;
}

function getScoutSettingsLead(reply) {
  const label = reply.setting === "language"
    ? getScoutLanguageName(reply.value)
    : getScoutTimeZoneLabel(reply.value);
  if (reply.status === "completed") {
    if (reply.originStatus === "choose-target") {
      const region = isScoutZh() ? reply.requestedLabelZh : reply.requestedLabel;
      return scoutText("timeZoneRegionClarification", region);
    }
    return scoutText(reply.setting === "language" ? "languageActionIntro" : "timeZoneActionIntro");
  }
  if (reply.status === "already") {
    return scoutText(reply.setting === "language" ? "languageAlreadySet" : "timeZoneAlreadySet", label);
  }
  if (reply.status === "unsupported") {
    return scoutText(reply.setting === "language" ? "unsupportedLanguage" : "unsupportedTimeZone");
  }
  if (reply.status === "unmatched") {
    return scoutText("timeZoneUnmatched", reply.requestedLabel);
  }
  if (reply.status === "needs-target") {
    return scoutText("timeZoneClarification");
  }
  if (reply.status === "choose-target") {
    const region = isScoutZh() ? reply.requestedLabelZh : reply.requestedLabel;
    return scoutText("timeZoneRegionClarification", region);
  }
  return scoutText(reply.setting === "language" ? "languageActionIntro" : "timeZoneActionIntro");
}

function getScoutSettingsCompletion(reply) {
  const label = reply.setting === "language"
    ? getScoutLanguageName(reply.value)
    : getScoutTimeZoneLabel(reply.value);
  return scoutText(reply.setting === "language" ? "languageChanged" : "timeZoneChanged", label);
}

function getScoutSettingsOptionLabel(reply, value) {
  if (reply.status === "choose-target") {
    const localizedLabel = isScoutZh()
      ? reply.optionLabelsZh?.[value]
      : reply.optionLabels?.[value];
    if (localizedLabel) {
      return localizedLabel;
    }
  }
  const label = reply.setting === "language"
    ? getScoutLanguageName(value)
    : getScoutTimeZoneLabel(value);
  return scoutText(
    reply.setting === "language" ? "switchLanguage" : "switchTimeZone",
    label
  );
}

function appendSettingsActionReply(reply, options = {}) {
  let actions = "";
  if (reply.status === "pending" || reply.status === "choose-target") {
    const values = reply.status === "choose-target" ? reply.options : [reply.value];
    actions = `
      <div class="scout-settings-actions">
        ${values.map((value) => {
          return `<button
            class="scout-settings-action"
            type="button"
            data-scout-setting-action="${escapeScoutHtml(reply.setting)}"
            data-scout-setting-value="${escapeScoutHtml(value)}"
          >${escapeScoutHtml(getScoutSettingsOptionLabel(reply, value))}</button>`;
        }).join("")}
      </div>
    `;
  } else if (reply.status === "unmatched") {
    actions = `
      <div class="scout-settings-actions">
        <button class="scout-settings-action" type="button" data-scout-open-settings>${escapeScoutHtml(scoutText("openSettings"))}</button>
        <a class="scout-settings-report" href="${escapeScoutHtml(getScoutReportIssueUrl(reply))}">${escapeScoutHtml(scoutText("reportIssue"))}</a>
      </div>
    `;
  } else if (reply.status === "unsupported") {
    actions = `
      <div class="scout-settings-actions">
        <a class="scout-settings-report" href="${escapeScoutHtml(getScoutReportIssueUrl(reply))}">${escapeScoutHtml(scoutText("reportIssue"))}</a>
      </div>
    `;
  }
  createScoutVisualMessage("settings", getScoutSettingsLead(reply), actions, [], options);
  if (reply.status === "completed") {
    appendMessage(getScoutSettingsCompletion(reply), "assistant", options);
  }
}

function playPersonalityEyeReaction(eye) {
  const sequences = {
    "double-blink": [
      { className: "is-eye-double-blink", duration: 540 }
    ],
    pleased: [
      { className: "is-eye-pleased", duration: 760 }
    ],
    "side-glance": [
      { className: "is-eye-side-glance", duration: 760, pupil: { x: -3.35, y: 0.35 } }
    ],
    wide: [
      { className: "is-eye-wide", duration: 480 }
    ],
    amused: [
      { className: "is-eye-amused", duration: 720, pupil: { x: 1.8, y: 0.2 } }
    ]
  };
  const sequence = sequences[eye];
  if (sequence) {
    playEyeSequence(sequence);
    return true;
  }
  return false;
}

function appendUnknownReply(reply, options = {}) {
  createScoutVisualMessage(
    reply.kind === "error" ? "error" : "unknown",
    reply.text,
    "",
    reply.followUps,
    options
  );
}

function appendPreviewReply(reply, { animate = true, scroll = true } = {}) {
  const options = { scroll };
  if (reply.kind === "offside") {
    appendOffsideExplanation(options);
  } else if (reply.kind === "player") {
    appendPlayerReply(reply, options);
  } else if (reply.kind === "country") {
    appendCountryReply(reply, options);
  } else if (reply.kind === "match") {
    appendMatchReply(reply, options);
  } else if (reply.kind === "matchup") {
    appendMatchupReply(reply, options);
  } else if (reply.kind === "rule") {
    appendRuleReply(reply, options);
  } else if (reply.kind === "help") {
    appendHelpReply(reply, options);
  } else if (reply.kind === "player-list") {
    appendPlayerListReply(reply, options);
  } else if (reply.kind === "clarify") {
    appendClarificationReply(reply, options);
  } else if (reply.kind === "personality") {
    appendPersonalityReply(reply, options);
  } else if (reply.kind === "settings-action") {
    appendSettingsActionReply(reply, options);
  } else {
    appendUnknownReply(reply, options);
  }

  if (!animate) {
    return;
  }
  if (reply.kind === "personality") {
    if (!playPersonalityEyeReaction(reply.eye)) {
      syncEyeAttention();
      scheduleBlink();
    }
    return;
  }
  if (["unknown", "clarify"].includes(reply.kind)) {
    playEyeSequence([
      { className: "is-eye-side-glance", duration: 760, pupil: { x: -3.35, y: 0.35 } }
    ]);
    return;
  }
  syncEyeAttention();
  scheduleBlink();
}

function getScoutErrorReply(locale = scoutLocale) {
  const copy = SCOUT_COPY[normalizeBallBoyLocale(locale)] || SCOUT_COPY.en;
  return {
    followUps: copy.errorFollowUps,
    kind: "error",
    text: copy.errorText
  };
}

async function rerenderScoutConversation() {
  const renderToken = ++localeRenderToken;
  const requestToken = ++replyRequestToken;
  const turns = [...canonicalTurns];
  widget.classList.toggle("has-conversation", Boolean(turns.length));
  isReplyPending = Boolean(turns.length);
  resetBallBoyContext();
  pendingScoutSettingsRequest = null;
  currentAnswerPrompt = "";
  messages.innerHTML = turns.length ? "" : getScoutInitialMessageHtml();
  suggestions.hidden = Boolean(turns.length);
  suggestions.innerHTML = getScoutSuggestionsHtml();
  updateSendState();

  for (const turn of turns) {
    appendMessage(turn.question, "user", { scroll: false });
    const reply = turn.reply?.kind === "settings-action" && turn.reply.status === "completed"
      ? turn.reply
      : await getScoutReply(turn.question, { locale: scoutLocale })
        .catch(() => getScoutErrorReply());
    if (renderToken !== localeRenderToken || requestToken !== replyRequestToken) {
      return;
    }
    turn.reply = reply;
    rememberBallBoyReply(reply);
    rememberScoutReplyContext(reply);
    currentAnswerPrompt = turn.question;
    appendPreviewReply(reply, { animate: false, scroll: false });
  }

  if (renderToken !== localeRenderToken || requestToken !== replyRequestToken) {
    return;
  }
  canonicalTurns = turns;
  isReplyPending = false;
  widget.classList.remove("is-eye-thinking");
  updateSendState();
  conversation.scrollTo({ top: conversation.scrollHeight, behavior: "auto" });
  queueScoutMoreButtonSync();
  syncEyeAttention();
  scheduleBlink();
}

async function setScoutLocale(nextLocale) {
  const normalized = normalizeBallBoyLocale(nextLocale);
  if (normalized === scoutLocale) {
    applyScoutStaticLocale();
    return;
  }
  scoutLocale = normalized;
  applyScoutStaticLocale();
  await rerenderScoutConversation();
}

function handleScoutLanguageChange(event) {
  const eventLocale = event?.detail?.language;
  const nextLocale = eventLocale || readScoutLocale();
  setScoutLocale(nextLocale).catch((error) => {
    console.error("Unable to rerender Ball Boy after language change", error);
  });
}

function waitForScoutReplyDelay() {
  return new Promise((resolve) => {
    replyTimer = window.setTimeout(() => {
      replyTimer = 0;
      resolve();
    }, reducedMotion.matches ? 400 : SCOUT_REPLY_DELAY_MS);
  });
}

async function submitQuestion(question) {
  const trimmed = String(question || "").trim();
  if (!trimmed || isReplyPending) {
    return;
  }

  const requestToken = ++replyRequestToken;
  const turn = { question: trimmed, reply: null };
  canonicalTurns.push(turn);
  widget.classList.add("has-conversation");
  appendMessage(trimmed, "user");
  suggestions.hidden = true;
  input.value = "";
  isReplyPending = true;
  updateSendState();
  pauseRandomBlink();
  syncEyeAttention();
  const thinkingMessage = appendThinkingMessage();
  const requestedLocale = scoutLocale;
  const replyPromise = getScoutReply(trimmed, { locale: requestedLocale })
    .catch(() => getScoutErrorReply(requestedLocale));
  const [reply] = await Promise.all([replyPromise, waitForScoutReplyDelay()]);
  if (requestToken !== replyRequestToken) {
    return;
  }

  thinkingMessage.remove();
  isReplyPending = false;
  widget.classList.remove("is-eye-thinking");
  turn.reply = reply;
  rememberBallBoyReply(reply);
  rememberScoutReplyContext(reply);
  currentAnswerPrompt = trimmed;
  appendPreviewReply(reply);
  updateSendState();
}

launcher.addEventListener("click", () => setOpen(true));
resetButton.addEventListener("click", resetConversation);
closeButton.addEventListener("click", () => setOpen(false));
composer.addEventListener("submit", (event) => {
  event.preventDefault();
  submitQuestion(input.value);
});
input.addEventListener("input", updateSendState);
input.addEventListener("focus", queueScoutVisualViewportSync);
input.addEventListener("blur", queueScoutVisualViewportSync);
suggestions.addEventListener("click", (event) => {
  const promptButton = event.target.closest("[data-scout-prompt]");
  if (promptButton) {
    submitQuestion(promptButton.dataset.scoutPrompt);
  }
});
messages.addEventListener("click", (event) => {
  const settingsAction = event.target.closest("[data-scout-setting-action]");
  if (settingsAction) {
    const setting = settingsAction.dataset.scoutSettingAction;
    const value = settingsAction.dataset.scoutSettingValue;
    const matchingTurn = [...canonicalTurns]
      .reverse()
      .find((turn) =>
        turn.reply?.kind === "settings-action" &&
        turn.reply.setting === setting &&
        (
          (turn.reply.status === "pending" && turn.reply.value === value) ||
          (turn.reply.status === "choose-target" && turn.reply.options?.includes(value))
        )
      );
    if (!matchingTurn) {
      return;
    }

    if (setting === "language") {
      const languageButton = document.querySelector(`.language-option[data-language="${CSS.escape(value)}"]`);
      if (!languageButton) {
        return;
      }
      matchingTurn.reply.originStatus = matchingTurn.reply.status;
      matchingTurn.reply.status = "completed";
      matchingTurn.reply.value = value;
      pendingScoutSettingsRequest = null;
      settingsAction.disabled = true;
      settingsAction.setAttribute("aria-busy", "true");
      languageButton.click();
      return;
    }

    if (setting === "timezone") {
      const timeZoneSelect = document.querySelector("#timezone-select");
      const hasOption = [...(timeZoneSelect?.options || [])]
        .some((option) => option.value === value);
      if (!timeZoneSelect || !hasOption) {
        return;
      }
      matchingTurn.reply.originStatus = matchingTurn.reply.status;
      matchingTurn.reply.status = "completed";
      matchingTurn.reply.value = value;
      pendingScoutSettingsRequest = null;
      timeZoneSelect.value = value;
      timeZoneSelect.dispatchEvent(new Event("change", { bubbles: true }));
      const message = settingsAction.closest(".scout-message");
      message?.querySelector(".scout-settings-actions")?.remove();
      appendMessage(getScoutSettingsCompletion(matchingTurn.reply), "assistant");
      syncEyeAttention();
      scheduleBlink();
    }
    return;
  }
  const openSettingsButton = event.target.closest("[data-scout-open-settings]");
  if (openSettingsButton) {
    const settingsButton = document.querySelector("#settings-button");
    if (settingsButton?.getAttribute("aria-expanded") !== "true") {
      settingsButton?.click();
    }
    return;
  }
  const promptButton = event.target.closest("[data-scout-prompt]");
  if (promptButton) {
    submitQuestion(promptButton.dataset.scoutPrompt);
  }
});
conversation.addEventListener("scroll", syncScoutMoreButton, { passive: true });
moreButton.addEventListener("click", () => {
  conversation.scrollTo({
    top: Math.min(
      conversation.scrollHeight - conversation.clientHeight,
      conversation.scrollTop + Math.max(160, conversation.clientHeight * 0.7)
    ),
    behavior: reducedMotion.matches ? "auto" : "smooth"
  });
});

if (typeof ResizeObserver !== "undefined") {
  const scoutContentObserver = new ResizeObserver(queueScoutMoreButtonSync);
  scoutContentObserver.observe(conversation);
  scoutContentObserver.observe(messages);
}

document.addEventListener(
  "keydown",
  (event) => {
    if (event.key !== "Escape" || !isOpen) {
      return;
    }

    const hasOpenHeaderOverlay = document.querySelector(
      '#settings-button[aria-expanded="true"], #catch-up-button[aria-expanded="true"]'
    );

    if (hasOpenHeaderOverlay) {
      return;
    }

    event.stopImmediatePropagation();
    setOpen(false);
  },
  { capture: true }
);
document.addEventListener("pointermove", queuePupilUpdate, { passive: true });
document.addEventListener("touchstart", queueTouchPupilUpdate, { passive: true });
document.addEventListener("touchmove", queueTouchPupilUpdate, { passive: true });
document.addEventListener("touchend", scheduleTouchGazeRelease, { passive: true });
document.addEventListener("touchcancel", scheduleTouchGazeRelease, { passive: true });
document.addEventListener("visibilitychange", scheduleBlink);
reducedMotion.addEventListener?.("change", scheduleBlink);
window.addEventListener("worldcup:languagechange", handleScoutLanguageChange);
const scoutDocumentLanguageObserver = new MutationObserver(() => {
  handleScoutLanguageChange();
});
scoutDocumentLanguageObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["lang"]
});
window.addEventListener(
  "resize",
  () => {
    juggleEyeCenter = null;
    queueScoutVisualViewportSync();
    queueTournamentShowNextSync();
    queueScoutMoreButtonSync();
    if (!isJuggleActive && !isEyeExpressionActive && !isReplyPending) {
      updatePupils();
    }
  },
  { passive: true }
);
window.visualViewport?.addEventListener(
  "resize",
  () => {
    queueScoutVisualViewportSync();
    queueTournamentShowNextSync();
  },
  { passive: true }
);
window.visualViewport?.addEventListener(
  "scroll",
  () => {
    queueScoutVisualViewportSync();
    queueTournamentShowNextSync();
  },
  { passive: true }
);

initializeJuggleEyeReactions();
initializeTournamentShowNextAvoidance();
applyScoutStaticLocale();
scheduleBlink();
