function result(variant, values = {}) {
  return Object.freeze({ variant, ...values });
}

function parseOwnGoalStory(text) {
  let match = text.match(
    /^A (\d+(?:\+\d+)?)' own goal struck first for (.+), forcing (.+) to chase the match\.$/u
  );
  if (match) {
    return result("own-goal-first", {
      minute: match[1],
      scoringTeam: match[2],
      chasingTeam: match[3]
    });
  }

  match = text.match(
    /^A (\d+(?:\+\d+)?)' own goal put (.+) ahead early, making (.+) chase the match\.$/u
  );
  if (match) {
    return result("own-goal-early", {
      minute: match[1],
      scoringTeam: match[2],
      chasingTeam: match[3]
    });
  }

  match = text.match(
    /^A (\d+(?:\+\d+)?)' own goal put (.+) in front before (.+) answered for (.+)\.$/u
  );
  if (match) {
    return result("own-goal-lead-reply", {
      minute: match[1],
      firstTeam: match[2],
      replyPlayer: match[3],
      replyTeam: match[4]
    });
  }

  match = text.match(
    /^A (\d+(?:\+\d+)?)' own goal brought (.+) level before (.+) completed the turnaround\.$/u
  );
  if (match) {
    return result("own-goal-level-comeback", {
      minute: match[1],
      levelTeam: match[2],
      winnerPlayer: match[3]
    });
  }

  match = text.match(
    /^A (\d+(?:\+\d+)?)' own goal broke through for (.+), shifting the match toward (.+)\.$/u
  );
  if (match) {
    return result("own-goal-breakthrough", {
      minute: match[1],
      scoringTeam: match[2],
      controlTeam: match[3]
    });
  }

  match = text.match(
    /^A (\d+(?:\+\d+)?)' own goal (rescued a point for .+|settled a tight match for .+|gave .+ a reply|added the final word as .+ pulled away)\.?$/u
  );
  if (!match) {
    return null;
  }

  const minute = match[1];
  const event = match[2].replace(/\.$/u, "");
  const point = event.match(/^rescued a point for (.+)$/u);
  if (point) {
    return result("own-goal-point", { minute, team: point[1] });
  }
  const winner = event.match(/^settled a tight match for (.+)$/u);
  if (winner) {
    return result("own-goal-winner", { minute, team: winner[1] });
  }
  const reply = event.match(/^gave (.+) a reply$/u);
  if (reply) {
    return result("own-goal-reply", { minute, team: reply[1] });
  }
  const finalGoal = event.match(/^added the final word as (.+) pulled away$/u);
  return finalGoal
    ? result("own-goal-final", { minute, team: finalGoal[1] })
    : null;
}

export function parseHistoricalResultStory(value) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }

  const ownGoal = parseOwnGoalStory(text);
  if (ownGoal) {
    return ownGoal;
  }

  let match = text.match(/^(.+) added the final word as (.+) pulled away\.$/u);
  if (match) {
    return result("final-goal", { player: match[1], team: match[2] });
  }

  match = text.match(
    /^(.+) broke through for (.+), shifting the match toward (.+)\.$/u
  );
  if (match) {
    return result("breakthrough", {
      player: match[1],
      scoringTeam: match[2],
      controlTeam: match[3]
    });
  }

  match = text.match(
    /^(.+) put (.+) ahead early, making (.+) chase the match\.$/u
  );
  if (match) {
    return result("early-lead", {
      player: match[1],
      scoringTeam: match[2],
      chasingTeam: match[3]
    });
  }

  match = text.match(
    /^(.+) struck first for (.+), forcing (.+) to chase the match\.$/u
  );
  if (match) {
    return result("opening-goal", {
      player: match[1],
      scoringTeam: match[2],
      chasingTeam: match[3]
    });
  }

  match = text.match(
    /^(.+) scored (twice|three times|4 times|5 times) as (.+) kept widening the gap\.$/u
  );
  if (match) {
    const goalCounts = {
      twice: 2,
      "three times": 3,
      "4 times": 4,
      "5 times": 5
    };
    return result("multi-goal", {
      player: match[1],
      goals: goalCounts[match[2]],
      team: match[3]
    });
  }

  match = text.match(
    /^(.+?)(?:'s|') (\d+(?:\+\d+)?)' winner settled a tight match for (.+)\.$/u
  );
  if (match) {
    return result("winner", {
      player: match[1],
      minute: match[2],
      team: match[3]
    });
  }

  match = text.match(
    /^(.+?)(?:'s|') (\d+(?:\+\d+)?)' equalizer brought (.+) level\.$/u
  );
  if (match) {
    return result("equalizer-level", {
      player: match[1],
      minute: match[2],
      team: match[3]
    });
  }

  match = text.match(
    /^(.+?)(?:'s|') (\d+(?:\+\d+)?)' equalizer rescued a point for (.+)\.$/u
  );
  if (match) {
    return result("equalizer-point", {
      player: match[1],
      minute: match[2],
      team: match[3]
    });
  }

  match = text.match(
    /^(.+?)(?:'s|') (\d+(?:\+\d+)?)' equalizer left the tie level\.$/u
  );
  if (match) {
    return result("equalizer-tie", {
      player: match[1],
      minute: match[2]
    });
  }

  match = text.match(
    /^(.+?)(?:'s|') (\d+(?:\+\d+)?)' equalizer eventually forced the shootout\.$/u
  );
  if (match) {
    return result("equalizer-shootout", {
      player: match[1],
      minute: match[2]
    });
  }

  match = text.match(
    /^(.+?)(?:'s|') (\d+(?:\+\d+)?)' (goal|penalty) gave (.+) a reply\.$/u
  );
  if (match) {
    return result(match[3] === "penalty" ? "penalty-reply" : "goal-reply", {
      player: match[1],
      minute: match[2],
      team: match[4]
    });
  }

  match = text.match(
    /^(.+) brought (.+) level before (.+) completed the turnaround\.$/u
  );
  if (match) {
    return result("level-comeback", {
      equalizerPlayer: match[1],
      team: match[2],
      winnerPlayer: match[3]
    });
  }

  match = text.match(
    /^(.+) put (.+) in front before a (\d+(?:\+\d+)?)' own goal answered for (.+)\.$/u
  );
  if (match) {
    return result("lead-own-goal-reply", {
      firstPlayer: match[1],
      firstTeam: match[2],
      minute: match[3],
      replyTeam: match[4]
    });
  }

  match = text.match(
    /^(.+) put (.+) in front before (.+) answered for (.+)\.$/u
  );
  if (match) {
    return result("lead-reply", {
      firstPlayer: match[1],
      firstTeam: match[2],
      replyPlayer: match[3],
      replyTeam: match[4]
    });
  }

  match = text.match(/^(.+) scored (twice|three times) as the draw kept swinging\.$/u);
  if (match) {
    return result("multi-goal-draw", {
      player: match[1],
      goals: match[2] === "twice" ? 2 : 3
    });
  }

  match = text.match(
    /^(.+) kept (.+) out and closed the match with a clean sheet\.$/u
  );
  if (match) {
    return result("clean-sheet", { team: match[1], opponent: match[2] });
  }

  match = text.match(
    /^(.+) and (.+) kept trading momentum instead of pulling clear\.$/u
  );
  if (match) {
    return result("open-draw", { home: match[1], away: match[2] });
  }

  match = text.match(
    /^(.+) and (.+) traded pressure without finding a goal\.$/u
  );
  if (match) {
    return result("goalless-draw", { home: match[1], away: match[2] });
  }

  match = text.match(/^(.+) and (.+) stayed scoreless until penalties\.$/u);
  if (match) {
    return result("scoreless-to-shootout", { home: match[1], away: match[2] });
  }

  if (text === "Both defenses kept the scoring lanes closed through full time.") {
    return result("defensive-stalemate");
  }

  match = text.match(
    /^(.+?)(?:'s|') attack kept finding space and turned the finish into a rout\.$/u
  );
  if (match) {
    return result("attacking-rout", { team: match[1] });
  }

  match = text.match(
    /^(.+?)(?:'s|') opener made (.+) sweat, but the later chances finally turned\.$/u
  );
  if (match) {
    return result("opener-overturned", {
      firstTeam: match[1],
      comebackTeam: match[2]
    });
  }

  if (
    text ===
    "The late pressure never produced a winner after the match came back level."
  ) {
    return result("late-pressure-draw");
  }

  match = text.match(
    /^The draw left the (.+) tie unresolved after (extra time|the final whistle)\.$/u
  );
  if (match) {
    return result("unresolved-tie", {
      stage: match[1],
      ending: match[2] === "extra time" ? "extra-time" : "full-time"
    });
  }

  match = text.match(
    /^The (\d+-\d+) grind stayed tense enough to leave the knockout tie to penalties\.$/u
  );
  if (match) {
    return result("shootout-grind", { score: match[1] });
  }

  match = text.match(
    /^(.+) were cleaner from the spot, winning (?:the World Cup (\d{4}) through )?the shootout (\d+-\d+) after the (\d+-\d+) draw\.$/u
  );
  if (match) {
    return result(match[2] ? "shootout-title" : "shootout-win", {
      team: match[1],
      year: match[2] || "",
      penalties: match[3],
      score: match[4]
    });
  }

  return null;
}

export function isGeneratedHistoricalResultStory(value) {
  return Boolean(parseHistoricalResultStory(value));
}

const TEAM_FIELDS = Object.freeze([
  "chasingTeam",
  "comebackTeam",
  "controlTeam",
  "firstTeam",
  "home",
  "away",
  "levelTeam",
  "opponent",
  "replyTeam",
  "scoringTeam",
  "team"
]);

const PLAYER_FIELDS = Object.freeze([
  "equalizerPlayer",
  "firstPlayer",
  "player",
  "replyPlayer",
  "winnerPlayer"
]);

export function localizeHistoricalResultStoryData(data, localizers = {}) {
  if (!data) {
    return null;
  }

  const localized = { ...data };
  for (const field of TEAM_FIELDS) {
    if (localized[field] && typeof localizers.team === "function") {
      localized[field] = localizers.team(localized[field]);
    }
  }
  for (const field of PLAYER_FIELDS) {
    if (localized[field] && typeof localizers.player === "function") {
      localized[field] = localizers.player(localized[field]);
    }
  }
  if (localized.stage && typeof localizers.stage === "function") {
    localized.stage = localizers.stage(localized.stage);
  }
  return localized;
}
