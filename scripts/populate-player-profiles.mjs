#!/usr/bin/env node
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { isPlayerNameMatch } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const fixturesPath = path.join(dataDir, "fixtures.json");
const playerAvailabilityPath = path.join(dataDir, "player-availability.json");
const teamsPath = path.join(dataDir, "teams.json");
const outputPath = path.join(dataDir, "player-profiles.json");
const userAgent = "WorldCupSimplified/0.1 (local profile enrichment)";
const requestDelayMs = Number(process.env.WIKI_REQUEST_DELAY_MS || 1800);
const scriptArgs = process.argv.slice(2);
const profileEdition = normalizeProfileEdition(
  getArgValue("profile-edition") || getArgValue("edition") || process.env.PROFILE_EDITION || "2026"
);
const playerProfileOverridesDir = path.join(dataDir, "player-profile-overrides", profileEdition);
const includeSquadProfiles = hasArg("include-squad-profiles") || process.env.INCLUDE_SQUAD_PROFILES === "1";
const squadOnlyProfiles = hasArg("squad-only") || process.env.SQUAD_ONLY_PROFILES === "1";
const shouldListPlayersOnly = hasArg("list-players");
const shouldAuditSquadCandidates = hasArg("audit-squad-candidates");
const strictSquadAudit = hasArg("strict-squad-audit") || process.env.STRICT_SQUAD_AUDIT === "1";
const expectedSquadCandidateCount = positiveInteger(
  getArgValue("expected-squad-candidates") || process.env.EXPECTED_SQUAD_CANDIDATES,
  0
);
const replaceExistingProfiles =
  hasArg("replace-existing-profiles") || process.env.REPLACE_EXISTING_PROFILES === "1";
const preserveExistingProfiles = !replaceExistingProfiles;
const squadProfileTeamFilter = new Set(
  getArgValue("squad-teams")
    .split(",")
    .map((teamId) => teamId.trim().toUpperCase())
    .filter(Boolean)
);
const targetedProfileNames = new Set(
  getArgValue("players")
    .split(",")
    .map((name) => normalizeText(name))
    .filter(Boolean)
);
const squadProfileLimit = positiveInteger(getArgValue("squad-profile-limit") || process.env.SQUAD_PROFILE_LIMIT, 0);
const wikipediaSummarySourceId = "wikipedia-page-summaries";
const transfermarktDatasetSourceId = "transfermarkt-market-values-2026-06-23";
const editorialMarketEstimateSourceId = "editorial-player-market-estimates-2026-06-23";
const transfermarktPlayersCsvUrl =
  "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz";
const pageTitleOverrides = new Map([
  ["Ali Olwan", "Ali Olwan"],
  ["Andres Andrade", "Andrés Andrade (footballer, born 1998)"],
  ["Ayoub El Kaabi", "Ayoub El Kaabi"],
  ["Brahim Diaz", "Brahim Díaz"],
  ["Chris Wood", "Chris Wood (footballer, born 1991)"],
  ["Cristian Martinez", "Cristian Martínez (Panamanian footballer)"],
  ["Cristiano Ronaldo", "Cristiano Ronaldo"],
  ["Daichi Kamada", "Daichi Kamada"],
  ["Daniel Munoz", "Daniel Muñoz (footballer)"],
  ["Eric Davis", "Eric Davis (Panamanian footballer)"],
  ["Evann Guessand", "Evann Guessand"],
  ["Hassan Altambakti", "Hassan Al-Tambakti"],
  ["Ismael Diaz", "Ismael Díaz (footballer, born 1997)"],
  ["Jorge Gutierrez", "Jorge Gutiérrez (footballer)"],
  ["Jose Fajardo", "José Fajardo (footballer)"],
  ["Jose Luis Rodriguez", "José Luis Rodríguez (footballer, born 1998)"],
  ["Konrad Laimer", "Konrad Laimer"],
  ["Leandro Trossard", "Leandro Trossard"],
  ["Luis Chavez", "Luis Chávez (footballer)"],
  ["Luis Diaz", "Luis Díaz (footballer, born 1997)"],
  ["Luis Suarez", "Luis Suárez (footballer, born 1997)"],
  ["Martin Odegaard", "Martin Ødegaard"],
  ["Matias Galarza", "Matías Galarza (Paraguayan footballer)"],
  ["Mauricio", "Maurício (footballer, born 2001)"],
  ["Mousa Al-Taamari", "Musa Al-Taamari"],
  ["Mostafa Zico", "Mostafa Ziko"],
  ["Nathaniel Brown", "Nathaniel Brown (footballer)"],
  ["Neymar", "Neymar"],
  ["Nuno Mendes", "Nuno Mendes (footballer, born 2002)"],
  ["Ritsu Doan", "Ritsu Dōan"],
  ["Roberto Lopes", "Roberto Lopes (footballer, born 1992)"],
  ["Tahith Chong", "Tahith Chong"],
  ["Teboho Mokoena", "Teboho Mokoena (soccer, born 1997)"],
  ["Tomas Rodriguez", "Tomás Rodríguez (footballer)"],
  ["Trezeguet", "Trézéguet (Egyptian footballer)"],
  ["Yasin Ayari", "Yasin Ayari"]
]);
let profileFieldOverrides = {
  "Adalberto Carrasquilla": {
    imageUrl: "https://assets.sorare.com/playerpicture/5c665510-6358-445f-8cee-f1580e299661/picture/avatar-0d77a3aa9a930def1134beb8eca6f2e0.png"
  },
  "Ali Jasim": {
    imageUrl: "https://resources.saudi-pro-league.pulselive.com/saudi-pro-league/photo/2025/11/13/287545ca-8c56-428c-81ba-cb4620bb94c8/05c43886-bdda-4649-a88b-b22c4eac68af________.jpg"
  },
  "Ali Olwan": { club: "Al Sailiya SC" },
  "Amine Gouiri": {
    imageUrl: "https://assets.sorare.com/playerpicture/3f3077b9-e071-425a-bf5d-d6f4b5797192/picture/avatar-8e78185244d819fa519a4964d757da5d.png"
  },
  "Andres Andrade": {
    displayName: "Andrés Andrade",
    position: "Centre-back",
    club: "LASK",
    league: "Austrian Bundesliga",
    imageUrl: "https://img.a.transfermarkt.technology/portrait/header/403808-1754322165.png?lm=1",
    marketValueEurMillions: 2
  },
  "Ayoub El Kaabi": { club: "Olympiacos" },
  "Brahim Diaz": { club: "Real Madrid" },
  "Chris Wood": {
    imageUrl: "https://assets.sorare.com/playerpicture/55068de4-3ec7-4111-bc72-04acadd6271b/avatar-chris-wood_new-zealand_football_2025_home_card_edition_name%3Dcolors_holo_base.png"
  },
  "Christian Volpato": {
    imageUrl: "https://romapress.net/wp-content/uploads/2023/07/Volpato-Christian_sassuolo.jpg"
  },
  "Cesar Samudio": {
    imageUrl: "https://media.rpctv.com/p/1850ff2b294f74404ff9d6016dd51c20/adjuntos/314/imagenes/018/404/0018404488/855x0/smart/cesar-samudiojpeg.jpeg"
  },
  "Cristian Martinez": {
    displayName: "Cristian Martínez",
    position: "Defensive midfielder",
    club: "Ironi Kiryat Shmona",
    league: "Israeli Premier League"
  },
  "Edgar Yoel Barcenas": {
    displayName: "Yoel Bárcenas",
    club: "Mazatlán",
    league: "Liga MX"
  },
  "Eric Davis": {
    position: "Left-back",
    club: "Plaza Amador",
    league: "Liga Panameña de Fútbol"
  },
  "Esmir Bajraktarevic": {
    imageUrl: "https://media.reprezentacija.ba/2025/01/esmir-bajraktarevic-psv-1200x800.jpg"
  },
  "Evann Guessand": { club: "Crystal Palace" },
  "Frantzdy Pierrot": {
    imageUrl: "https://www.eaguingamp.com/voy_content/uploads/2020/09/frantzdy-pierrot.png"
  },
  "Homam Ahmed": {
    imageUrl: "https://assets.sorare.com/player/9f4c177b-3447-4eab-8275-03ca450574f0/picture/avatar-1d48558ecaadf12ea98960c37ae7d9d4.png"
  },
  "Houssem Aouar": {
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Houssem%20Aouar%202017%20(cropped).jpg?width=160"
  },
  "Hwang Inbeom": {
    transfermarktPlayerCode: "in-beom-hwang"
  },
  "Ismael Diaz": {
    imageUrl: "https://imagenes.primicias.ec/files/og_thumbnail/uploads/2024/05/25/665295a4a90f8.jpeg"
  },
  "James Rodriguez": { club: "Minnesota United" },
  "Jean-Ricner Bellegarde": {
    imageUrl: "https://assets.sorare.com/playerpicture/563dce7e-7150-4db5-acd0-166ab7f619ee/picture/avatar-dbb7b5dc63acbb97714f8946e94f05de.png"
  },
  "Jorge Gutierrez": {
    displayName: "Jorge Gutiérrez",
    position: "Left-back",
    club: "Deportivo La Guaira",
    league: "Venezuelan Primera División"
  },
  "Jose Fajardo": {
    displayName: "José Fajardo",
    position: "Centre-forward",
    club: "Universidad Católica",
    league: "Ecuadorian Serie A",
    imageUrl: "https://media.rpctv.com/p/a2d83432e1a8a9dfe11633dea0bcf953/adjuntos/314/imagenes/018/082/0018082848/jose-fajardo.jpg",
    marketValueEurMillions: 0.55
  },
  "Jose Luis Rodriguez": {
    displayName: "José Luis Rodríguez",
    position: "Left winger",
    club: "Juárez",
    league: "Liga MX"
  },
  "Daichi Kamada": { club: "Crystal Palace" },
  "Daniel Munoz": {
    position: "Right-back, right wing-back",
    club: "Crystal Palace"
  },
  "Giovanni Reyna": {
    position: "Attacking midfielder, winger",
    club: "Borussia Mönchengladbach"
  },
  "Hassan Altambakti": {
    displayName: "Hassan Al-Tambakti",
    position: "Centre-back",
    club: "Al-Hilal",
    transfermarktPlayerCode: "hassan-tambakti"
  },
  "Kenan Yildiz": {
    position: "Attacking midfielder, winger",
    imageUrl: "https://www.juventus.com/images/image/private/t_portrait_tablet_desktop/f_png/dev/qwsdrvbuik2f2d7q1qcf.png"
  },
  "Kevin Pina": {
    transfermarktPlayerCode: "kevin-lenini"
  },
  "Lamine Yamal": {
    imageUrl: "https://assets.sorare.com/playerpicture/c8dd7fff-b3bc-4e8e-a199-99ddaeacaf0a/picture/avatar-44bdd68923075c1703d3b4241f082bb4.png"
  },
  "Konrad Laimer": { club: "Bayern Munich" },
  "Leandro Bacuna": {
    imageUrl: "https://assets.sorare.com/playerpicture/dff6b137-2d96-485d-9e6b-9a98f34031ab/picture/avatar-09b13e7e02f8289016e9f98ff71d4c7a.png"
  },
  "Leandro Trossard": { club: "Arsenal" },
  "Luis Suarez": {
    imageUrl: "https://assets.sorare.com/playerpicture/f945c83f-4b62-4d89-8a50-4408abefa6b7/picture/avatar-a920b0effd55be927d6b9b0a19d85061.png"
  },
  "Marcus Holmgren Pedersen": {
    transfermarktPlayerCode: "marcus-pedersen"
  },
  "Matias Galarza": {
    displayName: "Matías Galarza",
    position: "Midfielder",
    club: "Atlanta United (on loan from River Plate)",
    transfermarktPlayerCode: "matias-galarza"
  },
  Mauricio: {
    displayName: "Maurício",
    position: "Attacking midfielder",
    club: "Palmeiras"
  },
  "Michael Olise": {
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Michael%20Olise%20bayern%202025.jpg?width=160"
  },
  "Mohamed Hany": {
    transfermarktPlayerCode: "mohamed-hany"
  },
  "Mohamed Manai": {
    imageUrl: "https://img.a.transfermarkt.technology/portrait/header/822935-1740224672.jpg",
    marketValueEurMillions: 0.3
  },
  "Mostafa Zico": {
    displayName: "Mostafa Ziko",
    position: "Left winger",
    club: "Pyramids",
    imageUrl: "https://tmssl.akamaized.net//images/portrait/header/1205357-1730385107.png",
    marketValueEurMillions: 1.5
  },
  "Mohammed Al-Owais": {
    imageUrl: "https://static-files.saudi-pro-league.pulselive.com/players/headshot/p153885.png"
  },
  "Nathan Saliba": {
    transfermarktPlayerCode: "nathan-dylan-saliba"
  },
  "Nathaniel Brown": {
    position: "Left-back",
    club: "Eintracht Frankfurt"
  },
  "Oh Hyeongyu": {
    transfermarktPlayerCode: "hyeon-gyu-oh"
  },
  "Noah Sadiki": {
    imageUrl: "https://assets.sorare.com/playerpicture/a862377c-35dc-42f1-b2bf-9b1d67677f15/picture/avatar-b5c2d5aee9242262172f9b052897cd41.png"
  },
  "Noor Al-Rawabdeh": {
    imageUrl: "https://assets.selangorfc.com/images/players/t_4607862961048618.%20NOOR%20AL-RAWABDEH.PNG"
  },
  "Nuno Mendes": {
    position: "Left-back, wing-back",
    club: "Paris Saint-Germain"
  },
  "Ousmane Dembele": {
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Ousmane%20Demb%C3%A9l%C3%A9%202018%20(cropped).jpg?width=160"
  },
  Pedri: {
    imageUrl: "https://assets.sorare.com/playerpicture/2a201362-28b2-46f3-b775-3b46655a89d6/picture/avatar-77add04ba37e6223eb5f2fff5b5aa2e5.png"
  },
  "Ronwen Williams": {
    imageUrl: "https://sundownsfc.co.za/wp-content/uploads/2025/09/Williams-1.jpg"
  },
  "Ritsu Doan": { club: "Eintracht Frankfurt" },
  "Rustamjon Ashurmatov": {
    transfermarktPlayerCode: "rustam-ashurmatov"
  },
  "Ryan Mendes": {
    imageUrl: "https://assets.sorare.com/playerpicture/19e5f623-11d5-4cb7-b305-610eaf822599/picture/avatar-ed0ebe5f0ea84b8710b99b5ec23451c0.png"
  },
  "Sadio Mane": {
    imageUrl: "https://static-files.saudi-pro-league.pulselive.com/players/headshot/p110979.png"
  },
  "Salem Al-Dawsari": {
    imageUrl: "https://static-files.saudi-pro-league.pulselive.com/players/headshot/p109763.png"
  },
  "Saman Ghoddos": {
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Saman%20Ghoddos%20at%20Iran%20training.jpg?width=160"
  },
  "Sarpreet Singh": {
    imageUrl: "https://assets.sorare.com/playerpicture/5657430a-5e7f-4308-9a11-96b78a856c52/picture/avatar-2ec9453bc6a55005cefb6a3d193422e6.png"
  },
  "Tahith Chong": { club: "Sheffield United" },
  "Teboho Mokoena": {
    position: "Midfielder",
    club: "Mamelodi Sundowns",
    imageUrl: "https://sundownsfc.co.za/wp-content/uploads/2025/09/Mokoena-1.jpg"
  },
  "Tomas Rodriguez": {
    displayName: "Tomás Rodríguez",
    position: "Centre-forward",
    club: "Deportivo Saprissa",
    league: "Costa Rican Primera División"
  },
  Trezeguet: {
    displayName: "Trézéguet",
    position: "Left winger",
    club: "Al Ahly"
  },
  "Tomas Soucek": {
    imageUrl: "https://assets.sorare.com/playerpicture/79be9611-63e4-4e00-8052-ff2d3825e916/picture/avatar-24c525970580228cb644fcbb1c646cc2.png"
  },
  Vozinha: {
    club: "G.D. Chaves",
    imageUrl: "https://i0.statig.com.br/bancodeimagens/2n/0q/4s/2n0q4syuxijl44exjduci4s7k.jpg"
  },
  "Yoane Wissa": {
    imageUrl: "https://assets.sorare.com/playerpicture/daf7c63d-e2c2-4ef3-ada9-8fcc2951029a/picture/avatar-8dbbfde85f2c3e796388dccc9cb63dad.png"
  },
  "Yasin Ayari": { club: "Brighton & Hove Albion" }
};
const teamProfileFieldOverrides = new Map();
const teamPageTitleOverrides = new Map();
const profileRemovalNames = new Set();
const rosterNameOverrides = new Map();

function hasArg(name) {
  const flag = `--${name}`;
  return scriptArgs.includes(flag) || scriptArgs.some((arg) => arg.startsWith(`${flag}=`));
}

function getArgValue(name) {
  const flag = `--${name}=`;
  const arg = scriptArgs.find((item) => item.startsWith(flag));
  return arg ? arg.slice(flag.length) : "";
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function normalizeProfileEdition(value) {
  const raw = String(value || "").trim();
  const year = raw.match(/\b(?:19|20)\d{2}\b/)?.[0];
  return year || raw || "2026";
}
const clubLeagueOverrides = {
  "AC Milan": "Serie A",
  "Ajax Amateurs": "Vierde Divisie",
  "Al Hilal": "Saudi Pro League",
  "Al Sadd": "Qatar Stars League",
  "Al-Ahli": "Saudi Pro League",
  "Al-Arabi": "Qatar Stars League",
  "Al-Duhail": "Qatar Stars League",
  "Al-Hilal": "Saudi Pro League",
  "Al-Ittihad": "Saudi Pro League",
  "Al-Karma": "Iraq Stars League",
  "Al-Najma": "Saudi First Division League",
  "Al-Nassr": "Saudi Pro League",
  "Al-Ula": "Saudi First Division League",
  "Al-Qadsiah": "Saudi Pro League",
  "Al-Shamal": "Qatar Stars League",
  Arsenal: "Premier League",
  "Aston Villa": "Premier League",
  Atalanta: "Serie A",
  "Athletic Bilbao": "La Liga",
  "Atlanta United": "Major League Soccer",
  "Atlético Madrid": "La Liga",
  "Al Ahly": "Egyptian Premier League",
  Barcelona: "La Liga",
  "Bayer Leverkusen": "Bundesliga",
  "Bayern Munich": "Bundesliga",
  Betis: "La Liga",
  Beşiktaş: "Süper Lig",
  "Borussia Dortmund": "Bundesliga",
  "Borussia Mönchengladbach": "Bundesliga",
  Bologna: "Serie A",
  "Bologna Football Club 1909": "Serie A",
  Bournemouth: "Premier League",
  "Brighton & Hove Albion": "Premier League",
  Burnley: "EFL Championship",
  "Berner Sport Club Young Boys": "Swiss Super League",
  Chelsea: "Premier League",
  Como: "Serie A",
  Cobresal: "Chilean Primera División",
  "Crystal Palace": "Premier League",
  "Cultural Leonesa": "Segunda División",
  "Dender EH": "Belgian Pro League",
  "Deportivo La Guaira": "Venezuelan Primera División",
  "Deportivo Saprissa": "Costa Rican Primera División",
  "Dinamo Zagreb": "Croatian Football League",
  "Dynamo Moscow": "Russian Premier League",
  "Eintracht Frankfurt": "Bundesliga",
  Esteghlal: "Persian Gulf Pro League",
  "FC Dallas": "Major League Soccer",
  "FC Seoul": "K League 1",
  "FC Zürich": "Swiss Super League",
  "FC St. Pauli": "Bundesliga",
  Fenerbahçe: "Süper Lig",
  Fluminense: "Campeonato Brasileiro Série A",
  "Fortuna Düsseldorf": "German 3. Liga",
  Genk: "Belgian Pro League",
  "G.D. Chaves": "Liga Portugal 2",
  Guadalajara: "Liga MX",
  "Hamburger SV": "Bundesliga",
  "Hannover 96": "2. Bundesliga",
  "Hamburger Sport Verein": "Bundesliga",
  "Inter Milan": "Serie A",
  "Ironi Kiryat Shmona": "Israeli Premier League",
  Iğdır: "TFF First League",
  "Iğdır FK": "TFF First League",
  Juventus: "Serie A",
  Juárez: "Liga MX",
  "FC Juárez": "Liga MX",
  "Leicester City": "EFL Championship",
  LASK: "Austrian Bundesliga",
  Levante: "La Liga",
  León: "Liga MX",
  "Linzer Athletik-Sport-Klub": "Austrian Bundesliga",
  Liverpool: "Premier League",
  "Los Angeles": "Major League Soccer",
  "Los Angeles FC": "Major League Soccer",
  "Mamelodi Sundowns": "South African Premiership",
  "Manchester City": "Premier League",
  "Manchester United": "Premier League",
  Maribor: "Slovenian PrvaLiga",
  Marathón: "Liga Nacional de Honduras",
  Marseille: "Ligue 1",
  "Maccabi Tel Aviv": "Israeli Premier League",
  "Minnesota United": "Major League Soccer",
  Midtjylland: "Danish Superliga",
  Monaco: "Ligue 1",
  Motherwell: "Scottish Premiership",
  Mazatlán: "Liga MX",
  "Mazatlán FC": "Liga MX",
  Nantes: "Ligue 1",
  Napoli: "Serie A",
  "Newcastle United": "Premier League",
  "Nottingham Forest": "Premier League",
  Olympiacos: "Super League Greece",
  "Nordsjælland": "Danish Superliga",
  Pisa: "Serie B",
  "Pisa Sporting Club": "Serie B",
  PSV: "Eredivisie",
  Pachuca: "Liga MX",
  Palmeiras: "Campeonato Brasileiro Série A",
  "Puerto Cabello": "Venezuelan Primera División",
  "Plaza Amador": "Liga Panameña de Fútbol",
  "CD Plaza Amador": "Liga Panameña de Fútbol",
  "Portland Timbers": "Major League Soccer",
  "Paris Saint-Germain": "Ligue 1",
  Pyramids: "Egyptian Premier League",
  "Pumas UNAM": "Liga MX",
  "RB Leipzig": "Bundesliga",
  "Real Madrid": "La Liga",
  "Real Betis": "La Liga",
  "Real Betis Balompié S.A.D.": "La Liga",
  "Real Sociedad": "La Liga",
  Rennes: "Ligue 1",
  "Rosario Central": "Argentine Primera División",
  "Royal Sporting Club Anderlecht": "Belgian Pro League",
  Santos: "Campeonato Brasileiro Série A",
  Sassuolo: "Serie A",
  "SC Freiburg": "Bundesliga",
  "Schalke 04": "2. Bundesliga",
  Selangor: "Malaysia Super League",
  "Shabab Al Ahli": "UAE Pro League",
  "Shamrock Rovers": "League of Ireland Premier Division",
  "Slovan Liberec": "Czech First League",
  "Sporting CP": "Primeira Liga",
  Strasbourg: "Ligue 1",
  "São Paulo": "Campeonato Brasileiro Série A",
  Sunderland: "Premier League",
  "TSG Hoffenheim": "Bundesliga",
  "Thep Xanh Nam Dinh FC": "V.League 1",
  "Tottenham Hotspur": "Premier League",
  "Turan Tovuz": "Azerbaijan Premier League",
  Utrecht: "Eredivisie",
  "Universidad Católica": "Ecuadorian Serie A",
  "CD Universidad Católica": "Ecuadorian Serie A",
  "Universidad de Concepción": "Primera B de Chile",
  "Universitatea Cluj": "Liga I",
  Villarreal: "La Liga",
  Valencia: "La Liga",
  "Valencia Club de Fútbol S. A. D.": "La Liga",
  Volendam: "Eredivisie",
  "Wellington Phoenix": "A-League Men",
  "West Ham United": "Premier League",
  "Wolverhampton Wanderers": "Premier League",
  Wrexham: "EFL Championship",
  "Wydad AC": "Botola Pro",
  "Young Boys": "Swiss Super League",
  "Çaykur Rizespor": "Süper Lig",
  "İstanbul Başakşehir": "Süper Lig"
};
const knownLeagueNames = [...new Set(Object.values(clubLeagueOverrides).filter(Boolean))].sort(
  (a, b) => b.length - a.length
);

const skillRules = [
  ["goalkeeper|goalkeeping|shot-stopper|saves?|keeper", "Shot-stopping"],
  ["set-piece|set piece|dead-ball|dead ball|restart", "Set pieces"],
  ["aerial|crosses|crossing|second balls|box", "Box presence"],
  ["finisher|finishing|striker|scorer|scored|penalty-box|goal", "Finishing"],
  ["creative|creator|invention|final passes|connects|orchestrator|spark", "Chance creation"],
  ["connect|connector|combine|link|first pass", "Link-up play"],
  ["tempo|control|rhythm|dictate|passing|stabilizer|balance|midfield", "Midfield control"],
  ["direct|behind|space|runner|runs|pace|speed", "Runs in behind"],
  ["channel|drift|mobile|movement|arrives late", "Movement"],
  ["wide|width|winger|stretch", "Wide threat"],
  ["press|pressure|counter-press", "Pressing"],
  ["ball-winning|duels?", "Ball winning"],
  ["centre-back|center-back|defensive|defender|shield|anchor|organizer|back line|screen|compact|security|cover|stopping counters|killing counters", "Defensive control"],
  ["ball-carrier|carries|carry|dribble|surges|outlet|serve early", "Ball carrying"],
  ["long-range|long range|left-footed|left footed", "Long-range shooting"],
  ["target|reference|hold-up|power", "Target play"],
  ["leadership|captain|experienced|veteran|calm", "Leadership"]
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetainedExistingProfiles(profiles = {}) {
  return Object.fromEntries(
    Object.entries(profiles || {})
      .filter(([profileName]) => !profileRemovalNames.has(profileName))
      .map(([profileName, profile]) => [
        profileName,
        {
          ...profile,
          ...(profileFieldOverrides[profileName] || {})
        }
      ])
  );
}

function getTeamProfileKey(playerOrTeamId, playerName) {
  const teamId =
    typeof playerOrTeamId === "string" ? playerOrTeamId : playerOrTeamId?.team?.id || playerOrTeamId?.teamId || "";
  const name = playerName || playerOrTeamId?.name || "";
  return `${String(teamId).toUpperCase()}:${name}`;
}

function getProfileFieldOverrides(player) {
  return {
    ...(profileFieldOverrides[player.name] || {}),
    ...(teamProfileFieldOverrides.get(getTeamProfileKey(player)) || {})
  };
}

function getPageTitleOverride(player) {
  return teamPageTitleOverrides.get(getTeamProfileKey(player)) || pageTitleOverrides.get(player.name);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function loadPlayerProfileOverrideFiles(teamFilter = new Set()) {
  let fileNames = [];
  try {
    fileNames = await readdir(playerProfileOverridesDir);
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const fileName of fileNames.filter((name) => name.endsWith(".json")).sort()) {
    const fileTeamId = path.basename(fileName, ".json").toUpperCase();
    if (teamFilter.size && !teamFilter.has(fileTeamId)) {
      continue;
    }

    const overrideFile = await readJson(path.join(playerProfileOverridesDir, fileName));
    const declaredTeamId = String(overrideFile.teamId || fileTeamId).toUpperCase();
    if (declaredTeamId !== fileTeamId) {
      throw new Error(`${fileName}: teamId ${declaredTeamId} does not match file name ${fileTeamId}`);
    }

    for (const [playerName, override] of Object.entries(overrideFile.profiles || {})) {
      if (!override || typeof override !== "object" || Array.isArray(override)) {
        throw new Error(`${fileName}: profile override for ${playerName} must be an object`);
      }

      const { sourceTitle, ...profileOverride } = override;
      const teamProfileKey = getTeamProfileKey(fileTeamId, playerName);
      teamProfileFieldOverrides.set(teamProfileKey, {
        ...(teamProfileFieldOverrides.get(teamProfileKey) || {}),
        ...profileOverride
      });

      if (sourceTitle) {
        teamPageTitleOverrides.set(teamProfileKey, sourceTitle);
      }
    }

    for (const [rawName, candidates] of Object.entries(overrideFile.rosterNameOverrides || {})) {
      const values = Array.isArray(candidates) ? candidates : [candidates];
      rosterNameOverrides.set(
        `${fileTeamId}:${rawName}`,
        values.filter((candidate) => typeof candidate === "string" && candidate.trim())
      );
    }

    for (const profileName of overrideFile.removeProfiles || []) {
      if (typeof profileName === "string" && profileName.trim()) {
        profileRemovalNames.add(profileName.trim());
      }
    }
  }
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/đ/g, "d")
    .replace(/ı/g, "i")
    .replace(/&[^;\s]+;/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeTransfermarktCode(value) {
  return normalizeText(value).replace(/\s+/g, "-");
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === "\"") {
        if (text[index + 1] === "\"") {
          value += "\"";
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        value += char;
      }
      continue;
    }

    if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function parseCsvObjects(text) {
  const rows = parseCsvRows(text).filter((row) => row.length > 1 || row[0]);
  const headers = rows[0] || [];
  return rows.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] || "";
    });
    return record;
  });
}

async function fetchTransfermarktPlayers() {
  try {
    const response = await fetch(transfermarktPlayersCsvUrl, {
      headers: { "User-Agent": userAgent }
    });

    if (!response.ok) {
      throw new Error(`Transfermarkt dataset returned ${response.status}`);
    }

    const compressed = Buffer.from(await response.arrayBuffer());
    return parseCsvObjects(gunzipSync(compressed).toString("utf8"));
  } catch (error) {
    console.warn(`Transfermarkt enrichment skipped: ${error.message}`);
    return [];
  }
}

function normalizeTransfermarktDate(value) {
  return String(value || "").slice(0, 10);
}

function parseEurMillions(value) {
  const amount = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? Math.round((amount / 1000000) * 10) / 10 : undefined;
}

function buildTransfermarktIndex(records) {
  const byCode = new Map();
  const byName = new Map();

  function add(index, key, record) {
    if (!key) {
      return;
    }

    const list = index.get(key) || [];
    list.push(record);
    index.set(key, list);
  }

  for (const record of records || []) {
    add(byCode, normalizeTransfermarktCode(record.player_code), record);
    add(byName, normalizeText(record.name), record);
    add(byName, normalizeText(`${record.first_name || ""} ${record.last_name || ""}`), record);
  }

  return { byCode, byName, records: records || [] };
}

function scoreTransfermarktRecord(record, player, profileSeed = {}) {
  const wantedTokens = new Set([
    ...getNormalizedNameTokens(player.name),
    ...getNormalizedNameTokens(profileSeed.displayName)
  ]);
  const recordTokens = new Set(getNormalizedNameTokens(record.name));
  const codeTokens = new Set(getNormalizedNameTokens(record.player_code));
  const playerNameKey = normalizeText(player.name);
  const displayNameKey = normalizeText(profileSeed.displayName);
  const recordNameKey = normalizeText(record.name);
  const playerCodeKey = normalizeTransfermarktCode(player.name);
  const displayCodeKey = normalizeTransfermarktCode(profileSeed.displayName);
  const recordCodeKey = normalizeTransfermarktCode(record.player_code);
  let score = 0;

  if (recordNameKey && (recordNameKey === playerNameKey || recordNameKey === displayNameKey)) {
    score += 100;
  }
  if (recordCodeKey && (recordCodeKey === playerCodeKey || recordCodeKey === displayCodeKey)) {
    score += 100;
  }
  for (const token of wantedTokens) {
    if (recordTokens.has(token)) {
      score += 4;
    }
    if (codeTokens.has(token)) {
      score += 3;
    }
  }
  if (
    profileSeed.birthDate &&
    normalizeTransfermarktDate(record.date_of_birth) === profileSeed.birthDate
  ) {
    score += 80;
  }
  const recordClubKey = normalizeText(record.current_club_name);
  const profileClubKey = normalizeText(profileSeed.club);
  if (
    recordClubKey &&
    profileClubKey &&
    (recordClubKey.includes(profileClubKey) || profileClubKey.includes(recordClubKey))
  ) {
    score += 20;
  }

  return score;
}

function getTransfermarktRecord(player, profileSeed, overrides = {}, index = {}) {
  const candidates = [];
  const seen = new Set();

  function addCandidate(record) {
    if (!record?.player_id || seen.has(record.player_id)) {
      return;
    }
    seen.add(record.player_id);
    candidates.push(record);
  }

  const overrideCodes = [
    overrides.transfermarktPlayerCode,
    overrides.transfermarktCode,
    overrides.transfermarktSlug
  ]
    .filter(Boolean)
    .map(normalizeTransfermarktCode);

  for (const code of overrideCodes) {
    for (const record of index.byCode?.get(code) || []) {
      addCandidate(record);
    }
  }

  const nameKeys = [
    player.name,
    profileSeed.displayName,
    overrides.displayName,
    overrides.transfermarktName
  ]
    .filter(Boolean)
    .map(normalizeText);

  for (const key of nameKeys) {
    for (const record of index.byName?.get(key) || []) {
      addCandidate(record);
    }
  }

  const wantedTokens = new Set([
    ...getNormalizedNameTokens(player.name),
    ...getNormalizedNameTokens(profileSeed.displayName)
  ]);
  for (const record of index.records || []) {
    const recordTokens = new Set(getNormalizedNameTokens(record.name));
    const codeTokens = new Set(getNormalizedNameTokens(record.player_code));
    if ([...wantedTokens].some((token) => recordTokens.has(token) || codeTokens.has(token))) {
      addCandidate(record);
    }
  }

  const birthDate = profileSeed.birthDate || overrides.birthDate || "";
  return candidates
    .map((record) => ({
      record,
      score: scoreTransfermarktRecord(record, player, profileSeed),
      dateMatches:
        birthDate && normalizeTransfermarktDate(record.date_of_birth) === birthDate
    }))
    .filter(({ score, dateMatches, record }) => {
      const forced = overrideCodes.includes(normalizeTransfermarktCode(record.player_code));
      return forced || score >= 180 || (dateMatches && score >= 105);
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return Number(b.dateMatches) - Number(a.dateMatches);
    })[0]?.record;
}

function getTransfermarktPosition(record) {
  return record?.sub_position || record?.position || "";
}

function getTransfermarktClub(record) {
  return record?.current_club_name || "";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleCaseRosterToken(value) {
  return String(value || "")
    .toLocaleLowerCase("en-US")
    .replace(/(^|[-'])\p{Letter}/gu, (match) => match.toLocaleUpperCase("en-US"));
}

function titleCaseRosterName(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseRosterToken)
    .join(" ");
}

function isUppercaseRosterToken(value) {
  return /\p{Letter}/u.test(value) && !/\p{Ll}/u.test(value);
}

function getRosterNameCandidates(value) {
  const tokens = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    return [];
  }

  const candidates = new Set([titleCaseRosterName(tokens.join(" "))]);
  let mixedCaseStartIndex = 0;
  while (mixedCaseStartIndex < tokens.length && isUppercaseRosterToken(tokens[mixedCaseStartIndex])) {
    mixedCaseStartIndex += 1;
  }

  if (mixedCaseStartIndex > 0 && mixedCaseStartIndex < tokens.length) {
    candidates.add(titleCaseRosterName([...tokens.slice(mixedCaseStartIndex), ...tokens.slice(0, mixedCaseStartIndex)].join(" ")));
  }

  return [...candidates].filter((candidate) => {
    const normalized = normalizeText(candidate);
    return normalized.length >= 6 && normalized.split(/\s+/).length >= 2;
  });
}

function getRosterNameCandidatesForTeam(value, teamId) {
  const overrideKey = `${teamId}:${value}`;
  if (rosterNameOverrides.has(overrideKey)) {
    return rosterNameOverrides.get(overrideKey);
  }

  return getRosterNameCandidates(value);
}

function isSaintAbbreviationToken(value) {
  return /^st\.?$/i.test(String(value || ""));
}

function hasInitialRosterToken(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .some((token) => !isSaintAbbreviationToken(token) && (/^\p{Letter}\.?$/u.test(token) || /\.$/.test(token)));
}

function getRosterTokenSetKey(value) {
  const tokens = getNormalizedNameTokens(value);
  return [...tokens].sort().join(" ");
}

function getSquadCandidateScore(candidate, rawName, existingProfiles, teamId = "") {
  const tokens = candidate.split(/\s+/).filter(Boolean);
  const rawTokens = String(rawName || "").trim().split(/\s+/).filter(Boolean);
  const rawMixedCaseStartIndex = rawTokens.findIndex((token) => !isUppercaseRosterToken(token));
  let score = 0;

  if (resolveExistingProfileName(candidate, existingProfiles, teamId)) {
    score += 1000;
  }
  if (tokens.length === 2) {
    score += 90;
  } else if (tokens.length === 3) {
    score += 55;
  } else {
    score -= tokens.length * 8;
  }
  if (rawTokens.length >= 2 && !isUppercaseRosterToken(rawTokens[0]) && isUppercaseRosterToken(rawTokens.at(-1))) {
    score += 45;
  }
  if (rawMixedCaseStartIndex > 0) {
    const likelyGivenName = normalizeText(rawTokens[rawMixedCaseStartIndex]);
    if (likelyGivenName && normalizeText(tokens[0]) === likelyGivenName) {
      score += 60;
    }
  }
  if (rawTokens.length === 2 && isUppercaseRosterToken(rawTokens[0]) && !isUppercaseRosterToken(rawTokens[1])) {
    score += 25;
  }
  if (/[^\u0000-\u007f]/.test(candidate)) {
    score += 4;
  }
  if (hasInitialRosterToken(candidate)) {
    score -= 120;
  }

  return score;
}

function isUsableSquadProfileCandidate(candidate, { allowMononym = false } = {}) {
  const tokens = candidate.split(/\s+/).filter(Boolean);
  if (tokens.length < (allowMononym ? 1 : 2) || tokens.length > 4 || hasInitialRosterToken(candidate)) {
    return false;
  }

  return tokens.every((token) => normalizeText(token).length >= 2);
}

function countNameTokens(value) {
  return getNormalizedNameTokens(value).length;
}

function isLikelyLongFormName(shortName, longName) {
  const shortTokenCount = countNameTokens(shortName);
  const longTokenCount = countNameTokens(longName);

  return shortTokenCount >= 2 && shortTokenCount < longTokenCount && isPlayerNameMatch(shortName, longName);
}

function getSelectedSquadProfileCandidates(availabilityByTeam, teamsById, existingProfiles) {
  const selected = [];
  for (const [teamId, includedNames] of availabilityByTeam) {
    if (squadProfileTeamFilter.size && !squadProfileTeamFilter.has(teamId)) {
      continue;
    }

    const team = teamsById.get(teamId);
    if (!team) {
      continue;
    }

    const candidatesByTokenSet = new Map();
    for (const rawName of includedNames) {
      const hasExplicitRosterOverride = rosterNameOverrides.has(`${teamId}:${rawName}`);
      for (const candidate of getRosterNameCandidatesForTeam(rawName, teamId)) {
        if (!isUsableSquadProfileCandidate(candidate, { allowMononym: hasExplicitRosterOverride })) {
          continue;
        }

        const existingProfileName = resolveExistingProfileName(candidate, existingProfiles, teamId);
        const name = existingProfileName || candidate;
        const tokenSetKey = getRosterTokenSetKey(name);
        if (!tokenSetKey) {
          continue;
        }

        const score = getSquadCandidateScore(candidate, rawName, existingProfiles, teamId);
        const existing = candidatesByTokenSet.get(tokenSetKey);
        if (!existing || score > existing.score || (score === existing.score && name.length < existing.name.length)) {
          candidatesByTokenSet.set(tokenSetKey, {
            name,
            score,
            team,
            rawNames: new Set([rawName]),
            candidateNames: new Set([candidate]),
            existingProfileName,
            existingProfileTeamId: existingProfiles[existingProfileName]?.teamId || "",
            explicitRosterOverride: hasExplicitRosterOverride
          });
        } else if (existing?.name === name) {
          existing.rawNames.add(rawName);
          existing.candidateNames.add(candidate);
          existing.explicitRosterOverride ||= hasExplicitRosterOverride;
        }
      }
    }

    const candidateValues = [...candidatesByTokenSet.values()]
      .filter((candidate, index, list) => {
        return !list.some((other, otherIndex) => {
          return otherIndex !== index && isLikelyLongFormName(other.name, candidate.name);
        });
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    selected.push(...candidateValues);
  }

  return selected;
}

function getSquadProfilePlayers(availabilityByTeam, teamsById, existingProfiles) {
  const players = [];
  let newProfileCount = 0;

  for (const candidate of getSelectedSquadProfileCandidates(availabilityByTeam, teamsById, existingProfiles)) {
    const alreadyProfiled = Boolean(existingProfiles[candidate.name]);
    if (!alreadyProfiled) {
      if (squadProfileLimit && newProfileCount >= squadProfileLimit) {
        return players;
      }
      newProfileCount += 1;
    }

    players.push({
      name: candidate.name,
      note: `${candidate.name} is part of ${candidate.team.name}'s current World Cup squad pool.`,
      team: candidate.team
    });
  }

  return players;
}

function textMentionsFullPlayerName(text, name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return false;
  }

  const pattern = new RegExp(
    `(^|[^\\p{Letter}\\p{Number}])${parts.map(escapeRegExp).join("[\\s\\u00a0-]+")}('s)?(?=$|[^\\p{Letter}\\p{Number}])`,
    "iu"
  );
  return pattern.test(text || "");
}

function getNormalizedNameTokens(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(/\s+/).filter(Boolean) : [];
}

function resolveExistingProfileName(name, profiles = {}, teamId = "") {
  const normalizedName = normalizeText(name);
  const nameTokens = getNormalizedNameTokens(name);
  const reversedName = [...nameTokens].reverse().join(" ");

  for (const [profileName, profile] of Object.entries(profiles || {})) {
    if (teamId && profile?.teamId && profile.teamId !== teamId) {
      continue;
    }

    const candidates = getProfileAliases(profileName, profile);
    for (const candidate of candidates) {
      const normalizedCandidate = normalizeText(candidate);
      const candidateTokens = getNormalizedNameTokens(candidate);
      if (
        normalizedCandidate === normalizedName ||
        normalizedCandidate === reversedName ||
        candidateTokens.slice(-nameTokens.length).join(" ") === normalizedName ||
        (isPlayerNameMatch(candidate, name) && hasStrongNameOverlap(candidate, name))
      ) {
        return profileName;
      }
    }
  }

  return "";
}

function getProfileAliases(profileName, profile = {}) {
  return [
    profileName,
    profile?.name,
    profile?.displayName,
    ...(Array.isArray(profile?.aliases) ? profile.aliases : [])
  ]
    .filter((value) => typeof value === "string" && value.trim());
}

function getCompactNameKey(value) {
  return getNormalizedNameTokens(value).filter((token) => token.length > 1).join("");
}

function hasStrongNameOverlap(first, second) {
  const firstCompact = getCompactNameKey(first);
  const secondCompact = getCompactNameKey(second);
  if (firstCompact.length >= 6 && firstCompact === secondCompact) {
    return true;
  }

  const firstTokens = getNormalizedNameTokens(first).filter((token) => token.length >= 4);
  const secondTokens = new Set(getNormalizedNameTokens(second).filter((token) => token.length >= 4));
  return firstTokens.filter((token) => secondTokens.has(token)).length >= 2;
}

function getCrossTeamAliasOwners(name, profiles = {}, teamId = "") {
  const normalizedName = normalizeText(name);
  if (!normalizedName) {
    return [];
  }

  const owners = [];
  for (const [profileName, profile] of Object.entries(profiles || {})) {
    if (!profile?.teamId || profile.teamId === teamId) {
      continue;
    }

    if (getProfileAliases(profileName, profile).some((alias) => normalizeText(alias) === normalizedName)) {
      owners.push(`${profile.teamId}:${profileName}`);
    }
  }

  return owners;
}

function getSquadCandidateAuditRows(availabilityByTeam, teamsById, existingProfiles) {
  return getSelectedSquadProfileCandidates(availabilityByTeam, teamsById, existingProfiles).map((candidate) => {
    const existingProfile = existingProfiles[candidate.name] || null;
    const issues = [];
    const nameTokens = getNormalizedNameTokens(candidate.name);
    const crossTeamAliasOwners = getCrossTeamAliasOwners(candidate.name, existingProfiles, candidate.team.id);

    if (existingProfile?.teamId && existingProfile.teamId !== candidate.team.id) {
      issues.push(`existing profile belongs to ${existingProfile.teamId}`);
    }
    if (crossTeamAliasOwners.length) {
      issues.push(`cross-team alias collision with ${crossTeamAliasOwners.join(", ")}`);
    }
    if (!existingProfile && nameTokens.length < 2 && !candidate.explicitRosterOverride) {
      issues.push("candidate is not a full name");
    }
    if (hasInitialRosterToken(candidate.name)) {
      issues.push("candidate contains initials");
    }

    return {
      teamId: candidate.team.id,
      teamName: candidate.team.name,
      name: candidate.name,
      alreadyProfiled: Boolean(existingProfile),
      rawNames: [...candidate.rawNames].sort(),
      candidateNames: [...candidate.candidateNames].sort(),
      issues
    };
  });
}

function printSquadCandidateAudit(rows, existingProfiles) {
  const rowsByTeam = new Map();
  for (const row of rows) {
    const teamRows = rowsByTeam.get(row.teamId) || [];
    teamRows.push(row);
    rowsByTeam.set(row.teamId, teamRows);
  }

  console.log(
    `Squad candidate audit: ${rows.length} candidates${squadProfileTeamFilter.size ? ` for ${[...squadProfileTeamFilter].join(", ")}` : ""}.`
  );
  console.log("");

  for (const [teamId, teamRows] of [...rowsByTeam.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const existingCount = teamRows.filter((row) => row.alreadyProfiled).length;
    console.log(`${teamId}: ${teamRows.length} candidates (${existingCount} already profiled, ${teamRows.length - existingCount} new)`);
    for (const row of teamRows) {
      const status = row.issues.length ? "BLOCK" : row.alreadyProfiled ? "EXISTING" : "NEW";
      const rawNames = row.rawNames.join(" | ");
      const issueText = row.issues.length ? ` | ${row.issues.join("; ")}` : "";
      console.log(`[${status}] ${row.teamId}: ${row.name} <- ${rawNames}${issueText}`);
    }
    console.log("");
  }

  const blockingRows = rows.filter((row) => row.issues.length);
  console.log(`Blocking issues: ${blockingRows.length}`);
  if (strictSquadAudit && !squadProfileTeamFilter.size) {
    console.error("Strict squad audit requires --squad-teams=TEAM[,TEAM].");
    process.exitCode = 1;
  }
  if (strictSquadAudit && blockingRows.length) {
    console.error("Fix blocking squad candidates before generating profiles.");
    process.exitCode = 1;
  }
  if (strictSquadAudit && expectedSquadCandidateCount) {
    const countMismatches = [...rowsByTeam.entries()].filter(
      ([, teamRows]) => teamRows.length !== expectedSquadCandidateCount
    );
    if (countMismatches.length) {
      for (const [teamId, teamRows] of countMismatches) {
        console.error(
          `${teamId}: strict squad audit expected ${expectedSquadCandidateCount} candidates, found ${teamRows.length}.`
        );
      }
      process.exitCode = 1;
    }
  }

  const existingTeamMismatches = rows.filter((row) => {
    const existingProfile = existingProfiles[row.name];
    return existingProfile?.teamId && existingProfile.teamId !== row.teamId;
  });
  if (existingTeamMismatches.length) {
    console.error(`Existing team mismatches: ${existingTeamMismatches.length}`);
    process.exitCode = 1;
  }
}

function getParagraphMentionPlayers(text, team, availabilityByTeam, existingProfiles) {
  const includedNames = availabilityByTeam.get(team?.id) || [];
  const players = [];
  const seen = new Set();

  for (const rosterName of includedNames) {
    for (const candidate of getRosterNameCandidates(rosterName)) {
      if (!textMentionsFullPlayerName(text, candidate)) {
        continue;
      }

      const name = resolveExistingProfileName(candidate, existingProfiles, team?.id) || candidate;
      const key = normalizeText(name);
      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      players.push({ name, team, note: "" });
    }
  }

  return players;
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function cleanWikiText(value) {
  let text = decodeEntities(value)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref\b[^/>]*\/>/gi, "")
    .replace(/''+/g, "")
    .trim();

  for (let index = 0; index < 8 && /\{\{[^{}]*\}\}/.test(text); index += 1) {
    text = text.replace(/\{\{[^{}]*\}\}/g, (template) => {
      const inner = template.slice(2, -2).trim();
      const parts = inner.split("|").map((part) => part.trim()).filter(Boolean);
      if (!parts.length) {
        return "";
      }

      const name = parts[0].toLowerCase();
      if (
        ["nowrap", "nobold", "small", "ubl", "unbulleted list", "plainlist"].includes(name)
      ) {
        return parts.slice(1).join(", ");
      }
      if (name === "post-nominals" || name === "postnominals") {
        return "";
      }
      if (name === "flagicon" || name === "flagdeco") {
        return "";
      }
      return parts.at(-1) || "";
    });
  }

  text = text
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[\[|\]\]/g, "")
    .replace(/\[[a-z]+:\/\/[^\s\]]+\s+([^\]]+)\]/gi, "$1")
    .replace(/→/g, "")
    .replace(/\s*\(loan\)\s*/gi, "")
    .replace(/([A-Za-z0-9])\(/g, "$1 (")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return text.replace(/^[-–—]\s*/, "");
}

function formatIsoDate(year, month, day) {
  const dateParts = [Number(year), Number(month), Number(day)];
  if (
    dateParts.some((part) => !Number.isInteger(part)) ||
    dateParts[0] < 1900 ||
    dateParts[0] > 2100 ||
    dateParts[1] < 1 ||
    dateParts[1] > 12 ||
    dateParts[2] < 1 ||
    dateParts[2] > 31
  ) {
    return "";
  }

  return [
    String(dateParts[0]).padStart(4, "0"),
    String(dateParts[1]).padStart(2, "0"),
    String(dateParts[2]).padStart(2, "0")
  ].join("-");
}

function parseBirthDateTemplate(value) {
  for (const template of String(value || "").matchAll(/\{\{([^{}]+)\}\}/g)) {
    const parts = template[1].split("|").map((part) => part.trim()).filter(Boolean);
    const templateName = normalizeText(parts[0]);
    if (!templateName.startsWith("birth date")) {
      continue;
    }

    const numericParts = parts
      .slice(1)
      .map((part) => cleanWikiText(part).replace(/^[a-z_ -]+\s*=\s*/i, "").trim())
      .filter((part) => /^\d{1,4}$/.test(part))
      .map(Number);
    const yearIndex = numericParts.findIndex((part) => part >= 1900 && part <= 2100);
    if (yearIndex >= 0 && numericParts.length >= yearIndex + 3) {
      return formatIsoDate(
        numericParts[yearIndex],
        numericParts[yearIndex + 1],
        numericParts[yearIndex + 2]
      );
    }
  }

  return "";
}

function parseBirthDateText(value) {
  const monthLookup = new Map(
    [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december"
    ].map((month, index) => [month, index + 1])
  );
  const text = cleanWikiText(value).replace(/\s*\([^)]*\)\s*/g, " ").trim();
  const dayFirst = text.match(/\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b/);
  if (dayFirst) {
    return formatIsoDate(dayFirst[3], monthLookup.get(dayFirst[2].toLowerCase()), dayFirst[1]);
  }

  const monthFirst = text.match(/\b([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (monthFirst) {
    return formatIsoDate(monthFirst[3], monthLookup.get(monthFirst[1].toLowerCase()), monthFirst[2]);
  }

  return "";
}

function getBirthDate(fields) {
  const rawBirthDate = fields.birth_date || fields.birthdate || fields.dateofbirth || "";
  return parseBirthDateTemplate(rawBirthDate) || parseBirthDateText(rawBirthDate);
}

function getInfoboxFields(wikitext) {
  const start = wikitext.search(/\{\{Infobox (?:football biography|footballer)/i);
  if (start < 0) {
    return {};
  }

  let depth = 0;
  let end = -1;
  for (let index = start; index < wikitext.length - 1; index += 1) {
    const pair = wikitext.slice(index, index + 2);
    if (pair === "{{") {
      depth += 1;
      index += 1;
    } else if (pair === "}}") {
      depth -= 1;
      index += 1;
      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
  }

  const infobox = wikitext.slice(start, end > start ? end : undefined);
  const fields = {};
  let currentKey = "";

  for (const line of infobox.split(/\r?\n/)) {
    const match = line.match(/^\|\s*([^=]+?)\s*=\s*(.*)$/);
    if (match) {
      currentKey = match[1].trim().toLowerCase();
      fields[currentKey] = match[2].trim();
    } else if (currentKey && !line.startsWith("|")) {
      fields[currentKey] = `${fields[currentKey] || ""} ${line.trim()}`.trim();
    }
  }

  return fields;
}

function getOpenEndedClub(fields) {
  const clubs = [];
  for (const [key, value] of Object.entries(fields)) {
    const match = key.match(/^years(\d+)$/);
    if (!match) {
      continue;
    }

    const yearText = cleanWikiText(value);
    const clubText = cleanWikiText(fields[`clubs${match[1]}`] || "");
    if (!clubText) {
      continue;
    }

    if (/[–-]\s*$/.test(yearText) || /\bpresent\b/i.test(yearText)) {
      clubs.push(clubText);
    }
  }

  return clubs.at(-1) || "";
}

function getCommonsImageUrl(fileName) {
  const cleaned = cleanWikiText(fileName);
  if (!cleaned || /^yes$/i.test(cleaned)) {
    return "";
  }

  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(cleaned)}?width=160`;
}

function getTitleFromSourceUrl(sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    const title = decodeURIComponent(url.pathname.split("/wiki/")[1] || "");
    return title.replace(/_/g, " ");
  } catch {
    return "";
  }
}

function getBaseClubName(club) {
  return String(club || "").replace(/\s+\(on loan from .+\)$/i, "").trim();
}

function getLeagueForClub(club) {
  return clubLeagueOverrides[club] || clubLeagueOverrides[getBaseClubName(club)] || "";
}

function getLeagueFromSummary(summary, club) {
  const summaryKey = normalizeText(summary);
  const clubKey = normalizeText(getBaseClubName(club));
  if (!summaryKey || !clubKey) {
    return "";
  }

  const clubMarker = ` club ${clubKey}`;
  const markerIndex = summaryKey.indexOf(clubMarker);
  if (markerIndex < 0) {
    return "";
  }

  const context = summaryKey.slice(Math.max(0, markerIndex - 90), markerIndex);
  return knownLeagueNames.find((league) => context.includes(normalizeText(league))) || "";
}

function getUniformNumberOverride(player, overrides = {}) {
  const value = overrides.uniformNumber ?? existingProfilesData.profiles?.[player.name]?.uniformNumber;
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function getProfileAliasField(overrides = {}, existingProfile = {}) {
  const aliases = [
    ...(Array.isArray(existingProfile.aliases) ? existingProfile.aliases : []),
    ...(Array.isArray(overrides.aliases) ? overrides.aliases : [])
  ]
    .filter((alias) => typeof alias === "string")
    .map((alias) => alias.trim())
    .filter(Boolean);
  const uniqueAliases = [...new Set(aliases)];

  return uniqueAliases.length ? { aliases: uniqueAliases } : {};
}

function getSourcedMarketValueEurMillions(player, overrides = {}, transfermarktRecord = null) {
  const value =
    overrides.marketValueEurMillions ??
    parseEurMillions(overrides.transfermarktMarketValueEur) ??
    parseEurMillions(overrides.transfermarktMarketValueInEur) ??
    parseEurMillions(transfermarktRecord?.market_value_in_eur) ??
    existingProfilesData.profiles?.[player.name]?.marketValueEurMillions;
  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function getAgeFromBirthDate(birthDate, referenceDate = new Date()) {
  const match = String(birthDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  let age = referenceDate.getFullYear() - year;
  const hasHadBirthday =
    referenceDate.getMonth() + 1 > month ||
    (referenceDate.getMonth() + 1 === month && referenceDate.getDate() >= day);
  if (!hasHadBirthday) {
    age -= 1;
  }

  return Number.isInteger(age) && age >= 15 && age < 50 ? age : null;
}

function getLeagueMarketBase(league, club) {
  const key = normalizeText(league || getLeagueForClub(club));
  const topLeagues = [
    "premier league",
    "la liga",
    "bundesliga",
    "serie a",
    "ligue 1"
  ];
  const strongLeagues = [
    "efl championship",
    "2 bundesliga",
    "eredivisie",
    "primeira liga",
    "belgian pro league",
    "super lig",
    "super league greece",
    "major league soccer",
    "liga mx",
    "campeonato brasileiro serie a",
    "saudi pro league",
    "croatian football league"
  ];
  const solidLeagues = [
    "argentine primera division",
    "a league men",
    "botola pro",
    "czech first league",
    "danish superliga",
    "egyptian premier league",
    "k league",
    "liga i",
    "persian gulf pro league",
    "qatar stars league",
    "slovenian prvaliga",
    "swiss super league",
    "uae pro league"
  ];

  if (topLeagues.some((name) => key.includes(name))) {
    return 8;
  }
  if (strongLeagues.some((name) => key.includes(name))) {
    return 3;
  }
  if (solidLeagues.some((name) => key.includes(name))) {
    return 1.2;
  }

  return 0.8;
}

function getAgeMarketFactor(age) {
  if (!Number.isFinite(age)) {
    return 1;
  }
  if (age <= 20) {
    return 1.45;
  }
  if (age <= 23) {
    return 1.25;
  }
  if (age <= 28) {
    return 1.05;
  }
  if (age <= 31) {
    return 0.85;
  }
  return 0.55;
}

function getPositionMarketFactor(position) {
  const key = normalizeText(position);
  if (/striker|forward|winger|attacking midfielder/.test(key)) {
    return 1.15;
  }
  if (/goalkeeper/.test(key)) {
    return 0.75;
  }
  if (/defender|centre back|center back|right back|left back/.test(key)) {
    return 0.9;
  }
  return 1;
}

function getTeamRankMarketFactor(team) {
  const rank = Number(team?.fifaRank);
  if (!Number.isFinite(rank) || rank <= 0) {
    return 1;
  }
  if (rank <= 10) {
    return 1.35;
  }
  if (rank <= 25) {
    return 1.18;
  }
  if (rank <= 50) {
    return 1;
  }
  if (rank <= 75) {
    return 0.85;
  }
  return 0.7;
}

function getInternationalMarketFactor(transfermarktRecord) {
  const caps = Number(transfermarktRecord?.international_caps);
  if (!Number.isFinite(caps) || caps <= 0) {
    return 1;
  }
  if (caps >= 60) {
    return 1.25;
  }
  if (caps >= 25) {
    return 1.15;
  }
  if (caps >= 10) {
    return 1.08;
  }
  return 1.02;
}

function roundEstimatedMarketValue(value) {
  const clamped = Math.max(0.1, Math.min(30, Number(value) || 0));
  if (clamped < 1) {
    return Math.round(clamped * 10) / 10;
  }
  if (clamped < 10) {
    return Math.round(clamped * 2) / 2;
  }
  return Math.round(clamped);
}

function getEstimatedMarketValueEurMillions(player, profileSeed, overrides = {}, transfermarktRecord = null) {
  const overrideValue = overrides.estimatedMarketValueEurMillions;
  const overrideNumber = Number(overrideValue);
  if (Number.isFinite(overrideNumber) && overrideNumber > 0) {
    return overrideNumber;
  }

  const base = getLeagueMarketBase(profileSeed.league, profileSeed.club);
  const age = getAgeFromBirthDate(profileSeed.birthDate);
  const estimate =
    base *
    getAgeMarketFactor(age) *
    getPositionMarketFactor(profileSeed.position) *
    getTeamRankMarketFactor(player.team) *
    getInternationalMarketFactor(transfermarktRecord);

  return roundEstimatedMarketValue(estimate);
}

function getMarketValueFields(player, profileSeed, overrides = {}, transfermarktRecord = null) {
  const marketValueEurMillions = getSourcedMarketValueEurMillions(player, overrides, transfermarktRecord);
  if (marketValueEurMillions) {
    return { marketValueEurMillions };
  }

  const estimatedMarketValueEurMillions = getEstimatedMarketValueEurMillions(
    player,
    profileSeed,
    overrides,
    transfermarktRecord
  );
  return estimatedMarketValueEurMillions ? { estimatedMarketValueEurMillions } : {};
}

function inferSkills(note) {
  const lower = normalizeText(note);
  const skills = [];

  for (const [pattern, label] of skillRules) {
    if (new RegExp(pattern, "i").test(lower) && !skills.includes(label)) {
      skills.push(label);
    }
  }

  return (skills.length ? skills : ["Match impact"]).slice(0, 4);
}

function teamPossessive(team) {
  const name = team?.name || "The team";
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

function isGeneratedScorerNote(note) {
  return /^Scored for .+ in .+ vs .+\.$/.test(String(note || "").trim());
}

function getGeneratedRoleNote(player, position) {
  const possessive = teamPossessive(player.team);
  const lowerPosition = normalizeText(position);

  if (/goalkeeper|keeper/.test(lowerPosition)) {
    return `${possessive} goalkeeping option, useful for shot-stopping, box control, and starting attacks cleanly.`;
  }

  if (/centre back|center back|central defender|defender/.test(lowerPosition)) {
    return `${possessive} defensive option, useful for protecting the box and giving the team a calmer first pass.`;
  }

  if (/right back|left back|wing back|full back/.test(lowerPosition)) {
    return `${possessive} wide defensive option, useful for stretching the flank and recovering into the back line.`;
  }

  if (/attacking midfielder|playmaker/.test(lowerPosition)) {
    return `${possessive} between-lines option, useful for turning possession into final passes and late box runs.`;
  }

  if (/winger|wide midfielder/.test(lowerPosition)) {
    return `${possessive} wide attacking option, useful for stretching the field, running behind, and adding final-third threat.`;
  }

  if (/striker|forward|centre forward|center forward/.test(lowerPosition)) {
    return `${possessive} forward option, useful for box presence, depth, and a direct finishing threat.`;
  }

  if (/midfielder|midfield/.test(lowerPosition)) {
    return `${possessive} midfield option, useful for connecting phases and keeping the team moving through pressure.`;
  }

  return `${possessive} match-plan option, useful for adding another route when the game opens up.`;
}

function getProfileNote(player, existingProfile, position) {
  const note = String(player.note || existingProfile.note || "").trim();
  if (note && !isGeneratedScorerNote(note)) {
    return note;
  }

  return getGeneratedRoleNote(player, position || existingProfile.position || "");
}

function firstSentences(text, maxSentences = 2, maxLength = 260) {
  const compact = String(text || "").replace(/\s+/g, " ").trim();
  if (!compact) {
    return "";
  }

  const dotToken = "<dot>";
  const protectedText = compact
    .replace(/\b(?:[A-Z]\.){2,}/g, (match) => match.replaceAll(".", dotToken))
    .replace(/\b(St|Mt|Mr|Mrs|Ms|Dr|Prof|Sr|Jr|No)\./g, `$1${dotToken}`)
    .replace(/\b(\d+)\.\s+(?=[A-Z])/g, `$1${dotToken} `);
  const sentences = protectedText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replaceAll(dotToken, ".").trim())
    .filter(Boolean);
  let summary = "";
  for (const sentence of sentences.slice(0, maxSentences)) {
    const next = `${summary ? `${summary} ` : ""}${sentence.trim()}`.trim();
    if (next.length > maxLength && summary) {
      break;
    }
    summary = next;
  }

  if (summary.length <= maxLength) {
    return summary;
  }

  const clipped = summary.slice(0, maxLength + 1);
  return `${clipped.slice(0, Math.max(0, clipped.lastIndexOf(" "))).trim()}...`;
}

function getProfileSummary({ extract = "", note = "", existingSummary = "" }) {
  const extractedSummary = firstSentences(cleanWikiText(extract));
  if (extractedSummary) {
    return extractedSummary;
  }

  if (existingSummary) {
    return existingSummary;
  }

  return isGeneratedScorerNote(note) ? "" : firstSentences(note);
}

async function wikiJson(params) {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("origin", "*");

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(url, {
      headers: { "User-Agent": userAgent }
    });
    const text = await response.text();

    if (response.ok && text.trim().startsWith("{")) {
      return JSON.parse(text);
    }

    const retryable =
      response.status === 429 ||
      /too many requests|ratelimit|rate limit|maxlag/i.test(text) ||
      response.status >= 500;

    if (!retryable || attempt === 5) {
      throw new Error(
        text.trim().slice(0, 120) ||
          `Wikipedia API returned ${response.status} for ${url.searchParams.get("action")}`
      );
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const backoffMs = Number.isFinite(retryAfter)
      ? retryAfter * 1000
      : Math.min(60000, 8000 * 2 ** attempt);
    await sleep(backoffMs);
  }

  throw new Error("Wikipedia API request failed after retries");
}

function scoreSearchResult(result, player, team) {
  const title = normalizeText(result.title);
  const snippet = normalizeText(result.snippet);
  const playerName = normalizeText(player.name);
  const teamTerms = [
    normalizeText(team.name),
    normalizeText(team.officialName),
    normalizeText(team.id)
  ].filter(Boolean);

  let score = 0;
  if (title === playerName) {
    score += 30;
  }
  if (title.includes(playerName) || playerName.includes(title)) {
    score += 16;
  }
  if (title.includes("footballer") || title.includes("soccer player")) {
    score += 8;
  }
  if (snippet.includes("footballer") || snippet.includes("soccer player")) {
    score += 8;
  }
  if (snippet.includes("professional")) {
    score += 2;
  }
  if (teamTerms.some((term) => term && snippet.includes(term))) {
    score += 14;
  }
  if (teamTerms.some((term) => term && title.includes(term))) {
    score += 5;
  }
  if (
    title.includes("disambiguation") ||
    title.startsWith("list ") ||
    title.startsWith("career of ") ||
    title.startsWith("international goals ")
  ) {
    score -= 30;
  }

  return score;
}

async function searchPlayerPage(player, team) {
  const titleOverride = getPageTitleOverride(player);
  if (titleOverride) {
    return titleOverride;
  }

  const query = `${player.name} ${team.officialName || team.name} footballer`;
  const data = await wikiJson({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "5"
  });
  const results = data.query?.search || [];
  const scored = results
    .map((result) => ({ ...result, score: scoreSearchResult(result, player, team) }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.title || "";
}

async function fetchPageWikitext(title) {
  const data = await wikiJson({
    action: "query",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    titles: title
  });
  const page = data.query?.pages?.[0];
  return page?.revisions?.[0]?.slots?.main?.content || "";
}

async function fetchPageDataBatch(titles) {
  const data = await wikiJson({
    action: "query",
    prop: "revisions|extracts",
    redirects: "1",
    exintro: "1",
    explaintext: "1",
    rvprop: "content",
    rvslots: "main",
    titles: titles.join("|")
  });
  const pages = new Map();
  const redirectTargets = new Map(
    (data.query?.redirects || []).map((redirect) => [redirect.from, redirect.to])
  );

  for (const page of data.query?.pages || []) {
    pages.set(page.title, {
      extract: page.extract || "",
      wikitext: page.revisions?.[0]?.slots?.main?.content || ""
    });
  }

  for (const [from, to] of redirectTargets) {
    if (pages.has(to)) {
      pages.set(from, pages.get(to));
    }
  }

  return pages;
}

function getUniquePlayers(fixturesData, teamsById, availabilityByTeam, existingProfiles, options = {}) {
  const players = new Map();

  function addPlayer(player, team, note = "") {
    if (!player?.name || !team) {
      return;
    }

    const profileName = resolveExistingProfileName(player.name, existingProfiles, team.id) || player.name;
    const existing = players.get(profileName) || {
      name: profileName,
      note: "",
      team
    };

    existing.team = existing.team || team;
    if (!existing.note && note) {
      existing.note = note;
    }
    players.set(player.name, existing);
  }

  if (options.includeSquadProfiles) {
    for (const player of getSquadProfilePlayers(availabilityByTeam, teamsById, existingProfiles)) {
      addPlayer(player, player.team, player.note || "");
    }
  }

  if (options.squadOnlyProfiles) {
    return [...players.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  for (const fixture of fixturesData.fixtures || []) {
    const homeTeam = teamsById.get(fixture.homeTeamId);
    const awayTeam = teamsById.get(fixture.awayTeamId);

    for (const player of getParagraphMentionPlayers(fixture.keyInformation?.home || "", homeTeam, availabilityByTeam, existingProfiles)) {
      addPlayer(player, player.team, player.note);
    }
    for (const player of getParagraphMentionPlayers(fixture.keyInformation?.away || "", awayTeam, availabilityByTeam, existingProfiles)) {
      addPlayer(player, player.team, player.note);
    }

    for (const side of ["home", "away"]) {
      const teamId = side === "home" ? fixture.homeTeamId : fixture.awayTeamId;
      const team = teamsById.get(teamId);
      for (const player of fixture.keyPlayers?.[side] || []) {
        addPlayer(player, team, player.note || "");
      }
    }

    const goalSources = [
      { goals: fixture.goalsHome || [], scoringTeam: homeTeam, ownGoalTeam: awayTeam },
      { goals: fixture.goalsAway || [], scoringTeam: awayTeam, ownGoalTeam: homeTeam }
    ];
    const fixtureLabel =
      homeTeam && awayTeam ? `${homeTeam.name} vs ${awayTeam.name}` : fixture.id || "a completed match";

    for (const { goals, scoringTeam, ownGoalTeam } of goalSources) {
      for (const goal of goals) {
        const team = goal?.ownGoal ? ownGoalTeam : scoringTeam;
        const note =
          goal?.ownGoal || !team
            ? ""
            : `Scored for ${team.name} in ${fixtureLabel}.`;
        addPlayer(goal, team, note);
      }
    }
  }

  return [...players.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function buildProfile(player, transfermarktIndex = {}) {
  const title = await searchPlayerPage(player, player.team);
  if (!title) {
    const overrides = getProfileFieldOverrides(player);
    const existingProfile = existingProfilesData.profiles?.[player.name] || {};
    const displayName = overrides.displayName || existingProfile.displayName || existingProfile.name || player.name;
    const birthDate = overrides.birthDate || existingProfile.birthDate;
    const initialProfileSeed = {
      displayName,
      birthDate,
      position: overrides.position || existingProfile.position || "",
      club: overrides.club || existingProfile.club || "",
      league: overrides.league || existingProfile.league || ""
    };
    const transfermarktRecord = getTransfermarktRecord(player, initialProfileSeed, overrides, transfermarktIndex);
    const position = initialProfileSeed.position || getTransfermarktPosition(transfermarktRecord);
    const profileClub = initialProfileSeed.club || getTransfermarktClub(transfermarktRecord);
    const profileLeague = initialProfileSeed.league || getLeagueForClub(profileClub);
    const profileSeed = {
      ...initialProfileSeed,
      position,
      club: profileClub,
      league: profileLeague
    };
    const note = overrides.note || getProfileNote(player, existingProfile, position);
    const summary = overrides.summary || getProfileSummary({
      note: player.note,
      existingSummary: existingProfile.summary
    });

    return {
      name: player.name,
      teamId: player.team.id,
      displayName,
      birthDate,
      ...getProfileAliasField(overrides, existingProfile),
      summary,
      ...getMarketValueFields(player, profileSeed, overrides, transfermarktRecord),
      position,
      club: profileClub,
      league: profileLeague,
      uniformNumber: getUniformNumberOverride(player, overrides),
      imageUrl: overrides.imageUrl || transfermarktRecord?.image_url || existingProfile.imageUrl,
      skills: overrides.skills || inferSkills(note),
      note,
      noteZh: overrides.noteZh || existingProfile.noteZh,
      sourceUrl: overrides.sourceUrl || transfermarktRecord?.url || ""
    };
  }

  await sleep(requestDelayMs);
  const wikitext = await fetchPageWikitext(title);
  const fields = getInfoboxFields(wikitext);
  const overrides = getProfileFieldOverrides(player);
  const position = cleanWikiText(fields.position || "");
  const club = cleanWikiText(fields.currentclub || "") || getOpenEndedClub(fields);
  const imageUrl = getCommonsImageUrl(fields.image || "");
  const profileClub = overrides.club || club;
  const birthDate = overrides.birthDate || getBirthDate(fields);
  const existingProfile = existingProfilesData.profiles?.[player.name] || {};
  const summary = overrides.summary || getProfileSummary({
    extract: "",
    note: player.note,
    existingSummary: existingProfile.summary
  });
  const profileLeague =
    overrides.league || getLeagueFromSummary(summary, profileClub) || getLeagueForClub(profileClub);
  const note = overrides.note || getProfileNote(player, existingProfile, overrides.position || position);
  const displayName = overrides.displayName || cleanWikiText(fields.name || "") || title.replace(/_/g, " ");
  const profileSeed = {
    displayName,
    birthDate,
    position: overrides.position || position,
    club: profileClub,
    league: profileLeague
  };
  const transfermarktRecord = getTransfermarktRecord(player, profileSeed, overrides, transfermarktIndex);

  return {
    name: player.name,
    displayName,
    teamId: player.team.id,
    birthDate,
    ...getProfileAliasField(overrides, existingProfile),
    summary,
    ...getMarketValueFields(player, profileSeed, overrides, transfermarktRecord),
    position: overrides.position || position,
    club: profileClub,
    league: profileLeague,
    uniformNumber: getUniformNumberOverride(player, overrides),
    imageUrl: overrides.imageUrl || imageUrl || transfermarktRecord?.image_url,
    skills: overrides.skills || inferSkills(note),
    note,
    noteZh: overrides.noteZh || existingProfile.noteZh,
    sourceUrl: overrides.sourceUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`
  };
}

function buildProfileFromPageData(player, title, pageData = {}, transfermarktIndex = {}) {
  const overrides = getProfileFieldOverrides(player);
  const existingProfile = existingProfilesData.profiles?.[player.name] || {};
  const wikitext = pageData.wikitext || "";

  if (!title || !wikitext) {
    const profileClub = overrides.club || existingProfile.club || "";
    const summary = overrides.summary || getProfileSummary({
      extract: pageData.extract,
      note: player.note || existingProfile.note,
      existingSummary: existingProfile.summary
    });
    const profileLeague =
      overrides.league ||
      getLeagueFromSummary(summary, profileClub) ||
      getLeagueForClub(profileClub) ||
      existingProfile.league;
    const displayName = overrides.displayName || existingProfile.displayName || existingProfile.name || player.name;
    const initialProfileSeed = {
      displayName,
      birthDate: overrides.birthDate || existingProfile.birthDate,
      position: overrides.position || existingProfile.position,
      club: profileClub,
      league: profileLeague
    };
    const transfermarktRecord = getTransfermarktRecord(player, initialProfileSeed, overrides, transfermarktIndex);
    const position = initialProfileSeed.position || getTransfermarktPosition(transfermarktRecord);
    const finalClub = profileClub || getTransfermarktClub(transfermarktRecord);
    const finalLeague = profileLeague || getLeagueForClub(finalClub);
    const profileSeed = {
      ...initialProfileSeed,
      position,
      club: finalClub,
      league: finalLeague
    };
    const note = overrides.note || getProfileNote(player, existingProfile, position);

    return {
      ...existingProfile,
      name: player.name,
      teamId: player.team.id,
      displayName,
      birthDate: profileSeed.birthDate,
      ...getProfileAliasField(overrides, existingProfile),
      summary,
      ...getMarketValueFields(player, profileSeed, overrides, transfermarktRecord),
      position,
      club: finalClub,
      league: finalLeague,
      uniformNumber: getUniformNumberOverride(player, overrides),
      imageUrl: overrides.imageUrl || existingProfile.imageUrl || transfermarktRecord?.image_url,
      skills: overrides.skills || inferSkills(note),
      note,
      noteZh: overrides.noteZh || existingProfile.noteZh,
      sourceUrl: overrides.sourceUrl || (title
        ? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`
        : existingProfile.sourceUrl || transfermarktRecord?.url || "")
    };
  }

  const fields = getInfoboxFields(wikitext);
  const position = cleanWikiText(fields.position || "");
  const club = cleanWikiText(fields.currentclub || "") || getOpenEndedClub(fields);
  const imageUrl = getCommonsImageUrl(fields.image || "");
  const profileClub = overrides.club || club || existingProfile.club || "";
  const birthDate = overrides.birthDate || getBirthDate(fields) || existingProfile.birthDate;
  const summary = overrides.summary || getProfileSummary({
    extract: pageData.extract,
    note: player.note || existingProfile.note,
    existingSummary: existingProfile.summary
  });
  const profileLeague =
    overrides.league ||
    getLeagueFromSummary(summary, profileClub) ||
    getLeagueForClub(profileClub) ||
    existingProfile.league;
  const note = overrides.note || getProfileNote(player, existingProfile, overrides.position || position || existingProfile.position);
  const displayName =
    overrides.displayName ||
    cleanWikiText(fields.name || "") ||
    existingProfile.displayName ||
    title.replace(/_/g, " ");
  const profileSeed = {
    displayName,
    birthDate,
    position: overrides.position || position || existingProfile.position,
    club: profileClub,
    league: profileLeague
  };
  const transfermarktRecord = getTransfermarktRecord(player, profileSeed, overrides, transfermarktIndex);

  return {
    name: player.name,
    displayName,
    teamId: player.team.id,
    birthDate,
    ...getProfileAliasField(overrides, existingProfile),
    summary,
    ...getMarketValueFields(player, profileSeed, overrides, transfermarktRecord),
    position: overrides.position || position || existingProfile.position,
    club: profileClub,
    league: profileLeague,
    uniformNumber: getUniformNumberOverride(player, overrides),
    imageUrl: overrides.imageUrl || imageUrl || existingProfile.imageUrl || transfermarktRecord?.image_url,
    skills: overrides.skills || inferSkills(note),
    note,
    noteZh: overrides.noteZh || existingProfile.noteZh,
    sourceUrl: overrides.sourceUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`
  };
}

const [fixturesData, playerAvailabilityData, teamsData] = await Promise.all([
  readJson(fixturesPath),
  readJson(playerAvailabilityPath).catch(() => ({ teams: {} })),
  readJson(teamsPath)
]);
const existingProfilesData = await readJson(outputPath).catch(() => ({ profiles: {} }));
const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
const playerAvailabilityByTeam = new Map(
  Object.entries(playerAvailabilityData.teams || {}).map(([teamId, availability]) => [
    teamId,
    (availability.included || []).filter((name) => typeof name === "string" && name.trim())
  ])
);

if (squadOnlyProfiles && (!includeSquadProfiles || !squadProfileTeamFilter.size)) {
  console.error("--squad-only requires --include-squad-profiles and --squad-teams=TEAM[,TEAM].");
  process.exit(1);
}

await loadPlayerProfileOverrideFiles(squadProfileTeamFilter);
const existingProfilesForSelection = getRetainedExistingProfiles(existingProfilesData.profiles || {});

if (shouldAuditSquadCandidates) {
  const rows = getSquadCandidateAuditRows(
    playerAvailabilityByTeam,
    teamsById,
    existingProfilesForSelection
  );
  printSquadCandidateAudit(rows, existingProfilesForSelection);
  process.exit(process.exitCode || 0);
}

let players = getUniquePlayers(
  fixturesData,
  teamsById,
  playerAvailabilityByTeam,
  existingProfilesForSelection,
  { includeSquadProfiles, squadOnlyProfiles }
);

function playerMatchesTargetedProfileName(player) {
  if (targetedProfileNames.has(normalizeText(player.name))) {
    return true;
  }

  const aliases = getProfileAliases(player.name, existingProfilesForSelection[player.name] || {});
  return aliases.some((alias) => targetedProfileNames.has(normalizeText(alias)));
}

if (targetedProfileNames.size) {
  players = players.filter(playerMatchesTargetedProfileName);
}

if (targetedProfileNames.size && !players.length) {
  console.error(`No profile candidates matched --players=${getArgValue("players")}.`);
  process.exit(1);
}
const profiles = {};
const warnings = [];
const titleByPlayerName = new Map();
const pageDataByTitle = new Map();

if (shouldListPlayersOnly) {
  const existingCount = players.filter((player) => existingProfilesForSelection?.[player.name]).length;
  const newCount = players.length - existingCount;
  console.log(
    [
      `Profile player list: ${players.length} players (${existingCount} already profiled, ${newCount} new).`,
      includeSquadProfiles
        ? `Squad profile mode: on${squadProfileTeamFilter.size ? ` for ${[...squadProfileTeamFilter].join(", ")}` : ""}.`
        : "Squad profile mode: off.",
      squadOnlyProfiles ? "Fixture/key-player profile mode: off." : "Fixture/key-player profile mode: on.",
      preserveExistingProfiles ? "Preserve existing profiles: on." : "Preserve existing profiles: off.",
      squadProfileLimit ? `New squad profile cap: ${squadProfileLimit}.` : "",
      "",
      ...players.map((player) => `${player.team.id}: ${player.name}`)
    ]
      .filter((line, index, list) => line || list[index + 1])
      .join("\n")
  );
  process.exit(0);
}

const transfermarktRecords = await fetchTransfermarktPlayers();
const transfermarktIndex = buildTransfermarktIndex(transfermarktRecords);

console.log(`Loaded ${transfermarktRecords.length} Transfermarkt player records for enrichment.`);
console.log("");

console.log(`Finding Wikipedia pages for ${players.length} players...`);

for (const [index, player] of players.entries()) {
  try {
    const title =
      getPageTitleOverride(player) ||
      getTitleFromSourceUrl(existingProfilesData.profiles?.[player.name]?.sourceUrl) ||
      (await searchPlayerPage(player, player.team));
    titleByPlayerName.set(player.name, title);
    console.log(`${index + 1}/${players.length} ${player.name} -> ${title || "page missing"}`);
    if (title === getPageTitleOverride(player) || existingProfilesData.profiles?.[player.name]?.sourceUrl) {
      continue;
    }
  } catch (error) {
    warnings.push(`${player.name}: ${error.message}`);
    titleByPlayerName.set(player.name, "");
    console.log(`${index + 1}/${players.length} ${player.name} -> page failed`);
  }

  await sleep(requestDelayMs);
}

const titles = [...new Set([...titleByPlayerName.values()].filter(Boolean))];
console.log("");
console.log(`Fetching ${titles.length} profile pages in batches...`);

for (let index = 0; index < titles.length; index += 20) {
  const batch = titles.slice(index, index + 20);
  try {
    const pages = await fetchPageDataBatch(batch);
    for (const [title, pageData] of pages) {
      pageDataByTitle.set(title, pageData);
    }
    console.log(`${Math.min(index + batch.length, titles.length)}/${titles.length} pages fetched`);
  } catch (error) {
    warnings.push(`Batch starting with "${batch[0]}": ${error.message}`);
    console.log(`${Math.min(index + batch.length, titles.length)}/${titles.length} pages failed`);
  }
  await sleep(requestDelayMs);
}

console.log("");
console.log(`Building player profiles...`);

for (const [index, player] of players.entries()) {
  const title = titleByPlayerName.get(player.name) || "";
  const profile = buildProfileFromPageData(player, title, pageDataByTitle.get(title) || {}, transfermarktIndex);
  profiles[player.name] = profile;
  const hasMarketValue = profile.marketValueEurMillions || profile.estimatedMarketValueEurMillions;
  const missing = ["position", "club", "imageUrl", "summary"].filter((key) => !profile[key]);
  if (!hasMarketValue) {
    missing.push("market value");
  }
  if (missing.length) {
    warnings.push(`${player.name}: missing ${missing.join(", ")}`);
  }
  console.log(`${index + 1}/${players.length} ${player.name} -> ${profile.club || "club missing"}`);
}

const output = {
  updatedAt: new Date().toISOString(),
  sourceIds: [
    ...new Set([
      "wikipedia-football-infobox",
      wikipediaSummarySourceId,
      "wikimedia-commons",
      "fifa-squad-list-2026-06-21",
      transfermarktDatasetSourceId,
      editorialMarketEstimateSourceId,
      ...(existingProfilesData.sourceIds || [])
    ])
  ],
  profiles: preserveExistingProfiles
    ? {
        ...existingProfilesForSelection,
        ...profiles
      }
    : profiles
};

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

console.log("");
console.log(`Wrote ${path.relative(root, outputPath)}`);
console.log(`Warnings: ${warnings.length}`);
for (const warning of warnings) {
  console.log(`- ${warning}`);
}
