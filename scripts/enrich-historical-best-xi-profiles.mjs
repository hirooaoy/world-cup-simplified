#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import {
  getPlayerNameMatchScore,
  normalizePlayerName
} from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profilesPath = path.join(root, "data", "historical-player-profiles.json");
const fjelstulSourceId = "fjelstul-worldcup-json-2026-06-23";
const fjelstulSourceUrl =
  "https://raw.githubusercontent.com/jfjelstul/worldcup/master/data-json/worldcup.json";
const fjelstulSourcePageUrl =
  "https://github.com/jfjelstul/worldcup/blob/master/data-json/worldcup.json";
const transfermarktSourceId = "transfermarkt-market-values-2026-06-23";
const transfermarktPlayersUrl =
  "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz";
const transfermarktValuationsUrl =
  "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/player_valuations.csv.gz";
const checkOnly = process.argv.includes("--check");
const dryRun = process.argv.includes("--dry-run");
const expectedBestXiProfileCount = 484;

// These are reviewed identity differences between the editorial display names
// and Fjelstul's canonical player or squad spellings. Nils Liedholm is included
// for birth provenance even though the 1950 editorial selection predates his
// only Fjelstul-listed World Cup squad (1958).
const fjelstulPlayerIdOverrides = new Map([
  ["Pedro Suárez / Argentina / 1930", "P-56908"],
  ["Enrique Ballestrero / Uruguay / 1930", "P-63987"],
  ["Martim Silveira / Brazil / 1938", "P-35561"],
  ["Ernest Wilimowski / Poland / 1938", "P-13828"],
  ["Danilo Alvim / Brazil / 1950", "P-28983"],
  ["Nils Liedholm / Sweden / 1950", "P-10338"],
  ["Bellini / Brazil / 1958", "P-70724"],
  ["Yuri Voynov / Soviet Union / 1958", "P-69088"],
  ["Mauro / Brazil / 1962", "P-34782"],
  ["Vicente Lucas / Portugal / 1966", "P-53884"],
  ["Wilson Piazza / Brazil / 1970", "P-02965"],
  ["Wim van Hanegem / Netherlands / 1974", "P-65100"],
  ["Georg Schwarzenbeck / West Germany / 1974", "P-66174"],
  ["Hong Myung-bo / South Korea / 2002", "P-55097"],
  ["Lee Young-pyo / South Korea / 2002", "P-46519"],
  ["Yoo Sang-chul / South Korea / 2002", "P-75255"],
  ["Yahya Attiat-Allah / Morocco / 2022", "P-91543"]
]);

// Transfermarkt and Fjelstul both use Yahia Attiyat Allah, while the archive's
// reviewed display name is Yahya Attiat-Allah. Pin the dataset identity so that
// a loose transliteration match can never select a different player.
const transfermarktPlayerIdOverrides = new Map([
  ["Yahya Attiat-Allah / Morocco / 2022", "366746"]
]);

const fjelstulTeamNameOverrides = new Map([["USA", "United States"]]);
const managedMarketValueFieldNames = [
  "marketValueAtTournamentEurMillions",
  "marketValueAtTournamentDate",
  "marketValueAtTournamentSource",
  "marketValueAtTournamentSourceUrl",
  "marketValueAtTournamentUnavailableReason"
];

function getArgumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) || "";
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function loadBuffer({ filePath, label, url }) {
  if (filePath) {
    return readFile(path.resolve(filePath));
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "WorldCupSimplified/0.1 (historical Best XI profile enrichment)"
    }
  });
  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];
    if (quoted) {
      if (character === "\"" && nextCharacter === "\"") {
        value += "\"";
        index += 1;
      } else if (character === "\"") {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === "\"") {
      quoted = true;
    } else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (character !== "\r") {
      value += character;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

function parseCsvObjects(text) {
  const rows = parseCsvRows(text).filter((row) => row.length > 1 || row[0]);
  const headers = rows[0] || [];
  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ""]))
  );
}

function parseGzippedCsv(buffer) {
  return parseCsvObjects(gunzipSync(buffer).toString("utf8"));
}

function fjelstulTournamentId(year) {
  return `WC-${year}`;
}

function fjelstulPlayerName(record) {
  return normalizePlayerName(record?.given_name) === "not applicable"
    ? String(record?.family_name || "").trim()
    : `${record?.given_name || ""} ${record?.family_name || ""}`.trim();
}

function profileTeamName(profile) {
  return fjelstulTeamNameOverrides.get(profile.teamName) || profile.teamName;
}

function sourcePlayerIdFromProfile(profile) {
  for (const fieldName of [
    "peakMarketValueSourceUrl",
    "marketValueAtTournamentSourceUrl",
    "imageSourceUrl",
    "sourceUrl"
  ]) {
    const playerId = String(profile[fieldName] || "").match(/\/spieler\/(\d+)/)?.[1];
    if (playerId) {
      return playerId;
    }
  }
  return "";
}

function resolveFjelstulPlayerId(profile, squads) {
  const overridePlayerId = fjelstulPlayerIdOverrides.get(profile.profileKey);
  if (overridePlayerId) {
    return overridePlayerId;
  }

  const tournamentId = fjelstulTournamentId(profile.tournamentYear);
  const wantedName = normalizePlayerName(profile.name);
  const wantedTeam = profileTeamName(profile);
  const matches = squads.filter(
    (squad) =>
      squad.tournament_id === tournamentId &&
      squad.team_name === wantedTeam &&
      normalizePlayerName(fjelstulPlayerName(squad)) === wantedName
  );
  if (matches.length !== 1) {
    throw new Error(
      `${profile.profileKey}: expected one exact Fjelstul squad identity, found ${matches.length}`
    );
  }
  return matches[0].player_id;
}

function buildListIndex(records, getKey) {
  const index = new Map();
  for (const record of records) {
    const key = getKey(record);
    if (!key) {
      continue;
    }
    const list = index.get(key) || [];
    list.push(record);
    index.set(key, list);
  }
  return index;
}

function transfermarktBirthDate(record) {
  return String(record?.date_of_birth || "").slice(0, 10);
}

function transfermarktNameScore(profile, fjelstulPlayer, transfermarktPlayer) {
  const sourceNames = new Set([
    profile.name,
    profile.displayName,
    fjelstulPlayerName(fjelstulPlayer)
  ]);
  const targetNames = [transfermarktPlayer.name, transfermarktPlayer.player_code];
  let score = 0;
  for (const sourceName of sourceNames) {
    for (const targetName of targetNames) {
      score = Math.max(score, getPlayerNameMatchScore(sourceName, targetName));
    }
  }
  return score;
}

function resolveTransfermarktPlayer(
  profile,
  fjelstulPlayer,
  transfermarktPlayersById,
  transfermarktPlayersByBirthDate
) {
  const overridePlayerId = transfermarktPlayerIdOverrides.get(profile.profileKey);
  if (overridePlayerId) {
    const overridePlayer = transfermarktPlayersById.get(overridePlayerId);
    if (!overridePlayer) {
      throw new Error(`${profile.profileKey}: Transfermarkt override ${overridePlayerId} was not found`);
    }
    if (transfermarktBirthDate(overridePlayer) !== fjelstulPlayer.birth_date) {
      throw new Error(`${profile.profileKey}: Transfermarkt override birth date does not match Fjelstul`);
    }
    return { matchType: "reviewed-override", player: overridePlayer };
  }

  const sourcePlayerId = sourcePlayerIdFromProfile(profile);
  const sourcePlayer = transfermarktPlayersById.get(sourcePlayerId);
  if (sourcePlayer && transfermarktBirthDate(sourcePlayer) === fjelstulPlayer.birth_date) {
    return { matchType: "existing-provenance", player: sourcePlayer };
  }

  const candidates = (transfermarktPlayersByBirthDate.get(fjelstulPlayer.birth_date) || [])
    .map((player) => ({
      player,
      score: transfermarktNameScore(profile, fjelstulPlayer, player)
    }))
    .filter((candidate) => candidate.score >= 0.8)
    .sort(
      (left, right) =>
        right.score - left.score || Number(left.player.player_id) - Number(right.player.player_id)
    );
  if (!candidates.length) {
    return null;
  }
  if (candidates[1] && candidates[0].score === candidates[1].score) {
    throw new Error(`${profile.profileKey}: ambiguous birth-and-name Transfermarkt match`);
  }
  return { matchType: "birth-and-name", player: candidates[0].player };
}

function parsePositiveInteger(value, context) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${context}: expected a non-negative integer, received ${value}`);
  }
  return number;
}

function parseEurMillions(value) {
  const eur = Number(value);
  if (!Number.isFinite(eur) || eur <= 0) {
    return undefined;
  }
  return Math.round((eur / 1_000_000) * 10) / 10;
}

function tournamentFacts(profile, qualifiedTeams, teamAppearances) {
  const tournamentId = fjelstulTournamentId(profile.tournamentYear);
  const teamName = profileTeamName(profile);
  const qualifiedMatches = qualifiedTeams.filter(
    (record) => record.tournament_id === tournamentId && record.team_name === teamName
  );
  if (qualifiedMatches.length !== 1) {
    throw new Error(
      `${profile.profileKey}: expected one Fjelstul qualified-team row, found ${qualifiedMatches.length}`
    );
  }

  const appearances = teamAppearances.filter(
    (record) => record.tournament_id === tournamentId && record.team_name === teamName
  );
  const qualified = qualifiedMatches[0];
  const teamTournamentMatchCount = parsePositiveInteger(
    qualified.count_matches,
    `${profile.profileKey} match count`
  );
  if (appearances.length !== teamTournamentMatchCount) {
    throw new Error(
      `${profile.profileKey}: qualified-team match count ${teamTournamentMatchCount} does not match ${appearances.length} team appearances`
    );
  }

  return {
    teamTournamentMatchCount,
    teamTournamentCleanSheets: appearances.filter(
      (appearance) => parsePositiveInteger(appearance.goals_against, profile.profileKey) === 0
    ).length,
    teamTournamentGoalsFor: appearances.reduce(
      (total, appearance) =>
        total + parsePositiveInteger(appearance.goals_for, `${profile.profileKey} goals for`),
      0
    ),
    teamTournamentGoalsAgainst: appearances.reduce(
      (total, appearance) =>
        total + parsePositiveInteger(appearance.goals_against, `${profile.profileKey} goals against`),
      0
    ),
    tournamentTeamPerformance: String(qualified.performance || "").trim()
  };
}

function playerAppearanceFacts(profile, playerId, playerAppearances) {
  const appearances = playerAppearances.filter(
    (appearance) =>
      appearance.tournament_id === fjelstulTournamentId(profile.tournamentYear) &&
      appearance.player_id === playerId &&
      appearance.team_name === profileTeamName(profile)
  );
  if (!appearances.length) {
    if (profile.tournamentYear >= 1970) {
      throw new Error(`${profile.profileKey}: missing Fjelstul player appearances for 1970+`);
    }
    return {};
  }

  return {
    tournamentAppearances: new Set(appearances.map((appearance) => appearance.match_id)).size,
    tournamentStarts: appearances.filter((appearance) => Number(appearance.starter) === 1).length
  };
}

function latestValuationOnOrBefore(valuations, openingDate) {
  return valuations
    .filter((valuation) => valuation.date && valuation.date <= openingDate)
    .sort((left, right) => left.date.localeCompare(right.date))
    .at(-1);
}

function buildMarketValueFields(transfermarktMatch, valuations, openingDate) {
  if (!transfermarktMatch) {
    return {
      marketValueAtTournamentUnavailableReason:
        "No source-honest Transfermarkt player match in the dataset."
    };
  }

  const valuation = latestValuationOnOrBefore(valuations, openingDate);
  const value = parseEurMillions(valuation?.market_value_in_eur);
  if (!valuation || value === undefined) {
    return {
      marketValueAtTournamentUnavailableReason:
        "No Transfermarkt valuation on or before the tournament opening date."
    };
  }

  return {
    marketValueAtTournamentEurMillions: value,
    marketValueAtTournamentDate: valuation.date,
    marketValueAtTournamentSource: transfermarktSourceId,
    marketValueAtTournamentSourceUrl: transfermarktMatch.player.url
  };
}

function applyEnrichment(profile, fields, transfermarktMatch) {
  const enriched = { ...profile };
  for (const fieldName of managedMarketValueFieldNames) {
    delete enriched[fieldName];
  }

  const peakValue = parseEurMillions(transfermarktMatch?.player?.highest_market_value_in_eur);
  if (enriched.peakMarketValueEurMillions === undefined && peakValue !== undefined) {
    enriched.peakMarketValueEurMillions = peakValue;
    enriched.peakMarketValueSource = transfermarktSourceId;
    enriched.peakMarketValueSourceUrl = transfermarktMatch.player.url;
  }
  Object.assign(enriched, fields);
  return enriched;
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

const [
  profilesData,
  fjelstulBuffer,
  transfermarktPlayersBuffer,
  transfermarktValuationsBuffer
] = await Promise.all([
  readJson(profilesPath),
  loadBuffer({
    filePath: getArgumentValue("fjelstul-file"),
    label: "Fjelstul World Cup JSON",
    url: fjelstulSourceUrl
  }),
  loadBuffer({
    filePath: getArgumentValue("transfermarkt-players-file"),
    label: "Transfermarkt players dataset",
    url: transfermarktPlayersUrl
  }),
  loadBuffer({
    filePath: getArgumentValue("transfermarkt-valuations-file"),
    label: "Transfermarkt player valuations dataset",
    url: transfermarktValuationsUrl
  })
]);

const fjelstulData = JSON.parse(fjelstulBuffer.toString("utf8"));
const transfermarktPlayers = parseGzippedCsv(transfermarktPlayersBuffer);
const transfermarktValuations = parseGzippedCsv(transfermarktValuationsBuffer);
const bestXiProfiles = Object.values(profilesData.profiles || {}).filter(
  (profile) => profile.bestXiSelection
);
if (bestXiProfiles.length !== expectedBestXiProfileCount) {
  throw new Error(
    `Expected ${expectedBestXiProfileCount} historical Best XI profiles, found ${bestXiProfiles.length}`
  );
}

const fjelstulPlayersById = new Map(
  (fjelstulData.players || []).map((player) => [player.player_id, player])
);
const tournamentsById = new Map(
  (fjelstulData.tournaments || []).map((tournament) => [tournament.tournament_id, tournament])
);
const transfermarktPlayersById = new Map(
  transfermarktPlayers.map((player) => [player.player_id, player])
);
const transfermarktPlayersByBirthDate = buildListIndex(
  transfermarktPlayers,
  transfermarktBirthDate
);
const transfermarktValuationsByPlayerId = buildListIndex(
  transfermarktValuations,
  (valuation) => valuation.player_id
);
const tournamentValueCountByYear = new Map();
const transfermarktMatchTypeCounts = new Map();
const profiles = { ...(profilesData.profiles || {}) };
let birthDateCount = 0;
let playerAppearanceCount = 0;
let teamFactsCount = 0;
let tournamentValueCount = 0;
let unavailableValueCount = 0;
let addedPeakValueCount = 0;

for (const profile of bestXiProfiles) {
  const playerId = resolveFjelstulPlayerId(profile, fjelstulData.squads || []);
  const fjelstulPlayer = fjelstulPlayersById.get(playerId);
  if (!fjelstulPlayer?.birth_date) {
    throw new Error(`${profile.profileKey}: Fjelstul player ${playerId} has no birth date`);
  }
  birthDateCount += 1;

  const facts = tournamentFacts(
    profile,
    fjelstulData.qualified_teams || [],
    fjelstulData.team_appearances || []
  );
  teamFactsCount += 1;
  const appearances = playerAppearanceFacts(
    profile,
    playerId,
    fjelstulData.player_appearances || []
  );
  if (appearances.tournamentAppearances !== undefined) {
    playerAppearanceCount += 1;
  }

  const tournament = tournamentsById.get(fjelstulTournamentId(profile.tournamentYear));
  if (!tournament?.start_date) {
    throw new Error(`${profile.profileKey}: missing Fjelstul tournament opening date`);
  }
  const transfermarktMatch = resolveTransfermarktPlayer(
    profile,
    fjelstulPlayer,
    transfermarktPlayersById,
    transfermarktPlayersByBirthDate
  );
  if (transfermarktMatch) {
    increment(transfermarktMatchTypeCounts, transfermarktMatch.matchType);
  }
  const marketValueFields = buildMarketValueFields(
    transfermarktMatch,
    transfermarktValuationsByPlayerId.get(transfermarktMatch?.player?.player_id) || [],
    tournament.start_date
  );
  if (marketValueFields.marketValueAtTournamentEurMillions !== undefined) {
    tournamentValueCount += 1;
    increment(tournamentValueCountByYear, profile.tournamentYear);
  } else {
    unavailableValueCount += 1;
  }

  const hadPeakValue = profile.peakMarketValueEurMillions !== undefined;
  const enrichedProfile = applyEnrichment(
    profile,
    {
      birthDate: fjelstulPlayer.birth_date,
      birthDateSource: fjelstulSourceId,
      birthDateSourceUrl: fjelstulSourcePageUrl,
      ...appearances,
      ...facts,
      ...marketValueFields
    },
    transfermarktMatch
  );
  if (!hadPeakValue && enrichedProfile.peakMarketValueEurMillions !== undefined) {
    addedPeakValueCount += 1;
  }
  profiles[profile.profileKey] = enrichedProfile;
}

if (
  birthDateCount !== expectedBestXiProfileCount ||
  teamFactsCount !== expectedBestXiProfileCount ||
  tournamentValueCount + unavailableValueCount !== expectedBestXiProfileCount
) {
  throw new Error("Historical Best XI enrichment coverage invariant failed");
}
if (playerAppearanceCount !== 308) {
  throw new Error(`Expected Fjelstul appearance coverage for 308 profiles from 1970+, found ${playerAppearanceCount}`);
}
for (const [year, minimumCount] of [[2006, 7], [2010, 21]]) {
  if ((tournamentValueCountByYear.get(year) || 0) < minimumCount) {
    throw new Error(`Expected at least ${minimumCount} source-honest tournament values for ${year}`);
  }
}
for (const year of [2014, 2018, 2022]) {
  if (tournamentValueCountByYear.get(year) !== 22) {
    throw new Error(`Expected 22 source-honest tournament values for ${year}`);
  }
}

const output = {
  ...profilesData,
  updatedAt: new Date().toISOString(),
  sourceIds: [
    ...new Set([
      ...(profilesData.sourceIds || []),
      fjelstulSourceId,
      transfermarktSourceId
    ])
  ],
  profiles
};

const changedProfileCount = bestXiProfiles.filter(
  (profile) => !isDeepStrictEqual(profile, profiles[profile.profileKey])
).length;
console.log(`Historical Best XI profiles checked: ${bestXiProfiles.length}`);
console.log(`Birth dates with Fjelstul provenance: ${birthDateCount}`);
console.log(`Profiles with Fjelstul team tournament facts: ${teamFactsCount}`);
console.log(`Profiles with Fjelstul appearances/starts (1970+): ${playerAppearanceCount}`);
console.log(`Transfermarkt players loaded: ${transfermarktPlayers.length}`);
console.log(`Transfermarkt valuation rows loaded: ${transfermarktValuations.length}`);
console.log(
  `Source-honest Transfermarkt player matches: ${[...transfermarktMatchTypeCounts.values()].reduce((sum, count) => sum + count, 0)}`
);
console.log(`Tournament-date market values: ${tournamentValueCount}`);
console.log(`Explicit unavailable tournament values: ${unavailableValueCount}`);
console.log(`New peak values from matched Transfermarkt players: ${addedPeakValueCount}`);
console.log(
  `Tournament-value coverage by year: ${[...tournamentValueCountByYear.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([year, count]) => `${year}=${count}`)
    .join(", ")}`
);

if (checkOnly) {
  if (changedProfileCount > 0) {
    throw new Error(`${changedProfileCount} historical Best XI profiles need enrichment`);
  }
  console.log("Historical Best XI profile enrichment is current.");
} else if (dryRun) {
  console.log(`Dry run: ${changedProfileCount} profiles would change.`);
} else {
  await writeFile(profilesPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${path.relative(root, profilesPath)} (${changedProfileCount} profiles changed).`);
}
