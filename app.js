const DATA_VERSION = "2026-06-18-source-note-fix";
const DATA_URLS = {
  fixtures: `data/fixtures.json?v=${DATA_VERSION}`,
  history: `data/history.json?v=${DATA_VERSION}`,
  liveData: `api/live-data?v=${DATA_VERSION}`,
  playerProfiles: `data/player-profiles.json?v=${DATA_VERSION}`,
  standings: `data/standings.json?v=${DATA_VERSION}`,
  teams: `data/teams.json?v=${DATA_VERSION}`,
  tournament: `data/tournament.json?v=${DATA_VERSION}`
};

const matchList = document.querySelector("#match-list");
const matchInfo = document.querySelector("#match-info");
const timezoneSelect = document.querySelector("#timezone-select");
const dayLabel = document.querySelector("#day-label");
const datePopover = document.querySelector("#date-popover");
const calendarGrid = document.querySelector("#calendar-grid");
const calendarMonthLabel = document.querySelector("#calendar-month-label");
const calendarPrevMonth = document.querySelector("#calendar-prev-month");
const calendarNextMonth = document.querySelector("#calendar-next-month");
const calendarYesterdayButton = document.querySelector("#calendar-yesterday");
const calendarTodayButton = document.querySelector("#calendar-today");
const catchUpButton = document.querySelector("#catch-up-button");
const catchUpPopover = document.querySelector("#catch-up-popover");
const catchUpDate = document.querySelector("#catch-up-date");
const catchUpList = document.querySelector("#catch-up-list");
const standingsYearButton = document.querySelector("#standings-year-button");
const standingsYearPopover = document.querySelector("#standings-year-popover");
const standingsYearGrid = document.querySelector("#standings-year-grid");
const standingsSummary = document.querySelector("#standings-summary");
const standingsGrid = document.querySelector("#standings-grid");
const sourceNote = document.querySelector("#source-note");
const viewTabs = document.querySelectorAll(".view-tab");
const viewPanels = {
  matches: document.querySelector("#matches-view"),
  standings: document.querySelector("#standings-view")
};

const defaultTimeZone =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
const timeZones = [
  "America/Los_Angeles",
  "America/Vancouver",
  "America/Denver",
  "America/Chicago",
  "America/Mexico_City",
  "America/New_York",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Berlin",
  "Africa/Casablanca",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney"
];
const MATCH_LIVE_WINDOW_MS = 2.25 * 60 * 60 * 1000;
const DATA_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const LIVE_DATA_TIMEOUT_MS = 4000;
const CURRENT_STANDINGS_YEAR = 2026;
const CURRENT_STANDINGS_SUMMARY =
  "Top two in each group advance. The best eight third-place teams also reach the Round of 32.";
const HISTORICAL_STANDINGS_SUMMARY =
  "Final group tables computed from archived match results.";
const WALES_FLAG = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}";
const HISTORICAL_TEAM_COUNTRY_CODES = {
  Algeria: "DZ",
  Angola: "AO",
  Argentina: "AR",
  Australia: "AU",
  Austria: "AT",
  Belgium: "BE",
  Bolivia: "BO",
  "Bosnia-Herzegovina": "BA",
  Brazil: "BR",
  Bulgaria: "BG",
  Cameroon: "CM",
  Canada: "CA",
  Chile: "CL",
  China: "CN",
  Colombia: "CO",
  "Costa Rica": "CR",
  Croatia: "HR",
  Cuba: "CU",
  "Czech Republic": "CZ",
  Czechoslovakia: "CZ",
  Denmark: "DK",
  "Dutch East Indies": "ID",
  "East Germany": "DE",
  Ecuador: "EC",
  Egypt: "EG",
  "El Salvador": "SV",
  France: "FR",
  Germany: "DE",
  Ghana: "GH",
  Greece: "GR",
  Haiti: "HT",
  Honduras: "HN",
  Hungary: "HU",
  Iceland: "IS",
  Iran: "IR",
  Iraq: "IQ",
  Ireland: "IE",
  Israel: "IL",
  Italy: "IT",
  Jamaica: "JM",
  Japan: "JP",
  Kuwait: "KW",
  Mexico: "MX",
  Morocco: "MA",
  Netherlands: "NL",
  "New Zealand": "NZ",
  Nigeria: "NG",
  "North Korea": "KP",
  "Northern Ireland": "GB",
  Norway: "NO",
  Panama: "PA",
  Paraguay: "PY",
  Peru: "PE",
  Poland: "PL",
  Portugal: "PT",
  Qatar: "QA",
  Romania: "RO",
  Russia: "RU",
  "Saudi Arabia": "SA",
  Senegal: "SN",
  Serbia: "RS",
  "Serbia and Montenegro": "RS",
  Slovakia: "SK",
  Slovenia: "SI",
  "South Africa": "ZA",
  "South Korea": "KR",
  Spain: "ES",
  Sweden: "SE",
  Switzerland: "CH",
  Togo: "TG",
  "Trinidad and Tobago": "TT",
  Tunisia: "TN",
  Turkey: "TR",
  Ukraine: "UA",
  "United Arab Emirates": "AE",
  "United States": "US",
  Uruguay: "UY",
  USA: "US",
  "West Germany": "DE",
  Zaire: "CD"
};
const HISTORICAL_TEAM_FLAG_OVERRIDES = {
  England: { flagClass: "flag-england" },
  Scotland: { flagClass: "flag-scotland" },
  Wales: { flag: WALES_FLAG },
  "Soviet Union": { flagClass: "flag-soviet-union" },
  Yugoslavia: { flagClass: "flag-yugoslavia" }
};

const venueLocations = {
  "Atlanta Stadium": "Atlanta, Georgia, USA",
  "Boston Stadium": "Foxborough, Massachusetts, USA",
  "Dallas Stadium": "Arlington, Texas, USA",
  "Estadio Guadalajara": "Guadalajara, Jalisco, Mexico",
  "Estadio Monterrey": "Monterrey, Nuevo Leon, Mexico",
  "Houston Stadium": "Houston, Texas, USA",
  "Kansas City Stadium": "Kansas City, Missouri, USA",
  "Los Angeles Stadium": "Inglewood, California, USA",
  "Mexico City Stadium": "Mexico City, Mexico",
  "Miami Stadium": "Miami Gardens, Florida, USA",
  "New York New Jersey Stadium": "East Rutherford, New Jersey, USA",
  "Philadelphia Stadium": "Philadelphia, Pennsylvania, USA",
  "San Francisco Bay Area Stadium": "Santa Clara, California, USA",
  "Seattle Stadium": "Seattle, Washington, USA",
  "Toronto Stadium": "Toronto, Ontario, Canada",
  "BC Place Vancouver": "Vancouver, British Columbia, Canada",
  "Vancouver Stadium": "Vancouver, British Columbia, Canada"
};

if (!timeZones.includes(defaultTimeZone)) {
  timeZones.unshift(defaultTimeZone);
}

const initialDate = new Date();
let selectedTimeZone = defaultTimeZone;
let selectedDayKey = getDayKey(initialDate, selectedTimeZone);
let activeMatchId = "";
let activeView = "matches";
let selectedStandingsYear = CURRENT_STANDINGS_YEAR;
let calendarMonthKey = getMonthKeyFromDayKey(selectedDayKey);
let isCalendarOpen = false;
let isCatchUpOpen = false;
let isStandingsYearOpen = false;
let fixtures = [];
let historicalFixtures = [];
let history = { coverage: {}, fixtures: [], source: null, tournaments: [] };
const historicalProjectionCache = new Map();
let playerProfilesByName = new Map();
let teamsById = new Map();
let teamsByName = new Map();
let tournament = { groups: [], stages: [], sources: [] };
let standingsByGroup = {};
let dataCoverage = { status: "partial" };
let syncUrl = true;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC"
});

const navDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});

const navDateWithYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
  year: "numeric"
});

const calendarMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric"
});

const calendarDayLabelFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  weekday: "long",
  year: "numeric"
});

const catchUpItemDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC"
});

const catchUpItemLeadDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC"
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return replacements[char];
  });
}

function normalizeTextKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const historicalTeamCountryCodesByName = new Map(
  Object.entries(HISTORICAL_TEAM_COUNTRY_CODES).map(([name, countryCode]) => [
    normalizeTextKey(name),
    countryCode
  ])
);
const historicalTeamFlagOverridesByName = new Map(
  Object.entries(HISTORICAL_TEAM_FLAG_OVERRIDES).map(([name, metadata]) => [
    normalizeTextKey(name),
    metadata
  ])
);

function countryCodeToFlag(countryCode) {
  const code = String(countryCode || "").trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(code)) {
    return "";
  }

  return String.fromCodePoint(...[...code].map((char) => char.charCodeAt(0) + 127397));
}

function buildTeamNameLookup(teams = []) {
  const lookup = new Map();

  for (const team of teams) {
    for (const name of [team.id, team.name, team.officialName, team.standingName]) {
      const key = normalizeTextKey(name);

      if (key && !lookup.has(key)) {
        lookup.set(key, team);
      }
    }
  }

  return lookup;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.max(0, Math.min(100, number));
}

async function loadJson(url, options = {}) {
  const { timeoutMs = 0 } = options;
  const controller =
    timeoutMs > 0 && typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? window.setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller?.signal
    });

    if (!response.ok) {
      throw new Error(`Unable to load ${url}`);
    }

    return await response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Timed out loading ${url}`);
    }

    throw error;
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function loadOptionalJson(url, fallback, options = {}) {
  try {
    return await loadJson(url, options);
  } catch (error) {
    console.warn(`Optional data unavailable: ${url}`, error);
    return fallback;
  }
}

function getDayKey(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getDateFromKey(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function getDayKeyFromDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRelativeDayKey(dayKey, offsetDays) {
  const date = getDateFromKey(dayKey);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return getDayKeyFromDate(date);
}

function getMonthKeyFromDayKey(dayKey) {
  return dayKey.slice(0, 7);
}

function getDateFromMonthKey(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1, 12));
}

function isDayKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

function isReloadNavigation() {
  const [navigationEntry] = performance.getEntriesByType?.("navigation") || [];

  if (navigationEntry?.type) {
    return navigationEntry.type === "reload";
  }

  if (performance.navigation) {
    return performance.navigation.type === performance.navigation.TYPE_RELOAD;
  }

  return false;
}

function getTimeFormatter() {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    timeZone: selectedTimeZone
  });
}

function getTimeZoneAbbreviation(timeZone, date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short"
  });
  return (
    formatter
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value || timeZone
  );
}

function getTimeZoneLabel(timeZone) {
  return `${timeZone.replace(/_/g, " ")} (${getTimeZoneAbbreviation(timeZone)})`;
}

function getGroup(groupId) {
  return tournament.groups.find((group) => group.id === groupId);
}

function getAvailableStandingsYears() {
  const years = new Set([CURRENT_STANDINGS_YEAR]);

  for (const item of history.tournaments || []) {
    if (Number.isInteger(item.year)) {
      years.add(item.year);
    }
  }

  for (const fixture of historicalFixtures) {
    if (Number.isInteger(fixture.tournamentYear)) {
      years.add(fixture.tournamentYear);
    }
  }

  return [...years].sort((a, b) => b - a);
}

function getValidStandingsYear(value) {
  const year = Number(value);
  const availableYears = getAvailableStandingsYears();

  if (Number.isInteger(year) && availableYears.includes(year)) {
    return year;
  }

  return CURRENT_STANDINGS_YEAR;
}

function getTeam(teamId) {
  return teamsById.get(teamId) || {
    id: teamId,
    name: "TBD",
    officialName: "TBD",
    flag: "",
    fifaRank: null
  };
}

function getHistoricalTeam(teamName) {
  const name = String(teamName || "").trim();
  const key = normalizeTextKey(name);

  if (!key) {
    return null;
  }

  const currentTeam = teamsByName.get(key);
  if (currentTeam) {
    return {
      ...currentTeam,
      fifaRank: null,
      name,
      officialName: name,
      standingName: name
    };
  }

  const override = historicalTeamFlagOverridesByName.get(key) || {};
  const countryCode = historicalTeamCountryCodesByName.get(key);
  const flag = override.flag || countryCodeToFlag(countryCode);
  const flagClass = override.flagClass || "";

  if (!flag && !flagClass) {
    return null;
  }

  return {
    id: `history-${key.replace(/\s+/g, "-")}`,
    name,
    officialName: name,
    standingName: name,
    flag,
    flagClass,
    fifaRank: null
  };
}

function getParticipant(teamId, slot = "TBD") {
  if (teamId) {
    return getTeam(teamId);
  }

  const historicalTeam = getHistoricalTeam(slot);
  if (historicalTeam) {
    return historicalTeam;
  }

  return {
    id: slot,
    name: slot,
    officialName: slot,
    flag: "",
    fifaRank: null,
    isSlot: true
  };
}

function hydrateFixture(fixture) {
  return {
    ...fixture,
    homeTeam: getParticipant(fixture.homeTeamId, fixture.homeSlot),
    awayTeam: getParticipant(fixture.awayTeamId, fixture.awaySlot)
  };
}

function getCalendarFixtures() {
  return [...historicalFixtures, ...fixtures];
}

function getFixtureDayKey(fixture) {
  return fixture.date || getDayKey(new Date(fixture.kickoffUtc), selectedTimeZone);
}

function getFixtureSortValue(fixture) {
  if (fixture.sortKey) {
    return fixture.sortKey;
  }

  return fixture.kickoffUtc || `${getFixtureDayKey(fixture)}T12:00:00Z`;
}

function getAvailableDayKeys() {
  return [...new Set(getCalendarFixtures().map(getFixtureDayKey))].sort();
}

function getAvailableMonthKeys() {
  return [...new Set(getAvailableDayKeys().map(getMonthKeyFromDayKey))].sort();
}

function getAdjacentCalendarMonthKey(direction) {
  const monthKeys = getAvailableMonthKeys();

  if (direction < 0) {
    return [...monthKeys].reverse().find((monthKey) => monthKey < calendarMonthKey);
  }

  return monthKeys.find((monthKey) => monthKey > calendarMonthKey);
}

function getNearestAvailableDayKey(dayKey) {
  const availableDayKeys = getAvailableDayKeys();

  if (!availableDayKeys.length || availableDayKeys.includes(dayKey)) {
    return dayKey;
  }

  return (
    availableDayKeys.find((availableDayKey) => availableDayKey > dayKey) ||
    availableDayKeys.at(-1)
  );
}

function ensureSelectableSelectedDay() {
  const nextDayKey = getNearestAvailableDayKey(selectedDayKey);

  if (nextDayKey === selectedDayKey) {
    return;
  }

  selectedDayKey = nextDayKey;
  calendarMonthKey = getMonthKeyFromDayKey(nextDayKey);
  activeMatchId = "";
}

function getAdjacentMatchDay(direction) {
  const availableDayKeys = getAvailableDayKeys();
  if (direction < 0) {
    return [...availableDayKeys].reverse().find((dayKey) => dayKey < selectedDayKey);
  }
  return availableDayKeys.find((dayKey) => dayKey > selectedDayKey);
}

function getMatchCountForDay(dayKey) {
  return getCalendarFixtures().filter((fixture) => getFixtureDayKey(fixture) === dayKey)
    .length;
}

function getSelectedDateLabel() {
  const todayKey = getDayKey(new Date(), selectedTimeZone);
  const selectedYear = selectedDayKey.slice(0, 4);
  const currentYear = todayKey.slice(0, 4);

  if (selectedDayKey === todayKey) {
    return "Today";
  }

  if (selectedYear !== currentYear) {
    return navDateWithYearFormatter.format(getDateFromKey(selectedDayKey));
  }

  return navDateFormatter.format(getDateFromKey(selectedDayKey));
}

function updateDateControls() {
  const isToday = selectedDayKey === getDayKey(new Date(), selectedTimeZone);
  const selectedDateLabel = dateFormatter.format(getDateFromKey(selectedDayKey));

  dayLabel.textContent = getSelectedDateLabel();
  dayLabel.classList.toggle("is-today", isToday);
  dayLabel.setAttribute("aria-label", `Choose match date, ${selectedDateLabel}`);
  dayLabel.setAttribute("aria-expanded", String(isCalendarOpen));
  renderCalendar();
}

function getCalendarDayKeys(monthKey) {
  const firstOfMonth = getDateFromMonthKey(monthKey);
  const startDate = new Date(firstOfMonth);
  startDate.setUTCDate(firstOfMonth.getUTCDate() - firstOfMonth.getUTCDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + index);
    return getDayKeyFromDate(date);
  });
}

function renderCalendar() {
  if (!calendarGrid || !calendarMonthLabel) {
    return;
  }

  const todayKey = getDayKey(new Date(), selectedTimeZone);
  const yesterdayKey = getRelativeDayKey(todayKey, -1);
  const previousMonthKey = getAdjacentCalendarMonthKey(-1);
  const nextMonthKey = getAdjacentCalendarMonthKey(1);
  const monthDate = getDateFromMonthKey(calendarMonthKey);
  calendarMonthLabel.textContent = calendarMonthFormatter.format(monthDate);
  calendarPrevMonth.disabled = !previousMonthKey;
  calendarNextMonth.disabled = !nextMonthKey;
  calendarPrevMonth.setAttribute(
    "aria-label",
    previousMonthKey
      ? `Previous World Cup month, ${calendarMonthFormatter.format(getDateFromMonthKey(previousMonthKey))}`
      : "No previous World Cup month"
  );
  calendarNextMonth.setAttribute(
    "aria-label",
    nextMonthKey
      ? `Next World Cup month, ${calendarMonthFormatter.format(getDateFromMonthKey(nextMonthKey))}`
      : "No next World Cup month"
  );
  calendarYesterdayButton.disabled = getMatchCountForDay(yesterdayKey) === 0;
  calendarTodayButton.disabled = getMatchCountForDay(todayKey) === 0;
  calendarGrid.replaceChildren(
    ...getCalendarDayKeys(calendarMonthKey).map((dayKey) => {
      const dayDate = getDateFromKey(dayKey);
      const matchCount = getMatchCountForDay(dayKey);
      const isCurrentMonth = getMonthKeyFromDayKey(dayKey) === calendarMonthKey;
      const isSelected = dayKey === selectedDayKey;
      const isToday = dayKey === todayKey;
      const isMatchDay = matchCount > 0;
      const button = document.createElement("button");
      const labelParts = [calendarDayLabelFormatter.format(dayDate)];

      if (isToday) {
        labelParts.push("today");
      }
      if (isSelected) {
        labelParts.push("selected");
      }
      if (matchCount) {
        labelParts.push(`${matchCount} match${matchCount === 1 ? "" : "es"} scheduled`);
      } else {
        labelParts.push("no World Cup matches scheduled");
      }

      button.type = "button";
      button.className = [
        "calendar-day",
        isCurrentMonth ? "" : "is-outside-month",
        isSelected ? "is-selected" : "",
        isToday ? "is-today" : "",
        isMatchDay ? "is-match-day" : "is-disabled"
      ]
        .filter(Boolean)
        .join(" ");
      button.dataset.dayKey = dayKey;
      button.disabled = !isMatchDay;
      button.setAttribute("aria-label", labelParts.join(", "));
      button.setAttribute("aria-pressed", String(isSelected));
      if (isToday) {
        button.setAttribute("aria-current", "date");
      }
      button.textContent = String(dayDate.getUTCDate());
      return button;
    })
  );
}

function setCalendarOpen(isOpen) {
  if (isOpen) {
    setCatchUpOpen(false);
    setStandingsYearOpen(false);
  }

  isCalendarOpen = isOpen;
  datePopover.classList.toggle("is-hidden", !isOpen);
  dayLabel.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    calendarMonthKey = getMonthKeyFromDayKey(selectedDayKey);
    renderCalendar();
  }
}

function selectCalendarDay(dayKey) {
  selectedDayKey = dayKey;
  calendarMonthKey = getMonthKeyFromDayKey(dayKey);
  setCalendarOpen(false);
  renderSchedule();
}

function setStandingsYearOpen(isOpen) {
  if (!standingsYearButton || !standingsYearPopover) {
    return;
  }

  if (isOpen) {
    setCalendarOpen(false);
    setCatchUpOpen(false);
  }

  isStandingsYearOpen = isOpen;
  standingsYearPopover.classList.toggle("is-hidden", !isOpen);
  standingsYearButton.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    renderStandingsYearPicker();
  }
}

function selectStandingsYear(year) {
  selectedStandingsYear = getValidStandingsYear(year);
  setStandingsYearOpen(false);
  renderStandingsView();
  updateUrlState();
}

function renderTimeZoneOptions() {
  timezoneSelect.replaceChildren(
    ...timeZones.map((timeZone) => {
      const option = document.createElement("option");
      option.value = timeZone;
      option.textContent = getTimeZoneLabel(timeZone);
      option.selected = timeZone === selectedTimeZone;
      return option;
    })
  );
}

function renderFlag(team) {
  if (team.isSlot || (!team.flag && !team.flagClass)) {
    return "";
  }

  const className = ["flag", team.flagClass].filter(Boolean).join(" ");
  const content = team.flagClass ? "" : escapeHtml(team.flag);
  return `<span class="${escapeHtml(className)}" role="img" aria-label="${escapeHtml(team.name)} flag">${content}</span>`;
}

function renderRank(team) {
  if (!team.fifaRank) {
    return "";
  }

  return `<span class="rank-pill" aria-label="${escapeHtml(team.name)} FIFA world ranking ${escapeHtml(team.fifaRank)}">#${escapeHtml(team.fifaRank)}</span>`;
}

function getStandingName(team) {
  return team.standingName || team.name;
}

function renderTeamInline(team, className = "team", options = {}) {
  const { showRank = true } = options;
  const teamName = escapeHtml(team.name);

  return `
    <span class="${className}">
      ${renderFlag(team)}
      <span class="team-name" aria-label="${teamName}" title="${teamName}">${teamName}</span>
      ${showRank ? renderRank(team) : ""}
    </span>
  `;
}

function getVenueLabel(match) {
  const location = venueLocations[match.venue];
  return location ? `${match.venue} \u2022 ${location}` : match.venue;
}

function getScoreWinnerSide(homeScore, awayScore) {
  const home = Number(homeScore);
  const away = Number(awayScore);

  if (!Number.isFinite(home) || !Number.isFinite(away) || home === away) {
    return "";
  }

  return home > away ? "home" : "away";
}

function getTeamClass(baseClass, winnerSide, side, options = {}) {
  const { markLoser = false } = options;
  return [
    baseClass,
    winnerSide === side ? "is-winner" : "",
    markLoser && winnerSide && winnerSide !== side ? "is-loser" : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function renderPastScoreline(result, leadingTeamId = "") {
  const hasStructuredScore =
    result.homeTeamId &&
    result.awayTeamId &&
    Number.isFinite(Number(result.homeScore)) &&
    Number.isFinite(Number(result.awayScore));

  if (!hasStructuredScore) {
    return `<strong class="past-scoreline-fallback">${escapeHtml(result.score || "Score unavailable")}</strong>`;
  }

  const homeTeam = getTeam(result.homeTeamId);
  const awayTeam = getTeam(result.awayTeamId);
  const shouldFlipScoreline = leadingTeamId && result.awayTeamId === leadingTeamId;
  const leftTeam = shouldFlipScoreline ? awayTeam : homeTeam;
  const rightTeam = shouldFlipScoreline ? homeTeam : awayTeam;
  const leftScore = shouldFlipScoreline ? result.awayScore : result.homeScore;
  const rightScore = shouldFlipScoreline ? result.homeScore : result.awayScore;
  const scoreText = `${leftScore}-${rightScore}`;
  const scoreNote = result.scoreNote ? ` ${result.scoreNote}` : "";
  const winnerSide = getScoreWinnerSide(leftScore, rightScore);

  return `
    <div class="past-scoreline" aria-label="${escapeHtml(leftTeam.name)} ${escapeHtml(scoreText)} ${escapeHtml(rightTeam.name)}${escapeHtml(scoreNote)}">
      ${renderTeamInline(leftTeam, getTeamClass("past-team", winnerSide, "home", { markLoser: true }), { showRank: false })}
      <strong class="past-score">
        ${escapeHtml(scoreText)}
        ${result.scoreNote ? `<span>${escapeHtml(result.scoreNote)}</span>` : ""}
      </strong>
      ${renderTeamInline(rightTeam, getTeamClass("past-team", winnerSide, "away", { markLoser: true }), { showRank: false })}
    </div>
  `;
}

function getMatchState(match, nextMatchId, currentTime) {
  if (match.status === "FT") {
    return "complete";
  }

  if (isMatchLive(match, currentTime)) {
    return "live";
  }

  if (match.id === nextMatchId) {
    return "next";
  }

  return "idle";
}

function isMatchLive(match, currentTime) {
  if (match.status === "LIVE") {
    return true;
  }

  if (match.status !== "SCHEDULED" || !match.kickoffUtc) {
    return false;
  }

  const kickoffTime = new Date(match.kickoffUtc).getTime();
  return currentTime >= kickoffTime && currentTime < kickoffTime + MATCH_LIVE_WINDOW_MS;
}

function getLiveMatchIds(currentTime) {
  return new Set(
    fixtures
      .map(hydrateFixture)
      .filter((match) => isMatchLive(match, currentTime))
      .map((match) => match.id)
  );
}

function getNextMatchId(currentTime, liveMatchIds) {
  if (liveMatchIds.size > 0) {
    return "";
  }

  return (
    fixtures
      .map(hydrateFixture)
      .filter(
        (match) =>
          match.kickoffUtc &&
          match.status !== "FT" &&
          new Date(match.kickoffUtc).getTime() > currentTime
      )
      .sort((a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc))[0]?.id || ""
  );
}

function shouldShowScorePending(match, state, currentTime) {
  if (match.score || !match.kickoffUtc || match.status === "CANCELLED" || match.status === "POSTPONED") {
    return false;
  }

  if (match.status === "LIVE" || state === "live") {
    return false;
  }

  const kickoffTime = new Date(match.kickoffUtc).getTime();
  return Number.isFinite(kickoffTime) && currentTime >= kickoffTime + MATCH_LIVE_WINDOW_MS;
}

function getScorePendingText(match, state, currentTime) {
  if (!shouldShowScorePending(match, state, currentTime)) {
    return "";
  }

  return "Final pending";
}

function getDisplayScore(match, state) {
  if (match.score) {
    return {
      home: match.score.home,
      away: match.score.away,
      isFallback: false
    };
  }

  if (match.status === "LIVE" || state === "live") {
    return {
      home: 0,
      away: 0,
      isFallback: true
    };
  }

  return null;
}

function renderScore(match, state) {
  const score = getDisplayScore(match, state);
  if (!score) {
    return "";
  }

  const home = match.homeTeam.name;
  const away = match.awayTeam.name;
  const scoreText = `${score.home}-${score.away}`;
  const label =
    match.status === "LIVE" || state === "live" ? "Current score" : "Final score";
  const ariaLabel = score.isFallback
    ? `Current score not loaded yet; showing ${scoreText}`
    : `${label} ${home} ${score.home}, ${away} ${score.away}`;
  const className = `match-score${score.isFallback ? " is-live-fallback" : ""}`;

  return `<span class="${className}" aria-label="${escapeHtml(ariaLabel)}">${escapeHtml(scoreText)}</span>`;
}

function renderScoreStatus(match, state, currentTime) {
  const pendingText = getScorePendingText(match, state, currentTime);
  return pendingText
    ? `<span class="score-status is-pending" aria-label="${escapeHtml(`${pendingText}; verified score is not loaded yet`)}">${escapeHtml(pendingText)}</span>`
    : "";
}

function getMatchDateTimeValue(match) {
  return match.kickoffUtc || match.date || "";
}

function getMatchTimeLabel(match) {
  if (match.kickoffUtc) {
    return getTimeFormatter().format(new Date(match.kickoffUtc)).replace(" ", "");
  }

  if (match.localTime) {
    return match.localTime;
  }

  if (match.status === "CANCELLED") {
    return "Canceled";
  }

  return "Final";
}

function renderMatchRow(match, state, currentTime = Date.now()) {
  const row = document.createElement("button");
  const homeName = match.homeTeam.name;
  const awayName = match.awayTeam.name;
  const winnerSide = getScoreWinnerSide(match.score?.home, match.score?.away);
  const scoreLabel = match.status === "LIVE" ? "current score" : "final score";
  const pendingScoreText = getScorePendingText(match, state, currentTime);
  const displayScore = getDisplayScore(match, state);
  const stateLabel =
    state === "live" ? "Live, " : state === "next" ? "Up next, " : "";
  const statusLabel = match.status === "CANCELLED" ? ", cancelled" : "";
  const scoreStatus = renderScoreStatus(match, state, currentTime);
  const stateBadge =
    state === "live"
      ? `<span class="live-pill">Live</span>`
      : state === "next"
        ? `<span class="up-next-pill">Up next</span>`
        : "";
  const score = renderScore(match, state);
  const rowMeta = `${scoreStatus}${stateBadge}${score}`;

  row.type = "button";
  row.className = `match-row is-${state}`;
  row.dataset.matchId = match.id;
  row.dataset.state = state;
  row.setAttribute(
    "aria-label",
    `${stateLabel}${homeName} vs ${awayName}${statusLabel}${
      match.score
        ? `, ${scoreLabel} ${match.score.home}-${match.score.away}`
        : displayScore
          ? `, score ${displayScore.home}-${displayScore.away}`
          : pendingScoreText
            ? `, ${pendingScoreText.toLowerCase()}`
            : ""
    }`
  );
  row.innerHTML = `
    <time class="match-time" datetime="${escapeHtml(getMatchDateTimeValue(match))}">
      ${escapeHtml(getMatchTimeLabel(match))}
    </time>
    <span class="match-teams">
      ${renderTeamInline(match.homeTeam, getTeamClass("team", winnerSide, "home"))}
      <span class="versus">vs</span>
      ${renderTeamInline(match.awayTeam, getTeamClass("team", winnerSide, "away"))}
    </span>
    ${rowMeta ? `<span class="match-row-meta">${rowMeta}</span>` : ""}
  `;

  row.addEventListener("pointerenter", () => renderMatchInfo(match));
  row.addEventListener("focus", () => renderMatchInfo(match));
  row.addEventListener("click", () => renderMatchInfo(match, { reveal: true }));

  return row;
}

function formatGoalDifference(goalDifference) {
  if (goalDifference > 0) {
    return `+${goalDifference}`;
  }

  return String(goalDifference);
}

const STANDING_HEADERS = [
  { label: "Team" },
  {
    label: "Pts",
    help:
      "Points rank teams in the group: 3 for a win, 1 for a draw, 0 for a loss. More points usually means a better chance to advance."
  },
  {
    label: "W-D-L",
    help:
      "Wins-Draws-Losses shows a team's group record. Wins add points fastest, which helps explain why a team is higher or lower."
  },
  {
    label: "GD",
    help:
      "Goal difference is goals scored minus goals allowed. If teams are tied on points, a better GD can help decide who advances."
  }
];

function renderStandingHeaderCell(header) {
  if (!header.help) {
    return `<th>${escapeHtml(header.label)}</th>`;
  }

  return `
    <th>
      <span class="standing-help" tabindex="0" aria-label="${escapeHtml(`${header.label}: ${header.help}`)}" data-tooltip="${escapeHtml(header.help)}">
        ${escapeHtml(header.label)}
      </span>
    </th>
  `;
}

function renderStandingsTableHead() {
  return `
    <thead>
      <tr>
        ${STANDING_HEADERS.map(renderStandingHeaderCell).join("")}
      </tr>
    </thead>
  `;
}

function enrichStanding(row, group) {
  const gd = row.gf - row.ga;
  const pts = row.wins * 3 + row.draws;
  const seededOrder = group?.teamIds.indexOf(row.teamId) ?? 99;
  return { ...row, gd, pts, seededOrder };
}

function getStandingsRows(groupId) {
  const group = getGroup(groupId);
  const sourceRows = standingsByGroup[groupId] || [];
  const rows = sourceRows.length
    ? sourceRows
    : (group?.teamIds || []).map((teamId) => ({
        teamId,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        gf: 0,
        ga: 0
      }));

  const enrichedRows = rows.map((row, index) => ({
    ...enrichStanding(row, group),
    sourceOrder: index
  }));

  if (sourceRows.length) {
    return enrichedRows.sort((a, b) => a.sourceOrder - b.sourceOrder);
  }

  return enrichedRows.sort(
    (a, b) =>
      b.pts - a.pts ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.seededOrder - b.seededOrder ||
      getTeam(a.teamId).name.localeCompare(getTeam(b.teamId).name)
  );
}

function renderStandingRow(row, options = {}) {
  const team = getTeam(row.teamId);
  const { showRank = true } = options;

  return `
    <tr>
      <td>
        <span class="standing-team">
          ${renderFlag(team)}
          <span class="standing-name" aria-label="${escapeHtml(team.name)}" title="${escapeHtml(team.name)}">${escapeHtml(getStandingName(team))}</span>
          ${showRank ? renderRank(team) : ""}
        </span>
      </td>
      <td>${escapeHtml(row.pts)}</td>
      <td>${escapeHtml(row.wins)}-${escapeHtml(row.draws)}-${escapeHtml(row.losses)}</td>
      <td>${escapeHtml(formatGoalDifference(row.gd))}</td>
    </tr>
  `;
}

function renderStandings(groupId, options = {}) {
  const rows = getStandingsRows(groupId);

  return `
    <table class="standings-table">
      ${renderStandingsTableHead()}
      <tbody>${rows
        .map((row) => renderStandingRow(row, options))
        .join("")}</tbody>
    </table>
  `;
}

function getHistoricalStandingsGroups(year) {
  const groups = new Map();

  historicalFixtures
    .filter((fixture) => fixture.tournamentYear === year && fixture.group)
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)))
    .forEach((fixture) => {
      if (!groups.has(fixture.group)) {
        groups.set(fixture.group, fixture.group);
      }
    });

  return [...groups.values()];
}

function getHistoricalGroupStandingsForYear(year, groupName) {
  const rows = new Map();
  const groupFixtures = historicalFixtures
    .filter((fixture) => fixture.tournamentYear === year && fixture.group === groupName)
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)));

  for (const fixture of groupFixtures) {
    initializeHistoricalStanding(rows, fixture.homeSlot);
    initializeHistoricalStanding(rows, fixture.awaySlot);

    if (fixture.status !== "FT" || !fixture.score) {
      continue;
    }

    const home = initializeHistoricalStanding(rows, fixture.homeSlot);
    const away = initializeHistoricalStanding(rows, fixture.awaySlot);
    const homeScore = Number(fixture.score.home);
    const awayScore = Number(fixture.score.away);

    home.played += 1;
    away.played += 1;
    home.gf += homeScore;
    home.ga += awayScore;
    away.gf += awayScore;
    away.ga += homeScore;

    if (homeScore > awayScore) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (awayScore > homeScore) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }

    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.sourceOrder - b.sourceOrder ||
      a.teamName.localeCompare(b.teamName)
  );
}

function renderHistoricalStandingTeam(teamName) {
  const team = getHistoricalTeam(teamName);

  return `
    <span class="standing-team">
      ${team ? renderFlag(team) : ""}
      <span class="standing-name" aria-label="${escapeHtml(teamName)}" title="${escapeHtml(teamName)}">${escapeHtml(teamName)}</span>
    </span>
  `;
}

function renderHistoricalStandingRow(row, index, year, groupName) {
  const isAdvancing = shouldHighlightHistoricalStanding(
    { tournamentYear: year, group: groupName },
    index
  );

  return `
    <tr class="${isAdvancing ? "is-advancing" : ""}">
      <td>
        ${renderHistoricalStandingTeam(row.teamName)}
      </td>
      <td>${escapeHtml(row.points)}</td>
      <td>${escapeHtml(row.wins)}-${escapeHtml(row.draws)}-${escapeHtml(row.losses)}</td>
      <td>${escapeHtml(formatGoalDifference(row.gd))}</td>
    </tr>
  `;
}

function renderHistoricalStandingsTable(year, groupName) {
  const rows = getHistoricalGroupStandingsForYear(year, groupName);

  return `
    <table class="standings-table">
      ${renderStandingsTableHead()}
      <tbody>${rows
        .map((row, index) => renderHistoricalStandingRow(row, index, year, groupName))
        .join("")}</tbody>
    </table>
  `;
}

function renderCurrentStandingsCards() {
  return tournament.groups
    .map(
      (group) => `
        <article class="standings-card">
          <h2>${escapeHtml(group.label)}</h2>
          ${renderStandings(group.id)}
        </article>
      `
    )
    .join("");
}

function renderHistoricalStandingsCards(year) {
  const groups = getHistoricalStandingsGroups(year);

  if (!groups.length) {
    return `
      <article class="standings-card standings-empty-card">
        <h2>${escapeHtml(year)} archive</h2>
        <p class="past-empty">Group standings are not available for this archived tournament.</p>
      </article>
    `;
  }

  return groups
    .map(
      (groupName) => `
        <article class="standings-card">
          <h2>${escapeHtml(groupName)}</h2>
          ${renderHistoricalStandingsTable(year, groupName)}
        </article>
      `
    )
    .join("");
}

function renderStandingsYearPicker() {
  if (!standingsYearGrid) {
    return;
  }

  standingsYearGrid.replaceChildren(
    ...getAvailableStandingsYears().map((year) => {
      const button = document.createElement("button");
      const isSelected = year === selectedStandingsYear;

      button.type = "button";
      button.className = ["standings-year-option", isSelected ? "is-selected" : ""]
        .filter(Boolean)
        .join(" ");
      button.dataset.standingsYear = String(year);
      button.setAttribute("aria-pressed", String(isSelected));
      button.textContent = String(year);
      return button;
    })
  );
}

function updateStandingsControls() {
  if (standingsYearButton) {
    standingsYearButton.textContent = String(selectedStandingsYear);
    standingsYearButton.setAttribute(
      "aria-label",
      `Choose standings year, ${selectedStandingsYear} selected`
    );
    standingsYearButton.setAttribute("aria-expanded", String(isStandingsYearOpen));
  }

  if (standingsSummary) {
    standingsSummary.textContent =
      selectedStandingsYear === CURRENT_STANDINGS_YEAR
        ? CURRENT_STANDINGS_SUMMARY
        : HISTORICAL_STANDINGS_SUMMARY;
  }

  renderStandingsYearPicker();
}

function renderStandingsView() {
  updateStandingsControls();
  standingsGrid.innerHTML =
    selectedStandingsYear === CURRENT_STANDINGS_YEAR
      ? renderCurrentStandingsCards()
      : renderHistoricalStandingsCards(selectedStandingsYear);
}

function renderPredictionBar(label, value) {
  const percent = clampPercent(value);
  return `
    <div class="prediction-row">
      <span>${escapeHtml(label)}</span>
      <div class="prediction-track" aria-hidden="true">
        <span style="width: ${percent}%"></span>
      </div>
      <strong>${percent}%</strong>
    </div>
  `;
}

function getProjectionMethodHelp(projection) {
  if (!projection) {
    return "";
  }

  if (projection?.method === "fifa-ranking-baseline") {
    return "Local estimate using FIFA rankings. Not betting odds.";
  }

  if (projection?.method === "historical-world-cup-form-baseline") {
    return "Local historical-form estimate. Not betting odds.";
  }

  return "Local preview estimate. Not betting odds.";
}

function renderPredictionHeading(projection) {
  const help = getProjectionMethodHelp(projection);

  return `
    <h3 class="info-heading">
      <span>Prediction</span>
      ${
        help
          ? `<button class="info-tooltip-button" type="button" aria-label="${escapeHtml(`Prediction source: ${help}`)}" data-tooltip="${escapeHtml(help)}">i</button>`
          : ""
      }
    </h3>
  `;
}

function renderProjection(match) {
  if (!match.projection) {
    return `<p class="past-empty">No verified projection is loaded for this fixture yet.</p>`;
  }

  return `
    ${renderPredictionBar(match.homeTeam.name, match.projection.home)}
    ${renderPredictionBar("Draw", match.projection.draw)}
    ${renderPredictionBar(match.awayTeam.name, match.projection.away)}
  `;
}

function getHistoricalProjectionRating(ratings, teamName) {
  if (!ratings.has(teamName)) {
    ratings.set(teamName, 1500);
  }

  return ratings.get(teamName);
}

function getHistoricalFixtureOutcome(fixture) {
  if (fixture.status !== "FT" || !fixture.score) {
    return null;
  }

  const winner = getHistoricalWinner(fixture);

  if (!winner) {
    return 0.5;
  }

  return winner === fixture.homeSlot ? 1 : 0;
}

function applyHistoricalProjectionFixture(ratings, fixture) {
  const outcome = getHistoricalFixtureOutcome(fixture);

  if (outcome === null || !fixture.homeSlot || !fixture.awaySlot) {
    return;
  }

  const homeRating = getHistoricalProjectionRating(ratings, fixture.homeSlot);
  const awayRating = getHistoricalProjectionRating(ratings, fixture.awaySlot);
  const expectedHome = 1 / (1 + 10 ** ((awayRating - homeRating) / 400));
  const margin = Math.abs(Number(fixture.score.home) - Number(fixture.score.away));
  const marginMultiplier = Math.min(2, 1 + Math.max(0, margin - 1) * 0.25);
  const update = 28 * marginMultiplier * (outcome - expectedHome);

  ratings.set(fixture.homeSlot, homeRating + update);
  ratings.set(fixture.awaySlot, awayRating - update);
}

function normalizeProjectionParts(home, draw, away) {
  const rounded = {
    home: Math.max(0, Math.round(home)),
    draw: Math.max(0, Math.round(draw)),
    away: Math.max(0, Math.round(away))
  };
  const total = rounded.home + rounded.draw + rounded.away;

  if (total !== 100) {
    const largestKey = Object.entries(rounded).sort((a, b) => b[1] - a[1])[0][0];
    rounded[largestKey] += 100 - total;
  }

  return rounded;
}

function getHistoricalProjection(match) {
  if (match.status === "CANCELLED") {
    return null;
  }

  if (historicalProjectionCache.has(match.id)) {
    return historicalProjectionCache.get(match.id);
  }

  const ratings = new Map();
  const previousFixtures = historicalFixtures
    .filter((fixture) => isHistoricalMatchBefore(fixture, match))
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)));

  for (const fixture of previousFixtures) {
    applyHistoricalProjectionFixture(ratings, fixture);
  }

  const homeRating = getHistoricalProjectionRating(ratings, match.homeTeam.name);
  const awayRating = getHistoricalProjectionRating(ratings, match.awayTeam.name);
  const ratingDiff = homeRating - awayRating;
  const drawBase = match.group ? 28 : 24;
  const draw = Math.max(18, drawBase - Math.min(8, Math.abs(ratingDiff) / 60));
  const decisiveShare = 100 - draw;
  const homeShare = 1 / (1 + Math.exp(-ratingDiff / 190));
  const projection = {
    ...normalizeProjectionParts(decisiveShare * homeShare, draw, decisiveShare * (1 - homeShare)),
    basis: "Prior World Cup results and earlier matches in this tournament",
    method: "historical-world-cup-form-baseline",
    priorMatches: previousFixtures.length
  };

  historicalProjectionCache.set(match.id, projection);
  return projection;
}

function renderHistoricalProjection(match) {
  const projection = getHistoricalProjection(match);

  if (!projection) {
    return `<p class="past-empty">No historical prediction is generated for cancelled fixtures.</p>`;
  }

  return `
    ${renderPredictionBar(match.homeTeam.name, projection.home)}
    ${renderPredictionBar("Draw", projection.draw)}
    ${renderPredictionBar(match.awayTeam.name, projection.away)}
  `;
}

function renderScoreSummary(match, options = {}) {
  const score = getCatchUpScore(match);

  if (!score) {
    return `<p class="past-empty">${options.live ? "The match is marked live, but no verified score is loaded yet." : "Final score is not loaded for this fixture yet."}</p>`;
  }

  const winnerSide = getScoreWinnerSide(score.home, score.away);
  const scoreText = `${score.home}-${score.away}`;

  if (!winnerSide) {
    return `<p class="past-empty">${escapeHtml(match.homeTeam.name)} and ${escapeHtml(match.awayTeam.name)} ${options.live ? "are level" : "drew"} ${escapeHtml(scoreText)}.</p>`;
  }

  const winner = winnerSide === "home" ? match.homeTeam : match.awayTeam;
  const loser = winnerSide === "home" ? match.awayTeam : match.homeTeam;

  return `<p class="past-empty">${escapeHtml(winner.name)} ${options.live ? "lead" : "beat"} ${escapeHtml(loser.name)} ${escapeHtml(scoreText)}.</p>`;
}

function renderMatchStatusBlock(match) {
  if (match.status === "FT") {
    return `
      <section class="info-block">
        <h3>Result</h3>
        ${renderScoreSummary(match)}
        <p class="data-note">Final score reflected in the current standings after source checks.</p>
      </section>
    `;
  }

  if (match.status === "LIVE") {
    return `
      <section class="info-block">
        <h3>Live score</h3>
        ${renderScoreSummary(match, { live: true })}
        <p class="data-note">Live status is manually verified and should be refreshed after full time.</p>
      </section>
    `;
  }

  return `
    <section class="info-block">
      ${renderPredictionHeading(match.projection)}
      ${renderProjection(match)}
    </section>
  `;
}

function getPlayerNames(players = []) {
  return players
    .map((player) => (typeof player === "string" ? player : player?.name))
    .filter(Boolean);
}

function getKeyInformationCopy(info) {
  if (Array.isArray(info)) {
    return info.filter(Boolean).join(" ");
  }

  if (typeof info === "string" && info.trim()) {
    return info.trim();
  }

  return "";
}

function getNameSeries(names) {
  if (names.length <= 1) {
    return names.join("");
  }

  if (names.length === 2) {
    return names.join(" and ");
  }

  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

function getKeyInformationText(team, info, players = []) {
  const specificCopy = getKeyInformationCopy(info);
  if (specificCopy) {
    return specificCopy;
  }

  const names = players
    .map((player) => (typeof player === "string" ? player : player?.name))
    .filter(Boolean);
  const notes = players
    .map((player) => (typeof player === "string" ? "" : player?.note))
    .filter(Boolean)
    .slice(0, 2);

  if (!names.length) {
    return "Key information is not loaded yet.";
  }

  return `${team.name}'s key pieces here are ${getNameSeries(names)}. ${notes.join(" ")}`;
}

function getKeyInformationLabel(team) {
  const label = team?.name || "TBD";
  return team?.tagline ? `${label}: ${team.tagline}` : label;
}

function getPlayerProfile(player) {
  const name = getPlayerName(player);
  if (!name) {
    return null;
  }

  return playerProfilesByName.get(normalizeTextKey(name)) || null;
}

function getPlayerDisplayName(player, profile = getPlayerProfile(player)) {
  return profile?.displayName || profile?.name || getPlayerName(player);
}

function getPlayerInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getPlayerClubLine(profile) {
  const club = profile?.club || "Club to verify";
  return profile?.league ? `${club} (${profile.league})` : club;
}

function getPlayerSkills(player, profile = getPlayerProfile(player)) {
  const skills = Array.isArray(profile?.skills) ? profile.skills.filter(Boolean) : [];
  if (skills.length) {
    return skills.slice(0, 4);
  }

  const note = getPlayerNote(player);
  return note ? [note] : ["Match plan"];
}

function getPlayerAliases(player, allPlayers) {
  const name = getPlayerName(player);
  const profile = getPlayerProfile(player);
  const displayName = getPlayerDisplayName(player, profile);
  const candidates = [name, displayName];
  const nameParts = name.split(/\s+/).filter(Boolean);
  const displayParts = displayName.split(/\s+/).filter(Boolean);

  if (nameParts.length > 1) {
    candidates.push(nameParts.at(-1));
    candidates.push(nameParts[0]);
  }

  if (displayParts.length > 1) {
    candidates.push(displayParts.at(-1));
    candidates.push(displayParts[0]);
  }

  const candidateCounts = new Map();
  for (const other of allPlayers) {
    const otherNameParts = getPlayerName(other).split(/\s+/).filter(Boolean);
    for (const part of [otherNameParts[0], otherNameParts.at(-1)].filter(Boolean)) {
      const key = normalizeTextKey(part);
      candidateCounts.set(key, (candidateCounts.get(key) || 0) + 1);
    }
  }

  return [...new Set(candidates)]
    .map((alias) => alias.trim())
    .filter((alias) => alias.length >= 3)
    .filter((alias) => {
      const isFullName = /\s/.test(alias);
      return isFullName || candidateCounts.get(normalizeTextKey(alias)) === 1;
    });
}

function getPlayerMentionEntries(players) {
  const aliasBuckets = new Map();

  for (const player of players) {
    if (!getPlayerName(player)) {
      continue;
    }

    for (const alias of getPlayerAliases(player, players)) {
      const key = normalizeTextKey(alias);
      const bucket = aliasBuckets.get(key) || { alias, players: [] };
      bucket.players.push(player);
      aliasBuckets.set(key, bucket);
    }
  }

  return [...aliasBuckets.values()]
    .filter((bucket) => bucket.players.length === 1)
    .map((bucket) => ({ alias: bucket.alias, player: bucket.players[0] }))
    .sort((a, b) => b.alias.length - a.alias.length);
}

function renderPlayerPhoto(player, profile) {
  const displayName = getPlayerDisplayName(player, profile);
  if (profile?.imageUrl) {
    return `
      <img
        src="${escapeHtml(profile.imageUrl)}"
        alt=""
        loading="lazy"
        referrerpolicy="no-referrer"
      />
    `;
  }

  return `<span class="player-photo-fallback">${escapeHtml(getPlayerInitials(displayName))}</span>`;
}

function renderPlayerMention(label, player) {
  const profile = getPlayerProfile(player);
  const displayName = getPlayerDisplayName(player, profile);
  const position = profile?.position || "Position to verify";
  const club = getPlayerClubLine(profile);
  const sourceUrl = profile?.sourceUrl || "";
  const note = getPlayerNote(player) || profile?.note || "";
  const skills = getPlayerSkills(player, profile);
  const triggerLabel = `aria-label="${escapeHtml(`${displayName}: ${position}, ${club}`)}"`;
  const trigger = sourceUrl
    ? `<a class="player-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener" ${triggerLabel}>${escapeHtml(label)}</a>`
    : `<span class="player-link" role="button" tabindex="0" ${triggerLabel}>${escapeHtml(label)}</span>`;

  return `
    <span class="player-hover">
      ${trigger}
      <span class="player-card" role="tooltip">
        <span class="player-card-header">
          <span class="player-photo">${renderPlayerPhoto(player, profile)}</span>
          <span class="player-card-title">
            <strong>${escapeHtml(displayName)}</strong>
            <span>${escapeHtml(position)}</span>
            <span>${escapeHtml(club)}</span>
          </span>
        </span>
        <span class="player-skill-list">
          ${skills.map((skill) => `<span>${escapeHtml(skill)}</span>`).join("")}
        </span>
        ${note ? `<span class="player-card-note">${escapeHtml(note)}</span>` : ""}
      </span>
    </span>
  `;
}

function positionPlayerCard(playerHover) {
  const card = playerHover?.querySelector(".player-card");
  if (!card) {
    return;
  }

  const viewportMargin = 18;
  const maxCardWidth = Math.max(0, window.innerWidth - viewportMargin * 2);
  const cardWidth = Math.min(292, maxCardWidth);
  const triggerRect = playerHover.getBoundingClientRect();
  const desiredLeft = Math.max(
    viewportMargin,
    Math.min(triggerRect.left, window.innerWidth - cardWidth - viewportMargin)
  );
  const shift = desiredLeft - triggerRect.left;

  card.style.setProperty("--player-card-width", `${cardWidth}px`);
  card.style.setProperty("--player-card-shift", `${Math.round(shift)}px`);
}

function positionPlayerCards() {
  matchInfo
    .querySelectorAll(".player-hover")
    .forEach((playerHover) => positionPlayerCard(playerHover));
}

function renderPlayerLinkedText(text, players = []) {
  const entries = getPlayerMentionEntries(players);
  if (!entries.length) {
    return escapeHtml(text);
  }

  const playerByAlias = new Map(entries.map((entry) => [entry.alias, entry.player]));
  const aliasPattern = entries.map((entry) => escapeRegExp(entry.alias)).join("|");
  const mentionPattern = new RegExp(
    `(^|[^A-Za-z])(${aliasPattern})('s)?(?=$|[^A-Za-z])`,
    "g"
  );
  let html = "";
  let cursor = 0;

  for (const match of text.matchAll(mentionPattern)) {
    const [fullMatch, prefix, alias, possessive = ""] = match;
    const start = match.index + prefix.length;
    const end = match.index + fullMatch.length;
    const player = playerByAlias.get(alias);

    if (!player) {
      continue;
    }

    html += escapeHtml(text.slice(cursor, start));
    html += renderPlayerMention(`${alias}${possessive}`, player);
    cursor = end;
  }

  html += escapeHtml(text.slice(cursor));
  return html;
}

function getMatchKeyPlayers(match) {
  return [
    ...(match.keyPlayers?.home || []),
    ...(match.keyPlayers?.away || [])
  ].filter((player) => getPlayerName(player));
}

function renderKeyInformationTeam(team, info, players = [], mentionPlayers = players) {
  const text = getKeyInformationText(team, info, players);
  const label = getKeyInformationLabel(team);
  return `
    <article class="key-info-team">
      <h4>${renderPlayerLinkedText(label, mentionPlayers)}</h4>
      <p>${renderPlayerLinkedText(text, mentionPlayers)}</p>
    </article>
  `;
}

function renderKeyInformation(match) {
  const keyInformation = match.keyInformation || {};
  const keyPlayers = match.keyPlayers || {};
  const mentionPlayers = getMatchKeyPlayers(match);

  return `
    <div class="key-info-grid">
      ${renderKeyInformationTeam(match.homeTeam, keyInformation.home, keyPlayers.home, mentionPlayers)}
      ${renderKeyInformationTeam(match.awayTeam, keyInformation.away, keyPlayers.away, mentionPlayers)}
    </div>
  `;
}

function getPastWinnerTeamId(result) {
  const hasStructuredScore =
    result.homeTeamId &&
    result.awayTeamId &&
    Number.isFinite(Number(result.homeScore)) &&
    Number.isFinite(Number(result.awayScore));

  if (!hasStructuredScore || Number(result.homeScore) === Number(result.awayScore)) {
    return "";
  }

  return Number(result.homeScore) > Number(result.awayScore)
    ? result.homeTeamId
    : result.awayTeamId;
}

function getPastRecord(match, results) {
  return results.reduce(
    (record, result) => {
      const winnerTeamId = getPastWinnerTeamId(result);

      if (!winnerTeamId) {
        record.draws += 1;
      } else if (winnerTeamId === match.homeTeamId) {
        record.homeWins += 1;
      } else if (winnerTeamId === match.awayTeamId) {
        record.awayWins += 1;
      }

      return record;
    },
    { awayWins: 0, draws: 0, homeWins: 0, total: results.length }
  );
}

function formatPastRecordPercent(count, total) {
  if (!total) {
    return "0%";
  }

  return `${Math.round((count / total) * 100)}%`;
}

function formatPastRecordCount(count, type) {
  if (type === "draw") {
    return `${count} ${count === 1 ? "draw" : "draws"}`;
  }

  return `${count} ${count === 1 ? "win" : "wins"}`;
}

function renderPastRecord(match, results) {
  const record = getPastRecord(match, results);
  const items = [
    { count: record.homeWins, label: match.homeTeam.name, type: "win" },
    { count: record.draws, label: "Draw", type: "draw" },
    { count: record.awayWins, label: match.awayTeam.name, type: "win" }
  ].map((item) => {
    const percent = formatPastRecordPercent(item.count, record.total);
    const share = record.total ? (item.count / record.total) * 100 : 0;
    const countLabel = formatPastRecordCount(item.count, item.type);
    const compactLabel = `${item.count} (${percent})`;

    return {
      ...item,
      compactLabel,
      countLabel,
      percent,
      share,
      rowLabel: `${item.label}: ${countLabel}, ${percent}`
    };
  });
  const recordLabel = `Head-to-head record across ${record.total} ${
    record.total === 1 ? "match" : "matches"
  }`;

  return `
    <div class="past-record" aria-label="${escapeHtml(recordLabel)}">
      ${items
        .map(
          (item) => `
            <article class="past-record-row" aria-label="${escapeHtml(item.rowLabel)}">
              <span class="past-record-label">${escapeHtml(item.label)}</span>
              <span class="past-record-track" aria-hidden="true">
                <span style="--record-share: ${escapeHtml(item.share.toFixed(3))}%;"></span>
              </span>
              <span class="past-record-count">${escapeHtml(item.compactLabel)}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderPastResultList(results, leadingTeamId = "", options = {}) {
  const listClass = ["past-list", options.className || ""].filter(Boolean).join(" ");

  return `
    <ul class="${escapeHtml(listClass)}">
      ${results
        .map(
          (result) => `
            <li>
              <span class="past-meta">
                <span>${escapeHtml(result.date)}</span>
                <em>${escapeHtml(result.competition)}</em>
              </span>
              ${renderPastScoreline(result, leadingTeamId)}
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderPastResults(match) {
  const h2h = match.h2h || {};
  const summary = h2h.summary
    ? `<p class="h2h-summary">${escapeHtml(h2h.summary)}</p>`
    : "";

  if (!Array.isArray(h2h.results)) {
    if (h2h.status === "research-pending") {
      return summary;
    }

    return `
      ${summary}
      <p class="past-empty">Past match research is not loaded for this fixture yet.</p>
    `;
  }

  if (!h2h.results.length) {
    return summary || `<p class="past-empty">No verified senior meetings found before this match.</p>`;
  }

  const visibleResults = h2h.results.slice(0, 3);
  const hiddenResults = h2h.results.slice(3);
  const totalResults = h2h.results.length;
  const hiddenCount = hiddenResults.length;
  const hiddenResultsId = `past-results-${match.id}`;

  return `
    ${renderPastRecord(match, h2h.results)}
    ${renderPastResultList(visibleResults, match.homeTeamId, {
      className: hiddenCount ? "has-hidden-results" : ""
    })}
    ${
      hiddenCount
        ? `
          <div class="past-reveal">
            <button class="past-reveal-button" type="button" data-past-reveal aria-controls="${escapeHtml(hiddenResultsId)}" aria-label="Show all ${escapeHtml(totalResults)} matches">
              <span class="past-reveal-action">Show all matches</span>
            </button>
            <div class="past-hidden-results" id="${escapeHtml(hiddenResultsId)}" hidden>
              ${renderPastResultList(hiddenResults, match.homeTeamId)}
            </div>
          </div>
        `
        : ""
    }
  `;
}

function renderMatchContext(match) {
  if (match.stage === "group") {
    const group = getGroup(match.groupId);
    return `
      <section class="info-block">
        <h3>Group standings</h3>
        ${renderStandings(match.groupId, { showRank: false })}
        <p class="data-note">Shown in current table order. Points, record and goal difference are included for context.</p>
      </section>
    `;
  }

  const stage = tournament.stages.find((item) => item.id === match.stage);
  return `
    <section class="info-block">
      <h3>Knockout context <span class="section-note">bracket-ready</span></h3>
      <p class="past-empty">${escapeHtml(stage?.label || "Knockout match")} bracket details are not loaded yet.</p>
    </section>
  `;
}

function revealMatchInfoOnSmallScreens() {
  if (!window.matchMedia("(max-width: 1160px)").matches) {
    return;
  }

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  window.requestAnimationFrame(() => {
    matchInfo.scrollIntoView({
      block: "start",
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });
  });
}

function formatScorePair(pair) {
  if (!pair || !Number.isFinite(Number(pair.home)) || !Number.isFinite(Number(pair.away))) {
    return "";
  }

  return `${pair.home}-${pair.away}`;
}

function renderHistoricalScoreDetails(match) {
  const details = match.scoreDetails || {};
  const rows = [
    { label: "Final", value: formatScorePair(match.score) },
    { label: "Half-time", value: formatScorePair(details.halfTime) },
    { label: "After extra time", value: formatScorePair(details.extraTime) },
    { label: "Penalties", value: formatScorePair(details.penalties) }
  ].filter((row) => row.value);

  if (match.status === "CANCELLED") {
    rows.push({ label: "Status", value: "Cancelled" });
  }

  if (!rows.length) {
    return `<p class="past-empty">Score details are not loaded for this historical record.</p>`;
  }

  return `
    <dl class="historical-facts">
      ${rows
        .map(
          (row) => `
            <div>
              <dt>${escapeHtml(row.label)}</dt>
              <dd>${escapeHtml(row.value)}</dd>
            </div>
          `
        )
        .join("")}
    </dl>
  `;
}

function formatGoalMinute(goal) {
  if (!Number.isFinite(Number(goal.minute))) {
    return "";
  }

  const offset = Number.isFinite(Number(goal.offset)) ? `+${goal.offset}` : "";
  return `${goal.minute}${offset}'`;
}

function formatGoalNote(goal) {
  return [
    goal.penalty ? "pen." : "",
    goal.ownGoal ? "own goal" : ""
  ]
    .filter(Boolean)
    .join(", ");
}

function renderHistoricalGoalTeam(team, goals = []) {
  return `
    <article class="historical-goal-team">
      <h4>${escapeHtml(team.name)}</h4>
      ${
        goals.length
          ? `
            <ul>
              ${goals
                .map((goal) => {
                  const minute = formatGoalMinute(goal);
                  const note = formatGoalNote(goal);
                  return `
                    <li>
                      <span>${escapeHtml(goal.name || "Unknown scorer")}</span>
                      <em>${escapeHtml([minute, note].filter(Boolean).join(" / "))}</em>
                    </li>
                  `;
                })
                .join("")}
            </ul>
          `
          : `<p class="past-empty">No scorer data loaded.</p>`
      }
    </article>
  `;
}

function renderHistoricalGoals(match) {
  const hasGoals = match.goalsHome?.length || match.goalsAway?.length;

  if (!hasGoals && match.status === "CANCELLED") {
    return `<p class="past-empty">No goals because this match was cancelled.</p>`;
  }

  return `
    <div class="historical-goals">
      ${renderHistoricalGoalTeam(match.homeTeam, match.goalsHome)}
      ${renderHistoricalGoalTeam(match.awayTeam, match.goalsAway)}
    </div>
  `;
}

function getHistoricalContextLabel(match) {
  return [match.tournamentName, match.group || match.round].filter(Boolean).join(" / ");
}

function getHistoricalDateText(match) {
  const dateText = dateFormatter.format(getDateFromKey(match.date));
  return match.localTime ? `${dateText} at ${match.localTime} local time` : dateText;
}

function getHistoricalTournamentFixtures(match) {
  return historicalFixtures
    .filter((fixture) => fixture.tournamentYear === match.tournamentYear)
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)));
}

function getHistoricalScoreNote(match) {
  const penalties = match.scoreDetails?.penalties;

  if (!penalties) {
    return "";
  }

  return `${penalties.home}-${penalties.away} pens`;
}

function getHistoricalScoreText(match) {
  const score = formatScorePair(match.score);
  const note = getHistoricalScoreNote(match);

  if (!score) {
    return match.status === "CANCELLED" ? "cancelled" : "score unavailable";
  }

  return note ? `${score} (${note})` : score;
}

function getHistoricalScorePairForTeam(match, teamName) {
  const score = match.score;

  if (!score) {
    return null;
  }

  return teamName === match.awaySlot
    ? { home: score.away, away: score.home }
    : { home: score.home, away: score.away };
}

function getHistoricalPenaltyPairForTeam(match, teamName) {
  const penalties = match.scoreDetails?.penalties;

  if (!penalties) {
    return null;
  }

  return teamName === match.awaySlot
    ? { home: penalties.away, away: penalties.home }
    : { home: penalties.home, away: penalties.away };
}

function getHistoricalTeamScoreText(match, teamName) {
  const score = formatScorePair(getHistoricalScorePairForTeam(match, teamName));
  const penalties = formatScorePair(getHistoricalPenaltyPairForTeam(match, teamName));

  if (!score) {
    return match.status === "CANCELLED" ? "cancelled" : "score unavailable";
  }

  return penalties ? `${score} (${penalties} pens)` : score;
}

function getHistoricalScoreResultText(match, teamName) {
  const score = formatScorePair(getHistoricalScorePairForTeam(match, teamName));
  const penalties = formatScorePair(getHistoricalPenaltyPairForTeam(match, teamName));

  if (!score) {
    return match.status === "CANCELLED" ? "cancelled" : "score unavailable";
  }

  if (penalties) {
    return `on penalties after a ${score} draw (${penalties} in the shootout)`;
  }

  if (match.scoreDetails?.extraTime) {
    return `${score} after extra time`;
  }

  return score;
}

function getHistoricalOpponent(match, teamName) {
  return match.homeSlot === teamName ? match.awaySlot : match.homeSlot;
}

function getHistoricalWinner(match) {
  if (match.winner) {
    return match.winner;
  }

  const home = Number(match.score?.home);
  const away = Number(match.score?.away);

  if (!Number.isFinite(home) || !Number.isFinite(away) || home === away) {
    return "";
  }

  return home > away ? match.homeSlot : match.awaySlot;
}

function initializeHistoricalStanding(rows, teamName) {
  if (!rows.has(teamName)) {
    rows.set(teamName, {
      draws: 0,
      ga: 0,
      gd: 0,
      gf: 0,
      losses: 0,
      played: 0,
      points: 0,
      sourceOrder: rows.size,
      teamName,
      wins: 0
    });
  }

  return rows.get(teamName);
}

function getHistoricalGroupStandings(match) {
  return getHistoricalGroupStandingsForYear(match.tournamentYear, match.group);
}

function shouldHighlightHistoricalStanding(match, index) {
  return match.tournamentYear >= 1986 && /^Group [A-H]$/.test(match.group || "") && index < 2;
}

function renderHistoricalGroupStandings(match) {
  const rows = getHistoricalGroupStandings(match);

  if (!rows.length) {
    return `
      <section class="info-block">
        <h3>Group standings</h3>
        <p class="past-empty">Group table data is not available for this archived match.</p>
      </section>
    `;
  }

  return `
    <section class="info-block">
      <h3>Group standings</h3>
      <table class="standings-table">
        ${renderStandingsTableHead()}
        <tbody>
          ${rows
            .map(
              (row, index) => `
                <tr class="${shouldHighlightHistoricalStanding(match, index) ? "is-advancing" : ""}">
                  <td>
                    ${renderHistoricalStandingTeam(row.teamName)}
                  </td>
                  <td>${escapeHtml(row.points)}</td>
                  <td>${escapeHtml(row.wins)}-${escapeHtml(row.draws)}-${escapeHtml(row.losses)}</td>
                  <td>${escapeHtml(formatGoalDifference(row.gd))}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
      <p class="data-note">Final group table computed from archived match results.</p>
    </section>
  `;
}

function getHistoricalRoundContext(match) {
  const knockoutFixtures = getHistoricalTournamentFixtures(match).filter(
    (fixture) => !fixture.group
  );
  const roundOrder = [
    ...new Map(knockoutFixtures.map((fixture) => [fixture.round, fixture.round])).keys()
  ];
  const roundIndex = roundOrder.indexOf(match.round);
  const currentRound = knockoutFixtures.filter((fixture) => fixture.round === match.round);
  const nextRound = /semi/i.test(match.round || "")
    ? knockoutFixtures.filter((fixture) => roundOrder.indexOf(fixture.round) > roundIndex)
    : knockoutFixtures.filter((fixture) => fixture.round === roundOrder[roundIndex + 1]);
  const previousRound = knockoutFixtures.filter(
    (fixture) => fixture.round === roundOrder[roundIndex - 1]
  );
  const involvedTeams = new Set([match.homeTeam.name, match.awayTeam.name]);
  const secondaryRound = (nextRound.length ? nextRound : previousRound).filter(
    (fixture) => involvedTeams.has(fixture.homeSlot) || involvedTeams.has(fixture.awaySlot)
  );

  return {
    currentRound,
    secondaryLabel: nextRound.length ? "Next" : "Previous",
    secondaryRound
  };
}

function renderHistoricalBracketMatch(fixture, selectedId) {
  const winner = getHistoricalWinner(fixture);
  const isSelected = fixture.id === selectedId;
  const outcomeVerb = /final|third|place/i.test(fixture.round || "") ? "won" : "advanced";

  return `
    <li class="${isSelected ? "is-selected" : ""}">
      <span>${escapeHtml(fixture.homeSlot)} vs ${escapeHtml(fixture.awaySlot)}</span>
      <strong>${escapeHtml(getHistoricalScoreText(fixture))}</strong>
      ${winner ? `<em>${escapeHtml(winner)} ${escapeHtml(outcomeVerb)}</em>` : ""}
    </li>
  `;
}

function renderHistoricalBracketList(label, fixtures, selectedId) {
  if (!fixtures.length) {
    return "";
  }

  return `
    <article>
      <h4>${escapeHtml(label)}</h4>
      <ul>
        ${fixtures.map((fixture) => renderHistoricalBracketMatch(fixture, selectedId)).join("")}
      </ul>
    </article>
  `;
}

function renderHistoricalBracketContext(match) {
  const { currentRound, secondaryLabel, secondaryRound } = getHistoricalRoundContext(match);

  return `
    <section class="info-block">
      <h3>Knockout context <span class="section-note">archive</span></h3>
      <div class="historical-bracket">
        ${renderHistoricalBracketList(match.round || "This round", currentRound, match.id)}
        ${renderHistoricalBracketList(secondaryLabel, secondaryRound, match.id)}
      </div>
    </section>
  `;
}

function renderHistoricalContext(match) {
  if (match.group) {
    return renderHistoricalGroupStandings(match);
  }

  return renderHistoricalBracketContext(match);
}

function getNextHistoricalMatchForTeam(match, teamName) {
  return getHistoricalTournamentFixtures(match).find(
    (fixture) =>
      getFixtureSortValue(fixture) > getFixtureSortValue(match) &&
      (fixture.homeSlot === teamName || fixture.awaySlot === teamName)
  );
}

function getHistoricalTeamKeyHeadline(match, teamName) {
  if (match.status === "CANCELLED") {
    return `${teamName}: match cancelled`;
  }

  const winner = getHistoricalWinner(match);
  const scoreText = getHistoricalTeamScoreText(match, teamName);
  const penalties = match.scoreDetails?.penalties;

  if (!winner) {
    return `${teamName}: drew ${scoreText}`;
  }

  if (penalties) {
    return winner === teamName
      ? `${teamName}: won on pens, ${scoreText}`
      : `${teamName}: lost on pens, ${scoreText}`;
  }

  return winner === teamName ? `${teamName}: won ${scoreText}` : `${teamName}: lost ${scoreText}`;
}

function getHistoricalTeamGoals(match, teamName) {
  return teamName === match.homeSlot ? match.goalsHome || [] : match.goalsAway || [];
}

function formatHistoricalGoalName(goal) {
  return goal.ownGoal ? `${goal.name || "an opponent"} own goal` : goal.name || "Unknown scorer";
}

function formatHistoricalScorerSeries(items) {
  if (!items.length) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return items.join(" and ");
  }

  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function formatHistoricalScorerCount(name, count) {
  if (count >= 3) {
    return `${name} scored a hat trick`;
  }

  if (count === 2) {
    return `${name} scored twice`;
  }

  return `${name} scored`;
}

function getHistoricalScorerText(goals = []) {
  if (!goals.length) {
    return "";
  }

  const scorers = new Map();
  const ownGoals = [];

  for (const goal of goals) {
    if (goal.ownGoal) {
      ownGoals.push(formatHistoricalGoalName(goal));
      continue;
    }

    const name = goal.name || "Unknown scorer";
    scorers.set(name, (scorers.get(name) || 0) + 1);
  }

  const scorerText = [...scorers.entries()].map(([name, count]) =>
    formatHistoricalScorerCount(name, count)
  );
  const ownGoalText = ownGoals.map((name) => `benefited from ${name}`);
  const scoringMoments = [...scorerText, ...ownGoalText];

  if (!scoringMoments.length) {
    return "";
  }

  return `${formatHistoricalScorerSeries(scoringMoments)}.`;
}

function getHistoricalRoundText(match) {
  return match.group ? `${match.group} (${match.round})` : `the ${match.round || "match"}`;
}

function getHistoricalResultVerb(match, teamName) {
  const winner = getHistoricalWinner(match);
  const penalties = match.scoreDetails?.penalties;

  if (!winner) {
    return "Drew with";
  }

  if (penalties) {
    return winner === teamName ? "Beat" : "Lost to";
  }

  return winner === teamName ? "Beat" : "Lost to";
}

function getHistoricalProgressionText(match, teamName, nextMatch) {
  if (nextMatch) {
    return `Next: ${nextMatch.round} vs ${getHistoricalOpponent(nextMatch, teamName)}, ${navDateWithYearFormatter.format(getDateFromKey(nextMatch.date))}.`;
  }

  if (match.round === "Final" && getHistoricalWinner(match) === teamName) {
    return `That sealed the ${match.tournamentName} title.`;
  }

  if (match.round === "Final") {
    return `That ended their ${match.tournamentName} run as runners-up.`;
  }

  if (/third|3rd|place/i.test(match.round || "")) {
    return getHistoricalWinner(match) === teamName
      ? `That secured third place at ${match.tournamentName}.`
      : `That closed their ${match.tournamentName} run in the third-place match.`;
  }

  return `That was their last loaded match at ${match.tournamentName}.`;
}

function getHistoricalTeamKeyBody(match, teamName) {
  const nextMatch = getNextHistoricalMatchForTeam(match, teamName);
  const opponent = getHistoricalOpponent(match, teamName);
  const opponentText = opponent || "their opponent";
  const roundText = getHistoricalRoundText(match);
  const scoreText = getHistoricalScoreResultText(match, teamName);
  const scorerText = getHistoricalScorerText(getHistoricalTeamGoals(match, teamName));
  const result =
    match.status === "CANCELLED"
      ? `Scheduled against ${opponentText}, but the match was cancelled.`
      : `${getHistoricalResultVerb(match, teamName)} ${opponentText} ${scoreText} in ${roundText}.`;

  return [result, scorerText, getHistoricalProgressionText(match, teamName, nextMatch)]
    .filter(Boolean)
    .join(" ");
}

function renderHistoricalKeyInformation(match) {
  return `
    <div class="key-info-grid">
      ${[match.homeTeam.name, match.awayTeam.name]
        .map(
          (teamName) => `
            <article class="key-info-team">
              <h4>${escapeHtml(getHistoricalTeamKeyHeadline(match, teamName))}</h4>
              <p>${escapeHtml(getHistoricalTeamKeyBody(match, teamName))}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function isHistoricalMatchBefore(candidate, match) {
  return getFixtureSortValue(candidate) < getFixtureSortValue(match);
}

function isHistoricalPair(candidate, match) {
  const candidateTeams = [candidate.homeSlot, candidate.awaySlot].sort().join("|");
  const matchTeams = [match.homeTeam.name, match.awayTeam.name].sort().join("|");
  return candidateTeams === matchTeams;
}

function getHistoricalPastMeetings(match) {
  return historicalFixtures
    .filter(
      (fixture) =>
        fixture.status === "FT" &&
        isHistoricalPair(fixture, match) &&
        isHistoricalMatchBefore(fixture, match)
    )
    .sort((a, b) => getFixtureSortValue(b).localeCompare(getFixtureSortValue(a)));
}

function getHistoricalPastRecord(match, results) {
  return results.reduce(
    (record, result) => {
      const winner = getHistoricalWinner(result);

      if (!winner) {
        record.draws += 1;
      } else if (winner === match.homeTeam.name) {
        record.homeWins += 1;
      } else if (winner === match.awayTeam.name) {
        record.awayWins += 1;
      }

      return record;
    },
    { awayWins: 0, draws: 0, homeWins: 0, total: results.length }
  );
}

function renderHistoricalPastRecord(match, results) {
  const record = getHistoricalPastRecord(match, results);
  const items = [
    { count: record.homeWins, label: match.homeTeam.name, type: "win" },
    { count: record.draws, label: "Draw", type: "draw" },
    { count: record.awayWins, label: match.awayTeam.name, type: "win" }
  ].map((item) => {
    const percent = formatPastRecordPercent(item.count, record.total);
    const share = record.total ? (item.count / record.total) * 100 : 0;
    const countLabel = formatPastRecordCount(item.count, item.type);
    const compactLabel = `${item.count} (${percent})`;

    return {
      ...item,
      compactLabel,
      countLabel,
      percent,
      share,
      rowLabel: `${item.label}: ${countLabel}, ${percent}`
    };
  });

  return `
    <div class="past-record" aria-label="World Cup head-to-head record across ${escapeHtml(record.total)} matches">
      ${items
        .map(
          (item) => `
            <article class="past-record-row" aria-label="${escapeHtml(item.rowLabel)}">
              <span class="past-record-label">${escapeHtml(item.label)}</span>
              <span class="past-record-track" aria-hidden="true">
                <span style="--record-share: ${escapeHtml(item.share.toFixed(3))}%;"></span>
              </span>
              <span class="past-record-count">${escapeHtml(item.compactLabel)}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function getHistoricalTeamResultClass(teamName, winner) {
  return [
    "past-team",
    winner === teamName ? "is-winner" : "",
    winner && winner !== teamName ? "is-loser" : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function renderHistoricalPastScoreline(result, leadingTeamName = "") {
  const shouldFlip = leadingTeamName && result.awaySlot === leadingTeamName;
  const leftName = shouldFlip ? result.awaySlot : result.homeSlot;
  const rightName = shouldFlip ? result.homeSlot : result.awaySlot;
  const leftScore = shouldFlip ? result.score?.away : result.score?.home;
  const rightScore = shouldFlip ? result.score?.home : result.score?.away;
  const scoreText = formatScorePair({ home: leftScore, away: rightScore });
  const scoreNote = getHistoricalScoreNote(result);
  const winner = getHistoricalWinner(result);
  const leftTeam = getHistoricalTeam(leftName) || { isSlot: true, name: leftName };
  const rightTeam = getHistoricalTeam(rightName) || { isSlot: true, name: rightName };
  const scoreLabel = [leftName, scoreText, rightName].filter(Boolean).join(" ");
  const scoreNoteLabel = scoreNote ? `, ${scoreNote}` : "";

  return `
    <div class="past-scoreline historical-past-scoreline" aria-label="${escapeHtml(scoreLabel)}${escapeHtml(scoreNoteLabel)}">
      ${renderTeamInline(leftTeam, getHistoricalTeamResultClass(leftName, winner), { showRank: false })}
      <strong class="past-score">
        ${escapeHtml(scoreText)}
        ${scoreNote ? `<span>${escapeHtml(scoreNote)}</span>` : ""}
      </strong>
      ${renderTeamInline(rightTeam, getHistoricalTeamResultClass(rightName, winner), { showRank: false })}
    </div>
  `;
}

function renderHistoricalPastMatches(match) {
  const results = getHistoricalPastMeetings(match);

  if (!results.length) {
    return `<p class="past-empty">No previous men's World Cup meetings are loaded before this match.</p>`;
  }

  return `
    ${renderHistoricalPastRecord(match, results)}
    <ul class="past-list">
      ${results
        .slice(0, 3)
        .map(
          (result) => `
            <li>
              <span class="past-meta">
                <span>${escapeHtml(result.date)}</span>
                <em>${escapeHtml(result.tournamentName)} / ${escapeHtml(result.round)}</em>
              </span>
              ${renderHistoricalPastScoreline(result, match.homeTeam.name)}
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderHistoricalMatchInfo(match) {
  return `
    <section class="info-block match-summary">
      <p class="info-kicker">${escapeHtml(getHistoricalContextLabel(match))}</p>
      <h2 class="summary-title">
        ${renderTeamInline(match.homeTeam, "summary-team", { showRank: false })}
        <span class="versus">vs</span>
        ${renderTeamInline(match.awayTeam, "summary-team", { showRank: false })}
      </h2>
      <p>${escapeHtml(getVenueLabel(match))}</p>
    </section>

    ${renderHistoricalContext(match)}

    <section class="info-block">
      ${renderPredictionHeading(getHistoricalProjection(match))}
      ${renderHistoricalProjection(match)}
    </section>

    <section class="info-block">
      <h3>Key information</h3>
      ${renderHistoricalKeyInformation(match)}
    </section>

    <section class="info-block">
      <h3>Past matches</h3>
      ${renderHistoricalPastMatches(match)}
    </section>
  `;
}

function renderMatchInfo(match, options = {}) {
  activeMatchId = match.id;
  viewPanels.matches.classList.add("has-match-info");
  matchInfo.classList.remove("is-hidden");
  matchInfo.hidden = false;

  document.querySelectorAll(".match-row").forEach((row) => {
    const isSelected = row.dataset.matchId === match.id;
    row.classList.toggle("is-selected", isSelected);
    row.setAttribute("aria-pressed", String(isSelected));
  });

  if (match.isHistorical) {
    matchInfo.innerHTML = renderHistoricalMatchInfo(match);
    positionPlayerCards();
    if (options.reveal) {
      revealMatchInfoOnSmallScreens();
    }
    return;
  }

  const group = getGroup(match.groupId);
  const stage = tournament.stages.find((item) => item.id === match.stage);
  const contextLabel =
    match.stage === "group"
      ? group?.label || `Group ${match.groupId}`
      : stage?.label || match.stage;

  matchInfo.innerHTML = `
    <section class="info-block match-summary">
      <p class="info-kicker">${escapeHtml(contextLabel)}</p>
      <h2 class="summary-title">
        ${renderTeamInline(match.homeTeam, "summary-team", { showRank: false })}
        <span class="versus">vs</span>
        ${renderTeamInline(match.awayTeam, "summary-team", { showRank: false })}
      </h2>
      <p>${escapeHtml(getVenueLabel(match))}</p>
    </section>

    ${renderMatchContext(match)}

    ${renderMatchStatusBlock(match)}

    <section class="info-block">
      <h3>Key information</h3>
      ${renderKeyInformation(match)}
    </section>

    <section class="info-block">
      <h3>Past matches</h3>
      ${renderPastResults(match)}
    </section>
  `;
  positionPlayerCards();

  if (options.reveal) {
    revealMatchInfoOnSmallScreens();
  }
}

function renderMatchInfoPrompt() {
  activeMatchId = "";
  viewPanels.matches.classList.remove("has-match-info");
  document.querySelectorAll(".match-row").forEach((row) => {
    row.classList.remove("is-selected");
    row.setAttribute("aria-pressed", "false");
  });
  matchInfo.replaceChildren();
  matchInfo.classList.add("is-hidden");
  matchInfo.hidden = true;
}

function renderEmptyState() {
  activeMatchId = "";
  viewPanels.matches.classList.remove("has-match-info");
  const selectedDate = dateFormatter.format(getDateFromKey(selectedDayKey));
  const reportUrl = getReportIssueUrl("no-matches");
  const message =
    dataCoverage.status === "partial"
      ? `Verified fixture data is not loaded for ${selectedDate}. This avoids showing a false no-match day.`
      : `No matches were found for ${selectedDate}.`;

  matchList.innerHTML = `
    <article class="empty-state">
      <h2>${dataCoverage.status === "partial" ? "Not loaded" : "No matches"}</h2>
      <p>${escapeHtml(message)}</p>
      <div class="empty-actions">
        <a class="secondary-button" href="${escapeHtml(reportUrl)}">Report issue</a>
      </div>
    </article>
  `;
  matchInfo.replaceChildren();
  matchInfo.classList.add("is-hidden");
  matchInfo.hidden = true;
}

function getReportIssueUrl(type) {
  const params = new URLSearchParams({
    type,
    date: selectedDayKey,
    tz: selectedTimeZone,
    from: window.location.href
  });

  return `report.html?${params.toString()}`;
}

function getMatchesForSelectedDay() {
  return getCalendarFixtures()
    .filter((fixture) => getFixtureDayKey(fixture) === selectedDayKey)
    .sort((a, b) => getFixtureSortValue(a).localeCompare(getFixtureSortValue(b)))
    .map(hydrateFixture);
}

function normalizeCatchUpItem(item, match) {
  if (!item?.headline) {
    return null;
  }

  const dateKey = item.date || getFixtureDayKey(match);
  const priority = Number(item.priority);
  return {
    dateKey,
    headline: item.headline,
    body: item.body || item.note || "",
    standouts: normalizeCatchUpStandouts(item.standouts || item.standout || item.playerPulse),
    meta: item.meta || `${match.homeTeam.name} vs ${match.awayTeam.name}`,
    sourceLabel: item.sourceLabel || "",
    sourceUrl: item.sourceUrl || item.url || "",
    priority: Number.isFinite(priority) ? priority : 10,
    sortValue: item.sortValue || getFixtureSortValue(match)
  };
}

function normalizeCatchUpStandout(standout) {
  if (typeof standout === "string") {
    return standout.trim();
  }

  const name = standout?.playerName || standout?.name || "";
  const team = standout?.teamName || standout?.team || "";
  const text = standout?.text || standout?.note || "";
  const label = [name, team].filter(Boolean).join(", ");

  if (label && text) {
    return `${label}: ${text}`;
  }

  return label || text;
}

function normalizeCatchUpStandouts(standouts) {
  const items = Array.isArray(standouts) ? standouts : [standouts];

  return items.map(normalizeCatchUpStandout).filter(Boolean);
}

function getAuthoredCatchUpItems(match) {
  const sourceItems = match.catchUp || match.digest || [];
  if (!Array.isArray(sourceItems)) {
    return [];
  }

  return sourceItems.map((item) => normalizeCatchUpItem(item, match)).filter(Boolean);
}

function getPlayerName(player) {
  return typeof player === "string" ? player : player?.name || "";
}

function getPlayerNote(player) {
  return typeof player === "string" ? "" : player?.note || "";
}

function getCatchUpPlayerHeadline(player) {
  const name = getPlayerName(player);
  const note = getPlayerNote(player).toLowerCase();

  if (!name) {
    return "";
  }

  if (/(keeper|shot-stopper|goalkeeper|saves?)/.test(note)) {
    return `${name} is the keeper talking point`;
  }

  if (/(set-piece|crosses|aerial|second balls)/.test(note)) {
    return `${name} makes dead-ball moments interesting`;
  }

  if (/(finisher|striker|shot threat|penalty-box|focal)/.test(note)) {
    return `${name} carries the finishing thread`;
  }

  if (/(explosive|runner|ball-carrier|behind the defensive line|route behind)/.test(note)) {
    return `${name} is the burst-of-pace angle`;
  }

  if (/(captain|organizer|anchor|shield|tempo setter)/.test(note)) {
    return `${name} is the control point`;
  }

  return `${name} is the name to know`;
}

function getCatchUpScore(match) {
  const home = Number(match.score?.home);
  const away = Number(match.score?.away);

  if (!Number.isFinite(home) || !Number.isFinite(away)) {
    return null;
  }

  return { home, away };
}

function getCatchUpContext(match) {
  if (match.stage === "group") {
    return getGroup(match.groupId)?.label || `Group ${match.groupId}`;
  }

  return tournament.stages.find((stage) => stage.id === match.stage)?.label || match.stage;
}

function getResultCatchUpItem(match) {
  const score = getCatchUpScore(match);
  const meta = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
  const dateKey = getFixtureDayKey(match);
  const sortValue = getFixtureSortValue(match);
  const context = getCatchUpContext(match);

  if (match.status === "LIVE") {
    if (!score) {
      return {
        dateKey,
        headline: `${match.homeTeam.name} vs ${match.awayTeam.name} is underway`,
        body: `${context} has moved from preview mode into live tournament business.`,
        meta,
        priority: 18,
        sortValue
      };
    }

    const leaderSide = getScoreWinnerSide(score.home, score.away);
    if (!leaderSide) {
      return {
        dateKey,
        headline: `${match.homeTeam.name} and ${match.awayTeam.name} are trading momentum`,
        body: `It is ${score.home}-${score.away} live, with both sides close enough for one moment to change the story.`,
        meta,
        priority: 16,
        sortValue
      };
    }

    const leader = leaderSide === "home" ? match.homeTeam : match.awayTeam;
    const chaser = leaderSide === "home" ? match.awayTeam : match.homeTeam;
    const leaderScore = leaderSide === "home" ? score.home : score.away;
    const chaserScore = leaderSide === "home" ? score.away : score.home;

    return {
      dateKey,
      headline: `${leader.name} have a live edge over ${chaser.name}`,
      body: `${leader.name} lead ${leaderScore}-${chaserScore}, but ${chaser.name} still have time to pull the match back.`,
      meta,
      priority: 16,
      sortValue
    };
  }

  if (match.status !== "FT" || !score) {
    return null;
  }

  const winnerSide = getScoreWinnerSide(score.home, score.away);

  if (!winnerSide) {
    return {
      dateKey,
      headline: `${match.homeTeam.name} and ${match.awayTeam.name} split the points`,
      body: `${score.home}-${score.away} keeps ${context} open and gives both teams something to carry into the next match.`,
      meta,
      priority: 28,
      sortValue
    };
  }

  const winner = winnerSide === "home" ? match.homeTeam : match.awayTeam;
  const loser = winnerSide === "home" ? match.awayTeam : match.homeTeam;
  const winnerScore = winnerSide === "home" ? score.home : score.away;
  const loserScore = winnerSide === "home" ? score.away : score.home;
  const margin = winnerScore - loserScore;
  const headline =
    margin >= 3
      ? `${winner.name} make a statement against ${loser.name}`
      : margin === 2
        ? `${winner.name} look sharp against ${loser.name}`
        : `${winner.name} edge ${loser.name} in a tight one`;

  return {
    dateKey,
    headline,
    body: `${winner.name}'s ${winnerScore}-${loserScore} win gives them an early foothold in ${context}.`,
    meta,
    priority: 28,
    sortValue
  };
}

function getCatchUpPlayerBody(player, team) {
  const note = getPlayerNote(player);
  const name = getPlayerName(player);

  if (/world cup piece missing from his resume/i.test(note)) {
    return `${name} is still Portugal's biggest name near goal, and the World Cup is still missing from his career.`;
  }

  if (/penalty-box reference/i.test(note)) {
    return note
      .replace(/headline finisher and penalty-box reference point/i, "main scorer")
      .replace(/penalty-box reference and aerial finisher/i, "main target near goal")
      .replace(/penalty-box reference and power finisher/i, "main scorer near goal");
  }

  if (note) {
    return note;
  }

  return `${name} is part of ${team.name}'s core match plan.`;
}

function getPrimaryCatchUpPlayer(match) {
  const players = [
    ...(match.keyPlayers?.home || []).map((player) => ({
      player,
      team: match.homeTeam
    })),
    ...(match.keyPlayers?.away || []).map((player) => ({
      player,
      team: match.awayTeam
    }))
  ].filter(({ player }) => getPlayerName(player));

  return (
    players.find(({ player }) =>
      /(keeper|shot-stopper|goalkeeper|saves?)/i.test(getPlayerNote(player))
    ) ||
    players.find(({ player }) =>
      /(finisher|striker|shot threat|penalty-box|set-piece|explosive)/i.test(
        getPlayerNote(player)
      )
    ) ||
    players[0]
  );
}

function getSeriesCatchUpItem(match) {
  const summary = match.h2h?.summary || "";
  const dateKey = getFixtureDayKey(match);

  if (/never met|first head-to-head/i.test(summary)) {
    return {
      dateKey,
      headline: `${match.homeTeam.name} and ${match.awayTeam.name} have no shared script`,
      body: summary,
      meta: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
      priority: 50,
      sortValue: getFixtureSortValue(match)
    };
  }

  if (/level/i.test(summary)) {
    return {
      dateKey,
      headline: `${match.homeTeam.name} vs ${match.awayTeam.name} is basically even historically`,
      body: summary,
      meta: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
      priority: 65,
      sortValue: getFixtureSortValue(match)
    };
  }

  return null;
}

function getUpsetCatchUpItem(match) {
  if (!match.homeTeam.fifaRank || !match.awayTeam.fifaRank) {
    return null;
  }

  const homeRank = Number(match.homeTeam.fifaRank);
  const awayRank = Number(match.awayTeam.fifaRank);
  const gap = Math.abs(homeRank - awayRank);

  if (!Number.isFinite(gap) || gap < 18) {
    return null;
  }

  const favorite = homeRank < awayRank ? match.homeTeam : match.awayTeam;
  const chaser = homeRank < awayRank ? match.awayTeam : match.homeTeam;

  return {
    dateKey: getFixtureDayKey(match),
    headline: `${chaser.name} have the upset-watch angle`,
    body: `${favorite.name} enter with the stronger FIFA ranking, so ${chaser.name} only need a few loud moments to become the conversation.`,
    meta: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
    priority: 70,
    sortValue: getFixtureSortValue(match)
  };
}

function getGeneratedCatchUpItems(match) {
  const resultItem = getResultCatchUpItem(match);
  return resultItem ? [resultItem] : [];
}

function shiftDayKey(dayKey, days) {
  const date = getDateFromKey(dayKey);
  date.setUTCDate(date.getUTCDate() + days);
  return getDayKeyFromDate(date);
}

function getCatchUpWindowDayKeys() {
  const todayKey = getDayKey(new Date(), selectedTimeZone);
  return [shiftDayKey(todayKey, -1), todayKey];
}

function getCatchUpRangeLabel(dayKeys) {
  if (!dayKeys.length) {
    return "";
  }

  const [startKey] = dayKeys;
  const endKey = dayKeys.at(-1);

  if (startKey === endKey) {
    return navDateFormatter.format(getDateFromKey(startKey));
  }

  return `${navDateFormatter.format(getDateFromKey(startKey))}-${catchUpItemDateFormatter.format(
    getDateFromKey(endKey)
  )}`;
}

function hasMatchStarted(match) {
  return match.status === "FT" || match.status === "LIVE";
}

function getCatchUpMatchRank(match) {
  if (match.status === "LIVE") {
    return 0;
  }

  if (match.status === "FT") {
    return 1;
  }

  return 2;
}

function compareCatchUpItemsChronologically(a, b) {
  return (
    (a.sortValue || "").localeCompare(b.sortValue || "") ||
    (a.dateKey || "").localeCompare(b.dateKey || "") ||
    (a.priority ?? 99) - (b.priority ?? 99) ||
    a.headline.localeCompare(b.headline)
  );
}

function compareCatchUpItemsByRecency(a, b) {
  return (
    (b.sortValue || "").localeCompare(a.sortValue || "") ||
    (b.dateKey || "").localeCompare(a.dateKey || "") ||
    (a.priority ?? 99) - (b.priority ?? 99) ||
    a.headline.localeCompare(b.headline)
  );
}

function getCatchUpItems() {
  const dayKeys = new Set(getCatchUpWindowDayKeys());

  const items = fixtures
    .filter((fixture) => dayKeys.has(getFixtureDayKey(fixture)) && hasMatchStarted(fixture))
    .sort(
      (a, b) =>
        getCatchUpMatchRank(a) - getCatchUpMatchRank(b) ||
        getFixtureSortValue(b).localeCompare(getFixtureSortValue(a))
    )
    .map(hydrateFixture)
    .flatMap((match) => {
      const authoredItems = getAuthoredCatchUpItems(match);
      return authoredItems.length ? authoredItems : getGeneratedCatchUpItems(match);
    })
    .sort(compareCatchUpItemsByRecency)
    .slice(0, 5);

  return items.sort(compareCatchUpItemsChronologically);
}

function splitCatchUpBullet(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  return trimmed
    .split(/;\s+|,\s+while\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getCatchUpBullets(standouts) {
  return (standouts || []).flatMap(splitCatchUpBullet);
}

function renderCatchUpItem(item) {
  const itemDate = getDateFromKey(item.dateKey || selectedDayKey);
  const catchUpBullets = getCatchUpBullets(item.standouts);
  const points = catchUpBullets.length
    ? `<ul class="catch-up-points catch-up-standouts">${catchUpBullets
        .map((bullet) => `<li class="catch-up-point">${escapeHtml(bullet)}</li>`)
        .join("")}</ul>`
    : "";
  const sourceLink = item.sourceUrl
    ? `<a class="catch-up-source" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(
        item.sourceLabel || "Read source"
      )}" title="${escapeHtml(item.sourceLabel || "Read source")}"><span aria-hidden="true">&#8599;</span></a>`
    : "";

  return `
    <article class="catch-up-item">
      <div class="catch-up-copy">
        <div class="catch-up-title-row">
          <h3>
            <time class="catch-up-inline-date" datetime="${escapeHtml(
              item.dateKey || selectedDayKey
            )}">${escapeHtml(catchUpItemLeadDateFormatter.format(itemDate))}</time>
            <span>${escapeHtml(item.headline)}</span>
          </h3>
          ${sourceLink}
        </div>
        ${item.body ? `<p class="catch-up-subtitle">${escapeHtml(item.body)}</p>` : ""}
        ${points}
      </div>
    </article>
  `;
}

function renderCatchUp() {
  if (!catchUpDate || !catchUpList) {
    return;
  }

  const dayKeys = getCatchUpWindowDayKeys();
  const startKey = dayKeys[0] || selectedDayKey;
  const startDate = getDateFromKey(startKey);
  const items = getCatchUpItems();

  catchUpDate.dateTime = startKey;
  catchUpDate.textContent = getCatchUpRangeLabel(dayKeys);
  catchUpList.innerHTML = items.length
    ? items.map(renderCatchUpItem).join("")
    : `
      <article class="catch-up-item">
        <div class="catch-up-copy">
          <div class="catch-up-title-row">
            <h3>
              <time class="catch-up-inline-date" datetime="${escapeHtml(startKey)}">${escapeHtml(
                catchUpItemLeadDateFormatter.format(startDate)
              )}</time>
              <span>No catch-up notes loaded yet</span>
            </h3>
          </div>
          <p class="catch-up-subtitle">Yesterday and today do not have finished or live match notes yet.</p>
        </div>
      </article>
    `;
}

function positionCatchUpPopover() {
  if (!catchUpButton || !catchUpPopover || !isCatchUpOpen) {
    return;
  }

  const viewportGap = 18;
  const buttonRect = catchUpButton.getBoundingClientRect();
  const popoverRect = catchUpPopover.getBoundingClientRect();
  const popoverWidth = popoverRect.width;
  const buttonCenter = buttonRect.left + buttonRect.width / 2;
  const minLeft = viewportGap;
  const maxLeft = Math.max(minLeft, window.innerWidth - popoverWidth - viewportGap);
  const centeredLeft = buttonCenter - popoverWidth / 2;
  const left = Math.min(Math.max(centeredLeft, minLeft), maxLeft);
  const top = buttonRect.bottom + 12;

  catchUpPopover.style.setProperty("--catch-up-popover-left", `${left}px`);
  catchUpPopover.style.setProperty("--catch-up-popover-top", `${top}px`);
}

function setCatchUpOpen(isOpen) {
  isCatchUpOpen = isOpen;
  catchUpPopover.classList.toggle("is-hidden", !isOpen);
  catchUpButton.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    setCalendarOpen(false);
    setStandingsYearOpen(false);
    renderCatchUp();
    positionCatchUpPopover();
  }
}

function updateUrlState() {
  if (!syncUrl) {
    return;
  }

  const params = new URLSearchParams();
  params.set("view", activeView);
  params.set("date", selectedDayKey);
  params.set("tz", selectedTimeZone);
  params.set("standingsYear", String(selectedStandingsYear));
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", nextUrl);
}

function renderSchedule() {
  const currentTime = Date.now();
  const todayMatches = getMatchesForSelectedDay();
  const liveMatchIds = getLiveMatchIds(currentTime);
  const nextMatchId = getNextMatchId(currentTime, liveMatchIds);

  updateDateControls();
  if (isCatchUpOpen) {
    renderCatchUp();
  }

  if (todayMatches.length === 0) {
    renderEmptyState();
    updateUrlState();
    return;
  }

  matchList.replaceChildren(
    ...todayMatches.map((match) =>
      renderMatchRow(match, getMatchState(match, nextMatchId, currentTime), currentTime)
    )
  );
  const activeMatch = todayMatches.find((match) => match.id === activeMatchId);

  if (activeMatch) {
    renderMatchInfo(activeMatch);
  } else {
    renderMatchInfoPrompt();
  }

  updateUrlState();
}

function setActiveView(view) {
  activeView = view === "standings" ? "standings" : "matches";
  viewTabs.forEach((tab) => {
    const isActive = tab.dataset.view === activeView;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });
  Object.entries(viewPanels).forEach(([panelView, panel]) => {
    panel.classList.toggle("is-hidden", panelView !== activeView);
    panel.hidden = panelView !== activeView;
  });
  updateUrlState();
}

function readUrlState(options = {}) {
  const params = new URLSearchParams(window.location.search);
  const requestedTimeZone = params.get("tz");
  const requestedDate = params.get("date");
  const requestedView = params.get("view");
  const requestedStandingsYear = params.get("standingsYear") || params.get("year");
  const shouldUseRequestedDate = !options.forceToday && isDayKey(requestedDate);

  if (requestedTimeZone && timeZones.includes(requestedTimeZone)) {
    selectedTimeZone = requestedTimeZone;
  }

  if (shouldUseRequestedDate) {
    selectedDayKey = requestedDate;
  } else {
    selectedDayKey = getDayKey(new Date(), selectedTimeZone);
  }

  activeView = requestedView === "standings" ? "standings" : "matches";
  selectedStandingsYear = getValidStandingsYear(requestedStandingsYear);
}

function renderSourceNote() {
  const compactSourceLabels = {
    "FIFA World Cup 2026 schedule": "FIFA schedule",
    "FIFA World Cup 2026 debutants": "debutants",
    "FIFA/Coca-Cola Men's World Ranking": "ranking",
    "FIFA World Cup 2026 standings": "standings"
  };
  const coreSourceLabels = new Set(Object.keys(compactSourceLabels));
  const coreOfficialSources = tournament.sources.filter(
    (source) => source.type === "official" && coreSourceLabels.has(source.label)
  );
  const officialSourceLinks = coreOfficialSources.map((source) => {
    const label = compactSourceLabels[source.label] ?? source.label;
    return source.url
      ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
      : escapeHtml(label);
  });

  sourceNote.innerHTML = `Sources: ${officialSourceLinks.join(", ")}. Predictions are unofficial.`;
}

function renderLoadError(error) {
  console.error("Unable to load World Cup data", error);
  matchList.innerHTML = `
    <article class="empty-state">
      <h2>Data unavailable</h2>
      <p>The match data could not be loaded. Refresh the page to try again.</p>
    </article>
  `;
  matchInfo.innerHTML = `<p class="info-empty">The match data could not be loaded.</p>`;
}

function renderAppError(error) {
  console.error("Unable to render World Cup data", error);
  matchList.innerHTML = `
    <article class="empty-state">
      <h2>Unable to display matches</h2>
      <p>The page loaded, but something went wrong while displaying it. Refresh the page to try again.</p>
    </article>
  `;
  matchInfo.innerHTML = `<p class="info-empty">The match view could not be displayed.</p>`;
}

function hasLiveDataSnapshot(liveData) {
  return Boolean(
    Array.isArray(liveData?.fixturesData?.fixtures) &&
      liveData?.standingsData?.groups &&
      Array.isArray(liveData?.tournamentData?.groups)
  );
}

function applyDataSnapshot({
  fixturesData,
  historyData,
  playerProfilesData,
  standingsData,
  teamsData,
  tournamentData
}) {
  teamsById = new Map(teamsData.teams.map((team) => [team.id, team]));
  teamsByName = buildTeamNameLookup(teamsData.teams);
  playerProfilesByName = new Map(
    Object.entries(playerProfilesData.profiles || {}).map(([name, profile]) => [
      normalizeTextKey(name),
      profile
    ])
  );
  fixtures = fixturesData.fixtures;
  history = historyData;
  historicalFixtures = historyData.fixtures || [];
  historicalProjectionCache.clear();
  standingsByGroup = standingsData.groups;
  tournament = tournamentData;
  dataCoverage = fixturesData.coverage || { status: "partial" };
}

function applyLiveDataSnapshot(liveData) {
  fixtures = liveData.fixturesData.fixtures;
  standingsByGroup = liveData.standingsData.groups;
  tournament = liveData.tournamentData;
  dataCoverage = liveData.fixturesData.coverage || { status: "partial" };
}

async function loadStaticData() {
  const [
    fixturesData,
    historyData,
    playerProfilesData,
    teamsData,
    standingsData,
    tournamentData
  ] = await Promise.all([
    loadJson(DATA_URLS.fixtures),
    loadJson(DATA_URLS.history),
    loadOptionalJson(DATA_URLS.playerProfiles, { profiles: {} }),
    loadJson(DATA_URLS.teams),
    loadJson(DATA_URLS.standings),
    loadJson(DATA_URLS.tournament)
  ]);

  applyDataSnapshot({
    fixturesData,
    historyData,
    playerProfilesData,
    standingsData,
    teamsData,
    tournamentData
  });
}

async function loadLiveData() {
  const liveData = await loadOptionalJson(DATA_URLS.liveData, null, {
    timeoutMs: LIVE_DATA_TIMEOUT_MS
  });

  if (!hasLiveDataSnapshot(liveData)) {
    return false;
  }

  applyLiveDataSnapshot(liveData);
  return true;
}

function renderLoadedApp(options = {}) {
  ensureSelectableSelectedDay();
  selectedStandingsYear = getValidStandingsYear(selectedStandingsYear);
  renderTimeZoneOptions();
  renderStandingsView();

  if (options.syncActiveView) {
    setActiveView(activeView);
  }

  renderSchedule();
  renderSourceNote();
}

async function refreshData() {
  let didUpdate = false;

  try {
    didUpdate = await loadLiveData();
  } catch (error) {
    // Keep the current data visible if a background refresh fails.
    console.warn("Unable to refresh live data", error);
    return;
  }

  if (!didUpdate) {
    return;
  }

  try {
    renderLoadedApp();
  } catch (error) {
    console.error("Unable to render refreshed data", error);
  }
}

async function boot() {
  try {
    await loadStaticData();
  } catch (error) {
    renderLoadError(error);
    return;
  }

  try {
    readUrlState({ forceToday: isReloadNavigation() });
    renderLoadedApp({ syncActiveView: true });
    setInterval(renderSchedule, 60 * 1000);
    setInterval(refreshData, DATA_REFRESH_INTERVAL_MS);
    refreshData();
  } catch (error) {
    renderAppError(error);
  }
}

viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveView(tab.dataset.view);
  });
});

dayLabel.addEventListener("click", () => {
  setCalendarOpen(!isCalendarOpen);
});

standingsYearButton.addEventListener("click", () => {
  setStandingsYearOpen(!isStandingsYearOpen);
});

catchUpButton.addEventListener("click", () => {
  setCatchUpOpen(!isCatchUpOpen);
});

calendarPrevMonth.addEventListener("click", () => {
  calendarMonthKey = getAdjacentCalendarMonthKey(-1) || calendarMonthKey;
  renderCalendar();
});

calendarNextMonth.addEventListener("click", () => {
  calendarMonthKey = getAdjacentCalendarMonthKey(1) || calendarMonthKey;
  renderCalendar();
});

calendarTodayButton.addEventListener("click", () => {
  if (getMatchCountForDay(getDayKey(new Date(), selectedTimeZone)) === 0) {
    return;
  }

  selectCalendarDay(getDayKey(new Date(), selectedTimeZone));
});

calendarYesterdayButton.addEventListener("click", () => {
  const yesterdayKey = getRelativeDayKey(getDayKey(new Date(), selectedTimeZone), -1);
  if (getMatchCountForDay(yesterdayKey) === 0) {
    return;
  }

  selectCalendarDay(yesterdayKey);
});

calendarGrid.addEventListener("click", (event) => {
  const dayButton = event.target.closest(".calendar-day");
  if (!dayButton || dayButton.disabled) {
    return;
  }
  selectCalendarDay(dayButton.dataset.dayKey);
});

standingsYearGrid.addEventListener("click", (event) => {
  const yearButton = event.target.closest(".standings-year-option");
  if (!yearButton) {
    return;
  }
  selectStandingsYear(yearButton.dataset.standingsYear);
});

matchInfo.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const revealButton = event.target.closest("[data-past-reveal]");
  if (!revealButton) {
    return;
  }

  const revealBlock = revealButton.closest(".past-reveal");
  const hiddenResults = revealBlock?.querySelector(".past-hidden-results");
  if (!hiddenResults) {
    return;
  }

  hiddenResults.hidden = false;
  revealBlock.classList.add("is-open");
  revealButton.remove();
});

matchInfo.addEventListener(
  "pointerenter",
  (event) => {
    const playerHover = event.target.closest(".player-hover");
    if (playerHover) {
      positionPlayerCard(playerHover);
    }
  },
  true
);

matchInfo.addEventListener("focusin", (event) => {
  const playerHover = event.target.closest(".player-hover");
  if (playerHover) {
    positionPlayerCard(playerHover);
  }
});

document.addEventListener("pointerdown", (event) => {
  if (
    isCalendarOpen &&
    !datePopover.contains(event.target) &&
    !dayLabel.contains(event.target)
  ) {
    setCalendarOpen(false);
  }

  if (
    isCatchUpOpen &&
    !catchUpPopover.contains(event.target) &&
    !catchUpButton.contains(event.target)
  ) {
    setCatchUpOpen(false);
  }

  if (
    isStandingsYearOpen &&
    !standingsYearPopover.contains(event.target) &&
    !standingsYearButton.contains(event.target)
  ) {
    setStandingsYearOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (isCalendarOpen) {
    setCalendarOpen(false);
    dayLabel.focus();
  }

  if (isCatchUpOpen) {
    setCatchUpOpen(false);
    catchUpButton.focus();
  }

  if (isStandingsYearOpen) {
    setStandingsYearOpen(false);
    standingsYearButton.focus();
  }
});

window.addEventListener("resize", () => {
  positionCatchUpPopover();
  positionPlayerCards();
});
window.addEventListener(
  "scroll",
  () => {
    positionCatchUpPopover();
    positionPlayerCards();
  },
  true
);

timezoneSelect.addEventListener("change", () => {
  const wasViewingToday =
    selectedDayKey === getDayKey(new Date(), selectedTimeZone);
  selectedTimeZone = timezoneSelect.value;
  if (wasViewingToday) {
    selectedDayKey = getDayKey(new Date(), selectedTimeZone);
    calendarMonthKey = getMonthKeyFromDayKey(selectedDayKey);
    activeMatchId = "";
  }
  ensureSelectableSelectedDay();
  renderTimeZoneOptions();
  renderSchedule();
  renderSourceNote();
});

viewTabs.forEach((tab, index) => {
  tab.addEventListener("keydown", (event) => {
    const keyActions = {
      ArrowLeft: () => (index + viewTabs.length - 1) % viewTabs.length,
      ArrowRight: () => (index + 1) % viewTabs.length,
      Home: () => 0,
      End: () => viewTabs.length - 1
    };
    const getNextIndex = keyActions[event.key];

    if (!getNextIndex) {
      return;
    }

    event.preventDefault();
    const nextTab = viewTabs[getNextIndex()];
    nextTab.focus();
    setActiveView(nextTab.dataset.view);
  });
});

window.addEventListener("popstate", () => {
  syncUrl = false;
  readUrlState();
  ensureSelectableSelectedDay();
  renderTimeZoneOptions();
  renderStandingsView();
  setActiveView(activeView);
  renderSchedule();
  renderSourceNote();
  syncUrl = true;
});

boot();
