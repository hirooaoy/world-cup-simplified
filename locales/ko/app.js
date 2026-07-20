import {
  getGeneratedPlayerCardCopy,
  getPlayerSkillCategory,
  isGeneratedPlayerCardCopy
} from "../player-note-templates.js";
import { translateCompoundPosition } from "../position-runtime.js";

const UI = {
  adminMessage: "공지 메시지",
  adminMessageDismiss: "메시지 닫기",
  adminMessageLabel: "운영자 알림",
  appName: "월드컵 한눈에",
  appHomeLabel: "월드컵 한눈에 홈",
  calendarNextMonth: "다음 달",
  calendarPrevious: "이전 경기",
  calendarPreviousMonth: "이전 달",
  calendarToday: "오늘",
  calendarWeekdays: ["일", "월", "화", "수", "목", "금", "토"],
  calendarYesterday: "어제",
  catchUp: "한눈에 보기",
  catchUpDialog: "경기 요약",
  chooseMatchDate: "경기 날짜 선택",
  chooseStandingsYear: "순위표 연도 선택",
  clearCountrySearch: "대표팀 검색 지우기",
  countrySearch: "대표팀 경기 검색",
  groups: "조별리그",
  darkMode: "다크 모드",
  language: "언어",
  languageEnglish: "English",
  languageChinese: "中文",
  languageSpanish: "Español",
  languageKorean: "한국어",
  languageLoadFailed: "언어를 변경할 수 없습니다",
  languageSwitching: "언어 변경 중",
  juggleBall: "축구공",
  juggleCurrent: "현재 리프팅 기록",
  juggleRecord: "최고 리프팅 기록",
  juggleRecordAction: "축구공 떨어뜨리기",
  matches: "경기",
  matchDetails: "경기 상세",
  matchDetailsClose: "경기 상세 닫기",
  matchesHeading: "경기 목록 및 선택한 경기 상세",
  matchesList: "경기 목록",
  month: "월",
  past24Hours: "최근 경기",
  reportIssue: "오류 제보",
  searchCountryPlaceholder: "대표팀 검색",
  settings: "설정",
  showYesterday: "최근 경기 보기",
  standings: "순위",
  standingsSections: "순위 섹션",
  standingsSummary: "각 조 1·2위가 진출합니다. 성적이 좋은 조 3위 8개 팀도 32강에 오릅니다.",
  thirdPlaceRace: "조 3위 순위",
  timeZone: "시간대",
  timeZoneChoose: "시간대 선택",
  timeZoneClose: "시간대 선택기 닫기",
  timeZoneDefault: "기본값",
  timeZoneNoResults: "일치하는 시간대가 없습니다",
  timeZonePopular: "자주 사용하는 시간대",
  timeZoneRecent: "최근 사용",
  timeZoneSearchPlaceholder: "도시, 국가 또는 약어 검색",
  timeZoneSearchResults: "검색 결과",
  tournament: "토너먼트",
  viewRecap: "대회 돌아보기",
  worldCupViews: "월드컵 메뉴"
};

const TEAM_ROWS = [
  ["MEX", "Mexico", "멕시코"],
  ["KOR", "South Korea", "대한민국"],
  ["CZE", "Czechia", "체코"],
  ["RSA", "South Africa", "남아프리카공화국"],
  ["CAN", "Canada", "캐나다"],
  ["BIH", "Bosnia and Herzegovina", "보스니아 헤르체고비나"],
  ["QAT", "Qatar", "카타르"],
  ["SUI", "Switzerland", "스위스"],
  ["BRA", "Brazil", "브라질"],
  ["MAR", "Morocco", "모로코"],
  ["HAI", "Haiti", "아이티"],
  ["SCO", "Scotland", "스코틀랜드"],
  ["USA", "United States", "미국"],
  ["PAR", "Paraguay", "파라과이"],
  ["AUS", "Australia", "호주"],
  ["TUR", "Türkiye", "튀르키예"],
  ["GER", "Germany", "독일"],
  ["ECU", "Ecuador", "에콰도르"],
  ["CIV", "Côte d'Ivoire", "코트디부아르"],
  ["CUW", "Curaçao", "퀴라소"],
  ["SWE", "Sweden", "스웨덴"],
  ["NED", "Netherlands", "네덜란드"],
  ["JPN", "Japan", "일본"],
  ["TUN", "Tunisia", "튀니지"],
  ["IRN", "IR Iran", "이란"],
  ["NZL", "New Zealand", "뉴질랜드"],
  ["BEL", "Belgium", "벨기에"],
  ["EGY", "Egypt", "이집트"],
  ["URU", "Uruguay", "우루과이"],
  ["KSA", "Saudi Arabia", "사우디아라비아"],
  ["ESP", "Spain", "스페인"],
  ["CPV", "Cabo Verde", "카보베르데"],
  ["NOR", "Norway", "노르웨이"],
  ["FRA", "France", "프랑스"],
  ["SEN", "Senegal", "세네갈"],
  ["IRQ", "Iraq", "이라크"],
  ["ARG", "Argentina", "아르헨티나"],
  ["AUT", "Austria", "오스트리아"],
  ["JOR", "Jordan", "요르단"],
  ["ALG", "Algeria", "알제리"],
  ["POR", "Portugal", "포르투갈"],
  ["COD", "DR Congo", "콩고민주공화국"],
  ["UZB", "Uzbekistan", "우즈베키스탄"],
  ["COL", "Colombia", "콜롬비아"],
  ["ENG", "England", "잉글랜드"],
  ["CRO", "Croatia", "크로아티아"],
  ["GHA", "Ghana", "가나"],
  ["PAN", "Panama", "파나마"]
];

const TEAMS = Object.fromEntries(TEAM_ROWS.map(([id, , localized]) => [id, localized]));
const TEAM_NAMES = Object.fromEntries(
  TEAM_ROWS.flatMap(([id, english, localized]) => [
    [english, localized],
    [id, localized]
  ])
);
Object.assign(TEAM_NAMES, {
  "Bosnia-Herzegovina": "보스니아 헤르체고비나",
  "Cape Verde": "카보베르데",
  "Congo DR": "콩고민주공화국",
  "Cote d'Ivoire": "코트디부아르",
  Curacao: "퀴라소",
  Iran: "이란",
  Korea: "대한민국",
  "Korea Republic": "대한민국",
  "Republic of Korea": "대한민국",
  Turkey: "튀르키예",
  USA: "미국",
  Angola: "앙골라",
  Bolivia: "볼리비아",
  Bulgaria: "불가리아",
  Cameroon: "카메룬",
  Chile: "칠레",
  China: "중국",
  "Costa Rica": "코스타리카",
  Cuba: "쿠바",
  "Czech Republic": "체코",
  Czechoslovakia: "체코슬로바키아",
  Denmark: "덴마크",
  "Dutch East Indies": "네덜란드령 동인도",
  "East Germany": "동독",
  "El Salvador": "엘살바도르",
  Greece: "그리스",
  Honduras: "온두라스",
  Hungary: "헝가리",
  Iceland: "아이슬란드",
  Ireland: "아일랜드",
  Israel: "이스라엘",
  Italy: "이탈리아",
  Jamaica: "자메이카",
  Kuwait: "쿠웨이트",
  Nigeria: "나이지리아",
  "North Korea": "북한",
  "Northern Ireland": "북아일랜드",
  Peru: "페루",
  Poland: "폴란드",
  Romania: "루마니아",
  Russia: "러시아",
  Serbia: "세르비아",
  "Serbia and Montenegro": "세르비아 몬테네그로",
  Slovakia: "슬로바키아",
  Slovenia: "슬로베니아",
  "Soviet Union": "소련",
  Togo: "토고",
  "Trinidad and Tobago": "트리니다드 토바고",
  Ukraine: "우크라이나",
  "United Arab Emirates": "아랍에미리트",
  Wales: "웨일스",
  "West Germany": "서독",
  Yugoslavia: "유고슬라비아",
  Zaire: "자이르"
});

const TIME_ZONES = {
  UTC: "협정 세계시",
  "America/Los_Angeles": "로스앤젤레스",
  "America/Vancouver": "밴쿠버",
  "America/Denver": "덴버",
  "America/Chicago": "시카고",
  "America/Mexico_City": "멕시코시티",
  "America/New_York": "뉴욕",
  "America/Toronto": "토론토",
  "America/Sao_Paulo": "상파울루",
  "Europe/London": "런던",
  "Europe/Paris": "파리",
  "Europe/Madrid": "마드리드",
  "Europe/Berlin": "베를린",
  "Africa/Casablanca": "카사블랑카",
  "Africa/Lagos": "라고스",
  "Africa/Johannesburg": "요하네스버그",
  "Asia/Dubai": "두바이",
  "Asia/Kolkata": "콜카타",
  "Asia/Bangkok": "방콕",
  "Asia/Shanghai": "상하이",
  "Asia/Tokyo": "도쿄",
  "Australia/Sydney": "시드니"
};

const VENUE_NAMES = {
  "Atlanta Stadium": "애틀랜타 스타디움",
  "Boston Stadium": "보스턴 스타디움",
  "Dallas Stadium": "댈러스 스타디움",
  "Estadio Guadalajara": "에스타디오 과달라하라",
  "Estadio Monterrey": "에스타디오 몬테레이",
  "Houston Stadium": "휴스턴 스타디움",
  "Kansas City Stadium": "캔자스시티 스타디움",
  "Los Angeles Stadium": "로스앤젤레스 스타디움",
  "Mexico City Stadium": "멕시코시티 스타디움",
  "Miami Stadium": "마이애미 스타디움",
  "New York New Jersey Stadium": "뉴욕 뉴저지 스타디움",
  "Philadelphia Stadium": "필라델피아 스타디움",
  "San Francisco Bay Area Stadium": "샌프란시스코 베이 에어리어 스타디움",
  "Seattle Stadium": "시애틀 스타디움",
  "Toronto Stadium": "토론토 스타디움",
  "BC Place Vancouver": "밴쿠버 BC 플레이스",
  "Vancouver Stadium": "밴쿠버 스타디움"
};

const VENUE_LOCATIONS = {
  "Atlanta Stadium": "미국 조지아주 애틀랜타",
  "Boston Stadium": "미국 매사추세츠주 폭스버러",
  "Dallas Stadium": "미국 텍사스주 알링턴",
  "Estadio Guadalajara": "멕시코 할리스코주 과달라하라",
  "Estadio Monterrey": "멕시코 누에보레온주 몬테레이",
  "Houston Stadium": "미국 텍사스주 휴스턴",
  "Kansas City Stadium": "미국 미주리주 캔자스시티",
  "Los Angeles Stadium": "미국 캘리포니아주 잉글우드",
  "Mexico City Stadium": "멕시코 멕시코시티",
  "Miami Stadium": "미국 플로리다주 마이애미가든스",
  "New York New Jersey Stadium": "미국 뉴저지주 이스트러더퍼드",
  "Philadelphia Stadium": "미국 펜실베이니아주 필라델피아",
  "San Francisco Bay Area Stadium": "미국 캘리포니아주 샌타클래라",
  "Seattle Stadium": "미국 워싱턴주 시애틀",
  "Toronto Stadium": "캐나다 온타리오주 토론토",
  "BC Place Vancouver": "캐나다 브리티시컬럼비아주 밴쿠버",
  "Vancouver Stadium": "캐나다 브리티시컬럼비아주 밴쿠버"
};

const STAGES = {
  group: "조별리그",
  "group-stage": "조별리그",
  "preliminary-round": "예비 라운드",
  "first-round": "1라운드",
  "second-round": "2라운드",
  "final-round": "최종 라운드",
  "round-of-32": "32강",
  "round-of-16": "16강",
  "quarter-finals": "8강",
  "semi-finals": "준결승",
  "bronze-final": "3·4위전",
  "third-place-play-off": "3·4위전",
  final: "결승"
};

const LINEUP_POSITIONS = {
  AM: "공격형 미드필더",
  LCB: "왼쪽 센터백",
  CB: "센터백",
  CM: "중앙 미드필더",
  DM: "수비형 미드필더",
  GK: "골키퍼",
  LB: "왼쪽 풀백",
  LM: "왼쪽 미드필더",
  LW: "왼쪽 윙어",
  LWB: "왼쪽 윙백",
  RB: "오른쪽 풀백",
  RM: "오른쪽 미드필더",
  RW: "오른쪽 윙어",
  RWB: "오른쪽 윙백",
  RCB: "오른쪽 센터백",
  ST: "스트라이커"
};

const PLAYER_POSITIONS = {
  "attacking midfielder": "공격형 미드필더",
  "center back": "센터백",
  "central defender": "중앙 수비수",
  "central midfield": "중앙 미드필더",
  "central midfielder": "중앙 미드필더",
  "centre back": "센터백",
  "centre forward": "센터 포워드",
  defender: "수비수",
  "defensive midfield": "수비형 미드필더",
  "defensive midfielder": "수비형 미드필더",
  forward: "공격수",
  "full back": "풀백",
  goalkeeper: "골키퍼",
  "left back": "왼쪽 풀백",
  "left midfielder": "왼쪽 미드필더",
  "left wing": "왼쪽 윙",
  "left wing back": "왼쪽 윙백",
  "left winger": "왼쪽 윙어",
  midfielder: "미드필더",
  "right back": "오른쪽 풀백",
  "right midfielder": "오른쪽 미드필더",
  "right wing": "오른쪽 윙",
  "right wing back": "오른쪽 윙백",
  "right winger": "오른쪽 윙어",
  "second striker": "세컨드 스트라이커",
  striker: "스트라이커",
  sweeper: "스위퍼",
  "wide midfielder": "측면 미드필더",
  "wing back": "윙백",
  winger: "윙어"
};

const EXACT = {
  "After extra time": "연장전 후",
  archive: "아카이브",
  "As it stands": "현재 순위",
  "Best third-place race": "조 3위 팀 순위",
  "Bracket details are not loaded yet.": "대진표 정보가 아직 없습니다.",
  "bracket details are not loaded yet.": "대진표 정보가 아직 없습니다.",
  Canceled: "취소",
  Cancelled: "취소",
  cancelled: "취소",
  "Choose match date": "경기 날짜 선택",
  "Choose standings year": "순위표 연도 선택",
  "Clear country search": "대표팀 검색 지우기",
  "Club to verify": "소속팀 확인 필요",
  "Current score": "현재 스코어",
  "Data unavailable": "데이터 없음",
  "Data refreshed": "데이터 갱신",
  Delayed: "지연",
  delayed: "지연",
  Draw: "무승부",
  Tie: "무승부",
  Eliminated: "탈락",
  ET: "연장 종료",
  "Extra time": "연장전",
  "First half": "전반",
  "Second half": "후반",
  "Final pending": "최종 결과 확인 중",
  Pending: "확인 중",
  Postponed: "연기",
  postponed: "연기",
  "Kickoff delayed": "킥오프 지연",
  "Official feed has not marked this match live yet.":
    "공식 피드에서 아직 이 경기를 라이브로 표시하지 않았습니다.",
  "Final score": "최종 스코어",
  Final: "결승",
  FT: "종료",
  "Full time": "경기 종료",
  aet: "연장전 후",
  "Half-time": "하프타임",
  HT: "하프타임",
  Live: "라이브",
  "Live score": "실시간 스코어",
  Suspended: "중단",
  Interrupted: "일시 중단",
  Break: "휴식",
  "Penalty shootout": "승부차기",
  Penalties: "승부차기",
  local: "현지",
  "Current time unavailable": "현재 시간 정보 없음",
  "No matches": "경기 없음",
  "No previous World Cup month": "이전 월드컵 경기 월이 없습니다",
  "No next World Cup month": "다음 월드컵 경기 월이 없습니다",
  "no World Cup matches scheduled": "예정된 월드컵 경기가 없습니다",
  "Loading catch-up notes": "경기 요약 불러오는 중",
  "Loading matches": "경기 불러오는 중",
  "Loading release notes": "업데이트 내역 불러오는 중",
  "Loading standings": "순위 불러오는 중",
  Language: "언어",
  "Dark mode": "다크 모드",
  Settings: "설정",
  "Time zone": "시간대",
  Standings: "순위",
  Tournament: "토너먼트",
  Month: "월",
  "Recent matches": "최근 경기",
  "Show recent matches": "최근 경기 보기",
  "Hide recent matches": "최근 경기 숨기기",
  "Search country": "대표팀 검색",
  Matches: "경기",
  "Matches and selected match details": "경기 목록 및 선택한 경기 상세",
  Groups: "조별리그",
  Group: "조",
  "Group stage": "조별리그",
  "Group round": "조별리그",
  "Group standings": "조 순위",
  "Third-place standings across all groups. The top eight advance.":
    "전체 조 3위 팀 순위입니다. 상위 8개 팀이 32강에 진출합니다.",
  Advancing: "진출",
  "Advancing now": "현재 진출권",
  "Advancing to Round of 32.": "32강 진출.",
  "Advancing to Round of 32 as a top-eight third-place team.":
    "성적이 좋은 조 3위 상위 8개 팀으로 32강 진출.",
  "Not advancing": "진출권 밖",
  "Not advancing. Eliminated at group stage.": "진출하지 못했습니다. 조별리그 탈락.",
  "Eliminated at group stage.": "조별리그 탈락.",
  "Outside the top eight third-place teams.": "조 3위 상위 8개 팀 밖입니다.",
  "Inside the top eight best third-place teams.": "조 3위 상위 8개 팀 안에 있습니다.",
  "Inside the top eight right now, but close to the cut line.":
    "현재 상위 8개 팀 안이지만 커트라인에 가깝습니다.",
  "Just inside": "커트라인 안",
  "Just outside": "커트라인 밖",
  Chance: "진출 확률",
  "Games Left": "남은 경기",
  Rank: "순위",
  Pts: "승점",
  "Points use this tournament's scoring: 2 for a win, 1 for a draw, 0 for a loss.":
    "이 대회의 승점 규정을 적용합니다. 승리 2점, 무승부 1점, 패배 0점입니다.",
  MP: "경기",
  W: "승",
  D: "무",
  L: "패",
  GF: "득점",
  GA: "실점",
  GD: "득실",
  Goals: "득점",
  "Goal difference": "골득실",
  "Final round": "최종 라운드",
  "Final Round": "최종 라운드",
  "Final round standings": "최종 라운드 순위",
  "Title decider": "우승 결정전",
  Champion: "우승",
  "No knockout final": "단판 결승전 없음",
  "Four group winners played a round-robin. Uruguay–Brazil decided the title on the last matchday.":
    "네 조의 1위 팀이 풀리그를 치렀고, 마지막 경기일의 우루과이-브라질전에서 우승팀이 결정됐습니다.",
  "See the Groups tab for the complete final-round table.":
    "최종 라운드 전체 순위는 조별리그 탭에서 확인할 수 있습니다.",
  "This four-team table decided the 1950 world champion.":
    "이 네 팀의 순위표로 1950년 월드컵 우승팀이 결정됐습니다.",
  "1950 ended with a four-team final round. Uruguay–Brazil was the title decider.":
    "1950년 월드컵은 네 팀의 최종 라운드로 끝났고, 우루과이-브라질전이 우승 결정전이었습니다.",
  "First-round groups and the final-round championship table use archived results and tournament-era tie-breakers.":
    "1라운드 조별리그와 최종 라운드 우승 순위표는 당시 경기 결과와 대회 규정을 사용합니다.",
  "Second round": "2라운드",
  "First round": "1라운드",
  "First round, Replays": "1라운드 재경기",
  "Preliminary round": "예비 라운드",
  "Round of 32": "32강",
  "Round of 16": "16강",
  "Quarter-finals": "8강",
  "Quarter-finals, Replays": "8강 재경기",
  Quarterfinals: "8강",
  "Semi-finals": "준결승",
  Semifinals: "준결승",
  "Group 1 Play-off": "1조 플레이오프",
  "Group 2 Play-off": "2조 플레이오프",
  "Group 3 Play-off": "3조 플레이오프",
  "Group 4 Play-off": "4조 플레이오프",
  "3rd place match": "3·4위전",
  "Knockout context": "토너먼트 흐름",
  "Knockout match": "토너먼트 경기",
  "Knockout path": "토너먼트 대진",
  "Knockout winner progression": "승자 진출 경로",
  "Tournament path": "대회 진출 경로",
  "Tournament progression": "대회 진행 상황",
  "Likely for now": "현재 예상",
  "likely for now": "현재 예상",
  "Later matches": "이후 경기",
  "Path below": "아래 대진 참고",
  "Predicted matchup; participants come from current knockout-path estimates.":
    "예상 대진이며, 참가 팀은 현재 토너먼트 전망을 바탕으로 합니다.",
  "FIFA World Cup": "FIFA 월드컵",
  "FIFA World Cup qualifier": "FIFA 월드컵 예선",
  Friendly: "친선 경기",
  "International Friendly": "국제 친선 경기",
  "Gold Cup": "골드컵",
  Olympics: "올림픽",
  "UEFA Euro": "UEFA 유로",
  "UEFA Euro qualifier": "UEFA 유로 예선",
  "UEFA Nations League": "UEFA 네이션스리그",
  "Latest changes": "최근 변경 사항",
  "release notes": "업데이트 내역",
  "Report issue": "오류 제보",
  "Read source": "출처 보기",
  "Key information": "핵심 정보",
  "Key information is not loaded yet.": "핵심 정보가 아직 없습니다.",
  "Key information will be populated based on the opponent.": "상대 팀에 맞춰 핵심 정보가 제공됩니다.",
  "Key information will be populated once this matchup is confirmed.":
    "대진이 확정되면 핵심 정보가 제공됩니다.",
  "Past matches": "상대 전적",
  "Past World Cup meetings": "역대 월드컵 맞대결",
  "Box entries from multiple lines": "여러 라인의 박스 진입",
  "Low-margin patience and shootout nerve": "팽팽한 경기의 인내와 승부차기 집중력",
  "Box protection and patient spacing": "박스 보호와 차분한 간격 유지",
  "Forward-heavy pressure": "공격 숫자를 늘린 압박",
  "Midfield numbers and tempo control": "중원 숫자와 템포 조절",
  "Defensive base with direct exits": "수비 기반과 빠른 전진",
  "Central spine and matchup control": "중앙 축과 대인 구도 장악",
  "Compact squad shape": "촘촘한 팀 간격",
  "Canceled fixture kept as squad context": "취소 경기를 선수단 배경으로 보존",
  "third-place matchup": "3·4위전 대진",
  "final matchup": "결승 대진",
  Unavailable: "출전 불가",
  "2026 FIFA World Cup venue": "2026 FIFA 월드컵 경기장",
  "their opponent": "상대 팀",
  match: "경기",
  "Past meetings not loaded yet.": "상대 전적이 아직 없습니다.",
  "No verified senior meetings found before this match.": "이 경기 전 확인된 A대표팀 맞대결이 없습니다.",
  Prediction: "예측",
  "Predictions are unofficial.": "예측은 공식 정보가 아닙니다.",
  "No verified projection is loaded for this fixture yet.": "이 경기의 검증된 전망이 아직 없습니다.",
  "Forecast from online sources": "온라인 출처 기반 전망",
  "Local preview estimate. Not betting odds.": "자체 프리뷰 전망이며 베팅 배당률이 아닙니다.",
  Player: "선수",
  Bench: "교체 명단",
  Coach: "감독",
  "Head Coach": "감독",
  Formation: "포메이션",
  "Formation & events": "포메이션 및 경기 기록",
  Formations: "포메이션",
  Goal: "골",
  Assist: "도움",
  "Red card": "퇴장",
  "Yellow card": "경고",
  Substitution: "교체",
  "Substituted off": "교체 아웃",
  "Substituted on": "교체 투입",
  "Line ups": "라인업",
  "Line-ups": "라인업",
  Lineups: "라인업",
  "Line-ups (predicted)": "예상 라인업",
  "Expected lineups": "예상 라인업",
  "Probable lineups": "예상 라인업",
  "Official lineups": "공식 라인업",
  "Confirmed lineups": "확정 라인업",
  "Confirmed lineup record": "확정 라인업 기록",
  "Final lineup record": "최종 라인업 기록",
  "Live lineup record": "실시간 라인업 기록",
  "Official FIFA lineup": "FIFA 공식 라인업",
  "Official FIFA live lineup": "FIFA 공식 실시간 라인업",
  "Predicted lineups": "예상 라인업",
  "Predicted from recent official lineups": "최근 공식 라인업을 바탕으로 예측",
  "Predicted from online sources": "온라인 출처 기반 예상",
  "Informed by published team reports": "공개된 팀 보도를 참고한 예상",
  "This was the final lineup for the match.": "이 경기의 최종 라인업입니다.",
  "This feature is still work in progress and may not be accurate.":
    "이 기능은 개발 중이며 일부 정보가 정확하지 않을 수 있습니다.",
  "Evidence strength": "근거 수준",
  Checked: "확인",
  Sources: "출처",
  "low confidence": "신뢰도 낮음",
  "medium confidence": "신뢰도 보통",
  "high confidence": "신뢰도 높음",
  "Position to verify": "포지션 확인 필요",
  "Goal scorer": "득점자",
  "Goal threat": "득점 위협",
  "Match plan": "경기 운영",
  "Made by": "제작",
  "Est. value": "추정 가치",
  "Value": "시장 가치",
  "Prime": "전성기",
  "Loading archive player profile": "과거 대회 선수 프로필 불러오는 중",
  "Historic World Cup record": "역대 월드컵 기록",
  "Hide matches": "경기 숨기기",
  "Hide previous World Cups": "이전 월드컵 숨기기",
  "Peak value": "최고 가치",
  "Estimated market value, shaped by public valuations, age, club level, role, and recent form.":
    "공개 가치 평가, 나이, 소속팀 수준, 역할, 최근 활약을 바탕으로 추정한 시장 가치입니다.",
  "Market value from sourced player valuation data.":
    "출처가 확인된 선수 가치 자료의 시장 가치입니다.",
  "Career-high market value from the Transfermarkt dataset.":
    "Transfermarkt 자료 기준 선수 경력 최고 시장 가치입니다.",
  "Career peak market value from the Transfermarkt dataset; not an exact match-day value.":
    "Transfermarkt 자료 기준 선수 경력 최고 시장 가치이며, 경기 당일의 정확한 가치는 아닙니다.",
  "Tournament-year market value; shown only when a versioned source is available.":
    "해당 대회 연도의 시장 가치이며, 날짜가 확인되는 출처가 있을 때만 표시합니다.",
  "Penalty pressure": "승부차기 압박",
  "Impact sub": "게임 체인저 후보",
  "Archive standout": "역대 핵심 선수",
  "Historical lens": "역사적 관점",
  "Can struggle with": "약점",
  "Good at": "강점",
  "No scorer data loaded.": "득점자 정보가 없습니다.",
  "Unknown scorer": "득점자 미상",
  "Own goal": "자책골",
  "own goal": "자책골",
  "No catch-up notes loaded yet": "경기 요약이 아직 없습니다",
  "Not loaded": "정보 없음",
  Next: "다음",
  Previous: "이전",
  "Previous matches": "이전 경기",
  "Previous World Cups": "역대 월드컵",
  "Play highlights on YouTube": "YouTube에서 하이라이트 보기",
  Result: "결과",
  TBD: "미정",
  Winner: "승자",
  Loser: "패자",
  Confirmed: "확정",
  Qualified: "진출 확정"
};

const STYLE_TERMS = {
  "Aerial duels": "공중볼 경합",
  "Aerial pressure": "공중볼 압박",
  "Aerial targets": "공중볼 타깃",
  "Aggressive midfield pressure with direct runners": "직선적인 침투를 더한 강한 중원 압박",
  "Aggressive wide play with a fearless defensive edge": "과감한 측면 공격과 투지 있는 수비",
  "Athletic pressing with direct attacking bursts": "활동량 높은 압박과 직선적인 공격",
  "Back-line command": "수비 라인 지휘",
  "Back-line courage": "수비 라인의 과감성",
  "Back-line passing": "후방 패스 전개",
  "Back-three cover": "스리백 커버",
  "Between-lines craft": "라인 사이 창의성",
  "Box battles": "박스 안 경합",
  "Box entries": "박스 진입",
  "Box finishers supplied by runners between the lines": "라인 사이 침투로 박스 안 해결사를 지원",
  "Box finishing": "박스 안 마무리",
  "Box power": "박스 안 힘",
  "Box presence": "박스 안 존재감",
  "Box pressure": "박스 안 압박",
  "Box runs": "박스 침투",
  "Central control": "중앙 장악",
  "Central overloads": "중앙 수적 우위",
  "Central rhythm": "중앙 전개 리듬",
  "Chance creation": "기회 창출",
  "Channel cover": "채널 커버",
  "Channel runs": "채널 침투",
  "Combination flair": "연계 플레이 창의성",
  "Committed defending with quick outlets through midfield": "집중력 있는 수비와 중원을 통한 빠른 탈출",
  "Compact block": "촘촘한 블록",
  "Compact cover": "촘촘한 커버",
  "Compact defending": "촘촘한 수비",
  "Compact defending with quick counters into space": "촘촘한 수비 뒤 공간을 노리는 빠른 역습",
  "Compact press": "촘촘한 압박",
  "Compact shape with counters into the wide lanes": "촘촘한 대형 뒤 측면을 노리는 역습",
  "Compact spacing": "촘촘한 간격",
  "Controlled buildup with defenders who start attacks": "수비수부터 시작하는 안정적인 빌드업",
  "Counter attacks": "역습",
  "Counter runs": "역습 침투",
  "Counter timing": "역습 타이밍",
  "Counter width": "역습의 폭",
  "Counter-press": "역압박",
  "Counterattacking width with clever movement off the striker": "측면 폭과 공격수 주변의 영리한 움직임을 살린 역습",
  "Creative midfield passing with sudden attacking spark": "중원의 창의적인 패스와 순간적인 공격 가속",
  "Creative passing": "창의적인 패스",
  "Creative passing supply with attackers between lines": "라인 사이 공격수에게 연결하는 창의적인 패스",
  "Cross volume": "많은 크로스",
  "Deep block": "낮은 수비 블록",
  "Deep buildup": "후방 빌드업",
  "Deep resilience": "낮은 위치에서의 버티는 힘",
  "Defensive block": "수비 블록",
  "Defensive grit with fast breaks through the channels": "끈질긴 수비와 채널을 활용한 빠른 역습",
  "Depth scoring": "2선 득점",
  "Diagonal runs": "대각선 침투",
  "Direct combinations": "직선적인 연계",
  "Direct counters": "직선적인 역습",
  "Direct outlets": "빠른 전진 패스",
  "Direct pace and physical pressure in transition": "전환 상황의 직선적인 속도와 강한 몸싸움",
  "Direct service": "직접적인 볼 공급",
  "Direct supply into elite penalty-box finishing": "박스 안 정상급 마무리를 향한 직접적인 공급",
  "Direct target play and committed box defending": "직접적인 포스트 플레이와 집중력 있는 박스 수비",
  "Disciplined defensive shape with dangerous transitions": "규율 있는 수비 대형과 위협적인 전환",
  "Duel pressure": "경합 압박",
  "Duel strength": "경합 능력",
  "Early crosses": "이른 크로스",
  "Early service": "빠른 박스 투입",
  "Early shots": "빠른 슈팅",
  "Explosive runners turning pressure into open-field danger": "압박을 넓은 공간의 위협으로 바꾸는 폭발적인 침투",
  "Explosive transitions layered over deep attacking talent": "두터운 공격 재능을 바탕으로 한 폭발적인 전환",
  "Explosive wide attacks that stretch back lines": "수비 라인을 벌리는 폭발적인 측면 공격",
  "Fast breaks backed by elite recovery defending": "정상급 수비 복귀가 뒷받침하는 빠른 역습",
  "Fast counters": "빠른 역습",
  "Fast right-sided attacks with direct goal threat": "직접적인 득점 위협을 갖춘 빠른 오른쪽 공격",
  "Final-third depth": "공격 3선의 깊이",
  "Final-third pressure": "공격 3선 압박",
  "Fluid attacking rotations with ruthless central control": "유기적인 공격 로테이션과 강력한 중앙 장악",
  "Forward depth": "공격진의 깊이",
  "Forward power": "공격진의 힘",
  "Forward press": "공격진 압박",
  "Fullback service": "풀백의 볼 공급",
  "Fullback thrust": "풀백의 전진",
  "Half-space passing": "하프스페이스 패스",
  "Half-space runs": "하프스페이스 침투",
  "High circulation": "높은 위치의 볼 순환",
  "High press": "전방 압박",
  "High pressing designed to turn recoveries into shots": "볼 탈취를 슈팅으로 연결하는 전방 압박",
  "High-energy pressing with vertical midfield punch": "강한 압박과 중원의 수직적인 침투",
  "Interior passing": "중앙 패스",
  "Keeper saves": "골키퍼 선방",
  "Late arrivals": "2선 침투",
  "Late runners": "뒤에서 들어오는 침투",
  "Late runs": "늦은 침투",
  "Left balance": "왼쪽 균형",
  "Left-footed creativity driving patient attacks": "차분한 공격을 이끄는 왼발 창의성",
  "Left-side pace": "왼쪽 측면 속도",
  "Long shots": "중거리 슈팅",
  "Loose-ball pressure": "세컨드볼 압박",
  "Low block": "로우 블록",
  "Midfield balance": "중원 균형",
  "Midfield bite": "중원의 강한 압박",
  "Midfield duels": "중원 경합",
  "Midfield patience that keeps matches under control": "경기를 통제하는 중원의 침착함",
  "Midfield power": "중원의 힘",
  "Midfield press": "중원 압박",
  "Midfield shield": "중원 보호막",
  "Midfield tempo": "중원 템포",
  "Midfield tempo with brave fullback support": "중원 템포와 과감한 풀백 지원",
  "Midfield traps": "중원 압박 유도",
  "One-on-one attackers who can tilt any match": "경기 흐름을 바꿀 수 있는 일대일 공격수",
  "Open-field runs": "넓은 공간 침투",
  "Organized defending with a brave buildup spine": "조직적인 수비와 과감한 중앙 빌드업",
  "Organized pressure and relentless midfield running": "조직적인 압박과 끊임없는 중원 활동량",
  "Patient counters with wide delivery and deep resilience": "차분한 역습, 측면 볼 공급, 낮은 위치에서의 끈기",
  "Patient possession looking for sudden final-third craft": "공격 지역의 순간적인 창의성을 노리는 차분한 점유",
  "Physical control with direct runners behind": "강한 몸싸움과 뒷공간을 노리는 직선적인 침투",
  "Physical forward play built for open-field breaks": "넓은 공간 역습에 맞춘 공격진의 힘",
  "Pocket passing": "좁은 공간 패스",
  "Possession patience": "차분한 점유",
  "Power through midfield with pace on the edges": "중원의 힘과 측면의 속도",
  "Press control": "압박 조절",
  "Press escape": "압박 탈출",
  "Press resistance": "탈압박 능력",
  Pressing: "압박",
  "Pressing forwards and midfield control protect the rhythm": "공격진의 압박과 중원 장악으로 리듬 유지",
  "Pressing lines": "압박 라인",
  "Pressing traps": "압박 유도",
  "Pressing waves": "연속 압박",
  "Quick combinations looking for sudden final-third moments": "공격 지역의 순간적인 틈을 노리는 빠른 연계",
  "Quick passing": "빠른 패스",
  "Quick releases": "빠른 전진 연결",
  "Quick rotations": "빠른 로테이션",
  "Relentless passing that breaks defenses apart": "수비를 흔드는 끊임없는 패스",
  "Relentless running and delivery from wide zones": "끊임없는 움직임과 측면 볼 공급",
  "Right-side breaks": "오른쪽 측면 돌파",
  "Second balls": "세컨드볼",
  "Set pieces": "세트피스",
  "Set-piece bite": "세트피스 위협",
  "Set-piece threat": "세트피스 위협",
  "Set-piece threat with hard-running midfield cover": "왕성한 중원 커버가 더해진 세트피스 위협",
  "Shot stopping": "선방",
  "Structured midfield control with disciplined spacing": "규율 있는 간격을 바탕으로 한 중원 장악",
  Switches: "측면 전환",
  "Target outlets": "포스트 플레이 출구",
  "Target play": "포스트 플레이",
  "Target play and physical duels define the rhythm": "포스트 플레이와 몸싸움이 경기 리듬을 좌우",
  "Technical depth creating chances from every lane": "모든 경로에서 기회를 만드는 두터운 기술 자원",
  "Technical midfield": "기술적인 중원",
  "Technical tempo and quick rotations between lines": "기술적인 템포와 라인 사이 빠른 로테이션",
  "Tempo control": "템포 조절",
  "Third-man runs": "제3자 침투",
  "Transition bursts": "전환 가속",
  "Transition craft": "전환 상황의 세밀함",
  "Transition pace": "전환 속도",
  "Transition speed": "빠른 공수 전환",
  "Two-forward pressure with polished penalty-box work": "두 공격수의 압박과 정교한 박스 안 플레이",
  "Two-striker threat": "투톱의 위협",
  "Vertical pressure around a sharp box finisher": "날카로운 박스 안 해결사를 중심으로 한 수직 압박",
  "Vertical runs": "수직 침투",
  "Veteran control trying to slow games into detail": "노련하게 템포를 낮추고 디테일에서 승부",
  "Wide counters": "측면 역습",
  "Wide craft": "측면 창의성",
  "Wide delivery": "측면 볼 공급",
  "Wide dribbles": "측면 드리블",
  "Wide flair": "측면의 번뜩임",
  "Wide isolation": "측면 일대일",
  "Wide overloads": "측면 수적 우위",
  "Wide pace": "측면 속도",
  "Wide pressing": "측면 압박",
  "Wide release": "측면 전개",
  "Wide speed": "측면 스피드",
  "Wide surges": "측면 전진",
  "Wide switches": "측면 전환",
  "Wing flair and midfield invention in constant motion": "끊임없이 움직이는 측면의 번뜩임과 중원의 창의성",
  "Wing rotations": "측면 로테이션",
  "Wingback thrust": "윙백 전진"
};

Object.assign(EXACT, STYLE_TERMS);

Object.assign(EXACT, {
  "FIFA world ranking during the 2026 World Cup": "2026 월드컵 기간의 FIFA 세계 랭킹",
  "Final group table uses archived results and tournament-era tie-breakers.":
    "최종 조 순위는 저장된 경기 결과와 당시 대회의 동률 결정 규정을 적용합니다.",
  "Final round table data is not available for this archived match.":
    "이 과거 경기의 최종 라운드 순위표가 없습니다.",
  "Final score reflected in the current standings after source checks.":
    "출처 확인을 거친 최종 결과가 현재 순위에 반영됐습니다.",
  "Group standings are not available for this archived tournament.":
    "이 과거 대회의 조별 순위가 없습니다.",
  "Group table data is not available for this archived match.": "이 과거 경기의 조 순위표가 없습니다.",
  "Knockout bracket is not available for this archived tournament.":
    "이 과거 대회의 토너먼트 대진표가 없습니다.",
  "Live score pending": "실시간 스코어 확인 중",
  "No goals because this match was cancelled.": "경기가 취소되어 득점이 없습니다.",
  "No historical prediction is generated for cancelled fixtures.":
    "취소된 경기에는 과거 시점 예측을 생성하지 않습니다.",
  "No loaded group-round results yet.": "불러온 조별리그 결과가 아직 없습니다.",
  "No loaded source matches yet.": "불러온 참고 경기가 아직 없습니다.",
  "No next knockout match is loaded yet.": "다음 토너먼트 경기가 아직 없습니다.",
  "Round of 32 as it stands": "현재 32강 대진",
  "Round of 32 bracket center": "32강 대진표 중앙",
  "Round path": "라운드 진출 경로",
  "Score details are not loaded for this historical record.": "이 과거 기록의 상세 스코어가 없습니다.",
  "See all": "전체 보기",
  "Release notes": "릴리스 노트",
  "See release notes": "업데이트 내역 보기",
  "See sources": "출처 보기",
  "Sources": "출처",
  "Tournament facts": "대회 공식 정보",
  "Tournament facts & confirmed lineups": "대회 공식 정보 및 확정 라인업",
  Forecasts: "예측",
  "public betting markets": "공개 베팅 시장",
  "Predicted lineups & team news": "예상 라인업 및 팀 소식",
  "Player information": "선수 정보",
  "Head-to-head records": "상대 전적",
  "Official highlights": "공식 하이라이트",
  "Exact sources vary by match.": "경기별 세부 출처는 다를 수 있습니다.",
  "Show all matches": "모든 경기 보기",
  "Show next": "다음 보기",
  "Show next match in bracket": "대진표의 다음 경기 보기",
  "Shown in current table order. Group ties use FIFA head-to-head before overall goal difference.":
    "현재 순위표 순서입니다. 조 내 동률은 FIFA 규정에 따라 전체 골득실보다 상대 전적을 먼저 적용합니다.",
  Since: "이후",
  "The match data could not be loaded.": "경기 데이터를 불러오지 못했습니다.",
  "The match data could not be loaded. Refresh the page to try again.":
    "경기 데이터를 불러오지 못했습니다. 페이지를 새로고침해 다시 시도하세요.",
  "The match view could not be displayed.": "경기 화면을 표시하지 못했습니다.",
  "The page loaded, but something went wrong while displaying it. Refresh the page to try again.":
    "페이지는 열렸지만 표시 중 문제가 발생했습니다. 새로고침해 다시 시도하세요.",
  "The standings data could not be loaded. Refresh the page to try again.":
    "순위 데이터를 불러오지 못했습니다. 페이지를 새로고침해 다시 시도하세요.",
  "The standings view could not be displayed. Refresh the page to try again.":
    "순위 화면을 표시하지 못했습니다. 페이지를 새로고침해 다시 시도하세요.",
  "Tie order follows points, goal difference, goals scored, loaded fair-play conduct when available, then FIFA ranking as the final deterministic fallback.":
    "동률은 승점, 골득실, 다득점, 확인 가능한 경우 페어플레이 점수, 마지막으로 FIFA 랭킹 순으로 정합니다.",
  "Tournament bracket": "토너먼트 대진표",
  "Unable to display matches": "경기를 표시할 수 없습니다",
  "Unable to display standings": "순위를 표시할 수 없습니다",
  "Up next": "다음 경기",
  "Yesterday and today do not have finished or live match notes yet.":
    "어제와 오늘 종료됐거나 진행 중인 경기의 요약이 아직 없습니다.",
  "bracket-ready": "대진 확정 대기",
  "Current knockout path with likely winners filled for now. Finished results replace estimates.":
    "현재 대진에는 우선 예상 승자를 표시합니다. 경기가 끝나면 실제 결과로 바뀝니다.",
  "Tournament path uses archived match results.": "대회 진출 경로는 저장된 과거 경기 결과를 사용합니다.",
  "Round of 32 slots use current standings and remaining projections. Later rounds are predictions.":
    "32강 자리는 현재 순위와 남은 경기 전망을 반영합니다. 이후 라운드는 예측입니다.",
  "Data refreshed stays separate from app release notes.":
    "데이터 갱신 시각은 앱 업데이트 내역과 별도로 표시합니다.",
  "Checking data freshness…": "데이터 업데이트 확인 중…",
  "No remaining group result combination can move this team into a Round of 32 place.":
    "남은 어떤 조별리그 결과 조합으로도 이 팀은 32강에 오를 수 없습니다.",
  "FIFA schedule": "FIFA 경기 일정",
  "Final group tables use archived results and tournament-era tie-breakers.":
    "최종 조 순위는 저장된 경기 결과와 당시 대회의 동률 결정 규정을 적용합니다.",
  "Final score is not loaded for this fixture yet.": "이 경기의 최종 스코어가 아직 없습니다.",
  ConfedCup: "컨페더레이션스컵",
  Copa: "코파 아메리카",
  Euro: "유로",
  "extra time": "연장전",
  "the final whistle": "경기 종료 휘슬",
  "Group standings should show each current third-place team's cross-group race position.":
    "순위표에는 각 조 3위 팀의 전체 비교 순위가 표시되어야 합니다.",
  "Local estimate using FIFA rankings. Not betting odds.": "FIFA 랭킹을 활용한 자체 전망이며 베팅 배당률이 아닙니다.",
  "Local historical-form estimate. Not betting odds.": "역대 월드컵 흐름을 활용한 자체 전망이며 베팅 배당률이 아닙니다.",
  "Market consensus based on public odds. Not betting advice.":
    "공개 배당률을 바탕으로 한 시장 전망이며 베팅 조언이 아닙니다.",
  "Own goal record": "자책골 기록",
  "No loaded World Cup matches found.": "불러온 월드컵 경기가 없습니다.",
  "Expected lineups checked": "예상 라인업 확인",
  "Probable lineups checked": "예상 라인업 확인",
  "Final verified lineup": "최종 확인 라인업",
  "Live lineup record checked": "실시간 라인업 기록 확인",
  "Live lineup record from official FIFA feed": "FIFA 공식 피드의 실시간 라인업 기록",
  "Official lineup source": "공식 라인업 출처",
  "Lineup record": "라인업 기록",
  "Lineup record checked": "라인업 기록 확인",
  "Lineups checked": "라인업 확인",
  "Predicted lineups checked": "예상 라인업 확인",
  "Predicted lineup record": "예상 라인업 기록",
  "Release notes explain app changes; Data refreshed only shows data freshness.":
    "업데이트 내역은 앱 변경 사항을 설명하고, 데이터 갱신은 최신 여부만 표시합니다.",
  "Release notes open in a short tooltip.": "업데이트 내역은 짧은 도움말로 열립니다.",
  "Score unavailable": "스코어 정보 없음",
  "score unavailable": "스코어 정보 없음",
  "Search country matches": "대표팀 경기 검색",
  "Source links stay available inside the tooltip.": "출처 링크는 도움말 안에서 확인할 수 있습니다.",
  "Sources now open in a compact hover tooltip.": "출처는 마우스를 올리면 간결한 도움말로 열립니다.",
  "Sources:": "출처:",
  Starter: "선발",
  "Standings sections": "순위 섹션",
  Status: "상태",
  "Estimated Round of 32 chance": "32강 진출 예상 확률",
  "Simple model: every unplayed group match is a win, draw, or loss.":
    "단순 모델: 남은 조별리그 경기를 승리, 무승부, 패배로 나눠 계산합니다.",
  "Counts top-two group finishes plus best-third finishes; not official odds.":
    "조 1·2위와 성적이 좋은 조 3위 진출 경우를 계산하며 공식 확률이 아닙니다.",
  "The estimate recalculates from the loaded group-stage results.":
    "불러온 조별리그 결과를 바탕으로 전망을 다시 계산합니다.",
  "Can advance either by moving top two or by staying high enough among third-place teams.":
    "조 1·2위로 올라가거나 조 3위 비교에서 상위권을 지키면 진출할 수 있습니다.",
  "Best path is to move into the group top two.": "가장 좋은 경로는 조 1·2위에 오르는 것입니다.",
  "Route is mainly the best-third table unless it climbs into the top two.":
    "조 1·2위로 오르지 못하면 조 3위 비교 순위가 주된 진출 경로입니다.",
  "No modeled route reaches the Round of 32 from here.": "현재 위치에서는 모델상 32강 진출 경로가 없습니다.",
  "Score pending": "스코어 확인 중",
  Team: "팀",
  "The match is marked live, but no verified score is loaded yet.":
    "경기는 라이브로 표시됐지만 확인된 스코어가 아직 없습니다.",
  "Teams are not known yet. Past match research will load after the matchup is set.":
    "대진 팀이 아직 정해지지 않았습니다. 대진 확정 후 상대 전적을 불러옵니다.",
  "Third-Place Race": "조 3위 순위",
  "Third-place play-off": "3·4위전",
  "Third place play-off": "3·4위전",
  "Third place match": "3·4위전",
  "Third-place match": "3·4위전",
  "Match for third place": "3·4위전",
  "Needs results elsewhere to move into the top eight.": "상위 8위에 들려면 다른 경기 결과가 필요합니다.",
  "Next match": "다음 경기",
  "Next team outside the top eight.": "상위 8위 바로 아래 팀.",
  "Outside now": "현재 진출권 밖",
  "Tiebreak pending": "동률 결정 대기",
  "Tied on loaded stats; fair-play data decides before FIFA ranking.":
    "불러온 기록상 동률이며 FIFA 랭킹보다 페어플레이 점수를 먼저 적용합니다.",
  "To be decided": "미정",
  Today: "오늘",
  "Top two in each group advance. The best eight third-place teams also reach the Round of 32.":
    "각 조 1·2위가 진출합니다. 성적이 좋은 조 3위 8개 팀도 32강에 오릅니다.",
  "W-D-L": "승-무-패",
  "World Cup Simplified": "월드컵 한눈에",
  "World Cup views": "월드컵 메뉴",
  Yesterday: "어제",
  debutants: "첫 출전 팀",
  ranking: "순위",
  standings: "순위",
  "current score": "현재 스코어",
  "final score": "최종 스코어",
  for: "대신",
  now: "현재",
  "pen.": "승부차기",
  pens: "승부차기",
  selected: "선택됨",
  today: "오늘",
  vs: "대"
});

const PLAYER_SKILL_LABELS = Object.freeze({
  "aerial-defending": "공중볼 수비",
  "aerial-duels": "공중볼 경합",
  "aerial-finishing": "공중볼 마무리",
  "archive-standout": "아카이브 핵심 선수",
  "area-command": "페널티지역 장악",
  "attacking-play": "공격 전개",
  "attacking-runs": "공격 침투",
  "ball-carrying": "볼 운반",
  "ball-control": "볼 컨트롤",
  "ball-winning": "볼 탈취",
  "box-defending": "박스 수비",
  "box-finishing": "박스 안 마무리",
  "build-up": "빌드업",
  "chance-creation": "기회 창출",
  "chance-passes": "기회 창출 패스",
  "channel-runs": "채널 침투",
  clearances: "클리어링",
  "combination-play": "연계 플레이",
  composure: "침착성",
  counterattacking: "역습",
  creativity: "창의성",
  crossing: "크로스",
  "cross-command": "크로스 처리",
  "cross-defending": "크로스 수비",
  "defensive-control": "수비 조율",
  "defensive-cover": "수비 커버",
  "defensive-leadership": "수비 리더십",
  "defensive-play": "수비 기여",
  "defensive-positioning": "수비 위치 선정",
  dribbling: "드리블",
  experience: "경험",
  "final-pass": "라스트 패스",
  finishing: "마무리",
  "first-time-finishing": "원터치 마무리",
  "fouls-won": "파울 유도",
  "goalkeeper-distribution": "골키퍼 배급",
  "goalkeeper-potential": "골키퍼 성장성",
  "goalkeeper-reach": "골키퍼 리치",
  "goal-threat": "득점 위협",
  "historical-lens": "역사적 맥락",
  "impact-sub": "교체 카드",
  "inside-runs": "안쪽 침투",
  "inverted-full-back": "인버티드 풀백 역할",
  leadership: "리더십",
  "long-passing": "롱패스",
  "long-range-shooting": "중거리 슈팅",
  marking: "마킹",
  "midfield-play": "중원 플레이",
  "midfield-screening": "중원 보호",
  "near-post-runs": "니어포스트 침투",
  "one-on-one-defending": "일대일 수비",
  overlapping: "오버래핑",
  pace: "스피드",
  passing: "패스",
  "penalty-box-reactions": "박스 안 반응 속도",
  "penalty-box-movement": "박스 안 움직임",
  "penalty-pressure": "페널티킥 위협",
  "penalty-saving": "페널티킥 선방",
  "physical-duels": "피지컬과 경합",
  "player-role": "선수 역할",
  "player-strength": "선수 강점",
  potential: "성장 가능성",
  "press-resistance": "압박 탈출",
  pressing: "압박",
  "progressive-passing": "전진 패스",
  reactions: "반응 속도",
  "recovery-defending": "수비 복귀",
  "second-ball-work": "세컨드볼",
  "set-piece-defending": "세트피스 수비",
  "set-piece-delivery": "세트피스 킥",
  "set-piece-threat": "세트피스 위협",
  "short-passing": "짧은 패스",
  "shot-stopping": "선방",
  "squad-depth": "선수층",
  starter: "선발 자원",
  "sweeper-goalkeeping": "스위퍼 키핑",
  "tempo-control": "템포 조절",
  "transition-defense": "전환 수비",
  versatility: "멀티 능력",
  "wide-defending": "측면 수비",
  "wide-play": "측면 플레이",
  "work-rate": "활동량"
});

const PATTERNS = [
  {
    id: "player-age",
    match: /^Age\s+(\d+)$/iu,
    replace: (age) => `${age}세`
  },
  {
    id: "player-age-then",
    match: /^Age then\s+(\d+)$/iu,
    replace: (age) => `당시 ${age}세`
  },
  {
    id: "player-age-at-world-cup",
    match: /^(\d{4})\s+age\s+(\d+)$/iu,
    replace: (year, age) => `${year}년 당시 ${age}세`
  },
  {
    id: "player-tournament-stats",
    match: /^This World Cup:\s+(\d+)\s+goals?,\s+(\d+)\s+assists?$/iu,
    replace: (goals, assists) => `이번 월드컵: ${goals}골, ${assists}도움`
  },
  {
    id: "historical-player-tournament-stats",
    match: /^(\d{4})\s+World Cup:\s+(\d+)\s+goals?,\s+(\d+)\s+assists?$/iu,
    replace: (year, goals, assists) => `${year}년 월드컵: ${goals}골, ${assists}도움`
  },
  {
    id: "historical-player-value",
    match: /^(\d{4})\s+value$/iu,
    replace: (year) => `${year}년 가치`
  },
  {
    id: "shootout-first-win",
    match: /^If it goes to penalties, both are chasing a first World Cup shootout win:\s+(.+?)\s+have tried\s+(\d+)\s+times?,\s+(.+?)\s+(\d+)\.$/iu,
    replace: (home, homeAttempts, away, awayAttempts) =>
      `승부차기로 가면 두 팀 모두 월드컵 승부차기 첫 승에 도전합니다. ${withKoreanParticle(translateTeamName(home), "은", "는")} ${homeAttempts}번, ${withKoreanParticle(translateTeamName(away), "은", "는")} ${awayAttempts}번 도전했습니다.`
  },
  {
    id: "group-label",
    match: /^Group\s+([A-L])$/u,
    replace: (group) => `${group}조`
  },
  {
    id: "group-standings",
    match: /^Group\s+([A-L])\s+standings$/iu,
    replace: (group) => `${group.toLocaleUpperCase("en-US")}조 순위`
  },
  {
    id: "match-number",
    match: /^Match\s+(\d+)$/iu,
    replace: (number) => `${number}번 경기`
  },
  {
    id: "winner-of-match",
    match: /^Winner of Match\s+(\d+)$/iu,
    replace: (number) => `${number}번 경기 승자`
  },
  {
    id: "match-winner",
    match: /^Match\s+(\d+)\s+winner$/iu,
    replace: (number) => `${number}번 경기 승자`
  },
  {
    id: "loser-of-match",
    match: /^Loser of Match\s+(\d+)$/iu,
    replace: (number) => `${number}번 경기 패자`
  },
  {
    id: "match-loser",
    match: /^Match\s+(\d+)\s+loser$/iu,
    replace: (number) => `${number}번 경기 패자`
  },
  {
    id: "matchday",
    match: /^Matchday\s+(\d+)$/iu,
    replace: (number) => `${number}차전`
  },
  {
    id: "world-cup-year",
    match: /^World Cup\s+(\d{4})$/iu,
    replace: (year) => `${year}년 월드컵`
  },
  {
    id: "year-world-cup",
    match: /^(\d{4})\s+World Cup$/iu,
    replace: (year) => `${year}년 월드컵`
  },
  {
    id: "versus",
    match: /^(.+?)\s+(?:vs\.?|v)\s+(.+)$/iu,
    replace: (home, away) => formatVersus(home, away)
  },
  {
    id: "team-matches",
    match: /^(?!.*\brecord across\b)(.+?)\s+matches$/iu,
    replace: (team) => `${translateTeamName(team)} 경기`
  },
  {
    id: "team-match-centre",
    match: /^(.+?)\s+match centre$/iu,
    replace: (team) => `${translateTeamName(team)} 경기 센터`
  },
  {
    id: "points",
    match: /^(\d+)\s+(?:points|pts)$/iu,
    replace: (points) => `${points}점`
  },
  {
    id: "games-left",
    match: /^(\d+)\s+(?:games?|matches?)\s+left$/iu,
    replace: (matches) => `${matches}경기 남음`
  },
  {
    id: "minutes",
    match: /^(\d+)\s+minutes?$/iu,
    replace: (minutes) => `${minutes}분`
  },
  {
    id: "minutes-ago",
    match: /^(\d+)\s+min ago$/iu,
    replace: (minutes) => `${minutes}분 전`
  },
  {
    id: "hours-ago",
    match: /^(\d+)\s+hr ago$/iu,
    replace: (hours) => `${hours}시간 전`
  },
  {
    id: "open-group-standings",
    match: /^Open Group ([A-L]) standings$/iu,
    replace: (group) => `${group.toLocaleUpperCase("en-US")}조 순위 열기`
  },
  {
    id: "head-to-head-record",
    match: /^Head-to-head record across (\d+) match(?:es)?$/iu,
    replace: (matches) => `맞대결 ${matches}경기 기록`
  },
  {
    id: "world-cup-head-to-head-record",
    match: /^World Cup head-to-head record across (\d+) match(?:es)?$/iu,
    replace: (matches) => `월드컵 맞대결 ${matches}경기 기록`
  },
  {
    id: "record-wins",
    match: /^(\d+)\s+wins?$/iu,
    replace: (wins) => `${wins}승`
  },
  {
    id: "record-ties",
    match: /^(\d+)\s+ties?$/iu,
    replace: (ties) => `${ties}무`
  },
  {
    id: "team-style-notes",
    match: /^(.+)\s+style notes$/iu,
    replace: (team) => `${translateTeamName(team)} 경기 스타일`
  },
  {
    id: "first-world-cup-meeting",
    match: /^(.+)\s+and\s+(.+)\s+had not met in a men's World Cup before this match\.$/iu,
    replace: (home, away) => {
      const awayName = translateTeamName(away);
      return `${withKoreanParticle(translateTeamName(home), "과", "와")} ${withKoreanParticle(awayName, "은", "는")} 이 경기 전까지 남자 월드컵에서 만난 적이 없습니다.`;
    }
  },
  {
    id: "historical-replay-required",
    match: /^The (\d+-\d+) draw required a replay to decide who advanced\.$/iu,
    replace: (score) => `${score} 무승부로 진출 팀을 가리기 위한 재경기가 필요했다.`
  },
  {
    id: "historical-replay-followup",
    match: /^This replay followed the teams' (\d+-\d+) draw in the earlier match\.$/iu,
    replace: (score) => `이 재경기는 앞선 경기의 ${score} 무승부 뒤에 열렸다.`
  }
];

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
  return translateCompoundPosition(position, {
    lineupPositions: LINEUP_POSITIONS,
    playerPositions: PLAYER_POSITIONS
  });
}

export function formatPlayerSkill(value) {
  const category = getPlayerSkillCategory(value);
  return PLAYER_SKILL_LABELS[category] || PLAYER_SKILL_LABELS["player-strength"];
}

const PLAYER_NOTE_QUALITIES = Object.freeze({
  "clean-shot": "수비가 재정비되기 전에 깔끔한 슈팅 기회를 만드는 능력",
  "protect-danger-space": "공에 달려들기 전 가장 위험한 공간부터 지키는 판단",
  "see-decisive-pass": "길이 열리기 한발 앞서 결정적 패스를 보는 시야",
  "create-pass-angle": "다음 패스의 각도를 더 좋게 만드는 움직임",
  "early-position-reactions": "한발 빠른 위치 선정에서 나오는 반응 속도",
  "role-flexibility": "팀의 구조를 깨뜨리지 않고 여러 역할을 소화하는 유연성",
  "duel-timing": "성급하게 달려들지 않고 몸싸움 시점을 고르는 판단",
  "open-grass-speed": "열린 공간이 생겼을 때 나오는 폭발적인 속도",
  "close-control-direction": "공을 잃지 않고 방향을 바꾸는 드리블",
  "safe-defensive-decision": "대인 수비가 위기로 번지기 전에 더 안전한 선택을 하는 판단",
  "purposeful-off-ball": "목적이 분명한 오프더볼 움직임",
  "long-focus": "긴 정적 속에서도 준비 상태를 유지하는 집중력",
  "targeted-press": "공만 쫓지 않고 목표를 분명히 한 압박",
  "pressure-composure": "압박이 들어와도 공을 차분하게 다루는 능력",
  "passing-weight-angle": "패스의 세기와 각도로 수비를 움직이는 능력",
  "early-organization": "위험이 드러나기 전에 동료를 정렬하는 리더십",
  "experience-calm": "큰 압박 속에서도 경험을 바탕으로 내리는 침착한 판단",
  "recovery-speed": "수비 라인이 노출됐을 때의 빠른 복귀 속도",
  "strength-continuity": "다음 동작의 속도를 늦추지 않으면서 힘을 쓰는 능력",
  "early-run": "수비가 공을 보는 사이 먼저 출발하는 침투 타이밍",
  "aerial-reading": "경합 전에 공의 궤적을 읽는 능력",
  "delayed-run": "수비의 시선이 옮겨지는 순간을 기다렸다 움직이는 타이밍",
  "calm-recovery": "첫 수비선이 뚫린 뒤에도 당황하지 않고 자리를 되찾는 능력",
  "tight-space-delivery": "좁은 공간에서도 정확한 킥을 보내는 능력",
  "help-next-action": "동료의 다음 동작을 쉽게 만드는 연결",
  "physical-reference": "센터백이 외면할 수 없는 강한 중앙 기준점 역할",
  "read-next-phase": "공간이 완전히 열리기 전에 다음 국면을 읽는 판단",
  "planned-tight-receive": "좁은 공간에서 다음 동작을 미리 정하고 받는 능력",
  "deep-attack-timing": "후방에서 공격에 가담할 순간을 고르는 타이밍",
  "goalkeeper-balance": "슈팅 방향이 드러날 때까지 균형을 지키는 자세",
  "open-midfield-carry": "열린 중원을 힘 있게 전진하는 운반 능력",
  "save-starts-attack": "선방을 공격의 첫 패스로 바꾸는 배급",
  "dead-ball-technique": "세트피스에서 흔들리지 않는 반복 가능한 킥 기술",
  "high-starting-position": "수비 뒷공간을 지킬 수 있는 높은 출발 위치",
  "penalty-reading": "키커의 마지막 동작까지 기다려 읽는 인내심",
  "runner-tracking": "공이 다른 곳으로 이동해도 침투 선수를 놓치지 않는 집중력",
  "crowded-goal-command": "문전의 혼잡한 공간을 장악하는 능력",
  "attack-space-behind": "공간이 완전히 열리기 전에 수비 뒷공간을 공략하는 움직임",
  "shape-midfield-tempo": "중원에서 경기 속도를 조율하는 능력",
  "contact-with-position": "수비 위치를 잃지 않으면서 몸싸움을 활용하는 능력",
  "two-way-wide-lane": "공수 양면에서 바깥 통로를 책임지는 활동량",
  "second-striker-pockets": "최전방 공격수 주변의 공간을 찾아 들어가는 움직임"
});

const PLAYER_NOTE_ACTIONS = Object.freeze({
  "meet-ball-early": "공 밑에서 기다리지 않고 먼저 낙하지점을 선점해 처리한다",
  "play-through-pressure": "근처 압박을 우회하지 않고 그 사이로 패스를 연결한다",
  "first-touch-escape": "첫 터치로 압박을 벗어난 뒤 패스 방향을 고른다",
  "move-after-release": "공을 보낸 뒤에도 움직여 받는 동료에게 가까운 지원을 제공한다",
  "shoot-strong-foot": "주발 쪽으로 공을 옮긴 뒤 백스윙을 최소화해 슈팅한다",
  "hold-box-route": "지원이 올 때까지 페널티지역으로 들어가는 길을 지킨다",
  "press-angle": "공을 향해 접근하면서 가장 쉬운 패스 길을 함께 막는다",
  "protect-goal-route": "일찍 돌아서서 골문으로 향하는 길부터 지킨다",
  "win-loose-touch": "상대의 터치가 길어지는 순간을 기다렸다 공을 빼앗는다",
  "attack-channel-gap": "풀백과 센터백 사이 통로로 파고든다",
  "vary-delivery": "크로스의 높이와 속도를 조절한다",
  "draw-and-release": "수비수 한 명을 끌어낸 뒤 그 뒤로 뛰는 동료에게 연결한다",
  "carry-through-gap": "첫 압박을 유도한 뒤 생긴 틈으로 공을 운반한다",
  "offer-clear-target": "패서가 분명한 목표를 볼 수 있도록 일찍 위치를 바꾼다",
  "claim-timing": "골문을 비울 시점을 정확히 판단해 수비의 부담을 덜어준다",
  "change-pace": "수비의 발이 고정되는 순간 속도를 바꾼다",
  "overlap-timing": "측면 수비가 안쪽을 보는 순간까지 기다렸다 바깥으로 겹쳐 뛴다",
  "set-and-react": "슈팅 전에 발을 세운 뒤 불필요한 스텝 없이 반응한다",
  "body-and-return": "몸으로 공을 지킨 뒤 침투하는 동료의 진행 방향으로 돌려준다",
  "pick-cross-target": "크로스 전에 고개를 들어 빈 공간이 아닌 침투 선수를 겨냥한다",
  "simple-restart": "압박이 닫히기 전에 가장 단순하고 안전한 재개를 선택한다",
  "protect-then-challenge": "골문으로 향하는 길부터 지킨 뒤 상대의 터치가 길 때만 도전한다",
  "late-box-arrival": "수비가 추적하기 어려울 만큼 늦게 페널티지역에 들어간다",
  "hold-midfield-lane": "지원이 올 때까지 중원으로 향하는 패스 길을 지킨다",
  "line-instructions": "짧고 꾸준한 지시로 수비 라인의 간격을 유지한다",
  "recover-before-box": "일찍 돌아서서 상대가 페널티지역에 들어가기 전에 따라잡는다",
  "simple-role-change": "위치를 바꾸면서도 우선순위는 단순하게 유지한다",
  "manage-tempo-risk": "경기 속도를 늦출 때와 위험을 감수할 때를 구분한다",
  "open-body-forward": "첫 터치부터 몸을 열어 전진 패스를 준비한다",
  "absorb-and-carry": "몸싸움을 버티면서도 공을 가까이 둬 계속 전진한다",
  "pin-and-create": "수비수 한 명을 묶어 다음 침투 선수를 위한 공간을 만든다",
  "early-position-adjustment": "미리 위치를 조정해 어려운 동작을 간결하게 처리한다",
  "check-runner": "마지막 패스가 오기 전에 어깨 너머로 침투 선수를 확인한다",
  "anticipate-second-ball": "첫 경합이 끝나기 전에 다음 터치를 위한 자리를 잡는다",
  "economical-save": "발을 계속 움직이며 최소한의 동작으로 선방한다",
  "near-post-run": "수비가 돌아서기 전에 가까운 골대 쪽 통로를 선점한다",
  "penalty-wait": "키커가 공을 차는 순간까지 기다렸다 방향을 정한다",
  "sweeper-exit": "스루패스가 최종 수비선을 넘는 순간 빠르게 전진해 처리한다",
  "shoot-left-foot": "왼발 쪽으로 공을 옮긴 뒤 백스윙을 최소화해 슈팅한다",
  "sudden-save-calm": "오랫동안 조용했던 경기에서도 갑작스러운 선방 상황에 침착하게 대응한다",
  "push-and-accelerate": "첫 압박 너머로 공을 밀어놓은 뒤 속도를 높인다",
  "block-cross-angle": "성급하게 달려들지 않으면서 크로스를 막을 거리까지 접근한다",
  "open-distance-shot": "깔끔한 첫 터치로 중거리 슈팅 통로를 연다",
  "body-bring-teammate": "몸으로 공을 지킨 뒤 동료가 공격 전개에 참여하도록 연결한다",
  "moving-finish": "움직이는 상태에서 도착해 가장 가까운 수비가 복귀하기 전에 슈팅한다",
  "hold-danger-lane": "동료가 압박할 수 있을 때까지 가장 위험한 통로를 지킨다",
  "shoot-before-reset": "가장 가까운 수비가 자리를 되찾기 전에 슈팅한다",
  "move-after-pass": "패스한 뒤에도 움직여 팀이 가까운 출구를 유지하게 한다",
  "protect-centre-goal": "골문 중앙부터 지키고 공에 먼저 닿을 수 있을 때만 전진한다",
  "composed-set-piece": "도움닫기 속도를 낮추고 균형을 잡은 뒤 서두르지 않고 킥한다",
  "receive-side-on": "옆을 향한 자세로 받아 다음 패스를 전진 방향으로 연결한다",
  "supporting-angle": "압박이 오기 전에 분명한 지원 각도로 이동한다",
  "close-first-touch": "첫 터치를 몸 가까이에 두어 다음 동작을 단순하게 만든다"
});

function formatPlayerStyleOpener(parsed, mention, quality) {
  if (parsed.variant === "watch") {
    return `${withKoreanParticle(mention, "을", "를")} 볼 때 주목할 점은 ${quality}이다.`;
  }
  if (parsed.variant === "signature") {
    return `${mention}의 대표적인 강점은 ${quality}이다.`;
  }
  if (parsed.variant === "edge") {
    return `${mention}의 차별점은 ${quality}이다.`;
  }
  if (parsed.variant === "style") {
    return `${mention} 플레이의 중심은 ${quality}이다.`;
  }
  if (parsed.variant === "defined") {
    return `${withKoreanParticle(mention, "을", "를")} 가장 잘 보여주는 특징은 ${quality}이다.`;
  }
  return `${mention}의 돋보이는 강점은 ${quality}이다.`;
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
    const mention = String(options.localizedName || parsed.mention || "").trim();
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
    const position = translateLineupPosition(parsed.position);
    const parts = [`${team} 대표로 ${parsed.year}년 월드컵에 나선 ${position}였다.`];
    if (parsed.goals) {
      parts.push(`월드컵에서 ${parsed.goals}골을 기록했다.`);
    }
    if (parsed.featuredMatches) {
      parts.push(`주요 경기 ${parsed.featuredMatches}경기에서 다뤘다.`);
    }
    return parts.join(" ");
  }

  if (parsed.kind === "historical-summary") {
    return `${parsed.year}년 월드컵 득점·출전·명단·경기 기록을 바탕으로 만든 역사 선수 카드다. 대표팀: ${translateTeamName(parsed.team)}.`;
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
    return `${matchday[1]}차전`;
  }
  return STAGES[stage] || EXACT[stage] || stage;
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
  return `${String(groupId || "").trim().toLocaleUpperCase("en-US")}조`.trim();
}

export function formatMatchLabel(matchNumber) {
  return `${matchNumber}번 경기`;
}

export function formatVersus(homeTeam, awayTeam) {
  return `${translateTeamName(homeTeam)} 대 ${translateTeamName(awayTeam)}`;
}

export function formatPoints(points) {
  return `${points}점`;
}

export function formatGamesLeft(matches) {
  return `${matches}경기 남음`;
}

export function formatWorldCupYear(year) {
  return `${year}년 월드컵`;
}

export function getSeoHomeCopy() {
  return {
    title: "2026 월드컵 일정·결과·순위·라인업 | 월드컵 한눈에",
    description:
      "종료된 2026 월드컵의 104경기 결과, 확인된 라인업, 순위, 짧은 경기 요약, 공식 하이라이트, 수상 내역과 대회 역사를 살펴보세요."
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
      title: `2026 월드컵 ${stage}: 시간·출전팀·경기 안내 | 월드컵 한눈에`,
      description: `2026 월드컵 ${stage}의 킥오프 시간, 출전팀, 라인업, 경기 배경과 전망을 확인하세요. 대진이 확정되면 바로 업데이트합니다.`,
      name: `2026 월드컵 ${stage}`
    };
  }
  if (isFinished) {
    return {
      title: `${home} 대 ${away}: 결과·라인업·하이라이트 | 2026 월드컵`,
      description: `${home} 대 ${away} 경기 결과, 확인된 라인업, 짧은 경기 요약과 제공 가능한 공식 하이라이트를 확인하세요.`,
      name: `${home} 대 ${away}`
    };
  }
  if (isLive) {
    return {
      title: `${home} 대 ${away}: 실시간 스코어·라인업 | 2026 월드컵`,
      description: `${home} 대 ${away}의 실시간 스코어, 확정 라인업, 경기 배경과 핵심 선수를 확인하세요.`,
      name: `${home} 대 ${away}`
    };
  }
  return {
    title: `${home} 대 ${away}: 시간·라인업·전망 | 2026 월드컵`,
    description: `${home} 대 ${away}의 현지 킥오프 시간, 예상 또는 확정 라인업, 경기 배경, 핵심 선수와 경기 전망을 확인하세요.`,
    name: `${home} 대 ${away}`
  };
}

export function formatAppMessage(type, data = {}) {
  const nameSeries = (items = []) => items.filter(Boolean).join("·");

  switch (type) {
    case "h2h-none":
      return "이 출처에서 이전 맞대결이 반환되지 않았습니다. 전체 역사가 완전한지는 확인되지 않았습니다.";
    case "h2h-record":
      return data.coverageStatus === "complete"
        ? `확인된 남자 A매치 ${data.total}경기: ${data.home} ${data.homeWins}승, ${data.away} ${data.awayWins}승, 무승부 ${data.draws}회.`
        : `데이터셋에서 확인할 수 있는 남자 A매치 ${data.total}경기: ${data.home} ${data.homeWins}승, ${data.away} ${data.awayWins}승, 무승부 ${data.draws}회. 전체 역사가 완전한지는 확인되지 않았습니다.`;
    case "player-note-fallback":
      return `선수 핵심 강점: ${(data.skills || []).join(" · ")}.`;
    case "flag-label":
      return `${data.teamName} 국기`;
    case "rank-label":
      return `${data.teamName} FIFA 랭킹 ${data.rank}위${data.year ? ` (${data.year})` : ""}`;
    case "elo-rank-label":
      return `${data.teamName} 회고적 Elo 랭킹 ${data.rank}위${data.year ? ` (${data.year})` : ""}`;
    case "elo-rank-tooltip":
      return data.year
        ? `${data.year} 월드컵 기간의 회고적 Elo 랭킹`
        : "월드컵 기간의 회고적 Elo 랭킹";
    case "rank-tooltip":
      return data.year
        ? `${data.year} 월드컵 기간의 FIFA 세계 랭킹`
        : "월드컵 기간의 FIFA 세계 랭킹";
    case "rank-aria":
      return `${data.label}. ${data.tooltip}`;
    case "fifa-snapshot":
      return `FIFA 스냅샷: ${data.snapshotLabel} · ${data.freshness} 확인`;
    case "score-penalties-suffix":
      return `, 승부차기 ${data.penaltyText}`;
    case "score-freshness-suffix":
      return `, 마지막 확인 ${data.freshness}`;
    case "score-pending-aria":
      return `${data.pendingText}; 확인된 스코어가 아직 없습니다`;
    case "live-aria":
      return `실시간: ${data.detail}`;
    case "official-added-time":
      return `${data.matchTime} (추가시간 +${data.addedMinutes}분)`;
    case "official-minute": {
      const timeLabel = data.stoppageMinute
        ? `${data.minute}+${data.stoppageMinute}분`
        : `${data.minute}분`;
      const addedTimeLabel =
        !data.stoppageMinute && data.addedTime > 0
          ? `, 추가시간 ${data.addedTime}분 발표`
          : "";
      const phaseLabel = data.phase === "Extra time" ? `, ${translateAppText(data.phase)}` : "";
      return `${timeLabel}${addedTimeLabel}${phaseLabel}`;
    }
    case "match-outcome":
      if (data.kind === "penalties") {
        return `${withKoreanParticle(data.winnerName, "이", "가")} 승부차기에서 이겼습니다`;
      }
      if (data.kind === "winner") {
        return `${withKoreanParticle(data.winnerName, "이", "가")} 이겼습니다`;
      }
      if (data.kind === "knockout-pending") {
        return "토너먼트 승자가 아직 확인되지 않았습니다";
      }
      return "무승부";
    case "accessibility-score":
      return `${data.home} ${data.homeScore}, ${data.away} ${data.awayScore}`;
    case "accessibility-penalties":
      return `${data.scoreText}, 승부차기 ${data.homePenalties} 대 ${data.awayPenalties}`;
    case "accessibility-announcement": {
      const matchup = `${data.home} 대 ${data.away}`;
      const scoreSentence = data.scoreText ? `${data.scoreText}.` : "";
      const phase = translateAppText(data.phase);
      if (data.kind === "started") {
        return `경기 시작: ${matchup}. ${scoreSentence}`.trim();
      }
      if (data.kind === "final") {
        return scoreSentence
          ? `경기 종료. ${scoreSentence}${data.outcomeText ? ` ${data.outcomeText}.` : ""}`.trim()
          : `경기 종료: ${matchup}.`;
      }
      if (data.kind === "final-score") {
        return scoreSentence
          ? `최종 스코어 업데이트. ${scoreSentence}`.trim()
          : `${matchup} 최종 스코어 업데이트. 확인된 스코어를 일시적으로 불러올 수 없습니다.`;
      }
      if (data.kind === "score") {
        return scoreSentence
          ? `스코어 업데이트. ${scoreSentence}`.trim()
          : `${matchup} 스코어 업데이트. 확인된 스코어를 일시적으로 불러올 수 없습니다.`;
      }
      if (data.kind === "delayed") {
        return `경기 지연: ${matchup}.`;
      }
      if (data.kind === "postponed") {
        return `경기 연기: ${matchup}.`;
      }
      if (data.kind === "cancelled") {
        return `경기 취소: ${matchup}.`;
      }
      if (data.kind === "phase") {
        return scoreSentence ? `${phase}. ${scoreSentence}`.trim() : `${phase}: ${matchup}.`;
      }
      return "";
    }
    case "full-time-prefix":
      return "경기 종료";
    case "source-current-time":
      return "현재 시간";
    case "source-checked":
      return `${data.freshness} 확인`;
    case "source-latest":
      return "최신 정보 보기";
    case "source-latest-aria":
      return "FIFA에서 최신 스코어 보기";
    case "open-match":
      return `${data.homeName} 대 ${data.awayName} 경기 상세 열기`;
    case "see-all-matches":
      return `${data.teamLabel} 전체 경기 보기`;
    case "view-bracket-round":
      return `토너먼트 대진표에서 ${data.label} 보기`;
    case "bench-unavailable":
      return data.isSuspended ? `${data.statusLabel}, 출전 불가` : "출전 불가";
    case "bench-status":
      return data.status === "suspended" ? "출전 정지" : "출전 불가";
    case "coach-role":
      return `${data.teamText} ${translateAppText("Head Coach")}`;
    case "coach-since":
      return `${data.year}년부터`;
    case "historical-local-time":
      return `${data.dateText} 현지 시간 ${data.timeText}`;
    case "historical-local-clock":
      return `현지 시간 ${data.timeText}`;
    case "tie-label":
      return "무승부";
    case "ordinal":
      return Number.isFinite(Number(data.value)) ? `${Number(data.value)}위` : "";
    case "third-place-race-rank":
      return `조 3위 경쟁 ${data.rank}`;
    case "older-world-cups-toggle":
      return `이전 월드컵 보기 (${data.count})`;
    case "key-info-fallback":
      return `${withKoreanParticle(data.teamName, "의", "의")} 핵심 선수는 ${nameSeries(data.playerNames)}입니다. ${data.notes.join(" ")}`.trim();
    case "historical-style-series":
      return nameSeries(data.items);
    case "tournament-basis":
      return data.basis === "loaded"
        ? "불러온 경기 전망"
        : data.basis === "conditional-model"
          ? "온라인 데이터로 보정한 조건부 전망"
          : data.basis === "conditional-online"
            ? "Opta와 현재 시장을 반영한 조건부 전망"
            : "확인된 전망 없음";
    case "tournament-team-reason": {
      if (data.variant === "conditional-model") {
        return `예상 ${data.matchupLabel} 대진이 확정될 경우 ${data.teamName}의 정규시간 승리 확률은 약 ${data.percent}%입니다. 조건부 모델은 Opta와 시장, 대회 경기력, 랭킹을 종합하며 대진 확정 뒤에는 직접 배당으로 교체됩니다.`;
      }
      if (data.variant === "conditional-online") {
        return `예상 대진이 결승으로 확정될 경우 ${data.teamName}의 우승 확률은 연장전과 승부차기를 포함해 약 ${data.percent}%입니다. Opta와 현재 시장을 반영한 조건부 전망입니다.`;
      }
      if (data.variant === "favorite") {
        return `${data.teamName}의 정규시간 승리 확률은 약 ${data.percent}%입니다.`;
      }
      if (data.variant === "close-underdog") {
        return `${data.teamName}의 정규시간 승리 확률은 약 ${data.percent}%입니다. 매우 접전이지만 ${withKoreanParticle(data.favoriteName, "이", "가")} 근소하게 앞섭니다.`;
      }
      return `${data.teamName}의 정규시간 승리 확률은 약 ${data.percent}%입니다. 이길 가능성은 있지만 ${withKoreanParticle(data.favoriteName, "이", "가")} 우세합니다.`;
    }
    case "tournament-likelihood":
      if (data.variant === "rank-close") {
        return `${withKoreanParticle(data.favoriteName, "과", "와")} ${data.otherName}의 FIFA 랭킹이 비슷합니다. 약 ${data.percent}%입니다.`;
      }
      if (data.variant === "rank-strong") {
        return `${data.favoriteName}의 FIFA 랭킹이 더 높습니다(${data.favoriteRank}위 대 ${data.otherRank}위). 약 ${data.percent}%입니다.`;
      }
      if (data.variant === "slot-pick") {
        return `${withKoreanParticle(data.favoriteName, "이", "가")} 현재 이 자리에 가장 유력합니다. 약 ${data.percent}%입니다.`;
      }
      if (data.variant === "advance-shootout") {
        return `${data.teamName}의 진출 확률이 가장 높습니다. 불러온 경기 전망과 승부차기 전망을 합산했습니다. 약 ${data.percent}%입니다.`;
      }
      if (data.variant === "advance-regulation") {
        return `${data.teamName}의 진출 확률이 가장 높습니다. 무승부 경로는 결정적 승리 확률에 따라 나눴습니다. 약 ${data.percent}%입니다.`;
      }
      if (data.variant === "only-team") {
        return `${withKoreanParticle(data.teamName, "이", "가")} 현재 이 자리에 확정된 유일한 팀입니다. 약 ${data.percent}%입니다.`;
      }
      return `${withKoreanParticle(data.teamName, "은", "는")} 이 준결승에서 패해 3·4위전으로 갈 가능성이 더 큽니다. 약 ${data.percent}%입니다.`;
    case "prediction-lead":
      return data.awayName
        ? `${data.homeName} 대 ${data.awayName} 대진을 기준으로 한 전망입니다.`
        : `${data.homeName}의 현재 진출 경로를 기준으로 한 전망입니다.`;
    case "slot-odds-reason": {
      const alternatives = data.alternatives?.length
        ? ` 다른 가능성: ${data.alternatives.join(", ")}.`
        : " 근접한 대안은 없습니다.";
      return `${withKoreanParticle(data.teamName, "이", "가")} 현재 ${data.slotLabel}에 가장 유력합니다.${alternatives}`;
    }
    case "shootout-default":
      return "120분 뒤에도 동점이면 승부차기로 승자를 가립니다.";
    case "shootout-even":
      return `120분 뒤에도 동점이면 승부차기 시장은 ${withKoreanParticle(data.homeName, "과", "와")} ${data.awayName} 사이에 뚜렷한 우세가 없다고 봅니다.`;
    case "shootout-edge":
      return `120분 뒤에도 동점이면 승부차기 시장은 ${withKoreanParticle(data.edgeName, "이", "가")} 약 ${data.edgePercent}%로 근소하게 앞선다고 봅니다.`;
    case "group-tie-reason":
      return `정규시간 무승부 확률은 약 ${data.tiePercent}%입니다. 조별리그 경기는 동점으로 끝납니다.`;
    case "knockout-draw":
      return `${data.homeName}${hasKoreanFinalConsonant(data.homeParticleSource) ? "과" : "와"} ${data.awayName}의 경기는 ${data.scoreText} 무승부로 끝났습니다`;
    case "knockout-penalties":
      return `${data.winnerName}${hasKoreanFinalConsonant(data.winnerParticleSource) ? "이" : "가"} ${data.scoreText} 무승부 뒤 승부차기 ${data.penaltyText}로 ${data.loserName}${hasKoreanFinalConsonant(data.loserParticleSource) ? "을" : "를"} 꺾었습니다.${data.searchAction || ""}`;
    case "knockout-win":
      return `${data.winnerName}${hasKoreanFinalConsonant(data.winnerParticleSource) ? "이" : "가"} ${data.loserName}${hasKoreanFinalConsonant(data.loserParticleSource) ? "을" : "를"} ${data.scoreText}로 꺾었습니다.${data.searchAction || ""}`;
    case "group-summary": {
      const segments = data.items.map((item) => {
        if (item.outcome === "win") {
          return `${item.opponent}에 ${item.scoreText} 승`;
        }
        if (item.outcome === "draw") {
          return `${item.opponent}와 ${item.scoreText} 무`;
        }
        return `${item.opponent}에 ${item.scoreText} 패`;
      });
      const remaining = data.remainingCount > 0
        ? ` 조별리그 ${data.remainingCount}경기가 남았습니다.`
        : "";
      return `${data.subject} 조별리그: ${segments.join("; ")}.${remaining}${data.searchAction || ""}`;
    }
    case "match-status":
      if (data.status === "live") {
        return `${data.matchup} 경기 진행 중, 스코어 ${data.scoreText}.`;
      }
      if (data.status === "delayed") {
        return `${data.matchup} 경기 시작이 지연됐습니다.`;
      }
      if (data.status === "predicted") {
        return `${data.matchup}: 현재 예상 대진입니다.`;
      }
      return `${data.matchup} 경기가 예정돼 있습니다.`;
    case "substitution-show":
      return `${data.label}. ${data.targetName} 보기.`;
    case "historical-archive-club":
      return `${translateTeamName(data.teamName)} ${data.year} 월드컵 아카이브`;
    case "player-stat-count":
      return `${data.count}${data.statName === "goals" ? "골" : "도움"}`;
    case "player-tournament-stats":
      return data.variant === "archive"
        ? `${data.year} 월드컵: ${data.parts.join(", ")}`
        : `이번 월드컵: ${data.parts.join(", ")}`;
    case "key-information-fallback": {
      const playerSentence = data.playerText
        ? ` 주목할 선수는 ${data.playerText}다.`
        : "";
      const matchupSentence = data.opponentName
        ? ` ${data.opponentName}전에서는 이 강점을 살리면서 상대의 ${withKoreanParticle(data.opponentTag, "을", "를")} 제한하는 것이 핵심이다.`
        : "";
      return `${withKoreanParticle(data.teamName, "은", "는")} ${withKoreanParticle(data.mainTag, "을", "를")} 중심으로 경기를 풀어간다.${playerSentence}${matchupSentence}`;
    }
    case "catch-up-tournament": {
      const winner = translateTeamName(data.winner);
      const loser = translateTeamName(data.loser);
      switch (data.variant) {
        case "golden-boot-chasers":
          return `${data.firstNames}도 ${data.firstGoals}골로 뒤를 잇고 있다.`;
        case "golden-boot-chasers-two-levels":
          return `${data.firstNames}도 ${data.firstGoals}골로 뒤를 잇고 있으며, ${data.secondNames}는 ${data.secondGoals}골을 기록 중이다.`;
        case "golden-boot-race-body":
          return `${data.leaderNames}의 득점은 ${data.topGoalTotal}골${data.leaderCount === 1 ? "" : "씩"}이다. ${data.chaserCopy}`.trim();
        case "golden-boot-race-headline":
          return data.leaderCount === 1
            ? `${withKoreanParticle(data.leaderNames, "이", "가")} ${data.topGoalTotal}골로 골든부트 경쟁을 이끌고 있다`
            : `${withKoreanParticle(data.leaderNames, "이", "가")} 골든부트 경쟁 공동 선두다`;
        case "golden-boot-meta":
          return "골든부트 경쟁";
        case "champion-body-penalties":
          return `${withKoreanParticle(winner, "이", "가")} 결승에서 ${withKoreanDirectionParticle(data.scoreText)} 비긴 뒤 승부차기에서 ${withKoreanParticle(loser, "을", "를")} 꺾었다.`;
        case "champion-body-final-round":
          return `${withKoreanParticle(winner, "이", "가")} 우승을 결정한 결선 리그 경기에서 ${withKoreanParticle(loser, "을", "를")} ${withKoreanDirectionParticle(data.scoreText)} 꺾었다.`;
        case "champion-body":
          return `${withKoreanParticle(winner, "이", "가")} 결승에서 ${withKoreanParticle(loser, "을", "를")} ${withKoreanDirectionParticle(data.scoreText)} 꺾었다.`;
        case "champion-headline":
          return `${withKoreanParticle(winner, "이", "가")} ${data.editionYear}년 세계 챔피언에 올랐다`;
        case "tournament-wrap-meta":
          return "대회 결산";
        case "golden-boot-winner-headline":
          return `${withKoreanParticle(data.playerName, "이", "가")} 골든부트를 수상했다`;
        case "golden-boot-winner-body":
          return `${withKoreanParticle(data.playerName, "은", "는")} ${data.goals}골${Number.isInteger(data.assists) ? ` ${data.assists}도움` : ""}으로 대회를 마쳤다.`;
        case "golden-boot-pending-headline":
          return "골든부트 공식 발표 대기";
        case "golden-boot-pending-body":
          return `${withKoreanParticle(data.leaderNames, "이", "가")} 현재 불러온 득점 기록에서 ${data.goalTotal}골로 ${data.leaderCount === 1 ? "선두" : "공동 선두"}다. 공식 수상자는 아직 확인되지 않았다.`;
        case "tournament-numbers-body":
          return "전체 경기 아카이브는 날짜와 대표팀별로 계속 확인할 수 있다.";
        case "tournament-numbers-headline":
          return `2026 월드컵: ${data.matchCount}경기, ${data.totalGoals}골`;
        default:
          return "";
      }
    }
    case "final-celebration-review": {
      const winner = translateTeamName(data.winner);
      if (data.variant === "title-history-previous") {
        const titleCounts = ["", "한", "두", "세", "네", "다섯"];
        const titleCount = titleCounts[data.titleNumber] || String(data.titleNumber);
        const playerClause = data.hasPlayers ? ` 당시 ${withKoreanParticle(data.playerNames, "이", "가")} 함께했다.` : "";
        return `${winner}의 ${titleCount} 번째 월드컵 우승이다. ${data.previousTitleYear}년 우승에 이은 쾌거다.${playerClause}`;
      }
      if (data.variant === "title-history-first") {
        return `${winner}의 첫 월드컵 우승이다${data.hasPlayers ? `. ${withKoreanParticle(data.playerNames, "이", "가")} 우승을 함께했다.` : "."}`;
      }
      if (data.variant === "philosophy") {
        const editionKey = `${data.editionYear}-${data.teamKey}`;
        const philosophies = {
          "1930-uruguay": "우루과이의 철학은 대담함이었다: 직선적으로 공격하고 스카로네를 통해 기회를 만들며 공격진을 파도처럼 전진시켰다.",
          "1934-italy": "이탈리아의 철학은 권위였다: 상대를 힘으로 누르고 빠르게 공격하며 메아차와 오르시에게 창의성을 맡겼다.",
          "1938-italy": "이탈리아의 철학은 규율이었다: 하나의 팀으로 수비한 뒤 메아차, 피올라, 콜라우시를 통해 전진했다.",
          "1950-uruguay": "우루과이의 철학은 침착함이었다: 브라질의 압박을 견디고 인내하며 기회가 열리는 순간 결정타를 날렸다.",
          "1954-germany": "서독의 철학은 믿음이었다: 조직을 유지하고 헝가리의 강도에 맞서며 마지막 휘슬까지 싸웠다.",
          "1958-brazil": "브라질의 철학은 자유였다: 균형 잡힌 공격 체계 안에서 펠레와 가린샤가 자유롭게 재능을 펼치게 했다.",
          "1962-brazil": "브라질의 철학은 회복력이었다: 펠레 없이도 적응하고 가린샤, 리듬, 끊임없는 측면 공격으로 우승했다.",
          "1966-england": "잉글랜드의 철학은 촘촘함이었다: 중원을 두껍게 하고 보비 찰턴을 풀어주며 여러 선수가 박스로 침투했다.",
          "1970-brazil": "브라질의 철학은 표현이었다: 공을 나누고 위치를 바꾸며 개인 기량을 유려한 공격으로 엮었다.",
          "1974-germany": "서독의 철학은 통제였다: 베켄바워를 통해 후방에서 전개하고 끈질기게 따라붙으며 뮐러가 박스를 지배하게 했다.",
          "1978-argentina": "아르헨티나의 철학은 주도권이었다: 전진하고 빠르게 연계하며 켐페스의 후방 침투를 살렸다.",
          "1982-italy": "이탈리아의 철학은 인내였다: 침착하게 수비하고 빠르게 역습하며 로시가 자신의 순간을 찾으리라 믿었다.",
          "1986-argentina": "아르헨티나의 철학은 해방이었다: 마라도나에게 자유를 주고 나머지 선수들을 그 주위에 조직했다.",
          "1990-germany": "서독의 철학은 강도였다: 더 높은 위치에서 압박하고 과감하게 공격하며 마테우스가 팀의 전진을 이끌게 했다.",
          "1994-brazil": "브라질의 철학은 균형이었다: 둥가를 통해 중원을 통제하고 호마리우와 베베투가 경기를 결정하게 했다.",
          "1998-france": "프랑스의 철학은 구조였다: 강한 수비에서 시작해 중원을 장악하고 지단이 모든 조각을 연결하게 했다.",
          "2002-brazil": "브라질의 철학은 폭이었다: 윙백으로 상대를 벌리고 호나우두의 박스 움직임을 중심으로 기회를 만들었다.",
          "2006-italy": "이탈리아의 철학은 신뢰였다: 최고의 수비를 믿고 피를로에게 공을 맡기며 팀 전체에서 득점을 기대했다.",
          "2010-spain": "스페인의 철학은 점유였다: 인내심 있게 공을 돌리고 경기장을 압축하며 공을 잃는 즉시 압박했다.",
          "2014-germany": "독일의 철학은 연계였다: 위치를 바꾸고 거세게 역압박하며 두터운 선수층으로 높은 템포를 유지했다.",
          "2018-france": "프랑스의 철학은 전환이었다: 촘촘하게 수비한 뒤 음바페와 그리즈만을 통해 공간으로 폭발했다.",
          "2022-argentina": "아르헨티나의 철학은 적응이었다: 메시에게 자유를 주고 중원 싸움에서 이기며 경기가 요구할 때마다 전형을 바꿨다.",
          "2026-spain": "스페인의 철학은 점유다: 공을 소유하고 경기장을 넓게 쓰며 공을 잃는 순간 상대를 에워싸 압박한다."
        };
        return philosophies[editionKey] || `${winner}은 조직, 공동의 노력, 개인 기량 사이에서 우승에 필요한 균형을 찾았다.`;
      }
      return "";
    }
    case "catch-up-result": {
      const winner = translateTeamName(data.winner);
      const loser = translateTeamName(data.loser);
      const home = translateTeamName(data.home);
      const away = translateTeamName(data.away);
      const leader = translateTeamName(data.leader);
      const chaser = translateTeamName(data.chaser);
      const nextStage = translateAppText(data.nextStage);
      const context = translateAppText(data.context);
      switch (data.variant) {
        case "final-headline":
          return `${withKoreanParticle(winner, "이", "가")} 월드컵 우승을 차지했다`;
        case "bronze-headline":
          return `${withKoreanParticle(winner, "이", "가")} 3위를 확정했다`;
        case "penalties-headline":
          return `${withKoreanParticle(winner, "이", "가")} 승부차기에서 ${withKoreanParticle(loser, "을", "를")} 넘었다`;
        case "edge-next-headline":
          return `${withKoreanParticle(winner, "이", "가")} ${withKoreanParticle(loser, "을", "를")} 한 골 차로 꺾고 ${nextStage}에 올랐다`;
        case "beat-next-headline":
          return `${withKoreanParticle(winner, "이", "가")} ${withKoreanParticle(loser, "을", "를")} 꺾고 ${nextStage}에 올랐다`;
        case "live-underway-headline":
          return `${home} 대 ${away} 경기가 시작됐다`;
        case "live-even-headline":
          return `${withKoreanParticle(home, "과", "와")} ${away}가 흐름을 주고받고 있다`;
        case "live-lead-headline":
          return `현재 ${withKoreanParticle(leader, "이", "가")} ${chaser}에 앞서 있다`;
        case "await-winner-headline":
          return `${home} 대 ${away} 경기의 승자 확인을 기다리고 있다`;
        case "split-points-headline":
          return `${withKoreanParticle(home, "과", "와")} ${away}가 승점 1점씩 나눠 가졌다`;
        case "statement-headline":
          return `${withKoreanParticle(winner, "이", "가")} ${loser}전에서 강한 인상을 남겼다`;
        case "sharp-headline":
          return `${withKoreanParticle(winner, "이", "가")} ${loser}전에서 날카로운 경기력을 보였다`;
        case "narrow-headline":
          return `${withKoreanParticle(winner, "이", "가")} ${withKoreanParticle(loser, "을", "를")} 한 골 차로 꺾었다`;
        case "live-underway-body":
          return `${context} 경기가 프리뷰 단계를 지나 본격적으로 시작됐다.`;
        case "live-even-body":
          return `현재 스코어는 ${data.scoreText}. 한 번의 장면으로 흐름이 바뀔 수 있다.`;
        case "live-lead-body":
          return `${withKoreanParticle(leader, "이", "가")} ${data.scoreText}로 앞서 있지만 ${chaser}에도 만회할 시간이 남아 있다.`;
        case "await-winner-body":
          return `${context} 스코어는 ${data.scoreText}로 불러왔지만 토너먼트 승자는 아직 확인되지 않았다.`;
        case "split-points-body":
          return `${data.scoreText} 무승부로 ${context}의 흐름이 열려 있고 두 팀 모두 다음 경기에 가져갈 결과를 얻었다.`;
        case "final-body":
          return `${withKoreanParticle(winner, "이", "가")} 결승에서 ${withKoreanParticle(loser, "을", "를")} ${data.scoreText}로 꺾었다.`;
        case "bronze-body":
          return `${withKoreanParticle(winner, "이", "가")} ${withKoreanParticle(loser, "을", "를")} ${data.scoreText}로 꺾고 3위를 차지했다.`;
        case "penalties-next-body":
          return `${withKoreanParticle(winner, "이", "가")} ${data.scoreText} 무승부 뒤 승부차기에서 이겨 ${nextStage}에 올랐고 ${loser}의 대회를 끝냈다.`;
        case "next-body":
          return `${winner}의 ${data.scoreText} 승리로 ${nextStage} 진출이 확정됐다.`;
        case "through-body":
          return `${winner}의 ${data.scoreText} 승리로 ${withKoreanParticle(context, "을", "를")} 통과했고 ${loser}의 대회를 끝냈다.`;
        case "group-win-body":
          return `${winner}의 ${data.scoreText} 승리로 ${context}에서 첫 발판을 마련했다.`;
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
      const nextStage = translateAppText(data.nextStage);
      switch (data.variant) {
        case "draw-focus-goalless":
          return `🌟 ${withKoreanParticle(data.homeFocus, "과", "와")} ${data.awayFocus}가 팽팽하게 맞섰지만 골은 나오지 않았다.`;
        case "draw-teams-goalless":
          return `🌟 ${withKoreanParticle(home, "과", "와")} ${away}가 서로를 봉쇄했다.`;
        case "draw-focus-level":
          return `🌟 ${withKoreanParticle(data.homeFocus, "과", "와")} ${data.awayFocus}가 흐름을 주고받았지만 승부를 가리지 못했다.`;
        case "draw-teams-level":
          return `🌟 ${withKoreanParticle(home, "과", "와")} ${away}가 흐름을 주고받았지만 승부를 가리지 못했다.`;
        case "draw-no-breakthrough":
          return "🌟 팽팽한 무승부에서 끝내 균형이 깨지지 않았다.";
        case "draw-knockout-impact":
          return `📊 ${context}의 토너먼트 승자는 아직 확인되지 않았다.`;
        case "draw-goalless-impact":
        case "draw-level-impact":
          return `📊 두 팀 모두 ${context}에서 승점 1점을 얻었다.`;
        case "draw-goalless-score":
          return `⚽ ${withKoreanParticle(home, "과", "와")} ${away}가 0-0으로 비겼다.`;
        case "draw-level-score":
          return `⚽ ${withKoreanParticle(home, "과", "와")} ${away}가 ${data.scoreText}로 비겼다.`;
        case "goal-hat-trick":
          return `🌟 ${withKoreanParticle(data.player, "이", "가")} 해트트릭을 완성하며 ${winner}의 대승을 이끌었다.`;
        case "goal-brace":
          return `🌟 ${withKoreanParticle(data.player, "이", "가")} 두 골을 넣으며 ${winner}의 리드를 벌렸다.`;
        case "goal-own-winner":
          return `🌟 ${data.minute} 자책골이 ${winner}의 승리를 결정했다.`;
        case "goal-winner":
          return `🌟 ${data.minute}에 나온 ${data.player}의 결승골이 ${winner}의 승리를 결정했다.`;
        case "goal-comeback":
          return `🌟 ${withKoreanParticle(data.player, "이", "가")} ${firstTeam}에 선제골을 안겼지만 ${withKoreanParticle(winner, "이", "가")} 뒤집었다.`;
        case "goal-bookends":
          return `🌟 ${withKoreanParticle(data.firstPlayer, "이", "가")} 선제골을 넣었고 ${withKoreanParticle(data.lastPlayer, "이", "가")} 마지막 골을 기록했다.`;
        case "champion-impact":
          return `📊 ${withKoreanParticle(winner, "이", "가")} 월드컵 우승을 차지했다.`;
        case "third-impact":
          return `📊 ${withKoreanParticle(winner, "이", "가")} 3위를 확정했다.`;
        case "advanced-impact":
          return `📊 ${withKoreanParticle(winner, "이", "가")} ${withKoreanParticle(context, "을", "를")} 통과했다.`;
        case "reached-impact":
          return `📊 ${withKoreanParticle(winner, "이", "가")} ${nextStage}에 올랐고 ${withKoreanParticle(loser, "은", "는")} 탈락했다.`;
        case "win-statement-score":
          return `⚽ ${withKoreanParticle(winner, "이", "가")} ${data.scoreText} 대승으로 강한 인상을 남겼다.`;
        case "win-penalties-score":
          return `⚽ ${withKoreanParticle(winner, "이", "가")} ${data.scoreText} 무승부 뒤 승부차기에서 ${withKoreanParticle(loser, "을", "를")} 꺾었다.`;
        case "win-edge-score":
          return `⚽ ${withKoreanParticle(winner, "이", "가")} ${withKoreanParticle(loser, "을", "를")} ${data.scoreText}로 한 골 차 승리를 거뒀다.`;
        case "win-decisive-score":
          return `⚽ ${withKoreanParticle(winner, "이", "가")} 결승골을 앞세워 ${data.scoreText}로 이겼다.`;
        case "win-score":
          return `⚽ ${withKoreanParticle(winner, "이", "가")} ${withKoreanParticle(loser, "을", "를")} ${data.scoreText}로 꺾었다.`;
        case "control-shootout":
          return `🌟 승부차기가 ${context}의 승자를 가렸다.`;
        case "control-knockout-clean-sheet":
          return `🌟 ${winner}의 무실점 수비가 ${loser}의 대회를 끝냈다.`;
        case "control-clean-sheet":
          return `🌟 무실점 수비로 ${loser}에 반격의 틈을 주지 않았다.`;
        case "control-attack":
          return `🌟 ${winner}의 공격이 경기의 균형을 무너뜨렸다.`;
        case "control-tight":
          return `🌟 ${withKoreanParticle(winner, "이", "가")} 팽팽한 한 골 차 승부를 이겨냈다.`;
        case "control-finish":
          return `🌟 ${withKoreanParticle(winner, "이", "가")} 충분한 격차를 만들고 경기 막판을 통제했다.`;
        case "group-three-points-gd":
          return `📊 ${withKoreanParticle(winner, "이", "가")} ${context}에서 승점 3점과 골득실 ${data.goalDifference}을 챙겼다.`;
        case "group-three-points":
          return `📊 ${withKoreanParticle(winner, "이", "가")} ${context}에서 승점 3점을 얻었다.`;
        default:
          return "";
      }
    }
    case "slot-unconfirmed":
      return `${data.label}: 아직 확정되지 않았습니다.`;
    case "winner-face":
      return `승자의 다음 상대는 ${data.opponent}입니다.${data.searchAction || ""}`;
    case "winner-face-resolved-penalties":
      return `승자의 다음 상대는 ${data.scoreText} 무승부 뒤 승부차기 ${data.penaltyText}로 ${data.loserName}을 꺾은 ${data.winnerName}입니다.${data.searchAction || ""}`;
    case "winner-face-resolved-win":
      return `승자의 다음 상대는 ${data.loserName}을 ${data.scoreText}로 꺾은 ${data.winnerName}입니다.${data.searchAction || ""}`;
    case "winner-face-predicted":
      return `승자는 ${data.matchup}의 예상 승자와 맞붙습니다`;
    case "winner-face-matchup":
      return `승자는 ${data.matchup}의 승자와 맞붙습니다`;
    case "winner-moves":
      return `승자는 ${data.nextStage}에 진출합니다`;
    case "historical-replay":
      return `이후 재경기가 열렸습니다: ${data.summary}`;
    case "historical-qualification":
      if (data.variant === "penalty-win") {
        return `${data.opponent} (${data.otherName}전 ${data.scoreText}, 승부차기 ${data.penaltyText} 승)`;
      }
      if (data.variant === "penalty-loss") {
        return `${data.opponent} (${data.otherName}전 ${data.scoreText}, 승부차기 ${data.penaltyText} 패)`;
      }
      if (data.variant === "win") {
        return `${data.opponent} (${data.otherName}전 ${data.teamScoreText} 승)`;
      }
      if (data.variant === "loss") {
        return `${data.opponent} (${data.otherName}전 ${data.teamScoreText} 패)`;
      }
      return data.opponent;
    case "historical-advanced-line":
      return `${data.teamName}의 다음 상대는 ${data.clause}였습니다.${data.searchAction || ""}`;
    case "historical-next-line":
      return `${data.kind === "winner" ? "승자" : "패자"}의 다음 상대는 ${data.clause}였습니다.${data.searchAction || ""}`;
    case "historical-headline": {
      const result = data.status === "cancelled"
        ? "경기 취소"
        : data.result === "tie"
          ? `${data.scoreText} 무승부`
          : data.result === "penalty-win"
            ? `승부차기 승리, ${data.scoreText}`
            : data.result === "penalty-loss"
              ? `승부차기 패배, ${data.scoreText}`
              : data.result === "win"
                ? `${data.scoreText} 승리`
                : `${data.scoreText} 패배`;
      return `${data.teamName}: ${result}`;
    }
    case "historical-opponent":
      return "상대 선수";
    case "historical-own-goal":
      return `${data.name}의 자책골`;
    case "historical-scorer-count":
      return data.count >= 3
        ? `${data.name} 해트트릭`
        : data.count === 2
          ? `${data.name} 2골`
          : `${data.name} 득점`;
    case "historical-benefited-own-goal":
      return `${data.name}로 득점`;
    case "historical-draw-scoring":
      return `⚽ ${withKoreanParticle(data.homeName, "과", "와")} ${data.awayName}의 경기는 ${data.scoreText} 무승부로 끝났습니다.`;
    case "historical-outcome":
      if (data.variant === "cancelled") {
        return `🚫 ${data.homeName} 대 ${data.awayName} 경기가 취소됐습니다.`;
      }
      if (data.variant === "draw") {
        return `🤝 ${withKoreanParticle(data.homeName, "과", "와")} ${data.awayName}의 경기는 ${data.scoreText} 무승부로 끝났습니다.`;
      }
      if (data.variant === "penalties") {
        return `🎯 ${withKoreanParticle(data.winner, "이", "가")} ${data.scoreText} 무승부 뒤 승부차기에서 ${withKoreanParticle(data.loser, "을", "를")} 꺾었습니다.`;
      }
      return `🏁 ${withKoreanParticle(data.winner, "이", "가")} ${withKoreanParticle(data.loser, "을", "를")} ${data.scoreText}로 꺾었습니다.`;
    case "historical-control":
      if (data.variant === "cancelled") {
        return `📌 취소된 경기는 ${data.context} 기록에 남아 있습니다.`;
      }
      if (data.variant === "shootout") {
        return `🌟 승부차기가 ${data.context}의 승부를 갈랐습니다.`;
      }
      if (data.variant === "extra-time") {
        return `🌟 ${data.winner || "경기"}가 연장전에서 승부를 냈습니다.`;
      }
      if (data.variant === "clean-sheet") {
        return `🌟 ${withKoreanParticle(data.winner, "이", "가")} 무실점으로 막았습니다.`;
      }
      if (data.variant === "open") {
        return `🌟 ${withKoreanParticle(data.winner, "이", "가")} 경기 흐름을 완전히 열었습니다.`;
      }
      if (data.variant === "protected") {
        return `🌟 ${withKoreanParticle(data.winner, "이", "가")} 결과를 지켰습니다.`;
      }
      if (data.variant === "draw-scoreless") {
        return `🌟 ${withKoreanParticle(data.homeFocus, "과", "와")} ${data.awayFocus} 모두 돌파구를 만들지 못했습니다.`;
      }
      return `🌟 ${withKoreanParticle(data.homeFocus, "과", "와")} ${data.awayFocus}가 흐름을 주고받았지만 승자는 없었습니다.`;
    case "historical-result-progress":
      if (data.variant === "cancelled") {
        return `📊 취소된 ${data.context} 경기에서는 승점이나 진출 결과가 나오지 않았습니다.`;
      }
      if (data.variant === "group-draw") {
        return `📊 두 팀 모두 ${data.context}에서 승점 1점을 얻었습니다.`;
      }
      if (data.variant === "group-win") {
        return `📊 ${withKoreanParticle(data.winner, "이", "가")} ${data.context}에서 승점 3점을 얻었습니다.`;
      }
      if (data.variant === "champion") {
        return `🏆 ${withKoreanParticle(data.winner, "이", "가")} ${data.tournament} 우승을 차지했습니다.`;
      }
      if (data.variant === "third") {
        return `🥉 ${withKoreanParticle(data.winner, "이", "가")} ${data.tournament} 3위를 차지했습니다.`;
      }
      if (data.variant === "advanced") {
        return `📊 ${withKoreanParticle(data.winner, "이", "가")} ${data.context}에서 다음 라운드로 진출했습니다.`;
      }
      return `📊 ${data.context} 경기는 무승부로 끝났습니다.`;
    case "historical-progress":
      if (data.variant === "next") {
        return `다음 경기: ${data.round}, ${data.opponent}전, ${data.date}.`;
      }
      if (data.variant === "champion") {
        return `이 경기로 ${data.tournament} 우승을 확정했습니다.`;
      }
      if (data.variant === "runner-up") {
        return `${data.tournament}을 준우승으로 마쳤습니다.`;
      }
      if (data.variant === "third-win") {
        return `${data.tournament} 3위를 확정했습니다.`;
      }
      if (data.variant === "third-loss") {
        return `${data.tournament} 3·4위전으로 대회를 마쳤습니다.`;
      }
      return `${data.tournament}에서 불러온 마지막 경기입니다.`;
    case "historical-team-body": {
      const result = data.status === "cancelled"
        ? `${data.opponent}전이 예정돼 있었지만 경기가 취소됐습니다.`
        : data.result === "tie"
          ? `${data.round}에서 ${withKoreanParticle(data.opponent, "과", "와")} ${data.scoreText}로 비겼습니다.`
          : data.result === "win"
            ? `${data.round}에서 ${withKoreanParticle(data.opponent, "을", "를")} ${data.scoreText}로 꺾었습니다.`
            : `${data.round}에서 ${data.opponent}에 ${data.scoreText}로 졌습니다.`;
      return [result, data.scorerText, data.progressionText].filter(Boolean).join(" ");
    }
    default:
      return "";
  }
}

function hasKoreanFinalConsonant(value) {
  const lastCharacter = Array.from(String(value || "").trim()).at(-1) || "";
  const codePoint = lastCharacter.codePointAt(0) || 0;
  return codePoint >= 0xac00 && codePoint <= 0xd7a3
    ? (codePoint - 0xac00) % 28 !== 0
    : false;
}

function withKoreanParticle(value, finalConsonantParticle, vowelParticle) {
  const text = String(value || "").trim();
  return `${text}${hasKoreanFinalConsonant(text) ? finalConsonantParticle : vowelParticle}`;
}

function withKoreanDirectionParticle(value) {
  const text = String(value || "").trim();
  const lastCharacter = Array.from(text).at(-1) || "";
  if (/\d/u.test(lastCharacter)) {
    return `${text}${/[013678]/u.test(lastCharacter) ? "으로" : "로"}`;
  }

  const codePoint = lastCharacter.codePointAt(0) || 0;
  if (codePoint >= 0xac00 && codePoint <= 0xd7a3) {
    const finalConsonant = (codePoint - 0xac00) % 28;
    return `${text}${finalConsonant !== 0 && finalConsonant !== 8 ? "으로" : "로"}`;
  }

  return `${text}로`;
}

export function formatWorldCupShootoutHistory(type, data = {}) {
  const team = (value) => translateTeamName(value);
  const topic = (value) => withKoreanParticle(team(value), "은", "는");
  const subject = (value) => withKoreanParticle(team(value), "이", "가");
  const and = (left, right) =>
    `${withKoreanParticle(team(left), "과", "와")} ${team(right)}`;
  if (type === "both-new") {
    return `승부차기로 가면 ${and(data.homeName, data.awayName)} 모두 월드컵 첫 승부차기입니다.`;
  }
  if (type === "one-new-winless") {
    return `승부차기로 가면 ${topic(data.newName)} 첫 승부차기이고, ${topic(data.experiencedName)} 월드컵 승부차기 ${data.appearances}번에서 아직 승리가 없습니다.`;
  }
  if (type === "one-new-experienced") {
    return `승부차기로 가면 ${topic(data.experiencedName)} 월드컵 승부차기 ${data.appearances}번에서 ${data.wins}승을 거둔 경험이 있고, ${topic(data.newName)} 첫 승부차기입니다.`;
  }
  if (type === "both-winless") {
    return `승부차기로 가면 두 팀 모두 월드컵 승부차기 첫 승에 도전합니다. ${topic(data.homeName)} ${data.homeAppearances}번, ${topic(data.awayName)} ${data.awayAppearances}번 도전했습니다.`;
  }
  if (type === "same-record") {
    return `승부차기로 가면 ${and(data.homeName, data.awayName)}의 월드컵 승부차기 기록은 ${data.appearances}번 중 ${data.wins}승으로 같습니다.`;
  }
  return `승부차기로 가면 ${subject(data.leanName)} ${data.edgeType === "experience" ? "경험" : "전적"}에서 근소하게 앞설 수 있습니다. 월드컵 승부차기 ${data.leanAppearances}번에서 ${data.leanWins}승을 거뒀고, ${topic(data.otherName)} ${data.otherAppearances}번에서 ${data.otherWins}승입니다.`;
}

export function formatSourcedShootoutReason(type, data = {}) {
  const teamName = translateTeamName(data.teamName);
  const subjectTeam = withKoreanParticle(teamName, "이", "가");
  const goalkeeperTopic = withKoreanParticle(data.goalkeeperName, "은", "는");
  if (type === "goalkeeper-taker") {
    return `승부차기로 가면 ${subjectTeam} 근소하게 앞설 수 있습니다. ${goalkeeperTopic} 승부차기 킥 ${data.faced}개 중 ${data.saved}개를 막았고, 그중 ${data.highlightSaved}개는 2023년 결승에서 나왔습니다. ${data.takerName}의 통산 페널티킥 성공률은 ${data.conversion}%입니다.`;
  }
  return `승부차기로 가면 ${subjectTeam} 근소하게 앞설 수 있습니다. 월드컵 승부차기 ${data.appearances}번 중 ${data.wins}번 이겼고, ${goalkeeperTopic} 국가대표 승부차기에서 한 번도 진 적이 없습니다.`;
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
  language: "ko",
  domain: "app",
  locale: "ko-KR",
  htmlLang: "ko",
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
