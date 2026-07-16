const count = (value, noun) => `${value}${noun}`;
const hasBatchim = (value) => {
  const last = String(value || "").trim().at(-1) || "";
  const code = last.codePointAt(0) || 0;
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
};
const topic = (value) => `${value}${hasBatchim(value) ? "은" : "는"}`;
const subject = (value) => `${value}${hasBatchim(value) ? "이" : "가"}`;
const object = (value) => `${value}${hasBatchim(value) ? "을" : "를"}`;
const withNoun = (value) => `${value}${hasBatchim(value) ? "과" : "와"}`;
const direction = (value) => {
  const text = String(value || "");
  const last = text.trim().at(-1) || "";
  if (/\d/u.test(last)) {
    return `${text}${["0", "3", "6"].includes(last) ? "으로" : "로"}`;
  }
  const code = last.codePointAt(0) || 0;
  const finalConsonant =
    code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 : 0;
  return `${text}${finalConsonant && finalConsonant !== 8 ? "으로" : "로"}`;
};

const copy = {
  assistantName: "볼보이",
  status: "축구에 관해 물어보세요",
  initialMessage: "선수, 국가대표팀, 경기, 규칙에 관해 물어볼 수 있어요.",
  open: "볼보이 열기",
  chatLabel: "볼보이 채팅",
  reset: "새 대화 시작",
  newChat: "새 대화",
  close: "볼보이 닫기",
  suggestedQuestions: "추천 질문",
  suggestions: ["오프사이드를 설명해 줘", "시간대 바꾸기", "아르헨티나는 어떻게 뛰어?", "오류 제보"],
  showMore: "볼보이 답변 더 보기",
  moreBelow: "아래에 내용이 더 있어요",
  askLabel: "볼보이에게 질문하기",
  placeholder: "축구에 관해 물어보세요…",
  send: "질문 보내기",
  thinking: "볼보이가 생각하고 있어요",
  followUps: "이어지는 질문",
  country: "국가대표팀",
  player: "선수",
  match: "경기",
  ruleSimple: "쉽게 보는 규칙",
  whatIKnow: "물어볼 수 있는 내용",
  whichPlayer: "어느 선수인가요?",
  dataProblem: "데이터 문제",
  tryAgain: "다시 시도",
  countryUnavailable: "국가대표팀 정보 없음",
  theirCountry: "소속 국가대표팀",
  currentWorldCup: "이번 월드컵",
  pastWorldCups: "역대 월드컵",
  playerFallback: "선수",
  playerOverviewIntro: (name) => `${name}에 대해 조금 더 알려드릴게요.`,
  flag: "국기",
  officialLaw: "IFAB 공식 규칙 보기 ↗",
  worldCupStats: "월드컵 기록과 선수 정보",
  thisWorldCup: "이번 월드컵",
  worldCupArchive: "월드컵 기록",
  worldCupEditions: "출전 월드컵",
  featuredMatches: "주요 경기",
  playerDetails: "선수 정보",
  goals: "득점",
  assists: "도움",
  recordedAssists: (value) => `기록된 도움 ${value}개`,
  assistsTitle: "월드컵 경기 이벤트에 기록된 도움입니다.",
  age: "나이",
  estimatedValue: "추정 가치",
  value: "시장 가치",
  estimatedValueTitle: "출처가 명시된 공개 선수 자료를 바탕으로 추정한 시장 가치입니다.",
  valueTitle: "출처가 명시된 공개 선수 자료의 시장 가치입니다.",
  prime: "최고",
  signatureTraits: "주요 특징",
  threeTraits: "주요 특징 3가지",
  readPlay: "플레이 읽기",
  whyWatch: "주목할 이유",
  lastMatch: "이전 경기",
  nextMatch: "다음 경기",
  score: (home, away) => `스코어 ${home}-${away}`,
  penaltiesScore: (home, away) => `승부차기 ${home}-${away}`,
  versus: "대결",
  pens: "승부차기",
  fifaRank: (rank, year) => `FIFA 랭킹 ${rank}위${year ? ` (${year})` : ""}`,
  group: (group) => `${group}조`,
  groupPosition: (position, points) => `조 ${position}위 · 승점 ${points}`,
  recentForm: "최근 대회 성적",
  form: "최근 성적",
  resultLabels: {
    draw: "무승부",
    loss: "패",
    "shootout-loss": "승부차기 탈락 · 무승부로 집계",
    "shootout-win": "승부차기 진출 · 무승부로 집계",
    win: "승"
  },
  adaptMatch: "경기에 맞춰 변화",
  keyPlayers: "핵심 선수",
  topScorer: "최다 득점자",
  goalCount: (value) => `${value}골`,
  fullRecord: "대회 전체 성적",
  wins: "승",
  draws: "무",
  losses: "패",
  goalsBalance: (scored, conceded) => `${scored}득점 · ${conceded}실점`,
  onPenalties: "승부차기",
  advancedOnce: "1회 진출",
  advancedTimes: (value) => `${value}회 진출`,
  exitedOnce: "1회 탈락",
  exitedTimes: (value) => `${value}회 탈락`,
  shootoutDrawNote: "승부차기 경기는 승-무-패에서 무승부로 집계합니다.",
  howTheyPlay: "플레이 스타일",
  teamStyleFlow: "팀 전개 방식",
  afterPenalties: "승부차기 종료",
  afterExtraTime: "연장 종료",
  fullTime: "경기 종료",
  live: "진행 중",
  penalties: "승부차기",
  goalTimeline: "득점 타임라인",
  scoringTeam: "득점 팀",
  assist: "도움",
  penaltyShort: "PK",
  matchChanges: "주요 장면",
  playPlans: "예상 경기 운영",
  currentComparison: "이번 대회 비교",
  pastMeetings: "역대 맞대결",
  prediction90: "검증된 90분 결과 전망",
  verifiedH2hSource: "검증된 맞대결 출처 ↗",
  verifiedPredictionSource: "검증된 전망 출처 ↗",
  noH2h: "이 경기 전까지 검증된 성인 국가대표 맞대결 기록이 없습니다.",
  checkingH2h: "이전 맞대결 기록을 확인하고 있습니다.",
  beforeMatch: "경기 전 맞대결",
  verifiedHighlights: "검증된 공식 하이라이트 보기",
  official: "공식",
  tbd: "미정",
  scoreAria: (home, away) => `${home}대 ${away}`,
  flowAriaSeparator: "; ",
  watchListTitle: "주목할 선수",
  languageActionIntro: "바꿀 수 있어요. 오른쪽 위 설정에서도 언어를 변경할 수 있습니다.",
  timeZoneActionIntro: "바꿀 수 있어요. 오른쪽 위 설정에서도 시간대를 변경할 수 있습니다.",
  timeZoneClarification: "어느 시간대를 사용할까요? 오른쪽 위 설정에서도 선택할 수 있습니다.",
  timeZoneRegionClarification: (region) => `${region}의 어느 시간대를 사용할까요?`,
  timeZoneUnmatched: (location) => `‘${location}’을 하나의 시간대로 특정하지 못했어요. 가까운 주요 도시를 입력하거나 설정에서 선택해 주세요.`,
  switchLanguage: (language) => `${direction(language)} 변경`,
  switchTimeZone: (timeZone) => `${direction(timeZone)} 변경`,
  openSettings: "설정 열기",
  languageAlreadySet: (language) => `이미 ${object(language)} 사용하고 있어요. 오른쪽 위 설정에서도 언어를 변경할 수 있습니다.`,
  timeZoneAlreadySet: (timeZone) => `이미 ${object(timeZone)} 사용하고 있어요. 오른쪽 위 설정에서도 시간대를 변경할 수 있습니다.`,
  languageChanged: (language) => `언어를 ${direction(language)} 변경했습니다.`,
  timeZoneChanged: (timeZone) => `시간대를 ${direction(timeZone)} 변경했습니다.`,
  unsupportedLanguage: "현재 영어, 중국어, 스페인어, 한국어를 지원합니다.",
  unsupportedTimeZone: "아직 지원하지 않는 시간대입니다.",
  reportIssue: "오류 제보",
  errorText: "데이터를 불러오지 못했어요. 다시 시도해 주세요.",
  errorFollowUps: []
};

const teamNames = {
  ALG: "알제리", ARG: "아르헨티나", AUS: "호주", AUT: "오스트리아", BEL: "벨기에",
  BIH: "보스니아 헤르체고비나", BRA: "브라질", CAN: "캐나다", CIV: "코트디부아르",
  COD: "콩고민주공화국", COL: "콜롬비아", CPV: "카보베르데", CRO: "크로아티아",
  CUW: "퀴라소", CZE: "체코", ECU: "에콰도르", EGY: "이집트", ENG: "잉글랜드",
  ESP: "스페인", FRA: "프랑스", GER: "독일", GHA: "가나", HAI: "아이티",
  IRN: "이란", IRQ: "이라크", JOR: "요르단", JPN: "일본", KOR: "대한민국",
  KSA: "사우디아라비아", MAR: "모로코", MEX: "멕시코", NED: "네덜란드",
  NOR: "노르웨이", NZL: "뉴질랜드", PAN: "파나마", PAR: "파라과이", POR: "포르투갈",
  QAT: "카타르", RSA: "남아프리카공화국", SCO: "스코틀랜드", SEN: "세네갈", SUI: "스위스",
  SWE: "스웨덴", TUN: "튀니지", TUR: "튀르키예", URU: "우루과이", USA: "미국",
  UZB: "우즈베키스탄"
};

const timeZoneNames = {
  UTC: "협정 세계시",
  "America/Los_Angeles": "로스앤젤레스",
  "America/Denver": "덴버",
  "America/Chicago": "시카고",
  "America/New_York": "뉴욕",
  "America/Phoenix": "피닉스",
  "America/Anchorage": "앵커리지",
  "Pacific/Honolulu": "호놀룰루",
  "America/Vancouver": "밴쿠버",
  "America/Edmonton": "에드먼턴",
  "America/Winnipeg": "위니펙",
  "America/Toronto": "토론토",
  "America/Halifax": "핼리팩스",
  "America/St_Johns": "세인트존스",
  "America/Noronha": "페르난두 지 노로냐",
  "America/Mexico_City": "멕시코시티",
  "America/Tijuana": "티후아나",
  "America/Chihuahua": "치와와",
  "America/Cancun": "칸쿤",
  "America/Sao_Paulo": "상파울루",
  "America/Cuiaba": "쿠이아바",
  "America/Manaus": "마나우스",
  "America/Rio_Branco": "히우브랑쿠",
  "America/Buenos_Aires": "부에노스아이레스",
  "America/Santiago": "산티아고",
  "Pacific/Easter": "이스터섬",
  "America/Guayaquil": "과야킬",
  "Pacific/Galapagos": "갈라파고스 제도",
  "Europe/London": "런던",
  "Europe/Paris": "파리",
  "Europe/Madrid": "마드리드",
  "Europe/Lisbon": "리스본",
  "Atlantic/Madeira": "마데이라",
  "Atlantic/Azores": "아조레스",
  "Atlantic/Canary": "카나리아 제도",
  "Europe/Kaliningrad": "칼리닌그라드",
  "Europe/Moscow": "모스크바",
  "Asia/Yekaterinburg": "예카테린부르크",
  "Asia/Omsk": "옴스크",
  "Asia/Krasnoyarsk": "크라스노야르스크",
  "Asia/Irkutsk": "이르쿠츠크",
  "Asia/Yakutsk": "야쿠츠크",
  "Asia/Vladivostok": "블라디보스토크",
  "Asia/Kamchatka": "캄차카",
  "Asia/Shanghai": "상하이",
  "Asia/Jakarta": "자카르타",
  "Asia/Makassar": "마카사르",
  "Asia/Jayapura": "자야푸라",
  "Asia/Seoul": "서울",
  "Asia/Tokyo": "도쿄",
  "Asia/Kolkata": "콜카타",
  "Asia/Singapore": "싱가포르",
  "Australia/Sydney": "시드니",
  "Australia/Brisbane": "브리즈번",
  "Australia/Adelaide": "애들레이드",
  "Australia/Darwin": "다윈",
  "Australia/Perth": "퍼스",
  "Pacific/Auckland": "오클랜드"
};

const coachNames = {
  "Hong Myungbo": "홍명보"
};

const positions = {
  goalkeeper: "골키퍼", defender: "수비수", "centre-back": "센터백", "center-back": "센터백",
  "left-back": "왼쪽 풀백", "right-back": "오른쪽 풀백", midfielder: "미드필더",
  "defensive midfielder": "수비형 미드필더", "central midfielder": "중앙 미드필더",
  "attacking midfielder": "공격형 미드필더", winger: "윙어", "left winger": "왼쪽 윙어",
  "right winger": "오른쪽 윙어", forward: "공격수", striker: "최전방 공격수", player: "선수"
};

const styles = {
  "aerial defending": "공중볼 수비", "aerial duels": "공중볼 경합", "aerial finishing": "헤더 마무리",
  "aerial targets": "공중볼 타깃", "back line command": "수비 라인 지휘", "ball carrying": "볼 운반",
  "ball winning": "볼 탈취", "box command": "페널티 지역 장악", "box entries": "박스 침투",
  "box finishing": "박스 안 마무리", "chance creation": "기회 창출", "chance passes": "위협적인 패스",
  "channel runs": "하프스페이스 침투", "close control": "좁은 공간 볼 컨트롤",
  "counter attacks": "역습", "counter press": "즉시 압박", crossing: "크로스",
  "direct combinations": "직선적인 연계", "direct running": "직선적인 돌파", distribution: "빌드업 패스",
  "early service": "빠른 크로스", "elite pace": "최정상급 스피드",
  "elite penalty box finishing": "최정상급 박스 안 마무리", "final pass": "마지막 패스", finishing: "마무리",
  "first time finishing": "원터치 마무리", "high press": "전방 압박", "hold up play": "포스트 플레이",
  "left channel finishing": "왼쪽 하프스페이스 마무리", "left footed passing": "왼발 패스",
  "long passing": "롱패스", "midfield screening": "중원 보호", "one on one defending": "일대일 수비",
  "overlap timing": "오버래핑 타이밍", "penalty box finishing": "박스 안 마무리", "power runs": "힘 있는 돌파",
  "press resistance": "압박 회피", "progressive passing": "전진 패스", "reaction saves": "반사 신경 선방",
  "recovery defending": "복귀 수비", "recovery speed": "수비 복귀 속도", "second balls": "세컨드볼",
  "set pieces": "세트피스", "set piece delivery": "세트피스 킥", "shot stopping": "슈팅 선방",
  "tempo control": "템포 조절", "through balls": "침투 패스", "transition terror": "전환 공격 위협",
  "transition speed": "공수 전환 속도", "vertical passing": "수직 패스", "wide counters": "측면 역습",
  "wide overloads": "측면 수적 우위", "attacking structure": "공격 전개 구조",
  "counter-attack": "역습", "counter-pressing": "즉시 압박",
  "defensive organization": "수비 조직력", "direct transitions": "빠른 공수 전환",
  "positional discipline": "위치 규율", "possession control": "점유율 관리",
  "set-piece focus": "세트피스 중시", "wing overloads": "측면 수적 우위",
  "youth pipeline": "유소년 연계"
};

const stages = {
  group: "조별리그", "round-of-32": "32강", "round-of-16": "16강", "quarter-finals": "8강",
  "semi-finals": "준결승", "bronze-final": "3·4위전", final: "결승"
};

const rules = {
  shootout: {
    title: "승부차기", lead: "토너먼트 경기가 연장전 뒤에도 비기면 양 팀이 번갈아 페널티킥을 차 진출 팀을 정합니다.",
    flow: [{ value: "120′", label: "동점" }, { value: "⚽", label: "각 5회" }, { value: "1×1", label: "서든데스" }],
    points: [{ title: "첫 다섯 번", text: "각 팀은 서로 다른 선수 다섯 명이 한 번씩 찹니다." }, { title: "그래도 동점이면", text: "한 팀은 성공하고 다른 팀은 실패할 때까지 한 번씩 이어 갑니다." }],
    takeaway: "각 5회 뒤에도 동점이면 한 번씩 이어 갑니다."
  },
  "red-card": {
    title: "레드카드", lead: "레드카드를 받은 선수는 퇴장합니다. 다시 들어올 수 없고 교체 선수로 그 자리를 채울 수도 없습니다.",
    flow: [{ value: "11", label: "선수" }, { value: "🟥", label: "퇴장" }, { value: "10", label: "남은 선수" }],
    points: [{ title: "다이렉트 퇴장", text: "심각한 반칙 한 번으로 곧바로 레드카드를 받을 수 있습니다." }, { title: "경고 누적", text: "한 경기에서 두 번째 옐로카드를 받아도 퇴장합니다." }],
    takeaway: "팀은 한 명이 적은 채로 경기합니다."
  },
  "yellow-card": {
    title: "옐로카드", lead: "옐로카드는 선수나 팀 관계자에게 주는 공식 경고입니다.",
    flow: [{ value: "반칙", label: "무모한 행동" }, { value: "🟨", label: "경고" }, { value: "🟨🟨", label: "이후 퇴장" }],
    points: [{ title: "받는 이유", text: "무모한 반칙, 경기 지연, 판정 항의, 반복 반칙 등이 대표적입니다." }, { title: "두 번째 경고", text: "한 경기에서 옐로카드 두 장을 받으면 레드카드가 되어 퇴장합니다." }],
    takeaway: "한 경기 옐로카드 두 장은 레드카드입니다."
  },
  handball: {
    title: "핸드볼", lead: "공이 손이나 팔에 닿았다고 모두 반칙은 아닙니다. 의도와 팔의 위치가 중요합니다.",
    flow: [{ value: "⚽", label: "공이 옴" }, { value: "💪", label: "팔 동작" }, { value: "📣", label: "심판 판단" }],
    points: [{ title: "대체로 반칙", text: "선수가 의도적으로 손을 쓰거나 팔로 몸을 부자연스럽게 크게 만들면 반칙이 될 수 있습니다." }, { title: "자동 판정은 아님", text: "가까운 거리에서 자연스러운 팔 위치에 우연히 맞았다면 허용될 수 있습니다." }],
    takeaway: "손이나 팔에 닿았다는 사실만으로 반칙은 아닙니다."
  },
  "penalty-kick": {
    title: "페널티킥", lead: "수비 팀이 자기 페널티 지역 안에서 직접 프리킥에 해당하는 반칙을 하면 공격 팀에 페널티킥이 주어집니다.",
    flow: [{ value: "반칙", label: "페널티 지역" }, { value: "11m", label: "페널티 마크" }, { value: "1대1", label: "키커와 골키퍼" }],
    points: [{ title: "준비", text: "공은 페널티 마크에 놓습니다. 킥 순간 골키퍼는 적어도 한 발의 일부가 골라인에 닿거나, 나란하거나, 뒤에 있어야 합니다." }, { title: "다른 선수", text: "다른 선수는 페널티 지역 밖이자 공 뒤쪽에서 기다립니다." }],
    takeaway: "키커가 11m 거리에서 골키퍼와 맞섭니다."
  },
  var: {
    title: "VAR", lead: "VAR은 경기 결과를 바꿀 수 있는 일부 중요한 판정을 주심이 다시 확인하도록 돕습니다.",
    flow: [{ value: "👀", label: "상황 발생" }, { value: "🎥", label: "확인" }, { value: "📣", label: "판정" }],
    points: [{ title: "확인 범위", text: "득점, 페널티킥, 다이렉트 퇴장, 선수 오인입니다." }, { title: "최종 결정", text: "필요하면 주심이 모니터를 본 뒤 최종 판정을 내립니다." }],
    takeaway: "VAR은 조언하고, 주심이 결정합니다."
  },
  "extra-time": {
    title: "연장전", lead: "일부 토너먼트 경기는 90분 뒤 동점이면 30분을 더 치릅니다.",
    flow: [{ value: "90′", label: "동점" }, { value: "+15′", label: "연장 전반" }, { value: "+15′", label: "연장 후반" }],
    points: [{ title: "추가시간과 다름", text: "연장전은 새로 시작하는 15분 두 차례입니다. 추가시간은 각 경기 시간 안에 더합니다." }, { title: "그래도 동점이면", text: "승자를 정해야 하는 대회라면 보통 승부차기로 이어집니다." }],
    takeaway: "연장전은 15분씩 두 차례입니다."
  },
  "stoppage-time": {
    title: "추가시간", lead: "경기 시계가 멈추지 않은 동안 발생한 지연을 보충하기 위해 심판이 각 전·후반 끝에 시간을 더합니다.",
    flow: [{ value: "45′", label: "전반 종료 직전" }, { value: "+4′", label: "추가시간" }, { value: "HT", label: "전반 종료" }],
    points: [{ title: "추가되는 이유", text: "교체, 부상, 득점 세리머니, VAR 확인, 고의 지연 등이 시간을 늘릴 수 있습니다." }, { title: "연장전이 아님", text: "90+4는 정규 90분 뒤 네 번째 추가시간입니다. 연장전은 일부 토너먼트에서 별도로 치르는 30분입니다." }],
    takeaway: "전광판 숫자는 최소 추가시간입니다."
  },
  "group-points": {
    title: "조별리그 승점", lead: "승리하면 3점, 비기면 1점, 패하면 0점을 받습니다.",
    flow: [{ value: "+3", label: "승" }, { value: "+1", label: "무" }, { value: "+0", label: "패" }],
    points: [{ title: "골 득실", text: "득점에서 실점을 뺀 수치로, 승점이 같을 때 흔히 순위를 가르는 기준입니다." }, { title: "그래도 같다면", text: "대회가 미리 발표한 순서대로 다른 타이브레이커를 적용합니다." }],
    takeaway: "승 3 · 무 1 · 패 0"
  },
  substitution: {
    title: "선수 교체", lead: "경기 중 한 선수를 빼고 다른 선수를 투입하는 것입니다.",
    flow: [{ value: "↓", label: "나가는 선수" }, { value: "↔", label: "교체" }, { value: "↑", label: "들어오는 선수" }],
    points: [{ title: "교체 이유", text: "체력 보강, 부상, 전술 변화, 다른 유형의 선수 투입 등이 있습니다." }, { title: "다시 뛸 수 있나", text: "성인 월드컵에서는 교체되어 나온 선수가 같은 경기에 다시 들어갈 수 없습니다." }],
    takeaway: "이 대회에서는 교체되어 나온 선수가 다시 뛸 수 없습니다."
  }
};

const personality = {
  identity: { label: "소개", text: "저는 볼보이예요. 축구를 쉽게 설명합니다." },
  life: { label: "철학", text: "저도 모르겠어요." },
  football: { label: "축구", text: "두 팀이 상대보다 더 많은 골을 넣기 위해 겨룹니다. 대부분의 경기는 90분입니다." },
  "football-special": { label: "축구", text: "시작은 쉽지만 완벽하게 해내기는 어렵습니다." },
  reality: { label: "정체", text: "저는 챗봇이에요." },
  soccer: { label: "용어", text: "축구를 말하는 거군요." },
  "soccer-etymology": { label: "용어", text: "‘Soccer’는 ‘association football’에서 나온 말입니다." },
  "best-player": { label: "최고의 선수", text: "기준에 따라 달라요. 지금, 이번 대회, 아니면 역대 최고인가요?" },
  "best-country": { label: "최고의 대표팀", text: "기준에 따라 달라요. 최근 경기력, 우승 횟수, 아니면 이번 월드컵인가요?" },
  "haaland-denial": { label: "다른 사람", text: "아니요." },
  greeting: { label: "볼보이", text: "안녕하세요. 무엇이든 물어보세요." },
  mood: { label: "볼보이", text: "좋아요." },
  thanks: { label: "볼보이", text: "언제든지요." },
  joke: { label: "볼보이", text: "재미있는 건 없어요." }
};

const offside = {
  intro: "오프사이드는 공격수가 상대 골문 앞에서 패스만 기다리는 상황을 막는 규칙입니다.",
  summary: "동료가 공을 차는 순간을 보세요. 공격수가 상대 진영에 있고 공과 두 번째로 뒤에 있는 상대 선수보다 골라인에 더 가까우면 오프사이드 위치입니다.",
  legend: "P = 패서 · A = 공격수 · D = 수비수 · GK = 골키퍼",
  offside: "오프사이드", tooEarly: "너무 이른 출발", line: "오프사이드 라인",
  offsideAria: "오프사이드 예시. 동료가 공을 차는 순간 공격수가 두 번째로 뒤에 있는 상대 선수의 라인을 넘어 있습니다.",
  offsideExample: "P가 패스할 때 A가 이미 라인을 넘었고 이후 플레이에 관여합니다.",
  onside: "온사이드", legalRun: "정상적인 침투",
  onsideAria: "온사이드 예시. 동료가 공을 차는 순간 공격수가 두 번째로 뒤에 있는 상대 선수와 같은 선상에 있고 이후 앞으로 달립니다.",
  onsideExample: "P가 공을 찰 때 A는 라인과 나란히 있고, 그 뒤에 라인을 넘어갑니다.",
  alsoOnside: "이 경우도 온사이드:", alsoOnsideText: "A가 자기 진영에 있거나 공보다 뒤에 있습니다.",
  noDirect: "곧바로 오프사이드가 되지 않는 재개:", noDirectText: "골킥, 스로인, 코너킥.",
  whySecondLast: "왜 두 번째로 뒤에 있는 선수인가요?", whySecondLastText: "대개 골키퍼가 가장 뒤에 있어, 마지막 필드 플레이어가 오프사이드 라인을 정합니다.",
  involvement: "위치만으로는 반칙이 아닙니다.", involvementText: "A가 공을 플레이하거나 상대와 경합하거나 시야를 가리는 등 플레이에 영향을 줘야 반칙이 됩니다.",
  followUps: ["레드카드를 설명해 줘", "VAR이 뭐야?", "페널티킥을 설명해 줘"]
};

const intents = {
  exact: [
    [/^(?:안녕|안녕하세요)(?: 볼보이)?$/, "hello"], [/^너는 누구야$/, "who are you"],
    [/^(?:삶이 뭐야|인생이 뭐야|삶의 의미가 뭐야)$/, "what is life"],
    [/^축구가 뭐야$/, "what is football"], [/^축구가 왜 특별해$/, "why is football special"],
    [/^(?:너 진짜야|너 사람이야|너 챗봇이야|너 ai야)$/, "are you real"],
    [/^사커가 뭐야$/, "what is soccer"], [/^(?:왜 사커라고 해|사커라는 말은 어디서 왔어)$/, "why is it called soccer"],
    [/^(?:최고의 선수는 누구야|goat는 누구야)$/, "who is the best player"],
    [/^(?:최고의 국가대표팀은 어디야|축구를 가장 잘하는 나라는 어디야)$/, "which country is the best"],
    [/^너 홀란이야$/, "are you haaland"], [/^잘 지내$/, "how are you"],
    [/^(?:뭘|무엇을) 물어볼 수 있어$/, "what can i ask"],
    [/^(?:무엇을 할 수 있어|뭘 할 수 있어|도와줘)$/, "what can you do"],
    [/^(?:고마워|감사합니다)$/, "thanks"],
    [/^(?:농담해 줘|축구 농담해 줘)$/, "tell me a joke"]
  ],
  replacements: [
    [/오프사이드/g, " offside "], [/승부차기/g, " penalty shootout "], [/추가시간|인저리타임/g, " stoppage time "],
    [/연장전/g, " extra time "], [/레드카드|퇴장/g, " red card "], [/옐로카드|경고/g, " yellow card "],
    [/핸드볼|손에 맞/g, " handball "], [/페널티킥|페널티/g, " penalty kick "], [/교체/g, " substitution "],
    [/설명해 줘|설명해줘|뭐야/g, " explain "], [/알려 줘|알려줘|소개해 줘|소개해줘/g, " tell me about "],
    [/몇 골|득점 수/g, " how many goals "], [/도움|어시스트/g, " assists "], [/시장 가치|몸값/g, " market value "],
    [/몇 살|나이/g, " age "], [/생일|출생일/g, " birthday "], [/등번호/g, " shirt number "], [/소속팀|클럽/g, " club "],
    [/포지션|위치/g, " position "], [/어떻게 뛰어|어떻게 플레이|플레이 스타일/g, " play style "],
    [/다음 경기|다음 상대/g, " next match "], [/이전 경기|마지막 경기/g, " last match "],
    [/누가 득점|누가 골/g, " who scored "], [/누가 이겼|결과/g, " who won result "],
    [/누가 이길|승부 예측|전망/g, " who would win prediction "], [/최근 맞대결|마지막 맞대결/g, " last meeting "],
    [/골 득실|득실 차/g, " goal difference "], [/최다 득점자|득점 선두/g, " top scorer "],
    [/상대 전적|맞대결 전적/g, " head to head "], [/주목할 선수|핵심 선수/g, " who should i watch "],
    [/킥오프|시작 시간/g, " kickoff "], [/공식 하이라이트|하이라이트|경기 영상/g, " highlights "],
    [/요약해 줘|요약해줘|한눈에 알려 줘|한눈에 알려줘/g, " tell me about "],
    [/언제|몇 시/g, " when "],
    [/준결승|4강/g, " semi final "], [/8강|준준결승/g, " quarter final "],
    [/월드컵 결승|결승전/g, " world cup final "],
    [/월드컵/g, " world cup "], [/경기/g, " match "], [/ 대 | 대결 | vs /g, " vs "]
  ]
};

const templates = {
  fallbackTeam: "팀", fallbackHome: "홈 팀", fallbackAway: "원정 팀", kickoffPending: "킥오프 시간 미정",
  ownGoal: (name) => `${name}(자책골)`, loanClub: (club, parents) => `${club}(${parents}에서 임대)`, lastClub: (club) => `마지막 소속팀: ${club}`,
  playerRole: {
    goal: "골키퍼는 골문을 지키고 첫 패스로 공격을 시작하기도 합니다.",
    defend: "수비수는 먼저 공격을 막고, 이후 공을 안전하게 전진시킵니다.",
    create: "미드필더는 공을 되찾고 지키며 다음 패스를 찾아 수비와 공격을 잇습니다.",
    "attack-wide": "윙어는 측면에서 출발해 수비수를 공략하고 박스 근처에서 기회를 만들거나 마무리합니다.",
    finish: "공격수는 득점뿐 아니라 수비수를 묶고 공간으로 침투하며 동료와 연계해 슈팅 기회를 만듭니다."
  },
  playerLead: (focus, d) => {
    if (focus === "penalty-goals") return d.penaltyGoals ? `이번 월드컵에서 ${topic(d.name)} 페널티킥으로 ${d.penaltyGoals}골을 넣었습니다.` : `${topic(d.name)} 이번 월드컵에서 페널티킥 득점이 없습니다.`;
    if (focus === "stats") return `이번 월드컵: ${d.goals}골, ${d.assists}도움.`;
    if (focus === "value") return d.marketValue ? `${d.name}의 ${d.estimated ? "추정 " : ""}시장 가치는 ${d.marketValue}입니다.` : `${d.name}의 검증된 시장 가치 정보가 없습니다.`;
    if (focus === "league") return d.club && d.league ? `${topic(d.name)} ${d.club} 소속으로 ${d.league}에서 뛰고 있습니다.` : `${d.name}의 검증된 리그 정보가 없습니다.`;
    if (focus === "number") return d.number !== "" ? `${topic(d.name)} ${d.team}에서 등번호 ${d.number}번으로 등록됐습니다.` : `${d.name}의 확정된 월드컵 등번호가 없습니다.`;
    if (focus === "age") return d.askBirth && d.birthday ? `${topic(d.name)} ${d.birthday}에 태어났습니다.` : d.age != null ? `${topic(d.name)} ${d.age}세입니다.` : `${d.name}의 검증된 생년월일 정보가 없습니다.`;
    if (focus === "club") return d.club ? `${topic(d.name)} ${d.club}${d.league ? `(${d.league})` : ""}에서 뛰고 있습니다.` : `${d.name}의 검증된 클럽 정보가 없습니다.`;
    if (focus === "position") return `${d.name}의 등록 포지션은 ${d.position}입니다.`;
    if (focus === "style") return `${topic(d.name)} ${d.position}입니다.${d.skills ? ` ${object(d.skills)} 주목해 보세요.` : ` ${d.role}`}`;
    return `${topic(d.name)} ${d.team}의 ${d.position}${d.club ? `로, 클럽에서는 ${d.club}` : ""}에서 뛰고 있습니다.`;
  },
  playerFollowUps: (d) => [`${d.name}의 득점과 도움은?`, `${topic(d.name)} 어떻게 뛰어?`, d.team ? `${topic(d.team)} 어떻게 뛰어?` : "무엇을 물어볼 수 있어?"],
  playerNote: (d) => d.skills ? `${d.name}의 ${object(d.skills)} 주목할 만합니다.` : `${topic(d.name)} 경기 흐름에 따라 역할을 바꿉니다.`,
  teamStyle: (kind) => ({ press: "빠르게 공을 되찾고 상대 수비가 정돈되기 전에 공격합니다.", compact: "간격을 좁혀 핵심 공간을 지킨 뒤 빠르게 전환합니다.", possession: "점유율과 템포를 조절하며 공간이 열릴 때까지 차분히 전개합니다.", wide: "목적 있게 전진한 뒤 측면 폭을 활용해 공격합니다.", box: "목적 있게 전진하며 박스 근처에서 몸싸움과 제공권 기회를 만듭니다.", default: "공을 목적 있게 전진시키고 경기 상황에 맞춰 다음 선택을 바꿉니다." }[kind] || "공을 목적 있게 전진시킵니다."),
  countryOverview: (d) => `${topic(d.team)} ${d.played}경기에서 ${d.wins}승 ${d.draws}무 ${d.losses}패, ${d.goalsFor}득점 ${d.goalsAgainst}실점을 기록했습니다.`,
  countryLead: (focus, d) => {
    if (focus === "next") return d.hasNext ? d.nextLead : `${topic(d.team)} 현재 예정된 다음 경기가 없습니다.`;
    if (focus === "top-scorer") return d.topScorer ? `${subject(d.topScorer)} 이번 월드컵 ${d.topGoals}골로 ${d.team} 내 득점 선두입니다.` : d.overview;
    if (focus === "goal-difference") return `${d.team}의 이번 대회 골 득실은 ${d.goalDifference > 0 ? "+" : ""}${d.goalDifference}입니다. ${d.goalsFor}득점, ${d.goalsAgainst}실점입니다.`;
    if (focus === "goals") return `${topic(d.team)} ${d.played}경기에서 ${d.goalsFor}골을 넣고 ${d.goalsAgainst}골을 내줬습니다.`;
    if (focus === "record") return `${topic(d.team)} 이번 월드컵 ${d.played}경기에서 ${d.wins}승을 거뒀습니다.${d.hasShootout ? " 승부차기 경기는 승-무-패에서 무승부로 집계합니다." : ""}`;
    return d.overview;
  },
  countryFollowUps: (d) => [d.player ? `${object(d.player)} 알려 줘` : "", d.hasLast ? `${d.team}의 이전 경기에서는 무슨 일이 있었어?` : "", d.hasNext ? `${d.team}의 다음 상대는?` : `${d.team}에서 주목할 선수는?`].filter(Boolean),
  matchLead: (state, d) => {
    if (state === "live-draw") return `${withNoun(d.home)} ${subject(d.away)} ${direction(`${d.homeScore}-${d.awayScore}`)} 맞서고 있습니다. 경기는 진행 중입니다.`;
    if (state === "live-lead") return `${subject(d.leader)} ${direction(`${d.leaderScore}-${d.trailingScore}`)} 앞서고 있습니다. 경기는 진행 중입니다.`;
    if (state === "live") return `${withNoun(d.home)} ${d.away}의 경기가 진행 중입니다. 아직 검증된 최종 스코어는 없습니다.`;
    if (state === "scheduled") return `${withNoun(d.home)} ${topic(d.away)} ${d.kickoff}에 맞붙습니다. 경기는 아직 시작하지 않았습니다.`;
    if (state === "penalties") return `${subject(d.winner)} ${d.homeScore}-${d.awayScore} 무승부 뒤 승부차기에서 ${direction(`${d.winnerPen}-${d.loserPen}`)} 이겨 진출했습니다.`;
    if (state === "winner") return `${subject(d.winner)}${d.extraTime ? " 연장전 끝에" : ""} ${direction(`${d.winnerScore}-${d.loserScore}`)} 승리했습니다.${d.comeback ? ` ${subject(d.firstTeam)} 먼저 득점했지만 ${subject(d.winner)} 역전했습니다.` : ""}`;
    if (state === "draw") return `${withNoun(d.home)} ${topic(d.away)}${d.extraTime ? " 연장전 끝에" : ""} ${direction(`${d.homeScore}-${d.awayScore}`)} 경기를 마쳤습니다.`;
    return "경기는 종료로 표시됐지만 검증된 스코어가 아직 없습니다.";
  },
  matchFocus: (focus, d) => ({ scorers: d.scorers.length ? `득점 선수: ${d.scorersText}.` : "득점은 없었습니다.", when: `${d.home} 대 ${d.away}: ${d.kickoff}.`, h2h: "이 경기 전 양 팀의 맞대결 기록입니다.", highlights: d.hasHighlights ? "이 경기의 검증된 공식 하이라이트가 있습니다." : "이 경기의 검증된 공식 하이라이트가 아직 없습니다." }[focus] || d.defaultLead),
  matchFollowUps: (d) => [d.completed ? `${d.home} 대 ${d.away}에서 누가 득점했어?` : "", `${topic(d.home)} 어떻게 뛰어?`, `${topic(d.away)} 어떻게 뛰어?`].filter(Boolean),
  recapFirst: (goal) => `${subject(goal.name)} ${goal.minute}에 선제골을 넣었습니다.`,
  recapFinal: (goal) => `${subject(goal.name)} ${goal.minute}에 마지막 골을 넣었습니다.`,
  help: {
    categories: [{ example: "음바페는 몇 골을 넣었어?", icon: "9", title: "선수" }, { example: "아르헨티나는 어떻게 뛰어?", icon: "🇦🇷", title: "국가대표팀" }, { example: "프랑스 대 스페인에서 누가 이겼어?", icon: "1–2", title: "경기" }, { example: "레드카드를 설명해 줘", icon: "🟥", title: "규칙" }],
    followUps: ["킬리안 음바페를 알려 줘", "아르헨티나는 어떻게 뛰어?", "프랑스 대 스페인에서 누가 이겼어?"], lead: "주제를 선택하세요."
  },
  unknown: { followUps: ["오류 제보", "킬리안 음바페를 알려 줘", "스페인은 어떻게 뛰어?"], text: "질문을 이해하지 못했어요. 선수, 국가대표팀, 경기, 규칙에 관해 물어보세요." },
  clarification: (options) => ({ lead: "같은 이름의 선수가 여럿 있어요. 어느 선수인가요?", prompts: options.map((item) => `${object(`${item.name}${item.team ? `(${item.team})` : ""}`)} 알려 줘`) }),
  watch: (d) => ({ title: "주목할 선수", lead: d.requestedTeam ? `${d.requestedTeam}에서 주목할 선수 3명입니다.` : `${d.matchLabel}에서 주목할 선수 3명입니다.`, prompts: d.players.map((name) => `${object(name)} 알려 줘`), fallbackPosition: "선수" }),
  h2hUnavailable: "검증된 성인 국가대표 맞대결 기록을 아직 불러오지 못했습니다.",
  h2hNone: (d) => `${withNoun(d.first)} ${topic(d.second)} 검증된 성인 국가대표 경기에서 만난 적이 없습니다.${d.hasFixture ? " 이번 경기가 첫 맞대결입니다." : " 향후 만나면 첫 맞대결이 됩니다."}`,
  h2hRecord: (d) => `${d.hasFixture ? "이 경기 전까지 " : ""}검증된 성인 국가대표 맞대결에서 ${d.first} ${d.firstWins}승, 무승부 ${d.draws}회, ${d.second} ${d.secondWins}승을 기록했고 총 ${d.goals}골이 나왔습니다.`,
  lastMeetingUnavailable: "가장 최근의 검증된 성인 국가대표 맞대결 기록을 아직 불러오지 못했습니다.",
  lastMeetingDraw: (d) => `가장 최근의 검증된 맞대결에서 ${withNoun(d.home)} ${topic(d.away)} ${d.date}에 ${direction(`${d.homeScore}-${d.awayScore}`)} 비겼습니다.`,
  lastMeetingWin: (d) => `가장 최근의 검증된 맞대결에서 ${subject(d.winner)} ${d.date}에 ${object(d.loser)} ${direction(`${d.winnerScore}-${d.loserScore}`)} 이겼습니다.`,
  hasBeatenYes: (d) => `${topic(d.subject)} 검증된 성인 국가대표 경기에서 ${object(d.opponent)} 이긴 적이 있습니다. 가장 최근 승리는 ${d.date}의 ${d.subjectScore}-${d.opponentScore} 승리입니다.`,
  hasBeatenNo: (d) => `${topic(d.subject)} 검증된 성인 국가대표 맞대결에서 ${object(d.opponent)} 이긴 적이 없습니다.`,
  hasBeatenUnknown: (d) => `${subject(d.subject)} ${object(d.opponent)} 이겼는지 확인할 검증된 맞대결 기록이 충분하지 않습니다.`,
  competition2026: (stage) => `2026 월드컵 · ${stage}`,
  friendly: "친선경기",
  drawLabel: "무승부",
  predictionNoFixture: (d) => `${withNoun(d.first)} ${topic(d.second)} 이번 월드컵에서 맞붙을 일정이 없어 검증된 경기 전망이 없습니다.`,
  predictionFinished: (result) => `경기가 이미 끝났습니다. ${result}`,
  predictionLive: (result) => `경기가 이미 시작됐습니다. ${result}`,
  predictionUnavailable: "이 경기의 검증된 전망을 아직 불러오지 못했습니다.",
  predictionDraw: (d) => `검증된 90분 결과 전망에서 무승부 확률이 ${d.draw}%로 가장 높습니다. ${d.home} 승리 ${d.homeValue}%, ${d.away} 승리 ${d.awayValue}%입니다. 전망은 비공식 자료입니다.`,
  predictionWinner: (d) => `${d.highest}의 90분 승리 확률이 ${d.highestValue}%로 가장 높습니다. 무승부 ${d.draw}%, ${d.other} 승리 ${d.otherValue}%입니다. 전망은 비공식 자료입니다.`,
  matchupNoFixture: (d) => `${withNoun(d.first)} ${topic(d.second)} 이번 월드컵에서 현재 맞붙을 일정이 없습니다.`,
  matchupLabels: { history: "역대 맞대결", last: "최근 맞대결", answer: "맞대결 답변" },
  matchupPrompts: (d) => ({ prediction: "누가 이길까?", last: "최근 맞대결", beaten: `${subject(d.first)} ${object(d.second)} 이긴 적 있어?` }),
  scopeUnsupported: (year) => `대회 전체 데이터는 2026 월드컵을 기준으로 제공합니다. 검증된 맞대결 기록은 활용할 수 있지만 ${year} 월드컵 정보를 추측해서 답하지는 않겠습니다.`,
  coachReply: (d) => {
    const tenure = d.sinceYear ? `${d.sinceYear}년부터 ` : "";
    const traits = d.styles.length ? ` 주요 전술 특징은 ${d.styles.join(" · ")}입니다.` : "";
    return `${topic(d.name)} ${tenure}${d.team} 대표팀을 이끌고 있습니다.${traits}`;
  },
  coachUnavailable: (team) => `${team}의 감독을 하나의 검증된 프로필로 확인하지 못해 추측해서 답하지 않겠습니다.`,
  coachFollowUps: (d) => [`${topic(d.team)} 어떻게 뛰어?`, `${d.team}에서 주목할 선수는?`, `${d.team}의 다음 경기는?`],
  stageSchedule: (d) => d.items.length ? `${d.label}: ${d.items.join(" · ")}.` : `불러온 데이터에는 확정된 ${d.label} 경기가 아직 없습니다.`,
  reportUnsupported: (question) => `볼보이가 아직 지원하지 않는 요청: ${question}`
};

export default {
  schemaVersion: 1,
  code: "ko",
  copy,
  domain: "chatbot",
  language: "ko",
  knowledge: {
    clubs: {},
    coachNames,
    entityPolicies: {
      clubs: "current-content",
      leagues: "current-content"
    },
    intents,
    leagues: {},
    offside,
    personality,
    playerAliases: {},
    playerNames: {},
    positions, rules, stages, styles, teamNames, timeZoneNames, templates
  }
};
