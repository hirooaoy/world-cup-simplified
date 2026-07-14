import {
  getBallBoyReply,
  normalizeBallBoyLocale,
  preloadBallBoyCore,
  rememberBallBoyReply,
  resetBallBoyContext
} from "./chatbot-knowledge.js?v=2026-07-13-ball-boy-locale-3";

const SCOUT_PUPIL_TRAVEL = 3.6;
const SCOUT_REPLY_DELAY_MS = 650;
const SCOUT_SHOW_NEXT_GAP = 14;
const SCOUT_JUGGLE_RECORD_STORAGE_KEY = "world-cup-simplified-juggle-record";
const SCOUT_EYE_EXPRESSION_CLASSES = [
  "is-eye-aware-below",
  "is-eye-wide",
  "is-eye-double-blink",
  "is-eye-side-glance",
  "is-eye-happy",
  "is-eye-record",
  "is-eye-wince"
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
    suggestions: ["Explain offside", "Tell me about Mbappe", "How does Argentina play?"],
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
    whatIKnow: "What I know",
    whichPlayer: "Which player?",
    dataProblem: "Data problem",
    tryAgain: "Try one more time",
    offDuty: "Off duty",
    statusLabel: "Ball Boy status",
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
    assistsTitle: "Assists recorded in the loaded World Cup match events.",
    age: "Age",
    estimatedValue: "Est. value",
    value: "Value",
    estimatedValueTitle: "Estimated market value based on sourced public player data.",
    valueTitle: "Market value from sourced public player data.",
    prime: "Prime",
    usualRoleZone: "Usual role zone",
    roleZones: {
      goal: "Goal area",
      defend: "Defensive third",
      create: "Middle third",
      "attack-wide": "Wide attacking area",
      finish: "Finishing third"
    },
    typicalArea: (position, zone) => `Typical pitch area for ${position}: ${zone}`,
    defend: "Defend",
    create: "Create",
    finish: "Finish",
    beginnerVersion: "Beginner version",
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
    goalsBalance: (scored, allowed) => `${scored} scored · ${allowed} allowed`,
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
    matchChanges: "What changed the match",
    playPlans: "How they may play",
    noH2h: "No verified previous senior meetings before this fixture.",
    checkingH2h: "Previous-meeting history is still being checked.",
    beforeMatch: "Before this match",
    verifiedHighlights: "Watch verified highlights",
    official: "Official",
    tbd: "TBD",
    scoreAria: (home, away) => `${home} to ${away}`,
    flowAriaSeparator: "; ",
    watchListTitle: "Players to watch",
    errorText: "The data did not load. Try that once more.",
    errorFollowUps: ["What can I ask?", "Explain offside"]
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
    suggestions: ["解释越位", "介绍一下姆巴佩", "阿根廷怎么踢？"],
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
    whatIKnow: "我能回答什么",
    whichPlayer: "你指哪名球员？",
    dataProblem: "数据出了点问题",
    tryAgain: "换个说法再试一次",
    offDuty: "休息中",
    statusLabel: "球童状态",
    countryUnavailable: "国家队信息暂无",
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
    assistsTitle: "助攻数据来自已载入的世界杯比赛事件。",
    age: "年龄",
    estimatedValue: "估算身价",
    value: "身价",
    estimatedValueTitle: "依据已注明来源的公开球员资料估算。",
    valueTitle: "身价数据来自已注明来源的公开球员资料。",
    prime: "巅峰",
    usualRoleZone: "常见活动区域",
    roleZones: {
      goal: "球门区",
      defend: "防守三区",
      create: "中场区域",
      "attack-wide": "进攻边路",
      finish: "终结区域"
    },
    typicalArea: (position, zone) => `${position}通常活动在${zone}`,
    defend: "防守",
    create: "组织",
    finish: "终结",
    beginnerVersion: "新手版",
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
    matchChanges: "比赛转折点",
    playPlans: "可能的比赛方式",
    noH2h: "这场比赛前，双方没有经过核验的成年国家队交锋记录。",
    checkingH2h: "双方过往交锋记录仍在核验中。",
    beforeMatch: "赛前交锋",
    verifiedHighlights: "观看已核验的官方集锦",
    official: "官方",
    tbd: "待定",
    scoreAria: (home, away) => `${home}比${away}`,
    flowAriaSeparator: "；",
    watchListTitle: "值得关注的球员",
    errorText: "数据没有载入。请再试一次。",
    errorFollowUps: ["我可以问什么？", "解释越位"]
  }
};

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
  <span class="scout-eyes" aria-hidden="true">
    <span class="scout-eye"><span class="scout-pupil"></span></span>
    <span class="scout-eye"><span class="scout-pupil"></span></span>
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
let canonicalTurns = [];
let localeRenderToken = 0;

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

function pauseRandomBlink() {
  window.clearTimeout(blinkTimer);
  blinkTimer = 0;
  widget.classList.remove("is-blinking");
}

function scheduleBlink() {
  pauseRandomBlink();
  if (
    reducedMotion.matches ||
    document.hidden ||
    isJuggleActive ||
    isEyeExpressionActive ||
    isReplyPending
  ) {
    return;
  }

  blinkTimer = window.setTimeout(() => {
    blinkTimer = 0;
    if (document.hidden || isJuggleActive || isEyeExpressionActive || isReplyPending) {
      scheduleBlink();
      return;
    }
    widget.classList.add("is-blinking");
    window.setTimeout(() => widget.classList.remove("is-blinking"), 135);
    scheduleBlink();
  }, 3400 + Math.random() * 4300);
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
  clearEyeExpression({ restore: false });
  pauseRandomBlink();

  if (reducedMotion.matches || !steps.length) {
    syncEyeAttention();
    scheduleBlink();
    return;
  }

  const sequenceToken = eyeExpressionToken;
  isEyeExpressionActive = true;
  widget.classList.remove("is-eye-thinking");

  const advance = (index) => {
    if (sequenceToken !== eyeExpressionToken) {
      return;
    }

    removeEyeExpressionClasses();
    const step = steps[index];
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
    }, 340);
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
    playEyeSequence([{ className: "is-eye-wince", duration: 1100, pupil: { x: -1.7, y: 1.6 } }]);
    return;
  }

  if (isNewBest) {
    playEyeSequence([
      { className: "is-eye-record", duration: 590 },
      { className: "is-eye-happy", duration: 560 }
    ]);
    return;
  }

  playEyeSequence([{ className: "is-eye-happy", duration: 1150 }]);
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
    void preloadBallBoyCore();
    playEyeSequence([{ className: "is-eye-wide", duration: 380 }]);
    queueScoutMoreButtonSync();
    window.setTimeout(() => {
      if (isOpen && focus) {
        input.focus({ preventScroll: true });
      }
    }, reducedMotion.matches ? 0 : 360);
  } else {
    syncScoutMoreButton();
    if (focus) {
      launcher.focus({ preventScroll: true });
    }
    if (isAvoidingTournamentShowNext) {
      playTournamentShowNextAwareness();
    }
  }
}

function appendMessage(text, speaker, { scroll = true } = {}) {
  const message = document.createElement("div");
  message.className = `scout-message is-${speaker}`;
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
  replyRequestToken += 1;
  isReplyPending = false;
  resetBallBoyContext();
  canonicalTurns = [];
  currentAnswerPrompt = "";
  messages.innerHTML = getScoutInitialMessageHtml();
  suggestions.innerHTML = getScoutSuggestionsHtml();
  suggestions.hidden = false;
  input.value = "";
  updateSendState();
  conversation.scrollTo({ top: 0, behavior: "auto" });
  queueScoutMoreButtonSync();
  input.focus({ preventScroll: true });
  playEyeSequence([{ className: "is-eye-double-blink", duration: 540 }]);
}

function appendOffsideExplanation({ scroll = true } = {}) {
  const copy = isScoutZh()
    ? {
        intro: "越位规则是为了防止进攻球员一直站在对方球门前等轻松传球。",
        check: "只看一个时刻",
        direction: "进攻方向 →",
        summary: "看队友踢出传球的那一刻。只有当进攻球员身处对方半场，而且比球和倒数第二名防守队员都更靠近球门时，才处于越位位置。",
        legend: "P = 传球者 · A = 进攻球员 · D = 防守球员 · GK = 门将",
        offside: "越位",
        tooEarly: "启动太早",
        offsideAria: "越位示例。传球瞬间，进攻球员已经越过倒数第二名防守队员形成的越位线。",
        line: "越位线",
        offsideExample: "P传球时，A已经越过越位线，随后参与进攻。",
        onside: "不越位",
        legalRun: "合法跑动",
        onsideAria: "不越位示例。传球瞬间，进攻球员与倒数第二名防守队员平行，之后才向前跑。",
        onsideExample: "P踢球时，A与越位线平行；传球后再向前跑。",
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
        intro: "Offside stops attackers from standing by the opponent’s goal waiting for an easy pass.",
        check: "The one check",
        direction: "Attacking →",
        summary: "Look at the instant a teammate kicks the pass. An attacker is in an offside position only if they are in the opponent’s half and closer to goal than both the ball and the second-last opponent.",
        legend: "P = passer · A = attacker · D = defender · GK = goalkeeper",
        offside: "Offside",
        tooEarly: "Too early",
        offsideAria: "Offside example. The attacker is beyond the second-last opponent line when the pass is kicked.",
        line: "Line",
        offsideExample: "A is already past the line when P passes, then plays the ball.",
        onside: "Onside",
        legalRun: "Legal run",
        onsideAria: "Onside example. The attacker is level with the second-last opponent line when the pass is kicked, then runs forward.",
        onsideExample: "A is level with the line, then runs past it after P kicks the ball.",
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
  try {
    const url = new URL(String(value || ""), window.location.href);
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

function renderScoutAnswerHeading(label) {
  return `
    <div class="scout-answer-heading">
      <p class="scout-speaker">${escapeScoutHtml(scoutText("assistantName"))}</p>
      <span class="scout-answer-type">${escapeScoutHtml(label)}</span>
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

function createScoutVisualMessage(kind, label, lead, body, followUps = [], options = {}) {
  const message = document.createElement("div");
  message.className = `scout-message is-assistant is-visual scout-answer is-${kind}`;
  message.innerHTML = `
    <div class="scout-answer-intro ${lead ? "" : "has-no-lead"}">
      ${renderScoutAnswerHeading(label)}
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

function appendPlayerReply(reply, options = {}) {
  const { age, profile, role, stats, team } = reply;
  const shirt = profile.shirtNumber !== "" ? ` · #${profile.shirtNumber}` : "";
  const clubLine = profile.club
    ? `${profile.club}${profile.league ? ` (${profile.league})` : ""}`
    : "";
  const marketValue = formatScoutMarketValue(profile.marketValue?.value);
  const marketValueLabel = profile.marketValue?.estimated ? scoutText("estimatedValue") : scoutText("value");
  const marketValueTitle = profile.marketValue?.estimated
    ? scoutText("estimatedValueTitle")
    : scoutText("valueTitle");
  const primeValue = profile.peakMarketValue
    ? `<em>${escapeScoutHtml(scoutText("prime"))} ${escapeScoutHtml(formatScoutMarketValue(profile.peakMarketValue))}</em>`
    : "";
  const roleClass = ["goal", "defend", "create", "attack-wide", "finish"].includes(role.zone)
    ? role.zone
    : "create";
  const roleZoneLabel = scoutText("roleZones")[roleClass];
  const skills = profile.skills.length
    ? profile.skills
        .map(
          (skill, index) => `
            <span class="scout-flow-step">${escapeScoutHtml(skill)}</span>
            ${index < profile.skills.length - 1 ? '<span class="scout-flow-arrow" aria-hidden="true">→</span>' : ""}
          `
        )
        .join("")
    : `<span class="scout-flow-step">${escapeScoutHtml(scoutText("readPlay"))}</span>`;
  const note = profile.note
    ? `
      <div class="scout-explainer">
        <p class="scout-section-label">${escapeScoutHtml(scoutText("whyWatch"))}</p>
        <p>${escapeScoutHtml(profile.note)}</p>
      </div>
    `
    : "";

  const body = `
    <article class="scout-data-card scout-player-card">
      <header class="scout-entity-header">
        ${renderScoutAvatar(profile, team, "is-large")}
        <div class="scout-entity-copy">
          <h3>${escapeScoutHtml(profile.displayName)}</h3>
          <p>${renderScoutFlag(team, "scout-inline-flag", { decorative: true })}<span>${escapeScoutHtml(team?.name || "")}${team ? " · " : ""}${escapeScoutHtml(profile.position)}${escapeScoutHtml(shirt)}</span></p>
          ${clubLine ? `<small title="${escapeScoutHtml(clubLine)}">${escapeScoutHtml(clubLine)}</small>` : ""}
        </div>
      </header>
      <div class="scout-player-facts" aria-label="${escapeScoutHtml(scoutText("worldCupStats"))}">
        <section class="scout-player-fact-section" aria-label="${escapeScoutHtml(scoutText("thisWorldCup"))}">
          <p class="scout-section-label">${escapeScoutHtml(scoutText("thisWorldCup"))}</p>
          <div class="scout-player-fact-row">
            <div><strong>${stats.goals}</strong><span>${escapeScoutHtml(scoutText("goals"))}</span></div>
            <div aria-label="${escapeScoutHtml(scoutText("recordedAssists", stats.assists))}" title="${escapeScoutHtml(scoutText("assistsTitle"))}"><strong>${stats.assists}</strong><span>${escapeScoutHtml(scoutText("assists"))}</span></div>
          </div>
        </section>
        <section class="scout-player-fact-section" aria-label="${escapeScoutHtml(scoutText("playerDetails"))}">
          <p class="scout-section-label">${escapeScoutHtml(scoutText("playerDetails"))}</p>
          <div class="scout-player-fact-row">
            <div><strong>${age ?? "—"}</strong><span>${escapeScoutHtml(scoutText("age"))}</span></div>
            <div class="is-value" title="${escapeScoutHtml(marketValueTitle)}"><strong>${escapeScoutHtml(marketValue)}</strong><span>${escapeScoutHtml(marketValueLabel)}</span>${primeValue}</div>
          </div>
        </section>
      </div>
      <div class="scout-role-block">
        <div class="scout-section-heading">
          <span class="scout-section-label">${escapeScoutHtml(scoutText("usualRoleZone"))}</span>
          <span>${escapeScoutHtml(roleZoneLabel)}</span>
        </div>
        <div class="scout-role-pitch is-${escapeScoutHtml(roleClass)}" role="img" aria-label="${escapeScoutHtml(scoutText("typicalArea", profile.position, roleZoneLabel))}">
          <span class="scout-role-third is-defend"><small>${escapeScoutHtml(scoutText("defend"))}</small></span>
          <span class="scout-role-third is-create"><small>${escapeScoutHtml(scoutText("create"))}</small></span>
          <span class="scout-role-third is-finish"><small>${escapeScoutHtml(scoutText("finish"))}</small></span>
          <span class="scout-role-marker" aria-hidden="true">${escapeScoutHtml(profile.shirtNumber || "•")}</span>
        </div>
      </div>
      <div class="scout-explainer">
        <p class="scout-section-label">${escapeScoutHtml(scoutText("beginnerVersion"))}</p>
        <p>${escapeScoutHtml(role.summary)}</p>
      </div>
      <div class="scout-skill-section">
        <p class="scout-section-label">${escapeScoutHtml(scoutText("signatureTraits"))}</p>
        <div class="scout-skill-flow" aria-label="${escapeScoutHtml(scoutText("threeTraits"))}">
          ${skills}
        </div>
      </div>
      ${note}
    </article>
  `;
  createScoutVisualMessage(
    "player",
    scoutText("player"),
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
  const fixtureCount = [reply.lastMatch, reply.nextMatch].filter(Boolean).length;
  const repeatsLead = getScoutPromptKey(reply.lead) === getScoutPromptKey(reply.beginnerStyle);

  const body = `
    <article class="scout-data-card scout-country-card">
      <header class="scout-country-header">
        ${renderScoutFlag(team, "scout-country-flag", { decorative: true })}
        <div>
          <h3>${escapeScoutHtml(team.name)}</h3>
          <p>${escapeScoutHtml(groupMeta)}</p>
        </div>
      </header>
      <div class="scout-stat-strip" aria-label="${escapeScoutHtml(scoutText("fullRecord"))}">
        <div><strong>${record.wins}</strong><span>${escapeScoutHtml(scoutText("wins"))}</span></div>
        <div><strong>${record.draws}</strong><span>${escapeScoutHtml(scoutText("draws"))}</span></div>
        <div><strong>${record.losses}</strong><span>${escapeScoutHtml(scoutText("losses"))}</span></div>
      </div>
      <p class="scout-goal-balance">${isScoutZh()
        ? `<strong>${record.goalsFor}</strong>进球 <span>·</span> <strong>${record.goalsAgainst}</strong>失球`
        : `<strong>${record.goalsFor}</strong> scored <span>·</span> <strong>${record.goalsAgainst}</strong> allowed`}</p>
      ${shootoutNote}
      ${form}
      <div class="scout-explainer">
        <p class="scout-section-label">${escapeScoutHtml(scoutText("howTheyPlay"))}</p>
        ${repeatsLead ? "" : `<p>${escapeScoutHtml(reply.beginnerStyle)}</p>`}
      </div>
      <div class="scout-skill-flow" aria-label="${escapeScoutHtml(scoutText("teamStyleFlow"))}">${styleFlow}</div>
      ${scorer}
      ${keyPlayers}
      <div class="scout-fixture-pair ${fixtureCount === 1 ? "has-one" : ""}">
        ${renderCompactFixture(reply.lastMatch, scoutText("lastMatch"))}
        ${renderCompactFixture(reply.nextMatch, scoutText("nextMatch"))}
      </div>
    </article>
  `;
  createScoutVisualMessage("country", scoutText("country"), reply.lead, body, reply.followUps, options);
}

function appendMatchReply(reply, options = {}) {
  const { fixture, teams } = reply;
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
    ? `<a class="scout-highlight-link" href="${escapeScoutHtml(highlightUrl)}" target="_blank" rel="noreferrer">▶ ${escapeScoutHtml(scoutText("verifiedHighlights"))} <span>${escapeScoutHtml(fixture.highlightVideo.sourceName || scoutText("official"))}</span></a>`
    : "";

  const body = `
    <article class="scout-data-card scout-match-card">
      <div class="scout-match-meta">
        <span>${escapeScoutHtml(fixture.stage)}</span>
        <span>${statusLabel ? `${escapeScoutHtml(statusLabel)} · ` : ""}${escapeScoutHtml(fixture.kickoffLabel)}</span>
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
      ${timeline}
      ${plans}
      ${recap}
      ${h2h}
      ${highlight}
    </article>
  `;
  createScoutVisualMessage("match", scoutText("match"), reply.lead, body, reply.followUps, options);
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
  createScoutVisualMessage("rule", scoutText("ruleSimple"), rule.lead, body, isScoutZh()
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
  createScoutVisualMessage("help", scoutText("whatIKnow"), reply.lead, body, [], options);
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
  createScoutVisualMessage("player-list", reply.title || scoutText("watchListTitle"), reply.lead, body, [], options);
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
  createScoutVisualMessage("clarify", scoutText("whichPlayer"), reply.lead, body, [], options);
}

function appendPersonalityReply(reply, options = {}) {
  const body = `
    <div class="scout-personality-stamp">
      <span class="scout-personality-face" aria-hidden="true">
        <i></i>
        <i></i>
      </span>
      <span>
        <small>${escapeScoutHtml(scoutText("statusLabel"))}</small>
        <strong>${escapeScoutHtml(reply.badge || scoutText("offDuty"))}</strong>
      </span>
    </div>
  `;
  createScoutVisualMessage(
    "personality",
    reply.label || scoutText("offDuty"),
    reply.text,
    body,
    reply.followUps,
    options
  );
}

function playPersonalityEyeReaction(eye) {
  const sequences = {
    "double-blink": [
      { className: "is-eye-double-blink", duration: 540 }
    ],
    happy: [
      { className: "is-eye-happy", duration: 760 }
    ],
    "side-glance": [
      { className: "is-eye-side-glance", duration: 760, pupil: { x: -3.35, y: 0.35 } }
    ],
    wide: [
      { className: "is-eye-wide", duration: 480 }
    ],
    wince: [
      { className: "is-eye-wince", duration: 720, pupil: { x: 2.8, y: 0.3 } }
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
  const body = `<div class="scout-unknown-mark" aria-hidden="true"><i></i><i></i></div>`;
  createScoutVisualMessage(
    reply.kind === "error" ? "error" : "unknown",
    reply.kind === "error" ? scoutText("dataProblem") : scoutText("tryAgain"),
    reply.text,
    body,
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
  isReplyPending = Boolean(turns.length);
  resetBallBoyContext();
  currentAnswerPrompt = "";
  messages.innerHTML = turns.length ? "" : getScoutInitialMessageHtml();
  suggestions.hidden = Boolean(turns.length);
  suggestions.innerHTML = getScoutSuggestionsHtml();
  updateSendState();

  for (const turn of turns) {
    appendMessage(turn.question, "user", { scroll: false });
    const reply = await getBallBoyReply(turn.question, { locale: scoutLocale })
      .catch(() => getScoutErrorReply());
    if (renderToken !== localeRenderToken || requestToken !== replyRequestToken) {
      return;
    }
    turn.reply = reply;
    rememberBallBoyReply(reply);
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
  appendMessage(trimmed, "user");
  suggestions.hidden = true;
  input.value = "";
  isReplyPending = true;
  updateSendState();
  pauseRandomBlink();
  syncEyeAttention();
  const thinkingMessage = appendThinkingMessage();
  const requestedLocale = scoutLocale;
  const replyPromise = getBallBoyReply(trimmed, { locale: requestedLocale })
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
suggestions.addEventListener("click", (event) => {
  const promptButton = event.target.closest("[data-scout-prompt]");
  if (promptButton) {
    submitQuestion(promptButton.dataset.scoutPrompt);
  }
});
messages.addEventListener("click", (event) => {
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isOpen) {
    event.stopImmediatePropagation();
    setOpen(false);
  }
});
document.addEventListener("pointermove", queuePupilUpdate, { passive: true });
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
  queueTournamentShowNextSync,
  { passive: true }
);
window.visualViewport?.addEventListener(
  "scroll",
  queueTournamentShowNextSync,
  { passive: true }
);

initializeJuggleEyeReactions();
initializeTournamentShowNextAvoidance();
applyScoutStaticLocale();
scheduleBlink();
