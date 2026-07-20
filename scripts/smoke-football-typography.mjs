import assert from "node:assert/strict";

import {
  renderFootballInlineHtml,
  tokenizeFootballInlineText
} from "../football-typography.js";

function semanticTokens(value) {
  return tokenizeFootballInlineText(value).filter((token) => token.type !== "text");
}

assert.deepEqual(semanticTokens("Paraguay won the shootout 4-3."), [
  { text: "4-3", type: "scoreline" }
]);
assert.deepEqual(semanticTokens("Finished 1–1 (4–3 pens)."), [
  { text: "1–1 (4–3 pens)", type: "result" }
]);
assert.deepEqual(semanticTokens("Terminó 1-1 (4-3 pen.)."), [
  { text: "1-1 (4-3 pen.)", type: "result" }
]);
assert.deepEqual(semanticTokens("1-1 (4-3 승부차기)"), [
  { text: "1-1 (4-3 승부차기)", type: "result" }
]);
assert.deepEqual(semanticTokens("They defended in a 4-5-1."), [
  { text: "4-5-1", type: "formation" }
]);
assert.deepEqual(semanticTokens("Scored at 90+4' after the 106th-minute winner."), [
  { text: "90+4'", type: "minute" },
  { text: "106th-minute", type: "minute" }
]);
assert.deepEqual(semanticTokens("Archive created on 2026-07-20."), []);
assert.deepEqual(semanticTokens("Round of 32 after extra time."), []);

const html = renderFootballInlineHtml("Paraguay < 4-3");
assert.equal(
  html,
  'Paraguay &lt; <span class="football-token football-token--scoreline">4-3</span>'
);

console.log("Football typography smoke checks passed.");
