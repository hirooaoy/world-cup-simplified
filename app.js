const DATA_VERSION = "2026-06-21-tournament-bracket";
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
const teamSearchForm = document.querySelector("#team-search-form");
const teamSearchToggle = document.querySelector("#team-search-toggle");
const teamSearchInput = document.querySelector("#team-search-input");
const teamSearchClear = document.querySelector("#team-search-clear");
const catchUpButton = document.querySelector("#catch-up-button");
const catchUpPopover = document.querySelector("#catch-up-popover");
const catchUpList = document.querySelector("#catch-up-list");
const standingsYearButton = document.querySelector("#standings-year-button");
const standingsYearPopover = document.querySelector("#standings-year-popover");
const standingsYearGrid = document.querySelector("#standings-year-grid");
const standingsModeTabs = document.querySelectorAll(".standings-mode-tab");
const standingsModeTabsShell = document.querySelector("#standings-mode-tabs");
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
const FIFA_WORLD_CUP_SCORES_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures";
const CURRENT_STANDINGS_YEAR = 2026;
const DEFAULT_KNOCKOUT_FIELD_SIZE = 32;
const DEFAULT_AUTOMATIC_ADVANCERS_PER_GROUP = 2;
const DEFAULT_THIRD_PLACE_ADVANCERS = 8;
const THIRD_PLACE_STANDING_INDEX = 2;
const CURRENT_STANDINGS_SUMMARY =
  "Top two in each group advance. The best eight third-place teams also reach the Round of 32.";
const THIRD_PLACE_STANDINGS_SUMMARY =
  "Current third-place teams across every group. Top eight advance; unresolved ties are flagged when fair-play data is not loaded.";
const TOURNAMENT_STANDINGS_SUMMARY =
  "Official Round of 32 paths with current and projected teams. Projections update from standings and remaining match probabilities.";
const HISTORICAL_STANDINGS_SUMMARY =
  "Final group tables computed from archived match results.";
const TOURNAMENT_PROJECTION_ITERATIONS = 1800;
const TOURNAMENT_BRACKET_HALVES = [
  {
    semifinalMatchNumber: 101,
    quarterFinals: [
      { matchNumber: 97, roundOf16MatchNumbers: [89, 90] },
      { matchNumber: 98, roundOf16MatchNumbers: [93, 94] }
    ]
  },
  {
    semifinalMatchNumber: 102,
    quarterFinals: [
      { matchNumber: 99, roundOf16MatchNumbers: [91, 92] },
      { matchNumber: 100, roundOf16MatchNumbers: [95, 96] }
    ]
  }
];
const THIRD_PLACE_COMBINATION_GROUP_ORDER = ["A", "B", "D", "E", "G", "I", "K", "L"];
const THIRD_PLACE_COMBINATION_SOURCE =
  "EJIFHGLK;HGIDJFLK;EJIDHGLK;EJIDHFLK;EGIDJFLK;EGJDHFLK;EGIDHFLK;EGJDHFLI;EGJDHFIK;HGICJFLK;EJICHG" +
  "LK;EJICHFLK;EGICJFLK;EGJCHFLK;EGICHFLK;EGJCHFLI;EGJCHFIK;HGICJDLK;CJIDHFLK;CGIDJFLK;CGJDHFLK;CGI" +
  "DHFLK;CGJDHFLI;CGJDHFIK;EJICHDLK;EGICJDLK;EGJCHDLK;EGICHDLK;EGJCHDLI;EGJCHDIK;CJEDIFLK;CJEDHFLK;" +
  "CEIDHFLK;CJEDHFLI;CJEDHFIK;CGEDJFLK;CGEDIFLK;CGEDJFLI;CGEDJFIK;CGEDHFLK;CGJDHFLE;CGJDHFEK;CGEDHF" +
  "LI;CGEDHFIK;CGJDHFEI;HJBFIGLK;EJIBHGLK;EJBFIHLK;EJBFIGLK;EJBFHGLK;EGBFIHLK;EJBFHGLI;EJBFHGIK;HJB" +
  "DIGLK;HJBDIFLK;IGBDJFLK;HGBDJFLK;HGBDIFLK;HGBDJFLI;HGBDJFIK;EJBDIHLK;EJBDIGLK;EJBDHGLK;EGBDIHLK;" +
  "EJBDHGLI;EJBDHGIK;EJBDIFLK;EJBDHFLK;EIBDHFLK;EJBDHFLI;EJBDHFIK;EGBDJFLK;EGBDIFLK;EGBDJFLI;EGBDJF" +
  "IK;EGBDHFLK;HGBDJFLE;HGBDJFEK;EGBDHFLI;EGBDHFIK;HGBDJFEI;HJBCIGLK;HJBCIFLK;IGBCJFLK;HGBCJFLK;HGB" +
  "CIFLK;HGBCJFLI;HGBCJFIK;EJBCIHLK;EJBCIGLK;EJBCHGLK;EGBCIHLK;EJBCHGLI;EJBCHGIK;EJBCIFLK;EJBCHFLK;" +
  "EIBCHFLK;EJBCHFLI;EJBCHFIK;EGBCJFLK;EGBCIFLK;EGBCJFLI;EGBCJFIK;EGBCHFLK;HGBCJFLE;HGBCJFEK;EGBCHF" +
  "LI;EGBCHFIK;HGBCJFEI;HJBCIDLK;IGBCJDLK;HGBCJDLK;HGBCIDLK;HGBCJDLI;HGBCJDIK;CJBDIFLK;CJBDHFLK;CIB" +
  "DHFLK;CJBDHFLI;CJBDHFIK;CGBDJFLK;CGBDIFLK;CGBDJFLI;CGBDJFIK;CGBDHFLK;CGBDHFLJ;HGBCJFDK;CGBDHFLI;" +
  "CGBDHFIK;HGBCJFDI;EJBCIDLK;EJBCHDLK;EIBCHDLK;EJBCHDLI;EJBCHDIK;EGBCJDLK;EGBCIDLK;EGBCJDLI;EGBCJD" +
  "IK;EGBCHDLK;HGBCJDLE;HGBCJDEK;EGBCHDLI;EGBCHDIK;HGBCJDEI;CJBDEFLK;CEBDIFLK;CJBDEFLI;CJBDEFIK;CEB" +
  "DHFLK;CJBDHFLE;CJBDHFEK;CEBDHFLI;CEBDHFIK;CJBDHFEI;CGBDEFLK;CGBDJFLE;CGBDJFEK;CGBDEFLI;CGBDEFIK;" +
  "CGBDJFEI;CGBDHFLE;CGBDHFEK;HGBCJFDE;CGBDHFEI;HJIFAGLK;EJIAHGLK;EJIFAHLK;EJIFAGLK;EGJFAHLK;EGIFAH" +
  "LK;EGJFAHLI;EGJFAHIK;HJIDAGLK;HJIDAFLK;IGJDAFLK;HGJDAFLK;HGIDAFLK;HGJDAFLI;HGJDAFIK;EJIDAHLK;EJI" +
  "DAGLK;EGJDAHLK;EGIDAHLK;EGJDAHLI;EGJDAHIK;EJIDAFLK;HJEDAFLK;HEIDAFLK;HJEDAFLI;HJEDAFIK;EGJDAFLK;" +
  "EGIDAFLK;EGJDAFLI;EGJDAFIK;HGEDAFLK;HGJDAFLE;HGJDAFEK;HGEDAFLI;HGEDAFIK;HGJDAFEI;HJICAGLK;HJICAF" +
  "LK;IGJCAFLK;HGJCAFLK;HGICAFLK;HGJCAFLI;HGJCAFIK;EJICAHLK;EJICAGLK;EGJCAHLK;EGICAHLK;EGJCAHLI;EGJ" +
  "CAHIK;EJICAFLK;HJECAFLK;HEICAFLK;HJECAFLI;HJECAFIK;EGJCAFLK;EGICAFLK;EGJCAFLI;EGJCAFIK;HGECAFLK;" +
  "HGJCAFLE;HGJCAFEK;HGECAFLI;HGECAFIK;HGJCAFEI;HJICADLK;IGJCADLK;HGJCADLK;HGICADLK;HGJCADLI;HGJCAD" +
  "IK;CJIDAFLK;HJFCADLK;HFICADLK;HJFCADLI;HJFCADIK;CGJDAFLK;CGIDAFLK;CGJDAFLI;CGJDAFIK;HGFCADLK;CGJ" +
  "DAFLH;HGJCAFDK;HGFCADLI;HGFCADIK;HGJCAFDI;EJICADLK;HJECADLK;HEICADLK;HJECADLI;HJECADIK;EGJCADLK;" +
  "EGICADLK;EGJCADLI;EGJCADIK;HGECADLK;HGJCADLE;HGJCADEK;HGECADLI;HGECADIK;HGJCADEI;CJEDAFLK;CEIDAF" +
  "LK;CJEDAFLI;CJEDAFIK;HEFCADLK;HJFCADLE;HJECAFDK;HEFCADLI;HEFCADIK;HJECAFDI;CGEDAFLK;CGJDAFLE;CGJ" +
  "DAFEK;CGEDAFLI;CGEDAFIK;CGJDAFEI;HGFCADLE;HGECAFDK;HGJCAFDE;HGECAFDI;HJBAIGLK;HJBAIFLK;IJBFAGLK;" +
  "HJBFAGLK;HGBAIFLK;HJBFAGLI;HJBFAGIK;EJBAIHLK;EJBAIGLK;EJBAHGLK;EGBAIHLK;EJBAHGLI;EJBAHGIK;EJBAIF" +
  "LK;EJBFAHLK;EIBFAHLK;EJBFAHLI;EJBFAHIK;EJBFAGLK;EGBAIFLK;EJBFAGLI;EJBFAGIK;EGBFAHLK;HJBFAGLE;HJB" +
  "FAGEK;EGBFAHLI;EGBFAHIK;HJBFAGEI;IJBDAHLK;IJBDAGLK;HJBDAGLK;IGBDAHLK;HJBDAGLI;HJBDAGIK;IJBDAFLK;" +
  "HJBDAFLK;HIBDAFLK;HJBDAFLI;HJBDAFIK;FJBDAGLK;IGBDAFLK;FJBDAGLI;FJBDAGIK;HGBDAFLK;HGBDAFLJ;HGBDAF" +
  "JK;HGBDAFLI;HGBDAFIK;HGBDAFIJ;EJBAIDLK;EJBDAHLK;EIBDAHLK;EJBDAHLI;EJBDAHIK;EJBDAGLK;EGBAIDLK;EJB" +
  "DAGLI;EJBDAGIK;EGBDAHLK;HJBDAGLE;HJBDAGEK;EGBDAHLI;EGBDAHIK;HJBDAGEI;EJBDAFLK;EIBDAFLK;EJBDAFLI;" +
  "EJBDAFIK;HEBDAFLK;HJBDAFLE;HJBDAFEK;HEBDAFLI;HEBDAFIK;HJBDAFEI;EGBDAFLK;EGBDAFLJ;EGBDAFJK;EGBDAF" +
  "LI;EGBDAFIK;EGBDAFIJ;HGBDAFLE;HGBDAFEK;HGBDAFEJ;HGBDAFEI;IJBCAHLK;IJBCAGLK;HJBCAGLK;IGBCAHLK;HJB" +
  "CAGLI;HJBCAGIK;IJBCAFLK;HJBCAFLK;HIBCAFLK;HJBCAFLI;HJBCAFIK;CJBFAGLK;IGBCAFLK;CJBFAGLI;CJBFAGIK;" +
  "HGBCAFLK;HGBCAFLJ;HGBCAFJK;HGBCAFLI;HGBCAFIK;HGBCAFIJ;EJBAICLK;EJBCAHLK;EIBCAHLK;EJBCAHLI;EJBCAH" +
  "IK;EJBCAGLK;EGBAICLK;EJBCAGLI;EJBCAGIK;EGBCAHLK;HJBCAGLE;HJBCAGEK;EGBCAHLI;EGBCAHIK;HJBCAGEI;EJB" +
  "CAFLK;EIBCAFLK;EJBCAFLI;EJBCAFIK;HEBCAFLK;HJBCAFLE;HJBCAFEK;HEBCAFLI;HEBCAFIK;HJBCAFEI;EGBCAFLK;" +
  "EGBCAFLJ;EGBCAFJK;EGBCAFLI;EGBCAFIK;EGBCAFIJ;HGBCAFLE;HGBCAFEK;HGBCAFEJ;HGBCAFEI;IJBCADLK;HJBCAD" +
  "LK;HIBCADLK;HJBCADLI;HJBCADIK;CJBDAGLK;IGBCADLK;CJBDAGLI;CJBDAGIK;HGBCADLK;HGBCADLJ;HGBCADJK;HGB" +
  "CADLI;HGBCADIK;HGBCADIJ;CJBDAFLK;CIBDAFLK;CJBDAFLI;CJBDAFIK;HFBCADLK;CJBDAFLH;HJBCAFDK;HFBCADLI;" +
  "HFBCADIK;HJBCAFDI;CGBDAFLK;CGBDAFLJ;CGBDAFJK;CGBDAFLI;CGBDAFIK;CGBDAFIJ;CGBDAFLH;HGBCAFDK;HGBCAF" +
  "DJ;HGBCAFDI;EJBCADLK;EIBCADLK;EJBCADLI;EJBCADIK;HEBCADLK;HJBCADLE;HJBCADEK;HEBCADLI;HEBCADIK;HJB" +
  "CADEI;EGBCADLK;EGBCADLJ;EGBCADJK;EGBCADLI;EGBCADIK;EGBCADIJ;HGBCADLE;HGBCADEK;HGBCADEJ;HGBCADEI;" +
  "CEBDAFLK;CJBDAFLE;CJBDAFEK;CEBDAFLI;CEBDAFIK;CJBDAFEI;HFBCADLE;HEBCAFDK;HJBCAFDE;HEBCAFDI;CGBDAF" +
  "LE;CGBDAFEK;CGBDAFEJ;CGBDAFEI;HGBCAFDE";
const THIRD_PLACE_COMBINATION_MAP = buildThirdPlaceCombinationMap();
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
const HISTORICAL_TEAM_STYLE_TAGS = {
  Angola: ["Compact defending", "Direct counters", "Set pieces"],
  Bolivia: ["Direct attacks", "Second balls", "Set pieces"],
  "Bosnia-Herzegovina": ["Target play", "Second balls", "Left-side steel"],
  Bulgaria: ["Counterattacks", "Creative midfield", "Set pieces"],
  Cameroon: ["Power running", "Wide speed", "Box presence"],
  Chile: ["High pressing", "Quick combinations", "Wide rotations"],
  China: ["Organized block", "Aerial service", "Set pieces"],
  "Costa Rica": ["Deep block", "Goalkeeper resistance", "Fast breaks"],
  Cuba: ["Direct attacks", "Compact shape", "Set pieces"],
  "Czech Republic": ["Early crosses", "Set pieces", "Box presence"],
  Czechoslovakia: ["Technical midfield", "Patient passing", "Set pieces"],
  Denmark: ["Structured build-up", "Wing service", "Compact defending"],
  "Dutch East Indies": ["Compact defending", "Direct clearances", "Aerial duels"],
  "East Germany": ["Disciplined block", "Direct running", "Set pieces"],
  "El Salvador": ["Low block", "Quick outlets", "Set pieces"],
  Greece: ["Deep block", "Aerial defending", "Set pieces"],
  Honduras: ["Physical duels", "Direct counters", "Compact block"],
  Hungary: ["Creative passing", "Forward rotations", "Shooting range"],
  Iceland: ["Compact block", "Long throws", "Aerial threat"],
  Iran: ["Second balls", "Set pieces", "Patient block"],
  Ireland: ["Direct service", "Aerial pressure", "Compact midfield"],
  Israel: ["Technical passing", "Wide outlets", "Compact shape"],
  Italy: ["Defensive control", "Midfield patience", "Box finishing"],
  Jamaica: ["Wide speed", "Direct breaks", "Physical duels"],
  Kuwait: ["Patient possession", "Compact midfield", "Quick outlets"],
  Nigeria: ["Power transitions", "Wide speed", "Box presence"],
  "North Korea": ["Disciplined running", "Compact block", "Direct counters"],
  "Northern Ireland": ["Compact defending", "Aerial service", "Set pieces"],
  Peru: ["Technical passing", "Wide combinations", "Midfield rhythm"],
  Poland: ["Box finishing", "Direct service", "Set pieces"],
  Romania: ["Creative midfield", "Quick counters", "Set pieces"],
  Russia: ["Physical midfield", "Direct service", "Set pieces"],
  Serbia: ["Aerial power", "Target play", "Set pieces"],
  "Serbia and Montenegro": ["Aerial power", "Target play", "Set pieces"],
  Slovakia: ["Compact midfield", "Direct counters", "Set pieces"],
  Slovenia: ["Organized block", "Goalkeeping security", "Quick counters"],
  "Soviet Union": ["Structured pressing", "Technical midfield", "Wide attacks"],
  Togo: ["Direct runners", "Compact block", "Set pieces"],
  "Trinidad and Tobago": ["Deep block", "Physical duels", "Quick outlets"],
  Turkey: ["Central craft", "Set pieces", "Direct runners"],
  Ukraine: ["Wide transitions", "Set pieces", "Compact defending"],
  "United Arab Emirates": ["Patient possession", "Wide outlets", "Compact block"],
  Wales: ["Left-side delivery", "Direct running", "Set pieces"],
  "West Germany": ["Structured control", "Box presence", "Set pieces"],
  Yugoslavia: ["Technical midfield", "Wide combinations", "Creative passing"],
  Zaire: ["Physical defending", "Direct counters", "Aerial duels"]
};
const TEAM_SEARCH_ALIASES = {
  "Bosnia and Herzegovina": ["Bosnia"],
  "Cabo Verde": ["Cape Verde"],
  Czechia: ["Czech Republic"],
  "Côte d'Ivoire": ["Cote d'Ivoire", "Ivory Coast"],
  "DR Congo": ["Congo DR", "Democratic Republic of Congo", "Democratic Republic of the Congo"],
  "IR Iran": ["Iran"],
  "Korea Republic": ["South Korea", "Korea"],
  Netherlands: ["Holland"],
  "Saudi Arabia": ["Saudi"],
  "South Korea": ["Korea Republic", "Korea"],
  Türkiye: ["Turkey"],
  "United Arab Emirates": ["UAE"],
  "United States": ["USA", "US"]
};
const teamSearchAliasesByName = new Map(
  Object.entries(TEAM_SEARCH_ALIASES).map(([name, aliases]) => [
    normalizeTextKey(name),
    aliases
  ])
);

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
let activePlayerHover = null;
let isTeamSearchOpen = false;
let matchSearchQuery = "";
let showHistoricalSearchMatches = false;
let selectedStandingsYear = CURRENT_STANDINGS_YEAR;
let selectedStandingsMode = "groups";
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
let siteUpdatedAt = "";
let fixturesUpdatedAt = "";
let liveDataCheckedAt = "";
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
const historicalTeamStyleTagsByName = new Map(
  Object.entries(HISTORICAL_TEAM_STYLE_TAGS).map(([name, tags]) => [
    normalizeTextKey(name),
    tags
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

function getValidTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getLatestUpdatedAt(items) {
  const latestTimestamp = items.reduce((latest, item) => {
    const timestamp = getValidTimestamp(item?.updatedAt);
    return timestamp === null || timestamp <= latest ? latest : timestamp;
  }, 0);

  return latestTimestamp ? new Date(latestTimestamp).toISOString() : "";
}

function formatSiteUpdatedAt(value) {
  const timestamp = getValidTimestamp(value);

  if (timestamp === null) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: selectedTimeZone,
    timeZoneName: "short",
    year: "numeric"
  }).format(new Date(timestamp));
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

function getHistoricalTeamStyleTags(teamName, currentTeam = null) {
  const currentTags = getTeamStyleTags(currentTeam);
  if (currentTags.length) {
    return currentTags;
  }

  const fallbackTags = historicalTeamStyleTagsByName.get(normalizeTextKey(teamName));
  return Array.isArray(fallbackTags) ? fallbackTags : [];
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
      standingName: name,
      styleTags: getHistoricalTeamStyleTags(name, currentTeam)
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
    fifaRank: null,
    styleTags: getHistoricalTeamStyleTags(name)
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

function getFixtureTimestamp(fixture) {
  const value = fixture.kickoffUtc || fixture.date;
  const timestamp = value ? new Date(value).getTime() : NaN;

  return Number.isFinite(timestamp) ? timestamp : null;
}

function compareFixturesAscending(a, b) {
  return getFixtureSortValue(a).localeCompare(getFixtureSortValue(b));
}

function compareFixturesDescending(a, b) {
  return getFixtureSortValue(b).localeCompare(getFixtureSortValue(a));
}

function getTeamSearchAliases(team) {
  const keys = [team?.name, team?.officialName, team?.standingName]
    .map(normalizeTextKey)
    .filter(Boolean);
  const aliases = keys.flatMap((key) => teamSearchAliasesByName.get(key) || []);

  return [...new Set(aliases)];
}

function getTeamSearchFields(team) {
  return [
    team?.id,
    team?.name,
    team?.officialName,
    team?.standingName,
    ...getTeamSearchAliases(team)
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function doesTeamMatchSearch(team, queryKey) {
  if (!queryKey || !team || team.isSlot) {
    return false;
  }

  return getTeamSearchFields(team).some((field) =>
    normalizeTextKey(field).includes(queryKey)
  );
}

function doesFixtureMatchSearch(match, queryKey) {
  return (
    doesTeamMatchSearch(match.homeTeam, queryKey) ||
    doesTeamMatchSearch(match.awayTeam, queryKey)
  );
}

function getSearchMatchSide(match, queryKey) {
  const homeMatches = doesTeamMatchSearch(match.homeTeam, queryKey);
  const awayMatches = doesTeamMatchSearch(match.awayTeam, queryKey);

  if (homeMatches === awayMatches) {
    return "";
  }

  return homeMatches ? "home" : "away";
}

function getSearchScoreOutcome(score, searchSide) {
  if (!searchSide || !score) {
    return "";
  }

  const winnerSide = getScoreWinnerSide(score.home, score.away);

  if (!winnerSide) {
    return "tie";
  }

  return winnerSide === searchSide ? "win" : "loss";
}

function getSearchScoreOutcomeClass(outcome) {
  return outcome ? `is-search-${outcome}` : "";
}

function getSearchScoreOutcomeLabel(match, outcome, searchSide, isLiveScore) {
  if (!outcome || !searchSide) {
    return "";
  }

  const team = searchSide === "home" ? match.homeTeam : match.awayTeam;
  const teamName = team?.name;
  const verb = {
    win: isLiveScore ? "lead" : "won",
    loss: isLiveScore ? "trail" : "lost",
    tie: isLiveScore ? "are level" : "tied"
  }[outcome];

  return teamName && verb ? `; ${teamName} ${verb}` : "";
}

function updateTeamSearchControls() {
  if (!teamSearchForm || !teamSearchInput || !teamSearchClear) {
    return;
  }

  if (document.activeElement !== teamSearchInput && teamSearchInput.value !== matchSearchQuery) {
    teamSearchInput.value = matchSearchQuery;
  }

  const hasSearch = Boolean(matchSearchQuery);
  const isExpanded = isTeamSearchOpen || hasSearch;
  teamSearchForm.classList.toggle("is-expanded", isExpanded);
  teamSearchClear.hidden = !hasSearch;
  teamSearchClear.classList.toggle("is-hidden", !hasSearch);
  teamSearchInput.tabIndex = isExpanded ? 0 : -1;
  teamSearchToggle?.setAttribute("aria-expanded", String(isExpanded));
}

function setTeamSearchOpen(isOpen, options = {}) {
  isTeamSearchOpen = isOpen || Boolean(matchSearchQuery);
  updateTeamSearchControls();

  if (isOpen) {
    setCalendarOpen(false);
  }

  if (isOpen && options.focus) {
    window.requestAnimationFrame(() => {
      teamSearchInput.focus();
    });
  }
}

function setMatchSearchQuery(value) {
  const nextQuery = String(value || "").trim();

  if (matchSearchQuery === nextQuery) {
    setTeamSearchOpen(Boolean(nextQuery) || isTeamSearchOpen);
    updateTeamSearchControls();
    return;
  }

  matchSearchQuery = nextQuery;
  showHistoricalSearchMatches = false;
  activeMatchId = "";

  if (matchSearchQuery) {
    setCalendarOpen(false);
    isTeamSearchOpen = true;
  }

  renderSchedule();
}

function isSearchUpcomingMatch(match, currentTime) {
  if (match.status === "FT" || match.status === "CANCELLED" || match.status === "POSTPONED") {
    return false;
  }

  const timestamp = getFixtureTimestamp(match);

  if (timestamp === null) {
    return true;
  }

  return currentTime <= timestamp + MATCH_LIVE_WINDOW_MS;
}

function getNextMatchIdsForMatches(matches, currentTime) {
  const liveIds = new Set(
    matches
      .filter((match) => isMatchLive(match, currentTime))
      .map((match) => match.id)
  );

  if (liveIds.size > 0) {
    return new Set();
  }

  const upcomingMatches = matches
    .map((match) => ({
      kickoffTime: match.kickoffUtc ? new Date(match.kickoffUtc).getTime() : NaN,
      match
    }))
    .filter(
      ({ kickoffTime, match }) =>
        Number.isFinite(kickoffTime) &&
        kickoffTime > currentTime &&
        match.status !== "FT" &&
        match.status !== "CANCELLED" &&
        match.status !== "POSTPONED"
    )
    .sort((a, b) => a.kickoffTime - b.kickoffTime);
  const nextKickoffTime = upcomingMatches[0]?.kickoffTime;

  if (!Number.isFinite(nextKickoffTime)) {
    return new Set();
  }

  return new Set(
    upcomingMatches
      .filter(({ kickoffTime }) => kickoffTime === nextKickoffTime)
      .map(({ match }) => match.id)
  );
}

function getMatchesForSearch() {
  const queryKey = normalizeTextKey(matchSearchQuery);

  if (!queryKey) {
    return [];
  }

  return getCalendarFixtures()
    .map(hydrateFixture)
    .filter((fixture) => doesFixtureMatchSearch(fixture, queryKey))
    .sort(compareFixturesAscending);
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
  isTeamSearchOpen = false;
  matchSearchQuery = "";
  showHistoricalSearchMatches = false;
  activeMatchId = "";
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
  if (selectedStandingsYear !== CURRENT_STANDINGS_YEAR) {
    selectedStandingsMode = "groups";
  }
  setStandingsYearOpen(false);
  renderStandingsView();
  updateUrlState();
}

function selectStandingsMode(mode) {
  selectedStandingsMode = getValidStandingsMode(mode);
  renderStandingsView();
  updateUrlState();
}

function openStandingsGroup(groupId) {
  if (!groupId) {
    return;
  }

  selectedStandingsMode = "groups";
  renderStandingsView();
  updateUrlState();

  window.requestAnimationFrame(() => {
    const card = standingsGrid.querySelector(
      `.standings-card[data-group-id="${CSS.escape(groupId)}"]`
    );

    if (!card) {
      return;
    }

    card.classList.add("is-drill-target");
    card.focus({ preventScroll: true });
    card.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center"
    });

    window.setTimeout(() => {
      card.classList.remove("is-drill-target");
    }, 1400);
  });
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
  if (!team || team.isSlot || (!team.flag && !team.flagClass)) {
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

function renderMeasuredLabel(label, className) {
  const labelText = String(label || "");
  const escapedLabel = escapeHtml(labelText);

  return `<span class="${escapeHtml(className)}" aria-label="${escapedLabel}" title="${escapedLabel}">${escapedLabel}</span>`;
}

function renderTeamInline(team, className = "team", options = {}) {
  const { showRank = true } = options;
  const teamName = team.name || "";
  const escapedTeamName = escapeHtml(teamName);
  const tooltipAttributes = teamName
    ? ` aria-label="${escapedTeamName}" data-tooltip="${escapedTeamName}"`
    : "";

  return `
    <span class="${escapeHtml(className)}"${tooltipAttributes}>
      ${renderFlag(team)}
      <span class="team-name" aria-label="${escapedTeamName}">${escapedTeamName}</span>
      ${showRank ? renderRank(team) : ""}
    </span>
  `;
}

function renderKeyInformationHeading(team, label, mentionPlayers = []) {
  return `<span class="key-info-heading">${renderFlag(team)}<span class="key-info-heading-text">${renderPlayerLinkedText(label, mentionPlayers)}</span></span>`;
}

function setNameTooltipAnchor(container, name) {
  const containerRect = container.getBoundingClientRect();
  const nameRect = name.getBoundingClientRect();
  if (!containerRect.width || !nameRect.width) {
    return;
  }

  const anchorX = nameRect.left - containerRect.left + nameRect.width / 2;
  container.style.setProperty("--name-tooltip-anchor", `${Math.round(anchorX)}px`);
}

function updateTruncatedTeamTooltips(root = document) {
  root
    .querySelectorAll(".team[data-tooltip], .past-team[data-tooltip], .summary-team[data-tooltip]")
    .forEach((team) => {
      const name = team.querySelector(".team-name");
      if (!name) {
        team.classList.remove("has-team-tooltip");
        team.style.removeProperty("--name-tooltip-anchor");
        return;
      }

      const isTruncated = name.scrollWidth > name.clientWidth + 1;
      const hasEllipsisText = name.textContent.includes("...");
      const shouldShowTooltip = isTruncated || hasEllipsisText;
      team.classList.toggle("has-team-tooltip", shouldShowTooltip);

      if (shouldShowTooltip) {
        setNameTooltipAnchor(team, name);
      } else {
        team.style.removeProperty("--name-tooltip-anchor");
      }
    });
}

function updateStandingNameTooltips(root = document) {
  root.querySelectorAll(".standing-team[data-tooltip]").forEach((team) => {
    const name = team.querySelector(".standing-name");
    if (!name) {
      team.classList.remove("has-name-tooltip");
      team.removeAttribute("tabindex");
      team.style.removeProperty("--name-tooltip-anchor");
      return;
    }

    const fullName = team.getAttribute("data-tooltip") || "";
    const visibleName = name.textContent.trim();
    const isTruncated = name.scrollWidth > name.clientWidth + 1;
    const hasDisplayAlias = Boolean(fullName && visibleName && visibleName !== fullName);
    const hasEllipsisText = visibleName.includes("...");
    const shouldShowTooltip = isTruncated || hasDisplayAlias || hasEllipsisText;

    team.classList.toggle("has-name-tooltip", shouldShowTooltip);

    if (shouldShowTooltip) {
      team.tabIndex = 0;
      setNameTooltipAnchor(team, name);
    } else {
      team.removeAttribute("tabindex");
      team.style.removeProperty("--name-tooltip-anchor");
    }
  });
}

function updateMeasuredLabelTooltips(root = document) {
  root
    .querySelectorAll(".prediction-row[data-tooltip], .past-record-row[data-tooltip]")
    .forEach((row) => {
      const label = row.querySelector(".prediction-label, .past-record-label");
      if (!label) {
        row.classList.remove("has-label-tooltip");
        row.removeAttribute("tabindex");
        row.style.removeProperty("--name-tooltip-anchor");
        return;
      }

      const fullLabel = row.getAttribute("data-tooltip") || "";
      const visibleLabel = label.textContent.trim();
      const isTruncated = label.scrollWidth > label.clientWidth + 1;
      const hasDisplayAlias = Boolean(fullLabel && visibleLabel && visibleLabel !== fullLabel);
      const hasEllipsisText = visibleLabel.includes("...");
      const shouldShowTooltip = isTruncated || hasDisplayAlias || hasEllipsisText;

      row.classList.toggle("has-label-tooltip", shouldShowTooltip);

      if (shouldShowTooltip) {
        row.tabIndex = 0;
        setNameTooltipAnchor(row, label);
      } else {
        row.removeAttribute("tabindex");
        row.style.removeProperty("--name-tooltip-anchor");
      }
    });
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

function getMatchState(match, nextMatchIds, currentTime) {
  if (match.status === "FT") {
    return "complete";
  }

  if (isMatchLive(match, currentTime)) {
    return "live";
  }

  if (nextMatchIds.has(match.id)) {
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

function getNextMatchIds(currentTime, liveMatchIds) {
  if (liveMatchIds.size > 0) {
    return new Set();
  }

  const upcomingMatches = fixtures
    .map(hydrateFixture)
    .map((match) => ({
      kickoffTime: match.kickoffUtc ? new Date(match.kickoffUtc).getTime() : NaN,
      match
    }))
    .filter(
      ({ kickoffTime, match }) =>
        Number.isFinite(kickoffTime) &&
        kickoffTime > currentTime &&
        match.status !== "FT"
    )
    .sort((a, b) => a.kickoffTime - b.kickoffTime);
  const nextKickoffTime = upcomingMatches[0]?.kickoffTime;

  if (!Number.isFinite(nextKickoffTime)) {
    return new Set();
  }

  return new Set(
    upcomingMatches
      .filter(({ kickoffTime }) => kickoffTime === nextKickoffTime)
      .map(({ match }) => match.id)
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

  return null;
}

function getLiveScoreFreshnessTimestamp(match) {
  const candidates = [
    match.scoreUpdatedAt,
    match.liveUpdatedAt,
    match.updatedAt,
    liveDataCheckedAt,
    fixturesUpdatedAt
  ];

  return candidates.find((value) => getValidTimestamp(value) !== null) || "";
}

function formatRelativeScoreFreshness(value, currentTime) {
  const timestamp = getValidTimestamp(value);

  if (timestamp === null) {
    return null;
  }

  const ageMs = currentTime - timestamp;

  if (ageMs < -60 * 1000) {
    return null;
  }

  if (ageMs < 60 * 1000) {
    return { ariaText: "now", text: "now" };
  }

  const minutes = Math.max(1, Math.floor(ageMs / (60 * 1000)));

  if (minutes < 60) {
    return {
      ariaText: `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`,
      text: `${minutes} min ago`
    };
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return {
      ariaText: `${hours} ${hours === 1 ? "hour" : "hours"} ago`,
      text: `${hours} hr ago`
    };
  }

  const days = Math.floor(hours / 24);
  return {
    ariaText: `${days} ${days === 1 ? "day" : "days"} ago`,
    text: `${days}d ago`
  };
}

function getLiveScoreFreshness(match, currentTime) {
  return formatRelativeScoreFreshness(getLiveScoreFreshnessTimestamp(match), currentTime);
}

function renderScore(match, state, currentTime = Date.now(), options = {}) {
  const score = getDisplayScore(match, state);
  if (!score) {
    return "";
  }

  const { searchSide = "" } = options;
  const home = match.homeTeam.name;
  const away = match.awayTeam.name;
  const scoreText = `${score.home}-${score.away}`;
  const isLiveScore = match.status === "LIVE" || state === "live";
  const freshness = isLiveScore ? getLiveScoreFreshness(match, currentTime) : null;
  const label = isLiveScore ? "Current score" : "Final score";
  const freshnessLabel = freshness ? `; last checked ${freshness.ariaText}` : "";
  const searchOutcome = getSearchScoreOutcome(score, searchSide);
  const searchOutcomeLabel = getSearchScoreOutcomeLabel(match, searchOutcome, searchSide, isLiveScore);
  const ariaLabel = score.isFallback
    ? `Current score not loaded yet; showing ${scoreText}${searchOutcomeLabel}`
    : `${label} ${home} ${score.home}, ${away} ${score.away}${freshnessLabel}${searchOutcomeLabel}`;
  const className = [
    "match-score",
    score.isFallback ? "is-live-fallback" : "",
    isLiveScore ? "is-live-score" : "",
    freshness ? "has-freshness" : "",
    getSearchScoreOutcomeClass(searchOutcome)
  ]
    .filter(Boolean)
    .join(" ");
  const title = isLiveScore
    ? freshness
      ? `Score last checked ${freshness.ariaText}. Check FIFA for the latest score.`
      : "Check FIFA for the latest score."
    : "";
  const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";

  return `
    <span class="${className}" aria-label="${escapeHtml(ariaLabel)}"${titleAttribute}>
      <span class="match-score-value">${escapeHtml(scoreText)}</span>
      ${
        freshness
          ? `<span class="match-score-separator" aria-hidden="true">·</span><span class="match-score-freshness">${escapeHtml(freshness.text)}</span>`
          : ""
      }
    </span>
  `;
}

function renderScoreStatus(match, state, currentTime) {
  const pendingText = getScorePendingText(match, state, currentTime);
  return pendingText
    ? `<span class="score-status is-pending" aria-label="${escapeHtml(`${pendingText}; verified score is not loaded yet`)}">${escapeHtml(pendingText)}</span>`
    : "";
}

function renderLivePill() {
  return `<a class="live-pill" href="${escapeHtml(FIFA_WORLD_CUP_SCORES_URL)}" target="_blank" rel="noreferrer" title="Check latest score at FIFA" aria-label="Live: check latest score at FIFA" data-tooltip="Check latest score at FIFA">Live</a>`;
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

  return "FT";
}

function getMatchTimeAriaLabel(match) {
  if (match.status === "FT" && !match.kickoffUtc && !match.localTime) {
    return "Full time";
  }

  return getMatchTimeLabel(match);
}

function renderMatchRow(match, state, currentTime = Date.now(), options = {}) {
  const row = document.createElement("div");
  const homeName = match.homeTeam.name;
  const awayName = match.awayTeam.name;
  const winnerSide = getScoreWinnerSide(match.score?.home, match.score?.away);
  const isLiveState = match.status === "LIVE" || state === "live";
  const scoreLabel = isLiveState ? "current score" : "final score";
  const pendingScoreText = getScorePendingText(match, state, currentTime);
  const displayScore = getDisplayScore(match, state);
  const scoreFreshness = isLiveState ? getLiveScoreFreshness(match, currentTime) : null;
  const stateLabel =
    state === "live" ? "Live, " : state === "next" ? "Up next, " : "";
  const statusLabel = match.status === "CANCELLED" ? ", cancelled" : "";
  const scoreStatus = renderScoreStatus(match, state, currentTime);
  const stateBadge =
    state === "live"
      ? renderLivePill()
      : state === "next"
        ? `<span class="up-next-pill">Up next</span>`
        : "";
  const score = renderScore(match, state, currentTime, options);
  const rowMeta = `${scoreStatus}${stateBadge}${score}`;
  const rowLabel = `${stateLabel}${homeName} vs ${awayName}${statusLabel}${
    match.score
      ? `, ${scoreLabel} ${match.score.home}-${match.score.away}${
          scoreFreshness ? `, last checked ${scoreFreshness.ariaText}` : ""
        }`
      : displayScore
        ? `, score ${displayScore.home}-${displayScore.away}`
        : pendingScoreText
          ? `, ${pendingScoreText.toLowerCase()}`
          : ""
  }`;

  row.className = `match-row is-${state}`;
  row.dataset.matchId = match.id;
  row.dataset.state = state;
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", rowLabel);
  row.innerHTML = `
    <button class="match-row-trigger" type="button" aria-label="${escapeHtml(rowLabel)}" aria-pressed="false">
      <time class="match-time" datetime="${escapeHtml(getMatchDateTimeValue(match))}" aria-label="${escapeHtml(getMatchTimeAriaLabel(match))}" title="${escapeHtml(getMatchTimeAriaLabel(match))}">
        ${escapeHtml(getMatchTimeLabel(match))}
      </time>
      <span class="match-teams">
        ${renderTeamInline(match.homeTeam, getTeamClass("team", winnerSide, "home"))}
        <span class="versus">vs</span>
        ${renderTeamInline(match.awayTeam, getTeamClass("team", winnerSide, "away"))}
      </span>
    </button>
    ${rowMeta ? `<span class="match-row-meta">${rowMeta}</span>` : ""}
  `;

  row.addEventListener("pointerenter", () => renderMatchInfo(match));
  row.addEventListener("focusin", () => renderMatchInfo(match));
  row.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      return;
    }

    renderMatchInfo(match, { reveal: true });
  });

  return row;
}

function formatGoalDifference(goalDifference) {
  if (goalDifference > 0) {
    return `+${goalDifference}`;
  }

  return String(goalDifference);
}

function formatOrdinal(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "";
  }

  const absolute = Math.abs(number);
  const mod100 = absolute % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? "th"
      : absolute % 10 === 1
        ? "st"
        : absolute % 10 === 2
          ? "nd"
          : absolute % 10 === 3
            ? "rd"
            : "th";

  return `${number}${suffix}`;
}

function getTournamentFormatNumber(keys, fallback) {
  const format = tournament.format || {};

  for (const keyPath of keys) {
    const value = keyPath.split(".").reduce((item, key) => item?.[key], format);
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return fallback;
}

function getThirdPlaceAdvancerCount() {
  const groupCount = tournament.groups?.length || 0;
  const configuredAdvancers = getTournamentFormatNumber(
    ["bestThirdPlaceAdvancers", "thirdPlaceAdvancers", "groupStage.bestThirdPlaceAdvancers"],
    null
  );

  if (Number.isInteger(configuredAdvancers) && configuredAdvancers >= 0) {
    return Math.min(configuredAdvancers, groupCount);
  }

  const knockoutFieldSize = getTournamentFormatNumber(
    ["knockoutFieldSize", "roundOf32Size", "knockout.fieldSize"],
    DEFAULT_KNOCKOUT_FIELD_SIZE
  );
  const automaticAdvancersPerGroup = getTournamentFormatNumber(
    ["automaticAdvancersPerGroup", "groupStage.automaticAdvancersPerGroup"],
    DEFAULT_AUTOMATIC_ADVANCERS_PER_GROUP
  );
  const computedAdvancers = knockoutFieldSize - groupCount * automaticAdvancersPerGroup;

  if (Number.isFinite(computedAdvancers)) {
    return Math.min(groupCount, Math.max(0, computedAdvancers));
  }

  return Math.min(DEFAULT_THIRD_PLACE_ADVANCERS, groupCount);
}

function getFifaRankValue(team) {
  const rank = Number(team.fifaRank);
  return Number.isFinite(rank) ? rank : Number.POSITIVE_INFINITY;
}

function buildThirdPlaceCombinationMap() {
  const map = new Map();

  for (const row of THIRD_PLACE_COMBINATION_SOURCE.split(";")) {
    const assignment = {};
    const qualifiedGroups = [...row].sort().join("");

    THIRD_PLACE_COMBINATION_GROUP_ORDER.forEach((winnerGroupId, index) => {
      assignment[winnerGroupId] = row[index];
    });
    map.set(qualifiedGroups, assignment);
  }

  return map;
}

function getThirdPlaceCombinationKey(groupIds) {
  return [...new Set(groupIds)].sort().join("");
}

function getThirdPlaceAssignmentForGroups(groupIds) {
  return THIRD_PLACE_COMBINATION_MAP.get(getThirdPlaceCombinationKey(groupIds)) || null;
}

function getCurrentThirdPlaceAssignment() {
  const advancerCount = getThirdPlaceAdvancerCount();
  return getThirdPlaceAssignmentForGroups(
    getThirdPlaceRaceRows()
      .slice(0, advancerCount)
      .map((candidate) => candidate.groupId)
  );
}

function getRoundOf32Fixtures() {
  return fixtures
    .filter((fixture) => fixture.stage === "round-of-32")
    .sort((a, b) => Number(a.matchNumber) - Number(b.matchNumber));
}

function getKnockoutFixtures() {
  return fixtures
    .filter((fixture) => fixture.stage && fixture.stage !== "group")
    .sort((a, b) => Number(a.matchNumber) - Number(b.matchNumber));
}

function getTournamentStageLabel(stageId) {
  const labels = {
    "round-of-32": "Round of 32",
    "round-of-16": "Round of 16",
    "quarter-finals": "Quarter-finals",
    "semi-finals": "Semi-finals",
    "bronze-final": "Third-place play-off",
    final: "Final"
  };

  return labels[stageId] || tournament.stages.find((stage) => stage.id === stageId)?.label || stageId;
}

function getRoundOf32SlotDefinition(match, side) {
  const slotText = side === "home" ? match.homeSlot : match.awaySlot;
  const groupPlaceMatch = /^Group ([A-L]) (winner|runner-up)$/i.exec(slotText || "");

  if (groupPlaceMatch) {
    return {
      groupId: groupPlaceMatch[1],
      kind: "group-place",
      label: groupPlaceMatch[2].toLowerCase() === "winner" ? `1${groupPlaceMatch[1]}` : `2${groupPlaceMatch[1]}`,
      place: groupPlaceMatch[2].toLowerCase() === "winner" ? 1 : 2,
      slotText
    };
  }

  const thirdPlaceMatch = /^Group ([A-L](?:\/[A-L])+) third place$/i.exec(slotText || "");

  if (thirdPlaceMatch) {
    const fixedOpponent = side === "home" ? match.awaySlot : match.homeSlot;
    const winnerMatch = /^Group ([A-L]) winner$/i.exec(fixedOpponent || "");

    return {
      kind: "third-place",
      label: `3${thirdPlaceMatch[1]}`,
      possibleGroupIds: thirdPlaceMatch[1].split("/"),
      slotText,
      winnerGroupId: winnerMatch?.[1] || ""
    };
  }

  return {
    kind: "future",
    label: slotText || "TBD",
    slotText: slotText || "TBD"
  };
}

function getTournamentSlotKey(matchNumber, side) {
  return `${matchNumber}:${side}`;
}

function getTournamentRowPlacement(rowsByGroup, groupId, place) {
  return rowsByGroup.get(groupId)?.[place - 1] || null;
}

function getCurrentTournamentRowsByGroup() {
  return new Map(
    (tournament.groups || []).map((group) => [
      group.id,
      getStandingsRows(group.id).map((row) => ({
        ...row,
        groupId: group.id,
        team: getTeam(row.teamId)
      }))
    ])
  );
}

function getCurrentTournamentSlotTeam(slot, currentRowsByGroup, currentThirdPlaceAssignment) {
  if (slot.kind === "group-place") {
    return getTournamentRowPlacement(currentRowsByGroup, slot.groupId, slot.place)?.team || null;
  }

  if (slot.kind === "third-place" && slot.winnerGroupId) {
    const assignedGroupId = currentThirdPlaceAssignment?.[slot.winnerGroupId];
    return assignedGroupId
      ? getTournamentRowPlacement(currentRowsByGroup, assignedGroupId, THIRD_PLACE_STANDING_INDEX + 1)?.team || null
      : null;
  }

  return null;
}

function hashString(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function getTournamentProjectionSeed() {
  return hashString(
    JSON.stringify({
      fixtures: fixtures.map((fixture) => [
        fixture.id,
        fixture.status,
        fixture.score?.home ?? "",
        fixture.score?.away ?? "",
        fixture.projection?.home ?? "",
        fixture.projection?.draw ?? "",
        fixture.projection?.away ?? ""
      ]),
      standingsByGroup
    })
  );
}

function getFallbackMatchProjection(homeTeam, awayTeam) {
  const homeRank = getFifaRankValue(homeTeam);
  const awayRank = getFifaRankValue(awayTeam);
  const rankDiff = Number.isFinite(homeRank) && Number.isFinite(awayRank) ? awayRank - homeRank : 0;
  const draw = 25;
  const decisiveShare = 100 - draw;
  const homeShare = 1 / (1 + Math.exp(-rankDiff / 18));

  return normalizeProjectionParts(decisiveShare * homeShare, draw, decisiveShare * (1 - homeShare));
}

function getFixtureProjectionParts(fixture) {
  const projection = fixture.projection || {};
  const home = Number(projection.home);
  const draw = Number(projection.draw);
  const away = Number(projection.away);

  if ([home, draw, away].every(Number.isFinite) && home + draw + away > 0) {
    const total = home + draw + away;
    return {
      home: (home / total) * 100,
      draw: (draw / total) * 100,
      away: (away / total) * 100
    };
  }

  return getFallbackMatchProjection(getTeam(fixture.homeTeamId), getTeam(fixture.awayTeamId));
}

function createSimulationRowsByGroup() {
  return new Map(
    (tournament.groups || []).map((group) => [
      group.id,
      getStandingsRows(group.id).map((row) => ({
        ...row,
        groupId: group.id,
        team: getTeam(row.teamId)
      }))
    ])
  );
}

function getSimulationTeamRow(rowsByGroup, groupId, teamId) {
  return rowsByGroup.get(groupId)?.find((row) => row.teamId === teamId) || null;
}

function applySimulatedScore(row, goalsFor, goalsAgainst) {
  row.played += 1;
  row.gf += goalsFor;
  row.ga += goalsAgainst;
  row.gd = row.gf - row.ga;

  if (goalsFor > goalsAgainst) {
    row.wins += 1;
  } else if (goalsFor < goalsAgainst) {
    row.losses += 1;
  } else {
    row.draws += 1;
  }

  row.pts = row.wins * 3 + row.draws;
}

function getSimulatedScore(outcome, random) {
  if (outcome === "draw") {
    const goals = random() < 0.22 ? 0 : random() < 0.78 ? 1 : 2;
    return { away: goals, home: goals };
  }

  const loserGoals = random() < 0.62 ? 0 : random() < 0.9 ? 1 : 2;
  const margin = random() < 0.68 ? 1 : random() < 0.92 ? 2 : 3;
  const winnerGoals = loserGoals + margin;

  return outcome === "home"
    ? { away: loserGoals, home: winnerGoals }
    : { away: winnerGoals, home: loserGoals };
}

function simulateRemainingFixture(rowsByGroup, fixture, random) {
  const homeRow = getSimulationTeamRow(rowsByGroup, fixture.groupId, fixture.homeTeamId);
  const awayRow = getSimulationTeamRow(rowsByGroup, fixture.groupId, fixture.awayTeamId);

  if (!homeRow || !awayRow) {
    return;
  }

  const projection = getFixtureProjectionParts(fixture);
  const roll = random() * 100;
  const outcome = roll < projection.home ? "home" : roll < projection.home + projection.draw ? "draw" : "away";
  const score = getSimulatedScore(outcome, random);

  applySimulatedScore(homeRow, score.home, score.away);
  applySimulatedScore(awayRow, score.away, score.home);
}

function sortSimulationGroupRows(rows) {
  return [...rows].sort(
    (a, b) =>
      b.pts - a.pts ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      getFifaRankValue(a.team) - getFifaRankValue(b.team) ||
      a.seededOrder - b.seededOrder ||
      a.team.name.localeCompare(b.team.name)
  );
}

function getSortedSimulationRowsByGroup(rowsByGroup) {
  return new Map([...rowsByGroup.entries()].map(([groupId, rows]) => [groupId, sortSimulationGroupRows(rows)]));
}

function getSimulationThirdPlaceRows(sortedRowsByGroup) {
  return (tournament.groups || [])
    .map((group, groupIndex) => {
      const row = sortedRowsByGroup.get(group.id)?.[THIRD_PLACE_STANDING_INDEX];

      return row
        ? {
            ...row,
            groupId: group.id,
            groupIndex,
            groupLabel: group.label || `Group ${group.id}`,
            team: getTeam(row.teamId)
          }
        : null;
    })
    .filter(Boolean)
    .sort(compareThirdPlaceCandidates);
}

function addTournamentSlotCount(counts, matchNumber, side, teamId) {
  if (!teamId) {
    return;
  }

  const slotKey = getTournamentSlotKey(matchNumber, side);
  const slotCounts = counts.get(slotKey) || new Map();
  slotCounts.set(teamId, (slotCounts.get(teamId) || 0) + 1);
  counts.set(slotKey, slotCounts);
}

function getTournamentProjection() {
  const counts = new Map();
  const random = createSeededRandom(getTournamentProjectionSeed());
  const remainingFixtures = fixtures.filter(
    (fixture) => fixture.stage === "group" && fixture.status !== "FT"
  );
  const roundOf32Fixtures = getRoundOf32Fixtures();

  for (let iteration = 0; iteration < TOURNAMENT_PROJECTION_ITERATIONS; iteration += 1) {
    const rowsByGroup = createSimulationRowsByGroup();

    for (const fixture of remainingFixtures) {
      simulateRemainingFixture(rowsByGroup, fixture, random);
    }

    const sortedRowsByGroup = getSortedSimulationRowsByGroup(rowsByGroup);
    const thirdPlaceRows = getSimulationThirdPlaceRows(sortedRowsByGroup);
    const thirdPlaceAssignment = getThirdPlaceAssignmentForGroups(
      thirdPlaceRows
        .slice(0, getThirdPlaceAdvancerCount())
        .map((row) => row.groupId)
    );

    for (const match of roundOf32Fixtures) {
      for (const side of ["home", "away"]) {
        const slot = getRoundOf32SlotDefinition(match, side);

        if (slot.kind === "group-place") {
          addTournamentSlotCount(
            counts,
            match.matchNumber,
            side,
            getTournamentRowPlacement(sortedRowsByGroup, slot.groupId, slot.place)?.teamId
          );
        } else if (slot.kind === "third-place" && thirdPlaceAssignment?.[slot.winnerGroupId]) {
          addTournamentSlotCount(
            counts,
            match.matchNumber,
            side,
            getTournamentRowPlacement(
              sortedRowsByGroup,
              thirdPlaceAssignment[slot.winnerGroupId],
              THIRD_PLACE_STANDING_INDEX + 1
            )?.teamId
          );
        }
      }
    }
  }

  return {
    iterations: TOURNAMENT_PROJECTION_ITERATIONS,
    slotProbabilities: new Map(
      [...counts.entries()].map(([slotKey, slotCounts]) => [
        slotKey,
        [...slotCounts.entries()]
          .map(([teamId, count]) => ({
            count,
            percent: Math.round((count / TOURNAMENT_PROJECTION_ITERATIONS) * 100),
            team: getTeam(teamId),
            teamId
          }))
          .sort((a, b) => b.count - a.count || a.team.name.localeCompare(b.team.name))
      ])
    )
  };
}

function getTournamentSlotProbability(projection, matchNumber, side) {
  return projection.slotProbabilities.get(getTournamentSlotKey(matchNumber, side)) || [];
}

function getTournamentMatchDateLabel(match) {
  const dateKey = getFixtureDayKey(match);
  const dateLabel = navDateFormatter.format(getDateFromKey(dateKey));
  const timeLabel = getMatchTimeLabel(match);

  return [dateLabel, timeLabel].filter(Boolean).join(" / ");
}

function getTournamentNextMatchNumber(matchNumber) {
  const winnerSlot = `Winner match ${matchNumber}`;
  return getKnockoutFixtures().find(
    (fixture) => fixture.homeSlot === winnerSlot || fixture.awaySlot === winnerSlot
  )?.matchNumber;
}

function getTournamentFixtureByMatchNumber(matchNumber) {
  return fixtures.find((fixture) => Number(fixture.matchNumber) === Number(matchNumber)) || null;
}

function getTournamentWinnerSourceMatchNumbers(match) {
  return [match?.homeSlot, match?.awaySlot]
    .map((slot) => /^Winner match (\d+)$/i.exec(slot || "")?.[1])
    .filter(Boolean)
    .map(Number);
}

function getTournamentFutureNodeLabel(match) {
  const sourceMatchNumbers = getTournamentWinnerSourceMatchNumbers(match);

  if (sourceMatchNumbers.length === 2) {
    return sourceMatchNumbers.map((matchNumber) => `Winner M${matchNumber}`).join(" vs ");
  }

  return [match?.homeSlot, match?.awaySlot].filter(Boolean).join(" vs ");
}

function getTournamentSlotShortTruth(slot, currentThirdPlaceAssignment) {
  if (slot.kind === "group-place") {
    return slot.label;
  }

  if (slot.kind === "third-place") {
    const assignedGroupId = currentThirdPlaceAssignment?.[slot.winnerGroupId];
    return assignedGroupId ? `3${assignedGroupId} now` : slot.label;
  }

  return slot.label;
}

function renderTournamentBracketTeam(match, side, projection, currentRowsByGroup, currentThirdPlaceAssignment) {
  const slot = getRoundOf32SlotDefinition(match, side);
  const currentTeam = getCurrentTournamentSlotTeam(slot, currentRowsByGroup, currentThirdPlaceAssignment);
  const candidates = getTournamentSlotProbability(projection, match.matchNumber, side);
  const likely = candidates[0] || null;
  const likelyTeam = likely?.team || currentTeam;
  const percent = likely?.percent ?? (currentTeam ? 100 : 0);
  const isForecastDifferent = Boolean(likelyTeam && currentTeam && likelyTeam.id !== currentTeam.id);
  const tooltip = likelyTeam
    ? getTournamentSlotCondition(slot, likelyTeam, percent, candidates, projection)
    : "This slot waits for the group stage and third-place combinations to settle.";
  const forecastLabel = likelyTeam
    ? isForecastDifferent
      ? `Likely ${likelyTeam.name} ${percent}%`
      : `${percent}% likely`
    : "Likely TBD";

  return `
    <article class="bracket-team${isForecastDifferent ? " has-forecast-shift" : ""}">
      <span class="bracket-slot-code" aria-label="${escapeHtml(getTournamentSlotTruth(slot, currentTeam, currentThirdPlaceAssignment))}">
        ${escapeHtml(getTournamentSlotShortTruth(slot, currentThirdPlaceAssignment))}
      </span>
      <strong class="bracket-team-name">
        ${currentTeam ? renderFlag(currentTeam) : ""}
        <span>${escapeHtml(currentTeam ? getStandingName(currentTeam) : "TBD")}</span>
      </strong>
      <span class="bracket-forecast" tabindex="0" aria-label="${escapeHtml(tooltip)}" data-tooltip="${escapeHtml(tooltip)}">
        ${escapeHtml(forecastLabel)}
      </span>
    </article>
  `;
}

function renderTournamentRoundOf32Card(matchNumber, targetMatchNumber, projection, currentRowsByGroup, currentThirdPlaceAssignment) {
  const match = getTournamentFixtureByMatchNumber(matchNumber);

  if (!match) {
    return "";
  }

  return `
    <article class="bracket-r32-card" data-match-number="${escapeHtml(match.matchNumber)}">
      <header class="bracket-match-meta">
        <span>M${escapeHtml(match.matchNumber)}</span>
        <time datetime="${escapeHtml(match.kickoffUtc || "")}">${escapeHtml(getTournamentMatchDateLabel(match))}</time>
      </header>
      <div class="bracket-r32-teams">
        ${renderTournamentBracketTeam(match, "home", projection, currentRowsByGroup, currentThirdPlaceAssignment)}
        <span class="bracket-team-divider">vs</span>
        ${renderTournamentBracketTeam(match, "away", projection, currentRowsByGroup, currentThirdPlaceAssignment)}
      </div>
      <footer class="bracket-r32-footer">
        <span>Winner to M${escapeHtml(targetMatchNumber)}</span>
        <em>${escapeHtml(match.venue || "")}</em>
      </footer>
    </article>
  `;
}

function renderTournamentFutureNode(matchNumber, typeLabel) {
  const match = getTournamentFixtureByMatchNumber(matchNumber);

  if (!match) {
    return "";
  }

  return `
    <article class="bracket-future-node is-${escapeHtml(typeLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}" data-match-number="${escapeHtml(match.matchNumber)}">
      <span>M${escapeHtml(match.matchNumber)}</span>
      <strong>${escapeHtml(typeLabel)}</strong>
      <em>${escapeHtml(getTournamentFutureNodeLabel(match))}</em>
    </article>
  `;
}

function renderTournamentRoundOf16Slot(matchNumber, projection, currentRowsByGroup, currentThirdPlaceAssignment) {
  const match = getTournamentFixtureByMatchNumber(matchNumber);
  const sourceMatchNumbers = getTournamentWinnerSourceMatchNumbers(match);

  return `
    <section class="bracket-r16-slot" aria-label="Round of 16 match ${escapeHtml(matchNumber)}">
      ${renderTournamentFutureNode(matchNumber, "Round of 16")}
      <div class="bracket-r32-stack">
        ${sourceMatchNumbers
          .map((sourceMatchNumber) =>
            renderTournamentRoundOf32Card(
              sourceMatchNumber,
              matchNumber,
              projection,
              currentRowsByGroup,
              currentThirdPlaceAssignment
            )
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderTournamentQuarterCluster(cluster, projection, currentRowsByGroup, currentThirdPlaceAssignment) {
  return `
    <section class="bracket-quarter-cluster" aria-label="Quarter-final match ${escapeHtml(cluster.matchNumber)} path">
      <div class="bracket-r16-list">
        ${cluster.roundOf16MatchNumbers
          .map((matchNumber) =>
            renderTournamentRoundOf16Slot(
              matchNumber,
              projection,
              currentRowsByGroup,
              currentThirdPlaceAssignment
            )
          )
          .join("")}
      </div>
      ${renderTournamentFutureNode(cluster.matchNumber, "Quarter-final")}
    </section>
  `;
}

function renderTournamentBracketHalf(half, projection, currentRowsByGroup, currentThirdPlaceAssignment) {
  const semifinal = getTournamentFixtureByMatchNumber(half.semifinalMatchNumber);

  return `
    <section class="bracket-half" aria-label="Semifinal match ${escapeHtml(half.semifinalMatchNumber)} path">
      <header class="bracket-half-header">
        <span>Path to M${escapeHtml(half.semifinalMatchNumber)}</span>
        <h2>${escapeHtml(getTournamentFutureNodeLabel(semifinal))}</h2>
      </header>
      <div class="bracket-quarter-list">
        ${half.quarterFinals
          .map((cluster) =>
            renderTournamentQuarterCluster(
              cluster,
              projection,
              currentRowsByGroup,
              currentThirdPlaceAssignment
            )
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderTournamentFinalPath() {
  const final = getTournamentFixtureByMatchNumber(104);

  return `
    <section class="bracket-final-path" aria-label="Final path">
      ${renderTournamentFutureNode(101, "Semi-final")}
      ${renderTournamentFutureNode(104, getTournamentStageLabel(final?.stage || "final"))}
      ${renderTournamentFutureNode(102, "Semi-final")}
    </section>
  `;
}

function getTournamentPosterMatchEntries(half) {
  return half.quarterFinals.flatMap((quarterFinal) =>
    quarterFinal.roundOf16MatchNumbers.flatMap((roundOf16MatchNumber) =>
      getTournamentWinnerSourceMatchNumbers(getTournamentFixtureByMatchNumber(roundOf16MatchNumber)).map(
        (matchNumber) => ({
          matchNumber,
          quarterFinalMatchNumber: quarterFinal.matchNumber,
          roundOf16MatchNumber,
          semifinalMatchNumber: half.semifinalMatchNumber
        })
      )
    )
  );
}

function getTournamentTeamCode(team) {
  const fallback = getStandingName(team).slice(0, 3);
  const value = String(team?.id || team?.code || fallback || "TBD")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();

  return value.slice(0, 3) || "TBD";
}

function getTournamentPosterSlotSentence(slot, currentThirdPlaceAssignment) {
  if (slot.kind === "group-place") {
    return slot.place === 1
      ? `Spot: Group ${slot.groupId} winner.`
      : `Spot: Group ${slot.groupId} runner-up.`;
  }

  if (slot.kind === "third-place") {
    const assignedGroupId = currentThirdPlaceAssignment?.[slot.winnerGroupId];
    return assignedGroupId
      ? `Spot: one of the 8 best 3rd-place teams. Pairing now: Group ${assignedGroupId}.`
      : "Spot: one of the 8 best 3rd-place teams. FIFA's pairing rule will decide the group.";
  }

  return `Spot: ${slot.label}.`;
}

function getTournamentCurrentSlotReason(slot, currentTeam, currentThirdPlaceAssignment) {
  if (!currentTeam) {
    return "No team is shown here yet.";
  }

  const teamName = getStandingName(currentTeam);

  if (slot.kind === "group-place") {
    return `Why here now: ${teamName} is ${slot.place === 1 ? "1st" : "2nd"} in Group ${slot.groupId}.`;
  }

  if (slot.kind === "third-place") {
    const assignedGroupId = currentThirdPlaceAssignment?.[slot.winnerGroupId] || currentTeam.groupId;
    return `Why here now: ${teamName} is Group ${assignedGroupId}'s 3rd-place team.`;
  }

  return `Why here now: ${teamName}.`;
}

function getTournamentCandidateText(candidates, likelyTeam) {
  const alternatives = candidates
    .filter((candidate) => candidate.team.id !== likelyTeam?.id)
    .slice(0, 2)
    .map((candidate) => `${getStandingName(candidate.team)} ${candidate.percent}%`);

  return alternatives.length ? `Other possible teams: ${alternatives.join(", ")}.` : "";
}

function getTournamentPosterTooltip(slot, currentTeam, likelyTeam, percent, candidates, projection, currentThirdPlaceAssignment) {
  const currentReason = getTournamentCurrentSlotReason(slot, currentTeam, currentThirdPlaceAssignment);
  const slotSentence = getTournamentPosterSlotSentence(slot, currentThirdPlaceAssignment);

  if (!likelyTeam) {
    return [currentReason, slotSentence, "Prediction: clearer after more group matches."].join("\n");
  }

  return [
    currentReason,
    slotSentence,
    `Prediction: ${getStandingName(likelyTeam)} ${percent}% (${projection.iterations.toLocaleString()} simulations).`,
    getTournamentSlotCondition(slot, likelyTeam, percent, candidates, projection),
    getTournamentCandidateText(candidates, likelyTeam)
  ]
    .filter(Boolean)
    .join("\n");
}

function renderTournamentPosterTeam(match, side, projection, currentRowsByGroup, currentThirdPlaceAssignment) {
  const slot = getRoundOf32SlotDefinition(match, side);
  const currentTeam = getCurrentTournamentSlotTeam(slot, currentRowsByGroup, currentThirdPlaceAssignment);
  const candidates = getTournamentSlotProbability(projection, match.matchNumber, side);
  const likely = candidates[0] || null;
  const likelyTeam = likely?.team || currentTeam;
  const percent = likely?.percent ?? (currentTeam ? 100 : 0);
  const isForecastDifferent = Boolean(likelyTeam && currentTeam && likelyTeam.id !== currentTeam.id);
  const tooltip = getTournamentPosterTooltip(
    slot,
    currentTeam,
    likelyTeam,
    percent,
    candidates,
    projection,
    currentThirdPlaceAssignment
  );
  const teamName = currentTeam ? getStandingName(currentTeam) : "TBD";
  const code = currentTeam ? getTournamentTeamCode(currentTeam) : getTournamentSlotShortTruth(slot, currentThirdPlaceAssignment);

  return `
    <article class="poster-team${isForecastDifferent ? " has-forecast-shift" : ""}" tabindex="0" data-slot-side="${escapeHtml(side)}" data-tooltip="${escapeHtml(tooltip)}" aria-label="${escapeHtml(tooltip)}">
      <span class="poster-team-flag" aria-hidden="true">${currentTeam ? renderFlag(currentTeam) : ""}</span>
      <span class="poster-team-code">${escapeHtml(code)}</span>
      <span class="poster-team-name">${escapeHtml(teamName)}</span>
      <span class="poster-team-probability" aria-hidden="true">${escapeHtml(percent)}%</span>
    </article>
  `;
}

function renderTournamentPosterMatch(entry, orientation, projection, currentRowsByGroup, currentThirdPlaceAssignment) {
  const match = getTournamentFixtureByMatchNumber(entry.matchNumber);

  if (!match) {
    return "";
  }

  return `
    <article class="poster-match is-${escapeHtml(orientation)}" data-match-number="${escapeHtml(match.matchNumber)}" data-round-of-16-match="${escapeHtml(entry.roundOf16MatchNumber)}" data-quarter-final-match="${escapeHtml(entry.quarterFinalMatchNumber)}">
      <div class="poster-match-pair">
        ${renderTournamentPosterTeam(match, "home", projection, currentRowsByGroup, currentThirdPlaceAssignment)}
        <span class="poster-versus" aria-label="versus">VS</span>
        ${renderTournamentPosterTeam(match, "away", projection, currentRowsByGroup, currentThirdPlaceAssignment)}
      </div>
    </article>
  `;
}

function renderTournamentPosterSide(half, orientation, projection, currentRowsByGroup, currentThirdPlaceAssignment) {
  return `
    <div class="poster-side is-${escapeHtml(orientation)}" aria-label="${escapeHtml(`Path to match ${half.semifinalMatchNumber}`)}">
      ${getTournamentPosterMatchEntries(half)
        .map((entry) =>
          renderTournamentPosterMatch(
            entry,
            orientation,
            projection,
            currentRowsByGroup,
            currentThirdPlaceAssignment
          )
        )
        .join("")}
    </div>
  `;
}

function renderTournamentPosterCenter(projection) {
  return `
    <div class="poster-center" aria-label="Round of 32 bracket explainer">
      <div class="poster-center-panel">
        <span class="poster-kicker">As it stands</span>
        <h2>Round of 32</h2>
        <div class="poster-trophy" aria-hidden="true">
          <span class="poster-cup-bowl"></span>
          <span class="poster-cup-stem"></span>
          <span class="poster-cup-base"></span>
        </div>
        <p>Hover a country for its official slot, likely percentage, and what has to happen.</p>
        <span>${escapeHtml(projection.iterations.toLocaleString())} simulations</span>
      </div>
    </div>
  `;
}

function getTournamentSlotCondition(slot, team, percent, candidates, projection) {
  const teamName = getStandingName(team);

  if (slot.kind === "group-place") {
    const placeLabel = slot.place === 1 ? "finish 1st" : "finish 2nd";
    return `Needs: ${teamName} must ${placeLabel} in Group ${slot.groupId}. Ties use FIFA tiebreakers.`;
  }

  if (slot.kind === "third-place") {
    return `Needs: ${teamName} must finish 3rd in Group ${team.groupId}, be top 8 among 3rd-place teams, then match FIFA's third-place pairing rule.`;
  }

  return "";
}

function getTournamentSlotTruth(slot, currentTeam, currentThirdPlaceAssignment) {
  if (slot.kind === "group-place") {
    return `${slot.label} / ${slot.slotText}`;
  }

  if (slot.kind === "third-place") {
    const assignedGroupId = currentThirdPlaceAssignment?.[slot.winnerGroupId];
    const assignedText = assignedGroupId ? ` / current Annex C: 3${assignedGroupId}` : "";
    return `${slot.label} / official third-place slot${assignedText}`;
  }

  return currentTeam?.name || slot.label;
}

function renderTournamentTeamName(team) {
  if (!team) {
    return `<strong class="tournament-team-name">TBD</strong>`;
  }

  return `
    <strong class="tournament-team-name">
      ${renderFlag(team)}
      <span>${escapeHtml(getStandingName(team))}</span>
    </strong>
  `;
}

function renderTournamentSlot(match, side, projection, currentRowsByGroup, currentThirdPlaceAssignment) {
  const slot = getRoundOf32SlotDefinition(match, side);
  const currentTeam = getCurrentTournamentSlotTeam(slot, currentRowsByGroup, currentThirdPlaceAssignment);
  const candidates = getTournamentSlotProbability(projection, match.matchNumber, side);
  const likely = candidates[0] || null;
  const likelyTeam = likely?.team || currentTeam;
  const percent = likely?.percent ?? (currentTeam ? 100 : 0);
  const tooltip = likelyTeam
    ? getTournamentSlotCondition(slot, likelyTeam, percent, candidates, projection)
    : "This slot waits for the group stage and third-place combinations to settle.";

  return `
    <article class="tournament-side is-${escapeHtml(side)}">
      <span class="tournament-slot-truth">${escapeHtml(getTournamentSlotTruth(slot, currentTeam, currentThirdPlaceAssignment))}</span>
      ${renderTournamentTeamName(currentTeam)}
      <span class="tournament-likely" tabindex="0" aria-label="${escapeHtml(tooltip)}" data-tooltip="${escapeHtml(tooltip)}">
        <span>${escapeHtml(likelyTeam ? `Likely ${likelyTeam.name}` : "Likely TBD")}</span>
        <strong>${escapeHtml(percent)}%</strong>
      </span>
    </article>
  `;
}

function renderTournamentPlaceholderSlot(slotText) {
  return `
    <article class="tournament-side is-placeholder">
      <span class="tournament-slot-truth">${escapeHtml(slotText || "TBD")}</span>
      <strong class="tournament-team-name">TBD</strong>
    </article>
  `;
}

function renderTournamentMatch(match, projection, currentRowsByGroup, currentThirdPlaceAssignment) {
  const isRoundOf32 = match.stage === "round-of-32";
  const nextMatchNumber = getTournamentNextMatchNumber(match.matchNumber);
  const route = nextMatchNumber ? `Winner to M${nextMatchNumber}` : getTournamentStageLabel(match.stage);

  return `
    <article class="tournament-match" data-match-number="${escapeHtml(match.matchNumber)}">
      <header class="tournament-match-header">
        <span>M${escapeHtml(match.matchNumber)}</span>
        <time datetime="${escapeHtml(match.kickoffUtc || "")}">${escapeHtml(getTournamentMatchDateLabel(match))}</time>
      </header>
      <div class="tournament-match-sides">
        ${
          isRoundOf32
            ? renderTournamentSlot(match, "home", projection, currentRowsByGroup, currentThirdPlaceAssignment)
            : renderTournamentPlaceholderSlot(match.homeSlot)
        }
        <span class="tournament-versus">vs</span>
        ${
          isRoundOf32
            ? renderTournamentSlot(match, "away", projection, currentRowsByGroup, currentThirdPlaceAssignment)
            : renderTournamentPlaceholderSlot(match.awaySlot)
        }
      </div>
      <footer class="tournament-match-footer">
        <span>${escapeHtml(route)}</span>
        <em>${escapeHtml(match.venue || "")}</em>
      </footer>
    </article>
  `;
}

function renderTournamentRound(stageId, matches, projection, currentRowsByGroup, currentThirdPlaceAssignment) {
  return `
    <section class="tournament-round" aria-label="${escapeHtml(getTournamentStageLabel(stageId))}">
      <h2>${escapeHtml(getTournamentStageLabel(stageId))}</h2>
      <div class="tournament-round-matches">
        ${matches
          .map((match) =>
            renderTournamentMatch(match, projection, currentRowsByGroup, currentThirdPlaceAssignment)
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderTournamentView() {
  const projection = getTournamentProjection();
  const currentRowsByGroup = getCurrentTournamentRowsByGroup();
  const currentThirdPlaceAssignment = getCurrentThirdPlaceAssignment();

  return `
    <section class="tournament-view" aria-label="Tournament bracket">
      <div class="tournament-poster-bracket">
        ${renderTournamentPosterSide(
          TOURNAMENT_BRACKET_HALVES[0],
          "left",
          projection,
          currentRowsByGroup,
          currentThirdPlaceAssignment
        )}
        ${renderTournamentPosterCenter(projection)}
        ${renderTournamentPosterSide(
          TOURNAMENT_BRACKET_HALVES[1],
          "right",
          projection,
          currentRowsByGroup,
          currentThirdPlaceAssignment
        )}
      </div>
    </section>
  `;
}

function getTeamConductScore(row) {
  const value =
    row.teamConductScore ?? row.conductScore ?? row.fairPlayScore ?? row.fairPlayPoints;
  const score = Number(value);

  return Number.isFinite(score) ? score : null;
}

function compareThirdPlaceCandidates(a, b) {
  const conductA = getTeamConductScore(a);
  const conductB = getTeamConductScore(b);

  return (
    b.pts - a.pts ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    (conductA !== null && conductB !== null ? conductB - conductA : 0) ||
    getFifaRankValue(a.team) - getFifaRankValue(b.team) ||
    a.groupIndex - b.groupIndex ||
    a.team.name.localeCompare(b.team.name)
  );
}

function getThirdPlaceTieSignature(row) {
  return `${row.pts}|${row.gd}|${row.gf}`;
}

function getThirdPlaceStatus(candidate, advancerCount) {
  const isInside = candidate.position <= advancerCount;

  if (candidate.isCutLineTie) {
    return {
      kind: "pending",
      label: "Tiebreak pending",
      detail: "Tied on loaded stats; fair-play data decides before FIFA ranking."
    };
  }

  if (isInside && candidate.position >= advancerCount - 1) {
    return {
      kind: "bubble-in",
      label: "Just inside",
      detail: "Inside the top eight right now, but close to the cut line."
    };
  }

  if (isInside) {
    return {
      kind: "in",
      label: "Advancing now",
      detail: "Inside the top eight best third-place teams."
    };
  }

  if (candidate.position === advancerCount + 1) {
    return {
      kind: "first-out",
      label: "Just outside",
      detail: "Next team outside the top eight."
    };
  }

  return {
    kind: "out",
    label: "Outside now",
    detail: "Needs results elsewhere to move into the top eight."
  };
}

function annotateThirdPlaceRaceRows(rows, advancerCount) {
  const annotatedRows = rows.map((row, index) => ({
    ...row,
    isCutLineTie: false,
    isUnresolvedTie: false,
    position: index + 1,
    tieGroupEnd: index + 1,
    tieGroupStart: index + 1
  }));

  let index = 0;
  while (index < annotatedRows.length) {
    const signature = getThirdPlaceTieSignature(annotatedRows[index]);
    let endIndex = index + 1;

    while (
      endIndex < annotatedRows.length &&
      getThirdPlaceTieSignature(annotatedRows[endIndex]) === signature
    ) {
      endIndex += 1;
    }

    const tieGroup = annotatedRows.slice(index, endIndex);
    const hasMissingConduct = tieGroup.some((row) => getTeamConductScore(row) === null);
    const isUnresolvedTie = tieGroup.length > 1 && hasMissingConduct;
    const isCutLineTie = isUnresolvedTie && index < advancerCount && endIndex > advancerCount;

    for (let tieIndex = index; tieIndex < endIndex; tieIndex += 1) {
      annotatedRows[tieIndex].isCutLineTie = isCutLineTie;
      annotatedRows[tieIndex].isUnresolvedTie = isUnresolvedTie;
      annotatedRows[tieIndex].tieGroupStart = index + 1;
      annotatedRows[tieIndex].tieGroupEnd = endIndex;
    }

    index = endIndex;
  }

  return annotatedRows.map((row) => ({
    ...row,
    status: getThirdPlaceStatus(row, advancerCount)
  }));
}

function getThirdPlaceRaceRows() {
  const rows = (tournament.groups || [])
    .map((group, groupIndex) => {
      const standing = getStandingsRows(group.id)[THIRD_PLACE_STANDING_INDEX];

      if (!standing) {
        return null;
      }

      return {
        ...standing,
        conductScore: getTeamConductScore(standing),
        groupId: group.id,
        groupIndex,
        groupLabel: group.label || `Group ${group.id}`,
        team: getTeam(standing.teamId)
      };
    })
    .filter(Boolean)
    .sort(compareThirdPlaceCandidates);

  return annotateThirdPlaceRaceRows(rows, getThirdPlaceAdvancerCount());
}

function getThirdPlaceRaceByTeamId() {
  return new Map(getThirdPlaceRaceRows().map((candidate) => [candidate.teamId, candidate]));
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
      "Goal difference is goals scored minus goals allowed. If teams are tied on points, a better goal difference can help decide who advances."
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

function renderStandingTeam(team, options = {}) {
  const { showRank = true, trailingHtml = "" } = options;
  const standingName = getStandingName(team);
  const fullName = team.name || standingName;
  const teamClasses = "standing-team";
  const tooltipAttributes = fullName ? ` data-tooltip="${escapeHtml(fullName)}"` : "";

  return `
    <span class="${teamClasses}" aria-label="${escapeHtml(fullName)}"${tooltipAttributes}>
      ${renderFlag(team)}
      <span class="standing-name" aria-label="${escapeHtml(fullName)}" title="${escapeHtml(fullName)}">${escapeHtml(standingName)}</span>
      ${showRank ? renderRank(team) : ""}
      ${trailingHtml}
    </span>
  `;
}

function renderThirdPlaceStandingBadge(candidate) {
  const status = candidate.status || getThirdPlaceStatus(candidate, getThirdPlaceAdvancerCount());
  const rankLabel = formatOrdinal(candidate.position);
  const label = `${candidate.team.name} is ${rankLabel} in the best third-place race: ${status.label}`;

  return `
    <span class="third-place-pill is-${escapeHtml(status.kind)}" aria-label="${escapeHtml(label)}">
      3rd race ${escapeHtml(rankLabel)}
    </span>
  `;
}

function renderStandingRow(row, options = {}) {
  const team = getTeam(row.teamId);
  const { showRank = true, thirdPlaceRaceByTeamId = null } = options;
  const thirdPlaceCandidate = thirdPlaceRaceByTeamId?.get(row.teamId);

  return `
    <tr>
      <td>
        ${renderStandingTeam(team, {
          showRank,
          trailingHtml: thirdPlaceCandidate
            ? renderThirdPlaceStandingBadge(thirdPlaceCandidate)
            : ""
        })}
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
  const fullName = team?.name || teamName;

  return `
    <span class="standing-team" aria-label="${escapeHtml(fullName)}" data-tooltip="${escapeHtml(fullName)}">
      ${team ? renderFlag(team) : ""}
      <span class="standing-name" aria-label="${escapeHtml(fullName)}" title="${escapeHtml(fullName)}">${escapeHtml(teamName)}</span>
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

function renderThirdPlaceStatus(candidate) {
  const reason = getThirdPlaceReason(candidate);
  const tooltipLabel = `${candidate.status.label}: ${reason}`;

  return `
    <span class="third-place-status-cell">
      <span class="third-place-status is-${escapeHtml(candidate.status.kind)}" tabindex="0" aria-label="${escapeHtml(tooltipLabel)}" data-tooltip="${escapeHtml(reason)}">
        ${escapeHtml(candidate.status.label)}
      </span>
    </span>
  `;
}

function formatStandingPoints(points) {
  return `${points} ${points === 1 ? "point" : "points"}`;
}

function formatGoalsScored(goals) {
  return `${goals} ${goals === 1 ? "goal" : "goals"} scored`;
}

function getThirdPlaceReason(candidate) {
  if (candidate.isCutLineTie) {
    return `Tied on loaded stats for ${formatOrdinal(candidate.tieGroupStart)}-${formatOrdinal(candidate.tieGroupEnd)}.`;
  }

  const nearestCandidate = candidate.position <= getThirdPlaceAdvancerCount()
    ? getThirdPlaceRaceRows()[candidate.position]
    : getThirdPlaceRaceRows()[candidate.position - 2];

  if (!nearestCandidate) {
    return `${formatStandingPoints(candidate.pts)}, ${formatGoalDifference(candidate.gd)} goal difference, ${formatGoalsScored(candidate.gf)}.`;
  }

  if (candidate.pts !== nearestCandidate.pts) {
    return `${formatStandingPoints(candidate.pts)}; ${candidate.position <= getThirdPlaceAdvancerCount() ? "above" : "behind"} next team on points.`;
  }

  if (candidate.gd !== nearestCandidate.gd) {
    return `${formatGoalDifference(candidate.gd)} goal difference; ${candidate.position <= getThirdPlaceAdvancerCount() ? "ahead" : "behind"} on goal difference.`;
  }

  if (candidate.gf !== nearestCandidate.gf) {
    return `${formatGoalsScored(candidate.gf)}; ${candidate.position <= getThirdPlaceAdvancerCount() ? "ahead" : "behind"} on total goals scored.`;
  }

  return `${formatStandingPoints(candidate.pts)}, ${formatGoalDifference(candidate.gd)} goal difference, ${formatGoalsScored(candidate.gf)}.`;
}

function renderThirdPlaceRaceRow(candidate) {
  const rowClasses = [
    candidate.position <= getThirdPlaceAdvancerCount() ? "is-inside" : "is-outside",
    candidate.isCutLineTie ? "is-cut-line-tie" : "",
    candidate.position === getThirdPlaceAdvancerCount() ? "is-cut-line" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <tr class="${escapeHtml(rowClasses)}">
      <td class="third-place-rank-cell">${escapeHtml(formatOrdinal(candidate.position))}</td>
      <td>${renderStandingTeam(candidate.team)}</td>
      <td>
        <button class="third-place-group-button" type="button" data-group-id="${escapeHtml(candidate.groupId)}" aria-label="Open ${escapeHtml(candidate.groupLabel)} standings">
          ${escapeHtml(candidate.groupLabel)}
        </button>
      </td>
      <td>${escapeHtml(candidate.pts)}</td>
      <td>${escapeHtml(formatGoalDifference(candidate.gd))}</td>
      <td>${escapeHtml(candidate.gf)}</td>
      <td>${renderThirdPlaceStatus(candidate)}</td>
    </tr>
  `;
}

function renderThirdPlaceCutLine(advancerCount) {
  return `
    <tr class="third-place-cut-row" aria-hidden="true">
      <td colspan="7">
        <span>Top ${escapeHtml(advancerCount)} advance</span>
      </td>
    </tr>
  `;
}

function renderThirdPlaceRaceTable(rows, advancerCount) {
  const tableRows = rows
    .flatMap((candidate) => [
      renderThirdPlaceRaceRow(candidate),
      candidate.position === advancerCount ? renderThirdPlaceCutLine(advancerCount) : ""
    ])
    .join("");

  return `
    <div class="third-place-table-shell">
      <table class="standings-table third-place-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>Group</th>
            <th>Pts</th>
            <th>GD</th>
            <th>Goals</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  `;
}

function renderThirdPlaceRaceView() {
  const rows = getThirdPlaceRaceRows();
  const advancerCount = getThirdPlaceAdvancerCount();
  const unresolvedCutLine = rows.some((candidate) => candidate.isCutLineTie);
  const note = unresolvedCutLine
    ? "One or more teams around the cut line are tied on points, goal difference and goals scored. The loaded data does not include fair-play conduct yet, so that part is marked pending."
    : "Tie order follows points, goal difference, goals scored, loaded fair-play conduct when available, then FIFA ranking as the final deterministic fallback.";

  return `
    <section class="third-place-race" aria-label="Best third-place race">
      ${renderThirdPlaceRaceTable(rows, advancerCount)}
      <p class="third-place-note">${escapeHtml(note)}</p>
    </section>
  `;
}

function renderCurrentStandingsCards() {
  const thirdPlaceRaceByTeamId = getThirdPlaceRaceByTeamId();

  return tournament.groups
    .map(
      (group) => `
        <article class="standings-card" data-group-id="${escapeHtml(group.id)}" tabindex="-1">
          <h2>${escapeHtml(group.label)}</h2>
          ${renderStandings(group.id, { thirdPlaceRaceByTeamId })}
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

function getValidStandingsMode(value) {
  if (value === "third-place" || value === "tournament") {
    return value;
  }

  return "groups";
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

function updateStandingsModeControls() {
  const shouldShowModeTabs = selectedStandingsYear === CURRENT_STANDINGS_YEAR;

  if (standingsModeTabsShell) {
    standingsModeTabsShell.hidden = !shouldShowModeTabs;
  }

  standingsModeTabs.forEach((tab) => {
    const isSelected = shouldShowModeTabs && tab.dataset.standingsMode === selectedStandingsMode;

    tab.classList.toggle("is-active", isSelected);
    tab.disabled = !shouldShowModeTabs;
    tab.hidden = !shouldShowModeTabs;
    tab.setAttribute("aria-pressed", String(isSelected));
  });
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
        ? selectedStandingsMode === "third-place"
          ? THIRD_PLACE_STANDINGS_SUMMARY
          : selectedStandingsMode === "tournament"
            ? TOURNAMENT_STANDINGS_SUMMARY
          : CURRENT_STANDINGS_SUMMARY
        : HISTORICAL_STANDINGS_SUMMARY;
  }

  renderStandingsYearPicker();
  updateStandingsModeControls();
}

function renderStandingsView() {
  const isCurrentYear = selectedStandingsYear === CURRENT_STANDINGS_YEAR;
  const isThirdPlaceMode = isCurrentYear && selectedStandingsMode === "third-place";
  const isTournamentMode = isCurrentYear && selectedStandingsMode === "tournament";

  updateStandingsControls();
  standingsGrid.classList.toggle("is-third-place-race", isThirdPlaceMode);
  standingsGrid.classList.toggle("is-tournament", isTournamentMode);
  standingsGrid.setAttribute(
    "aria-label",
    isTournamentMode
      ? "Tournament bracket"
      : isThirdPlaceMode
        ? "Best third-place race"
        : "Group standings"
  );
  standingsGrid.innerHTML = isCurrentYear
    ? isThirdPlaceMode
      ? renderThirdPlaceRaceView()
      : isTournamentMode
        ? renderTournamentView()
      : renderCurrentStandingsCards()
    : renderHistoricalStandingsCards(selectedStandingsYear);
  updateStandingNameTooltips(standingsGrid);
}

function renderPredictionBar(label, value) {
  const percent = clampPercent(value);
  const escapedLabel = escapeHtml(label);
  return `
    <div class="prediction-row" data-tooltip="${escapedLabel}">
      ${renderMeasuredLabel(label, "prediction-label")}
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

  if (projection?.method === "market-implied-consensus") {
    return "Market-implied consensus from public odds, normalized to remove sportsbook margin. Not betting advice.";
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

function renderPredictionBlock(match) {
  return `
    <section class="info-block">
      ${renderPredictionHeading(match.projection)}
      ${renderProjection(match)}
    </section>
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

function getResultHighlights(match) {
  return getGeneratedResultHighlights(match);
}

function getAuthoredResultMoment(match) {
  if (!Array.isArray(match.resultHighlights)) {
    return "";
  }

  return match.resultHighlights.find((highlight) => typeof highlight === "string" && highlight.trim())?.trim() || "";
}

function stripHighlightIcon(text) {
  return text
    .trim()
    .replace(/^(?:⚽|🌟|📊|🔥|🛡️|🧱|⏱️|🧤|🎯|🏁|🤝)\s*/u, "")
    .trim();
}

function compactResultHighlightText(text, maxLength = 92) {
  const trimmed = String(text || "").trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  const [firstClause] = trimmed.split(/[,;]\s+/);
  if (firstClause && firstClause.length <= maxLength) {
    return firstClause;
  }

  return `${trimmed.slice(0, maxLength - 3).trimEnd()}...`;
}

function getCatchUpStandout(match) {
  if (!Array.isArray(match.catchUp)) {
    return "";
  }

  for (const item of match.catchUp) {
    const standouts = normalizeCatchUpStandouts(item?.standouts || item?.standout || item?.playerPulse);
    if (standouts.length) {
      return standouts[0];
    }

    const body = typeof item?.body === "string" ? item.body.trim() : "";
    if (body && /(brace|equaliz|hat trick|penalt|save|scored|sealed|spark|stoppage|winner)/i.test(body)) {
      return body;
    }

    const headline = typeof item?.headline === "string" ? item.headline.trim() : "";
    if (headline && /(brace|equaliz|hat trick|penalt|save|scored|sealed|spark|stoppage|winner)/i.test(headline)) {
      return headline;
    }
  }

  return "";
}

function formatMomentHighlight(moment) {
  const text = moment ? stripHighlightIcon(moment) : "";

  if (!text) {
    return "";
  }

  return `🌟 ${compactResultHighlightText(text)}`;
}

function getDrawTeamStoryHighlight(match, score) {
  const scoreText = `${score.home}-${score.away}`;

  return `⚽ ${match.homeTeam.name} and ${match.awayTeam.name} drew ${scoreText}.`;
}

function getWinTeamStoryHighlight(winner, loser, winnerScore, loserScore, margin) {
  const scoreText = `${winnerScore}-${loserScore}`;

  if (margin >= 3) {
    return `⚽ ${winner.name} made a statement with a ${scoreText} win.`;
  }

  if (margin === 2) {
    return `⚽ ${winner.name} beat ${loser.name} ${scoreText}.`;
  }

  return `⚽ ${winner.name} edged ${loser.name} ${scoreText}.`;
}

function getDrawMomentHighlight(match, score, moment) {
  const authoredMoment = formatMomentHighlight(moment);
  if (authoredMoment) {
    return authoredMoment;
  }

  if (score.home === 0 && score.away === 0) {
    return `🌟 Both defenses held firm.`;
  }

  return `🌟 Neither side let the lead last.`;
}

function getWinMomentHighlight(winner, loser, winnerScore, loserScore, margin, moment) {
  const authoredMoment = formatMomentHighlight(moment);
  if (authoredMoment) {
    return authoredMoment;
  }

  if (loserScore === 0 && margin >= 3) {
    return `🌟 The clean sheet gave ${loser.name} no way back.`;
  }

  if (loserScore === 0) {
    return `🌟 ${winner.name} held firm for the clean sheet.`;
  }

  if (margin === 1) {
    return `🌟 ${winner.name} protected the narrow lead.`;
  }

  if (winnerScore >= 4) {
    return `🌟 ${winner.name}'s attack kept producing goals.`;
  }

  return `🌟 ${winner.name} created the needed separation.`;
}

function getDrawGroupImpactHighlight(match, score, context) {
  if (match.stage !== "group") {
    return `📊 ${context} finished level.`;
  }

  return `📊 Both sides took one point in ${context}.`;
}

function getWinGroupImpactHighlight(match, winner, loser, margin, context) {
  if (match.stage !== "group") {
    return `📊 ${winner.name} advanced; ${loser.name} are out.`;
  }

  if (margin >= 3) {
    return `📊 ${winner.name} took three points and +${margin} GD in ${context}.`;
  }

  return `📊 ${winner.name} took three points in ${context}.`;
}

function getGeneratedDrawHighlights(match, score, context, standout) {
  return [
    getDrawTeamStoryHighlight(match, score),
    getDrawMomentHighlight(match, score, standout),
    getDrawGroupImpactHighlight(match, score, context)
  ];
}

function getGeneratedWinHighlights(match, score, context, standout) {
  const winnerSide = getScoreWinnerSide(score.home, score.away);
  const winner = winnerSide === "home" ? match.homeTeam : match.awayTeam;
  const loser = winnerSide === "home" ? match.awayTeam : match.homeTeam;
  const winnerScore = winnerSide === "home" ? score.home : score.away;
  const loserScore = winnerSide === "home" ? score.away : score.home;
  const margin = winnerScore - loserScore;

  return [
    getWinTeamStoryHighlight(winner, loser, winnerScore, loserScore, margin),
    getWinMomentHighlight(winner, loser, winnerScore, loserScore, margin, standout),
    getWinGroupImpactHighlight(match, winner, loser, margin, context)
  ];
}

function getGeneratedResultHighlights(match) {
  const score = getCatchUpScore(match);

  if (!score) {
    return [];
  }

  const context = getCatchUpContext(match);
  const standout = getAuthoredResultMoment(match) || getCatchUpStandout(match);

  if (!getScoreWinnerSide(score.home, score.away)) {
    return getGeneratedDrawHighlights(match, score, context, standout);
  }

  return getGeneratedWinHighlights(match, score, context, standout);
}

function renderResultNotes(match) {
  const highlights = getResultHighlights(match);

  if (!highlights.length) {
    return `<p class="data-note">Final score reflected in the current standings after source checks.</p>`;
  }

  return `
    <ul class="result-highlights">
      ${highlights.map((highlight) => `<li>${escapeHtml(highlight)}</li>`).join("")}
    </ul>
  `;
}

function renderMatchStatusBlock(match) {
  if (match.status === "FT") {
    return `
      <section class="info-block">
        <h3>Result</h3>
        ${renderScoreSummary(match)}
        ${renderResultNotes(match)}
      </section>
      ${renderPredictionBlock(match)}
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

  return renderPredictionBlock(match);
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

function getTeamStyleTags(team) {
  if (!Array.isArray(team?.styleTags)) {
    return [];
  }

  return team.styleTags
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

function renderTeamStyleTags(team) {
  const tags = getTeamStyleTags(team);
  if (!tags.length) {
    return "";
  }

  const teamName = team?.name || "Team";
  return `
    <ul class="team-style-pills" aria-label="${escapeHtml(`${teamName} tactical style`)}">
      ${tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}
    </ul>
  `;
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
    const uniqueNamePartKeys = [
      otherNameParts[0],
      otherNameParts.at(-1)
    ]
      .filter(Boolean)
      .map((part) => normalizeTextKey(part));
    for (const key of new Set(uniqueNamePartKeys)) {
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
    const playerName = getPlayerName(player);
    if (!playerName) {
      continue;
    }

    const playerKey = normalizeTextKey(playerName);
    for (const alias of getPlayerAliases(player, players)) {
      const key = normalizeTextKey(alias);
      const bucket = aliasBuckets.get(key) || { aliases: [], players: new Map() };
      if (!bucket.aliases.includes(alias)) {
        bucket.aliases.push(alias);
      }
      bucket.players.set(playerKey, player);
      aliasBuckets.set(key, bucket);
    }
  }

  return [...aliasBuckets.values()]
    .filter((bucket) => bucket.players.size === 1)
    .flatMap((bucket) => {
      const player = [...bucket.players.values()][0];
      return bucket.aliases.map((alias) => ({ alias, player }));
    })
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
  const triggerLabel = `aria-label="${escapeHtml(`${displayName}: ${position}, ${club}`)}" aria-expanded="false"`;
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
            <strong class="player-card-name">${escapeHtml(displayName)}</strong>
            <span class="player-card-position">${escapeHtml(position)}</span>
            <span class="player-card-club">${escapeHtml(club)}</span>
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

function shouldUseTapPlayerCards() {
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

function setPlayerCardOpen(playerHover, isOpen) {
  playerHover.classList.toggle("is-card-open", isOpen);
  playerHover.querySelector(".player-link")?.setAttribute("aria-expanded", String(isOpen));
}

function closeActivePlayerCard() {
  if (!activePlayerHover) {
    return;
  }

  setPlayerCardOpen(activePlayerHover, false);
  activePlayerHover = null;
}

function openPlayerCard(playerHover) {
  if (activePlayerHover && activePlayerHover !== playerHover) {
    setPlayerCardOpen(activePlayerHover, false);
  }

  activePlayerHover = playerHover;
  setPlayerCardOpen(playerHover, true);
  positionPlayerCard(playerHover);
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
      <h4>${renderKeyInformationHeading(team, label, mentionPlayers)}</h4>
      ${renderTeamStyleTags(team)}
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
            <article class="past-record-row" aria-label="${escapeHtml(item.rowLabel)}" data-tooltip="${escapeHtml(item.label)}">
              ${renderMeasuredLabel(item.label, "past-record-label")}
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

  if (scoringMoments.length > 2) {
    return `${formatHistoricalScorerSeries(scoringMoments.slice(0, 2))}, and ${scoringMoments.length - 2} more.`;
  }

  return `${formatHistoricalScorerSeries(scoringMoments)}.`;
}

function getHistoricalScoringHighlight(match, teamName) {
  const scorerText = getHistoricalScorerText(getHistoricalTeamGoals(match, teamName));

  return scorerText ? `⚽ ${scorerText}` : "";
}

function getHistoricalDrawScoringHighlight(match) {
  const scoreText = getHistoricalScoreText(match);
  const homeScorers = getHistoricalScoringHighlight(match, match.homeTeam.name);
  const awayScorers = getHistoricalScoringHighlight(match, match.awayTeam.name);

  if (homeScorers && awayScorers) {
    return `${homeScorers} ${awayScorers.replace("⚽ ", "")}`;
  }

  return homeScorers || awayScorers || `⚽ ${match.homeTeam.name} and ${match.awayTeam.name} drew ${scoreText}.`;
}

function getHistoricalResultOutcomeHighlight(match) {
  const winner = getHistoricalWinner(match);
  const scoreText = getHistoricalScoreText(match);

  if (match.status === "CANCELLED") {
    return `🚫 ${match.homeTeam.name} vs ${match.awayTeam.name} was cancelled.`;
  }

  if (!winner) {
    return `🤝 ${match.homeTeam.name} and ${match.awayTeam.name} drew ${scoreText}.`;
  }

  const loser = winner === match.homeTeam.name ? match.awayTeam.name : match.homeTeam.name;
  const penalties = match.scoreDetails?.penalties;
  const winnerScoreText = formatScorePair(getHistoricalScorePairForTeam(match, winner));

  if (penalties) {
    return `🎯 ${winner} won on penalties after ${formatScorePair(match.score)}.`;
  }

  return `🏁 ${winner} beat ${loser} ${winnerScoreText || scoreText}.`;
}

function getHistoricalResultControlHighlight(match) {
  if (match.status === "CANCELLED") {
    return `📌 Cancelled in the ${match.tournamentName} archive.`;
  }

  const winner = getHistoricalWinner(match);
  const context = getHistoricalContextLabel(match);
  const penalties = match.scoreDetails?.penalties;
  const extraTime = match.scoreDetails?.extraTime;

  if (penalties) {
    return `⏱️ Extra time led to penalties in ${context}.`;
  }

  if (extraTime) {
    return winner ? `⏱️ ${winner} won after extra time.` : "⏱️ Extra time decided the match.";
  }

  if (winner) {
    const winnerScore = winner === match.homeTeam.name ? Number(match.score?.home) : Number(match.score?.away);
    const loserScore = winner === match.homeTeam.name ? Number(match.score?.away) : Number(match.score?.home);
    if (loserScore === 0) {
      return `🛡️ ${winner} kept a clean sheet.`;
    }

    if (winnerScore - loserScore >= 3) {
      return `🔥 ${winner} broke the match open.`;
    }

    return `📊 ${winner} won in ${context}.`;
  }

  return `📊 Points shared in ${context}.`;
}

function getHistoricalResultProgressHighlight(match) {
  const context = getHistoricalContextLabel(match);

  if (match.status === "CANCELLED") {
    return `📊 No points from this cancelled ${context} fixture.`;
  }

  if (match.group) {
    const winner = getHistoricalWinner(match);

    if (!winner) {
      return `📊 Both teams took one point from ${context}.`;
    }

    return `📊 ${winner} took three points from ${context}.`;
  }

  const winner = getHistoricalWinner(match);

  if (match.round === "Final" && winner) {
    return `🏆 ${winner} won the ${match.tournamentName} title.`;
  }

  if (/third|3rd|place/i.test(match.round || "") && winner) {
    return `🥉 ${winner} secured third place at ${match.tournamentName}.`;
  }

  return winner ? `📊 ${winner} advanced from ${context}.` : `📊 ${context} ended level.`;
}

function getHistoricalResultHighlights(match) {
  if (match.status === "CANCELLED") {
    return [
      getHistoricalResultOutcomeHighlight(match),
      getHistoricalResultControlHighlight(match),
      getHistoricalResultProgressHighlight(match)
    ];
  }

  const winner = getHistoricalWinner(match);
  const scoringTeam = winner || match.homeTeam.name;

  return [
    winner ? getHistoricalScoringHighlight(match, scoringTeam) || getHistoricalResultOutcomeHighlight(match) : getHistoricalDrawScoringHighlight(match),
    getHistoricalResultControlHighlight(match),
    getHistoricalResultProgressHighlight(match)
  ].filter(Boolean);
}

function renderHistoricalResultBlock(match) {
  return `
    <section class="info-block">
      <h3>Result</h3>
      <p class="past-empty">${escapeHtml(getHistoricalResultOutcomeHighlight(match))}</p>
      <ul class="result-highlights">
        ${getHistoricalResultHighlights(match)
          .map((highlight) => `<li>${escapeHtml(highlight)}</li>`)
          .join("")}
      </ul>
    </section>
  `;
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
        .map((teamName) => {
          const team = getHistoricalTeam(teamName);
          return `
            <article class="key-info-team">
              <h4>${renderKeyInformationHeading(team, getHistoricalTeamKeyHeadline(match, teamName))}</h4>
              ${renderTeamStyleTags(team)}
              <p>${escapeHtml(getHistoricalTeamKeyBody(match, teamName))}</p>
            </article>
          `;
        })
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
            <article class="past-record-row" aria-label="${escapeHtml(item.rowLabel)}" data-tooltip="${escapeHtml(item.label)}">
              ${renderMeasuredLabel(item.label, "past-record-label")}
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

    ${renderHistoricalResultBlock(match)}

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
  closeActivePlayerCard();
  activeMatchId = match.id;
  viewPanels.matches.classList.add("has-match-info");
  matchInfo.classList.remove("is-hidden");
  matchInfo.hidden = false;

  document.querySelectorAll(".match-row").forEach((row) => {
    const isSelected = row.dataset.matchId === match.id;
    row.classList.toggle("is-selected", isSelected);
    row.querySelector(".match-row-trigger")?.setAttribute("aria-pressed", String(isSelected));
  });

  if (match.isHistorical) {
    matchInfo.innerHTML = renderHistoricalMatchInfo(match);
    positionPlayerCards();
    updateTruncatedTeamTooltips(matchInfo);
    updateStandingNameTooltips(matchInfo);
    updateMeasuredLabelTooltips(matchInfo);
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
  updateTruncatedTeamTooltips(matchInfo);
  updateStandingNameTooltips(matchInfo);
  updateMeasuredLabelTooltips(matchInfo);

  if (options.reveal) {
    revealMatchInfoOnSmallScreens();
  }
}

function renderMatchInfoPrompt() {
  activeMatchId = "";
  viewPanels.matches.classList.remove("has-match-info");
  document.querySelectorAll(".match-row").forEach((row) => {
    row.classList.remove("is-selected");
    row.querySelector(".match-row-trigger")?.setAttribute("aria-pressed", "false");
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

function renderSearchEmptyState() {
  activeMatchId = "";
  viewPanels.matches.classList.remove("has-match-info");
  const searchLabel = matchSearchQuery || "that country";

  matchList.innerHTML = `
    <article class="empty-state">
      <h2>No matches found</h2>
      <p>No loaded World Cup matches match ${escapeHtml(searchLabel)}.</p>
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

function renderSearchDateLabel(match) {
  const dateKey = getFixtureDayKey(match);
  const date = getDateFromKey(dateKey);
  const time = document.createElement("time");

  time.className = "country-match-date";
  time.dateTime = dateKey;
  time.textContent = navDateWithYearFormatter.format(date);

  return time;
}

function renderSearchMatchEntry(match, state, currentTime, queryKey = normalizeTextKey(matchSearchQuery)) {
  const entry = document.createElement("div");
  const searchSide = getSearchMatchSide(match, queryKey);

  entry.className = "country-match-entry";
  entry.append(
    renderSearchDateLabel(match),
    renderMatchRow(match, state, currentTime, { searchSide })
  );

  return entry;
}

function renderSearchHistoryToggle(isExpanded) {
  const button = document.createElement("button");

  button.className = "country-match-more";
  button.type = "button";
  button.dataset.searchHistoryToggle = isExpanded ? "hide" : "show";
  button.textContent = isExpanded ? "Hide previous World Cups" : "See previous World Cups";

  return button;
}

function renderSearchMatchGroup(title, matches, nextMatchIds, currentTime, options = {}) {
  const { action = null, kind = "" } = options;
  const queryKey = options.queryKey || normalizeTextKey(matchSearchQuery);
  const section = document.createElement("section");
  const heading = document.createElement("h2");

  section.className = ["country-match-section", kind ? `is-${kind}` : ""]
    .filter(Boolean)
    .join(" ");
  section.setAttribute("aria-label", title);
  heading.className = "country-match-section-title";
  heading.textContent = title;
  section.append(heading);

  for (const match of matches) {
    section.append(
      renderSearchMatchEntry(match, getMatchState(match, nextMatchIds, currentTime), currentTime, queryKey)
    );
  }

  if (action) {
    section.append(action);
  }

  return section;
}

function isCurrentWorldCupMatch(match) {
  return !match.isHistorical;
}

function renderSearchResults(currentTime) {
  const matches = getMatchesForSearch();
  const nextMatchIds = getNextMatchIdsForMatches(matches, currentTime);
  const upcomingMatches = matches
    .filter((match) => isSearchUpcomingMatch(match, currentTime))
    .sort(compareFixturesAscending);
  const previousMatches = matches
    .filter((match) => !isSearchUpcomingMatch(match, currentTime))
    .sort(compareFixturesDescending);
  const currentWorldCupPreviousMatches = previousMatches.filter(isCurrentWorldCupMatch);
  const historicalPreviousMatches = previousMatches.filter((match) => !isCurrentWorldCupMatch(match));
  const groups = [];

  updateTeamSearchControls();

  if (!matches.length) {
    renderSearchEmptyState();
    updateUrlState();
    return;
  }

  if (upcomingMatches.length) {
    const primaryTitle = isMatchLive(upcomingMatches[0], currentTime)
      ? "Live now"
      : "Next match";
    groups.push(renderSearchMatchGroup(primaryTitle, upcomingMatches.slice(0, 1), nextMatchIds, currentTime));

    if (upcomingMatches.length > 1) {
      groups.push(renderSearchMatchGroup("Later matches", upcomingMatches.slice(1), nextMatchIds, currentTime));
    }
  }

  if (currentWorldCupPreviousMatches.length) {
    groups.push(
      renderSearchMatchGroup("Previous matches", currentWorldCupPreviousMatches, nextMatchIds, currentTime, {
        action: historicalPreviousMatches.length && !showHistoricalSearchMatches
          ? renderSearchHistoryToggle(false)
          : null,
        kind: "previous"
      })
    );
  } else if (historicalPreviousMatches.length && !showHistoricalSearchMatches) {
    groups.push(
      renderSearchMatchGroup("Previous matches", [], nextMatchIds, currentTime, {
        action: renderSearchHistoryToggle(false),
        kind: "previous"
      })
    );
  }

  if (showHistoricalSearchMatches && historicalPreviousMatches.length) {
    groups.push(
      renderSearchMatchGroup("Previous World Cups", historicalPreviousMatches, nextMatchIds, currentTime, {
        action: renderSearchHistoryToggle(true),
        kind: "history"
      })
    );
  }

  matchList.replaceChildren(...groups);

  const activeMatch = matches.find((match) => match.id === activeMatchId);

  if (activeMatch) {
    renderMatchInfo(activeMatch);
  } else {
    renderMatchInfoPrompt();
  }

  updateTruncatedTeamTooltips(matchList);
  updateUrlState();
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

function getResultSourceForMatch(match) {
  const sourceMatchText = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
  const sourceMatchKey = normalizeTextKey(sourceMatchText);
  const sourcePairKey = normalizeTextKey(`${match.homeTeam.name} ${match.awayTeam.name}`);
  const sourceResultPattern = /result|final score|match report|highlights/i;
  const usableSourceTypes = new Set(["cross-check", "official"]);

  return (tournament.sources || []).find((source) => {
    if (!source.url || !usableSourceTypes.has(source.type) || !sourceResultPattern.test(source.label)) {
      return false;
    }

    const sourceText = normalizeTextKey(`${source.id} ${source.label} ${source.url}`);
    return sourceText.includes(sourceMatchKey) || sourceText.includes(sourcePairKey);
  });
}

function getResultSourceFields(match) {
  const source = getResultSourceForMatch(match);

  return source
    ? {
        sourceLabel: source.label,
        sourceUrl: source.url
      }
    : {};
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
      ...getResultSourceFields(match),
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
    ...getResultSourceFields(match),
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

  return fixtures
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
          <h3><span>${escapeHtml(item.headline)}</span></h3>
          ${sourceLink}
        </div>
        ${item.body ? `<p class="catch-up-subtitle">${escapeHtml(item.body)}</p>` : ""}
        ${points}
      </div>
    </article>
  `;
}

function renderCatchUpGroup(dateKey, items) {
  const groupDate = getDateFromKey(dateKey || selectedDayKey);
  return `
    <section class="catch-up-group" aria-label="${escapeHtml(
      catchUpItemLeadDateFormatter.format(groupDate)
    )}">
      <time class="catch-up-group-date" datetime="${escapeHtml(dateKey || selectedDayKey)}">${escapeHtml(
        catchUpItemLeadDateFormatter.format(groupDate)
      )}</time>
      <div class="catch-up-group-items">
        ${items.map(renderCatchUpItem).join("")}
      </div>
    </section>
  `;
}

function renderCatchUpGroups(items) {
  const groups = [];

  for (const item of items) {
    const dateKey = item.dateKey || selectedDayKey;
    const latestGroup = groups[groups.length - 1];
    if (latestGroup?.dateKey === dateKey) {
      latestGroup.items.push(item);
    } else {
      groups.push({ dateKey, items: [item] });
    }
  }

  return groups.map((group) => renderCatchUpGroup(group.dateKey, group.items)).join("");
}

function renderCatchUp() {
  if (!catchUpList) {
    return;
  }

  const dayKeys = getCatchUpWindowDayKeys();
  const latestKey = dayKeys.at(-1) || selectedDayKey;
  const latestDate = getDateFromKey(latestKey);
  const items = getCatchUpItems();

  catchUpList.innerHTML = items.length
    ? renderCatchUpGroups(items)
    : `
      <section class="catch-up-group" aria-label="${escapeHtml(
        catchUpItemLeadDateFormatter.format(latestDate)
      )}">
        <time class="catch-up-group-date" datetime="${escapeHtml(latestKey)}">${escapeHtml(
          catchUpItemLeadDateFormatter.format(latestDate)
        )}</time>
        <div class="catch-up-group-items">
          <article class="catch-up-item">
            <div class="catch-up-copy">
              <div class="catch-up-title-row">
                <h3><span>No catch-up notes loaded yet</span></h3>
              </div>
              <p class="catch-up-subtitle">Yesterday and today do not have finished or live match notes yet.</p>
            </div>
          </article>
        </div>
      </section>
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
  const todayKey = getDayKey(new Date(), selectedTimeZone);

  if (activeView !== "matches") {
    params.set("view", activeView);
  }

  if (activeView === "matches" && selectedDayKey !== todayKey) {
    params.set("date", selectedDayKey);
  }

  if (activeView === "matches" && matchSearchQuery) {
    params.set("team", matchSearchQuery);
  }

  if (selectedTimeZone !== defaultTimeZone) {
    params.set("tz", selectedTimeZone);
  }

  if (activeView === "standings" && selectedStandingsYear !== CURRENT_STANDINGS_YEAR) {
    params.set("standingsYear", String(selectedStandingsYear));
  }

  if (
    activeView === "standings" &&
    selectedStandingsYear === CURRENT_STANDINGS_YEAR &&
    selectedStandingsMode !== "groups"
  ) {
    params.set("standingsMode", selectedStandingsMode);
  }

  const queryString = params.toString();
  const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl !== currentUrl) {
    window.history.replaceState(null, "", nextUrl);
  }
}

function renderSchedule() {
  const currentTime = Date.now();
  const todayMatches = getMatchesForSelectedDay();
  const liveMatchIds = getLiveMatchIds(currentTime);
  const selectedIsToday = selectedDayKey === getDayKey(new Date(), selectedTimeZone);
  const nextMatchIds = selectedIsToday ? getNextMatchIds(currentTime, liveMatchIds) : new Set();

  updateDateControls();
  updateTeamSearchControls();
  if (isCatchUpOpen) {
    renderCatchUp();
  }

  if (matchSearchQuery) {
    renderSearchResults(currentTime);
    return;
  }

  if (todayMatches.length === 0) {
    renderEmptyState();
    updateUrlState();
    return;
  }

  matchList.replaceChildren(
    ...todayMatches.map((match) =>
      renderMatchRow(match, getMatchState(match, nextMatchIds, currentTime), currentTime)
    )
  );
  const activeMatch = todayMatches.find((match) => match.id === activeMatchId);

  if (activeMatch) {
    renderMatchInfo(activeMatch);
  } else {
    renderMatchInfoPrompt();
  }

  updateTruncatedTeamTooltips(matchList);
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
  updateTruncatedTeamTooltips(viewPanels.matches);
  updateStandingNameTooltips(standingsGrid);
  updateUrlState();
}

function readUrlState(options = {}) {
  const params = new URLSearchParams(window.location.search);
  const requestedTimeZone = params.get("tz");
  const requestedDate = params.get("date");
  const requestedView = params.get("view");
  const requestedTeamSearch = params.get("team") || params.get("q");
  const requestedStandingsYear = params.get("standingsYear") || params.get("year");
  const requestedStandingsMode = params.get("standingsMode") || params.get("standings");
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
  matchSearchQuery = activeView === "matches" ? String(requestedTeamSearch || "").trim() : "";
  isTeamSearchOpen = Boolean(matchSearchQuery);
  showHistoricalSearchMatches = false;
  selectedStandingsYear = getValidStandingsYear(requestedStandingsYear);
  selectedStandingsMode =
    selectedStandingsYear === CURRENT_STANDINGS_YEAR
      ? getValidStandingsMode(requestedStandingsMode)
      : "groups";
}

function renderSourceNote() {
  const compactSourceLabels = {
    "FIFA World Cup 2026 schedule": "FIFA schedule",
    "FIFA World Cup 2026 schedule and results": "FIFA schedule",
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
  const updatedAtText = formatSiteUpdatedAt(siteUpdatedAt);
  const lastUpdated = updatedAtText
    ? ` Last updated ${escapeHtml(updatedAtText)}.`
    : "";

  sourceNote.innerHTML = `Sources: ${officialSourceLinks.join(", ")}. Predictions are unofficial.${lastUpdated} <a href="report.html">Report issue</a>.`;
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
  fixturesUpdatedAt = fixturesData.updatedAt || "";
  liveDataCheckedAt = "";
  history = historyData;
  historicalFixtures = historyData.fixtures || [];
  historicalProjectionCache.clear();
  standingsByGroup = standingsData.groups;
  tournament = tournamentData;
  dataCoverage = fixturesData.coverage || { status: "partial" };
  siteUpdatedAt = getLatestUpdatedAt([
    fixturesData,
    historyData,
    playerProfilesData,
    teamsData,
    standingsData,
    tournamentData
  ]);
}

function applyLiveDataSnapshot(liveData) {
  fixtures = liveData.fixturesData.fixtures;
  fixturesUpdatedAt = liveData.fixturesData.updatedAt || fixturesUpdatedAt;
  liveDataCheckedAt = liveData.syncStatus?.ok ? liveData.syncStatus.checkedAt || "" : "";
  standingsByGroup = liveData.standingsData.groups;
  tournament = liveData.tournamentData;
  dataCoverage = liveData.fixturesData.coverage || { status: "partial" };
  siteUpdatedAt = getLatestUpdatedAt([
    { updatedAt: siteUpdatedAt },
    liveData.fixturesData,
    liveData.standingsData,
    liveData.tournamentData
  ]);
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

standingsModeTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    selectStandingsMode(tab.dataset.standingsMode);
  });
});

standingsGrid.addEventListener("click", (event) => {
  const groupButton = event.target.closest(".third-place-group-button");

  if (!groupButton) {
    return;
  }

  openStandingsGroup(groupButton.dataset.groupId);
});

dayLabel.addEventListener("click", () => {
  setCalendarOpen(!isCalendarOpen);
});

teamSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setTeamSearchOpen(true, { focus: true });
  setMatchSearchQuery(teamSearchInput.value);
});

teamSearchToggle.addEventListener("click", () => {
  setTeamSearchOpen(true, { focus: true });
});

teamSearchForm.addEventListener("focusout", () => {
  window.setTimeout(() => {
    if (!teamSearchForm.contains(document.activeElement) && !matchSearchQuery) {
      setTeamSearchOpen(false);
    }
  }, 0);
});

teamSearchInput.addEventListener("input", () => {
  setTeamSearchOpen(true);
  setMatchSearchQuery(teamSearchInput.value);
});

teamSearchClear.addEventListener("click", () => {
  setMatchSearchQuery("");
  teamSearchInput.focus();
});

matchList.addEventListener("click", (event) => {
  const historyToggle = event.target.closest("[data-search-history-toggle]");

  if (!historyToggle) {
    return;
  }

  showHistoricalSearchMatches = historyToggle.dataset.searchHistoryToggle === "show";
  activeMatchId = "";
  renderSchedule();
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

  const playerLink = event.target.closest(".player-link");
  if (playerLink) {
    const playerHover = playerLink.closest(".player-hover");
    if (playerHover && shouldUseTapPlayerCards()) {
      const isOpen = playerHover.classList.contains("is-card-open");
      const hasExternalLink = playerLink instanceof HTMLAnchorElement && Boolean(playerLink.href);

      if (!isOpen) {
        event.preventDefault();
        openPlayerCard(playerHover);
        return;
      }

      if (!hasExternalLink) {
        event.preventDefault();
      }

      closeActivePlayerCard();
      return;
    }
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
    activePlayerHover &&
    event.target instanceof Node &&
    !activePlayerHover.contains(event.target)
  ) {
    closeActivePlayerCard();
  }

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
  updateTruncatedTeamTooltips();
  updateStandingNameTooltips();
  updateMeasuredLabelTooltips();
  window.requestAnimationFrame(() => {
    updateTruncatedTeamTooltips();
    updateStandingNameTooltips();
    updateMeasuredLabelTooltips();
  });
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

standingsModeTabs.forEach((tab, index) => {
  tab.addEventListener("keydown", (event) => {
    const keyActions = {
      ArrowLeft: () => (index + standingsModeTabs.length - 1) % standingsModeTabs.length,
      ArrowRight: () => (index + 1) % standingsModeTabs.length,
      Home: () => 0,
      End: () => standingsModeTabs.length - 1
    };
    const getNextIndex = keyActions[event.key];

    if (!getNextIndex) {
      return;
    }

    event.preventDefault();
    const nextTab = standingsModeTabs[getNextIndex()];
    nextTab.focus();
    selectStandingsMode(nextTab.dataset.standingsMode);
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
