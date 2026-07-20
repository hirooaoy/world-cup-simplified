function normalizePlayerCardText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function localizePlayerCardText(value, localize) {
  if (!value) {
    return "";
  }
  return normalizePlayerCardText(typeof localize === "function" ? localize(value) : value);
}

export function formatPlayerPosition(position) {
  const text = normalizePlayerCardText(position);
  if (!text) {
    return "";
  }
  return text.replace(/(^|[,/]\s*)(\p{Letter})/gu, (_, prefix, letter) => {
    return `${prefix}${letter.toLocaleUpperCase("en-US")}`;
  });
}

export function getPlayerCardUniformNumber(player, profile) {
  const value =
    profile?.uniformNumber ??
    profile?.shirtNumber ??
    profile?.jerseyNumber ??
    profile?.squadNumber ??
    player?.uniformNumber ??
    player?.shirtNumber ??
    player?.jerseyNumber ??
    player?.squadNumber ??
    player?.number;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function formatPlayerClubLine({
  club,
  league,
  fallback = "",
  language = "en",
  localizeClub,
  localizeLeague
} = {}) {
  const rawClub = normalizePlayerCardText(club);
  const rawLeague = normalizePlayerCardText(league);
  const localizedClub = rawClub
    ? localizePlayerCardText(rawClub, localizeClub)
    : normalizePlayerCardText(fallback);
  const localizedLeague = localizePlayerCardText(rawLeague, localizeLeague);

  if (!localizedLeague) {
    return localizedClub;
  }
  if (!localizedClub) {
    return localizedLeague;
  }
  return language === "zh"
    ? `${localizedClub}（${localizedLeague}）`
    : `${localizedClub} (${localizedLeague})`;
}
