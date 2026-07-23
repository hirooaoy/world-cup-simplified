import {
  assertKeyInformationModel,
  getHistoricalStageKey,
  joinKeyInformationSentences,
  resolveKeyInformationPlayer,
  resolveKeyInformationPlayers,
  resolveKeyInformationTeam
} from "./key-information-runtime.js";

const CURRENT_PROFILE_COPY = Object.freeze({
  ALG: ["combinaciones técnicas y pacientes en el mediocampo", "la creatividad zurda en el mediocampo"],
  ARG: ["la posesión paciente y una contrapresión aguda", "el control paciente y la contrapresión"],
  AUS: ["la organización física, el territorio y los segundos balones", "el territorio y los segundos balones"],
  AUT: ["una presión agresiva que mantiene alto el ritmo", "la presión alta coordinada"],
  BEL: ["la creación de espacios entre líneas", "la creación entre líneas"],
  BIH: ["el juego directo y físico con una referencia arriba", "el juego directo hacia un punta"],
  BRA: ["combinaciones rápidas y duelos abiertos por las bandas", "las combinaciones rápidas por fuera"],
  CAN: ["ataques verticales que aprovechan el espacio abierto", "las carreras a campo abierto"],
  CIV: ["transiciones potentes nacidas en el mediocampo", "las transiciones potentes desde el medio"],
  COD: ["un bloque compacto y contragolpes explosivos", "los contragolpes desde un bloque compacto"],
  COL: ["la amplitud y el ritmo de pase", "la amplitud y el ritmo de pase"],
  CPV: ["la paciencia defensiva y la elección de cada salida", "la interrupción defensiva paciente"],
  CRO: ["la circulación serena por el mediocampo", "la circulación tranquila en el medio"],
  CUW: ["un bloque compacto que elige bien cuándo contraatacar", "los contragolpes selectivos"],
  CZE: ["los centros, el juego aéreo y los segundos balones", "los centros y la presión aérea"],
  ECU: ["la intensidad atlética y la presión central", "la presión y la recuperación por dentro"],
  EGY: ["transiciones directas que aceleran desde la línea de ataque", "las rupturas repentinas del frente"],
  ENG: ["el juego de apoyo fuerte y las llegadas desde el medio", "los apoyos y las llegadas de mediocampo"],
  ESP: ["una posesión pulida que estira todo el campo", "la posesión y la amplitud total"],
  FRA: ["la velocidad y el movimiento entre líneas", "la velocidad entre líneas"],
  GER: ["posesión a ritmo alto y rotaciones interiores", "las rotaciones centrales a ritmo alto"],
  GHA: ["ataques directos y atléticos sobre el espacio libre", "los ataques atléticos al espacio"],
  HAI: ["un bloque resistente y salidas directas elegidas", "la forma resistente y los ataques directos"],
  IRN: ["la paciencia de un contragolpe compacto", "la paciencia para contraatacar"],
  IRQ: ["presión estrecha y combativa en el mediocampo", "la presión estrecha en el medio"],
  JOR: ["contragolpes compactos guiados por el momento justo", "los contragolpes bien sincronizados"],
  JPN: ["combinaciones rápidas y rotaciones limpias", "las combinaciones posicionales rápidas"],
  KOR: ["transiciones veloces hacia sus amenazas de banda", "las transiciones tempranas por fuera"],
  KSA: ["contragolpes móviles que aceleran al aparecer espacio", "las rupturas móviles al espacio"],
  MAR: ["progresiones limpias mediante combinaciones de banda", "la progresión serena por fuera"],
  MEX: ["energía de anfitrión, amplitud y presión en el medio", "la presión local y la amplitud"],
  NED: ["una salida paciente que libera la amplitud", "la construcción paciente hacia las bandas"],
  NOR: ["servicio vertical hacia una línea de ataque potente", "el servicio vertical al frente"],
  NZL: ["disciplina, juego directo y duelos aéreos", "el servicio directo y los duelos aéreos"],
  PAN: ["transiciones organizadas mediante salidas de banda", "las salidas de banda desde un bloque compacto"],
  PAR: ["contragolpes robustos y duelos centrales", "los duelos fuertes por dentro"],
  POR: ["posesión ofensiva y creadores alrededor del área", "los creadores alrededor del área"],
  QAT: ["una construcción compacta y paciente", "la salida compacta y paciente"],
  RSA: ["transiciones disciplinadas y colectivas", "las transiciones colectivas disciplinadas"],
  SCO: ["el servicio desde las bandas y las llegadas tardías", "los centros y las llegadas tardías"],
  SEN: ["presión atlética que se convierte en ataque directo", "las transiciones de presión a ataque"],
  SUI: ["líneas conectadas y control de torneo", "las líneas conectadas y el control"],
  SWE: ["movimientos contrastantes de sus delanteros", "los movimientos distintos del frente"],
  TUN: ["un bloque defensivo compacto y paciente", "la paciencia defensiva compacta"],
  TUR: ["libertad técnica para sus mediapuntas", "la libertad creativa en ataque"],
  URU: ["intensidad vertical en cada balón dividido", "la intensidad vertical en fases abiertas"],
  USA: ["presión atlética y juego directo a ritmo alto", "la presión atlética y el juego directo"],
  UZB: ["una estructura disciplinada de línea en línea", "la estructura disciplinada entre líneas"]
});

export const KEY_INFORMATION_IDENTITIES = Object.freeze(
  Object.fromEntries(Object.entries(CURRENT_PROFILE_COPY).map(([id, values]) => [`2026:${id}`, values[0]]))
);
export const KEY_INFORMATION_TRAITS = Object.freeze(
  Object.fromEntries(Object.entries(CURRENT_PROFILE_COPY).map(([id, values]) => [`2026:${id}`, values[1]]))
);

const currentStage = Object.freeze({
  group: "en este partido de la fase de grupos",
  "round-of-32": "en la primera ronda eliminatoria",
  "round-of-16": "con un lugar en cuartos en juego",
  "quarter-finals": "con un lugar en semifinales en juego",
  "semi-finals": "con un lugar en la final en juego",
  "bronze-final": "en el partido por el bronce",
  final: "en la final"
});

const attackerRoles = Object.freeze({
  "wide-runner": "aportando amplitud y desborde",
  "advancing-wing-back": "aportando amplitud desde atrás",
  "between-lines-connector": "conectando el medio con el ataque",
  "last-line-attacker": "ocupando la última línea"
});

const connectorActions = Object.freeze({
  "carry-forward": "llevar la jugada hacia delante",
  "advance-outside": "progresar por fuera",
  "link-attack": "conectar el ataque"
});

const attackerActions = Object.freeze({
  "hold-width": "mantener la amplitud",
  overlap: "pasar por fuera",
  "receive-between-lines": "recibir entre líneas",
  "lead-central": "encabezar el ataque central"
});

function player(name, options) {
  return resolveKeyInformationPlayer(name, options);
}

function players(names, options) {
  return resolveKeyInformationPlayers(names, options);
}

function list(values) {
  return new Intl.ListFormat("es-419", { style: "long", type: "conjunction" }).format(values.filter(Boolean));
}

function plural(value, singular, pluralValue = `${singular}s`) {
  return `${value} ${Number(value) === 1 ? singular : pluralValue}`;
}

function formatHistoricalStage(stage = {}) {
  const year = Number(stage.year);
  const key = getHistoricalStageKey(stage);
  if (key === "group") {
    const group = String(stage.group || "fase de grupos").replace(/^Group\s+/i, "Grupo ");
    return `${group} del Mundial de ${year}`;
  }
  const labels = {
    final: `la final de ${year}`,
    "third-place": `el partido por el tercer puesto de ${year}`,
    "semi-final": `una semifinal de ${year}`,
    "quarter-final": `un cuarto de final de ${year}`,
    "quarter-final-replay": `el desempate de cuartos de final de ${year}`,
    "round-of-16": `un partido de octavos de final de ${year}`,
    "first-round": `un partido eliminatorio de primera ronda de ${year}`,
    "first-round-replay": `el desempate de primera ronda de ${year}`,
    "play-off": `el play-off de ${year}`,
    "final-round": `el grupo de la ronda final de ${year}`,
    "second-group": `la segunda fase de grupos de ${year}`,
    other: `${String(stage.round || "esta fase")} del Mundial de ${year}`
  };
  return labels[key] || labels.other;
}

function formatCurrentPlan(slot, options) {
  switch (slot.key) {
    case "wide-front-three": {
      const central = players(slot.central, options);
      return `Quieren que ${central[0]} y ${central[1]} reciban por dentro, que ${player(slot.leftWide, options)} dé amplitud y que ${player(slot.rightWide, options)} aísle al defensor exterior.`;
    }
    case "number-ten-with-width":
      return `Quieren que ${player(slot.base, options)} asegure el primer pase, que ${player(slot.attackingMidfielder, options)} reciba entre líneas y que ${player(slot.outlet, options)} abra espacio para ${player(slot.striker, options)}.`;
    case "number-ten-central":
      return `Quieren que ${player(slot.base, options)} asegure el primer pase, que ${player(slot.attackingMidfielder, options)} reciba entre líneas y que ${player(slot.striker, options)} amenace la espalda de la defensa.`;
    case "two-strikers":
      return `Quieren que ${player(slot.controller, options)} mueva el primer pase, que ${player(slot.carrier, options)} conduzca hacia delante y que ${list(players(slot.strikers, options))} separen a los centrales.`;
    case "wing-back-progression":
      return `Quieren que ${player(slot.controller, options)} saque el balón de la presión, que ${player(slot.wingBack, options)} avance más allá del medio y que ${player(slot.striker, options)} ocupe la última línea.`;
    case "central-progression":
      return `Quieren que ${player(slot.controller, options)} marque el primer pase, que ${player(slot.connector, options)} trabaje por dentro y que ${player(slot.striker, options)} estire la última línea.`;
    case "compact-two-strikers":
      return `Quieren a ${player(slot.controller, options)} en el primer pase, con ${list(players(slot.strikers, options))} alternando entre apoyar y atacar la espalda de la defensa.`;
    case "compact-three":
      return `Quieren a ${player(slot.controller, options)} en el primer pase, a ${player(slot.connector, options)} para ${connectorActions[slot.connectorAction] || "hacer avanzar la jugada"} y a ${player(slot.attacker, options)} para ${attackerActions[slot.attackerAction] || "liderar el ataque"}.`;
    default:
      throw new Error(`Unsupported Spanish current Key information plan: ${slot.key}`);
  }
}

function formatCurrentRisk(slot, model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const distributor = player(slot.distributor, options);
  switch (slot.key) {
    case "two-strikers":
    case "compact-release-two":
      return `El riesgo es que ${opponent} use a ${distributor} para superar la primera presión y soltar a ${list(players(slot.threats, options))} antes de que ${team} se reorganice.`;
    case "compact-release-one":
      return `El riesgo es que ${opponent} use a ${distributor} para soltar a ${player(slot.threats?.[0], options)} antes de que ${team} se reorganice.`;
    case "number-ten-and-striker":
      return `El riesgo es que ${opponent} use a ${distributor} para encontrar a ${player(slot.attackingMidfielder, options)} entre líneas y a ${player(slot.striker, options)} a la espalda de la defensa antes de que ${team} se reorganice.`;
    case "wide-and-striker":
      return `El riesgo es que ${opponent} use a ${distributor} para lanzar a ${player(slot.wideAttacker, options)} por el canal y llevar a ${player(slot.striker, options)} al área antes de que ${team} se reorganice.`;
    case "central-release":
      return `El riesgo es que ${opponent} use a ${distributor} para encontrar a ${player(slot.threat, options)} más allá del medio antes de que ${team} recupere su forma.`;
    default:
      throw new Error(`Unsupported Spanish current Key information risk: ${slot.key}`);
  }
}

function formatCurrent(model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const identity = model.slots.identity;
  const matchup = model.slots.matchup;
  const profile = (options.identityRegistry || KEY_INFORMATION_IDENTITIES)[identity.profileId];
  const trait = (options.traitRegistry || KEY_INFORMATION_TRAITS)[matchup.opponentProfileId];
  if (!profile || !trait) {
    throw new Error(`Missing Spanish 2026 Key information profile for ${identity.profileId}/${matchup.opponentProfileId}`);
  }
  const opening = identity.variant === "long"
    ? `${team} basa su identidad en ${profile}, con ${player(identity.controller, options)} marcando el ritmo y ${player(identity.attacker, options)} ${attackerRoles[identity.attackerRole] || "liderando el ataque"}.`
    : `${team} basa su identidad en ${profile}.`;
  const location = matchup.variant === "full" && matchup.location === "wide" ? " por fuera" : "";
  const matchupSentence = `Contra ${opponent}, ${player(matchup.attacker, options)} debe poner a prueba a ${player(matchup.defender, options)}${location}, mientras ${player(matchup.controller, options)} cierra el espacio que busca ${player(matchup.opponentThreat, options)} en el ${matchup.opponentFormation} rival, basado en ${trait}, ${currentStage[model.stage.id] || "en este partido"}.`;
  return [opening, matchupSentence, formatCurrentPlan(model.slots.plan, options), formatCurrentRisk(model.slots.risk, model, options)];
}

function formatHistoricalLineupPlan(slot, options) {
  const midfielders = players(slot.midfielders, options);
  const attackers = players(slot.attackers, options);
  if (slot.key === "no-forwards") {
    return `Quieren que ${player(slot.defender, options)} proteja la línea, que ${midfielders[0]} conecte las fases y que ${midfielders[1]} acompañe el ataque.`;
  }
  if (slot.key === "five-defenders") {
    return `Quieren que ${player(slot.defender, options)} sostenga la base defensiva, que ${midfielders[0]} conecte las fases y que ${attackers[0]} lidere el ataque.`;
  }
  if (slot.key === "four-midfielders") {
    return `Quieren que ${player(slot.defender, options)} sostenga la línea, que ${list(midfielders)} conecten las fases y que ${attackers[0]} ataque la espalda.`;
  }
  if (slot.key === "three-forwards") {
    return `Quieren que ${player(slot.defender, options)} sostenga la línea, que ${midfielders[0]} conecte las fases y que ${list(attackers)} combinen en el frente.`;
  }
  return `Quieren que ${player(slot.defender, options)} proteja la línea, que ${midfielders[0]} conecte las fases y que ${attackers[0]} ataque la espalda de la defensa.`;
}

function formatHistoricalLineupRisk(slot, model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const attacker = player(slot.attacker, options);
  const actions = {
    "left-wing-right-space": `ataque el espacio a la espalda del costado derecho de ${team}`,
    "right-wing-left-space": `ataque el espacio a la espalda del costado izquierdo de ${team}`,
    "forward-line": `convierta el siguiente pase vertical en peligro cerca de la línea defensiva de ${team}`,
    "midfielder-turnover": "presione el siguiente pase y acelere tras una recuperación",
    "defender-extra-passer": "avance como una opción adicional de pase",
    "direct-before-reset": `active un ataque directo antes de que ${team} se reorganice`
  };
  return `El riesgo es que ${opponent} use a ${attacker} para que ${actions[slot.key] || actions["direct-before-reset"]}.`;
}

function formatHistoricalLineup(model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const identity = model.slots.identity;
  const matchup = model.slots.matchup;
  const starterNames = list(players(identity.confirmedStarters, options));
  const tracking = matchup.tracking === "forward-runs" ? "sigue las rupturas de" : "vigila las llegadas de apoyo de";
  return [
    `${team} entra en ${formatHistoricalStage(model.stage)} con ${starterNames} entre los titulares confirmados.`,
    `Contra ${opponent}, ${player(matchup.ownMidfielder, options)} y ${player(matchup.opponentMidfielder, options)} disputan el espacio central, mientras ${player(matchup.defender, options)} ${tracking} ${player(matchup.opponentAttacker, options)}.`,
    formatHistoricalLineupPlan(model.slots.plan, options),
    formatHistoricalLineupRisk(model.slots.risk, model, options)
  ];
}

function recordPhrase(prior) {
  if (!prior.matches) {
    return "sin partidos previos en esa edición";
  }
  const parts = [];
  if (prior.wins) parts.push(plural(prior.wins, "victoria"));
  if (prior.draws) parts.push(plural(prior.draws, "empate"));
  if (prior.losses) parts.push(plural(prior.losses, "derrota"));
    return `tras ${list(parts)} en ${plural(prior.matches, "partido previo", "partidos previos")}`;
}

function formatContextTask(slot) {
  const tasks = {
    "title-draw-enough": "debe proteger una posición de campeón, sabiendo que un empate basta para terminar primero",
    "title-win-required": "debe conseguir la victoria necesaria para terminar primero sin perder el control",
    "group-control": "debe controlar el ritmo de la fase de grupos sin quedar expuesto",
    "final-pressure": "debe manejar la presión de la final sin perder equilibrio ofensivo",
    "third-place-reset": "debe recomponerse para el partido por la medalla y mantener el control",
    "replay-adjustment": "debe ajustar el plan ante un rival al que ya se enfrentó",
    "semi-final-balance": "debe equilibrar la cautela de semifinales con la necesidad de crear primero",
    "quarter-final-control": "debe controlar una eliminatoria que puede cambiar con un solo tramo suelto",
    "knockout-margins": "debe asentarse en la eliminatoria antes de que decidan los márgenes",
    "final-round-position": "debe proteger su posición en el grupo final sin dejar de buscar el control"
  };
  return tasks[slot.key];
}

function formatContextPlan(slot) {
  const plans = {
    "opening-host-group": "Quieren usar el entorno local para ganar territorio, mover el balón con paciencia y conservar cobertura detrás de cada ataque.",
    "opening-group": "Quieren empezar con control territorial, apoyar los ataques con números y conservar equilibrio para la siguiente transición.",
    "opening-replay": "Quieren aplicar las lecciones del primer duelo, controlar mejor el territorio y evitar otro partido largo.",
    "opening-knockout": "Quieren establecer control territorial, mantener el equilibrio defensivo y aprovechar el primer tramo ofensivo sostenido.",
    "protect-clean-sheets": `Quieren proteger la base de ${plural(slot.cleanSheets, "portería a cero previa", "porterías a cero previas")} y añadir más amenaza en ataque.`,
    "seek-first-goal": `Quieren encontrar su primer gol del torneo y ajustar una estructura que ha permitido ${plural(slot.goalsAgainst, "gol previo", "goles previos")}.`,
    "tighten-defence": `Quieren ajustar una estructura que ha permitido ${plural(slot.goalsAgainst, "gol previo", "goles previos")} y mejorar su producción ofensiva.`,
    "preserve-attack": `Quieren conservar el ritmo de ${plural(slot.goalsFor, "gol previo en el torneo", "goles previos en el torneo")} sin aislar a la defensa.`,
    "build-on-balance": `Quieren apoyarse en un balance previo de ${slot.goalsFor} goles a favor y ${slot.goalsAgainst} en contra sin perder el control.`
  };
  return plans[slot.key];
}

function formatContextRisk(slot, model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const risks = {
    "opponent-scoring": `El riesgo es que ${opponent}, con ${plural(slot.goalsFor, "gol previo", "goles previos")}, obligue a ${team} a perseguir el partido tras una pérdida de control.`,
    "opponent-clean-sheets": `El riesgo es que las ${plural(slot.cleanSheets, "portería a cero previa", "porterías a cero previas")} de ${opponent} conviertan el partido en una prueba de paciencia y balón parado.`,
    "opponent-host": `El riesgo es que ${opponent} use el entorno local para elevar el ritmo antes de que ${team} se acomode.`,
    "opponent-manager": `El riesgo es que ${opponent}, dirigido por ${slot.manager}, haga el partido directo y rompa el ritmo de ${team}.`,
    "opponent-direct": `El riesgo es que ${opponent} haga el partido directo y rompa el ritmo de ${team} antes de que se asiente.`
  };
  return risks[slot.key];
}

function formatHistoricalContext(model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const identity = model.slots.identity;
  const host = identity.isHost ? " como anfitrión" : "";
  const manager = identity.manager ? ` bajo la dirección de ${identity.manager}` : "";
  return [
    `${team} entra en ${formatHistoricalStage(model.stage)}${host}${manager}, ${recordPhrase(identity.prior)}.`,
    `Contra ${opponent}, ${formatContextTask(model.slots.matchup)}.`,
    formatContextPlan(model.slots.plan),
    formatContextRisk(model.slots.risk, model, options)
  ];
}

function formatCancelled(model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const squad = players(model.slots.risk.squadOptions, options);
  return [
    `${team} tenía programado enfrentar a ${opponent} en ${formatHistoricalStage(model.stage)}, pero el partido fue cancelado.`,
    "El encuentro no se disputará, por lo que no existe un plan de partido ni un riesgo táctico que evaluar.",
    squad.length ? `Las opciones inscritas de ${team} incluyen a ${list(squad)}.` : `${team} no tiene una lista confirmada de jugadores para este encuentro.`,
    squad.length
      ? "Esos nombres son solo contexto de la plantilla y ninguno está confirmado como participante del partido."
      : "Ningún jugador debe considerarse participante confirmado de este partido."
  ];
}

const V2_POSITION_LABELS = Object.freeze({
  GK: "portero",
  LB: "lateral izquierdo",
  LCB: "central izquierdo",
  CB: "central",
  RCB: "central derecho",
  RB: "lateral derecho",
  LWB: "carrilero izquierdo",
  RWB: "carrilero derecho",
  DM: "mediocentro defensivo",
  LCM: "interior izquierdo",
  CM: "centrocampista",
  RCM: "interior derecho",
  LM: "medio izquierdo",
  RM: "medio derecho",
  AM: "mediapunta",
  LW: "extremo izquierdo",
  RW: "extremo derecho",
  ST: "delantero centro"
});

const V2_DESTINATIONS = Object.freeze({
  "round of 16": "octavos de final",
  "round-of-16": "octavos de final",
  "quarter-final": "cuartos de final",
  "quarter-finals": "cuartos de final",
  "semi-final": "semifinales",
  "semi-finals": "semifinales",
  final: "la final"
});

function v2Number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function v2Count(value, singular, pluralValue, zeroValue = `ningún ${singular}`) {
  const count = v2Number(value);
  if (count === 0) return zeroValue;
  return `${count} ${count === 1 ? singular : pluralValue}`;
}

function v2Points(value) {
  const count = v2Number(value);
  return `${count} ${count === 1 ? "punto" : "puntos"}`;
}

function v2Goals(value) {
  return v2Count(value, "gol", "goles");
}

function v2GoalBalance(prior = {}) {
  const goalsFor = v2Number(prior.goalsFor);
  const goalsAgainst = v2Number(prior.goalsAgainst);
  if (!goalsFor && !goalsAgainst) return "sin goles a favor ni en contra";
  if (!goalsFor) return `sin goles a favor y con ${v2Goals(goalsAgainst)} en contra`;
  if (!goalsAgainst) return `con ${v2Goals(goalsFor)} a favor y ningún gol en contra`;
  return `con ${v2Goals(goalsFor)} a favor y ${v2Goals(goalsAgainst)} en contra`;
}

function v2Record(prior = {}) {
  const matches = v2Number(prior.matches);
  if (!matches) {
    return prior.pointsApplicable
      ? `sin partidos previos en esta edición y con ${v2Points(prior.points)} de fase de grupos`
      : "sin partidos previos en esta edición";
  }
  const wins = v2Count(prior.wins, "victoria", "victorias", "ninguna victoria");
  const draws = v2Count(prior.draws, "empate", "empates");
  const losses = v2Count(prior.losses, "derrota", "derrotas", "ninguna derrota");
  const points = prior.pointsApplicable ? `, además de ${v2Points(prior.points)} de fase de grupos` : "";
  return `tras ${v2Count(matches, "partido", "partidos")}: ${wins}, ${draws} y ${losses}, ${v2GoalBalance(prior)}${points}`;
}

function v2HistoricalRecord(prior = {}) {
  const matches = v2Number(prior.matches);
  const statisticalCount = (value, singular, pluralValue) => {
    const count = v2Number(value);
    return `${count} ${count === 1 ? singular : pluralValue}`;
  };
  const wins = statisticalCount(prior.wins, "victoria", "victorias");
  const draws = statisticalCount(prior.draws, "empate", "empates");
  const losses = statisticalCount(prior.losses, "derrota", "derrotas");
  const record = `${wins}, ${draws} y ${losses} en ${statisticalCount(matches, "partido", "partidos")}, ${v2GoalBalance(prior)}`;
  const cleanSheets = v2Number(prior.cleanSheets);
  return cleanSheets > 0
    ? `${record}, además de ${v2Count(cleanSheets, "portería a cero", "porterías a cero")}`
    : record;
}

function v2PlayerWithPosition(value, options) {
  const name = player(value, options);
  const position = V2_POSITION_LABELS[String(value?.position || "").toUpperCase()];
  return position ? `${name} (${position})` : name;
}

function v2PlayersWithPositions(values, options) {
  return list((values || []).map((value) => v2PlayerWithPosition(value, options)));
}

function v2CurrentStakes(slot, team, opponent) {
  if (slot.kind === "group-points") {
    return `en la fase de grupos, ${team} suma ${v2Points(slot.teamPoints)} y ${opponent} suma ${v2Points(slot.opponentPoints)}`;
  }
  if (slot.kind === "knockout-place") {
    return `hay una plaza en ${V2_DESTINATIONS[slot.target] || String(slot.target || "la siguiente ronda")} en juego`;
  }
  if (slot.kind === "bronze") {
    return "está en juego la medalla de bronce";
  }
  if (slot.kind === "title") {
    return "está en juego el título mundial";
  }
  return "la posición en el torneo está en juego";
}

function formatV2CurrentPlan(slot, options) {
  const names = v2PlayersWithPositions(slot.starters, options);
  const descriptions = {
    "single-pivot-width": "combinar una base defensiva, dos puestos interiores y una salida exterior",
    "front-three": "distribuir tres puestos de ataque por delante del medio",
    "number-ten": "ordenar tres alturas desde el medio hasta el delantero",
    "front-pair": "situar una pareja de delanteros por delante del medio",
    "wing-backs": "conectar los dos carriles con el medio y el delantero",
    central: "formar el eje central de la alineación"
  };
  return `La disposición oficial usa a ${names} para ${descriptions[slot.key] || "definir la estructura inicial"}.`;
}

function v2CurrentLayoutLabel(identity) {
  const perspective = {
    nominal: "nominal",
    observed: "observado",
    revised: "revisado"
  }[identity.layoutPerspective];
  const timing = {
    "pre-kickoff": "publicado antes del inicio",
    "post-kickoff": "publicado después del inicio"
  }[identity.layoutTiming];
  const details = [perspective, timing].filter(Boolean).join(" y ");
  return `el esquema táctico oficial${details ? ` ${details}` : ""}`;
}

function v2CurrentLaneLabel(lane, team) {
  if (lane === "left") return `el carril izquierdo de ${team}`;
  if (lane === "right") return `el carril derecho de ${team}`;
  return `el carril central de ${team}`;
}

function formatV2CurrentRisk(slot, model, options) {
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const zone = {
    central: "la zona central",
    "between-lines": "el espacio entre líneas",
    wide: "los carriles exteriores",
    "last-line": "la última línea"
  }[slot.zone] || "la estructura rival";
  const starters = slot.starters || [];
  const names = starters.map((starter) => v2PlayerWithPosition(starter, options));
  const structures = {
    "opponent-front-pair": `${names[0]} figura por detrás de la pareja de delanteros formada por ${names[1]} y ${names[2]}`,
    "opponent-ten-forward": `${names[0]}, ${names[1]} y ${names[2]} ocupan tres alturas centrales desde el medio hasta el ataque`,
    "opponent-front-three": `${names[0]}, ${names[1]} y ${names[2]} forman la línea de tres por delante de ${names[3]}`,
    "opponent-wide-midfield": `${names[1]} y ${names[2]} ocupan las bandas alrededor de ${names[0]}, con ${names[3]} en punta`,
    "opponent-wide-forward": `${names[0]} parte más atrás, con ${names[1]} por fuera y ${names[2]} en el centro del ataque`,
    "opponent-central-forward": `${names[0]} y ${names[1]} ocupan dos alturas centrales distintas`
  };
  return `La estructura inicial de ${opponent} en ${zone} queda así: ${structures[slot.key] || `${v2PlayersWithPositions(starters, options)} aparecen juntos en el once`}.`;
}

function formatV2Current(model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const identity = model.slots.identity;
  const matchup = model.slots.matchup;
  const opponentLane = matchup.opponentLane || (matchup.lane === "left" ? "right" : matchup.lane === "right" ? "left" : "central");
  const laneContrast = matchup.variant === "wide-lanes"
    ? `sitúa a ${v2PlayerWithPosition(matchup.ownStarter, options)} en ${v2CurrentLaneLabel(matchup.lane, team)} y a ${v2PlayerWithPosition(matchup.opposingStarter, options)} en ${v2CurrentLaneLabel(opponentLane, opponent)}, dos posiciones enfrentadas en la misma banda`
    : `sitúa a ${v2PlayerWithPosition(matchup.ownStarter, options)} y ${v2PlayerWithPosition(matchup.opposingStarter, options)} en líneas centrales opuestas`;
  return [
    `${team} llega ${v2Record(identity.prior)}; ${v2CurrentLayoutLabel(identity)} muestra un ${identity.formation} con ${v2PlayersWithPositions(identity.namedStarters, options)} entre los titulares.`,
    `Contra ${opponent}, ${v2CurrentStakes(matchup.stakes, team, opponent)}; el contraste entre el ${identity.formation} de ${team} y el ${matchup.opponentFormation} de ${opponent} ${laneContrast}.`,
    formatV2CurrentPlan(model.slots.plan, options),
    formatV2CurrentRisk(model.slots.risk, model, options)
  ];
}

function formatV2HistoricalMatchup(slot, model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const teamPoints = v2Number(slot.teamPoints);
  const opponentPoints = v2Number(slot.opponentPoints);
  const teamMatches = Number.isFinite(Number(slot.teamMatches)) ? Number(slot.teamMatches) : null;
  const opponentMatches = Number.isFinite(Number(slot.opponentMatches)) ? Number(slot.opponentMatches) : null;
  const group = String(model.stage?.group || "").trim().replace(/^Group\s+/i, "Grupo ");
  const groupLabel = group || "la fase de grupos";
  const scope = {
    "group-opening-points": group ? `al primer partido del ${groupLabel}` : "al primer partido de la fase de grupos",
    "group-position": group ? `a este partido del ${groupLabel}` : "a este partido de la fase de grupos",
    "second-group-position": "a este partido de la segunda fase de grupos",
    "final-round-position": "a este partido de la ronda final"
  }[slot.key] || "a este partido";
  const pointRecord = (pointsValue, matchesValue) => {
    if (matchesValue === null) return v2Points(pointsValue);
    if (matchesValue === 0) return `${v2Points(pointsValue)} sin partidos disputados`;
    return `${v2Points(pointsValue)} tras ${v2Count(matchesValue, "partido", "partidos")}`;
  };
  const relation = slot.pointRelation || (teamPoints > opponentPoints ? "ahead" : teamPoints < opponentPoints ? "behind" : "level");
  const gap = Math.abs(teamPoints - opponentPoints);
  const standing = relation === "ahead"
    ? `${team} llega ${scope} con ${pointRecord(teamPoints, teamMatches)}, con ${v2Points(gap)} de ventaja sobre ${opponent}, que suma ${pointRecord(opponentPoints, opponentMatches)}`
    : relation === "behind"
      ? `${team} llega ${scope} con ${pointRecord(teamPoints, teamMatches)}, ${v2Points(gap)} por detrás de ${opponent}, que suma ${pointRecord(opponentPoints, opponentMatches)}`
      : `${team} llega ${scope} con ${pointRecord(teamPoints, teamMatches)}, igualado a puntos con ${opponent}, que suma ${pointRecord(opponentPoints, opponentMatches)}`;
  const destination = {
    "the final": "la final",
    final: "la final",
    "the semi-finals": "semifinales",
    "semi-finals": "semifinales",
    "the quarter-finals": "cuartos de final",
    "quarter-finals": "cuartos de final",
    "the next tournament stage": "la siguiente fase del torneo",
    "the next round": "la siguiente ronda",
    "next round": "la siguiente ronda"
  }[String(slot.destination || "").toLowerCase()] || "la siguiente ronda";
  const terminalClause = (result, status) => {
    const safeStatus = ["guarantees", "dependent", "eliminates"].includes(status) ? status : "dependent";
    const clauses = {
      win: {
        guarantees: "ganar garantiza los octavos de final",
        dependent: "ganar deja la clasificación pendiente del otro partido o de los desempates",
        eliminates: "ni siquiera ganar evita la eliminación"
      },
      draw: {
        guarantees: "empatar garantiza los octavos de final",
        dependent: "empatar deja la clasificación pendiente del otro partido o de los desempates",
        eliminates: "empatar supone la eliminación"
      },
      loss: {
        guarantees: "ni perder impide avanzar",
        dependent: "perder deja la clasificación pendiente del otro partido o de los desempates",
        eliminates: "perder supone la eliminación"
      }
    };
    return clauses[result][safeStatus];
  };
  if (slot.scenarioKey === "2002-group-f-sweden-final-day") {
    return `Contra ${opponent}, ${team} llega con 4 puntos tras 2 partidos, uno más que ${opponent}; ganar o empatar garantiza los octavos de final, mientras perder exige que Nigeria venza a Inglaterra y que después los desempates sean favorables.`;
  }
  if (slot.scenarioKey === "2002-group-f-argentina-final-day") {
    return `Contra ${opponent}, ${team} llega con 3 puntos tras 2 partidos, uno menos que ${opponent}; ganar garantiza los octavos de final, empatar exige que Nigeria venza a Inglaterra y desempates favorables, y perder supone la eliminación.`;
  }
  if (slot.key === "group-position" && slot.terminalScenario) {
    const scenario = slot.terminalScenario;
    return `Contra ${opponent}, ${standing}; en la última jornada, ${terminalClause("win", scenario.win)}, ${terminalClause("draw", scenario.draw)} y ${terminalClause("loss", scenario.loss)}.`;
  }
  const copy = {
    "group-opening-points": `${group ? `en este primer partido del ${groupLabel}` : "en este primer partido de la fase de grupos"}, una victoria vale ${v2Points(Number.isFinite(Number(slot.winPoints)) ? slot.winPoints : Number(model.stage?.year) >= 1994 ? 3 : 2)} y un empate da ${v2Points(Number.isFinite(Number(slot.drawPoints)) ? slot.drawPoints : 1)} a cada equipo`,
    "group-position": standing,
    "second-group-position": standing,
    "final-round-position": standing,
    "knockout-advance": `${team} debe ganar la eliminatoria para alcanzar ${destination}`,
    "third-place": "está en juego el tercer puesto",
    "final-title": "está en juego el título mundial",
    "1950-group1-brazil-win": "Brasil necesita ganar para alcanzar la ronda final; a Yugoslavia le basta el empate",
    "1950-group1-yugoslavia-draw": "Yugoslavia avanza con un empate; Brasil necesita ganar",
    "1950-group4-uruguay-win": `${team} alcanza la ronda final si gana; con un empate, la única plaza del Grupo 4 queda sin decidir`,
    "1950-group4-bolivia-win": `${team} alcanza la ronda final si gana; con un empate, la única plaza del Grupo 4 queda sin decidir`,
    "1950-group2-chile-eliminated": `${team} ya está eliminado de la lucha por la ronda final antes de este partido`,
    "1950-group2-usa-win-dependent": `${team} debe vencer a ${opponent} y necesita que Inglaterra venza a España; solo entonces los criterios de desempate pueden darle el pase a la ronda final`,
    "1962-group3-brazil-draw": `${team} aventaja por un punto a ${opponent}; ganar o empatar garantiza los cuartos de final, mientras una derrota exige que México venza a Checoslovaquia y después resulten favorables los criterios de desempate`,
    "1962-group3-spain-win": `${team} está un punto por detrás de ${opponent}; ganar garantiza los cuartos de final, empatar exige que México venza a Checoslovaquia y después resulten favorables los criterios de desempate, y perder supone la eliminación`,
    "1950-third-place-sweden-win": "Suecia necesita ganar para terminar tercera; a España le basta el empate para ocupar ese puesto",
    "1950-third-place-spain-draw": "a España le basta el empate para terminar tercera; Suecia necesita ganar",
    "1950-title-brazil-draw": "a Brasil le basta el empate para ser campeón; Uruguay necesita ganar",
    "1950-title-uruguay-win": "Uruguay necesita ganar para ser campeón; a Brasil le basta el empate",
    "1982-group3-italy-win": "Italia necesita ganar para llegar a semifinales; Brasil avanza con un empate",
    "1982-group3-brazil-draw": "Brasil avanza a semifinales con un empate; Italia necesita ganar",
    "2002-grouph-tunisia-loss": `perder elimina a ${team}; ganar o empatar deja su clasificación pendiente de los otros partidos del Grupo H`,
    "2002-grouph-belgium-tunisia-loss": `${team} elimina a ${opponent} si gana, pero su propia clasificación sigue sin resolverse`,
    "2006-groupf-brazil-win": `ganar garantiza a ${team} una plaza en octavos de final; empatar o perder deja su clasificación sin resolver`,
    "2006-groupf-australia-win": `ganar garantiza a ${team} una plaza en octavos de final; empatar o perder deja su clasificación sin resolver`,
    "2018-groupg-england-win": `una victoria de ${team} lleva a ${team} y Bélgica a octavos de final, y elimina a ${opponent} y Túnez`,
    "2018-groupg-panama-loss": `si ${team} pierde, queda eliminado junto con Túnez, mientras ${opponent} y Bélgica avanzan a octavos de final`,
    "2022-groupc-poland-saudi-win": `${team} comienza con 1 punto; si ${opponent} gana, asegura su plaza en octavos de final`,
    "2022-groupc-saudi-win": `si ${team} gana, se clasifica para octavos de final; un empate o una derrota deja su clasificación sin resolver`,
    "2022-groupa-ecuador-draw": "Ecuador llega a octavos con un empate; Senegal necesita ganar",
    "2022-groupa-senegal-win": "Senegal garantiza los octavos si gana; si empata, necesita que Países Bajos pierda con claridad ante Qatar"
  }[slot.key];
  if (!copy) throw new Error(`Unsupported Spanish historical Key information matchup: ${slot.key}`);
  return `Contra ${opponent}, ${copy}.`;
}

function formatV2HistoricalPlan(slot) {
  const overall = slot.prior || {};
  const prior = slot.scope === "current-phase" ? (slot.phasePrior || {}) : overall;
  if (slot.scope === "current-phase" && !v2Number(prior.matches)) {
    return `Esta fase comienza sin partidos; el registro global anterior es de ${v2HistoricalRecord(overall)}.`;
  }
  if (slot.scope === "current-phase") {
    return `El registro de esta fase es de ${v2HistoricalRecord(prior)}; los resultados de rondas anteriores quedan fuera de esta tabla.`;
  }
  if (slot.key === "no-prior-record" || !v2Number(prior.matches)) {
    return "No hay un partido anterior de esta edición que aporte una línea de resultados, goles o defensa antes del inicio.";
  }
  if (slot.key === "prior-record") {
    return `Antes del inicio, el registro de esta edición es de ${v2HistoricalRecord(prior)}.`;
  }
  throw new Error(`Unsupported Spanish historical Key information plan: ${slot.key}`);
}

function formatV2HistoricalRisk(slot, model, options) {
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const overall = slot.opponentPrior || {};
  const prior = slot.scope === "current-phase" ? (slot.phasePrior || {}) : overall;
  if (slot.scope === "current-phase" && !v2Number(prior.matches)) {
    return `${opponent} comienza esta fase sin partidos; su registro global anterior es de ${v2HistoricalRecord(overall)}.`;
  }
  if (slot.key === "opponent-no-prior") {
    const managers = (slot.opponentManagers || []).filter(Boolean);
    const starters = players(slot.opponentConfirmedStarters || [], options);
    const personnel = [
      managers.length ? `${list(managers)} en la dirección técnica` : "",
      starters.length ? `${list(starters)} entre los titulares confirmados` : ""
    ].filter(Boolean);
    if (slot.openingIdentityUsed) {
      const host = slot.opponentIsHost ? " como selección anfitriona" : "";
      return personnel.length
        ? `La evidencia de apertura identifica a ${opponent}${host}, con ${list(personnel)}.`
        : `La evidencia de apertura identifica a ${opponent}${host}; el registro no aporta nombres de dirección técnica ni de titulares confirmados.`;
    }
    return personnel.length
      ? `Antes del inicio, ${opponent} tampoco tiene un partido previo en esta edición; la evidencia de personal disponible documenta a ${list(personnel)}.`
      : `Antes del inicio, ${opponent} tampoco tiene un partido previo en esta edición; no hay una tendencia de resultados del mismo torneo para comparar.`;
  }
  if (["opponent-high-scoring", "opponent-clean-sheets", "opponent-record"].includes(slot.key)) {
    return `El registro previo de ${opponent} es de ${v2HistoricalRecord(prior)}.`;
  }
  throw new Error(`Unsupported Spanish historical Key information risk: ${slot.key}`);
}

function formatV2Historical(model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const identity = model.slots.identity;
  const host = identity.isHost ? " como selección anfitriona" : "";
  const managers = (identity.managers || []).filter(Boolean);
  const manager = managers.length ? ` bajo la dirección de ${list(managers)}` : "";
  const starters = players(identity.confirmedStarters, options);
  const starterContext = starters.length ? `; ${list(starters)} figuran entre los titulares confirmados` : "";
  return [
    `${team} entra en ${formatHistoricalStage(model.stage)}${host}${manager}${starterContext}.`,
    formatV2HistoricalMatchup(model.slots.matchup, model, options),
    formatV2HistoricalPlan(model.slots.plan),
    formatV2HistoricalRisk(model.slots.risk, model, options)
  ];
}

function formatV2Cancelled(model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const squad = players(model.slots.risk.squadOptions, options);
  return [
    `${team} tiene programado enfrentar a ${opponent} en ${formatHistoricalStage(model.stage)}, pero el encuentro figura como cancelado antes del inicio.`,
    "El partido no se disputa, por lo que no hay un plan de juego ni un riesgo táctico que evaluar.",
    squad.length ? `Las opciones inscritas de ${team} incluyen a ${list(squad)}.` : `${team} no tiene una lista confirmada de jugadores para este encuentro.`,
    squad.length
      ? "Esos nombres son solo contexto de la plantilla; ninguno está confirmado como participante del partido."
      : "Ningún jugador figura como participante confirmado de este partido."
  ];
}

export function formatKeyInformationSentences(model, options = {}) {
  assertKeyInformationModel(model);
  if (model.kind === "current-lineup") return formatV2Current(model, options);
  if (model.kind === "historical-evidence") return formatV2Historical(model, options);
  return formatV2Cancelled(model, options);
}

export function formatKeyInformation(model, options = {}) {
  return joinKeyInformationSentences(formatKeyInformationSentences(model, options));
}
