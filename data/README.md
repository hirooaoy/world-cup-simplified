# World Cup Data Workflow

This site is useful only if the data is trustworthy. Keep the UI simple, but treat the data updates like a lightweight publishing workflow.

## Reliability Level

Current target: **friend/public reliable**.

That means:
- Fixtures, scores, standings, rankings, and live status should be checked before sharing.
- The footer must honestly show the sources and last checked time.
- Unloaded dates must say "Not loaded" instead of pretending there are no matches.
- `scripts/validate-data.mjs` and `scripts/audit-data.mjs` must pass before publishing or sharing.

## Source Hierarchy

Use this order when sources disagree:

1. FIFA official schedule/results/standings.
2. FIFA/Coca-Cola Men's World Ranking for ranking pills.
3. A cross-check source for standings/results.
4. Editorial judgment only for previews, player notes, and projections.

Do not mix official facts and editorial projections without labeling them. The app footer already separates those categories.
Ranking-based projection baselines may use FIFA ranking data as input, but the model output remains an editorial preview.

## Lineup Lifecycle

Lineups follow a trust ladder:

- Before kickoff, `data/expected-lineups.json` may provide compact browser-facing predictions. These records must stay `mode: "expected"` or `mode: "probable"`, use `layoutSource: "derived-team-sheet-order"`, and keep `layoutVerification.exact` false unless a genuinely verified layout exists. The displayed confidence is evidence strength, not a probability that the whole XI will be exact.
- `data/free-lineup-prediction-sources.json` is the editorial source registry. `defaultLateralOrder: "right-to-left"` means ordered centre-back and central-midfield pairs are interpreted from the team's right to left unless a source overrides it. `claimStrength: 1` is a generic predicted XI; values above 1 are reserved for direct, explicit selection reporting. Directly reported or published XIs must also use `predictionClass: "reported-xi"`, so the selected record becomes `reported-xi-assisted` and is excluded from forecast-only calibration.
- Prediction formation labels and pitch grids share `scripts/lineup-prediction-engine/formations.mjs`. Known shapes such as `4-2-2-2` and `3-4-2-1` have explicit grids; other valid digit formations receive a deterministic inferred grid and caveat. Malformed/unsupported labels are normalized to the displayed fallback formation instead of retaining a false label over a `4-2-3-1` grid.
- Player identity is team-scoped and ambiguity-safe: exact canonical names win, and fuzzy aliases are accepted only when they resolve to one roster identity. Never let an availability entry for `Ederson` remove a distinct teammate such as `Ederson Silva`.
- `data/expected-lineups-audit.json` preserves every normalized provider candidate and the selected consensus for the current run. `data/lineup-prediction-revisions.json` appends each materially different input/model revision, so source reliability and changing predictions can be measured later without shipping verbose evidence to the browser. The engine has a bounded source-reliability hook, but it does not learn or change reliability automatically yet; keep the default neutral until enough immutable forecast-only outcomes exist for a reviewed calibration.
- `data/lineup-prediction-history.json` preserves the last available pre-kickoff prediction after a fixture starts, including bench, evidence, engine metadata, and self-contained source metadata. `pnpm sync:fifa` archives a completed fixture's expected-lineup record before pruning it, while `pnpm lineups:history:backfill` reconstructs only snapshots that demonstrably existed in Git before kickoff. Never manufacture older forecasts from final lineups.
- A delayed fixture at or after its scheduled kickoff freezes the last valid pre-kickoff record and its exact audit revision; prediction generation must not rewrite it with hindsight while status remains `DELAYED`.
- When FIFA publishes the team sheet, `pnpm sync:fifa:lineups:live` can persist a complete confirmed sheet for scheduled/delayed fixtures near kickoff as well as live and completed fixtures. The default `pnpm sync:fifa:lineups` remains a completed-fixture sync. Runtime `/api/live-data` performs the same automatic override and retains the last complete official XI across a temporary provider failure.
- FIFA's live payload supplies the official XI, bench, broad positions, and formation, but no exact tactical coordinates. Matching official starters may use the frozen pre-kickoff role/side evidence to choose slots inside FIFA's official formation; this never changes official identities or formation and remains `exact: false` with explicit inference provenance. A verified layout override still has higher priority.
- During live matches, the UI displays the official starting XI and represents substitutions separately.
- After full time, completed fixtures must keep a final `lineups.json` record. Official facts should come from FIFA whenever possible.

Run `pnpm lineups:history:audit` to compare archived predictions with final official XIs using one-to-one identity matching, starters, benches, starter/bench crossovers, roles, formations, coordinates, lead time, and source/evidence-strength buckets. Headline accuracy is forecast-only; published/reported-XI-assisted records and candidates are reported separately. Run `pnpm smoke:lineups` for the complete prediction, history, live override, rendering, and layout-provenance gate.

Exact pitch geometry is separate from official team-sheet facts. Do not tune the generic placement heuristics to fix one match. If a public FIFA payload does not expose reliable coordinates, keep the layout `derived-team-sheet-order` and unverified.

When exact placement matters, use an audited manual override in `data/lineup-layout-overrides.json`:

1. Compare the official FIFA team sheet against a trusted free visual reference such as a public lineup board.
2. Record the source URL, `checkedAt`, a short `note`, and source claims that include `status: "matched"`, `exactLayout: true`, and `sourceDetail`.
3. Store the verified home and away player coordinates in the override.
4. Run `pnpm sync:fifa:lineups`, then `pnpm validate` and `pnpm smoke:lineup-layouts`.

`pnpm validate` rejects verified overrides that do not include at least one matched exact-layout source, notes that claim evidence not stored in the record, and source sets with conflicting tactical signatures. Conflicting boards keep the safer formation-derived placement; do not select a preferred provider and call the result verified.

For matchday live starts, `.github/workflows/lineup-matchday-geometry.yml` runs every five minutes during the tournament but exits immediately unless a fixture is between 90 minutes before and 20 minutes after kickoff. In that bounded window it:

1. Syncs the complete FIFA-official XI, bench, captain, and formation. Until those facts exist, the site keeps the pre-match `Line-ups (predicted)` board.
2. Changes the same card to `Line-ups` as soon as the official XI is complete. Formation-aware assignment keeps FIFA-listed defenders, midfielders, and forwards in safe compatible rows while exact geometry is still unavailable.
3. From 10 minutes before through 20 minutes after kickoff, merges the configured/discovered ESPN board with a dynamically discovered FotMob board.
4. Normalizes both boards to the app's 0-100 pitch orientation, then requires the same formation, row membership, left-to-right order, and close coordinates for both teams. Two distinct exact-layout providers are required; agreed coordinates use the per-player median.
5. Stores a permanent `source-consensus-v1` verified override only when those checks agree. A later FIFA refresh reapplies rather than replaces it. Conflicts and unavailable sources remain Action logs and do not rewrite data or trigger a deployment.
6. Validates the lineup files, commits a material change to `main`, and lets the repository's Vercel Git integration deploy it automatically.

Public copy deliberately has only two lineup states: `Line-ups (predicted)` before the official XI and `Line-ups` afterward. Exact/provisional verification remains internal.

Run the same core checks locally with:

```bash
pnpm sync:fifa:lineups:matchday
pnpm lineups:verify-live-start
```

ESPN and FotMob are the automated exact-board providers. Google and Sofascore remain useful manual fallbacks when their public pages cannot be parsed reliably: `pnpm lineups:google-kickoff-check` prints the relevant Google search URL after FIFA official lineups have synced, skips fixtures that already have a verified override, and never fetches Google or writes data.

The kickoff Google check defaults to a tight `-5` to `+20` minute window from kickoff. Live fixtures with FIFA-official lineups but unverified geometry stay visible as late manual checks until `+180` minutes by default. Use `LINEUP_GOOGLE_KICKOFF_BEFORE_MINUTES`, `LINEUP_GOOGLE_KICKOFF_AFTER_MINUTES`, or `LINEUP_GOOGLE_KICKOFF_LATE_LIVE_MINUTES` only if tournament timing requires a different one-time window. If Google confirms a meaningful exact-layout issue, add an audited manual override with the Google URL, `checkedAt`, notes, and `verified-layout` metadata; do not tune the generic inference algorithm.

The live-start verifier defaults to the approved asymmetric `-10` through `+20` minute tactical window. It targets nearby `SCHEDULED`, `DELAYED`, and `LIVE` fixtures, accepts only complete FIFA-official lineup records, discovers missing ESPN/FotMob candidates, and always preserves an existing verified override. Use `LINEUP_LAYOUT_LIVE_START_BEFORE_MINUTES` and `LINEUP_LAYOUT_LIVE_START_AFTER_MINUTES` only if tournament timing changes. A deliberate editorial recheck can pass `--reverify`; routine FIFA refreshes must not.

## Projection Baselines

Run this after fixture or ranking updates to populate missing known-team fixtures:

```bash
node scripts/populate-projections.mjs
```

The script preserves hand-curated projections by default. Pass `--overwrite` only when you intentionally want every known-team fixture regenerated from the ranking baseline.

For high-attention fixtures where the ranking baseline feels off, use an `online-source-consensus` projection instead of copying a single site's pick. Blend multiple independent forecasts, margin-adjusted bookmaker odds, or prediction markets; list every source in `sourceIds`; and record the snapshot time in `capturedAt`. Register each source in `data/tournament.json`. The UI labels these projections `Forecast from online sources`, while ranking fallbacks keep their separate local-estimate label.

For an archived fixture with a trustworthy pre-match forecast but no recoverable multi-source market snapshot, use `online-source-forecast`. Store the exact article in `sourceUrl`, its original publication timestamp in `publishedAt`, and the recovery timestamp in `recoveredAt`. Validation requires publication before kickoff. Never use the final score to tune a historical projection.

Refresh future online-source projections as better information arrives, stopping at kickoff. Once a match starts, preserve the final pre-match snapshot so past fixtures do not silently inherit hindsight. Group fixtures may use the ranking baseline temporarily. Confirmed knockout fixtures must use a sourced online projection; `populate-projections.mjs` deliberately leaves them unfilled so validation and matchday readiness block publication until direct Opta/bookmaker 1X2 research is stored.

For unresolved future knockout rounds, never synthesize 1X2 pills from FIFA rankings alone. Store every supported projected pairing as a `conditionalProjections` entry using `market: "regulation"`. The preferred path starts with direct lookahead markets. When they do not exist, use `online-calibrated-scenario-model`: blend current Opta or bookmaker strength, official tournament form, and ranking as only one bounded input, then add a separately sourced stage-appropriate draw rate. Each entry must identify the exact team pair, total 100 across `home`, `draw`, and `away`, preserve at least two normalized strength inputs plus two draw inputs, and be captured before kickoff.

The Tournament view always renders projected forecasts as regulation-time `HOME / TIE / AWAY` pills. The visible labels, order, layout, and tooltip wording are a stable UI contract; source refreshes may change only the displayed percentages. Run `pnpm forecasts:sync` after editing normalized forecast inputs and `pnpm forecasts:check` in CI. The shared derivation averages source inputs and writes the displayed 1X2 values, so percentages are never hand-calculated separately from their evidence. In group matches a tie ends the match and no penalty context is attached. In every knockout round from the Round of 32 onward, the `TIE` pill carries the 90-minute draw probability and its concise tooltip explains only the cutoff-safe penalty evidence. Once both participants are confirmed, replace the scenario forecast with the normal stored `projection` from direct regulation-time Opta/bookmaker markets; the display contract stays the same while the evidence becomes matchup-specific.

Knockout shootout guidance is separate from the 90-minute projection. Run `node scripts/populate-shootout-outlooks.mjs` after knockout participants or results change. Every confirmed knockout fixture receives a `shootoutOutlook` cut off at kickoff, using the World Cup shootout archive plus any earlier current-tournament shootouts, so later results cannot leak into older forecasts. Matchup-specific player evidence lives in `data/shootout-evidence.json`, is selected by participants and validity window rather than hard-coded match numbers, and expires at the researched kickoff. The same command dynamically backfills every eligible archive knockout match from 1978 onward with only the World Cup shootouts known before each match; 1978 is included because shootouts were available even though the first was not needed until 1982, while earlier fixtures deliberately receive no penalty language. When stronger player-level research is available, `sourced-shootout-evidence` may replace the archive wording only with at least two verified facts, such as a goalkeeper's shootout record and a likely taker's career conversion record.

Historical `HOME / TIE / AWAY` percentages use the regulation score available before each later fixture; extra-time and shootout winners never count as 90-minute wins. The model parameters are versioned in `data/tournament.json`, and `pnpm forecasts:history:refresh` writes the outcome-only calibration snapshot in `data/forecast-calibration.json`. `pnpm forecasts:history:audit` verifies all non-cancelled archive matches and requires the model to beat a uniform 1X2 baseline without changing any UI wording.

Keep `shootoutForecast` for the separate method-of-victory market: preserve the displayed prices and normalize the two shootout outcomes to 100. An even market does not force bland copy if verified historical or player evidence supports a cautious `may have a slight edge` outlook. Never infer a shootout edge from the regulation forecast, FIFA rank, unverified save quality, or a static list of famous players. Distinguish goalkeeper saves from misses or shots off the frame, and do not call a save difficult without shot-quality data or footage review.

## Preview Baselines

Run this after fixture updates to populate known-team group fixtures with team watchlists and H2H research placeholders:

```bash
node scripts/populate-enrichment-baselines.mjs
```

The script preserves curated player notes, loaded H2H results, and verified-empty H2H records by default. Pass `--overwrite` only when intentionally regenerating all known-team group fixture enrichment baselines.

Run this after player-note or fixture updates to refresh opponent-specific key-information blurbs for each group fixture:

```bash
node scripts/populate-matchup-key-information.mjs
```

These notes are editorial matchup previews. Each group fixture should explain both the team's own plan and how that plan relates to the opponent.

For matchday-quality previews, add source-backed fixture notes to `data/matchup-research-notes.json` before running the matchup generator. Use this for current team news, likely injuries, suspensions, managed minutes, group-table incentives, and opponent-specific tactical pressure points. When notes exist for a fixture, `populate-matchup-key-information.mjs` uses them instead of the static team baseline and can also override that fixture's key-player trio.

Before publishing today/tomorrow fixtures, run:

```bash
pnpm matchday:readiness
```

The readiness check flags near-term group matches whose fixture-specific research is missing or older than `MATCHDAY_MATCHUP_RESEARCH_FRESH_HOURS` hours. The default is 24 hours.

Automated official-score sync jobs can set `MATCHDAY_EDITORIAL_WARN_ONLY=1` so stale fixture research is reported as a warning while status and score blockers still fail the run. Keep the default strict mode for manual publishing checks.

Run this after editing matchup copy, key players, player availability, or final scores to review all preview paragraphs and completed-match result sections together:

```bash
pnpm run audit:copy
```

The copy audit checks every group-match team paragraph, including past fixtures, plus the team descriptors and final-score result sections for completed group matches.

Run this after key-player changes or transfer/profile updates to refresh hover-card player metadata:

```bash
node scripts/populate-player-profiles.mjs
```

The script uses Wikipedia football infoboxes for current club, position, and photos, short Wikipedia lead extracts for profile metadata, and the Transfermarkt datasets players CSV for repeatable photo/value enrichment. It preserves existing profiles by default; use `--replace-existing-profiles` only for an intentional prune/rebuild. `keyPlayers` still controls which players a fixture preview features, but every player profile card must have its own curated display note. Goal scorers who were not already key players should get a role-style card note, never a raw "Scored for..." event sentence. Full-name player mentions in fixture paragraphs are matched against the current squad list and also require/generated profile cards, so paragraph-only names do not silently miss hover-card coverage.

To reduce runtime-only scorer fallbacks before a match, prebuild squad cards for the teams you are about to feature:

```bash
pnpm profiles:country -- --teams=CRO,PAN
```

The country workflow is the publishing path. It runs a strict candidate preflight from `data/player-availability.json`, blocks unsafe aliases before writing, loads editorial overrides from `data/player-profile-overrides/2026/{TEAM}.json`, generates only the selected countries' squad cards while preserving profiles already built for other countries, audits the generated country cards for position, club, league, image, source, and disambiguation-like summaries, then runs validation/card checks/UI smoke. For fast iteration, add `--skip-smoke`; for low-level debugging only, use `pnpm profiles:squads -- --squad-teams=CRO,PAN --audit-squad-candidates --strict-squad-audit` or `pnpm profiles:squads -- --squad-teams=CRO,PAN --list-players`.

Player market values are required for every generated card. Use `marketValueEurMillions` for source-backed values and `estimatedMarketValueEurMillions` only when the external player record exists but the value is blank; the UI labels those rows as estimates. When Transfermarkt's player dataset has `highest_market_value_in_eur`, store it as `peakMarketValueEurMillions` with `peakMarketValueSource` and `peakMarketValueSourceUrl`; current player cards show that as `Prime` only when it is higher than the displayed current value. Validation also requires `imageUrl`, so future scorers or newly mentioned paragraph players cannot quietly ship with initials-only cards.

Before publishing tournament-year previews, update `data/player-availability.json` from the latest official FIFA squad list. Use each team's `included` list as the tournament-squad baseline, `unavailable` for players omitted or withdrawn from the tournament, and `fixtureUnavailable` for match-day injuries, illness, or suspensions that apply to one fixture. `scripts/validate-data.mjs` rejects match-card key players who are marked unavailable, and for teams with an `included` squad list it also rejects key players not in that current squad.

For future completed 2026 matches, any scorer in `goalsHome` / `goalsAway` must also have a curated card in `data/player-profiles.json`. Run `pnpm profiles` after goal-event syncs or manual scorer edits, then review the generated note/photo/value. `pnpm cards:check` gives a focused missing-card report for both current and historical cards.

## Update Cadence

Preferred production path:
- Configure `/api/live-data` with a football-data.org key on the free delayed-score plan.
- Let the server-side live snapshot merge recent scores/status, enrich missing scorer-minute arrays from FIFA official timelines when available, and recompute standings automatically.
- Keep manual JSON updates as the editorial/fallback layer, not the main live-update mechanism.
- Run `pnpm matchday:update` when updating the committed static fallback data.
- Run `pnpm matchday:readiness` for a focused today/tomorrow checklist instead of treating every old archive or odds source as equally urgent.

Normal non-match days:
- Check sources once per day.

Match days:
- Check before the first match.
- Check at kickoff for live status.
- Check after each match for final score and standings.

During live matches:
- If there is no live API, or the free API quota/cache delay is not fresh enough, update `status` manually from `SCHEDULED` to `LIVE`, then to `FT` with `score`.
- Do not rely on kickoff time alone for live status.
- When a live or final score has goals but no scorers, `/api/live-data` will try FIFA's official timeline. The static fallback can do the same with `pnpm sync:fifa:goals`.
- Treat a post-match row with no score as a data incident, not an empty state. The UI will label it "Final pending"; the fix is still to update the fixture, standings, and source timestamps before sharing.

For authored `catchUp` entries, keep the headline and body score-focused. Add optional `standouts` only when a source supports the player note; one compact sentence is enough.

When yesterday and today have no live or finished match notes during the tournament, Catch Up automatically uses the loaded FIFA goal events for one bilingual Golden Boot race story. After the final is complete, the same surface keeps a persistent tournament wrap with the champion, Golden Boot, and final match/goal totals. Add the official award to `tournament.json` as `awards.goldenBoot` with `status: "confirmed"`, `playerName`, `goals`, optional `assists`, and `sourceId`; until that record is loaded, the wrap explicitly says that official Golden Boot confirmation is pending instead of guessing from tied scorer totals.

For completed fixture detail pages, add optional `resultHighlights` when the scoreline needs more context than the default source-check note. Keep each highlight to one compact sentence.

For richer post-match recaps, add optional `resultStoryBullets` with up to three compact, emoji-free match-story bullets. Current 2026 fixture bullets should be written only after post-match research, and the fixture can include `resultStoryResearch` with `status: "researched"`, `sourceIds`, `checkedAt`, and an optional compact note. Keep current-match story bullets to clean one-sentence prose: prefer clauses with words like after, as, when, or with, and avoid colon/dash scaffolding that makes the copy read like a generated summary. The UI only displays story bullets inside the full-time Result block. `pnpm results` no longer auto-generates current fixture story bullets by default; it still backfills this field for finished historical archive matches. `pnpm results:research` is a free queue/report: it lists finished matches that need source-backed research, but it does not call paid APIs or publish narrative bullets.

Goal rows may include optional `assistName` when the official FIFA timeline exposes an assistant player id. Result recap generation prefers repeated-assist texture over generic scorer-repeat filler when that data is available.

For official post-match video, add optional `highlightVideo` only after a fixture is `FT`. Use a YouTube URL from an allowed official highlights channel, currently FOX Sports for 2026 matches (`channelId: "UCwNqHDsnBCKT-olwJwIFyfg"`), and include `sourceName`, `publishedAt`, and `checkedAt`. The UI hides the play button unless the fixture is final and the channel is allowlisted. Run `pnpm sync:youtube` for current 2026 matches; it checks only the official FOX Sports channel, requires both team names plus 2026 FIFA World Cup highlights context in the title, and rechecks reviewed fixtures without rewriting timestamps unless a link or review state changes. If no official YouTube upload is available after checking the allowlisted channel, add `highlightVideoReview` with `status: "not-found"` or `status: "needs-review"`, the same `sourceName` / `channelId`, `platform: "youtube"`, `checkedAt`, and a short `note`; replace that review with `highlightVideo` once a valid official URL exists.

For historical archive matches, keep `highlightVideo` YouTube-only and use official FIFA uploads (`channelId: "UCpcTrCXblq78GZrTUTLWeBw"`). Run `pnpm history:youtube` to check the whole archive; it links only clean official FIFA highlight-style videos and records `highlightVideoReview` when no match-specific YouTube highlight is found, so the button stays absent deliberately. The script caches verified search results, watch metadata, and per-fixture dispositions in `data/cache/youtube-history.json`; normal reruns reuse that cache for already checked fixtures, while `--refresh-cache` forces a new YouTube pass and `--no-cache-write` leaves the cache untouched.

## Matchday Card/Result Workflow

Use one command for matchday data publishing:

```bash
pnpm matchday:update
```

That is the auto-curated path for committed data. It runs the official score/status sync, FIFA goal-event sync, player-profile generation when newly synced scorers or player mentions need cards, factual result-highlight generation, official highlight-video sync, a result-story research queue report, and the full data/UI verification chain. When validation identifies broken cards, the profile repair step refreshes only those named players instead of rewriting every current profile. Review the data diff after it finishes, then publish.

The live `/api/live-data` response can temporarily show a scorer before that scorer exists in `data/player-profiles.json`. The UI renders a contextual goal card for that runtime-only scorer; `pnpm matchday:update` is still the step that turns the scorer into a fully curated profile with position, club, photo, value, and reviewed note.

Use lower-level commands only when debugging one part of the pipeline:

```bash
pnpm sync:fifa
pnpm sync:fifa:goals
pnpm profiles
pnpm profiles:country -- --teams=CRO,PAN
pnpm cards:check
pnpm results
pnpm results:check
pnpm sync:youtube
pnpm results:research
```

The script preserves hand-authored `resultHighlights` by default. It generates the `⚽` scoreline only when scorer-minute data is not loaded; when `goalsHome`/`goalsAway` exists, the UI renders the linked scorer list instead. Generated current `resultHighlights` stay factual: scoreline when needed plus group impact, without an automatic match-story moment.
The scheduled `Sync FIFA Results PR` workflow runs `pnpm sync:fifa:goals`, `pnpm results`, `pnpm sync:youtube`, `pnpm results:research`, and `pnpm validate:profiles` after the score/status sync, so newly finished matches can open a fallback-data PR as soon as FIFA timeline scorer events, factual result highlights, official highlight-video dispositions, research-queue output, and any newly required player cards are available. It should not publish current-match `resultStoryBullets` unless a source-backed research pass writes them.
`pnpm results:check` fails when a full-time group match is still missing official goal events or has weak/generic authored result-story copy, including current story bullets that lean on colon/dash scaffolding. Missing current story bullets are allowed while research is pending.

## Required Update Steps

1. Update `data/fixtures.json`.
2. Update `data/standings.json` after completed matches.
3. Update source `checkedAt` timestamps in `data/tournament.json`.
4. Or run the official FIFA snapshot sync to merge known live/final scores and recompute standings:

```bash
pnpm sync:fifa
```

5. Run:

```bash
pnpm matchday:readiness
node scripts/audit-fifa-schedule.mjs
node scripts/validate-data.mjs
node scripts/audit-data.mjs
```

`audit-fifa-schedule.mjs` requires network access to FIFA's public schedule feed. Treat a kickoff mismatch as a blocking data incident before publishing.

6. Open the site and spot-check:
   - today's match list
   - standings tab
   - selected match info card
   - footer source note

## Third-Place Race

The Standings view includes a current 2026 best-third-place race. It uses the same group rows as `data/standings.json`: the current third row from each group is compared by points, goal difference, goals scored, optional fair-play/team-conduct score, and FIFA ranking as the final deterministic fallback.

If reliable conduct data is available, add it to standings rows as `teamConductScore`, `conductScore`, `fairPlayScore`, or `fairPlayPoints` where higher is better. Until conduct is loaded, ties that cross the eighth-place cut line must remain visibly marked as pending.

## Historical Archive

`data/history.json` contains past men's World Cup match records from 1930 through 2022. It is generated from the public-domain `openfootball/worldcup.json` project:

```bash
node scripts/import-world-cup-history.mjs
```

After importing the match skeleton, sync historical kickoff times, scorer minutes, and then run the historical matchup generator:

```bash
pnpm history:times
pnpm history:goals
pnpm history:matchups
pnpm history:profiles
pnpm history:images
```

Historical kickoff wall-clock times come from Wikidata match-item time-of-day qualifiers when available. Keep cancelled date-only fixtures blank rather than inventing a kickoff time from the archive sort fallback.

`pnpm history:goals` syncs exact scorer-minute arrays from the Fjelstul World Cup Database. `pnpm history:matchups` enriches every archived fixture with era-specific player/style copy. It cross-checks against the same source for historical squads, goals, penalties, bookings, player appearances where available, and tournament squads. Match-level player appearances are available from 1970 onward in that source; older tournaments use scorer and squad context instead, and canceled fixtures are labeled as squad context rather than confirmed match usage. The Fjelstul data is CC-BY-SA 4.0, so keep the source entry and attribution/license trail in `data/tournament.json`.

`pnpm history:profiles` refreshes `data/historical-player-profiles.json`, which must include a card for every player mentioned by historical key-player paragraphs or historical goal records. Historical cards use archive-specific teams, years, positions, shirt numbers, scorer counts, and archive match-note counts instead of current club metadata. When available, the separate image enrichment step may add birth dates and Transfermarkt peak market values for historical age/value context.

`pnpm history:images` enriches historical cards with photos and optional metadata. It first reuses the existing current-player profile photo for exact normalized player matches, so a player like Kylian Mbappé shares one image across current and past World Cup appearances. For historical-only players, it adds conservative Transfermarkt dataset photos, birth dates, and peak market values only when the name/country match and the birth date is plausible for that player's World Cup years. It also adds Wikimedia Commons image URLs when the Wikipedia page match passes conservative footballer checks or a curated title override. The photo/source fields stay on each profile so attribution can be audited.

The historical archive lives outside the 2026 fixture/standings model on purpose. Past teams do not have to belong to 2026 groups, and historical dates are preserved as tournament-local dates instead of being shifted by the user's selected timezone.

## Status Rules

Use these fixture statuses:

- `SCHEDULED`: kickoff has not happened yet.
- `LIVE`: match is currently live, based on source/manual check.
- `FT`: match is final and must include `score`.
- `POSTPONED`: match did not start as scheduled.
- `CANCELLED`: match was cancelled.

Use these H2H statuses:

- `loaded`: verified past senior meetings are attached.
- `verified-empty`: research found no prior senior meetings.
- `research-pending`: verified historical records are not attached yet; the UI should show a concise not-loaded message.
- `not-loaded`: no H2H state has been loaded; this should not remain on known-team group fixtures before sharing.

## Known Current Limitation

The fixture skeleton now covers the full tournament date range in `data/fixtures.json`.
Knockout matches intentionally use bracket-slot labels until the qualified teams are known.
Rich previews, H2H records, live status, final scores, and standings still need update discipline on match days.
