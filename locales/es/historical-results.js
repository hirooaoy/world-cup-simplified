function goalCountLabel(count) {
  if (count === 2) {
    return "un doblete";
  }
  if (count === 3) {
    return "un triplete";
  }
  return `${count} goles`;
}

export function formatHistoricalResultStory(data = {}) {
  switch (data.variant) {
    case "own-goal-first":
    case "own-goal-early":
      return `Un autogol al ${data.minute}' adelantó a ${data.scoringTeam} y obligó a ${data.chasingTeam} a buscar el empate.`;
    case "own-goal-lead-reply":
      return `Un autogol al ${data.minute}' adelantó a ${data.firstTeam}, pero ${data.replyPlayer} empató para ${data.replyTeam}.`;
    case "own-goal-level-comeback":
      return `Un autogol al ${data.minute}' igualó el partido para ${data.levelTeam}, antes de que ${data.winnerPlayer} completara la remontada.`;
    case "own-goal-breakthrough":
      return `Un autogol al ${data.minute}' rompió el equilibrio para ${data.scoringTeam} e inclinó el partido a favor de ${data.controlTeam}.`;
    case "own-goal-point":
      return `Un autogol al ${data.minute}' rescató un punto para ${data.team}.`;
    case "own-goal-winner":
      return `Un autogol al ${data.minute}' decidió un partido cerrado a favor de ${data.team}.`;
    case "own-goal-reply":
      return `Un autogol al ${data.minute}' permitió a ${data.team} descontar.`;
    case "own-goal-final":
      return `Un autogol al ${data.minute}' cerró la goleada de ${data.team}.`;
    case "final-goal":
      return `${data.player} puso el broche final a la amplia victoria de ${data.team}.`;
    case "breakthrough":
      return `${data.player} rompió el equilibrio para ${data.scoringTeam} e inclinó el partido a favor de ${data.controlTeam}.`;
    case "early-lead":
      return `${data.player} adelantó temprano a ${data.scoringTeam} y obligó a ${data.chasingTeam} a buscar el empate.`;
    case "opening-goal":
      return `${data.player} abrió el marcador para ${data.scoringTeam} y obligó a ${data.chasingTeam} a buscar el empate.`;
    case "multi-goal":
      return `${data.player} firmó ${goalCountLabel(data.goals)} mientras ${data.team} ampliaba la ventaja.`;
    case "winner":
      return `El gol de ${data.player} al ${data.minute}' decidió un partido cerrado para ${data.team}.`;
    case "equalizer-level":
      return `${data.player} empató al ${data.minute}' para ${data.team}.`;
    case "equalizer-point":
      return `El empate de ${data.player} al ${data.minute}' rescató un punto para ${data.team}.`;
    case "equalizer-tie":
      return `${data.player} igualó la eliminatoria al ${data.minute}'.`;
    case "equalizer-shootout":
      return `El empate de ${data.player} al ${data.minute}' llevó la eliminatoria a los penales.`;
    case "goal-reply":
      return `El gol de ${data.player} al ${data.minute}' permitió a ${data.team} descontar.`;
    case "penalty-reply":
      return `El penal de ${data.player} al ${data.minute}' permitió a ${data.team} descontar.`;
    case "level-comeback":
      return `${data.equalizerPlayer} empató para ${data.team} antes de que ${data.winnerPlayer} completara la remontada.`;
    case "lead-own-goal-reply":
      return `${data.firstPlayer} adelantó a ${data.firstTeam}, pero un autogol al ${data.minute}' empató para ${data.replyTeam}.`;
    case "lead-reply":
      return `${data.firstPlayer} adelantó a ${data.firstTeam}, pero ${data.replyPlayer} empató para ${data.replyTeam}.`;
    case "multi-goal-draw":
      return `${data.player} firmó ${goalCountLabel(data.goals)} en un empate de constantes alternativas.`;
    case "clean-sheet":
      return `${data.team} neutralizó a ${data.opponent} y cerró el partido con el arco en cero.`;
    case "open-draw":
      return `${data.home} y ${data.away} intercambiaron el dominio sin que ninguno lograra despegarse.`;
    case "goalless-draw":
      return `${data.home} y ${data.away} se repartieron la presión, pero no encontraron el gol.`;
    case "scoreless-to-shootout":
      return `${data.home} y ${data.away} siguieron 0-0 hasta la tanda de penales.`;
    case "defensive-stalemate":
      return "Las dos defensas cerraron los caminos al gol durante todo el partido.";
    case "attacking-rout":
      return `El ataque de ${data.team} encontró espacios una y otra vez y convirtió el cierre en goleada.`;
    case "opener-overturned":
      return `${data.firstTeam} golpeó primero y puso en aprietos a ${data.comebackTeam}, pero ${data.comebackTeam} terminó remontando.`;
    case "late-pressure-draw":
      return "La presión final no rompió el empate después de que el partido volviera a quedar igualado.";
    case "unresolved-tie": {
      const stage = String(data.stage || "").replace(/^./u, (letter) =>
        letter.toLocaleLowerCase("es-419")
      );
      return `El empate dejó sin resolver el cruce de ${stage} tras ${
        data.ending === "extra-time" ? "el tiempo extra" : "el pitazo final"
      }.`;
    }
    case "replay-required":
      return `El empate ${data.score} obligó a disputar un partido de desempate para decidir quién avanzaba.`;
    case "replay-followup":
      return `Este partido de desempate se disputó después del empate ${data.score} del encuentro anterior.`;
    case "shootout-grind":
      return `El empate ${data.score} mantuvo la tensión y llevó la eliminatoria a los penales.`;
    case "shootout-win":
      return `${data.team} fue más eficaz desde los once metros y ganó ${data.penalties} en los penales tras el ${data.score}.`;
    case "shootout-title":
      return `${data.team} fue más eficaz desde los once metros y ganó ${data.penalties} en los penales tras el ${data.score} para conquistar el Mundial de ${data.year}.`;
    default:
      return "";
  }
}

export default formatHistoricalResultStory;
