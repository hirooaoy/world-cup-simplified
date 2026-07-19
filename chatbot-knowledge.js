import { ZH_CLUB_NAME_TRANSLATIONS, ZH_LEAGUE_NAME_TRANSLATIONS, ZH_PLAYER_NAME_TRANSLATIONS } from "./football-locale-zh.js?v=2026-07-18-locale-1";
import {
  LOCALE_PACK_VERSION,
  loadLocaleDomain,
  normalizeLanguage
} from "./locales/locale-runtime.js?v=2026-07-16-7";

const BALL_BOY_DATA_VERSION = "2026-07-16-ranking-year-1";
const BALL_BOY_DATA_URLS = {
  chatbotH2h: `data/chatbot-h2h.json?v=${BALL_BOY_DATA_VERSION}`,
  coachProfiles: `data/coach-profiles.json?v=${BALL_BOY_DATA_VERSION}`,
  fixtures: `data/fixtures.json?v=${BALL_BOY_DATA_VERSION}`,
  historicalPlayerIndex: `data/ball-boy-historical-players.json?v=${BALL_BOY_DATA_VERSION}`,
  historicalPlayerProfiles: `data/historical-player-profiles.json?v=${BALL_BOY_DATA_VERSION}`,
  liveData: `api/live-data?v=${BALL_BOY_DATA_VERSION}`,
  playerProfiles: `data/player-profiles.json?v=${BALL_BOY_DATA_VERSION}`,
  standings: `data/standings.json?v=${BALL_BOY_DATA_VERSION}`,
  teamStyleProfiles: `data/team-style-profiles.json?v=${BALL_BOY_DATA_VERSION}`,
  teams: `data/teams.json?v=${BALL_BOY_DATA_VERSION}`
};

const COMPLETED_MATCH_STATUSES = new Set(["FT", "AET", "PEN"]);
const COUNTABLE_PLAYER_STATUSES = new Set(["LIVE", "FT", "AET", "PEN"]);
const BALL_BOY_SHORTHAND = new Map([
  ["u", "you"],
  ["ur", "your"],
  ["wats", "what is"],
  ["whos", "who is"]
]);
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
    takeaway: "Five kicks each, then one kick each if the score is still level.",
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
    takeaway: "The team plays one player short.",
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
    takeaway: "Two yellow cards in one match mean a red card.",
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
    takeaway: "Contact with the hand or arm alone is not enough.",
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
      { title: "The setup", text: "The ball goes on the spot. When the ball is kicked, at least part of one of the goalkeeper’s feet must be touching, level with, or behind the goal line." },
      { title: "Everyone else", text: "Other players wait outside the penalty area and behind the ball." }
    ],
    takeaway: "The taker faces the goalkeeper from 11 metres.",
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
    takeaway: "VAR advises. The referee decides.",
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
    takeaway: "Extra time is two more 15-minute periods.",
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
    takeaway: "The board shows the minimum time to be added.",
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
      { title: "Goal difference", text: "Goals scored minus goals conceded. It is a common tiebreaker when points are level." },
      { title: "Then what?", text: "Competitions use a published tiebreak order if teams are still level." }
    ],
    takeaway: "Win 3 · Draw 1 · Loss 0",
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
    takeaway: "A substituted player cannot return in this competition.",
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
    takeaway: "双方先各罚5次；仍打平时，再各罚1次。"
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
    takeaway: "球队会少一名球员继续比赛。"
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
    takeaway: "同一场比赛两张黄牌等于一张红牌。"
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
    takeaway: "球碰到手或手臂，不代表一定犯规。"
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
      { title: "如何摆放", text: "球放在点球点。球被踢出时，门将至少要有一只脚的一部分接触球门线、与球门线齐平或位于球门线后方。" },
      { title: "其他球员", text: "其他球员要留在禁区外、点球点后方。" }
    ],
    takeaway: "主罚者在11米外面对门将。"
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
    takeaway: "VAR提供建议，最终由裁判决定。"
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
    takeaway: "加时赛由两个15分钟时段组成。"
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
    takeaway: "牌子显示的是最少补时时间。"
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
    takeaway: "胜3分 · 平1分 · 负0分"
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
    takeaway: "本赛事中，被换下的球员不能再次上场。"
  }
};

const BALL_BOY_PERSONALITY_REPLIES = [
  {
    id: "identity",
    patterns: [
      /^(?:who|what) are you(?: really)?$/,
      /^who r you$/,
      /^(?:are you )?just (?:a )?ball boy$/,
      /^(?:tell me about|introduce) yourself$/
    ],
    label: "About me",
    text: "I’m Ball Boy. I make football easier to understand.",
    eye: "double-blink"
  },
  {
    id: "life",
    patterns: [
      /^(?:what is|what s|whats) life$/,
      /^(?:what is|what s|whats) the meaning of life$/,
      /^why are we here$/
    ],
    label: "Philosophy",
    text: "No idea.",
    eye: "side-glance"
  },
  {
    id: "football",
    patterns: [
      /^(?:what is|what s|whats) football$/,
      /^define football$/
    ],
    label: "Football",
    text: "Two teams try to score more goals than each other. Most matches last 90 minutes.",
    eye: "wide"
  },
  {
    id: "football-special",
    patterns: [/^why is football special$/],
    label: "Football",
    text: "It is simple to start and difficult to master.",
    eye: "wide"
  },
  {
    id: "reality",
    patterns: [
      /^(?:are you|r you) real$/,
      /^are you (?:a )?(?:real person|bot|chatbot|ai)$/,
      /^do you (?:really )?exist$/
    ],
    label: "Reality check",
    text: "I’m a chatbot.",
    eye: "double-blink"
  },
  {
    id: "soccer",
    patterns: [
      /^(?:what is|what s|whats) soccer$/,
      /^soccer$/,
      /^is it soccer or football$/
    ],
    label: "Terminology",
    text: "You mean football.",
    eye: "amused"
  },
  {
    id: "soccer-etymology",
    patterns: [
      /^why (?:do )?(?:people|americans) (?:say|call it) soccer$/,
      /^why is (?:it|football) called soccer$/,
      /^where does (?:the word )?soccer come from$/
    ],
    label: "Terminology",
    text: "“Soccer” comes from “association football.”",
    eye: "double-blink"
  },
  {
    id: "best-player",
    patterns: [
      /^(?:who is|who s|whos) (?:the )?(?:best|goat)$/,
      /^(?:who is|who s|whos) (?:the )?best (?:player|footballer)(?: in the world| right now| in football)?$/,
      /^(?:the )?(?:best (?:player|footballer)|goat)$/
    ],
    label: "Best player",
    text: "Depends. Right now, this tournament, or all time?",
    eye: "double-blink"
  },
  {
    id: "best-country",
    patterns: [
      /^(?:which|what) (?:country|national team) is (?:the )?best(?: in football| at football| in the world)?$/,
      /^(?:the )?best (?:country|national team)$/
    ],
    label: "Best country",
    text: "Depends. Current form, trophies, or this World Cup?",
    eye: "double-blink"
  },
  {
    id: "haaland-denial",
    patterns: [
      /^(?:are you|r you) (?:erling )?haaland(?: really)?$/,
      /^(?:you are|you re) (?:erling )?haaland$/
    ],
    label: "Wrong person",
    text: "No.",
    eye: "double-blink"
  },
  {
    id: "greeting",
    patterns: [
      /^(?:hi|hello|hey|hei)(?: ball boy)?$/,
      /^(?:good morning|good afternoon|good evening)(?: ball boy)?$/
    ],
    label: "Ball Boy",
    text: "Hi. Ask away.",
    eye: "wide"
  },
  {
    id: "mood",
    patterns: [
      /^how are you$/,
      /^(?:how is|how s|hows) it going$/,
      /^you good$/
    ],
    label: "Ball Boy",
    text: "Good.",
    eye: "double-blink"
  },
  {
    id: "thanks",
    patterns: [
      /^(?:thanks|thank you|cheers|nice one)(?: ball boy)?$/
    ],
    label: "Ball Boy",
    text: "Anytime.",
    eye: "pleased"
  },
  {
    id: "joke",
    patterns: [
      /^(?:tell me a joke|make me laugh|football joke)$/
    ],
    label: "Ball Boy",
    text: "No good ones.",
    eye: "amused"
  }
];

const ZH_PERSONALITY_COPY = {
  identity: {
    label: "自我介绍",
    text: "我是球童。我把足球讲明白。"
  },
  life: {
    label: "球童",
    text: "不知道。"
  },
  football: {
    label: "足球",
    text: "两支球队争取比对方进更多球。大多数比赛踢90分钟。"
  },
  "football-special": {
    label: "足球",
    text: "入门很简单，踢好很难。"
  },
  reality: {
    label: "球童",
    text: "我是聊天机器人。"
  },
  soccer: {
    label: "用词",
    text: "你是说足球。"
  },
  "soccer-etymology": {
    label: "用词",
    text: "“Soccer”一词来自“association football”。"
  },
  "best-player": {
    label: "最佳球员",
    text: "看你问的是现在、本届赛事，还是历史最佳。"
  },
  "best-country": {
    label: "最佳国家队",
    text: "看你比较的是近期状态、冠军数量，还是本届世界杯。"
  },
  "haaland-denial": {
    label: "球童",
    text: "不是。"
  },
  greeting: {
    label: "球童",
    text: "你好。问吧。"
  },
  mood: {
    label: "球童",
    text: "挺好。"
  },
  thanks: {
    label: "球童",
    text: "不客气。"
  },
  joke: {
    label: "球童",
    text: "没有好笑的。"
  }
};

let teamsPromise = null;
let fixturesPromise = null;
let chatbotH2hPromise = null;
let coachProfilesPromise = null;
let standingsPromise = null;
let teamStyleProfilesPromise = null;
let profilesPromise = null;
let historicalPlayerIndexPromise = null;
let historicalPlayerProfilesPromise = null;
let teamsCache = [];
let fixturesCache = [];
let chatbotH2hCache = {};
let coachProfilesCache = [];
let standingsCache = {};
let teamStyleProfilesCache = {};
let teamAliasEntries = [];
let playerIndexCache = null;
let historicalPlayerIndexCache = null;
let historicalPlayerProfilesCache = {};
let profilesDataCache = {};
let liveRefreshPromise = null;
const localePackPromises = new Map();
const localePacks = new Map();
const localePlayerNameLoaders = Object.freeze({
  es: {
    archive: () =>
      import(`./locales/es/player-names-archive.js?v=${LOCALE_PACK_VERSION}`),
    current: () => import(`./locales/es/player-names.js?v=${LOCALE_PACK_VERSION}`)
  },
  ko: {
    archive: () =>
      import(`./locales/ko/player-names-archive.js?v=${LOCALE_PACK_VERSION}`),
    current: () => import(`./locales/ko/player-names.js?v=${LOCALE_PACK_VERSION}`)
  }
});
const localeCurrentContentLoaders = Object.freeze({
  es: () => import(`./locales/es/content-current.js?v=${LOCALE_PACK_VERSION}`),
  ko: () => import(`./locales/ko/content-current.js?v=${LOCALE_PACK_VERSION}`)
});
const localePlayerNamePromises = new Map();
const localePlayerNameMaps = new Map();
const localePlayerNameLookupMaps = new Map();
const localeCurrentEntityTranslations = new Map();
let replyContext = {
  fixtureId: "",
  historicalPlayerId: "",
  playerName: "",
  teamId: "",
  teamIds: [],
  tournamentYears: []
};

export function normalizeBallBoyText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .normalize("NFC")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

export function normalizeBallBoyLocale(value) {
  return normalizeLanguage(value);
}

function getLocalePlayerNameState(store, locale) {
  const normalized = normalizeBallBoyLocale(locale);
  if (!store.has(normalized)) {
    store.set(normalized, {});
  }
  return store.get(normalized);
}

function getLocalePlayerNameTranslations(module, locale, scope) {
  const code = locale.toUpperCase();
  const exportName = `${code}_${scope === "archive" ? "ARCHIVE_" : ""}PLAYER_NAME_TRANSLATIONS`;
  const translations = module?.[exportName];
  if (
    !translations ||
    typeof translations !== "object" ||
    Array.isArray(translations) ||
    !Object.keys(translations).length
  ) {
    throw new TypeError(`Invalid Ball Boy player-name module: ${locale}/${scope}`);
  }
  return translations;
}

function getLocaleCurrentContentTranslations(module, locale) {
  const metadata = module?.CONTENT_METADATA;
  const translations = module?.CONTENT_TRANSLATIONS;
  const structuredTranslations = module?.CONTENT_ENTITIES?.structuredTranslations;
  if (
    metadata?.schemaVersion !== 1 ||
    metadata?.language !== locale ||
    metadata?.scope !== "current" ||
    !translations ||
    typeof translations !== "object" ||
    Array.isArray(translations) ||
    !Object.keys(translations).length ||
    !structuredTranslations ||
    typeof structuredTranslations !== "object" ||
    Array.isArray(structuredTranslations)
  ) {
    throw new TypeError(`Invalid Ball Boy current-content module: ${locale}`);
  }
  return Object.freeze({
    ...structuredTranslations,
    ...translations
  });
}

function rebuildPlayerIndexForNameScope(scope) {
  if (scope === "current" && Object.keys(profilesDataCache).length) {
    playerIndexCache = buildPlayerIndex(profilesDataCache);
    profilesPromise = Promise.resolve(playerIndexCache);
  }
  if (scope === "archive" && historicalPlayerIndexCache?.profiles?.length) {
    historicalPlayerIndexCache = buildHistoricalPlayerIndex(
      historicalPlayerIndexCache.profiles
    );
    historicalPlayerIndexPromise = Promise.resolve(historicalPlayerIndexCache);
  }
}

async function ensureBallBoyPlayerNames(locale, scope = "current") {
  const normalized = normalizeBallBoyLocale(locale);
  if (["en", "zh"].includes(normalized)) {
    return null;
  }
  const normalizedScope = scope === "archive" ? "archive" : "current";
  const namesByScope = getLocalePlayerNameState(localePlayerNameMaps, normalized);
  if (namesByScope[normalizedScope]) {
    return namesByScope[normalizedScope];
  }

  const loader = localePlayerNameLoaders[normalized]?.[normalizedScope];
  if (!loader) {
    return null;
  }
  const requestKey = `${normalized}:${normalizedScope}`;
  if (!localePlayerNamePromises.has(requestKey)) {
    localePlayerNamePromises.set(
      requestKey,
      Promise.all([
        loader(),
        normalizedScope === "current"
          ? localeCurrentContentLoaders[normalized]?.()
          : Promise.resolve(null)
      ])
        .then(([module, currentContentModule]) => {
          const names = Object.freeze(
            getLocalePlayerNameTranslations(module, normalized, normalizedScope)
          );
          const lookup = new Map();
          Object.entries(names).forEach(([sourceName, localizedName]) => {
            const key = normalizeBallBoyText(sourceName);
            if (key && localizedName && !lookup.has(key)) {
              lookup.set(key, localizedName);
            }
          });
          getLocalePlayerNameState(localePlayerNameMaps, normalized)[normalizedScope] = names;
          getLocalePlayerNameState(localePlayerNameLookupMaps, normalized)[normalizedScope] = lookup;
          if (currentContentModule) {
            localeCurrentEntityTranslations.set(
              normalized,
              getLocaleCurrentContentTranslations(currentContentModule, normalized)
            );
          }
          rebuildPlayerIndexForNameScope(normalizedScope);
          return names;
        })
        .catch((error) => {
          localePlayerNamePromises.delete(requestKey);
          throw error;
        })
    );
  }
  return localePlayerNamePromises.get(requestKey);
}

async function ensureBallBoyLocalePack(locale) {
  const normalized = normalizeBallBoyLocale(locale);
  if (["en", "zh"].includes(normalized)) {
    return null;
  }
  if (!localePackPromises.has(normalized)) {
    localePackPromises.set(
      normalized,
      loadLocaleDomain(normalized, "chatbot").then((pack) => {
        if (pack) {
          localePacks.set(normalized, pack);
          if (teamsCache.length) {
            teamAliasEntries = buildTeamAliasEntries(teamsCache);
          }
        }
        return pack;
      })
    );
  }
  return localePackPromises.get(normalized);
}

function getLocaleKnowledge(locale) {
  return localePacks.get(normalizeBallBoyLocale(locale))?.knowledge || null;
}

function getLocaleTemplates(locale) {
  return getLocaleKnowledge(locale)?.templates || null;
}

function getIntlLocale(locale) {
  return { en: "en-US", es: "es-419", ko: "ko-KR", zh: "zh-CN" }[normalizeBallBoyLocale(locale)] || "en-US";
}

function isZhLocale(locale) {
  return normalizeBallBoyLocale(locale) === "zh";
}

function getLocalizedTeamName(team, locale) {
  if (isZhLocale(locale)) {
    return ZH_TEAM_NAMES[team?.id] || team?.name || "球队";
  }
  const knowledge = getLocaleKnowledge(locale);
  return knowledge?.teamNames?.[team?.id] || team?.name || knowledge?.templates?.fallbackTeam || "Team";
}

function getLocalizedPlayerName(value, locale, scope = "current") {
  const name = String(value || "").trim();
  if (!name) {
    return name;
  }
  const normalized = normalizeBallBoyText(name);
  const normalizedLocale = normalizeBallBoyLocale(locale);
  const scopeOrder = scope === "archive" ? ["archive", "current"] : ["current"];
  const namesByScope = localePlayerNameMaps.get(normalizedLocale) || {};
  const lookupsByScope = localePlayerNameLookupMaps.get(normalizedLocale) || {};
  for (const candidateScope of scopeOrder) {
    const sharedDirect = namesByScope[candidateScope]?.[name];
    if (sharedDirect) {
      return sharedDirect;
    }
    const sharedMatch = lookupsByScope[candidateScope]?.get(normalized);
    if (sharedMatch) {
      return sharedMatch;
    }
  }
  const knowledge = getLocaleKnowledge(locale);
  if (knowledge) {
    const direct = knowledge.playerNames?.[name];
    if (direct) return direct;
    const matchingEntry = Object.entries(knowledge.playerNames || {}).find(
      ([candidate]) => normalizeBallBoyText(candidate) === normalized
    );
    return matchingEntry?.[1] || name;
  }
  if (!isZhLocale(locale)) return name;
  const direct = ZH_PLAYER_NAMES[name];
  if (direct) {
    return direct;
  }
  const matchingEntry = Object.entries(ZH_PLAYER_NAMES).find(
    ([candidate]) => normalizeBallBoyText(candidate) === normalized
  );
  return matchingEntry?.[1] || name;
}

function getLocalizedCoachName(value, locale) {
  const name = String(value || "").trim();
  if (!name) {
    return name;
  }
  const normalized = normalizeBallBoyText(name);
  const normalizedLocale = normalizeBallBoyLocale(locale);
  const currentNames = localePlayerNameMaps.get(normalizedLocale)?.current;
  const sharedDirect = currentNames?.[name];
  if (sharedDirect) {
    return sharedDirect;
  }
  const sharedMatch = localePlayerNameLookupMaps
    .get(normalizedLocale)
    ?.current?.get(normalized);
  if (sharedMatch) {
    return sharedMatch;
  }
  const knowledge = getLocaleKnowledge(locale);
  const direct = knowledge?.coachNames?.[name];
  if (direct) return direct;
  const matchingEntry = Object.entries(knowledge?.coachNames || {}).find(
    ([candidate]) => normalizeBallBoyText(candidate) === normalized
  );
  return matchingEntry?.[1] || name;
}

function getLocalizedClubName(value, locale) {
  const name = String(value || "").trim();
  if (!name) {
    return name;
  }
  const normalizedLocale = normalizeBallBoyLocale(locale);
  const knowledge = getLocaleKnowledge(locale);
  if (knowledge) {
    if (knowledge.clubs?.[name]) return knowledge.clubs[name];
    const loan = name.match(/^(.+?)\s*\((?:on\s+)?loan(?:\s+from)?\s+(.+?)\)$/i);
    if (loan) {
      const sharedLoanTranslation = localeCurrentEntityTranslations
        .get(normalizedLocale)?.[name];
      if (
        normalizedLocale === "ko" &&
        /\p{Script=Hangul}/u.test(sharedLoanTranslation || "")
      ) {
        return sharedLoanTranslation
          .replace(/\s+\(/gu, "(")
          .replace(/에서\s*대출|에서\s*빌려서|로부터\s*대출|에\s*대출/gu, "에서 임대");
      }
      const parents = loan[2]
        .split(/,\s*/)
        .map((club) => getLocalizedClubName(club, locale))
        .join(", ");
      return knowledge.templates?.loanClub?.(
        getLocalizedClubName(loan[1], locale),
        parents
      ) || name;
    }
    if (normalizedLocale === "es") {
      return name;
    }
    const sharedTranslation = localeCurrentEntityTranslations.get(normalizedLocale)?.[name];
    if (sharedTranslation) {
      return sharedTranslation;
    }
    return name;
  }
  if (!isZhLocale(locale)) return name;
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
  if (!name) {
    return name;
  }
  const knowledge = getLocaleKnowledge(locale);
  if (knowledge) {
    if (knowledge.leagues?.[name]) return knowledge.leagues[name];
    const lastClub = name.match(/^Last club:\s*(.+)$/i);
    if (lastClub) {
      return knowledge.templates?.lastClub?.(
        getLocalizedClubName(lastClub[1], locale)
      ) || name;
    }
    return localeCurrentEntityTranslations
      .get(normalizeBallBoyLocale(locale))?.[name] || name;
  }
  if (!isZhLocale(locale)) return name;
  if (ZH_LEAGUE_NAMES[name]) {
    return ZH_LEAGUE_NAMES[name];
  }
  const lastClub = name.match(/^Last club:\s*(.+)$/i);
  return lastClub ? `上家俱乐部：${getLocalizedClubName(lastClub[1], locale)}` : name;
}

function getLocalizedPosition(value, locale) {
  const position = formatPlayerPosition(value);
  const knowledge = getLocaleKnowledge(locale);
  if (!isZhLocale(locale) && !knowledge) {
    return position;
  }
  const translatePart = (part) => {
    const key = normalizeBallBoyText(part);
    if (knowledge?.positions?.[key]) return knowledge.positions[key];
    if (knowledge) {
      const code = normalizeBallBoyLocale(locale);
      if (/goalkeeper|keeper/.test(key)) return code === "ko" ? "골키퍼" : "portero";
      if (/centre back|center back/.test(key)) return code === "ko" ? "센터백" : "defensa central";
      if (/left back/.test(key)) return code === "ko" ? "왼쪽 풀백" : "lateral izquierdo";
      if (/right back/.test(key)) return code === "ko" ? "오른쪽 풀백" : "lateral derecho";
      if (/back|defender|defence|defense/.test(key)) return code === "ko" ? "수비수" : "defensa";
      if (/defensive midfield/.test(key)) return code === "ko" ? "수비형 미드필더" : "mediocentro defensivo";
      if (/attacking midfield/.test(key)) return code === "ko" ? "공격형 미드필더" : "mediapunta";
      if (/midfield/.test(key)) return code === "ko" ? "미드필더" : "centrocampista";
      if (/left wing/.test(key)) return code === "ko" ? "왼쪽 윙어" : "extremo izquierdo";
      if (/right wing/.test(key)) return code === "ko" ? "오른쪽 윙어" : "extremo derecho";
      if (/wing/.test(key)) return code === "ko" ? "윙어" : "extremo";
      if (/centre forward|center forward|striker/.test(key)) return code === "ko" ? "최전방 공격수" : "delantero centro";
      if (/forward|attack/.test(key)) return code === "ko" ? "공격수" : "delantero";
      return code === "ko" ? "선수" : "jugador";
    }
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

function getPlayerPositionLabel(value, locale = "en") {
  const normalized = normalizeBallBoyText(value);
  if (normalized && !["player", "unknown", "unavailable"].includes(normalized)) {
    return getLocalizedPosition(value, locale);
  }
  if (isZhLocale(locale)) return "位置未细分";
  if (normalizeBallBoyLocale(locale) === "es") return "Posición no disponible";
  if (normalizeBallBoyLocale(locale) === "ko") return "세부 포지션 정보 없음";
  return "Position unavailable";
}

function getLocalizedStyleLabel(value, locale) {
  const text = String(value || "").trim();
  if (!text) {
    return text;
  }
  const key = normalizeBallBoyText(text);
  const knowledge = getLocaleKnowledge(locale);
  if (knowledge) {
    if (knowledge.styles?.[key]) return knowledge.styles[key];
    const ko = normalizeBallBoyLocale(locale) === "ko";
    if (/counter attack/.test(key)) return ko ? "역습" : "contraataque";
    if (/counter press/.test(key)) return ko ? "즉시 압박" : "presión tras pérdida";
    if (/defensive organization/.test(key)) return ko ? "수비 조직력" : "organización defensiva";
    if (/attacking structure/.test(key)) return ko ? "공격 전개 구조" : "estructura ofensiva";
    if (/possession control/.test(key)) return ko ? "점유율 관리" : "control de la posesión";
    if (/positional discipline/.test(key)) return ko ? "위치 규율" : "disciplina posicional";
    if (/direct transition/.test(key)) return ko ? "빠른 공수 전환" : "transiciones directas";
    if (/wing overload/.test(key)) return ko ? "측면 수적 우위" : "superioridades en banda";
    if (/youth pipeline/.test(key)) return ko ? "유소년 연계" : "integración de jóvenes";
    if (/save|stopping|goalkeeper|keeper|cross handling/.test(key)) return ko ? "골키퍼 대응" : "acciones de portero";
    if (/defend|defensive|cover|clearance|duel|screen/.test(key)) return ko ? "수비 보호" : "protección defensiva";
    if (/pass|delivery|service|distribution/.test(key)) return ko ? "전진 패스" : "pase vertical";
    if (/finish|shoot|goal|box movement/.test(key)) return ko ? "공격 마무리" : "definición";
    if (/press/.test(key)) return ko ? "적극적인 압박" : "presión intensa";
    if (/run|speed|pace|acceleration|carry|dribbl/.test(key)) return ko ? "돌파와 움직임" : "conducción y desmarque";
    if (/set piece/.test(key)) return ko ? "세트피스" : "balón parado";
    return ko ? "경기 이해" : "lectura del juego";
  }
  if (!isZhLocale(locale)) return text;
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
  if (!team || (!isZhLocale(locale) && !getLocaleKnowledge(locale))) {
    return team;
  }
  return {
    ...team,
    name: getLocalizedTeamName(team, locale),
    officialName: getLocalizedTeamName(team, locale),
    styleTags: (team.styleTags || []).map((tag) => getLocalizedStyleLabel(tag, locale))
  };
}

function canonicalizeLocalizedQuestion(value, locale = "en") {
  const normalized = normalizeBallBoyText(value);
  const localeIntents = getLocaleKnowledge(locale)?.intents;
  if (localeIntents) {
    const intentText = normalizeBallBoyLocale(locale) === "ko"
      ? normalized.replace(/([\p{Letter}\p{Number}]+?)(?:은|는|이|가|을|를|의|에서|에게|와|과|도)(?=\s|$)/gu, "$1 ").replace(/\s+/g, " ").trim()
      : normalized;
    for (const [pattern, replacement] of localeIntents.exact || []) {
      if (pattern.test(normalized) || pattern.test(intentText)) {
        return replacement;
      }
    }
    let canonical = ` ${intentText} `;
    for (const [pattern, replacement] of localeIntents.replacements || []) {
      canonical = canonical.replace(pattern, replacement);
    }
    return normalizeBallBoyText(canonical);
  }
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
    [/^足球为什么(?:这么)?特别$/, "why is football special"],
    [/^(?:你|您)是真的吗$/, "are you real"],
    [/^(?:你|您)是真人吗$/, "are you a real person"],
    [/^(?:你|您)是(?:机器人|聊天机器人|ai)吗$/, "are you a chatbot"],
    [/^什么是soccer$/, "what is soccer"],
    [/^soccer是什么$/, "what is soccer"],
    [/^为什么叫soccer$/, "why do people call it soccer"],
    [/^soccer为什么(?:这么)?叫$/, "why is it called soccer"],
    [/^soccer这个词从哪(?:里)?来$/, "where does the word soccer come from"],
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
    [/下一场对谁|下一场对阵谁|下一场比赛|下一场的对手|下一个对手|接下来踢谁|接下来对谁|下场踢谁|下场对手/g, " next match "],
    [/上一场比赛|最近一场比赛|上场比赛/g, " last match "],
    [/是谁进球|谁进了球|进球的是谁/g, " who scored "],
    [/谁赢了|谁获胜|比赛结果/g, " who won result "],
    [/谁会赢|谁能赢|哪支队会赢|哪个国家会赢|预测谁赢/g, " who would win "],
    [/上次交手|上一次交手|最近一次交手|最近交手/g, " last meeting "],
    [/有没有赢过|是否赢过|赢过/g, " beaten "],
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

function normalizeBallBoyQuestion(value, locale = "en") {
  return canonicalizeLocalizedQuestion(value, locale)
    .split(" ")
    .flatMap((token) => (BALL_BOY_SHORTHAND.get(token) || token).split(" "))
    .join(" ");
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
  const loadedTeamNames = [...localePacks.values()]
    .map((pack) => pack?.knowledge?.teamNames || {});
  for (const team of teams) {
    const aliases = new Set([
      team.id,
      team.name,
      team.officialName,
      ZH_TEAM_NAMES[team.id],
      ...loadedTeamNames.map((names) => names[team.id]),
      ...(EXTRA_TEAM_ALIASES[team.id] || [])
    ]);
    for (const alias of aliases) {
      const key = normalizeBallBoyText(alias);
      if (key && !["can", "us"].includes(key)) {
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
      const fifaRankingYear = Number(data?.rankingYear);
      teamsCache = Array.isArray(data?.teams)
        ? data.teams.map((team) => ({
            ...team,
            fifaRankingYear: Number.isInteger(fifaRankingYear) ? fifaRankingYear : null
          }))
        : [];
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

async function loadChatbotH2h() {
  if (!chatbotH2hPromise) {
    chatbotH2hPromise = loadJson(BALL_BOY_DATA_URLS.chatbotH2h, { pairs: {} }).then((data) => {
      chatbotH2hCache = data?.pairs && typeof data.pairs === "object" ? data.pairs : {};
      return chatbotH2hCache;
    });
  }
  return chatbotH2hPromise;
}

async function loadCoachProfiles() {
  if (!coachProfilesPromise) {
    coachProfilesPromise = loadJson(BALL_BOY_DATA_URLS.coachProfiles, { profiles: {} }).then((data) => {
      coachProfilesCache = Object.values(data?.profiles || {}).filter((profile) => profile?.teamId && profile?.name);
      return coachProfilesCache;
    });
  }
  return coachProfilesPromise;
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

async function loadTeamStyleProfiles() {
  if (!teamStyleProfilesPromise) {
    teamStyleProfilesPromise = loadJson(BALL_BOY_DATA_URLS.teamStyleProfiles, { profiles: {} }).then((data) => {
      teamStyleProfilesCache = data?.profiles && typeof data.profiles === "object" ? data.profiles : {};
      return teamStyleProfilesCache;
    });
  }
  return teamStyleProfilesPromise;
}

function getProfileAliases(profile) {
  return [
    profile?.name,
    profile?.displayName,
    ...(Array.isArray(profile?.aliases) ? profile.aliases : [])
  ].filter(Boolean);
}

function getLocalizedProfileAliases(profile, scope = "current") {
  const canonicalName = profile?.displayName || profile?.name || "";
  const localizedName = getLocalizedPlayerName(canonicalName, "zh");
  const manualAliases = Object.entries(ZH_PLAYER_NAME_ALIASES)
    .filter(([, candidate]) =>
      normalizeBallBoyText(candidate) === normalizeBallBoyText(canonicalName)
    )
    .map(([alias]) => alias);
  const localeAliases = [...localePacks.values()].flatMap((pack) => {
    const knowledge = pack?.knowledge || {};
    const localized = knowledge.playerNames?.[canonicalName];
    const manual = Object.entries(knowledge.playerAliases || {})
      .filter(([, candidate]) => normalizeBallBoyText(candidate) === normalizeBallBoyText(canonicalName))
      .map(([alias]) => alias);
    return [localized, ...manual].filter(Boolean);
  });
  const sharedLocaleAliases = [...localePlayerNameLookupMaps.values()]
    .map((lookupsByScope) =>
      lookupsByScope?.[scope]?.get(normalizeBallBoyText(canonicalName))
    )
    .filter(Boolean);
  return uniqueBy(
    [
      ...getProfileAliases(profile),
      localizedName,
      ...manualAliases,
      ...localeAliases,
      ...sharedLocaleAliases
    ],
    normalizeBallBoyText
  );
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
    for (const alias of getLocalizedProfileAliases(profile, "current")) {
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

function buildHistoricalPlayerIndex(players = []) {
  const profiles = players.map((profile) => ({
    ...profile,
    displayName: profile?.displayName || profile?.name || "",
    historical: true,
    name: profile?.name || profile?.displayName || ""
  }));
  const aliasOwners = new Map();

  for (const profile of profiles) {
    for (const alias of getLocalizedProfileAliases(profile, "archive")) {
      const key = normalizeBallBoyText(alias);
      if (!key || (key.length < 3 && !/[\p{Script=Han}]/u.test(key))) {
        continue;
      }
      const owners = aliasOwners.get(key) || [];
      owners.push(profile);
      aliasOwners.set(key, owners);
    }
  }

  const aliases = [...aliasOwners.entries()]
    .map(([key, owners]) => ({
      key,
      profiles: uniqueBy(owners, (profile) => profile.id)
    }))
    .sort((left, right) => right.key.length - left.key.length);
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  return { aliases, byId, profiles };
}

async function loadProfiles() {
  if (!profilesPromise) {
    profilesPromise = loadJson(BALL_BOY_DATA_URLS.playerProfiles, { profiles: {} }).then((data) => {
      profilesDataCache = data?.profiles || {};
      playerIndexCache = buildPlayerIndex(profilesDataCache);
      return playerIndexCache;
    });
  }
  return profilesPromise;
}

async function loadHistoricalPlayerIndex() {
  if (!historicalPlayerIndexPromise) {
    historicalPlayerIndexPromise = loadJson(
      BALL_BOY_DATA_URLS.historicalPlayerIndex,
      { players: [] }
    ).then((data) => {
      historicalPlayerIndexCache = buildHistoricalPlayerIndex(
        Array.isArray(data?.players) ? data.players : []
      );
      return historicalPlayerIndexCache;
    });
  }
  return historicalPlayerIndexPromise;
}

async function loadHistoricalPlayerProfiles() {
  if (!historicalPlayerProfilesPromise) {
    historicalPlayerProfilesPromise = loadJson(
      BALL_BOY_DATA_URLS.historicalPlayerProfiles,
      { profiles: {} }
    ).then((data) => {
      historicalPlayerProfilesCache = data?.profiles || {};
      return historicalPlayerProfilesCache;
    });
  }
  return historicalPlayerProfilesPromise;
}

async function loadCoreData() {
  const [teams, fixtures, standings, chatbotH2h, teamStyleProfiles] = await Promise.all([
    loadTeams(),
    loadFixtures(),
    loadStandings(),
    loadChatbotH2h(),
    loadTeamStyleProfiles()
  ]);
  await refreshFixturesFromLiveData();
  return {
    fixtures: fixturesCache.length ? fixturesCache : fixtures,
    chatbotH2h: Object.keys(chatbotH2hCache).length ? chatbotH2hCache : chatbotH2h,
    standings: Object.keys(standingsCache).length ? standingsCache : standings,
    teamStyleProfiles: Object.keys(teamStyleProfilesCache).length
      ? teamStyleProfilesCache
      : teamStyleProfiles,
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
    if (containsPhrase(normalized, entry.key) && !matches.some((match) => match.team.id === entry.team.id)) {
      matches.push({
        index: normalized.indexOf(entry.key),
        team: entry.team
      });
    }
  }
  return matches
    .sort((left, right) => left.index - right.index)
    .map((match) => match.team);
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

function getRequestedTournamentYears(question) {
  return uniqueBy(
    (String(question || "").match(/\b(?:19|20)\d{2}\b/g) || [])
      .map(Number)
      .filter((year) => year >= 1930 && year <= 2026),
    String
  );
}

function getPlayerSearchTerm(question, teams = []) {
  let normalized = normalizeBallBoyText(question);
  for (const team of teams) {
    for (const name of [team?.name, team?.officialName, team?.id]) {
      const key = normalizeBallBoyText(name);
      if (key) {
        normalized = ` ${normalized} `.replace(` ${key} `, " ").trim();
      }
    }
  }
  const ignored = new Set([
    "a",
    "about",
    "an",
    "and",
    "at",
    "cup",
    "cups",
    "footballer",
    "for",
    "from",
    "in",
    "is",
    "me",
    "of",
    "player",
    "the",
    "tell",
    "who",
    "world"
  ]);
  return normalized
    .split(" ")
    .filter((token) => token && !ignored.has(token) && !/^(?:19|20)\d{2}$/.test(token))
    .join(" ")
    .trim();
}

function getPartialPlayerMatchScore(profile, searchTerm, scope = "current") {
  const query = normalizeBallBoyText(searchTerm);
  if (query.length < 3) {
    return null;
  }
  const queryTokens = query.split(" ").filter(Boolean);
  let best = null;
  for (const alias of getLocalizedProfileAliases(profile, scope)) {
    const candidate = normalizeBallBoyText(alias);
    const candidateTokens = candidate.split(" ").filter(Boolean);
    let score = null;
    if (candidate === query) {
      score = 0;
    } else if (candidate.startsWith(`${query} `)) {
      score = 1;
    } else if (candidate.startsWith(query)) {
      score = 2;
    } else if (
      queryTokens.length > 1 &&
      queryTokens.every((token, index) => candidateTokens[index]?.startsWith(token))
    ) {
      score = 3;
    } else if (
      queryTokens.length === 1 &&
      candidateTokens.some((token) => token === query)
    ) {
      score = 4;
    } else if (
      queryTokens.length === 1 &&
      query.length >= 4 &&
      candidateTokens.some((token) => token.startsWith(query))
    ) {
      score = 5;
    }
    if (score !== null && (best === null || score < best)) {
      best = score;
    }
  }
  return best;
}

function findPartialPlayerCandidates(playerIndex, searchTerm, options = {}) {
  const {
    historical = false,
    teamIds = [],
    teamNames = [],
    tournamentYears = []
  } = options;
  const normalizedTeams = teamNames.map(normalizeBallBoyText).filter(Boolean);
  return playerIndex.profiles
    .filter((profile) => {
      if (!historical && teamIds.length && !teamIds.includes(profile.teamId)) {
        return false;
      }
      if (
        historical &&
        normalizedTeams.length &&
        !normalizedTeams.includes(normalizeBallBoyText(profile.teamName))
      ) {
        return false;
      }
      if (
        historical &&
        tournamentYears.length &&
        !tournamentYears.some((year) => profile.tournamentYears?.includes(year))
      ) {
        return false;
      }
      return true;
    })
    .map((profile) => ({
      profile,
      score: getPartialPlayerMatchScore(
        profile,
        searchTerm,
        historical ? "archive" : "current"
      )
    }))
    .filter((match) => match.score !== null)
    .sort((left, right) =>
      left.score - right.score
      || String(left.profile.displayName).localeCompare(String(right.profile.displayName))
      || String(left.profile.teamName || left.profile.teamId).localeCompare(
        String(right.profile.teamName || right.profile.teamId)
      )
    )
    .map((match) => match.profile);
}

function resolveHistoricalPlayer(question, playerIndex, teamNames = [], tournamentYears = []) {
  const normalized = normalizeBallBoyText(question);
  const normalizedTeams = teamNames.map(normalizeBallBoyText).filter(Boolean);
  for (const entry of playerIndex.aliases) {
    if (!containsPhrase(normalized, entry.key)) {
      continue;
    }
    const candidates = entry.profiles.filter((profile) => {
      if (
        normalizedTeams.length &&
        !normalizedTeams.includes(normalizeBallBoyText(profile.teamName))
      ) {
        return false;
      }
      return !tournamentYears.length ||
        tournamentYears.some((year) => profile.tournamentYears?.includes(year));
    });
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

function getMostCommonValue(values = []) {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((left, right) =>
    right[1] - left[1] || String(left[0]).localeCompare(String(right[0]))
  )[0]?.[0] || "";
}

function getHistoricalTeam(profile, core) {
  const teamName = normalizeBallBoyText(profile?.teamName);
  return core.teams.find((team) =>
    [team?.name, team?.officialName, ...(EXTRA_TEAM_ALIASES[team?.id] || [])]
      .some((name) => normalizeBallBoyText(name) === teamName)
  ) || {
    flag: "",
    id: "",
    name: profile?.teamName || "",
    officialName: profile?.teamName || ""
  };
}

async function hydrateHistoricalPlayer(profile, requestedYears = []) {
  const profilesData = await loadHistoricalPlayerProfiles();
  const requested = new Set(requestedYears.map(Number));
  const editions = (profile?.profileKeys || [])
    .map((profileKey) => profilesData[profileKey])
    .filter(Boolean)
    .filter((edition) =>
      !requested.size || requested.has(Number(edition.tournamentYear))
    )
    .sort((left, right) => Number(left.tournamentYear) - Number(right.tournamentYear));
  const selectedEditions = editions.length
    ? editions
    : (profile?.profileKeys || []).map((profileKey) => profilesData[profileKey]).filter(Boolean);
  const latest = selectedEditions.at(-1) || profile || {};
  const tournamentYears = uniqueBy(
    selectedEditions
      .flatMap((edition) => [
        Number(edition.tournamentYear),
        ...(edition.tournamentYears || []).map(Number)
      ])
      .filter((year) => Number.isInteger(year)),
    String
  ).sort((left, right) => left - right);
  const skills = uniqueBy(
    selectedEditions
      .flatMap((edition) => edition.skills || [])
      .filter((skill) => !/^historical lens$/i.test(String(skill || "").trim())),
    normalizeBallBoyText
  ).slice(0, 3);
  const newestWith = (field) =>
    [...selectedEditions].reverse().find((edition) => edition?.[field])?.[field];
  const firstWith = (field) =>
    selectedEditions.find((edition) => edition?.[field])?.[field];
  const shirtNumbers = uniqueBy(
    selectedEditions
      .map((edition) => Number(edition.uniformNumber))
      .filter((number) => Number.isInteger(number) && number > 0),
    String
  );

  return {
    ...profile,
    birthDate: firstWith("birthDate") || "",
    displayName: latest.displayName || latest.name || profile.displayName,
    editions: selectedEditions.map((edition) => ({
      goals: Number(edition.goals) || 0,
      position: edition.position || "Player",
      uniformNumber: Number.isInteger(Number(edition.uniformNumber))
        ? Number(edition.uniformNumber)
        : "",
      year: Number(edition.tournamentYear)
    })),
    featuredMatchCount: selectedEditions.reduce(
      (total, edition) =>
        total + Math.max(Number(edition.keyMatchCount) || 0, Number(edition.scorerMatchCount) || 0),
      0
    ),
    goals: selectedEditions.reduce((total, edition) => total + (Number(edition.goals) || 0), 0),
    historical: true,
    imageUrl: newestWith("imageUrl") || "",
    name: latest.name || latest.displayName || profile.name,
    note: newestWith("styleNote") || newestWith("note") || "",
    noteZh: newestWith("styleNoteZh") || newestWith("noteZh") || "",
    peakMarketValueEurMillions: Number(firstWith("peakMarketValueEurMillions")) || undefined,
    position: getMostCommonValue(selectedEditions.map((edition) => edition.position)) || profile.position || "Player",
    shirtNumber: shirtNumbers.length === 1 ? shirtNumbers[0] : "",
    skills,
    sourceUrl: newestWith("imagePageUrl")
      || newestWith("imageSourceUrl")
      || newestWith("sourceUrl")
      || "",
    teamName: latest.teamName || latest.teams?.[0] || profile.teamName,
    tournamentYears
  };
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
  const knowledge = getLocaleKnowledge(locale);
  if (knowledge) {
    return knowledge.stages?.[key] || String(key || (normalizeBallBoyLocale(locale) === "ko" ? "경기" : "Partido")).replaceAll("-", " ");
  }
  return STAGE_LABELS[key] || String(key || "Match").replaceAll("-", " ");
}

function formatKickoff(kickoffUtc, locale = "en") {
  const date = new Date(kickoffUtc);
  if (Number.isNaN(date.getTime())) {
    return isZhLocale(locale) ? "开球时间待确认" : getLocaleTemplates(locale)?.kickoffPending || "Kickoff time pending";
  }
  let timeZone;
  try {
    timeZone = localStorage.getItem("world-cup-simplified-timezone") || undefined;
  } catch {
    timeZone = undefined;
  }
  const dateLocale = getIntlLocale(locale);
  const formatOptions = {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      timeZone,
      weekday: "short"
  };
  if (["zh", "ko"].includes(normalizeBallBoyLocale(locale))) {
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
    if (["zh", "ko"].includes(normalizeBallBoyLocale(locale))) {
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
          : getLocaleTemplates(locale)?.ownGoal?.(getLocalizedPlayerName(goal.name, locale)) || `${goal.name} (own goal)`
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
  if (getLocaleKnowledge(locale)) {
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return new Intl.DateTimeFormat(getIntlLocale(locale), {
      day: "numeric", month: "long", timeZone: "UTC", year: "numeric"
    }).format(date);
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
    if (isZhLocale(locale)) return values.join("和");
    if (normalizeBallBoyLocale(locale) === "es") return `${values[0]} y ${values[1]}`;
    if (normalizeBallBoyLocale(locale) === "ko") return `${values[0]}, ${values[1]}`;
    return `${values[0]} and ${values[1]}`;
  }
  if (isZhLocale(locale)) return `${values.slice(0, -1).join("、")}和${values.at(-1)}`;
  if (normalizeBallBoyLocale(locale) === "es") return `${values.slice(0, -1).join(", ")} y ${values.at(-1)}`;
  if (normalizeBallBoyLocale(locale) === "ko") return values.join(", ");
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
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
      summary: "A striker leads the attack, but the role is not only about scoring. They occupy defenders, time runs into space, link with teammates, and create shots for themselves or others.",
      zone: "finish"
    };
  } else {
    role = {
      summary: "Their job changes with the move, but the aim is simple: help the team control the next action.",
      zone: "create"
    };
  }
  const localizedRole = getLocaleTemplates(locale)?.playerRole?.[role.zone];
  if (localizedRole) {
    return { ...role, summary: localizedRole };
  }
  if (!isZhLocale(locale)) {
    return role;
  }
  const summary = {
    goal: "门将首先要保护球门，也常常用第一次传球发起进攻。",
    defend: "后卫先阻止对手进攻，再帮助球队安全地把球向前推进。",
    create: "中场连接防守与进攻：抢回球权、稳住球，再找到下一脚传球。",
    "attack-wide": "边锋通常从边路启动，突破防守，并在禁区附近创造或完成机会。",
    finish: "中锋负责领衔进攻，但任务不只是进球：他们要牵制防守球员、把握时机前插到空当、与队友串联，并为自己或队友创造射门机会。"
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
  const localeTemplates = getLocaleTemplates(locale);
  const localizedWatchSkills = joinNaturalList(
    (Array.isArray(profile.skills) ? profile.skills.slice(0, 3) : [])
      .map((skill) => getLocalizedStyleLabel(skill, locale)),
    locale
  );
  let lead;
  if (localeTemplates?.playerLead) {
    lead = localeTemplates.playerLead(focus, {
      age,
      askBirth: asksForBirthDate,
      assists: stats.assists,
      birthday: formatBirthDate(profile.birthDate, locale),
      club: getLocalizedClubName(profile.club, locale),
      estimated: Boolean(marketValue?.estimated),
      goals: stats.goals,
      league: getLocalizedLeagueName(profile.league, locale),
      marketValue: formatMarketValueEur(marketValue?.value),
      name: localizedName,
      number: profile.uniformNumber ?? "",
      penaltyGoals: stats.penaltyGoals,
      position: localizedPosition,
      role: role.summary,
      skills: localizedWatchSkills,
      team: localizedTeam?.name || profile.teamId
    });
  } else if (asksForPenaltyGoals) {
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
  if (localeTemplates?.playerFollowUps) {
    followUps.push(...localeTemplates.playerFollowUps({
      name: localizedName,
      team: localizedTeam?.name || ""
    }));
  } else if (!asksForStats && !asksForPenaltyGoals) {
    followUps.push(isZh
      ? `${localizedName}有多少进球和助攻？`
      : `How many goals and assists does ${profile.displayName} have?`);
  }
  if (!localeTemplates?.playerFollowUps && !asksForStyle) {
    followUps.push(isZh ? `${localizedName}怎么踢？` : `How does ${profile.displayName} play?`);
  }
  if (!localeTemplates?.playerFollowUps) {
    followUps.push(isZh
      ? localizedTeam ? `${localizedTeam.name}怎么踢？` : "我可以问什么？"
      : team ? `How does ${team.name} play?` : "What can I ask?");
  }

  const localizedSkills = (Array.isArray(profile.skills) ? profile.skills.slice(0, 3) : [])
    .map((skill) => getLocalizedStyleLabel(skill, locale));
  const note = localeTemplates?.playerNote
    ? localeTemplates.playerNote({ name: localizedName, skills: joinNaturalList(localizedSkills, locale) })
    : isZh
    ? profile.noteZh || (localizedSkills.length
      ? `${localizedName}的比赛看点是${joinNaturalList(localizedSkills, locale)}。`
      : `${localizedName}会根据比赛阶段调整场上任务。`)
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

function formatTournamentYearSeries(years = [], locale = "en") {
  const values = uniqueBy(years.map(Number).filter(Number.isInteger), String).sort((a, b) => a - b);
  if (!values.length) {
    return "";
  }
  if (isZhLocale(locale)) {
    return values.join("、");
  }
  if (normalizeBallBoyLocale(locale) === "ko") {
    return values.join(", ");
  }
  return joinNaturalList(values.map(String), locale);
}

function getHistoricalPlayerPrompt(profile, locale = "en") {
  const name = getLocalizedPlayerName(profile?.displayName, locale, "archive");
  const team = getLocalizedTeamName(
    getHistoricalTeam(profile, { teams: teamsCache }),
    locale
  );
  const years = formatTournamentYearSeries(profile?.tournamentYears || [], locale);
  if (isZhLocale(locale)) {
    return `介绍一下${name}（${team}，${years}世界杯）`;
  }
  if (normalizeBallBoyLocale(locale) === "es") {
    return `Háblame de ${name} (${team}, Mundial${profile?.tournamentYears?.length === 1 ? "" : "es"} ${years})`;
  }
  if (normalizeBallBoyLocale(locale) === "ko") {
    return `${name}(${team}, ${years} 월드컵)를 알려 줘`;
  }
  return `Tell me about ${name} from ${team} at the ${years} World Cup${profile?.tournamentYears?.length === 1 ? "" : "s"}`;
}

function buildHistoricalPlayerReply(profile, team, question, locale = "en") {
  const isZh = isZhLocale(locale);
  const localeCode = normalizeBallBoyLocale(locale);
  const localizedName = getLocalizedPlayerName(profile.displayName, locale, "archive");
  const localizedTeam = localizeTeam(team, locale);
  const hasSpecificPosition = !["", "player", "unknown", "unavailable"]
    .includes(normalizeBallBoyText(profile.position));
  const localizedPosition = getPlayerPositionLabel(profile.position, locale);
  const formattedPosition = formatPlayerPosition(profile.position);
  const positionArticle = /^[aeiou]/i.test(formattedPosition) ? "an" : "a";
  const years = formatTournamentYearSeries(profile.tournamentYears, locale);
  const yearCount = profile.tournamentYears.length;
  const asksForStats = /\b(goal|goals|stats|statistics|world cup|tournament)\b/.test(question);
  const asksForStyle = /\b(style|play style|playstyle|how.*play|strength|skills|good at|watch)\b/.test(question);
  const asksForValue = /\b(market value|value|valuation|worth)\b/.test(question);
  const asksForNumber = /\b(shirt|jersey|squad) number\b|\bnumber\b/.test(question);
  const asksForBirthDate = /\b(birthday|birth date|born)\b/.test(question);
  const asksForAge = asksForBirthDate || /\b(age|how old)\b/.test(question);
  const asksForClub = /\b(club|club team|league|competition)\b/.test(question);
  const asksForPosition = /\b(position|role)\b/.test(question);
  const focus = asksForStats
    ? "stats"
    : asksForValue
      ? "value"
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
  const localizedSkills = (profile.skills || [])
    .slice(0, 3)
    .map((skill) => getLocalizedStyleLabel(skill, locale));
  const skills = joinNaturalList(localizedSkills, locale);
  const marketValue = Number(profile.peakMarketValueEurMillions) > 0
    ? Number(profile.peakMarketValueEurMillions)
    : null;
  const birthday = formatBirthDate(profile.birthDate, locale);
  const shirtEditions = (profile.editions || [])
    .filter((edition) => edition.uniformNumber)
    .map((edition) => `${edition.year}: #${edition.uniformNumber}`);
  let lead;

  if (isZh) {
    if (asksForStats) {
      lead = `${localizedName}在本站收录的${years}年世界杯档案中共打进${profile.goals}球。`;
    } else if (asksForPosition) {
      lead = hasSpecificPosition
        ? `${localizedName}代表${localizedTeam.name}参赛时主要司职${localizedPosition}。`
        : `这份世界杯档案没有细分${localizedName}的位置。`;
    } else if (asksForStyle) {
      lead = `${localizedName}主要司职${localizedPosition}${skills ? `，特点包括${skills}` : ""}。`;
    } else if (asksForNumber) {
      lead = shirtEditions.length
        ? `${localizedName}的世界杯号码记录：${shirtEditions.join("；")}。`
        : `我没有查到${localizedName}经过确认的历史世界杯球衣号码。`;
    } else if (asksForAge) {
      lead = birthday
        ? `${localizedName}出生于${birthday}。`
        : `我没有查到${localizedName}经过核验的出生日期。`;
    } else if (asksForValue) {
      lead = marketValue
        ? `${localizedName}的公开巅峰市场身价约为${formatMarketValueEur(marketValue)}。`
        : `我没有查到${localizedName}经过核验的历史市场身价。`;
    } else if (asksForClub) {
      lead = `这份历史资料以世界杯表现为主，没有为${localizedName}提供稳定、逐届核验的俱乐部记录。`;
    } else {
      lead = hasSpecificPosition
        ? `${localizedName}曾代表${localizedTeam.name}参加${years}年世界杯，主要司职${localizedPosition}。`
        : `${localizedName}曾代表${localizedTeam.name}参加${years}年世界杯；这份档案未细分位置。`;
    }
  } else if (localeCode === "es") {
    if (asksForStats) {
      lead = `${localizedName} marcó ${profile.goals} goles en los Mundiales de ${years} incluidos en el archivo.`;
    } else if (asksForPosition) {
      lead = hasSpecificPosition
        ? `${localizedName} figura principalmente como ${localizedPosition} con ${localizedTeam.name}.`
        : `El archivo del Mundial no especifica la posición exacta de ${localizedName}.`;
    } else if (asksForClub) {
      lead = `Este archivo se centra en el Mundial y no mantiene un historial de clubes verificado para cada edición.`;
    } else {
      lead = hasSpecificPosition
        ? `${localizedName} representó a ${localizedTeam.name} en ${yearCount === 1 ? "el Mundial" : "los Mundiales"} de ${years}, principalmente como ${localizedPosition}.`
        : `${localizedName} representó a ${localizedTeam.name} en ${yearCount === 1 ? "el Mundial" : "los Mundiales"} de ${years}; el archivo no especifica su posición exacta.`;
    }
  } else if (localeCode === "ko") {
    if (asksForStats) {
      lead = `${localizedName}은(는) 기록에 포함된 ${years} 월드컵에서 ${profile.goals}골을 넣었습니다.`;
    } else if (asksForPosition) {
      lead = hasSpecificPosition
        ? `${localizedName}은(는) ${localizedTeam.name}에서 주로 ${localizedPosition}(으)로 기록되어 있습니다.`
        : `월드컵 기록에는 ${localizedName}의 세부 포지션이 나와 있지 않습니다.`;
    } else if (asksForClub) {
      lead = `이 기록은 월드컵 활약에 초점을 맞추며 대회별 소속 클럽을 일관되게 검증하지는 않습니다.`;
    } else {
      lead = hasSpecificPosition
        ? `${localizedName}은(는) ${years} 월드컵에서 ${localizedTeam.name} 대표로 주로 ${localizedPosition}(으)로 뛰었습니다.`
        : `${localizedName}은(는) ${years} 월드컵에서 ${localizedTeam.name} 대표로 뛰었으며 세부 포지션은 기록에 없습니다.`;
    }
  } else if (asksForStats) {
    lead = `${localizedName} scored ${formatStatNoun(profile.goals, "goal")} across the ${years} World Cup archive records.`;
  } else if (asksForPosition) {
    lead = hasSpecificPosition
      ? `${localizedName} was mainly listed as ${positionArticle} ${formattedPosition.toLocaleLowerCase("en-US")} for ${localizedTeam.name}.`
      : `The World Cup archive does not specify a detailed position for ${localizedName}.`;
  } else if (asksForStyle) {
    lead = hasSpecificPosition
      ? `${localizedName} was mainly ${positionArticle} ${formattedPosition.toLocaleLowerCase("en-US")}.${skills ? ` Watch for ${skills}.` : ""}`
      : `The archive does not specify ${localizedName}'s detailed position.${skills ? ` Watch for ${skills}.` : ""}`;
  } else if (asksForNumber) {
    lead = shirtEditions.length
      ? `${localizedName}'s recorded World Cup numbers: ${shirtEditions.join("; ")}.`
      : `I do not have a confirmed historical World Cup shirt number for ${localizedName}.`;
  } else if (asksForAge) {
    lead = birthday
      ? `${localizedName} was born on ${birthday}.`
      : `I do not have a verified birth date for ${localizedName}.`;
  } else if (asksForValue) {
    lead = marketValue
      ? `${localizedName}'s sourced peak market value was about ${formatMarketValueEur(marketValue)}.`
      : `I do not have a verified historical market value for ${localizedName}.`;
  } else if (asksForClub) {
    lead = `This archive focuses on World Cup performances and does not keep a consistently verified club record for every edition.`;
  } else {
    lead = hasSpecificPosition
      ? `${localizedName} represented ${localizedTeam.name} at the ${years} World Cup${yearCount === 1 ? "" : "s"}, mainly as ${positionArticle} ${formattedPosition.toLocaleLowerCase("en-US")}.`
      : `${localizedName} represented ${localizedTeam.name} at the ${years} World Cup${yearCount === 1 ? "" : "s"}; the archive does not specify a detailed position.`;
  }

  const note = getLocaleTemplates(locale)?.playerNote
    ? getLocaleTemplates(locale).playerNote({ name: localizedName, skills })
    : isZh
      ? profile.noteZh || `${localizedName}的历史比赛特点包括${skills || "比赛阅读"}。`
      : profile.note || "";
  const followUps = isZh
    ? [`${localizedName}在世界杯进了多少球？`, `${localizedName}怎么踢？`]
    : localeCode === "es"
      ? [`¿Cuántos goles marcó ${localizedName} en el Mundial?`, `¿Cómo jugaba ${localizedName}?`]
      : localeCode === "ko"
        ? [`${localizedName}의 월드컵 득점은?`, `${localizedName}은(는) 어떻게 뛰었어?`]
        : [`How many World Cup goals did ${localizedName} score?`, `How did ${localizedName} play?`];

  return {
    age: null,
    contextHistoricalPlayerId: profile.id,
    contextTournamentYears: profile.tournamentYears,
    focus,
    followUps,
    historical: true,
    kind: "player",
    lead,
    profile: {
      canonicalName: profile.displayName,
      club: "",
      displayName: localizedName,
      featuredMatchCount: profile.featuredMatchCount,
      historical: true,
      imageUrl: profile.imageUrl || "",
      league: "",
      marketValue: null,
      note,
      peakMarketValue: marketValue,
      position: localizedPosition,
      shirtNumber: profile.shirtNumber ?? "",
      skills: localizedSkills,
      tournamentYears: profile.tournamentYears
    },
    role: getPlayerRole(profile, locale),
    stats: {
      assists: 0,
      goals: profile.goals,
      penaltyGoals: 0
    },
    team: localizedTeam
  };
}

function getTeamStyleSummary(team, styleProfiles = {}, locale = "en") {
  const profile = styleProfiles?.[team?.id];
  const toSentence = (value, ending = ".") => {
    const sentence = String(value || "").trim();
    return !sentence || /[.!?。！？]$/.test(sentence) ? sentence : `${sentence}${ending}`;
  };
  if (isZhLocale(locale) && profile?.planZh) {
    return [
      toSentence(profile.planZh, "。"),
      profile.defensiveTaskZh ? `无球时，他们最需要${toSentence(profile.defensiveTaskZh, "。")}` : ""
    ].filter(Boolean).join("");
  }
  const localeTeamStyle = getLocaleTemplates(locale)?.teamStyle;
  if (localeTeamStyle) {
    const text = normalizeBallBoyText([team?.tagline, ...(team?.styleTags || [])].join(" "));
    const kind = /press/.test(text)
      ? "press"
      : /block|compact|defend|cover/.test(text)
        ? "compact"
        : /possession|passing|control|tempo|circulation|rhythm/.test(text)
          ? "possession"
          : /wide|wing|cross|fullback/.test(text)
            ? "wide"
            : /box|aerial|target|set piece/.test(text)
              ? "box"
              : "default";
    return localeTeamStyle(kind);
  }
  if (!isZhLocale(locale) && profile?.plan) {
    return [
      toSentence(profile.plan),
      profile.defensiveTask
        ? `Without the ball, their priority is ${toSentence(profile.defensiveTask)}`
        : ""
    ].filter(Boolean).join(" ");
  }
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
  const asksNext = isNextFixtureQuestion(question);
  const asksStyle = /\b(style|play style|playstyle|how.*play|attack|defend)\b/.test(question);
  const focus = asksNext
    ? "next"
    : asksTopScorer
      ? "top-scorer"
      : asksGoalDifference
        ? "goal-difference"
        : asksGoals
          ? "goals"
          : asksWins
            ? "record"
            : asksStyle
              ? "style"
              : "overview";
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
  const localeTemplates = getLocaleTemplates(locale);
  const countryOverview = localeTemplates?.countryOverview?.({
    draws: record.draws,
    goalsAgainst: record.goalsAgainst,
    goalsFor: record.goalsFor,
    losses: record.losses,
    played: record.played,
    team: localizedTeam.name,
    wins: record.wins
  });
  let lead;
  if (localeTemplates?.countryLead && !asksStyle) {
    const nextOpponent = nextMatch
      ? localizeTeam(core.teamsById.get(nextMatch.homeTeamId === team.id ? nextMatch.awayTeamId : nextMatch.homeTeamId), locale)
      : null;
    const nextLead = nextMatch
      ? normalizeBallBoyLocale(locale) === "ko"
        ? `${localizedTeam.name}의 다음 상대는 ${nextOpponent?.name || "미정"}입니다. 경기는 ${formatKickoff(nextMatch.kickoffUtc, locale)}에 시작합니다.`
        : `El próximo rival de ${localizedTeam.name} es ${nextOpponent?.name || "por definir"}. El partido comienza el ${formatKickoff(nextMatch.kickoffUtc, locale)}.`
      : "";
    lead = localeTemplates.countryLead(focus, {
      goalDifference: record.goalsFor - record.goalsAgainst,
      goalsAgainst: record.goalsAgainst,
      goalsFor: record.goalsFor,
      hasNext: Boolean(nextMatch),
      hasShootout: Boolean(record.shootoutAdvances || record.shootoutExits),
      nextLead,
      overview: countryOverview,
      played: record.played,
      team: localizedTeam.name,
      topGoals: localizedTopScorer?.goals || 0,
      topScorer: localizedTopScorer?.name || "",
      wins: record.wins
    });
  } else if (asksNext && !nextMatch) {
    lead = isZh
      ? `${localizedTeam.name}目前没有下一场比赛。`
      : `${team.name} do not currently have another match scheduled.`;
  } else if (asksTopScorer && topScorer) {
    lead = isZh
      ? `${localizedTopScorer.name}以${topScorer.goals}个进球领跑${localizedTeam.name}队内射手榜。`
      : `${topScorer.name} leads ${team.name} with ${formatStatNoun(topScorer.goals, "goal")} at this World Cup.`;
  } else if (asksGoalDifference) {
    const goalDifference = record.goalsFor - record.goalsAgainst;
    lead = isZh
      ? `${localizedTeam.name}本届赛事的净胜球是${goalDifference > 0 ? "+" : ""}${goalDifference}：进${record.goalsFor}球，失${record.goalsAgainst}球。`
      : `${team.name}'s full-tournament goal difference is ${goalDifference > 0 ? "+" : ""}${goalDifference}: ${record.goalsFor} scored minus ${record.goalsAgainst} conceded.`;
  } else if (asksGoals) {
    lead = isZh
      ? `${localizedTeam.name}在${record.played}场比赛中打进${record.goalsFor}球，丢了${record.goalsAgainst}球。`
      : `${team.name} have scored ${formatStatNoun(record.goalsFor, "goal")} and conceded ${record.goalsAgainst} across ${record.played} matches.`;
  } else if (asksWins) {
    lead = isZh
      ? `${localizedTeam.name}本届世界杯踢了${record.played}场，赢下${record.wins}场。${record.shootoutAdvances || record.shootoutExits ? "点球大战在胜平负统计中按平局计算。" : ""}`
      : `${team.name} have won ${record.wins} of ${record.played} matches at this World Cup.${shootoutNote}`;
  } else if (asksStyle) {
    lead = getTeamStyleSummary(team, core.teamStyleProfiles, locale);
  } else {
    lead = isZh
      ? `${localizedTeam.name}踢了${record.played}场：${record.wins}胜、${record.draws}平、${record.losses}负，进${record.goalsFor}球、失${record.goalsAgainst}球。`
      : `${team.name} are ${record.wins}-${record.draws}-${record.losses} across ${record.played} matches, with ${record.goalsFor} scored and ${record.goalsAgainst} conceded.`;
  }

  const keyPlayers = getTeamKeyPlayers(team.id, core.fixtures).map((player) => ({
    ...player,
    name: getLocalizedPlayerName(player.name, locale),
    promptName: player.name
  }));
  const followUps = [];
  if (localeTemplates?.countryFollowUps) {
    followUps.push(...localeTemplates.countryFollowUps({
      hasLast: Boolean(lastMatch),
      hasNext: Boolean(nextMatch),
      player: keyPlayers[0]?.name || "",
      team: localizedTeam.name
    }));
  } else if (keyPlayers[0]?.name) {
    followUps.push(isZh ? `介绍一下${keyPlayers[0].name}` : `Tell me about ${keyPlayers[0].name}`);
  }
  if (!localeTemplates?.countryFollowUps && lastMatch) {
    followUps.push(isZh ? `${localizedTeam.name}上一场比赛发生了什么？` : `What happened in ${team.name}'s last match?`);
  }
  if (!localeTemplates?.countryFollowUps && nextMatch) {
    followUps.push(isZh ? `${localizedTeam.name}下一场对谁？` : `Who do ${team.name} play next?`);
  } else if (!localeTemplates?.countryFollowUps) {
    followUps.push(isZh ? `${localizedTeam.name}有哪些球员值得关注？` : `Who should I watch for ${team.name}?`);
  }

  return {
    beginnerStyle: getTeamStyleSummary(team, core.teamStyleProfiles, locale),
    focus,
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

function isNextFixtureQuestion(question) {
  return (
    /\b(?:next|upcoming)\s+(?:match|game|fixture|opponent)\b/.test(question) ||
    /\b(?:play|playing|face|facing|meet|meeting)\s+next\b/.test(question) ||
    /\b(?:play|playing|face|facing|meet|meeting)\s+(?:who|whom)\s+next\b/.test(question)
  );
}

function isMatchQuestion(question) {
  return isNextFixtureQuestion(question) || /\b(match|game|fixture|upcoming|score|scored|won|winner|beat|result|happened|last match|highlights|head to head|h2h|kickoff|when)\b/.test(question);
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
  const asksUpcomingTiming = isNextFixtureQuestion(question) || /\b(upcoming|when (?:is|are|do|does|will)|kickoff)\b/.test(question);
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
  const localizedMatchLead = getLocaleTemplates(locale)?.matchLead;
  if (localizedMatchLead) {
    const status = String(fixture?.status || "").toUpperCase();
    const home = teams.home?.name || getLocaleTemplates(locale)?.fallbackHome;
    const away = teams.away?.name || getLocaleTemplates(locale)?.fallbackAway;
    const homeScore = Number(fixture?.score?.home);
    const awayScore = Number(fixture?.score?.away);
    if (status === "LIVE") {
      if (Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
        if (homeScore === awayScore) {
          return localizedMatchLead("live-draw", { away, awayScore, home, homeScore });
        }
        const leader = homeScore > awayScore ? teams.home : teams.away;
        return localizedMatchLead("live-lead", {
          leader: leader?.name || getLocaleTemplates(locale)?.fallbackTeam,
          leaderScore: Math.max(homeScore, awayScore),
          trailingScore: Math.min(homeScore, awayScore)
        });
      }
      return localizedMatchLead("live", { away, home });
    }
    if (!isCompletedFixture(fixture)) {
      return localizedMatchLead("scheduled", { away, home, kickoff: formatKickoff(fixture.kickoffUtc, locale) });
    }
    const penalties = fixture?.scoreDetails?.penalties;
    const winnerId = getFixtureWinnerId(fixture);
    const winner = winnerId === fixture.homeTeamId ? teams.home : winnerId === fixture.awayTeamId ? teams.away : null;
    const extraTime = didMatchGoToExtraTime(fixture, timeline);
    if (Number.isFinite(penalties?.home) && Number.isFinite(penalties?.away) && winner) {
      return localizedMatchLead("penalties", {
        awayScore,
        homeScore,
        loserPen: winnerId === fixture.homeTeamId ? penalties.away : penalties.home,
        winner: winner.name,
        winnerPen: winnerId === fixture.homeTeamId ? penalties.home : penalties.away
      });
    }
    if (winner && Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
      const firstGoal = timeline[0];
      const firstScoringTeamId = firstGoal?.side === "home" ? fixture.homeTeamId : firstGoal?.side === "away" ? fixture.awayTeamId : "";
      return localizedMatchLead("winner", {
        comeback: Boolean(firstScoringTeamId && firstScoringTeamId !== winnerId),
        extraTime,
        firstTeam: firstScoringTeamId === fixture.homeTeamId ? teams.home?.name : teams.away?.name,
        loserScore: winnerId === fixture.homeTeamId ? awayScore : homeScore,
        winner: winner.name,
        winnerScore: winnerId === fixture.homeTeamId ? homeScore : awayScore
      });
    }
    if (Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
      return localizedMatchLead("draw", { away, awayScore, extraTime, home, homeScore });
    }
    return localizedMatchLead("unavailable", {});
  }
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
    return fixture?.h2h?.status === "loaded"
      ? "该来源未返回此前的交锋记录。完整历史覆盖尚未确认。"
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
  const prefix = fixture.h2h.coverageStatus === "complete" ? "已核验的完整成年国家队交锋" : "数据集中所选成年国家队交锋";
  const caveat = fixture.h2h.coverageStatus === "complete" ? "" : "完整历史覆盖尚未确认。";
  return `${prefix}${results.length}场：${teams.home.name}${record.homeWins}胜，平局${record.draws}场，${teams.away.name}${record.awayWins}胜。${caveat}`;
}

const GENERIC_MATCH_STORY_PATTERN = /\b(?:chase the match|pulled away|trading momentum|kept trading momentum|rescued a point|settled a tight match|finished the scoring|shaped the contest|shaped the match|traded pressure without finding a goal|both defenses kept the scoring lanes closed|made .+ sweat|later chances finally turned)\b/i;

function getStructuredMatchRecap(fixture, teams, timeline, locale = "en") {
  const isZh = isZhLocale(locale);
  if (isZh && Array.isArray(fixture?.resultStoryBulletsZh) && fixture.resultStoryBulletsZh.length) {
    return fixture.resultStoryBulletsZh.slice(0, 3);
  }
  if (!isCompletedFixture(fixture)) {
    return [];
  }
  const localeTemplates = getLocaleTemplates(locale);
  if (localeTemplates?.recapFirst) {
    const firstGoal = timeline[0];
    const finalGoal = timeline.length > 1 ? timeline.at(-1) : null;
    return [
      firstGoal ? localeTemplates.recapFirst(firstGoal) : "",
      finalGoal ? localeTemplates.recapFinal(finalGoal) : ""
    ].filter(Boolean).slice(0, 3);
  }
  if (!isZh && Array.isArray(fixture?.resultStoryBullets)) {
    const specific = fixture.resultStoryBullets
      .filter((bullet) => bullet && !GENERIC_MATCH_STORY_PATTERN.test(bullet))
      .slice(0, 3);
    if (specific.length) {
      return specific;
    }
  }
  const firstGoal = timeline[0];
  const finalGoal = timeline.length > 1 ? timeline.at(-1) : null;
  const bullets = [];
  if (firstGoal) {
    bullets.push(isZh
      ? `${firstGoal.name}在${firstGoal.minute}首开纪录。`
      : `${firstGoal.name} opened the scoring at ${firstGoal.minute}.`);
  }
  if (finalGoal) {
    bullets.push(isZh
      ? `${finalGoal.name}在${finalGoal.minute}打入最后一个进球。`
      : `${finalGoal.name} scored the final goal at ${finalGoal.minute}.`);
  }
  return bullets.slice(0, 3);
}

function getMatchH2hSummary(fixture, teams, locale = "en") {
  if (isZhLocale(locale)) {
    return getZhH2hSummary(fixture, teams);
  }
  const templates = getLocaleTemplates(locale);
  if (templates) {
    const results = Array.isArray(fixture?.h2h?.results) ? fixture.h2h.results : [];
    if (!results.length || !teams.home || !teams.away) {
      return fixture?.h2h?.status === "loaded"
        ? templates.h2hNone?.({ first: teams.home?.name || "", second: teams.away?.name || "", hasFixture: true })
        : templates.h2hUnavailable;
    }
    const record = { draws: 0, firstWins: 0, goals: 0, secondWins: 0 };
    for (const result of results) {
      const homeScore = Number(result.homeScore);
      const awayScore = Number(result.awayScore);
      if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) continue;
      record.goals += homeScore + awayScore;
      if (homeScore === awayScore) record.draws += 1;
      else if ((homeScore > awayScore ? result.homeTeamId : result.awayTeamId) === teams.home.id) record.firstWins += 1;
      else record.secondWins += 1;
    }
    return templates.h2hRecord?.({
      ...record,
      coverageStatus: fixture.h2h.coverageStatus || "unknown",
      first: teams.home.name,
      hasFixture: true,
      second: teams.away.name,
      total: results.length
    });
  }
  if (fixture?.h2h?.status === "loaded" && fixture.h2h.summary) {
    return fixture.h2h.summary;
  }
  return fixture?.h2h?.status === "loaded"
    ? "No previous meetings were returned by this source. Complete historical coverage has not been confirmed."
    : "Previous-meeting history is still being checked.";
}

function getMatchupIntent(question) {
  if (/\b(who would win|who will win|which (?:team|country) (?:would|will) win|prediction|predict|favorite|favourite|more likely to win)\b/.test(question)) {
    return "prediction";
  }
  if (/\b(last meeting|last played|last time .* play|most recent meeting|previous meeting)\b/.test(question)) {
    return "last-meeting";
  }
  if (/\b(beaten|ever beat|has .* beat|have .* beat)\b/.test(question)) {
    return "has-beaten";
  }
  return "overview";
}

function getTeamPairKey(teams) {
  return teams
    .map((team) => team?.id || "")
    .filter(Boolean)
    .sort()
    .join("|");
}

function getMatchupFixture(teams, fixtures) {
  const upcoming = resolveFixture("next match", teams, fixtures);
  return upcoming || resolveFixture("result", teams, fixtures);
}

function getMatchupH2h(teams, core) {
  const cached = core.chatbotH2h?.[getTeamPairKey(teams)];
  if (cached?.status === "loaded") {
    return cached;
  }

  const teamIds = new Set(teams.map((team) => team.id));
  return sortFixturesLatestFirst(
    core.fixtures.filter((fixture) => {
      const fixtureIds = [fixture.homeTeamId, fixture.awayTeamId];
      return fixtureIds.every((teamId) => teamIds.has(teamId)) &&
        fixture.h2h?.status === "loaded";
    })
  )[0]?.h2h || null;
}

function getCompletedMatchupResults(teams, core, locale = "en") {
  const teamIds = new Set(teams.map((team) => team.id));
  return core.fixtures
    .filter((fixture) => {
      const fixtureIds = [fixture.homeTeamId, fixture.awayTeamId];
      return fixtureIds.every((teamId) => teamIds.has(teamId)) && isCompletedFixture(fixture);
    })
    .map((fixture) => {
      const homeScore = Number(fixture.score?.home);
      const awayScore = Number(fixture.score?.away);
      if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
        return null;
      }
      return {
        awayScore,
        awayTeamId: fixture.awayTeamId,
        competitionLabel: isZhLocale(locale)
          ? `2026年世界杯 · ${getStageLabel(fixture, locale)}`
          : getLocaleTemplates(locale)?.competition2026?.(getStageLabel(fixture, locale)) ||
            `World Cup 2026 · ${getStageLabel(fixture, locale)}`,
        date: String(fixture.kickoffUtc || "").slice(0, 10),
        homeScore,
        homeTeamId: fixture.homeTeamId,
        venue: fixture.venue || ""
      };
    })
    .filter(Boolean);
}

function getMatchupResultKey(result) {
  return [
    result.date,
    result.homeTeamId,
    result.awayTeamId,
    result.homeScore,
    result.awayScore
  ].join("|");
}

function getMatchupResultWinnerId(result) {
  const homeScore = Number(result?.homeScore);
  const awayScore = Number(result?.awayScore);
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore === awayScore) {
    return "";
  }
  return homeScore > awayScore ? result.homeTeamId : result.awayTeamId;
}

function summarizeMatchupH2h(h2h, teams, hasFixture, locale = "en") {
  const templates = getLocaleTemplates(locale);
  if (!h2h || h2h.status !== "loaded") {
    if (templates) return templates.h2hUnavailable;
    return isZhLocale(locale)
      ? "双方经过核验的成年国家队交锋记录尚未载入。"
      : "Verified senior men's head-to-head history is not available yet.";
  }

  const [firstTeam, secondTeam] = teams;
  const results = Array.isArray(h2h.results) ? h2h.results : [];
  if (!results.length) {
    if (templates) {
      return templates.h2hNone?.({ first: firstTeam.name, hasFixture, second: secondTeam.name });
    }
    if (isZhLocale(locale)) {
      return "该来源未返回此前的交锋记录。完整历史覆盖尚未确认。";
    }
    return "No previous meetings were returned by this source. Complete historical coverage has not been confirmed.";
  }

  const record = results.reduce(
    (summary, result) => {
      const homeScore = Number(result.homeScore);
      const awayScore = Number(result.awayScore);
      if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
        return summary;
      }
      summary.goals += homeScore + awayScore;
      if (homeScore === awayScore) {
        summary.draws += 1;
      } else {
        const winnerTeamId = homeScore > awayScore ? result.homeTeamId : result.awayTeamId;
        if (winnerTeamId === firstTeam.id) {
          summary.firstWins += 1;
        } else if (winnerTeamId === secondTeam.id) {
          summary.secondWins += 1;
        }
      }
      return summary;
    },
    { draws: 0, firstWins: 0, goals: 0, secondWins: 0 }
  );

  if (isZhLocale(locale)) {
    const prefix = h2h.coverageStatus === "complete" ? "已核验的完整成年国家队交锋" : "数据集中所选成年国家队交锋";
    const caveat = h2h.coverageStatus === "complete" ? "" : "完整历史覆盖尚未确认。";
    return `${prefix}${results.length}场：${firstTeam.name}${record.firstWins}胜，平局${record.draws}场，${secondTeam.name}${record.secondWins}胜，共产生${record.goals}个进球。${caveat}`;
  }
  if (templates?.h2hRecord) {
    return templates.h2hRecord({
      ...record,
      coverageStatus: h2h.coverageStatus || "unknown",
      first: firstTeam.name,
      hasFixture,
      second: secondTeam.name,
      total: results.length
    });
  }

  const coverage = h2h.coverageStatus === "complete"
    ? `${results.length} verified senior meetings`
    : `${results.length} selected senior meetings available in our dataset`;
  const caveat = h2h.coverageStatus === "complete" ? "" : " Complete historical coverage has not been confirmed.";
  return `${coverage}: ${record.firstWins} ${firstTeam.name} ${record.firstWins === 1 ? "win" : "wins"}, ${record.draws} ${record.draws === 1 ? "draw" : "draws"}, ${record.secondWins} ${secondTeam.name} ${record.secondWins === 1 ? "win" : "wins"}.${caveat}`;
}

function formatMatchupHistoryDate(value, locale = "en") {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return value || "";
  }
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric"
  }).format(date);
}

function localizeMatchupCompetition(value, locale = "en") {
  const competition = String(value || "");
  const templates = getLocaleTemplates(locale);
  if (templates) {
    if (competition === "Friendly") return templates.friendly;
    const worldCupGroup = competition.match(/^World Cup (\d{4}) - Group (.+)$/);
    if (worldCupGroup) {
      return normalizeBallBoyLocale(locale) === "ko"
        ? `${worldCupGroup[1]} 월드컵 · ${worldCupGroup[2]}조`
        : `Mundial ${worldCupGroup[1]} · Grupo ${worldCupGroup[2]}`;
    }
    return competition.replace("World Cup", normalizeBallBoyLocale(locale) === "ko" ? "월드컵" : "Mundial");
  }
  if (!isZhLocale(locale)) {
    return competition;
  }
  if (competition === "Friendly") {
    return "友谊赛";
  }
  const worldCupGroup = competition.match(/^World Cup (\d{4}) - Group (.+)$/);
  if (worldCupGroup) {
    return `${worldCupGroup[1]}年世界杯 · 第${worldCupGroup[2]}组`;
  }
  return competition.replace("World Cup", "世界杯");
}

function formatMatchupHistoryResult(result, core, locale = "en") {
  const home = localizeTeam(core.teamsById.get(result.homeTeamId), locale);
  const away = localizeTeam(core.teamsById.get(result.awayTeamId), locale);
  const homeScore = Number(result.homeScore);
  const awayScore = Number(result.awayScore);
  return {
    away,
    awayScore,
    competition: result.competitionLabel || localizeMatchupCompetition(result.competition, locale),
    dateLabel: formatMatchupHistoryDate(result.date, locale),
    home,
    homeScore,
    winnerTeamId: getMatchupResultWinnerId(result)
  };
}

function buildLastMeetingLead(result, locale = "en") {
  const templates = getLocaleTemplates(locale);
  if (!result) {
    if (templates) return templates.lastMeetingUnavailable;
    return isZhLocale(locale)
      ? "双方最近一次经过核验的成年国家队交锋记录尚未载入。"
      : "Their most recent verified senior men's meeting is not available yet.";
  }
  if (result.homeScore === result.awayScore) {
    if (templates?.lastMeetingDraw) {
      return templates.lastMeetingDraw({
        away: result.away.name, date: result.dateLabel, home: result.home.name,
        awayScore: result.awayScore, homeScore: result.homeScore
      });
    }
    return isZhLocale(locale)
      ? `双方最近一次经过核验的成年国家队交锋中，${result.home.name}与${result.away.name}在${result.dateLabel}以${result.homeScore}-${result.awayScore}战平。`
      : `${result.home.name} and ${result.away.name} drew ${result.homeScore}-${result.awayScore} on ${result.dateLabel} in their most recent verified senior men's meeting.`;
  }
  const winner = result.winnerTeamId === result.home.id ? result.home : result.away;
  const loser = result.winnerTeamId === result.home.id ? result.away : result.home;
  const winnerScore = result.winnerTeamId === result.home.id ? result.homeScore : result.awayScore;
  const loserScore = result.winnerTeamId === result.home.id ? result.awayScore : result.homeScore;
  if (templates?.lastMeetingWin) {
    return templates.lastMeetingWin({
      date: result.dateLabel, loser: loser.name, loserScore, winner: winner.name, winnerScore
    });
  }
  return isZhLocale(locale)
    ? `双方最近一次经过核验的成年国家队交锋中，${winner.name}在${result.dateLabel}以${winnerScore}-${loserScore}击败${loser.name}。`
    : `${winner.name} beat ${loser.name} ${winnerScore}-${loserScore} on ${result.dateLabel} in their most recent verified senior men's meeting.`;
}

function buildHasBeatenLead(subject, opponent, result, hasVerifiedHistory, locale = "en") {
  const templates = getLocaleTemplates(locale);
  if (result) {
    const subjectScore = result.home.id === subject.id ? result.homeScore : result.awayScore;
    const opponentScore = result.home.id === opponent.id ? result.homeScore : result.awayScore;
    if (templates?.hasBeatenYes) {
      return templates.hasBeatenYes({
        date: result.dateLabel, opponent: opponent.name, opponentScore,
        subject: subject.name, subjectScore
      });
    }
    return isZhLocale(locale)
      ? `${subject.name}曾在经过核验的成年国家队比赛中击败${opponent.name}。最近一次是在${result.dateLabel}以${subjectScore}-${opponentScore}获胜。`
      : `${subject.name} have beaten ${opponent.name} in a verified senior men's international. Their most recent win was ${subjectScore}-${opponentScore} on ${result.dateLabel}.`;
  }
  if (hasVerifiedHistory) {
    if (templates?.hasBeatenNo) return templates.hasBeatenNo({ opponent: opponent.name, subject: subject.name });
    return isZhLocale(locale)
      ? `${subject.name}尚未在经过核验的成年国家队比赛中击败${opponent.name}。`
      : `${subject.name} have not beaten ${opponent.name} in the verified senior series.`;
  }
  if (templates?.hasBeatenUnknown) return templates.hasBeatenUnknown({ opponent: opponent.name, subject: subject.name });
  return isZhLocale(locale)
    ? `目前没有足够的经过核验的交锋记录来确认${subject.name}是否击败过${opponent.name}。`
    : `There is not enough verified head-to-head history available to confirm whether ${subject.name} have beaten ${opponent.name}.`;
}

function getMatchupPrediction(fixture, core, locale = "en") {
  const projection = fixture?.projection;
  const homeValue = Number(projection?.home);
  const drawValue = Number(projection?.draw);
  const awayValue = Number(projection?.away);
  if (![homeValue, drawValue, awayValue].every(Number.isFinite)) {
    return null;
  }
  const home = localizeTeam(core.teamsById.get(fixture.homeTeamId), locale);
  const away = localizeTeam(core.teamsById.get(fixture.awayTeamId), locale);
  return {
    outcomes: [
      { id: home.id, label: home.name, value: homeValue },
      { id: "draw", label: isZhLocale(locale) ? "平局" : getLocaleTemplates(locale)?.drawLabel || "Draw", value: drawValue },
      { id: away.id, label: away.name, value: awayValue }
    ],
    sourceUrl: projection.sourceUrl || ""
  };
}

function buildPredictionLead(fixture, prediction, core, localizedTeams, locale = "en") {
  const templates = getLocaleTemplates(locale);
  if (!fixture) {
    if (templates?.predictionNoFixture) {
      return templates.predictionNoFixture({ first: localizedTeams[0].name, second: localizedTeams[1].name });
    }
    return isZhLocale(locale)
      ? `${localizedTeams[0].name}与${localizedTeams[1].name}目前没有安排在本届世界杯交手，因此没有经过核验的比赛预测。`
      : `${localizedTeams[0].name} and ${localizedTeams[1].name} are not currently scheduled to meet at this World Cup, so there is no verified match prediction.`;
  }
  const fixtureTeams = getFixtureTeams(fixture, core.teamsById);
  const localizedFixtureTeams = {
    away: localizeTeam(fixtureTeams.away, locale),
    home: localizeTeam(fixtureTeams.home, locale)
  };
  if (isCompletedFixture(fixture)) {
    const result = buildMatchLead(fixture, localizedFixtureTeams, getGoalTimeline(fixture, locale), locale);
    if (templates?.predictionFinished) return templates.predictionFinished(result);
    return isZhLocale(locale) ? `这场比赛已经结束。${result}` : `This match has already been played. ${result}`;
  }
  if (String(fixture.status || "").toUpperCase() === "LIVE") {
    const live = buildMatchLead(fixture, localizedFixtureTeams, getGoalTimeline(fixture, locale), locale);
    if (templates?.predictionLive) return templates.predictionLive(live);
    return isZhLocale(locale) ? `比赛已经开始。${live}` : `The match is already in progress. ${live}`;
  }
  if (!prediction) {
    if (templates?.predictionUnavailable) return templates.predictionUnavailable;
    return isZhLocale(locale)
      ? "这场比赛暂时没有载入经过核验的预测。"
      : "No verified prediction is loaded for this fixture yet.";
  }
  const highest = [...prediction.outcomes].sort((left, right) => right.value - left.value)[0];
  const home = prediction.outcomes[0];
  const draw = prediction.outcomes[1];
  const away = prediction.outcomes[2];
  if (templates?.predictionDraw && templates?.predictionWinner) {
    if (highest.id === "draw") {
      return templates.predictionDraw({
        away: away.label, awayValue: away.value, draw: draw.value,
        home: home.label, homeValue: home.value
      });
    }
    const other = highest.id === home.id ? away : home;
    return templates.predictionWinner({
      draw: draw.value, highest: highest.label, highestValue: highest.value,
      other: other.label, otherValue: other.value
    });
  }
  if (isZhLocale(locale)) {
    return highest.id === "draw"
      ? `经过核验的90分钟赛果预测中，平局概率最高，为${draw.value}%；${home.label}胜率${home.value}%，${away.label}胜率${away.value}%。预测为非官方内容。`
      : `${highest.label}在经过核验的90分钟赛果预测中胜率最高，为${highest.value}%；平局${draw.value}%，${highest.id === home.id ? away.label : home.label}胜率${highest.id === home.id ? away.value : home.value}%。预测为非官方内容。`;
  }
  return highest.id === "draw"
    ? `A draw is the highest-probability 90-minute outcome at ${draw.value}%. ${home.label} are ${home.value}% and ${away.label} are ${away.value}%. Predictions are unofficial.`
    : `${highest.label} have the highest 90-minute win probability at ${highest.value}%. The draw is ${draw.value}%, and ${highest.id === home.id ? away.label : home.label} are ${highest.id === home.id ? away.value : home.value}%. Predictions are unofficial.`;
}

function buildMatchupReply(requestedTeams, core, locale = "en", intent = "overview") {
  const templates = getLocaleTemplates(locale);
  const teams = requestedTeams.slice(0, 2);
  const localizedTeams = teams.map((team) => localizeTeam(team, locale));
  const fixture = getMatchupFixture(teams, core.fixtures);
  const fixtureTeams = fixture ? getFixtureTeams(fixture, core.teamsById) : null;
  const localizedFixtureTeams = fixtureTeams
    ? {
        away: localizeTeam(fixtureTeams.away, locale),
        home: localizeTeam(fixtureTeams.home, locale)
      }
    : null;
  let lead = fixture
    ? buildMatchLead(fixture, localizedFixtureTeams, getGoalTimeline(fixture, locale), locale)
    : templates?.matchupNoFixture
      ? templates.matchupNoFixture({ first: localizedTeams[0].name, second: localizedTeams[1].name })
      : isZhLocale(locale)
      ? `${localizedTeams[0].name}与${localizedTeams[1].name}目前没有安排在本届世界杯交手。`
      : `${localizedTeams[0].name} and ${localizedTeams[1].name} are not currently scheduled to meet at this World Cup.`;
  const h2h = getMatchupH2h(teams, core);
  const h2hResults = Array.isArray(h2h?.results) ? h2h.results : [];
  const allResults = uniqueBy(
    [...getCompletedMatchupResults(teams, core, locale), ...h2hResults]
      .filter((result) => core.teamsById.has(result.homeTeamId) && core.teamsById.has(result.awayTeamId))
      .sort((left, right) => String(right.date || "").localeCompare(String(left.date || ""))),
    getMatchupResultKey
  );
  let selectedResults = h2hResults.slice(0, 3);
  let historySummary = summarizeMatchupH2h(h2h, localizedTeams, Boolean(fixture), locale);
  let historyLabel = isZhLocale(locale) ? "过往交锋" : templates?.matchupLabels?.history || "Past meetings";
  let prediction = null;

  if (intent === "prediction") {
    prediction = !fixture || (!isCompletedFixture(fixture) && String(fixture.status || "").toUpperCase() !== "LIVE")
      ? getMatchupPrediction(fixture, core, locale)
      : null;
    lead = buildPredictionLead(fixture, prediction, core, localizedTeams, locale);
    selectedResults = [];
  } else if (intent === "last-meeting") {
    selectedResults = allResults.slice(0, 1);
    const latest = selectedResults[0] ? formatMatchupHistoryResult(selectedResults[0], core, locale) : null;
    lead = buildLastMeetingLead(latest, locale);
    historySummary = isZhLocale(locale)
      ? "这是双方最近一次经过核验的成年国家队交锋。"
      : normalizeBallBoyLocale(locale) === "es"
        ? "Este es su enfrentamiento verificado más reciente entre selecciones absolutas."
        : normalizeBallBoyLocale(locale) === "ko"
          ? "양 팀의 가장 최근 검증된 성인 국가대표 맞대결입니다."
          : "This is their most recent verified senior men's international.";
    historyLabel = isZhLocale(locale) ? "最近一次交锋" : templates?.matchupLabels?.last || "Last meeting";
  } else if (intent === "has-beaten") {
    const subject = localizedTeams[0];
    const opponent = localizedTeams[1];
    const latestWin = allResults.find((result) => getMatchupResultWinnerId(result) === teams[0].id) || null;
    selectedResults = latestWin ? [latestWin] : [];
    const formattedWin = latestWin ? formatMatchupHistoryResult(latestWin, core, locale) : null;
    lead = buildHasBeatenLead(
      subject,
      opponent,
      formattedWin,
      Boolean(allResults.length || h2h?.coverageStatus === "complete"),
      locale
    );
    historySummary = formattedWin
      ? isZhLocale(locale)
        ? `${subject.name}最近一次战胜${opponent.name}。`
        : normalizeBallBoyLocale(locale) === "es"
          ? `La victoria más reciente de ${subject.name} sobre ${opponent.name}.`
          : normalizeBallBoyLocale(locale) === "ko"
            ? `${subject.name}의 ${opponent.name} 상대 최근 승리입니다.`
            : `${subject.name}'s most recent win over ${opponent.name}.`
      : summarizeMatchupH2h(h2h, localizedTeams, Boolean(fixture), locale);
    historyLabel = isZhLocale(locale) ? "交锋结果" : templates?.matchupLabels?.answer || "Head-to-head answer";
  }

  const history = selectedResults.map((result) => formatMatchupHistoryResult(result, core, locale));
  const localizedPrompts = templates?.matchupPrompts?.({
    first: localizedTeams[0].name,
    second: localizedTeams[1].name
  });
  const hasBeatenPrompt = localizedPrompts?.beaten || (isZhLocale(locale)
    ? `${localizedTeams[0].name}赢过${localizedTeams[1].name}吗？`
    : `Has ${localizedTeams[0].name} beaten ${localizedTeams[1].name}?`);
  const predictionPrompt = localizedPrompts?.prediction || (isZhLocale(locale) ? "谁会赢？" : "Who would win?");
  const lastMeetingPrompt = localizedPrompts?.last || (isZhLocale(locale) ? "上次交手" : "Last meeting");
  const followUps = intent === "overview"
    ? [predictionPrompt, lastMeetingPrompt, hasBeatenPrompt]
    : intent === "prediction"
      ? [lastMeetingPrompt, hasBeatenPrompt]
      : [predictionPrompt, intent === "has-beaten" ? lastMeetingPrompt : hasBeatenPrompt];

  return {
    comparison: teams.map((team, index) => ({
      record: getTeamRecord(team.id, core.fixtures).record,
      team: localizedTeams[index]
    })),
    fixture: fixture
      ? {
          id: fixture.id,
          status: fixture.status
        }
      : null,
    contextTeamIds: teams.map((team) => team.id),
    focus: intent,
    followUps,
    history,
    historyLabel,
    historySummary,
    kind: "matchup",
    lead,
    prediction,
    sourceUrl: intent === "prediction" ? prediction?.sourceUrl || "" : h2h?.sourceUrl || ""
  };
}

function buildMatchReply(fixture, core, question, locale = "en") {
  const isZh = isZhLocale(locale);
  const templates = getLocaleTemplates(locale);
  const rawTeams = getFixtureTeams(fixture, core.teamsById);
  const teams = {
    away: localizeTeam(rawTeams.away, locale),
    home: localizeTeam(rawTeams.home, locale)
  };
  const timeline = getGoalTimeline(fixture, locale);
  const wantsH2h = /\b(head to head|h2h|history|previous meetings)\b/.test(question);
  const asksWhoScored = /\b(who scored|scorers|goalscorers|goal scorers)\b/.test(question);
  const asksWhen = isNextFixtureQuestion(question) || /\b(when|kickoff)\b/.test(question);
  const asksHighlights = /\b(highlights|watch)\b/.test(question);
  const asksResult = /\b(who won|winner|score|result|beat)\b/.test(question);
  const focus = asksWhoScored
    ? "scorers"
    : asksWhen
      ? "when"
      : wantsH2h
        ? "h2h"
        : asksHighlights
          ? "highlights"
          : asksResult
            ? "result"
            : "overview";
  const resultLead = buildMatchLead(fixture, teams, timeline, locale);
  let lead = resultLead;
  if (templates?.matchFocus) {
    const scorers = uniqueBy(timeline, (goal) => normalizeBallBoyText(goal.name)).map((goal) => goal.name);
    lead = templates.matchFocus(focus, {
      away: teams.away?.name || templates.fallbackAway,
      defaultLead: resultLead,
      hasHighlights: Boolean(fixture.highlightVideo?.url),
      home: teams.home?.name || templates.fallbackHome,
      kickoff: formatKickoff(fixture.kickoffUtc, locale),
      scorers,
      scorersText: joinNaturalList(scorers, locale)
    });
  } else if (asksWhoScored) {
    const scorers = uniqueBy(timeline, (goal) => normalizeBallBoyText(goal.name)).map((goal) => goal.name);
    lead = scorers.length
      ? isZh
        ? `进球者：${joinNaturalList(scorers, locale)}。`
        : `${scorers.length === 1 ? "The scorer was" : "The scorers were"} ${joinNaturalList(scorers, locale)}.`
      : isZh ? "这场比赛没有进球。" : "No goals were scored.";
  } else if (asksWhen) {
    lead = isZh
      ? `${teams.home?.name || "主队"}对${teams.away?.name || "客队"}：${formatKickoff(fixture.kickoffUtc, locale)}。`
      : `${teams.home?.name || "The home team"} vs ${teams.away?.name || "the away team"}: ${formatKickoff(fixture.kickoffUtc, locale)}.`;
  } else if (wantsH2h) {
    lead = isZh ? "这是双方在本场比赛前的交锋记录。" : "This is their record before this match.";
  } else if (asksHighlights) {
    lead = fixture.highlightVideo?.url
      ? isZh ? "这场比赛有经过核验的官方集锦。" : "Verified official highlights are available for this match."
      : isZh ? "这场比赛暂时没有经过核验的官方集锦。" : "No verified official highlights are available for this match yet.";
  }
  const followUps = [];
  if (templates?.matchFollowUps && teams.home && teams.away) {
    followUps.push(...templates.matchFollowUps({
      away: teams.away.name,
      completed: isCompletedFixture(fixture),
      home: teams.home.name
    }));
  } else if (teams.home && teams.away) {
    if (isCompletedFixture(fixture)) {
      followUps.push(isZh
        ? `${teams.home.name}对${teams.away.name}是谁进球？`
        : `Who scored in ${teams.home.name} vs ${teams.away.name}?`);
    }
    followUps.push(isZh ? `${teams.home.name}怎么踢？` : `How does ${teams.home.name} play?`);
    followUps.push(isZh ? `${teams.away.name}怎么踢？` : `How does ${teams.away.name} play?`);
  }

  return {
    fixture: {
      awayTeamId: fixture.awayTeamId || "",
      highlightVideo: fixture.highlightVideo || null,
      h2h: wantsH2h && fixture.h2h
        ? {
            ...fixture.h2h,
            summary: getMatchH2hSummary(fixture, teams, locale)
          }
        : null,
      homeTeamId: fixture.homeTeamId || "",
      id: fixture.id,
      kickoffLabel: formatKickoff(fixture.kickoffUtc, locale),
      penalties: fixture?.scoreDetails?.penalties || null,
      recap: getStructuredMatchRecap(fixture, teams, timeline, locale),
      score: fixture.score || null,
      stage: getStageLabel(fixture, locale),
      status: fixture.status,
      venue: fixture.venue || ""
    },
    followUps: followUps.slice(0, 3),
    focus,
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
  const templates = getLocaleTemplates(locale);
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
    const localizedPosition = getPlayerPositionLabel(profile?.position || "Player", locale);
    return {
      note: templates?.playerNote
        ? templates.playerNote({
            name: localizedName,
            skills: getLocalizedStyleLabel(profile?.skills?.[0] || "", locale)
          })
        : isZh
        ? profile?.noteZh || `${localizedName}主要通过${getLocalizedStyleLabel(profile?.skills?.[0] || "", locale) || "阅读比赛"}影响比赛。`
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
            position: isZh ? "球员" : templates?.watch?.({ players: [] })?.fallbackPosition || "Player"
          },
      team
    };
  });

  const matchLabel = fixtureTeams.home && fixtureTeams.away
    ? isZh
      ? `${fixtureTeams.home.name}对${fixtureTeams.away.name}`
      : `${fixtureTeams.home.name} vs ${fixtureTeams.away.name}`
    : isZh ? "下一场比赛" : "the next match";
  const localizedWatch = templates?.watch?.({
    matchLabel,
    players: players.map((player) => player.profile.displayName),
    requestedTeam: requestedSide?.team?.name || ""
  });
  return {
    fixtureId: fixture?.id || "",
    followUps: localizedWatch?.prompts || players
      .map((player) => isZh
        ? `介绍一下${player.profile.displayName}`
        : `Tell me about ${player.profile.displayName}`)
      .slice(0, 3),
    kind: "player-list",
    lead: localizedWatch?.lead || (requestedSide
      ? isZh
        ? `这三名${requestedSide.team.name}球员值得关注。`
        : `These are three ${requestedSide.team.name} players to watch.`
      : isZh
        ? `这三名球员值得在${matchLabel}中关注。`
        : `These are three players to watch for ${matchLabel}.`),
    players,
    title: localizedWatch?.title || (isZh ? "值得关注的球员" : "Players to watch")
  };
}

function resolvePersonalityReply(question, locale = "en") {
  const entry = BALL_BOY_PERSONALITY_REPLIES.find((candidate) =>
    candidate.patterns.some((pattern) => pattern.test(question))
  );
  if (!entry) {
    return null;
  }

  const copy = isZhLocale(locale)
    ? ZH_PERSONALITY_COPY[entry.id] || entry
    : getLocaleKnowledge(locale)?.personality?.[entry.id] || entry;
  return {
    contextPlayerName: entry.contextPlayerName || "",
    contextTeamId: entry.contextTeamId || "",
    eye: entry.eye,
    followUps: [],
    kind: "personality",
    label: copy.label,
    text: copy.text,
    topic: entry.id
  };
}

function getHelpReply(locale = "en") {
  const localizedHelp = getLocaleTemplates(locale)?.help;
  if (localizedHelp) {
    return { ...localizedHelp, kind: "help" };
  }
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
      lead: "选择一个主题。"
    };
  }
  return {
    categories: [
      { example: "How many goals does Mbappe have?", icon: "9", title: "Players" },
      { example: "How does Argentina play?", icon: "🇦🇷", title: "Countries" },
      { example: "Who won France vs Spain?", icon: "1–2", title: "Matches" },
      { example: "Explain a red card", icon: "🟥", title: "Rules" }
    ],
    followUps: [
      "Tell me about Kylian Mbappe",
      "How does Argentina play?",
      "Who won France vs Spain?"
    ],
    kind: "help",
    lead: "Choose a topic."
  };
}

function resolveRule(question, locale = "en") {
  if (containsPhrase(question, "offside")) {
    return { kind: "offside" };
  }
  for (const rule of RULE_CATALOG) {
    if (rule.keywords.some((keyword) => containsPhrase(question, keyword))) {
      const localized = isZhLocale(locale)
        ? ZH_RULE_COPY[rule.id]
        : getLocaleKnowledge(locale)?.rules?.[rule.id];
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
  const currentCandidates = candidates
    .filter((profile) => !profile.historical)
    .slice(0, 3);
  const historicalCandidates = candidates
    .filter((profile) => profile.historical)
    .sort((left, right) =>
      Math.max(...(right.tournamentYears || [0])) - Math.max(...(left.tournamentYears || [0]))
      || String(left.displayName).localeCompare(String(right.displayName))
    )
    .slice(0, 4);
  const selectedCandidates = [...currentCandidates, ...historicalCandidates];
  const optionData = selectedCandidates.map((profile) => {
    const team = profile.historical
      ? getHistoricalTeam(profile, { teams: teamsCache })
      : teamsCache.find((candidate) => candidate.id === profile.teamId);
    const name = getLocalizedPlayerName(
      profile.displayName,
      locale,
      profile.historical ? "archive" : "current"
    );
    return {
      era: profile.historical ? "past" : "current",
      name,
      position: getPlayerPositionLabel(profile.position, locale),
      profile,
      team: team ? getLocalizedTeamName(team, locale) : "",
      tournamentYears: profile.historical ? profile.tournamentYears || [] : [2026]
    };
  });
  const localizedClarification = getLocaleTemplates(locale)?.clarification?.(optionData);
  const prompts = localizedClarification?.prompts || optionData.map((option, index) => isZh
    ? `介绍一下${option.name}${option.team ? `（${option.team}）` : ""}`
    : `Tell me about ${selectedCandidates[index].displayName}${option.team ? ` from ${option.team}` : ""}`);
  return {
    kind: "clarify",
    lead: localizedClarification?.lead || (isZh
      ? "我找到了不止一名同名球员。你指哪一名？"
      : "Do you mean:"),
    options: optionData.map((option, index) => {
      const team = option.profile.historical
        ? getHistoricalTeam(option.profile, { teams: teamsCache })
        : teamsCache.find((candidate) => candidate.id === option.profile.teamId) || null;
      return {
        era: option.era,
        name: option.name,
        position: option.position,
        prompt: option.profile.historical
          ? getHistoricalPlayerPrompt(option.profile, locale)
          : prompts[index],
        team: localizeTeam(team, locale),
        tournamentYears: option.tournamentYears
      };
    }),
    followUps: []
  };
}

function getUnknownReply(locale = "en") {
  const localizedUnknown = getLocaleTemplates(locale)?.unknown;
  if (localizedUnknown) {
    return { ...localizedUnknown, kind: "unknown" };
  }
  if (isZhLocale(locale)) {
    return {
      followUps: ["报告问题", "介绍一下姆巴佩", "西班牙怎么踢？"],
      kind: "unknown",
      text: "我没看懂。试试问一名球员、一支国家队、一场比赛或一条规则。"
    };
  }
  return {
    followUps: [
      "Report issue",
      "Tell me about Kylian Mbappe",
      "How does Spain play?"
    ],
    kind: "unknown",
    text: "I didn’t understand that. Try a player, team, match, or rule."
  };
}

function getLocalizedCapabilityReply(rawQuestion, locale = "en") {
  const templates = getLocaleTemplates(locale);
  if (!templates) return null;
  const normalized = normalizeBallBoyText(rawQuestion);
  const years = normalized.match(/\b(?:19|20)\d{2}\b/g) || [];
  const unsupportedYear = years.find((year) => year !== "2026");
  if (unsupportedYear) {
    return {
      eye: "double-blink",
      followUps: getLocaleTemplates(locale)?.help?.followUps?.slice(0, 2) || [],
      kind: "personality",
      text: templates.scopeUnsupported(unsupportedYear)
    };
  }
  return null;
}

function isCoachQuestion(rawQuestion) {
  const normalized = normalizeBallBoyText(rawQuestion);
  return /\b(?:coach|manager|head coach|entrenador|seleccionador|director tecnico)\b/.test(normalized)
    || /(?:감독|사령탑)/.test(normalized);
}

async function buildCoachReply(team, locale = "en") {
  const templates = getLocaleTemplates(locale);
  if (!templates?.coachReply || !team) return null;
  const profiles = (await loadCoachProfiles()).filter((profile) => profile.teamId === team.id);
  const uniqueProfiles = new Map();
  for (const profile of profiles) {
    const identity = profile.sourceUrl || normalizeBallBoyText(profile.name);
    const existing = uniqueProfiles.get(identity);
    if (!existing || String(profile.name).length > String(existing.name).length) {
      uniqueProfiles.set(identity, profile);
    }
  }
  if (uniqueProfiles.size !== 1) {
    return {
      contextTeamId: team.id,
      eye: "double-blink",
      followUps: templates.coachFollowUps?.({ team: getLocalizedTeamName(team, locale) }) || [],
      kind: "personality",
      text: templates.coachUnavailable(getLocalizedTeamName(team, locale))
    };
  }
  const profile = [...uniqueProfiles.values()][0];
  const localizedTeam = getLocalizedTeamName(team, locale);
  const name = getLocalizedCoachName(profile.name, locale);
  const styles = (profile.styles || []).slice(0, 3).map((style) => getLocalizedStyleLabel(style, locale));
  return {
    contextTeamId: team.id,
    eye: "double-blink",
    followUps: templates.coachFollowUps?.({ team: localizedTeam }) || [],
    kind: "personality",
    text: templates.coachReply({
      name,
      sinceYear: profile.sinceYear,
      styles,
      team: localizedTeam
    })
  };
}

function getTournamentStageIntent(question) {
  if (/\b(?:semi final|semifinal)\b/.test(question)) return "semi-finals";
  if (/\b(?:quarter final|quarterfinal)\b/.test(question)) return "quarter-finals";
  if (/\b(?:third place|bronze final)\b/.test(question)) return "bronze-final";
  if (/\b(?:world cup final|the final|final match)\b/.test(question)) return "final";
  return "";
}

function buildTournamentStageReply(question, core, locale = "en") {
  const templates = getLocaleTemplates(locale);
  const stage = getTournamentStageIntent(question);
  if (!templates?.stageSchedule || !stage) return null;
  const fixtures = core.fixtures
    .filter((fixture) => (fixture.stage || fixture.round) === stage)
    .sort((left, right) => getFixtureTime(left) - getFixtureTime(right));
  if (fixtures.length === 1) {
    return buildMatchReply(fixtures[0], core, "when kickoff", locale);
  }
  const items = fixtures.map((fixture) => {
    const teams = getFixtureTeams(fixture, core.teamsById);
    const home = getLocalizedTeamName(teams.home, locale) || templates.fallbackHome;
    const away = getLocalizedTeamName(teams.away, locale) || templates.fallbackAway;
    return `${home} ${normalizeBallBoyLocale(locale) === "ko" ? "대" : "vs"} ${away} — ${formatKickoff(fixture.kickoffUtc, locale)}`;
  });
  return {
    eye: "double-blink",
    followUps: [],
    kind: "personality",
    text: templates.stageSchedule({ items, label: getStageLabel({ stage }, locale) })
  };
}

function rememberReply(reply, source = {}) {
  if (reply.kind === "player") {
    replyContext = {
      fixtureId: "",
      historicalPlayerId: reply.contextHistoricalPlayerId || "",
      playerName: reply.profile.displayName,
      teamId: reply.team?.id || source.teamId || "",
      teamIds: [],
      tournamentYears: reply.contextTournamentYears || []
    };
    return;
  }
  if (reply.kind === "country") {
    replyContext = {
      fixtureId: "",
      historicalPlayerId: "",
      playerName: "",
      teamId: reply.team.id,
      teamIds: [],
      tournamentYears: []
    };
    return;
  }
  if (reply.kind === "match") {
    replyContext = {
      fixtureId: reply.fixture.id,
      historicalPlayerId: "",
      playerName: "",
      teamId: source.teamId || "",
      teamIds: [],
      tournamentYears: []
    };
    return;
  }
  if (reply.kind === "matchup") {
    replyContext = {
      fixtureId: reply.fixture?.id || "",
      historicalPlayerId: "",
      playerName: "",
      teamId: "",
      teamIds: reply.contextTeamIds || [],
      tournamentYears: []
    };
    return;
  }
  if (reply.kind === "player-list") {
    replyContext = {
      fixtureId: reply.fixtureId || "",
      historicalPlayerId: "",
      playerName: "",
      teamId: source.teamId || "",
      teamIds: [],
      tournamentYears: []
    };
    return;
  }
  if (
    reply.kind === "personality" &&
    (reply.contextPlayerName || reply.contextTeamId)
  ) {
    replyContext = {
      fixtureId: "",
      historicalPlayerId: "",
      playerName: reply.contextPlayerName || "",
      teamId: reply.contextTeamId || "",
      teamIds: [],
      tournamentYears: []
    };
  }
}

export function rememberBallBoyReply(reply) {
  rememberReply(reply, { teamId: reply?.contextTeamId || "" });
}

export function resetBallBoyContext() {
  replyContext = {
    fixtureId: "",
    historicalPlayerId: "",
    playerName: "",
    teamId: "",
    teamIds: [],
    tournamentYears: []
  };
}

export async function getBallBoyReply(rawQuestion, options = {}) {
  const documentLocale = typeof document !== "undefined" ? document.documentElement?.lang : "en";
  const locale = normalizeBallBoyLocale(
    typeof options === "string" ? options : options?.locale || documentLocale
  );
  await ensureBallBoyLocalePack(locale);
  const asksCoach = isCoachQuestion(rawQuestion);
  const capabilityReply = getLocalizedCapabilityReply(rawQuestion, locale);
  if (capabilityReply) {
    return capabilityReply;
  }
  const question = normalizeBallBoyQuestion(rawQuestion, locale);
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
  const stageReply = buildTournamentStageReply(question, core, locale);
  if (stageReply) {
    return stageReply;
  }
  let teams = findTeamsInQuestion(question);
  const matchupIntent = getMatchupIntent(question);
  const contextTeam = getContextTeam(core);
  const contextFixtureId = getContextFixtureId(core);
  const asksWhoToWatch = /\b(who should i watch|players to watch|who to watch|key players?|top players?|best players)\b/.test(question);
  const asksForNamedPlayers =
    asksWhoToWatch ||
    /\b(who scored|scorer|top scorer|leading scorer|most goals|assists?)\b/.test(question);

  if (
    !teams.length &&
    contextTeam &&
    !contextFixtureId &&
    !replyContext.playerName &&
    isMatchQuestion(question)
  ) {
    teams = [contextTeam];
  }

  if (
    !teams.length &&
    matchupIntent !== "overview" &&
    Array.isArray(replyContext.teamIds) &&
    replyContext.teamIds.length === 2
  ) {
    teams = replyContext.teamIds.map((teamId) => core.teamsById.get(teamId)).filter(Boolean);
  }

  if (asksCoach) {
    if (!teams.length && contextTeam && !contextFixtureId) {
      teams = [contextTeam];
    }
    if (teams.length === 1) {
      const coachReply = await buildCoachReply(teams[0], locale);
      if (coachReply) {
        return coachReply;
      }
    }
  }

  if (asksWhoToWatch) {
    await ensureBallBoyPlayerNames(locale, "current");
    const playerIndex = await loadProfiles();
    if (!teams.length && contextTeam) {
      teams = [contextTeam];
    }
    const reply = buildWatchReply(core, playerIndex, teams, locale);
    reply.contextTeamId = teams[0]?.id || contextTeam?.id || "";
    return reply;
  }

  if (teams.length >= 2 && matchupIntent !== "overview") {
    return buildMatchupReply(teams, core, locale, matchupIntent);
  }

  if (teams.length >= 2 && !isMatchQuestion(question)) {
    return buildMatchupReply(teams, core, locale, "overview");
  }

  if (
    teams.length >= 2 ||
    (teams.length === 1 && isMatchQuestion(question) && !isTeamAggregateQuestion(question, teams))
  ) {
    const fixture = resolveFixture(question, teams, core.fixtures, contextFixtureId);
    if (fixture) {
      if (asksForNamedPlayers) {
        await ensureBallBoyPlayerNames(locale, "current");
      }
      const reply = buildMatchReply(fixture, core, question, locale);
      reply.contextTeamId = teams[0]?.id || "";
      return reply;
    }
    if (teams.length >= 2) {
      return buildMatchupReply(teams, core, locale, "overview");
    }
  }

  if (
    !teams.length &&
    contextFixtureId &&
    (isMatchQuestion(question) || /\b(tell me more|more)\b/.test(question))
  ) {
    const fixture = core.fixtures.find((candidate) => candidate.id === contextFixtureId);
    if (fixture) {
      if (asksForNamedPlayers) {
        await ensureBallBoyPlayerNames(locale, "current");
      }
      const reply = buildMatchReply(fixture, core, question, locale);
      return reply;
    }
  }

  const playerIntentPattern =
    /\b(player|who is|tell me|more|goal|goals|assist|assists|club|league|competition|position|role|age|birthday|born|value|valuation|worth|number|shirt|jersey|style|playstyle|strength|skills)\b/;
  const teamScopedPlayerIntentPattern =
    /\b(player|who is|tell me|goal|goals|assist|assists|club|league|competition|position|role|age|birthday|born|value|valuation|worth|number|shirt|jersey|strength|skills)\b/;
  const historicalFollowUpPattern =
    /\b(he|she|they|his|her|their|more|goal|goals|stats|style|play|club|league|competition|position|role|age|birthday|born|value|valuation|worth|number|shirt|jersey)\b/;
  const hasExplicitPlayerIntent =
    Boolean(replyContext.playerName || replyContext.historicalPlayerId) ||
    (
      teams.length
        ? teamScopedPlayerIntentPattern.test(question)
        : playerIntentPattern.test(question)
    );
  const likelyLocalizedBarePlayerIntent =
    ["es", "ko"].includes(locale) &&
    !teams.length &&
    question.split(/\s+/).length <= 5 &&
    /\p{Script=Hangul}/u.test(question);
  const shouldResolvePlayer =
    !teams.length ||
    Boolean(replyContext.playerName) ||
    teamScopedPlayerIntentPattern.test(question);
  if (shouldResolvePlayer) {
    const requestedYears = getRequestedTournamentYears(question);
    const asksForHistoricalPlayer =
      requestedYears.some((year) => year < 2026) ||
      /\b(past|historical|archive)\b/.test(question) ||
      (
        Boolean(replyContext.historicalPlayerId) &&
        !teams.length &&
        historicalFollowUpPattern.test(question)
      );
    let playerIndex = asksForHistoricalPlayer
      ? { aliases: [], byTeamAndName: new Map(), profiles: [] }
      : await loadProfiles();
    let currentNamesLoaded = false;
    if (
      !asksForHistoricalPlayer &&
      (hasExplicitPlayerIntent || likelyLocalizedBarePlayerIntent)
    ) {
      await ensureBallBoyPlayerNames(locale, "current");
      playerIndex = await loadProfiles();
      currentNamesLoaded = true;
    }
    const resolveCurrentPlayer = () => {
      let match = resolvePlayer(question, playerIndex, teams.map((team) => team.id));
      if (!match.profile && !match.candidates.length && teams.length) {
        match = resolvePlayer(question, playerIndex);
      }
      if (
        !match.profile &&
        !match.candidates.length &&
        !teams.length &&
        replyContext.playerName &&
        !replyContext.historicalPlayerId &&
        historicalFollowUpPattern.test(question)
      ) {
        match = {
          candidates: [],
          profile: getProfileByName(
            playerIndex,
            replyContext.playerName,
            replyContext.teamId
          )
        };
      }
      return match;
    };
    let playerMatch = asksForHistoricalPlayer
      ? { candidates: [], profile: null }
      : resolveCurrentPlayer();
    if (
      !asksForHistoricalPlayer &&
      (playerMatch.profile || playerMatch.candidates.length) &&
      !currentNamesLoaded
    ) {
      await ensureBallBoyPlayerNames(locale, "current");
      playerIndex = await loadProfiles();
      currentNamesLoaded = true;
      playerMatch = resolveCurrentPlayer();
    }
    if (playerMatch.candidates.length) {
      return getClarificationReply(playerMatch.candidates, locale);
    }
    if (playerMatch.profile) {
      const team = core.teamsById.get(playerMatch.profile.teamId) || null;
      const reply = buildPlayerReply(playerMatch.profile, team, core.fixtures, question, locale);
      return reply;
    }

    const shouldTryHistoricalPlayer =
      asksForHistoricalPlayer ||
      currentNamesLoaded ||
      hasExplicitPlayerIntent ||
      likelyLocalizedBarePlayerIntent;
    if (shouldTryHistoricalPlayer) {
      await ensureBallBoyPlayerNames(locale, "archive");
      const historicalPlayerIndex = await loadHistoricalPlayerIndex();
      if (
        replyContext.historicalPlayerId &&
        !teams.length &&
        historicalFollowUpPattern.test(question)
      ) {
        const contextProfile = historicalPlayerIndex.byId.get(replyContext.historicalPlayerId);
        if (contextProfile) {
          const hydrated = await hydrateHistoricalPlayer(
            contextProfile,
            replyContext.tournamentYears
          );
          return buildHistoricalPlayerReply(
            hydrated,
            getHistoricalTeam(hydrated, core),
            question,
            locale
          );
        }
      }

      const searchTerm = getPlayerSearchTerm(question, teams);
      const teamIds = teams.map((team) => team.id);
      const teamNames = teams.flatMap((team) => [team.name, team.officialName]).filter(Boolean);
      const currentPartialCandidates = asksForHistoricalPlayer
        ? []
        : findPartialPlayerCandidates(playerIndex, searchTerm, { teamIds });
      const historicalPartialCandidates = findPartialPlayerCandidates(
        historicalPlayerIndex,
        searchTerm,
        {
          historical: true,
          teamNames,
          tournamentYears: requestedYears.filter((year) => year < 2026)
        }
      );
      const partialCandidates = [
        ...currentPartialCandidates,
        ...historicalPartialCandidates
      ];
      if (partialCandidates.length > 1) {
        return getClarificationReply(partialCandidates, locale);
      }
      if (partialCandidates.length === 1) {
        const [profile] = partialCandidates;
        if (profile.historical) {
          const hydrated = await hydrateHistoricalPlayer(
            profile,
            requestedYears.filter((year) => year < 2026)
          );
          return buildHistoricalPlayerReply(
            hydrated,
            getHistoricalTeam(hydrated, core),
            question,
            locale
          );
        }
        const team = core.teamsById.get(profile.teamId) || null;
        return buildPlayerReply(profile, team, core.fixtures, question, locale);
      }

      const historicalMatch = resolveHistoricalPlayer(
        question,
        historicalPlayerIndex,
        teamNames,
        requestedYears.filter((year) => year < 2026)
      );
      if (historicalMatch.candidates.length) {
        return getClarificationReply(historicalMatch.candidates, locale);
      }
      if (historicalMatch.profile) {
        const hydrated = await hydrateHistoricalPlayer(
          historicalMatch.profile,
          requestedYears.filter((year) => year < 2026)
        );
        return buildHistoricalPlayerReply(
          hydrated,
          getHistoricalTeam(hydrated, core),
          question,
          locale
        );
      }
    }
  }

  if (!teams.length && contextTeam && /\b(they|their|team|country|style|wins|record|next|last|more)\b/.test(question)) {
    teams = [contextTeam];
  }
  if (teams.length === 1) {
    if (asksForNamedPlayers) {
      await ensureBallBoyPlayerNames(locale, "current");
    }
    const reply = buildCountryReply(teams[0], core, question, locale);
    return reply;
  }


  if (ruleReply) {
    return ruleReply;
  }

  return getUnknownReply(locale);
}
