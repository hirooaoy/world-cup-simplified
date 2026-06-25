#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const fixturesPath = path.join(dataDir, "fixtures.json");

const keyPlayerSourceId = "key-player-baseline-2026-06-22";
const overwrite = process.argv.includes("--overwrite");

const teamKeyPlayers = {
  ARG: ["Lionel Messi", "Julian Alvarez", "Enzo Fernandez"],
  AUT: ["David Alaba", "Marcel Sabitzer", "Konrad Laimer"],
  AUS: ["Mathew Ryan", "Jackson Irvine", "Christian Volpato"],
  BEL: ["Kevin De Bruyne", "Romelu Lukaku", "Jeremy Doku"],
  BRA: ["Neymar", "Vinicius Junior", "Casemiro"],
  CIV: ["Franck Kessie", "Simon Adingra", "Evann Guessand"],
  CPV: ["Ryan Mendes", "Roberto Lopes", "Vozinha"],
  CUW: ["Juninho Bacuna", "Leandro Bacuna", "Tahith Chong"],
  ECU: ["Moises Caicedo", "Piero Hincapie", "Enner Valencia"],
  EGY: ["Mohamed Salah", "Omar Marmoush", "Zizo"],
  ESP: ["Lamine Yamal", "Pedri", "Nico Williams"],
  GER: ["Joshua Kimmich", "Jamal Musiala", "Florian Wirtz"],
  HAI: ["Duckens Nazon", "Frantzdy Pierrot", "Jean-Ricner Bellegarde"],
  IRN: ["Mehdi Taremi", "Saman Ghoddos", "Alireza Jahanbakhsh"],
  JPN: ["Ayase Ueda", "Ritsu Doan", "Daichi Kamada"],
  JOR: ["Mousa Al-Taamari", "Ali Olwan", "Noor Al-Rawabdeh"],
  KSA: ["Salem Al-Dawsari", "Firas Al-Buraikan", "Mohammed Al-Owais"],
  MAR: ["Achraf Hakimi", "Brahim Diaz", "Ayoub El Kaabi"],
  NED: ["Virgil van Dijk", "Frenkie de Jong", "Cody Gakpo"],
  NZL: ["Chris Wood", "Liberato Cacace", "Sarpreet Singh"],
  PAR: ["Miguel Almiron", "Julio Enciso", "Gustavo Gomez"],
  SCO: ["Scott McTominay", "John McGinn", "Andy Robertson"],
  SWE: ["Alexander Isak", "Viktor Gyokeres", "Yasin Ayari"],
  TUN: ["Ellyes Skhiri", "Hannibal Mejbri", "Elias Saad"],
  TUR: ["Hakan Calhanoglu", "Arda Guler", "Kenan Yildiz"],
  URU: ["Federico Valverde", "Darwin Nunez", "Ronald Araujo"],
  USA: ["Christian Pulisic", "Weston McKennie", "Tyler Adams"]
};

const teamKeyPlayerOverrides = {
  ALG: [
    {
      name: "Riyad Mahrez",
      note: "Algeria's left-footed creator, still the player who can slow a match down and pick the decisive pass."
    },
    {
      name: "Houssem Aouar",
      note: "The midfield connector, useful when Algeria need cleaner passes between Mahrez and the forwards."
    },
    {
      name: "Amine Gouiri",
      note: "A clever forward who can drift, combine, and give Algeria scoring threat away from the obvious lanes."
    }
  ],
  EGY: [
    {
      name: "Mohamed Salah",
      note: "Egypt's decisive outlet, a transition runner and finisher every opponent has to bend their shape around."
    },
    {
      name: "Omar Marmoush",
      note: "A mobile second scoring threat who can attack channels and keep Egypt from becoming one-dimensional."
    },
    {
      name: "Zizo",
      note: "The right-side delivery and shooting option who can punish teams when Salah is tightly tracked."
    }
  ],
  FRA: [
    {
      name: "Kylian Mbappe",
      note: "France's game-breaking runner and finisher, the player who turns one channel ball into panic."
    },
    {
      name: "Michael Olise",
      note: "The current creative hinge, dangerous as a passer, dribbler, or left-footed shooter between defenders."
    },
    {
      name: "William Saliba",
      note: "The defensive stabilizer, calm enough to defend space while France's athletes surge forward."
    }
  ],
  IRN: [
    {
      name: "Mehdi Taremi",
      note: "Iran's most polished attacking reference, a clever finisher who also wins fouls and links counters."
    },
    {
      name: "Saman Ghoddos",
      note: "A versatile connector who gives Iran a calmer pass when counters need more than one touch."
    },
    {
      name: "Alireza Jahanbakhsh",
      note: "The experienced wide creator, useful on set pieces and when Iran need a calmer final ball."
    }
  ]
};

const fixtureKeyPlayerOverrides = {
  "belgium-ir-iran-2026-06-21": {
    home: [
      {
        name: "Kevin De Bruyne",
        note: "Belgium's elite chance architect, able to find early crosses, through balls, and shots before defenses settle."
      },
      {
        name: "Romelu Lukaku",
        note: "The reference point in the box and power finisher, built to punish any service into his stride or feet."
      },
      {
        name: "Leandro Trossard",
        note: "A flexible current-match attacking option who can replace Doku's width with sharper combination play around the box."
      }
    ]
  }
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

  for (const [teamId, players] of Object.entries(teamKeyPlayerOverrides)) {
    teamPlayers.set(teamId, players);
  }

  return teamPlayers;
}

function buildKeyPlayers(fixture, teamPlayers) {
  const fixtureOverride = fixtureKeyPlayerOverrides[fixture.id] || {};
  const home = fixtureOverride.home || teamPlayers.get(fixture.homeTeamId);
  const away = fixtureOverride.away || teamPlayers.get(fixture.awayTeamId);

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
    Boolean(fixtureKeyPlayerOverrides[fixture.id]) ||
    Boolean(teamKeyPlayerOverrides[fixture.homeTeamId]) ||
    Boolean(teamKeyPlayerOverrides[fixture.awayTeamId]) ||
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
