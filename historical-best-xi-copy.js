const SUPPORTED_LANGUAGES = new Set(["en", "es", "ko", "zh"]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeLanguage(value) {
  const language = normalizeText(value).toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.has(language) ? language : "en";
}

function localizedText(value, language) {
  if (typeof value === "string") {
    return normalizeText(value);
  }
  if (!value || typeof value !== "object") {
    return "";
  }
  return normalizeText(
    value[language] ??
      value[language === "zh" ? "zh-CN" : language] ??
      value.en ??
      value.label ??
      value.name
  );
}

function localizedRationale(value, language) {
  if (typeof value === "string") {
    return value.trim() ? value : "";
  }
  if (!value || typeof value !== "object") {
    return "";
  }
  const selected = value[language] ?? value[language === "zh" ? "zh-CN" : language] ?? value.en;
  return typeof selected === "string" && selected.trim() ? selected : "";
}

function readField(input, field) {
  if (Object.prototype.hasOwnProperty.call(input, field)) {
    return input[field];
  }
  return input.profile?.[field];
}

function count(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function positionGroup(value) {
  const position = normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const codes = new Set(position.toUpperCase().split(/[^A-Z]+/).filter(Boolean));
  if (/coach|manager|entrenador|seleccionador|감독|教练|教練/.test(position)) {
    return "coach";
  }
  if (/goalkeeper|keeper|portero|arquero|guardameta|골키퍼|门将|門將|守门员|守門員/.test(position) || codes.has("GK")) {
    return "goalkeeper";
  }
  if (/defender|back|defensa|zaguero|수비|后卫|後衛/.test(position) || ["CB", "LB", "RB", "LWB", "RWB", "SW", "DF"].some((code) => codes.has(code))) {
    return "defender";
  }
  if (/midfield|medio|volante|미드필더|中场|中場/.test(position) || ["DM", "CDM", "CM", "AM", "CAM", "LM", "RM", "MF"].some((code) => codes.has(code))) {
    return "midfielder";
  }
  if (/forward|striker|winger|attacker|delantero|extremo|공격수|前锋|前鋒/.test(position) || ["LW", "RW", "CF", "F9", "ST", "SS", "FW"].some((code) => codes.has(code))) {
    return "attacker";
  }
  return "unknown";
}

function performanceKey(value) {
  if (Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 4) {
    return ["", "champions", "runners-up", "third", "fourth"][Number(value)];
  }
  const normalized = normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—_]/g, "-");
  if (!normalized) return "";
  if (/^final round$/.test(normalized)) return "final-round";
  if (/^third-place match$/.test(normalized)) return "third-place-match";
  if (/^second group stage$/.test(normalized)) return "second-group-stage";
  if (/^final$/.test(normalized)) return "final";
  if (/runner|second|2nd|vice.?champ|subcampe|준우승|亚军|亞軍/.test(normalized)) return "runners-up";
  if (/third|3rd|tercer|bronze|3위|季军|季軍/.test(normalized)) return "third";
  if (/fourth|4th|cuart[oa]|4위|第四/.test(normalized)) return "fourth";
  if (/quarter|cuartos|8강|八强|八強/.test(normalized)) return "quarter-finals";
  if (/round of 16|last 16|octavos|16강|十六强|十六強/.test(normalized)) return "round-of-16";
  if (/semi|semifinal|4강|四强|四強/.test(normalized)) return "semi-finals";
  if (/group|grupo|조별|小组|小組/.test(normalized)) return "group-stage";
  if (/champ|winner|first|1st|campe|우승|冠军|冠軍/.test(normalized)) return "champions";
  return "";
}

function performanceValue(value, language) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { key: performanceKey(value), label: localizedText(value, language) };
  }
  const keyValue = value.key ?? value.code ?? value.stage ?? value.finish ?? value.rank;
  return {
    key: performanceKey(keyValue) || performanceKey(localizedText(value, language)),
    label: localizedText(value, language)
  };
}

function koreanTopic(value) {
  const text = normalizeText(value);
  const last = [...text].at(-1);
  if (!last) return "은";
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    return (code - 0xac00) % 28 === 0 ? "는" : "은";
  }
  return "는";
}

function teamPerformanceClause({ language, teamName, year, performance, isChampion = false }) {
  if (!performance.key && !performance.label) return "";
  const team = teamName || { en: "The team", es: "La selección", ko: "대표팀", zh: "球队" }[language];
  const tournament = {
    en: year ? `the ${year} World Cup` : "the World Cup",
    es: year ? `el Mundial de ${year}` : "el Mundial",
    ko: year ? `${year}년 월드컵` : "월드컵",
    zh: year ? `${year}年世界杯` : "世界杯"
  }[language];
  const clauses = {
    en: {
      champions: `${team} won ${tournament}`,
      "runners-up": `${team} reached the final of ${tournament}`,
      final: `${team} reached the final of ${tournament}`,
      "final-round": `${team} reached the final round of ${tournament}`,
      "third-place-match": `${team} reached the third-place match at ${tournament}`,
      "second-group-stage": `${team} reached the second group stage of ${tournament}`,
      third: `${team} finished third at ${tournament}`,
      fourth: `${team} finished fourth at ${tournament}`,
      "semi-finals": `${team} reached the semi-finals of ${tournament}`,
      "quarter-finals": `${team} reached the quarter-finals of ${tournament}`,
      "round-of-16": `${team} reached the round of 16 at ${tournament}`,
      "group-stage": `${team} reached the group stage of ${tournament}`
    },
    es: {
      champions: `${team} ganó ${tournament}`,
      "runners-up": `${team} llegó a la final del ${tournament.replace(/^el\s+/, "")}`,
      final: `${team} llegó a la final del ${tournament.replace(/^el\s+/, "")}`,
      "final-round": `${team} alcanzó la liguilla final del ${tournament.replace(/^el\s+/, "")}`,
      "third-place-match": `${team} llegó al partido por el tercer puesto del ${tournament.replace(/^el\s+/, "")}`,
      "second-group-stage": `${team} alcanzó la segunda fase de grupos del ${tournament.replace(/^el\s+/, "")}`,
      third: `${team} terminó tercero en ${tournament}`,
      fourth: `${team} terminó cuarto en ${tournament}`,
      "semi-finals": `${team} alcanzó las semifinales del ${tournament.replace(/^el\s+/, "")}`,
      "quarter-finals": `${team} alcanzó los cuartos de final del ${tournament.replace(/^el\s+/, "")}`,
      "round-of-16": `${team} alcanzó los octavos de final del ${tournament.replace(/^el\s+/, "")}`,
      "group-stage": `${team} alcanzó la fase de grupos del ${tournament.replace(/^el\s+/, "")}`
    },
    ko: {
      champions: `${team}${koreanTopic(team)} ${tournament}에서 우승했다`,
      "runners-up": `${team}${koreanTopic(team)} ${tournament}에서 준우승했다`,
      final: `${team}${koreanTopic(team)} ${tournament} 결승에 올랐다`,
      "final-round": `${team}${koreanTopic(team)} ${tournament} 결승 리그에 올랐다`,
      "third-place-match": `${team}${koreanTopic(team)} ${tournament} 3·4위전에 올랐다`,
      "second-group-stage": `${team}${koreanTopic(team)} ${tournament} 2차 조별리그에 올랐다`,
      third: `${team}${koreanTopic(team)} ${tournament}에서 3위를 차지했다`,
      fourth: `${team}${koreanTopic(team)} ${tournament}에서 4위를 차지했다`,
      "semi-finals": `${team}${koreanTopic(team)} ${tournament} 4강에 올랐다`,
      "quarter-finals": `${team}${koreanTopic(team)} ${tournament} 8강에 올랐다`,
      "round-of-16": `${team}${koreanTopic(team)} ${tournament} 16강에 올랐다`,
      "group-stage": `${team}${koreanTopic(team)} ${tournament} 조별리그에 진출했다`
    },
    zh: {
      champions: `${team}赢得了${tournament}冠军`,
      "runners-up": `${team}获得${tournament}亚军`,
      final: `${team}打进${tournament}决赛`,
      "final-round": `${team}打进${tournament}决赛阶段`,
      "third-place-match": `${team}打进${tournament}季军赛`,
      "second-group-stage": `${team}打进${tournament}第二阶段小组赛`,
      third: `${team}获得${tournament}季军`,
      fourth: `${team}获得${tournament}第四名`,
      "semi-finals": `${team}打进${tournament}四强`,
      "quarter-finals": `${team}打进${tournament}八强`,
      "round-of-16": `${team}打进${tournament}十六强`,
      "group-stage": `${team}进入${tournament}小组赛`
    }
  };
  const performanceKey = isChampion ? "champions" : performance.key;
  if (performanceKey && clauses[language][performanceKey]) {
    return clauses[language][performanceKey];
  }
  if (language === "en") return `${team} finished ${performance.label} at ${tournament}`;
  if (language === "es") return `${team} terminó ${performance.label} en ${tournament}`;
  if (language === "ko") return `${team}${koreanTopic(team)} ${tournament}에서 ${performance.label}로 대회를 마쳤다`;
  return `${team}在${tournament}取得${performance.label}`;
}

function playerStatsClause({ language, playerName, appearances, starts, matches, goals, includeGoals }) {
  if (!playerName) return "";
  const hasAppearances = appearances !== null && appearances > 0;
  const hasStarts = starts !== null && starts > 0;
  const hasGoals = includeGoals && goals !== null && goals > 0;
  if (!hasAppearances && !hasStarts && !hasGoals) return "";

  if (language === "en") {
    let text = playerName;
    if (hasAppearances && hasStarts && appearances === starts && appearances === matches) {
      text += ` started all ${appearances} ${appearances === 1 ? "match" : "matches"}`;
    } else if (hasAppearances) {
      text += ` made ${appearances} ${appearances === 1 ? "appearance" : "appearances"}`;
      if (hasStarts && starts <= appearances) text += `, including ${starts} ${starts === 1 ? "start" : "starts"}`;
    } else if (hasStarts) {
      text += ` made ${starts} ${starts === 1 ? "start" : "starts"}`;
    }
    if (hasGoals) text += `${hasAppearances || hasStarts ? ", and" : ""} scored ${goals} ${goals === 1 ? "goal" : "goals"}`;
    return text;
  }

  if (language === "es") {
    let text = playerName;
    if (hasAppearances && hasStarts && appearances === starts && appearances === matches) {
      text += ` fue titular en ${appearances === 1 ? "el único partido" : `los ${appearances} partidos`}`;
    } else if (hasAppearances) {
      text += ` disputó ${appearances} ${appearances === 1 ? "partido" : "partidos"}`;
      if (hasStarts && starts <= appearances) text += `, ${starts} como titular`;
    } else if (hasStarts) {
      text += ` fue titular en ${starts} ${starts === 1 ? "partido" : "partidos"}`;
    }
    if (hasGoals) text += `${hasAppearances || hasStarts ? ", y" : ""} marcó ${goals} ${goals === 1 ? "gol" : "goles"}`;
    return text;
  }

  if (language === "ko") {
    let text = `${playerName}${koreanTopic(playerName)}`;
    if (hasAppearances && hasStarts && appearances === starts && appearances === matches) {
      text += ` ${appearances}경기 모두 선발로 뛰었`;
    } else if (hasAppearances) {
      text += ` ${appearances}경기에 출전`;
      if (hasStarts && starts <= appearances) text += `해 ${starts}경기를 선발로 뛰었`;
      else text += "했";
    } else if (hasStarts) {
      text += ` ${starts}경기를 선발로 뛰었`;
    }
    if (hasGoals) text += `${hasAppearances || hasStarts ? "고" : " "} ${goals}골을 넣었`;
    return `${text}다`;
  }

  let text = playerName;
  if (hasAppearances && hasStarts && appearances === starts && appearances === matches) {
    text += `在${appearances}场比赛中全部首发`;
  } else if (hasAppearances) {
    text += `出场${appearances}次`;
    if (hasStarts && starts <= appearances) text += `，其中${starts}次首发`;
  } else if (hasStarts) {
    text += `首发${starts}次`;
  }
  if (hasGoals) text += `${hasAppearances || hasStarts ? "，并" : ""}攻入${goals}球`;
  return text;
}

function defensiveTeamFact({ language, teamName, matches, cleanSheets, goalsAgainst }) {
  const hasCleanSheets = cleanSheets !== null && cleanSheets <= (matches ?? cleanSheets);
  const hasGoalsAgainst = goalsAgainst !== null;
  if (!teamName || (!hasCleanSheets && !hasGoalsAgainst)) return "";
  if (language === "en") {
    const lead = matches ? `Across ${matches} ${matches === 1 ? "match" : "matches"}, ${teamName}` : `${teamName}`;
    const clean = hasCleanSheets ? `kept ${cleanSheets} clean ${cleanSheets === 1 ? "sheet" : "sheets"}` : "";
    const conceded = hasGoalsAgainst ? (goalsAgainst === 0 ? "conceded no goals" : `conceded ${goalsAgainst} ${goalsAgainst === 1 ? "goal" : "goals"}`) : "";
    return `${lead} ${[clean, conceded].filter(Boolean).join(" and ")}`;
  }
  if (language === "es") {
    const lead = matches ? `En ${matches} ${matches === 1 ? "partido" : "partidos"}, ${teamName}` : teamName;
    const clean = hasCleanSheets ? `mantuvo su portería a cero ${cleanSheets === 1 ? "una vez" : `${cleanSheets} veces`}` : "";
    const conceded = hasGoalsAgainst ? (goalsAgainst === 0 ? "no encajó goles" : `encajó ${goalsAgainst} ${goalsAgainst === 1 ? "gol" : "goles"}`) : "";
    return `${lead} ${[clean, conceded].filter(Boolean).join(" y ")}`;
  }
  if (language === "ko") {
    const lead = matches ? `${teamName}${koreanTopic(teamName)} ${matches}경기에서` : `${teamName}${koreanTopic(teamName)}`;
    if (hasCleanSheets && hasGoalsAgainst) return `${lead} 무실점 ${cleanSheets}경기를 기록했고 ${goalsAgainst}골을 내줬다`;
    if (hasCleanSheets) return `${lead} 무실점 ${cleanSheets}경기를 기록했다`;
    return `${lead} ${goalsAgainst}골을 내줬다`;
  }
  const lead = matches ? `${teamName}在${matches}场比赛中` : teamName;
  const clean = hasCleanSheets ? `完成${cleanSheets}场零封` : "";
  const conceded = hasGoalsAgainst ? `失${goalsAgainst}球` : "";
  return `${lead}${[clean, conceded].filter(Boolean).join("，")}`;
}

function attackingTeamFact({ language, teamName, matches, goalsFor }) {
  if (!teamName || goalsFor === null) return "";
  if (language === "en") return `${teamName} scored ${goalsFor} ${goalsFor === 1 ? "goal" : "goals"}${matches ? ` across ${matches} ${matches === 1 ? "match" : "matches"}` : ""}`;
  if (language === "es") return `${teamName} marcó ${goalsFor} ${goalsFor === 1 ? "gol" : "goles"}${matches ? ` en ${matches} ${matches === 1 ? "partido" : "partidos"}` : ""}`;
  if (language === "ko") return `${teamName}${koreanTopic(teamName)}${matches ? ` ${matches}경기에서` : ""} ${goalsFor}골을 넣었다`;
  return `${teamName}${matches ? `在${matches}场比赛中` : ""}攻入${goalsFor}球`;
}

function finishSentences(language, sentences) {
  const values = sentences.map(normalizeText).filter(Boolean);
  if (!values.length) return "";
  if (language === "zh") return `${values.join("；")}。`;
  return `${values.map((value) => value.replace(/[.!?。！？]+$/, "")).join(". ")}.`;
}

function fallbackEvidence({ language, playerName, teamName, year }) {
  if (!playerName || !teamName || !year) return "";
  if (language === "en") return `${playerName} represented ${teamName} at the ${year} World Cup.`;
  if (language === "es") return `${playerName} representó a ${teamName} en el Mundial de ${year}.`;
  if (language === "ko") return `${playerName}${koreanTopic(playerName)} ${year}년 월드컵에서 ${teamName} 대표로 뛰었다.`;
  return `${playerName}代表${teamName}参加了${year}年世界杯。`;
}

function stableVariant(value) {
  let hash = 0;
  for (const character of normalizeText(value)) {
    hash = ((hash * 31) + character.codePointAt(0)) >>> 0;
  }
  return hash;
}

function normalizedComparableText(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function rationaleStartsWithPlayer(rationale, playerName) {
  const text = normalizedComparableText(rationale);
  const name = normalizedComparableText(playerName);
  if (!text || !name) return false;
  if (text === name || text.startsWith(`${name} `)) return true;
  return name
    .split(" ")
    .filter((part) => [...part].length >= 3)
    .some((part) => text === part || text.startsWith(`${part} `));
}

function rationaleMentionsScoring(rationale, language) {
  const text = normalizeText(rationale).toLowerCase();
  if (!text) return false;
  return ({
    en: /\b(?:scor(?:e|ed|ing)|goals?|hat[- ]trick)\b/u,
    es: /\b(?:marc(?:a|ó|o|aron|aba|ando)|goles?|triplete)\b/u,
    ko: /(?:득점|골|해트트릭)/u,
    zh: /(?:进球|入球|攻入|打进|破门|梅开二度|帽子戏法)/u
  })[language].test(text);
}

function rationaleMentionsParticipation(rationale, language) {
  const text = normalizeText(rationale).toLowerCase();
  if (!text) return false;
  return ({
    en: /\b(?:appearances?|starts?|started|every minute|played (?:all|every|\d+)|all \d+ matches?)\b/u,
    es: /\b(?:apariciones?|titular|disputó|disputo|jugó|jugo|todos los minutos)\b/u,
    ko: /(?:출전|선발|전 시간|모든 경기)/u,
    zh: /(?:出场|首发|打满|每一分钟)/u
  })[language].test(text);
}

function rationaleMentionsPerformance(rationale, performanceKey, language) {
  const text = normalizeText(rationale).toLowerCase();
  if (!text || !performanceKey) return false;
  const patterns = {
    en: {
      final: /\bfinal\b/u,
      "final-round": /\bfinal round\b/u,
      "third-place-match": /\b(?:third[- ]place|finished third)\b/u,
      "second-group-stage": /\bsecond (?:group|round)\b/u,
      third: /\b(?:third place|finished third)\b/u,
      fourth: /\b(?:fourth place|finished fourth)\b/u,
      "semi-finals": /\bsemi[- ]finals?\b/u,
      "quarter-finals": /\bquarter[- ]finals?\b/u,
      "round-of-16": /\b(?:round of 16|last 16)\b/u,
      "group-stage": /\bgroup(?: stage)?\b/u
    },
    es: {
      final: /\bfinal\b/u,
      "final-round": /\b(?:liguilla|fase) final\b/u,
      "third-place-match": /\btercer puesto\b/u,
      "second-group-stage": /\bsegunda (?:fase|ronda)\b/u,
      third: /\btercer puesto\b/u,
      fourth: /\bcuarto puesto\b/u,
      "semi-finals": /\bsemifinal(?:es)?\b/u,
      "quarter-finals": /\bcuartos? de final\b/u,
      "round-of-16": /\boctavos? de final\b/u,
      "group-stage": /\b(?:fase de )?grupos?\b/u
    },
    ko: {
      final: /결승/u,
      "final-round": /결승 리그/u,
      "third-place-match": /(?:3·4위전|3위 결정전)/u,
      "second-group-stage": /2차 조별/u,
      third: /3위/u,
      fourth: /4위/u,
      "semi-finals": /(?:준결승|4강)/u,
      "quarter-finals": /(?:8강|준준결승)/u,
      "round-of-16": /16강/u,
      "group-stage": /조별/u
    },
    zh: {
      final: /决赛/u,
      "final-round": /决赛阶段/u,
      "third-place-match": /(?:季军赛|三四名)/u,
      "second-group-stage": /第二阶段小组/u,
      third: /(?:季军|第三名)/u,
      fourth: /第四名/u,
      "semi-finals": /(?:半决赛|四强)/u,
      "quarter-finals": /(?:四分之一决赛|八强)/u,
      "round-of-16": /(?:十六强|八分之一决赛)/u,
      "group-stage": /小组/u
    }
  };
  return patterns[language]?.[performanceKey]?.test(text) || false;
}

export function resolveHistoricalBestXiEvidencePosition(selectionPosition, profilePosition) {
  return normalizeText(selectionPosition) || normalizeText(profilePosition);
}

export function buildHistoricalBestXiEvidence(input = {}) {
  const language = normalizeLanguage(input.language ?? input.locale);
  const playerName = localizedText(input.playerName ?? input.localizedPlayerName, language);
  const teamName = localizedText(input.teamName ?? input.localizedTeamName, language);
  const year = count(readField(input, "tournamentYear"));
  const group = positionGroup(resolveHistoricalBestXiEvidencePosition(
    readField(input, "selectionPosition"),
    readField(input, "position")
  ));
  if (group === "coach") return "";

  const appearances = count(readField(input, "tournamentAppearances"));
  let starts = count(readField(input, "tournamentStarts"));
  const matches = count(readField(input, "teamTournamentMatchCount"));
  const goals = count(readField(input, "goals"));
  let cleanSheets = count(readField(input, "teamTournamentCleanSheets"));
  const goalsFor = count(readField(input, "teamTournamentGoalsFor"));
  const goalsAgainst = count(readField(input, "teamTournamentGoalsAgainst"));
  if (appearances !== null && starts !== null && starts > appearances) starts = null;
  if (matches !== null && cleanSheets !== null && cleanSheets > matches) cleanSheets = null;

  const performance = performanceValue(readField(input, "tournamentTeamPerformance"), language);
  const isChampion = readField(input, "isChampion") === true;
  const rationale = localizedRationale(
    input.existingRationale ?? input.rationale ?? input.fallbackRationale,
    language
  );
  const performanceClause = teamPerformanceClause({
    language,
    teamName,
    year,
    performance,
    isChampion
  });
  const includeGoals = (
    group === "attacker" || group === "midfielder" || group === "unknown"
  ) && !rationaleMentionsScoring(rationale, language);
  const includeParticipation = !rationaleMentionsParticipation(rationale, language);
  const playerStats = playerStatsClause({
    language,
    playerName,
    appearances: includeParticipation ? appearances : null,
    starts: includeParticipation ? starts : null,
    matches,
    goals,
    includeGoals
  });
  const hasAppearanceRecord = includeParticipation && (
    (appearances !== null && appearances > 0) || (starts !== null && starts > 0)
  );
  const defensive = group === "goalkeeper" || group === "defender";
  const defenseFact = defensiveTeamFact({ language, teamName, matches, cleanSheets, goalsAgainst });
  const attackFact = attackingTeamFact({ language, teamName, matches, goalsFor });

  const teamFact = defensive ? defenseFact : attackFact;
  const playerFact = hasAppearanceRecord || (includeGoals && playerStats)
    ? playerStats
    : includeGoals && playerName && goals !== null && goals > 0 && goalsFor !== null && goals <= goalsFor
      ? ({
          en: `${playerName} contributed ${goals} of those goals`,
          es: `${playerName} aportó ${goals} de esos goles`,
          ko: `${playerName}${koreanTopic(playerName)} 그중 ${goals}골을 넣었다`,
          zh: `${playerName}贡献了其中${goals}球`
        })[language]
      : playerStats;
  const supportingFacts = [teamFact, playerFact].filter(Boolean);
  const repeatsPerformance = !isChampion && rationaleMentionsPerformance(
    rationale,
    performance.key,
    language
  );
  const performanceFact = repeatsPerformance && supportingFacts.length >= 2
    ? ""
    : performanceClause;
  const teamFirst = rationaleStartsWithPlayer(rationale, playerName);
  const variant = stableVariant(`${year}|${playerName}`) % 2;
  const orderFacts = (resultFact) => teamFirst
    ? variant === 0
      ? [resultFact, teamFact, playerFact]
      : [teamFact, resultFact, playerFact]
    : variant === 0
      ? [playerFact, resultFact, teamFact]
      : [playerFact, teamFact, resultFact];
  let evidence = finishSentences(language, orderFacts(performanceFact));
  const minimumLength = { en: 65, es: 65, ko: 30, zh: 25 }[language];
  if (!performanceFact && [...evidence].length < minimumLength) {
    evidence = finishSentences(language, orderFacts(performanceClause));
  }
  return evidence || fallbackEvidence({ language, playerName, teamName, year });
}

export function buildHistoricalBestXiDescriptionParagraphs(input = {}, existingRationale) {
  const language = normalizeLanguage(input.language ?? input.locale);
  const rationale = localizedRationale(existingRationale, language) ||
    localizedRationale(input.existingRationale, language) ||
    localizedRationale(input.rationale, language) ||
    localizedRationale(input.fallbackRationale, language);
  const evidence = buildHistoricalBestXiEvidence({
    ...input,
    existingRationale: rationale
  });
  const fallback = evidence || fallbackEvidence({
    language,
    playerName: localizedText(input.playerName ?? input.localizedPlayerName, language),
    teamName: localizedText(input.teamName ?? input.localizedTeamName, language),
    year: count(readField(input, "tournamentYear"))
  }) || rationale;
  return [fallback, rationale || fallback];
}
