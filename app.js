const DATA_URLS = {
  fixtures: "data/fixtures.json",
  standings: "data/standings.json",
  teams: "data/teams.json",
  tournament: "data/tournament.json"
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
const calendarTodayButton = document.querySelector("#calendar-today");
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
let calendarMonthKey = getMonthKeyFromDayKey(selectedDayKey);
let isCalendarOpen = false;
let fixtures = [];
let teamsById = new Map();
let tournament = { groups: [], stages: [], sources: [] };
let standingsByGroup = {};
let dataCoverage = { status: "partial" };
let syncUrl = true;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC"
});

const navDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
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

function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.max(0, Math.min(100, number));
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load ${url}`);
  }
  return response.json();
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

function getMonthKeyFromDayKey(dayKey) {
  return dayKey.slice(0, 7);
}

function getDateFromMonthKey(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1, 12));
}

function addMonthsToKey(monthKey, delta) {
  const date = getDateFromMonthKey(monthKey);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return getDayKeyFromDate(date).slice(0, 7);
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

function getTeam(teamId) {
  return teamsById.get(teamId) || {
    id: teamId,
    name: "TBD",
    officialName: "TBD",
    flag: "",
    fifaRank: null
  };
}

function getParticipant(teamId, slot = "TBD") {
  if (teamId) {
    return getTeam(teamId);
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

function getAvailableDayKeys() {
  return [
    ...new Set(
      fixtures.map((fixture) =>
        getDayKey(new Date(fixture.kickoffUtc), selectedTimeZone)
      )
    )
  ].sort();
}

function getAdjacentMatchDay(direction) {
  const availableDayKeys = getAvailableDayKeys();
  if (direction < 0) {
    return [...availableDayKeys].reverse().find((dayKey) => dayKey < selectedDayKey);
  }
  return availableDayKeys.find((dayKey) => dayKey > selectedDayKey);
}

function getMatchCountForDay(dayKey) {
  return fixtures.filter(
    (fixture) => getDayKey(new Date(fixture.kickoffUtc), selectedTimeZone) === dayKey
  ).length;
}

function getSelectedDateLabel() {
  const todayKey = getDayKey(new Date(), selectedTimeZone);

  if (selectedDayKey === todayKey) {
    return "Today";
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
  const monthDate = getDateFromMonthKey(calendarMonthKey);
  calendarMonthLabel.textContent = calendarMonthFormatter.format(monthDate);
  calendarGrid.replaceChildren(
    ...getCalendarDayKeys(calendarMonthKey).map((dayKey) => {
      const dayDate = getDateFromKey(dayKey);
      const matchCount = getMatchCountForDay(dayKey);
      const isCurrentMonth = getMonthKeyFromDayKey(dayKey) === calendarMonthKey;
      const isSelected = dayKey === selectedDayKey;
      const isToday = dayKey === todayKey;
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
      }

      button.type = "button";
      button.className = [
        "calendar-day",
        isCurrentMonth ? "" : "is-outside-month",
        isSelected ? "is-selected" : "",
        isToday ? "is-today" : ""
      ]
        .filter(Boolean)
        .join(" ");
      button.dataset.dayKey = dayKey;
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

  return `<span class="rank-pill" aria-label="${escapeHtml(team.name)} FIFA world ranking ${escapeHtml(team.fifaRank)}">${escapeHtml(team.fifaRank)}</span>`;
}

function getStandingName(team) {
  return team.standingName || team.name;
}

function renderTeamInline(team, className = "team", options = {}) {
  const { showRank = true } = options;

  return `
    <span class="${className}">
      ${renderFlag(team)}
      <span class="team-name">${escapeHtml(team.name)}</span>
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

function getTeamClass(baseClass, winnerSide, side) {
  return [baseClass, winnerSide === side ? "is-winner" : ""].filter(Boolean).join(" ");
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
      ${renderTeamInline(leftTeam, getTeamClass("past-team", winnerSide, "home"), { showRank: false })}
      <strong class="past-score">
        ${escapeHtml(scoreText)}
        ${result.scoreNote ? `<span>${escapeHtml(result.scoreNote)}</span>` : ""}
      </strong>
      ${renderTeamInline(rightTeam, getTeamClass("past-team", winnerSide, "away"), { showRank: false })}
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

  if (match.status !== "SCHEDULED") {
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
          match.status !== "FT" && new Date(match.kickoffUtc).getTime() > currentTime
      )
      .sort((a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc))[0]?.id || ""
  );
}

function renderScore(match) {
  if (!match.score) {
    return "";
  }

  const home = match.homeTeam.name;
  const away = match.awayTeam.name;
  const label = match.status === "LIVE" ? "Current score" : "Final score";
  const isDraw = Number(match.score.home) === Number(match.score.away);
  const scoreClass = `match-score${isDraw ? " is-draw" : ""}`;
  return `<span class="${scoreClass}" aria-label="${label} ${escapeHtml(home)} ${escapeHtml(match.score.home)}, ${escapeHtml(away)} ${escapeHtml(match.score.away)}">${escapeHtml(match.score.home)}-${escapeHtml(match.score.away)}</span>`;
}

function renderMatchRow(match, state) {
  const kickoffDate = new Date(match.kickoffUtc);
  const timeFormatter = getTimeFormatter();
  const row = document.createElement("button");
  const homeName = match.homeTeam.name;
  const awayName = match.awayTeam.name;
  const winnerSide = getScoreWinnerSide(match.score?.home, match.score?.away);
  const scoreLabel = match.status === "LIVE" ? "current score" : "final score";

  row.type = "button";
  row.className = `match-row is-${state}`;
  row.dataset.matchId = match.id;
  row.dataset.state = state;
  row.setAttribute(
    "aria-label",
    `${state === "live" ? "Live, " : state === "next" ? "Up next, " : ""}${homeName} vs ${awayName}${
      match.score
        ? `, ${scoreLabel} ${match.score.home}-${match.score.away}`
        : ""
    }`
  );
  row.innerHTML = `
    <time class="match-time" datetime="${escapeHtml(match.kickoffUtc)}">
      ${escapeHtml(timeFormatter.format(kickoffDate).replace(" ", ""))}
    </time>
    <span class="match-teams">
      ${renderTeamInline(match.homeTeam, getTeamClass("team", winnerSide, "home"))}
      <span class="versus">vs</span>
      ${renderTeamInline(match.awayTeam, getTeamClass("team", winnerSide, "away"))}
      ${renderScore(match)}
    </span>
    ${state === "live" ? `<span class="live-pill">Live</span>` : ""}
    ${state === "next" ? `<span class="up-next-pill">Up next</span>` : ""}
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

function renderStandingRow(row, index, groupHasStarted, options = {}) {
  const team = getTeam(row.teamId);
  const isAdvancing = groupHasStarted && index < 2;
  const { showRank = true } = options;

  return `
    <tr class="${isAdvancing ? "is-advancing" : ""}">
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
  const groupHasStarted = rows.some((row) => row.played > 0);

  return `
    <table class="standings-table">
      <thead>
        <tr>
          <th>Team</th>
          <th>Pts</th>
          <th>W-D-L</th>
          <th>GD</th>
        </tr>
      </thead>
      <tbody>${rows
        .map((row, index) => renderStandingRow(row, index, groupHasStarted, options))
        .join("")}</tbody>
    </table>
  `;
}

function renderStandingsView() {
  standingsGrid.innerHTML = tournament.groups
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

function getProjectionMethodNote(projection) {
  if (projection?.method !== "fifa-ranking-baseline") {
    return "";
  }

  return `<p class="data-note">Generated from FIFA ranking strength with a host-country adjustment. Not betting odds.</p>`;
}

function renderProjection(match) {
  if (!match.projection) {
    return `<p class="past-empty">No verified projection is loaded for this fixture yet.</p>`;
  }

  return `
    ${renderPredictionBar(match.homeTeam.name, match.projection.home)}
    ${renderPredictionBar("Draw", match.projection.draw)}
    ${renderPredictionBar(match.awayTeam.name, match.projection.away)}
    ${getProjectionMethodNote(match.projection)}
  `;
}

function getKeyInformationText(info, players = []) {
  const names = players
    .map((player) => (typeof player === "string" ? player : player?.name))
    .filter(Boolean);
  const notes = players
    .map((player) => (typeof player === "string" ? "" : player?.note))
    .filter(Boolean)
    .slice(0, 2);

  if (!names.length) {
    if (Array.isArray(info)) {
      return info.filter(Boolean).join(" ");
    }

    if (typeof info === "string" && info.trim()) {
      return info.trim();
    }

    return "Key information is not loaded yet.";
  }

  return `${names.join(", ")} are the main names to track. ${notes.join(" ")}`;
}

function getKeyInformationLabel(team) {
  const label = team?.name || "TBD";
  return team?.tagline ? `${label}: ${team.tagline}` : label;
}

function renderKeyInformationTeam(team, info, players = []) {
  return `
    <article class="key-info-team">
      <h4>${escapeHtml(getKeyInformationLabel(team))}</h4>
      <p>${escapeHtml(getKeyInformationText(info, players))}</p>
    </article>
  `;
}

function renderKeyInformation(match) {
  const keyInformation = match.keyInformation || {};
  const keyPlayers = match.keyPlayers || {};

  return `
    <div class="key-info-grid">
      ${renderKeyInformationTeam(match.homeTeam, keyInformation.home, keyPlayers.home)}
      ${renderKeyInformationTeam(match.awayTeam, keyInformation.away, keyPlayers.away)}
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

function renderPastRecord(match, results) {
  const record = getPastRecord(match, results);
  const items = [
    { count: record.homeWins, label: `${match.homeTeam.name} wins` },
    { count: record.draws, label: "Draws" },
    { count: record.awayWins, label: `${match.awayTeam.name} wins` }
  ];

  return `
    <div class="past-record" aria-label="Head-to-head record across ${record.total} matches">
      ${items
        .map(
          (item) => `
            <article>
              <strong>${escapeHtml(item.count)}</strong>
              <span>${escapeHtml(item.label)}</span>
              <em>${escapeHtml(formatPastRecordPercent(item.count, record.total))}</em>
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

  const visibleResults = h2h.results.slice(0, 4);
  const hiddenResults = h2h.results.slice(4);
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
        <p class="data-note">Shown in official table order. Points, record and goal difference are included for context.</p>
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

    <section class="info-block">
      <h3>Prediction</h3>
      ${renderProjection(match)}
    </section>

    <section class="info-block">
      <h3>Key information</h3>
      ${renderKeyInformation(match)}
    </section>

    <section class="info-block">
      <h3>Past matches</h3>
      ${renderPastResults(match)}
    </section>
  `;

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
  return fixtures
    .filter(
      (fixture) =>
        getDayKey(new Date(fixture.kickoffUtc), selectedTimeZone) === selectedDayKey
    )
    .sort((a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc))
    .map(hydrateFixture);
}

function updateUrlState() {
  if (!syncUrl) {
    return;
  }

  const params = new URLSearchParams();
  params.set("view", activeView);
  params.set("date", selectedDayKey);
  params.set("tz", selectedTimeZone);
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", nextUrl);
}

function renderSchedule() {
  const currentTime = Date.now();
  const todayMatches = getMatchesForSelectedDay();
  const liveMatchIds = getLiveMatchIds(currentTime);
  const nextMatchId = getNextMatchId(currentTime, liveMatchIds);

  updateDateControls();

  if (todayMatches.length === 0) {
    renderEmptyState();
    updateUrlState();
    return;
  }

  matchList.replaceChildren(
    ...todayMatches.map((match) =>
      renderMatchRow(match, getMatchState(match, nextMatchId, currentTime))
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
}

function renderSourceNote() {
  const officialSources = tournament.sources
    .filter((source) => source.type === "official")
    .map((source) =>
      source.url
        ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a>`
        : escapeHtml(source.label)
    );
  const latestCheck = tournament.sources
    .map((source) => new Date(source.checkedAt))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b - a)[0];
  const checkedText = latestCheck
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Los_Angeles"
      }).format(latestCheck)
    : "unknown";

  sourceNote.innerHTML = `
    Information sources: ${officialSources.join(", ")}.
    Standings include cross-checks where available. Projections are editorial or ranking-based previews.
    Player watchlists are editorial previews. H2H records are verified for known group-stage matchups; knockout H2H loads once teams are known.
    Last checked ${escapeHtml(checkedText)}.
  `;
}

function renderLoadError(error) {
  matchList.innerHTML = `
    <article class="empty-state">
      <h2>Data unavailable</h2>
      <p>${escapeHtml(error.message)}</p>
    </article>
  `;
  matchInfo.innerHTML = `<p class="info-empty">The match data could not be loaded.</p>`;
}

async function loadData() {
  const [fixturesData, teamsData, standingsData, tournamentData] = await Promise.all([
    loadJson(DATA_URLS.fixtures),
    loadJson(DATA_URLS.teams),
    loadJson(DATA_URLS.standings),
    loadJson(DATA_URLS.tournament)
  ]);

  teamsById = new Map(teamsData.teams.map((team) => [team.id, team]));
  fixtures = fixturesData.fixtures;
  standingsByGroup = standingsData.groups;
  tournament = tournamentData;
  dataCoverage = fixturesData.coverage || { status: "partial" };
}

async function boot() {
  try {
    await loadData();
    readUrlState({ forceToday: isReloadNavigation() });
    renderTimeZoneOptions();
    renderStandingsView();
    setActiveView(activeView);
    renderSchedule();
    renderSourceNote();
    setInterval(renderSchedule, 60 * 1000);
  } catch (error) {
    renderLoadError(error);
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

calendarPrevMonth.addEventListener("click", () => {
  calendarMonthKey = addMonthsToKey(calendarMonthKey, -1);
  renderCalendar();
});

calendarNextMonth.addEventListener("click", () => {
  calendarMonthKey = addMonthsToKey(calendarMonthKey, 1);
  renderCalendar();
});

calendarTodayButton.addEventListener("click", () => {
  selectCalendarDay(getDayKey(new Date(), selectedTimeZone));
});

calendarGrid.addEventListener("click", (event) => {
  const dayButton = event.target.closest(".calendar-day");
  if (!dayButton) {
    return;
  }
  selectCalendarDay(dayButton.dataset.dayKey);
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

document.addEventListener("pointerdown", (event) => {
  if (
    !isCalendarOpen ||
    datePopover.contains(event.target) ||
    dayLabel.contains(event.target)
  ) {
    return;
  }

  setCalendarOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !isCalendarOpen) {
    return;
  }

  setCalendarOpen(false);
  dayLabel.focus();
});

timezoneSelect.addEventListener("change", () => {
  const wasViewingToday =
    selectedDayKey === getDayKey(new Date(), selectedTimeZone);
  selectedTimeZone = timezoneSelect.value;
  if (wasViewingToday) {
    selectedDayKey = getDayKey(new Date(), selectedTimeZone);
    calendarMonthKey = getMonthKeyFromDayKey(selectedDayKey);
    activeMatchId = "";
  }
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
  renderTimeZoneOptions();
  setActiveView(activeView);
  renderSchedule();
  renderSourceNote();
  syncUrl = true;
});

boot();
