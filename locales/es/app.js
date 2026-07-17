import {
  getGeneratedPlayerCardCopy,
  getPlayerSkillCategory,
  isGeneratedPlayerCardCopy
} from "../player-note-templates.js";

const UI = {
  adminMessage: "Mensaje del sitio",
  adminMessageDismiss: "Cerrar mensaje",
  adminMessageLabel: "Nota del sitio",
  appName: "Mundial simplificado",
  appHomeLabel: "Inicio de Mundial simplificado",
  calendarNextMonth: "Mes siguiente",
  calendarPrevious: "Anterior",
  calendarPreviousMonth: "Mes anterior",
  calendarToday: "Hoy",
  calendarWeekdays: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
  calendarYesterday: "Ayer",
  catchUp: "Ponte al día",
  catchUpDialog: "Resumen rápido",
  chooseMatchDate: "Elegir fecha del partido",
  chooseStandingsYear: "Elegir año de la clasificación",
  clearCountrySearch: "Borrar búsqueda de selección",
  countrySearch: "Buscar partidos por selección",
  groups: "Grupos",
  darkMode: "Modo oscuro",
  language: "Idioma",
  languageEnglish: "English",
  languageChinese: "中文",
  languageSpanish: "Español",
  languageKorean: "한국어",
  languageLoadFailed: "No se pudo cambiar el idioma",
  languageSwitching: "Cambiando idioma",
  juggleBall: "Balón de fútbol",
  juggleCurrent: "Racha actual de toques",
  juggleRecord: "Mejor racha de toques",
  juggleRecordAction: "Dejar caer el balón",
  matches: "Partidos",
  matchDetails: "Detalles del partido",
  matchesHeading: "Partidos y detalles del partido seleccionado",
  matchesList: "Partidos",
  month: "Mes",
  past24Hours: "Partidos recientes",
  reportIssue: "Reportar un problema",
  searchCountryPlaceholder: "Buscar selección",
  settings: "Configuración",
  showYesterday: "Mostrar partidos recientes",
  standings: "Clasificación",
  standingsSections: "Secciones de la clasificación",
  standingsSummary:
    "Los dos primeros de cada grupo avanzan. Los ocho mejores terceros también pasan a dieciseisavos de final.",
  thirdPlaceRace: "Clasificación de terceros",
  timeZone: "Zona horaria",
  timeZoneChoose: "Elegir zona horaria",
  timeZoneClose: "Cerrar selector de zona horaria",
  timeZoneDefault: "Predeterminado",
  timeZoneNoResults: "No hay zonas horarias coincidentes",
  timeZonePopular: "Populares",
  timeZoneRecent: "Recientes",
  timeZoneSearchPlaceholder: "Buscar ciudad, país o abreviatura",
  timeZoneSearchResults: "Resultados de búsqueda",
  tournament: "Fase eliminatoria",
  worldCupViews: "Secciones del Mundial"
};

const TEAM_ROWS = [
  ["MEX", "Mexico", "México"],
  ["KOR", "South Korea", "Corea del Sur"],
  ["CZE", "Czechia", "Chequia"],
  ["RSA", "South Africa", "Sudáfrica"],
  ["CAN", "Canada", "Canadá"],
  ["BIH", "Bosnia and Herzegovina", "Bosnia y Herzegovina"],
  ["QAT", "Qatar", "Catar"],
  ["SUI", "Switzerland", "Suiza"],
  ["BRA", "Brazil", "Brasil"],
  ["MAR", "Morocco", "Marruecos"],
  ["HAI", "Haiti", "Haití"],
  ["SCO", "Scotland", "Escocia"],
  ["USA", "United States", "Estados Unidos"],
  ["PAR", "Paraguay", "Paraguay"],
  ["AUS", "Australia", "Australia"],
  ["TUR", "Türkiye", "Turquía"],
  ["GER", "Germany", "Alemania"],
  ["ECU", "Ecuador", "Ecuador"],
  ["CIV", "Côte d'Ivoire", "Costa de Marfil"],
  ["CUW", "Curaçao", "Curazao"],
  ["SWE", "Sweden", "Suecia"],
  ["NED", "Netherlands", "Países Bajos"],
  ["JPN", "Japan", "Japón"],
  ["TUN", "Tunisia", "Túnez"],
  ["IRN", "IR Iran", "Irán"],
  ["NZL", "New Zealand", "Nueva Zelanda"],
  ["BEL", "Belgium", "Bélgica"],
  ["EGY", "Egypt", "Egipto"],
  ["URU", "Uruguay", "Uruguay"],
  ["KSA", "Saudi Arabia", "Arabia Saudita"],
  ["ESP", "Spain", "España"],
  ["CPV", "Cabo Verde", "Cabo Verde"],
  ["NOR", "Norway", "Noruega"],
  ["FRA", "France", "Francia"],
  ["SEN", "Senegal", "Senegal"],
  ["IRQ", "Iraq", "Irak"],
  ["ARG", "Argentina", "Argentina"],
  ["AUT", "Austria", "Austria"],
  ["JOR", "Jordan", "Jordania"],
  ["ALG", "Algeria", "Argelia"],
  ["POR", "Portugal", "Portugal"],
  ["COD", "DR Congo", "RD del Congo"],
  ["UZB", "Uzbekistan", "Uzbekistán"],
  ["COL", "Colombia", "Colombia"],
  ["ENG", "England", "Inglaterra"],
  ["CRO", "Croatia", "Croacia"],
  ["GHA", "Ghana", "Ghana"],
  ["PAN", "Panama", "Panamá"]
];

const TEAMS = Object.fromEntries(TEAM_ROWS.map(([id, , localized]) => [id, localized]));
const TEAM_NAMES = Object.fromEntries(
  TEAM_ROWS.flatMap(([id, english, localized]) => [
    [english, localized],
    [id, localized]
  ])
);
Object.assign(TEAM_NAMES, {
  "Bosnia-Herzegovina": "Bosnia y Herzegovina",
  "Cape Verde": "Cabo Verde",
  "Congo DR": "RD del Congo",
  "Cote d'Ivoire": "Costa de Marfil",
  Curacao: "Curazao",
  Iran: "Irán",
  Korea: "Corea del Sur",
  "Korea Republic": "Corea del Sur",
  "Republic of Korea": "Corea del Sur",
  Turkey: "Turquía",
  USA: "Estados Unidos",
  Angola: "Angola",
  Bolivia: "Bolivia",
  Bulgaria: "Bulgaria",
  Cameroon: "Camerún",
  Chile: "Chile",
  China: "China",
  "Costa Rica": "Costa Rica",
  Cuba: "Cuba",
  "Czech Republic": "República Checa",
  Czechoslovakia: "Checoslovaquia",
  Denmark: "Dinamarca",
  "Dutch East Indies": "Indias Orientales Neerlandesas",
  "East Germany": "Alemania Oriental",
  "El Salvador": "El Salvador",
  Greece: "Grecia",
  Honduras: "Honduras",
  Hungary: "Hungría",
  Iceland: "Islandia",
  Ireland: "Irlanda",
  Israel: "Israel",
  Italy: "Italia",
  Jamaica: "Jamaica",
  Kuwait: "Kuwait",
  Nigeria: "Nigeria",
  "North Korea": "Corea del Norte",
  "Northern Ireland": "Irlanda del Norte",
  Peru: "Perú",
  Poland: "Polonia",
  Romania: "Rumania",
  Russia: "Rusia",
  Serbia: "Serbia",
  "Serbia and Montenegro": "Serbia y Montenegro",
  Slovakia: "Eslovaquia",
  Slovenia: "Eslovenia",
  "Soviet Union": "Unión Soviética",
  Togo: "Togo",
  "Trinidad and Tobago": "Trinidad y Tobago",
  Ukraine: "Ucrania",
  "United Arab Emirates": "Emiratos Árabes Unidos",
  Wales: "Gales",
  "West Germany": "Alemania Occidental",
  Yugoslavia: "Yugoslavia",
  Zaire: "Zaire"
});

const TIME_ZONES = {
  UTC: "Tiempo universal coordinado",
  "America/Los_Angeles": "Los Ángeles",
  "America/Vancouver": "Vancouver",
  "America/Denver": "Denver",
  "America/Chicago": "Chicago",
  "America/Mexico_City": "Ciudad de México",
  "America/New_York": "Nueva York",
  "America/Toronto": "Toronto",
  "America/Sao_Paulo": "São Paulo",
  "Europe/London": "Londres",
  "Europe/Paris": "París",
  "Europe/Madrid": "Madrid",
  "Europe/Berlin": "Berlín",
  "Africa/Casablanca": "Casablanca",
  "Africa/Lagos": "Lagos",
  "Africa/Johannesburg": "Johannesburgo",
  "Asia/Dubai": "Dubái",
  "Asia/Kolkata": "Calcuta",
  "Asia/Bangkok": "Bangkok",
  "Asia/Shanghai": "Shanghái",
  "Asia/Tokyo": "Tokio",
  "Australia/Sydney": "Sídney"
};

const VENUE_NAMES = {
  "Atlanta Stadium": "Estadio de Atlanta",
  "Boston Stadium": "Estadio de Boston",
  "Dallas Stadium": "Estadio de Dallas",
  "Estadio Guadalajara": "Estadio Guadalajara",
  "Estadio Monterrey": "Estadio Monterrey",
  "Houston Stadium": "Estadio de Houston",
  "Kansas City Stadium": "Estadio de Kansas City",
  "Los Angeles Stadium": "Estadio de Los Ángeles",
  "Mexico City Stadium": "Estadio de Ciudad de México",
  "Miami Stadium": "Estadio de Miami",
  "New York New Jersey Stadium": "Estadio de Nueva York Nueva Jersey",
  "Philadelphia Stadium": "Estadio de Filadelfia",
  "San Francisco Bay Area Stadium": "Estadio del Área de la Bahía de San Francisco",
  "Seattle Stadium": "Estadio de Seattle",
  "Toronto Stadium": "Estadio de Toronto",
  "BC Place Vancouver": "BC Place de Vancouver",
  "Vancouver Stadium": "Estadio de Vancouver"
};

const VENUE_LOCATIONS = {
  "Atlanta Stadium": "Atlanta, Georgia, Estados Unidos",
  "Boston Stadium": "Foxborough, Massachusetts, Estados Unidos",
  "Dallas Stadium": "Arlington, Texas, Estados Unidos",
  "Estadio Guadalajara": "Guadalajara, Jalisco, México",
  "Estadio Monterrey": "Monterrey, Nuevo León, México",
  "Houston Stadium": "Houston, Texas, Estados Unidos",
  "Kansas City Stadium": "Kansas City, Misuri, Estados Unidos",
  "Los Angeles Stadium": "Inglewood, California, Estados Unidos",
  "Mexico City Stadium": "Ciudad de México, México",
  "Miami Stadium": "Miami Gardens, Florida, Estados Unidos",
  "New York New Jersey Stadium": "East Rutherford, Nueva Jersey, Estados Unidos",
  "Philadelphia Stadium": "Filadelfia, Pensilvania, Estados Unidos",
  "San Francisco Bay Area Stadium": "Santa Clara, California, Estados Unidos",
  "Seattle Stadium": "Seattle, Washington, Estados Unidos",
  "Toronto Stadium": "Toronto, Ontario, Canadá",
  "BC Place Vancouver": "Vancouver, Columbia Británica, Canadá",
  "Vancouver Stadium": "Vancouver, Columbia Británica, Canadá"
};

const STAGES = {
  group: "Fase de grupos",
  "group-stage": "Fase de grupos",
  "preliminary-round": "Ronda preliminar",
  "first-round": "Primera ronda",
  "second-round": "Segunda ronda",
  "final-round": "Ronda final",
  "round-of-32": "Dieciseisavos de final",
  "round-of-16": "Octavos de final",
  "quarter-finals": "Cuartos de final",
  "semi-finals": "Semifinales",
  "bronze-final": "Partido por el tercer puesto",
  "third-place-play-off": "Partido por el tercer puesto",
  final: "Final"
};

const LINEUP_POSITIONS = {
  AM: "Mediapunta",
  LCB: "Central izquierdo",
  CB: "Defensa central",
  CM: "Centrocampista",
  DM: "Mediocentro defensivo",
  GK: "Portero",
  LB: "Lateral izquierdo",
  LM: "Centrocampista izquierdo",
  LW: "Extremo izquierdo",
  LWB: "Carrilero izquierdo",
  RB: "Lateral derecho",
  RM: "Centrocampista derecho",
  RW: "Extremo derecho",
  RWB: "Carrilero derecho",
  RCB: "Central derecho",
  ST: "Delantero centro"
};

const PLAYER_POSITIONS = {
  "attacking midfielder": "mediapunta",
  "center back": "defensa central",
  "central defender": "defensa central",
  "central midfield": "centrocampo",
  "central midfielder": "centrocampista",
  "centre back": "defensa central",
  "centre forward": "delantero centro",
  defender: "defensa",
  "defensive midfield": "mediocentro defensivo",
  "defensive midfielder": "mediocentro defensivo",
  forward: "delantero",
  "full back": "lateral",
  goalkeeper: "portero",
  "left back": "lateral izquierdo",
  "left midfielder": "centrocampista izquierdo",
  "left wing": "extremo izquierdo",
  "left wing back": "carrilero izquierdo",
  "left winger": "extremo izquierdo",
  midfielder: "centrocampista",
  "right back": "lateral derecho",
  "right midfielder": "centrocampista derecho",
  "right wing": "extremo derecho",
  "right wing back": "carrilero derecho",
  "right winger": "extremo derecho",
  "second striker": "segundo delantero",
  striker: "delantero centro",
  sweeper: "líbero",
  "wide midfielder": "centrocampista de banda",
  "wing back": "carrilero",
  winger: "extremo"
};

const EXACT = {
  "After extra time": "Tras la prórroga",
  archive: "archivo",
  "As it stands": "Así está la clasificación",
  "Best third-place race": "Clasificación de los mejores terceros",
  "Bracket details are not loaded yet.": "El cuadro todavía no está disponible.",
  "bracket details are not loaded yet.": "el cuadro todavía no está disponible.",
  Canceled: "Cancelado",
  Cancelled: "Cancelado",
  cancelled: "cancelado",
  "Choose match date": "Elegir fecha del partido",
  "Choose standings year": "Elegir año de la clasificación",
  "Clear country search": "Borrar búsqueda de selección",
  "Club to verify": "Club por confirmar",
  "Current score": "Marcador actual",
  "Data unavailable": "Datos no disponibles",
  "Data refreshed": "Datos actualizados",
  Delayed: "Retrasado",
  delayed: "retrasado",
  Draw: "Empate",
  Tie: "Empate",
  Eliminated: "Eliminado",
  ET: "Fin de la prórroga",
  "Extra time": "Prórroga",
  "First half": "Primera parte",
  "Second half": "Segunda parte",
  "Final pending": "Resultado final pendiente",
  Pending: "Pendiente",
  Postponed: "Aplazado",
  postponed: "aplazado",
  "Kickoff delayed": "Inicio retrasado",
  "Official feed has not marked this match live yet.":
    "La señal oficial todavía no ha marcado el partido como en vivo.",
  "Final score": "Marcador final",
  Final: "Final",
  FT: "Final",
  "Full time": "Final del partido",
  aet: "tras la prórroga",
  "Half-time": "Descanso",
  HT: "Descanso",
  Live: "En vivo",
  "Live score": "Marcador en vivo",
  Suspended: "Suspendido",
  Interrupted: "Interrumpido",
  Break: "Pausa",
  "Penalty shootout": "Tanda de penales",
  Penalties: "Penales",
  local: "hora local",
  "Current time unavailable": "Hora actual no disponible",
  "No matches": "No hay partidos",
  "No previous World Cup month": "No hay un mes anterior del Mundial",
  "No next World Cup month": "No hay un mes siguiente del Mundial",
  "no World Cup matches scheduled": "no hay partidos del Mundial programados",
  "Loading catch-up notes": "Cargando el resumen",
  "Loading matches": "Cargando partidos",
  "Loading release notes": "Cargando notas de la versión",
  "Loading standings": "Cargando la clasificación",
  Language: "Idioma",
  "Dark mode": "Modo oscuro",
  Settings: "Configuración",
  "Time zone": "Zona horaria",
  Standings: "Clasificación",
  Tournament: "Fase eliminatoria",
  Month: "Mes",
  "Recent matches": "Partidos recientes",
  "Show recent matches": "Mostrar partidos recientes",
  "Hide recent matches": "Ocultar partidos recientes",
  "Search country": "Buscar selección",
  Matches: "Partidos",
  "Matches and selected match details": "Partidos y detalles del partido seleccionado",
  Groups: "Grupos",
  Group: "Grupo",
  "Group stage": "Fase de grupos",
  "Group round": "Fase de grupos",
  "Group standings": "Clasificación del grupo",
  "Third-place standings across all groups. The top eight advance.":
    "Clasificación de los terceros de todos los grupos. Los ocho mejores avanzan.",
  Advancing: "Clasificado",
  "Advancing now": "Clasificado en este momento",
  "Advancing to Round of 32.": "Clasificado a dieciseisavos de final.",
  "Advancing to Round of 32 as a top-eight third-place team.":
    "Clasificado a dieciseisavos como uno de los ocho mejores terceros.",
  "Not advancing": "Fuera de clasificación",
  "Not advancing. Eliminated at group stage.": "No avanza. Eliminado en la fase de grupos.",
  "Eliminated at group stage.": "Eliminado en la fase de grupos.",
  "Outside the top eight third-place teams.": "Fuera de los ocho mejores terceros.",
  "Inside the top eight best third-place teams.": "Entre los ocho mejores terceros.",
  "Inside the top eight right now, but close to the cut line.":
    "Entre los ocho mejores por ahora, pero cerca de la línea de corte.",
  "Just inside": "Apenas dentro",
  "Just outside": "Apenas fuera",
  Chance: "Probabilidad",
  "Games Left": "Partidos restantes",
  Rank: "Pos.",
  Pts: "Pts",
  MP: "PJ",
  W: "G",
  D: "E",
  L: "P",
  GF: "GF",
  GA: "GC",
  GD: "DG",
  Goals: "Goles",
  "Goal difference": "Diferencia de goles",
  "Final round": "Ronda final",
  "Final Round": "Ronda final",
  "Final round standings": "Clasificación de la ronda final",
  "Second round": "Segunda ronda",
  "First round": "Primera ronda",
  "First round, Replays": "Primera ronda, desempates",
  "Preliminary round": "Ronda preliminar",
  "Round of 32": "Dieciseisavos de final",
  "Round of 16": "Octavos de final",
  "Quarter-finals": "Cuartos de final",
  "Quarter-finals, Replays": "Cuartos de final, desempates",
  Quarterfinals: "Cuartos de final",
  "Semi-finals": "Semifinales",
  Semifinals: "Semifinales",
  "Group 1 Play-off": "Desempate del Grupo 1",
  "Group 2 Play-off": "Desempate del Grupo 2",
  "Group 3 Play-off": "Desempate del Grupo 3",
  "Group 4 Play-off": "Desempate del Grupo 4",
  "3rd place match": "Partido por el tercer puesto",
  "Knockout context": "Contexto de las eliminatorias",
  "Knockout match": "Partido eliminatorio",
  "Knockout path": "Camino en las eliminatorias",
  "Knockout winner progression": "Avance de los ganadores",
  "Tournament path": "Camino en el torneo",
  "Tournament progression": "Avance en el torneo",
  "Likely for now": "Proyección actual",
  "likely for now": "proyección actual",
  "Later matches": "Partidos posteriores",
  "Path below": "Camino mostrado abajo",
  "Predicted matchup; participants come from current knockout-path estimates.":
    "Cruce proyectado; los participantes se basan en la estimación actual del cuadro.",
  "FIFA World Cup": "Copa Mundial de la FIFA",
  "FIFA World Cup qualifier": "Eliminatorias para la Copa Mundial",
  Friendly: "Amistoso",
  "International Friendly": "Amistoso internacional",
  "Gold Cup": "Copa Oro",
  Olympics: "Juegos Olímpicos",
  "UEFA Euro": "Eurocopa",
  "UEFA Euro qualifier": "Eliminatorias para la Eurocopa",
  "UEFA Nations League": "Liga de Naciones de la UEFA",
  "Latest changes": "Últimos cambios",
  "release notes": "notas de la versión",
  "Report issue": "Reportar un problema",
  "Read source": "Ver fuente",
  "Key information": "Información clave",
  "Key information is not loaded yet.": "La información clave todavía no está disponible.",
  "Key information will be populated based on the opponent.":
    "La información clave se completará según el rival.",
  "Key information will be populated once this matchup is confirmed.":
    "La información clave se completará cuando se confirme este cruce.",
  "Past matches": "Partidos anteriores",
  "Past World Cup meetings": "Enfrentamientos previos en Mundiales",
  "Box entries from multiple lines": "Llegadas al área desde varias líneas",
  "Low-margin patience and shootout nerve": "Paciencia en un partido cerrado y temple en los penales",
  "Box protection and patient spacing": "Protección del área y ocupación paciente de los espacios",
  "Forward-heavy pressure": "Presión con muchos atacantes",
  "Midfield numbers and tempo control": "Superioridad en el medio y control del ritmo",
  "Defensive base with direct exits": "Base defensiva y salidas directas",
  "Central spine and matchup control": "Columna central y control de los duelos",
  "Compact squad shape": "Bloque compacto",
  "Canceled fixture kept as squad context": "Partido cancelado conservado como contexto de la plantilla",
  "third-place matchup": "partido por el tercer puesto",
  "final matchup": "final",
  Unavailable: "No disponible",
  "2026 FIFA World Cup venue": "Sede del Mundial 2026",
  "their opponent": "su rival",
  match: "partido",
  "Past meetings not loaded yet.": "Los enfrentamientos previos todavía no están disponibles.",
  "No verified senior meetings found before this match.":
    "No se encontraron enfrentamientos absolutos verificados antes de este partido.",
  Prediction: "Pronóstico",
  "Predictions are unofficial.": "Los pronósticos no son oficiales.",
  "No verified projection is loaded for this fixture yet.":
    "Todavía no hay una proyección verificada para este partido.",
  "Forecast from online sources": "Pronóstico de fuentes en línea",
  "Local preview estimate. Not betting odds.": "Estimación local de previa. No son cuotas de apuestas.",
  Player: "Jugador",
  Bench: "Suplentes",
  Coach: "Entrenador",
  "Head Coach": "Director técnico",
  Formation: "Formación",
  "Formation & events": "Formación e incidencias",
  Formations: "Formaciones",
  Goal: "Gol",
  Assist: "Asistencia",
  "Red card": "Tarjeta roja",
  "Yellow card": "Tarjeta amarilla",
  Substitution: "Cambio",
  "Substituted off": "Sustituido",
  "Substituted on": "Ingresó como suplente",
  "Line ups": "Alineaciones",
  "Line-ups": "Alineaciones",
  Lineups: "Alineaciones",
  "Line-ups (predicted)": "Alineaciones probables",
  "Expected lineups": "Alineaciones previstas",
  "Probable lineups": "Alineaciones probables",
  "Official lineups": "Alineaciones oficiales",
  "Confirmed lineups": "Alineaciones confirmadas",
  "Confirmed lineup record": "Registro de alineación confirmada",
  "Final lineup record": "Registro de la alineación definitiva",
  "Live lineup record": "Registro de alineación en vivo",
  "Official FIFA lineup": "Alineación oficial de la FIFA",
  "Official FIFA live lineup": "Alineación oficial en vivo de la FIFA",
  "Predicted lineups": "Alineaciones probables",
  "Predicted from recent official lineups": "Proyección basada en alineaciones oficiales recientes",
  "Predicted from online sources": "Proyección de fuentes en línea",
  "Informed by published team reports": "Basado en reportes publicados sobre la selección",
  "This was the final lineup for the match.": "Esta fue la alineación definitiva del partido.",
  "This feature is still work in progress and may not be accurate.":
    "Esta función sigue en desarrollo y puede contener imprecisiones.",
  "Evidence strength": "Solidez de la evidencia",
  Checked: "Verificado",
  Sources: "Fuentes",
  "low confidence": "confianza baja",
  "medium confidence": "confianza media",
  "high confidence": "confianza alta",
  "Position to verify": "Posición por confirmar",
  "Goal scorer": "Goleador",
  "Goal threat": "Amenaza de gol",
  "Match plan": "Plan de partido",
  "Made by": "Hecho por",
  "Est. value": "Valor estimado",
  "Value": "Valor",
  "Prime": "Máximo",
  "Loading archive player profile": "Cargando perfil histórico del jugador",
  "Historic World Cup record": "Historial mundialista",
  "Hide previous World Cups": "Ocultar Mundiales anteriores",
  "Peak value": "Valor máximo",
  "Estimated market value, shaped by public valuations, age, club level, role, and recent form.":
    "Valor de mercado estimado a partir de valoraciones públicas, edad, nivel del club, función y rendimiento reciente.",
  "Market value from sourced player valuation data.":
    "Valor de mercado procedente de datos públicos de valoración de jugadores.",
  "Career-high market value from the Transfermarkt dataset.":
    "Valor de mercado máximo de su carrera según los datos de Transfermarkt.",
  "Career peak market value from the Transfermarkt dataset; not an exact match-day value.":
    "Valor de mercado máximo de su carrera según los datos de Transfermarkt; no es una cifra exacta del día del partido.",
  "Tournament-year market value; shown only when a versioned source is available.":
    "Valor de mercado del año del torneo; solo se muestra cuando existe una fuente con fecha.",
  "Penalty pressure": "Presión en los penales",
  "Impact sub": "Revulsivo",
  "Archive standout": "Figura histórica",
  "Historical lens": "Perspectiva histórica",
  "Can struggle with": "Puede sufrir ante",
  "Good at": "Se destaca en",
  "No scorer data loaded.": "No hay datos de goleadores disponibles.",
  "Unknown scorer": "Goleador desconocido",
  "Own goal": "Autogol",
  "own goal": "autogol",
  "No catch-up notes loaded yet": "Todavía no hay un resumen disponible",
  "Not loaded": "No disponible",
  Next: "Siguiente",
  Previous: "Anterior",
  "Previous matches": "Partidos anteriores",
  "Previous World Cups": "Mundiales anteriores",
  "Play highlights on YouTube": "Ver el resumen en YouTube",
  Result: "Resultado",
  TBD: "Por definir",
  Winner: "Ganador",
  Loser: "Perdedor",
  Confirmed: "Confirmado",
  Qualified: "Clasificado"
};

const STYLE_TERMS = {
  "Aerial duels": "Duelos aéreos",
  "Aerial pressure": "Presión por alto",
  "Aerial targets": "Referencias aéreas",
  "Aggressive midfield pressure with direct runners": "Presión agresiva en el medio con llegadas verticales",
  "Aggressive wide play with a fearless defensive edge": "Ataque decidido por las bandas y defensa sin concesiones",
  "Athletic pressing with direct attacking bursts": "Presión física con aceleraciones verticales",
  "Back-line command": "Mando de la defensa",
  "Back-line courage": "Valentía en la salida defensiva",
  "Back-line passing": "Pase desde la defensa",
  "Back-three cover": "Cobertura con línea de tres",
  "Between-lines craft": "Creatividad entre líneas",
  "Box battles": "Duelos en el área",
  "Box entries": "Llegadas al área",
  "Box finishers supplied by runners between the lines": "Definidores en el área abastecidos por llegadas entre líneas",
  "Box finishing": "Definición en el área",
  "Box power": "Potencia en el área",
  "Box presence": "Presencia en el área",
  "Box pressure": "Presión en el área",
  "Box runs": "Desmarques al área",
  "Central control": "Control del centro",
  "Central overloads": "Superioridad por dentro",
  "Central rhythm": "Ritmo por dentro",
  "Chance creation": "Creación de ocasiones",
  "Channel cover": "Cobertura de los canales",
  "Channel runs": "Desmarques por los canales",
  "Combination flair": "Talento asociativo",
  "Committed defending with quick outlets through midfield": "Defensa comprometida con salidas rápidas por el medio",
  "Compact block": "Bloque compacto",
  "Compact cover": "Cobertura compacta",
  "Compact defending": "Defensa compacta",
  "Compact defending with quick counters into space": "Defensa compacta y contragolpes rápidos al espacio",
  "Compact press": "Presión compacta",
  "Compact shape with counters into the wide lanes": "Bloque compacto con contragolpes por las bandas",
  "Compact spacing": "Distancias cortas",
  "Controlled buildup with defenders who start attacks": "Salida controlada iniciada por los defensores",
  "Counter attacks": "Contragolpes",
  "Counter runs": "Desmarques al contragolpe",
  "Counter timing": "Sincronización del contragolpe",
  "Counter width": "Amplitud al contragolpe",
  "Counter-press": "Presión tras pérdida",
  "Counterattacking width with clever movement off the striker":
    "Amplitud al contragolpe y movimientos inteligentes alrededor del delantero",
  "Creative midfield passing with sudden attacking spark": "Pase creativo en el medio y aceleraciones ofensivas repentinas",
  "Creative passing": "Pase creativo",
  "Creative passing supply with attackers between lines": "Pase creativo para atacantes entre líneas",
  "Cross volume": "Volumen de centros",
  "Deep block": "Bloque bajo",
  "Deep buildup": "Salida desde campo propio",
  "Deep resilience": "Resistencia en bloque bajo",
  "Defensive block": "Bloque defensivo",
  "Defensive grit with fast breaks through the channels": "Solidez defensiva y salidas rápidas por los canales",
  "Depth scoring": "Goles desde segunda línea",
  "Diagonal runs": "Desmarques diagonales",
  "Direct combinations": "Combinaciones verticales",
  "Direct counters": "Contragolpes directos",
  "Direct outlets": "Salidas directas",
  "Direct pace and physical pressure in transition": "Velocidad vertical y presión física en transición",
  "Direct service": "Juego directo",
  "Direct supply into elite penalty-box finishing": "Abastecimiento directo para una definición de élite en el área",
  "Direct target play and committed box defending": "Juego directo con referencia y defensa firme del área",
  "Disciplined defensive shape with dangerous transitions": "Estructura defensiva disciplinada y transiciones peligrosas",
  "Duel pressure": "Presión en los duelos",
  "Duel strength": "Fortaleza en los duelos",
  "Early crosses": "Centros tempranos",
  "Early service": "Envíos rápidos al área",
  "Early shots": "Remates rápidos",
  "Explosive runners turning pressure into open-field danger": "Desmarques explosivos que convierten la presión en peligro a campo abierto",
  "Explosive transitions layered over deep attacking talent": "Transiciones explosivas respaldadas por mucho talento ofensivo",
  "Explosive wide attacks that stretch back lines": "Ataques explosivos por fuera que estiran la defensa",
  "Fast breaks backed by elite recovery defending": "Salidas rápidas respaldadas por una recuperación defensiva de élite",
  "Fast counters": "Contragolpes rápidos",
  "Fast right-sided attacks with direct goal threat": "Ataques rápidos por derecha con amenaza directa de gol",
  "Final-third depth": "Profundidad en el último tercio",
  "Final-third pressure": "Presión en el último tercio",
  "Fluid attacking rotations with ruthless central control": "Rotaciones ofensivas fluidas y control implacable por dentro",
  "Forward depth": "Profundidad en ataque",
  "Forward power": "Potencia ofensiva",
  "Forward press": "Presión de los delanteros",
  "Fullback service": "Aporte de los laterales",
  "Fullback thrust": "Proyección de los laterales",
  "Half-space passing": "Pase por los intervalos",
  "Half-space runs": "Desmarques por los intervalos",
  "High circulation": "Circulación en campo rival",
  "High press": "Presión alta",
  "High pressing designed to turn recoveries into shots": "Presión alta para convertir recuperaciones en remates",
  "High-energy pressing with vertical midfield punch": "Presión intensa con llegada vertical desde el medio",
  "Interior passing": "Pase interior",
  "Keeper saves": "Atajadas del portero",
  "Late arrivals": "Llegadas desde segunda línea",
  "Late runners": "Llegadores desde atrás",
  "Late runs": "Llegadas tardías",
  "Left balance": "Equilibrio por izquierda",
  "Left-footed creativity driving patient attacks": "Creatividad zurda para impulsar ataques pacientes",
  "Left-side pace": "Velocidad por izquierda",
  "Long shots": "Remates de larga distancia",
  "Loose-ball pressure": "Presión sobre el segundo balón",
  "Low block": "Bloque bajo",
  "Midfield balance": "Equilibrio en el medio",
  "Midfield bite": "Intensidad en el medio",
  "Midfield duels": "Duelos en el medio",
  "Midfield patience that keeps matches under control": "Paciencia en el medio para mantener el partido bajo control",
  "Midfield power": "Potencia en el medio",
  "Midfield press": "Presión en el medio",
  "Midfield shield": "Protección del mediocampo",
  "Midfield tempo": "Ritmo en el medio",
  "Midfield tempo with brave fullback support": "Ritmo en el medio con apoyo decidido de los laterales",
  "Midfield traps": "Trampas de presión en el medio",
  "One-on-one attackers who can tilt any match": "Atacantes desequilibrantes en el uno contra uno",
  "Open-field runs": "Desmarques a campo abierto",
  "Organized defending with a brave buildup spine": "Defensa organizada y una columna vertebral valiente en la salida",
  "Organized pressure and relentless midfield running": "Presión organizada y despliegue incansable en el medio",
  "Patient counters with wide delivery and deep resilience": "Contragolpes pacientes, servicio por fuera y resistencia en campo propio",
  "Patient possession looking for sudden final-third craft": "Posesión paciente en busca de creatividad repentina en el último tercio",
  "Physical control with direct runners behind": "Control físico con desmarques directos a la espalda",
  "Physical forward play built for open-field breaks": "Juego físico de los delanteros para atacar a campo abierto",
  "Pocket passing": "Pase en espacios reducidos",
  "Possession patience": "Paciencia con el balón",
  "Power through midfield with pace on the edges": "Potencia en el medio y velocidad por las bandas",
  "Press control": "Control de la presión",
  "Press escape": "Salida de la presión",
  "Press resistance": "Resistencia a la presión",
  Pressing: "Presión",
  "Pressing forwards and midfield control protect the rhythm": "La presión de los delanteros y el control del medio sostienen el ritmo",
  "Pressing lines": "Líneas de presión",
  "Pressing traps": "Trampas de presión",
  "Pressing waves": "Oleadas de presión",
  "Quick combinations looking for sudden final-third moments": "Combinaciones rápidas para desequilibrar en el último tercio",
  "Quick passing": "Pase rápido",
  "Quick releases": "Descargas rápidas",
  "Quick rotations": "Rotaciones rápidas",
  "Relentless passing that breaks defenses apart": "Circulación constante que desarma defensas",
  "Relentless running and delivery from wide zones": "Despliegue incansable y servicio desde las bandas",
  "Right-side breaks": "Arranques por derecha",
  "Second balls": "Segundos balones",
  "Set pieces": "Balón parado",
  "Set-piece bite": "Peligro a balón parado",
  "Set-piece threat": "Amenaza a balón parado",
  "Set-piece threat with hard-running midfield cover": "Amenaza a balón parado con cobertura incansable del medio",
  "Shot stopping": "Atajadas",
  "Structured midfield control with disciplined spacing": "Control estructurado del medio con distancias disciplinadas",
  Switches: "Cambios de orientación",
  "Target outlets": "Salidas con un referente",
  "Target play": "Juego con un referente",
  "Target play and physical duels define the rhythm": "El juego con referencia y los duelos físicos marcan el ritmo",
  "Technical depth creating chances from every lane": "Calidad técnica para crear ocasiones desde todos los carriles",
  "Technical midfield": "Mediocampo técnico",
  "Technical tempo and quick rotations between lines": "Ritmo técnico y rotaciones rápidas entre líneas",
  "Tempo control": "Control del ritmo",
  "Third-man runs": "Desmarques del tercer hombre",
  "Transition bursts": "Aceleraciones en transición",
  "Transition craft": "Calidad en transición",
  "Transition pace": "Velocidad en transición",
  "Transition speed": "Rapidez en transición",
  "Two-forward pressure with polished penalty-box work": "Presión con dos delanteros y precisión en el área",
  "Two-striker threat": "Amenaza con dos delanteros",
  "Vertical pressure around a sharp box finisher": "Presión vertical alrededor de un definidor letal en el área",
  "Vertical runs": "Desmarques verticales",
  "Veteran control trying to slow games into detail": "Experiencia para bajar el ritmo y decidir en los detalles",
  "Wide counters": "Contragolpes por las bandas",
  "Wide craft": "Creatividad por las bandas",
  "Wide delivery": "Servicio desde las bandas",
  "Wide dribbles": "Regate por las bandas",
  "Wide flair": "Talento por las bandas",
  "Wide isolation": "Uno contra uno por las bandas",
  "Wide overloads": "Superioridad por las bandas",
  "Wide pace": "Velocidad por las bandas",
  "Wide pressing": "Presión por las bandas",
  "Wide release": "Salida por las bandas",
  "Wide speed": "Rapidez por las bandas",
  "Wide surges": "Progresiones por las bandas",
  "Wide switches": "Cambios de orientación",
  "Wing flair and midfield invention in constant motion": "Talento por fuera y creatividad en el medio en movimiento constante",
  "Wing rotations": "Rotaciones por las bandas",
  "Wingback thrust": "Proyección de los carrileros"
};

Object.assign(EXACT, STYLE_TERMS);

Object.assign(EXACT, {
  "FIFA world ranking used for this 2026 tournament view.":
    "Clasificación mundial de la FIFA utilizada en esta vista del torneo de 2026.",
  "Final group table uses archived results and tournament-era tie-breakers.":
    "La tabla final del grupo usa resultados archivados y los criterios de desempate de esa edición.",
  "Final round table data is not available for this archived match.":
    "La tabla de la ronda final no está disponible para este partido histórico.",
  "Final score reflected in the current standings after source checks.":
    "El resultado final aparece en la clasificación actual tras verificar las fuentes.",
  "Group standings are not available for this archived tournament.":
    "La clasificación de grupos no está disponible para este torneo histórico.",
  "Group table data is not available for this archived match.":
    "La tabla del grupo no está disponible para este partido histórico.",
  "Knockout bracket is not available for this archived tournament.":
    "El cuadro de eliminatorias no está disponible para este torneo histórico.",
  "Live score pending": "Marcador en vivo pendiente",
  "No goals because this match was cancelled.": "No hubo goles porque el partido fue cancelado.",
  "No historical prediction is generated for cancelled fixtures.":
    "No se genera un pronóstico histórico para partidos cancelados.",
  "No loaded group-round results yet.": "Todavía no hay resultados de la fase de grupos disponibles.",
  "No loaded source matches yet.": "Todavía no hay partidos de referencia disponibles.",
  "No next knockout match is loaded yet.": "El siguiente partido eliminatorio todavía no está disponible.",
  "Round of 32 as it stands": "Así está el cuadro de dieciseisavos",
  "Round of 32 bracket center": "Centro del cuadro de dieciseisavos",
  "Round path": "Camino de la ronda",
  "Score details are not loaded for this historical record.":
    "Los detalles del marcador no están disponibles para este registro histórico.",
  "See all": "Ver todo",
  "See release notes": "Ver notas de la versión",
  "See sources": "Ver fuentes",
  "Tournament facts": "Datos del torneo",
  Forecasts: "Pronósticos",
  "Player information": "Información de jugadores",
  "Official highlights": "Resúmenes oficiales",
  "Exact sources vary by match.": "Las fuentes exactas varían según el partido.",
  "Show all matches": "Mostrar todos los partidos",
  "Show next": "Mostrar siguiente",
  "Show next match in bracket": "Mostrar el siguiente partido del cuadro",
  "Shown in current table order. Group ties use FIFA head-to-head before overall goal difference.":
    "Se muestra el orden actual de la tabla. En empates del grupo, la FIFA aplica primero el enfrentamiento directo y después la diferencia general de goles.",
  Since: "Desde",
  "The match data could not be loaded.": "No se pudieron cargar los datos del partido.",
  "The match data could not be loaded. Refresh the page to try again.":
    "No se pudieron cargar los datos del partido. Actualiza la página para volver a intentarlo.",
  "The match view could not be displayed.": "No se pudo mostrar la vista del partido.",
  "The page loaded, but something went wrong while displaying it. Refresh the page to try again.":
    "La página se cargó, pero hubo un problema al mostrarla. Actualízala para volver a intentarlo.",
  "The standings data could not be loaded. Refresh the page to try again.":
    "No se pudieron cargar los datos de la clasificación. Actualiza la página para volver a intentarlo.",
  "The standings view could not be displayed. Refresh the page to try again.":
    "No se pudo mostrar la clasificación. Actualiza la página para volver a intentarlo.",
  "Tie order follows points, goal difference, goals scored, loaded fair-play conduct when available, then FIFA ranking as the final deterministic fallback.":
    "Los empates se ordenan por puntos, diferencia de goles, goles a favor, conducta de juego limpio cuando está disponible y, por último, clasificación FIFA.",
  "Tournament bracket": "Cuadro del torneo",
  "Unable to display matches": "No se pueden mostrar los partidos",
  "Unable to display standings": "No se puede mostrar la clasificación",
  "Up next": "A continuación",
  "Yesterday and today do not have finished or live match notes yet.":
    "Ayer y hoy todavía no tienen notas de partidos finalizados o en vivo.",
  "bracket-ready": "cuadro por completar",
  "Current knockout path with likely winners filled for now. Finished results replace estimates.":
    "El cuadro actual muestra por ahora a los ganadores más probables. Los resultados definitivos sustituyen las estimaciones.",
  "Tournament path uses archived match results.": "El camino del torneo usa resultados históricos archivados.",
  "Round of 32 slots use current standings and remaining projections. Later rounds are predictions.":
    "Los lugares de dieciseisavos usan la clasificación actual y las proyecciones pendientes. Las rondas posteriores son pronósticos.",
  "Data refreshed stays separate from app release notes.":
    "La actualización de datos se muestra por separado de las notas de la versión.",
  "No remaining group result combination can move this team into a Round of 32 place.":
    "Ninguna combinación de resultados restante puede llevar a esta selección a dieciseisavos.",
  "FIFA schedule": "Calendario de la FIFA",
  "Final group tables use archived results and tournament-era tie-breakers.":
    "Las tablas finales de grupo usan resultados archivados y los criterios de desempate de cada edición.",
  "Final score is not loaded for this fixture yet.": "El resultado final de este partido todavía no está disponible.",
  ConfedCup: "Copa Confederaciones",
  Copa: "Copa América",
  Euro: "Eurocopa",
  "extra time": "prórroga",
  "the final whistle": "el pitazo final",
  "Group standings should show each current third-place team's cross-group race position.":
    "La tabla debe mostrar la posición de cada tercero en la comparación entre grupos.",
  "Local estimate using FIFA rankings. Not betting odds.":
    "Estimación local basada en la clasificación FIFA. No son cuotas de apuestas.",
  "Local historical-form estimate. Not betting odds.":
    "Estimación local basada en el rendimiento histórico. No son cuotas de apuestas.",
  "Market consensus based on public odds. Not betting advice.":
    "Consenso de mercado basado en cuotas públicas. No es asesoramiento de apuestas.",
  "Own goal record": "Registro de autogoles",
  "No loaded World Cup matches found.": "No se encontraron partidos del Mundial disponibles.",
  "Expected lineups checked": "Alineaciones previstas verificadas",
  "Probable lineups checked": "Alineaciones probables verificadas",
  "Final verified lineup": "Alineación definitiva verificada",
  "Live lineup record checked": "Registro de alineación en vivo verificado",
  "Live lineup record from official FIFA feed": "Registro de alineación en vivo de la señal oficial de la FIFA",
  "Official lineup source": "Fuente oficial de la alineación",
  "Lineup record": "Registro de alineación",
  "Lineup record checked": "Registro de alineación verificado",
  "Lineups checked": "Alineaciones verificadas",
  "Predicted lineups checked": "Alineaciones probables verificadas",
  "Predicted lineup record": "Registro de alineación probable",
  "Release notes explain app changes; Data refreshed only shows data freshness.":
    "Las notas de la versión explican cambios de la aplicación; la actualización de datos solo indica su vigencia.",
  "Release notes open in a short tooltip.": "Las notas de la versión se abren en una ayuda breve.",
  "Score unavailable": "Marcador no disponible",
  "score unavailable": "marcador no disponible",
  "Search country matches": "Buscar partidos por selección",
  "Source links stay available inside the tooltip.": "Los enlaces a las fuentes permanecen disponibles en la ayuda.",
  "Sources now open in a compact hover tooltip.": "Las fuentes se abren en una ayuda compacta al pasar el cursor.",
  "Sources:": "Fuentes:",
  Starter: "Titular",
  "Standings sections": "Secciones de la clasificación",
  Status: "Estado",
  "Estimated Round of 32 chance": "Probabilidad estimada de llegar a dieciseisavos",
  "Simple model: every unplayed group match is a win, draw, or loss.":
    "Modelo sencillo: cada partido de grupo pendiente se considera victoria, empate o derrota.",
  "Counts top-two group finishes plus best-third finishes; not official odds.":
    "Cuenta los dos primeros de cada grupo y los mejores terceros; no son probabilidades oficiales.",
  "The estimate recalculates from the loaded group-stage results.":
    "La estimación se recalcula con los resultados de la fase de grupos disponibles.",
  "Can advance either by moving top two or by staying high enough among third-place teams.":
    "Puede avanzar entrando entre los dos primeros o manteniéndose entre los mejores terceros.",
  "Best path is to move into the group top two.": "La mejor vía es entrar entre los dos primeros del grupo.",
  "Route is mainly the best-third table unless it climbs into the top two.":
    "La vía principal es la tabla de mejores terceros, salvo que suba a los dos primeros.",
  "No modeled route reaches the Round of 32 from here.":
    "Ningún escenario del modelo le permite llegar a dieciseisavos desde esta posición.",
  "Score pending": "Marcador pendiente",
  Team: "Selección",
  "The match is marked live, but no verified score is loaded yet.":
    "El partido figura en vivo, pero todavía no hay un marcador verificado.",
  "Teams are not known yet. Past match research will load after the matchup is set.":
    "Las selecciones todavía no se conocen. Los antecedentes se cargarán cuando se defina el cruce.",
  "Third-Place Race": "Clasificación de terceros",
  "Third-place play-off": "Partido por el tercer puesto",
  "Third place play-off": "Partido por el tercer puesto",
  "Third place match": "Partido por el tercer puesto",
  "Third-place match": "Partido por el tercer puesto",
  "Match for third place": "Partido por el tercer puesto",
  "Needs results elsewhere to move into the top eight.": "Necesita otros resultados para entrar entre los ocho mejores.",
  "Next match": "Próximo partido",
  "Next team outside the top eight.": "Primera selección fuera de los ocho mejores.",
  "Outside now": "Fuera por ahora",
  "Tiebreak pending": "Desempate pendiente",
  "Tied on loaded stats; fair-play data decides before FIFA ranking.":
    "Empate en los datos disponibles; el juego limpio decide antes que la clasificación FIFA.",
  "To be decided": "Por definir",
  Today: "Hoy",
  "Top two in each group advance. The best eight third-place teams also reach the Round of 32.":
    "Los dos primeros de cada grupo avanzan. Los ocho mejores terceros también pasan a dieciseisavos de final.",
  "W-D-L": "G-E-P",
  "World Cup Simplified": "Mundial simplificado",
  "World Cup views": "Secciones del Mundial",
  Yesterday: "Ayer",
  debutants: "selecciones debutantes",
  ranking: "clasificación",
  standings: "clasificación",
  "current score": "marcador actual",
  "final score": "marcador final",
  for: "por",
  now: "ahora",
  "pen.": "pen.",
  pens: "pen.",
  selected: "seleccionado",
  today: "hoy",
  vs: "vs."
});

const PLAYER_SKILL_LABELS = Object.freeze({
  "aerial-defending": "Defensa aérea",
  "aerial-duels": "Duelos aéreos",
  "aerial-finishing": "Remate aéreo",
  "archive-standout": "Figura del archivo",
  "area-command": "Dominio del área",
  "attacking-play": "Juego ofensivo",
  "attacking-runs": "Desmarques ofensivos",
  "ball-carrying": "Conducción de balón",
  "ball-control": "Control de balón",
  "ball-winning": "Recuperación de balón",
  "box-defending": "Defensa del área",
  "box-finishing": "Definición en el área",
  "build-up": "Salida de balón",
  "chance-creation": "Creación de ocasiones",
  "chance-passes": "Pases que crean ocasiones",
  "channel-runs": "Desmarques por los canales",
  clearances: "Despejes",
  "combination-play": "Juego asociativo",
  composure: "Templanza",
  counterattacking: "Contragolpe",
  creativity: "Creatividad",
  crossing: "Centros",
  "cross-command": "Dominio de los centros",
  "cross-defending": "Defensa de centros",
  "defensive-control": "Control defensivo",
  "defensive-cover": "Cobertura defensiva",
  "defensive-leadership": "Liderazgo defensivo",
  "defensive-play": "Trabajo defensivo",
  "defensive-positioning": "Colocación defensiva",
  dribbling: "Regate",
  experience: "Experiencia",
  "final-pass": "Último pase",
  finishing: "Definición",
  "first-time-finishing": "Remate de primera",
  "fouls-won": "Faltas provocadas",
  "goalkeeper-distribution": "Distribución del portero",
  "goalkeeper-potential": "Proyección bajo palos",
  "goalkeeper-reach": "Alcance del portero",
  "goal-threat": "Amenaza de gol",
  "historical-lens": "Contexto histórico",
  "impact-sub": "Revulsivo",
  "inside-runs": "Desmarques interiores",
  "inverted-full-back": "Juego de lateral invertido",
  leadership: "Liderazgo",
  "long-passing": "Pase largo",
  "long-range-shooting": "Disparo lejano",
  marking: "Marcaje",
  "midfield-play": "Juego en el mediocampo",
  "midfield-screening": "Protección del mediocampo",
  "near-post-runs": "Desmarques al primer palo",
  "one-on-one-defending": "Defensa en el uno contra uno",
  overlapping: "Proyección por banda",
  pace: "Velocidad",
  passing: "Pase",
  "penalty-box-reactions": "Reflejos en el área",
  "penalty-box-movement": "Movimientos en el área",
  "penalty-pressure": "Amenaza desde el punto penal",
  "penalty-saving": "Atajadas de penales",
  "physical-duels": "Presencia física y duelos",
  "player-role": "Perfil del jugador",
  "player-strength": "Fortaleza del jugador",
  potential: "Proyección",
  "press-resistance": "Resistencia a la presión",
  pressing: "Presión",
  "progressive-passing": "Pase progresivo",
  reactions: "Reflejos",
  "recovery-defending": "Defensa en recuperación",
  "second-ball-work": "Segundas jugadas",
  "set-piece-defending": "Defensa a balón parado",
  "set-piece-delivery": "Balón parado",
  "set-piece-threat": "Amenaza a balón parado",
  "short-passing": "Pase corto",
  "shot-stopping": "Atajadas",
  "squad-depth": "Profundidad de plantilla",
  starter: "Titular",
  "sweeper-goalkeeping": "Juego como líbero",
  "tempo-control": "Control del ritmo",
  "transition-defense": "Defensa de transiciones",
  versatility: "Versatilidad",
  "wide-defending": "Defensa en banda",
  "wide-play": "Juego por banda",
  "work-rate": "Despliegue"
});

const PATTERNS = [
  {
    id: "player-age",
    match: /^Age\s+(\d+)$/iu,
    replace: (age) => `${age} años`
  },
  {
    id: "player-age-then",
    match: /^Age then\s+(\d+)$/iu,
    replace: (age) => `Tenía ${age} años`
  },
  {
    id: "player-age-at-world-cup",
    match: /^(\d{4})\s+age\s+(\d+)$/iu,
    replace: (year, age) => `Tenía ${age} años en ${year}`
  },
  {
    id: "player-tournament-stats",
    match: /^This World Cup:\s+(\d+)\s+goals?,\s+(\d+)\s+assists?$/iu,
    replace: (goals, assists) =>
      `Este Mundial: ${goals} ${Number(goals) === 1 ? "gol" : "goles"}, ${assists} ${Number(assists) === 1 ? "asistencia" : "asistencias"}`
  },
  {
    id: "historical-player-tournament-stats",
    match: /^(\d{4})\s+World Cup:\s+(\d+)\s+goals?,\s+(\d+)\s+assists?$/iu,
    replace: (year, goals, assists) =>
      `Mundial de ${year}: ${goals} ${Number(goals) === 1 ? "gol" : "goles"}, ${assists} ${Number(assists) === 1 ? "asistencia" : "asistencias"}`
  },
  {
    id: "historical-player-value",
    match: /^(\d{4})\s+value$/iu,
    replace: (year) => `Valor en ${year}`
  },
  {
    id: "shootout-first-win",
    match: /^If it goes to penalties, both are chasing a first World Cup shootout win:\s+(.+?)\s+have tried\s+(\d+)\s+times?,\s+(.+?)\s+(\d+)\.$/iu,
    replace: (home, homeAttempts, away, awayAttempts) =>
      `Si llegan a los penales, ambos buscan su primera victoria en una tanda mundialista: ${translateTeamName(home)} lo ha intentado ${homeAttempts} ${Number(homeAttempts) === 1 ? "vez" : "veces"} y ${translateTeamName(away)}, ${awayAttempts}.`
  },
  {
    id: "group-label",
    match: /^Group\s+([A-L])$/u,
    replace: (group) => `Grupo ${group}`
  },
  {
    id: "group-standings",
    match: /^Group\s+([A-L])\s+standings$/iu,
    replace: (group) => `Clasificación del Grupo ${group.toLocaleUpperCase("es-419")}`
  },
  {
    id: "match-number",
    match: /^Match\s+(\d+)$/iu,
    replace: (number) => `Partido ${number}`
  },
  {
    id: "winner-of-match",
    match: /^Winner of Match\s+(\d+)$/iu,
    replace: (number) => `Ganador del partido ${number}`
  },
  {
    id: "match-winner",
    match: /^Match\s+(\d+)\s+winner$/iu,
    replace: (number) => `Ganador del partido ${number}`
  },
  {
    id: "loser-of-match",
    match: /^Loser of Match\s+(\d+)$/iu,
    replace: (number) => `Perdedor del partido ${number}`
  },
  {
    id: "match-loser",
    match: /^Match\s+(\d+)\s+loser$/iu,
    replace: (number) => `Perdedor del partido ${number}`
  },
  {
    id: "matchday",
    match: /^Matchday\s+(\d+)$/iu,
    replace: (number) => `Jornada ${number}`
  },
  {
    id: "world-cup-year",
    match: /^World Cup\s+(\d{4})$/iu,
    replace: (year) => `Mundial de ${year}`
  },
  {
    id: "year-world-cup",
    match: /^(\d{4})\s+World Cup$/iu,
    replace: (year) => `Mundial de ${year}`
  },
  {
    id: "versus",
    match: /^(.+?)\s+(?:vs\.?|v)\s+(.+)$/iu,
    replace: (home, away) => formatVersus(home, away)
  },
  {
    id: "team-matches",
    match: /^(?!.*\brecord across\b)(.+?)\s+matches$/iu,
    replace: (team) => `Partidos de ${translateTeamName(team)}`
  },
  {
    id: "team-match-centre",
    match: /^(.+?)\s+match centre$/iu,
    replace: (team) => `Centro de partidos de ${translateTeamName(team)}`
  },
  {
    id: "points",
    match: /^(\d+)\s+(?:points|pts)$/iu,
    replace: (points) => `${points} ${Number(points) === 1 ? "punto" : "puntos"}`
  },
  {
    id: "games-left",
    match: /^(\d+)\s+(?:games?|matches?)\s+left$/iu,
    replace: (matches) => `${matches} ${Number(matches) === 1 ? "partido restante" : "partidos restantes"}`
  },
  {
    id: "minutes",
    match: /^(\d+)\s+minutes?$/iu,
    replace: (minutes) => `${minutes} min`
  },
  {
    id: "minutes-ago",
    match: /^(\d+)\s+min ago$/iu,
    replace: (minutes) => `hace ${minutes} min`
  },
  {
    id: "hours-ago",
    match: /^(\d+)\s+hr ago$/iu,
    replace: (hours) => `hace ${hours} h`
  },
  {
    id: "open-group-standings",
    match: /^Open Group ([A-L]) standings$/iu,
    replace: (group) => `Abrir la clasificación del Grupo ${group.toLocaleUpperCase("es-419")}`
  },
  {
    id: "head-to-head-record",
    match: /^Head-to-head record across (\d+) match(?:es)?$/iu,
    replace: (matches) => `Historial entre ambas selecciones en ${matches} ${Number(matches) === 1 ? "partido" : "partidos"}`
  },
  {
    id: "world-cup-head-to-head-record",
    match: /^World Cup head-to-head record across (\d+) match(?:es)?$/iu,
    replace: (matches) => `Historial mundialista en ${matches} ${Number(matches) === 1 ? "partido" : "partidos"}`
  },
  {
    id: "record-wins",
    match: /^(\d+)\s+wins?$/iu,
    replace: (wins) => `${wins} ${Number(wins) === 1 ? "victoria" : "victorias"}`
  },
  {
    id: "record-ties",
    match: /^(\d+)\s+ties?$/iu,
    replace: (ties) => `${ties} ${Number(ties) === 1 ? "empate" : "empates"}`
  },
  {
    id: "team-style-notes",
    match: /^(.+)\s+style notes$/iu,
    replace: (team) => `Apuntes de estilo de ${translateTeamName(team)}`
  },
  {
    id: "first-world-cup-meeting",
    match: /^(.+)\s+and\s+(.+)\s+had not met in a men's World Cup before this match\.$/iu,
    replace: (home, away) =>
      `${translateTeamName(home)} y ${translateTeamName(away)} no se habían enfrentado antes en un Mundial masculino.`
  },
  {
    id: "loading-bracket",
    match: /^Loading\s+(.+)$/iu,
    replace: (subject) => `Cargando ${subject}`
  }
];

function normalizePositionKey(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[‐‑‒–—-]/gu, " ")
    .replace(/\s+/gu, " ");
}

export function translateTeamName(value, teamId = "") {
  const id = String(teamId || "").trim().toLocaleUpperCase("en-US");
  if (id && TEAMS[id]) {
    return TEAMS[id];
  }
  const name = String(value || "").trim();
  return TEAM_NAMES[name] || name;
}

export function translateLineupPosition(value) {
  const position = String(value || "").trim();
  return LINEUP_POSITIONS[position.toLocaleUpperCase("en-US")] ||
    PLAYER_POSITIONS[normalizePositionKey(position)] ||
    position;
}

export function formatPlayerSkill(value) {
  const category = getPlayerSkillCategory(value);
  return PLAYER_SKILL_LABELS[category] || PLAYER_SKILL_LABELS["player-strength"];
}

const PLAYER_NOTE_QUALITIES = Object.freeze({
  "clean-shot": "generar un remate limpio antes de que la defensa se reorganice",
  "protect-danger-space": "proteger primero el espacio más peligroso antes de saltar al balón",
  "see-decisive-pass": "ver el pase decisivo un instante antes de que aparezca",
  "create-pass-angle": "crear un mejor ángulo para el siguiente pase",
  "early-position-reactions": "reaccionar rápido gracias a una colocación anticipada",
  "role-flexibility": "ocupar distintos roles sin romper la estructura del equipo",
  "duel-timing": "elegir el momento del contacto sin precipitarse",
  "open-grass-speed": "su aceleración explosiva cuando encuentra campo abierto",
  "close-control-direction": "cambiar de dirección sin perder el control del balón",
  "safe-defensive-decision": "tomar la decisión más segura antes de que el duelo se convierta en una emergencia",
  "purposeful-off-ball": "moverse con intención sin balón",
  "long-focus": "mantenerse preparado durante largos tramos sin intervención",
  "targeted-press": "presionar con un objetivo claro, no solo perseguir el balón",
  "pressure-composure": "dar calma al balón cuando llega la presión",
  "passing-weight-angle": "mover a la defensa con el peso y el ángulo de sus pases",
  "early-organization": "ordenar a sus compañeros antes de que el peligro sea evidente",
  "experience-calm": "tomar decisiones serenas en los momentos de máxima presión",
  "recovery-speed": "su velocidad de recuperación cuando la línea defensiva queda expuesta",
  "strength-continuity": "usar su fuerza sin frenar la siguiente acción",
  "early-run": "iniciar el desmarque mientras los defensores aún miran el balón",
  "aerial-reading": "leer la trayectoria del balón antes de entrar al duelo",
  "delayed-run": "esperar a que el defensor desvíe la atención antes de moverse",
  "calm-recovery": "recuperar la posición sin perder la calma cuando se supera la primera línea",
  "tight-space-delivery": "servir el balón con precisión incluso con poco espacio",
  "help-next-action": "facilitar la siguiente acción de un compañero",
  "physical-reference": "plantear a los centrales un reto físico imposible de ignorar",
  "read-next-phase": "leer la siguiente fase antes de que el espacio se abra por completo",
  "planned-tight-receive": "recibir entre líneas con la siguiente acción ya pensada",
  "deep-attack-timing": "elegir el momento de incorporarse al ataque desde atrás",
  "goalkeeper-balance": "mantener el equilibrio hasta que el remate muestre su dirección",
  "open-midfield-carry": "avanzar con impulso por un mediocampo abierto",
  "save-starts-attack": "convertir una parada en el primer pase del ataque",
  "dead-ball-technique": "su técnica repetible a balón parado",
  "high-starting-position": "partir lo bastante adelantado para proteger la espalda de la defensa",
  "penalty-reading": "su paciencia para leer el último movimiento del lanzador",
  "runner-tracking": "seguir conectado con los desmarques cuando el balón se mueve a otra zona",
  "crowded-goal-command": "dominar el espacio congestionado alrededor de la portería",
  "attack-space-behind": "atacar el espacio a la espalda de la defensa antes de que se abra por completo",
  "shape-midfield-tempo": "marcar el ritmo del partido desde el mediocampo",
  "contact-with-position": "usar el contacto sin perder la posición defensiva",
  "two-way-wide-lane": "cubrir el carril exterior en las dos áreas",
  "second-striker-pockets": "encontrar espacios alrededor del delantero de referencia"
});

const PLAYER_NOTE_ACTIONS = Object.freeze({
  "meet-ball-early": "Sale a buscar el balón pronto en lugar de esperar a que caiga en su zona",
  "play-through-pressure": "Juega a través de la presión cercana en vez de rodearla",
  "first-touch-escape": "Usa el primer control para escapar de la presión antes de elegir el pase",
  "move-after-release": "Se mueve después de soltar el balón para seguir ofreciendo apoyo al receptor",
  "shoot-strong-foot": "Se perfila hacia su pierna hábil y remata con muy poco armado",
  "hold-box-route": "Protege la entrada al área hasta que llega la ayuda",
  "press-angle": "Orienta la carrera para cerrar el pase sencillo mientras presiona al poseedor",
  "protect-goal-route": "Gira pronto y protege la ruta hacia la portería",
  "win-loose-touch": "Espera un control largo y entonces entra con decisión al balón",
  "attack-channel-gap": "Ataca el intervalo entre el lateral y el central",
  "vary-delivery": "Varía la altura y la velocidad de sus centros",
  "draw-and-release": "Atrae a un defensor y libera al compañero que rompe a su espalda",
  "carry-through-gap": "Provoca la primera entrada y conduce por el espacio que deja",
  "offer-clear-target": "Cambia de posición a tiempo para ofrecer una referencia clara al pasador",
  "claim-timing": "Mide cuándo salir de la portería y alivia la presión sobre sus defensores",
  "change-pace": "Cambia de ritmo cuando el defensor ya ha fijado los pies",
  "overlap-timing": "Espera a que el defensor de banda mire hacia dentro antes de doblarlo",
  "set-and-react": "Fija los apoyos antes del remate y reacciona sin dar un paso de más",
  "body-and-return": "Protege el balón con el cuerpo y lo devuelve al camino del compañero que llega",
  "pick-cross-target": "Levanta la cabeza antes de centrar y busca a un compañero, no una zona vacía",
  "simple-restart": "Elige la salida sencilla antes de que la presión le cierre opciones",
  "protect-then-challenge": "Protege el camino a portería y solo entra cuando el control queda suelto",
  "late-box-arrival": "Llega al área lo bastante tarde como para resultar difícil de seguir",
  "hold-midfield-lane": "Cierra la línea de pase hacia el mediocampo hasta que llega la ayuda",
  "line-instructions": "Mantiene conectada la línea con indicaciones breves y constantes",
  "recover-before-box": "Gira pronto y alcanza al corredor antes de que entre al área",
  "simple-role-change": "Cambia de posición sin complicar sus prioridades",
  "manage-tempo-risk": "Reconoce cuándo bajar el ritmo y cuándo asumir el riesgo",
  "open-body-forward": "Abre el cuerpo con el primer control para poder jugar hacia delante",
  "absorb-and-carry": "Absorbe el contacto y conserva el balón lo bastante cerca para seguir avanzando",
  "pin-and-create": "Fija a un defensor y abre espacio para la siguiente llegada",
  "early-position-adjustment": "Ajusta pronto su posición y hace que una acción difícil parezca sencilla",
  "check-runner": "Controla al corredor por encima del hombro antes de que llegue el último pase",
  "anticipate-second-ball": "Se coloca para el siguiente toque antes de que termine el primer duelo",
  "economical-save": "Mantiene los pies activos y resuelve la parada con el mínimo de movimientos",
  "near-post-run": "Ataca el primer palo antes de que el marcador pueda girarse",
  "penalty-wait": "Espera el golpeo antes de comprometerse",
  "sweeper-exit": "Sale pronto cuando un pase profundo supera a la última línea",
  "shoot-left-foot": "Se perfila hacia la izquierda y remata con muy poco armado",
  "sudden-save-calm": "Mantiene la calma cuando, tras un tramo de poca actividad, debe intervenir de repente",
  "push-and-accelerate": "Empuja el balón más allá de la primera entrada y acelera después",
  "block-cross-angle": "Se acerca lo suficiente para bloquear el centro sin lanzarse al suelo",
  "open-distance-shot": "Con un primer control limpio, abre una línea de tiro desde lejos",
  "body-bring-teammate": "Usa el cuerpo para proteger el balón e incorpora a un compañero a la jugada",
  "moving-finish": "Llega en movimiento y remata antes de que se recupere el marcador más cercano",
  "hold-danger-lane": "Protege el carril peligroso hasta que un compañero puede presionar",
  "shoot-before-reset": "Remata antes de que el defensor más cercano pueda reorganizarse",
  "move-after-pass": "Se mueve después de pasar para que el equipo conserve una salida cercana",
  "protect-centre-goal": "Protege primero el centro de la portería y solo sale si puede llegar al balón",
  "composed-set-piece": "Reduce la carrera, fija el equilibrio y golpea sin precipitarse",
  "receive-side-on": "Recibe de perfil para que el siguiente pase pueda avanzar",
  "supporting-angle": "Se mueve a un ángulo claro de apoyo antes de que llegue la presión",
  "close-first-touch": "Mantiene el primer control cerca para simplificar la siguiente acción"
});

function formatPlayerStyleOpener(parsed, mention, quality) {
  if (parsed.variant === "watch") {
    return `La clave para entender a ${mention} es ${quality}.`;
  }
  if (parsed.variant === "signature") {
    return `El sello de ${mention} está en ${quality}.`;
  }
  if (parsed.variant === "edge") {
    return `La gran virtud de ${mention} es ${quality}.`;
  }
  if (parsed.variant === "style") {
    return `El juego de ${mention} se apoya en ${quality}.`;
  }
  if (parsed.variant === "defined") {
    return `${mention} se distingue por ${quality}.`;
  }
  return `${mention} destaca por ${quality}.`;
}

export function formatPlayerNote(value, options = {}) {
  const parsed = getGeneratedPlayerCardCopy(value, {
    historical: Boolean(options.historical)
  });
  if (!parsed) {
    return "";
  }

  if (parsed.kind === "style") {
    const quality = PLAYER_NOTE_QUALITIES[parsed.qualityId];
    const actions = parsed.actionIds.map((id) => PLAYER_NOTE_ACTIONS[id]);
    const mention = String(parsed.mention || options.localizedName || "").trim();
    if (!mention || !quality || actions.some((action) => !action)) {
      return "";
    }
    return [
      formatPlayerStyleOpener(parsed, mention, quality),
      ...actions.map((action) => `${action}.`)
    ].join(" ");
  }

  if (parsed.kind === "historical-note") {
    const team = translateTeamName(parsed.team);
    const position = translateLineupPosition(parsed.position).toLocaleLowerCase("es-419");
    const parts = [`Fue ${position} de ${team} en el Mundial de ${parsed.year}.`];
    if (parsed.goals) {
      parts.push(
        `Marcó ${parsed.goals} ${parsed.goals === 1 ? "gol" : "goles"} en Mundiales.`
      );
    }
    if (parsed.featuredMatches) {
      parts.push(
        `Aparece en ${parsed.featuredMatches} ${
          parsed.featuredMatches === 1 ? "partido destacado" : "partidos destacados"
        }.`
      );
    }
    return parts.join(" ");
  }

  if (parsed.kind === "historical-summary") {
    return `Ficha histórica del Mundial de ${parsed.year}, generada a partir de goles, apariciones, planteles y notas del archivo. Selección: ${translateTeamName(parsed.team)}.`;
  }

  return "";
}

export function isTemplatedPlayerNote(value, options = {}) {
  return isGeneratedPlayerCardCopy(value, {
    historical: Boolean(options.historical)
  });
}

export function translateStageLabel(value) {
  const stage = String(value || "").trim();
  const matchday = stage.match(/^Matchday\s+(\d+)$/iu);
  if (matchday) {
    return `Jornada ${matchday[1]}`;
  }
  return STAGES[stage] || EXACT[stage] || stage;
}

function formatStageDestination(value) {
  const stage = String(value || "").trim().toLocaleLowerCase("en-US");
  const destinations = {
    "round of 16": "los octavos de final",
    "quarter-finals": "los cuartos de final",
    "semi-finals": "las semifinales",
    final: "la final"
  };
  return destinations[stage] || translateAppText(value);
}

export function getTimeZoneLabel(timeZone) {
  const value = String(timeZone || "").trim();
  return TIME_ZONES[value] || value.replace(/_/gu, " ").split("/").at(-1) || value;
}

export function translateAppText(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return text;
  }
  const exact = EXACT[text] || TEAM_NAMES[text] || STAGES[text];
  if (exact) {
    return exact;
  }
  for (const pattern of PATTERNS) {
    const match = pattern.match.exec(text);
    if (match) {
      return pattern.replace(...match.slice(1));
    }
  }
  return text;
}

export function formatGroupLabel(groupId) {
  return `Grupo ${String(groupId || "").trim().toLocaleUpperCase("es-419")}`.trim();
}

export function formatMatchLabel(matchNumber) {
  return `Partido ${matchNumber}`;
}

export function formatVersus(homeTeam, awayTeam) {
  return `${translateTeamName(homeTeam)} vs. ${translateTeamName(awayTeam)}`;
}

export function formatPoints(points) {
  return `${points} ${Number(points) === 1 ? "punto" : "puntos"}`;
}

export function formatGamesLeft(matches) {
  return `${matches} ${Number(matches) === 1 ? "partido restante" : "partidos restantes"}`;
}

export function formatWorldCupYear(year) {
  return `Mundial de ${year}`;
}

export function getSeoHomeCopy() {
  return {
    title: "Mundial 2026: partidos, resultados, clasificación y alineaciones | Mundial simplificado",
    description:
      "Sigue el Mundial 2026 en tu zona horaria con horarios, alineaciones verificadas, resultados en vivo, clasificación, pronósticos, resúmenes breves y videos oficiales."
  };
}

export function getSeoMatchCopy({
  away,
  hasConfirmedTeams,
  home,
  isFinished,
  isLive,
  stage
} = {}) {
  if (!hasConfirmedTeams) {
    return {
      title: `Mundial 2026, ${stage}: horario, selecciones y guía | Mundial simplificado`,
      description: `Sigue ${stage} del Mundial 2026 con horario, selecciones, alineaciones, contexto y pronósticos actualizados cuando se confirmen los participantes.`,
      name: `Mundial 2026, ${stage}`
    };
  }
  if (isFinished) {
    return {
      title: `${home} vs. ${away}: resultado, alineaciones y videos | Mundial 2026`,
      description: `Consulta el resultado de ${home} vs. ${away}, las alineaciones verificadas, un resumen breve y los videos oficiales cuando estén disponibles.`,
      name: `${home} vs. ${away}`
    };
  }
  if (isLive) {
    return {
      title: `${home} vs. ${away}: marcador en vivo y alineaciones | Mundial 2026`,
      description: `Sigue ${home} vs. ${away} con el marcador en vivo, las alineaciones confirmadas, el contexto del partido y los jugadores clave.`,
      name: `${home} vs. ${away}`
    };
  }
  return {
    title: `${home} vs. ${away}: horario, alineaciones y pronóstico | Mundial 2026`,
    description: `Consulta la hora local de ${home} vs. ${away}, las alineaciones previstas o confirmadas, el contexto, los jugadores clave y el pronóstico.`,
    name: `${home} vs. ${away}`
  };
}

export function formatAppMessage(type, data = {}) {
  const nameSeries = (items = []) => {
    const values = items.filter(Boolean);
    if (values.length <= 1) {
      return values.join("");
    }
    if (values.length === 2) {
      return values.join(" y ");
    }
    return `${values.slice(0, -1).join(", ")} y ${values.at(-1)}`;
  };

  switch (type) {
    case "h2h-none":
      return `${data.home} y ${data.away} nunca se habían enfrentado en un partido verificado de selecciones absolutas. Este es su primer duelo.`;
    case "h2h-record": {
      const wins = (value) => `${value} ${Number(value) === 1 ? "victoria" : "victorias"}`;
      const draws = `${data.draws} ${Number(data.draws) === 1 ? "empate" : "empates"}`;
      const goals = `${data.goals} ${Number(data.goals) === 1 ? "gol" : "goles"}`;
      return `Antes de este partido, el historial verificado entre selecciones absolutas era: ${data.home}, ${wins(data.homeWins)}; ${draws}; ${data.away}, ${wins(data.awayWins)}. Hubo ${goals} en total.`;
    }
    case "player-note-fallback":
      return `Claves del jugador: ${(data.skills || []).join(", ")}.`;
    case "flag-label":
      return `Bandera de ${data.teamName}`;
    case "rank-label":
      return `${data.teamName}, puesto ${data.rank} de la clasificación FIFA${data.year ? ` (${data.year})` : ""}`;
    case "rank-tooltip":
      return data.year
        ? `Clasificación mundial FIFA utilizada para esta vista del torneo ${data.year}.`
        : "Clasificación mundial FIFA utilizada para esta vista del torneo.";
    case "rank-aria":
      return `${data.label}. ${data.tooltip}`;
    case "fifa-snapshot":
      return `Instantánea FIFA: ${data.snapshotLabel} · comprobada ${data.freshness}`;
    case "score-penalties-suffix":
      return `, penales ${data.penaltyText}`;
    case "score-freshness-suffix":
      return `, última comprobación: ${data.freshness}`;
    case "score-pending-aria":
      return `${data.pendingText}; el marcador verificado todavía no está disponible`;
    case "live-aria":
      return `En vivo: ${data.detail}`;
    case "official-added-time":
      return `${data.matchTime} (+${data.addedMinutes} de añadido)`;
    case "official-minute": {
      const timeLabel = data.stoppageMinute
        ? `minuto ${data.minute}+${data.stoppageMinute}`
        : `minuto ${data.minute}`;
      const addedTimeLabel =
        !data.stoppageMinute && data.addedTime > 0
          ? `; se han anunciado ${data.addedTime} minutos de añadido`
          : "";
      const phaseLabel = data.phase === "Extra time" ? `; ${translateAppText(data.phase)}` : "";
      return `${timeLabel}${addedTimeLabel}${phaseLabel}`;
    }
    case "match-outcome":
      if (data.kind === "penalties") {
        return `${data.winnerName} ganó en los penales`;
      }
      if (data.kind === "winner") {
        return `${data.winnerName} ganó`;
      }
      if (data.kind === "knockout-pending") {
        return "El ganador de la eliminatoria todavía no está disponible";
      }
      return "Empate";
    case "accessibility-score":
      return `${data.home} ${data.homeScore}, ${data.away} ${data.awayScore}`;
    case "accessibility-penalties":
      return `${data.scoreText}, penales ${data.homePenalties} a ${data.awayPenalties}`;
    case "accessibility-announcement": {
      const matchup = `${data.home} vs. ${data.away}`;
      const scoreSentence = data.scoreText ? `${data.scoreText}.` : "";
      const phase = translateAppText(data.phase);
      if (data.kind === "started") {
        return `Comenzó el partido: ${matchup}. ${scoreSentence}`.trim();
      }
      if (data.kind === "final") {
        return scoreSentence
          ? `Final del partido. ${scoreSentence}${data.outcomeText ? ` ${data.outcomeText}.` : ""}`.trim()
          : `Final del partido: ${matchup}.`;
      }
      if (data.kind === "final-score") {
        return scoreSentence
          ? `Actualización del marcador final. ${scoreSentence}`.trim()
          : `Actualización del marcador final de ${matchup}. El marcador verificado no está disponible temporalmente.`;
      }
      if (data.kind === "score") {
        return scoreSentence
          ? `Actualización del marcador. ${scoreSentence}`.trim()
          : `Actualización del marcador de ${matchup}. El marcador verificado no está disponible temporalmente.`;
      }
      if (data.kind === "delayed") {
        return `Partido demorado: ${matchup}.`;
      }
      if (data.kind === "postponed") {
        return `Partido aplazado: ${matchup}.`;
      }
      if (data.kind === "cancelled") {
        return `Partido cancelado: ${matchup}.`;
      }
      if (data.kind === "phase") {
        return scoreSentence ? `${phase}. ${scoreSentence}`.trim() : `${phase}: ${matchup}.`;
      }
      return "";
    }
    case "full-time-prefix":
      return "Final del partido";
    case "source-current-time":
      return "Tiempo actual";
    case "source-checked":
      return `Comprobado ${data.freshness}`;
    case "source-latest":
      return "Ver lo último";
    case "source-latest-aria":
      return "Ver el marcador más reciente en FIFA";
    case "open-match":
      return `Abrir los detalles de ${data.homeName} vs. ${data.awayName}`;
    case "see-all-matches":
      return `Ver todos los partidos de ${data.teamLabel}`;
    case "view-bracket-round":
      return `Ver ${data.label} en el cuadro del torneo`;
    case "bench-unavailable":
      return data.isSuspended
        ? `${data.statusLabel}; no disponible para jugar`
        : "No disponible para jugar";
    case "bench-status":
      return data.status === "suspended" ? "Suspendido" : "No disponible";
    case "coach-role":
      return `${data.teamText}, ${translateAppText("Head Coach")}`;
    case "coach-since":
      return `Desde ${data.year}`;
    case "historical-local-time":
      return `${data.dateText} a las ${data.timeText}, hora local`;
    case "historical-local-clock":
      return `${data.timeText}, hora local`;
    case "tie-label":
      return "EMPATE";
    case "ordinal":
      return Number.isFinite(Number(data.value)) ? `${Number(data.value)}.º` : "";
    case "third-place-race-rank":
      return `Terceros: ${data.rank}`;
    case "older-world-cups-toggle":
      return `Ver Mundiales anteriores (${data.count})`;
    case "key-info-fallback":
      return `${data.teamName}: las piezas clave son ${nameSeries(data.playerNames)}. ${data.notes.join(" ")}`.trim();
    case "historical-style-series":
      return nameSeries(data.items);
    case "tournament-basis":
      return data.basis === "loaded"
        ? "pronóstico cargado del partido"
        : data.basis === "conditional-model"
          ? "pronóstico condicional calibrado con datos en línea"
          : data.basis === "conditional-online"
            ? "pronóstico condicional de Opta y los mercados actuales"
            : "no hay un pronóstico verificado disponible";
    case "tournament-team-reason": {
      if (data.variant === "conditional-model") {
        return `${data.teamName}: ${data.percent}% de probabilidad de ganar en el tiempo reglamentario si se confirma este ${data.matchupLabel}. El modelo condicional combina Opta y mercados, el rendimiento en el torneo y la clasificación; las cuotas directas lo sustituyen cuando se define el cruce.`;
      }
      if (data.variant === "conditional-online") {
        return `${data.teamName} tiene un ${data.percent}% de probabilidad de ganar la final si se confirma este cruce previsto, incluidos la prórroga y los penales. Pronóstico condicional de Opta y los mercados actuales.`;
      }
      if (data.variant === "favorite") {
        return `${data.teamName} tiene un ${data.percent}% de probabilidad de ganar en el tiempo reglamentario.`;
      }
      if (data.variant === "close-underdog") {
        return `${data.teamName} tiene un ${data.percent}% de probabilidad de ganar en el tiempo reglamentario. Está muy parejo, pero ${data.favoriteName} tiene una ligera ventaja.`;
      }
      return `${data.teamName} tiene un ${data.percent}% de probabilidad de ganar en el tiempo reglamentario. Puede ganar, pero ${data.favoriteName} parte como favorito.`;
    }
    case "tournament-likelihood":
      if (data.variant === "rank-close") {
        return `${data.favoriteName} y ${data.otherName} están cerca en la clasificación FIFA. Aproximadamente ${data.percent}%.`;
      }
      if (data.variant === "rank-strong") {
        return `${data.favoriteName} tiene la mejor clasificación FIFA (n.º ${data.favoriteRank} frente a n.º ${data.otherRank}). Aproximadamente ${data.percent}%.`;
      }
      if (data.variant === "slot-pick") {
        return `${data.favoriteName} es la selección prevista para este lugar. Aproximadamente ${data.percent}%.`;
      }
      if (data.variant === "advance-shootout") {
        return `${data.teamName} tiene la mayor estimación de avance al combinar el pronóstico del partido con la proyección de penales. Aproximadamente ${data.percent}%.`;
      }
      if (data.variant === "advance-regulation") {
        return `${data.teamName} tiene la mayor estimación de avance; los caminos con empate se reparten según las probabilidades de victoria decisiva. Aproximadamente ${data.percent}%.`;
      }
      if (data.variant === "only-team") {
        return `${data.teamName} es la única selección definida ahora en este lugar. Aproximadamente ${data.percent}%.`;
      }
      return `${data.teamName} es la selección con mayor probabilidad de caer en esta semifinal y pasar al partido por el tercer puesto. Aproximadamente ${data.percent}%.`;
    case "prediction-lead":
      return data.awayName
        ? `Pronóstico basado en ${data.homeName} vs. ${data.awayName}.`
        : `Pronóstico basado en el camino actual de ${data.homeName}.`;
    case "slot-odds-reason": {
      const alternatives = data.alternatives?.length
        ? ` Otras posibilidades: ${data.alternatives.join(", ")}.`
        : " No hay alternativas cercanas.";
      return `${data.teamName} es ahora la opción más probable para ${data.slotLabel}.${alternatives}`;
    }
    case "shootout-default":
      return "Si sigue empatado después de 120 minutos, el partido se decide en una tanda de penales.";
    case "shootout-even":
      return `Si sigue empatado después de 120 minutos, el mercado de penales no ve una ventaja clara entre ${data.homeName} y ${data.awayName}.`;
    case "shootout-edge":
      return `Si sigue empatado después de 120 minutos, el mercado de penales da a ${data.edgeName} una ligera ventaja, de alrededor del ${data.edgePercent}%.`;
    case "group-tie-reason":
      return `Hay un ${data.tiePercent}% de probabilidad de empate al final del tiempo reglamentario. En la fase de grupos, el partido termina en empate.`;
    case "knockout-draw":
      return `${data.homeName} y ${data.awayName} empataron ${data.scoreText}`;
    case "knockout-penalties":
      return `${data.winnerName} venció a ${data.loserName} en los penales (${data.penaltyText}) tras empatar ${data.scoreText}.${data.searchAction || ""}`;
    case "knockout-win":
      return `${data.winnerName} venció a ${data.loserName} por ${data.scoreText}.${data.searchAction || ""}`;
    case "group-summary": {
      const segments = data.items.map((item) => {
        if (item.outcome === "win") {
          return `venció ${item.scoreText} a ${item.opponent}`;
        }
        if (item.outcome === "draw") {
          return `empató ${item.scoreText} con ${item.opponent}`;
        }
        return `perdió ${item.scoreText} ante ${item.opponent}`;
      });
      const remaining = data.remainingCount > 0
        ? ` Quedan ${data.remainingCount} ${data.remainingCount === 1 ? "partido" : "partidos"} de la fase de grupos.`
        : "";
      return `${data.subject}, fase de grupos: ${segments.join("; ")}.${remaining}${data.searchAction || ""}`;
    }
    case "match-status":
      if (data.status === "live") {
        return `${data.matchup} está en vivo, ${data.scoreText}.`;
      }
      if (data.status === "delayed") {
        return `${data.matchup}: inicio demorado.`;
      }
      if (data.status === "predicted") {
        return `${data.matchup} es el cruce previsto por ahora.`;
      }
      return `${data.matchup} está programado.`;
    case "substitution-show":
      return `${data.label}. Mostrar a ${data.targetName}.`;
    case "historical-archive-club":
      return `Archivo del Mundial ${data.year} de ${translateTeamName(data.teamName)}`;
    case "player-stat-count":
      return data.statName === "goals"
        ? `${data.count} ${data.count === 1 ? "gol" : "goles"}`
        : `${data.count} ${data.count === 1 ? "asistencia" : "asistencias"}`;
    case "player-tournament-stats":
      return data.variant === "archive"
        ? `Mundial ${data.year}: ${data.parts.join(", ")}`
        : `Este Mundial: ${data.parts.join(", ")}`;
    case "key-information-fallback": {
      const mainTag = String(data.mainTag || "").replace(/^./u, (letter) => letter.toLocaleLowerCase("es"));
      const opponentTag = String(data.opponentTag || "").replace(/^./u, (letter) => letter.toLocaleLowerCase("es"));
      const playerSentence = data.playerText
        ? ` Atención a ${data.playerText}.`
        : "";
      const matchupSentence = data.opponentName
        ? ` Ante ${data.opponentName}, la clave será imponer ese plan y limitar ${opponentTag}.`
        : "";
      return `${data.teamName} quiere construir el partido a partir de ${mainTag}.${playerSentence}${matchupSentence}`;
    }
    case "catch-up-tournament": {
      const winner = translateTeamName(data.winner);
      const loser = translateTeamName(data.loser);
      switch (data.variant) {
        case "golden-boot-chasers":
          return `${data.firstNames} ${data.firstCount === 1 ? "sigue" : "siguen"} con ${data.firstGoals}.`;
        case "golden-boot-chasers-two-levels":
          return `${data.firstNames} ${data.firstCount === 1 ? "sigue" : "siguen"} con ${data.firstGoals}; ${data.secondNames}, con ${data.secondGoals}.`;
        case "golden-boot-race-body":
          return `${data.leaderNames} ${data.leaderCount === 1 ? "suma" : "suman"} ${data.topGoalTotal} goles${data.leaderCount === 1 ? "" : " cada uno"}. ${data.chaserCopy}`.trim();
        case "golden-boot-race-headline":
          return data.leaderCount === 1
            ? `${data.leaderNames} lidera la carrera por la Bota de Oro con ${data.topGoalTotal} goles`
            : `${data.leaderNames} comparten el liderato de la carrera por la Bota de Oro`;
        case "golden-boot-meta":
          return "Carrera por la Bota de Oro";
        case "champion-body-penalties":
          return `${winner} venció a ${loser} en los penales tras empatar ${data.scoreText} en la final.`;
        case "champion-body":
          return `${winner} venció ${data.scoreText} a ${loser} en la final.`;
        case "champion-headline":
          return `${winner} es campeón del mundo de 2026`;
        case "tournament-wrap-meta":
          return "Balance del torneo";
        case "golden-boot-winner-headline":
          return `${data.playerName} gana la Bota de Oro`;
        case "golden-boot-winner-body":
          return `${data.playerName} terminó el torneo con ${data.goals} goles${Number.isInteger(data.assists) ? ` y ${data.assists} asistencias` : ""}.`;
        case "golden-boot-pending-headline":
          return "Pendiente la confirmación de la Bota de Oro";
        case "golden-boot-pending-body":
          return `${data.leaderNames} ${data.leaderCount === 1 ? "terminó como máximo goleador en los datos cargados" : "terminaron igualados al frente de los datos de goleadores"} con ${data.goalTotal} goles. El premio oficial todavía no está cargado.`;
        case "tournament-numbers-body":
          return "El archivo completo de partidos sigue disponible por fecha y selección.";
        case "tournament-numbers-headline":
          return `El Mundial 2026: ${data.matchCount} partidos, ${data.totalGoals} goles`;
        default:
          return "";
      }
    }
    case "catch-up-result": {
      const winner = translateTeamName(data.winner);
      const loser = translateTeamName(data.loser);
      const home = translateTeamName(data.home);
      const away = translateTeamName(data.away);
      const leader = translateTeamName(data.leader);
      const chaser = translateTeamName(data.chaser);
      const nextStage = formatStageDestination(data.nextStage);
      const context = translateAppText(data.context);
      switch (data.variant) {
        case "final-headline":
          return `${winner} gana el Mundial`;
        case "bronze-headline":
          return `${winner} asegura el tercer puesto`;
        case "penalties-headline":
          return `${winner} sobrevive ante ${loser} en los penales`;
        case "edge-next-headline":
          return `${winner} supera por la mínima a ${loser} y llega a ${nextStage}`;
        case "beat-next-headline":
          return `${winner} vence a ${loser} y llega a ${nextStage}`;
        case "live-underway-headline":
          return `${home} vs. ${away} ya está en juego`;
        case "live-even-headline":
          return `${home} y ${away} intercambian el dominio`;
        case "live-lead-headline":
          return `${leader} manda por ahora ante ${chaser}`;
        case "await-winner-headline":
          return `${home} y ${away} esperan la confirmación del ganador`;
        case "split-points-headline":
          return `${home} y ${away} reparten los puntos`;
        case "statement-headline":
          return `${winner} firma una victoria contundente ante ${loser}`;
        case "sharp-headline":
          return `${winner} se muestra sólido ante ${loser}`;
        case "narrow-headline":
          return `${winner} vence por la mínima a ${loser}`;
        case "live-underway-body":
          return `${context} dejó atrás la previa y ya está en plena acción.`;
        case "live-even-body":
          return `El marcador en vivo es ${data.scoreText}; una sola jugada todavía puede cambiar el partido.`;
        case "live-lead-body":
          return `${leader} gana ${data.scoreText}, pero ${chaser} aún tiene tiempo para igualar.`;
        case "await-winner-body":
          return `El ${data.scoreText} de ${context} está cargado, pero el ganador de la eliminatoria todavía no.`;
        case "split-points-body":
          return `El ${data.scoreText} mantiene abierto el ${context} y deja algo útil a ambos equipos para su próximo partido.`;
        case "final-body":
          return `La victoria ${data.scoreText} de ${winner} ante ${loser} decidió la final.`;
        case "bronze-body":
          return `La victoria ${data.scoreText} de ${winner} ante ${loser} aseguró el tercer puesto.`;
        case "penalties-next-body":
          return `${winner} avanzó a ${nextStage} en los penales tras empatar ${data.scoreText}, y puso fin al camino de ${loser}.`;
        case "next-body":
          return `La victoria ${data.scoreText} llevó a ${winner} a ${nextStage}.`;
        case "through-body":
          return `La victoria ${data.scoreText} de ${winner} le permitió superar ${context} y puso fin al camino de ${loser}.`;
        case "group-win-body":
          return `La victoria ${data.scoreText} de ${winner} le da tres puntos en el ${context}.`;
        default:
          return "";
      }
    }
    case "catch-up-highlight": {
      const winner = translateTeamName(data.winner);
      const loser = translateTeamName(data.loser);
      const home = translateTeamName(data.home);
      const away = translateTeamName(data.away);
      const firstTeam = translateTeamName(data.firstTeam);
      const context = translateAppText(data.context);
      const nextStage = formatStageDestination(data.nextStage);
      switch (data.variant) {
        case "draw-focus-goalless":
          return `🌟 ${data.homeFocus} y ${data.awayFocus} sostuvieron el duelo, pero no encontraron el gol.`;
        case "draw-teams-goalless":
          return `🌟 ${home} y ${away} se neutralizaron.`;
        case "draw-focus-level":
          return `🌟 ${data.homeFocus} y ${data.awayFocus} intercambiaron el dominio sin encontrar un ganador.`;
        case "draw-teams-level":
          return `🌟 ${home} y ${away} intercambiaron el dominio sin encontrar un ganador.`;
        case "draw-no-breakthrough":
          return "🌟 No hubo forma de romper un empate muy cerrado.";
        case "draw-knockout-impact":
          return `📊 ${context} todavía necesita la confirmación del ganador de la eliminatoria.`;
        case "draw-goalless-impact":
        case "draw-level-impact":
          return `📊 Ambos equipos sumaron un punto en el ${context}.`;
        case "draw-goalless-score":
          return `⚽ ${home} y ${away} empataron 0-0.`;
        case "draw-level-score":
          return `⚽ ${home} y ${away} terminaron igualados ${data.scoreText}.`;
        case "goal-hat-trick":
          return `🌟 ${data.player} completó un triplete y ${winner} se escapó en el marcador.`;
        case "goal-brace":
          return `🌟 ${data.player} marcó dos veces y ${winner} amplió la diferencia.`;
        case "goal-own-winner":
          return `🌟 Un autogol a los ${data.minute} decidió el partido para ${winner}.`;
        case "goal-winner":
          return `🌟 El gol de ${data.player} a los ${data.minute} decidió el partido para ${winner}.`;
        case "goal-comeback":
          return `🌟 ${data.player} adelantó a ${firstTeam}, pero ${winner} remontó el partido.`;
        case "goal-bookends":
          return `🌟 ${data.firstPlayer} abrió el marcador y ${data.lastPlayer} cerró la cuenta.`;
        case "champion-impact":
          return `📊 ${winner} ganó el Mundial.`;
        case "third-impact":
          return `📊 ${winner} aseguró el tercer puesto.`;
        case "advanced-impact":
          return `📊 ${winner} avanzó desde ${context}.`;
        case "reached-impact":
          return `📊 ${winner} llegó a ${nextStage} y ${loser} quedó eliminado.`;
        case "win-statement-score":
          return `⚽ ${winner} firmó una victoria contundente por ${data.scoreText}.`;
        case "win-penalties-score":
          return `⚽ ${winner} venció a ${loser} en los penales tras empatar ${data.scoreText}.`;
        case "win-edge-score":
          return `⚽ ${winner} superó por la mínima a ${loser}, ${data.scoreText}.`;
        case "win-decisive-score":
          return `⚽ ${winner} encontró el gol decisivo en su victoria ${data.scoreText}.`;
        case "win-score":
          return `⚽ ${winner} venció ${data.scoreText} a ${loser}.`;
        case "control-shootout":
          return `🌟 La tanda de penales decidió ${context}.`;
        case "control-knockout-clean-sheet":
          return `🌟 La portería a cero de ${winner} puso fin al camino de ${loser}.`;
        case "control-clean-sheet":
          return `🌟 La portería a cero no dejó margen de reacción a ${loser}.`;
        case "control-attack":
          return `🌟 El ataque de ${winner} rompió el partido.`;
        case "control-tight":
          return `🌟 ${winner} superó un partido cerrado, decidido por un solo gol.`;
        case "control-finish":
          return `🌟 ${winner} abrió la diferencia suficiente para controlar el cierre.`;
        case "group-three-points-gd":
          return `📊 ${winner} sumó tres puntos y ${data.goalDifference} de diferencia de gol en ${context}.`;
        case "group-three-points":
          return `📊 ${winner} sumó tres puntos en ${context}.`;
        default:
          return "";
      }
    }
    case "slot-unconfirmed":
      return `${data.label} todavía no está confirmado.`;
    case "winner-face":
      return `El ganador se enfrentará a ${data.opponent}${data.searchAction || ""}`;
    case "winner-face-resolved-penalties":
      return `El ganador se enfrentará a ${data.winnerName}, que venció a ${data.loserName} ${data.penaltyText} en los penales tras empatar ${data.scoreText}.${data.searchAction || ""}`;
    case "winner-face-resolved-win":
      return `El ganador se enfrentará a ${data.winnerName}, que venció ${data.scoreText} a ${data.loserName}.${data.searchAction || ""}`;
    case "winner-face-predicted":
      return `El ganador se enfrentará al ganador previsto de ${data.matchup}`;
    case "winner-face-matchup":
      return `El ganador se enfrentará al ganador de ${data.matchup}`;
    case "winner-moves":
      return `El ganador avanza a ${data.nextStage}`;
    case "historical-replay":
      return `Después se disputó una repetición: ${data.summary}`;
    case "historical-qualification":
      if (data.variant === "penalty-win") {
        return `${data.opponent}, que venció a ${data.otherName} en los penales (${data.penaltyText}) tras empatar ${data.scoreText}`;
      }
      if (data.variant === "penalty-loss") {
        return `${data.opponent}, que cayó ante ${data.otherName} en los penales (${data.penaltyText}) tras empatar ${data.scoreText}`;
      }
      if (data.variant === "win") {
        return `${data.opponent}, que venció ${data.teamScoreText} a ${data.otherName}`;
      }
      if (data.variant === "loss") {
        return `${data.opponent}, que perdió ${data.teamScoreText} ante ${data.otherName}`;
      }
      return data.opponent;
    case "historical-advanced-line":
      return `${data.teamName} avanzó para enfrentarse a ${data.clause}.${data.searchAction || ""}`;
    case "historical-next-line":
      return `${data.kind === "winner" ? "El ganador" : "El perdedor"} se enfrentó a ${data.clause}.${data.searchAction || ""}`;
    case "historical-headline": {
      const result = data.status === "cancelled"
        ? "partido cancelado"
        : data.result === "tie"
          ? `empate ${data.scoreText}`
          : data.result === "penalty-win"
            ? `victoria en penales, ${data.scoreText}`
            : data.result === "penalty-loss"
              ? `derrota en penales, ${data.scoreText}`
              : data.result === "win"
                ? `victoria ${data.scoreText}`
                : `derrota ${data.scoreText}`;
      return `${data.teamName}: ${result}`;
    }
    case "historical-opponent":
      return "un rival";
    case "historical-own-goal":
      return `autogol de ${data.name}`;
    case "historical-scorer-count":
      return data.count >= 3
        ? `${data.name} firmó un triplete`
        : data.count === 2
          ? `${data.name} marcó dos goles`
          : `${data.name} marcó`;
    case "historical-benefited-own-goal":
      return `se benefició de un ${data.name}`;
    case "historical-draw-scoring":
      return `⚽ ${data.homeName} y ${data.awayName} terminaron ${data.scoreText}.`;
    case "historical-outcome":
      if (data.variant === "cancelled") {
        return `🚫 ${data.homeName} vs. ${data.awayName} fue cancelado.`;
      }
      if (data.variant === "draw") {
        return `🤝 ${data.homeName} y ${data.awayName} empataron ${data.scoreText}.`;
      }
      if (data.variant === "penalties") {
        return `🎯 ${data.winner} venció a ${data.loser} en los penales tras empatar ${data.scoreText}.`;
      }
      return `🏁 ${data.winner} venció ${data.scoreText} a ${data.loser}.`;
    case "historical-control":
      if (data.variant === "cancelled") {
        return `📌 El partido cancelado se conserva en el archivo de ${data.context}.`;
      }
      if (data.variant === "shootout") {
        return `🌟 La tanda de penales decidió ${data.context}.`;
      }
      if (data.variant === "extra-time") {
        return `🌟 ${data.winner || "El partido"} se resolvió en la prórroga.`;
      }
      if (data.variant === "clean-sheet") {
        return `🌟 ${data.winner} mantuvo la portería a cero.`;
      }
      if (data.variant === "open") {
        return `🌟 ${data.winner} rompió el partido.`;
      }
      if (data.variant === "protected") {
        return `🌟 ${data.winner} protegió el resultado.`;
      }
      if (data.variant === "draw-scoreless") {
        return `🌟 ${data.homeFocus} y ${data.awayFocus} sostuvieron el duelo sin encontrar el gol.`;
      }
      return `🌟 ${data.homeFocus} y ${data.awayFocus} intercambiaron el impulso sin que hubiera un ganador.`;
    case "historical-result-progress":
      if (data.variant === "cancelled") {
        return `📊 Este partido cancelado de ${data.context} no produjo puntos ni avance.`;
      }
      if (data.variant === "group-draw") {
        return `📊 Ambas selecciones sumaron un punto en ${data.context}.`;
      }
      if (data.variant === "group-win") {
        return `📊 ${data.winner} sumó tres puntos en ${data.context}.`;
      }
      if (data.variant === "champion") {
        return `🏆 ${data.winner} conquistó ${data.tournament}.`;
      }
      if (data.variant === "third") {
        return `🥉 ${data.winner} terminó tercero en ${data.tournament}.`;
      }
      if (data.variant === "advanced") {
        return `📊 ${data.winner} avanzó desde ${data.context}.`;
      }
      return `📊 ${data.context} terminó en empate.`;
    case "historical-progress":
      if (data.variant === "next") {
        return `Siguiente: ${data.round} vs. ${data.opponent}, ${data.date}.`;
      }
      if (data.variant === "champion") {
        return `Ese resultado aseguró el título de ${data.tournament}.`;
      }
      if (data.variant === "runner-up") {
        return `Ese resultado cerró su camino en ${data.tournament} como subcampeón.`;
      }
      if (data.variant === "third-win") {
        return `Ese resultado aseguró el tercer puesto en ${data.tournament}.`;
      }
      if (data.variant === "third-loss") {
        return `Ese resultado cerró su camino en ${data.tournament} en el partido por el tercer puesto.`;
      }
      return `Fue su último partido disponible en ${data.tournament}.`;
    case "historical-team-body": {
      const result = data.status === "cancelled"
        ? `Estaba programado contra ${data.opponent}, pero el partido fue cancelado.`
        : data.result === "tie"
          ? `Empató ${data.scoreText} con ${data.opponent} en ${data.round}.`
          : data.result === "win"
            ? `Venció ${data.scoreText} a ${data.opponent} en ${data.round}.`
            : `Perdió ${data.scoreText} ante ${data.opponent} en ${data.round}.`;
      return [result, data.scorerText, data.progressionText].filter(Boolean).join(" ");
    }
    default:
      return "";
  }
}

export function formatWorldCupShootoutHistory(type, data = {}) {
  const team = (value) => translateTeamName(value);
  if (type === "both-new") {
    return `Si llegan a los penales, sería la primera tanda mundialista tanto para ${team(data.homeName)} como para ${team(data.awayName)}.`;
  }
  if (type === "one-new-winless") {
    return `Si llegan a los penales, sería la primera tanda de ${team(data.newName)}; ${team(data.experiencedName)} aún busca su primera victoria después de ${data.appearances} ${Number(data.appearances) === 1 ? "tanda mundialista" : "tandas mundialistas"}.`;
  }
  if (type === "one-new-experienced") {
    return `Si llegan a los penales, ${team(data.experiencedName)} aporta ${data.wins} ${Number(data.wins) === 1 ? "victoria" : "victorias"} en ${data.appearances} ${Number(data.appearances) === 1 ? "tanda mundialista" : "tandas mundialistas"}; sería la primera de ${team(data.newName)}.`;
  }
  if (type === "both-winless") {
    return `Si llegan a los penales, ambos buscan su primera victoria en una tanda mundialista: ${team(data.homeName)} lo ha intentado ${data.homeAppearances} ${Number(data.homeAppearances) === 1 ? "vez" : "veces"} y ${team(data.awayName)}, ${data.awayAppearances}.`;
  }
  if (type === "same-record") {
    return `Si llegan a los penales, ${team(data.homeName)} y ${team(data.awayName)} comparten un balance mundialista de ${data.wins} ${Number(data.wins) === 1 ? "victoria" : "victorias"} en ${data.appearances} ${Number(data.appearances) === 1 ? "tanda" : "tandas"}.`;
  }
  return `Si llegan a los penales, ${team(data.leanName)} puede tener una ligera ventaja de ${data.edgeType === "experience" ? "experiencia" : "historial"}: ${data.leanWins} ${Number(data.leanWins) === 1 ? "victoria" : "victorias"} en ${data.leanAppearances} ${Number(data.leanAppearances) === 1 ? "tanda mundialista" : "tandas mundialistas"}, frente a ${data.otherWins} ${Number(data.otherWins) === 1 ? "victoria" : "victorias"} en ${data.otherAppearances} ${Number(data.otherAppearances) === 1 ? "tanda mundialista" : "tandas mundialistas"} de ${team(data.otherName)}.`;
}

export function formatSourcedShootoutReason(type, data = {}) {
  if (type === "goalkeeper-taker") {
    return `Si llegan a los penales, ${translateTeamName(data.teamName)} puede tener una ligera ventaja: ${data.goalkeeperName} ha detenido ${data.saved} de ${data.faced} lanzamientos de tanda —${data.highlightSaved} en la final de 2023— y ${data.takerName} convierte el ${data.conversion}% de sus penales en su carrera.`;
  }
  return `Si llegan a los penales, ${translateTeamName(data.teamName)} puede tener una ligera ventaja: ha ganado ${data.wins} de sus ${data.appearances} tandas mundialistas y ${data.goalkeeperName} nunca ha perdido una con su selección.`;
}

function deepFreeze(value, seen = new WeakSet()) {
  if ((typeof value !== "object" && typeof value !== "function") || value === null || seen.has(value)) {
    return value;
  }
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key], seen);
  }
  return Object.freeze(value);
}

const pack = deepFreeze({
  schemaVersion: 1,
  language: "es",
  domain: "app",
  locale: "es-419",
  htmlLang: "es-419",
  direction: "ltr",
  ui: UI,
  text: {
    exact: EXACT,
    patterns: PATTERNS
  },
  entities: {
    teams: TEAMS,
    teamNames: TEAM_NAMES,
    timeZones: TIME_ZONES,
    venueNames: VENUE_NAMES,
    venueLocations: VENUE_LOCATIONS,
    stages: STAGES,
    lineupPositions: LINEUP_POSITIONS,
    playerPositions: PLAYER_POSITIONS,
    playerSkillLabels: PLAYER_SKILL_LABELS,
    styleTerms: STYLE_TERMS
  },
  helpers: {
    translateText: translateAppText,
    translateTeamName,
    translateLineupPosition,
    translateStageLabel,
    getTimeZoneLabel,
    formatGroupLabel,
    formatMatchLabel,
    formatVersus,
    formatPoints,
    formatGamesLeft,
    formatWorldCupYear,
    getSeoHomeCopy,
    getSeoMatchCopy,
    formatPlayerSkill,
    formatPlayerNote,
    isTemplatedPlayerNote,
    formatAppMessage,
    formatWorldCupShootoutHistory,
    formatSourcedShootoutReason
  }
});

export default pack;
