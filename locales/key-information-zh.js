import {
  assertKeyInformationModel,
  getHistoricalStageKey,
  joinKeyInformationSentences,
  resolveKeyInformationPlayer,
  resolveKeyInformationPlayers,
  resolveKeyInformationTeam
} from "./key-information-runtime.js";

const CURRENT_PROFILE_COPY = Object.freeze({
  ALG: ["耐心而细腻的中场配合", "左脚球员在中场的创造力"],
  ARG: ["耐心控球与迅速反抢的结合", "耐心控制与反抢"],
  AUS: ["强调组织、对抗、区域和第二点", "区域争夺与第二点"],
  AUT: ["保持高节奏的积极压迫", "协同高位压迫"],
  BEL: ["寻找并利用两线之间的空间", "两线之间的创造力"],
  BIH: ["以锋线支点为核心的直接对抗", "直接的支点进攻"],
  BRA: ["快速配合和边路一对一", "快速边路配合"],
  CAN: ["把开阔空间转化为纵向冲击", "开阔空间中的奔跑"],
  CIV: ["从中场夺回球权后快速强力推进", "强力中场转换"],
  COD: ["紧凑防守后的爆发式反击", "紧凑反击"],
  COL: ["宽度与传球节奏", "宽度与传球节奏"],
  CPV: ["耐心防守并选择反击时机", "耐心的防守干扰"],
  CRO: ["沉稳的中场传导", "沉稳的中场循环"],
  CUW: ["紧凑站位和谨慎选择前插时机", "选择性反击"],
  CZE: ["传中、空中对抗与第二点", "传中与空中压力"],
  ECU: ["高强度运动能力与中路压迫", "中路压迫与回收"],
  EGY: ["前场突然提速的直接转换", "锋线突然冲击"],
  ENG: ["强力衔接与中场后插上", "衔接进攻与中场跑动"],
  ESP: ["用精细控球拉开全场宽度", "控球与全场宽度"],
  FRA: ["速度和两线之间的移动", "两线之间的速度"],
  GER: ["高节奏控球与中路轮转", "高节奏中路轮转"],
  GHA: ["以运动能力直接冲击空当", "利用空间的强力进攻"],
  HAI: ["保持阵型并在选定时机直接推进", "韧性阵型与直接反击"],
  IRN: ["紧凑耐心地等待向前传球", "耐心的紧凑反击"],
  IRQ: ["狭窄而强硬的中场压迫", "狭窄中场压迫"],
  JOR: ["依靠时机而非控球的反击", "把握时机的反击"],
  JPN: ["中场与边路的快速配合和轮转", "快速位置配合"],
  KOR: ["尽早把球送向边路威胁点", "快速边路转换"],
  KSA: ["空间出现后立即提速的机动反击", "利用空间的机动突破"],
  MAR: ["通过边路配合从容推进", "从容的边路推进"],
  MEX: ["东道主能量、宽度与中场压迫", "主场压迫与宽度"],
  NED: ["耐心组织并通过中场控制释放边路", "耐心组织后的边路宽度"],
  NOR: ["把中场输送纵向连接到强力锋线", "纵向输送到锋线"],
  NZL: ["纪律、直接输送和空中对抗", "直接输送与空中对抗"],
  PAN: ["从紧凑阵型利用边路出口摆脱压迫", "紧凑阵型中的边路出口"],
  PAR: ["强硬反击与中路对抗", "强硬中路对抗"],
  POR: ["控球进攻与禁区周围的创造力", "禁区周围的创造者"],
  QAT: ["紧凑而耐心的组织", "紧凑耐心的组织"],
  RSA: ["整体防守和有目的的转换", "纪律严明的整体转换"],
  SCO: ["边路输送与中场后插上", "边路输送与后插上"],
  SEN: ["把高强度压迫转化为直接进攻", "从压迫到进攻的转换"],
  SUI: ["保持各线连接并控制节奏", "各线连接与控制"],
  SWE: ["用不同的锋线跑动考验中卫", "不同类型的锋线移动"],
  TUN: ["紧凑防守并考验对手耐心", "紧凑防守的耐心"],
  TUR: ["给予攻击型中场技术和创造自由", "技术型进攻自由"],
  URU: ["在每个松散阶段提高纵向强度", "开放阶段的纵向强度"],
  USA: ["用高强度压迫保持快速直接的比赛", "高强度压迫与直接打法"],
  UZB: ["纪律严明地逐线组织", "逐线保持纪律的结构"]
});

export const KEY_INFORMATION_IDENTITIES = Object.freeze(
  Object.fromEntries(Object.entries(CURRENT_PROFILE_COPY).map(([id, values]) => [`2026:${id}`, values[0]]))
);
export const KEY_INFORMATION_TRAITS = Object.freeze(
  Object.fromEntries(Object.entries(CURRENT_PROFILE_COPY).map(([id, values]) => [`2026:${id}`, values[1]]))
);

const currentStage = Object.freeze({
  group: "在这场小组赛中",
  "round-of-32": "在首轮淘汰赛中",
  "round-of-16": "为争夺八强席位",
  "quarter-finals": "为争夺四强席位",
  "semi-finals": "为争夺决赛席位",
  "bronze-final": "在季军赛中",
  final: "在决赛中"
});

const attackerRoles = Object.freeze({
  "wide-runner": "提供宽度和直接突破",
  "advancing-wing-back": "从后场提供宽度",
  "between-lines-connector": "连接中场与进攻",
  "last-line-attacker": "牵制最后一条防线"
});

const connectorActions = Object.freeze({
  "carry-forward": "向前推进",
  "advance-outside": "沿边路前插",
  "link-attack": "衔接进攻"
});

const attackerActions = Object.freeze({
  "hold-width": "保持宽度",
  overlap: "套边前插",
  "receive-between-lines": "在两线之间接球",
  "lead-central": "主导中路进攻"
});

function player(name, options) {
  return resolveKeyInformationPlayer(name, options);
}

function players(names, options) {
  return resolveKeyInformationPlayers(names, options);
}

function list(values) {
  return values.filter(Boolean).join("、");
}

function formatHistoricalStage(stage = {}) {
  const year = Number(stage.year);
  const key = getHistoricalStageKey(stage);
  if (key === "group") {
    const group = String(stage.group || "小组赛").replace(/^Group\s+/i, "");
    return `${year}年世界杯${group}组`;
  }
  const labels = {
    final: `${year}年决赛`,
    "third-place": `${year}年季军赛`,
    "semi-final": `${year}年半决赛`,
    "quarter-final": `${year}年四分之一决赛`,
    "quarter-final-replay": `${year}年四分之一决赛重赛`,
    "round-of-16": `${year}年八分之一决赛`,
    "first-round": `${year}年首轮淘汰赛`,
    "first-round-replay": `${year}年首轮重赛`,
    "play-off": `${year}年附加赛`,
    "final-round": `${year}年决赛阶段小组赛`,
    "second-group": `${year}年第二阶段小组赛`,
    other: `${year}年世界杯${String(stage.round || "这一阶段")}`
  };
  return labels[key] || labels.other;
}

function formatCurrentPlan(slot, options) {
  switch (slot.key) {
    case "wide-front-three": {
      const central = players(slot.central, options);
      return `他们希望${central[0]}和${central[1]}在内线接球，${player(slot.leftWide, options)}保持宽度，${player(slot.rightWide, options)}单独冲击外侧防守人。`;
    }
    case "number-ten-with-width":
      return `他们希望${player(slot.base, options)}保证第一脚出球，${player(slot.attackingMidfielder, options)}在两线之间接球，再由${player(slot.outlet, options)}为${player(slot.striker, options)}拉开空间。`;
    case "number-ten-central":
      return `他们希望${player(slot.base, options)}保证第一脚出球，${player(slot.attackingMidfielder, options)}在两线之间接球，${player(slot.striker, options)}冲击防线身后。`;
    case "two-strikers":
      return `他们希望${player(slot.controller, options)}转移第一脚传球，${player(slot.carrier, options)}向前带球，再由${list(players(slot.strikers, options))}拉开中卫间距。`;
    case "wing-back-progression":
      return `他们希望${player(slot.controller, options)}避开压迫完成传导，${player(slot.wingBack, options)}越过中场推进，${player(slot.striker, options)}牵制最后一线。`;
    case "central-progression":
      return `他们希望${player(slot.controller, options)}控制第一脚传球，${player(slot.connector, options)}在内线衔接，${player(slot.striker, options)}拉长最后一线。`;
    case "compact-two-strikers":
      return `他们希望由${player(slot.controller, options)}负责第一脚出球，${list(players(slot.strikers, options))}轮流回接并冲击防线身后。`;
    case "compact-three":
      return `他们希望由${player(slot.controller, options)}负责第一脚出球，${player(slot.connector, options)}${connectorActions[slot.connectorAction] || "向前推进"}，${player(slot.attacker, options)}${attackerActions[slot.attackerAction] || "主导进攻"}。`;
    default:
      throw new Error(`Unsupported Chinese current Key information plan: ${slot.key}`);
  }
}

function formatCurrentRisk(slot, model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const distributor = player(slot.distributor, options);
  switch (slot.key) {
    case "two-strikers":
    case "compact-release-two":
      return `风险在于${opponent}可以通过${distributor}摆脱第一层压迫，并在${team}重新站稳前找到${list(players(slot.threats, options))}。`;
    case "compact-release-one":
      return `风险在于${opponent}可以通过${distributor}在${team}重新站稳前找到${player(slot.threats?.[0], options)}。`;
    case "number-ten-and-striker":
      return `风险在于${opponent}可以通过${distributor}找到两线之间的${player(slot.attackingMidfielder, options)}，再把${player(slot.striker, options)}送到防线身后。`;
    case "wide-and-striker":
      return `风险在于${opponent}可以通过${distributor}把${player(slot.wideAttacker, options)}送入通道，并让${player(slot.striker, options)}进入禁区。`;
    case "central-release":
      return `风险在于${opponent}可以通过${distributor}在中场身后找到${player(slot.threat, options)}，让${team}来不及恢复阵型。`;
    default:
      throw new Error(`Unsupported Chinese current Key information risk: ${slot.key}`);
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
    throw new Error(`Missing Chinese 2026 Key information profile for ${identity.profileId}/${matchup.opponentProfileId}`);
  }
  const opening = identity.variant === "long"
    ? `${team}的比赛特点是${profile}，由${player(identity.controller, options)}掌控节奏，${player(identity.attacker, options)}负责${attackerRoles[identity.attackerRole] || "主导进攻"}。`
    : `${team}的比赛特点是${profile}。`;
  const location = matchup.variant === "full" && matchup.location === "wide" ? "在边路" : "";
  const matchupSentence = `面对${opponent}，${player(matchup.attacker, options)}需要${location}考验${player(matchup.defender, options)}，同时${player(matchup.controller, options)}要封住${player(matchup.opponentThreat, options)}在${opponent}的${matchup.opponentFormation}和${trait}体系中寻找的空间，${currentStage[model.stage.id] || "在这场比赛中"}。`;
  return [opening, matchupSentence, formatCurrentPlan(model.slots.plan, options), formatCurrentRisk(model.slots.risk, model, options)];
}

function formatHistoricalLineupPlan(slot, options) {
  const midfielders = players(slot.midfielders, options);
  const attackers = players(slot.attackers, options);
  if (slot.key === "no-forwards") {
    return `他们希望${player(slot.defender, options)}保护防线，${midfielders[0]}衔接各阶段，${midfielders[1]}后插上支援。`;
  }
  if (slot.key === "five-defenders") {
    return `他们希望${player(slot.defender, options)}稳住防守基础，${midfielders[0]}衔接各阶段，${attackers[0]}主导进攻。`;
  }
  if (slot.key === "four-midfielders") {
    return `他们希望${player(slot.defender, options)}守住防线，${list(midfielders)}负责衔接，${attackers[0]}冲击身后。`;
  }
  if (slot.key === "three-forwards") {
    return `他们希望${player(slot.defender, options)}守住防线，${midfielders[0]}衔接各阶段，${list(attackers)}在锋线配合。`;
  }
  return `他们希望${player(slot.defender, options)}保护防线，${midfielders[0]}衔接各阶段，${attackers[0]}冲击防线身后。`;
}

function formatHistoricalLineupRisk(slot, model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const attacker = player(slot.attacker, options);
  const actions = {
    "left-wing-right-space": `冲击${team}右路身后`,
    "right-wing-left-space": `冲击${team}左路身后`,
    "forward-line": `把下一次向前传球变成${team}防线附近的进攻`,
    "midfielder-turnover": "压迫下一脚传球并在抢断后提速",
    "defender-extra-passer": "前插成为额外传球点",
    "direct-before-reset": `在${team}重新站稳前发动直接进攻`
  };
  return `风险在于${opponent}可以利用${attacker}${actions[slot.key] || actions["direct-before-reset"]}。`;
}

function formatHistoricalLineup(model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const identity = model.slots.identity;
  const matchup = model.slots.matchup;
  const starters = list(players(identity.confirmedStarters, options));
  const tracking = matchup.tracking === "forward-runs"
    ? `跟住${player(matchup.opponentAttacker, options)}的前插`
    : `防住${player(matchup.opponentAttacker, options)}的支援跑动`;
  return [
    `${team}带着${starters}等已确认首发进入${formatHistoricalStage(model.stage)}。`,
    `面对${opponent}，${player(matchup.ownMidfielder, options)}与${player(matchup.opponentMidfielder, options)}争夺中路空间，同时${player(matchup.defender, options)}要${tracking}。`,
    formatHistoricalLineupPlan(model.slots.plan, options),
    formatHistoricalLineupRisk(model.slots.risk, model, options)
  ];
}

function recordPhrase(prior) {
  if (!prior.matches) return "本届赛事此前尚未出场";
  const parts = [];
  if (prior.wins) parts.push(`${prior.wins}胜`);
  if (prior.draws) parts.push(`${prior.draws}平`);
  if (prior.losses) parts.push(`${prior.losses}负`);
  return `此前${prior.matches}场取得${parts.join("")}`;
}

function formatContextTask(slot) {
  const tasks = {
    "title-draw-enough": "需要守住冠军位置，而且一场平局就足以获得第一",
    "title-win-required": "需要在不失去控制的前提下拿到夺冠所必需的胜利",
    "group-control": "需要控制小组赛节奏，同时避免暴露身后",
    "final-pressure": "需要在不失去进攻平衡的情况下管理决赛压力",
    "third-place-reset": "需要为奖牌赛重新调整并保持比赛控制",
    "replay-adjustment": "需要针对已经交手过的对手调整重赛方案",
    "semi-final-balance": "需要平衡半决赛的谨慎与率先创造机会的要求",
    "quarter-final-control": "需要控制一段松懈就可能决定晋级的淘汰赛",
    "knockout-margins": "需要在细节决定胜负前站稳淘汰赛节奏",
    "final-round-position": "需要守住决赛阶段小组位置，同时继续争取控制"
  };
  return tasks[slot.key];
}

function formatContextPlan(slot) {
  const plans = {
    "opening-host-group": "他们希望利用主场环境控制区域，耐心传球，并在每次进攻后保留足够保护。",
    "opening-group": "他们希望先控制区域，增加进攻支援，并为下一次转换保留防守平衡。",
    "opening-replay": "他们希望吸取首场交锋的经验，提高区域控制，并避免再次陷入长时间拉锯。",
    "opening-knockout": "他们希望建立区域控制，保持防守平衡，并把握第一次持续进攻。",
    "protect-clean-sheets": `他们希望守住此前${slot.cleanSheets}场零封建立的防守基础，同时增加进攻威胁。`,
    "seek-first-goal": `他们希望打入本届赛事首球，同时收紧此前丢掉${slot.goalsAgainst}球的阵型。`,
    "tighten-defence": `他们希望收紧此前丢掉${slot.goalsAgainst}球的阵型，并改善进攻产出。`,
    "preserve-attack": `他们希望延续此前${slot.goalsFor}个赛事进球的进攻节奏，同时避免防线孤立。`,
    "build-on-balance": `他们希望在此前${slot.goalsFor}个进球和${slot.goalsAgainst}个失球的基础上保持控制。`
  };
  return plans[slot.key];
}

function formatContextRisk(slot, model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const risks = {
    "opponent-scoring": `风险在于${opponent}凭借此前${slot.goalsFor}个进球，可以在一次失控后迫使${team}追赶比赛。`,
    "opponent-clean-sheets": `风险在于${opponent}此前${slot.cleanSheets}场零封，可能把比赛变成耐心和定位球的考验。`,
    "opponent-host": `风险在于${opponent}可以利用主场环境先提高节奏，让${team}难以及时站稳。`,
    "opponent-manager": `风险在于${opponent}在${slot.manager}执教下可以把比赛变得直接，并打断${team}的节奏。`,
    "opponent-direct": `风险在于${opponent}可以把比赛变得直接，并在局面稳定前打断${team}的节奏。`
  };
  return risks[slot.key];
}

function formatHistoricalContext(model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const identity = model.slots.identity;
  const host = identity.isHost ? "以东道主身份" : "";
  const manager = identity.manager ? `在${identity.manager}执教下` : "";
  return [
    `${team}${host}${manager}进入${formatHistoricalStage(model.stage)}，${recordPhrase(identity.prior)}。`,
    `面对${opponent}，他们${formatContextTask(model.slots.matchup)}。`,
    formatContextPlan(model.slots.plan),
    formatContextRisk(model.slots.risk, model, options)
  ];
}

function formatCancelled(model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const squad = players(model.slots.risk.squadOptions, options);
  return [
    `${team}原定在${formatHistoricalStage(model.stage)}对阵${opponent}，但比赛已取消。`,
    "这场比赛不会进行，因此没有比赛计划或战术风险可以评估。",
    squad.length ? `${team}的注册名单选项包括${list(squad)}。` : `${team}没有这场比赛的已确认球员名单。`,
    squad.length
      ? "这些姓名只属于球队名单背景，没有任何人被确认是比赛参与者。"
      : "任何球员都不应被视为这场比赛的已确认参与者。"
  ];
}

const V2_POSITION_LABELS = Object.freeze({
  GK: "门将",
  LB: "左后卫",
  LCB: "左中卫",
  CB: "中卫",
  RCB: "右中卫",
  RB: "右后卫",
  LWB: "左翼卫",
  RWB: "右翼卫",
  DM: "防守型中场",
  LCM: "左中前卫",
  CM: "中前卫",
  RCM: "右中前卫",
  LM: "左前卫",
  RM: "右前卫",
  AM: "攻击型中场",
  LW: "左边锋",
  RW: "右边锋",
  ST: "中锋"
});

const V2_DESTINATIONS = Object.freeze({
  "round of 16": "十六强",
  "round-of-16": "十六强",
  "quarter-final": "八强",
  "quarter-finals": "八强",
  "semi-final": "四强",
  "semi-finals": "四强",
  final: "决赛"
});

function v2Number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function v2Record(prior = {}) {
  const matches = v2Number(prior.matches);
  if (!matches) {
    return prior.pointsApplicable
      ? `本届赛事此前尚未出场，小组赛积分为${v2Number(prior.points)}分`
      : "本届赛事此前尚未出场";
  }
  const points = prior.pointsApplicable ? `，小组赛积分为${v2Number(prior.points)}分` : "";
  return `此前${matches}场取得${v2Number(prior.wins)}胜${v2Number(prior.draws)}平${v2Number(prior.losses)}负，打进${v2Number(prior.goalsFor)}球并失${v2Number(prior.goalsAgainst)}球${points}`;
}

function v2HistoricalRecord(prior = {}) {
  const record = v2Record({ ...prior, pointsApplicable: false });
  const cleanSheets = v2Number(prior.cleanSheets);
  return cleanSheets > 0 ? `${record}，其中${cleanSheets}场零封` : record;
}

function v2PlayerWithPosition(value, options) {
  const name = player(value, options);
  const position = V2_POSITION_LABELS[String(value?.position || "").toUpperCase()];
  return position ? `${name}（${position}）` : name;
}

function v2PlayersWithPositions(values, options) {
  return list((values || []).map((value) => v2PlayerWithPosition(value, options)));
}

function v2CurrentStakes(slot, team, opponent) {
  if (slot.kind === "group-points") {
    return `这是${team}${v2Number(slot.teamPoints)}分、${opponent}${v2Number(slot.opponentPoints)}分起步的小组赛`;
  }
  if (slot.kind === "knockout-place") {
    return `这场比赛决定一个${V2_DESTINATIONS[slot.target] || String(slot.target || "下一轮")}席位`;
  }
  if (slot.kind === "bronze") return "这场比赛决定铜牌归属";
  if (slot.kind === "title") return "这场比赛决定世界冠军归属";
  return "这场比赛关系到赛事排名";
}

function formatV2CurrentPlan(slot, options) {
  const descriptions = {
    "single-pivot-width": "分布在防守型中场、两个中路位置和一个边路位置",
    "front-three": "在中场身前设置三个锋线位置",
    "number-ten": "占据从中场到中锋的三条中路层次",
    "front-pair": "在中场身前设置双前锋",
    "wing-backs": "覆盖两个翼卫位置、中路和中锋位置",
    central: "构成首发的中轴线"
  };
  return `官方首发布置使用${v2PlayersWithPositions(slot.starters, options)}，${descriptions[slot.key] || "形成初始结构"}。`;
}

function v2CurrentLayoutLabel(identity) {
  const perspective = {
    nominal: "名义版",
    observed: "观察版",
    revised: "修订版"
  }[identity.layoutPerspective];
  const timing = {
    "pre-kickoff": "开球前发布的",
    "post-kickoff": "开球后发布的"
  }[identity.layoutTiming];
  return [timing, perspective, "官方战术站位"].filter(Boolean).join("");
}

function v2CurrentLaneLabel(lane, team) {
  if (lane === "left") return `${team}的左侧通道`;
  if (lane === "right") return `${team}的右侧通道`;
  return `${team}的中路通道`;
}

function formatV2CurrentRisk(slot, model, options) {
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const zone = {
    central: "中路",
    "between-lines": "两线之间",
    wide: "边路通道",
    "last-line": "最后一线"
  }[slot.zone] || "对方结构";
  const starters = slot.starters || [];
  const names = starters.map((starter) => v2PlayerWithPosition(starter, options));
  const structures = {
    "opponent-front-pair": `${names[0]}位于${names[1]}和${names[2]}组成的双前锋身后`,
    "opponent-ten-forward": `${names[0]}、${names[1]}和${names[2]}占据从中场到锋线的三条中路层次`,
    "opponent-front-three": `${names[0]}、${names[1]}和${names[2]}在${names[3]}身前组成三人锋线`,
    "opponent-wide-midfield": `${names[1]}和${names[2]}分居${names[0]}两侧，${names[3]}位于锋线`,
    "opponent-wide-forward": `${names[0]}位置较深，${names[1]}在边路，${names[2]}在中路锋线`,
    "opponent-central-forward": `${names[0]}和${names[1]}分处两条中路层次`
  };
  return `${opponent}在${zone}的首发结构为：${structures[slot.key] || `${v2PlayersWithPositions(starters, options)}同时列入首发结构`}。`;
}

function formatV2Current(model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const identity = model.slots.identity;
  const matchup = model.slots.matchup;
  const opponentLane = matchup.opponentLane || (matchup.lane === "left" ? "right" : matchup.lane === "right" ? "left" : "central");
  const laneContrast = matchup.variant === "wide-lanes"
    ? `${v2PlayerWithPosition(matchup.ownStarter, options)}位于${v2CurrentLaneLabel(matchup.lane, team)}，${v2PlayerWithPosition(matchup.opposingStarter, options)}位于${v2CurrentLaneLabel(opponentLane, opponent)}，两者处在同一条边路的相对位置`
    : `${v2PlayerWithPosition(matchup.ownStarter, options)}和${v2PlayerWithPosition(matchup.opposingStarter, options)}分处相对的中路层次`;
  return [
    `${team}${v2Record(identity.prior)}；${v2CurrentLayoutLabel(identity)}显示${identity.formation}阵型，${v2PlayersWithPositions(identity.namedStarters, options)}列入首发。`,
    `面对${opponent}，${v2CurrentStakes(matchup.stakes, team, opponent)}；${team}的${identity.formation}与${opponent}的${matchup.opponentFormation}形成阵型对照，${laneContrast}。`,
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
  const groupLabel = rawGroup ? `${rawGroup}组` : "小组赛";
  const scope = {
    "group-opening-points": `${groupLabel}首轮`,
    "group-position": groupLabel,
    "second-group-position": "第二阶段小组赛",
    "final-round-position": "决赛阶段小组赛"
  }[slot.key] || "本场比赛";
  const pointRecord = (pointsValue, matchesValue) => matchesValue === null
    ? `${pointsValue}分`
    : `${matchesValue}场${pointsValue}分`;
  const relation = slot.pointRelation || (teamPoints > opponentPoints ? "ahead" : teamPoints < opponentPoints ? "behind" : "level");
  const gap = Math.abs(teamPoints - opponentPoints);
  const relationText = relation === "ahead"
    ? `${team}领先${gap}分`
    : relation === "behind"
      ? `${team}落后${gap}分`
      : "两队积分相同";
  const standing = `${team}${pointRecord(teamPoints, teamMatches)}，${opponent}${pointRecord(opponentPoints, opponentMatches)}，${relationText}`;
  const destination = {
    "the final": "决赛",
    final: "决赛",
    "the semi-finals": "四强",
    "semi-finals": "四强",
    "the quarter-finals": "八强",
    "quarter-finals": "八强",
    "the next tournament stage": "赛事下一阶段",
    "the next round": "下一轮",
    "next round": "下一轮"
  }[String(slot.destination || "").toLowerCase()] || "下一轮";
  const terminalClause = (result, status) => {
    const safeStatus = ["guarantees", "dependent", "eliminates"].includes(status) ? status : "dependent";
    const clauses = {
      win: {
        guarantees: "获胜即可确保十六强席位",
        dependent: "获胜后仍要等待另一场结果或排名规则",
        eliminates: "即使获胜也会出局"
      },
      draw: {
        guarantees: "战平即可确保十六强席位",
        dependent: "战平后仍要等待另一场结果或排名规则",
        eliminates: "战平就会出局"
      },
      loss: {
        guarantees: "即使失利也能进入十六强",
        dependent: "失利后仍要等待另一场结果或排名规则",
        eliminates: "失利就会出局"
      }
    };
    return clauses[result][safeStatus];
  };
  if (slot.scenarioKey === "2002-group-f-sweden-final-day") {
    return `面对${opponent}，${team}2场4分，比${opponent}多1分；胜或平即可确保十六强席位，若负则必须由尼日利亚击败英格兰，之后还要在排名规则中占优。`;
  }
  if (slot.scenarioKey === "2002-group-f-argentina-final-day") {
    return `面对${opponent}，${team}2场3分，比${opponent}少1分；获胜即可确保十六强席位，战平则需要尼日利亚击败英格兰并在排名规则中占优，失利就会出局。`;
  }
  if (slot.key === "group-position" && slot.terminalScenario) {
    const scenario = slot.terminalScenario;
    return `面对${opponent}，${scope}赛前形势为${standing}；在小组最后一轮，${terminalClause("win", scenario.win)}，${terminalClause("draw", scenario.draw)}，${terminalClause("loss", scenario.loss)}。`;
  }
  const copy = {
    "group-opening-points": `${scope}取胜可得${Number.isFinite(Number(slot.winPoints)) ? Number(slot.winPoints) : Number(model.stage?.year) >= 1994 ? 3 : 2}分，战平则两队各得${Number.isFinite(Number(slot.drawPoints)) ? Number(slot.drawPoints) : 1}分`,
    "group-position": `${scope}赛前形势为${standing}`,
    "second-group-position": `${scope}赛前形势为${standing}`,
    "final-round-position": `${scope}赛前形势为${standing}`,
    "knockout-advance": `${team}必须赢下这场淘汰赛才能进入${destination}`,
    "third-place": "第三名正在争夺中",
    "final-title": "这场比赛决定世界冠军归属",
    "1950-group1-brazil-win": "巴西必须取胜才能进入决赛阶段，南斯拉夫打平即可晋级",
    "1950-group1-yugoslavia-draw": "南斯拉夫打平即可晋级，巴西必须取胜",
    "1950-group4-uruguay-win": `${team}获胜即可进入决赛阶段；若战平，4组唯一晋级名额仍未确定`,
    "1950-group4-bolivia-win": `${team}获胜即可进入决赛阶段；若战平，4组唯一晋级名额仍未确定`,
    "1950-group2-chile-eliminated": `${team}在本场比赛前已经无缘决赛阶段`,
    "1950-group2-usa-win-dependent": `${team}必须击败${opponent}，并需要英格兰战胜西班牙；随后还要在排名规则中占优，才能进入决赛阶段`,
    "1962-group3-brazil-draw": `${team}领先${opponent}1分；胜或平即可确保八强席位，若负则需要墨西哥击败捷克斯洛伐克，随后还要在排名规则中占优`,
    "1962-group3-spain-win": `${team}落后${opponent}1分；获胜即可确保八强席位，战平则需要墨西哥击败捷克斯洛伐克并在排名规则中占优，失利就会出局`,
    "1950-third-place-sweden-win": "瑞典必须取胜才能获得第三名，西班牙打平即可排名第三",
    "1950-third-place-spain-draw": "西班牙打平即可获得第三名，瑞典必须取胜",
    "1950-title-brazil-draw": "巴西打平即可夺冠，乌拉圭必须取胜",
    "1950-title-uruguay-win": "乌拉圭必须取胜才能夺冠，巴西打平即可",
    "1982-group3-italy-win": "意大利必须取胜才能进入四强，巴西打平即可晋级",
    "1982-group3-brazil-draw": "巴西打平即可进入四强，意大利必须取胜",
    "2002-grouph-tunisia-loss": `${team}失利就会出局；获胜或战平后，能否进入十六强仍取决于H组其余比赛`,
    "2002-grouph-belgium-tunisia-loss": `${team}获胜即可淘汰${opponent}，但${team}自身能否晋级仍未确定`,
    "2006-groupf-brazil-win": `${team}获胜即可确保十六强席位；战平或失利后，能否晋级仍未确定`,
    "2006-groupf-australia-win": `${team}获胜即可确保十六强席位；战平或失利后，能否晋级仍未确定`,
    "2018-groupg-england-win": `${team}获胜将使${team}和比利时进入十六强，同时淘汰${opponent}和突尼斯`,
    "2018-groupg-panama-loss": `${team}失利将使${team}和突尼斯出局，同时让${opponent}和比利时进入十六强`,
    "2022-groupc-poland-saudi-win": `${team}以1分起步；若${opponent}获胜，便可确保十六强席位`,
    "2022-groupc-saudi-win": `${team}获胜即可进入十六强；战平或失利后，能否晋级仍未确定`,
    "2022-groupa-ecuador-draw": "厄瓜多尔打平即可进入十六强，塞内加尔必须取胜",
    "2022-groupa-senegal-win": "塞内加尔获胜即可确保十六强席位；若战平，则需要荷兰大比分负于卡塔尔"
  }[slot.key];
  if (!copy) throw new Error(`Unsupported Chinese historical Key information matchup: ${slot.key}`);
  return `面对${opponent}，${copy}。`;
}

function formatV2HistoricalPlan(slot) {
  const overall = slot.prior || {};
  const prior = slot.scope === "current-phase" ? (slot.phasePrior || {}) : overall;
  if (slot.scope === "current-phase" && !v2Number(prior.matches)) {
    return `这一阶段尚未进行比赛；此前阶段的赛事总记录为${v2HistoricalRecord(overall)}。`;
  }
  if (slot.scope === "current-phase") {
    return `这一阶段的记录为${v2HistoricalRecord(prior)}；此前阶段的赛果不计入本阶段积分榜。`;
  }
  if (slot.key === "no-prior-record" || !v2Number(prior.matches)) {
    return "本届赛事没有此前比赛，因此开球前没有同届比赛的赛果、进球或失球样本。";
  }
  if (slot.key === "prior-record") {
    return `开球前可确认的同届赛事记录为${v2HistoricalRecord(prior)}。`;
  }
  throw new Error(`Unsupported Chinese historical Key information plan: ${slot.key}`);
}

function formatV2HistoricalRisk(slot, model, options) {
  const opponent = resolveKeyInformationTeam(model, "opponent", options);
  const overall = slot.opponentPrior || {};
  const prior = slot.scope === "current-phase" ? (slot.phasePrior || {}) : overall;
  if (slot.scope === "current-phase" && !v2Number(prior.matches)) {
    return `${opponent}尚未在这一阶段出场；此前阶段的赛事总记录为${v2HistoricalRecord(overall)}。`;
  }
  if (slot.key === "opponent-no-prior") {
    const managers = (slot.opponentManagers || []).filter(Boolean);
    const starters = players(slot.opponentConfirmedStarters || [], options);
    const managerEvidence = managers.length
      ? `由${list(managers)}${managers.length > 1 ? "共同" : ""}带队`
      : "";
    const starterEvidence = starters.length ? `${list(starters)}列入确认首发` : "";
    const personnel = [managerEvidence, starterEvidence].filter(Boolean).join("，");
    if (slot.openingIdentityUsed) {
      const host = slot.opponentIsHost ? "为东道主队" : "";
      return personnel
        ? `开赛记录确认${opponent}${host || "参赛"}；人员信息显示${personnel}。`
        : `开赛人员记录确认${opponent}${host}参赛，但未提供教练或确认首发姓名。`;
    }
    return personnel
      ? `开球前，${opponent}同样没有本届赛事的此前比赛；现有人员记录显示${personnel}。`
      : `开球前，${opponent}同样没有本届赛事的此前比赛，因此没有同届赛事的结果趋势可供比较。`;
  }
  if (["opponent-high-scoring", "opponent-clean-sheets", "opponent-record"].includes(slot.key)) {
    return `${opponent}的赛前记录为${v2HistoricalRecord(prior)}。`;
  }
  throw new Error(`Unsupported Chinese historical Key information risk: ${slot.key}`);
}

function formatV2Historical(model, options) {
  const team = resolveKeyInformationTeam(model, "team", options);
  const identity = model.slots.identity;
  const host = identity.isHost ? "以东道主身份" : "";
  const managers = (identity.managers || []).filter(Boolean);
  const manager = managers.length ? `，由${list(managers)}${managers.length > 1 ? "共同" : ""}带队` : "";
  const starters = players(identity.confirmedStarters, options);
  const starterContext = starters.length ? `；${list(starters)}列入已确认首发` : "";
  return [
    `${team}${host}进入${formatHistoricalStage(model.stage)}${manager}${starterContext}。`,
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
    `${team}原定在${formatHistoricalStage(model.stage)}对阵${opponent}，但比赛在开球前标记为取消。`,
    "这场比赛不进行，因此没有比赛计划或战术风险可以评估。",
    squad.length ? `${team}的注册名单选项包括${list(squad)}。` : `${team}没有这场比赛的已确认球员名单。`,
    squad.length
      ? "这些姓名只属于球队名单背景，没有任何人被确认是比赛参与者。"
      : "任何球员都不列为这场比赛的已确认参与者。"
  ];
}

export function formatKeyInformationSentences(model, options = {}) {
  assertKeyInformationModel(model);
  if (model.kind === "current-lineup") return formatV2Current(model, options);
  if (model.kind === "historical-evidence") return formatV2Historical(model, options);
  return formatV2Cancelled(model, options);
}

export function formatKeyInformation(model, options = {}) {
  return joinKeyInformationSentences(formatKeyInformationSentences(model, options), "");
}
