import assert from "node:assert/strict";
import {
  buildHistoricalBestXiDescriptionParagraphs,
  buildHistoricalBestXiEvidence
} from "../historical-best-xi-copy.js";

const names = {
  en: { mbappe: "Kylian Mbappé", buffon: "Gianluigi Buffon", pele: "Pelé", france: "France", italy: "Italy", brazil: "Brazil" },
  es: { mbappe: "Kylian Mbappé", buffon: "Gianluigi Buffon", pele: "Pelé", france: "Francia", italy: "Italia", brazil: "Brasil" },
  ko: { mbappe: "킬리안 음바페", buffon: "잔루이지 부폰", pele: "펠레", france: "프랑스", italy: "이탈리아", brazil: "브라질" },
  zh: { mbappe: "基利安·姆巴佩", buffon: "詹路易吉·布冯", pele: "贝利", france: "法国", italy: "意大利", brazil: "巴西" }
};
const stagePhrases = {
  en: {
    final: "reached the final",
    finalRound: "reached the final round",
    thirdPlace: "reached the third-place match",
    secondGroup: "reached the second group stage"
  },
  es: {
    final: "llegó a la final",
    finalRound: "alcanzó la liguilla final",
    thirdPlace: "llegó al partido por el tercer puesto",
    secondGroup: "alcanzó la segunda fase de grupos"
  },
  ko: {
    final: "결승에 올랐다",
    finalRound: "결승 리그에 올랐다",
    thirdPlace: "3·4위전에 올랐다",
    secondGroup: "2차 조별리그에 올랐다"
  },
  zh: {
    final: "世界杯决赛",
    finalRound: "世界杯决赛阶段",
    thirdPlace: "世界杯季军赛",
    secondGroup: "世界杯第二阶段小组赛"
  }
};

for (const language of ["en", "es", "ko", "zh"]) {
  const localeNames = names[language];
  const mbappe = buildHistoricalBestXiEvidence({
    language,
    playerName: localeNames.mbappe,
    teamName: localeNames.france,
    tournamentYear: 2022,
    position: "LW",
    goals: 8,
    tournamentAppearances: 7,
    tournamentStarts: 6,
    teamTournamentMatchCount: 7,
    teamTournamentGoalsFor: 16,
    tournamentTeamPerformance: "final"
  });
  assert.match(mbappe, /16/);
  assert.match(mbappe, /8/);
  assert.match(mbappe, /7/);
  assert.ok(mbappe.includes(localeNames.france));
  assert.ok(mbappe.includes(stagePhrases[language].final));

  const buffon = buildHistoricalBestXiEvidence({
    language,
    playerName: localeNames.buffon,
    teamName: localeNames.italy,
    tournamentYear: 2006,
    position: "GK",
    tournamentAppearances: 7,
    tournamentStarts: 7,
    teamTournamentMatchCount: 7,
    teamTournamentCleanSheets: 5,
    teamTournamentGoalsAgainst: 2,
    tournamentTeamPerformance: "final"
  });
  assert.match(buffon, /5/);
  assert.match(buffon, /2/);
  assert.ok(buffon.includes(localeNames.italy));
  assert.ok(buffon.includes(stagePhrases[language].final));

  const peleInput = {
    language,
    playerName: localeNames.pele,
    teamName: localeNames.brazil,
    tournamentYear: 1958,
    position: "F9",
    goals: 6,
    teamTournamentMatchCount: 6,
    teamTournamentGoalsFor: 16,
    teamTournamentGoalsAgainst: 4,
    tournamentTeamPerformance: "final"
  };
  const pele = buildHistoricalBestXiEvidence(peleInput);
  assert.match(pele, /16/);
  assert.match(pele, /6/);
  assert.ok(pele.includes(localeNames.brazil));

  for (const [performance, expectedPhrase] of [
    ["final round", stagePhrases[language].finalRound],
    ["third-place match", stagePhrases[language].thirdPlace],
    ["second group stage", stagePhrases[language].secondGroup]
  ]) {
    const stageCopy = buildHistoricalBestXiEvidence({
      language,
      playerName: localeNames.pele,
      teamName: localeNames.brazil,
      tournamentYear: 2022,
      position: "F9",
      teamTournamentMatchCount: 4,
      teamTournamentGoalsFor: 6,
      tournamentTeamPerformance: performance
    });
    assert.ok(stageCopy.includes(expectedPhrase));
  }

  const rationale = "Researched  rationale.\nSecond line stays intact.";
  const paragraphs = buildHistoricalBestXiDescriptionParagraphs(peleInput, rationale);
  assert.equal(paragraphs.length, 2);
  assert.equal(paragraphs[1], rationale);
}

console.log("Historical Best XI copy self-test passed for en, es, ko and zh.");
