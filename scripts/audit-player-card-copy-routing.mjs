#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");

const REPRESENTATIVE_PLAYERS = [
  {
    name: "Cristiano Ronaldo",
    teaserFragment: "headline finisher and reference point"
  },
  {
    name: "Lamine Yamal",
    teaserFragment: "game-breaking wide creator"
  },
  {
    name: "Kylian Mbappé",
    teaserFragment: "turns one channel ball into panic"
  }
];

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(dataDir, fileName), "utf8"));
}

function normalizeTextKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function profileAliases(profileName, profile = {}) {
  return [
    profileName,
    profile.name,
    profile.displayName,
    ...(Array.isArray(profile.aliases) ? profile.aliases : [])
  ].map(text).filter(Boolean);
}

function buildProfileLookups(profiles = {}) {
  const byName = new Map();
  const byTeamAndName = new Map();

  for (const [profileName, profile] of Object.entries(profiles)) {
    const entry = { profileName, ...profile };
    const teamId = text(profile.teamId).toUpperCase();

    for (const alias of profileAliases(profileName, profile)) {
      const nameKey = normalizeTextKey(alias);
      if (!nameKey) continue;

      // Mirror app.js: the global lookup keeps its first canonical match,
      // while the team-scoped lookup is authoritative for that team and name.
      if (!byName.has(nameKey)) byName.set(nameKey, entry);
      if (teamId) byTeamAndName.set(`${teamId}:${nameKey}`, entry);
    }
  }

  return { byName, byTeamAndName };
}

function resolveCanonicalProfile(player, teamId, lookups) {
  const nameKey = normalizeTextKey(player?.name);
  const normalizedTeamId = text(player?.teamId || teamId).toUpperCase();
  if (!nameKey) return null;

  return (
    (normalizedTeamId && lookups.byTeamAndName.get(`${normalizedTeamId}:${nameKey}`)) ||
    lookups.byName.get(nameKey) ||
    null
  );
}

function resolveGenericCardCopy(player, profile) {
  const profileNote = text(profile?.note);
  const fixtureTeaser = text(player?.note);

  return {
    copy: profileNote || fixtureTeaser,
    fixtureTeaser,
    source: profileNote ? "profile.note" : fixtureTeaser ? "fixture.keyPlayers.note" : "none"
  };
}

function collectFixtureKeyPlayers(fixtures = []) {
  const references = [];

  for (const fixture of fixtures) {
    for (const side of ["home", "away"]) {
      const teamId = side === "home" ? fixture.homeTeamId : fixture.awayTeamId;
      for (const player of fixture.keyPlayers?.[side] || []) {
        references.push({
          fixtureId: fixture.id,
          player,
          side,
          teamId
        });
      }
    }
  }

  return references;
}

function addIssue(issues, reference, message) {
  const fixtureLabel = reference?.fixtureId ? `fixture ${reference.fixtureId}` : "source contract";
  const playerLabel = text(reference?.player?.name);
  issues.push(`${fixtureLabel}${playerLabel ? ` / ${playerLabel}` : ""}: ${message}`);
}

function inspectRuntimeSourceContract(appSource, issues) {
  const functionStart = appSource.indexOf("function getPlayerCardNote(");
  const nextFunction = appSource.indexOf("\nfunction getLocalizedPlayerNote(", functionStart);
  if (functionStart === -1 || nextFunction === -1) {
    addIssue(issues, null, "could not locate getPlayerCardNote in app.js");
    return false;
  }

  const functionSource = appSource
    .slice(functionStart, nextFunction)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const returnExpressions = [...functionSource.matchAll(/\breturn\s+([^;]+);/g)]
    .map((match) => match[1].replace(/\s+/g, "").trim());
  const currentPlayerReturn = returnExpressions.at(-1) || "";
  const expectedReturn = 'profile?.note||getPlayerNote(player)||""';

  if (currentPlayerReturn !== expectedReturn) {
    addIssue(
      issues,
      null,
      `getPlayerCardNote must resolve current generic copy profile-first; found ${currentPlayerReturn || "no return expression"}`
    );
    return false;
  }

  return true;
}

const [fixturesData, profilesData, appSource] = await Promise.all([
  readJson("fixtures.json"),
  readJson("player-profiles.json"),
  readFile(path.join(root, "app.js"), "utf8")
]);

const lookups = buildProfileLookups(profilesData.profiles || {});
const references = collectFixtureKeyPlayers(fixturesData.fixtures || []);
const issues = [];
const checked = [];
let contextualTeasers = 0;

for (const reference of references) {
  const profile = resolveCanonicalProfile(reference.player, reference.teamId, lookups);
  if (!profile) {
    addIssue(issues, reference, `no canonical profile resolved for team ${reference.teamId || "unknown"}`);
    continue;
  }

  const profileNote = text(profile.note);
  const resolved = resolveGenericCardCopy(reference.player, profile);
  checked.push({ ...reference, profile, resolved });

  if (!profileNote) {
    addIssue(issues, reference, "canonical profile has no note");
    continue;
  }
  if (resolved.source !== "profile.note") {
    addIssue(issues, reference, `generic copy resolved from ${resolved.source} instead of profile.note`);
  }
  if (resolved.copy !== profileNote) {
    addIssue(issues, reference, "generic copy does not equal the canonical profile note");
  }
  if (resolved.fixtureTeaser && resolved.fixtureTeaser !== profileNote) {
    contextualTeasers += 1;
    if (resolved.copy === resolved.fixtureTeaser) {
      addIssue(issues, reference, "fixture teaser shadowed the canonical generic description");
    }
  }
}

for (const expected of REPRESENTATIVE_PLAYERS) {
  const matches = checked.filter(
    (entry) => normalizeTextKey(entry.player?.name) === normalizeTextKey(expected.name)
  );
  const representative = matches.find((entry) =>
    entry.resolved.fixtureTeaser.toLowerCase().includes(expected.teaserFragment.toLowerCase())
  );

  if (!representative) {
    addIssue(issues, { player: { name: expected.name } }, `missing fixture teaser containing "${expected.teaserFragment}"`);
    continue;
  }
  if (representative.resolved.copy === representative.resolved.fixtureTeaser) {
    addIssue(issues, representative, "representative generic copy still resolves to its fixture teaser");
  }
  const sentenceCount = representative.resolved.copy
    .split(/(?<=[.!?])\s+/u)
    .filter(Boolean)
    .length;
  if (representative.resolved.copy.length < 120 || sentenceCount < 2) {
    addIssue(
      issues,
      representative,
      `canonical generic description is too thin (${representative.resolved.copy.length} characters, ${sentenceCount} sentences)`
    );
  }
}

const runtimeContractValid = inspectRuntimeSourceContract(appSource, issues);

if (issues.length) {
  console.error(`Player-card copy routing audit found ${issues.length} issue${issues.length === 1 ? "" : "s"}:`);
  for (const issue of issues.slice(0, 80)) console.error(`- ${issue}`);
  if (issues.length > 80) console.error(`...and ${issues.length - 80} more`);
  process.exit(1);
}

const uniquePlayers = new Set(checked.map((entry) => normalizeTextKey(entry.player.name))).size;
console.log("Player-card copy routing audit passed.");
console.log(`- ${references.length} fixture key-player references checked (${uniquePlayers} unique players).`);
console.log(`- ${checked.length} canonical profiles resolved and selected profile-first.`);
console.log(`- ${contextualTeasers} fixture teaser instances preserved as separate contextual copy.`);
console.log(`- Representative routing verified: ${REPRESENTATIVE_PLAYERS.map(({ name }) => name).join(", ")}.`);
console.log(`- app.js source contract: ${runtimeContractValid ? "profile.note before fixture fallback" : "invalid"}.`);
