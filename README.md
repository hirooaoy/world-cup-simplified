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

Before launch:

1. Confirm the production origin. The current metadata, `robots.txt`, and `sitemap.xml` use `https://worldcupsimplified.com/`.
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
ALLOWED_REPORT_ORIGINS=https://worldcupsimplified.com
```

Optional report-endpoint tuning:

```sh
REPORT_RATE_LIMIT_MAX=5
REPORT_RATE_LIMIT_WINDOW_MS=600000
REPORT_MAX_BODY_BYTES=16384
RESEND_TIMEOUT_MS=8000
```

Keep local `.env` files private. `.env.example` lists the required keys without real values.
