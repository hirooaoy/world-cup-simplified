const reportLocale = {
  schemaVersion: 1,
  language: "ko",
  domain: "report",
  text: {
    addNote: "보내기 전에 간단한 설명을 입력해 주세요.",
    attachedContext: "첨부 정보",
    back: "돌아가기",
    completeRequired: "오류 유형을 선택하고 자세한 내용을 입력해 주세요.",
    date: "날짜",
    details: "상세 내용",
    emailPlaceholder: "name@example.com",
    issue: "오류 유형",
    issueOptions: {
      "": "오류 유형을 선택하세요",
      "match-score-schedule": "경기, 점수 또는 일정",
      "lineup-player": "라인업 또는 선수 정보",
      "prediction-standings": "예측 또는 순위",
      other: "기타"
    },
    metaDescription: "World Cup Simplified의 일정이나 데이터에서 발견한 오류를 알려 주세요.",
    optional: "(선택 사항)",
    reportFailed: "현재 제보를 보낼 수 없습니다. 잠시 후 다시 시도해 주세요.",
    reportHeading: "오류 제보",
    reportSent: "제보가 접수되었습니다. 감사합니다.",
    replyEmail: "답변 받을 이메일",
    sending: "보내는 중…",
    sendReport: "제보 보내기",
    timezone: "시간대",
    title: "오류 제보 | World Cup Simplified",
    website: "웹사이트",
    whatChanged: "어떤 내용을 수정해야 하나요?"
  },
  footerText: {
    dataRefreshed: "데이터 업데이트:",
    fallbackRelease: "릴리스 노트에서 최신 앱 변경 사항을 확인할 수 있습니다.",
    latestChanges: "최근 변경 사항",
    madeBy: "제작",
    predictions: "예측은 공식 정보가 아닙니다.",
    releaseNotes: "릴리스 노트 보기",
    releaseNotesLabel: "릴리스 노트",
    reportIssue: "오류 제보",
    seeSources: "출처 보기",
    sources: "출처",
    tournamentFacts: "대회 공식 정보",
    tournamentFactsAndConfirmedLineups: "대회 공식 정보 및 확정 라인업",
    forecasts: "예측",
    publicBettingMarkets: "공개 베팅 시장",
    predictedLineupsAndTeamNews: "예상 라인업 및 팀 소식",
    playerInformation: "선수 정보",
    headToHeadRecords: "상대 전적",
    officialHighlights: "공식 하이라이트",
    exactSources: "경기별 세부 출처는 다를 수 있습니다."
  },
  formatting: {
    creatorPattern: "{creator} 제작",
    labelSeparator: ": ",
    sentenceEnd: "."
  },
  timeZoneNames: {
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
  },
  releaseNotes: {
    "Cleaner, timezone-aware data freshness": {
      title: "더 간결하고 시간대에 맞는 데이터 업데이트 표시",
      highlights: [
        "바닥글은 이제 출처 보기, 최신 데이터 업데이트 시간, 릴리스 노트 보기 링크만 간결하게 표시하며 비공식 예측 안내를 반복하지 않습니다.",
        "데이터 업데이트 시간은 해당할 때 ‘오늘’ 또는 ‘어제’로 표시하고, 그보다 오래된 경우 날짜를 표시합니다. 날짜와 시간은 선택한 시간대를 따르며 시간대 약어를 반복하지 않습니다.",
        "메인 앱과 오류 제보 페이지는 이제 같은 바닥글 문구와 시간대 동작을 사용하며, 로스앤젤레스와 도쿄를 대상으로 한 자동 검사를 포함합니다."
      ]
    },
    "Clearer tooltips, smoother match selection, and stronger football visuals": {
      title: "더 명확한 도움말, 더 매끄러운 경기 선택, 더 완성도 높은 축구 화면",
      highlights: [
        "데스크톱 경기 상세 스크롤 카드의 정보 툴팁이 이제 세로 방향 잘림을 감지합니다. 위쪽 공간이 부족하면 버튼 아래에 열리고, 공간이 충분하면 기존처럼 위쪽에 표시됩니다.",
        "저렐 콴사의 출전 정지 벤치 행에서는 상태 정보가 접근성 레이블과 퇴장 카드 툴팁에 유지되며, 배지 안의 ‘출전 정지’ 문구는 중복 표시되지 않습니다. 긴 설명도 화면 밖으로 넘치지 않고 자연스럽게 줄바꿈됩니다.",
        "간결한 국가 검색 결과에서 경기를 선택하면 이제 해당 경기 상세 정보로 부드럽게 이동합니다. 동작 줄이기 설정을 사용하면 즉시 이동합니다."
      ]
    }
  }
};

export default reportLocale;
