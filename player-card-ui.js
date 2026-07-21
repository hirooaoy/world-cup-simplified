function normalizePlayerCardText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function localizePlayerCardText(value, localize) {
  if (!value) {
    return "";
  }
  return normalizePlayerCardText(typeof localize === "function" ? localize(value) : value);
}

const WORLD_CUP_REFERENCE_DATES = Object.freeze({
  1930: "1930-07-30",
  1934: "1934-06-10",
  1938: "1938-06-19",
  1950: "1950-07-16",
  1954: "1954-07-04",
  1958: "1958-06-29",
  1962: "1962-06-17",
  1966: "1966-07-30",
  1970: "1970-06-21",
  1974: "1974-07-07",
  1978: "1978-06-25",
  1982: "1982-07-11",
  1986: "1986-06-29",
  1990: "1990-07-08",
  1994: "1994-07-17",
  1998: "1998-07-12",
  2002: "2002-06-30",
  2006: "2006-07-09",
  2010: "2010-07-11",
  2014: "2014-07-13",
  2018: "2018-07-15",
  2022: "2022-12-18",
  2026: "2026-07-19"
});

export function getPlayerCardWorldCupReferenceDate(year) {
  return WORLD_CUP_REFERENCE_DATES[Number(year)] || "";
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

export function formatPlayerCardWorldCupContext({ year, language = "en" } = {}) {
  const edition = Number(year);
  if (!Number.isInteger(edition) || edition < 1930) {
    return "";
  }

  if (language === "zh") {
    return `${edition}年世界杯期间`;
  }
  if (language === "es") {
    return `En el Mundial de ${edition}`;
  }
  if (language === "ko") {
    return `${edition}년 월드컵 당시`;
  }
  return `At the ${edition} World Cup`;
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
