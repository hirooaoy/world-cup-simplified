const DATA_VERSION = "2026-06-30-official-history-videos-archive-times";
const DATA_URLS = {
  adminMessage: `data/admin-message.json?v=${DATA_VERSION}`,
  fixtures: `data/fixtures.json?v=${DATA_VERSION}`,
  history: `data/history.json?v=${DATA_VERSION}`,
  historicalPlayerProfiles: `data/historical-player-profiles.json?v=${DATA_VERSION}`,
  liveData: `api/live-data?v=${DATA_VERSION}`,
  playerProfiles: `data/player-profiles.json?v=${DATA_VERSION}`,
  releaseNotes: `data/release-notes.json?v=${DATA_VERSION}`,
  standings: `data/standings.json?v=${DATA_VERSION}`,
  teams: `data/teams.json?v=${DATA_VERSION}`,
  tournament: `data/tournament.json?v=${DATA_VERSION}`
};

const LANGUAGE_STORAGE_KEY = "world-cup-simplified-language";
const TIMEZONE_STORAGE_KEY = "world-cup-simplified-timezone";
const SHOW_YESTERDAY_STORAGE_KEY = "world-cup-simplified-show-yesterday";
const JUGGLE_RECORD_STORAGE_KEY = "world-cup-simplified-juggle-record";
const ADMIN_MESSAGE_DISMISS_STORAGE_PREFIX = "world-cup-simplified-admin-message-dismissed:";
const ADMIN_MESSAGE_COLLAPSE_DURATION_MS = 280;
const OFFICIAL_HIGHLIGHT_VIDEO_CHANNELS = new Map([
  ["UCwNqHDsnBCKT-olwJwIFyfg", "FOX Sports"],
  ["UCpcTrCXblq78GZrTUTLWeBw", "FIFA"]
]);
const TEAM_SEARCH_URL_UPDATE_DELAY_MS = 180;
const JUGGLE_BALL_EMOJI = "⚽";
const JUGGLE_FALL_SPEED = 420;
const JUGGLE_GRAVITY = 1060;
const JUGGLE_POINTER_HIT_RADIUS_MULTIPLIER = 1.55;
const JUGGLE_TOUCH_HIT_RADIUS_MULTIPLIER = 1.72;
const JUGGLE_HIT_LEAD_SECONDS = 0.05;
const JUGGLE_CLICK_BLOCK_MS = 650;
const JUGGLE_DIFFICULTY_STEP = 5;
const JUGGLE_MAX_DIFFICULTY_LEVEL = 7;
const JUGGLE_GRAVITY_LEVEL_MULTIPLIER = 0.08;
const JUGGLE_KICK_LEVEL_MULTIPLIER = 0.03;
const JUGGLE_LATERAL_LEVEL_MULTIPLIER = 0.06;
const JUGGLE_WALL_BOUNCE_BASE_MULTIPLIER = 0.82;
const JUGGLE_WALL_BOUNCE_LEVEL_MULTIPLIER = 0.028;
const JUGGLE_WALL_BOUNCE_DRIFT = 32;
const JUGGLE_WALL_BOUNCE_LEVEL_DRIFT = 8;
const JUGGLE_WALL_BOUNCE_DROP_SPEED = 18;
const JUGGLE_WALL_BOUNCE_LEVEL_DROP_SPEED = 3;
const JUGGLE_WALL_BOUNCE_SPIN = 185;
const JUGGLE_WALL_BOUNCE_LEVEL_SPIN = 22;
const JUGGLE_MAX_FRAME_SECONDS = 0.04;
const JUGGLE_SOUND_DURATION_SECONDS = 0.08;
const DEFAULT_LANGUAGE = "en";
const LANGUAGE_LOCALES = {
  en: "en-US",
  zh: "zh-CN"
};
const SUPPORTED_LANGUAGES = new Set(Object.keys(LANGUAGE_LOCALES));
const LANGUAGE_SWITCH_PENDING_MIN_MS = 260;
const INITIAL_URL_SEARCH_PARAMS = new URLSearchParams(window.location.search);
const LINEUP_VISUAL_PROTOTYPE_PREVIEW_VALUES = new Set(["1", "preview", "true"]);
const isLineupVisualPrototypePreviewRequested = LINEUP_VISUAL_PROTOTYPE_PREVIEW_VALUES.has(
  String(INITIAL_URL_SEARCH_PARAMS.get("lineups") || "").toLowerCase()
);
const UI_TEXT = {
  en: {
    adminMessage: "Admin message",
    adminMessageDismiss: "Dismiss message",
    adminMessageLabel: "Admin note",
    appName: "World Cup Simplified",
    appHomeLabel: "World Cup Simplified home",
    calendarNextMonth: "Next month",
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
    language: "Language",
    languageEnglish: "English",
    languageChinese: "Chinese",
    languageSwitching: "Switching language",
    juggleBall: "Soccer ball",
    juggleCurrent: "Current juggling streak",
    juggleRecord: "Best juggling streak",
    juggleRecordAction: "Drop soccer ball",
    matches: "Matches",
    matchesHeading: "Matches and selected match details",
    matchesList: "Matches",
    month: "Month",
    past24Hours: "Past 24 hours",
    searchCountryPlaceholder: "Search country",
    settings: "Settings",
    showYesterday: "Show past 24 hours",
    standings: "Standings",
    standingsSections: "Standings sections",
    standingsSummary:
      "Top two in each group advance. The best eight third-place teams also reach the Round of 32.",
    thirdPlaceRace: "Third-Place Race",
    timeZone: "Time zone",
    tournament: "Tournament",
    worldCupViews: "World Cup views"
  },
  zh: {
    adminMessage: "站内消息",
    adminMessageDismiss: "关闭消息",
    adminMessageLabel: "站内便笺",
    appName: "世界杯简明指南",
    appHomeLabel: "世界杯简明指南首页",
    calendarNextMonth: "下个月",
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
    language: "语言",
    languageEnglish: "英文",
    languageChinese: "中文",
    languageSwitching: "正在切换语言",
    juggleBall: "足球",
    juggleCurrent: "当前颠球次数",
    juggleRecord: "最佳颠球纪录",
    juggleRecordAction: "让足球落下",
    matches: "赛程",
    matchesHeading: "比赛和已选比赛详情",
    matchesList: "比赛",
    month: "月份",
    past24Hours: "过去24小时",
    searchCountryPlaceholder: "搜索国家队",
    settings: "设置",
    showYesterday: "显示过去24小时",
    standings: "积分榜",
    standingsSections: "积分榜分区",
    standingsSummary: "每组前两名晋级，成绩最好的八支第三名球队也将进入32强。",
    thirdPlaceRace: "第三名竞争",
    timeZone: "时区",
    tournament: "淘汰赛",
    worldCupViews: "世界杯视图"
  }
};
const ZH_EXACT_TRANSLATIONS = new Map(
  Object.entries({
    "After extra time": "加时后",
    "archive": "存档",
    "As it stands": "当前形势",
    "Best third-place race": "最佳第三名竞争",
    "bracket details are not loaded yet.": "对阵详情尚未载入。",
    "bracket-ready": "对阵待接入",
    "Canceled": "已取消",
    "Cancelled": "已取消",
    "Choose match date": "选择比赛日期",
    "Choose standings year": "选择积分榜年份",
    "Clear country search": "清除国家队搜索",
    "Club to verify": "俱乐部待确认",
    "Current knockout path with likely winners filled for now. Finished results replace estimates.":
      "当前淘汰赛路径会先填入暂时更可能晋级的球队，完赛结果会替换估算。",
    "Knockout bracket uses archived match results.":
      "淘汰赛对阵使用存档比赛结果。",
    "Round of 32 slots use current standings and remaining projections. Later rounds are predictions.":
      "32强席位使用当前积分榜和剩余预测。后续轮次为预测。",
    "Current score": "当前比分",
    "Third-place standings across all groups. The top eight advance.":
      "所有小组第三名排名。前八名晋级。",
    "3rd place match": "季军赛",
    "Algeria": "阿尔及利亚",
    "Argentina": "阿根廷",
    "Australia": "澳大利亚",
    "Austria": "奥地利",
    "Belgium": "比利时",
    "Bosnia and Herzegovina": "波斯尼亚和黑塞哥维那",
    "Brazil": "巴西",
    "Cabo Verde": "佛得角",
    "Canada": "加拿大",
    "Colombia": "哥伦比亚",
    "Côte d'Ivoire": "科特迪瓦",
    "Cote d'Ivoire": "科特迪瓦",
    "Croatia": "克罗地亚",
    "Curacao": "库拉索",
    "Curaçao": "库拉索",
    "Czechia": "捷克",
    "Data unavailable": "数据不可用",
    "DR Congo": "刚果民主共和国",
    "Draw": "平局",
    "Tie": "平局",
    "Ecuador": "厄瓜多尔",
    "Egypt": "埃及",
    "England": "英格兰",
    "Data refreshed": "数据刷新于",
    "Data refreshed stays separate from app release notes.": "数据刷新时间与应用发布说明分开显示。",
    "Eliminated": "已淘汰",
    "No remaining group result combination can move this team into a Round of 32 place.":
      "剩余小组赛结果已无法让这支球队进入32强席位。",
    "FIFA schedule": "FIFA赛程",
    "Footer and source polish": "页脚和来源体验优化",
    "Footer stays short while sources and release notes open on hover.":
      "页脚保持简短，来源和发布说明可悬停查看。",
    "Final group table computed from archived match results.": "最终小组表由存档比赛结果计算得出。",
    "Final group tables computed from archived match results.": "最终小组表由存档比赛结果计算得出。",
    "Final round": "决赛轮",
    "Final round standings": "决赛轮积分榜",
    "Final round table computed from archived match results.": "决赛轮积分榜由存档比赛结果计算得出。",
    "Final round table data is not available for this archived match.":
      "这场存档比赛没有可用的决赛轮积分榜数据。",
    "Second round": "第二轮",
    "Final score is not loaded for this fixture yet.": "这场比赛的最终比分尚未载入。",
    "Final score reflected in the current standings after source checks.":
      "来源核对后，最终比分已反映在当前积分榜中。",
    "Final pending": "最终比分待确认",
    "Pending": "待确认",
    "Final score": "最终比分",
    "FIFA World Cup": "FIFA世界杯",
    "FIFA World Cup qualifier": "世界杯预选赛",
    "Friendly": "友谊赛",
    "France": "法国",
    "FT": "全场",
    "Full time": "全场结束",
    "aet": "加时后",
    "ConfedCup": "联合会杯",
    "Copa": "美洲杯",
    "Euro": "欧洲杯",
    "extra time": "加时赛",
    "Gold Cup": "金杯赛",
    "International Friendly": "国际友谊赛",
    "Olympics": "奥运会",
    "the final whistle": "终场哨响",
    "UEFA Euro": "欧洲杯",
    "UEFA Euro qualifier": "欧洲杯预选赛",
    "UEFA Nations League": "欧国联",
    "GD": "净胜球",
    "Germany": "德国",
    "Ghana": "加纳",
    "Goal difference is goals scored minus goals allowed. If teams are tied on points, a better goal difference can help decide who advances.":
      "净胜球为进球数减失球数。若积分相同，净胜球更好可能决定晋级。",
    "Goal difference is goals scored minus goals allowed. In the third-place race, it helps break ties after points.":
      "净胜球为进球数减失球数。在第三名竞争中，它用于积分相同后的排序。",
    "Goals": "进球",
    "Goals scored is the total goals for. It can break ties after points and goal difference in the third-place race.":
      "进球数是球队总进球。在第三名竞争中，它可用于积分和净胜球之后的同分排序。",
    "Games Left": "剩余场次",
    "Games Left shows how many group matches this current third-place team still has before its table is final.":
      "剩余场次显示这支当前小组第三球队在小组表最终确定前还有几场比赛。",
    "Advancing": "晋级",
    "Advancing to Round of 32.": "晋级32强。",
    "Advancing to Round of 32 as a top-eight third-place team.":
      "以成绩前八的第三名球队身份晋级32强。",
    "Not advancing": "未晋级",
    "Not advancing. Eliminated at group stage.": "未晋级。小组赛出局。",
    "Outside the top eight third-place teams.": "未进入第三名球队前八。",
    "Eliminated at group stage.": "小组赛出局。",
    "Goal threat": "进球威胁",
    "Group": "小组",
    "Group round": "小组赛",
    "Group standings": "小组积分榜",
    "Group standings are not available for this archived tournament.":
      "这届存档赛事没有可用的小组积分榜。",
    "Group table data is not available for this archived match.":
      "这场存档比赛没有可用的小组表数据。",
    "Knockout bracket is not available for this archived tournament.":
      "这届存档赛事没有可用的淘汰赛对阵。",
    "Group standings should show each current third-place team's cross-group race position.":
      "小组积分榜应显示每支当前第三名球队的跨组排名。",
    "Groups": "小组",
    "Haiti": "海地",
    "Half-time": "半场",
    "Hide Past 24 hours": "隐藏过去24小时",
    "IR Iran": "伊朗",
    "Iraq": "伊拉克",
    "Japan": "日本",
    "Jordan": "约旦",
    "Key information": "关键信息",
    "Key information will be populated based on the opponent.": "关键信息会根据对手补充。",
    "Key information will be populated once this matchup is confirmed.": "这组对阵确认后会补充关键信息。",
    "Key information is not loaded yet.": "关键信息尚未载入。",
    "Advancing now": "当前晋级",
    "Chance": "晋级机会",
    "Chance estimates the team's Round of 32 path from current results and simple remaining-match scenarios.":
      "晋级机会根据当前结果和简单的剩余比赛场景估算球队进入32强的路径。",
    "Inside the top eight best third-place teams.": "目前位列最佳第三名球队前八。",
    "Inside the top eight right now, but close to the cut line.": "目前在前八之内，但接近晋级线。",
    "Just inside": "刚好在内",
    "Just outside": "刚好在外",
    "Knockout context": "淘汰赛背景",
    "Knockout match": "淘汰赛",
    "Knockout path": "淘汰赛路径",
    "Knockout winner progression": "淘汰赛胜者晋级",
    "Likely for now": "当前可能",
    "likely for now": "当前可能",
    "Later matches": "后续比赛",
    "Latest changes": "最新更新",
    "Live": "直播",
    "Live score": "实时比分",
    "Live status is manually verified and should be refreshed after full time.":
      "实时状态为人工核验，完场后应刷新确认。",
    "local": "当地",
    "Loading catch-up notes": "正在加载比赛速览",
    "Loading matches": "正在加载比赛",
    "Loading release notes": "正在加载发布说明",
    "Loading standings": "正在加载积分榜",
    "Local estimate using FIFA rankings. Not betting odds.":
      "基于FIFA排名的本地估算，并非博彩赔率。",
    "Local historical-form estimate. Not betting odds.": "基于历史世界杯状态的本地估算，并非博彩赔率。",
    "Local preview estimate. Not betting odds.": "本地预览估算，并非博彩赔率。",
    "Market consensus based on public odds. Not betting advice.":
      "基于公开赔率的市场共识；这不是投注建议。",
    "Match plan": "比赛计划",
    "Goal scorer": "进球者",
    "Own goal record": "乌龙球记录",
    "Archive standout": "存档代表",
    "Historical lens": "历史视角",
    "Impact sub": "替补冲击",
    "Matches": "赛程",
    "Matches and selected match details": "比赛和已选比赛详情",
    "Mexico": "墨西哥",
    "Morocco": "摩洛哥",
    "Netherlands": "荷兰",
    "New Zealand": "新西兰",
    "No catch-up notes loaded yet": "尚未载入速览",
    "No goals because this match was cancelled.": "本场取消，因此没有进球。",
    "No loaded group-round results yet.": "尚未载入小组赛结果。",
    "No loaded source matches yet.": "尚未载入来源场次。",
    "No loaded World Cup matches found.": "未找到已载入的世界杯比赛。",
    "No next knockout match is loaded yet.": "尚未载入下一场淘汰赛。",
    "Past 24 hours": "过去24小时",
    "Penalty pressure": "点球压力",
    "Player": "球员",
    "Predicted matchup; participants come from current knockout-path estimates.":
      "预测对阵；参赛队来自当前淘汰赛路径估算。",
    "No matches": "没有比赛",
    "No next World Cup month": "没有下一个世界杯月份",
    "No previous World Cup month": "没有上一个世界杯月份",
    "no World Cup matches scheduled": "没有安排世界杯比赛",
    "No scorer data loaded.": "尚未载入进球者数据。",
    "No verified projection is loaded for this fixture yet.":
      "这场比赛尚未载入已核验预测。",
    "No verified senior meetings found before this match.":
      "这场比赛前未找到已核验的成年队交锋记录。",
    "Not loaded": "未载入",
    "Norway": "挪威",
    "One-on-one attackers who can tilt any match": "能靠单挑改变比赛走向的攻击手",
    "cancelled": "已取消",
    "current score": "当前比分",
    "final score": "最终比分",
    "Next": "下一轮",
    "now": "刚刚",
    "Past meetings not loaded yet.": "历史交锋尚未载入。",
    "Past matches": "历史交锋",
    "Past World Cup meetings": "过往世界杯交锋",
    "Path below": "路径见下方",
    "Penalties": "点球",
    "Bench": "替补席",
    "Coach": "主教练",
    "Can struggle with": "可能吃亏",
    "Formation": "阵型",
    "Good at": "擅长",
    "Head Coach": "主教练",
    "Line ups": "阵容",
    "Line-ups": "阵容",
    "Line-ups (prediction)": "预测阵容",
    "Lineups": "阵容",
    "Lineups checked": "阵容核验",
    "Red card": "红牌",
    "Substituted off": "被换下",
    "Substituted on": "替补登场",
    "Yellow card": "黄牌",
    "Position to verify": "位置待确认",
    "Prediction": "预测",
    "Predictions are unofficial.": "预测为非官方内容。",
    "Release notes explain app changes; Data refreshed only shows data freshness.":
      "发布说明解释应用改动；数据刷新时间只表示数据新鲜度。",
    "Previous": "上一轮",
    "Previous matches": "此前比赛",
    "Previous World Cups": "历届世界杯",
    "Play highlights on YouTube": "在 YouTube 播放集锦",
    "Pts": "积分",
    "Panama": "巴拿马",
    "Paraguay": "巴拉圭",
    "Portugal": "葡萄牙",
    "Qatar": "卡塔尔",
    "Quarter-finals": "四分之一决赛",
    "Points rank teams in the group: 3 for a win, 1 for a draw, 0 for a loss. More points usually means a better chance to advance.":
      "积分决定小组排名：胜3分，平1分，负0分。积分越多通常越有机会晋级。",
    "Points compare third-place teams: 3 for a win, 1 for a draw, 0 for a loss. More points puts a team closer to the top eight.":
      "积分用于比较各组第三名球队：胜3分，平1分，负0分。积分越多越接近前八。",
    "FIFA world ranking used for this 2026 tournament view.":
      "此处为本2026赛事视图使用的FIFA世界排名。",
    "Rank": "排名",
    "Read source": "阅读来源",
    "release notes": "发布说明",
    "Report issue": "报告问题",
    "Release notes open in a short tooltip.": "发布说明可通过简短提示框查看。",
    "Result": "赛果",
    "Round of 16": "16强赛",
    "Round of 32": "32强赛",
    "Round path": "晋级路径",
    "Round of 32 as it stands": "当前32强形势",
    "Round of 32 bracket center": "32强对阵中心",
    "Score details are not loaded for this historical record.":
      "这条历史记录尚未载入比分详情。",
    "Score unavailable": "比分不可用",
    "Search country": "搜索国家队",
    "Search country matches": "搜索国家队比赛",
    "Quick combinations looking for sudden final-third moments": "快速配合寻找前场突然机会",
    "Quick passing": "快速传递",
    "Wide switches": "宽度转移",
    "Keeper saves": "门将扑救",
    "Saudi Arabia are a fearless pressing underdog with enough big-moment attackers to punish complacency, led by Salem Al-Dawsari, Firas Al-Buraikan, and Mohammed Al-Owais. Against Uruguay, they want to press in bursts and give Al-Dawsari room to attack the first retreating defender; the risk is Uruguay can turn Valverde's engine and Nunez's depth into chaos.":
      "沙特阿拉伯是敢于逼抢的弱势一方，也有足够的大场面攻击手惩罚松懈，由Salem Al-Dawsari、Firas Al-Buraikan和Mohammed Al-Owais领衔。面对乌拉圭，他们希望阶段性施压，并给Al-Dawsari空间去冲击第一名回撤防守者；风险在于乌拉圭可能把Valverde的奔跑能力和Nunez的纵深冲击转化为混乱。",
    "Saudi Arabia are a fearless pressing underdog with enough big-moment attackers to punish complacency, led by Salem Al-Dawsari, Firas Al-Buraikan, and Mohammed Al-Owais. Against Spain, they want to press in bursts and give Al-Dawsari room to attack the first retreating defender; the risk is Spain can stretch the pitch through Yamal and Williams before Pedri breaks the line.":
      "沙特阿拉伯是敢于逼抢的弱势一方，也有足够的大场面攻击手惩罚松懈，由Salem Al-Dawsari、Firas Al-Buraikan和Mohammed Al-Owais领衔。面对西班牙，他们希望阶段性施压，并给Al-Dawsari空间去冲击第一名回撤防守者；风险在于西班牙可能先通过Yamal和Williams拉宽球场，再由Pedri打穿防线。",
    "Saudi Arabia are a fearless pressing underdog with enough big-moment attackers to punish complacency, led by Salem Al-Dawsari, Firas Al-Buraikan, and Mohammed Al-Owais. Against Cabo Verde, they want to press in bursts and give Al-Dawsari room to attack the first retreating defender; the risk is Cabo Verde can turn a slow match into one decisive Mendes action.":
      "沙特阿拉伯是敢于逼抢的弱势一方，也有足够的大场面攻击手惩罚松懈，由Salem Al-Dawsari、Firas Al-Buraikan和Mohammed Al-Owais领衔。面对佛得角，他们希望阶段性施压，并给Al-Dawsari空间去冲击第一名回撤防守者；风险在于佛得角可能把慢节奏比赛变成Mendes的一次决定性行动。",
    "Saudi Arabia's big-moment wide attacker, trusted to carry counters and take on defenders.":
      "沙特阿拉伯的大场面边路攻击手，负责带动反击并直接挑战防守者。",
    "The mobile striker who links attacks and gives Saudi Arabia a cleaner target in transition.":
      "机动型前锋，能串联进攻，也让沙特阿拉伯在转换中有更清晰的支点。",
    "The experienced goalkeeper, vital if Saudi Arabia spend long stretches defending their box.":
      "经验丰富的门将；如果沙特阿拉伯长时间守在禁区前，他会非常关键。",
    "Relentless passing that breaks defenses apart": "不停传递撕开防线",
    "Wide overloads": "边路人数优势",
    "Counter-press": "丢球后反抢",
    "Interior passing": "肋部传递",
    "Spain are one of the tournament's most polished possession teams, led by Lamine Yamal, Pedri, and Nico Williams. Against Cabo Verde, they want to pin the wide defenders with Yamal and Williams before Pedri plays through the gaps; the risk is Cabo Verde can turn a slow match into one decisive Mendes action.":
      "西班牙是本届赛事最成熟的控球球队之一，由Lamine Yamal、Pedri和Nico Williams领衔。面对佛得角，他们希望先用Yamal和Williams牵制边路防守者，再由Pedri从空当送出传递；风险在于佛得角可能把慢节奏比赛变成Mendes的一次决定性行动。",
    "Spain are one of the tournament's most polished possession teams, led by Lamine Yamal, Pedri, and Nico Williams. Against Saudi Arabia, they want to pin the wide defenders with Yamal and Williams before Pedri plays through the gaps; the risk is Saudi Arabia can turn pressing bursts and Al-Dawsari carries into momentum.":
      "西班牙是本届赛事最成熟的控球球队之一，由Lamine Yamal、Pedri和Nico Williams领衔。面对沙特阿拉伯，他们希望先用Yamal和Williams牵制边路防守者，再由Pedri从空当送出传递；风险在于沙特阿拉伯可能把阶段性逼抢和Al-Dawsari的持球推进转化为势头。",
    "Spain are one of the tournament's most polished possession teams, led by Lamine Yamal, Pedri, and Nico Williams. Against Uruguay, they want to pin the wide defenders with Yamal and Williams before Pedri plays through the gaps; the risk is Uruguay can turn Valverde's engine and Nunez's depth into chaos.":
      "西班牙是本届赛事最成熟的控球球队之一，由Lamine Yamal、Pedri和Nico Williams领衔。面对乌拉圭，他们希望先用Yamal和Williams牵制边路防守者，再由Pedri从空当送出传递；风险在于乌拉圭可能把Valverde的奔跑能力和Nunez的纵深冲击转化为混乱。",
    "Spain's game-breaking wide creator, able to bend low blocks with dribbling, passing, and shot threat.":
      "西班牙能改变比赛的边路创造者，可以用盘带、传球和射门威胁撕开低位防线。",
    "The rhythm setter in open space, making Spain's possession feel calmer and more incisive.":
      "开放空间里的节奏掌控者，让西班牙的控球更从容也更有穿透力。",
    "The vertical winger who turns switches of play into immediate pressure on the box.":
      "纵向冲击型边锋，能把转移球立刻变成禁区压力。",
    "Saudi Arabia": "沙特阿拉伯",
    "Scotland": "苏格兰",
    "Senegal": "塞内加尔",
    "Semi-finals": "半决赛",
    "Shown in current table order. Group ties use FIFA head-to-head before overall goal difference.":
      "按当前积分榜顺序显示；小组同分时先按 FIFA 交锋规则，再看总净胜球。",
    "Show all matches": "显示全部比赛",
    "See release notes": "查看发布说明",
    "See sources": "查看来源",
    "Source links stay available inside the tooltip.": "来源链接仍可在提示框中打开。",
    "Sources now open in a compact hover tooltip.": "来源现在可在紧凑悬停提示框中查看。",
    "Sources:": "来源：",
    "Starter": "首发",
    "Standings": "积分榜",
    "Standings sections": "积分榜分区",
    "Status": "状态",
    "Status shows whether a team is currently inside the top eight third-place places, near the cut line, or outside.":
      "状态显示球队目前是在第三名球队前八内、接近晋级线，还是位于前八之外。",
    "Status shows whether this third-place team is advancing to the Round of 32 or eliminated at the group stage.":
      "状态显示这支第三名球队是晋级32强，还是小组赛出局。",
    "Estimated Round of 32 chance": "预计进入32强机会",
    "Simple model: every unplayed group match is a win, draw, or loss.":
      "简单模型：每场未赛小组赛按胜、平、负三种结果计算。",
    "Counts top-two group finishes plus best-third finishes; not official odds.":
      "同时计算小组前二和最佳第三名晋级路径；不是官方赔率。",
    "The estimate recalculates from the loaded group-stage results.":
      "估算会根据已载入的小组赛结果重新计算。",
    "Can advance either by moving top two or by staying high enough among third-place teams.":
      "既可以升到小组前二晋级，也可以作为排名足够高的第三名晋级。",
    "Best path is to move into the group top two.":
      "最佳路径是升到小组前二。",
    "Route is mainly the best-third table unless it climbs into the top two.":
      "主要路径是最佳第三名排名；如果升到小组前二则直接晋级。",
    "No modeled route reaches the Round of 32 from here.":
      "当前模型下已经没有进入32强的路径。",
    "selected": "已选择",
    "South Africa": "南非",
    "South Korea": "韩国",
    "Spain": "西班牙",
    "Score pending": "当前比分待确认",
    "Sweden": "瑞典",
    "Switzerland": "瑞士",
    "Team": "球队",
    "The match data could not be loaded.": "比赛数据无法载入。",
    "The match data could not be loaded. Refresh the page to try again.":
      "比赛数据无法载入。请刷新页面重试。",
    "The match is marked live, but no verified score is loaded yet.":
      "本场已标记为直播中，但尚未载入已核验比分。",
    "The match view could not be displayed.": "比赛视图无法显示。",
    "The page loaded, but something went wrong while displaying it. Refresh the page to try again.":
      "页面已载入，但显示时出错。请刷新页面重试。",
    "Teams are not known yet. Past match research will load after the matchup is set.":
      "球队尚未确定。对阵确定后会载入历史交锋研究。",
    "The striker Qatar look for when they need a direct finish from limited chances.":
      "卡塔尔需要在有限机会中直接终结时，会寻找这名前锋。",
    "Third-Place Race": "第三名竞争",
    "Third-place play-off": "三四名决赛",
    "Tunisia": "突尼斯",
    "Türkiye": "土耳其",
    "Tie order follows points, goal difference, goals scored, loaded fair-play conduct when available, then FIFA ranking as the final deterministic fallback.":
      "平局排序依次参考积分、净胜球、进球数、已载入的公平竞赛表现，最后以FIFA排名作为确定性兜底。",
    "Needs results elsewhere to move into the top eight.": "需要其他比赛结果帮助才能进入前八。",
    "Next match": "下一场",
    "Next team outside the top eight.": "前八名之外的第一支球队。",
    "Outside now": "当前出局",
    "Tiebreak pending": "决胜规则待确认",
    "Tied on loaded stats; fair-play data decides before FIFA ranking.":
      "已载入数据持平；先看公平竞赛数据，再看FIFA排名。",
    "To be decided": "待定",
    "Today": "今天",
    "today": "今天",
    "Top two in each group advance. The best eight third-place teams also reach the Round of 32.":
      "每组前两名晋级，成绩最好的八支第三名球队也将进入32强。",
    "Tournament": "淘汰赛",
    "Tournament bracket": "淘汰赛对阵",
    "Unable to display matches": "无法显示比赛",
    "Unable to display standings": "无法显示积分榜",
    "The standings data could not be loaded. Refresh the page to try again.":
      "积分榜数据无法载入。请刷新页面重试。",
    "The standings view could not be displayed. Refresh the page to try again.":
      "积分榜视图无法显示。请刷新页面重试。",
    "United States": "美国",
    "Up next": "即将开始",
    "Uruguay": "乌拉圭",
    "Uzbekistan": "乌兹别克斯坦",
    "vs": "对",
    "W-D-L": "胜-平-负",
    "Winner": "胜者",
    "Wins-Draws-Losses shows a team's group record. Wins add points fastest, which helps explain why a team is higher or lower.":
      "胜-平-负显示球队的小组战绩。胜场最快增加积分，有助于解释排名高低。",
    "World Cup Simplified": "世界杯简明指南",
    "World Cup views": "世界杯视图",
    "Yesterday": "昨天",
    "Yesterday and today do not have finished or live match notes yet.":
      "昨天和今天还没有已完赛或直播中的比赛速览。",
    "debutants": "首次参赛球队",
    "ranking": "排名",
    "standings": "积分榜"
  })
);
const ZH_ADDITIONAL_EXACT_TRANSLATIONS = {
  "2. Bundesliga": "德乙",
  "A-League Men": "澳超",
  "Aerial duels": "空中对抗",
  "Aerial pressure": "空中压迫",
  "Aerial targets": "高空目标点",
  "Ahmad bin Ali Stadium": "艾哈迈德·本·阿里体育场",
  "Ahmad bin Ali Stadium, Al Rayyan": "艾哈迈德·本·阿里体育场，赖扬",
  "Aggressive midfield pressure with direct runners": "中场高压配合直接前插",
  "Aggressive wide play with a fearless defensive edge": "大胆边路推进与强硬防守",
  "Al Bayt Stadium": "海湾球场",
  "Al Bayt Stadium, Al Khor": "海湾球场，豪尔",
  "Al Ahly": "开罗国民",
  "Al Janoub Stadium": "贾努布体育场",
  "Al Janoub Stadium, Al Wakrah": "贾努布体育场，沃克拉",
  "Al Thumama Stadium": "阿图玛玛球场",
  "Al Thumama Stadium, Doha": "阿图玛玛球场，多哈",
  Angola: "安哥拉",
  "Athletic pressing with direct attacking bursts": "运动能力压迫和直接进攻爆发",
  "Attacking midfielder": "攻击型中场",
  "Attacking midfielder,": "攻击型中场",
  "Attacking midfielder, forward": "攻击型中场、前锋",
  "Attacking midfielder, left midfielder": "攻击型中场、左中场",
  "Attacking midfielder, left winger": "攻击型中场、左边锋",
  "Attacking midfielder, winger": "攻击型中场、边锋",
  "Winger, attacking midfielder": "边锋、攻击型中场",
  "Back-line command": "后防线指挥",
  "Back-line courage": "后防线出球勇气",
  "Back-line passing": "后防线传球",
  "Back-three cover": "三中卫保护",
  "Ball carrying": "带球推进",
  "Ball winning": "抢回球权",
  "Belgian Pro League": "比利时职业联赛",
  "Between-lines craft": "线间处理",
  Bolivia: "玻利维亚",
  "Bosnia-Herzegovina": "波黑",
  "Box battles": "禁区对抗",
  "Box entries": "进入禁区",
  "Box finishers supplied by runners between the lines": "线间跑动为禁区终结者供给机会",
  "Box finishing": "禁区终结",
  "Box power": "禁区力量",
  "Box presence": "禁区存在感",
  "Box pressure": "禁区压力",
  "Box runs": "禁区前插",
  Bulgaria: "保加利亚",
  Bundesliga: "德甲",
  Cameroon: "喀麦隆",
  "Campeonato Brasileiro Série A": "巴甲",
  "Central midfielder": "中前卫",
  "Central midfielder, Right back": "中前卫、右后卫",
  "Central defender": "中后卫",
  "Central overloads": "中路人数优势",
  "Central rhythm": "中路节奏",
  "Centre-back": "中后卫",
  "Centre-back, Right-back": "中后卫、右后卫",
  "Centre-back, left-back": "中后卫、左后卫",
  "Chance creation": "机会创造",
  "Channel cover": "肋部保护",
  "Channel runs": "肋部前插",
  Chile: "智利",
  China: "中国",
  "Combination flair": "配合灵感",
  "Comfortable turning matches into physical, low-margin contests": "擅长把比赛拖入身体对抗和低容错拉锯",
  "Committed defending with quick outlets through midfield": "投入防守并通过中场快速出球",
  "Compact block": "紧凑防线",
  "Compact cover": "紧凑保护",
  "Compact defending": "紧凑防守",
  "Compact defending with quick counters into space": "紧凑防守后快速反击空间",
  "Compact press": "紧凑压迫",
  "Compact possession builders who need their best attackers to turn long spells into sharper chances": "紧凑控球型球队，需要核心攻击手把长时间控球转化为更锐利机会",
  "Compact shape": "紧凑阵型",
  "Compact shape with counters into the wide lanes": "紧凑阵型后反击边路通道",
  "Compact spacing": "紧凑站位",
  "Compact tournament disruptors who need experience and goalkeeping to keep matches close": "紧凑型搅局者，需要经验和门将表现把比赛咬住",
  "Controlled buildup with defenders who start attacks": "由后卫发起的可控推进",
  "Costa Rica": "哥斯达黎加",
  "Counter attacks": "反击",
  "Counter runs": "反击跑动",
  "Counter timing": "反击时机",
  "Counter width": "反击宽度",
  "Counterattacking underdogs who can stay in games if their goalkeeper and forwards give them belief": "反击型弱势方，若门将和前锋带来信心就能咬住比赛",
  "Counterattacking width with clever movement off the striker": "反击宽度配合前锋身边的聪明跑动",
  "Creative midfield passing with sudden attacking spark": "中场创造性传球和突然进攻火花",
  "Creative passing": "创造性传球",
  "Creative passing supply with attackers between lines": "创造性传球供给线间攻击手",
  "Croatian Football League": "克罗地亚足球联赛",
  "Cross volume": "传中数量",
  Cuba: "古巴",
  "Czech Republic": "捷克共和国",
  Czechoslovakia: "捷克斯洛伐克",
  "Deep block": "深位防守",
  "Deep buildup": "后场组织",
  "Deep resilience": "深位韧性",
  "Defender": "后卫",
  "Defensive block": "防守阵型",
  "Defensive control": "防守控制",
  "Defensive grit": "防守韧性",
  "Defensive grit with fast breaks through the channels": "防守韧性配合肋部快速反击",
  "Defensive midfielder": "防守型中场",
  "Defensive midfielder, centre-back": "防守型中场、中后卫",
  "Depth scoring": "纵深得分",
  Denmark: "丹麦",
  "Diagonal runs": "斜向跑动",
  "Direct attacking underdog with enough forward power to punish loose defending": "直接进攻型弱势方，锋线力量足以惩罚松散防守",
  "Direct combinations": "直接配合",
  "Direct counters": "直接反击",
  "Direct outlets": "直接出球点",
  "Direct pace and physical pressure in transition": "转换中的直接速度和身体压力",
  "Direct service": "直接传送",
  "Direct supply into elite penalty-box finishing": "直接供给顶级禁区终结",
  "Direct target play and committed box defending": "直接支点打法和投入的禁区防守",
  "Disciplined defensive shape with dangerous transitions": "纪律严明的防守阵型和危险转换",
  "Disciplined, dangerous side whose structure lets their flair players attack with freedom": "纪律严明且危险的球队，结构让天才球员自由进攻",
  "Duel pressure": "对抗压力",
  "Duel strength": "对抗强度",
  "Dutch East Indies": "荷属东印度",
  "East Germany": "东德",
  "Early crosses": "早传中",
  "Early service": "早供给",
  "Early shots": "早射门",
  "Education City Stadium": "教育城体育场",
  "Education City Stadium, Al Rayyan": "教育城体育场，赖扬",
  "EFL Championship": "英冠",
  "El Salvador": "萨尔瓦多",
  "Egyptian Premier League": "埃及超级联赛",
  "Eredivisie": "荷甲",
  "Explosive runners turning pressure into open-field danger": "爆发型跑动者把压力转为开阔地威胁",
  "Explosive transitions layered over deep attacking talent": "深厚进攻天赋叠加爆发转换",
  "Explosive wide attacks that stretch back lines": "拉开后防线的爆发边路进攻",
  "Fast breaks backed by elite recovery defending": "快速反击配合顶级回追防守",
  "Fast counters": "快速反击",
  "Fast right-sided attacks with direct goal threat": "右路快速进攻和直接进球威胁",
  "Final Round": "决赛轮",
  "Final-third depth": "前场纵深",
  "Final-third pressure": "前场压力",
  "First round": "第一轮",
  "First round, Replays": "第一轮重赛",
  "Fluid attacking rotations with ruthless central control": "流动进攻轮转和强势中路控制",
  "Forward": "前锋",
  "Forward depth": "前锋纵深",
  "Forward power": "锋线力量",
  "Forward press": "前场压迫",
  "Forward, attacking midfielder": "前锋、攻击型中场",
  "Forward, left winger": "前锋、左边锋",
  "Forward, winger": "前锋、边锋",
  "Fullback service": "边后卫输送",
  "Fullback thrust": "边后卫前插",
  "Goalkeeper": "门将",
  Greece: "希腊",
  "Group 1 Play-off": "第1组附加赛",
  "Group 2 Play-off": "第2组附加赛",
  "Group 3 Play-off": "第3组附加赛",
  "Group 4 Play-off": "第4组附加赛",
  "Half-space passing": "肋部传球",
  "Half-space runs": "肋部跑动",
  "High circulation": "高位流转",
  "High press": "高位压迫",
  "High pressing designed to turn recoveries into shots": "高压逼抢力求把夺回球权转成射门",
  "High-energy pressing with vertical midfield punch": "高能压迫和中场纵向冲击",
  Honduras: "洪都拉斯",
  Hungary: "匈牙利",
  Iceland: "冰岛",
  Iran: "伊朗",
  Iraq: "伊拉克",
  "Iraq Stars League": "伊拉克星级联赛",
  Ireland: "爱尔兰",
  Israel: "以色列",
  Italy: "意大利",
  Jamaica: "牙买加",
  "Khalifa International Stadium": "哈利法国际体育场",
  "Khalifa International Stadium, Al Rayyan": "哈利法国际体育场，赖扬",
  Kuwait: "科威特",
  "La Liga": "西甲",
  Leadership: "领导力",
  "League of Ireland Premier Division": "爱尔兰超级联赛",
  "Left Back": "左后卫",
  "Left balance": "左路平衡",
  "Left winger": "左边锋",
  "Left winger, forward": "左边锋、前锋",
  "Left winger, left midfielder": "左边锋、左中场",
  "Left-back": "左后卫",
  "Left-footed creativity driving patient attacks": "左脚创造力驱动耐心进攻",
  "Left-side pace": "左路速度",
  "Liga MX": "墨西哥超级联赛",
  "Liga Portugal 2": "葡甲二级联赛",
  "Ligue 1": "法甲",
  "Link-up play": "串联配合",
  "Long diagonals": "长距离斜传",
  "Long shots": "远射",
  "Long-range shooting": "远射",
  "Loose-ball pressure": "二点球压力",
  "Low block": "低位防守",
  "Lusail Iconic Stadium": "卢赛尔体育场",
  "Lusail Iconic Stadium, Lusail": "卢赛尔体育场，卢赛尔",
  "Major League Soccer": "美国职业足球大联盟",
  "Malaysia Super League": "马来西亚超级联赛",
  "Match for third place": "季军赛",
  "Matchday 1": "第1比赛日",
  "Matchday 2": "第2比赛日",
  "Matchday 3": "第3比赛日",
  "Matchday 4": "第4比赛日",
  "Matchday 5": "第5比赛日",
  "Matchday 6": "第6比赛日",
  "Matchday 7": "第7比赛日",
  "Matchday 8": "第8比赛日",
  "Matchday 9": "第9比赛日",
  "Matchday 10": "第10比赛日",
  "Matchday 11": "第11比赛日",
  "Matchday 12": "第12比赛日",
  "Matchday 13": "第13比赛日",
  "Matchday 14": "第14比赛日",
  "Matchday 15": "第15比赛日",
  "Midfield balance": "中场平衡",
  "Midfield bite": "中场硬度",
  "Midfield control": "中场控制",
  "Midfield duels": "中场对抗",
  "Midfield patience that keeps matches under control": "用中场耐心掌控比赛",
  "Midfield power": "中场力量",
  "Midfield press": "中场压迫",
  "Midfield shield": "中场屏障",
  "Midfield tempo": "中场节奏",
  "Midfield tempo with brave fullback support": "中场节奏配合大胆边后卫支援",
  "Midfield traps": "中场陷阱",
  "Midfielder": "中场",
  "Midfielder, forward": "中场、前锋",
  "Midfielder, right-back": "中场、右后卫",
  Movement: "跑动",
  "New Zealand's target striker and clearest scoring route, especially from crosses and second balls.": "新西兰的支点中锋和最清晰得分路径，尤其来自传中和二点球。",
  Nigeria: "尼日利亚",
  "North Korea": "朝鲜",
  "Northern Ireland": "北爱尔兰",
  "Open-field runs": "开阔地跑动",
  "Organized block": "有组织防守阵型",
  "Organized defending with a brave buildup spine": "有组织防守配合勇敢中轴出球",
  "Organized defensive side that need energy and directness to make their structure bite": "有组织防守型球队，需要活力和直接性让结构更有威胁",
  "Organized disruptor side that can make matches uncomfortable through midfield control and wide thrust": "有组织的搅局者，能靠中场控制和边路推进让比赛变得难受",
  "Organized pressure and relentless midfield running": "有组织压迫和不懈中场跑动",
  "Patient counters with wide delivery and deep resilience": "耐心反击、边路输送和深位韧性",
  "Patient possession looking for sudden final-third craft": "耐心控球寻找前场突然巧思",
  "Persian Gulf Pro League": "波斯湾职业联赛",
  Peru: "秘鲁",
  "Physical control with direct runners behind": "身体控制配合身后直接跑动",
  "Physical duels": "身体对抗",
  "Physical forward play built for open-field breaks": "为开阔地反击打造的身体型锋线打法",
  "Pocket passing": "小空间传递",
  Poland: "波兰",
  "Possession patience": "控球耐心",
  "Power through midfield with pace on the edges": "中场力量配合边路速度",
  "Precise, fast-passing side that can make possession feel sudden and sharp": "精准快速传递型球队，能让控球突然变得锐利",
  "Preliminary round": "预赛轮",
  "Premier League": "英超",
  "Press control": "压迫控制",
  "Press escape": "摆脱压迫",
  "Press resistance": "抗压能力",
  Pressing: "压迫",
  "Pressing forwards and midfield control protect the rhythm": "前锋压迫与中场控制保护节奏",
  "Pressing lines": "压迫线",
  "Pressing traps": "压迫陷阱",
  "Pressing waves": "连续压迫",
  "Portland Timbers": "波特兰伐木者",
  "Primeira Liga": "葡超",
  Pyramids: "金字塔俱乐部",
  "Qatar Stars League": "卡塔尔星级联赛",
  Quarterfinals: "四分之一决赛",
  "Quick releases": "快速出球",
  "Quick rotations": "快速轮转",
  "Relentless running and delivery from wide zones": "不懈跑动和边路输送",
  "Right winger": "右边锋",
  "Right winger/right midfielder": "右边锋/右中场",
  "Right-back": "右后卫",
  "Right-side breaks": "右路突破",
  Romania: "罗马尼亚",
  Russia: "俄罗斯",
  "Russian Premier League": "俄超",
  "Runs in behind": "身后前插",
  "Saudi First Division League": "沙特甲级联赛",
  "Saudi Pro League": "沙特职业联赛",
  Segunda: "西乙",
  "Segunda División": "西乙",
  Serbia: "塞尔维亚",
  "Serbia and Montenegro": "塞尔维亚和黑山",
  "Serie A": "意甲",
  "Set pieces": "定位球",
  "Set-piece bite": "定位球威胁",
  "Set-piece threat": "定位球威胁",
  "Set-piece threat with hard-running midfield cover": "定位球威胁配合勤跑中场保护",
  "Second balls": "二点球",
  "Shot stopping": "扑救",
  "Shot-stopping": "扑救",
  Slovakia: "斯洛伐克",
  Slovenia: "斯洛文尼亚",
  "South African Premiership": "南非超级联赛",
  "Soviet Union": "苏联",
  "Streetwise counterattacking side with experienced forwards who understand tournament margins": "老练反击型球队，经验前锋懂得杯赛细节",
  "Striker": "中锋",
  "Striker, Left winger": "中锋、左边锋",
  "Striker, left winger": "中锋、左边锋",
  "Striker, winger": "中锋、边锋",
  "Structured midfield control with disciplined spacing": "结构化中场控制和纪律站位",
  "Stadium 974": "974体育场",
  "Stadium 974, Doha": "974体育场，多哈",
  "Super League Greece": "希腊超级联赛",
  "Switches": "转移球",
  "Süper Lig": "土超",
  "Target outlets": "支点出球",
  "Target play": "支点打法",
  "Target play and physical duels define the rhythm": "支点打法和身体对抗决定节奏",
  "Technical depth creating chances from every lane": "技术深度从各路创造机会",
  "Technical midfield": "技术型中场",
  "Technical tempo and quick rotations between lines": "技术节奏和线间快速轮转",
  "Tempo control": "节奏控制",
  "TFF First League": "土耳其甲级联赛",
  "Third place match": "季军赛",
  "Third place play-off": "季军附加赛",
  "Third-man runs": "第三人跑动",
  "Third-place match": "季军赛",
  "Third-place play-off": "季军附加赛",
  "Togo": "多哥",
  "Trinidad and Tobago": "特立尼达和多巴哥",
  Turkey: "土耳其",
  "Two-forward pressure with polished penalty-box work": "双前锋压力和成熟禁区处理",
  "Two-striker threat": "双前锋威胁",
  "UAE Pro League": "阿联酋职业联赛",
  Ukraine: "乌克兰",
  "United Arab Emirates": "阿联酋",
  USA: "美国",
  "Veteran control trying to slow games into detail": "老将控制力试图把比赛放慢到细节",
  "Vertical pressure around a sharp box finisher": "围绕敏锐禁区终结者的纵向压力",
  "Vertical runs": "纵向跑动",
  Wales: "威尔士",
  "West Germany": "西德",
  "Wide combinations": "边路配合",
  "Wide counters": "边路反击",
  "Wide craft": "边路技巧",
  "Wide delivery": "边路输送",
  "Wide dribbles": "边路盘带",
  "Wide flair": "边路灵感",
  "Wide isolation": "边路单挑",
  "Wide midfielder, attacking midfielder": "边中场、攻击型中场",
  "Wide pace": "边路速度",
  "Wide pressing": "边路压迫",
  "Wide release": "边路出球",
  "Wide speed": "边路速度",
  "Wide surges": "边路冲击",
  "Wide threat": "边路威胁",
  "Wing flair and midfield invention in constant motion": "边路灵感与中场创造持续流动",
  "Wing rotations": "边路轮转",
  "Wingback thrust": "翼卫推进",
  "wing-back": "翼卫",
  Winger: "边锋",
  "Winger, Attacking Midfielder": "边锋、攻击型中场",
  "Winger, attacking midfielder": "边锋、攻击型中场",
  "Winger, forward": "边锋、前锋",
  winger: "边锋",
  "World Cup 1930": "1930年世界杯",
  "World Cup 1934": "1934年世界杯",
  "World Cup 1938": "1938年世界杯",
  "World Cup 1950": "1950年世界杯",
  "World Cup 1954": "1954年世界杯",
  "World Cup 1958": "1958年世界杯",
  "World Cup 1962": "1962年世界杯",
  "World Cup 1966": "1966年世界杯",
  "World Cup 1970": "1970年世界杯",
  "World Cup 1974": "1974年世界杯",
  "World Cup 1978": "1978年世界杯",
  "World Cup 1982": "1982年世界杯",
  "World Cup 1986": "1986年世界杯",
  "World Cup 1990": "1990年世界杯",
  "World Cup 1994": "1994年世界杯",
  "World Cup 1998": "1998年世界杯",
  "World Cup 2002": "2002年世界杯",
  "World Cup 2006": "2006年世界杯",
  "World Cup 2010": "2010年世界杯",
  "World Cup 2014": "2014年世界杯",
  "World Cup 2018": "2018年世界杯",
  "World Cup 2022": "2022年世界杯",
  Yugoslavia: "南斯拉夫",
  Zaire: "扎伊尔",
  "1-1 keeps Group K open and gives both teams something to carry into the next match.":
    "1-1让K组仍有悬念，也给双方带来下一场的延续点。",
  "Caleb Yirenkyi scored in stoppage time to settle a tense opener in Toronto.":
    "Caleb Yirenkyi补时破门，在多伦多结束了这场紧张的首战。",
  "Colombia take control of Group K": "哥伦比亚掌控K组局面",
  "Colombia's 3-1 win over Uzbekistan moves them top after the opening Group K matches.":
    "哥伦比亚3-1击败乌兹别克斯坦，在K组首轮比赛后升至榜首。",
  "Czechia and South Africa share tense draw": "捷克与南非紧张战平",
  "Czechia scored early through Michal Sadilek, but Teboho Mokoena's late penalty earned South Africa a 1-1 draw in Group A.":
    "捷克由Michal Sadilek早早破门，但Teboho Mokoena最后阶段点球帮助南非在A组1-1战平。",
  "England look sharp against Croatia": "英格兰面对克罗地亚状态锐利",
  "England match centre": "英格兰比赛中心",
  "England's 4-2 win gives them an early foothold in Group L.":
    "英格兰4-2取胜，让他们在L组早早占住位置。",
  "FIFA match report": "FIFA比赛报告",
  "France 3-1 Senegal": "法国3-1塞内加尔",
  "Ghana leave it late against Panama": "加纳最后时刻击败巴拿马",
  "Ghana's 1-0 win puts them level with England on three points in Group L.":
    "加纳1-0取胜后在L组与英格兰同积3分。",
  "Guardian live report": "卫报实时战报",
  "Guardian match report": "卫报比赛报告",
  "Golden Boot race": "金靴奖竞争",
  "Harry Kane scored twice, while Jude Bellingham and Marcus Rashford added second-half goals.":
    "Harry Kane梅开二度，Jude Bellingham和Marcus Rashford下半场也取得进球。",
  "Joao Neves headed Portugal in front early, while Yoane Wissa's equalizer gave DR Congo the point.":
    "Joao Neves早早头球帮助葡萄牙领先，Yoane Wissa的扳平球让刚果民主共和国拿到1分。",
  "Johan Manzambi scored twice after halftime as Switzerland beat Bosnia and Herzegovina 4-1 to move top of Group B.":
    "Johan Manzambi下半场梅开二度，瑞士4-1击败波黑并升至B组榜首。",
  "Kylian Mbappé scored twice as France beat Senegal 3-1 in their Group I opener on June 16.":
    "Kylian Mbappé梅开二度，法国在6月16日的I组首战中3-1击败塞内加尔。",
  "Lionel Messi scored all three goals as Argentina beat Algeria 3-0 to start their World Cup defence.":
    "Lionel Messi包办三球，阿根廷3-0击败阿尔及利亚开启世界杯卫冕之旅。",
  "Luis Diaz scored and helped Colombia answer Uzbekistan's first World Cup goal before Jaminton Campaz sealed it late.":
    "Luis Diaz破门并帮助哥伦比亚回应乌兹别克斯坦队史世界杯首球，Jaminton Campaz最后阶段锁定胜局。",
  "Manzambi sparks Swiss surge past Bosnia": "Manzambi带动瑞士击败波黑",
  "Mbappé brace lifts France past Senegal": "Mbappé梅开二度助法国击败塞内加尔",
  "Mbappé double carries France past Iraq": "姆巴佩梅开二度带法国击败伊拉克",
  "Messi hat trick opens Argentina's title defence": "Messi帽子戏法开启阿根廷卫冕之旅",
  "Messi brace sends Argentina through": "梅西梅开二度送阿根廷晋级",
  "Lionel Messi scored in the 38th and 90+5th minutes as Argentina beat Austria 2-0 in Group J.":
    "利昂内尔·梅西在第38分钟和90+5分钟破门，阿根廷在J组2-0击败奥地利。",
  "Austria's press kept the match scrappy, but Argentina's midfield recovered control and the late pressure finally broke through.":
    "奥地利的逼抢让比赛很零碎，但阿根廷中场重新掌控节奏，最后阶段的持续压力终于打开局面。",
  "Bundesliga match report": "德甲官网比赛报告",
  "Kylian Mbappé scored in the 14th and 54th minutes before Ousmane Dembélé added the third in a storm-delayed 3-0 win.":
    "基利安·姆巴佩在第14和第54分钟破门，奥斯曼·登贝莱随后打入第三球，法国在一场因暴风雨延迟的比赛中3-0取胜。",
  "Iraq played out bravely early, but two build-out mistakes after the long weather delay let France kill the match.":
    "伊拉克开局勇敢地从后场组织，但漫长天气延迟后的两次后场出球失误让法国杀死比赛。",
  "Mbappe made France's opener a super goal, crossing over past Viktor Gyokeres and finishing across goal.":
    "姆巴佩把法国首球踢成神仙球，连续踩单车晃过维克托·约克雷斯后横射破门。",
  "Olise shaped France's attack with two assists, teeing up Barcola before sliding Mbappe through for the third.":
    "奥利塞用两次助攻塑造法国进攻，先助攻巴尔科拉破门，又直塞姆巴佩打入第三球。",
  "Nusa curled Norway in front before Amad Diallo came off the bench to clear one off the line and equalize.":
    "努萨弧线球帮助挪威领先，随后阿马德·迪亚洛替补登场，先门线解围再扳平比分。",
  "Berg's late run set up Haaland's winner, and Nyland's stoppage time save protected Norway's first knockout win.":
    "贝格最后阶段前插助攻哈兰德制胜，尼兰补时扑救守住挪威队史首场世界杯淘汰赛胜利。",
  "Japan frustrated Brazil for long spells, with Takehiro Tomiyasu keeping Vinicius Junior quiet and Zion Suzuki answering pressure.":
    "日本长时间让巴西踢得不舒服，富安健洋限制住维尼修斯·儒尼奥尔，铃木彩艳也不断化解压力。",
  "Kaishu Sano rattled Brazil first, forcing the favorite to chase the match after the 29th-minute opener.":
    "佐野海舟先让巴西紧张起来，第29分钟首开纪录后迫使热门球队追赶比赛。",
  "Stephen Eustaquio broke through in stoppage time, leaving South Africa chasing a 1-0 match.":
    "斯蒂芬·欧斯塔基奥在补时阶段打破僵局，让南非追赶这场1-0。",
  "Canada kept South Africa out at the other end and turned the late goal into a knockout win.":
    "加拿大在另一端守住南非，并把这个最后阶段的进球变成淘汰赛胜利。",
  "Enciso headed Paraguay in front from Galarza's cross before Havertz redirected Wirtz's delivery for Germany's 54th-minute equalizer.":
    "恩西索接加拉尔萨传中头球破门让巴拉圭领先，随后哈弗茨把维尔茨的传中改写为德国第54分钟扳平球。",
  "Paraguay spent long stretches in a compact 4-5-1, making Germany's possession feel blunt until extra time and a disallowed Tah header.":
    "巴拉圭大部分时间保持紧凑的4-5-1，让德国的控球显得迟钝，直到加时赛塔赫的头球被判无效。",
  "Gill saved from Havertz and Woltemade before Jose Canale sealed Paraguay's 4-3 shootout win.":
    "吉尔先后扑出哈弗茨和沃尔特马德的点球，随后何塞·卡纳莱锁定巴拉圭4-3的点球胜利。",
  "Cody Gakpo broke through in the 72nd minute, but Issa Diop answered in stoppage time to force extra time.":
    "加克波第72分钟打破僵局，但迪奥普补时扳平，把比赛拖入加时。",
  "Morocco changed the match with young substitutes and kept creating through Saibari during a wild, physical finish.":
    "摩洛哥的年轻替补改变比赛，并在疯狂又身体对抗激烈的收官阶段继续通过萨伊巴里制造机会。",
  "Saibari converted the deciding penalty after five misses in the shootout, sending Morocco to Canada in the last 16.":
    "五次罚失后的点球大战里，萨伊巴里罚入决定性点球，送摩洛哥进入对加拿大的16强赛。",
  "Julian Quinones turned in Alvarado's 22nd-minute delivery, then Raul Jimenez finished Quinones's pass nine minutes later.":
    "基尼奥内斯第22分钟接阿尔瓦拉多传球破门，随后9分钟后又助攻劳尔·希门尼斯扩大比分。",
  "Mexico's first-half pressure lifted the home crowd in Mexico City, and their defense protected a fourth straight World Cup clean sheet.":
    "墨西哥的上半场压迫带动了墨西哥城主场球迷，防线则守住本届世界杯连续第四场零封。",
  "Hincapie's stoppage-time red card closed Ecuador's night, while Mexico moved on to face England or DR Congo.":
    "因卡皮耶补时染红为厄瓜多尔之夜画上句号，墨西哥则晋级面对英格兰或刚果民主共和国。",
  "Brian Cipenga stunned England in the 7th minute from Chancel Mbemba's assist, but Harry Kane answered twice late from Anthony Gordon service.":
    "布莱恩·奇彭加第7分钟接尚塞尔·姆本巴助攻让英格兰震惊，但哈里·凯恩最后阶段两次接安东尼·戈登的传球回应。",
  "England spent most of the match frustrated by DR Congo's block and Lionel Mpasi's saves before Gordon, Saka, and Eze shifted the pressure after the hour.":
    "英格兰大部分时间被刚果民主共和国的防守阵型和利昂内尔·姆帕西的扑救压住，直到戈登、萨卡和埃泽在一小时后改变压力。",
  "Kane headed in the 75th-minute equalizer, then cut across the edge of the box and drove the 86th-minute winner into the top corner.":
    "凯恩第75分钟头球扳平，随后在禁区弧附近横向调整，并在第86分钟把制胜球轰入上角。",
  "Portugal and DR Congo split the points": "葡萄牙与刚果民主共和国各取一分",
  "Raúl Rangel made a huge late double save.": "Raúl Rangel最后阶段完成关键连续两连扑。",
  "Switzerland 4-1 Bosnia and Herzegovina": "瑞士4-1波黑",
  "Casemiro pulled Brazil level after halftime before Gabriel Martinelli won it deep into stoppage time.":
    "卡塞米罗下半场为巴西扳平，加布里埃尔·马丁内利随后在补时深段打入制胜球。",
  "an opponent": "对手",
  "forward": "前锋",
  "midfielder": "中场",
  "own goal": "乌龙球",
  "pen.": "点球",
  "pens": "点球",
  "right-back": "右后卫",
  "score unavailable": "比分不可用"
};

const ZH_PLAYER_NAME_TRANSLATIONS = {
  "Anthony Gordon": "安东尼·戈登",
  "Aaron Tshibola": "阿龙·奇博拉",
  "Arthur Masuaku": "阿图尔·马苏亚库",
  "Axel Tuanzebe": "阿克塞尔·图安泽贝",
  "Brian Cipenga": "布赖恩·奇彭加",
  "Cedric Bakambu": "塞德里克·巴坎布",
  "Chancel Mbemba": "尚塞尔·姆本巴",
  "Charles Pickel": "查尔斯·皮克尔",
  "Dan Burn": "丹·伯恩",
  "Dean Henderson": "迪恩·亨德森",
  "Djed Spence": "杰德·斯彭斯",
  "Dylan Batubinsika": "迪伦·巴图宾西卡",
  "Eberechi Eze": "埃贝雷奇·埃泽",
  "Edo Kayembe": "埃多·卡延贝",
  "Elliot Anderson": "埃利奥特·安德森",
  "Ezri Konsa": "埃兹里·孔萨",
  "Fiston Mayele": "菲斯顿·马耶莱",
  "Gael Kakuta": "盖尔·卡库塔",
  "Gedeon Kalulu": "热代翁·卡卢卢",
  "Ivan Toney": "伊万·托尼",
  "James Trafford": "詹姆斯·特拉福德",
  "Jarell Quansah": "贾雷尔·宽萨",
  "John Stones": "约翰·斯通斯",
  "Joris Kayembe": "约里斯·卡延贝",
  "Jordan Henderson": "乔丹·亨德森",
  "Kobbie Mainoo": "科比·梅努",
  "Lionel Mpasi": "利昂内尔·姆帕西",
  "Marc Guehi": "马克·格伊",
  "Matthieu Epolo": "马蒂厄·埃波洛",
  "Meschack Elia": "梅沙克·埃利亚",
  "Morgan Rogers": "摩根·罗杰斯",
  "Nathanael Mbuku": "纳塔纳埃尔·姆布库",
  "Ngalayel Mukau": "恩加拉耶尔·穆考",
  "Nico O'Reilly": "尼科·奥赖利",
  "Noni Madueke": "诺尼·马杜埃凯",
  "Ollie Watkins": "奥利·沃特金斯",
  "Reece James": "里斯·詹姆斯",
  "Samuel Moutoussamy": "萨穆埃尔·穆图萨米",
  "Simon Banza": "西蒙·班扎",
  "Steve Kapuadi": "史蒂夫·卡普阿迪",
  "Theo Bongonda": "泰奥·邦贡达",
  "Timothy Fayulu": "蒂莫西·法尤卢",
  "Trevoh Chalobah": "特雷沃·查洛巴",
  "Aaron Wan-Bissaka": "阿龙·万-比萨卡",
  "Abbosbek Fayzullaev": "阿博斯别克·法伊祖拉耶夫",
  "Abdukodir Khusanov": "阿卜杜科迪尔·胡萨诺夫",
  "Abduvohid Nematov": "阿卜杜沃希德·内马托夫",
  "Achraf Hakimi": "阿什拉夫·哈基米",
  "Adalberto Carrasquilla": "阿达尔贝托·卡拉斯基利亚",
  "Adam Hložek": "亚当·赫洛热克",
  "Akram Afif": "阿克拉姆·阿菲夫",
  "Alexander Isak": "亚历山大·伊萨克",
  "Alvaro Fidalgo": "阿尔瓦罗·菲达尔戈",
  "Ali Jasim": "阿里·贾西姆",
  "Ali Olwan": "阿里·奥尔万",
  "Alireza Jahanbakhsh": "阿里雷扎·贾汉巴赫什",
  "Almoez Ali": "阿尔莫埃兹·阿里",
  "Alphonso Davies": "阿方索·戴维斯",
  "Álvaro Fidalgo": "阿尔瓦罗·菲达尔戈",
  "Amad Diallo": "阿马德·迪亚洛",
  "Amine Gouiri": "阿明·古伊里",
  "Andy Robertson": "安迪·罗伯逊",
  "Antoine Griezmann": "安托万·格列兹曼",
  "Antoine Semenyo": "安托万·塞梅尼奥",
  "Antonio Nusa": "安东尼奥·努萨",
  "Arda Güler": "阿尔达·居莱尔",
  "Aymen Hussein": "艾曼·侯赛因",
  "Ayase Ueda": "上田绮世",
  "Ayoub El Kaabi": "阿尤布·埃尔卡比",
  "Brahim Díaz": "布拉欣·迪亚斯",
  "Breel Embolo": "布雷尔·恩博洛",
  "Bruno Fernandes": "布鲁诺·费尔南德斯",
  Casemiro: "卡塞米罗",
  "Chris Wood": "克里斯·伍德",
  "Christian Pulisic": "克里斯蒂安·普利希奇",
  "Cody Gakpo": "科迪·加克波",
  "Cristian Volpato": "克里斯蒂安·沃尔帕托",
  "Cristiano Ronaldo": "克里斯蒂亚诺·罗纳尔多",
  "Daichi Kamada": "镰田大地",
  "Darwin Núñez": "达尔温·努涅斯",
  "David Alaba": "大卫·阿拉巴",
  "Declan Rice": "德克兰·赖斯",
  "Duckens Nazon": "杜肯斯·纳松",
  "Edin Džeko": "埃丁·哲科",
  "Edson Álvarez": "埃德森·阿尔瓦雷斯",
  "Eldor Shomurodov": "埃尔多尔·肖穆罗多夫",
  "Elias Saad": "埃利亚斯·萨阿德",
  "Ellyes Skhiri": "埃利耶斯·斯希里",
  "Emiliano Martínez": "埃米利亚诺·马丁内斯",
  "Enner Valencia": "恩纳·瓦伦西亚",
  "Enzo Fernández": "恩佐·费尔南德斯",
  "Erling Haaland": "埃尔林·哈兰德",
  "Esmir Bajraktarević": "埃斯米尔·巴伊拉克塔雷维奇",
  "Evann Guessand": "埃万·盖桑",
  "Federico Valverde": "费德里科·巴尔韦德",
  "Finn Surman": "芬恩·瑟曼",
  "Firas Al-Buraikan": "菲拉斯·布赖坎",
  "Florian Wirtz": "弗洛里安·维尔茨",
  "Franck Kessié": "弗兰克·凯西",
  "Gabriel Martinelli": "加布里埃尔·马丁内利",
  "Frantzdy Pierrot": "弗朗茨迪·皮埃罗",
  "Frenkie de Jong": "弗兰基·德容",
  "Granit Xhaka": "格拉尼特·扎卡",
  "Gustavo Gómez": "古斯塔沃·戈麦斯",
  "Hakan Çalhanoğlu": "哈坎·恰尔汗奥卢",
  "Hannibal Mejbri": "汉尼拔·梅杰布里",
  "Harry Kane": "哈里·凯恩",
  "Homam Ahmed": "霍马姆·艾哈迈德",
  "Houssem Aouar": "侯赛姆·奥亚尔",
  "Ismael Díaz": "伊斯梅尔·迪亚斯",
  "Ismaël Bennacer إِسْمَاعِيل بِن نَاصِر": "伊斯梅尔·本纳塞尔",
  "Iñaki Williams": "伊尼亚基·威廉姆斯",
  "Jackson Irvine": "杰克逊·欧文",
  "Jamal Musiala": "贾马尔·穆西亚拉",
  "James Rodríguez": "哈梅斯·罗德里格斯",
  "Jean-Ricner Bellegarde": "让-里克内尔·贝勒加德",
  "John McGinn": "约翰·麦金",
  "Jonathan David": "乔纳森·戴维",
  "Jordan Ayew": "乔丹·阿尤",
  "Joshua Kimmich": "约书亚·基米希",
  "Joško Gvardiol": "约什科·格瓦迪奥尔",
  "Jude Bellingham": "裘德·贝林厄姆",
  "Julio César Enciso": "胡利奥·塞萨尔·恩西索",
  "Julián Alvarez": "胡利安·阿尔瓦雷斯",
  "Julián Álvarez": "胡利安·阿尔瓦雷斯",
  "Juninho Bacuna": "儒尼尼奥·巴库纳",
  "Kaishu Sano": "佐野海舟",
  "Kaishū Sano": "佐野海舟",
  "Jérémy Doku": "杰里米·多库",
  "Kalidou Koulibaly": "卡利杜·库利巴利",
  "Kenan Yıldız": "凯南·伊尔迪兹",
  "Kevin De Bruyne": "凯文·德布劳内",
  "Kim Min-jae": "金玟哉",
  "Konrad Laimer": "康拉德·莱默",
  "Kylian Mbappé": "基利安·姆巴佩",
  "Lamine Yamal": "拉明·亚马尔",
  "Leandro Bacuna": "莱安德罗·巴库纳",
  "Leandro Trossard": "莱安德罗·特罗萨德",
  "Lee Kang-in": "李刚仁",
  "Liberato Cacace": "利贝拉托·卡卡切",
  "Luis Chávez": "路易斯·查韦斯",
  "Luis Díaz": "路易斯·迪亚斯",
  "Luis Diaz": "路易斯·迪亚斯",
  "Luis Suárez": "路易斯·苏亚雷斯",
  "Luka Modrić": "卢卡·莫德里奇",
  "Lyle Foster": "莱尔·福斯特",
  "Manuel Akanji": "曼努埃尔·阿坎吉",
  "Marcel Sabitzer": "马塞尔·萨比策",
  "Martin Ødegaard": "马丁·厄德高",
  "Mateo Chavez": "马特奥·查韦斯",
  "Mateo Chávez": "马特奥·查韦斯",
  "Mateo Kovačić": "马特奥·科瓦契奇",
  "Mathew Ryan": "马修·瑞安",
  "Mehdi Taremi": "迈赫迪·塔雷米",
  "Michael Amir Murillo": "迈克尔·阿米尔·穆里略",
  "Michael Olise": "迈克尔·奥利塞",
  "Miguel Almirón": "米格尔·阿尔米隆",
  "Mohamed Salah": "穆罕默德·萨拉赫",
  "Mohammed Al-Owais": "穆罕默德·奥韦斯",
  "Moisés Caicedo": "莫伊塞斯·凯塞多",
  "Mostafa Mohamed مُصْطَفَى مُحَمَّد": "穆斯塔法·穆罕默德",
  "Mostafa Zico": "穆斯塔法·齐科",
  "Mostafa Ziko": "穆斯塔法·齐科",
  "Musa Al-Taamari": "穆萨·塔马里",
  Neymar: "内马尔",
  "Nico Williams": "尼科·威廉姆斯",
  "Nicolas Jackson": "尼古拉斯·杰克逊",
  "Nicolas Pepe": "尼古拉斯·佩佩",
  "Noah Sadiki": "诺亚·萨迪基",
  "Noor Al-Rawabdeh": "努尔·拉瓦布德",
  "Nuno Mendes": "努诺·门德斯",
  "Omar Marmoush": "奥马尔·马尔穆什",
  "Ousmane Dembele": "奥斯曼·登贝莱",
  "Ousmane Dembélé": "奥斯曼·登贝莱",
  "Orjan Nyland": "厄扬·尼兰",
  "Patrick Berg": "帕特里克·贝格",
  "Patrik Schick": "帕特里克·希克",
  Pedri: "佩德里",
  "Pico Lopes": "皮科·洛佩斯",
  "Piero Hincapié": "皮耶罗·因卡皮耶",
  "Ritsu Dōan": "堂安律",
  "Riyad Mahrez": "利雅得·马赫雷斯",
  "Romelu Lukaku": "罗梅卢·卢卡库",
  "Ronald Araújo": "罗纳德·阿劳霍",
  "Ronwen Williams": "龙文·威廉姆斯",
  "Ryan Mendes": "瑞安·门德斯",
  "Sadio Mané": "萨迪奥·马内",
  "Salem Al-Dawsari": "萨利姆·多萨里",
  "Saman Ghoddos": "萨曼·戈多斯",
  "Santiago Giménez": "圣地亚哥·希门尼斯",
  "Sardar Azmoun سردار آزمون": "萨达尔·阿兹蒙",
  "Sarpreet Singh": "萨普里特·辛格",
  "Scott McTominay": "斯科特·麦克托米奈",
  "Sead Kolašinac": "塞亚德·科拉希纳茨",
  "Simon Adingra": "西蒙·阿丁格拉",
  "Son Heung-min": "孙兴慜",
  "Stephen Eustáquio": "斯蒂芬·欧斯塔基奥",
  "Tahith Chong": "塔希斯·钟",
  "Takefusa Kubo": "久保建英",
  "Takehiro Tomiyasu": "富安健洋",
  "Teboho Mokoena": "特博霍·莫科纳",
  "Thelo Aasgaard": "泰洛·奥斯加德",
  "Tomáš Souček": "托马什·绍切克",
  Trézéguet: "特雷泽盖",
  "Tyler Adams": "泰勒·亚当斯",
  "Viktor Gyökeres": "维克托·约克雷斯",
  "Vinícius Júnior": "维尼修斯·儒尼奥尔",
  "Virgil van Dijk": "维吉尔·范戴克",
  Vitinha: "维蒂尼亚",
  Vozinha: "沃齐尼亚",
  "Weston McKennie": "韦斯顿·麦肯尼",
  "William Saliba": "威廉·萨利巴",
  "Yasin Ayari": "亚辛·阿亚里",
  "Yoane Wissa": "约安·维萨",
  "Zion Suzuki": "铃木彩艳",
  "Zidane Iqbal": "齐达内·伊克巴尔",
  Zizo: "齐佐",
  "Adam Hlozek": "亚当·赫洛热克",
  "Arda Guler": "阿尔达·居莱尔",
  "Brahim Diaz": "布拉欣·迪亚斯",
  "Bradley Barcola": "布拉德利·巴尔科拉",
  "Christian Volpato": "克里斯蒂安·沃尔帕托",
  "Darwin Nunez": "达尔温·努涅斯",
  "Edin Dzeko": "埃丁·哲科",
  "Edson Alvarez": "埃德森·阿尔瓦雷斯",
  "Emiliano Martinez": "埃米利亚诺·马丁内斯",
  "Enzo Fernandez": "恩佐·费尔南德斯",
  "Esmir Bajraktarevic": "埃斯米尔·巴伊拉克塔雷维奇",
  "Franck Kessie": "弗兰克·凯西",
  "Gustavo Gomez": "古斯塔沃·戈麦斯",
  "Hakan Calhanoglu": "哈坎·恰尔汗奥卢",
  "Inaki Williams": "伊尼亚基·威廉姆斯",
  "Ismael Bennacer": "伊斯梅尔·本纳塞尔",
  "Ismael Diaz": "伊斯梅尔·迪亚斯",
  "James Rodriguez": "哈梅斯·罗德里格斯",
  "Jeremy Doku": "杰里米·多库",
  "Josko Gvardiol": "约什科·格瓦迪奥尔",
  "Julian Alvarez": "胡利安·阿尔瓦雷斯",
  "Julio Enciso": "胡利奥·塞萨尔·恩西索",
  "Kai Havertz": "凯·哈弗茨",
  "Kenan Yildiz": "凯南·伊尔迪兹",
  "Kylian Mbappe": "基利安·姆巴佩",
  "Lautaro Martínez": "劳塔罗·马丁内斯",
  "Lautaro Martinez": "劳塔罗·马丁内斯",
  "Luis Chavez": "路易斯·查韦斯",
  "Luis Suarez": "路易斯·苏亚雷斯",
  "Luka Modric": "卢卡·莫德里奇",
  "Martin Odegaard": "马丁·厄德高",
  "Mateo Kovacic": "马特奥·科瓦契奇",
  "Michael Murillo": "迈克尔·阿米尔·穆里略",
  "Miguel Almiron": "米格尔·阿尔米隆",
  "Moises Caicedo": "莫伊塞斯·凯塞多",
  "Mostafa Mohamed": "穆斯塔法·穆罕默德",
  "Mousa Al-Taamari": "穆萨·塔马里",
  "Piero Hincapie": "皮耶罗·因卡皮耶",
  "Ritsu Doan": "堂安律",
  "Roberto Lopes": "皮科·洛佩斯",
  "Ronald Araujo": "罗纳德·阿劳霍",
  "Sadio Mane": "萨迪奥·马内",
  "Santiago Gimenez": "圣地亚哥·希门尼斯",
  "Sardar Azmoun": "萨达尔·阿兹蒙",
  "Sead Kolasinac": "塞亚德·科拉希纳茨",
  "Stephen Eustaquio": "斯蒂芬·欧斯塔基奥",
  "Tomas Soucek": "托马什·绍切克",
  Trezeguet: "特雷泽盖",
  "Viktor Gyokeres": "维克托·约克雷斯",
  "Vinicius Junior": "维尼修斯·儒尼奥尔",
  "Bukayo Saka": "布卡约·萨卡",
  "Caleb Yirenkyi": "卡莱布·伊伦基",
  "Diogo Costa": "迪奥戈·科斯塔",
  "Dominik Livaković": "多米尼克·利瓦科维奇",
  "Dominik Livakovic": "多米尼克·利瓦科维奇",
  "Jack Grealish": "杰克·格拉利什",
  "Jaminton Campaz": "哈明顿·坎帕斯",
  "Joao Neves": "若昂·内维斯",
  "Johan Manzambi": "约翰·曼赞比",
  "Jordan Pickford": "乔丹·皮克福德",
  "Marcus Rashford": "马库斯·拉什福德",
  "Michal Sadilek": "米哈尔·萨迪莱克",
  Messi: "梅西",
  Mbappé: "姆巴佩",
  Manzambi: "曼赞比",
  "Raheem Sterling": "拉希姆·斯特林",
  "Rafael Leao": "拉斐尔·莱奥",
  "Rafael Leão": "拉斐尔·莱奥",
  "Raúl Rangel": "劳尔·兰赫尔",
  "Yassine Bounou": "亚辛·布努",
  "Adrien Rabiot": "阿德里安·拉比奥",
  "Alan Franco": "阿兰·弗朗科",
  "Amadou Onana": "阿马杜·奥纳纳",
  "Amar Dedic": "阿马尔·德迪奇",
  "Amar Dedić": "阿马尔·德迪奇",
  "Amir Hadziahmetovic": "阿米尔·哈季艾哈梅托维奇",
  "Amir Hadžiahmetović": "阿米尔·哈季艾哈梅托维奇",
  "Angelo Preciado": "安赫洛·普雷西亚多",
  "Ángelo Preciado": "安赫洛·普雷西亚多",
  "Anthony Elanga": "安东尼·埃兰加",
  "Antoine Mendy": "安托万·门迪",
  "Antonee Robinson": "安东尼·罗宾逊",
  "Arthur Theate": "阿图尔·泰特",
  "Aurelien Tchouameni": "奥雷利安·楚阿梅尼",
  "Aurélien Tchouaméni": "奥雷利安·楚阿梅尼",
  "Benjamin Tahirovic": "本亚明·塔希罗维奇",
  "Benjamin Tahirović": "本亚明·塔希罗维奇",
  "Cesar Montes": "塞萨尔·蒙特斯",
  "César Montes": "塞萨尔·蒙特斯",
  "Chris Richards": "克里斯·理查兹",
  "Dennis Hadzikadunic": "丹尼斯·哈季卡杜尼奇",
  "Dennis Hadžikadunić": "丹尼斯·哈季卡杜尼奇",
  "Edouard Mendy": "爱德华·门迪",
  "Édouard Mendy": "爱德华·门迪",
  "Elye Wahi": "埃利·瓦希",
  "Emmanuel Agbadou": "埃马纽埃尔·阿格巴杜",
  "Ermedin Demirovic": "埃尔梅丁·德米罗维奇",
  "Ermedin Demirović": "埃尔梅丁·德米罗维奇",
  "Evan Ndicka": "埃文·恩迪卡",
  "Folarin Balogun": "福拉林·巴洛贡",
  "Gabriel Gudmundsson": "加布里埃尔·古德蒙德松",
  "Ghislain Konan": "吉斯兰·科南",
  "Giovanni Reyna": "乔瓦尼·雷纳",
  "Gonzalo Plata": "贡萨洛·普拉塔",
  "Guela Doue": "盖拉·杜埃",
  "Guéla Doué": "盖拉·杜埃",
  "Guillermo Ochoa": "吉列尔莫·奥乔亚",
  "Habib Diarra": "哈比卜·迪亚拉",
  "Herman Johansson": "赫尔曼·约翰松",
  "Hernan Galindez": "埃尔南·加林德斯",
  "Hernán Galíndez": "埃尔南·加林德斯",
  "Ibrahim Sangare": "易卜拉欣·桑加雷",
  "Ibrahim Sangaré": "易卜拉欣·桑加雷",
  "Ibrahima Konate": "易卜拉希马·科纳特",
  "Ibrahima Konaté": "易卜拉希马·科纳特",
  "Isak Hien": "伊萨克·希恩",
  "Ismail Jakobs": "伊斯梅尔·雅各布斯",
  "Ismaïl Jakobs": "伊斯梅尔·雅各布斯",
  "Ismaila Sarr": "伊斯梅拉·萨尔",
  "Ismaïla Sarr": "伊斯梅拉·萨尔",
  "Jesper Karlstrom": "耶斯佩尔·卡尔斯特伦",
  "Jesper Karlström": "耶斯佩尔·卡尔斯特伦",
  "Jesus Gallardo": "赫苏斯·加利亚多",
  "Jesús Gallardo": "赫苏斯·加利亚多",
  "Johan Vasquez": "约翰·巴斯克斯",
  "Johan Vásquez": "约翰·巴斯克斯",
  "John Yeboah": "约翰·耶博阿",
  "Jorge Sanchez": "豪尔赫·桑切斯",
  "Jorge Sánchez": "豪尔赫·桑切斯",
  "Jules Kounde": "儒勒·孔德",
  "Jules Koundé": "儒勒·孔德",
  "Julian Quinones": "胡利安·基尼奥内斯",
  "Julián Quiñones": "胡利安·基尼奥内斯",
  "Julian Ryerson": "尤利安·雷尔森",
  "Kendry Paez": "肯德里·派斯",
  "Kendry Páez": "肯德里·派斯",
  "Kerim Alajbegovic": "凯里姆·阿拉伊贝戈维奇",
  "Kerim Alajbegović": "凯里姆·阿拉伊贝戈维奇",
  "Kristoffer Ajer": "克里斯托弗·阿耶尔",
  "Lamine Camara": "拉明·卡马拉",
  "Leo Ostigard": "莱奥·厄斯蒂高",
  "Leo Østigård": "莱奥·厄斯蒂高",
  "Luis Romo": "路易斯·罗莫",
  "Marcus Holmgren Pedersen": "马库斯·霍姆格伦·佩德森",
  "Matt Turner": "马特·特纳",
  "Mattias Svanberg": "马蒂亚斯·斯万贝里",
  "Maxim De Cuyper": "马克西姆·德屈佩尔",
  "Mike Maignan": "迈克·迈尼昂",
  "Moussa Niakhate": "穆萨·尼亚卡特",
  "Moussa Niakhaté": "穆萨·尼亚卡特",
  "Nihad Mujakic": "尼哈德·穆亚基奇",
  "Nihad Mujakić": "尼哈德·穆亚基奇",
  "Nikola Vasilj": "尼科拉·瓦西利",
  "Oscar Bobb": "奥斯卡·鲍勃",
  "Pape Gueye": "帕普·盖耶",
  "Pervis Estupinan": "佩尔维斯·埃斯图皮尼安",
  "Pervis Estupiñán": "佩尔维斯·埃斯图皮尼安",
  "Roberto Alvarado": "罗伯托·阿尔瓦拉多",
  "Sander Berge": "桑德尔·贝格",
  "Seko Fofana": "塞科·福法纳",
  "Sergino Dest": "塞尔吉尼奥·德斯特",
  "Sergiño Dest": "塞尔吉尼奥·德斯特",
  "Theo Hernandez": "特奥·埃尔南德斯",
  "Théo Hernandez": "特奥·埃尔南德斯",
  "Thibaut Courtois": "蒂博·库尔图瓦",
  "Thomas Meunier": "托马斯·默尼耶",
  "Tim Ream": "蒂姆·里姆",
  "Timothy Weah": "蒂莫西·维阿",
  "Victor Lindelof": "维克托·林德洛夫",
  "Victor Lindelöf": "维克托·林德洛夫",
  "Viktor Johansson": "维克托·约翰松",
  "Willian Pacho": "威廉·帕乔",
  "Yahia Fofana": "亚希亚·福法纳",
  "Youri Tielemans": "尤里·蒂勒曼斯",
  "Zeno Debast": "泽诺·德巴斯特",
  "Aissa Mandi": "艾萨·曼迪",
  "Aïssa Mandi": "艾萨·曼迪",
  "Andrej Kramaric": "安德烈·克拉马里奇",
  "Andrej Kramarić": "安德烈·克拉马里奇",
  "Ante Budimir": "安特·布迪米尔",
  "Aymeric Laporte": "艾默里克·拉波尔特",
  "Bernardo Silva": "贝尔纳多·席尔瓦",
  "Dan Ndoye": "丹·恩多耶",
  "Fabian Rieder": "法比安·里德尔",
  "Fabian Ruiz": "法比安·鲁伊斯",
  "Fabián Ruiz": "法比安·鲁伊斯",
  "Goncalo Inacio": "贡萨洛·伊纳西奥",
  "Gonçalo Inácio": "贡萨洛·伊纳西奥",
  "Gregor Kobel": "格雷戈尔·科贝尔",
  "Ivan Perisic": "伊万·佩里希奇",
  "Ivan Perišić": "伊万·佩里希奇",
  "Joao Cancelo": "若昂·坎塞洛",
  "João Cancelo": "若昂·坎塞洛",
  "João Neves": "若昂·内维斯",
  "Josip Stanisic": "约西普·斯塔尼希奇",
  "Josip Stanišić": "约西普·斯塔尼希奇",
  "Josip Sutalo": "约西普·舒塔洛",
  "Josip Šutalo": "约西普·舒塔洛",
  "Kevin Danso": "凯文·丹索",
  "Luca Zidane": "卢卡·齐达内",
  "Marco Pasalic": "马尔科·帕沙利奇",
  "Marco Pašalić": "马尔科·帕沙利奇",
  "Marc Cucurella": "马克·库库雷利亚",
  "Marko Arnautovic": "马尔科·阿瑙托维奇",
  "Marko Arnautović": "马尔科·阿瑙托维奇",
  "Martin Baturina": "马丁·巴图里纳",
  "Mikel Oyarzabal": "米克尔·奥亚萨瓦尔",
  "Mohamed Amoura": "穆罕默德·阿穆拉",
  "Nabil Bentaleb": "纳比勒·本塔莱布",
  "Nico Elvedi": "尼科·埃尔韦迪",
  "Nicolas Seiwald": "尼古拉斯·塞瓦尔德",
  "Patrick Pentz": "帕特里克·彭茨",
  "Patrick Wimmer": "帕特里克·维默",
  "Pau Cubarsi": "保·库巴尔西",
  "Pau Cubarsí": "保·库巴尔西",
  "Pedro Porro": "佩德罗·波罗",
  "Pedri": "佩德里",
  "Phillip Mwene": "菲利普·姆韦内",
  "Phillipp Mwene": "菲利普·姆韦内",
  "Rak Belghali": "拉菲克·贝尔加利",
  "Rafik Belghali": "拉菲克·贝尔加利",
  "Ramiz Zerrouki": "拉米兹·泽鲁基",
  "Ramy Bensebaini": "拉米·本塞拜尼",
  "Rayan Ait-Nouri": "拉扬·艾特-努里",
  "Rayan Aït-Nouri": "拉扬·艾特-努里",
  "Ricardo Rodriguez": "里卡多·罗德里格斯",
  "Ricardo Rodríguez": "里卡多·罗德里格斯",
  "Rodri": "罗德里",
  "Romano Schmid": "罗马诺·施密德",
  "Remo Freuler": "雷莫·弗罗伊勒",
  "Ruben Dias": "鲁本·迪亚斯",
  "Rúben Dias": "鲁本·迪亚斯",
  "Rubén Vargas": "鲁文·巴尔加斯",
  "Ruben Vargas": "鲁文·巴尔加斯",
  "Silvan Widmer": "西尔万·威德默",
  "Stefan Posch": "斯特凡·波施",
  "Unai Simon": "乌奈·西蒙",
  "Unai Simón": "乌奈·西蒙",
  "Vitinha": "维蒂尼亚"
};

const ZH_CLUB_NAME_TRANSLATIONS = {
  "AC Milan": "AC米兰",
  "Al Hilal": "利雅得新月",
  "Al Sadd": "萨德",
  "Al Sailiya SC": "赛利亚体育",
  "Al-Ahli": "吉达国民",
  "Al-Duhail": "杜海勒",
  "Al-Hilal": "利雅得新月",
  "Al-Ittihad": "吉达联合",
  "Al-Karma": "卡尔马",
  "Al-Najma (on loan from Como)": "纳吉马（从科莫租借）",
  "Al-Nassr": "利雅得胜利",
  "Al-Ula": "乌拉",
  Arsenal: "阿森纳",
  "Arsenal (on loan from Bayer Leverkusen)": "阿森纳（从勒沃库森租借）",
  "Aston Villa": "阿斯顿维拉",
  Atalanta: "亚特兰大",
  "Athletic Bilbao": "毕尔巴鄂竞技",
  "Atlanta United": "亚特兰大联",
  "Atlético Madrid": "马德里竞技",
  Barcelona: "巴塞罗那",
  "Bayer Leverkusen": "勒沃库森",
  "Bayern Munich": "拜仁慕尼黑",
  Benfica: "本菲卡",
  Beşiktaş: "贝西克塔斯",
  "Borussia Dortmund": "多特蒙德",
  Bournemouth: "伯恩茅斯",
  "Brighton & Hove Albion": "布莱顿",
  Burnley: "伯恩利",
  Celtic: "凯尔特人",
  Chelsea: "切尔西",
  "Crystal Palace": "水晶宫",
  "Cultural Leonesa (on loan from Al-Duhail)": "莱昂内萨文化（从杜海勒租借）",
  "Dender EH": "登德尔EH",
  "Dinamo Zagreb": "萨格勒布迪纳摩",
  Everton: "埃弗顿",
  "Dinamo Zagreb (on loan from AC Milan)": "萨格勒布迪纳摩（从AC米兰租借）",
  "Dynamo Moscow": "莫斯科迪纳摩",
  "Eintracht Frankfurt": "法兰克福",
  Esteghlal: "德黑兰独立",
  "FC St. Pauli": "圣保利",
  "Fenerbahçe (on loan from West Ham United)": "费内巴切（从西汉姆联租借）",
  Feyenoord: "费耶诺德",
  "Free agent": "自由球员",
  "G.D. Chaves": "查韦斯",
  "Hannover 96 (on loan from FC Augsburg)": "汉诺威96（从奥格斯堡租借）",
  "Heart of Midlothian": "哈茨",
  Hibernian: "希伯尼安",
  "Inter Milan": "国际米兰",
  "Inter Milan (on loan from Manchester City)": "国际米兰（从曼城租借）",
  Iğdır: "厄德尔",
  "Iğdır FK": "厄德尔FK",
  Juventus: "尤文图斯",
  Kalba: "卡尔巴",
  Kilmarnock: "基尔马诺克",
  "Kilmarnock (on loan from Rangers)": "基尔马诺克（从格拉斯哥流浪者租借）",
  "Leicester City": "莱斯特城",
  Levante: "莱万特",
  León: "莱昂",
  Liverpool: "利物浦",
  "Los Angeles (on loan from Porto)": "洛杉矶（从波尔图租借）",
  "Los Angeles FC": "洛杉矶FC",
  "Mamelodi Sundowns": "马梅洛迪日落",
  "Manchester City": "曼城",
  "Manchester United": "曼联",
  Marseille: "马赛",
  "Minnesota United": "明尼苏达联",
  "Monaco (on loan from Sunderland)": "摩纳哥（从桑德兰租借）",
  Motherwell: "马瑟韦尔",
  Nantes: "南特",
  Napoli: "那不勒斯",
  "Newcastle United": "纽卡斯尔联",
  "Nottingham Forest": "诺丁汉森林",
  Olympiacos: "奥林匹亚科斯",
  Porto: "波尔图",
  PSV: "埃因霍温",
  Pachuca: "帕丘卡",
  Palmeiras: "帕尔梅拉斯",
  "Paris Saint-Germain": "巴黎圣日耳曼",
  "Pumas UNAM": "美洲狮UNAM",
  "RB Leipzig": "RB莱比锡",
  Rangers: "格拉斯哥流浪者",
  "Real Madrid": "皇家马德里",
  "Real Sociedad": "皇家社会",
  Rennes: "雷恩",
  Santos: "桑托斯",
  Sassuolo: "萨索洛",
  "Schalke 04": "沙尔克04",
  Selangor: "雪兰莪",
  "Shabab Al Ahli": "迪拜青年国民",
  "Shamrock Rovers": "沙姆洛克流浪",
  "Sheffield United": "谢菲尔德联",
  "Sporting CP": "葡萄牙体育",
  Strasbourg: "斯特拉斯堡",
  Sunderland: "桑德兰",
  "TSG Hoffenheim": "霍芬海姆",
  Utrecht: "乌德勒支",
  "Volendam (on loan from Gaziantep)": "福伦丹（从加济安泰普租借）",
  "Wellington Phoenix (on loan from TSC)": "惠灵顿凤凰（从TSC租借）",
  "West Ham United": "西汉姆联",
  "Wolverhampton Wanderers": "狼队",
  Wrexham: "雷克瑟姆",
  "Çaykur Rizespor (on loan from AEK Athens)": "里泽体育（从雅典AEK租借）",
  "İstanbul Başakşehir": "伊斯坦布尔巴沙克谢希尔"
};

const ZH_LEAGUE_NAME_TRANSLATIONS = {
  "2. Bundesliga": "德乙",
  "A-League Men": "澳大利亚A联赛",
  "Algerian Ligue Professionnelle 1": "阿尔及利亚甲级联赛",
  Allsvenskan: "瑞典超级联赛",
  "Argentine Primera División": "阿根廷甲级联赛",
  "Armenian Premier League": "亚美尼亚超级联赛",
  "Austrian Bundesliga": "奥地利甲级联赛",
  "Azerbaijan Premier League": "阿塞拜疆超级联赛",
  "Belgian Challenger Pro League": "比利时挑战者职业联赛",
  "Belgian Pro League": "比利时职业联赛",
  "Bosnian Premier League": "波黑超级联赛",
  "Botola Pro": "摩洛哥职业联赛",
  "Bulgarian First League": "保加利亚甲级联赛",
  Bundesliga: "德甲",
  "Campeonato Brasileiro Série A": "巴西甲级联赛",
  "Categoría Primera A": "哥伦比亚甲级联赛",
  "Championnat National": "法国全国联赛",
  "Chilean Primera División": "智利甲级联赛",
  "Chinese Super League": "中超",
  "Costa Rican Primera División": "哥斯达黎加甲级联赛",
  "Croatian Football League": "克罗地亚甲级联赛",
  "Cypriot First Division": "塞浦路斯甲级联赛",
  "Cyprus First Division": "塞浦路斯甲级联赛",
  "Cyprus League": "塞浦路斯联赛",
  "Czech First League": "捷克甲级联赛",
  "Danish Superliga": "丹麦超级联赛",
  "EFL Championship": "英冠",
  "EFL League One": "英甲",
  "Ecuadorian Serie A": "厄瓜多尔甲级联赛",
  "Eerste Divisie": "荷乙",
  "Egyptian Premier League": "埃及超级联赛",
  Ekstraklasa: "波兰甲级联赛",
  Eliteserien: "挪威超级联赛",
  Eredivisie: "荷甲",
  "German 3. Liga": "德丙",
  "Ghana Premier League": "加纳超级联赛",
  "Greek Super League": "希腊超级联赛",
  "Indonesian Super League": "印尼超级联赛",
  "Iraq Stars League": "伊拉克星级联赛",
  "Israeli Premier League": "以色列超级联赛",
  "J1 League": "J1联赛",
  "J2 League": "J2联赛",
  "Jordanian Pro League": "约旦职业联赛",
  "K League 1": "K联赛1",
  "Kazakhstan Premier League": "哈萨克斯坦超级联赛",
  "Keuken Kampioen Divisie": "荷乙",
  "La Liga": "西甲",
  LaLiga2: "西乙",
  "League of Ireland Premier Division": "爱尔兰超级联赛",
  "Liga I": "罗马尼亚甲级联赛",
  "Liga MX": "墨西哥超级联赛",
  "Liga Nacional de Honduras": "洪都拉斯国家联赛",
  "Liga Panameña de Fútbol": "巴拿马足球联赛",
  "Liga Portugal": "葡超",
  "Liga Portugal 2": "葡甲二级联赛",
  "Ligue 1": "法甲",
  "Ligue 2": "法乙",
  "Ligue Haïtienne": "海地联赛",
  "Major League Soccer": "美国职业足球大联盟",
  "Malaysia Super League": "马来西亚超级联赛",
  "Nemzeti Bajnoksag I": "匈牙利甲级联赛",
  "Nemzeti Bajnokság I": "匈牙利甲级联赛",
  "Oberliga Rheinland-Pfalz/Saar": "德国莱茵兰-普法尔茨/萨尔高级联赛",
  "Paraguayan Primera División": "巴拉圭甲级联赛",
  "Persian Gulf Pro League": "波斯湾职业联赛",
  "Premier League": "英超",
  "Primeira Liga": "葡超",
  "Primera B de Chile": "智利乙级联赛",
  "Primera Federación": "西班牙第三级联赛",
  "Qatar Stars League": "卡塔尔星级联赛",
  "Qatari Second Division": "卡塔尔乙级联赛",
  "Russian Premier League": "俄超",
  "Saudi First Division League": "沙特甲级联赛",
  "Saudi Pro League": "沙特职业联赛",
  "Scottish Premiership": "苏格兰超级联赛",
  "Segunda División": "西乙",
  "Serbian SuperLiga": "塞尔维亚超级联赛",
  "Serie A": "意甲",
  "Serie B": "意乙",
  "Slovak First Football League": "斯洛伐克甲级联赛",
  "Slovenian PrvaLiga": "斯洛文尼亚甲级联赛",
  "South African Premiership": "南非超级联赛",
  "Super League Greece": "希腊超级联赛",
  "Swiss Challenge League": "瑞士挑战联赛",
  "Swiss Promotion League": "瑞士晋级联赛",
  "Swiss Super League": "瑞士超级联赛",
  "Süper Lig": "土超",
  "TFF First League": "土耳其甲级联赛",
  "Thai League 1": "泰国甲级联赛",
  "Tunisian Ligue Professionnelle 1": "突尼斯职业甲级联赛",
  "Turkish Super Lig": "土耳其超级联赛",
  "UAE Pro League": "阿联酋职业联赛",
  "USL Championship": "USL冠军联赛",
  "Uruguayan Primera División": "乌拉圭甲级联赛",
  "Uzbekistan Super League": "乌兹别克斯坦超级联赛",
  Veikkausliiga: "芬兰超级联赛",
  "Venezuelan Primera División": "委内瑞拉甲级联赛"
};

const ZH_SOURCE_LABEL_TRANSLATIONS = {
  "Wikipedia football biography infoboxes for player metadata": "维基百科球员资料框",
  "Wikimedia Commons player image files": "维基共享资源球员图片",
  "FIFA World Cup 2026 schedule and results": "FIFA 2026世界杯赛程与赛果",
  "FIFA World Cup 2026 schedule": "FIFA 2026世界杯赛程",
  "FIFA World Cup 2026 debutants": "FIFA 2026世界杯首次参赛球队",
  "FIFA/Coca-Cola Men's World Ranking": "FIFA/可口可乐男足世界排名",
  "FIFA World Cup 2026 standings": "FIFA 2026世界杯积分榜",
  "FOX Sports World Cup 2026 schedule cross-check": "FOX Sports 2026世界杯赛程交叉核对",
  "SB Nation standings cross-check": "SB Nation积分榜交叉核对",
  "ESPN Portugal vs Congo DR result cross-check": "ESPN葡萄牙对刚果民主共和国赛果交叉核对",
  "Editorial preview notes and placeholder projections": "编辑预览笔记与占位预测",
  "Ranking-based projection model": "基于排名的预测模型",
  "Team key-player watchlist baseline": "球队关键球员观察名单基线",
  "FIFA World Cup 2026 official squad list": "FIFA 2026世界杯官方名单",
  "openfootball World Cup JSON": "openfootball世界杯JSON",
  "FIFA official results sync": "FIFA官方赛果同步"
};

const ZH_HISTORICAL_SCORER_TRANSLATIONS = {
  "A. Fathi": "艾哈迈德·法蒂",
  "Agüero": "阿圭罗",
  "Andersson": "安德松",
  "Andre Schürrle": "安德烈·许尔勒",
  "André Schürrle": "安德烈·许尔勒",
  "Augustinsson": "奥古斯丁松",
  "Badelj": "巴代利",
  "Baggio": "巴乔",
  "Baloy": "巴洛伊",
  "Batshuayi": "巴舒亚伊",
  "Bednarek": "贝德纳雷克",
  "Behich": "贝希奇",
  "Brehme": "布雷默",
  "Cahill": "卡希尔",
  "Caniggia": "卡尼吉亚",
  "Carrillo": "卡里略",
  "Cheryshev": "切里舍夫",
  "Cionek": "乔内克",
  "Coutinho": "库蒂尼奥",
  "Cuadrado": "夸德拉多",
  "Del Piero": "皮耶罗",
  "Dzyuba": "久巴",
  "E. Cavani": "埃丁森·卡瓦尼",
  "E. Hazard": "埃登·阿扎尔",
  "En-Nesyri": "恩内斯里",
  "Eriksen": "埃里克森",
  "Falcao": "法尔考",
  "Fernández": "费尔南德斯",
  "Foden": "福登",
  "Fred": "弗雷德",
  "Freuler": "弗罗伊勒",
  "G. Sigurðsson": "吉尔维·西于尔兹松",
  "Gareth Bale": "加雷斯·贝尔",
  "Gavi": "加维",
  "Giménez": "希门尼斯",
  "Gonçalo Ramos": "贡萨洛·拉莫斯",
  "Granqvist": "格兰奎斯特",
  "Griezmann": "格列兹曼",
  "Grosso": "格罗索",
  "Guerrero": "格雷罗",
  "H. Andersson": "亨里克·安德松",
  "Hakim Zyiech": "哈基姆·齐耶赫",
  "Honda": "本田",
  "Hwang Hee-chan": "黄喜灿",
  "J. Hernández": "哈维尔·埃尔南德斯",
  "J. Quintero": "胡安·金特罗",
  "Javier Hernández": "哈维尔·埃尔南德斯",
  "Kagawa": "香川",
  "Kane": "凯恩",
  "Klose": "克洛泽",
  "Kroos": "克罗斯",
  "L. Laurent": "吕西安·洛朗",
  "L. Suárez": "路易斯·苏亚雷斯",
  "Leônidas": "莱昂尼达斯",
  "Lineker": "莱因克尔",
  "Lingard": "林加德",
  "Lionel Messi": "利昂内尔·梅西",
  "Lozano": "洛萨诺",
  "Lukaku": "卢卡库",
  "M. Salah": "穆罕默德·萨拉赫",
  "M. Wagué": "穆萨·瓦格",
  "Mac Allister": "麦卡利斯特",
  "Mandžukić": "曼朱基奇",
  "Mané": "马内",
  "Marcelo": "马塞洛",
  "Materazzi": "马特拉齐",
  "Mbappé": "姆巴佩",
  "Modrić": "莫德里奇",
  "Nani": "纳尼",
  "Neymar Jr": "内马尔",
  "Osako": "大迫",
  "Oscar": "奥斯卡",
  "Paulinho": "保利尼奥",
  "Pepe": "佩佩",
  "Piola": "皮奥拉",
  "Pogba": "博格巴",
  "Pulisic": "普利希奇",
  "R. Lukaku": "罗梅卢·卢卡库",
  "Rakitić": "拉基蒂奇",
  "Rashford": "拉什福德",
  "Reus": "罗伊斯",
  "Richarlison": "理查利森",
  "Roberto Firmino": "罗伯托·菲尔米诺",
  "Robin Van Persie": "罗宾·范佩西",
  "Rodríguez": "罗德里格斯",
  "Ronaldo": "罗纳尔多",
  "Sassi": "萨西",
  "Schiaffino": "斯基亚菲诺",
  "Schillaci": "斯基拉奇",
  "Schweinsteiger": "施魏因施泰格",
  "Shaqiri": "沙奇里",
  "Son Heung Min": "孙兴慜",
  "Stones": "斯通斯",
  "Stábile": "斯塔比莱",
  "Takashi Inui": "乾贵士",
  "Takuma Asano": "浅野拓磨",
  "Thiago Silva": "蒂亚戈·席尔瓦",
  "Thomas Müller": "托马斯·穆勒",
  "Tim Cahill": "蒂姆·卡希尔",
  "Toni Kroos": "托尼·克罗斯",
  "Vinícius Jr.": "维尼修斯·儒尼奥尔",
  "Wout Werghost": "沃特·韦霍斯特",
  "Xabi Alonso": "哈维·阿隆索",
  "Xhaka": "扎卡",
  "Xherdan Shaqiri": "谢尔丹·沙奇里",
  "Y. Mina": "耶里·米纳",
  "Zidane": "齐达内",
  "Zizinho": "济济尼奥",
  "Álvaro Morata": "阿尔瓦罗·莫拉塔",
  "Ángel Di María": "安赫尔·迪马利亚",
  "Ángel di María": "安赫尔·迪马利亚"
};

const ZH_HISTORICAL_VENUE_TRANSLATIONS = {
  "Camp Nou, Barcelona": "诺坎普，巴塞罗那",
  "Estadio Azteca, Mexico City": "阿兹特克体育场，墨西哥城",
  "Estadio Centenario, Montevideo": "百年纪念体育场，蒙得维的亚",
  "Estadio Monumental, Buenos Aires": "纪念碑体育场，布宜诺斯艾利斯",
  "Estadio Nacional, Santiago": "国家体育场，圣地亚哥",
  "Estadio Parque Central, Montevideo": "中央公园体育场，蒙得维的亚",
  "Estádio do Maracanã, Rio de Janeiro": "马拉卡纳体育场，里约热内卢",
  "Lusail Iconic Stadium, Lusail": "卢赛尔体育场，卢赛尔",
  "Old Trafford, Manchester": "老特拉福德，曼彻斯特",
  "Rose Bowl, Pasadena": "玫瑰碗，帕萨迪纳",
  "San Siro, Milan": "圣西罗，米兰",
  "Stade de France, Saint-Denis": "法兰西体育场，圣但尼",
  "Wembley Stadium, London": "温布利球场，伦敦"
};

const ZH_HISTORICAL_VENUE_TERMS = {
  Arena: "竞技场",
  Bowl: "碗状体育场",
  Camp: "球场",
  Central: "中央",
  City: "城",
  Cup: "杯",
  Dome: "巨蛋",
  Estadio: "体育场",
  Estádio: "体育场",
  International: "国际",
  Main: "主",
  Municipal: "市政",
  Nacional: "国家",
  National: "国家",
  Nou: "诺",
  Olímpico: "奥林匹克",
  Olympic: "奥林匹克",
  Park: "公园",
  Parc: "公园",
  Parque: "公园",
  Place: "广场",
  Soccer: "足球",
  Stade: "体育场",
  Stadio: "体育场",
  Stadium: "体育场",
  Stadion: "体育场",
  Universitario: "大学",
  University: "大学",
  World: "世界",
  "St.": "圣",
  Al: "阿尔",
  da: "",
  das: "",
  de: "",
  del: "",
  des: "",
  do: "",
  dos: "",
  du: "",
  la: "",
  le: "",
  les: "",
  Buenos: "布宜诺斯",
  Aires: "艾利斯",
  Barcelona: "巴塞罗那",
  Berlin: "柏林",
  Bilbao: "毕尔巴鄂",
  Birmingham: "伯明翰",
  Bordeaux: "波尔多",
  Brasilia: "巴西利亚",
  Brasília: "巴西利亚",
  Busan: "釜山",
  Chicago: "芝加哥",
  Dallas: "达拉斯",
  Doha: "多哈",
  Dortmund: "多特蒙德",
  Durban: "德班",
  Florence: "佛罗伦萨",
  Frankfurt: "法兰克福",
  Geneva: "日内瓦",
  Guadalajara: "瓜达拉哈拉",
  Hamburg: "汉堡",
  Hannover: "汉诺威",
  Johannesburg: "约翰内斯堡",
  London: "伦敦",
  Madrid: "马德里",
  Manchester: "曼彻斯特",
  Marseille: "马赛",
  Mexico: "墨西哥",
  Milan: "米兰",
  Montevideo: "蒙得维的亚",
  Moscow: "莫斯科",
  München: "慕尼黑",
  Munich: "慕尼黑",
  Naples: "那不勒斯",
  Paris: "巴黎",
  Pasadena: "帕萨迪纳",
  Rome: "罗马",
  Santiago: "圣地亚哥",
  Seville: "塞维利亚",
  Seoul: "首尔",
  Stuttgart: "斯图加特",
  Turin: "都灵",
  Valencia: "巴伦西亚",
  Yokohama: "横滨"
};

const ZH_NAME_INITIAL_TRANSLITERATIONS = {
  A: "阿",
  B: "贝",
  C: "西",
  D: "迪",
  E: "伊",
  F: "弗",
  G: "吉",
  H: "哈",
  I: "伊",
  J: "杰",
  K: "凯",
  L: "勒",
  M: "马",
  N: "恩",
  O: "奥",
  P: "佩",
  Q: "丘",
  R: "雷",
  S: "塞",
  T: "特",
  U: "乌",
  V: "维",
  W: "韦",
  X: "克斯",
  Y: "伊",
  Z: "泽"
};

const ZH_LATIN_NAME_LETTERS = {
  a: "阿",
  b: "布",
  c: "克",
  d: "德",
  e: "埃",
  f: "夫",
  g: "格",
  h: "赫",
  i: "伊",
  j: "杰",
  k: "克",
  l: "勒",
  m: "姆",
  n: "恩",
  o: "奥",
  p: "普",
  q: "库",
  r: "尔",
  s: "斯",
  t: "特",
  u: "乌",
  v: "维",
  w: "沃",
  x: "克斯",
  y: "伊",
  z: "泽"
};

const ZH_LATIN_NAME_CHUNKS = Object.entries({
  schw: "施魏",
  sch: "施",
  tch: "奇",
  dzh: "吉",
  sson: "松",
  berg: "贝格",
  mann: "曼",
  vich: "维奇",
  vic: "维奇",
  wicz: "维奇",
  ich: "伊奇",
  ski: "斯基",
  sky: "斯基",
  gue: "盖",
  gui: "吉",
  que: "克",
  qui: "基",
  eau: "奥",
  aux: "奥",
  eon: "翁",
  dz: "兹",
  ch: "奇",
  sh: "什",
  th: "特",
  ph: "夫",
  ck: "克",
  qu: "夸",
  gn: "尼",
  nh: "尼",
  lh: "利",
  ll: "利",
  rr: "尔",
  ng: "恩",
  ai: "艾",
  au: "奥",
  ea: "伊",
  ee: "伊",
  ei: "艾",
  eu: "尤",
  ie: "耶",
  io: "奥",
  oa: "奥",
  oe: "奥",
  oi: "瓦",
  oo: "乌",
  ou: "乌",
  ua: "瓦",
  ue: "韦",
  ui: "维",
  yy: "伊",
  ba: "巴",
  be: "贝",
  bi: "比",
  bo: "博",
  bu: "布",
  ca: "卡",
  ce: "塞",
  ci: "西",
  co: "科",
  cu: "库",
  cy: "西",
  da: "达",
  de: "德",
  di: "迪",
  do: "多",
  du: "杜",
  dy: "迪",
  fa: "法",
  fe: "费",
  fi: "菲",
  fo: "福",
  fu: "夫",
  ga: "加",
  ge: "格",
  gi: "吉",
  go: "戈",
  gu: "古",
  gy: "吉",
  ha: "哈",
  he: "赫",
  hi: "希",
  ho: "霍",
  hu: "胡",
  hy: "希",
  ja: "贾",
  je: "杰",
  ji: "吉",
  jo: "乔",
  ju: "朱",
  ka: "卡",
  ke: "克",
  ki: "基",
  ko: "科",
  ku: "库",
  ky: "基",
  la: "拉",
  le: "莱",
  li: "利",
  lo: "洛",
  lu: "卢",
  ly: "利",
  ma: "马",
  me: "梅",
  mi: "米",
  mo: "莫",
  mu: "穆",
  my: "米",
  na: "纳",
  ne: "内",
  ni: "尼",
  no: "诺",
  nu: "努",
  ny: "尼",
  pa: "帕",
  pe: "佩",
  pi: "皮",
  po: "波",
  pu: "普",
  py: "皮",
  qa: "卡",
  qe: "克",
  qi: "奇",
  qo: "科",
  ra: "拉",
  re: "雷",
  ri: "里",
  ro: "罗",
  ru: "鲁",
  ry: "里",
  sa: "萨",
  se: "塞",
  si: "西",
  so: "索",
  su: "苏",
  sy: "西",
  ta: "塔",
  te: "特",
  ti: "蒂",
  to: "托",
  tu: "图",
  ty: "蒂",
  va: "瓦",
  ve: "维",
  vi: "维",
  vo: "沃",
  vu: "武",
  vy: "维",
  wa: "瓦",
  we: "韦",
  wi: "维",
  wo: "沃",
  wu: "伍",
  wy: "维",
  xa: "克萨",
  xe: "克塞",
  xi: "西",
  xo: "克索",
  xu: "许",
  xy: "西",
  ya: "亚",
  ye: "耶",
  yi: "伊",
  yo: "约",
  yu: "尤",
  za: "扎",
  ze: "泽",
  zi: "齐",
  zo: "佐",
  zu: "祖",
  zy: "齐",
  ov: "奥夫",
  ev: "耶夫",
  ez: "埃斯",
  es: "埃斯",
  is: "伊斯",
  us: "乌斯",
  as: "阿斯",
  os: "奥斯",
  az: "阿兹",
  ic: "伊奇",
  ek: "埃克",
  er: "尔",
  en: "恩",
  on: "翁",
  an: "安",
  in: "因",
  un: "温"
}).sort((a, b) => b[0].length - a[0].length);

Object.entries(ZH_ADDITIONAL_EXACT_TRANSLATIONS).forEach(([text, translation]) => {
  ZH_EXACT_TRANSLATIONS.set(text, translation);
});
[
  ZH_PLAYER_NAME_TRANSLATIONS,
  ZH_CLUB_NAME_TRANSLATIONS,
  ZH_LEAGUE_NAME_TRANSLATIONS,
  ZH_SOURCE_LABEL_TRANSLATIONS,
  ZH_HISTORICAL_SCORER_TRANSLATIONS,
  ZH_HISTORICAL_VENUE_TRANSLATIONS
].forEach((translations) => {
  Object.entries(translations).forEach(([text, translation]) => {
    ZH_EXACT_TRANSLATIONS.set(text, translation);
  });
});
Object.entries({
  "Central control": "中路控制",
  Finishing: "终结",
  "Late arrivals": "后排插上",
  "Late runners": "后排跑动",
  "Late runs": "后插上",
  "Transition bursts": "转换爆发",
  "Transition craft": "转换技巧",
  "Transition pace": "转换速度",
  "Transition speed": "转换速度",
  "Round of 32 slots use current standings and remaining projections. Later rounds are predictions.":
    "32强席位使用当前积分榜和剩余预测。后续轮次为预测。",
  TBD: "待定",
  Likely: "可能",
  "Unknown scorer": "进球者未知",
  "No historical prediction is generated for cancelled fixtures.": "已取消的比赛不会生成历史预测。"
}).forEach(([text, translation]) => {
  ZH_EXACT_TRANSLATIONS.set(text, translation);
});
const ZH_PATTERN_TRANSLATIONS = [
  {
    pattern: /^(.+) flag$/,
    replace: (_, teamName) => `${teamName} 旗帜`
  },
  {
    pattern: /^(.+) FIFA world ranking (.+)$/,
    replace: (_, teamName, rank) => `${teamName} FIFA世界排名 ${rank}`
  },
  {
    pattern: /^(.+) style notes$/,
    replace: (_, teamName) => `${translateTextToZh(teamName)}风格要点`
  },
  {
    pattern: /^Group ([A-L])$/,
    replace: (_, groupId) => `${groupId}组`
  },
  {
    pattern: /^Group (\d+)$/,
    replace: (_, groupId) => `第${groupId}组`
  },
  {
    pattern: /^Group ([A-L]) Top (\d+)$/,
    replace: (_, groupId, place) => `${groupId}组第${place}名`
  },
  {
    pattern: /^Group ([A-L](?:\/[A-L])*)(\d+)$/,
    replace: (_, groupId, place) => `${groupId}组第${place}名`
  },
  {
    pattern: /^Open Group ([A-L]) standings$/,
    replace: (_, groupId) => `打开${groupId}组积分榜`
  },
  {
    pattern: /^(\d+)(?:st|nd|rd|th)$/,
    replace: (_, value) => `第${value}`
  },
  {
    pattern: /^(.+%) advancing$/,
    replace: (_, percent) => `${percent} 晋级`
  },
  {
    pattern: /^(.+%) to advance$/,
    replace: (_, percent) => `${percent} 晋级概率`
  },
  {
    pattern: /^Most paths keep them inside the top 8\.$/,
    replace: () => "大多数路径会让他们留在前8。"
  },
  {
    pattern: /^They are inside the top 8, but more groups can still catch them\.$/,
    replace: () => "他们目前在前8内，但其他小组仍可能追上。"
  },
  {
    pattern: /^They are just outside the top 8, but one swing can pull them in\.$/,
    replace: () => "他们刚好在前8之外，但一个结果变化就可能把他们拉回晋级区。"
  },
  {
    pattern: /^They need help to climb into the top 8\.$/,
    replace: () => "他们需要其他结果帮忙才能进入前8。"
  },
  {
    pattern: /^Remaining matches can change (.+)'s Round of 32 opponent, but not whether they qualify\.$/,
    replace: (_, teamName) =>
      `剩余比赛可能改变${translateTextToZh(teamName)}的32强对手，但不会改变他们能否晋级。`
  },
  {
    pattern: /^Watch: (.+) vs (.+)$/,
    replace: (_, home, away) => `关注：${translateTextToZh(home)} vs ${translateTextToZh(away)}`
  },
  {
    pattern:
      /^A (?:draw|tie) would move Group ([A-L])'s third-place team to (\d+) pts?, pushing (.+) out of the current top 8 unless another group falls back\.$/,
    replace: (_, groupId, points, teamName) =>
      `一场平局会让${groupId}组第三名升到${points}分，把${translateTextToZh(teamName)}挤出当前前8，除非另一个小组掉下来。`
  },
  {
    pattern:
      /^A (.+) win would move Group ([A-L])'s third-place team to (\d+) pts?, pushing (.+) out of the current top 8 unless another group falls back\.$/,
    replace: (_, winner, groupId, points, teamName) =>
      `${translateTextToZh(winner)}取胜会让${groupId}组第三名升到${points}分，把${translateTextToZh(teamName)}挤出当前前8，除非另一个小组掉下来。`
  },
  {
    pattern:
      /^An (.+) win would move Group ([A-L])'s third-place team to (\d+) pts?, pushing (.+) out of the current top 8 unless another group falls back\.$/,
    replace: (_, winner, groupId, points, teamName) =>
      `${translateTextToZh(winner)}取胜会让${groupId}组第三名升到${points}分，把${translateTextToZh(teamName)}挤出当前前8，除非另一个小组掉下来。`
  },
  {
    pattern:
      /^A (?:draw|tie) would move Group ([A-L])'s third-place team to (\d+) pts?, shrinking (.+)'s cushion above the cut line\.$/,
    replace: (_, groupId, points, teamName) =>
      `一场平局会让${groupId}组第三名升到${points}分，缩小${translateTextToZh(teamName)}在晋级线上的缓冲。`
  },
  {
    pattern:
      /^A (.+) win would move Group ([A-L])'s third-place team to (\d+) pts?, shrinking (.+)'s cushion above the cut line\.$/,
    replace: (_, winner, groupId, points, teamName) =>
      `${translateTextToZh(winner)}取胜会让${groupId}组第三名升到${points}分，缩小${translateTextToZh(teamName)}在晋级线上的缓冲。`
  },
  {
    pattern:
      /^An (.+) win would move Group ([A-L])'s third-place team to (\d+) pts?, shrinking (.+)'s cushion above the cut line\.$/,
    replace: (_, winner, groupId, points, teamName) =>
      `${translateTextToZh(winner)}取胜会让${groupId}组第三名升到${points}分，缩小${translateTextToZh(teamName)}在晋级线上的缓冲。`
  },
  {
    pattern: /^Estimated Round of 32 chance: (.+)\.$/,
    replace: (_, percent) => `预计进入32强机会：${percent}。`
  },
  {
    pattern: /^3rd race (.+)$/,
    replace: (_, rank) => `第三名竞争 ${translateTextToZh(rank)}`
  },
  {
    pattern: /^(.+)\/(\d+) third-place teams; top (\d+) qualify\.$/,
    replace: (_, rank, total, advancers) =>
      `第三名球队中排名${translateTextToZh(rank)}，共${total}队；前${advancers}名晋级。`
  },
  {
    pattern: /^(\d+) group match(?:es)? left; points make it safer\.$/,
    replace: (_, count) => `还剩${count}场小组赛；拿分会更稳。`
  },
  {
    pattern: /^Finished its matches; now waiting on other groups\.$/,
    replace: () => "本队比赛已踢完；现在要等待其他小组结果。"
  },
  {
    pattern: /^Still possible: with (\d+) group match(?:es)? left, best case is (\d+) points?\.$/,
    replace: (_, count, points) =>
      `仍有机会：还剩${count}场小组赛，最好情况可达到${points}分。`
  },
  {
    pattern: /^Still possible: no matches left, so it needs help from other groups\.$/,
    replace: () => "仍有机会：本队已无比赛，需要其他小组帮忙。"
  },
  {
    pattern: /^In for now: with (\d+) group match(?:es)? left, best case is (\d+) points?\.$/,
    replace: (_, count, points) =>
      `目前在晋级区内：还剩${count}场小组赛，最好情况可达到${points}分。`
  },
  {
    pattern: /^In for now: no matches left, so it is waiting on other groups\.$/,
    replace: () => "目前在晋级区内：本队已无比赛，正在等待其他小组结果。"
  },
  {
    pattern: /^Not possible: no remaining result combo reaches the Round of 32\.$/,
    replace: () => "已无可能：剩余结果组合都无法进入32强。"
  },
  {
    pattern: /^Out if (\d+) teams? below pass(?:es)? it\.$/,
    replace: (_, count) => `若身后${count}队反超，就会出局。`
  },
  {
    pattern: /^Needs to pass (\d+) teams? to reach top (\d+)\.$/,
    replace: (_, count, advancers) => `需要反超${count}队才能进入前${advancers}。`
  },
  {
    pattern: /^Must take points; teams above must slip\.$/,
    replace: () => "必须拿分；前面的球队也需要失误。"
  },
  {
    pattern: /^Needs points; teams above must fall behind\.$/,
    replace: () => "需要拿分；前面的球队也必须掉到身后。"
  },
  {
    pattern: /^No matches left; needs (\d+) teams? above to fall behind\.$/,
    replace: (_, count) => `本队已无比赛；需要前面${count}队掉到身后。`
  },
  {
    pattern: /^Also needs teams below not to pass\.$/,
    replace: () => "还需要身后的球队不要反超。"
  },
  {
    pattern: /^Final table: qualifies as a third-place team\.$/,
    replace: () => "最终排名：以第三名球队身份晋级。"
  },
  {
    pattern: /^Final table: outside the qualifying third-place spots\.$/,
    replace: () => "最终排名：未进入可晋级的第三名席位。"
  },
  {
    pattern: /^Top (\d+) advance$/,
    replace: (_, count) => `前${count}名晋级`
  },
  {
    pattern: /^Choose match date, (.+)$/,
    replace: (_, date) => `选择比赛日期：${date}`
  },
  {
    pattern: /^Choose standings year, (.+) selected$/,
    replace: (_, year) => `选择积分榜年份，已选择${year}`
  },
  {
    pattern: /^Previous World Cup month, (.+)$/,
    replace: (_, month) => `上一个世界杯月份：${month}`
  },
  {
    pattern: /^Next World Cup month, (.+)$/,
    replace: (_, month) => `下一个世界杯月份：${month}`
  },
  {
    pattern: /^(\d+) match(?:es)? scheduled$/,
    replace: (_, count) => `安排了${count}场比赛`
  },
  {
    pattern: /^(\d+) group matches?$/,
    replace: (_, count) => `${count}场小组赛`
  },
  {
    pattern: /^No matches were found for (.+)\.$/,
    replace: (_, date) => `${date}没有找到比赛。`
  },
  {
    pattern: /^Verified fixture data is not loaded for (.+)\. This avoids showing a false no-match day\.$/,
    replace: (_, date) => `${date}的已核验赛程数据尚未载入，以免误显示为无比赛日。`
  },
  {
    pattern: /^Last updated (.+)\.$/,
    replace: (_, date) => `最后更新：${date}。`
  },
  {
    pattern: /^Sources: (.+)\. Predictions are unofficial\.$/,
    replace: (_, sources) => `来源：${sources}。预测为非官方内容。`
  },
  {
    pattern: /^(\d+) points?$/,
    replace: (_, points) => `${points}分`
  },
  {
    pattern: /^(\d+) wins?$/,
    replace: (_, wins) => `${wins}场胜利`
  },
  {
    pattern: /^(\d+) draws?$/,
    replace: (_, draws) => `${draws}场平局`
  },
  {
    pattern: /^(\d+) ties?$/,
    replace: (_, ties) => `${ties}场平局`
  },
  {
    pattern: /^(\d+) goals? scored$/,
    replace: (_, goals) => `进${goals}球`
  },
  {
    pattern: /^(.+) goal difference$/,
    replace: (_, value) => `净胜球${value}`
  },
  {
    pattern: /^(.+) is (.+) in the best third-place race: (.+)$/,
    replace: (_, teamName, rank, status) =>
      `${translateTextToZh(teamName)}在最佳第三名竞争中排名${translateTextToZh(rank)}：${translateTextToZh(status)}`
  },
  {
    pattern:
      /^Currently (.+) in the third-place race: (\d+) points?, (.+) goal difference, (\d+) goals? scored\.$/,
    replace: (_, rank, points, gd, goals) =>
      `当前在第三名竞争中排名${translateTextToZh(rank)}：${points}分，净胜球${gd}，进${goals}球。`
  },
  {
    pattern:
      /^(.+): (.+) of (\d+) third-place teams\. Top (\d+) advance\.$/,
    replace: (_, teamName, rank, totalTeams, advancers) =>
      `${translateTextToZh(teamName)}：在${totalTeams}支第三名球队中排名${translateTextToZh(rank)}。前${advancers}名晋级。`
  },
  {
    pattern:
      /^(.+): (.+) of (\d+) third-place teams\. Top (\d+) advance\. Ahead of (.+): (.+)\.$/,
    replace: (
      _,
      teamName,
      rank,
      totalTeams,
      advancers,
      target,
      comparison
    ) =>
      `${translateTextToZh(teamName)}：在${totalTeams}支第三名球队中排名${translateTextToZh(rank)}。前${advancers}名晋级。领先${translateTextToZh(target)}：${translateTextToZh(comparison)}。`
  },
  {
    pattern:
      /^(.+): (.+) of (\d+) third-place teams\. Top (\d+) advance\. Needs to pass (.+)\. Current gap: (.+)\.$/,
    replace: (
      _,
      teamName,
      rank,
      totalTeams,
      advancers,
      target,
      comparison
    ) =>
      `${translateTextToZh(teamName)}：在${totalTeams}支第三名球队中排名${translateTextToZh(rank)}。前${advancers}名晋级。需要超过${translateTextToZh(target)}。当前差距：${translateTextToZh(comparison)}。`
  },
  {
    pattern:
      /^(.+): (.+) of (\d+) third-place teams\. Top (\d+) advance\. Teams from (.+) to (.+) are tied around the cutoff\. Fair-play data is missing\.$/,
    replace: (_, teamName, rank, totalTeams, advancers, start, end) =>
      `${translateTextToZh(teamName)}：在${totalTeams}支第三名球队中排名${translateTextToZh(rank)}。前${advancers}名晋级。第${translateTextToZh(start)}到${translateTextToZh(end)}名在晋级线附近打平。公平竞赛数据缺失。`
  },
  {
    pattern:
      /^(.+): (.+) of (\d+) third-place teams\. Top (\d+) advance\. Tied with (.+)\. Fair-play data is missing\.$/,
    replace: (
      _,
      teamName,
      rank,
      totalTeams,
      advancers,
      target
    ) =>
      `${translateTextToZh(teamName)}：在${totalTeams}支第三名球队中排名${translateTextToZh(rank)}。前${advancers}名晋级。与${translateTextToZh(target)}打平。公平竞赛数据缺失。`
  },
  {
    pattern:
      /^Currently (.+) in the third-place race: (\d+) points?, (.+) goal difference, (\d+) goals? scored\. To stay top 8, keep ahead of (.+) \((.+)\) on (.+): (.+) vs (.+)\.$/,
    replace: (_, rank, points, gd, goals, target, targetRank, label, candidateValue, targetValue) =>
      `当前在第三名竞争中排名${translateTextToZh(rank)}：${points}分，净胜球${gd}，进${goals}球。要留在前8，需要在${formatThirdPlaceDeciderLabelZh(label)}上继续领先${translateTextToZh(target)}（${translateTextToZh(targetRank)}）：${translateTextToZh(candidateValue)} 对 ${translateTextToZh(targetValue)}。`
  },
  {
    pattern:
      /^Currently (.+) in the third-place race: (\d+) points?, (.+) goal difference, (\d+) goals? scored\. To make the top 8, move ahead of (.+) \((.+)\) on (.+): (.+) vs (.+)\.$/,
    replace: (_, rank, points, gd, goals, target, targetRank, label, candidateValue, targetValue) =>
      `当前在第三名竞争中排名${translateTextToZh(rank)}：${points}分，净胜球${gd}，进${goals}球。要进入前8，需要在${formatThirdPlaceDeciderLabelZh(label)}上超过${translateTextToZh(target)}（${translateTextToZh(targetRank)}）：${translateTextToZh(candidateValue)} 对 ${translateTextToZh(targetValue)}。`
  },
  {
    pattern:
      /^Currently (.+) in the third-place race: (\d+) points?, (.+) goal difference, (\d+) goals? scored\. Top-8 place is tied from (.+)-(.+); fair-play data is pending\.$/,
    replace: (_, rank, points, gd, goals, start, end) =>
      `当前在第三名竞争中排名${translateTextToZh(rank)}：${points}分，净胜球${gd}，进${goals}球。前8席位在${translateTextToZh(start)}至${translateTextToZh(end)}名之间打平；公平竞赛数据待确认。`
  },
  {
    pattern:
      /^Currently (.+) in the third-place race: (\d+) points?, (.+) goal difference, (\d+) goals? scored\. To (stay top 8|make the top 8), the tie with (.+) \((.+)\) is still unresolved on loaded points, goal difference and goals scored; fair-play data is pending\.$/,
    replace: (_, rank, points, gd, goals, action, target, targetRank) =>
      `当前在第三名竞争中排名${translateTextToZh(rank)}：${points}分，净胜球${gd}，进${goals}球。要${action === "stay top 8" ? "留在前8" : "进入前8"}，与${translateTextToZh(target)}（${translateTextToZh(targetRank)}）的同分排序仍未在已载入的积分、净胜球和进球数中分出；公平竞赛数据待确认。`
  },
  {
    pattern: /^Tied on loaded stats for (.+)-(.+)\.$/,
    replace: (_, start, end) =>
      `已载入数据中${translateTextToZh(start)}至${translateTextToZh(end)}名持平。`
  },
  {
    pattern: /^Show all (\d+) matches$/,
    replace: (_, count) => `显示全部${count}场比赛`
  },
  {
    pattern: /^See previous World Cups \((\d+)\)$/,
    replace: (_, count) => `查看历届世界杯（${count}）`
  },
  {
    pattern: /^Head-to-head record across (\d+) match(?:es)?$/,
    replace: (_, count) => `${count}场交锋记录`
  },
  {
    pattern: /^World Cup head-to-head record across (\d+) matches$/,
    replace: (_, count) => `${count}场世界杯交锋记录`
  },
  {
    pattern: /^(.+) and (.+) had not met in a men's World Cup before this match\.$/,
    replace: (_, home, away) =>
      `这场比赛前，${translateTextToZh(home)}和${translateTextToZh(away)}还没有在男足世界杯交锋过。`
  },
  {
    pattern:
      /^(.+) and (.+) have never met in a verified senior men's international\. This is their first head-to-head meeting\.$/,
    replace: (_, home, away) =>
      `${translateTextToZh(home)}和${translateTextToZh(away)}此前没有已核验的成年男足国际A级赛交锋记录。这是双方首次交手。`
  },
  {
    pattern:
      /^(.+) and (.+) have never met in a verified senior men's international\. This is their first head-to-head meeting, during (.+)'s first World Cup tournament\.$/,
    replace: (_, home, away, debutant) =>
      `${translateTextToZh(home)}和${translateTextToZh(away)}此前没有已核验的成年男足国际A级赛交锋记录。这是双方首次交手，也发生在${translateTextToZh(debutant)}首次世界杯之旅期间。`
  },
  {
    pattern:
      /^(.+) is playing its first World Cup match\. (.+) and (.+) have never met in a verified senior men's international, making this their first head-to-head meeting\.$/,
    replace: (_, debutant, home, away) =>
      `${translateTextToZh(debutant)}将迎来队史首场世界杯比赛。${translateTextToZh(home)}和${translateTextToZh(away)}此前没有已核验的成年男足国际A级赛交锋记录，因此这是双方首次交手。`
  },
  {
    pattern: /^(.+): (\d+) draw(?:s)?, (.+)$/,
    replace: (_, label, count, percent) => `${translateTextToZh(label)}：${count}场平局，${percent}`
  },
  {
    pattern: /^(.+): (\d+) tie(?:s)?, (.+)$/,
    replace: (_, label, count, percent) => `${translateTextToZh(label)}：${count}场平局，${percent}`
  },
  {
    pattern: /^(.+): (\d+) win(?:s)?, (.+)$/,
    replace: (_, label, count, percent) => `${translateTextToZh(label)}：${count}场胜利，${percent}`
  },
  {
    pattern: /^Current score (.+) (\d+), (.+) (\d+)(?:, last checked (.+))?$/,
    replace: (_, home, homeScore, away, awayScore, freshness) =>
      `当前比分 ${translateTextToZh(home)} ${homeScore}，${translateTextToZh(away)} ${awayScore}${freshness ? `，最后检查 ${translateTextToZh(freshness)}` : ""}`
  },
  {
    pattern: /^Final score (.+) (\d+), (.+) (\d+)$/,
    replace: (_, home, homeScore, away, awayScore) =>
      `最终比分 ${translateTextToZh(home)} ${homeScore}，${translateTextToZh(away)} ${awayScore}`
  },
  {
    pattern: /^Current score not loaded yet; showing (.+)$/,
    replace: (_, score) => `当前比分尚未载入；显示 ${score}`
  },
  {
    pattern: /^(.+) min ago$/,
    replace: (_, value) => `${value}分钟前`
  },
  {
    pattern: /^(.+) hr ago$/,
    replace: (_, value) => `${value}小时前`
  },
  {
    pattern: /^(.+) advances$/,
    replace: (_, team) => `${translateTextToZh(team)} 晋级`
  },
  {
    pattern: /^(.+) advanced$/,
    replace: (_, team) => `${translateTextToZh(team)} 晋级`
  },
  {
    pattern: /^(.+) won$/,
    replace: (_, team) => `${translateTextToZh(team)} 取胜`
  },
  {
    pattern: /^(.+) won$/,
    replace: (_, team) => `${translateTextToZh(team)} 获胜`
  },
  {
    pattern: /^Likely for now: (.+) (\d+)%$/,
    replace: (_, team, percent) => `当前可能：${team} ${percent}%`
  },
  {
    pattern: /^Prediction based on (.+) vs (.+)\. (.+)$/,
    replace: (_, home, away, detail) =>
      `基于${translateTextToZh(home)}对${translateTextToZh(away)}的预测。${translateTextToZh(detail)}`
  },
  {
    pattern: /^Prediction based on (.+)'s current path\. (.+)$/,
    replace: (_, team, detail) =>
      `基于${translateTextToZh(team)}当前路径的预测。${translateTextToZh(detail)}`
  },
  {
    pattern: /^(.+) have the stronger FIFA rank \(#(\d+) vs #(\d+)\)\. Rough (\d+)%\.$/,
    replace: (_, favorite, favoriteRank, otherRank, percent) =>
      `${translateTextToZh(favorite)} 的FIFA排名更高（#${favoriteRank} 对 #${otherRank}）。粗略估计 ${percent}%。`
  },
  {
    pattern: /^(.+) and (.+) are close in FIFA rank\. Rough (\d+)%\.$/,
    replace: (_, home, away, percent) =>
      `${translateTextToZh(home)} 和 ${translateTextToZh(away)} 的FIFA排名接近。粗略估计 ${percent}%。`
  },
  {
    pattern: /^(.+) are the only current team in this slot\. Rough (\d+)%\.$/,
    replace: (_, team, percent) => `${translateTextToZh(team)} 是这个位置当前唯一的球队。粗略估计 ${percent}%。`
  },
  {
    pattern: /^(.+) are the current slot pick\. Rough (\d+)%\.$/,
    replace: (_, team, percent) => `${translateTextToZh(team)} 是当前位置的暂时选择。粗略估计 ${percent}%。`
  },
  {
    pattern: /^(.+) is underway$/,
    replace: (_, matchName) => `${translateTextToZh(matchName)} 已经开赛`
  },
  {
    pattern: /^(.+) has moved from preview mode into live tournament business\.$/,
    replace: (_, context) => `${translateTextToZh(context)} 已从赛前预览进入实时比赛状态。`
  },
  {
    pattern: /^(.+) and (.+) are trading momentum$/,
    replace: (_, home, away) => `${translateTextToZh(home)} 和 ${translateTextToZh(away)} 正在拉锯`
  },
  {
    pattern: /^It is (.+) live, with both sides close enough for one moment to change the story\.$/,
    replace: (_, score) => `实时比分 ${score}，双方差距很小，一个瞬间就可能改变走势。`
  },
  {
    pattern: /^(.+) lead (.+) for now$/,
    replace: (_, leader, chaser) => `${translateTextToZh(leader)} 直播中暂时领先 ${translateTextToZh(chaser)}`
  },
  {
    pattern: /^(.+) lead (.+), but (.+) still have time to pull the match back\.$/,
    replace: (_, leader, score, chaser) => `${translateTextToZh(leader)} 以 ${score} 领先，但 ${translateTextToZh(chaser)} 仍有时间追回比赛。`
  },
  {
    pattern: /^(.+) and (.+) await the knockout winner$/,
    replace: (_, home, away) =>
      `${translateTextToZh(home)} 和 ${translateTextToZh(away)} 等待淘汰赛胜者确认`
  },
  {
    pattern: /^(.+) is loaded for (.+), but the knockout winner is not loaded yet\.$/,
    replace: (_, score, context) =>
      `${translateTextToZh(context)}已载入 ${score}，但淘汰赛胜者尚未载入。`
  },
  {
    pattern: /^(.+) and (.+) split the points$/,
    replace: (_, home, away) => `${translateTextToZh(home)} 和 ${translateTextToZh(away)} 各取一分`
  },
  {
    pattern: /^(.+) keeps (.+) open and gives both teams something to carry into the next match\.$/,
    replace: (_, score, context) => `${score} 让 ${translateTextToZh(context)} 仍有悬念，也给双方带来下一场的延续点。`
  },
  {
    pattern: /^(.+) make a statement against (.+)$/,
    replace: (_, winner, loser) => `${translateTextToZh(winner)} 面对 ${translateTextToZh(loser)} 打出强势表现`
  },
  {
    pattern: /^(.+) look sharp against (.+)$/,
    replace: (_, winner, loser) => `${translateTextToZh(winner)} 面对 ${translateTextToZh(loser)} 状态锐利`
  },
  {
    pattern: /^(.+) narrowly beat (.+)$/,
    replace: (_, winner, loser) => `${translateTextToZh(winner)} 在胶着比赛中险胜 ${translateTextToZh(loser)}`
  },
  {
    pattern: /^(.+) edge (.+) to reach the (.+)$/,
    replace: (_, winner, loser, target) =>
      `${translateTextToZh(winner)} 险胜 ${translateTextToZh(loser)}，晋级${translateTextToZh(target)}`
  },
  {
    pattern: /^(.+) beat (.+) to reach the (.+)$/,
    replace: (_, winner, loser, target) =>
      `${translateTextToZh(winner)} 击败 ${translateTextToZh(loser)}，晋级${translateTextToZh(target)}`
  },
  {
    pattern: /^(.+) advance past (.+)$/,
    replace: (_, winner, loser) =>
      `${translateTextToZh(winner)} 淘汰 ${translateTextToZh(loser)} 晋级`
  },
  {
    pattern: /^(.+) survive (.+) on penalties$/,
    replace: (_, winner, loser) =>
      `${translateTextToZh(winner)} 点球淘汰 ${translateTextToZh(loser)}`
  },
  {
    pattern: /^(.+) win the World Cup$/,
    replace: (_, winner) => `${translateTextToZh(winner)} 赢得世界杯`
  },
  {
    pattern: /^(.+) secure third place$/,
    replace: (_, winner) => `${translateTextToZh(winner)} 获得第三名`
  },
  {
    pattern: /^(.+)'s (.+) win gives them an early foothold in (.+)\.$/,
    replace: (_, winner, score, context) => `${translateTextToZh(winner)} 的 ${score} 胜利让他们在 ${translateTextToZh(context)} 中先占位置。`
  },
  {
    pattern: /^(.+)'s (.+) win moved them into the (.+) and ended (.+)'s run\.$/,
    replace: (_, winner, score, target, loser) =>
      `${translateTextToZh(winner)} 的 ${score} 胜利让他们进入${translateTextToZh(target)}，也结束了 ${translateTextToZh(loser)} 的征程。`
  },
  {
    pattern: /^(.+)'s (.+) win moved them into the (.+)\.$/,
    replace: (_, winner, score, target) =>
      `${translateTextToZh(winner)} 的 ${score} 胜利让他们进入${translateTextToZh(target)}。`
  },
  {
    pattern: /^(.+)'s (.+) win moved them through from the (.+) and ended (.+)'s run\.$/,
    replace: (_, winner, score, context, loser) =>
      `${translateTextToZh(winner)} 的 ${score} 胜利让他们从${translateTextToZh(context)}晋级，也结束了 ${translateTextToZh(loser)} 的征程。`
  },
  {
    pattern: /^(.+) advanced to the (.+) on penalties after a (.+) draw, ending (.+)'s run\.$/,
    replace: (_, winner, target, score, loser) =>
      `${translateTextToZh(winner)} 在 ${score} 战平后通过点球进入${translateTextToZh(target)}，也结束了 ${translateTextToZh(loser)} 的征程。`
  },
  {
    pattern: /^(.+)'s (.+) win settled the Final against (.+)\.$/,
    replace: (_, winner, score, loser) =>
      `${translateTextToZh(winner)} 的 ${score} 胜利在决赛中击败 ${translateTextToZh(loser)}。`
  },
  {
    pattern: /^(.+)'s (.+) win secured third place against (.+)\.$/,
    replace: (_, winner, score, loser) =>
      `${translateTextToZh(winner)} 的 ${score} 胜利让他们击败 ${translateTextToZh(loser)} 获得第三名。`
  },
  {
    pattern: /^(.+) and (.+) have no shared script$/,
    replace: (_, home, away) => `${translateTextToZh(home)} 和 ${translateTextToZh(away)} 没有共同交锋剧本`
  },
  {
    pattern: /^(.+) vs (.+) is basically even historically$/,
    replace: (_, home, away) => `${translateTextToZh(home)} 对 ${translateTextToZh(away)} 的历史对比基本均衡`
  },
  {
    pattern: /^(.+) have the upset-watch angle$/,
    replace: (_, team) => `${translateTextToZh(team)} 有爆冷看点`
  },
  {
    pattern: /^(.+) enter with the stronger FIFA ranking, so (.+) only need a few loud moments to become the conversation\.$/,
    replace: (_, favorite, chaser) => `${translateTextToZh(favorite)} 的FIFA排名更高，所以 ${translateTextToZh(chaser)} 只需要几个亮眼瞬间就能成为话题。`
  },
  {
    pattern: /^⚽ (.+) and (.+) shared a 0-0 draw\.$/,
    replace: (_, home, away) => `⚽ ${translateTextToZh(home)} 和 ${translateTextToZh(away)} 0-0握手言和。`
  },
  {
    pattern: /^⚽ (.+) and (.+) finished level at (.+)\.$/,
    replace: (_, home, away, score) => `⚽ ${translateTextToZh(home)} 和 ${translateTextToZh(away)} 以 ${score} 战平。`
  },
  {
    pattern: /^⚽ (.+) beat (.+) (.+)\.$/,
    replace: (_, winner, loser, score) => `⚽ ${translateTextToZh(winner)} 以 ${score} 击败 ${translateTextToZh(loser)}。`
  },
  {
    pattern: /^⚽ (.+) made a statement with a (.+) win\.$/,
    replace: (_, winner, score) => `⚽ ${translateTextToZh(winner)} 以 ${score} 强势取胜。`
  },
  {
    pattern: /^⚽ (.+) edged (.+) (.+)\.$/,
    replace: (_, winner, loser, score) => `⚽ ${translateTextToZh(winner)} 以 ${score} 险胜 ${translateTextToZh(loser)}。`
  },
  {
    pattern: /^⚽ (.+) beat (.+) on penalties after a (.+) draw\.$/,
    replace: (_, winner, loser, score) =>
      `⚽ ${translateTextToZh(winner)} 在 ${score} 战平后通过点球击败 ${translateTextToZh(loser)}。`
  },
  {
    pattern: /^(.+) beat (.+) on penalties after a (.+) draw\.$/,
    replace: (_, winner, loser, score) =>
      `${translateTextToZh(winner)} 在 ${score} 战平后通过点球击败 ${translateTextToZh(loser)}。`
  },
  {
    pattern: /^(.+) advanced after a (.+) draw against (.+)\.$/,
    replace: (_, winner, score, loser) =>
      `${translateTextToZh(winner)}在与${translateTextToZh(loser)}${score}战平后晋级。`
  },
  {
    pattern: /^⚽ (.+) found the decisive goal in a (.+) win\.$/,
    replace: (_, winner, score) => `⚽ ${translateTextToZh(winner)} 在 ${score} 的胜利中打入制胜球。`
  },
  {
    pattern: /^🌟 (.+) scored twice in the rout\.$/,
    replace: (_, player) => `🌟 ${player}在大胜中梅开二度。`
  },
  {
    pattern: /^🌟 (.+) made a huge late double save\.$/,
    replace: (_, player) => `🌟 ${player}最后阶段完成关键连续两连扑。`
  },
  {
    pattern: /^🌟 The clean sheet gave (.+) no way back\.$/,
    replace: (_, team) => `🌟 零封让${translateTextToZh(team)}无力追回。`
  },
  {
    pattern: /^🌟 (.+)'s clean sheet ended (.+)'s run\.$/,
    replace: (_, winner, loser) =>
      `🌟 ${translateTextToZh(winner)}的零封结束了${translateTextToZh(loser)}的征程。`
  },
  {
    pattern: /^🌟 The shootout decided (.+)\.$/,
    replace: (_, context) => `🌟 点球大战决定了${translateTextToZh(context)}。`
  },
  {
    pattern: /^(.+) exited after penalties kept (.+) alive\.$/,
    replace: (_, loser, winner) =>
      `${translateTextToZh(loser)}在点球大战后出局，${translateTextToZh(winner)}继续前进。`
  },
  {
    pattern: /^🌟 (.+)'s attack broke the match open\.$/,
    replace: (_, team) => `🌟 ${translateTextToZh(team)}的进攻彻底打开局面。`
  },
  {
    pattern: /^🌟 (.+) protected a one-goal edge\.$/,
    replace: (_, team) => `🌟 ${translateTextToZh(team)}守住了一球优势。`
  },
  {
    pattern: /^🌟 (.+) created enough separation to control the finish\.$/,
    replace: (_, team) => `🌟 ${translateTextToZh(team)}拉开足够差距并掌控收官阶段。`
  },
  {
    pattern: /^🌟 Both clean sheets kept the match tight\.$/,
    replace: () => "🌟 双方零封让比赛始终紧张。"
  },
  {
    pattern: /^🌟 Neither side pulled clear(?: after trading goals)?\.$/,
    replace: () => "🌟 双方都没能真正拉开差距。"
  },
  {
    pattern: /^🌟 (.+) and (.+) carried the duel without a breakthrough\.$/,
    replace: (_, home, away) =>
      `🌟 ${translateTextToZh(home)}和${translateTextToZh(away)}都没能打出突破。`
  },
  {
    pattern: /^🌟 (.+) and (.+) traded momentum without a winner\.$/,
    replace: (_, home, away) =>
      `🌟 ${translateTextToZh(home)}和${translateTextToZh(away)}互有回应，但没有分出胜负。`
  },
  {
    pattern: /^🌟 (.+) and (.+) cancelled each other out\.$/,
    replace: (_, home, away) =>
      `🌟 ${translateTextToZh(home)}和${translateTextToZh(away)}彼此抵消。`
  },
  {
    pattern: /^🌟 No breakthrough came from a tight draw\.$/,
    replace: () => "🌟 胶着的平局没有产生突破。"
  },
  {
    pattern: /^🌟 (.+) opened it before (.+) finished the scoring\.$/,
    replace: (_, opener, closer) =>
      `🌟 ${translateTextToZh(opener)}首开纪录，${translateTextToZh(closer)}完成最后一击。`
  },
  {
    pattern: /^🌟 (.+) put (.+) in front before (.+) chased the match back\.$/,
    replace: (_, scorer, leadingTeam, winner) =>
      `🌟 ${translateTextToZh(scorer)}帮助${translateTextToZh(leadingTeam)}领先，随后${translateTextToZh(winner)}追回比赛。`
  },
  {
    pattern: /^🌟 (.+)'s (\d+(?:\+\d+)?') winner settled it for (.+)\.$/,
    replace: (_, player, minute, team) =>
      `🌟 ${translateTextToZh(player)}在${minute}打入制胜球，帮助${translateTextToZh(team)}锁定胜局。`
  },
  {
    pattern: /^🌟 (.+)'s (\d+(?:\+\d+)?') equalizer earned (.+) a point\.$/,
    replace: (_, player, minute, team) =>
      `🌟 ${translateTextToZh(player)}在${minute}扳平，帮助${translateTextToZh(team)}拿到1分。`
  },
  {
    pattern: /^🌟 (.+) scored twice as (.+) pulled clear\.$/,
    replace: (_, player, team) =>
      `🌟 ${translateTextToZh(player)}梅开二度，帮助${translateTextToZh(team)}拉开差距。`
  },
  {
    pattern: /^🌟 (.+) completed a hat trick as (.+) ran away with it\.$/,
    replace: (_, player, team) =>
      `🌟 ${translateTextToZh(player)}完成帽子戏法，${translateTextToZh(team)}彻底拉开比分。`
  },
  {
    pattern: /^🌟 A (\d+(?:\+\d+)?') own goal earned (.+) a point\.$/,
    replace: (_, minute, team) =>
      `🌟 ${minute}的乌龙球帮助${translateTextToZh(team)}拿到1分。`
  },
  {
    pattern: /^🌟 A (\d+(?:\+\d+)?') own goal settled it for (.+)\.$/,
    replace: (_, minute, team) =>
      `🌟 ${minute}的乌龙球帮助${translateTextToZh(team)}锁定胜局。`
  },
  {
    pattern: /^🌟 (.+)'s late penalty sealed (.+)'s win\.$/,
    replace: (_, player, team) =>
      `🌟 ${translateTextToZh(player)}最后阶段罚入点球，锁定${translateTextToZh(team)}的胜利。`
  },
  {
    pattern: /^🌟 Cabo Verde held Spain's possession game to a scoreless tournament debut\.$/,
    replace: () => "🌟 佛得角顶住西班牙的控球压力，队史世界杯首战收获零封平局。"
  },
  {
    pattern: /^🌟 Curaçao's first World Cup point came through a hard-earned clean sheet\.$/,
    replace: () => "🌟 库拉索凭借来之不易的零封拿到队史首个世界杯积分。"
  },
  {
    pattern: /^🌟 IR Iran kept Belgium's creators quiet and made the low-margin plan stick\.$/,
    replace: () => "🌟 伊朗限制住比利时的创造核心，让低比分计划成功落地。"
  },
  {
    pattern: /^🌟 (.+) headed (.+) in front early\.$/,
    replace: (_, player, team) =>
      `🌟 ${translateTextToZh(player)}早早头球帮助${translateTextToZh(team)}领先。`
  },
  {
    pattern: /^🌟 (.+) scored twice, while (.+) and (.+) added second-half goals\.$/,
    replace: (_, firstPlayer, secondPlayer, thirdPlayer) =>
      `🌟 ${translateTextToZh(firstPlayer)}梅开二度，${translateTextToZh(secondPlayer)}和${translateTextToZh(thirdPlayer)}下半场也取得进球。`
  },
  {
    pattern: /^🌟 (.+) scored in stoppage time to settle a tense opener in (.+)\.$/,
    replace: (_, player, city) =>
      `🌟 ${translateTextToZh(player)}补时破门，在${translateTextToZh(city)}结束了这场紧张的首战。`
  },
  {
    pattern: /^🌟 (.+) scored and helped (.+) answer (.+)'s first World Cup goal\.$/,
    replace: (_, player, team, opponent) =>
      `🌟 ${translateTextToZh(player)}破门，并帮助${translateTextToZh(team)}回应${translateTextToZh(opponent)}队史世界杯首球。`
  },
  {
    pattern: /^🌟 (.+)'s press made it scrappy, but (.+) sealed (.+)'s control late\.$/,
    replace: (_, pressingTeam, player, controllingTeam) =>
      `🌟 ${translateTextToZh(pressingTeam)}的逼抢让比赛很零碎，但${translateTextToZh(player)}最后阶段锁定了${translateTextToZh(controllingTeam)}的控制。`
  },
  {
    pattern: /^🌟 (.+) started bravely, then the wet restart exposed their build-out mistakes\.$/,
    replace: (_, team) =>
      `🌟 ${translateTextToZh(team)}开局很勇敢，但雨后重启暴露了他们的后场出球失误。`
  },
  {
    pattern: /^🌟 (.+) came through a tight one-goal match\.$/,
    replace: (_, team) => `🌟 ${translateTextToZh(team)}从一场胶着的一球小胜中突围。`
  },
  {
    pattern: /^A (\d+(?:\+\d+)?') own goal put (.+) in front before (.+) answered for (.+)\.$/,
    replace: (_, minute, leadingTeam, answeringPlayer, answeringTeam) =>
      `${minute}的乌龙球让${translateTextToZh(leadingTeam)}领先，随后${translateTextToZh(answeringPlayer)}为${translateTextToZh(answeringTeam)}回应。`
  },
  {
    pattern: /^(.+) put (.+) in front before a (\d+(?:\+\d+)?') own goal answered for (.+)\.$/,
    replace: (_, opener, leadingTeam, minute, answeringTeam) =>
      `${translateTextToZh(opener)}让${translateTextToZh(leadingTeam)}领先，随后${minute}的乌龙球让${translateTextToZh(answeringTeam)}回应。`
  },
  {
    pattern: /^(.+) put (.+) in front before (.+) answered for (.+)\.$/,
    replace: (_, opener, leadingTeam, answeringPlayer, answeringTeam) =>
      `${translateTextToZh(opener)}让${translateTextToZh(leadingTeam)}领先，随后${translateTextToZh(answeringPlayer)}为${translateTextToZh(answeringTeam)}回应。`
  },
  {
    pattern: /^A (\d+(?:\+\d+)?') own goal struck first for (.+), forcing (.+) to chase the match\.$/,
    replace: (_, minute, leader, chaser) =>
      `${minute}的乌龙球先让${translateTextToZh(leader)}领先，迫使${translateTextToZh(chaser)}追赶比分。`
  },
  {
    pattern: /^(.+) struck first for (.+), forcing (.+) to chase the match\.$/,
    replace: (_, scorer, leader, chaser) =>
      `${translateTextToZh(scorer)}先为${translateTextToZh(leader)}破门，迫使${translateTextToZh(chaser)}追赶比分。`
  },
  {
    pattern: /^A (\d+(?:\+\d+)?') own goal put (.+) ahead early, making (.+) chase the match\.$/,
    replace: (_, minute, leader, chaser) =>
      `${minute}的乌龙球早早让${translateTextToZh(leader)}领先，让${translateTextToZh(chaser)}陷入追赶。`
  },
  {
    pattern: /^(.+) put (.+) ahead early, making (.+) chase the match\.$/,
    replace: (_, scorer, leader, chaser) =>
      `${translateTextToZh(scorer)}早早帮助${translateTextToZh(leader)}领先，让${translateTextToZh(chaser)}陷入追赶。`
  },
  {
    pattern: /^A (\d+(?:\+\d+)?') own goal opened the scoring for (.+)\.$/,
    replace: (_, minute, team) => `${minute}的乌龙球帮助${translateTextToZh(team)}首开纪录。`
  },
  {
    pattern: /^(.+) opened the scoring for (.+)\.$/,
    replace: (_, scorer, team) => `${translateTextToZh(scorer)}帮助${translateTextToZh(team)}首开纪录。`
  },
  {
    pattern: /^A (\d+(?:\+\d+)?') own goal broke through for (.+), shifting the match toward (.+)\.$/,
    replace: (_, minute, team, sameTeam) =>
      `${minute}的乌龙球让${translateTextToZh(team)}打破僵局，比赛开始向${translateTextToZh(sameTeam)}倾斜。`
  },
  {
    pattern: /^(.+) broke through for (.+), shifting the match toward (.+)\.$/,
    replace: (_, scorer, team, sameTeam) =>
      `${translateTextToZh(scorer)}为${translateTextToZh(team)}打破僵局，比赛开始向${translateTextToZh(sameTeam)}倾斜。`
  },
  {
    pattern: /^A (\d+(?:\+\d+)?') own goal brought (.+) level before (.+) completed the turnaround\.$/,
    replace: (_, minute, team, winner) =>
      `${minute}的乌龙球让${translateTextToZh(team)}扳平，随后${translateTextToZh(winner)}完成逆转。`
  },
  {
    pattern: /^(.+) brought (.+) level before a (\d+(?:\+\d+)?') own goal completed the turnaround\.$/,
    replace: (_, equalizer, team, minute) =>
      `${translateTextToZh(equalizer)}帮助${translateTextToZh(team)}扳平，随后${minute}的乌龙球完成逆转。`
  },
  {
    pattern: /^(.+) brought (.+) level before (.+) completed the turnaround\.$/,
    replace: (_, equalizer, team, winner) =>
      `${translateTextToZh(equalizer)}帮助${translateTextToZh(team)}扳平，随后${translateTextToZh(winner)}完成逆转。`
  },
  {
    pattern: /^A (\d+(?:\+\d+)?') own goal rescued a point for (.+)\.$/,
    replace: (_, minute, team) => `${minute}的乌龙球帮助${translateTextToZh(team)}抢下1分。`
  },
  {
    pattern: /^(.+)'s (\d+(?:\+\d+)?') equalizer rescued a point for (.+)\.$/,
    replace: (_, scorer, minute, team) =>
      `${translateTextToZh(scorer)}在${minute}扳平，帮助${translateTextToZh(team)}抢下1分。`
  },
  {
    pattern: /^A (\d+(?:\+\d+)?') own goal brought (.+) level\.$/,
    replace: (_, minute, team) => `${minute}的乌龙球让${translateTextToZh(team)}扳平。`
  },
  {
    pattern: /^(.+)'s (\d+(?:\+\d+)?') equalizer brought (.+) level\.$/,
    replace: (_, scorer, minute, team) =>
      `${translateTextToZh(scorer)}在${minute}扳平，帮助${translateTextToZh(team)}追平比分。`
  },
  {
    pattern: /^A (\d+(?:\+\d+)?') own goal settled a tight match for (.+)\.$/,
    replace: (_, minute, team) => `${minute}的乌龙球帮助${translateTextToZh(team)}赢下胶着比赛。`
  },
  {
    pattern: /^(.+)'s (\d+(?:\+\d+)?') winner settled a tight match for (.+)\.$/,
    replace: (_, scorer, minute, team) =>
      `${translateTextToZh(scorer)}在${minute}打入制胜球，帮助${translateTextToZh(team)}赢下胶着比赛。`
  },
  {
    pattern: /^A (\d+(?:\+\d+)?') own goal added the final word as (.+) pulled away\.$/,
    replace: (_, minute, team) => `${minute}的乌龙球成为最后一击，${translateTextToZh(team)}拉开差距。`
  },
  {
    pattern: /^(.+) added the final word as (.+) pulled away\.$/,
    replace: (_, scorer, team) => `${translateTextToZh(scorer)}完成最后一击，${translateTextToZh(team)}拉开差距。`
  },
  {
    pattern: /^A (\d+(?:\+\d+)?') own goal finished the scoring as (.+) pulled away\.$/,
    replace: (_, minute, team) => `${minute}的乌龙球完成最后进球，${translateTextToZh(team)}拉开差距。`
  },
  {
    pattern: /^(.+) finished the scoring as (.+) pulled away\.$/,
    replace: (_, scorer, team) => `${translateTextToZh(scorer)}完成最后进球，${translateTextToZh(team)}拉开差距。`
  },
  {
    pattern: /^(.+) assisted (.+) as (.+) pulled away\.$/,
    replace: (_, creator, scorers, team) =>
      `${translateTextToZh(creator)}助攻${translateTextToZh(scorers)}破门，${translateTextToZh(team)}拉开差距。`
  },
  {
    pattern: /^(.+) scored (twice|three times|\d+ times) as (.+) kept widening the gap\.$/,
    replace: (_, scorer, countText, team) => {
      const scoringText =
        countText === "twice" ? "梅开二度" : countText === "three times" ? "上演帽子戏法" : `打进${countText.replace(" times", "")}球`;
      return `${translateTextToZh(scorer)}${scoringText}，${translateTextToZh(team)}不断拉开差距。`;
    }
  },
  {
    pattern: /^(.+)'s (twice|three times|\d+ times) gave (.+) the scoring separation\.$/,
    replace: (_, scorer, countText, team) => {
      const scoringText =
        countText === "twice" ? "梅开二度" : countText === "three times" ? "帽子戏法" : `${countText.replace(" times", "")}球`;
      return `${translateTextToZh(scorer)}的${scoringText}帮助${translateTextToZh(team)}拉开比分。`;
    }
  },
  {
    pattern: /^(.+) kept (.+) out and closed the match with a clean sheet\.$/,
    replace: (_, winner, loser) =>
      `${translateTextToZh(winner)}零封${translateTextToZh(loser)}，用清白之身收下比赛。`
  },
  {
    pattern: /^(.+)'s attack kept finding space and turned the finish into a rout\.$/,
    replace: (_, team) => `${translateTextToZh(team)}的进攻不断找到空间，把收官阶段变成大胜。`
  },
  {
    pattern: /^(.+)'s opener made (.+) sweat, but the later chances finally turned\.$/,
    replace: (_, openerTeam, comebackTeam) =>
      `${translateTextToZh(openerTeam)}的开局进球让${translateTextToZh(comebackTeam)}一度紧张，但后面的机会终于转向。`
  },
  {
    pattern: /^(.+) stayed close enough to keep the final minutes tense\.$/,
    replace: (_, team) => `${translateTextToZh(team)}一直咬住比分，让最后几分钟保持紧张。`
  },
  {
    pattern: /^(.+) found the only goal, leaving (.+) chasing a 1-0 match\.$/,
    replace: (_, winner, loser) =>
      `${translateTextToZh(winner)}打入全场唯一进球，让${translateTextToZh(loser)}整场追赶这场1-0。`
  },
  {
    pattern: /^(.+) made the (.+) scoreline stand in a tight match\.$/,
    replace: (_, winner, score) =>
      `${translateTextToZh(winner)}在胶着比赛中守住了${score}的比分。`
  },
  {
    pattern: /^(.+) scored but never found the goal that would reopen the finish\.$/,
    replace: (_, loser) =>
      `${translateTextToZh(loser)}取得进球，但没能再找到重新打开收官阶段的进球。`
  },
  {
    pattern: /^(.+) got the decisive details right in a match that stayed tight\.$/,
    replace: (_, team) => `${translateTextToZh(team)}在胶着比赛里把关键细节做对。`
  },
  {
    pattern: /^(.+) closed the result without needing another late twist\.$/,
    replace: (_, team) => `${translateTextToZh(team)}稳住结果，没有让比赛再出现最后转折。`
  },
  {
    pattern: /^(.+) and (.+) traded pressure without finding a goal\.$/,
    replace: (_, home, away) =>
      `${translateTextToZh(home)}和${translateTextToZh(away)}互相施压，但都没有进球。`
  },
  {
    pattern: /^Both defenses kept the scoring lanes closed through full time\.$/,
    replace: () => "双方防守都封住了得分通道，直到终场。"
  },
  {
    pattern: /^(.+) and (.+) stayed locked together until the final whistle\.$/,
    replace: (_, home, away) => `${translateTextToZh(home)}和${translateTextToZh(away)}一直胶着到终场哨响。`
  },
  {
    pattern: /^(.+) and (.+) kept trading momentum instead of pulling clear\.$/,
    replace: (_, home, away) => `${translateTextToZh(home)}和${translateTextToZh(away)}轮流掌握势头，却没人拉开差距。`
  },
  {
    pattern: /^The late pressure never produced a winner after the match came back level\.$/,
    replace: () => "比赛被扳平后，最后阶段的压力没有再产生制胜球。"
  },
  {
    pattern: /^(.+)'s (\d+(?:\+\d+)?') equalizer eventually forced the shootout\.$/,
    replace: (_, player, minute) =>
      `${translateTextToZh(player)}在${minute}扳平，最终把比赛拖入点球大战。`
  },
  {
    pattern: /^A (\d+(?:\+\d+)?') own goal eventually forced the shootout\.$/,
    replace: (_, minute) => `${minute}的乌龙球最终把比赛拖入点球大战。`
  },
  {
    pattern: /^(.+) and (.+) stayed scoreless until penalties\.$/,
    replace: (_, home, away) =>
      `${translateTextToZh(home)}和${translateTextToZh(away)}一直到点球大战前都没有进球。`
  },
  {
    pattern: /^The (.+) grind kept (.+)'s (.+) relevant all the way to penalties\.$/,
    replace: (_, score, team, route) =>
      `${score}的胶着让${translateTextToZh(team)}的${translateTextToZh(route)}一直到点球大战都保持影响。`
  },
  {
    pattern: /^The (.+) grind stayed tense enough to leave the knockout tie to penalties\.$/,
    replace: (_, score) => `${score}的胶着让这场淘汰赛对决一直悬到点球大战。`
  },
  {
    pattern: /^(.+) won the shootout (.+) after a (.+) draw\.$/,
    replace: (_, winner, shootoutScore, score) =>
      `${translateTextToZh(winner)}在${score}战平后通过点球大战${shootoutScore}胜出。`
  },
  {
    pattern: /^(.+) survived the shootout after a (.+) draw\.$/,
    replace: (_, winner, score) =>
      `${translateTextToZh(winner)}在${score}战平后通过点球大战晋级。`
  },
  {
    pattern: /^(.+) were cleaner from the spot, winning the shootout (.+) after the (.+) draw\.$/,
    replace: (_, winner, shootoutScore, score) =>
      `${translateTextToZh(winner)}点球处理更稳，在${score}战平后通过点球大战${shootoutScore}胜出。`
  },
  {
    pattern: /^(.+) survived from the spot after the (.+) draw\.$/,
    replace: (_, winner, score) =>
      `${translateTextToZh(winner)}在${score}战平后通过点球大战晋级。`
  },
  {
    pattern: /^(.+) were cleaner from the spot, winning the (.+) through the shootout (.+) after the (.+) draw\.$/,
    replace: (_, winner, title, shootoutScore, score) =>
      `${translateTextToZh(winner)}点球处理更稳，在${score}战平后通过点球大战${shootoutScore}赢得${translateTextToZh(title)}。`
  },
  {
    pattern: /^(.+) lifted the (.+) title through the shootout\.$/,
    replace: (_, winner, title) =>
      `${translateTextToZh(winner)}通过点球大战捧起${translateTextToZh(title)}冠军。`
  },
  {
    pattern: /^(.+)'s (\d+(?:\+\d+)?') (goal|penalty) gave (.+) a reply\.$/,
    replace: (_, player, minute, finishType, team) =>
      `${translateTextToZh(player)}在${minute}${finishType === "penalty" ? "罚入点球" : "进球"}，帮助${translateTextToZh(team)}作出回应。`
  },
  {
    pattern: /^A (\d+(?:\+\d+)?') own goal gave (.+) a reply\.$/,
    replace: (_, minute, team) =>
      `${minute}的乌龙球让${translateTextToZh(team)}作出回应。`
  },
  {
    pattern: /^(.+)'s (\d+(?:\+\d+)?') equalizer left the tie level\.$/,
    replace: (_, player, minute) =>
      `${translateTextToZh(player)}在${minute}扳平，让这组对决仍然持平。`
  },
  {
    pattern: /^A (\d+(?:\+\d+)?') own goal left the tie level\.$/,
    replace: (_, minute) => `${minute}的乌龙球让这组对决仍然持平。`
  },
  {
    pattern: /^(.+) scored (twice|three times|\d+ times) as the draw kept swinging\.$/,
    replace: (_, scorer, countText) => {
      const scoringText =
        countText === "twice" ? "梅开二度" : countText === "three times" ? "上演帽子戏法" : `打进${countText.replace(" times", "")}球`;
      return `${translateTextToZh(scorer)}${scoringText}，让这场平局持续摇摆。`;
    }
  },
  {
    pattern: /^The draw left the (.+) tie unresolved after (.+)\.$/,
    replace: (_, round, ending) =>
      `平局让${translateTextToZh(round)}对决在${translateTextToZh(ending)}后仍未决出胜负。`
  },
  {
    pattern: /^📊 Both sides took one point from (.+)\.$/,
    replace: (_, context) => `📊 双方都从 ${translateTextToZh(context)} 中拿到1分。`
  },
  {
    pattern: /^📊 Both teams took one point from (.+)\.$/,
    replace: (_, context) => `📊 双方都从 ${translateTextToZh(context)} 中拿到1分。`
  },
  {
    pattern: /^📊 (.+) took three points from (.+)\.$/,
    replace: (_, winner, context) => `📊 ${translateTextToZh(winner)} 从 ${translateTextToZh(context)} 中拿到3分。`
  },
  {
    pattern: /^📊 (.+) took three points in (.+)\.$/,
    replace: (_, winner, context) => `📊 ${translateTextToZh(winner)} 在 ${translateTextToZh(context)} 中拿到3分。`
  },
  {
    pattern: /^📊 (.+) took three points and (.+) GD in (.+)\.$/,
    replace: (_, winner, gd, context) => `📊 ${translateTextToZh(winner)} 在 ${translateTextToZh(context)} 中拿到3分，并获得 ${gd} 净胜球。`
  },
  {
    pattern: /^📊 (.+) still needs a knockout winner loaded\.$/,
    replace: (_, context) => `📊 ${translateTextToZh(context)}仍需载入淘汰赛胜者。`
  },
  {
    pattern: /^📊 (.+) reached the (.+) and (.+) exited\.$/,
    replace: (_, winner, target, loser) =>
      `📊 ${translateTextToZh(winner)}晋级${translateTextToZh(target)}，${translateTextToZh(loser)}出局。`
  },
  {
    pattern: /^📊 (.+) advanced from the (.+)\.$/,
    replace: (_, winner, context) =>
      `📊 ${translateTextToZh(winner)}从${translateTextToZh(context)}晋级。`
  },
  {
    pattern: /^📊 (.+) advanced from (.+)\.$/,
    replace: (_, winner, context) =>
      `📊 ${translateTextToZh(winner)}从${translateTextToZh(context)}晋级。`
  },
  {
    pattern: /^📊 (.+) won the World Cup\.$/,
    replace: (_, winner) => `📊 ${translateTextToZh(winner)}赢得世界杯。`
  },
  {
    pattern: /^📊 (.+) secured third place\.$/,
    replace: (_, winner) => `📊 ${translateTextToZh(winner)}获得第三名。`
  },
  {
    pattern: /^📊 Both teams moved to (.+) point(?:s)? in Group ([A-L])\.$/,
    replace: (_, points, groupId) => `📊 双方都在${groupId}组达到${formatZhPointCount(points)}。`
  },
  {
    pattern: /^📊 (.+) moved to (.+) point(?:s)? in Group ([A-L]) and left (.+) without a point\.$/,
    replace: (_, winner, points, groupId, loser) =>
      `📊 ${translateTextToZh(winner)}在${groupId}组达到${formatZhPointCount(points)}，${translateTextToZh(loser)}仍未拿分。`
  },
  {
    pattern: /^📊 (.+) moved to (.+) point(?:s)? in Group ([A-L]) while (.+) stayed on (.+) point(?:s)?\.$/,
    replace: (_, winner, winnerPoints, groupId, otherTeam, otherPoints) =>
      `📊 ${translateTextToZh(winner)}在${groupId}组达到${formatZhPointCount(winnerPoints)}，${translateTextToZh(otherTeam)}仍是${formatZhPointCount(otherPoints)}。`
  },
  {
    pattern: /^📊 (.+) moved to (.+) point(?:s)? and (.+) to (.+) point(?:s)? in Group ([A-L])\.$/,
    replace: (_, firstTeam, firstPoints, secondTeam, secondPoints, groupId) =>
      `📊 ${translateTextToZh(firstTeam)}在${groupId}组达到${formatZhPointCount(firstPoints)}，${translateTextToZh(secondTeam)}达到${formatZhPointCount(secondPoints)}。`
  },
  {
    pattern: /^📊 (.+) reached (.+) point(?:s)? in Group ([A-L]) and booked a Round of 32 place\.$/,
    replace: (_, team, points, groupId) =>
      `📊 ${translateTextToZh(team)}在${groupId}组达到${formatZhPointCount(points)}，并锁定32强席位。`
  },
  {
    pattern: /^(.+) beat (.+) (\d+-\d+)\.$/,
    replace: (_, winner, loser, score) => `${translateTextToZh(winner)} 以 ${score} 击败 ${translateTextToZh(loser)}。`
  },
  {
    pattern: /^(.+) lead (.+) (\d+-\d+)\.$/,
    replace: (_, winner, loser, score) => `${translateTextToZh(winner)} 以 ${score} 领先 ${translateTextToZh(loser)}。`
  },
  {
    pattern: /^(.+) and (.+) drew (\d+-\d+)\.$/,
    replace: (_, home, away, score) => `${translateTextToZh(home)} 和 ${translateTextToZh(away)} 以 ${score} 战平。`
  },
  {
    pattern: /^(.+) and (.+) tied (\d+-\d+)\.$/,
    replace: (_, home, away, score) => `${translateTextToZh(home)} 和 ${translateTextToZh(away)} 以 ${score} 战平。`
  },
  {
    pattern: /^(.+) and (.+) are level (\d+-\d+)\.$/,
    replace: (_, home, away, score) => `${translateTextToZh(home)} 和 ${translateTextToZh(away)} 以 ${score} 战平。`
  },
  {
    pattern: /^Group ([A-Z0-9]+)$/,
    replace: (_, groupId) => `${groupId}组`
  },
  {
    pattern: /^Round of (\d+)$/,
    replace: (_, teamCount) => `${teamCount}强赛`
  },
  {
    pattern: /^Quarter Finals$/,
    replace: () => "四分之一决赛"
  },
  {
    pattern: /^Semi Finals$/,
    replace: () => "半决赛"
  },
  {
    pattern: /^First Round$/,
    replace: () => "第一轮"
  },
  {
    pattern: /^3rd Place$/,
    replace: () => "季军赛"
  },
  {
    pattern: /^\((.+) won (\d+-\d+) on penalties\)$/,
    replace: (_, winner, score) => `（${translateTextToZh(winner)}点球大战${score}胜出）`
  },
  {
    pattern: /^(World Cup|Euro|Gold Cup|Copa|ConfedCup|Olympics) (\d+) - (.+)$/,
    replace: (_, competition, year, stage) =>
      `${year}年${translateTextToZh(competition)} - ${translateTextToZh(stage)}`
  },
  {
    pattern: /^UEFA Nations League (\d+) - Group ([A-Z0-9]+)$/,
    replace: (_, year, groupId) => `${year}年${translateTextToZh("UEFA Nations League")} - ${groupId}组`
  },
  {
    pattern: /^World Cup (\d+) - Group ([A-Z])$/,
    replace: (_, year, groupId) => `${year}年世界杯 - ${groupId}组`
  },
  {
    pattern: /^Gold Cup (\d+) - Group ([A-Z])$/,
    replace: (_, year, groupId) => `${year}年金杯赛 - ${groupId}组`
  },
  {
    pattern: /^Gold Cup (\d+) - Quarter Finals$/,
    replace: (_, year) => `${year}年金杯赛 - 四分之一决赛`
  },
  {
    pattern: /^Copa (\d+) - Group ([A-Z])$/,
    replace: (_, year, groupId) => `${year}年美洲杯 - ${groupId}组`
  },
  {
    pattern: /^(Al Jazeera|England Football|ESPN|FIFA|FOX Sports|Guardian) (.+) vs (.+) final score(?: cross-check)?$/,
    replace: (_, source, home, away) =>
      `${source} ${translateTextToZh(home)} 对 ${translateTextToZh(away)} 最终比分`
  },
  {
    pattern: /^(.+) vs (.+) public odds consensus$/,
    replace: (_, home, away) => `${translateTextToZh(home)} 对 ${translateTextToZh(away)} 公开赔率共识`
  },
  {
    pattern: /^National Football Teams (.+)-(.+) H2H cross-check$/,
    replace: (_, home, away) => `National Football Teams ${translateTextToZh(home)}-${translateTextToZh(away)} 交锋记录核对`
  },
  {
    pattern: /^National Football Teams H2H encounter records$/,
    replace: () => "National Football Teams交锋记录"
  },
  {
    pattern: /^(.+) (.+) illness update$/,
    replace: (_, source, player) => `${source} ${translateTextToZh(player)} 伤病动态`
  },
  {
    pattern: /^(Al Jazeera|FIFA|Guardian|Nippon\\.com) (.+) squad(?: and omissions| update)?$/,
    replace: (_, source, team) => `${source} ${translateTextToZh(team)} 阵容消息`
  },
  {
    pattern: /^(Al Jazeera|FIFA|Guardian) (.+) vs (.+) live match status$/,
    replace: (_, source, home, away) =>
      `${source} ${translateTextToZh(home)} 对 ${translateTextToZh(away)} 实时比赛状态`
  },
  {
    pattern: /^(.+) vs (.+) final score(?: cross-check)?$/,
    replace: (_, home, away) => `${translateTextToZh(home)} 对 ${translateTextToZh(away)} 最终比分`
  },
  {
    pattern: /^(.+) vs (.+)$/,
    replace: (_, home, away) => `${translateTextToZh(home)} 对 ${translateTextToZh(away)}`
  },
  {
    pattern: /^(.+) (\d+-\d+) (.+)$/,
    replace: (_, home, score, away) => `${translateTextToZh(home)} ${score} ${translateTextToZh(away)}`
  },
  {
    pattern: /^(\d+) points?, (.+) goal difference, (\d+) goals? scored\.$/,
    replace: (_, points, gd, goals) => `${points}分，净胜球${gd}，进${goals}球。`
  },
  {
    pattern: /^(\d+) goals? scored; ahead on total goals scored\.$/,
    replace: (_, goals) => `进${goals}球；总进球数占优。`
  },
  {
    pattern: /^(\d+) goals? scored; behind on total goals scored\.$/,
    replace: (_, goals) => `进${goals}球；总进球数落后。`
  },
  {
    pattern: /^(.+) goal difference; ahead on goal difference\.$/,
    replace: (_, gd) => `净胜球${gd}；净胜球占优。`
  },
  {
    pattern: /^(.+) goal difference; behind on goal difference\.$/,
    replace: (_, gd) => `净胜球${gd}；净胜球落后。`
  },
  {
    pattern: /^(\d+) points?; above next team on points\.$/,
    replace: (_, points) => `${points}分；积分高于下一队。`
  },
  {
    pattern: /^(\d+) points?; behind next team on points\.$/,
    replace: (_, points) => `${points}分；积分落后下一队。`
  },
  {
    pattern: /^Path to match (\d+)$/,
    replace: (_, matchNumber) => `通往第${matchNumber}场`
  },
  {
    pattern: /^Winner match (\d+)$/,
    replace: (_, matchNumber) => `第${matchNumber}场胜者`
  },
  {
    pattern: /^(.+) archive$/,
    replace: (_, year) => `${year}存档`
  },
  {
    pattern: /^Prediction source: (.+)$/,
    replace: (_, help) => `预测来源：${translateTextToZh(help)}`
  },
  {
    pattern: /^Final pending; verified score is not loaded yet$/,
    replace: () => "最终比分待确认；已核验比分尚未载入"
  },
  {
    pattern: /^Score pending; verified score is not loaded yet$/,
    replace: () => "当前比分待确认；已核验比分尚未载入"
  }
];

const matchList = document.querySelector("#match-list");
const matchInfo = document.querySelector("#match-info");
const timezoneSelect = document.querySelector("#timezone-select");
const timezoneControl = document.querySelector(".timezone-control");
const dayLabel = document.querySelector("#day-label");
const datePopover = document.querySelector("#date-popover");
const teamSearch = document.querySelector("#team-search");
const teamSearchToggle = document.querySelector("#team-search-toggle");
const teamSearchInput = document.querySelector("#team-search-input");
const teamSearchClear = document.querySelector("#team-search-clear");
const calendarGrid = document.querySelector("#calendar-grid");
const calendarMonthLabel = document.querySelector("#calendar-month-label");
const calendarPrevMonth = document.querySelector("#calendar-prev-month");
const calendarNextMonth = document.querySelector("#calendar-next-month");
const calendarYesterdayButton = document.querySelector("#calendar-yesterday");
const calendarTodayButton = document.querySelector("#calendar-today");
const catchUpButton = document.querySelector("#catch-up-button");
const catchUpPopover = document.querySelector("#catch-up-popover");
const catchUpList = document.querySelector("#catch-up-list");
const standingsYearButton = document.querySelector("#standings-year-button");
const standingsYearPopover = document.querySelector("#standings-year-popover");
const standingsYearGrid = document.querySelector("#standings-year-grid");
const standingsModeTabs = document.querySelectorAll(".standings-mode-tab");
const standingsModeTabsShell = document.querySelector("#standings-mode-tabs");
const standingsSummary = document.querySelector("#standings-summary");
const standingsGrid = document.querySelector("#standings-grid");
const sourceNote = document.querySelector("#source-note");
const brandHomeLink = document.querySelector(".site-brand");
const brandLabel = document.querySelector(".site-brand .brand-label");
const juggleRecord = document.querySelector("#juggle-record");
const headerControls = document.querySelector("#header-controls");
const adminMessageBanner = document.querySelector("#admin-message-banner");
const adminMessageLabel = document.querySelector("#admin-message-label");
const adminMessageText = document.querySelector("#admin-message-text");
const adminMessageDismiss = document.querySelector("#admin-message-dismiss");
const settingsButton = document.querySelector("#settings-button");
const settingsPopover = document.querySelector("#settings-popover");
const languageSwitch = document.querySelector("#language-switch");
const languageButtons = document.querySelectorAll(".language-option");
const settingsLanguageLabel = document.querySelector("#settings-language-label");
const timezoneLabel = document.querySelector(".timezone-label");
const settingsYesterdayLabel = document.querySelector("#settings-yesterday-label");
const showYesterdayToggle = document.querySelector("#show-yesterday-toggle");
const standingsHeading = document.querySelector("#standings-heading");
const calendarWeekdayLabels = document.querySelectorAll(".calendar-weekdays span");
const viewTabsShell = document.querySelector(".view-tabs");
const viewTabs = document.querySelectorAll(".view-tab");
const viewPanels = {
  matches: document.querySelector("#matches-view"),
  standings: document.querySelector("#standings-view")
};

const defaultTimeZone =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
const timeZones = [
  "America/Los_Angeles",
  "America/Vancouver",
  "America/Denver",
  "America/Chicago",
  "America/Mexico_City",
  "America/New_York",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Berlin",
  "Africa/Casablanca",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney"
];
const zhTimeZoneNames = {
  "America/Los_Angeles": "洛杉矶",
  "America/Vancouver": "温哥华",
  "America/Denver": "丹佛",
  "America/Chicago": "芝加哥",
  "America/Mexico_City": "墨西哥城",
  "America/New_York": "纽约",
  "America/Toronto": "多伦多",
  "America/Sao_Paulo": "圣保罗",
  "Europe/London": "伦敦",
  "Europe/Paris": "巴黎",
  "Europe/Madrid": "马德里",
  "Europe/Berlin": "柏林",
  "Africa/Casablanca": "卡萨布兰卡",
  "Africa/Lagos": "拉各斯",
  "Africa/Johannesburg": "约翰内斯堡",
  "Asia/Dubai": "迪拜",
  "Asia/Kolkata": "加尔各答",
  "Asia/Bangkok": "曼谷",
  "Asia/Shanghai": "上海",
  "Asia/Tokyo": "东京",
  "Australia/Sydney": "悉尼"
};
const CJK_CHARACTER_PATTERN =
  /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]/u;
const MATCH_LIVE_WINDOW_MS = 2.25 * 60 * 60 * 1000;
const DATA_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const LIVE_DATA_TIMEOUT_MS = 4000;
const CURRENT_STANDINGS_YEAR = 2026;
const DEFAULT_KNOCKOUT_FIELD_SIZE = 32;
const DEFAULT_AUTOMATIC_ADVANCERS_PER_GROUP = 2;
const DEFAULT_THIRD_PLACE_ADVANCERS = 8;
const DEFAULT_CURRENT_STANDINGS_MODE = "tournament";
const THIRD_PLACE_STANDING_INDEX = 2;
const CURRENT_STANDINGS_SUMMARY =
  "Top two in each group advance. The best eight third-place teams also reach the Round of 32.";
const THIRD_PLACE_STANDINGS_SUMMARY =
  "Third-place standings across all groups. The top eight advance.";
const TOURNAMENT_STANDINGS_SUMMARY =
  "Round of 32 slots use current standings and remaining projections. Later rounds are predictions.";
const HISTORICAL_STANDINGS_SUMMARY =
  "Final group tables computed from archived match results.";
const HISTORICAL_TOURNAMENT_STANDINGS_SUMMARY =
  "Knockout bracket uses archived match results.";
const HISTORICAL_FINAL_GROUP_STAGE_CONFIGS = {
  1974: {
    label: "Final round",
    maxMatchNumber: 36,
    minMatchNumber: 25
  },
  1978: {
    label: "Final round",
    maxMatchNumber: 36,
    minMatchNumber: 25
  },
  1982: {
    label: "Second round",
    maxMatchNumber: 48,
    minMatchNumber: 37
  }
};
const TOURNAMENT_MOBILE_BREAKPOINT_QUERY = "(max-width: 900px)";
const TOURNAMENT_PROGRESS_ROUNDS = [
  {
    id: "round-of-32",
    label: "Round of 32",
    matchNumbers: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87]
  },
  { id: "round-of-16", label: "Round of 16", matchNumbers: [89, 90, 93, 94, 91, 92, 95, 96] },
  { id: "quarter-finals", label: "Quarter-finals", matchNumbers: [97, 98, 99, 100] },
  { id: "semi-finals", label: "Semi-finals", matchNumbers: [101, 102] },
  { id: "final", label: "Final", matchNumbers: [104, 103] }
];
const TOURNAMENT_PROGRESS_PATH_ROWS = 16;
const TOURNAMENT_POSTER_HALVES = [
  {
    side: "left",
    semifinalMatchNumber: 101,
    matchNumbers: [74, 77, 73, 75, 83, 84, 81, 82]
  },
  {
    side: "right",
    semifinalMatchNumber: 102,
    matchNumbers: [76, 78, 79, 80, 86, 88, 85, 87]
  }
];
const TEAM_SEARCH_ALIASES_BY_TEAM_ID = {
  ALG: ["a er ji li ya", "aerjiliya", "阿爾及利亞"],
  ARG: ["a gen ting", "agenting"],
  AUS: ["ao da li ya", "aodaliya", "澳大利亞"],
  AUT: ["ao di li", "aodili", "奧地利"],
  BEL: ["bi li shi", "bilishi", "比利時"],
  BIH: ["bo hei", "bohei", "bo si ni ya", "bosiniya", "波黑", "波斯尼亞和黑塞哥維那"],
  BRA: ["ba xi", "baxi"],
  CAN: ["jia na da", "jianada"],
  CIV: ["ivory coast", "cote divoire", "cote d ivoire", "cote", "ke te di wa", "ketediwa", "象牙海岸"],
  COD: ["congo", "congo dr", "dr congo", "gang guo", "gangguo", "刚果", "剛果", "剛果民主共和國"],
  COL: ["ge lun bi ya", "gelunbiya", "哥倫比亞"],
  CPV: ["cape verde", "fo de jiao", "fodejiao", "维德角", "維德角"],
  CRO: ["ke luo di ya", "keluodiya", "克羅地亞"],
  CUW: ["ku la suo", "kulasuo", "庫拉索"],
  CZE: ["czech republic", "czechia", "jie ke", "jieke", "捷克共和国", "捷克共和國"],
  ECU: ["e gua duo er", "eguaduoer", "厄瓜多爾"],
  EGY: ["ai ji", "aiji"],
  ENG: ["ying ge lan", "yinggelan", "英格蘭"],
  ESP: ["xi ban ya", "xibanya"],
  FRA: ["fa guo", "faguo", "法國"],
  GER: ["de guo", "deguo", "德国", "德國"],
  GHA: ["jia na", "jiana", "加納"],
  HAI: ["hai di", "haidi"],
  IRN: ["iran", "ir iran", "yi lang", "yilang"],
  IRQ: ["yi la ke", "yilake"],
  JOR: ["yue dan", "yuedan", "約旦"],
  JPN: ["ri ben", "riben"],
  KOR: ["korea", "korea republic", "south korea", "han guo", "hanguo", "韓國"],
  KSA: ["saudi", "sha te", "shate", "sha te a la bo", "shatealabo", "沙特", "沙烏地", "沙烏地阿拉伯"],
  MAR: ["mo luo ge", "moluoge"],
  MEX: ["mo xi ge", "moxige"],
  NED: ["holland", "he lan", "helan", "荷蘭"],
  NOR: ["nuo wei", "nuowei"],
  NZL: ["xin xi lan", "xinxilan", "新西蘭"],
  PAN: ["ba na ma", "banama", "巴拿馬"],
  PAR: ["ba la gui", "balagui"],
  POR: ["pu tao ya", "putaoya"],
  QAT: ["ka ta er", "kataer", "卡塔爾"],
  RSA: ["nan fei", "nanfei"],
  SCO: ["su ge lan", "sugelan", "蘇格蘭"],
  SEN: ["sai nei jia er", "saineijiaer", "塞內加爾"],
  SUI: ["rui shi", "ruishi"],
  SWE: ["rui dian", "ruidian"],
  TUN: ["tu ni si", "tunisi"],
  TUR: ["turkey", "turkiye", "türkiye", "tu er qi", "tuerqi"],
  URU: ["wu la gui", "wulagui", "烏拉圭"],
  USA: ["usa", "us", "united states", "america", "mei guo", "meiguo", "美國"],
  UZB: ["wu zi bie ke si tan", "wuzibiekesitan", "烏茲別克斯坦"]
};
const TEAM_SEARCH_PREFIX_ALIAS_TEXTS = [
  "america",
  "cape verde",
  "congo",
  "congo dr",
  "cote",
  "cote d ivoire",
  "cote divoire",
  "czech republic",
  "czechia",
  "dr congo",
  "holland",
  "iran",
  "ir iran",
  "ivory coast",
  "korea",
  "korea republic",
  "saudi",
  "south korea",
  "turkey",
  "turkiye",
  "türkiye",
  "united states",
  "us",
  "usa"
];
const TEAM_SEARCH_PREFIX_ALIAS_KEYS = new Set(TEAM_SEARCH_PREFIX_ALIAS_TEXTS.map(normalizeTextKey));
const TEAM_SEARCH_EXACT_ONLY_ALIAS_KEYS = new Set(
  Object.values(TEAM_SEARCH_ALIASES_BY_TEAM_ID)
    .flat()
    .map(normalizeTextKey)
    .filter((key) => /[a-z]/.test(key) && !TEAM_SEARCH_PREFIX_ALIAS_KEYS.has(key))
);
const WALES_FLAG = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}";
const HISTORICAL_TEAM_COUNTRY_CODES = {
  Algeria: "DZ",
  Angola: "AO",
  Argentina: "AR",
  Australia: "AU",
  Austria: "AT",
  Belgium: "BE",
  Bolivia: "BO",
  "Bosnia-Herzegovina": "BA",
  Brazil: "BR",
  Bulgaria: "BG",
  Cameroon: "CM",
  Canada: "CA",
  Chile: "CL",
  China: "CN",
  Colombia: "CO",
  "Costa Rica": "CR",
  Croatia: "HR",
  Cuba: "CU",
  "Czech Republic": "CZ",
  Czechoslovakia: "CZ",
  Denmark: "DK",
  "Dutch East Indies": "ID",
  "East Germany": "DE",
  Ecuador: "EC",
  Egypt: "EG",
  "El Salvador": "SV",
  France: "FR",
  Germany: "DE",
  Ghana: "GH",
  Greece: "GR",
  Haiti: "HT",
  Honduras: "HN",
  Hungary: "HU",
  Iceland: "IS",
  Iran: "IR",
  Iraq: "IQ",
  Ireland: "IE",
  Israel: "IL",
  Italy: "IT",
  Jamaica: "JM",
  Japan: "JP",
  Kuwait: "KW",
  Mexico: "MX",
  Morocco: "MA",
  Netherlands: "NL",
  "New Zealand": "NZ",
  Nigeria: "NG",
  "North Korea": "KP",
  "Northern Ireland": "GB",
  Norway: "NO",
  Panama: "PA",
  Paraguay: "PY",
  Peru: "PE",
  Poland: "PL",
  Portugal: "PT",
  Qatar: "QA",
  Romania: "RO",
  Russia: "RU",
  "Saudi Arabia": "SA",
  Senegal: "SN",
  Serbia: "RS",
  "Serbia and Montenegro": "RS",
  Slovakia: "SK",
  Slovenia: "SI",
  "South Africa": "ZA",
  "South Korea": "KR",
  Spain: "ES",
  Sweden: "SE",
  Switzerland: "CH",
  Togo: "TG",
  "Trinidad and Tobago": "TT",
  Tunisia: "TN",
  Turkey: "TR",
  Ukraine: "UA",
  "United Arab Emirates": "AE",
  "United States": "US",
  Uruguay: "UY",
  USA: "US",
  "West Germany": "DE",
  Zaire: "CD"
};
const HISTORICAL_TEAM_FLAG_OVERRIDES = {
  England: { flagClass: "flag-england" },
  Scotland: { flagClass: "flag-scotland" },
  Wales: { flag: WALES_FLAG },
  "Soviet Union": { flagClass: "flag-soviet-union" },
  Yugoslavia: { flagClass: "flag-yugoslavia" }
};
const HISTORICAL_STYLE_TAGS_BY_NAME = {
  Czechoslovakia: ["Technical midfield", "Compact shape", "Set pieces"],
  "East Germany": ["Organized block", "Direct counters", "Aerial duels"],
  "Northern Ireland": ["Compact block", "Wide service", "Set pieces"],
  "Republic of Ireland": ["Defensive grit", "Long diagonals", "Second balls"],
  "Soviet Union": ["Tempo control", "Wide combinations", "Pressing"],
  "West Germany": ["Efficient buildup", "Box entries", "Set pieces"],
  Yugoslavia: ["Technical midfield", "Wide combinations", "Creative passing"],
  Zaire: ["Deep resilience", "Direct breaks", "Physical duels"]
};
const HISTORICAL_STYLE_FALLBACKS = [
  ["Compact shape", "Counter timing", "Set pieces"],
  ["Technical midfield", "Wide combinations", "Creative passing"],
  ["Defensive grit", "Direct service", "Second balls"],
  ["Possession patience", "Press escape", "Box entries"]
];

const venueLocations = {
  "Atlanta Stadium": "Atlanta, Georgia, USA",
  "Boston Stadium": "Foxborough, Massachusetts, USA",
  "Dallas Stadium": "Arlington, Texas, USA",
  "Estadio Guadalajara": "Guadalajara, Jalisco, Mexico",
  "Estadio Monterrey": "Monterrey, Nuevo Leon, Mexico",
  "Houston Stadium": "Houston, Texas, USA",
  "Kansas City Stadium": "Kansas City, Missouri, USA",
  "Los Angeles Stadium": "Inglewood, California, USA",
  "Mexico City Stadium": "Mexico City, Mexico",
  "Miami Stadium": "Miami Gardens, Florida, USA",
  "New York New Jersey Stadium": "East Rutherford, New Jersey, USA",
  "Philadelphia Stadium": "Philadelphia, Pennsylvania, USA",
  "San Francisco Bay Area Stadium": "Santa Clara, California, USA",
  "Seattle Stadium": "Seattle, Washington, USA",
  "Toronto Stadium": "Toronto, Ontario, Canada",
  "BC Place Vancouver": "Vancouver, British Columbia, Canada",
  "Vancouver Stadium": "Vancouver, British Columbia, Canada"
};

const zhVenueNames = {
  "Atlanta Stadium": "亚特兰大体育场",
  "Boston Stadium": "波士顿体育场",
  "Dallas Stadium": "达拉斯体育场",
  "Estadio Guadalajara": "瓜达拉哈拉体育场",
  "Estadio Monterrey": "蒙特雷体育场",
  "Houston Stadium": "休斯敦体育场",
  "Kansas City Stadium": "堪萨斯城体育场",
  "Los Angeles Stadium": "洛杉矶体育场",
  "Mexico City Stadium": "墨西哥城体育场",
  "Miami Stadium": "迈阿密体育场",
  "New York New Jersey Stadium": "纽约新泽西体育场",
  "Philadelphia Stadium": "费城体育场",
  "San Francisco Bay Area Stadium": "旧金山湾区体育场",
  "Seattle Stadium": "西雅图体育场",
  "Toronto Stadium": "多伦多体育场",
  "BC Place Vancouver": "温哥华BC Place",
  "Vancouver Stadium": "温哥华体育场"
};

const zhVenueLocations = {
  "Atlanta Stadium": "美国乔治亚州亚特兰大",
  "Boston Stadium": "美国马萨诸塞州福克斯伯勒",
  "Dallas Stadium": "美国德克萨斯州阿灵顿",
  "Estadio Guadalajara": "墨西哥哈利斯科州瓜达拉哈拉",
  "Estadio Monterrey": "墨西哥新莱昂州蒙特雷",
  "Houston Stadium": "美国德克萨斯州休斯敦",
  "Kansas City Stadium": "美国密苏里州堪萨斯城",
  "Los Angeles Stadium": "美国加利福尼亚州英格尔伍德",
  "Mexico City Stadium": "墨西哥墨西哥城",
  "Miami Stadium": "美国佛罗里达州迈阿密加登斯",
  "New York New Jersey Stadium": "美国新泽西州东卢瑟福",
  "Philadelphia Stadium": "美国宾夕法尼亚州费城",
  "San Francisco Bay Area Stadium": "美国加利福尼亚州圣克拉拉",
  "Seattle Stadium": "美国华盛顿州西雅图",
  "Toronto Stadium": "加拿大安大略省多伦多",
  "BC Place Vancouver": "加拿大不列颠哥伦比亚省温哥华",
  "Vancouver Stadium": "加拿大不列颠哥伦比亚省温哥华"
};

if (!timeZones.includes(defaultTimeZone)) {
  timeZones.unshift(defaultTimeZone);
}

function getStoredTimeZone() {
  const storedTimeZone = String(localStorage.getItem(TIMEZONE_STORAGE_KEY) || "");
  return timeZones.includes(storedTimeZone) ? storedTimeZone : "";
}

function storeTimeZone(timeZone) {
  if (timeZones.includes(timeZone)) {
    localStorage.setItem(TIMEZONE_STORAGE_KEY, timeZone);
  }
}

function getStoredShowYesterday() {
  return localStorage.getItem(SHOW_YESTERDAY_STORAGE_KEY) !== "false";
}

function storeShowYesterday(value) {
  localStorage.setItem(SHOW_YESTERDAY_STORAGE_KEY, value ? "true" : "false");
}

function getAdminMessageEntries(data = adminMessages) {
  if (Array.isArray(data?.messages)) {
    return data.messages;
  }

  return data?.id || data?.message || data?.copy ? [data] : [];
}

function getAdminMessageTimestamp(value) {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.NaN;
}

function getAdminMessageId(message) {
  return String(message?.id || "").trim();
}

function isAdminMessageInWindow(message, now = Date.now()) {
  const startsAt = getAdminMessageTimestamp(message?.startsAt || message?.startAt);
  const endsAt = getAdminMessageTimestamp(message?.endsAt || message?.endAt);

  if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) {
    return false;
  }

  if (startsAt !== null && now < startsAt) {
    return false;
  }

  return endsAt === null || now < endsAt;
}

function getLocalizedAdminMessageCopy(message) {
  const copy = message?.copy;
  if (copy && typeof copy === "object" && !Array.isArray(copy)) {
    const text = currentLanguage === "zh" ? copy.zh || copy.en : copy.en || copy.zh;
    return String(text || "").trim();
  }

  const text =
    currentLanguage === "zh"
      ? message?.messageZh || message?.message || message?.messageEn
      : message?.message || message?.messageEn || message?.messageZh;
  return String(text || "").trim();
}

function getActiveAdminMessage(now = Date.now()) {
  return getAdminMessageEntries()
    .filter((message) => {
      return (
        message &&
        typeof message === "object" &&
        message.active !== false &&
        getAdminMessageId(message) &&
        getLocalizedAdminMessageCopy(message) &&
        isAdminMessageInWindow(message, now)
      );
    })
    .sort((a, b) => {
      const aPriority = Number.isFinite(Number(a.priority)) ? Number(a.priority) : 10;
      const bPriority = Number.isFinite(Number(b.priority)) ? Number(b.priority) : 10;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      const aStartsAt = getAdminMessageTimestamp(a.startsAt || a.startAt) || 0;
      const bStartsAt = getAdminMessageTimestamp(b.startsAt || b.startAt) || 0;
      return bStartsAt - aStartsAt;
    })[0];
}

function getAdminMessageDismissStorageKey(messageId) {
  return `${ADMIN_MESSAGE_DISMISS_STORAGE_PREFIX}${messageId}`;
}

function isAdminMessageDismissed(messageId) {
  try {
    return localStorage.getItem(getAdminMessageDismissStorageKey(messageId)) === "1";
  } catch (error) {
    console.warn("Unable to read admin message dismissal", error);
    return false;
  }
}

function dismissAdminMessage(messageId) {
  try {
    localStorage.setItem(getAdminMessageDismissStorageKey(messageId), "1");
  } catch (error) {
    console.warn("Unable to store admin message dismissal", error);
  }
  renderAdminMessage();
}

function clearAdminMessageCollapseTimer() {
  if (adminMessageCollapseTimeoutId) {
    window.clearTimeout(adminMessageCollapseTimeoutId);
    adminMessageCollapseTimeoutId = 0;
  }
}

function hideAdminMessage(options = {}) {
  if (!adminMessageBanner) {
    return;
  }

  const shouldAnimate = options.animate !== false && !adminMessageBanner.hidden;
  document.body.classList.remove("has-admin-message");
  renderedAdminMessageId = "";

  if (adminMessageDismiss) {
    adminMessageDismiss.dataset.adminMessageId = "";
  }

  clearAdminMessageCollapseTimer();

  if (!shouldAnimate) {
    adminMessageBanner.classList.add("is-hidden");
    adminMessageBanner.classList.remove("is-collapsing");
    adminMessageBanner.hidden = true;
    if (adminMessageText) {
      adminMessageText.textContent = "";
    }
    return;
  }

  adminMessageBanner.classList.add("is-collapsing");
  adminMessageCollapseTimeoutId = window.setTimeout(() => {
    adminMessageCollapseTimeoutId = 0;
    adminMessageBanner.hidden = true;
    adminMessageBanner.classList.add("is-hidden");
    adminMessageBanner.classList.remove("is-collapsing");
    if (adminMessageText) {
      adminMessageText.textContent = "";
    }
  }, ADMIN_MESSAGE_COLLAPSE_DURATION_MS);
}

function showAdminMessage(messageId, copy) {
  if (!adminMessageBanner || !adminMessageText) {
    return;
  }

  clearAdminMessageCollapseTimer();
  renderedAdminMessageId = messageId;
  adminMessageText.textContent = copy;
  adminMessageBanner.hidden = false;
  adminMessageBanner.classList.remove("is-hidden", "is-collapsing");
  document.body.classList.add("has-admin-message");
  adminMessageBanner.setAttribute("aria-label", t("adminMessage"));

  if (adminMessageDismiss) {
    adminMessageDismiss.setAttribute("aria-label", t("adminMessageDismiss"));
    adminMessageDismiss.setAttribute("title", t("adminMessageDismiss"));
    adminMessageDismiss.dataset.adminMessageId = messageId;
  }
}

function renderAdminMessage() {
  if (!adminMessageBanner || !adminMessageText) {
    return;
  }

  const message = getActiveAdminMessage();
  const messageId = getAdminMessageId(message);
  const copy = getLocalizedAdminMessageCopy(message);
  const isVisible = Boolean(message && messageId && copy && !isAdminMessageDismissed(messageId));

  if (!isVisible) {
    hideAdminMessage();
    return;
  }

  if (renderedAdminMessageId === messageId && !adminMessageBanner.classList.contains("is-collapsing")) {
    adminMessageText.textContent = copy;
    adminMessageBanner.setAttribute("aria-label", t("adminMessage"));
    if (adminMessageDismiss) {
      adminMessageDismiss.setAttribute("aria-label", t("adminMessageDismiss"));
      adminMessageDismiss.setAttribute("title", t("adminMessageDismiss"));
    }
    return;
  }

  showAdminMessage(messageId, copy);
}

function setShowYesterdayMatches(value, options = {}) {
  shouldShowYesterdayMatches = Boolean(value);
  storeShowYesterday(shouldShowYesterdayMatches);
  if (showYesterdayToggle) {
    showYesterdayToggle.checked = shouldShowYesterdayMatches;
  }
  if (options.render !== false) {
    renderSchedule(options);
  }
}

const initialDate = new Date();
let selectedTimeZone = getStoredTimeZone() || defaultTimeZone;
let selectedDayKey = getDayKey(initialDate, selectedTimeZone);
let shouldShowYesterdayMatches = getStoredShowYesterday();
let activeMatchId = "";
let activeView = "matches";
let selectedStandingsYear = CURRENT_STANDINGS_YEAR;
let selectedStandingsMode = DEFAULT_CURRENT_STANDINGS_MODE;
let tournamentBoardDragGesture = null;
let tournamentBoardSuppressClickUntil = 0;
let tournamentConnectorFrameId = 0;
let tournamentConnectorRetryTimeoutId = 0;
let teamSearchQuery = "";
let calendarMonthKey = getMonthKeyFromDayKey(selectedDayKey);
let isCalendarOpen = false;
let isCatchUpOpen = false;
let catchUpRenderFrameId = 0;
let catchUpRenderTimeoutId = 0;
let catchUpRenderToken = 0;
let isSettingsOpen = false;
let isStandingsYearOpen = false;
let isTeamSearchOpen = false;
let isShowingOlderTeamMatches = false;
let fixtures = [];
let historicalFixtures = [];
let history = { coverage: {}, fixtures: [], source: null, tournaments: [] };
const historicalProjectionCache = new Map();
const thirdPlaceAdvancementEstimateCache = new Map();
const thirdPlaceGroupScenarioCache = new Map();
const groupThirdPlacePointFloorCache = new Map();
const teamGroupStageEliminationCache = new Map();
const teamMaximumGroupPointsCache = new Map();
let historicalPlayerProfilesByName = new Map();
let historicalPlayerProfilesByVersion = new Map();
let playerProfilesByName = new Map();
let playerProfilesByTeamAndName = new Map();
const lineupSubstitutionPreviewState = new Set();
let shouldShowPlayerMarketValues = false;
let adminMessages = { messages: [] };
let renderedAdminMessageId = "";
let adminMessageCollapseTimeoutId = 0;
let teamsById = new Map();
let teamsByName = new Map();
let tournament = { groups: [], stages: [], sources: [] };
let releaseNotes = { releases: [] };
let isReleaseNotesLoading = true;
let standingsByGroup = {};
let dataCoverage = { status: "partial" };
let siteUpdatedAt = "";
let liveDataCheckedAt = "";
let syncUrl = true;
let isRestoringHistoryState = false;
let isInitialDataLoading = true;
let isInitialLiveDataLoading = false;
let teamSearchIndex = [];
let teamSearchExactKeySetsByQueryKey = new Map();
let pendingTeamSearchRenderFrame = 0;
let pendingUrlStateUpdateId = 0;

function setYesterdayLayoutOffset(isOffset) {
  viewPanels.matches?.classList.toggle("is-yesterday-suppressed", Boolean(isOffset));
}

function normalizeLanguage(value) {
  const language = String(value || "").trim().toLowerCase();
  if (SUPPORTED_LANGUAGES.has(language)) {
    return language;
  }

  if (language.startsWith("zh")) {
    return "zh";
  }

  return "";
}

function getInitialLanguage() {
  const params = new URLSearchParams(window.location.search);
  const requestedLanguage = normalizeLanguage(params.get("lang"));
  if (requestedLanguage) {
    return requestedLanguage;
  }

  const savedLanguage = normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  if (savedLanguage) {
    return savedLanguage;
  }

  return DEFAULT_LANGUAGE;
}

let currentLanguage = getInitialLanguage();
const juggleToy = {
  animationFrameId: 0,
  audioContext: null,
  best: readStoredJuggleRecord(),
  blockPageClickUntil: 0,
  count: 0,
  curve: 0,
  difficultyLevel: 0,
  element: null,
  fallDistance: 0,
  fallDuration: 0,
  hasPendingBestSave: false,
  lastFrameTime: 0,
  phase: "idle",
  previousX: 0,
  previousY: 0,
  rotation: 0,
  rotationSpeed: 0,
  shadowElement: null,
  size: 38,
  startTime: 0,
  startX: 0,
  startY: 0,
  targetX: 0,
  vx: 0,
  vy: 0,
  x: 0,
  y: 0
};

function getAppLocale() {
  return LANGUAGE_LOCALES[currentLanguage] || LANGUAGE_LOCALES.en;
}

function createDateFormatter(options) {
  return new Intl.DateTimeFormat(getAppLocale(), options);
}

function createFormatterProxy(options) {
  return {
    format(date) {
      return createDateFormatter(options).format(date);
    }
  };
}

const dateFormatter = createFormatterProxy({
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC"
});

const navDateFormatter = createFormatterProxy({
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});

const navDateWithYearFormatter = createFormatterProxy({
  month: "short",
  day: "numeric",
  timeZone: "UTC",
  year: "numeric"
});

const matchRowDateFormatter = createFormatterProxy({
  month: "long",
  day: "numeric",
  timeZone: "UTC"
});

const matchRowDateWithYearFormatter = createFormatterProxy({
  month: "long",
  day: "numeric",
  timeZone: "UTC",
  year: "numeric"
});

const calendarMonthFormatter = createFormatterProxy({
  month: "long",
  timeZone: "UTC",
  year: "numeric"
});

const calendarDayLabelFormatter = createFormatterProxy({
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  weekday: "long",
  year: "numeric"
});

const catchUpItemLeadDateFormatter = createFormatterProxy({
  day: "numeric",
  month: "long",
  timeZone: "UTC"
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return replacements[char];
  });
}

function t(key) {
  return UI_TEXT[currentLanguage]?.[key] ?? UI_TEXT.en[key] ?? key;
}

function translateTextToZh(value) {
  const text = String(value ?? "");
  const leadingWhitespace = text.match(/^\s*/)?.[0] || "";
  const trailingWhitespace = text.match(/\s*$/)?.[0] || "";
  const compactText = text.trim().replace(/\s+/g, " ");

  if (!compactText) {
    return text;
  }

  const exactTranslation = ZH_EXACT_TRANSLATIONS.get(compactText);
  if (exactTranslation) {
    return `${leadingWhitespace}${exactTranslation}${trailingWhitespace}`;
  }

  const routeLabelTranslation = translateGeneratedRouteLabelToZh(compactText);
  if (routeLabelTranslation) {
    return `${leadingWhitespace}${routeLabelTranslation}${trailingWhitespace}`;
  }

  const longFormTranslation = translateGeneratedLongFormTextToZh(compactText);
  if (longFormTranslation && longFormTranslation !== compactText) {
    return `${leadingWhitespace}${longFormTranslation}${trailingWhitespace}`;
  }

  for (const { pattern, replace } of ZH_PATTERN_TRANSLATIONS) {
    if (pattern.test(compactText)) {
      pattern.lastIndex = 0;
      return `${leadingWhitespace}${compactText.replace(pattern, replace)}${trailingWhitespace}`;
    }
  }

  return text;
}

function formatZhPointCount(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  const wordCounts = {
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9"
  };
  const count = wordCounts[normalized] || normalized;

  return `${count}分`;
}

function formatThirdPlaceDeciderLabelZh(label) {
  const labelTranslations = {
    "FIFA ranking fallback": "FIFA排名备用规则",
    "FIFA ranking": "FIFA排名",
    "deterministic loaded order": "已载入排序",
    "fair-play score": "公平竞赛分",
    "goal difference": "净胜球",
    "goals scored": "进球数",
    "loaded fair-play conduct": "已载入公平竞赛分",
    points: "积分"
  };

  return labelTranslations[label] || translateTextToZh(label);
}

function localizeText(value) {
  return currentLanguage === "zh" ? translateTextToZh(value) : normalizeEnglishOutcomeTerminology(value);
}

function normalizeEnglishOutcomeTerminology(value) {
  const text = String(value ?? "");

  if (!/\b(?:Draw|Draws|draw|draws|drew)\b|W-D-L/.test(text)) {
    return text;
  }

  return text
    .replace(/\bW-D-L\b/g, "W-T-L")
    .replace(/\bWins-Draws-Losses\b/g, "Wins-Ties-Losses")
    .replace(/\bDraws\b/g, "Ties")
    .replace(/\bDraw\b/g, "Tie")
    .replace(/\bwin, draw, or loss\b/g, "win, tie, or loss")
    .replace(/\bfor a draw\b/g, "for a tie")
    .replace(/\bscoreless draws\b/g, "scoreless ties")
    .replace(/\bscoreless draw\b/g, "scoreless tie")
    .replace(/\bplain draw\b/g, "plain tie")
    .replace(/\bshared a (\d{1,2}-\d{1,2}) draw\b/g, "played to a $1 tie")
    .replace(/\bshare tense draw\b/g, "share tense tie")
    .replace(/\bearned ([^,.]+) a (\d{1,2}-\d{1,2}) draw\b/g, "earned $1 a $2 tie")
    .replace(/\b(after|After) (a|the) (\d{1,2}-\d{1,2}) draw\b/g, "$1 $2 $3 tie")
    .replace(/\b(a|the) (\d{1,2}-\d{1,2}) draw\b/g, "$1 $2 tie")
    .replace(/\b(\d{1,2}-\d{1,2}) draw\b/g, "$1 tie")
    .replace(/\b([0-9]{1,2}) draw\b/g, "$1 tie")
    .replace(/\b([0-9]{1,2}) draws\b/g, "$1 ties")
    .replace(/\bdrew (?=\d{1,2}-\d{1,2}\b)/g, "tied ")
    .replace(/\bdrew\b/g, "tied")
    .replace(/\ba draw(?=\s+(?:would|could|can|should|might|may|is|was|keeps?|puts?|moves?|gives?|means?|against|with|in|from|after|if|when)\b|[,.])/g, "a tie")
    .replace(/\bA draw(?=\s+(?:would|could|can|should|might|may|is|was|keeps?|puts?|moves?|gives?|means?|against|with|in|from|after|if|when)\b|[,.])/g, "A tie")
    .replace(/\bthe draw kept\b/g, "the tie kept")
    .replace(/\bThe draw left\b/g, "The tie left")
    .replace(/\btight draw\b/g, "tight tie");
}

function replaceKnownLocalizedEntities(value, translationMap) {
  const text = String(value ?? "");

  if (currentLanguage !== "zh" || !text) {
    return text;
  }

  return Object.entries(translationMap)
    .sort((a, b) => b[0].length - a[0].length)
    .reduce(
      (output, [source, translation]) =>
        output.replace(new RegExp(escapeRegExp(source), "g"), translation),
      text
    );
}

function localizeKnownPlayerNames(value) {
  return replaceKnownLocalizedEntities(value, ZH_PLAYER_NAME_TRANSLATIONS);
}

const ZH_GENERATED_COPY_TERMS = {
  "actual match roster": "实际比赛名单",
  "aerial command": "高空指挥",
  "aerial presence": "高空存在感",
  "aerial service": "高空输送",
  "aerial strength": "高空能力",
  "attacking calm": "进攻冷静度",
  "attacking flexibility": "进攻灵活性",
  "attacking moments": "进攻时刻",
  "attacking passing": "进攻传球",
  "attacking shape": "进攻阵型",
  "back-line command": "后防线指挥",
  "back-line leadership": "后防线领导力",
  "ball progression": "推进出球",
  "ball-carrier": "带球推进者",
  "ball-carrying": "带球推进",
  "ball-winning": "抢回球权",
  "big-moment attackers": "关键时刻攻击手",
  "box control": "禁区控制",
  "box entries": "进入禁区",
  "box force": "禁区力量点",
  "box gravity": "禁区牵制力",
  "box movement": "禁区跑动",
  "box presence": "禁区存在感",
  "box target": "禁区目标点",
  "Brazil breaking shape through Neymar and Vinicius": "巴西通过内马尔和维尼修斯撕开阵型",
  "break a shape through Neymar combinations and Vinicius Junior's speed":
    "通过内马尔和维尼修斯撕开阵型",
  "build-out mistakes": "后场出球失误",
  "calm control": "冷静控制",
  "calm first pass": "更冷静的第一脚出球",
  "central attacking reference": "中路进攻支点",
  "central defenders": "中后卫",
  "central finishing": "中路终结",
  "central hold-up play": "中路支点做球",
  "central invention": "中路创造力",
  "central spark": "中路火花",
  "chance architect": "机会设计者",
  "chance creation": "机会创造",
  "channel ball": "肋部传球",
  "channel runs": "肋部前插",
  "chaotic depth": "混乱纵深",
  "clean chances": "清晰机会",
  "clean first pass": "干净的第一脚传球",
  "clean service": "清晰输送",
  "clean shots": "清晰射门",
  "clean-sheet structure": "零封结构",
  "composed final action": "冷静的最后处理",
  "composed final pass": "冷静的最后一传",
  "controlled buildup": "受控组织推进",
  "counter craft": "反击技巧",
  "counter route": "反击路径",
  "counter timing": "反击时机",
  "counterattacking": "反击型",
  "counters": "反击",
  "crowd energy": "主场气势",
  "creative movement": "创造性跑动",
  "creative supply": "创造性输送",
  "creative wide option": "有创造力的边路选择",
  "crosses": "传中",
  "crossing threat": "传中威胁",
  "current-squad endpoint": "当前阵容里的终结点",
  "decisive outlet": "决定性出口",
  "decisive pass": "决定性传球",
  "defensive anchor": "防守锚点",
  "defensive authority": "防守权威",
  "defensive balance": "防守平衡",
  "defensive block": "防守阵型",
  "defensive command": "防守指挥",
  "defensive duels": "防守对抗",
  "defensive line": "防线",
  "defensive option": "防守选择",
  "defensive organization": "防守组织",
  "defensive presence": "防守存在感",
  "defensive range": "防守覆盖范围",
  "defensive rhythm": "防守节奏",
  "defensive security": "防守安全感",
  "defensive shape": "防守阵型",
  "defensive work": "防守工作",
  "defenders": "防守球员",
  "depth": "纵深",
  "direct attacks": "直接进攻",
  "direct balls": "直接传球",
  "direct chance": "直接机会",
  "direct chances": "直接机会",
  "direct finisher": "直接终结者",
  "direct finishing threat": "直接终结威胁",
  "direct goal threat": "直接进球威胁",
  "direct outlet": "直接出球点",
  "direct running": "直接跑动",
  "direct runners": "直接前插点",
  "direct speed": "直接速度",
  "disrupting opponents": "打乱对手",
  "dribbling spark": "盘带火花",
  "Davies or David facing goal early": "尽早让戴维斯或乔纳森·戴维面向球门",
  "Davies-David open-field speed": "戴维斯-乔纳森·戴维开阔地速度",
  "Doan-Kamada combination speed": "堂安律-镰田大地配合速度",
  "Doan-Kubo combination speed": "堂安律-久保建英配合速度",
  "early crosses": "早传中",
  "early service": "早输送",
  "elite finishing": "顶级终结",
  "elite quick-break finishing": "顶级快速反击终结",
  "elite speed": "顶级速度",
  "emergency defending": "紧急防守",
  "emotional attacking focal point": "情绪和进攻焦点",
  "emotional moments": "情绪时刻",
  "end-to-end breaks": "来回拉锯的转换",
  "end-to-end power": "往返冲击力",
  "experienced attackers": "经验丰富的攻击手",
  "experienced attacking reference": "经验丰富的进攻支点",
  "experienced calm": "经验带来的冷静",
  "final ball": "最后一传",
  "final pass": "最后一传",
  "final passes": "最后一传",
  "final-third chances": "前场机会",
  "final-third threat": "前场威胁",
  "finishing edge": "终结优势",
  "finishing gravity": "终结牵制力",
  "first outlet pass": "第一脚出球",
  "first phase": "第一阶段推进",
  "first World Cup tournament": "首次世界杯之旅",
  "flank": "边路",
  "flair players": "天才型球员",
  "flexible finisher": "灵活终结者",
  "forward momentum": "向前势头",
  "forward option": "锋线选择",
  "forward power": "锋线力量",
  "forward-heavy shape": "锋线人数更多的阵型",
  "free kicks": "任意球",
  "free-kick": "任意球",
  "front line": "锋线",
  "front-line outlet": "锋线出口",
  "game-breaking pace": "打破比赛的速度",
  "game-time decision": "赛前决定",
  "goalkeeping experience": "门将经验",
  "goalkeeping option": "门将选择",
  "goalkeeping security": "门将安全感",
  "group path": "小组路径",
  "hard-running midfield cover": "勤跑中场保护",
  "headline finisher": "头号终结者",
  "heavy club scoring season": "俱乐部高产赛季",
  "home pressure": "主场压力",
  "home-side pressure team": "主场压力型球队",
  "host-side threat": "东道主威胁",
  "individual attacking threat": "个人进攻威胁",
  "individual defending": "个人防守",
  "isolate Vinicius Junior quickly and let Neymar combine around the fouls and gaps that creates":
    "尽快让维尼修斯获得单挑空间，并让内马尔围绕由此制造的犯规和空当串联",
  "Japan turning quick combinations into box chances": "日本把快速配合转化为禁区机会",
  "left-footed creation": "左脚创造力",
  "left-footed creator": "左脚创造者",
  "left-footed option": "左脚选择",
  "left-footed punch": "左脚冲击",
  "left-side balance": "左路平衡",
  "left-side delivery": "左路输送",
  "left-side explosion": "左路爆发",
  "left-side outlet": "左路出口",
  "linking play": "串联进攻",
  "lock-picking passes": "破密集传球",
  "long-range threat": "远射威胁",
  "loose balls": "二点球",
  "low-chance match": "机会很少的比赛",
  "match plan": "比赛计划",
  "match roster": "比赛名单",
  "match scoring record and tournament squad": "比赛进球记录和赛事名单",
  "match scoring record": "比赛进球记录",
  "match spine": "比赛中轴",
  "match usage": "比赛使用情况",
  "midfield ball-winning": "中场抢回球权",
  "midfield balance": "中场平衡",
  "midfield bite": "中场硬度",
  "midfield calm": "中场冷静",
  "midfield carrying": "中场带球推进",
  "midfield composure": "中场镇定",
  "midfield control": "中场控制",
  "midfield drive": "中场推进",
  "midfield eraser": "中场清道夫",
  "midfield force": "中场力量",
  "midfield numbers": "中场人数",
  "midfield option": "中场选择",
  "midfield pressure": "中场压迫",
  "midfield screening": "中场屏障",
  "midfield steel": "中场硬度",
  "midfield tempo": "中场节奏",
  "mobile finishing": "灵活终结",
  "mobile midfield connector": "机动中场串联者",
  "mobile second scoring threat": "机动第二得分点",
  "movement": "跑动",
  "move the ball quickly enough for their attackers to receive between defenders":
    "快速转移球，让攻击手在防守球员之间接球",
  "open space": "开阔空间",
  "open-field danger": "开阔地威胁",
  "open-field runs": "开阔地跑动",
  "open-field speed": "开阔地速度",
  "opposition": "对手",
  "overlaps": "套上",
  "pace": "速度",
  "pace and movement": "速度和跑动",
  "patient combinations": "耐心配合",
  "penalty area": "禁区",
  "penalty-area finisher": "禁区终结者",
  "penalty-area touches": "禁区触球",
  "physical pressure": "身体压力",
  "polished attacking reference": "成熟进攻支点",
  "possession": "控球",
  "precise, fast-passing side that can make possession feel sudden and sharp":
    "传递精准快速、能让控球突然提速的球队",
  "press resistance": "抗压能力",
  "pressing bursts": "压迫爆发",
  "pressing forward": "压迫型前锋",
  "pressure breaks": "压迫后的突破",
  "quick combinations": "快速配合",
  "quick counters": "快速反击",
  "quick passes": "快速传球",
  "recovery runs": "回追跑动",
  "recovery speed": "回追速度",
  "repeated box touches": "反复禁区触球",
  "rhythm setter": "节奏设定者",
  "right-side escape": "右路摆脱",
  "right-side running": "右路跑动",
  "right-side surges": "右路冲击",
  "route behind": "身后路线",
  "route forward": "向前路径",
  "scoring route": "得分路径",
  "scoring threat": "得分威胁",
  "second balls": "二点球",
  "second scoring lane": "第二得分通道",
  "set pieces": "定位球",
  "set-piece": "定位球",
  "set-piece technician": "定位球专家",
  "shape": "阵型",
  "shot creator": "射门创造者",
  "shot creation": "射门创造",
  "shot-stopping": "扑救",
  "slow games": "放慢比赛",
  "spine quality": "中轴质量",
  "squad context": "阵容背景",
  "star ball-carrier": "明星带球推进者",
  "striker movement": "前锋跑动",
  "striker reference": "中锋支点",
  "target play": "支点打法",
  "target striker": "支点中锋",
  "technical passing": "技术型传球",
  "the first gap": "第一处空当",
  "the last line": "最后一道防线",
  "through balls": "直塞球",
  "timing around the box": "禁区周边时机",
  "top-tier attacking side whose best moments mix individual invention with sudden acceleration":
    "最好的时刻能把个人灵感和突然加速结合起来的顶级进攻球队",
  "tournament margins": "杯赛细节",
  "tournament squad": "赛事名单",
  "tournament squad record": "赛事名单记录",
  "transition moments": "转换时刻",
  "transition runner": "转换跑动者",
  "vertical speed": "纵向速度",
  "wide areas": "边路区域",
  "wide attacking option": "边路进攻选择",
  "wide bravery": "边路勇气",
  "wide defensive option": "边路防守选择",
  "wide delivery": "边路输送",
  "wide defenders": "边路防守球员",
  "wide lanes": "边路通道",
  "wide pressure": "边路压力",
  "wide release valve": "边路释放点",
  "wide runners": "边路跑动者",
  "wide speed": "边路速度",
  "wide threat": "边路威胁",
  "wide thrust": "边路推进",
  "wing craft": "边路技巧",
  "wing duels": "边路对抗",
  "World Cup": "世界杯",
  "back three": "三中卫体系",
  "Bruno-Vitinha service into Ronaldo": "布鲁诺和维蒂尼亚向罗纳尔多输送",
  "cleanly": "干净地",
  "control to become finishing after dropping points in their opener": "在首战丢分后把控制转化为终结",
  "are a home-side pressure team that want territory, crowd energy, and repeated penalty-area touches":
    "是主场压迫型球队，追求场地优势、主场气势和反复禁区触球",
  "are counterattacking underdogs who can stay in games if their goalkeeper and forwards give them belief":
    "是反击型弱势方，只要门将和前锋带来信心，就能留在比赛里",
  "creative midfielder": "创造型中场",
  "defensive centerpiece": "防守核心",
  "absorb pressure, let Mokoena make the first forward pass, and release Foster before the defense recovers":
    "吸收压力，让莫科纳完成第一脚向前传球，并在防线回位前释放福斯特",
  "feed Ronaldo through Bruno Fernandes and Vitinha": "通过布鲁诺·费尔南德斯和维蒂尼亚给罗纳尔多输送机会",
  "head-to-head meeting": "交锋",
  "highest-volume chance creator": "最高产的机会创造者",
  "keep the ball in the opponent's half and feed Gimenez before Chavez attacks free kicks, corners, or rebounds":
    "把球保持在对手半场，并在查韦斯攻击任意球、角球或反弹球前给希门尼斯输送机会",
  "keep Bruno Fernandes facing forward while Vitinha finds Ronaldo or the wide runners":
    "让布鲁诺·费尔南德斯保持面向前场，同时由维蒂尼亚寻找罗纳尔多或边路跑动点",
  "Khusanov-Fayzullaev compact counters": "胡萨诺夫-法伊祖拉耶夫的紧凑反击",
  "limited chances matter": "有限机会发挥作用",
  "missing from his resume": "他履历中缺少的部分",
  "press-resistant rhythm setter": "抗压节奏掌控者",
  "release Fayzullaev or Shomurodov from a compact shape": "从紧凑阵型中释放法伊祖拉耶夫或肖穆罗多夫",
  "stay compact through Khusanov, then release Fayzullaev and Shomurodov early":
    "依靠胡萨诺夫保持紧凑，然后尽早释放法伊祖拉耶夫和肖穆罗多夫",
  "turn home pressure into Gimenez touches and Chavez free-kick or corner chances":
    "把主场压力转化为希门尼斯触球以及查韦斯的任意球或角球机会",
  "turn saves from Williams into Mokoena outlets and Foster counters":
    "把威廉姆斯的扑救转化为莫科纳的出球点和福斯特的反击",
  "breaking shape through Neymar and Vinicius": "通过内马尔和维尼修斯撕开阵型",
  "countering through Mokoena and Foster": "通过莫科纳和福斯特打出反击",
  "fast, direct host-side threat": "速度快、打法直接的东道主威胁",
  "first-time World Cup underdogs built to defend deep and break cleanly":
    "首次参加世界杯的弱势方，立足深度防守并干净反击",
  "Neymar-Vinicius isolation speed": "内马尔-维尼修斯单挑加速",
  "precise, fast-passing side that can make possession sudden": "传递精准快速、能让控球突然提速的球队",
  "top-tier attacking side mixing invention with sudden acceleration": "兼具创造力和突然加速的顶级进攻球队",
  "turn quick combinations into chances around the box": "把快速配合转化为禁区机会",
  "turning quick combinations into box chances": "把快速配合转化为禁区机会",
  "Vinicius isolated quickly": "尽快让维尼修斯获得单挑空间",
  "Williams-Mokoena-Foster save-to-counter chain": "威廉姆斯-莫科纳-福斯特扑救到反击链条",
  "can turn Portugal's possession into cleaner entries around the box":
    "可以把葡萄牙的控球转化为更干净的禁区周边推进"
};

const ZH_GENERATED_COPY_WORDS = {
  a: "",
  able: "能够",
  absorb: "吸收",
  add: "增加",
  adding: "增加",
  adds: "增加",
  advanced: "前压",
  after: "在之后",
  against: "面对",
  alive: "保有机会",
  all: "全部",
  alone: "单独",
  already: "已经",
  alternate: "交替",
  although: "虽然",
  also: "也",
  ambition: "进取心",
  any: "任何",
  around: "围绕",
  arrive: "插上",
  arriving: "插上",
  apart: "被拆开",
  as: "作为",
  ask: "要求",
  asks: "要求",
  an: "",
  attack: "攻击",
  attacking: "攻击",
  attacks: "攻击",
  authority: "权威",
  availability: "出场情况",
  available: "可以出场",
  and: "和",
  avoid: "避免",
  back: "回到",
  backed: "支撑",
  beat: "压过",
  belief: "信心",
  becoming: "变成",
  become: "变成",
  before: "在之前",
  behind: "身后",
  bend: "调整",
  boosted: "得到提升",
  both: "双方",
  box: "禁区",
  break: "突破",
  breaking: "打破",
  breaks: "转换",
  breakaway: "快速反击",
  built: "打造",
  buildup: "组织推进",
  but: "但",
  by: "通过",
  calm: "冷静",
  calmly: "冷静地",
  can: "能够",
  carries: "带球推进",
  carry: "带起",
  carrying: "带球推进",
  central: "中路",
  chain: "链条",
  change: "改变",
  changes: "变化",
  chase: "追赶",
  chasing: "追赶",
  choose: "选择",
  close: "靠近",
  clean: "干净",
  cleaner: "更干净",
  collapse: "崩盘",
  compact: "紧凑",
  compete: "竞争",
  complacency: "松懈",
  complete: "完整",
  concerns: "隐患",
  concern: "隐患",
  confidence: "信心",
  confirmed: "确认",
  connect: "串联",
  connected: "保持连接",
  connecting: "连接",
  contests: "对抗比赛",
  control: "控制",
  controlled: "受控",
  corners: "角球",
  count: "发挥作用",
  counterattacking: "反击",
  counter: "反击",
  counters: "反击",
  counterpunch: "反击回击",
  counterpunchers: "反击回击者",
  crowd: "挤压",
  crowded: "拥挤",
  crucial: "关键",
  dangerous: "危险",
  danger: "危险",
  decision: "决定",
  decisions: "决定",
  deep: "深处",
  deeper: "更深",
  defend: "防守",
  defenders: "防守球员",
  defense: "防线",
  defensive: "防守",
  define: "定义",
  deliver: "输送",
  delivers: "输送",
  depth: "纵深",
  designed: "设计为",
  dictate: "主导",
  direct: "直接",
  disciplined: "有纪律",
  disrupt: "打乱",
  disrupting: "打乱",
  draw: "吸引",
  dropping: "丢掉",
  drops: "下降",
  drift: "游弋",
  drought: "荒",
  during: "在期间",
  duels: "对抗",
  duel: "对抗",
  durable: "耐磨",
  early: "尽早",
  edge: "边缘优势",
  enough: "足够",
  enter: "进入",
  endpoint: "终点",
  expected: "预计",
  escape: "摆脱",
  experienced: "有经验",
  experience: "经验",
  exposed: "暴露",
  facing: "面向",
  favorites: "热门方",
  fast: "快速",
  favorite: "热门方",
  feed: "输送给",
  field: "球场",
  final: "最后",
  find: "找到",
  finding: "找到",
  finds: "找到",
  finisher: "终结者",
  finishers: "终结者",
  finishing: "终结",
  finesse: "细腻处理",
  first: "第一",
  fit: "健康",
  flair: "灵感",
  flank: "边路",
  flip: "改变",
  force: "迫使",
  forcing: "迫使",
  forward: "向前",
  forwards: "前锋",
  fouls: "犯规",
  from: "从",
  gap: "空当",
  gaps: "空当",
  game: "比赛",
  games: "比赛",
  give: "给",
  gives: "给",
  gifting: "送出",
  goal: "球门",
  goalkeeper: "门将",
  gravity: "牵制力",
  group: "小组",
  has: "有",
  have: "有",
  he: "他",
  helps: "帮助",
  high: "高位",
  higher: "更高",
  hold: "保持",
  holding: "保持",
  holds: "保持",
  honest: "不敢放松",
  if: "如果",
  immediate: "立即",
  important: "重要",
  inside: "内侧",
  in: "在",
  international: "国际A级赛",
  into: "转化为",
  invention: "创造力",
  injury: "伤病",
  isolate: "制造一对一",
  isolation: "一对一",
  keep: "保持",
  keeping: "保持",
  kicks: "任意球",
  largely: "基本上",
  lane: "通道",
  lanes: "通道",
  late: "后段",
  lean: "依靠",
  led: "领衔",
  left: "左路",
  less: "更少",
  let: "让",
  likely: "很可能",
  limiting: "限制",
  limited: "有限",
  line: "防线",
  link: "串联",
  locks: "锁住",
  load: "压上",
  long: "长时间",
  loose: "松散",
  make: "让",
  making: "让",
  manage: "管理",
  managed: "控制使用",
  managing: "控制",
  matters: "发挥作用",
  major: "主要",
  middle: "中路",
  minutes: "出场时间",
  move: "移动",
  movement: "跑动",
  missing: "缺少",
  must: "必须",
  need: "需要",
  needs: "需要",
  nervous: "紧张",
  noise: "干扰",
  no: "没有",
  not: "不",
  occupy: "牵制",
  off: "离开",
  one: "一个",
  opener: "首战",
  opening: "首战",
  of: "的",
  only: "只",
  open: "打开",
  opens: "打开",
  opponent: "对手",
  opponents: "对手",
  or: "或",
  organize: "组织",
  organized: "有组织",
  overcommit: "投入过多",
  own: "掌控",
  pass: "传球",
  passing: "传球",
  patience: "耐心",
  physical: "身体对抗",
  phases: "阶段",
  pitch: "球场",
  played: "进行",
  play: "比赛",
  plus: "加上",
  point: "分",
  points: "分",
  player: "球员",
  piece: "部分",
  polish: "细腻度",
  possession: "控球",
  pressure: "压力",
  protect: "保护",
  protecting: "保护",
  punish: "惩罚",
  qualification: "晋级",
  qualify: "晋级",
  quickly: "快速",
  rare: "少有",
  rarely: "很少",
  receive: "接球",
  release: "释放",
  releases: "释放",
  recovers: "回位",
  recover: "回位",
  recoveries: "反抢回合",
  repeated: "反复",
  reported: "被报道",
  response: "回应",
  retreating: "后撤",
  reset: "重整",
  rhythm: "节奏",
  right: "右路",
  route: "路径",
  runner: "跑动点",
  runners: "跑动点",
  running: "跑动",
  rushed: "仓促",
  saves: "扑救",
  scoreline: "比分",
  scoring: "得分",
  second: "第二",
  secure: "稳固",
  serve: "输送给",
  service: "输送",
  set: "落位",
  settle: "站稳",
  settles: "站稳",
  sharpest: "最锐利",
  sharp: "锐利",
  sharper: "更锐利",
  shot: "射门",
  shooting: "射门",
  shots: "射门",
  side: "一侧",
  sides: "两队",
  slow: "放慢",
  space: "空间",
  speed: "速度",
  spell: "阶段",
  spells: "阶段",
  spine: "中轴",
  spark: "火花",
  start: "发起",
  starts: "发起",
  steady: "稳定",
  staying: "保持",
  still: "仍然",
  stay: "保持",
  stopping: "阻止",
  stretch: "拉开",
  stretched: "被拉开",
  stretching: "拉开",
  structure: "结构",
  structured: "有结构",
  stronger: "更强",
  strongest: "最强",
  sudden: "突然",
  surges: "冲击",
  support: "支援",
  survive: "顶住",
  survival: "生存",
  technical: "技术型",
  tempo: "节奏",
  the: "",
  their: "他们的",
  then: "然后",
  this: "这",
  territory: "场地优势",
  three: "三",
  threat: "威胁",
  through: "通过",
  to: "",
  tight: "紧凑",
  timing: "时机",
  touches: "触球",
  transition: "转换",
  transitions: "转换",
  trust: "信任",
  trusting: "信任",
  turn: "转化",
  turning: "转化",
  underdogs: "弱势方",
  underdog: "弱势方",
  unbalance: "打乱平衡",
  uncomfortable: "不舒服",
  unbeaten: "保持不败",
  unless: "除非",
  unsettled: "未站稳",
  until: "直到",
  use: "利用",
  useful: "有用",
  using: "利用",
  veteran: "经验丰富",
  vital: "关键",
  volatile: "充满变数",
  want: "想要",
  waves: "浪潮",
  while: "同时",
  who: "能够",
  whose: "其",
  width: "宽度",
  wild: "失控",
  wildcard: "变数",
  win: "胜利",
  winning: "赢得",
  wins: "胜利",
  with: "配合",
  work: "工作",
  workrate: "跑动投入",
  world: "世界杯",
  young: "年轻"
};

const ZH_PLAYER_SKILL_PHRASES = {
  "aerial target play": "高空支点打法",
  "attacking midfielder": "攻击型中场",
  "attacking midfield": "攻击型中场",
  "back line": "后防线",
  "back post": "后点",
  "ball carrying": "带球推进",
  "ball playing": "出球型",
  "ball winning": "抢回球权",
  "behind the line": "身后",
  "between lines": "线间",
  "box edge": "禁区弧顶",
  "box to box": "全能中场",
  "build up": "组织推进",
  "centre back": "中后卫",
  "centre forward": "中锋",
  "central midfielder": "中前卫",
  "counter press": "反抢",
  "cut inside": "内切",
  "defensive midfielder": "防守型中场",
  "drawn fouls": "造犯规",
  "far side": "远端",
  "final third": "前场",
  "first time": "第一时间",
  "full back": "边后卫",
  "fullback": "边后卫",
  "half space": "肋部",
  "hold up": "支点做球",
  "left back": "左后卫",
  "left back development": "左后卫成长",
  "left foot": "左脚",
  "left footed": "左脚",
  "left side": "左路",
  "left sided": "左路",
  "left wing": "左边路",
  "left wing back": "左翼卫",
  "left winger": "左边锋",
  "long range": "远距离",
  "near post": "前点",
  "one on one": "一对一",
  "one v one": "一对一",
  "penalty area": "禁区",
  "player development": "球员成长",
  "press resistance": "抗压能力",
  "recovery speed": "回追速度",
  "right back": "右后卫",
  "right foot": "右脚",
  "right footed": "右脚",
  "right side": "右路",
  "right sided": "右路",
  "right wing": "右边路",
  "right wing back": "右翼卫",
  "right winger": "右边锋",
  "second ball": "二点球",
  "set piece": "定位球",
  "set pieces": "定位球",
  "short passing": "短传",
  "sweeper keeper": "清道夫门将",
  "third man": "第三人",
  "wide areas": "边路区域",
  "wide defense": "边路防守",
  "wide defending": "边路防守",
  "wide play": "边路打法",
  "wide pressure": "边路压迫",
  "wing back": "翼卫"
};

const ZH_PLAYER_SKILL_WORDS = {
  ...ZH_GENERATED_COPY_WORDS,
  a: "",
  acceleration: "加速",
  aerial: "高空",
  aggression: "强度",
  aggressive: "强硬",
  angles: "角度",
  anticipation: "预判",
  area: "区域",
  arrivals: "插上",
  arriving: "插上",
  athletic: "运动能力",
  athleticism: "运动能力",
  back: "后防",
  balance: "平衡",
  ball: "球权",
  balls: "球权",
  bench: "替补",
  big: "关键",
  bite: "硬度",
  block: "封堵",
  blocking: "封堵",
  bravery: "勇气",
  brave: "勇气",
  buildup: "组织推进",
  burst: "爆发",
  bursts: "爆发",
  captain: "队长",
  centre: "中路",
  changes: "变奏",
  choices: "选择",
  circulation: "运转",
  claiming: "摘球",
  clearances: "解围",
  close: "近距离",
  combative: "对抗",
  commanding: "指挥",
  communication: "沟通",
  composed: "镇定",
  concentration: "专注",
  confidence: "自信",
  contact: "身体接触",
  contests: "争抢",
  counterattack: "反击",
  crashing: "冲入",
  creativity: "创造力",
  cues: "提示",
  cutback: "倒三角",
  cutbacks: "倒三角",
  cuts: "内切",
  deep: "深位",
  defense: "防守",
  development: "成长",
  diagonal: "斜传",
  diagonals: "斜传",
  discipline: "纪律性",
  disciplined: "纪律性",
  disguise: "隐蔽处理",
  disguised: "隐蔽处理",
  distribution: "分球",
  domestic: "国内",
  dominance: "优势",
  drifting: "游动",
  effort: "投入",
  engine: "发动机",
  entries: "进入禁区",
  escape: "摆脱",
  escapes: "摆脱",
  european: "欧洲",
  exits: "摆脱",
  experience: "经验",
  experienced: "经验",
  explosive: "爆发力",
  explosiveness: "爆发力",
  far: "远端",
  fast: "快速",
  fearless: "无畏",
  feet: "脚下",
  field: "场地",
  first: "第一",
  flexible: "灵活",
  flexibility: "灵活性",
  focus: "专注",
  foot: "脚",
  footed: "脚",
  forward: "锋线",
  frame: "身材",
  fresh: "新鲜体能",
  front: "前场",
  full: "边后卫",
  gliding: "滑行推进",
  goalkeeping: "门将",
  growth: "成长",
  handling: "处理",
  height: "身高",
  hybrid: "混合",
  ins: "内切",
  instinct: "嗅觉",
  instincts: "嗅觉",
  intelligence: "球商",
  intensity: "强度",
  interceptions: "拦截",
  interior: "内线",
  inverted: "内收",
  isolation: "一对一",
  keeper: "门将",
  knockdowns: "摆渡",
  lanes: "通道",
  layoffs: "做球",
  leadership: "领导力",
  league: "联赛",
  legs: "体能",
  line: "防线",
  lines: "线间",
  long: "长传",
  low: "低位",
  management: "管理",
  marking: "盯防",
  minded: "意识",
  mobility: "机动性",
  modern: "现代",
  near: "前点",
  one: "一对一",
  organisation: "组织",
  organization: "组织",
  outlet: "出球点",
  outlets: "出球点",
  overlap: "套上",
  overlapping: "套上",
  overloads: "人数优势",
  phase: "阶段",
  piece: "定位球",
  pieces: "定位球",
  playing: "出球",
  playmaking: "组织",
  pocket: "肋部",
  position: "位置",
  positional: "位置感",
  positioning: "位置感",
  post: "点位",
  potential: "潜力",
  powerful: "力量",
  premier: "顶级",
  prevention: "阻止",
  progressive: "推进",
  promise: "潜力",
  protection: "保护",
  protective: "保护",
  quality: "质量",
  range: "覆盖范围",
  rate: "投入",
  reach: "覆盖",
  reaction: "反应",
  reactions: "反应",
  record: "记录",
  reflex: "反应",
  reflexes: "反应",
  reliability: "可靠性",
  resistant: "抗压",
  restart: "重新发起",
  restarts: "重新发起",
  restraint: "克制",
  retention: "控球",
  ruthless: "冷酷",
  safe: "安全",
  safety: "安全",
  saves: "扑救",
  screening: "屏障",
  setting: "设定",
  shielding: "护球",
  shifts: "横移",
  short: "短传",
  side: "一侧",
  sided: "一侧",
  simple: "简洁",
  size: "身材",
  soft: "柔和触球",
  sprints: "冲刺",
  starting: "首发",
  steady: "稳定",
  stepping: "上抢",
  steps: "上抢",
  street: "老练",
  striker: "中锋",
  sweeper: "清道夫",
  switching: "转移",
  tackle: "抢断",
  tackles: "抢断",
  tackling: "抢断",
  tactical: "战术",
  tall: "高大",
  teenage: "年轻",
  term: "长期",
  terror: "威胁",
  third: "第三",
  thrust: "推进",
  tight: "小空间",
  touch: "触球",
  touches: "触球",
  touchline: "边线",
  toughness: "强硬",
  tracking: "回追",
  triggers: "触发",
  underlap: "内切支援",
  upside: "潜力",
  utility: "多面性",
  v: "",
  versatility: "多面性",
  veteran: "老将",
  vision: "视野",
  voice: "指挥",
  volume: "数量",
  way: "路线",
  channel: "肋部",
  chaos: "混乱",
  combination: "配合",
  combinations: "配合",
  command: "指挥",
  composure: "镇定",
  cover: "保护",
  coverage: "保护",
  craft: "技巧",
  creation: "创造",
  creative: "创造",
  cross: "传中",
  crossing: "传中",
  cut: "内切",
  defending: "防守",
  delivery: "输送",
  drawn: "制造",
  dribbling: "盘带",
  elite: "顶级",
  emergency: "紧急",
  energy: "活力",
  haiti: "海地",
  half: "肋部",
  linking: "串联",
  links: "串联",
  man: "人",
  midfield: "中场",
  moment: "时刻",
  moments: "时刻",
  out: "摆脱",
  passes: "传球",
  penalty: "禁区",
  power: "力量",
  presence: "存在感",
  press: "压迫",
  pressing: "压迫",
  progression: "推进",
  punch: "冲击",
  quick: "快速",
  receiving: "接球",
  recovery: "回追",
  relentless: "不停跑动",
  resistance: "抗压",
  runs: "跑动",
  security: "安全感",
  serie: "意甲",
  shoot: "射门",
  strength: "力量",
  target: "支点",
  targets: "支点",
  tournament: "大赛",
  turns: "转身",
  two: "双",
  under: "受压",
  up: "支点",
  vertical: "纵向",
  wide: "边路",
  width: "宽度",
  wing: "边路",
  youthful: "年轻"
};

let zhNormalizedEntityTranslations = null;
let zhRouteEntityAliasTranslations = null;

function getKnownGeneratedCopyTranslation(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text ? ZH_EXACT_TRANSLATIONS.get(text) || ZH_GENERATED_COPY_TERMS[text] || "" : "";
}

function shouldDebugZhGeneratedCopy() {
  try {
    return typeof window !== "undefined" && window.localStorage?.getItem("debug-zh-generated-copy") === "1";
  } catch (error) {
    return false;
  }
}

function debugZhGeneratedCopy(label, detail) {
  if (shouldDebugZhGeneratedCopy()) {
    console.warn("[zh-generated-copy]", label, detail);
  }
}

function getZhNormalizedEntityTranslations() {
  if (zhNormalizedEntityTranslations) {
    return zhNormalizedEntityTranslations;
  }

  zhNormalizedEntityTranslations = new Map();
  [
    [ZH_PLAYER_NAME_TRANSLATIONS, true],
    [ZH_HISTORICAL_SCORER_TRANSLATIONS, true],
    [ZH_CLUB_NAME_TRANSLATIONS, false],
    [ZH_LEAGUE_NAME_TRANSLATIONS, false],
    [ZH_SOURCE_LABEL_TRANSLATIONS, false],
    [ZH_ADDITIONAL_EXACT_TRANSLATIONS, false],
    [Object.fromEntries(ZH_EXACT_TRANSLATIONS), false]
  ].forEach(([translationMap, allowLastNameAlias]) => {
    Object.entries(translationMap).forEach(([source, translation]) => {
      const key = normalizeTextKey(source);
      if (key && !zhNormalizedEntityTranslations.has(key)) {
        zhNormalizedEntityTranslations.set(key, translation);
      }

      const sourceParts = String(source).split(/\s+/).filter(Boolean);
      const translationParts = String(translation).split("·").filter(Boolean);
      const lastSourcePart = sourceParts.at(-1);
      const lastTranslationPart = translationParts.at(-1);
      const lastSourceKey = normalizeTextKey(lastSourcePart);
      if (
        allowLastNameAlias &&
        sourceParts.length > 1 &&
        lastSourceKey &&
        lastTranslationPart &&
        !zhNormalizedEntityTranslations.has(lastSourceKey)
      ) {
        zhNormalizedEntityTranslations.set(lastSourceKey, lastTranslationPart);
      }
    });
  });

  return zhNormalizedEntityTranslations;
}

function translateEntityNameToZh(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return "";
  }

  const exact =
    ZH_PLAYER_NAME_TRANSLATIONS[text] ||
    ZH_HISTORICAL_SCORER_TRANSLATIONS[text] ||
    ZH_ADDITIONAL_EXACT_TRANSLATIONS[text] ||
    ZH_EXACT_TRANSLATIONS.get(text);
  if (exact) {
    return exact;
  }

  const normalized = getZhNormalizedEntityTranslations().get(normalizeTextKey(text));
  if (normalized) {
    return normalized;
  }

  if (text.includes("-")) {
    const parts = text.split("-").map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1 && parts.every((part) => /^[A-ZÀ-ÖØ-Þ]/.test(part))) {
      const translatedParts = parts.map((part) => translateEntityNameToZh(part));
      if (translatedParts.every((part, index) => part && part !== parts[index])) {
        return translatedParts.join("-");
      }
    }
  }

  return transliterateHistoricalScorerName(text);
}

function splitEnglishNameSeries(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return [];
  }

  return text
    .replace(/,\s+and\s+/g, ", ")
    .replace(/\s+and\s+/g, ", ")
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isEnglishNameSeriesPart(value) {
  const tokens = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (!tokens.length || tokens.length > 5) {
    return false;
  }

  return tokens.every((token) =>
    /^(?:[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ.'-]*|al|bin|da|de|del|der|di|dos|el|la|le|van|von)$/.test(token)
  );
}

function translateNameSeriesToZh(value) {
  return splitEnglishNameSeries(value).map(translateEntityNameToZh).filter(Boolean).join("、");
}

function addZhRouteEntityAlias(aliases, source, translation) {
  const key = normalizeTextKey(source);
  const text = String(translation || "").trim();
  if (key && text && !aliases.has(key)) {
    aliases.set(key, text);
  }
}

function getZhRouteEntityAliasTranslations() {
  if (zhRouteEntityAliasTranslations) {
    return zhRouteEntityAliasTranslations;
  }

  zhRouteEntityAliasTranslations = new Map();
  [ZH_PLAYER_NAME_TRANSLATIONS, ZH_HISTORICAL_SCORER_TRANSLATIONS].forEach((translationMap) => {
    Object.entries(translationMap).forEach(([source, translation]) => {
      const sourceParts = String(source || "").split(/\s+/).filter(Boolean);
      const translationParts = String(translation || "").split("·").filter(Boolean);

      addZhRouteEntityAlias(zhRouteEntityAliasTranslations, source, translation);

      if (sourceParts.length <= 1 || !translationParts.length) {
        return;
      }

      addZhRouteEntityAlias(zhRouteEntityAliasTranslations, sourceParts[0], translationParts[0]);
      addZhRouteEntityAlias(zhRouteEntityAliasTranslations, sourceParts.at(-1), translationParts.at(-1));
      addZhRouteEntityAlias(
        zhRouteEntityAliasTranslations,
        sourceParts.slice(1).join(" "),
        translationParts.slice(-1).join("·")
      );
    });
  });

  return zhRouteEntityAliasTranslations;
}

function translateRouteEntityPartToZh(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return "";
  }

  const alias = getZhRouteEntityAliasTranslations().get(normalizeTextKey(text));
  if (alias) {
    return alias;
  }

  const direct = translateEntityNameToZh(text);
  if (direct && direct !== text && !/[A-Za-z]/.test(direct)) {
    return direct;
  }

  return text;
}

function translateGeneratedRouteLabelToZh(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text || !text.includes("-")) {
    return "";
  }

  const routeTerms = Object.entries(ZH_GENERATED_COPY_TERMS)
    .filter(([source]) =>
      /(?:attacks|breaks|buildup|chain|control|counters|craft|entries|escape|play|pressure|rhythm|route|running|service|speed|supply|surges)$/.test(source)
    )
    .sort((a, b) => b[0].length - a[0].length);

  for (const [source, translation] of routeTerms) {
    if (!text.toLowerCase().endsWith(` ${source.toLowerCase()}`)) {
      continue;
    }

    const entityText = text.slice(0, -source.length).trim();
    const separator = entityText.includes("-to-") ? "-to-" : "-";
    const entityParts = entityText.split(separator).map((part) => part.trim()).filter(Boolean);

    if (entityParts.length < 2 || !entityParts.every((part) => /^[A-ZÀ-ÖØ-Þ]/.test(part))) {
      continue;
    }

    const translatedParts = entityParts.map(translateRouteEntityPartToZh);
    if (!translatedParts.every((part, index) => part && part !== entityParts[index] && !/[A-Za-z]/.test(part))) {
      continue;
    }

    return `${translatedParts.join(separator === "-to-" ? "到" : "-")}${translation}`;
  }

  return "";
}

function replaceGeneratedCopyEntities(value) {
  let output = String(value || "");

  output = output.replace(
    /\b([A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ.'-]*(?:\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ.'-]*){0,3})(?:'s|')\b/g,
    (_, name) => `${translateEntityNameToZh(name)}的`
  );

  const entityEntries = [
    ...Object.entries(ZH_PLAYER_NAME_TRANSLATIONS),
    ...Object.entries(ZH_HISTORICAL_SCORER_TRANSLATIONS),
    ...Object.entries(ZH_ADDITIONAL_EXACT_TRANSLATIONS),
    ...Object.entries(Object.fromEntries(ZH_EXACT_TRANSLATIONS))
  ].sort((a, b) => b[0].length - a[0].length);

  for (const [source, translation] of entityEntries) {
    output = output.replace(new RegExp(`\\b${escapeRegExp(source)}\\b`, "gi"), translation);
  }

  return output;
}

function translateGeneratedSoccerPhraseToZh(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return "";
  }

  const exact = getKnownGeneratedCopyTranslation(text);
  if (exact) {
    return exact;
  }

  const routeLabel = translateGeneratedRouteLabelToZh(text);
  if (routeLabel) {
    return routeLabel;
  }

  const series = splitEnglishNameSeries(text);
  if (
    series.length > 1 &&
    series.every((part) => isEnglishNameSeriesPart(part) && translateEntityNameToZh(part) !== part)
  ) {
    return translateNameSeriesToZh(text);
  }

  let output = replaceGeneratedCopyEntities(text)
    .replace(/one-on-one/g, "一对一")
    .replace(/box-to-box/g, "全能中场")
    .replace(/low-margin/g, "低容错")
    .replace(/right-sided/g, "右路")
    .replace(/left-sided/g, "左路")
    .replace(/left-footed/g, "左脚")
    .replace(/two-way/g, "攻守兼备")
    .replace(/two-forward/g, "双前锋")
    .replace(/first-time/g, "首次参赛")
    .replace(/big-moment/g, "关键时刻")
    .replace(/late-game/g, "比赛后段")
    .replace(/current-match/g, "当前比赛")
    .replace(/current-squad/g, "当前阵容")
    .replace(/set-piece/g, "定位球")
    .replace(/free-kick/g, "任意球")
    .replace(/quick-break/g, "快速反击")
    .replace(/second-ball/g, "二点球")
    .replace(/between-lines/g, "线间")
    .replace(/final-third/g, "前场")
    .replace(/far-side/g, "远端")
    .replace(/wide-and-service/g, "宽度和输送")
    .replace(/control-and-release/g, "控制与释放")
    .replace(/save-to-counter/g, "扑救到反击")
    .replace(/flank-to-box/g, "边路到禁区")
    .replace(/duel-and-service/g, "对抗与输送");

  const termEntries = Object.entries(ZH_GENERATED_COPY_TERMS).sort((a, b) => b[0].length - a[0].length);
  for (const [source, translation] of termEntries) {
    output = output.replace(new RegExp(`\\b${escapeRegExp(source)}\\b`, "gi"), translation);
  }

  output = output.replace(/\b[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'-]*\b/g, (word) => {
    const lower = word.toLowerCase();
    if (ZH_GENERATED_COPY_WORDS[lower] !== undefined) {
      return ZH_GENERATED_COPY_WORDS[lower];
    }

    if (/^[A-ZÀ-ÖØ-Þ]/.test(word)) {
      return translateEntityNameToZh(word);
    }

    return word;
  });

  if (/[A-Za-z]/.test(output)) {
    debugZhGeneratedCopy("untranslated phrase", { source: text, output });
    return "";
  }

  return output
    .replace(/\s+/g, "")
    .replace(/，+/g, "，")
    .replace(/、+/g, "、")
    .replace(/，。/g, "。")
    .trim();
}

function normalizePlayerSkillKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/\b1v1\b/g, "one v one")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function translatePlayerSkillToZh(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return "";
  }

  const exact = ZH_EXACT_TRANSLATIONS.get(text) || ZH_GENERATED_COPY_TERMS[text];
  if (exact) {
    return exact;
  }

  const normalized = normalizePlayerSkillKey(text);
  if (!normalized) {
    return "";
  }

  const normalizedExact = ZH_PLAYER_SKILL_PHRASES[normalized] || ZH_GENERATED_COPY_TERMS[normalized];
  if (normalizedExact) {
    return normalizedExact;
  }

  const tokens = normalized.split(" ").filter(Boolean);
  const pieces = [];
  const unknown = [];
  const maxPhraseLength = 4;

  for (let index = 0; index < tokens.length;) {
    let matched = "";
    let matchedLength = 0;
    const phraseLimit = Math.min(maxPhraseLength, tokens.length - index);
    for (let length = phraseLimit; length > 0; length -= 1) {
      const phrase = tokens.slice(index, index + length).join(" ");
      const translatedPhrase = ZH_PLAYER_SKILL_PHRASES[phrase] || ZH_GENERATED_COPY_TERMS[phrase];
      if (translatedPhrase !== undefined) {
        matched = translatedPhrase;
        matchedLength = length;
        break;
      }
    }

    if (matchedLength) {
      if (matched) {
        pieces.push(matched);
      }
      index += matchedLength;
      continue;
    }

    const token = tokens[index];
    const translatedToken = ZH_PLAYER_SKILL_WORDS[token];
    if (translatedToken !== undefined) {
      if (translatedToken) {
        pieces.push(translatedToken);
      }
    } else {
      unknown.push(token);
    }
    index += 1;
  }

  if (unknown.length) {
    debugZhGeneratedCopy("untranslated player skill", { source: text, unknown });
  }

  return pieces.length && !unknown.length ? pieces.join("").replace(/和$/u, "").trim() : "球员看点";
}

function localizePlayerSkill(value) {
  return currentLanguage === "zh" ? translatePlayerSkillToZh(value) : String(value ?? "");
}

function translateHistoricalBasisToZh(value) {
  return getKnownGeneratedCopyTranslation(value) || translateGeneratedSoccerPhraseToZh(value);
}

function translateHistoricalProblemToZh(value) {
  const text = String(value || "").trim();
  const scorerMatch = text.match(/^(.+)'s scoring threat through (.+)$/);
  if (scorerMatch) {
    return `${translateEntityNameToZh(scorerMatch[1])}通过${translateNameSeriesToZh(scorerMatch[2])}形成的得分威胁`;
  }

  const cleanSheetMatch = text.match(/^(.+)'s clean-sheet structure$/);
  if (cleanSheetMatch) {
    return `${translateEntityNameToZh(cleanSheetMatch[1])}的零封结构`;
  }

  const spineMatch = text.match(/^(.+)'s match spine of (.+)$/);
  if (spineMatch) {
    return `${translateEntityNameToZh(spineMatch[1])}由${translateNameSeriesToZh(spineMatch[2])}组成的比赛中轴`;
  }

  const shapeMatch = text.match(/^(.+)'s tournament shape$/);
  if (shapeMatch) {
    return `${translateEntityNameToZh(shapeMatch[1])}的赛事阵型`;
  }

  return translateGeneratedSoccerPhraseToZh(text);
}

function translateHistoricalPlanToZh(value) {
  const text = String(value || "").trim();
  const scoringRouteMatch = text.match(/^turning (.+) into the scoring route$/);
  if (scoringRouteMatch) {
    return `把${translateNameSeriesToZh(scoringRouteMatch[1])}变成得分路径`;
  }

  const shootoutMatch = text.match(/^reaching the shootout and trusting (.+)$/);
  if (shootoutMatch) {
    return `把比赛拖入点球大战并信任${translateNameSeriesToZh(shootoutMatch[1])}`;
  }

  const protectedMatch = text.match(/^keeping the box protected around (.+)$/);
  if (protectedMatch) {
    const names = protectedMatch[1] === "their defensive shape"
      ? "防守阵型"
      : translateNameSeriesToZh(protectedMatch[1]);
    return `围绕${names}保护禁区`;
  }

  const forwardShapeMatch = text.match(/^using a forward-heavy shape around (.+)$/);
  if (forwardShapeMatch) {
    return `围绕${translateNameSeriesToZh(forwardShapeMatch[1])}采用锋线人数更多的阵型`;
  }

  const midfieldMatch = text.match(/^using midfield numbers around (.+) to control the game$/);
  if (midfieldMatch) {
    return `围绕${translateNameSeriesToZh(midfieldMatch[1])}用中场人数控制比赛`;
  }

  const defensiveBaseMatch = text.match(/^keeping a defensive base around (.+)$/);
  if (defensiveBaseMatch) {
    return `围绕${translateNameSeriesToZh(defensiveBaseMatch[1])}保持防守基础`;
  }

  const spineMatch = text.match(/^making (.+) the spine of the match plan$/);
  if (spineMatch) {
    return `让${translateNameSeriesToZh(spineMatch[1])}成为比赛计划的中轴`;
  }

  if (text === "staying connected through the tournament squad shape") {
    return "通过赛事阵容结构保持整体连接";
  }

  return translateGeneratedSoccerPhraseToZh(text);
}

function translateHistoricalResultClauseToZh(value) {
  const text = String(value || "").trim();
  const winMatch = text.match(/^that route held in the (.+) win$/);
  if (winMatch) {
    return `这条路径在${winMatch[1]}胜利中奏效`;
  }

  const lossMatch = text.match(/^that route was not enough in the (.+) loss$/);
  if (lossMatch) {
    return `这条路径在${lossMatch[1]}失利中还不够`;
  }

  const drawMatch = text.match(/^that route produced a (.+) draw$/);
  if (drawMatch) {
    return `这条路径带来${drawMatch[1]}平局`;
  }

  if (text === "the match was canceled before that test happened") {
    return "比赛在这次检验发生前已经取消";
  }

  if (text === "the record does not include a final score") {
    return "记录中没有最终比分";
  }

  return translateGeneratedSoccerPhraseToZh(text);
}

function translateHistoricalRiskToZh(value) {
  const text = String(value || "").trim().replace(/\.$/, "");
  const finishMatch = text.match(/^(.+) had already shown the finish to make that pressure count$/);
  if (finishMatch) {
    return `${translateEntityNameToZh(finishMatch[1])}已经展现出把压力转化为进球的终结能力。`;
  }

  const patienceMatch = text.match(/^(.+) could make the match about patience rather than chances$/);
  if (patienceMatch) {
    return `${translateEntityNameToZh(patienceMatch[1])}可能让比赛变成耐心而不是机会的较量。`;
  }

  const tiltMatch = text.match(/^(.+) could still tilt the game through (.+)$/);
  if (tiltMatch) {
    return `${translateEntityNameToZh(tiltMatch[1])}仍可能通过${translateNameSeriesToZh(tiltMatch[2])}改变比赛走势。`;
  }

  const cleanSpellMatch = text.match(/^(.+) could still turn the same matchup with one clean spell$/);
  if (cleanSpellMatch) {
    return `${translateEntityNameToZh(cleanSpellMatch[1])}仍可能凭借一段清晰发挥扭转同样的对位。`;
  }

  return `${translateGeneratedSoccerPhraseToZh(text)}。`;
}

function translateHistoricalKeyInformationToZh(value) {
  const text = String(value || "").trim();
  const canceledMatch = text.match(
    /^(.+)'s (\d{4}) fixture with (.+) was canceled, so there is no match roster to analyze\. (.+) Against (.+), the useful read is the matchup that never got played, not a confirmed tactical plan\. Treat this as squad context, not match usage\.$/
  );
  if (canceledMatch) {
    const [, teamName, year, opponentName, contextText] = canceledMatch;
    const periodMatch = contextText.match(/^The period-specific baseline still comes from (.+) in the (.+)\.$/);
    const noBaselineMatch = contextText.match(
      /^The imported historical datasets do not include a usable (.+) player baseline for this canceled fixture\.$/
    );
    const context = periodMatch
      ? `这一时期的基线仍来自${translateNameSeriesToZh(periodMatch[1])}，依据${translateHistoricalBasisToZh(periodMatch[2])}。`
      : noBaselineMatch
        ? `导入的历史数据集没有为这场取消的比赛提供可用的${translateEntityNameToZh(noBaselineMatch[1])}球员基线。`
        : `${translateGeneratedSoccerPhraseToZh(contextText)}。`;

    return `${translateEntityNameToZh(teamName)}在${year}年原定对阵${translateEntityNameToZh(opponentName)}的比赛被取消，因此没有可分析的比赛名单。${context}对阵${translateEntityNameToZh(opponentName)}，有用的解读是这场从未进行的对位，而不是已确认的战术计划。请把这视为阵容背景，而不是比赛实际使用情况。`;
  }

  const playerMatch = text.match(
    /^(.+)'s (\d{4}) match lens runs through (.+), based on the (.+)\. Against (.+), (.+) had to beat (.+)\. Their own route was (.+), and (.+)\. The risk was that (.+)$/
  );
  if (playerMatch) {
    const [, teamName, year, players, basis, opponentName, subjectName, problem, plan, result, risk] = playerMatch;
    return `${translateEntityNameToZh(teamName)}在${year}年的比赛观察点集中在${translateNameSeriesToZh(players)}，依据${translateHistoricalBasisToZh(basis)}。对阵${translateEntityNameToZh(opponentName)}，${translateEntityNameToZh(subjectName)}必须破解${translateHistoricalProblemToZh(problem)}。他们自己的路径是${translateHistoricalPlanToZh(plan)}，并且${translateHistoricalResultClauseToZh(result)}。风险在于${translateHistoricalRiskToZh(risk)}`;
  }

  const basisOnlyMatch = text.match(
    /^(.+)'s (\d{4}) match lens comes from the (.+)\. Against (.+), (.+) had to beat (.+)\. Their own route was (.+), and (.+)\. The risk was that (.+)$/
  );
  if (basisOnlyMatch) {
    const [, teamName, year, basis, opponentName, subjectName, problem, plan, result, risk] = basisOnlyMatch;
    return `${translateEntityNameToZh(teamName)}在${year}年的比赛观察点来自${translateHistoricalBasisToZh(basis)}。对阵${translateEntityNameToZh(opponentName)}，${translateEntityNameToZh(subjectName)}必须破解${translateHistoricalProblemToZh(problem)}。他们自己的路径是${translateHistoricalPlanToZh(plan)}，并且${translateHistoricalResultClauseToZh(result)}。风险在于${translateHistoricalRiskToZh(risk)}`;
  }

  return "";
}

function translateCurrentContextSentenceToZh(value) {
  const text = String(value || "").trim();
  const exactContexts = {
    "A draw could be enough for Scotland.": "一场平局可能就足以让苏格兰完成目标。",
    "Algeria remain favored, but their World Cup win drought keeps pressure high.":
      "阿尔及利亚仍是更被看好的一方，但世界杯胜场荒让压力保持在高位。",
    "Both teams enter off opening defeats.": "两队都带着首战失利进入这场比赛。",
    "Canada's Davies question makes tempo control vital.": "加拿大的戴维斯出场疑问让节奏控制变得关键。",
    "Colombia have a full squad available.": "哥伦比亚可以使用完整阵容。",
    "Croatia can still protect a top-three path.": "克罗地亚仍然可以守住争夺小组前三的路径。",
    "Czechia have one point.": "捷克目前有1分。",
    "Davies is available again after missing the group stage, but his role could still be managed.":
      "戴维斯缺席小组赛后已经可以再次出场，但上场方式仍可能被控制。",
    "Davies is available but has not yet played.": "戴维斯可以出场，但目前还没有登场。",
    "DR Congo have no major injury concerns reported.": "刚果民主共和国目前没有主要伤病问题被报道。",
    "Haiti cannot match Morocco's control, so their best route is a clean first pass forward.":
      "海地很难匹配摩洛哥的控制力，因此最好的路径是完成干净的第一脚向前传球。",
    "Jordan matched Austria for shots but still lost their opener.": "约旦首战射门数与奥地利接近，但仍然输球。",
    "Kubo could play a part after the knee issue, so Ueda and Doan may carry the early threat.":
      "久保建英膝伤后仍可能参与比赛，因此上田绮世和堂安律可能承担开局阶段的主要进攻威胁。",
    "Mexico have six points and two clean sheets.": "墨西哥已经拿到6分并完成两场零封。",
    "Morocco control their group path.": "摩洛哥掌控着自己的小组路径。",
    "Neymar has returned from the bench after his calf issue, so Brazil can manage his minutes.":
      "内马尔已在小腿伤势后替补复出，因此巴西可以控制他的出场时间。",
    "Neymar is available but not expected to start.": "内马尔可以出场，但预计不会首发。",
    "No Bosnia absences are confirmed.": "波黑目前没有确认缺席的球员。",
    "No major injury concerns are reported.": "目前没有主要伤病问题被报道。",
    "No South Africa injury concerns are reported.": "南非目前没有伤病问题被报道。",
    "Qatar need a win after the Canada collapse.": "卡塔尔在输给加拿大后需要一场胜利。",
    "Rice and Kane are fit, while Saka is likely managed.": "赖斯和凯恩身体状况良好，萨卡可能会被控制出场时间。",
    "Ruben Dias is expected back.": "鲁本·迪亚斯预计回归。",
    "Rustamjon Ashurmatov is a game-time decision.": "鲁斯塔姆琼·阿舒尔马托夫能否出场要到赛前决定。",
    "Senegal have found wide space but need a cleaner final pass.": "塞内加尔已经找到了边路空间，但还需要更干净的最后一传。",
    "South Korea are largely fit.": "韩国阵容整体健康。",
    "Thomas Partey is available after missing the Panama opener.": "托马斯·帕尔特伊缺席巴拿马首战后已经可以出场。"
  };

  return exactContexts[text] || (text ? `${translateGeneratedSoccerPhraseToZh(text)}。` : "");
}

function translateCurrentSummaryToZh(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return "";
  }

  const exact = getKnownGeneratedCopyTranslation(text);
  if (exact) {
    return exact;
  }

  const stateMatch = text.match(/^(?:are|is)\s+(.+)$/);
  if (stateMatch) {
    const predicate = translateGeneratedSoccerPhraseToZh(stateMatch[1].replace(/^(?:a|an|the)\s+/, ""));
    return predicate ? `是${predicate}` : "";
  }

  const abilityMatch = text.match(/^can\s+(.+)$/);
  if (abilityMatch) {
    const ability = translateGeneratedSoccerPhraseToZh(abilityMatch[1]);
    return ability ? `可以${ability}` : "";
  }

  const stillHaveMatch = text.match(/^still\s+have\s+(.+)$/);
  if (stillHaveMatch) {
    const detail = translateGeneratedSoccerPhraseToZh(stillHaveMatch[1]);
    return detail ? `仍然拥有${detail}` : "";
  }

  const activeMatch = text.match(/^(need|must|want|face|carry|playing|boosted by|unbeaten after)\s+(.+)$/);
  if (activeMatch) {
    const verbMap = {
      "boosted by": "因为",
      carry: "带着",
      face: "面临",
      must: "必须",
      need: "需要",
      playing: "正在",
      "unbeaten after": "在之后保持不败，并且",
      want: "希望"
    };
    const detail = translateGeneratedSoccerPhraseToZh(activeMatch[2]);
    return detail ? `${verbMap[activeMatch[1]]}${detail}` : "";
  }

  const translated = translateGeneratedSoccerPhraseToZh(text);
  return translated || "";
}

function getGeneratedCopyTeamNameCandidates() {
  const currentTeamNames = [...teamsById.values()].map((team) => team.name).filter(Boolean);
  const historicalTeamNames =
    typeof HISTORICAL_TEAM_COUNTRY_CODES === "object" && HISTORICAL_TEAM_COUNTRY_CODES
      ? Object.keys(HISTORICAL_TEAM_COUNTRY_CODES)
      : [];

  return [...new Set([...currentTeamNames, ...historicalTeamNames])]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
}

function splitGeneratedTeamSummary(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return null;
  }

  for (const teamName of getGeneratedCopyTeamNameCandidates()) {
    if (text === teamName || text.startsWith(`${teamName} `)) {
      return {
        teamName,
        summary: text.slice(teamName.length).trim()
      };
    }
  }

  const fallback = text.match(/^(.+?)\s+(.+)$/);
  return fallback ? { teamName: fallback[1], summary: fallback[2] } : null;
}

function translateCurrentMatchupProblemToZh(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  const possessiveMatch = text.match(/^(.+?)(?:'s|') (.+)$/);

  if (possessiveMatch) {
    const problem = translateGeneratedSoccerPhraseToZh(possessiveMatch[2]);
    return problem ? `${translateEntityNameToZh(possessiveMatch[1])}的${problem}` : "";
  }

  return translateGeneratedSoccerPhraseToZh(text);
}

function translateCurrentMatchPreviewToZh(value) {
  const text = String(value || "").trim();
  const baseMatch = text.match(
    /^(.+?), led by (.+?)\. Against (.+?), their (.+?) has to beat (.+?)\. (.+)$/
  );

  if (!baseMatch) {
    return "";
  }

  const [, teamSummary, players, opponentName, teamProblem, opponentProblem, remainingText] = baseMatch;
  const standardPlanMatch = remainingText.match(
    /^(.*?)They want to (.+?)\. The risk is (.+?) can (.+?)\.$/
  );
  const compactPlanMatch = remainingText.match(
    /^(.*?)They want (.+?); the risk is (.+?) (.+?)\.$/i
  );
  const riskOnlyMatch = remainingText.match(
    /^(.*?)The risk is (.+?) (.+?)\.$/i
  );

  if (!standardPlanMatch && !compactPlanMatch && !riskOnlyMatch) {
    return "";
  }

  const matchedPlan = standardPlanMatch || compactPlanMatch || riskOnlyMatch;
  const contextText = matchedPlan[1];
  const attackPlan = standardPlanMatch ? standardPlanMatch[2] : compactPlanMatch ? compactPlanMatch[2] : "";
  const riskTeam = standardPlanMatch ? standardPlanMatch[3] : compactPlanMatch ? compactPlanMatch[3] : riskOnlyMatch[2];
  const threat = standardPlanMatch ? standardPlanMatch[4] : compactPlanMatch ? compactPlanMatch[4] : riskOnlyMatch[3];
  const riskVerb = "可能";
  const teamSummaryParts = splitGeneratedTeamSummary(teamSummary);
  if (!teamSummaryParts) {
    return "";
  }

  const { teamName, summary } = teamSummaryParts;
  const team = translateEntityNameToZh(teamName);
  const summaryZh = translateCurrentSummaryToZh(summary);
  const contextZh = String(contextText || "")
    .trim()
    .split(/(?<=\.)\s+/)
    .filter(Boolean)
    .map(translateCurrentContextSentenceToZh)
    .join("");
  const translatedPlayers = translateNameSeriesToZh(players);
  const teamProblemZh = translateCurrentMatchupProblemToZh(teamProblem) || "核心比赛路径";
  const opponentProblemZh = translateCurrentMatchupProblemToZh(opponentProblem) || "对手的核心比赛路径";
  const attackPlanZh = attackPlan
    ? translateGeneratedSoccerPhraseToZh(attackPlan) ||
      (translatedPlayers ? `围绕${translatedPlayers}寻找机会` : "围绕关键球员寻找机会")
    : "";
  const threatZh = translateGeneratedSoccerPhraseToZh(threat) || "把比赛带回自己的节奏";
  const summaryText = summaryZh || "有明确的比赛重点";
  const attackPlanSentence = attackPlanZh ? `他们希望${attackPlanZh}。` : "";

  return `${team}${summaryText}，由${translatedPlayers}领衔。对阵${translateEntityNameToZh(opponentName)}，他们的${teamProblemZh}必须压过${opponentProblemZh}。${contextZh}${attackPlanSentence}风险在于${translateEntityNameToZh(riskTeam)}${riskVerb}${threatZh}。`;
}

function translatePlayerNoteToZh(value) {
  const text = String(value || "").trim();
  const exact = getKnownGeneratedCopyTranslation(text);
  if (exact) {
    return exact;
  }

  const generatedRoleMatch = text.match(/^(.+)'s (goalkeeping|defensive|wide defensive|between-lines|wide attacking|forward|midfield|match-plan) option, useful for (.+)\.$/);
  if (generatedRoleMatch) {
    const roleMap = {
      "between-lines": "线间选择",
      defensive: "防守选择",
      forward: "锋线选择",
      goalkeeping: "门将选择",
      midfield: "中场选择",
      "match-plan": "比赛计划选择",
      "wide attacking": "边路进攻选择",
      "wide defensive": "边路防守选择"
    };
    const roleDetail = translateGeneratedSoccerPhraseToZh(generatedRoleMatch[3]);
    return roleDetail
      ? `${translateEntityNameToZh(generatedRoleMatch[1])}的${roleMap[generatedRoleMatch[2]]}，有助于${roleDetail}。`
      : "";
  }

  const possessiveTwoSentenceMatch = text.match(/^(.+)'s (.+?)\. If he (.+)\.$/);
  if (possessiveTwoSentenceMatch) {
    const role = translateGeneratedSoccerPhraseToZh(possessiveTwoSentenceMatch[2]);
    const condition = translateGeneratedSoccerPhraseToZh(possessiveTwoSentenceMatch[3]);
    return role && condition
      ? `${translateEntityNameToZh(possessiveTwoSentenceMatch[1])}的${role}。如果他${condition}。`
      : "";
  }

  const possessiveMatch = text.match(/^(.+)'s (.+?), (.+)\.$/);
  if (possessiveMatch) {
    const role = translateGeneratedSoccerPhraseToZh(possessiveMatch[2]);
    const detail = translateGeneratedSoccerPhraseToZh(possessiveMatch[3]);
    return role && detail ? `${translateEntityNameToZh(possessiveMatch[1])}的${role}，${detail}。` : "";
  }

  const articleWhoMatch = text.match(/^(?:A|An|The) (.+?) who (.+)\.$/);
  if (articleWhoMatch) {
    const role = translateGeneratedSoccerPhraseToZh(articleWhoMatch[1]);
    const detail = translateGeneratedSoccerPhraseToZh(articleWhoMatch[2]);
    return role && detail ? `一名${role}，能够${detail}。` : "";
  }

  const articleWhoseMatch = text.match(/^(?:A|An|The) (.+?) whose (.+)\.$/);
  if (articleWhoseMatch) {
    const role = translateGeneratedSoccerPhraseToZh(articleWhoseMatch[1]);
    const detail = translateGeneratedSoccerPhraseToZh(articleWhoseMatch[2]);
    return role && detail ? `一名${role}，其${detail}。` : "";
  }

  const articleCommaMatch = text.match(/^(?:A|An|The) (.+?), (.+)\.$/);
  if (articleCommaMatch) {
    const role = translateGeneratedSoccerPhraseToZh(articleCommaMatch[1]);
    const detail = translateGeneratedSoccerPhraseToZh(articleCommaMatch[2]);
    return role && detail ? `${role}，${detail}。` : "";
  }

  return "";
}

function translateGeneratedLongFormTextToZh(value) {
  const text = String(value || "").trim();
  if (!text || !/[A-Za-z]/.test(text)) {
    return "";
  }

  return (
    translateHistoricalKeyInformationToZh(text) ||
    translateCurrentMatchPreviewToZh(text) ||
    translatePlayerNoteToZh(text)
  );
}

function normalizeLatinNameForTransliteration(value) {
  const specialLetters = {
    Æ: "Ae",
    æ: "ae",
    Œ: "Oe",
    œ: "oe",
    Ø: "O",
    ø: "o",
    Ł: "L",
    ł: "l",
    Đ: "D",
    đ: "d",
    Ð: "D",
    ð: "d",
    Þ: "Th",
    þ: "th",
    ß: "ss"
  };

  return String(value ?? "")
    .replace(/[ÆæŒœØøŁłĐđÐðÞþß]/g, (letter) => specialLetters[letter] || letter)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .toLowerCase();
}

function transliterateLatinNamePartToZh(value) {
  const part = String(value ?? "").trim();

  if (!part) {
    return "";
  }

  const exact =
    ZH_HISTORICAL_SCORER_TRANSLATIONS[part] ||
    ZH_PLAYER_NAME_TRANSLATIONS[part] ||
    ZH_EXACT_TRANSLATIONS.get(part);

  if (exact) {
    return exact;
  }

  if (/^jr\.?$/i.test(part)) {
    return "儒尼奥尔";
  }

  const initial = part.match(/^([A-Za-z])\.$/);
  if (initial) {
    return ZH_NAME_INITIAL_TRANSLITERATIONS[initial[1].toUpperCase()] || "";
  }

  if (part.includes("-")) {
    return part
      .split("-")
      .map(transliterateLatinNamePartToZh)
      .filter(Boolean)
      .join("-");
  }

  if (/[’']/.test(part)) {
    return part
      .split(/[’']/)
      .map(transliterateLatinNamePartToZh)
      .filter(Boolean)
      .join("");
  }

  const normalized = normalizeLatinNameForTransliteration(part);

  if (!normalized) {
    return "";
  }

  let output = "";
  let index = 0;

  while (index < normalized.length) {
    const chunk = ZH_LATIN_NAME_CHUNKS.find(([source]) => normalized.startsWith(source, index));

    if (chunk) {
      output += chunk[1];
      index += chunk[0].length;
      continue;
    }

    output += ZH_LATIN_NAME_LETTERS[normalized[index]] || "";
    index += 1;
  }

  return output;
}

function transliterateHistoricalScorerName(value) {
  const compactName = String(value ?? "").trim().replace(/\s+/g, " ");

  if (!compactName) {
    return "";
  }

  const exact =
    ZH_HISTORICAL_SCORER_TRANSLATIONS[compactName] ||
    ZH_PLAYER_NAME_TRANSLATIONS[compactName] ||
    ZH_EXACT_TRANSLATIONS.get(compactName);

  if (exact) {
    return exact;
  }

  const knownName = localizeKnownPlayerNames(compactName);
  if (knownName !== compactName && !/[A-Za-z]/.test(knownName)) {
    return knownName;
  }

  const parts = compactName
    .replace(/[,()]/g, " ")
    .split(/\s+/)
    .map(transliterateLatinNamePartToZh)
    .filter(Boolean);

  return parts.length ? parts.join("·") : compactName;
}

function localizeHistoricalScorerName(value) {
  return currentLanguage === "zh" ? transliterateHistoricalScorerName(value) : String(value ?? "");
}

function localizeHistoricalVenuePart(value) {
  const part = String(value ?? "").trim();

  if (!part) {
    return "";
  }

  if (Object.prototype.hasOwnProperty.call(ZH_HISTORICAL_VENUE_TERMS, part)) {
    return ZH_HISTORICAL_VENUE_TERMS[part];
  }

  const exact = ZH_HISTORICAL_VENUE_TRANSLATIONS[part] || ZH_EXACT_TRANSLATIONS.get(part);

  if (exact !== undefined) {
    return exact;
  }

  if (part.includes("-")) {
    return part
      .split("-")
      .map(localizeHistoricalVenuePart)
      .filter(Boolean)
      .join("-");
  }

  if (/[’']/.test(part)) {
    return part
      .split(/[’']/)
      .map(localizeHistoricalVenuePart)
      .filter(Boolean)
      .join("");
  }

  return transliterateLatinNamePartToZh(part);
}

function localizeHistoricalVenueText(value) {
  const compactText = String(value ?? "").trim().replace(/\s+/g, " ");

  if (!compactText) {
    return "";
  }

  const exact = ZH_HISTORICAL_VENUE_TRANSLATIONS[compactText] || translateTextToZh(compactText);
  if (exact && exact !== compactText) {
    return exact;
  }

  return compactText
    .split(",")
    .map((segment) =>
      segment
        .trim()
        .split(/\s+/)
        .map(localizeHistoricalVenuePart)
        .filter(Boolean)
        .join("")
    )
    .filter(Boolean)
    .join("，");
}

function localizeKnownDisplayEntities(value) {
  return [
    ZH_PLAYER_NAME_TRANSLATIONS,
    ZH_CLUB_NAME_TRANSLATIONS,
    ZH_LEAGUE_NAME_TRANSLATIONS,
    ZH_SOURCE_LABEL_TRANSLATIONS,
    ZH_HISTORICAL_SCORER_TRANSLATIONS
  ].reduce(
    (output, translationMap) => replaceKnownLocalizedEntities(output, translationMap),
    String(value ?? "")
  );
}

function localizeDisplayText(value) {
  return currentLanguage === "zh" ? localizeKnownDisplayEntities(localizeText(value)) : localizeText(value);
}

function localizeMultilineText(value) {
  return String(value ?? "")
    .split("\n")
    .map((line) => localizeText(line))
    .join("\n");
}

function getLocalizedTeamName(teamOrName) {
  const name = typeof teamOrName === "string" ? teamOrName : teamOrName?.name || "";
  return localizeText(name);
}

function getLocalizedStandingName(team) {
  return localizeText(team ? getStandingName(team) : "");
}

let pendingLanguage = "";
let languageSwitchRequestId = 0;

function renderLanguageControls() {
  languageSwitch?.setAttribute("aria-label", t("language"));
  languageSwitch?.classList.toggle("is-pending", Boolean(pendingLanguage));
  languageSwitch?.setAttribute("aria-busy", String(Boolean(pendingLanguage)));
  languageButtons.forEach((button) => {
    const language = normalizeLanguage(button.dataset.language);
    const isSelected = language === currentLanguage;
    const isPending = language === pendingLanguage;
    const isSwitching = Boolean(pendingLanguage);
    const label = language === "zh" ? t("languageChinese") : t("languageEnglish");
    button.classList.toggle("is-active", isSelected);
    button.classList.toggle("is-pending", isPending);
    button.disabled = isSwitching;
    button.setAttribute("aria-pressed", String(isSelected));
    button.setAttribute("aria-busy", String(isPending));
    button.textContent = language === "zh" ? "中文" : "English";
    button.setAttribute("aria-label", isPending ? `${label}: ${t("languageSwitching")}` : label);
  });
}

function setPendingLanguage(language) {
  pendingLanguage = normalizeLanguage(language) || "";
  renderLanguageControls();
}

function waitForLanguageSpinnerPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.setTimeout(resolve, 0));
  });
}

function waitForLanguagePendingMinimum(startedAt) {
  const elapsed = performance.now() - startedAt;
  const remaining = Math.max(0, LANGUAGE_SWITCH_PENDING_MIN_MS - elapsed);
  return new Promise((resolve) => window.setTimeout(resolve, remaining));
}

function renderStaticText() {
  document.documentElement.lang = currentLanguage === "zh" ? "zh-Hans" : "en";
  document.title = t("appName");
  brandHomeLink?.setAttribute("aria-label", t("appHomeLabel"));
  if (brandLabel) {
    brandLabel.textContent = t("appName");
  }
  if (adminMessageLabel) {
    adminMessageLabel.textContent = t("adminMessageLabel");
  }
  renderJuggleRecord();
  juggleToy.element?.setAttribute("title", t("juggleBall"));

  settingsButton?.setAttribute("aria-label", t("settings"));
  settingsButton?.setAttribute("title", t("settings"));
  settingsPopover?.setAttribute("aria-label", t("settings"));
  if (settingsLanguageLabel) {
    settingsLanguageLabel.textContent = t("language");
  }
  renderLanguageControls();

  const matchesTab = document.querySelector("#matches-tab");
  const standingsTab = document.querySelector("#standings-tab");
  if (matchesTab) {
    matchesTab.textContent = t("matches");
  }
  if (standingsTab) {
    standingsTab.textContent = t("standings");
  }

  document.querySelector(".view-tabs")?.setAttribute("aria-label", t("worldCupViews"));
  catchUpButton?.setAttribute("aria-label", t("catchUp"));
  catchUpButton?.setAttribute("title", t("catchUp"));
  catchUpPopover?.setAttribute("aria-label", t("catchUpDialog"));
  if (timezoneLabel) {
    timezoneLabel.textContent = t("timeZone");
  }
  if (settingsYesterdayLabel) {
    settingsYesterdayLabel.textContent = t("showYesterday");
  }
  if (showYesterdayToggle) {
    showYesterdayToggle.checked = shouldShowYesterdayMatches;
    showYesterdayToggle.setAttribute("aria-label", t("showYesterday"));
  }
  document.querySelector(".team-search-toggle")?.setAttribute("aria-label", t("countrySearch"));
  document.querySelector("label[for='team-search-input']").textContent = t("countrySearch");
  teamSearchInput?.setAttribute("placeholder", t("searchCountryPlaceholder"));
  teamSearchClear?.setAttribute("aria-label", t("clearCountrySearch"));
  datePopover?.setAttribute("aria-label", t("chooseMatchDate"));
  calendarPrevMonth?.setAttribute("aria-label", t("calendarPreviousMonth"));
  calendarNextMonth?.setAttribute("aria-label", t("calendarNextMonth"));
  calendarYesterdayButton.textContent = t("calendarYesterday");
  calendarTodayButton.textContent = t("calendarToday");
  calendarWeekdayLabels.forEach((label, index) => {
    label.textContent = t("calendarWeekdays")[index] || label.textContent;
  });
  viewPanels.matches?.querySelector(".match-layout")?.setAttribute("aria-label", t("matchesHeading"));
  matchList?.setAttribute("aria-label", t("matchesList"));
  standingsHeading?.setAttribute("aria-label", String(selectedStandingsYear));
  standingsYearPopover?.setAttribute("aria-label", t("chooseStandingsYear"));
  standingsModeTabsShell?.setAttribute("aria-label", t("standingsSections"));
  document.querySelector("#standings-groups-tab").textContent = t("groups");
  document.querySelector("#standings-third-place-tab").textContent = t("thirdPlaceRace");
  document.querySelector("#standings-tournament-tab").textContent = t("tournament");
  renderAdminMessage();
  queueTabIndicatorUpdate();
}

function shouldLocalizeTextNode(node) {
  const parent = node.parentElement;
  return Boolean(
    parent &&
      node.nodeValue.trim() &&
      !parent.closest("script, style, svg, input, textarea, select, #catch-up-list")
  );
}

function localizeRenderedText(root = document.body) {
  if (currentLanguage !== "zh" || !root) {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return shouldLocalizeTextNode(node)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }
  });
  const textNodes = [];
  let node = walker.nextNode();

  while (node) {
    textNodes.push(node);
    node = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const nextText = translateTextToZh(textNode.nodeValue);
    if (nextText !== textNode.nodeValue) {
      textNode.nodeValue = nextText;
    }
  });

  root
    .querySelectorAll("[aria-label], [title], [placeholder], [data-tooltip]")
    .forEach((element) => {
      if (element.closest("#catch-up-list")) {
        return;
      }

      for (const attribute of ["aria-label", "title", "placeholder", "data-tooltip"]) {
        if (!element.hasAttribute(attribute)) {
          continue;
        }

        const value = element.getAttribute(attribute);
        const nextValue = translateTextToZh(value);
        if (nextValue !== value) {
          element.setAttribute(attribute, nextValue);
        }
      }
    });
}

let isApplyingLanguage = false;

function applyLanguageToPage() {
  isApplyingLanguage = true;
  try {
    renderStaticText();
    localizeRenderedText(document.body);
  } finally {
    isApplyingLanguage = false;
  }
}

function readStoredJuggleRecord() {
  const savedRecord = Number(localStorage.getItem(JUGGLE_RECORD_STORAGE_KEY));
  return Number.isFinite(savedRecord) && savedRecord > 0 ? Math.floor(savedRecord) : 0;
}

function storeJuggleRecord(record) {
  try {
    localStorage.setItem(JUGGLE_RECORD_STORAGE_KEY, String(record));
  } catch (error) {
    console.warn("Unable to store juggling record", error);
  }
}

function persistPendingJuggleRecord() {
  if (!juggleToy.hasPendingBestSave) {
    return;
  }

  storeJuggleRecord(juggleToy.best);
  juggleToy.hasPendingBestSave = false;
}

function renderJuggleRecord() {
  if (!juggleRecord) {
    return;
  }

  const isActive = isJuggleRunActive();
  const label = isActive ? t("juggleCurrent") : t("juggleRecord");
  const action = t("juggleRecordAction");
  const value = isActive ? juggleToy.count : juggleToy.best;
  const title = isActive ? `${label}: ${value}` : `${label}: ${value}. ${action}`;
  juggleRecord.hidden = false;
  juggleRecord.textContent = `(${value})`;
  juggleRecord.disabled = !canLaunchJuggleBall();
  juggleRecord.setAttribute("aria-label", title);
  juggleRecord.setAttribute("title", title);
}

function getRandomNumber(min, max) {
  return min + Math.random() * (max - min);
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function prefersReducedJuggleMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

function getJuggleBallSize() {
  return clampNumber(Math.round(window.innerWidth * 0.085), 32, 42);
}

function canLaunchJuggleBall() {
  return Boolean(
    juggleToy.element &&
      juggleToy.phase === "idle" &&
      !prefersReducedJuggleMotion() &&
      !document.hidden
  );
}

function isJuggleRunActive() {
  return Boolean(juggleToy.element && juggleToy.phase !== "idle");
}

function getJuggleDifficultyLevel(count = juggleToy.count) {
  return clampNumber(
    Math.floor(count / JUGGLE_DIFFICULTY_STEP),
    0,
    JUGGLE_MAX_DIFFICULTY_LEVEL
  );
}

function getJuggleGravity() {
  return JUGGLE_GRAVITY * (1 + juggleToy.difficultyLevel * JUGGLE_GRAVITY_LEVEL_MULTIPLIER);
}

function getJuggleKickMultiplier() {
  return 1 + juggleToy.difficultyLevel * JUGGLE_KICK_LEVEL_MULTIPLIER;
}

function getJuggleLateralMultiplier() {
  return 1 + juggleToy.difficultyLevel * JUGGLE_LATERAL_LEVEL_MULTIPLIER;
}

function getJuggleWallBounceMultiplier() {
  return (
    JUGGLE_WALL_BOUNCE_BASE_MULTIPLIER +
    juggleToy.difficultyLevel * JUGGLE_WALL_BOUNCE_LEVEL_MULTIPLIER
  );
}

function getJuggleFloorY() {
  return Math.max(0, window.innerHeight - juggleToy.size);
}

function getJuggleHitRadius(event) {
  const pointerType = String(event.pointerType || "").toLowerCase();
  const multiplier =
    pointerType === "touch" || pointerType === "pen"
      ? JUGGLE_TOUCH_HIT_RADIUS_MULTIPLIER
      : JUGGLE_POINTER_HIT_RADIUS_MULTIPLIER;

  return juggleToy.size * multiplier;
}

function getJuggleBallCenter(position) {
  return {
    x: position.x + juggleToy.size / 2,
    y: position.y + juggleToy.size / 2
  };
}

function getDistanceToLineSegment(point, start, end) {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (!segmentLengthSquared) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const progress = clampNumber(
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / segmentLengthSquared,
    0,
    1
  );
  const closestX = start.x + segmentX * progress;
  const closestY = start.y + segmentY * progress;

  return Math.hypot(point.x - closestX, point.y - closestY);
}

function getFallingJuggleBallPosition(frameTime) {
  const elapsedSeconds = (frameTime - juggleToy.startTime) / 1000;
  const progress = clampNumber(elapsedSeconds / juggleToy.fallDuration, 0, 1);
  const linearX = juggleToy.startX + (juggleToy.targetX - juggleToy.startX) * progress;
  const x = clampNumber(
    linearX + Math.sin(progress * Math.PI) * juggleToy.curve,
    0,
    Math.max(0, window.innerWidth - juggleToy.size)
  );

  return {
    x,
    y: juggleToy.startY + juggleToy.fallDistance * progress
  };
}

function getProjectedJuggleBallPosition() {
  if (juggleToy.phase === "falling") {
    const position = getFallingJuggleBallPosition(
      performance.now() + JUGGLE_HIT_LEAD_SECONDS * 1000
    );

    return {
      x: position.x,
      y: Math.min(position.y, getJuggleFloorY())
    };
  }

  const leadSeconds = JUGGLE_HIT_LEAD_SECONDS;
  const projectedX = juggleToy.x + juggleToy.vx * leadSeconds;
  const projectedY =
    juggleToy.y +
    juggleToy.vy * leadSeconds +
    0.5 * getJuggleGravity() * leadSeconds * leadSeconds;

  return {
    x: clampNumber(projectedX, 0, Math.max(0, window.innerWidth - juggleToy.size)),
    y: Math.min(projectedY, getJuggleFloorY())
  };
}

function getJuggleHitDistance(pointerX, pointerY) {
  const pointer = { x: pointerX, y: pointerY };
  const previousCenter = getJuggleBallCenter({
    x: juggleToy.previousX,
    y: juggleToy.previousY
  });
  const currentCenter = getJuggleBallCenter({
    x: juggleToy.x,
    y: juggleToy.y
  });
  const projectedCenter = getJuggleBallCenter(getProjectedJuggleBallPosition());

  return Math.min(
    getDistanceToLineSegment(pointer, previousCenter, currentCenter),
    getDistanceToLineSegment(pointer, currentCenter, projectedCenter)
  );
}

function handleJuggleRecordClick() {
  spawnJuggleBall();
}

function initializeJuggleToy() {
  renderJuggleRecord();
  juggleRecord?.addEventListener("click", handleJuggleRecordClick);

  if (prefersReducedJuggleMotion()) {
    return;
  }

  const ball = document.createElement("div");
  ball.className = "juggle-ball";
  ball.textContent = JUGGLE_BALL_EMOJI;
  ball.setAttribute("aria-hidden", "true");
  ball.setAttribute("title", t("juggleBall"));
  document.body.append(ball);
  juggleToy.element = ball;

  const shadow = document.createElement("div");
  shadow.className = "juggle-ball-shadow";
  shadow.setAttribute("aria-hidden", "true");
  document.body.append(shadow);
  juggleToy.shadowElement = shadow;

  document.addEventListener("pointerdown", handleJugglePointerDown, {
    capture: true
  });
  document.addEventListener("click", handleJugglePageClick, {
    capture: true
  });
  ["pointerenter", "pointerover", "mouseenter", "mouseover"].forEach((eventName) => {
    document.addEventListener(eventName, handleJuggleHoverEvent, {
      capture: true
    });
  });
  document.addEventListener("visibilitychange", handleJuggleVisibilityChange);
  window.addEventListener("pagehide", persistPendingJuggleRecord);
  renderJuggleRecord();
}

function handleJuggleVisibilityChange() {
  if (document.hidden) {
    finishJuggleRun();
    return;
  }

  renderJuggleRecord();
}

function spawnJuggleBall() {
  if (!canLaunchJuggleBall()) {
    return false;
  }

  window.cancelAnimationFrame(juggleToy.animationFrameId);
  primeJuggleAudioContext();

  const width = window.innerWidth;
  const height = window.innerHeight;
  const size = getJuggleBallSize();
  const startX = getRandomNumber(8, Math.max(8, width - size - 8));
  const targetX = getRandomNumber(8, Math.max(8, width - size - 8));
  const startY = -size - getRandomNumber(8, 72);
  const fallDistance = height + size - startY;
  const fallDuration = fallDistance / JUGGLE_FALL_SPEED;

  juggleToy.count = 0;
  juggleToy.curve = getRandomNumber(-Math.min(140, width * 0.28), Math.min(140, width * 0.28));
  juggleToy.difficultyLevel = 0;
  juggleToy.fallDistance = fallDistance;
  juggleToy.fallDuration = fallDuration;
  juggleToy.lastFrameTime = 0;
  juggleToy.phase = "falling";
  juggleToy.previousX = startX;
  juggleToy.previousY = startY;
  juggleToy.rotation = getRandomNumber(-24, 24);
  juggleToy.rotationSpeed = getRandomNumber(-220, 220);
  juggleToy.size = size;
  juggleToy.startTime = performance.now();
  juggleToy.startX = startX;
  juggleToy.startY = startY;
  juggleToy.targetX = targetX;
  juggleToy.vx = (targetX - startX) / fallDuration;
  juggleToy.vy = JUGGLE_FALL_SPEED;
  juggleToy.x = startX;
  juggleToy.y = startY;

  juggleToy.element.style.setProperty("--juggle-ball-size", `${size}px`);
  juggleToy.shadowElement?.style.setProperty("--juggle-ball-size", `${size}px`);
  juggleToy.element.classList.add("is-active");
  juggleToy.shadowElement?.classList.add("is-active");
  document.body.classList.add("is-juggle-active");
  renderJuggleBall();
  renderJuggleRecord();
  juggleToy.animationFrameId = window.requestAnimationFrame(updateJuggleBall);
  return true;
}

function updateJuggleBall(frameTime) {
  if (!juggleToy.element || juggleToy.phase === "idle") {
    return;
  }

  const previousFrameTime = juggleToy.lastFrameTime || frameTime;
  const deltaSeconds = clampNumber(
    (frameTime - previousFrameTime) / 1000,
    0,
    JUGGLE_MAX_FRAME_SECONDS
  );
  juggleToy.lastFrameTime = frameTime;
  juggleToy.previousX = juggleToy.x;
  juggleToy.previousY = juggleToy.y;

  if (juggleToy.phase === "falling") {
    updateFallingJuggleBall(frameTime);
  } else {
    updateKickedJuggleBall(deltaSeconds);
  }

  const floorY = getJuggleFloorY();
  if (juggleToy.y >= floorY) {
    finishJuggleRun();
    return;
  }

  juggleToy.rotation += juggleToy.rotationSpeed * deltaSeconds;
  renderJuggleBall();

  juggleToy.animationFrameId = window.requestAnimationFrame(updateJuggleBall);
}

function updateFallingJuggleBall(frameTime) {
  const position = getFallingJuggleBallPosition(frameTime);
  juggleToy.x = position.x;
  juggleToy.y = position.y;
}

function updateKickedJuggleBall(deltaSeconds) {
  juggleToy.vy += getJuggleGravity() * deltaSeconds;
  juggleToy.x += juggleToy.vx * deltaSeconds;
  juggleToy.y += juggleToy.vy * deltaSeconds;

  if (juggleToy.x < 0) {
    juggleToy.x = 0;
    applyJuggleWallBounce(1);
  } else if (juggleToy.x > window.innerWidth - juggleToy.size) {
    juggleToy.x = Math.max(0, window.innerWidth - juggleToy.size);
    applyJuggleWallBounce(-1);
  }
}

function applyJuggleWallBounce(direction) {
  const lateralMultiplier = getJuggleLateralMultiplier();
  const wallDrift =
    (JUGGLE_WALL_BOUNCE_DRIFT +
      juggleToy.difficultyLevel * JUGGLE_WALL_BOUNCE_LEVEL_DRIFT) *
    lateralMultiplier;
  const bounceSpeed =
    Math.abs(juggleToy.vx) * getJuggleWallBounceMultiplier() +
    getRandomNumber(-wallDrift * 0.35, wallDrift);
  const maxLateralSpeed = 520 * lateralMultiplier;
  const wallSpin =
    JUGGLE_WALL_BOUNCE_SPIN +
    juggleToy.difficultyLevel * JUGGLE_WALL_BOUNCE_LEVEL_SPIN;
  const maxRotationSpeed = 620 * lateralMultiplier;

  juggleToy.vx =
    direction * clampNumber(bounceSpeed, wallDrift * 0.35, maxLateralSpeed);
  juggleToy.vy +=
    JUGGLE_WALL_BOUNCE_DROP_SPEED +
    juggleToy.difficultyLevel * JUGGLE_WALL_BOUNCE_LEVEL_DROP_SPEED;
  juggleToy.rotationSpeed = clampNumber(
    juggleToy.rotationSpeed +
      direction * getRandomNumber(wallSpin * 0.55, wallSpin),
    -maxRotationSpeed,
    maxRotationSpeed
  );
}

function renderJuggleBall() {
  if (!juggleToy.element) {
    return;
  }

  juggleToy.element.style.transform = `translate3d(${juggleToy.x}px, ${juggleToy.y}px, 0) rotate(${juggleToy.rotation}deg)`;

  if (!juggleToy.shadowElement) {
    return;
  }

  const distanceFromBottom = Math.max(0, window.innerHeight - (juggleToy.y + juggleToy.size));
  const liftRatio = clampNumber(distanceFromBottom / Math.max(220, window.innerHeight * 0.32), 0, 1);
  const shadowScale = 1 - liftRatio * 0.28;
  const shadowOpacity = 0.2 - liftRatio * 0.07;
  const shadowX = juggleToy.x + juggleToy.size * 0.12;
  const shadowY = Math.min(
    window.innerHeight - juggleToy.size * 0.14,
    juggleToy.y + juggleToy.size * 0.86
  );

  juggleToy.shadowElement.style.setProperty("--juggle-ball-shadow-opacity", shadowOpacity.toFixed(3));
  juggleToy.shadowElement.style.transform = `translate3d(${shadowX}px, ${shadowY}px, 0) scale(${shadowScale.toFixed(3)})`;
}

function getJuggleAudioContext() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    return null;
  }

  if (!juggleToy.audioContext) {
    juggleToy.audioContext = new AudioContextConstructor();
  }

  return juggleToy.audioContext;
}

function primeJuggleAudioContext() {
  const audioContext = getJuggleAudioContext();
  if (!audioContext || audioContext.state !== "suspended") {
    return;
  }

  void audioContext.resume().catch(() => {});
}

function playJuggleTapSound() {
  const audioContext = getJuggleAudioContext();
  if (!audioContext) {
    return;
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => {});
  }

  const startTime = audioContext.currentTime;
  const endTime = startTime + JUGGLE_SOUND_DURATION_SECONDS;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(185, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(92, endTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(endTime);
}

function handleJugglePointerDown(event) {
  if (!isJuggleRunActive()) {
    return;
  }

  juggleToy.blockPageClickUntil = performance.now() + JUGGLE_CLICK_BLOCK_MS;
  blockJugglePageEvent(event);

  const hitRadius = getJuggleHitRadius(event);
  const distance = getJuggleHitDistance(event.clientX, event.clientY);

  if (distance > hitRadius) {
    return;
  }

  kickJuggleBall(event.clientX, event.clientY);
}

function handleJugglePageClick(event) {
  if (isJuggleRunActive() || performance.now() < juggleToy.blockPageClickUntil) {
    blockJugglePageEvent(event);
  }
}

function handleJuggleHoverEvent(event) {
  if (isJuggleRunActive()) {
    blockJugglePageEvent(event);
  }
}

function blockJugglePageEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function kickJuggleBall(pointerX, pointerY) {
  const centerX = juggleToy.x + juggleToy.size / 2;
  const centerY = juggleToy.y + juggleToy.size / 2;
  const horizontalOffset = clampNumber((pointerX - centerX) / (juggleToy.size / 2), -1, 1);
  const verticalOffset = clampNumber((pointerY - centerY) / (juggleToy.size / 2), -1, 1);

  juggleToy.phase = "juggling";
  juggleToy.count += 1;
  juggleToy.difficultyLevel = getJuggleDifficultyLevel();
  juggleToy.previousX = juggleToy.x;
  juggleToy.previousY = juggleToy.y;

  const kickMultiplier = getJuggleKickMultiplier();
  const lateralMultiplier = getJuggleLateralMultiplier();
  const lateralKick = -horizontalOffset * 380 * lateralMultiplier;
  const maxLateralSpeed = 480 * lateralMultiplier;
  const maxRotationSpeed = 520 * lateralMultiplier;
  const kickSpeed = clampNumber(555 + Math.max(0, verticalOffset) * 125, 535, 700);

  juggleToy.vx = clampNumber(
    juggleToy.vx * 0.36 + lateralKick,
    -maxLateralSpeed,
    maxLateralSpeed
  );
  juggleToy.vy = -(kickSpeed * kickMultiplier);
  juggleToy.rotationSpeed = clampNumber(
    juggleToy.rotationSpeed - horizontalOffset * 260 * lateralMultiplier,
    -maxRotationSpeed,
    maxRotationSpeed
  );
  playJuggleTapSound();

  if (juggleToy.count > juggleToy.best) {
    juggleToy.best = juggleToy.count;
    juggleToy.hasPendingBestSave = true;
  }

  renderJuggleRecord();
}

function finishJuggleRun() {
  if (!juggleToy.element || juggleToy.phase === "idle") {
    return;
  }

  window.cancelAnimationFrame(juggleToy.animationFrameId);
  persistPendingJuggleRecord();
  juggleToy.phase = "idle";
  juggleToy.element.classList.remove("is-active");
  juggleToy.shadowElement?.classList.remove("is-active");
  document.body.classList.remove("is-juggle-active");
  renderJuggleRecord();
}

function normalizeTextKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function buildPlayerProfileLookup(profiles = {}) {
  const lookup = new Map();

  for (const [name, profile] of Object.entries(profiles || {})) {
    const entry = { name, ...profile };
    for (const alias of getPlayerProfileAliases(name, profile)) {
      const key = normalizeTextKey(alias);
      if (key && !lookup.has(key)) {
        lookup.set(key, entry);
      }
    }
  }

  return lookup;
}

function getPlayerProfileAliases(name, profile = {}) {
  return [
    name,
    profile?.name,
    profile?.displayName,
    ...(Array.isArray(profile?.aliases) ? profile.aliases : [])
  ];
}

function buildTeamPlayerProfileLookup(profiles = {}) {
  const lookup = new Map();

  for (const [name, profile] of Object.entries(profiles || {})) {
    const teamId = String(profile?.teamId || "").trim().toUpperCase();
    if (!teamId) {
      continue;
    }

    const entry = { name, ...profile };
    for (const alias of getPlayerProfileAliases(name, profile)) {
      const key = normalizeTextKey(alias);
      if (key) {
        lookup.set(`${teamId}:${key}`, entry);
      }
    }
  }

  return lookup;
}

function normalizeHistoricalTeamKey(value) {
  return normalizeTextKey(value);
}

function getHistoricalProfileVersionKey(name, teamName, tournamentYear) {
  const nameKey = normalizeTextKey(name);
  const teamKey = normalizeHistoricalTeamKey(teamName);
  const year = Number(tournamentYear);

  return nameKey && teamKey && Number.isInteger(year) && year > 0 ? `${year}:${teamKey}:${nameKey}` : "";
}

function getHistoricalProfileTeamCandidates(player) {
  return [
    player?.historicalTeamName,
    player?.teamName,
    player?.team?.name,
    player?.team?.officialName,
    ...(Array.isArray(player?.teams) ? player.teams : [])
  ].filter((teamName) => typeof teamName === "string" && teamName.trim());
}

function buildHistoricalPlayerProfileLookups(profiles = {}) {
  const byName = new Map();
  const byVersion = new Map();

  for (const [profileKey, profile] of Object.entries(profiles || {})) {
    const entry = { profileKey, ...profile };
    const aliases = getPlayerProfileAliases(profile?.name || profileKey, profile);
    const teamCandidates = [
      profile?.teamName,
      ...(Array.isArray(profile?.teams) ? profile.teams : [])
    ].filter((teamName) => typeof teamName === "string" && teamName.trim());
    const yearCandidates = [
      profile?.tournamentYear,
      ...(Array.isArray(profile?.tournamentYears) ? profile.tournamentYears : [])
    ]
      .map(Number)
      .filter((year) => Number.isInteger(year) && year > 0);

    for (const alias of aliases) {
      const nameKey = normalizeTextKey(alias);
      if (nameKey && !byName.has(nameKey)) {
        byName.set(nameKey, entry);
      }

      for (const teamName of teamCandidates) {
        for (const year of yearCandidates) {
          const versionKey = getHistoricalProfileVersionKey(alias, teamName, year);
          if (versionKey && !byVersion.has(versionKey)) {
            byVersion.set(versionKey, entry);
          }
        }
      }
    }
  }

  return { byName, byVersion };
}

function hasChineseCharacter(value) {
  return /[\u3400-\u9fff\uf900-\ufaff]/u.test(String(value || ""));
}

const historicalTeamCountryCodesByName = new Map(
  Object.entries(HISTORICAL_TEAM_COUNTRY_CODES).map(([name, countryCode]) => [
    normalizeTextKey(name),
    countryCode
  ])
);
const historicalTeamFlagOverridesByName = new Map(
  Object.entries(HISTORICAL_TEAM_FLAG_OVERRIDES).map(([name, metadata]) => [
    normalizeTextKey(name),
    metadata
  ])
);

function countryCodeToFlag(countryCode) {
  const code = String(countryCode || "").trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(code)) {
    return "";
  }

  return String.fromCodePoint(...[...code].map((char) => char.charCodeAt(0) + 127397));
}

function buildTeamNameLookup(teams = []) {
  const lookup = new Map();

  for (const team of teams) {
    for (const name of [team.id, team.name, team.officialName, team.standingName]) {
      const key = normalizeTextKey(name);

      if (key && !lookup.has(key)) {
        lookup.set(key, team);
      }
    }
  }

  return lookup;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.max(0, Math.min(100, number));
}

async function loadJson(url, options = {}) {
  const { timeoutMs = 0 } = options;
  const controller =
    timeoutMs > 0 && typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? window.setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller?.signal
    });

    if (!response.ok) {
      throw new Error(`Unable to load ${url}`);
    }

    return await response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Timed out loading ${url}`);
    }

    throw error;
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function loadOptionalJson(url, fallback, options = {}) {
  try {
    return await loadJson(url, options);
  } catch (error) {
    console.warn(`Optional data unavailable: ${url}`, error);
    return fallback;
  }
}

function getDayKey(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getDateFromKey(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function getDayKeyFromDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRelativeDayKey(dayKey, offsetDays) {
  const date = getDateFromKey(dayKey);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return getDayKeyFromDate(date);
}

function getMonthKeyFromDayKey(dayKey) {
  return dayKey.slice(0, 7);
}

function getDateFromMonthKey(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1, 12));
}

function isDayKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

function isReloadNavigation() {
  const [navigationEntry] = performance.getEntriesByType?.("navigation") || [];

  if (navigationEntry?.type) {
    return navigationEntry.type === "reload";
  }

  if (performance.navigation) {
    return performance.navigation.type === performance.navigation.TYPE_RELOAD;
  }

  return false;
}

function getTimeFormatter() {
  return new Intl.DateTimeFormat(getAppLocale(), {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    timeZone: selectedTimeZone
  });
}

function getValidTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getLatestUpdatedAt(items) {
  const latestTimestamp = items.reduce((latest, item) => {
    const timestamp = getValidTimestamp(item?.updatedAt);
    return timestamp === null || timestamp <= latest ? latest : timestamp;
  }, 0);

  return latestTimestamp ? new Date(latestTimestamp).toISOString() : "";
}

function formatSiteUpdatedAt(value) {
  const timestamp = getValidTimestamp(value);

  if (timestamp === null) {
    return "";
  }

  return new Intl.DateTimeFormat(getAppLocale(), {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: selectedTimeZone,
    timeZoneName: "short",
    year: "numeric"
  }).format(new Date(timestamp));
}

function getTimeZoneAbbreviation(timeZone, date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short"
  });
  return (
    formatter
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value || timeZone
  );
}

function getTimeZoneLabel(timeZone) {
  const label =
    currentLanguage === "zh"
      ? zhTimeZoneNames[timeZone] || timeZone.replace(/_/g, " ")
      : timeZone.replace(/_/g, " ");
  return `${label} (${getTimeZoneAbbreviation(timeZone)})`;
}

function getEstimatedTimeZoneLabelWidth(label) {
  return Array.from(label).reduce((width, character) => {
    if (CJK_CHARACTER_PATTERN.test(character)) {
      return width + 2;
    }

    if (
      character === " " ||
      character === "/" ||
      character === "_" ||
      character === "(" ||
      character === ")"
    ) {
      return width + 0.55;
    }

    return width + 0.72;
  }, 0);
}

function updateTimeZoneControlWidth() {
  const selectedLabel = timezoneSelect?.selectedOptions?.[0]?.textContent.trim() || "";
  const estimatedWidth = getEstimatedTimeZoneLabelWidth(selectedLabel);
  const labelWidth = Math.max(3.5, Math.ceil((estimatedWidth + 0.75) * 4) / 4);
  timezoneControl?.style.setProperty("--timezone-label-width", `${labelWidth}ch`);
}

function getGroup(groupId) {
  return tournament.groups.find((group) => group.id === groupId);
}

function getAvailableStandingsYears() {
  const years = new Set([CURRENT_STANDINGS_YEAR]);

  for (const item of history.tournaments || []) {
    if (Number.isInteger(item.year)) {
      years.add(item.year);
    }
  }

  for (const fixture of historicalFixtures) {
    if (Number.isInteger(fixture.tournamentYear)) {
      years.add(fixture.tournamentYear);
    }
  }

  return [...years].sort((a, b) => b - a);
}

function getValidStandingsYear(value) {
  const year = Number(value);
  const availableYears = getAvailableStandingsYears();

  if (Number.isInteger(year) && availableYears.includes(year)) {
    return year;
  }

  return CURRENT_STANDINGS_YEAR;
}

function getHistoricalFinalGroupStageConfig(year) {
  return HISTORICAL_FINAL_GROUP_STAGE_CONFIGS[Number(year)] || null;
}

function isHistoricalFinalGroupStageFixture(fixture) {
  const config = getHistoricalFinalGroupStageConfig(fixture?.tournamentYear);
  const matchNumber = Number(fixture?.matchNumber);

  return Boolean(
    config &&
      fixture?.group &&
      Number.isFinite(matchNumber) &&
      matchNumber >= config.minMatchNumber &&
      matchNumber <= config.maxMatchNumber
  );
}

function isHistoricalGroupPlayoffRoundLabel(label) {
  return /^Group\s+.+\s+Play-?off$/i.test(String(label || "").trim());
}

function isHistoricalGroupPlayoffFixture(fixture) {
  return isHistoricalGroupPlayoffRoundLabel(fixture?.round);
}

function isHistoricalKnockoutBracketFixture(fixture) {
  return Boolean(fixture && !fixture.group && !isHistoricalGroupPlayoffFixture(fixture));
}

function isHistoricalTournamentViewFixture(fixture) {
  return isHistoricalKnockoutBracketFixture(fixture);
}

function isHistoricalAdvancementFixture(fixture) {
  return isHistoricalFinalGroupStageFixture(fixture) || isHistoricalTournamentViewFixture(fixture);
}

function getHistoricalTournamentStandingsSummary() {
  return HISTORICAL_TOURNAMENT_STANDINGS_SUMMARY;
}

function getHistoricalTournamentFixturesForYear(year) {
  return historicalFixtures
    .filter((fixture) => fixture.tournamentYear === year && isHistoricalTournamentViewFixture(fixture))
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)));
}

function getHistoricalAdvancementFixturesForYear(year) {
  return historicalFixtures
    .filter((fixture) => fixture.tournamentYear === year && isHistoricalAdvancementFixture(fixture))
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)));
}

function hasHistoricalTournamentFixtures(year) {
  return getHistoricalTournamentFixturesForYear(year).length > 0;
}

function getAvailableStandingsModes(year = selectedStandingsYear) {
  if (year === CURRENT_STANDINGS_YEAR) {
    return ["tournament", "groups", "third-place"];
  }

  return hasHistoricalTournamentFixtures(year) ? ["tournament", "groups"] : ["groups"];
}

function getDefaultStandingsModeForYear(year = selectedStandingsYear) {
  if (year === CURRENT_STANDINGS_YEAR) {
    return DEFAULT_CURRENT_STANDINGS_MODE;
  }

  return hasHistoricalTournamentFixtures(year) ? "tournament" : "groups";
}

function getTeam(teamId) {
  return teamsById.get(teamId) || {
    id: teamId,
    name: "TBD",
    officialName: "TBD",
    flag: "",
    fifaRank: null
  };
}

function getHistoricalStyleTags(teamName) {
  const explicitTags = HISTORICAL_STYLE_TAGS_BY_NAME[teamName];
  if (explicitTags) {
    return explicitTags;
  }

  const key = normalizeTextKey(teamName);
  const charTotal = [...key].reduce((total, char) => total + char.charCodeAt(0), 0);
  return HISTORICAL_STYLE_FALLBACKS[charTotal % HISTORICAL_STYLE_FALLBACKS.length];
}

function getHistoricalTeam(teamName) {
  const name = String(teamName || "").trim();
  const key = normalizeTextKey(name);

  if (!key) {
    return null;
  }

  const currentTeam = teamsByName.get(key);
  if (currentTeam) {
    return {
      ...currentTeam,
      fifaRank: null,
      name,
      officialName: name,
      standingName: name
    };
  }

  const override = historicalTeamFlagOverridesByName.get(key) || {};
  const countryCode = historicalTeamCountryCodesByName.get(key);
  const flag = override.flag || countryCodeToFlag(countryCode);
  const flagClass = override.flagClass || "";

  if (!flag && !flagClass) {
    return null;
  }

  return {
    id: `history-${key.replace(/\s+/g, "-")}`,
    name,
    officialName: name,
    standingName: name,
    flag,
    flagClass,
    styleTags: getHistoricalStyleTags(name),
    fifaRank: null
  };
}

function getParticipant(teamId, slot = "TBD") {
  if (teamId) {
    return getTeam(teamId);
  }

  const historicalTeam = getHistoricalTeam(slot);
  if (historicalTeam) {
    return historicalTeam;
  }

  return {
    id: slot,
    name: slot,
    officialName: slot,
    flag: "",
    fifaRank: null,
    isSlot: true
  };
}

function hydrateFixture(fixture) {
  return {
    ...fixture,
    homeTeam: getParticipant(fixture.homeTeamId, fixture.homeSlot),
    awayTeam: getParticipant(fixture.awayTeamId, fixture.awaySlot)
  };
}

function getCalendarFixtures() {
  return [...historicalFixtures, ...fixtures];
}

function getFixtureById(matchId) {
  const id = String(matchId || "").trim();
  return id ? getCalendarFixtures().find((fixture) => fixture.id === id) || null : null;
}

function getFixtureDayKey(fixture) {
  return fixture.date || getDayKey(new Date(fixture.kickoffUtc), selectedTimeZone);
}

function getFixtureSortValue(fixture) {
  if (fixture.sortKey) {
    return fixture.sortKey;
  }

  return fixture.kickoffUtc || `${getFixtureDayKey(fixture)}T12:00:00Z`;
}

function getAvailableDayKeys() {
  return [...new Set(getCalendarFixtures().map(getFixtureDayKey))].sort();
}

function getAvailableMonthKeys() {
  return [...new Set(getAvailableDayKeys().map(getMonthKeyFromDayKey))].sort();
}

function getAdjacentCalendarMonthKey(direction) {
  const monthKeys = getAvailableMonthKeys();

  if (direction < 0) {
    return [...monthKeys].reverse().find((monthKey) => monthKey < calendarMonthKey);
  }

  return monthKeys.find((monthKey) => monthKey > calendarMonthKey);
}

function getNearestAvailableDayKey(dayKey) {
  const availableDayKeys = getAvailableDayKeys();

  if (!availableDayKeys.length || availableDayKeys.includes(dayKey)) {
    return dayKey;
  }

  return (
    availableDayKeys.find((availableDayKey) => availableDayKey > dayKey) ||
    availableDayKeys.at(-1)
  );
}

function ensureSelectableSelectedDay() {
  const nextDayKey = getNearestAvailableDayKey(selectedDayKey);

  if (nextDayKey === selectedDayKey) {
    return;
  }

  selectedDayKey = nextDayKey;
  calendarMonthKey = getMonthKeyFromDayKey(nextDayKey);
  activeMatchId = "";
}

function getAdjacentMatchDay(direction) {
  const availableDayKeys = getAvailableDayKeys();
  if (direction < 0) {
    return [...availableDayKeys].reverse().find((dayKey) => dayKey < selectedDayKey);
  }
  return availableDayKeys.find((dayKey) => dayKey > selectedDayKey);
}

function getMatchCountForDay(dayKey) {
  return getCalendarFixtures().filter((fixture) => getFixtureDayKey(fixture) === dayKey)
    .length;
}

function getSelectedDateLabel() {
  const todayKey = getDayKey(new Date(), selectedTimeZone);
  const selectedYear = selectedDayKey.slice(0, 4);
  const currentYear = todayKey.slice(0, 4);

  if (selectedDayKey === todayKey) {
    return t("calendarToday");
  }

  if (selectedYear !== currentYear) {
    return navDateWithYearFormatter.format(getDateFromKey(selectedDayKey));
  }

  return navDateFormatter.format(getDateFromKey(selectedDayKey));
}

function updateDateControls() {
  const isToday = selectedDayKey === getDayKey(new Date(), selectedTimeZone);
  const selectedDateLabel = dateFormatter.format(getDateFromKey(selectedDayKey));

  dayLabel.textContent = getSelectedDateLabel();
  dayLabel.classList.toggle("is-today", isToday);
  dayLabel.setAttribute("aria-label", localizeText(`Choose match date, ${selectedDateLabel}`));
  dayLabel.setAttribute("aria-expanded", String(isCalendarOpen));
  renderCalendar();
}

function getCalendarDayKeys(monthKey) {
  const firstOfMonth = getDateFromMonthKey(monthKey);
  const startDate = new Date(firstOfMonth);
  startDate.setUTCDate(firstOfMonth.getUTCDate() - firstOfMonth.getUTCDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + index);
    return getDayKeyFromDate(date);
  });
}

function renderCalendar() {
  if (!calendarGrid || !calendarMonthLabel) {
    return;
  }

  const todayKey = getDayKey(new Date(), selectedTimeZone);
  const yesterdayKey = getRelativeDayKey(todayKey, -1);
  const previousMonthKey = getAdjacentCalendarMonthKey(-1);
  const nextMonthKey = getAdjacentCalendarMonthKey(1);
  const monthDate = getDateFromMonthKey(calendarMonthKey);
  calendarMonthLabel.textContent = calendarMonthFormatter.format(monthDate);
  calendarPrevMonth.disabled = !previousMonthKey;
  calendarNextMonth.disabled = !nextMonthKey;
  calendarPrevMonth.setAttribute(
    "aria-label",
    previousMonthKey
      ? localizeText(
          `Previous World Cup month, ${calendarMonthFormatter.format(getDateFromMonthKey(previousMonthKey))}`
        )
      : localizeText("No previous World Cup month")
  );
  calendarNextMonth.setAttribute(
    "aria-label",
    nextMonthKey
      ? localizeText(
          `Next World Cup month, ${calendarMonthFormatter.format(getDateFromMonthKey(nextMonthKey))}`
        )
      : localizeText("No next World Cup month")
  );
  calendarYesterdayButton.disabled = getMatchCountForDay(yesterdayKey) === 0;
  calendarTodayButton.disabled = getMatchCountForDay(todayKey) === 0;
  calendarGrid.replaceChildren(
    ...getCalendarDayKeys(calendarMonthKey).map((dayKey) => {
      const dayDate = getDateFromKey(dayKey);
      const matchCount = getMatchCountForDay(dayKey);
      const isCurrentMonth = getMonthKeyFromDayKey(dayKey) === calendarMonthKey;
      const isSelected = dayKey === selectedDayKey;
      const isToday = dayKey === todayKey;
      const isMatchDay = matchCount > 0;
      const button = document.createElement("button");
      const labelParts = [calendarDayLabelFormatter.format(dayDate)];

      if (isToday) {
        labelParts.push(localizeText("today"));
      }
      if (isSelected) {
        labelParts.push(localizeText("selected"));
      }
      if (matchCount) {
        labelParts.push(localizeText(`${matchCount} match${matchCount === 1 ? "" : "es"} scheduled`));
      } else {
        labelParts.push(localizeText("no World Cup matches scheduled"));
      }

      button.type = "button";
      button.className = [
        "calendar-day",
        isCurrentMonth ? "" : "is-outside-month",
        isSelected ? "is-selected" : "",
        isToday ? "is-today" : "",
        isMatchDay ? "is-match-day" : "is-disabled"
      ]
        .filter(Boolean)
        .join(" ");
      button.dataset.dayKey = dayKey;
      button.disabled = !isMatchDay;
      button.setAttribute("aria-label", labelParts.join(", "));
      button.setAttribute("aria-pressed", String(isSelected));
      if (isToday) {
        button.setAttribute("aria-current", "date");
      }
      button.textContent = String(dayDate.getUTCDate());
      return button;
    })
  );
}

function setCalendarOpen(isOpen) {
  if (isOpen) {
    setCatchUpOpen(false);
    setSettingsOpen(false);
    setStandingsYearOpen(false);
  }

  isCalendarOpen = isOpen;
  datePopover.classList.toggle("is-hidden", !isOpen);
  dayLabel.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    calendarMonthKey = getMonthKeyFromDayKey(selectedDayKey);
    renderCalendar();
  }
}

function selectCalendarDay(dayKey) {
  selectedDayKey = dayKey;
  calendarMonthKey = getMonthKeyFromDayKey(dayKey);
  clearTeamSearch({ render: false });
  setCalendarOpen(false);
  renderSchedule({ historyMode: "push" });
}

function setStandingsYearOpen(isOpen) {
  if (!standingsYearButton || !standingsYearPopover) {
    return;
  }

  if (isOpen) {
    setCalendarOpen(false);
    setCatchUpOpen(false);
    setSettingsOpen(false);
  }

  isStandingsYearOpen = isOpen;
  standingsYearPopover.classList.toggle("is-hidden", !isOpen);
  standingsYearButton.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    renderStandingsYearPicker();
  }
}

function updateTabIndicator(shell, activeTab) {
  if (!shell || !activeTab || shell.hidden || activeTab.hidden) {
    shell?.style.removeProperty("--active-tab-left");
    shell?.style.removeProperty("--active-tab-width");
    return;
  }

  const shellRect = shell.getBoundingClientRect();
  const tabRect = activeTab.getBoundingClientRect();

  if (!shellRect.width || !tabRect.width) {
    shell.style.removeProperty("--active-tab-left");
    shell.style.removeProperty("--active-tab-width");
    return;
  }

  shell.style.setProperty("--active-tab-left", `${tabRect.left - shellRect.left}px`);
  shell.style.setProperty("--active-tab-width", `${tabRect.width}px`);
}

function updateViewTabIndicator() {
  updateTabIndicator(
    viewTabsShell,
    Array.from(viewTabs).find((tab) => tab.dataset.view === activeView)
  );
}

function updateStandingsModeTabIndicator() {
  updateTabIndicator(
    standingsModeTabsShell,
    Array.from(standingsModeTabs).find(
      (tab) => tab.dataset.standingsMode === selectedStandingsMode
    )
  );
}

function updateLanguageTabIndicator() {
  updateTabIndicator(
    languageSwitch,
    Array.from(languageButtons).find(
      (button) => normalizeLanguage(button.dataset.language) === currentLanguage
    )
  );
}

function updateLineupTabIndicators(root = document) {
  const blocks = root?.matches?.(".lineup-preview-block")
    ? [root]
    : Array.from(root?.querySelectorAll?.(".lineup-preview-block") || []);

  blocks.forEach((block) => {
    block.querySelectorAll(".lineup-tabs").forEach((tabs) => {
      updateTabIndicator(tabs, tabs.querySelector(".lineup-tab.is-active"));
    });
  });
}


function updateTabIndicators() {
  updateViewTabIndicator();
  updateStandingsModeTabIndicator();
  updateLanguageTabIndicator();
  updateLineupTabIndicators();
}

function queueTabIndicatorUpdate() {
  window.requestAnimationFrame(updateTabIndicators);
}

function selectStandingsYear(year, options = {}) {
  selectedStandingsYear = getValidStandingsYear(year);
  selectedStandingsMode = getValidStandingsMode(
    selectedStandingsMode,
    getDefaultStandingsModeForYear(selectedStandingsYear),
    selectedStandingsYear
  );
  setStandingsYearOpen(false);
  renderStandingsView();
  updateUrlState(options);
}

function selectStandingsMode(mode, options = {}) {
  selectedStandingsMode = getValidStandingsMode(mode, null, selectedStandingsYear);
  renderStandingsView();
  updateUrlState(options);
}

function openStandingsGroup(groupId, options = {}) {
  if (!groupId) {
    return;
  }

  selectedStandingsMode = "groups";
  renderStandingsView();
  updateUrlState(options);

  window.requestAnimationFrame(() => {
    const card = standingsGrid.querySelector(
      `.standings-card[data-group-id="${CSS.escape(groupId)}"]`
    );

    if (!card) {
      return;
    }

    spotlightDrillTarget(card);
  });
}

function spotlightDrillTarget(element) {
  if (!element) {
    return;
  }

  const hadTabIndex = element.hasAttribute("tabindex");
  if (!hadTabIndex) {
    element.setAttribute("tabindex", "-1");
  }

  element.classList.add("is-drill-target");
  element.focus({ preventScroll: true });
  element.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "center",
    inline: "center"
  });

  window.setTimeout(() => {
    element.classList.remove("is-drill-target");
    if (!hadTabIndex) {
      element.removeAttribute("tabindex");
    }
  }, 1400);
}

function renderTimeZoneOptions() {
  timezoneSelect.replaceChildren(
    ...timeZones.map((timeZone) => {
      const option = document.createElement("option");
      option.value = timeZone;
      option.textContent = getTimeZoneLabel(timeZone);
      option.selected = timeZone === selectedTimeZone;
      return option;
    })
  );
  updateTimeZoneControlWidth();
}

function setHeaderControlsLoading(isLoading) {
  if (!headerControls) {
    return;
  }

  headerControls.classList.toggle("is-loading", isLoading);
  if (isLoading) {
    headerControls.setAttribute("aria-busy", "true");
  } else {
    headerControls.removeAttribute("aria-busy");
  }
}

function updateTimeZoneLabelForViewport() {
  updateTimeZoneControlWidth();
}

function renderFlag(team) {
  if (team.isSlot || (!team.flag && !team.flagClass)) {
    return "";
  }

  const className = ["flag", team.flagClass].filter(Boolean).join(" ");
  const content = team.flagClass ? "" : escapeHtml(team.flag);
  const teamName = getLocalizedTeamName(team);
  const label =
    currentLanguage === "zh" ? `${teamName} 旗帜` : `${teamName} flag`;
  return `<span class="${escapeHtml(className)}" role="img" aria-label="${escapeHtml(label)}">${content}</span>`;
}

function renderRank(team) {
  if (!team.fifaRank) {
    return "";
  }

  const teamName = getLocalizedTeamName(team);
  const label =
    currentLanguage === "zh"
      ? `${teamName} FIFA世界排名 ${team.fifaRank}`
      : `${teamName} FIFA world ranking ${team.fifaRank}`;
  const tooltip = localizeText("FIFA world ranking used for this 2026 tournament view.");
  const ariaLabel = currentLanguage === "zh" ? `${label}。${tooltip}` : `${label}. ${tooltip}`;
  return `<span class="rank-pill" tabindex="0" aria-label="${escapeHtml(ariaLabel)}" data-tooltip="${escapeHtml(tooltip)}">#${escapeHtml(team.fifaRank)}</span>`;
}

function getStandingName(team) {
  return team.standingName || team.name;
}

function renderMeasuredLabel(label, className) {
  const labelText = localizeText(label);
  const escapedLabel = escapeHtml(labelText);

  return `<span class="${escapeHtml(className)}" aria-label="${escapedLabel}" title="${escapedLabel}">${escapedLabel}</span>`;
}

function renderTeamInline(team, className = "team", options = {}) {
  const { showRank = true } = options;
  const teamName = getLocalizedTeamName(team);
  const escapedTeamName = escapeHtml(teamName);
  const flagHtml = renderFlag(team);
  const rankHtml = showRank ? renderRank(team) : "";
  const nameHtml = `<span class="team-name" aria-label="${escapedTeamName}">${escapedTeamName}</span>`;
  const copyHtml = rankHtml ? `<span class="team-copy">${nameHtml}${rankHtml}</span>` : nameHtml;
  const tooltipAttributes = teamName
    ? ` aria-label="${escapedTeamName}" data-tooltip="${escapedTeamName}"`
    : "";

  return `
    <span class="${escapeHtml(className)}"${tooltipAttributes}>
      ${flagHtml}
      ${copyHtml}
    </span>
  `;
}

function setNameTooltipAnchor(container, name) {
  const containerRect = container.getBoundingClientRect();
  const nameRect = name.getBoundingClientRect();
  if (!containerRect.width) {
    return;
  }

  const nameStart = nameRect.left - containerRect.left;
  const availableNameWidth = Math.max(0, containerRect.width - nameStart);
  const visibleNameWidth =
    nameRect.width || name.clientWidth || Math.min(name.scrollWidth, availableNameWidth);

  if (!visibleNameWidth) {
    return;
  }

  const anchorX = nameStart + visibleNameWidth / 2;
  container.style.setProperty("--name-tooltip-anchor", `${Math.round(anchorX)}px`);
}

function isVisiblyWrappedName(name) {
  const style = getComputedStyle(name);
  const lineHeight = Number.parseFloat(style.lineHeight);
  const height = name.getBoundingClientRect().height;

  return (
    style.whiteSpace === "normal" &&
    style.overflow === "visible" &&
    Number.isFinite(lineHeight) &&
    lineHeight > 0 &&
    height > lineHeight * 1.35
  );
}

const MOBILE_MATCH_ROW_META_MIN_GAP = 12;

function updateTruncatedTeamTooltips(root = document) {
  root
    .querySelectorAll(
      ".team[data-tooltip], .past-team[data-tooltip], .summary-team[data-tooltip], .yesterday-team[data-tooltip]"
    )
    .forEach((team) => {
      const name = team.querySelector(".team-name");
      if (!name) {
        team.classList.remove("has-team-tooltip");
        team.style.removeProperty("--name-tooltip-anchor");
        return;
      }

      const isTruncated = name.scrollWidth > name.clientWidth + 1 && !isVisiblyWrappedName(name);
      const hasEllipsisText = name.textContent.includes("...");
      const shouldShowTooltip = isTruncated || hasEllipsisText;
      team.classList.toggle("has-team-tooltip", shouldShowTooltip);

      if (shouldShowTooltip) {
        setNameTooltipAnchor(team, name);
      } else {
        team.style.removeProperty("--name-tooltip-anchor");
      }
    });
}

function updateWrappedMatchRows(root = document) {
  const shouldEnforceMobileMetaGap = window.matchMedia("(max-width: 520px)").matches;

  root.querySelectorAll(".match-row").forEach((row) => {
    const teams = row.querySelector(".match-teams");
    if (!teams) {
      row.classList.remove("has-wrapped-matchup");
      row.style.removeProperty("--match-row-wrapped-trigger-width");
      row.style.removeProperty("--match-row-wrapped-meta-gap");
      row.style.removeProperty("--match-row-wrapped-meta-width");
      return;
    }

    row.classList.remove("has-wrapped-matchup");
    row.style.removeProperty("--match-row-wrapped-trigger-width");
    row.style.removeProperty("--match-row-wrapped-meta-gap");
    row.style.removeProperty("--match-row-wrapped-meta-width");
    const teamsStyle = getComputedStyle(teams);
    const lineHeight = Number.parseFloat(teamsStyle.lineHeight);
    const teamsHeight = teams.getBoundingClientRect().height;
    const meta = row.querySelector(".match-row-meta");
    const isVisuallyWrapped =
      Number.isFinite(lineHeight) && lineHeight > 0 && teamsHeight > lineHeight * 1.35;
    let isTooCloseToMeta = false;

    if (shouldEnforceMobileMetaGap && meta) {
      const metaRect = meta.getBoundingClientRect();
      const metaItemRects = Array.from(meta.querySelectorAll(":scope > *")).map((element) =>
        element.getBoundingClientRect()
      );
      const metaContentLeft = Math.min(metaRect.left, ...metaItemRects.map((rect) => rect.left));
      const matchupPieceRights = Array.from(
        teams.querySelectorAll(".flag, .team-name, .match-versus")
      ).map((element) => element.getBoundingClientRect().right);
      const matchupRight = Math.max(...matchupPieceRights);

      isTooCloseToMeta =
        Number.isFinite(matchupRight) &&
        metaContentLeft - matchupRight < MOBILE_MATCH_ROW_META_MIN_GAP;
    }

    const isWrapped = isVisuallyWrapped || isTooCloseToMeta;

    if (isWrapped && meta) {
      const rowRect = row.getBoundingClientRect();
      const metaRect = meta.getBoundingClientRect();
      const metaItemRects = Array.from(meta.querySelectorAll(":scope > *")).map((element) =>
        element.getBoundingClientRect()
      );
      const metaContentLeft = Math.min(metaRect.left, ...metaItemRects.map((rect) => rect.left));
      const metaContentRight = Math.max(metaRect.right, ...metaItemRects.map((rect) => rect.right));
      const metaWidth = Math.max(metaRect.width, metaContentRight - metaContentLeft);
      const rowStyle = getComputedStyle(row);
      const rowGap = Number.parseFloat(rowStyle.columnGap || rowStyle.gap) || 8;
      const maxTriggerWidth = Math.max(0, rowRect.width - metaWidth - rowGap);

      row.style.setProperty("--match-row-wrapped-trigger-width", `${Math.ceil(maxTriggerWidth)}px`);
      row.style.setProperty("--match-row-wrapped-meta-gap", `${Math.round(rowGap)}px`);
      row.style.setProperty("--match-row-wrapped-meta-width", `${Math.ceil(metaWidth)}px`);
    }

    row.classList.toggle("has-wrapped-matchup", isWrapped);
  });
}

function updateStandingNameTooltips(root = document) {
  root.querySelectorAll(".standing-team[data-tooltip]").forEach((team) => {
    const name = team.querySelector(".standing-name");
    if (!name) {
      team.classList.remove("has-name-tooltip");
      team.removeAttribute("tabindex");
      team.removeAttribute("title");
      team.style.removeProperty("--name-tooltip-anchor");
      return;
    }

    const fullName = team.getAttribute("data-tooltip") || "";
    const visibleName = name.textContent.trim();
    const isTruncated = name.scrollWidth > name.clientWidth + 1;
    const hasDisplayAlias = Boolean(fullName && visibleName && visibleName !== fullName);
    const hasEllipsisText = visibleName.includes("...");
    const shouldShowTooltip = isTruncated || hasDisplayAlias || hasEllipsisText;

    team.classList.toggle("has-name-tooltip", shouldShowTooltip);

    if (shouldShowTooltip) {
      team.tabIndex = 0;
      team.setAttribute("title", fullName);
      setNameTooltipAnchor(team, name);
    } else {
      team.removeAttribute("tabindex");
      team.removeAttribute("title");
      team.style.removeProperty("--name-tooltip-anchor");
    }
  });
}

function updateMeasuredLabelTooltips(root = document) {
  root
    .querySelectorAll(".prediction-row[data-tooltip], .past-record-row[data-tooltip]")
    .forEach((row) => {
      const label = row.querySelector(".prediction-label, .past-record-label");
      if (!label) {
        row.classList.remove("has-label-tooltip");
        row.removeAttribute("tabindex");
        row.style.removeProperty("--name-tooltip-anchor");
        return;
      }

      const fullLabel = row.getAttribute("data-tooltip") || "";
      const visibleLabel = label.textContent.trim();
      const isTruncated = label.scrollWidth > label.clientWidth + 1;
      const hasDisplayAlias = Boolean(fullLabel && visibleLabel && visibleLabel !== fullLabel);
      const hasEllipsisText = visibleLabel.includes("...");
      const shouldShowTooltip = isTruncated || hasDisplayAlias || hasEllipsisText;

      row.classList.toggle("has-label-tooltip", shouldShowTooltip);

      if (shouldShowTooltip) {
        row.tabIndex = 0;
        setNameTooltipAnchor(row, label);
      } else {
        row.removeAttribute("tabindex");
        row.style.removeProperty("--name-tooltip-anchor");
      }
    });
}

const boundedTooltipSelector = [
  ".live-pill[data-tooltip]",
  ".tournament-live-pill[data-tooltip]",
  ".rank-pill[data-tooltip]",
  ".team.has-team-tooltip[data-tooltip]",
  ".past-team.has-team-tooltip[data-tooltip]",
  ".summary-team.has-team-tooltip[data-tooltip]",
  ".yesterday-team.has-team-tooltip[data-tooltip]",
  ".info-tooltip-button[data-tooltip]",
  ".standing-help[data-tooltip]",
  ".standing-team.has-name-tooltip[data-tooltip]",
  ".standing-status-pill[data-tooltip]",
  ".third-place-pill[data-tooltip]",
  ".third-place-status[data-tooltip]",
  ".player-card-value-help[data-tooltip]",
  ".prediction-row.has-label-tooltip[data-tooltip]",
  ".past-record-row.has-label-tooltip[data-tooltip]",
  ".knockout-team[data-tooltip]",
  ".knockout-match-venue[data-tooltip]",
  ".knockout-likelihood[data-tooltip]",
  ".knockout-slot-odds[data-tooltip]"
].join(",");
const boundedElementTooltipSelector = ".source-tooltip, .release-tooltip";
let activeTouchTooltipElement = null;

function getPixelValue(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

function getTooltipPositionOffset(value, anchorSize) {
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

  return getPixelValue(text);
}

function getTransformTranslateX(value) {
  if (!value || value === "none") {
    return 0;
  }

  const matrix = value.match(/^matrix\((.+)\)$/);
  if (!matrix) {
    return 0;
  }

  const parts = matrix[1].split(",").map((part) => Number.parseFloat(part.trim()));
  return Number.isFinite(parts[4]) ? parts[4] : 0;
}

function getTooltipClipRect(element) {
  const viewportRight = document.documentElement.clientWidth || window.innerWidth;
  const knockoutCard = element.matches(".knockout-likelihood[data-tooltip], .knockout-slot-odds[data-tooltip]")
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
}

function measureTooltipOuterWidth(element, style) {
  const tooltipText = element?.getAttribute("data-tooltip") || "";
  if (!tooltipText || !document.body) {
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
  const width = probe.getBoundingClientRect().width;
  probe.remove();

  return Number.isFinite(width) ? width : 0;
}

function getTooltipOuterWidth(style, element = null) {
  const width = getPixelValue(style.width);
  if (width) {
    return (
      width +
      getPixelValue(style.paddingLeft) +
      getPixelValue(style.paddingRight) +
      getPixelValue(style.borderLeftWidth) +
      getPixelValue(style.borderRightWidth)
    );
  }

  return element ? measureTooltipOuterWidth(element, style) : 0;
}

function getTooltipBaseBounds(element, style, tooltipWidth) {
  const rect = element.getBoundingClientRect();
  let translateX = getTransformTranslateX(style.transform);

  if (style.left !== "auto") {
    if (!translateX && String(style.left).includes("%")) {
      translateX = -tooltipWidth / 2;
    }

    const baseLeft = rect.left + getTooltipPositionOffset(style.left, rect.width) + translateX;
    return {
      left: baseLeft,
      right: baseLeft + tooltipWidth
    };
  }

  if (style.right !== "auto") {
    const baseRight = rect.right - getTooltipPositionOffset(style.right, rect.width) + translateX;
    return {
      left: baseRight - tooltipWidth,
      right: baseRight
    };
  }

  return null;
}

function getBoundedTooltipElements(root = document) {
  const elements = [];
  if (root instanceof Element && root.matches(boundedTooltipSelector)) {
    elements.push(root);
  }
  root.querySelectorAll?.(boundedTooltipSelector).forEach((element) => elements.push(element));
  return elements;
}

function getBoundedElementTooltipElements(root = document) {
  const elements = [];
  if (root instanceof Element && root.matches(boundedElementTooltipSelector)) {
    elements.push(root);
  }
  root
    .querySelectorAll?.(boundedElementTooltipSelector)
    .forEach((element) => elements.push(element));
  return elements;
}

function updateTooltipBounds(root = document) {
  getBoundedTooltipElements(root).forEach((element) => {
    element.style.removeProperty("--tooltip-shift-x");
    element.style.removeProperty("--tooltip-left-x");
    element.style.removeProperty("--tooltip-transform-x");

    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const style = getComputedStyle(element, "::after");
    const tooltipWidth = getTooltipOuterWidth(style, element);
    if (!tooltipWidth) {
      return;
    }

    const baseBounds = getTooltipBaseBounds(element, style, tooltipWidth);
    if (!baseBounds) {
      return;
    }

    const clipRect = getTooltipClipRect(element);
    const edgeGap = 6;
    const minLeft = clipRect.left + edgeGap;
    const maxRight = Math.max(minLeft, clipRect.right - edgeGap);
    let shift = 0;

    if (baseBounds.left < minLeft) {
      shift = minLeft - baseBounds.left;
    }

    if (baseBounds.right + shift > maxRight) {
      shift -= baseBounds.right + shift - maxRight;
    }

    if (
      element.matches(".standing-help[data-tooltip], .rank-pill[data-tooltip]") &&
      style.left !== "auto"
    ) {
      const resolvedLeft = baseBounds.left + shift - rect.left;
      element.style.setProperty("--tooltip-left-x", `${resolvedLeft.toFixed(2)}px`);
      element.style.setProperty("--tooltip-transform-x", "0px");
    } else if (Math.abs(shift) > 0.5) {
      element.style.setProperty("--tooltip-shift-x", `${shift.toFixed(2)}px`);
    }
  });

  getBoundedElementTooltipElements(root).forEach((element) => {
    element.style.removeProperty("--tooltip-shift-x");

    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const viewportRight = document.documentElement.clientWidth || window.innerWidth;
    const edgeGap = 6;
    const minLeft = edgeGap;
    const maxRight = Math.max(minLeft, viewportRight - edgeGap);
    let shift = 0;

    if (rect.left < minLeft) {
      shift = minLeft - rect.left;
    }

    if (rect.right + shift > maxRight) {
      shift -= rect.right + shift - maxRight;
    }

    if (Math.abs(shift) > 0.5) {
      element.style.setProperty("--tooltip-shift-x", `${shift.toFixed(2)}px`);
    }
  });
}

function updateTooltipBoundsForTarget(target) {
  if (!(target instanceof Element)) {
    return;
  }

  const tooltipElement = target.closest(boundedTooltipSelector);
  const tooltipWrapper = target.closest(".source-tooltip-wrapper, .release-tooltip-wrapper");
  const root = tooltipElement || tooltipWrapper;

  if (!root) {
    return;
  }

  updateTooltipBounds(root);
  window.requestAnimationFrame(() => updateTooltipBounds(root));
}

function isTouchTooltipPointerEvent(event) {
  const pointerType = String(event.pointerType || "").toLowerCase();
  return (
    pointerType === "touch" ||
    pointerType === "pen" ||
    (!pointerType && window.matchMedia?.("(hover: none), (pointer: coarse)").matches)
  );
}

function getNonLinkTooltipElement(target) {
  if (!(target instanceof Element)) {
    return null;
  }

  const tooltipElement = target.closest(boundedTooltipSelector);
  if (!tooltipElement || tooltipElement.closest("a[href]")) {
    return null;
  }

  return tooltipElement;
}

function getLivePillTooltipElement(target) {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest(".live-pill[data-tooltip], .tournament-live-pill[data-tooltip]");
}

function clearActiveTouchTooltip() {
  if (!activeTouchTooltipElement) {
    return;
  }

  if (document.activeElement === activeTouchTooltipElement) {
    activeTouchTooltipElement.blur();
  }

  activeTouchTooltipElement.classList.remove("is-touch-tooltip-open");
  activeTouchTooltipElement = null;
}

function setActiveTouchTooltip(tooltipElement) {
  if (activeTouchTooltipElement && activeTouchTooltipElement !== tooltipElement) {
    clearActiveTouchTooltip();
  }

  activeTouchTooltipElement = tooltipElement;
  activeTouchTooltipElement.classList.add("is-touch-tooltip-open");
  activeTouchTooltipElement.focus?.({ preventScroll: true });
  updateTooltipBounds(activeTouchTooltipElement);
  window.requestAnimationFrame(() => updateTooltipBounds(activeTouchTooltipElement));
}

function handleTouchTooltipPointerDown(event) {
  const tooltipElement = getNonLinkTooltipElement(event.target);

  if (!isTouchTooltipPointerEvent(event)) {
    if (!tooltipElement) {
      clearActiveTouchTooltip();
    }
    return;
  }

  if (!tooltipElement) {
    clearActiveTouchTooltip();
    return;
  }

  event.stopPropagation();
  setActiveTouchTooltip(tooltipElement);
}

function handleLivePillTooltipClick(event) {
  const tooltipElement = getLivePillTooltipElement(event.target);
  if (!tooltipElement) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  setActiveTouchTooltip(tooltipElement);
}

function handleLivePillTooltipKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const tooltipElement = getLivePillTooltipElement(event.target);
  if (!tooltipElement) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  setActiveTouchTooltip(tooltipElement);
}

function shouldIgnoreContainerClickForTooltip(target) {
  return Boolean(getNonLinkTooltipElement(target));
}

function getVenueLabel(match) {
  if (currentLanguage === "zh") {
    const venue = zhVenueNames[match.venue] || localizeHistoricalVenueText(match.venue);
    const location = zhVenueLocations[match.venue] || localizeHistoricalVenueText(venueLocations[match.venue] || "");
    return location ? `${venue} \u2022 ${location}` : venue;
  }

  const location = venueLocations[match.venue];
  return location ? `${match.venue} \u2022 ${location}` : match.venue;
}

function getTournamentVenueLabel(match) {
  if (!match?.venue) {
    return "";
  }

  if (currentLanguage === "zh") {
    return zhVenueLocations[match.venue] || localizeHistoricalVenueText(venueLocations[match.venue] || match.venue);
  }

  const location = venueLocations[match.venue];
  if (!location) {
    return match.venue;
  }

  const locationParts = location.split(",").map((part) => part.trim()).filter(Boolean);
  return locationParts.length >= 3 ? locationParts.slice(1).join(", ") : location;
}

function getScoreWinnerSide(homeScore, awayScore) {
  const home = Number(homeScore);
  const away = Number(awayScore);

  if (!Number.isFinite(home) || !Number.isFinite(away) || home === away) {
    return "";
  }

  return home > away ? "home" : "away";
}

function getTeamClass(baseClass, winnerSide, side, options = {}) {
  const { markLoser = false } = options;
  return [
    baseClass,
    winnerSide === side ? "is-winner" : "",
    markLoser && winnerSide && winnerSide !== side ? "is-loser" : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function renderPastScoreline(result, leadingTeamId = "") {
  const hasStructuredScore =
    result.homeTeamId &&
    result.awayTeamId &&
    Number.isFinite(Number(result.homeScore)) &&
    Number.isFinite(Number(result.awayScore));

  if (!hasStructuredScore) {
    return `<strong class="past-scoreline-fallback">${escapeHtml(localizeText(result.score || "Score unavailable"))}</strong>`;
  }

  const homeTeam = getTeam(result.homeTeamId);
  const awayTeam = getTeam(result.awayTeamId);
  const shouldFlipScoreline = leadingTeamId && result.awayTeamId === leadingTeamId;
  const leftTeam = shouldFlipScoreline ? awayTeam : homeTeam;
  const rightTeam = shouldFlipScoreline ? homeTeam : awayTeam;
  const leftScore = shouldFlipScoreline ? result.awayScore : result.homeScore;
  const rightScore = shouldFlipScoreline ? result.homeScore : result.awayScore;
  const scoreText = `${leftScore}-${rightScore}`;
  const scoreNote = result.scoreNote ? ` ${localizeText(result.scoreNote)}` : "";
  const winnerSide = getScoreWinnerSide(leftScore, rightScore);

  const ariaLabel = `${getLocalizedTeamName(leftTeam)} ${scoreText} ${getLocalizedTeamName(rightTeam)}${scoreNote}`;

  return `
    <div class="past-scoreline" aria-label="${escapeHtml(ariaLabel)}">
      ${renderTeamInline(leftTeam, getTeamClass("past-team", winnerSide, "home", { markLoser: true }), { showRank: false })}
      <strong class="past-score">
        ${escapeHtml(scoreText)}
        ${result.scoreNote ? `<span>${escapeHtml(localizeText(result.scoreNote))}</span>` : ""}
      </strong>
      ${renderTeamInline(rightTeam, getTeamClass("past-team", winnerSide, "away", { markLoser: true }), { showRank: false })}
    </div>
  `;
}

function getMatchState(match, nextMatchIds, currentTime) {
  if (match.status === "FT") {
    return "complete";
  }

  if (isMatchLive(match, currentTime)) {
    return "live";
  }

  if (nextMatchIds.has(match.id)) {
    return "next";
  }

  return "idle";
}

function isMatchLive(match, currentTime) {
  if (match.status === "LIVE") {
    return true;
  }

  if (match.status !== "SCHEDULED" || !match.kickoffUtc) {
    return false;
  }

  const kickoffTime = new Date(match.kickoffUtc).getTime();
  return currentTime >= kickoffTime && currentTime < kickoffTime + MATCH_LIVE_WINDOW_MS;
}

function getLiveMatchIds(currentTime) {
  return new Set(
    fixtures
      .map(hydrateFixture)
      .filter((match) => isMatchLive(match, currentTime))
      .map((match) => match.id)
  );
}

function getNextMatchIds(currentTime, liveMatchIds) {
  if (liveMatchIds.size > 0) {
    return new Set();
  }

  const upcomingMatches = fixtures
    .map(hydrateFixture)
    .map((match) => ({
      kickoffTime: match.kickoffUtc ? new Date(match.kickoffUtc).getTime() : NaN,
      match
    }))
    .filter(
      ({ kickoffTime, match }) =>
        Number.isFinite(kickoffTime) &&
        kickoffTime > currentTime &&
        match.status !== "FT"
    )
    .sort((a, b) => a.kickoffTime - b.kickoffTime);
  const nextKickoffTime = upcomingMatches[0]?.kickoffTime;

  if (!Number.isFinite(nextKickoffTime)) {
    return new Set();
  }

  return new Set(
    upcomingMatches
      .filter(({ kickoffTime }) => kickoffTime === nextKickoffTime)
      .map(({ match }) => match.id)
  );
}

function getGlobalNextMatchIds(currentTime = Date.now()) {
  return getNextMatchIds(currentTime, getLiveMatchIds(currentTime));
}

function shouldShowScorePending(match, state, currentTime) {
  if (match.score || !match.kickoffUtc || match.status === "CANCELLED" || match.status === "POSTPONED") {
    return false;
  }

  if (match.status === "LIVE" || state === "live") {
    return false;
  }

  const kickoffTime = new Date(match.kickoffUtc).getTime();
  return Number.isFinite(kickoffTime) && currentTime >= kickoffTime + MATCH_LIVE_WINDOW_MS;
}

function getScorePendingText(match, state, currentTime) {
  if (
    !match.score &&
    match.status !== "CANCELLED" &&
    match.status !== "POSTPONED" &&
    (match.status === "LIVE" || state === "live")
  ) {
    return localizeText("Pending");
  }

  if (!shouldShowScorePending(match, state, currentTime)) {
    return "";
  }

  return localizeText("Pending");
}

function canDisplayMatchScore(match, state) {
  return match?.status === "FT" || match?.status === "LIVE" || state === "complete";
}

function getDisplayScore(match, state) {
  if (!match?.score || !canDisplayMatchScore(match, state)) {
    return null;
  }

  return {
    home: match.score.home,
    away: match.score.away,
    isFallback: false
  };
}

function getScoreFreshnessTimestamp(match) {
  const candidates = [
    match.scoreUpdatedAt,
    match.liveUpdatedAt,
    match.updatedAt,
    liveDataCheckedAt,
    siteUpdatedAt
  ];

  return candidates.find((value) => Number.isFinite(new Date(value).getTime())) || "";
}

function formatRelativeScoreFreshness(timestamp, now = Date.now()) {
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) {
    return "";
  }

  const elapsedSeconds = Math.max(0, Math.round((now - time) / 1000));
  if (elapsedSeconds < 45) {
    return localizeText("now");
  }

  const elapsedMinutes = Math.round(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return localizeText(`${elapsedMinutes} min ago`);
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);
  return localizeText(`${elapsedHours} hr ago`);
}

function normalizeOfficialMatchTime(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  const stoppageMatch = /^(\d{1,3})'\+(\d{1,2})'$/.exec(text);
  if (stoppageMatch) {
    return `${stoppageMatch[1]}+${stoppageMatch[2]}'`;
  }

  return /^\d{1,3}(?:\+\d{1,2})?'$/.test(text) ? text : "";
}

function getOfficialMatchTimeSnapshotTooltip(match) {
  const matchTime = normalizeOfficialMatchTime(match?.officialMatchTime);
  if (!matchTime) {
    return "";
  }

  const freshness = formatRelativeScoreFreshness(
    match?.officialMatchTimeUpdatedAt || liveDataCheckedAt
  );
  if (!freshness) {
    return "";
  }

  return currentLanguage === "zh"
    ? `FIFA快照：${matchTime} · ${freshness}核验`
    : `FIFA snapshot: ${matchTime} · checked ${freshness}`;
}

function getMatchScoreOutcomeSide(match, score) {
  if (!score) {
    return "";
  }

  return getResultWinnerSide(match, score) || getScoreWinnerSide(score.home, score.away);
}

function getMatchPenaltyScoreText(match) {
  return formatScorePair(match?.scoreDetails?.penalties);
}

function getMatchVisibleScoreText(match, score) {
  const scoreText = `${score.home}-${score.away}`;
  const penaltyText = getMatchPenaltyScoreText(match);

  return penaltyText ? `${scoreText} (${penaltyText} ${localizeText("pens")})` : scoreText;
}

function getMatchScoreAriaLabel(match, label, home, away, score, freshness = "") {
  const penaltyText = getMatchPenaltyScoreText(match);
  const penaltyLabel = penaltyText
    ? currentLanguage === "zh"
      ? `，点球 ${penaltyText}`
      : `, penalties ${penaltyText}`
    : "";
  const freshnessLabel = freshness
    ? currentLanguage === "zh"
      ? `，最后检查 ${freshness}`
      : `, last checked ${freshness}`
    : "";

  return `${label} ${home} ${score.home}, ${away} ${score.away}${penaltyLabel}${freshnessLabel}`;
}

function getSearchScoreOutcome(match, score, searchedSide) {
  if (!searchedSide || !score) {
    return "";
  }

  const winnerSide = getMatchScoreOutcomeSide(match, score);
  if (!winnerSide) {
    return "tie";
  }

  return winnerSide === searchedSide ? "win" : "loss";
}

function renderScore(match, state, options = {}) {
  const score = getDisplayScore(match, state);
  if (!score) {
    return "";
  }

  const home = getLocalizedTeamName(match.homeTeam);
  const away = getLocalizedTeamName(match.awayTeam);
  const scoreText = `${score.home}-${score.away}`;
  const scoreWithDetailsText = getMatchVisibleScoreText(match, score);
  const isLiveScore = match.status === "LIVE" || state === "live";
  const freshness = isLiveScore
    ? formatRelativeScoreFreshness(getScoreFreshnessTimestamp(match))
    : "";
  const visibleScoreText = freshness ? `${scoreWithDetailsText} · ${freshness}` : scoreWithDetailsText;
  const label =
    isLiveScore ? localizeText("Current score") : localizeText("Final score");
  const ariaLabel = score.isFallback
    ? localizeText(`Current score not loaded yet; showing ${scoreText}`)
    : getMatchScoreAriaLabel(match, label, home, away, score, freshness);
  const outcome = getSearchScoreOutcome(match, score, options.searchedSide);
  const className = [
    "match-score",
    score.isFallback ? "is-live-fallback" : "",
    outcome ? `is-search-${outcome}` : ""
  ]
    .filter(Boolean)
    .join(" ");

  return `<span class="${className}" aria-label="${escapeHtml(ariaLabel)}">${escapeHtml(visibleScoreText)}</span>`;
}

function renderScoreStatus(match, state, currentTime) {
  const pendingText = getScorePendingText(match, state, currentTime);
  const ariaLabel =
    currentLanguage === "zh"
      ? `${pendingText}；已核验比分尚未载入`
      : `${pendingText}; verified score is not loaded yet`;
  return pendingText
    ? `<span class="score-status is-pending" aria-label="${escapeHtml(ariaLabel)}">${escapeHtml(pendingText)}</span>`
    : "";
}

function getLivePillAttributes(match, options = {}) {
  const tooltip = getOfficialMatchTimeSnapshotTooltip(match);
  const ariaLabel = tooltip
    ? currentLanguage === "zh"
      ? `直播：${tooltip}`
      : `Live: ${tooltip}`
    : localizeText("Live");
  const interactionAttributes = tooltip && options.focusable !== false ? ` role="button" tabindex="0"` : "";
  const tooltipAttributes = tooltip
    ? `${interactionAttributes} data-tooltip="${escapeHtml(tooltip)}"`
    : "";
  return `aria-label="${escapeHtml(ariaLabel)}"${tooltipAttributes}`;
}

function renderLivePill(options = {}) {
  const className = ["live-pill", options.className || ""].filter(Boolean).join(" ");
  return `<span class="${escapeHtml(className)}" ${getLivePillAttributes(options.match, { focusable: options.focusable })}>${escapeHtml(localizeText("Live"))}</span>`;
}

function renderTournamentLivePill(match) {
  return `<span class="tournament-live-pill" ${getLivePillAttributes(match)}>${escapeHtml(localizeText("Live"))}</span>`;
}

function getMatchDateTimeValue(match) {
  return match.kickoffUtc || match.date || "";
}

function getMatchTimeLabel(match) {
  if (match.kickoffUtc) {
    return getTimeFormatter().format(new Date(match.kickoffUtc)).replace(" ", "");
  }

  if (match.localTime) {
    return match.isHistorical ? getHistoricalTournamentTimeLabel(match) : match.localTime;
  }

  if (match.status === "CANCELLED") {
    return localizeText("Canceled");
  }

  return match.status === "FT" ? "" : localizeText("Final");
}

function getMatchDateLabel(match, options = {}) {
  let dayKey = match.date || "";

  if (!dayKey && match.kickoffUtc) {
    dayKey = getFixtureDayKey(match);
  }

  if (!isDayKey(dayKey)) {
    return "";
  }

  const currentYear = getDayKey(new Date(), selectedTimeZone).slice(0, 4);
  const shouldShowYear =
    options.alwaysShowYear || match.isHistorical || dayKey.slice(0, 4) !== currentYear;
  const formatter = shouldShowYear ? matchRowDateWithYearFormatter : matchRowDateFormatter;

  return formatter.format(getDateFromKey(dayKey));
}

function getMatchTimeAriaLabel(match) {
  if (match.status === "FT" && !match.kickoffUtc && !match.localTime) {
    return "";
  }

  const timeLabel = getMatchTimeLabel(match);
  const hasExplicitTimeZone = /\b(?:local|UTC|GMT)\b/i.test(timeLabel);
  return match.isHistorical && match.localTime && timeLabel && !hasExplicitTimeZone
    ? `${timeLabel} ${localizeText("local")}`
    : timeLabel;
}

function getMatchDateTimeAriaLabel(match, options = {}) {
  const dateLabel = options.showDate ? getMatchDateLabel(match, options) : "";
  const timeLabel = getMatchTimeAriaLabel(match);
  if (!dateLabel) {
    return timeLabel;
  }

  if (match.isHistorical) {
    return [dateLabel, timeLabel].filter(Boolean).join(", ");
  }

  return [dateLabel, timeLabel].filter(Boolean).join(", ");
}

function getMatchVisibleTimeLabel(match, options = {}) {
  const dateLabel = options.showDate ? getMatchDateLabel(match, options) : "";
  const timeLabel = getMatchTimeLabel(match);
  if (!dateLabel) {
    return timeLabel;
  }

  if (match.isHistorical) {
    return [dateLabel, timeLabel].filter(Boolean).join(" ");
  }

  return [dateLabel, timeLabel].filter(Boolean).join(" ");
}

function shouldPreviewMatchInfoOnHover(event) {
  if (event.pointerType && event.pointerType !== "mouse") {
    return false;
  }

  return !window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

function renderMatchRow(match, state, currentTime = Date.now(), options = {}) {
  const row = document.createElement("div");
  const displayTeams = getDisplayMatchTeams(match, options.tournamentContext);
  const homeName = getLocalizedTeamName(displayTeams.home);
  const awayName = getLocalizedTeamName(displayTeams.away);
  const versusText = localizeText("vs");
  const dateLabel = options.showDate ? getMatchDateLabel(match, options) : "";
  const dateTimeAriaLabel = getMatchDateTimeAriaLabel(match, options);
  const visibleTimeLabel = getMatchVisibleTimeLabel(match, options);
  const rowDateTimeLabel = dateTimeAriaLabel ? `, ${dateTimeAriaLabel}` : "";
  const isLiveState = match.status === "LIVE" || state === "live";
  const scoreLabel = isLiveState ? localizeText("current score") : localizeText("final score");
  const pendingScoreText = getScorePendingText(match, state, currentTime);
  const displayScore = getDisplayScore(match, state);
  const winnerSide = getMatchScoreOutcomeSide(match, displayScore);
  const stateLabel =
    state === "live" ? `${localizeText("Live")}, ` : state === "next" ? `${localizeText("Up next")}, ` : "";
  const statusLabel = match.status === "CANCELLED" ? `, ${localizeText("cancelled")}` : "";
  const scoreStatus = renderScoreStatus(match, state, currentTime);
  const stateBadge =
    state === "live"
      ? renderLivePill({ match })
      : state === "next"
        ? `<span class="up-next-pill">${escapeHtml(localizeText("Up next"))}</span>`
        : "";
  const score = renderScore(match, state, options);
  const rowMeta = `${stateBadge}${scoreStatus}${score}`;
  const rowLabel = `${stateLabel}${homeName} ${versusText} ${awayName}${rowDateTimeLabel}${statusLabel}${
    displayScore
      ? `, ${scoreLabel} ${getMatchVisibleScoreText(match, displayScore)}`
      : pendingScoreText
        ? `, ${pendingScoreText.toLowerCase()}`
        : ""
  }`;

  row.className = `match-row is-${state}`;
  row.dataset.matchId = match.id;
  row.dataset.state = state;
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", rowLabel);
  row.innerHTML = `
    <button class="match-row-trigger" type="button" aria-label="${escapeHtml(rowLabel)}" aria-pressed="false">
      <time class="match-time${dateLabel ? " has-date" : ""}" datetime="${escapeHtml(getMatchDateTimeValue(match))}" title="${escapeHtml(dateTimeAriaLabel)}" aria-label="${escapeHtml(dateTimeAriaLabel)}">
        <span class="${dateLabel ? "match-date" : "match-clock"}">${escapeHtml(visibleTimeLabel)}</span>
      </time>
      <span class="match-teams">
        ${renderTeamInline(displayTeams.home, getTeamClass("team match-team-home", winnerSide, "home"), { showRank: false })}
        <span class="versus match-versus">${escapeHtml(versusText)}</span>
        ${renderTeamInline(displayTeams.away, getTeamClass("team match-team-away", winnerSide, "away"), { showRank: false })}
      </span>
    </button>
    ${rowMeta ? `<span class="match-row-meta">${rowMeta}</span>` : ""}
  `;

  row.addEventListener("pointerenter", (event) => {
    if (!isRestoringHistoryState && shouldPreviewMatchInfoOnHover(event)) {
      renderMatchInfo(match);
    }
  });
  row.addEventListener("focusin", () => {
    if (syncUrl && !isRestoringHistoryState) {
      renderMatchInfo(match);
    }
  });
  row.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      return;
    }

    if (shouldIgnoreContainerClickForTooltip(event.target)) {
      event.preventDefault();
      return;
    }

    renderMatchInfo(match, { reveal: true });
    updateUrlState({ historyMode: "push" });
  });

  return row;
}

function formatGoalDifference(goalDifference) {
  if (goalDifference > 0) {
    return `+${goalDifference}`;
  }

  return String(goalDifference);
}

function formatOrdinal(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "";
  }

  const absolute = Math.abs(number);
  const mod100 = absolute % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? "th"
      : absolute % 10 === 1
        ? "st"
        : absolute % 10 === 2
          ? "nd"
          : absolute % 10 === 3
            ? "rd"
            : "th";

  return `${number}${suffix}`;
}

function getTournamentFormatNumber(keys, fallback) {
  const format = tournament.format || {};

  for (const keyPath of keys) {
    const value = keyPath.split(".").reduce((item, key) => item?.[key], format);
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return fallback;
}

function getAutomaticAdvancersPerGroup() {
  return getTournamentFormatNumber(
    ["automaticAdvancersPerGroup", "groupStage.automaticAdvancersPerGroup"],
    DEFAULT_AUTOMATIC_ADVANCERS_PER_GROUP
  );
}

function getThirdPlaceAdvancerCount() {
  const groupCount = tournament.groups?.length || 0;
  const configuredAdvancers = getTournamentFormatNumber(
    ["bestThirdPlaceAdvancers", "thirdPlaceAdvancers", "groupStage.bestThirdPlaceAdvancers"],
    null
  );

  if (Number.isInteger(configuredAdvancers) && configuredAdvancers >= 0) {
    return Math.min(configuredAdvancers, groupCount);
  }

  const knockoutFieldSize = getTournamentFormatNumber(
    ["knockoutFieldSize", "roundOf32Size", "knockout.fieldSize"],
    DEFAULT_KNOCKOUT_FIELD_SIZE
  );
  const automaticAdvancersPerGroup = getAutomaticAdvancersPerGroup();
  const computedAdvancers = knockoutFieldSize - groupCount * automaticAdvancersPerGroup;

  if (Number.isFinite(computedAdvancers)) {
    return Math.min(groupCount, Math.max(0, computedAdvancers));
  }

  return Math.min(DEFAULT_THIRD_PLACE_ADVANCERS, groupCount);
}

function getFifaRankValue(team) {
  const rank = Number(team.fifaRank);
  return Number.isFinite(rank) ? rank : Number.POSITIVE_INFINITY;
}

function getTeamConductScore(row) {
  const value =
    row.teamConductScore ?? row.conductScore ?? row.fairPlayScore ?? row.fairPlayPoints;
  const score = Number(value);

  return Number.isFinite(score) ? score : null;
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

function getThirdPlaceStatus(candidate, advancerCount) {
  const isInside = candidate.position <= advancerCount;

  if (isInside) {
    return {
      kind: "in",
      label: "Advancing",
      detail: "Advancing to Round of 32."
    };
  }

  return {
    kind: "eliminated",
    label: "Eliminated",
    detail: "Eliminated at group stage."
  };
}

function annotateThirdPlaceRaceRows(rows, advancerCount) {
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
    const isEliminated = isTeamEliminatedFromGroupStage(row.teamId, row.groupId);
    const candidate = { ...row, isEliminated };
    const advancementEstimate = getThirdPlaceAdvancementEstimate(candidate);
    const candidateWithEstimate = { ...candidate, advancementEstimate };

    return {
      ...candidateWithEstimate,
      status: getThirdPlaceStatus(candidateWithEstimate, advancerCount)
    };
  });
}

function getThirdPlaceRaceRows() {
  const rows = (tournament.groups || [])
    .map((group, groupIndex) => {
      const standing = getStandingsRows(group.id)[THIRD_PLACE_STANDING_INDEX];

      if (!standing) {
        return null;
      }

      return {
        ...standing,
        conductScore: getTeamConductScore(standing),
        gamesLeft: getRemainingTeamGroupFixtures(standing.teamId, group.id).length,
        groupId: group.id,
        groupIndex,
        groupLabel: group.label || `Group ${group.id}`,
        team: getTeam(standing.teamId)
      };
    })
    .filter(Boolean)
    .sort(compareThirdPlaceCandidates);

  return annotateThirdPlaceRaceRows(rows, getThirdPlaceAdvancerCount());
}

function getThirdPlaceRaceByTeamId() {
  return new Map(getThirdPlaceRaceRows().map((candidate) => [candidate.teamId, candidate]));
}

function getGroupStagePathPlaceCount(rowCount = 0) {
  const automaticPlaces = getAutomaticAdvancersPerGroup();
  const thirdPlaceRacePlaces = getThirdPlaceAdvancerCount() > 0 ? 1 : 0;
  const possiblePlaces = automaticPlaces + thirdPlaceRacePlaces;

  return rowCount > 0 ? Math.min(rowCount, possiblePlaces) : possiblePlaces;
}

function isFinishedGroupFixture(fixture) {
  return fixture.status === "FT";
}

function hasUsableScore(fixture) {
  return Number.isFinite(Number(fixture?.score?.home)) && Number.isFinite(Number(fixture?.score?.away));
}

function getGroupFixtures(groupId) {
  return fixtures.filter((fixture) => fixture.stage === "group" && fixture.groupId === groupId);
}

function isGroupFinished(groupId) {
  const groupFixtures = getGroupFixtures(groupId);

  return groupFixtures.length > 0 && groupFixtures.every(isFinishedGroupFixture);
}

function isGroupStageFinished() {
  const groupFixtures = fixtures.filter((fixture) => fixture.stage === "group");

  return groupFixtures.length > 0 && groupFixtures.every(isFinishedGroupFixture);
}

function createGroupQualificationStates(groupId) {
  const group = getGroup(groupId);
  const sourceRowsByTeamId = new Map(
    (standingsByGroup[groupId] || []).map((row) => [row.teamId, row])
  );
  const states = new Map(
    (group?.teamIds || []).map((teamId, index) => [
      teamId,
      {
        conductScore: getTeamConductScore(sourceRowsByTeamId.get(teamId)),
        draws: 0,
        ga: 0,
        gd: 0,
        gf: 0,
        losses: 0,
        played: 0,
        pts: 0,
        seededOrder: index,
        teamId,
        wins: 0
      }
    ])
  );

  return states;
}

function cloneGroupQualificationStates(states) {
  return new Map([...states.entries()].map(([teamId, state]) => [teamId, { ...state }]));
}

function applyGroupQualificationResult(states, result) {
  const home = states.get(result.homeTeamId);
  const away = states.get(result.awayTeamId);

  if (!home || !away) {
    return;
  }

  const homeGoals = Number(result.homeGoals);
  const awayGoals = Number(result.awayGoals);
  const homeWin = homeGoals > awayGoals;
  const awayWin = awayGoals > homeGoals;

  home.played += 1;
  away.played += 1;
  home.gf += homeGoals;
  home.ga += awayGoals;
  home.gd += homeGoals - awayGoals;
  away.gf += awayGoals;
  away.ga += homeGoals;
  away.gd += awayGoals - homeGoals;

  if (homeWin) {
    home.pts += 3;
    home.wins += 1;
    away.losses += 1;
    return;
  }

  if (awayWin) {
    away.pts += 3;
    away.wins += 1;
    home.losses += 1;
    return;
  }

  home.pts += 1;
  away.pts += 1;
  home.draws += 1;
  away.draws += 1;
}

function getCompletedGroupQualificationResults(groupFixtures) {
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

function getRemainingGroupQualificationFixtures(groupFixtures) {
  return groupFixtures.filter(
    (fixture) =>
      fixture.status !== "FT" &&
      fixture.homeTeamId &&
      fixture.awayTeamId
  );
}

function getProjectedGroupQualificationResults(fixture) {
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

function createGroupQualificationProjection(groupId) {
  const groupFixtures = getGroupFixtures(groupId);
  const completedGroupFixtures = groupFixtures.filter((fixture) => fixture.status === "FT");

  if (completedGroupFixtures.some((fixture) => !hasUsableScore(fixture))) {
    return null;
  }

  const baseStates = createGroupQualificationStates(groupId);
  const completedResults = getCompletedGroupQualificationResults(groupFixtures);
  completedResults.forEach((result) => applyGroupQualificationResult(baseStates, result));

  return {
    baseStates,
    completedResults,
    remainingFixtures: getRemainingGroupQualificationFixtures(groupFixtures)
  };
}

function compareGroupQualificationScenarioRows(a, b, scenarioRows, states, results) {
  if (a.pts !== b.pts) {
    return b.pts - a.pts;
  }

  const tiedTeamIds = scenarioRows
    .filter((row) => row.pts === a.pts)
    .map((row) => row.teamId);

  if (isTeamDefinitelyAboveInTie(a.teamId, b.teamId, tiedTeamIds, states, results)) {
    return -1;
  }

  if (isTeamDefinitelyAboveInTie(b.teamId, a.teamId, tiedTeamIds, states, results)) {
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

function getGroupQualificationScenarioRows(groupId, states, results) {
  const group = getGroup(groupId);
  const groupIndex = (tournament.groups || []).findIndex((groupItem) => groupItem.id === groupId);
  const groupLabel = group?.label || `Group ${groupId}`;
  const scenarioRows = [...states.values()];

  return [...scenarioRows]
    .sort((a, b) => compareGroupQualificationScenarioRows(a, b, scenarioRows, states, results))
    .map((row, index) => ({
      ...row,
      conductScore: getTeamConductScore(row),
      groupId,
      groupIndex,
      groupLabel,
      position: index + 1,
      team: getTeam(row.teamId)
    }));
}

function getFallbackGroupQualificationScenarios(groupId) {
  const group = getGroup(groupId);
  const groupIndex = (tournament.groups || []).findIndex((groupItem) => groupItem.id === groupId);
  const rows = getStandingsRows(groupId).map((row, index) => ({
    ...row,
    conductScore: getTeamConductScore(row),
    groupId,
    groupIndex,
    groupLabel: group?.label || `Group ${groupId}`,
    position: index + 1,
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

function getGroupQualificationScenarios(groupId) {
  const cacheKey = String(groupId || "");
  if (thirdPlaceGroupScenarioCache.has(cacheKey)) {
    return thirdPlaceGroupScenarioCache.get(cacheKey);
  }

  const projection = createGroupQualificationProjection(groupId);
  if (!projection) {
    const fallbackScenarios = getFallbackGroupQualificationScenarios(groupId);
    thirdPlaceGroupScenarioCache.set(cacheKey, fallbackScenarios);
    return fallbackScenarios;
  }

  const scenarios = [];

  function visit(fixtureIndex, states, results) {
    if (fixtureIndex >= projection.remainingFixtures.length) {
      scenarios.push({
        isFallback: false,
        results,
        rows: getGroupQualificationScenarioRows(groupId, states, results)
      });
      return;
    }

    const fixture = projection.remainingFixtures[fixtureIndex];
    getProjectedGroupQualificationResults(fixture).forEach((result) => {
      const nextStates = cloneGroupQualificationStates(states);
      applyGroupQualificationResult(nextStates, result);
      visit(fixtureIndex + 1, nextStates, [...results, result]);
    });
  }

  visit(0, projection.baseStates, projection.completedResults);

  const scenarioRows = scenarios.length ? scenarios : getFallbackGroupQualificationScenarios(groupId);
  thirdPlaceGroupScenarioCache.set(cacheKey, scenarioRows);
  return scenarioRows;
}

function formatThirdPlaceAdvancementPercent(probability) {
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

function getThirdPlaceScenarioAdvancementProbability(targetThirdPlaceRow, targetGroupId) {
  const advancerCount = getThirdPlaceAdvancerCount();
  let distribution = [1];
  let totalCombinations = 1;

  for (const group of tournament.groups || []) {
    if (group.id === targetGroupId) {
      continue;
    }

    const scenarios = getGroupQualificationScenarios(group.id);
    const scenarioCount = scenarios.length || 1;
    const aboveCount = scenarios.filter((scenario) => {
      const thirdPlaceRow = scenario.rows[THIRD_PLACE_STANDING_INDEX];
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

function getThirdPlaceAdvancementEstimate(candidate) {
  const cacheKey = `${candidate.groupId || ""}:${candidate.teamId || ""}:${candidate.pts}:${candidate.gd}:${candidate.gf}:${candidate.isEliminated ? "out" : "live"}`;
  if (thirdPlaceAdvancementEstimateCache.has(cacheKey)) {
    return thirdPlaceAdvancementEstimateCache.get(cacheKey);
  }

  const targetScenarios = getGroupQualificationScenarios(candidate.groupId);
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

    if (targetRow.position === THIRD_PLACE_STANDING_INDEX + 1) {
      thirdPlaceScenarioCount += 1;
      chanceTotal += getThirdPlaceScenarioAdvancementProbability(targetRow, candidate.groupId);
      return;
    }

    outScenarioCount += 1;
  });

  const modeledScenarioCount = targetScenarios.length;
  const rawProbability = modeledScenarioCount > 0 ? chanceTotal / modeledScenarioCount : null;
  const probability = candidate.isEliminated ? 0 : rawProbability;
  const estimate = {
    automaticScenarioCount,
    displayPercent: formatThirdPlaceAdvancementPercent(probability),
    groupScenarioCount: modeledScenarioCount,
    outScenarioCount,
    probability,
    remainingGroupMatchCount: fixtures.filter((fixture) => fixture.stage === "group" && fixture.status !== "FT").length,
    thirdPlaceScenarioCount,
    usesFallback: targetScenarios.some((scenario) => scenario.isFallback)
  };

  thirdPlaceAdvancementEstimateCache.set(cacheKey, estimate);
  return estimate;
}

function getGroupThirdPlacePointFloor(groupId) {
  const cacheKey = String(groupId || "");
  if (groupThirdPlacePointFloorCache.has(cacheKey)) {
    return groupThirdPlacePointFloorCache.get(cacheKey);
  }

  const projection = createGroupQualificationProjection(groupId);
  if (!projection) {
    groupThirdPlacePointFloorCache.set(cacheKey, null);
    return null;
  }

  let floor = Number.POSITIVE_INFINITY;

  function visit(fixtureIndex, states) {
    if (fixtureIndex >= projection.remainingFixtures.length) {
      const points = [...states.values()].map((state) => state.pts).sort((a, b) => b - a);
      const thirdPlacePoints = points[THIRD_PLACE_STANDING_INDEX];

      if (Number.isFinite(thirdPlacePoints)) {
        floor = Math.min(floor, thirdPlacePoints);
      }
      return;
    }

    const fixture = projection.remainingFixtures[fixtureIndex];
    getProjectedGroupQualificationResults(fixture).forEach((result) => {
      const nextStates = cloneGroupQualificationStates(states);
      applyGroupQualificationResult(nextStates, result);
      visit(fixtureIndex + 1, nextStates);
    });
  }

  visit(0, projection.baseStates);

  const pointFloor = Number.isFinite(floor) ? floor : null;
  groupThirdPlacePointFloorCache.set(cacheKey, pointFloor);
  return pointFloor;
}

function getTeamMaximumPossibleGroupPoints(teamId, groupId) {
  const cacheKey = `${groupId || ""}:${teamId || ""}`;
  if (teamMaximumGroupPointsCache.has(cacheKey)) {
    return teamMaximumGroupPointsCache.get(cacheKey);
  }

  const projection = createGroupQualificationProjection(groupId);
  const state = projection?.baseStates.get(teamId);
  if (!state) {
    teamMaximumGroupPointsCache.set(cacheKey, null);
    return null;
  }

  const maximumPoints =
    state.pts +
    projection.remainingFixtures.filter(
      (fixture) => fixture.homeTeamId === teamId || fixture.awayTeamId === teamId
    ).length *
      3;

  teamMaximumGroupPointsCache.set(cacheKey, maximumPoints);
  return maximumPoints;
}

function clearGroupQualificationCaches() {
  thirdPlaceAdvancementEstimateCache.clear();
  thirdPlaceGroupScenarioCache.clear();
  groupThirdPlacePointFloorCache.clear();
  teamGroupStageEliminationCache.clear();
  teamMaximumGroupPointsCache.clear();
}

function getHeadToHeadStats(tiedTeamIds, results) {
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

      if (!home || !away) {
        return;
      }

      home.fixedOnly = home.fixedOnly && result.fixed;
      away.fixedOnly = away.fixedOnly && result.fixed;
      home.gf += result.homeGoals;
      home.gd += result.homeGoals - result.awayGoals;
      away.gf += result.awayGoals;
      away.gd += result.awayGoals - result.homeGoals;

      if (result.homeGoals > result.awayGoals) {
        home.pts += 3;
      } else if (result.awayGoals > result.homeGoals) {
        away.pts += 3;
      } else {
        home.pts += 1;
        away.pts += 1;
      }
    });

  return stats;
}

function hasUnfixedResultForTeams(teamIds, results) {
  const teamIdSet = new Set(teamIds);

  return results.some(
    (result) =>
      !result.fixed &&
      (teamIdSet.has(result.homeTeamId) || teamIdSet.has(result.awayTeamId))
  );
}

function isTeamDefinitelyAboveInTie(otherTeamId, targetTeamId, tiedTeamIds, states, results) {
  const headToHeadStats = getHeadToHeadStats(tiedTeamIds, results);
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

  if (hasUnfixedResultForTeams(tiedTeamIds, results)) {
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

function canTeamReachGroupStagePathInScenario(teamId, states, results, pathPlaceCount) {
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

    return isTeamDefinitelyAboveInTie(state.teamId, teamId, tiedTeamIds, states, results);
  });

  return teamsDefinitelyAbove.length < pathPlaceCount;
}

function canTeamStillReachGroupStagePath(teamId, groupId, pathPlaceCount) {
  if (!teamId || !groupId || !Number.isFinite(Number(pathPlaceCount)) || Number(pathPlaceCount) <= 0) {
    return true;
  }

  const projection = createGroupQualificationProjection(groupId);
  if (!projection) {
    return true;
  }

  function visit(fixtureIndex, states, results) {
    if (fixtureIndex >= projection.remainingFixtures.length) {
      return canTeamReachGroupStagePathInScenario(teamId, states, results, pathPlaceCount);
    }

    const fixture = projection.remainingFixtures[fixtureIndex];
    return getProjectedGroupQualificationResults(fixture).some((result) => {
      const nextStates = cloneGroupQualificationStates(states);
      applyGroupQualificationResult(nextStates, result);
      return visit(fixtureIndex + 1, nextStates, [...results, result]);
    });
  }

  return visit(0, projection.baseStates, projection.completedResults);
}

function canTeamStillAdvanceAsThirdPlace(teamId, groupId) {
  const thirdPlaceAdvancerCount = getThirdPlaceAdvancerCount();
  if (thirdPlaceAdvancerCount <= 0) {
    return false;
  }

  const group = getGroup(groupId);
  const pathPlaceCount = getGroupStagePathPlaceCount(group?.teamIds?.length || 0);
  if (!canTeamStillReachGroupStagePath(teamId, groupId, pathPlaceCount)) {
    return false;
  }

  const maximumPoints = getTeamMaximumPossibleGroupPoints(teamId, groupId);
  if (!Number.isFinite(maximumPoints)) {
    return true;
  }

  const guaranteedAboveCount = (tournament.groups || []).filter((groupItem) => {
    if (groupItem.id === groupId) {
      return false;
    }

    const pointFloor = getGroupThirdPlacePointFloor(groupItem.id);
    return Number.isFinite(pointFloor) && pointFloor > maximumPoints;
  }).length;

  return guaranteedAboveCount < thirdPlaceAdvancerCount;
}

function isTeamEliminatedFromGroupStage(teamId, groupId, rowCount = 0) {
  if (!teamId || !groupId) {
    return false;
  }

  const cacheKey = `${groupId}:${teamId}:${rowCount || ""}`;
  if (teamGroupStageEliminationCache.has(cacheKey)) {
    return teamGroupStageEliminationCache.get(cacheKey);
  }

  const group = getGroup(groupId);
  const groupRowCount = rowCount || group?.teamIds?.length || 0;
  const automaticPlaces = groupRowCount
    ? Math.min(groupRowCount, getAutomaticAdvancersPerGroup())
    : getAutomaticAdvancersPerGroup();
  const canReachAutomaticPlace = canTeamStillReachGroupStagePath(teamId, groupId, automaticPlaces);
  const isEliminated =
    !canReachAutomaticPlace && !canTeamStillAdvanceAsThirdPlace(teamId, groupId);

  teamGroupStageEliminationCache.set(cacheKey, isEliminated);
  return isEliminated;
}

function isStandingRowEliminated(rowIndex, rows, options = {}) {
  const { groupId = "" } = options;
  return isTeamEliminatedFromGroupStage(rows[rowIndex]?.teamId, groupId, rows.length);
}

function isConfirmedStandingAdvancer(row, rowIndex, options = {}) {
  const { groupId = "", thirdPlaceCandidate = null } = options;
  const automaticPlaces = Math.min(
    rowIndex >= 0 ? getAutomaticAdvancersPerGroup() : 0,
    getGroup(groupId)?.teamIds?.length || getAutomaticAdvancersPerGroup()
  );

  if (isGroupFinished(groupId) && rowIndex < automaticPlaces) {
    return true;
  }

  if (
    isGroupStageFinished() &&
    thirdPlaceCandidate?.teamId === row?.teamId &&
    thirdPlaceCandidate.position <= getThirdPlaceAdvancerCount() &&
    !thirdPlaceCandidate.isCutLineTie
  ) {
    return true;
  }

  return false;
}

const STANDING_HEADERS = [
  { label: "Team" },
  {
    label: "Pts",
    help:
      "Points rank teams in the group: 3 for a win, 1 for a draw, 0 for a loss. More points usually means a better chance to advance."
  },
  {
    label: "W-D-L",
    help:
      "Wins-Draws-Losses shows a team's group record. Wins add points fastest, which helps explain why a team is higher or lower."
  },
  {
    label: "GD",
    help:
      "Goal difference is goals scored minus goals allowed. If teams are tied on points, a better goal difference can help decide who advances."
  }
];

const THIRD_PLACE_HEADERS = [
  { label: "Rank" },
  { label: "Team" },
  { label: "Group" },
  {
    label: "Pts",
    help:
      "Points compare third-place teams: 3 for a win, 1 for a draw, 0 for a loss. More points puts a team closer to the top eight."
  },
  {
    label: "GD",
    help:
      "Goal difference is goals scored minus goals allowed. In the third-place race, it helps break ties after points."
  },
  {
    label: "Goals",
    help:
      "Goals scored is the total goals for. It can break ties after points and goal difference in the third-place race."
  },
  {
    label: "Status",
    help:
      "Status shows whether this third-place team is advancing to the Round of 32 or eliminated at the group stage."
  }
];

function renderStandingHeaderCell(header) {
  const label = localizeText(header.label);
  if (!header.help) {
    return `<th>${escapeHtml(label)}</th>`;
  }

  const help = localizeText(header.help);
  return `
    <th>
      <span class="standing-help" tabindex="0" aria-label="${escapeHtml(`${label}: ${help}`)}" data-tooltip="${escapeHtml(help)}">
        ${escapeHtml(label)}
      </span>
    </th>
  `;
}

function renderStandingsTableHead() {
  return `
    <thead>
      <tr>
        ${STANDING_HEADERS.map(renderStandingHeaderCell).join("")}
      </tr>
    </thead>
  `;
}

function enrichStanding(row, group) {
  const gd = row.gf - row.ga;
  const pts = row.wins * 3 + row.draws;
  const seededOrder = group?.teamIds.indexOf(row.teamId) ?? 99;
  return { ...row, gd, pts, seededOrder };
}

function getStandingsRows(groupId) {
  const group = getGroup(groupId);
  const sourceRows = standingsByGroup[groupId] || [];
  const rows = sourceRows.length
    ? sourceRows
    : (group?.teamIds || []).map((teamId) => ({
        teamId,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        gf: 0,
        ga: 0
      }));

  const enrichedRows = rows.map((row, index) => ({
    ...enrichStanding(row, group),
    sourceOrder: index
  }));

  if (sourceRows.length) {
    return enrichedRows.sort((a, b) => a.sourceOrder - b.sourceOrder);
  }

  return enrichedRows.sort(
    (a, b) =>
      b.pts - a.pts ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.seededOrder - b.seededOrder ||
      getTeam(a.teamId).name.localeCompare(getTeam(b.teamId).name)
  );
}

function renderStandingTeam(team, options = {}) {
  const { showRank = true, trailingHtml = "" } = options;
  const standingName = getLocalizedStandingName(team);
  const fullName = getLocalizedTeamName(team) || standingName;
  const hasStandingBadges = Boolean(trailingHtml.trim());
  const teamClasses = `standing-team${hasStandingBadges ? " has-standing-badges" : ""}`;
  const tooltipAttributes = fullName ? ` data-tooltip="${escapeHtml(fullName)}"` : "";
  const teamIdAttribute = team?.id ? ` data-team-id="${escapeHtml(team.id)}"` : "";
  const rankHtml = showRank ? renderRank(team) : "";
  const statusBadgeHtml = trailingHtml.trim();
  const nameLineRankHtml = hasStandingBadges ? "" : rankHtml;
  const badgeRowHtml = hasStandingBadges ? `${rankHtml}${statusBadgeHtml}` : statusBadgeHtml;

  return `
    <span class="${teamClasses}"${teamIdAttribute} aria-label="${escapeHtml(fullName)}"${tooltipAttributes}>
      ${renderFlag(team)}
      <span class="standing-team-copy">
        <span class="standing-name-line">
          <span class="standing-name" aria-label="${escapeHtml(fullName)}" title="${escapeHtml(fullName)}">${escapeHtml(standingName)}</span>
          ${nameLineRankHtml}
        </span>
        ${badgeRowHtml ? `<span class="standing-badge-row">${badgeRowHtml}</span>` : ""}
      </span>
    </span>
  `;
}

function renderThirdPlaceStandingBadge(candidate) {
  const status = candidate.status || getThirdPlaceStatus(candidate, getThirdPlaceAdvancerCount());
  const rankLabel = formatOrdinal(candidate.position);
  const isAdvancing = status.label === "Advancing";
  const statusLabel = localizeText(isAdvancing ? "Advancing" : "Not advancing");
  const reason = localizeMultilineText(
    isAdvancing
      ? "Advancing to Round of 32 as a top-eight third-place team."
      : "Not advancing. Eliminated at group stage."
  );
  const label =
    currentLanguage === "zh"
      ? `${getLocalizedTeamName(candidate.team)} ${localizeText(`3rd race ${rankLabel}`)}：${statusLabel}。${reason}`
      : `${getLocalizedTeamName(candidate.team)} ${localizeText(`3rd race ${rankLabel}`)}: ${statusLabel}. ${reason}`;

  return `
    <span class="third-place-pill is-${escapeHtml(status.kind)}" tabindex="0" aria-label="${escapeHtml(label)}" data-tooltip="${escapeHtml(reason)}">
      ${escapeHtml(localizeText(`3rd race ${rankLabel}`))}
    </span>
  `;
}

function renderEliminatedStandingBadge(team) {
  const reason = localizeText("Eliminated at group stage.");
  const label =
    currentLanguage === "zh"
      ? `${getLocalizedTeamName(team)}：${localizeText("Eliminated")}。${reason}`
      : `${getLocalizedTeamName(team)}: ${localizeText("Eliminated")}. ${reason}`;

  return `
    <span class="standing-status-pill is-eliminated" tabindex="0" aria-label="${escapeHtml(label)}" data-tooltip="${escapeHtml(reason)}">
      ${escapeHtml(localizeText("Eliminated"))}
    </span>
  `;
}

function renderStandingRow(row, options = {}) {
  const team = getTeam(row.teamId);
  const {
    groupId = "",
    rowIndex = 0,
    rows = [],
    showRank = true,
    thirdPlaceRaceByTeamId = null
  } = options;
  const thirdPlaceCandidate = thirdPlaceRaceByTeamId?.get(row.teamId);
  const isConfirmedAdvancer = isConfirmedStandingAdvancer(row, rowIndex, {
    groupId,
    thirdPlaceCandidate
  });
  const isEliminated = isStandingRowEliminated(rowIndex, rows, {
    groupId,
    thirdPlaceCandidate
  });
  const standingBadges = [
    thirdPlaceCandidate ? renderThirdPlaceStandingBadge(thirdPlaceCandidate) : "",
    isEliminated && !thirdPlaceCandidate ? renderEliminatedStandingBadge(team) : ""
  ].join("");
  const rowClasses = [isConfirmedAdvancer ? "is-advancing" : ""].filter(Boolean).join(" ");

  return `
    <tr${rowClasses ? ` class="${escapeHtml(rowClasses)}"` : ""}>
      <td>
        ${renderStandingTeam(team, {
          showRank,
          trailingHtml: standingBadges
        })}
      </td>
      <td>${escapeHtml(row.pts)}</td>
      <td>${escapeHtml(row.wins)}-${escapeHtml(row.draws)}-${escapeHtml(row.losses)}</td>
      <td>${escapeHtml(formatGoalDifference(row.gd))}</td>
    </tr>
  `;
}

function renderStandings(groupId, options = {}) {
  const rows = getStandingsRows(groupId);

  return `
    <table class="standings-table">
      ${renderStandingsTableHead()}
      <tbody>${rows
        .map((row, rowIndex) => renderStandingRow(row, { ...options, groupId, rowIndex, rows }))
        .join("")}</tbody>
    </table>
  `;
}

function getHistoricalStandingsGroups(year) {
  const groups = new Map();

  historicalFixtures
    .filter((fixture) => fixture.tournamentYear === year && fixture.group)
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)))
    .forEach((fixture) => {
      if (!groups.has(fixture.group)) {
        groups.set(fixture.group, fixture.group);
      }
    });

  return [...groups.values()];
}

function getHistoricalStandingsWinPoints(year) {
  const tournamentYear = Number(year);
  return Number.isFinite(tournamentYear) && tournamentYear < 1994 ? 2 : 3;
}

function getHistoricalStandingsRowsFromFixtures(fixtures, year) {
  const rows = new Map();
  const winPoints = getHistoricalStandingsWinPoints(year);

  for (const fixture of fixtures) {
    if (!fixture.homeSlot || !fixture.awaySlot) {
      continue;
    }

    initializeHistoricalStanding(rows, fixture.homeSlot);
    initializeHistoricalStanding(rows, fixture.awaySlot);

    if (fixture.status !== "FT" || !fixture.score) {
      continue;
    }

    const homeScore = Number(fixture.score.home);
    const awayScore = Number(fixture.score.away);

    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
      continue;
    }

    const home = initializeHistoricalStanding(rows, fixture.homeSlot);
    const away = initializeHistoricalStanding(rows, fixture.awaySlot);

    home.played += 1;
    away.played += 1;
    home.gf += homeScore;
    home.ga += awayScore;
    away.gf += awayScore;
    away.ga += homeScore;

    if (homeScore > awayScore) {
      home.wins += 1;
      home.points += winPoints;
      away.losses += 1;
    } else if (awayScore > homeScore) {
      away.wins += 1;
      away.points += winPoints;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }

    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.sourceOrder - b.sourceOrder ||
      a.teamName.localeCompare(b.teamName)
  );
}

function getHistoricalGroupStandingsForYear(year, groupName) {
  const groupFixtures = historicalFixtures
    .filter((fixture) => fixture.tournamentYear === year && fixture.group === groupName)
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)));

  return getHistoricalStandingsRowsFromFixtures(groupFixtures, year);
}

function getHistoricalGroupAdvancingTeamNames(year, groupName) {
  const groupFixtures = historicalFixtures.filter(
    (fixture) => fixture.tournamentYear === year && fixture.group === groupName
  );

  if (!groupFixtures.length) {
    return new Set();
  }

  const groupEndSortValue = groupFixtures
    .map(getFixtureSortValue)
    .sort((a, b) => b.localeCompare(a))[0];
  const advancingTeamNames = new Set();

  getHistoricalAdvancementFixturesForYear(year).forEach((fixture) => {
    if (getFixtureSortValue(fixture) <= groupEndSortValue) {
      return;
    }

    [fixture.homeSlot, fixture.awaySlot].filter(Boolean).forEach((teamName) => {
      advancingTeamNames.add(teamName);
    });
  });

  return advancingTeamNames;
}

function shouldHighlightHistoricalStanding(row, year, groupName) {
  return getHistoricalGroupAdvancingTeamNames(year, groupName).has(row.teamName);
}

function getHistoricalRoundStandingsForYear(year, roundName) {
  const normalizedRoundName = normalizeTextKey(roundName);
  const roundFixtures = historicalFixtures
    .filter(
      (fixture) =>
        fixture.tournamentYear === year &&
        normalizeTextKey(normalizeHistoricalTournamentRoundLabel(fixture.round)) === normalizedRoundName
    )
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)));

  return getHistoricalStandingsRowsFromFixtures(roundFixtures, year);
}

function renderHistoricalStandingTeam(teamName) {
  const team = getHistoricalTeam(teamName);
  const localizedTeamName = localizeText(teamName);
  const fullName = getLocalizedTeamName(team) || localizedTeamName;

  return `
    <span class="standing-team" aria-label="${escapeHtml(fullName)}" data-tooltip="${escapeHtml(fullName)}">
      ${team ? renderFlag(team) : ""}
      <span class="standing-name" aria-label="${escapeHtml(fullName)}" title="${escapeHtml(fullName)}">${escapeHtml(localizedTeamName)}</span>
    </span>
  `;
}

function renderHistoricalStandingRow(row, year, groupName) {
  const isAdvancing = shouldHighlightHistoricalStanding(row, year, groupName);

  return `
    <tr class="${isAdvancing ? "is-advancing" : ""}">
      <td>
        ${renderHistoricalStandingTeam(row.teamName)}
      </td>
      <td>${escapeHtml(row.points)}</td>
      <td>${escapeHtml(row.wins)}-${escapeHtml(row.draws)}-${escapeHtml(row.losses)}</td>
      <td>${escapeHtml(formatGoalDifference(row.gd))}</td>
    </tr>
  `;
}

function renderHistoricalStandingsTable(year, groupName) {
  const rows = getHistoricalGroupStandingsForYear(year, groupName);

  return `
    <table class="standings-table">
      ${renderStandingsTableHead()}
      <tbody>${rows
        .map((row) => renderHistoricalStandingRow(row, year, groupName))
        .join("")}</tbody>
    </table>
  `;
}

function renderThirdPlaceStatus(candidate) {
  const reason = localizeText(candidate.status.detail || "Eliminated at group stage.");
  const statusLabel = localizeText(candidate.status.label);
  const tooltipLabel =
    currentLanguage === "zh" ? `${statusLabel}：${reason}` : `${statusLabel}: ${reason}`;

  return `
    <span class="third-place-status-cell">
      <span class="third-place-status is-${escapeHtml(candidate.status.kind)}" tabindex="0" aria-label="${escapeHtml(tooltipLabel)}" data-tooltip="${escapeHtml(reason)}">
        ${escapeHtml(statusLabel)}
      </span>
    </span>
  `;
}

function formatStandingPoints(points) {
  return `${points} ${points === 1 ? "point" : "points"}`;
}

function formatGoalsScored(goals) {
  return `${goals} ${goals === 1 ? "goal" : "goals"} scored`;
}

function formatThirdPlaceRaceIntro(candidate, raceRows) {
  const teamName = getLocalizedTeamName(candidate.team);
  const raceTeamCount = raceRows.length || tournament.groups?.length || 0;
  const raceScope = raceTeamCount
    ? `${formatOrdinal(candidate.position)} of ${raceTeamCount} third-place teams`
    : "in the third-place race";
  return `${teamName}: ${raceScope}.\nTop ${getThirdPlaceAdvancerCount()} advance.`;
}

function getRemainingTeamGroupFixtures(teamId, groupId) {
  return getRemainingGroupQualificationFixtures(getGroupFixtures(groupId)).filter(
    (fixture) => fixture.homeTeamId === teamId || fixture.awayTeamId === teamId
  );
}

function getThirdPlaceComparisonTarget(candidate, raceRows = getThirdPlaceRaceRows()) {
  if (raceRows.length <= 1) {
    return null;
  }

  const advancerCount = getThirdPlaceAdvancerCount();
  const targetIndex = candidate.position <= advancerCount ? advancerCount : advancerCount - 1;
  return raceRows[targetIndex] || null;
}

function getThirdPlaceComparisonDecider(candidate, target) {
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

function formatThirdPlaceDeciderLabel(label) {
  const labels = {
    "FIFA ranking fallback": "FIFA ranking",
    "deterministic loaded order": "loaded order",
    "loaded fair-play conduct": "fair-play score"
  };
  return labels[label] || label;
}

function formatThirdPlaceShortComparison(decider) {
  const deciderLabel = formatThirdPlaceDeciderLabel(decider.label);
  const stripPointLabel = (value) => String(value).replace(/ points?$/, "");
  if (decider.label === "points") {
    return `points ${stripPointLabel(decider.candidateValue)}-${stripPointLabel(decider.targetValue)}`;
  }

  if (decider.label === "goals scored") {
    return `goals ${decider.candidateValue}-${decider.targetValue}`;
  }

  return `${deciderLabel} ${decider.candidateValue} vs ${decider.targetValue}`;
}

function formatThirdPlaceTooltipChanceLine(candidate) {
  const estimate = candidate.advancementEstimate;

  if (estimate?.displayPercent) {
    return `${estimate.displayPercent} to advance`;
  }

  return candidate.status?.label || "";
}

function getThirdPlaceTooltipSituationLine(candidate) {
  const estimate = candidate.advancementEstimate;
  const advancerCount = getThirdPlaceAdvancerCount();
  const probability = estimate?.probability;

  if (candidate.status?.kind === "eliminated" || candidate.isEliminated || probability <= 0) {
    return "No modeled route reaches the Round of 32 from here.";
  }

  if (Number.isFinite(probability) && probability >= 1) {
    return `Remaining matches can change ${getLocalizedTeamName(candidate.team)}'s Round of 32 opponent, but not whether they qualify.`;
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

function formatThirdPlaceShortPoints(points) {
  return `${points} pt${points === 1 ? "" : "s"}`;
}

function getThirdPlaceWatchOutcomeLabel(fixture, result) {
  if (Number(result.homeGoals) === Number(result.awayGoals)) {
    return "A tie";
  }

  const winner = Number(result.homeGoals) > Number(result.awayGoals)
    ? getTeam(fixture.homeTeamId)
    : getTeam(fixture.awayTeamId);
  const winnerName = getLocalizedTeamName(winner);
  const article = /^[AEIO]/i.test(winnerName.trim()) ? "An" : "A";

  return `${article} ${winnerName} win`;
}

function getThirdPlaceSingleResultRow(fixture, result) {
  const groupId = fixture?.groupId;
  if (!groupId) {
    return null;
  }

  const projection = createGroupQualificationProjection(groupId);
  if (!projection) {
    return null;
  }

  const states = cloneGroupQualificationStates(projection.baseStates);
  applyGroupQualificationResult(states, result);

  return getGroupQualificationScenarioRows(groupId, states, [
    ...projection.completedResults,
    result
  ])[THIRD_PLACE_STANDING_INDEX] || null;
}

function getThirdPlaceWatchGroupOrder(candidate, raceRows) {
  const groupIds = [];
  const addGroupId = (groupId) => {
    if (groupId && !groupIds.includes(groupId)) {
      groupIds.push(groupId);
    }
  };
  const comparisonTarget = getThirdPlaceComparisonTarget(candidate, raceRows);

  addGroupId(comparisonTarget?.groupId);
  addGroupId(candidate.groupId);
  fixtures
    .filter((fixture) => fixture.stage === "group" && fixture.status !== "FT")
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)))
    .forEach((fixture) => addGroupId(fixture.groupId));

  return groupIds;
}

function getThirdPlaceWatchEffect(candidate, raceRows = getThirdPlaceRaceRows()) {
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
  const candidateName = getLocalizedTeamName(candidate.team);

  for (const groupId of getThirdPlaceWatchGroupOrder(candidate, raceRows)) {
    const currentThirdPlaceRow = raceRows.find((row) => row.groupId === groupId);
    const currentGroupIsAbove = currentThirdPlaceRow
      ? compareThirdPlaceCandidates(currentThirdPlaceRow, candidate) < 0
      : false;
    const groupFixtures = getRemainingGroupQualificationFixtures(getGroupFixtures(groupId))
      .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)));
    const effects = [];

    for (const fixture of groupFixtures) {
      getProjectedGroupQualificationResults(fixture).forEach((result, resultIndex) => {
        const thirdPlaceRow = getThirdPlaceSingleResultRow(fixture, result);
        if (!thirdPlaceRow) {
          return;
        }

        const resultMovesGroupAbove = compareThirdPlaceCandidates(thirdPlaceRow, candidate) < 0;
        if (!isInside || currentGroupIsAbove || !resultMovesGroupAbove) {
          return;
        }

        const groupLabel = getGroup(groupId)?.label || `Group ${groupId}`;
        const line =
          candidate.position === advancerCount
            ? `${getThirdPlaceWatchOutcomeLabel(fixture, result)} would move ${groupLabel}'s third-place team to ${formatThirdPlaceShortPoints(thirdPlaceRow.pts)}, pushing ${candidateName} out of the current top 8 unless another group falls back.`
            : `${getThirdPlaceWatchOutcomeLabel(fixture, result)} would move ${groupLabel}'s third-place team to ${formatThirdPlaceShortPoints(thirdPlaceRow.pts)}, shrinking ${candidateName}'s cushion above the cut line.`;

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
          getFixtureSortValue(a.fixture).localeCompare(getFixtureSortValue(b.fixture)) ||
          a.resultIndex - b.resultIndex
      )[0];
    }
  }

  return null;
}

function getThirdPlaceWatchLines(candidate, raceRows = getThirdPlaceRaceRows()) {
  const effect = getThirdPlaceWatchEffect(candidate, raceRows);
  if (!effect) {
    return [];
  }

  const homeTeamName = getLocalizedTeamName(getTeam(effect.fixture.homeTeamId));
  const awayTeamName = getLocalizedTeamName(getTeam(effect.fixture.awayTeamId));

  return [
    `Watch: ${homeTeamName} vs ${awayTeamName}`,
    effect.line
  ];
}

function getThirdPlaceReason(candidate, raceRows = getThirdPlaceRaceRows()) {
  const topLines = [
    formatThirdPlaceTooltipChanceLine(candidate),
    "",
    getThirdPlaceTooltipSituationLine(candidate)
  ].filter((line, index) => index === 1 || Boolean(line));
  const watchLines = getThirdPlaceWatchLines(candidate, raceRows);

  return [...topLines, ...(watchLines.length ? ["", ...watchLines] : [])].join("\n");
}

function renderThirdPlaceRaceRow(candidate) {
  const rowClasses = [
    candidate.position <= getThirdPlaceAdvancerCount() ? "is-inside" : "is-outside",
    candidate.isCutLineTie ? "is-cut-line-tie" : "",
    candidate.isEliminated ? "is-eliminated" : "",
    candidate.position === getThirdPlaceAdvancerCount() ? "is-cut-line" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <tr class="${escapeHtml(rowClasses)}">
      <td class="third-place-rank-cell">${escapeHtml(formatOrdinal(candidate.position))}</td>
      <td>${renderStandingTeam(candidate.team)}</td>
      <td>
        <button class="third-place-group-button" type="button" data-group-id="${escapeHtml(candidate.groupId)}" aria-label="${escapeHtml(localizeText(`Open ${candidate.groupLabel} standings`))}">
          ${escapeHtml(localizeText(candidate.groupLabel))}
        </button>
      </td>
      <td>${escapeHtml(candidate.pts)}</td>
      <td>${escapeHtml(formatGoalDifference(candidate.gd))}</td>
      <td>${escapeHtml(candidate.gf)}</td>
      <td>${renderThirdPlaceStatus(candidate)}</td>
    </tr>
  `;
}

function renderThirdPlaceCutLine(advancerCount) {
  return `
    <tr class="third-place-cut-row" aria-hidden="true">
      <td colspan="7">
        <span>${escapeHtml(localizeText(`Top ${advancerCount} advance`))}</span>
      </td>
    </tr>
  `;
}

function renderThirdPlaceRaceTableHead() {
  return `
    <thead>
      <tr>
        ${THIRD_PLACE_HEADERS.map(renderStandingHeaderCell).join("")}
      </tr>
    </thead>
  `;
}

function renderThirdPlaceRaceTable(rows, advancerCount) {
  const tableRows = rows
    .flatMap((candidate) => [
      renderThirdPlaceRaceRow(candidate),
      candidate.position === advancerCount ? renderThirdPlaceCutLine(advancerCount) : ""
    ])
    .join("");

  return `
    <div class="third-place-table-shell">
      <table class="standings-table third-place-table">
        ${renderThirdPlaceRaceTableHead()}
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  `;
}

function renderThirdPlaceRaceLoadingRow(index) {
  const rankClass = ["match-loading-line", "third-place-loading-rank", index >= 9 ? "is-wide" : ""]
    .filter(Boolean)
    .join(" ");

  return `
    <tr class="third-place-loading-row" aria-hidden="true">
      <td><span class="${rankClass}"></span></td>
      <td><span class="match-loading-line third-place-loading-team"></span></td>
      <td><span class="match-loading-line third-place-loading-group"></span></td>
      <td><span class="match-loading-line third-place-loading-stat"></span></td>
      <td><span class="match-loading-line third-place-loading-stat"></span></td>
      <td><span class="match-loading-line third-place-loading-goals"></span></td>
      <td><span class="match-loading-line third-place-loading-status"></span></td>
    </tr>
  `;
}

function renderThirdPlaceRaceLoadingView() {
  return `
    <section class="third-place-race third-place-race-loading" aria-label="${escapeHtml(localizeText("Best third-place race"))}">
      <div class="third-place-table-shell" role="status" aria-busy="true">
        <table class="standings-table third-place-table">
          <caption class="visually-hidden">${escapeHtml(localizeText("Loading standings"))}</caption>
          ${renderThirdPlaceRaceTableHead()}
          <tbody>
            ${Array.from({ length: 8 }, (_, index) => renderThirdPlaceRaceLoadingRow(index)).join("")}
          </tbody>
        </table>
      </div>
      <p class="third-place-note">${escapeHtml(localizeText("Tie order follows points, goal difference, goals scored, loaded fair-play conduct when available, then FIFA ranking as the final deterministic fallback."))}</p>
    </section>
  `;
}

function renderThirdPlaceRaceView() {
  const rows = getThirdPlaceRaceRows();
  const advancerCount = getThirdPlaceAdvancerCount();
  const unresolvedCutLine = rows.some((candidate) => candidate.isCutLineTie);
  const note = unresolvedCutLine
    ? "One or more teams around the cut line are tied on points, goal difference and goals scored. The loaded data does not include fair-play conduct yet, so that part is marked pending."
    : "Tie order follows points, goal difference, goals scored, loaded fair-play conduct when available, then FIFA ranking as the final deterministic fallback.";

  return `
    <section class="third-place-race" aria-label="${escapeHtml(localizeText("Best third-place race"))}">
      ${renderThirdPlaceRaceTable(rows, advancerCount)}
      <p class="third-place-note">${escapeHtml(localizeText(note))}</p>
    </section>
  `;
}

function getKnockoutFixtures() {
  return fixtures
    .filter((fixture) => fixture.stage && fixture.stage !== "group")
    .sort((a, b) => Number(a.matchNumber) - Number(b.matchNumber));
}

function getTournamentFixtureByMatchNumber(matchNumber) {
  return fixtures.find((fixture) => Number(fixture.matchNumber) === Number(matchNumber)) || null;
}

function getTournamentStageLabel(stageId) {
  return localizeStageLabel(tournament.stages.find((stage) => stage.id === stageId)?.label || stageId);
}

function localizeStageLabel(label) {
  if (currentLanguage !== "zh") {
    return label;
  }

  const finalGroupStageMatch = /^(Final round|Second round) (Group .+)$/i.exec(label || "");

  if (finalGroupStageMatch) {
    return `${localizeText(finalGroupStageMatch[1])} ${localizeText(finalGroupStageMatch[2])}`;
  }

  return (
    {
      Final: "决赛",
      "Quarter-finals": "四分之一决赛",
      "Round of 16": "16强赛",
      "Round of 32": "32强赛",
      "Semi-finals": "半决赛",
      "Third-place play-off": "三四名决赛"
    }[label] || localizeText(label)
  );
}

function getTournamentTeamCode(team) {
  const fallback = getStandingName(team || {}).slice(0, 3);
  const value = String(team?.id || team?.code || fallback || "TBD")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();

  return value.slice(0, 3) || "TBD";
}

function getTournamentTeamDisplayName(team) {
  return getLocalizedStandingName(team) || getTournamentTeamCode(team);
}

function getTournamentSlotKey(match, side) {
  return `${Number(match?.matchNumber)}:${side}`;
}

function formatTournamentTopSlotLabel(groupId, place) {
  return `Group ${groupId}${place}`;
}

function formatTournamentThirdPlaceSlotLabel(groupIds = []) {
  return `Group ${groupIds.join("/") || "?"}3`;
}

function parseTournamentGroupPlaceSlot(slotText) {
  const match = /^Group ([A-L]) (winner|runner-up)$/i.exec(slotText || "");

  if (!match) {
    return null;
  }

  const groupId = match[1].toUpperCase();
  const place = match[2].toLowerCase() === "winner" ? 1 : 2;

  return {
    groupId,
    kind: "group-place",
    label: formatTournamentTopSlotLabel(groupId, place),
    place,
    slotText
  };
}

function parseTournamentThirdPlaceSlot(slotText) {
  const match = /^Group ([A-L](?:\/[A-L])*) third place$/i.exec(slotText || "");

  if (!match) {
    return null;
  }

  return {
    allowedGroupIds: match[1].split("/").map((groupId) => groupId.toUpperCase()),
    kind: "third-place",
    label: formatTournamentThirdPlaceSlotLabel(match[1].split("/").map((groupId) => groupId.toUpperCase())),
    slotText
  };
}

function getRoundOf32SlotDefinition(match, side) {
  const slotText = match?.[`${side}Slot`] || "";
  const parsedSlot = parseTournamentGroupPlaceSlot(slotText) || parseTournamentThirdPlaceSlot(slotText);

  return {
    key: getTournamentSlotKey(match, side),
    side,
    ...(parsedSlot || {
      kind: "unknown",
      label: slotText || "TBD",
      slotText
    })
  };
}

function getCurrentThirdPlaceAssignment() {
  const candidates = getThirdPlaceRaceRows()
    .filter((candidate) => candidate.position <= getThirdPlaceAdvancerCount())
    .sort((a, b) => a.position - b.position);
  const slots = getKnockoutFixtures()
    .filter((match) => match.stage === "round-of-32")
    .flatMap((match) =>
      ["home", "away"]
        .map((side) => getRoundOf32SlotDefinition(match, side))
        .filter((slot) => slot.kind === "third-place")
    );
  const assignments = {};
  const usedGroupIds = new Set();

  function visit(slotIndex) {
    if (slotIndex >= slots.length) {
      return true;
    }

    const slot = slots[slotIndex];

    for (const candidate of candidates) {
      if (usedGroupIds.has(candidate.groupId) || !slot.allowedGroupIds.includes(candidate.groupId)) {
        continue;
      }

      assignments[slot.key] = candidate.groupId;
      usedGroupIds.add(candidate.groupId);

      if (visit(slotIndex + 1)) {
        return true;
      }

      usedGroupIds.delete(candidate.groupId);
      delete assignments[slot.key];
    }

    return false;
  }

  if (visit(0)) {
    return assignments;
  }

  for (const key of Object.keys(assignments)) {
    delete assignments[key];
  }
  usedGroupIds.clear();

  for (const slot of slots) {
    const candidate = candidates.find(
      (row) => slot.allowedGroupIds.includes(row.groupId) && !usedGroupIds.has(row.groupId)
    );

    if (candidate) {
      assignments[slot.key] = candidate.groupId;
      usedGroupIds.add(candidate.groupId);
    }
  }

  return assignments;
}

function getCurrentTournamentSlotTeam(slot, currentThirdPlaceAssignment) {
  if (slot.kind === "group-place") {
    const row = getStandingsRows(slot.groupId)[slot.place - 1];
    return row ? getTeam(row.teamId) : null;
  }

  if (slot.kind === "third-place") {
    const groupId = currentThirdPlaceAssignment?.[slot.key];
    const row = groupId ? getStandingsRows(groupId)[THIRD_PLACE_STANDING_INDEX] : null;
    return row ? getTeam(row.teamId) : null;
  }

  return null;
}

function getTournamentSlotSeedLabel(slot, currentThirdPlaceAssignment) {
  if (slot.kind === "group-place") {
    return formatTournamentTopSlotLabel(slot.groupId, slot.place);
  }

  if (slot.kind === "third-place") {
    const groupId = currentThirdPlaceAssignment?.[slot.key];
    return groupId ? formatTournamentTopSlotLabel(groupId, 3) : formatTournamentThirdPlaceSlotLabel(slot.allowedGroupIds);
  }

  return slot.label || "TBD";
}

function parseTournamentWinnerSource(slotText) {
  const match = /^Winner match (\d+)$/i.exec(slotText || "");
  return match ? Number(match[1]) : null;
}

function parseTournamentRunnerUpSource(slotText) {
  const match = /^Runner-up match (\d+)$/i.exec(slotText || "");
  return match ? Number(match[1]) : null;
}

function getTournamentWinnerSourceMatchNumbers(match) {
  return [match?.homeSlot, match?.awaySlot]
    .map((slotText) => parseTournamentWinnerSource(slotText) || parseTournamentRunnerUpSource(slotText))
    .filter(Boolean);
}

function getTournamentNextMatchNumber(matchNumber) {
  const winnerSlot = `Winner match ${Number(matchNumber)}`;
  return getKnockoutFixtures().find(
    (fixture) => fixture.homeSlot === winnerSlot || fixture.awaySlot === winnerSlot
  )?.matchNumber;
}

function getTournamentRunnerUpNextMatchNumber(matchNumber) {
  const runnerUpSlot = `Runner-up match ${Number(matchNumber)}`;
  return getKnockoutFixtures().find(
    (fixture) => fixture.homeSlot === runnerUpSlot || fixture.awaySlot === runnerUpSlot
  )?.matchNumber;
}

function getTournamentMatchDateLabel(match) {
  if (!match) {
    return "";
  }

  const dateKey = getFixtureDayKey(match);
  const timeLabel = getMatchTimeLabel(match);
  const baseLabel = [navDateFormatter.format(getDateFromKey(dateKey)), timeLabel].filter(Boolean).join(" ");

  if (match.stage === "bronze-final" || match.matchNumber === 103) {
    return `${baseLabel} (${localizeText("3rd place match")})`;
  }

  return baseLabel;
}

function createTournamentProgressionContext() {
  return {
    currentThirdPlaceAssignment: getCurrentThirdPlaceAssignment(),
    groupPlaceOddsCache: new Map(),
    likelyRunnerUpsCache: new Map(),
    likelyWinnersCache: new Map(),
    participantsCache: new Map(),
    slotOddsCache: new Map(),
    winnersCache: new Map()
  };
}

function getTournamentPendingParticipant(label, slotText = label, sourceMatchNumber = null) {
  return {
    label,
    likelihoodPercent: null,
    likelihoodReason: "",
    seedLabel: "",
    slotText,
    sourceMatchNumber,
    state: "pending",
    team: null
  };
}

function getTournamentRankWinEstimate(homeTeam, awayTeam) {
  const homeRank = getFifaRankValue(homeTeam);
  const awayRank = getFifaRankValue(awayTeam);

  if (!Number.isFinite(homeRank) || !Number.isFinite(awayRank)) {
    return { awayPercent: 50, homePercent: 50 };
  }

  const rankEdge = Math.max(-44, Math.min(44, awayRank - homeRank));
  let homePercent = clampPercent(Math.round(50 + rankEdge * 0.45));

  if (homePercent === 50 && homeRank !== awayRank) {
    homePercent = homeRank < awayRank ? 51 : 49;
  }

  return {
    awayPercent: 100 - homePercent,
    homePercent
  };
}

function getTournamentFixtureOutcomeProbabilities(fixture) {
  const projection = fixture?.projection || {};
  const projectedHome = Number(projection.home);
  const projectedDraw = Number(projection.draw);
  const projectedAway = Number(projection.away);

  let home = Number.isFinite(projectedHome) ? projectedHome : null;
  let draw = Number.isFinite(projectedDraw) ? projectedDraw : null;
  let away = Number.isFinite(projectedAway) ? projectedAway : null;

  if (home === null || draw === null || away === null) {
    const estimate = getTournamentRankWinEstimate(
      getTeam(fixture?.homeTeamId),
      getTeam(fixture?.awayTeamId)
    );
    const drawPercent = 24;
    home = Math.round((estimate.homePercent * (100 - drawPercent)) / 100);
    away = Math.round((estimate.awayPercent * (100 - drawPercent)) / 100);
    draw = drawPercent;
  }

  const total = home + draw + away;

  if (!Number.isFinite(total) || total <= 0) {
    return [
      { key: "home", probability: 1 / 3 },
      { key: "draw", probability: 1 / 3 },
      { key: "away", probability: 1 / 3 }
    ];
  }

  return [
    { key: "home", probability: home / total },
    { key: "draw", probability: draw / total },
    { key: "away", probability: away / total }
  ];
}

function normalizeTournamentOutcomePercents(home, tie, away) {
  const normalized = normalizeProjectionParts(home, tie, away);
  return {
    away: normalized.away,
    home: normalized.home,
    tie: normalized.draw
  };
}

function getTournamentFixtureProjectionPercents(match) {
  const projection = match?.projection || {};
  const home = Number(projection.home);
  const tie = Number(projection.draw);
  const away = Number(projection.away);

  if (!Number.isFinite(home) || !Number.isFinite(tie) || !Number.isFinite(away)) {
    return null;
  }

  return normalizeTournamentOutcomePercents(home, tie, away);
}

function getTournamentRankOutcomePercents(homeTeam, awayTeam) {
  const estimate = getTournamentRankWinEstimate(homeTeam, awayTeam);
  const homeRank = getFifaRankValue(homeTeam);
  const awayRank = getFifaRankValue(awayTeam);
  const rankGap =
    Number.isFinite(homeRank) && Number.isFinite(awayRank) ? Math.abs(homeRank - awayRank) : 0;
  const tie = Math.round(Math.max(18, 26 - Math.min(8, rankGap * 0.35)));
  const decisiveShare = 100 - tie;
  const home = Math.round((estimate.homePercent * decisiveShare) / 100);
  const away = decisiveShare - home;

  return normalizeTournamentOutcomePercents(home, tie, away);
}

function getTournamentOutcomeProjection(match, participants) {
  const homeTeam = participants?.home?.team;
  const awayTeam = participants?.away?.team;

  if (!homeTeam || !awayTeam) {
    return null;
  }

  const loadedProjection = getTournamentFixtureProjectionPercents(match);

  return {
    basis: loadedProjection ? "loaded" : "rank",
    percents: loadedProjection || getTournamentRankOutcomePercents(homeTeam, awayTeam)
  };
}

function getTournamentOutcomeBasisLabel(basis) {
  if (currentLanguage === "zh") {
    return basis === "loaded" ? "已载入的比赛预测" : "当前FIFA排名路径";
  }

  return basis === "loaded" ? "loaded match projection" : "current FIFA ranking path";
}

function getTournamentPenaltyEdgeSide(participants, percents) {
  const homeTeam = participants?.home?.team;
  const awayTeam = participants?.away?.team;
  const homePercent = Number(percents?.home);
  const awayPercent = Number(percents?.away);

  if (Number.isFinite(homePercent) && Number.isFinite(awayPercent) && homePercent !== awayPercent) {
    return homePercent > awayPercent ? "home" : "away";
  }

  const homeRank = getFifaRankValue(homeTeam);
  const awayRank = getFifaRankValue(awayTeam);

  if (Number.isFinite(homeRank) && Number.isFinite(awayRank) && homeRank !== awayRank) {
    return homeRank < awayRank ? "home" : "away";
  }

  return "home";
}

const TOURNAMENT_SHOOTOUT_PROFILES = {
  ALG: { takers: ["Riyad Mahrez", "Mohamed Amoura"] },
  ARG: {
    takers: ["Lionel Messi", "Lautaro Martinez"],
    goalkeeper: { name: "Damian Emiliano Martinez", club: "Aston Villa" }
  },
  AUS: { takers: ["Ajdin Hrustic", "Nestory Irankunda"] },
  AUT: { takers: ["Marko Arnautovic", "Marcel Sabitzer", "David Alaba"] },
  BEL: { takers: ["Kevin De Bruyne", "Romelu Lukaku"] },
  BIH: { takers: ["Edin Dzeko", "Ermedin Demirovic"] },
  BRA: { takers: ["Raphinha", "Neymar", "Lucas Paqueta"] },
  CAN: { takers: ["Jonathan David", "Alphonso Davies"] },
  CIV: { takers: ["Franck Kessie", "Ibrahim Sangare"] },
  COD: { takers: ["Yoane Wissa", "Cedric Bakambu"] },
  COL: { takers: ["James Rodriguez", "Luis Diaz"] },
  CPV: { takers: ["Ryan Mendes", "Dailon Livramento"] },
  CRO: {
    takers: ["Luka Modric", "Ante Budimir"],
    goalkeeper: { name: "Dominik Livakovic", club: "Dinamo Zagreb" }
  },
  ECU: { takers: ["Enner Valencia", "Jordy Caicedo"] },
  EGY: { takers: ["Mohamed Salah", "Omar Marmoush"] },
  ENG: {
    takers: ["Harry Kane", "Bukayo Saka"],
    goalkeeper: { name: "Jordan Pickford", club: "Everton" }
  },
  ESP: { takers: ["Mikel Oyarzabal", "Lamine Yamal", "Rodri"] },
  FRA: { takers: ["Kylian Mbappe", "Ousmane Dembele"] },
  GER: { takers: ["Kai Havertz", "Joshua Kimmich"] },
  GHA: { takers: ["Jordan Ayew"] },
  JPN: { takers: ["Ayase Ueda", "Ritsu Doan"] },
  MAR: {
    takers: ["Brahim Diaz", "Achraf Hakimi"],
    goalkeeper: { name: "Yassine Bounou", club: "Al Hilal" }
  },
  MEX: { takers: ["Raul Jimenez", "Santiago Gimenez"] },
  NED: { takers: ["Cody Gakpo", "Memphis Depay", "Wout Weghorst"] },
  NOR: { takers: ["Erling Haaland", "Martin Odegaard"] },
  PAR: { takers: ["Diego Gomez", "Miguel Almiron", "Julio Enciso"] },
  POR: {
    takers: ["Cristiano Ronaldo", "Bruno Fernandes"],
    goalkeeper: { name: "Diogo Costa", club: "Porto" }
  },
  RSA: { takers: ["Teboho Mokoena", "Lyle Foster"] },
  SEN: { takers: ["Sadio Mane", "Nicolas Jackson"] },
  SUI: { takers: ["Granit Xhaka", "Breel Embolo", "Zeki Amdouni"] },
  SWE: { takers: ["Viktor Gyokeres", "Alexander Isak"] },
  USA: { takers: ["Christian Pulisic", "Folarin Balogun"] }
};

function getTournamentShootoutPlayerEntry(team, name, role = "taker", clubOverride = "") {
  const teamId = String(team?.id || "").trim().toUpperCase();
  const nameKey = normalizeTextKey(name);
  const profile =
    (teamId && playerProfilesByTeamAndName.get(`${teamId}:${nameKey}`)) ||
    playerProfilesByName.get(nameKey) ||
    null;

  return {
    role,
    name: profile?.displayName || profile?.name || name,
    club: clubOverride || profile?.club || ""
  };
}

function getTournamentShootoutEntries(team) {
  const teamId = String(team?.id || "").trim().toUpperCase();
  const profile = TOURNAMENT_SHOOTOUT_PROFILES[teamId];

  if (!profile) {
    return [];
  }

  const takers = (profile.takers || [])
    .filter(Boolean)
    .map((name) => getTournamentShootoutPlayerEntry(team, name, "taker"));
  const entries = takers.slice(0, profile.goalkeeper ? 2 : 3);

  if (profile.goalkeeper && entries.length < 3) {
    entries.push(
      getTournamentShootoutPlayerEntry(
        team,
        profile.goalkeeper.name,
        "goalkeeper",
        profile.goalkeeper.club
      )
    );
  }

  return entries;
}

function formatTournamentShootoutEntry(entry) {
  const name = currentLanguage === "zh" ? translateTextToZh(entry.name) || entry.name : entry.name;

  if (entry.role !== "goalkeeper") {
    return name;
  }

  const club = currentLanguage === "zh" ? translateTextToZh(entry.club) || entry.club : entry.club;
  if (!club) {
    return currentLanguage === "zh" ? `门将${name}` : `goalkeeper ${name}`;
  }

  return currentLanguage === "zh" ? `${club}门将${name}` : `${club} goalkeeper ${name}`;
}

function formatTournamentPenaltyEdgeProfiles(team) {
  const entries = getTournamentShootoutEntries(team);

  if (!entries.length) {
    return currentLanguage === "zh" ? "主要点球手" : "their main penalty takers";
  }

  const names = entries.map(formatTournamentShootoutEntry);
  return currentLanguage === "zh" ? getLocalizedNameSeries(names) : getNameSeries(names);
}

function getTournamentOutcomeTeamReason(match, participants, side, percent, basis) {
  const team = participants?.[side]?.team;
  const otherSide = side === "home" ? "away" : "home";
  const teamName = getTournamentTeamDisplayName(team);
  const opponentName = getTournamentTeamDisplayName(participants?.[otherSide]?.team);
  const projection = getTournamentOutcomeProjection(match, participants);
  const percents = projection?.percents || {};
  const favoriteSide = Number(percents.home) >= Number(percents.away) ? "home" : "away";
  const favoriteName = getTournamentTeamDisplayName(participants?.[favoriteSide]?.team);
  const teamPercent = Number(percents?.[side]);
  const favoritePercent = Number(percents?.[favoriteSide]);
  const favoriteGap =
    Number.isFinite(teamPercent) && Number.isFinite(favoritePercent)
      ? Math.abs(favoritePercent - teamPercent)
      : Number.POSITIVE_INFINITY;

  if (currentLanguage === "zh") {
    if (side === favoriteSide) {
      return `${teamName}点球前取胜概率约${percent}%，依据球队评分和近期结果。`;
    }

    return favoriteGap <= 5
      ? `${teamName}点球前取胜概率约${percent}%。这场很接近，但${favoriteName}略占优势。`
      : `${teamName}点球前取胜概率约${percent}%。仍有赢球路径，但${favoriteName}更被看好。`;
  }

  if (side === favoriteSide) {
    return `${teamName} projects to win ${percent}% before penalties based on team rating and recent results.`;
  }

  return favoriteGap <= 5
    ? `${teamName} have a ${percent}% chance to win before penalties. This is close, but ${favoriteName} have the slight edge.`
    : `${teamName} have a ${percent}% chance to win before penalties. They can still win, but ${favoriteName} are favored.`;
}

function getTournamentOutcomeTieReason(match, participants, percents, basis) {
  const edgeSide = getTournamentPenaltyEdgeSide(participants, percents);
  const edgeTeam = participants?.[edgeSide]?.team;
  const edgeName = getTournamentTeamDisplayName(edgeTeam);
  const edgeProfiles = formatTournamentPenaltyEdgeProfiles(edgeTeam);
  const tiePercent = clampPercent(Math.round(Number(percents?.tie)));

  if (currentLanguage === "zh") {
    return `这场约有${tiePercent}%概率进入点球。若进入点球，${edgeName}凭借${edgeProfiles}更有优势。`;
  }

  return `There is a ${tiePercent}% chance of penalties. If so, ${edgeName} have the shootout edge through ${edgeProfiles}.`;
}

function cloneTournamentStandingStates(states) {
  return new Map([...states.entries()].map(([teamId, state]) => [teamId, { ...state }]));
}

function applyTournamentProjectedOutcome(states, fixture, outcomeKey) {
  const home = states.get(fixture.homeTeamId);
  const away = states.get(fixture.awayTeamId);

  if (!home || !away) {
    return;
  }

  home.played += 1;
  away.played += 1;

  if (outcomeKey === "home") {
    home.pts += 3;
    home.wins += 1;
    home.gf += 1;
    home.gd += 1;
    away.losses += 1;
    away.ga += 1;
    away.gd -= 1;
    return;
  }

  if (outcomeKey === "away") {
    away.pts += 3;
    away.wins += 1;
    away.gf += 1;
    away.gd += 1;
    home.losses += 1;
    home.ga += 1;
    home.gd -= 1;
    return;
  }

  home.pts += 1;
  away.pts += 1;
  home.draws += 1;
  away.draws += 1;
}

function compareTournamentStandingStates(a, b) {
  return (
    b.pts - a.pts ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    getFifaRankValue(getTeam(a.teamId)) - getFifaRankValue(getTeam(b.teamId)) ||
    a.seededOrder - b.seededOrder ||
    getTeam(a.teamId).name.localeCompare(getTeam(b.teamId).name)
  );
}

function getTournamentGroupPlaceOdds(groupId, context) {
  const cacheKey = String(groupId || "");

  if (context.groupPlaceOddsCache.has(cacheKey)) {
    return context.groupPlaceOddsCache.get(cacheKey);
  }

  const group = getGroup(groupId);
  const teamIds = group?.teamIds || [];
  const states = new Map(
    getStandingsRows(groupId).map((row) => [
      row.teamId,
      {
        draws: Number(row.draws) || 0,
        ga: Number(row.ga) || 0,
        gd: Number(row.gd) || 0,
        gf: Number(row.gf) || 0,
        losses: Number(row.losses) || 0,
        played: Number(row.played) || 0,
        pts: Number(row.pts) || 0,
        seededOrder: teamIds.indexOf(row.teamId),
        teamId: row.teamId,
        wins: Number(row.wins) || 0
      }
    ])
  );

  for (const [index, teamId] of teamIds.entries()) {
    if (!states.has(teamId)) {
      states.set(teamId, {
        draws: 0,
        ga: 0,
        gd: 0,
        gf: 0,
        losses: 0,
        played: 0,
        pts: 0,
        seededOrder: index,
        teamId,
        wins: 0
      });
    }
  }

  const remainingFixtures = fixtures.filter(
    (fixture) =>
      fixture.stage === "group" &&
      fixture.groupId === groupId &&
      fixture.status !== "FT" &&
      fixture.homeTeamId &&
      fixture.awayTeamId
  );
  const placeOdds = new Map(teamIds.map((teamId) => [teamId, Array(teamIds.length).fill(0)]));

  function visit(fixtureIndex, currentStates, probability) {
    if (fixtureIndex >= remainingFixtures.length) {
      [...currentStates.values()].sort(compareTournamentStandingStates).forEach((state, index) => {
        const odds = placeOdds.get(state.teamId);

        if (odds) {
          odds[index] += probability;
        }
      });
      return;
    }

    const fixture = remainingFixtures[fixtureIndex];
    for (const outcome of getTournamentFixtureOutcomeProbabilities(fixture)) {
      const nextStates = cloneTournamentStandingStates(currentStates);
      applyTournamentProjectedOutcome(nextStates, fixture, outcome.key);
      visit(fixtureIndex + 1, nextStates, probability * outcome.probability);
    }
  }

  visit(0, states, 1);
  context.groupPlaceOddsCache.set(cacheKey, placeOdds);
  return placeOdds;
}

function formatTournamentSlotPercentValue(probability) {
  const percent = Number(probability) * 100;

  if (!Number.isFinite(percent) || percent <= 0) {
    return "0";
  }

  if (percent < 1) {
    return "<1";
  }

  if (percent > 99 && percent < 100) {
    return ">99";
  }

  return String(clampPercent(Math.round(percent)));
}

function formatTournamentSlotPercent(probability) {
  return `${formatTournamentSlotPercentValue(probability)}%`;
}

function getTournamentProbabilityCode(team) {
  const code = String(team?.id || "").trim().toUpperCase();
  return code || String(team?.name || "").trim().slice(0, 3).toUpperCase();
}

function renderTournamentProbabilityLabel(team, probabilityText, labelText = "") {
  const code = labelText || getTournamentProbabilityCode(team);
  const visibleText = [code, probabilityText].filter(Boolean).join(" ");
  return `<span>${escapeHtml(visibleText)}</span>`;
}

function getTournamentSlotOddsTone(probability) {
  const percent = Number(probability) * 100;

  if (!Number.isFinite(percent)) {
    return "neutral";
  }

  const displayPercentValue = formatTournamentSlotPercentValue(probability);
  const displayPercent =
    displayPercentValue === "<1"
      ? 0
      : displayPercentValue === ">99"
        ? 100
        : Number(displayPercentValue);

  if (!Number.isFinite(displayPercent)) {
    return "neutral";
  }

  if (displayPercent >= 75) {
    return "high";
  }

  if (displayPercent <= 25) {
    return "low";
  }

  return "neutral";
}

function getTournamentSlotOddsCandidates(slot, context) {
  if (slot.kind === "group-place") {
    const odds = getTournamentGroupPlaceOdds(slot.groupId, context);
    const group = getGroup(slot.groupId);

    return (group?.teamIds || [])
      .map((teamId) => ({
        groupId: slot.groupId,
        place: slot.place,
        probability: odds.get(teamId)?.[slot.place - 1] || 0,
        team: getTeam(teamId)
      }))
      .sort((a, b) => b.probability - a.probability || a.team.name.localeCompare(b.team.name));
  }

  if (slot.kind === "third-place") {
    const candidates = slot.allowedGroupIds.flatMap((groupId) => {
      const odds = getTournamentGroupPlaceOdds(groupId, context);
      const group = getGroup(groupId);

      return (group?.teamIds || []).map((teamId) => ({
        groupId,
        place: 3,
        probability: odds.get(teamId)?.[THIRD_PLACE_STANDING_INDEX] || 0,
        team: getTeam(teamId)
      }));
    });
    const total = candidates.reduce((sum, candidate) => sum + candidate.probability, 0);

    return candidates
      .map((candidate) => ({
        ...candidate,
        probability: total > 0 ? candidate.probability / total : 0
      }))
      .sort((a, b) => b.probability - a.probability || a.team.name.localeCompare(b.team.name));
  }

  return [];
}

function getTournamentSlotCurrentStandingLine(team, place) {
  const row = getStandingsRows(team?.groupId).find((standing) => standing.teamId === team?.id);

  if (!row) {
    return "";
  }

  return `${getTournamentTeamDisplayName(team)} is current ${formatTournamentTopSlotLabel(
    team.groupId,
    place
  )} on ${row.pts} pts, ${formatGoalDifference(row.gd)} GD.`;
}

function hasTournamentRemainingGroupFixtures(groupId) {
  return fixtures.some(
    (fixture) => fixture.stage === "group" && fixture.groupId === groupId && fixture.status !== "FT"
  );
}

function getTournamentSlotOdds(slot, context) {
  const cacheKey = slot.key || `${slot.kind}:${slot.slotText}`;

  if (context.slotOddsCache.has(cacheKey)) {
    return context.slotOddsCache.get(cacheKey);
  }

  const candidates = getTournamentSlotOddsCandidates(slot, context);
  const currentTeam = getCurrentTournamentSlotTeam(slot, context.currentThirdPlaceAssignment);
  const primary =
    candidates.find((candidate) => candidate.team.id === currentTeam?.id) || candidates[0] || null;

  if (!primary) {
    context.slotOddsCache.set(cacheKey, null);
    return null;
  }

  const slotLabel = getTournamentSlotSeedLabel(slot, context.currentThirdPlaceAssignment);
  const alternatives = candidates
    .filter((candidate) => candidate.team.id !== primary.team.id && candidate.probability > 0)
    .slice(0, 4);
  const alternativeText = alternatives.length
    ? ` Others: ${alternatives
        .map(
          (candidate) =>
            `${getTournamentTeamDisplayName(candidate.team)} ${formatTournamentSlotPercent(
              candidate.probability
            )}`
        )
        .join(", ")}.`
    : " No close alternatives.";
  const scopeText =
    slot.kind === "third-place"
      ? ` Slot accepts Groups ${slot.allowedGroupIds.join("/")}.`
      : " Based on table + remaining projections.";
  const standingText =
    getTournamentSlotCurrentStandingLine(primary.team, slot.kind === "third-place" ? 3 : slot.place) ||
    `${getTournamentTeamDisplayName(primary.team)} is current ${slotLabel}.`;
  const hasRemainingFixtures =
    slot.kind === "third-place"
      ? slot.allowedGroupIds.some(hasTournamentRemainingGroupFixtures)
      : hasTournamentRemainingGroupFixtures(slot.groupId);
  const isLocked = !hasRemainingFixtures && primary.probability >= 1;
  const displayProbability =
    hasRemainingFixtures && primary.probability >= 1 ? 0.995 : primary.probability;
  const odds = {
    alternatives,
    groupId: primary.groupId,
    isLocked,
    label: `${getTournamentTeamDisplayName(primary.team)} ${formatTournamentSlotPercent(displayProbability)}`,
    place: primary.place,
    displayProbability,
    probability: primary.probability,
    reason: `${standingText}${scopeText}${alternativeText}`,
    slotLabel,
    team: primary.team
  };

  context.slotOddsCache.set(cacheKey, odds);
  return odds;
}

function getTournamentLikelihoodReason(favorite, other, percent) {
  const favoriteName = getStandingName(favorite);
  const otherName = getStandingName(other);
  const favoriteRank = getFifaRankValue(favorite);
  const otherRank = getFifaRankValue(other);

  if (Number.isFinite(favoriteRank) && Number.isFinite(otherRank)) {
    if (favoriteRank === otherRank) {
      return `${favoriteName} and ${otherName} are close in FIFA rank. Rough ${percent}%.`;
    }

    return `${favoriteName} have the stronger FIFA rank (#${favoriteRank} vs #${otherRank}). Rough ${percent}%.`;
  }

  return `${favoriteName} are the current slot pick. Rough ${percent}%.`;
}

function getTournamentPredictionLead(participants) {
  const homeName = participants?.home?.team ? getStandingName(participants.home.team) : "";
  const awayName = participants?.away?.team ? getStandingName(participants.away.team) : "";

  if (homeName && awayName) {
    return `Prediction based on ${homeName} vs ${awayName}.`;
  }

  const loneName = homeName || awayName;
  return loneName ? `Prediction based on ${loneName}'s current path.` : "";
}

function getTournamentPredictionReason(participants, detail) {
  const lead = getTournamentPredictionLead(participants);
  return lead ? `${lead} ${detail}` : detail;
}

function getTournamentLikelyWinnerPrediction(match, context) {
  const cacheKey = Number(match?.matchNumber);

  if (!match || !Number.isFinite(cacheKey)) {
    return null;
  }

  if (context.likelyWinnersCache.has(cacheKey)) {
    return context.likelyWinnersCache.get(cacheKey);
  }

  context.likelyWinnersCache.set(cacheKey, null);
  const participants = getTournamentMatchParticipants(match, context);
  const homeTeam = participants.home.team;
  const awayTeam = participants.away.team;

  if (!homeTeam && !awayTeam) {
    return null;
  }

  if (homeTeam && !awayTeam) {
    const detail = `${getStandingName(homeTeam)} are the only current team in this slot. Rough 55%.`;
    const prediction = {
      entry: participants.home,
      percent: 55,
      reason: getTournamentPredictionReason(participants, detail),
      side: "home",
      team: homeTeam
    };
    context.likelyWinnersCache.set(cacheKey, prediction);
    return prediction;
  }

  if (!homeTeam && awayTeam) {
    const detail = `${getStandingName(awayTeam)} are the only current team in this slot. Rough 55%.`;
    const prediction = {
      entry: participants.away,
      percent: 55,
      reason: getTournamentPredictionReason(participants, detail),
      side: "away",
      team: awayTeam
    };
    context.likelyWinnersCache.set(cacheKey, prediction);
    return prediction;
  }

  const estimate = getTournamentRankWinEstimate(homeTeam, awayTeam);
  const side = estimate.homePercent >= estimate.awayPercent ? "home" : "away";
  const percent = side === "home" ? estimate.homePercent : estimate.awayPercent;
  const team = side === "home" ? homeTeam : awayTeam;
  const otherTeam = side === "home" ? awayTeam : homeTeam;
  const detail = getTournamentLikelihoodReason(team, otherTeam, percent);
  const prediction = {
    entry: participants[side],
    percent,
    reason: getTournamentPredictionReason(participants, detail),
    side,
    team
  };

  context.likelyWinnersCache.set(cacheKey, prediction);
  return prediction;
}

function getTournamentLikelyRunnerUpPrediction(match, context) {
  const cacheKey = Number(match?.matchNumber);

  if (!match || !Number.isFinite(cacheKey)) {
    return null;
  }

  if (context.likelyRunnerUpsCache.has(cacheKey)) {
    return context.likelyRunnerUpsCache.get(cacheKey);
  }

  context.likelyRunnerUpsCache.set(cacheKey, null);
  const participants = getTournamentMatchParticipants(match, context);
  const winnerPrediction = getTournamentLikelyWinnerPrediction(match, context);

  if (!winnerPrediction?.side || !participants.home.team || !participants.away.team) {
    return null;
  }

  const runnerUpSide = winnerPrediction.side === "home" ? "away" : "home";
  const runnerUpEntry = participants[runnerUpSide];
  const percent = Math.max(1, Math.min(99, 100 - Number(winnerPrediction.percent || 50)));
  const detail = `${getStandingName(runnerUpEntry.team)} are the projected runner-up from this semi-final. Rough ${percent}%.`;
  const prediction = {
    entry: runnerUpEntry,
    percent,
    reason: getTournamentPredictionReason(participants, detail),
    side: runnerUpSide,
    team: runnerUpEntry.team
  };

  context.likelyRunnerUpsCache.set(cacheKey, prediction);
  return prediction;
}

function getTournamentLikelyParticipant(prediction, sourceMatchNumber) {
  if (!prediction?.entry?.team) {
    return null;
  }

  return {
    ...prediction.entry,
    isLocked: false,
    label: getTournamentTeamDisplayName(prediction.entry.team),
    likelihoodPercent: prediction.percent,
    likelihoodReason: prediction.reason,
    sourceMatchNumber,
    state: "likely"
  };
}

function getTournamentMatchParticipant(match, side, context) {
  const teamId = match?.[`${side}TeamId`];

  if (teamId) {
    const team = getTeam(teamId);
    return {
      label: getTournamentTeamDisplayName(team),
      likelihoodPercent: null,
      likelihoodReason: "",
      isLocked: true,
      seedLabel: "",
      slotText: getStandingName(team),
      state: "resolved",
      team
    };
  }

  const slotText = match?.[`${side}Slot`] || "TBD";
  const sourceMatchNumber = parseTournamentWinnerSource(slotText);

  if (sourceMatchNumber) {
    const sourceMatch = getTournamentFixtureByMatchNumber(sourceMatchNumber);
    const winner = getTournamentMatchWinnerTeam(sourceMatch, context);

    if (winner) {
      const sourceParticipants = getTournamentMatchParticipants(sourceMatch, context);
      const sourceWinnerEntry = [sourceParticipants.home, sourceParticipants.away].find(
        (entry) => entry.team?.id === winner.id
      );

      return {
        ...(sourceWinnerEntry || {}),
        isLocked: true,
        label: getTournamentTeamDisplayName(winner),
        likelihoodPercent: null,
        likelihoodReason: "",
        seedLabel: sourceWinnerEntry?.seedLabel || "",
        slotText: sourceWinnerEntry?.slotText || slotText,
        sourceMatchNumber,
        state: "resolved",
        team: winner
      };
    }

    const likelyParticipant = getTournamentLikelyParticipant(
      getTournamentLikelyWinnerPrediction(sourceMatch, context),
      sourceMatchNumber
    );

    if (likelyParticipant) {
      return likelyParticipant;
    }

    return getTournamentPendingParticipant("TBD", slotText, sourceMatchNumber);
  }

  const runnerUpSourceMatchNumber = parseTournamentRunnerUpSource(slotText);

  if (runnerUpSourceMatchNumber) {
    const sourceMatch = getTournamentFixtureByMatchNumber(runnerUpSourceMatchNumber);
    const loser = getTournamentMatchLoserTeam(sourceMatch, context);

    if (loser) {
      const sourceParticipants = getTournamentMatchParticipants(sourceMatch, context);
      const sourceLoserEntry = [sourceParticipants.home, sourceParticipants.away].find(
        (entry) => entry.team?.id === loser.id
      );

      return {
        ...(sourceLoserEntry || {}),
        isLocked: true,
        label: getTournamentTeamDisplayName(loser),
        likelihoodPercent: null,
        likelihoodReason: "",
        seedLabel: sourceLoserEntry?.seedLabel || "",
        slotText: sourceLoserEntry?.slotText || slotText,
        sourceMatchNumber: runnerUpSourceMatchNumber,
        state: "resolved",
        team: loser
      };
    }

    const likelyParticipant = getTournamentLikelyParticipant(
      getTournamentLikelyRunnerUpPrediction(sourceMatch, context),
      runnerUpSourceMatchNumber
    );

    if (likelyParticipant) {
      return likelyParticipant;
    }

    return getTournamentPendingParticipant("TBD", slotText, runnerUpSourceMatchNumber);
  }

  if (match?.stage === "round-of-32") {
    const slot = getRoundOf32SlotDefinition(match, side);
    const seedLabel = getTournamentSlotSeedLabel(slot, context.currentThirdPlaceAssignment);
    const slotOdds = getTournamentSlotOdds(slot, context);
    const isLocked = Boolean(slotOdds?.isLocked);
    const team = getCurrentTournamentSlotTeam(slot, context.currentThirdPlaceAssignment);
    const displayTeam = team || (slot.kind === "third-place" ? null : slotOdds?.team || null);

    if (displayTeam) {
      const displaySeedLabel =
        team || !slotOdds?.groupId
          ? seedLabel
          : formatTournamentTopSlotLabel(slotOdds.groupId, slotOdds.place || 3);
      return {
        label: getTournamentTeamDisplayName(displayTeam),
        likelihoodPercent: null,
        likelihoodReason: "",
        isLocked,
        seedLabel: displaySeedLabel,
        slotOdds,
        slotText,
        state: isLocked ? "resolved" : "likely",
        team: displayTeam
      };
    }

    return {
      ...getTournamentPendingParticipant(seedLabel, slotText),
      slotOdds
    };
  }

  return getTournamentPendingParticipant(slotText);
}

function getTournamentMatchParticipants(match, context) {
  const cacheKey = Number(match?.matchNumber);

  if (context.participantsCache.has(cacheKey)) {
    return context.participantsCache.get(cacheKey);
  }

  const participants = {
    away: getTournamentMatchParticipant(match, "away", context),
    home: getTournamentMatchParticipant(match, "home", context)
  };

  context.participantsCache.set(cacheKey, participants);
  return participants;
}

function getTournamentExplicitWinnerTeam(match, participants) {
  const winnerValue = String(match?.winnerTeamId || match?.winner || "").trim();

  if (!winnerValue) {
    return null;
  }

  const candidates = [participants.home.team, participants.away.team].filter(Boolean);
  const winnerKey = normalizeTextKey(winnerValue);
  const matchedParticipant = candidates.find((team) =>
    [team.id, team.name, team.officialName, team.standingName].some(
      (value) => normalizeTextKey(value) === winnerKey
    )
  );

  if (matchedParticipant) {
    return matchedParticipant;
  }

  return teamsById.get(winnerValue) || teamsById.get(winnerValue.toUpperCase()) || null;
}

function getTournamentScoreWinnerSide(match) {
  const finalScore = match?.status === "FT" ? match?.score : null;
  return getResultWinnerSide(match, finalScore);
}

function getTournamentMatchWinnerTeam(match, context) {
  const cacheKey = Number(match?.matchNumber);

  if (!match || !Number.isFinite(cacheKey)) {
    return null;
  }

  if (context.winnersCache.has(cacheKey)) {
    return context.winnersCache.get(cacheKey);
  }

  context.winnersCache.set(cacheKey, null);
  const participants = getTournamentMatchParticipants(match, context);
  const explicitWinner = getTournamentExplicitWinnerTeam(match, participants);

  if (explicitWinner) {
    context.winnersCache.set(cacheKey, explicitWinner);
    return explicitWinner;
  }

  const winnerSide = getTournamentScoreWinnerSide(match);
  const winner = winnerSide ? participants[winnerSide]?.team || null : null;

  context.winnersCache.set(cacheKey, winner);
  return winner;
}

function getTournamentMatchLoserTeam(match, context) {
  const winner = getTournamentMatchWinnerTeam(match, context);

  if (!winner) {
    return null;
  }

  const participants = getTournamentMatchParticipants(match, context);
  return [participants.home.team, participants.away.team].find((team) => team && team.id !== winner.id) || null;
}

function renderTournamentParticipant(entry, options = {}) {
  const { isLoser = false, isWinner = false } = options;
  const teamName = entry.team ? getLocalizedStandingName(entry.team) : localizeText(entry.slotText || entry.label);
  const label = entry.team ? getTournamentTeamDisplayName(entry.team) : localizeText(entry.label);
  const rankHtml = entry.team ? renderRank(entry.team) : "";
  const detailText = entry.team
    ? ""
    : entry.sourceMatchNumber
      ? ""
      : teamName;
  const ariaName = entry.sourceMatchNumber && !entry.team ? label : teamName;
  const detailHtml = detailText ? `<small>${renderTournamentParticipantLabel(detailText)}</small>` : "";
  const classes = [
    "knockout-team",
    entry.isLocked ? "is-locked" : "",
    entry.state === "likely" ? "is-likely" : entry.team ? "is-resolved" : "is-pending",
    isWinner ? "is-winner" : "",
    isLoser ? "is-loser" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const ariaLabel = [
    ariaName,
    entry.state === "likely" ? localizeText("likely for now") : ""
  ]
    .filter(Boolean)
    .join(", ");

  return `
    <span class="${classes}"${entry.team ? ` data-team-id="${escapeHtml(entry.team.id)}"` : ""}${entry.sourceMatchNumber ? ` data-source-match="${escapeHtml(entry.sourceMatchNumber)}"` : ""} aria-label="${escapeHtml(ariaLabel)}">
      <span class="knockout-team-flag" aria-hidden="true">${entry.team ? renderFlag(entry.team) : ""}</span>
      <span class="knockout-team-copy">
        <strong>
          <span class="knockout-team-name">${renderTournamentParticipantLabel(label)}</span>
          ${rankHtml}
        </strong>
        ${detailHtml}
      </span>
    </span>
  `;
}

function getTournamentParticipantSide(participants, team) {
  if (!team?.id) {
    return "";
  }

  if (participants?.home?.team?.id === team.id) {
    return "home";
  }

  if (participants?.away?.team?.id === team.id) {
    return "away";
  }

  return "";
}

function getTournamentResultScorePairForSide(match, side, key = "score") {
  const pair = key === "penalties" ? match?.scoreDetails?.penalties : match?.score;

  if (!pair) {
    return "";
  }

  return side === "away"
    ? formatScorePair({ home: pair.away, away: pair.home })
    : formatScorePair(pair);
}

function formatTournamentResultPillText(match, participants, winner) {
  const winnerSide = getTournamentParticipantSide(participants, winner) || getTournamentScoreWinnerSide(match);
  const scoreText = getTournamentResultScorePairForSide(match, winnerSide || "home");
  const penaltyText = getTournamentResultScorePairForSide(match, winnerSide || "home", "penalties");

  if (scoreText && penaltyText) {
    return `${scoreText} (${penaltyText} ${localizeText("pens")})`;
  }

  return scoreText || "";
}

function renderTournamentLikelihoodPill(entry) {
  const percent = Number(entry?.percent ?? entry?.likelihoodPercent);

  if (!entry?.team || !Number.isFinite(percent)) {
    return "";
  }

  const reason = localizeText(entry.reason ?? entry.likelihoodReason);
  const tone = getTournamentSlotOddsTone(percent / 100);

  return `<span class="knockout-likelihood is-${escapeHtml(tone)}" tabindex="0" aria-label="${escapeHtml(reason)}" data-tooltip="${escapeHtml(reason)}">${renderTournamentProbabilityLabel(entry.team, `${percent}%`)}</span>`;
}

function renderTournamentParticipantLikelihoodFooter(participants) {
  const pills = [participants.home, participants.away]
    .filter((entry) => entry?.team && Number.isFinite(Number(entry.likelihoodPercent)))
    .map(renderTournamentLikelihoodPill)
    .join("");

  return pills ? `<span class="knockout-likelihood-list">${pills}</span>` : "";
}

function renderTournamentOutcomePill(outcome) {
  const percent = clampPercent(Math.round(Number(outcome?.percent)));

  if (!Number.isFinite(percent)) {
    return "";
  }

  const reason = outcome.reason || "";
  const tone = "neutral";
  const teamAttributes = outcome.team ? ` data-team-id="${escapeHtml(outcome.team.id)}"` : "";
  const labelHtml = outcome.team
    ? renderTournamentProbabilityLabel(outcome.team, `${percent}%`)
    : `<span>${escapeHtml(`TIE ${percent}%`)}</span>`;

  return `<span class="knockout-likelihood is-${escapeHtml(tone)}" tabindex="0" aria-label="${escapeHtml(reason)}" data-tooltip="${escapeHtml(reason)}" data-outcome="${escapeHtml(outcome.key)}"${teamAttributes}>${labelHtml}</span>`;
}

function renderTournamentOutcomeFooter(match, participants) {
  const projection = getTournamentOutcomeProjection(match, participants);

  if (!projection) {
    return "";
  }

  const { basis, percents } = projection;
  const outcomes = [
    {
      key: "home",
      percent: percents.home,
      reason: getTournamentOutcomeTeamReason(match, participants, "home", percents.home, basis),
      team: participants.home.team
    },
    {
      key: "tie",
      percent: percents.tie,
      reason: getTournamentOutcomeTieReason(match, participants, percents, basis),
      team: null
    },
    {
      key: "away",
      percent: percents.away,
      reason: getTournamentOutcomeTeamReason(match, participants, "away", percents.away, basis),
      team: participants.away.team
    }
  ];
  const pills = outcomes.map(renderTournamentOutcomePill).join("");

  return pills ? `<span class="knockout-likelihood-list" data-outcome-basis="${escapeHtml(basis)}">${pills}</span>` : "";
}

function getLocalizedTournamentSlotOddsReason(slotOdds) {
  if (currentLanguage !== "zh") {
    return localizeText(slotOdds.reason);
  }

  const slotLabel = localizeText(slotOdds.slotLabel);
  const alternatives = slotOdds.alternatives
    .map((candidate) =>
      `${getLocalizedStandingName(candidate.team)} ${formatTournamentSlotPercent(candidate.probability)}`
    )
    .join("、");
  return alternatives
    ? `${getLocalizedStandingName(slotOdds.team)}目前最可能占据${slotLabel}。其他可能：${alternatives}。`
    : `${getLocalizedStandingName(slotOdds.team)}目前最可能占据${slotLabel}。暂无接近替代球队。`;
}

function renderTournamentSlotOddsPill(slotOdds) {
  if (!slotOdds?.team) {
    return "";
  }

  const reason = getLocalizedTournamentSlotOddsReason(slotOdds);
  const tone = getTournamentSlotOddsTone(slotOdds.probability);
  const slotLabel = slotOdds.slotLabel || "";

  return `<span class="knockout-slot-odds is-${escapeHtml(tone)}" tabindex="0" aria-label="${escapeHtml(reason)}" data-tooltip="${escapeHtml(reason)}" data-team-id="${escapeHtml(slotOdds.team.id)}"${slotLabel ? ` data-slot-label="${escapeHtml(slotLabel)}"` : ""}>${renderTournamentProbabilityLabel(slotOdds.team, formatTournamentSlotPercent(slotOdds.displayProbability ?? slotOdds.probability))}</span>`;
}

function renderTournamentSlotOddsFooter(participants) {
  const pills = [participants.home.slotOdds, participants.away.slotOdds]
    .filter((slotOdds) => slotOdds?.team && !slotOdds.isLocked)
    .map(renderTournamentSlotOddsPill)
    .join("");

  return pills ? `<span class="knockout-slot-odds-list">${pills}</span>` : "";
}

function renderTournamentParticipantLabel(label) {
  return escapeHtml(label);
}

function isTournamentProjectedParticipant(entry) {
  return Boolean(entry && !entry.isLocked && (entry.state === "likely" || entry.slotOdds));
}

function isTournamentProjectedMatch(match, context) {
  if (!match?.stage || match.stage === "group" || match.status === "FT") {
    return false;
  }

  const progressionContext = context || createTournamentProgressionContext();
  const participants = getTournamentMatchParticipants(match, progressionContext);
  const winner = getTournamentMatchWinnerTeam(match, progressionContext);
  return Boolean(
    !winner &&
      (isTournamentProjectedParticipant(participants.home) ||
        isTournamentProjectedParticipant(participants.away))
  );
}

function isTournamentMatchLocked(match, participants) {
  return Boolean(
    match?.id &&
      participants?.home?.team &&
      participants?.away?.team &&
      !isTournamentProjectedParticipant(participants.home) &&
      !isTournamentProjectedParticipant(participants.away)
  );
}

function getTournamentOpenMatchLabel(participants) {
  const homeName = participants?.home?.team
    ? getTournamentTeamDisplayName(participants.home.team)
    : participants?.home?.label || "";
  const awayName = participants?.away?.team
    ? getTournamentTeamDisplayName(participants.away.team)
    : participants?.away?.label || "";

  if (currentLanguage === "zh") {
    return `打开${homeName}对${awayName}的比赛详情`;
  }

  return `Open ${homeName} vs ${awayName} match details`;
}

function renderTournamentMatchCard(match, context, options = {}) {
  if (!match) {
    return "";
  }

  const participants = getTournamentMatchParticipants(match, context);
  const winner = getTournamentMatchWinnerTeam(match, context);
  const isComplete = match.status === "FT" || Boolean(winner);
  const isLive = isMatchLive(match, options.currentTime ?? Date.now());
  const isNext = Boolean(options.nextMatchIds?.has(match.id));
  const nextMatchNumber = getTournamentNextMatchNumber(match.matchNumber);
  const runnerUpNextMatchNumber = getTournamentRunnerUpNextMatchNumber(match.matchNumber);
  const resultText =
    formatTournamentResultPillText(match, participants, winner) ||
    (winner ? localizeText(`${getTournamentTeamDisplayName(winner)} won`) : "");
  const venueLabel = match.venue ? getTournamentVenueLabel(match) : "";
  const venueTooltip = match.venue ? getVenueLabel(match) : "";
  const outcomeFooterHtml = !isComplete ? renderTournamentOutcomeFooter(match, participants) : "";
  const resultFooterHtml = isComplete && resultText
    ? `<span class="knockout-result-pill" aria-label="${escapeHtml(resultText)}">${escapeHtml(resultText)}</span>`
    : "";
  const footerContentHtml = resultFooterHtml || outcomeFooterHtml;
  const footerHtml =
    footerContentHtml
      ? `<footer class="knockout-match-footer">
        ${footerContentHtml}
      </footer>`
      : "";
  const isProjected =
    isTournamentProjectedMatch(match, context);
  const isLocked = isTournamentMatchLocked(match, participants);
  const cardClasses = [
    options.className || "progress-match",
    isComplete ? "is-complete" : "",
    isNext ? "is-next" : "",
    isProjected ? "is-projected" : "",
    isLocked ? "is-openable" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const styleText =
    Number.isFinite(options.pathRow) && Number.isFinite(options.pathSpan)
      ? ` style="--path-row: ${escapeHtml(options.pathRow)}; --path-span: ${escapeHtml(options.pathSpan)};"`
      : "";
  const roundIdAttribute = options.roundId ? ` data-round-id="${escapeHtml(options.roundId)}"` : "";
  const roundIndexAttribute = Number.isFinite(options.roundIndex)
    ? ` data-round-index="${escapeHtml(options.roundIndex)}"`
    : "";
  const matchIndexAttribute = Number.isFinite(options.matchIndex)
    ? ` data-match-index="${escapeHtml(options.matchIndex)}"`
    : "";
  const openMatchAttributes = isLocked
    ? ` data-open-match-id="${escapeHtml(match.id)}" role="button" tabindex="0" aria-label="${escapeHtml(getTournamentOpenMatchLabel(participants))}"`
    : "";
  const statusBadgeHtml = isLive
    ? renderTournamentLivePill(match)
    : isNext
      ? `<span class="tournament-up-next-pill" aria-label="${escapeHtml(localizeText("Up next"))}">${escapeHtml(localizeText("Up next"))}</span>`
      : "";

  return `
    <article class="${escapeHtml(cardClasses)}" data-match-number="${escapeHtml(match.matchNumber)}"${roundIdAttribute}${roundIndexAttribute}${matchIndexAttribute}${nextMatchNumber ? ` data-next-match="${escapeHtml(nextMatchNumber)}"` : ""}${runnerUpNextMatchNumber ? ` data-runner-up-next-match="${escapeHtml(runnerUpNextMatchNumber)}"` : ""}${winner ? ` data-winner-team-id="${escapeHtml(winner.id)}"` : ""}${openMatchAttributes}${styleText}>
      <header class="knockout-match-header${statusBadgeHtml ? " has-status-badge" : ""}${isNext ? " has-up-next" : ""}${isLive ? " has-live" : ""}">
        <span class="knockout-match-meta">
          <time datetime="${escapeHtml(match.kickoffUtc || "")}">${escapeHtml(getTournamentMatchDateLabel(match))}</time>
          ${venueLabel ? `<span class="knockout-match-venue"${venueTooltip ? ` aria-label="${escapeHtml(venueTooltip)}" data-tooltip="${escapeHtml(venueTooltip)}" tabindex="0"` : ""}>${escapeHtml(venueLabel)}</span>` : ""}
        </span>
        ${statusBadgeHtml}
      </header>
      <div class="knockout-match-pair">
        ${renderTournamentParticipant(participants.home, {
          isWinner: Boolean(winner && participants.home.team && winner.id === participants.home.team.id),
          isLoser: Boolean(winner && participants.home.team && winner.id !== participants.home.team.id)
        })}
        <span class="knockout-versus" aria-label="${escapeHtml(localizeText("vs"))}">${escapeHtml(localizeText("vs"))}</span>
        ${renderTournamentParticipant(participants.away, {
          isWinner: Boolean(winner && participants.away.team && winner.id === participants.away.team.id),
          isLoser: Boolean(winner && participants.away.team && winner.id !== participants.away.team.id)
        })}
      </div>
      ${footerHtml}
    </article>
  `;
}

function renderTournamentPosterParticipant(entry, options = {}) {
  const { isWinner = false } = options;
  const teamName = entry.team ? getLocalizedStandingName(entry.team) : localizeText(entry.slotText || entry.label);
  const label = entry.team ? getTournamentTeamDisplayName(entry.team) : localizeText(entry.label);
  const classes = [
    "poster-team",
    entry.team ? "is-resolved" : "is-pending",
    isWinner ? "is-winner" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <span class="${classes}"${entry.team ? ` data-team-id="${escapeHtml(entry.team.id)}"` : ""} aria-label="${escapeHtml(teamName)}">
      <span class="poster-team-flag" aria-hidden="true">${entry.team ? renderFlag(entry.team) : ""}</span>
      <span class="poster-team-code">${escapeHtml(label)}</span>
    </span>
  `;
}

function renderTournamentPosterMatch(matchNumber, context, side) {
  const match = getTournamentFixtureByMatchNumber(matchNumber);

  if (!match) {
    return "";
  }

  const participants = getTournamentMatchParticipants(match, context);
  const winner = getTournamentMatchWinnerTeam(match, context);
  const nextMatchNumber = getTournamentNextMatchNumber(match.matchNumber);

  return `
    <article class="poster-match r32-match is-${escapeHtml(side)}${winner ? " is-complete" : ""}" data-match-number="${escapeHtml(match.matchNumber)}"${nextMatchNumber ? ` data-next-match="${escapeHtml(nextMatchNumber)}"` : ""}${winner ? ` data-winner-team-id="${escapeHtml(winner.id)}"` : ""}>
      <div class="poster-match-pair">
        ${renderTournamentPosterParticipant(participants.home, {
          isWinner: Boolean(winner && participants.home.team && winner.id === participants.home.team.id)
        })}
        <span class="poster-versus" aria-label="${escapeHtml(localizeText("vs"))}">${escapeHtml(localizeText("vs"))}</span>
        ${renderTournamentPosterParticipant(participants.away, {
          isWinner: Boolean(winner && participants.away.team && winner.id === participants.away.team.id)
        })}
      </div>
      <time datetime="${escapeHtml(match.kickoffUtc || "")}">${escapeHtml(getTournamentMatchDateLabel(match))}</time>
    </article>
  `;
}

function renderTournamentPosterSide(half, context) {
  return `
    <div class="poster-side is-${escapeHtml(half.side)}" aria-label="${escapeHtml(localizeText(`Path to match ${half.semifinalMatchNumber}`))}">
      ${half.matchNumbers.map((matchNumber) => renderTournamentPosterMatch(matchNumber, context, half.side)).join("")}
    </div>
  `;
}

function renderTournamentPosterCenter() {
  return `
    <div class="poster-center" aria-label="${escapeHtml(localizeText("Round of 32 bracket center"))}">
      <div class="poster-center-panel">
        <span>${escapeHtml(localizeText("As it stands"))}</span>
        <h2>${escapeHtml(localizeText("Round of 32"))}</h2>
        <div class="poster-trophy" aria-hidden="true">
          <svg class="poster-trophy-svg" viewBox="0 0 128 160" focusable="false">
            <defs>
              <linearGradient id="poster-trophy-gold" x1="21" y1="8" x2="107" y2="151" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#f7dd84" />
                <stop offset="0.45" stop-color="#d7a632" />
                <stop offset="1" stop-color="#8d5f19" />
              </linearGradient>
              <linearGradient id="poster-trophy-bright" x1="35" y1="14" x2="80" y2="126" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#fff2b0" />
                <stop offset="0.54" stop-color="#e7bf53" />
                <stop offset="1" stop-color="#b27b24" />
              </linearGradient>
              <radialGradient id="poster-trophy-globe-light" cx="0.36" cy="0.25" r="0.82">
                <stop offset="0" stop-color="#fff5b8" />
                <stop offset="0.58" stop-color="#dfb342" />
                <stop offset="1" stop-color="#9a681d" />
              </radialGradient>
            </defs>
            <ellipse class="poster-trophy-shadow" cx="64" cy="149" rx="42" ry="7" />
            <path class="poster-trophy-arm is-left" d="M52 58C34 61 22 73 23 88c1 17 16 29 34 33l4-15c-13-4-22-11-23-22-.7-8 5-15 18-20Z" />
            <path class="poster-trophy-arm is-right" d="M76 58c18 3 30 15 29 30-1 17-16 29-34 33l-4-15c13-4 22-11 23-22 .7-8-5-15-18-20Z" />
            <circle class="poster-trophy-globe" cx="64" cy="39" r="29" />
            <path class="poster-trophy-map" d="M43 30c8 3 13 2 18-3 8-7 17-4 23 2" />
            <path class="poster-trophy-map" d="M39 43c10-3 18 2 23 8 7 8 18 5 27-2" />
            <path class="poster-trophy-map" d="M58 15c-6 12-6 31 1 49" />
            <path class="poster-trophy-map" d="M72 17c6 13 6 28-1 47" />
            <path class="poster-trophy-core" d="M54 62c-9 17-8 32-1 46 4 8 3 17-3 26h28c-6-9-7-18-3-26 7-14 8-29-1-46-6 4-14 4-20 0Z" />
            <path class="poster-trophy-highlight" d="M55 67c-5 12-5 24 1 37 3 7 3 14-1 21" />
            <rect class="poster-trophy-neck" x="43" y="123" width="42" height="12" rx="6" />
            <rect class="poster-trophy-base-green" x="39" y="133" width="50" height="7" rx="3.5" />
            <rect class="poster-trophy-base" x="27" y="139" width="74" height="13" rx="6.5" />
          </svg>
        </div>
        <strong>${escapeHtml(localizeText("Path below"))}</strong>
      </div>
    </div>
  `;
}

function renderTournamentRoundOf32(context) {
  return `
    <section class="tournament-r32" aria-label="${escapeHtml(localizeText("Round of 32 as it stands"))}">
      <div class="tournament-poster-bracket">
        ${renderTournamentPosterSide(TOURNAMENT_POSTER_HALVES[0], context)}
        ${renderTournamentPosterCenter()}
        ${renderTournamentPosterSide(TOURNAMENT_POSTER_HALVES[1], context)}
      </div>
    </section>
  `;
}

function getTournamentProgressPlacement(round, index) {
  if (round.id === "final" && round.matchNumbers.length > 1) {
    const centeredFinalPlacements = [
      { pathRow: 7, pathSpan: 2 },
      { pathRow: 9, pathSpan: 2 }
    ];

    return centeredFinalPlacements[index] || centeredFinalPlacements.at(-1);
  }

  const spanByRound = {
    final: round.matchNumbers.length > 1 ? 8 : 16,
    "quarter-finals": 4,
    "round-of-16": 2,
    "round-of-32": 1,
    "semi-finals": 8
  };
  const pathSpan = spanByRound[round.id] || 1;

  return {
    pathRow: index * pathSpan + 1,
    pathSpan
  };
}

function renderTournamentProgressRound(round, context, roundIndex, options = {}) {
  const roundLabel = localizeStageLabel(round.label);
  return `
    <section class="progress-round is-${escapeHtml(round.id)}" data-round-id="${escapeHtml(round.id)}" data-round-index="${escapeHtml(roundIndex)}" aria-label="${escapeHtml(roundLabel)}">
      <h3>${escapeHtml(roundLabel)}</h3>
      <div class="progress-match-list">
        ${round.matchNumbers
          .map((matchNumber, index) =>
            renderTournamentMatchCard(getTournamentFixtureByMatchNumber(matchNumber), context, {
              ...getTournamentProgressPlacement(round, index),
              currentTime: options.currentTime,
              matchIndex: index,
              nextMatchIds: options.nextMatchIds,
              roundId: round.id,
              roundIndex
            })
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderTournamentLoadingMatch(round, index, roundIndex) {
  const { pathRow, pathSpan } = getTournamentProgressPlacement(round, index);

  return `
    <article class="progress-match tournament-loading-match" data-round-id="${escapeHtml(round.id)}" data-round-index="${escapeHtml(roundIndex)}" data-match-index="${escapeHtml(index)}" style="--path-row: ${escapeHtml(pathRow)}; --path-span: ${escapeHtml(pathSpan)};" aria-hidden="true">
      <header class="knockout-match-header">
        <span class="match-loading-line tournament-loading-date"></span>
      </header>
      <div class="knockout-match-pair">
        <span class="tournament-loading-team">
          <span class="match-loading-line tournament-loading-flag"></span>
          <span class="match-loading-line tournament-loading-code"></span>
        </span>
        <span class="match-loading-line tournament-loading-versus"></span>
        <span class="tournament-loading-team">
          <span class="match-loading-line tournament-loading-flag"></span>
          <span class="match-loading-line tournament-loading-code"></span>
        </span>
      </div>
      <footer class="knockout-match-footer">
        <span class="match-loading-line tournament-loading-footer"></span>
      </footer>
    </article>
  `;
}

function renderTournamentLoadingRound(round, roundIndex) {
  const roundLabel = localizeStageLabel(round.label);

  return `
    <section class="progress-round is-${escapeHtml(round.id)}" data-round-id="${escapeHtml(round.id)}" data-round-index="${escapeHtml(roundIndex)}" aria-label="${escapeHtml(roundLabel)}">
      <h3>${escapeHtml(roundLabel)}</h3>
      <div class="progress-match-list">
        ${round.matchNumbers.map((_, index) => renderTournamentLoadingMatch(round, index, roundIndex)).join("")}
      </div>
    </section>
  `;
}

function renderTournamentLoadingView() {
  return `
    <section class="tournament-view tournament-view-loading" aria-label="${escapeHtml(localizeText("Tournament bracket"))}" role="status" aria-busy="true">
      <span class="visually-hidden">${escapeHtml(localizeText("Loading standings"))}</span>
      <section class="tournament-progression" aria-label="${escapeHtml(localizeText("Knockout winner progression"))}" tabindex="0">
        <svg class="progress-connectors" aria-hidden="true" focusable="false"></svg>
        <div class="progress-rounds">
          ${TOURNAMENT_PROGRESS_ROUNDS.map(renderTournamentLoadingRound).join("")}
        </div>
      </section>
    </section>
  `;
}

function renderTournamentProgression(context, options = {}) {
  return `
    <section class="tournament-progression" aria-label="${escapeHtml(localizeText("Knockout winner progression"))}" tabindex="0">
      <svg class="progress-connectors" aria-hidden="true" focusable="false"></svg>
      <div class="progress-rounds">
        ${TOURNAMENT_PROGRESS_ROUNDS.map((round, roundIndex) => renderTournamentProgressRound(round, context, roundIndex, options)).join("")}
      </div>
    </section>
  `;
}

function renderTournamentView() {
  const context = createTournamentProgressionContext();
  const currentTime = Date.now();
  const nextMatchIds = getGlobalNextMatchIds(currentTime);

  return `
    <section class="tournament-view" aria-label="${escapeHtml(localizeText("Tournament bracket"))}">
      ${renderTournamentProgression(context, { currentTime, nextMatchIds })}
    </section>
  `;
}

function isHistoricalFinalRoundLabel(label) {
  return /^final$/i.test(String(label || "").trim());
}

function isHistoricalFinalRoundPoolLabel(label) {
  return /^final round$/i.test(String(label || "").trim());
}

function isHistoricalThirdPlaceRoundLabel(label) {
  const text = String(label || "").toLowerCase();
  return /third|3rd/.test(text) && /place|play-?off|match/.test(text);
}

function normalizeHistoricalTournamentRoundLabel(label) {
  const text = String(label || "").trim();

  if (/^quarterfinals$/i.test(text)) {
    return "Quarter-finals";
  }

  if (/^semifinals$/i.test(text)) {
    return "Semi-finals";
  }

  if (isHistoricalThirdPlaceRoundLabel(text)) {
    return "Third-place play-off";
  }

  return text || "Knockout round";
}

function getHistoricalFinalGroupStageRoundLabel(fixture) {
  const config = getHistoricalFinalGroupStageConfig(fixture?.tournamentYear);
  return `${config?.label || "Final round"} ${fixture?.group || "Group"}`;
}

function getHistoricalTournamentRoundLabel(fixture) {
  if (isHistoricalFinalGroupStageFixture(fixture)) {
    return getHistoricalFinalGroupStageRoundLabel(fixture);
  }

  const normalizedLabel = normalizeHistoricalTournamentRoundLabel(fixture?.round);

  if (
    isHistoricalFinalRoundLabel(normalizedLabel) ||
    isHistoricalThirdPlaceRoundLabel(normalizedLabel)
  ) {
    return "Final";
  }

  return normalizedLabel;
}

function getHistoricalTournamentRoundKey(fixture) {
  if (isHistoricalFinalGroupStageFixture(fixture)) {
    return `final-group-${normalizeTextKey(fixture.group).replace(/\s+/g, "-") || "group"}`;
  }

  const normalizedLabel = normalizeHistoricalTournamentRoundLabel(fixture?.round);

  if (isHistoricalFinalRoundLabel(normalizedLabel) || isHistoricalThirdPlaceRoundLabel(normalizedLabel)) {
    return "final";
  }

  return normalizeTextKey(normalizedLabel).replace(/\s+/g, "-") || "round";
}

function getHistoricalTournamentRoundClassName(round) {
  if (round.isGroupPool) {
    return "final-group";
  }

  if (round.key === "final") {
    return "final";
  }

  return round.key;
}

function getHistoricalTournamentRoundOrderValue(fixture) {
  if (isHistoricalFinalGroupStageFixture(fixture)) {
    return `0:${fixture.group || ""}`;
  }

  return `1:${getFixtureSortValue(fixture)}`;
}

function getHistoricalTournamentRoundSortValue(fixture) {
  if (isHistoricalFinalGroupStageFixture(fixture)) {
    return getFixtureSortValue(fixture);
  }

  if (isHistoricalFinalRoundLabel(fixture.round)) {
    return `0:${getFixtureSortValue(fixture)}`;
  }

  if (isHistoricalThirdPlaceRoundLabel(fixture.round)) {
    return `1:${getFixtureSortValue(fixture)}`;
  }

  return `2:${getFixtureSortValue(fixture)}`;
}

function getHistoricalTournamentRounds(year) {
  const rounds = [];
  const roundsByKey = new Map();

  for (const fixture of getHistoricalTournamentFixturesForYear(year)) {
    const key = getHistoricalTournamentRoundKey(fixture);
    if (!roundsByKey.has(key)) {
      const isGroupPool = isHistoricalFinalGroupStageFixture(fixture);
      const round = {
        fixtures: [],
        isGroupPool,
        key,
        label: getHistoricalTournamentRoundLabel(fixture),
        orderValue: getHistoricalTournamentRoundOrderValue(fixture)
      };
      roundsByKey.set(key, round);
      rounds.push(round);
    }

    roundsByKey.get(key).fixtures.push(hydrateFixture(fixture));
  }

  rounds.forEach((round) => {
    round.fixtures.sort((a, b) =>
      getHistoricalTournamentRoundSortValue(a).localeCompare(getHistoricalTournamentRoundSortValue(b))
    );
  });

  return rounds.sort((a, b) => a.orderValue.localeCompare(b.orderValue));
}

function getHistoricalTournamentPathRowCount(rounds) {
  return Math.max(TOURNAMENT_PROGRESS_PATH_ROWS, ...rounds.map((round) => round.fixtures.length));
}

function getHistoricalTournamentProgressPlacement(round, index, rowCount) {
  if (round.key === "final" && round.fixtures.length > 1) {
    const pathSpan = Math.max(1, Math.floor(rowCount / 8));
    const topPathRow = Math.max(1, Math.floor(rowCount / 2) - pathSpan + 1);
    const finalPlacements = [
      { pathRow: topPathRow, pathSpan },
      { pathRow: topPathRow + pathSpan, pathSpan }
    ];

    return finalPlacements[index] || finalPlacements.at(-1);
  }

  const matchCount = Math.max(1, round.fixtures.length);
  const pathSpan = Math.max(1, Math.floor(rowCount / matchCount));
  const pathRow = Math.floor((index * rowCount) / matchCount) + 1;

  return { pathRow, pathSpan };
}

function getHistoricalTournamentTimeLabel(match) {
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(String(match?.localTime || "").trim());

  if (!timeMatch) {
    return match?.localTime || "";
  }

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) {
    return match.localTime;
  }

  return new Intl.DateTimeFormat(getAppLocale(), {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    timeZone: "UTC"
  })
    .format(new Date(Date.UTC(2000, 0, 1, hours, minutes)))
    .replace(" ", "");
}

function getHistoricalTournamentMatchDateLabel(match) {
  if (!match?.date) {
    return "";
  }

  const dateText = navDateFormatter.format(getDateFromKey(match.date));
  const timeText = getHistoricalTournamentTimeLabel(match);
  const localTimeText = timeText
    ? currentLanguage === "zh"
      ? `当地${timeText}`
      : `${timeText} local`
    : "";
  const baseLabel = [dateText, localTimeText].filter(Boolean).join(" ");

  if (isHistoricalThirdPlaceRoundLabel(match.round)) {
    return `${baseLabel} (${localizeText("3rd place match")})`;
  }

  return baseLabel;
}

function getHistoricalNextTournamentMatchNumber(fixtures, match, teamName) {
  if (!teamName) {
    return "";
  }

  const currentSortValue = getFixtureSortValue(match);
  const nextMatch = fixtures.find(
    (fixture) =>
      getFixtureSortValue(fixture) > currentSortValue &&
      (fixture.homeSlot === teamName || fixture.awaySlot === teamName)
  );

  return nextMatch?.matchNumber || "";
}

function getHistoricalTournamentParticipant(match, side) {
  const team = side === "away" ? match.awayTeam : match.homeTeam;
  const slotText = side === "away" ? match.awaySlot : match.homeSlot;

  return {
    isLocked: true,
    label: getTournamentTeamDisplayName(team),
    likelihoodPercent: null,
    likelihoodReason: "",
    seedLabel: "",
    slotText,
    state: "resolved",
    team
  };
}

function getHistoricalTournamentWinnerSide(match) {
  const winner = getHistoricalWinner(match);

  if (!winner) {
    return "";
  }

  if (winner === match.homeSlot) {
    return "home";
  }

  if (winner === match.awaySlot) {
    return "away";
  }

  return "";
}

function renderHistoricalTournamentMatchCard(match, context, options = {}) {
  const participants = {
    away: getHistoricalTournamentParticipant(match, "away"),
    home: getHistoricalTournamentParticipant(match, "home")
  };
  const winnerSide = getHistoricalTournamentWinnerSide(match);
  const winner = winnerSide ? participants[winnerSide].team : null;
  const isComplete = match.status === "FT" || Boolean(winner);
  const resultText = getHistoricalScoreText(match);
  const venueLabel = match.venue ? getTournamentVenueLabel(match) : "";
  const venueTooltip = match.venue ? getVenueLabel(match) : "";
  const shouldRenderPath = !options.isGroupPool;
  const nextMatchNumber = shouldRenderPath && winnerSide
    ? getHistoricalNextTournamentMatchNumber(context.fixtures, match, match[`${winnerSide}Slot`])
    : "";
  const loserSide = winnerSide === "home" ? "away" : winnerSide === "away" ? "home" : "";
  const runnerUpNextMatchNumber = shouldRenderPath && loserSide
    ? getHistoricalNextTournamentMatchNumber(context.fixtures, match, match[`${loserSide}Slot`])
    : "";
  const cardClasses = [
    "progress-match",
    "historical-progress-match",
    isComplete ? "is-complete" : "",
    "is-openable"
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <article class="${escapeHtml(cardClasses)}" data-match-number="${escapeHtml(match.matchNumber)}" data-round-id="${escapeHtml(options.roundId || "")}" data-round-index="${escapeHtml(options.roundIndex)}" data-match-index="${escapeHtml(options.matchIndex)}"${nextMatchNumber ? ` data-next-match="${escapeHtml(nextMatchNumber)}"` : ""}${runnerUpNextMatchNumber ? ` data-runner-up-next-match="${escapeHtml(runnerUpNextMatchNumber)}"` : ""}${winner ? ` data-winner-team-id="${escapeHtml(winner.id)}"` : ""} data-open-match-id="${escapeHtml(match.id)}" role="button" tabindex="0" aria-label="${escapeHtml(getTournamentOpenMatchLabel(participants))}" style="--path-row: ${escapeHtml(options.pathRow)}; --path-span: ${escapeHtml(options.pathSpan)};">
      <header class="knockout-match-header">
        <span class="knockout-match-meta">
          <time datetime="${escapeHtml(match.date || "")}">${escapeHtml(getHistoricalTournamentMatchDateLabel(match))}</time>
          ${venueLabel ? `<span class="knockout-match-venue"${venueTooltip ? ` aria-label="${escapeHtml(venueTooltip)}" data-tooltip="${escapeHtml(venueTooltip)}" tabindex="0"` : ""}>${escapeHtml(venueLabel)}</span>` : ""}
        </span>
      </header>
      <div class="knockout-match-pair">
        ${renderTournamentParticipant(participants.home, {
          isWinner: winnerSide === "home",
          isLoser: Boolean(winnerSide && winnerSide !== "home")
        })}
        <span class="knockout-versus" aria-label="${escapeHtml(localizeText("vs"))}">${escapeHtml(localizeText("vs"))}</span>
        ${renderTournamentParticipant(participants.away, {
          isWinner: winnerSide === "away",
          isLoser: Boolean(winnerSide && winnerSide !== "away")
        })}
      </div>
      <footer class="knockout-match-footer">
        <span class="knockout-result-pill" aria-label="${escapeHtml(resultText)}">${escapeHtml(resultText)}</span>
      </footer>
    </article>
  `;
}

function renderHistoricalTournamentRound(round, context, roundIndex, rowCount) {
  const roundLabel = localizeStageLabel(round.label);
  const roundClassName = getHistoricalTournamentRoundClassName(round);

  return `
    <section class="progress-round is-${escapeHtml(roundClassName)}" data-round-id="${escapeHtml(round.key)}" data-round-index="${escapeHtml(roundIndex)}" aria-label="${escapeHtml(roundLabel)}">
      <h3>${escapeHtml(roundLabel)}</h3>
      <div class="progress-match-list">
        ${round.fixtures
          .map((match, matchIndex) =>
            renderHistoricalTournamentMatchCard(match, context, {
              ...getHistoricalTournamentProgressPlacement(round, matchIndex, rowCount),
              isGroupPool: round.isGroupPool,
              matchIndex,
              roundId: round.key,
              roundIndex
            })
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderHistoricalTournamentView(year) {
  const rounds = getHistoricalTournamentRounds(year);

  if (!rounds.length) {
    return `
      <article class="standings-card standings-empty-card">
        <h2>${escapeHtml(localizeText(`${year} archive`))}</h2>
        <p class="past-empty">${escapeHtml(localizeText("Knockout bracket is not available for this archived tournament."))}</p>
      </article>
    `;
  }

  const context = {
    fixtures: getHistoricalTournamentFixturesForYear(year).map(hydrateFixture)
  };
  const pathRows = getHistoricalTournamentPathRowCount(rounds);

  return `
    <section class="tournament-view historical-tournament-view" aria-label="${escapeHtml(localizeText("Tournament bracket"))}" style="--tournament-round-count: ${escapeHtml(rounds.length)}; --tournament-path-rows: ${escapeHtml(pathRows)};">
      <section class="tournament-progression" aria-label="${escapeHtml(localizeText("Knockout winner progression"))}" tabindex="0">
        <svg class="progress-connectors" aria-hidden="true" focusable="false"></svg>
        <div class="progress-rounds">
          ${rounds
            .map((round, roundIndex) =>
              renderHistoricalTournamentRound(round, context, roundIndex, pathRows)
            )
            .join("")}
        </div>
      </section>
    </section>
  `;
}

function openMatchFromTournament(matchId) {
  const fixture = getFixtureById(matchId);

  if (!fixture) {
    return;
  }

  const match = hydrateFixture(fixture);
  selectedDayKey = getFixtureDayKey(match);
  calendarMonthKey = getMonthKeyFromDayKey(selectedDayKey);
  activeMatchId = match.id;
  clearTeamSearch({ render: false });
  setCalendarOpen(false);
  setCatchUpOpen(false);
  setSettingsOpen(false);
  setStandingsYearOpen(false);
  setActiveView("matches", { historyMode: "push" });
  renderSchedule();
  renderMatchInfo(match, { reveal: true });
  updateUrlState();

  window.requestAnimationFrame(() => {
    const row = matchList.querySelector(`.match-row[data-match-id="${CSS.escape(match.id)}"]`);
    row?.scrollIntoView({ block: "nearest", inline: "nearest" });
    row?.querySelector(".match-row-trigger")?.focus({ preventScroll: true });
  });
}

function isTournamentMobileLayout() {
  if (typeof window.matchMedia === "function") {
    return window.matchMedia(TOURNAMENT_MOBILE_BREAKPOINT_QUERY).matches;
  }

  return window.innerWidth <= 900;
}

function getTournamentProgressionElements(root = standingsGrid) {
  const progression = root?.querySelector(".tournament-progression");
  const rounds = progression?.querySelector(".progress-rounds");

  return { progression, rounds };
}

function updateTournamentBoardLayout(root = standingsGrid) {
  const { progression, rounds } = getTournamentProgressionElements(root);

  if (!progression || !rounds) {
    return;
  }

  progression.classList.toggle("is-mobile-board", isTournamentMobileLayout());
  progression.classList.remove("is-mobile-dragging");
  progression.setAttribute("aria-label", localizeText("Knockout winner progression"));
  progression.removeAttribute("data-mobile-active-round-index");
  progression.removeAttribute("data-mobile-active-round-id");
  rounds.style.removeProperty("--tournament-mobile-active-index");
  rounds.style.removeProperty("--tournament-mobile-drag-x");
  rounds.style.removeProperty("--tournament-mobile-window-x");
  rounds.style.removeProperty("--tournament-mobile-row-count");
  progression.querySelectorAll(".progress-round").forEach((round) => {
    round.classList.remove(
      "is-before-mobile-window",
      "is-mobile-window-round",
      "is-mobile-window-lead"
    );
    round.removeAttribute("aria-hidden");
  });
  progression.querySelectorAll(".progress-match").forEach((match) => {
    match.style.removeProperty("--mobile-path-row");
    match.style.removeProperty("--mobile-path-span");
  });

  scheduleTournamentConnectorUpdate();
}

function getTournamentProgressionFromEvent(event) {
  if (!(event.target instanceof Element)) {
    return null;
  }

  const progression = event.target.closest(".tournament-progression");

  if (!progression || !standingsGrid.contains(progression) || !isTournamentMobileLayout()) {
    return null;
  }

  return progression;
}

function getWindowMaxScrollY() {
  const documentElement = document.documentElement;
  const body = document.body;
  const scrollHeight = Math.max(
    documentElement?.scrollHeight || 0,
    body?.scrollHeight || 0,
    documentElement?.offsetHeight || 0,
    body?.offsetHeight || 0
  );

  return Math.max(0, scrollHeight - window.innerHeight);
}

function handleTournamentBoardPointerDown(event) {
  const progression = getTournamentProgressionFromEvent(event);

  if (!progression || event.button > 0) {
    return;
  }

  tournamentBoardDragGesture = {
    didDrag: false,
    didWindowScrollHandoff: false,
    pointerId: event.pointerId,
    progression,
    startScrollLeft: progression.scrollLeft,
    startScrollTop: progression.scrollTop,
    startWindowScrollY: window.scrollY,
    startX: event.clientX,
    startY: event.clientY
  };

  progression.setPointerCapture?.(event.pointerId);
}

function handleTournamentBoardPointerMove(event) {
  if (!tournamentBoardDragGesture || event.pointerId !== tournamentBoardDragGesture.pointerId) {
    return;
  }

  const deltaX = event.clientX - tournamentBoardDragGesture.startX;
  const deltaY = event.clientY - tournamentBoardDragGesture.startY;

  if (!tournamentBoardDragGesture.didDrag) {
    if (Math.hypot(deltaX, deltaY) < 8) {
      return;
    }

    tournamentBoardDragGesture.didDrag = true;
    tournamentBoardDragGesture.progression.classList.add("is-mobile-dragging");
  }

  event.preventDefault();
  const desiredScrollLeft = tournamentBoardDragGesture.startScrollLeft - deltaX;
  const desiredScrollTop = tournamentBoardDragGesture.startScrollTop - deltaY;
  const maxScrollTop = Math.max(
    0,
    tournamentBoardDragGesture.progression.scrollHeight -
      tournamentBoardDragGesture.progression.clientHeight
  );
  const nextScrollTop = clampNumber(desiredScrollTop, 0, maxScrollTop);
  const verticalOverflow = desiredScrollTop - nextScrollTop;

  tournamentBoardDragGesture.progression.scrollLeft = desiredScrollLeft;
  tournamentBoardDragGesture.progression.scrollTop = nextScrollTop;

  if (verticalOverflow !== 0 || tournamentBoardDragGesture.didWindowScrollHandoff) {
    tournamentBoardDragGesture.didWindowScrollHandoff = true;
    const nextWindowScrollY = clampNumber(
      tournamentBoardDragGesture.startWindowScrollY + verticalOverflow,
      0,
      getWindowMaxScrollY()
    );
    window.scrollTo({
      left: window.scrollX,
      top: nextWindowScrollY
    });
  }
}

function finishTournamentBoardPointerGesture(event) {
  if (!tournamentBoardDragGesture || event.pointerId !== tournamentBoardDragGesture.pointerId) {
    return;
  }

  const { didDrag, progression } = tournamentBoardDragGesture;

  progression.releasePointerCapture?.(event.pointerId);
  progression.classList.remove("is-mobile-dragging");
  tournamentBoardDragGesture = null;

  if (didDrag) {
    tournamentBoardSuppressClickUntil = Date.now() + 250;
  }
}

function cancelTournamentBoardPointerGesture(event) {
  if (!tournamentBoardDragGesture || event.pointerId !== tournamentBoardDragGesture.pointerId) {
    return;
  }

  tournamentBoardDragGesture.progression.releasePointerCapture?.(event.pointerId);
  tournamentBoardDragGesture.progression.classList.remove("is-mobile-dragging");
  tournamentBoardDragGesture = null;
}

function handleTournamentBoardKeydown(event) {
  const progression = getTournamentProgressionFromEvent(event);
  const scrollByKey = {
    ArrowDown: { left: 0, top: 180 },
    ArrowLeft: { left: -180, top: 0 },
    ArrowRight: { left: 180, top: 0 },
    ArrowUp: { left: 0, top: -180 }
  };
  const scrollDelta = scrollByKey[event.key];

  if (!progression || !scrollDelta) {
    return;
  }

  event.preventDefault();
  progression.scrollBy({
    ...scrollDelta,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
  });
}

function clearScheduledTournamentConnectorUpdate() {
  if (tournamentConnectorFrameId) {
    window.cancelAnimationFrame(tournamentConnectorFrameId);
    tournamentConnectorFrameId = 0;
  }

  if (tournamentConnectorRetryTimeoutId) {
    window.clearTimeout(tournamentConnectorRetryTimeoutId);
    tournamentConnectorRetryTimeoutId = 0;
  }
}

function scheduleTournamentConnectorUpdate(retries = 6) {
  clearScheduledTournamentConnectorUpdate();
  tournamentConnectorFrameId = window.requestAnimationFrame(() => {
    tournamentConnectorFrameId = 0;
    const didRender = updateTournamentConnectors();

    if (!didRender && retries > 0) {
      tournamentConnectorRetryTimeoutId = window.setTimeout(() => {
        tournamentConnectorRetryTimeoutId = 0;
        scheduleTournamentConnectorUpdate(retries - 1);
      }, 60);
    }
  });
}

function updateTournamentConnectors() {
  const progression = standingsGrid?.querySelector(".tournament-progression");
  const svg = progression?.querySelector(".progress-connectors");
  const rounds = progression?.querySelector(".progress-rounds");

  if (!progression || !svg || !rounds) {
    return false;
  }

  const progressionRect = progression.getBoundingClientRect();
  const roundsRect = rounds.getBoundingClientRect();
  if (progressionRect.width < 1 || progressionRect.height < 1 || roundsRect.width < 1) {
    return false;
  }

  const columnCount = getComputedStyle(rounds).gridTemplateColumns.split(" ").filter(Boolean).length;
  svg.replaceChildren();
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.style.width = "";
  svg.style.height = "";

  if (columnCount <= 1) {
    return true;
  }

  const width = Math.ceil(Math.max(progression.scrollWidth, progressionRect.width));
  const height = Math.ceil(Math.max(progression.scrollHeight, progressionRect.height));

  if (width < 2 || height < 2) {
    return false;
  }

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.style.width = `${width}px`;
  svg.style.height = `${height}px`;

  const getRelativePoint = (rect, side) => ({
    x:
      (side === "left" ? rect.left - progressionRect.left : rect.right - progressionRect.left) +
      progression.scrollLeft,
    y: rect.top + rect.height / 2 - progressionRect.top + progression.scrollTop
  });
  const roundPoint = (value) => Math.round(value * 2) / 2;

  function shouldSkipMobileConnector(source, target) {
    if (!isTournamentMobileLayout()) {
      return false;
    }

    const sourceRound = source.closest(".progress-round");
    const targetRound = target.closest(".progress-round");

    return Boolean(
      sourceRound?.classList.contains("is-before-mobile-window") ||
        targetRound?.classList.contains("is-before-mobile-window")
    );
  }

  function appendConnector(source, targetMatchNumber, className = "") {
    const target = progression.querySelector(
      `.progress-match[data-match-number="${CSS.escape(targetMatchNumber)}"]`
    );

    if (!target) {
      return false;
    }

    if (shouldSkipMobileConnector(source, target)) {
      return false;
    }

    const sourcePoint = getRelativePoint(source.getBoundingClientRect(), "right");
    const targetPoint = getRelativePoint(target.getBoundingClientRect(), "left");

    if (targetPoint.x <= sourcePoint.x) {
      return false;
    }

    const joinX = roundPoint(sourcePoint.x + (targetPoint.x - sourcePoint.x) / 2);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    if (className) {
      path.classList.add(className);
    }
    path.setAttribute(
      "d",
      [
        `M ${roundPoint(sourcePoint.x)} ${roundPoint(sourcePoint.y)}`,
        `H ${joinX}`,
        `V ${roundPoint(targetPoint.y)}`,
        `H ${roundPoint(targetPoint.x)}`
      ].join(" ")
    );
    svg.append(path);
    return true;
  }

  function getFinalColumnRailElements() {
    const finalRound = progression.querySelector(".progress-round.is-final");
    const finalTargets = finalRound
      ? [...finalRound.querySelectorAll(".progress-match")].sort(
          (a, b) => Number(a.dataset.matchIndex || 0) - Number(b.dataset.matchIndex || 0)
        )
      : [];

    if (finalTargets.length < 2) {
      return null;
    }

    const [finalTarget, bronzeTarget] = finalTargets;
    const finalMatchNumber = finalTarget.dataset.matchNumber || "";
    const bronzeMatchNumber = bronzeTarget.dataset.matchNumber || "";

    if (!finalMatchNumber || !bronzeMatchNumber) {
      return null;
    }

    const sources = [...progression.querySelectorAll(".progress-match[data-next-match][data-runner-up-next-match]")]
      .filter(
        (source) =>
          !finalRound.contains(source) &&
          source.dataset.nextMatch === finalMatchNumber &&
          source.dataset.runnerUpNextMatch === bronzeMatchNumber
      )
      .sort(
        (a, b) => Number(a.dataset.matchIndex || 0) - Number(b.dataset.matchIndex || 0)
      );

    if (sources.length < 2) {
      return null;
    }

    return {
      bottomSource: sources[1],
      bronzeMatchNumber,
      bronzeTarget,
      finalMatchNumber,
      finalTarget,
      topSource: sources[0]
    };
  }

  function appendFinalColumnRail(railElements) {
    if (!railElements) {
      return false;
    }

    const { topSource, bottomSource, finalTarget, bronzeTarget } = railElements;

    if (
      shouldSkipMobileConnector(topSource, finalTarget) ||
      shouldSkipMobileConnector(bottomSource, bronzeTarget)
    ) {
      return false;
    }

    const topSourcePoint = getRelativePoint(topSource.getBoundingClientRect(), "right");
    const bottomSourcePoint = getRelativePoint(bottomSource.getBoundingClientRect(), "right");
    const finalTargetPoint = getRelativePoint(finalTarget.getBoundingClientRect(), "left");
    const bronzeTargetPoint = getRelativePoint(bronzeTarget.getBoundingClientRect(), "left");
    const targetX = Math.min(finalTargetPoint.x, bronzeTargetPoint.x);
    const sourceX = Math.max(topSourcePoint.x, bottomSourcePoint.x);

    if (targetX <= sourceX) {
      return false;
    }

    const railX = roundPoint(sourceX + (targetX - sourceX) / 2);
    const railTop = roundPoint(Math.min(topSourcePoint.y, finalTargetPoint.y));
    const railBottom = roundPoint(Math.max(bottomSourcePoint.y, bronzeTargetPoint.y));
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    path.classList.add("is-final-rail");
    path.setAttribute(
      "d",
      [
        `M ${roundPoint(topSourcePoint.x)} ${roundPoint(topSourcePoint.y)} H ${railX}`,
        `M ${roundPoint(bottomSourcePoint.x)} ${roundPoint(bottomSourcePoint.y)} H ${railX}`,
        `M ${railX} ${railTop} V ${railBottom}`,
        `M ${railX} ${roundPoint(finalTargetPoint.y)} H ${roundPoint(finalTargetPoint.x)}`,
        `M ${railX} ${roundPoint(bronzeTargetPoint.y)} H ${roundPoint(bronzeTargetPoint.x)}`
      ].join(" ")
    );
    svg.append(path);
    return true;
  }

  const finalRailElements = getFinalColumnRailElements();
  let renderedConnectorCount = 0;
  if (appendFinalColumnRail(finalRailElements)) {
    renderedConnectorCount += 1;
  }

  progression.querySelectorAll(".progress-match[data-next-match], .progress-match[data-runner-up-next-match]").forEach((source) => {
    if (
      finalRailElements &&
      (source === finalRailElements.topSource || source === finalRailElements.bottomSource) &&
      source.dataset.nextMatch === finalRailElements.finalMatchNumber &&
      source.dataset.runnerUpNextMatch === finalRailElements.bronzeMatchNumber
    ) {
      return;
    }

    if (source.dataset.nextMatch) {
      renderedConnectorCount += appendConnector(source, source.dataset.nextMatch) ? 1 : 0;
    }

    if (source.dataset.runnerUpNextMatch) {
      renderedConnectorCount += appendConnector(source, source.dataset.runnerUpNextMatch, "is-runner-up-path") ? 1 : 0;
    }
  });

  return renderedConnectorCount > 0;
}

function renderCurrentStandingsCards() {
  const thirdPlaceRaceByTeamId = getThirdPlaceRaceByTeamId();

  return tournament.groups
    .map(
      (group) => `
        <article class="standings-card" data-group-id="${escapeHtml(group.id)}" tabindex="-1">
          <h2>${escapeHtml(localizeText(group.label))}</h2>
          ${renderStandings(group.id, { thirdPlaceRaceByTeamId })}
        </article>
      `
    )
    .join("");
}

function renderHistoricalStandingsCards(year) {
  const groups = getHistoricalStandingsGroups(year);

  if (!groups.length) {
    return `
      <article class="standings-card standings-empty-card">
        <h2>${escapeHtml(localizeText(`${year} archive`))}</h2>
        <p class="past-empty">${escapeHtml(localizeText("Group standings are not available for this archived tournament."))}</p>
      </article>
    `;
  }

  return groups
    .map(
      (groupName) => `
        <article class="standings-card">
          <h2>${escapeHtml(localizeText(groupName))}</h2>
          ${renderHistoricalStandingsTable(year, groupName)}
        </article>
      `
    )
    .join("");
}

function getValidStandingsMode(value, fallback = null, year = selectedStandingsYear) {
  const availableModes = getAvailableStandingsModes(year);
  const resolvedFallback =
    fallback && availableModes.includes(fallback) ? fallback : getDefaultStandingsModeForYear(year);

  return availableModes.includes(value) ? value : resolvedFallback;
}

function renderStandingsYearPicker() {
  if (!standingsYearGrid) {
    return;
  }

  standingsYearGrid.replaceChildren(
    ...getAvailableStandingsYears().map((year) => {
      const button = document.createElement("button");
      const isSelected = year === selectedStandingsYear;

      button.type = "button";
      button.className = ["standings-year-option", isSelected ? "is-selected" : ""]
        .filter(Boolean)
        .join(" ");
      button.dataset.standingsYear = String(year);
      button.setAttribute("aria-pressed", String(isSelected));
      button.textContent = String(year);
      return button;
    })
  );
}

function updateStandingsModeControls() {
  const availableModes = getAvailableStandingsModes(selectedStandingsYear);
  const shouldShowModeTabs = availableModes.length > 1;

  if (standingsModeTabsShell) {
    standingsModeTabsShell.hidden = !shouldShowModeTabs;
  }

  standingsModeTabs.forEach((tab) => {
    const isAvailable = availableModes.includes(tab.dataset.standingsMode);
    const isSelected =
      shouldShowModeTabs && isAvailable && tab.dataset.standingsMode === selectedStandingsMode;

    tab.classList.toggle("is-active", isSelected);
    tab.disabled = !shouldShowModeTabs || !isAvailable;
    tab.hidden = !shouldShowModeTabs || !isAvailable;
    tab.setAttribute("aria-pressed", String(isSelected));
  });
  updateStandingsModeTabIndicator();
}

function updateStandingsControls() {
  if (standingsYearButton) {
    standingsYearButton.textContent = String(selectedStandingsYear);
    standingsHeading?.setAttribute("aria-label", String(selectedStandingsYear));
    standingsYearButton.setAttribute(
      "aria-label",
      localizeText(`Choose standings year, ${selectedStandingsYear} selected`)
    );
    standingsYearButton.setAttribute("aria-expanded", String(isStandingsYearOpen));
  }

  if (standingsSummary) {
    const summaryText =
      selectedStandingsYear === CURRENT_STANDINGS_YEAR
        ? selectedStandingsMode === "third-place"
          ? THIRD_PLACE_STANDINGS_SUMMARY
          : selectedStandingsMode === "tournament"
            ? TOURNAMENT_STANDINGS_SUMMARY
          : CURRENT_STANDINGS_SUMMARY
        : selectedStandingsMode === "tournament"
          ? getHistoricalTournamentStandingsSummary(selectedStandingsYear)
          : HISTORICAL_STANDINGS_SUMMARY;
    standingsSummary.textContent = localizeText(summaryText);
  }

  renderStandingsYearPicker();
  updateStandingsModeControls();
}

function renderStandingsLoadingState() {
  const isCurrentYear = selectedStandingsYear === CURRENT_STANDINGS_YEAR;
  const isThirdPlaceMode = isCurrentYear && selectedStandingsMode === "third-place";
  const isTournamentMode = selectedStandingsMode === "tournament";

  updateStandingsControls();
  standingsGrid.classList.add("is-loading");
  standingsGrid.classList.toggle("is-third-place-race", isThirdPlaceMode);
  standingsGrid.classList.toggle("is-tournament", isTournamentMode);
  standingsGrid.setAttribute("aria-busy", "true");
  standingsGrid.setAttribute(
    "aria-label",
    localizeText(
      isTournamentMode
        ? "Tournament bracket"
        : isThirdPlaceMode
          ? "Best third-place race"
          : "Group standings"
    )
  );
  let standingsLoadingMarkup = `
    <div class="standings-loading" role="status">
      <p class="visually-hidden">${escapeHtml(localizeText("Loading standings"))}</p>
      ${Array.from({ length: 3 }, () => `
        <article class="standings-card standings-loading-card" aria-hidden="true">
          <span class="match-loading-line standings-loading-title"></span>
          ${Array.from({ length: 3 }, () => `
            <div class="standings-loading-row">
              <span class="match-loading-line standings-loading-team"></span>
              <span class="match-loading-line standings-loading-stat"></span>
              <span class="match-loading-line standings-loading-stat"></span>
              <span class="match-loading-line standings-loading-stat"></span>
            </div>
          `).join("")}
        </article>
      `).join("")}
    </div>
  `;

  if (isTournamentMode) {
    standingsLoadingMarkup = renderTournamentLoadingView();
  } else if (isThirdPlaceMode) {
    standingsLoadingMarkup = renderThirdPlaceRaceLoadingView();
  }

  standingsGrid.innerHTML = standingsLoadingMarkup;
  updateTournamentBoardLayout();
}

function renderStandingsView() {
  if (isInitialDataLoading) {
    renderStandingsLoadingState();
    return;
  }

  const isCurrentYear = selectedStandingsYear === CURRENT_STANDINGS_YEAR;
  const isThirdPlaceMode = isCurrentYear && selectedStandingsMode === "third-place";
  const isTournamentMode = selectedStandingsMode === "tournament";

  updateStandingsControls();
  standingsGrid.classList.remove("is-loading");
  standingsGrid.removeAttribute("aria-busy");
  standingsGrid.classList.toggle("is-third-place-race", isThirdPlaceMode);
  standingsGrid.classList.toggle("is-tournament", isTournamentMode);
  standingsGrid.setAttribute(
    "aria-label",
    localizeText(
      isTournamentMode
        ? "Tournament bracket"
        : isThirdPlaceMode
          ? "Best third-place race"
          : "Group standings"
    )
  );
  standingsGrid.innerHTML = isCurrentYear
    ? isTournamentMode
      ? renderTournamentView()
      : isThirdPlaceMode
      ? renderThirdPlaceRaceView()
      : renderCurrentStandingsCards()
    : isTournamentMode
      ? renderHistoricalTournamentView(selectedStandingsYear)
      : renderHistoricalStandingsCards(selectedStandingsYear);
  updateStandingNameTooltips(standingsGrid);
  updateTooltipBounds(standingsGrid);
  updateTournamentBoardLayout();
  window.requestAnimationFrame(updateTournamentConnectors);
}

function renderPredictionBar(label, value) {
  const percent = clampPercent(value);
  const localizedLabel = localizeText(label);
  const escapedLabel = escapeHtml(localizedLabel);
  return `
    <div class="prediction-row" data-tooltip="${escapedLabel}">
      ${renderMeasuredLabel(localizedLabel, "prediction-label")}
      <div class="prediction-track" aria-hidden="true">
        <span style="width: ${percent}%"></span>
      </div>
      <strong>${percent}%</strong>
    </div>
  `;
}

function getProjectionMethodHelp(projection) {
  if (!projection) {
    return "";
  }

  if (projection?.method === "fifa-ranking-baseline") {
    return "Local estimate using FIFA rankings. Not betting odds.";
  }

  if (projection?.method === "market-implied-consensus") {
    return "Market consensus based on public odds. Not betting advice.";
  }

  if (projection?.method === "historical-world-cup-form-baseline") {
    return "Local historical-form estimate. Not betting odds.";
  }

  return "Local preview estimate. Not betting odds.";
}

function renderPredictionHeading(projection) {
  const help = getProjectionMethodHelp(projection);
  const localizedHelp = help ? localizeText(help) : "";

  return `
    <h3 class="info-heading">
      <span>${escapeHtml(localizeText("Prediction"))}</span>
      ${
        localizedHelp
          ? `<button class="info-tooltip-button" type="button" aria-label="${escapeHtml(localizeText(`Prediction source: ${help}`))}" data-tooltip="${escapeHtml(localizedHelp)}">i</button>`
          : ""
      }
    </h3>
  `;
}

function renderProjection(match) {
  if (!match.projection) {
    return `<p class="past-empty">${escapeHtml(localizeText("No verified projection is loaded for this fixture yet."))}</p>`;
  }

  return `
    ${renderPredictionBar(match.homeTeam.name, match.projection.home)}
    ${renderPredictionBar("Tie", match.projection.draw)}
    ${renderPredictionBar(match.awayTeam.name, match.projection.away)}
  `;
}

function renderPredictionBlock(match) {
  return `
    <section class="info-block match-prediction-block has-section-divider">
      ${renderPredictionHeading(match.projection)}
      ${renderProjection(match)}
    </section>
  `;
}

function getHistoricalProjectionRating(ratings, teamName) {
  if (!ratings.has(teamName)) {
    ratings.set(teamName, 1500);
  }

  return ratings.get(teamName);
}

function getHistoricalFixtureOutcome(fixture) {
  if (fixture.status !== "FT" || !fixture.score) {
    return null;
  }

  const winner = getHistoricalWinner(fixture);

  if (!winner) {
    return 0.5;
  }

  return winner === fixture.homeSlot ? 1 : 0;
}

function applyHistoricalProjectionFixture(ratings, fixture) {
  const outcome = getHistoricalFixtureOutcome(fixture);

  if (outcome === null || !fixture.homeSlot || !fixture.awaySlot) {
    return;
  }

  const homeRating = getHistoricalProjectionRating(ratings, fixture.homeSlot);
  const awayRating = getHistoricalProjectionRating(ratings, fixture.awaySlot);
  const expectedHome = 1 / (1 + 10 ** ((awayRating - homeRating) / 400));
  const margin = Math.abs(Number(fixture.score.home) - Number(fixture.score.away));
  const marginMultiplier = Math.min(2, 1 + Math.max(0, margin - 1) * 0.25);
  const update = 28 * marginMultiplier * (outcome - expectedHome);

  ratings.set(fixture.homeSlot, homeRating + update);
  ratings.set(fixture.awaySlot, awayRating - update);
}

function normalizeProjectionParts(home, draw, away) {
  const rounded = {
    home: Math.max(0, Math.round(home)),
    draw: Math.max(0, Math.round(draw)),
    away: Math.max(0, Math.round(away))
  };
  const total = rounded.home + rounded.draw + rounded.away;

  if (total !== 100) {
    const largestKey = Object.entries(rounded).sort((a, b) => b[1] - a[1])[0][0];
    rounded[largestKey] += 100 - total;
  }

  return rounded;
}

function getHistoricalProjection(match) {
  if (match.status === "CANCELLED") {
    return null;
  }

  if (historicalProjectionCache.has(match.id)) {
    return historicalProjectionCache.get(match.id);
  }

  const ratings = new Map();
  const previousFixtures = historicalFixtures
    .filter((fixture) => isHistoricalMatchBefore(fixture, match))
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)));

  for (const fixture of previousFixtures) {
    applyHistoricalProjectionFixture(ratings, fixture);
  }

  const homeRating = getHistoricalProjectionRating(ratings, match.homeTeam.name);
  const awayRating = getHistoricalProjectionRating(ratings, match.awayTeam.name);
  const ratingDiff = homeRating - awayRating;
  const drawBase = match.group ? 28 : 24;
  const draw = Math.max(18, drawBase - Math.min(8, Math.abs(ratingDiff) / 60));
  const decisiveShare = 100 - draw;
  const homeShare = 1 / (1 + Math.exp(-ratingDiff / 190));
  const projection = {
    ...normalizeProjectionParts(decisiveShare * homeShare, draw, decisiveShare * (1 - homeShare)),
    basis: "Prior World Cup results and earlier matches in this tournament",
    method: "historical-world-cup-form-baseline",
    priorMatches: previousFixtures.length
  };

  historicalProjectionCache.set(match.id, projection);
  return projection;
}

function renderHistoricalProjection(match) {
  const projection = getHistoricalProjection(match);

  if (!projection) {
    return `<p class="past-empty">${escapeHtml(localizeText("No historical prediction is generated for cancelled fixtures."))}</p>`;
  }

  return `
    ${renderPredictionBar(match.homeTeam.name, projection.home)}
    ${renderPredictionBar("Tie", projection.draw)}
    ${renderPredictionBar(match.awayTeam.name, projection.away)}
  `;
}

function renderScoreSummary(match, options = {}) {
  const score = getCatchUpScore(match);

  if (!score) {
    const text = options.live
      ? "The match is marked live, but no verified score is loaded yet."
      : "Final score is not loaded for this fixture yet.";
    return `<p class="past-empty result-score-summary">${escapeHtml(localizeText(text))}</p>`;
  }

  const winnerSide = getResultWinnerSide(match, score);

  if (!winnerSide) {
    const scoreText = `${score.home}-${score.away}`;
    const text = `${match.homeTeam.name} and ${match.awayTeam.name} ${options.live ? "are level" : "drew"} ${scoreText}.`;
    return `<p class="past-empty result-score-summary">${escapeHtml(localizeText(text))}</p>`;
  }

  const winner = winnerSide === "home" ? match.homeTeam : match.awayTeam;
  const loser = winnerSide === "home" ? match.awayTeam : match.homeTeam;
  const scoreText = getResultScorePairForSide(score, winnerSide);
  const penaltyText = getResultScorePairForSide(match.scoreDetails?.penalties, winnerSide);
  const isTiedKnockoutWinner =
    !options.live &&
    !penaltyText &&
    isKnockoutResultMatch(match) &&
    Number(score.home) === Number(score.away);

  const text =
    penaltyText && !options.live
      ? `${winner.name} beat ${loser.name} on penalties after a ${score.home}-${score.away} draw.`
      : isTiedKnockoutWinner
        ? `${winner.name} advanced after a ${score.home}-${score.away} draw against ${loser.name}.`
        : `${winner.name} ${options.live ? "lead" : "beat"} ${loser.name} ${scoreText}.`;
  return `<p class="past-empty result-score-summary">${escapeHtml(localizeText(text))}</p>`;
}

function renderLiveScoreSummary(match) {
  return getCatchUpScore(match) ? "" : renderScoreSummary(match, { live: true });
}

function getResultHighlights(match) {
  const storyBullets = Array.isArray(match.resultStoryBullets)
    ? match.resultStoryBullets.filter((highlight) => typeof highlight === "string" && highlight.trim())
    : [];
  const authoredHighlights = Array.isArray(match.resultHighlights)
    ? match.resultHighlights.filter((highlight) => typeof highlight === "string" && highlight.trim())
    : [];

  if (storyBullets.length) {
    return storyBullets;
  }

  return authoredHighlights;
}

function stripResultHighlightMarker(text) {
  return String(text || "").trim().replace(/^(?:⚽|🔥|🛡️|🧤|🌟|📊|🚫|🤝|🎯|🏁|🏆|🥉)\s*/u, "");
}

function isResultScorelineHighlight(highlight) {
  const text = String(highlight || "").trim();
  return (
    text.startsWith("⚽") ||
    /^.+ (?:beat|edged) .+ \d+-\d+\.$/.test(text) ||
    /^.+ made a statement with a \d+-\d+ win\.$/.test(text) ||
    /^.+ found the decisive goal in a \d+-\d+ win\.$/.test(text) ||
    /^.+ and .+ shared a 0-0 draw\.$/.test(text) ||
    /^.+ and .+ finished level at \d+-\d+\.$/.test(text)
  );
}

function isResultImpactHighlight(highlight) {
  const text = String(highlight || "").trim();
  return (
    text.startsWith("📊") ||
    /\b(?:took three points|reached the .+ and .+ exited|advanced from|secured third place|won the World Cup)\b/i.test(text)
  );
}

function getResultStoryHighlights(match) {
  const seen = new Set();
  return getResultHighlights(match)
    .filter((highlight) => typeof highlight === "string" && highlight.trim())
    .filter((highlight) => !isResultScorelineHighlight(highlight) && !isResultImpactHighlight(highlight))
    .filter((highlight) => {
      const key = normalizeTextKey(stripResultHighlightMarker(highlight));
      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

function getResultDisplayHighlights(match) {
  return getResultStoryHighlights(match)
    .map((highlight) => stripResultHighlightMarker(localizeDisplayText(highlight)))
    .filter(Boolean);
}

function getCatchUpStandout(match) {
  return Array.isArray(match.catchUp)
    ? match.catchUp.find((item) => typeof item?.standouts === "string" && item.standouts.trim())?.standouts.trim() || ""
    : "";
}

function getGoalWord(count) {
  return count === 1 ? "goal" : "goals";
}

function normalizeGeneratedResultSentence(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return "";
  }

  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function addGeneratedResultStoryBullet(bullets, text) {
  const sentence = normalizeGeneratedResultSentence(text);
  if (!sentence || sentence.length > 160) {
    return;
  }

  const key = normalizeTextKey(sentence);
  if (!key || bullets.some((bullet) => normalizeTextKey(bullet) === key)) {
    return;
  }

  bullets.push(sentence);
}

function getGeneratedResultOtherSide(side) {
  return side === "home" ? "away" : "home";
}

function generatedResultGoalScorerLabel(goal, { sentenceStart = true } = {}) {
  if (goal.ownGoal) {
    return `${sentenceStart ? "A" : "a"} ${formatGoalMinute(goal)} own goal`;
  }

  return goal.name;
}

function generatedResultGoalPossessiveLabel(goal) {
  if (goal.ownGoal) {
    return `A ${formatGoalMinute(goal)} own goal`;
  }

  const minute = formatGoalMinute(goal);
  return minute ? `${goal.name}'s ${minute}` : `${goal.name}'s`;
}

function addGeneratedResultLevelerStory(bullets, goal, teamName) {
  if (goal.ownGoal) {
    addGeneratedResultStoryBullet(bullets, `${generatedResultGoalPossessiveLabel(goal)} brought ${teamName} level`);
    return;
  }

  addGeneratedResultStoryBullet(
    bullets,
    `${generatedResultGoalPossessiveLabel(goal)} equalizer brought ${teamName} level`
  );
}

function addGeneratedResultWinnerStory(bullets, goal, teamName) {
  if (goal.ownGoal) {
    addGeneratedResultStoryBullet(bullets, `${generatedResultGoalPossessiveLabel(goal)} settled a tight match for ${teamName}`);
    return;
  }

  addGeneratedResultStoryBullet(
    bullets,
    `${generatedResultGoalPossessiveLabel(goal)} winner settled a tight match for ${teamName}`
  );
}

function addGeneratedResultReplyStory(bullets, goal, teamName) {
  if (!goal) {
    return;
  }

  if (goal.ownGoal) {
    addGeneratedResultStoryBullet(bullets, `${generatedResultGoalPossessiveLabel(goal)} gave ${teamName} a reply`);
    return;
  }

  const finishType = goal.penalty ? "penalty" : "goal";
  addGeneratedResultStoryBullet(
    bullets,
    `${generatedResultGoalPossessiveLabel(goal)} ${finishType} gave ${teamName} a reply`
  );
}

function getGeneratedResultLastGoalForSide(goals, side) {
  return goals.filter((goal) => goal.side === side).at(-1) || null;
}

function getGeneratedResultFirstEqualizerForSide(goals, side) {
  const score = { home: 0, away: 0 };

  for (const goal of goals) {
    score[goal.side] += 1;
    if (goal.side === side && score.home === score.away) {
      return goal;
    }
  }

  return null;
}

function generatedResultGoalHappensBefore(goals, firstGoal, secondGoal) {
  const firstIndex = goals.indexOf(firstGoal);
  const secondIndex = goals.indexOf(secondGoal);
  return firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex;
}

function generatedResultScoreWord(count) {
  if (count === 2) {
    return "twice";
  }
  if (count === 3) {
    return "three times";
  }
  return `${count} times`;
}

function getGeneratedResultScorerCounts(goals) {
  return [...goals.reduce((counts, goal) => {
    if (!goal.ownGoal && goal.name) {
      counts.set(goal.name, (counts.get(goal.name) || 0) + 1);
    }
    return counts;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1])[0] || null;
}

function getGeneratedResultAssistCounts(goals, side) {
  return [...goals.reduce((counts, goal) => {
    if (goal.side === side && !goal.ownGoal && goal.assistName && goal.assistName !== goal.name) {
      const row = counts.get(goal.assistName) || [];
      row.push(goal);
      counts.set(goal.assistName, row);
    }
    return counts;
  }, new Map()).entries()].sort((a, b) => b[1].length - a[1].length)[0] || null;
}

function formatGeneratedResultNameList(names) {
  const values = [...new Set(names.filter(Boolean))];
  if (values.length <= 1) {
    return values[0] || "";
  }
  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function getGeneratedResultAssistStory(goals, side, teamName) {
  const topAssist = getGeneratedResultAssistCounts(goals, side);
  if (!topAssist || topAssist[1].length < 2) {
    return "";
  }

  const [assistName, assistedGoals] = topAssist;
  const scorerNames = [...new Set(assistedGoals.map((goal) => goal.name).filter(Boolean))];
  const scorerText =
    scorerNames.length === 1 && assistedGoals.length > 1
      ? `${scorerNames[0]} twice`
      : formatGeneratedResultNameList(scorerNames);

  return `${assistName} assisted ${scorerText} as ${teamName} pulled away`;
}

function getGeneratedScoreOnlyWinStoryBullets(match, score, winnerSide) {
  const bullets = [];
  const winner = winnerSide === "home" ? match.homeTeam : match.awayTeam;
  const loser = winnerSide === "home" ? match.awayTeam : match.homeTeam;
  const winnerScore = winnerSide === "home" ? score.home : score.away;
  const loserScore = winnerSide === "home" ? score.away : score.home;
  const margin = winnerScore - loserScore;

  if (winnerScore === 1 && loserScore === 0) {
    addGeneratedResultStoryBullet(bullets, `${winner.name} found the only goal, leaving ${loser.name} chasing a 1-0 match`);
  } else if (margin >= 3) {
    addGeneratedResultStoryBullet(bullets, `${winner.name}'s attack kept finding space and turned the finish into a rout`);
  } else {
    addGeneratedResultStoryBullet(bullets, `${winner.name} made the ${winnerScore}-${loserScore} scoreline stand in a tight match`);
  }

  if (loserScore === 0) {
    addGeneratedResultStoryBullet(bullets, `${winner.name} kept ${loser.name} out and closed the match with a clean sheet`);
  } else {
    addGeneratedResultStoryBullet(bullets, `${loser.name} scored but never found the goal that would reopen the finish`);
  }

  return bullets;
}

function getGeneratedWinStoryBullets(match, score, winnerSide) {
  const goals = getFixtureGoals(match);
  if (!goals.length) {
    return getGeneratedScoreOnlyWinStoryBullets(match, score, winnerSide);
  }

  const bullets = [];
  const loserSide = getGeneratedResultOtherSide(winnerSide);
  const winner = winnerSide === "home" ? match.homeTeam : match.awayTeam;
  const loser = winnerSide === "home" ? match.awayTeam : match.homeTeam;
  const winnerScore = winnerSide === "home" ? score.home : score.away;
  const loserScore = winnerSide === "home" ? score.away : score.home;
  const margin = winnerScore - loserScore;
  const firstGoal = goals[0];
  const lastWinnerGoal = getGeneratedResultLastGoalForSide(goals, winnerSide);
  const lastLoserGoal = getGeneratedResultLastGoalForSide(goals, loserSide);
  const winnerEqualizer = firstGoal?.side === loserSide ? getGeneratedResultFirstEqualizerForSide(goals, winnerSide) : null;
  const loserEqualizer = firstGoal?.side === winnerSide ? getGeneratedResultFirstEqualizerForSide(goals, loserSide) : null;
  const topScorer = getGeneratedResultScorerCounts(goals);

  if (firstGoal?.side === loserSide) {
    addGeneratedResultStoryBullet(
      bullets,
      `${generatedResultGoalScorerLabel(firstGoal)} struck first for ${loser.name}, forcing ${winner.name} to chase the match`
    );
  } else if (firstGoal) {
    const firstMinute = Number(firstGoal.minute);
    if (Number.isFinite(firstMinute) && firstMinute <= 20) {
      addGeneratedResultStoryBullet(
        bullets,
        `${generatedResultGoalScorerLabel(firstGoal)} put ${winner.name} ahead early, making ${loser.name} chase the match`
      );
    } else {
      addGeneratedResultStoryBullet(
        bullets,
        `${generatedResultGoalScorerLabel(firstGoal)} opened the scoring for ${winner.name}`
      );
    }
  }

  const assistStory = getGeneratedResultAssistStory(goals, winnerSide, winner.name);

  if (winnerEqualizer && lastWinnerGoal && winnerEqualizer !== lastWinnerGoal) {
    addGeneratedResultStoryBullet(
      bullets,
      `${generatedResultGoalScorerLabel(winnerEqualizer)} brought ${winner.name} level before ${generatedResultGoalScorerLabel(lastWinnerGoal, { sentenceStart: false })} completed the turnaround`
    );
  } else if (
    loserEqualizer &&
    lastWinnerGoal &&
    generatedResultGoalHappensBefore(goals, loserEqualizer, lastWinnerGoal)
  ) {
    addGeneratedResultLevelerStory(bullets, loserEqualizer, loser.name);
    if (margin === 1) {
      addGeneratedResultWinnerStory(bullets, lastWinnerGoal, winner.name);
    } else if (assistStory) {
      addGeneratedResultStoryBullet(bullets, assistStory);
    } else {
      addGeneratedResultStoryBullet(
        bullets,
        `${generatedResultGoalScorerLabel(lastWinnerGoal)} finished the scoring as ${winner.name} pulled away`
      );
    }
  } else if (lastWinnerGoal && margin === 1) {
    addGeneratedResultWinnerStory(bullets, lastWinnerGoal, winner.name);
  } else if (assistStory) {
    addGeneratedResultStoryBullet(bullets, assistStory);
  } else if (lastWinnerGoal && firstGoal && lastWinnerGoal !== firstGoal) {
    addGeneratedResultStoryBullet(
      bullets,
      `${generatedResultGoalScorerLabel(lastWinnerGoal)} finished the scoring as ${winner.name} pulled away`
    );
  } else if (topScorer?.[1] >= 2) {
    addGeneratedResultStoryBullet(
      bullets,
      `${topScorer[0]}'s ${generatedResultScoreWord(topScorer[1])} gave ${winner.name} the scoring separation`
    );
  }

  if (loserScore === 0) {
    addGeneratedResultStoryBullet(bullets, `${winner.name} kept ${loser.name} out and closed the match with a clean sheet`);
  } else if (margin >= 3) {
    addGeneratedResultStoryBullet(bullets, `${winner.name}'s attack kept finding space and turned the finish into a rout`);
  } else if (firstGoal?.side === loserSide) {
    addGeneratedResultStoryBullet(
      bullets,
      `${loser.name}'s opener made ${winner.name} sweat, but the later chances finally turned`
    );
  } else if (lastLoserGoal && lastLoserGoal !== loserEqualizer) {
    addGeneratedResultReplyStory(bullets, lastLoserGoal, loser.name);
  } else {
    addGeneratedResultStoryBullet(bullets, `${loser.name} scored but never found the goal that would reopen the finish`);
  }

  if (bullets.length < 2) {
    addGeneratedResultStoryBullet(
      bullets,
      `${winner.name} made the ${winnerScore}-${loserScore} scoreline stand in a tight match`
    );
  }

  return bullets.slice(0, 2);
}

function formatStandoutHighlight(standout) {
  if (!standout) {
    return "";
  }

  const cleanStandout = standout.replace(/^🌟\s*/, "").replace(/^[⚽🔥🛡️🧤]\s*/, "");
  const localizedStandout = localizeDisplayText(cleanStandout);
  return `🌟 ${localizedStandout}`;
}

function getResultFocusName(match, side) {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const player = (match.keyPlayers?.[side] || []).find((item) => getPlayerName(item));
  const name = player ? getPlayerDisplayName(player) : "";
  return name || team?.name || "";
}

function getGeneratedDrawMoment(match, score) {
  const homeFocus = getResultFocusName(match, "home");
  const awayFocus = getResultFocusName(match, "away");
  const homeName = match.homeTeam?.name || homeFocus;
  const awayName = match.awayTeam?.name || awayFocus;
  const candidates =
    score.home === 0 && score.away === 0
      ? [
          `🌟 ${homeFocus} and ${awayFocus} carried the duel without a breakthrough.`,
          `🌟 ${homeName} and ${awayName} cancelled each other out.`
        ]
      : [
          `🌟 ${homeFocus} and ${awayFocus} traded momentum without a winner.`,
          `🌟 ${homeName} and ${awayName} traded momentum without a winner.`
        ];

  return candidates.find((text) => text.length <= 95) || "🌟 No breakthrough came from a tight draw.";
}

function getGeneratedDrawHighlights(match, score, context, standout) {
  const scoreText = `${score.home}-${score.away}`;
  const impactNote = isKnockoutResultMatch(match)
    ? `📊 ${context} still needs a knockout winner loaded.`
    : score.home === 0 && score.away === 0
      ? `📊 Both sides took one point from ${context}.`
      : `📊 Both teams took one point from ${context}.`;

  if (score.home === 0 && score.away === 0) {
    return [
      `⚽ ${match.homeTeam.name} and ${match.awayTeam.name} shared a 0-0 draw.`,
      formatStandoutHighlight(standout) || getGeneratedDrawMoment(match, score),
      impactNote
    ];
  }

  return [
    `⚽ ${match.homeTeam.name} and ${match.awayTeam.name} finished level at ${scoreText}.`,
    formatStandoutHighlight(standout) || getGeneratedDrawMoment(match, score),
    impactNote
  ];
}

function getGeneratedGoalMoment(match, score, winnerSide) {
  const goals = getFixtureGoals(match);

  if (!goals.length) {
    return "";
  }

  const winner = winnerSide === "home" ? match.homeTeam : winnerSide === "away" ? match.awayTeam : null;
  const lastGoal = goals[goals.length - 1];
  const topScorerEntry = [...goals.reduce((counts, goal) => {
    if (!goal.ownGoal && goal.name) {
      counts.set(goal.name, (counts.get(goal.name) || 0) + 1);
    }
    return counts;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1])[0];
  const winnerGoals = winner ? goals.filter((goal) => goal.side === winnerSide) : [];
  const lastWinnerGoal = winnerGoals[winnerGoals.length - 1];
  const lastWinnerMinute = lastWinnerGoal ? formatGoalMinute(lastWinnerGoal) : "";
  const firstGoal = goals[0];
  const candidates = [];

  if (topScorerEntry?.[1] >= 3 && winner) {
    candidates.push(`🌟 ${topScorerEntry[0]} completed a hat trick as ${winner.name} ran away with it.`);
  }

  if (topScorerEntry?.[1] === 2 && winner) {
    candidates.push(`🌟 ${topScorerEntry[0]} scored twice as ${winner.name} pulled clear.`);
  }

  if (winner && Math.abs(score.home - score.away) === 1 && lastWinnerGoal) {
    candidates.push(
      lastWinnerGoal.ownGoal
        ? `🌟 A ${lastWinnerMinute} own goal settled it for ${winner.name}.`
        : `🌟 ${lastWinnerGoal.name}'s ${lastWinnerMinute} winner settled it for ${winner.name}.`
    );
  }

  if (winner && firstGoal?.side && firstGoal.side !== winnerSide) {
    candidates.push(`🌟 ${firstGoal.name} put ${firstGoal.team.name} in front before ${winner.name} chased the match back.`);
  }

  if (winner && goals.length >= 2 && lastGoal?.name) {
    candidates.push(`🌟 ${firstGoal.name} opened it before ${lastGoal.name} finished the scoring.`);
  }

  return candidates.find((text) => text.length <= 140) || "";
}

function getKnockoutResultImpactHighlight(match, winner, loser, context, nextStage) {
  if (match?.stage === "final") {
    return `📊 ${winner.name} won the World Cup.`;
  }

  if (match?.stage === "bronze-final") {
    return `📊 ${winner.name} secured third place.`;
  }

  if (!nextStage) {
    return `📊 ${winner.name} advanced from the ${context}.`;
  }

  const detailed = `📊 ${winner.name} reached the ${nextStage} and ${loser.name} exited.`;
  return detailed.length <= 95 ? detailed : `📊 ${winner.name} advanced from the ${context}.`;
}

function getKnockoutResultCatchUpHeadline(match, winner, loser, margin, penaltyText, nextStage) {
  if (match?.stage === "final") {
    return `${winner.name} win the World Cup`;
  }

  if (match?.stage === "bronze-final") {
    return `${winner.name} secure third place`;
  }

  if (penaltyText) {
    return `${winner.name} survive ${loser.name} on penalties`;
  }

  if (nextStage) {
    return margin === 1
      ? `${winner.name} edge ${loser.name} to reach the ${nextStage}`
      : `${winner.name} beat ${loser.name} to reach the ${nextStage}`;
  }

  return "";
}

function getKnockoutResultCatchUpBody(match, winner, loser, score, scoreText, penaltyText, nextStage, context) {
  if (match?.stage === "final") {
    return `${winner.name}'s ${scoreText} win settled the Final against ${loser.name}.`;
  }

  if (match?.stage === "bronze-final") {
    return `${winner.name}'s ${scoreText} win secured third place against ${loser.name}.`;
  }

  if (penaltyText && nextStage) {
    return `${winner.name} advanced to the ${nextStage} on penalties after a ${score.home}-${score.away} draw, ending ${loser.name}'s run.`;
  }

  if (nextStage) {
    return `${winner.name}'s ${scoreText} win moved them into the ${nextStage}.`;
  }

  return `${winner.name}'s ${scoreText} win moved them through from the ${context} and ended ${loser.name}'s run.`;
}

function getGeneratedWinHighlights(match, score, context, standout) {
  const winnerSide = getResultWinnerSide(match, score);
  const winner = winnerSide === "home" ? match.homeTeam : match.awayTeam;
  const loser = winnerSide === "home" ? match.awayTeam : match.homeTeam;
  const winnerScore = winnerSide === "home" ? score.home : score.away;
  const loserScore = winnerSide === "home" ? score.away : score.home;
  const margin = winnerScore - loserScore;
  const scoreText = `${winnerScore}-${loserScore}`;
  const penaltyText = getResultScorePairForSide(match.scoreDetails?.penalties, winnerSide);
  const isKnockout = isKnockoutResultMatch(match);
  const nextStage = getResultNextKnockoutStageLabel(match);
  const scoringNote = margin >= 3
    ? `⚽ ${winner.name} made a statement with a ${scoreText} win.`
    : penaltyText
      ? `⚽ ${winner.name} beat ${loser.name} on penalties after a ${score.home}-${score.away} draw.`
      : isKnockout && margin === 1
        ? `⚽ ${winner.name} edged ${loser.name} ${scoreText}.`
        : winnerScore === 1
          ? `⚽ ${winner.name} found the decisive goal in a ${scoreText} win.`
          : `⚽ ${winner.name} beat ${loser.name} ${scoreText}.`;
  const controlNote =
    formatStandoutHighlight(standout) ||
    getGeneratedGoalMoment(match, score, winnerSide) ||
    (penaltyText
      ? `🌟 The shootout decided ${context}.`
      : isKnockout && loserScore === 0
        ? `🌟 ${winner.name}'s clean sheet ended ${loser.name}'s run.`
        : loserScore === 0
          ? `🌟 The clean sheet gave ${loser.name} no way back.`
          : margin >= 3
            ? `🌟 ${winner.name}'s attack broke the match open.`
            : margin === 1
              ? `🌟 ${winner.name} came through a tight one-goal match.`
              : `🌟 ${winner.name} created enough separation to control the finish.`);
  const groupImpact = isKnockout
    ? getKnockoutResultImpactHighlight(match, winner, loser, context, nextStage)
    : match.groupId && margin > 0
      ? `📊 ${winner.name} took three points and ${formatGoalDifference(margin)} GD in ${context}.`
      : `📊 ${winner.name} took three points from ${context}.`;
  const storyHighlights = getGeneratedWinStoryBullets(match, score, winnerSide);
  const controlHighlights = storyHighlights.length
    ? storyHighlights
    : [
        formatStandoutHighlight(standout) ||
          getGeneratedGoalMoment(match, score, winnerSide) ||
          controlNote
      ].filter(Boolean);

  return [
    scoringNote,
    ...controlHighlights,
    groupImpact
  ];
}

function getGeneratedResultHighlights(match) {
  const score = getCatchUpScore(match);

  if (!score) {
    return [];
  }

  const context = getCatchUpContext(match);
  const standout = getCatchUpStandout(match);

  if (!getResultWinnerSide(match, score)) {
    return getGeneratedDrawHighlights(match, score, context, standout);
  }

  return getGeneratedWinHighlights(match, score, context, standout);
}

function getGeneratedCatchUpWinHighlights(match, score, context, standout) {
  const winnerSide = getResultWinnerSide(match, score);
  const winner = winnerSide === "home" ? match.homeTeam : match.awayTeam;
  const loser = winnerSide === "home" ? match.awayTeam : match.homeTeam;
  const winnerScore = winnerSide === "home" ? score.home : score.away;
  const loserScore = winnerSide === "home" ? score.away : score.home;
  const margin = winnerScore - loserScore;
  const scoreText = `${winnerScore}-${loserScore}`;
  const penaltyText = getResultScorePairForSide(match.scoreDetails?.penalties, winnerSide);
  const isKnockout = isKnockoutResultMatch(match);
  const nextStage = getResultNextKnockoutStageLabel(match);
  const scoringNote = margin >= 3
    ? `⚽ ${winner.name} made a statement with a ${scoreText} win.`
    : penaltyText
      ? `⚽ ${winner.name} beat ${loser.name} on penalties after a ${score.home}-${score.away} draw.`
      : isKnockout && margin === 1
        ? `⚽ ${winner.name} edged ${loser.name} ${scoreText}.`
        : winnerScore === 1
          ? `⚽ ${winner.name} found the decisive goal in a ${scoreText} win.`
          : `⚽ ${winner.name} beat ${loser.name} ${scoreText}.`;
  const controlNote =
    formatStandoutHighlight(standout) ||
    getGeneratedGoalMoment(match, score, winnerSide) ||
    (penaltyText
      ? `🌟 The shootout decided ${context}.`
      : isKnockout && loserScore === 0
        ? `🌟 ${winner.name}'s clean sheet ended ${loser.name}'s run.`
        : loserScore === 0
          ? `🌟 The clean sheet gave ${loser.name} no way back.`
          : margin >= 3
            ? `🌟 ${winner.name}'s attack broke the match open.`
            : margin === 1
              ? `🌟 ${winner.name} came through a tight one-goal match.`
              : `🌟 ${winner.name} created enough separation to control the finish.`);
  const groupImpact = isKnockout
    ? getKnockoutResultImpactHighlight(match, winner, loser, context, nextStage)
    : match.groupId && margin > 0
      ? `📊 ${winner.name} took three points and ${formatGoalDifference(margin)} GD in ${context}.`
      : `📊 ${winner.name} took three points from ${context}.`;

  return [
    scoringNote,
    controlNote,
    groupImpact
  ];
}

function getGeneratedCatchUpResultHighlights(match) {
  const score = getCatchUpScore(match);

  if (!score) {
    return [];
  }

  const context = getCatchUpContext(match);
  const standout = getCatchUpStandout(match);

  if (!getResultWinnerSide(match, score)) {
    return getGeneratedDrawHighlights(match, score, context, standout);
  }

  return getGeneratedCatchUpWinHighlights(match, score, context, standout);
}

function getFixtureGoals(match) {
  return [
    ...(match.goalsHome || []).map((goal) => ({
      ...goal,
      side: "home",
      scoringTeam: match.homeTeam,
      ownGoalTeam: match.awayTeam,
      team: goal?.ownGoal ? match.awayTeam : match.homeTeam
    })),
    ...(match.goalsAway || []).map((goal) => ({
      ...goal,
      side: "away",
      scoringTeam: match.awayTeam,
      ownGoalTeam: match.homeTeam,
      team: goal?.ownGoal ? match.homeTeam : match.awayTeam
    }))
  ]
    .filter((goal) => typeof goal?.name === "string" && goal.name.trim())
    .sort((a, b) => {
      const aMinute = Number.isFinite(Number(a.minute)) ? Number(a.minute) : 0;
      const bMinute = Number.isFinite(Number(b.minute)) ? Number(b.minute) : 0;
      const aOffset = Number.isFinite(Number(a.offset)) ? Number(a.offset) : 0;
      const bOffset = Number.isFinite(Number(b.offset)) ? Number(b.offset) : 0;
      return aMinute - bMinute || aOffset - bOffset;
    });
}

function findMatchPlayerByName(match, name) {
  const nameKey = normalizeTextKey(name);
  return getMatchKeyPlayers(match).find((player) => normalizeTextKey(getPlayerName(player)) === nameKey) || name;
}

function createGoalScorerCardPlayer(goal) {
  const name = String(goal?.name || "").trim();
  const team = goal?.team || null;

  if (!name) {
    return "";
  }

  return {
    name,
    team,
    teamId: team?.id || "",
    role: goal?.ownGoal ? "Own goal record" : "Goal scorer",
    note: goal?.ownGoal
      ? `${name} is listed in this match's own-goal record.`
      : `${name} scored for ${team?.name || "their team"} in this match.`,
    cardContext: "goal-scorer"
  };
}

function hasGoalScorerProfileDetails(profile) {
  return Boolean(
    typeof profile?.position === "string" &&
      profile.position.trim() &&
      typeof profile?.club === "string" &&
      profile.club.trim()
  );
}

function getGoalScorerCardPlayer(match, goal) {
  const matchedPlayer = findMatchPlayerByName(match, goal.name);
  const matchedProfile = getPlayerProfile(matchedPlayer);

  if (typeof matchedPlayer !== "string" || hasGoalScorerProfileDetails(matchedProfile)) {
    return matchedPlayer;
  }

  return createGoalScorerCardPlayer(goal);
}

function getGoalScorerTeam(goal, player) {
  const profile = getPlayerProfile(player);
  return (profile?.teamId ? teamsById.get(profile.teamId) : null) || goal.team || null;
}

function renderGoalScorerFlag(goal, player) {
  const team = getGoalScorerTeam(goal, player);
  const flag = team ? renderFlag(team) : "";
  return flag ? `<span class="goal-scorer-flag">${flag}</span>` : "";
}

function renderGoalScorerSegment(match, goal) {
  const minute = formatGoalMinute(goal);
  const note = formatGoalNote(goal);
  const player = getGoalScorerCardPlayer(match, goal);
  const label = getPlayerDisplayName(player);

  return `
    <span class="goal-scorer-segment">
      ${renderGoalScorerFlag(goal, player)}
      ${minute ? `<span class="goal-minute">${escapeHtml(minute)}</span>` : ""}
      ${renderPlayerMention(label, player)}
      ${note ? `<em>${escapeHtml(note)}</em>` : ""}
    </span>
  `;
}

function renderScoringDetailsHighlight(match) {
  const goals = getFixtureGoals(match);
  if (!goals.length) {
    return "";
  }

  return `
    <li class="scorer-highlight" aria-label="${escapeHtml(localizeText("Goals"))}">
      <span class="goal-scorer-list">
        ${goals.map((goal) => renderGoalScorerSegment(match, goal)).join('<span class="goal-separator">•</span>')}
      </span>
    </li>
  `;
}

function renderScoringDetailsList(match, options = {}) {
  const scoringHighlight = renderScoringDetailsHighlight(match);
  if (scoringHighlight) {
    return `<ul class="result-highlights">${scoringHighlight}</ul>`;
  }

  if (!options.showMissingWhenGoalsScored) {
    return "";
  }

  const score = getCatchUpScore(match);
  const totalGoals = Number(score?.home) + Number(score?.away);
  return Number.isFinite(totalGoals) && totalGoals > 0
    ? `<p class="data-note">${escapeHtml(localizeText("No scorer data loaded."))}</p>`
    : "";
}

function getYouTubeVideoId(url) {
  if (typeof url !== "string" || !url.trim()) {
    return "";
  }

  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = parsedUrl.searchParams.get("v") || "";
      return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : "";
    }

    if (host === "youtu.be") {
      const videoId = parsedUrl.pathname.split("/").filter(Boolean)[0] || "";
      return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : "";
    }
  } catch {
    return "";
  }

  return "";
}

function getOfficialHighlightVideo(match) {
  const video = match?.highlightVideo;
  if (match?.status !== "FT" || !video || typeof video !== "object") {
    return null;
  }

  const channelName = OFFICIAL_HIGHLIGHT_VIDEO_CHANNELS.get(video.channelId);
  if (video.platform !== "youtube" || !channelName || !getYouTubeVideoId(video.url)) {
    return null;
  }

  return {
    ...video,
    sourceName: channelName
  };
}

function renderResultHeading(match) {
  const video = getOfficialHighlightVideo(match);
  const tooltip = localizeText("Play highlights on YouTube");

  return `
    <h3 class="info-heading result-heading">
      <span>${escapeHtml(localizeText("Result"))}</span>
      ${
        video
          ? `<a class="info-tooltip-button result-video-link" href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(tooltip)}" data-tooltip="${escapeHtml(tooltip)}"><span class="result-video-play-icon" aria-hidden="true"></span><span class="visually-hidden">${escapeHtml(tooltip)}</span></a>`
          : ""
      }
    </h3>
  `;
}

function renderResultNotes(match) {
  const scoringHighlight = renderScoringDetailsHighlight(match);
  const canonicalHighlights = getResultStoryHighlights(match);
  const highlights = getResultDisplayHighlights(match);

  if (!scoringHighlight && !highlights.length) {
    return `<p class="data-note">${escapeHtml(localizeText("Final score reflected in the current standings after source checks."))}</p>`;
  }

  const mentionPlayers = getUniqueMentionPlayers([
    ...getMatchMentionPlayers(match, match.keyInformation || {}),
    ...canonicalHighlights.flatMap((highlight) => getProfileMentionPlayersFromText(stripResultHighlightMarker(highlight)))
  ]);
  const scoringMarkup = scoringHighlight
    ? `<ul class="result-highlights result-scorer-highlights">${scoringHighlight}</ul>`
    : "";
  const storyMarkup = highlights.length
    ? `
      <ul class="result-highlights result-story-highlights">
        ${highlights
          .map((highlight) => `<li>${renderPlayerLinkedText(highlight, mentionPlayers)}</li>`)
          .join("")}
      </ul>
    `
    : "";

  return `
    <div class="result-notes">
      ${scoringMarkup}
      ${storyMarkup}
    </div>
  `;
}

function isLineupVisualPrototypeEnabled() {
  if (["localhost", "127.0.0.1", ""].includes(window.location.hostname)) {
    return true;
  }

  return isLineupVisualPrototypePreviewRequested;
}

const MOCK_LINEUP_LAYOUTS = {
  "4-2-3-1": [
    ["GK", 50, 91],
    ["RB", 15, 75],
    ["CB", 38, 75],
    ["CB", 62, 75],
    ["LB", 85, 75],
    ["CM", 34, 59],
    ["CM", 66, 59],
    ["RW", 18, 40],
    ["AM", 50, 40],
    ["LW", 82, 40],
    ["ST", 50, 20]
  ],
  "4-3-3": [
    ["GK", 50, 91],
    ["RB", 15, 75],
    ["CB", 38, 75],
    ["CB", 62, 75],
    ["LB", 85, 75],
    ["CM", 25, 56],
    ["CM", 50, 55],
    ["CM", 75, 56],
    ["RW", 18, 31],
    ["ST", 50, 21],
    ["LW", 82, 31]
  ],
  "4-4-2": [
    ["GK", 50, 91],
    ["RB", 15, 75],
    ["CB", 38, 75],
    ["CB", 62, 75],
    ["LB", 85, 75],
    ["RM", 18, 52],
    ["CM", 38, 55],
    ["CM", 62, 55],
    ["LM", 82, 52],
    ["ST", 41, 24],
    ["ST", 59, 24]
  ]
};

const MOCK_LINEUP_FORMATION_NOTES = {
  "4-2-3-1": {
    good: {
      en: "Keeps two midfielders behind the ball while four attackers fill the spaces around the striker, so the team can create without feeling wide open.",
      zh: "两名中场留在球后保护，四名攻击手围绕中锋占住空当，球队能创造机会，同时不至于门户大开。"
    },
    bad: {
      en: "If the wide players stay high, the full-backs can be exposed and the striker can feel alone up front.",
      zh: "如果边路球员一直压得很高，边后卫身后会容易被打，中锋也可能在前场显得孤立。"
    }
  },
  "4-3-3": {
    good: {
      en: "A simple shape for pressing and counterattacking: three midfielders protect the middle, while three forwards can attack space quickly.",
      zh: "这是适合逼抢和反击的简单阵型：三名中场保护中路，三名前锋能很快冲向空当。"
    },
    bad: {
      en: "If the wingers do not help back, the full-backs can get doubled up and the midfield can be pulled wide.",
      zh: "如果边锋不回防，边后卫会被对手夹击，中场也容易被拉到边路。"
    }
  },
  "4-4-2": {
    good: {
      en: "Keeps two forwards ready for direct balls while the midfield line is easy to understand and defend from.",
      zh: "两名前锋随时准备接直接球，中场四人线也更容易理解和防守。"
    },
    bad: {
      en: "Can be outnumbered between the lines if one central midfielder gets pulled away from the middle.",
      zh: "如果一名中场被拉离中路，肋部和线间区域可能会被对手人数压制。"
    }
  }
};

const MOCK_LINEUP_TEAM_CONFIGS = {
  BEL: {
    formation: "4-2-3-1",
    starters: [
      "Thibaut Courtois",
      "Thomas Meunier",
      "Zeno Debast",
      "Arthur Theate",
      "Maxim De Cuyper",
      "Amadou Onana",
      "Youri Tielemans",
      "Jeremy Doku",
      "Kevin De Bruyne",
      "Leandro Trossard",
      "Romelu Lukaku"
    ]
  },
  BIH: {
    formation: "4-2-3-1",
    starters: [
      "Nikola Vasilj",
      "Amar Dedic",
      "Dennis Hadzikadunic",
      "Sead Kolasinac",
      "Nihad Mujakic",
      "Benjamin Tahirovic",
      "Amir Hadziahmetovic",
      "Esmir Bajraktarevic",
      "Ermedin Demirovic",
      "Kerim Alajbegovic",
      "Edin Dzeko"
    ]
  },
  CIV: {
    formation: "4-3-3",
    starters: [
      "Yahia Fofana",
      "Guela Doue",
      "Evan Ndicka",
      "Emmanuel Agbadou",
      "Ghislain Konan",
      "Ibrahim Sangare",
      "Franck Kessie",
      "Seko Fofana",
      "Amad Diallo",
      "Elye Wahi",
      "Simon Adingra"
    ]
  },
  ECU: {
    formation: "4-2-3-1",
    starters: [
      "Hernan Galindez",
      "Angelo Preciado",
      "Willian Pacho",
      "Piero Hincapie",
      "Pervis Estupinan",
      "Moises Caicedo",
      "Alan Franco",
      "Gonzalo Plata",
      "Kendry Paez",
      "John Yeboah",
      "Enner Valencia"
    ]
  },
  FRA: {
    formation: "4-2-3-1",
    starters: [
      "Mike Maignan",
      "Jules Kounde",
      "William Saliba",
      "Ibrahima Konate",
      "Theo Hernandez",
      "Aurelien Tchouameni",
      "Adrien Rabiot",
      "Ousmane Dembele",
      "Michael Olise",
      "Bradley Barcola",
      "Kylian Mbappe"
    ]
  },
  MEX: {
    formation: "4-3-3",
    starters: [
      "Guillermo Ochoa",
      "Jorge Sanchez",
      "Cesar Montes",
      "Johan Vasquez",
      "Jesus Gallardo",
      "Edson Alvarez",
      "Luis Romo",
      "Luis Chavez",
      "Roberto Alvarado",
      "Santiago Gimenez",
      "Julian Quinones"
    ]
  },
  POR: {
    formation: "4-2-3-1",
    starters: [
      "Diogo Costa",
      "Joao Cancelo",
      "Ruben Dias",
      "Goncalo Inacio",
      "Nuno Mendes",
      "Joao Neves",
      "Vitinha",
      "Bernardo Silva",
      "Bruno Fernandes",
      "Rafael Leao",
      "Cristiano Ronaldo"
    ]
  },
  CRO: {
    formation: "4-3-3",
    starters: [
      "Dominik Livakovic",
      "Josip Stanisic",
      "Josip Sutalo",
      "Josko Gvardiol",
      "Ivan Perisic",
      "Mateo Kovacic",
      "Luka Modric",
      "Martin Baturina",
      "Marco Pasalic",
      "Ante Budimir",
      "Andrej Kramaric"
    ]
  },
  ESP: {
    formation: "4-3-3",
    starters: [
      "Unai Simon",
      "Pedro Porro",
      "Pau Cubarsi",
      "Aymeric Laporte",
      "Marc Cucurella",
      "Rodri",
      "Pedri",
      "Fabian Ruiz",
      "Lamine Yamal",
      "Mikel Oyarzabal",
      "Nico Williams"
    ]
  },
  AUT: {
    formation: "4-2-3-1",
    starters: [
      "Patrick Pentz",
      "Stefan Posch",
      "Kevin Danso",
      "David Alaba",
      "Phillip Mwene",
      "Nicolas Seiwald",
      "Konrad Laimer",
      "Patrick Wimmer",
      "Marcel Sabitzer",
      "Romano Schmid",
      "Marko Arnautovic"
    ]
  },
  SUI: {
    formation: "4-2-3-1",
    starters: [
      "Gregor Kobel",
      "Silvan Widmer",
      "Manuel Akanji",
      "Nico Elvedi",
      "Ricardo Rodriguez",
      "Granit Xhaka",
      "Remo Freuler",
      "Dan Ndoye",
      "Fabian Rieder",
      "Ruben Vargas",
      "Breel Embolo"
    ]
  },
  ALG: {
    formation: "4-3-3",
    starters: [
      "Luca Zidane",
      "Rak Belghali",
      "Aissa Mandi",
      "Ramy Bensebaini",
      "Rayan Ait-Nouri",
      "Nabil Bentaleb",
      "Houssem Aouar",
      "Ramiz Zerrouki",
      "Riyad Mahrez",
      "Amine Gouiri",
      "Mohamed Amoura"
    ]
  },
  NOR: {
    formation: "4-3-3",
    starters: [
      "Orjan Nyland",
      "Marcus Holmgren Pedersen",
      "Kristoffer Ajer",
      "Leo Ostigard",
      "Julian Ryerson",
      "Sander Berge",
      "Patrick Berg",
      "Martin Odegaard",
      "Oscar Bobb",
      "Erling Haaland",
      "Antonio Nusa"
    ]
  },
  SEN: {
    formation: "4-3-3",
    starters: [
      "Edouard Mendy",
      "Antoine Mendy",
      "Kalidou Koulibaly",
      "Moussa Niakhate",
      "Ismail Jakobs",
      "Pape Gueye",
      "Habib Diarra",
      "Lamine Camara",
      "Ismaila Sarr",
      "Nicolas Jackson",
      "Sadio Mane"
    ]
  },
  SWE: {
    formation: "4-4-2",
    starters: [
      "Viktor Johansson",
      "Herman Johansson",
      "Victor Lindelof",
      "Isak Hien",
      "Gabriel Gudmundsson",
      "Anthony Elanga",
      "Jesper Karlstrom",
      "Yasin Ayari",
      "Mattias Svanberg",
      "Viktor Gyokeres",
      "Alexander Isak"
    ]
  },
  USA: {
    formation: "4-3-3",
    starters: [
      "Matt Turner",
      "Sergino Dest",
      "Chris Richards",
      "Tim Ream",
      "Antonee Robinson",
      "Tyler Adams",
      "Weston McKennie",
      "Giovanni Reyna",
      "Timothy Weah",
      "Folarin Balogun",
      "Christian Pulisic"
    ]
  }
};

const MOCK_LINEUP_MATCH_COVERAGE = {
  "match-77-round-of-32-2026-06-30": { home: "FRA", away: "SWE" },
  "match-78-round-of-32-2026-06-30": { home: "CIV", away: "NOR" },
  "match-79-round-of-32-2026-06-30": { home: "MEX", away: "ECU" },
  "match-81-round-of-32-2026-07-01": { home: "USA", away: "BIH", mode: "prediction" },
  "match-82-round-of-32-2026-07-01": { home: "BEL", away: "SEN" },
  "match-83-round-of-32-2026-07-02": { home: "POR", away: "CRO", mode: "prediction" },
  "match-84-round-of-32-2026-07-02": { home: "ESP", away: "AUT", mode: "prediction" },
  "match-85-round-of-32-2026-07-02": { home: "SUI", away: "ALG", mode: "prediction" }
};

function getMockFormationNotes(formation) {
  return MOCK_LINEUP_FORMATION_NOTES[formation] || MOCK_LINEUP_FORMATION_NOTES["4-3-3"];
}

function formatLineupShortName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return parts[0] || "";
  }

  const first = parts[0].charAt(0);
  const lastParts = [parts.at(-1)];
  const particles = new Set(["al", "da", "de", "del", "der", "di", "el", "van", "von"]);
  for (let index = parts.length - 2; index > 0; index -= 1) {
    const part = parts[index];
    if (!particles.has(part.toLowerCase())) {
      break;
    }
    lastParts.unshift(part);
  }

  return `${first}. ${lastParts.join(" ")}`;
}

function getLineupProfileByName(teamId, name) {
  return getPlayerProfile({ name, teamId }) || playerProfilesByName.get(normalizeTextKey(name)) || null;
}

function getLineupFallbackNumber(usedNumbers, reservedNumbers, start = 1) {
  let number = start;
  while (usedNumbers.has(String(number)) || reservedNumbers.has(String(number))) {
    number += 1;
  }
  usedNumbers.add(String(number));
  return String(number);
}

function getLineupPlayerNumber(profile, usedNumbers, reservedNumbers, start = 1) {
  const profileNumber = String(profile?.uniformNumber || "").trim();
  if (profileNumber && !usedNumbers.has(profileNumber)) {
    usedNumbers.add(profileNumber);
    return profileNumber;
  }

  return getLineupFallbackNumber(usedNumbers, reservedNumbers, start);
}

function getLineupProfilePositionCode(position) {
  const value = String(position || "").toLowerCase();
  if (value.includes("goalkeeper")) return "GK";
  if (value.includes("right-back") || value.includes("right back")) return "RB";
  if (value.includes("left-back") || value.includes("left back") || value.includes("left wing-back")) return "LB";
  if (value.includes("centre-back") || value.includes("center-back") || value.includes("defender")) return "CB";
  if (value.includes("defensive midfielder")) return "DM";
  if (value.includes("attacking midfielder")) return "AM";
  if (value.includes("right winger") || value.includes("right midfielder")) return "RW";
  if (value.includes("left winger") || value.includes("left midfielder")) return "LW";
  if (value.includes("winger") || value.includes("wide")) return "RW";
  if (value.includes("striker") || value.includes("forward") || value.includes("centre-forward")) return "ST";
  if (value.includes("midfielder")) return "CM";
  return "CM";
}

function getMockAvatarColor(teamId, index) {
  const palette = ["#64748b", "#6b7280", "#71717a", "#78716c", "#5f6f7f", "#6c7584"];
  const teamSeed = String(teamId || "")
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);
  return palette[(teamSeed + index) % palette.length];
}

function createMockLineupPlayers(teamId, names, formation) {
  const layout = MOCK_LINEUP_LAYOUTS[formation] || MOCK_LINEUP_LAYOUTS["4-3-3"];
  const profiles = names.map((name) => getLineupProfileByName(teamId, name));
  const reservedNumbers = new Set(
    profiles.map((profile) => String(profile?.uniformNumber || "").trim()).filter(Boolean)
  );
  const usedNumbers = new Set();

  return names.map((name, index) => {
    const profile = profiles[index];
    const displayName = profile?.displayName || name;
    const [position, x, y] = layout[index] || layout.at(-1);
    return [
      getLineupPlayerNumber(profile, usedNumbers, reservedNumbers, index + 1),
      formatLineupShortName(displayName),
      name,
      position,
      getPlayerInitials(displayName),
      x,
      y,
      getMockAvatarColor(teamId, index)
    ];
  });
}

function createMockLineupBench(teamId, starterNames, usedStarterNumbers = new Set()) {
  const starterKeys = new Set(starterNames.map((name) => normalizeTextKey(name)));
  const usedNumbers = new Set([...usedStarterNumbers].map(String));
  const reservedNumbers = new Set();
  const profiles = [...new Set(playerProfilesByName.values())]
    .filter((profile) => profile?.teamId === teamId && !starterKeys.has(normalizeTextKey(profile.name)))
    .slice(0, 15);

  return profiles.map((profile, index) => {
    const displayName = profile.displayName || profile.name;
    return [
      getLineupPlayerNumber(profile, usedNumbers, reservedNumbers, 12 + index),
      formatLineupShortName(displayName),
      profile.name,
      getLineupProfilePositionCode(profile.position)
    ];
  });
}

function getLineupUsedNumbers(players) {
  return new Set(players.map((player) => String(player?.[0] || "")).filter(Boolean));
}

function createMockLineupTeam(teamId) {
  const config = MOCK_LINEUP_TEAM_CONFIGS[teamId];
  if (!config) {
    return null;
  }

  const players = createMockLineupPlayers(teamId, config.starters, config.formation);
  return {
    formation: config.formation,
    formationNotes: getMockFormationNotes(config.formation),
    players,
    bench: createMockLineupBench(teamId, config.starters, getLineupUsedNumbers(players)),
    events: config.events || {}
  };
}

function getGeneratedMockLineupPreview(match) {
  const coverage = MOCK_LINEUP_MATCH_COVERAGE[match?.id];
  if (!coverage || coverage.home !== match?.homeTeamId || coverage.away !== match?.awayTeamId) {
    return null;
  }

  const home = createMockLineupTeam(coverage.home);
  const away = createMockLineupTeam(coverage.away);
  if (!home || !away) {
    return null;
  }

  return {
    mode: coverage.mode || (match.status === "SCHEDULED" ? "prediction" : "past"),
    home,
    away
  };
}

function getMockLineupPreview(match) {
  if (!isLineupVisualPrototypeEnabled()) {
    return null;
  }

  if (
    match?.id !== "match-80-round-of-32-2026-07-01" ||
    match?.homeTeamId !== "ENG" ||
    match?.awayTeamId !== "COD"
  ) {
    return getGeneratedMockLineupPreview(match);
  }

  if (match?.homeTeamId !== "ENG" || match?.awayTeamId !== "COD") {
    return null;
  }

  return {
    home: {
      formation: "4-2-3-1",
      formationNotes: {
        good: {
          en: "Keeps two midfielders behind the ball while four attackers fill the spaces around Kane, so England can create without feeling wide open.",
          zh: "两名中场留在球后保护，四名攻击手围绕凯恩占住空当，英格兰能创造机会，同时不至于门户大开。"
        },
        bad: {
          en: "If the wide players stay high, the full-backs can be exposed and Kane can feel alone up front.",
          zh: "如果边路球员一直压得很高，边后卫身后会容易被打，凯恩也可能在前场显得孤立。"
        }
      },
      coach: {
        name: "Thomas Tuchel",
        nameZh: "托马斯·图赫尔",
        teamName: "England",
        sinceYear: "2025",
        imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Thomas%20Tuchel%20Chelsea.jpg?width=160",
        sourceUrl: "https://www.englandfootball.com/articles/2026/Jun/26/thomas-tuchel-pre-panama-match-press-conference-quotes-20262606",
        skills: [
          { en: "Cup-game control", zh: "杯赛控制" },
          { en: "Flexible pressing", zh: "灵活逼抢" },
          { en: "Set-piece detail", zh: "定位球细节" }
        ],
        note: {
          en: "Tuchel is a detail-heavy coach: he likes control, clear roles, and patient problem-solving against packed defenses.",
          zh: "图赫尔很重视细节：他喜欢掌控比赛、明确分工，并耐心破解密集防守。"
        },
        history: {
          en: "He previously won the UEFA Champions League with Chelsea and league titles in France and Germany.",
          zh: "他此前曾带领切尔西赢得欧冠，也在法国和德国拿过联赛冠军。"
        }
      },
      players: [
        ["1", "J. Pickford", "Jordan Pickford", "GK", "JP", 50, 91, "#7d8ea2"],
        ["25", "D. Spence", "Djed Spence", "RB", "DS", 15, 75, "#60758b"],
        ["2", "E. Konsa", "Ezri Konsa", "CB", "EK", 38, 75, "#6b7b94"],
        ["6", "M. Guehi", "Marc Guehi", "CB", "MG", 62, 75, "#697b88"],
        ["3", "N. O'Reilly", "Nico O'Reilly", "LB", "NO", 85, 75, "#303540"],
        ["8", "E. Anderson", "Elliot Anderson", "CM", "EA", 34, 59, "#8792a0"],
        ["4", "D. Rice", "Declan Rice", "CM", "DR", 66, 59, "#8a929a"],
        ["20", "N. Madueke", "Noni Madueke", "RW", "NM", 18, 40, "#718192"],
        ["10", "J. Bellingham", "Jude Bellingham", "AM", "JB", 50, 40, "#6c7684"],
        ["11", "M. Rashford", "Marcus Rashford", "LW", "MR", 82, 40, "#596a7f"],
        ["9", "H. Kane", "Harry Kane", "ST", "HK", 50, 20, "#8b9297"]
      ],
      bench: [
        ["5", "J. Stones", "John Stones", "CB"],
        ["7", "B. Saka", "Bukayo Saka", "RW"],
        ["12", "R. James", "Reece James", "RB"],
        ["13", "D. Henderson", "Dean Henderson", "GK"],
        ["14", "D. Burn", "Dan Burn", "LB"],
        ["15", "J. Quansah", "Jarell Quansah", "CB"],
        ["16", "T. Chalobah", "Trevoh Chalobah", "CB"],
        ["17", "J. Henderson", "Jordan Henderson", "CM"],
        ["18", "A. Gordon", "Anthony Gordon", "LW"],
        ["19", "I. Toney", "Ivan Toney", "ST"],
        ["21", "E. Eze", "Eberechi Eze", "AM"],
        ["22", "K. Mainoo", "Kobbie Mainoo", "CM"],
        ["23", "J. Trafford", "James Trafford", "GK"],
        ["24", "M. Rogers", "Morgan Rogers", "AM"],
        ["26", "O. Watkins", "Ollie Watkins", "ST"]
      ],
      events: {
        cards: [
          { playerName: "Jude Bellingham", type: "yellow", minute: 55 },
          { playerName: "Djed Spence", type: "red", minute: 89 }
        ],
        substitutions: [
          { offName: "Noni Madueke", onName: "Bukayo Saka", minute: 64 },
          { offName: "Jude Bellingham", onName: "Eberechi Eze", minute: 78 },
          { offName: "Harry Kane", onName: "Ollie Watkins", minute: "90+1" }
        ]
      }
    },
    away: {
      formation: "4-3-3",
      formationNotes: {
        good: {
          en: "A simple counterattacking shape: three midfielders protect the middle, and three forwards can sprint into space quickly.",
          zh: "这是很直接的反击阵型：三名中场保护中路，三名前锋能很快冲向空当。"
        },
        bad: {
          en: "If the wingers do not help back, the full-backs can get doubled up and the midfield can be pulled wide.",
          zh: "如果边锋不回防，边后卫会被对手夹击，中场也容易被拉到边路。"
        }
      },
      coach: {
        name: "Sébastien Desabre",
        nameZh: "塞巴斯蒂安·德萨布尔",
        teamName: "DR Congo",
        imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/S%C3%A9bastien%20Desabre.JPG?width=160",
        sourceUrl: "https://www.espn.com/soccer/story/_/id/49101212/congo-dr-coach-urges-team-stay-humble-historic-draw-portugal",
        skills: [
          { en: "Compact defending", zh: "紧凑防守" },
          { en: "Counter attacks", zh: "快速反击" },
          { en: "Set pieces", zh: "定位球" }
        ],
        note: {
          en: "Desabre gives DR Congo structure first, then looks for speed, strength, and set pieces to turn defense into chances.",
          zh: "德萨布尔先让刚果民主共和国站稳阵型，再用速度、身体和定位球把防守转成机会。"
        }
      },
      players: [
        ["1", "L. Mpasi", "Lionel Mpasi", "GK", "LM", 50, 91, "#788394"],
        ["26", "A. Masuaku", "Arthur Masuaku", "LB", "AM", 15, 75, "#586371"],
        ["22", "C. Mbemba", "Chancel Mbemba", "CB", "CM", 38, 75, "#56616e"],
        ["4", "A. Tuanzebe", "Axel Tuanzebe", "CB", "AT", 62, 75, "#687480"],
        ["2", "A. Wan-Bissaka", "Aaron Wan-Bissaka", "RB", "AW", 85, 75, "#5c6878"],
        ["14", "N. Sadiki", "Noah Sadiki", "CM", "NS", 22, 53, "#697487"],
        ["6", "N. Mukau", "Ngalayel Mukau", "CM", "NM", 50, 53, "#758092"],
        ["8", "S. Moutoussamy", "Samuel Moutoussamy", "CM", "SM", 78, 53, "#6d7480"],
        ["9", "B. Cipenga", "Brian Cipenga", "LW", "BC", 18, 28, "#6d7888"],
        ["20", "Y. Wissa", "Yoane Wissa", "ST", "YW", 50, 28, "#5d6777"],
        ["7", "N. Mbuku", "Nathanael Mbuku", "RW", "NM", 82, 28, "#6f7f8e"]
      ],
      bench: [
        ["3", "S. Kapuadi", "Steve Kapuadi", "CB"],
        ["5", "D. Batubinsika", "Dylan Batubinsika", "CB"],
        ["10", "T. Bongonda", "Theo Bongonda", "LW"],
        ["11", "G. Kalulu", "Gedeon Kalulu", "RB"],
        ["12", "J. Kayembe", "Joris Kayembe", "LB"],
        ["13", "M. Elia", "Meschack Elia", "RW"],
        ["15", "A. Tshibola", "Aaron Tshibola", "DM"],
        ["16", "M. Epolo", "Matthieu Epolo", "GK"],
        ["17", "C. Pickel", "Charles Pickel", "DM"],
        ["18", "G. Kakuta", "Gael Kakuta", "AM"],
        ["19", "F. Mayele", "Fiston Mayele", "ST"],
        ["21", "C. Bakambu", "Cedric Bakambu", "ST"],
        ["23", "T. Fayulu", "Timothy Fayulu", "GK"],
        ["24", "S. Banza", "Simon Banza", "ST"],
        ["25", "E. Kayembe", "Edo Kayembe", "CM"]
      ],
      events: {
        cards: [
          { playerName: "Noah Sadiki", type: "yellow", minute: 38 },
          { playerName: "Chancel Mbemba", type: "red", minute: 82 }
        ],
        substitutions: [
          { offName: "Brian Cipenga", onName: "Theo Bongonda", minute: 61 },
          { offName: "Yoane Wissa", onName: "Cedric Bakambu", minute: 72 },
          { offName: "Nathanael Mbuku", onName: "Meschack Elia", minute: 72 }
        ]
      }
    }
  };
}

function getLineupUpdatedText(match) {
  const timestamp =
    match?.lineupUpdatedAt ||
    match?.lineupCheckedAt ||
    match?.scoreUpdatedAt ||
    match?.liveUpdatedAt ||
    match?.updatedAt ||
    liveDataCheckedAt ||
    siteUpdatedAt;
  const freshness = formatRelativeScoreFreshness(timestamp);

  if (!freshness) {
    return "";
  }

  return currentLanguage === "zh"
    ? `阵容：${freshness}核验`
    : `${localizeText("Lineups checked")} ${freshness}`;
}

function renderLineupUpdatedCopy(match) {
  const text = getLineupUpdatedText(match);
  return text ? `<p class="data-note lineup-updated-copy">${escapeHtml(text)}</p>` : "";
}

function localizeLineupCopy(value) {
  if (value && typeof value === "object") {
    const localizedValue = currentLanguage === "zh" ? value.zh || value.en : value.en || value.zh;
    return localizeText(localizedValue || "");
  }

  return localizeText(value || "");
}

function getLocalizedLineupCoachName(coach) {
  if (!coach?.name) {
    return "";
  }

  return currentLanguage === "zh"
    ? coach.nameZh || translateEntityNameToZh(coach.name) || coach.name
    : coach.name;
}

const LINEUP_POSITION_ZH = {
  AM: "前腰",
  CB: "中卫",
  CM: "中场",
  DM: "后腰",
  GK: "门将",
  LB: "左后卫",
  LM: "左中场",
  LW: "左边锋",
  RB: "右后卫",
  RM: "右中场",
  RW: "右边锋",
  ST: "前锋"
};

function getLocalizedLineupPosition(position) {
  const value = String(position || "").trim();
  if (!value) {
    return "";
  }

  return currentLanguage === "zh" ? LINEUP_POSITION_ZH[value] || localizeText(value) : value;
}

function getLineupHeadingLabel(lineup) {
  return lineup?.mode === "prediction" ? "Line-ups (prediction)" : "Line-ups";
}

function renderLineupHeading(match, lineup) {
  const label = getLineupHeadingLabel(lineup);
  const updatedText = getLineupUpdatedText(match);
  const helpButton = updatedText
    ? `<button class="info-tooltip-button" type="button" aria-label="${escapeHtml(updatedText)}" data-tooltip="${escapeHtml(updatedText)}">i</button>`
    : "";

  return `
    <h3 class="info-heading lineup-heading">
      <span>${escapeHtml(localizeText(label))}</span>
      ${helpButton}
    </h3>
  `;
}

function getLineupPlayerData(player, team) {
  const [number, label, name, position, initials, x, y, avatarColor] = player;
  const fullName = name || label;
  const cardPlayer = {
    name: fullName,
    team,
    teamId: team?.id,
    uniformNumber: number,
    position,
    role: position
  };

  return {
    number,
    label,
    name: fullName,
    position,
    initials: initials || getPlayerInitials(fullName),
    x,
    y,
    avatarColor,
    cardPlayer
  };
}

function normalizeLineupEventName(name) {
  return String(name || "").trim().toLowerCase();
}

function getLineupEventNameMatch(playerName) {
  const normalizedName = normalizeLineupEventName(playerName);
  return (candidateName) => normalizeLineupEventName(candidateName) === normalizedName;
}

function getLineupSubstitutionPreviewKey(matchId, side, substitution) {
  return [
    matchId,
    side,
    String(substitution?.minute || ""),
    normalizeLineupEventName(substitution?.offName),
    normalizeLineupEventName(substitution?.onName)
  ].join("|");
}

function getLineupPlayerFullName(player) {
  return player?.[2] || player?.[1] || "";
}

function getLineupSubstitutionForStarter(teamLineup, playerName) {
  const isMatch = getLineupEventNameMatch(playerName);
  return (teamLineup?.events?.substitutions || []).find((event) => isMatch(event.offName));
}

function getLineupBenchPlayerByName(teamLineup, playerName) {
  const isMatch = getLineupEventNameMatch(playerName);
  return (teamLineup?.bench || []).find((player) => isMatch(getLineupPlayerFullName(player)));
}

function getLineupPreviewPlayerForSubstitution(starterPlayer, benchPlayer) {
  if (!benchPlayer) {
    return starterPlayer;
  }

  const [, , , , , x, y, avatarColor] = starterPlayer;
  const [number, label, name, position, initials] = benchPlayer;
  const fullName = name || label;
  return [
    number,
    label,
    fullName,
    position,
    initials || getPlayerInitials(fullName),
    x,
    y,
    avatarColor
  ];
}

function getLineupCardEvents(teamLineup, playerName) {
  const isMatch = getLineupEventNameMatch(playerName);
  return (teamLineup?.events?.cards || []).filter((event) => isMatch(event.playerName || event.name));
}

function getLineupSubstitutionEvents(teamLineup, playerName) {
  const isMatch = getLineupEventNameMatch(playerName);
  return (teamLineup?.events?.substitutions || [])
    .flatMap((event) => [
      isMatch(event.onName) ? { ...event, direction: "on" } : null,
      isMatch(event.offName) ? { ...event, direction: "off" } : null
    ])
    .filter(Boolean);
}

function formatLineupEventMinute(minute) {
  const value = String(minute || "").trim();
  if (!value) {
    return "";
  }

  return value.endsWith("'") ? value : `${value}'`;
}

function getLineupCardLabel(card) {
  return localizeText(card?.type === "red" ? "Red card" : "Yellow card");
}

function getLineupSubstitutionLabel(substitution) {
  return localizeText(substitution?.direction === "on" ? "Substituted on" : "Substituted off");
}

function getLineupEventBadgeLabel(event, playerName) {
  const minute = formatLineupEventMinute(event.minute);
  const eventLabel = event.kind === "substitution"
    ? getLineupSubstitutionLabel(event)
    : getLineupCardLabel(event);
  const localizedName = currentLanguage === "zh" ? translateEntityNameToZh(playerName) || playerName : playerName;
  return [minute, localizedName, eventLabel].filter(Boolean).join(" ");
}

function renderLineupCardBadge(card, playerName) {
  const type = card?.type === "red" ? "red" : "yellow";
  const label = getLineupEventBadgeLabel({ ...card, kind: "card" }, playerName);
  return `
    <span
      class="lineup-event-badge lineup-event-card is-${escapeHtml(type)}"
      aria-label="${escapeHtml(label)}"
      title="${escapeHtml(label)}"
    ></span>
  `;
}

function renderLineupSubstitutionBadge(substitution, playerName) {
  const direction = substitution?.direction === "on" ? "on" : "off";
  const arrow = direction === "on" ? "↑" : "↓";
  const minute = formatLineupEventMinute(substitution.minute);
  const label = getLineupEventBadgeLabel({ ...substitution, kind: "substitution" }, playerName);
  return `
    <span
      class="lineup-event-badge lineup-event-sub is-${escapeHtml(direction)}"
      aria-label="${escapeHtml(label)}"
      title="${escapeHtml(label)}"
    >${escapeHtml(`${arrow}${minute}`)}</span>
  `;
}

function renderLineupSubstitutionToggle(substitution, playerName, match, side, isPreviewActive) {
  const direction = isPreviewActive ? "on" : "off";
  const arrow = direction === "on" ? "↑" : "↓";
  const minute = formatLineupEventMinute(substitution.minute);
  const label = getLineupEventBadgeLabel({ ...substitution, direction, kind: "substitution" }, playerName);
  const targetName = isPreviewActive ? substitution.offName : substitution.onName;
  const localizedTargetName = currentLanguage === "zh"
    ? translateEntityNameToZh(targetName) || targetName
    : targetName;
  const actionLabel = currentLanguage === "zh"
    ? `${label}。切换显示${localizedTargetName}`
    : `${label}. Show ${localizedTargetName}.`;

  return `
    <button
      class="lineup-event-badge lineup-event-sub lineup-substitution-toggle is-${escapeHtml(direction)}"
      type="button"
      data-lineup-substitution-toggle="true"
      data-lineup-side="${escapeHtml(side)}"
      data-lineup-match-id="${escapeHtml(match.id)}"
      data-lineup-minute="${escapeHtml(String(substitution.minute || ""))}"
      data-lineup-off-name="${escapeHtml(substitution.offName || "")}"
      data-lineup-on-name="${escapeHtml(substitution.onName || "")}"
      aria-label="${escapeHtml(actionLabel)}"
      aria-pressed="${isPreviewActive ? "true" : "false"}"
      title="${escapeHtml(actionLabel)}"
    >${escapeHtml(`${arrow}${minute}`)}</button>
  `;
}

function getLineupPlayerEvents(teamLineup, playerName) {
  return [
    ...getLineupCardEvents(teamLineup, playerName).map((event) => ({ ...event, kind: "card" })),
    ...getLineupSubstitutionEvents(teamLineup, playerName).map((event) => ({ ...event, kind: "substitution" }))
  ];
}

function renderLineupEventBadges(playerName, teamLineup, className = "") {
  return renderLineupEventBadgeList(getLineupPlayerEvents(teamLineup, playerName), playerName, className);
}

function renderLineupEventBadgeList(events, playerName, className = "") {
  const badges = events.map((event) =>
    event.kind === "substitution"
      ? renderLineupSubstitutionBadge(event, playerName)
      : renderLineupCardBadge(event, playerName)
  );

  if (!badges.length) {
    return "";
  }

  return `<span class="${escapeHtml(["lineup-event-list", className].filter(Boolean).join(" "))}">${badges.join("")}</span>`;
}

function renderLineupCardBadges(playerName, teamLineup, className = "") {
  return renderLineupEventBadgeList(
    getLineupCardEvents(teamLineup, playerName).map((event) => ({ ...event, kind: "card" })),
    playerName,
    className
  );
}

function renderLineupSubstitutionBadges(playerName, teamLineup, className = "", direction = "") {
  const directionKey = String(direction || "").trim();
  const events = getLineupSubstitutionEvents(teamLineup, playerName)
    .filter((event) => !directionKey || event.direction === directionKey)
    .map((event) => ({ ...event, kind: "substitution" }));

  return renderLineupEventBadgeList(events, playerName, className);
}

function getLineupPlayerEventSummary(playerName, teamLineup) {
  return getLineupPlayerEvents(teamLineup, playerName)
    .map((event) => getLineupEventBadgeLabel(event, playerName))
    .filter(Boolean)
    .join(", ");
}

function renderLineupTeamBand(match, lineup, teamLineup, side) {
  const benchId = `lineup-bench-${match.id}-${side}`;
  const benchCount = Array.isArray(teamLineup.bench) ? teamLineup.bench.length : 0;
  const benchLabel = localizeText("Bench");
  const benchAriaLabel = benchCount ? `${benchLabel}: ${benchCount}` : benchLabel;
  return `
    <div class="lineup-team-band">
      <div class="lineup-tabs lineup-card-tabs" role="tablist" aria-label="${escapeHtml(localizeText(getLineupHeadingLabel(lineup)))}">
        ${renderLineupTabButton(match, "home", side === "home", side)}
        ${renderLineupTabButton(match, "away", side === "away", side)}
      </div>
      <div class="lineup-team-actions">
        ${teamLineup.coach ? renderLineupCoachIconMention(teamLineup.coach) : ""}
        ${renderLineupFormationMention(teamLineup)}
        <button
          class="lineup-bench-button"
          type="button"
          data-lineup-bench-toggle="${escapeHtml(side)}"
          aria-expanded="false"
          aria-controls="${escapeHtml(benchId)}"
          aria-label="${escapeHtml(benchAriaLabel)}"
        >
          <span>${escapeHtml(benchLabel)}</span>
          ${benchCount ? `<span class="lineup-bench-count">${escapeHtml(benchCount)}</span>` : ""}
        </button>
      </div>
    </div>
  `;
}

function renderLineupTabButton(match, side, isSelected, tabContext = "main") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const tabId = `lineup-tab-${match.id}-${tabContext}-${side}`;
  const panelId = `lineup-panel-${match.id}-${side}`;
  return `
    <button
      class="lineup-tab${isSelected ? " is-active" : ""}"
      id="${escapeHtml(tabId)}"
      type="button"
      role="tab"
      data-lineup-tab="${escapeHtml(side)}"
      aria-selected="${isSelected ? "true" : "false"}"
      aria-controls="${escapeHtml(panelId)}"
      ${isSelected ? "" : `tabindex="-1"`}
    >
      ${renderFlag(team)}
      <span>${escapeHtml(getLocalizedTeamName(team))}</span>
    </button>
  `;
}

function renderLineupAvatar(player, profile) {
  const initials = getPlayerInitials(getPlayerDisplayName(player.cardPlayer, profile) || player.initials);

  if (profile?.imageUrl) {
    return `
      <img
        class="lineup-avatar-image"
        src="${escapeHtml(profile.imageUrl)}"
        alt=""
        data-player-initials="${escapeHtml(initials)}"
        loading="lazy"
        referrerpolicy="no-referrer"
      />
    `;
  }

  return `<span class="lineup-avatar">${escapeHtml(player.initials)}</span>`;
}

function getLineupCoachInitials(coach) {
  return getPlayerInitials(coach?.name || "");
}

function renderLineupCoachThumbnail(coach, className = "lineup-coach-avatar") {
  const initials = getLineupCoachInitials(coach);

  if (coach?.imageUrl) {
    return `
      <span class="${escapeHtml(className)}" aria-hidden="true">
        <img
          src="${escapeHtml(coach.imageUrl)}"
          alt=""
          data-player-initials="${escapeHtml(initials)}"
          loading="lazy"
          referrerpolicy="no-referrer"
        />
      </span>
    `;
  }

  return `<span class="${escapeHtml(className)}" aria-hidden="true">${escapeHtml(initials)}</span>`;
}

function renderLineupCoachCard(coach) {
  const coachName = getLocalizedLineupCoachName(coach);
  const teamText = localizeText(coach?.teamName || "");
  const roleText = currentLanguage === "zh"
    ? `${teamText}${localizeText("Head Coach")}`
    : `${teamText} ${localizeText("Head Coach")}`;
  const sinceText = coach?.sinceYear
    ? currentLanguage === "zh"
      ? `${escapeHtml(coach.sinceYear)} 年起`
      : `${localizeText("Since")} ${escapeHtml(coach.sinceYear)}`
    : "";
  const note = localizeLineupCopy(coach?.note);
  const history = localizeLineupCopy(coach?.history);
  const copyItems = [note, history]
    .filter(Boolean)
    .map((item) => `<span class="player-card-note">${escapeHtml(item)}</span>`)
    .join("\n");

  return `
    <span class="player-card lineup-coach-card" role="tooltip">
      <span class="player-card-header">
        <span class="player-photo">${renderLineupCoachThumbnail(coach, "lineup-coach-card-photo")}</span>
        <span class="player-card-title">
          <span class="player-card-name-line">
            <strong class="player-card-name">${escapeHtml(coachName)}</strong>
          </span>
          <span class="player-card-position">${escapeHtml(roleText)}</span>
          ${sinceText ? `<span class="player-card-club">${sinceText}</span>` : ""}
        </span>
      </span>
      ${copyItems ? `<span class="player-card-copy lineup-coach-copy">${copyItems}</span>` : ""}
    </span>
  `;
}

function renderLineupCoachMention(coach) {
  const coachName = getLocalizedLineupCoachName(coach);
  const teamName = localizeText(coach.teamName);
  const ariaLabel = `${coachName}: ${localizeText("Coach")}, ${teamName}`;
  const triggerLabel = `aria-label="${escapeHtml(ariaLabel)}" aria-expanded="false"`;
  const triggerContent = `
    ${renderLineupCoachThumbnail(coach)}
    <span class="lineup-coach-text">
      <span class="lineup-coach-label">${escapeHtml(coachName)}</span>
      <span class="lineup-coach-name-text">${escapeHtml(localizeText("Coach"))}</span>
    </span>
  `;
  const trigger = coach.sourceUrl
    ? `<a class="player-link lineup-coach-trigger" href="${escapeHtml(coach.sourceUrl)}" target="_blank" rel="noopener" ${triggerLabel}>${triggerContent}</a>`
    : `<span class="player-link lineup-coach-trigger" role="button" tabindex="0" ${triggerLabel}>${triggerContent}</span>`;

  return `
    <span class="player-hover lineup-coach-hover">
      ${trigger}
      ${renderLineupCoachCard(coach)}
    </span>
  `;
}

function renderLineupCoachIconMention(coach) {
  const coachName = getLocalizedLineupCoachName(coach);
  const teamName = localizeText(coach.teamName);
  const ariaLabel = `${coachName}: ${localizeText("Coach")}, ${teamName}`;
  const triggerLabel = `aria-label="${escapeHtml(ariaLabel)}" aria-expanded="false"`;
  const triggerContent = renderLineupCoachThumbnail(coach);
  const trigger = coach.sourceUrl
    ? `<a class="player-link lineup-coach-icon-trigger" href="${escapeHtml(coach.sourceUrl)}" target="_blank" rel="noopener" ${triggerLabel}>${triggerContent}</a>`
    : `<span class="player-link lineup-coach-icon-trigger" role="button" tabindex="0" ${triggerLabel}>${triggerContent}</span>`;

  return `
    <span class="player-hover lineup-coach-hover lineup-coach-icon-hover">
      ${trigger}
      ${renderLineupCoachCard(coach)}
    </span>
  `;
}

function renderLineupFormationCard(teamLineup) {
  const goodNote = localizeLineupCopy(teamLineup.formationNotes?.good);
  const badNote = localizeLineupCopy(teamLineup.formationNotes?.bad);

  return `
    <span class="player-card lineup-formation-card" role="tooltip">
      <span class="player-card-title">
        <span class="player-card-name-line">
          <strong class="player-card-name">${escapeHtml(teamLineup.formation)}</strong>
        </span>
        <span class="player-card-position">${escapeHtml(localizeText("Formation"))}</span>
      </span>
      <span class="player-card-copy lineup-formation-copy">
        <span class="lineup-formation-note">
          <strong>${escapeHtml(localizeText("Good at"))}</strong>
          ${escapeHtml(goodNote)}
        </span>
        <span class="lineup-formation-note">
          <strong>${escapeHtml(localizeText("Can struggle with"))}</strong>
          ${escapeHtml(badNote)}
        </span>
      </span>
    </span>
  `;
}

function renderLineupFormationMention(teamLineup) {
  const ariaLabel = `${teamLineup.formation}: ${localizeText("Formation")}`;
  return `
    <span class="player-hover lineup-formation-hover">
      <span
        class="player-link lineup-formation-pill"
        role="button"
        tabindex="0"
        aria-label="${escapeHtml(ariaLabel)}"
        aria-expanded="false"
      >
        ${escapeHtml(teamLineup.formation)}
      </span>
      ${renderLineupFormationCard(teamLineup)}
    </span>
  `;
}

function renderLineupPlayerMarker(player, team, teamLineup, match = null, side = "") {
  const starterName = getLineupPlayerFullName(player);
  const substitution = match && side ? getLineupSubstitutionForStarter(teamLineup, starterName) : null;
  const substitutionKey = substitution ? getLineupSubstitutionPreviewKey(match.id, side, substitution) : "";
  const isPreviewActive = substitutionKey ? lineupSubstitutionPreviewState.has(substitutionKey) : false;
  const displayPlayer = isPreviewActive
    ? getLineupPreviewPlayerForSubstitution(player, getLineupBenchPlayerByName(teamLineup, substitution.onName))
    : player;
  const lineupPlayer = getLineupPlayerData(displayPlayer, team);
  const profile = getPlayerProfile(lineupPlayer.cardPlayer);
  const playerName = getLocalizedPlayerDisplayName(lineupPlayer.cardPlayer, profile);
  const eventSummary = getLineupPlayerEventSummary(lineupPlayer.name, teamLineup);
  const cardBadges = renderLineupCardBadges(lineupPlayer.name, teamLineup, "lineup-avatar-card-events");
  const subOffBadges = substitution
    ? renderLineupSubstitutionToggle(substitution, lineupPlayer.name, match, side, isPreviewActive)
    : "";
  const ariaLabel = [
    `${lineupPlayer.number} ${playerName}`,
    getLocalizedLineupPosition(lineupPlayer.position),
    eventSummary
  ].filter(Boolean).join(", ");
  const avatarMarkup = `
    <span class="lineup-avatar-wrap" aria-hidden="true">
      ${renderLineupAvatar(lineupPlayer, profile)}
      <span class="lineup-player-number">${escapeHtml(lineupPlayer.number)}</span>
      ${cardBadges}
    </span>
  `;
  const subOffMarkup = subOffBadges ? `<span class="lineup-player-sub-row lineup-name-sub-events">${subOffBadges}</span>` : "";

  return `
    <span
      class="lineup-player-marker${isPreviewActive ? " is-substitution-preview" : ""}"
      style="--x: ${escapeHtml(lineupPlayer.x)}%; --y: ${escapeHtml(lineupPlayer.y)}%; --avatar-bg: ${escapeHtml(lineupPlayer.avatarColor)};"
      aria-label="${escapeHtml(ariaLabel)}"
      data-lineup-marker-key="${escapeHtml(substitutionKey || normalizeLineupEventName(starterName))}"
      data-lineup-starter-name="${escapeHtml(starterName)}"
    >
      ${renderPlayerMention(lineupPlayer.label, lineupPlayer.cardPlayer, {
        beforeTriggerMarkup: avatarMarkup,
        triggerClass: "lineup-player-name",
        wrapperClass: "lineup-player-hover"
      })}
      ${subOffMarkup}
    </span>
  `;
}

function renderLineupBenchPlayer(player, team, teamLineup) {
  const lineupPlayer = getLineupPlayerData(player, team);

  return `
    <li class="lineup-bench-player">
      <span class="lineup-bench-number">${escapeHtml(lineupPlayer.number)}</span>
      <span class="lineup-bench-name">${renderPlayerMention(lineupPlayer.label, lineupPlayer.cardPlayer)}</span>
      ${renderLineupEventBadges(lineupPlayer.name, teamLineup, "lineup-bench-events")}
      <span class="lineup-bench-position">${escapeHtml(getLocalizedLineupPosition(lineupPlayer.position))}</span>
    </li>
  `;
}

function renderLineupBenchPanel(match, team, teamLineup, side) {
  const bench = Array.isArray(teamLineup.bench) ? teamLineup.bench : [];
  const benchId = `lineup-bench-${match.id}-${side}`;

  return `
    <div
      class="lineup-bench-panel"
      id="${escapeHtml(benchId)}"
      data-lineup-bench-panel="${escapeHtml(side)}"
      aria-hidden="true"
    >
      <div class="lineup-bench-panel-inner">
        <ul class="lineup-bench-list">
          ${bench.map((player) => renderLineupBenchPlayer(player, team, teamLineup)).join("")}
        </ul>
      </div>
    </div>
  `;
}

function renderLineupPitchPanel(match, lineup, side, isSelected) {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const panelId = `lineup-panel-${match.id}-${side}`;
  const tabId = `lineup-tab-${match.id}-${side}-${side}`;
  const teamLineup = lineup[side];

  return `
    <div
      class="lineup-tab-panel${isSelected ? " is-active" : ""}"
      id="${escapeHtml(panelId)}"
      role="tabpanel"
      data-lineup-panel="${escapeHtml(side)}"
      aria-labelledby="${escapeHtml(tabId)}"
      ${isSelected ? "" : "hidden"}
    >
      <div class="lineup-pitch-card">
        ${renderLineupTeamBand(match, lineup, teamLineup, side)}
        ${renderLineupBenchPanel(match, team, teamLineup, side)}
        <div class="lineup-pitch" role="img" aria-label="${escapeHtml(`${getLocalizedTeamName(team)} ${teamLineup.formation}`)}">
          <span class="lineup-pitch-line is-mid"></span>
          <span class="lineup-pitch-line is-circle"></span>
          <span class="lineup-pitch-line is-spot"></span>
          <span class="lineup-pitch-line is-box is-top"></span>
          <span class="lineup-pitch-line is-six is-top"></span>
          <span class="lineup-pitch-line is-box is-bottom"></span>
          <span class="lineup-pitch-line is-six is-bottom"></span>
          ${teamLineup.players.map((player) => renderLineupPlayerMarker(player, team, teamLineup, match, side)).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderLineupVisualPrototype(match) {
  const lineup = getMockLineupPreview(match);

  if (!lineup) {
    return "";
  }

  return `
    <section class="info-block lineup-preview-block has-section-divider" aria-label="${escapeHtml(localizeText(getLineupHeadingLabel(lineup)))}">
      <div class="lineup-header">
        ${renderLineupHeading(match, lineup)}
      </div>
      ${renderLineupPitchPanel(match, lineup, "home", true)}
      ${renderLineupPitchPanel(match, lineup, "away", false)}
    </section>
  `;
}

function handleLineupTabClick(event) {
  const tab = event.target instanceof Element ? event.target.closest("[data-lineup-tab]") : null;
  if (!tab) {
    return false;
  }

  const block = tab.closest(".lineup-preview-block");
  const side = tab.dataset.lineupTab;
  if (!block || !side) {
    return false;
  }

  block.querySelectorAll("[data-lineup-tab]").forEach((button) => {
    const isActive = button.dataset.lineupTab === side;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });
  block.querySelectorAll("[data-lineup-panel]").forEach((panel) => {
    const isActive = panel.dataset.lineupPanel === side;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });

  window.requestAnimationFrame(() => {
    updateLineupTabIndicators(block);
    positionPlayerCards();
  });
  return true;
}

function handleLineupBenchClick(event) {
  const button = event.target instanceof Element ? event.target.closest("[data-lineup-bench-toggle]") : null;
  if (!button) {
    return false;
  }

  const panelId = button.getAttribute("aria-controls");
  const panel = panelId ? document.getElementById(panelId) : null;
  if (!panel) {
    return false;
  }

  const isOpen = button.getAttribute("aria-expanded") === "true";
  button.setAttribute("aria-expanded", String(!isOpen));
  button.classList.toggle("is-open", !isOpen);
  panel.classList.toggle("is-open", !isOpen);
  panel.setAttribute("aria-hidden", String(isOpen));
  window.requestAnimationFrame(positionPlayerCards);
  window.setTimeout(positionPlayerCards, 260);
  return true;
}

function findLineupSubstitutionFromToggle(teamLineup, button) {
  const minute = String(button.dataset.lineupMinute || "");
  const offName = normalizeLineupEventName(button.dataset.lineupOffName);
  const onName = normalizeLineupEventName(button.dataset.lineupOnName);
  return (teamLineup?.events?.substitutions || []).find((event) =>
    String(event.minute || "") === minute &&
    normalizeLineupEventName(event.offName) === offName &&
    normalizeLineupEventName(event.onName) === onName
  );
}

function animateLineupMarkerSwap(marker, nextMarkup) {
  if (!marker) {
    return;
  }

  const shouldReduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (shouldReduceMotion) {
    marker.outerHTML = nextMarkup;
    window.requestAnimationFrame(positionPlayerCards);
    return;
  }

  marker.classList.add("is-substitution-exiting");
  window.setTimeout(() => {
    marker.insertAdjacentHTML("afterend", nextMarkup);
    const nextMarker = marker.nextElementSibling;
    marker.remove();

    if (!(nextMarker instanceof HTMLElement)) {
      positionPlayerCards();
      return;
    }

    nextMarker.classList.add("is-substitution-entering");
    window.requestAnimationFrame(() => {
      nextMarker.classList.remove("is-substitution-entering");
      nextMarker.classList.add("is-substitution-settled");
      window.setTimeout(() => {
        nextMarker.classList.remove("is-substitution-settled");
      }, 240);
      positionPlayerCards();
    });
  }, 140);
}

function handleLineupSubstitutionToggleClick(event) {
  const button = event.target instanceof Element
    ? event.target.closest("[data-lineup-substitution-toggle]")
    : null;
  if (!(button instanceof HTMLElement)) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();

  const side = button.dataset.lineupSide || "";
  const match = getFixtureById(button.dataset.lineupMatchId || "");
  const lineup = getMockLineupPreview(match);
  const teamLineup = lineup?.[side];
  const substitution = findLineupSubstitutionFromToggle(teamLineup, button);
  if (!match || !teamLineup || !substitution) {
    return true;
  }

  const starterPlayer = teamLineup.players.find((player) =>
    normalizeLineupEventName(getLineupPlayerFullName(player)) === normalizeLineupEventName(substitution.offName)
  );
  const marker = button.closest(".lineup-player-marker");
  if (!starterPlayer || !(marker instanceof HTMLElement)) {
    return true;
  }
  if (marker.classList.contains("is-substitution-exiting") || marker.classList.contains("is-substitution-entering")) {
    return true;
  }

  clearActivePlayerHover();
  const substitutionKey = getLineupSubstitutionPreviewKey(match.id, side, substitution);
  if (lineupSubstitutionPreviewState.has(substitutionKey)) {
    lineupSubstitutionPreviewState.delete(substitutionKey);
  } else {
    lineupSubstitutionPreviewState.add(substitutionKey);
  }

  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const nextMarkup = renderLineupPlayerMarker(starterPlayer, team, teamLineup, match, side);
  animateLineupMarkerSwap(marker, nextMarkup);
  return true;
}

function renderFinishedMatchResultBlock(match) {
  if (match.status !== "FT") {
    return "";
  }

  return `
    <section class="info-block match-result-block has-section-divider">
      ${renderResultHeading(match)}
      ${renderScoreSummary(match)}
      ${renderResultNotes(match)}
    </section>
  `;
}

function renderMatchStatusBlock(match) {
  if (match.status === "FT") {
    return `
      ${renderPredictionBlock(match)}
      ${renderLineupVisualPrototype(match)}
    `;
  }

  if (match.status === "LIVE") {
    return `
      <section class="info-block match-live-block has-section-divider">
        <h3>${escapeHtml(localizeText("Live score"))}</h3>
        ${renderLiveScoreSummary(match)}
        ${renderScoringDetailsList(match, { showMissingWhenGoalsScored: true })}
        <p class="data-note">${escapeHtml(localizeText("Live status is manually verified and should be refreshed after full time."))}</p>
      </section>
      ${renderLineupVisualPrototype(match)}
    `;
  }

  return `
    ${renderPredictionBlock(match)}
    ${renderLineupVisualPrototype(match)}
  `;
}

function getPlayerNames(players = []) {
  return players
    .map((player) => (typeof player === "string" ? player : player?.name))
    .filter(Boolean);
}

function getKeyInformationCopy(info) {
  if (Array.isArray(info)) {
    return info.filter(Boolean).join(" ");
  }

  if (typeof info === "string" && info.trim()) {
    return info.trim();
  }

  return "";
}

function getNameSeries(names) {
  if (names.length <= 1) {
    return names.join("");
  }

  if (names.length === 2) {
    return names.join(" and ");
  }

  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

function getLocalizedNameSeries(names) {
  const cleanNames = names.filter(Boolean);
  if (currentLanguage !== "zh") {
    return getNameSeries(cleanNames);
  }

  return cleanNames.join("、");
}

function buildLocalizedKeyInformationFallback(team, players = [], opponent = null) {
  const teamName = getLocalizedTeamName(team);
  const opponentName = opponent ? getLocalizedTeamName(opponent) : "";
  const playerNames = players
    .map((player) => getLocalizedPlayerDisplayName(player))
    .filter(Boolean);
  const tags = getTeamStyleTags(team).map(localizeText).filter(Boolean);
  const opponentTags = opponent ? getTeamStyleTags(opponent).map(localizeText).filter(Boolean) : [];
  const tagline = team?.tagline ? localizeText(team.tagline) : "";
  const mainTag = tags[0] || tagline || "自身节奏";
  const opponentTag = opponentTags[0] || "对方节奏";
  const playerText = playerNames.length
    ? `关键球员：${getLocalizedNameSeries(playerNames)}。`
    : "关键球员信息尚未载入。";
  const matchupText = opponentName
    ? `对阵${opponentName}，重点看${teamName}能否把${mainTag}转化为稳定机会。`
    : "";
  const styleText = tags.length ? `风格关键词：${tags.join("、")}。` : "";
  const taglineText = tagline ? `球队特点：${tagline}。` : "";
  const riskText = opponentName
    ? `风险点：${opponentName}的${opponentTag}可能打断这个节奏。`
    : "";

  return `${teamName}看点。${playerText}${matchupText}${taglineText}${styleText}${riskText}`;
}

function getKeyInformationText(team, info, players = [], opponent = null) {
  const specificCopy = getKeyInformationCopy(info);
  if (specificCopy) {
    const localizedCopy = localizeText(specificCopy);
    return currentLanguage === "zh" && localizedCopy === specificCopy
      ? buildLocalizedKeyInformationFallback(team, players, opponent)
      : localizedCopy;
  }

  const names = players
    .map((player) => (typeof player === "string" ? player : player?.name))
    .filter(Boolean);
  const notes = players
    .map((player) => (typeof player === "string" ? "" : player?.note))
    .filter(Boolean)
    .slice(0, 2);

  if (!names.length) {
    return localizeText(
      team?.isSlot || opponent?.isSlot
        ? "Key information will be populated once this matchup is confirmed."
        : "Key information will be populated based on the opponent."
    );
  }

  if (currentLanguage === "zh") {
    return buildLocalizedKeyInformationFallback(team, players, opponent);
  }

  return `${team.name}'s key pieces here are ${getNameSeries(names)}. ${notes.join(" ")}`;
}

function getKeyInformationLabel(team) {
  const label = team?.name || "TBD";
  const localizedLabel = localizeText(label);
  return team?.tagline ? `${localizedLabel}: ${localizeText(team.tagline)}` : localizedLabel;
}

function parseHistoricalKeyInformationCopy(info) {
  const text = getKeyInformationCopy(info).replace(/\s+/g, " ").trim();
  if (!text) {
    return null;
  }

  const canceledMatch = text.match(
    /^(.+)'s (\d{4}) fixture with (.+) was canceled, so there is no match roster to analyze\./
  );
  if (canceledMatch) {
    return {
      teamName: canceledMatch[1],
      year: canceledMatch[2],
      opponentName: canceledMatch[3],
      isCanceled: true
    };
  }

  const playerMatch = text.match(
    /^(.+)'s (\d{4}) match lens runs through (.+), based on the (.+)\. Against (.+), (.+) had to beat (.+)\. Their own route was (.+), and (.+)\. The risk was that (.+)$/
  );
  if (playerMatch) {
    const [, teamName, year, players, basis, opponentName, subjectName, problem, plan, result, risk] = playerMatch;
    return { teamName, year, players, basis, opponentName, subjectName, problem, plan, result, risk, isCanceled: false };
  }

  const basisOnlyMatch = text.match(
    /^(.+)'s (\d{4}) match lens comes from the (.+)\. Against (.+), (.+) had to beat (.+)\. Their own route was (.+), and (.+)\. The risk was that (.+)$/
  );
  if (basisOnlyMatch) {
    const [, teamName, year, basis, opponentName, subjectName, problem, plan, result, risk] = basisOnlyMatch;
    return { teamName, year, basis, opponentName, subjectName, problem, plan, result, risk, isCanceled: false };
  }

  return null;
}

function getHistoricalPlanHeadlineKey(plan) {
  const text = String(plan || "").trim();
  if (/^turning .+ into the scoring route$/.test(text)) {
    return "scoring";
  }
  if (/^reaching the shootout and trusting .+$/.test(text)) {
    return "shootout";
  }
  if (/^keeping the box protected around .+$/.test(text)) {
    return "box";
  }
  if (/^using a forward-heavy shape around .+$/.test(text)) {
    return "forward";
  }
  if (/^using midfield numbers around .+ to control the game$/.test(text)) {
    return "midfield";
  }
  if (/^keeping a defensive base around .+$/.test(text)) {
    return "defensive";
  }
  if (/^making .+ the spine of the match plan$/.test(text)) {
    return "spine";
  }

  return "shape";
}

function lowerInitialPhrase(value) {
  return String(value || "").replace(/^([A-Z])/, (match) => match.toLowerCase());
}

function formatHistoricalStyleHeadline(tags) {
  const localizedTags = tags.map(localizeText).filter(Boolean);
  if (!localizedTags.length) {
    return "";
  }

  if (currentLanguage === "zh") {
    return localizedTags.join("、");
  }

  if (localizedTags.length === 1) {
    return localizedTags[0];
  }

  if (localizedTags.length === 2) {
    return `${localizedTags[0]} with ${lowerInitialPhrase(localizedTags[1])}`;
  }

  return `${localizedTags[0]} with ${lowerInitialPhrase(localizedTags[1])} and ${lowerInitialPhrase(localizedTags[2])}`;
}

function getHistoricalStyleHeadlineTags(team) {
  const historicalTags = getHistoricalStyleTags(team?.name || "");
  return Array.isArray(historicalTags) && historicalTags.length
    ? historicalTags.slice(0, 3)
    : getTeamStyleTags(team);
}

function getHistoricalPlanStyleHeadline(planKey) {
  const english = {
    scoring: "Box entries from multiple lines",
    shootout: "Low-margin patience and shootout nerve",
    box: "Box protection and patient spacing",
    forward: "Forward-heavy pressure",
    midfield: "Midfield numbers and tempo control",
    defensive: "Defensive base with direct exits",
    spine: "Central spine and matchup control",
    shape: "Compact squad shape"
  };
  const zh = {
    scoring: "多线进入禁区",
    shootout: "低容错耐心与点球冷静",
    box: "禁区保护与耐心站位",
    forward: "锋线人数压迫",
    midfield: "中场人数与节奏控制",
    defensive: "防守基础与直接出球",
    spine: "中轴控制对位",
    shape: "紧凑阵容结构"
  };
  const headlines = currentLanguage === "zh" ? zh : english;

  return headlines[planKey] || headlines.shape;
}

function getHistoricalKeyInformationHeadline(team, info) {
  const styleHeadline = formatHistoricalStyleHeadline(getHistoricalStyleHeadlineTags(team));
  if (styleHeadline) {
    return styleHeadline;
  }

  const parsed = parseHistoricalKeyInformationCopy(info);
  if (!parsed) {
    return "";
  }

  if (parsed.isCanceled) {
    return currentLanguage === "zh"
      ? "取消赛程保留阵容背景"
      : "Canceled fixture kept as squad context";
  }

  return getHistoricalPlanStyleHeadline(getHistoricalPlanHeadlineKey(parsed.plan));
}

function getHistoricalKeyInformationLabel(team, info) {
  const teamName = getLocalizedTeamName(team) || localizeText(team?.name || "TBD");
  const headline = getHistoricalKeyInformationHeadline(team, info);
  if (!headline) {
    return teamName;
  }

  return currentLanguage === "zh" ? `${teamName}：${headline}` : `${teamName}: ${headline}`;
}

function getTeamStyleTags(team) {
  return Array.isArray(team?.styleTags)
    ? team.styleTags.filter((tag) => typeof tag === "string" && tag.trim()).slice(0, 3)
    : [];
}

function renderTeamStyleTags(team) {
  const tags = getTeamStyleTags(team);
  if (!tags.length) {
    return "";
  }

  return `
    <ul class="team-style-tags" aria-label="${escapeHtml(localizeText(`${team.name} style notes`))}">
      ${tags.map((tag) => `<li>${escapeHtml(localizeText(tag))}</li>`).join("")}
    </ul>
  `;
}

function renderKeyInformationHeading(team, label = getKeyInformationLabel(team)) {
  return `
    <span class="key-info-heading">
      ${renderFlag(team)}
      <span>${escapeHtml(label)}</span>
    </span>
  `;
}

function getPlayerProfile(player) {
  if (isHistoricalPlayerCard(player)) {
    return null;
  }

  const name = getPlayerName(player);
  if (!name) {
    return null;
  }

  const nameKey = normalizeTextKey(name);
  const teamId = getPlayerTeamId(player);
  if (teamId) {
    const teamProfile = playerProfilesByTeamAndName.get(`${teamId}:${nameKey}`);
    if (teamProfile) {
      return teamProfile;
    }
  }

  return playerProfilesByName.get(nameKey) || null;
}

function getPlayerTeamId(player) {
  return String(player?.teamId || player?.team?.id || "").trim().toUpperCase();
}

function getHistoricalPlayerProfile(player) {
  if (!isHistoricalPlayerCard(player)) {
    return null;
  }

  const name = getPlayerName(player);
  if (!name) {
    return null;
  }

  const tournamentYear = Number(player?.tournamentYear || player?.year);
  for (const teamName of getHistoricalProfileTeamCandidates(player)) {
    const versionKey = getHistoricalProfileVersionKey(name, teamName, tournamentYear);
    const profile = versionKey ? historicalPlayerProfilesByVersion.get(versionKey) : null;
    if (profile) {
      return profile;
    }
  }

  return historicalPlayerProfilesByName.get(normalizeTextKey(name)) || null;
}

function isHistoricalPlayerCard(player) {
  return Boolean(player && typeof player === "object" && player.historical);
}

function getPlayerDisplayName(player, profile = getPlayerProfile(player)) {
  return profile?.displayName || profile?.name || player?.displayName || getPlayerName(player);
}

function getLocalizedPlayerDisplayName(player, profile = getPlayerProfile(player)) {
  const displayName = getPlayerDisplayName(player, profile);
  if (isHistoricalPlayerCard(player)) {
    return localizeHistoricalScorerName(displayName);
  }

  if (currentLanguage !== "zh") {
    return displayName;
  }

  const sourceName = getPlayerName(player);
  const localizedSourceName = localizeDisplayText(sourceName);
  if (localizedSourceName && localizedSourceName !== sourceName) {
    return localizedSourceName;
  }

  const localizedDisplayName = localizeDisplayText(displayName);
  if (localizedDisplayName && localizedDisplayName !== displayName) {
    return localizedDisplayName;
  }

  return translateEntityNameToZh(displayName) || displayName;
}

function shouldPreserveLocalizedMentionLabel(label) {
  const text = String(label || "").trim();
  return currentLanguage === "zh" && text && !/[A-Za-z]/.test(text) && CJK_CHARACTER_PATTERN.test(text);
}

function getPlayerUniformNumber(player, profile = getPlayerProfile(player)) {
  const value =
    profile?.uniformNumber ??
    profile?.shirtNumber ??
    profile?.jerseyNumber ??
    profile?.squadNumber ??
    player?.uniformNumber ??
    player?.shirtNumber ??
    player?.jerseyNumber ??
    player?.squadNumber;
  const number = Number(value);

  return Number.isInteger(number) && number > 0 ? number : null;
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

function getPlayerPositionValue(player, profile = getPlayerProfile(player)) {
  return profile?.position || player?.position || player?.role || "";
}

function getPlayerClubValue(player, profile = getPlayerProfile(player)) {
  return profile?.club || player?.club || "";
}

function getPlayerLeagueValue(player, profile = getPlayerProfile(player)) {
  return profile?.league || player?.league || "";
}

function isGoalScorerCardPlayer(player) {
  return Boolean(player && typeof player === "object" && player.cardContext === "goal-scorer");
}

function getGoalScorerTeamLine(player, options = {}) {
  const team = player?.teamId ? teamsById.get(player.teamId) : player?.team;
  const teamName = team?.name || "";

  if (options.localized && currentLanguage === "zh") {
    return teamName ? `${getLocalizedTeamName(team)}比赛记录` : "比赛进球记录";
  }

  return teamName ? `${teamName} match card` : "Match goal record";
}

function getPlayerClubLine(player, profile = getPlayerProfile(player)) {
  const club =
    getPlayerClubValue(player, profile) ||
    (isHistoricalPlayerCard(player)
      ? "Historic World Cup record"
      : isGoalScorerCardPlayer(player)
        ? getGoalScorerTeamLine(player)
        : "Club to verify");
  const league = getPlayerLeagueValue(player, profile);
  return league ? `${club} (${league})` : club;
}

const ZH_PLAYER_POSITION_PART_TRANSLATIONS = {
  "attacking midfielder": "攻击型中场",
  "center back": "中后卫",
  "central defender": "中后卫",
  "central midfield": "中场",
  "central midfielder": "中前卫",
  "centre back": "中后卫",
  "centre forward": "中锋",
  defender: "后卫",
  "defensive midfield": "防守型中场",
  "defensive midfielder": "防守型中场",
  forward: "前锋",
  "full back": "边后卫",
  goalkeeper: "门将",
  "left back": "左后卫",
  "left midfielder": "左中场",
  "left wing": "左边锋",
  "left wing back": "左翼卫",
  "left winger": "左边锋",
  midfielder: "中场",
  "right back": "右后卫",
  "right midfielder": "右中场",
  "right wing": "右边锋",
  "right wing back": "右翼卫",
  "right winger": "右边锋",
  "second striker": "影锋",
  striker: "中锋",
  sweeper: "清道夫",
  "wide midfielder": "边中场",
  "wing back": "翼卫",
  winger: "边锋"
};

const ZH_PLAYER_POSITION_EXACT_TRANSLATIONS = {
  "centre back right back defensive midfielder": "中后卫、右后卫、防守型中场",
  "centre back sweeper": "中后卫、清道夫"
};

function formatPlayerPosition(position) {
  const text = String(position || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return "";
  }

  return text.replace(/(^|[,/]\s*)(\p{Letter})/gu, (_, prefix, letter) => {
    return `${prefix}${letter.toLocaleUpperCase("en-US")}`;
  });
}

function normalizePlayerPositionTranslationKey(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[‐‑‒–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getKnownZhPlayerPositionTranslation(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return "";
  }

  const exact =
    ZH_EXACT_TRANSLATIONS.get(text) ||
    ZH_EXACT_TRANSLATIONS.get(formatPlayerPosition(text)) ||
    ZH_PLAYER_POSITION_EXACT_TRANSLATIONS[normalizePlayerPositionTranslationKey(text)] ||
    ZH_PLAYER_POSITION_PART_TRANSLATIONS[normalizePlayerPositionTranslationKey(text)];
  return exact || "";
}

function translatePlayerPositionSegmentToZh(segment) {
  const text = String(segment || "").trim();
  if (!text) {
    return "";
  }

  const exact = getKnownZhPlayerPositionTranslation(text);
  if (exact) {
    return exact;
  }

  const generated = translateGeneratedSoccerPhraseToZh(text);
  return generated && !/[A-Za-z]/.test(generated) ? generated : "";
}

function translatePlayerPositionToZh(position) {
  const text = String(position || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return "";
  }

  const exact = getKnownZhPlayerPositionTranslation(text);
  if (exact) {
    return exact;
  }

  const tokens = text.split(/(\s*[,;/]\s*)/).filter((token) => token.length);
  const translated = tokens
    .map((token) => {
      if (/[,;]/.test(token)) {
        return "、";
      }
      if (/\//.test(token)) {
        return "/";
      }
      return translatePlayerPositionSegmentToZh(token);
    })
    .join("")
    .replace(/、+/g, "、")
    .replace(/^、|、$/g, "");

  if (translated && !/[A-Za-z]/.test(translated)) {
    return translated;
  }

  const generated = translateGeneratedSoccerPhraseToZh(text);
  return generated && !/[A-Za-z]/.test(generated) ? generated : "";
}

function getLocalizedPlayerPosition(player, profile = getPlayerProfile(player)) {
  const position = getPlayerPositionValue(player, profile);
  if (currentLanguage === "zh") {
    return translatePlayerPositionToZh(position) || localizeText("Position to verify");
  }

  return formatPlayerPosition(position) || "Position to verify";
}

function getHistoricalArchiveClubLineZh(player, profile) {
  const teamName =
    (Array.isArray(profile?.teams) && profile.teams[0]) ||
    String(getPlayerClubValue(player, profile) || "").replace(/\s+World Cup archive$/i, "").trim();

  return teamName ? `${translateEntityNameToZh(teamName)}世界杯存档` : "历史世界杯存档";
}

function hasLowercaseLatinWord(value) {
  return /[A-Za-zÀ-ÖØ-öø-ÿ][a-zà-öø-ÿ]{2,}/.test(String(value || ""));
}

function getDirectZhDisplayTranslation(value, translationMaps = []) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return "";
  }

  for (const translationMap of translationMaps) {
    const translation = translationMap[text];
    if (translation) {
      return translation;
    }
  }

  return ZH_EXACT_TRANSLATIONS.get(text) || getZhNormalizedEntityTranslations().get(normalizeTextKey(text)) || "";
}

function localizePlayerClubName(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return "";
  }

  const direct = getDirectZhDisplayTranslation(text, [ZH_CLUB_NAME_TRANSLATIONS]);
  if (direct) {
    return direct;
  }

  const loanMatch = text.match(/^(.+?)\s+\(on loan from (.+)\)$/i);
  if (loanMatch) {
    return `${localizePlayerClubName(loanMatch[1])}（从${localizePlayerClubName(loanMatch[2])}租借）`;
  }

  const replaced = localizeKnownDisplayEntities(text);
  if (replaced !== text && !hasLowercaseLatinWord(replaced)) {
    return replaced;
  }

  return translateEntityNameToZh(text);
}

function localizePlayerLeagueName(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return "";
  }

  const direct = getDirectZhDisplayTranslation(text, [ZH_LEAGUE_NAME_TRANSLATIONS]);
  if (direct) {
    return direct;
  }

  const lastClubMatch = text.match(/^Last club:\s*(.+)$/i);
  if (lastClubMatch) {
    return `最后效力：${localizePlayerClubName(lastClubMatch[1])}`;
  }

  const replaced = localizeKnownDisplayEntities(text);
  if (replaced !== text && !hasLowercaseLatinWord(replaced)) {
    return replaced;
  }

  return translateEntityNameToZh(text);
}

function getLocalizedPlayerClubLine(player, profile = getPlayerProfile(player)) {
  if (currentLanguage === "zh" && isHistoricalPlayerCard(player)) {
    return getHistoricalArchiveClubLineZh(player, profile);
  }

  const club = getPlayerClubValue(player, profile)
    ? localizePlayerClubName(getPlayerClubValue(player, profile))
    : isHistoricalPlayerCard(player)
      ? "历史世界杯记录"
      : isGoalScorerCardPlayer(player)
        ? getGoalScorerTeamLine(player, { localized: true })
        : localizeText("Club to verify");
  const league = getPlayerLeagueValue(player, profile) ? localizePlayerLeagueName(getPlayerLeagueValue(player, profile)) : "";
  return league ? `${club}（${league}）` : club;
}

function exposeLocalPlayerCardLocalizationTestHooks() {
  if (typeof window === "undefined" || !["127.0.0.1", "localhost"].includes(window.location.hostname)) {
    return;
  }

  window.__worldCupTestHooks = {
    ...(window.__worldCupTestHooks || {}),
    localization: {
      translateTextToZh
    },
    playerCards: {
      getLocalizedPlayerClubLine,
      getLocalizedPlayerPosition
    }
  };
}

exposeLocalPlayerCardLocalizationTestHooks();

function getPlayerReferenceDate(player) {
  const matchDate = String(player?.matchDate || player?.date || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(matchDate)) {
    return new Date(`${matchDate}T12:00:00Z`);
  }

  const tournamentYear = Number(player?.tournamentYear || player?.year);
  if (Number.isInteger(tournamentYear) && tournamentYear > 0) {
    return new Date(`${tournamentYear}-07-01T12:00:00Z`);
  }

  return new Date();
}

function getPlayerAge(profile, referenceDate = new Date()) {
  const birthDate = String(profile?.birthDate || profile?.dateOfBirth || "").trim();
  const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) {
    return null;
  }

  let age = referenceDate.getFullYear() - year;
  const hasHadBirthday =
    referenceDate.getMonth() + 1 > month ||
    (referenceDate.getMonth() + 1 === month && referenceDate.getDate() >= day);
  if (!hasHadBirthday) {
    age -= 1;
  }

  return Number.isInteger(age) && age >= 0 && age < 100 ? age : null;
}

function getLocalizedPlayerAgeLine(player, profile) {
  const referenceDate = isHistoricalPlayerCard(player) ? getPlayerReferenceDate(player) : new Date();
  const age = getPlayerAge(profile, referenceDate);
  if (age === null) {
    return "";
  }

  if (isHistoricalPlayerCard(player)) {
    const tournamentYear = Number(player?.tournamentYear || player?.year);
    if (Number.isInteger(tournamentYear) && tournamentYear > 0) {
      return currentLanguage === "zh" ? `${tournamentYear}年年龄 ${age}` : `${tournamentYear} age ${age}`;
    }
    return currentLanguage === "zh" ? `当时年龄 ${age}` : `Age then ${age}`;
  }

  return currentLanguage === "zh" ? `年龄 ${age}` : `Age ${age}`;
}

function getPlayerMarketValueInfo(profile) {
  const exact = Number(profile?.marketValueEurMillions);
  if (Number.isFinite(exact) && exact > 0) {
    return { value: exact, estimated: false };
  }

  const estimated = Number(profile?.estimatedMarketValueEurMillions);
  if (Number.isFinite(estimated) && estimated > 0) {
    return { value: estimated, estimated: true };
  }

  return null;
}

function getPlayerMarketValueEurMillions(profile) {
  return getPlayerMarketValueInfo(profile)?.value ?? null;
}

function hasPlayerMarketValue(profile) {
  return getPlayerMarketValueEurMillions(profile) !== null;
}

function hasCompletePlayerMarketValues(profilesData) {
  const profiles = Object.values(profilesData?.profiles || {});
  return profiles.length > 0 && profiles.every(hasPlayerMarketValue);
}

function formatMarketValueEur(value) {
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

function renderPlayerMarketValueLine(profile) {
  if (!shouldShowPlayerMarketValues) {
    return "";
  }

  const marketValue = getPlayerMarketValueInfo(profile);
  const value = formatMarketValueEur(marketValue?.value);
  if (!value) {
    return "";
  }

  const label = marketValue.estimated
    ? currentLanguage === "zh"
      ? "估值"
      : "Est. value"
    : currentLanguage === "zh"
      ? "身价"
      : "Value";
  const tooltip = marketValue.estimated
    ? currentLanguage === "zh"
      ? "估算市场价值，参考公开估值、年龄、俱乐部层级、角色和近期表现。"
      : "Estimated market value, shaped by public valuations, age, club level, role, and recent form."
    : currentLanguage === "zh"
      ? "来自公开球员估值数据的市场价值。"
      : "Market value from sourced player valuation data.";

  return `<span class="player-card-value-help" tabindex="0" aria-label="${escapeHtml(tooltip)}" data-tooltip="${escapeHtml(tooltip)}">${escapeHtml(label)}</span> ${escapeHtml(value)}`;
}

function renderHistoricalPeakValueLine(profile) {
  const value = formatMarketValueEur(profile?.peakMarketValueEurMillions);
  if (!value) {
    return "";
  }

  const label = currentLanguage === "zh" ? "峰值身价" : "Peak value";
  const tooltip =
    currentLanguage === "zh"
      ? "来自Transfermarkt数据集的球员生涯峰值市场价值；不是这场比赛当天的精确身价。"
      : "Career peak market value from the Transfermarkt dataset; not an exact match-day value.";

  return `<span class="player-card-value-help" tabindex="0" aria-label="${escapeHtml(tooltip)}" data-tooltip="${escapeHtml(tooltip)}">${escapeHtml(label)}</span> ${escapeHtml(value)}`;
}

function renderHistoricalTournamentValueLine(profile) {
  const value = formatMarketValueEur(profile?.marketValueAtTournamentEurMillions);
  if (!value) {
    return "";
  }

  const tournamentYear = Number(profile?.tournamentYear || profile?.year);
  const yearText = Number.isInteger(tournamentYear) && tournamentYear > 0 ? `${tournamentYear} ` : "";
  const label = currentLanguage === "zh" ? `${yearText}身价`.trim() : `${yearText}value`.trim();
  const tooltip =
    currentLanguage === "zh"
      ? "该届世界杯时期的市场价值；仅在有版本化来源时显示。"
      : "Tournament-year market value; shown only when a versioned source is available.";

  return `<span class="player-card-value-help" tabindex="0" aria-label="${escapeHtml(tooltip)}" data-tooltip="${escapeHtml(tooltip)}">${escapeHtml(label)}</span> ${escapeHtml(value)}`;
}

function renderPlayerValueLine(player, profile) {
  if (isHistoricalPlayerCard(player)) {
    return renderHistoricalTournamentValueLine(profile) || renderHistoricalPeakValueLine(profile);
  }

  return renderPlayerMarketValueLine(profile);
}

function getPlayerSkills(player, profile = getPlayerProfile(player)) {
  const skills = Array.isArray(profile?.skills) ? profile.skills.filter(Boolean) : [];
  if (skills.length) {
    return skills.slice(0, 4);
  }

  const note = getPlayerNote(player);
  const position = formatPlayerPosition(getPlayerPositionValue(player, profile));
  const fallbackSkills = [];

  if (position) {
    fallbackSkills.push(position);
  }
  if (/scored|goal|finisher/i.test(note)) {
    fallbackSkills.push("Goal threat");
  }
  if (/shootout|penalt/i.test(note)) {
    fallbackSkills.push("Penalty pressure");
  }
  if (/started/i.test(note)) {
    fallbackSkills.push("Starter");
  }
  if (/substitute/i.test(note)) {
    fallbackSkills.push("Impact sub");
  }
  if (/clean sheet|goalkeeper/i.test(note) || /goalkeeper/i.test(position)) {
    fallbackSkills.push("Defensive control");
  }
  if (fallbackSkills.length) {
    return [...new Set(fallbackSkills)].slice(0, 4);
  }

  return note ? [note] : ["Match plan"];
}

function getHistoricalArchiveYearLabel(profile) {
  const years = (profile?.tournamentYears || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!years.length) {
    return "历史";
  }
  if (years.length === 1) {
    return `${years[0]}`;
  }

  return `${years[0]}-${years.at(-1)}`;
}

function getHistoricalRoleNoteZh(profile) {
  const position = formatPlayerPosition(profile?.position || "");
  const skills = Array.isArray(profile?.skills) ? profile.skills : [];
  const hasGoalThreat = Number(profile?.goals) > 0 || skills.includes("Goal threat");
  const hasPenaltyPressure = skills.includes("Penalty pressure");

  if (/Goalkeeper/i.test(position)) {
    return "最后防线";
  }
  if (/Defender|back/i.test(position)) {
    return hasGoalThreat ? "防线进球威胁" : "防守控制点";
  }
  if (/Midfielder/i.test(position)) {
    if (hasPenaltyPressure) {
      return "中场定位球与点球压力";
    }
    return hasGoalThreat ? "中场进球威胁" : "中场连接点";
  }
  if (/Forward|Winger|Striker/i.test(position)) {
    return hasGoalThreat ? "锋线进球威胁" : "锋线支点";
  }

  return `${localizeText(position || "Player")}参考点`;
}

function formatHistoricalCountZh(count, label) {
  const number = Number(count);
  if (!Number.isFinite(number) || number <= 0) {
    return "";
  }

  return `${label}${number}次`;
}

function getHistoricalPlayerNoteZh(player, profile) {
  const teamName =
    (Array.isArray(profile?.teams) && profile.teams[0]) ||
    String(getPlayerClubValue(player, profile) || "").replace(/\s+World Cup archive$/i, "").trim() ||
    "历史世界杯";
  const archiveLabel = `${translateEntityNameToZh(teamName)}${getHistoricalArchiveYearLabel(profile)}存档`;
  const role = getHistoricalRoleNoteZh(profile);
  const impactParts = [
    Number(profile?.goals) > 0 ? `世界杯进球${Number(profile.goals)}个` : "",
    formatHistoricalCountZh(profile?.keyMatchCount, "比赛视角出现")
  ].filter(Boolean);
  const impact = impactParts.length ? `，${impactParts.join("，")}` : "";

  return `${archiveLabel}：${role}${impact}。`;
}

function getPlayerCardNote(player, profile = getPlayerProfile(player)) {
  if (isHistoricalPlayerCard(player)) {
    return profile?.styleNote || profile?.note || getPlayerNote(player) || "";
  }

  return getPlayerNote(player) || profile?.note || "";
}

function getLocalizedPlayerNote(player, profile = getPlayerProfile(player)) {
  if (currentLanguage === "zh" && isHistoricalPlayerCard(player)) {
    return getHistoricalPlayerNoteZh(player, profile);
  }

  const note = getPlayerCardNote(player, profile);
  if (!note) {
    return "";
  }

  if (currentLanguage === "zh" && profile?.noteZh) {
    return localizeKnownPlayerNames(profile.noteZh);
  }

  const localizedNote = localizeText(note);
  if (currentLanguage !== "zh" || localizedNote !== note) {
    return localizeKnownPlayerNames(localizedNote);
  }

  const skills = getPlayerSkills(player, profile)
    .map(localizePlayerSkill)
    .filter(Boolean);
  return skills.length ? `球员看点：${skills.join("、")}。` : "";
}

function getPlayerAliases(player, allPlayers) {
  const name = getPlayerName(player);
  const profile = getPlayerProfile(player);
  const displayName = getPlayerDisplayName(player, profile);
  const localizedDisplayName = getLocalizedPlayerDisplayName(player, profile);
  const candidates = [name, displayName, localizedDisplayName];
  const nameParts = name.split(/\s+/).filter(Boolean);
  const displayParts = displayName.split(/\s+/).filter(Boolean);

  if (currentLanguage === "zh") {
    candidates.push(localizeDisplayText(name), localizeDisplayText(displayName));
  }

  if (nameParts.length > 1) {
    candidates.push(nameParts.at(-1));
    candidates.push(nameParts[0]);
  }

  if (displayParts.length > 1) {
    candidates.push(displayParts.at(-1));
    candidates.push(displayParts[0]);
  }

  const candidateCounts = new Map();
  for (const other of allPlayers) {
    const otherNameParts = getPlayerName(other).split(/\s+/).filter(Boolean);
    const uniqueNamePartKeys = [
      otherNameParts[0],
      otherNameParts.at(-1)
    ]
      .filter(Boolean)
      .map((part) => normalizeTextKey(part));
    for (const key of new Set(uniqueNamePartKeys)) {
      candidateCounts.set(key, (candidateCounts.get(key) || 0) + 1);
    }
  }

  return [...new Set(candidates)]
    .map((alias) => alias.trim())
    .filter((alias) => alias.length >= 3)
    .filter((alias) => {
      const isFullName = /\s/.test(alias);
      return isFullName || candidateCounts.get(normalizeTextKey(alias)) === 1;
    });
}

function getPlayerMentionEntries(players) {
  const aliasBuckets = new Map();

  for (const player of players) {
    const playerName = getPlayerName(player);
    if (!playerName) {
      continue;
    }

    const playerKey = normalizeTextKey(playerName);
    for (const alias of getPlayerAliases(player, players)) {
      const key = normalizeTextKey(alias);
      const bucket = aliasBuckets.get(key) || { aliases: [], players: new Map() };
      if (!bucket.aliases.includes(alias)) {
        bucket.aliases.push(alias);
      }
      bucket.players.set(playerKey, player);
      aliasBuckets.set(key, bucket);
    }
  }

  return [...aliasBuckets.values()]
    .filter((bucket) => bucket.players.size === 1)
    .flatMap((bucket) => {
      const player = [...bucket.players.values()][0];
      return bucket.aliases.map((alias) => ({ alias, player }));
    })
    .sort((a, b) => b.alias.length - a.alias.length);
}

function getPlayerMentionEntriesForText(players) {
  const entries = getPlayerMentionEntries(players);

  if (currentLanguage === "zh") {
    const zhAliasBuckets = new Map();
    const addZhAliasCandidate = (alias, player) => {
      const text = String(alias || "").trim();
      const playerKey = normalizeTextKey(getPlayerName(player));
      const aliasKey = normalizeTextKey(text);

      if (!text || !playerKey || !aliasKey || /[A-Za-z]/.test(text)) {
        return;
      }

      const bucket = zhAliasBuckets.get(aliasKey) || { aliases: [], players: new Map() };
      if (!bucket.aliases.includes(text)) {
        bucket.aliases.push(text);
      }
      bucket.players.set(playerKey, player);
      zhAliasBuckets.set(aliasKey, bucket);
    };

    for (const entry of entries) {
      const alias = translateRouteEntityPartToZh(entry.alias);
      if (alias && alias !== entry.alias) {
        addZhAliasCandidate(alias, entry.player);
      }
    }

    for (const player of players) {
      const profile = getPlayerProfile(player) || getHistoricalPlayerProfile(player);
      const aliases = [
        getLocalizedPlayerDisplayName(player, profile),
        localizeDisplayText(getPlayerName(player)),
        localizeDisplayText(getPlayerDisplayName(player, profile))
      ];

      for (const alias of aliases) {
        addZhAliasCandidate(alias, player);
      }
    }

    for (const bucket of zhAliasBuckets.values()) {
      if (bucket.players.size !== 1) {
        continue;
      }

      const player = [...bucket.players.values()][0];
      for (const alias of bucket.aliases) {
        const aliasKey = normalizeTextKey(alias);
        if (aliasKey && !entries.some((entry) => normalizeTextKey(entry.alias) === aliasKey)) {
          entries.push({ alias, player });
        }
      }
    }

    entries.sort((a, b) => b.alias.length - a.alias.length);
  }

  return entries;
}

function renderPlayerPhoto(player, profile) {
  const displayName = getLocalizedPlayerDisplayName(player, profile);
  const initials = getPlayerInitials(displayName);
  if (profile?.imageUrl) {
    return `
      <img
        src="${escapeHtml(profile.imageUrl)}"
        alt=""
        data-player-initials="${escapeHtml(initials)}"
        loading="lazy"
        referrerpolicy="no-referrer"
      />
    `;
  }

  return `<span class="player-photo-fallback">${escapeHtml(initials)}</span>`;
}

function replaceBrokenPlayerPhoto(image) {
  const fallback = document.createElement("span");
  fallback.className = "player-photo-fallback";
  fallback.textContent = image.dataset.playerInitials || "";
  image.replaceWith(fallback);
}

function replaceBrokenLineupAvatar(image) {
  const fallback = document.createElement("span");
  fallback.className = "lineup-avatar";
  fallback.textContent = image.dataset.playerInitials || "";
  image.replaceWith(fallback);
}

function replaceBrokenLineupCoachPhoto(image) {
  const parentClassName = image.closest(".lineup-coach-card-photo")
    ? "lineup-coach-card-photo"
    : "lineup-coach-avatar";
  const fallback = document.createElement("span");
  fallback.className = parentClassName;
  fallback.textContent = image.dataset.playerInitials || "";
  image.replaceWith(fallback);
}

function getPlayerCardTeam(player, profile) {
  const teamId = String(profile?.teamId || getPlayerTeamId(player)).trim().toUpperCase();
  if (teamId) {
    const team = teamsById.get(teamId);
    if (team) {
      return team;
    }
  }

  if (player?.team && (player.team.flag || player.team.flagClass)) {
    return player.team;
  }

  const teamNames = [
    profile?.teamName,
    ...(Array.isArray(profile?.teams) ? profile.teams : []),
    ...getHistoricalProfileTeamCandidates(player)
  ];

  for (const teamName of teamNames) {
    const key = normalizeTextKey(teamName);
    const team = teamsByName.get(key) || getHistoricalTeam(teamName);
    if (team) {
      return team;
    }
  }

  return null;
}

function renderPlayerCardFlag(player, profile) {
  const team = getPlayerCardTeam(player, profile);
  const flag = team ? renderFlag(team) : "";
  return flag ? `<span class="player-card-flag">${flag}</span>` : "";
}

function renderPlayerMention(label, player, options = {}) {
  const profile = getPlayerProfile(player) || getHistoricalPlayerProfile(player);
  const displayName = getLocalizedPlayerDisplayName(player, profile);
  const uniformNumber = getPlayerUniformNumber(player, profile);
  const position = getLocalizedPlayerPosition(player, profile);
  const club = currentLanguage === "zh" ? getLocalizedPlayerClubLine(player, profile) : getPlayerClubLine(player, profile);
  const sourceUrl = isHistoricalPlayerCard(player) ? "" : profile?.sourceUrl || "";
  const note = getLocalizedPlayerNote(player, profile);
  const ageLine = getLocalizedPlayerAgeLine(player, profile);
  const valueLine = renderPlayerValueLine(player, profile);
  const skills = getPlayerSkills(player, profile).map(localizePlayerSkill);
  const cardFlag = renderPlayerCardFlag(player, profile);
  const triggerLabel = `aria-label="${escapeHtml(`${displayName}: ${position}, ${club}`)}" aria-expanded="false"`;
  const visibleLabel = shouldPreserveLocalizedMentionLabel(label)
    ? label
    : currentLanguage === "zh"
      ? displayName
      : label;
  const wrapperClass = ["player-hover", options.wrapperClass].filter(Boolean).join(" ");
  const triggerClass = ["player-link", options.triggerClass].filter(Boolean).join(" ");
  const beforeTriggerMarkup = options.beforeTriggerMarkup || "";
  const afterTriggerMarkup = options.afterTriggerMarkup || "";
  const trigger = sourceUrl
    ? `<a class="${escapeHtml(triggerClass)}" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener" ${triggerLabel}>${escapeHtml(visibleLabel)}</a>`
    : `<span class="${escapeHtml(triggerClass)}" role="button" tabindex="0" ${triggerLabel}>${escapeHtml(visibleLabel)}</span>`;
  const numberBadge = uniformNumber
    ? `<span class="player-card-number">#${escapeHtml(uniformNumber)}</span>`
    : "";
  const skillItems = skills.map((skill) => `<span>${escapeHtml(skill)}</span>`).join("");
  const noteMarkup = note ? `<span class="player-card-note">${escapeHtml(note)}</span>` : "";
  const metaLine = [ageLine ? escapeHtml(ageLine) : "", valueLine].filter(Boolean).join(" • ");
  const metaMarkup = metaLine ? `<span class="player-card-note">${metaLine}</span>` : "";
  const copyMarkup = noteMarkup || metaMarkup
    ? `<span class="player-card-copy">${noteMarkup}${metaMarkup}</span>`
    : "";

  return [
    `<span class="${escapeHtml(wrapperClass)}">`,
    beforeTriggerMarkup,
    trigger,
    afterTriggerMarkup,
    `<span class="player-card" role="tooltip">`,
    `<span class="player-card-header">`,
    `<span class="player-photo">${renderPlayerPhoto(player, profile)}</span>`,
    `<span class="player-card-title">`,
    `<span class="player-card-name-line">`,
    cardFlag,
    `<strong class="player-card-name">${escapeHtml(displayName)}</strong>`,
    numberBadge,
    `</span>`,
    `<span class="player-card-position">${escapeHtml(position)}</span>`,
    `<span class="player-card-club">${escapeHtml(club)}</span>`,
    `</span>`,
    `</span>`,
    `<span class="player-skill-list">${skillItems}</span>`,
    copyMarkup,
    `</span>`,
    `</span>`
  ].join("");
}

let floatingPlayerCard = null;
let floatingPlayerCardSource = null;
let floatingPlayerCardHideTimer = 0;

function ensureFloatingPlayerCard() {
  if (floatingPlayerCard) {
    return floatingPlayerCard;
  }

  floatingPlayerCard = document.createElement("span");
  floatingPlayerCard.className = "player-card player-card-floating";
  floatingPlayerCard.setAttribute("role", "tooltip");
  floatingPlayerCard.setAttribute("aria-hidden", "true");
  document.body.append(floatingPlayerCard);
  floatingPlayerCard.addEventListener("pointerenter", () => {
    window.clearTimeout(floatingPlayerCardHideTimer);
  });
  floatingPlayerCard.addEventListener("pointerleave", () => {
    queueFloatingPlayerCardHide();
  });
  floatingPlayerCard.addEventListener("focusin", () => {
    window.clearTimeout(floatingPlayerCardHideTimer);
  });
  floatingPlayerCard.addEventListener("focusout", () => {
    queueFloatingPlayerCardHide();
  });
  return floatingPlayerCard;
}

function isFloatingPlayerCardActive() {
  return Boolean(
    floatingPlayerCardSource?.isConnected &&
      (floatingPlayerCardSource.matches(":hover, :focus-within") ||
        floatingPlayerCard?.matches(":hover, :focus-within") ||
        floatingPlayerCardSource.classList.contains("is-card-open"))
  );
}

function hideFloatingPlayerCard() {
  window.clearTimeout(floatingPlayerCardHideTimer);
  floatingPlayerCardHideTimer = 0;
  floatingPlayerCardSource?.classList.remove("is-card-portaled");
  floatingPlayerCardSource = null;
  floatingPlayerCard?.classList.remove("is-visible");
  floatingPlayerCard?.setAttribute("aria-hidden", "true");
}

function queueFloatingPlayerCardHide() {
  window.clearTimeout(floatingPlayerCardHideTimer);
  floatingPlayerCardHideTimer = window.setTimeout(() => {
    if (!isFloatingPlayerCardActive()) {
      hideFloatingPlayerCard();
    }
  }, 80);
}

function shouldUseFloatingPlayerCard(playerHover) {
  return isTouchPlayerCardMode() || Boolean(playerHover?.closest("#catch-up-popover, #match-info"));
}

function positionFloatingPlayerCard(playerHover, cardWidth) {
  const trigger = playerHover?.querySelector(".player-link");
  const floatingCard = ensureFloatingPlayerCard();
  if (!trigger) {
    return;
  }

  const viewportMargin = 18;
  const triggerRect = trigger.getBoundingClientRect();
  floatingCard.style.setProperty("--player-card-width", `${cardWidth}px`);
  floatingCard.style.setProperty("--player-card-floating-left", `${viewportMargin}px`);
  floatingCard.style.setProperty("--player-card-floating-top", `${viewportMargin}px`);

  const cardRect = floatingCard.getBoundingClientRect();
  const cardHeight = cardRect.height || 0;
  const centeredLeft = triggerRect.left + triggerRect.width / 2 - cardWidth / 2;
  const maxLeft = Math.max(viewportMargin, window.innerWidth - cardWidth - viewportMargin);
  const left = Math.min(Math.max(centeredLeft, viewportMargin), maxLeft);
  const belowTop = triggerRect.bottom + 9;
  const aboveTop = triggerRect.top - cardHeight - 9;
  const canFitBelow = belowTop + cardHeight <= window.innerHeight - viewportMargin;
  const canFitAbove = aboveTop >= viewportMargin;
  const top = canFitBelow
    ? belowTop
    : canFitAbove
      ? aboveTop
      : Math.min(
          Math.max(viewportMargin, belowTop),
          Math.max(viewportMargin, window.innerHeight - cardHeight - viewportMargin)
        );

  floatingCard.style.setProperty("--player-card-floating-left", `${Math.round(left)}px`);
  floatingCard.style.setProperty("--player-card-floating-top", `${Math.round(top)}px`);
}

function showFloatingPlayerCard(playerHover, cardWidth) {
  const sourceCard = playerHover?.querySelector(".player-card");
  const floatingCard = ensureFloatingPlayerCard();
  if (!sourceCard) {
    return;
  }

  if (floatingPlayerCardSource !== playerHover) {
    if (floatingPlayerCardSource) {
      setPlayerHoverExpanded(floatingPlayerCardSource, false);
    }
    floatingPlayerCardSource?.classList.remove("is-card-portaled");
    floatingPlayerCardSource = playerHover;
    floatingCard.innerHTML = sourceCard.innerHTML;
  }

  playerHover.classList.add("is-card-portaled");
  window.clearTimeout(floatingPlayerCardHideTimer);
  floatingCard.setAttribute("aria-hidden", "false");
  positionFloatingPlayerCard(playerHover, cardWidth);
  floatingCard.classList.add("is-visible");
  updateTooltipBounds(floatingCard);
  floatingCard.querySelectorAll("img").forEach((image) => {
    image.addEventListener("load", () => {
      if (floatingPlayerCardSource === playerHover) {
        positionFloatingPlayerCard(playerHover, cardWidth);
        updateTooltipBounds(floatingCard);
      }
    }, { once: true });
  });
}

function positionPlayerCard(playerHover, options = {}) {
  const { forceFloating = false } = options;
  const card = playerHover?.querySelector(".player-card");
  const trigger = playerHover?.querySelector(".player-link");
  if (!card || !trigger) {
    return;
  }

  const viewportMargin = 18;
  const maxCardWidth = Math.max(0, window.innerWidth - viewportMargin * 2);
  const cardWidth = Math.min(292, maxCardWidth);
  const triggerRect = trigger.getBoundingClientRect();

  if (shouldUseFloatingPlayerCard(playerHover)) {
    if (
      forceFloating ||
      playerHover.matches(":hover, :focus-within") ||
      playerHover.classList.contains("is-card-open") ||
      floatingPlayerCardSource === playerHover
    ) {
      showFloatingPlayerCard(playerHover, cardWidth);
    }
    return;
  }

  if (floatingPlayerCardSource === playerHover) {
    hideFloatingPlayerCard();
  }

  const desiredLeft = Math.max(
    viewportMargin,
    Math.min(triggerRect.left, window.innerWidth - cardWidth - viewportMargin)
  );
  const shift = desiredLeft - triggerRect.left;

  card.style.setProperty("--player-card-width", `${cardWidth}px`);
  card.style.setProperty("--player-card-shift", `${Math.round(shift)}px`);
  updateTooltipBounds(card);
}

function positionPlayerCards() {
  document
    .querySelectorAll(".player-hover")
    .forEach((playerHover) => positionPlayerCard(playerHover));
  updateTooltipBounds();
}

let activePlayerHover = null;

function isTouchPlayerCardMode() {
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

function shouldPreviewPlayerCardOnHover(event) {
  if (event.pointerType && event.pointerType !== "mouse") {
    return false;
  }

  return !isTouchPlayerCardMode();
}

function setPlayerHoverExpanded(playerHover, isExpanded) {
  const trigger = playerHover?.querySelector(".player-link");
  playerHover?.classList.toggle("is-card-open", isExpanded);
  trigger?.setAttribute("aria-expanded", String(isExpanded));
}

function getClosestPlayerHover(target) {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest(".player-hover");
}

function closeInactivePlayerHovers(currentPlayerHover = null) {
  document
    .querySelectorAll(".player-hover.is-card-open, .player-hover.is-card-portaled")
    .forEach((playerHover) => {
      if (playerHover === currentPlayerHover) {
        return;
      }

      setPlayerHoverExpanded(playerHover, false);
      playerHover.classList.remove("is-card-portaled");
    });
}

function clearActivePlayerHover() {
  closeInactivePlayerHovers();

  if (!activePlayerHover) {
    hideFloatingPlayerCard();
    return;
  }

  setPlayerHoverExpanded(activePlayerHover, false);
  activePlayerHover = null;
  hideFloatingPlayerCard();
}

function openPlayerHoverCard(playerHover) {
  closeInactivePlayerHovers(playerHover);

  activePlayerHover = playerHover;
  setPlayerHoverExpanded(playerHover, true);
  positionPlayerCard(playerHover);
}

function renderPlayerLinkedText(text, players = []) {
  const entries = getPlayerMentionEntriesForText(players);
  if (!entries.length) {
    return escapeHtml(text);
  }

  const playerByAlias = new Map(entries.map((entry) => [entry.alias, entry.player]));
  const aliasPattern = entries.map((entry) => escapeRegExp(entry.alias)).join("|");
  const mentionPattern = new RegExp(
    `(^|[^A-Za-z])(${aliasPattern})('s)?(?=$|[^A-Za-z])`,
    "g"
  );
  let html = "";
  let cursor = 0;

  for (const match of text.matchAll(mentionPattern)) {
    const [fullMatch, prefix, alias, possessive = ""] = match;
    const start = match.index + prefix.length;
    const end = match.index + fullMatch.length;
    const player = playerByAlias.get(alias);

    if (!player) {
      continue;
    }

    html += escapeHtml(text.slice(cursor, start));
    html += renderPlayerMention(`${alias}${possessive}`, player);
    cursor = end;
  }

  html += escapeHtml(text.slice(cursor));
  return html;
}

function withPlayerTeamContext(player, team) {
  if (!team) {
    return player;
  }

  if (typeof player === "string") {
    return { name: player, team, teamId: team.id || "" };
  }

  return {
    ...player,
    team: player?.team || team,
    teamId: player?.teamId || team.id || ""
  };
}

function getMatchKeyPlayers(match) {
  return [
    ...(match.keyPlayers?.home || []).map((player) => withPlayerTeamContext(player, match.homeTeam)),
    ...(match.keyPlayers?.away || []).map((player) => withPlayerTeamContext(player, match.awayTeam))
  ].filter((player) => getPlayerName(player));
}

function textMentionsFullPlayerName(text, name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return false;
  }

  const pattern = new RegExp(
    `(^|[^\\p{Letter}\\p{Number}])${parts.map(escapeRegExp).join("[\\s\\u00a0-]+")}('s)?(?=$|[^\\p{Letter}\\p{Number}])`,
    "iu"
  );
  return pattern.test(text || "");
}

function getProfileMentionPlayersFromText(text) {
  if (!text) {
    return [];
  }

  return [...new Set(playerProfilesByName.values())]
    .filter((profile) =>
      [profile.name, profile.displayName]
        .filter(Boolean)
        .some((name) => textMentionsFullPlayerName(text, name))
    )
    .map((profile) => ({
      name: profile.name || profile.displayName,
      team: teamsById.get(profile.teamId),
      note: profile.note
    }));
}

function getMatchGoalPlayers(match) {
  return getFixtureGoals(match).map((goal) => ({
    name: goal.name,
    team: goal.team,
    note: ""
  }));
}

function getUniqueMentionPlayers(players) {
  const seen = new Set();
  const uniquePlayers = [];

  for (const player of players) {
    const name = getPlayerName(player);
    const key = normalizeTextKey(name);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniquePlayers.push(player);
  }

  return uniquePlayers;
}

function getHistoricalMatchTeamName(match, side) {
  if (side === "home") {
    return match?.homeTeam?.name || match?.homeSlot || "";
  }

  return match?.awayTeam?.name || match?.awaySlot || "";
}

function getMatchMentionPlayers(match, keyInformation = {}) {
  return getUniqueMentionPlayers([
    ...getMatchKeyPlayers(match),
    ...getMatchGoalPlayers(match),
    ...getProfileMentionPlayersFromText(keyInformation.home),
    ...getProfileMentionPlayersFromText(keyInformation.away)
  ]);
}

function createHistoricalPlayerCard(player, extra = {}) {
  const base = typeof player === "string" ? { name: player } : { ...(player || {}) };
  return {
    ...base,
    ...extra,
    historical: true
  };
}

function getHistoricalSideKeyPlayers(match, side) {
  const historicalTeamName = getHistoricalMatchTeamName(match, side);
  return (match.keyPlayers?.[side] || [])
    .filter((player) => getPlayerName(player))
    .map((player) =>
      createHistoricalPlayerCard(player, {
        historicalTeamName,
        matchDate: match.date,
        tournamentYear: Number(match.tournamentYear)
      })
    );
}

function getHistoricalMatchKeyPlayers(match) {
  return [
    ...getHistoricalSideKeyPlayers(match, "home"),
    ...getHistoricalSideKeyPlayers(match, "away")
  ];
}

function findHistoricalMatchPlayerByName(match, name) {
  const nameKey = normalizeTextKey(name);
  return getHistoricalMatchKeyPlayers(match).find((player) => normalizeTextKey(getPlayerName(player)) === nameKey) || null;
}

function getHistoricalGoalPlayer(match, goal) {
  const matchedPlayer = findHistoricalMatchPlayerByName(match, goal.name);
  if (matchedPlayer) {
    return matchedPlayer;
  }

  const scoringSide = goal?.side === "away" ? "away" : "home";
  const playerSide = goal?.ownGoal ? (scoringSide === "home" ? "away" : "home") : scoringSide;
  return createHistoricalPlayerCard(goal.name || "Unknown scorer", {
    historicalTeamName: getHistoricalMatchTeamName(match, playerSide),
    matchDate: match.date,
    role: goal.ownGoal ? "Own goal" : "Goal scorer",
    tournamentYear: Number(match.tournamentYear)
  });
}

function getHistoricalMatchGoalPlayers(match) {
  return getHistoricalFixtureGoals(match).map((goal) => getHistoricalGoalPlayer(match, goal));
}

function getHistoricalMentionPlayers(match) {
  return getUniqueMentionPlayers([
    ...getHistoricalMatchKeyPlayers(match),
    ...getHistoricalMatchGoalPlayers(match)
  ]);
}

function renderKeyInformationTeam(
  team,
  info,
  players = [],
  mentionPlayers = players,
  opponent = null,
  label = getKeyInformationLabel(team)
) {
  const text = getKeyInformationText(team, info, players, opponent);
  return `
    <article class="key-info-team">
      <h4>${renderKeyInformationHeading(team, label)}</h4>
      ${renderTeamStyleTags(team)}
      <p>${renderPlayerLinkedText(text, mentionPlayers)}</p>
    </article>
  `;
}

function renderKeyInformation(match) {
  const keyInformation = match.keyInformation || {};
  const keyPlayers = match.keyPlayers || {};
  const mentionPlayers = getMatchMentionPlayers(match, keyInformation);

  return `
    <div class="key-info-grid">
      ${renderKeyInformationTeam(match.homeTeam, keyInformation.home, keyPlayers.home, mentionPlayers, match.awayTeam)}
      ${renderKeyInformationTeam(match.awayTeam, keyInformation.away, keyPlayers.away, mentionPlayers, match.homeTeam)}
    </div>
  `;
}

function getPastWinnerTeamId(result) {
  const hasStructuredScore =
    result.homeTeamId &&
    result.awayTeamId &&
    Number.isFinite(Number(result.homeScore)) &&
    Number.isFinite(Number(result.awayScore));

  if (!hasStructuredScore || Number(result.homeScore) === Number(result.awayScore)) {
    return "";
  }

  return Number(result.homeScore) > Number(result.awayScore)
    ? result.homeTeamId
    : result.awayTeamId;
}

function getPastRecord(match, results) {
  return results.reduce(
    (record, result) => {
      const winnerTeamId = getPastWinnerTeamId(result);

      if (!winnerTeamId) {
        record.draws += 1;
      } else if (winnerTeamId === match.homeTeamId) {
        record.homeWins += 1;
      } else if (winnerTeamId === match.awayTeamId) {
        record.awayWins += 1;
      }

      return record;
    },
    { awayWins: 0, draws: 0, homeWins: 0, total: results.length }
  );
}

function formatPastRecordPercent(count, total) {
  if (!total) {
    return "0%";
  }

  return `${Math.round((count / total) * 100)}%`;
}

function formatPastRecordCount(count, type) {
  if (type === "draw") {
    return `${count} ${count === 1 ? "tie" : "ties"}`;
  }

  return `${count} ${count === 1 ? "win" : "wins"}`;
}

function renderPastRecord(match, results) {
  const record = getPastRecord(match, results);
  const items = [
    { count: record.homeWins, label: getLocalizedTeamName(match.homeTeam), type: "win" },
    { count: record.draws, label: "Tie", type: "draw" },
    { count: record.awayWins, label: getLocalizedTeamName(match.awayTeam), type: "win" }
  ].map((item) => {
    const percent = formatPastRecordPercent(item.count, record.total);
    const share = record.total ? (item.count / record.total) * 100 : 0;
    const countLabel = localizeText(formatPastRecordCount(item.count, item.type));
    const compactLabel = `${item.count} (${percent})`;
    const label = localizeText(item.label);

    return {
      ...item,
      compactLabel,
      countLabel,
      label,
      percent,
      share,
      rowLabel:
        currentLanguage === "zh"
          ? `${label}：${countLabel}，${percent}`
          : `${label}: ${countLabel}, ${percent}`
    };
  });
  const recordLabel = localizeText(`Head-to-head record across ${record.total} ${
    record.total === 1 ? "match" : "matches"
  }`);

  return `
    <div class="past-record" aria-label="${escapeHtml(recordLabel)}">
      ${items
        .map(
          (item) => `
            <article class="past-record-row" aria-label="${escapeHtml(item.rowLabel)}" data-tooltip="${escapeHtml(item.label)}">
              ${renderMeasuredLabel(item.label, "past-record-label")}
              <span class="past-record-track" aria-hidden="true">
                <span style="--record-share: ${escapeHtml(item.share.toFixed(3))}%;"></span>
              </span>
              <span class="past-record-count">${escapeHtml(item.compactLabel)}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderPastResultList(results, leadingTeamId = "", options = {}) {
  const listClass = ["past-list", options.className || ""].filter(Boolean).join(" ");

  return `
    <ul class="${escapeHtml(listClass)}">
      ${results
        .map(
          (result) => `
            <li>
              <span class="past-meta">
                <span>${escapeHtml(result.date)}</span>
                <em>${escapeHtml(localizeText(result.competition))}</em>
              </span>
              ${renderPastScoreline(result, leadingTeamId)}
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderPastResults(match) {
  const h2h = match.h2h || {};
  const hasResolvedTeams = Boolean(match.homeTeam && match.awayTeam && !match.homeTeam.isSlot && !match.awayTeam.isSlot);
  const summaryText =
    h2h.status === "research-pending"
      ? "Past meetings not loaded yet."
      : hasResolvedTeams && /^Teams are not known yet\./.test(h2h.summary || "")
        ? ""
        : h2h.summary;
  const summary = summaryText
    ? `<p class="h2h-summary">${escapeHtml(localizeText(summaryText))}</p>`
    : "";

  if (!Array.isArray(h2h.results)) {
    if (h2h.status === "research-pending") {
      return summary;
    }

    return `
      ${summary}
      <p class="past-empty">${escapeHtml(localizeText("Past meetings not loaded yet."))}</p>
    `;
  }

  if (!h2h.results.length) {
    return summary || `<p class="past-empty">${escapeHtml(localizeText("No verified senior meetings found before this match."))}</p>`;
  }

  const visibleResults = h2h.results.slice(0, 3);
  const hiddenResults = h2h.results.slice(3);
  const totalResults = h2h.results.length;
  const hiddenCount = hiddenResults.length;
  const hiddenResultsId = `past-results-${match.id}`;

  return `
    ${renderPastRecord(match, h2h.results)}
    ${renderPastResultList(visibleResults, match.homeTeamId, {
      className: hiddenCount ? "has-hidden-results" : ""
    })}
    ${
      hiddenCount
        ? `
          <div class="past-reveal">
            <button class="past-reveal-button" type="button" data-past-reveal aria-controls="${escapeHtml(hiddenResultsId)}" aria-label="${escapeHtml(localizeText(`Show all ${totalResults} matches`))}">
              <span class="past-reveal-action">${escapeHtml(localizeText("Show all matches"))}</span>
            </button>
            <div class="past-hidden-results" id="${escapeHtml(hiddenResultsId)}" hidden>
              ${renderPastResultList(hiddenResults, match.homeTeamId)}
            </div>
          </div>
        `
        : ""
    }
  `;
}

function getTeamGroupId(team) {
  const teamId = team?.id || "";
  return (
    team?.groupId ||
    tournament.groups.find((group) => (group.teamIds || []).includes(teamId))?.id ||
    ""
  );
}

function getKnockoutParticipantLabel(entry) {
  if (entry?.team) {
    return getTournamentTeamDisplayName(entry.team);
  }

  return localizeText(entry?.slotText || entry?.label || "TBD");
}

function renderKnockoutContextTeamName(team, label = getLocalizedTeamName(team), options = {}) {
  const labelText = String(label || "").trim();

  if (!labelText) {
    return "";
  }

  const rankHtml = team && options.showRank ? renderRank(team) : "";
  const className = [
    "knockout-context-team",
    options.isSubject ? "is-subject" : "",
    rankHtml ? "has-rank" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return `<span class="${escapeHtml(className)}"><span class="knockout-context-team-name">${escapeHtml(labelText)}</span>${rankHtml ? ` ${rankHtml}` : ""}</span>`;
}

function renderKnockoutParticipantLabel(entry, options = {}) {
  if (entry?.team) {
    return renderKnockoutContextTeamName(entry.team, getTournamentTeamDisplayName(entry.team), options);
  }

  return escapeHtml(localizeText(entry?.slotText || entry?.label || "TBD"));
}

function renderKnockoutMatchupLabel(match, context) {
  if (!match) {
    return escapeHtml(localizeText("TBD"));
  }

  const participants = getTournamentMatchParticipants(match, context);
  return `${renderKnockoutParticipantLabel(participants.home, { showRank: true })} ${escapeHtml(
    localizeText("vs")
  )} ${renderKnockoutParticipantLabel(participants.away, { showRank: true })}`;
}

function isKnockoutMatchupPredicted(match, context) {
  return isTournamentProjectedMatch(match, context);
}

function getKnockoutMatchupLabel(match, context) {
  if (!match) {
    return localizeText("TBD");
  }

  const participants = getTournamentMatchParticipants(match, context);
  return `${getKnockoutParticipantLabel(participants.home)} ${localizeText("vs")} ${getKnockoutParticipantLabel(participants.away)}`;
}

function getTeamResultScorePair(fixture, teamId) {
  if (!fixture?.score) {
    return "";
  }

  const isHome = fixture.homeTeamId === teamId;
  const teamScore = isHome ? fixture.score.home : fixture.score.away;
  const opponentScore = isHome ? fixture.score.away : fixture.score.home;
  return formatScorePair({ home: teamScore, away: opponentScore });
}

function getTeamResultOutcome(fixture, teamId) {
  const teamScore = Number(fixture?.homeTeamId === teamId ? fixture.score?.home : fixture.score?.away);
  const opponentScore = Number(fixture?.homeTeamId === teamId ? fixture.score?.away : fixture.score?.home);

  if (!Number.isFinite(teamScore) || !Number.isFinite(opponentScore)) {
    return "";
  }

  if (teamScore > opponentScore) {
    return "win";
  }

  if (teamScore < opponentScore) {
    return "loss";
  }

  return "draw";
}

function getTeamResultOpponent(fixture, teamId) {
  return getTeam(fixture.homeTeamId === teamId ? fixture.awayTeamId : fixture.homeTeamId);
}

function formatGroupRoundSummaryZh(team, resultItems, remainingCount) {
  const teamName = renderKnockoutContextTeamName(team, getLocalizedTeamName(team), { isSubject: true });
  const segments = resultItems.map((item) => {
    const opponent = renderKnockoutContextTeamName(item.opponent, getLocalizedTeamName(item.opponent), {
      showRank: true
    });
    const scoreText = escapeHtml(item.scoreText);
    if (item.outcome === "win") {
      return `以 ${scoreText} 击败 ${opponent}`;
    }
    if (item.outcome === "loss") {
      return `以 ${scoreText} 不敌 ${opponent}`;
    }
    return `以 ${scoreText} 战平 ${opponent}`;
  });
  const remainingText = remainingCount > 0 ? `还有${remainingCount}场小组赛未完。` : "";
  return `${teamName}小组赛：${segments.join("；")}。${remainingText}`;
}

function formatGroupRoundSummary(team, resultItems, remainingCount) {
  if (!resultItems.length) {
    return `${renderKnockoutContextTeamName(team)}: ${escapeHtml(localizeText("No loaded group-round results yet."))}`;
  }

  if (currentLanguage === "zh") {
    return formatGroupRoundSummaryZh(team, resultItems, remainingCount);
  }

  const groups = {
    win: [],
    draw: [],
    loss: []
  };

  resultItems.forEach((item) => {
    const opponent = renderKnockoutContextTeamName(item.opponent, getLocalizedTeamName(item.opponent), {
      showRank: true
    });
    const scoreText = escapeHtml(item.scoreText);

    if (item.outcome === "win") {
      groups.win.push(`${scoreText} against ${opponent}`);
      return;
    }

    if (item.outcome === "draw") {
      groups.draw.push(`${scoreText} against ${opponent}`);
      return;
    }

    groups.loss.push(`${scoreText} to ${opponent}`);
  });

  const phrases = [
    groups.win.length ? `won ${getNameSeries(groups.win)}` : "",
    groups.draw.length ? `tied ${getNameSeries(groups.draw)}` : "",
    groups.loss.length ? `lost ${getNameSeries(groups.loss)}` : ""
  ].filter(Boolean);
  const remainingText =
    remainingCount > 0
      ? ` ${remainingCount} group match${remainingCount === 1 ? "" : "es"} still to play.`
      : "";

  return `${renderKnockoutContextTeamName(team, getLocalizedTeamName(team), { isSubject: true })} ${getNameSeries(phrases)}.${escapeHtml(remainingText)}`;
}

function getGroupRoundSummaryForParticipant(entry) {
  if (!entry?.team?.id || entry.team.isSlot || isTournamentProjectedParticipant(entry)) {
    const slotText = String(entry?.slotText || entry?.label || "").trim();
    const label =
      isTournamentProjectedParticipant(entry) && slotText
        ? escapeHtml(localizeText(slotText))
        : renderKnockoutParticipantLabel(entry);

    if (slotText && slotText !== "TBD") {
      return currentLanguage === "zh" ? `${label}尚未确认。` : `${label} is not confirmed yet.`;
    }

    return `${label}: ${escapeHtml(localizeText("No loaded group-round results yet."))}`;
  }

  const team = entry.team;
  const teamId = team.id;
  const groupId = getTeamGroupId(team);
  const groupFixtures = fixtures
    .filter(
      (fixture) =>
        fixture.stage === "group" &&
        fixture.groupId === groupId &&
        (fixture.homeTeamId === teamId || fixture.awayTeamId === teamId)
    )
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)));
  const resultItems = groupFixtures
    .filter((fixture) => fixture.status === "FT" && fixture.score)
    .map((fixture) => ({
      opponent: getTeamResultOpponent(fixture, teamId),
      outcome: getTeamResultOutcome(fixture, teamId),
      scoreText: getTeamResultScorePair(fixture, teamId)
    }))
    .filter((item) => item.outcome && item.scoreText);
  const remainingCount = groupFixtures.filter((fixture) => fixture.status !== "FT").length;

  return formatGroupRoundSummary(team, resultItems, remainingCount);
}

function renderRoundOf32PathContext(match, context) {
  const participants = getTournamentMatchParticipants(match, context);
  const heading = formatKnockoutContextHeading(localizeText("Previous"), localizeText("Group round"));
  const rows = [participants.home, participants.away]
    .map((entry) => `<li>${getGroupRoundSummaryForParticipant(entry)}</li>`)
    .join("");

  return `
    <section class="info-block match-previous-block has-section-divider">
      <h3>${escapeHtml(heading)}</h3>
      <ul class="result-highlights knockout-context-list">
        ${rows}
      </ul>
    </section>
  `;
}

function getKnockoutScorePairForSide(match, side) {
  if (!match?.score) {
    return "";
  }

  return side === "away"
    ? formatScorePair({ home: match.score.away, away: match.score.home })
    : formatScorePair(match.score);
}

function getKnockoutPenaltyPairForSide(match, side) {
  const penalties = match?.scoreDetails?.penalties;

  if (!penalties) {
    return "";
  }

  return side === "away"
    ? formatScorePair({ home: penalties.away, away: penalties.home })
    : formatScorePair(penalties);
}

function renderKnockoutCompletedSummary(match, context) {
  const participants = getTournamentMatchParticipants(match, context);
  const scoreText = escapeHtml(formatScorePair(match.score));
  const winner = getTournamentMatchWinnerTeam(match, context);

  if (!scoreText) {
    return renderKnockoutMatchupLabel(match, context);
  }

  if (!winner) {
    const homeName = renderKnockoutParticipantLabel(participants.home, { showRank: true });
    const awayName = renderKnockoutParticipantLabel(participants.away, { showRank: true });

    if (currentLanguage === "zh") {
      return `${homeName} 和 ${awayName} 以 ${scoreText} 战平。`;
    }

    return `${homeName} and ${awayName} tied ${scoreText}.`;
  }

  const winnerSide = participants.away.team?.id === winner.id ? "away" : "home";
  const loserSide = winnerSide === "home" ? "away" : "home";
  const winnerName = renderKnockoutParticipantLabel(participants[winnerSide], {
    showRank: true,
    isSubject: true
  });
  const loserName = renderKnockoutParticipantLabel(participants[loserSide], { showRank: true });
  const winnerScoreText = escapeHtml(getKnockoutScorePairForSide(match, winnerSide));
  const penaltyText = escapeHtml(getKnockoutPenaltyPairForSide(match, winnerSide));

  if (penaltyText) {
    if (currentLanguage === "zh") {
      return `${winnerName}在 ${scoreText} 战平后通过点球 ${penaltyText} 击败 ${loserName}。`;
    }

    return `${winnerName} beat ${loserName} on penalties after a ${scoreText} tie (${penaltyText} pens).`;
  }

  if (currentLanguage === "zh") {
    return `${winnerName}以 ${winnerScoreText} 击败 ${loserName}。`;
  }

  return `${winnerName} beat ${loserName} ${winnerScoreText}.`;
}

function renderKnockoutSourceMatchSummary(match, context) {
  if (!match) {
    return escapeHtml(localizeText("No loaded source matches yet."));
  }

  if (match.status === "FT") {
    return renderKnockoutCompletedSummary(match, context);
  }

  const matchup = renderKnockoutMatchupLabel(match, context);
  const scoreText = escapeHtml(formatScorePair(match.score));

  if (match.status === "LIVE" && scoreText) {
    if (currentLanguage === "zh") {
      return `${matchup} 正在进行，比分 ${scoreText}。`;
    }

    return `${matchup} is live at ${scoreText}.`;
  }

  if (isKnockoutMatchupPredicted(match, context)) {
    if (currentLanguage === "zh") {
      return `${matchup} 是当前预测。`;
    }

    return `${matchup} is predicted.`;
  }

  if (currentLanguage === "zh") {
    return `${matchup} 尚未开赛。`;
  }

  return `${matchup} is scheduled.`;
}

function renderResolvedNextKnockoutOpponentLine(match, context) {
  if (!match || match.status !== "FT") {
    return "";
  }

  const participants = getTournamentMatchParticipants(match, context);
  const winner = getTournamentMatchWinnerTeam(match, context);

  if (!winner) {
    return "";
  }

  const winnerSide = getTournamentParticipantSide(participants, winner) || getTournamentScoreWinnerSide(match);
  const fallbackWinnerName = renderKnockoutContextTeamName(winner, getTournamentTeamDisplayName(winner), {
    showRank: true,
    isSubject: true
  });

  if (!winnerSide || !participants[winnerSide]) {
    return currentLanguage === "zh" ? `胜者将对阵 ${fallbackWinnerName}。` : `Winner will face ${fallbackWinnerName}.`;
  }

  const loserSide = winnerSide === "away" ? "home" : "away";
  const winnerName = renderKnockoutParticipantLabel(participants[winnerSide], {
    showRank: true,
    isSubject: true
  });
  const loserName = renderKnockoutParticipantLabel(participants[loserSide], { showRank: true });
  const scoreText = escapeHtml(formatScorePair(match.score));
  const winnerScoreText = escapeHtml(getKnockoutScorePairForSide(match, winnerSide));
  const penaltyText = escapeHtml(getKnockoutPenaltyPairForSide(match, winnerSide));

  if (penaltyText && scoreText) {
    return currentLanguage === "zh"
      ? `胜者将对阵 ${winnerName}，后者在 ${scoreText} 战平后通过点球 ${penaltyText} 击败 ${loserName}。`
      : `Winner will face ${winnerName} who won ${penaltyText} on penalties after a ${scoreText} tie against ${loserName}.`;
  }

  if (winnerScoreText) {
    return currentLanguage === "zh"
      ? `胜者将对阵 ${winnerName}，后者以 ${winnerScoreText} 击败 ${loserName}。`
      : `Winner will face ${winnerName} who won ${winnerScoreText} against ${loserName}.`;
  }

  return currentLanguage === "zh" ? `胜者将对阵 ${winnerName}。` : `Winner will face ${winnerName}.`;
}

function isTerminalKnockoutMatch(match) {
  return match?.stage === "final" || match?.stage === "bronze-final";
}

function getPreviousKnockoutStageLabel(match, sourceMatches) {
  const sourceStage = sourceMatches.find((sourceMatch) => sourceMatch?.stage)?.stage;
  if (sourceStage) {
    return getTournamentStageLabel(sourceStage);
  }

  const currentIndex = TOURNAMENT_PROGRESS_ROUNDS.findIndex((round) => round.id === match.stage);
  const previousRound = TOURNAMENT_PROGRESS_ROUNDS[currentIndex - 1];
  return previousRound ? getTournamentStageLabel(previousRound.id) : localizeText("Knockout context");
}

function formatKnockoutContextHeading(label, stageLabel) {
  return currentLanguage === "zh" ? `${label}：${stageLabel}` : `${label}: ${stageLabel}`;
}

function renderLaterKnockoutPathContext(match, context) {
  const sourceMatchNumbers = getTournamentWinnerSourceMatchNumbers(match);
  const sourceMatches = sourceMatchNumbers.map(getTournamentFixtureByMatchNumber).filter(Boolean);
  const heading = formatKnockoutContextHeading(
    localizeText("Previous"),
    getPreviousKnockoutStageLabel(match, sourceMatches)
  );
  const rows = sourceMatches.length
    ? sourceMatches
        .map((sourceMatch) => `<li>${renderKnockoutSourceMatchSummary(sourceMatch, context)}</li>`)
        .join("")
    : `<li>${escapeHtml(localizeText("No loaded source matches yet."))}</li>`;

  return `
    <section class="info-block match-previous-block has-section-divider">
      <h3>${escapeHtml(heading)}</h3>
      <ul class="result-highlights knockout-context-list">
        ${rows}
      </ul>
    </section>
  `;
}

function renderNextKnockoutOpponentLine(match, nextMatch, context) {
  const currentWinnerSlot = `Winner match ${Number(match.matchNumber)}`;
  const otherSlot =
    nextMatch.homeSlot === currentWinnerSlot
      ? nextMatch.awaySlot
      : nextMatch.awaySlot === currentWinnerSlot
        ? nextMatch.homeSlot
        : "";
  const otherSourceMatchNumber = parseTournamentWinnerSource(otherSlot);

  if (otherSourceMatchNumber) {
    const otherMatch = getTournamentFixtureByMatchNumber(otherSourceMatchNumber);
    const resolvedLine = renderResolvedNextKnockoutOpponentLine(otherMatch, context);
    if (resolvedLine) {
      return resolvedLine;
    }

    const matchup = renderKnockoutMatchupLabel(otherMatch, context);
    if (isTournamentProjectedMatch(otherMatch, context)) {
      return currentLanguage === "zh"
        ? `胜者将对阵 ${matchup} 的预测胜者。`
        : `Winner will face predicted winner of ${matchup}.`;
    }

    return currentLanguage === "zh"
      ? `胜者将对阵 ${matchup} 的胜者。`
      : `Winner will face winner of ${matchup}.`;
  }

  if (otherSlot) {
    return currentLanguage === "zh"
      ? `胜者将对阵 ${escapeHtml(localizeText(otherSlot))}。`
      : `Winner will face ${escapeHtml(localizeText(otherSlot))}.`;
  }

  const nextStage = escapeHtml(getTournamentStageLabel(nextMatch.stage));
  return currentLanguage === "zh"
    ? `胜者将进入${nextStage}。`
    : `Winner moves into ${nextStage}.`;
}

function renderNextKnockoutContext(match, context) {
  if (isTerminalKnockoutMatch(match)) {
    return "";
  }

  const nextMatchNumber = getTournamentNextMatchNumber(match.matchNumber);
  const nextMatch = getTournamentFixtureByMatchNumber(nextMatchNumber);

  if (!nextMatch) {
    return `
      <section class="info-block">
        <h3>${escapeHtml(localizeText("Round path"))}</h3>
        <p class="past-empty">${escapeHtml(localizeText("No next knockout match is loaded yet."))}</p>
      </section>
    `;
  }

  const nextStage = getTournamentStageLabel(nextMatch.stage);
  const heading = formatKnockoutContextHeading(localizeText("Next"), nextStage);

  return `
    <section class="info-block">
      <h3>${escapeHtml(heading)}</h3>
      <p class="past-empty knockout-next-line">${renderNextKnockoutOpponentLine(match, nextMatch, context)}</p>
    </section>
  `;
}

function renderKnockoutContext(match, context = createTournamentProgressionContext()) {
  const pathContext =
    match.stage === "round-of-32"
      ? renderRoundOf32PathContext(match, context)
      : renderLaterKnockoutPathContext(match, context);

  return `
    ${pathContext}
    ${renderNextKnockoutContext(match, context)}
  `;
}

function renderMatchContext(match, context = null) {
  if (match.stage === "group") {
    const group = getGroup(match.groupId);
    const thirdPlaceRaceByTeamId = getThirdPlaceRaceByTeamId();
    return `
      <section class="info-block">
        <h3>${escapeHtml(localizeText("Group standings"))}</h3>
        ${renderStandings(match.groupId, { thirdPlaceRaceByTeamId })}
        <p class="data-note">${escapeHtml(localizeText("Shown in current table order. Group ties use FIFA head-to-head before overall goal difference."))}</p>
      </section>
    `;
  }

  return renderKnockoutContext(match, context || createTournamentProgressionContext());
}

function revealMatchInfoOnSmallScreens() {
  if (!window.matchMedia("(max-width: 1160px)").matches) {
    return;
  }

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  window.requestAnimationFrame(() => {
    matchInfo.scrollIntoView({
      block: "start",
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });
  });
}

function formatScorePair(pair) {
  if (!pair || !Number.isFinite(Number(pair.home)) || !Number.isFinite(Number(pair.away))) {
    return "";
  }

  return `${pair.home}-${pair.away}`;
}

function renderHistoricalScoreDetails(match) {
  const details = match.scoreDetails || {};
  const rows = [
    { label: "Final", value: formatScorePair(match.score) },
    { label: "Half-time", value: formatScorePair(details.halfTime) },
    { label: "After extra time", value: formatScorePair(details.extraTime) },
    { label: "Penalties", value: formatScorePair(details.penalties) }
  ].filter((row) => row.value);

  if (match.status === "CANCELLED") {
    rows.push({ label: "Status", value: "Cancelled" });
  }

  if (!rows.length) {
    return `<p class="past-empty">${escapeHtml(localizeText("Score details are not loaded for this historical record."))}</p>`;
  }

  return `
    <dl class="historical-facts">
      ${rows
        .map(
          (row) => `
            <div>
              <dt>${escapeHtml(localizeText(row.label))}</dt>
              <dd>${escapeHtml(localizeText(row.value))}</dd>
            </div>
          `
        )
        .join("")}
    </dl>
  `;
}

function formatGoalMinute(goal) {
  if (!Number.isFinite(Number(goal.minute))) {
    return "";
  }

  const offset = Number.isFinite(Number(goal.offset)) ? `+${goal.offset}` : "";
  return `${goal.minute}${offset}'`;
}

function formatGoalNote(goal) {
  return [
    goal.penalty ? localizeText("pen.") : "",
    goal.ownGoal ? localizeText("own goal") : ""
  ]
    .filter(Boolean)
    .join(", ");
}

function getHistoricalFixtureGoals(match) {
  return [
    ...(match.goalsHome || []).map((goal) => ({ ...goal, side: "home", team: match.homeTeam })),
    ...(match.goalsAway || []).map((goal) => ({ ...goal, side: "away", team: match.awayTeam }))
  ]
    .filter((goal) => typeof goal?.name === "string" && goal.name.trim())
    .sort((a, b) => {
      const aMinute = Number.isFinite(Number(a.minute)) ? Number(a.minute) : 0;
      const bMinute = Number.isFinite(Number(b.minute)) ? Number(b.minute) : 0;
      const aOffset = Number.isFinite(Number(a.offset)) ? Number(a.offset) : 0;
      const bOffset = Number.isFinite(Number(b.offset)) ? Number(b.offset) : 0;
      return aMinute - bMinute || aOffset - bOffset;
    });
}

function renderHistoricalGoalScorerSegment(match, goal) {
  const minute = formatGoalMinute(goal);
  const note = formatGoalNote(goal);
  const name = goal.name ? localizeHistoricalScorerName(goal.name) : localizeText("Unknown scorer");
  const player = getHistoricalGoalPlayer(match, goal);

  return `
    <span class="goal-scorer-segment">
      ${renderGoalScorerFlag(goal)}
      ${minute ? `<span class="goal-minute">${escapeHtml(minute)}</span>` : ""}
      ${renderPlayerMention(name, player)}
      ${note ? `<em>${escapeHtml(note)}</em>` : ""}
    </span>
  `;
}

function renderHistoricalScoringDetailsHighlight(match) {
  const goals = getHistoricalFixtureGoals(match);
  if (!goals.length) {
    return "";
  }

  return `
    <li class="scorer-highlight" aria-label="${escapeHtml(localizeText("Goals"))}">
      <span class="goal-scorer-list">
        ${goals.map((goal) => renderHistoricalGoalScorerSegment(match, goal)).join('<span class="goal-separator">•</span>')}
      </span>
    </li>
  `;
}

function renderHistoricalGoals(match) {
  const hasGoals = match.goalsHome?.length || match.goalsAway?.length;

  if (!hasGoals && match.status === "CANCELLED") {
    return `<p class="past-empty">${escapeHtml(localizeText("No goals because this match was cancelled."))}</p>`;
  }

  const scoringHighlight = renderHistoricalScoringDetailsHighlight(match);
  return scoringHighlight
    ? `<ul class="result-highlights historical-result-highlights">${scoringHighlight}</ul>`
    : `<p class="past-empty">${escapeHtml(localizeText("No scorer data loaded."))}</p>`;
}

function getHistoricalContextLabel(match) {
  return [match.tournamentName, match.group || match.round]
    .filter(Boolean)
    .map(localizeText)
    .join(" / ");
}

function getLocalizedHistoricalTeamName(teamName) {
  return localizeText(teamName || "");
}

function getHistoricalDateText(match) {
  const dateText = dateFormatter.format(getDateFromKey(match.date));
  if (!match.localTime) {
    return dateText;
  }

  const timeText = getHistoricalTournamentTimeLabel(match);
  return currentLanguage === "zh"
    ? `${dateText} 当地时间 ${timeText}`
    : `${dateText} at ${timeText} local time`;
}

function getHistoricalTournamentFixtures(match) {
  return historicalFixtures
    .filter((fixture) => fixture.tournamentYear === match.tournamentYear)
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)));
}

function getHistoricalScoreNote(match) {
  const penalties = match.scoreDetails?.penalties;

  if (!penalties) {
    return "";
  }

  return `${penalties.home}-${penalties.away} ${localizeText("pens")}`;
}

function getHistoricalScoreText(match) {
  const score = formatScorePair(match.score);
  const note = getHistoricalScoreNote(match);

  if (!score) {
    return localizeText(match.status === "CANCELLED" ? "cancelled" : "score unavailable");
  }

  return note ? `${score} (${note})` : score;
}

function getHistoricalScorePairForTeam(match, teamName) {
  const score = match.score;

  if (!score) {
    return null;
  }

  return teamName === match.awaySlot
    ? { home: score.away, away: score.home }
    : { home: score.home, away: score.away };
}

function getHistoricalPenaltyPairForTeam(match, teamName) {
  const penalties = match.scoreDetails?.penalties;

  if (!penalties) {
    return null;
  }

  return teamName === match.awaySlot
    ? { home: penalties.away, away: penalties.home }
    : { home: penalties.home, away: penalties.away };
}

function getHistoricalTeamScoreText(match, teamName) {
  const score = formatScorePair(getHistoricalScorePairForTeam(match, teamName));
  const penalties = formatScorePair(getHistoricalPenaltyPairForTeam(match, teamName));

  if (!score) {
    return localizeText(match.status === "CANCELLED" ? "cancelled" : "score unavailable");
  }

  return penalties ? `${score} (${penalties} ${localizeText("pens")})` : score;
}

function getHistoricalScoreResultText(match, teamName) {
  const score = formatScorePair(getHistoricalScorePairForTeam(match, teamName));
  const penalties = formatScorePair(getHistoricalPenaltyPairForTeam(match, teamName));

  if (!score) {
    return localizeText(match.status === "CANCELLED" ? "cancelled" : "score unavailable");
  }

  if (penalties) {
    if (currentLanguage === "zh") {
      return `常规/加时${score}战平，点球${penalties}`;
    }

    return `on penalties after a ${score} tie (${penalties} in the shootout)`;
  }

  if (match.scoreDetails?.extraTime) {
    if (currentLanguage === "zh") {
      return `${score}（加时后）`;
    }

    return `${score} after extra time`;
  }

  return score;
}

function getHistoricalOpponent(match, teamName) {
  return match.homeSlot === teamName ? match.awaySlot : match.homeSlot;
}

function getHistoricalWinner(match) {
  if (match.winner) {
    return match.winner;
  }

  const penaltyWinnerSide = getScoreWinnerSide(
    match.scoreDetails?.penalties?.home,
    match.scoreDetails?.penalties?.away
  );

  if (penaltyWinnerSide) {
    return penaltyWinnerSide === "home" ? match.homeSlot : match.awaySlot;
  }

  const home = Number(match.score?.home);
  const away = Number(match.score?.away);

  if (!Number.isFinite(home) || !Number.isFinite(away) || home === away) {
    return "";
  }

  return home > away ? match.homeSlot : match.awaySlot;
}

function initializeHistoricalStanding(rows, teamName) {
  if (!rows.has(teamName)) {
    rows.set(teamName, {
      draws: 0,
      ga: 0,
      gd: 0,
      gf: 0,
      losses: 0,
      played: 0,
      points: 0,
      sourceOrder: rows.size,
      teamName,
      wins: 0
    });
  }

  return rows.get(teamName);
}

function getHistoricalGroupStandings(match) {
  return getHistoricalGroupStandingsForYear(match.tournamentYear, match.group);
}

function renderHistoricalGroupStandings(match) {
  const rows = getHistoricalGroupStandings(match);

  if (!rows.length) {
    return `
      <section class="info-block">
        <h3>${escapeHtml(localizeText("Group standings"))}</h3>
        <p class="past-empty">${escapeHtml(localizeText("Group table data is not available for this archived match."))}</p>
      </section>
    `;
  }

  return `
    <section class="info-block">
      <h3>${escapeHtml(localizeText("Group standings"))}</h3>
      <table class="standings-table">
        ${renderStandingsTableHead()}
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr class="${shouldHighlightHistoricalStanding(row, match.tournamentYear, match.group) ? "is-advancing" : ""}">
                  <td>
                    ${renderHistoricalStandingTeam(row.teamName)}
                  </td>
                  <td>${escapeHtml(row.points)}</td>
                  <td>${escapeHtml(row.wins)}-${escapeHtml(row.draws)}-${escapeHtml(row.losses)}</td>
                  <td>${escapeHtml(formatGoalDifference(row.gd))}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
      <p class="data-note">${escapeHtml(localizeText("Final group table computed from archived match results."))}</p>
    </section>
  `;
}

function getHistoricalFinalRoundStandings(match) {
  return getHistoricalRoundStandingsForYear(match.tournamentYear, normalizeHistoricalTournamentRoundLabel(match.round));
}

function renderHistoricalFinalRoundStandings(match) {
  const rows = getHistoricalFinalRoundStandings(match);

  if (!rows.length) {
    return `
      <section class="info-block">
        <h3>${escapeHtml(localizeText("Final round standings"))}</h3>
        <p class="past-empty">${escapeHtml(localizeText("Final round table data is not available for this archived match."))}</p>
      </section>
    `;
  }

  return `
    <section class="info-block">
      <h3>${escapeHtml(localizeText("Final round standings"))}</h3>
      <table class="standings-table">
        ${renderStandingsTableHead()}
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  <td>
                    ${renderHistoricalStandingTeam(row.teamName)}
                  </td>
                  <td>${escapeHtml(row.points)}</td>
                  <td>${escapeHtml(row.wins)}-${escapeHtml(row.draws)}-${escapeHtml(row.losses)}</td>
                  <td>${escapeHtml(formatGoalDifference(row.gd))}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
      <p class="data-note">${escapeHtml(localizeText("Final round table computed from archived match results."))}</p>
    </section>
  `;
}

function getHistoricalDisplayTeam(teamName) {
  const name = String(teamName || "").trim();
  return (
    getHistoricalTeam(name) || {
      id: `history-${normalizeTextKey(name).replace(/\s+/g, "-") || "team"}`,
      name,
      officialName: name,
      standingName: name,
      fifaRank: null
    }
  );
}

function renderHistoricalKnockoutTeamName(teamName, options = {}) {
  const team = getHistoricalDisplayTeam(teamName);
  return renderKnockoutContextTeamName(team, getTournamentTeamDisplayName(team), options);
}

function getHistoricalTeamResultOutcome(fixture, teamName) {
  const pair = getHistoricalScorePairForTeam(fixture, teamName);
  const teamScore = Number(pair?.home);
  const opponentScore = Number(pair?.away);

  if (!Number.isFinite(teamScore) || !Number.isFinite(opponentScore)) {
    return "";
  }

  if (teamScore > opponentScore) {
    return "win";
  }

  if (teamScore < opponentScore) {
    return "loss";
  }

  return "draw";
}

function getHistoricalPriorGroupFixturesForTeam(match, teamName) {
  return getHistoricalTournamentFixtures(match)
    .filter(
      (fixture) =>
        fixture.group &&
        getFixtureSortValue(fixture) < getFixtureSortValue(match) &&
        (fixture.homeSlot === teamName || fixture.awaySlot === teamName)
    )
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)));
}

function getHistoricalGroupRoundSummaryForTeam(match, teamName) {
  const team = getHistoricalDisplayTeam(teamName);
  const groupFixtures = getHistoricalPriorGroupFixturesForTeam(match, teamName);
  const resultItems = groupFixtures
    .filter((fixture) => fixture.status === "FT" && fixture.score)
    .map((fixture) => {
      const opponentName = getHistoricalOpponent(fixture, teamName);
      return {
        opponent: getHistoricalDisplayTeam(opponentName),
        outcome: getHistoricalTeamResultOutcome(fixture, teamName),
        scoreText: formatScorePair(getHistoricalScorePairForTeam(fixture, teamName))
      };
    })
    .filter((item) => item.outcome && item.scoreText);
  const remainingCount = groupFixtures.filter((fixture) => fixture.status !== "FT").length;

  return formatGroupRoundSummary(team, resultItems, remainingCount);
}

function getHistoricalGroupRoundContextRows(match) {
  return [match.homeSlot, match.awaySlot]
    .filter((teamName) => getHistoricalPriorGroupFixturesForTeam(match, teamName).length > 0)
    .map((teamName) => `<li>${getHistoricalGroupRoundSummaryForTeam(match, teamName)}</li>`);
}

function getHistoricalPreviousKnockoutMatchForTeam(match, teamName) {
  const currentSortValue = getFixtureSortValue(match);
  return getHistoricalTournamentFixtures(match)
    .filter(
      (fixture) =>
        isHistoricalKnockoutBracketFixture(fixture) &&
        getFixtureSortValue(fixture) < currentSortValue &&
        (fixture.homeSlot === teamName || fixture.awaySlot === teamName)
    )
    .sort((a, b) => getFixtureSortValue(b).localeCompare(getFixtureSortValue(a)))[0];
}

function getHistoricalPreviousKnockoutMatches(match) {
  const fixturesById = new Map();
  [match.homeSlot, match.awaySlot].forEach((teamName) => {
    const fixture = getHistoricalPreviousKnockoutMatchForTeam(match, teamName);
    if (fixture) {
      fixturesById.set(fixture.id, fixture);
    }
  });
  return [...fixturesById.values()];
}

function getHistoricalRoundLabelSeries(fixtures, fallback = "Round path") {
  const labels = [
    ...new Map(
      fixtures
        .map((fixture) => normalizeHistoricalTournamentRoundLabel(fixture.round))
        .filter(Boolean)
        .map((label) => [label, localizeText(label)])
    ).values()
  ];

  if (!labels.length) {
    return localizeText(fallback);
  }

  return currentLanguage === "zh" ? labels.join(" / ") : labels.join(" / ");
}

function renderHistoricalKnockoutCompletedSummary(match) {
  const scoreText = escapeHtml(formatScorePair(match.score));
  const winner = getHistoricalWinner(match);

  if (!scoreText) {
    return `${renderHistoricalKnockoutTeamName(match.homeSlot, { showRank: true })} ${escapeHtml(
      localizeText("vs")
    )} ${renderHistoricalKnockoutTeamName(match.awaySlot, { showRank: true })}`;
  }

  if (!winner) {
    const homeName = renderHistoricalKnockoutTeamName(match.homeSlot, { showRank: true });
    const awayName = renderHistoricalKnockoutTeamName(match.awaySlot, { showRank: true });
    return currentLanguage === "zh"
      ? `${homeName} 和 ${awayName} 以 ${scoreText} 战平。`
      : `${homeName} and ${awayName} tied ${scoreText}.`;
  }

  const loser = getHistoricalOpponent(match, winner);
  const winnerName = renderHistoricalKnockoutTeamName(winner, { showRank: true, isSubject: true });
  const loserName = renderHistoricalKnockoutTeamName(loser);
  const winnerScoreText = escapeHtml(formatScorePair(getHistoricalScorePairForTeam(match, winner)));
  const penaltyText = escapeHtml(formatScorePair(getHistoricalPenaltyPairForTeam(match, winner)));

  if (penaltyText) {
    return currentLanguage === "zh"
      ? `${winnerName}在 ${scoreText} 战平后通过点球 ${penaltyText} 击败 ${loserName}。`
      : `${winnerName} beat ${loserName} on penalties after a ${scoreText} tie (${penaltyText} pens).`;
  }

  return currentLanguage === "zh"
    ? `${winnerName}以 ${winnerScoreText} 击败 ${loserName}。`
    : `${winnerName} beat ${loserName} ${winnerScoreText}.`;
}

function renderHistoricalPreviousKnockoutContext(match) {
  const previousMatches = getHistoricalPreviousKnockoutMatches(match);
  const groupRows = previousMatches.length ? [] : getHistoricalGroupRoundContextRows(match);

  if (!previousMatches.length && !groupRows.length) {
    return "";
  }

  const heading = formatKnockoutContextHeading(
    localizeText("Previous"),
    previousMatches.length ? getHistoricalRoundLabelSeries(previousMatches) : localizeText("Group round")
  );
  const rows = previousMatches.length
    ? previousMatches.map((fixture) => `<li>${renderHistoricalKnockoutCompletedSummary(fixture)}</li>`)
    : groupRows;

  return `
    <section class="info-block match-previous-block has-section-divider">
      <h3>${escapeHtml(heading)}</h3>
      <ul class="result-highlights knockout-context-list">
        ${rows.join("")}
      </ul>
    </section>
  `;
}

function getHistoricalNextMatchForTeam(match, teamName) {
  const currentSortValue = getFixtureSortValue(match);
  return getHistoricalTournamentFixtures(match).find(
    (fixture) =>
      isHistoricalKnockoutBracketFixture(fixture) &&
      getFixtureSortValue(fixture) > currentSortValue &&
      (fixture.homeSlot === teamName || fixture.awaySlot === teamName)
  );
}

function hasSameHistoricalFixtureTeams(fixture, teamA, teamB) {
  const fixtureTeams = [fixture?.homeSlot, fixture?.awaySlot].map((teamName) => String(teamName || "").trim()).sort();
  const targetTeams = [teamA, teamB].map((teamName) => String(teamName || "").trim()).sort();
  return fixtureTeams[0] && fixtureTeams[0] === targetTeams[0] && fixtureTeams[1] === targetTeams[1];
}

function getHistoricalReplayMatch(match) {
  if (getHistoricalWinner(match) || !match.homeSlot || !match.awaySlot) {
    return null;
  }

  const currentSortValue = getFixtureSortValue(match);
  return (
    getHistoricalTournamentFixtures(match).find(
      (fixture) =>
        isHistoricalKnockoutBracketFixture(fixture) &&
        getFixtureSortValue(fixture) > currentSortValue &&
        hasSameHistoricalFixtureTeams(fixture, match.homeSlot, match.awaySlot)
    ) || null
  );
}

function getHistoricalAdvancedNextEntries(match) {
  if (match.status !== "CANCELLED") {
    return [];
  }

  return [match.homeSlot, match.awaySlot]
    .filter(Boolean)
    .map((teamName) => ({
      fixture: getHistoricalNextMatchForTeam(match, teamName),
      kind: "advanced",
      teamName
    }))
    .filter((entry, index, entries) => {
      if (!entry.fixture) {
        return false;
      }
      return entries.findIndex((candidate) => candidate.teamName === entry.teamName && candidate.fixture?.id === entry.fixture.id) === index;
    });
}

function getHistoricalNextPathEntries(match) {
  const winner = getHistoricalWinner(match);

  if (!winner) {
    return [];
  }

  const loser = getHistoricalOpponent(match, winner);
  return [
    { fixture: getHistoricalNextMatchForTeam(match, winner), kind: "winner", teamName: winner },
    { fixture: getHistoricalNextMatchForTeam(match, loser), kind: "loser", teamName: loser }
  ].filter((entry, index, entries) => {
    if (!entry.fixture) {
      return false;
    }
    return entries.findIndex((candidate) => candidate.kind === entry.kind && candidate.fixture?.id === entry.fixture.id) === index;
  });
}

function renderHistoricalReplayNextLine(replayMatch) {
  const summary = renderHistoricalKnockoutCompletedSummary(replayMatch);

  return currentLanguage === "zh" ? `随后进行了重赛：${summary}` : `Replay followed: ${summary}`;
}

function renderHistoricalAdvancedNextLine(entry) {
  const opponentName = getHistoricalOpponent(entry.fixture, entry.teamName);
  const clause = getHistoricalOpponentQualificationClause(entry.fixture, opponentName);
  const teamName = renderHistoricalKnockoutTeamName(entry.teamName, { showRank: true });

  if (currentLanguage === "zh") {
    return `${teamName}随后晋级对阵${clause}。`;
  }

  return `${teamName} advanced to face${clause}.`;
}

function getHistoricalOpponentQualificationClause(nextMatch, opponentName) {
  const sourceMatch = getHistoricalPreviousKnockoutMatchForTeam(nextMatch, opponentName);
  const sourceWinner = sourceMatch ? getHistoricalWinner(sourceMatch) : "";
  const opponent = renderHistoricalKnockoutTeamName(opponentName, {
    showRank: true,
    isSubject: sourceWinner === opponentName
  });
  if (!sourceMatch) {
    return currentLanguage === "zh" ? opponent : ` ${opponent}`;
  }

  const otherName = renderHistoricalKnockoutTeamName(getHistoricalOpponent(sourceMatch, opponentName));
  const scoreText = escapeHtml(formatScorePair(sourceMatch.score));
  const teamScoreText = escapeHtml(formatScorePair(getHistoricalScorePairForTeam(sourceMatch, opponentName)));
  const penaltyText = escapeHtml(formatScorePair(getHistoricalPenaltyPairForTeam(sourceMatch, opponentName)));

  if (!scoreText) {
    return currentLanguage === "zh" ? opponent : ` ${opponent}`;
  }

  if (penaltyText) {
    if (sourceWinner === opponentName) {
      return currentLanguage === "zh"
        ? `${opponent}，后者在 ${scoreText} 战平后通过点球 ${penaltyText} 击败 ${otherName}`
        : ` ${opponent} who won ${penaltyText} on penalties after a ${scoreText} tie against ${otherName}`;
    }

    return currentLanguage === "zh"
      ? `${opponent}，后者在 ${scoreText} 战平后通过点球 ${penaltyText} 不敌 ${otherName}`
      : ` ${opponent} who lost ${penaltyText} on penalties after a ${scoreText} tie to ${otherName}`;
  }

  if (sourceWinner === opponentName) {
    return currentLanguage === "zh"
      ? `${opponent}，后者以 ${teamScoreText} 击败 ${otherName}`
      : ` ${opponent} who won ${teamScoreText} against ${otherName}`;
  }

  return currentLanguage === "zh"
    ? `${opponent}，后者以 ${teamScoreText} 不敌 ${otherName}`
    : ` ${opponent} who lost ${teamScoreText} to ${otherName}`;
}

function renderHistoricalNextPathLine(entry) {
  const opponentName = getHistoricalOpponent(entry.fixture, entry.teamName);
  const clause = getHistoricalOpponentQualificationClause(entry.fixture, opponentName);

  if (currentLanguage === "zh") {
    return `${entry.kind === "winner" ? "胜者" : "败者"}随后对阵${clause}。`;
  }

  return `${entry.kind === "winner" ? "Winner" : "Loser"} faced${clause}.`;
}

function renderHistoricalNextKnockoutContext(match) {
  if (isHistoricalFinalRoundLabel(match.round) || isHistoricalThirdPlaceRoundLabel(match.round)) {
    return "";
  }

  const replayMatch = getHistoricalReplayMatch(match);
  if (replayMatch) {
    const heading = formatKnockoutContextHeading(localizeText("Next"), getHistoricalRoundLabelSeries([replayMatch]));

    return `
      <section class="info-block">
        <h3>${escapeHtml(heading)}</h3>
        <p class="past-empty knockout-next-line">${renderHistoricalReplayNextLine(replayMatch)}</p>
      </section>
    `;
  }

  const advancedEntries = getHistoricalAdvancedNextEntries(match);
  if (advancedEntries.length) {
    const heading = formatKnockoutContextHeading(
      localizeText("Next"),
      getHistoricalRoundLabelSeries(advancedEntries.map((entry) => entry.fixture))
    );
    const lines = advancedEntries.map(renderHistoricalAdvancedNextLine);

    return `
      <section class="info-block">
        <h3>${escapeHtml(heading)}</h3>
        ${
          lines.length === 1
            ? `<p class="past-empty knockout-next-line">${lines[0]}</p>`
            : `<ul class="result-highlights knockout-context-list">${lines
                .map((line) => `<li>${line}</li>`)
                .join("")}</ul>`
        }
      </section>
    `;
  }

  const entries = getHistoricalNextPathEntries(match);
  if (!entries.length) {
    return "";
  }

  const heading = formatKnockoutContextHeading(
    localizeText("Next"),
    getHistoricalRoundLabelSeries(entries.map((entry) => entry.fixture))
  );
  const lines = entries.map(renderHistoricalNextPathLine);

  return `
    <section class="info-block">
      <h3>${escapeHtml(heading)}</h3>
      ${
        lines.length === 1
          ? `<p class="past-empty knockout-next-line">${lines[0]}</p>`
          : `<ul class="result-highlights knockout-context-list">${lines
              .map((line) => `<li>${line}</li>`)
              .join("")}</ul>`
      }
    </section>
  `;
}

function renderHistoricalKnockoutContext(match) {
  return `
    ${renderHistoricalPreviousKnockoutContext(match)}
    ${renderHistoricalNextKnockoutContext(match)}
  `;
}

function renderHistoricalContext(match) {
  if (match.group) {
    return renderHistoricalGroupStandings(match);
  }

  if (isHistoricalFinalRoundPoolLabel(match.round)) {
    return renderHistoricalFinalRoundStandings(match);
  }

  return renderHistoricalKnockoutContext(match);
}

function getNextHistoricalMatchForTeam(match, teamName) {
  return getHistoricalTournamentFixtures(match).find(
    (fixture) =>
      getFixtureSortValue(fixture) > getFixtureSortValue(match) &&
      (fixture.homeSlot === teamName || fixture.awaySlot === teamName)
  );
}

function getHistoricalTeamKeyHeadline(match, teamName) {
  const localizedTeamName = getLocalizedHistoricalTeamName(teamName);

  if (match.status === "CANCELLED") {
    if (currentLanguage === "zh") {
      return `${localizedTeamName}：比赛取消`;
    }

    return `${teamName}: match cancelled`;
  }

  const winner = getHistoricalWinner(match);
  const scoreText = getHistoricalTeamScoreText(match, teamName);
  const penalties = match.scoreDetails?.penalties;

  if (!winner) {
    if (currentLanguage === "zh") {
      return `${localizedTeamName}：战平 ${scoreText}`;
    }

    return `${teamName}: tied ${scoreText}`;
  }

  if (penalties) {
    if (currentLanguage === "zh") {
      return winner === teamName
        ? `${localizedTeamName}：点球取胜，${scoreText}`
        : `${localizedTeamName}：点球落败，${scoreText}`;
    }

    return winner === teamName
      ? `${teamName}: won on pens, ${scoreText}`
      : `${teamName}: lost on pens, ${scoreText}`;
  }

  if (currentLanguage === "zh") {
    return winner === teamName
      ? `${localizedTeamName}：获胜 ${scoreText}`
      : `${localizedTeamName}：失利 ${scoreText}`;
  }

  return winner === teamName ? `${teamName}: won ${scoreText}` : `${teamName}: lost ${scoreText}`;
}

function getHistoricalTeamGoals(match, teamName) {
  return teamName === match.homeSlot ? match.goalsHome || [] : match.goalsAway || [];
}

function formatHistoricalGoalName(goal) {
  const name = goal.name
    ? currentLanguage === "zh"
      ? localizeHistoricalScorerName(goal.name)
      : goal.name
    : currentLanguage === "zh"
      ? "对手"
      : "an opponent";

  if (goal.ownGoal) {
    return currentLanguage === "zh" ? `${name}乌龙` : `${name} own goal`;
  }

  return name || localizeText("Unknown scorer");
}

function formatHistoricalScorerSeries(items) {
  if (!items.length) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (currentLanguage === "zh") {
    return items.join("、");
  }

  if (items.length === 2) {
    return items.join(" and ");
  }

  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function formatHistoricalScorerCount(name, count) {
  if (currentLanguage === "zh") {
    if (count >= 3) {
      return `${name}上演帽子戏法`;
    }

    if (count === 2) {
      return `${name}梅开二度`;
    }

    return `${name}破门`;
  }

  if (count >= 3) {
    return `${name} scored a hat trick`;
  }

  if (count === 2) {
    return `${name} scored twice`;
  }

  return `${name} scored`;
}

function getHistoricalScorerText(goals = []) {
  if (!goals.length) {
    return "";
  }

  const scorers = new Map();
  const ownGoals = [];

  for (const goal of goals) {
    if (goal.ownGoal) {
      ownGoals.push(formatHistoricalGoalName(goal));
      continue;
    }

    const name = goal.name
      ? currentLanguage === "zh"
        ? localizeHistoricalScorerName(goal.name)
        : goal.name
      : currentLanguage === "zh"
        ? "未知进球者"
        : "Unknown scorer";
    scorers.set(name, (scorers.get(name) || 0) + 1);
  }

  const scorerText = [...scorers.entries()].map(([name, count]) =>
    formatHistoricalScorerCount(name, count)
  );
  const ownGoalText = ownGoals.map((name) =>
    currentLanguage === "zh" ? `造成${name}` : `benefited from ${name}`
  );
  const scoringMoments = [...scorerText, ...ownGoalText];

  if (!scoringMoments.length) {
    return "";
  }

  return currentLanguage === "zh"
    ? `${formatHistoricalScorerSeries(scoringMoments)}。`
    : `${formatHistoricalScorerSeries(scoringMoments)}.`;
}

function getHistoricalScoringHighlight(match, teamName) {
  const scorerText = getHistoricalScorerText(getHistoricalTeamGoals(match, teamName));

  return scorerText ? `⚽ ${scorerText}` : "";
}

function getHistoricalDrawScoringHighlight(match) {
  const scoreText = getHistoricalScoreText(match);
  const homeScorers = getHistoricalScoringHighlight(match, match.homeTeam.name);
  const awayScorers = getHistoricalScoringHighlight(match, match.awayTeam.name);

  if (homeScorers && awayScorers) {
    return `${homeScorers} ${awayScorers.replace("⚽ ", "")}`;
  }

  if (homeScorers || awayScorers) {
    return homeScorers || awayScorers;
  }

  if (currentLanguage === "zh") {
    return `⚽ ${getLocalizedHistoricalTeamName(match.homeTeam.name)}和${getLocalizedHistoricalTeamName(match.awayTeam.name)}以 ${scoreText} 战平。`;
  }

  return `⚽ ${match.homeTeam.name} and ${match.awayTeam.name} finished level at ${scoreText}.`;
}

function getHistoricalResultOutcomeHighlight(match) {
  const winner = getHistoricalWinner(match);
  const scoreText = getHistoricalScoreText(match);

  if (match.status === "CANCELLED") {
    if (currentLanguage === "zh") {
      return `🚫 ${getLocalizedHistoricalTeamName(match.homeTeam.name)}对${getLocalizedHistoricalTeamName(match.awayTeam.name)}的比赛已取消。`;
    }

    return `🚫 ${match.homeTeam.name} vs ${match.awayTeam.name} was cancelled.`;
  }

  if (!winner) {
    if (currentLanguage === "zh") {
      return `🤝 ${getLocalizedHistoricalTeamName(match.homeTeam.name)}和${getLocalizedHistoricalTeamName(match.awayTeam.name)}以 ${scoreText} 战平。`;
    }

    return `🤝 ${match.homeTeam.name} and ${match.awayTeam.name} tied ${scoreText}.`;
  }

  const loser = winner === match.homeTeam.name ? match.awayTeam.name : match.homeTeam.name;
  const penalties = match.scoreDetails?.penalties;
  const winnerScoreText = formatScorePair(getHistoricalScorePairForTeam(match, winner));

  if (penalties) {
    if (currentLanguage === "zh") {
      return `🎯 ${getLocalizedHistoricalTeamName(winner)}在 ${formatScorePair(match.score)} 战平后通过点球击败${getLocalizedHistoricalTeamName(loser)}。`;
    }

    return `🎯 ${winner} beat ${loser} on penalties after a ${formatScorePair(match.score)} tie.`;
  }

  if (currentLanguage === "zh") {
    return `🏁 ${getLocalizedHistoricalTeamName(winner)}以 ${winnerScoreText || scoreText} 击败${getLocalizedHistoricalTeamName(loser)}。`;
  }

  return `🏁 ${winner} beat ${loser} ${winnerScoreText || scoreText}.`;
}

function getHistoricalFocusName(match, side) {
  const teamName = side === "home" ? match.homeTeam?.name : match.awayTeam?.name;
  const player = (match.keyPlayers?.[side] || []).find((item) => getPlayerName(item));
  const name = getPlayerName(player) || teamName || "";

  return currentLanguage === "zh"
    ? player
      ? localizeHistoricalScorerName(name)
      : getLocalizedHistoricalTeamName(name)
    : name;
}

function getHistoricalDrawControlHighlight(match) {
  const homeFocus = getHistoricalFocusName(match, "home");
  const awayFocus = getHistoricalFocusName(match, "away");
  const isScoreless = Number(match.score?.home) === 0 && Number(match.score?.away) === 0;

  if (currentLanguage === "zh") {
    return isScoreless
      ? `🌟 ${homeFocus}和${awayFocus}都没能打出突破。`
      : `🌟 ${homeFocus}和${awayFocus}互有回应，比分仍然持平。`;
  }

  return isScoreless
    ? `🌟 ${homeFocus} and ${awayFocus} carried the duel without a breakthrough.`
    : `🌟 ${homeFocus} and ${awayFocus} traded momentum without a winner.`;
}

function getHistoricalResultControlHighlight(match) {
  if (match.status === "CANCELLED") {
    if (currentLanguage === "zh") {
      return `📌 这场取消的比赛保留在${getHistoricalContextLabel(match)}存档中。`;
    }

    return `📌 The cancelled fixture remains in the ${match.tournamentName} archive.`;
  }

  const winner = getHistoricalWinner(match);
  const context = getHistoricalContextLabel(match);
  const penalties = match.scoreDetails?.penalties;
  const extraTime = match.scoreDetails?.extraTime;

  if (penalties) {
    if (currentLanguage === "zh") {
      return `🌟 点球大战决定了${context}。`;
    }

    return `🌟 The shootout decided ${context}.`;
  }

  if (extraTime) {
    if (currentLanguage === "zh") {
      return `🌟 ${winner ? getLocalizedHistoricalTeamName(winner) : "本场比赛"}加时取胜。`;
    }

    return `🌟 ${winner || "The match"} won after extra time.`;
  }

  if (winner) {
    const winnerScore = winner === match.homeTeam.name ? Number(match.score?.home) : Number(match.score?.away);
    const loserScore = winner === match.homeTeam.name ? Number(match.score?.away) : Number(match.score?.home);

    if (loserScore === 0) {
      if (currentLanguage === "zh") {
        return `🌟 ${getLocalizedHistoricalTeamName(winner)}完成零封。`;
      }

      return `🌟 ${winner} kept a clean sheet.`;
    }

    if (winnerScore - loserScore >= 3) {
      if (currentLanguage === "zh") {
        return `🌟 ${getLocalizedHistoricalTeamName(winner)}彻底打开局面。`;
      }

      return `🌟 ${winner} broke the match open.`;
    }

    if (currentLanguage === "zh") {
      return `🌟 ${getLocalizedHistoricalTeamName(winner)}守住了赛果。`;
    }

    return `🌟 ${winner} protected the result.`;
  }

  return getHistoricalDrawControlHighlight(match);
}

function getHistoricalResultProgressHighlight(match) {
  const context = getHistoricalContextLabel(match);

  if (match.status === "CANCELLED") {
    if (currentLanguage === "zh") {
      return `📊 这场取消的${context}比赛没有产生积分或晋级结果。`;
    }

    return `📊 No points or progression came from this cancelled ${context} fixture.`;
  }

  if (match.group) {
    const winner = getHistoricalWinner(match);

    if (!winner) {
      if (currentLanguage === "zh") {
        return `📊 双方都从${context}拿到1分。`;
      }

      return `📊 Both teams took one point from ${context}.`;
    }

    if (currentLanguage === "zh") {
      return `📊 ${getLocalizedHistoricalTeamName(winner)}从${context}拿到3分。`;
    }

    return `📊 ${winner} took three points from ${context}.`;
  }

  const winner = getHistoricalWinner(match);

  if (match.round === "Final" && winner) {
    if (currentLanguage === "zh") {
      return `🏆 ${getLocalizedHistoricalTeamName(winner)}赢得${localizeText(match.tournamentName)}冠军。`;
    }

    return `🏆 ${winner} won the ${match.tournamentName} title.`;
  }

  if (/third|3rd|place/i.test(match.round || "") && winner) {
    if (currentLanguage === "zh") {
      return `🥉 ${getLocalizedHistoricalTeamName(winner)}在${localizeText(match.tournamentName)}获得第三名。`;
    }

    return `🥉 ${winner} secured third place at ${match.tournamentName}.`;
  }

  if (currentLanguage === "zh") {
    return winner
      ? `📊 ${getLocalizedHistoricalTeamName(winner)}从${context}晋级。`
      : `📊 ${context}以平局结束。`;
  }

  return winner ? `📊 ${winner} advanced from ${context}.` : `📊 ${context} ended level.`;
}

function getHistoricalAuthoredResultHighlights(match) {
  const storyBullets = Array.isArray(match.resultStoryBullets)
    ? match.resultStoryBullets.filter((highlight) => typeof highlight === "string" && highlight.trim())
    : [];
  const authoredHighlights = Array.isArray(match.resultHighlights)
    ? match.resultHighlights.filter((highlight) => typeof highlight === "string" && highlight.trim())
    : [];

  return storyBullets.length ? storyBullets : authoredHighlights;
}

function getHistoricalResultHighlights(match) {
  const authoredHighlights = getHistoricalAuthoredResultHighlights(match);
  if (authoredHighlights.length) {
    return authoredHighlights;
  }

  if (match.status === "CANCELLED") {
    return [
      getHistoricalResultOutcomeHighlight(match),
      getHistoricalResultControlHighlight(match),
      getHistoricalResultProgressHighlight(match)
    ];
  }

  const winner = getHistoricalWinner(match);
  const scoringTeam = winner || match.homeTeam.name;

  return [
    winner ? getHistoricalScoringHighlight(match, scoringTeam) || getHistoricalResultOutcomeHighlight(match) : getHistoricalDrawScoringHighlight(match),
    getHistoricalResultControlHighlight(match),
    getHistoricalResultProgressHighlight(match)
  ].filter(Boolean);
}

function renderHistoricalResultBlock(match) {
  const scoringHighlight = renderHistoricalScoringDetailsHighlight(match);
  const mentionPlayers = getHistoricalMentionPlayers(match);
  const highlights = getHistoricalResultHighlights(match).filter(
    (highlight) => !scoringHighlight || !String(highlight).trim().startsWith("⚽")
  );
  const outcomeSummary = stripResultHighlightMarker(localizeText(getHistoricalResultOutcomeHighlight(match)));
  const scoringMarkup = scoringHighlight
    ? `<ul class="result-highlights result-scorer-highlights">${scoringHighlight}</ul>`
    : "";
  const storyMarkup = highlights.length
    ? `
      <ul class="result-highlights result-story-highlights">
        ${highlights
          .map((highlight) => stripResultHighlightMarker(localizeText(highlight)))
          .filter(Boolean)
          .map((highlight) => `<li>${renderPlayerLinkedText(highlight, mentionPlayers)}</li>`)
          .join("")}
      </ul>
    `
    : "";

  return `
    <section class="info-block">
      ${renderResultHeading(match)}
      <p class="past-empty result-score-summary">${renderPlayerLinkedText(outcomeSummary, mentionPlayers)}</p>
      <div class="result-notes">
        ${scoringMarkup}
        ${storyMarkup}
      </div>
    </section>
  `;
}

function getHistoricalRoundText(match) {
  if (currentLanguage === "zh") {
    return match.group
      ? `${localizeText(match.group)}（${localizeText(match.round)}）`
      : localizeText(match.round || "match");
  }

  return match.group ? `${match.group} (${match.round})` : `the ${match.round || "match"}`;
}

function getHistoricalResultVerb(match, teamName) {
  const winner = getHistoricalWinner(match);
  const penalties = match.scoreDetails?.penalties;

  if (!winner) {
    return "Drew with";
  }

  if (penalties) {
    return winner === teamName ? "Beat" : "Lost to";
  }

  return winner === teamName ? "Beat" : "Lost to";
}

function getHistoricalProgressionText(match, teamName, nextMatch) {
  if (nextMatch) {
    if (currentLanguage === "zh") {
      return `下一场：${localizeText(nextMatch.round)} 对 ${getLocalizedHistoricalTeamName(getHistoricalOpponent(nextMatch, teamName))}，${navDateWithYearFormatter.format(getDateFromKey(nextMatch.date))}。`;
    }

    return `Next: ${nextMatch.round} vs ${getHistoricalOpponent(nextMatch, teamName)}, ${navDateWithYearFormatter.format(getDateFromKey(nextMatch.date))}.`;
  }

  if (match.round === "Final" && getHistoricalWinner(match) === teamName) {
    if (currentLanguage === "zh") {
      return `这场比赛锁定了${localizeText(match.tournamentName)}冠军。`;
    }

    return `That sealed the ${match.tournamentName} title.`;
  }

  if (match.round === "Final") {
    if (currentLanguage === "zh") {
      return `这场比赛让他们以亚军结束${localizeText(match.tournamentName)}征程。`;
    }

    return `That ended their ${match.tournamentName} run as runners-up.`;
  }

  if (/third|3rd|place/i.test(match.round || "")) {
    if (currentLanguage === "zh") {
      return getHistoricalWinner(match) === teamName
        ? `这场比赛让他们获得第三名。`
        : `这场比赛结束了他们的季军赛征程。`;
    }

    return getHistoricalWinner(match) === teamName
      ? `That secured third place at ${match.tournamentName}.`
      : `That closed their ${match.tournamentName} run in the third-place match.`;
  }

  if (currentLanguage === "zh") {
    return `这是他们在${localizeText(match.tournamentName)}已载入的最后一场比赛。`;
  }

  return `That was their last loaded match at ${match.tournamentName}.`;
}

function getHistoricalTeamKeyBody(match, teamName) {
  const nextMatch = getNextHistoricalMatchForTeam(match, teamName);
  const opponent = getHistoricalOpponent(match, teamName);
  const opponentText = opponent || "their opponent";
  const roundText = getHistoricalRoundText(match);
  const scoreText = getHistoricalScoreResultText(match, teamName);
  const scorerText = getHistoricalScorerText(getHistoricalTeamGoals(match, teamName));
  const winner = getHistoricalWinner(match);

  if (currentLanguage === "zh") {
    const localizedOpponentText = opponent ? getLocalizedHistoricalTeamName(opponent) : "对手";
    const result = match.status === "CANCELLED"
      ? `原定对阵${localizedOpponentText}，但比赛取消。`
      : !winner
        ? `在${roundText}中以 ${scoreText} 战平${localizedOpponentText}。`
        : winner === teamName
          ? `在${roundText}中以 ${scoreText} 击败${localizedOpponentText}。`
          : `在${roundText}中以 ${scoreText} 不敌${localizedOpponentText}。`;

    return [result, scorerText, getHistoricalProgressionText(match, teamName, nextMatch)]
      .filter(Boolean)
      .join("");
  }

  const result =
    match.status === "CANCELLED"
      ? `Scheduled against ${opponentText}, but the match was cancelled.`
      : `${getHistoricalResultVerb(match, teamName)} ${opponentText} ${scoreText} in ${roundText}.`;

  return [result, scorerText, getHistoricalProgressionText(match, teamName, nextMatch)]
    .filter(Boolean)
    .join(" ");
}

function renderHistoricalKeyInformation(match) {
  const keyInformation = match.keyInformation || {};
  const keyPlayers = {
    home: getHistoricalSideKeyPlayers(match, "home"),
    away: getHistoricalSideKeyPlayers(match, "away")
  };
  const mentionPlayers = getHistoricalMentionPlayers(match);

  if (keyInformation.home && keyInformation.away) {
    return `
      <div class="key-info-grid">
        ${renderKeyInformationTeam(
          match.homeTeam,
          keyInformation.home,
          keyPlayers.home,
          mentionPlayers,
          match.awayTeam,
          getHistoricalKeyInformationLabel(match.homeTeam, keyInformation.home)
        )}
        ${renderKeyInformationTeam(
          match.awayTeam,
          keyInformation.away,
          keyPlayers.away,
          mentionPlayers,
          match.homeTeam,
          getHistoricalKeyInformationLabel(match.awayTeam, keyInformation.away)
        )}
      </div>
    `;
  }

  return `
    <div class="key-info-grid">
      ${[match.homeTeam, match.awayTeam]
        .map(
          (team) => `
            <article class="key-info-team">
              <h4>${renderKeyInformationHeading(team, localizeText(getHistoricalTeamKeyHeadline(match, team.name)))}</h4>
              ${renderTeamStyleTags(team)}
              <p>${renderPlayerLinkedText(localizeText(getHistoricalTeamKeyBody(match, team.name)), mentionPlayers)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function isHistoricalMatchBefore(candidate, match) {
  return getFixtureSortValue(candidate) < getFixtureSortValue(match);
}

function isHistoricalPair(candidate, match) {
  const candidateTeams = [candidate.homeSlot, candidate.awaySlot].sort().join("|");
  const matchTeams = [match.homeTeam.name, match.awayTeam.name].sort().join("|");
  return candidateTeams === matchTeams;
}

function getHistoricalPastMeetings(match) {
  return historicalFixtures
    .filter(
      (fixture) =>
        fixture.status === "FT" &&
        isHistoricalPair(fixture, match) &&
        isHistoricalMatchBefore(fixture, match)
    )
    .sort((a, b) => getFixtureSortValue(b).localeCompare(getFixtureSortValue(a)));
}

function getHistoricalFirstWorldCupMeetingText(match) {
  return `${match.homeTeam.name} and ${match.awayTeam.name} had not met in a men's World Cup before this match.`;
}

function getHistoricalPastRecord(match, results) {
  return results.reduce(
    (record, result) => {
      const winner = getHistoricalWinner(result);

      if (!winner) {
        record.draws += 1;
      } else if (winner === match.homeTeam.name) {
        record.homeWins += 1;
      } else if (winner === match.awayTeam.name) {
        record.awayWins += 1;
      }

      return record;
    },
    { awayWins: 0, draws: 0, homeWins: 0, total: results.length }
  );
}

function renderHistoricalPastRecord(match, results) {
  const record = getHistoricalPastRecord(match, results);
  const items = [
    { count: record.homeWins, label: localizeText(match.homeTeam.name), type: "win" },
    { count: record.draws, label: "Tie", type: "draw" },
    { count: record.awayWins, label: localizeText(match.awayTeam.name), type: "win" }
  ].map((item) => {
    const percent = formatPastRecordPercent(item.count, record.total);
    const share = record.total ? (item.count / record.total) * 100 : 0;
    const countLabel = localizeText(formatPastRecordCount(item.count, item.type));
    const compactLabel = `${item.count} (${percent})`;
    const label = localizeText(item.label);

    return {
      ...item,
      compactLabel,
      countLabel,
      label,
      percent,
      share,
      rowLabel:
        currentLanguage === "zh"
          ? `${label}：${countLabel}，${percent}`
          : `${label}: ${countLabel}, ${percent}`
    };
  });

  return `
    <div class="past-record" aria-label="${escapeHtml(localizeText(`World Cup head-to-head record across ${record.total} matches`))}">
      ${items
        .map(
          (item) => `
            <article class="past-record-row" aria-label="${escapeHtml(item.rowLabel)}" data-tooltip="${escapeHtml(item.label)}">
              ${renderMeasuredLabel(item.label, "past-record-label")}
              <span class="past-record-track" aria-hidden="true">
                <span style="--record-share: ${escapeHtml(item.share.toFixed(3))}%;"></span>
              </span>
              <span class="past-record-count">${escapeHtml(item.compactLabel)}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function getHistoricalTeamResultClass(teamName, winner) {
  return [
    "past-team",
    winner === teamName ? "is-winner" : "",
    winner && winner !== teamName ? "is-loser" : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function renderHistoricalPastScoreline(result, leadingTeamName = "") {
  const shouldFlip = leadingTeamName && result.awaySlot === leadingTeamName;
  const leftName = shouldFlip ? result.awaySlot : result.homeSlot;
  const rightName = shouldFlip ? result.homeSlot : result.awaySlot;
  const leftScore = shouldFlip ? result.score?.away : result.score?.home;
  const rightScore = shouldFlip ? result.score?.home : result.score?.away;
  const scoreText = formatScorePair({ home: leftScore, away: rightScore });
  const scoreNote = getHistoricalScoreNote(result);
  const winner = getHistoricalWinner(result);
  const leftTeam = getHistoricalTeam(leftName) || { isSlot: true, name: leftName };
  const rightTeam = getHistoricalTeam(rightName) || { isSlot: true, name: rightName };
  const scoreLabel = [localizeText(leftName), scoreText, localizeText(rightName)].filter(Boolean).join(" ");
  const scoreNoteLabel = scoreNote ? `, ${localizeText(scoreNote)}` : "";

  return `
    <div class="past-scoreline historical-past-scoreline" aria-label="${escapeHtml(scoreLabel)}${escapeHtml(scoreNoteLabel)}">
      ${renderTeamInline(leftTeam, getHistoricalTeamResultClass(leftName, winner), { showRank: false })}
      <strong class="past-score">
        ${escapeHtml(scoreText)}
        ${scoreNote ? `<span>${escapeHtml(scoreNote)}</span>` : ""}
      </strong>
      ${renderTeamInline(rightTeam, getHistoricalTeamResultClass(rightName, winner), { showRank: false })}
    </div>
  `;
}

function renderHistoricalPastMatches(match) {
  const results = getHistoricalPastMeetings(match);

  if (!results.length) {
    return `<p class="past-empty">${escapeHtml(localizeText(getHistoricalFirstWorldCupMeetingText(match)))}</p>`;
  }

  return `
    ${renderHistoricalPastRecord(match, results)}
    <ul class="past-list">
      ${results
        .slice(0, 3)
        .map(
          (result) => `
            <li>
              <span class="past-meta">
                <span>${escapeHtml(result.date)}</span>
                <em>${escapeHtml(localizeText(result.tournamentName))} / ${escapeHtml(localizeText(result.round))}</em>
              </span>
              ${renderHistoricalPastScoreline(result, match.homeTeam.name)}
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderHistoricalMatchInfo(match) {
  return `
    <section class="info-block match-summary">
      <p class="info-kicker">${escapeHtml(getHistoricalContextLabel(match))}</p>
      <h2 class="summary-title">
        ${renderTeamInline(match.homeTeam, "summary-team", { showRank: false })}
        <span class="versus">${escapeHtml(localizeText("vs"))}</span>
        ${renderTeamInline(match.awayTeam, "summary-team", { showRank: false })}
      </h2>
      <p>${escapeHtml(getVenueLabel(match))}</p>
    </section>

    ${renderHistoricalContext(match)}

    ${renderHistoricalResultBlock(match)}

    <section class="info-block match-prediction-block has-section-divider">
      ${renderPredictionHeading(getHistoricalProjection(match))}
      ${renderHistoricalProjection(match)}
    </section>

    <section class="info-block match-key-info-block has-section-divider">
      <h3>${escapeHtml(localizeText("Key information"))}</h3>
      ${renderHistoricalKeyInformation(match)}
    </section>

    <section class="info-block match-past-block has-section-divider">
      <h3>${escapeHtml(localizeText("Past World Cup meetings"))}</h3>
      ${renderHistoricalPastMatches(match)}
    </section>
  `;
}

function setMatchInfoEntrance(shouldAnimate) {
  matchInfo.classList.remove("is-entering");

  if (!shouldAnimate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  void matchInfo.offsetWidth;
  matchInfo.classList.add("is-entering");
}

function renderCurrentMatchContextKicker(match, label) {
  const labelHtml = escapeHtml(label);

  if (match.stage && match.stage !== "group") {
    const ariaLabel =
      currentLanguage === "zh" ? "在淘汰赛对阵中查看这轮" : `View ${label} in the Tournament bracket`;
    const matchNumber = Number(match.matchNumber);
    const targetAttribute = Number.isFinite(matchNumber)
      ? ` data-tournament-match-number="${escapeHtml(matchNumber)}"`
      : "";
    return `<button class="info-kicker match-stage-link" type="button" data-open-tournament-tab="true"${targetAttribute} aria-label="${escapeHtml(ariaLabel)}">${labelHtml}</button>`;
  }

  return `<p class="info-kicker">${labelHtml}</p>`;
}

function getDisplayMatchTeam(match, side, context = null) {
  const fallbackTeam = match?.[`${side}Team`];

  if (!match?.stage || match.stage === "group") {
    return fallbackTeam;
  }

  const progressionContext = context || createTournamentProgressionContext();
  const entry = getTournamentMatchParticipants(match, progressionContext)?.[side];
  return entry?.state === "resolved" && entry.team ? entry.team : fallbackTeam;
}

function getDisplayMatchTeams(match, context = null) {
  return {
    away: getDisplayMatchTeam(match, "away", context),
    home: getDisplayMatchTeam(match, "home", context)
  };
}

function getDisplayMatch(match, displayTeams) {
  const homeTeam = displayTeams?.home || match.homeTeam;
  const awayTeam = displayTeams?.away || match.awayTeam;

  return {
    ...match,
    awayTeam,
    awayTeamId: awayTeam?.isSlot ? match.awayTeamId : awayTeam?.id || match.awayTeamId,
    homeTeam,
    homeTeamId: homeTeam?.isSlot ? match.homeTeamId : homeTeam?.id || match.homeTeamId
  };
}

function renderProjectedMatchNote(match, context) {
  if (!isTournamentProjectedMatch(match, context)) {
    return "";
  }

  return `<p class="data-note knockout-projection-note">${escapeHtml(localizeText("Predicted matchup; participants come from current knockout-path estimates."))}</p>`;
}

function openTournamentTabFromMatchInfo(targetMatchNumber = "") {
  selectedStandingsYear = CURRENT_STANDINGS_YEAR;
  selectedStandingsMode = "tournament";
  setActiveView("standings", { historyMode: "push" });
  renderStandingsView();
  updateUrlState();

  window.requestAnimationFrame(() => {
    const progression = standingsGrid.querySelector(".tournament-progression");
    const targetCard =
      targetMatchNumber && progression
        ? progression.querySelector(`.progress-match[data-match-number="${CSS.escape(String(targetMatchNumber))}"]`)
        : null;

    if (targetCard) {
      spotlightDrillTarget(targetCard);
      return;
    }

    standingsGrid.querySelector(".tournament-view")?.scrollIntoView({ block: "start", inline: "nearest" });
    progression?.focus({ preventScroll: true });
  });
}

function renderMatchInfo(match, options = {}) {
  clearActivePlayerHover();
  const shouldAnimateEntrance = matchInfo.hidden || matchInfo.classList.contains("is-hidden");
  activeMatchId = match.id;
  viewPanels.matches.classList.add("has-match-info");
  matchInfo.classList.remove("is-hidden");
  matchInfo.hidden = false;

  document.querySelectorAll(".match-row, .yesterday-match-card").forEach((row) => {
    const isSelected = row.dataset.matchId === match.id;
    row.classList.toggle("is-selected", isSelected);
    row
      .querySelector(".match-row-trigger, .yesterday-match-button")
      ?.setAttribute("aria-pressed", String(isSelected));
  });

  if (match.isHistorical) {
    matchInfo.innerHTML = renderHistoricalMatchInfo(match);
    positionPlayerCards();
    updateTruncatedTeamTooltips(matchInfo);
    updateStandingNameTooltips(matchInfo);
    updateMeasuredLabelTooltips(matchInfo);
    updateTooltipBounds(matchInfo);
    setMatchInfoEntrance(shouldAnimateEntrance);
    if (options.reveal) {
      revealMatchInfoOnSmallScreens();
    }
    return;
  }

  const group = getGroup(match.groupId);
  const stage = tournament.stages.find((item) => item.id === match.stage);
  const contextLabel =
    match.stage === "group"
      ? group?.label || `Group ${match.groupId}`
      : stage?.label || match.stage;
  const localizedContextLabel = localizeText(contextLabel);
  const tournamentContext = match.stage && match.stage !== "group" ? createTournamentProgressionContext() : null;
  const displayTeams = getDisplayMatchTeams(match, tournamentContext);
  const displayMatch = getDisplayMatch(match, displayTeams);

  matchInfo.innerHTML = `
    <section class="info-block match-summary">
      ${renderCurrentMatchContextKicker(match, localizedContextLabel)}
      <h2 class="summary-title">
        ${renderTeamInline(displayTeams.home, "summary-team")}
        <span class="versus">${escapeHtml(localizeText("vs"))}</span>
        ${renderTeamInline(displayTeams.away, "summary-team")}
      </h2>
      <p>${escapeHtml(getVenueLabel(match))}</p>
      ${renderProjectedMatchNote(match, tournamentContext)}
    </section>

    ${renderFinishedMatchResultBlock(displayMatch)}

    ${renderMatchContext(match, tournamentContext)}

    ${renderMatchStatusBlock(displayMatch)}

    <section class="info-block match-key-info-block has-section-divider">
      <h3>${escapeHtml(localizeText("Key information"))}</h3>
      ${renderKeyInformation(displayMatch)}
    </section>

    <section class="info-block match-past-block has-section-divider">
      <h3>${escapeHtml(localizeText("Past matches"))}</h3>
      ${renderPastResults(displayMatch)}
    </section>
  `;
  updateLineupTabIndicators(matchInfo);
  positionPlayerCards();
  updateTruncatedTeamTooltips(matchInfo);
  updateStandingNameTooltips(matchInfo);
  updateMeasuredLabelTooltips(matchInfo);
  updateTooltipBounds(matchInfo);
  setMatchInfoEntrance(shouldAnimateEntrance);

  if (options.reveal) {
    revealMatchInfoOnSmallScreens();
  }
}

function renderMatchInfoPrompt() {
  activeMatchId = "";
  viewPanels.matches.classList.remove("has-match-info");
  document.querySelectorAll(".match-row, .yesterday-match-card").forEach((row) => {
    row.classList.remove("is-selected");
    row
      .querySelector(".match-row-trigger, .yesterday-match-button")
      ?.setAttribute("aria-pressed", "false");
  });
  matchInfo.replaceChildren();
  matchInfo.classList.add("is-hidden");
  matchInfo.hidden = true;
}

function createEmptyStateElement() {
  const selectedDate = dateFormatter.format(getDateFromKey(selectedDayKey));
  const reportUrl = getReportIssueUrl("no-matches");
  const message =
    dataCoverage.status === "partial"
      ? `Verified fixture data is not loaded for ${selectedDate}. This avoids showing a false no-match day.`
      : `No matches were found for ${selectedDate}.`;

  const article = document.createElement("article");
  article.className = "empty-state";
  article.innerHTML = `
    <h2>${escapeHtml(localizeText(dataCoverage.status === "partial" ? "Not loaded" : "No matches"))}</h2>
    <p>${escapeHtml(localizeText(message))}</p>
    <div class="empty-actions">
      <a class="secondary-button" href="${escapeHtml(reportUrl)}">${escapeHtml(localizeText("Report issue"))}</a>
    </div>
  `;
  return article;
}

function setLiveTodayMatchFocus(enabled) {
  matchList.classList.toggle("has-live-today-match", Boolean(enabled));
}

function renderEmptyState() {
  activeMatchId = "";
  viewPanels.matches.classList.remove("has-match-info");
  setLiveTodayMatchFocus(false);
  matchList.removeAttribute("aria-busy");
  matchList.replaceChildren(createEmptyStateElement());
  matchInfo.replaceChildren();
  matchInfo.classList.add("is-hidden");
  matchInfo.hidden = true;
}

function renderMatchLoadingState() {
  viewPanels.matches.classList.remove("has-match-info");
  setLiveTodayMatchFocus(false);
  matchList.setAttribute("aria-busy", "true");
  matchList.innerHTML = `
    <div class="match-loading" role="status">
      <p class="visually-hidden">${escapeHtml(localizeText("Loading matches"))}</p>
      ${Array.from({ length: 4 }, () => `
        <div class="match-loading-row" aria-hidden="true">
          <span class="match-loading-line match-loading-time"></span>
          <span class="match-loading-line match-loading-teams"></span>
          <span class="match-loading-line match-loading-score"></span>
        </div>
      `).join("")}
    </div>
  `;
  matchInfo.replaceChildren();
  matchInfo.classList.add("is-hidden");
  matchInfo.hidden = true;
}

function getReportIssueUrl(type) {
  const params = new URLSearchParams({
    type,
    date: selectedDayKey,
    tz: selectedTimeZone,
    from: window.location.href
  });

  if (currentLanguage !== DEFAULT_LANGUAGE) {
    params.set("lang", currentLanguage);
  }

  return `report.html?${params.toString()}`;
}

function getMatchesForSelectedDay() {
  return getCalendarFixtures()
    .filter((fixture) => getFixtureDayKey(fixture) === selectedDayKey)
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)))
    .map(hydrateFixture);
}

function isPastMatchPreviewReady(match, currentTime) {
  if (isMatchLive(match, currentTime)) {
    return false;
  }

  if (match.status === "FT") {
    return true;
  }

  const kickoffTime = match.kickoffUtc ? new Date(match.kickoffUtc).getTime() : NaN;
  return Number.isFinite(kickoffTime) && currentTime >= kickoffTime + MATCH_LIVE_WINDOW_MS;
}

function shouldShowYesterdayMatchesForSelectedDay(currentTime) {
  return selectedDayKey <= getDayKey(new Date(currentTime), selectedTimeZone);
}

function getYesterdayMatches(currentTime = Date.now()) {
  if (!shouldShowYesterdayMatchesForSelectedDay(currentTime)) {
    return [];
  }

  const previousDayKey = getRelativeDayKey(selectedDayKey, -1);
  return getCalendarFixtures()
    .filter((fixture) => getFixtureDayKey(fixture) === previousDayKey)
    .map(hydrateFixture)
    .filter((match) => isPastMatchPreviewReady(match, currentTime))
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)));
}

function renderCompactMatchScore(match, state) {
  const score = getDisplayScore(match, state);
  if (!score) {
    return "";
  }

  const home = getLocalizedTeamName(match.homeTeam);
  const away = getLocalizedTeamName(match.awayTeam);
  const scoreText = getMatchVisibleScoreText(match, score);
  const label =
    match.status === "LIVE" || state === "live"
      ? localizeText("Current score")
      : localizeText("Final score");
  const ariaLabel = getMatchScoreAriaLabel(match, label, home, away, score);

  return `<span class="match-score" aria-label="${escapeHtml(ariaLabel)}">${escapeHtml(scoreText)}</span>`;
}

function getCompactMatchMeta(match, state, currentTime) {
  return (
    renderCompactMatchScore(match, state) ||
    renderScoreStatus(match, state, currentTime) ||
    (state === "live"
      ? renderLivePill({ match, focusable: false })
      : "")
  );
}

function createYesterdayMatchCard(match, currentTime, tournamentContext = null) {
  const state = getMatchState(match, new Set(), currentTime);
  const card = document.createElement("article");
  const button = document.createElement("button");
  const displayTeams = getDisplayMatchTeams(match, tournamentContext);
  const homeName = getLocalizedTeamName(displayTeams.home);
  const awayName = getLocalizedTeamName(displayTeams.away);
  const versusText = localizeText("vs");
  const timeLabel = getMatchTimeLabel(match);
  const score = getCompactMatchMeta(match, state, currentTime);
  const displayScore = getDisplayScore(match, state);
  const scoreText = displayScore
    ? `, ${localizeText("final score")} ${getMatchVisibleScoreText(match, displayScore)}`
    : "";
  const label = `${homeName} ${versusText} ${awayName}${timeLabel ? `, ${timeLabel}` : ""}${scoreText}`;
  const winnerSide = getMatchScoreOutcomeSide(match, displayScore);

  card.className = "yesterday-match-card";
  card.dataset.matchId = match.id;
  button.className = "yesterday-match-button";
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-pressed", String(activeMatchId === match.id));
  button.innerHTML = `
    ${timeLabel ? `<span class="yesterday-match-time">${escapeHtml(timeLabel)}</span>` : ""}
    <span class="yesterday-match-pair">
      ${renderTeamInline(displayTeams.home, getTeamClass("yesterday-team", winnerSide, "home", { markLoser: true }), { showRank: false })}
      <span class="versus">${escapeHtml(versusText)}</span>
      ${renderTeamInline(displayTeams.away, getTeamClass("yesterday-team", winnerSide, "away", { markLoser: true }), { showRank: false })}
    </span>
    ${score ? `<span class="yesterday-match-meta">${score}</span>` : ""}
  `;

  card.append(button);
  card.addEventListener("pointerenter", (event) => {
    if (!isRestoringHistoryState && shouldPreviewMatchInfoOnHover(event)) {
      renderMatchInfo(match);
    }
  });
  card.addEventListener("focusin", () => {
    if (syncUrl && !isRestoringHistoryState) {
      renderMatchInfo(match);
    }
  });
  card.addEventListener("click", () => {
    renderMatchInfo(match, { reveal: true });
    updateUrlState({ historyMode: "push" });
  });
  return card;
}

function createYesterdayMatchesSection(matches, currentTime) {
  if (!matches.length) {
    return null;
  }

  const previousDayKey = getRelativeDayKey(selectedDayKey, -1);
  const dateLabel = navDateFormatter.format(getDateFromKey(previousDayKey));
  const section = document.createElement("section");
  const list = document.createElement("div");
  const title = localizeText("Past 24 hours");
  const tournamentContext = createTournamentProgressionContext();
  section.className = "yesterday-section";
  section.setAttribute(
    "aria-label",
    `${title}, ${dateFormatter.format(getDateFromKey(previousDayKey))}`
  );
  section.innerHTML = `
    <div class="yesterday-section-header">
      <h2>${escapeHtml(title)} <time datetime="${escapeHtml(previousDayKey)}">(${escapeHtml(dateLabel)})</time></h2>
      <button class="yesterday-dismiss" type="button" aria-label="${escapeHtml(localizeText("Hide Past 24 hours"))}">
        <span class="yesterday-dismiss-icon" aria-hidden="true"></span>
      </button>
    </div>
  `;
  section.querySelector(".yesterday-dismiss")?.addEventListener("click", (event) => {
    event.stopPropagation();
    setShowYesterdayMatches(false);
  });
  list.className = "yesterday-match-grid";
  list.classList.toggle("has-single-match", matches.length === 1);
  matches.forEach((match) => {
    list.append(createYesterdayMatchCard(match, currentTime, tournamentContext));
  });
  section.append(list);
  return section;
}

function getTeamSearchAliases(team) {
  return TEAM_SEARCH_ALIASES_BY_TEAM_ID[team?.id] || [];
}

function getCanonicalTeamSearchTeam(team) {
  return teamsById.get(team?.id) || team;
}

function getTeamSearchTextCandidates(team) {
  const candidates = [
    team?.id,
    team?.name,
    team?.officialName,
    team?.standingName,
    ...getTeamSearchAliases(team)
  ];
  const seen = new Set();
  const expandedCandidates = [];

  for (const candidate of candidates) {
    const text = String(candidate || "").trim();
    if (!text) {
      continue;
    }

    for (const value of [text, translateTextToZh(text).trim()]) {
      if (value && !seen.has(value)) {
        seen.add(value);
        expandedCandidates.push(value);
      }
    }
  }

  return expandedCandidates;
}

function getTeamSearchKeys(team) {
  return getTeamSearchTextCandidates(team)
    .map(normalizeTextKey)
    .filter(Boolean);
}

function getTeamSearchPrefixKeys(team) {
  return getTeamSearchKeys(team).filter((key) => !TEAM_SEARCH_EXACT_ONLY_ALIAS_KEYS.has(key));
}

function getTeamSearchTeamForExactQuery(queryKey) {
  for (const team of teamsById.values()) {
    if (getTeamSearchKeys(team).includes(queryKey)) {
      return team;
    }
  }

  return null;
}

function isTeamSearchKeyMatch(key, queryKey) {
  if (key === queryKey || key.startsWith(queryKey)) {
    return true;
  }

  if ((key.length >= 4 || hasChineseCharacter(key)) && queryKey.startsWith(key)) {
    return true;
  }

  const keyWords = key.split(" ").filter(Boolean);
  if (!keyWords.length) {
    return false;
  }

  if (!queryKey.includes(" ")) {
    return keyWords.some((word) => word.startsWith(queryKey));
  }

  return keyWords.some((_, index) => keyWords.slice(index).join(" ").startsWith(queryKey));
}

function isTeamSearchMatch(team, queryKey) {
  if (!queryKey) {
    return false;
  }

  const exactQueryTeam = getTeamSearchTeamForExactQuery(queryKey);
  const teamKeys = getTeamSearchKeys(team);

  if (exactQueryTeam) {
    const exactQueryTeamKeys = new Set(getTeamSearchKeys(exactQueryTeam));
    return teamKeys.some((key) => exactQueryTeamKeys.has(key));
  }

  return getTeamSearchPrefixKeys(team).some((key) => isTeamSearchKeyMatch(key, queryKey));
}

function buildTeamSearchExactKeySets() {
  const exactKeySets = new Map();

  for (const team of teamsById.values()) {
    const teamKeys = new Set(getTeamSearchKeys(team));

    for (const key of teamKeys) {
      if (key && !exactKeySets.has(key)) {
        exactKeySets.set(key, teamKeys);
      }
    }
  }

  return exactKeySets;
}

function buildTeamSearchIndex() {
  teamSearchExactKeySetsByQueryKey = buildTeamSearchExactKeySets();
  teamSearchIndex = getCalendarFixtures()
    .map(hydrateFixture)
    .map((match) => ({
      match,
      sortValue: getFixtureSortValue(match),
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeKeys: getTeamSearchKeys(match.homeTeam),
      awayKeys: getTeamSearchKeys(match.awayTeam),
      homePrefixKeys: getTeamSearchPrefixKeys(match.homeTeam),
      awayPrefixKeys: getTeamSearchPrefixKeys(match.awayTeam)
    }))
    .sort((a, b) => a.sortValue.localeCompare(b.sortValue));
}

function getTeamSearchExactKeySet(queryKey) {
  const indexedKeySet = teamSearchExactKeySetsByQueryKey.get(queryKey);
  if (indexedKeySet) {
    return indexedKeySet;
  }

  const exactQueryTeam = getTeamSearchTeamForExactQuery(queryKey);
  return exactQueryTeam ? new Set(getTeamSearchKeys(exactQueryTeam)) : null;
}

function isTeamSearchIndexedKeyMatch(
  keys,
  queryKey,
  exactKeySet = getTeamSearchExactKeySet(queryKey),
  prefixKeys = keys
) {
  if (exactKeySet) {
    return keys.some((key) => exactKeySet.has(key));
  }

  return prefixKeys.some((key) => isTeamSearchKeyMatch(key, queryKey));
}

function getTeamSearchIndexedParticipant(entry, queryKey, exactKeySet = getTeamSearchExactKeySet(queryKey)) {
  if (isTeamSearchIndexedKeyMatch(entry.homeKeys, queryKey, exactKeySet, entry.homePrefixKeys)) {
    return {
      team: entry.homeTeam,
      searchedSide: "home"
    };
  }

  if (isTeamSearchIndexedKeyMatch(entry.awayKeys, queryKey, exactKeySet, entry.awayPrefixKeys)) {
    return {
      team: entry.awayTeam,
      searchedSide: "away"
    };
  }

  return null;
}

function getTeamSearchParticipant(match, queryKey) {
  if (isTeamSearchMatch(match.homeTeam, queryKey)) {
    return match.homeTeam;
  }

  if (isTeamSearchMatch(match.awayTeam, queryKey)) {
    return match.awayTeam;
  }

  return null;
}

function getTeamSearchQuery() {
  return teamSearchQuery.trim();
}

function hasTeamSearchQuery() {
  return getTeamSearchQuery().length > 0;
}

function getTeamSearchMatches(query = getTeamSearchQuery()) {
  const queryKey = normalizeTextKey(query);

  if (queryKey.length < 2 && !hasChineseCharacter(queryKey)) {
    return [];
  }

  if (!teamSearchIndex.length && getCalendarFixtures().length) {
    buildTeamSearchIndex();
  }

  const matches = [];
  const exactKeySet = getTeamSearchExactKeySet(queryKey);

  for (const entry of teamSearchIndex) {
    const participant = getTeamSearchIndexedParticipant(entry, queryKey, exactKeySet);
    if (participant) {
      matches.push({
        match: entry.match,
        ...participant
      });
    }
  }

  return matches;
}

function getTeamSearchResultTitle(searchMatches, query) {
  const exactQueryTeam = getTeamSearchTeamForExactQuery(normalizeTextKey(query));
  if (exactQueryTeam) {
    return exactQueryTeam.name || query;
  }

  const matchedTeams = new Map();

  for (const { team } of searchMatches) {
    const canonicalTeam = getCanonicalTeamSearchTeam(team);
    const key = normalizeTextKey(canonicalTeam?.id || canonicalTeam?.name);
    if (key && !matchedTeams.has(key)) {
      matchedTeams.set(key, canonicalTeam);
    }
  }

  if (matchedTeams.size === 1) {
    const [team] = matchedTeams.values();
    return team?.name || query;
  }

  return query;
}

function getTeamSearchMatchedSide(match, team) {
  if (!team) {
    return "";
  }

  const teamKey = normalizeTextKey(team.id || team.name);
  const homeKey = normalizeTextKey(match.homeTeam?.id || match.homeTeam?.name);
  const awayKey = normalizeTextKey(match.awayTeam?.id || match.awayTeam?.name);

  if (team === match.homeTeam || teamKey === homeKey) {
    return "home";
  }

  if (team === match.awayTeam || teamKey === awayKey) {
    return "away";
  }

  return "";
}

function isCurrentTournamentPastSearchMatch(match, currentTime) {
  if (match.status === "FT") {
    return true;
  }

  const kickoffTime = match.kickoffUtc ? new Date(match.kickoffUtc).getTime() : NaN;
  return Number.isFinite(kickoffTime) && currentTime > kickoffTime + MATCH_LIVE_WINDOW_MS;
}

function createTeamSearchHeading(title, options = {}) {
  const section = document.createElement("section");
  section.className = ["team-search-summary", options.isEmpty ? "is-empty" : ""].filter(Boolean).join(" ");
  section.innerHTML = `<h2>${escapeHtml(localizeText(title))}</h2>`;
  return section;
}

function createTeamSearchSection(title, items, stateForMatch, options = {}) {
  const section = document.createElement("section");
  section.className = ["team-search-section", options.className || ""].filter(Boolean).join(" ");
  section.innerHTML = `<h3>${escapeHtml(localizeText(title))}</h3>`;

  const list = document.createElement("div");
  const currentTime = options.currentTime || Date.now();
  const tournamentContext = createTournamentProgressionContext();
  list.className = "team-search-match-list";
  for (const { match, team, searchedSide } of items) {
    const row = renderMatchRow(match, stateForMatch(match), currentTime, {
      searchedSide: searchedSide || getTeamSearchMatchedSide(match, team),
      showDate: true,
      tournamentContext
    });
    row.classList.add("is-country-search-row");
    list.append(row);
  }

  section.append(list);
  return section;
}

function createOlderWorldCupsToggle(hiddenCount) {
  const section = document.createElement("section");
  section.className = "team-search-section team-search-archive-toggle";
  const button = document.createElement("button");
  button.className = "past-reveal-button team-search-history-button";
  button.type = "button";
  button.dataset.teamHistoryToggle = "true";
  button.innerHTML = `
    <span class="past-reveal-action">
      ${escapeHtml(localizeText(`See previous World Cups (${hiddenCount})`))}
    </span>
  `;
  button.addEventListener("click", () => {
    isShowingOlderTeamMatches = true;
    renderSchedule();
  });
  section.append(button);
  return section;
}

function updateTeamSearchUrlState(options = {}) {
  if (options.debounceUrl) {
    scheduleUrlStateUpdate(options);
    return;
  }

  updateUrlState(options);
}

function ensureMatchInfoPrompt() {
  if (activeMatchId || !matchInfo.hidden) {
    renderMatchInfoPrompt();
  }
}

function renderTeamSearchEmptyState(options = {}) {
  matchList.replaceChildren(createTeamSearchHeading("No loaded World Cup matches found.", { isEmpty: true }));
  ensureMatchInfoPrompt();
  updateTeamSearchUrlState(options);
}

function renderTeamSearchResults(options = {}) {
  const query = getTeamSearchQuery();
  const currentTime = Date.now();
  const searchMatches = getTeamSearchMatches(query);

  setLiveTodayMatchFocus(false);
  updateDateControls();
  updateTeamSearchControls();

  if (!searchMatches.length) {
    renderTeamSearchEmptyState(options);
    return;
  }

  const currentTournamentMatches = searchMatches.filter(({ match }) => !match.isHistorical);
  const olderWorldCupMatches = searchMatches
    .filter(({ match }) => match.isHistorical)
    .sort((a, b) => getFixtureSortValue(b.match).localeCompare(getFixtureSortValue(a.match)));
  const upcomingMatches = currentTournamentMatches.filter(
    ({ match }) => !isCurrentTournamentPastSearchMatch(match, currentTime)
  );
  const previousCurrentMatches = currentTournamentMatches
    .filter(({ match }) => isCurrentTournamentPastSearchMatch(match, currentTime))
    .sort((a, b) => getFixtureSortValue(b.match).localeCompare(getFixtureSortValue(a.match)));
  const [nextMatch, ...laterMatches] = upcomingMatches;
  const liveMatchIds = getLiveMatchIds(currentTime);
  const nextMatchIds = getNextMatchIds(currentTime, liveMatchIds);
  const nodes = [createTeamSearchHeading(getTeamSearchResultTitle(searchMatches, query))];
  const stateForMatch = (match) =>
    match.isHistorical ? "complete" : getMatchState(match, nextMatchIds, currentTime);

  if (nextMatch) {
    nodes.push(createTeamSearchSection("Next match", [nextMatch], stateForMatch, { currentTime }));
  }

  if (laterMatches.length) {
    nodes.push(createTeamSearchSection("Later matches", laterMatches, stateForMatch, { currentTime }));
  }

  if (previousCurrentMatches.length) {
    nodes.push(createTeamSearchSection("Previous matches", previousCurrentMatches, stateForMatch, { currentTime }));
  }

  if (olderWorldCupMatches.length && isShowingOlderTeamMatches) {
    nodes.push(
      createTeamSearchSection("Previous World Cups", olderWorldCupMatches, stateForMatch, {
        className: "is-archive",
        currentTime
      })
    );
  } else if (olderWorldCupMatches.length) {
    nodes.push(createOlderWorldCupsToggle(olderWorldCupMatches.length));
  }

  matchList.replaceChildren(...nodes);
  ensureMatchInfoPrompt();
  updateWrappedMatchRows(matchList);
  updateTruncatedTeamTooltips(matchList);
  updateTooltipBounds(matchList);
  updateTeamSearchUrlState(options);
}

function normalizeCatchUpItem(item, match) {
  if (!getCanonicalCatchUpCopyText(item?.headline)) {
    return null;
  }

  const dateKey = item.date || getFixtureDayKey(match);
  const priority = Number(item.priority);
  const body = item.body || item.note || "";
  const standouts = normalizeCatchUpStandouts(item.standouts || item.standout || item.playerPulse);
  const mentionText = [item.headline, body, ...standouts]
    .map(getCanonicalCatchUpCopyText)
    .filter(Boolean)
    .join(" ");
  return {
    dateKey,
    headline: item.headline,
    body,
    standouts,
    mentionPlayers: getUniqueMentionPlayers([
      ...getMatchMentionPlayers(match, match.keyInformation || {}),
      ...getProfileMentionPlayersFromText(mentionText)
    ]),
    meta: item.meta || `${match.homeTeam.name} vs ${match.awayTeam.name}`,
    sourceLabel: item.sourceLabel || "",
    sourceUrl: item.sourceUrl || item.url || "",
    priority: Number.isFinite(priority) ? priority : 10,
    sortValue: item.sortValue || getFixtureSortValue(match)
  };
}

function getTournamentSource(sourceId) {
  if (!sourceId) {
    return null;
  }

  return (tournament.sources || []).find((source) => source.id === sourceId) || null;
}

function isLocalizedCatchUpCopy(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && typeof value.en === "string");
}

function getCanonicalCatchUpCopyText(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  return String(value.en || Object.values(value).find((candidate) => typeof candidate === "string") || "").trim();
}

function getLocalizedCatchUpCopyText(value) {
  if (!isLocalizedCatchUpCopy(value)) {
    return localizeDisplayText(value);
  }

  const localized = String(value[currentLanguage] || value.en || "").trim();
  if (localized || currentLanguage !== "zh") {
    return localized;
  }

  return localizeDisplayText(value.en);
}

function normalizeCatchUpStandout(standout) {
  if (typeof standout === "string") {
    return standout.trim();
  }

  if (isLocalizedCatchUpCopy(standout)) {
    return standout;
  }

  const name = standout?.playerName || standout?.name || "";
  const team = standout?.teamName || standout?.team || "";
  const text = standout?.text || standout?.note || "";
  const label = [name, team].filter(Boolean).join(", ");

  if (label && text) {
    return `${label}: ${text}`;
  }

  return label || text;
}

function normalizeCatchUpStandouts(standouts) {
  const items = Array.isArray(standouts) ? standouts : [standouts];

  return items.map(normalizeCatchUpStandout).filter(Boolean);
}

function getAuthoredCatchUpItems(match) {
  const sourceItems = match.catchUp || match.digest || [];
  if (!Array.isArray(sourceItems)) {
    return [];
  }

  return sourceItems.map((item) => normalizeCatchUpItem(item, match)).filter(Boolean);
}

function normalizeTournamentCatchUpItem(item) {
  if (!getCanonicalCatchUpCopyText(item?.headline)) {
    return null;
  }

  const timestamp = item.publishedAt || item.updatedAt || "";
  const timestampValue = getValidTimestamp(timestamp);
  const dateKey =
    item.date || (timestampValue === null ? "" : getDayKey(new Date(timestampValue), selectedTimeZone));

  if (!dateKey) {
    return null;
  }

  const source = getTournamentSource(item.sourceId);
  const priority = Number(item.priority);
  const body = item.body || item.note || "";
  const standouts = normalizeCatchUpStandouts(item.standouts || item.standout || item.playerPulse);
  const mentionText = [item.headline, body, ...standouts]
    .map(getCanonicalCatchUpCopyText)
    .filter(Boolean)
    .join(" ");
  return {
    dateKey,
    headline: item.headline,
    body,
    standouts,
    mentionPlayers: getProfileMentionPlayersFromText(mentionText),
    meta: item.meta || item.category || "Tournament",
    sourceLabel: item.sourceLabel || source?.label || "",
    sourceUrl: item.sourceUrl || item.url || source?.url || "",
    priority: Number.isFinite(priority) ? priority : 12,
    sortValue: item.sortValue || item.publishedAt || item.updatedAt || `${dateKey}T12:00:00Z`
  };
}

function getTournamentCatchUpItems(dayKeys) {
  const sourceItems = [tournament.catchUp, tournament.news].flatMap((items) =>
    Array.isArray(items) ? items : []
  );

  return sourceItems
    .map(normalizeTournamentCatchUpItem)
    .filter((item) => item && dayKeys.has(item.dateKey));
}

function getPlayerName(player) {
  return typeof player === "string" ? player : player?.name || "";
}

function getPlayerNote(player) {
  return typeof player === "string" ? "" : player?.note || "";
}

function getCatchUpPlayerHeadline(player) {
  const name = getPlayerName(player);
  const note = getPlayerNote(player).toLowerCase();

  if (!name) {
    return "";
  }

  if (/(keeper|shot-stopper|goalkeeper|saves?)/.test(note)) {
    return `${name} is the keeper talking point`;
  }

  if (/(set-piece|crosses|aerial|second balls)/.test(note)) {
    return `${name} makes dead-ball moments interesting`;
  }

  if (/(finisher|striker|shot threat|penalty-box|focal)/.test(note)) {
    return `${name} carries the finishing thread`;
  }

  if (/(explosive|runner|ball-carrier|behind the defensive line|route behind)/.test(note)) {
    return `${name} is the burst-of-pace angle`;
  }

  if (/(captain|organizer|anchor|shield|tempo setter)/.test(note)) {
    return `${name} is the control point`;
  }

  return `${name} is the name to know`;
}

function getCatchUpScore(match) {
  const home = Number(match.score?.home);
  const away = Number(match.score?.away);

  if (!Number.isFinite(home) || !Number.isFinite(away)) {
    return null;
  }

  return { home, away };
}

function getCatchUpContext(match) {
  if (match.stage === "group") {
    return getGroup(match.groupId)?.label || `Group ${match.groupId}`;
  }

  return tournament.stages.find((stage) => stage.id === match.stage)?.label || match.stage;
}

function isKnockoutResultMatch(match) {
  if (!match || match.stage === "group") {
    return false;
  }

  const stage = tournament.stages.find((stageItem) => stageItem.id === match.stage);
  return stage?.type === "knockout" || /(?:round-of|quarter|semi|final|bronze)/i.test(match.stage || "");
}

function getResultExplicitWinnerSide(match) {
  const winnerValue = String(match?.winnerTeamId || match?.winner || "").trim();

  if (!winnerValue) {
    return "";
  }

  const winnerKey = normalizeTextKey(winnerValue);
  const sides = ["home", "away"];
  return sides.find((side) => {
    const team = match?.[`${side}Team`];
    return [team?.id, team?.name, team?.officialName, team?.standingName].some(
      (value) => normalizeTextKey(value) === winnerKey
    );
  }) || "";
}

function getResultWinnerSide(match, score) {
  return (
    getScoreWinnerSide(match?.scoreDetails?.penalties?.home, match?.scoreDetails?.penalties?.away) ||
    getResultExplicitWinnerSide(match) ||
    getScoreWinnerSide(score?.home, score?.away)
  );
}

function getResultScorePairForSide(pair, side) {
  if (!pair) {
    return "";
  }

  const home = Number(pair.home);
  const away = Number(pair.away);
  if (!Number.isFinite(home) || !Number.isFinite(away)) {
    return "";
  }

  return side === "away" ? `${away}-${home}` : `${home}-${away}`;
}

function getResultNextKnockoutStageLabel(match) {
  const targets = {
    "round-of-32": "Round of 16",
    "round-of-16": "Quarter-finals",
    "quarter-finals": "Semi-finals",
    "semi-finals": "Final"
  };

  return targets[match?.stage] || "";
}

function getResultSourceForMatch(match) {
  const sourceMatchText = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
  const sourceMatchKey = normalizeTextKey(sourceMatchText);
  const sourcePairKey = normalizeTextKey(`${match.homeTeam.name} ${match.awayTeam.name}`);
  const sourceResultPattern = /result|final score|match report|highlights/i;
  const usableSourceTypes = new Set(["cross-check", "official"]);

  return (tournament.sources || []).find((source) => {
    if (!source.url || !usableSourceTypes.has(source.type) || !sourceResultPattern.test(source.label)) {
      return false;
    }

    const sourceText = normalizeTextKey(`${source.id} ${source.label} ${source.url}`);
    return sourceText.includes(sourceMatchKey) || sourceText.includes(sourcePairKey);
  });
}

function getResultSourceFields(match) {
  const source = getResultSourceForMatch(match);

  return source
    ? {
        sourceLabel: source.label,
        sourceUrl: source.url
      }
    : {};
}

function getResultCatchUpHighlights(match) {
  const authoredHighlights = Array.isArray(match.resultHighlights)
    ? match.resultHighlights.filter((highlight) => typeof highlight === "string" && highlight.trim())
    : [];

  return authoredHighlights.length ? authoredHighlights : getGeneratedCatchUpResultHighlights(match);
}

function getResultCatchUpStandouts(match) {
  return getResultCatchUpHighlights(match)
    .filter((highlight) => typeof highlight === "string" && highlight.trim())
    .filter((highlight) => !isResultScorelineHighlight(highlight))
    .map((highlight) => highlight.trim())
    .filter(Boolean)
    .slice(0, 2);
}

function getResultCatchUpItem(match) {
  const score = getCatchUpScore(match);
  const meta = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
  const dateKey = getFixtureDayKey(match);
  const sortValue = getFixtureSortValue(match);
  const context = getCatchUpContext(match);
  const mentionPlayers = getMatchMentionPlayers(match, match.keyInformation || {});

  if (match.status === "LIVE") {
    if (!score) {
      return {
        dateKey,
        headline: `${match.homeTeam.name} vs ${match.awayTeam.name} is underway`,
        body: `${context} has moved from preview mode into live tournament business.`,
        mentionPlayers,
        meta,
        priority: 18,
        sortValue
      };
    }

    const leaderSide = getScoreWinnerSide(score.home, score.away);
    if (!leaderSide) {
      return {
        dateKey,
        headline: `${match.homeTeam.name} and ${match.awayTeam.name} are trading momentum`,
        body: `It is ${score.home}-${score.away} live, with both sides close enough for one moment to change the story.`,
        mentionPlayers,
        meta,
        priority: 16,
        sortValue
      };
    }

    const leader = leaderSide === "home" ? match.homeTeam : match.awayTeam;
    const chaser = leaderSide === "home" ? match.awayTeam : match.homeTeam;
    const leaderScore = leaderSide === "home" ? score.home : score.away;
    const chaserScore = leaderSide === "home" ? score.away : score.home;

    return {
      dateKey,
      headline: `${leader.name} lead ${chaser.name} for now`,
      body: `${leader.name} lead ${leaderScore}-${chaserScore}, but ${chaser.name} still have time to pull the match back.`,
      mentionPlayers,
      meta,
      priority: 16,
      sortValue
    };
  }

  if (match.status !== "FT" || !score) {
    return null;
  }

  const isKnockout = isKnockoutResultMatch(match);
  const winnerSide = getResultWinnerSide(match, score);

  if (!winnerSide) {
    const headline = isKnockout
      ? `${match.homeTeam.name} and ${match.awayTeam.name} await the knockout winner`
      : `${match.homeTeam.name} and ${match.awayTeam.name} split the points`;
    const body = isKnockout
      ? `${score.home}-${score.away} is loaded for ${context}, but the knockout winner is not loaded yet.`
      : `${score.home}-${score.away} keeps ${context} open and gives both teams something to carry into the next match.`;

    return {
      dateKey,
      headline,
      body,
      standouts: getResultCatchUpStandouts(match),
      mentionPlayers,
      meta,
      ...getResultSourceFields(match),
      priority: 28,
      sortValue
    };
  }

  const winner = winnerSide === "home" ? match.homeTeam : match.awayTeam;
  const loser = winnerSide === "home" ? match.awayTeam : match.homeTeam;
  const winnerScore = winnerSide === "home" ? score.home : score.away;
  const loserScore = winnerSide === "home" ? score.away : score.home;
  const margin = winnerScore - loserScore;
  const nextStage = getResultNextKnockoutStageLabel(match);
  const penaltyText = getResultScorePairForSide(match.scoreDetails?.penalties, winnerSide);
  const scoreText = `${winnerScore}-${loserScore}`;
  const knockoutHeadline = getKnockoutResultCatchUpHeadline(match, winner, loser, margin, penaltyText, nextStage);
  const headline =
    isKnockout && knockoutHeadline
      ? knockoutHeadline
      : margin >= 3
      ? `${winner.name} make a statement against ${loser.name}`
      : margin === 2
        ? `${winner.name} look sharp against ${loser.name}`
        : `${winner.name} narrowly beat ${loser.name}`;
  const body =
    isKnockout
      ? getKnockoutResultCatchUpBody(match, winner, loser, score, scoreText, penaltyText, nextStage, context)
      : `${winner.name}'s ${scoreText} win gives them an early foothold in ${context}.`;

  return {
    dateKey,
    headline,
    body,
    standouts: getResultCatchUpStandouts(match),
    mentionPlayers,
    meta,
    ...getResultSourceFields(match),
    priority: 28,
    sortValue
  };
}

function getCatchUpPlayerBody(player, team) {
  const note = getPlayerNote(player);
  const name = getPlayerName(player);

  if (/world cup piece missing from his resume/i.test(note)) {
    return `${name} is still Portugal's biggest name near goal, and the World Cup is still missing from his career.`;
  }

  if (/penalty-box reference/i.test(note)) {
    return note
      .replace(/headline finisher and penalty-box reference point/i, "main scorer")
      .replace(/penalty-box reference and aerial finisher/i, "main target near goal")
      .replace(/penalty-box reference and power finisher/i, "main scorer near goal");
  }

  if (note) {
    return note;
  }

  return `${name} is part of ${team.name}'s core match plan.`;
}

function getPrimaryCatchUpPlayer(match) {
  const players = [
    ...(match.keyPlayers?.home || []).map((player) => ({
      player,
      team: match.homeTeam
    })),
    ...(match.keyPlayers?.away || []).map((player) => ({
      player,
      team: match.awayTeam
    }))
  ].filter(({ player }) => getPlayerName(player));

  return (
    players.find(({ player }) =>
      /(keeper|shot-stopper|goalkeeper|saves?)/i.test(getPlayerNote(player))
    ) ||
    players.find(({ player }) =>
      /(finisher|striker|shot threat|penalty-box|set-piece|explosive)/i.test(
        getPlayerNote(player)
      )
    ) ||
    players[0]
  );
}

function getSeriesCatchUpItem(match) {
  const summary = match.h2h?.summary || "";
  const dateKey = getFixtureDayKey(match);

  if (/never met|first head-to-head/i.test(summary)) {
    return {
      dateKey,
      headline: `${match.homeTeam.name} and ${match.awayTeam.name} have no shared script`,
      body: summary,
      meta: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
      priority: 50,
      sortValue: getFixtureSortValue(match)
    };
  }

  if (/level/i.test(summary)) {
    return {
      dateKey,
      headline: `${match.homeTeam.name} vs ${match.awayTeam.name} is basically even historically`,
      body: summary,
      meta: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
      priority: 65,
      sortValue: getFixtureSortValue(match)
    };
  }

  return null;
}

function getUpsetCatchUpItem(match) {
  if (!match.homeTeam.fifaRank || !match.awayTeam.fifaRank) {
    return null;
  }

  const homeRank = Number(match.homeTeam.fifaRank);
  const awayRank = Number(match.awayTeam.fifaRank);
  const gap = Math.abs(homeRank - awayRank);

  if (!Number.isFinite(gap) || gap < 18) {
    return null;
  }

  const favorite = homeRank < awayRank ? match.homeTeam : match.awayTeam;
  const chaser = homeRank < awayRank ? match.awayTeam : match.homeTeam;

  return {
    dateKey: getFixtureDayKey(match),
    headline: `${chaser.name} have the upset-watch angle`,
    body: `${favorite.name} enter with the stronger FIFA ranking, so ${chaser.name} only need a few loud moments to become the conversation.`,
    meta: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
    priority: 70,
    sortValue: getFixtureSortValue(match)
  };
}

function getGeneratedCatchUpItems(match) {
  const resultItem = getResultCatchUpItem(match);
  return resultItem ? [resultItem] : [];
}

function shiftDayKey(dayKey, days) {
  const date = getDateFromKey(dayKey);
  date.setUTCDate(date.getUTCDate() + days);
  return getDayKeyFromDate(date);
}

function getCatchUpWindowDayKeys() {
  const todayKey = getDayKey(new Date(), selectedTimeZone);
  return [shiftDayKey(todayKey, -1), todayKey];
}

function hasMatchStarted(match) {
  return match.status === "FT" || match.status === "LIVE";
}

function getCatchUpMatchRank(match) {
  if (match.status === "LIVE") {
    return 0;
  }

  if (match.status === "FT") {
    return 1;
  }

  return 2;
}

function compareCatchUpItemsByRecency(a, b) {
  return (
    (b.sortValue || "").localeCompare(a.sortValue || "") ||
    (b.dateKey || "").localeCompare(a.dateKey || "") ||
    (a.priority ?? 99) - (b.priority ?? 99) ||
    getCanonicalCatchUpCopyText(a.headline).localeCompare(getCanonicalCatchUpCopyText(b.headline))
  );
}

function getCatchUpItems() {
  const dayKeys = new Set(getCatchUpWindowDayKeys());
  const matchItems = fixtures
    .filter((fixture) => dayKeys.has(getFixtureDayKey(fixture)) && hasMatchStarted(fixture))
    .sort(
      (a, b) =>
        getCatchUpMatchRank(a) - getCatchUpMatchRank(b) ||
        getFixtureSortValue(b).localeCompare(getFixtureSortValue(a))
    )
    .map(hydrateFixture)
    .flatMap((match) => {
      const authoredItems = getAuthoredCatchUpItems(match);
      return authoredItems.length ? authoredItems : getGeneratedCatchUpItems(match);
    });

  return [...getTournamentCatchUpItems(dayKeys), ...matchItems]
    .sort(compareCatchUpItemsByRecency)
    .slice(0, 5);
}

function stripCatchUpDescriptionMarker(text) {
  return String(text || "").trim().replace(/^(?:⚽|🔥|🛡️|🧤|🌟|📊)\s*/u, "");
}

function getCatchUpDescriptionParts(item) {
  const standouts = Array.isArray(item.standouts) ? item.standouts : [];
  const seen = new Set();

  return [item.body, ...standouts]
    .filter((part) => getCanonicalCatchUpCopyText(part))
    .filter((part) => {
      const key = stripCatchUpDescriptionMarker(getCanonicalCatchUpCopyText(part)).toLowerCase();
      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

function renderCatchUpDescription(item) {
  const description = getCatchUpDescriptionParts(item)
    .map((part) => stripCatchUpDescriptionMarker(getLocalizedCatchUpCopyText(part)))
    .filter(Boolean)
    .join(" ");
  const mentionPlayers = item.mentionPlayers || [];

  return description
    ? `<p class="catch-up-subtitle">${renderPlayerLinkedText(description, mentionPlayers)}</p>`
    : "";
}

function renderCatchUpItem(item) {
  const headline = getLocalizedCatchUpCopyText(item.headline);
  const sourceLabel = item.sourceLabel ? getLocalizedCatchUpCopyText(item.sourceLabel) : localizeText("Read source");
  const sourceLink = item.sourceUrl
    ? `<a class="catch-up-source" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(sourceLabel)}" title="${escapeHtml(sourceLabel)}"><span aria-hidden="true">&#8599;</span></a>`
    : "";

  return `
    <article class="catch-up-item">
      <div class="catch-up-copy">
        <div class="catch-up-title-row">
          <h3 title="${escapeHtml(headline)}"><span>${escapeHtml(headline)}</span></h3>
          ${sourceLink}
        </div>
        ${renderCatchUpDescription(item)}
      </div>
    </article>
  `;
}

function renderCatchUpGroup(dateKey, items) {
  const groupDate = getDateFromKey(dateKey || selectedDayKey);
  return `
    <section class="catch-up-group" aria-label="${escapeHtml(
      catchUpItemLeadDateFormatter.format(groupDate)
    )}">
      <time class="catch-up-group-date" datetime="${escapeHtml(dateKey || selectedDayKey)}">${escapeHtml(
        catchUpItemLeadDateFormatter.format(groupDate)
      )}</time>
      <div class="catch-up-group-items">
        ${items.map(renderCatchUpItem).join("")}
      </div>
    </section>
  `;
}

function renderCatchUpGroups(items) {
  const groups = [];

  for (const item of items) {
    const dateKey = item.dateKey || selectedDayKey;
    const latestGroup = groups[groups.length - 1];
    if (latestGroup?.dateKey === dateKey) {
      latestGroup.items.push(item);
    } else {
      groups.push({ dateKey, items: [item] });
    }
  }

  return groups.map((group) => renderCatchUpGroup(group.dateKey, group.items)).join("");
}

function isCatchUpLoading() {
  return isInitialDataLoading || isInitialLiveDataLoading;
}

function renderCatchUpLoadingState() {
  if (!catchUpList) {
    return;
  }

  catchUpList.setAttribute("aria-busy", "true");
  catchUpList.innerHTML = `
    <section class="catch-up-group catch-up-loading" role="status">
      <p class="visually-hidden">${escapeHtml(localizeText("Loading catch-up notes"))}</p>
      <span class="match-loading-line catch-up-loading-date" aria-hidden="true"></span>
      <div class="catch-up-group-items" aria-hidden="true">
        ${Array.from({ length: 3 }, (_, index) => `
          <article class="catch-up-item catch-up-loading-item">
            <div class="catch-up-copy">
              <span class="match-loading-line catch-up-loading-title"></span>
              <span class="match-loading-line catch-up-loading-subtitle"></span>
              <span class="match-loading-line catch-up-loading-subtitle ${index === 2 ? "is-short" : ""}"></span>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderCatchUp() {
  if (!catchUpList) {
    return;
  }

  if (isCatchUpLoading()) {
    renderCatchUpLoadingState();
    return;
  }

  catchUpList.removeAttribute("aria-busy");

  const dayKeys = getCatchUpWindowDayKeys();
  const latestKey = dayKeys.at(-1) || selectedDayKey;
  const latestDate = getDateFromKey(latestKey);
  const items = getCatchUpItems();

  catchUpList.innerHTML = items.length
    ? renderCatchUpGroups(items)
    : `
      <section class="catch-up-group" aria-label="${escapeHtml(
        catchUpItemLeadDateFormatter.format(latestDate)
      )}">
        <time class="catch-up-group-date" datetime="${escapeHtml(latestKey)}">${escapeHtml(
          catchUpItemLeadDateFormatter.format(latestDate)
        )}</time>
        <div class="catch-up-group-items">
          <article class="catch-up-item">
            <div class="catch-up-copy">
              <div class="catch-up-title-row">
                <h3><span>${escapeHtml(localizeText("No catch-up notes loaded yet"))}</span></h3>
              </div>
              <p class="catch-up-subtitle">${escapeHtml(localizeText("Yesterday and today do not have finished or live match notes yet."))}</p>
            </div>
          </article>
        </div>
      </section>
    `;
}

function cancelScheduledCatchUpRender() {
  catchUpRenderToken += 1;

  if (catchUpRenderFrameId) {
    window.cancelAnimationFrame(catchUpRenderFrameId);
    catchUpRenderFrameId = 0;
  }

  if (catchUpRenderTimeoutId) {
    window.clearTimeout(catchUpRenderTimeoutId);
    catchUpRenderTimeoutId = 0;
  }
}

function scheduleCatchUpRender() {
  cancelScheduledCatchUpRender();
  const renderToken = catchUpRenderToken;

  catchUpRenderFrameId = window.requestAnimationFrame(() => {
    catchUpRenderFrameId = 0;
    catchUpRenderTimeoutId = window.setTimeout(() => {
      catchUpRenderTimeoutId = 0;

      if (!isCatchUpOpen || renderToken !== catchUpRenderToken) {
        return;
      }

      renderCatchUp();
      positionCatchUpPopover();
    }, 0);
  });
}

function positionCatchUpPopover() {
  if (!catchUpButton || !catchUpPopover || !isCatchUpOpen) {
    return;
  }

  const viewportGap = 18;
  const buttonRect = catchUpButton.getBoundingClientRect();
  const popoverRect = catchUpPopover.getBoundingClientRect();
  const popoverWidth = popoverRect.width;
  const buttonCenter = buttonRect.left + buttonRect.width / 2;
  const minLeft = viewportGap;
  const maxLeft = Math.max(minLeft, window.innerWidth - popoverWidth - viewportGap);
  const centeredLeft = buttonCenter - popoverWidth / 2;
  const left = Math.min(Math.max(centeredLeft, minLeft), maxLeft);
  const top = buttonRect.bottom + 12;

  catchUpPopover.style.setProperty("--catch-up-popover-left", `${left}px`);
  catchUpPopover.style.setProperty("--catch-up-popover-top", `${top}px`);
}

function setCatchUpOpen(isOpen) {
  isCatchUpOpen = isOpen;
  catchUpPopover.classList.toggle("is-hidden", !isOpen);
  catchUpButton.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    setCalendarOpen(false);
    setSettingsOpen(false);
    setStandingsYearOpen(false);
    renderCatchUpLoadingState();
    positionCatchUpPopover();
    scheduleCatchUpRender();
  } else {
    cancelScheduledCatchUpRender();
    hideFloatingPlayerCard();
  }
}

function setSettingsOpen(isOpen) {
  if (!settingsButton || !settingsPopover) {
    return;
  }

  isSettingsOpen = isOpen;
  settingsPopover.classList.toggle("is-hidden", !isOpen);
  settingsButton.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    setCalendarOpen(false);
    setCatchUpOpen(false);
    setStandingsYearOpen(false);
    setTeamSearchOpen(false, { focus: false });
    queueTabIndicatorUpdate();
  }
}

function updateTeamSearchControls() {
  if (!teamSearch || !teamSearchInput || !teamSearchToggle || !teamSearchClear) {
    return;
  }

  const query = getTeamSearchQuery();
  const isActive = isTeamSearchOpen || query.length > 0;
  teamSearch.classList.toggle("is-active", isActive);
  teamSearch.classList.toggle("has-value", query.length > 0);
  teamSearchInput.value = teamSearchQuery;
  teamSearchToggle.setAttribute("aria-expanded", String(isActive));
  teamSearchClear.classList.toggle("is-hidden", query.length === 0);
}

function cancelPendingTeamSearchRender() {
  if (!pendingTeamSearchRenderFrame) {
    return;
  }

  window.cancelAnimationFrame(pendingTeamSearchRenderFrame);
  pendingTeamSearchRenderFrame = 0;
}

function scheduleTeamSearchRender(options = {}) {
  if (pendingTeamSearchRenderFrame) {
    return;
  }

  pendingTeamSearchRenderFrame = window.requestAnimationFrame(() => {
    pendingTeamSearchRenderFrame = 0;

    if (isInitialDataLoading || isInitialLiveDataLoading || !hasTeamSearchQuery()) {
      renderSchedule(options);
      return;
    }

    setYesterdayLayoutOffset(false);
    renderTeamSearchResults({ ...options, debounceUrl: true });
  });
}

function setTeamSearchOpen(isOpen, options = {}) {
  isTeamSearchOpen = isOpen || hasTeamSearchQuery();
  updateTeamSearchControls();

  if (isTeamSearchOpen && options.focus !== false) {
    window.setTimeout(() => teamSearchInput?.focus(), 0);
  }
}

function clearTeamSearch(options = {}) {
  cancelPendingTeamSearchRender();
  teamSearchQuery = "";
  isShowingOlderTeamMatches = false;
  isTeamSearchOpen = false;
  updateTeamSearchControls();

  if (options.focus) {
    teamSearchInput?.focus();
    setTeamSearchOpen(true, { focus: false });
  }

  if (options.render !== false) {
    renderSchedule(options);
  }
}

function clearPendingUrlStateUpdate() {
  if (!pendingUrlStateUpdateId) {
    return;
  }

  window.clearTimeout(pendingUrlStateUpdateId);
  pendingUrlStateUpdateId = 0;
}

function getUrlHistoryMode(options = {}) {
  return options.historyMode === "push" ? "push" : "replace";
}

function applyUrlState(options = {}) {
  if (!syncUrl) {
    return;
  }

  const params = new URLSearchParams();
  const todayKey = getDayKey(new Date(), selectedTimeZone);

  if (activeView !== "matches") {
    params.set("view", activeView);
  }

  if (activeView === "matches" && hasTeamSearchQuery()) {
    params.set("team", getTeamSearchQuery());
  } else if (activeView === "matches" && selectedDayKey !== todayKey) {
    params.set("date", selectedDayKey);
  }

  if (activeView === "matches" && activeMatchId && !hasTeamSearchQuery()) {
    params.set("match", activeMatchId);
  }

  if (selectedTimeZone !== defaultTimeZone) {
    params.set("tz", selectedTimeZone);
  }

  if (currentLanguage !== DEFAULT_LANGUAGE) {
    params.set("lang", currentLanguage);
  }

  if (isLineupVisualPrototypePreviewRequested) {
    params.set("lineups", "preview");
  }

  if (activeView === "standings" && selectedStandingsYear !== CURRENT_STANDINGS_YEAR) {
    params.set("standingsYear", String(selectedStandingsYear));
  }

  if (activeView === "standings") {
    const defaultStandingsMode = getDefaultStandingsModeForYear(selectedStandingsYear);

    if (selectedStandingsMode !== defaultStandingsMode) {
      params.set("standingsMode", selectedStandingsMode);
    }
  }

  const queryString = params.toString();
  const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl !== currentUrl) {
    if (getUrlHistoryMode(options) === "push") {
      window.history.pushState(null, "", nextUrl);
    } else {
      window.history.replaceState(null, "", nextUrl);
    }
  }
}

function updateUrlState(options = {}) {
  clearPendingUrlStateUpdate();
  applyUrlState(options);
}

function scheduleUrlStateUpdate(options = {}) {
  if (!syncUrl) {
    return;
  }

  clearPendingUrlStateUpdate();
  pendingUrlStateUpdateId = window.setTimeout(() => {
    pendingUrlStateUpdateId = 0;
    applyUrlState(options);
  }, TEAM_SEARCH_URL_UPDATE_DELAY_MS);
}

function renderInitialLoadingState() {
  renderMatchLoadingState();
  renderStandingsLoadingState();
  renderCatchUpLoadingState();
  renderReleaseTooltipLoadingState();
}

function renderSchedule(options = {}) {
  cancelPendingTeamSearchRender();

  if (isInitialDataLoading || isInitialLiveDataLoading) {
    setYesterdayLayoutOffset(false);
    setLiveTodayMatchFocus(false);
    updateDateControls();
    updateTeamSearchControls();
    renderMatchLoadingState();
    updateUrlState(options);
    return;
  }

  matchList.removeAttribute("aria-busy");

  if (hasTeamSearchQuery()) {
    setYesterdayLayoutOffset(false);
    setLiveTodayMatchFocus(false);
    renderTeamSearchResults(options);
    return;
  }

  const currentTime = Date.now();
  const todayMatches = getMatchesForSelectedDay();
  const yesterdayMatches = shouldShowYesterdayMatches ? getYesterdayMatches(currentTime) : [];
  const yesterdaySection = createYesterdayMatchesSection(yesterdayMatches, currentTime);
  setYesterdayLayoutOffset(!shouldShowYesterdayMatches && todayMatches.length > 0);
  const liveMatchIds = getLiveMatchIds(currentTime);
  const selectedIsToday = selectedDayKey === getDayKey(new Date(), selectedTimeZone);
  const nextMatchIds = selectedIsToday ? getNextMatchIds(currentTime, liveMatchIds) : new Set();

  updateDateControls();
  if (isCatchUpOpen) {
    renderCatchUp();
  }

  if (todayMatches.length === 0) {
    if (!yesterdaySection) {
      setYesterdayLayoutOffset(false);
      setLiveTodayMatchFocus(false);
      renderEmptyState();
      updateUrlState(options);
      return;
    }

    setLiveTodayMatchFocus(false);
    matchList.replaceChildren(createEmptyStateElement(), yesterdaySection);
    const activeMatch = yesterdayMatches.find((match) => match.id === activeMatchId);
    if (activeMatch) {
      renderMatchInfo(activeMatch);
    } else {
      renderMatchInfoPrompt();
    }
    updateWrappedMatchRows(matchList);
    updateTruncatedTeamTooltips(matchList);
    updateTooltipBounds(matchList);
    updateUrlState(options);
    return;
  }

  const todayRows = todayMatches.map((match) => ({
    match,
    state: getMatchState(match, nextMatchIds, currentTime)
  }));
  const tournamentContext = createTournamentProgressionContext();
  setLiveTodayMatchFocus(selectedIsToday && todayRows.some(({ state }) => state === "live"));
  matchList.replaceChildren(
    ...todayRows.map(({ match, state }) => renderMatchRow(match, state, currentTime, { tournamentContext })),
    ...(yesterdaySection ? [yesterdaySection] : [])
  );
  const activeMatch = [...todayMatches, ...yesterdayMatches].find(
    (match) => match.id === activeMatchId
  );

  if (activeMatch) {
    renderMatchInfo(activeMatch);
  } else {
    renderMatchInfoPrompt();
  }

  updateWrappedMatchRows(matchList);
  updateTruncatedTeamTooltips(matchList);
  updateTooltipBounds(matchList);
  updateUrlState(options);
}

function updateActiveViewElements() {
  viewTabs.forEach((tab) => {
    const isActive = tab.dataset.view === activeView;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });
  Object.entries(viewPanels).forEach(([panelView, panel]) => {
    panel.classList.toggle("is-hidden", panelView !== activeView);
    panel.hidden = panelView !== activeView;
  });
  updateTabIndicators();
}

function setActiveView(view, options = {}) {
  activeView = view === "standings" ? "standings" : "matches";
  updateActiveViewElements();
  updateWrappedMatchRows(viewPanels.matches);
  updateTruncatedTeamTooltips(viewPanels.matches);
  updateStandingNameTooltips(standingsGrid);
  updateTooltipBounds(viewPanels.matches);
  updateTooltipBounds(standingsGrid);
  if (activeView === "standings") {
    scheduleTournamentConnectorUpdate();
  }
  updateUrlState(options);
}

function readInitialChromeState() {
  const params = new URLSearchParams(window.location.search);
  const requestedTimeZone = params.get("tz");
  const requestedView = params.get("view");
  const requestedStandingsYear = params.get("standingsYear") || params.get("year");
  const requestedStandingsMode = params.get("standingsMode") || params.get("standings");

  if (requestedTimeZone && timeZones.includes(requestedTimeZone)) {
    selectedTimeZone = requestedTimeZone;
    storeTimeZone(selectedTimeZone);
    selectedDayKey = getDayKey(initialDate, selectedTimeZone);
    calendarMonthKey = getMonthKeyFromDayKey(selectedDayKey);
  }

  activeView = requestedView === "standings" ? "standings" : "matches";
  selectedStandingsYear = getValidStandingsYear(requestedStandingsYear);
  selectedStandingsMode = getValidStandingsMode(
    requestedStandingsMode,
    null,
    selectedStandingsYear
  );
}

function readUrlState(options = {}) {
  const params = new URLSearchParams(window.location.search);
  const requestedTimeZone = params.get("tz");
  const requestedLanguage = normalizeLanguage(params.get("lang"));
  const requestedDate = params.get("date");
  const requestedTeam = params.get("team") || params.get("country");
  const requestedMatchId = params.get("match") || params.get("matchId");
  const requestedView = params.get("view");
  const requestedStandingsYear = params.get("standingsYear") || params.get("year");
  const requestedStandingsMode = params.get("standingsMode") || params.get("standings");
  const nextActiveView = requestedView === "standings" ? "standings" : "matches";
  const requestedMatch =
    nextActiveView === "matches" && !requestedTeam ? getFixtureById(requestedMatchId) : null;
  const shouldUseRequestedDate = !options.forceToday && isDayKey(requestedDate);
  const shouldUseUrlDefaults = options.useUrlDefaults === true;

  if (requestedTimeZone && timeZones.includes(requestedTimeZone)) {
    selectedTimeZone = requestedTimeZone;
    storeTimeZone(selectedTimeZone);
  } else if (shouldUseUrlDefaults) {
    selectedTimeZone = defaultTimeZone;
    storeTimeZone(selectedTimeZone);
  }

  if (requestedLanguage) {
    currentLanguage = requestedLanguage;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  } else if (shouldUseUrlDefaults) {
    currentLanguage = DEFAULT_LANGUAGE;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  }

  if (requestedMatch) {
    selectedDayKey = getFixtureDayKey(requestedMatch);
  } else if (shouldUseRequestedDate) {
    selectedDayKey = requestedDate;
  } else {
    selectedDayKey = getDayKey(new Date(), selectedTimeZone);
  }

  activeView = nextActiveView;
  teamSearchQuery = activeView === "matches" ? String(requestedTeam || "").trim() : "";
  isTeamSearchOpen = teamSearchQuery.length > 0;
  isShowingOlderTeamMatches = false;
  activeMatchId = activeView === "matches" && !isTeamSearchOpen ? requestedMatch?.id || "" : "";
  selectedStandingsYear = getValidStandingsYear(requestedStandingsYear);
  selectedStandingsMode = getValidStandingsMode(
    requestedStandingsMode,
    null,
    selectedStandingsYear
  );
}

function getLatestReleaseNote() {
  const releases = Array.isArray(releaseNotes.releases) ? releaseNotes.releases : [];
  return releases
    .filter((release) => release && typeof release === "object")
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0];
}

function getReleaseNoteTitle(releaseNote) {
  if (currentLanguage === "zh") {
    return String(releaseNote?.titleZh || "").trim() || localizeText(releaseNote?.title || "Latest changes");
  }

  return String(releaseNote?.title || "").trim() || "Latest changes";
}

function getReleaseNoteHighlights(releaseNote) {
  const hasLocalizedHighlights = currentLanguage === "zh" && Array.isArray(releaseNote?.highlightsZh);
  const sourceHighlights = hasLocalizedHighlights ? releaseNote.highlightsZh : releaseNote?.highlights;
  const highlights = Array.isArray(sourceHighlights)
    ? sourceHighlights.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3)
    : [];

  if (highlights.length) {
    return currentLanguage === "zh" && !hasLocalizedHighlights ? highlights.map(localizeText) : highlights;
  }

  return [
    "Footer stays short while sources and release notes open on hover.",
    "Release notes explain app changes; Data refreshed only shows data freshness.",
    "Source links stay available inside the tooltip."
  ].map(localizeText);
}

function getReleaseTooltipLoadingMarkup() {
  return `
    <strong>${escapeHtml(localizeText("Latest changes"))}</strong>
    <span class="release-tooltip-loading" role="status">
      <span class="visually-hidden">${escapeHtml(localizeText("Loading release notes"))}</span>
      ${Array.from({ length: 3 }, (_, index) => `
        <span class="release-tooltip-loading-row" aria-hidden="true">
          <span class="release-tooltip-loading-dot"></span>
          <span class="match-loading-line release-tooltip-loading-line ${index === 2 ? "is-short" : ""}"></span>
        </span>
      `).join("")}
    </span>
  `.trim();
}

function renderReleaseTooltipLoadingState() {
  const releaseTooltip = document.querySelector("#release-tooltip");

  if (!releaseTooltip) {
    return;
  }

  releaseTooltip.classList.add("is-loading");
  releaseTooltip.setAttribute("aria-busy", "true");
  releaseTooltip.innerHTML = getReleaseTooltipLoadingMarkup();
}

function getReleaseTooltipMarkup() {
  if (isReleaseNotesLoading) {
    return getReleaseTooltipLoadingMarkup();
  }

  const latestReleaseNote = getLatestReleaseNote();
  const releaseTooltipTitle = getReleaseNoteTitle(latestReleaseNote);
  const releaseTooltipItems = getReleaseNoteHighlights(latestReleaseNote);

  return `
    <strong>${escapeHtml(releaseTooltipTitle)}</strong>
    <ul>
      ${releaseTooltipItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `.trim();
}

function renderSourceNote() {
  const compactSourceLabels = {
    "FIFA World Cup 2026 schedule": "FIFA schedule",
    "FIFA World Cup 2026 schedule and results": "FIFA schedule",
    "FIFA World Cup 2026 debutants": "debutants",
    "FIFA/Coca-Cola Men's World Ranking": "ranking",
    "FIFA World Cup 2026 standings": "standings"
  };
  const coreSourceLabels = new Set(Object.keys(compactSourceLabels));
  const coreOfficialSources = tournament.sources.filter(
    (source) => source.type === "official" && coreSourceLabels.has(source.label)
  );
  const officialSourceLinks = coreOfficialSources.map((source) => {
    const label = localizeDisplayText(compactSourceLabels[source.label] ?? source.label);
    return source.url
      ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
      : escapeHtml(label);
  });
  const updatedAtText = formatSiteUpdatedAt(siteUpdatedAt);
  const sentenceEnd = currentLanguage === "zh" ? "。" : ".";
  const predictionsText = localizeText("Predictions are unofficial.");
  const dataRefreshed = updatedAtText
    ? currentLanguage === "zh"
      ? `${localizeText("Data refreshed")} ${escapeHtml(updatedAtText)}。`
      : `${localizeText("Data refreshed")} ${escapeHtml(updatedAtText)}.`
    : "";
  const reportIssueText = localizeText("Report issue");
  const seeSourcesText = localizeText("See sources");
  const releaseNotesText = localizeText("See release notes");
  const creatorLink = `<a href="https://www.linkedin.com/in/hirooaoy" target="_blank" rel="noreferrer">H</a>`;
  const creatorText = currentLanguage === "zh" ? `由 ${creatorLink} 制作` : `Made by ${creatorLink}`;

  const reportUrl = currentLanguage === "zh" ? "report.html?lang=zh" : "report.html";
  const sourceTooltipTitle = currentLanguage === "zh" ? "来源" : "Sources";
  const sourceTooltip = `
    <span class="source-tooltip-wrapper">
      <button class="source-tooltip-trigger" type="button" aria-describedby="source-tooltip">${escapeHtml(seeSourcesText)}</button>${sentenceEnd}
      <span class="source-tooltip" id="source-tooltip" role="tooltip">
        <strong>${escapeHtml(sourceTooltipTitle)}</strong>
        <span>${officialSourceLinks.join(" ")}</span>
      </span>
    </span>
  `.trim();
  const releaseTooltipClass = isReleaseNotesLoading ? "release-tooltip is-loading" : "release-tooltip";
  const releaseTooltip = `
    <span class="release-tooltip-wrapper">
      <button class="release-tooltip-trigger" type="button" aria-describedby="release-tooltip">${escapeHtml(releaseNotesText)}</button>${sentenceEnd}
      <span class="${releaseTooltipClass}" id="release-tooltip" role="tooltip" aria-busy="${isReleaseNotesLoading ? "true" : "false"}">
        ${getReleaseTooltipMarkup()}
      </span>
    </span>
  `.trim();
  sourceNote.innerHTML = `${sourceTooltip} ${predictionsText}${dataRefreshed ? ` ${dataRefreshed}` : ""} <a href="${reportUrl}">${escapeHtml(reportIssueText)}</a>${sentenceEnd} ${creatorText}${sentenceEnd} ${releaseTooltip}`;
  updateTooltipBounds(sourceNote);
}

function renderLoadError(error) {
  console.error("Unable to load World Cup data", error);
  isInitialDataLoading = false;
  isInitialLiveDataLoading = false;
  matchList.removeAttribute("aria-busy");
  matchList.innerHTML = `
    <article class="empty-state">
      <h2>${escapeHtml(localizeText("Data unavailable"))}</h2>
      <p>${escapeHtml(localizeText("The match data could not be loaded. Refresh the page to try again."))}</p>
    </article>
  `;
  matchInfo.innerHTML = `<p class="info-empty">${escapeHtml(localizeText("The match data could not be loaded."))}</p>`;
  standingsGrid.classList.remove("is-loading");
  standingsGrid.removeAttribute("aria-busy");
  standingsGrid.innerHTML = `
    <article class="standings-card standings-empty-card">
      <h2>${escapeHtml(localizeText("Data unavailable"))}</h2>
      <p class="past-empty">${escapeHtml(localizeText("The standings data could not be loaded. Refresh the page to try again."))}</p>
    </article>
  `;
  applyLanguageToPage();
}

function renderAppError(error) {
  console.error("Unable to render World Cup data", error);
  isInitialDataLoading = false;
  isInitialLiveDataLoading = false;
  matchList.removeAttribute("aria-busy");
  matchList.innerHTML = `
    <article class="empty-state">
      <h2>${escapeHtml(localizeText("Unable to display matches"))}</h2>
      <p>${escapeHtml(localizeText("The page loaded, but something went wrong while displaying it. Refresh the page to try again."))}</p>
    </article>
  `;
  matchInfo.innerHTML = `<p class="info-empty">${escapeHtml(localizeText("The match view could not be displayed."))}</p>`;
  standingsGrid.classList.remove("is-loading");
  standingsGrid.removeAttribute("aria-busy");
  standingsGrid.innerHTML = `
    <article class="standings-card standings-empty-card">
      <h2>${escapeHtml(localizeText("Unable to display standings"))}</h2>
      <p class="past-empty">${escapeHtml(localizeText("The standings view could not be displayed. Refresh the page to try again."))}</p>
    </article>
  `;
  applyLanguageToPage();
}

function hasLiveDataSnapshot(liveData) {
  return Boolean(
    Array.isArray(liveData?.fixturesData?.fixtures) &&
      liveData?.standingsData?.groups &&
      Array.isArray(liveData?.tournamentData?.groups)
  );
}

function applyDataSnapshot({
  fixturesData,
  historyData,
  historicalPlayerProfilesData,
  playerProfilesData,
  standingsData,
  teamsData,
  tournamentData
}) {
  teamsById = new Map(teamsData.teams.map((team) => [team.id, team]));
  teamsByName = buildTeamNameLookup(teamsData.teams);
  playerProfilesByName = buildPlayerProfileLookup(playerProfilesData.profiles);
  playerProfilesByTeamAndName = buildTeamPlayerProfileLookup(playerProfilesData.profiles);
  {
    const historicalProfileLookups = buildHistoricalPlayerProfileLookups(historicalPlayerProfilesData.profiles);
    historicalPlayerProfilesByName = historicalProfileLookups.byName;
    historicalPlayerProfilesByVersion = historicalProfileLookups.byVersion;
  }
  shouldShowPlayerMarketValues = hasCompletePlayerMarketValues(playerProfilesData);
  fixtures = fixturesData.fixtures;
  history = historyData;
  historicalFixtures = historyData.fixtures || [];
  historicalProjectionCache.clear();
  standingsByGroup = standingsData.groups;
  tournament = tournamentData;
  clearGroupQualificationCaches();
  dataCoverage = fixturesData.coverage || { status: "partial" };
  liveDataCheckedAt = "";
  siteUpdatedAt = getLatestUpdatedAt([
    fixturesData,
    historyData,
    historicalPlayerProfilesData,
    playerProfilesData,
    teamsData,
    standingsData,
    tournamentData
  ]);
  buildTeamSearchIndex();
}

function applyLiveDataSnapshot(liveData) {
  fixtures = liveData.fixturesData.fixtures;
  standingsByGroup = liveData.standingsData.groups;
  tournament = liveData.tournamentData;
  clearGroupQualificationCaches();
  dataCoverage = liveData.fixturesData.coverage || { status: "partial" };
  liveDataCheckedAt = liveData.syncStatus?.checkedAt || liveData.fixturesData.updatedAt || "";
  siteUpdatedAt = getLatestUpdatedAt([
    { updatedAt: siteUpdatedAt },
    liveData.fixturesData,
    liveData.standingsData,
    liveData.tournamentData
  ]);
  buildTeamSearchIndex();
}

async function loadStaticData() {
  const [
    adminMessageData,
    fixturesData,
    historyData,
    historicalPlayerProfilesData,
    playerProfilesData,
    teamsData,
    standingsData,
    tournamentData
  ] = await Promise.all([
    loadOptionalJson(DATA_URLS.adminMessage, { messages: [] }),
    loadJson(DATA_URLS.fixtures),
    loadJson(DATA_URLS.history),
    loadOptionalJson(DATA_URLS.historicalPlayerProfiles, { profiles: {} }),
    loadOptionalJson(DATA_URLS.playerProfiles, { profiles: {} }),
    loadJson(DATA_URLS.teams),
    loadJson(DATA_URLS.standings),
    loadJson(DATA_URLS.tournament)
  ]);

  adminMessages =
    adminMessageData && typeof adminMessageData === "object" && !Array.isArray(adminMessageData)
      ? adminMessageData
      : { messages: [] };
  applyDataSnapshot({
    fixturesData,
    historyData,
    historicalPlayerProfilesData,
    playerProfilesData,
    standingsData,
    teamsData,
    tournamentData
  });
  isInitialDataLoading = false;
}

async function loadReleaseNotes() {
  isReleaseNotesLoading = true;
  renderReleaseTooltipLoadingState();

  releaseNotes = await loadOptionalJson(DATA_URLS.releaseNotes, { releases: [] });
  isReleaseNotesLoading = false;
  renderSourceNote();
}

async function loadLiveData() {
  const liveData = await loadOptionalJson(DATA_URLS.liveData, null, {
    timeoutMs: LIVE_DATA_TIMEOUT_MS
  });

  if (!hasLiveDataSnapshot(liveData)) {
    return false;
  }

  applyLiveDataSnapshot(liveData);
  return true;
}

function renderLoadedApp(options = {}) {
  ensureSelectableSelectedDay();
  selectedStandingsYear = getValidStandingsYear(selectedStandingsYear);
  selectedStandingsMode = getValidStandingsMode(
    selectedStandingsMode,
    getDefaultStandingsModeForYear(selectedStandingsYear),
    selectedStandingsYear
  );
  renderTimeZoneOptions();
  setHeaderControlsLoading(false);
  updateTeamSearchControls();
  renderStandingsView();

  if (options.syncActiveView) {
    setActiveView(activeView);
  }

  renderSchedule();
  renderSourceNote();
  applyLanguageToPage();
}

async function setLanguage(language) {
  const nextLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;

  if (pendingLanguage) {
    return;
  }

  if (nextLanguage === currentLanguage) {
    applyLanguageToPage();
    if (isCatchUpOpen) {
      renderCatchUp();
      positionCatchUpPopover();
    }
    return;
  }

  const requestId = languageSwitchRequestId + 1;
  languageSwitchRequestId = requestId;
  const pendingStartedAt = performance.now();
  setPendingLanguage(nextLanguage);

  try {
    await waitForLanguageSpinnerPaint();

    if (requestId !== languageSwitchRequestId) {
      return;
    }

    currentLanguage = nextLanguage;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
    updateUrlState({ historyMode: "push" });

    const hasLoadedData = fixtures.length || historicalFixtures.length || tournament.groups.length;
    if (hasLoadedData) {
      renderLoadedApp({ syncActiveView: true });
    } else {
      applyLanguageToPage();
    }

    if (isCatchUpOpen) {
      renderCatchUp();
      positionCatchUpPopover();
    }
  } finally {
    await waitForLanguagePendingMinimum(pendingStartedAt);
    if (requestId === languageSwitchRequestId) {
      setPendingLanguage("");
    }
  }
}

async function refreshData() {
  let didUpdate = false;

  try {
    didUpdate = await loadLiveData();
  } catch (error) {
    // Keep the current data visible if a background refresh fails.
    console.warn("Unable to refresh live data", error);
    return;
  }

  if (!didUpdate) {
    return;
  }

  try {
    renderLoadedApp();
  } catch (error) {
    console.error("Unable to render refreshed data", error);
  }
}

async function loadInitialLiveData() {
  try {
    await loadLiveData();
  } catch (error) {
    // Fall back to the bundled snapshot if the first live check is unavailable.
    console.warn("Unable to load initial live data", error);
  } finally {
    isInitialLiveDataLoading = false;
  }

  try {
    renderLoadedApp();
  } catch (error) {
    renderAppError(error);
  }
}

async function boot() {
  try {
    await loadStaticData();
    loadReleaseNotes();
  } catch (error) {
    renderLoadError(error);
    return;
  }

  try {
    readUrlState({ forceToday: isReloadNavigation() });
    isInitialLiveDataLoading = true;
    renderLoadedApp({ syncActiveView: true });
    setInterval(renderSchedule, 60 * 1000);
    setInterval(renderAdminMessage, 60 * 1000);
    setInterval(refreshData, DATA_REFRESH_INTERVAL_MS);
    loadInitialLiveData();
  } catch (error) {
    renderAppError(error);
  }
}

viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveView(tab.dataset.view, { historyMode: "push" });
  });
});

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.language).catch((error) => {
      console.error("Unable to switch language", error);
      setPendingLanguage("");
    });
  });
});

showYesterdayToggle?.addEventListener("change", () => {
  setShowYesterdayMatches(showYesterdayToggle.checked);
});

standingsModeTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    selectStandingsMode(tab.dataset.standingsMode, { historyMode: "push" });
  });
});

standingsGrid.addEventListener("click", (event) => {
  if (shouldIgnoreContainerClickForTooltip(event.target)) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (
    Date.now() < tournamentBoardSuppressClickUntil &&
    event.target instanceof Element &&
    event.target.closest(".tournament-progression")
  ) {
    event.preventDefault();
    tournamentBoardSuppressClickUntil = 0;
    return;
  }

  const groupButton = event.target.closest(".third-place-group-button");

  if (groupButton) {
    openStandingsGroup(groupButton.dataset.groupId, { historyMode: "push" });
    return;
  }

  const matchCard = event.target.closest(".progress-match[data-open-match-id]");

  if (matchCard) {
    openMatchFromTournament(matchCard.dataset.openMatchId);
  }
});
standingsGrid.addEventListener("pointerdown", handleTournamentBoardPointerDown);
standingsGrid.addEventListener("pointermove", handleTournamentBoardPointerMove);
standingsGrid.addEventListener("pointerup", finishTournamentBoardPointerGesture);
standingsGrid.addEventListener("pointercancel", cancelTournamentBoardPointerGesture);
standingsGrid.addEventListener("keydown", (event) => {
  const matchCard = event.target.closest(".progress-match[data-open-match-id]");

  if (matchCard && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openMatchFromTournament(matchCard.dataset.openMatchId);
    return;
  }

  handleTournamentBoardKeydown(event);
});

matchInfo.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-open-tournament-tab]") : null;

  if (target) {
    openTournamentTabFromMatchInfo(target.dataset.tournamentMatchNumber || "");
  }
});

dayLabel.addEventListener("click", () => {
  setCalendarOpen(!isCalendarOpen);
});

teamSearch?.addEventListener("submit", (event) => {
  event.preventDefault();
  teamSearchInput?.blur();
});

teamSearchToggle?.addEventListener("click", () => {
  setCalendarOpen(false);
  setCatchUpOpen(false);
  setSettingsOpen(false);
  setTeamSearchOpen(true);
});

teamSearchInput?.addEventListener("focus", () => {
  setTeamSearchOpen(true, { focus: false });
});

teamSearchInput?.addEventListener("input", () => {
  const hadTeamSearchQuery = hasTeamSearchQuery();
  teamSearchQuery = teamSearchInput.value;
  const shouldPushSearchState = hadTeamSearchQuery !== hasTeamSearchQuery();
  isShowingOlderTeamMatches = false;
  isTeamSearchOpen = true;
  updateTeamSearchControls();
  setYesterdayLayoutOffset(false);
  if (shouldPushSearchState) {
    updateUrlState({ historyMode: "push" });
  }
  scheduleTeamSearchRender();
});

teamSearchInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  event.stopPropagation();
  if (hasTeamSearchQuery()) {
    clearTeamSearch({ focus: true, historyMode: "push" });
  } else {
    setTeamSearchOpen(false, { focus: false });
    teamSearchToggle?.focus();
  }
});

teamSearchClear?.addEventListener("click", () => {
  clearTeamSearch({ focus: true, historyMode: "push" });
});

standingsYearButton.addEventListener("click", () => {
  setStandingsYearOpen(!isStandingsYearOpen);
});

catchUpButton.addEventListener("click", () => {
  setCatchUpOpen(!isCatchUpOpen);
});

settingsButton?.addEventListener("click", () => {
  setSettingsOpen(!isSettingsOpen);
});

adminMessageDismiss?.addEventListener("click", () => {
  const messageId = adminMessageDismiss.dataset.adminMessageId || "";
  if (messageId) {
    dismissAdminMessage(messageId);
  }
});

calendarPrevMonth.addEventListener("click", () => {
  calendarMonthKey = getAdjacentCalendarMonthKey(-1) || calendarMonthKey;
  renderCalendar();
});

calendarNextMonth.addEventListener("click", () => {
  calendarMonthKey = getAdjacentCalendarMonthKey(1) || calendarMonthKey;
  renderCalendar();
});

calendarTodayButton.addEventListener("click", () => {
  if (getMatchCountForDay(getDayKey(new Date(), selectedTimeZone)) === 0) {
    return;
  }

  selectCalendarDay(getDayKey(new Date(), selectedTimeZone));
});

calendarYesterdayButton.addEventListener("click", () => {
  const yesterdayKey = getRelativeDayKey(getDayKey(new Date(), selectedTimeZone), -1);
  if (getMatchCountForDay(yesterdayKey) === 0) {
    return;
  }

  selectCalendarDay(yesterdayKey);
});

calendarGrid.addEventListener("click", (event) => {
  const dayButton = event.target.closest(".calendar-day");
  if (!dayButton || dayButton.disabled) {
    return;
  }
  selectCalendarDay(dayButton.dataset.dayKey);
});

standingsYearGrid.addEventListener("click", (event) => {
  const yearButton = event.target.closest(".standings-year-option");
  if (!yearButton) {
    return;
  }
  selectStandingsYear(yearButton.dataset.standingsYear, { historyMode: "push" });
});

function handlePlayerLinkClick(event) {
  if (!(event.target instanceof Element)) {
    return false;
  }

  const playerTrigger = event.target.closest(".player-link");
  const playerHover = playerTrigger?.closest(".player-hover");
  if (!playerTrigger || !playerHover || !isTouchPlayerCardMode()) {
    return false;
  }

  if (activePlayerHover !== playerHover) {
    event.preventDefault();
    openPlayerHoverCard(playerHover);
    return true;
  }

  if (playerTrigger.tagName !== "A") {
    event.preventDefault();
    return true;
  }

  return false;
}

function attachPlayerCardPositioning(root) {
  root?.addEventListener(
    "pointerenter",
    (event) => {
      if (!shouldPreviewPlayerCardOnHover(event)) {
        return;
      }

      const playerHover = event.target.closest(".player-hover");
      if (playerHover) {
        positionPlayerCard(playerHover, { forceFloating: true });
      }
    },
    true
  );

  root?.addEventListener(
    "pointerleave",
    (event) => {
      const playerHover = event.target.closest?.(".player-hover");
      if (shouldUseFloatingPlayerCard(playerHover)) {
        queueFloatingPlayerCardHide();
      }
    },
    true
  );

  root?.addEventListener("focusin", (event) => {
    if (isTouchPlayerCardMode()) {
      return;
    }

    const playerHover = event.target.closest(".player-hover");
    if (playerHover) {
      positionPlayerCard(playerHover);
    }
  });

  root?.addEventListener("focusout", (event) => {
    if (isTouchPlayerCardMode()) {
      return;
    }

    const playerHover = event.target.closest(".player-hover");
    if (shouldUseFloatingPlayerCard(playerHover)) {
      queueFloatingPlayerCardHide();
    }
  });
}

matchInfo.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (handleLineupTabClick(event)) {
    return;
  }

  if (handleLineupBenchClick(event)) {
    return;
  }

  if (handleLineupSubstitutionToggleClick(event)) {
    return;
  }

  if (handlePlayerLinkClick(event)) {
    return;
  }

  const revealButton = event.target.closest("[data-past-reveal]");
  if (!revealButton) {
    return;
  }

  const revealBlock = revealButton.closest(".past-reveal");
  const hiddenResults = revealBlock?.querySelector(".past-hidden-results");
  if (!hiddenResults) {
    return;
  }

  hiddenResults.hidden = false;
  revealBlock.classList.add("is-open");
  revealButton.remove();
});

catchUpPopover.addEventListener("click", (event) => {
  handlePlayerLinkClick(event);
});

attachPlayerCardPositioning(matchInfo);
attachPlayerCardPositioning(catchUpPopover);

document.addEventListener(
  "pointerover",
  (event) => updateTooltipBoundsForTarget(event.target),
  true
);
document.addEventListener(
  "pointerdown",
  (event) => updateTooltipBoundsForTarget(event.target),
  true
);
document.addEventListener("pointerdown", handleTouchTooltipPointerDown, true);
document.addEventListener("click", handleLivePillTooltipClick, true);
document.addEventListener("keydown", handleLivePillTooltipKeydown, true);
document.addEventListener(
  "focusin",
  (event) => updateTooltipBoundsForTarget(event.target),
  true
);

document.addEventListener("pointerdown", (event) => {
  if (activePlayerHover && !getClosestPlayerHover(event.target)) {
    clearActivePlayerHover();
  }

  if (
    isCalendarOpen &&
    !datePopover.contains(event.target) &&
    !dayLabel.contains(event.target)
  ) {
    setCalendarOpen(false);
  }

  if (
    isCatchUpOpen &&
    !catchUpPopover.contains(event.target) &&
    !catchUpButton.contains(event.target)
  ) {
    setCatchUpOpen(false);
  }

  if (
    isSettingsOpen &&
    settingsPopover &&
    settingsButton &&
    !settingsPopover.contains(event.target) &&
    !settingsButton.contains(event.target)
  ) {
    setSettingsOpen(false);
  }

  if (
    isStandingsYearOpen &&
    !standingsYearPopover.contains(event.target) &&
    !standingsYearButton.contains(event.target)
  ) {
    setStandingsYearOpen(false);
  }

  if (
    isTeamSearchOpen &&
    !hasTeamSearchQuery() &&
    teamSearch &&
    !teamSearch.contains(event.target)
  ) {
    setTeamSearchOpen(false, { focus: false });
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  clearActiveTouchTooltip();
  clearActivePlayerHover();

  if (isCalendarOpen) {
    setCalendarOpen(false);
    dayLabel.focus();
  }

  if (isCatchUpOpen) {
    setCatchUpOpen(false);
    catchUpButton.focus();
  }

  if (isSettingsOpen) {
    setSettingsOpen(false);
    settingsButton?.focus();
  }

  if (isStandingsYearOpen) {
    setStandingsYearOpen(false);
    standingsYearButton.focus();
  }

  if (isTeamSearchOpen && !hasTeamSearchQuery()) {
    setTeamSearchOpen(false, { focus: false });
    teamSearchToggle?.focus();
  }
});

document.addEventListener(
  "error",
  (event) => {
    const image = event.target;
    if (image instanceof HTMLImageElement && image.matches(".player-photo img")) {
      replaceBrokenPlayerPhoto(image);
    } else if (image instanceof HTMLImageElement && image.matches(".lineup-avatar-image")) {
      replaceBrokenLineupAvatar(image);
    } else if (image instanceof HTMLImageElement && image.matches(".lineup-coach-avatar img, .lineup-coach-card-photo img")) {
      replaceBrokenLineupCoachPhoto(image);
    }
  },
  true
);

window.addEventListener("resize", () => {
  updateTabIndicators();
  updateTimeZoneLabelForViewport();
  positionCatchUpPopover();
  positionPlayerCards();
  updateWrappedMatchRows();
  updateTruncatedTeamTooltips();
  updateStandingNameTooltips();
  updateMeasuredLabelTooltips();
  updateTooltipBounds();
	  window.requestAnimationFrame(() => {
	    updateWrappedMatchRows();
	    updateTruncatedTeamTooltips();
	    updateStandingNameTooltips();
	    updateMeasuredLabelTooltips();
	    updateTooltipBounds();
	    updateTournamentBoardLayout();
	    updateTabIndicators();
	  });
	});
window.addEventListener(
  "scroll",
  () => {
    positionCatchUpPopover();
    positionPlayerCards();
    updateTooltipBounds();
  },
  true
);

timezoneSelect.addEventListener("change", () => {
  const wasViewingToday =
    selectedDayKey === getDayKey(new Date(), selectedTimeZone);
  selectedTimeZone = timezoneSelect.value;
  storeTimeZone(selectedTimeZone);
  if (wasViewingToday) {
    selectedDayKey = getDayKey(new Date(), selectedTimeZone);
    calendarMonthKey = getMonthKeyFromDayKey(selectedDayKey);
    activeMatchId = "";
  }
  ensureSelectableSelectedDay();
  renderTimeZoneOptions();
  updateUrlState({ historyMode: "push" });
  renderSchedule();
  renderSourceNote();
});

viewTabs.forEach((tab, index) => {
  tab.addEventListener("keydown", (event) => {
    const keyActions = {
      ArrowLeft: () => (index + viewTabs.length - 1) % viewTabs.length,
      ArrowRight: () => (index + 1) % viewTabs.length,
      Home: () => 0,
      End: () => viewTabs.length - 1
    };
    const getNextIndex = keyActions[event.key];

    if (!getNextIndex) {
      return;
    }

    event.preventDefault();
    const nextTab = viewTabs[getNextIndex()];
    nextTab.focus();
    setActiveView(nextTab.dataset.view, { historyMode: "push" });
  });
});

standingsModeTabs.forEach((tab, index) => {
  tab.addEventListener("keydown", (event) => {
    const visibleTabs = Array.from(standingsModeTabs).filter((item) => !item.hidden && !item.disabled);
    const visibleIndex = visibleTabs.indexOf(tab);

    if (visibleIndex === -1) {
      return;
    }

    const keyActions = {
      ArrowLeft: () => (visibleIndex + visibleTabs.length - 1) % visibleTabs.length,
      ArrowRight: () => (visibleIndex + 1) % visibleTabs.length,
      Home: () => 0,
      End: () => visibleTabs.length - 1
    };
    const getNextIndex = keyActions[event.key];

    if (!getNextIndex) {
      return;
    }

    event.preventDefault();
    const nextTab = visibleTabs[getNextIndex()];
    nextTab.focus();
    selectStandingsMode(nextTab.dataset.standingsMode, { historyMode: "push" });
  });
});

window.addEventListener("popstate", () => {
  clearPendingUrlStateUpdate();
  syncUrl = false;
  isRestoringHistoryState = true;
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  try {
    readUrlState({ useUrlDefaults: true });
    ensureSelectableSelectedDay();
    renderTimeZoneOptions();
    renderStandingsView();
    setActiveView(activeView);
    renderSchedule();
    renderSourceNote();
  } finally {
    syncUrl = true;
    window.setTimeout(() => {
      isRestoringHistoryState = false;
    }, 300);
  }
});

const languageObserver = new MutationObserver(() => {
  if (currentLanguage !== "zh" || isApplyingLanguage) {
    return;
  }

  window.requestAnimationFrame(() => {
    if (currentLanguage === "zh" && !isApplyingLanguage) {
      isApplyingLanguage = true;
      try {
        localizeRenderedText(document.body);
        updateWrappedMatchRows();
        updateTooltipBounds();
      } finally {
        isApplyingLanguage = false;
      }
    }
  });
});

readInitialChromeState();
renderStaticText();
renderTimeZoneOptions();
setHeaderControlsLoading(false);
updateActiveViewElements();
renderInitialLoadingState();
initializeJuggleToy();
languageObserver.observe(document.body, {
  attributeFilter: ["aria-label", "data-tooltip", "placeholder", "title"],
  attributes: true,
  characterData: true,
  childList: true,
  subtree: true
});

boot();
