#!/usr/bin/env node

const BASE_URL = process.env.API_FOOTBALL_BASE_URL || "https://v3.football.api-sports.io";
const API_KEY =
  process.env.API_FOOTBALL_API_KEY ||
  process.env.APIFOOTBALL_API_KEY ||
  process.env.API_SPORTS_API_KEY ||
  process.env.APISPORTS_API_KEY ||
  "";
const LEAGUE_ID = String(process.env.API_FOOTBALL_LEAGUE_ID || "1");
const SEASON = String(process.env.API_FOOTBALL_SEASON || "2026");
const FIXTURE_ID = process.env.API_FOOTBALL_FIXTURE_ID || "";
const TIMEZONE = process.env.API_FOOTBALL_TIMEZONE || "America/Los_Angeles";
const TIMEOUT_MS = Number(process.env.API_FOOTBALL_TIMEOUT_MS || 10000);

const TARGETS = [
  { key: "zico", label: "Mostafa Zico", match: /zic[ko]/i },
  { key: "haissem", label: "Haissem Hassan", match: /haissem|hassan/i },
  { key: "salah", label: "Mohamed Salah", match: /salah/i }
];

if (!API_KEY) {
  console.error(
    [
      "Missing API_FOOTBALL_API_KEY.",
      "Create a free API-Football/API-Sports key, then run:",
      "  API_FOOTBALL_API_KEY=... node scripts/investigate-api-football-lineups.mjs",
      "",
      "No request was made."
    ].join("\n")
  );
  process.exitCode = 2;
} else {
  await main();
}

async function main() {
  const report = {
    checkedAt: new Date().toISOString(),
    leagueId: LEAGUE_ID,
    season: SEASON,
    fixtureId: FIXTURE_ID || null,
    coverage: null,
    fixture: null,
    lineups: null,
    targetPlayers: [],
    conclusion: []
  };

  report.coverage = await checkCoverage();
  report.fixture = FIXTURE_ID ? await fetchFixtureById(FIXTURE_ID) : await findArgentinaEgyptFixture();

  if (!report.fixture?.fixture?.id) {
    report.conclusion.push("FAIL: Could not find an API-Football fixture for Argentina vs Egypt.");
    printReport(report);
    process.exitCode = 1;
    return;
  }

  report.fixtureId = String(report.fixture.fixture.id);
  report.lineups = await fetchLineups(report.fixture.fixture.id);
  report.targetPlayers = analyzeTargetPlayers(report.lineups);
  report.conclusion = buildConclusion(report);

  printReport(report);

  if (report.conclusion.some((line) => line.startsWith("FAIL"))) {
    process.exitCode = 1;
  }
}

async function checkCoverage() {
  const leagues = await apiFootball("/leagues", {
    id: LEAGUE_ID,
    season: SEASON
  }).catch((error) => ({ error: error.message, response: [] }));

  const league = Array.isArray(leagues.response) ? leagues.response[0] : null;
  return {
    found: Boolean(league),
    league: league
      ? {
          id: league.league?.id,
          name: league.league?.name,
          type: league.league?.type,
          country: league.country?.name,
          seasons: (league.seasons || []).map((season) => ({
            year: season.year,
            current: season.current,
            coverage: season.coverage
          }))
        }
      : null,
    error: leagues.error || null
  };
}

async function fetchFixtureById(id) {
  const payload = await apiFootball("/fixtures", { id });
  return payload.response?.[0] || null;
}

async function findArgentinaEgyptFixture() {
  const payload = await apiFootball("/fixtures", {
    league: LEAGUE_ID,
    season: SEASON,
    timezone: TIMEZONE
  });
  const fixtures = payload.response || [];
  return (
    fixtures.find(isArgentinaEgyptFixture) ||
    fixtures.find((fixture) => String(fixture.fixture?.id || "") === FIXTURE_ID) ||
    null
  );
}

function isArgentinaEgyptFixture(fixture) {
  const home = fixture.teams?.home?.name || "";
  const away = fixture.teams?.away?.name || "";
  const names = `${home} ${away}`.toLowerCase();
  return names.includes("argentina") && names.includes("egypt");
}

async function fetchLineups(fixtureId) {
  const payload = await apiFootball("/fixtures/lineups", { fixture: fixtureId });
  return payload.response || [];
}

function analyzeTargetPlayers(lineups) {
  const rows = [];
  for (const side of lineups || []) {
    for (const entry of side.startXI || []) {
      const player = entry.player || {};
      for (const target of TARGETS) {
        if (target.match.test(player.name || "")) {
          rows.push({
            target: target.label,
            team: side.team?.name || "",
            formation: side.formation || "",
            id: player.id || null,
            name: player.name || "",
            number: player.number || null,
            pos: player.pos || "",
            grid: player.grid || "",
            gridInterpretation: interpretGrid(player.grid)
          });
        }
      }
    }
  }
  return rows;
}

function interpretGrid(grid) {
  const parsed = parseGrid(grid);
  if (!parsed) {
    return "missing grid";
  }
  const { row, column } = parsed;
  const lane = column === 1 ? "left" : column === 2 ? "center/left" : column === 3 ? "center/right" : column >= 4 ? "right" : "unknown";
  return `row ${row}, column ${column} (${lane}; row 1 starts at goalkeeper)`;
}

function parseGrid(grid) {
  const match = String(grid || "").match(/^(\d+):(\d+)$/);
  if (!match) {
    return null;
  }
  return {
    row: Number(match[1]),
    column: Number(match[2])
  };
}

function buildConclusion(report) {
  const conclusion = [];
  if (!report.coverage?.found) {
    conclusion.push("FAIL: League/season coverage was not confirmed.");
  } else {
    conclusion.push("PASS: League/season coverage endpoint returned a match for the configured league and season.");
  }

  const lineupCount = report.lineups?.length || 0;
  if (lineupCount < 2) {
    conclusion.push("FAIL: /fixtures/lineups did not return both teams.");
  } else {
    conclusion.push("PASS: /fixtures/lineups returned lineup records.");
  }

  const targetsByKey = new Map();
  for (const row of report.targetPlayers) {
    const key = TARGETS.find((target) => target.label === row.target)?.key;
    if (key) {
      targetsByKey.set(key, row);
    }
  }

  for (const target of TARGETS) {
    const row = targetsByKey.get(target.key);
    if (!row) {
      conclusion.push(`FAIL: ${target.label} was not found in the starting XI response.`);
    } else if (!parseGrid(row.grid)) {
      conclusion.push(`FAIL: ${target.label} was found but has no exact grid value.`);
    } else {
      conclusion.push(`CHECK: ${target.label} has pos=${row.pos || "?"}, grid=${row.grid}. Verify against Google.`);
    }
  }

  const zico = targetsByKey.get("zico");
  const haissem = targetsByKey.get("haissem");
  const salah = targetsByKey.get("salah");
  if (zico && haissem && parseGrid(zico.grid) && parseGrid(haissem.grid)) {
    const z = parseGrid(zico.grid);
    const h = parseGrid(haissem.grid);
    if (z.row > h.row && z.column <= h.column) {
      conclusion.push("LIKELY PASS: Zico appears ahead of Haissem in grid row depth.");
    } else {
      conclusion.push("FAIL: Grid does not clearly place Zico as the central striker ahead of Haissem.");
    }
  }
  if (salah && parseGrid(salah.grid)) {
    conclusion.push("CHECK: Salah has a grid value; compare whether it is central AM or right-sided in the returned formation.");
  }

  return conclusion;
}

async function apiFootball(pathname, params) {
  const url = new URL(`${BASE_URL}${pathname}`);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        "x-apisports-key": API_KEY
      },
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(payload.errors || payload).slice(0, 300)}`);
    }
    if (payload.errors && Object.keys(payload.errors).length) {
      throw new Error(`API errors: ${JSON.stringify(payload.errors).slice(0, 300)}`);
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

function printReport(report) {
  console.log(JSON.stringify(report, null, 2));
}
