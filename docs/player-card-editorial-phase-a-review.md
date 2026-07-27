# Historical player-card Phase A review

Date frozen: 2026-07-22

Source revision: `707a46f5`

Phase A classifies the 3,645 stored English historical player cards without changing any visible player description, translation, Best XI rationale, UI component, generator or runtime data file.

The card-level map is stored by edition in `docs/player-card-editorial-phase-a-parts/`.

## Coverage

- 22 completed World Cups from 1930 through 2022
- 489 team-editions
- 3,645 profile keys, in exact source order
- 3,645 classification records
- 0 missing, extra or duplicate profile keys

## Frozen classification totals

| Decision | Cards |
| --- | ---: |
| KEEP | 249 |
| PROVE | 599 |
| TWEAK | 1,215 |
| RESEARCH | 936 |
| EDITION_SPLIT | 646 |
| **Total** | **3,645** |

| Current evidence ceiling | Cards |
| --- | ---: |
| PORTRAIT | 825 |
| ROLE_GUIDE | 2,820 |

Additional signals:

- 2,290 cards have a nearby or cross-edition repetition flag.
- 49 cards have a separate identity, alias, role or record issue.
- Classification confidence is high for 2,592 cards, medium for 1,047 and low for 6.

These totals are a triage map, not a rewrite quota. In particular, `TWEAK`, `RESEARCH` and `EDITION_SPLIT` do not authorize replacing text that loses a blind comparison.

## Validation and reconciliation

The frozen map passes:

- JSON and schema validation for all 22 edition parts;
- exact profile-key parity and ordering against `data/historical-player-profiles.json`;
- decision, evidence-ceiling, confidence and string-field validation;
- the invariant that every stored multi-goal tournament has a `PORTRAIT` ceiling;
- a strict single-goal audit requiring evidence beyond the recorded goal itself;
- manual review of the remaining single-goal portraits against authored, reviewed, exact-edition or stored Best XI evidence;
- a zero-goal portrait audit, with the event-backed Frank Borghi 1950, Walter Zenga 1990 and Carlos Roa 1998 cases retained after manual review;
- cross-edition review of exact-action reuse and the 103 retained asymmetric `EDITION_SPLIT` identities;
- deterministic samples across decision and evidence-ceiling combinations.

The source profile file remains unchanged.

## Self-critique

The most important correction happened before freeze. Several provisional edition passes had treated one recorded goal as enough to support a full portrait. That was a classification drift, not a football judgment. Those ceilings were re-audited across the archive: a lone goal now remains beside a `ROLE_GUIDE` unless independently authored, reviewed or exact-edition football evidence supports individualized copy.

The audit also prevented the opposite mistake. Exact stored Best XI rationales still count as real edition evidence, so players such as Obdulio Varela 1950, Franz Beckenbauer 1970, Edmílson 2002, Andrea Pirlo 2006, Kieran Trippier 2018 and others were not reduced to role guides merely because the current generator metadata is incomplete.

The map is intentionally conservative in three ways:

1. `KEEP` is narrow: 249 cards, under 7% of the archive.
2. `ROLE_GUIDE` is the current ceiling for 2,820 cards. This avoids promising individualized mechanics before research supplies them.
3. Repetition is recorded as a signal, not treated as an automatic rewrite or edition split.

The map also has limitations:

- 646 `EDITION_SPLIT` labels are high enough that Phase B must continue testing the label rather than trusting it mechanically.
- The 2,290 repetition flags reflect a deliberately sensitive first pass. Some will disappear when read in a rendered team context; others will become more important.
- Phase A can identify that the main football identity is missing, but it cannot establish that identity without exact-edition research.
- A `PORTRAIT` ceiling says sufficient material exists somewhere in the stored edition record. It does not certify every sentence in the current card.
- A `ROLE_GUIDE` ceiling is provisional. Phase B research may legitimately upgrade it.

## First Phase B team

Argentina 1986 is the first team-edition.

It is a useful opening test because:

- the 11 stored cards include all five decision types;
- three strong `KEEP` controls must survive unchanged unless a blind comparison clearly wins;
- Maradona, Burruchaga and Pumpido require edition-specific judgment rather than career summaries;
- Borghi, Enrique, Pasculli and Batista test whether research can improve modest cards without inventing detail;
- the team has strong exact-edition sources and a coherent tactical context;
- the complete team is small enough for a genuine rendered and repetition review.

The Phase A decisions for Argentina 1986 are:

| Player | Decision | Ceiling |
| --- | --- | --- |
| Claudio Borghi | RESEARCH | ROLE_GUIDE |
| Diego Maradona | RESEARCH | PORTRAIT |
| Héctor Enrique | RESEARCH | ROLE_GUIDE |
| Jorge Burruchaga | EDITION_SPLIT | PORTRAIT |
| Jorge Valdano | KEEP | PORTRAIT |
| José Luis Brown | TWEAK | ROLE_GUIDE |
| Julio Olarticoechea | KEEP | PORTRAIT |
| Nery Pumpido | EDITION_SPLIT | PORTRAIT |
| Oscar Ruggeri | KEEP | PORTRAIT |
| Pedro Pasculli | RESEARCH | ROLE_GUIDE |
| Sergio Batista | PROVE | ROLE_GUIDE |

Phase B will still allow `KEEP OLD` for every non-KEEP card. The label determines what to investigate, not what outcome to force.
