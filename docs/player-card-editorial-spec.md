# Player Card Editorial Spec

Player cards should explain how a player plays, not repeat a career bio or a tournament stat line. The card already shows name, team, position, club, age, value, skills, and a live `This World Cup` row when the player has goals or assists. The note should give the reader one evergreen lens for watching the player.

## Reader Promise

After reading a player card, a casual fan should understand the player's signature strength, what it looks like on the pitch, and what makes him different from another player in the same position.

Good cards usually answer one of these questions:

- What is this player's usual job?
- What action should I look for during the match?
- What problem does he create for the opponent?
- What makes him different from another player in the same position?

## Evergreen Copy Boundary

The paragraph and the live stat row have different jobs:

- The paragraph explains play style, decision-making, movement, technique, or a distinctive physical strength.
- The `This World Cup` row owns current goals and assists because it is derived from fixture events and can update after every match.
- Do not put goal totals, assist totals, named 2026 opponents, or phrases such as `this World Cup` and `this tournament` in a current player's paragraph.
- A finishing or chance-creation strength is welcome, but describe how it works rather than citing the player's latest output.

## Evidence Order

Use the most reliable role and play-style evidence available.

1. Curated player strengths and verified role or position.
2. Verified World Cup lineups when they clarify where the player is currently used.
3. Current official or reliable reporting about the player's style.
4. Club or career profile when tournament usage is limited.

Do not make a player sound locked to a side or role if this World Cup has used him differently. For example, a player can be a right winger by profile, but if recent France lineups use him centrally, the card should describe the tournament role.

## Length

Vary the length by how much help the reader needs.

- One sentence for simple depth players or obvious roles.
- Two short sentences for starters, stars, confusing roles, or players with a clear watch cue.
- Three short sentences only for major tournament story players.

Avoid making every card follow the same rhythm.

## Voice

Write like a person explaining what to watch.

- Prefer short sentences.
- Use plain words before tactical jargon.
- Avoid semicolons.
- Avoid em dashes and dash-heavy sentence structure.
- Avoid repeated scaffolds such as "useful when", "dangerous when", "able to", and "valuable for".
- Avoid vague labels such as "creative spark", "engine", "reference point", and "option" unless the next words make the role specific.
- Do not overstate certainty. Use the player as he is being used in this tournament.

## Jargon Replacements

Use these plain versions unless the jargon is needed and clear from context.

- cutback: pulls the ball back for a runner
- byline: near the end line
- half-space: inside channel
- low block: deep defense
- rest defense: the players left back to stop counters
- between lines: the pocket between midfield and defense
- final third: around the box
- transition: after a turnover

## Scalable Data Shape

Future generation should draft the visible note from structured facts rather than from a single generic prompt. The useful internal fields are:

- `tournamentRole`: the player's current World Cup job.
- `watchCue`: the action a casual fan should notice.
- `sourceFacts`: role, technique, movement, physical traits, lineup positions, or sourced reporting used for the claim.
- `confidence`: `verified`, `inferred`, or `generic`.
- `note`: the final reader-facing copy.

The final `note` can stay as the app-facing field, but generation and review should preserve the facts that produced it.

## Historical Archive Cards

Archive cards answer a different question: why did this player matter in that tournament?

For historical profiles, the visible English card line comes from `styleNote`; the Chinese card line should come from `styleNoteZh`. Keep both more reflective than a current scouting note, but still grounded in stored archive facts:

- Use the tournament year and team as the frame.
- For scorers, lead with why the goal record mattered, then name the concrete match evidence.
- For non-scorers, explain the role in the team shape or featured match rather than forcing a legacy claim.
- Avoid internal phrases such as `archive lens`, `match lens`, `squad-context`, and `supporting a scoring route`.
- Famous players can get a stronger memory line, but the second sentence should still anchor the card to goals, starts, shootouts, or featured matches.
- When `styleNote` changes for historical cards, update `styleNoteZh` and `noteZh` in the same pass.
- The historical refresh and audit commands default to every archive year. Use `--years=2022,2018,1930` only for a targeted rerun.

## Review Checklist

Before shipping a batch:

- The note explains an evergreen play style or distinctive strength.
- Current goals, assists, opponents, and tournament totals appear only in the live stat row.
- Any side or position claim matches tournament usage.
- A new fan can understand the main point without knowing specialist terms.
- The batch does not reuse the same sentence pattern across many players.
- Chinese notes are updated with the same meaning when English notes change.
- Spotlight players get a stronger watch cue than depth players.
- Historical archive cards explain why the player mattered then, not how to scout him now.
