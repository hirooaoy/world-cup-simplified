#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profilesPath = path.join(root, "data", "player-profiles.json");
const teamsPath = path.join(root, "data", "teams.json");
const transfermarktDatasetSourceId = "transfermarkt-market-values-2026-06-23";
const transfermarktPlayersCsvUrl =
  "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz";
const dryRun = process.argv.includes("--dry-run");
const peakFieldNames = [
  "peakMarketValueEurMillions",
  "peakMarketValueSource",
  "peakMarketValueSourceUrl"
];

const transfermarktCodeOverrides = new Map([
  ["Abduvohid Nematov", "abduvokhid-nematov"],
  ["Abdulaziz Hatem", "abdulaziz-hatim"],
  ["Alex Grimaldo", "alejandro-grimaldo"],
  ["Alisson Becker", "alisson"],
  ["Andy Robertson", "andrew-robertson"],
  ["Ayoub Aloui", "ayoub-al-oui"],
  ["Cho Gue-sung", "gue-sung-cho"],
  ["Danilo Santos", "danilo"],
  ["Frans Putros", "frans-dhia-putros"],
  ["Gabriel Magalhaes", "gabriel"],
  ["Hannibal Mejbri", "hannibal"],
  ["Hassan Al-Tambakti", "hassan-tambakti"],
  ["Hassan Alhaydos", "hasan-al-haydos"],
  ["Homam Ahmed", "homam-al-amin"],
  ["Hwang In-beom", "in-beom-hwang"],
  ["Kim Min-jae", "min-jae-kim"],
  ["Kim Seung-gyu", "seung-gyu-kim"],
  ["Lee Kang-in", "kang-in-lee"],
  ["Lionel Mpasi", "lionel-mpasi-nzau"],
  ["Marcus Holmgren Pedersen", "marcus-pedersen"],
  ["Michael Murillo", "amir-murillo"],
  ["Mohammad Abu Alnadi", "mohammad-abualnadi"],
  ["Nabil Donga", "nabil-dunga"],
  ["Odiljon Xamrobekov", "odildzhon-khamrobekov"],
  ["Paik Seung-ho", "seung-ho-paik"],
  ["Saeid Ezatolahi", "saeed-ezatolahi"],
  ["Shahriyar Moghanloo", "shahriar-moghanlou"],
  ["Song Bum-keun", "bum-keun-song"],
  ["Gilson Benchimol", "benchimol"],
  ["Sphephelo Sithole", "yaya-sithole"]
]);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === "\"" && next === "\"") {
        value += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        value += char;
      }
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
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
  return rows.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] || "";
    });
    return record;
  });
}

async function fetchTransfermarktPlayers() {
  const response = await fetch(transfermarktPlayersCsvUrl, {
    headers: { "User-Agent": "WorldCupSimplified/0.1 (local prime value enrichment)" }
  });
  if (!response.ok) {
    throw new Error(`Transfermarkt dataset returned ${response.status}`);
  }

  const compressed = Buffer.from(await response.arrayBuffer());
  return parseCsvObjects(gunzipSync(compressed).toString("utf8"));
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeCode(value) {
  return normalizeText(value).replace(/\s+/g, "-");
}

function normalizeDate(value) {
  return String(value || "").slice(0, 10);
}

function getNameTokens(value) {
  const ignored = new Set(["al", "da", "de", "del", "do", "dos", "el", "fc", "sc"]);
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !ignored.has(token));
}

function parseEurMillions(value) {
  const amount = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? Math.round((amount / 1000000) * 10) / 10 : undefined;
}

function addToIndex(index, key, record) {
  if (!key) {
    return;
  }
  const list = index.get(key) || [];
  list.push(record);
  index.set(key, list);
}

function buildTransfermarktIndex(records) {
  const byCode = new Map();
  const byId = new Map();
  const byName = new Map();
  const byToken = new Map();

  for (const record of records) {
    addToIndex(byCode, normalizeCode(record.player_code), record);
    addToIndex(byId, String(record.player_id || "").trim(), record);
    addToIndex(byName, normalizeText(record.name), record);
    addToIndex(byName, normalizeText(`${record.first_name || ""} ${record.last_name || ""}`), record);
    for (const token of new Set([...getNameTokens(record.name), ...getNameTokens(record.player_code)])) {
      addToIndex(byToken, token, record);
    }
  }

  return { byCode, byId, byName, byToken };
}

function getCurrentMarketValue(profile) {
  const value = Number(profile?.marketValueEurMillions ?? profile?.estimatedMarketValueEurMillions);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getProfileSearchNames(profileName, profile) {
  return [
    profileName,
    profile?.name,
    profile?.displayName,
    ...(Array.isArray(profile?.aliases) ? profile.aliases : [])
  ]
    .map((name) => String(name || "").trim())
    .filter(Boolean);
}

function getTransfermarktCandidates(profileName, profile, index) {
  const candidates = [];
  const seen = new Set();
  const names = getProfileSearchNames(profileName, profile);
  const overrideCode = transfermarktCodeOverrides.get(profileName);
  const sourcePlayerId = String(profile?.sourceUrl || "").match(/\/spieler\/(\d+)/)?.[1] || "";

  function add(record) {
    if (!record?.player_id || seen.has(record.player_id)) {
      return;
    }
    seen.add(record.player_id);
    candidates.push(record);
  }

  if (overrideCode) {
    for (const record of index.byCode.get(normalizeCode(overrideCode)) || []) {
      add(record);
    }
  }
  if (sourcePlayerId) {
    for (const record of index.byId.get(sourcePlayerId) || []) {
      add(record);
    }
  }

  for (const name of names) {
    for (const record of index.byName.get(normalizeText(name)) || []) {
      add(record);
    }
    for (const record of index.byCode.get(normalizeCode(name)) || []) {
      add(record);
    }
  }

  for (const token of new Set(names.flatMap(getNameTokens))) {
    for (const record of index.byToken.get(token) || []) {
      add(record);
    }
  }

  return candidates;
}

function scoreRecord(record, profileName, profile, teamsById) {
  const names = getProfileSearchNames(profileName, profile);
  const nameKeys = new Set(names.map(normalizeText).filter(Boolean));
  const codeKeys = new Set(names.map(normalizeCode).filter(Boolean));
  const wantedTokens = new Set(names.flatMap(getNameTokens));
  const recordTokens = new Set([...getNameTokens(record.name), ...getNameTokens(record.player_code)]);
  const currentValue = getCurrentMarketValue(profile);
  const recordValue = parseEurMillions(record.market_value_in_eur);
  const recordPeakValue = parseEurMillions(record.highest_market_value_in_eur);
  const recordNameKey = normalizeText(record.name);
  const recordCodeKey = normalizeCode(record.player_code);
  const profileBirthDate = String(profile?.birthDate || "").trim();
  const recordBirthDate = normalizeDate(record.date_of_birth);
  const profileClub = normalizeText(profile?.club);
  const recordClub = normalizeText(record.current_club_name);
  const team = teamsById.get(profile?.teamId);
  const teamNames = [team?.name, team?.shortName, team?.countryName].map(normalizeText).filter(Boolean);
  const citizenship = normalizeText(record.country_of_citizenship);
  const overlapCount = [...wantedTokens].filter((token) => recordTokens.has(token)).length;
  const exactName = nameKeys.has(recordNameKey);
  const exactCode = codeKeys.has(recordCodeKey);
  const overrideCode = transfermarktCodeOverrides.get(profileName);
  const overrideMatch = overrideCode && normalizeCode(overrideCode) === recordCodeKey;
  const sourcePlayerId = String(profile?.sourceUrl || "").match(/\/spieler\/(\d+)/)?.[1] || "";
  const sourceUrlMatch = Boolean(sourcePlayerId && sourcePlayerId === String(record.player_id || "").trim());
  const birthMatches = Boolean(profileBirthDate && recordBirthDate === profileBirthDate);
  const valueMatches = Boolean(currentValue && recordValue === currentValue);
  const clubMatches = Boolean(recordClub && profileClub && (recordClub.includes(profileClub) || profileClub.includes(recordClub)));
  const countryMatches = Boolean(
    citizenship &&
      teamNames.some((name) => name === citizenship || name.includes(citizenship) || citizenship.includes(name))
  );
  let score = 0;

  if (exactName || exactCode) {
    score += 120;
  }
  if (overrideMatch) {
    score += 120;
  }
  if (sourceUrlMatch) {
    score += 120;
  }
  if (birthMatches) {
    score += 90;
  }
  if (valueMatches) {
    score += 60;
  }
  if (recordPeakValue && currentValue && recordPeakValue === currentValue) {
    score += 20;
  }
  if (clubMatches) {
    score += 20;
  }
  if (countryMatches) {
    score += 10;
  }
  score += Math.min(overlapCount, 4) * 10;

  return {
    record,
    score,
    overlapCount,
    exactName,
    exactCode,
    overrideMatch,
    sourceUrlMatch,
    birthMatches,
    valueMatches,
    clubMatches,
    countryMatches,
    currentValue,
    recordValue,
    recordPeakValue
  };
}

function isAcceptedMatch(scored) {
  if (!scored) {
    return false;
  }
  if (scored.overrideMatch) {
    return scored.birthMatches || scored.valueMatches || scored.score >= 120;
  }
  if (scored.sourceUrlMatch) {
    return scored.birthMatches || scored.valueMatches || scored.score >= 120;
  }
  if (scored.exactName || scored.exactCode) {
    return scored.birthMatches || scored.valueMatches || scored.score >= 150;
  }
  if (scored.overlapCount >= 2 && scored.birthMatches && scored.score >= 120) {
    return true;
  }
  if (scored.overlapCount >= 2 && scored.valueMatches && (scored.clubMatches || scored.countryMatches) && scored.score >= 130) {
    return true;
  }

  return false;
}

function pickTransfermarktRecord(profileName, profile, index, teamsById) {
  return getTransfermarktCandidates(profileName, profile, index)
    .map((record) => scoreRecord(record, profileName, profile, teamsById))
    .filter(isAcceptedMatch)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (Number(b.birthMatches) !== Number(a.birthMatches)) {
        return Number(b.birthMatches) - Number(a.birthMatches);
      }
      return Number(b.valueMatches) - Number(a.valueMatches);
    })[0];
}

function buildPeakFields(scored) {
  return {
    peakMarketValueEurMillions: scored.recordPeakValue,
    peakMarketValueSource: transfermarktDatasetSourceId,
    peakMarketValueSourceUrl: scored.record.url
  };
}

function applyPeakFields(profile, fields) {
  const nextProfile = {};
  let inserted = false;

  for (const [key, value] of Object.entries(profile)) {
    if (peakFieldNames.includes(key)) {
      continue;
    }
    nextProfile[key] = value;
    if (!inserted && (key === "marketValueEurMillions" || key === "estimatedMarketValueEurMillions")) {
      for (const fieldName of peakFieldNames) {
        if (fields[fieldName] !== undefined && fields[fieldName] !== "") {
          nextProfile[fieldName] = fields[fieldName];
        }
      }
      inserted = true;
    }
  }

  if (!inserted) {
    for (const fieldName of peakFieldNames) {
      if (fields[fieldName] !== undefined && fields[fieldName] !== "") {
        nextProfile[fieldName] = fields[fieldName];
      }
    }
  }

  return nextProfile;
}

function fieldsChanged(profile, fields) {
  return peakFieldNames.some((fieldName) => profile[fieldName] !== fields[fieldName]);
}

const [profilesData, teamsData] = await Promise.all([
  readJson(profilesPath),
  readJson(teamsPath)
]);
const transfermarktRecords = await fetchTransfermarktPlayers();
const transfermarktIndex = buildTransfermarktIndex(transfermarktRecords);
const teamsById = new Map((teamsData.teams || []).map((team) => [team.id, team]));
const profiles = profilesData.profiles || {};
const unmatched = [];
const missingPeak = [];
let matched = 0;
let changed = 0;
let displayablePrime = 0;
let currentPrime = 0;

for (const [profileName, profile] of Object.entries(profiles)) {
  const scored = pickTransfermarktRecord(profileName, profile, transfermarktIndex, teamsById);
  if (!scored) {
    unmatched.push(profileName);
    continue;
  }

  matched += 1;
  if (!scored.recordPeakValue) {
    missingPeak.push(profileName);
    continue;
  }

  const currentValue = getCurrentMarketValue(profile);
  if (currentValue && scored.recordPeakValue > currentValue) {
    displayablePrime += 1;
  } else {
    currentPrime += 1;
  }

  const fields = buildPeakFields(scored);
  if (fieldsChanged(profile, fields)) {
    profiles[profileName] = applyPeakFields(profile, fields);
    changed += 1;
  }
}

const output = {
  ...profilesData,
  updatedAt: new Date().toISOString(),
  sourceIds: [...new Set([...(profilesData.sourceIds || []), transfermarktDatasetSourceId])],
  profiles
};

console.log(`Loaded ${transfermarktRecords.length} Transfermarkt player records.`);
console.log(`Profiles checked: ${Object.keys(profiles).length}`);
console.log(`Matched profiles: ${matched}`);
console.log(`Changed profiles: ${changed}`);
console.log(`Cards with visible Prime suffix: ${displayablePrime}`);
console.log(`Cards already at prime value: ${currentPrime}`);
console.log(`Matched profiles without peak value: ${missingPeak.length}`);
console.log(`Unmatched profiles: ${unmatched.length}`);

if (unmatched.length) {
  console.log("");
  console.log("Unmatched profiles:");
  for (const name of unmatched) {
    console.log(`- ${name}`);
  }
}

if (!dryRun && changed > 0) {
  await writeFile(profilesPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log("");
  console.log(`Wrote ${path.relative(root, profilesPath)}`);
} else if (dryRun) {
  console.log("");
  console.log("Dry run only; no files written.");
} else {
  console.log("");
  console.log("No profile changes needed.");
}
