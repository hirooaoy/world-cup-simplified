# Player Card Editorial Spec

Player cards should explain how a player plays, not repeat a career bio or a tournament stat line. The card already shows name, team, position, club, age, value, skills, and a live `This World Cup` row when the player has goals or assists. The generic profile note should give the reader an evergreen lens for watching the player.

## Reader Promise

After reading a player card, a casual fan should understand three things: the player's signature strength, what it looks like on the pitch, and a second action or decision that makes him different from another player in the same position.

Good cards usually answer one of these questions:

- What is this player's usual job?
- What action should I look for during the match?
- What problem does he create for the opponent?
- What makes him different from another player in the same position?

These are three content beats, not three mandatory sentence slots. Two well-shaped sentences can carry all three beats, while a complicated role may need three or four short sentences. Do not force every player through the same `Name does X. He does Y. He does Z.` rhythm.

The paragraph must also work as one argument. At least one observable action must directly demonstrate the opening strength. If the final beat comes from a different part of the player's game, introduce it as a genuine change of phase rather than with causal scaffolding such as `one clue`, `you can see it`, or `it shows when`. Three individually plausible traits do not make a coherent note when the examples fail to explain the headline.

## Copy Layers

Keep the three player-copy jobs separate:

- The generic profile note explains how the player usually plays. It is evergreen and should be the source used by a normal player information card.
- A fixture key-player teaser explains why the player matters to that particular match preview. It can be one concise sentence, but it must not replace the generic profile note when the card opens.
- A Best XI rationale explains why the player was selected for one tournament team. It can cite tournament output, compare candidates, and use the longer evidence-and-rationale format.

Do not copy a fixture teaser into `profile.note`, and do not use a Best XI rationale as generic player identity. A card opened from a lineup, scorer, fixture preview, search result, or generic highlights surface should resolve to the same generic note. A Best XI surface may deliberately render its separate selection rationale.

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

A stored skill tag is an editorial input, not independent proof of every mechanism generated from it. Confidence must reflect the strength of the underlying evidence route, not merely the number of parseable tags. A biography, squad page, goal event, converted penalty, or substitute appearance does not by itself establish a player's first-touch technique, movement pattern, penalty routine, or pressing behavior.

Keep the prose at the same level of specificity as its source. `Shot stopping` can support readiness to face a shot, but not a claim about parry direction, hand-foot coordination, or economical movement. `Left-footed passing`, `disguised passing`, `pulled-back passes`, and similar labels need their own faithful actions rather than being collapsed into a convenient generic passing template. A deterministic hash may vary equivalent wording; it must never choose which football identity to assign. Historical cards with position evidence only may rotate among conservative viewing lenses for that resolved role, but the prose and metadata must identify the result as a role guide rather than a personal trait. That fallback must lose to every reviewed, rationale-backed, or genuinely independent profile source.

## Length

Generic profile notes should normally use 2-4 short sentences and roughly 30-50 English words. The hard quality floor is three content beats and enough substance to explain them, not an exact sentence count.

- Beat 1 identifies the signature strength, role, or decision.
- Beat 2 shows one observable action, including its timing, space, body shape, or technical mechanism.
- Beat 3 adds a distinct supporting action such as combination play, pressing, protection, recovery, distribution, or a second attacking behavior.
- Use a fourth sentence only when it makes a genuinely complicated role easier to understand.

Fixture teasers and Best XI rationales follow their own formats. Avoid making generic notes follow one repeated opener, sentence count, or pronoun rhythm across the corpus.

## Voice

Write like a person explaining what to watch.

- Prefer short sentences.
- Use plain words before tactical jargon.
- Avoid semicolons.
- Avoid em dashes and dash-heavy sentence structure.
- Avoid repeated scaffolds such as "useful when", "dangerous when", "able to", and "valuable for".
- Avoid vague labels such as "creative spark", "engine", "reference point", and "option" unless the next words make the role specific.
- Prefer actions with a visible mechanism: when the run starts, which lane is protected, how the first touch changes the angle, or what the player does after releasing the ball.
- Keep the headline and its evidence together. Do not remove the action that explains the headline simply to maximize semantic variety.
- When a second trait genuinely belongs to another phase, name the phase plainly: `Without the ball`, `After releasing it`, `When the team loses possession`, or another natural transition that fits the action.
- Vary sentence joins and subjects naturally. Repeating a useful football action is acceptable; repeating the same full structure across many unrelated players is a review signal.
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

Generate the visible note from structured football facts, not from a single generic prompt. The prose may vary, but the semantic record must survive so another locale, audit, or future edition can reconstruct the same meaning.

Current profiles use `noteMeta`:

- `origin`: `authored` or `generated`.
- `generatorVersion`: the copy contract that produced a generated note.
- `roleGroup`: goalkeeper, defender, midfielder, forward, or the deliberately reviewed generic fallback.
- `signatureId`: the main quality in the opening beat.
- `actionIds`: exactly two distinct observable supporting actions.
- `structureId`: the sentence shape used to express those beats.
- `sourceSkills`: zero to three compatible skill tags that actually exist on the effective player profile or edition override.
- `roleFallbacks`: conservative position-level cues used only when the stored evidence cannot provide three distinct beats. Never present these as researched individual traits.
- `confidence`: a bounded score that rises with real source-skill support.

Historical profiles use `styleNoteMeta`:

- `origin` and `version` identify authored spotlights versus generated archive copy.
- `role`, `signature`, `actions`, and `structureId` carry the same semantic job as the current fields.
- `sources` records the archive inputs used to build the card.
- `evidence` names the evidence route, including `editorial-best-xi`, scorer or penalty evidence, or the explicit `role-inference` fallback.
- `confidence` is `editorial`, `reviewed`, or `role-level`. `Reviewed` requires concrete exact-edition archive evidence; broad position inference is always `role-level`.

The same historical player should retain a recognizable core trait across editions when the team and role are comparable. Tournament-specific actions can change with the evidence, but diversity must not come from assigning a completely different football identity to the player every four years. A multi-goal tournament record should contribute one compatible scoring beat, while a Best XI or honourable-mention label may raise confidence to `editorial` only when the stored rationale directly supports the trait being described.

English and Chinese remain stored card copy. Spanish and Korean generated notes render from these semantic IDs, so one reviewed phrase improves every relevant card without shipping thousands of full-note translations. Authored prose needs either a reviewed exact translation or a successful semantic-parser route.

## Authored-Copy Preservation

Preservation is metadata-driven. A long note is not automatically authored, and a short note is not automatically disposable.

- A note marked `origin: "authored"` must survive routine profile rebuilds and copy refreshes unchanged.
- The edition override is the rebuild source of truth for authored current copy. Refreshing must restore that effective override into canonical profile data rather than preserving a stale canonical version.
- Store and preserve the English note, Chinese note, and semantic metadata together.
- Approved anchor examples should have exact regression checks in the audit, not only approximate sentence or word-count checks.
- Replacing authored copy requires the explicit substantive-rewrite path and editorial review.

## Historical Archive Cards

Archive cards use the same paragraph/stat boundary as current cards. The paragraph explains how the player played; completed tournament output belongs in a separate year-labeled row such as `2022 World Cup: 3 goals`.

Each historical profile is an edition-specific portrait. `Evergreen` means representative of the player's role and behaviour in that World Cup period without depending on one scoreline, opponent, or live statistic; it does not mean a timeless career summary. A shared player identity may support research reuse and contradiction checks, but another edition must not choose the visible headline, role, or actions. Messi in 2014, 2018, and 2022 therefore remains three separate editorial decisions.

For historical profiles, the visible English card line comes from `styleNote`; the Chinese card line should come from `styleNoteZh`. Keep both grounded in what the archive can honestly support:

- Keep the tournament year and team in the archive identity line rather than repeating them in the paragraph.
- Describe role, movement, technique, decision-making, or a distinctive physical strength rather than goals, opponents, scorelines, or appearances.
- Show completed scoring totals in the separate year-labeled stat row; do not repeat them in `styleNote`.
- Use a conservative but still concrete three-beat position-and-trait explanation when the archive lacks detailed scouting evidence.
- Give researched spotlight players more specific copy only when the claim is well supported.
- Do not equate a broad position with one universal style. For example, not every forward is a runner behind the defense and not every midfielder is primarily a tempo controller.
- Resolve broad or missing roles from tournament lineups, edition-specific selections, and reviewed identity records before generating prose. A generic `player` role must never receive goalkeeper, finishing, or other position-specific mechanics merely because the player recorded a goal or appearance.
- Broad `defender` and `forward` records must remain broad until there is evidence for centre-back, full-back, winger, striker, or another subrole. Do not randomly select a narrower role catalogue merely to create variety.
- Treat scorer, penalty, starter, and substitute records as tournament context, not scouting reports. They may support a restrained statement about output or usage, but they cannot establish the technique behind the event without additional evidence.
- When only role-level evidence exists, use honest role-oriented language instead of claiming that a guessed behavior is the player's defining trait, signature, or edge.
- A role-guide lens may vary conservative responsibilities inside the resolved role to stop whole squads receiving one identical paragraph. Keep that choice roster-aware and deterministic, store its variant id, and never use editorial-only vocabulary in the fallback route. This is presentation diversity, not evidence that the selected action defined the individual.
- Reuse a role-guide lens across comparable editions of the same player where possible. Roster anti-repetition must not make one identity acquire a contradictory style every four years.
- Audit recurring players across editions even when the stored role changes. Legitimate evolution is welcome; coarse position drift is not. Never propagate one edition's subrole into another edition without same-year support merely to make the recurring signature stable.
- Exact-edition evidence must outrank continuity. When no same-edition evidence exists, retain an honest role guide rather than importing a famous action, Best XI rationale, or canonical position from another World Cup.
- Recorded semantic sources must influence the selected quality and actions. Storing a skill or rationale in metadata while choosing the visible portrait from an unrelated role catalogue is a provenance failure.
- Avoid internal phrases such as `archive lens`, `match lens`, `squad-context`, and `supporting a scoring route`.
- When `styleNote` changes for historical cards, update `styleNoteZh` and `noteZh` in the same pass.
- If no reviewed Chinese name is stored, keep the canonical display name intact in Chinese prose rather than inventing a transliteration. The exact-note audit should still prevent two different cards from rendering the same paragraph.
- The historical refresh and audit commands default to every archive year. Use `--years=2022,2018,1930` only for a targeted rerun.

## Best XI Rationale

Best XI copy answers a different question: why this player or coach belongs in this tournament selection.

- Lead with the selection case, not a generic career biography.
- Support it with tournament-specific evidence, then explain the play-style action or tactical value behind that evidence.
- For a champion-side selection, state the player's contribution to winning that World Cup plainly rather than leaving the title implicit.
- Do not repeat the same stat in both paragraphs or restart both paragraphs with the player's name.
- Resolve position from the actual Best XI selection before falling back to a generic profile position.
- A coach rationale should explain the tournament decisions, structure, or adaptation that earned selection.
- Keep starters, honourable mentions, and coaches complete in every edition and locale. Copy edits must not silently change protected selection membership or positions.
- Review the band as a reading sequence as well as one card at a time. A run of `Name + statistics. He/His + mechanism.` paragraphs is still templated even when every individual rationale is accurate.

## Corpus Quality Gates

Review the corpus as a system as well as reading individual stars.

- Every renderable profile must have role-compatible semantic metadata, substantive English and Chinese copy, and a working Spanish and Korean route.
- Current generated copy rejects exact full-note reuse in both stored languages, excessive signature/action concentration within each role as well as across the whole corpus, oversized semantic-triple groups, overlapping action families, unsupported source skills, broken name references, and goalkeeper/outfield crossovers.
- Current generated copy must also prove headline-to-action support, distinguish a causal continuation from a separate phase, and report the real abstract sentence-shell distribution after names and semantic phrases are removed.
- Source-to-semantic regressions must check direction as well as vocabulary. A set-piece target is not automatically a set-piece taker, aerial finishing is not generic stronger-foot shooting, defensive back-post cover is not an attacking far-post run, and leadership must render in language natural to the player's role.
- Historical copy rejects unsupported penalty praise, weak evidence labelled as `reviewed`, editorial confidence without a matching rationale, unresolved generic `player` roles, incoherent core traits for recurring players, overlapping action families, duplicate localized notes, and concentrated role phrases.
- Historical copy must report unresolved roles, role changes for the same identity, unused available Best XI rationale evidence, and technique claims inferred only from goals, penalties, starts, or substitute appearances.
- Exact Best XI and honourable-mention rationales are the first historical enrichment tier. The audit must report rationales whose observable mechanics were ignored, while allowing totals-only or narrative-only rationales to remain role-level rather than forcing an unsupported technique.
- Historical metadata must state whether the second action reinforces the headline or belongs to another phase, and the visible join must agree. The independent prose parser must recover the declared structure without relying on metadata to excuse malformed copy.
- Locale checks must catch hard grammar defects, doubled tokens, sentence-boundary capitalization, and repeated calques. Semantic parity and exact-note uniqueness are necessary but do not establish native-language quality.
- The generic-card routing audit must prove that lineup, search, scorer, highlights, and fixture entry points open the canonical generic note. Fixture teasers stay contextual and separate.
- A generator dry run after refresh must report zero pending updates. This catches unstable templates and incomplete override syncing.
- Locale and Best XI audits are release gates, not optional follow-up review.

Run the integrated editorial checks with:

```sh
pnpm profiles:copy:audit
pnpm audit:locales
node scripts/audit-historical-best-xi-quality.mjs
node scripts/audit-historical-highlights.mjs
node scripts/validate-data.mjs
```

## Coverage and Future Editions

The quality promise applies to every player object the product can render, but coverage claims must name the actual data universe.

- The active-edition roster contract covers every canonical squad profile. For 2026 that is 48 teams with 26 profiles each.
- The historical contract covers every stored historical profile and every archive player surfaced by the app. It does not claim that the current archive already contains every squad member who attended every World Cup; expanding that universe starts with sourced roster identities, not invented profiles or style claims.
- Historical Best XI coverage spans every stored edition from 1930 through 2022, including starters, honourable mentions, and coaches.
- A new edition gets its own `data/player-profile-overrides/<edition>/` directory. Do not reuse 2026 copy as the factual base for 2030.
- Add the edition's teams, localized country labels, squad source coverage, and any edition-specific tournament-role configuration before generating prose. Missing configuration should fail loudly.
- Run the edition-aware country workflow for each team, for example `pnpm profiles:country -- --teams=ARG,BRA --edition=2030 --min-profiles=26`, then run the full corpus, locale, routing, and dry-run gates above.
- Treat the first 2030 generation as a semantic regression run: inspect role distribution, action-family overlap, within-role concentration, name handling, and all four locale routes before accepting the prose as a new baseline.
- Add new semantic phrases only when existing IDs cannot express the football truth. When a new ID is necessary, add and review all four locale renderings in the same change.

## Review Checklist

Before shipping a batch:

- The note explains an evergreen play style or distinctive strength.
- The generic note contains all three content beats in a natural 2-4 sentence shape.
- Current goals, assists, opponents, and tournament totals appear only in the live stat row.
- Any side or position claim matches tournament usage.
- A new fan can understand the main point without knowing specialist terms.
- Fixture teasers do not override the canonical generic note on a normal card.
- Best XI selection reasons remain separate from generic profile identity.
- Corpus reporting shows sentence shapes, minimum substance, repeated normalized structures, and concentrated semantic beats before shipping.
- Repeated actions are reviewed in context rather than rejected by a crude exact-sentence rule.
- Chinese notes are updated with the same meaning when English notes change.
- Spotlight players get a stronger watch cue than depth players.
- Historical archive cards keep completed results in the year-labeled stat row and make only evidence-bounded play-style claims.
