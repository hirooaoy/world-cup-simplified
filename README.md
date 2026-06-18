# World Cup Simplified

A lightweight static World Cup schedule and standings guide.

## Local Checks

Use pnpm for reproducible installs:

```sh
pnpm install
pnpm test
```

The test script validates the JSON data, audits freshness/status drift, and runs a Playwright smoke test against a local static server.

## Public Launch

The site is set up for Vercel. Static pages are served from the repo root and the `Report issue` flow posts to `/api/report-issue`.

## Automatic Data Updates

The production site tries `/api/live-data` before it falls back to the static JSON files. That API route runs server-side, uses `SPORTMONKS_API_TOKEN`, fetches recent Sportmonks fixtures, merges live/final scores into the existing fixtures, recomputes group standings, and returns a one-minute CDN-cached snapshot to the browser. Visitors still get the fast static app, but the data can update automatically without exposing the provider key.

To enable it:

1. Create a Sportmonks football API token.
2. Add `SPORTMONKS_API_TOKEN` in Vercel.
3. Add the 2026 World Cup `SPORTMONKS_SEASON_ID`; add `SPORTMONKS_LEAGUE_ID` too if your plan/API response needs league filtering.
4. Copy `data/provider-map.example.json` to `data/provider-map.json` and fill in provider IDs if name matching is not enough.
5. Deploy. The site will use live provider data automatically when `/api/live-data` succeeds, and static JSON when it does not.

The live endpoint is cached with `s-maxage=60`, so one burst of traffic should share the same provider result for about a minute instead of sending every visitor to the sports API.

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
