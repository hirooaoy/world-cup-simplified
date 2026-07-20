const TOKEN_CLASS = "football-token";
const TOKEN_CLASS_BY_TYPE = Object.freeze({
  formation: `${TOKEN_CLASS} ${TOKEN_CLASS}--formation`,
  minute: `${TOKEN_CLASS} ${TOKEN_CLASS}--minute`,
  result: `${TOKEN_CLASS} ${TOKEN_CLASS}--result`,
  scoreline: `${TOKEN_CLASS} ${TOKEN_CLASS}--scoreline`
});
const TOKEN_PATTERNS = Object.freeze([
  Object.freeze({
    type: "result",
    pattern: /(^|[^\d–—-])(\d{1,2}\s*[-–—]\s*\d{1,2}\s*\(\s*(?:\d{1,2}\s*[-–—]\s*\d{1,2}\s*(?:pens?|pen\.|penales|승부차기|点球)|(?:승부차기|点球)\s*\d{1,2}\s*[-–—]\s*\d{1,2})\s*\))/giu
  }),
  Object.freeze({
    type: "formation",
    pattern: /(^|[^\d–—-])(\d{1,2}\s*[-–—]\s*\d{1,2}\s*[-–—]\s*\d{1,2})(?!\s*[-–—]\s*\d)/gu
  }),
  Object.freeze({
    type: "minute",
    pattern: /(^|[^\p{Letter}\p{Number}])(\d{1,3}(?:\+\d{1,2})?[′'’]|\d{1,3}(?:st|nd|rd|th)[-‑–—]minute)(?![\p{Letter}\p{Number}])/giu
  }),
  Object.freeze({
    type: "scoreline",
    pattern: /(^|[^\d–—-])(\d{1,2}\s*[-–—]\s*\d{1,2})(?!\s*[-–—]\s*\d)/gu
  })
]);
const FALLBACK_SELECTOR = [
  "[data-football-typography]",
  ".result-highlights li",
  ".highlight-row h3",
  ".highlight-row p",
  ".catch-up-subtitle",
  ".final-celebration-bullets li",
  ".scout-message p"
].join(", ");
const EXCLUDED_SELECTOR = `script, style, svg, input, textarea, select, option, code, pre, .player-card, .${TOKEN_CLASS}`;

function escapeFootballHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFootballTokenRanges(value) {
  const text = String(value ?? "");
  const candidates = TOKEN_PATTERNS.flatMap(({ type, pattern }, priority) => {
    pattern.lastIndex = 0;
    return [...text.matchAll(pattern)].map((match) => {
      const prefixLength = match[1]?.length || 0;
      const start = (match.index || 0) + prefixLength;
      return { end: start + match[2].length, priority, start, type };
    });
  }).sort((left, right) => left.start - right.start || left.priority - right.priority || right.end - left.end);

  const ranges = [];
  candidates.forEach((candidate) => {
    if (!ranges.some((range) => candidate.start < range.end && candidate.end > range.start)) {
      ranges.push(candidate);
    }
  });
  return ranges.sort((left, right) => left.start - right.start);
}

export function tokenizeFootballInlineText(value) {
  const text = String(value ?? "");
  const ranges = getFootballTokenRanges(text);
  if (!ranges.length) {
    return text ? [{ text, type: "text" }] : [];
  }

  const tokens = [];
  let cursor = 0;
  ranges.forEach(({ start, end, type }) => {
    if (start > cursor) {
      tokens.push({ text: text.slice(cursor, start), type: "text" });
    }
    tokens.push({ text: text.slice(start, end), type });
    cursor = end;
  });
  if (cursor < text.length) {
    tokens.push({ text: text.slice(cursor), type: "text" });
  }
  return tokens;
}

export function renderFootballInlineHtml(value, escapeHtml = escapeFootballHtml) {
  return tokenizeFootballInlineText(value)
    .map((token) => token.type === "text"
      ? escapeHtml(token.text)
      : `<span class="${TOKEN_CLASS_BY_TYPE[token.type]}">${escapeHtml(token.text)}</span>`)
    .join("");
}

export function appendFootballInlineText(element, value) {
  if (!element) {
    return 0;
  }
  const tokens = tokenizeFootballInlineText(value);
  tokens.forEach((token) => {
    if (token.type === "text") {
      element.append(element.ownerDocument.createTextNode(token.text));
      return;
    }
    const span = element.ownerDocument.createElement("span");
    span.className = TOKEN_CLASS_BY_TYPE[token.type];
    span.textContent = token.text;
    element.append(span);
  });
  return tokens.filter((token) => token.type !== "text").length;
}

function shouldTokenizeTextNode(node) {
  return Boolean(
    node?.nodeType === Node.TEXT_NODE &&
      node.nodeValue?.trim() &&
      !node.parentElement?.closest(EXCLUDED_SELECTOR) &&
      getFootballTokenRanges(node.nodeValue).length
  );
}

function tokenizeTextNode(node) {
  if (!shouldTokenizeTextNode(node)) {
    return 0;
  }
  const fragment = node.ownerDocument.createDocumentFragment();
  const count = appendFootballInlineText(fragment, node.nodeValue);
  node.replaceWith(fragment);
  return count;
}

export function protectFootballTypography(root) {
  if (!root) {
    return 0;
  }
  if (root.nodeType === Node.TEXT_NODE) {
    return tokenizeTextNode(root);
  }
  if (!(root instanceof Element || root instanceof DocumentFragment)) {
    return 0;
  }
  if (root instanceof Element && root.closest(EXCLUDED_SELECTOR)) {
    return 0;
  }

  const textNodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (shouldTokenizeTextNode(node)) {
      textNodes.push(node);
    }
    node = walker.nextNode();
  }
  return textNodes.reduce((count, textNode) => count + tokenizeTextNode(textNode), 0);
}

function getFallbackRoots(node) {
  if (!node || node.parentElement?.closest(`.${TOKEN_CLASS}`)) {
    return [];
  }
  if (node.nodeType === Node.TEXT_NODE) {
    return node.parentElement?.closest(FALLBACK_SELECTOR) ? [node] : [];
  }
  if (!(node instanceof Element)) {
    return [];
  }
  if (node.closest(`.${TOKEN_CLASS}`)) {
    return [];
  }
  const roots = [];
  if (node.matches(FALLBACK_SELECTOR)) {
    roots.push(node);
  } else {
    const parentRoot = node.closest(FALLBACK_SELECTOR);
    if (parentRoot) {
      roots.push(parentRoot);
    }
  }
  roots.push(...node.querySelectorAll(FALLBACK_SELECTOR));
  return roots;
}

function initializeFootballTypography() {
  document.querySelectorAll(FALLBACK_SELECTOR).forEach((root) => protectFootballTypography(root));

  const observer = new MutationObserver((mutations) => {
    const roots = new Set();
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") {
        getFallbackRoots(mutation.target).forEach((root) => roots.add(root));
        return;
      }
      mutation.addedNodes.forEach((node) => {
        getFallbackRoots(node).forEach((root) => roots.add(root));
      });
    });
    roots.forEach((root) => protectFootballTypography(root));
  });
  observer.observe(document.body, { characterData: true, childList: true, subtree: true });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeFootballTypography, { once: true });
  } else {
    initializeFootballTypography();
  }
}
