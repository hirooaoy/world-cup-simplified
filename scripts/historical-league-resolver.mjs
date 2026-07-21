const ENGLISH_DIVISION_LABELS = Object.freeze({
  1: (season) => (season >= 1992 ? "Premier League" : "Football League First Division"),
  2: (season) => season >= 2004
    ? "EFL Championship"
    : season >= 1992
      ? "Football League First Division"
      : "Football League Second Division",
  3: (season, division) => season >= 2004
    ? "EFL League One"
    : season >= 1992
      ? "Football League Second Division"
      : season < 1958 && String(division) === "3a"
        ? "Football League Third Division North"
        : season < 1958 && String(division) === "3b"
          ? "Football League Third Division South"
          : "Football League Third Division",
  4: (season) => season >= 2004
    ? "EFL League Two"
    : season >= 1992
      ? "Football League Third Division"
      : "Football League Fourth Division"
});

const SCOTTISH_DIVISION_LABELS = Object.freeze({
  1: (season) => season >= 2013
    ? "Scottish Premiership"
    : season >= 1998
      ? "Scottish Premier League"
      : "Scottish Football League Premier Division",
  2: (season) => season >= 2013 ? "Scottish Championship" : "Scottish Football League First Division",
  3: (season) => season >= 2013 ? "Scottish League One" : "Scottish Football League Second Division",
  4: (season) => season >= 2013 ? "Scottish League Two" : "Scottish Football League Third Division"
});

export const historicalLeagueSourceRevision = "872c5c354161ace8408f3091b758c6af4cccca94";
export const historicalLeagueSourceId = `engsoccerdata-${historicalLeagueSourceRevision.slice(0, 7)}`;
export const historicalLeagueSources = Object.freeze([
  Object.freeze({
    id: historicalLeagueSourceId,
    label: "engsoccerdata historical club-season results",
    url: `https://github.com/jalapic/engsoccerdata/tree/${historicalLeagueSourceRevision}`,
    type: "cross-check",
    checkedAt: "2026-07-21T22:18:53.075Z",
    note: "Exact club-season membership and competition tier are resolved from this pinned revision; compiled by James P. Curley."
  }),
  Object.freeze({
    id: "historical-league-association-era-rules-2026-07-21",
    label: "Historical league association and era rules",
    url: "scripts/historical-league-resolver.mjs",
    type: "editorial",
    checkedAt: "2026-07-21T22:18:53.075Z",
    note: "Transparent fallback labels the appropriate national or regional competition system when exact club-season membership is unavailable."
  }),
  Object.freeze({
    id: "historical-league-club-era-overrides-2026-07-21",
    label: "Historical club-era league overrides",
    url: "scripts/historical-league-resolver.mjs",
    type: "editorial",
    checkedAt: "2026-07-21T22:18:53.075Z",
    note: "Narrow reviewed overrides cover free agency, indoor football, North American leagues, Australian state leagues, and other exceptional historical cases."
  })
]);

export const historicalLeagueDatasets = Object.freeze([
  { id: "england", teamCountry: "England", path: "data-raw/england.csv", seasonMode: "europe", label: ({ tier, division, season }) => ENGLISH_DIVISION_LABELS[tier]?.(season, division) || "" },
  { id: "france", teamCountry: "France", path: "data-raw/france.csv", seasonMode: "europe", label: ({ season }) => season >= 2002 ? "Ligue 1" : "French Division 1" },
  { id: "germany", teamCountry: "Germany", path: "data-raw/germany.csv", seasonMode: "europe", label: ({ tier }) => tier === 1 ? "Bundesliga" : tier === 2 ? "2. Bundesliga" : "" },
  { id: "italy", teamCountry: "Italy", path: "data-raw/italy.csv", seasonMode: "europe", label: () => "Serie A" },
  { id: "spain", teamCountry: "Spain", path: "data-raw/spain.csv", seasonMode: "europe", label: () => "La Liga" },
  { id: "belgium", teamCountry: "Belgium", path: "data-raw/belgium.csv", seasonMode: "europe", label: ({ season }) => season >= 2016 ? "Belgian Pro League" : "Belgian First Division" },
  { id: "holland", teamCountry: "Netherlands", path: "data-raw/holland.csv", seasonMode: "europe", label: () => "Eredivisie" },
  { id: "portugal", teamCountry: "Portugal", path: "data-raw/portugal.csv", seasonMode: "europe", label: ({ season }) => season >= 1999 ? "Primeira Liga" : "Primeira Divisão" },
  { id: "scotland", teamCountry: "Scotland", path: "data-raw/scotland.csv", seasonMode: "europe", label: ({ tier, season }) => SCOTTISH_DIVISION_LABELS[tier]?.(season) || "" },
  { id: "turkey", teamCountry: "Turkey", path: "data-raw/turkey.csv", seasonMode: "europe", label: () => "Süper Lig" },
  { id: "greece", teamCountry: "Greece", path: "data-raw/greece.csv", seasonMode: "europe", label: ({ season }) => season >= 2006 ? "Super League Greece" : "Alpha Ethniki" },
  { id: "safrica", teamCountry: "South Africa", path: "data-raw/safrica.csv", seasonMode: "europe", label: () => "South African Premiership" },
  { id: "mls", teamCountry: "United States", path: "data-raw/mls.csv", seasonMode: "calendar", label: () => "Major League Soccer" }
]);

const datasetPriorityByAssociation = Object.freeze({
  Belgium: ["belgium"],
  Canada: ["mls"],
  England: ["england"],
  France: ["france"],
  Germany: ["germany"],
  Greece: ["greece"],
  Italy: ["italy"],
  Monaco: ["france"],
  Netherlands: ["holland"],
  Portugal: ["portugal"],
  Scotland: ["scotland"],
  "South Africa": ["safrica"],
  Spain: ["spain"],
  Turkey: ["turkey"],
  "United States": ["mls"],
  Wales: ["england"]
});

const associationLeagueDefaults = Object.freeze({
  Algeria: "Algerian Ligue Professionnelle 1",
  Angola: "Girabola",
  Argentina: "Argentine Primera División",
  Austria: "Austrian Bundesliga",
  Belgium: "Belgian football league system",
  Bolivia: "Bolivian Primera División",
  Bulgaria: "Bulgarian First League",
  Cameroon: "Elite One",
  Canada: "Canadian soccer league system",
  Chile: "Chilean Primera División",
  Colombia: "Categoría Primera A",
  "Costa Rica": "Costa Rican Primera División",
  Croatia: "Croatian Football League",
  Cuba: "Cuban National Football Championship",
  Cyprus: "Cypriot First Division",
  "Czech Republic": "Czech First League",
  Czechoslovakia: "Czechoslovak First League",
  Ecuador: "Ecuadorian Serie A",
  Egypt: "Egyptian Premier League",
  "El Salvador": "Salvadoran Primera División",
  England: "English football league system",
  "Federal Republic of Yugoslavia": "First League of FR Yugoslavia",
  France: "French football league system",
  Germany: "German football league system",
  Guatemala: "Liga Nacional de Guatemala",
  Haiti: "Ligue Haïtienne",
  Honduras: "Liga Nacional de Honduras",
  Hungary: "Nemzeti Bajnokság I",
  Iraq: "Iraqi Premier Division League",
  Italy: "Italian football league system",
  Jamaica: "Jamaica Premier League",
  Kuwait: "Kuwait Premier League",
  Mexico: "Mexican Primera División",
  Monaco: "French football league system",
  Morocco: "Botola Pro",
  Netherlands: "Dutch football league system",
  Nigeria: "Nigeria Professional Football League",
  "North Korea": "DPR Korea Premier Football League",
  "Northern Ireland": "Irish Football League",
  Paraguay: "Paraguayan Primera División",
  Peru: "Peruvian Primera División",
  Qatar: "Qatar Stars League",
  "Réunion": "Réunion Premier League",
  "Saudi Arabia": "Saudi Pro League",
  Serbia: "Serbian SuperLiga",
  Slovakia: "Slovak First Football League",
  "Socialist Federal Republic of Yugoslavia": "Yugoslav First League",
  Spain: "Spanish football league system",
  Sweden: "Allsvenskan",
  "Trinidad and Tobago": "TT Pro League",
  Tunisia: "Tunisian Ligue Professionnelle 1",
  Ukraine: "Ukrainian Premier League",
  "United Arab Emirates": "UAE Pro League",
  Uruguay: "Uruguayan Primera División",
  Wales: "English football league system",
  Zaire: "Linafoot"
});

const brazilianStateLeagueClubs = new Map([
  ["america rj", "Campeonato Carioca"],
  ["bangu", "Campeonato Carioca"],
  ["botafogo", "Campeonato Carioca"],
  ["flamengo", "Campeonato Carioca"],
  ["fluminense", "Campeonato Carioca"],
  ["sao cristovao", "Campeonato Carioca"],
  ["vasco da gama", "Campeonato Carioca"],
  ["corinthians", "Campeonato Paulista"],
  ["palmeiras", "Campeonato Paulista"],
  ["palestra italia", "Campeonato Paulista"],
  ["portuguesa", "Campeonato Paulista"],
  ["santos", "Campeonato Paulista"],
  ["sao paulo", "Campeonato Paulista"],
  ["atletico mineiro", "Campeonato Mineiro"],
  ["cruzeiro", "Campeonato Mineiro"],
  ["gremio", "Campeonato Gaúcho"],
  ["internacional", "Campeonato Gaúcho"],
  ["bahia", "Campeonato Baiano"],
  ["nautico", "Campeonato Pernambucano"],
  ["santa cruz", "Campeonato Pernambucano"],
  ["sport recife", "Campeonato Pernambucano"]
]);

const specialLeagueOverrides = new Map([
  ["1974|Safeway United", "South Australian State League"],
  ["1974|Footscray JUST", "Victorian State League"],
  ["1974|Melbourne Hakoah", "Victorian State League"],
  ["1974|Western Suburbs", "New South Wales State League"],
  ["1974|St George-Budapest", "New South Wales State League"],
  ["1974|Marconi Fairfield", "New South Wales State League"],
  ["1974|Sydney Hakoah", "New South Wales State League"],
  ["1978|Free agent", ""],
  ["1982|Philadelphia Fever", "Major Indoor Soccer League"],
  ["1982|Tulsa Roughnecks", "North American Soccer League"],
  ["1982|Toronto Blizzard", "North American Soccer League"],
  ["1982|Hanimex United", "New Zealand National Soccer League"],
  ["1982|Miramar Rangers", "New Zealand National Soccer League"],
  ["1986|Cleveland Force", "Major Indoor Soccer League"],
  ["1986|Tacoma Stars", "Major Indoor Soccer League"],
  ["1990|Washington Stars", "American Soccer League"],
  ["1990|S.F. Bay Blackhawks", "Western Soccer League"],
  ["1990|Albany Capitals", "American Soccer League"],
  ["1994|US Soccer Federation", "National-team residency program"]
]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...values] = rows;
  return values
    .filter((items) => items.some(Boolean))
    .map((items) => Object.fromEntries(headers.map((header, index) => [header, items[index] || ""])));
}

function normalizeClubName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&amp;/g, "and")
    .replace(/&/g, "and")
    .toLowerCase()
    .replace(/\b(?:a\.f\.c|afc|c\.f|cf|f\.c|fc|s\.c|sc)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function seasonForTournament(year, mode) {
  const tournamentYear = Number(year);
  if (mode === "calendar") {
    return tournamentYear;
  }
  return tournamentYear === 2022 ? 2022 : tournamentYear - 1;
}

function getEraDefault({ association, club, year }) {
  const normalizedClub = normalizeClubName(club);
  if (!association || /^(?:free agent|unattached)$/i.test(club)) {
    return "";
  }

  if (association === "Australia") {
    return year < 1977 ? "Australian state leagues" : year < 2005 ? "National Soccer League" : "A-League Men";
  }
  if (association === "Austria") {
    return year < 1950 ? "Austrian football championship" : year < 1965 ? "Austrian Staatsliga" : year < 1974 ? "Austrian Nationalliga" : "Austrian Bundesliga";
  }
  if (association === "Brazil") {
    if (year < 1971) {
      return brazilianStateLeagueClubs.get(normalizedClub) || "Brazilian state championships";
    }
    return "Campeonato Brasileiro Série A";
  }
  if (association === "China") {
    return year < 2004 ? "Chinese Jia-A League" : "Chinese Super League";
  }
  if (association === "Denmark") {
    return year < 1991 ? "Danish 1st Division" : "Danish Superliga";
  }
  if (association === "Dutch East Indies") {
    return "Perserikatan";
  }
  if (association === "East Germany") {
    return "DDR-Oberliga";
  }
  if (association === "Greece") {
    return year < 2006 ? "Alpha Ethniki" : "Super League Greece";
  }
  if (association === "Germany") {
    return year < 1945 ? "Gauliga system" : year < 1963 ? "German Oberliga system" : "German football league system";
  }
  if (association === "France" && year < 1932) {
    return "French regional leagues";
  }
  if (association === "Iran") {
    return year <= 1978 ? "Takht Jamshid Cup" : year < 2001 ? "Azadegan League" : "Persian Gulf Pro League";
  }
  if (association === "Israel") {
    return year < 1999 ? "Liga Leumit" : "Israeli Premier League";
  }
  if (association === "Japan") {
    return year < 1993 ? "Japan Soccer League" : "J1 League";
  }
  if (association === "Kingdom of Yugoslavia") {
    return "Yugoslav Football Championship";
  }
  if (association === "Mexico") {
    return year < 2012 ? "Mexican Primera División" : "Liga MX";
  }
  if (association === "New Zealand") {
    return year < 2004 ? "New Zealand National Soccer League" : "New Zealand Football Championship";
  }
  if (association === "Netherlands" && year < 1956) {
    return "Netherlands Football League Championship";
  }
  if (association === "Norway") {
    return year < 1991 ? "Norwegian First Division" : "Eliteserien";
  }
  if (association === "Poland") {
    return year < 2008 ? "Polish First League" : "Ekstraklasa";
  }
  if (association === "Portugal") {
    return year < 1999 ? "Primeira Divisão" : "Primeira Liga";
  }
  if (association === "Romania") {
    return year < 2007 ? "Divizia A" : "Liga I";
  }
  if (association === "Russia") {
    return year < 2002 ? "Russian Top Division" : "Russian Premier League";
  }
  if (association === "Scotland") {
    return year < 1998 ? "Scottish Football League Premier Division" : year < 2013 ? "Scottish Premier League" : "Scottish Premiership";
  }
  if (association === "South Africa") {
    return year < 1996 ? "National Soccer League" : "South African Premiership";
  }
  if (association === "South Korea") {
    return year < 1983 ? "Korean Semi-professional Football League" : "K League 1";
  }
  if (association === "Soviet Union") {
    return "Soviet Top League";
  }
  if (association === "Switzerland") {
    return year < 2003 ? "Swiss Nationalliga A" : "Swiss Super League";
  }
  if (association === "Turkey") {
    return year < 1959 ? "Turkish regional leagues" : "Süper Lig";
  }
  if (association === "United States") {
    if (year <= 1950) {
      return ["new york nationals", "fall river marksmen", "new bedford whalers", "new york giants", "brookhattan", "brooklyn hispano"].includes(normalizedClub)
        ? "American Soccer League"
        : "United States regional leagues";
    }
    return year < 1968 ? "United States soccer leagues" : year <= 1984 ? "North American Soccer League" : year < 1996 ? "United States soccer leagues" : "Major League Soccer";
  }
  if (association === "West Germany") {
    return year < 1963 ? "West German Oberliga system" : "Bundesliga";
  }

  return associationLeagueDefaults[association] || `${association} football league system`;
}

function sourceUrlForDataset(dataset) {
  return `https://github.com/jalapic/engsoccerdata/blob/${historicalLeagueSourceRevision}/${dataset.path}`;
}

export async function loadHistoricalLeagueIndex(loadSource) {
  const teamNameRows = parseCsv(await loadSource("data-raw/teamnames.csv"));
  const aliasesByCountry = new Map();
  for (const row of teamNameRows) {
    const country = String(row.country || "").trim();
    const canonical = normalizeClubName(row.name);
    const alias = normalizeClubName(row.name_other || row.name);
    if (!country || !canonical || !alias) {
      continue;
    }
    if (!aliasesByCountry.has(country)) {
      aliasesByCountry.set(country, new Map());
    }
    aliasesByCountry.get(country).set(alias, canonical);
    aliasesByCountry.get(country).set(canonical, canonical);
  }

  const datasets = new Map();
  for (const config of historicalLeagueDatasets) {
    const rows = parseCsv(await loadSource(config.path));
    const aliasMap = aliasesByCountry.get(config.teamCountry) || new Map();
    const records = new Map();
    for (const row of rows) {
      const season = Number(row.Season);
      const tier = Number(row.tier || 1);
      if (!Number.isInteger(season) || !Number.isInteger(tier)) {
        continue;
      }
      if (!records.has(season)) {
        records.set(season, new Map());
      }
      for (const value of [row.home, row.visitor]) {
        const normalized = normalizeClubName(value);
        const canonical = aliasMap.get(normalized) || normalized;
        if (canonical) {
          records.get(season).set(canonical, { tier, division: row.division || "" });
        }
      }
    }
    datasets.set(config.id, { config, aliasMap, records });
  }

  return { datasets };
}

export function resolveHistoricalLeague(index, { association = "", club = "", year } = {}) {
  const tournamentYear = Number(year);
  const specialLeague = specialLeagueOverrides.get(`${tournamentYear}|${club}`);
  if (specialLeague !== undefined) {
    return {
      league: specialLeague,
      association,
      method: specialLeague ? "curated-club-era-override" : "not-applicable",
      source: "historical-league-club-era-overrides-2026-07-21",
      sourceUrl: "https://en.wikipedia.org/wiki/FIFA_World_Cup_squads"
    };
  }

  const preferredIds = datasetPriorityByAssociation[association] || [];
  const datasetIds = [
    ...preferredIds,
    ...historicalLeagueDatasets.map((dataset) => dataset.id).filter((id) => !preferredIds.includes(id))
  ];
  const normalizedInput = normalizeClubName(club);
  for (const datasetId of datasetIds) {
    const dataset = index.datasets.get(datasetId);
    if (!dataset) {
      continue;
    }
    const season = seasonForTournament(tournamentYear, dataset.config.seasonMode);
    const canonical = dataset.aliasMap.get(normalizedInput) || normalizedInput;
    const record = dataset.records.get(season)?.get(canonical);
    if (!record) {
      continue;
    }
    const league = dataset.config.label({ ...record, season });
    if (!league) {
      continue;
    }
    return {
      league,
      association,
      method: "season-membership",
      season,
      tier: record.tier,
      source: historicalLeagueSourceId,
      sourceUrl: sourceUrlForDataset(dataset.config)
    };
  }

  return {
    league: getEraDefault({ association, club, year: tournamentYear }),
    association,
    method: association || club ? "association-era-default" : "not-applicable",
    source: "historical-league-association-era-rules-2026-07-21",
    sourceUrl: "https://en.wikipedia.org/wiki/FIFA_World_Cup_squads"
  };
}
