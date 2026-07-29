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

export function getPlayerPhotoStyle(profile) {
  const styleParts = [];
  const objectPosition = normalizePlayerPhotoObjectPosition(profile?.imageObjectPosition);
  const scale = normalizePlayerPhotoScale(profile?.imageScale);
  if (objectPosition) {
    styleParts.push(`--player-photo-object-position: ${objectPosition}`);
  }
  if (scale) {
    styleParts.push(`--player-photo-scale: ${scale}`);
  }
  return styleParts.join("; ");
}

function normalizePlayerPhotoObjectPosition(value) {
  const position = String(value || "").trim().replace(/\s+/g, " ");
  if (!position) {
    return "";
  }

  const validToken = /^(?:left|right|top|bottom|center|(?:100|[1-9]?\d)(?:\.\d+)?%)$/;
  const tokens = position.split(" ");
  if (tokens.length > 2 || tokens.some((token) => !validToken.test(token))) {
    return "";
  }
  return position;
}

function normalizePlayerPhotoScale(value) {
  const scale = Number(value);
  if (!Number.isFinite(scale) || scale <= 1 || scale > 1.8) {
    return "";
  }
  return String(Math.round(scale * 1000) / 1000);
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

function normalizeTournamentStatCount(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : null;
}

function formatEnglishTournamentStat(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatPlayerTournamentStatsLine({
  goals,
  assists,
  year,
  language = "en",
  current = Number(year) === 2026
} = {}) {
  const normalizedGoals = normalizeTournamentStatCount(goals);
  const normalizedAssists = normalizeTournamentStatCount(assists);
  if (!(normalizedGoals > 0) && !(normalizedAssists > 0)) {
    return "";
  }

  const edition = Number(year);
  const hasEdition = Number.isInteger(edition) && edition >= 1930;
  if (language === "zh") {
    const label = current ? "本届世界杯" : hasEdition ? `${edition}年世界杯` : "世界杯";
    const parts = [
      normalizedGoals > 0 ? `${normalizedGoals}球` : "",
      normalizedAssists > 0 ? `${normalizedAssists}助攻` : ""
    ].filter(Boolean);
    return `${label}：${parts.join("，")}`;
  }
  if (language === "es") {
    const label = current ? "Este Mundial" : hasEdition ? `Mundial ${edition}` : "Mundial";
    const parts = [
      normalizedGoals > 0
        ? `${normalizedGoals} ${normalizedGoals === 1 ? "gol" : "goles"}`
        : "",
      normalizedAssists > 0
        ? `${normalizedAssists} ${normalizedAssists === 1 ? "asistencia" : "asistencias"}`
        : ""
    ].filter(Boolean);
    return `${label}: ${parts.join(", ")}`;
  }
  if (language === "ko") {
    const label = current ? "이번 월드컵" : hasEdition ? `${edition} 월드컵` : "월드컵";
    const parts = [
      normalizedGoals > 0 ? `${normalizedGoals}골` : "",
      normalizedAssists > 0 ? `${normalizedAssists}도움` : ""
    ].filter(Boolean);
    return `${label}: ${parts.join(", ")}`;
  }

  const label = current ? "This World Cup" : hasEdition ? `${edition} World Cup` : "World Cup";
  const parts = [
    normalizedGoals > 0 ? formatEnglishTournamentStat(normalizedGoals, "goal") : "",
    normalizedAssists > 0 ? formatEnglishTournamentStat(normalizedAssists, "assist") : ""
  ].filter(Boolean);
  return `${label}: ${parts.join(", ")}`;
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
