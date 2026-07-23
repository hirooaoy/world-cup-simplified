# Matchup Key Information Contract

Key information is an archive-present-tense view of a match. It reads as the
teams enter the match, but it may use the best archived starting-layout record
even when FIFA published that record after kickoff. It is therefore not a claim
that every detail was publicly knowable before kickoff.

The rich edition in `data/fixtures.json` and the aggregate archive in
`data/history.json` keep their separate storage models, but receive the same
editorial treatment. The contract applies to all 1,069 loaded matches and is
edition-neutral for later tournaments such as 2030.

## Editorial shape

Each team receives four compact semantic sentences:

1. identity: team, stage, official shape or prior tournament record;
2. matchup: opponent and the match pressure or structural contrast;
3. plan: what the documented shape or prior record makes available;
4. risk: what the opponent's documented shape or prior record can expose.

The sentences need not begin with one fixed scaffold. They must identify the
team and opponent, stay in archive-present tense, use plural football agreement
(`Spain are`, `Spain need`, `they have`), and remain specific to the edition and
match. Current-copy target length is 60–85 words; historical-copy target length
is 50–85 words.

Starting positions support statements about the named starting XI, formation,
line distribution, width, and conditional structural possibilities. They do
not, by themselves, prove that one player marks another, triggers the press,
runs beyond, connects phases, or receives a specific tactical assignment.
Those assertive claims require a separately cited tactical source.

The cancelled 1938 Sweden–Austria fixture keeps four sentences without
inventing a contest: it states that the match is canceled, that no match plan
can be assessed, and that any player names are registered-squad context rather
than confirmed participants.

## Narrative moment and outcome boundary

Every record declares:

- `mode: "archive-present-tense"`;
- `narrativeMoment: "team-entrance"`; and
- `outcomeCutoff: "kickoff"`.

`outcomeCutoff` governs outcomes, not document publication. Current-match
score, winner, events, cards, substitutions, shootout, awards, match statistics,
result stories, and later-round progression are excluded. Earlier matches in
the same edition are allowed and are processed before the current fixture.

Allowed evidence categories are:

- teams and stage;
- official or confirmed starting XI;
- official tactical layout, with its actual publication timing and perspective;
- prior tournament matches;
- manager records, host status, and tournament-format rules; and
- registered-squad context only for a canceled fixture.

## Layout evidence

The 2026 archive uses FIFA's official tactical PDFs for exact starting
positions. The metadata must preserve whether a PDF is nominal, observed, or
revised and must derive pre-/post-kickoff timing from `publishedAt` and the
fixture kickoff. A post-kickoff observed or revised PDF is valid archival layout
evidence, but must never be presented as an input known before kickoff.

The current 104-match archive contains 14 nominal pre-kickoff layouts and 90
post-kickoff layouts (82 observed and 8 revised). This distinction is data, not
an exception in the prose contract.

## Historical evidence tiers

- 1970–2022: confirmed starters from the pinned Fjelstul dataset, plus stage,
  complete manager records, host status, tournament rules, and earlier results.
- 1930–1966: no lineup-derived player claims; use team, stage, complete manager
  records, host status, tournament rules, and earlier results.
- Verified asymmetric stakes are encoded for the reviewed matches where the
  tournament rules and prior table prove them, including 1950 Brazil–Yugoslavia,
  Sweden–Spain and Uruguay–Brazil; 1982 Italy–Brazil; and 2022
  Ecuador–Senegal.
- Every standard four-team final group kickoff from 1998–2022 receives a
  conservative points-only scenario: a result is called guaranteed or
  eliminating only when no goal-difference or later tiebreak can reverse it;
  all other cases are labeled dependent. Sweden–Argentina in 2002 carries a
  separately reviewed exact explanation.
- Final rounds and second group stages keep phase-specific records and points.
  Earlier-round points remain available as tournament history but are never
  described as carrying into a reset table.
- Fjelstul is pinned reproducible evidence, not represented as an independent
  official source. Its upstream provenance and checksum remain explicit.

Where multiple manager rows exist, all are preserved. If roles cannot be
resolved confidently, the copy uses neutral source-record wording rather than
selecting one person as the sole active manager. Scotland in 1958 identifies
Dawson Walker's acting role instead of describing the finals side as simply
being under Matt Busby.

## Schema 4

Each `keyInformation` object contains the shared source id, generator,
`researchSourceIds`, `evidenceInputs`, exact `excludedInputs`, home and away
English copy, and `localeModel.version: 2`.

Played locale models use `current-lineup` or `historical-evidence`; canceled
models use `cancelled`. Every side contains exactly four slots: `identity`,
`matchup`, `plan`, and `risk`. Played slots identify their `claimClass` and
`evidenceRefs`. Models contain canonical entity names and structured facts, not
translated paragraphs or current-match outcome fields.

Current models are scoped by `stage.year` and canonical team ids. A new edition
must not inherit unsourced editorial style labels from an earlier tournament.
Current-edition identity and matchup claims are built from the official
starting layout, stage, and prior results; their source ids must resolve in the
edition source registry.

## 2030 gate

A future edition uses the same evidence model and renderers. Its compatibility
test must cover a nominal pre-kickoff layout, an observed post-kickoff layout,
edition-scoped evidence, team/player ownership, outcome mutation, locale
rendering, structured stakes, and missing-provenance failures. Storage may gain
a minimal edition adapter, but 2030 must not introduce a separate editorial
standard or contaminate the historical aggregate with rich-edition fields.
