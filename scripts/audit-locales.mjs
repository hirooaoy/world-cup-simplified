#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  countLatinWords,
  fileExists,
  formatBytes,
  formatSamples,
  getAtPath,
  getContentModulePayload,
  getKeyPaths,
  getPayloadSize,
  getShapePaths,
  hasSuspiciousPlaceholder,
  importFresh,
  isLikelyUntranslatedLongText,
  readJson,
  readText
} from "./locale-audit-helpers.mjs";
import {
  collectLocaleContentScopes,
  getSourceFingerprint,
  getStructuredContentTranslations,
  readStructuredContentGlossary,
  translateStructuredFootballTerm,
  translateStructuredLeague,
  translateStructuredPosition
} from "./sync-locale-content.mjs";
import {
  buildProviderPlayerNameTranslations,
  getCurrentPlayerNameAliasCoverage,
  getProviderAliasProvenance
} from "./locale-player-name-aliases.mjs";
import {
  collectCurrentFactualCopySources,
  getDeterministicCurrentFactualCopyMismatches,
  getCurrentFactualTerminologyIssues,
  getReviewedCurrentCopyMismatches
} from "./locale-current-factual-copy.mjs";
import {
  GENERATED_PLAYER_NOTE_STRUCTURE_IDS,
  getPlayerSkillCategory,
  isGeneratedPlayerCardCopy,
  parseGeneratedPlayerStyleNote,
  parseGeneratedHistoricalPlayerNote,
  parseGeneratedHistoricalPlayerSummary
} from "../locales/player-note-templates.js";
import { parseHistoricalResultStory } from "../locales/historical-result-templates.js";
import {
  HISTORICAL_EDITORIAL_STYLE_PHRASES,
  HISTORICAL_SPECIAL_STYLE_PHRASES,
  HISTORICAL_STYLE_CATALOGS
} from "./refresh-historical-player-card-notes.mjs";
import {
  HISTORICAL_PLAYER_NOTE_SEMANTICS as ES_HISTORICAL_PLAYER_NOTE_SEMANTICS
} from "../locales/es/historical-player-note-semantics.js";
import {
  HISTORICAL_PLAYER_NOTE_SEMANTICS as KO_HISTORICAL_PLAYER_NOTE_SEMANTICS
} from "../locales/ko/historical-player-note-semantics.js";

const LANGUAGE_CODES = ["en", "zh", "es", "ko"];
const NEW_LANGUAGE_CODES = ["es", "ko"];
const HISTORICAL_STYLE_SEMANTIC_ENTRIES = [
  ...Object.values(HISTORICAL_STYLE_CATALOGS).flatMap((catalog) => [
    ...catalog.signatures,
    ...catalog.actions
  ]),
  ...Object.values(HISTORICAL_EDITORIAL_STYLE_PHRASES).flatMap((catalog) => [
    ...catalog.signatures,
    ...catalog.actions
  ]),
  HISTORICAL_SPECIAL_STYLE_PHRASES.penalty.signature,
  ...HISTORICAL_SPECIAL_STYLE_PHRASES.penalty.actions,
  HISTORICAL_SPECIAL_STYLE_PHRASES.impact.signature,
  ...HISTORICAL_SPECIAL_STYLE_PHRASES.impact.actions,
  ...Object.values(HISTORICAL_SPECIAL_STYLE_PHRASES.goal).flatMap((catalog) => [
    catalog.signature,
    ...catalog.actions
  ])
];
const HISTORICAL_STYLE_SEMANTIC_IDS = new Set(
  HISTORICAL_STYLE_SEMANTIC_ENTRIES.map((entry) => entry.id)
);
const HISTORICAL_STYLE_SEMANTIC_BY_ID = new Map(
  HISTORICAL_STYLE_SEMANTIC_ENTRIES.map((entry) => [entry.id, entry])
);
const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const LANGUAGE_CONTRACT = {
  en: {
    urlCode: "en",
    storageCode: "en",
    intlLocale: "en-US",
    htmlLang: "en",
    nativeName: "English",
    direction: "ltr"
  },
  zh: {
    urlCode: "zh",
    storageCode: "zh",
    intlLocale: "zh-CN",
    htmlLang: "zh-Hans",
    nativeName: "中文",
    direction: "ltr"
  },
  es: {
    urlCode: "es",
    storageCode: "es",
    intlLocale: "es-419",
    htmlLang: "es-419",
    nativeName: "Español",
    direction: "ltr"
  },
  ko: {
    urlCode: "ko",
    storageCode: "ko",
    intlLocale: "ko-KR",
    htmlLang: "ko",
    nativeName: "한국어",
    direction: "ltr"
  }
};

const CONTENT_SCOPES = {
  current: {
    sourceFile: "current-content.json",
    moduleFile: "content-current.js"
  },
  archive: {
    sourceFile: "archive-content.json",
    moduleFile: "content-archive.js"
  },
  release: {
    sourceFile: "release-content.json",
    moduleFile: "content-release.js"
  }
};

const AUTHORED_PLAYER_NOTE_PROBES = Object.freeze([
  Object.freeze({
    scope: "current",
    source:
      "Mbappé's signature is explosive speed once open grass appears. Near goal, he shifts onto his stronger foot and shoots with little backlift. When defenders crowd him, he looks for the next pass instead of forcing a shot.",
    expected: Object.freeze({
      es: "El sello de Mbappé es la velocidad explosiva",
      ko: "음바페의 대표 무기는 열린 공간에서 나오는 폭발적인 속도다"
    })
  }),
  Object.freeze({
    scope: "archive",
    source:
      "Messi controls attacks with close touches and an early picture of the next pass. He draws defenders toward the ball, then releases a runner or shifts into his own shooting lane.",
    expected: Object.freeze({
      es: "Messi controla el ataque con toques cortos",
      ko: "메시는 짧은 터치와 한발 빠른 시야로 공격을 지휘한다"
    })
  })
]);

const CURRENT_PLAYER_NOTE_SEMANTIC_PROBES = Object.freeze([
  Object.freeze({
    signatureId: "centre-first-positioning",
    actionIds: Object.freeze(["hold-central-goal-lane", "claim-cross-high"]),
    expected: Object.freeze({
      es: Object.freeze(["proteger primero el centro de la portería", "mantiene cerrado el carril central", "ataca el centro"]),
      ko: Object.freeze(["골문 중앙부터 지키는", "중앙 통로를 지킨다", "가장 높은 처리 지점을 선점한다"])
    })
  }),
  Object.freeze({
    signatureId: "rebound-control",
    actionIds: Object.freeze(["parry-away-danger", "controlled-reflex-block"]),
    expected: Object.freeze({
      es: Object.freeze(["controlar dónde queda el balón", "desvía la parada", "mantiene manos y pies coordinados"]),
      ko: Object.freeze(["세컨드볼의 방향을 통제하는", "위험이 적은 방향으로 쳐낸다", "손과 발을 함께 움직여"])
    })
  }),
  Object.freeze({
    signatureId: "compact-reflex-shape",
    actionIds: Object.freeze(["controlled-reflex-block", "claim-cross-high"]),
    expected: Object.freeze({
      es: Object.freeze(["postura compacta", "parada de reflejos", "punto más alto"]),
      ko: Object.freeze(["몸을 작고 단단하게", "반사적으로 막은 공", "가장 높은 처리 지점"])
    })
  }),
  Object.freeze({
    signatureId: "nearby-unit-organization",
    actionIds: Object.freeze(["nearby-unit-cues", "lead-first-pressure"]),
    expected: Object.freeze({
      es: Object.freeze(["compañeros cercanos", "indicaciones breves", "activa la primera presión"]),
      ko: Object.freeze(["주변 동료를 정렬", "짧은 지시", "첫 압박을 시작"])
    })
  }),
  Object.freeze({
    signatureId: "front-line-leadership",
    actionIds: Object.freeze(["lead-first-pressure", "attack-back-post"]),
    expected: Object.freeze({
      es: Object.freeze(["primera línea", "siguiente compañero", "segundo palo"]),
      ko: Object.freeze(["전방 동료", "다음 동료", "먼 골대 통로"])
    })
  }),
  Object.freeze({
    signatureId: "penalty-contact-calm",
    actionIds: Object.freeze(["composed-penalty-strike", "attack-back-post"]),
    expected: Object.freeze({
      es: Object.freeze(["presión de un penalti", "acorta la carrera", "segundo palo"]),
      ko: Object.freeze(["페널티킥의 압박", "도움닫기를 줄이고", "먼 골대 통로"])
    })
  }),
  Object.freeze({
    signatureId: "clean-shot",
    actionIds: Object.freeze(["finish-either-foot", "block-cross-angle"]),
    expected: Object.freeze({
      es: Object.freeze(["remate limpio", "cualquiera de las dos piernas", "bloquear el centro"]),
      ko: Object.freeze(["깔끔한 슈팅", "어느 발로도", "크로스를 막을 거리"])
    })
  }),
  Object.freeze({
    signatureId: "left-foot-passing",
    actionIds: Object.freeze(["pass-with-left-foot", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["usar la zurda como salida de pase", "juega con la zurda el pase disponible"]),
      ko: Object.freeze(["왼발을 패스 선택지로 활용", "왼발로 가능한 패스를 연결"])
    })
  }),
  Object.freeze({
    signatureId: "disguised-passing",
    actionIds: Object.freeze(["hide-pass-intent", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["ocultar hasta el último momento", "da a entender que jugará"]),
      ko: Object.freeze(["마지막 순간까지 패스 의도를 숨기는", "한쪽으로 연결할 듯하다가"])
    })
  }),
  Object.freeze({
    signatureId: "pullback-creation",
    actionIds: Object.freeze(["pull-ball-back", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["encontrar a un compañero que llega con un pase atrás", "desde cerca de la línea de fondo"]),
      ko: Object.freeze(["뒤로 내주는 패스", "엔드라인 근처에서"])
    })
  }),
  Object.freeze({
    signatureId: "passing-continuity",
    actionIds: Object.freeze(["play-available-pass", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["mantener la posesión en movimiento", "siguiente compañero disponible"]),
      ko: Object.freeze(["점유의 흐름을 이어가는", "다음으로 연결할 수 있는 동료"])
    })
  }),
  Object.freeze({
    signatureId: "crossing-volume",
    actionIds: Object.freeze(["repeat-wide-delivery", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["volver a la banda para repetir los envíos", "otro balón hacia el área"]),
      ko: Object.freeze(["측면으로 돌아가 반복", "페널티지역으로 다시 공을 보낼"])
    })
  }),
  Object.freeze({
    signatureId: "one-on-one-running",
    actionIds: Object.freeze(["run-at-isolated-defender", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["conducir directamente hacia un defensor aislado", "defensor que tiene delante"]),
      ko: Object.freeze(["고립된 수비수를 향해", "공을 통제한 채"])
    })
  }),
  Object.freeze({
    signatureId: "shot-stopping-readiness",
    actionIds: Object.freeze(["set-for-shot", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["proteger el centro de la portería", "mantiene cerrado el carril central"]),
      ko: Object.freeze(["골문 중앙을 지키는 판단", "중앙 통로를 닫아 둔다"])
    })
  }),
  Object.freeze({
    signatureId: "aerial-defending",
    actionIds: Object.freeze(["contest-aerial-ball", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["balones aéreos en su zona defensiva", "antes de que el atacante pueda controlarlo"]),
      ko: Object.freeze(["수비 구역의 공중볼", "공을 향해 움직여"])
    })
  }),
  Object.freeze({
    signatureId: "pressing-work",
    actionIds: Object.freeze(["join-team-pressure", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["participar activamente en la presión", "compañeros cierran las opciones cercanas"]),
      ko: Object.freeze(["팀 압박에 적극적으로 참여", "동료들이 근처 선택지를 닫는"])
    })
  }),
  Object.freeze({
    signatureId: "set-piece-responsibility",
    actionIds: Object.freeze(["deliver-dead-ball", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["asumir los envíos ofensivos a balón parado", "córneres y faltas"]),
      ko: Object.freeze(["공격 세트피스 킥을 맡아", "코너킥과 프리킥"])
    })
  }),
  Object.freeze({
    signatureId: "chance-passing",
    actionIds: Object.freeze(["play-to-available-runner", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["buscar el pase que puede crear", "corredor disponible"]),
      ko: Object.freeze(["다음 기회를 만들 수 있는 패스", "패스를 받을 수 있는 동료"])
    })
  }),
  Object.freeze({
    signatureId: "ball-carrying",
    actionIds: Object.freeze(["carry-into-space", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["hacer avanzar la posesión", "espacio disponible"]),
      ko: Object.freeze(["점유를 전진시키는 운반", "열린 공간으로 운반"])
    })
  }),
  Object.freeze({
    signatureId: "dribbling-control",
    actionIds: Object.freeze(["carry-under-pressure", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["pese a la presión cercana", "balón cerca mientras avanza"]),
      ko: Object.freeze(["근접 압박을 받으면서도", "공을 가까이 둔다"])
    })
  }),
  Object.freeze({
    signatureId: "wide-service",
    actionIds: Object.freeze(["send-wide-delivery", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["poner balones desde las bandas", "desde una posición de banda"]),
      ko: Object.freeze(["측면 지역에서 공을 보내는", "측면 위치에서"])
    })
  }),
  Object.freeze({
    signatureId: "goal-threat-positioning",
    actionIds: Object.freeze(["move-into-shot-position", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["siguiente pase puede convertirse en remate", "puede acabar en remate"]),
      ko: Object.freeze(["다음 패스를 슈팅으로 바꿀", "패스가 슈팅으로 이어질 위치"])
    })
  }),
  Object.freeze({
    signatureId: "finishing-readiness",
    actionIds: Object.freeze(["set-for-finish", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["prepararse para definir", "se prepara para rematar"]),
      ko: Object.freeze(["공이 올 때 마무리를 준비", "공을 받으면 슈팅을 준비"])
    })
  }),
  Object.freeze({
    signatureId: "pace-in-space",
    actionIds: Object.freeze(["accelerate-into-space", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["usar su velocidad cuando se abre el camino", "acelera cuando se abre"]),
      ko: Object.freeze(["통로가 열릴 때 속도를 활용", "통로가 열리면 가속"])
    })
  }),
  Object.freeze({
    signatureId: "aerial-duels",
    actionIds: Object.freeze(["contest-aerial-ball", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["competir por balones aéreos", "va hacia el balón que cae"]),
      ko: Object.freeze(["공중볼 경합에 참여", "떨어지는 공을 향해 움직여"])
    })
  }),
  Object.freeze({
    signatureId: "strength-in-contact",
    actionIds: Object.freeze(["hold-through-contact", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["usar su fuerza en el contacto directo", "mantiene la posición durante el contacto"]),
      ko: Object.freeze(["직접 몸싸움에서 힘을 활용", "몸싸움을 버티며 위치를 지킨"])
    })
  }),
  Object.freeze({
    signatureId: "goalkeeper-distribution",
    actionIds: Object.freeze(["restart-to-teammate", "move-after-release"]),
    expected: Object.freeze({
      es: Object.freeze(["salida disponible después de recuperar la posesión", "reanuda el juego con un pase a un compañero disponible"]),
      ko: Object.freeze(["공을 되찾은 뒤 연결할 수 있는 동료", "공을 보내 경기를 재개한다"])
    })
  })
]);

const REVIEWED_ARCHIVE_SOURCE_COPY = Object.freeze({
  "Historical men's World Cup match data imported from the public-domain openfootball/worldcup.json project. Historical kickoff wall-clock times are synced from Wikidata match-item time-of-day qualifiers when available; date-only cancelled fixtures remain without kickoff time.":
    Object.freeze({
      es: "Datos históricos de partidos del Mundial masculino importados del proyecto de dominio público openfootball/worldcup.json. Cuando están disponibles, las horas locales de inicio se sincronizan con los calificadores de hora del día de cada partido en Wikidata; los encuentros cancelados que solo tienen fecha permanecen sin hora de inicio.",
      ko: "남자 월드컵 역대 경기 데이터는 퍼블릭 도메인 프로젝트 openfootball/worldcup.json에서 가져왔습니다. 과거 경기의 현지 킥오프 시각은 이용 가능한 경우 Wikidata 경기 항목의 시각 한정자와 동기화하며, 날짜만 확인되는 취소 경기는 킥오프 시각 없이 표시됩니다."
    }),
  "openfootball World Cup JSON": Object.freeze({
    es: "openfootball World Cup JSON",
    ko: "openfootball 월드컵 JSON"
  })
});

const DATA_FILES = {
  fixtures: "data/fixtures.json",
  playerProfiles: "data/player-profiles.json",
  coachProfiles: "data/coach-profiles.json",
  teams: "data/teams.json",
  tournament: "data/tournament.json",
  lineups: "data/lineups.json",
  expectedLineups: "data/expected-lineups.json",
  playerAvailability: "data/player-availability.json",
  adminMessage: "data/admin-message.json",
  history: "data/history.json",
  historicalPlayerProfiles: "data/historical-player-profiles.json",
  releaseNotes: "data/release-notes.json"
};

const REVIEWED_HISTORICAL_VENUE_PROBES = Object.freeze({
  "Estadio Centenario, Montevideo": Object.freeze({
    es: "Estadio Centenario, Montevideo",
    ko: "에스타디오 센테나리오, 몬테비데오"
  }),
  "Wembley Stadium, London": Object.freeze({
    es: "Wembley Stadium, Londres",
    ko: "웸블리 스타디움, 런던"
  }),
  "Soccer City, Johannesburg": Object.freeze({
    es: "Soccer City, Johannesburgo",
    ko: "사커 시티, 요하네스버그"
  }),
  "Lusail Iconic Stadium, Lusail": Object.freeze({
    es: "Lusail Iconic Stadium, Lusail",
    ko: "루사일 아이코닉 스타디움, 루사일"
  })
});

const REVIEWED_COACH_STYLE_LABELS = Object.freeze({
  es: Object.freeze({
    "Counter-attack": "Contraataque",
    "Defensive organization": "Organización defensiva",
    "Attacking structure": "Estructura de ataque",
    "Counter-pressing": "Presión tras pérdida",
    "Direct transitions": "Transiciones directas",
    "High press": "Presión alta",
    "Positional discipline": "Disciplina posicional",
    "Possession control": "Control de la posesión",
    "Set-piece focus": "Énfasis en el balón parado",
    "Wing overloads": "Superioridades por banda",
    "Youth pipeline": "Desarrollo de jóvenes"
  }),
  ko: Object.freeze({
    "Counter-attack": "역습",
    "Defensive organization": "수비 조직",
    "Attacking structure": "공격 구조",
    "Counter-pressing": "역압박",
    "Direct transitions": "빠른 전환",
    "High press": "전방 압박",
    "Positional discipline": "포지셔닝 규율",
    "Possession control": "점유 운영",
    "Set-piece focus": "세트피스 중시",
    "Wing overloads": "측면 수적 우위",
    "Youth pipeline": "유망주 육성"
  })
});

const PAYLOAD_BUDGETS = {
  "locales/locale-runtime.js": { soft: 5 * 1024, hard: 12 * 1024 },
  "locales/player-note-templates.js": { soft: 8 * 1024, hard: 20 * 1024 },
  "locales/es/app.js": { soft: 20 * 1024, hard: 60 * 1024 },
  "locales/ko/app.js": { soft: 20 * 1024, hard: 60 * 1024 },
  "locales/es/report.js": { soft: 5 * 1024, hard: 15 * 1024 },
  "locales/ko/report.js": { soft: 5 * 1024, hard: 15 * 1024 },
  "locales/es/chatbot.js": { soft: 20 * 1024, hard: 60 * 1024 },
  "locales/ko/chatbot.js": { soft: 20 * 1024, hard: 60 * 1024 },
  "locales/es/player-names.js": { soft: 30 * 1024, hard: 90 * 1024 },
  "locales/ko/player-names.js": { soft: 30 * 1024, hard: 90 * 1024 },
  "locales/es/player-names-archive.js": { soft: 30 * 1024, hard: 90 * 1024 },
  "locales/ko/player-names-archive.js": { soft: 30 * 1024, hard: 90 * 1024 }
};

const CONTENT_PAYLOAD_BUDGETS = {
  current: { soft: 220 * 1024, hard: 600 * 1024 },
  archive: { soft: 800 * 1024, hard: 1600 * 1024 },
  release: { soft: 120 * 1024, hard: 300 * 1024 }
};

const REQUIRED_REPORT_PATHS = [
  "text.addNote",
  "text.attachedContext",
  "text.back",
  "text.completeRequired",
  "text.date",
  "text.details",
  "text.issue",
  "text.issueOptions.match-score-schedule",
  "text.issueOptions.lineup-player",
  "text.issueOptions.prediction-standings",
  "text.issueOptions.other",
  "text.metaDescription",
  "text.optional",
  "text.reportFailed",
  "text.reportHeading",
  "text.reportSent",
  "text.replyEmail",
  "text.sending",
  "text.sendReport",
  "text.timezone",
  "text.title",
  "text.website",
  "text.whatChanged",
  "footerText.dataRefreshed",
  "footerText.fallbackRelease",
  "footerText.latestChanges",
  "footerText.madeBy",
  "footerText.predictions",
  "footerText.releaseNotes",
  "footerText.reportIssue",
  "footerText.seeSources",
  "footerText.sources",
  "footerText.tournamentFacts",
  "footerText.forecasts",
  "footerText.playerInformation",
  "footerText.officialHighlights",
  "footerText.exactSources",
  "formatting.creatorPattern",
  "formatting.labelSeparator",
  "formatting.sentenceEnd"
];

const REQUIRED_BALL_BOY_COPY_PATHS = [
  "assistantName",
  "status",
  "initialMessage",
  "open",
  "chatLabel",
  "reset",
  "newChat",
  "close",
  "suggestedQuestions",
  "suggestions[0]",
  "showMore",
  "moreBelow",
  "askLabel",
  "placeholder",
  "send",
  "thinking",
  "followUps",
  "country",
  "player",
  "match",
  "ruleSimple",
  "whatIKnow",
  "whichPlayer",
  "dataProblem",
  "tryAgain",
  "worldCupStats",
  "thisWorldCup",
  "playerDetails",
  "goals",
  "assists",
  "age",
  "estimatedValue",
  "value",
  "prime",
  "signatureTraits",
  "readPlay",
  "whyWatch",
  "lastMatch",
  "nextMatch",
  "recentForm",
  "adaptMatch",
  "keyPlayers",
  "topScorer",
  "howTheyPlay",
  "teamStyleFlow",
  "goalTimeline",
  "matchChanges",
  "playPlans",
  "currentComparison",
  "pastMeetings",
  "prediction90",
  "watchListTitle",
  "languageActionIntro",
  "timeZoneActionIntro",
  "switchLanguage",
  "switchTimeZone",
  "languageAlreadySet",
  "timeZoneAlreadySet",
  "languageChanged",
  "timeZoneChanged",
  "unsupportedLanguage",
  "unsupportedTimeZone",
  "reportIssue",
  "errorText"
];

const BALL_BOY_KNOWLEDGE_PATHS = [
  "rules",
  "offside",
  "personality",
  "intents",
  "entityPolicies.clubs",
  "entityPolicies.leagues",
  "positions",
  "stages",
  "teamNames",
  "timeZoneNames",
  "templates.playerLead",
  "templates.countryLead",
  "templates.matchLead",
  "templates.help",
  "templates.unknown",
  "templates.watch",
  "templates.reportUnsupported"
];

const APP_SURFACE_PROBES = {
  "matches and statuses": [
    { source: "Matches" },
    { source: "Live" },
    { source: "Final score" },
    { source: "Delayed" },
    { source: "Postponed" },
    { source: "Canceled" },
    { source: "Up next" }
  ],
  "match information cards": [
    { source: "Key information" },
    { source: "Line-ups" },
    { source: "Formation & events" },
    { source: "Goals" },
    { source: "Prediction" },
    { source: "Past matches" },
    { source: "No scorer data loaded." }
  ],
  "player information cards": [
    { source: "Player" },
    { source: "Position to verify" },
    { source: "Club to verify" },
    { source: "Age 25", forbidden: ["Age"] },
    { source: "Age then 25", forbidden: ["Age then"] },
    { source: "This World Cup: 3 goals, 2 assists", forbidden: ["This World Cup", "goals", "assists"] },
    { source: "Est. value", forbidden: ["Est. value"] },
    { source: "Value", forbidden: ["Value"] },
    { source: "Prime", forbidden: ["Prime"] },
    {
      source: "Loading archive player profile",
      forbidden: ["archive player profile", "Loading"]
    },
    { source: "Historic World Cup record", forbidden: ["Historic", "record"] }
  ],
  "coach cards": [
    { source: "Coach" },
    { source: "Head Coach" },
    { source: "Since" },
    { source: "Good at" },
    { source: "Can struggle with" }
  ],
  "country and search": [
    { source: "Search country" },
    { source: "No loaded World Cup matches found." },
    { source: "Previous World Cups" },
    { source: "Show all matches" },
    { source: "Hide matches" },
    { source: "Hide previous World Cups" }
  ],
  "past World Cups": [
    { source: "Past World Cup meetings" },
    { source: "Group standings" },
    { source: "Final round standings" },
    { source: "Score details are not loaded for this historical record." },
    { source: "World Cup 2022", forbidden: ["World Cup"] }
  ],
  "future and knockout World Cup": [
    { source: "Tournament bracket" },
    { source: "Knockout winner progression" },
    { source: "Round of 32" },
    { source: "Round of 16" },
    { source: "Quarter-finals" },
    { source: "Semi-finals" },
    { source: "Final", allowSame: { es: true } },
    {
      source: "Predicted matchup; participants come from current knockout-path estimates."
    },
    {
      source:
        "If it goes to penalties, both are chasing a first World Cup shootout win: France have tried 5 times, England 4.",
      forbidden: ["If it goes to penalties", "World Cup shootout"]
    }
  ],
  "Catch Up": [
    { source: "Loading catch-up notes" },
    { source: "No catch-up notes loaded yet" },
    { source: "Yesterday and today do not have finished or live match notes yet." },
    { source: "Read source" }
  ],
  "footer and issue reporting": [
    { source: "Report issue" },
    { source: "See sources" },
    { source: "See release notes" },
    { source: "Predictions are unofficial." },
    { source: "Data refreshed" }
  ]
};

const issues = [];
const metrics = [];
let checkCount = 0;

function record(severity, area, detail, remediation = "") {
  issues.push({ severity, area, detail, remediation });
}

function check(area, condition, detail, remediation = "") {
  checkCount += 1;
  if (!condition) {
    record("error", area, detail, remediation);
  }
}

function warn(area, condition, detail, remediation = "") {
  checkCount += 1;
  if (!condition) {
    record("warning", area, detail, remediation);
  }
}

function metric(label, value) {
  metrics.push({ label, value });
}

function sameMembers(left, right) {
  const leftValues = [...new Set(left)].sort();
  const rightValues = [...new Set(right)].sort();
  return (
    leftValues.length === rightValues.length &&
    leftValues.every((value, index) => value === rightValues[index])
  );
}

function flattenStringLeaves(value, prefix = "", output = []) {
  if (typeof value === "string") {
    output.push({ path: prefix, value });
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenStringLeaves(item, `${prefix}[${index}]`, output));
    return output;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      flattenStringLeaves(item, prefix ? `${prefix}.${key}` : key, output);
    }
  }
  return output;
}

function hasPath(value, path) {
  if (path.includes("[")) {
    return getKeyPaths(value).includes(path);
  }
  return getAtPath(value, path) !== undefined;
}

function getStaticLocaleImports(source) {
  const imports = [];
  const importPattern = /^\s*import\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["'];?/gmu;
  for (const match of source.matchAll(importPattern)) {
    if (/\/locales\/(?:es|ko)\//u.test(match[1]) || /^\.\/locales\/(?:es|ko)\//u.test(match[1])) {
      imports.push(match[1]);
    }
  }
  return imports;
}

function getTranslationProbeFailure(pack, language, probe) {
  const translated = String(pack?.helpers?.translateText?.(probe.source) ?? "").trim();
  if (!translated) {
    return `${JSON.stringify(probe.source)} returned an empty translation`;
  }
  if (translated === probe.source && !probe.allowSame?.[language]) {
    return `${JSON.stringify(probe.source)} is unchanged`;
  }
  const leakedFragment = (probe.forbidden || []).find((fragment) =>
    translated.toLocaleLowerCase("en-US").includes(fragment.toLocaleLowerCase("en-US"))
  );
  if (leakedFragment) {
    return `${JSON.stringify(probe.source)} still contains ${JSON.stringify(leakedFragment)} in ${JSON.stringify(translated)}`;
  }
  if (
    language === "ko" &&
    /[A-Za-z]/u.test(probe.source) &&
    !/\p{Script=Hangul}/u.test(translated) &&
    !probe.allowSame?.ko
  ) {
    return `${JSON.stringify(probe.source)} has no Hangul in ${JSON.stringify(translated)}`;
  }
  if (hasSuspiciousPlaceholder(translated)) {
    return `${JSON.stringify(probe.source)} produced suspicious text ${JSON.stringify(translated)}`;
  }
  return "";
}

function isLikelyProperName(value) {
  const text = String(value || "").trim();
  if (!text || /[.!?;:]/u.test(text)) {
    return false;
  }
  const words = text.split(/\s+/u);
  if (words.length > 10) {
    return false;
  }
  const connectors = new Set([
    "and",
    "da",
    "das",
    "de",
    "del",
    "di",
    "do",
    "dos",
    "du",
    "la",
    "le",
    "municipal",
    "of",
    "the",
    "von",
    "y"
  ]);
  return words.every((word, index) => {
    const clean = word.replace(/^[^\p{Letter}\p{Number}]+|[^\p{Letter}\p{Number}]+$/gu, "");
    if (!clean) {
      return true;
    }
    if (index > 0 && connectors.has(clean.toLocaleLowerCase("en-US"))) {
      return true;
    }
    return /^[\p{Uppercase_Letter}\p{Number}]/u.test(clean) || /^[A-Z0-9]{2,}$/u.test(clean);
  });
}

function isLikelyNonVisibleIdentifier(value) {
  const text = String(value || "").trim();
  return (
    /^[a-f0-9]{32,}$/iu.test(text) ||
    /^(?:data|locales|scripts)\/.+\.(?:json|js|mjs)$/iu.test(text) ||
    /^[a-z0-9]+(?:-[a-z0-9]+){2,}-20\d{2}(?:-\d{2}){0,2}$/iu.test(text) ||
    (text.length > 20 && /^[a-z0-9]+(?:-[a-z0-9]+){3,}$/u.test(text))
  );
}

function getVisibleFactTokens(value) {
  const text = String(value || "");
  const facts = new Set();
  const patterns = [
    /\b\d{1,2}-\d{1,2}\b/gu,
    /\b\d{1,3}\+\d{1,2}(?:st|nd|rd|th)?\b/giu,
    /\b(?:19|20)\d{2}\b/gu,
    /\b\d+(?:\.\d+)?%/gu,
    /\b\d+['′]/gu
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      facts.add(match[0].replace(/(?:st|nd|rd|th)$/iu, "").replace(/['′]$/u, ""));
    }
  }
  return [...facts];
}

function getLeadingMarker(value) {
  return String(value || "").match(/^(\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic})*)\s*/u)?.[1] || "";
}

async function safeImport(relativePath, area) {
  try {
    return await importFresh(relativePath);
  } catch (error) {
    record(
      "error",
      area,
      `could not import ${relativePath}: ${error.message}`,
      `Make ${relativePath} valid ESM before launching the locale.`
    );
    return null;
  }
}

async function loadRequiredData() {
  const entries = await Promise.all(
    Object.entries(DATA_FILES).map(async ([key, relativePath]) => {
      try {
        return [key, await readJson(relativePath)];
      } catch (error) {
        record(
          "error",
          "content sources",
          `could not read ${relativePath}: ${error.message}`,
          "Restore the canonical English data source before generating locale overlays."
        );
        return [key, {}];
      }
    })
  );
  return Object.fromEntries(entries);
}

function addArchiveExcludedSource(target, value) {
  if (typeof value === "string") {
    const text = value.trim();
    if (text) {
      target.add(text);
    }
    return;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    addArchiveExcludedSource(target, value.en);
  }
}

function getHistoricalArchiveExcludedSources(history) {
  const categories = {
    "result-story prose": new Set(),
    "raw keyInformation": new Set(),
    "key-player notes/positions": new Set(),
    "raw venue strings": new Set()
  };
  for (const fixture of history?.fixtures || []) {
    for (const story of fixture?.resultStoryBullets || []) {
      addArchiveExcludedSource(categories["result-story prose"], story);
    }
    addArchiveExcludedSource(
      categories["raw keyInformation"],
      fixture?.keyInformation?.home
    );
    addArchiveExcludedSource(
      categories["raw keyInformation"],
      fixture?.keyInformation?.away
    );
    for (const side of ["home", "away"]) {
      for (const player of fixture?.keyPlayers?.[side] || []) {
        addArchiveExcludedSource(
          categories["key-player notes/positions"],
          player?.note
        );
        addArchiveExcludedSource(
          categories["key-player notes/positions"],
          player?.position
        );
      }
    }
    addArchiveExcludedSource(categories["raw venue strings"], fixture?.venue);
  }
  return categories;
}

function getArchiveExcludedLeaks(values, categories) {
  const sourceSet = new Set(values);
  return Object.entries(categories).flatMap(([category, excluded]) =>
    [...excluded]
      .filter((value) => sourceSet.has(value))
      .map((value) => `${category}: ${value}`)
  );
}

function getLatestVisibleReleaseStrings(releaseNotes) {
  const latest = [...(releaseNotes?.releases || [])]
    .filter((item) => item && typeof item === "object")
    .sort(
      (left, right) =>
        new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime()
    )[0];
  return latest
    ? [latest.title, ...(latest.highlights || []).slice(0, 3)]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    : [];
}

function normalizeProfileLookupName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

async function auditHistoricalLocaleArchitecture(
  data,
  requiredSources,
  appPacks,
  currentContentModules
) {
  const historyFixtures = data.history?.fixtures || [];
  const stories = historyFixtures.flatMap((fixture) =>
    Array.isArray(fixture?.resultStoryBullets)
      ? fixture.resultStoryBullets.filter(
          (story) => typeof story === "string" && story.trim()
        )
      : []
  );
  const parsedStories = stories.map((story) => [
    story,
    parseHistoricalResultStory(story)
  ]);
  const unparsedStories = parsedStories
    .filter(([, parsed]) => !parsed)
    .map(([story]) => story);
  check(
    "historical result templates",
    stories.length === 2826 && unparsedStories.length === 0,
    `parsed ${stories.length - unparsedStories.length}/${stories.length} historical result bullets; expected 2,826/2,826. Misses: ${formatSamples(unparsedStories)}`,
    "Add a reviewed deterministic template before introducing a new historical result-story sentence."
  );
  const malformedParsedFields = parsedStories
    .filter(([, parsed]) => parsed)
    .flatMap(([story, parsed]) =>
      Object.entries(parsed)
        .filter(
          ([field, value]) =>
            field !== "variant" &&
            typeof value === "string" &&
            (/\.$/u.test(value) ||
              (/(?:Player|player)$/u.test(field) && /\bown goal\b/iu.test(value)))
        )
        .map(([field, value]) => `${story} -> ${field}: ${value}`)
    );
  check(
    "historical result templates",
    malformedParsedFields.length === 0,
    `historical result parsing left punctuation or own-goal prose inside entity fields: ${formatSamples(malformedParsedFields)}`,
    "Keep sentence punctuation outside captures and give own-goal replies their own structured variant."
  );

  const excludedArchiveSources = getHistoricalArchiveExcludedSources(data.history);
  const requiredArchiveLeaks = getArchiveExcludedLeaks(
    requiredSources.archive,
    excludedArchiveSources
  );
  check(
    "structured historical archive",
    requiredArchiveLeaks.length === 0,
    `archive required sources still include template/entity copy: ${formatSamples(requiredArchiveLeaks)}`,
    "Keep historical results, key information, key-player fields, and venues on structured formatters/entities."
  );

  const venueSource = await readJson("data/locales/historical-venues.json");
  const expectedVenues = [
    ...new Set(
      historyFixtures
        .map((fixture) => String(fixture?.venue || "").trim())
        .filter(Boolean)
    )
  ].sort((left, right) => left.localeCompare(right, "en"));
  const mappedVenues = Object.keys(venueSource?.venues || {}).sort((left, right) =>
    left.localeCompare(right, "en")
  );
  const missingVenues = expectedVenues.filter(
    (venue) => !mappedVenues.includes(venue)
  );
  const extraVenues = mappedVenues.filter(
    (venue) => !expectedVenues.includes(venue)
  );
  const incompleteVenueRows = expectedVenues.filter((venue) =>
    NEW_LANGUAGE_CODES.some(
      (language) => !String(venueSource?.venues?.[venue]?.[language] || "").trim()
    )
  );
  check(
    "structured historical venues",
    expectedVenues.length === 208 &&
      mappedVenues.length === 208 &&
      missingVenues.length === 0 &&
      extraVenues.length === 0 &&
      incompleteVenueRows.length === 0 &&
      venueSource?.coverage?.uniqueVenueCount === 208,
    `historical venue coverage is ${mappedVenues.length}/208; ${missingVenues.length} missing, ${extraVenues.length} extra, ${incompleteVenueRows.length} incomplete. ${formatSamples(
      missingVenues
        .map((venue) => `missing ${venue}`)
        .concat(extraVenues.map((venue) => `extra ${venue}`))
        .concat(incompleteVenueRows.map((venue) => `incomplete ${venue}`))
    )}`,
    "Keep the reviewed historical venue map in exact parity with data/history.json."
  );

  const releaseStrings = getLatestVisibleReleaseStrings(data.releaseNotes);
  check(
    "lazy release scope",
    releaseStrings.length >= 2 &&
      releaseStrings.length <= 4 &&
      sameMembers(requiredSources.release, releaseStrings),
    `release scope must be the latest title plus up to three highlights; found ${requiredSources.release.length} required strings: ${formatSamples(requiredSources.release)}`,
    "Do not ship older or currently hidden release-note copy in the lazy locale pack."
  );

  for (const language of NEW_LANGUAGE_CODES) {
    const [archiveSource, releaseSource, archiveModule] = await Promise.all([
      readJson(`data/locales/${language}/archive-content.json`),
      readJson(`data/locales/${language}/release-content.json`),
      safeImport(
        `locales/${language}/content-archive.js`,
        "structured historical archive"
      )
    ]);
    const archiveTranslations = archiveSource?.translations || {};
    const archiveLeaks = getArchiveExcludedLeaks(
      Object.keys(archiveTranslations),
      excludedArchiveSources
    );
    check(
      "structured historical archive",
      archiveLeaks.length === 0,
      `${language} archive source dictionary includes template/entity copy: ${formatSamples(archiveLeaks)}`,
      "Regenerate the archive dictionary after removing raw historical fixture prose."
    );
    const archiveSourceCopyFailures = Object.entries(
      REVIEWED_ARCHIVE_SOURCE_COPY
    )
      .filter(
        ([english, expected]) =>
          archiveTranslations[english] !== expected[language]
      )
      .map(
        ([english, expected]) =>
          `${english} -> ${archiveTranslations[english] || "(missing)"} (expected ${expected[language]})`
      );
    check(
      "historical source note",
      archiveSourceCopyFailures.length === 0,
      `${language} historical data-source copy drifted from reviewed wording: ${formatSamples(archiveSourceCopyFailures)}`,
      "Preserve the openfootball brand and explain Wikidata kickoff-time synchronization in natural country-language prose."
    );

    const releaseKeys = Object.keys(releaseSource?.translations || {});
    check(
      "lazy release scope",
      releaseKeys.length === releaseStrings.length && sameMembers(releaseKeys, releaseStrings),
      `${language} release source must contain only the visible latest-release strings: ${formatSamples(releaseKeys)}`,
      "Regenerate the release dictionary from the latest title and first three highlights only."
    );

    const archivePayload = getContentModulePayload(archiveModule);
    const moduleVenueMap = archivePayload?.entities?.historicalVenues || {};
    let formattedStory = "";
    try {
      formattedStory =
        archiveModule?.formatHistoricalResultStory?.(stories[0], {
          player: (value) => value,
          stage: (value) => value,
          team: (value) => value
        }) || "";
    } catch (error) {
      formattedStory = `formatter error: ${error.message}`;
    }
    const renderedStoryArtifacts = stories
      .map((story) => {
        try {
          const localized = archiveModule?.formatHistoricalResultStory?.(story, {
            player: (value) => value,
            stage: (value) =>
              appPacks[language]?.helpers?.translateStageLabel?.(value) || value,
            team: (value) =>
              appPacks[language]?.helpers?.translateTeamName?.(value) || value
          });
          return !localized || /\bown goal\b|\.{2,}/iu.test(localized)
            ? `${story} -> ${localized || "(empty)"}`
            : "";
        } catch (error) {
          return `${story} -> formatter error: ${error.message}`;
        }
      })
      .filter(Boolean);
    check(
      "historical result templates",
      renderedStoryArtifacts.length === 0,
      `${language} historical result formatter emitted English own-goal prose, doubled punctuation, or empty copy: ${formatSamples(renderedStoryArtifacts)}`,
      "Render all 2,826 archive bullets through the structured locale formatter before shipping."
    );
    if (language === "es") {
      const historicalLocalizers = {
        player: (value) => value,
        stage: (value) =>
          appPacks.es?.helpers?.translateStageLabel?.(value) || value,
        team: (value) =>
          appPacks.es?.helpers?.translateTeamName?.(value) || value
      };
      const unresolvedTie = archiveModule?.formatHistoricalResultStory?.(
        "The draw left the Quarter-finals tie unresolved after extra time.",
        historicalLocalizers
      );
      const shootoutGrind = archiveModule?.formatHistoricalResultStory?.(
        "The 3-3 grind stayed tense enough to leave the knockout tie to penalties.",
        historicalLocalizers
      );
      check(
        "historical result newsroom copy",
        /cruce de cuartos de final/u.test(unresolvedTie || "") &&
          /^El empate 3-3/u.test(shootoutGrind || ""),
        `Spanish historical tie templates are awkward or incorrectly capitalized: ${formatSamples([
          unresolvedTie,
          shootoutGrind
        ])}`
      );
    }
    const moduleVenueMismatches = expectedVenues
      .filter(
        (venue) =>
          moduleVenueMap[venue] !== venueSource?.venues?.[venue]?.[language]
      )
      .map(
        (venue) =>
          `${venue}: ${moduleVenueMap[venue] || "(missing)"} / ${
            venueSource?.venues?.[venue]?.[language] || "(missing source)"
          }`
      );
    check(
      "structured historical archive",
      typeof archiveModule?.formatHistoricalResultStory === "function" &&
        typeof archivePayload?.formatHistoricalResultStory === "function" &&
        formattedStory &&
        formattedStory !== stories[0] &&
        !formattedStory.startsWith("formatter error:") &&
        Object.keys(moduleVenueMap).length === 208 &&
        moduleVenueMismatches.length === 0,
      `${language} archive module lacks its working result formatter or exact 208-venue entity map: ${formatSamples(
        moduleVenueMismatches.concat(
          formattedStory.startsWith("formatter error:")
            ? [formattedStory]
            : []
        )
      )}`,
      "Generate the archive-only formatter and historicalVenues entity map into the lazy module."
    );

    const probeFailures = Object.entries(REVIEWED_HISTORICAL_VENUE_PROBES)
      .filter(
        ([venue, expected]) =>
          venueSource?.venues?.[venue]?.[language] !== expected[language] ||
          moduleVenueMap[venue] !== expected[language]
      )
      .map(
        ([venue, expected]) =>
          `${venue}: expected ${expected[language]}, found ${
            moduleVenueMap[venue] || "(missing)"
          }`
      );
    check(
      "structured historical venues",
      probeFailures.length === 0,
      `${language} reviewed historical venue probes drifted: ${formatSamples(probeFailures)}`
    );

    const currentTranslations =
      getContentModulePayload(currentContentModules[language])?.translations || {};
    const coachStyleFailures = Object.entries(
      REVIEWED_COACH_STYLE_LABELS[language]
    )
      .filter(([english, expected]) => currentTranslations[english] !== expected)
      .map(
        ([english, expected]) =>
          `${english}: expected ${expected}, found ${
            currentTranslations[english] || "(missing)"
          }`
      );
    check(
      "coach style labels",
      coachStyleFailures.length === 0,
      `${language} reviewed coach-style labels drifted: ${formatSamples(coachStyleFailures)}`,
      "Keep the reviewed football terminology used by the Aguirre, Hong, Pochettino, Tuchel, and Dalić cards."
    );
  }

  const historyRounds = [
    ...new Set(
      historyFixtures
        .map((fixture) => String(fixture?.round || "").trim())
        .filter(Boolean)
    )
  ].sort((left, right) => left.localeCompare(right, "en"));
  check(
    "historical round labels",
    historyRounds.length === 35,
    `expected 35 unique historical round labels, found ${historyRounds.length}: ${formatSamples(historyRounds)}`
  );
  for (const language of NEW_LANGUAGE_CODES) {
    const roundFailures = historyRounds
      .filter((round) => {
        const localized =
          appPacks[language]?.helpers?.translateStageLabel?.(round) || "";
        return (
          !localized ||
          (localized === round && !(language === "es" && round === "Final")) ||
          /^Matchday\b/iu.test(localized)
        );
      })
      .map(
        (round) =>
          `${round} -> ${
            appPacks[language]?.helpers?.translateStageLabel?.(round) ||
            "(missing)"
          }`
      );
    check(
      "historical round labels",
      roundFailures.length === 0,
      `${language} leaves historical round labels in English: ${formatSamples(roundFailures)}`,
      "Route every archive round through translateStageLabel; Spanish may retain the cognate “Final”."
    );
  }

  const reviewedCoachStyles = [
    ...new Set(
      Object.values(data.coachProfiles?.profiles || {}).flatMap(
        (profile) => profile?.styles || []
      )
    )
  ];
  check(
    "coach style labels",
    sameMembers(
      reviewedCoachStyles,
      Object.keys(REVIEWED_COACH_STYLE_LABELS.es)
    ),
    `coach cards now use an unexpected style-label set: ${formatSamples(reviewedCoachStyles)}`
  );

  const profileLookup = new Map();
  for (const [profileKey, profile] of Object.entries(
    data.playerProfiles?.profiles || {}
  )) {
    const teamId = String(profile?.teamId || "").trim().toUpperCase();
    for (const alias of [
      profileKey,
      profile?.name,
      profile?.displayName,
      ...(Array.isArray(profile?.aliases) ? profile.aliases : [])
    ]) {
      const normalized = normalizeProfileLookupName(alias);
      if (teamId && normalized) {
        profileLookup.set(`${teamId}:${normalized}`, profile);
      }
    }
  }
  const keyPlayerOccurrences = (data.fixtures?.fixtures || []).flatMap(
    (fixture) =>
      ["home", "away"].flatMap((side) =>
        (fixture?.keyPlayers?.[side] || []).map((player) => ({
          name:
            typeof player === "string"
              ? player
              : String(player?.name || "").trim(),
          teamId: String(fixture?.[`${side}TeamId`] || "")
            .trim()
            .toUpperCase()
        }))
      )
  );
  const uniqueKeyPlayerNames = new Set(
    keyPlayerOccurrences.map((player) => player.name).filter(Boolean)
  );
  const unresolvedKeyPlayers = keyPlayerOccurrences
    .filter(
      (player) =>
        !profileLookup.has(
          `${player.teamId}:${normalizeProfileLookupName(player.name)}`
        )
    )
    .map((player) => `${player.teamId}:${player.name}`);
  check(
    "current key-player profiles",
    keyPlayerOccurrences.length === 624 &&
      uniqueKeyPlayerNames.size === 146 &&
      unresolvedKeyPlayers.length === 0,
    `resolved ${keyPlayerOccurrences.length - unresolvedKeyPlayers.length}/${keyPlayerOccurrences.length} current key-player occurrences across ${uniqueKeyPlayerNames.size} unique names; expected 624/624 across 146. Misses: ${formatSamples(unresolvedKeyPlayers)}`,
    "Every fixture key player must resolve to the canonical team-scoped player profile used by compact note templates."
  );

  metric(
    "historical structured locale coverage",
    `${stories.length - unparsedStories.length}/${stories.length} result bullets, ${expectedVenues.length} venues, ${historyRounds.length} rounds`
  );
  metric(
    "current key-player profile coverage",
    `${keyPlayerOccurrences.length - unresolvedKeyPlayers.length}/${keyPlayerOccurrences.length} occurrences, ${uniqueKeyPlayerNames.size} unique names`
  );
}

function auditRegistry(runtime) {
  if (!runtime) {
    return;
  }

  const configs = runtime.getSupportedLanguages?.() || [];
  const codes = configs.map((config) => config.code);
  check(
    "registry",
    sameMembers(codes, LANGUAGE_CODES),
    `expected locale codes ${LANGUAGE_CODES.join(", ")}, found ${codes.join(", ") || "(none)"}`,
    "Keep en, zh, es, and ko in the shared locale registry."
  );

  for (const code of LANGUAGE_CODES) {
    const config = runtime.getLanguageConfig?.(code);
    const expected = LANGUAGE_CONTRACT[code];
    check("registry", config?.code === code, `${code} registry entry has code ${config?.code || "(missing)"}`);
    for (const field of ["urlCode", "storageCode", "intlLocale", "htmlLang", "nativeName", "direction"]) {
      check(
        "registry",
        config?.[field] === expected[field],
        `${code}.${field} must be ${expected[field]}, found ${config?.[field] ?? "(missing)"}`
      );
    }
    try {
      new Intl.DateTimeFormat(config?.intlLocale || "").format(new Date("2026-07-15T12:00:00Z"));
      new Intl.Locale(config?.htmlLang || "");
    } catch (error) {
      record("error", "registry", `${code} has an invalid Intl/HTML locale: ${error.message}`);
    }
  }

  const normalizationChecks = {
    en: ["en", "en-US"],
    zh: ["zh", "zh-Hans", "zh_CN"],
    es: ["es", "es-MX", "es_419"],
    ko: ["ko", "ko-KR", "ko_KR"]
  };
  for (const [expected, inputs] of Object.entries(normalizationChecks)) {
    for (const input of inputs) {
      check(
        "registry",
        runtime.normalizeLanguage?.(input) === expected,
        `normalizeLanguage(${JSON.stringify(input)}) must return ${expected}`
      );
    }
  }

  const shell = runtime.SHELL_MESSAGES || {};
  const englishPaths = getShapePaths(shell.en || {});
  for (const code of LANGUAGE_CODES) {
    const paths = getShapePaths(shell[code] || {});
    check(
      "shell UI parity",
      sameMembers(paths, englishPaths),
      `${code} shell keys differ from English. Missing/extra: ${formatSamples(
        englishPaths.filter((path) => !paths.includes(path)).concat(paths.filter((path) => !englishPaths.includes(path)))
      )}`,
      "Add the same shell, ARIA, calendar, search, settings, and Catch Up keys to every locale."
    );
    const languageNames = ["languageEnglish", "languageChinese", "languageSpanish", "languageKorean"];
    for (const key of languageNames) {
      check(
        "shell UI parity",
        typeof shell[code]?.[key] === "string" && shell[code][key].trim(),
        `${code}.${key} is missing`
      );
    }
  }
}

function auditAppPack(language, pack, runtime) {
  const config = runtime?.getLanguageConfig?.(language) || LANGUAGE_CONTRACT[language];
  if (!pack) {
    return;
  }
  const requiredTopLevel = [
    "schemaVersion",
    "language",
    "domain",
    "locale",
    "htmlLang",
    "direction",
    "ui",
    "text",
    "entities",
    "helpers"
  ];
  for (const key of requiredTopLevel) {
    check("app pack schema", key in pack, `${language} app pack is missing ${key}`);
  }
  check("app pack schema", pack.schemaVersion === 1, `${language} app schemaVersion must be 1`);
  check("app pack schema", pack.language === language, `${language} app language metadata is ${pack.language}`);
  check("app pack schema", pack.domain === "app", `${language} app domain metadata is ${pack.domain}`);
  check("app pack schema", pack.locale === config.intlLocale, `${language} app locale must be ${config.intlLocale}`);
  check("app pack schema", pack.htmlLang === config.htmlLang, `${language} app htmlLang must be ${config.htmlLang}`);
  check("app pack schema", pack.direction === "ltr", `${language} app direction must be ltr`);
  check(
    "app pack schema",
    pack.text?.exact && typeof pack.text.exact === "object" && !Array.isArray(pack.text.exact),
    `${language} app text.exact must be an object`
  );
  check(
    "app pack schema",
    Array.isArray(pack.text?.patterns) &&
      pack.text.patterns.every(
        (pattern) =>
          typeof pattern?.id === "string" &&
          pattern.match instanceof RegExp &&
          typeof pattern.replace === "function"
      ),
    `${language} app text.patterns must contain {id, RegExp match, replace} entries`
  );
  const patternIds = (pack.text?.patterns || []).map((pattern) => pattern.id);
  check(
    "app pack schema",
    new Set(patternIds).size === patternIds.length,
    `${language} app pattern ids are not unique`
  );
  for (const key of [
    "teams",
    "teamNames",
    "timeZones",
    "venueNames",
    "venueLocations",
    "stages",
    "lineupPositions",
    "playerPositions",
    "playerSkillLabels",
    "styleTerms"
  ]) {
    check(
      "app pack schema",
      pack.entities?.[key] && typeof pack.entities[key] === "object",
      `${language} app entities.${key} is missing`
    );
  }
  check(
    "app pack schema",
    Object.keys(pack.entities?.teams || {}).length === 48,
    `${language} app teams must cover all 48 current teams, found ${Object.keys(pack.entities?.teams || {}).length}`
  );
  for (const key of [
    "translateText",
    "translateTeamName",
    "translateLineupPosition",
    "formatAppMessage",
    "formatWorldCupShootoutHistory",
    "formatPlayerSkill",
    "formatGroupLabel",
    "formatMatchLabel",
    "formatPlayerNote",
    "isTemplatedPlayerNote"
  ]) {
    check(
      "app pack schema",
      typeof pack.helpers?.[key] === "function",
      `${language} app helpers.${key} must be a function`
    );
  }

  const englishUiPaths = getShapePaths(runtime?.SHELL_MESSAGES?.en || {});
  const appUiPaths = getShapePaths(pack.ui || {});
  check(
    "app UI parity",
    sameMembers(appUiPaths, englishUiPaths),
    `${language} app UI keys differ from the shared shell: ${formatSamples(
      englishUiPaths.filter((path) => !appUiPaths.includes(path)).concat(
        appUiPaths.filter((path) => !englishUiPaths.includes(path))
      )
    )}`
  );

  for (const [surface, probes] of Object.entries(APP_SURFACE_PROBES)) {
    const failures = probes
      .map((probe) => getTranslationProbeFailure(pack, language, probe))
      .filter(Boolean);
    check(
      `surface: ${surface}`,
      failures.length === 0,
      `${language} has ${failures.length} critical translation gap(s): ${formatSamples(failures, 8)}`,
      `Translate the complete ${surface} rendering paths, including generated sentences and accessibility text.`
    );
  }

  const ownGoalLabel = pack.helpers?.formatAppMessage?.(
    "historical-own-goal",
    { name: "Berti Vogts" }
  );
  const benefitedOwnGoal = pack.helpers?.formatAppMessage?.(
    "historical-benefited-own-goal",
    { name: ownGoalLabel }
  );
  const ownGoalContractIsNatural =
    language === "es"
      ? /se benefició de un autogol de Berti Vogts/u.test(
          benefitedOwnGoal || ""
        )
      : /Berti Vogts의 자책골로 득점/u.test(benefitedOwnGoal || "");
  check(
    "historical own-goal copy",
    ownGoalContractIsNatural,
    `${language} nested historical own-goal copy is ungrammatical: ${benefitedOwnGoal || "(empty)"}`
  );

  if (language === "es") {
    const groupWin = pack.helpers?.formatAppMessage?.("catch-up-result", {
      context: "Group I",
      scoreText: "2-0",
      variant: "group-win-body",
      winner: "France"
    });
    const groupDraw = pack.helpers?.formatAppMessage?.("catch-up-result", {
      context: "Group I",
      scoreText: "1-1",
      variant: "split-points-body"
    });
    const groupDrawImpact = pack.helpers?.formatAppMessage?.(
      "catch-up-highlight",
      {
        context: "Group I",
        variant: "draw-level-impact"
      }
    );
    check(
      "Catch Up generated copy",
      /tres puntos en el Grupo I/u.test(groupWin || "") &&
        /mantiene abierto el Grupo I/u.test(groupDraw || "") &&
        /un punto en el Grupo I/u.test(groupDrawImpact || ""),
      `Spanish generated group recap copy is not newsroom-quality: ${formatSamples([
        groupWin,
        groupDraw,
        groupDrawImpact
      ])}`
    );

    const shootoutEdge = pack.helpers?.formatWorldCupShootoutHistory?.(
      "edge",
      {
        edgeType: "history",
        leanAppearances: 4,
        leanName: "Spain",
        leanWins: 2,
        otherAppearances: 3,
        otherName: "France",
        otherWins: 1
      }
    );
    check(
      "shootout history copy",
      /frente a 1 victoria en 3 tandas mundialistas de Francia/u.test(
        shootoutEdge || ""
      ),
      `Spanish shootout-history comparison is ungrammatical: ${shootoutEdge || "(empty)"}`
    );
    check(
      "Spanish navigation terminology",
      pack.ui?.tournament === "Fase eliminatoria" &&
        pack.helpers?.translateText?.("Tournament") === "Fase eliminatoria" &&
        pack.helpers
          ?.translateText?.(
            "Direct target play and committed box defending"
          )
          ?.includes("defensa firme del área"),
      "Spanish knockout navigation or team-style wording drifted from the reviewed es-419 terminology"
    );
  }

  const exactEntries = Object.entries(pack.text?.exact || {});
  const suspicious = exactEntries
    .filter(([, value]) => hasSuspiciousPlaceholder(value))
    .map(([source, value]) => `${source} -> ${value}`);
  check(
    "app dictionary quality",
    suspicious.length === 0,
    `${language} app dictionary has suspicious placeholders: ${formatSamples(suspicious)}`
  );
  const unchangedLong = exactEntries
    .filter(([source, value]) => source === value && source.length >= 18)
    .map(([source]) => source);
  check(
    "app dictionary quality",
    unchangedLong.length === 0,
    `${language} app dictionary leaves long English strings unchanged: ${formatSamples(unchangedLong)}`,
    "Keep unchanged values only for true proper names, codes, or identical words."
  );
}

function auditPlayerNoteTemplates(
  language,
  pack,
  playerProfiles,
  historicalPlayerProfiles,
  playerNames,
  requiredSourceSets,
  appSource
) {
  if (!pack) {
    return;
  }

  const additionalTraitParserProbes = [
    {
      structure: "paired-observation",
      note: "Tester's signature is creating a clean shot before the defense can reset. Watch how he meets the pass without adding an extra touch. In a separate phase, he moves after releasing the ball so the receiver still has support."
    },
    {
      structure: "two-clues",
      note: "Watch Tester for creating a clean shot before the defense can reset. The clearest example is how he meets the pass without adding an extra touch. Away from that phase, Tester moves after releasing the ball so the receiver still has support."
    },
    {
      structure: "second-detail",
      note: "Tester stands out for creating a clean shot before the defense can reset. He meets the pass without adding an extra touch. A different detail is how Tester moves after releasing the ball so the receiver still has support."
    },
    {
      structure: "separating-clue",
      note: "What separates Tester is creating a clean shot before the defense can reset. Tester meets the pass without adding an extra touch. In another phase, he moves after releasing the ball so the receiver still has support."
    },
    {
      structure: "foundation-watch",
      note: "For Tester, the foundation is creating a clean shot before the defense can reset. Look first at how he meets the pass without adding an extra touch. In another phase, watch how he moves after releasing the ball so the receiver still has support."
    },
    {
      structure: "different-phase",
      note: "The key to Tester is creating a clean shot before the defense can reset. He meets the pass without adding an extra touch. In a different phase, he moves after releasing the ball so the receiver still has support."
    }
  ];
  const additionalTraitParserFailures = additionalTraitParserProbes
    .map(({ structure, note }) => {
      const parsed = parseGeneratedPlayerStyleNote(note);
      return parsed?.structure === structure &&
        parsed?.qualityId === "clean-shot" &&
        parsed?.actionIds?.[0] === "first-time-finish" &&
        parsed?.actionIds?.[1] === "move-after-release"
        ? ""
        : `${structure}: ${parsed ? JSON.stringify(parsed) : "unparseable"}`;
    })
    .filter(Boolean);
  check(
    "player-note English parser",
    additionalTraitParserFailures.length === 0,
    `additional-trait English shells are not round-trippable: ${formatSamples(additionalTraitParserFailures)}`,
    "Keep every reviewed English sentence shell aligned with the shared semantic parser."
  );

  const historicalSemanticMap = language === "es"
    ? ES_HISTORICAL_PLAYER_NOTE_SEMANTICS
    : KO_HISTORICAL_PLAYER_NOTE_SEMANTICS;
  const historicalSemanticKeys = new Set(Object.keys(historicalSemanticMap));
  const missingHistoricalSemantics = [...HISTORICAL_STYLE_SEMANTIC_IDS]
    .filter((id) => !historicalSemanticKeys.has(id));
  const extraHistoricalSemantics = [...historicalSemanticKeys]
    .filter((id) => !HISTORICAL_STYLE_SEMANTIC_IDS.has(id));
  const invalidHistoricalSemantics = Object.entries(historicalSemanticMap)
    .filter(([id, value]) => {
      const text = String(value || "").trim();
      if (!text || /[.!?…。！？]$/u.test(text) || hasSuspiciousPlaceholder(text)) return true;
      return language === "es"
        ? !/[a-záéíóúñ]/iu.test(text) ||
            text.toLocaleLowerCase("es-419") ===
              String(HISTORICAL_STYLE_SEMANTIC_BY_ID.get(id)?.en || "").toLocaleLowerCase("en-US")
        : !/\p{Script=Hangul}/u.test(text);
    })
    .map(([id]) => id);
  check(
    "player-note semantic registry",
    HISTORICAL_STYLE_SEMANTIC_ENTRIES.length === HISTORICAL_STYLE_SEMANTIC_IDS.size,
    `historical player-note generator has duplicate semantic IDs (${HISTORICAL_STYLE_SEMANTIC_ENTRIES.length} entries, ${HISTORICAL_STYLE_SEMANTIC_IDS.size} unique)`
  );
  check(
    "player-note semantic registry",
    missingHistoricalSemantics.length === 0 &&
      extraHistoricalSemantics.length === 0 &&
      invalidHistoricalSemantics.length === 0,
    `${language} historical semantic registry drift: missing ${formatSamples(missingHistoricalSemantics)}, extra ${formatSamples(extraHistoricalSemantics)}, invalid ${formatSamples(invalidHistoricalSemantics)}`,
    "Every generated historical semantic ID needs one reviewed, punctuation-free locale rendering."
  );

  const currentProfiles = Object.values(playerProfiles?.profiles || {});
  const historicalProfiles = Object.values(historicalPlayerProfiles?.profiles || {});
  const historicalGeneratedProfiles = historicalProfiles.filter(
    (profile) => profile.styleNoteMeta?.origin === "generated"
  );
  const historicalAuthoredProfiles = historicalProfiles.filter(
    (profile) => profile.styleNoteMeta?.origin === "authored"
  );
  const currentTemplated = currentProfiles.filter((profile) =>
    isGeneratedPlayerCardCopy(profile.note, {
      copyMeta: profile.noteMeta,
      localizedName: profile.displayName || profile.name
    })
  );
  const historicalStyleTemplated = historicalGeneratedProfiles.filter((profile) =>
    isGeneratedPlayerCardCopy(profile.styleNote, {
      historical: true,
      copyMeta: profile.styleNoteMeta,
      localizedName: profile.displayName || profile.name
    })
  );
  const historicalGeneratedMisses = historicalGeneratedProfiles.filter(
    (profile) => !historicalStyleTemplated.includes(profile)
  );
  const historicalAuthoredOverlayMisses = historicalAuthoredProfiles.filter(
    (profile) => !requiredSourceSets.archive.has(profile.styleNote)
  );
  const historicalNoteMisses = historicalProfiles.filter(
    (profile) => !parseGeneratedHistoricalPlayerNote(profile.note)
  );
  const historicalSummaryMisses = historicalProfiles.filter(
    (profile) => !parseGeneratedHistoricalPlayerSummary(profile.summary)
  );

  check(
    "player-note templates",
    currentTemplated.length >= currentProfiles.length * 0.95,
    `${language} recognizes only ${currentTemplated.length}/${currentProfiles.length} generated current player notes`,
    "Add new generator fragments to the shared semantic player-note contract before shipping them."
  );
  check(
    "player-note templates",
    historicalGeneratedMisses.length === 0,
    `${language} cannot recognize generated historical style notes: ${formatSamples(
      historicalGeneratedMisses.map((profile) => profile.profileKey)
    )}`,
    "Every profile marked as generated must remain on the shared semantic template path."
  );
  check(
    "player-note authored overlays",
    historicalAuthoredOverlayMisses.length === 0,
    `${language} authored historical notes are missing from the archive overlay path: ${formatSamples(
      historicalAuthoredOverlayMisses.map((profile) => profile.profileKey)
    )}`,
    "Route every authored historical portrait through an exact reviewed locale overlay."
  );
  check(
    "player-note templates",
    historicalNoteMisses.length === 0 && historicalSummaryMisses.length === 0,
    `${language} cannot parse generated historical notes/summaries: ${formatSamples(
      historicalNoteMisses
        .map((profile) => `${profile.profileKey} note`)
        .concat(historicalSummaryMisses.map((profile) => `${profile.profileKey} summary`))
    )}`
  );

  const ronaldo1998 = historicalProfiles.find(
    (profile) => profile.profileKey === "Ronaldo / Brazil / 1998"
  );
  const ronaldoLocalizedName = ronaldo1998
    ? playerNames?.archive?.[ronaldo1998.name] ||
      playerNames?.archive?.[ronaldo1998.displayName] ||
      ronaldo1998.displayName ||
      ronaldo1998.name
    : "";
  const ronaldoLocalizedStyle = ronaldo1998
    ? pack.helpers.formatPlayerNote(ronaldo1998.styleNote, {
        historical: true,
        localizedName: ronaldoLocalizedName,
        copyMeta: ronaldo1998.styleNoteMeta
      })
    : "";
  const ronaldoExpectedAction = language === "es"
    ? "se acerca al balón para recibir al pie antes de atacar el espacio a la espalda de la defensa"
    : "공 쪽으로 내려와 발밑에 받은 뒤 수비 뒷공간을 공략한다";
  check(
    "player-note historical semantic regression",
    ronaldo1998?.styleNoteMeta?.actions?.includes("fw-check-to-feet") &&
      ronaldoLocalizedStyle.toLocaleLowerCase(language === "es" ? "es-419" : "ko-KR")
        .includes(ronaldoExpectedAction),
    `${language} Ronaldo 1998 lost the reviewed receive-to-feet action: ${ronaldoLocalizedStyle || "(empty)"}`,
    "Keep fw-check-to-feet registered in every historical player-note locale."
  );

  const currentNames = playerNames?.current || {};
  const archiveNames = playerNames?.archive || {};
  const renderFailures = [];
  const newsroomArtifacts = [];
  const historicalLocaleGlueArtifacts = [];
  const renderSamples = [
    ...currentTemplated.map((profile) => ({
      historical: false,
      localizedName:
        currentNames[profile.name] ||
        currentNames[profile.displayName] ||
        profile.displayName ||
        profile.name,
      owner: profile.name,
      source: profile.note,
      copyMeta: profile.noteMeta
    })),
    ...historicalStyleTemplated.map((profile) => ({
      historical: true,
      localizedName:
        archiveNames[profile.name] ||
        archiveNames[profile.displayName] ||
        profile.displayName ||
        profile.name,
      owner: profile.profileKey,
      source: profile.styleNote,
      copyMeta: profile.styleNoteMeta
    })),
    ...historicalProfiles.map((profile) => ({
      historical: true,
      localizedName:
        archiveNames[profile.name] ||
        archiveNames[profile.displayName] ||
        profile.displayName ||
        profile.name,
      owner: `${profile.profileKey} note`,
      source: profile.note,
      copyMeta: null
    }))
  ];

  for (const sample of renderSamples) {
    const packRecognizes = pack.helpers.isTemplatedPlayerNote(sample.source, {
      historical: sample.historical,
      localizedName: sample.localizedName,
      copyMeta: sample.copyMeta
    });
    const localized = pack.helpers.formatPlayerNote(sample.source, {
      historical: sample.historical,
      localizedName: sample.localizedName,
      copyMeta: sample.copyMeta
    });
    const hasExpectedScript =
      language === "es" ? /[áéíóúñ]|\b(?:el|la|los|las|de|del|en|con|por|para|y)\b/iu.test(localized) : /\p{Script=Hangul}/u.test(localized);
    if (
      !packRecognizes ||
      !localized ||
      !hasExpectedScript ||
      hasSuspiciousPlaceholder(localized)
    ) {
      renderFailures.push(
        `${sample.owner}: recognized=${packRecognizes}, output=${localized || "(empty)"}`
      );
      if (renderFailures.length >= 30) {
        break;
      }
    }
    if (
      language === "es" &&
      /descarga de presión|esperarlo debajo|presión pueda cerrarse/iu.test(
        localized
      )
    ) {
      newsroomArtifacts.push(`${sample.owner}: ${localized}`);
    }
    if (sample.historical && sample.copyMeta?.origin === "generated") {
      if (language === "es") {
        const normalizedLocalized = localized.toLocaleLowerCase("es-419");
        const wrapsTemporalAction = (sample.copyMeta.actions || []).some((id) => {
          const action = String(historicalSemanticMap[id] || "")
            .trim()
            .toLocaleLowerCase("es-419");
          return /\bcuando\b/iu.test(action) && normalizedLocalized.includes(`cuando ${action}`);
        });
        if (/Una tarea de .+ es que /iu.test(localized) || wrapsTemporalAction) {
          historicalLocaleGlueArtifacts.push(`${sample.owner}: ${localized}`);
        }
        if (/\bDespués,\s+[^.]{0,48}\bdespués\b/iu.test(localized)) {
          historicalLocaleGlueArtifacts.push(`${sample.owner}: ${localized}`);
        }
      } else if (
        /(?:한 가지 일은|또 다른 일은|하나는|다른 하나는|한 가지 단서는|다른 단서는)[^.]*다\./u.test(localized)
        || /다른 장면에서는 별도로/u.test(localized)
      ) {
        historicalLocaleGlueArtifacts.push(`${sample.owner}: ${localized}`);
      }
    }
  }
  check(
    "player-note templates",
    renderFailures.length === 0,
    `${language} deterministic player-note rendering failed: ${formatSamples(renderFailures)}`,
    "Every recognized semantic fragment must have reviewed country-language copy."
  );
  check(
    "player-note semantics",
    newsroomArtifacts.length === 0,
    `${language} player notes contain repeated Spanish calques: ${formatSamples(newsroomArtifacts)}`,
    "Keep reusable goalkeeper actions in natural broadcast Spanish so every card benefits from one reviewed fix."
  );
  check(
    "player-note historical locale grammar",
    historicalLocaleGlueArtifacts.length === 0,
    `${language} historical player notes contain broken template-to-action joins: ${formatSamples(historicalLocaleGlueArtifacts)}`,
    "Join already-finite localized actions as direct sentences instead of nesting them under clue, task, or temporal noun frames."
  );

  const metadataProbe = currentProfiles.find(
    (profile) => profile.noteMeta?.origin === "generated"
  );
  if (metadataProbe) {
    const metadataLocalizedName =
      currentNames[metadataProbe.name] ||
      currentNames[metadataProbe.displayName] ||
      metadataProbe.displayName ||
      metadataProbe.name;
    const metadataRendered = pack.helpers.formatPlayerNote(
      "Deliberately unparsable English copy used to verify the metadata route.",
      {
        localizedName: metadataLocalizedName,
        copyMeta: metadataProbe.noteMeta
      }
    );
    check(
      "player-note metadata",
      Boolean(metadataRendered) && !/Deliberately unparsable/iu.test(metadataRendered),
      `${language} cannot render player-card semantics from noteMeta when English grammar changes`
    );
  }

  const currentSemanticProbeFailures = CURRENT_PLAYER_NOTE_SEMANTIC_PROBES
    .map((probe) => {
      const rendered = pack.helpers.formatPlayerNote(
        "Deliberately unparsable semantic registry probe.",
        {
          localizedName: language === "ko" ? "테스트 골키퍼" : "Portero de prueba",
          copyMeta: {
            origin: "generated",
            structureId: "second-detail",
            signatureId: probe.signatureId,
            actionIds: probe.actionIds
          }
        }
      );
      const normalized = language === "es"
        ? rendered.toLocaleLowerCase("es-419")
        : rendered;
      const missing = probe.expected[language].filter(
        (fragment) => !normalized.includes(language === "es" ? fragment.toLocaleLowerCase("es-419") : fragment)
      );
      return missing.length ? `${probe.signatureId}: missing ${missing.join(", ")}` : "";
    })
    .filter(Boolean);
  check(
    "player-note semantic registry",
    currentSemanticProbeFailures.length === 0,
    `${language} current semantic registry probes failed: ${formatSamples(currentSemanticProbeFailures)}`,
    "Every current player-note semantic ID needs one reviewed locale rendering."
  );

  const mixedFallbackRegressionCases = [
    { name: "Virgil van Dijk", roleGroup: "defender" },
    { name: "Alex Freeman", roleGroup: "defender" },
    { name: "Amine Sbai", roleGroup: "forward" },
    { name: "Florian Wiegele", roleGroup: "goalkeeper" },
    { name: "Ardon Jashari", roleGroup: "midfielder" }
  ];
  const mixedFallbackCases = mixedFallbackRegressionCases.map(({ name }) =>
    currentProfiles.find(
      (profile) => profile.name === name || profile.displayName === name
    )
  );
  const mixedFallbackFailures = mixedFallbackCases
    .map((profile, index) => {
      const expected = mixedFallbackRegressionCases[index];
      const owner = `${expected.name} (${expected.roleGroup})`;
      if (!profile) return `${owner}: no role-fallback representative`;
      const metadata = profile.noteMeta;
      if (
        metadata?.roleGroup !== expected.roleGroup ||
        metadata?.beatSources?.[1]?.kind !== "role-fallback"
      ) {
        return `${owner}: supporting beat is not disclosed as role-fallback`;
      }
      const localizedName =
        currentNames[profile.name] ||
        currentNames[profile.displayName] ||
        profile.displayName ||
        profile.name;
      const rendered = pack.helpers.formatPlayerNote(profile.note, {
        localizedName,
        copyMeta: metadata
      });
      const normalized = language === "es"
        ? rendered.toLocaleLowerCase("es-419")
        : rendered;
      const observationMarker = language === "es"
        ? /\bsi\b/iu
        : /(?:하는지|두는지|키는지|꾸는지|가는지|이는지|는지|르는지|리는지|여는지|내는지|오는지|서는지)/u;
      const deprecatedRoleFormula = language === "es"
        ? /responsabilidad propia de un/iu
        : /역할의 책임으로/u;
      return rendered && observationMarker.test(normalized) && !deprecatedRoleFormula.test(normalized)
        ? ""
        : `${profile.name}: missing an observational uncertainty bridge (${rendered || "empty"})`;
    })
    .filter(Boolean);
  check(
    "player-note mixed fallback honesty",
    mixedFallbackFailures.length === 0,
    `${language} presents role-fallback support as another personal strength: ${formatSamples(mixedFallbackFailures)}`,
    "Keep the sourced headline action personal, then frame the supporting fallback as something to watch rather than another established trait."
  );

  const additionalTraitProfiles = currentTemplated.filter(
    (profile) => profile.noteMeta?.supportRelation === "additional-trait"
  );
  const reinforcingBridgePattern = language === "es"
    ? /(?:vuelve a aparecer|otra lo confirma|esa misma lectura|dos acciones lo explican|se reconoce tanto|se ve cuando.+también cuando)/iu
    : /(?:두 장면이 이를 보여준다|같은 장점이 반복된다|같은 판단은 다음 동작|두 동작이 핵심이다|플레이를 보면 흐름이 선명하다)/u;
  const additiveBridgePattern = language === "es"
    ? /(?:por separado|además|otro detalle|fuera de esa|en otro momento|en otra faceta|una pista distinta|también (?:conviene|merece|hay que)|más allá|fase distinta|también |otro aspecto|conviene observar además|detalle diferente|fase aparte|hay que notar|en otra fase|otra fase del juego|en una faceta aparte|detalle aparte|otro punto|otra parte de su juego|otro tramo|hay otro detalle|ampliar la lectura|otra pregunta|después queda otra pregunta|completar la imagen|lo siguiente es observar|hay dos preguntas|la primera es si|la segunda es si)/iu
    : /(?:이와 별도로|또 |다른 장면에서는|이와 다른 장면에서는|경기의 다른 대목에서는|한편|별개의 장면에서는|여기에|그 예와는 별개로|국면이 바뀌면|다른 측면에서는|다른 세부 장면에서는|별개의 국면에서는|그 동작과 별개로|또 다른 순간에는|또한|경기의 다른 국면에서는|별도의 장면에서는|별도의 국면에서는|그 밖에도|별도로 보면|다른 지점에서는|다른 국면에서는|이와는 다른 상황에서|더 넓게 보려면|별개로|다음에는|더 넓은 그림|다음으로)/u;
  const additionalTraitBridgeFailures = additionalTraitProfiles
    .map((profile) => {
      const localizedName =
        currentNames[profile.name] ||
        currentNames[profile.displayName] ||
        profile.displayName ||
        profile.name;
      const rendered = pack.helpers.formatPlayerNote(profile.note, {
        localizedName,
        copyMeta: profile.noteMeta
      });
      return !rendered ||
        reinforcingBridgePattern.test(rendered) ||
        !additiveBridgePattern.test(rendered)
        ? `${profile.name}: ${rendered || "empty"}`
        : "";
    })
    .filter(Boolean);
  check(
    "player-note additional-trait honesty",
    additionalTraitProfiles.length > 0 && additionalTraitBridgeFailures.length === 0,
    `${language} makes an additional trait sound like proof of the headline quality: ${formatSamples(additionalTraitBridgeFailures)}`,
    "Use an additive or phase pivot for action two; reserve reinforcing bridges for explicitly reinforcing evidence."
  );

  const mechanicalLocalePattern = language === "es"
    ? /(?:\bcuando\b[^.?!]{0,120}\bcuando\b|fijarse en cómo fija|\bconviene\b[^.?!]{0,120}\btambién conviene\b|\bmirar\b[^.?!]{0,120}\bmirar\b|responsabilidad propia de un)/iu
    : /(?:그 장면을 벗어나면|첫 동작을 벗어나면|먼저[^.。!?]{0,120}먼저|첫 번째로 첫|역할의 책임으로)/u;
  const mechanicalLocaleFailures = additionalTraitProfiles
    .map((profile) => {
      const localizedName =
        currentNames[profile.name] ||
        currentNames[profile.displayName] ||
        profile.displayName ||
        profile.name;
      const rendered = pack.helpers.formatPlayerNote(profile.note, {
        localizedName,
        copyMeta: profile.noteMeta
      });
      return mechanicalLocalePattern.test(rendered)
        ? `${profile.name}: ${rendered}`
        : "";
    })
    .filter(Boolean);
  check(
    "player-note natural cadence",
    mechanicalLocaleFailures.length === 0,
    `${language} current player notes retain mechanical or colliding transitions: ${formatSamples(mechanicalLocaleFailures)}`,
    "Keep additive pivots independent, avoid repeated framing verbs, and render fallback evidence as a viewing question."
  );

  const structureRenderings = GENERATED_PLAYER_NOTE_STRUCTURE_IDS.map((structureId) => ({
    structureId,
    rendered: pack.helpers.formatPlayerNote(
      "Deliberately unparsable structure cadence probe.",
      {
        localizedName: language === "ko" ? "테스트 선수" : "Jugador de prueba",
        copyMeta: {
          origin: "generated",
          structureId,
          roleGroup: "player",
          signatureId: "clean-shot",
          actionIds: ["moving-finish", "draw-and-release"]
        }
      }
    )
  }));
  const structureRenderingOwners = new Map();
  for (const { structureId, rendered } of structureRenderings) {
    const normalized = String(rendered || "").replace(/\s+/gu, " ").trim();
    const owners = structureRenderingOwners.get(normalized) || [];
    owners.push(structureId);
    structureRenderingOwners.set(normalized, owners);
  }
  const collapsedStructures = [...structureRenderingOwners.entries()]
    .filter(([rendered, owners]) => !rendered || owners.length > 1)
    .map(([rendered, owners]) => `${owners.join("+")}: ${rendered || "(empty)"}`);
  check(
    "player-note cadence",
    collapsedStructures.length === 0 &&
      structureRenderingOwners.size === GENERATED_PLAYER_NOTE_STRUCTURE_IDS.length,
    `${language} collapses source player-note structures into shared locale frames: ${formatSamples(collapsedStructures)}`,
    "Give every source structure its own natural cadence while preserving the semantic signature and action IDs."
  );

  const currentAdditionalCadenceStructures = [
    "paired-observation",
    "two-clues",
    "second-detail",
    "separating-clue",
    "foundation-watch",
    "different-phase"
  ];
  const localizedAdditionalCadenceFrames = currentAdditionalCadenceStructures.flatMap(
    (structureId) => Array.from({ length: 5 }, (_, cadenceVariantIndex) => {
      const rendered = pack.helpers.formatPlayerNote(
        "Deliberately unparsable localized cadence probe.",
        {
          localizedName: language === "ko" ? "테스트 선수" : "Jugador de prueba",
          copyMeta: {
            origin: "generated",
            structureId,
            roleGroup: "player",
            signatureId: "clean-shot",
            actionIds: ["moving-finish", "draw-and-release"],
            supportRelation: "additional-trait",
            fallbackFraming: "none",
            cadenceVariantId: `${structureId}-${cadenceVariantIndex}`,
            cadenceVariantIndex
          }
        }
      );
      const sentences = String(rendered || "")
        .split(/(?<=[.!?。！？])\s+/u)
        .map((sentence) => sentence.replace(/\s+/gu, " ").trim())
        .filter(Boolean);
      return {
        owner: `${structureId}:${cadenceVariantIndex}`,
        frame: sentences.at(-1) || ""
      };
    })
  );
  const localizedAdditionalCadenceCounts = new Map();
  for (const { frame } of localizedAdditionalCadenceFrames) {
    localizedAdditionalCadenceCounts.set(
      frame,
      (localizedAdditionalCadenceCounts.get(frame) || 0) + 1
    );
  }
  const largestLocalizedAdditionalCadence = Math.max(
    0,
    ...localizedAdditionalCadenceCounts.values()
  );
  check(
    "player-note localized cadence",
    localizedAdditionalCadenceCounts.size >= 24 && largestLocalizedAdditionalCadence <= 3,
    `${language} collapses the 30 current additional-trait cadences into `
      + `${localizedAdditionalCadenceCounts.size} third-sentence frames; largest group `
      + `${largestLocalizedAdditionalCadence}: ${formatSamples(
        localizedAdditionalCadenceFrames
          .filter(({ frame }) => (localizedAdditionalCadenceCounts.get(frame) || 0) === largestLocalizedAdditionalCadence)
          .map(({ owner, frame }) => `${owner}: ${frame || "(empty)"}`)
      )}`,
    "Keep at least four idiomatic localized third beats per source structure and prevent any one frame from exceeding ten percent of the 30 probes."
  );

  const roleGuideRendering = structureRenderings.find(
    ({ structureId }) => structureId === "role-guide"
  )?.rendered || "";
  const standoutClaimPattern = language === "es"
    ? /\b(?:sello|gran virtud|se distingue|destaca|clave del juego)\b/iu
    : /(?:대표적인 강점|차별점|플레이의 중심|가장 잘 보여주는 특징|플레이의 핵심|돋보이는 강점)/u;
  const roleGuideIsObservational = language === "es"
    ? /hay dos preguntas.+la primera es si.+la segunda es si/isu.test(roleGuideRendering)
    : /두 가지를 물으면 된다.+를 본다.+를 본다/su.test(roleGuideRendering);
  check(
    "player-note role guide",
    Boolean(roleGuideRendering) &&
      roleGuideIsObservational &&
      !standoutClaimPattern.test(roleGuideRendering),
    `${language} role-guide copy either loses its viewing questions or turns zero-source guidance into a standout claim: ${roleGuideRendering || "(empty)"}`,
    "Use two explicit viewing questions without promoting role-level actions into signature strengths."
  );

  const historicalRoleLevelProfiles = historicalStyleTemplated.filter(
    (profile) => profile.styleNoteMeta?.confidence === "role-level"
  );
  const historicalRoleLevelStructures = [...new Set(
    historicalRoleLevelProfiles.map((profile) => profile.styleNoteMeta.structureId)
  )].sort();
  const historicalRoleLevelRenderings = historicalRoleLevelStructures.map((structureId) => ({
    structureId,
    rendered: pack.helpers.formatPlayerNote(
      "Deliberately unparsable historical role-level cadence probe.",
      {
        historical: true,
        localizedName: language === "ko" ? "역할 테스트" : "Prueba de función",
        copyMeta: {
          origin: "generated",
          confidence: "role-level",
          role: "goalkeeper",
          structureId,
          signature: "gk-patience",
          actions: ["gk-safe-restart", "gk-through-ball"]
        }
      }
    )
  }));
  const historicalRoleLevelCadences = new Map();
  for (const { structureId, rendered } of historicalRoleLevelRenderings) {
    const normalized = String(rendered || "").replace(/\s+/gu, " ").trim();
    const owners = historicalRoleLevelCadences.get(normalized) || [];
    owners.push(structureId);
    historicalRoleLevelCadences.set(normalized, owners);
  }
  const historicalRoleLevelCollapsed = [...historicalRoleLevelCadences.entries()]
    .filter(([rendered, owners]) => !rendered || owners.length > 1)
    .map(([rendered, owners]) => `${owners.join("+")}: ${rendered || "(empty)"}`);
  const historicalRoleLevelClaimLeaks = historicalRoleLevelProfiles
    .map((profile) => ({
      owner: profile.profileKey,
      rendered: pack.helpers.formatPlayerNote(profile.styleNote, {
        historical: true,
        localizedName:
          archiveNames[profile.name] ||
          archiveNames[profile.displayName] ||
          profile.displayName ||
          profile.name,
        copyMeta: profile.styleNoteMeta
      })
    }))
    .filter(({ rendered }) => standoutClaimPattern.test(rendered))
    .map(({ owner, rendered }) => `${owner}: ${rendered}`);
  check(
    "player-note role-level honesty",
    historicalRoleLevelProfiles.length > 0 &&
      historicalRoleLevelCollapsed.length === 0 &&
      historicalRoleLevelCadences.size === historicalRoleLevelStructures.length &&
      historicalRoleLevelClaimLeaks.length === 0,
    `${language} historical role-level notes collapse cadence or claim a player-specific edge: collapsed ${formatSamples(historicalRoleLevelCollapsed)}, claims ${formatSamples(historicalRoleLevelClaimLeaks)}`,
    "Use the supplied localized role and retain varied duty-led frames without claiming inferred role actions are a signature strength."
  );

  const currentOverlayLeaks = currentTemplated
    .filter((profile) => requiredSourceSets.current.has(profile.note))
    .map((profile) => profile.name);
  const archiveOverlayLeaks = historicalStyleTemplated
    .filter(
      (profile) =>
        requiredSourceSets.archive.has(profile.styleNote) ||
        requiredSourceSets.archive.has(profile.note)
    )
    .map((profile) => profile.profileKey);
  check(
    "player-note payload",
    currentOverlayLeaks.length === 0 && archiveOverlayLeaks.length === 0,
    `${language} still ships templated player notes in content overlays: ${formatSamples(
      currentOverlayLeaks.concat(archiveOverlayLeaks)
    )}`,
    "Ship reusable semantic fragments once in the locale pack, not thousands of full-note translations."
  );

  const barcenas = currentProfiles.find((profile) => profile.displayName === "Yoel Bárcenas");
  const barcenasLocalized = pack.helpers.formatPlayerNote(barcenas?.note, {
    localizedName: language === "ko" ? "에드가르 요엘 바르세나스" : "Yoel Bárcenas"
  });
  const expectedBarcenas =
    language === "ko"
      ? ["수비수 한 명을 끌어낸 뒤 그 뒤로 뛰는 동료에게 연결한다", "크로스의 높이와 속도를 조절한다"]
      : ["atrae a un defensor y libera al compañero que rompe a su espalda", "varía la altura y la velocidad de sus centros"];
  const normalizedBarcenasLocalized = language === "es"
    ? barcenasLocalized.toLocaleLowerCase("es-419")
    : barcenasLocalized;
  check(
    "player-note semantics",
    expectedBarcenas.every((fragment) => normalizedBarcenasLocalized.includes(fragment)),
    `${language} Bárcenas creation/delivery note is not newsroom-quality: ${barcenasLocalized || "(empty)"}`
  );

  check(
    "player-note runtime",
    /helpers\?\.formatPlayerNote\?\./u.test(appSource || "") &&
      /helpers\?\.isTemplatedPlayerNote\?\./u.test(appSource || "") &&
      /copyMeta/u.test(appSource || ""),
    "app.js does not route player-card prose through the deterministic locale formatter"
  );

  metric(
    `${language} player-note templates`,
    `${currentTemplated.length}/${currentProfiles.length} current; `
      + `${historicalStyleTemplated.length}/${historicalGeneratedProfiles.length} generated historical; `
      + `${historicalAuthoredProfiles.length - historicalAuthoredOverlayMisses.length}/${historicalAuthoredProfiles.length} authored overlays`
  );
}

function auditPlayerSkillTemplates(
  language,
  pack,
  playerProfiles,
  historicalPlayerProfiles,
  teams,
  requiredSourceSets,
  currentContentModule,
  appSource
) {
  if (!pack) {
    return;
  }

  const currentProfiles = Object.values(playerProfiles?.profiles || {});
  const historicalProfiles = Object.values(historicalPlayerProfiles?.profiles || {});
  const currentRows = currentProfiles.flatMap((profile) =>
    (profile?.skills || []).map((source) => ({
      owner: profile.displayName || profile.name || profile.profileKey,
      source
    }))
  );
  const historicalRows = historicalProfiles.flatMap((profile) =>
    (profile?.skills || []).map((source) => ({
      owner: profile.displayName || profile.name || profile.profileKey,
      source
    }))
  );
  const renderRows = (rows) =>
    rows.map((row) => ({
      ...row,
      category: getPlayerSkillCategory(row.source),
      localized: pack.helpers.formatPlayerSkill(row.source)
    }));
  const currentRendered = renderRows(currentRows);
  const historicalRendered = renderRows(historicalRows);
  const genericCurrent = currentRendered
    .filter((row) => row.category === "player-strength")
    .map((row) => `${row.owner}: ${row.source}`);
  check(
    "player-skill templates",
    genericCurrent.length === 0,
    `${language} current player skills fell back to the generic category: ${formatSamples(genericCurrent)}`,
    "Classify every current source skill into a reviewed football concept before shipping."
  );

  const labelValues = new Set(Object.values(pack.entities?.playerSkillLabels || {}));
  const renderFailures = [...currentRendered, ...historicalRendered]
    .filter(({ source, localized }) => {
      if (!localized || localized === source || !labelValues.has(localized)) {
        return true;
      }
      if (language === "ko") {
        return !/\p{Script=Hangul}/u.test(localized);
      }
      return /\b(?:claiming|delivery|defending|finishing|goalkeeper|midfield|player|pressing|strength)\b/iu.test(
        localized
      );
    })
    .map(
      ({ owner, source, category, localized }) =>
        `${owner}: ${source} -> ${category} -> ${localized || "(empty)"}`
    );
  check(
    "player-skill templates",
    renderFailures.length === 0,
    `${language} player-skill rendering has English, unreviewed, or unmapped output: ${formatSamples(renderFailures)}`,
    "Render chips only from the reviewed category-label table."
  );

  const countFailures = currentProfiles
    .filter((profile) => {
      const sourceSkills = (profile?.skills || []).slice(0, 4);
      const localizedSkills = sourceSkills.map((skill) =>
        pack.helpers.formatPlayerSkill(skill)
      );
      return localizedSkills.length !== sourceSkills.length ||
        localizedSkills.some((skill) => !skill);
    })
    .map((profile) => profile.displayName || profile.name || profile.profileKey);
  check(
    "player-skill templates",
    countFailures.length === 0,
    `${language} player-card chip count changed or produced an empty chip: ${formatSamples(countFailures)}`,
    "Keep the existing up-to-four-chip layout while changing only the localized text."
  );

  const semanticProbes = {
    es: [
      ["Crossing delivery", "crossing", "Centros"],
      ["Cross claiming", "cross-command", "Dominio de los centros"],
      ["Cross handling", "cross-command", "Dominio de los centros"],
      ["Aerial defending", "aerial-defending", "Defensa aérea"],
      ["Recovery defending", "recovery-defending", "Defensa en recuperación"],
      ["Forward pressing", "pressing", "Presión"],
      ["Box finishing", "box-finishing", "Definición en el área"],
      ["First-time finishing", "first-time-finishing", "Remate de primera"],
      ["Set-piece delivery", "set-piece-delivery", "Balón parado"]
    ],
    ko: [
      ["Crossing delivery", "crossing", "크로스"],
      ["Cross claiming", "cross-command", "크로스 처리"],
      ["Cross handling", "cross-command", "크로스 처리"],
      ["Aerial defending", "aerial-defending", "공중볼 수비"],
      ["Recovery defending", "recovery-defending", "수비 복귀"],
      ["Forward pressing", "pressing", "압박"],
      ["Box finishing", "box-finishing", "박스 안 마무리"],
      ["First-time finishing", "first-time-finishing", "원터치 마무리"],
      ["Set-piece delivery", "set-piece-delivery", "세트피스 킥"]
    ]
  };
  const semanticFailures = semanticProbes[language]
    .filter(
      ([source, category, localized]) =>
        getPlayerSkillCategory(source) !== category ||
        pack.helpers.formatPlayerSkill(source) !== localized
    )
    .map(
      ([source, category, localized]) =>
        `${source}: ${getPlayerSkillCategory(source)}/${pack.helpers.formatPlayerSkill(source)} (expected ${category}/${localized})`
    );
  check(
    "player-skill semantics",
    semanticFailures.length === 0,
    `${language} controlled football-skill probes failed: ${formatSamples(semanticFailures)}`,
    "Keep crosses, claiming, defending, pressing, and finishing on explicit semantic paths."
  );

  const currentSkillSources = new Set(currentRows.map((row) => row.source));
  const archiveSkillSources = new Set(historicalRows.map((row) => row.source));
  const currentOverlaySkillKeys = [...currentSkillSources].filter((source) =>
    requiredSourceSets.current.has(source)
  );
  const archiveOverlaySkillKeys = [...archiveSkillSources].filter((source) =>
    requiredSourceSets.archive.has(source)
  );
  check(
    "player-skill payload",
    currentOverlaySkillKeys.length <= 60 && archiveOverlaySkillKeys.length <= 6,
    `${language} content overlays still collect too many player-skill phrases: ${currentOverlaySkillKeys.length} current, ${archiveOverlaySkillKeys.length} archive`,
    "Only keep strings that are independently used by another visible surface."
  );

  const contentTranslations =
    currentContentModule?.CONTENT_TRANSLATIONS ||
    currentContentModule?.default?.translations ||
    {};
  const taglines = (teams?.teams || []).map((team) => team?.tagline).filter(Boolean);
  const taglineFailures = taglines
    .map((source) => [source, pack.helpers.translateText(source)])
    .filter(([source, localized]) => {
      if (!localized || localized === source) {
        return true;
      }
      return language === "ko" && !/\p{Script=Hangul}/u.test(localized);
    })
    .map(([source, localized]) => `${source} -> ${localized || "(empty)"}`);
  const taglineOverlayLeaks = taglines.filter(
    (source) => requiredSourceSets.current.has(source) || contentTranslations[source]
  );
  check(
    "team-tagline payload",
    taglineFailures.length === 0 && taglineOverlayLeaks.length === 0,
    `${language} reviewed team taglines are missing or still duplicated in current-content: ${formatSamples(
      taglineFailures.concat(taglineOverlayLeaks)
    )}`,
    "Use the exact app-pack tagline map and keep free-form taglines out of the content overlay."
  );

  const duplicateCategoryProfiles = currentProfiles.filter((profile) => {
    const categories = (profile?.skills || []).slice(0, 4).map(getPlayerSkillCategory);
    return new Set(categories).size < categories.length;
  }).length;
  check(
    "player-skill runtime",
    /helpers\?\.formatPlayerSkill\?\./u.test(appSource || "") &&
      /getPlayerSkills\([^)]*\)\.map\(localizePlayerSkill\)/u.test(appSource || ""),
    "app.js does not visibly route every rendered player-card chip through the locale formatter"
  );
  metric(
    `${language} player-skill templates`,
    `${currentRendered.length}/${currentRendered.length} current chip occurrences across ${currentProfiles.length} cards; ${currentSkillSources.size} source phrases -> ${labelValues.size} controlled labels; ${duplicateCategoryProfiles} cards retain semantically overlapping chips`
  );
  metric(
    `${language} player-skill overlay reuse`,
    `${currentOverlaySkillKeys.length}/${currentSkillSources.size} current and ${archiveOverlaySkillKeys.length}/${archiveSkillSources.size} archive skill strings remain only because another surface reuses the same English source`
  );
}

function auditReportPack(language, pack) {
  if (!pack) {
    return;
  }
  check("report pack schema", pack.language === language, `${language} report language metadata is ${pack.language}`);
  check("report pack schema", pack.domain === "report", `${language} report domain metadata is ${pack.domain}`);
  warn(
    "report pack schema",
    pack.schemaVersion === 1,
    `${language} report pack has no schemaVersion: 1`,
    "Version all locale-domain schemas so future migrations can fail clearly."
  );
  for (const path of REQUIRED_REPORT_PATHS) {
    const value = getAtPath(pack, path);
    check(
      "report page",
      typeof value === "string" && value.trim(),
      `${language} report pack is missing ${path}`
    );
  }
  check(
    "report page",
    typeof pack.text?.issueOptions?.[""] === "string" && pack.text.issueOptions[""].trim(),
    `${language} report pack is missing the unselected issue option`
  );
  check(
    "report page",
    Object.keys(pack.timeZoneNames || {}).length >= 22,
    `${language} report page has ${Object.keys(pack.timeZoneNames || {}).length}/22 timezone names`
  );

  const leaks = flattenStringLeaves({
    text: pack.text,
    footerText: pack.footerText
  })
    .filter(({ value }) => hasSuspiciousPlaceholder(value))
    .map(({ path, value }) => `${path}: ${value}`);
  check(
    "report page",
    leaks.length === 0,
    `${language} report pack contains suspicious text: ${formatSamples(leaks)}`
  );
  if (language === "ko") {
    const likelyEnglish = flattenStringLeaves({ text: pack.text, footerText: pack.footerText })
      .filter(
        ({ value }) =>
          value.length >= 12 &&
          countLatinWords(value) >= 2 &&
          !/\p{Script=Hangul}/u.test(value) &&
          !/^(?:World Cup Simplified|name@example\.com|FIFA)/u.test(value)
      )
      .map(({ path, value }) => `${path}: ${value}`);
    check(
      "report page",
      likelyEnglish.length === 0,
      `ko report pack has likely English leaks: ${formatSamples(likelyEnglish)}`
    );
  }
}

function auditHighlightsPack(language, pack, highlightsHtml, highlightsSource) {
  if (!pack) {
    return;
  }
  const markupKeys = [
    ...highlightsHtml.matchAll(/data-i18n(?:-aria)?="([^"]+)"/gu)
  ].map((match) => match[1]);
  const requiredKeys = [
    ...new Set([
      ...markupKeys,
      "goldenBootTotal",
      "loadError",
      "metaDescription",
      "metaTitle",
      "ogDescription",
      "ogTitle",
      "themeDark",
      "themeLight"
    ])
  ];
  const missingKeys = requiredKeys.filter(
    (key) => !String(pack.text?.[key] || "").trim()
  );
  check(
    "highlights pack schema",
    pack.schemaVersion === 1 && pack.language === language && pack.domain === "highlights",
    `${language} highlights pack metadata is invalid`
  );
  check(
    "highlights page",
    missingKeys.length === 0,
    `${language} highlights pack is missing: ${formatSamples(missingKeys)}`,
    "Every standalone highlights string and ARIA label must be represented in the locale pack."
  );
  check(
    "highlights page",
    /loadLocaleDomain\([^,]+,\s*["']highlights["']\)/u.test(highlightsSource) &&
      /id=["']language-select["']/u.test(highlightsHtml),
    "The highlights page does not load its locale domain or expose a language selector"
  );
}

function auditHighlightsPackParity(esPack, koPack) {
  if (!esPack || !koPack) {
    return;
  }
  const esShape = getShapePaths(esPack);
  const koShape = getShapePaths(koPack);
  check(
    "highlights page parity",
    sameMembers(esShape, koShape),
    `Spanish/Korean highlights pack shapes differ: ${formatSamples(
      esShape.filter((path) => !koShape.includes(path)).concat(
        koShape.filter((path) => !esShape.includes(path))
      )
    )}`
  );
}

function auditBallBoyPack(language, pack) {
  if (!pack) {
    return;
  }
  check(
    "Ball Boy pack schema",
    pack.language === language,
    `${language} Ball Boy pack must export language: ${language}; found ${pack.language ?? "(missing)"}`,
    "The shared loader rejects packs without matching language metadata."
  );
  check(
    "Ball Boy pack schema",
    pack.domain === "chatbot",
    `${language} Ball Boy pack must export domain: chatbot; found ${pack.domain ?? "(missing)"}`,
    "The shared loader rejects packs without matching domain metadata."
  );
  check(
    "Ball Boy pack schema",
    pack.code === language,
    `${language} Ball Boy pack code must remain ${language}`
  );
  warn(
    "Ball Boy pack schema",
    pack.schemaVersion === 1,
    `${language} Ball Boy pack has no schemaVersion: 1`
  );
  for (const path of REQUIRED_BALL_BOY_COPY_PATHS) {
    check("Ball Boy UI", hasPath(pack.copy, path), `${language} Ball Boy copy is missing ${path}`);
  }
  for (const path of BALL_BOY_KNOWLEDGE_PATHS) {
    check("Ball Boy knowledge", hasPath(pack.knowledge, path), `${language} Ball Boy knowledge is missing ${path}`);
  }
  check(
    "Ball Boy knowledge",
    Object.keys(pack.knowledge?.teamNames || {}).length === 48,
    `${language} Ball Boy team names cover ${Object.keys(pack.knowledge?.teamNames || {}).length}/48 teams`
  );
  check(
    "Ball Boy knowledge",
    Object.keys(pack.knowledge?.rules || {}).length >= 8,
    `${language} Ball Boy has only ${Object.keys(pack.knowledge?.rules || {}).length} localized rule explainers`
  );
  check(
    "Ball Boy knowledge",
    Object.keys(pack.knowledge?.timeZoneNames || {}).length >= 48,
    `${language} Ball Boy has only ${Object.keys(pack.knowledge?.timeZoneNames || {}).length} localized timezone-choice labels`
  );
  check(
    "Ball Boy entity policy",
    pack.knowledge?.entityPolicies?.clubs === (
      language === "es" ? "preserve-official" : "current-content"
    ),
    `${language} Ball Boy club policy must ${
      language === "es" ? "preserve official club brands" : "reuse current-content localization"
    }`
  );
  check(
    "Ball Boy entity policy",
    pack.knowledge?.entityPolicies?.leagues === "current-content",
    `${language} Ball Boy league names must reuse the current-content localization map`
  );

  const criticalValues = [
    pack.copy?.initialMessage,
    pack.copy?.placeholder,
    pack.copy?.thinking,
    pack.copy?.worldCupStats,
    pack.copy?.languageActionIntro,
    pack.copy?.unsupportedLanguage,
    typeof pack.copy?.languageChanged === "function" ? pack.copy.languageChanged("Español") : "",
    typeof pack.copy?.timeZoneChanged === "function" ? pack.copy.timeZoneChanged("Madrid") : "",
    typeof pack.knowledge?.templates?.playerLead === "function"
      ? pack.knowledge.templates.playerLead("stats", {
          name: language === "ko" ? "킬리안 음바페" : "Kylian Mbappé",
          goals: 3,
          assists: 2
        })
      : "",
    typeof pack.knowledge?.templates?.countryOverview === "function"
      ? pack.knowledge.templates.countryOverview({
          team: language === "ko" ? "프랑스" : "Francia",
          played: 3,
          wins: 2,
          draws: 1,
          losses: 0,
          goalsFor: 5,
          goalsAgainst: 2
        })
      : ""
  ].filter(Boolean);

  const suspicious = criticalValues
    .filter((value) => hasSuspiciousPlaceholder(value))
    .map((value) => value);
  check(
    "Ball Boy quality",
    suspicious.length === 0,
    `${language} Ball Boy produced suspicious copy: ${formatSamples(suspicious)}`
  );
  if (language === "es") {
    const goalsReply = pack.knowledge?.templates?.countryLead?.("goals", {
      goalsAgainst: 2,
      goalsFor: 5,
      played: 3,
      team: "Francia"
    });
    const settingsSamples = [
      pack.copy?.languageActionIntro,
      pack.copy?.timeZoneActionIntro,
      pack.copy?.timeZoneClarification,
      pack.copy?.openSettings,
      typeof pack.copy?.languageAlreadySet === "function"
        ? pack.copy.languageAlreadySet("Español")
        : "",
      typeof pack.copy?.timeZoneAlreadySet === "function"
        ? pack.copy.timeZoneAlreadySet("Madrid")
        : ""
    ].filter(Boolean);
    check(
      "Ball Boy Spanish newsroom copy",
      /ha recibido 2 goles/u.test(goalsReply || "") &&
        settingsSamples.every((value) => !/Ajustes/u.test(value)),
      `Spanish Ball Boy has incomplete goal totals or inconsistent settings terminology: ${formatSamples([
        goalsReply,
        ...settingsSamples
      ])}`
    );
  }
  if (language === "ko") {
    const noHangul = criticalValues
      .filter((value) => !/\p{Script=Hangul}/u.test(value))
      .map((value) => value);
    check(
      "Ball Boy quality",
      noHangul.length === 0,
      `ko Ball Boy critical replies have no Hangul: ${formatSamples(noHangul)}`
    );

    const matchLead = pack.knowledge?.templates?.matchLead;
    const scoreParticleCases = [
      ["2-1", "한국이 2-1로 승리했습니다."],
      ["2-0", "한국이 2-0으로 승리했습니다."],
      ["3-3", "한국이 3-3으로 승리했습니다."],
      ["4-2", "한국이 4-2로 승리했습니다."]
    ];
    const scoreParticleFailures = scoreParticleCases
      .map(([score, expected]) => {
        const [winnerScore, loserScore] = score.split("-");
        const actual = typeof matchLead === "function"
          ? matchLead("winner", {
              winner: "한국",
              winnerScore,
              loserScore,
              extraTime: false,
              comeback: false
            })
          : "";
        return actual === expected ? "" : `${score}: ${actual || "(missing)"}`;
      })
      .filter(Boolean);
    check(
      "Ball Boy Korean score particles",
      scoreParticleFailures.length === 0,
      `ko Ball Boy uses the wrong 로/으로 particle after scores: ${formatSamples(scoreParticleFailures)}`
    );
  }
}

function auditBallBoyCurrentEntities(
  language,
  pack,
  playerProfiles,
  currentContentModule,
  structuredTranslations,
  chatbotKnowledgeSource
) {
  const profiles = Object.values(playerProfiles?.profiles || {});
  const translations =
    currentContentModule?.CONTENT_ENTITIES?.structuredTranslations || {};
  const clubs = [...new Set(profiles.map((profile) => profile?.club).filter(Boolean))];
  const leagues = [...new Set(profiles.map((profile) => profile?.league).filter(Boolean))];
  const missing = [...clubs, ...leagues]
    .filter((value) => structuredTranslations?.[value] !== value)
    .filter((value) => translations[value] !== structuredTranslations?.[value]);
  const identityMappings = Object.entries(translations)
    .filter(([source, localized]) => source === localized)
    .map(([source]) => source);
  check(
    "Ball Boy current entities",
    missing.length === 0,
    `${language} current-content map is missing Ball Boy club/league values: ${formatSamples(missing)}`,
    "Keep player-card entities in the shared current-content overlay instead of duplicating another large map."
  );
  check(
    "Ball Boy current entities",
    identityMappings.length === 0,
    `${language} current structured entities still ship identity mappings: ${formatSamples(identityMappings)}`,
    "Official names need no source-to-identical-value entry; preserve them through runtime fallback."
  );

  check(
    "Ball Boy current entities",
    /localeCurrentEntityTranslations/u.test(chatbotKnowledgeSource || "") &&
      /content-current\.js/u.test(chatbotKnowledgeSource || ""),
    "Ball Boy does not visibly reuse the lazy current-content map for club and league names"
  );
  if (language === "es") {
    check(
      "Ball Boy current entities",
      pack?.knowledge?.entityPolicies?.clubs === "preserve-official",
      "Spanish Ball Boy must preserve official club brands while translating the surrounding loan copy"
    );
  } else {
    const localizedSamples = ["Bayern Munich", "Manchester City", "Real Madrid"]
      .map((value) => translations[value])
      .filter(Boolean);
    check(
      "Ball Boy current entities",
      localizedSamples.length === 3 &&
        localizedSamples.every((value) => /\p{Script=Hangul}/u.test(value)),
      `Korean current club newsroom samples are incomplete: ${formatSamples(localizedSamples)}`
    );
  }
}

function auditBallBoyParity(esPack, koPack) {
  if (!esPack || !koPack) {
    return;
  }
  const esCopyShape = getShapePaths(esPack.copy || {});
  const koCopyShape = getShapePaths(koPack.copy || {});
  check(
    "Ball Boy UI parity",
    sameMembers(esCopyShape, koCopyShape),
    `Spanish/Korean Ball Boy copy shapes differ: ${formatSamples(
      esCopyShape.filter((path) => !koCopyShape.includes(path)).concat(
        koCopyShape.filter((path) => !esCopyShape.includes(path))
      )
    )}`
  );

  for (const key of [
    "rules",
    "offside",
    "personality",
    "intents",
    "positions",
    "stages",
    "templates",
    "timeZoneNames"
  ]) {
    const esKeys = Object.keys(esPack.knowledge?.[key] || {});
    const koKeys = Object.keys(koPack.knowledge?.[key] || {});
    check(
      "Ball Boy knowledge parity",
      sameMembers(esKeys, koKeys),
      `Spanish/Korean Ball Boy knowledge.${key} keys differ: ${formatSamples(
        esKeys.filter((item) => !koKeys.includes(item)).concat(
          koKeys.filter((item) => !esKeys.includes(item))
        )
      )}`
    );
  }
}

function auditBallBoyTimeZoneLocaleContract(chatbotSource, chatbotPacks) {
  const groupSource = String(chatbotSource || "").match(
    /const SCOUT_TIME_ZONE_GROUPS = \[([\s\S]*?)\n\];\nconst SCOUT_TIME_ZONE_GROUP_ALIASES/u
  )?.[1] || "";
  const groupOptions = [...groupSource.matchAll(/\["([A-Za-z_]+\/[A-Za-z_]+)"/gu)]
    .map((match) => match[1]);
  check(
    "Ball Boy timezone locale aliases",
    [
      "estados unidos",
      "미국",
      "canadá",
      "캐나다",
      "españa",
      "스페인"
    ].every((alias) => (chatbotSource || "").includes(`"${alias}"`)),
    "Ball Boy timezone groups are missing representative Spanish/Korean country aliases"
  );
  check(
    "Ball Boy timezone choice labels",
    /getScoutTimeZoneLabel\(value,\s*\{\s*includeOffset:\s*false\s*\}\)/u.test(
      chatbotSource || ""
    ),
    "Ambiguous timezone choices do not visibly reuse the locale-aware timezone label resolver"
  );
  check(
    "Ball Boy timezone choice labels",
    /scoutLocalePack\?\.knowledge\?\.timeZoneNames\?\.\[timeZone\]/u.test(
      chatbotSource || ""
    ),
    "Ball Boy timezone labels are not visibly read from the lazy locale pack"
  );
  for (const language of NEW_LANGUAGE_CODES) {
    const names = chatbotPacks?.[language]?.knowledge?.timeZoneNames || {};
    const missingDisplayOptions = groupOptions.filter((timeZone) => !names[timeZone]);
    check(
      "Ball Boy timezone choice labels",
      groupOptions.length >= 40 && missingDisplayOptions.length === 0,
      `${language} ambiguous timezone choices lack localized labels: ${formatSamples(missingDisplayOptions)}`
    );
  }
}

function auditAppPackParity(esPack, koPack) {
  if (!esPack || !koPack) {
    return;
  }
  for (const key of [
    "teams",
    "teamNames",
    "timeZones",
    "venueNames",
    "venueLocations",
    "stages",
    "lineupPositions",
    "playerPositions",
    "playerSkillLabels",
    "styleTerms"
  ]) {
    const esKeys = Object.keys(esPack.entities?.[key] || {});
    const koKeys = Object.keys(koPack.entities?.[key] || {});
    check(
      "app entity parity",
      sameMembers(esKeys, koKeys),
      `Spanish/Korean app entities.${key} keys differ: ${formatSamples(
        esKeys.filter((item) => !koKeys.includes(item)).concat(
          koKeys.filter((item) => !esKeys.includes(item))
        )
      )}`
    );
  }
}

function auditReportPackParity(esPack, koPack) {
  if (!esPack || !koPack) {
    return;
  }
  const esShape = getShapePaths(esPack);
  const koShape = getShapePaths(koPack);
  check(
    "report page parity",
    sameMembers(esShape, koShape),
    `Spanish/Korean report pack shapes differ: ${formatSamples(
      esShape.filter((path) => !koShape.includes(path)).concat(
        koShape.filter((path) => !esShape.includes(path))
      )
    )}`
  );
}

function getProfileScopeNames(...profileCollections) {
  const names = new Set();
  for (const profiles of profileCollections) {
    for (const [profileKey, profile] of Object.entries(profiles?.profiles || {})) {
      for (const value of [profile?.name || profileKey, profile?.displayName]) {
        const name = String(value || "").trim();
        if (name) {
          names.add(name);
        }
      }
    }
  }
  return names;
}

function getProfileSourceNames(...profileCollections) {
  const names = new Set();
  for (const profiles of profileCollections) {
    for (const [profileKey, profile] of Object.entries(profiles?.profiles || {})) {
      const name = String(profile?.name || profileKey).trim();
      if (name) {
        names.add(name);
      }
    }
  }
  return names;
}

function getPlayerNameSourcePriority(language, source) {
  if (source === "editorial-override") {
    return 5;
  }
  if (source === `${language}wiki`) {
    return 4;
  }
  if (source === "wikidata") {
    return 3;
  }
  if (source === "phonetic-transliteration") {
    return 2;
  }
  return 1;
}

function getResolvedPlayerNames(language, entries) {
  const bestByCanonicalName = new Map();
  for (const [sourceName, entry] of Object.entries(entries || {})) {
    const canonicalName = String(entry?.canonicalName || sourceName).trim();
    const displayName = String(entry?.displayName || canonicalName).trim();
    const priority = getPlayerNameSourcePriority(language, entry?.source);
    const current = bestByCanonicalName.get(canonicalName);
    if (!current || priority > current.priority) {
      bestByCanonicalName.set(canonicalName, { displayName, priority });
    }
  }

  const resolved = {};
  for (const [sourceName, entry] of Object.entries(entries || {})) {
    const canonicalName = String(entry?.canonicalName || sourceName).trim();
    const displayName =
      bestByCanonicalName.get(canonicalName)?.displayName ||
      String(entry?.displayName || canonicalName).trim();
    for (const alias of [sourceName, canonicalName]) {
      if (displayName && displayName !== alias) {
        resolved[alias] = displayName;
      }
    }
    const profileDisplayName = String(entry?.profileDisplayName || "").trim();
    const localizedProfileDisplayName = String(entry?.localizedProfileDisplayName || "").trim();
    if (
      profileDisplayName &&
      localizedProfileDisplayName &&
      localizedProfileDisplayName !== profileDisplayName
    ) {
      resolved[profileDisplayName] = localizedProfileDisplayName;
    }
  }
  return resolved;
}

function getContextFreeAmbiguousPlayerAliases(entries) {
  const fullNameIdentitiesByFinalToken = new Map();
  const normalizeToken = (value) =>
    String(value || "")
      .normalize("NFKD")
      .replace(/\p{Mark}/gu, "")
      .toLocaleLowerCase("en-US")
      .replace(/[^\p{Letter}\p{Number}]/gu, "");

  for (const [sourceName, entry] of Object.entries(entries || {})) {
    const canonicalName = String(entry?.canonicalName || sourceName).trim();
    const canonicalIdentity = normalizeToken(canonicalName);
    for (const candidateName of [sourceName, canonicalName]) {
      const parts = String(candidateName || "").trim().split(/\s+/u).filter(Boolean);
      if (parts.length < 2) continue;
      const finalToken = normalizeToken(parts.at(-1));
      if (!finalToken) continue;
      if (!fullNameIdentitiesByFinalToken.has(finalToken)) {
        fullNameIdentitiesByFinalToken.set(finalToken, new Set());
      }
      fullNameIdentitiesByFinalToken.get(finalToken).add(canonicalIdentity);
    }
  }

  const ambiguousAliases = new Set();
  for (const [sourceName, entry] of Object.entries(entries || {})) {
    const canonicalName = String(entry?.canonicalName || sourceName).trim();
    const canonicalIdentity = normalizeToken(canonicalName);
    for (const alias of [sourceName, canonicalName]) {
      const trimmedAlias = String(alias || "").trim();
      if (!trimmedAlias || /\s/u.test(trimmedAlias)) continue;
      const finalToken = normalizeToken(trimmedAlias);
      const otherIdentities = fullNameIdentitiesByFinalToken.get(finalToken);
      if (
        otherIdentities
        && [...otherIdentities].some((identity) => identity !== canonicalIdentity)
      ) {
        ambiguousAliases.add(trimmedAlias);
      }
    }
  }
  return ambiguousAliases;
}

function getExpectedPlayerNameModule(language, entries, scopeNames) {
  return Object.fromEntries(
    Object.entries(getResolvedPlayerNames(language, entries))
      .filter(([name]) => scopeNames.has(name))
  );
}

function auditGeneratedPlayerNameModule(language, scope, expected, actual) {
  const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])];
  const mismatches = keys
    .filter((name) => expected[name] !== actual[name])
    .map(
      (name) =>
        `${name}: expected ${expected[name] || "(absent)"}; module ${actual[name] || "(absent)"}`
    );
  check(
    "player-name generated module",
    mismatches.length === 0,
    `${language} ${scope} player-name module differs from provenance: ${formatSamples(mismatches)}`,
    "Run the player-name sync after editing provenance, overrides, or profile scope."
  );
}

function auditPlayerNames(
  language,
  provenance,
  profiles,
  nameTranslations,
  providerCoverage,
  playerNameOverrides,
  playerNameTransliterations
) {
  const entries = provenance?.names?.[language] || {};
  const summary = provenance?.summary?.[language] || {};
  const currentProfileNames = getProfileSourceNames(profiles.current, profiles.coaches);
  const archiveProfileNames = getProfileSourceNames(profiles.archive);
  const currentScopeNames = getProfileScopeNames(profiles.current, profiles.coaches);
  const archiveScopeNames = getProfileScopeNames(profiles.archive);

  for (const [scope, profileNames] of [
    ["current", currentProfileNames],
    ["archive", archiveProfileNames]
  ]) {
    const missing = [...profileNames].filter((name) => !entries[name]);
    check(
      "player-name provenance",
      missing.length === 0,
      `${language} provenance is missing ${missing.length}/${profileNames.size} ${scope} player/coach names: ${formatSamples(missing)}`,
      `Every ${scope} player and coach must have a country-language display-name decision and source.`
    );
  }
  check(
    "player-name provenance",
    Number(summary.totalProfiles) === Object.keys(entries).length,
    `${language} provenance summary totalProfiles is ${summary.totalProfiles}; expected ${Object.keys(entries).length}`
  );

  const invalidSources = [];
  const invalidUrls = [];
  const suspiciousNames = [];
  const invalidKoreanNames = [];
  const acceptedSources = new Set([
    "canonical",
    "editorial-override",
    "eswiki",
    "kowiki",
    "wikidata",
    "phonetic-transliteration"
  ]);

  for (const [sourceName, entry] of Object.entries(entries)) {
    if (!acceptedSources.has(entry.source)) {
      invalidSources.push(`${sourceName}: ${entry.source || "(missing)"}`);
    }
    if (
      typeof entry.sourceUrl !== "string" ||
      (!/^https?:\/\//u.test(entry.sourceUrl) &&
        ![
          "data/locales/player-name-overrides.json",
          "data/locales/player-name-transliterations.json"
        ].includes(entry.sourceUrl))
    ) {
      invalidUrls.push(`${sourceName}: ${entry.sourceUrl || "(missing)"}`);
    }
    if (
      !String(entry.displayName || "").trim() ||
      !String(entry.canonicalName || "").trim() ||
      hasSuspiciousPlaceholder(entry.displayName)
    ) {
      suspiciousNames.push(
        `${sourceName} -> canonical ${entry.canonicalName || "(missing)"}, display ${entry.displayName || "(missing)"}`
      );
    }
    if (
      language === "ko" &&
      entry.source !== "canonical" &&
      !/\p{Script=Hangul}/u.test(entry.displayName || "")
    ) {
      invalidKoreanNames.push(`${sourceName} -> ${entry.displayName}`);
    }

  }

  check(
    "player-name provenance",
    invalidSources.length === 0,
    `${language} player names use unsupported provenance sources: ${formatSamples(invalidSources)}`
  );
  check(
    "player-name provenance",
    invalidUrls.length === 0,
    `${language} player names have invalid source URLs: ${formatSamples(invalidUrls)}`
  );
  check(
    "player-name provenance",
    suspiciousNames.length === 0,
    `${language} player names contain suspicious placeholders or repeated letters: ${formatSamples(suspiciousNames)}`,
    "Correct the source or add a checked-in editorial override before launch."
  );
  check(
    "player-name provenance",
    invalidKoreanNames.length === 0,
    `Korean sourced names without Hangul: ${formatSamples(invalidKoreanNames)}`
  );
  const resolvedProfileTranslations = getResolvedPlayerNames(language, entries);
  const providerTranslations = buildProviderPlayerNameTranslations({
    language,
    overrides: playerNameOverrides,
    profileTranslations: resolvedProfileTranslations,
    providerCoverage,
    transliterations: playerNameTransliterations
  });
  const expectedCurrentPlayerNameModule = {
    ...getExpectedPlayerNameModule(language, entries, currentScopeNames),
    ...providerTranslations
  };
  const expectedArchivePlayerNameModule = getExpectedPlayerNameModule(language, entries, archiveScopeNames);
  const expectedTrimmedArchivePlayerNameModule = Object.fromEntries(
    Object.entries(expectedArchivePlayerNameModule)
      .filter(([name, translation]) => expectedCurrentPlayerNameModule[name] !== translation)
  );
  auditGeneratedPlayerNameModule(
    language,
    "current",
    expectedCurrentPlayerNameModule,
    nameTranslations.current
  );
  auditGeneratedPlayerNameModule(
    language,
    "archive",
    expectedTrimmedArchivePlayerNameModule,
    nameTranslations.archive
  );

  const currentEntries = [...currentProfileNames].map((name) => entries[name]).filter(Boolean);
  if (language === "es") {
    const legalNameExpansions = currentEntries
      .filter((entry) => entry.source === "eswiki")
      .filter((entry) => {
        const canonicalWords = String(entry.canonicalName || "").trim().split(/\s+/u).length;
        const displayWords = String(entry.displayName || "").trim().split(/\s+/u).length;
        return displayWords > canonicalWords;
      })
      .map((entry) => `${entry.canonicalName} -> ${entry.displayName}`);
    check(
      "player-name editorial review",
      legalNameExpansions.length === 0,
      `Spanish newsroom names contain legal-name expansions: ${formatSamples(legalNameExpansions)}`,
      "Keep the familiar official match name unless the country-language source supplies a shorter or diacritic-corrected newsroom form."
    );
  } else {
    const currentFallbacks = currentEntries.filter((entry) => entry.source === "canonical").length;
    const fallbackRate = currentFallbacks / Math.max(1, currentEntries.length);
    warn(
      "player-name editorial review",
      fallbackRate <= 0.25,
      `${language} uses canonical fallback for ${currentFallbacks}/${currentEntries.length} current players (${(fallbackRate * 100).toFixed(1)}%)`,
      "Review high-visibility fallback names against how local TV and sports desks display them."
    );
  }
  metric(
    `${language} player names`,
    `${summary.sourcedNames || 0} sourced, ${summary.localizedNames || 0} localized, ${summary.canonicalFallbacks || 0} canonical fallbacks`
  );

  const unresolvedProviderNames = Object.entries(
    providerCoverage?.resolutions || {}
  )
    .filter(([, resolution]) => !resolution?.profileName)
    .filter(([sourceName]) => {
      const localized =
        playerNameOverrides?.[language]?.[sourceName] ||
        (language === "ko"
          ? playerNameTransliterations?.ko?.[sourceName]
          : sourceName);
      return language === "ko" && !/\p{Script=Hangul}/u.test(localized || "");
    })
    .map(([sourceName]) => sourceName);
  check(
    "provider player-name coverage",
    unresolvedProviderNames.length === 0,
    `${language} rendered provider-only player names lack a locale display decision: ${formatSamples(unresolvedProviderNames)}`,
    "Add a checked-in editorial override or transliteration for provider-rendered players that do not yet have a profile."
  );
}

function auditProviderNameCoverage(provenance, providerCoverage) {
  const expectedAliases = getProviderAliasProvenance(providerCoverage);
  const actualAliases = provenance?.providerNameCoverage?.currentAliases || {};
  const keys = [...new Set([
    ...Object.keys(expectedAliases),
    ...Object.keys(actualAliases)
  ])];
  const mismatches = keys
    .filter(
      (sourceName) =>
        JSON.stringify(actualAliases[sourceName]) !==
        JSON.stringify(expectedAliases[sourceName])
    )
    .map((sourceName) => sourceName);
  check(
    "provider player-name coverage",
    Number(provenance?.providerNameCoverage?.renderedCurrentNames) ===
      providerCoverage.renderedNameCount,
    `player-name provenance covers ${provenance?.providerNameCoverage?.renderedCurrentNames || 0} rendered current names; expected ${providerCoverage.renderedNameCount}`,
    "Regenerate locale player-name provenance after lineups, fixtures, or expected lineups change."
  );
  check(
    "provider player-name coverage",
    mismatches.length === 0,
    `provider alias provenance is stale or incomplete: ${formatSamples(mismatches)}`,
    "Regenerate locale player-name provenance so every non-canonical rendered alias is auditable."
  );
  metric(
    "provider player names",
    `${providerCoverage.renderedNameCount} rendered names, ${Object.keys(expectedAliases).length} aliases or provider-only decisions`
  );
}

function getContentEntityFidelityIssues(
  language,
  translations,
  provenanceEntries,
  teams,
  appPack,
  structuredSourceKeys = new Set()
) {
  const issues = [];
  const resolvedPlayerNames = getResolvedPlayerNames(language, provenanceEntries);
  const contextFreeAmbiguousPlayerAliases =
    getContextFreeAmbiguousPlayerAliases(provenanceEntries);
  const playerAliases = [...new Set(
    Object.entries(provenanceEntries || {}).flatMap(([sourceName, entry]) => [
      String(sourceName || "").trim(),
      String(entry?.canonicalName || "").trim()
    ])
  )].filter(Boolean);
  const playerCandidates = Object.entries(resolvedPlayerNames)
    .map(([sourceName, expected]) => ({
      sourceName: String(sourceName || "").trim(),
      expected: String(expected || "").trim()
    }))
    .filter(
      ({ sourceName, expected }) =>
        expected &&
        (sourceName.includes(" ") || sourceName.length >= 6)
    )
    .sort((left, right) => right.sourceName.length - left.sourceName.length);
  const teamCandidates = [...new Map([
    ...(teams?.teams || []).map((team) => [
      String(team.name || "").trim(),
      String(appPack?.entities?.teams?.[team.id] || "").trim()
    ]),
    ...Object.entries(appPack?.entities?.teamNames || {})
      .map(([sourceName, expected]) => [
        String(sourceName || "").trim(),
        String(expected || "").trim()
      ])
  ]).entries()]
    .map(([sourceName, expected]) => ({ sourceName, expected }))
    .filter(({ sourceName, expected }) => sourceName && expected && sourceName !== expected)
    .sort((left, right) => right.sourceName.length - left.sourceName.length);
  const playerProtectionCandidates = playerAliases
    .map((sourceName) => ({ sourceName }))
    .sort((left, right) => right.sourceName.length - left.sourceName.length);

  function getNonOverlappingEntityMentions(text, candidates, occupiedRanges = []) {
    const mentions = [];
    const claimedRanges = [...occupiedRanges];
    for (const candidate of candidates) {
      let start = text.indexOf(candidate.sourceName);
      while (start >= 0) {
        const end = start + candidate.sourceName.length;
        const previousCharacter = start > 0 ? text[start - 1] : "";
        const nextCharacter = end < text.length ? text[end] : "";
        const isBounded =
          !/[\p{Letter}\p{Number}]/u.test(previousCharacter) &&
          !/[\p{Letter}\p{Number}]/u.test(nextCharacter);
        const overlaps = claimedRanges.some(
          (range) => start < range.end && end > range.start
        );
        if (isBounded && !overlaps) {
          const mention = { ...candidate, start, end };
          mentions.push(mention);
          claimedRanges.push(mention);
        }
        start = text.indexOf(candidate.sourceName, start + candidate.sourceName.length);
      }
    }
    return mentions;
  }

  for (const [english, localizedValue] of Object.entries(translations || {})) {
    if (structuredSourceKeys.has(english)) {
      continue;
    }
    const localized = String(localizedValue || "");
    const protectedPlayerMentions = getNonOverlappingEntityMentions(
      english,
      playerProtectionCandidates
    );
    const playerMentions = protectedPlayerMentions
      .map((mention) => ({
        ...mention,
        expected: contextFreeAmbiguousPlayerAliases.has(mention.sourceName)
          ? ""
          : resolvedPlayerNames[mention.sourceName]
      }))
      .filter((mention) => mention.expected);
    const teamMentions = getNonOverlappingEntityMentions(
      english,
      teamCandidates,
      protectedPlayerMentions
    );
    for (const candidate of playerMentions) {
      if (!localized.includes(candidate.expected)) {
        issues.push(
          `${candidate.sourceName} expected ${candidate.expected}: ${english} -> ${localized}`
        );
        if (issues.length >= 100) {
          return issues;
        }
      }
    }
    for (const candidate of teamMentions) {
      const followingText = english.slice(candidate.end);
      const isBareJordanPlayerContext =
        candidate.sourceName === "Jordan" &&
        /^(?:Jordan's style is built around|Watch Jordan for)\b/u.test(english);
      const allowsSpanishDemonym =
        language === "es" &&
        (/^(?:\s+(?:international|job|coach|manager|squad|side|team|national\b))/iu.test(
          followingText
        ) ||
          /^'s\s+\d{4}\s+World Cup\b/iu.test(followingText));
      if (allowsSpanishDemonym || isBareJordanPlayerContext) {
        continue;
      }
      if (!localized.includes(candidate.expected)) {
        issues.push(
          `${candidate.sourceName} expected ${candidate.expected}: ${english} -> ${localized}`
        );
        if (issues.length >= 100) {
          return issues;
        }
      }
    }
  }
  return issues;
}

function auditStructuredCurrentGlossary(
  language,
  glossary,
  appPack,
  structuredTranslations,
  data
) {
  const profiles = Object.values(data?.playerProfiles?.profiles || {});
  const clubs = [...new Set(profiles.map((profile) => profile?.club).filter(Boolean))];
  const leagues = [...new Set(profiles.map((profile) => profile?.league).filter(Boolean))];
  const positions = [...new Set(profiles.map((profile) => profile?.position).filter(Boolean))];
  const teamStyleTags = [
    ...new Set((data?.teams?.teams || []).flatMap((team) => team?.styleTags || []))
  ];

  check(
    "structured glossary",
    glossary?.schemaVersion === 1 &&
      glossary?.policies?.clubs?.es === "preserve-official-with-reviewed-exceptions" &&
      glossary?.policies?.clubs?.ko === "reviewed-newsroom-hangul-or-preserve-official" &&
      glossary?.policies?.positions ===
        "controlled-role-terms-with-case-dash-and-separator-normalization",
    "structured-content glossary policies or schema are missing",
    "Keep entity and controlled-term policy decisions explicit in the checked-in glossary."
  );

  const missingStructuredValues = [...clubs, ...leagues, ...positions, ...teamStyleTags]
    .filter((value) => !structuredTranslations[value]);
  check(
    "structured glossary",
    missingStructuredValues.length === 0,
    `${language} structured current values are not governed by the glossary: ${formatSamples(missingStructuredValues)}`,
    "Add a controlled position/style translation or apply the safe official-brand fallback."
  );

  const descriptiveLeaguePattern =
    /^(?:Algerian|Argentine|Armenian|Austrian|Azerbaijan|Belgian|Bosnian|Bulgarian|Chilean|Chinese|Costa Rican|Croatian|Cypriot|Cyprus|Czech|Danish|Ecuadorian|Egyptian|German|Ghana|Greek|Indonesian|Iraq|Israeli|Jordanian|Kazakhstan|League of Ireland|Ligue Haïtienne|Malaysia|Paraguayan|Persian Gulf|Qatar|Qatari|Russian|Saudi|Serbian|Slovak|Super League Greece|Swiss|Thai|Tunisian|Turkish|UAE|Uruguayan|Uzbekistan|Venezuelan)\b/u;
  const untranslatedDescriptiveLeagues = leagues
    .filter((league) => descriptiveLeaguePattern.test(league))
    .filter((league) => structuredTranslations[league] === league)
    .map((league) => `${league} -> ${structuredTranslations[league]}`);
  check(
    "structured glossary",
    untranslatedDescriptiveLeagues.length === 0,
    `${language} descriptive league labels still render as English source names: ${formatSamples(untranslatedDescriptiveLeagues)}`,
    "Use a conventional Spanish competition label or Korean sports-news label; preserve only true league brands."
  );

  const positionVariantExpectations = {
    es: {
      AM: "mediapunta",
      CF: "delantero centro",
      "centre-back": "defensa central",
      "RIGHT-BACK": "lateral derecho",
      "left‑back": "lateral izquierdo"
    },
    ko: {
      AM: "공격형 미드필더",
      CF: "센터 포워드",
      "centre-back": "센터백",
      "RIGHT-BACK": "오른쪽 풀백",
      "left‑back": "왼쪽 풀백"
    }
  };
  const positionVariantFailures = Object.entries(positionVariantExpectations[language])
    .filter(
      ([source, expected]) =>
        translateStructuredPosition(source, language, glossary, appPack) !== expected
    )
    .map(
      ([source, expected]) =>
        `${source} -> ${translateStructuredPosition(source, language, glossary, appPack)} (expected ${expected})`
    );
  check(
    "structured glossary",
    positionVariantFailures.length === 0,
    `${language} position case/dash/abbreviation normalization failed: ${formatSamples(positionVariantFailures)}`,
    "Resolve role variants through the controlled position glossary, not free-form translation."
  );

  const runtimePositionFailures = positions
    .filter(
      (position) =>
        appPack?.helpers?.translateLineupPosition?.(position) !==
        structuredTranslations[position]
    )
    .map(
      (position) =>
        `${position} -> ${appPack?.helpers?.translateLineupPosition?.(position) || "(empty)"} (expected ${structuredTranslations[position] || "(missing)"})`
    );
  check(
    "runtime player positions",
    runtimePositionFailures.length === 0,
    `${language} runtime player cards diverge from the structured position glossary: ${formatSamples(runtimePositionFailures)}`,
    "Exercise the browser runtime helper over every current profile position, including compound roles."
  );

  const controlledVariantExpectations = {
    es: {
      "goal-threat": "Amenaza de gol",
      "SHOT STOPPING": "Atajadas",
      "high‑press": "Presión alta",
      "set-pieces": "Balón parado"
    },
    ko: {
      "goal-threat": "득점 위협",
      "SHOT STOPPING": "선방",
      "high‑press": "전방 압박",
      "set-pieces": "세트피스"
    }
  };
  const controlledVariantFailures = Object.entries(
    controlledVariantExpectations[language]
  )
    .filter(
      ([source, expected]) =>
        translateStructuredFootballTerm(
          source,
          language,
          glossary,
          appPack
        ) !== expected
    )
    .map(
      ([source, expected]) =>
        `${source} -> ${translateStructuredFootballTerm(source, language, glossary, appPack)} (expected ${expected})`
    );
  check(
    "structured glossary",
    controlledVariantFailures.length === 0,
    `${language} skill/style case and dash normalization failed: ${formatSamples(controlledVariantFailures)}`,
    "Resolve controlled football terms through normalized glossary keys."
  );

  const mlsExpectation = language === "ko" ? "MLS" : "MLS";
  check(
    "structured glossary",
    translateStructuredLeague("MLS", language, glossary) === mlsExpectation,
    `${language} MLS alias is not governed by the competition glossary`
  );

  const exactExpectations = {
    es: {
      "Athletic Bilbao": "Athletic Bilbao",
      Celtic: "Celtic",
      "Crystal Palace": "Crystal Palace",
      Nice: "Nice",
      "Nottingham Forest": "Nottingham Forest",
      Roma: "Roma",
      "Sporting CP": "Sporting CP",
      "Young Boys": "Young Boys",
      "South African Premiership": "Premiership sudafricana",
      "Scottish Premiership": "Premiership escocesa",
      "Slovenian PrvaLiga": "PrvaLiga eslovena",
      "Major League Soccer": "Major League Soccer (MLS)",
      "Armenian Premier League": "Liga Premier de Armenia",
      "Belgian Pro League": "Pro League de Bélgica",
      "Saudi First Division League": "Segunda División de Arabia Saudita",
      Forward: "delantero",
      "Centre-back": "defensa central",
      "Right-back": "lateral derecho",
      "Left-back": "lateral izquierdo",
      "Tempo control": "Control del ritmo",
      "High press": "Presión alta",
      "Set pieces": "Balón parado",
      "Direct outlets": "Salidas directas"
    },
    ko: {
      "Athletic Bilbao": "아틀레틱 빌바오",
      Celtic: "셀틱",
      "Crystal Palace": "크리스털 팰리스",
      Nice: "니스",
      "Nottingham Forest": "노팅엄 포리스트",
      Roma: "AS 로마",
      "Sporting CP": "스포르팅 CP",
      "Young Boys": "영 보이스",
      "South African Premiership": "남아프리카 프리미어십",
      "Scottish Premiership": "스코티시 프리미어십",
      "Slovenian PrvaLiga": "슬로베니아 프르바리가",
      "Major League Soccer": "메이저리그 사커(MLS)",
      "Armenian Premier League": "아르메니아 프리미어리그",
      "Belgian Pro League": "벨기에 프로리그",
      "Saudi First Division League": "사우디 2부리그",
      Forward: "공격수",
      "Centre-back": "센터백",
      "Right-back": "오른쪽 풀백",
      "Left-back": "왼쪽 풀백",
      "Tempo control": "템포 조절",
      "High press": "전방 압박",
      "Set pieces": "세트피스",
      "Direct outlets": "빠른 전진 패스"
    }
  };
  const exactFailures = Object.entries(exactExpectations[language])
    .filter(([source, expected]) => structuredTranslations[source] !== expected)
    .map(
      ([source, expected]) =>
        `${source} -> ${structuredTranslations[source] || "(missing)"} (expected ${expected})`
    );
  check(
    "structured glossary",
    exactFailures.length === 0,
    `${language} semantic entity/football-term regressions: ${formatSamples(exactFailures)}`,
    "Correct the checked-in structured glossary and regenerate the current content overlay."
  );

  const styleDrift = teamStyleTags
    .filter(
      (tag) =>
        !appPack?.entities?.styleTerms?.[tag] ||
        structuredTranslations[tag] !== appPack.entities.styleTerms[tag]
    )
    .map(
      (tag) =>
        `${tag}: ${structuredTranslations[tag] || "(missing)"} / ${appPack?.entities?.styleTerms?.[tag] || "(missing app term)"}`
    );
  check(
    "structured glossary",
    styleDrift.length === 0,
    `${language} team style tags drift from the reviewed app glossary: ${formatSamples(styleDrift)}`,
    "Reuse the reviewed style-term map in the generated current-content overlay."
  );

  if (language === "ko") {
    const newsroomClubSamples = [
      "Athletic Bilbao",
      "Celtic",
      "Crystal Palace",
      "Nice",
      "Nottingham Forest",
      "Roma",
      "Sporting CP",
      "Young Boys"
    ];
    const missingHangul = newsroomClubSamples
      .filter((club) => !/\p{Script=Hangul}/u.test(structuredTranslations[club] || ""))
      .map((club) => `${club} -> ${structuredTranslations[club] || "(missing)"}`);
    check(
      "structured glossary",
      missingHangul.length === 0,
      `Korean common-club newsroom labels lack Hangul: ${formatSamples(missingHangul)}`
    );
  }
}

async function auditContentOverlays(language, requiredSources, options = {}) {
  for (const [scope, contract] of Object.entries(CONTENT_SCOPES)) {
    const sourcePath = `data/locales/${language}/${contract.sourceFile}`;
    const modulePath = `locales/${language}/${contract.moduleFile}`;
    const sourceExists = await fileExists(sourcePath);
    const moduleExists = await fileExists(modulePath);
    check(
      `content overlay: ${scope}`,
      sourceExists,
      `${language} is missing ${sourcePath}`,
      `Generate the complete ${scope} source dictionary before exposing ${language}.`
    );
    check(
      `content overlay: ${scope}`,
      moduleExists,
      `${language} is missing ${modulePath}`,
      `Generate the cacheable browser module from ${sourcePath}.`
    );

    let source = null;
    let modulePayload = null;
    if (sourceExists) {
      try {
        source = await readJson(sourcePath);
      } catch (error) {
        record("error", `content overlay: ${scope}`, `${sourcePath} could not load: ${error.message}`);
      }
    }
    if (moduleExists) {
      try {
        modulePayload = getContentModulePayload(await importFresh(modulePath));
      } catch (error) {
        record("error", `content overlay: ${scope}`, `${modulePath} could not load: ${error.message}`);
      }
      check(
        `content overlay: ${scope}`,
        Boolean(modulePayload),
        `${modulePath} must export metadata and a translations object`
      );
    }

    const expectedFingerprint = getSourceFingerprint(requiredSources[scope]);
    const requiredSourceSet = new Set(requiredSources[scope]);
    for (const [owner, payload] of [[sourcePath, source], [modulePath, modulePayload]]) {
      if (!payload) {
        continue;
      }
      check(
        `content overlay: ${scope}`,
        payload.schemaVersion === 1,
        `${owner} schemaVersion must be 1`
      );
      check(
        `content overlay: ${scope}`,
        payload.language === language,
        `${owner} language must be ${language}`
      );
      check(
        `content overlay: ${scope}`,
        payload.scope === scope,
        `${owner} scope must be ${scope}`
      );
      check(
        `content overlay: ${scope}`,
        payload.sourceFingerprint === expectedFingerprint,
        `${owner} sourceFingerprint is stale. Expected ${expectedFingerprint}, found ${payload.sourceFingerprint || "(missing)"}`,
        "Regenerate the overlay after any English source-data change."
      );
      check(
        `content overlay: ${scope}`,
        payload.translations &&
          typeof payload.translations === "object" &&
          !Array.isArray(payload.translations),
        `${owner} translations must be an object`
      );
    }

    const sourceTranslations = source?.translations || {};
    if (source) {
      const missing = requiredSources[scope].filter(
        (english) =>
          typeof sourceTranslations[english] !== "string" ||
          !sourceTranslations[english].trim()
      );
      const extra = Object.keys(sourceTranslations).filter(
        (english) => !requiredSourceSet.has(english)
      );
      check(
        `content overlay: ${scope}`,
        missing.length === 0,
        `${language} ${scope} content is missing ${missing.length}/${requiredSources[scope].length} required strings: ${formatSamples(missing)}`,
        "Translate every required source string; do not silently fall back to English."
      );
      const authoredPlayerNoteFailures = AUTHORED_PLAYER_NOTE_PROBES
        .filter((probe) => probe.scope === scope)
        .filter(
          (probe) =>
            !String(sourceTranslations[probe.source] || "").includes(
              probe.expected[language]
            )
        )
        .map(
          (probe) =>
            `${probe.source} -> ${sourceTranslations[probe.source] || "(missing)"}`
        );
      check(
        `content overlay: ${scope}`,
        authoredPlayerNoteFailures.length === 0,
        `${language} authored player-note review probes failed: ${formatSamples(
          authoredPlayerNoteFailures
        )}`,
        "Keep one-off player analysis on the reviewed authored-copy path."
      );
      warn(
        `content overlay: ${scope}`,
        extra.length === 0,
        `${language} ${scope} content contains ${extra.length} stale/unreferenced strings: ${formatSamples(extra)}`,
        "Regenerate the source dictionary so deleted English content does not accumulate."
      );

      const nonEnglishSourceKeys = Object.keys(sourceTranslations)
        .filter((english) => /[\p{Script=Han}\p{Script=Hangul}\p{Script=Arabic}]/u.test(english))
        .map((english) => english);
      check(
        `content overlay: ${scope}`,
        nonEnglishSourceKeys.length === 0,
        `${language} ${scope} dictionary has ${nonEnglishSourceKeys.length} non-English source key(s): ${formatSamples(nonEnglishSourceKeys)}`,
        "Fix the canonical collector so localized fields contribute only their English value."
      );
      const identifierSourceKeys = Object.keys(sourceTranslations)
        .filter(isLikelyNonVisibleIdentifier);
      check(
        `content overlay: ${scope}`,
        identifierSourceKeys.length === 0,
        `${language} ${scope} dictionary has ${identifierSourceKeys.length} non-visible identifier/path source key(s): ${formatSamples(identifierSourceKeys)}`,
        "Exclude source ids, hashes, input paths, and generator metadata from the locale payload."
      );

      const untranslated = Object.entries(sourceTranslations)
        .filter(([english, localized]) => {
          if (isLikelyNonVisibleIdentifier(english)) {
            return false;
          }
          const allowsUnchangedProperName =
            english === localized &&
            isLikelyProperName(english) &&
            (
              language === "es" ||
              (
                language === "ko" &&
                (/[^\x00-\x7F]/u.test(english) || /\b[A-Z0-9]{2,}\b/u.test(english))
              )
            );
          const allowsSafeStructuredOfficialFallback =
            language === "ko" &&
            scope === "current" &&
            options.structuredTranslations?.[english] === english;
          const allowsReviewedArchiveSource =
            scope === "archive" &&
            REVIEWED_ARCHIVE_SOURCE_COPY[english]?.[language] === localized;
          if (
            allowsUnchangedProperName ||
            allowsSafeStructuredOfficialFallback ||
            allowsReviewedArchiveSource
          ) {
            return false;
          }
          return isLikelyUntranslatedLongText(english, localized, language);
        })
        .map(([english, localized]) => `${english} -> ${localized}`);
      check(
        `content overlay: ${scope}`,
        untranslated.length === 0,
        `${language} ${scope} content has ${untranslated.length} likely English fallback(s): ${formatSamples(untranslated)}`,
        "Use reviewed country-language prose, not copied English."
      );
      const suspicious = Object.entries(sourceTranslations)
        .filter(([, localized]) => hasSuspiciousPlaceholder(localized))
        .map(([english, localized]) => `${english} -> ${localized}`);
      check(
        `content overlay: ${scope}`,
        suspicious.length === 0,
        `${language} ${scope} content has suspicious placeholders: ${formatSamples(suspicious)}`
      );

      const introducedRepeatedWords = Object.entries(sourceTranslations)
        .filter(([english, localized]) => {
          const repetitions = [
            ...String(localized).matchAll(
              /\b([\p{Letter}][\p{Letter}'’.-]{2,})(?:\s+\1)+\b/giu
            )
          ].map((match) => match[0].toLocaleLowerCase(language));
          return repetitions.some(
            (repetition) => !String(english).toLocaleLowerCase("en").includes(repetition)
          );
        })
        .map(([english, localized]) => `${english} -> ${localized}`);
      check(
        `content overlay: ${scope}`,
        introducedRepeatedWords.length === 0,
        `${language} ${scope} content introduced repeated-word artifacts: ${formatSamples(introducedRepeatedWords)}`,
        "Regenerate the affected strings after checking entity-placeholder restoration."
      );

      const footballTerminologyArtifacts = Object.entries(sourceTranslations)
        .filter(([english, localized]) => {
          if (language === "es") {
            return (
              (/\bcounters?\b/iu.test(english) && /\bcontadores?\b/iu.test(localized)) ||
              (/\b(?:press|pressing)\b/iu.test(english) &&
                !/\bpress report\b/iu.test(english) &&
                /\bprensa\b/iu.test(localized)) ||
              (/\bpitch\b/iu.test(english) && /\blanzamiento\b/iu.test(localized)) ||
              (/\bbox(?: entries)?\b/iu.test(english) && /\bcuadro\b/iu.test(localized)) ||
              (/\bunderdogs?\b/iu.test(english) && /\bperdedores?\b/iu.test(localized)) ||
              (/\bmidfield breaks\b/iu.test(english) && /\bdescansos?\b/iu.test(localized)) ||
              (/\bmatch lens\b/iu.test(english) && /\blente\b/iu.test(localized)) ||
              (/\bscoring route\b/iu.test(english) && /\bruta de puntuación\b/iu.test(localized)) ||
              (/\bdelivery\b/iu.test(english) && /\bparto\b/iu.test(localized)) ||
              (/\bbacklift\b/iu.test(english) && /\bcontrapeso\b/iu.test(localized))
            );
          }
          return (
            (/\bshootouts?\b/iu.test(english) && /총격|벌금/u.test(localized)) ||
            (/\bknockout\b/iu.test(english) && /노카우트/u.test(localized)) ||
            (/\bmatch lens\b/iu.test(english) && /매치 렌즈/u.test(localized)) ||
            (/\bscoring route\b/iu.test(english) && /점수 경로/u.test(localized)) ||
            (/\bmatch spine\b/iu.test(english) && /경기 척추/u.test(localized)) ||
            (/\bclean-sheet\b/iu.test(english) && /(?:청결한|청정) 구조/u.test(localized)) ||
            (/\bdraws?\b/iu.test(english) && /추첨/u.test(localized)) ||
            (/\bforward\b/iu.test(english) && /투수/u.test(localized)) ||
            (/\bequalizer\b/iu.test(english) && /평등기/u.test(localized)) ||
            (/\bstruck first\b/iu.test(english) && /먼저 공격/u.test(localized)) ||
            (/\banswered\b/iu.test(english) && /대신하기 전에/u.test(localized)) ||
            (/\bverified senior series\b/iu.test(english) && /검증된 성인 시리즈/u.test(localized)) ||
            (
              /\b(?:press|pressing|high-pressure)\b/iu.test(english) &&
              /언론/u.test(localized)
            ) ||
            (/\bcounter timing\b/iu.test(english) && /카운터 시계/u.test(localized)) ||
            (
              /\b(?:penalty area|penalty-box|box entries|around the box)\b/iu.test(english) &&
              /상자/u.test(localized)
            ) ||
            (/\b(?:story|result) bullets\b/iu.test(english) && /총알/u.test(localized)) ||
            (/\bsmoke tests?\b/iu.test(english) && /흡연 테스트/u.test(localized)) ||
            (/\bdelivery\b/iu.test(english) && /배달/u.test(localized)) ||
            (/\bnext pass\b/iu.test(english) && /초기 이미지/u.test(localized)) ||
            (/\bshooting lane\b/iu.test(english) && /총격로/u.test(localized)) ||
            (/\bbacklift\b/iu.test(english) && /(?:반부리치|작은 후반)/u.test(localized))
          );
        })
        .map(([english, localized]) => `${english} -> ${localized}`);
      check(
        `content overlay: ${scope}`,
        footballTerminologyArtifacts.length === 0,
        `${language} ${scope} content contains literal non-football terminology: ${formatSamples(footballTerminologyArtifacts)}`,
        "Use the checked-in football glossary and regenerate the affected translation."
      );

      const unexpectedScript = Object.entries(sourceTranslations)
        .filter(([, localized]) =>
          language === "es"
            ? /[\p{Script=Han}\p{Script=Hangul}]/u.test(localized)
            : /\p{Script=Han}/u.test(localized)
        )
        .map(([english, localized]) => `${english} -> ${localized}`);
      check(
        `content overlay: ${scope}`,
        unexpectedScript.length === 0,
        `${language} ${scope} content contains the wrong writing system: ${formatSamples(unexpectedScript)}`
      );

      const movedMarkers = Object.entries(sourceTranslations)
        .filter(([english, localized]) => {
          const marker = getLeadingMarker(english);
          return marker && getLeadingMarker(localized) !== marker;
        })
        .map(([english, localized]) => `${english} -> ${localized}`);
      check(
        `content overlay: ${scope}`,
        movedMarkers.length === 0,
        `${language} ${scope} content moved or dropped leading story markers: ${formatSamples(movedMarkers)}`,
        "Keep recap markers at the beginning so result-card parsing and visual hierarchy remain stable."
      );

      const changedFacts = Object.entries(sourceTranslations)
        .filter(([english, localized]) => {
          const sourceFacts = getVisibleFactTokens(english);
          return sourceFacts.some((fact) => !String(localized).includes(fact));
        })
        .map(([english, localized]) => `${english} -> ${localized}`);
      check(
        `content overlay: ${scope}`,
        changedFacts.length === 0,
        `${language} ${scope} content changed or dropped numeric facts: ${formatSamples(changedFacts)}`,
        "Translations must preserve scores, minutes, years, rankings, percentages, and counts."
      );

      const entityFidelityIssues = getContentEntityFidelityIssues(
        language,
        sourceTranslations,
        options.provenanceEntries,
        options.teams,
        options.appPack,
        scope === "current"
          ? new Set(Object.keys(options.structuredTranslations || {}))
          : new Set()
      );
      check(
        `content overlay: ${scope}`,
        entityFidelityIssues.length === 0,
        `${language} ${scope} content does not preserve newsroom player/team names: ${formatSamples(entityFidelityIssues)}`,
        "Use the checked-in player-name provenance and team entity maps when assembling translated prose."
      );

      if (scope === "current") {
        const structuredMismatches = Object.entries(
          options.structuredTranslations || {}
        )
          .filter(([english]) => requiredSourceSet.has(english))
          .filter(([english, expected]) => sourceTranslations[english] !== expected)
          .map(
            ([english, expected]) =>
              `${english}: expected ${expected}; found ${sourceTranslations[english] || "(missing)"}`
          );
        check(
          "structured current content",
          structuredMismatches.length === 0,
          `${language} current source does not apply the canonical structured glossary: ${formatSamples(structuredMismatches)}`,
          "Run the locale content sync after changing profile clubs, leagues, roles, skills, or team style tags."
        );

        const reviewedCopyMismatches = getReviewedCurrentCopyMismatches(
          language,
          sourceTranslations
        );
        check(
          "current factual match copy",
          reviewedCopyMismatches.length === 0,
          `${language} current source differs from reviewed match-report copy: ${formatSamples(reviewedCopyMismatches)}`,
          "Run the locale content sync after changing current result stories or authored Catch Up cards."
        );

        const deterministicCopyMismatches =
          getDeterministicCurrentFactualCopyMismatches(
            language,
            sourceTranslations,
            options.factualSources
          );
        check(
          "current factual match copy",
          deterministicCopyMismatches.length === 0,
          `${language} current match copy is outside the deterministic football templates: ${formatSamples(deterministicCopyMismatches)}`,
          "Keep every current result-story bullet, result highlight, and authored Catch Up field in the deterministic locale pipeline."
        );

        const terminologyIssues = getCurrentFactualTerminologyIssues(
          language,
          sourceTranslations,
          options.factualSources
        );
        check(
          "current factual match terminology",
          terminologyIssues.length === 0,
          `${language} current match copy violates football terminology invariants: ${formatSamples(terminologyIssues)}`,
          "Use the deterministic match-copy templates for rounds, substitutes, draws, penalties, scoring verbs, leads, and Group I."
        );

        const availabilityArtifacts = Object.entries(sourceTranslations)
          .filter(([, localized]) =>
            language === "es"
              ? /\bdesaparecid[oa]s?\b|\bcordón de la corva\b/iu.test(localized)
              : /실종|사용할 수 없습니다/u.test(localized)
          )
          .map(([english, localized]) => `${english} -> ${localized}`);
        check(
          "current player availability",
          availabilityArtifacts.length === 0,
          `${language} availability copy contains literal or non-newsroom wording: ${formatSamples(availabilityArtifacts)}`,
          "Use the reviewed injury, suspension, omission, and probable-lineup newsroom wording."
        );
      }

      metric(
        `${language} ${scope} source`,
        `${Object.keys(sourceTranslations).length}/${requiredSources[scope].length} strings`
      );
    }

    if (source && modulePayload) {
      const moduleTranslations = modulePayload.translations || {};
      const metadataMatches = ["schemaVersion", "language", "scope", "sourceFingerprint"].every(
        (key) => source[key] === modulePayload[key]
      );
      const translationKeys = [...new Set([
        ...Object.keys(sourceTranslations),
        ...Object.keys(moduleTranslations)
      ])].sort();
      const translationMismatch = translationKeys.filter(
        (key) => sourceTranslations[key] !== moduleTranslations[key]
      );
      check(
        `content overlay: ${scope}`,
        metadataMatches && translationMismatch.length === 0,
        `${language} ${scope} source/module parity failed: ${formatSamples(translationMismatch)}`,
        `Regenerate ${modulePath} directly from ${sourcePath}.`
      );

      if (scope === "current") {
        const expectedStructuredTranslations = Object.fromEntries(
          Object.entries(options.structuredTranslations || {})
            .filter(
              ([sourceText, localized]) =>
                sourceText !== localized &&
                !options.appPack?.entities?.styleTerms?.[sourceText]
            )
            .sort(([left], [right]) => left.localeCompare(right, "en"))
        );
        const moduleStructuredTranslations =
          modulePayload.entities?.structuredTranslations || {};
        const structuredKeys = [...new Set([
          ...Object.keys(expectedStructuredTranslations),
          ...Object.keys(moduleStructuredTranslations)
        ])];
        const structuredMismatch = structuredKeys
          .filter(
            (key) =>
              expectedStructuredTranslations[key] !==
              moduleStructuredTranslations[key]
          )
          .map(
            (key) =>
              `${key}: expected ${
                expectedStructuredTranslations[key] || "(omitted)"
              }; found ${moduleStructuredTranslations[key] || "(omitted)"}`
          );
        check(
          "structured current entities",
          structuredMismatch.length === 0,
          `${language} current module structured entity map drifted: ${formatSamples(structuredMismatch)}`,
          "Generate only changed club, league, and position labels; app-pack style terms and identity mappings stay out."
        );
      }
    }

    if (moduleExists) {
      const size = await getPayloadSize(modulePath);
      const budget = CONTENT_PAYLOAD_BUDGETS[scope];
      check(
        "payload hard limit",
        size.gzip <= budget.hard,
        `${modulePath} is ${formatBytes(size.gzip)} gzip; hard limit ${formatBytes(budget.hard)}`
      );
      warn(
        "payload budget",
        size.gzip <= budget.soft,
        `${modulePath} is ${formatBytes(size.gzip)} gzip; target ${formatBytes(budget.soft)}`
      );
      metric(`${language} ${scope} module`, `${formatBytes(size.gzip)} gzip`);
    }
  }
}

async function auditPayloads() {
  const sizes = {};
  for (const [relativePath, budget] of Object.entries(PAYLOAD_BUDGETS)) {
    if (!(await fileExists(relativePath))) {
      continue;
    }
    const size = await getPayloadSize(relativePath);
    sizes[relativePath] = size;
    check(
      "payload hard limit",
      size.gzip <= budget.hard,
      `${relativePath} is ${formatBytes(size.gzip)} gzip; hard limit ${formatBytes(budget.hard)}`
    );
    warn(
      "payload budget",
      size.gzip <= budget.soft,
      `${relativePath} is ${formatBytes(size.gzip)} gzip; target ${formatBytes(budget.soft)}`
    );
    metric(relativePath, `${formatBytes(size.raw)} raw / ${formatBytes(size.gzip)} gzip`);
  }

  for (const language of NEW_LANGUAGE_CODES) {
    const blockingPaths = [
      "locales/player-note-templates.js",
      `locales/${language}/app.js`,
      `locales/${language}/player-names.js`
    ];
    const blockingBase = blockingPaths.reduce(
      (sum, relativePath) => sum + (sizes[relativePath]?.gzip || 0),
      0
    );
    const currentContentPath = `locales/${language}/content-current.js`;
    if (await fileExists(currentContentPath)) {
      const currentContentSize = await getPayloadSize(currentContentPath);
      const blockingTotal = blockingBase + currentContentSize.gzip;
      const chatbotTotal = sizes[`locales/${language}/chatbot.js`]?.gzip || 0;
      const mainPageTotal = blockingTotal + chatbotTotal;
      check(
        "active-language payload",
        blockingTotal <= 600 * 1024,
        `${language} blocking language-switch assets total ${formatBytes(blockingTotal)} gzip; hard limit 600 KB`
      );
      warn(
        "active-language payload",
        blockingTotal <= 250 * 1024,
        `${language} blocking language-switch assets total ${formatBytes(blockingTotal)} gzip; target 250 KB`
      );
      metric(
        `${language} blocking main switch`,
        `${formatBytes(blockingTotal)} gzip including current content and player names`
      );

      check(
        "active-language payload",
        mainPageTotal <= 700 * 1024,
        `${language} complete main-page locale footprint is ${formatBytes(mainPageTotal)} gzip; hard limit 700 KB`
      );
      warn(
        "active-language payload",
        mainPageTotal <= 300 * 1024,
        `${language} complete main-page locale footprint is ${formatBytes(mainPageTotal)} gzip; target 300 KB`
      );
      metric(
        `${language} complete first switch`,
        `${formatBytes(mainPageTotal)} gzip including the asynchronously triggered Ball Boy pack`
      );
    }
  }
}

function auditLazyIsolation(sources) {
  const sourceEntries = [
    ["app.js", sources.app],
    ["report.js", sources.report],
    ["chatbot.js", sources.chatbot],
    ["chatbot-knowledge.js", sources.chatbotKnowledge],
    ["locales/locale-runtime.js", sources.runtime]
  ];
  for (const [owner, source] of sourceEntries) {
    const staticImports = getStaticLocaleImports(source);
    check(
      "lazy locale isolation",
      staticImports.length === 0,
      `${owner} statically imports Spanish/Korean assets: ${staticImports.join(", ")}`,
      "Keep es/ko packs, content, and names behind dynamic import() so English downloads none."
    );
  }
  check(
    "lazy locale isolation",
    !/(?:src|href)=["'][^"']*locales\/(?:es|ko)\//u.test(
      [sources.indexHtml, sources.reportHtml].join("\n")
    ),
    "HTML directly references Spanish/Korean locale assets",
    "The English shell must not preload or script-load unused locale assets."
  );

  const combinedJs = [
    sources.runtime,
    sources.app,
    sources.report,
    sources.chatbot,
    sources.chatbotKnowledge
  ].join("\n");
  for (const language of NEW_LANGUAGE_CODES) {
    for (const moduleFile of ["player-names.js", "player-names-archive.js"]) {
      const escapedFile = moduleFile.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
      check(
        "lazy locale isolation",
        new RegExp(
          `import\\s*\\([\\s\\S]{0,120}locales/${language}/${escapedFile}`,
          "u"
        ).test(sources.app || ""),
        `app.js does not dynamically import locales/${language}/${moduleFile}`,
        moduleFile.includes("archive")
          ? "Load historical player names only when an archive card is opened."
          : "Load current player names only after selecting the locale."
      );
    }
    for (const contract of Object.values(CONTENT_SCOPES)) {
      const moduleName = contract.moduleFile.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
      check(
        "lazy content isolation",
        new RegExp(
          `import\\s*\\([\\s\\S]{0,160}(?:locales/)?${language}/${moduleName}`,
          "u"
        ).test(combinedJs),
        `no dynamic import found for locales/${language}/${contract.moduleFile}`,
        "Load current content only after selecting the locale; load archive/release packs only when those surfaces need them."
      );
    }
  }
  check(
    "Ball Boy lazy player names",
    /ensureBallBoyPlayerNames\(locale,\s*["']current["']\)/u.test(
      sources.chatbotKnowledge || ""
    ) &&
      /ensureBallBoyPlayerNames\(locale,\s*["']archive["']\)/u.test(
        sources.chatbotKnowledge || ""
      ),
    "Ball Boy does not visibly request current and archive player-name scopes independently"
  );
  check(
    "Ball Boy lazy player names",
    !/Promise\.all\(\s*\[\s*loaders?\.current\(\),\s*loaders?\.archive\(\)/u.test(
      sources.chatbotKnowledge || ""
    ),
    "Ball Boy still loads current and archive player-name modules together"
  );
  check(
    "Ball Boy lazy player names",
    /scope === ["']current["'][\s\S]{0,220}buildPlayerIndex/u.test(
      sources.chatbotKnowledge || ""
    ) &&
      /scope === ["']archive["'][\s\S]{0,260}buildHistoricalPlayerIndex/u.test(
        sources.chatbotKnowledge || ""
      ),
    "Ball Boy name loading does not rebuild current and archive indexes independently"
  );
}

function auditUrlAndDocumentContracts(runtime, sources) {
  for (const code of LANGUAGE_CODES) {
    check(
      "language control contract",
      new RegExp(`<option[^>]+value=["']${code}["']`, "u").test(sources.indexHtml || ""),
      `language select is missing option value ${code}`
    );
  }
  check(
    "URL language contract",
    /params\.set\(\s*["']lang["']\s*,\s*currentLanguage\s*\)/u.test(sources.app || ""),
    "app.js does not preserve non-English language in the URL"
  );
  check(
    "document language contract",
    /document\.documentElement\.lang\s*=\s*languageConfig\.htmlLang/u.test(sources.app || ""),
    "app.js does not apply the registry htmlLang to the document"
  );
  check(
    "report language contract",
    /["']en["'][\s\S]{0,120}["']es["'][\s\S]{0,120}["']ko["'][\s\S]{0,120}["']zh["']/u.test(
      sources.report || ""
    ) ||
      LANGUAGE_CODES.every((code) => (sources.report || "").includes(`"${code}"`)),
    "report.js does not visibly accept all four URL/storage language codes"
  );

  for (const code of LANGUAGE_CODES) {
    const config = runtime?.getLanguageConfig?.(code);
    check(
      "URL language contract",
      config?.urlCode === config?.storageCode,
      `${code} URL and storage codes diverge (${config?.urlCode}/${config?.storageCode})`
    );
  }
}

async function auditSharedLoader(runtime) {
  if (typeof runtime?.loadLocaleDomain !== "function") {
    return;
  }
  for (const language of NEW_LANGUAGE_CODES) {
    for (const domain of ["app", "report", "chatbot"]) {
      try {
        const pack = await runtime.loadLocaleDomain(language, domain);
        check(
          "shared locale loader",
          pack?.language === language && pack?.domain === domain,
          `${language}/${domain} loader returned incompatible metadata`
        );
      } catch (error) {
        record(
          "error",
          "shared locale loader",
          `${language}/${domain} failed to load: ${error.message}`,
          "Keep every lazy domain pack compatible with the shared loader contract."
        );
      }
    }
  }
}

function auditSharedDataIsolation(data, appSource) {
  const localeSpecificKeys = [];
  function visit(value, owner = "") {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${owner}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }
    for (const [key, item] of Object.entries(value)) {
      const childOwner = owner ? `${owner}.${key}` : key;
      if (/(?:Es|Ko)$/u.test(key)) {
        localeSpecificKeys.push(childOwner);
      }
      visit(item, childOwner);
    }
  }
  for (const [name, value] of Object.entries(data)) {
    visit(value, name);
  }
  check(
    "shared data isolation",
    localeSpecificKeys.length === 0,
    `shared JSON embeds Spanish/Korean suffix fields: ${formatSamples(localeSpecificKeys)}`,
    "Keep es/ko editorial copy in lazy locale overlays instead of making every visitor download it."
  );

  const localizeFunction = String(appSource || "").match(
    /function localizeRenderedText\([^)]*\)\s*\{[\s\S]{0,500}/u
  )?.[0] || "";
  check(
    "render performance",
    /currentLanguage\s*!==\s*["']zh["']/u.test(localizeFunction),
    "the whole-page DOM text walker is no longer visibly restricted to legacy Chinese mode",
    "Spanish and Korean should localize at render time, not rescan the page after every mutation."
  );
}

function auditStructuredH2hLocalization(
  data,
  appPacks,
  currentContentModules,
  appSource
) {
  const h2hSummaries = (data.fixtures?.fixtures || [])
    .map((fixture) => fixture?.h2h?.summary)
    .filter((summary) => typeof summary === "string" && summary.trim());

  for (const language of NEW_LANGUAGE_CODES) {
    const translations = currentContentModules[language]?.CONTENT_TRANSLATIONS || {};
    const shippedSummaries = h2hSummaries.filter((summary) => translations[summary]);
    check(
      "structured H2H localization",
      shippedSummaries.length === 0,
      `${language} current overlay still ships raw H2H prose: ${formatSamples(shippedSummaries)}`,
      "Build H2H sentences from result counts so every fixture uses one reviewed newsroom template."
    );

    const formatter = appPacks[language]?.helpers?.formatAppMessage;
    const recordSample = formatter?.("h2h-record", {
      away: language === "es" ? "Corea del Sur" : "대한민국",
      awayWins: 3,
      coverageStatus: "unknown",
      draws: 1,
      goals: 14,
      home: language === "es" ? "México" : "멕시코",
      homeWins: 2,
      total: 6
    });
    const emptySample = formatter?.("h2h-none", {
      away: language === "es" ? "Corea del Sur" : "대한민국",
      home: language === "es" ? "México" : "멕시코"
    });
    const hasReviewedRecord =
      language === "es"
        ? /6 enfrentamientos seleccionados.*México, 2 victorias; Corea del Sur, 3 victorias; 1 empate.*registro histórico esté completo/u.test(
            recordSample || ""
          )
        : /남자 A매치 6경기.*멕시코 2승, 대한민국 3승, 무승부 1회.*전체 역사가 완전한지는 확인되지/u.test(
            recordSample || ""
          );
    const hasReviewedEmpty =
      language === "es"
        ? /no devolvió enfrentamientos anteriores.*registro histórico esté completo/iu.test(emptySample || "")
        : /이전 맞대결이 반환되지 않았습니다.*전체 역사가 완전한지는 확인되지/u.test(emptySample || "");
    check(
      "structured H2H localization",
      hasReviewedRecord && hasReviewedEmpty,
      `${language} H2H newsroom formatter failed its selected-record/unknown-empty samples: ${formatSamples([recordSample, emptySample])}`
    );
  }

  check(
    "structured H2H localization",
    /function getPastRecord\(/u.test(appSource || "") &&
      /h2h\.results/u.test(appSource || "") &&
      /formatActiveLocaleMessage\(["']h2h-record["']/u.test(appSource || ""),
    "the main app no longer visibly derives localized H2H copy from structured result records"
  );
  metric(
    "structured H2H",
    `${h2hSummaries.length} fixture summaries handled by shared locale formatters`
  );
}

async function main() {
  const [
    runtimeModule,
    esAppModule,
    koAppModule,
    esReportModule,
    koReportModule,
    esChatbotModule,
    koChatbotModule,
    esHighlightsModule,
    koHighlightsModule,
    esCurrentContentModule,
    koCurrentContentModule,
    esNamesModule,
    koNamesModule,
    esArchiveNamesModule,
    koArchiveNamesModule,
    data,
    appSource,
    reportSource,
    chatbotSource,
    chatbotKnowledgeSource,
    runtimeSource,
    indexHtml,
    reportHtml,
    highlightsHtml,
    highlightsSource,
    provenance,
    playerNameOverrides,
    playerNameTransliterations
  ] = await Promise.all([
    safeImport("locales/locale-runtime.js", "registry"),
    safeImport("locales/es/app.js", "app pack schema"),
    safeImport("locales/ko/app.js", "app pack schema"),
    safeImport("locales/es/report.js", "report pack schema"),
    safeImport("locales/ko/report.js", "report pack schema"),
    safeImport("locales/es/chatbot.js", "Ball Boy pack schema"),
    safeImport("locales/ko/chatbot.js", "Ball Boy pack schema"),
    safeImport("locales/es/highlights.js", "highlights pack schema"),
    safeImport("locales/ko/highlights.js", "highlights pack schema"),
    safeImport("locales/es/content-current.js", "current content schema"),
    safeImport("locales/ko/content-current.js", "current content schema"),
    safeImport("locales/es/player-names.js", "player-name generated module"),
    safeImport("locales/ko/player-names.js", "player-name generated module"),
    safeImport("locales/es/player-names-archive.js", "player-name generated module"),
    safeImport("locales/ko/player-names-archive.js", "player-name generated module"),
    loadRequiredData(),
    readText("app.js"),
    readText("report.js"),
    readText("chatbot.js"),
    readText("chatbot-knowledge.js"),
    readText("locales/locale-runtime.js"),
    readText("index.html"),
    readText("report.html"),
    readText("highlights.html"),
    readText("highlights.js"),
    readJson("data/locales/player-name-provenance.json"),
    readJson("data/locales/player-name-overrides.json"),
    readJson("data/locales/player-name-transliterations.json")
  ]);

  const runtime = runtimeModule || {};
  const appPacks = {
    es: esAppModule?.default,
    ko: koAppModule?.default
  };
  const reportPacks = {
    es: esReportModule?.default,
    ko: koReportModule?.default
  };
  const chatbotPacks = {
    es: esChatbotModule?.default,
    ko: koChatbotModule?.default
  };
  const highlightsPacks = {
    es: esHighlightsModule?.default,
    ko: koHighlightsModule?.default
  };
  const currentContentModules = {
    es: esCurrentContentModule,
    ko: koCurrentContentModule
  };
  const playerNames = {
    es: {
      current: esNamesModule?.ES_PLAYER_NAME_TRANSLATIONS || {},
      archive: esArchiveNamesModule?.ES_ARCHIVE_PLAYER_NAME_TRANSLATIONS || {}
    },
    ko: {
      current: koNamesModule?.KO_PLAYER_NAME_TRANSLATIONS || {},
      archive: koArchiveNamesModule?.KO_ARCHIVE_PLAYER_NAME_TRANSLATIONS || {}
    }
  };
  const providerCoverage = getCurrentPlayerNameAliasCoverage(rootDir);
  const structuredGlossary = readStructuredContentGlossary(rootDir);
  const structuredTranslations = Object.fromEntries(
    NEW_LANGUAGE_CODES.map((language) => [
      language,
      getStructuredContentTranslations(
        language,
        rootDir,
        appPacks[language]
      )
    ])
  );
  const factualSources = collectCurrentFactualCopySources(
    data.fixtures,
    data.tournament
  );

  auditRegistry(runtime);
  await auditSharedLoader(runtime);
  auditProviderNameCoverage(provenance, providerCoverage);
  for (const language of NEW_LANGUAGE_CODES) {
    auditAppPack(language, appPacks[language], runtime);
    auditReportPack(language, reportPacks[language]);
    auditBallBoyPack(language, chatbotPacks[language]);
    auditHighlightsPack(
      language,
      highlightsPacks[language],
      highlightsHtml,
      highlightsSource
    );
    auditBallBoyCurrentEntities(
      language,
      chatbotPacks[language],
      data.playerProfiles,
      currentContentModules[language],
      structuredTranslations[language],
      chatbotKnowledgeSource
    );
    auditPlayerNames(
      language,
      provenance,
      {
        current: data.playerProfiles,
        coaches: data.coachProfiles,
        archive: data.historicalPlayerProfiles
      },
      playerNames[language],
      providerCoverage,
      playerNameOverrides,
      playerNameTransliterations
    );
    auditStructuredCurrentGlossary(
      language,
      structuredGlossary,
      appPacks[language],
      structuredTranslations[language],
      data
    );
  }
  auditAppPackParity(appPacks.es, appPacks.ko);
  auditReportPackParity(reportPacks.es, reportPacks.ko);
  auditBallBoyParity(chatbotPacks.es, chatbotPacks.ko);
  auditHighlightsPackParity(highlightsPacks.es, highlightsPacks.ko);
  auditBallBoyTimeZoneLocaleContract(chatbotSource, chatbotPacks);
  auditSharedDataIsolation(data, appSource);
  auditStructuredH2hLocalization(
    data,
    appPacks,
    currentContentModules,
    appSource
  );

  const requiredSourceSets = collectLocaleContentScopes();
  for (const language of NEW_LANGUAGE_CODES) {
    auditPlayerSkillTemplates(
      language,
      appPacks[language],
      data.playerProfiles,
      data.historicalPlayerProfiles,
      data.teams,
      requiredSourceSets,
      currentContentModules[language],
      appSource
    );
    auditPlayerNoteTemplates(
      language,
      appPacks[language],
      data.playerProfiles,
      data.historicalPlayerProfiles,
      playerNames[language],
      requiredSourceSets,
      appSource
    );
  }
  const requiredSources = Object.fromEntries(
    Object.entries(requiredSourceSets).map(([scope, values]) => [
      scope,
      [...values].sort((left, right) => left.localeCompare(right, "en"))
    ])
  );
  await auditHistoricalLocaleArchitecture(
    data,
    requiredSources,
    appPacks,
    currentContentModules
  );
  for (const [scope, values] of Object.entries(requiredSources)) {
    const nonEnglish = values.filter((value) =>
      /[\p{Script=Han}\p{Script=Hangul}\p{Script=Arabic}]/u.test(value)
    );
    check(
      "content source collector",
      nonEnglish.length === 0,
      `${scope} collector emitted non-English source strings: ${formatSamples(nonEnglish)}`,
      "Collect only the English leaf from localized source objects."
    );
    const identifiers = values.filter(isLikelyNonVisibleIdentifier);
    check(
      "content source collector",
      identifiers.length === 0,
      `${scope} collector emitted non-visible identifiers: ${formatSamples(identifiers)}`,
      "Exclude enum keys, generator ids, hashes, and source metadata before creating locale dictionaries."
    );
  }
  metric(
    "required content",
    `${requiredSources.current.length} current/future, ${requiredSources.archive.length} archive, ${requiredSources.release.length} release strings`
  );
  metric(
    "fixture coverage",
    `${data.fixtures?.fixtures?.length || 0} current/future matches, ${data.history?.fixtures?.length || 0} past World Cup matches`
  );
  for (const language of NEW_LANGUAGE_CODES) {
    await auditContentOverlays(language, requiredSources, {
      appPack: appPacks[language],
      provenanceEntries: provenance?.names?.[language] || {},
      structuredTranslations: structuredTranslations[language],
      factualSources,
      teams: data.teams
    });
  }

  const sources = {
    app: appSource,
    report: reportSource,
    chatbot: chatbotSource,
    chatbotKnowledge: chatbotKnowledgeSource,
    runtime: runtimeSource,
    indexHtml,
    reportHtml
  };
  auditLazyIsolation(sources);
  auditUrlAndDocumentContracts(runtime, sources);
  await auditPayloads();

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  console.log(
    `Locale audit completed: ${checkCount} checks, ${errors.length} blocker(s), ${warnings.length} warning(s).`
  );
  for (const item of metrics) {
    console.log(`  · ${item.label}: ${item.value}`);
  }
  if (issues.length) {
    console.log("");
  }
  for (const issue of issues) {
    const label = issue.severity === "error" ? "BLOCKER" : "WARNING";
    console.log(`${label} [${issue.area}] ${issue.detail}`);
    if (issue.remediation) {
      console.log(`  Fix: ${issue.remediation}`);
    }
  }

  if (errors.length) {
    process.exitCode = 1;
  }
}

await main();
