import { DATA_VERSION, LANGUAGE_STORAGE_KEY } from "./app-config.js?v=2026-07-21-player-club-context-1";
import { appendFootballInlineText } from "./football-typography.js?v=2026-07-20-final-cutover-1";
import {
  ZH_CLUB_NAME_TRANSLATIONS,
  ZH_LEAGUE_NAME_TRANSLATIONS,
  ZH_PLAYER_NAME_TRANSLATIONS
} from "./football-locale-zh.js?v=2026-07-20-final-celebration-bullets-1";
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
  formatPlayerCardWorldCupContext,
  formatPlayerTournamentStatsLine,
  formatPlayerPosition,
  getPlayerCardWorldCupReferenceDate,
  getPlayerCardUniformNumber
} from "./player-card-ui.js?v=2026-07-21-player-tournament-stats-1";
import {
  getLanguageConfig,
  getLocaleShellMessages,
  LOCALE_PACK_VERSION,
  loadLocaleDomain,
  normalizeLanguage
} from "./locales/locale-runtime.js?v=2026-07-21-player-club-context-1-historical-best-xi-depth-1";
import { getPlayerSkillCategory } from "./locales/player-note-templates.js?v=2026-07-21-best-xi-rebuild-3";
import {
  HISTORICAL_AWARD_CONTEXT_PLAYER_LABELS,
  HISTORICAL_AWARD_CONTEXT_PLAYERS,
  HISTORICAL_HIGHLIGHTS,
  HISTORICAL_NEXT_WORLD_CUP_PREVIEWS,
  HISTORICAL_STORY_PROFILE_OVERRIDES
} from "./data/highlights-history.js?v=2026-07-21-historical-award-description-player-cards-3-historical-coach-cards-1-historical-story-style-notes-1";
import { CHAMPION_PHOTOS } from "./data/champion-photos.js?v=2026-07-21-all-team-photos-1";
import {
  buildHistoricalBestXiDescriptionParagraphs
} from "./historical-best-xi-copy.js?v=2026-07-21-historical-best-xi-depth-1";
import { getHistoricalTeamFlagMetadata } from "./team-flag-data.js?v=2026-07-21-shared-historical-flags-1";

const WORLD_CUP_EDITIONS = Object.freeze([
  1930, 1934, 1938, 1950, 1954, 1958, 1962, 1966, 1970, 1974, 1978,
  1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026
]);

const CURRENT_CHAMPION_EDITION = Object.freeze({
  champion: "Spain",
  flag: "🇪🇸"
});

const HISTORICAL_PLAYER_DISPLAY_NAME_OVERRIDES = Object.freeze({
  "1998|Alan Shearer": Object.freeze({
    zh: "阿兰·希勒"
  }),
  "1998|Didier Deschamps": Object.freeze({
    zh: "迪迪埃·德尚"
  }),
  "1978|Oscar": Object.freeze({
    en: "Oscar Bernardi",
    es: "Óscar Bernardi",
    ko: "오스카르 베르나르지",
    zh: "奥斯卡·贝尔纳迪"
  })
});

const HISTORICAL_FAIR_PLAY_CAPTAIN_PROFILE_NAMES = Object.freeze({
  1970: Object.freeze(["Héctor Chumpitaz"]),
  1974: Object.freeze(["Franz Beckenbauer"]),
  1978: Object.freeze(["Daniel Passarella"]),
  1982: Object.freeze(["Sócrates"]),
  1986: Object.freeze(["Edinho"]),
  1990: Object.freeze(["Bryan Robson", "Peter Shilton", "Terry Butcher"]),
  1994: Object.freeze(["Raí", "Dunga"]),
  1998: Object.freeze(["Alan Shearer", "Didier Deschamps"]),
  2002: Object.freeze(["Marc Wilmots"]),
  2006: Object.freeze(["Cafu", "Iker Casillas", "Raúl"]),
  2010: Object.freeze(["Iker Casillas"]),
  2014: Object.freeze(["Mario Yepes"]),
  2018: Object.freeze(["Sergio Ramos"]),
  2022: Object.freeze(["Harry Kane"])
});

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

const CHAMPION_PHOTO_CREDIT_LABELS = Object.freeze({
  en: "Photo",
  es: "Foto",
  ko: "사진",
  zh: "照片"
});

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
  LM: "positionLeftMidfielder",
  LW: "positionLeftWinger",
  SS: "positionSecondStriker",
  F9: "positionFalseNine",
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

const COACH_STYLE_TRANSLATIONS = Object.freeze({
  "Attacking freedom": Object.freeze({ es: "Libertad ofensiva", ko: "공격 자유도", zh: "进攻自由" }),
  "Back-three structure": Object.freeze({ es: "Estructura de tres centrales", ko: "백3 구조", zh: "三中卫结构" }),
  "Bold substitutions": Object.freeze({ es: "Cambios valientes", ko: "과감한 교체", zh: "大胆换人" }),
  "Compact defending": Object.freeze({ es: "Defensa compacta", ko: "압축 수비", zh: "紧凑防守" }),
  "Coordinated pressing": Object.freeze({ es: "Presión coordinada", ko: "조직적 압박", zh: "协同压迫" }),
  "Counter-attack": Object.freeze({ es: "Contraataque", ko: "역습", zh: "反击" }),
  "Defensive organization": Object.freeze({ es: "Organización defensiva", ko: "수비 조직", zh: "防守组织" }),
  "Game management": Object.freeze({ es: "Gestión del partido", ko: "경기 운영", zh: "比赛管理" }),
  "Midfield control": Object.freeze({ es: "Control del mediocampo", ko: "중원 장악", zh: "中场控制" }),
  "Positional rotation": Object.freeze({ es: "Rotación posicional", ko: "포지션 로테이션", zh: "位置轮换" }),
  "Possession control": Object.freeze({ es: "Control de la posesión", ko: "점유 운영", zh: "控球控制" }),
  "Set-piece focus": Object.freeze({ es: "Balón parado", ko: "세트피스 집중", zh: "定位球重点" }),
  "Squad rotation": Object.freeze({ es: "Rotación de plantilla", ko: "선수단 로테이션", zh: "阵容轮换" }),
  "Tactical flexibility": Object.freeze({ es: "Flexibilidad táctica", ko: "전술 유연성", zh: "战术灵活性" }),
  "Transition control": Object.freeze({ es: "Control de transiciones", ko: "전환 통제", zh: "转换控制" }),
  "Wing play": Object.freeze({ es: "Juego por bandas", ko: "측면 플레이", zh: "边路进攻" }),
  "Youth pipeline": Object.freeze({ es: "Cantera", ko: "유소년 육성", zh: "青年梯队" })
});

const ZH_PLAYER_SKILL_CATEGORIES = Object.freeze({
  "archive-standout": "经典赛事亮点",
  "attacking-play": "进攻能力",
  "attacking-runs": "进攻跑位",
  "defensive-control": "防守控制",
  "defensive-play": "防守能力",
  "defensive-positioning": "防守站位",
  "goal-threat": "进球威胁",
  "historical-lens": "历史评估",
  "impact-sub": "替补影响力",
  "midfield-play": "中场组织",
  "penalty-pressure": "点球大战抗压",
  "physical-duels": "身体对抗",
  "player-role": "球员角色",
  "player-strength": "核心特点",
  "shot-stopping": "扑救",
  starter: "首发",
  "tempo-control": "节奏控制",
  "wide-play": "边路能力"
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

const EDITION_PICKER_LABELS = Object.freeze({
  en: "Choose World Cup year",
  es: "Elegir año del Mundial",
  ko: "월드컵 연도 선택",
  zh: "选择世界杯年份"
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
    bestXiInfo: "管理员精选",
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
    moreHighlights: "值得记住的故事",
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
    positionLeftMidfielder: "左前卫",
    positionLeftWinger: "左边锋",
    positionRightBack: "右后卫",
    positionRightCentralMidfielder: "右中前卫",
    positionRightWinger: "右边锋",
    positionSecondStriker: "影锋",
    positionFalseNine: "伪九号",
    positionStriker: "中锋",
    playerAge: "{age}岁",
    playerEstimatedValue: "估值",
    playerEstimatedValueTooltip: "估算市场价值，参考公开估值、年龄、俱乐部层级、角色和近期表现。",
    playerPrime: "巅峰",
    playerPrimeTooltip: "来自Transfermarkt数据集的球员生涯峰值市场价值。",
    playerValue: "身价",
    playerValueTooltip: "来自公开球员估值数据的市场价值。",
    playerTournamentValueTooltip: "该届世界杯开赛前最近一次有来源记录的市场价值。",
    rankAria: "{label}。{tooltip}",
    eloRankLabel: "{teamName} 回溯Elo排名 {rank}（{year}）",
    eloRankTooltip: "{year}年世界杯期间的回溯Elo排名",
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
    timelineDrawBody: "最终抽签将确定赛事小组。",
    timelineDrawDate: "日期待定",
    timelineDrawTitle: "小组抽签",
    timelineHostsBody: "摩洛哥、葡萄牙和西班牙将主办主要赛事；阿根廷、巴拉圭和乌拉圭将承办百年纪念赛。六队均自动晋级。",
    timelineHostsDate: "2023年10月4日",
    timelineHostsTitle: "六支球队已锁定席位",
    timelineStartBody: "百年纪念届世界杯将在南美洲拉开帷幕。",
    timelineStartDate: "2030年6月13日",
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

function getChampionIllustrationFlagMarkup(editorialEdition) {
  const metadata = getHistoricalTeamFlagMetadata(editorialEdition?.champion);
  const className = ["champion-illustration-flag", metadata.flagClass].filter(Boolean).join(" ");
  const content = metadata.flagClass ? "" : metadata.flag || editorialEdition?.flag || "🌍";
  return `<span class="${escapeHtml(className)}" id="champion-flag">${escapeHtml(content)}</span>`;
}

function getChampionIllustrationMarkup(editorialEdition) {
  return `
    <span class="champion-illustration-orbit champion-illustration-orbit-one"></span>
    <span class="champion-illustration-orbit champion-illustration-orbit-two"></span>
    ${getChampionIllustrationFlagMarkup(editorialEdition)}
    <img class="champion-illustration-trophy doodle" src="assets/award-doodles/trophy.svg" alt="" />
    <span class="champion-illustration-star champion-illustration-star-one">✦</span>
    <span class="champion-illustration-star champion-illustration-star-two">✦</span>
  `;
}

function renderChampionPhoto(editorialEdition) {
  const frame = getElement("champion-photo");
  const photo = CHAMPION_PHOTOS[activeEdition];
  if (!frame || !photo || photo.champion !== editorialEdition?.champion) {
    return;
  }

  const alt = photo.alt[currentLanguage] || photo.alt.en;
  const creditLabel = CHAMPION_PHOTO_CREDIT_LABELS[currentLanguage]
    || CHAMPION_PHOTO_CREDIT_LABELS.en;
  frame.classList.remove("champion-illustration");
  frame.classList.add("has-champion-photo");
  frame.removeAttribute("aria-hidden");
  frame.style.setProperty("--champion-photo-position", photo.focalPoint);
  frame.innerHTML = `
    <picture class="champion-photo-picture">
      <source srcset="${escapeHtml(photo.avif)}" type="image/avif" />
      <img
        class="champion-photo-image"
        src="${escapeHtml(photo.jpg)}"
        alt="${escapeHtml(alt)}"
        width="1600"
        height="1000"
        decoding="async"
        fetchpriority="high"
      />
    </picture>
    <figcaption class="champion-photo-credit">
      ${escapeHtml(creditLabel)}:
      <a href="${escapeHtml(photo.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(photo.author)}</a>
      <span aria-hidden="true">·</span>
      <a href="${escapeHtml(photo.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(photo.license)}</a>
    </figcaption>
  `;

  frame.querySelector(".champion-photo-image")?.addEventListener("error", () => {
    frame.classList.remove("has-champion-photo");
    frame.classList.add("champion-illustration");
    frame.setAttribute("aria-hidden", "true");
    frame.style.removeProperty("--champion-photo-position");
    frame.innerHTML = getChampionIllustrationMarkup(editorialEdition);
  }, { once: true });
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
    bestXiInfo: "Selected by admin",
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
    positionLeftMidfielder: "Left midfielder",
    positionLeftWinger: "Left winger",
    positionRightBack: "Right-back",
    positionRightCentralMidfielder: "Right central midfielder",
    positionRightWinger: "Right winger",
    positionSecondStriker: "Second striker",
    positionFalseNine: "False nine",
    positionStriker: "Striker",
    playerAge: "Age {age}",
    playerEstimatedValue: "Est. value",
    playerEstimatedValueTooltip: "Estimated market value, shaped by public valuations, age, club level, role, and recent form.",
    playerPrime: "Prime",
    playerPrimeTooltip: "Career-high market value from the Transfermarkt dataset.",
    playerValue: "Value",
    playerValueTooltip: "Market value from sourced player valuation data.",
    playerTournamentValueTooltip: "Last sourced market value recorded before this World Cup began.",
    rankAria: "{label}. {tooltip}",
    eloRankLabel: "{teamName} retrospective Elo ranking {rank} ({year})",
    eloRankTooltip: "Retrospective Elo ranking during the {year} World Cup",
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
let loadedTournamentStatsByKey = new Map();
let loadedRankingYear = null;
let loadedHistory = null;
let loadedHistoricalAwards = null;
let loadedHistoricalAwardCopy = null;
let loadedHistoricalStoryCopy = null;
let loadedHistoricalBestXiReasons = Object.freeze({});
let loadedHistoricalPlayerNames = Object.freeze({});
let loadedHistoricalPlayerNamesByNormalizedName = new Map();
let loadedHistoricalPlayerNoteTranslations = Object.freeze({});
let activeEdition = 2026;
let activeHighlightRankPill = null;
let activeHighlightPlayerHover = null;
let activeBestXiPlayer = null;
let highlightPlayerCardHideTimer = 0;
let bestXiCardHideTimer = 0;

const CELEBRATION_THEME_COLOR_MIX = Object.freeze({
  light: Object.freeze({ colorProperty: "--celebration-primary", amount: 0.2 }),
  dark: Object.freeze({ colorProperty: "--celebration-dark-base", amount: 0.46 })
});

function parseCssColor(value) {
  const normalized = String(value || "").trim();
  const hexMatch = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1].length === 3
      ? hexMatch[1].split("").map((character) => `${character}${character}`).join("")
      : hexMatch[1];
    return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  }

  const rgbMatch = normalized.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/i
  );
  return rgbMatch ? rgbMatch.slice(1, 4).map(Number) : null;
}

function mixCssColors(foreground, background, amount) {
  return foreground.map((channel, index) =>
    Math.round(background[index] + (channel - background[index]) * amount)
  );
}

function formatHexColor(channels) {
  return `#${channels
    .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function updateCelebrationThemeColor(theme = window.worldCupTheme?.getTheme() || "light") {
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const mix = CELEBRATION_THEME_COLOR_MIX[theme] || CELEBRATION_THEME_COLOR_MIX.light;
  if (!themeColor || !document.body) return;

  const bodyStyle = window.getComputedStyle(document.body);
  const celebrationColor = parseCssColor(bodyStyle.getPropertyValue(mix.colorProperty));
  const pageColor = parseCssColor(bodyStyle.getPropertyValue("--background"));
  if (!celebrationColor || !pageColor) return;

  themeColor.setAttribute(
    "content",
    formatHexColor(mixCssColors(celebrationColor, pageColor, mix.amount))
  );
}

function updateCelebrationPalette() {
  const champion = activeEdition === 2026
    ? CURRENT_CHAMPION_EDITION.champion
    : HISTORICAL_HIGHLIGHTS.editions[activeEdition]?.champion;
  if (!champion) return;

  document.body.dataset.finalCelebrationPalette = champion === "West Germany"
    ? "germany"
    : champion.toLowerCase();
  updateCelebrationThemeColor();
}

function resolveInitialLanguage() {
  const params = new URLSearchParams(window.location.search);
  return normalizeLanguage(
    params.get("lang") || localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en"
  );
}

function resolveInitialEdition() {
  const requestedYear = Number(new URLSearchParams(window.location.search).get("year"));
  return WORLD_CUP_EDITIONS.includes(requestedYear) ? requestedYear : 2026;
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

async function loadHistoricalBestXiReasonLocale(language) {
  if (activeEdition === 2026 || language === "en") {
    return Object.freeze({});
  }
  const localeData = await loadJson(
    `data/locales/${language}/historical-best-xi-reasons.json?v=2026-07-21-best-xi-rebuild-3`
  );
  if (
    localeData?.schemaVersion !== 1
    || localeData?.language !== language
    || !localeData?.reasons
    || typeof localeData.reasons !== "object"
  ) {
    throw new TypeError(`Invalid historical Best XI reason locale ${language}.`);
  }
  return localeData.reasons;
}

const HISTORICAL_PLAYER_NAME_LOADERS = Object.freeze({
  es: () => Promise.all([
    import("./locales/es/player-names.js?v=2026-07-21-best-xi-rebuild-3"),
    import("./locales/es/player-names-archive.js?v=2026-07-21-best-xi-rebuild-3")
  ]).then(([currentNames, archiveNames]) => Object.freeze({
    ...(currentNames.ES_PLAYER_NAME_TRANSLATIONS || {}),
    ...(archiveNames.ES_ARCHIVE_PLAYER_NAME_TRANSLATIONS || {})
  })),
  ko: () => Promise.all([
    import("./locales/ko/player-names.js?v=2026-07-21-best-xi-rebuild-3"),
    import("./locales/ko/player-names-archive.js?v=2026-07-21-best-xi-rebuild-3")
  ]).then(([currentNames, archiveNames]) => Object.freeze({
    ...(currentNames.KO_PLAYER_NAME_TRANSLATIONS || {}),
    ...(archiveNames.KO_ARCHIVE_PLAYER_NAME_TRANSLATIONS || {})
  }))
});

const HISTORICAL_PLAYER_NOTE_LOADERS = Object.freeze({
  es: () => import(`./locales/es/content-archive.js?v=${LOCALE_PACK_VERSION}`),
  ko: () => import(`./locales/ko/content-archive.js?v=${LOCALE_PACK_VERSION}`)
});

async function loadHistoricalPlayerNameLocale(language) {
  if (activeEdition === 2026 || !HISTORICAL_PLAYER_NAME_LOADERS[language]) {
    return Object.freeze({});
  }
  return HISTORICAL_PLAYER_NAME_LOADERS[language]();
}

async function loadHistoricalPlayerNoteLocale(language) {
  if (activeEdition === 2026 || !HISTORICAL_PLAYER_NOTE_LOADERS[language]) {
    return Object.freeze({});
  }
  const localeModule = await HISTORICAL_PLAYER_NOTE_LOADERS[language]();
  const metadata = localeModule?.CONTENT_METADATA;
  const translations = localeModule?.CONTENT_TRANSLATIONS;
  if (
    metadata?.schemaVersion !== 1 ||
    metadata?.language !== language ||
    metadata?.scope !== "archive" ||
    !translations ||
    typeof translations !== "object" ||
    Array.isArray(translations)
  ) {
    throw new TypeError(`Invalid historical player-note locale ${language}.`);
  }
  return translations;
}

async function loadHistoricalAwardCopyLocale(language) {
  if (activeEdition === 2026) {
    return null;
  }
  const localeData = await loadJson(
    language === "en"
      ? "data/historical-awards.json"
      : `data/locales/${language}/historical-awards.json`
  );
  if (
    localeData?.schemaVersion !== 1
    || localeData?.language !== language
    || localeData?.domain !== "historical-awards"
    || !localeData?.labels
    || !localeData?.editions
  ) {
    throw new TypeError(`Invalid historical awards locale ${language}.`);
  }
  return localeData;
}

async function loadHistoricalStoryCopyLocale(language) {
  if (activeEdition === 2026) {
    return null;
  }
  const localeData = await loadJson(
    language === "en"
      ? "data/historical-stories.json"
      : `data/locales/${language}/historical-stories.json`
  );
  if (
    localeData?.schemaVersion !== 1
    || localeData?.language !== language
    || localeData?.domain !== "historical-stories"
    || !localeData?.editions
  ) {
    throw new TypeError(`Invalid historical stories locale ${language}.`);
  }
  return localeData;
}

function formatMessage(template, values = {}) {
  return String(template || "").replace(/\{([a-zA-Z0-9]+)\}/g, (_, key) =>
    values[key] === undefined ? `{${key}}` : String(values[key])
  );
}

const SPANISH_FEMININE_CHAMPION_TEAMS = new Set([
  "Argentina",
  "England",
  "France",
  "Germany",
  "Italy",
  "Spain",
  "West Germany"
]);

function localizeEntity(group, value) {
  return activeLocale?.entities?.[group]?.[value]
    || (group === "teams" ? activeAppLocalePack?.entities?.teamNames?.[value] : "")
    || (group === "teams" && currentLanguage === "zh" ? ZH_PREVIEW_TEAM_NAMES[value] : "")
    || "";
}

function getBestXiEditionTitle() {
  if (activeEdition === 2026) {
    return activeLocale.text.bestXiTitle || "Best XI of 2026";
  }
  return ({
    en: `Best XI of ${activeEdition}`,
    es: `Mejor XI de ${activeEdition}`,
    ko: `${activeEdition}년 베스트 11`,
    zh: `${activeEdition}年最佳阵容`
  })[currentLanguage] || `Best XI of ${activeEdition}`;
}

function updateMetadata() {
  if (activeEdition !== 2026) {
    const historicalEdition = HISTORICAL_HIGHLIGHTS.editions[activeEdition];
    const title = `${activeEdition} World Cup awards and highlights | World Cup Simplified`;
    const description = `${historicalEdition.champion}'s ${activeEdition} title, our researched editorial Best XI, the official awards, and three tournament stories worth remembering.`;
    document.title = title;
    getElement("meta-description")?.setAttribute("content", description);
    getElement("og-title")?.setAttribute("content", `${activeEdition} World Cup awards and highlights`);
    getElement("og-description")?.setAttribute("content", description);
    getElement("twitter-title")?.setAttribute("content", `${activeEdition} World Cup awards and highlights`);
    getElement("twitter-description")?.setAttribute("content", description);
    return;
  }
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
  const editionPickerButton = getElement("edition-picker-button");
  const editionPickerPopover = getElement("edition-picker-popover");
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

  const editionPickerLabel = EDITION_PICKER_LABELS[currentLanguage] || EDITION_PICKER_LABELS.en;
  editionPickerButton?.setAttribute("aria-label", `${editionPickerLabel}, ${activeEdition}`);
  editionPickerButton?.setAttribute("title", editionPickerLabel);
  editionPickerButton?.setAttribute("data-edition", String(activeEdition));
  editionPickerPopover?.setAttribute("aria-label", editionPickerLabel);

  if (languageSelect) {
    languageSelect.value = currentLanguage;
  }
  renderEditionPicker();
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
  if (activeEdition === 2026) {
    renderChampionPhoto(CURRENT_CHAMPION_EDITION);
  }
  renderHistoricalEdition();
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
  const [
    locale,
    appLocalePack,
    historicalBestXiReasons,
    historicalAwardCopy,
    historicalStoryCopy,
    historicalPlayerNames,
    historicalPlayerNoteTranslations
  ] = await Promise.all([
    loadHighlightsLocale(nextLanguage),
    ["es", "ko"].includes(nextLanguage)
      ? loadLocaleDomain(nextLanguage, "app")
      : Promise.resolve(null),
    loadHistoricalBestXiReasonLocale(nextLanguage),
    loadHistoricalAwardCopyLocale(nextLanguage),
    loadHistoricalStoryCopyLocale(nextLanguage),
    loadHistoricalPlayerNameLocale(nextLanguage),
    loadHistoricalPlayerNoteLocale(nextLanguage)
  ]);
  currentLanguage = nextLanguage;
  activeLocale = validateHighlightsLocale(locale, nextLanguage);
  activeAppLocalePack = appLocalePack;
  loadedHistoricalBestXiReasons = historicalBestXiReasons;
  loadedHistoricalAwardCopy = historicalAwardCopy;
  loadedHistoricalStoryCopy = historicalStoryCopy;
  loadedHistoricalPlayerNames = historicalPlayerNames;
  loadedHistoricalPlayerNoteTranslations = historicalPlayerNoteTranslations;
  loadedHistoricalPlayerNamesByNormalizedName = new Map(
    Object.entries(historicalPlayerNames).map(([name, localizedName]) => [
      normalizeHistoricalName(name),
      localizedName
    ])
  );
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

function getEditionHref(year) {
  const url = new URL(window.location.href);
  if (year === 2026) {
    url.searchParams.delete("year");
  } else {
    url.searchParams.set("year", String(year));
  }
  if (currentLanguage === "en") {
    url.searchParams.delete("lang");
  } else {
    url.searchParams.set("lang", currentLanguage);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function renderEditionPicker() {
  const grid = getElement("edition-picker-grid");
  if (!grid) {
    return;
  }

  grid.replaceChildren(...WORLD_CUP_EDITIONS
    .slice()
    .reverse()
    .map((year) => {
      const link = document.createElement("a");
      const isSelected = year === activeEdition;
      const isCurrent = year === 2026;
      link.className = [
        "standings-year-option",
        isSelected ? "is-selected" : "",
        isCurrent ? "is-current" : ""
      ]
        .filter(Boolean)
        .join(" ");
      link.dataset.edition = String(year);
      link.href = getEditionHref(year);
      link.textContent = String(year);
      if (isSelected) {
        link.setAttribute("aria-current", "page");
      }
      return link;
    }));
}

function setEditionPickerOpen(isOpen) {
  const button = getElement("edition-picker-button");
  const popover = getElement("edition-picker-popover");
  if (!button || !popover) {
    return;
  }
  if (isOpen) {
    setSettingsOpen(false);
  }
  popover.classList.toggle("is-hidden", !isOpen);
  button.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) {
    renderEditionPicker();
  }
}

function setupEditionPicker() {
  const button = getElement("edition-picker-button");
  const popover = getElement("edition-picker-popover");
  if (!button || !popover) {
    return;
  }

  renderEditionPicker();
  button.addEventListener("click", () => {
    setEditionPickerOpen(button.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("click", (event) => {
    if (
      button.getAttribute("aria-expanded") === "true"
      && !popover.contains(event.target)
      && !button.contains(event.target)
    ) {
      setEditionPickerOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
      setEditionPickerOpen(false);
      button.focus();
    }
  });
}

function setSettingsOpen(isOpen) {
  const button = getElement("settings-button");
  const popover = getElement("settings-popover");
  if (!button || !popover) {
    return;
  }
  if (isOpen) {
    setEditionPickerOpen(false);
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
    updateCelebrationThemeColor(theme);
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

function normalizeHistoricalName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function getHistoricalProfile(profileData, playerName, year) {
  const target = normalizeHistoricalName(playerName);
  return Object.values(profileData?.profiles || {}).find((profile) =>
    Number(profile?.tournamentYear) === Number(year) && [
      profile?.name,
      profile?.displayName,
      profile?.fullName,
      profile?.imagePageTitle,
      ...(Array.isArray(profile?.aliases) ? profile.aliases : [])
    ].some((candidate) => normalizeHistoricalName(candidate) === target)
  ) || null;
}

function getHistoricalLocalizedPlayerName(playerName) {
  return loadedHistoricalPlayerNames[playerName]
    || loadedHistoricalPlayerNamesByNormalizedName.get(normalizeHistoricalName(playerName))
    || "";
}

function getHistoricalSlotCoordinates(rows) {
  const yStops = rows.length === 5 ? [91, 73, 55, 36, 18] : [91, 69, 45, 22];
  return rows.flatMap((row, rowIndex) => {
    const xStops = row.length === 1
      ? [50]
      : row.length === 2
        ? [66, 34]
        : row.length === 3
          ? [82, 50, 18]
          : row.length === 4
            ? [89, 63, 37, 11]
            : [93, 71.5, 50, 28.5, 7];
    return row.map((entry, entryIndex) => ({
      entry,
      x: xStops[entryIndex],
      y: yStops[rowIndex]
    }));
  });
}

function buildHistoricalBestXi(editorialEdition, profileData) {
  const usedSlotIds = new Map();
  const toPlayer = (entry, isHonourable = false) => {
    const profile = getHistoricalProfile(profileData, entry.playerName, activeEdition);
    const facts = [];
    if (Number(profile?.goals) > 0) {
      facts.push({ type: "goals", value: Number(profile.goals) });
    }
    if (entry.teamName === editorialEdition.champion) {
      facts.push({ type: "champion" });
    }
    return {
      playerName: entry.playerName,
      teamId: entry.teamName,
      position: entry.position,
      facts,
      reason: entry.reason || (isHonourable ? { en: profile?.styleNote || profile?.note || "" } : { en: "" })
    };
  };
  const slots = getHistoricalSlotCoordinates(editorialEdition.rows).map(({ entry, x, y }) => {
    const baseId = String(entry.position || "slot").toLowerCase();
    const count = (usedSlotIds.get(baseId) || 0) + 1;
    usedSlotIds.set(baseId, count);
    return {
      id: `${baseId}-${count}`,
      x,
      y,
      starter: toPlayer(entry),
      honourables: (entry.honourables || []).map((candidate) => toPlayer(candidate, true))
    };
  });
  return {
    schemaVersion: 1,
    edition: activeEdition,
    selection: {
      status: "complete",
      selectionType: "editorial",
      official: false,
      formation: editorialEdition.formation,
      methodology: HISTORICAL_HIGHLIGHTS.methodology,
      sources: HISTORICAL_HIGHLIGHTS.sources,
      coach: {
        ...editorialEdition.coach,
        teamId: editorialEdition.coach.teamName
      },
      slots
    }
  };
}

function buildHistoricalTeams(editorialEdition, awardsEdition, rankingSnapshot = null) {
  const names = new Set([
    ...Object.keys(rankingSnapshot?.teams || {}),
    editorialEdition.champion,
    editorialEdition.coach.teamName,
    ...editorialEdition.rows.flatMap((row) => row.flatMap((entry) => [
      entry.teamName,
      ...(entry.honourables || []).map((candidate) => candidate.teamName)
    ])),
    ...Object.values(awardsEdition || {}).flatMap((award) =>
      (award?.recipients || []).map((recipient) => recipient.teamName)
    )
  ]);
  return Object.fromEntries([...names].filter(Boolean).map((name) => {
    const rank = Number(rankingSnapshot?.teams?.[name]);
    const hasRank = Number.isInteger(rank) && rank > 0;
    const flagMetadata = getHistoricalTeamFlagMetadata(name);
    return [name, {
      id: name,
      name,
      flag: flagMetadata.flag || "🌍",
      flagClass: flagMetadata.flagClass,
      fifaRank: hasRank ? rank : null,
      fifaRankingDate: hasRank ? rankingSnapshot.rankingDate || null : null,
      fifaRankingYear: hasRank ? activeEdition : null,
      rankingSystem: hasRank ? rankingSnapshot.rankingSystem || "fifa" : null
    }];
  }));
}

function getHistoricalStoryPlayerNames() {
  const stories = loadedHistoricalStoryCopy?.editions?.[String(activeEdition)] || [];
  const names = new Set();
  for (const story of stories) {
    for (const value of [story?.title, story?.body]) {
      for (const match of String(value || "").matchAll(/\{player:([^|{}]+)\|[^{}]+\}/gu)) {
        names.add(match[1].trim());
      }
    }
  }
  return [...names];
}

function getHistoricalAwardContextPlayerReferences(awardKey) {
  const key = `${activeEdition}|${awardKey}`;
  const references = HISTORICAL_AWARD_CONTEXT_PLAYERS[key] || [];
  const localizedLabels = HISTORICAL_AWARD_CONTEXT_PLAYER_LABELS[currentLanguage]?.[key] || [];
  return references.map((reference, index) => ({
    ...(typeof reference === "string" ? { playerName: reference } : reference),
    triggerText: localizedLabels[index] || ""
  }));
}

function getHistoricalStoryProfile(profileData, playerName) {
  const directProfile = getHistoricalProfile(profileData, playerName, activeEdition);
  if (directProfile) {
    return { ...directProfile };
  }

  const override = HISTORICAL_STORY_PROFILE_OVERRIDES[`${activeEdition}|${playerName}`];
  if (!override) {
    return null;
  }
  const { profileYear, ...overrideFields } = override;
  const sourceProfile = profileYear
    ? getHistoricalProfile(profileData, playerName, profileYear)
    : null;
  return {
    ...(sourceProfile || {}),
    ...overrideFields,
    name: overrideFields.name || sourceProfile?.name || playerName,
    displayName: overrideFields.displayName || sourceProfile?.displayName || playerName
  };
}

function buildHistoricalProfiles(editorialEdition, profileData, awardsEdition) {
  const profiles = Object.fromEntries(
    Object.values(profileData?.profiles || {})
      .filter((profile) => Number(profile?.tournamentYear) === Number(activeEdition))
      .map((profile) => [profile.name, {
        ...profile,
        teamId: profile.teamName,
        teamName: profile.teamName
      }])
  );
  const selectedPlayers = editorialEdition.rows.flatMap((row) => row.flatMap((entry) => [
    entry,
    ...(entry.honourables || [])
  ]));
  const awardPlayers = Object.values(awardsEdition || {}).flatMap((award) =>
    (award?.recipients || [])
      .filter((recipient) => recipient.playerName)
      .map((recipient) => ({
        playerName: recipient.playerName,
        teamName: recipient.teamName,
        position: ""
      }))
  );
  for (const entry of [...selectedPlayers, ...awardPlayers]) {
    const sourced = getHistoricalProfile(profileData, entry.playerName, activeEdition);
    const profile = sourced
      ? { ...sourced }
      : {
          name: entry.playerName,
          displayName: entry.playerName,
          position: entry.position,
          club: "",
          skills: ["Tournament role", "Historical selection"],
          note: `${entry.teamName}'s ${activeEdition} World Cup ${String(entry.position || "player").toLowerCase()}.`
        };
    profile.teamId = entry.teamName;
    profile.teamName = entry.teamName;
    profiles[entry.playerName] = profile;
  }
  for (const playerName of HISTORICAL_FAIR_PLAY_CAPTAIN_PROFILE_NAMES[activeEdition] || []) {
    if (profiles[playerName]) {
      continue;
    }
    const sourced = getHistoricalProfile(profileData, playerName, activeEdition);
    if (!sourced) {
      continue;
    }
    profiles[playerName] = {
      ...sourced,
      teamId: sourced.teamName
    };
  }
  for (const playerName of getHistoricalStoryPlayerNames()) {
    const profile = getHistoricalStoryProfile(profileData, playerName);
    if (!profile) {
      continue;
    }
    profile.teamId = profile.teamName;
    profiles[playerName] = profile;
  }
  for (const awardKey of Object.keys(awardsEdition || {})) {
    for (const reference of getHistoricalAwardContextPlayerReferences(awardKey)) {
      const playerName = typeof reference === "string" ? reference : reference?.playerName;
      const profileYear = Number(typeof reference === "string" ? activeEdition : reference?.profileYear || activeEdition);
      if (!playerName || profiles[playerName]) {
        continue;
      }
      const sourced = getHistoricalProfile(profileData, playerName, profileYear);
      if (!sourced) {
        continue;
      }
      profiles[playerName] = {
        ...sourced,
        teamId: sourced.teamName
      };
    }
  }
  return profiles;
}

function getHistoricalEditionAwardData() {
  return loadedHistoricalAwards?.editions?.[String(activeEdition)] || {};
}

function getHistoricalEditionAwardCopy() {
  return loadedHistoricalAwardCopy?.editions?.[String(activeEdition)] || {};
}

function getHistoricalAwardLabelKey(awardKey, award) {
  if (awardKey === "goldenBoot") {
    if (activeEdition < 1982) {
      return (award?.recipients || []).length > 1 ? "jointLeadingScorers" : "leadingScorer";
    }
    return activeEdition < 2010 ? "goldenShoe" : "goldenBoot";
  }
  if (awardKey === "goldenGlove") {
    return activeEdition < 2010 ? "yashinAward" : "goldenGlove";
  }
  return awardKey;
}

function localizeHistoricalAwardTeam(teamName) {
  if (currentLanguage === "zh") {
    return ZH_PREVIEW_TEAM_NAMES[teamName] || localizeEntity("teams", teamName) || teamName;
  }
  return localizeEntity("teams", teamName) || teamName;
}

function formatHistoricalAwardList(values) {
  return new Intl.ListFormat(PREVIEW_DATE_LOCALES[currentLanguage] || PREVIEW_DATE_LOCALES.en, {
    style: "long",
    type: "conjunction"
  }).format(values);
}

function replaceWithHistoricalList(element, values, renderValue) {
  if (!element) {
    return;
  }
  const parts = new Intl.ListFormat(PREVIEW_DATE_LOCALES[currentLanguage] || PREVIEW_DATE_LOCALES.en, {
    style: "long",
    type: "conjunction"
  }).formatToParts(values);
  let valueIndex = 0;
  element.replaceChildren();
  for (const part of parts) {
    if (part.type !== "element") {
      element.append(document.createTextNode(part.value));
      continue;
    }
    element.append(renderValue(valueIndex, part.value));
    valueIndex += 1;
  }
}

function createHistoricalTeamFlag(teamName, { labelled = false } = {}) {
  const metadata = getHistoricalTeamFlagMetadata(teamName);
  const flag = document.createElement("span");
  flag.className = ["flag", metadata.flagClass].filter(Boolean).join(" ");
  flag.textContent = metadata.flagClass ? "" : metadata.flag || "🌍";
  if (labelled) {
    const localizedName = localizeHistoricalAwardTeam(teamName);
    flag.setAttribute("role", "img");
    flag.setAttribute(
      "aria-label",
      activeAppLocalePack?.helpers?.formatAppMessage?.("flag-label", { teamName: localizedName })
        || `${localizedName} flag`
    );
  } else {
    flag.setAttribute("aria-hidden", "true");
  }
  return flag;
}

function renderHistoricalAwardTeamList(element, teamNames) {
  const localizedNames = teamNames.map(localizeHistoricalAwardTeam);
  replaceWithHistoricalList(element, localizedNames, (index, visibleName) => {
    const team = document.createElement("span");
    team.className = "award-meta-team";
    team.append(createHistoricalTeamFlag(teamNames[index]), document.createTextNode(` ${visibleName}`));
    return team;
  });
}

function renderHistoricalAwardPlayerList(elementId, recipients, displayNames) {
  const element = getElement(elementId);
  replaceWithHistoricalList(element, displayNames, (index, visibleName) =>
    createHighlightPlayerMention(recipients[index]?.playerName, visibleName)
      || document.createTextNode(visibleName)
  );
}

function renderHistoricalFairPlayFlags(teamNames) {
  const container = getElement("fair-play-flag");
  if (!container) {
    return;
  }
  container.replaceChildren(...teamNames.map((teamName) => createHistoricalTeamFlag(teamName)));
}

function normalizeHistoricalAwardMatchText(value) {
  return String(value || "").replace(/[’‘]/gu, "'").toLocaleLowerCase();
}

function getHistoricalAwardPlayerTextVariants(playerName, triggerText = "") {
  const explicitTriggerText = String(triggerText || "").trim();
  const profile = loadedProfiles?.[playerName];
  const variants = new Set([
    playerName,
    profile?.name,
    profile?.displayName,
    getHighlightPlayerName(playerName, profile),
    getHistoricalLocalizedPlayerName(playerName),
    explicitTriggerText
  ].map((value) => String(value || "").trim()).filter(Boolean));

  for (const fullName of [...variants]) {
    const wordParts = fullName.split(/\s+/u).filter(Boolean);
    for (let index = 0; index < wordParts.length; index += 1) {
      variants.add(wordParts.slice(index).join(" "));
      if (wordParts[index].length >= 4) {
        variants.add(wordParts[index]);
      }
    }
    const middleDotParts = fullName.split(/[·・]/u).map((part) => part.trim()).filter(Boolean);
    for (const part of middleDotParts) {
      if (part.length >= 2) {
        variants.add(part);
      }
    }
  }

  return [...variants]
    .filter((variant) => variant.length >= 2 || variant === explicitTriggerText)
    .sort((left, right) => right.length - left.length);
}

function appendHistoricalAwardPlayerCopy(element, copy, references = []) {
  const normalizedCopy = normalizeHistoricalAwardMatchText(copy);
  const candidates = references.flatMap((reference) => {
    const playerName = typeof reference === "string" ? reference : reference?.playerName;
    const triggerText = typeof reference === "string" ? "" : reference?.triggerText;
    return getHistoricalAwardPlayerTextVariants(playerName, triggerText).map((variant) => ({
      sourceReference: reference,
      playerName,
      variant,
      index: normalizedCopy.indexOf(normalizeHistoricalAwardMatchText(variant))
    }));
  }).filter(({ playerName, index }) => playerName && index >= 0)
    .sort((left, right) => left.index - right.index || right.variant.length - left.variant.length);
  const candidate = candidates[0];
  if (!candidate) {
    appendFootballInlineText(element, copy);
    return;
  }

  appendFootballInlineText(element, copy.slice(0, candidate.index));
  const visibleText = copy.slice(candidate.index, candidate.index + candidate.variant.length);
  const mention = createHighlightPlayerMention(candidate.playerName, visibleText);
  element.append(mention || document.createTextNode(visibleText));
  appendHistoricalAwardPlayerCopy(
    element,
    copy.slice(candidate.index + candidate.variant.length),
    references.filter((reference) => reference !== candidate.sourceReference)
  );
}

function renderHistoricalAwardExplanation(elementId, copy, awardKey) {
  const explanation = getElement(elementId);
  if (!explanation || !copy) {
    return;
  }
  const strong = document.createElement("strong");
  const references = getHistoricalAwardContextPlayerReferences(awardKey);
  appendHistoricalAwardPlayerCopy(strong, copy.stat, references);
  explanation.replaceChildren(strong, document.createTextNode(" "));
  appendHistoricalAwardPlayerCopy(explanation, copy.context, references);
}

function renderHistoricalFairPlayExplanation(copy) {
  const explanation = getElement("fair-play-explanation");
  if (!explanation || !copy) {
    return;
  }
  const strong = document.createElement("strong");
  const references = getHistoricalAwardContextPlayerReferences("fairPlay");
  appendHistoricalAwardPlayerCopy(strong, copy.stat, references);
  explanation.replaceChildren();
  appendHistoricalAwardPlayerCopy(explanation, copy.context, references);
  explanation.append(document.createTextNode(" "), strong);
}

function setHistoricalAwardLabel(awardKey, label, meaning) {
  const row = document.querySelector(`[data-award-key="${awardKey}"]`);
  if (!row) {
    return;
  }
  const labelElement = row.querySelector(".award-label");
  const meaningElement = row.querySelector(".award-kind > span");
  if (labelElement) labelElement.textContent = label;
  if (meaningElement) meaningElement.textContent = meaning;
}

function renderHistoricalAwards() {
  if (activeEdition === 2026 || !loadedHistoricalAwards || !loadedHistoricalAwardCopy) {
    return;
  }
  const awards = getHistoricalEditionAwardData();
  const awardCopy = getHistoricalEditionAwardCopy();
  document.querySelectorAll("[data-award-key]").forEach((row) => {
    row.toggleAttribute("hidden", !awards[row.dataset.awardKey]);
  });

  Object.entries(awards).forEach(([awardKey, award]) => {
    const labelKey = getHistoricalAwardLabelKey(awardKey, award);
    const presentation = loadedHistoricalAwardCopy.labels?.[labelKey];
    if (presentation) {
      setHistoricalAwardLabel(awardKey, presentation.label, presentation.meaning);
    }
  });

  const playerAwards = {
    goldenBall: { nameId: "golden-ball-name", photoId: "golden-ball-photo", metaId: "golden-ball-meta", explanationId: "golden-ball-explanation" },
    goldenBoot: { nameId: "golden-boot-name", photoId: "golden-boot-photo", metaId: "golden-boot-meta", explanationId: "golden-boot-explanation" },
    goldenGlove: { nameId: "golden-glove-name", photoId: "golden-glove-photo", metaId: "golden-glove-meta", explanationId: "golden-glove-explanation" },
    youngPlayer: { nameId: "young-player-name", photoId: "young-player-photo", metaId: "young-player-meta", explanationId: "young-player-explanation" }
  };
  Object.entries(playerAwards).forEach(([awardKey, ids]) => {
    const award = awards[awardKey];
    if (!award) return;
    const recipients = award.recipients || [];
    const first = recipients[0] || {};
    const copy = awardCopy[awardKey];
    const displayNames = copy?.recipientNames?.length === recipients.length
      ? copy.recipientNames
      : recipients.map((recipient) => loadedProfiles?.[recipient.playerName]?.displayName || recipient.playerName);
    renderHistoricalAwardPlayerList(ids.nameId, recipients, displayNames);
    renderHistoricalAwardTeamList(
      getElement(ids.metaId),
      recipients.map((recipient) => recipient.teamName)
    );
    if (recipients.length > 1) {
      renderAwardPhoto(ids.photoId, displayNames.join(" "), null);
      const photo = getElement(ids.photoId);
      photo?.classList.add("is-multiple-recipients");
      const fallback = photo?.querySelector(".player-photo-fallback");
      if (fallback) fallback.textContent = `×${recipients.length}`;
    } else {
      getElement(ids.photoId)?.classList.remove("is-multiple-recipients");
      renderAwardPhoto(ids.photoId, displayNames[0], loadedProfiles?.[first.playerName]);
    }
    renderHistoricalAwardExplanation(ids.explanationId, copy, awardKey);
  });

  const fairPlay = awards.fairPlay;
  if (fairPlay) {
    const teams = (fairPlay.recipients || []).map((recipient) => recipient.teamName);
    const localizedTeams = teams.map(localizeHistoricalAwardTeam);
    renderHistoricalFairPlayFlags(teams);
    setText("fair-play-name", formatHistoricalAwardList(localizedTeams));
    const fairPlayMeta = getElement("fair-play-meta");
    fairPlayMeta?.removeAttribute("data-i18n");
    fairPlayMeta?.removeAttribute("data-highlight-player-mentions");
    fairPlayMeta?.classList.add("is-historical-captain-meta");
    fairPlayMeta?.replaceChildren();
    if (fairPlayMeta) {
      appendHighlightPlayerCopy(
        fairPlayMeta,
        awardCopy.fairPlay?.captainMeta || "",
        HISTORICAL_FAIR_PLAY_CAPTAIN_PROFILE_NAMES[activeEdition] || []
      );
    }
    renderHistoricalFairPlayExplanation(awardCopy.fairPlay);
  }
}

function appendHistoricalStoryCopy(element, template) {
  const copy = String(template || "");
  const tokenPattern = /\{(team|player):([^|{}]+)\|([^{}]+)\}/gu;
  let cursor = 0;
  for (const match of copy.matchAll(tokenPattern)) {
    appendFootballInlineText(element, copy.slice(cursor, match.index));
    const [, type, canonicalName, visibleText] = match;
    if (type === "team") {
      const pill = createHighlightRankPill(loadedTeams?.[canonicalName]);
      if (pill) {
        appendHighlightRankedTeamName(element, visibleText, pill);
      } else {
        element.append(document.createTextNode(visibleText));
      }
    } else {
      const mention = createHighlightPlayerMention(canonicalName, visibleText);
      element.append(mention || document.createTextNode(visibleText));
    }
    cursor = match.index + match[0].length;
  }
  appendFootballInlineText(element, copy.slice(cursor));
}

function renderHistoricalHighlights(editorialEdition) {
  const root = getElement("highlight-list");
  if (!root) return;
  const localizedStories = loadedHistoricalStoryCopy?.editions?.[String(activeEdition)];
  const stories = Array.isArray(localizedStories) && localizedStories.length
    ? localizedStories
    : editorialEdition.highlights;
  const rows = stories.map((story, index) => {
    const article = document.createElement("article");
    article.className = "highlight-row";
    article.dataset.historicalStoryIndex = String(index + 1);
    const copy = document.createElement("div");
    const title = document.createElement("h3");
    const body = document.createElement("p");
    appendHistoricalStoryCopy(title, story.title);
    appendHistoricalStoryCopy(body, story.body);
    copy.append(title, body);
    article.append(copy);
    return article;
  });
  root.replaceChildren(...rows);
}

const PREVIEW_DATE_LOCALES = Object.freeze({
  en: "en-GB",
  es: "es-ES",
  ko: "ko-KR",
  zh: "zh-CN"
});

const ZH_PREVIEW_TEAM_NAMES = Object.freeze({
  Argentina: "阿根廷",
  Belgium: "比利时",
  Bolivia: "玻利维亚",
  Brazil: "巴西",
  Bulgaria: "保加利亚",
  Cameroon: "喀麦隆",
  Canada: "加拿大",
  Chile: "智利",
  Colombia: "哥伦比亚",
  "Costa Rica": "哥斯达黎加",
  Croatia: "克罗地亚",
  Czechoslovakia: "捷克斯洛伐克",
  Ecuador: "厄瓜多尔",
  England: "英格兰",
  France: "法国",
  Germany: "德国",
  Greece: "希腊",
  Hungary: "匈牙利",
  Italy: "意大利",
  Japan: "日本",
  Mexico: "墨西哥",
  Netherlands: "荷兰",
  Peru: "秘鲁",
  Poland: "波兰",
  Portugal: "葡萄牙",
  Qatar: "卡塔尔",
  Russia: "俄罗斯",
  "Saudi Arabia": "沙特阿拉伯",
  Senegal: "塞内加尔",
  "South Africa": "南非",
  "South Korea": "韩国",
  "Soviet Union": "苏联",
  Spain: "西班牙",
  Sweden: "瑞典",
  Switzerland: "瑞士",
  "United States": "美国",
  Uruguay: "乌拉圭",
  "West Germany": "西德",
  Yugoslavia: "南斯拉夫"
});

function formatPreviewDate(dateValue) {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(PREVIEW_DATE_LOCALES[currentLanguage] || PREVIEW_DATE_LOCALES.en, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function localizePreviewTeam(teamName) {
  if (currentLanguage === "zh") {
    return ZH_PREVIEW_TEAM_NAMES[teamName] || localizeEntity("teams", teamName) || teamName;
  }
  return localizeEntity("teams", teamName) || teamName;
}

function formatPreviewTeamList(teamNames) {
  const localizedNames = teamNames.map(localizePreviewTeam);
  return new Intl.ListFormat(PREVIEW_DATE_LOCALES[currentLanguage] || PREVIEW_DATE_LOCALES.en, {
    style: "long",
    type: "conjunction"
  }).format(localizedNames);
}

function getPreviewOpening(preview) {
  if (preview.opening && preview.startDate) {
    return {
      home: preview.opening.home,
      away: preview.opening.away,
      venue: preview.opening.venue,
      startDate: preview.startDate,
      simultaneousMatchCount: 1
    };
  }
  const fixture = loadedHistory?.fixtures?.find(({ id }) => id === preview.openingFixtureId);
  if (!fixture) return null;
  const simultaneousMatchCount = loadedHistory.fixtures.filter(({ tournamentYear, date }) =>
    tournamentYear === preview.nextYear && date === fixture.date
  ).length;
  return {
    home: fixture.homeSlot,
    away: fixture.awaySlot,
    venue: fixture.venue,
    startDate: fixture.date,
    simultaneousMatchCount
  };
}

function getSpanishNextWorldCupPreview(preview, opening) {
  const hosts = formatPreviewTeamList(preview.hosts);
  const holder = localizePreviewTeam(preview.holder);
  const pluralHosts = preview.hosts.length > 1;
  if (preview.nextYear === 2026) {
    return {
      lead: "Canadá, México y Estados Unidos albergarán el primer Mundial de 48 selecciones y el primero organizado por tres países.",
      firstTitle: "Tres anfitriones tienen su lugar",
      firstBody: "Canadá, México y Estados Unidos disputarán el torneo en 16 ciudades. Los tres se clasifican automáticamente.",
      drawTitle: "Se sortean los grupos",
      drawBody: "El sorteo final en el Kennedy Center de Washington definirá los 12 grupos.",
      openingTitle: "Comienza el Mundial de 2026",
      openingBody: "México se enfrentará a Sudáfrica en el Estadio Ciudad de México."
    };
  }
  let firstTitle;
  let firstBody;
  if (preview.qualificationMode === "host_must_qualify") {
    firstTitle = "Italia logra su plaza";
    firstBody = "Italia es el único país anfitrión que ha tenido que clasificarse. Vence 4–0 a Grecia en San Siro, en Milán, y Grecia se retira antes del partido de vuelta.";
  } else if (preview.qualificationMode === "replacement_host") {
    firstTitle = "México asume la organización";
    firstBody = "La FIFA elige a México como sede sustituta tras la renuncia de Colombia. México y la campeona Italia se clasifican automáticamente.";
  } else if (preview.qualificationMode === "hosts_and_holders") {
    firstTitle = pluralHosts ? "Anfitriones y campeón ya tienen su plaza" : `${hosts} y ${holder} ya tienen su plaza`;
    firstBody = `${hosts} ${pluralHosts ? "se clasifican" : "se clasifica"} automáticamente como ${pluralHosts ? "anfitriones" : "anfitrión"}. ${holder} regresa como campeón vigente.`;
  } else {
    firstTitle = pluralHosts ? "Los anfitriones ya tienen su plaza" : `${hosts} ya tiene su plaza`;
    firstBody = `${hosts} ${pluralHosts ? "se clasifican" : "se clasifica"} automáticamente como ${pluralHosts ? "anfitriones" : "anfitrión"}. El campeón ${holder} debe disputar la fase de clasificación.`;
  }
  const drawTitle = preview.groupCount ? "Se sortean los grupos" : "Se sortea el cuadro eliminatorio";
  const drawBody = preview.groupCount
    ? `El sorteo final en ${preview.drawLocation} definirá ${preview.groupCount} grupos.`
    : `El sorteo final en ${preview.drawLocation} definirá el cuadro eliminatorio de 16 selecciones.`;
  const home = localizePreviewTeam(opening.home);
  const away = localizePreviewTeam(opening.away);
  const openingBody = opening.simultaneousMatchCount > 1
    ? `La jornada inaugural tendrá ${opening.simultaneousMatchCount} partidos. ${home} se enfrentará a ${away} en ${opening.venue}.`
    : `${home} se enfrentará a ${away} en ${opening.venue}.`;
  return {
    lead: `${hosts} ${pluralHosts ? "albergarán" : "albergará"} el Mundial de ${preview.nextYear}.`,
    firstTitle,
    firstBody,
    drawTitle,
    drawBody,
    openingTitle: `Comienza el Mundial de ${preview.nextYear}`,
    openingBody
  };
}

function getKoreanNextWorldCupPreview(preview, opening) {
  const hosts = formatPreviewTeamList(preview.hosts);
  const holder = localizePreviewTeam(preview.holder);
  if (preview.nextYear === 2026) {
    return {
      lead: "캐나다·멕시코·미국이 사상 첫 48개 팀 월드컵이자 세 나라가 공동 개최하는 첫 대회를 연다.",
      firstTitle: "세 개최국은 이미 본선에 진출했다",
      firstBody: "캐나다·멕시코·미국이 16개 도시에서 대회를 개최한다. 세 나라 모두 자동 진출한다.",
      drawTitle: "조 추첨이 열린다",
      drawBody: "워싱턴 케네디 센터에서 열리는 본선 조 추첨으로 12개 조가 정해진다.",
      openingTitle: "2026 월드컵 개막",
      openingBody: "멕시코와 남아프리카공화국이 멕시코시티 스타디움에서 맞붙는다."
    };
  }
  let firstTitle;
  let firstBody;
  if (preview.qualificationMode === "host_must_qualify") {
    firstTitle = "이탈리아가 본선 진출권을 얻었다";
    firstBody = "이탈리아는 예선을 치러야 했던 유일한 개최국이다. 밀라노 산 시로에서 그리스를 4대0으로 이겼고, 그리스는 2차전을 앞두고 기권했다.";
  } else if (preview.qualificationMode === "replacement_host") {
    firstTitle = "멕시코가 개최권을 넘겨받았다";
    firstBody = "콜롬비아의 개최 포기 후 FIFA가 멕시코를 대체 개최국으로 선정했다. 멕시코와 디펜딩 챔피언 이탈리아가 자동 진출한다.";
  } else if (preview.qualificationMode === "hosts_and_holders") {
    firstTitle = "개최국과 디펜딩 챔피언이 본선에 진출했다";
    firstBody = `자동 진출 팀은 개최국 ${hosts}, 디펜딩 챔피언 ${holder}이다.`;
  } else {
    firstTitle = preview.hosts.length > 1 ? "개최국들이 본선에 진출했다" : "개최국이 본선에 진출했다";
    firstBody = `개최국 ${hosts}의 자동 진출이 확정됐다. 디펜딩 챔피언 ${holder}에게는 예선이 필요하다.`;
  }
  const drawTitle = preview.groupCount ? "조 추첨이 열린다" : "토너먼트 대진이 정해진다";
  const drawBody = preview.groupCount
    ? `${preview.drawLocation}에서 열리는 본선 조 추첨으로 ${preview.groupCount}개 조가 정해진다.`
    : `${preview.drawLocation}에서 열리는 본선 추첨으로 16강 토너먼트 대진이 정해진다.`;
  const home = localizePreviewTeam(opening.home);
  const away = localizePreviewTeam(opening.away);
  const openingBody = opening.simultaneousMatchCount > 1
    ? `개막일에 ${opening.simultaneousMatchCount}경기가 열린다. 그중 ${home}와 ${away}의 경기는 ${opening.venue}에서 열린다.`
    : `${home}와 ${away}의 경기가 ${opening.venue}에서 열린다.`;
  return {
    lead: `${hosts}에서 ${preview.nextYear}년 월드컵이 열린다.`,
    firstTitle,
    firstBody,
    drawTitle,
    drawBody,
    openingTitle: `${preview.nextYear} 월드컵 개막`,
    openingBody
  };
}

function getChineseNextWorldCupPreview(preview, opening) {
  const hosts = formatPreviewTeamList(preview.hosts);
  const holder = localizePreviewTeam(preview.holder);
  if (preview.nextYear === 2026) {
    return {
      lead: "加拿大、墨西哥和美国将共同举办首届48队世界杯，也是首次由三个国家共同主办。",
      firstTitle: "三个东道主已锁定席位",
      firstBody: "加拿大、墨西哥和美国将在16座城市举办赛事，三个东道主均自动晋级。",
      drawTitle: "小组抽签",
      drawBody: "在华盛顿肯尼迪中心举行的决赛圈抽签将确定12个小组。",
      openingTitle: "2026年世界杯开幕",
      openingBody: "墨西哥与南非将在墨西哥城体育场交锋。"
    };
  }
  let firstTitle;
  let firstBody;
  if (preview.qualificationMode === "host_must_qualify") {
    firstTitle = "意大利取得参赛资格";
    firstBody = "意大利是唯一需要参加预选赛的东道主。他们在米兰圣西罗球场4比0击败希腊，希腊随后退出次回合比赛。";
  } else if (preview.qualificationMode === "replacement_host") {
    firstTitle = "墨西哥接替主办";
    firstBody = "哥伦比亚退出后，国际足联选择墨西哥作为替代东道主。墨西哥与卫冕冠军意大利自动晋级。";
  } else if (preview.qualificationMode === "hosts_and_holders") {
    firstTitle = "东道主与卫冕冠军锁定席位";
    firstBody = `东道主${hosts}与卫冕冠军${holder}自动晋级。`;
  } else {
    firstTitle = preview.hosts.length > 1 ? "东道主锁定三个席位" : "东道主锁定席位";
    firstBody = `东道主${hosts}自动晋级，卫冕冠军${holder}需要参加预选赛。`;
  }
  const drawTitle = preview.groupCount ? "小组抽签" : "淘汰赛对阵抽签";
  const drawBody = preview.groupCount
    ? `在${preview.drawLocation}举行的决赛圈抽签将确定${preview.groupCount}个小组。`
    : `在${preview.drawLocation}举行的决赛圈抽签将确定16队淘汰赛对阵。`;
  const home = localizePreviewTeam(opening.home);
  const away = localizePreviewTeam(opening.away);
  const openingBody = opening.simultaneousMatchCount > 1
    ? `开幕日将进行${opening.simultaneousMatchCount}场比赛，其中${home}与${away}将在${opening.venue}交锋。`
    : `${home}与${away}将在${opening.venue}交锋。`;
  return {
    lead: `${preview.nextYear}年世界杯将在${hosts}举行。`,
    firstTitle,
    firstBody,
    drawTitle,
    drawBody,
    openingTitle: `${preview.nextYear}年世界杯开幕`,
    openingBody
  };
}

function getLocalizedNextWorldCupPreview(preview, opening) {
  if (currentLanguage === "es") return getSpanishNextWorldCupPreview(preview, opening);
  if (currentLanguage === "ko") return getKoreanNextWorldCupPreview(preview, opening);
  if (currentLanguage === "zh") return getChineseNextWorldCupPreview(preview, opening);
  return {
    lead: preview.lead,
    firstTitle: preview.firstTitle,
    firstBody: preview.firstBody,
    drawTitle: preview.drawTitle,
    drawBody: preview.drawBody,
    openingTitle: `The ${preview.nextYear} World Cup begins`,
    openingBody: preview.openingBody
  };
}

function renderNextWorldCupPreview() {
  const preview = HISTORICAL_NEXT_WORLD_CUP_PREVIEWS[activeEdition];
  const opening = preview ? getPreviewOpening(preview) : null;
  if (!preview || !opening) return;
  const copy = getLocalizedNextWorldCupPreview(preview, opening);
  setText("next-world-cup-lead", copy.lead);
  const firstDate = getElement("timeline-first-date");
  const formattedFirstDate = formatPreviewDate(preview.firstDate);
  if (firstDate) {
    firstDate.textContent = formattedFirstDate;
    firstDate.closest(".timeline-date")?.toggleAttribute("aria-hidden", !formattedFirstDate);
  }
  setText("timeline-first-title", copy.firstTitle);
  setText("timeline-first-body", copy.firstBody);
  setText("timeline-second-date", formatPreviewDate(preview.drawDate));
  setText("timeline-second-title", copy.drawTitle);
  setText("timeline-second-body", copy.drawBody);
  setText("timeline-third-date", formatPreviewDate(opening.startDate));
  setText("timeline-third-title", copy.openingTitle);
  setText("timeline-third-body", copy.openingBody);
  firstDate?.closest(".timeline-item")?.classList.toggle("is-undated", !formattedFirstDate);
  document.querySelectorAll(".next-world-cup-timeline .timeline-item").forEach((item) => {
    item.classList.remove("is-pending", "is-scheduled", "is-final");
    item.classList.add("is-complete");
    const marker = item.querySelector(".timeline-marker i");
    if (marker) marker.textContent = "✓";
  });
}

function renderHistoricalEdition() {
  if (activeEdition === 2026 || !loadedBestXi || !loadedProfiles || !loadedTeams) {
    return;
  }
  const editorialEdition = HISTORICAL_HIGHLIGHTS.editions[activeEdition];
  if (!editorialEdition) return;
  const championName = localizeEntity("teams", editorialEdition.champion) || editorialEdition.champion;
  const spanishChampionNoun = SPANISH_FEMININE_CHAMPION_TEAMS.has(editorialEdition.champion)
    ? "campeona"
    : "campeón";
  updateCelebrationPalette();
  setText("page-title", ({
    en: `${editorialEdition.champion} are ${activeEdition} world champions.`,
    es: `${championName} es ${spanishChampionNoun} del mundo en ${activeEdition}.`,
    ko: `${championName}, ${activeEdition}년 세계 챔피언.`,
    zh: `${championName}是${activeEdition}年世界杯冠军。`
  })[currentLanguage] || `${editorialEdition.champion} are ${activeEdition} world champions.`);
  const championFlag = getElement("champion-flag");
  if (championFlag) {
    const metadata = getHistoricalTeamFlagMetadata(editorialEdition.champion);
    championFlag.className = ["champion-illustration-flag", metadata.flagClass].filter(Boolean).join(" ");
    championFlag.textContent = metadata.flagClass ? "" : metadata.flag || editorialEdition.flag || "🌍";
  }
  renderChampionPhoto(editorialEdition);
  const intro = document.querySelector(".intro-copy");
  if (intro) {
    intro.removeAttribute("data-highlight-player-mentions");
    intro.replaceChildren();
    appendHistoricalIntroCopy(intro, editorialEdition.intro, editorialEdition.introPlayers);
  }
  setText("best-xi-title", getBestXiEditionTitle());
  setText("awards-title", activeLocale.text.officialAwards);
  setText("highlights-title", activeLocale.text.moreHighlights);
  renderHistoricalAwards();
  renderHistoricalHighlights(editorialEdition);
  renderNextWorldCupPreview();
  updateMetadata();
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
  const isRetrospectiveElo = team?.rankingSystem === "elo";
  const label = formatMessage(
    isRetrospectiveElo ? activeLocale.text.eloRankLabel : activeLocale.text.rankLabel,
    { rank, teamName, year }
  );
  const tooltip = formatMessage(
    isRetrospectiveElo ? activeLocale.text.eloRankTooltip : activeLocale.text.rankTooltip,
    { year }
  );
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
  return HISTORICAL_PLAYER_DISPLAY_NAME_OVERRIDES[`${activeEdition}|${playerName}`]?.[currentLanguage]
    || localizeEntity("players", playerName)
    || (currentLanguage === "zh" ? ZH_PLAYER_NAME_TRANSLATIONS[playerName] : "")
    || getHistoricalLocalizedPlayerName(playerName)
    || getHistoricalLocalizedPlayerName(profile?.name)
    || profile?.displayName
    || playerName
    || "";
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
      return ZH_PLAYER_SKILLS[skill]
        || ZH_PLAYER_SKILL_CATEGORIES[getPlayerSkillCategory(skill)]
        || "球员特点";
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
  const historical = Boolean(profile?.historical || activeEdition !== 2026);
  const sourceNote = historical
    ? profile?.styleNote || profile?.note || ""
    : profile?.note || "";
  if (currentLanguage === "zh") {
    return historical
      ? profile?.styleNoteZh || profile?.noteZh || sourceNote
      : profile?.noteZh || sourceNote;
  }
  if (["es", "ko"].includes(currentLanguage)) {
    const localizedName = getHighlightPlayerName(playerName, profile);
    const localizedStyleNote = activeAppLocalePack?.helpers?.formatPlayerNote?.(sourceNote, {
      historical,
      localizedName
    });
    if (localizedStyleNote) {
      return localizedStyleNote;
    }
    const authoredTranslation = loadedHistoricalPlayerNoteTranslations[sourceNote];
    if (authoredTranslation) {
      return authoredTranslation;
    }
    const localizedArchiveIdentity = historical && profile?.note !== sourceNote
      ? activeAppLocalePack?.helpers?.formatPlayerNote?.(profile.note, {
          historical: true,
          localizedName
        })
      : "";
    return localizedArchiveIdentity || getHighlightPlayerSkills(profile).join(" · ");
  }
  return sourceNote;
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

function getHighlightPlayerReferenceDate(profile) {
  const tournamentYear = Number(profile?.tournamentYear || activeEdition);
  const referenceDate = getPlayerCardWorldCupReferenceDate(tournamentYear);
  return referenceDate ? new Date(`${referenceDate}T12:00:00Z`) : new Date();
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
  const historicalValue = Number(profile?.marketValueAtTournamentEurMillions);
  if (profile?.historical && Number.isFinite(historicalValue) && historicalValue > 0) {
    return {
      estimated: false,
      historical: true,
      value: historicalValue,
      valueDate: profile?.marketValueAtTournamentDate || ""
    };
  }
  if (profile?.historical) {
    return null;
  }
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
    : marketValue.historical
      ? activeLocale.text.playerTournamentValueTooltip
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

function addHighlightTournamentStat(statsByKey, teamId, playerName, statName) {
  const nameKey = normalizeHistoricalName(playerName);
  if (!nameKey || !["goals", "assists"].includes(statName)) {
    return;
  }
  const normalizedTeamId = String(teamId || "").trim().toUpperCase();
  const keys = normalizedTeamId ? [`${normalizedTeamId}:${nameKey}`, nameKey] : [nameKey];
  for (const key of keys) {
    const stats = statsByKey.get(key) || { goals: 0, assists: 0 };
    stats[statName] += 1;
    statsByKey.set(key, stats);
  }
}

function buildHighlightTournamentStats(fixtures = []) {
  const statsByKey = new Map();
  for (const fixture of fixtures) {
    if (!["LIVE", "FT", "AET", "PEN"].includes(String(fixture?.status || "").toUpperCase())) {
      continue;
    }
    for (const [side, goals] of [
      ["home", fixture.goalsHome || []],
      ["away", fixture.goalsAway || []]
    ]) {
      const teamId = side === "home" ? fixture.homeTeamId : fixture.awayTeamId;
      for (const goal of goals) {
        if (goal?.ownGoal) {
          continue;
        }
        addHighlightTournamentStat(statsByKey, teamId, goal?.name, "goals");
        if (goal?.assistName && normalizeHistoricalName(goal.assistName) !== normalizeHistoricalName(goal.name)) {
          addHighlightTournamentStat(statsByKey, teamId, goal.assistName, "assists");
        }
      }
    }
  }
  return statsByKey;
}

function getHighlightPlayerTournamentStats(playerName, profile) {
  if (activeEdition !== 2026) {
    const goals = Number(profile?.goals);
    const assists = Number(profile?.assists);
    return {
      goals: Number.isInteger(goals) && goals >= 0 ? goals : 0,
      assists: Number.isInteger(assists) && assists >= 0 ? assists : null
    };
  }

  const teamId = String(profile?.teamId || "").trim().toUpperCase();
  const aliases = [
    playerName,
    profile?.name,
    profile?.displayName,
    ...(Array.isArray(profile?.aliases) ? profile.aliases : [])
  ];
  const totals = { goals: 0, assists: 0 };
  const keys = new Set(aliases.map(normalizeHistoricalName).filter(Boolean));
  for (const nameKey of keys) {
    const stats = loadedTournamentStatsByKey.get(teamId ? `${teamId}:${nameKey}` : nameKey);
    if (stats) {
      totals.goals += stats.goals;
      totals.assists += stats.assists;
    }
  }
  return totals;
}

function renderHighlightPlayerCopy(note, profile, noteClass = "", playerName = "") {
  const tournamentYear = Number(profile?.tournamentYear || activeEdition);
  const age = getHighlightPlayerAge(profile, getHighlightPlayerReferenceDate(profile));
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
  const tournamentStatsLine = formatPlayerTournamentStatsLine({
    ...getHighlightPlayerTournamentStats(playerName || profile?.name || profile?.displayName, profile),
    year: tournamentYear,
    language: currentLanguage,
    current: activeEdition === 2026
  });
  const tournamentStatsMarkup = tournamentStatsLine
    ? `<span class="player-card-note player-card-tournament-stats">${escapeHtml(tournamentStatsLine)}</span>`
    : "";
  const metaMarkup = metaLine
    ? `<span class="player-card-note player-card-meta">${metaLine}</span>`
    : "";
  const contextLine = formatPlayerCardWorldCupContext({
    year: tournamentYear,
    language: currentLanguage
  });
  const contextMarkup = contextLine
    ? `<span class="player-card-note player-card-world-cup-context">${escapeHtml(contextLine)}</span>`
    : "";
  return noteMarkup || tournamentStatsMarkup || metaMarkup || contextMarkup
    ? `<span class="player-card-copy">${noteMarkup}${tournamentStatsMarkup}${metaMarkup}${contextMarkup}</span>`
    : "";
}

function createHighlightPlayerMention(playerName, triggerText = "") {
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
  trigger.textContent = triggerText || displayName;
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
    ${renderHighlightPlayerCopy(note, profile, "", playerName)}
  `;
  wrapper.append(trigger, card);
  activateBestXiImages(wrapper);
  return wrapper;
}

function appendHistoricalIntroCopy(element, copy, introPlayers = []) {
  const playerCandidates = introPlayers.map((entry) => {
    const playerName = typeof entry === "string" ? entry : entry?.playerName;
    const triggerText = typeof entry === "string" ? entry : entry?.triggerText;
    return {
      sourceEntry: entry,
      playerName,
      triggerText,
      index: triggerText ? copy.indexOf(triggerText) : -1
    };
  });
  const candidate = playerCandidates
    .filter(({ playerName, index }) => playerName && index >= 0)
    .sort((left, right) => left.index - right.index)[0];
  if (!candidate) {
    appendFootballInlineText(element, copy);
    return;
  }

  appendFootballInlineText(element, copy.slice(0, candidate.index));
  const mention = createHighlightPlayerMention(candidate.playerName, candidate.triggerText);
  element.append(mention || document.createTextNode(candidate.triggerText));
  appendHistoricalIntroCopy(
    element,
    copy.slice(candidate.index + candidate.triggerText.length),
    introPlayers.filter((entry) => entry !== candidate.sourceEntry)
  );
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
  card.style.setProperty("--player-card-width", `${cardWidth}px`);
  card.style.setProperty("--player-card-shift", "0px");
  playerHover.classList.toggle("is-card-below", triggerRect.top < 270);
  const unshiftedCardRect = card.getBoundingClientRect();
  const unshiftedLeft = unshiftedCardRect.width ? unshiftedCardRect.left : triggerRect.left;
  const desiredLeft = Math.min(
    Math.max(unshiftedLeft, viewportMargin),
    Math.max(viewportMargin, window.innerWidth - cardWidth - viewportMargin)
  );
  card.style.setProperty("--player-card-shift", `${Math.round(desiredLeft - unshiftedLeft)}px`);
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
  floatingCard.querySelectorAll("img[data-best-xi-image-bound]").forEach((image) => {
    delete image.dataset.bestXiImageBound;
  });
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
  const tooltipStyle = window.getComputedStyle(pill, "::after");
  const width = [
    "width",
    "padding-left",
    "padding-right",
    "border-left-width",
    "border-right-width"
  ].reduce((total, property) => (
    total + (Number.parseFloat(tooltipStyle.getPropertyValue(property)) || 0)
  ), 0);
  const edgeGap = 6;
  const anchorOffset = Number.parseFloat(tooltipStyle.left) || rect.width / 2;
  const idealLeft = rect.left + anchorOffset - width / 2;
  const clampedLeft = Math.min(
    window.innerWidth - width - edgeGap,
    Math.max(edgeGap, idealLeft)
  );
  pill.style.setProperty("--tooltip-shift-x", `${clampedLeft - idealLeft}px`);
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
  return HISTORICAL_PLAYER_DISPLAY_NAME_OVERRIDES[`${activeEdition}|${player?.playerName}`]?.[currentLanguage]
    || localizeEntity("players", player?.playerName)
    || (currentLanguage === "zh" ? ZH_PLAYER_NAME_TRANSLATIONS[player?.playerName] : "")
    || getHistoricalLocalizedPlayerName(player?.playerName)
    || fallbackName;
}

function getBestXiTeamName(teamId) {
  const team = getBestXiTeam(teamId);
  return localizeEntity("teams", team?.name) || team?.name || teamId || "";
}

function getBestXiPositionLabel(position) {
  return activeLocale.text[POSITION_TEXT_KEYS[position]] || position || "";
}

function getBestXiReason(player) {
  const historicalReason = activeEdition === 2026
    ? ""
    : loadedHistoricalBestXiReasons[`${activeEdition}|player|${player?.playerName || ""}`];
  return historicalReason || player?.reason?.[currentLanguage] || player?.reason?.en || "";
}

function getBestXiDescriptionParagraphs(player, profile) {
  const rationale = getBestXiReason(player);
  if (activeEdition === 2026) {
    return rationale;
  }
  return buildHistoricalBestXiDescriptionParagraphs({
    language: currentLanguage,
    playerName: getBestXiDisplayName(player),
    teamName: getBestXiTeamName(player?.teamId),
    tournamentYear: Number(profile?.tournamentYear || activeEdition),
    position: profile?.position || player?.position,
    profile
  }, rationale);
}

function getBestXiCoachReason(coach) {
  const historicalReason = activeEdition === 2026
    ? ""
    : loadedHistoricalBestXiReasons[`${activeEdition}|coach|${coach?.name || ""}`];
  return historicalReason || getBestXiCoachCopy(coach?.reason);
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
  const positionLabel = activeEdition === 2026
    ? getHighlightPlayerPosition(profile) || getBestXiPositionLabel(player.position)
    : getBestXiPositionLabel(player.position) || getHighlightPlayerPosition(profile);
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

function getBestXiCompactPositionCode(player, profile, slot) {
  const selectionCode = String(player?.position || slot?.starter?.position || "").trim().toUpperCase();
  const compactCode = ["RCM", "LCM"].includes(selectionCode) ? "CM" : selectionCode;
  const profilePosition = String(profile?.position || "").trim().toLowerCase();

  if (["LW", "RW"].includes(compactCode)) {
    if (/\bright (?:wing|winger|midfielder)\b/.test(profilePosition)) {
      return "RW";
    }
    if (/\bleft (?:wing|winger|midfielder)\b/.test(profilePosition)) {
      return "LW";
    }
  }

  return compactCode;
}

function renderBestXiHonourablePlayer(slot, player, index = 0) {
  const profile = loadedProfiles?.[player.playerName];
  const displayName = getBestXiDisplayName(player);
  const lineupLabel = currentLanguage === "zh" ? displayName : formatLineupShortName(displayName);
  const positionCode = getBestXiCompactPositionCode(player, profile, slot);
  const positionLabel = activeEdition === 2026
    ? getHighlightPlayerPosition(profile) || getBestXiPositionLabel(positionCode)
    : getBestXiPositionLabel(positionCode) || getHighlightPlayerPosition(profile);
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
      <span class="lineup-bench-position">${escapeHtml(positionCode)}</span>
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
  const reason = getBestXiCoachReason(coach);
  trigger.setAttribute(
    "aria-label",
    formatMessage(activeLocale.text.bestCoachAria, { name: coach.name, reason })
  );

  const profile = getBestXiCoachProfile(coach);
  card.innerHTML = renderBestXiCoachCard(coach, profile);
  activateBestXiImages(card);

  const initials = getPlayerInitials(coach.name);
  const imageUrl = coach.imageUrl || profile?.imageUrl || "";
  avatar.replaceChildren();
  if (!imageUrl) {
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
  image.src = imageUrl;
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

function getBestXiCoachSinceText(details) {
  if (!details?.sinceYear) {
    return "";
  }
  if (currentLanguage === "zh") {
    return `${details.sinceYear} 年起`;
  }
  return activeAppLocalePack?.helpers?.formatAppMessage?.("coach-since", { year: details.sinceYear })
    || `Since ${details.sinceYear}`;
}

function getBestXiCoachAgeText(details) {
  const archivedAge = Number(details?.ageAtTournament);
  const age = Number.isInteger(archivedAge) && archivedAge >= 18 && archivedAge <= 100
    ? archivedAge
    : activeEdition === 2026
      ? getHighlightPlayerAge(details, getHighlightPlayerReferenceDate(details))
      : null;
  if (!Number.isInteger(age)) {
    return "";
  }
  return formatMessage(activeLocale.text.playerAge, { age });
}

function getBestXiCoachStyles(details) {
  if (!Array.isArray(details?.styles)) {
    return [];
  }
  return Array.from(new Set(details.styles.map((style) => String(style || "").trim()).filter(Boolean)))
    .slice(0, 3)
    .map((style) => COACH_STYLE_TRANSLATIONS[style]?.[currentLanguage] || getBestXiAppText(style));
}

function renderBestXiCoachCard(coach, profile) {
  const displayName = coach?.name || profile?.name || "";
  const team = loadedTeams?.[coach?.teamId || profile?.teamId];
  const teamName = getHighlightTeamName(team)
    || localizeHistoricalAwardTeam(coach?.teamName)
    || profile?.teamName
    || "";
  const role = currentLanguage === "zh"
    ? `${teamName}主教练`
    : activeAppLocalePack?.helpers?.formatAppMessage?.("coach-role", { teamText: teamName }) || `${teamName} Head Coach`;
  const details = activeEdition === 2026 ? profile : coach;
  const sinceText = getBestXiCoachSinceText(details);
  const ageText = getBestXiCoachAgeText(details);
  const styleTags = getBestXiCoachStyles(details);
  const note = getBestXiCoachReason(coach);
  const initials = getPlayerInitials(displayName);
  const imageUrl = activeEdition === 2026
    ? profile?.imageUrl || coach?.imageUrl || ""
    : coach?.imageUrl || profile?.imageUrl || "";
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
  const styleItems = styleTags
    .map((style) => `<span>${escapeHtml(style)}</span>`)
    .join("");
  const copyItems = [note, ageText]
    .filter(Boolean)
    .map((item) => `<span class="player-card-note">${escapeHtml(item)}</span>`)
    .join("\n");

  return `
    <span class="player-card-header">
      <span class="player-photo">${photoMarkup}</span>
      <span class="player-card-title">
        <span class="player-card-name-line">
          <strong class="player-card-name">${escapeHtml(displayName)}</strong>
        </span>
        <span class="player-card-position">${escapeHtml(role)}</span>
        ${sinceText ? `<span class="player-card-club">${escapeHtml(sinceText)}</span>` : ""}
      </span>
    </span>
    ${styleItems ? `<span class="player-skill-list">${styleItems}</span>` : ""}
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
  const tabLabel = getBestXiEditionTitle();
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
        aria-label="${escapeHtml(activeLocale.text.bestXiInfo)}"
      >
        <span class="lineup-tab-label lineup-tab-label-full">${escapeHtml(tabLabel)}</span>
        <span class="lineup-tab-label lineup-tab-label-compact" aria-hidden="true">
          <span class="best-xi-world-map-icon">🗺️</span>
          <span>${escapeHtml(activeLocale.text.bestXiInfo)}</span>
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
    surfaceAttributes: `id="best-xi-pitch" role="list" aria-label="${escapeHtml(activeEdition === 2026 ? activeLocale.text.bestXiPitchLabel : `${getBestXiEditionTitle()} · ${selection.formation}`)}"`,
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
  const positionLabel = activeEdition === 2026
    ? getHighlightPlayerPosition(profile) || getBestXiPositionLabel(player.position)
    : getBestXiPositionLabel(player.position) || getHighlightPlayerPosition(profile);
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
    ${renderHighlightPlayerCopy(getBestXiDescriptionParagraphs(player, profile), profile, "best-xi-player-reason", player.playerName)}
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

function setupBestXiInteractions() {
  const section = document.querySelector(".best-xi-section");
  const card = getElement(BEST_XI_CARD_ID);
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
  document.addEventListener("pointerdown", (event) => {
    if (
      activeBestXiPlayer
      && !activeBestXiPlayer.contains(event.target)
      && !card.contains(event.target)
    ) {
      hideBestXiPlayerCard();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (activeBestXiPlayer) {
      hideBestXiPlayerCard();
    }
    const honourablesButton = document.querySelector(".best-xi-honourables-button");
    if (honourablesButton?.getAttribute("aria-expanded") === "true") {
      toggleBestXiHonourables();
      honourablesButton.focus();
    }
  });
  window.addEventListener("resize", () => {
    positionBestXiPlayerCard();
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
  getElement("fair-play-meta")?.classList.remove("is-historical-captain-meta");

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
  activeEdition = resolveInitialEdition();
  updateCelebrationPalette();
  setupLanguageSelect();
  setupEditionPicker();
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
    loadedHistoricalBestXiReasons = Object.freeze({});
    loadedHistoricalAwardCopy = null;
    loadedHistoricalStoryCopy = null;
    loadedHistoricalPlayerNames = Object.freeze({});
    loadedHistoricalPlayerNamesByNormalizedName = new Map();
    loadedHistoricalPlayerNoteTranslations = Object.freeze({});
    applyLocale();
  }

  if (activeEdition === 2026) {
    try {
      const [tournament, fixtureData, playerData, coachData, teamData, structuredGlossary] = await Promise.all([
        loadJson("data/tournament.json"),
        loadJson("data/fixtures.json"),
        loadJson("data/player-profiles.json"),
        loadJson("data/coach-profiles.json"),
        loadJson("data/teams.json"),
        loadJson("data/locales/structured-content-glossary.json")
      ]);
      loadedAwards = tournament.awards || {};
      loadedTournamentStatsByKey = buildHighlightTournamentStats(fixtureData.fixtures || []);
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
  } else {
    try {
      const [
        historyData,
        historicalProfileData,
        historicalAwardData,
        historicalRankingData,
        coachData,
        structuredGlossary
      ] = await Promise.all([
        loadJson("data/history.json"),
        loadJson(`data/historical-player-profiles.json?v=${DATA_VERSION}`),
        loadJson("data/world-cup-awards.json"),
        loadJson("data/historical-rankings.json"),
        loadJson("data/coach-profiles.json"),
        loadJson("data/locales/structured-content-glossary.json")
      ]);
      const editorialEdition = HISTORICAL_HIGHLIGHTS.editions[activeEdition];
      const awardsEdition = historicalAwardData.editions?.[String(activeEdition)] || {};
      const rankingSnapshot = historicalRankingData.editions?.[String(activeEdition)] || {};
      loadedHistory = historyData;
      loadedHistoricalAwards = historicalAwardData;
      loadedProfiles = buildHistoricalProfiles(editorialEdition, historicalProfileData, awardsEdition);
      loadedCoachProfiles = coachData.profiles || {};
      loadedTeams = buildHistoricalTeams(editorialEdition, awardsEdition, rankingSnapshot);
      loadedStructuredGlossary = structuredGlossary || {};
      loadedRankingYear = activeEdition;
      loadedBestXi = buildHistoricalBestXi(editorialEdition, historicalProfileData);
      renderBestXi();
      renderHistoricalEdition();
    } catch (error) {
      console.error("Unable to load historical awards and highlights", error);
    }
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
