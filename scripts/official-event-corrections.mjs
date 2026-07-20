import { isPlayerNameMatch } from "./player-name-matching.mjs";

function eventMinuteSortValue(value) {
  const text = String(value ?? "").trim().toUpperCase();
  if (text === "HT") return 45.5;
  if (text === "ET") return 90.5;
  const match = /^(\d+)(?:\+(\d+))?$/.exec(text.replace(/'/g, ""));
  return match ? Number(match[1]) + Number(match[2] || 0) / 100 : Number.POSITIVE_INFINITY;
}

function sameCard(left, right) {
  return isPlayerNameMatch(left?.playerName, right?.playerName) &&
    left?.type === right?.type &&
    String(left?.minute ?? "") === String(right?.minute ?? "");
}

function sameSubstitution(left, right) {
  return isPlayerNameMatch(left?.offName, right?.offName) &&
    isPlayerNameMatch(left?.onName, right?.onName) &&
    String(left?.minute ?? "") === String(right?.minute ?? "");
}

function mergeEvents(existing, additions, sameEvent) {
  const merged = [...(Array.isArray(existing) ? existing : [])];
  for (const addition of Array.isArray(additions) ? additions : []) {
    if (!merged.some((event) => sameEvent(event, addition))) {
      merged.push({ ...addition });
    }
  }
  return merged.sort((left, right) => eventMinuteSortValue(left.minute) - eventMinuteSortValue(right.minute));
}

function latestTimestamp(left, right) {
  return Date.parse(right || "") > Date.parse(left || "") ? right : left;
}

export function applyEventCorrectionsToLineup(lineup, correction) {
  if (!lineup || !correction) return lineup;
  const next = structuredClone(lineup);
  next.sourceIds = [...new Set([...(next.sourceIds || []), ...(correction.sourceIds || [])])];
  next.checkedAt = latestTimestamp(next.checkedAt, correction.checkedAt);
  for (const side of ["home", "away"]) {
    if (!correction[side]) continue;
    next[side].events ||= { cards: [], staffCards: [], substitutions: [] };
    next[side].events.cards = mergeEvents(next[side].events.cards, correction[side].cards, sameCard);
    next[side].events.substitutions = mergeEvents(
      next[side].events.substitutions,
      correction[side].substitutions,
      sameSubstitution
    );
  }
  return next;
}

export function applyEventCorrectionsToFixtureMatchEvents(matchEvents, correction) {
  if (!matchEvents || !correction) return matchEvents;
  const next = structuredClone(matchEvents);
  next.sourceIds = [...new Set([...(next.sourceIds || []), ...(correction.sourceIds || [])])];
  next.checkedAt = latestTimestamp(next.checkedAt, correction.checkedAt);
  for (const side of ["home", "away"]) {
    if (!correction[side]) continue;
    next[side] ||= { cards: [], substitutions: [] };
    next[side].cards = mergeEvents(
      next[side].cards,
      (correction[side].cards || []).map((card) => ({ ...card, side })),
      sameCard
    );
    next[side].substitutions = mergeEvents(
      next[side].substitutions,
      (correction[side].substitutions || []).map((substitution) => ({ ...substitution, side })),
      sameSubstitution
    );
  }
  return next;
}
