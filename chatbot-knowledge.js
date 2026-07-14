import { ZH_CLUB_NAME_TRANSLATIONS, ZH_LEAGUE_NAME_TRANSLATIONS, ZH_PLAYER_NAME_TRANSLATIONS } from "./football-locale-zh.js?v=2026-07-13-locale-2";

const BALL_BOY_DATA_VERSION = "2026-07-13-player-card-audit";
const BALL_BOY_DATA_URLS = {
  fixtures: `data/fixtures.json?v=${BALL_BOY_DATA_VERSION}`,
  liveData: `api/live-data?v=${BALL_BOY_DATA_VERSION}`,
  playerProfiles: `data/player-profiles.json?v=${BALL_BOY_DATA_VERSION}`,
  standings: `data/standings.json?v=${BALL_BOY_DATA_VERSION}`,
  teams: `data/teams.json?v=${BALL_BOY_DATA_VERSION}`
};

const COMPLETED_MATCH_STATUSES = new Set(["FT", "AET", "PEN"]);
const COUNTABLE_PLAYER_STATUSES = new Set(["LIVE", "FT", "AET", "PEN"]);
const EXTRA_TEAM_ALIASES = {
  BIH: ["bosnia"],
  CIV: ["ivory coast", "cote d ivoire"],
  COD: ["drc", "congo", "congo dr", "democratic republic of congo"],
  CPV: ["cape verde"],
  CZE: ["czech republic"],
  CUW: ["curacao"],
  IRN: ["iran"],
  KOR: ["korea", "korea republic"],
  NED: ["holland"],
  TUR: ["turkey"],
  USA: ["usa", "u s a", "united states of america"]
};
const STAGE_LABELS = {
  "group": "Group stage",
  "round-of-32": "Round of 32",
  "round-of-16": "Round of 16",
  "quarter-finals": "Quarter-final",
  "semi-finals": "Semi-final",
  "bronze-final": "Third-place match",
  "final": "Final"
};

const ZH_STAGE_LABELS = {
  group: "小组赛",
  "round-of-32": "32强赛",
  "round-of-16": "16强赛",
  "quarter-finals": "四分之一决赛",
  "semi-finals": "半决赛",
  "bronze-final": "季军赛",
  final: "决赛"
};

const ZH_TEAM_NAMES = {
  ALG: "阿尔及利亚",
  ARG: "阿根廷",
  AUS: "澳大利亚",
  AUT: "奥地利",
  BEL: "比利时",
  BIH: "波黑",
  BRA: "巴西",
  CAN: "加拿大",
  CIV: "科特迪瓦",
  COD: "刚果民主共和国",
  COL: "哥伦比亚",
  CPV: "佛得角",
  CRO: "克罗地亚",
  CUW: "库拉索",
  CZE: "捷克",
  ECU: "厄瓜多尔",
  EGY: "埃及",
  ENG: "英格兰",
  ESP: "西班牙",
  FRA: "法国",
  GER: "德国",
  GHA: "加纳",
  HAI: "海地",
  IRN: "伊朗",
  IRQ: "伊拉克",
  JOR: "约旦",
  JPN: "日本",
  KOR: "韩国",
  KSA: "沙特阿拉伯",
  MAR: "摩洛哥",
  MEX: "墨西哥",
  NED: "荷兰",
  NOR: "挪威",
  NZL: "新西兰",
  PAN: "巴拿马",
  PAR: "巴拉圭",
  POR: "葡萄牙",
  QAT: "卡塔尔",
  RSA: "南非",
  SCO: "苏格兰",
  SEN: "塞内加尔",
  SUI: "瑞士",
  SWE: "瑞典",
  TUN: "突尼斯",
  TUR: "土耳其",
  URU: "乌拉圭",
  USA: "美国",
  UZB: "乌兹别克斯坦"
};

const ZH_PLAYER_NAMES = ZH_PLAYER_NAME_TRANSLATIONS;

const ZH_PLAYER_NAME_ALIASES = {
  "基利安姆巴佩": "Kylian Mbappé",
  "姆巴佩": "Kylian Mbappé",
  "埃尔林哈兰德": "Erling Haaland",
  "哈兰德": "Erling Haaland",
  "利昂内尔梅西": "Lionel Messi",
  "里奥梅西": "Lionel Messi",
  "梅西": "Lionel Messi",
  "克里斯蒂亚诺罗纳尔多": "Cristiano Ronaldo",
  "克里斯蒂亚诺罗纳度": "Cristiano Ronaldo",
  "C罗": "Cristiano Ronaldo",
  "厄德高": "Martin Ødegaard",
  "亚马尔": "Lamine Yamal",
  "佩德里": "Pedri",
  "贝林厄姆": "Jude Bellingham",
  "凯恩": "Harry Kane",
  "内马尔": "Neymar",
  "孙兴慜": "Son Heung-min",
  "久保建英": "Takefusa Kubo",
  "伊东纯也": "Junya Ito",
  "中村敬斗": "Keito Nakamura",
  "恩博洛": "Breel Embolo"
};

const ZH_POSITION_LABELS = {
  goalkeeper: "门将",
  defender: "后卫",
  "centre-back": "中后卫",
  "center-back": "中后卫",
  "left-back": "左后卫",
  "right-back": "右后卫",
  midfielder: "中场",
  "defensive midfielder": "防守型中场",
  "central midfielder": "中前卫",
  "attacking midfielder": "前腰",
  winger: "边锋",
  "left winger": "左边锋",
  "right winger": "右边锋",
  forward: "前锋",
  striker: "中锋",
  player: "球员"
};

const ZH_STYLE_LABELS = {
  "aerial defending": "高空防守",
  "aerial duels": "争顶对抗",
  "aerial finishing": "头球终结",
  "aerial targets": "高空支点",
  "back-line command": "指挥防线",
  "ball carrying": "带球推进",
  "ball winning": "夺回球权",
  "box command": "控制禁区",
  "box entries": "冲击禁区",
  "box finishing": "禁区终结",
  "chance creation": "创造机会",
  "chance passes": "威胁传球",
  "channel runs": "肋部前插",
  "close control": "小范围控球",
  "counter attacks": "快速反击",
  "counter-press": "丢球反抢",
  "crossing": "传中",
  "direct combinations": "直接配合",
  "direct running": "纵向冲刺",
  "distribution": "出球",
  "early service": "尽早传入禁区",
  "elite pace": "顶级速度",
  "elite penalty-box finishing": "顶级禁区终结",
  "final pass": "最后一传",
  "finishing": "终结",
  "first-time finishing": "不停球射门",
  "high press": "高位逼抢",
  "hold-up play": "背身支点",
  "left-channel finishing": "左侧肋部终结",
  "left-footed passing": "左脚传球",
  "long passing": "长传调度",
  "midfield screening": "中场保护",
  "one-on-one defending": "一对一防守",
  "overlap timing": "套边时机",
  "penalty-box finishing": "禁区终结",
  "power runs": "强力冲刺",
  "press resistance": "抗压控球",
  "progressive passing": "向前传球",
  "reaction saves": "反应扑救",
  "recovery defending": "回追防守",
  "recovery speed": "回追速度",
  "second balls": "争抢第二点",
  "set pieces": "定位球",
  "set-piece delivery": "定位球传递",
  "shot stopping": "扑救",
  "tempo control": "节奏控制",
  "through balls": "直塞球",
  "transition terror": "反击冲击力",
  "transition speed": "攻守转换速度",
  "vertical passing": "纵向传球",
  "wide counters": "边路反击",
  "wide overloads": "边路人数优势"
};

const ZH_CLUB_NAMES = ZH_CLUB_NAME_TRANSLATIONS;

const ZH_LEAGUE_NAMES = ZH_LEAGUE_NAME_TRANSLATIONS;

const RULE_CATALOG = [
  {
    id: "shootout",
    keywords: ["penalty shootout", "penalty shootouts", "shootout", "shoot out", "penalties"],
    title: "Penalty shootout",
    lead: "If a knockout match is still level after extra time, teams take alternating penalties to decide who advances.",
    flow: [
      { value: "120′", label: "Still level" },
      { value: "⚽", label: "5 each" },
      { value: "1×1", label: "Sudden death" }
    ],
    points: [
      { title: "First five", text: "Each team starts with five kicks, taken by different players." },
      { title: "Still tied?", text: "They continue one kick each until one scores and the other misses." }
    ],
    takeaway: "A calm walk from halfway. Then one very loud kick.",
    sourceUrl: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/"
  },
  {
    id: "red-card",
    keywords: ["red card", "redcard", "sent off", "sending off"],
    title: "Red card",
    lead: "A red card sends a player off. They cannot return, and their team cannot replace them.",
    flow: [
      { value: "11", label: "Players" },
      { value: "🟥", label: "Sent off" },
      { value: "10", label: "Left" }
    ],
    points: [
      { title: "Straight red", text: "One serious offence can mean an immediate red card." },
      { title: "Two yellows", text: "A second yellow in the same match also sends the player off." }
    ],
    takeaway: "One fewer teammate. Same giant pitch. Bad mathematics.",
    sourceUrl: "https://www.theifab.com/laws/latest/fouls-and-misconduct/"
  },
  {
    id: "yellow-card",
    keywords: ["yellow card", "yellowcard", "booking", "booked"],
    title: "Yellow card",
    lead: "A yellow card is an official warning for a player or team official.",
    flow: [
      { value: "Foul", label: "Reckless act" },
      { value: "🟨", label: "Warning" },
      { value: "🟨🟨", label: "Then red" }
    ],
    points: [
      { title: "Why it happens", text: "Common reasons include reckless fouls, delaying play, dissent, or repeated offences." },
      { title: "Second yellow", text: "Two yellows in one match become a red card, so the player is sent off." }
    ],
    takeaway: "First warning: calm down. Second warning: shower time.",
    sourceUrl: "https://www.theifab.com/laws/latest/fouls-and-misconduct/"
  },
  {
    id: "handball",
    keywords: ["handball", "hand ball", "ball hits hand", "ball hit hand"],
    title: "Handball",
    lead: "Not every touch of the hand or arm is a foul. The action and arm position matter.",
    flow: [
      { value: "⚽", label: "Ball arrives" },
      { value: "💪", label: "Arm action" },
      { value: "📣", label: "Ref decides" }
    ],
    points: [
      { title: "Usually an offence", text: "The player deliberately handles it or makes their body unnaturally bigger with the arm." },
      { title: "Not automatic", text: "A close-range accidental touch with a natural arm position may be allowed." }
    ],
    takeaway: "Ball to hand is a clue. It is not the whole detective story.",
    sourceUrl: "https://www.theifab.com/laws/latest/fouls-and-misconduct/"
  },
  {
    id: "penalty-kick",
    keywords: ["penalty kick", "penalty spot", "penalty", "spot kick"],
    title: "Penalty kick",
    lead: "A direct-free-kick offence by the defending team inside its own penalty area usually gives the attackers a penalty kick.",
    flow: [
      { value: "Foul", label: "Inside box" },
      { value: "11m", label: "Penalty spot" },
      { value: "1v1", label: "Taker vs keeper" }
    ],
    points: [
      { title: "The setup", text: "The ball goes on the spot. The goalkeeper stays on the goal line until the kick is taken." },
      { title: "Everyone else", text: "Other players wait outside the penalty area and behind the ball." }
    ],
    takeaway: "One ball. One goalkeeper. Suddenly everyone remembers breathing.",
    sourceUrl: "https://www.theifab.com/laws/latest/the-penalty-kick/"
  },
  {
    id: "var",
    keywords: ["var", "video assistant", "video review"],
    title: "VAR",
    lead: "VAR helps the referee review a small set of major, match-changing decisions.",
    flow: [
      { value: "👀", label: "Incident" },
      { value: "🎥", label: "Check" },
      { value: "📣", label: "Decision" }
    ],
    points: [
      { title: "What it checks", text: "Goals, penalty decisions, direct red cards, and mistaken identity." },
      { title: "Who decides", text: "The on-field referee keeps the final decision, sometimes after watching the monitor." }
    ],
    takeaway: "Technology advises. The referee still owns the whistle.",
    sourceUrl: "https://www.theifab.com/laws/latest/video-assistant-referee-var-protocol/"
  },
  {
    id: "extra-time",
    keywords: ["extra time", "overtime", "added extra time"],
    title: "Extra time",
    lead: "In some knockout matches, a draw after 90 minutes leads to another 30 minutes of football.",
    flow: [
      { value: "90′", label: "Level" },
      { value: "+15′", label: "First half" },
      { value: "+15′", label: "Second half" }
    ],
    points: [
      { title: "It is not stoppage time", text: "Extra time is two new 15-minute periods. Stoppage time is added within a period." },
      { title: "Still level?", text: "If the competition requires a winner, a penalty shootout usually follows." }
    ],
    takeaway: "The legs say no. The tournament says thirty more minutes.",
    sourceUrl: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/"
  },
  {
    id: "stoppage-time",
    keywords: ["stoppage time", "added time", "injury time", "90 plus"],
    title: "Stoppage time",
    lead: "The referee adds time at the end of each half for delays that happened while the clock kept running.",
    flow: [
      { value: "45′", label: "Half nearly done" },
      { value: "+4′", label: "Time added" },
      { value: "HT", label: "Half-time" }
    ],
    points: [
      { title: "Why it is added", text: "Substitutions, injuries, celebrations, reviews, and deliberate delays can all add time." },
      { title: "Not extra time", text: "90+4 means the fourth added minute after 90. Extra time is a separate 30-minute period in some knockout matches." }
    ],
    takeaway: "The board shows a minimum. The referee keeps the final clock.",
    sourceUrl: "https://www.theifab.com/laws/latest/the-duration-of-the-match/"
  },
  {
    id: "group-points",
    keywords: ["group points", "points system", "three points", "goal difference", "standings work"],
    title: "Group points",
    lead: "Group tables reward results: three points for a win, one for a draw, and none for a loss.",
    flow: [
      { value: "+3", label: "Win" },
      { value: "+1", label: "Draw" },
      { value: "+0", label: "Loss" }
    ],
    points: [
      { title: "Goal difference", text: "Goals scored minus goals allowed. It is a common tiebreaker when points are level." },
      { title: "Then what?", text: "Competitions use a published tiebreak order if teams are still level." }
    ],
    takeaway: "Win matches and the calculator gets much less dramatic.",
    sourceUrl: ""
  },
  {
    id: "substitution",
    keywords: ["substitution", "substitute", "substitutions", "subbed off", "subbed on"],
    title: "Substitution",
    lead: "A substitution replaces one player with another during the match.",
    flow: [
      { value: "↓", label: "Player off" },
      { value: "↔", label: "Change" },
      { value: "↑", label: "Player on" }
    ],
    points: [
      { title: "Why managers do it", text: "Fresh legs, an injury, a tactical change, or a different type of player." },
      { title: "Can they return?", text: "In top-level World Cup football, a substituted player cannot come back into that match." }
    ],
    takeaway: "Same team. New problem for the opponent.",
    sourceUrl: "https://www.theifab.com/laws/latest/the-players/"
  }
];

const ZH_RULE_COPY = {
  shootout: {
    title: "点球大战",
    lead: "淘汰赛踢完加时赛仍是平局时，双方轮流罚点球，直到分出晋级者。",
    flow: [
      { value: "120′", label: "仍是平局" },
      { value: "⚽", label: "各罚5次" },
      { value: "1×1", label: "突然死亡" }
    ],
    points: [
      { title: "前五轮", text: "每队先由五名不同球员各罚一次。" },
      { title: "还是平局？", text: "之后双方各罚一次；一方罚进而另一方罚失时，比赛结束。" }
    ],
    takeaway: "从中圈走向罚球点。路不远，压力很大。"
  },
  "red-card": {
    title: "红牌",
    lead: "球员被出示红牌后必须离场，不能返回比赛，球队也不能换人补足人数。",
    flow: [
      { value: "11", label: "场上球员" },
      { value: "🟥", label: "被罚离场" },
      { value: "10", label: "只剩十人" }
    ],
    points: [
      { title: "直接红牌", text: "一次严重犯规或违规行为就可能直接得到红牌。" },
      { title: "两张黄牌", text: "同一场比赛得到第二张黄牌，也会被罚下。" }
    ],
    takeaway: "少一个队友，球场却没有变小。算术很残酷。"
  },
  "yellow-card": {
    title: "黄牌",
    lead: "黄牌是裁判对球员或球队官员作出的正式警告。",
    flow: [
      { value: "犯规", label: "鲁莽动作" },
      { value: "🟨", label: "正式警告" },
      { value: "🟨🟨", label: "随后变红" }
    ],
    points: [
      { title: "为什么会吃牌", text: "常见原因包括鲁莽犯规、拖延比赛、抗议判罚或反复犯规。" },
      { title: "第二张黄牌", text: "同场两黄会变成一红，球员必须离场。" }
    ],
    takeaway: "第一次：冷静。第二次：提前去更衣室。"
  },
  handball: {
    title: "手球",
    lead: "球碰到手或手臂并不一定犯规；动作是否主动、手臂位置是否自然都很重要。",
    flow: [
      { value: "⚽", label: "球飞过来" },
      { value: "💪", label: "观察手臂" },
      { value: "📣", label: "裁判判断" }
    ],
    points: [
      { title: "通常会判罚", text: "球员故意用手触球，或用不自然张开的手臂扩大防守面积。" },
      { title: "并非自动判罚", text: "近距离意外触球、手臂处于自然位置时，可能不判犯规。" }
    ],
    takeaway: "球碰到手只是线索，不是完整答案。"
  },
  "penalty-kick": {
    title: "点球",
    lead: "防守方在本方禁区内犯下应判直接任意球的犯规，进攻方通常会获得点球。",
    flow: [
      { value: "犯规", label: "发生在禁区内" },
      { value: "11米", label: "点球点" },
      { value: "1对1", label: "主罚者对门将" }
    ],
    points: [
      { title: "如何摆放", text: "球放在点球点；开球前，门将至少有一只脚接触或对齐球门线。" },
      { title: "其他球员", text: "其他球员要留在禁区外、点球点后方。" }
    ],
    takeaway: "一个球，一名门将，突然所有人都忘了怎么呼吸。"
  },
  var: {
    title: "VAR",
    lead: "视频助理裁判会协助检查少数可能改变比赛的重要判罚。",
    flow: [
      { value: "👀", label: "发生事件" },
      { value: "🎥", label: "视频检查" },
      { value: "📣", label: "作出决定" }
    ],
    points: [
      { title: "检查什么", text: "进球、点球、直接红牌和认错球员。" },
      { title: "谁来决定", text: "最终决定仍由场上主裁判作出，有时会到场边观看回放。" }
    ],
    takeaway: "技术提供建议，哨子仍在裁判手里。"
  },
  "extra-time": {
    title: "加时赛",
    lead: "部分淘汰赛在90分钟后仍是平局，会再踢两个15分钟，共30分钟。",
    flow: [
      { value: "90′", label: "仍是平局" },
      { value: "+15′", label: "加时上半场" },
      { value: "+15′", label: "加时下半场" }
    ],
    points: [
      { title: "不是伤停补时", text: "加时赛是两个新的15分钟时段；伤停补时则加在某个半场末尾。" },
      { title: "仍然打平？", text: "如果比赛必须分出胜者，通常会进入点球大战。" }
    ],
    takeaway: "双腿说够了，赛制说再来三十分钟。"
  },
  "stoppage-time": {
    title: "伤停补时",
    lead: "比赛时钟不会因换人、受伤或VAR检查而暂停，所以裁判会在每个半场末尾把耽误的时间补回来。",
    flow: [
      { value: "45′", label: "半场将结束" },
      { value: "+4′", label: "补回时间" },
      { value: "HT", label: "半场结束" }
    ],
    points: [
      { title: "为什么补时", text: "换人、伤病处理、庆祝进球、视频检查和故意拖延都可能增加补时时间。" },
      { title: "不是加时赛", text: "90+4表示常规时间第90分钟后的第4个补时分钟；加时赛则是部分淘汰赛另踢的30分钟。" }
    ],
    takeaway: "牌子显示的是最少补时，最终时间由裁判掌握。"
  },
  "group-points": {
    title: "小组赛积分",
    lead: "小组赛按结果计分：胜一场得3分，平一场得1分，负一场得0分。",
    flow: [
      { value: "+3", label: "获胜" },
      { value: "+1", label: "平局" },
      { value: "+0", label: "失利" }
    ],
    points: [
      { title: "净胜球", text: "进球数减去失球数。球队同分时，它通常是重要的同分排序指标。" },
      { title: "仍然相同？", text: "如果各队仍然相同，赛事会继续按照已公布的同分排序规则比较。" }
    ],
    takeaway: "多赢比赛，计算器就没那么忙。"
  },
  substitution: {
    title: "换人",
    lead: "换人就是在比赛进行期间，用一名替补球员替换场上的球员。",
    flow: [
      { value: "↓", label: "球员离场" },
      { value: "↔", label: "完成更换" },
      { value: "↑", label: "替补上场" }
    ],
    points: [
      { title: "为什么换人", text: "可能是补充体能、处理伤病、调整战术，或换上不同类型的球员。" },
      { title: "还能回来吗", text: "在世界杯这种顶级赛事中，被换下的球员不能在同一场比赛再次上场。" }
    ],
    takeaway: "还是同一支球队，但给对手换了一个问题。"
  }
};

const BALL_BOY_PERSONALITY_REPLIES = [
  {
    id: "identity",
    patterns: [
      /^(?:who|what) are you(?: really)?$/,
      /^who r u$/,
      /^(?:are you )?just (?:a )?ball boy$/,
      /^(?:tell me about|introduce) yourself$/
    ],
    label: "About me",
    text: "I’m Ball Boy. I make football easier to understand.",
    badge: "On stadium duty",
    eye: "double-blink",
    followUps: ["What can I ask?", "What is football?", "Explain offside"]
  },
  {
    id: "life",
    patterns: [
      /^(?:what is|what s|whats) life$/,
      /^(?:what is|what s|whats) the meaning of life$/,
      /^why are we here$/
    ],
    label: "Philosophy",
    text: "Life is mostly waiting for something to happen, then pretending you were ready. Football is similar.",
    badge: "Brief philosophy",
    eye: "double-blink",
    followUps: ["What is football?", "What can I ask?", "Explain offside"]
  },
  {
    id: "football",
    patterns: [
      /^(?:what is|what s|whats) football$/,
      /^define football$/,
      /^why is football special$/
    ],
    label: "Football",
    text: "Football is two teams trying to put one ball in the other team's goal, usually over 90 minutes. The idea is simple. The people make it complicated.",
    badge: "Simple game, complicated people",
    eye: "wide",
    followUps: ["Explain offside", "Explain a red card", "Who should I watch?"]
  },
  {
    id: "reality",
    patterns: [
      /^(?:are you|are u|r u) real$/,
      /^are you (?:a )?(?:real person|bot|chatbot|ai)$/,
      /^do you (?:really )?exist$/
    ],
    label: "Reality check",
    text: "I am a chatbot called Ball Boy. Not a real stadium employee, which is probably why I never get a break.",
    badge: "Digital stadium staff",
    eye: "double-blink",
    followUps: ["Who are you?", "What can I ask?", "Explain offside"]
  },
  {
    id: "soccer",
    patterns: [
      /^(?:what is|what s|whats) soccer$/,
      /^soccer$/,
      /^is it soccer or football$/,
      /^why (?:do )?(?:people|americans) (?:say|call it) soccer$/
    ],
    label: "Terminology",
    text: "“Soccer” is another name for association football. The word is historically valid. The ball does not seem concerned.",
    badge: "Same game",
    eye: "wince",
    followUps: ["What is football?", "Explain offside", "Explain a red card"]
  },
  {
    id: "best-player",
    patterns: [
      /^(?:who is|who s|whos) (?:the )?(?:best|goat)$/,
      /^(?:who is|who s|whos) (?:the )?best (?:player|footballer)(?: in the world| right now| in football)?$/,
      /^(?:the )?(?:best (?:player|footballer)|goat)$/
    ],
    label: "Expert verdict",
    text: "There is no permanent single answer. Form, position, era, and what you value all change it. I can give you current tournament facts instead.",
    badge: "Debate remains open",
    eye: "double-blink",
    followUps: ["Tell me about Mbappe", "Who should I watch?", "How does Argentina play?"]
  },
  {
    id: "best-country",
    patterns: [
      /^(?:which|what) (?:country|national team) is (?:the )?best(?: in football| at football| in the world)?$/,
      /^(?:the )?best (?:country|national team)$/
    ],
    label: "Neutral opinion",
    text: "There is no permanent best country. Trophies, current form, and playing style give different answers. I can compare the tournament numbers without starting an argument.",
    badge: "No permanent champion",
    eye: "double-blink",
    followUps: ["How do Argentina play?", "How do Spain play?", "Who should I watch?"]
  },
  {
    id: "haaland-denial",
    patterns: [
      /^(?:are you|are u|r u) (?:erling )?haaland(?: really)?$/,
      /^(?:you are|you re) (?:erling )?haaland$/
    ],
    label: "Wrong person",
    text: "No. Haaland scores the goals; I collect the footballs. Different job.",
    badge: "Different job",
    eye: "double-blink",
    followUps: ["Tell me about Haaland", "What can I ask?", "Explain offside"]
  },
  {
    id: "greeting",
    patterns: [
      /^(?:hi|hello|hey|hei)(?: ball boy)?$/,
      /^(?:good morning|good afternoon|good evening)(?: ball boy)?$/
    ],
    label: "Ball Boy",
    text: "Hello. Ask your question. I was resting, but this is fine.",
    badge: "Available, apparently",
    eye: "wide",
    followUps: ["What can I ask?", "Explain offside", "Tell me about Mbappe"]
  },
  {
    id: "mood",
    patterns: [
      /^(?:how are you|how are u)$/,
      /^(?:how is|how s|hows) it going$/,
      /^you good$/
    ],
    label: "Form check",
    text: "Fine. I have been standing still very efficiently.",
    badge: "Energy conserved",
    eye: "double-blink",
    followUps: ["What can I ask?", "Explain offside", "Who should I watch?"]
  },
  {
    id: "thanks",
    patterns: [
      /^(?:thanks|thank you|cheers|nice one)(?: ball boy)?$/
    ],
    label: "Ball Boy",
    text: "You're welcome. I will return to standing near the corner flag.",
    badge: "Back to position",
    eye: "happy",
    followUps: ["What can I ask?", "Tell me about Mbappe", "Explain offside"]
  },
  {
    id: "joke",
    patterns: [
      /^(?:tell me a joke|make me laugh|football joke)$/
    ],
    label: "Comedy",
    text: "I asked for a raise. They gave me another football.",
    badge: "Stadium economics",
    eye: "happy",
    followUps: ["What can I ask?", "Tell me about Mbappe", "Explain offside"]
  }
];

const ZH_PERSONALITY_COPY = {
  identity: {
    label: "自我介绍",
    text: "我是球童。我让足球更容易懂。",
    badge: "球场值班中",
    followUps: ["我可以问什么？", "什么是足球？", "解释越位"]
  },
  life: {
    label: "人生哲学",
    text: "人生大部分时间是在等事情发生，然后假装自己早有准备。足球也差不多。",
    badge: "简短哲学",
    followUps: ["什么是足球？", "我可以问什么？", "解释越位"]
  },
  football: {
    label: "足球",
    text: "足球通常是两支球队在90分钟内，想办法把一个球送进对方球门。想法很简单，人会把它变复杂。",
    badge: "简单比赛，复杂的人",
    followUps: ["解释越位", "解释红牌", "我该关注谁？"]
  },
  reality: {
    label: "真实性检查",
    text: "我是一个叫球童的聊天机器人，不是真正的球场工作人员。可能正因如此，我从来没有休息时间。",
    badge: "数字球场员工",
    followUps: ["你是谁？", "我可以问什么？", "解释越位"]
  },
  soccer: {
    label: "用词问题",
    text: "“Soccer”是association football的另一个名称，这个词在历史上完全成立。足球本人似乎并不在意。",
    badge: "还是同一项运动",
    followUps: ["什么是足球？", "解释越位", "解释红牌"]
  },
  "best-player": {
    label: "专家结论",
    text: "没有一个永远正确的答案。状态、位置、时代，以及你看重什么，都会改变结论。我可以改为提供本届赛事的客观数据。",
    badge: "争论继续",
    followUps: ["介绍一下姆巴佩", "我该关注谁？", "阿根廷怎么踢？"]
  },
  "best-country": {
    label: "中立意见",
    text: "没有一个永远最强的国家队。冠军数量、近期状态和比赛风格会给出不同答案。我可以比较本届赛事数据，避免现场吵起来。",
    badge: "没有永久冠军",
    followUps: ["阿根廷怎么踢？", "西班牙怎么踢？", "我该关注谁？"]
  },
  "haaland-denial": {
    label: "认错人了",
    text: "不是。哈兰德负责进球，我负责捡球。工作不同。",
    badge: "工作不同",
    followUps: ["介绍一下哈兰德", "我可以问什么？", "解释越位"]
  },
  greeting: {
    label: "球童",
    text: "你好。问吧。我刚才在休息，不过没关系。",
    badge: "看来现在有空",
    followUps: ["我可以问什么？", "解释越位", "介绍一下姆巴佩"]
  },
  mood: {
    label: "状态检查",
    text: "还好。我一直非常高效地站着不动。",
    badge: "节省体力中",
    followUps: ["我可以问什么？", "解释越位", "我该关注谁？"]
  },
  thanks: {
    label: "球童",
    text: "不客气。我继续回角旗旁边站着。",
    badge: "回到位置",
    followUps: ["我可以问什么？", "介绍一下姆巴佩", "解释越位"]
  },
  joke: {
    label: "喜剧时间",
    text: "我提出加薪。他们又给了我一个足球。",
    badge: "球场经济学",
    followUps: ["我可以问什么？", "介绍一下姆巴佩", "解释越位"]
  }
};

let teamsPromise = null;
let fixturesPromise = null;
let standingsPromise = null;
let profilesPromise = null;
let teamsCache = [];
let fixturesCache = [];
let standingsCache = {};
let teamAliasEntries = [];
let playerIndexCache = null;
let liveRefreshPromise = null;
let replyContext = {
  fixtureId: "",
  playerName: "",
  teamId: ""
};

export function normalizeBallBoyText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

export function normalizeBallBoyLocale(value) {
  return String(value || "").toLocaleLowerCase().startsWith("zh") ? "zh" : "en";
}

function isZhLocale(locale) {
  return normalizeBallBoyLocale(locale) === "zh";
}

function getLocalizedTeamName(team, locale) {
  return isZhLocale(locale) ? ZH_TEAM_NAMES[team?.id] || team?.name || "球队" : team?.name || "Team";
}

function getLocalizedPlayerName(value, locale) {
  const name = String(value || "").trim();
  if (!isZhLocale(locale) || !name) {
    return name;
  }
  const direct = ZH_PLAYER_NAMES[name];
  if (direct) {
    return direct;
  }
  const normalized = normalizeBallBoyText(name);
  const matchingEntry = Object.entries(ZH_PLAYER_NAMES).find(
    ([candidate]) => normalizeBallBoyText(candidate) === normalized
  );
  return matchingEntry?.[1] || name;
}

function getLocalizedClubName(value, locale) {
  const name = String(value || "").trim();
  if (!isZhLocale(locale) || !name) {
    return name;
  }
  if (ZH_CLUB_NAMES[name]) {
    return ZH_CLUB_NAMES[name];
  }
  const loan = name.match(/^(.+?)\s*\((?:on\s+)?loan(?:\s+from)?\s+(.+?)\)$/i);
  if (!loan) {
    return name;
  }
  const parentClubs = loan[2]
    .split(/,\s*/)
    .map((club) => ZH_CLUB_NAMES[club] || club)
    .filter((club, index, clubs) => clubs.indexOf(club) === index)
    .join("、");
  return `${ZH_CLUB_NAMES[loan[1]] || loan[1]}（从${parentClubs}租借）`;
}

function getLocalizedLeagueName(value, locale) {
  const name = String(value || "").trim();
  if (!isZhLocale(locale) || !name) {
    return name;
  }
  if (ZH_LEAGUE_NAMES[name]) {
    return ZH_LEAGUE_NAMES[name];
  }
  const lastClub = name.match(/^Last club:\s*(.+)$/i);
  return lastClub ? `上家俱乐部：${getLocalizedClubName(lastClub[1], locale)}` : name;
}

function getLocalizedPosition(value, locale) {
  const position = formatPlayerPosition(value);
  if (!isZhLocale(locale)) {
    return position;
  }
  const translatePart = (part) => {
    const key = normalizeBallBoyText(part);
    if (ZH_POSITION_LABELS[key]) {
      return ZH_POSITION_LABELS[key];
    }
    if (/goalkeeper|keeper/.test(key)) return "门将";
    if (/centre back|center back/.test(key)) return "中后卫";
    if (/left back/.test(key)) return "左后卫";
    if (/right back/.test(key)) return "右后卫";
    if (/back|defender|defence|defense/.test(key)) return "后卫";
    if (/defensive midfield/.test(key)) return "防守型中场";
    if (/attacking midfield/.test(key)) return "前腰";
    if (/midfield/.test(key)) return "中场";
    if (/left wing/.test(key)) return "左边锋";
    if (/right wing/.test(key)) return "右边锋";
    if (/wing/.test(key)) return "边锋";
    if (/centre forward|center forward|striker/.test(key)) return "中锋";
    if (/forward|attack/.test(key)) return "前锋";
    return "球员";
  };
  return position
    .split(/\s*[,/;]\s*/)
    .map(translatePart)
    .filter((part, index, items) => items.indexOf(part) === index)
    .join(" / ");
}

function getLocalizedStyleLabel(value, locale) {
  const text = String(value || "").trim();
  if (!isZhLocale(locale) || !text) {
    return text;
  }
  const key = normalizeBallBoyText(text);
  if (ZH_STYLE_LABELS[key]) return ZH_STYLE_LABELS[key];
  if (/save|stopping|goalkeeper|keeper|cross handling/.test(key)) return "门将处理";
  if (/defend|defensive|cover|clearance|duel|screen/.test(key)) return "防守保护";
  if (/pass|delivery|service|distribution/.test(key)) return "向前传球";
  if (/finish|shoot|goal|box movement/.test(key)) return "进攻终结";
  if (/press/.test(key)) return "积极逼抢";
  if (/run|speed|pace|acceleration|carry|dribbl/.test(key)) return "带球与跑动";
  if (/set piece/.test(key)) return "定位球";
  return "比赛阅读";
}

function localizeTeam(team, locale) {
  if (!team || !isZhLocale(locale)) {
    return team;
  }
  return {
    ...team,
    name: getLocalizedTeamName(team, locale),
    officialName: getLocalizedTeamName(team, locale),
    styleTags: (team.styleTags || []).map((tag) => getLocalizedStyleLabel(tag, locale))
  };
}

function canonicalizeChineseQuestion(value) {
  const normalized = normalizeBallBoyText(value);
  if (!/[\p{Script=Han}]/u.test(normalized)) {
    return normalized;
  }

  const exactIntents = [
    [/^(?:你|您)是谁(?:呀|啊)?$/, "who are you"],
    [/^(?:你|您)只是(?:一个)?球童吗$/, "are you just a ball boy"],
    [/^(?:人生|生活|生命)是什么$/, "what is life"],
    [/^生命的意义是什么$/, "what is the meaning of life"],
    [/^为什么活着$/, "why are we here"],
    [/^什么是足球$/, "what is football"],
    [/^足球是什么$/, "what is football"],
    [/^(?:你|您)是真的吗$/, "are you real"],
    [/^(?:你|您)是真人吗$/, "are you a real person"],
    [/^(?:你|您)是(?:机器人|聊天机器人|ai)吗$/, "are you a chatbot"],
    [/^什么是soccer$/, "what is soccer"],
    [/^soccer是什么$/, "what is soccer"],
    [/^为什么叫soccer$/, "why do people call it soccer"],
    [/^(?:谁|哪个球员)(?:是)?(?:世界上)?(?:最强|最好|最佳)$/, "who is the best player"],
    [/^谁是goat$/, "who is the goat"],
    [/^(?:哪个|哪支)(?:国家|国家队)(?:是)?(?:世界上)?(?:最强|最好|最佳)$/, "which country is the best"],
    [/^(?:你|您)是(?:埃尔林)?哈兰德吗$/, "are you haaland"],
    [/^(?:你好|您好|嗨|哈喽)(?:球童)?$/, "hello"],
    [/^(?:你|您)(?:最近)?(?:怎么样|好吗)$/, "how are you"],
    [/^(?:谢谢|多谢|谢了)(?:球童)?$/, "thanks"],
    [/^(?:讲|说|来)(?:一个|个)?(?:足球)?笑话$/, "tell me a joke"],
    [/^(?:我)?(?:可以|能)(?:问|问你)什么$/, "what can i ask"],
    [/^(?:你|您)(?:会|能做)什么$/, "what can you do"],
    [/^帮助$/, "help"]
  ];
  for (const [pattern, replacement] of exactIntents) {
    if (pattern.test(normalized)) {
      return replacement;
    }
  }

  let canonical = ` ${normalized} `;
  const replacements = [
    [/点球大战/g, " penalty shootout "],
    [/伤停补时|补时/g, " stoppage time "],
    [/加时赛|加时/g, " extra time "],
    [/视频助理裁判/g, " var "],
    [/红牌/g, " red card "],
    [/黄牌/g, " yellow card "],
    [/手球/g, " handball "],
    [/越位/g, " offside "],
    [/点球/g, " penalty kick "],
    [/小组赛?积分|积分规则/g, " group points "],
    [/净胜球/g, " goal difference "],
    [/换人|换下|替补上场/g, " substitution "],
    [/解释一下|解释|讲讲|说说/g, " explain "],
    [/介绍一下|介绍|告诉我关于|聊聊/g, " tell me about "],
    [/进了多少球|有多少进球|进球数|进了几球/g, " how many goals "],
    [/有多少助攻|助攻数|几次助攻/g, " assists "],
    [/进球和助攻|进球助攻/g, " goals assists "],
    [/点球进球/g, " penalty goals "],
    [/身价多少|市场价值|身价/g, " market value "],
    [/几岁|多大|年龄/g, " age "],
    [/生日|出生日期|什么时候出生/g, " birthday "],
    [/球衣号码|几号球衣|号码/g, " shirt number "],
    [/效力哪家俱乐部|哪个俱乐部|俱乐部/g, " club "],
    [/踢什么位置|场上位置|位置/g, " position "],
    [/踢球风格|比赛风格|球风|怎么踢|如何踢/g, " play style "],
    [/擅长什么|特点|强项/g, " skills "],
    [/赢了多少场|赢了几场|多少胜|战绩/g, " how many wins record "],
    [/进了多少个|进了几个/g, " how many goals "],
    [/头号射手|最佳射手|谁进球最多/g, " top scorer "],
    [/下一场对谁|下一场比赛|接下来踢谁|下场对手/g, " next match "],
    [/上一场比赛|最近一场比赛|上场比赛/g, " last match "],
    [/是谁进球|谁进了球|进球的是谁/g, " who scored "],
    [/谁赢了|谁获胜|比赛结果/g, " who won result "],
    [/比分是多少|比分/g, " score "],
    [/对阵|对/g, " vs "],
    [/什么时候开球|几点开球|比赛时间/g, " kickoff when "],
    [/交锋记录|历史交锋/g, " head to head "],
    [/有哪些球员值得关注|哪些球员值得关注|有哪些值得关注的球员|谁值得关注|该看谁|关注谁|关键球员/g, " who should i watch "],
    [/本届世界杯|这届世界杯|世界杯/g, " this world cup "],
    [/比赛/g, " match "]
  ];
  for (const [pattern, replacement] of replacements) {
    canonical = canonical.replace(pattern, replacement);
  }
  return normalizeBallBoyText(canonical);
}

function normalizeBallBoyQuestion(value) {
  return canonicalizeChineseQuestion(value);
}

function containsPhrase(text, phrase) {
  const normalizedText = ` ${normalizeBallBoyText(text)} `;
  const normalizedPhrase = normalizeBallBoyText(phrase);
  return Boolean(normalizedPhrase && normalizedText.includes(` ${normalizedPhrase} `));
}

function uniqueBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function loadJson(url, fallback) {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Unable to load ${url}`);
    }
    return await response.json();
  } catch (error) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}

function buildTeamAliasEntries(teams) {
  const entries = [];
  for (const team of teams) {
    const aliases = new Set([
      team.id,
      team.name,
      team.officialName,
      ZH_TEAM_NAMES[team.id],
      ...(EXTRA_TEAM_ALIASES[team.id] || [])
    ]);
    for (const alias of aliases) {
      const key = normalizeBallBoyText(alias);
      if (key && key !== "us") {
        entries.push({ key, team });
      }
    }
  }
  return uniqueBy(entries, (entry) => `${entry.key}:${entry.team.id}`).sort(
    (a, b) => b.key.length - a.key.length
  );
}

async function loadTeams() {
  if (!teamsPromise) {
    teamsPromise = loadJson(BALL_BOY_DATA_URLS.teams).then((data) => {
      teamsCache = Array.isArray(data?.teams) ? data.teams : [];
      teamAliasEntries = buildTeamAliasEntries(teamsCache);
      return teamsCache;
    });
  }
  return teamsPromise;
}

async function refreshFixturesFromLiveData() {
  if (liveRefreshPromise) {
    return liveRefreshPromise;
  }

  liveRefreshPromise = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(BALL_BOY_DATA_URLS.liveData, {
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
      if (!response.ok) {
        return;
      }
      const liveData = await response.json();
      if (Array.isArray(liveData?.fixturesData?.fixtures)) {
        fixturesCache = liveData.fixturesData.fixtures;
      }
      if (liveData?.standingsData?.groups) {
        standingsCache = liveData.standingsData.groups;
      }
    } catch {
      // Static data is the intentional local and offline fallback.
    } finally {
      window.clearTimeout(timeout);
    }
  })();

  return liveRefreshPromise;
}

async function loadFixtures() {
  if (!fixturesPromise) {
    fixturesPromise = loadJson(BALL_BOY_DATA_URLS.fixtures).then((data) => {
      fixturesCache = Array.isArray(data?.fixtures) ? data.fixtures : [];
      return fixturesCache;
    });
  }
  await fixturesPromise;
  return fixturesCache;
}

async function loadStandings() {
  if (!standingsPromise) {
    standingsPromise = loadJson(BALL_BOY_DATA_URLS.standings, { groups: {} }).then((data) => {
      standingsCache = data?.groups && typeof data.groups === "object" ? data.groups : {};
      return standingsCache;
    });
  }
  return standingsPromise;
}

function getProfileAliases(profile) {
  return [
    profile?.name,
    profile?.displayName,
    ...(Array.isArray(profile?.aliases) ? profile.aliases : [])
  ].filter(Boolean);
}

function getSurnameAlias(profile) {
  const parts = normalizeBallBoyText(profile?.displayName || profile?.name).split(" ").filter(Boolean);
  if (!parts.length) {
    return "";
  }
  const suffixes = new Set(["jr", "junior", "senior", "ii", "iii"]);
  const last = suffixes.has(parts.at(-1)) && parts.length > 1 ? parts.at(-2) : parts.at(-1);
  return last && last.length >= 4 ? last : "";
}

function buildPlayerIndex(profilesData) {
  const profiles = Object.entries(profilesData || {}).map(([key, value]) => ({
    ...value,
    name: value?.name || key,
    displayName: value?.displayName || value?.name || key
  }));
  const aliasOwners = new Map();
  const surnameOwners = new Map();
  const byTeamAndName = new Map();

  const addOwner = (map, alias, profile) => {
    const key = normalizeBallBoyText(alias);
    if (!key || (key.length < 3 && !/[\p{Script=Han}]/u.test(key))) {
      return;
    }
    const owners = map.get(key) || [];
    owners.push(profile);
    map.set(key, owners);
  };

  for (const profile of profiles) {
    const localizedName = getLocalizedPlayerName(profile.displayName || profile.name, "zh");
    const manualAliases = Object.entries(ZH_PLAYER_NAME_ALIASES)
      .filter(([, canonicalName]) =>
        normalizeBallBoyText(canonicalName) === normalizeBallBoyText(profile.displayName || profile.name)
      )
      .map(([alias]) => alias);
    for (const alias of [...getProfileAliases(profile), localizedName, ...manualAliases]) {
      addOwner(aliasOwners, alias, profile);
      const aliasKey = normalizeBallBoyText(alias);
      if (profile.teamId && aliasKey) {
        byTeamAndName.set(`${profile.teamId}:${aliasKey}`, profile);
      }
    }
    const surname = getSurnameAlias(profile);
    if (surname) {
      addOwner(surnameOwners, surname, profile);
    }
  }

  for (const [surname, owners] of surnameOwners) {
    const distinct = uniqueBy(
      owners,
      (profile) => `${profile.teamId}:${normalizeBallBoyText(profile.displayName || profile.name)}`
    );
    if (distinct.length === 1 && !aliasOwners.has(surname)) {
      aliasOwners.set(surname, distinct);
    }
  }

  const aliases = [...aliasOwners.entries()]
    .map(([key, owners]) => ({
      key,
      profiles: uniqueBy(
        owners,
        (profile) => `${profile.teamId}:${normalizeBallBoyText(profile.displayName || profile.name)}`
      )
    }))
    .sort((a, b) => b.key.length - a.key.length);

  return { aliases, byTeamAndName, profiles };
}

async function loadProfiles() {
  if (!profilesPromise) {
    profilesPromise = loadJson(BALL_BOY_DATA_URLS.playerProfiles, { profiles: {} }).then((data) => {
      playerIndexCache = buildPlayerIndex(data?.profiles || {});
      return playerIndexCache;
    });
  }
  return profilesPromise;
}

async function loadCoreData() {
  const [teams, fixtures, standings] = await Promise.all([
    loadTeams(),
    loadFixtures(),
    loadStandings()
  ]);
  await refreshFixturesFromLiveData();
  return {
    fixtures: fixturesCache.length ? fixturesCache : fixtures,
    standings: Object.keys(standingsCache).length ? standingsCache : standings,
    teams,
    teamsById: new Map(teams.map((team) => [team.id, team]))
  };
}

export function preloadBallBoyCore() {
  return loadCoreData().catch(() => null);
}

function findTeamsInQuestion(question) {
  const normalized = normalizeBallBoyText(question);
  const matches = [];
  for (const entry of teamAliasEntries) {
    if (containsPhrase(normalized, entry.key) && !matches.some((team) => team.id === entry.team.id)) {
      matches.push(entry.team);
    }
  }
  return matches;
}

function resolvePlayer(question, playerIndex, teamIds = []) {
  const normalized = normalizeBallBoyText(question);
  for (const entry of playerIndex.aliases) {
    if (!containsPhrase(normalized, entry.key)) {
      continue;
    }
    const candidates = teamIds.length
      ? entry.profiles.filter((profile) => teamIds.includes(profile.teamId))
      : entry.profiles;
    if (candidates.length === 1) {
      return { profile: candidates[0], candidates: [] };
    }
    if (candidates.length > 1) {
      return { profile: null, candidates };
    }
  }
  return { profile: null, candidates: [] };
}

function getProfileByName(playerIndex, name, teamId = "") {
  const key = normalizeBallBoyText(name);
  if (teamId && playerIndex.byTeamAndName.has(`${teamId}:${key}`)) {
    return playerIndex.byTeamAndName.get(`${teamId}:${key}`);
  }
  const entry = playerIndex.aliases.find((candidate) => candidate.key === key);
  return entry?.profiles?.[0] || null;
}

function isCompletedFixture(fixture) {
  return COMPLETED_MATCH_STATUSES.has(String(fixture?.status || "").toUpperCase());
}

function getFixtureTime(fixture) {
  const timestamp = new Date(fixture?.kickoffUtc || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortFixturesLatestFirst(fixtures) {
  return [...fixtures].sort((a, b) => getFixtureTime(b) - getFixtureTime(a));
}

function getFixtureTeams(fixture, teamsById) {
  return {
    away: teamsById.get(fixture?.awayTeamId) || null,
    home: teamsById.get(fixture?.homeTeamId) || null
  };
}

function getFixtureWinnerId(fixture) {
  const penalties = fixture?.scoreDetails?.penalties;
  if (Number.isFinite(penalties?.home) && Number.isFinite(penalties?.away)) {
    if (penalties.home > penalties.away) {
      return fixture.homeTeamId;
    }
    if (penalties.away > penalties.home) {
      return fixture.awayTeamId;
    }
  }
  if (fixture?.winnerTeamId) {
    return fixture.winnerTeamId;
  }
  const homeScore = Number(fixture?.score?.home);
  const awayScore = Number(fixture?.score?.away);
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore === awayScore) {
    return "";
  }
  return homeScore > awayScore ? fixture.homeTeamId : fixture.awayTeamId;
}

function getStageLabel(fixture, locale = "en") {
  const key = fixture?.stage || fixture?.round || "";
  if (isZhLocale(locale)) {
    return ZH_STAGE_LABELS[key] || "比赛";
  }
  return STAGE_LABELS[key] || String(key || "Match").replaceAll("-", " ");
}

function formatKickoff(kickoffUtc, locale = "en") {
  const date = new Date(kickoffUtc);
  if (Number.isNaN(date.getTime())) {
    return isZhLocale(locale) ? "开球时间待确认" : "Kickoff time pending";
  }
  let timeZone;
  try {
    timeZone = localStorage.getItem("world-cup-simplified-timezone") || undefined;
  } catch {
    timeZone = undefined;
  }
  const dateLocale = isZhLocale(locale) ? "zh-CN" : "en";
  const formatOptions = {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      timeZone,
      weekday: "short"
  };
  if (isZhLocale(locale)) {
    formatOptions.hour12 = false;
  }
  try {
    return new Intl.DateTimeFormat(dateLocale, formatOptions).format(date);
  } catch {
    const fallbackOptions = {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      weekday: "short"
    };
    if (isZhLocale(locale)) {
      fallbackOptions.hour12 = false;
    }
    return new Intl.DateTimeFormat(dateLocale, fallbackOptions).format(date);
  }
}

function getGoalMinuteValue(goal) {
  const minute = Number(goal?.minute);
  const offset = Number(goal?.offset);
  return (Number.isFinite(minute) ? minute : 0) + (Number.isFinite(offset) ? offset / 100 : 0);
}

function formatGoalMinute(goal) {
  const minute = goal?.minute;
  const offset = Number(goal?.offset);
  if (minute === undefined || minute === null || minute === "") {
    return "—";
  }
  return `${minute}${Number.isFinite(offset) && offset > 0 ? `+${offset}` : ""}′`;
}

function getGoalTimeline(fixture, locale = "en") {
  return [
    ...(fixture?.goalsHome || []).map((goal) => ({ ...goal, side: "home" })),
    ...(fixture?.goalsAway || []).map((goal) => ({ ...goal, side: "away" }))
  ]
    .sort((a, b) => getGoalMinuteValue(a) - getGoalMinuteValue(b))
    .map((goal) => ({
      assistName: getLocalizedPlayerName(goal.assistName || "", locale),
      minute: formatGoalMinute(goal),
      name: goal.ownGoal
        ? isZhLocale(locale)
          ? `${getLocalizedPlayerName(goal.name, locale)}（乌龙球）`
          : `${goal.name} (own goal)`
        : getLocalizedPlayerName(goal.name, locale),
      penalty: Boolean(goal.penalty),
      side: goal.side
    }));
}

function getPlayerTournamentStats(profile, fixtures) {
  const aliases = new Set(getProfileAliases(profile).map(normalizeBallBoyText).filter(Boolean));
  const stats = { assists: 0, goals: 0, penaltyGoals: 0 };
  for (const fixture of fixtures) {
    if (!COUNTABLE_PLAYER_STATUSES.has(String(fixture?.status || "").toUpperCase())) {
      continue;
    }
    const side = fixture.homeTeamId === profile.teamId
      ? "home"
      : fixture.awayTeamId === profile.teamId
        ? "away"
        : "";
    if (!side) {
      continue;
    }
    const goals = side === "home" ? fixture.goalsHome || [] : fixture.goalsAway || [];
    for (const goal of goals) {
      if (!goal?.ownGoal && aliases.has(normalizeBallBoyText(goal?.name))) {
        stats.goals += 1;
        if (goal.penalty) {
          stats.penaltyGoals += 1;
        }
      }
      if (
        goal?.assistName &&
        normalizeBallBoyText(goal.assistName) !== normalizeBallBoyText(goal.name) &&
        aliases.has(normalizeBallBoyText(goal.assistName))
      ) {
        stats.assists += 1;
      }
    }
  }
  return stats;
}

function getAge(birthDate) {
  const match = String(birthDate || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  const now = new Date();
  let age = now.getFullYear() - year;
  const beforeBirthday =
    now.getMonth() + 1 < month ||
    (now.getMonth() + 1 === month && now.getDate() < day);
  if (beforeBirthday) {
    age -= 1;
  }
  return Number.isInteger(age) && age >= 0 && age < 100 ? age : null;
}

function formatPlayerPosition(position) {
  const text = String(position || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return "Player";
  }
  return text.replace(/(^|[,/]\s*)(\p{Letter})/gu, (_, prefix, letter) => {
    return `${prefix}${letter.toLocaleUpperCase("en-US")}`;
  });
}

function getPlayerMarketValueInfo(profile) {
  const exact = Number(profile?.marketValueEurMillions);
  if (Number.isFinite(exact) && exact > 0) {
    return { estimated: false, value: exact };
  }
  const estimated = Number(profile?.estimatedMarketValueEurMillions);
  if (Number.isFinite(estimated) && estimated > 0) {
    return { estimated: true, value: estimated };
  }
  return null;
}

function getPlayerPrimeMarketValue(profile, currentValue) {
  const peak = Number(profile?.peakMarketValueEurMillions);
  return Number.isFinite(peak) && peak > Number(currentValue) ? peak : null;
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

function formatBirthDate(birthDate, locale = "en") {
  const match = String(birthDate || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return "";
  }
  if (isZhLocale(locale)) {
    return `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日`;
  }
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = months[Number(match[2]) - 1];
  return month ? `${month} ${Number(match[3])}, ${Number(match[1])}` : "";
}

function joinNaturalList(items, locale = "en") {
  const values = items.filter(Boolean);
  if (values.length < 2) {
    return values[0] || "";
  }
  if (values.length === 2) {
    return isZhLocale(locale) ? values.join("和") : `${values[0]} and ${values[1]}`;
  }
  return isZhLocale(locale)
    ? `${values.slice(0, -1).join("、")}和${values.at(-1)}`
    : `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function getPlayerRole(profile, locale = "en") {
  const position = normalizeBallBoyText(String(profile?.position || "").split(/[,/;]/)[0]);
  let role;
  if (position.includes("goalkeeper")) {
    role = {
      summary: "The goalkeeper protects the goal and often starts attacks with the first pass.",
      zone: "goal"
    };
  } else if (position.includes("back") || position.includes("defender") || position.includes("centre back")) {
    role = {
      summary: "A defender stops attacks first, then helps move the ball safely up the pitch.",
      zone: "defend"
    };
  } else if (position.includes("midfield")) {
    role = {
      summary: "A midfielder connects defence and attack by winning the ball, keeping it, and finding the next pass.",
      zone: "create"
    };
  } else if (position.includes("wing")) {
    role = {
      summary: "A winger starts wide, attacks defenders, and creates or finishes chances near the box.",
      zone: "attack-wide"
    };
  } else if (position.includes("forward") || position.includes("striker")) {
    role = {
      summary: "A striker's main job is to run behind the defence, attack the penalty area, and finish chances.",
      zone: "finish"
    };
  } else {
    role = {
      summary: "Their job changes with the move, but the aim is simple: help the team control the next action.",
      zone: "create"
    };
  }
  if (!isZhLocale(locale)) {
    return role;
  }
  const summary = {
    goal: "门将首先要保护球门，也常常用第一次传球发起进攻。",
    defend: "后卫先阻止对手进攻，再帮助球队安全地把球向前推进。",
    create: "中场连接防守与进攻：抢回球权、稳住球，再找到下一脚传球。",
    "attack-wide": "边锋通常从边路启动，突破防守，并在禁区附近创造或完成机会。",
    finish: "中锋的主要任务是前插到防线身后、冲击禁区并完成射门。"
  }[role.zone];
  return { ...role, summary };
}

function formatStatNoun(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildPlayerReply(profile, team, fixtures, question, locale = "en") {
  const isZh = isZhLocale(locale);
  const stats = getPlayerTournamentStats(profile, fixtures);
  const role = getPlayerRole(profile, locale);
  const age = getAge(profile.birthDate);
  const marketValue = getPlayerMarketValueInfo(profile);
  const formattedPosition = formatPlayerPosition(profile.position);
  const localizedPosition = getLocalizedPosition(profile.position, locale);
  const localizedName = getLocalizedPlayerName(profile.displayName, locale);
  const localizedTeam = localizeTeam(team, locale);
  const asksForStats = /\b(goal|goals|assist|assists|stats|statistics|this world cup|tournament)\b/.test(question);
  const asksForPenaltyGoals = /\b(penalty|penalties|penalty goals|penalty kicks|from the spot)\b/.test(question);
  const asksForStyle = /\b(style|play style|playstyle|how.*play|strength|skills|good at|watch)\b/.test(question);
  const asksForValue = /\b(market value|value|valuation|worth)\b/.test(question);
  const asksForLeague = /\b(league|competition)\b/.test(question);
  const asksForNumber = /\b(shirt|jersey|squad) number\b|\bnumber\b/.test(question);
  const asksForBirthDate = /\b(birthday|birth date|born)\b/.test(question);
  const asksForAge = asksForBirthDate || /\b(age|how old)\b/.test(question);
  const asksForClub = /\b(club|club team)\b/.test(question);
  const asksForPosition = /\b(position|role)\b/.test(question);
  const focus = asksForPenaltyGoals
    ? "penalty-goals"
    : asksForStats
      ? "stats"
      : asksForValue
        ? "value"
        : asksForLeague
          ? "league"
          : asksForNumber
            ? "number"
            : asksForAge
              ? "age"
              : asksForClub
                ? "club"
                : asksForPosition
                  ? "position"
                  : asksForStyle
                    ? "style"
                    : "overview";
  const positionArticle = /^[aeiou]/i.test(formattedPosition) ? "an" : "a";
  let lead;
  if (asksForPenaltyGoals) {
    lead = isZh
      ? stats.penaltyGoals
        ? `本届世界杯，${localizedName}通过点球打进${stats.penaltyGoals}球。`
        : `${localizedName}本届世界杯还没有点球进球。`
      : stats.penaltyGoals
        ? `This World Cup: ${formatStatNoun(stats.penaltyGoals, "penalty goal")} for ${profile.displayName}.`
        : `${profile.displayName} has no penalty goals at this World Cup.`;
  } else if (asksForStats) {
    lead = isZh
      ? `本届世界杯：${stats.goals}个进球，${stats.assists}次助攻。`
      : `This World Cup: ${formatStatNoun(stats.goals, "goal")} and ${formatStatNoun(stats.assists, "assist")}.`;
  } else if (asksForValue) {
    lead = isZh
      ? marketValue
        ? `${localizedName}的${marketValue.estimated ? "估算" : "公开"}市场身价是${formatMarketValueEur(marketValue.value)}。`
        : `我没有查到${localizedName}经过核验的市场身价。`
      : marketValue
        ? `${profile.displayName}'s ${marketValue.estimated ? "estimated " : ""}market value is ${formatMarketValueEur(marketValue.value)}.`
        : `I do not have a verified market value for ${profile.displayName}.`;
  } else if (asksForLeague) {
    lead = isZh
      ? profile.club && profile.league
        ? `${localizedName}效力于${getLocalizedClubName(profile.club, locale)}，参加${getLocalizedLeagueName(profile.league, locale)}。`
        : `我没有查到${localizedName}经过核验的联赛信息。`
      : profile.club && profile.league
        ? `${profile.displayName}'s club is ${profile.club} (${profile.league}).`
        : `I do not have a verified league for ${profile.displayName}.`;
  } else if (asksForNumber) {
    lead = isZh
      ? profile.uniformNumber != null && profile.uniformNumber !== ""
        ? `${localizedName}在${localizedTeam?.name || profile.teamId}身穿${profile.uniformNumber}号球衣。`
        : `我没有查到${localizedName}经过确认的世界杯球衣号码。`
      : profile.uniformNumber != null && profile.uniformNumber !== ""
        ? `${profile.displayName} is listed as number ${profile.uniformNumber} for ${team?.name || profile.teamId}.`
        : `I do not have a confirmed World Cup shirt number for ${profile.displayName}.`;
  } else if (asksForAge) {
    const birthday = formatBirthDate(profile.birthDate, locale);
    lead = isZh
      ? asksForBirthDate && birthday
        ? `${localizedName}出生于${birthday}。`
        : age != null
          ? `${localizedName}今年${age}岁。`
          : `我没有查到${localizedName}经过核验的出生日期。`
      : asksForBirthDate && birthday
        ? `${profile.displayName} was born on ${birthday}.`
        : age != null
          ? `${profile.displayName} is ${age}.`
          : `I do not have a verified birth date for ${profile.displayName}.`;
  } else if (asksForClub) {
    lead = isZh
      ? profile.club
        ? `${localizedName}效力于${getLocalizedClubName(profile.club, locale)}${profile.league ? `（${getLocalizedLeagueName(profile.league, locale)}）` : ""}。`
        : `我没有查到${localizedName}经过核验的俱乐部信息。`
      : profile.club
        ? `${profile.displayName}'s club is ${profile.club}${profile.league ? ` (${profile.league})` : ""}.`
        : `I do not have a verified club for ${profile.displayName}.`;
  } else if (asksForPosition) {
    lead = isZh
      ? `${localizedName}的位置是${localizedPosition}。`
      : `${profile.displayName} is listed as ${positionArticle} ${formattedPosition.toLocaleLowerCase("en-US")}.`;
  } else if (asksForStyle) {
    const watchSkills = joinNaturalList(
      (Array.isArray(profile.skills) ? profile.skills.slice(0, 3) : [])
        .map((skill) => isZh
          ? getLocalizedStyleLabel(skill, locale)
          : `${skill.charAt(0).toLocaleLowerCase("en-US")}${skill.slice(1)}`),
      locale
    );
    lead = isZh
      ? `${localizedName}司职${localizedPosition}。${watchSkills ? `重点看${watchSkills}。` : role.summary}`
      : `${profile.displayName} is ${positionArticle} ${formattedPosition.toLocaleLowerCase("en-US")}.${watchSkills ? ` Watch for ${watchSkills}.` : ""}`;
  } else {
    const club = profile.club ? ` and ${profile.club}` : "";
    lead = isZh
      ? `${localizedName}是${localizedTeam?.name || profile.teamId}的${localizedPosition}${profile.club ? `，俱乐部效力于${getLocalizedClubName(profile.club, locale)}` : ""}。`
      : `${profile.displayName} plays as ${positionArticle} ${formattedPosition.toLocaleLowerCase("en-US")} for ${team?.name || profile.teamId}${club}.`;
  }

  const followUps = [];
  if (!asksForStats && !asksForPenaltyGoals) {
    followUps.push(isZh
      ? `${localizedName}有多少进球和助攻？`
      : `How many goals and assists does ${profile.displayName} have?`);
  }
  if (!asksForStyle) {
    followUps.push(isZh ? `${localizedName}怎么踢？` : `How does ${profile.displayName} play?`);
  }
  followUps.push(isZh
    ? localizedTeam ? `${localizedTeam.name}怎么踢？` : "我可以问什么？"
    : team ? `How do ${team.name} play?` : "What can I ask?");

  const localizedSkills = (Array.isArray(profile.skills) ? profile.skills.slice(0, 3) : [])
    .map((skill) => getLocalizedStyleLabel(skill, locale));
  const note = isZh
    ? localizedSkills.length
      ? `${localizedName}的比赛看点是${joinNaturalList(localizedSkills, locale)}。先观察这些动作，就更容易看懂这名球员的作用。`
      : `${localizedName}会根据比赛阶段调整任务，重点是帮助球队完成下一次有效行动。`
    : profile.note || "";

  return {
    age,
    focus,
    followUps: followUps.slice(0, 3),
    kind: "player",
    lead,
    profile: {
      canonicalName: profile.displayName,
      club: getLocalizedClubName(profile.club, locale),
      displayName: localizedName,
      imageUrl: profile.imageUrl || "",
      league: getLocalizedLeagueName(profile.league, locale),
      marketValue,
      note,
      peakMarketValue: getPlayerPrimeMarketValue(profile, marketValue?.value),
      position: localizedPosition,
      shirtNumber: profile.uniformNumber ?? "",
      skills: localizedSkills
    },
    role,
    stats,
    team: localizedTeam
  };
}

function getTeamStyleSummary(team, locale = "en") {
  const text = normalizeBallBoyText([team?.tagline, ...(team?.styleTags || [])].join(" "));
  if (isZhLocale(locale)) {
    let setup = "他们会有目的地把球向前推进";
    let nextStep = "";
    if (/press/.test(text)) {
      setup = "他们会尽快把球抢回来";
    } else if (/block|compact|defend|cover/.test(text)) {
      setup = "他们会保持紧凑，先保护关键空间";
    } else if (/possession|passing|control|tempo|circulation|rhythm/.test(text)) {
      setup = "他们会控制球权和比赛节奏";
    }
    if (/counter|transition|direct|vertical|outlet/.test(text)) {
      nextStep = "再赶在对手重新站稳前发动进攻";
    } else if (/possession|passing|control|tempo|circulation|rhythm/.test(text)) {
      nextStep = "耐心传递，等空当出现";
    } else if (/wide|wing|cross|fullback/.test(text)) {
      nextStep = "拉开场地宽度，从边路进攻";
    } else if (/box|aerial|target|set piece/.test(text)) {
      nextStep = "在禁区附近制造身体对抗和高空机会";
    }
    return `${setup}${nextStep ? `，${nextStep}` : ""}。`;
  }
  let setup = "They move the ball forward with a clear purpose";
  let nextStep = "";
  if (/press/.test(text)) {
    setup = "They try to win the ball back quickly";
  } else if (/block|compact|defend|cover/.test(text)) {
    setup = "They stay compact and protect space";
  } else if (/possession|passing|control|tempo|circulation|rhythm/.test(text)) {
    setup = "They keep the ball and control the rhythm";
  }
  if (/counter|transition|direct|vertical|outlet/.test(text)) {
    nextStep = "attack before the opponent resets";
  } else if (/possession|passing|control|tempo|circulation|rhythm/.test(text)) {
    nextStep = "move it patiently until a gap opens";
  } else if (/wide|wing|cross|fullback/.test(text)) {
    nextStep = "stretch the pitch and attack from wide areas";
  } else if (/box|aerial|target|set piece/.test(text)) {
    nextStep = "aim for physical chances in and around the box";
  }
  return `${setup}${nextStep ? `, then ${nextStep}` : ""}.`;
}

function getTeamRecord(teamId, fixtures) {
  const record = {
    draws: 0,
    form: [],
    goalsAgainst: 0,
    goalsFor: 0,
    losses: 0,
    played: 0,
    shootoutAdvances: 0,
    shootoutExits: 0,
    wins: 0
  };
  const completed = sortFixturesLatestFirst(
    fixtures.filter(
      (fixture) =>
        isCompletedFixture(fixture) &&
        (fixture.homeTeamId === teamId || fixture.awayTeamId === teamId)
    )
  );

  for (const fixture of [...completed].reverse()) {
    const isHome = fixture.homeTeamId === teamId;
    const goalsFor = Number(isHome ? fixture.score?.home : fixture.score?.away);
    const goalsAgainst = Number(isHome ? fixture.score?.away : fixture.score?.home);
    if (!Number.isFinite(goalsFor) || !Number.isFinite(goalsAgainst)) {
      continue;
    }
    record.played += 1;
    record.goalsFor += goalsFor;
    record.goalsAgainst += goalsAgainst;
    if (goalsFor > goalsAgainst) {
      record.wins += 1;
      record.form.push({ label: "W", result: "win" });
      continue;
    }
    if (goalsFor < goalsAgainst) {
      record.losses += 1;
      record.form.push({ label: "L", result: "loss" });
      continue;
    }

    record.draws += 1;
    const penalties = fixture?.scoreDetails?.penalties;
    if (Number.isFinite(penalties?.home) && Number.isFinite(penalties?.away)) {
      const advanced = getFixtureWinnerId(fixture) === teamId;
      if (advanced) {
        record.shootoutAdvances += 1;
      } else {
        record.shootoutExits += 1;
      }
      record.form.push({ label: "P", result: advanced ? "shootout-win" : "shootout-loss" });
    } else {
      record.form.push({ label: "D", result: "draw" });
    }
  }

  record.form = record.form.slice(-6);
  return { completed, record };
}

function getTeamTopScorer(teamId, fixtures) {
  const totals = new Map();
  for (const fixture of fixtures) {
    if (!COUNTABLE_PLAYER_STATUSES.has(String(fixture?.status || "").toUpperCase())) {
      continue;
    }
    const goals = fixture.homeTeamId === teamId
      ? fixture.goalsHome || []
      : fixture.awayTeamId === teamId
        ? fixture.goalsAway || []
        : [];
    for (const goal of goals) {
      if (!goal?.name || goal.ownGoal) {
        continue;
      }
      const key = normalizeBallBoyText(goal.name);
      const current = totals.get(key) || { goals: 0, name: goal.name };
      current.goals += 1;
      totals.set(key, current);
    }
  }
  return [...totals.values()].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))[0] || null;
}

function getTeamKeyPlayers(teamId, fixtures) {
  for (const fixture of sortFixturesLatestFirst(fixtures)) {
    const side = fixture.homeTeamId === teamId ? "home" : fixture.awayTeamId === teamId ? "away" : "";
    if (!side) {
      continue;
    }
    const players = fixture?.keyPlayers?.[side];
    if (Array.isArray(players) && players.length) {
      return players.slice(0, 3);
    }
  }
  return [];
}

function getTeamGroupStanding(team, standings) {
  const rows = standings?.[team?.groupId];
  if (!Array.isArray(rows)) {
    return null;
  }
  const index = rows.findIndex((row) => row.teamId === team.id);
  if (index < 0) {
    return null;
  }
  const row = rows[index];
  return {
    goalDifference: Number(row.gf || 0) - Number(row.ga || 0),
    points: Number(row.wins || 0) * 3 + Number(row.draws || 0),
    position: index + 1
  };
}

function getCompactFixture(fixture, teamsById, locale = "en") {
  if (!fixture) {
    return null;
  }
  const teams = getFixtureTeams(fixture, teamsById);
  return {
    away: localizeTeam(teams.away, locale),
    home: localizeTeam(teams.home, locale),
    id: fixture.id,
    kickoffLabel: formatKickoff(fixture.kickoffUtc, locale),
    penalties: fixture?.scoreDetails?.penalties || null,
    score: fixture.score || null,
    status: fixture.status,
    winnerTeamId: isCompletedFixture(fixture) ? getFixtureWinnerId(fixture) : ""
  };
}

function buildCountryReply(team, core, question, locale = "en") {
  const isZh = isZhLocale(locale);
  const localizedTeam = localizeTeam(team, locale);
  const { completed, record } = getTeamRecord(team.id, core.fixtures);
  const teamFixtures = core.fixtures.filter(
    (fixture) => fixture.homeTeamId === team.id || fixture.awayTeamId === team.id
  );
  const nextMatch = [...teamFixtures]
    .filter(
      (fixture) =>
        !isCompletedFixture(fixture) &&
        String(fixture?.status || "").toUpperCase() !== "LIVE"
    )
    .sort((a, b) => getFixtureTime(a) - getFixtureTime(b))[0] || null;
  const lastMatch = completed[0] || null;
  const asksWins = /\b(win|wins|won|record|how many)\b/.test(question);
  const asksGoals = /\b(how many goals|goals scored|scored at this|scored in this|tournament goals)\b/.test(question);
  const asksGoalDifference = /\bgoal difference\b/.test(question);
  const asksTopScorer = /\b(top scorer|leading scorer|most goals|who scored most)\b/.test(question);
  const asksNext = /\b(next|play next|playing next|next match|next game|who.*next)\b/.test(question);
  const asksStyle = /\b(style|play style|playstyle|how.*play|attack|defend)\b/.test(question);
  const shootoutResults = [
    record.shootoutAdvances
      ? `advanced ${record.shootoutAdvances === 1 ? "once" : `${record.shootoutAdvances} times`}`
      : "",
    record.shootoutExits
      ? `went out ${record.shootoutExits === 1 ? "once" : `${record.shootoutExits} times`}`
      : ""
  ].filter(Boolean);
  const shootoutNote = shootoutResults.length
    ? ` They ${shootoutResults.join(" and ")} on penalties; ${record.shootoutAdvances + record.shootoutExits === 1 ? "that match counts" : "those matches count"} as a draw in W-D-L.`
    : "";
  const topScorer = getTeamTopScorer(team.id, core.fixtures);
  const localizedTopScorer = topScorer
    ? { ...topScorer, name: getLocalizedPlayerName(topScorer.name, locale) }
    : null;
  let lead;
  if (asksNext && !nextMatch) {
    lead = isZh
      ? `目前载入的赛程中没有${localizedTeam.name}的下一场比赛。`
      : `${team.name} have no next match in the loaded tournament schedule.`;
  } else if (asksTopScorer && topScorer) {
    lead = isZh
      ? `${localizedTopScorer.name}以${topScorer.goals}个进球领跑${localizedTeam.name}队内射手榜。`
      : `${topScorer.name} leads ${team.name} with ${formatStatNoun(topScorer.goals, "goal")} at this World Cup.`;
  } else if (asksGoalDifference) {
    const goalDifference = record.goalsFor - record.goalsAgainst;
    lead = isZh
      ? `${localizedTeam.name}本届赛事的净胜球是${goalDifference > 0 ? "+" : ""}${goalDifference}：进${record.goalsFor}球，失${record.goalsAgainst}球。`
      : `${team.name}'s full-tournament goal difference is ${goalDifference > 0 ? "+" : ""}${goalDifference}: ${record.goalsFor} scored minus ${record.goalsAgainst} allowed.`;
  } else if (asksGoals) {
    lead = isZh
      ? `${localizedTeam.name}在${record.played}场比赛中打进${record.goalsFor}球，丢了${record.goalsAgainst}球。`
      : `${team.name} have scored ${formatStatNoun(record.goalsFor, "goal")} and allowed ${record.goalsAgainst} across ${record.played} matches.`;
  } else if (asksWins) {
    lead = isZh
      ? `${localizedTeam.name}本届世界杯踢了${record.played}场，赢下${record.wins}场。${record.shootoutAdvances || record.shootoutExits ? "点球大战在胜平负统计中按平局计算。" : ""}`
      : `${team.name} have won ${record.wins} of ${record.played} matches at this World Cup.${shootoutNote}`;
  } else if (asksStyle) {
    lead = getTeamStyleSummary(team, locale);
  } else {
    lead = isZh
      ? `${localizedTeam.name}踢了${record.played}场：${record.wins}胜、${record.draws}平、${record.losses}负，进${record.goalsFor}球、失${record.goalsAgainst}球。`
      : `${team.name} are ${record.wins}-${record.draws}-${record.losses} across ${record.played} matches, with ${record.goalsFor} scored and ${record.goalsAgainst} allowed.`;
  }

  const keyPlayers = getTeamKeyPlayers(team.id, core.fixtures).map((player) => ({
    ...player,
    name: getLocalizedPlayerName(player.name, locale),
    promptName: player.name
  }));
  const followUps = [];
  if (keyPlayers[0]?.name) {
    followUps.push(isZh ? `介绍一下${keyPlayers[0].name}` : `Tell me about ${keyPlayers[0].name}`);
  }
  if (lastMatch) {
    followUps.push(isZh ? `${localizedTeam.name}上一场比赛发生了什么？` : `What happened in ${team.name}'s last match?`);
  }
  if (nextMatch) {
    followUps.push(isZh ? `${localizedTeam.name}下一场对谁？` : `Who do ${team.name} play next?`);
  } else {
    followUps.push(isZh ? `${localizedTeam.name}有哪些球员值得关注？` : `Who should I watch for ${team.name}?`);
  }

  return {
    beginnerStyle: getTeamStyleSummary(team, locale),
    followUps: followUps.slice(0, 3),
    groupStanding: getTeamGroupStanding(team, core.standings),
    keyPlayers,
    kind: "country",
    lastMatch: getCompactFixture(lastMatch, core.teamsById, locale),
    lead,
    nextMatch: getCompactFixture(nextMatch, core.teamsById, locale),
    record,
    team: localizedTeam,
    topScorer: localizedTopScorer
  };
}

function isMatchQuestion(question) {
  return /\b(match|game|score|scored|won|winner|beat|result|happened|play next|playing next|next match|last match|highlights|head to head|h2h|kickoff|when)\b/.test(question);
}

function resolveFixture(question, teams, fixtures, contextFixtureId = "") {
  const teamIds = teams.map((team) => team.id);
  let candidates = fixtures.filter((fixture) => {
    const ids = [fixture.homeTeamId, fixture.awayTeamId];
    return teamIds.length >= 2
      ? teamIds.every((teamId) => ids.includes(teamId))
      : teamIds.length === 1
        ? ids.includes(teamIds[0])
        : false;
  });

  if (!candidates.length && contextFixtureId) {
    return fixtures.find((fixture) => fixture.id === contextFixtureId) || null;
  }
  if (!candidates.length) {
    return null;
  }

  const asksPastTiming = /\bwhen (?:was|were|did)\b/.test(question);
  const asksUpcomingTiming = /\b(next|upcoming|play next|playing next|when (?:is|are|do|does|will)|kickoff)\b/.test(question);
  if (asksUpcomingTiming && !asksPastTiming) {
    return candidates
      .filter(
        (fixture) =>
          !isCompletedFixture(fixture) &&
          String(fixture?.status || "").toUpperCase() !== "LIVE"
      )
      .sort((a, b) => getFixtureTime(a) - getFixtureTime(b))[0] || null;
  }
  if (asksPastTiming || /\b(last|latest|won|winner|score|result|happened|scored|highlights)\b/.test(question)) {
    return sortFixturesLatestFirst(candidates.filter(isCompletedFixture))[0] || null;
  }

  candidates = sortFixturesLatestFirst(candidates);
  return candidates[0] || null;
}

function getSelectedUrlContext() {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      fixtureId: params.get("match") || params.get("matchId") || "",
      teamQuery: params.get("team") || params.get("country") || ""
    };
  } catch {
    return { fixtureId: "", teamQuery: "" };
  }
}

function didMatchGoToExtraTime(fixture, timeline) {
  if (fixture?.scoreDetails?.penalties) {
    return true;
  }
  if (timeline.some((goal) => Number.parseInt(goal.minute, 10) > 90)) {
    return true;
  }
  return (fixture?.resultStoryBullets || []).some((bullet) => /extra time|120-minute|120 minute/i.test(bullet));
}

function buildMatchLead(fixture, teams, timeline, locale = "en") {
  const isZh = isZhLocale(locale);
  const status = String(fixture?.status || "").toUpperCase();
  if (status === "LIVE") {
    const homeScore = Number(fixture?.score?.home);
    const awayScore = Number(fixture?.score?.away);
    if (Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
      if (homeScore === awayScore) {
        return isZh
          ? `${teams.home?.name || "主队"}与${teams.away?.name || "客队"}暂时${homeScore}-${awayScore}战平，比赛仍在进行。`
          : `${teams.home?.name || "The home team"} and ${teams.away?.name || "the away team"} are level ${homeScore}-${awayScore}. The match is still in progress.`;
      }
      const leader = homeScore > awayScore ? teams.home : teams.away;
      const leaderScore = Math.max(homeScore, awayScore);
      const trailingScore = Math.min(homeScore, awayScore);
      return isZh
        ? `${leader?.name || "领先一方"}暂时以${leaderScore}-${trailingScore}领先，比赛仍在进行。`
        : `${leader?.name || "One team"} lead ${leaderScore}-${trailingScore}. The match is still in progress.`;
    }
    return isZh
      ? `${teams.home?.name || "主队"}与${teams.away?.name || "客队"}正在比赛，目前还没有经过核验的最终比分。`
      : `${teams.home?.name || "The home team"} and ${teams.away?.name || "the away team"} are playing now. No verified final score yet.`;
  }
  if (!isCompletedFixture(fixture)) {
    return isZh
      ? `${teams.home?.name || "待定"}将在${formatKickoff(fixture.kickoffUtc, locale)}对阵${teams.away?.name || "待定"}，比赛尚未开始。`
      : `${teams.home?.name || "TBD"} play ${teams.away?.name || "TBD"} on ${formatKickoff(fixture.kickoffUtc, locale)}. The match has not been played yet.`;
  }

  const homeScore = Number(fixture?.score?.home);
  const awayScore = Number(fixture?.score?.away);
  const penalties = fixture?.scoreDetails?.penalties;
  const winnerId = getFixtureWinnerId(fixture);
  const winner = winnerId === fixture.homeTeamId ? teams.home : winnerId === fixture.awayTeamId ? teams.away : null;
  const wentToExtraTime = didMatchGoToExtraTime(fixture, timeline);

  if (Number.isFinite(penalties?.home) && Number.isFinite(penalties?.away) && winner) {
    const winnerPenaltyScore = winnerId === fixture.homeTeamId ? penalties.home : penalties.away;
    const loserPenaltyScore = winnerId === fixture.homeTeamId ? penalties.away : penalties.home;
    return isZh
      ? `双方${homeScore}-${awayScore}战平后，${winner.name}在点球大战中以${winnerPenaltyScore}-${loserPenaltyScore}胜出并晋级。`
      : `${winner.name} advanced ${winnerPenaltyScore}-${loserPenaltyScore} on penalties after a ${homeScore}-${awayScore} draw.`;
  }
  if (winner && Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
    const winnerScore = winnerId === fixture.homeTeamId ? homeScore : awayScore;
    const loserScore = winnerId === fixture.homeTeamId ? awayScore : homeScore;
    const firstGoal = timeline[0];
    const firstScoringTeamId = firstGoal?.side === "home" ? fixture.homeTeamId : firstGoal?.side === "away" ? fixture.awayTeamId : "";
    if (isZh) {
      const firstTeam = firstScoringTeamId === fixture.homeTeamId ? teams.home?.name : teams.away?.name;
      const comebackLine = firstScoringTeamId && firstScoringTeamId !== winnerId
        ? `${firstTeam}先取得进球，但${winner.name}随后完成逆转。`
        : "";
      return `${winner.name}${wentToExtraTime ? "经过加时赛" : ""}以${winnerScore}-${loserScore}获胜。${comebackLine}`;
    }
    const comebackLine = firstScoringTeamId && firstScoringTeamId !== winnerId
      ? ` ${firstScoringTeamId === fixture.homeTeamId ? teams.home?.name : teams.away?.name} scored first before ${winner.name} came back to win.`
      : "";
    return `${winner.name} won ${winnerScore}-${loserScore}${wentToExtraTime ? " after extra time" : ""}.${comebackLine}`;
  }
  if (Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
    return isZh
      ? `${teams.home?.name}与${teams.away?.name}${wentToExtraTime ? "经过加时赛" : ""}以${homeScore}-${awayScore}结束比赛。`
      : `${teams.home?.name} and ${teams.away?.name} finished ${homeScore}-${awayScore}${wentToExtraTime ? " after extra time" : ""}.`;
  }
  return isZh
    ? "比赛已标记为结束，但经过核验的比分尚未载入。"
    : "The match is marked finished, but the verified score is not available yet.";
}

function getZhH2hSummary(fixture, teams) {
  const results = Array.isArray(fixture?.h2h?.results) ? fixture.h2h.results : [];
  if (!results.length || !teams.home || !teams.away) {
    return fixture?.h2h?.status === "verified-empty"
      ? "这场比赛前，双方没有经过核验的成年国家队交锋记录。"
      : "双方过往交锋记录仍在核验中。";
  }
  const record = { draws: 0, homeWins: 0, awayWins: 0 };
  for (const result of results) {
    const homeScore = Number(result.homeScore);
    const awayScore = Number(result.awayScore);
    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
      continue;
    }
    if (homeScore === awayScore) {
      record.draws += 1;
      continue;
    }
    const winnerId = homeScore > awayScore ? result.homeTeamId : result.awayTeamId;
    if (winnerId === teams.home.id) {
      record.homeWins += 1;
    } else if (winnerId === teams.away.id) {
      record.awayWins += 1;
    }
  }
  return `此前经过核验的成年国家队交锋：${teams.home.name}${record.homeWins}胜，平局${record.draws}场，${teams.away.name}${record.awayWins}胜。`;
}

function getStructuredZhRecap(fixture, teams, timeline) {
  if (Array.isArray(fixture?.resultStoryBulletsZh) && fixture.resultStoryBulletsZh.length) {
    return fixture.resultStoryBulletsZh.slice(0, 3);
  }
  if (!isCompletedFixture(fixture)) {
    return [];
  }
  const winnerId = getFixtureWinnerId(fixture);
  const winner = winnerId === fixture.homeTeamId ? teams.home : winnerId === fixture.awayTeamId ? teams.away : null;
  const firstGoal = timeline[0];
  const bullets = [];
  if (firstGoal) {
    bullets.push(`${firstGoal.name}在${firstGoal.minute}打入本场第一个进球。`);
  }
  if (winner && Number.isFinite(fixture?.score?.home) && Number.isFinite(fixture?.score?.away)) {
    bullets.push(`${winner.name}最终拿下比赛。`);
  }
  return bullets.slice(0, 3);
}

function buildMatchReply(fixture, core, question, locale = "en") {
  const isZh = isZhLocale(locale);
  const rawTeams = getFixtureTeams(fixture, core.teamsById);
  const teams = {
    away: localizeTeam(rawTeams.away, locale),
    home: localizeTeam(rawTeams.home, locale)
  };
  const timeline = getGoalTimeline(fixture, locale);
  const wantsH2h = /\b(head to head|h2h|history|previous meetings)\b/.test(question);
  const resultLead = buildMatchLead(fixture, teams, timeline, locale);
  const lead = /\bwhen\b/.test(question) && isCompletedFixture(fixture)
    ? isZh
      ? `${teams.home?.name || "主队"}与${teams.away?.name || "客队"}在${formatKickoff(fixture.kickoffUtc, locale)}交手。${resultLead}`
      : `${teams.home?.name || "The home team"} and ${teams.away?.name || "the away team"} played on ${formatKickoff(fixture.kickoffUtc, locale)}. ${resultLead}`
    : resultLead;
  const followUps = [];
  if (teams.home && teams.away) {
    if (isCompletedFixture(fixture)) {
      followUps.push(isZh
        ? `${teams.home.name}对${teams.away.name}是谁进球？`
        : `Who scored in ${teams.home.name} vs ${teams.away.name}?`);
    }
    followUps.push(isZh ? `${teams.home.name}怎么踢？` : `How do ${teams.home.name} play?`);
    followUps.push(isZh ? `${teams.away.name}怎么踢？` : `How do ${teams.away.name} play?`);
  }

  return {
    fixture: {
      awayTeamId: fixture.awayTeamId || "",
      highlightVideo: fixture.highlightVideo || null,
      h2h: wantsH2h && fixture.h2h
        ? {
            ...fixture.h2h,
            summary: isZh ? getZhH2hSummary(fixture, teams) : fixture.h2h.summary
          }
        : null,
      homeTeamId: fixture.homeTeamId || "",
      id: fixture.id,
      kickoffLabel: formatKickoff(fixture.kickoffUtc, locale),
      penalties: fixture?.scoreDetails?.penalties || null,
      recap: isZh
        ? getStructuredZhRecap(fixture, teams, timeline)
        : Array.isArray(fixture.resultStoryBullets) ? fixture.resultStoryBullets.slice(0, 3) : [],
      score: fixture.score || null,
      stage: getStageLabel(fixture, locale),
      status: fixture.status,
      venue: fixture.venue || ""
    },
    followUps: followUps.slice(0, 3),
    kind: "match",
    lead,
    teams,
    timeline,
    winnerTeamId: isCompletedFixture(fixture) ? getFixtureWinnerId(fixture) : ""
  };
}

function getContextFixtureId(core) {
  const urlContext = getSelectedUrlContext();
  if (urlContext.fixtureId && core.fixtures.some((fixture) => fixture.id === urlContext.fixtureId)) {
    return urlContext.fixtureId;
  }
  return replyContext.fixtureId;
}

function getContextTeam(core) {
  const urlContext = getSelectedUrlContext();
  if (urlContext.teamQuery) {
    const urlTeams = findTeamsInQuestion(urlContext.teamQuery);
    if (urlTeams[0]) {
      return urlTeams[0];
    }
  }
  return core.teamsById.get(replyContext.teamId) || null;
}

function getWatchFixture(core, requestedTeams = []) {
  const contextFixtureId = getContextFixtureId(core);
  if (contextFixtureId) {
    const fixture = core.fixtures.find((candidate) => candidate.id === contextFixtureId);
    if (fixture) {
      return fixture;
    }
  }

  if (requestedTeams.length) {
    const teamIds = requestedTeams.map((team) => team.id);
    const relevant = core.fixtures.filter((fixture) =>
      teamIds.some((teamId) => [fixture.homeTeamId, fixture.awayTeamId].includes(teamId))
    );
    return (
      relevant
        .filter((fixture) => !isCompletedFixture(fixture))
        .sort((a, b) => getFixtureTime(a) - getFixtureTime(b))[0] ||
      sortFixturesLatestFirst(relevant)[0] ||
      null
    );
  }

  return core.fixtures
    .filter((fixture) => !isCompletedFixture(fixture) && fixture.homeTeamId && fixture.awayTeamId)
    .sort((a, b) => getFixtureTime(a) - getFixtureTime(b))[0] || null;
}

function buildWatchReply(core, playerIndex, requestedTeams = [], locale = "en") {
  const isZh = isZhLocale(locale);
  const fixture = getWatchFixture(core, requestedTeams);
  const rawFixtureTeams = fixture ? getFixtureTeams(fixture, core.teamsById) : { away: null, home: null };
  const fixtureTeams = {
    away: localizeTeam(rawFixtureTeams.away, locale),
    home: localizeTeam(rawFixtureTeams.home, locale)
  };
  const homePlayers = Array.isArray(fixture?.keyPlayers?.home) ? fixture.keyPlayers.home : [];
  const awayPlayers = Array.isArray(fixture?.keyPlayers?.away) ? fixture.keyPlayers.away : [];
  const requestedTeam = requestedTeams.length === 1 ? requestedTeams[0] : null;
  const requestedSide = requestedTeam?.id === fixture?.homeTeamId
    ? { players: homePlayers, team: fixtureTeams.home }
    : requestedTeam?.id === fixture?.awayTeamId
      ? { players: awayPlayers, team: fixtureTeams.away }
      : null;
  const ordered = requestedSide
    ? requestedSide.players.slice(0, 3).map((entry) => ({ entry, team: requestedSide.team }))
    : [
        { entry: homePlayers[0], team: fixtureTeams.home },
        { entry: awayPlayers[0], team: fixtureTeams.away },
        { entry: homePlayers[1], team: fixtureTeams.home },
        { entry: awayPlayers[1], team: fixtureTeams.away }
      ].filter((item) => item.entry);
  const players = ordered.slice(0, 3).map(({ entry, team }) => {
    const rawTeam = core.teamsById.get(team?.id) || team;
    const profile = getProfileByName(playerIndex, entry.name, rawTeam?.id);
    const localizedName = getLocalizedPlayerName(profile?.displayName || entry.name, locale);
    const localizedPosition = getLocalizedPosition(profile?.position || "Player", locale);
    return {
      note: isZh
        ? `${localizedName}的场上任务是通过${getLocalizedStyleLabel(profile?.skills?.[0] || "", locale) || "阅读比赛"}影响比赛。`
        : entry.note || profile?.note || "",
      profile: profile
        ? {
            displayName: localizedName,
            imageUrl: profile.imageUrl || "",
            position: localizedPosition
          }
        : {
            displayName: localizedName,
            imageUrl: "",
            position: isZh ? "球员" : "Player"
          },
      team
    };
  });

  const matchLabel = fixtureTeams.home && fixtureTeams.away
    ? isZh
      ? `${fixtureTeams.home.name}对${fixtureTeams.away.name}`
      : `${fixtureTeams.home.name} vs ${fixtureTeams.away.name}`
    : isZh ? "下一场比赛" : "the next match";
  return {
    fixtureId: fixture?.id || "",
    followUps: players
      .map((player) => isZh
        ? `介绍一下${player.profile.displayName}`
        : `Tell me about ${player.profile.displayName}`)
      .slice(0, 3),
    kind: "player-list",
    lead: requestedSide
      ? isZh
        ? `这三名${requestedSide.team.name}球员值得关注，依据是已载入比赛的关键球员资料。`
        : `These are three ${requestedSide.team.name} players to watch, based on the loaded key-player notes.`
      : isZh
        ? `这三名球员值得在${matchLabel}中重点关注，依据是本场比赛的关键球员资料。`
        : `These are three players to watch for ${matchLabel}, based on the fixture's key-player notes.`,
    players,
    title: isZh ? "值得关注的球员" : "Players to watch"
  };
}

function resolvePersonalityReply(question, locale = "en") {
  const entry = BALL_BOY_PERSONALITY_REPLIES.find((candidate) =>
    candidate.patterns.some((pattern) => pattern.test(question))
  );
  if (!entry) {
    return null;
  }

  const copy = isZhLocale(locale) ? ZH_PERSONALITY_COPY[entry.id] || entry : entry;
  return {
    badge: copy.badge,
    contextPlayerName: entry.contextPlayerName || "",
    contextTeamId: entry.contextTeamId || "",
    eye: entry.eye,
    followUps: copy.followUps,
    kind: "personality",
    label: copy.label,
    text: copy.text,
    topic: entry.id
  };
}

function getHelpReply(locale = "en") {
  if (isZhLocale(locale)) {
    return {
      categories: [
        { example: "姆巴佩有多少进球？", icon: "9", title: "球员" },
        { example: "阿根廷怎么踢？", icon: "🇦🇷", title: "国家队" },
        { example: "法国对西班牙谁赢了？", icon: "1–2", title: "比赛" },
        { example: "解释红牌", icon: "🟥", title: "规则" }
      ],
      followUps: ["介绍一下姆巴佩", "阿根廷怎么踢？", "法国对西班牙谁赢了？"],
      kind: "help",
      lead: "选一张卡片吧。这样我们都省点时间。"
    };
  }
  return {
    categories: [
      { example: "How many goals does Mbappe have?", icon: "9", title: "Players" },
      { example: "How do Argentina play?", icon: "🇦🇷", title: "Countries" },
      { example: "Who won France vs Spain?", icon: "1–2", title: "Matches" },
      { example: "Explain a red card", icon: "🟥", title: "Rules" }
    ],
    followUps: [
      "Tell me about Kylian Mbappe",
      "How do Argentina play?",
      "Who won France vs Spain?"
    ],
    kind: "help",
    lead: "Pick a card. It saves both of us time."
  };
}

function resolveRule(question, locale = "en") {
  if (containsPhrase(question, "offside")) {
    return { kind: "offside" };
  }
  for (const rule of RULE_CATALOG) {
    if (rule.keywords.some((keyword) => containsPhrase(question, keyword))) {
      const localized = isZhLocale(locale) ? ZH_RULE_COPY[rule.id] : null;
      return {
        kind: "rule",
        rule: localized ? { ...rule, ...localized } : rule
      };
    }
  }
  return null;
}

function isExplicitRuleQuestion(question, ruleReply) {
  if (!ruleReply) {
    return false;
  }
  const keywords = ruleReply.kind === "offside"
    ? ["offside"]
    : ruleReply.rule?.keywords || [];
  const simplified = question
    .replace(
      /^(?:please )?(?:can you )?(?:explain|what is|what are|what happens (?:after|with|in)|how does|how do|why is|why are|when is|when are|tell me about)\s+/,
      ""
    )
    .replace(/^(?:a|an|the|that)\s+/, "")
    .replace(/\s+(?:in football|in soccer)$/, "")
    .replace(/\s+(?:rule|work|works|mean|means|happen|happens|given|awarded|allowed)$/, "")
    .trim();
  return keywords.some((keyword) => simplified === normalizeBallBoyText(keyword));
}

function isTeamAggregateQuestion(question, teams) {
  return (
    teams.length === 1 &&
    /\b(how many (?:goals|wins|draws|losses|matches)|tournament record|this world cup|overall record|goal difference|top scorer|leading scorer|most goals|who scored most)\b/.test(question)
  );
}

function getClarificationReply(candidates, locale = "en") {
  const isZh = isZhLocale(locale);
  const prompts = candidates.slice(0, 3).map((profile) => {
    const team = teamsCache.find((candidate) => candidate.id === profile.teamId);
    const name = getLocalizedPlayerName(profile.displayName, locale);
    return isZh
      ? `介绍一下${name}${team ? `（${getLocalizedTeamName(team, locale)}）` : ""}`
      : `Tell me about ${profile.displayName}${team ? ` from ${team.name}` : ""}`;
  });
  return {
    kind: "clarify",
    lead: isZh
      ? "我找到了不止一名同名球员。名字很短，问题很大。"
      : "I found more than one player with that name. Tiny name, large problem.",
    options: candidates.slice(0, 3).map((profile) => ({
      name: getLocalizedPlayerName(profile.displayName, locale),
      team: localizeTeam(teamsCache.find((candidate) => candidate.id === profile.teamId) || null, locale)
    })),
    followUps: prompts
  };
}

function getUnknownReply(locale = "en") {
  if (isZhLocale(locale)) {
    return {
      followUps: ["介绍一下姆巴佩", "西班牙怎么踢？", "解释红牌"],
      kind: "unknown",
      text: "我暂时无法识别这个问题。可以换成一名球员、一支国家队、两支对阵球队或一条足球规则。"
    };
  }
  return {
    followUps: [
      "Tell me about Kylian Mbappe",
      "How do Spain play?",
      "Explain a red card"
    ],
    kind: "unknown",
    text: "I could not match that question. Try a player, a country, two teams, or a football rule."
  };
}

function rememberReply(reply, source = {}) {
  if (reply.kind === "player") {
    replyContext = {
      fixtureId: "",
      playerName: reply.profile.displayName,
      teamId: reply.team?.id || source.teamId || ""
    };
    return;
  }
  if (reply.kind === "country") {
    replyContext = { fixtureId: "", playerName: "", teamId: reply.team.id };
    return;
  }
  if (reply.kind === "match") {
    replyContext = {
      fixtureId: reply.fixture.id,
      playerName: "",
      teamId: source.teamId || ""
    };
    return;
  }
  if (reply.kind === "player-list") {
    replyContext = {
      fixtureId: reply.fixtureId || "",
      playerName: "",
      teamId: source.teamId || ""
    };
    return;
  }
  if (
    reply.kind === "personality" &&
    (reply.contextPlayerName || reply.contextTeamId)
  ) {
    replyContext = {
      fixtureId: "",
      playerName: reply.contextPlayerName || "",
      teamId: reply.contextTeamId || ""
    };
  }
}

export function rememberBallBoyReply(reply) {
  rememberReply(reply, { teamId: reply?.contextTeamId || "" });
}

export function resetBallBoyContext() {
  replyContext = { fixtureId: "", playerName: "", teamId: "" };
}

export async function getBallBoyReply(rawQuestion, options = {}) {
  const documentLocale = typeof document !== "undefined" ? document.documentElement?.lang : "en";
  const locale = normalizeBallBoyLocale(
    typeof options === "string" ? options : options?.locale || documentLocale
  );
  const question = normalizeBallBoyQuestion(rawQuestion);
  if (!question) {
    return getUnknownReply(locale);
  }

  const ruleReply = resolveRule(question, locale);
  if (isExplicitRuleQuestion(question, ruleReply)) {
    return ruleReply;
  }
  if (/\b(what can i ask|what can you do|what do you know|help|options|topics)\b/.test(question)) {
    return getHelpReply(locale);
  }

  const personalityReply = resolvePersonalityReply(question, locale);
  if (personalityReply) {
    return personalityReply;
  }

  const core = await loadCoreData();
  let teams = findTeamsInQuestion(question);
  const contextTeam = getContextTeam(core);
  const contextFixtureId = getContextFixtureId(core);
  const asksWhoToWatch = /\b(who should i watch|players to watch|who to watch|key players|best players)\b/.test(question);

  if (
    !teams.length &&
    contextTeam &&
    !contextFixtureId &&
    !replyContext.playerName &&
    isMatchQuestion(question)
  ) {
    teams = [contextTeam];
  }

  if (asksWhoToWatch) {
    const playerIndex = await loadProfiles();
    if (!teams.length && contextTeam) {
      teams = [contextTeam];
    }
    const reply = buildWatchReply(core, playerIndex, teams, locale);
    reply.contextTeamId = teams[0]?.id || contextTeam?.id || "";
    return reply;
  }

  if (
    teams.length >= 2 ||
    (teams.length === 1 && isMatchQuestion(question) && !isTeamAggregateQuestion(question, teams))
  ) {
    const fixture = resolveFixture(question, teams, core.fixtures, contextFixtureId);
    if (fixture) {
      const reply = buildMatchReply(fixture, core, question, locale);
      reply.contextTeamId = teams[0]?.id || "";
      return reply;
    }
  }

  if (
    !teams.length &&
    contextFixtureId &&
    (isMatchQuestion(question) || /\b(tell me more|more)\b/.test(question))
  ) {
    const fixture = core.fixtures.find((candidate) => candidate.id === contextFixtureId);
    if (fixture) {
      const reply = buildMatchReply(fixture, core, question, locale);
      return reply;
    }
  }

  const shouldResolvePlayer =
    !teams.length ||
    Boolean(replyContext.playerName) ||
    /\b(player|who is|tell me|more|goal|goals|assist|assists|club|league|competition|position|role|age|birthday|born|value|valuation|worth|number|shirt|jersey|style|playstyle|strength|skills)\b/.test(question);
  if (shouldResolvePlayer) {
    const playerIndex = await loadProfiles();
    let playerMatch = resolvePlayer(question, playerIndex, teams.map((team) => team.id));
    if (!playerMatch.profile && !playerMatch.candidates.length && teams.length) {
      playerMatch = resolvePlayer(question, playerIndex);
    }
    if (
      !playerMatch.profile &&
      !playerMatch.candidates.length &&
      !teams.length &&
      replyContext.playerName &&
      /\b(he|she|they|his|her|their|more|goal|goals|assist|assists|stats|style|play|club|league|competition|position|role|age|birthday|born|value|valuation|worth|number|shirt|jersey)\b/.test(question)
    ) {
      const profile = getProfileByName(playerIndex, replyContext.playerName, replyContext.teamId);
      playerMatch = { candidates: [], profile };
    }
    if (playerMatch.candidates.length) {
      return getClarificationReply(playerMatch.candidates, locale);
    }
    if (playerMatch.profile) {
      const team = core.teamsById.get(playerMatch.profile.teamId) || null;
      const reply = buildPlayerReply(playerMatch.profile, team, core.fixtures, question, locale);
      return reply;
    }
  }

  if (!teams.length && contextTeam && /\b(they|their|team|country|style|wins|record|next|last|more)\b/.test(question)) {
    teams = [contextTeam];
  }
  if (teams.length === 1) {
    const reply = buildCountryReply(teams[0], core, question, locale);
    return reply;
  }


  if (ruleReply) {
    return ruleReply;
  }

  return getUnknownReply(locale);
}
