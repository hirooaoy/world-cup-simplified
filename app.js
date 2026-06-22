const DATA_VERSION = "2026-06-21-trophy-polish";
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
    matches: "Matches",
    matchesHeading: "Matches and selected match details",
    matchesList: "Matches",
    month: "Month",
    searchCountryPlaceholder: "Search country",
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
    matches: "赛程",
    matchesHeading: "比赛和已选比赛详情",
    matchesList: "比赛",
    month: "月份",
    searchCountryPlaceholder: "搜索国家队",
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
    "Current third-place teams across every group. Top eight advance; unresolved ties are flagged when fair-play data is not loaded.":
      "各组当前第三名球队。前八名晋级；若公平竞赛数据尚未载入，未决平局会被标记。",
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
    "Loading matches": "正在加载比赛",
    "Loaded matches across the current tournament and World Cup archive.":
      "显示当前赛事和世界杯存档中的已载入比赛。",
    "Local estimate using FIFA rankings. Not betting odds.":
      "基于FIFA排名的本地估算，并非博彩赔率。",
    "Local historical-form estimate. Not betting odds.": "基于历史世界杯状态的本地估算，并非博彩赔率。",
    "Local preview estimate. Not betting odds.": "本地预览估算，并非博彩赔率。",
    "Market-implied consensus from public odds, normalized to remove sportsbook margin. Not betting advice.":
      "由公开赔率推导的市场共识，并已归一化去除庄家利润；这不是投注建议。",
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
    pattern: /^(.+) have a live edge over (.+)$/,
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
    pattern: /^(.+) edge (.+) in a tight one$/,
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
    pattern: /^⚽ (.+) found the decisive goal in a (.+) win\.$/,
    replace: (_, winner, score) => `⚽ ${translateTextToZh(winner)} 在 ${score} 的胜利中打入制胜球。`
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
    pattern: /^📊 (.+) took three points and (.+) GD in (.+)\.$/,
    replace: (_, winner, gd, context) => `📊 ${translateTextToZh(winner)} 在 ${translateTextToZh(context)} 中拿到3分，并获得 ${gd} 净胜球。`
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
    pattern: /^(FIFA|FOX Sports) (.+) vs (.+) final score(?: cross-check)?$/,
    replace: (_, source, home, away) =>
      `${source} ${translateTextToZh(home)} 对 ${translateTextToZh(away)} 最终比分`
  },
  {
    pattern: /^(.+) vs (.+) final score(?: cross-check)?$/,
    replace: (_, home, away) => `${translateTextToZh(home)} 对 ${translateTextToZh(away)} 最终比分`
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
  }
];

const matchList = document.querySelector("#match-list");
const matchInfo = document.querySelector("#match-info");
const timezoneSelect = document.querySelector("#timezone-select");
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
const brandLabel = document.querySelector(".site-brand span");
const languageSwitch = document.querySelector("#language-switch");
const languageButtons = document.querySelectorAll(".language-option");
const standingsHeadingText = document.querySelector("#standings-heading span");
const calendarWeekdayLabels = document.querySelectorAll(".calendar-weekdays span");
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
  "Current third-place teams across every group. Top eight advance; unresolved ties are flagged when fair-play data is not loaded.";
const TOURNAMENT_STANDINGS_SUMMARY =
  "Current knockout path with likely winners filled for now. Finished results replace estimates.";
const HISTORICAL_STANDINGS_SUMMARY =
  "Final group tables computed from archived match results.";
const TOURNAMENT_PROGRESS_ROUNDS = [
  {
    id: "round-of-32",
    label: "Round of 32",
    matchNumbers: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87]
  },
  { id: "round-of-16", label: "Round of 16", matchNumbers: [89, 90, 91, 92, 93, 94, 95, 96] },
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

const initialDate = new Date();
let selectedTimeZone = defaultTimeZone;
let selectedDayKey = getDayKey(initialDate, selectedTimeZone);
let activeMatchId = "";
let activeView = "matches";
let selectedStandingsYear = CURRENT_STANDINGS_YEAR;
let selectedStandingsMode = "groups";
let teamSearchQuery = "";
let calendarMonthKey = getMonthKeyFromDayKey(selectedDayKey);
let isCalendarOpen = false;
let isCatchUpOpen = false;
let isStandingsYearOpen = false;
let isTeamSearchOpen = false;
let isShowingOlderTeamMatches = false;
let fixtures = [];
let historicalFixtures = [];
let history = { coverage: {}, fixtures: [], source: null, tournaments: [] };
const historicalProjectionCache = new Map();
let playerProfilesByName = new Map();
let teamsById = new Map();
let teamsByName = new Map();
let tournament = { groups: [], stages: [], sources: [] };
let standingsByGroup = {};
let dataCoverage = { status: "partial" };
let siteUpdatedAt = "";
let liveDataCheckedAt = "";
let syncUrl = true;
let isInitialLiveDataLoading = false;

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

function localizeText(value) {
  return currentLanguage === "zh" ? translateTextToZh(value) : String(value ?? "");
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

  languageSwitch?.setAttribute("aria-label", t("language"));
  languageButtons.forEach((button) => {
    const language = normalizeLanguage(button.dataset.language);
    const isSelected = language === currentLanguage;
    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
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
  catchUpButton.textContent = t("catchUp");
  catchUpPopover?.setAttribute("aria-label", t("catchUpDialog"));
  document.querySelector(".timezone-control .visually-hidden").textContent = t("timeZone");
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
}

function shouldLocalizeTextNode(node) {
  const parent = node.parentElement;
  return Boolean(
    parent &&
      node.nodeValue.trim() &&
      !parent.closest("script, style, svg, input, textarea, select")
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

function normalizeTextKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
  return `${timeZone.replace(/_/g, " ")} (${getTimeZoneAbbreviation(timeZone)})`;
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
  }

  isStandingsYearOpen = isOpen;
  standingsYearPopover.classList.toggle("is-hidden", !isOpen);
  standingsYearButton.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    renderStandingsYearPicker();
  }
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
    .querySelectorAll(".team[data-tooltip], .past-team[data-tooltip], .summary-team[data-tooltip]")
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
    const venue = zhVenueNames[match.venue] || localizeText(match.venue);
    const location = zhVenueLocations[match.venue] || localizeText(venueLocations[match.venue] || "");
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
    return `<strong class="past-scoreline-fallback">${escapeHtml(result.score || "Score unavailable")}</strong>`;
  }

  const homeTeam = getTeam(result.homeTeamId);
  const awayTeam = getTeam(result.awayTeamId);
  const shouldFlipScoreline = leadingTeamId && result.awayTeamId === leadingTeamId;
  const leftTeam = shouldFlipScoreline ? awayTeam : homeTeam;
  const rightTeam = shouldFlipScoreline ? homeTeam : awayTeam;
  const leftScore = shouldFlipScoreline ? result.awayScore : result.homeScore;
  const rightScore = shouldFlipScoreline ? result.homeScore : result.awayScore;
  const scoreText = `${leftScore}-${rightScore}`;
  const scoreNote = result.scoreNote ? ` ${result.scoreNote}` : "";
  const winnerSide = getScoreWinnerSide(leftScore, rightScore);

  const ariaLabel = `${getLocalizedTeamName(leftTeam)} ${scoreText} ${getLocalizedTeamName(rightTeam)}${scoreNote}`;

  return `
    <div class="past-scoreline" aria-label="${escapeHtml(ariaLabel)}">
      ${renderTeamInline(leftTeam, getTeamClass("past-team", winnerSide, "home", { markLoser: true }), { showRank: false })}
      <strong class="past-score">
        ${escapeHtml(scoreText)}
        ${result.scoreNote ? `<span>${escapeHtml(result.scoreNote)}</span>` : ""}
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

function getMatchTimeAriaLabel(match) {
  if (match.status === "FT" && !match.kickoffUtc && !match.localTime) {
    return localizeText("Full time");
  }

  return getMatchTimeLabel(match);
}

function renderMatchRow(match, state, currentTime = Date.now(), options = {}) {
  const row = document.createElement("div");
  const homeName = getLocalizedTeamName(match.homeTeam);
  const awayName = getLocalizedTeamName(match.awayTeam);
  const versusText = localizeText("vs");
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
  const rowMeta = `${scoreStatus}${stateBadge}${score}`;
  const rowLabel = `${stateLabel}${homeName} ${versusText} ${awayName}${statusLabel}${
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
      <time class="match-time" datetime="${escapeHtml(getMatchDateTimeValue(match))}" title="${escapeHtml(getMatchTimeAriaLabel(match))}" aria-label="${escapeHtml(getMatchTimeAriaLabel(match))}">
        ${escapeHtml(getMatchTimeLabel(match))}
      </time>
      <span class="match-teams">
        ${renderTeamInline(match.homeTeam, getTeamClass("team", winnerSide, "home"))}
        <span class="versus">${escapeHtml(versusText)}</span>
        ${renderTeamInline(match.awayTeam, getTeamClass("team", winnerSide, "away"))}
      </span>
    </button>
    ${rowMeta ? `<span class="match-row-meta">${rowMeta}</span>` : ""}
  `;

  row.addEventListener("pointerenter", () => renderMatchInfo(match));
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
      <p class="third-place-note">${escapeHtml(note)}</p>
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
  return [navDateFormatter.format(getDateFromKey(dateKey)), timeLabel].filter(Boolean).join(" / ");
}

function createTournamentProgressionContext() {
  return {
    currentThirdPlaceAssignment: getCurrentThirdPlaceAssignment(),
    likelyWinnersCache: new Map(),
    participantsCache: new Map(),
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

    const prediction = getTournamentLikelyWinnerPrediction(sourceMatch, context);
    const likelyParticipant = getTournamentLikelyParticipant(prediction, sourceMatchNumber);

    return likelyParticipant || getTournamentPendingParticipant("Likely", "To be decided", sourceMatchNumber);
  }

  if (match?.stage === "round-of-32") {
    const slot = getRoundOf32SlotDefinition(match, side);
    const team = getCurrentTournamentSlotTeam(slot, context.currentThirdPlaceAssignment);
    const seedLabel = getTournamentSlotSeedLabel(slot, context.currentThirdPlaceAssignment);

    if (team) {
      return {
        label: getTournamentTeamCode(team),
        likelihoodPercent: null,
        likelihoodReason: "",
        seedLabel,
        slotText,
        state: "resolved",
        team
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
  const label = entry.team ? getTournamentTeamCode(entry.team) : entry.label;
  const classes = [
    "knockout-team",
    entry.state === "likely" ? "is-likely" : entry.team ? "is-resolved" : "is-pending",
    isWinner ? "is-winner" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const ariaLabel = [
    teamName,
    entry.state === "likely" ? localizeText("likely for now") : "",
    localizeText(entry.seedLabel)
  ]
    .filter(Boolean)
    .join(", ");

  return `
    <span class="${classes}"${entry.team ? ` data-team-id="${escapeHtml(entry.team.id)}"` : ""}${entry.sourceMatchNumber ? ` data-source-match="${escapeHtml(entry.sourceMatchNumber)}"` : ""} aria-label="${escapeHtml(ariaLabel)}">
      <span class="knockout-team-flag" aria-hidden="true">${entry.team ? renderFlag(entry.team) : ""}</span>
      <span class="knockout-team-copy">
        <strong>${escapeHtml(label)}</strong>
        <small>${escapeHtml(entry.team ? [localizeText(entry.seedLabel), teamName].filter(Boolean).join(" / ") : teamName)}</small>
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
  const prediction = winner ? null : getTournamentLikelyWinnerPrediction(match, context);
  const footerHtml = winner
    ? `<span>${escapeHtml(localizeText(`${getTournamentTeamCode(winner)} won`))}</span>`
    : prediction
      ? renderTournamentLikelihoodPill(prediction)
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
  const label = entry.team ? getTournamentTeamCode(entry.team) : entry.label;
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
      <div class="tournament-section-heading">
        <span>${escapeHtml(localizeText("Likely for now"))}</span>
        <h2>${escapeHtml(localizeText("Knockout path"))}</h2>
      </div>
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

function renderCurrentStandingsCards() {
  const thirdPlaceRaceByTeamId = getThirdPlaceRaceByTeamId();

  return tournament.groups
    .map(
      (group) => `
        <article class="standings-card" data-group-id="${escapeHtml(group.id)}" tabindex="-1">
          <h2>${escapeHtml(group.label)}</h2>
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
        <h2>${escapeHtml(year)} archive</h2>
        <p class="past-empty">Group standings are not available for this archived tournament.</p>
      </article>
    `;
  }

  return groups
    .map(
      (groupName) => `
        <article class="standings-card">
          <h2>${escapeHtml(groupName)}</h2>
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
}

function updateStandingsControls() {
  if (standingsYearButton) {
    standingsYearButton.textContent = String(selectedStandingsYear);
    standingsYearButton.setAttribute(
      "aria-label",
      `Choose standings year, ${selectedStandingsYear} selected`
    );
    standingsYearButton.setAttribute("aria-expanded", String(isStandingsYearOpen));
  }

  if (standingsSummary) {
    standingsSummary.textContent =
      selectedStandingsYear === CURRENT_STANDINGS_YEAR
        ? selectedStandingsMode === "third-place"
          ? THIRD_PLACE_STANDINGS_SUMMARY
          : selectedStandingsMode === "tournament"
            ? TOURNAMENT_STANDINGS_SUMMARY
          : CURRENT_STANDINGS_SUMMARY
        : HISTORICAL_STANDINGS_SUMMARY;
  }

  renderStandingsYearPicker();
  updateStandingsModeControls();
}

function renderStandingsView() {
  const isCurrentYear = selectedStandingsYear === CURRENT_STANDINGS_YEAR;
  const isThirdPlaceMode = isCurrentYear && selectedStandingsMode === "third-place";
  const isTournamentMode = isCurrentYear && selectedStandingsMode === "tournament";

  updateStandingsControls();
  standingsGrid.classList.toggle("is-third-place-race", isThirdPlaceMode);
  standingsGrid.classList.toggle("is-tournament", isTournamentMode);
  standingsGrid.setAttribute(
    "aria-label",
    isTournamentMode
      ? "Tournament bracket"
      : isThirdPlaceMode
        ? "Best third-place race"
        : "Group standings"
  );
  standingsGrid.innerHTML = isCurrentYear
    ? isTournamentMode
      ? renderTournamentView()
      : isThirdPlaceMode
      ? renderThirdPlaceRaceView()
      : renderCurrentStandingsCards()
    : renderHistoricalStandingsCards(selectedStandingsYear);
  updateStandingNameTooltips(standingsGrid);
}

function renderPredictionBar(label, value) {
  const percent = clampPercent(value);
  const escapedLabel = escapeHtml(label);
  return `
    <div class="prediction-row" data-tooltip="${escapedLabel}">
      ${renderMeasuredLabel(label, "prediction-label")}
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
    return "Market-implied consensus from public odds, normalized to remove sportsbook margin. Not betting advice.";
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
    return `<p class="past-empty">No verified projection is loaded for this fixture yet.</p>`;
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
    return `<p class="past-empty">No historical prediction is generated for cancelled fixtures.</p>`;
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

  return standout.startsWith("🌟") ? standout : `🌟 ${standout.replace(/^[⚽🔥🛡️🧤]\s*/, "")}`;
}

function getGeneratedDrawHighlights(match, score, context, standout) {
  const scoreText = `${score.home}-${score.away}`;

  if (score.home === 0 && score.away === 0) {
    return [
      `⚽ ${match.homeTeam.name} and ${match.awayTeam.name} shared a 0-0 draw.`,
      "🌟 Both clean sheets kept the match tight.",
      `📊 Both sides took one point from ${context}.`
    ];
  }

  return [
    `⚽ ${match.homeTeam.name} and ${match.awayTeam.name} finished level at ${scoreText}.`,
    formatStandoutHighlight(standout) || "🌟 Neither side pulled clear after trading goals.",
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

function renderResultNotes(match) {
  const highlights = getResultHighlights(match);

  if (!highlights.length) {
    return `<p class="data-note">Final score reflected in the current standings after source checks.</p>`;
  }

  return `
    <ul class="result-highlights">
      ${highlights.map((highlight) => `<li>${escapeHtml(localizeText(highlight))}</li>`).join("")}
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

function getKeyInformationText(team, info, players = []) {
  const specificCopy = getKeyInformationCopy(info);
  if (specificCopy) {
    return localizeText(specificCopy);
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

  return localizeText(`${team.name}'s key pieces here are ${getNameSeries(names)}. ${notes.join(" ")}`);
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

function getPlayerSkills(player, profile = getPlayerProfile(player)) {
  const skills = Array.isArray(profile?.skills) ? profile.skills.filter(Boolean) : [];
  if (skills.length) {
    return skills.slice(0, 4);
  }

  const note = getPlayerNote(player);
  return note ? [note] : ["Match plan"];
}

function getPlayerAliases(player, allPlayers) {
  const name = getPlayerName(player);
  const profile = getPlayerProfile(player);
  const displayName = getPlayerDisplayName(player, profile);
  const candidates = [name, displayName];
  const nameParts = name.split(/\s+/).filter(Boolean);
  const displayParts = displayName.split(/\s+/).filter(Boolean);

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
  const displayName = getPlayerDisplayName(player, profile);
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
  const displayName = getPlayerDisplayName(player, profile);
  const uniformNumber = getPlayerUniformNumber(player, profile);
  const position = profile?.position || "Position to verify";
  const club = getPlayerClubLine(profile);
  const sourceUrl = profile?.sourceUrl || "";
  const note = getPlayerNote(player) || profile?.note || "";
  const skills = getPlayerSkills(player, profile);
  const triggerLabel = `aria-label="${escapeHtml(`${displayName}: ${position}, ${club}`)}" aria-expanded="false"`;
  const trigger = sourceUrl
    ? `<a class="player-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener" ${triggerLabel}>${escapeHtml(label)}</a>`
    : `<span class="player-link" role="button" tabindex="0" ${triggerLabel}>${escapeHtml(label)}</span>`;

  return `
    <span class="player-hover">
      ${trigger}
      <span class="player-card" role="tooltip">
        <span class="player-card-header">
          <span class="player-photo">${renderPlayerPhoto(player, profile)}</span>
          <span class="player-card-title">
            <span class="player-card-name-line">
              <strong class="player-card-name">${escapeHtml(displayName)}</strong>
              ${uniformNumber ? `<span class="player-card-number">#${escapeHtml(uniformNumber)}</span>` : ""}
            </span>
            <span class="player-card-position">${escapeHtml(position)}</span>
            <span class="player-card-club">${escapeHtml(club)}</span>
          </span>
        </span>
        <span class="player-skill-list">
          ${skills.map((skill) => `<span>${escapeHtml(skill)}</span>`).join("")}
        </span>
        ${note ? `<span class="player-card-note">${escapeHtml(note)}</span>` : ""}
      </span>
    </span>
  `;
}

function positionPlayerCard(playerHover) {
  const card = playerHover?.querySelector(".player-card");
  if (!card) {
    return;
  }

  const viewportMargin = 18;
  const maxCardWidth = Math.max(0, window.innerWidth - viewportMargin * 2);
  const cardWidth = Math.min(292, maxCardWidth);
  const triggerRect = playerHover.getBoundingClientRect();
  const desiredLeft = Math.max(
    viewportMargin,
    Math.min(triggerRect.left, window.innerWidth - cardWidth - viewportMargin)
  );
  const shift = desiredLeft - triggerRect.left;

  card.style.setProperty("--player-card-width", `${cardWidth}px`);
  card.style.setProperty("--player-card-shift", `${Math.round(shift)}px`);
}

function positionPlayerCards() {
  matchInfo
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

function renderKeyInformationTeam(team, info, players = [], mentionPlayers = players) {
  const text = getKeyInformationText(team, info, players);
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
  const mentionPlayers = getMatchKeyPlayers(match);

  return `
    <div class="key-info-grid">
      ${renderKeyInformationTeam(match.homeTeam, keyInformation.home, keyPlayers.home, mentionPlayers)}
      ${renderKeyInformationTeam(match.awayTeam, keyInformation.away, keyPlayers.away, mentionPlayers)}
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
    ? `<p class="h2h-summary">${escapeHtml(h2h.summary)}</p>`
    : "";

  if (!Array.isArray(h2h.results)) {
    if (h2h.status === "research-pending") {
      return summary;
    }

    return `
      ${summary}
      <p class="past-empty">Past match research is not loaded for this fixture yet.</p>
    `;
  }

  if (!h2h.results.length) {
    return summary || `<p class="past-empty">No verified senior meetings found before this match.</p>`;
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
        ${renderStandings(match.groupId, { showRank: false })}
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
    return `<p class="past-empty">Score details are not loaded for this historical record.</p>`;
  }

  return `
    <dl class="historical-facts">
      ${rows
        .map(
          (row) => `
            <div>
              <dt>${escapeHtml(row.label)}</dt>
              <dd>${escapeHtml(row.value)}</dd>
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
    goal.penalty ? "pen." : "",
    goal.ownGoal ? "own goal" : ""
  ]
    .filter(Boolean)
    .join(", ");
}

function renderHistoricalGoalTeam(team, goals = []) {
  return `
    <article class="historical-goal-team">
      <h4>${escapeHtml(team.name)}</h4>
      ${
        goals.length
          ? `
            <ul>
              ${goals
                .map((goal) => {
                  const minute = formatGoalMinute(goal);
                  const note = formatGoalNote(goal);
                  return `
                    <li>
                      <span>${escapeHtml(goal.name || "Unknown scorer")}</span>
                      <em>${escapeHtml([minute, note].filter(Boolean).join(" / "))}</em>
                    </li>
                  `;
                })
                .join("")}
            </ul>
          `
          : `<p class="past-empty">No scorer data loaded.</p>`
      }
    </article>
  `;
}

function renderHistoricalGoals(match) {
  const hasGoals = match.goalsHome?.length || match.goalsAway?.length;

  if (!hasGoals && match.status === "CANCELLED") {
    return `<p class="past-empty">No goals because this match was cancelled.</p>`;
  }

  return `
    <div class="historical-goals">
      ${renderHistoricalGoalTeam(match.homeTeam, match.goalsHome)}
      ${renderHistoricalGoalTeam(match.awayTeam, match.goalsAway)}
    </div>
  `;
}

function getHistoricalContextLabel(match) {
  return [match.tournamentName, match.group || match.round].filter(Boolean).join(" / ");
}

function getHistoricalDateText(match) {
  const dateText = dateFormatter.format(getDateFromKey(match.date));
  return match.localTime ? `${dateText} at ${match.localTime} local time` : dateText;
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

  return `${penalties.home}-${penalties.away} pens`;
}

function getHistoricalScoreText(match) {
  const score = formatScorePair(match.score);
  const note = getHistoricalScoreNote(match);

  if (!score) {
    return match.status === "CANCELLED" ? "cancelled" : "score unavailable";
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
    return match.status === "CANCELLED" ? "cancelled" : "score unavailable";
  }

  return penalties ? `${score} (${penalties} pens)` : score;
}

function getHistoricalScoreResultText(match, teamName) {
  const score = formatScorePair(getHistoricalScorePairForTeam(match, teamName));
  const penalties = formatScorePair(getHistoricalPenaltyPairForTeam(match, teamName));

  if (!score) {
    return match.status === "CANCELLED" ? "cancelled" : "score unavailable";
  }

  if (penalties) {
    return `on penalties after a ${score} draw (${penalties} in the shootout)`;
  }

  if (match.scoreDetails?.extraTime) {
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
  if (match.status === "CANCELLED") {
    return `${teamName}: match cancelled`;
  }

  const winner = getHistoricalWinner(match);
  const scoreText = getHistoricalTeamScoreText(match, teamName);
  const penalties = match.scoreDetails?.penalties;

  if (!winner) {
    return `${teamName}: drew ${scoreText}`;
  }

  if (penalties) {
    return winner === teamName
      ? `${teamName}: won on pens, ${scoreText}`
      : `${teamName}: lost on pens, ${scoreText}`;
  }

  return winner === teamName ? `${teamName}: won ${scoreText}` : `${teamName}: lost ${scoreText}`;
}

function getHistoricalTeamGoals(match, teamName) {
  return teamName === match.homeSlot ? match.goalsHome || [] : match.goalsAway || [];
}

function formatHistoricalGoalName(goal) {
  return goal.ownGoal ? `${goal.name || "an opponent"} own goal` : goal.name || "Unknown scorer";
}

function formatHistoricalScorerSeries(items) {
  if (!items.length) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return items.join(" and ");
  }

  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function formatHistoricalScorerCount(name, count) {
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

    const name = goal.name || "Unknown scorer";
    scorers.set(name, (scorers.get(name) || 0) + 1);
  }

  const scorerText = [...scorers.entries()].map(([name, count]) =>
    formatHistoricalScorerCount(name, count)
  );
  const ownGoalText = ownGoals.map((name) => `benefited from ${name}`);
  const scoringMoments = [...scorerText, ...ownGoalText];

  if (!scoringMoments.length) {
    return "";
  }

  return `${formatHistoricalScorerSeries(scoringMoments)}.`;
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

  return homeScorers || awayScorers || `⚽ ${match.homeTeam.name} and ${match.awayTeam.name} finished level at ${scoreText}.`;
}

function getHistoricalResultOutcomeHighlight(match) {
  const winner = getHistoricalWinner(match);
  const scoreText = getHistoricalScoreText(match);

  if (match.status === "CANCELLED") {
    return `🚫 ${match.homeTeam.name} vs ${match.awayTeam.name} was cancelled.`;
  }

  if (!winner) {
    return `🤝 ${match.homeTeam.name} and ${match.awayTeam.name} drew ${scoreText}.`;
  }

  const loser = winner === match.homeTeam.name ? match.awayTeam.name : match.homeTeam.name;
  const penalties = match.scoreDetails?.penalties;
  const winnerScoreText = formatScorePair(getHistoricalScorePairForTeam(match, winner));

  if (penalties) {
    return `🎯 ${winner} beat ${loser} on penalties after a ${formatScorePair(match.score)} draw.`;
  }

  return `🏁 ${winner} beat ${loser} ${winnerScoreText || scoreText}.`;
}

function getHistoricalResultControlHighlight(match) {
  if (match.status === "CANCELLED") {
    return `📌 The cancelled fixture remains in the ${match.tournamentName} archive.`;
  }

  const winner = getHistoricalWinner(match);
  const context = getHistoricalContextLabel(match);
  const penalties = match.scoreDetails?.penalties;
  const extraTime = match.scoreDetails?.extraTime;

  if (penalties) {
    return `🌟 The shootout decided ${context}.`;
  }

  if (extraTime) {
    return `🌟 ${winner || "The match"} won after extra time.`;
  }

  if (winner) {
    const winnerScore = winner === match.homeTeam.name ? Number(match.score?.home) : Number(match.score?.away);
    const loserScore = winner === match.homeTeam.name ? Number(match.score?.away) : Number(match.score?.home);
    const loser = winner === match.homeTeam.name ? match.awayTeam.name : match.homeTeam.name;

    if (loserScore === 0) {
      return `🌟 ${winner} kept a clean sheet.`;
    }

    if (winnerScore - loserScore >= 3) {
      return `🌟 ${winner} broke the match open.`;
    }

    return `🌟 ${winner} protected the result.`;
  }

  return `🌟 Neither side pulled clear.`;
}

function getHistoricalResultProgressHighlight(match) {
  const context = getHistoricalContextLabel(match);

  if (match.status === "CANCELLED") {
    return `📊 No points or progression came from this cancelled ${context} fixture.`;
  }

  if (match.group) {
    const winner = getHistoricalWinner(match);

    if (!winner) {
      return `📊 Both teams took one point from ${context}.`;
    }

    return `📊 ${winner} took three points from ${context}.`;
  }

  const winner = getHistoricalWinner(match);

  if (match.round === "Final" && winner) {
    return `🏆 ${winner} won the ${match.tournamentName} title.`;
  }

  if (/third|3rd|place/i.test(match.round || "") && winner) {
    return `🥉 ${winner} secured third place at ${match.tournamentName}.`;
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
  return `
    <section class="info-block">
      <h3>${escapeHtml(localizeText("Result"))}</h3>
      <p class="past-empty">${escapeHtml(localizeText(getHistoricalResultOutcomeHighlight(match)))}</p>
      <ul class="result-highlights">
        ${getHistoricalResultHighlights(match)
          .map((highlight) => `<li>${escapeHtml(localizeText(highlight))}</li>`)
          .join("")}
      </ul>
    </section>
  `;
}

function getHistoricalRoundText(match) {
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
    return `Next: ${nextMatch.round} vs ${getHistoricalOpponent(nextMatch, teamName)}, ${navDateWithYearFormatter.format(getDateFromKey(nextMatch.date))}.`;
  }

  if (match.round === "Final" && getHistoricalWinner(match) === teamName) {
    return `That sealed the ${match.tournamentName} title.`;
  }

  if (match.round === "Final") {
    return `That ended their ${match.tournamentName} run as runners-up.`;
  }

  if (/third|3rd|place/i.test(match.round || "")) {
    return getHistoricalWinner(match) === teamName
      ? `That secured third place at ${match.tournamentName}.`
      : `That closed their ${match.tournamentName} run in the third-place match.`;
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
  const result =
    match.status === "CANCELLED"
      ? `Scheduled against ${opponentText}, but the match was cancelled.`
      : `${getHistoricalResultVerb(match, teamName)} ${opponentText} ${scoreText} in ${roundText}.`;

  return [result, scorerText, getHistoricalProgressionText(match, teamName, nextMatch)]
    .filter(Boolean)
    .join(" ");
}

function renderHistoricalKeyInformation(match) {
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
    return `<p class="past-empty">No previous men's World Cup meetings are loaded before this match.</p>`;
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

  document.querySelectorAll(".match-row").forEach((row) => {
    const isSelected = row.dataset.matchId === match.id;
    row.classList.toggle("is-selected", isSelected);
    row.querySelector(".match-row-trigger")?.setAttribute("aria-pressed", String(isSelected));
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

  matchInfo.innerHTML = `
    <section class="info-block match-summary">
      <p class="info-kicker">${escapeHtml(contextLabel)}</p>
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
  document.querySelectorAll(".match-row").forEach((row) => {
    row.classList.remove("is-selected");
    row.querySelector(".match-row-trigger")?.setAttribute("aria-pressed", "false");
  });
  matchInfo.replaceChildren();
  matchInfo.classList.add("is-hidden");
  matchInfo.hidden = true;
}

function renderEmptyState() {
  activeMatchId = "";
  viewPanels.matches.classList.remove("has-match-info");
  matchList.removeAttribute("aria-busy");
  const selectedDate = dateFormatter.format(getDateFromKey(selectedDayKey));
  const reportUrl = getReportIssueUrl("no-matches");
  const message =
    dataCoverage.status === "partial"
      ? `Verified fixture data is not loaded for ${selectedDate}. This avoids showing a false no-match day.`
      : `No matches were found for ${selectedDate}.`;

  matchList.innerHTML = `
    <article class="empty-state">
      <h2>${dataCoverage.status === "partial" ? "Not loaded" : "No matches"}</h2>
      <p>${escapeHtml(message)}</p>
      <div class="empty-actions">
        <a class="secondary-button" href="${escapeHtml(reportUrl)}">Report issue</a>
      </div>
    </article>
  `;
  matchInfo.replaceChildren();
  matchInfo.classList.add("is-hidden");
  matchInfo.hidden = true;
}

function renderMatchLoadingState() {
  viewPanels.matches.classList.remove("has-match-info");
  matchList.setAttribute("aria-busy", "true");
  matchList.innerHTML = `
    <div class="match-loading" role="status">
      <p class="visually-hidden">Loading matches</p>
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

  return `report.html?${params.toString()}`;
}

function getMatchesForSelectedDay() {
  return getCalendarFixtures()
    .filter((fixture) => getFixtureDayKey(fixture) === selectedDayKey)
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)))
    .map(hydrateFixture);
}

function getTeamSearchAliases(team) {
  return TEAM_SEARCH_ALIASES_BY_TEAM_ID[team?.id] || [];
}

function getTeamSearchKeys(team) {
  return [
    team?.id,
    team?.name,
    team?.officialName,
    team?.standingName,
    ...getTeamSearchAliases(team)
  ]
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

  if (key.length >= 4 && queryKey.startsWith(key)) {
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

  if (queryKey.length < 2) {
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
      searchedSide: getTeamSearchMatchedSide(match, team)
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
  if (!item?.headline) {
    return null;
  }

  const dateKey = item.date || getFixtureDayKey(match);
  const priority = Number(item.priority);
  return {
    dateKey,
    headline: item.headline,
    body: item.body || item.note || "",
    standouts: normalizeCatchUpStandouts(item.standouts || item.standout || item.playerPulse),
    meta: item.meta || `${match.homeTeam.name} vs ${match.awayTeam.name}`,
    sourceLabel: item.sourceLabel || "",
    sourceUrl: item.sourceUrl || item.url || "",
    priority: Number.isFinite(priority) ? priority : 10,
    sortValue: item.sortValue || getFixtureSortValue(match)
  };
}

function normalizeCatchUpStandout(standout) {
  if (typeof standout === "string") {
    return standout.trim();
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

function getResultCatchUpItem(match) {
  const score = getCatchUpScore(match);
  const meta = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
  const dateKey = getFixtureDayKey(match);
  const sortValue = getFixtureSortValue(match);
  const context = getCatchUpContext(match);

  if (match.status === "LIVE") {
    if (!score) {
      return {
        dateKey,
        headline: `${match.homeTeam.name} vs ${match.awayTeam.name} is underway`,
        body: `${context} has moved from preview mode into live tournament business.`,
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
      headline: `${leader.name} have a live edge over ${chaser.name}`,
      body: `${leader.name} lead ${leaderScore}-${chaserScore}, but ${chaser.name} still have time to pull the match back.`,
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
        : `${winner.name} edge ${loser.name} in a tight one`;

  return {
    dateKey,
    headline,
    body: `${winner.name}'s ${winnerScore}-${loserScore} win gives them an early foothold in ${context}.`,
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
    a.headline.localeCompare(b.headline)
  );
}

function getCatchUpItems() {
  const dayKeys = new Set(getCatchUpWindowDayKeys());

  return fixtures
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
    })
    .sort(compareCatchUpItemsByRecency)
    .slice(0, 5);
}

function splitCatchUpBullet(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  return trimmed
    .split(/;\s+|,\s+while\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getCatchUpBullets(standouts) {
  return (standouts || []).flatMap(splitCatchUpBullet);
}

function renderCatchUpItem(item) {
  const catchUpBullets = getCatchUpBullets(item.standouts);
  const points = catchUpBullets.length
    ? `<ul class="catch-up-points catch-up-standouts">${catchUpBullets
        .map((bullet) => `<li class="catch-up-point">${escapeHtml(localizeText(bullet))}</li>`)
        .join("")}</ul>`
    : "";
  const sourceLabel = item.sourceLabel ? localizeText(item.sourceLabel) : localizeText("Read source");
  const sourceLink = item.sourceUrl
    ? `<a class="catch-up-source" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(sourceLabel)}" title="${escapeHtml(sourceLabel)}"><span aria-hidden="true">&#8599;</span></a>`
    : "";

  return `
    <article class="catch-up-item">
      <div class="catch-up-copy">
        <div class="catch-up-title-row">
          <h3><span>${escapeHtml(localizeText(item.headline))}</span></h3>
          ${sourceLink}
        </div>
        ${item.body ? `<p class="catch-up-subtitle">${escapeHtml(localizeText(item.body))}</p>` : ""}
        ${points}
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

function renderCatchUp() {
  if (!catchUpList) {
    return;
  }

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
    setStandingsYearOpen(false);
    renderCatchUp();
    positionCatchUpPopover();
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

function renderSchedule() {
  if (isInitialLiveDataLoading) {
    updateDateControls();
    updateTeamSearchControls();
    renderMatchLoadingState();
    updateUrlState();
    return;
  }

  matchList.removeAttribute("aria-busy");

  if (hasTeamSearchQuery()) {
    renderTeamSearchResults();
    return;
  }

  const currentTime = Date.now();
  const todayMatches = getMatchesForSelectedDay();
  const liveMatchIds = getLiveMatchIds(currentTime);
  const selectedIsToday = selectedDayKey === getDayKey(new Date(), selectedTimeZone);
  const nextMatchIds = selectedIsToday ? getNextMatchIds(currentTime, liveMatchIds) : new Set();

  updateDateControls();
  if (isCatchUpOpen) {
    renderCatchUp();
  }

  if (todayMatches.length === 0) {
    renderEmptyState();
    updateUrlState();
    return;
  }

  matchList.replaceChildren(
    ...todayMatches.map((match) =>
      renderMatchRow(match, getMatchState(match, nextMatchIds, currentTime), currentTime)
    )
  );
  const activeMatch = todayMatches.find((match) => match.id === activeMatchId);

  if (activeMatch) {
    renderMatchInfo(activeMatch);
  } else {
    renderMatchInfoPrompt();
  }

  updateTruncatedTeamTooltips(matchList);
  updateUrlState();
}

function setActiveView(view) {
  activeView = view === "standings" ? "standings" : "matches";
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
  updateTruncatedTeamTooltips(viewPanels.matches);
  updateStandingNameTooltips(standingsGrid);
  updateUrlState();
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
    const label = localizeText(compactSourceLabels[source.label] ?? source.label);
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

  sourceNote.innerHTML = `${sourcesText}${officialSourceLinks.join(sourceSeparator)}${sentenceEnd} ${predictionsText}${lastUpdated ? ` ${lastUpdated}` : ""} <a href="report.html">${escapeHtml(reportIssueText)}</a>${sentenceEnd}`;
}

function renderLoadError(error) {
  console.error("Unable to load World Cup data", error);
  matchList.removeAttribute("aria-busy");
  matchList.innerHTML = `
    <article class="empty-state">
      <h2>Data unavailable</h2>
      <p>The match data could not be loaded. Refresh the page to try again.</p>
    </article>
  `;
  matchInfo.innerHTML = `<p class="info-empty">The match data could not be loaded.</p>`;
  applyLanguageToPage();
}

function renderAppError(error) {
  console.error("Unable to render World Cup data", error);
  matchList.removeAttribute("aria-busy");
  matchList.innerHTML = `
    <article class="empty-state">
      <h2>Unable to display matches</h2>
      <p>The page loaded, but something went wrong while displaying it. Refresh the page to try again.</p>
    </article>
  `;
  matchInfo.innerHTML = `<p class="info-empty">The match view could not be displayed.</p>`;
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

matchInfo.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const playerTrigger = event.target.closest(".player-link");
  const playerHover = playerTrigger?.closest(".player-hover");
  if (playerTrigger && playerHover && isTouchPlayerCardMode()) {
    if (activePlayerHover !== playerHover) {
      event.preventDefault();
      openPlayerHoverCard(playerHover);
      return;
    }

    if (playerTrigger.tagName !== "A") {
      event.preventDefault();
    }
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

matchInfo.addEventListener(
  "pointerenter",
  (event) => {
    const playerHover = event.target.closest(".player-hover");
    if (playerHover) {
      positionPlayerCard(playerHover);
    }
  },
  true
);

matchInfo.addEventListener("focusin", (event) => {
  const playerHover = event.target.closest(".player-hover");
  if (playerHover) {
    positionPlayerCard(playerHover);
  }
});

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
  positionCatchUpPopover();
  positionPlayerCards();
  updateTruncatedTeamTooltips();
  updateStandingNameTooltips();
  updateMeasuredLabelTooltips();
  window.requestAnimationFrame(() => {
    updateTruncatedTeamTooltips();
    updateStandingNameTooltips();
    updateMeasuredLabelTooltips();
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

renderStaticText();
languageObserver.observe(document.body, {
  attributeFilter: ["aria-label", "data-tooltip", "placeholder", "title"],
  attributes: true,
  characterData: true,
  childList: true,
  subtree: true
});

boot();
