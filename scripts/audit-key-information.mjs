#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { auditKeyInformationCollections } from "./key-information-contract.mjs";
import {
  formatKeyInformationSentences as formatEsKeyInformationSentences
} from "../locales/key-information-es.js";
import {
  formatKeyInformationSentences as formatKoKeyInformationSentences
} from "../locales/key-information-ko.js";
import {
  formatKeyInformationSentences as formatZhKeyInformationSentences
} from "../locales/key-information-zh.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NO_REGRESSION_FIXTURE_MINIMUM = 1069;
const UNSUPPORTED_ASSIGNMENT_PATTERN =
  /\b(?:must test|contest(?:s|ed)? (?:the )?central space|tracks? .{0,60} runs?|marks? .{0,60}(?:forward|striker)|connect(?:s|ing)? the phases|runs? beyond|leads? the attack|closes? (?:the )?(?:central )?space)\b/iu;

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function normalizeIndexPart(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function v2AuditNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function localizedHistoricalRiskFactMarkers(language, prior = {}) {
  const matches = v2AuditNumber(prior.matches);
  const wins = v2AuditNumber(prior.wins);
  const draws = v2AuditNumber(prior.draws);
  const losses = v2AuditNumber(prior.losses);
  const goalsFor = v2AuditNumber(prior.goalsFor);
  const goalsAgainst = v2AuditNumber(prior.goalsAgainst);
  const cleanSheets = v2AuditNumber(prior.cleanSheets);
  if (language === "ko") {
    return [
      `${matches}경기`, `${wins}승`, `${draws}무`, `${losses}패`, `${goalsFor}득점`, `${goalsAgainst}실점`,
      ...(cleanSheets > 0 ? [`${cleanSheets}경기 무실점`] : [])
    ];
  }
  if (language === "zh") {
    return [
      `此前${matches}场`, `${wins}胜${draws}平${losses}负`, `打进${goalsFor}球`, `失${goalsAgainst}球`,
      ...(cleanSheets > 0 ? [`${cleanSheets}场零封`] : [])
    ];
  }
  const count = (value, singular, pluralValue, zeroValue) => value === 0
    ? zeroValue
    : `${value} ${value === 1 ? singular : pluralValue}`;
  const markers = [
    count(matches, "partido", "partidos", "0 partidos"),
    count(wins, "victoria", "victorias", "0 victorias"),
    count(draws, "empate", "empates", "0 empates"),
    count(losses, "derrota", "derrotas", "0 derrotas")
  ];
  if (goalsFor === 0 && goalsAgainst === 0) {
    markers.push("sin goles a favor ni en contra");
  } else {
    markers.push(goalsFor === 0 ? "sin goles a favor" : count(goalsFor, "gol a favor", "goles a favor", ""));
    markers.push(goalsAgainst === 0 ? "ningún gol en contra" : count(goalsAgainst, "gol en contra", "goles en contra", ""));
  }
  if (cleanSheets > 0) markers.push(count(cleanSheets, "portería a cero", "porterías a cero", ""));
  return markers;
}

function richFixtureYear(fixture) {
  const kickoffYear = Number(String(fixture?.kickoffUtc || "").slice(0, 4));
  return Number.isFinite(kickoffYear) && kickoffYear > 0 ? kickoffYear : Number(fixture?.tournamentYear) || undefined;
}

function buildHistoricalRosterIndex(historicalProfiles) {
  const index = new Map();
  for (const profile of Object.values(historicalProfiles?.profiles || {})) {
    const year = Number(profile?.tournamentYear);
    const teamName = normalizeIndexPart(profile?.teamName);
    const name = String(profile?.name || "").trim();
    if (!year || !teamName || !name) continue;
    const key = `${year}|${teamName}`;
    const names = index.get(key) || new Set();
    names.add(name);
    index.set(key, names);
  }
  return index;
}

function historicalLineup(fixture) {
  const starters = fixture?.keyInformation?.confirmedStarters;
  if (!starters) return null;
  const formations = fixture?.keyInformation?.confirmedFormations || {};
  return {
    home: { formation: formations.home || "", starters: starters.home || [] },
    away: { formation: formations.away || "", starters: starters.away || [] }
  };
}

const [fixturesData, historyData, teamsData, lineupsData, historicalProfiles, tournamentData] = await Promise.all([
  readJson("data/fixtures.json"),
  readJson("data/history.json"),
  readJson("data/teams.json"),
  readJson("data/lineups.json"),
  readJson("data/historical-player-profiles.json"),
  readJson("data/tournament.json")
]);

const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team.name]));
const historicalRosterIndex = buildHistoricalRosterIndex(historicalProfiles);
const richFixtures = fixturesData.fixtures || [];
const historicalFixtures = historyData.fixtures || [];
const expectedFixtureCount = richFixtures.length + historicalFixtures.length;
const expectedSideCount = expectedFixtureCount * 2;
const tournamentResearchSourceIds = new Set((tournamentData.sources || []).map((source) => source.id).filter(Boolean));
const historicalResearchSourceIds = new Set([
  ...tournamentResearchSourceIds,
  ...(historyData.keyInformationGeneration?.researchSources || []).map((source) => source.id).filter(Boolean)
]);

const collections = [
  {
    name: "rich-edition",
    fixtures: richFixtures,
    minWords: 50,
    maxWords: 72,
    lineupInput: "officialStartingXI",
    modelKind: "current-lineup",
    requiresLayoutEvidence: true,
    requiresStageEvidence: false,
    requiredInputs: ["officialStartingXI", "officialTacticalLayout"],
    validResearchSourceIds: tournamentResearchSourceIds,
    getYear: richFixtureYear,
    getTeamId: (fixture, side) => fixture?.[`${side}TeamId`] || "",
    getTeamName: (fixture, side) => teamsById.get(fixture?.[`${side}TeamId`]) || "",
    getLineup: (fixture) => lineupsData.lineups?.[fixture.id] || null
  },
  {
    name: "historical-editions",
    fixtures: historicalFixtures,
    minWords: 50,
    maxWords: 85,
    lineupComparisonMinWords: 40,
    lineupComparisonMaxWords: 80,
    noPlayerNamesBeforeYear: 1970,
    lineupInput: "confirmedStartingXI",
    modelKind: "historical-evidence",
    validResearchSourceIds: historicalResearchSourceIds,
    getYear: (fixture) => Number(fixture?.tournamentYear) || undefined,
    getTeamName: (fixture, side) => fixture?.[`${side}Slot`] || "",
    getLineup: historicalLineup,
    getRosterNames: (fixture, side) => {
      const key = `${Number(fixture?.tournamentYear)}|${normalizeIndexPart(fixture?.[`${side}Slot`])}`;
      return [...(historicalRosterIndex.get(key) || [])];
    }
  }
];

const localeFormatters = Object.freeze({
  es: formatEsKeyInformationSentences,
  ko: formatKoKeyInformationSentences,
  zh: formatZhKeyInformationSentences
});
const historicalPlanIntentPatterns = Object.freeze({
  es: /\bQuieren\b/u,
  ko: /계획/u,
  zh: /他们希望/u
});
const historicalLocaleEvidenceMarkers = Object.freeze({
  es: {
    identityRecord: /\b(?:sin partidos previos|tras \d+ partidos?|victorias?|empates?|derrotas?|goles? (?:a favor|en contra)|puntos? de fase)\b/iu,
    pointTotal: /\b\d+ puntos?\b/iu,
    cleanSheet: /porterías? a cero/iu,
    host: /selección anfitriona/iu,
    recordLine: /victoria.+empate.+derrota.+gol/iu
  },
  ko: {
    identityRecord: /앞선 \d+경기|\d+승 \d+무 \d+패|\d+득점 \d+실점|조별리그 승점|앞선 경기가 없/u,
    pointTotal: /(?:승점\s*)?\d+점/u,
    cleanSheet: /무실점/u,
    host: /개최국/u,
    recordLine: /\d+승 \d+무 \d+패.+\d+득점 \d+실점/u
  },
  zh: {
    identityRecord: /此前\d+场取得|打进\d+球|小组赛积分|此前尚未出场/u,
    pointTotal: /\d+分/u,
    cleanSheet: /零封/u,
    host: /东道主/u,
    recordLine: /\d+胜\d+平\d+负.+\d+球/u
  }
});
const currentLocaleEvidenceMarkers = Object.freeze({
  es: {
    timing: { "pre-kickoff": /publicado antes del inicio/u, "post-kickoff": /publicado después del inicio/u },
    perspective: { nominal: /\bnominal\b/u, observed: /\bobservado\b/u, revised: /\brevisado\b/u },
    lane: { left: /carril izquierdo/u, right: /carril derecho/u, central: /carril central/u },
    rankedRisk: /\b(?:principal|mayor)\s+riesgo\b|\briesgo\s+(?:principal|mayor)\b/iu
  },
  ko: {
    timing: { "pre-kickoff": /킥오프 전에 공개된/u, "post-kickoff": /킥오프 후 공개된/u },
    perspective: { nominal: /명목상/u, observed: /관찰 기반/u, revised: /수정된/u },
    lane: { left: /왼쪽 통로/u, right: /오른쪽 통로/u, central: /중앙 통로/u },
    rankedRisk: /가장 (?:큰 |주요 )?위험|주요 위험/u
  },
  zh: {
    timing: { "pre-kickoff": /开球前发布的/u, "post-kickoff": /开球后发布的/u },
    perspective: { nominal: /名义版/u, observed: /观察版/u, revised: /修订版/u },
    lane: { left: /左侧通道/u, right: /右侧通道/u, central: /中路通道/u },
    rankedRisk: /(?:主要|最大|首要)风险/u
  }
});
const removedAdministrativeLocalePatterns = Object.freeze({
  es: /\b(?:victorias?|empates?|derrotas?|goles? a favor|goles? en contra|puntos?|antes de (?:estos?|esta)|plaza (?:en|de)|publicad[oa] (?:antes|después) del inicio)\b/iu,
  ko: /\d+승\s*\d+무\s*\d+패|\d+득점\s*\d+실점|승점|진출권|킥오프 (?:전|후)에 공개/u,
  zh: /\d+胜\d+平\d+负|打进\d+球|失\d+球|积分|晋级名额|开球[前后]发布/u
});
function collectModelPlayerNames(model) {
  const names = [];
  const add = (value) => {
    if (Array.isArray(value)) value.forEach(add);
    else if (typeof value === "string" && value.trim()) names.push(value.trim());
    else if (value && typeof value === "object" && typeof value.name === "string") names.push(value.name.trim());
  };
  if (model?.kind === "current-lineup") {
    add([
      model.slots.matchup?.ownStarter,
      model.slots.matchup?.opposingStarter,
      model.slots.matchup?.opponentReference,
      model.slots.plan?.starters,
      model.slots.risk?.starters
    ]);
  } else if (model?.kind === "historical-evidence") {
    add([
      model.slots.identity?.confirmedStarters,
      model.slots.identity?.confirmedStarterFacts,
      model.slots.risk?.opponentConfirmedStarters,
      model.slots.risk?.opponentConfirmedStarterFacts
    ]);
  }
  return [...new Set(names.filter(Boolean))];
}

function auditLocaleModels(fixtures) {
  const issues = [];
  let renderedSides = 0;
  for (const fixture of fixtures) {
    for (const side of ["home", "away"]) {
      const model = fixture.keyInformation?.localeModel?.[side];
      for (const [language, formatter] of Object.entries(localeFormatters)) {
        let sentences;
        try {
          sentences = formatter(model);
        } catch (error) {
          issues.push(`${fixture.id} ${side} ${language} formatter failed: ${error.message}`);
          continue;
        }
        if (!Array.isArray(sentences) || sentences.length !== 4 || sentences.some((sentence) => !String(sentence || "").trim())) {
          issues.push(`${fixture.id} ${side} ${language} must render four non-empty semantic sentences`);
          continue;
        }
        const text = sentences.join(" ");
        if (/\b(?:Against|They want|The risk is|must test|confirmed starters)\b/u.test(text)) {
          issues.push(`${fixture.id} ${side} ${language} leaks an English scaffold`);
        }
        if (language === "zh" && !/[\p{Script=Han}]/u.test(text)) issues.push(`${fixture.id} ${side} zh lacks Han prose`);
        if (language === "ko" && !/[\p{Script=Hangul}]/u.test(text)) issues.push(`${fixture.id} ${side} ko lacks Hangul prose`);
        if (model?.kind === "historical-evidence" && historicalPlanIntentPatterns[language].test(sentences[2])) {
          issues.push(`${fixture.id} ${side} ${language} historical evidence slot invents team intent`);
        }
        const isHistoricalLineupComparison =
          model?.kind === "historical-evidence" && model.slots.identity?.displayMode === "lineup-comparison";
        if (isHistoricalLineupComparison) {
          const identity = model.slots.identity;
          const risk = model.slots.risk;
          if (!sentences[0].includes(model.team.name)) {
            issues.push(`${fixture.id} ${side} ${language} lineup identity omits ${model.team.name}`);
          }
          if (!sentences[2].includes(model.opponent.name)) {
            issues.push(`${fixture.id} ${side} ${language} opponent lineup identity omits ${model.opponent.name}`);
          }
          for (const name of identity.managers || []) {
            if (name && !sentences[0].includes(name)) {
              issues.push(`${fixture.id} ${side} ${language} lineup identity omits manager ${name}`);
            }
          }
          for (const fact of identity.confirmedStarterFacts || []) {
            if (fact?.name && !sentences[1].includes(fact.name)) {
              issues.push(`${fixture.id} ${side} ${language} lineup roles omit ${fact.name}`);
            }
          }
          for (const name of risk.opponentManagers || []) {
            if (name && !sentences[2].includes(name)) {
              issues.push(`${fixture.id} ${side} ${language} opponent lineup identity omits manager ${name}`);
            }
          }
          for (const fact of risk.opponentConfirmedStarterFacts || []) {
            if (fact?.name && !sentences[3].includes(fact.name)) {
              issues.push(`${fixture.id} ${side} ${language} opponent lineup roles omit ${fact.name}`);
            }
          }
          if (removedAdministrativeLocalePatterns[language].test(text)) {
            issues.push(`${fixture.id} ${side} ${language} lineup comparison repeats record, points, stakes, or publication timing`);
          }
        }
        if (model?.kind === "historical-evidence" && !isHistoricalLineupComparison) {
          const markers = historicalLocaleEvidenceMarkers[language];
          const identity = model.slots.identity;
          const plan = model.slots.plan;
          const risk = model.slots.risk;
          if (!sentences[0].includes(String(model.stage?.year || ""))) {
            issues.push(`${fixture.id} ${side} ${language} historical identity omits the tournament stage year`);
          }
          if (identity.isHost && !markers.host.test(sentences[0])) {
            issues.push(`${fixture.id} ${side} ${language} historical identity omits host status`);
          }
          for (const name of [...(identity.managers || []), ...(identity.confirmedStarters || [])]) {
            if (name && !sentences[0].includes(name)) {
              issues.push(`${fixture.id} ${side} ${language} historical identity omits ${name}`);
            }
          }
          if (markers.identityRecord.test(sentences[0])) {
            issues.push(`${fixture.id} ${side} ${language} historical identity repeats prior record evidence`);
          }
          if (markers.pointTotal.test(sentences[2])) {
            issues.push(`${fixture.id} ${side} ${language} historical record repeats group points in sentence 3`);
          }
          if (markers.pointTotal.test(sentences[3])) {
            issues.push(`${fixture.id} ${side} ${language} opponent evidence repeats group points in sentence 4`);
          }
          const phasePrior = plan.phasePrior || {};
          const overallPrior = plan.prior || {};
          const planPrior = plan.scope === "current-phase" && v2AuditNumber(phasePrior.matches) > 0
            ? phasePrior
            : overallPrior;
          if (v2AuditNumber(planPrior.matches) > 0 && !markers.recordLine.test(sentences[2])) {
            issues.push(`${fixture.id} ${side} ${language} historical record omits W-D-L or goals`);
          }
          const expectedCleanSheets = v2AuditNumber(planPrior.cleanSheets);
          if (expectedCleanSheets > 0) {
            const expected = language === "es"
              ? new RegExp(`${expectedCleanSheets} porter[ií]a(?:s)? a cero`, "iu")
              : language === "ko"
                ? new RegExp(`${expectedCleanSheets}경기 무실점`, "u")
                : new RegExp(`${expectedCleanSheets}场零封`, "u");
            if (!expected.test(sentences[2])) {
              issues.push(`${fixture.id} ${side} ${language} historical record omits ${expectedCleanSheets} positive clean sheet(s)`);
            }
          } else if (markers.cleanSheet.test(sentences[2])) {
            issues.push(`${fixture.id} ${side} ${language} historical record states zero clean sheets`);
          }
          const riskPhasePrior = risk.phasePrior || {};
          const riskOverallPrior = risk.opponentPrior || {};
          const riskPrior = risk.scope === "current-phase" && v2AuditNumber(riskPhasePrior.matches) > 0
            ? riskPhasePrior
            : riskOverallPrior;
          if (["opponent-high-scoring", "opponent-clean-sheets", "opponent-record"].includes(risk.key)) {
            for (const marker of localizedHistoricalRiskFactMarkers(language, riskPrior)) {
              if (!sentences[3].includes(marker)) {
                issues.push(`${fixture.id} ${side} ${language} ${risk.key} omits opponent fact: ${marker}`);
              }
            }
          }
          if (v2AuditNumber(riskPrior.cleanSheets) === 0 && markers.cleanSheet.test(sentences[3])) {
            issues.push(`${fixture.id} ${side} ${language} opponent evidence states zero clean sheets`);
          }
          if (model.slots.matchup?.key === "group-opening-points") {
            const winPoints = Number.isFinite(Number(model.slots.matchup.winPoints))
              ? Number(model.slots.matchup.winPoints)
              : Number(model.stage?.year) >= 1994 ? 3 : 2;
            const drawPoints = Number.isFinite(Number(model.slots.matchup.drawPoints))
              ? Number(model.slots.matchup.drawPoints)
              : 1;
            const pointMarkers = language === "es"
              ? [`${winPoints} ${winPoints === 1 ? "punto" : "puntos"}`, `${drawPoints} ${drawPoints === 1 ? "punto" : "puntos"}`]
              : language === "ko"
                ? [`${winPoints}점`, `${drawPoints}점`]
                : [`${winPoints}分`, `${drawPoints}分`];
            if (pointMarkers.some((marker) => !sentences[1].includes(marker))) {
              issues.push(`${fixture.id} ${side} ${language} group opener omits edition win/draw points`);
            }
          }
          if (language === "zh" && model.slots.matchup?.key === "final-title" && !sentences[1].includes("这场比赛决定世界冠军归属")) {
            issues.push(`${fixture.id} ${side} zh final-title wording is not explicit`);
          }
        }
        if (model?.kind === "current-lineup") {
          const markers = currentLocaleEvidenceMarkers[language];
          const identity = model.slots.identity;
          const matchup = model.slots.matchup;
          if (!sentences[0].includes(identity.formation)) {
            issues.push(`${fixture.id} ${side} ${language} omits starting formation ${identity.formation}`);
          }
          if (matchup.variant === "wide-lanes" && matchup.opponentLane) {
            for (const lane of new Set([matchup.lane, matchup.opponentLane])) {
              const laneMarker = markers.lane[lane];
              if (laneMarker && !laneMarker.test(sentences[2])) {
                issues.push(`${fixture.id} ${side} ${language} omits mirrored ${lane} lane`);
              }
            }
          }
          if (removedAdministrativeLocalePatterns[language].test(text)) {
            issues.push(`${fixture.id} ${side} ${language} current copy repeats record, points, stakes, or publication timing`);
          }
          if (markers.rankedRisk.test(sentences[3])) {
            issues.push(`${fixture.id} ${side} ${language} ranks the documented opponent shape as a main risk`);
          }
        }
        for (const name of collectModelPlayerNames(model)) {
          if (!text.includes(name)) issues.push(`${fixture.id} ${side} ${language} omits model player ${name}`);
        }
      }
      renderedSides += 1;
    }
  }
  if (renderedSides !== expectedSideCount) issues.push(`Locale render audit expected ${expectedSideCount} models; found ${renderedSides}`);
  return issues;
}

function auditSyntheticLocaleEvidenceDisclosure() {
  const issues = [];
  let currentBase;
  for (const fixture of richFixtures) {
    for (const side of ["home", "away"]) {
      const candidate = fixture.keyInformation?.localeModel?.[side];
      if (candidate?.kind === "current-lineup" && candidate.slots.matchup?.variant === "wide-lanes") {
        currentBase = candidate;
        break;
      }
    }
    if (currentBase) break;
  }
  if (!currentBase) {
    issues.push("Synthetic locale disclosure audit requires one current wide-lane model");
  } else {
    const opponentLane = currentBase.slots.matchup.lane === "left" ? "right" : "left";
    const model = structuredClone(currentBase);
    Object.assign(model.slots.matchup, {
      opponentLane,
      selectionBasis: "strongest-complete-wide-lane-geometry"
    });
    for (const [language, formatter] of Object.entries(localeFormatters)) {
      const sentences = formatter(model);
      const markers = currentLocaleEvidenceMarkers[language];
      for (const lane of new Set([model.slots.matchup.lane, opponentLane])) {
        if (!markers.lane[lane].test(sentences[2])) {
          issues.push(`Synthetic ${language} current copy omits mirrored ${lane} lane`);
        }
      }
      if (removedAdministrativeLocalePatterns[language].test(sentences.join(" "))) {
        issues.push(`Synthetic ${language} current copy exposes administrative context`);
      }
      if (markers.rankedRisk.test(sentences[3])) {
        issues.push(`Synthetic ${language} current copy ranks opponent shape as a main risk`);
      }
    }
  }

  let historicalBase;
  for (const fixture of historicalFixtures) {
    for (const side of ["home", "away"]) {
      const candidate = fixture.keyInformation?.localeModel?.[side];
      if (candidate?.kind === "historical-evidence" && candidate.slots.risk?.key === "opponent-no-prior") {
        historicalBase = candidate;
        break;
      }
    }
    if (historicalBase) break;
  }
  if (!historicalBase) {
    issues.push("Synthetic locale disclosure audit requires one historical opening model");
  } else {
    const model = structuredClone(historicalBase);
    Object.assign(model.slots.risk, {
      openingIdentityUsed: true,
      opponentIsHost: true,
      opponentManagers: ["Evidence Manager"],
      opponentConfirmedStarters: ["Evidence Starter"]
    });
    for (const [language, formatter] of Object.entries(localeFormatters)) {
      const risk = formatter(model)[3];
      for (const name of ["Evidence Manager", "Evidence Starter"]) {
        if (!risk.includes(name)) issues.push(`Synthetic ${language} historical opening identity omits ${name}`);
      }
      if (historicalPlanIntentPatterns[language].test(risk)) {
        issues.push(`Synthetic ${language} historical opening identity invents team intent`);
      }
    }
  }
  return issues;
}

const REVIEWED_SCENARIO_FIXTURES = Object.freeze([
  ["wc-1950-1950-07-02-first-round-uruguay-bolivia", "1950-group4-uruguay-win", "1950-group4-bolivia-win"],
  ["wc-1950-1950-07-02-first-round-chile-united-states", "1950-group2-chile-eliminated", "1950-group2-usa-win-dependent"],
  ["wc-1962-1962-06-06-matchday-3-brazil-spain", "1962-group3-brazil-draw", "1962-group3-spain-win"],
  ["wc-2002-2002-06-10-matchday-2-tunisia-belgium", "2002-grouph-tunisia-loss", "2002-grouph-belgium-tunisia-loss"],
  ["wc-2006-2006-06-18-matchday-10-brazil-australia", "2006-groupf-brazil-win", "2006-groupf-australia-win"],
  ["wc-2018-2018-06-24-matchday-11-england-panama", "2018-groupg-england-win", "2018-groupg-panama-loss"],
  ["wc-2022-2022-11-26-matchday-7-poland-saudi-arabia", "2022-groupc-poland-saudi-win", "2022-groupc-saudi-win"]
]);

const REVIEWED_SCENARIO_MARKERS = Object.freeze({
  "1950-group4-uruguay-win": { es: ["única plaza del Grupo 4"], ko: ["4조의 유일한 진출권"], zh: ["4组唯一晋级名额"] },
  "1950-group4-bolivia-win": { es: ["única plaza del Grupo 4"], ko: ["4조의 유일한 진출권"], zh: ["4组唯一晋级名额"] },
  "1950-group2-chile-eliminated": { es: ["ya está eliminado"], ko: ["이미 최종 라운드 진출 경쟁에서 탈락"], zh: ["已经无缘决赛阶段"] },
  "1950-group2-usa-win-dependent": { es: ["Inglaterra venza a España", "criterios de desempate"], ko: ["잉글랜드가 스페인을 이겨야", "순위 결정 기준"], zh: ["英格兰战胜西班牙", "排名规则"] },
  "1962-group3-brazil-draw": { es: ["ganar o empatar garantiza", "México venza a Checoslovaquia"], ko: ["승리하거나 비기면", "멕시코가 체코슬로바키아를 이긴 뒤"], zh: ["胜或平即可确保", "墨西哥击败捷克斯洛伐克"] },
  "1962-group3-spain-win": { es: ["ganar garantiza", "empatar exige", "perder supone la eliminación"], ko: ["승리하면 8강 진출이 확정", "비기면 멕시코", "패하면 탈락"], zh: ["获胜即可确保八强席位", "战平则需要墨西哥", "失利就会出局"] },
  "2002-grouph-tunisia-loss": { es: ["perder elimina", "otros partidos del Grupo H"], ko: ["패하면 탈락", "H조의 남은 경기 결과"], zh: ["失利就会出局", "H组其余比赛"] },
  "2002-grouph-belgium-tunisia-loss": { es: ["si gana", "propia clasificación sigue sin resolverse"], ko: ["승리하면", "16강 진출 여부는 여전히 결정되지 않는다"], zh: ["获胜即可淘汰", "自身能否晋级仍未确定"] },
  "2006-groupf-brazil-win": { es: ["ganar garantiza", "empatar o perder"], ko: ["승리하면 16강 진출이 확정", "비기거나 패하면"], zh: ["获胜即可确保十六强席位", "战平或失利后"] },
  "2006-groupf-australia-win": { es: ["ganar garantiza", "empatar o perder"], ko: ["승리하면 16강 진출이 확정", "비기거나 패하면"], zh: ["获胜即可确保十六强席位", "战平或失利后"] },
  "2018-groupg-england-win": { es: ["Bélgica", "Túnez", "octavos de final"], ko: ["벨기에", "튀니지는 탈락"], zh: ["比利时", "淘汰", "突尼斯"] },
  "2018-groupg-panama-loss": { es: ["junto con Túnez", "Bélgica avanzan"], ko: ["튀니지가 탈락", "벨기에는 16강에 진출"], zh: ["突尼斯出局", "比利时进入十六强"] },
  "2022-groupc-poland-saudi-win": { es: ["comienza con 1 punto", "asegura su plaza"], ko: ["1점으로 시작", "승리하면 16강 진출이 확정"], zh: ["以1分起步", "获胜", "确保十六强席位"] },
  "2022-groupc-saudi-win": { es: ["se clasifica para octavos de final", "un empate o una derrota"], ko: ["승리하면 16강에 진출", "비기거나 패하면"], zh: ["获胜即可进入十六强", "战平或失利后"] }
});

function auditReviewedScenarioLocaleBranches() {
  const issues = [];
  for (const [fixtureId, homeKey, awayKey] of REVIEWED_SCENARIO_FIXTURES) {
    const fixture = historicalFixtures.find((candidate) => candidate.id === fixtureId);
    if (!fixture) {
      issues.push(`Reviewed-scenario fixture ${fixtureId} is missing`);
      continue;
    }
    for (const [side, key] of [["home", homeKey], ["away", awayKey]]) {
      const model = structuredClone(fixture.keyInformation.localeModel[side]);
      if (model.slots.identity?.displayMode === "lineup-comparison") continue;
      Object.assign(model.slots.matchup, {
        key,
        scenarioKey: key,
        reviewedScenario: { key, reviewed: true, method: "reviewed-tournament-format-scenario" }
      });
      for (const [language, formatter] of Object.entries(localeFormatters)) {
        const sentence = formatter(model)[1];
        const markers = REVIEWED_SCENARIO_MARKERS[key]?.[language] || [];
        for (const marker of markers) {
          if (!sentence.includes(marker)) {
            issues.push(`${fixtureId} ${side} ${language} ${key} omits reviewed meaning marker: ${marker}`);
          }
        }
        if (!sentence.includes(model.team.name) || !sentence.includes(model.opponent.name)) {
          issues.push(`${fixtureId} ${side} ${language} ${key} omits team or opponent identity`);
        }
      }
    }
  }
  return issues;
}

function requireFixture(fixtures, id, issues) {
  const fixture = fixtures.find((candidate) => candidate.id === id);
  if (!fixture) issues.push(`Focused Key information fixture ${id} is missing`);
  return fixture;
}

function keyFor(fixture, teamName) {
  const side = normalizeIndexPart(fixture.homeSlot) === normalizeIndexPart(teamName) ? "home" : "away";
  return fixture.keyInformation.localeModel[side].slots.matchup.key;
}

function auditFocusedEvidence() {
  const issues = [];
  const final = requireFixture(richFixtures, "match-104-final-2026-07-19", issues);
  const brazilYugoslavia = requireFixture(historicalFixtures, "wc-1950-1950-07-01-first-round-brazil-yugoslavia", issues);
  const swedenSpain = requireFixture(historicalFixtures, "wc-1950-1950-07-16-final-round-sweden-spain", issues);
  const title = requireFixture(historicalFixtures, "wc-1950-1950-07-16-final-round-uruguay-brazil", issues);
  const italyBrazil = requireFixture(historicalFixtures, "wc-1982-1982-07-05-matchday-6-italy-brazil", issues);
  const ecuadorSenegal = requireFixture(historicalFixtures, "wc-2022-2022-11-29-matchday-10-ecuador-senegal", issues);
  const scotland1958 = requireFixture(historicalFixtures, "wc-1958-1958-06-08-matchday-1-yugoslavia-scotland", issues);
  const sweden2002 = requireFixture(historicalFixtures, "wc-2002-2002-06-02-matchday-1-england-sweden", issues);
  const swedenArgentina2002 = requireFixture(historicalFixtures, "wc-2002-2002-06-12-matchday-3-sweden-argentina", issues);
  if (issues.length) return issues;

  const finalSpain = final.keyInformation.home;
  if (!finalSpain.includes("Lamine Yamal") || !finalSpain.includes("Rodri")) {
    issues.push("2026 final Spain copy must use confirmed starters Lamine Yamal and Rodri");
  }
  if (/\b(?:Pedri|Nico Williams)\b/u.test(finalSpain)) {
    issues.push("2026 final Spain copy must not promote substitute Pedri or Nico Williams into the starting plan");
  }
  const finalSpainModel = final.keyInformation.localeModel.home;
  if (finalSpainModel.slots.identity.variant !== "structure-and-players" || final.keyInformation.evidenceInputs.includes("editionTeamProfiles")) {
    issues.push("2026 Spain identity must use only the evidence-backed structure-and-players model");
  }
  if (Object.hasOwn(finalSpainModel.slots.identity, "profileId") || Object.hasOwn(finalSpainModel.slots.matchup, "opponentProfileId")) {
    issues.push("2026 Spain model must not retain unsourced editorial profile ids");
  }

  const expectedKeys = [
    [brazilYugoslavia, "Brazil", "1950-group1-brazil-win"],
    [brazilYugoslavia, "Yugoslavia", "1950-group1-yugoslavia-draw"],
    [swedenSpain, "Sweden", "1950-third-place-sweden-win"],
    [swedenSpain, "Spain", "1950-third-place-spain-draw"],
    [title, "Brazil", "1950-title-brazil-draw"],
    [title, "Uruguay", "1950-title-uruguay-win"],
    [italyBrazil, "Italy", "1982-group3-italy-win"],
    [italyBrazil, "Brazil", "1982-group3-brazil-draw"],
    [ecuadorSenegal, "Ecuador", "2022-groupa-ecuador-draw"],
    [ecuadorSenegal, "Senegal", "2022-groupa-senegal-win"]
  ];
  for (const [fixture, team, expected] of expectedKeys) {
    const actual = keyFor(fixture, team);
    if (actual !== expected) issues.push(`${fixture.id} ${team} stakes key must be ${expected}; found ${actual}`);
  }

  const italySide = normalizeIndexPart(italyBrazil.homeSlot) === "italy" ? "home" : "away";
  const brazilSide = italySide === "home" ? "away" : "home";
  for (const [team, side] of [["Italy", italySide], ["Brazil", brazilSide]]) {
    const identity = italyBrazil.keyInformation.localeModel[side].slots.identity;
    if (identity.scope !== "current-phase" || identity.phasePrior?.points !== 2 || identity.phasePrior?.matches !== 1) {
      issues.push(`1982 Italy-Brazil ${team} must carry 2 points from one current-phase match`);
    }
    if (identity.prior?.pointsApplicable !== false) {
      issues.push(`1982 Italy-Brazil ${team} must not present cumulative earlier-round points as current Group 3 points`);
    }
  }

  const scotlandSide = normalizeIndexPart(scotland1958.homeSlot) === "scotland" ? "home" : "away";
  const scotlandManagers = scotland1958.keyInformation.localeModel[scotlandSide].slots.identity.managers;
  if (!scotlandManagers.includes("Dawson Walker") || !scotland1958.keyInformation[scotlandSide].includes("Dawson Walker")) {
    issues.push("Scotland 1958 must identify Dawson Walker in the manager evidence and copy");
  }
  if (/under Matt Busby/iu.test(scotland1958.keyInformation[scotlandSide])) {
    issues.push("Scotland 1958 must not describe the finals side as simply under Matt Busby");
  }

  const swedenSide = normalizeIndexPart(sweden2002.homeSlot) === "sweden" ? "home" : "away";
  const swedenManagers = sweden2002.keyInformation.localeModel[swedenSide].slots.identity.managers;
  for (const manager of ["Lars Lagerback", "Tommy Soderberg"]) {
    if (!swedenManagers.some((name) => normalizeIndexPart(name) === normalizeIndexPart(manager))) {
      issues.push(`Sweden 2002 must preserve co-manager ${manager}`);
    }
  }

  for (const [team, expectedScenario] of [
    ["Sweden", "2002-group-f-sweden-final-day"],
    ["Argentina", "2002-group-f-argentina-final-day"]
  ]) {
    const side = normalizeIndexPart(swedenArgentina2002.homeSlot) === normalizeIndexPart(team) ? "home" : "away";
    const scenario = swedenArgentina2002.keyInformation.localeModel[side].slots.matchup.scenarioKey;
    if (scenario !== expectedScenario) {
      issues.push(`${swedenArgentina2002.id} ${team} scenarioKey must be ${expectedScenario}; found ${scenario || "missing"}`);
    }
  }

  return issues;
}

function auditLayoutEvidence() {
  const issues = [];
  const counts = { nominal: 0, observed: 0, revised: 0, pre: 0, post: 0 };
  for (const fixture of richFixtures) {
    const layout = fixture.keyInformation?.layoutEvidence || {};
    if (Object.hasOwn(counts, layout.perspective)) counts[layout.perspective] += 1;
    const timing = layout.timing || layout.relationToKickoff;
    if (timing === "pre-kickoff") counts.pre += 1;
    if (timing === "post-kickoff") counts.post += 1;
  }
  if (richFixtures.length === 104) {
    if (counts.pre !== 14 || counts.post !== 90 || counts.nominal !== 14 || counts.observed !== 82 || counts.revised !== 8) {
      issues.push(`2026 layout evidence must preserve 14 nominal pre-kickoff, 82 observed post-kickoff, and 8 revised post-kickoff records; found ${JSON.stringify(counts)}`);
    }
  }
  return issues;
}

function auditCorpusWriting(fixtures) {
  const issues = [];
  const copies = fixtures.flatMap((fixture) => [fixture.keyInformation?.home || "", fixture.keyInformation?.away || ""]);
  const unsupported = copies.filter((copy) => UNSUPPORTED_ASSIGNMENT_PATTERN.test(copy));
  if (unsupported.length) issues.push(`${unsupported.length} Key information sides still contain unsupported lineup-derived tactical assignments`);
  const malformed = copies.filter((copy) => /\b1\s+(?:goals|matches|wins|draws|losses|clean sheets)\b|\ballowed 1 in earlier matches\b/iu.test(copy));
  if (malformed.length) issues.push(`${malformed.length} Key information sides contain malformed quantity grammar`);
  const staleCurrentScaffold = richFixtures.flatMap((fixture) => [fixture.keyInformation?.home || "", fixture.keyInformation?.away || ""])
    .filter((copy) => /\bwhich lists\b|\b(?:polished possession|team profile|profile prior)\b/iu.test(copy));
  if (staleCurrentScaffold.length) issues.push(`${staleCurrentScaffold.length} current sides retain the old formation/profile scaffold`);
  const staleHistoricalScaffold = historicalFixtures.flatMap((fixture) => [fixture.keyInformation?.home || "", fixture.keyInformation?.away || ""])
    .filter((copy) => /The risk is uncertainty|under the edition's rules|kept 0 clean sheets|playing for more points and a stronger final position/iu.test(copy));
  if (staleHistoricalScaffold.length) issues.push(`${staleHistoricalScaffold.length} historical sides retain a retired generic scaffold`);
  const removedAdministrativePattern =
    /\bgoal balance\b|\bbefore this (?:round|quarter-final|semi-final|final)\b|\bwith (?:a|the) .{0,40}place at stake\b|\bgroup points?\b|\bpublished (?:before|after) kickoff\b/iu;
  const currentAdministrative = richFixtures
    .flatMap((fixture) => [fixture.keyInformation?.home || "", fixture.keyInformation?.away || ""])
    .filter((copy) => removedAdministrativePattern.test(copy));
  if (currentAdministrative.length) {
    issues.push(`${currentAdministrative.length} current sides expose record, stage, stakes, points, or publication timing`);
  }
  const historicalLineupAdministrative = historicalFixtures.flatMap((fixture) =>
    ["home", "away"]
      .filter((side) => fixture.keyInformation?.localeModel?.[side]?.slots?.identity?.displayMode === "lineup-comparison")
      .map((side) => fixture.keyInformation?.[side] || "")
  ).filter((copy) => removedAdministrativePattern.test(copy));
  if (historicalLineupAdministrative.length) {
    issues.push(`${historicalLineupAdministrative.length} lineup-backed historical sides expose record, stage, stakes, points, or publication timing`);
  }

  const terminalScenarioSides = historicalFixtures.reduce((count, fixture) => count + ["home", "away"].filter(
    (side) => fixture.keyInformation?.localeModel?.[side]?.slots?.matchup?.terminalScenario
  ).length, 0);
  if (terminalScenarioSides !== 224) {
    issues.push(`Historical final-group scenario coverage must include all 224 team sides from 1998-2022; found ${terminalScenarioSides}`);
  }
  return issues;
}

const result = auditKeyInformationCollections(collections, {
  minimumFixtureCount: Math.max(NO_REGRESSION_FIXTURE_MINIMUM, expectedFixtureCount),
  minimumSideCount: Math.max(NO_REGRESSION_FIXTURE_MINIMUM * 2, expectedSideCount)
});
const allFixtures = [...richFixtures, ...historicalFixtures];
result.issues.push(
  ...auditLocaleModels(allFixtures),
  ...auditSyntheticLocaleEvidenceDisclosure(),
  ...auditReviewedScenarioLocaleBranches(),
  ...auditFocusedEvidence(),
  ...auditLayoutEvidence(),
  ...auditCorpusWriting(allFixtures)
);
result.ok = result.issues.length === 0;

if (!result.ok) {
  const visible = result.issues.slice(0, 240);
  console.error(`Key information contract failed with ${result.issues.length} issue(s):`);
  for (const issue of visible) console.error(`- ${issue}`);
  if (result.issues.length > visible.length) console.error(`- ... ${result.issues.length - visible.length} more issue(s) omitted`);
  process.exitCode = 1;
} else {
  console.log(`Key information contract passed for ${result.stats.fixtures} fixtures / ${result.stats.sides} team sides across ${Object.keys(result.stats.editions).length} editions.`);
  console.log(`Checked ${result.stats.lineupCheckedSides} lineup-backed sides and ${result.stats.canceledSides} canceled-fixture sides.`);
  console.log(`Rendered ${expectedSideCount * Object.keys(localeFormatters).length} localized outputs across zh, es, and ko with four evidence-aligned semantic slots each.`);
}
