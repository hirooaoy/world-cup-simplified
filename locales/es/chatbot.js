const plural = (count, singular, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`;
const naturalList = (items) => items.length < 2
  ? (items[0] || "")
  : `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;

const copy = {
  assistantName: "Ball Boy",
  status: "Pregúntame sobre fútbol",
  initialMessage: "Puedes preguntarme por jugadores, selecciones, partidos o reglas.",
  open: "Abrir Ball Boy",
  chatLabel: "Chat de Ball Boy",
  reset: "Iniciar un chat nuevo",
  newChat: "Nuevo chat",
  close: "Cerrar Ball Boy",
  suggestedQuestions: "Preguntas sugeridas",
  suggestions: ["Explícame el fuera de juego", "¿Quién ganó el Mundial 2026?", "¿Cómo juega Argentina?", "Reportar un problema"],
  showMore: "Mostrar más de la respuesta de Ball Boy",
  moreBelow: "Hay más abajo",
  askLabel: "Hazle una pregunta a Ball Boy",
  placeholder: "Pregunta sobre fútbol…",
  send: "Enviar pregunta",
  thinking: "Ball Boy está pensando",
  followUps: "Preguntas relacionadas",
  country: "Selección",
  player: "Jugador",
  match: "Partido",
  ruleSimple: "La regla, en sencillo",
  whatIKnow: "Qué puedes preguntar",
  whichPlayer: "¿Qué jugador?",
  dataProblem: "Problema con los datos",
  tryAgain: "Intentar de nuevo",
  countryUnavailable: "Selección no disponible",
  theirCountry: "su selección",
  currentWorldCup: "Mundial actual",
  pastWorldCups: "Mundiales anteriores",
  playerFallback: "Jugador",
  playerOverviewIntro: (name) => `Aquí tienes más información sobre ${name}.`,
  flag: "bandera",
  officialLaw: "Leer la regla oficial de IFAB ↗",
  worldCupStats: "Estadísticas del Mundial y datos del jugador",
  thisWorldCup: "En este Mundial",
  worldCupArchive: "Archivo del Mundial",
  worldCupEditions: "Mundiales",
  worldCupContext: (years, count) => `En ${count === 1 ? "el Mundial" : "los Mundiales"} de ${years}`,
  featuredMatches: "Partidos destacados",
  playerDetails: "Datos del jugador",
  goals: "Goles",
  assists: "Asistencias",
  recordedAssists: (count) => plural(count, "asistencia registrada", "asistencias registradas"),
  assistsTitle: "Asistencias registradas en los eventos de los partidos del Mundial.",
  age: "Edad",
  estimatedValue: "Valor est.",
  value: "Valor",
  estimatedValueTitle: "Valor de mercado estimado a partir de datos públicos con fuentes.",
  valueTitle: "Valor de mercado procedente de datos públicos con fuentes.",
  prime: "Máximo",
  signatureTraits: "Rasgos distintivos",
  threeTraits: "Tres rasgos distintivos",
  readPlay: "Cómo leer la jugada",
  whyWatch: "Por qué seguirlo",
  lastMatch: "Último partido",
  nextMatch: "Próximo partido",
  score: (home, away) => `Marcador: ${home}-${away}`,
  penaltiesScore: (home, away) => `Penales: ${home}-${away}`,
  versus: "Contra",
  pens: "pen.",
  fifaRank: (rank, year) => `Puesto FIFA: ${rank}${year ? ` (${year})` : ""}`,
  group: (group) => `Grupo ${group}`,
  groupPosition: (position, points) => `${position}.º del grupo · ${points} pts`,
  recentForm: "Racha reciente en el torneo",
  form: "Racha",
  resultLabels: {
    draw: "Empate",
    loss: "Derrota",
    "shootout-loss": "Eliminado en penales; cuenta como empate",
    "shootout-win": "Avanzó en penales; cuenta como empate",
    win: "Victoria"
  },
  adaptMatch: "Adaptarse al partido",
  keyPlayers: "Jugadores clave",
  topScorer: "Máximo goleador",
  goalCount: (count) => plural(count, "gol", "goles"),
  fullRecord: "Balance completo del torneo",
  tournamentFinish: "Resultado en el torneo",
  tournamentFinal: "Final",
  tournamentAwards: "Premios del torneo",
  tournamentMatches: "Partidos",
  tournamentGoals: "Goles",
  verifiedSources: "Fuentes verificadas",
  wins: "Victorias",
  draws: "Empates",
  losses: "Derrotas",
  goalsBalance: (scored, conceded) => `${scored} a favor · ${conceded} en contra`,
  onPenalties: "En penales",
  advancedOnce: "avanzó una vez",
  advancedTimes: (count) => `avanzó ${count} veces`,
  exitedOnce: "quedó eliminado una vez",
  exitedTimes: (count) => `quedó eliminado ${count} veces`,
  shootoutDrawNote: "Las tandas cuentan como empate en V-E-D.",
  howTheyPlay: "Cómo juegan",
  teamStyleFlow: "Secuencia de juego",
  afterPenalties: "Tras los penales",
  afterExtraTime: "Tras la prórroga",
  fullTime: "Final",
  live: "En vivo",
  penalties: "Penales",
  goalTimeline: "Cronología de goles",
  scoringTeam: "Equipo que marcó",
  assist: "Asistencia",
  penaltyShort: "pen.",
  matchChanges: "Momentos clave",
  playPlans: "Cómo podrían jugar",
  currentComparison: "Comparación en el torneo",
  pastMeetings: "Enfrentamientos anteriores",
  prediction90: "Pronóstico verificado a 90 minutos",
  verifiedH2hSource: "Fuente verificada del historial ↗",
  verifiedPredictionSource: "Fuente verificada del pronóstico ↗",
  noH2h: "No hay enfrentamientos verificados entre las selecciones absolutas antes de este partido.",
  checkingH2h: "El historial de enfrentamientos aún se está verificando.",
  beforeMatch: "Antes de este partido",
  verifiedHighlights: "Ver resumen oficial verificado",
  official: "Oficial",
  tbd: "Por definir",
  scoreAria: (home, away) => `${home} a ${away}`,
  flowAriaSeparator: "; ",
  watchListTitle: "Jugadores a seguir",
  languageActionIntro: "Puedo hacerlo. También puedes cambiar el idioma desde Configuración, arriba a la derecha.",
  timeZoneActionIntro: "Puedo hacerlo. También puedes cambiar la zona horaria desde Configuración, arriba a la derecha.",
  timeZoneClarification: "¿Qué zona horaria quieres usar? También puedes elegirla desde Configuración, arriba a la derecha.",
  timeZoneRegionClarification: (region) => `¿Qué zona horaria de ${region}?`,
  timeZoneUnmatched: (location) => `No pude relacionar «${location}» con una sola zona horaria. Prueba con una ciudad importante cercana o elígela en Configuración.`,
  switchLanguage: (language) => `Cambiar a ${language}`,
  switchTimeZone: (timeZone) => `Cambiar a ${timeZone}`,
  openSettings: "Abrir configuración",
  languageAlreadySet: (language) => `Ya estás usando ${language}. También puedes cambiarlo desde Configuración, arriba a la derecha.`,
  timeZoneAlreadySet: (timeZone) => `Ya estás usando ${timeZone}. También puedes cambiarla desde Configuración, arriba a la derecha.`,
  languageChanged: (language) => `Idioma cambiado a ${language}.`,
  timeZoneChanged: (timeZone) => `Zona horaria cambiada a ${timeZone}.`,
  unsupportedLanguage: "Actualmente admito inglés, chino, español y coreano.",
  unsupportedTimeZone: "Esa zona horaria todavía no está disponible.",
  reportIssue: "Reportar un problema",
  reportIssueIntro: "Aquí tienes el formulario para reportar un problema.",
  errorText: "No pude cargar los datos. Inténtalo de nuevo.",
  errorFollowUps: []
};

const teamNames = {
  ALG: "Argelia", ARG: "Argentina", AUS: "Australia", AUT: "Austria", BEL: "Bélgica",
  BIH: "Bosnia y Herzegovina", BRA: "Brasil", CAN: "Canadá", CIV: "Costa de Marfil",
  COD: "República Democrática del Congo", COL: "Colombia", CPV: "Cabo Verde", CRO: "Croacia",
  CUW: "Curazao", CZE: "Chequia", ECU: "Ecuador", EGY: "Egipto", ENG: "Inglaterra",
  ESP: "España", FRA: "Francia", GER: "Alemania", GHA: "Ghana", HAI: "Haití",
  IRN: "Irán", IRQ: "Irak", JOR: "Jordania", JPN: "Japón", KOR: "Corea del Sur",
  KSA: "Arabia Saudita", MAR: "Marruecos", MEX: "México", NED: "Países Bajos",
  NOR: "Noruega", NZL: "Nueva Zelanda", PAN: "Panamá", PAR: "Paraguay", POR: "Portugal",
  QAT: "Catar", RSA: "Sudáfrica", SCO: "Escocia", SEN: "Senegal", SUI: "Suiza",
  SWE: "Suecia", TUN: "Túnez", TUR: "Turquía", URU: "Uruguay", USA: "Estados Unidos",
  UZB: "Uzbekistán"
};

const timeZoneNames = {
  UTC: "UTC",
  "America/Los_Angeles": "Los Ángeles",
  "America/Denver": "Denver",
  "America/Chicago": "Chicago",
  "America/New_York": "Nueva York",
  "America/Phoenix": "Phoenix",
  "America/Anchorage": "Anchorage",
  "Pacific/Honolulu": "Honolulu",
  "America/Vancouver": "Vancouver",
  "America/Edmonton": "Edmonton",
  "America/Winnipeg": "Winnipeg",
  "America/Toronto": "Toronto",
  "America/Halifax": "Halifax",
  "America/St_Johns": "San Juan de Terranova",
  "America/Noronha": "Fernando de Noronha",
  "America/Mexico_City": "Ciudad de México",
  "America/Tijuana": "Tijuana",
  "America/Chihuahua": "Chihuahua",
  "America/Cancun": "Cancún",
  "America/Sao_Paulo": "São Paulo",
  "America/Cuiaba": "Cuiabá",
  "America/Manaus": "Manaos",
  "America/Rio_Branco": "Río Branco",
  "America/Buenos_Aires": "Buenos Aires",
  "America/Santiago": "Santiago",
  "Pacific/Easter": "Isla de Pascua",
  "America/Guayaquil": "Guayaquil",
  "Pacific/Galapagos": "Islas Galápagos",
  "Europe/London": "Londres",
  "Europe/Paris": "París",
  "Europe/Madrid": "Madrid",
  "Europe/Lisbon": "Lisboa",
  "Atlantic/Madeira": "Madeira",
  "Atlantic/Azores": "Azores",
  "Atlantic/Canary": "Islas Canarias",
  "Europe/Kaliningrad": "Kaliningrado",
  "Europe/Moscow": "Moscú",
  "Asia/Yekaterinburg": "Ekaterimburgo",
  "Asia/Omsk": "Omsk",
  "Asia/Krasnoyarsk": "Krasnoyarsk",
  "Asia/Irkutsk": "Irkutsk",
  "Asia/Yakutsk": "Yakutsk",
  "Asia/Vladivostok": "Vladivostok",
  "Asia/Kamchatka": "Kamchatka",
  "Asia/Shanghai": "Shanghái",
  "Asia/Jakarta": "Yakarta",
  "Asia/Makassar": "Macasar",
  "Asia/Jayapura": "Jayapura",
  "Asia/Seoul": "Seúl",
  "Asia/Tokyo": "Tokio",
  "Asia/Kolkata": "Calcuta",
  "Asia/Singapore": "Singapur",
  "Australia/Sydney": "Sídney",
  "Australia/Brisbane": "Brisbane",
  "Australia/Adelaide": "Adelaida",
  "Australia/Darwin": "Darwin",
  "Australia/Perth": "Perth",
  "Pacific/Auckland": "Auckland"
};

const positions = {
  goalkeeper: "portero", defender: "defensa", "centre-back": "defensa central",
  "center-back": "defensa central", "left-back": "lateral izquierdo", "right-back": "lateral derecho",
  midfielder: "centrocampista", "defensive midfielder": "mediocentro defensivo",
  "central midfielder": "centrocampista", "attacking midfielder": "mediapunta", winger: "extremo",
  "left winger": "extremo izquierdo", "right winger": "extremo derecho", forward: "delantero",
  striker: "delantero centro", player: "jugador"
};

const styles = {
  "aerial defending": "defensa aérea", "aerial duels": "duelos aéreos", "aerial finishing": "remate aéreo",
  "aerial targets": "referencias aéreas", "back line command": "mando de la defensa", "ball carrying": "conducción",
  "ball winning": "recuperación", "box command": "dominio del área", "box entries": "llegadas al área",
  "box finishing": "definición en el área", "chance creation": "creación de ocasiones", "chance passes": "pases de peligro",
  "channel runs": "desmarques por los canales", "close control": "control en espacios reducidos",
  "counter attacks": "contraataques", "counter press": "presión tras pérdida", crossing: "centros",
  "direct combinations": "combinaciones directas", "direct running": "conducciones verticales", distribution: "distribución",
  "early service": "centros tempranos", "elite pace": "velocidad de élite",
  "elite penalty box finishing": "definición de élite en el área", "final pass": "último pase", finishing: "definición",
  "first time finishing": "remate de primera", "high press": "presión alta", "hold up play": "juego de espaldas",
  "left channel finishing": "definición desde el canal izquierdo", "left footed passing": "pase con la izquierda",
  "long passing": "pase largo", "midfield screening": "protección del mediocampo",
  "one on one defending": "defensa individual", "overlap timing": "timing de las subidas",
  "penalty box finishing": "definición en el área", "power runs": "conducciones potentes",
  "press resistance": "resistencia a la presión", "progressive passing": "pase progresivo",
  "reaction saves": "paradas de reflejos", "recovery defending": "defensa en repliegue",
  "recovery speed": "velocidad de recuperación", "second balls": "segundas jugadas", "set pieces": "balón parado",
  "set piece delivery": "lanzamiento a balón parado", "shot stopping": "paradas", "tempo control": "control del ritmo",
  "through balls": "pases al espacio", "transition terror": "amenaza en transición",
  "transition speed": "velocidad de transición", "vertical passing": "pase vertical",
  "wide counters": "contraataques por fuera", "wide overloads": "superioridades en banda",
  "attacking structure": "estructura ofensiva", "counter-attack": "contraataque",
  "counter-pressing": "presión tras pérdida", "defensive organization": "organización defensiva",
  "direct transitions": "transiciones directas", "positional discipline": "disciplina posicional",
  "possession control": "control de la posesión", "set-piece focus": "énfasis en el balón parado",
  "wing overloads": "superioridades en banda", "youth pipeline": "integración de jóvenes"
};

const coachNames = {
  "Emerse Fae": "Emerse Faé", "Herve Renard": "Hervé Renard", "Luis De La Fuente": "Luis de la Fuente",
  "Nestor Lorenzo": "Néstor Lorenzo", "Roberto Martinez": "Roberto Martínez",
  "Sebastian Beccacece": "Sebastián Beccacece", "Sebastien Desabre": "Sébastien Desabre",
  "Sebastien Migne": "Sébastien Migné", "Stale Solbakken": "Ståle Solbakken",
  "Tony Popovic": "Tony Popović", "Vladimir Petkovic": "Vladimir Petković",
  "Zlatko Dalic": "Zlatko Dalić"
};

const stages = {
  group: "Fase de grupos", "round-of-32": "Dieciseisavos de final", "round-of-16": "Octavos de final",
  "quarter-finals": "Cuartos de final", "semi-finals": "Semifinal", "bronze-final": "Partido por el tercer puesto",
  final: "Final"
};

const rules = {
  shootout: {
    title: "Tanda de penales",
    lead: "Si una eliminatoria sigue empatada después de la prórroga, los equipos lanzan penales por turnos para decidir quién avanza.",
    flow: [{ value: "120′", label: "Sigue empatado" }, { value: "⚽", label: "5 por equipo" }, { value: "1×1", label: "Muerte súbita" }],
    points: [{ title: "Los primeros cinco", text: "Cada equipo empieza con cinco lanzamientos de jugadores distintos." }, { title: "¿Sigue el empate?", text: "Continúan con uno por equipo hasta que uno marque y el otro falle." }],
    takeaway: "Cinco lanzamientos por equipo y, si sigue el empate, uno por uno."
  },
  "red-card": {
    title: "Tarjeta roja", lead: "Una tarjeta roja expulsa al jugador. No puede volver y su equipo no puede reemplazarlo.",
    flow: [{ value: "11", label: "Jugadores" }, { value: "🟥", label: "Expulsión" }, { value: "10", label: "Quedan" }],
    points: [{ title: "Roja directa", text: "Una infracción grave puede provocar una expulsión inmediata." }, { title: "Dos amarillas", text: "La segunda amarilla del mismo partido también supone la expulsión." }],
    takeaway: "El equipo juega con un futbolista menos."
  },
  "yellow-card": {
    title: "Tarjeta amarilla", lead: "Una tarjeta amarilla es una advertencia oficial para un jugador o integrante del cuerpo técnico.",
    flow: [{ value: "Falta", label: "Acción temeraria" }, { value: "🟨", label: "Advertencia" }, { value: "🟨🟨", label: "Después, roja" }],
    points: [{ title: "Por qué se muestra", text: "Entre las causas habituales están las faltas temerarias, retrasar el juego, protestar o reincidir." }, { title: "Segunda amarilla", text: "Dos amarillas en el mismo partido se convierten en roja y el jugador es expulsado." }],
    takeaway: "Dos amarillas en el mismo partido equivalen a una roja."
  },
  handball: {
    title: "Mano", lead: "No todo contacto con la mano o el brazo es infracción. Importan la acción y la posición del brazo.",
    flow: [{ value: "⚽", label: "Llega el balón" }, { value: "💪", label: "Acción del brazo" }, { value: "📣", label: "Decide el árbitro" }],
    points: [{ title: "Suele ser infracción", text: "El jugador toca el balón deliberadamente o agranda el cuerpo de forma antinatural con el brazo." }, { title: "No es automática", text: "Un contacto accidental a corta distancia, con el brazo en posición natural, puede no sancionarse." }],
    takeaway: "El contacto con la mano o el brazo, por sí solo, no basta."
  },
  "penalty-kick": {
    title: "Penal", lead: "Una infracción sancionable con tiro libre directo del equipo defensor dentro de su propia área suele conceder un penal.",
    flow: [{ value: "Falta", label: "Dentro del área" }, { value: "11 m", label: "Punto penal" }, { value: "1v1", label: "Lanzador y portero" }],
    points: [{ title: "La colocación", text: "El balón se sitúa en el punto penal. Al golpeo, parte de al menos un pie del portero debe tocar la línea, estar a su altura o detrás de ella." }, { title: "Los demás", text: "El resto de jugadores espera fuera del área y detrás del balón." }],
    takeaway: "El lanzador se enfrenta al portero desde 11 metros."
  },
  var: {
    title: "VAR", lead: "El VAR ayuda al árbitro a revisar un grupo reducido de decisiones importantes que pueden cambiar el partido.",
    flow: [{ value: "👀", label: "Incidente" }, { value: "🎥", label: "Revisión" }, { value: "📣", label: "Decisión" }],
    points: [{ title: "Qué revisa", text: "Goles, decisiones de penal, rojas directas y confusión de identidad." }, { title: "Quién decide", text: "El árbitro de campo conserva la decisión final, a veces tras ver el monitor." }],
    takeaway: "El VAR asesora. El árbitro decide."
  },
  "extra-time": {
    title: "Prórroga", lead: "En algunas eliminatorias, un empate tras 90 minutos lleva a otros 30 minutos de fútbol.",
    flow: [{ value: "90′", label: "Empate" }, { value: "+15′", label: "Primera parte" }, { value: "+15′", label: "Segunda parte" }],
    points: [{ title: "No es tiempo añadido", text: "La prórroga son dos periodos nuevos de 15 minutos. El tiempo añadido se agrega dentro de un periodo." }, { title: "¿Sigue el empate?", text: "Si debe haber un ganador, normalmente sigue una tanda de penales." }],
    takeaway: "La prórroga son dos periodos más de 15 minutos."
  },
  "stoppage-time": {
    title: "Tiempo añadido", lead: "El árbitro recupera al final de cada parte el tiempo perdido mientras el reloj siguió corriendo.",
    flow: [{ value: "45′", label: "Casi al descanso" }, { value: "+4′", label: "Tiempo añadido" }, { value: "Desc.", label: "Descanso" }],
    points: [{ title: "Por qué se añade", text: "Los cambios, lesiones, celebraciones, revisiones y retrasos deliberados pueden aumentar ese tiempo." }, { title: "No es prórroga", text: "90+4 es el cuarto minuto añadido después del 90. La prórroga es otro periodo de 30 minutos en algunas eliminatorias." }],
    takeaway: "El tablero muestra el tiempo mínimo que se añadirá."
  },
  "group-points": {
    title: "Puntos de grupo", lead: "La tabla premia los resultados: tres puntos por victoria, uno por empate y ninguno por derrota.",
    flow: [{ value: "+3", label: "Victoria" }, { value: "+1", label: "Empate" }, { value: "+0", label: "Derrota" }],
    points: [{ title: "Diferencia de goles", text: "Goles a favor menos goles en contra. Es un desempate habitual cuando hay igualdad de puntos." }, { title: "¿Y después?", text: "La competición aplica su orden de desempates publicado si continúa la igualdad." }],
    takeaway: "Victoria 3 · Empate 1 · Derrota 0"
  },
  substitution: {
    title: "Sustitución", lead: "Una sustitución cambia a un jugador por otro durante el partido.",
    flow: [{ value: "↓", label: "Sale" }, { value: "↔", label: "Cambio" }, { value: "↑", label: "Entra" }],
    points: [{ title: "Por qué se hace", text: "Para aportar piernas frescas, responder a una lesión, cambiar la táctica o introducir un perfil distinto." }, { title: "¿Puede volver?", text: "En el Mundial absoluto, un jugador sustituido no puede regresar a ese partido." }],
    takeaway: "Un jugador sustituido no puede volver en esta competición."
  }
};

const personality = {
  identity: { label: "Sobre mí", text: "Soy Ball Boy. Hago que el fútbol sea más fácil de entender." },
  life: { label: "Filosofía", text: "Ni idea." },
  football: { label: "Fútbol", text: "Dos equipos intentan marcar más goles que el rival. La mayoría de los partidos dura 90 minutos." },
  "football-special": { label: "Fútbol", text: "Es fácil empezar y muy difícil dominarlo." },
  reality: { label: "Comprobación", text: "Soy un chatbot." },
  soccer: { label: "Terminología", text: "Te refieres al fútbol." },
  "soccer-etymology": { label: "Terminología", text: "«Soccer» procede de «association football»." },
  "best-player": { label: "Mejor jugador", text: "Depende: ¿ahora mismo, en este torneo o de todos los tiempos?" },
  "best-country": { label: "Mejor selección", text: "Depende: ¿estado de forma, títulos o este Mundial?" },
  "haaland-denial": { label: "Persona equivocada", text: "No." },
  greeting: { label: "Ball Boy", text: "Hola. Pregunta lo que quieras." },
  mood: { label: "Ball Boy", text: "Bien." },
  thanks: { label: "Ball Boy", text: "Cuando quieras." },
  joke: { label: "Ball Boy", text: "No tengo ninguno bueno." }
};

const offside = {
  intro: "El fuera de juego evita que los atacantes esperen un pase junto a la portería rival.",
  summary: "Mira el instante en que un compañero juega el balón. Un atacante está en posición de fuera de juego si está en campo rival y más cerca de la línea de meta que el balón y el penúltimo adversario.",
  legend: "P = pasador · A = atacante · D = defensor · GK = portero",
  offside: "Fuera de juego", tooEarly: "Arrancó demasiado pronto", line: "Línea",
  offsideAria: "Ejemplo de fuera de juego. El atacante supera la línea del penúltimo adversario cuando un compañero juega el balón.",
  offsideExample: "A ya ha superado la línea cuando P pasa y después interviene.",
  onside: "Posición legal", legalRun: "Desmarque válido",
  onsideAria: "Ejemplo de posición legal. El atacante está a la altura de la línea del penúltimo adversario cuando un compañero juega el balón y corre hacia delante después.",
  onsideExample: "A está a la altura de la línea y la supera después de que P juegue el balón.",
  alsoOnside: "También está habilitado:", alsoOnsideText: "si A está en su propio campo o detrás del balón.",
  noDirect: "No hay fuera de juego directo:", noDirectText: "en saque de meta, saque de banda o córner.",
  whySecondLast: "¿Por qué el penúltimo?", whySecondLastText: "El portero suele ser el último adversario, por lo que el último defensor de campo acostumbra a marcar la línea.",
  involvement: "La posición por sí sola no basta.", involvementText: "Solo es infracción si A juega el balón, disputa con un rival, tapa la visión o influye de otra forma en la jugada.",
  followUps: ["Explícame una tarjeta roja", "¿Qué es el VAR?", "Explícame un penal"]
};

const intents = {
  exact: [
    [/^(?:hola|buenas)(?: ball boy)?$/, "hello"],
    [/^quien eres$/, "who are you"],
    [/^(?:que es la vida|cual es el sentido de la vida)$/, "what is life"],
    [/^que es el futbol$/, "what is football"],
    [/^por que es especial el futbol$/, "why is football special"],
    [/^(?:eres real|eres una persona real|eres un chatbot|eres una ia)$/, "are you real"],
    [/^que es soccer$/, "what is soccer"],
    [/^(?:por que se llama soccer|de donde viene la palabra soccer)$/, "why is it called soccer"],
    [/^(?:quien es el mejor jugador|quien es el goat)$/, "who is the best player"],
    [/^(?:cual es la mejor seleccion|que pais es el mejor)$/, "which country is the best"],
    [/^eres haaland$/, "are you haaland"],
    [/^como estas$/, "how are you"],
    [/^que puedo preguntar$/, "what can i ask"],
    [/^(?:gracias|muchas gracias)$/, "thanks"],
    [/^(?:cuenta un chiste|dime un chiste de futbol)$/, "tell me a joke"]
  ],
  replacements: [
    [/premios? del mundial|premios? de la copa del mundo/g, " world cup awards "],
    [/balon de oro/g, " golden ball "], [/bota de oro/g, " golden boot "], [/guante de oro/g, " golden glove "],
    [/mejor jugador joven/g, " young player "], [/juego limpio/g, " fair play "],
    [/resume(?:me)? el mundial|resumen del mundial|repaso del mundial/g, " summarize world cup "],
    [/hasta donde llego|en que ronda quedo|como le fue/g, " how far did go "],
    [/quien (?:ha )?ganado mas|quien gano mas|seleccion con mas titulos/g, " who won most world cups "],
    [/el mundial anterior|la edicion anterior/g, " previous world cup "],
    [/el ano pasado|la ultima vez|el ultimo mundial/g, " last world cup "],
    [/este ano|este mundial/g, " this year "], [/quien gano|quien ha ganado/g, " who won "],
    [/por ultima vez/g, " last "], [/cuantos mundiales (?:ha )?ganado/g, " how many world cups won "],
    [/gano|ha ganado/g, " won "],
    [/fuera de juego/g, " offside "], [/tanda de (?:penales|penaltis)/g, " penalty shootout "],
    [/tiempo añadido|descuento/g, " stoppage time "], [/prorroga/g, " extra time "],
    [/tarjeta roja|roja/g, " red card "], [/tarjeta amarilla|amarilla/g, " yellow card "],
    [/mano/g, " handball "], [/penalti|penal/g, " penalty kick "], [/sustitucion|cambio/g, " substitution "],
    [/explica(?:me)?|que es/g, " explain "], [/hablame de|quien es/g, " tell me about "],
    [/cuantos goles/g, " how many goals "], [/asistencias/g, " assists "],
    [/valor de mercado|cuanto vale/g, " market value "], [/cuantos anos|que edad|edad/g, " age "],
    [/fecha de nacimiento|cuando nacio/g, " birthday "], [/numero de camiseta|dorsal/g, " shirt number "],
    [/club/g, " club "], [/posicion/g, " position "], [/como juega|estilo de juego/g, " play style "],
    [/proximo partido|siguiente partido|proximo rival/g, " next match "], [/ultimo partido/g, " last match "],
    [/quien marco/g, " who scored "], [/quien gano|resultado/g, " who won result "],
    [/quien ganara|pronostico/g, " who would win prediction "], [/ultimo enfrentamiento/g, " last meeting "],
    [/diferencia de goles/g, " goal difference "], [/maximo goleador|goleador principal/g, " top scorer "],
    [/historial|enfrentamientos directos/g, " head to head "], [/a quien seguir|jugadores clave/g, " who should i watch "],
    [/hora de inicio|hora del partido/g, " kickoff "], [/resumen oficial|highlights|video del partido/g, " highlights "],
    [/ponme al dia sobre|ponme al dia de|resumeme|resumen de/g, " tell me about "],
    [/cuando|a que hora/g, " when "],
    [/semifinales|semifinal/g, " semi final "], [/cuartos de final/g, " quarter final "],
    [/la final|final del mundial/g, " world cup final "],
    [/mundial/g, " world cup "], [/partido/g, " match "], [/ contra | vs /g, " vs "]
  ]
};

const templates = {
  fallbackTeam: "el equipo",
  fallbackHome: "el equipo local",
  fallbackAway: "el equipo visitante",
  kickoffPending: "Hora de inicio por confirmar",
  ownGoal: (name) => `${name} (autogol)`,
  loanClub: (club, parents) => `${club} (cedido por ${parents})`,
  lastClub: (club) => `Último club: ${club}`,
  playerRole: {
    goal: "El portero protege la meta y a menudo inicia los ataques con el primer pase.",
    defend: "Un defensa primero frena los ataques y después ayuda a avanzar con seguridad.",
    create: "Un centrocampista conecta defensa y ataque: recupera, conserva y encuentra el siguiente pase.",
    "attack-wide": "Un extremo parte abierto, encara al defensor y crea o remata ocasiones cerca del área.",
    finish: "Un delantero lidera el ataque, pero no solo marca: fija defensores, ataca espacios, se asocia y genera remates."
  },
  playerLead: (focus, d) => {
    if (focus === "penalty-goals") return d.penaltyGoals ? `En este Mundial, ${d.name} ha marcado ${plural(d.penaltyGoals, "gol de penal", "goles de penal")}.` : `${d.name} no ha marcado de penal en este Mundial.`;
    if (focus === "stats") return `En este Mundial: ${plural(d.goals, "gol", "goles")} y ${plural(d.assists, "asistencia", "asistencias")}.`;
    if (focus === "value") return d.marketValue ? `El valor de mercado ${d.estimated ? "estimado " : ""}de ${d.name} es ${d.marketValue}.` : `No tengo un valor de mercado verificado para ${d.name}.`;
    if (focus === "league") return d.club && d.league ? `${d.name} juega en ${d.club}, de ${d.league}.` : `No tengo información verificada sobre la liga de ${d.name}.`;
    if (focus === "number") return d.number !== "" ? `${d.name} figura con el dorsal ${d.number} en ${d.team}.` : `No tengo confirmado el dorsal de ${d.name} para el Mundial.`;
    if (focus === "age") return d.askBirth && d.birthday ? `${d.name} nació el ${d.birthday}.` : d.age != null ? `${d.name} tiene ${d.age} años.` : `No tengo una fecha de nacimiento verificada para ${d.name}.`;
    if (focus === "club") return d.club ? `${d.name} juega en ${d.club}${d.league ? ` (${d.league})` : ""}.` : `No tengo un club verificado para ${d.name}.`;
    if (focus === "position") return `${d.name} figura como ${d.position}.`;
    if (focus === "style") return `${d.name} juega como ${d.position}.${d.skills ? ` Conviene fijarse en ${d.skills}.` : ` ${d.role}`}`;
    return `${d.name} juega como ${d.position} para ${d.team}${d.club ? ` y en ${d.club}` : ""}.`;
  },
  playerFollowUps: (d) => [`¿Cuántos goles y asistencias tiene ${d.name}?`, `¿Cómo juega ${d.name}?`, d.team ? `¿Cómo juega ${d.team}?` : "¿Qué puedo preguntar?"],
  playerNote: (d) => d.skills ? `Conviene seguir a ${d.name} por ${d.skills}.` : `${d.name} adapta su función al momento del partido.`,
  teamStyle: (kind) => ({ press: "Intentan recuperar el balón cuanto antes y atacar antes de que el rival se ordene.", compact: "Se mantienen compactos, protegen los espacios clave y salen con rapidez.", possession: "Controlan el balón y el ritmo, y esperan con paciencia a que aparezca el espacio.", wide: "Avanzan con intención y abren el campo para atacar por fuera.", box: "Avanzan con intención y buscan duelos y balones aéreos cerca del área.", default: "Avanzan el balón con intención y adaptan el siguiente pase a la jugada." }[kind] || "Avanzan el balón con intención."),
  countryLead: (focus, d) => {
    if (focus === "next") return d.hasNext ? d.nextLead : `${d.team} no tiene otro partido programado por ahora.`;
    if (focus === "top-scorer") return d.topScorer ? `${d.topScorer} lidera a ${d.team} con ${plural(d.topGoals, "gol", "goles")} en este Mundial.` : d.overview;
    if (focus === "goal-difference") return `La diferencia de goles de ${d.team} en el torneo es ${d.goalDifference > 0 ? "+" : ""}${d.goalDifference}: ${d.goalsFor} a favor y ${d.goalsAgainst} en contra.`;
    if (focus === "goals") return `${d.team} ha marcado ${plural(d.goalsFor, "gol", "goles")} y ha recibido ${plural(d.goalsAgainst, "gol", "goles")} en ${plural(d.played, "partido", "partidos")}.`;
    if (focus === "record") return `${d.team} ha ganado ${d.wins} de ${d.played} partidos en este Mundial.${d.hasShootout ? " Las tandas cuentan como empate en el balance V-E-D." : ""}`;
    return d.overview;
  },
  countryOverview: (d) => `${d.team}: ${plural(d.wins, "victoria", "victorias")}, ${plural(d.draws, "empate", "empates")} y ${plural(d.losses, "derrota", "derrotas")} en ${plural(d.played, "partido", "partidos")}; ${plural(d.goalsFor, "gol", "goles")} a favor y ${d.goalsAgainst} en contra.`,
  countryFollowUps: (d) => [d.player ? `Háblame de ${d.player}` : "", d.hasLast ? `¿Qué pasó en el último partido de ${d.team}?` : "", d.hasNext ? `¿Contra quién juega ${d.team} después?` : `¿Qué jugadores hay que seguir en ${d.team}?`].filter(Boolean),
  matchLead: (state, d) => {
    if (state === "live-draw") return `${d.home} y ${d.away} empatan ${d.homeScore}-${d.awayScore}. El partido sigue en juego.`;
    if (state === "live-lead") return `${d.leader} gana ${d.leaderScore}-${d.trailingScore}. El partido sigue en juego.`;
    if (state === "live") return `${d.home} y ${d.away} están jugando. Aún no hay un marcador final verificado.`;
    if (state === "scheduled") return `${d.home} juega contra ${d.away} el ${d.kickoff}. El partido aún no ha comenzado.`;
    if (state === "penalties") return `${d.winner} avanzó ${d.winnerPen}-${d.loserPen} en los penales tras empatar ${d.homeScore}-${d.awayScore}.`;
    if (state === "winner") return `${d.winner} ganó ${d.winnerScore}-${d.loserScore}${d.extraTime ? " tras la prórroga" : ""}.${d.comeback ? ` ${d.firstTeam} marcó primero, pero ${d.winner} remontó.` : ""}`;
    if (state === "draw") return `${d.home} y ${d.away} terminaron ${d.homeScore}-${d.awayScore}${d.extraTime ? " tras la prórroga" : ""}.`;
    return "El partido figura como finalizado, pero el marcador verificado aún no está disponible.";
  },
  matchFocus: (focus, d) => ({ scorers: d.scorers.length ? `${d.scorers.length === 1 ? "El goleador fue" : "Los goleadores fueron"} ${d.scorersText}.` : "No hubo goles.", when: `${d.home} vs ${d.away}: ${d.kickoff}${/[.!?]$/u.test(d.kickoff) ? "" : "."}`, h2h: "Este es el historial anterior al partido.", highlights: d.hasHighlights ? "Hay un resumen oficial verificado de este partido." : "Todavía no hay un resumen oficial verificado de este partido." }[focus] || d.defaultLead),
  matchFollowUps: (d) => [d.completed ? `¿Quién marcó en ${d.home} vs ${d.away}?` : "", `¿Cómo juega ${d.home}?`, `¿Cómo juega ${d.away}?`].filter(Boolean),
  recapFirst: (goal) => `${goal.name} abrió el marcador en el ${goal.minute}.`,
  recapFinal: (goal) => `${goal.name} marcó el último gol en el ${goal.minute}.`,
  help: {
    categories: [{ example: "¿Cuántos goles tiene Mbappé?", icon: "9", title: "Jugadores" }, { example: "¿Cómo juega Argentina?", icon: "🇦🇷", title: "Selecciones" }, { example: "¿Quién ganó Francia vs España?", icon: "1–2", title: "Partidos" }, { example: "Explícame una tarjeta roja", icon: "🟥", title: "Reglas" }],
    followUps: ["Háblame de Kylian Mbappé", "¿Cómo juega Argentina?", "¿Quién ganó Francia vs España?"], lead: "Elige un tema."
  },
  unknown: { followUps: ["Reportar un problema", "Háblame de Kylian Mbappé", "¿Cómo juega España?"], text: "No entendí la pregunta. Prueba con un jugador, una selección, un partido o una regla." },
  clarification: (options) => ({ lead: "Encontré más de un jugador con ese nombre. ¿A cuál te refieres?", prompts: options.map((item) => `Háblame de ${item.name}${item.team ? ` (${item.team})` : ""}`) }),
  watch: (d) => ({ title: "Jugadores a seguir", lead: d.requestedTeam ? `Estos son tres jugadores de ${d.requestedTeam} a seguir.` : `Estos son tres jugadores a seguir en ${d.matchLabel}.`, prompts: d.players.map((name) => `Háblame de ${name}`), fallbackPosition: "Jugador" }),
  h2hUnavailable: "El historial verificado entre las selecciones absolutas todavía no está disponible.",
  h2hNone: () => "Esta fuente no devolvió enfrentamientos anteriores. No se ha confirmado que el registro histórico esté completo.",
  h2hRecord: (d) => `${d.total} ${d.coverageStatus === "complete" ? "enfrentamientos verificados" : "enfrentamientos seleccionados disponibles en nuestros datos"}: ${d.first} sumaba ${plural(d.firstWins, "victoria", "victorias")}, hubo ${plural(d.draws, "empate", "empates")} y ${d.second} sumaba ${plural(d.secondWins, "victoria", "victorias")}; ${plural(d.goals, "gol", "goles")} en total.${d.coverageStatus === "complete" ? "" : " No se ha confirmado que el registro histórico esté completo."}`,
  lastMeetingUnavailable: "El enfrentamiento verificado más reciente entre las selecciones absolutas todavía no está disponible.",
  lastMeetingDraw: (d) => `${d.home} y ${d.away} empataron ${d.homeScore}-${d.awayScore} el ${d.date} en su enfrentamiento verificado más reciente.`,
  lastMeetingWin: (d) => `${d.winner} venció ${d.winnerScore}-${d.loserScore} a ${d.loser} el ${d.date} en su enfrentamiento verificado más reciente.`,
  hasBeatenYes: (d) => `${d.subject} ha derrotado a ${d.opponent} en un partido verificado entre selecciones absolutas. Su victoria más reciente fue ${d.subjectScore}-${d.opponentScore} el ${d.date}.`,
  hasBeatenNo: (d) => `${d.subject} no ha derrotado a ${d.opponent} en la serie absoluta verificada.`,
  hasBeatenUnknown: (d) => `No hay suficiente historial verificado para confirmar si ${d.subject} ha derrotado a ${d.opponent}.`,
  competition2026: (stage) => `Mundial 2026 · ${stage}`,
  friendly: "Amistoso",
  drawLabel: "Empate",
  predictionNoFixture: (d) => `${d.first} y ${d.second} no tienen programado un enfrentamiento en este Mundial, por lo que no hay un pronóstico verificado.`,
  predictionFinished: (result) => `El partido ya terminó. ${result}`,
  predictionLive: (result) => `El partido ya está en juego. ${result}`,
  predictionUnavailable: "Todavía no hay un pronóstico verificado para este partido.",
  predictionDraw: (d) => `El empate es el resultado más probable a 90 minutos, con un ${d.draw} %. ${d.home} tiene un ${d.homeValue} % y ${d.away} un ${d.awayValue} %. Los pronósticos no son oficiales.`,
  predictionWinner: (d) => `${d.highest} tiene la mayor probabilidad de victoria a 90 minutos, con un ${d.highestValue} %. El empate está en ${d.draw} % y ${d.other} en ${d.otherValue} %. Los pronósticos no son oficiales.`,
  matchupNoFixture: (d) => `${d.first} y ${d.second} no tienen programado un enfrentamiento en este Mundial.`,
  matchupLabels: { history: "Enfrentamientos anteriores", last: "Último enfrentamiento", answer: "Respuesta del historial" },
  matchupPrompts: (d) => ({ prediction: "¿Quién ganaría?", last: "Último enfrentamiento", beaten: `¿${d.first} ha derrotado a ${d.second}?` }),
  scopeUnsupported: (year) => `Mis datos completos del torneo corresponden al Mundial 2026. Puedo usar el historial verificado de enfrentamientos cuando esté disponible, pero no voy a inventar datos del Mundial ${year}.`,
  coachReply: (d) => {
    const tenure = d.sinceYear ? ` desde ${d.sinceYear}` : "";
    const traits = d.styles.length ? ` Sus señas tácticas son ${naturalList(d.styles)}.` : "";
    return `${d.name} dirige a ${d.team}${tenure}.${traits}`;
  },
  coachUnavailable: (team) => `No tengo un único perfil de entrenador verificado para ${team}, así que prefiero no adivinar.`,
  coachFollowUps: (d) => [`¿Cómo juega ${d.team}?`, `¿Qué jugadores hay que seguir en ${d.team}?`, `¿Cuál es el próximo partido de ${d.team}?`],
  stageSchedule: (d) => {
    if (!d.items.length) return `Todavía no hay un partido de ${d.label.toLowerCase()} confirmado en los datos cargados.`;
    const label = d.items.length > 1 && d.label === "Semifinal" ? "Semifinales" : d.label;
    const sentence = `${label}: ${d.items.join(" · ")}`;
    return /[.!?]$/u.test(sentence) ? sentence : `${sentence}.`;
  },
  reportUnsupported: (question) => `Ball Boy todavía no admite esta solicitud: ${question}`
};

export default {
  schemaVersion: 1,
  code: "es",
  copy,
  domain: "chatbot",
  language: "es",
  knowledge: {
    clubs: {},
    coachNames,
    entityPolicies: {
      clubs: "preserve-official",
      leagues: "current-content"
    },
    intents,
    leagues: {},
    offside,
    personality,
    playerAliases: {},
    playerNames: {},
    positions,
    rules,
    stages,
    styles,
    teamNames,
    timeZoneNames,
    templates
  }
};
