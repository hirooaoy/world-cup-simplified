import assert from "node:assert/strict";

import {
  extractFifaTacticalLineupPdf,
  FifaTacticalLineupPdfError,
  isFifaTacticalPlayerNameMatch,
  parseFifaTacticalLineupDocument
} from "./fifa-tactical-lineup-pdf.mjs";
import {
  FIFA_TACTICAL_LINEUP_R12549_SHA256,
  FIFA_TACTICAL_LINEUP_R12549_URL,
  fifaTacticalLineupR12549Document
} from "./fixtures/fifa-tactical-lineup-r12549.mjs";

const player = (number, name, sourcePosition) => ({ number: String(number), name, sourcePosition });
const fixture = { matchNumber: 102, homeTeamId: "ENG", awayTeamId: "ARG", tacticalLineupVersion: 1 };
const lineups = {
  home: {
    formation: "4-2-3-1",
    players: [
      player(1, "Jordan Pickford", "goalkeeper"),
      player(5, "John Stones", "defender"),
      player(6, "Marc Guehi", "defender"),
      player(24, "Reece James", "defender"),
      player(25, "Djed Spence", "defender"),
      player(4, "Declan Rice", "midfielder"),
      player(8, "Elliot Anderson", "midfielder"),
      player(10, "Jude Bellingham", "midfielder"),
      player(17, "Morgan Rogers", "midfielder"),
      player(18, "Anthony Gordon", "forward"),
      { ...player(9, "Harry Kane", "forward"), isCaptain: true }
    ]
  },
  away: {
    formation: "4-4-2",
    players: [
      player(23, "Emiliano Martinez", "goalkeeper"),
      player(3, "Nicolas Tagliafico", "defender"),
      player(6, "Lisandro Martinez", "defender"),
      player(13, "Cristian Romero", "defender"),
      player(26, "Nahuel Molina", "defender"),
      player(5, "Leandro Paredes", "midfielder"),
      player(20, "Alexis Mac Allister", "midfielder"),
      player(24, "Enzo Fernandez", "midfielder"),
      player(17, "Giuliano Simeone", "forward"),
      player(9, "Julian Alvarez", "forward"),
      { ...player(10, "Lionel Messi", "forward"), isCaptain: true }
    ]
  }
};

function buildDeterministicPdf(positionedDocument) {
  const ascii = (value) => String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "");
  const escapePdfText = (value) => ascii(value).replace(/([\\()])/g, "\\$1");
  const content = positionedDocument.items
    .map((item) =>
      `BT /F1 5.17 Tf 1 0 0 1 ${item.x} ${item.y} Tm (${escapePdfText(item.str)}) Tj ET`
    )
    .join("\n");
  const objects = [
    "",
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${positionedDocument.width} ${positionedDocument.height}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`
  ];
  let pdf = "%PDF-1.4\n% deterministic FIFA tactical parser smoke\n";
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = Buffer.byteLength(pdf);
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

const parsed = parseFifaTacticalLineupDocument({
  document: fifaTacticalLineupR12549Document,
  fixture,
  lineups
});

const extractedDocument = await extractFifaTacticalLineupPdf(
  buildDeterministicPdf(fifaTacticalLineupR12549Document)
);
extractedDocument.sourceUrl = FIFA_TACTICAL_LINEUP_R12549_URL;
const extractedAndParsed = parseFifaTacticalLineupDocument({
  document: extractedDocument,
  fixture,
  lineups
});
assert.equal(
  extractedAndParsed.home.players.find((entry) => entry.name === "Morgan Rogers")?.position,
  "RW",
  "The byte-level PDF extraction path must retain FIFA's positioned Rogers row."
);
assert.equal(
  extractedAndParsed.away.players.find((entry) => entry.name === "Enzo Fernandez")?.position,
  "LM",
  "The byte-level PDF extraction path must retain FIFA's left/right Argentina geometry."
);

assert.equal(parsed.matchNumber, 102);
assert.equal(parsed.version, 1);
assert.equal(parsed.publishedAt, "2026-07-15T17:41:00.000Z");
assert.equal(parsed.layoutPerspective, "nominal");
assert.equal(parsed.isUpdatedVersion, false);
assert.equal(parsed.revisionComment, "");
assert.equal(parsed.sourceUrl, FIFA_TACTICAL_LINEUP_R12549_URL);
assert.equal(parsed.sha256, FIFA_TACTICAL_LINEUP_R12549_SHA256);
assert.equal(parsed.home.teamCode, "ENG");
assert.equal(parsed.home.formation, "4-2-3-1");
assert.equal(parsed.away.teamCode, "ARG");
assert.equal(parsed.away.formation, "4-4-2");
assert.equal(parsed.home.players.length + parsed.away.players.length, 22);

const byName = (side, name) => parsed[side].players.find((entry) => entry.name === name);
assert.equal(byName("home", "Morgan Rogers").position, "RW", "Rogers must be in England's attacking row.");
assert.equal(byName("home", "Djed Spence").position, "LB");
assert.equal(byName("home", "Reece James").position, "RB");
assert(byName("home", "Djed Spence").x < byName("home", "Marc Guehi").x);
assert(byName("home", "Reece James").x > byName("home", "John Stones").x);
assert.equal(byName("away", "Enzo Fernandez").position, "LM");
assert.equal(byName("away", "Giuliano Simeone").position, "RM");
assert(byName("away", "Enzo Fernandez").x < byName("away", "Alexis Mac Allister").x);
assert(byName("away", "Giuliano Simeone").x > byName("away", "Leandro Paredes").x);
assert.equal(isFifaTacticalPlayerNameMatch("ALEX B.", "Alex Baena"), true);
assert.equal(isFifaTacticalPlayerNameMatch("RODRIGO", "Rodri"), true);
assert.equal(isFifaTacticalPlayerNameMatch("Alex Wrong", "Alex Baena"), false);

const observedDocument = {
  ...fifaTacticalLineupR12549Document,
  items: [
    ...fifaTacticalLineupR12549Document.items.map((item) =>
      /\bVersion\s+1\b/i.test(item.str)
        ? {
            ...item,
            str: item.str
              .replace("15 July 2026 | 17:41 UTC | Version 1", "15 July 2026 | 19:29 UTC | Version 2")
          }
        : item
    ),
    { str: "Comment: Update to the tactical line up after observation of the game.", x: 12, y: 10, width: 240, height: 5 },
    { str: "UPDATED VERSION", x: 500, y: 10, width: 70, height: 5 }
  ]
};
const observed = parseFifaTacticalLineupDocument({
  document: observedDocument,
  fixture: { ...fixture, tacticalLineupVersion: undefined },
  lineups
});
assert.equal(observed.version, 2);
assert.equal(observed.layoutPerspective, "observed");
assert.equal(observed.isUpdatedVersion, true);
assert.equal(
  observed.revisionComment,
  "Update to the tactical line up after observation of the game."
);

for (const side of ["home", "away"]) {
  const parsedNumbers = parsed[side].players.map((entry) => entry.number).sort();
  const officialNumbers = lineups[side].players.map((entry) => entry.number).sort();
  assert.deepEqual(parsedNumbers, officialNumbers, `${side} starters must match one-to-one by squad number.`);
  assert.equal(new Set(parsed[side].players.map((entry) => entry.name)).size, 11);
  assert(parsed[side].players.every((entry) => entry.sourceName && entry.position));
  assert(parsed[side].players.every((entry) => entry.x >= 0 && entry.x <= 100 && entry.y >= 0 && entry.y <= 100));
}

assert.throws(
  () => parseFifaTacticalLineupDocument({
    document: fifaTacticalLineupR12549Document,
    fixture: { ...fixture, matchNumber: 101 },
    lineups
  }),
  (error) => error instanceof FifaTacticalLineupPdfError && error.code === "match_mismatch"
);

const incompleteDocument = {
  ...fifaTacticalLineupR12549Document,
  items: fifaTacticalLineupR12549Document.items.filter((item) => !(item.str === "ROGERS" && item.x === 108.5))
};
assert.throws(
  () => parseFifaTacticalLineupDocument({ document: incompleteDocument, fixture, lineups }),
  (error) => error instanceof FifaTacticalLineupPdfError && error.code === "starter_incomplete"
);

console.log("FIFA tactical line-up PDF smoke test passed.");
