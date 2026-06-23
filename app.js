const DATA_VERSION = "2026-06-23-curated-profile-notes";
const DATA_URLS = {
  fixtures: `data/fixtures.json?v=${DATA_VERSION}`,
  history: `data/history.json?v=${DATA_VERSION}`,
  liveData: `api/live-data?v=${DATA_VERSION}`,
  playerProfiles: `data/player-profiles.json?v=${DATA_VERSION}`,
  standings: `data/standings.json?v=${DATA_VERSION}`,
  teams: `data/teams.json?v=${DATA_VERSION}`,
  tournament: `data/tournament.json?v=${DATA_VERSION}`
};

const LANGUAGE_STORAGE_KEY = "world-cup-simplified-language";
const TIMEZONE_STORAGE_KEY = "world-cup-simplified-timezone";
const SHOW_YESTERDAY_STORAGE_KEY = "world-cup-simplified-show-yesterday";
const JUGGLE_RECORD_STORAGE_KEY = "world-cup-simplified-juggle-record";
const JUGGLE_BALL_EMOJI = "⚽";
const JUGGLE_FALL_SPEED = 345;
const JUGGLE_GRAVITY = 1060;
const JUGGLE_POINTER_HIT_RADIUS_MULTIPLIER = 1.55;
const JUGGLE_TOUCH_HIT_RADIUS_MULTIPLIER = 1.72;
const JUGGLE_HIT_LEAD_SECONDS = 0.05;
const JUGGLE_CLICK_BLOCK_MS = 650;
const JUGGLE_DIFFICULTY_STEP = 5;
const JUGGLE_MAX_DIFFICULTY_LEVEL = 5;
const JUGGLE_GRAVITY_LEVEL_MULTIPLIER = 0.08;
const JUGGLE_KICK_LEVEL_MULTIPLIER = 0.03;
const JUGGLE_LATERAL_LEVEL_MULTIPLIER = 0.06;
const JUGGLE_MAX_FRAME_SECONDS = 0.04;
const JUGGLE_SOUND_DURATION_SECONDS = 0.08;
const DEFAULT_LANGUAGE = "en";
const LANGUAGE_LOCALES = {
  en: "en-US",
  zh: "zh-CN"
};
const SUPPORTED_LANGUAGES = new Set(Object.keys(LANGUAGE_LOCALES));
const UI_TEXT = {
  en: {
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
    "Check latest score at FIFA": "在FIFA查看最新比分",
    "Choose match date": "选择比赛日期",
    "Choose standings year": "选择积分榜年份",
    "Clear country search": "清除国家队搜索",
    "Club to verify": "俱乐部待确认",
    "Country search": "国家队搜索",
    "Current knockout path with likely winners filled for now. Finished results replace estimates.":
      "当前淘汰赛路径会先填入暂时更可能晋级的球队，完赛结果会替换估算。",
    "Current score": "当前比分",
    "Third-place standings across all groups. The top eight advance; ties are flagged when fair-play data is unavailable.":
      "所有小组第三名排名。前八名晋级；若公平竞赛数据不可用，平局会被标记。",
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
    "Ecuador": "厄瓜多尔",
    "Egypt": "埃及",
    "England": "英格兰",
    "FIFA schedule": "FIFA赛程",
    "Final group table computed from archived match results.": "最终小组表由存档比赛结果计算得出。",
    "Final group tables computed from archived match results.": "最终小组表由存档比赛结果计算得出。",
    "Final score is not loaded for this fixture yet.": "这场比赛的最终比分尚未载入。",
    "Final score reflected in the current standings after source checks.":
      "来源核对后，最终比分已反映在当前积分榜中。",
    "Final pending": "最终比分待确认",
    "Final score": "最终比分",
    "Friendly": "友谊赛",
    "France": "法国",
    "FT": "全场",
    "Full time": "全场结束",
    "GD": "净胜球",
    "Germany": "德国",
    "Ghana": "加纳",
    "Goal difference is goals scored minus goals allowed. If teams are tied on points, a better goal difference can help decide who advances.":
      "净胜球为进球数减失球数。若积分相同，净胜球更好可能决定晋级。",
    "Goals": "进球",
    "Group": "小组",
    "Group standings": "小组积分榜",
    "Group standings are not available for this archived tournament.":
      "这届存档赛事没有可用的小组积分榜。",
    "Group table data is not available for this archived match.":
      "这场存档比赛没有可用的小组表数据。",
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
    "Key information is not loaded yet.": "关键信息尚未载入。",
    "Advancing now": "当前晋级",
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
    "Live": "直播",
    "Live score": "实时比分",
    "Live status is manually verified and should be refreshed after full time.":
      "实时状态为人工核验，完场后应刷新确认。",
    "Loading catch-up notes": "正在加载比赛速览",
    "Loading matches": "正在加载比赛",
    "Loading standings": "正在加载积分榜",
    "Loaded matches across the current tournament and World Cup archive.":
      "显示当前赛事和世界杯存档中的已载入比赛。",
    "Local estimate using FIFA rankings. Not betting odds.":
      "基于FIFA排名的本地估算，并非博彩赔率。",
    "Local historical-form estimate. Not betting odds.": "基于历史世界杯状态的本地估算，并非博彩赔率。",
    "Local preview estimate. Not betting odds.": "本地预览估算，并非博彩赔率。",
    "Market consensus based on public odds. Not betting advice.":
      "基于公开赔率的市场共识；这不是投注建议。",
    "Match plan": "比赛计划",
    "Matches": "赛程",
    "Matches and selected match details": "比赛和已选比赛详情",
    "Mexico": "墨西哥",
    "Morocco": "摩洛哥",
    "Netherlands": "荷兰",
    "New Zealand": "新西兰",
    "No catch-up notes loaded yet": "尚未载入速览",
    "No goals because this match was cancelled.": "本场取消，因此没有进球。",
    "No loaded World Cup matches found.": "未找到已载入的世界杯比赛。",
    "Past 24 hours": "过去24小时",
    "No matches": "没有比赛",
    "No next World Cup month": "没有下一个世界杯月份",
    "No previous men's World Cup meetings are loaded before this match.":
      "这场比赛之前尚未载入双方男足世界杯交锋记录。",
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
    "now": "刚刚",
    "Past match research is not loaded for this fixture yet.":
      "这场比赛的历史交锋研究尚未载入。",
    "Past matches": "历史交锋",
    "Path below": "路径见下方",
    "Penalties": "点球",
    "Position to verify": "位置待确认",
    "Prediction": "预测",
    "Predictions are unofficial.": "预测为非官方内容。",
    "Previous": "上一轮",
    "Previous matches": "此前比赛",
    "Previous World Cups": "历届世界杯",
    "Pts": "积分",
    "Panama": "巴拿马",
    "Paraguay": "巴拉圭",
    "Portugal": "葡萄牙",
    "Qatar": "卡塔尔",
    "Quarter-finals": "四分之一决赛",
    "Points rank teams in the group: 3 for a win, 1 for a draw, 0 for a loss. More points usually means a better chance to advance.":
      "积分决定小组排名：胜3分，平1分，负0分。积分越多通常越有机会晋级。",
    "Rank": "排名",
    "Read source": "阅读来源",
    "Report issue": "报告问题",
    "Result": "赛果",
    "Round of 16": "16强赛",
    "Round of 32": "32强赛",
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
    "Shown in current table order. Points, record and goal difference are included for context.":
      "按当前积分榜顺序显示，并包含积分、战绩和净胜球作为参考。",
    "Show all matches": "显示全部比赛",
    "Sources:": "来源：",
    "Standings": "积分榜",
    "Standings sections": "积分榜分区",
    "Status": "状态",
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
    "The striker Qatar look for when they need a direct finish from limited chances.":
      "卡塔尔需要在有限机会中直接终结时，会寻找这名前锋。",
    "Third-Place Race": "第三名竞争",
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
  "Portugal and DR Congo split the points": "葡萄牙与刚果民主共和国各取一分",
  "Raúl Rangel made a huge late double save.": "Raúl Rangel最后阶段完成关键连续两连扑。",
  "Switzerland 4-1 Bosnia and Herzegovina": "瑞士4-1波黑",
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
  "Aaron Wan-Bissaka": "阿龙·万-比萨卡",
  "Abbosbek Fayzullaev": "阿博斯别克·法伊祖拉耶夫",
  "Abdukodir Khusanov": "阿卜杜科迪尔·胡萨诺夫",
  "Achraf Hakimi": "阿什拉夫·哈基米",
  "Adalberto Carrasquilla": "阿达尔贝托·卡拉斯基利亚",
  "Adam Hložek": "亚当·赫洛热克",
  "Akram Afif": "阿克拉姆·阿菲夫",
  "Alexander Isak": "亚历山大·伊萨克",
  "Ali Jasim": "阿里·贾西姆",
  "Ali Olwan": "阿里·奥尔万",
  "Alireza Jahanbakhsh": "阿里雷扎·贾汉巴赫什",
  "Almoez Ali": "阿尔莫埃兹·阿里",
  "Alphonso Davies": "阿方索·戴维斯",
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
  "Juninho Bacuna": "儒尼尼奥·巴库纳",
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
  "Noah Sadiki": "诺亚·萨迪基",
  "Noor Al-Rawabdeh": "努尔·拉瓦布德",
  "Omar Marmoush": "奥马尔·马尔穆什",
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
  "Teboho Mokoena": "特博霍·莫科纳",
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
  "Zidane Iqbal": "齐达内·伊克巴尔",
  "Adam Hlozek": "亚当·赫洛热克",
  "Arda Guler": "阿尔达·居莱尔",
  "Brahim Diaz": "布拉欣·迪亚斯",
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
  "Kenan Yildiz": "凯南·伊尔迪兹",
  "Kylian Mbappe": "基利安·姆巴佩",
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
  "Jack Grealish": "杰克·格拉利什",
  "Jaminton Campaz": "哈明顿·坎帕斯",
  "Joao Neves": "若昂·内维斯",
  "Johan Manzambi": "约翰·曼赞比",
  "Marcus Rashford": "马库斯·拉什福德",
  "Michal Sadilek": "米哈尔·萨迪莱克",
  Messi: "梅西",
  Mbappé: "姆巴佩",
  Manzambi: "曼赞比",
  "Raheem Sterling": "拉希姆·斯特林",
  "Raúl Rangel": "劳尔·兰赫尔"
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
  Beşiktaş: "贝西克塔斯",
  "Borussia Dortmund": "多特蒙德",
  Bournemouth: "伯恩茅斯",
  "Brighton & Hove Albion": "布莱顿",
  Burnley: "伯恩利",
  Chelsea: "切尔西",
  "Crystal Palace": "水晶宫",
  "Cultural Leonesa (on loan from Al-Duhail)": "莱昂内萨文化（从杜海勒租借）",
  "Dender EH": "登德尔EH",
  "Dinamo Zagreb (on loan from AC Milan)": "萨格勒布迪纳摩（从AC米兰租借）",
  "Dynamo Moscow": "莫斯科迪纳摩",
  "Eintracht Frankfurt": "法兰克福",
  Esteghlal: "德黑兰独立",
  "FC St. Pauli": "圣保利",
  "Fenerbahçe (on loan from West Ham United)": "费内巴切（从西汉姆联租借）",
  Feyenoord: "费耶诺德",
  "G.D. Chaves": "查韦斯",
  "Hannover 96 (on loan from FC Augsburg)": "汉诺威96（从奥格斯堡租借）",
  "Inter Milan": "国际米兰",
  "Inter Milan (on loan from Manchester City)": "国际米兰（从曼城租借）",
  Iğdır: "厄德尔",
  "Iğdır FK": "厄德尔FK",
  Juventus: "尤文图斯",
  Kalba: "卡尔巴",
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
  Nantes: "南特",
  Napoli: "那不勒斯",
  "Newcastle United": "纽卡斯尔联",
  "Nottingham Forest": "诺丁汉森林",
  Olympiacos: "奥林匹亚科斯",
  PSV: "埃因霍温",
  Pachuca: "帕丘卡",
  Palmeiras: "帕尔梅拉斯",
  "Paris Saint-Germain": "巴黎圣日耳曼",
  "Pumas UNAM": "美洲狮UNAM",
  "RB Leipzig": "RB莱比锡",
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
  "Round of 32 slots use current standings and remaining projections. Later rounds fill in after results.":
    "32强席位根据当前积分榜和剩余比赛预测生成；后续轮次会在赛果产生后填入。",
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
    pattern: /^Open Group ([A-L]) standings$/,
    replace: (_, groupId) => `打开${groupId}组积分榜`
  },
  {
    pattern: /^(\d+)(?:st|nd|rd|th)$/,
    replace: (_, value) => `第${value}`
  },
  {
    pattern: /^3rd race (.+)$/,
    replace: (_, rank) => `第三名竞争 ${translateTextToZh(rank)}`
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
    pattern: /^(.+)'s (.+) win gives them an early foothold in (.+)\.$/,
    replace: (_, winner, score, context) => `${translateTextToZh(winner)} 的 ${score} 胜利让他们在 ${translateTextToZh(context)} 中先占位置。`
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
    pattern: /^(.+) and (.+) are level (\d+-\d+)\.$/,
    replace: (_, home, away, score) => `${translateTextToZh(home)} 和 ${translateTextToZh(away)} 以 ${score} 战平。`
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
const settingsButton = document.querySelector("#settings-button");
const settingsPopover = document.querySelector("#settings-popover");
const languageSwitch = document.querySelector("#language-switch");
const languageButtons = document.querySelectorAll(".language-option");
const settingsLanguageLabel = document.querySelector("#settings-language-label");
const timezoneLabel = document.querySelector(".timezone-label");
const settingsYesterdayLabel = document.querySelector("#settings-yesterday-label");
const showYesterdayToggle = document.querySelector("#show-yesterday-toggle");
const standingsHeadingText = document.querySelector("#standings-heading span");
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
const FIFA_WORLD_CUP_SCORES_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures";
const FIFA_LIVE_TOOLTIP = "Check latest score at FIFA";
const CURRENT_STANDINGS_YEAR = 2026;
const DEFAULT_KNOCKOUT_FIELD_SIZE = 32;
const DEFAULT_AUTOMATIC_ADVANCERS_PER_GROUP = 2;
const DEFAULT_THIRD_PLACE_ADVANCERS = 8;
const THIRD_PLACE_STANDING_INDEX = 2;
const CURRENT_STANDINGS_SUMMARY =
  "Top two in each group advance. The best eight third-place teams also reach the Round of 32.";
const THIRD_PLACE_STANDINGS_SUMMARY =
  "Third-place standings across all groups. The top eight advance; ties are flagged when fair-play data is unavailable.";
const TOURNAMENT_STANDINGS_SUMMARY =
  "Round of 32 slots use current standings and remaining projections. Later rounds fill in after results.";
const HISTORICAL_STANDINGS_SUMMARY =
  "Final group tables computed from archived match results.";
const TOURNAMENT_PROGRESS_ROUNDS = [
  {
    id: "round-of-32",
    label: "Round of 32",
    matchNumbers: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87]
  },
  { id: "round-of-16", label: "Round of 16", matchNumbers: [89, 90, 93, 94, 91, 92, 95, 96] },
  { id: "quarter-finals", label: "Quarter-finals", matchNumbers: [97, 98, 99, 100] },
  { id: "semi-finals", label: "Semi-finals", matchNumbers: [101, 102] },
  { id: "final", label: "Final", matchNumbers: [104] }
];
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
  CIV: ["ivory coast", "cote divoire", "cote d ivoire", "cote"],
  COD: ["congo", "congo dr", "dr congo"],
  CZE: ["czech republic", "czechia"],
  IRN: ["iran", "ir iran"],
  KOR: ["korea", "korea republic", "south korea"],
  TUR: ["turkey", "turkiye", "türkiye"],
  USA: ["usa", "us", "united states", "america"]
};
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

function setShowYesterdayMatches(value, options = {}) {
  shouldShowYesterdayMatches = Boolean(value);
  storeShowYesterday(shouldShowYesterdayMatches);
  if (showYesterdayToggle) {
    showYesterdayToggle.checked = shouldShowYesterdayMatches;
  }
  if (options.render !== false) {
    renderSchedule();
  }
}

const initialDate = new Date();
let selectedTimeZone = getStoredTimeZone() || defaultTimeZone;
let selectedDayKey = getDayKey(initialDate, selectedTimeZone);
let shouldShowYesterdayMatches = getStoredShowYesterday();
let activeMatchId = "";
let activeView = "matches";
let selectedStandingsYear = CURRENT_STANDINGS_YEAR;
let selectedStandingsMode = "groups";
let teamSearchQuery = "";
let calendarMonthKey = getMonthKeyFromDayKey(selectedDayKey);
let isCalendarOpen = false;
let isCatchUpOpen = false;
let isSettingsOpen = false;
let isStandingsYearOpen = false;
let isTeamSearchOpen = false;
let isShowingOlderTeamMatches = false;
let fixtures = [];
let historicalFixtures = [];
let history = { coverage: {}, fixtures: [], source: null, tournaments: [] };
const historicalProjectionCache = new Map();
let playerProfilesByName = new Map();
let shouldShowPlayerMarketValues = false;
let teamsById = new Map();
let teamsByName = new Map();
let tournament = { groups: [], stages: [], sources: [] };
let standingsByGroup = {};
let dataCoverage = { status: "partial" };
let siteUpdatedAt = "";
let liveDataCheckedAt = "";
let syncUrl = true;
let isInitialDataLoading = true;
let isInitialLiveDataLoading = false;

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

function localizeText(value) {
  return currentLanguage === "zh" ? translateTextToZh(value) : String(value ?? "");
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

function getLocalizedTeamName(teamOrName) {
  const name = typeof teamOrName === "string" ? teamOrName : teamOrName?.name || "";
  return localizeText(name);
}

function getLocalizedStandingName(team) {
  return localizeText(team ? getStandingName(team) : "");
}

function renderStaticText() {
  document.documentElement.lang = currentLanguage === "zh" ? "zh-Hans" : "en";
  document.title = t("appName");
  brandHomeLink?.setAttribute("aria-label", t("appHomeLabel"));
  if (brandLabel) {
    brandLabel.textContent = t("appName");
  }
  renderJuggleRecord();
  juggleToy.element?.setAttribute("title", t("juggleBall"));

  settingsButton?.setAttribute("aria-label", t("settings"));
  settingsButton?.setAttribute("title", t("settings"));
  settingsPopover?.setAttribute("aria-label", t("settings"));
  if (settingsLanguageLabel) {
    settingsLanguageLabel.textContent = t("language");
  }
  languageSwitch?.setAttribute("aria-label", t("language"));
  languageButtons.forEach((button) => {
    const language = normalizeLanguage(button.dataset.language);
    const isSelected = language === currentLanguage;
    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
    button.textContent = language === "zh" ? "中文" : "English";
    button.setAttribute(
      "aria-label",
      language === "zh" ? t("languageChinese") : t("languageEnglish")
    );
  });

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
  standingsHeadingText.textContent = t("standings");
  standingsYearPopover?.setAttribute("aria-label", t("chooseStandingsYear"));
  standingsModeTabsShell?.setAttribute("aria-label", t("standingsSections"));
  document.querySelector("#standings-groups-tab").textContent = t("groups");
  document.querySelector("#standings-third-place-tab").textContent = t("thirdPlaceRace");
  document.querySelector("#standings-tournament-tab").textContent = t("tournament");
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
    juggleToy.vx = Math.abs(juggleToy.vx) * 0.76;
  } else if (juggleToy.x > window.innerWidth - juggleToy.size) {
    juggleToy.x = Math.max(0, window.innerWidth - juggleToy.size);
    juggleToy.vx = -Math.abs(juggleToy.vx) * 0.76;
  }
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
  renderSchedule();
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

function updateTabIndicators() {
  updateViewTabIndicator();
  updateStandingsModeTabIndicator();
  updateLanguageTabIndicator();
}

function queueTabIndicatorUpdate() {
  window.requestAnimationFrame(updateTabIndicators);
}

function selectStandingsYear(year) {
  selectedStandingsYear = getValidStandingsYear(year);
  if (selectedStandingsYear !== CURRENT_STANDINGS_YEAR) {
    selectedStandingsMode = "groups";
  }
  setStandingsYearOpen(false);
  renderStandingsView();
  updateUrlState();
}

function selectStandingsMode(mode) {
  selectedStandingsMode = getValidStandingsMode(mode);
  renderStandingsView();
  updateUrlState();
}

function openStandingsGroup(groupId) {
  if (!groupId) {
    return;
  }

  selectedStandingsMode = "groups";
  renderStandingsView();
  updateUrlState();

  window.requestAnimationFrame(() => {
    const card = standingsGrid.querySelector(
      `.standings-card[data-group-id="${CSS.escape(groupId)}"]`
    );

    if (!card) {
      return;
    }

    card.classList.add("is-drill-target");
    card.focus({ preventScroll: true });
    card.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center"
    });

    window.setTimeout(() => {
      card.classList.remove("is-drill-target");
    }, 1400);
  });
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
  return `<span class="rank-pill" aria-label="${escapeHtml(label)}">#${escapeHtml(team.fifaRank)}</span>`;
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
  const tooltipAttributes = teamName
    ? ` aria-label="${escapedTeamName}" data-tooltip="${escapedTeamName}"`
    : "";

  return `
    <span class="${escapeHtml(className)}"${tooltipAttributes}>
      ${renderFlag(team)}
      <span class="team-name" aria-label="${escapedTeamName}">${escapedTeamName}</span>
      ${showRank ? renderRank(team) : ""}
    </span>
  `;
}

function setNameTooltipAnchor(container, name) {
  const containerRect = container.getBoundingClientRect();
  const nameRect = name.getBoundingClientRect();
  if (!containerRect.width || !nameRect.width) {
    return;
  }

  const anchorX = nameRect.left - containerRect.left + nameRect.width / 2;
  container.style.setProperty("--name-tooltip-anchor", `${Math.round(anchorX)}px`);
}

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

      const isTruncated = name.scrollWidth > name.clientWidth + 1;
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

function updateStandingNameTooltips(root = document) {
  root.querySelectorAll(".standing-team[data-tooltip]").forEach((team) => {
    const name = team.querySelector(".standing-name");
    if (!name) {
      team.classList.remove("has-name-tooltip");
      team.removeAttribute("tabindex");
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
      setNameTooltipAnchor(team, name);
    } else {
      team.removeAttribute("tabindex");
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

function getVenueLabel(match) {
  if (currentLanguage === "zh") {
    const venue = zhVenueNames[match.venue] || localizeHistoricalVenueText(match.venue);
    const location = zhVenueLocations[match.venue] || localizeHistoricalVenueText(venueLocations[match.venue] || "");
    return location ? `${venue} \u2022 ${location}` : venue;
  }

  const location = venueLocations[match.venue];
  return location ? `${match.venue} \u2022 ${location}` : match.venue;
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
    return localizeText("Score pending");
  }

  if (!shouldShowScorePending(match, state, currentTime)) {
    return "";
  }

  return localizeText("Final pending");
}

function getDisplayScore(match, state) {
  if (match.score) {
    return {
      home: match.score.home,
      away: match.score.away,
      isFallback: false
    };
  }

  return null;
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

function getSearchScoreOutcome(score, searchedSide) {
  if (!searchedSide || !score) {
    return "";
  }

  const winnerSide = getScoreWinnerSide(score.home, score.away);
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
  const isLiveScore = match.status === "LIVE" || state === "live";
  const freshness = isLiveScore
    ? formatRelativeScoreFreshness(getScoreFreshnessTimestamp(match))
    : "";
  const visibleScoreText = freshness ? `${scoreText} · ${freshness}` : scoreText;
  const label =
    isLiveScore ? localizeText("Current score") : localizeText("Final score");
  const ariaLabel = score.isFallback
    ? localizeText(`Current score not loaded yet; showing ${scoreText}`)
    : `${label} ${home} ${score.home}, ${away} ${score.away}${
        freshness
          ? currentLanguage === "zh"
            ? `，最后检查 ${freshness}`
            : `, last checked ${freshness}`
          : ""
      }`;
  const outcome = getSearchScoreOutcome(score, options.searchedSide);
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

function renderLivePill() {
  const tooltip = localizeText(FIFA_LIVE_TOOLTIP);
  const ariaLabel =
    currentLanguage === "zh" ? `直播：${tooltip}` : `Live: ${FIFA_LIVE_TOOLTIP}`;
  return `<a class="live-pill" href="${escapeHtml(FIFA_WORLD_CUP_SCORES_URL)}" target="_blank" rel="noreferrer" title="${escapeHtml(tooltip)}" aria-label="${escapeHtml(ariaLabel)}" data-tooltip="${escapeHtml(tooltip)}">${escapeHtml(localizeText("Live"))}</a>`;
}

function getMatchDateTimeValue(match) {
  return match.kickoffUtc || match.date || "";
}

function getMatchTimeLabel(match) {
  if (match.kickoffUtc) {
    return getTimeFormatter().format(new Date(match.kickoffUtc)).replace(" ", "");
  }

  if (match.localTime) {
    return match.localTime;
  }

  if (match.status === "CANCELLED") {
    return localizeText("Canceled");
  }

  return match.status === "FT" ? localizeText("FT") : localizeText("Final");
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
    return localizeText("Full time");
  }

  return getMatchTimeLabel(match);
}

function getMatchDateTimeAriaLabel(match, options = {}) {
  const dateLabel = options.showDate ? getMatchDateLabel(match, options) : "";
  if (!dateLabel) {
    return getMatchTimeAriaLabel(match);
  }

  if (match.isHistorical) {
    return dateLabel;
  }

  return [dateLabel, getMatchTimeAriaLabel(match)].join(", ");
}

function getMatchVisibleTimeLabel(match, options = {}) {
  const dateLabel = options.showDate ? getMatchDateLabel(match, options) : "";
  if (!dateLabel) {
    return getMatchTimeLabel(match);
  }

  if (match.isHistorical) {
    return dateLabel;
  }

  return [dateLabel, getMatchTimeLabel(match)].join(" ");
}

function shouldPreviewMatchInfoOnHover(event) {
  if (event.pointerType && event.pointerType !== "mouse") {
    return false;
  }

  return !window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

function renderMatchRow(match, state, currentTime = Date.now(), options = {}) {
  const row = document.createElement("div");
  const homeName = getLocalizedTeamName(match.homeTeam);
  const awayName = getLocalizedTeamName(match.awayTeam);
  const versusText = localizeText("vs");
  const dateLabel = options.showDate ? getMatchDateLabel(match, options) : "";
  const dateTimeAriaLabel = getMatchDateTimeAriaLabel(match, options);
  const visibleTimeLabel = getMatchVisibleTimeLabel(match, options);
  const rowDateTimeLabel = dateLabel ? `, ${dateTimeAriaLabel}` : "";
  const winnerSide = getScoreWinnerSide(match.score?.home, match.score?.away);
  const isLiveState = match.status === "LIVE" || state === "live";
  const scoreLabel = isLiveState ? localizeText("current score") : localizeText("final score");
  const pendingScoreText = getScorePendingText(match, state, currentTime);
  const displayScore = getDisplayScore(match, state);
  const stateLabel =
    state === "live" ? `${localizeText("Live")}, ` : state === "next" ? `${localizeText("Up next")}, ` : "";
  const statusLabel = match.status === "CANCELLED" ? `, ${localizeText("cancelled")}` : "";
  const scoreStatus = renderScoreStatus(match, state, currentTime);
  const stateBadge =
    state === "live"
      ? renderLivePill()
      : state === "next"
        ? `<span class="up-next-pill">${escapeHtml(localizeText("Up next"))}</span>`
        : "";
  const score = renderScore(match, state, options);
  const rowMeta = `${stateBadge}${scoreStatus}${score}`;
  const rowLabel = `${stateLabel}${homeName} ${versusText} ${awayName}${rowDateTimeLabel}${statusLabel}${
    match.score
      ? `, ${scoreLabel} ${match.score.home}-${match.score.away}`
      : displayScore
        ? `, ${localizeText("current score")} ${displayScore.home}-${displayScore.away}`
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
        ${renderTeamInline(match.homeTeam, getTeamClass("team", winnerSide, "home"))}
        <span class="versus">${escapeHtml(versusText)}</span>
        ${renderTeamInline(match.awayTeam, getTeamClass("team", winnerSide, "away"))}
      </span>
    </button>
    ${rowMeta ? `<span class="match-row-meta">${rowMeta}</span>` : ""}
  `;

  row.addEventListener("pointerenter", (event) => {
    if (shouldPreviewMatchInfoOnHover(event)) {
      renderMatchInfo(match);
    }
  });
  row.addEventListener("focusin", () => renderMatchInfo(match));
  row.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      return;
    }

    renderMatchInfo(match, { reveal: true });
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
  const automaticAdvancersPerGroup = getTournamentFormatNumber(
    ["automaticAdvancersPerGroup", "groupStage.automaticAdvancersPerGroup"],
    DEFAULT_AUTOMATIC_ADVANCERS_PER_GROUP
  );
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

  if (candidate.isCutLineTie) {
    return {
      kind: "pending",
      label: "Tiebreak pending",
      detail: "Tied on loaded stats; fair-play data decides before FIFA ranking."
    };
  }

  if (isInside && candidate.position >= advancerCount - 1) {
    return {
      kind: "bubble-in",
      label: "Just inside",
      detail: "Inside the top eight right now, but close to the cut line."
    };
  }

  if (isInside) {
    return {
      kind: "in",
      label: "Advancing now",
      detail: "Inside the top eight best third-place teams."
    };
  }

  if (candidate.position === advancerCount + 1) {
    return {
      kind: "first-out",
      label: "Just outside",
      detail: "Next team outside the top eight."
    };
  }

  return {
    kind: "out",
    label: "Outside now",
    detail: "Needs results elsewhere to move into the top eight."
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

  return annotatedRows.map((row) => ({
    ...row,
    status: getThirdPlaceStatus(row, advancerCount)
  }));
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
  const teamClasses = "standing-team";
  const tooltipAttributes = fullName ? ` data-tooltip="${escapeHtml(fullName)}"` : "";

  return `
    <span class="${teamClasses}" aria-label="${escapeHtml(fullName)}"${tooltipAttributes}>
      ${renderFlag(team)}
      <span class="standing-name" aria-label="${escapeHtml(fullName)}" title="${escapeHtml(fullName)}">${escapeHtml(standingName)}</span>
      ${showRank ? renderRank(team) : ""}
      ${trailingHtml}
    </span>
  `;
}

function renderThirdPlaceStandingBadge(candidate) {
  const status = candidate.status || getThirdPlaceStatus(candidate, getThirdPlaceAdvancerCount());
  const rankLabel = formatOrdinal(candidate.position);
  const label = `${getLocalizedTeamName(candidate.team)} ${localizeText("ranking")} ${localizeText(rankLabel)}：${localizeText(status.label)}`;

  return `
    <span class="third-place-pill is-${escapeHtml(status.kind)}" aria-label="${escapeHtml(label)}">
      ${escapeHtml(localizeText(`3rd race ${rankLabel}`))}
    </span>
  `;
}

function renderStandingRow(row, options = {}) {
  const team = getTeam(row.teamId);
  const { showRank = true, thirdPlaceRaceByTeamId = null } = options;
  const thirdPlaceCandidate = thirdPlaceRaceByTeamId?.get(row.teamId);

  return `
    <tr>
      <td>
        ${renderStandingTeam(team, {
          showRank,
          trailingHtml: thirdPlaceCandidate
            ? renderThirdPlaceStandingBadge(thirdPlaceCandidate)
            : ""
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
        .map((row) => renderStandingRow(row, options))
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

function getHistoricalGroupStandingsForYear(year, groupName) {
  const rows = new Map();
  const groupFixtures = historicalFixtures
    .filter((fixture) => fixture.tournamentYear === year && fixture.group === groupName)
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)));

  for (const fixture of groupFixtures) {
    initializeHistoricalStanding(rows, fixture.homeSlot);
    initializeHistoricalStanding(rows, fixture.awaySlot);

    if (fixture.status !== "FT" || !fixture.score) {
      continue;
    }

    const home = initializeHistoricalStanding(rows, fixture.homeSlot);
    const away = initializeHistoricalStanding(rows, fixture.awaySlot);
    const homeScore = Number(fixture.score.home);
    const awayScore = Number(fixture.score.away);

    home.played += 1;
    away.played += 1;
    home.gf += homeScore;
    home.ga += awayScore;
    away.gf += awayScore;
    away.ga += homeScore;

    if (homeScore > awayScore) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (awayScore > homeScore) {
      away.wins += 1;
      away.points += 3;
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

function renderHistoricalStandingRow(row, index, year, groupName) {
  const isAdvancing = shouldHighlightHistoricalStanding(
    { tournamentYear: year, group: groupName },
    index
  );

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
        .map((row, index) => renderHistoricalStandingRow(row, index, year, groupName))
        .join("")}</tbody>
    </table>
  `;
}

function renderThirdPlaceStatus(candidate) {
  const reason = localizeText(getThirdPlaceReason(candidate));
  const statusLabel = localizeText(candidate.status.label);
  const tooltipLabel = `${statusLabel}：${reason}`;

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

function getThirdPlaceReason(candidate) {
  if (candidate.isCutLineTie) {
    return `Tied on loaded stats for ${formatOrdinal(candidate.tieGroupStart)}-${formatOrdinal(candidate.tieGroupEnd)}.`;
  }

  const nearestCandidate = candidate.position <= getThirdPlaceAdvancerCount()
    ? getThirdPlaceRaceRows()[candidate.position]
    : getThirdPlaceRaceRows()[candidate.position - 2];

  if (!nearestCandidate) {
    return `${formatStandingPoints(candidate.pts)}, ${formatGoalDifference(candidate.gd)} goal difference, ${formatGoalsScored(candidate.gf)}.`;
  }

  if (candidate.pts !== nearestCandidate.pts) {
    return `${formatStandingPoints(candidate.pts)}; ${candidate.position <= getThirdPlaceAdvancerCount() ? "above" : "behind"} next team on points.`;
  }

  if (candidate.gd !== nearestCandidate.gd) {
    return `${formatGoalDifference(candidate.gd)} goal difference; ${candidate.position <= getThirdPlaceAdvancerCount() ? "ahead" : "behind"} on goal difference.`;
  }

  if (candidate.gf !== nearestCandidate.gf) {
    return `${formatGoalsScored(candidate.gf)}; ${candidate.position <= getThirdPlaceAdvancerCount() ? "ahead" : "behind"} on total goals scored.`;
  }

  return `${formatStandingPoints(candidate.pts)}, ${formatGoalDifference(candidate.gd)} goal difference, ${formatGoalsScored(candidate.gf)}.`;
}

function renderThirdPlaceRaceRow(candidate) {
  const rowClasses = [
    candidate.position <= getThirdPlaceAdvancerCount() ? "is-inside" : "is-outside",
    candidate.isCutLineTie ? "is-cut-line-tie" : "",
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
        <thead>
          <tr>
            <th>${escapeHtml(localizeText("Rank"))}</th>
            <th>${escapeHtml(localizeText("Team"))}</th>
            <th>${escapeHtml(localizeText("Group"))}</th>
            <th>${escapeHtml(localizeText("Pts"))}</th>
            <th>${escapeHtml(localizeText("GD"))}</th>
            <th>${escapeHtml(localizeText("Goals"))}</th>
            <th>${escapeHtml(localizeText("Status"))}</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
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

  return (
    {
      Final: "决赛",
      "Quarter-finals": "四分之一决赛",
      "Round of 16": "16强赛",
      "Round of 32": "32强赛",
      "Semi-finals": "半决赛"
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

function getTournamentSlotKey(match, side) {
  return `${Number(match?.matchNumber)}:${side}`;
}

function formatTournamentTopSlotLabel(groupId, place) {
  return `Group ${groupId} Top ${place}`;
}

function formatTournamentThirdPlaceSlotLabel(groupIds = []) {
  return `Group ${groupIds.join("/") || "?"} Top 3`;
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
  const usedGroupIds = new Set();
  const assignments = {};

  for (const fixture of getKnockoutFixtures().filter((match) => match.stage === "round-of-32")) {
    for (const side of ["home", "away"]) {
      const slot = getRoundOf32SlotDefinition(fixture, side);

      if (slot.kind !== "third-place") {
        continue;
      }

      const candidate = candidates.find(
        (row) => slot.allowedGroupIds.includes(row.groupId) && !usedGroupIds.has(row.groupId)
      );

      if (candidate) {
        assignments[slot.key] = candidate.groupId;
        usedGroupIds.add(candidate.groupId);
      }
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

function getTournamentWinnerSourceMatchNumbers(match) {
  return [match?.homeSlot, match?.awaySlot].map(parseTournamentWinnerSource).filter(Boolean);
}

function getTournamentNextMatchNumber(matchNumber) {
  const winnerSlot = `Winner match ${Number(matchNumber)}`;
  return getKnockoutFixtures().find(
    (fixture) => fixture.homeSlot === winnerSlot || fixture.awaySlot === winnerSlot
  )?.matchNumber;
}

function getTournamentMatchDateLabel(match) {
  if (!match) {
    return "";
  }

  const dateKey = getFixtureDayKey(match);
  const timeLabel = getMatchTimeLabel(match);
  return [navDateFormatter.format(getDateFromKey(dateKey)), timeLabel].filter(Boolean).join(" ");
}

function createTournamentProgressionContext() {
  return {
    currentThirdPlaceAssignment: getCurrentThirdPlaceAssignment(),
    groupPlaceOddsCache: new Map(),
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

  return `${getTournamentTeamCode(team)} is current ${formatTournamentTopSlotLabel(
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
            `${getTournamentTeamCode(candidate.team)} ${formatTournamentSlotPercent(
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
    `${getTournamentTeamCode(primary.team)} is current ${slotLabel}.`;
  const hasRemainingFixtures =
    slot.kind === "third-place"
      ? slot.allowedGroupIds.some(hasTournamentRemainingGroupFixtures)
      : hasTournamentRemainingGroupFixtures(slot.groupId);
  const displayProbability =
    hasRemainingFixtures && primary.probability >= 1 ? 0.995 : primary.probability;
  const odds = {
    alternatives,
    groupId: primary.groupId,
    label: `${getTournamentTeamCode(primary.team)} ${formatTournamentSlotPercent(
      displayProbability
    )} here`,
    place: primary.place,
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
    const prediction = {
      entry: participants.home,
      percent: 55,
      reason: `${getStandingName(homeTeam)} are the only current team in this slot. Rough 55%.`,
      side: "home",
      team: homeTeam
    };
    context.likelyWinnersCache.set(cacheKey, prediction);
    return prediction;
  }

  if (!homeTeam && awayTeam) {
    const prediction = {
      entry: participants.away,
      percent: 55,
      reason: `${getStandingName(awayTeam)} are the only current team in this slot. Rough 55%.`,
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
  const prediction = {
    entry: participants[side],
    percent,
    reason: getTournamentLikelihoodReason(team, otherTeam, percent),
    side,
    team
  };

  context.likelyWinnersCache.set(cacheKey, prediction);
  return prediction;
}

function getTournamentLikelyParticipant(prediction, sourceMatchNumber) {
  if (!prediction?.entry?.team) {
    return null;
  }

  return {
    ...prediction.entry,
    label: getTournamentTeamCode(prediction.entry.team),
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
      label: getTournamentTeamCode(team),
      likelihoodPercent: null,
      likelihoodReason: "",
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
        label: getTournamentTeamCode(winner),
        likelihoodPercent: null,
        likelihoodReason: "",
        seedLabel: sourceWinnerEntry?.seedLabel || "",
        slotText: sourceWinnerEntry?.slotText || slotText,
        sourceMatchNumber,
        state: "resolved",
        team: winner
      };
    }

    return getTournamentPendingParticipant("TBD", slotText, sourceMatchNumber);
  }

  if (match?.stage === "round-of-32") {
    const slot = getRoundOf32SlotDefinition(match, side);
    const team = getCurrentTournamentSlotTeam(slot, context.currentThirdPlaceAssignment);
    const seedLabel = getTournamentSlotSeedLabel(slot, context.currentThirdPlaceAssignment);
    const slotOdds = getTournamentSlotOdds(slot, context);
    const displayTeam = team || slotOdds?.team || null;

    if (displayTeam) {
      const displaySeedLabel =
        team || !slotOdds?.groupId
          ? seedLabel
          : formatTournamentTopSlotLabel(slotOdds.groupId, slotOdds.place || 3);
      return {
        label: getTournamentTeamCode(displayTeam),
        likelihoodPercent: null,
        likelihoodReason: "",
        seedLabel: displaySeedLabel,
        slotOdds,
        slotText,
        state: team ? "resolved" : "likely",
        team: displayTeam
      };
    }

    return getTournamentPendingParticipant(seedLabel, slotText);
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
  const penaltyWinnerSide = getScoreWinnerSide(
    match?.scoreDetails?.penalties?.home,
    match?.scoreDetails?.penalties?.away
  );

  if (penaltyWinnerSide) {
    return penaltyWinnerSide;
  }

  if (match?.status !== "FT") {
    return "";
  }

  return getScoreWinnerSide(match?.score?.home, match?.score?.away);
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

function renderTournamentParticipant(entry, options = {}) {
  const { isWinner = false } = options;
  const teamName = entry.team ? getLocalizedStandingName(entry.team) : localizeText(entry.slotText || entry.label);
  const label = entry.team ? getTournamentTeamCode(entry.team) : localizeText(entry.label);
  const detailText = entry.team
    ? localizeText(entry.seedLabel) || teamName
    : entry.sourceMatchNumber
      ? ""
      : teamName;
  const ariaName = entry.sourceMatchNumber && !entry.team ? label : teamName;
  const detailHtml = detailText ? `<small>${renderTournamentParticipantLabel(detailText)}</small>` : "";
  const classes = [
    "knockout-team",
    entry.state === "likely" ? "is-likely" : entry.team ? "is-resolved" : "is-pending",
    isWinner ? "is-winner" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const ariaLabel = [
    ariaName,
    entry.state === "likely" ? localizeText("likely for now") : "",
    localizeText(entry.seedLabel)
  ]
    .filter(Boolean)
    .join(", ");

  return `
    <span class="${classes}"${entry.team ? ` data-team-id="${escapeHtml(entry.team.id)}" data-tooltip="${escapeHtml(teamName)}" tabindex="0"` : ""}${entry.sourceMatchNumber ? ` data-source-match="${escapeHtml(entry.sourceMatchNumber)}"` : ""} aria-label="${escapeHtml(ariaLabel)}">
      <span class="knockout-team-flag" aria-hidden="true">${entry.team ? renderFlag(entry.team) : ""}</span>
      <span class="knockout-team-copy">
        <strong>${renderTournamentParticipantLabel(label)}</strong>
        ${detailHtml}
      </span>
    </span>
  `;
}

function renderTournamentLikelihoodPill(prediction) {
  if (!prediction?.team) {
    return "";
  }

  const label =
    currentLanguage === "zh"
      ? `${localizeText("Likely for now")}：${getLocalizedStandingName(prediction.team)} ${prediction.percent}%`
      : `${localizeText("Likely for now")}: ${getTournamentTeamCode(prediction.team)} ${prediction.percent}%`;
  const reason = localizeText(prediction.reason);

  return `<span class="knockout-likelihood" tabindex="0" aria-label="${escapeHtml(reason)}" data-tooltip="${escapeHtml(reason)}">${escapeHtml(label)}</span>`;
}

function getLocalizedTournamentSlotOddsLabel(slotOdds) {
  if (currentLanguage !== "zh") {
    return slotOdds.label;
  }

  return `${getLocalizedStandingName(slotOdds.team)} ${formatTournamentSlotPercent(slotOdds.probability)} 当前占位`;
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

  const label = getLocalizedTournamentSlotOddsLabel(slotOdds);
  const reason = getLocalizedTournamentSlotOddsReason(slotOdds);
  const tone = getTournamentSlotOddsTone(slotOdds.probability);

  return `<span class="knockout-slot-odds is-${escapeHtml(tone)}" tabindex="0" aria-label="${escapeHtml(reason)}" data-tooltip="${escapeHtml(reason)}">${escapeHtml(label)}</span>`;
}

function renderTournamentSlotOddsFooter(participants) {
  const pills = [participants.home.slotOdds, participants.away.slotOdds]
    .filter((slotOdds) => slotOdds?.team)
    .map(renderTournamentSlotOddsPill)
    .join("");

  return pills ? `<span class="knockout-slot-odds-list">${pills}</span>` : "";
}

function renderTournamentParticipantLabel(label) {
  const match = /^(Group [A-L](?:\/[A-L])*) (Top \d+)$/i.exec(label || "");

  if (!match) {
    return escapeHtml(label);
  }

  return `
    <span class="knockout-seed-label">
      <span>${escapeHtml(match[1])}</span>
      <span>${escapeHtml(match[2])}</span>
    </span>
  `;
}

function renderTournamentMatchCard(match, context, options = {}) {
  if (!match) {
    return "";
  }

  const participants = getTournamentMatchParticipants(match, context);
  const winner = getTournamentMatchWinnerTeam(match, context);
  const nextMatchNumber = getTournamentNextMatchNumber(match.matchNumber);
  const scoreText = formatScorePair(match.score);
  const penaltyText = formatScorePair(match.scoreDetails?.penalties);
  const resultText = scoreText ? `${scoreText}${penaltyText ? ` (${penaltyText} pens)` : ""}` : "";
  const slotOddsFooterHtml =
    !winner && match.stage === "round-of-32" ? renderTournamentSlotOddsFooter(participants) : "";
  const footerHtml = winner
    ? `<span>${escapeHtml(localizeText(`${getTournamentTeamCode(winner)} won`))}</span>`
    : slotOddsFooterHtml
      ? slotOddsFooterHtml
      : `<span>${escapeHtml(getTournamentStageLabel(match.stage))}</span>`;
  const styleText =
    Number.isFinite(options.pathRow) && Number.isFinite(options.pathSpan)
      ? ` style="--path-row: ${escapeHtml(options.pathRow)}; --path-span: ${escapeHtml(options.pathSpan)};"`
      : "";

  return `
    <article class="${escapeHtml(options.className || "progress-match")}${winner ? " is-complete" : ""}" data-match-number="${escapeHtml(match.matchNumber)}"${nextMatchNumber ? ` data-next-match="${escapeHtml(nextMatchNumber)}"` : ""}${winner ? ` data-winner-team-id="${escapeHtml(winner.id)}"` : ""}${styleText}>
      <header class="knockout-match-header">
        <time datetime="${escapeHtml(match.kickoffUtc || "")}">${escapeHtml(getTournamentMatchDateLabel(match))}</time>
      </header>
      <div class="knockout-match-pair">
        ${renderTournamentParticipant(participants.home, {
          isWinner: Boolean(winner && participants.home.team && winner.id === participants.home.team.id)
        })}
        <span class="knockout-versus" aria-label="${escapeHtml(localizeText("vs"))}">${escapeHtml(localizeText("vs"))}</span>
        ${renderTournamentParticipant(participants.away, {
          isWinner: Boolean(winner && participants.away.team && winner.id === participants.away.team.id)
        })}
      </div>
      <footer class="knockout-match-footer">
        ${footerHtml}
        ${resultText ? `<em>${escapeHtml(resultText)}</em>` : ""}
      </footer>
    </article>
  `;
}

function renderTournamentPosterParticipant(entry, options = {}) {
  const { isWinner = false } = options;
  const teamName = entry.team ? getLocalizedStandingName(entry.team) : localizeText(entry.slotText || entry.label);
  const label = entry.team ? getTournamentTeamCode(entry.team) : localizeText(entry.label);
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
  const spanByRound = {
    final: 16,
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

function renderTournamentProgressRound(round, context) {
  const roundLabel = localizeStageLabel(round.label);
  return `
    <section class="progress-round is-${escapeHtml(round.id)}" aria-label="${escapeHtml(roundLabel)}">
      <h3>${escapeHtml(roundLabel)}</h3>
      <div class="progress-match-list">
        ${round.matchNumbers
          .map((matchNumber, index) =>
            renderTournamentMatchCard(getTournamentFixtureByMatchNumber(matchNumber), context, {
              ...getTournamentProgressPlacement(round, index)
            })
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderTournamentProgression(context) {
  return `
    <section class="tournament-progression" aria-label="${escapeHtml(localizeText("Knockout winner progression"))}">
      <svg class="progress-connectors" aria-hidden="true" focusable="false"></svg>
      <div class="progress-rounds">
        ${TOURNAMENT_PROGRESS_ROUNDS.map((round) => renderTournamentProgressRound(round, context)).join("")}
      </div>
    </section>
  `;
}

function renderTournamentView() {
  const context = createTournamentProgressionContext();

  return `
    <section class="tournament-view" aria-label="${escapeHtml(localizeText("Tournament bracket"))}">
      ${renderTournamentProgression(context)}
    </section>
  `;
}

function updateTournamentConnectors() {
  const progression = standingsGrid?.querySelector(".tournament-progression");
  const svg = progression?.querySelector(".progress-connectors");
  const rounds = progression?.querySelector(".progress-rounds");

  if (!progression || !svg || !rounds) {
    return;
  }

  const columnCount = getComputedStyle(rounds).gridTemplateColumns.split(" ").filter(Boolean).length;
  svg.replaceChildren();

  if (columnCount <= 1) {
    return;
  }

  const progressionRect = progression.getBoundingClientRect();
  const width = Math.ceil(progressionRect.width);
  const height = Math.ceil(progressionRect.height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));

  const getRelativePoint = (rect, side) => ({
    x: side === "left" ? rect.left - progressionRect.left : rect.right - progressionRect.left,
    y: rect.top + rect.height / 2 - progressionRect.top
  });
  const roundPoint = (value) => Math.round(value * 2) / 2;

  progression.querySelectorAll(".progress-match[data-next-match]").forEach((source) => {
    const targetMatchNumber = source.dataset.nextMatch;
    const target = progression.querySelector(
      `.progress-match[data-match-number="${CSS.escape(targetMatchNumber)}"]`
    );

    if (!target) {
      return;
    }

    const sourcePoint = getRelativePoint(source.getBoundingClientRect(), "right");
    const targetPoint = getRelativePoint(target.getBoundingClientRect(), "left");

    if (targetPoint.x <= sourcePoint.x) {
      return;
    }

    const joinX = roundPoint(sourcePoint.x + (targetPoint.x - sourcePoint.x) / 2);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
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
  });
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

function getValidStandingsMode(value) {
  return value === "third-place" || value === "tournament" ? value : "groups";
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
  const shouldShowModeTabs = selectedStandingsYear === CURRENT_STANDINGS_YEAR;

  if (standingsModeTabsShell) {
    standingsModeTabsShell.hidden = !shouldShowModeTabs;
  }

  standingsModeTabs.forEach((tab) => {
    const isSelected = shouldShowModeTabs && tab.dataset.standingsMode === selectedStandingsMode;

    tab.classList.toggle("is-active", isSelected);
    tab.disabled = !shouldShowModeTabs;
    tab.hidden = !shouldShowModeTabs;
    tab.setAttribute("aria-pressed", String(isSelected));
  });
  updateStandingsModeTabIndicator();
}

function updateStandingsControls() {
  if (standingsYearButton) {
    standingsYearButton.textContent = String(selectedStandingsYear);
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
        : HISTORICAL_STANDINGS_SUMMARY;
    standingsSummary.textContent = localizeText(summaryText);
  }

  renderStandingsYearPicker();
  updateStandingsModeControls();
}

function renderStandingsLoadingState() {
  standingsGrid.classList.add("is-loading");
  standingsGrid.setAttribute("aria-busy", "true");
  standingsGrid.innerHTML = `
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
}

function renderStandingsView() {
  const isCurrentYear = selectedStandingsYear === CURRENT_STANDINGS_YEAR;
  const isThirdPlaceMode = isCurrentYear && selectedStandingsMode === "third-place";
  const isTournamentMode = isCurrentYear && selectedStandingsMode === "tournament";

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
    : renderHistoricalStandingsCards(selectedStandingsYear);
  updateStandingNameTooltips(standingsGrid);
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
    ${renderPredictionBar("Draw", match.projection.draw)}
    ${renderPredictionBar(match.awayTeam.name, match.projection.away)}
  `;
}

function renderPredictionBlock(match) {
  return `
    <section class="info-block">
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
    ${renderPredictionBar("Draw", projection.draw)}
    ${renderPredictionBar(match.awayTeam.name, projection.away)}
  `;
}

function renderScoreSummary(match, options = {}) {
  const score = getCatchUpScore(match);

  if (!score) {
    const text = options.live
      ? "The match is marked live, but no verified score is loaded yet."
      : "Final score is not loaded for this fixture yet.";
    return `<p class="past-empty">${escapeHtml(localizeText(text))}</p>`;
  }

  const winnerSide = getScoreWinnerSide(score.home, score.away);
  const scoreText = `${score.home}-${score.away}`;

  if (!winnerSide) {
    const text = `${match.homeTeam.name} and ${match.awayTeam.name} ${options.live ? "are level" : "drew"} ${scoreText}.`;
    return `<p class="past-empty">${escapeHtml(localizeText(text))}</p>`;
  }

  const winner = winnerSide === "home" ? match.homeTeam : match.awayTeam;
  const loser = winnerSide === "home" ? match.awayTeam : match.homeTeam;

  const text = `${winner.name} ${options.live ? "lead" : "beat"} ${loser.name} ${scoreText}.`;
  return `<p class="past-empty">${escapeHtml(localizeText(text))}</p>`;
}

function getResultHighlights(match) {
  const authoredHighlights = Array.isArray(match.resultHighlights)
    ? match.resultHighlights.filter((highlight) => typeof highlight === "string" && highlight.trim())
    : [];

  return authoredHighlights.length ? authoredHighlights : getGeneratedResultHighlights(match);
}

function getCatchUpStandout(match) {
  return Array.isArray(match.catchUp)
    ? match.catchUp.find((item) => typeof item?.standouts === "string" && item.standouts.trim())?.standouts.trim() || ""
    : "";
}

function getGoalWord(count) {
  return count === 1 ? "goal" : "goals";
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

  if (score.home === 0 && score.away === 0) {
    return [
      `⚽ ${match.homeTeam.name} and ${match.awayTeam.name} shared a 0-0 draw.`,
      formatStandoutHighlight(standout) || getGeneratedDrawMoment(match, score),
      `📊 Both sides took one point from ${context}.`
    ];
  }

  return [
    `⚽ ${match.homeTeam.name} and ${match.awayTeam.name} finished level at ${scoreText}.`,
    formatStandoutHighlight(standout) || getGeneratedDrawMoment(match, score),
    `📊 Both teams took one point from ${context}.`
  ];
}

function getGeneratedWinHighlights(match, score, context, standout) {
  const winnerSide = getScoreWinnerSide(score.home, score.away);
  const winner = winnerSide === "home" ? match.homeTeam : match.awayTeam;
  const loser = winnerSide === "home" ? match.awayTeam : match.homeTeam;
  const winnerScore = winnerSide === "home" ? score.home : score.away;
  const loserScore = winnerSide === "home" ? score.away : score.home;
  const margin = winnerScore - loserScore;
  const scoreText = `${winnerScore}-${loserScore}`;
  const scoringNote = margin >= 3
    ? `⚽ ${winner.name} made a statement with a ${scoreText} win.`
    : winnerScore === 1
      ? `⚽ ${winner.name} found the decisive goal in a ${scoreText} win.`
      : `⚽ ${winner.name} beat ${loser.name} ${scoreText}.`;
  const controlNote =
    formatStandoutHighlight(standout) ||
    (loserScore === 0
      ? `🌟 The clean sheet gave ${loser.name} no way back.`
      : margin >= 3
        ? `🌟 ${winner.name}'s attack broke the match open.`
        : margin === 1
          ? `🌟 ${winner.name} protected a one-goal edge.`
          : `🌟 ${winner.name} created enough separation to control the finish.`);
  const groupImpact =
    match.groupId && margin > 0
      ? `📊 ${winner.name} took three points and ${formatGoalDifference(margin)} GD in ${context}.`
      : `📊 ${winner.name} took three points from ${context}.`;

  return [
    scoringNote,
    controlNote,
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

  if (!getScoreWinnerSide(score.home, score.away)) {
    return getGeneratedDrawHighlights(match, score, context, standout);
  }

  return getGeneratedWinHighlights(match, score, context, standout);
}

function getFixtureGoals(match) {
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

function findMatchPlayerByName(match, name) {
  const nameKey = normalizeTextKey(name);
  return getMatchKeyPlayers(match).find((player) => normalizeTextKey(getPlayerName(player)) === nameKey) || name;
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
  const player = findMatchPlayerByName(match, goal.name);
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

function renderResultNotes(match) {
  const scoringHighlight = renderScoringDetailsHighlight(match);
  const highlights = getResultHighlights(match).filter(
    (highlight) => !scoringHighlight || !String(highlight).trim().startsWith("⚽")
  );

  if (!scoringHighlight && !highlights.length) {
    return `<p class="data-note">${escapeHtml(localizeText("Final score reflected in the current standings after source checks."))}</p>`;
  }

  const mentionPlayers = getMatchMentionPlayers(match, match.keyInformation || {});
  return `
    <ul class="result-highlights">
      ${scoringHighlight}
      ${highlights
        .map((highlight) => `<li>${renderPlayerLinkedText(localizeDisplayText(highlight), mentionPlayers)}</li>`)
        .join("")}
    </ul>
  `;
}

function renderMatchStatusBlock(match) {
  if (match.status === "FT") {
    return `
      <section class="info-block">
        <h3>${escapeHtml(localizeText("Result"))}</h3>
        ${renderScoreSummary(match)}
        ${renderResultNotes(match)}
      </section>
      ${renderPredictionBlock(match)}
    `;
  }

  if (match.status === "LIVE") {
    return `
      <section class="info-block">
        <h3>${escapeHtml(localizeText("Live score"))}</h3>
        ${renderScoreSummary(match, { live: true })}
        ${renderScoringDetailsList(match, { showMissingWhenGoalsScored: true })}
        <p class="data-note">${escapeHtml(localizeText("Live status is manually verified and should be refreshed after full time."))}</p>
      </section>
    `;
  }

  return renderPredictionBlock(match);
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
    return localizeText("Key information is not loaded yet.");
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
  const name = getPlayerName(player);
  if (!name) {
    return null;
  }

  return playerProfilesByName.get(normalizeTextKey(name)) || null;
}

function getPlayerDisplayName(player, profile = getPlayerProfile(player)) {
  return profile?.displayName || profile?.name || getPlayerName(player);
}

function getLocalizedPlayerDisplayName(player, profile = getPlayerProfile(player)) {
  const displayName = getPlayerDisplayName(player, profile);
  if (currentLanguage !== "zh") {
    return displayName;
  }

  const sourceName = getPlayerName(player);
  const localizedSourceName = localizeDisplayText(sourceName);
  if (localizedSourceName && localizedSourceName !== sourceName) {
    return localizedSourceName;
  }

  return localizeDisplayText(displayName);
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

function getPlayerClubLine(profile) {
  const club = profile?.club || "Club to verify";
  return profile?.league ? `${club} (${profile.league})` : club;
}

function formatPlayerPosition(position) {
  const text = String(position || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return "";
  }

  return text.replace(/(^|[,/]\s*)(\p{Letter})/gu, (_, prefix, letter) => {
    return `${prefix}${letter.toLocaleUpperCase("en-US")}`;
  });
}

function getLocalizedPlayerPosition(profile) {
  return localizeText(formatPlayerPosition(profile?.position) || "Position to verify");
}

function getLocalizedPlayerClubLine(profile) {
  const club = profile?.club ? localizeText(profile.club) : localizeText("Club to verify");
  const league = profile?.league ? localizeText(profile.league) : "";
  return league ? `${club}（${league}）` : club;
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

function getLocalizedPlayerAgeLine(profile) {
  const age = getPlayerAge(profile);
  if (age === null) {
    return "";
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

function getPlayerSkills(player, profile = getPlayerProfile(player)) {
  const skills = Array.isArray(profile?.skills) ? profile.skills.filter(Boolean) : [];
  if (skills.length) {
    return skills.slice(0, 4);
  }

  const note = getPlayerNote(player);
  return note ? [note] : ["Match plan"];
}

function getLocalizedPlayerNote(player, profile = getPlayerProfile(player)) {
  const note = getPlayerNote(player) || profile?.note || "";
  if (!note) {
    return "";
  }

  const localizedNote = localizeText(note);
  if (currentLanguage !== "zh" || localizedNote !== note) {
    return localizeKnownPlayerNames(localizedNote);
  }

  const skills = getPlayerSkills(player, profile)
    .map(localizeText)
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

function renderPlayerPhoto(player, profile) {
  const displayName = getLocalizedPlayerDisplayName(player, profile);
  if (profile?.imageUrl) {
    return `
      <img
        src="${escapeHtml(profile.imageUrl)}"
        alt=""
        loading="lazy"
        referrerpolicy="no-referrer"
      />
    `;
  }

  return `<span class="player-photo-fallback">${escapeHtml(getPlayerInitials(displayName))}</span>`;
}

function renderPlayerMention(label, player) {
  const profile = getPlayerProfile(player);
  const displayName = getLocalizedPlayerDisplayName(player, profile);
  const uniformNumber = getPlayerUniformNumber(player, profile);
  const position = getLocalizedPlayerPosition(profile);
  const club = currentLanguage === "zh" ? getLocalizedPlayerClubLine(profile) : getPlayerClubLine(profile);
  const sourceUrl = profile?.sourceUrl || "";
  const note = getLocalizedPlayerNote(player, profile);
  const ageLine = getLocalizedPlayerAgeLine(profile);
  const valueLine = renderPlayerMarketValueLine(profile);
  const skills = getPlayerSkills(player, profile).map(localizeText);
  const triggerLabel = `aria-label="${escapeHtml(`${displayName}: ${position}, ${club}`)}" aria-expanded="false"`;
  const visibleLabel = currentLanguage === "zh" ? displayName : label;
  const trigger = sourceUrl
    ? `<a class="player-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener" ${triggerLabel}>${escapeHtml(visibleLabel)}</a>`
    : `<span class="player-link" role="button" tabindex="0" ${triggerLabel}>${escapeHtml(visibleLabel)}</span>`;
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
    `<span class="player-hover">`,
    trigger,
    `<span class="player-card" role="tooltip">`,
    `<span class="player-card-header">`,
    `<span class="player-photo">${renderPlayerPhoto(player, profile)}</span>`,
    `<span class="player-card-title">`,
    `<span class="player-card-name-line">`,
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

function positionPlayerCard(playerHover) {
  const card = playerHover?.querySelector(".player-card");
  const trigger = playerHover?.querySelector(".player-link");
  if (!card || !trigger) {
    return;
  }

  const viewportMargin = 18;
  const maxCardWidth = Math.max(0, window.innerWidth - viewportMargin * 2);
  const cardWidth = Math.min(292, maxCardWidth);
  const triggerRect = trigger.getBoundingClientRect();
  const desiredLeft = Math.max(
    viewportMargin,
    Math.min(triggerRect.left, window.innerWidth - cardWidth - viewportMargin)
  );
  const shift = desiredLeft - triggerRect.left;

  card.style.setProperty("--player-card-width", `${cardWidth}px`);
  card.style.setProperty("--player-card-shift", `${Math.round(shift)}px`);
}

function positionPlayerCards() {
  document
    .querySelectorAll(".player-hover")
    .forEach((playerHover) => positionPlayerCard(playerHover));
}

let activePlayerHover = null;

function isTouchPlayerCardMode() {
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

function setPlayerHoverExpanded(playerHover, isExpanded) {
  const trigger = playerHover?.querySelector(".player-link");
  playerHover?.classList.toggle("is-card-open", isExpanded);
  trigger?.setAttribute("aria-expanded", String(isExpanded));
}

function clearActivePlayerHover() {
  if (!activePlayerHover) {
    return;
  }

  setPlayerHoverExpanded(activePlayerHover, false);
  activePlayerHover = null;
}

function openPlayerHoverCard(playerHover) {
  if (activePlayerHover && activePlayerHover !== playerHover) {
    setPlayerHoverExpanded(activePlayerHover, false);
  }

  activePlayerHover = playerHover;
  setPlayerHoverExpanded(playerHover, true);
  positionPlayerCard(playerHover);
}

function renderPlayerLinkedText(text, players = []) {
  const entries = getPlayerMentionEntries(players);
  if (currentLanguage === "zh") {
    for (const player of players) {
      const alias = getLocalizedPlayerDisplayName(player);
      if (alias && !entries.some((entry) => entry.alias === alias)) {
        entries.push({ alias, player });
      }
    }
    entries.sort((a, b) => b.alias.length - a.alias.length);
  }
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

function getMatchKeyPlayers(match) {
  return [
    ...(match.keyPlayers?.home || []),
    ...(match.keyPlayers?.away || [])
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

  return [...playerProfilesByName.values()]
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

function getMatchMentionPlayers(match, keyInformation = {}) {
  return getUniqueMentionPlayers([
    ...getMatchKeyPlayers(match),
    ...getMatchGoalPlayers(match),
    ...getProfileMentionPlayersFromText(keyInformation.home),
    ...getProfileMentionPlayersFromText(keyInformation.away)
  ]);
}

function renderKeyInformationTeam(team, info, players = [], mentionPlayers = players, opponent = null) {
  const text = getKeyInformationText(team, info, players, opponent);
  const label = getKeyInformationLabel(team);
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
    return `${count} ${count === 1 ? "draw" : "draws"}`;
  }

  return `${count} ${count === 1 ? "win" : "wins"}`;
}

function renderPastRecord(match, results) {
  const record = getPastRecord(match, results);
  const items = [
    { count: record.homeWins, label: getLocalizedTeamName(match.homeTeam), type: "win" },
    { count: record.draws, label: "Draw", type: "draw" },
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
  const summary = h2h.summary
    ? `<p class="h2h-summary">${escapeHtml(localizeText(h2h.summary))}</p>`
    : "";

  if (!Array.isArray(h2h.results)) {
    if (h2h.status === "research-pending") {
      return summary;
    }

    return `
      ${summary}
      <p class="past-empty">${escapeHtml(localizeText("Past match research is not loaded for this fixture yet."))}</p>
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

function renderMatchContext(match) {
  if (match.stage === "group") {
    const group = getGroup(match.groupId);
    return `
      <section class="info-block">
        <h3>${escapeHtml(localizeText("Group standings"))}</h3>
        ${renderStandings(match.groupId)}
        <p class="data-note">${escapeHtml(localizeText("Shown in current table order. Points, record and goal difference are included for context."))}</p>
      </section>
    `;
  }

  const stage = tournament.stages.find((item) => item.id === match.stage);
  return `
    <section class="info-block">
      <h3>${escapeHtml(localizeText("Knockout context"))} <span class="section-note">${escapeHtml(localizeText("bracket-ready"))}</span></h3>
      <p class="past-empty">${escapeHtml(localizeText(stage?.label || "Knockout match"))} ${escapeHtml(localizeText("bracket details are not loaded yet."))}</p>
    </section>
  `;
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

function renderHistoricalGoalScorerSegment(goal) {
  const minute = formatGoalMinute(goal);
  const note = formatGoalNote(goal);
  const name = goal.name ? localizeHistoricalScorerName(goal.name) : localizeText("Unknown scorer");

  return `
    <span class="goal-scorer-segment">
      ${renderGoalScorerFlag(goal)}
      ${minute ? `<span class="goal-minute">${escapeHtml(minute)}</span>` : ""}
      <span class="goal-scorer-name">${escapeHtml(name)}</span>
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
        ${goals.map(renderHistoricalGoalScorerSegment).join('<span class="goal-separator">•</span>')}
      </span>
    </li>
  `;
}

function renderHistoricalGoals(match) {
  const hasGoals = match.goalsHome?.length || match.goalsAway?.length;

  if (!hasGoals && match.status === "CANCELLED") {
    return `<p class="past-empty">No goals because this match was cancelled.</p>`;
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

  return currentLanguage === "zh"
    ? `${dateText} 当地时间 ${match.localTime}`
    : `${dateText} at ${match.localTime} local time`;
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

    return `on penalties after a ${score} draw (${penalties} in the shootout)`;
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

function shouldHighlightHistoricalStanding(match, index) {
  return match.tournamentYear >= 1986 && /^Group [A-H]$/.test(match.group || "") && index < 2;
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
              (row, index) => `
                <tr class="${shouldHighlightHistoricalStanding(match, index) ? "is-advancing" : ""}">
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

function getHistoricalRoundContext(match) {
  const knockoutFixtures = getHistoricalTournamentFixtures(match).filter(
    (fixture) => !fixture.group
  );
  const roundOrder = [
    ...new Map(knockoutFixtures.map((fixture) => [fixture.round, fixture.round])).keys()
  ];
  const roundIndex = roundOrder.indexOf(match.round);
  const currentRound = knockoutFixtures.filter((fixture) => fixture.round === match.round);
  const nextRound = /semi/i.test(match.round || "")
    ? knockoutFixtures.filter((fixture) => roundOrder.indexOf(fixture.round) > roundIndex)
    : knockoutFixtures.filter((fixture) => fixture.round === roundOrder[roundIndex + 1]);
  const previousRound = knockoutFixtures.filter(
    (fixture) => fixture.round === roundOrder[roundIndex - 1]
  );
  const involvedTeams = new Set([match.homeTeam.name, match.awayTeam.name]);
  const secondaryRound = (nextRound.length ? nextRound : previousRound).filter(
    (fixture) => involvedTeams.has(fixture.homeSlot) || involvedTeams.has(fixture.awaySlot)
  );

  return {
    currentRound,
    secondaryLabel: nextRound.length ? "Next" : "Previous",
    secondaryRound
  };
}

function renderHistoricalBracketMatch(fixture, selectedId) {
  const winner = getHistoricalWinner(fixture);
  const isSelected = fixture.id === selectedId;
  const outcomeVerb = /final|third|place/i.test(fixture.round || "") ? "won" : "advanced";

  return `
    <li class="${isSelected ? "is-selected" : ""}">
      <span>${escapeHtml(localizeText(fixture.homeSlot))} ${escapeHtml(localizeText("vs"))} ${escapeHtml(localizeText(fixture.awaySlot))}</span>
      <strong>${escapeHtml(getHistoricalScoreText(fixture))}</strong>
      ${winner ? `<em>${escapeHtml(localizeText(`${winner} ${outcomeVerb}`))}</em>` : ""}
    </li>
  `;
}

function renderHistoricalBracketList(label, fixtures, selectedId) {
  if (!fixtures.length) {
    return "";
  }

  return `
    <article>
      <h4>${escapeHtml(localizeText(label))}</h4>
      <ul>
        ${fixtures.map((fixture) => renderHistoricalBracketMatch(fixture, selectedId)).join("")}
      </ul>
    </article>
  `;
}

function renderHistoricalBracketContext(match) {
  const { currentRound, secondaryLabel, secondaryRound } = getHistoricalRoundContext(match);

  return `
    <section class="info-block">
      <h3>${escapeHtml(localizeText("Knockout context"))} <span class="section-note">${escapeHtml(localizeText("archive"))}</span></h3>
      <div class="historical-bracket">
        ${renderHistoricalBracketList(match.round || "This round", currentRound, match.id)}
        ${renderHistoricalBracketList(secondaryLabel, secondaryRound, match.id)}
      </div>
    </section>
  `;
}

function renderHistoricalContext(match) {
  if (match.group) {
    return renderHistoricalGroupStandings(match);
  }

  return renderHistoricalBracketContext(match);
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

    return `${teamName}: drew ${scoreText}`;
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

    return `🤝 ${match.homeTeam.name} and ${match.awayTeam.name} drew ${scoreText}.`;
  }

  const loser = winner === match.homeTeam.name ? match.awayTeam.name : match.homeTeam.name;
  const penalties = match.scoreDetails?.penalties;
  const winnerScoreText = formatScorePair(getHistoricalScorePairForTeam(match, winner));

  if (penalties) {
    if (currentLanguage === "zh") {
      return `🎯 ${getLocalizedHistoricalTeamName(winner)}在 ${formatScorePair(match.score)} 战平后通过点球击败${getLocalizedHistoricalTeamName(loser)}。`;
    }

    return `🎯 ${winner} beat ${loser} on penalties after a ${formatScorePair(match.score)} draw.`;
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

function getHistoricalResultHighlights(match) {
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
  const highlights = getHistoricalResultHighlights(match).filter(
    (highlight) => !scoringHighlight || !String(highlight).trim().startsWith("⚽")
  );

  return `
    <section class="info-block">
      <h3>${escapeHtml(localizeText("Result"))}</h3>
      <p class="past-empty">${escapeHtml(localizeText(getHistoricalResultOutcomeHighlight(match)))}</p>
      <ul class="result-highlights">
        ${scoringHighlight}
        ${highlights
          .map((highlight) => `<li>${escapeHtml(localizeText(highlight))}</li>`)
          .join("")}
      </ul>
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
  if (keyInformation.home && keyInformation.away) {
    const keyPlayers = match.keyPlayers || {};
    return `
      <div class="key-info-grid">
        ${renderKeyInformationTeam(match.homeTeam, keyInformation.home, keyPlayers.home, [], match.awayTeam)}
        ${renderKeyInformationTeam(match.awayTeam, keyInformation.away, keyPlayers.away, [], match.homeTeam)}
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
              <p>${escapeHtml(localizeText(getHistoricalTeamKeyBody(match, team.name)))}</p>
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
    { count: record.draws, label: "Draw", type: "draw" },
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
    return `<p class="past-empty">${escapeHtml(localizeText("No previous men's World Cup meetings are loaded before this match."))}</p>`;
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

    ${renderHistoricalResultBlock(match)}

    ${renderHistoricalContext(match)}

    <section class="info-block">
      ${renderPredictionHeading(getHistoricalProjection(match))}
      ${renderHistoricalProjection(match)}
    </section>

    <section class="info-block">
      <h3>${escapeHtml(localizeText("Key information"))}</h3>
      ${renderHistoricalKeyInformation(match)}
    </section>

    <section class="info-block">
      <h3>${escapeHtml(localizeText("Past matches"))}</h3>
      ${renderHistoricalPastMatches(match)}
    </section>
  `;
}

function renderMatchInfo(match, options = {}) {
  clearActivePlayerHover();
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

  matchInfo.innerHTML = `
    <section class="info-block match-summary">
      <p class="info-kicker">${escapeHtml(localizedContextLabel)}</p>
      <h2 class="summary-title">
        ${renderTeamInline(match.homeTeam, "summary-team", { showRank: false })}
        <span class="versus">${escapeHtml(localizeText("vs"))}</span>
        ${renderTeamInline(match.awayTeam, "summary-team", { showRank: false })}
      </h2>
      <p>${escapeHtml(getVenueLabel(match))}</p>
    </section>

    ${renderMatchContext(match)}

    ${renderMatchStatusBlock(match)}

    <section class="info-block">
      <h3>${escapeHtml(localizeText("Key information"))}</h3>
      ${renderKeyInformation(match)}
    </section>

    <section class="info-block">
      <h3>${escapeHtml(localizeText("Past matches"))}</h3>
      ${renderPastResults(match)}
    </section>
  `;
  positionPlayerCards();
  updateTruncatedTeamTooltips(matchInfo);
  updateStandingNameTooltips(matchInfo);
  updateMeasuredLabelTooltips(matchInfo);

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

function renderEmptyState() {
  activeMatchId = "";
  viewPanels.matches.classList.remove("has-match-info");
  matchList.removeAttribute("aria-busy");
  matchList.replaceChildren(createEmptyStateElement());
  matchInfo.replaceChildren();
  matchInfo.classList.add("is-hidden");
  matchInfo.hidden = true;
}

function renderMatchLoadingState() {
  viewPanels.matches.classList.remove("has-match-info");
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
  if (hasMatchStarted(match) || match.score) {
    return true;
  }

  const kickoffTime = match.kickoffUtc ? new Date(match.kickoffUtc).getTime() : NaN;
  return Number.isFinite(kickoffTime) && currentTime >= kickoffTime;
}

function getYesterdayMatches(currentTime = Date.now()) {
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
  const scoreText = `${score.home}-${score.away}`;
  const label =
    match.status === "LIVE" || state === "live"
      ? localizeText("Current score")
      : localizeText("Final score");
  const ariaLabel = `${label} ${home} ${score.home}, ${away} ${score.away}`;

  return `<span class="match-score" aria-label="${escapeHtml(ariaLabel)}">${escapeHtml(scoreText)}</span>`;
}

function getCompactMatchMeta(match, state, currentTime) {
  return (
    renderCompactMatchScore(match, state) ||
    renderScoreStatus(match, state, currentTime) ||
    (state === "live"
      ? `<span class="live-pill">${escapeHtml(localizeText("Live"))}</span>`
      : "")
  );
}

function createYesterdayMatchCard(match, currentTime) {
  const state = getMatchState(match, new Set(), currentTime);
  const card = document.createElement("article");
  const button = document.createElement("button");
  const homeName = getLocalizedTeamName(match.homeTeam);
  const awayName = getLocalizedTeamName(match.awayTeam);
  const versusText = localizeText("vs");
  const timeLabel = getMatchTimeLabel(match);
  const score = getCompactMatchMeta(match, state, currentTime);
  const scoreText = match.score
    ? `, ${localizeText("final score")} ${match.score.home}-${match.score.away}`
    : "";
  const label = `${homeName} ${versusText} ${awayName}, ${timeLabel}${scoreText}`;
  const winnerSide = getScoreWinnerSide(match.score?.home, match.score?.away);

  card.className = "yesterday-match-card";
  card.dataset.matchId = match.id;
  button.className = "yesterday-match-button";
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-pressed", String(activeMatchId === match.id));
  button.innerHTML = `
    <span class="yesterday-match-time">${escapeHtml(timeLabel)}</span>
    <span class="yesterday-match-pair">
      ${renderTeamInline(match.homeTeam, getTeamClass("yesterday-team", winnerSide, "home", { markLoser: true }), { showRank: false })}
      <span class="versus">${escapeHtml(versusText)}</span>
      ${renderTeamInline(match.awayTeam, getTeamClass("yesterday-team", winnerSide, "away", { markLoser: true }), { showRank: false })}
    </span>
    ${score ? `<span class="yesterday-match-meta">${score}</span>` : ""}
  `;

  card.append(button);
  card.addEventListener("pointerenter", (event) => {
    if (shouldPreviewMatchInfoOnHover(event)) {
      renderMatchInfo(match);
    }
  });
  card.addEventListener("focusin", () => renderMatchInfo(match));
  card.addEventListener("click", () => renderMatchInfo(match, { reveal: true }));
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
  matches.forEach((match) => {
    list.append(createYesterdayMatchCard(match, currentTime));
  });
  section.append(list);
  return section;
}

function getTeamSearchAliases(team) {
  return TEAM_SEARCH_ALIASES_BY_TEAM_ID[team?.id] || [];
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

function getTeamSearchTeamForIdQuery(queryKey) {
  for (const team of teamsById.values()) {
    if (normalizeTextKey(team.id) === queryKey) {
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

  const idQueryTeam = getTeamSearchTeamForIdQuery(queryKey);
  const teamKeys = getTeamSearchKeys(team);

  if (idQueryTeam) {
    const idQueryTeamKeys = new Set(getTeamSearchKeys(idQueryTeam));
    return teamKeys.some((key) => idQueryTeamKeys.has(key));
  }

  return teamKeys.some((key) => isTeamSearchKeyMatch(key, queryKey));
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

  return getCalendarFixtures()
    .map(hydrateFixture)
    .map((match) => ({
      match,
      team: getTeamSearchParticipant(match, queryKey)
    }))
    .filter(({ team }) => Boolean(team))
    .sort((a, b) => getFixtureSortValue(a.match).localeCompare(getFixtureSortValue(b.match)));
}

function getTeamSearchTitle(matches, query = getTeamSearchQuery()) {
  const firstTeam = matches.find(({ team }) => team)?.team;
  return firstTeam ? getLocalizedStandingName(firstTeam) : query.trim();
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
  if (match.status === "FT" || match.score) {
    return true;
  }

  const kickoffTime = match.kickoffUtc ? new Date(match.kickoffUtc).getTime() : NaN;
  return Number.isFinite(kickoffTime) && currentTime > kickoffTime + MATCH_LIVE_WINDOW_MS;
}

function createTeamSearchHeading(title, subtitle = "") {
  const section = document.createElement("section");
  section.className = "team-search-summary";
  section.innerHTML = `
    <p>${escapeHtml(localizeText("Country search"))}</p>
    <h2>${escapeHtml(localizeText(title))}</h2>
    ${subtitle ? `<span>${escapeHtml(localizeText(subtitle))}</span>` : ""}
  `;
  return section;
}

function createTeamSearchSection(title, items, stateForMatch, options = {}) {
  const section = document.createElement("section");
  section.className = ["team-search-section", options.className || ""].filter(Boolean).join(" ");
  section.innerHTML = `<h3>${escapeHtml(localizeText(title))}</h3>`;

  const list = document.createElement("div");
  list.className = "team-search-match-list";
  for (const { match, team } of items) {
    const row = renderMatchRow(match, stateForMatch(match), Date.now(), {
      searchedSide: getTeamSearchMatchedSide(match, team),
      showDate: true
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

function renderTeamSearchEmptyState(query) {
  matchList.replaceChildren(createTeamSearchHeading(query, "No loaded World Cup matches found."));
  renderMatchInfoPrompt();
  updateUrlState();
}

function renderTeamSearchResults() {
  const query = getTeamSearchQuery();
  const currentTime = Date.now();
  const searchMatches = getTeamSearchMatches(query);

  updateDateControls();
  updateTeamSearchControls();

  if (!searchMatches.length) {
    renderTeamSearchEmptyState(query);
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
  const nodes = [
    createTeamSearchHeading(
      getTeamSearchTitle(searchMatches, query),
      "Loaded matches across the current tournament and World Cup archive."
    )
  ];
  const stateForMatch = (match) =>
    match.isHistorical ? "complete" : getMatchState(match, nextMatchIds, currentTime);

  if (nextMatch) {
    nodes.push(createTeamSearchSection("Next match", [nextMatch], stateForMatch));
  }

  if (laterMatches.length) {
    nodes.push(createTeamSearchSection("Later matches", laterMatches, stateForMatch));
  }

  if (previousCurrentMatches.length) {
    nodes.push(createTeamSearchSection("Previous matches", previousCurrentMatches, stateForMatch));
  }

  if (olderWorldCupMatches.length && isShowingOlderTeamMatches) {
    nodes.push(
      createTeamSearchSection("Previous World Cups", olderWorldCupMatches, stateForMatch, {
        className: "is-archive"
      })
    );
  } else if (olderWorldCupMatches.length) {
    nodes.push(createOlderWorldCupsToggle(olderWorldCupMatches.length));
  }

  matchList.replaceChildren(...nodes);
  renderMatchInfoPrompt();
  updateTruncatedTeamTooltips(matchList);
  updateUrlState();
}

function normalizeCatchUpItem(item, match) {
  if (!getCanonicalCatchUpCopyText(item?.headline)) {
    return null;
  }

  const dateKey = item.date || getFixtureDayKey(match);
  const priority = Number(item.priority);
  return {
    dateKey,
    headline: item.headline,
    body: item.body || item.note || "",
    standouts: normalizeCatchUpStandouts(item.standouts || item.standout || item.playerPulse),
    mentionPlayers: getMatchMentionPlayers(match, match.keyInformation || {}),
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
  return {
    dateKey,
    headline: item.headline,
    body: item.body || item.note || "",
    standouts: normalizeCatchUpStandouts(item.standouts || item.standout || item.playerPulse),
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

function getResultCatchUpStandouts(match) {
  return getResultHighlights(match)
    .filter((highlight) => typeof highlight === "string" && highlight.trim())
    .filter((highlight) => !highlight.trim().startsWith("⚽"))
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

  const winnerSide = getScoreWinnerSide(score.home, score.away);

  if (!winnerSide) {
    return {
      dateKey,
      headline: `${match.homeTeam.name} and ${match.awayTeam.name} split the points`,
      body: `${score.home}-${score.away} keeps ${context} open and gives both teams something to carry into the next match.`,
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
  const headline =
    margin >= 3
      ? `${winner.name} make a statement against ${loser.name}`
      : margin === 2
        ? `${winner.name} look sharp against ${loser.name}`
        : `${winner.name} narrowly beat ${loser.name}`;

  return {
    dateKey,
    headline,
    body: `${winner.name}'s ${winnerScore}-${loserScore} win gives them an early foothold in ${context}.`,
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

  return description
    ? `<p class="catch-up-subtitle">${renderPlayerLinkedText(description, item.mentionPlayers || [])}</p>`
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
    renderCatchUp();
    positionCatchUpPopover();
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

function setTeamSearchOpen(isOpen, options = {}) {
  isTeamSearchOpen = isOpen || hasTeamSearchQuery();
  updateTeamSearchControls();

  if (isTeamSearchOpen && options.focus !== false) {
    window.setTimeout(() => teamSearchInput?.focus(), 0);
  }
}

function clearTeamSearch(options = {}) {
  teamSearchQuery = "";
  isShowingOlderTeamMatches = false;
  isTeamSearchOpen = false;
  updateTeamSearchControls();

  if (options.focus) {
    teamSearchInput?.focus();
    setTeamSearchOpen(true, { focus: false });
  }

  if (options.render !== false) {
    renderSchedule();
  }
}

function updateUrlState() {
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

  if (selectedTimeZone !== defaultTimeZone) {
    params.set("tz", selectedTimeZone);
  }

  if (currentLanguage !== DEFAULT_LANGUAGE) {
    params.set("lang", currentLanguage);
  }

  if (activeView === "standings" && selectedStandingsYear !== CURRENT_STANDINGS_YEAR) {
    params.set("standingsYear", String(selectedStandingsYear));
  }

  if (
    activeView === "standings" &&
    selectedStandingsYear === CURRENT_STANDINGS_YEAR &&
    selectedStandingsMode !== "groups"
  ) {
    params.set("standingsMode", selectedStandingsMode);
  }

  const queryString = params.toString();
  const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl !== currentUrl) {
    window.history.replaceState(null, "", nextUrl);
  }
}

function renderInitialLoadingState() {
  renderMatchLoadingState();
  renderStandingsLoadingState();
  renderCatchUpLoadingState();
}

function renderSchedule() {
  if (isInitialDataLoading || isInitialLiveDataLoading) {
    setYesterdayLayoutOffset(false);
    updateDateControls();
    updateTeamSearchControls();
    renderMatchLoadingState();
    updateUrlState();
    return;
  }

  matchList.removeAttribute("aria-busy");

  if (hasTeamSearchQuery()) {
    setYesterdayLayoutOffset(false);
    renderTeamSearchResults();
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
      renderEmptyState();
      updateUrlState();
      return;
    }

    matchList.replaceChildren(createEmptyStateElement(), yesterdaySection);
    const activeMatch = yesterdayMatches.find((match) => match.id === activeMatchId);
    if (activeMatch) {
      renderMatchInfo(activeMatch);
    } else {
      renderMatchInfoPrompt();
    }
    updateTruncatedTeamTooltips(matchList);
    updateUrlState();
    return;
  }

  matchList.replaceChildren(
    ...todayMatches.map((match) =>
      renderMatchRow(match, getMatchState(match, nextMatchIds, currentTime), currentTime)
    ),
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

  updateTruncatedTeamTooltips(matchList);
  updateUrlState();
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

function setActiveView(view) {
  activeView = view === "standings" ? "standings" : "matches";
  updateActiveViewElements();
  updateTruncatedTeamTooltips(viewPanels.matches);
  updateStandingNameTooltips(standingsGrid);
  updateUrlState();
}

function readInitialChromeState() {
  const params = new URLSearchParams(window.location.search);
  const requestedTimeZone = params.get("tz");
  const requestedView = params.get("view");

  if (requestedTimeZone && timeZones.includes(requestedTimeZone)) {
    selectedTimeZone = requestedTimeZone;
    storeTimeZone(selectedTimeZone);
    selectedDayKey = getDayKey(initialDate, selectedTimeZone);
    calendarMonthKey = getMonthKeyFromDayKey(selectedDayKey);
  }

  activeView = requestedView === "standings" ? "standings" : "matches";
}

function readUrlState(options = {}) {
  const params = new URLSearchParams(window.location.search);
  const requestedTimeZone = params.get("tz");
  const requestedLanguage = normalizeLanguage(params.get("lang"));
  const requestedDate = params.get("date");
  const requestedTeam = params.get("team") || params.get("country");
  const requestedView = params.get("view");
  const requestedStandingsYear = params.get("standingsYear") || params.get("year");
  const requestedStandingsMode = params.get("standingsMode") || params.get("standings");
  const shouldUseRequestedDate = !options.forceToday && isDayKey(requestedDate);

  if (requestedTimeZone && timeZones.includes(requestedTimeZone)) {
    selectedTimeZone = requestedTimeZone;
    storeTimeZone(selectedTimeZone);
  }

  if (requestedLanguage) {
    currentLanguage = requestedLanguage;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  }

  if (shouldUseRequestedDate) {
    selectedDayKey = requestedDate;
  } else {
    selectedDayKey = getDayKey(new Date(), selectedTimeZone);
  }

  activeView = requestedView === "standings" ? "standings" : "matches";
  teamSearchQuery = activeView === "matches" ? String(requestedTeam || "").trim() : "";
  isTeamSearchOpen = teamSearchQuery.length > 0;
  isShowingOlderTeamMatches = false;
  selectedStandingsYear = getValidStandingsYear(requestedStandingsYear);
  selectedStandingsMode =
    selectedStandingsYear === CURRENT_STANDINGS_YEAR
      ? getValidStandingsMode(requestedStandingsMode)
      : "groups";
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
  const sourceSeparator = currentLanguage === "zh" ? "、" : ", ";
  const sourcesText = currentLanguage === "zh" ? "来源：" : "Sources: ";
  const sentenceEnd = currentLanguage === "zh" ? "。" : ".";
  const predictionsText = localizeText("Predictions are unofficial.");
  const lastUpdated = updatedAtText
    ? currentLanguage === "zh"
      ? `最后更新：${escapeHtml(updatedAtText)}。`
      : `Last updated ${escapeHtml(updatedAtText)}.`
    : "";
  const reportIssueText = localizeText("Report issue");
  const creatorLink = `<a href="https://www.linkedin.com/in/hirooaoy" target="_blank" rel="noreferrer">Hirooaoy</a>`;
  const creatorText = currentLanguage === "zh" ? `由 ${creatorLink} 制作` : `Made by ${creatorLink}`;

  const reportUrl = currentLanguage === "zh" ? "report.html?lang=zh" : "report.html";
  sourceNote.innerHTML = `${sourcesText}${officialSourceLinks.join(sourceSeparator)}${sentenceEnd} ${predictionsText}${lastUpdated ? ` ${lastUpdated}` : ""} <a href="${reportUrl}">${escapeHtml(reportIssueText)}</a>${sentenceEnd} ${creatorText}${sentenceEnd}`;
}

function renderLoadError(error) {
  console.error("Unable to load World Cup data", error);
  isInitialDataLoading = false;
  isInitialLiveDataLoading = false;
  matchList.removeAttribute("aria-busy");
  matchList.innerHTML = `
    <article class="empty-state">
      <h2>Data unavailable</h2>
      <p>The match data could not be loaded. Refresh the page to try again.</p>
    </article>
  `;
  matchInfo.innerHTML = `<p class="info-empty">The match data could not be loaded.</p>`;
  standingsGrid.classList.remove("is-loading");
  standingsGrid.removeAttribute("aria-busy");
  standingsGrid.innerHTML = `
    <article class="standings-card standings-empty-card">
      <h2>Data unavailable</h2>
      <p class="past-empty">The standings data could not be loaded. Refresh the page to try again.</p>
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
      <h2>Unable to display matches</h2>
      <p>The page loaded, but something went wrong while displaying it. Refresh the page to try again.</p>
    </article>
  `;
  matchInfo.innerHTML = `<p class="info-empty">The match view could not be displayed.</p>`;
  standingsGrid.classList.remove("is-loading");
  standingsGrid.removeAttribute("aria-busy");
  standingsGrid.innerHTML = `
    <article class="standings-card standings-empty-card">
      <h2>Unable to display standings</h2>
      <p class="past-empty">The standings view could not be displayed. Refresh the page to try again.</p>
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
  playerProfilesData,
  standingsData,
  teamsData,
  tournamentData
}) {
  teamsById = new Map(teamsData.teams.map((team) => [team.id, team]));
  teamsByName = buildTeamNameLookup(teamsData.teams);
  playerProfilesByName = new Map(
    Object.entries(playerProfilesData.profiles || {}).map(([name, profile]) => [
      normalizeTextKey(name),
      profile
    ])
  );
  shouldShowPlayerMarketValues = hasCompletePlayerMarketValues(playerProfilesData);
  fixtures = fixturesData.fixtures;
  history = historyData;
  historicalFixtures = historyData.fixtures || [];
  historicalProjectionCache.clear();
  standingsByGroup = standingsData.groups;
  tournament = tournamentData;
  dataCoverage = fixturesData.coverage || { status: "partial" };
  liveDataCheckedAt = "";
  siteUpdatedAt = getLatestUpdatedAt([
    fixturesData,
    historyData,
    playerProfilesData,
    teamsData,
    standingsData,
    tournamentData
  ]);
}

function applyLiveDataSnapshot(liveData) {
  fixtures = liveData.fixturesData.fixtures;
  standingsByGroup = liveData.standingsData.groups;
  tournament = liveData.tournamentData;
  dataCoverage = liveData.fixturesData.coverage || { status: "partial" };
  liveDataCheckedAt = liveData.syncStatus?.checkedAt || liveData.fixturesData.updatedAt || "";
  siteUpdatedAt = getLatestUpdatedAt([
    { updatedAt: siteUpdatedAt },
    liveData.fixturesData,
    liveData.standingsData,
    liveData.tournamentData
  ]);
}

async function loadStaticData() {
  const [
    fixturesData,
    historyData,
    playerProfilesData,
    teamsData,
    standingsData,
    tournamentData
  ] = await Promise.all([
    loadJson(DATA_URLS.fixtures),
    loadJson(DATA_URLS.history),
    loadOptionalJson(DATA_URLS.playerProfiles, { profiles: {} }),
    loadJson(DATA_URLS.teams),
    loadJson(DATA_URLS.standings),
    loadJson(DATA_URLS.tournament)
  ]);

  applyDataSnapshot({
    fixturesData,
    historyData,
    playerProfilesData,
    standingsData,
    teamsData,
    tournamentData
  });
  isInitialDataLoading = false;
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

function setLanguage(language) {
  const nextLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;

  if (nextLanguage === currentLanguage) {
    applyLanguageToPage();
    if (isCatchUpOpen) {
      renderCatchUp();
      positionCatchUpPopover();
    }
    return;
  }

  currentLanguage = nextLanguage;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);

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

  updateUrlState();
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
  } catch (error) {
    renderLoadError(error);
    return;
  }

  try {
    readUrlState({ forceToday: isReloadNavigation() });
    isInitialLiveDataLoading = true;
    renderLoadedApp({ syncActiveView: true });
    setInterval(renderSchedule, 60 * 1000);
    setInterval(refreshData, DATA_REFRESH_INTERVAL_MS);
    loadInitialLiveData();
  } catch (error) {
    renderAppError(error);
  }
}

viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveView(tab.dataset.view);
  });
});

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.language);
  });
});

showYesterdayToggle?.addEventListener("change", () => {
  setShowYesterdayMatches(showYesterdayToggle.checked);
});

standingsModeTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    selectStandingsMode(tab.dataset.standingsMode);
  });
});

standingsGrid.addEventListener("click", (event) => {
  const groupButton = event.target.closest(".third-place-group-button");

  if (!groupButton) {
    return;
  }

  openStandingsGroup(groupButton.dataset.groupId);
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
  teamSearchQuery = teamSearchInput.value;
  isShowingOlderTeamMatches = false;
  isTeamSearchOpen = true;
  renderSchedule();
});

teamSearchInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  event.stopPropagation();
  if (hasTeamSearchQuery()) {
    clearTeamSearch({ focus: true });
  } else {
    setTeamSearchOpen(false, { focus: false });
    teamSearchToggle?.focus();
  }
});

teamSearchClear?.addEventListener("click", () => {
  clearTeamSearch({ focus: true });
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
  selectStandingsYear(yearButton.dataset.standingsYear);
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
      const playerHover = event.target.closest(".player-hover");
      if (playerHover) {
        positionPlayerCard(playerHover);
      }
    },
    true
  );

  root?.addEventListener("focusin", (event) => {
    const playerHover = event.target.closest(".player-hover");
    if (playerHover) {
      positionPlayerCard(playerHover);
    }
  });
}

matchInfo.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
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

document.addEventListener("pointerdown", (event) => {
  if (activePlayerHover && !event.target.closest(".player-hover")) {
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

window.addEventListener("resize", () => {
  updateTabIndicators();
  updateTimeZoneLabelForViewport();
  positionCatchUpPopover();
  positionPlayerCards();
  updateTruncatedTeamTooltips();
  updateStandingNameTooltips();
  updateMeasuredLabelTooltips();
  window.requestAnimationFrame(() => {
    updateTruncatedTeamTooltips();
    updateStandingNameTooltips();
    updateMeasuredLabelTooltips();
    updateTournamentConnectors();
    updateTabIndicators();
  });
});
window.addEventListener(
  "scroll",
  () => {
    positionCatchUpPopover();
    positionPlayerCards();
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
    setActiveView(nextTab.dataset.view);
  });
});

standingsModeTabs.forEach((tab, index) => {
  tab.addEventListener("keydown", (event) => {
    const keyActions = {
      ArrowLeft: () => (index + standingsModeTabs.length - 1) % standingsModeTabs.length,
      ArrowRight: () => (index + 1) % standingsModeTabs.length,
      Home: () => 0,
      End: () => standingsModeTabs.length - 1
    };
    const getNextIndex = keyActions[event.key];

    if (!getNextIndex) {
      return;
    }

    event.preventDefault();
    const nextTab = standingsModeTabs[getNextIndex()];
    nextTab.focus();
    selectStandingsMode(nextTab.dataset.standingsMode);
  });
});

window.addEventListener("popstate", () => {
  syncUrl = false;
  readUrlState();
  ensureSelectableSelectedDay();
  renderTimeZoneOptions();
  renderStandingsView();
  setActiveView(activeView);
  renderSchedule();
  renderSourceNote();
  syncUrl = true;
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
