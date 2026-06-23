#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPlayerTokens, isPlayerNameMatch } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const showDetails = process.argv.includes("--details");

const beginnerJargon = [
  "between the lines",
  "counter-press",
  "counter-pressing",
  "second ball",
  "second balls",
  "restarts",
  "set-piece",
  "set pieces",
  "low-margin",
  "one-v-one",
  "block",
  "pockets",
  "half-space",
  "transition",
  "transitions",
  "wide switches",
  "dead-ball",
  "final action",
  "press-resistant",
  "penalty-stage",
  "back line",
  "fullback",
  "center-back",
  "centre-back"
];

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function wordCount(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function findJargon(value) {
  const lower = String(value || "").toLowerCase();
  return beginnerJargon.filter((term) => lower.includes(term));
}

function copyMentionsPlayerName(copy, playerName) {
  const copyTokens = new Set(getPlayerTokens(copy));
  const normalizedCopy = normalizeText(copy);
  const normalizedPlayerName = normalizeText(playerName);

  if (normalizedPlayerName && normalizedCopy.includes(normalizedPlayerName)) {
    return true;
  }

  const playerTokens = getPlayerTokens(playerName).filter((token) => token.length >= 4);

  if (!playerTokens.length) {
    return false;
  }

  if (normalizedCopy.includes(playerTokens.join(" "))) {
    return true;
  }

  return playerTokens.some((token) => copyTokens.has(token));
}

function issue(label, detail = "") {
  return detail ? `${label}: ${detail}` : label;
}

function formatIssues(issues) {
  return issues.length ? issues.join("; ") : "OK";
}

function hasChineseTranslationEntry(source, value) {
  const text = String(value || "").trim();
  if (!text) {
    return true;
  }

  return source.includes(`${JSON.stringify(text)}:`) || source.includes(`${text}:`);
}

function isFiniteScore(value) {
  return Number.isFinite(Number(value));
}

function hasFinalScore(fixture) {
  return isFiniteScore(fixture.score?.home) && isFiniteScore(fixture.score?.away);
}

const [fixturesData, historyData, playerAvailabilityData, playerProfilesData, teamsData, tournamentData] =
  await Promise.all([
    readJson("fixtures.json"),
    readJson("history.json"),
    readJson("player-availability.json"),
    readJson("player-profiles.json"),
    readJson("teams.json"),
    readJson("tournament.json")
  ]);

const sourceIds = new Set((tournamentData.sources || []).map((source) => source.id));
const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
const profiles = playerProfilesData.profiles || {};
const appSource = await readFile(path.join(root, "app.js"), "utf8");
const rows = [];
const historicalRows = [];
const resultRows = [];
const teamTaglineIssues = [];
const chineseTranslationIssues = [];
const statusCounts = new Map();

const chineseTeamTerms = new Set();
const chinesePlayerTerms = new Set();

for (const team of teamsData.teams || []) {
  chineseTeamTerms.add(team.name);
  if (team.tagline) {
    chineseTeamTerms.add(team.tagline);
  }
  for (const tag of team.styleTags || []) {
    chineseTeamTerms.add(tag);
  }
}

for (const team of teamsData.teams || []) {
  const copy = [team.tagline, ...(team.styleTags || [])].filter(Boolean).join(" ");
  const teamPlayerNames = Object.values(profiles)
    .filter((profile) => profile.teamId === team.id)
    .map((profile) => profile.name);
  const mentionedPlayers = teamPlayerNames.filter((name) => copyMentionsPlayerName(copy, name));

  if (mentionedPlayers.length) {
    teamTaglineIssues.push({
      teamId: team.id,
      team: team.name,
      issues: [issue("player name in team descriptor", mentionedPlayers.join(", "))]
    });
  }
}

for (const fixture of fixturesData.fixtures || []) {
  if (fixture.stage !== "group") {
    continue;
  }

  statusCounts.set(fixture.status, (statusCounts.get(fixture.status) || 0) + 1);

  if (fixture.status === "FT") {
    const home = teamsById.get(fixture.homeTeamId);
    const away = teamsById.get(fixture.awayTeamId);
    const authoredHighlights = Array.isArray(fixture.resultHighlights)
      ? fixture.resultHighlights.filter((highlight) => typeof highlight === "string" && highlight.trim())
      : [];
    const issues = [];

    if (!hasFinalScore(fixture)) {
      issues.push(issue("finished fixture missing final score"));
    }

    resultRows.push({
      fixtureId: fixture.id,
      fixture: `${home?.name || fixture.homeTeamId} vs ${away?.name || fixture.awayTeamId}`,
      authored: authoredHighlights.length,
      generatedFromScore: !authoredHighlights.length && hasFinalScore(fixture),
      issues
    });
  }

  for (const side of ["home", "away"]) {
    const teamId = side === "home" ? fixture.homeTeamId : fixture.awayTeamId;
    const opponentId = side === "home" ? fixture.awayTeamId : fixture.homeTeamId;
    const team = teamsById.get(teamId);
    const opponent = teamsById.get(opponentId);
    const text = fixture.keyInformation?.[side] || "";
    const players = fixture.keyPlayers?.[side] || [];
    const availability = playerAvailabilityData.teams?.[teamId] || {};
    const includedNames = (availability.included || []).filter(Boolean);
    const unavailableNames = [
      ...(availability.unavailable || []),
      ...(availability.fixtureUnavailable || []).filter((record) => record.fixtureId === fixture.id)
    ];
    const issues = [];
    const paragraphWords = wordCount(text);
    const missingProfiles = players
      .map((player) => player.name)
      .filter((name) => !profiles[name]);
    const missingFromSquad = includedNames.length
      ? players
          .map((player) => player.name)
          .filter((name) => !includedNames.some((rosterName) => isPlayerNameMatch(name, rosterName)))
      : [];
    const unavailableListed = players
      .map((player) => player.name)
      .filter((name) => unavailableNames.some((record) => isPlayerNameMatch(name, record.name)));
    const missingNamesInCopy = players
      .map((player) => player.name)
      .filter((name) => !text.includes(name));
    const jargon = findJargon(text);

    if (!fixture.keyInformation) {
      issues.push(issue("missing keyInformation"));
    }
    if (!sourceIds.has(fixture.keyInformation?.sourceId)) {
      issues.push(issue("unknown keyInformation source", fixture.keyInformation?.sourceId || "none"));
    }
    if (paragraphWords < 35 || paragraphWords > 85) {
      issues.push(issue("word count outside target", String(paragraphWords)));
    }
    if (text.includes(";")) {
      issues.push(issue("semicolon makes plan/risk harder to scan"));
    }
    if (!text.includes(`Against ${opponent?.name}`)) {
      issues.push(issue("missing opponent relationship", opponent?.name || opponentId));
    }
    if (!text.includes(" has to beat ")) {
      issues.push(issue("missing style-vs-style matchup pressure"));
    }
    if (!/The risk is /.test(text)) {
      issues.push(issue("missing clear risk sentence"));
    }
    if (missingProfiles.length) {
      issues.push(issue("missing player profiles", missingProfiles.join(", ")));
    }
    if (missingFromSquad.length) {
      issues.push(issue("key player not in current squad baseline", missingFromSquad.join(", ")));
    }
    if (unavailableListed.length) {
      issues.push(issue("unavailable key player listed", unavailableListed.join(", ")));
    }
    if (missingNamesInCopy.length) {
      issues.push(issue("key player absent from paragraph", missingNamesInCopy.join(", ")));
    }
    if (jargon.length) {
      issues.push(issue("beginner jargon", jargon.join(", ")));
    }

    for (const player of players) {
      if (player.name) {
        chinesePlayerTerms.add(player.name);
        chinesePlayerTerms.add(profiles[player.name]?.displayName || player.name);
      }
    }

    rows.push({
      fixtureId: fixture.id,
      side,
      team: team?.name || teamId,
      opponent: opponent?.name || opponentId,
      status: fixture.status,
      words: paragraphWords,
      issues,
      text
    });
  }
}

for (const fixture of historyData.fixtures || []) {
  for (const side of ["home", "away"]) {
    const team = side === "home" ? fixture.homeSlot : fixture.awaySlot;
    const opponent = side === "home" ? fixture.awaySlot : fixture.homeSlot;
    const text = fixture.keyInformation?.[side] || "";
    const players = fixture.keyPlayers?.[side] || [];
    const paragraphWords = wordCount(text);
    const issues = [];
    const missingNamesInCopy = players
      .map((player) => player.name)
      .filter((name) => !copyMentionsPlayerName(text, name));
    const jargon = findJargon(text);

    if (!fixture.keyInformation) {
      issues.push(issue("missing keyInformation"));
    }
    if (!sourceIds.has(fixture.keyInformation?.sourceId)) {
      issues.push(issue("unknown keyInformation source", fixture.keyInformation?.sourceId || "none"));
    }
    if (paragraphWords < 35 || paragraphWords > 95) {
      issues.push(issue("word count outside target", String(paragraphWords)));
    }
    if (!text.includes(`Against ${opponent}`)) {
      issues.push(issue("missing historical opponent relationship", opponent));
    }
    if (fixture.status !== "CANCELLED" && !text.includes(" had to beat ")) {
      issues.push(issue("missing historical matchup pressure"));
    }
    if (fixture.status !== "CANCELLED" && players.length < 2) {
      issues.push(issue("not enough historical key players", String(players.length)));
    }
    if (missingNamesInCopy.length) {
      issues.push(issue("historical key player absent from paragraph", missingNamesInCopy.join(", ")));
    }
    if (jargon.length) {
      issues.push(issue("beginner jargon", jargon.join(", ")));
    }

    historicalRows.push({
      fixtureId: fixture.id,
      side,
      team,
      opponent,
      status: fixture.status,
      words: paragraphWords,
      issues,
      text
    });
  }
}

const missingChineseTeamTerms = [...chineseTeamTerms]
  .filter((term) => !hasChineseTranslationEntry(appSource, term))
  .sort();
const missingChinesePlayerTerms = [...chinesePlayerTerms]
  .filter((term) => !hasChineseTranslationEntry(appSource, term))
  .sort();

if (missingChineseTeamTerms.length) {
  chineseTranslationIssues.push(issue("missing Chinese team/style translations", missingChineseTeamTerms.join(", ")));
}
if (missingChinesePlayerTerms.length) {
  chineseTranslationIssues.push(issue("missing Chinese key-player translations", missingChinesePlayerTerms.join(", ")));
}

const issueRows = rows.filter((row) => row.issues.length);
const historicalIssueRows = historicalRows.filter((row) => row.issues.length);
const resultIssueRows = resultRows.filter((row) => row.issues.length);
const statusSummary = ["FT", "LIVE", "SCHEDULED"]
  .filter((status) => statusCounts.has(status))
  .map((status) => `${status}: ${statusCounts.get(status)}`)
  .join(", ");
const authoredResultCount = resultRows.filter((row) => row.authored).length;
const generatedResultCount = resultRows.filter((row) => row.generatedFromScore).length;

console.log("Matchup copy audit");
console.log(`Paragraphs checked: ${rows.length}`);
console.log(`Historical paragraphs checked: ${historicalRows.length}`);
console.log(`Team descriptors checked: ${(teamsData.teams || []).length}`);
console.log(`Group fixture statuses checked: ${statusSummary || "none"}`);
console.log(
  `Finished result sections checked: ${resultRows.length} (${authoredResultCount} authored, ${generatedResultCount} generated from final score)`
);
console.log(
  `Chinese translation terms checked: ${chineseTeamTerms.size + chinesePlayerTerms.size} (${chineseTeamTerms.size} team/style, ${chinesePlayerTerms.size} key-player)`
);
console.log(`Paragraphs needing review: ${issueRows.length}`);
console.log(`Historical paragraphs needing review: ${historicalIssueRows.length}`);
console.log(`Team descriptors needing review: ${teamTaglineIssues.length}`);
console.log(`Finished result sections needing review: ${resultIssueRows.length}`);
console.log(`Chinese translation terms needing review: ${chineseTranslationIssues.length}`);

if (teamTaglineIssues.length) {
  console.log("");
  console.log("Team descriptor issues");
  for (const row of teamTaglineIssues) {
    console.log(`- ${row.team} (${row.teamId}): ${formatIssues(row.issues)}`);
  }
}

if (issueRows.length) {
  console.log("");
  console.log("Paragraph issues");
  for (const row of issueRows) {
    console.log(`- ${row.fixtureId} ${row.side} ${row.team}: ${formatIssues(row.issues)}`);
  }
}

if (historicalIssueRows.length) {
  console.log("");
  console.log("Historical paragraph issues");
  for (const row of historicalIssueRows) {
    console.log(`- ${row.fixtureId} ${row.side} ${row.team}: ${formatIssues(row.issues)}`);
  }
}

if (resultIssueRows.length) {
  console.log("");
  console.log("Finished result section issues");
  for (const row of resultIssueRows) {
    console.log(`- ${row.fixtureId} ${row.fixture}: ${formatIssues(row.issues)}`);
  }
}

if (chineseTranslationIssues.length) {
  console.log("");
  console.log("Chinese translation issues");
  for (const row of chineseTranslationIssues) {
    console.log(`- ${row}`);
  }
}

if (showDetails) {
  console.log("");
  console.log("Paragraph details");
  for (const row of rows) {
    console.log("");
    console.log(`${row.fixtureId} | ${row.side} | ${row.team} vs ${row.opponent} | ${row.status} | ${row.words} words`);
    console.log(formatIssues(row.issues));
    console.log(row.text);
  }

  console.log("");
  console.log("Historical paragraph details");
  for (const row of historicalRows) {
    console.log("");
    console.log(`${row.fixtureId} | ${row.side} | ${row.team} vs ${row.opponent} | ${row.status} | ${row.words} words`);
    console.log(formatIssues(row.issues));
    console.log(row.text);
  }

  console.log("");
  console.log("Finished result section details");
  for (const row of resultRows) {
    const source = row.authored ? `${row.authored} authored highlight(s)` : "generated from final score";
    console.log(`${row.fixtureId} | ${row.fixture} | ${source} | ${formatIssues(row.issues)}`);
  }
}

if (
  issueRows.length ||
  historicalIssueRows.length ||
  teamTaglineIssues.length ||
  resultIssueRows.length ||
  chineseTranslationIssues.length
) {
  process.exitCode = 1;
}
