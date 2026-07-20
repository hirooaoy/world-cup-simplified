function hasKoreanFinalConsonant(value) {
  const characters = Array.from(String(value || "").trim());
  const last = characters.at(-1) || "";
  const codePoint = last.codePointAt(0);
  if (codePoint >= 0xac00 && codePoint <= 0xd7a3) {
    return (codePoint - 0xac00) % 28 !== 0;
  }
  return /[013678lmnrt]$/iu.test(last);
}

function particle(value, withFinal, withoutFinal) {
  const text = String(value || "");
  return `${text}${hasKoreanFinalConsonant(text) ? withFinal : withoutFinal}`;
}

export function formatHistoricalResultStory(data = {}) {
  switch (data.variant) {
    case "own-goal-first":
    case "own-goal-early":
      return `${data.minute}분 자책골로 ${particle(data.scoringTeam, "이", "가")} 먼저 앞섰고, ${particle(data.chasingTeam, "은", "는")} 추격해야 했다.`;
    case "own-goal-lead-reply":
      return `${data.minute}분 자책골로 ${particle(data.firstTeam, "이", "가")} 앞섰지만 ${particle(data.replyPlayer, "이", "가")} ${data.replyTeam}의 동점골을 넣었다.`;
    case "own-goal-level-comeback":
      return `${data.minute}분 자책골로 ${particle(data.levelTeam, "이", "가")} 동점을 만든 뒤 ${particle(data.winnerPlayer, "이", "가")} 역전승을 완성했다.`;
    case "own-goal-breakthrough":
      return `${data.minute}분 자책골이 ${data.scoringTeam}의 균형을 깨며 흐름을 ${data.controlTeam} 쪽으로 기울였다.`;
    case "own-goal-point":
      return `${data.minute}분 자책골이 ${data.team}에 승점 1점을 안겼다.`;
    case "own-goal-winner":
      return `${data.minute}분 자책골이 ${data.team}의 팽팽한 승부를 결정했다.`;
    case "own-goal-reply":
      return `${data.minute}분 자책골로 ${particle(data.team, "이", "가")} 한 골을 만회했다.`;
    case "own-goal-final":
      return `${data.minute}분 자책골로 ${particle(data.team, "이", "가")} 대승을 마무리했다.`;
    case "final-goal":
      return `${particle(data.player, "이", "가")} 마지막 골을 보태 ${data.team}의 대승을 완성했다.`;
    case "breakthrough":
      return `${particle(data.player, "이", "가")} ${data.scoringTeam}의 균형을 깨며 경기를 ${data.controlTeam} 쪽으로 기울였다.`;
    case "early-lead":
      return `${particle(data.player, "이", "가")} ${data.scoringTeam}에 이른 리드를 안겨 ${particle(data.chasingTeam, "을", "를")} 추격하게 했다.`;
    case "opening-goal":
      return `${particle(data.player, "이", "가")} ${data.scoringTeam}의 선제골을 넣어 ${particle(data.chasingTeam, "을", "를")} 추격하게 했다.`;
    case "multi-goal":
      return `${particle(data.player, "이", "가")} ${data.goals}골을 넣으며 ${particle(data.team, "이", "가")} 격차를 벌렸다.`;
    case "winner":
      return `${data.minute}분 ${data.player}의 결승골로 ${particle(data.team, "이", "가")} 팽팽한 승부를 가져갔다.`;
    case "equalizer-level":
      return `${data.minute}분 ${data.player}의 동점골로 ${particle(data.team, "이", "가")} 균형을 맞췄다.`;
    case "equalizer-point":
      return `${data.minute}분 ${data.player}의 동점골로 ${particle(data.team, "이", "가")} 승점 1점을 챙겼다.`;
    case "equalizer-tie":
      return `${data.minute}분 ${data.player}의 동점골로 승부가 원점으로 돌아갔다.`;
    case "equalizer-shootout":
      return `${data.minute}분 ${data.player}의 동점골로 승부차기까지 이어졌다.`;
    case "goal-reply":
      return `${data.minute}분 ${data.player}의 골로 ${particle(data.team, "이", "가")} 한 골을 만회했다.`;
    case "penalty-reply":
      return `${data.minute}분 ${data.player}의 페널티킥으로 ${particle(data.team, "이", "가")} 한 골을 만회했다.`;
    case "level-comeback":
      return `${particle(data.equalizerPlayer, "이", "가")} ${data.team}의 동점을 만든 뒤 ${particle(data.winnerPlayer, "이", "가")} 역전승을 완성했다.`;
    case "lead-own-goal-reply":
      return `${particle(data.firstPlayer, "이", "가")} ${data.firstTeam}에 리드를 안겼지만 ${data.minute}분 자책골로 ${particle(data.replyTeam, "이", "가")} 동점을 만들었다.`;
    case "lead-reply":
      return `${particle(data.firstPlayer, "이", "가")} ${data.firstTeam}에 리드를 안겼지만 ${particle(data.replyPlayer, "이", "가")} ${data.replyTeam}의 동점골을 넣었다.`;
    case "multi-goal-draw":
      return `${particle(data.player, "이", "가")} ${data.goals}골을 넣었고 경기는 끝까지 흐름이 오간 무승부가 됐다.`;
    case "clean-sheet":
      return `${particle(data.team, "이", "가")} ${particle(data.opponent, "을", "를")} 무득점으로 묶고 무실점으로 경기를 마쳤다.`;
    case "open-draw":
      return `${particle(data.home, "과", "와")} ${data.away}가 흐름을 주고받았지만 어느 쪽도 달아나지 못했다.`;
    case "goalless-draw":
      return `${particle(data.home, "과", "와")} ${data.away}가 압박을 주고받았지만 골은 나오지 않았다.`;
    case "scoreless-to-shootout":
      return `${particle(data.home, "과", "와")} ${data.away}가 득점 없이 승부차기까지 갔다.`;
    case "defensive-stalemate":
      return "양 팀 수비가 경기 종료까지 득점 길목을 막았다.";
    case "attacking-rout":
      return `${data.team}의 공격이 계속 공간을 찾아내며 경기를 대승으로 마무리했다.`;
    case "opener-overturned":
      return `${particle(data.firstTeam, "이", "가")} 선제골로 ${particle(data.comebackTeam, "을", "를")} 흔들었지만 이후 기회를 살린 ${particle(data.comebackTeam, "이", "가")} 승부를 뒤집었다.`;
    case "late-pressure-draw":
      return "경기가 다시 동점이 된 뒤 막판 압박에도 결승골은 나오지 않았다.";
    case "unresolved-tie":
      return `${data.stage} 경기는 ${
        data.ending === "extra-time" ? "연장전 뒤에도" : "경기 종료까지"
      } 승부가 나지 않았다.`;
    case "replay-required":
      return `${data.score} 무승부로 진출 팀을 가리기 위한 재경기가 필요했다.`;
    case "replay-followup":
      return `이 재경기는 앞선 경기의 ${data.score} 무승부 뒤에 열렸다.`;
    case "shootout-grind":
      return `${data.score}의 팽팽한 흐름이 이어졌고 토너먼트 승부는 승부차기로 넘어갔다.`;
    case "shootout-win":
      return `${particle(data.team, "이", "가")} ${data.score} 무승부 뒤 승부차기에서 ${data.penalties}로 이겼다.`;
    case "shootout-title":
      return `${particle(data.team, "이", "가")} ${data.score} 무승부 뒤 승부차기 ${data.penalties} 승리로 ${data.year} 월드컵 우승을 차지했다.`;
    default:
      return "";
  }
}

export default formatHistoricalResultStory;
