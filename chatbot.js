import {
  getBallBoyReply,
  rememberBallBoyReply,
  resetBallBoyContext
} from "./chatbot-knowledge.js?v=2026-07-13-ball-boy-data-8";

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
const SCOUT_INITIAL_MESSAGE_HTML = `
  <div class="scout-message is-assistant">
    <p class="scout-speaker">Ball Boy</p>
    <p>You can ask me about players, countries, matches, or rules.</p>
  </div>
`;

const widget = document.createElement("aside");
widget.className = "scout-widget";
widget.id = "scout-widget";
widget.innerHTML = `
  <button class="scout-launcher" id="scout-launcher" type="button" aria-label="Open Ball Boy" aria-expanded="false" aria-controls="scout-panel">
    <span class="scout-visually-hidden">Open Ball Boy</span>
  </button>
  <span class="scout-eyes" aria-hidden="true">
    <span class="scout-eye"><span class="scout-pupil"></span></span>
    <span class="scout-eye"><span class="scout-pupil"></span></span>
  </span>
  <section class="scout-panel" id="scout-panel" role="dialog" aria-label="Ball Boy chat" aria-hidden="true" inert>
    <header class="scout-header">
      <div class="scout-heading">
        <p class="scout-title">Ball Boy</p>
        <p class="scout-status">Ask me about football</p>
      </div>
      <button class="scout-reset" id="scout-reset" type="button" aria-label="Start a new chat" title="New chat">
        <svg class="scout-reset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
        </svg>
      </button>
      <button class="scout-close" id="scout-close" type="button" aria-label="Close Ball Boy"></button>
    </header>
    <div class="scout-conversation" id="scout-conversation">
      <div class="scout-messages" id="scout-messages" aria-live="polite">
        ${SCOUT_INITIAL_MESSAGE_HTML}
      </div>
      <div class="scout-suggestions" id="scout-suggestions" aria-label="Suggested questions">
        <button class="scout-chip" type="button" data-scout-prompt="Tell me about Haaland">Tell me about Haaland</button>
        <button class="scout-chip" type="button" data-scout-prompt="How do Norway play?">How do Norway play?</button>
        <button class="scout-chip" type="button" data-scout-prompt="Who won Norway vs England?">Norway vs England</button>
        <button class="scout-chip" type="button" data-scout-prompt="Explain offside">Explain offside</button>
      </div>
    </div>
    <form class="scout-composer" id="scout-composer">
      <label class="scout-visually-hidden" for="scout-input">Ask Ball Boy a question</label>
      <input class="scout-input" id="scout-input" type="text" maxlength="180" autocomplete="off" placeholder="Ask about the World Cup…" />
      <button class="scout-send" type="submit" aria-label="Send question" disabled>↑</button>
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
const eyes = widget.querySelector(".scout-eyes");
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
    playEyeSequence([{ className: "is-eye-wide", duration: 380 }]);
    window.setTimeout(() => {
      if (isOpen && focus) {
        input.focus({ preventScroll: true });
      }
    }, reducedMotion.matches ? 0 : 360);
  } else {
    if (focus) {
      launcher.focus({ preventScroll: true });
    }
    if (isAvoidingTournamentShowNext) {
      playTournamentShowNextAwareness();
    }
  }
}

function appendMessage(text, speaker) {
  const message = document.createElement("div");
  message.className = `scout-message is-${speaker}`;
  if (speaker === "assistant") {
    const label = document.createElement("p");
    label.className = "scout-speaker";
    label.textContent = "Ball Boy";
    message.append(label);
  }

  const copy = document.createElement("p");
  copy.textContent = text;
  message.append(copy);
  messages.append(message);
  conversation.scrollTo({ top: conversation.scrollHeight, behavior: reducedMotion.matches ? "auto" : "smooth" });
}

function appendThinkingMessage() {
  const message = document.createElement("div");
  message.className = "scout-message is-assistant is-thinking";
  message.setAttribute("role", "status");

  const label = document.createElement("p");
  label.className = "scout-speaker";
  label.textContent = "Ball Boy";

  const accessibleStatus = document.createElement("span");
  accessibleStatus.className = "scout-visually-hidden";
  accessibleStatus.textContent = "Ball Boy is thinking";

  const dots = document.createElement("span");
  dots.className = "scout-thinking-dots";
  dots.setAttribute("aria-hidden", "true");
  for (let index = 0; index < 3; index += 1) {
    dots.append(document.createElement("span"));
  }

  message.append(label, accessibleStatus, dots);
  messages.append(message);
  conversation.scrollTo({ top: conversation.scrollHeight, behavior: reducedMotion.matches ? "auto" : "smooth" });
  return message;
}

function updateSendState() {
  sendButton.disabled = isReplyPending || !input.value.trim();
}

function resetConversation() {
  replyRequestToken += 1;
  isReplyPending = false;
  resetBallBoyContext();
  messages.innerHTML = SCOUT_INITIAL_MESSAGE_HTML;
  suggestions.hidden = false;
  input.value = "";
  updateSendState();
  conversation.scrollTo({ top: 0, behavior: "auto" });
  input.focus({ preventScroll: true });
  playEyeSequence([{ className: "is-eye-double-blink", duration: 540 }]);
}

function appendOffsideExplanation() {
  const message = document.createElement("div");
  message.className = "scout-message is-assistant is-visual scout-answer is-offside";
  message.innerHTML = `
    <div class="scout-rule-intro">
      <p class="scout-speaker">Ball Boy</p>
      <p>Offside stops attackers from standing by the opponent’s goal waiting for an easy pass.</p>
    </div>
    <div class="offside-card">
      <div class="offside-rule-summary">
        <div class="offside-summary-heading">
          <span>The one check</span>
          <span>Attacking →</span>
        </div>
        <p>Look at the instant a teammate kicks the pass. An attacker is in an offside position only if they are in the opponent’s half and closer to goal than both the ball and the second-last opponent.</p>
        <p class="offside-legend">P = passer · A = attacker · D = defender · GK = goalkeeper</p>
      </div>
      <div class="offside-scenarios">
        <article class="offside-scenario is-offside">
          <div class="offside-scenario-heading">
            <span>Offside</span>
            <small>Too early</small>
          </div>
          <div class="offside-mini-pitch is-offside" role="img" aria-label="Offside example. The attacker is beyond the second-last opponent line when the pass is kicked.">
            <div class="offside-mini-visual" aria-hidden="true">
              <span class="offside-mini-zone"></span>
              <span class="offside-mini-goal"></span>
              <span class="offside-mini-line"><span>Line</span></span>
              <span class="offside-mini-pass"></span>
              <span class="offside-mini-player is-passer">P</span>
              <span class="offside-mini-ball"></span>
              <span class="offside-mini-player is-cover">D</span>
              <span class="offside-mini-player is-line-defender">D</span>
              <span class="offside-mini-player is-keeper">GK</span>
              <span class="offside-mini-player is-attacker">A</span>
            </div>
          </div>
          <p><strong>A is already past the line</strong> when P passes, then plays the ball.</p>
        </article>
        <article class="offside-scenario is-onside">
          <div class="offside-scenario-heading">
            <span>Onside</span>
            <small>Legal run</small>
          </div>
          <div class="offside-mini-pitch is-onside" role="img" aria-label="Onside example. The attacker is level with the second-last opponent line when the pass is kicked, then runs forward.">
            <div class="offside-mini-visual" aria-hidden="true">
              <span class="offside-mini-zone"></span>
              <span class="offside-mini-goal"></span>
              <span class="offside-mini-line"><span>Line</span></span>
              <span class="offside-mini-pass"></span>
              <span class="offside-mini-player is-passer">P</span>
              <span class="offside-mini-ball"></span>
              <span class="offside-mini-player is-cover">D</span>
              <span class="offside-mini-player is-line-defender">D</span>
              <span class="offside-mini-player is-keeper">GK</span>
              <span class="offside-mini-player is-attacker">A</span>
            </div>
          </div>
          <p><strong>A is level with the line</strong>, then runs past it after P kicks the ball.</p>
        </article>
      </div>
      <div class="offside-quick-notes">
        <p><strong>Also onside:</strong> A is in their own half or behind the ball.</p>
        <p><strong>No direct offside:</strong> goal kick, throw-in, or corner.</p>
      </div>
      <div class="offside-explainers">
        <p><strong>Why second-last?</strong> The goalkeeper is usually the last opponent, so the last outfield defender often sets the line.</p>
        <p><strong>Position alone is not enough.</strong> It becomes an offence only if A plays the ball, challenges an opponent, blocks a view, or otherwise affects play.</p>
      </div>
    </div>
    <a class="scout-source-link" href="https://www.theifab.com/laws/latest/offside/" target="_blank" rel="noreferrer">Read the official IFAB law ↗</a>
    ${renderScoutFollowUps(["Explain a red card", "What is VAR?", "Explain a penalty kick"])}
  `;
  messages.append(message);
  scrollScoutMessageIntoView(message);
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

function renderScoutFollowUps(prompts = []) {
  const uniquePrompts = [...new Set(prompts.filter(Boolean))].slice(0, 3);
  if (!uniquePrompts.length) {
    return "";
  }
  return `
    <div class="scout-followups" aria-label="Follow-up questions">
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
      <p class="scout-speaker">Ball Boy</p>
      <span class="scout-answer-type">${escapeScoutHtml(label)}</span>
    </div>
  `;
}

function renderScoutAvatar(person, team, className = "") {
  const name = person?.displayName || person?.name || "Player";
  const imageUrl = getSafeScoutUrl(person?.imageUrl);
  return `
    <span class="scout-avatar ${escapeScoutHtml(className)}" aria-hidden="true">
      <span class="scout-avatar-fallback">${escapeScoutHtml(getScoutInitials(name))}</span>
      ${imageUrl ? `<img src="${escapeScoutHtml(imageUrl)}" alt="" loading="lazy" decoding="async" />` : ""}
      ${team?.flag ? `<span class="scout-avatar-flag">${escapeScoutHtml(team.flag)}</span>` : ""}
    </span>
  `;
}

function finishScoutVisualMessage(message) {
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
  scrollScoutMessageIntoView(message);
}

function scrollScoutMessageIntoView(message) {
  window.requestAnimationFrame(() => {
    conversation.scrollTo({
      top: Math.max(0, message.offsetTop - 10),
      behavior: reducedMotion.matches ? "auto" : "smooth"
    });
  });
}

function createScoutVisualMessage(kind, label, lead, body, followUps = []) {
  const message = document.createElement("div");
  message.className = `scout-message is-assistant is-visual scout-answer is-${kind}`;
  message.innerHTML = `
    <div class="scout-answer-intro">
      ${renderScoutAnswerHeading(label)}
      <p class="scout-answer-lead">${escapeScoutHtml(lead)}</p>
    </div>
    ${body}
    ${renderScoutFollowUps(followUps)}
  `;
  finishScoutVisualMessage(message);
}

function getOrdinal(value) {
  const number = Number(value);
  if (!Number.isInteger(number)) {
    return "";
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

function appendPlayerReply(reply) {
  const { age, profile, role, stats, team } = reply;
  const shirt = profile.shirtNumber !== "" ? ` · #${profile.shirtNumber}` : "";
  const roleClass = ["goal", "defend", "create", "attack-wide", "finish"].includes(role.zone)
    ? role.zone
    : "create";
  const skills = profile.skills.length
    ? profile.skills
        .map(
          (skill, index) => `
            <span class="scout-flow-step">${escapeScoutHtml(skill)}</span>
            ${index < profile.skills.length - 1 ? '<span class="scout-flow-arrow" aria-hidden="true">→</span>' : ""}
          `
        )
        .join("")
    : '<span class="scout-flow-step">Read the play</span>';
  const note = profile.note
    ? `
      <div class="scout-explainer">
        <p class="scout-section-label">Why watch them</p>
        <p>${escapeScoutHtml(truncateScoutText(profile.note, 225))}</p>
      </div>
    `
    : "";

  const body = `
    <article class="scout-data-card scout-player-card">
      <header class="scout-entity-header">
        ${renderScoutAvatar(profile, team, "is-large")}
        <div class="scout-entity-copy">
          <h3>${escapeScoutHtml(profile.displayName)}</h3>
          <p>${escapeScoutHtml(team?.flag || "")} ${escapeScoutHtml(team?.name || "")}${team ? " · " : ""}${escapeScoutHtml(profile.position)}${escapeScoutHtml(shirt)}</p>
          ${profile.club ? `<small>${escapeScoutHtml(profile.club)}</small>` : ""}
        </div>
      </header>
      <div class="scout-stat-strip" aria-label="This World Cup player statistics">
        <div><strong>${stats.goals}</strong><span>Goals</span></div>
        <div><strong>${stats.assists}</strong><span>Recorded assists</span></div>
        <div><strong>${age ?? "—"}</strong><span>Age</span></div>
      </div>
      <div class="scout-role-block">
        <div class="scout-section-heading">
          <span class="scout-section-label">Usual role zone</span>
          <span>${escapeScoutHtml(profile.position)}</span>
        </div>
        <div class="scout-role-pitch is-${escapeScoutHtml(roleClass)}" role="img" aria-label="Typical pitch area for ${escapeScoutHtml(profile.position)}">
          <span class="scout-role-third is-defend"><small>Defend</small></span>
          <span class="scout-role-third is-create"><small>Create</small></span>
          <span class="scout-role-third is-finish"><small>Finish</small></span>
          <span class="scout-role-marker" aria-hidden="true">${escapeScoutHtml(profile.shirtNumber || "•")}</span>
        </div>
      </div>
      <div class="scout-explainer">
        <p class="scout-section-label">Beginner version</p>
        <p>${escapeScoutHtml(role.summary)}</p>
      </div>
      <div class="scout-skill-flow" aria-label="Three things to watch">
        ${skills}
      </div>
      ${note}
    </article>
  `;
  createScoutVisualMessage("player", "Player", reply.lead, body, reply.followUps);
}

function renderCompactFixture(match, label) {
  if (!match?.home || !match?.away) {
    return "";
  }
  const hasScore = Number.isFinite(match.score?.home) && Number.isFinite(match.score?.away);
  const hasPenalties = Number.isFinite(match.penalties?.home) && Number.isFinite(match.penalties?.away);
  const center = hasScore
    ? `<strong>${Number(match.score.home)}–${Number(match.score.away)}</strong>${hasPenalties ? `<small>pens ${Number(match.penalties.home)}–${Number(match.penalties.away)}</small>` : ""}`
    : `<strong>vs</strong><small>${escapeScoutHtml(match.kickoffLabel)}</small>`;
  const centerLabel = hasScore
    ? `Score ${Number(match.score.home)} to ${Number(match.score.away)}${hasPenalties ? `. Penalties ${Number(match.penalties.home)} to ${Number(match.penalties.away)}` : ""}`
    : `Versus. ${match.kickoffLabel}`;
  return `
    <div class="scout-compact-fixture">
      <span class="scout-section-label">${escapeScoutHtml(label)}</span>
      <div class="scout-compact-score">
        <span class="${match.winnerTeamId === match.home.id ? "is-winner" : ""}">${escapeScoutHtml(match.home.flag)} ${escapeScoutHtml(match.home.name)}</span>
        <span class="scout-compact-score-center" aria-label="${escapeScoutHtml(centerLabel)}">${center}</span>
        <span class="${match.winnerTeamId === match.away.id ? "is-winner" : ""}">${escapeScoutHtml(match.away.flag)} ${escapeScoutHtml(match.away.name)}</span>
      </div>
    </div>
  `;
}

function appendCountryReply(reply) {
  const { groupStanding, record, team } = reply;
  const groupMeta = [
    Number.isFinite(Number(team.fifaRank)) ? `FIFA rank ${team.fifaRank}` : "",
    team.groupId ? `Group ${team.groupId}` : "",
    groupStanding ? `${getOrdinal(groupStanding.position)} in group · ${groupStanding.points} pts` : ""
  ].filter(Boolean).join(" · ");
  const form = record.form.length
    ? `
      <div class="scout-form-row" aria-label="Recent tournament form">
        <span class="scout-section-label">Form</span>
        <div>
          ${record.form
            .map((item) => {
              const title = {
                draw: "Draw",
                loss: "Loss",
                "shootout-loss": "Lost on penalties; counted as a draw",
                "shootout-win": "Advanced on penalties; counted as a draw",
                win: "Win"
              }[item.result] || item.result;
              return `<span class="scout-form-result is-${escapeScoutHtml(item.result)}" title="${escapeScoutHtml(title)}" aria-label="${escapeScoutHtml(title)}">${escapeScoutHtml(item.label)}</span>`;
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
    : '<span class="scout-flow-step">Adapt to the match</span>';
  const keyPlayers = reply.keyPlayers.length
    ? `
      <div class="scout-key-players">
        <p class="scout-section-label">Key players</p>
        <div>
          ${reply.keyPlayers
            .map(
              (player) => `<button type="button" data-scout-prompt="Tell me about ${escapeScoutHtml(player.name)}">${escapeScoutHtml(player.name)}</button>`
            )
            .join("")}
        </div>
      </div>
    `
    : "";
  const scorer = reply.topScorer
    ? `<p class="scout-top-scorer"><span>⚽</span><strong>${escapeScoutHtml(reply.topScorer.name)}</strong> leads them with ${reply.topScorer.goals} ${reply.topScorer.goals === 1 ? "goal" : "goals"}.</p>`
    : "";
  const shootoutResults = [
    record.shootoutAdvances
      ? `advanced ${record.shootoutAdvances === 1 ? "once" : `${record.shootoutAdvances} times`}`
      : "",
    record.shootoutExits
      ? `went out ${record.shootoutExits === 1 ? "once" : `${record.shootoutExits} times`}`
      : ""
  ].filter(Boolean);
  const shootoutNote = shootoutResults.length
    ? `<p class="scout-stat-note">On penalties: ${escapeScoutHtml(shootoutResults.join(" and "))}. Shootout matches count as draws in W–D–L.</p>`
    : "";
  const fixtureCount = [reply.lastMatch, reply.nextMatch].filter(Boolean).length;

  const body = `
    <article class="scout-data-card scout-country-card">
      <header class="scout-country-header">
        <span class="scout-country-flag" aria-hidden="true">${escapeScoutHtml(team.flag)}</span>
        <div>
          <h3>${escapeScoutHtml(team.name)}</h3>
          <p>${escapeScoutHtml(groupMeta)}</p>
        </div>
      </header>
      <div class="scout-stat-strip" aria-label="Full tournament record">
        <div><strong>${record.wins}</strong><span>Wins</span></div>
        <div><strong>${record.draws}</strong><span>Draws</span></div>
        <div><strong>${record.losses}</strong><span>Losses</span></div>
      </div>
      <p class="scout-goal-balance"><strong>${record.goalsFor}</strong> scored <span>·</span> <strong>${record.goalsAgainst}</strong> allowed</p>
      ${shootoutNote}
      ${form}
      <div class="scout-explainer">
        <p class="scout-section-label">How they play</p>
        <p>${escapeScoutHtml(reply.beginnerStyle)}</p>
      </div>
      <div class="scout-skill-flow" aria-label="Team style flow">${styleFlow}</div>
      ${scorer}
      ${keyPlayers}
      <div class="scout-fixture-pair ${fixtureCount === 1 ? "has-one" : ""}">
        ${renderCompactFixture(reply.lastMatch, "Last match")}
        ${renderCompactFixture(reply.nextMatch, "Next match")}
      </div>
    </article>
  `;
  createScoutVisualMessage("country", "Country", reply.lead, body, reply.followUps);
}

function appendMatchReply(reply) {
  const { fixture, teams } = reply;
  const isFinished = ["FT", "AET", "PEN"].includes(String(fixture.status || "").toUpperCase());
  const isLive = String(fixture.status || "").toUpperCase() === "LIVE";
  const hasScore = Number.isFinite(fixture.score?.home) && Number.isFinite(fixture.score?.away);
  const score = (isFinished || isLive) && hasScore
    ? `${Number(fixture.score.home)}<span aria-hidden="true">–</span>${Number(fixture.score.away)}`
    : '<span class="scout-versus">vs</span>';
  const penalties = fixture.penalties
    ? `<p class="scout-shootout-line">Penalties: ${Number(fixture.penalties.home)}–${Number(fixture.penalties.away)}</p>`
    : "";
  const timeline = reply.timeline.length
    ? `
      <div class="scout-match-timeline">
        <p class="scout-section-label">Goal timeline</p>
        ${reply.timeline
          .map((goal) => {
            const scoringTeam = goal.side === "home" ? teams.home : teams.away;
            return `
              <div class="scout-goal-row is-${escapeScoutHtml(goal.side)}">
                <time>${escapeScoutHtml(goal.minute)}</time>
                <span class="scout-goal-team" aria-label="${escapeScoutHtml(scoringTeam?.name || "Scoring team")}">${escapeScoutHtml(scoringTeam?.id || "TEAM")}</span>
                <span class="scout-goal-dot" aria-hidden="true">⚽</span>
                <span><strong>${escapeScoutHtml(goal.name)}</strong>${goal.penalty ? " (pen.)" : ""}${goal.assistName ? `<small>Assist: ${escapeScoutHtml(goal.assistName)}</small>` : ""}</span>
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
        <p class="scout-section-label">What changed the match</p>
        <ul>${fixture.recap.map((item) => `<li>${escapeScoutHtml(item)}</li>`).join("")}</ul>
      </div>
    `
    : "";
  const plans = !isFinished && teams.home && teams.away
    ? `
      <div class="scout-match-plans">
        ${[teams.home, teams.away]
          .map(
            (team) => `
              <div>
                <strong>${escapeScoutHtml(team.flag)} ${escapeScoutHtml(team.name)}</strong>
                <span>${escapeScoutHtml((team.styleTags || []).slice(0, 2).join(" · "))}</span>
              </div>
            `
          )
          .join("")}
      </div>
    `
    : "";
  let h2h = "";
  if (fixture.h2h) {
    const h2hText = fixture.h2h.status === "loaded"
      ? fixture.h2h.summary
      : fixture.h2h.status === "verified-empty"
        ? "No verified previous senior meetings before this fixture."
        : "Previous-meeting history is still being checked.";
    h2h = `
      <div class="scout-explainer">
        <p class="scout-section-label">Before this match</p>
        <p>${escapeScoutHtml(h2hText)}</p>
      </div>
    `;
  }
  const highlightUrl = getSafeScoutUrl(fixture.highlightVideo?.url);
  const highlight = highlightUrl
    ? `<a class="scout-highlight-link" href="${escapeScoutHtml(highlightUrl)}" target="_blank" rel="noreferrer">▶ Watch verified highlights <span>${escapeScoutHtml(fixture.highlightVideo.sourceName || "Official")}</span></a>`
    : "";

  const body = `
    <article class="scout-data-card scout-match-card">
      <div class="scout-match-meta">
        <span>${escapeScoutHtml(fixture.stage)}</span>
        <span>${escapeScoutHtml(fixture.kickoffLabel)}</span>
      </div>
      <div class="scout-scoreboard">
        <div class="${reply.winnerTeamId && reply.winnerTeamId === teams.home?.id ? "is-winner" : ""}">
          <span class="scout-score-flag">${escapeScoutHtml(teams.home?.flag || "")}</span>
          <strong>${escapeScoutHtml(teams.home?.name || "TBD")}</strong>
        </div>
        <div class="scout-score-value" aria-label="${hasScore ? `${fixture.score.home} to ${fixture.score.away}` : "versus"}">${score}</div>
        <div class="${reply.winnerTeamId && reply.winnerTeamId === teams.away?.id ? "is-winner" : ""}">
          <span class="scout-score-flag">${escapeScoutHtml(teams.away?.flag || "")}</span>
          <strong>${escapeScoutHtml(teams.away?.name || "TBD")}</strong>
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
  createScoutVisualMessage("match", "Match", reply.lead, body, reply.followUps);
}

function appendRuleReply(reply) {
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
      <div class="scout-rule-flow" role="img" aria-label="${escapeScoutHtml(rule.flow.map((step) => `${step.value}, ${step.label}`).join("; "))}">
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
      ${sourceUrl ? `<a class="scout-source-link" href="${escapeScoutHtml(sourceUrl)}" target="_blank" rel="noreferrer">Read the official IFAB law ↗</a>` : ""}
    </article>
  `;
  createScoutVisualMessage("rule", "Rule made simple", rule.lead, body, [
    "Explain offside",
    rule.id === "red-card" ? "Explain a yellow card" : "Explain a red card",
    rule.id === "penalty-kick" ? "What is a penalty shootout?" : "Explain a penalty kick"
  ]);
}

function appendHelpReply(reply) {
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
  createScoutVisualMessage("help", "What I know", reply.lead, body, reply.followUps);
}

function appendPlayerListReply(reply) {
  const body = `
    <div class="scout-watch-list">
      ${reply.players
        .map(
          (player) => `
            <button type="button" class="scout-watch-card" data-scout-prompt="Tell me about ${escapeScoutHtml(player.profile.displayName)}">
              ${renderScoutAvatar(player.profile, player.team)}
              <span>
                <strong>${escapeScoutHtml(player.profile.displayName)}</strong>
                <small>${escapeScoutHtml(player.team?.flag || "")} ${escapeScoutHtml(player.profile.position)}</small>
                <em>${escapeScoutHtml(truncateScoutText(player.note, 120))}</em>
              </span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
  createScoutVisualMessage("player-list", reply.title, reply.lead, body, reply.followUps);
}

function appendClarificationReply(reply) {
  const body = `
    <div class="scout-clarify-list">
      ${reply.options
        .map(
          (option) => `
            <button type="button" data-scout-prompt="Tell me about ${escapeScoutHtml(option.name)} from ${escapeScoutHtml(option.team?.name || "their country")}">
              <strong>${escapeScoutHtml(option.name)}</strong>
              <span>${escapeScoutHtml(option.team?.flag || "")} ${escapeScoutHtml(option.team?.name || "Country unavailable")}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
  createScoutVisualMessage("clarify", "Which player?", reply.lead, body, reply.followUps);
}

function appendPersonalityReply(reply) {
  const body = `
    <div class="scout-personality-stamp">
      <span class="scout-personality-face" aria-hidden="true">
        <i></i>
        <i></i>
      </span>
      <span>
        <small>Ball Boy status</small>
        <strong>${escapeScoutHtml(reply.badge || "Off duty")}</strong>
      </span>
    </div>
  `;
  createScoutVisualMessage(
    "personality",
    reply.label || "Off duty",
    reply.text,
    body,
    reply.followUps
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

function appendUnknownReply(reply) {
  const body = `<div class="scout-unknown-mark" aria-hidden="true">↗?</div>`;
  createScoutVisualMessage("unknown", "Try one more time", reply.text, body, reply.followUps);
}

function appendPreviewReply(reply) {
  if (reply.kind === "offside") {
    appendOffsideExplanation();
  } else if (reply.kind === "player") {
    appendPlayerReply(reply);
  } else if (reply.kind === "country") {
    appendCountryReply(reply);
  } else if (reply.kind === "match") {
    appendMatchReply(reply);
  } else if (reply.kind === "rule") {
    appendRuleReply(reply);
  } else if (reply.kind === "help") {
    appendHelpReply(reply);
  } else if (reply.kind === "player-list") {
    appendPlayerListReply(reply);
  } else if (reply.kind === "clarify") {
    appendClarificationReply(reply);
  } else if (reply.kind === "personality") {
    appendPersonalityReply(reply);
  } else {
    appendUnknownReply(reply);
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
  appendMessage(trimmed, "user");
  suggestions.hidden = true;
  input.value = "";
  isReplyPending = true;
  updateSendState();
  pauseRandomBlink();
  syncEyeAttention();
  const thinkingMessage = appendThinkingMessage();
  const replyPromise = getBallBoyReply(trimmed).catch(() => ({
    followUps: ["What can I ask?", "Explain offside"],
    kind: "unknown",
    text: "My data bag would not open. Try that once more. Even ball boys drop things."
  }));
  const [reply] = await Promise.all([replyPromise, waitForScoutReplyDelay()]);
  if (requestToken !== replyRequestToken) {
    return;
  }

  thinkingMessage.remove();
  isReplyPending = false;
  widget.classList.remove("is-eye-thinking");
  rememberBallBoyReply(reply);
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isOpen) {
    event.stopImmediatePropagation();
    setOpen(false);
  }
});
document.addEventListener("pointermove", queuePupilUpdate, { passive: true });
document.addEventListener("visibilitychange", scheduleBlink);
reducedMotion.addEventListener?.("change", scheduleBlink);
window.addEventListener(
  "resize",
  () => {
    juggleEyeCenter = null;
    queueTournamentShowNextSync();
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
scheduleBlink();
