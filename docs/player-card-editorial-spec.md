# Player Card Editorial Spec

Player cards should explain what to watch in this World Cup, not repeat a career bio. The card already shows name, team, position, club, age, value, and skills. The note should give the reader one useful lens for the match.

## Reader Promise

After reading a player card, a casual fan should know what the player changes for his team or what to watch when he gets involved.

Good cards usually answer one of these questions:

- What is this player's World Cup job?
- What action should I look for during the match?
- What problem does he create for the opponent?
- What makes him different from another player in the same position?

## Evidence Order

Use tournament evidence before general reputation.

1. Verified World Cup lineups, positions, goals, assists, cards, and substitutions.
2. Match preview or result-story context already stored in fixture data.
3. Current official or reliable public tournament reporting.
4. Club or career profile only when tournament evidence is missing.

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
- `sourceFacts`: lineup positions, goals, assists, fixture copy, or sourced reporting used for the claim.
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

- The note is about this World Cup, not only the player's general career.
- Any side or position claim matches tournament usage.
- A new fan can understand the main point without knowing specialist terms.
- The batch does not reuse the same sentence pattern across many players.
- Chinese notes are updated with the same meaning when English notes change.
- Spotlight players get a stronger watch cue than depth players.
- Historical archive cards explain why the player mattered then, not how to scout him now.
