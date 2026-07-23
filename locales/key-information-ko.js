import {
  assertKeyInformationModel,
  getHistoricalStageKey,
  joinKeyInformationSentences,
  resolveKeyInformationPlayer,
  resolveKeyInformationPlayers,
  resolveKeyInformationTeam
} from "./key-information-runtime.js";

const CURRENT_PROFILE_COPY = Object.freeze({
  ALG: ["기술적이고 침착한 중원 조합으로 경기를 풀어간다", "왼발 중심의 중원 창의성"],
  ARG: ["인내심 있는 점유와 날카로운 역압박을 함께 쓴다", "차분한 경기 통제와 역압박"],
  AUS: ["조직력과 힘을 바탕으로 영역과 세컨드 볼을 다툰다", "영역 싸움과 세컨드 볼"],
  AUT: ["공격적인 압박으로 경기 속도를 높게 유지한다", "조직적인 전방 압박"],
  BEL: ["라인 사이 공간을 만드는 공격을 추구한다", "라인 사이 창조성"],
  BIH: ["전방 기준점을 활용하는 직접적이고 힘 있는 축구를 한다", "직접적인 타깃 플레이"],
  BRA: ["빠른 조합과 측면 일대일로 수비를 흔든다", "빠른 측면 조합"],
  CAN: ["넓은 공간을 빠른 직선 공격으로 바꾼다", "넓은 공간에서의 질주"],
  CIV: ["중원에서 이긴 공을 강한 전환으로 연결한다", "힘 있는 중원 전환"],
  COD: ["간격을 좁힌 뒤 상대가 정비하기 전에 역습한다", "콤팩트한 역습"],
  COL: ["폭과 패스 리듬으로 여러 진입로를 만든다", "폭과 패스 리듬"],
  CPV: ["수비적으로 인내하며 역습 순간을 고른다", "인내심 있는 수비 방해"],
  CRO: ["차분한 중원 순환으로 경기를 통제한다", "차분한 중원 순환"],
  CUW: ["콤팩트한 형태에서 전진할 순간을 신중히 고른다", "선택적인 역습"],
  CZE: ["크로스와 공중볼, 세컨드 볼 싸움을 활용한다", "크로스와 공중 압박"],
  ECU: ["강한 운동 능력과 중원 압박으로 공간을 줄인다", "중앙 압박과 회수"],
  EGY: ["전방에서 갑자기 속도를 높이는 직접 전환을 쓴다", "갑작스러운 전방 돌파"],
  ENG: ["강한 연계와 중원 침투를 섞어 공격한다", "연계 플레이와 중원 침투"],
  ESP: ["정교한 점유로 경기장 전체를 넓게 쓴다", "점유와 전 지역 폭"],
  FRA: ["속도와 라인 사이 움직임으로 기회를 만든다", "라인 사이 속도"],
  GER: ["빠른 점유와 중앙 로테이션으로 길을 연다", "빠른 중앙 로테이션"],
  GHA: ["운동 능력을 앞세워 빈 공간을 직접 공격한다", "공간을 향한 힘 있는 공격"],
  HAI: ["형태를 지키며 선택한 순간에 직접 전진한다", "단단한 형태와 직접 공격"],
  IRN: ["콤팩트하게 기다렸다가 알맞은 전진 패스를 노린다", "인내심 있는 역습"],
  IRQ: ["좁고 거친 중원 압박을 직접 공격으로 바꾼다", "좁은 중원 압박"],
  JOR: ["점유보다 타이밍을 중시하는 역습을 한다", "타이밍 좋은 역습"],
  JPN: ["중원과 측면을 빠른 조합과 로테이션으로 잇는다", "빠른 위치 조합"],
  KOR: ["공을 일찍 측면 위협에게 보내 빠르게 전환한다", "이른 측면 전환"],
  KSA: ["공간이 열리는 즉시 기동력 있는 역습을 시작한다", "공간을 향한 기동력 있는 돌파"],
  MAR: ["측면 조합으로 차분하고 깨끗하게 전진한다", "차분한 측면 전진"],
  MEX: ["개최국의 에너지와 폭, 적극적인 중원 압박을 섞는다", "개최국의 압박과 폭"],
  NED: ["인내심 있는 빌드업과 중원 통제로 측면을 연다", "폭을 여는 인내심 있는 빌드업"],
  NOR: ["중원 공급을 강한 전방과 수직으로 연결한다", "전방을 향한 수직 공급"],
  NZL: ["규율과 직접 전개, 공중볼 경합을 중시한다", "직접 공급과 공중 경합"],
  PAN: ["콤팩트한 형태에서 측면 출구로 압박을 벗어난다", "콤팩트한 형태의 측면 출구"],
  PAR: ["강한 역습과 중앙 경합으로 경기 흐름을 정한다", "강한 중앙 경합"],
  POR: ["점유를 바탕으로 박스 주변 창조성을 살린다", "박스 주변의 창조자들"],
  QAT: ["콤팩트하고 인내심 있게 빌드업한다", "콤팩트하고 차분한 빌드업"],
  RSA: ["함께 수비하고 목적 있게 전환한다", "규율 있는 집단 전환"],
  SCO: ["측면 공급과 늦은 중원 침투를 활용한다", "측면 공급과 늦은 침투"],
  SEN: ["운동 능력 있는 압박을 직접 공격으로 바꾼다", "압박에서 공격으로의 전환"],
  SUI: ["라인 간격을 유지하며 경기를 통제한다", "연결된 라인과 통제"],
  SWE: ["서로 다른 전방 움직임으로 센터백을 시험한다", "대조적인 전방 움직임"],
  TUN: ["콤팩트한 수비로 상대의 인내심을 시험한다", "콤팩트한 수비 인내"],
  TUR: ["공격형 미드필더의 기술과 창의성에 자유를 준다", "기술적인 공격 자유"],
  URU: ["느슨한 국면마다 수직적인 강도를 높인다", "열린 국면의 수직 강도"],
  USA: ["운동 능력 있는 압박으로 경기를 빠르고 직접적으로 만든다", "운동 능력 있는 압박과 직접 전개"],
  UZB: ["모든 라인을 규율 있게 연결해 상대의 전진을 어렵게 한다", "라인별로 정돈된 구조"]
});

export const KEY_INFORMATION_IDENTITIES = Object.freeze(
  Object.fromEntries(Object.entries(CURRENT_PROFILE_COPY).map(([id, values]) => [`2026:${id}`, values[0]]))
);
export const KEY_INFORMATION_TRAITS = Object.freeze(
  Object.fromEntries(Object.entries(CURRENT_PROFILE_COPY).map(([id, values]) => [`2026:${id}`, values[1]]))
);

const currentStage = Object.freeze({
  group: "이번 조별리그 맞대결에서",
  "round-of-32": "첫 토너먼트 라운드에서",
  "round-of-16": "8강 진출을 걸고",
  "quarter-finals": "4강 진출을 걸고",
  "semi-finals": "결승 진출을 걸고",
  "bronze-final": "3위 결정전에서",
  final: "결승에서"
});

const attackerRoles = Object.freeze({
  "wide-runner": "폭과 직선 돌파를 제공한다",
  "advancing-wing-back": "후방에서 폭을 제공한다",
  "between-lines-connector": "중원과 공격을 연결한다",
  "last-line-attacker": "최종 수비선을 점유한다"
});

const connectorActions = Object.freeze({
  "carry-forward": "공격을 앞으로 운반하고",
  "advance-outside": "측면으로 전진하고",
  "link-attack": "공격을 연결하고"
});

const attackerActions = Object.freeze({
  "hold-width": "폭을 유지하는",
  overlap: "오버래핑하는",
  "receive-between-lines": "라인 사이에서 받는",
  "lead-central": "중앙 공격을 이끄는"
});

function hasBatchim(value) {
  const last = String(value || "").trim().at(-1);
  const code = last?.charCodeAt(0) || 0;
  return code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 !== 0 : false;
}

function particle(value, consonant, vowel) {
  return `${value}${hasBatchim(value) ? consonant : vowel}`;
}

function topic(value) {
  return particle(value, "은", "는");
}

function subject(value) {
  return particle(value, "이", "가");
}

function object(value) {
  return particle(value, "을", "를");
}

function quotedInstrumental(value) {
  return `‘${value}’${hasBatchim(value) ? "으로" : "로"}`;
}

function player(name, options) {
  return resolveKeyInformationPlayer(name, options);
}

function players(names, options) {
  return resolveKeyInformationPlayers(names, options);
}

function list(values) {
  const clean = values.filter(Boolean);
  if (clean.length <= 1) return clean.join("");
  if (clean.length === 2) return `${clean[0]}와 ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, 그리고 ${clean.at(-1)}`;
}

function formatHistoricalStage(stage = {}) {
  const year = Number(stage.year);
  const key = getHistoricalStageKey(stage);
  if (key === "group") {
    const group = String(stage.group || "조별리그").replace(/^Group\s+/i, "");
    return `${year}년 월드컵 ${group}조`;
  }
  const labels = {
    final: `${year}년 결승`,
    "third-place": `${year}년 3위 결정전`,
    "semi-final": `${year}년 준결승`,
    "quarter-final": `${year}년 8강`,
    "quarter-final-replay": `${year}년 8강 재경기`,
    "round-of-16": `${year}년 16강`,
    "first-round": `${year}년 1라운드 토너먼트`,
    "first-round-replay": `${year}년 1라운드 재경기`,
    "play-off": `${year}년 플레이오프`,
    "final-round": `${year}년 최종 라운드 조별리그`,
    "second-group": `${year}년 2차 조별리그`,
    other: `${year}년 월드컵 ${String(stage.round || "해당 라운드")}`
  };
  return labels[key] || labels.other;
}

function formatCurrentPlan(slot, options) {
  switch (slot.key) {
    case "wide-front-three": {
      const central = players(slot.central, options);
      return `${subject(central[0])} ${central[1]}와 안쪽에서 공을 받고, ${subject(player(slot.leftWide, options))} 폭을 유지하며, ${subject(player(slot.rightWide, options))} 바깥 수비수와 일대일을 만드는 것이 계획이다.`;
    }
    case "number-ten-with-width":
      return `${subject(player(slot.base, options))} 첫 패스를 지키고, ${subject(player(slot.attackingMidfielder, options))} 라인 사이에서 받으며, ${subject(player(slot.outlet, options))} ${player(slot.striker, options)}에게 공간을 만드는 것이 계획이다.`;
    case "number-ten-central":
      return `${subject(player(slot.base, options))} 첫 패스를 지키고, ${subject(player(slot.attackingMidfielder, options))} 라인 사이에서 받으며, ${subject(player(slot.striker, options))} 수비 뒤를 노리는 것이 계획이다.`;
    case "two-strikers":
      return `${subject(player(slot.controller, options))} 첫 패스를 움직이고, ${subject(player(slot.carrier, options))} 전진 운반하며, ${subject(list(players(slot.strikers, options)))} 센터백 사이를 벌리는 것이 계획이다.`;
    case "wing-back-progression":
      return `${subject(player(slot.controller, options))} 압박을 피해 순환하고, ${subject(player(slot.wingBack, options))} 중원 너머로 전진하며, ${subject(player(slot.striker, options))} 최종 수비선을 점유하는 것이 계획이다.`;
    case "central-progression":
      return `${subject(player(slot.controller, options))} 첫 패스를 정하고, ${subject(player(slot.connector, options))} 안쪽에서 연결하며, ${subject(player(slot.striker, options))} 최종 수비선을 늘리는 것이 계획이다.`;
    case "compact-two-strikers":
      return `${player(slot.controller, options)}의 첫 패스 뒤에 ${subject(list(players(slot.strikers, options)))} 연계와 뒷공간 침투를 번갈아 맡는 것이 계획이다.`;
    case "compact-three":
      return `${subject(player(slot.controller, options))} 첫 패스를 맡고, ${subject(player(slot.connector, options))} ${connectorActions[slot.connectorAction] || "공격을 전진시키고"} ${subject(player(slot.attacker, options))} ${attackerActions[slot.attackerAction] || "공격을 이끄는"} 것이 계획이다.`;
    default:
      throw new Error(`Unsupported Korean current Key information plan: ${slot.key}`);
  }
}

function formatCurrentRisk(slot, model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const distributor = player(slot.distributor, options);
  switch (slot.key) {
    case "two-strikers":
    case "compact-release-two":
      return `위험 요소는 ${subject(opponent)} ${object(distributor)} 통해 1차 압박을 벗어나 ${object(list(players(slot.threats, options)))} ${team}의 재정비 전에 풀어줄 수 있다는 점이다.`;
    case "compact-release-one":
      return `위험 요소는 ${subject(opponent)} ${object(distributor)} 통해 ${object(player(slot.threats?.[0], options))} ${team}의 재정비 전에 풀어줄 수 있다는 점이다.`;
    case "number-ten-and-striker":
      return `위험 요소는 ${subject(opponent)} ${object(distributor)} 통해 ${object(player(slot.attackingMidfielder, options))} 라인 사이에서 찾고 ${object(player(slot.striker, options))} 수비 뒤로 보낼 수 있다는 점이다.`;
    case "wide-and-striker":
      return `위험 요소는 ${subject(opponent)} ${object(distributor)} 통해 ${object(player(slot.wideAttacker, options))} 측면 통로로 보내고 ${object(player(slot.striker, options))} 박스 안으로 끌어들일 수 있다는 점이다.`;
    case "central-release":
      return `위험 요소는 ${subject(opponent)} ${object(distributor)} 통해 ${object(player(slot.threat, options))} 중원 너머에서 찾아 ${team}의 형태 회복을 늦출 수 있다는 점이다.`;
    default:
      throw new Error(`Unsupported Korean current Key information risk: ${slot.key}`);
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
    throw new Error(`Missing Korean 2026 Key information profile for ${identity.profileId}/${matchup.opponentProfileId}`);
  }
  const opening = identity.variant === "long"
    ? `${topic(team)} ${profile}며, ${subject(player(identity.controller, options))} 리듬을 잡고 ${subject(player(identity.attacker, options))} ${attackerRoles[identity.attackerRole] || "공격을 이끈다"}.`
    : `${topic(team)} ${profile}.`;
  const location = matchup.variant === "full" && matchup.location === "wide" ? " 측면에서" : "";
  const matchupSentence = `${currentStage[model.stage.id] || "이번 경기에서"} ${opponent}의 ${matchup.opponentFormation}와 ${trait}을 상대하며, ${subject(player(matchup.attacker, options))}${location} ${object(player(matchup.defender, options))} 시험하고 ${subject(player(matchup.controller, options))} ${player(matchup.opponentThreat, options)}의 중앙 공간을 닫아야 한다.`;
  return [opening, matchupSentence, formatCurrentPlan(model.slots.plan, options), formatCurrentRisk(model.slots.risk, model, options)];
}

function formatHistoricalLineupPlan(slot, options) {
  const midfielders = players(slot.midfielders, options);
  const attackers = players(slot.attackers, options);
  if (slot.key === "no-forwards") {
    return `${subject(player(slot.defender, options))} 수비선을 보호하고, ${subject(midfielders[0])} 국면을 연결하며, ${subject(midfielders[1])} 공격을 지원하는 것이 계획이다.`;
  }
  if (slot.key === "five-defenders") {
    return `${subject(player(slot.defender, options))} 수비 기반을 잡고, ${subject(midfielders[0])} 국면을 연결하며, ${subject(attackers[0])} 공격을 이끄는 것이 계획이다.`;
  }
  if (slot.key === "four-midfielders") {
    return `${subject(player(slot.defender, options))} 수비선을 지키고, ${subject(list(midfielders))} 국면을 연결하며, ${subject(attackers[0])} 뒤로 침투하는 것이 계획이다.`;
  }
  if (slot.key === "three-forwards") {
    return `${subject(player(slot.defender, options))} 수비선을 지키고, ${subject(midfielders[0])} 국면을 연결하며, ${subject(list(attackers))} 전방에서 조합하는 것이 계획이다.`;
  }
  return `${subject(player(slot.defender, options))} 수비선을 보호하고, ${subject(midfielders[0])} 국면을 연결하며, ${subject(attackers[0])} 수비 뒤를 노리는 것이 계획이다.`;
}

function formatHistoricalLineupRisk(slot, model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const attacker = player(slot.attacker, options);
  const actions = {
    "left-wing-right-space": `${team}의 오른쪽 뒤 공간을 공격하는 것`,
    "right-wing-left-space": `${team}의 왼쪽 뒤 공간을 공격하는 것`,
    "forward-line": `${team}의 수비선 근처에서 다음 전진 패스를 공격으로 바꾸는 것`,
    "midfielder-turnover": "다음 패스를 압박하고 탈취 뒤 공격 속도를 높이는 것",
    "defender-extra-passer": "전진해 추가 패스 선택지가 되는 것",
    "direct-before-reset": `${team}이 재정비하기 전에 직접 공격을 시작하는 것`
  };
  return `위험 요소는 ${subject(opponent)} ${object(attacker)} 활용해 ${actions[slot.key] || actions["direct-before-reset"]}이다.`;
}

function formatHistoricalLineup(model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const identity = model.slots.identity;
  const matchup = model.slots.matchup;
  const starters = list(players(identity.confirmedStarters, options));
  const tracking = matchup.tracking === "forward-runs" ? "침투를 따라가야 한다" : "지원 침투를 막아야 한다";
  return [
    `${topic(team)} ${formatHistoricalStage(model.stage)}에 ${object(starters)} 포함한 선발 명단으로 나선다.`,
    `${opponent}전에서는 ${subject(player(matchup.ownMidfielder, options))} ${player(matchup.opponentMidfielder, options)}와 중앙 공간을 다투는 동안 ${subject(player(matchup.defender, options))} ${player(matchup.opponentAttacker, options)}의 ${tracking}.`,
    formatHistoricalLineupPlan(model.slots.plan, options),
    formatHistoricalLineupRisk(model.slots.risk, model, options)
  ];
}

function recordPhrase(prior) {
  if (!prior.matches) return "이 대회 앞선 경기가 없는 상태";
  const parts = [];
  if (prior.wins) parts.push(`${prior.wins}승`);
  if (prior.draws) parts.push(`${prior.draws}무`);
  if (prior.losses) parts.push(`${prior.losses}패`);
  return `앞선 ${prior.matches}경기에서 ${parts.join(" ")}를 기록한 상태`;
}

function formatContextTask(slot) {
  const tasks = {
    "title-draw-enough": "우승권을 지켜야 하며 무승부만 해도 1위가 된다",
    "title-win-required": "통제를 잃지 않으면서 1위에 필요한 승리를 거둬야 한다",
    "group-control": "노출을 줄이면서 조별리그의 속도를 통제해야 한다",
    "final-pressure": "공격 균형을 잃지 않고 결승의 압박을 관리해야 한다",
    "third-place-reset": "메달 경기를 위해 다시 정비하고 경기 통제를 유지해야 한다",
    "replay-adjustment": "이미 만난 상대와의 재경기에 맞게 조정해야 한다",
    "semi-final-balance": "준결승의 신중함과 먼저 기회를 만들 필요를 조율해야 한다",
    "quarter-final-control": "한 번의 흔들림이 진출을 가를 수 있는 8강을 통제해야 한다",
    "knockout-margins": "작은 차이가 승부를 가르기 전에 토너먼트 흐름을 잡아야 한다",
    "final-round-position": "최종 라운드 순위를 지키면서도 주도권을 노려야 한다"
  };
  return tasks[slot.key];
}

function formatContextPlan(slot) {
  const plans = {
    "opening-host-group": "홈 환경을 이용해 영역을 잡고, 인내심 있게 공을 움직이며, 공격 뒤의 수비 숫자를 유지하려 한다.",
    "opening-group": "영역을 먼저 통제하고, 여러 명이 공격을 지원하며, 다음 전환에 대비한 균형을 남기려 한다.",
    "opening-replay": "첫 맞대결의 교훈을 활용해 영역 통제를 높이고 또 다른 장기전을 피하려 한다.",
    "opening-knockout": "영역을 통제하고 수비 균형을 유지하며 첫 지속적인 공격 흐름을 살리려 한다.",
    "protect-clean-sheets": `앞선 ${slot.cleanSheets}번의 무실점을 지탱한 수비 기반을 지키면서 공격 위협을 늘리려 한다.`,
    "seek-first-goal": `대회 첫 골을 찾는 동시에 앞선 ${slot.goalsAgainst}실점을 허용한 형태를 조이려 한다.`,
    "tighten-defence": `앞선 ${slot.goalsAgainst}실점을 허용한 형태를 조이고 공격 성과를 높이려 한다.`,
    "preserve-attack": `앞선 대회 ${slot.goalsFor}골의 공격 리듬을 살리면서 수비가 고립되지 않게 하려 한다.`,
    "build-on-balance": `앞선 ${slot.goalsFor}득점 ${slot.goalsAgainst}실점의 균형을 바탕으로 경기 통제를 유지하려 한다.`
  };
  return plans[slot.key];
}

function formatContextRisk(slot, model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const risks = {
    "opponent-scoring": `위험 요소는 ${subject(opponent)} 앞선 경기에서 넣은 ${slot.goalsFor}골의 힘으로 한 번의 통제 상실 뒤 ${object(team)} 추격하게 만들 수 있다는 점이다.`,
    "opponent-clean-sheets": `위험 요소는 ${opponent}의 앞선 ${slot.cleanSheets}번 무실점이 경기를 인내심과 세트피스의 시험으로 만들 수 있다는 점이다.`,
    "opponent-host": `위험 요소는 ${subject(opponent)} 홈 환경으로 속도를 높여 ${team}의 안착을 늦출 수 있다는 점이다.`,
    "opponent-manager": `위험 요소는 ${subject(opponent)} ${slot.manager} 감독 아래 경기를 직접적으로 만들어 ${team}의 리듬을 끊을 수 있다는 점이다.`,
    "opponent-direct": `위험 요소는 ${subject(opponent)} 경기를 직접적으로 만들어 흐름이 자리 잡기 전에 ${team}의 리듬을 끊을 수 있다는 점이다.`
  };
  return risks[slot.key];
}

function formatHistoricalContext(model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const identity = model.slots.identity;
  const host = identity.isHost ? " 개최국으로" : "";
  const manager = identity.manager ? ` ${identity.manager} 감독 아래` : "";
  return [
    `${topic(team)}${host}${manager} ${formatHistoricalStage(model.stage)}에 ${recordPhrase(identity.prior)}로 들어간다.`,
    `${opponent}전에서는 ${formatContextTask(model.slots.matchup)}.`,
    formatContextPlan(model.slots.plan),
    formatContextRisk(model.slots.risk, model, options)
  ];
}

function formatCancelled(model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const squad = players(model.slots.risk.squadOptions, options);
  return [
    `${particle(team, "과", "와")} ${opponent}의 ${formatHistoricalStage(model.stage)} 경기는 취소됐다.`,
    "경기는 열리지 않으므로 평가할 경기 계획이나 전술적 위험도 없다.",
    squad.length ? `${team}의 등록 선수단 선택지에는 ${subject(list(squad))} 포함된다.` : `${team}에는 이 경기를 위해 확인된 선수 명단이 없다.`,
    squad.length
      ? "이 이름들은 선수단 배경 정보일 뿐이며 누구도 경기 참가자로 확인되지 않았다."
      : "어떤 선수도 이 경기의 참가자로 확인된 것으로 봐서는 안 된다."
  ];
}

const V2_POSITION_LABELS = Object.freeze({
  GK: "골키퍼",
  LB: "왼쪽 풀백",
  LCB: "왼쪽 센터백",
  CB: "센터백",
  RCB: "오른쪽 센터백",
  RB: "오른쪽 풀백",
  LWB: "왼쪽 윙백",
  RWB: "오른쪽 윙백",
  DM: "수비형 미드필더",
  LCM: "왼쪽 중앙 미드필더",
  CM: "중앙 미드필더",
  RCM: "오른쪽 중앙 미드필더",
  LM: "왼쪽 미드필더",
  RM: "오른쪽 미드필더",
  AM: "공격형 미드필더",
  LW: "왼쪽 윙어",
  RW: "오른쪽 윙어",
  ST: "중앙 공격수"
});

const V2_DESTINATIONS = Object.freeze({
  "round of 16": "16강",
  "round-of-16": "16강",
  "quarter-final": "8강",
  "quarter-finals": "8강",
  "semi-final": "4강",
  "semi-finals": "4강",
  final: "결승"
});

function v2Number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function v2Record(prior = {}) {
  const matches = v2Number(prior.matches);
  if (!matches) {
    return prior.pointsApplicable
      ? `이번 대회 앞선 경기가 없고 조별리그 승점은 ${v2Number(prior.points)}점인 상태`
      : "이번 대회 앞선 경기가 없는 상태";
  }
  const points = prior.pointsApplicable ? `, 조별리그 승점 ${v2Number(prior.points)}점` : "";
  return `앞선 ${matches}경기 ${v2Number(prior.wins)}승 ${v2Number(prior.draws)}무 ${v2Number(prior.losses)}패, ${v2Number(prior.goalsFor)}득점 ${v2Number(prior.goalsAgainst)}실점${points}의 기록`;
}

function v2HistoricalRecord(prior = {}) {
  const record = `${v2Number(prior.matches)}경기 ${v2Number(prior.wins)}승 ${v2Number(prior.draws)}무 ${v2Number(prior.losses)}패, ${v2Number(prior.goalsFor)}득점 ${v2Number(prior.goalsAgainst)}실점`;
  const cleanSheets = v2Number(prior.cleanSheets);
  return cleanSheets > 0 ? `${record}, ${cleanSheets}경기 무실점` : record;
}

function v2PlayerWithPosition(value, options) {
  const name = player(value, options);
  const position = V2_POSITION_LABELS[String(value?.position || "").toUpperCase()];
  return position ? `${name}(${position})` : name;
}

function v2PlayersWithPositions(values, options) {
  return list((values || []).map((value) => v2PlayerWithPosition(value, options)));
}

function v2CurrentStakes(slot, team, opponent) {
  if (slot.kind === "group-points") {
    return `${team} ${v2Number(slot.teamPoints)}점, ${opponent} ${v2Number(slot.opponentPoints)}점에서 시작하는 조별리그 경기`;
  }
  if (slot.kind === "knockout-place") {
    return `${V2_DESTINATIONS[slot.target] || String(slot.target || "다음 라운드")} 진출권이 걸린 경기`;
  }
  if (slot.kind === "bronze") return "동메달이 걸린 경기";
  if (slot.kind === "title") return "월드컵 우승이 걸린 경기";
  return "대회 순위가 걸린 경기";
}

function formatV2CurrentPlan(slot, options) {
  const descriptions = {
    "single-pivot-width": "수비형 미드필더와 두 중앙 자리, 한쪽 측면 자리를 나눠 둔다",
    "front-three": "중원 위에 세 개의 공격 자리를 배치한다",
    "number-ten": "중원부터 공격수까지 세 개의 중앙 높이를 둔다",
    "front-pair": "중원 위에 두 공격수 자리를 둔다",
    "wing-backs": "두 윙백 자리와 중앙, 공격수 자리를 함께 둔다",
    central: "선발의 중앙축을 이룬다"
  };
  return `공식 선발 배치에서는 ${subject(v2PlayersWithPositions(slot.starters, options))} ${descriptions[slot.key] || "초기 구조를 이룬다"}.`;
}

function v2CurrentLayoutLabel(identity) {
  const perspective = {
    nominal: "명목상",
    observed: "관찰 기반",
    revised: "수정된"
  }[identity.layoutPerspective];
  const timing = {
    "pre-kickoff": "킥오프 전에 공개된",
    "post-kickoff": "킥오프 후 공개된"
  }[identity.layoutTiming];
  return [timing, perspective, "공식 전술 배치"].filter(Boolean).join(" ");
}

function v2CurrentLaneLabel(lane, team) {
  if (lane === "left") return `${team}의 왼쪽 통로`;
  if (lane === "right") return `${team}의 오른쪽 통로`;
  return `${team}의 중앙 통로`;
}

function formatV2CurrentRisk(slot, model, options) {
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const zone = {
    central: "중앙",
    "between-lines": "라인 사이",
    wide: "측면 통로",
    "last-line": "최종 수비선"
  }[slot.zone] || "상대 구조";
  const starters = slot.starters || [];
  const names = starters.map((starter) => v2PlayerWithPosition(starter, options));
  const structures = {
    "opponent-front-pair": `${topic(names[0])} ${names[1]}와 ${names[2]}의 투톱보다 뒤에 배치된다`,
    "opponent-ten-forward": `${names[0]}, ${names[1]}, 그리고 ${subject(names[2])} 중원부터 공격까지 세 개의 중앙 높이를 차지한다`,
    "opponent-front-three": `${names[0]}, ${names[1]}, ${subject(names[2])} ${names[3]}보다 앞선 스리톱을 이룬다`,
    "opponent-wide-midfield": `${names[1]}와 ${topic(names[2])} ${names[0]} 양옆의 측면에 서고 ${topic(names[3])} 최전방에 선다`,
    "opponent-wide-forward": `${topic(names[0])} 더 뒤에 있고 ${topic(names[1])} 측면, ${topic(names[2])} 중앙 공격 위치에 선다`,
    "opponent-central-forward": `${names[0]}와 ${subject(names[1])} 서로 다른 두 중앙 높이에 선다`
  };
  return `${opponent}의 ${zone} 선발 구조에서는 ${structures[slot.key] || `${subject(v2PlayersWithPositions(starters, options))} 같은 선발 구조에 포함된다`}.`;
}

function formatV2Current(model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const identity = model.slots.identity;
  const matchup = model.slots.matchup;
  const opponentLane = matchup.opponentLane || (matchup.lane === "left" ? "right" : matchup.lane === "right" ? "left" : "central");
  const laneContrast = matchup.variant === "wide-lanes"
    ? `${v2PlayerWithPosition(matchup.ownStarter, options)}의 위치는 ${v2CurrentLaneLabel(matchup.lane, team)}이고 ${v2PlayerWithPosition(matchup.opposingStarter, options)}의 위치는 ${v2CurrentLaneLabel(opponentLane, opponent)}라서, 두 자리는 같은 측면에서 서로 마주 본다`
    : `${v2PlayerWithPosition(matchup.ownStarter, options)}의 위치와 ${v2PlayerWithPosition(matchup.opposingStarter, options)}의 위치는 서로 마주 보는 중앙 선에 놓인다`;
  return [
    `${topic(team)} ${v2Record(identity.prior)}이며, ${v2CurrentLayoutLabel(identity)}에는 ${identity.formation} 형태가 나타나고 ${v2PlayersWithPositions(identity.namedStarters, options)}도 선발 명단에 포함된다.`,
    `${opponent}전은 ${v2CurrentStakes(matchup.stakes, team, opponent)}이며, ${team}의 ${identity.formation} 대 ${opponent}의 ${matchup.opponentFormation} 구도에서 ${laneContrast}.`,
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
  const rawGroup = String(model.stage?.group || "").trim().replace(/^Group\s+/i, "");
  const groupLabel = rawGroup ? `${rawGroup}조` : "조별리그";
  const scope = {
    "group-opening-points": `${groupLabel} 첫 경기`,
    "group-position": groupLabel,
    "second-group-position": "2차 조별리그",
    "final-round-position": "최종 라운드"
  }[slot.key] || "이번 경기";
  const pointRecord = (pointsValue, matchesValue) => matchesValue === null
    ? `${pointsValue}점`
    : `${matchesValue}경기 ${pointsValue}점`;
  const relation = slot.pointRelation || (teamPoints > opponentPoints ? "ahead" : teamPoints < opponentPoints ? "behind" : "level");
  const gap = Math.abs(teamPoints - opponentPoints);
  const relationText = relation === "ahead"
    ? `${subject(team)} ${gap}점 앞선 상태`
    : relation === "behind"
      ? `${subject(team)} ${gap}점 뒤진 상태`
      : "두 팀이 승점 동률인 상태";
  const standing = `${team} ${pointRecord(teamPoints, teamMatches)}, ${opponent} ${pointRecord(opponentPoints, opponentMatches)}, ${relationText}`;
  const destination = {
    "the final": "결승",
    final: "결승",
    "the semi-finals": "4강",
    "semi-finals": "4강",
    "the quarter-finals": "8강",
    "quarter-finals": "8강",
    "the next tournament stage": "다음 대회 단계",
    "the next round": "다음 라운드",
    "next round": "다음 라운드"
  }[String(slot.destination || "").toLowerCase()] || "다음 라운드";
  const terminalClause = (result, status, finalClause = false) => {
    const safeStatus = ["guarantees", "dependent", "eliminates"].includes(status) ? status : "dependent";
    const clauses = {
      win: {
        guarantees: ["승리하면 16강 진출이 확정되고", "승리하면 16강 진출이 확정된다"],
        dependent: ["승리해도 다른 경기 결과나 순위 결정 기준을 기다려야 하며", "승리해도 다른 경기 결과나 순위 결정 기준을 기다려야 한다"],
        eliminates: ["승리해도 탈락하고", "승리해도 탈락한다"]
      },
      draw: {
        guarantees: ["무승부면 16강 진출이 확정되고", "무승부면 16강 진출이 확정된다"],
        dependent: ["무승부면 다른 경기 결과나 순위 결정 기준을 기다려야 하며", "무승부면 다른 경기 결과나 순위 결정 기준을 기다려야 한다"],
        eliminates: ["무승부면 탈락하고", "무승부면 탈락한다"]
      },
      loss: {
        guarantees: ["패해도 16강에 진출하고", "패해도 16강에 진출한다"],
        dependent: ["패하면 다른 경기 결과나 순위 결정 기준을 기다려야 하며", "패하면 다른 경기 결과나 순위 결정 기준을 기다려야 한다"],
        eliminates: ["패하면 탈락하고", "패하면 탈락한다"]
      }
    };
    return clauses[result][safeStatus][finalClause ? 1 : 0];
  };
  if (slot.scenarioKey === "2002-group-f-sweden-final-day") {
    return `${opponent}전에서 ${topic(team)} 2경기 4점으로 ${opponent}보다 1점 앞서며, 승리하거나 비기면 16강 진출이 확정되고 패하면 나이지리아가 잉글랜드를 이긴 뒤 순위 결정 기준까지 유리해야 한다.`;
  }
  if (slot.scenarioKey === "2002-group-f-argentina-final-day") {
    return `${opponent}전에서 ${topic(team)} 2경기 3점으로 ${opponent}보다 1점 뒤지며, 승리하면 16강 진출이 확정되고 비기면 나이지리아의 잉글랜드전 승리와 유리한 순위 결정 기준이 모두 필요하며 패하면 탈락한다.`;
  }
  if (slot.key === "group-position" && slot.terminalScenario) {
    const scenario = slot.terminalScenario;
    return `${opponent}전에서 ${scope}의 출발점은 ${standing}이며, 조별리그 최종전에서 ${terminalClause("win", scenario.win)}, ${terminalClause("draw", scenario.draw)}, ${terminalClause("loss", scenario.loss, true)}.`;
  }
  if (slot.key === "group-opening-points") {
    const winPoints = Number.isFinite(Number(slot.winPoints)) ? Number(slot.winPoints) : Number(model.stage?.year) >= 1994 ? 3 : 2;
    const drawPoints = Number.isFinite(Number(slot.drawPoints)) ? Number(slot.drawPoints) : 1;
    return `${opponent}전은 ${scope}이며, 승리하면 ${winPoints}점, 무승부면 두 팀이 ${drawPoints}점씩 얻는다.`;
  }
  const copy = {
    "group-position": `${scope} 출발점은 ${standing}이다`,
    "second-group-position": `${scope} 출발점은 ${standing}이다`,
    "final-round-position": `${scope} 출발점은 ${standing}이다`,
    "knockout-advance": `${topic(team)} ${destination}에 진출하려면 이 승부에서 이겨야 한다`,
    "third-place": "3위가 걸려 있다",
    "final-title": "월드컵 우승이 걸려 있다",
    "1950-group1-brazil-win": "브라질은 최종 라운드 진출을 위해 승리가 필요하고 유고슬라비아는 무승부로도 진출한다",
    "1950-group1-yugoslavia-draw": "유고슬라비아는 무승부로 진출하지만 브라질은 승리가 필요하다",
    "1950-group4-uruguay-win": `${topic(team)} 승리하면 최종 라운드에 진출하고, 무승부면 4조의 유일한 진출권은 결정되지 않는다`,
    "1950-group4-bolivia-win": `${topic(team)} 승리하면 최종 라운드에 진출하고, 무승부면 4조의 유일한 진출권은 결정되지 않는다`,
    "1950-group2-chile-eliminated": `${topic(team)} 이 경기 전에 이미 최종 라운드 진출 경쟁에서 탈락했다`,
    "1950-group2-usa-win-dependent": `${topic(team)} ${object(opponent)} 이기고 잉글랜드가 스페인을 이겨야 하며, 이후 순위 결정 기준까지 유리해야 최종 라운드에 진출할 수 있다`,
    "1962-group3-brazil-draw": `${topic(team)} ${opponent}보다 1점 앞서며, 승리하거나 비기면 8강 진출이 확정되고 패하면 멕시코가 체코슬로바키아를 이긴 뒤 순위 결정 기준까지 유리해야 한다`,
    "1962-group3-spain-win": `${topic(team)} ${opponent}보다 1점 뒤지며, 승리하면 8강 진출이 확정되고 비기면 멕시코가 체코슬로바키아를 이긴 뒤 순위 결정 기준까지 유리해야 하며 패하면 탈락한다`,
    "1950-third-place-sweden-win": "스웨덴은 3위를 위해 승리가 필요하고 스페인은 무승부면 3위가 된다",
    "1950-third-place-spain-draw": "스페인은 무승부면 3위가 되고 스웨덴은 승리가 필요하다",
    "1950-title-brazil-draw": "브라질은 무승부면 우승하고 우루과이는 승리가 필요하다",
    "1950-title-uruguay-win": "우루과이는 우승을 위해 승리가 필요하고 브라질은 무승부면 충분하다",
    "1982-group3-italy-win": "이탈리아는 4강 진출을 위해 승리가 필요하고 브라질은 무승부면 진출한다",
    "1982-group3-brazil-draw": "브라질은 무승부면 4강에 진출하고 이탈리아는 승리가 필요하다",
    "2002-grouph-tunisia-loss": `${topic(team)} 패하면 탈락하고, 승리하거나 비겨도 H조의 남은 경기 결과에 따라 16강 진출이 결정된다`,
    "2002-grouph-belgium-tunisia-loss": `${topic(team)} 승리하면 ${object(opponent)} 탈락시키지만, ${team}의 16강 진출 여부는 여전히 결정되지 않는다`,
    "2006-groupf-brazil-win": `${topic(team)} 승리하면 16강 진출이 확정되고, 비기거나 패하면 진출 여부가 결정되지 않는다`,
    "2006-groupf-australia-win": `${topic(team)} 승리하면 16강 진출이 확정되고, 비기거나 패하면 진출 여부가 결정되지 않는다`,
    "2018-groupg-england-win": `${subject(team)} 승리하면 ${particle(team, "과", "와")} 벨기에가 16강에 진출하고 ${particle(opponent, "과", "와")} 튀니지는 탈락한다`,
    "2018-groupg-panama-loss": `${subject(team)} 패하면 ${particle(team, "과", "와")} 튀니지가 탈락하고 ${particle(opponent, "과", "와")} 벨기에는 16강에 진출한다`,
    "2022-groupc-poland-saudi-win": `${topic(team)} 1점으로 시작하며, ${subject(opponent)} 승리하면 16강 진출이 확정된다`,
    "2022-groupc-saudi-win": `${topic(team)} 승리하면 16강에 진출하고, 비기거나 패하면 진출 여부가 결정되지 않는다`,
    "2022-groupa-ecuador-draw": "에콰도르는 무승부면 16강에 진출하고 세네갈은 승리가 필요하다",
    "2022-groupa-senegal-win": "세네갈은 승리하면 16강 진출이 확정되고 무승부면 네덜란드가 카타르에 큰 점수 차로 패해야 한다"
  }[slot.key];
  if (!copy) throw new Error(`Unsupported Korean historical Key information matchup: ${slot.key}`);
  return `${opponent}전에서 ${copy}.`;
}

function formatV2HistoricalPlan(slot) {
  const overall = slot.prior || {};
  const prior = slot.scope === "current-phase" ? (slot.phasePrior || {}) : overall;
  if (slot.scope === "current-phase" && !v2Number(prior.matches)) {
    return `이 단계에서는 아직 경기를 치르지 않았으며, 이전 단계까지의 전체 기록은 ${v2HistoricalRecord(overall)}이다.`;
  }
  if (slot.scope === "current-phase") {
    return `현재 단계 기록은 ${v2HistoricalRecord(prior)}이며, 이전 단계 결과는 이 단계 순위표에 포함되지 않는다.`;
  }
  if (slot.key === "no-prior-record" || !v2Number(prior.matches)) {
    return "이번 대회 앞선 경기가 없어 킥오프 전에 확인할 같은 대회 결과, 득점, 실점 표본이 없다.";
  }
  if (slot.key === "prior-record") {
    return `킥오프 전 이번 대회 기록은 ${v2HistoricalRecord(prior)}이다.`;
  }
  throw new Error(`Unsupported Korean historical Key information plan: ${slot.key}`);
}

function formatV2HistoricalRisk(slot, model, options) {
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const overall = slot.opponentPrior || {};
  const prior = slot.scope === "current-phase" ? (slot.phasePrior || {}) : overall;
  if (slot.scope === "current-phase" && !v2Number(prior.matches)) {
    return `${topic(opponent)} 이 단계에서 아직 경기를 치르지 않았으며, 이전 단계까지의 전체 기록은 ${v2HistoricalRecord(overall)}이다.`;
  }
  if (slot.key === "opponent-no-prior") {
    const managers = (slot.opponentManagers || []).filter(Boolean);
    const starters = players(slot.opponentConfirmedStarters || [], options);
    if (slot.openingIdentityUsed) {
      const details = [
        slot.opponentIsHost ? "개최국 신분" : "",
        managers.length ? `${list(managers)} 감독 체제` : "",
        starters.length ? `${list(starters)}의 선발 출전` : ""
      ].filter(Boolean);
      return details.length
        ? `${opponent}의 개막 인적 기록에서 다음 내용을 확인할 수 있다: ${details.join(", ")}.`
        : `${opponent}의 개막 인적 기록에서는 상대 팀 등록만 확인되며, 감독진과 선발 이름은 제공되지 않는다.`;
    }
    if (managers.length && starters.length) {
      return `${opponent}도 이번 대회 앞선 경기가 없으며, 확인된 감독진은 ${list(managers)}이고 선발 명단에는 ${list(starters)}도 올라 있다.`;
    }
    if (managers.length) {
      return `${opponent}도 이번 대회 앞선 경기가 없으며, 확인된 감독진은 ${list(managers)}이다.`;
    }
    if (starters.length) {
      return `${opponent}도 이번 대회 앞선 경기가 없으며, 확인된 선발 명단에는 ${list(starters)}도 올라 있다.`;
    }
    return `${opponent}도 이번 대회 앞선 경기가 없어 같은 대회의 결과 흐름을 비교할 수 없다.`;
  }
  if (["opponent-high-scoring", "opponent-clean-sheets", "opponent-record"].includes(slot.key)) {
    return `${opponent}의 앞선 기록은 ${v2HistoricalRecord(prior)}이다.`;
  }
  throw new Error(`Unsupported Korean historical Key information risk: ${slot.key}`);
}

function formatV2Historical(model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const identity = model.slots.identity;
  const managers = (identity.managers || []).filter(Boolean);
  const starters = players(identity.confirmedStarters, options);
  const contexts = [
    managers.length ? `${list(managers)} 감독 체제로` : "",
    identity.isHost ? "개최국 자격으로" : ""
  ].filter(Boolean).join(" ");
  const entrance = starters.length
    ? `들어가며, ${list(starters)}도 확인된 선발 명단에 포함된다`
    : "들어간다";
  return [
    `${topic(team)}${contexts ? ` ${contexts}` : ""} ${formatHistoricalStage(model.stage)}에 ${entrance}.`,
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
    `${particle(team, "과", "와")} ${opponent}의 ${formatHistoricalStage(model.stage)} 경기는 킥오프 전에 취소된 경기로 남아 있다.`,
    "경기는 열리지 않으므로 평가할 경기 계획이나 전술적 위험도 없다.",
    squad.length ? `${team}의 등록 선수단 선택지에는 ${subject(list(squad))} 포함된다.` : `${team}에는 이 경기를 위해 확인된 선수 명단이 없다.`,
    squad.length
      ? "이 이름들은 선수단 배경 정보일 뿐이며 누구도 경기 참가자로 확인되지 않는다."
      : "어떤 선수도 이 경기의 참가자로 확인된 것으로 보지 않는다."
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
