# Historical player-card editorial programme

Date started: 2026-07-22

Scope: all 3,645 stored historical player profiles across 489 team-editions, from 1930 through 2022.

This programme has two phases:

1. Classify every existing English card without rewriting it.
2. Improve one complete team-edition at a time, with research, blind comparison, rendered review, translation, and a self-critique before moving on.

It does not authorize a new prose generator, a broad cadence rewrite, or unsupported player-specific claims.

## Phase A: classification

Phase A reads the canonical visible English `styleNote`, its existing evidence metadata, recurring-edition context, and the surrounding cards from the same team-edition. It does not change player copy or translations.

### Primary decision

- `KEEP`: Natural, useful and coherent; the existing evidence record supports its visible claims.
- `PROVE`: Potentially strong copy whose individualized claims need confirmation before it can be approved.
- `TWEAK`: The football identity is plausible, but a small wording, emphasis, confidence or nearby-repetition issue remains.
- `RESEARCH`: The identity, role or actions are too generic, weak, contradictory or important to accept without exact-edition research.
- `EDITION_SPLIT`: A recurring or famous player is carrying a career-level or another-edition identity that does not adequately describe this World Cup.

### Evidence ceiling

- `PORTRAIT`: Existing exact-edition, editorial, reviewed or authored evidence can support individualized copy.
- `ROLE_GUIDE`: Existing evidence is role-level. A concise, natural and modest role guide is the honest current end state unless later research upgrades it.

`ROLE_GUIDE` is not a lower-quality decision. A role guide can be `KEEP`, `PROVE` or `TWEAK`. Keeping it separate prevents evidence scarcity from being confused with poor writing.

### Classification record

Each profile receives:

- profile key, player, team and edition;
- primary decision;
- evidence ceiling;
- one-sentence reason;
- a nearby-repetition flag when relevant;
- a separate data-issue flag for aliases, identity collisions, missing roles or other record defects;
- classification confidence;
- status `triage`, because Phase B research may overturn the initial label.

The evidence ceiling describes the evidence currently stored, not a permanent limit on what Phase B research may uncover. A `PORTRAIT` ceiling means enough exact-edition material exists to support an individualized portrait after review; it does not certify every mechanic in the current card. A `ROLE_GUIDE` ceiling may later be upgraded when new exact-edition evidence is found.

Edition parts are stored in `docs/player-card-editorial-phase-a-parts/<year>.json` with schema version 1 and source revision `707a46f5`. Before the map is frozen, every part must pass exact source-key parity, enum and string-field validation, the multi-goal ceiling invariant, and a cross-edition split reconciliation. These artifacts classify the current source snapshot; they do not edit or approve player copy.

### Calibration

Before the archive map is frozen, the rubric is calibrated on representative team-editions:

- Uruguay 1930 and Egypt 1934;
- Brazil 1970 and Argentina 1986;
- France 1998 and Japan 2010;
- Germany 2014 and Morocco 2022.

The calibration is read-only. If reviewers disagree systematically about `PROVE`, `TWEAK`, `RESEARCH` or the evidence ceiling, the rubric is corrected before the remaining archive is classified.

Calibration covered 86 stored cards. Its final decision totals were:

- `KEEP`: 18
- `PROVE`: 14
- `TWEAK`: 19
- `RESEARCH`: 28
- `EDITION_SPLIT`: 7

Evidence ceilings were 46 `PORTRAIT` and 40 `ROLE_GUIDE` after the archive-wide ceiling reconciliation.

The calibration established these additional boundaries:

- `PROVE` means the prose already works but its personalized mechanics outrun stored support.
- `TWEAK` means the evidence level and central identity are adequate, but wording, emphasis or nearby repetition needs a small repair.
- `RESEARCH` means the most important football identity is uncertain, displaced or absent.
- `EDITION_SPLIT` applies only when cross-edition reuse suppresses the identity of the edition being classified; recurring text alone is not enough.
- One repeated action does not automatically defeat `KEEP`. Repetition matters when it blurs nearby teammates, dominates the portrait or recurs across materially different editions.
- Existing exact-edition or editorial metadata is a signal, not proof that every visible sentence is supported.
- Stored exact multi-goal tournament events qualify for a `PORTRAIT` evidence ceiling even when they do not prove the current playing-style mechanics; the ceiling says an individualized edition portrait is possible, not that the visible prose is verified.
- A single stored goal does not by itself raise the ceiling to `PORTRAIT`. Without independently authored, reviewed or exact-edition football evidence, it remains one event beside a `ROLE_GUIDE`, not proof of an individualized playing identity.
- Every asymmetric `EDITION_SPLIT` across classified editions receives a reconciliation review. Asymmetry is retained when one edition is a supported source portrait and another is suppressed reuse; near-verbatim generic portraits with materially different tournament contributions are labeled `EDITION_SPLIT` on both sides.
- The archive contains 3,645 stored cards across 489 team-editions. These are the app's stored-card universe, not complete tournament squads for every edition.

## Phase B: one team-edition at a time

For each selected team-edition:

1. Read the existing squad cards together.
2. Assemble shared exact-edition sources for the team, system and tournament usage.
3. Research each player only to the depth required by the Phase A label.
4. Preserve strong `KEEP` cards.
5. Put the player's most important exact-edition football identity ahead of incidental details that merely happen to be supportable.
6. Prefer a shorter honest role guide to extra observations added for shape, length or variety.
7. Write no more than one serious replacement for each changed card.
8. Blind-compare old and proposed copy; a tie keeps the old version.
9. Read the complete team again for identity, emphasis and repetition.
10. Make one narrow correction pass only for explicit defects.
11. Translate accepted changes into Spanish, Korean and Chinese.
12. Review the complete changed set in each locale and in the actual generic and Best XI routes.
13. Run focused checks and perform a written self-critique before starting the next team-edition.

Generic cards explain how the player played in that edition. Best XI and honourable-mention rationales continue to explain why the player belonged among that tournament's best. They remain separate.

## Stop conditions

Pause for user approval instead of continuing when:

- the calibration exposes a material label or evidence problem;
- a recurring process failure affects more than one team-edition;
- the existing architecture cannot preserve approved copy;
- research availability makes the proposed quality promise dishonest;
- a broad process change would be more efficient but would materially change the approved workflow.
