#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { isPlayerNameMatch, normalizePlayerName } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const historyPath = path.join(dataDir, "history.json");
const historicalProfilesPath = path.join(dataDir, "historical-player-profiles.json");
const currentProfilesPath = path.join(dataDir, "player-profiles.json");
const wikipediaApiUrl = "https://en.wikipedia.org/w/api.php";
const commonsSourceId = "wikimedia-commons";
const wikipediaSummarySourceId = "wikipedia-page-summaries";
const transfermarktSourceId = "transfermarkt-market-values-2026-06-23";
const transfermarktPlayersCsvUrl =
  "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz";
const inheritedImageSource = "current-player-profile";
const transfermarktImageSource = "transfermarkt-datasets";
const requestDelayMs = Number(process.env.HISTORICAL_IMAGE_REQUEST_DELAY_MS || 100);
const requestTimeoutMs = Number(process.env.HISTORICAL_IMAGE_REQUEST_TIMEOUT_MS || 20000);
const requestMaxAttempts = Number(process.env.HISTORICAL_IMAGE_REQUEST_MAX_ATTEMPTS || 5);
const lookupLimit = Number(process.env.HISTORICAL_IMAGE_LOOKUP_LIMIT || 0);
const batchLookupSize = Math.min(50, Math.max(1, Number(process.env.HISTORICAL_IMAGE_BATCH_SIZE || 50)));
const dryRun = process.argv.includes("--dry-run");
const finalSemiTargetsOnly = process.argv.includes("--final-semi-targets");
const exactTitleOnly = process.argv.includes("--exact-title-only");
const exactTitleBatch = process.argv.includes("--exact-title-batch");
const exactTitleVariants = process.argv.includes("--exact-title-variants");
const wikidataP18Batch = process.argv.includes("--wikidata-p18-batch");
const allWikimediaLookup = process.argv.includes("--all") || process.env.HISTORICAL_IMAGE_CURATED_ONLY === "0";
const curatedOnly = !allWikimediaLookup;
const apiUserAgent = "WorldCupSimplified/0.1 (local historical player image enrichment)";

const countryAliases = new Map([
  ["cote d ivoire", "ivory coast"],
  ["dr congo", "congo dr"],
  ["ir iran", "iran"],
  ["korea republic", "south korea"],
  ["republic of ireland", "ireland"],
  ["usa", "united states"],
  ["u s a", "united states"]
]);

const curatedTitleOverrides = new Map(
  [
    ["Pelé", "Pelé"],
    ["Pele", "Pelé"],
    ["Diego Maradona", "Diego Maradona"],
    ["Garrincha", "Garrincha"],
    ["Just Fontaine", "Just Fontaine"],
    ["Ronaldo", "Ronaldo (Brazilian footballer)"],
    ["Gerd Müller", "Gerd Müller"],
    ["Miroslav Klose", "Miroslav Klose"],
    ["Zinedine Zidane", "Zinedine Zidane"],
    ["Franz Beckenbauer", "Franz Beckenbauer"],
    ["Johan Cruyff", "Johan Cruyff"],
    ["Paolo Rossi", "Paolo Rossi"],
    ["Roberto Baggio", "Roberto Baggio"],
    ["Romário", "Romário"],
    ["Rivaldo", "Rivaldo"],
    ["Ronaldinho", "Ronaldinho"],
    ["Cafu", "Cafu"],
    ["Roberto Carlos", "Roberto Carlos"],
    ["Carlos Alberto", "Carlos Alberto Torres"],
    ["Jairzinho", "Jairzinho"],
    ["Ademir", "Ademir de Menezes"],
    ["Guillermo Stábile", "Guillermo Stábile"],
    ["Grzegorz Lato", "Grzegorz Lato"],
    ["Leônidas", "Leônidas da Silva"],
    ["Leonidas", "Leônidas da Silva"],
    ["Salvatore Schillaci", "Salvatore Schillaci"],
    ["Helmut Rahn", "Helmut Rahn"],
    ["Helmut Haller", "Helmut Haller"],
    ["Oleg Salenko", "Oleg Salenko"],
    ["Careca", "Careca"],
    ["Christian Vieri", "Christian Vieri"],
    ["Johan Neeskens", "Johan Neeskens"],
    ["Jürgen Klinsmann", "Jürgen Klinsmann"],
    ["Jurgen Klinsmann", "Jürgen Klinsmann"],
    ["Teófilo Cubillas", "Teófilo Cubillas"],
    ["Teofilo Cubillas", "Teófilo Cubillas"],
    ["Gabriel Batistuta", "Gabriel Batistuta"],
    ["Karl-Heinz Rummenigge", "Karl-Heinz Rummenigge"],
    ["Rob Rensenbrink", "Rob Rensenbrink"],
    ["Silvio Piola", "Silvio Piola"],
    ["Vavá", "Vavá"],
    ["Vava", "Vavá"],
    ["Emilio Butragueño", "Emilio Butragueño"],
    ["Oscar Míguez", "Óscar Míguez"],
    ["Oscar Miguez", "Óscar Míguez"],
    ["Tomáš Skuhravý", "Tomáš Skuhravý"],
    ["Tomas Skuhravy", "Tomáš Skuhravý"],
    ["Uwe Seeler", "Uwe Seeler"],
    ["Rudi Völler", "Rudi Völler"],
    ["Rudi Voller", "Rudi Völler"],
    ["Bebeto", "Bebeto"],
    ["Dennis Bergkamp", "Dennis Bergkamp"],
    ["Zbigniew Boniek", "Zbigniew Boniek"],
    ["Landon Donovan", "Landon Donovan"],
    ["Johnny Rep", "Johnny Rep"],
    ["Andrzej Szarmach", "Andrzej Szarmach"],
    ["Hans Schäfer", "Hans Schäfer"],
    ["Hans Schafer", "Hans Schäfer"],
    ["Lajos Tichy", "Lajos Tichy"],
    ["Oldřich Nejedlý", "Oldřich Nejedlý"],
    ["Oldrich Nejedly", "Oldřich Nejedlý"],
    ["Rivellino", "Rivellino"],
    ["György Sárosi", "György Sárosi"],
    ["Gyorgy Sarosi", "György Sárosi"],
    ["Max Morlock", "Max Morlock"],
    ["Alessandro Altobelli", "Alessandro Altobelli"],
    ["Marc Wilmots", "Marc Wilmots"],
    ["Fernando Morientes", "Fernando Morientes"],
    ["Jon Dahl Tomasson", "Jon Dahl Tomasson"],
    ["Juan Alberto Schiaffino", "Juan Alberto Schiaffino"],
    ["Valentin Ivanov", "Valentin Ivanov (footballer, born 1934)"],
    ["Gyula Zsengellér", "Gyula Zsengellér"],
    ["Gyula Zsengeller", "Gyula Zsengellér"],
    ["Pedro Cea", "Pedro Cea"],
    ["Peter McParland", "Peter McParland"],
    ["Daniel Bertoni", "Daniel Bertoni"],
    ["Tomas Brolin", "Tomas Brolin"],
    ["Javier Hernández", "Javier Hernández"],
    ["Javier Hernandez", "Javier Hernández"],
    ["Claudio Caniggia", "Claudio Caniggia"],
    ["Ralf Edström", "Ralf Edström"],
    ["Ralf Edstrom", "Ralf Edström"],
    ["Dominique Rocheteau", "Dominique Rocheteau"],
    ["Florin Răducioiu", "Florin Răducioiu"],
    ["Florin Raducioiu", "Florin Răducioiu"],
    ["Igor Chislenko", "Igor Chislenko"],
    ["Paul Breitner", "Paul Breitner"],
    ["Alcides Ghiggia", "Alcides Ghiggia"],
    ["Marcelo Salas", "Marcelo Salas"],
    ["Raymond Kopa", "Raymond Kopa"],
    ["René Houseman", "René Houseman"],
    ["Rene Houseman", "René Houseman"],
    ["Anatoliy Byshovets", "Anatoliy Byshovets"],
    ["Angelo Schiavio", "Angelo Schiavio"],
    ["Estanislau Basora", "Estanislau Basora"],
    ["Flórián Albert", "Flórián Albert"],
    ["Florian Albert", "Flórián Albert"],
    ["Gino Colaussi", "Gino Colaussi"],
    ["Ihor Belanov", "Igor Belanov"],
    ["Igor Belanov", "Igor Belanov"],
    ["Kurt Hamrin", "Kurt Hamrin"],
    ["Leonel Sánchez", "Leonel Sánchez"],
    ["Leonel Sanchez", "Leonel Sánchez"],
    ["Luis Hernández", "Luis Hernández (footballer, born 1968)"],
    ["Luis Hernandez", "Luis Hernández (footballer, born 1968)"],
    ["Nándor Hidegkuti", "Nándor Hidegkuti"],
    ["Nandor Hidegkuti", "Nándor Hidegkuti"],
    ["Ernst Wilimowski", "Ernst Wilimowski"],
    ["Ottmar Walter", "Ottmar Walter"],
    ["Hans Krankl", "Hans Krankl"],
    ["Henrik Larsson", "Henrik Larsson"],
    ["Fernando Hierro", "Fernando Hierro"],
    ["Kennet Andersson", "Kennet Andersson"],
    ["Raúl", "Raúl (footballer)"],
    ["Raul", "Raúl (footballer)"],
    ["Tim Cahill", "Tim Cahill"],
    ["Jan Ceulemans", "Jan Ceulemans"],
    ["Andreas Brehme", "Andreas Brehme"],
    ["Joe Jordan", "Joe Jordan (footballer)"],
    ["Pauleta", "Pauleta"],
    ["Jorge Valdano", "Jorge Valdano"],
    ["André Abegglen", "André Abegglen"],
    ["Andre Abegglen", "André Abegglen"],
    ["Hernán Crespo", "Hernán Crespo"],
    ["Hernan Crespo", "Hernán Crespo"],
    ["Oliver Bierhoff", "Oliver Bierhoff"],
    ["Agne Simonsson", "Agne Simonsson"],
    ["Ferenc Bene", "Ferenc Bene"],
    ["Leopoldo Luque", "Leopoldo Luque"],
    ["Martin Dahlin", "Martin Dahlin"],
    ["Telmo Zarra", "Telmo Zarra"],
    ["Kazimierz Deyna", "Kazimierz Deyna"],
    ["Preben Elkjær", "Preben Elkjær"],
    ["Preben Elkjaer", "Preben Elkjær"],
    ["Robert Ballaman", "Robert Ballaman"],
    ["Bert Patenaude", "Bert Patenaude"],
    ["Míchel", "Míchel (footballer, born 1963)"],
    ["Michel", "Míchel (footballer, born 1963)"],
    ["Brian McBride", "Brian McBride"],
    ["Cuauhtémoc Blanco", "Cuauhtémoc Blanco"],
    ["Cuauhtemoc Blanco", "Cuauhtémoc Blanco"],
    ["Enzo Scifo", "Enzo Scifo"],
    ["Sami Al-Jaber", "Sami Al-Jaber"],
    ["Julio Salinas", "Julio Salinas"],
    ["Jorge Burruchaga", "Jorge Burruchaga"],
    ["Walter Schachner", "Walter Schachner"],
    ["Alfred Körner", "Alfred Körner"],
    ["Alfred Korner", "Alfred Körner"],
    ["Dirceu", "Dirceu"],
    ["Gheorghe Hagi", "Gheorghe Hagi"],
    ["Rafael Márquez", "Rafael Márquez"],
    ["Rafael Marquez", "Rafael Márquez"],
    ["Agustín Delgado", "Agustín Delgado"],
    ["Agustin Delgado", "Agustín Delgado"],
    ["Jung-hwan Ahn", "Ahn Jung-hwan"],
    ["Ahn Jung-hwan", "Ahn Jung-hwan"],
    ["Paulo Wanchope", "Paulo Wanchope"],
    ["Robert Prosinečki", "Robert Prosinečki"],
    ["Robert Prosinecki", "Robert Prosinečki"],
    ["Alain Giresse", "Alain Giresse"],
    ["Daniel Passarella", "Daniel Passarella"],
    ["Gigi Riva", "Gigi Riva"],
    ["Pierre Littbarski", "Pierre Littbarski"],
    ["Robbie Keane", "Robbie Keane"],
    ["Michael Ballack", "Michael Ballack"],
    ["Tostão", "Tostão"],
    ["Tostao", "Tostão"],
    ["Wolfgang Overath", "Wolfgang Overath"],
    ["Falcão", "Paulo Roberto Falcão"],
    ["Falcao", "Paulo Roberto Falcão"],
    ["Luís Fabiano", "Luís Fabiano"],
    ["Luis Fabiano", "Luís Fabiano"],
    ["José Luis Caminero", "José Luis Caminero"],
    ["Jose Luis Caminero", "José Luis Caminero"],
    ["David Platt", "David Platt (footballer)"],
    ["Bernard Genghini", "Bernard Genghini"],
    ["César Sampaio", "César Sampaio"],
    ["Cesar Sampaio", "César Sampaio"],
    ["Maxi Rodríguez", "Maxi Rodríguez"],
    ["Maxi Rodriguez", "Maxi Rodríguez"],
    ["Papa Bouba Diop", "Papa Bouba Diop"],
    ["Didi", "Didi (footballer, born 1928)"],
    ["Dragan Stojković", "Dragan Stojković"],
    ["Dragan Stojkovic", "Dragan Stojković"],
    ["Gianni Rivera", "Gianni Rivera"],
    ["Giuseppe Meazza", "Giuseppe Meazza"],
    ["Fritz Walter", "Fritz Walter"],
    ["İlhan Mansız", "İlhan Mansız"],
    ["Ilhan Mansiz", "İlhan Mansız"],
    ["Jesper Olsen", "Jesper Olsen"],
    ["Roberto Dinamite", "Roberto Dinamite"],
    ["Roger Hunt", "Roger Hunt"],
    ["Roger Piantoni", "Roger Piantoni"],
    ["Zoltán Czibor", "Zoltán Czibor"],
    ["Zoltan Czibor", "Zoltán Czibor"],
    ["Myung-bo Hong", "Hong Myung-bo"],
    ["Hong Myung-bo", "Hong Myung-bo"],
    ["Sun-hong Hwang", "Hwang Sun-hong"],
    ["Hwang Sun-hong", "Hwang Sun-hong"],
    ["Benni McCarthy", "Benni McCarthy"],
    ["Erwin Vandenbergh", "Erwin Vandenbergh"],
    ["Jared Borgetti", "Jared Borgetti"],
    ["Patrick M'Boma", "Patrick M'Boma"],
    ["Patrick Mboma", "Patrick M'Boma"],
    ["Włodzimierz Smolarek", "Włodzimierz Smolarek"],
    ["Wlodzimierz Smolarek", "Włodzimierz Smolarek"],
    ["Klaus Allofs", "Klaus Allofs"],
    ["Roberto Bettega", "Roberto Bettega"],
    ["Yannick Stopyra", "Yannick Stopyra"],
    ["Alessandro Del Piero", "Alessandro Del Piero"],
    ["Arie Haan", "Arie Haan"],
    ["Didier Six", "Didier Six"],
    ["Oleh Blokhin", "Oleg Blokhin"],
    ["Oleg Blokhin", "Oleg Blokhin"],
    ["Andriy Shevchenko", "Andriy Shevchenko"],
    ["Brian Laudrup", "Brian Laudrup"],
    ["Hasan Şaş", "Hasan Şaş"],
    ["Hasan Sas", "Hasan Şaş"],
    ["Joachim Streich", "Joachim Streich"],
    ["Roland Sandberg", "Roland Sandberg"],
    ["Alberto García Aspe", "Alberto García Aspe"],
    ["Alberto Garcia Aspe", "Alberto García Aspe"],
    ["Ariel Ortega", "Ariel Ortega"],
    ["Hristo Bonev", "Hristo Bonev"],
    ["Ilie Dumitrescu", "Ilie Dumitrescu"],
    ["Kenny Dalglish", "Kenny Dalglish"],
    ["Kjetil Rekdal", "Kjetil Rekdal"],
    ["Michael Laudrup", "Michael Laudrup"],
    ["Oliver Neuville", "Oliver Neuville"],
    ["Alan Shearer", "Alan Shearer"],
    ["Carlos Tenorio", "Carlos Tenorio"],
    ["Jean-Pierre Papin", "Jean-Pierre Papin"],
    ["Klaus Fischer", "Klaus Fischer"],
    ["Marco Materazzi", "Marco Materazzi"],
    ["Patrick Kluivert", "Patrick Kluivert"],
    ["Trevor Francis", "Trevor Francis"],
    ["Yordan Letchkov", "Yordan Letchkov"],
    ["Santos Iriarte", "Santos Iriarte"],
    ["Pál Titkos", "Pál Titkos"],
    ["Pal Titkos", "Pál Titkos"],
    ["Jimmy Greaves", "Jimmy Greaves"],
    ["Roberto Boninsegna", "Roberto Boninsegna"],
    ["José Luis Brown", "José Luis Brown"],
    ["Jose Luis Brown", "José Luis Brown"],
    ["Bart McGhee", "Bart McGhee"],
    ["Blagoje Marjanović", "Blagoje Marjanović"],
    ["Blagoje Marjanovic", "Blagoje Marjanović"],
    ["Héctor Castro", "Héctor Castro"],
    ["Hector Castro", "Héctor Castro"],
    ["Jim Brown", "Jim Brown (soccer)"],
    ["Luis Monti", "Luis Monti"],
    ["Pablo Dorado", "Pablo Dorado"],
    ["Peregrino Anselmo", "Peregrino Anselmo"],
    ["Anton Schall", "Anton Schall"],
    ["Gianpiero Combi", "Gianpiero Combi"],
    ["Giuseppe Cavanna", "Giuseppe Cavanna"],
    ["Raimundo Orsi", "Raimundo Orsi"],
    ["Rudolf Noack", "Rudolf Noack"],
    ["Arne Nyberg", "Arne Nyberg"],
    ["Ferenc Sas", "Ferenc Sas"],
    ["Sven Jacobsson", "Sven Jacobsson"],
    ["Ferenc Machos", "Ferenc Machos"],
    ["Javier Ambrois", "Javier Ambrois"],
    ["Juan Hohberg", "Juan Hohberg"],
    ["Arne Selmosson", "Arne Selmosson"],
    ["Gunnar Gren", "Gunnar Gren"],
    ["Jean Vincent", "Jean Vincent"],
    ["Lennart Skoglund", "Lennart Skoglund"],
    ["Mário Zagallo", "Mário Zagallo"],
    ["Mario Zagallo", "Mário Zagallo"],
    ["Nils Liedholm", "Nils Liedholm"],
    ["Jorge Toro", "Jorge Toro"],
    ["Josef Kadraba", "Josef Kadraba"],
    ["Josef Masopust", "Josef Masopust"],
    ["Andrija Anković", "Andrija Anković"],
    ["Dražan Jerković", "Dražan Jerković"],
    ["Josip Skoblar", "Josip Skoblar"],
    ["Zito", "Zito (footballer, born 1932)"],
    ["Martin Peters", "Martin Peters"],
    ["Wolfgang Weber", "Wolfgang Weber"],
    ["Hércules", "Hércules de Miranda"],
    ["Hercules", "Hércules de Miranda"],
    ["Gérson", "Gérson"],
    ["Gerson", "Gérson"],
    ["Karl-Heinz Schnellinger", "Karl-Heinz Schnellinger"],
    ["Tarcisio Burgnich", "Tarcisio Burgnich"],
    ["Hannes Löhr", "Hannes Löhr"],
    ["Luis Cubilla", "Luis Cubilla"],
    ["Marco Tardelli", "Marco Tardelli"],
    ["Marius Trésor", "Marius Trésor"],
    ["Marius Tresor", "Marius Trésor"],
    ["Bruno Bellone", "Bruno Bellone"],
    ["Harald Schumacher", "Harald Schumacher"],
    ["Nery Pumpido", "Nery Pumpido"],
    ["Guido Buchwald", "Guido Buchwald"],
    ["Olaf Thon", "Olaf Thon"],
    ["Franco Baresi", "Franco Baresi"],
    ["Alberigo Evani", "Alberico Evani"],
    ["Krasimir Balakov", "Krasimir Balakov"],
    ["Pierluigi Casiraghi", "Pierluigi Casiraghi"],
    ["Peter Beardsley", "Peter Beardsley"],
    ["Fabien Barthez", "Fabien Barthez"],
    ["Frank de Boer", "Frank de Boer"],
    ["Laurent Blanc", "Laurent Blanc"],
    ["Lilian Thuram", "Lilian Thuram"],
    ["Stéphane Guivarc'h", "Stéphane Guivarc'h"],
    ["Stephane Guivarc'h", "Stéphane Guivarc'h"],
    ["Hakan Şükür", "Hakan Şükür"],
    ["Hakan Sukur", "Hakan Şükür"],
    ["Oliver Kahn", "Oliver Kahn"],
    ["Fabio Grosso", "Fabio Grosso"],
    ["Willy Sagnol", "Willy Sagnol"],
    ["John Heitinga", "John Heitinga"],
    ["Mario Kempes", "Mario Kempes"],
    ["Lothar Matthäus", "Lothar Matthäus"],
    ["Gary Lineker", "Gary Lineker"],
    ["Bobby Charlton", "Bobby Charlton"],
    ["Geoff Hurst", "Geoff Hurst"],
    ["Ferenc Puskás", "Ferenc Puskás"],
    ["Sándor Kocsis", "Sándor Kocsis"],
    ["Sandor Kocsis", "Sándor Kocsis"],
    ["Eusébio", "Eusébio"],
    ["Eusebio", "Eusébio"],
    ["Michel Platini", "Michel Platini"],
    ["Dino Zoff", "Dino Zoff"],
    ["Lev Yashin", "Lev Yashin"],
    ["Gordon Banks", "Gordon Banks"],
    ["Diego Forlán", "Diego Forlán"],
    ["Davor Šuker", "Davor Šuker"],
    ["Hristo Stoichkov", "Hristo Stoichkov"],
    ["Roger Milla", "Roger Milla"],
    ["Zico", "Zico (footballer)"],
    ["Sócrates", "Sócrates"],
    ["Socrates", "Sócrates"],
    ["Paolo Maldini", "Paolo Maldini"],
    ["Fabio Cannavaro", "Fabio Cannavaro"],
    ["Andrea Pirlo", "Andrea Pirlo"],
    ["Gianluigi Buffon", "Gianluigi Buffon"],
    ["Thierry Henry", "Thierry Henry"],
    ["Andrés Iniesta", "Andrés Iniesta"],
    ["Andres Iniesta", "Andrés Iniesta"],
    ["Xavi", "Xavi"],
    ["Carles Puyol", "Carles Puyol"],
    ["David Villa", "David Villa"],
    ["Iker Casillas", "Iker Casillas"],
    ["Thomas Müller", "Thomas Müller"],
    ["Philipp Lahm", "Philipp Lahm"],
    ["Bastian Schweinsteiger", "Bastian Schweinsteiger"],
    ["Mesut Özil", "Mesut Özil"]
  ].map(([name, title]) => [normalizePlayerName(name), title])
);

const curatedCommonsFileOverrides = new Map(
  [
    ["Dražan Jerković", "Drazan Jerkovic.JPG"],
    ["Nico Claesen", "Belgium vs ussr 1986 (cropped).jpg"],
    ["Stéphane Guivarc'h", "S. Guivarc'h EAG.jpg"]
  ].map(([name, fileName]) => [normalizePlayerName(name), fileName])
);

const rejectedCommonsImageFileKeys = [
  "Alexander Wood, Brentford FC footballer, 1928.jpg",
  "Belgium vs ussr 1986.jpg",
  "Jim Brown (1961) (cropped).jpg",
  "Maradona vs belgium world cup 1986.jpg",
  "Rudolf Noack.jpg",
  "Slavia Prague 1930. Champions of the football league.jpg",
  "USA team line up 13 July.jpg",
  "Velez equipo 1995apertura.jpg",
  "Yugoslavia nationalteam 1930.jpg"
].map((fileName) => normalizePlayerName(fileName));
const groupImageIndicatorKeys = [
  "club team",
  "group photograph",
  "group photographs",
  "line up",
  "lineup",
  "squad",
  "team photo",
  "teams of",
  "equipo"
].map((value) => normalizePlayerName(value));
const titleDisambiguatorsByTeamKey = new Map(
  [
    ["Algeria", ["Algerian"]],
    ["Angola", ["Angolan"]],
    ["Argentina", ["Argentine", "Argentinian"]],
    ["Australia", ["Australian soccer player"]],
    ["Austria", ["Austrian"]],
    ["Belgium", ["Belgian"]],
    ["Bolivia", ["Bolivian"]],
    ["Brazil", ["Brazilian"]],
    ["Bulgaria", ["Bulgarian"]],
    ["Cameroon", ["Cameroonian"]],
    ["Canada", ["Canadian soccer player"]],
    ["Chile", ["Chilean"]],
    ["China", ["Chinese"]],
    ["Colombia", ["Colombian"]],
    ["Costa Rica", ["Costa Rican"]],
    ["Croatia", ["Croatian"]],
    ["Cuba", ["Cuban"]],
    ["Czechoslovakia", ["Czechoslovak", "Czech", "Slovak"]],
    ["Côte d'Ivoire", ["Ivorian"]],
    ["Denmark", ["Danish"]],
    ["Dutch East Indies", ["Dutch East Indies", "Indonesian"]],
    ["East Germany", ["East German", "German"]],
    ["Ecuador", ["Ecuadorian"]],
    ["Egypt", ["Egyptian"]],
    ["El Salvador", ["Salvadoran"]],
    ["England", ["English"]],
    ["France", ["French"]],
    ["Germany", ["German"]],
    ["Greece", ["Greek"]],
    ["Haiti", ["Haitian"]],
    ["Honduras", ["Honduran"]],
    ["Hungary", ["Hungarian"]],
    ["Iran", ["Iranian"]],
    ["Iraq", ["Iraqi"]],
    ["Ireland", ["Irish"]],
    ["Israel", ["Israeli"]],
    ["Italy", ["Italian"]],
    ["Jamaica", ["Jamaican"]],
    ["Japan", ["Japanese"]],
    ["Kuwait", ["Kuwaiti"]],
    ["Mexico", ["Mexican"]],
    ["Morocco", ["Moroccan"]],
    ["Netherlands", ["Dutch"]],
    ["New Zealand", ["New Zealand soccer player"]],
    ["Nigeria", ["Nigerian"]],
    ["North Korea", ["North Korean"]],
    ["Northern Ireland", ["Northern Irish"]],
    ["Norway", ["Norwegian"]],
    ["Panama", ["Panamanian"]],
    ["Paraguay", ["Paraguayan"]],
    ["Peru", ["Peruvian"]],
    ["Poland", ["Polish"]],
    ["Portugal", ["Portuguese"]],
    ["Romania", ["Romanian"]],
    ["Russia", ["Russian"]],
    ["Saudi Arabia", ["Saudi Arabian"]],
    ["Scotland", ["Scottish"]],
    ["Senegal", ["Senegalese"]],
    ["Serbia and Montenegro", ["Serbian", "Montenegrin"]],
    ["Slovakia", ["Slovak"]],
    ["Slovenia", ["Slovenian"]],
    ["South Africa", ["South African"]],
    ["South Korea", ["South Korean"]],
    ["Soviet Union", ["Soviet"]],
    ["Spain", ["Spanish"]],
    ["Sweden", ["Swedish"]],
    ["Switzerland", ["Swiss"]],
    ["Togo", ["Togolese"]],
    ["Trinidad and Tobago", ["Trinidad and Tobago", "Trinidadian"]],
    ["Tunisia", ["Tunisian"]],
    ["Turkey", ["Turkish"]],
    ["USA", ["American soccer player"]],
    ["United Arab Emirates", ["Emirati"]],
    ["United States", ["American soccer player"]],
    ["Uruguay", ["Uruguayan"]],
    ["Wales", ["Welsh"]],
    ["West Germany", ["West German", "German"]],
    ["Yugoslavia", ["Yugoslav", "Serbian", "Croatian", "Slovenian", "Bosnian", "Macedonian", "Montenegrin"]],
    ["Zaire", ["Zairian", "Congolese"]]
  ].map(([team, values]) => [normalizePlayerName(team), values])
);

const curatedPriorityByName = new Map([...curatedTitleOverrides.keys()].map((nameKey, index) => [nameKey, index]));
const curatedImageLookupCache = new Map();

function getProfileImageImportance(profile) {
  return (
    Number(profile.goals || 0) * 10000 +
    Number(profile.scorerMatchCount || 0) * 1000 +
    Number(profile.keyMatchCount || 0) * 100 +
    Number(profile.tournamentYear || 0) / 100
  );
}

function compareProfileLookupPriority(a, b) {
  const priorityA = curatedPriorityByName.get(normalizePlayerName(a.name)) ?? Number.MAX_SAFE_INTEGER;
  const priorityB = curatedPriorityByName.get(normalizePlayerName(b.name)) ?? Number.MAX_SAFE_INTEGER;
  if ((curatedOnly || finalSemiTargetsOnly) && priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  if (!curatedOnly || finalSemiTargetsOnly) {
    return (
      getProfileImageImportance(b) - getProfileImageImportance(a) ||
      String(a.name || "").localeCompare(String(b.name || "")) ||
      Number(b.tournamentYear || 0) - Number(a.tournamentYear || 0)
    );
  }

  return String(a.name || "").localeCompare(String(b.name || ""));
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (quoted) {
      if (char === "\"" && nextChar === "\"") {
        value += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
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

async function fetchTransfermarktPlayers() {
  const response = await fetchWithTimeout(transfermarktPlayersCsvUrl, {
    headers: {
      "User-Agent": apiUserAgent
    }
  });
  if (!response.ok) {
    throw new Error(`Transfermarkt dataset request failed: ${response.status} ${response.statusText}`);
  }

  const text = gunzipSync(Buffer.from(await response.arrayBuffer())).toString("utf8");
  const [headerRow, ...rows] = parseCsv(text);
  return rows
    .filter((row) => row.length === headerRow.length)
    .map((row) => Object.fromEntries(headerRow.map((key, index) => [key, row[index]])));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = requestTimeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeCountry(value) {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return countryAliases.get(normalized) || normalized;
}

function normalizeTransfermarktDate(value) {
  return String(value || "").slice(0, 10);
}

function parseEurMillions(value) {
  const number = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(number) && number > 0 ? number / 1_000_000 : null;
}

function getBirthYear(birthDate) {
  const match = String(birthDate || "").match(/^(\d{4})-\d{2}-\d{2}$/);
  return match ? Number(match[1]) : null;
}

function isBirthDatePlausibleForProfile(profile, birthDate) {
  const birthYear = getBirthYear(birthDate);
  const years = (profile.tournamentYears || []).map(Number).filter(Number.isFinite);
  if (!birthYear || !years.length) {
    return false;
  }

  return years.some((year) => {
    const age = year - birthYear;
    return age >= 15 && age <= 45;
  });
}

function addTransfermarktCandidate(index, key, record) {
  if (!key) {
    return;
  }

  const bucket = index.get(key) || [];
  if (bucket.some((candidate) => candidate.player_id === record.player_id)) {
    return;
  }
  bucket.push(record);
  index.set(key, bucket);
}

function buildTransfermarktIndex(records) {
  const index = new Map();
  for (const record of records) {
    for (const value of [
      record.name,
      [record.first_name, record.last_name].filter(Boolean).join(" ")
    ]) {
      addTransfermarktCandidate(index, normalizePlayerName(value), record);
    }
  }

  return index;
}

function hasTransfermarktTeamClue(profile, record) {
  const recordCountries = [
    normalizeCountry(record.country_of_citizenship),
    normalizeCountry(record.country_of_birth)
  ].filter(Boolean);
  if (!recordCountries.length) {
    return false;
  }

  return (profile.teams || []).some((team) => {
    const teamKey = normalizeCountry(team);
    return recordCountries.includes(teamKey);
  });
}

function pickTransfermarktRecord(profile, transfermarktIndex) {
  const candidates = transfermarktIndex.get(normalizePlayerName(profile.name)) || [];
  if (!candidates.length) {
    return null;
  }

  const teamMatches = candidates.filter((record) => hasTransfermarktTeamClue(profile, record));
  if (teamMatches.length === 1) {
    return teamMatches[0];
  }

  if (!teamMatches.length && candidates.length === 1) {
    return candidates[0];
  }

  return null;
}

function getTransfermarktProfileFields(profile, transfermarktIndex) {
  const record = pickTransfermarktRecord(profile, transfermarktIndex);
  if (!record) {
    return null;
  }

  const birthDate = normalizeTransfermarktDate(record.date_of_birth);
  if (!isBirthDatePlausibleForProfile(profile, birthDate)) {
    return null;
  }

  const peakValue = parseEurMillions(record.highest_market_value_in_eur);

  return {
    birthDate: /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? birthDate : undefined,
    imageUrl: isUsableTransfermarktImageUrl(record.image_url) ? record.image_url : undefined,
    imageSource: transfermarktImageSource,
    imageSourceUrl: record.url || undefined,
    peakMarketValueEurMillions: peakValue || undefined,
    peakMarketValueSource: transfermarktSourceId,
    peakMarketValueSourceUrl: record.url || undefined
  };
}

function isUsableTransfermarktImageUrl(value) {
  const imageUrl = String(value || "").trim();
  return Boolean(imageUrl) && !/\/default\.jpg(?:$|\?)/i.test(imageUrl);
}

function historicalProfileVersionKey(name, teamName, tournamentYear) {
  const nameKey = normalizePlayerName(name);
  const teamKey = normalizePlayerName(teamName);
  const year = Number(tournamentYear);
  return nameKey && teamKey && Number.isInteger(year) && year > 0 ? `${year}:${teamKey}:${nameKey}` : "";
}

function addHistoricalProfileVersion(versions, teams, profile) {
  if (!profile) {
    return;
  }

  const teamNames = [
    profile.teamName,
    ...(Array.isArray(profile.teams) ? profile.teams : [])
  ].filter((teamName) => typeof teamName === "string" && teamName.trim());
  const years = [
    profile.tournamentYear,
    ...(Array.isArray(profile.tournamentYears) ? profile.tournamentYears : [])
  ]
    .map(Number)
    .filter((year) => Number.isInteger(year) && year > 0);
  const names = [
    profile.name,
    profile.displayName,
    ...(Array.isArray(profile.aliases) ? profile.aliases : [])
  ].filter((name) => typeof name === "string" && name.trim());

  for (const teamName of teamNames) {
    for (const year of years) {
      const teamYearKey = `${year}:${normalizePlayerName(teamName)}`;
      const teamProfiles = teams.get(teamYearKey) || [];
      teamProfiles.push(profile);
      teams.set(teamYearKey, teamProfiles);

      for (const name of names) {
        const versionKey = historicalProfileVersionKey(name, teamName, year);
        if (versionKey && !versions.has(versionKey)) {
          versions.set(versionKey, profile);
        }
      }
    }
  }
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasMentionedName(text, name) {
  if (!text || !name) {
    return false;
  }

  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(name)}([^\\p{L}\\p{N}]|$)`, "u").test(text);
}

function isFinalOrSemiFinalFixture(fixture) {
  return fixture?.round === "Final" || fixture?.round === "Semi-finals";
}

function collectFinalSemiTargetProfileKeys(historyData, profiles) {
  const profilesByVersion = new Map();
  const profilesByTeamYear = new Map();

  for (const profile of Object.values(profiles || {})) {
    addHistoricalProfileVersion(profilesByVersion, profilesByTeamYear, profile);
  }

  const targetKeys = new Set();

  function addTarget(fixture, side, name) {
    const teamName = side === "home" ? fixture.homeSlot : fixture.awaySlot;
    const versionKey = historicalProfileVersionKey(name, teamName, fixture.tournamentYear);
    const profile = profilesByVersion.get(versionKey);
    if (profile?.profileKey) {
      targetKeys.add(profile.profileKey);
    }
  }

  for (const fixture of historyData?.fixtures || []) {
    if (!isFinalOrSemiFinalFixture(fixture)) {
      continue;
    }

    for (const [side, goals] of [
      ["home", fixture.goalsHome || []],
      ["away", fixture.goalsAway || []]
    ]) {
      for (const goal of goals) {
        const playerSide = goal?.ownGoal ? (side === "home" ? "away" : "home") : side;
        addTarget(fixture, playerSide, goal?.name);
      }
    }

    for (const side of ["home", "away"]) {
      for (const player of fixture.keyPlayers?.[side] || []) {
        addTarget(fixture, side, player?.name);
      }

      const teamName = side === "home" ? fixture.homeSlot : fixture.awaySlot;
      const teamYearKey = `${Number(fixture.tournamentYear)}:${normalizePlayerName(teamName)}`;
      const text = fixture.keyInformation?.[side] || "";
      for (const profile of profilesByTeamYear.get(teamYearKey) || []) {
        if (hasMentionedName(text, profile.name) || hasMentionedName(text, profile.displayName)) {
          targetKeys.add(profile.profileKey);
        }
      }
    }
  }

  return targetKeys;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCommonsImageUrl(fileName) {
  const cleaned = String(fileName || "").replace(/^File:/i, "").trim();
  if (!cleaned) {
    return "";
  }

  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(cleaned)}?width=160`;
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function getTitleCore(title) {
  return String(title || "").replace(/\s*\([^)]*\)\s*$/g, "").trim();
}

function hasJuniorMismatch(profileName, title) {
  const profileKey = normalizePlayerName(profileName);
  const titleKey = normalizePlayerName(title);
  return /\b(jr|junior)\b/.test(titleKey) && !/\b(jr|junior)\b/.test(profileKey);
}

function isFootballerExtract(extract) {
  if (/\bamerican football\b/i.test(extract || "") && !/\b(association football|soccer)\b/i.test(extract || "")) {
    return false;
  }

  return /\b(footballer|football player|football forward|football striker|football winger|football midfielder|football defender|football central defender|football goalkeeper|association football|soccer player|soccer coach|professional soccer|football manager|football coach|football pundit|football administrator|professional football|fifa world cup|played as a)\b/i.test(
    extract || ""
  );
}

function hasTeamClue(profile, text) {
  const textKey = normalizePlayerName(text);
  return (profile.teams || []).some((team) => {
    const teamKey = normalizePlayerName(team);
    return teamKey.length >= 4 && textKey.includes(teamKey);
  });
}

function isLikelyPlayerIdentityPage(profile, page, overrideTitle = "") {
  if (!page?.title || !page?.extract) {
    return false;
  }

  if (hasJuniorMismatch(profile.name, page.title)) {
    return false;
  }

  const titleCore = getTitleCore(page.title);
  const profileNameKey = normalizePlayerName(profile.name);
  const titleCoreKey = normalizePlayerName(titleCore);
  const fullTitleKey = normalizePlayerName(page.title);
  const nameTokens = profileNameKey.split(" ").filter(Boolean);
  const exactishTitle =
    titleCoreKey === profileNameKey ||
    fullTitleKey === profileNameKey ||
    isPlayerNameMatch(profile.name, titleCore) ||
    nameTokens.every((token) => fullTitleKey.includes(token));

  if (!overrideTitle && !exactishTitle) {
    return false;
  }

  if (!isFootballerExtract(page.extract)) {
    return false;
  }

  if (overrideTitle) {
    return true;
  }

  if (nameTokens.length === 1) {
    return titleCoreKey === profileNameKey && hasTeamClue(profile, page.extract);
  }

  return exactishTitle && (hasTeamClue(profile, page.extract) || page.extract.length >= 120);
}

function isLikelyPlayerPage(profile, page, overrideTitle = "") {
  return Boolean(page?.pageimage) && isLikelyPlayerIdentityPage(profile, page, overrideTitle);
}

function decodeImageReference(value) {
  const reference = String(value || "").replace(/_/g, " ");
  try {
    return decodeURIComponent(reference);
  } catch {
    return reference;
  }
}

function isRejectedCommonsImageReference(value) {
  const referenceKey = normalizePlayerName(decodeImageReference(value));
  return rejectedCommonsImageFileKeys.some((fileKey) => referenceKey.includes(fileKey));
}

function getImageMetadataText(imageInfo) {
  return [
    imageInfo?.extmetadata?.ObjectName?.value,
    imageInfo?.extmetadata?.ImageDescription?.value,
    imageInfo?.extmetadata?.Categories?.value
  ]
    .map(stripHtml)
    .join(" ");
}

function isLikelyLandscapeGroupImage(fileName, imageInfo) {
  const width = Number(imageInfo?.width || imageInfo?.thumbwidth || 0);
  const height = Number(imageInfo?.height || imageInfo?.thumbheight || 0);
  if (!width || !height || width / height < 1.25) {
    return false;
  }

  const imageTextKey = normalizePlayerName(`${decodeImageReference(fileName)} ${getImageMetadataText(imageInfo)}`);
  return groupImageIndicatorKeys.some((indicatorKey) => imageTextKey.includes(indicatorKey));
}

function isUnsuitableCommonsImage(fileName, imageInfo) {
  return isRejectedCommonsImageReference(fileName) || isLikelyLandscapeGroupImage(fileName, imageInfo);
}

async function fetchWikipedia(params, attempt = 0) {
  const url = new URL(wikipediaApiUrl);
  for (const [key, value] of Object.entries({
    action: "query",
    format: "json",
    origin: "*",
    ...params
  })) {
    url.searchParams.set(key, value);
  }

  const response = await fetchWithTimeout(url, {
    headers: {
      "Api-User-Agent": apiUserAgent,
      "User-Agent": apiUserAgent
    }
  });
  if (response.status === 429 && attempt < requestMaxAttempts) {
    const retryAfterSeconds = Number(response.headers.get("retry-after") || 0);
    const backoffMs = retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 2 ** attempt * 3000;
    await sleep(backoffMs);
    return fetchWikipedia(params, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`Wikipedia API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchPageSummary(title, attempt = 0) {
  const normalizedTitle = String(title || "").trim().replace(/ /g, "_");
  const response = await fetchWithTimeout(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(normalizedTitle)}`, {
    headers: {
      "Api-User-Agent": apiUserAgent,
      "User-Agent": apiUserAgent
    }
  });
  if (response.status === 429 && attempt < requestMaxAttempts) {
    const retryAfterSeconds = Number(response.headers.get("retry-after") || 0);
    const backoffMs = retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 2 ** attempt * 3000;
    await sleep(backoffMs);
    return fetchPageSummary(title, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`Wikipedia summary request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function getPagesFromQuery(data) {
  return Object.values(data?.query?.pages || {})
    .filter((page) => !page.missing)
    .sort((a, b) => (a.index || 0) - (b.index || 0));
}

async function fetchPageByTitle(title) {
  const data = await fetchWikipedia({
    redirects: "1",
    titles: title,
    prop: "pageimages|extracts|info|pageprops",
    piprop: "name|thumbnail",
    ppprop: "wikibase_item",
    pithumbsize: "330",
    exintro: "1",
    explaintext: "1",
    inprop: "url"
  });
  return getPagesFromQuery(data)[0] || null;
}

function normalizeWikipediaTitle(value) {
  return String(value || "").replace(/_/g, " ").trim();
}

function getProfileTeamNames(profile) {
  return [
    profile.teamName,
    profile.team,
    ...(Array.isArray(profile.teams) ? profile.teams : [])
  ].filter((team) => typeof team === "string" && team.trim());
}

function getTeamTitleDisambiguators(profile) {
  const values = [];
  for (const team of getProfileTeamNames(profile)) {
    values.push(...(titleDisambiguatorsByTeamKey.get(normalizePlayerName(team)) || []));
  }
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function isTeamSpecificExactTitle(profile, title) {
  const titleKey = normalizePlayerName(title);
  return getTeamTitleDisambiguators(profile).some((value) => titleKey.includes(normalizePlayerName(value)));
}

function getExactTitleCandidates(profile) {
  const name = normalizeWikipediaTitle(profile.name);
  if (!name) {
    return [];
  }

  const titles = [name];
  if (exactTitleVariants) {
    titles.push(
      `${name} (footballer)`,
      `${name} (soccer)`,
      `${name} (soccer player)`,
      `${name} (association footballer)`
    );
    for (const disambiguator of getTeamTitleDisambiguators(profile)) {
      if (/\bsoccer player\b/i.test(disambiguator)) {
        titles.push(`${name} (${disambiguator})`);
      } else {
        titles.push(`${name} (${disambiguator} footballer)`);
        titles.push(`${name} (${disambiguator} soccer player)`);
      }
    }
  }

  return [...new Set(titles)];
}

function getCommonsFileKey(fileName) {
  return normalizePlayerName(String(fileName || "").replace(/^File:/i, "").replace(/_/g, " "));
}

async function fetchPagesByTitles(titles) {
  const uniqueTitles = [...new Set(titles.map(normalizeWikipediaTitle).filter(Boolean))];
  if (!uniqueTitles.length) {
    return new Map();
  }
  if (uniqueTitles.length > 50) {
    const pagesByRequestedTitle = new Map();
    for (let start = 0; start < uniqueTitles.length; start += 50) {
      const chunkPages = await fetchPagesByTitles(uniqueTitles.slice(start, start + 50));
      for (const [title, page] of chunkPages) {
        pagesByRequestedTitle.set(title, page);
      }
      if (requestDelayMs > 0 && start + 50 < uniqueTitles.length) {
        await sleep(requestDelayMs);
      }
    }
    return pagesByRequestedTitle;
  }

  const data = await fetchWikipedia({
    redirects: "1",
    titles: uniqueTitles.join("|"),
    prop: "pageimages|extracts|info|pageprops",
    piprop: "name|thumbnail",
    ppprop: "wikibase_item",
    pithumbsize: "330",
    exintro: "1",
    explaintext: "1",
    inprop: "url"
  });
  const pagesByTitle = new Map(getPagesFromQuery(data).map((page) => [normalizeWikipediaTitle(page.title), page]));
  const normalizedTitles = new Map(
    (data?.query?.normalized || []).map((entry) => [normalizeWikipediaTitle(entry.from), normalizeWikipediaTitle(entry.to)])
  );
  const redirectedTitles = new Map(
    (data?.query?.redirects || []).map((entry) => [normalizeWikipediaTitle(entry.from), normalizeWikipediaTitle(entry.to)])
  );
  const pagesByRequestedTitle = new Map();

  for (const title of uniqueTitles) {
    const normalizedTitle = normalizedTitles.get(title) || title;
    const redirectedTitle = redirectedTitles.get(normalizedTitle) || normalizedTitle;
    const page = pagesByTitle.get(redirectedTitle) || pagesByTitle.get(normalizedTitle) || pagesByTitle.get(title);
    if (page) {
      pagesByRequestedTitle.set(title, page);
    }
  }

  return pagesByRequestedTitle;
}

async function searchPages(profile) {
  const team = profile.teams?.[0] || "";
  const search = `${profile.name} ${team} footballer`.trim();
  const data = await fetchWikipedia({
    generator: "search",
    gsrsearch: search,
    gsrlimit: "6",
    prop: "pageimages|extracts|info|pageprops",
    piprop: "name|thumbnail",
    ppprop: "wikibase_item",
    pithumbsize: "330",
    exintro: "1",
    explaintext: "1",
    inprop: "url"
  });
  return getPagesFromQuery(data);
}

async function fetchImageInfo(fileName) {
  const title = `File:${String(fileName || "").replace(/^File:/i, "").trim()}`;
  const data = await fetchWikipedia({
    titles: title,
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
    iiurlwidth: "160"
  });
  const page = getPagesFromQuery(data)[0];
  return page?.imageinfo?.[0] || null;
}

async function fetchImageInfoByFiles(fileNames) {
  const uniqueFileNames = [...new Set(fileNames.map((fileName) => String(fileName || "").replace(/^File:/i, "").trim()).filter(Boolean))];
  if (!uniqueFileNames.length) {
    return new Map();
  }

  const data = await fetchWikipedia({
    titles: uniqueFileNames.map((fileName) => `File:${fileName}`).join("|"),
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
    iiurlwidth: "160"
  });
  const imageInfoByFileKey = new Map();
  for (const page of getPagesFromQuery(data)) {
    const imageInfo = page?.imageinfo?.[0] || null;
    if (imageInfo) {
      imageInfoByFileKey.set(getCommonsFileKey(page.title), imageInfo);
    }
  }
  return imageInfoByFileKey;
}

async function fetchWikidataP18ByEntityIds(entityIds) {
  const uniqueEntityIds = [...new Set(entityIds.filter((entityId) => /^Q\d+$/.test(String(entityId || ""))))];
  const imageByEntityId = new Map();

  for (let start = 0; start < uniqueEntityIds.length; start += 50) {
    const chunk = uniqueEntityIds.slice(start, start + 50);
    const url = new URL("https://www.wikidata.org/w/api.php");
    url.searchParams.set("action", "wbgetentities");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");
    url.searchParams.set("ids", chunk.join("|"));
    url.searchParams.set("props", "claims");

    let response;
    for (let attempt = 0; attempt <= requestMaxAttempts; attempt += 1) {
      response = await fetchWithTimeout(url, {
        headers: {
          "Api-User-Agent": apiUserAgent,
          "User-Agent": apiUserAgent
        }
      });
      if (response.status !== 429 || attempt >= requestMaxAttempts) {
        break;
      }
      const retryAfterSeconds = Number(response.headers.get("retry-after") || 0);
      const backoffMs = retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 2 ** attempt * 5000;
      await sleep(backoffMs);
    }
    if (!response?.ok) {
      throw new Error(`Wikidata API request failed: ${response?.status || "unknown"} ${response?.statusText || ""}`);
    }
    const data = await response.json();
    for (const entityId of chunk) {
      const fileName = data?.entities?.[entityId]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (fileName) {
        imageByEntityId.set(entityId, fileName);
      }
    }

    if (requestDelayMs > 0 && start + 50 < uniqueEntityIds.length) {
      await sleep(requestDelayMs);
    }
  }

  return imageByEntityId;
}

function createCommonsImageFieldsFromFile(page, fileName, imageInfo) {
  const pageUrl = page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`;
  const descriptionUrl = imageInfo?.descriptionurl || "";
  if (!descriptionUrl.includes("commons.wikimedia.org/wiki/File:")) {
    return null;
  }

  return {
    imageUrl: getCommonsImageUrl(fileName),
    imageSource: commonsSourceId,
    imageSourceUrl: descriptionUrl,
    imageCredit: stripHtml(imageInfo?.extmetadata?.Artist?.value),
    imageLicense: stripHtml(
      imageInfo?.extmetadata?.LicenseShortName?.value ||
        imageInfo?.extmetadata?.UsageTerms?.value ||
        imageInfo?.extmetadata?.License?.value
    ),
    imagePageTitle: page.title,
    imagePageUrl: pageUrl
  };
}

function createWikimediaImageFields(page, imageInfo) {
  const pageUrl = page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`;
  const descriptionUrl = imageInfo?.descriptionurl || "";
  if (descriptionUrl.includes("commons.wikimedia.org/wiki/File:")) {
    return {
      imageUrl: getCommonsImageUrl(page.pageimage),
      imageSource: commonsSourceId,
      imageSourceUrl: descriptionUrl,
      imageCredit: stripHtml(imageInfo?.extmetadata?.Artist?.value),
      imageLicense: stripHtml(
        imageInfo?.extmetadata?.LicenseShortName?.value ||
          imageInfo?.extmetadata?.UsageTerms?.value ||
          imageInfo?.extmetadata?.License?.value
      ),
      imagePageTitle: page.title,
      imagePageUrl: pageUrl
    };
  }

  if (page.thumbnail?.source) {
    return {
      imageUrl: page.thumbnail.source,
      imageSource: wikipediaSummarySourceId,
      imageSourceUrl: pageUrl,
      imagePageTitle: page.title,
      imagePageUrl: pageUrl
    };
  }

  return null;
}

function createCurrentImageLookup(currentProfilesData) {
  const lookup = new Map();
  for (const profile of Object.values(currentProfilesData?.profiles || {})) {
    if (!profile?.imageUrl) {
      continue;
    }

    for (const name of [profile.name, profile.displayName]) {
      const key = normalizePlayerName(name);
      if (key && !lookup.has(key)) {
        lookup.set(key, {
          imageUrl: profile.imageUrl,
          imageSource: inheritedImageSource,
          imageSourceUrl: profile.sourceUrl || profile.imageUrl
        });
      }
    }
  }
  return lookup;
}

function applyImageFields(profile, imageFields) {
  for (const [key, value] of Object.entries(imageFields || {})) {
    if (value !== undefined && value !== "") {
      profile[key] = value;
    }
  }
}

function applyTransfermarktFields(profile, fields) {
  if (!fields) {
    return false;
  }

  let applied = false;
  for (const fieldName of ["birthDate", "peakMarketValueEurMillions", "peakMarketValueSource", "peakMarketValueSourceUrl"]) {
    const value = fields[fieldName];
    if (profile[fieldName] === undefined && value !== undefined && value !== "") {
      profile[fieldName] = value;
      applied = true;
    }
  }

  if (!profile.imageUrl && fields.imageUrl) {
    for (const fieldName of ["imageUrl", "imageSource", "imageSourceUrl"]) {
      const value = fields[fieldName];
      if (value !== undefined && value !== "") {
        profile[fieldName] = value;
      }
    }
    applied = true;
  }

  return applied;
}

function clearInvalidTransfermarktFields(profile) {
  let changed = false;

  if (profile.imageSource === transfermarktImageSource && !isUsableTransfermarktImageUrl(profile.imageUrl)) {
    delete profile.imageUrl;
    delete profile.imageSource;
    delete profile.imageSourceUrl;
    changed = true;
  }

  if (!profile.birthDate || isBirthDatePlausibleForProfile(profile, profile.birthDate)) {
    return changed;
  }

  delete profile.birthDate;
  if (profile.peakMarketValueSource === transfermarktSourceId) {
    delete profile.peakMarketValueEurMillions;
    delete profile.peakMarketValueSource;
    delete profile.peakMarketValueSourceUrl;
  }
  if (profile.imageSource === transfermarktImageSource) {
    delete profile.imageUrl;
    delete profile.imageSource;
    delete profile.imageSourceUrl;
  }

  return true;
}

function clearRejectedWikimediaImageFields(profile) {
  if (
    !profile.imageUrl ||
    (profile.imageSource !== commonsSourceId && profile.imageSource !== wikipediaSummarySourceId)
  ) {
    return false;
  }

  const imageReferences = [
    profile.imageUrl,
    profile.imageSourceUrl,
    profile.imagePageTitle,
    profile.imagePageUrl
  ];
  if (!imageReferences.some(isRejectedCommonsImageReference)) {
    return false;
  }

  for (const fieldName of [
    "imageUrl",
    "imageSource",
    "imageSourceUrl",
    "imageCredit",
    "imageLicense",
    "imagePageTitle",
    "imagePageUrl"
  ]) {
    delete profile[fieldName];
  }
  return true;
}

async function lookupCommonsImage(profile) {
  const overrideTitle = curatedTitleOverrides.get(normalizePlayerName(profile.name)) || "";
  const overrideFileName = curatedCommonsFileOverrides.get(normalizePlayerName(profile.name)) || "";
  const overrideFileCacheKey = overrideFileName ? `commons-file:${overrideFileName}` : "";
  if (overrideTitle && curatedImageLookupCache.has(overrideTitle)) {
    return curatedImageLookupCache.get(overrideTitle);
  }
  if (overrideFileCacheKey && curatedImageLookupCache.has(overrideFileCacheKey)) {
    return curatedImageLookupCache.get(overrideFileCacheKey);
  }

  let pages = [];

  if (overrideTitle) {
    const summary = await fetchPageSummary(overrideTitle);
    const summaryImageUrl = summary?.thumbnail?.source || summary?.originalimage?.source || "";
    const summaryPage = {
      title: summary?.title || overrideTitle,
      extract: summary?.extract || "",
      pageimage: summaryImageUrl,
      fullurl: summary?.content_urls?.desktop?.page || ""
    };

    if (summaryImageUrl && isLikelyPlayerPage(profile, summaryPage, overrideTitle)) {
      const imageFields = {
        imageUrl: summaryImageUrl,
        imageSource: wikipediaSummarySourceId,
        imageSourceUrl: summaryPage.fullurl,
        imagePageTitle: summaryPage.title,
        imagePageUrl: summaryPage.fullurl
      };
      curatedImageLookupCache.set(overrideTitle, imageFields);
      return imageFields;
    }

    if (curatedOnly && !finalSemiTargetsOnly) {
      curatedImageLookupCache.set(overrideTitle, null);
      return null;
    }

    const page = await fetchPageByTitle(overrideTitle);
    pages = page ? [page] : [];
  } else {
    const exactPage = await fetchPageByTitle(profile.name);
    pages = exactPage ? [exactPage] : [];
    if (!exactTitleOnly) {
      const seenPageIds = new Set(pages.map((page) => page.pageid).filter(Boolean));
      const searchResults = await searchPages(profile);
      pages.push(...searchResults.filter((page) => !page.pageid || !seenPageIds.has(page.pageid)));
    }
  }

  for (const page of pages) {
    if (!isLikelyPlayerPage(profile, page, overrideTitle)) {
      continue;
    }
    if (isRejectedCommonsImageReference(page.pageimage) || isRejectedCommonsImageReference(page.thumbnail?.source)) {
      continue;
    }

    const imageInfo = await fetchImageInfo(page.pageimage);
    if (isUnsuitableCommonsImage(page.pageimage, imageInfo)) {
      continue;
    }
    const descriptionUrl = imageInfo?.descriptionurl || "";
    if (descriptionUrl.includes("commons.wikimedia.org/wiki/File:")) {
      const imageFields = {
        imageUrl: getCommonsImageUrl(page.pageimage),
        imageSource: commonsSourceId,
        imageSourceUrl: descriptionUrl,
        imageCredit: stripHtml(imageInfo?.extmetadata?.Artist?.value),
        imageLicense: stripHtml(
          imageInfo?.extmetadata?.LicenseShortName?.value ||
            imageInfo?.extmetadata?.UsageTerms?.value ||
            imageInfo?.extmetadata?.License?.value
        ),
        imagePageTitle: page.title,
        imagePageUrl: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`
      };
      if (overrideTitle) {
        curatedImageLookupCache.set(overrideTitle, imageFields);
      }
      return imageFields;
    }

    if (page.thumbnail?.source) {
      const imageFields = {
        imageUrl: page.thumbnail.source,
        imageSource: wikipediaSummarySourceId,
        imageSourceUrl: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
        imagePageTitle: page.title,
        imagePageUrl: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`
      };
      if (overrideTitle) {
        curatedImageLookupCache.set(overrideTitle, imageFields);
      }
      return imageFields;
    }
  }

  if (overrideFileName) {
    const imageInfo = await fetchImageInfo(overrideFileName);
    const descriptionUrl = imageInfo?.descriptionurl || "";
    if (!isUnsuitableCommonsImage(overrideFileName, imageInfo) && descriptionUrl.includes("commons.wikimedia.org/wiki/File:")) {
      const imageFields = {
        imageUrl: getCommonsImageUrl(overrideFileName),
        imageSource: commonsSourceId,
        imageSourceUrl: descriptionUrl,
        imageCredit: stripHtml(imageInfo?.extmetadata?.Artist?.value),
        imageLicense: stripHtml(
          imageInfo?.extmetadata?.LicenseShortName?.value ||
            imageInfo?.extmetadata?.UsageTerms?.value ||
            imageInfo?.extmetadata?.License?.value
        ),
        imagePageTitle: overrideTitle || profile.name,
        imagePageUrl: overrideTitle
          ? `https://en.wikipedia.org/wiki/${encodeURIComponent(overrideTitle.replace(/ /g, "_"))}`
          : ""
      };
      curatedImageLookupCache.set(overrideFileCacheKey, imageFields);
      return imageFields;
    }
    curatedImageLookupCache.set(overrideFileCacheKey, null);
  }

  if (overrideTitle) {
    curatedImageLookupCache.set(overrideTitle, null);
  }
  return null;
}

const [historicalProfilesData, currentProfilesData, historyData] = await Promise.all([
  readJson(historicalProfilesPath),
  readJson(currentProfilesPath),
  finalSemiTargetsOnly ? readJson(historyPath) : Promise.resolve(null)
]);

const currentImageLookup = createCurrentImageLookup(currentProfilesData);
const transfermarktRecords = await fetchTransfermarktPlayers();
const transfermarktIndex = buildTransfermarktIndex(transfermarktRecords);
const profiles = historicalProfilesData.profiles || {};
let inheritedCount = 0;
let transfermarktCount = 0;
let transfermarktImageCount = 0;
let transfermarktBirthDateCount = 0;
let transfermarktPeakValueCount = 0;
let invalidTransfermarktCount = 0;
let rejectedWikimediaImageCount = 0;
let rejectedFinalSemiImageCount = 0;
let wikimediaCount = 0;
let skippedExistingCount = 0;
let lookedUpCount = 0;
const lookupFailures = [];
const finalSemiTargetProfileKeys = finalSemiTargetsOnly
  ? collectFinalSemiTargetProfileKeys(historyData, historicalProfilesData.profiles || {})
  : new Set();

for (const profile of Object.values(profiles)) {
  if (clearInvalidTransfermarktFields(profile)) {
    invalidTransfermarktCount += 1;
  }
  if (clearRejectedWikimediaImageFields(profile)) {
    rejectedWikimediaImageCount += 1;
    if (finalSemiTargetProfileKeys.has(profile.profileKey)) {
      rejectedFinalSemiImageCount += 1;
    }
  }

  if (profile.imageUrl) {
    skippedExistingCount += 1;
  } else {
    const inheritedImageFields = currentImageLookup.get(normalizePlayerName(profile.name));
    if (inheritedImageFields?.imageUrl) {
      applyImageFields(profile, inheritedImageFields);
      inheritedCount += 1;
    }
  }

  const hadImage = Boolean(profile.imageUrl);
  const hadBirthDate = Boolean(profile.birthDate);
  const hadPeakValue = Boolean(profile.peakMarketValueEurMillions);
  const appliedTransfermarkt = applyTransfermarktFields(profile, getTransfermarktProfileFields(profile, transfermarktIndex));
  if (appliedTransfermarkt) {
    transfermarktCount += 1;
    if (!hadImage && profile.imageUrl) {
      transfermarktImageCount += 1;
    }
    if (!hadBirthDate && profile.birthDate) {
      transfermarktBirthDateCount += 1;
    }
    if (!hadPeakValue && profile.peakMarketValueEurMillions) {
      transfermarktPeakValueCount += 1;
    }
  }
}

const missingProfiles = Object.values(profiles).filter((profile) => {
  if (profile.imageUrl) {
    return false;
  }
  if (finalSemiTargetsOnly) {
    return finalSemiTargetProfileKeys.has(profile.profileKey);
  }
  if (!curatedOnly) {
    return true;
  }
  return curatedTitleOverrides.has(normalizePlayerName(profile.name));
}).sort(compareProfileLookupPriority);
const lookupProfiles = lookupLimit > 0 ? missingProfiles.slice(0, lookupLimit) : missingProfiles;

if (exactTitleBatch) {
  for (let start = 0; start < lookupProfiles.length; start += batchLookupSize) {
    const chunk = lookupProfiles.slice(start, start + batchLookupSize);
    try {
      const titleCandidatesByProfileKey = new Map(
        chunk.map((profile) => [profile.profileKey, getExactTitleCandidates(profile)])
      );
      const pagesByTitle = await fetchPagesByTitles([...titleCandidatesByProfileKey.values()].flat());
      lookedUpCount += chunk.length;

      const candidates = [];
      const wikidataCandidates = [];
      for (const profile of chunk) {
        let page = null;
        for (const title of titleCandidatesByProfileKey.get(profile.profileKey) || []) {
          const candidatePage = pagesByTitle.get(normalizeWikipediaTitle(title));
          const hasBatchTeamConfidence =
            candidatePage &&
            (hasTeamClue(profile, candidatePage.extract) || isTeamSpecificExactTitle(profile, title));
          if (
            candidatePage &&
            isLikelyPlayerIdentityPage(profile, candidatePage) &&
            (!exactTitleVariants || hasBatchTeamConfidence)
          ) {
            page = candidatePage;
            break;
          }
        }
        if (!page) {
          continue;
        }
        if (isLikelyPlayerPage(profile, page)) {
          if (isRejectedCommonsImageReference(page.pageimage) || isRejectedCommonsImageReference(page.thumbnail?.source)) {
            continue;
          }
          candidates.push({ profile, page });
          continue;
        }

        const entityId = page.pageprops?.wikibase_item;
        if (wikidataP18Batch && entityId) {
          wikidataCandidates.push({ profile, page, entityId });
          continue;
        }
      }

      const imageInfoByFileKey = await fetchImageInfoByFiles(candidates.map(({ page }) => page.pageimage));
      for (const { profile, page } of candidates) {
        const imageInfo = imageInfoByFileKey.get(getCommonsFileKey(page.pageimage));
        if (isUnsuitableCommonsImage(page.pageimage, imageInfo)) {
          continue;
        }
        const imageFields = createWikimediaImageFields(page, imageInfo);
        if (imageFields?.imageUrl) {
          applyImageFields(profile, imageFields);
          wikimediaCount += 1;
        }
      }

      if (wikidataCandidates.length) {
        const wikidataImageByEntityId = await fetchWikidataP18ByEntityIds(wikidataCandidates.map(({ entityId }) => entityId));
        const wikidataImageInfoByFileKey = await fetchImageInfoByFiles([...wikidataImageByEntityId.values()]);
        for (const { profile, page, entityId } of wikidataCandidates) {
          const fileName = wikidataImageByEntityId.get(entityId);
          const imageInfo = wikidataImageInfoByFileKey.get(getCommonsFileKey(fileName));
          if (!fileName || isUnsuitableCommonsImage(fileName, imageInfo)) {
            continue;
          }
          const imageFields = createCommonsImageFieldsFromFile(page, fileName, imageInfo);
          if (imageFields?.imageUrl) {
            applyImageFields(profile, imageFields);
            wikimediaCount += 1;
          }
        }
      }
    } catch (error) {
      lookupFailures.push(`batch ${start + 1}-${start + chunk.length}: ${error.message}`);
    }

    const completedCount = Math.min(start + chunk.length, lookupProfiles.length);
    console.log(`Historical image lookup progress: ${completedCount}/${lookupProfiles.length}`);

    if (requestDelayMs > 0 && completedCount < lookupProfiles.length) {
      await sleep(requestDelayMs);
    }
  }
} else {
  for (const [index, profile] of lookupProfiles.entries()) {
    try {
      const imageFields = await lookupCommonsImage(profile);
      lookedUpCount += 1;
      if (imageFields?.imageUrl) {
        applyImageFields(profile, imageFields);
        wikimediaCount += 1;
      }
    } catch (error) {
      lookupFailures.push(`${profile.name}: ${error.message}`);
    }

    if ((index + 1) % 25 === 0 || index + 1 === lookupProfiles.length) {
      console.log(`Historical image lookup progress: ${index + 1}/${lookupProfiles.length}`);
    }

    if (requestDelayMs > 0 && index + 1 < lookupProfiles.length) {
      await sleep(requestDelayMs);
    }
  }
}

const imageCount = Object.values(profiles).filter((profile) => profile.imageUrl).length;
const finalSemiImageCount = finalSemiTargetProfileKeys.size
  ? [...finalSemiTargetProfileKeys].filter((profileKey) => profiles[profileKey]?.imageUrl).length
  : 0;
const sourceIds = new Set(historicalProfilesData.sourceIds || []);
if (imageCount > 0) {
  sourceIds.add(commonsSourceId);
}
if (transfermarktCount > 0) {
  sourceIds.add(transfermarktSourceId);
}
if (Object.values(profiles).some((profile) => profile.imageSource === wikipediaSummarySourceId)) {
  sourceIds.add(wikipediaSummarySourceId);
}

const previousMinimumImageCount = Number(historicalProfilesData.coverage?.minimumImageCount || 0);
const adjustedMinimumImageCount = Math.max(0, previousMinimumImageCount - rejectedWikimediaImageCount);
const previousMinimumFinalSemiImageCount = Number(historicalProfilesData.coverage?.minimumFinalSemiImageCount || 0);
const adjustedMinimumFinalSemiImageCount = Math.max(
  0,
  previousMinimumFinalSemiImageCount - rejectedFinalSemiImageCount
);

const output = {
  ...historicalProfilesData,
  updatedAt: new Date().toISOString(),
  sourceIds: [...sourceIds],
  coverage: {
    ...(historicalProfilesData.coverage || {}),
    imageStatus: "current-card-reuse-plus-transfermarkt-plus-curated-wikipedia-wikimedia",
    imageNote:
      "Historical cards reuse current profile photos for matching active players, add conservative Transfermarkt dataset photos/birth dates/peak values when name and country match, and add Wikipedia/Wikimedia photos when the page match passes footballer checks or a curated title override.",
    minimumImageCount: Math.max(adjustedMinimumImageCount, imageCount),
    ...(finalSemiTargetProfileKeys.size
      ? {
          finalSemiImageStatus: "targeted-final-and-semi-final-scorers-key-players-and-team-description-mentions",
          finalSemiImageTargetCount: finalSemiTargetProfileKeys.size,
          finalSemiImageCount,
          minimumFinalSemiImageCount: Math.max(adjustedMinimumFinalSemiImageCount, finalSemiImageCount)
        }
      : {})
  },
  profiles
};

if (!dryRun) {
  await writeFile(historicalProfilesPath, `${JSON.stringify(output, null, 2)}\n`);
}

console.log(
  [
    `Historical player images ${dryRun ? "checked" : "populated"}: ${imageCount}/${Object.keys(profiles).length} profiles now have photos.`,
    `Inherited from current profiles: ${inheritedCount}.`,
    `Enriched from Transfermarkt dataset: ${transfermarktCount} profiles (${transfermarktImageCount} photos, ${transfermarktBirthDateCount} birth dates, ${transfermarktPeakValueCount} peak values).`,
    invalidTransfermarktCount ? `Removed implausible Transfermarkt matches: ${invalidTransfermarktCount}.` : "",
    rejectedWikimediaImageCount ? `Removed unsuitable Wikimedia matches: ${rejectedWikimediaImageCount}.` : "",
    `Added from Wikipedia/Wikimedia: ${wikimediaCount}.`,
    `Already had photos: ${skippedExistingCount}.`,
    finalSemiTargetProfileKeys.size
      ? `Final/Semi-finals targeted photos: ${finalSemiImageCount}/${finalSemiTargetProfileKeys.size}.`
      : "",
    `Wikimedia lookups attempted: ${lookedUpCount}.`,
    lookupLimit > 0 ? `Lookup limit applied: ${lookupLimit}.` : "",
    exactTitleOnly ? "Exact-title-only Wikimedia mode: yes." : "",
    exactTitleBatch ? `Exact-title batch Wikimedia mode: yes (${batchLookupSize} per batch).` : "",
    exactTitleVariants ? "Exact-title variant mode: yes." : "",
    wikidataP18Batch ? "Wikidata P18 fallback mode: yes." : "",
    curatedOnly ? "Curated-only Wikimedia mode: yes." : "",
    lookupFailures.length ? `Lookup failures: ${lookupFailures.slice(0, 8).join("; ")}` : ""
  ]
    .filter(Boolean)
    .join("\n")
);
