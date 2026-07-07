# API-Football Lineup Placement Experiment

Status: investigation only. Do not wire this into production until a real fixture response proves it solves exact placement.

## Question

Can API-Football solve exact lineup placement for ARG-EGY, specifically:

- Mostafa Zico as the central striker
- Haissem Hassan as the right winger
- Mohamed Salah's actual attacking role

## What The Public Docs Claim

API-Football documents a `fixtures/lineups` endpoint. The lineup response includes:

- team formation
- `startXI`
- substitutes
- player number
- player broad position (`pos`)
- player grid (`grid`)

API-Football's grid announcement says the grid is formatted `X:Y`, where `X` is the row starting from the goalkeeper line and `Y` is the column from left to right. That is the exact kind of field that can represent ST/RW/LW/CB-left/CB-right placement better than broad FIFA `Position` values.

Pricing/limits as of 2026-07-07:

- Free tier: 100 requests/day
- Requires an API key
- The key is sent as `x-apisports-key`
- Paid direct plans listed at $19, $29, and $39/month with higher daily request limits
- Free tier includes Line Ups, Fixtures, Injuries, Predictions, and related endpoints, but free-plan season coverage is limited

## How To Run

```sh
API_FOOTBALL_API_KEY=... node scripts/investigate-api-football-lineups.mjs
```

Optional overrides:

```sh
API_FOOTBALL_LEAGUE_ID=1 API_FOOTBALL_SEASON=2026 node scripts/investigate-api-football-lineups.mjs
API_FOOTBALL_FIXTURE_ID=123456 node scripts/investigate-api-football-lineups.mjs
```

The script only reads API-Football and prints a report. It does not write app data.

## Pass/Fail Criteria

Pass:

- API-Football has World Cup 2026 coverage for ARG-EGY.
- `/fixtures/lineups` returns both teams.
- Egypt has 11 starters.
- Zico, Haissem Hassan, and Salah have `grid` values.
- The grid places Zico centrally ahead of Haissem.
- Haissem is distinguishable as the right-sided attacker.
- Salah's role is distinguishable from Haissem and Zico.

Fail:

- No World Cup 2026 fixture coverage.
- No confirmed lineups for ARG-EGY.
- Only broad `F/M/D/G` positions are returned.
- `grid` is empty/null for the target players.
- The returned grid does not resolve Zico vs Haissem correctly.

If it fails the target-player check, do not depend on API-Football for exact lineup layout. It may still be useful for scores or broad team sheets, but not for the trust-sensitive pitch board.
