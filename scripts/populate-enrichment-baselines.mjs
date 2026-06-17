#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const fixturesPath = path.join(dataDir, "fixtures.json");

const keyPlayerSourceId = "key-player-baseline-2026-06-17";
const overwrite = process.argv.includes("--overwrite");

const teamKeyPlayers = {
  AUS: ["Mathew Ryan", "Jackson Irvine", "Christian Volpato"],
  BEL: ["Kevin De Bruyne", "Romelu Lukaku", "Jeremy Doku"],
  BRA: ["Neymar", "Vinicius Junior", "Casemiro"],
  CIV: ["Franck Kessie", "Simon Adingra", "Sebastien Haller"],
  CPV: ["Ryan Mendes", "Roberto Lopes", "Vozinha"],
  CUW: ["Juninho Bacuna", "Leandro Bacuna", "Vurnon Anita"],
  ECU: ["Moises Caicedo", "Piero Hincapie", "Enner Valencia"],
  EGY: ["Mohamed Salah", "Omar Marmoush", "Mostafa Mohamed"],
  ESP: ["Lamine Yamal", "Pedri", "Nico Williams"],
  GER: ["Joshua Kimmich", "Jamal Musiala", "Florian Wirtz"],
  HAI: ["Duckens Nazon", "Frantzdy Pierrot", "Jean-Ricner Bellegarde"],
  IRN: ["Mehdi Taremi", "Sardar Azmoun", "Alireza Jahanbakhsh"],
  JPN: ["Takefusa Kubo", "Kaoru Mitoma", "Wataru Endo"],
  KSA: ["Salem Al-Dawsari", "Firas Al-Buraikan", "Mohammed Al-Owais"],
  MAR: ["Achraf Hakimi", "Hakim Ziyech", "Youssef En-Nesyri"],
  NED: ["Virgil van Dijk", "Frenkie de Jong", "Cody Gakpo"],
  NZL: ["Chris Wood", "Liberato Cacace", "Sarpreet Singh"],
  PAR: ["Miguel Almiron", "Julio Enciso", "Gustavo Gomez"],
  SCO: ["Scott McTominay", "John McGinn", "Andy Robertson"],
  SWE: ["Alexander Isak", "Viktor Gyokeres", "Dejan Kulusevski"],
  TUN: ["Ellyes Skhiri", "Hannibal Mejbri", "Elias Saad"],
  TUR: ["Hakan Calhanoglu", "Arda Guler", "Kenan Yildiz"],
  URU: ["Federico Valverde", "Darwin Nunez", "Ronald Araujo"],
  USA: ["Christian Pulisic", "Weston McKennie", "Tyler Adams"]
};

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasPlayers(players) {
  return Array.isArray(players) && players.length > 0;
}

function collectExistingTeamPlayers(fixtures) {
  const teamPlayers = new Map();

  for (const fixture of fixtures) {
    if (hasPlayers(fixture.keyPlayers?.home) && fixture.homeTeamId) {
      teamPlayers.set(fixture.homeTeamId, clone(fixture.keyPlayers.home));
    }
    if (hasPlayers(fixture.keyPlayers?.away) && fixture.awayTeamId) {
      teamPlayers.set(fixture.awayTeamId, clone(fixture.keyPlayers.away));
    }
  }

  for (const [teamId, players] of Object.entries(teamKeyPlayers)) {
    if (!teamPlayers.has(teamId)) {
      teamPlayers.set(teamId, players);
    }
  }

  return teamPlayers;
}

function buildKeyPlayers(fixture, teamPlayers) {
  const home = teamPlayers.get(fixture.homeTeamId);
  const away = teamPlayers.get(fixture.awayTeamId);

  if (!hasPlayers(home) || !hasPlayers(away)) {
    return null;
  }

  return {
    sourceId: keyPlayerSourceId,
    method: "team-watchlist-baseline",
    basis: "Team-level key-player watchlist; replace with API/squad-sourced fixture notes when available",
    home: clone(home),
    away: clone(away)
  };
}

function shouldPopulateKeyPlayers(fixture) {
  return (
    overwrite ||
    !hasPlayers(fixture.keyPlayers?.home) ||
    !hasPlayers(fixture.keyPlayers?.away)
  );
}

function shouldPopulateH2h(fixture) {
  return overwrite || !fixture.h2h || fixture.h2h.status === "not-loaded";
}

function buildPendingH2h() {
  return {
    status: "research-pending",
    summary:
      "H2H research is pending for this matchup. Add API-backed or manually verified senior results when available.",
    results: null
  };
}

const fixturesData = await readJson(fixturesPath);
const teamPlayers = collectExistingTeamPlayers(fixturesData.fixtures || []);
let keyPlayersPopulated = 0;
let h2hPopulated = 0;
let skipped = 0;

fixturesData.sourceIds = [
  ...new Set([...(fixturesData.sourceIds || []), keyPlayerSourceId])
];

fixturesData.fixtures = fixturesData.fixtures.map((fixture) => {
  if (fixture.stage !== "group" || !fixture.homeTeamId || !fixture.awayTeamId) {
    skipped += 1;
    return fixture;
  }

  const nextFixture = { ...fixture };

  if (shouldPopulateKeyPlayers(nextFixture)) {
    const keyPlayers = buildKeyPlayers(nextFixture, teamPlayers);
    if (keyPlayers) {
      nextFixture.keyPlayers = keyPlayers;
      keyPlayersPopulated += 1;
    }
  }

  if (shouldPopulateH2h(nextFixture)) {
    nextFixture.h2h = buildPendingH2h();
    h2hPopulated += 1;
  }

  return nextFixture;
});

await writeFile(fixturesPath, `${JSON.stringify(fixturesData, null, 2)}\n`);
console.log(
  `Populated ${keyPlayersPopulated} key-player baseline${keyPlayersPopulated === 1 ? "" : "s"} and ${h2hPopulated} H2H baseline${h2hPopulated === 1 ? "" : "s"}; skipped ${skipped}.`
);
