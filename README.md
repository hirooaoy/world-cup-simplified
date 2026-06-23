# World Cup Simplified

A lightweight static World Cup schedule and standings guide.

## Local Checks

Use pnpm for reproducible installs:

```sh
pnpm install
pnpm test
```

The test script validates the JSON data, audits freshness/status drift, and runs a Playwright smoke test against a local static server.
On match days, refresh the static snapshot first:

```sh
pnpm sync:fifa
pnpm sync:fifa:goals
pnpm matchday:readiness
pnpm test
```

The GitHub Data Quality workflow runs the same FIFA score sync before testing, so scheduled CI validates an official results snapshot instead of failing only because committed fallback JSON is a few matches behind.

## Public Launch

The site is set up for Vercel. Static pages are served from the repo root and the `Report issue` flow posts to `/api/report-issue`.

## Automatic Data Updates

The production site tries `/api/live-data` before it falls back to the static JSON files. That API route runs server-side, fetches recent provider fixtures, merges live/final scores into the existing fixtures, enriches scored matches with official FIFA goal-event timelines when available, recomputes group standings, and returns a CDN-cached snapshot to the browser. Visitors still get the fast static app, but the data can update automatically without exposing the provider key.

The free/default provider is football-data.org. The site defaults to competition `WC` and season `2026`, and uses the delayed-score free tier so the custom UI can update without exposing the provider key.

Important: `/api/live-data` is the automatic production path. The committed JSON files are the static fallback; they only change when `pnpm sync:fifa` is run and the resulting data is committed/deployed. The scheduled Data Quality workflow checks a synced snapshot, but it does not publish fallback JSON by itself.

To enable the free football-data.org sync:

1. Create a football-data.org account.
2. Add `FOOTBALL_DATA_API_KEY` in Vercel.
3. Keep `FOOTBALL_DATA_COMPETITION=WC` and `FOOTBALL_DATA_SEASON=2026` unless football-data.org changes their World Cup mapping.
4. Optionally copy `data/provider-map.example.json` to `data/provider-map.json` and fill in provider IDs if name matching is not enough.
5. Deploy. The site will use live provider data automatically when `/api/live-data` succeeds, and static JSON when it does not.

The live endpoint is cached for 5 minutes by default with football-data.org. You can override that with `LIVE_DATA_CACHE_SECONDS` and `LIVE_DATA_STALE_SECONDS`; use higher values if you want fewer provider calls. Goal-scorer enrichment uses FIFA's public match timeline only for scored live/final fixtures whose `goalsHome` / `goalsAway` arrays are missing or incomplete. Set `FIFA_GOAL_EVENTS_ENABLED=false` to disable it, or lower `FIFA_GOAL_EVENTS_MAX_FIXTURES` if the endpoint ever needs stricter request bounds.

API-Football and Sportmonks remain supported as optional providers. Set `LIVE_DATA_PROVIDER=api-football` or `LIVE_DATA_PROVIDER=sportmonks` and add the matching token plus optional league/season IDs.

The static fallback can also update itself through GitHub. The `Sync FIFA Results PR` workflow runs every 30 minutes during the 2026 tournament window, runs `pnpm sync:fifa:pr` followed by `pnpm sync:fifa:goals`, validates the result, and opens or updates a PR on `codex/fifa-results-sync` when the committed fallback JSON has a real FIFA status, score, or scorer-event change. In GitHub, make sure **Settings → Actions → General → Workflow permissions** allows read/write access so the workflow can push the branch and create the PR. If you want that PR's push to trigger every downstream workflow, add a fine-scoped `SYNC_PR_TOKEN` repository secret; otherwise the default `GITHUB_TOKEN` is enough to open the PR and the sync workflow itself runs the data checks.

Before launch:

1. Confirm the production origin. The current metadata, `robots.txt`, and `sitemap.xml` use `https://world-cup-simplified.vercel.app/`.
2. Deploy on Vercel so `api/report-issue.js` is available at `/api/report-issue`.
3. Create a Resend API key.
4. Add the environment variables below in Vercel.
5. Use a verified sender/domain for `REPORT_FROM_EMAIL`.
6. Run `pnpm test` before promoting a data update.

Required environment variables:

```sh
RESEND_API_KEY=
REPORT_TO_EMAIL=
REPORT_FROM_EMAIL=
ALLOWED_REPORT_ORIGINS=https://world-cup-simplified.vercel.app
```

Optional report-endpoint tuning:

```sh
REPORT_RATE_LIMIT_MAX=5
REPORT_RATE_LIMIT_WINDOW_MS=600000
REPORT_MAX_BODY_BYTES=16384
RESEND_TIMEOUT_MS=8000
```

Automatic data updates:

```sh
LIVE_DATA_PROVIDER=football-data
LIVE_DATA_CACHE_SECONDS=300
LIVE_DATA_STALE_SECONDS=300
FOOTBALL_DATA_API_KEY=
FOOTBALL_DATA_COMPETITION=WC
FOOTBALL_DATA_SEASON=2026
FOOTBALL_DATA_WINDOW_BEFORE_DAYS=2
FOOTBALL_DATA_WINDOW_AFTER_DAYS=2
FOOTBALL_DATA_TIMEOUT_MS=8000
FIFA_GOAL_EVENTS_ENABLED=true
FIFA_GOAL_EVENTS_TIMEOUT_MS=5000
FIFA_GOAL_EVENTS_MAX_FIXTURES=8
API_FOOTBALL_API_KEY=
API_FOOTBALL_LEAGUE_ID=1
API_FOOTBALL_SEASON=2026
API_FOOTBALL_WINDOW_BEFORE_DAYS=1
API_FOOTBALL_WINDOW_AFTER_DAYS=1
API_FOOTBALL_TIMEOUT_MS=8000
API_FOOTBALL_MAX_PAGES=5
API_FOOTBALL_TIMEZONE=America/Los_Angeles
SPORTMONKS_API_TOKEN=
SPORTMONKS_SEASON_ID=
SPORTMONKS_LEAGUE_ID=
SPORTMONKS_WINDOW_BEFORE_DAYS=1
SPORTMONKS_WINDOW_AFTER_DAYS=1
SPORTMONKS_TIMEOUT_MS=8000
SPORTMONKS_MAX_PAGES=5
SYNC_TIMEZONE=America/Los_Angeles
```

Keep local `.env` files private. `.env.example` lists the required keys without real values.
