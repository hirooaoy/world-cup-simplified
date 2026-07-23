export const KEY_INFORMATION_MODEL_VERSION = 2;
export const KEY_INFORMATION_SLOT_KEYS = Object.freeze(["identity", "matchup", "plan", "risk"]);
export const KEY_INFORMATION_MODEL_KINDS = Object.freeze([
  "current-lineup",
  "historical-evidence",
  "cancelled"
]);

export function resolveKeyInformationTeam(model, which, options = {}) {
  const optionKey = which === "opponent" ? "opponentName" : "teamName";
  return String(options[optionKey] || model?.[which]?.name || "").trim();
}

export function resolveKeyInformationPlayer(value, options = {}) {
  const sourceName = String(typeof value === "string" ? value : value?.name || "").trim();
  if (!sourceName) {
    return "";
  }
  return String(options.formatPlayerName?.(sourceName) || sourceName).trim();
}

export function resolveKeyInformationPlayers(names, options = {}) {
  return (names || []).map((name) => resolveKeyInformationPlayer(name, options)).filter(Boolean);
}

export function getHistoricalStageKey(stage = {}) {
  const round = String(stage.round || "").toLowerCase();
  const phase = String(stage.phase || "").toLowerCase();
  if (phase === "final-round") {
    return "final-round";
  }
  if (phase === "second-group-stage") {
    return "second-group";
  }
  if (stage.group && !round.includes("play-off") && !round.includes("replay")) {
    return "group";
  }
  if (round === "final") {
    return "final";
  }
  if (round.includes("third") || round.includes("match for third")) {
    return "third-place";
  }
  if (round.includes("semi")) {
    return "semi-final";
  }
  if (round.includes("quarter")) {
    return round.includes("replay") ? "quarter-final-replay" : "quarter-final";
  }
  if (round.includes("round of 16")) {
    return "round-of-16";
  }
  if (round.includes("first round") || round.includes("preliminary")) {
    return round.includes("replay") ? "first-round-replay" : "first-round";
  }
  if (round.includes("play-off")) {
    return "play-off";
  }
  if (round === "final round") return "final-round";
  return "other";
}

export function assertKeyInformationModel(model) {
  if (!model || model.version !== KEY_INFORMATION_MODEL_VERSION) {
    throw new Error(`Unsupported Key information locale model version: ${model?.version ?? "missing"}`);
  }
  if (!KEY_INFORMATION_MODEL_KINDS.includes(model.kind)) {
    throw new Error(`Unsupported Key information locale model kind: ${model.kind || "missing"}`);
  }
  const slotKeys = Object.keys(model.slots || {}).sort();
  const expected = [...KEY_INFORMATION_SLOT_KEYS].sort();
  if (slotKeys.length !== expected.length || slotKeys.some((key, index) => key !== expected[index])) {
    throw new Error(`Key information locale model ${model.kind} must expose exactly identity, matchup, plan, and risk slots`);
  }
  return model;
}

export function joinKeyInformationSentences(sentences, separator = " ") {
  if (!Array.isArray(sentences) || sentences.length !== 4 || sentences.some((sentence) => !String(sentence || "").trim())) {
    throw new Error("Localized Key information must contain exactly four non-empty semantic sentences");
  }
  return sentences.map((sentence) => String(sentence).trim()).join(separator);
}
