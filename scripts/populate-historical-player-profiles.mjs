#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayerName } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const historyPath = path.join(dataDir, "history.json");
const outputPath = path.join(dataDir, "historical-player-profiles.json");
const playerProfilesPath = path.join(dataDir, "player-profiles.json");
const sourceId = "historical-player-card-baseline-2026-06-23";
const inheritedImageSource = "current-player-profile";
const imageFieldNames = [
  "imageUrl",
  "imageSource",
  "imageSourceUrl",
  "imageCredit",
  "imageLicense",
  "imagePageTitle",
  "imagePageUrl"
];
const preservedEnrichmentFieldNames = [
  ...imageFieldNames,
  "birthDate",
  "clubAtTournament",
  "marketValueAtTournamentEurMillions",
  "marketValueAtTournamentSource",
  "marketValueAtTournamentSourceUrl",
  "peakMarketValueEurMillions",
  "peakMarketValueSource",
  "peakMarketValueSourceUrl"
];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readOptionalJson(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function increment(map, key, amount = 1) {
  if (!key) {
    return;
  }

  map.set(key, (map.get(key) || 0) + amount);
}

function mode(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "";
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatSeries(items, limit = 3) {
  const cleanItems = [...new Set(items)].filter(Boolean);
  const visibleItems = cleanItems.slice(0, limit);
  const hiddenCount = cleanItems.length - visibleItems.length;

  if (!visibleItems.length) {
    return "";
  }

  const suffix = hiddenCount > 0 ? ` and ${hiddenCount} more` : "";
  if (visibleItems.length === 1) {
    return `${visibleItems[0]}${suffix}`;
  }
  if (visibleItems.length === 2) {
    return `${visibleItems.join(" and ")}${suffix}`;
  }

  return `${visibleItems.slice(0, -1).join(", ")}, and ${visibleItems.at(-1)}${suffix}`;
}

function formatLimitedSeries(items, limit = 2) {
  const cleanItems = [...new Set(items)].filter(Boolean);
  const visibleItems = cleanItems.slice(0, limit);
  const hiddenCount = cleanItems.length - visibleItems.length;

  if (!visibleItems.length) {
    return "";
  }

  const visibleText = formatSeries(visibleItems, limit);
  return hiddenCount > 0 ? `${visibleText} plus ${hiddenCount} more` : visibleText;
}

function formatYearSeries(years) {
  const sortedYears = [...years].sort((a, b) => a - b);
  if (!sortedYears.length) {
    return "the historical archive";
  }
  if (sortedYears.length === 1) {
    return `World Cup ${sortedYears[0]}`;
  }
  if (sortedYears.length <= 3) {
    return `World Cups ${formatSeries(sortedYears.map(String), 3)}`;
  }

  return `World Cups ${sortedYears[0]}-${sortedYears.at(-1)}`;
}

function formatPosition(position) {
  return String(position || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(^|[,/]\s*)(\p{Letter})/gu, (_, prefix, letter) => `${prefix}${letter.toLocaleUpperCase("en-US")}`);
}

function lowerFirst(value) {
  const text = String(value || "").trim();
  return text ? `${text[0].toLocaleLowerCase("en-US")}${text.slice(1)}` : "";
}

function upperFirst(value) {
  const text = String(value || "").trim();
  return text ? `${text[0].toLocaleUpperCase("en-US")}${text.slice(1)}` : "";
}

function normalizeTeamName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function historicalProfileKey(name, teamName, tournamentYear) {
  return `${name} / ${teamName} / ${tournamentYear}`;
}

function historicalRecordKey(name, teamName, tournamentYear) {
  return [normalizePlayerName(name), normalizeTeamName(teamName), tournamentYear].join("|");
}

function addProfileAliases(map, profile) {
  if (!profile || typeof profile !== "object") {
    return;
  }

  for (const name of [profile.name, profile.displayName]) {
    const key = normalizePlayerName(name);
    if (key && !map.has(key)) {
      map.set(key, profile);
    }
  }
}

function pickFields(profile, fieldNames) {
  if (!profile) {
    return {};
  }

  return Object.fromEntries(
    fieldNames
      .filter((fieldName) => profile[fieldName] !== undefined)
      .map((fieldName) => [fieldName, profile[fieldName]])
  );
}

function pickImageFields(profile) {
  return pickFields(profile, imageFieldNames);
}

function pickPreservedEnrichmentFields(profile) {
  return pickFields(profile, preservedEnrichmentFieldNames);
}

function createHistoricalEnrichmentLookup(profilesData) {
  const lookup = new Map();
  for (const profile of Object.values(profilesData?.profiles || {})) {
    addProfileAliases(lookup, {
      ...pickPreservedEnrichmentFields(profile),
      name: profile.name,
      displayName: profile.displayName
    });
  }
  return lookup;
}

function createCurrentImageLookup(profilesData) {
  const lookup = new Map();
  for (const profile of Object.values(profilesData?.profiles || {})) {
    if (!profile?.imageUrl) {
      continue;
    }

    const imageProfile = {
      name: profile.name,
      displayName: profile.displayName,
      imageUrl: profile.imageUrl,
      imageSource: inheritedImageSource,
      imageSourceUrl: profile.sourceUrl || profile.imageUrl,
      birthDate: profile.birthDate
    };
    addProfileAliases(lookup, imageProfile);
  }
  return lookup;
}

function getEnrichmentFieldsForName(name, historicalEnrichmentLookup, currentImageLookup) {
  const key = normalizePlayerName(name);
  const historicalFields = pickPreservedEnrichmentFields(historicalEnrichmentLookup.get(key));
  if (Object.keys(historicalFields).length) {
    return historicalFields;
  }

  return pickPreservedEnrichmentFields(currentImageLookup.get(key));
}

function getRecord(records, name, fixture, teamName) {
  const tournamentYear = Number(fixture?.tournamentYear);
  const key = historicalRecordKey(name, teamName, tournamentYear);
  const existing = records.get(key);
  if (existing) {
    return existing;
  }

  const record = {
    name,
    goalCount: 0,
    keyMatchIds: new Set(),
    matchIds: new Set(),
    ownGoalCount: 0,
    penaltyGoalCount: 0,
    positions: new Map(),
    scorerMatchIds: new Set(),
    shirtNumbers: new Map(),
    teamName,
    teams: new Map(),
    tournamentYear,
    years: new Set(),
    notes: [],
    appearanceEvents: [],
    goalEvents: [],
    ownGoalEvents: [],
    contextEvents: []
  };
  records.set(key, record);
  return record;
}

function teamNameForSide(fixture, side) {
  return side === "home" ? fixture.homeSlot : fixture.awaySlot;
}

function oppositeSide(side) {
  return side === "home" ? "away" : "home";
}

function sideForTeamName(fixture, teamName) {
  const target = normalizeTeamName(teamName);
  if (!target) {
    return "";
  }
  if (normalizeTeamName(fixture?.homeSlot) === target) {
    return "home";
  }
  if (normalizeTeamName(fixture?.awaySlot) === target) {
    return "away";
  }
  return "";
}

function scoreValue(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function hasScorePair(pair) {
  return scoreValue(pair?.home) !== null && scoreValue(pair?.away) !== null;
}

function scorePairForSide(pair, side) {
  if (!hasScorePair(pair) || !["home", "away"].includes(side)) {
    return null;
  }

  return side === "home"
    ? { team: scoreValue(pair.home), opponent: scoreValue(pair.away) }
    : { team: scoreValue(pair.away), opponent: scoreValue(pair.home) };
}

function formatScorePairForSide(pair, side) {
  const score = scorePairForSide(pair, side);
  return score ? `${score.team}-${score.opponent}` : "";
}

function winnerSideForFixture(fixture) {
  const winnerName = normalizeTeamName(fixture?.winner);
  if (!winnerName) {
    return "";
  }
  if (normalizeTeamName(fixture?.homeSlot) === winnerName) {
    return "home";
  }
  if (normalizeTeamName(fixture?.awaySlot) === winnerName) {
    return "away";
  }
  return "";
}

function formatResultForTeam(fixture, teamName) {
  const side = sideForTeamName(fixture, teamName);
  const score = scorePairForSide(fixture?.score, side);
  if (!score) {
    return "";
  }

  const scoreText = `${score.team}-${score.opponent}`;
  const penaltyText = formatScorePairForSide(fixture?.scoreDetails?.penalties, side);
  const winnerSide = winnerSideForFixture(fixture);
  if (penaltyText && score.team === score.opponent && winnerSide) {
    return `${scoreText} shootout ${winnerSide === side ? "win" : "loss"}, ${penaltyText} pens`;
  }

  const fullTime = scorePairForSide(fixture?.scoreDetails?.fullTime, side);
  const wentToExtraTime =
    Boolean(fixture?.scoreDetails?.extraTime) &&
    fullTime &&
    (fullTime.team !== score.team || fullTime.opponent !== score.opponent);
  const result = score.team > score.opponent ? "win" : score.team < score.opponent ? "loss" : "draw";
  const extraTime = wentToExtraTime && result !== "draw" ? " extra-time" : "";

  return `${scoreText}${extraTime} ${result}`;
}

function opponentForTeam(fixture, teamName) {
  const side = sideForTeamName(fixture, teamName);
  if (side === "home") {
    return fixture?.awaySlot || "";
  }
  if (side === "away") {
    return fixture?.homeSlot || "";
  }
  return "";
}

function formatRoundLabel(round) {
  const text = String(round || "").trim();
  if (!text || /^matchday\b/i.test(text) || /^group\b/i.test(text)) {
    return "";
  }
  return text;
}

function goalScorersForSide(fixture, side) {
  const goals = side === "home" ? fixture?.goalsHome : fixture?.goalsAway;
  return (goals || [])
    .filter((goal) => goal?.name && !goal.ownGoal)
    .map((goal) => goal.name);
}

function keyPlayerNamesForSide(fixture, side) {
  return (fixture?.keyPlayers?.[side] || [])
    .map((player) => player?.name)
    .filter(Boolean);
}

function playerMatchEvent(fixture, teamName) {
  const side = sideForTeamName(fixture, teamName);
  return {
    fixtureId: fixture.id,
    date: fixture.date || "",
    opponentName: opponentForTeam(fixture, teamName),
    resultLabel: formatResultForTeam(fixture, teamName),
    roundLabel: formatRoundLabel(fixture.round),
    matchLensNames: keyPlayerNamesForSide(fixture, side),
    scoringRouteNames: goalScorersForSide(fixture, side),
    teamName
  };
}

function appearanceActionForNote(note) {
  if (/started/i.test(note)) {
    return "started";
  }
  if (/substitute|appeared as a substitute/i.test(note)) {
    return "came on";
  }
  if (/listed in the tournament squad/i.test(note)) {
    return "listed from squad context";
  }
  return "featured";
}

function formatMatchReference(event) {
  const opponent = event?.opponentName || "the opponent";
  const round = event?.roundLabel ? ` in the ${event.roundLabel}` : "";
  const result = event?.resultLabel ? ` (${event.resultLabel})` : "";
  return `${opponent}${round}${result}`;
}

function possessive(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  return /s$/i.test(text) ? `${text}'` : `${text}'s`;
}

function isSamePlayerName(a, b) {
  return normalizePlayerName(a) === normalizePlayerName(b);
}

function topContextNames(events, fieldName, playerName, limit = 3) {
  const names = new Map();
  for (const event of events) {
    for (const name of event?.[fieldName] || []) {
      if (!name || isSamePlayerName(name, playerName)) {
        continue;
      }
      increment(names, name);
    }
  }

  return [...names.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name]) => name);
}

function actionAdjective(record) {
  const noteText = record.notes.join(" ");
  if (/started/i.test(noteText)) {
    return "starting";
  }
  if (/substitute/i.test(noteText)) {
    return "substitute";
  }
  if (/listed in the tournament squad/i.test(noteText)) {
    return "squad-context";
  }
  return "";
}

function roleNoun(position) {
  const positionText = lowerFirst(position) || "player";
  if (/goalkeeper/i.test(position)) {
    return "goalkeeper";
  }
  if (/defender|back\b/i.test(position)) {
    return "defender";
  }
  if (/midfielder/i.test(position)) {
    return "midfielder";
  }
  if (/forward|winger|striker/i.test(position)) {
    return "forward";
  }
  return positionText;
}

function playerRolePhrase(record, position) {
  const action = actionAdjective(record);
  const role = roleNoun(position);
  return action ? `${action} ${role}` : role;
}

function hasLateGoal(record) {
  return record.goalEvents.some((event) => Number(event.minute) >= 80);
}

function hasKnockoutGoal(record) {
  return record.goalEvents.some((event) => roundImportance(event.roundLabel) >= 20);
}

function hasFinalGoal(record) {
  return record.goalEvents.some((event) => /^final$/i.test(event.roundLabel));
}

function hasMultiGoalMatch(record) {
  return summarizeGoalEvents(record.goalEvents).some((event) => event.count > 1);
}

function getTopMultiGoalMatch(record) {
  return summarizeGoalEvents(record.goalEvents).find((event) => event.count > 1);
}

function buildScorerLensSentence(record, primaryTeam, position) {
  const role = playerRolePhrase(record, position);
  const scorerRole = role === "player" ? "scorer" : role;
  const teamPossessive = possessive(primaryTeam);
  const scoringPeers = topContextNames(record.contextEvents, "scoringRouteNames", record.name, 2);
  const peerPhrase = scoringPeers.length ? ` alongside ${formatSeries(scoringPeers, 2)}` : "";

  if (record.goalCount >= 5) {
    return `A ${scorerRole} who kept ${teamPossessive} tournament route volatile with repeat scoring.`;
  }
  if (hasFinalGoal(record)) {
    return role === "player"
      ? `A final scorer in ${teamPossessive} archive route${peerPhrase}.`
      : `A ${role} who put a goal on the final stage for ${primaryTeam}${peerPhrase}.`;
  }
  if (hasKnockoutGoal(record)) {
    return `A ${scorerRole} who gave ${primaryTeam} a knockout scoring route${peerPhrase}.`;
  }
  if (record.penaltyGoalCount > 0 && record.penaltyGoalCount === record.goalCount) {
    return `A ${scorerRole} trusted from the spot in ${teamPossessive} archive scoring route${peerPhrase}.`;
  }
  if (hasMultiGoalMatch(record)) {
    const multiGoalMatch = getTopMultiGoalMatch(record);
    const opponent = multiGoalMatch?.opponentName || "one archive opponent";
    return `A ${scorerRole} whose repeat finishing tilted ${teamPossessive} match against ${opponent}${peerPhrase}.`;
  }
  if (scoringPeers.length) {
    return `A ${scorerRole} who joined ${teamPossessive} scoring route with ${formatSeries(scoringPeers, 2)}.`;
  }

  return `A ${scorerRole} who made ${teamPossessive} archive route run through his finishing.`;
}

function buildAppearanceLensSentence(record, primaryTeam, position) {
  const role = playerRolePhrase(record, position);
  const teamPossessive = possessive(primaryTeam);
  const scoringPeers = topContextNames(record.contextEvents, "scoringRouteNames", record.name, 2);
  const matchLensPeers = topContextNames(record.contextEvents, "matchLensNames", record.name, 2);

  if (scoringPeers.length) {
    return `A ${role} in ${teamPossessive} match lens, supporting a scoring route through ${formatSeries(scoringPeers, 2)}.`;
  }
  if (matchLensPeers.length) {
    return `A ${role} in ${teamPossessive} archive lens beside ${formatSeries(matchLensPeers, 2)}.`;
  }
  if (record.ownGoalEvents.length) {
    return `A ${role} whose archive card is tied to an own-goal swing.`;
  }

  return `A ${role} in ${teamPossessive} ${record.tournamentYear} archive lens.`;
}

function buildHistoricalLensSentence(record, primaryTeam, position) {
  return record.goalEvents.length
    ? buildScorerLensSentence(record, primaryTeam, position)
    : buildAppearanceLensSentence(record, primaryTeam, position);
}

function goalAction(count, penaltyCount = 0) {
  if (count === 1) {
    return penaltyCount === 1 ? "scored a penalty" : "scored";
  }
  if (count === 2) {
    return penaltyCount === 2 ? "scored twice from the spot" : "scored twice";
  }
  if (count === 3) {
    return penaltyCount === 3 ? "scored a penalty hat trick" : "scored a hat trick";
  }

  return penaltyCount === count ? `scored ${count} penalties` : `scored ${count} times`;
}

function goalActionDetail(count, penaltyCount = 0) {
  return goalAction(count, penaltyCount)
    .replace(/^scored$/, "a goal")
    .replace(/^scored\s+/, "");
}

function roundImportance(roundLabel) {
  if (/final/i.test(roundLabel) && !/semi|quarter/i.test(roundLabel)) {
    return 60;
  }
  if (/semi/i.test(roundLabel)) {
    return 50;
  }
  if (/quarter/i.test(roundLabel)) {
    return 40;
  }
  if (/round of/i.test(roundLabel)) {
    return 30;
  }
  if (/third/i.test(roundLabel)) {
    return 20;
  }
  return 0;
}

function compareEventDetail(a, b) {
  return (
    (b.count || 0) - (a.count || 0) ||
    roundImportance(b.roundLabel) - roundImportance(a.roundLabel) ||
    String(a.date || "").localeCompare(String(b.date || "")) ||
    String(a.opponentName || "").localeCompare(String(b.opponentName || ""))
  );
}

function summarizeGoalEvents(goalEvents) {
  const grouped = new Map();
  for (const event of goalEvents) {
    const key = event.fixtureId || `${event.opponentName}|${event.roundLabel}|${event.resultLabel}`;
    const summary = grouped.get(key) || {
      ...event,
      count: 0,
      penaltyCount: 0
    };
    summary.count += 1;
    if (event.penalty) {
      summary.penaltyCount += 1;
    }
    grouped.set(key, summary);
  }

  return [...grouped.values()].sort(compareEventDetail);
}

function buildGoalPhrase(record) {
  if (!record.goalEvents.length) {
    return "";
  }

  const goalMatches = summarizeGoalEvents(record.goalEvents);
  if (goalMatches.length === 1) {
    const match = goalMatches[0];
    return `${goalAction(match.count, match.penaltyCount)} against ${formatMatchReference(match)}`;
  }

  if (goalMatches.some((match) => match.count > 1) && record.goalCount <= 3 && goalMatches.length <= 3) {
    const references = goalMatches
      .slice()
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || compareEventDetail(a, b))
      .map((match) => `${goalAction(match.count, match.penaltyCount)} against ${formatMatchReference(match)}`);
    const phrase = formatSeries(references, 3);
    return phrase.length > 120 && references.length > 2
      ? `${formatSeries(goalMatches.slice(0, 2).map((match) => `${goalAction(match.count, match.penaltyCount)} against ${formatMatchReference(match)}`), 2)}, plus one more scoring match`
      : phrase;
  }

  if (record.goalCount <= 3 && goalMatches.length <= 3) {
    const references = goalMatches
      .slice()
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || compareEventDetail(a, b))
      .map(formatMatchReference);
    const phrase = `scored against ${formatSeries(references, 3)}`;
    return phrase.length > 120 && references.length > 2
      ? `scored against ${formatSeries(goalMatches.slice(0, 2).map(formatMatchReference), 2)}, plus one more match`
      : phrase;
  }

  const references = goalMatches
    .slice(0, 2)
    .map((match) => `${goalActionDetail(match.count, match.penaltyCount)} against ${formatMatchReference(match)}`);
  const phrase = `scored ${record.goalCount} times across ${pluralize(goalMatches.length, "match", "matches")}, including ${formatSeries(references, 2)}`;
  return phrase.length > 140
    ? `scored ${record.goalCount} times across ${pluralize(goalMatches.length, "match", "matches")}, led by ${references[0]}`
    : phrase;
}

function buildPenaltyGoalPhrase(record) {
  if (record.penaltyGoalCount <= 0 || record.penaltyGoalCount >= record.goalCount) {
    return "";
  }

  return record.penaltyGoalCount === 1
    ? "one goal came from the spot"
    : `${record.penaltyGoalCount} goals came from the spot`;
}

function buildOwnGoalPhrase(record) {
  if (record.goalEvents.length || !record.ownGoalEvents.length) {
    return "";
  }

  const ownGoalMatches = summarizeGoalEvents(record.ownGoalEvents);
  const references = ownGoalMatches.slice(0, 2).map(formatMatchReference);
  return `own-goal record against ${formatSeries(references, 2)}`;
}

function buildAppearancePhrase(record) {
  if (!record.appearanceEvents.length) {
    return "";
  }

  const events = [...record.appearanceEvents].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  const startedEvents = events.filter((event) => event.action === "started");
  const substituteEvents = events.filter((event) => event.action === "came on");
  const squadContextEvents = events.filter((event) => event.action === "listed from squad context");
  const selectedEvents = startedEvents.length ? startedEvents : substituteEvents.length ? substituteEvents : squadContextEvents.length ? squadContextEvents : events;
  const action = selectedEvents[0]?.action || "featured";
  const references = selectedEvents.map(formatMatchReference);

  if (!references.length) {
    return "";
  }

  if (action === "listed from squad context") {
    return `squad-context reference against ${formatLimitedSeries(references, 2)}`;
  }

  if (references.length <= 2) {
    return `${action} against ${formatSeries(references, 2)}`;
  }

  return `${action} in ${pluralize(references.length, "featured match", "featured matches")}, including ${formatLimitedSeries(references, 2)}`;
}

function addContext(record, fixture, teamName) {
  record.matchIds.add(fixture.id);
  record.years.add(Number(fixture.tournamentYear));
  increment(record.teams, teamName);
}

function addKeyPlayer(records, fixture, side, player) {
  if (!player?.name) {
    return;
  }

  const teamName = teamNameForSide(fixture, side);
  const record = getRecord(records, player.name, fixture, teamName);
  addContext(record, fixture, teamName);
  record.keyMatchIds.add(fixture.id);

  increment(record.positions, formatPosition(player.position));
  increment(record.shirtNumbers, Number(player.shirtNumber) > 0 ? String(player.shirtNumber) : "");
  if (player.note && !record.notes.includes(player.note)) {
    record.notes.push(player.note);
  }
  const event = {
    ...playerMatchEvent(fixture, teamName),
    action: appearanceActionForNote(player.note)
  };
  record.appearanceEvents.push(event);
  record.contextEvents.push(event);
}

function addGoal(records, fixture, side, goal) {
  if (!goal?.name) {
    return;
  }

  const teamName = teamNameForSide(fixture, goal.ownGoal ? oppositeSide(side) : side);
  const record = getRecord(records, goal.name, fixture, teamName);
  addContext(record, fixture, teamName);
  record.scorerMatchIds.add(fixture.id);

  if (goal.ownGoal) {
    record.ownGoalCount += 1;
    const event = {
      ...playerMatchEvent(fixture, teamName),
      minute: goal.minute,
      penalty: Boolean(goal.penalty)
    };
    record.ownGoalEvents.push(event);
    record.contextEvents.push(event);
  } else {
    record.goalCount += 1;
    const event = {
      ...playerMatchEvent(fixture, teamName),
      minute: goal.minute,
      penalty: Boolean(goal.penalty)
    };
    record.goalEvents.push(event);
    record.contextEvents.push(event);
  }
  if (goal.penalty) {
    record.penaltyGoalCount += 1;
  }
}

function inferSkills(record, position) {
  const noteText = record.notes.join(" ");
  const skills = [];
  const addSkill = (skill) => {
    if (skill && !skills.includes(skill)) {
      skills.push(skill);
    }
  };

  addSkill(position);
  if (record.goalCount > 0) {
    addSkill("Goal threat");
  }
  if (record.penaltyGoalCount > 0 || /shootout|penalt/i.test(noteText)) {
    addSkill("Penalty pressure");
  }
  if (/started/i.test(noteText)) {
    addSkill("Starter");
  }
  if (/substitute/i.test(noteText)) {
    addSkill("Impact sub");
  }
  if (/goalkeeper|defender|back\b/i.test(position)) {
    addSkill("Defensive control");
  }
  if (record.keyMatchIds.size >= 5 || record.goalCount >= 5) {
    addSkill("Archive standout");
  }
  addSkill("Historical lens");

  return skills.slice(0, 4);
}

function buildNote(record, primaryTeam, position) {
  const positionText = lowerFirst(position) || "player";
  const impactParts = [];

  if (record.goalCount > 0) {
    impactParts.push(`credited with ${pluralize(record.goalCount, "World Cup goal")}`);
  }
  if (record.keyMatchIds.size > 0) {
    impactParts.push(`featured in ${pluralize(record.keyMatchIds.size, "archive match note")}`);
  }
  if (!impactParts.length && record.ownGoalCount > 0) {
    impactParts.push(`appears through ${pluralize(record.ownGoalCount, "own-goal record")}`);
  }

  return `${primaryTeam}'s ${record.tournamentYear} World Cup ${positionText}; ${impactParts.join(" and ")}.`;
}

function formatArchiveYearLabel(years) {
  const sortedYears = [...years].sort((a, b) => a - b);
  if (!sortedYears.length) {
    return "historical";
  }
  if (sortedYears.length === 1) {
    return String(sortedYears[0]);
  }

  return `${sortedYears[0]}-${sortedYears.at(-1)}`;
}

function getRoleDescriptor(record, position) {
  const positionText = lowerFirst(position) || "player";
  const hasGoalThreat = record.goalCount > 0;
  const hasPenaltyPressure = record.penaltyGoalCount > 0 || /shootout|penalt/i.test(record.notes.join(" "));

  if (/goalkeeper/i.test(position)) {
    return "last-line reference";
  }
  if (/defender|back\b/i.test(position)) {
    return hasGoalThreat ? "defensive scoring threat" : "defensive control point";
  }
  if (/midfielder/i.test(position)) {
    if (hasPenaltyPressure) {
      return "midfield set-piece and penalty pressure";
    }
    return hasGoalThreat ? "midfield scoring threat" : "midfield connector";
  }
  if (/forward|winger|striker/i.test(position)) {
    return hasGoalThreat ? "front-line scoring threat" : "front-line outlet";
  }

  return `${positionText} reference`;
}

function buildStyleNote(record, primaryTeam, position) {
  const archiveLabel = `${primaryTeam} ${record.tournamentYear} archive`;
  const lensSentence = buildHistoricalLensSentence(record, primaryTeam, position);
  const detailParts = [
    buildGoalPhrase(record),
    buildPenaltyGoalPhrase(record),
    buildOwnGoalPhrase(record)
  ].filter(Boolean);

  if (!detailParts.length) {
    const appearancePhrase = buildAppearancePhrase(record);
    if (appearancePhrase) {
      detailParts.push(appearancePhrase);
    }
  }

  const detail = detailParts.length ? ` ${detailParts.map(upperFirst).join(". ")}.` : "";
  return `${archiveLabel}: ${lensSentence}${detail}`;
}

function buildSummary(record, primaryTeam, teams, years) {
  const teamText = formatSeries(teams, 4) || primaryTeam;
  return `Historical ${record.tournamentYear} World Cup card generated from scorer events, match appearances, tournament squads, and archive match notes. Archive team: ${teamText}.`;
}

function buildProfile(record, imageFields = {}) {
  const primaryTeam = mode(record.teams) || "Historical";
  const teams = [...record.teams.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([team]) => team);
  const years = [...record.years].sort((a, b) => a - b);
  const position = mode(record.positions) || "Player";
  const shirtNumber = Number(mode(record.shirtNumbers));
  const skills = inferSkills(record, position);

  return {
    profileKey: historicalProfileKey(record.name, primaryTeam, record.tournamentYear),
    name: record.name,
    displayName: record.name,
    historical: true,
    sourceId,
    teamName: primaryTeam,
    teams,
    tournamentYear: record.tournamentYear,
    tournamentYears: years,
    position,
    club: imageFields.clubAtTournament || `${primaryTeam} ${record.tournamentYear} World Cup archive`,
    uniformNumber: Number.isInteger(shirtNumber) && shirtNumber > 0 ? shirtNumber : undefined,
    goals: record.goalCount,
    ownGoals: record.ownGoalCount,
    keyMatchCount: record.keyMatchIds.size,
    scorerMatchCount: record.scorerMatchIds.size,
    skills,
    styleNote: buildStyleNote(record, primaryTeam, position),
    note: buildNote(record, primaryTeam, position),
    summary: buildSummary(record, primaryTeam, teams, record.years),
    ...imageFields,
    sourceUrl: "https://github.com/jfjelstul/worldcup"
  };
}

const historyData = await readJson(historyPath);
const existingHistoricalProfilesData = await readOptionalJson(outputPath);
const currentPlayerProfilesData = await readOptionalJson(playerProfilesPath);
const historicalEnrichmentLookup = createHistoricalEnrichmentLookup(existingHistoricalProfilesData);
const currentImageLookup = createCurrentImageLookup(currentPlayerProfilesData);
const records = new Map();

for (const fixture of historyData.fixtures || []) {
  for (const side of ["home", "away"]) {
    for (const player of fixture.keyPlayers?.[side] || []) {
      addKeyPlayer(records, fixture, side, player);
    }
  }

  for (const goal of fixture.goalsHome || []) {
    addGoal(records, fixture, "home", goal);
  }
  for (const goal of fixture.goalsAway || []) {
    addGoal(records, fixture, "away", goal);
  }
}

const profiles = Object.fromEntries(
  [...records.values()]
    .sort((a, b) => a.tournamentYear - b.tournamentYear || a.teamName.localeCompare(b.teamName) || a.name.localeCompare(b.name))
    .map((record) => {
      const profile = buildProfile(record, getEnrichmentFieldsForName(record.name, historicalEnrichmentLookup, currentImageLookup));
      return [profile.profileKey, profile];
    })
);

const hasImages = Object.values(profiles).some((profile) => profile.imageUrl);
const sourceIds = new Set(existingHistoricalProfilesData?.sourceIds || []);
sourceIds.add("openfootball-worldcup-json-2026-06-17");
sourceIds.add("fjelstul-worldcup-json-2026-06-23");
sourceIds.add(sourceId);
if (hasImages) {
  sourceIds.add("wikimedia-commons");
}

const output = {
  updatedAt: new Date().toISOString(),
  sourceIds: [...sourceIds],
  coverage: {
    status: "complete-men-1930-2022-key-players-and-scorers-by-team-year",
    note: "One historical card profile for every player, team and tournament year shown by archived key-player paragraphs or historical goal records."
  },
  profiles
};

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Historical player profiles populated: ${Object.keys(profiles).length} profiles.`);
