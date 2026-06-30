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

## Projection Baselines

Run this after fixture or ranking updates to populate missing known-team group fixtures:

```bash
node scripts/populate-projections.mjs
```

The script preserves hand-curated projections by default. Pass `--overwrite` only when you intentionally want every known-team group fixture regenerated from the ranking baseline.

For high-attention fixtures where the ranking baseline feels off, use a sourced market-implied projection instead of copying a single site's pick. Record the source in `data/tournament.json`, normalize public 90-minute moneyline odds to remove the sportsbook margin, and keep the UI labeled as unofficial/not betting advice.

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

Player market values are required for every generated card. Use `marketValueEurMillions` for source-backed values and `estimatedMarketValueEurMillions` only when the external player record exists but the value is blank; the UI labels those rows as estimates. Validation also requires `imageUrl`, so future scorers or newly mentioned paragraph players cannot quietly ship with initials-only cards.

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

For completed fixture detail pages, add optional `resultHighlights` when the scoreline needs more context than the default source-check note. Keep each highlight to one compact sentence.

For richer post-match recaps, add optional `resultStoryBullets` with up to three compact, emoji-free match-story bullets. This field may be prepared before the static fixture has been synced to `FT`; the UI only displays it inside the full-time Result block. `pnpm results` also backfills this field for finished historical archive matches.

For official post-match video, add optional `highlightVideo` only after a fixture is `FT`. Use a YouTube URL from an allowed official highlights channel, currently FOX Sports for 2026 matches (`channelId: "UCwNqHDsnBCKT-olwJwIFyfg"`), and include `sourceName`, `publishedAt`, and `checkedAt`. The UI hides the play button unless the fixture is final and the channel is allowlisted. Run `pnpm sync:youtube` for current 2026 matches; it checks only the official FOX Sports channel, requires both team names plus 2026 FIFA World Cup highlights context in the title, and rechecks reviewed fixtures without rewriting timestamps unless a link or review state changes. If no official YouTube upload is available after checking the allowlisted channel, add `highlightVideoReview` with `status: "not-found"` or `status: "needs-review"`, the same `sourceName` / `channelId`, `platform: "youtube"`, `checkedAt`, and a short `note`; replace that review with `highlightVideo` once a valid official URL exists.

For historical archive matches, keep `highlightVideo` YouTube-only and use official FIFA uploads (`channelId: "UCpcTrCXblq78GZrTUTLWeBw"`). Run `pnpm history:youtube` to check the whole archive; it links only clean official FIFA highlight-style videos and records `highlightVideoReview` when no match-specific YouTube highlight is found, so the button stays absent deliberately. The script caches verified search results, watch metadata, and per-fixture dispositions in `data/cache/youtube-history.json`; normal reruns reuse that cache for already checked fixtures, while `--refresh-cache` forces a new YouTube pass and `--no-cache-write` leaves the cache untouched.

## Matchday Card/Result Workflow

Use one command for matchday data publishing:

```bash
pnpm matchday:update
```

That is the auto-curated path for committed data. It runs the official score/status sync, FIFA goal-event sync, player-profile generation when newly synced scorers or player mentions need cards, result-highlight generation, and the full data/UI verification chain. When validation identifies broken cards, the profile repair step refreshes only those named players instead of rewriting every current profile. Review the data diff after it finishes, then publish.

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
```

The script preserves hand-authored `resultHighlights` by default. It generates the `⚽` scoreline only when scorer-minute data is not loaded; when `goalsHome`/`goalsAway` exists, the UI renders the linked scorer list instead.
The scheduled `Sync FIFA Results PR` workflow runs `pnpm sync:fifa:goals`, `pnpm results`, `pnpm sync:youtube`, and `pnpm validate:profiles` after the score/status sync, so newly finished matches can open a fallback-data PR as soon as FIFA timeline scorer events, result highlights, official highlight-video dispositions, and any newly required player cards are available.
`pnpm results:check` fails when a full-time group match is still missing official goal events or has generic result-moment copy.

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

After importing the match skeleton, sync historical scorer minutes and then run the historical matchup generator:

```bash
pnpm history:goals
pnpm history:matchups
pnpm history:profiles
pnpm history:images
```

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
- `research-pending`: the UI has a clear pending-research baseline, but no verified historical record is attached yet.
- `not-loaded`: no H2H state has been loaded; this should not remain on known-team group fixtures before sharing.

## Known Current Limitation

The fixture skeleton now covers the full tournament date range in `data/fixtures.json`.
Knockout matches intentionally use bracket-slot labels until the qualified teams are known.
Rich previews, H2H records, live status, final scores, and standings still need update discipline on match days.
