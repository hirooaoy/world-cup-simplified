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

const authoredChineseCopyPatterns = [
  /^⚽ (.+) and (.+) shared a 0-0 draw\.$/,
  /^⚽ (.+) and (.+) finished level at (.+)\.$/,
  /^⚽ (.+) beat (.+) (.+)\.$/,
  /^⚽ (.+) made a statement with a (.+) win\.$/,
  /^⚽ (.+) edged (.+) (.+)\.$/,
  /^⚽ (.+) beat (.+) on penalties after a (.+) draw\.$/,
  /^⚽ (.+) found the decisive goal in a (.+) win\.$/,
  /^🌟 (.+) scored twice in the rout\.$/,
  /^🌟 (.+) made a huge late double save\.$/,
  /^🌟 The clean sheet gave (.+) no way back\.$/,
  /^🌟 (.+)'s clean sheet ended (.+)'s run\.$/,
  /^🌟 The shootout decided (.+)\.$/,
  /^(.+) exited after penalties kept (.+) alive\.$/,
  /^🌟 (.+)'s attack broke the match open\.$/,
  /^🌟 (.+) protected a one-goal edge\.$/,
  /^🌟 (.+) created enough separation to control the finish\.$/,
  /^🌟 Both clean sheets kept the match tight\.$/,
  /^🌟 Neither side pulled clear(?: after trading goals)?\.$/,
  /^🌟 (.+) and (.+) carried the duel without a breakthrough\.$/,
  /^🌟 (.+) and (.+) traded momentum without a winner\.$/,
  /^🌟 (.+) and (.+) cancelled each other out\.$/,
  /^🌟 No breakthrough came from a tight draw\.$/,
  /^🌟 (.+) opened it before (.+) finished the scoring\.$/,
  /^🌟 (.+)'s (\d+(?:\+\d+)?') winner settled it for (.+)\.$/,
  /^🌟 (.+)'s (\d+(?:\+\d+)?') equalizer earned (.+) a point\.$/,
  /^🌟 (.+) scored twice as (.+) pulled clear\.$/,
  /^🌟 (.+) completed a hat trick as (.+) ran away with it\.$/,
  /^🌟 A (\d+(?:\+\d+)?') own goal earned (.+) a point\.$/,
  /^🌟 A (\d+(?:\+\d+)?') own goal settled it for (.+)\.$/,
  /^🌟 (.+)'s late penalty sealed (.+)'s win\.$/,
  /^🌟 Cabo Verde held Spain's possession game to a scoreless tournament debut\.$/,
  /^🌟 Curaçao's first World Cup point came through a hard-earned clean sheet\.$/,
  /^🌟 IR Iran kept Belgium's creators quiet and made the low-margin plan stick\.$/,
  /^🌟 (.+) headed (.+) in front early\.$/,
  /^🌟 (.+) scored twice, while (.+) and (.+) added second-half goals\.$/,
  /^🌟 (.+) scored in stoppage time to settle a tense opener in (.+)\.$/,
  /^🌟 (.+) scored and helped (.+) answer (.+)'s first World Cup goal\.$/,
  /^🌟 (.+)'s press made it scrappy, but (.+) sealed (.+)'s control late\.$/,
  /^🌟 (.+) started bravely, then the wet restart exposed their build-out mistakes\.$/,
  /^🌟 (.+) came through a tight one-goal match\.$/,
  /^A (\d+(?:\+\d+)?') own goal put (.+) in front before (.+) answered for (.+)\.$/,
  /^(.+) put (.+) in front before a (\d+(?:\+\d+)?') own goal answered for (.+)\.$/,
  /^(.+) put (.+) in front before (.+) answered for (.+)\.$/,
  /^A (\d+(?:\+\d+)?') own goal struck first for (.+), forcing (.+) to chase the match\.$/,
  /^(.+) struck first for (.+), forcing (.+) to chase the match\.$/,
  /^A (\d+(?:\+\d+)?') own goal put (.+) ahead early, making (.+) chase the match\.$/,
  /^(.+) put (.+) ahead early, making (.+) chase the match\.$/,
  /^A (\d+(?:\+\d+)?') own goal opened the scoring for (.+)\.$/,
  /^(.+) opened the scoring for (.+)\.$/,
  /^A (\d+(?:\+\d+)?') own goal broke through for (.+), shifting the match toward (.+)\.$/,
  /^(.+) broke through for (.+), shifting the match toward (.+)\.$/,
  /^A (\d+(?:\+\d+)?') own goal brought (.+) level before (.+) completed the turnaround\.$/,
  /^(.+) brought (.+) level before a (\d+(?:\+\d+)?') own goal completed the turnaround\.$/,
  /^(.+) brought (.+) level before (.+) completed the turnaround\.$/,
  /^A (\d+(?:\+\d+)?') own goal rescued a point for (.+)\.$/,
  /^(.+)'s (\d+(?:\+\d+)?') equalizer rescued a point for (.+)\.$/,
  /^A (\d+(?:\+\d+)?') own goal settled a tight match for (.+)\.$/,
  /^(.+)'s (\d+(?:\+\d+)?') winner settled a tight match for (.+)\.$/,
  /^A (\d+(?:\+\d+)?') own goal added the final word as (.+) pulled away\.$/,
  /^(.+) added the final word as (.+) pulled away\.$/,
  /^A (\d+(?:\+\d+)?') own goal finished the scoring as (.+) pulled away\.$/,
  /^(.+) finished the scoring as (.+) pulled away\.$/,
  /^(.+) assisted (.+) as (.+) pulled away\.$/,
  /^(.+) scored (twice|three times|\d+ times) as (.+) kept widening the gap\.$/,
  /^(.+)'s (twice|three times|\d+ times) gave (.+) the scoring separation\.$/,
  /^(.+) kept (.+) out and closed the match with a clean sheet\.$/,
  /^(.+)'s attack kept finding space and turned the finish into a rout\.$/,
  /^(.+)'s opener made (.+) sweat, but the later chances finally turned\.$/,
  /^(.+) stayed close enough to keep the final minutes tense\.$/,
  /^(.+) found the only goal, leaving (.+) chasing a 1-0 match\.$/,
  /^(.+) made the (.+) scoreline stand in a tight match\.$/,
  /^(.+) scored but never found the goal that would reopen the finish\.$/,
  /^(.+) got the decisive details right in a match that stayed tight\.$/,
  /^(.+) closed the result without needing another late twist\.$/,
  /^(.+) and (.+) traded pressure without finding a goal\.$/,
  /^Both defenses kept the scoring lanes closed through full time\.$/,
  /^(.+) and (.+) stayed locked together until the final whistle\.$/,
  /^(.+) and (.+) kept trading momentum instead of pulling clear\.$/,
  /^The late pressure never produced a winner after the match came back level\.$/,
  /^(.+)'s (\d+(?:\+\d+)?') equalizer eventually forced the shootout\.$/,
  /^A (\d+(?:\+\d+)?') own goal eventually forced the shootout\.$/,
  /^(.+) and (.+) stayed scoreless until penalties\.$/,
  /^The (.+) grind kept (.+)'s (.+) relevant all the way to penalties\.$/,
  /^The (.+) grind stayed tense enough to leave the knockout tie to penalties\.$/,
  /^(.+) won the shootout (.+) after a (.+) draw\.$/,
  /^(.+) survived the shootout after a (.+) draw\.$/,
  /^(.+) were cleaner from the spot, winning the shootout (.+) after the (.+) draw\.$/,
  /^(.+) survived from the spot after the (.+) draw\.$/,
  /^(.+) were cleaner from the spot, winning the (.+) through the shootout (.+) after the (.+) draw\.$/,
  /^(.+) lifted the (.+) title through the shootout\.$/,
  /^📊 Both sides took one point from (.+)\.$/,
  /^📊 Both teams took one point from (.+)\.$/,
  /^📊 (.+) took three points from (.+)\.$/,
  /^📊 (.+) took three points in (.+)\.$/,
  /^📊 (.+) took three points and (.+) GD in (.+)\.$/,
  /^📊 (.+) still needs a knockout winner loaded\.$/,
  /^📊 (.+) reached the (.+) and (.+) exited\.$/,
  /^📊 (.+) advanced from the (.+)\.$/,
  /^📊 (.+) advanced from (.+)\.$/,
  /^📊 (.+) won the World Cup\.$/,
  /^📊 (.+) secured third place\.$/,
  /^📊 Both teams moved to (.+) point(?:s)? in Group ([A-L])\.$/,
  /^📊 (.+) moved to (.+) point(?:s)? in Group ([A-L]) and left (.+) without a point\.$/,
  /^📊 (.+) moved to (.+) point(?:s)? in Group ([A-L]) while (.+) stayed on (.+) point(?:s)?\.$/,
  /^📊 (.+) moved to (.+) point(?:s)? and (.+) to (.+) point(?:s)? in Group ([A-L])\.$/,
  /^📊 (.+) reached (.+) point(?:s)? in Group ([A-L]) and booked a Round of 32 place\.$/,
  /^(.+) (\d+-\d+) (.+)$/,
  /^(.+) vs (.+)$/
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

function hasSupportedCurrentKeyInformationTranslationPattern(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");

  return [
    /^(.+?), led by (.+?)\. Against (.+?), their (.+?) has to beat (.+?)\. (.*?)They want to (.+?)\. The risk is (.+?) can (.+?)\.$/,
    /^(.+?), led by (.+?)\. Against (.+?), their (.+?) has to beat (.+?)\. (.*?)They want (.+?); the risk is (.+?) (.+?)\.$/i,
    /^(.+?), led by (.+?)\. Against (.+?), their (.+?) has to beat (.+?)\. (.*?)The risk is (.+?) (.+?)\.$/i
  ].some((pattern) => pattern.test(text));
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

function getAppChineseTranslationPatternBlock(source) {
  const match = source.match(/const ZH_PATTERN_TRANSLATIONS = \[([\s\S]+?)\];\n\nconst matchList/);
  return match?.[1] || "";
}

function getAppChineseTranslationPatterns(source) {
  const block = getAppChineseTranslationPatternBlock(source);
  const patterns = [];

  for (const match of block.matchAll(/pattern:\s*\/((?:\\.|[^/])*)\/([dgimsuvy]*)/g)) {
    try {
      const flags = match[2].replace(/[gy]/g, "");
      patterns.push(new RegExp(match[1], flags));
    } catch (error) {
      throw new Error(`Unable to parse Chinese translation pattern /${match[1]}/${match[2]}: ${error.message}`);
    }
  }

  return patterns;
}

let appChineseTranslationPatterns = [];

function hasChineseTranslationPattern(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return true;
  }

  return appChineseTranslationPatterns.some((pattern) => pattern.test(text));
}

function isChineseAuthoredCopyCovered(source, value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");

  if (!text || !/[A-Za-z]/.test(text)) {
    return true;
  }

  return hasChineseTranslationEntry(source, text) || hasChineseTranslationPattern(text);
}

function isLocalizedCopy(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && typeof value.en === "string");
}

function getChineseCoverageFields(value, field) {
  if (typeof value === "string" && value.trim()) {
    return [{ field, text: value.trim() }];
  }

  if (isLocalizedCopy(value)) {
    return value.zh?.trim() ? [] : [{ field: `${field}.en`, text: value.en.trim() }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => getChineseCoverageFields(item, `${field}[${index}]`));
  }

  return [];
}

function getAuthoredCatchUpChineseCopyFields(items, fieldPrefix) {
  const fields = [];

  for (const [itemIndex, item] of (items || []).entries()) {
    for (const key of ["headline", "body", "meta", "standouts", "sourceLabel"]) {
      fields.push(...getChineseCoverageFields(item?.[key], `${fieldPrefix}[${itemIndex}].${key}`));
    }
  }

  return fields;
}

function getAuthoredChineseCopyFields(fixture) {
  const fields = [];

  for (const [index, highlight] of (fixture.resultHighlights || []).entries()) {
    if (typeof highlight === "string" && highlight.trim()) {
      fields.push({
        field: `resultHighlights[${index}]`,
        text: highlight.trim()
      });
    }
  }

  for (const [index, highlight] of (fixture.resultStoryBullets || []).entries()) {
    if (typeof highlight === "string" && highlight.trim()) {
      fields.push({
        field: `resultStoryBullets[${index}]`,
        text: highlight.trim()
      });
    }
  }

  fields.push(...getAuthoredCatchUpChineseCopyFields(fixture.catchUp, "catchUp"));

  return fields;
}

function getTournamentAuthoredChineseCopyFields(tournament) {
  return [
    ...getAuthoredCatchUpChineseCopyFields(tournament.catchUp, "tournament.catchUp"),
    ...getAuthoredCatchUpChineseCopyFields(tournament.news, "tournament.news")
  ];
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
appChineseTranslationPatterns = getAppChineseTranslationPatterns(appSource);
const rows = [];
const historicalRows = [];
const resultRows = [];
const authoredChineseCopyRows = [];
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

const tournamentAuthoredChineseCopyFields = getTournamentAuthoredChineseCopyFields(tournamentData);
if (tournamentAuthoredChineseCopyFields.length) {
  const issues = tournamentAuthoredChineseCopyFields
    .filter(({ text }) => !isChineseAuthoredCopyCovered(appSource, text))
    .map(({ field, text }) => issue(`${field} missing Chinese coverage`, text));

  authoredChineseCopyRows.push({
    fixtureId: "tournament",
    fixture: "Tournament news",
    checked: tournamentAuthoredChineseCopyFields.length,
    issues
  });
}

for (const fixture of fixturesData.fixtures || []) {
  if (!fixture.homeTeamId || !fixture.awayTeamId) {
    continue;
  }

  statusCounts.set(fixture.status, (statusCounts.get(fixture.status) || 0) + 1);
  const home = teamsById.get(fixture.homeTeamId);
  const away = teamsById.get(fixture.awayTeamId);
  const authoredChineseCopyFields = getAuthoredChineseCopyFields(fixture);

  if (authoredChineseCopyFields.length) {
    const issues = authoredChineseCopyFields
      .filter(({ text }) => !isChineseAuthoredCopyCovered(appSource, text))
      .map(({ field, text }) => issue(`${field} missing Chinese coverage`, text));

    authoredChineseCopyRows.push({
      fixtureId: fixture.id,
      fixture: `${home?.name || fixture.homeTeamId} vs ${away?.name || fixture.awayTeamId}`,
      checked: authoredChineseCopyFields.length,
      issues
    });
  }

  if (fixture.status === "FT") {
    const authoredHighlights = Array.isArray(fixture.resultHighlights)
      ? fixture.resultHighlights.filter((highlight) => typeof highlight === "string" && highlight.trim())
      : [];
    const authoredStoryBullets = Array.isArray(fixture.resultStoryBullets)
      ? fixture.resultStoryBullets.filter((highlight) => typeof highlight === "string" && highlight.trim())
      : [];
    const issues = [];

    if (!hasFinalScore(fixture)) {
      issues.push(issue("finished fixture missing final score"));
    }

    resultRows.push({
      fixtureId: fixture.id,
      fixture: `${home?.name || fixture.homeTeamId} vs ${away?.name || fixture.awayTeamId}`,
      authored: authoredHighlights.length + authoredStoryBullets.length,
      generatedFromScore: !authoredHighlights.length && !authoredStoryBullets.length && hasFinalScore(fixture),
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
    if (text.includes(";") && !/; the risk is /i.test(text)) {
      issues.push(issue("semicolon makes plan/risk harder to scan"));
    }
    if (!text.includes(`Against ${opponent?.name}`)) {
      issues.push(issue("missing opponent relationship", opponent?.name || opponentId));
    }
    if (!text.includes(" has to beat ")) {
      issues.push(issue("missing style-vs-style matchup pressure"));
    }
    if (!/(?:The risk is |; the risk is )/i.test(text)) {
      issues.push(issue("missing clear risk sentence"));
    }
    if (!hasSupportedCurrentKeyInformationTranslationPattern(text)) {
      issues.push(issue("unsupported Chinese key-information translation pattern"));
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
  const authoredChineseCopyFields = getAuthoredChineseCopyFields(fixture);

  if (authoredChineseCopyFields.length) {
    const issues = authoredChineseCopyFields
      .filter(({ text }) => !isChineseAuthoredCopyCovered(appSource, text))
      .map(({ field, text }) => issue(`${field} missing Chinese coverage`, text));

    authoredChineseCopyRows.push({
      fixtureId: fixture.id,
      fixture: `${fixture.homeSlot || fixture.homeTeam?.name || "home"} vs ${fixture.awaySlot || fixture.awayTeam?.name || "away"}`,
      checked: authoredChineseCopyFields.length,
      issues
    });
  }

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
const authoredChineseCopyIssueRows = authoredChineseCopyRows.filter((row) => row.issues.length);
const statusSummary = ["FT", "LIVE", "SCHEDULED"]
  .filter((status) => statusCounts.has(status))
  .map((status) => `${status}: ${statusCounts.get(status)}`)
  .join(", ");
const authoredResultCount = resultRows.filter((row) => row.authored).length;
const generatedResultCount = resultRows.filter((row) => row.generatedFromScore).length;
const authoredChineseCopyCount = authoredChineseCopyRows.reduce((total, row) => total + row.checked, 0);

console.log("Matchup copy audit");
console.log(`Paragraphs checked: ${rows.length}`);
console.log(`Historical paragraphs checked: ${historicalRows.length}`);
console.log(`Team descriptors checked: ${(teamsData.teams || []).length}`);
console.log(`Confirmed fixture statuses checked: ${statusSummary || "none"}`);
console.log(
  `Finished result sections checked: ${resultRows.length} (${authoredResultCount} authored, ${generatedResultCount} generated from final score)`
);
console.log(`Authored Chinese match/news copy checked: ${authoredChineseCopyCount}`);
console.log(
  `Chinese translation terms checked: ${chineseTeamTerms.size + chinesePlayerTerms.size} (${chineseTeamTerms.size} team/style, ${chinesePlayerTerms.size} key-player)`
);
console.log(`Paragraphs needing review: ${issueRows.length}`);
console.log(`Historical paragraphs needing review: ${historicalIssueRows.length}`);
console.log(`Team descriptors needing review: ${teamTaglineIssues.length}`);
console.log(`Finished result sections needing review: ${resultIssueRows.length}`);
console.log(`Authored Chinese match/news copy needing review: ${authoredChineseCopyIssueRows.length}`);
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

if (authoredChineseCopyIssueRows.length) {
  console.log("");
  console.log("Authored Chinese match/news copy issues");
  for (const row of authoredChineseCopyIssueRows) {
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

  console.log("");
  console.log("Authored Chinese match/news copy details");
  for (const row of authoredChineseCopyRows) {
    console.log(`${row.fixtureId} | ${row.fixture} | ${row.checked} field(s) | ${formatIssues(row.issues)}`);
  }
}

if (
  issueRows.length ||
  historicalIssueRows.length ||
  teamTaglineIssues.length ||
  resultIssueRows.length ||
  authoredChineseCopyIssueRows.length ||
  chineseTranslationIssues.length
) {
  process.exitCode = 1;
}
