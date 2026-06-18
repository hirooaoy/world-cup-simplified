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

Run this after key-player changes or transfer/profile updates to refresh hover-card player metadata:

```bash
node scripts/populate-player-profiles.mjs
```

The script uses Wikipedia football infoboxes for current club, position, and photos, then derives skill tags from the editorial key-player notes.

## Update Cadence

Preferred production path:
- Configure `/api/live-data` with a football-data.org key on the free delayed-score plan.
- Let the server-side live snapshot merge recent scores/status and recompute standings automatically.
- Keep manual JSON updates as the editorial/fallback layer, not the main live-update mechanism.

Normal non-match days:
- Check sources once per day.

Match days:
- Check before the first match.
- Check at kickoff for live status.
- Check after each match for final score and standings.

During live matches:
- If there is no live API, or the free API quota/cache delay is not fresh enough, update `status` manually from `SCHEDULED` to `LIVE`, then to `FT` with `score`.
- Do not rely on kickoff time alone for live status.
- Treat a post-match row with no score as a data incident, not an empty state. The UI will label it "Final pending"; the fix is still to update the fixture, standings, and source timestamps before sharing.

For authored `catchUp` entries, keep the headline and body score-focused. Add optional `standouts` only when a source supports the player note; one compact sentence is enough.

## Required Update Steps

1. Update `data/fixtures.json`.
2. Update `data/standings.json` after completed matches.
3. Update source `checkedAt` timestamps in `data/tournament.json`.
4. Run:

```bash
node scripts/validate-data.mjs
node scripts/audit-data.mjs
```

5. Open the site and spot-check:
   - today's match list
   - standings tab
   - selected match info card
   - footer source note

## Historical Archive

`data/history.json` contains past men's World Cup match records from 1930 through 2022. It is generated from the public-domain `openfootball/worldcup.json` project:

```bash
node scripts/import-world-cup-history.mjs
```

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
