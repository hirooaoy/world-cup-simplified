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
const teamsPath = path.join(dataDir, "teams.json");
const wikipediaApiUrl = "https://en.wikipedia.org/w/api.php";
const commonsSourceId = "wikimedia-commons";
const wikipediaSummarySourceId = "wikipedia-page-summaries";
const transfermarktSourceId = "transfermarkt-market-values-2026-06-23";
const curatedWebPortraitSourceId = "curated-official-and-editorial-player-portraits";
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
const bestXiTargetsOnly = process.argv.includes("--best-xi-targets");
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
  ["turkiye", "turkey"],
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
    ["Juan Evaristo", "Juan Evaristo"],
    ["Pedro Suárez", "Arico Suárez"],
    ["Josef Košťálek", "Josef Košťálek"],
    ["Bellini", "Hilderaldo Bellini"],
    ["Mauro", "Mauro Ramos"],
    ["Wim van Hanegem", "Willem van Hanegem"],
    ["Luizinho", "Luizinho (footballer, born 1958)"],
    ["Julio Olarticoechea", "Julio Olarticoechea"],
    ["Josimar", "Josimar"],
    ["Luis Gabelo Conejo", "Luis Gabelo Conejo"],
    ["Paul Parker", "Paul Parker (footballer)"],
    ["Trifon Ivanov", "Trifon Ivanov"],
    ["Yoo Sang-chul", "Yoo Sang-chul"],
    ["Miguel", "Miguel Monteiro"],
    ["Yahya Attiat-Allah", "Yahya Attiat-Allah"],
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
    ["Juan Evaristo", "Juan Evaristo - El Gráfico 573.jpg"],
    ["Pedro Suárez", "Arico Suárez.jpg"],
    ["Josef Košťálek", "Josef Košťálek-Mitropa1930.jpg"],
    ["Ernest Wilimowski", "Ernest Wilimowski 1936.jpg"],
    ["Matías González", "Matías González (cropped).png"],
    ["Max Morlock", "Max Morlock 1954 (Com M03-0108-005-0002) (cropped).jpg"],
    ["Hans Schäfer", "Hans Schäfer 1954 (Com M03-0108-005-0004) (cropped).jpg"],
    ["Toni Turek", "Toni Turek, Estadio, 1954-07-17 (583).jpg"],
    ["Harry Gregg", "Harry Gregg.png"],
    ["Nico Claesen", "Belgium vs ussr 1986 (cropped).jpg"],
    ["Stéphane Guivarc'h", "S. Guivarc'h EAG.jpg"]
  ].map(([name, fileName]) => [normalizePlayerName(name), fileName])
);

const curatedDirectImageOverrides = new Map(
  [
    [1930, "Enrique Ballestrero", {
      imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Enrique%20ballestrero%20en%20el%20arco.jpg?width=160",
      imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Enrique_ballestrero_en_el_arco.jpg",
      imageCredit: "Mona Ballestrero Griffo",
      imageLicense: "CC BY-SA 4.0",
      imagePageTitle: "Enrique Ballestrero"
    }],
    [1930, "Ernesto Mascheroni", {
      birthDate: "1907-11-21",
      imageUrl: "https://www.auf.org.uy/imagenes/img_contenido/seleccion_jugador/a/ernesto_mascheroni.jpg",
      imageSourceUrl: "https://www.auf.org.uy/ernesto-mascheroni/",
      imageCredit: "Uruguayan Football Association archive",
      imagePageTitle: "Ernesto Mascheroni · AUF"
    }],
    [1934, "Leonardo Cilaurren", {
      imageUrl: "https://cdn.athletic-club.eus/imagenes/fotofichas/SM/leonardo-cilaurren-uriarte_SM.png?v=1.0",
      imageSourceUrl: "https://www.athletic-club.eus/en/players/leonardo-cilaurren-uriarte/",
      imagePageTitle: "Leonardo Cilaurren · Athletic Club"
    }],
    [1934, "Karl Sesta", {
      imageUrl: "https://www.oepb.at/wp-content/uploads/2023/02/Karl-Sesta-1934_Sammlung-oepb.at_.jpeg",
      imageSourceUrl: "https://www.oepb.at/allerlei/zum-111-geburtstag-wunderteam-fussballer-karl-sesta.html",
      imagePageTitle: "Karl Sesta in 1934 · oepb.at"
    }],
    [1934, "Josef Čtyřoký", {
      imageUrl: "https://www.fotbal-nadacefi.cz/data/B%C3%BDval%C3%AD%20reprezentanti/ctyroky.jpg",
      imageSourceUrl: "https://www.fotbal-nadacefi.cz/cs/byvali-reprezentanti/josef-ctyroky.html",
      imagePageTitle: "Josef Čtyřoký · Nadace fotbalových internacionálů"
    }],
    [1934, "Karl Zischek", {
      imageUrl: "https://www.national-football-teams.com/media/cache/players_page/uploads/person_photos/Karl_Zischek_21806-59c022a21e729.jpeg",
      imageSourceUrl: "https://www.national-football-teams.com/player/21806/Karl_Zischek.html",
      imagePageTitle: "Karl Zischek · National Football Teams"
    }],
    [1934, "Edmund Conen", {
      imageUrl: "https://assets.dfb.de/uploads/000/034/967/custom_style_1_Edmund_Conen.jpg?1493072048",
      imageSourceUrl: "https://datencenter.dfb.de/datencenter/personen/edmund-conen/spieler",
      imagePageTitle: "Edmund Conen · DFB Datencenter"
    }],
    [1934, "Ernst Lehner", {
      imageUrl: "https://img.a.transfermarkt.technology/portrait/header/194544-1721301739.jpg?lm=1",
      imageSourceUrl: "https://www.transfermarkt.de/ernst-lehner/profil/spieler/194544",
      imageCredit: "IMAGO via Transfermarkt",
      imagePageTitle: "Ernst Lehner · Transfermarkt"
    }],
    [1938, "Josef Košťálek", {
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d6/Josef_Ko%C5%A1%C5%A5%C3%A1lek-Mitropa1930.jpg",
      imageSourceUrl: "https://en.wikipedia.org/wiki/Josef_Ko%C5%A1%C5%A5%C3%A1lek",
      imagePageTitle: "Josef Košťálek"
    }],
    [1938, "Ernst Lehner", {
      imageUrl: "https://img.a.transfermarkt.technology/portrait/header/194544-1721301739.jpg?lm=1",
      imageSourceUrl: "https://www.transfermarkt.de/ernst-lehner/profil/spieler/194544",
      imageCredit: "IMAGO via Transfermarkt",
      imagePageTitle: "Ernst Lehner · Transfermarkt"
    }],
    [1938, "Gyula Polgár", {
      imageUrl: "https://upload.wikimedia.org/wikipedia/de/2/21/Polg%C3%A1r_Gyula_portr%C3%A9ja_%28P%C3%A1lh%C3%A1zy_Gyula%2C_1938%29.jpg",
      imageSourceUrl: "https://de.wikipedia.org/wiki/Datei:Polg%C3%A1r_Gyula_portr%C3%A9ja_(P%C3%A1lh%C3%A1zy_Gyula,_1938).jpg",
      imagePageTitle: "Gyula Polgár portrait, 1938"
    }],
    [1938, "Arne Nyberg", {
      imageUrl: "https://ifkdb.se/images/players/remini/533.jpg",
      imageSourceUrl: "https://ifkdb.se/spelare/Arne-Nyberg_533",
      imagePageTitle: "Arne Nyberg · IFK Göteborg historical database"
    }],
    [1938, "Martim Silveira", {
      imageUrl: "https://terceirotempo.uol.com.br/imagens/43/32/w500_h140_qfl_fto_14332.webp",
      imageSourceUrl: "https://terceirotempo.uol.com.br/que-fim-levou/martim-2891",
      imageCredit: "Terceiro Tempo archive",
      imagePageTitle: "Martim Silveira · Terceiro Tempo"
    }],
    [1950, "José Parra", {
      imageUrl: "https://hallofameperico.com/wp-content/uploads/2010/09/parra1.jpg",
      imageSourceUrl: "https://hallofameperico.com/2010/09/03/josep-parra-2/",
      imagePageTitle: "Josep Parra · Hall of Fame Perico"
    }],
    [1950, "Chico", {
      imageUrl: "https://terceirotempo.uol.com.br/imagens/29/82/w500_h360_qfl_fto_12982.webp",
      imageSourceUrl: "https://terceirotempo.uol.com.br/que-fim-levou/chico-1513",
      imageCredit: "Terceiro Tempo archive",
      imagePageTitle: "Chico · Terceiro Tempo"
    }],
    [1950, "Baltazar", {
      imageUrl: "https://www.national-football-teams.com/media/cache/players_page/uploads/person_photos/Baltazar_1_19207-5e62a8bb25cab.png",
      imageSourceUrl: "https://www.national-football-teams.com/player/19207/Baltazar_1.html",
      imageCredit: "rcs67 via National Football Teams",
      imagePageTitle: "Baltazar · National Football Teams"
    }],
    [1954, "Werner Kohlmeyer", {
      imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Werner%20Kohlmeyer%201954%20%28Com%20M03-0108-005-0012%29%20%28cropped%29.jpg?width=160",
      imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Werner_Kohlmeyer_1954_(Com_M03-0108-005-0012)_(cropped).jpg",
      imageCredit: "ETH-Bibliothek Zürich · Comet Photo AG",
      imageLicense: "CC BY-SA 4.0",
      imagePageTitle: "Werner Kohlmeyer, 1954"
    }],
    [1954, "Bernhard Klodt", {
      imageUrl: "https://img.a.transfermarkt.technology/portrait/header/102171-1447930959.jpg?lm=1",
      imageSourceUrl: "https://www.transfermarkt.de/bernhard-klodt/profil/spieler/102171",
      imageCredit: "IMAGO via Transfermarkt",
      imagePageTitle: "Bernhard Klodt · Transfermarkt"
    }],
    [1954, "Josef Hügi", {
      imageUrl: "https://www.national-football-teams.com/media/cache/players_page/uploads/person_photos/Josef_Huegi_18535-5ef63ac0d43ed.jpeg",
      imageSourceUrl: "https://www.national-football-teams.com/player/18535/Josef_Huegi.html",
      imageCredit: "Jorge Mendoza via National Football Teams",
      imagePageTitle: "Josef Hügi · National Football Teams"
    }],
    [1954, "Péter Palotás", {
      imageUrl: "https://www.national-football-teams.com/media/cache/players_page/uploads/person_photos/Peter_Palotas_43601-5c9934be4b992.jpeg",
      imageSourceUrl: "https://www.national-football-teams.com/player/43601/Peter_Palotas.html",
      imageCredit: "Tsipras via National Football Teams",
      imagePageTitle: "Péter Palotás · National Football Teams"
    }],
    [1954, "Carlos Borges", {
      imageUrl: "https://www.auf.org.uy/imagenes/img_contenido/seleccion_jugador/a/carlos_borges_.jpg",
      imageSourceUrl: "https://www.auf.org.uy/carlos-borges/",
      imageCredit: "Uruguayan Football Association archive",
      imagePageTitle: "Carlos Borges · AUF"
    }],
    [1954, "Baltazar", {
      imageUrl: "https://www.national-football-teams.com/media/cache/players_page/uploads/person_photos/Baltazar_1_19207-5e62a8bb25cab.png",
      imageSourceUrl: "https://www.national-football-teams.com/player/19207/Baltazar_1.html",
      imageCredit: "rcs67 via National Football Teams",
      imagePageTitle: "Baltazar · National Football Teams"
    }],
    [1954, "Aleksandar Petaković", {
      imageUrl: "https://www.reprezentacija.rs/wp-content/uploads/igraci/petakovic-aleksandar.jpg",
      imageSourceUrl: "https://www.reprezentacija.rs/petakovic-aleksandar/",
      imagePageTitle: "Aleksandar Petaković · reprezentacija.rs"
    }],
    [1958, "Sven Axbom", {
      imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Sven%20Axbom%201960%20%28cropped%29.jpg?width=160",
      imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Sven_Axbom_1960_(cropped).jpg",
      imageCredit: "Rekord-Magasinet no. 33, 1960",
      imageLicense: "Public domain",
      imagePageTitle: "Sven Axbom, 1960"
    }],
    [1958, "Bernhard Klodt", {
      imageUrl: "https://img.a.transfermarkt.technology/portrait/header/102171-1447930959.jpg?lm=1",
      imageSourceUrl: "https://www.transfermarkt.de/bernhard-klodt/profil/spieler/102171",
      imageCredit: "IMAGO via Transfermarkt",
      imagePageTitle: "Bernhard Klodt · Transfermarkt"
    }],
    [1958, "Aleksandar Petaković", {
      imageUrl: "https://www.reprezentacija.rs/wp-content/uploads/igraci/petakovic-aleksandar.jpg",
      imageSourceUrl: "https://www.reprezentacija.rs/petakovic-aleksandar/",
      imagePageTitle: "Aleksandar Petaković · reprezentacija.rs"
    }],
    [1958, "Zdeněk Zikán", {
      imageUrl: "https://dsg-images.com/players/150x150/9712.png",
      imageSourceUrl: "https://globalsportsarchive.com/en/soccer/athlete/zdenek-zikan/9712/overview",
      imagePageTitle: "Zdeněk Zikán · Global Sports Archive"
    }],
    [1958, "Yuri Voynov", {
      imageUrl: "https://fcdynamo.com/img/content/histories/39/vionov.jpg",
      imageSourceUrl: "https://fcdynamo.com/en/history/yurii-voinov",
      imageCredit: "FC Dynamo Kyiv official website; photographer not stated",
      imagePageTitle: "Yuri Voynov · FC Dynamo Kyiv"
    }],
    [1966, "Valeriy Porkujan", {
      imageUrl: "https://fcdynamo.com/img/content/histories/147/post523565-d82ae-content.jpg?fm=jpg&q=80&fit=max&crop=750%2C423%2C0%2C0",
      imageSourceUrl: "https://fcdynamo.com/en/history/valerii-porkuyan",
      imageCredit: "FC Dynamo Kyiv official website",
      imagePageTitle: "Valeriy Porkuyan · FC Dynamo Kyiv"
    }],
    [1966, "José Torres", {
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Jos%C3%A9_Augusto_Torres_%281963%29.jpg/330px-Jos%C3%A9_Augusto_Torres_%281963%29.jpg",
      imageSourceUrl: "https://en.wikipedia.org/wiki/Jos%C3%A9_Torres_(footballer,_born_1938)",
      imagePageTitle: "José Torres"
    }],
    [1966, "Eduard Malofeyev", {
      imageUrl: "https://www.national-football-teams.com/media/cache/players_page/uploads/person_photos/Eduard_Malofeev_19076-56dd9c644e1c5.jpeg",
      imageSourceUrl: "https://www.national-football-teams.com/player/19076/Eduard_Malofeyev.html",
      imageCredit: "Andrey from Tula via National Football Teams",
      imagePageTitle: "Eduard Malofeyev · National Football Teams"
    }],
    [1966, "Vicente Lucas", {
      imageUrl: "https://www.osbelenenses.com/wp-content/uploads/2016/06/vicente_lucas.jpg",
      imageSourceUrl: "https://www.osbelenenses.com/2016/06/vicente-lucas-actualizacao-de-informacao-05062016/",
      imagePageTitle: "Vicente Lucas · Os Belenenses"
    }],
    [1966, "Ray Wilson", {
      imageUrl: "https://www.thefa.com/-/media/thefacom-new/images/england/mens-senior/archive/ray-800-wilson-action.ashx?as=0&dmc=0&thn=0",
      imageSourceUrl: "https://www.thefa.com/news/2018/may/16/ray-wilson-england-1966-world-cup-160518",
      imageCredit: "The Football Association archive",
      imagePageTitle: "Ray Wilson · The Football Association"
    }],
    [1978, "Oscar", {
      displayName: "Oscar Bernardi",
      birthDate: "1954-06-20",
      imageUrl: "https://www.national-football-teams.com/media/cache/players_page/uploads/person_photos/Oscar_3_17935-543fa48b67e8b.jpeg",
      imageSourceUrl: "https://www.national-football-teams.com/player/17935/Oscar_3.html",
      imageCredit: "Arkadi via National Football Teams",
      imagePageTitle: "Oscar Bernardi · National Football Teams"
    }],
    [1978, "Ernie Brandts", {
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Ernie_Brandts_1978c.jpg/330px-Ernie_Brandts_1978c.jpg",
      imageSourceUrl: "https://en.wikipedia.org/wiki/Ernie_Brandts",
      imagePageTitle: "Ernie Brandts"
    }],
    [1982, "Karlheinz Förster", {
      imageUrl: "https://assets.dfb.de/uploads/000/035/915/custom_style_1_Karlheinz_F%C3%B6rster.jpg?1493072688",
      imageSourceUrl: "https://datencenter.dfb.de/datencenter/personen/karlheinz-foerster/spieler",
      imagePageTitle: "Karlheinz Förster · DFB Datencenter"
    }],
    [1982, "Gerry Armstrong", {
      imageUrl: "https://www.national-football-teams.com/media/cache/players_page/uploads/person_photos/Gerry_Armstrong_20121-5a0371907c3b5.jpeg",
      imageSourceUrl: "https://www.national-football-teams.com/player/20121/Gerry_Armstrong.html",
      imageCredit: "Tsipras via National Football Teams",
      imagePageTitle: "Gerry Armstrong · National Football Teams"
    }],
    [1982, "Billy Hamilton", {
      imageUrl: "https://www.national-football-teams.com/media/cache/players_page/uploads/person_photos/Billy_Hamilton_20200-544d0ccea48a0.jpeg",
      imageSourceUrl: "https://www.national-football-teams.com/player/20200/Billy_Hamilton.html",
      imageCredit: "Arkadi via National Football Teams",
      imagePageTitle: "Billy Hamilton · National Football Teams"
    }],
    [1982, "Éder", {
      birthDate: "1957-05-25",
      imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/JPP4661%20%2854136748507%29%20%28cropped%29.jpg?width=160",
      imageSourceUrl: "https://commons.wikimedia.org/wiki/File:JPP4661_(54136748507)_(cropped).jpg",
      imageCredit: "Galo Na Veia",
      imageLicense: "Public domain",
      imagePageTitle: "Éder Aleixo"
    }],
    [1982, "Júnior", {
      birthDate: "1954-06-29",
      imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Leovegildo%20lins%20da%20gama%20j%C3%BAnior.JPG?width=160",
      imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Leovegildo_lins_da_gama_j%C3%BAnior.JPG",
      imageCredit: "Unknown author · El Gráfico, 1983",
      imageLicense: "Public domain",
      imagePageTitle: "Leovegildo Lins da Gama Júnior"
    }],
    [1982, "Fulvio Collovati", {
      imageUrl: "https://www.collovati.it/wp-content/uploads/2022/02/Fulvio-Collovati.webp",
      imageSourceUrl: "https://www.collovati.it/biografia/",
      imagePageTitle: "Fulvio Collovati · official biography"
    }],
    [1982, "Luizinho", {
      imageUrl: "https://atletico.com.br/wp-content/uploads/2022/03/220px-Luisinho-1.jpg",
      imageSourceUrl: "https://atletico.com.br/idolos/luizinho/",
      imagePageTitle: "Luizinho · Atlético Mineiro"
    }],
    [1986, "Manuel Amoros", {
      imageUrl: "https://fff.twic.pics/https://media.fff.fr/uploads/images/bca3d7bd82c1d338b31235e8cdc8a7d8.png?twic=v1/focus=225x104",
      imageSourceUrl: "https://www.fff.fr/equipe-nationale/joueur/8558-amoros-manuel/fiche.html",
      imagePageTitle: "Manuel Amoros · Fédération Française de Football"
    }],
    [1986, "Josimar", {
      imageUrl: "https://terceirotempo.uol.com.br/imagens/36/61/w500_h140_qfl_fto_13661.webp",
      imageSourceUrl: "https://terceirotempo.uol.com.br/que-fim-levou/josimar-2209",
      imagePageTitle: "Josimar Higino Pereira · Terceiro Tempo"
    }],
    [1986, "Júlio César", {
      birthDate: "1963-03-08",
      imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/10.%20Tag%20der%20Legenden%202014%2047.jpg?width=160",
      imageSourceUrl: "https://commons.wikimedia.org/wiki/File:10._Tag_der_Legenden_2014_47.jpg",
      imageCredit: "Die Bildermacherei Cuxhaven, Kerstin Tietje",
      imageLicense: "CC BY-SA 4.0",
      imagePageTitle: "Júlio César da Silva"
    }],
    [1986, "Karlheinz Förster", {
      imageUrl: "https://assets.dfb.de/uploads/000/035/915/custom_style_1_Karlheinz_F%C3%B6rster.jpg?1493072688",
      imageSourceUrl: "https://datencenter.dfb.de/datencenter/personen/karlheinz-foerster/spieler",
      imagePageTitle: "Karlheinz Förster · DFB Datencenter"
    }],
    [1986, "Billy Hamilton", {
      imageUrl: "https://www.national-football-teams.com/media/cache/players_page/uploads/person_photos/Billy_Hamilton_20200-544d0ccea48a0.jpeg",
      imageSourceUrl: "https://www.national-football-teams.com/player/20200/Billy_Hamilton.html",
      imageCredit: "Arkadi via National Football Teams",
      imagePageTitle: "Billy Hamilton · National Football Teams"
    }],
    [1990, "Luis Gabelo Conejo", {
      imageUrl: "https://www.fcrf.cr/wp-content/uploads/2020/06/GABELO-1.png",
      imageSourceUrl: "https://www.fcrf.cr/2020/06/08/gabelo-conejo-ser-titular-en-italia-90-fue-un-premio-a-la-constancia/",
      imagePageTitle: "Luis Gabelo Conejo · Costa Rican Football Federation"
    }],
    [1990, "Paul Parker", {
      imageUrl: "https://s3.eu-west-1.amazonaws.com/gc-media-assets.fulhamfc.com/583f39b7-d3c5-4b6a-9240-cf9dda987ff2.jpg",
      imageSourceUrl: "https://www.fulhamfc.com/news/2020/june/03/the-long-read-paul-parker/",
      imagePageTitle: "Paul Parker · Fulham FC"
    }],
    [1994, "Trifon Ivanov", {
      imageUrl: "https://digitalhub.fifa.com/m/7ab497a15847f29b/original/Trifon-Ivanov-lines-up-before-a-Bulgaria-game-at-the-1994-FIFA-World-Cup-USA.jpg",
      imageSourceUrl: "https://www.fifa.com/en/tournaments/mens/worldcup/articles/wacky-haircuts-hairstyles-photos",
      imagePageTitle: "Trifon Ivanov at the 1994 World Cup · FIFA"
    }],
    [1994, "Daniel Amokachi", {
      imageUrl: "https://www.national-football-teams.com/media/cache/players_page/uploads/person_photos/Daniel_Amokachi_13862-61a4386f88d84.jpeg",
      imageSourceUrl: "https://www.national-football-teams.com/player/13862/Daniel_Amokachi.html",
      imagePageTitle: "Daniel Amokachi · National Football Teams"
    }],
    [1994, "Rashidi Yekini", {
      imageUrl: "https://www.national-football-teams.com/media/cache/resolve/players_page/uploads/person_photos/Rashidi_Yekini_13866-615040078aa71.png",
      imageSourceUrl: "https://www.national-football-teams.com/player/13866/Rashidi_Yekini.html",
      imageCredit: "Tsipras via National Football Teams",
      imagePageTitle: "Rashidi Yekini · National Football Teams"
    }],
    [2002, "Yoo Sang-chul", {
      imageUrl: "https://upload.wikimedia.org/wikipedia/en/a/aa/Yoo_Sang-chul_2.jpg",
      imageSourceUrl: "https://en.wikipedia.org/wiki/File:Yoo_Sang-chul_2.jpg",
      imagePageTitle: "Yoo Sang-chul"
    }],
    [2002, "Júnior", {
      birthDate: "1973-06-20",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Jen%C3%ADlson_%C3%82ngelo_de_Souza_%28J%C3%BAnior%29_02.jpg/330px-Jen%C3%ADlson_%C3%82ngelo_de_Souza_%28J%C3%BAnior%29_02.jpg",
      imageSourceUrl: "https://en.wikipedia.org/wiki/J%C3%BAnior_(footballer,_born_1973)",
      imagePageTitle: "Júnior"
    }],
    [2006, "Miguel", {
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Lu%C3%ADs_Miguel_Brito_24sept2006_%28cropped%29.jpg",
      imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Lu%C3%ADs_Miguel_Brito_24sept2006_(cropped).jpg",
      imagePageTitle: "Luís Miguel Brito, 2006"
    }],
    [2006, "Patrick Vieira", {
      birthDate: "1976-06-23",
      imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Patrick%20Vieira%20NYCFC%20%28cropped%29.JPG?width=160",
      imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Patrick_Vieira_NYCFC_(cropped).JPG",
      imageCredit: "Simon Heseltine",
      imageLicense: "CC BY-SA 4.0",
      imagePageTitle: "Patrick Vieira"
    }],
    [2010, "Luis Suárez", {
      birthDate: "1987-01-24",
      imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Luis%20Su%C3%A1rez%20Uruguay.jpg?width=160",
      imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Luis_Su%C3%A1rez_Uruguay.jpg",
      imageCredit: "Анна Нэсси",
      imageLicense: "CC BY-SA 3.0",
      imagePageTitle: "Luis Suárez"
    }],
    [2022, "Yahya Attiat-Allah", {
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/40/Yahya25.jpg",
      imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Yahya25.jpg",
      imagePageTitle: "Yahya Attiat-Allah"
    }]
  ].map(([year, name, fields]) => [
    `${Number(year)}:${normalizePlayerName(name)}`,
    { ...fields, imageSource: curatedWebPortraitSourceId, imagePageUrl: fields.imageSourceUrl }
  ])
);

const rejectedCommonsImageFileKeys = [
  "Alexander Wood, Brentford FC footballer, 1928.jpg",
  "Belgium vs ussr 1986.jpg",
  "FIFA World Cup 2006 - UKR vs TUN.jpg",
  "FIFA World Cup 2006, Iran 1-1 Angola (21).jpg",
  "Francescoli fouled scotland.jpg",
  "Gunnar Gren 1957.jpg",
  "20141118 AUTBRA 5022.jpg",
  "Eder-Sao-Paulo-Juventude-jun-2022.jpg",
  "Jenílson Ângelo de Souza (Júnior) 02.jpg",
  "Jim Brown (1961) (cropped).jpg",
  "Júlio César FC Internazionale.jpg",
  "Julio Ricardo Cruz.jpg",
  "Marshall Leonard MLS Cup 2006.jpg",
  "Maradona vs belgium world cup 1986.jpg",
  "Rudolf Noack.jpg",
  "Slavia Prague 1930. Champions of the football league.jpg",
  "Tottenham Hotspur Stadium South Stand.jpg",
  "USA team line up 13 July.jpg",
  "Valznerweiher 1961.jpg",
  "Velez equipo 1995apertura.jpg",
  "Wolverhampton Wanderers F.C. 1955.jpg",
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
  if (profile.birthDate && profile.birthDate !== birthDate) {
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

function countHistoricalCoverageImages(historyData, profiles) {
  const profilesByVersion = new Map();
  const profilesByTeamYear = new Map();

  for (const profile of Object.values(profiles || {})) {
    addHistoricalProfileVersion(profilesByVersion, profilesByTeamYear, profile);
  }

  const requiredVersionKeys = new Set();
  const addRequiredVersion = (name, teamName, tournamentYear) => {
    const versionKey = historicalProfileVersionKey(name, teamName, tournamentYear);
    if (versionKey) {
      requiredVersionKeys.add(versionKey);
    }
  };

  for (const fixture of historyData?.fixtures || []) {
    for (const side of ["home", "away"]) {
      const teamName = side === "home" ? fixture.homeSlot : fixture.awaySlot;
      for (const player of fixture.keyPlayers?.[side] || []) {
        addRequiredVersion(player?.name, teamName, fixture.tournamentYear);
      }
    }

    for (const [scoringSide, goals] of [
      ["home", fixture.goalsHome || []],
      ["away", fixture.goalsAway || []]
    ]) {
      for (const goal of goals) {
        const playerSide = goal?.ownGoal
          ? (scoringSide === "home" ? "away" : "home")
          : scoringSide;
        const teamName = playerSide === "home" ? fixture.homeSlot : fixture.awaySlot;
        addRequiredVersion(goal?.name, teamName, fixture.tournamentYear);
      }
    }
  }

  return [...requiredVersionKeys].filter((versionKey) => profilesByVersion.get(versionKey)?.imageUrl).length;
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

function isNonImageMediaReference(value) {
  return /\.(?:djvu|flac|m4a|mp3|mp4|oga|ogg|ogv|pdf|wav|webm)(?:$|[?#])/i.test(
    String(value || "")
  );
}

function isUnsuitableCommonsImage(fileName, imageInfo) {
  const mime = String(imageInfo?.mime || "").toLowerCase();
  return (
    isRejectedCommonsImageReference(fileName) ||
    isNonImageMediaReference(fileName) ||
    (mime && !mime.startsWith("image/")) ||
    isLikelyLandscapeGroupImage(fileName, imageInfo)
  );
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

function createCurrentImageLookup(currentProfilesData, teamsData) {
  const lookup = new Map();
  const teamNameById = new Map(
    (teamsData?.teams || []).map((team) => [team.id, team.name])
  );
  for (const profile of Object.values(currentProfilesData?.profiles || {})) {
    const teamName = teamNameById.get(profile?.teamId);
    if (!profile?.imageUrl || !teamName) {
      continue;
    }

    for (const name of [profile.name, profile.displayName]) {
      const normalizedName = normalizePlayerName(name);
      const normalizedCountry = normalizeCountry(teamName);
      const key = normalizedName && normalizedCountry
        ? `${normalizedName}|${normalizedCountry}`
        : "";
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

function getCurrentImageLookupKey(name, teamName) {
  const normalizedName = normalizePlayerName(name);
  const normalizedCountry = normalizeCountry(teamName);
  return normalizedName && normalizedCountry
    ? `${normalizedName}|${normalizedCountry}`
    : "";
}

function clearInvalidInheritedImageFields(profile, currentImageLookup) {
  if (profile.imageSource !== inheritedImageSource) {
    return false;
  }

  const inheritedImageFields = currentImageLookup.get(
    getCurrentImageLookupKey(profile.name, profile.teamName)
  );
  if (inheritedImageFields?.imageUrl === profile.imageUrl) {
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

function applyImageFields(profile, imageFields) {
  for (const [key, value] of Object.entries(imageFields || {})) {
    if (value !== undefined && value !== "") {
      profile[key] = value;
    }
  }
}

function replaceWithCuratedDirectImageFields(profile, imageFields) {
  if (imageFields?.birthDate) {
    if (profile.birthDate && profile.birthDate !== imageFields.birthDate) {
      delete profile.birthDate;
    }
    if (profile.peakMarketValueSource === transfermarktSourceId) {
      delete profile.peakMarketValueEurMillions;
      delete profile.peakMarketValueSource;
      delete profile.peakMarketValueSourceUrl;
    }
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
  applyImageFields(profile, imageFields);
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
  if (
    !imageReferences.some(isRejectedCommonsImageReference) &&
    !imageReferences.some(isNonImageMediaReference)
  ) {
    return false;
  }

  for (const fieldName of [
    "imageUrl",
    "imageSource",
    "imageSourceUrl",
    "imageCredit",
    "imageLicense"
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

    if (
      summaryImageUrl &&
      !isNonImageMediaReference(summaryImageUrl) &&
      !isRejectedCommonsImageReference(summaryImageUrl) &&
      isLikelyPlayerPage(profile, summaryPage, overrideTitle)
    ) {
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

    if (curatedOnly && !finalSemiTargetsOnly && !overrideFileName) {
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

const [historicalProfilesData, currentProfilesData, historyData, teamsData] = await Promise.all([
  readJson(historicalProfilesPath),
  readJson(currentProfilesPath),
  readJson(historyPath),
  readJson(teamsPath)
]);

const currentImageLookup = createCurrentImageLookup(currentProfilesData, teamsData);
const transfermarktRecords = await fetchTransfermarktPlayers();
const transfermarktIndex = buildTransfermarktIndex(transfermarktRecords);
const profiles = historicalProfilesData.profiles || {};
const bestXiTargetProfiles = Object.values(profiles).filter((profile) => profile?.bestXiSelection === true);
let inheritedCount = 0;
let transfermarktCount = 0;
let transfermarktImageCount = 0;
let transfermarktBirthDateCount = 0;
let transfermarktPeakValueCount = 0;
let curatedDirectImageCount = 0;
let invalidTransfermarktCount = 0;
let invalidInheritedImageCount = 0;
let rejectedWikimediaImageCount = 0;
let rejectedFinalSemiImageCount = 0;
let wikimediaCount = 0;
let skippedExistingCount = 0;
let lookedUpCount = 0;
const lookupFailures = [];
const finalSemiTargetProfileKeys = finalSemiTargetsOnly
  ? collectFinalSemiTargetProfileKeys(historyData, historicalProfilesData.profiles || {})
  : new Set();

const enrichmentProfiles = bestXiTargetsOnly ? bestXiTargetProfiles : Object.values(profiles);
for (const profile of enrichmentProfiles) {
  if (clearInvalidTransfermarktFields(profile)) {
    invalidTransfermarktCount += 1;
  }
  if (clearInvalidInheritedImageFields(profile, currentImageLookup)) {
    invalidInheritedImageCount += 1;
  }
  if (clearRejectedWikimediaImageFields(profile)) {
    rejectedWikimediaImageCount += 1;
    if (finalSemiTargetProfileKeys.has(profile.profileKey)) {
      rejectedFinalSemiImageCount += 1;
    }
  }

  const curatedDirectImage = curatedDirectImageOverrides.get(
    `${Number(profile.tournamentYear)}:${normalizePlayerName(profile.name)}`
  );
  if (curatedDirectImage?.imageUrl) {
    replaceWithCuratedDirectImageFields(profile, curatedDirectImage);
    curatedDirectImageCount += 1;
  } else if (profile.imageUrl) {
    skippedExistingCount += 1;
  }

  if (!profile.imageUrl) {
    const inheritedImageFields = currentImageLookup.get(
      getCurrentImageLookupKey(profile.name, profile.teamName)
    );
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
  if (bestXiTargetsOnly) {
    return profile.bestXiSelection === true;
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
const coverageImageCount = countHistoricalCoverageImages(historyData, profiles);
const bestXiImageCount = bestXiTargetProfiles.filter((profile) => profile.imageUrl).length;
const finalSemiImageCount = finalSemiTargetProfileKeys.size
  ? [...finalSemiTargetProfileKeys].filter((profileKey) => profiles[profileKey]?.imageUrl).length
  : 0;
const sourceIds = new Set(historicalProfilesData.sourceIds || []);
sourceIds.delete(curatedWebPortraitSourceId);
if (imageCount > 0) {
  sourceIds.add(commonsSourceId);
}
if (transfermarktCount > 0) {
  sourceIds.add(transfermarktSourceId);
}
if (Object.values(profiles).some((profile) => profile.imageSource === wikipediaSummarySourceId)) {
  sourceIds.add(wikipediaSummarySourceId);
}
if (Object.values(profiles).some((profile) => profile.imageSource === curatedWebPortraitSourceId)) {
  sourceIds.add(curatedWebPortraitSourceId);
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
      "Historical cards reuse current profile photos for matching active players, add conservative Transfermarkt dataset photos/birth dates/peak values when name and country match, add Wikipedia/Wikimedia photos when the page match passes footballer checks or a curated title override, and use reviewed official or editorial portraits for the small set with no safe open portrait.",
    minimumImageCount: Math.max(adjustedMinimumImageCount, coverageImageCount),
    ...(bestXiTargetProfiles.length
      ? {
          bestXiImageStatus: "editorial-best-xi-starters-and-honourable-mentions",
          bestXiImageTargetCount: bestXiTargetProfiles.length,
          bestXiImageCount,
          minimumBestXiImageCount: Math.max(
            Number(historicalProfilesData.coverage?.minimumBestXiImageCount || 0),
            bestXiImageCount
          )
        }
      : {}),
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
    `Historical card coverage photos: ${coverageImageCount}.`,
    `Inherited from current profiles: ${inheritedCount}.`,
    `Enriched from Transfermarkt dataset: ${transfermarktCount} profiles (${transfermarktImageCount} photos, ${transfermarktBirthDateCount} birth dates, ${transfermarktPeakValueCount} peak values).`,
    invalidTransfermarktCount ? `Removed implausible Transfermarkt matches: ${invalidTransfermarktCount}.` : "",
    invalidInheritedImageCount ? `Removed cross-country inherited-image matches: ${invalidInheritedImageCount}.` : "",
    rejectedWikimediaImageCount ? `Removed unsuitable Wikimedia matches: ${rejectedWikimediaImageCount}.` : "",
    `Added from Wikipedia/Wikimedia: ${wikimediaCount}.`,
    `Added from reviewed official/editorial portraits: ${curatedDirectImageCount}.`,
    `Already had photos: ${skippedExistingCount}.`,
    finalSemiTargetProfileKeys.size
      ? `Final/Semi-finals targeted photos: ${finalSemiImageCount}/${finalSemiTargetProfileKeys.size}.`
      : "",
    bestXiTargetProfiles.length
      ? `Best XI targeted photos: ${bestXiImageCount}/${bestXiTargetProfiles.length}.`
      : "",
    `Wikimedia lookups attempted: ${lookedUpCount}.`,
    lookupLimit > 0 ? `Lookup limit applied: ${lookupLimit}.` : "",
    exactTitleOnly ? "Exact-title-only Wikimedia mode: yes." : "",
    exactTitleBatch ? `Exact-title batch Wikimedia mode: yes (${batchLookupSize} per batch).` : "",
    exactTitleVariants ? "Exact-title variant mode: yes." : "",
    wikidataP18Batch ? "Wikidata P18 fallback mode: yes." : "",
    bestXiTargetsOnly ? "Best-XI-only enrichment mode: yes." : "",
    curatedOnly ? "Curated-only Wikimedia mode: yes." : "",
    lookupFailures.length ? `Lookup failures: ${lookupFailures.slice(0, 8).join("; ")}` : ""
  ]
    .filter(Boolean)
    .join("\n")
);
