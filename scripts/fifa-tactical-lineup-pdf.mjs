import { createHash } from "node:crypto";

import { assignRolesFromPitchGeometry } from "./lineup-layout-roles.mjs";
import { isPlayerNameMatch } from "./player-name-matching.mjs";

const DOCUMENT_KIND = "fifa-tactical-lineup-positioned-text-v1";
const ROW_TOLERANCE = 1.75;
const MONTH_INDEX = new Map(
  ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    .map((month, index) => [month.toLowerCase(), index])
);

export class FifaTacticalLineupPdfError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "FifaTacticalLineupPdfError";
    this.code = code;
  }
}

function reject(code, message) {
  throw new FifaTacticalLineupPdfError(code, message);
}

function cleanText(value) {
  return String(value || "")
    .replace(/\0/g, "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function comparableNameTokens(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function isFifaTacticalPlayerNameMatch(sourceName, officialName) {
  if (isPlayerNameMatch(sourceName, officialName) || isPlayerNameMatch(officialName, sourceName)) {
    return true;
  }

  const sourceTokens = comparableNameTokens(sourceName);
  const officialTokens = comparableNameTokens(officialName);
  if (!sourceTokens.length || !officialTokens.length) return false;
  if (sourceTokens.length === 1) {
    const [sourceToken] = sourceTokens;
    return sourceToken.length >= 3 && officialTokens.some((token) =>
      token === sourceToken ||
      (Math.min(token.length, sourceToken.length) >= 4 &&
        (token.startsWith(sourceToken) || sourceToken.startsWith(token)))
    );
  }
  if (sourceTokens.length !== officialTokens.length) return false;
  return sourceTokens.every((sourceToken, index) => {
    const officialToken = officialTokens[index];
    return sourceToken === officialToken ||
      (sourceToken.length === 1 && officialToken.startsWith(sourceToken)) ||
      (sourceToken.length >= 3 && officialToken.startsWith(sourceToken));
  });
}

function finiteNumber(value, owner) {
  const number = Number(value);
  if (!Number.isFinite(number)) reject("invalid_document", `${owner} must be finite.`);
  return number;
}

function normalizePdfBytes(pdfBytes) {
  if (pdfBytes instanceof Uint8Array) {
    return new Uint8Array(pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength));
  }
  if (pdfBytes instanceof ArrayBuffer) return new Uint8Array(pdfBytes.slice(0));
  reject("invalid_pdf", "FIFA tactical line-up PDF bytes must be a Uint8Array or ArrayBuffer.");
}

export async function extractFifaTacticalLineupPdf(pdfBytes) {
  const data = normalizePdfBytes(pdfBytes);
  const sha256 = createHash("sha256").update(data).digest("hex");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = getDocument({
    data,
    disableWorker: true,
    isEvalSupported: false,
    stopAtErrors: true,
    useSystemFonts: true
  });
  const pdf = await loadingTask.promise;

  try {
    if (pdf.numPages !== 1) {
      reject("invalid_document", `FIFA tactical line-up must contain exactly one page; found ${pdf.numPages}.`);
    }

    const page = await pdf.getPage(1);
    const text = await page.getTextContent();
    const [left, bottom, right, top] = page.view.map(Number);
    const width = right - left;
    const height = top - bottom;
    const items = text.items
      .filter((item) => cleanText(item?.str))
      .map((item) => ({
        str: cleanText(item.str),
        x: Number(item.transform?.[4]) - left,
        y: Number(item.transform?.[5]) - bottom,
        width: Number(item.width) || 0,
        height: Number(item.height) || 0
      }));

    return { kind: DOCUMENT_KIND, pageCount: 1, width, height, sha256, items };
  } finally {
    await pdf.destroy();
  }
}

function normalizeDocument(document) {
  if (!document || typeof document !== "object") reject("invalid_document", "Positioned document is required.");
  if (document.pageCount !== 1) reject("invalid_document", "Positioned document must contain exactly one page.");
  const width = finiteNumber(document.width, "document.width");
  const height = finiteNumber(document.height, "document.height");
  if (width <= 0 || height <= 0 || !Array.isArray(document.items)) {
    reject("invalid_document", "Positioned document dimensions and items are invalid.");
  }

  const items = document.items.map((item, index) => ({
    str: cleanText(item?.str),
    x: finiteNumber(item?.x, `document.items[${index}].x`),
    y: finiteNumber(item?.y, `document.items[${index}].y`),
    width: finiteNumber(item?.width ?? 0, `document.items[${index}].width`),
    height: finiteNumber(item?.height ?? 0, `document.items[${index}].height`)
  })).filter((item) => item.str);

  if (!items.length) reject("invalid_document", "Positioned document has no text items.");
  return { ...document, width, height, items };
}

function findSingle(items, predicate, code, description) {
  const matches = items.filter(predicate);
  if (matches.length !== 1) reject(code, `Expected one ${description}; found ${matches.length}.`);
  return matches[0];
}

function formationDigits(value) {
  const normalized = cleanText(value).replace(/\s/g, "");
  const digits = normalized.split("-").map(Number);
  if (!/^\d(?:-\d){1,4}$/.test(normalized) || digits.some((digit) => digit <= 0) || digits.reduce((sum, digit) => sum + digit, 0) !== 10) {
    reject("invalid_formation", `Unsupported FIFA tactical formation "${value}".`);
  }
  return { normalized, digits };
}

function expectedMatchNumber(fixture) {
  const value = fixture?.matchNumber ?? fixture?.providerIds?.fifa?.matchNumber;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) reject("invalid_context", "fixture.matchNumber is required.");
  return number;
}

function expectedTeamCode(fixture, side) {
  const value = fixture?.[`${side}TeamId`] ?? fixture?.[side]?.teamId ?? fixture?.[side]?.code;
  const code = cleanText(value).toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) reject("invalid_context", `fixture ${side} team code is required.`);
  return code;
}

function parsePublishedAt(versionItem) {
  const match = versionItem.str.match(
    /\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*\|\s*(\d{1,2}):(\d{2})\s+UTC\s*\|\s*Version\s+\d+\b/i
  );
  const monthIndex = MONTH_INDEX.get(String(match?.[2] || "").toLowerCase());
  if (!match || monthIndex === undefined) {
    reject("invalid_version", "FIFA tactical document footer is missing its UTC publication timestamp.");
  }
  const timestamp = Date.UTC(
    Number(match[3]),
    monthIndex,
    Number(match[1]),
    Number(match[4]),
    Number(match[5])
  );
  if (!Number.isFinite(timestamp)) {
    reject("invalid_version", "FIFA tactical document footer has an invalid UTC publication timestamp.");
  }
  return new Date(timestamp).toISOString();
}

function centerX(item) {
  return item.x + item.width / 2;
}

function groupByRow(items) {
  const rows = [];
  for (const item of [...items].sort((left, right) => right.y - left.y || centerX(left) - centerX(right))) {
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= ROW_TOLERANCE);
    if (row) {
      row.items.push(item);
      row.y = row.items.reduce((sum, entry) => sum + entry.y, 0) / row.items.length;
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }
  return rows.sort((left, right) => right.y - left.y);
}

function parseTeamHeader(items, formationLabel, sideIndex, pageWidth) {
  const sideLeft = sideIndex * pageWidth / 2;
  const sideRight = (sideIndex + 1) * pageWidth / 2;
  const candidates = items
    .filter((item) => item.y > formationLabel.y + 3 && item.y < formationLabel.y + 20)
    .filter((item) => item.x >= sideLeft && item.x < sideRight)
    .map((item) => ({ item, match: item.str.match(/^(.+?)\s*\(([A-Z]{3})\)$/) }))
    .filter(({ match }) => match)
    .sort((left, right) => Math.abs(left.item.x - formationLabel.x) - Math.abs(right.item.x - formationLabel.x));
  if (!candidates.length) reject("team_mismatch", `Could not parse FIFA team header for side ${sideIndex + 1}.`);
  return { name: cleanText(candidates[0].match[1]), code: candidates[0].match[2], item: candidates[0].item };
}

function parseFormationEntries(items, pageWidth) {
  const labels = items
    .filter((item) => /^FORMATION:?$/i.test(item.str))
    .sort((left, right) => left.x - right.x);
  if (labels.length !== 2) reject("invalid_formation", `Expected two FIFA formation labels; found ${labels.length}.`);

  return labels.map((label, sideIndex) => {
    const sideRight = (sideIndex + 1) * pageWidth / 2;
    const formationItem = findSingle(
      items,
      (item) => item.x > label.x && item.x < sideRight && Math.abs(item.y - label.y) <= 1 && /^\d(?:\s*-\s*\d){1,4}$/.test(item.str),
      "invalid_formation",
      `formation value for side ${sideIndex + 1}`
    );
    const formation = formationDigits(formationItem.str);
    return { label, item: formationItem, ...formation };
  });
}

function parseSourcePlayerName(items, numberItem, numberRow, playerIndex, sideLeft, sideRight) {
  const rowNumbers = [...numberRow.items].sort((left, right) => centerX(left) - centerX(right));
  const orderedIndex = rowNumbers.indexOf(numberItem);
  const currentX = centerX(numberItem);
  const previousX = orderedIndex > 0 ? centerX(rowNumbers[orderedIndex - 1]) : -Infinity;
  const nextX = orderedIndex < rowNumbers.length - 1 ? centerX(rowNumbers[orderedIndex + 1]) : Infinity;
  const cellLeft = Number.isFinite(previousX) ? (previousX + currentX) / 2 : sideLeft;
  const cellRight = Number.isFinite(nextX) ? (nextX + currentX) / 2 : sideRight;
  const fragments = items
    .filter((item) => numberItem.y - item.y >= 4 && numberItem.y - item.y <= 9)
    .filter((item) => centerX(item) > cellLeft && centerX(item) < cellRight)
    .sort((left, right) => left.x - right.x);
  if (!fragments.some((item) => /[A-Za-z\u00c0-\u024f]/.test(item.str))) {
    reject("starter_incomplete", `Missing FIFA source name for starter ${playerIndex + 1}.`);
  }

  const baseline = fragments[0].y;
  const sameLine = fragments.filter((item) => Math.abs(item.y - baseline) <= 0.8);
  const rawName = cleanText(sameLine.map((item) => item.str).join(" "));
  const isCaptain = /\(\s*C\s*\)/i.test(rawName);
  const name = cleanText(rawName.replace(/\(\s*C\s*\)/ig, ""));
  if (!name) reject("starter_incomplete", `Empty FIFA source name for starter ${playerIndex + 1}.`);
  return { name, isCaptain };
}

function parseSourcePlayers({ items, sideIndex, pageWidth, pageHeight, formationEntry, substitutesY }) {
  const sideLeft = sideIndex * pageWidth / 2;
  const sideRight = (sideIndex + 1) * pageWidth / 2;
  const numberItems = items
    .filter((item) => item.x >= sideLeft && item.x < sideRight)
    .filter((item) => item.y > substitutesY + 5 && item.y < formationEntry.label.y - 8)
    .filter((item) => /^\d{1,2}$/.test(item.str) && item.height >= 4);
  if (numberItems.length !== 11) {
    reject("starter_incomplete", `Expected 11 positioned FIFA starters for side ${sideIndex + 1}; found ${numberItems.length}.`);
  }

  const rows = groupByRow(numberItems);
  const expectedRows = [...formationEntry.digits].reverse();
  const observedRows = rows.slice(0, -1).map((row) => row.items.length);
  if (rows.at(-1)?.items.length !== 1 || JSON.stringify(observedRows) !== JSON.stringify(expectedRows)) {
    reject(
      "formation_mismatch",
      `FIFA ${formationEntry.normalized} pitch rows ${observedRows.join("-") || "none"} do not match expected ${expectedRows.join("-")}.`
    );
  }

  const pitchLeft = formationEntry.label.x;
  const pitchWidth = pageWidth * 0.4486;
  const pitchTop = formationEntry.label.y - pageHeight * 0.0245;
  const pitchBottom = substitutesY + pageHeight * 0.0095;
  const clamp = (value) => Math.max(0, Math.min(100, value));

  return rows.flatMap((row) => [...row.items]
    .sort((left, right) => centerX(left) - centerX(right))
    .map((numberItem, playerIndex) => {
      const sourceName = parseSourcePlayerName(items, numberItem, row, playerIndex, sideLeft, sideRight);
      return {
        number: numberItem.str,
        sourceName: sourceName.name,
        isCaptain: sourceName.isCaptain,
        x: Math.round(clamp(((centerX(numberItem) - pitchLeft) / pitchWidth) * 100)),
        y: Math.round(clamp(((pitchTop - (numberItem.y + numberItem.height / 2)) / (pitchTop - pitchBottom)) * 100))
      };
    }));
}

function matchOfficialPlayers(sourcePlayers, officialSide, owner) {
  const officialPlayers = officialSide?.players;
  if (!Array.isArray(officialPlayers) || officialPlayers.length !== 11) {
    reject("invalid_context", `${owner}.players must contain exactly 11 official starters.`);
  }

  const used = new Set();
  const matched = sourcePlayers.map((sourcePlayer) => {
    const candidates = officialPlayers
      .map((player, index) => ({ player, index }))
      .filter(({ player, index }) => !used.has(index) && cleanText(player?.number) === sourcePlayer.number);
    if (candidates.length !== 1) {
      reject("starter_mismatch", `${owner} FIFA number ${sourcePlayer.number} did not match exactly one official starter.`);
    }
    const [{ player, index }] = candidates;
    if (!isFifaTacticalPlayerNameMatch(sourcePlayer.sourceName, player.name)) {
      reject("starter_mismatch", `${owner} FIFA starter "${sourcePlayer.sourceName}" does not match official #${sourcePlayer.number} "${player.name}".`);
    }
    used.add(index);
    const { x: _x, y: _y, position: _position, sideInference: _sideInference, ...officialFacts } = player;
    return {
      ...officialFacts,
      number: sourcePlayer.number,
      name: player.name,
      sourceName: sourcePlayer.sourceName,
      ...(sourcePlayer.isCaptain || player.isCaptain ? { isCaptain: true } : {}),
      x: sourcePlayer.x,
      y: sourcePlayer.y
    };
  });
  if (used.size !== 11) reject("starter_mismatch", `${owner} did not match all 11 official starters one-to-one.`);
  return matched;
}

function parseSide({ document, items, sideIndex, formationEntry, teamHeader, expectedCode, officialSide }) {
  if (teamHeader.code !== expectedCode) {
    reject("team_mismatch", `FIFA side ${sideIndex + 1} is ${teamHeader.code}; expected ${expectedCode}.`);
  }
  const expectedFormation = cleanText(officialSide?.formation).replace(/\s/g, "");
  if (expectedFormation && expectedFormation !== formationEntry.normalized) {
    reject("formation_mismatch", `FIFA ${teamHeader.code} formation is ${formationEntry.normalized}; official lineup is ${expectedFormation}.`);
  }
  const substitutes = items
    .filter((item) => /^SUBSTITUTES$/i.test(item.str) && item.x >= sideIndex * document.width / 2 && item.x < (sideIndex + 1) * document.width / 2)
    .sort((left, right) => right.y - left.y)[0];
  if (!substitutes) reject("starter_incomplete", `FIFA ${teamHeader.code} substitutes boundary was not found.`);

  const sourcePlayers = parseSourcePlayers({
    items,
    sideIndex,
    pageWidth: document.width,
    pageHeight: document.height,
    formationEntry,
    substitutesY: substitutes.y
  });
  const matchedPlayers = matchOfficialPlayers(sourcePlayers, officialSide, `lineups.${sideIndex === 0 ? "home" : "away"}`);
  const players = assignRolesFromPitchGeometry(formationEntry.normalized, matchedPlayers);

  if (players.some((player) => !player.position || !Number.isFinite(player.x) || !Number.isFinite(player.y))) {
    reject("invalid_geometry", `FIFA ${teamHeader.code} did not produce complete tactical geometry.`);
  }
  return { teamName: teamHeader.name, teamCode: teamHeader.code, formation: formationEntry.normalized, players };
}

export function parseFifaTacticalLineupDocument({ document: inputDocument, fixture, lineups }) {
  const document = normalizeDocument(inputDocument);
  const { items } = document;
  if (!items.some((item) => /^TACTICAL LINE-?UP$/i.test(item.str))) {
    reject("not_tactical_lineup", "PDF is not a FIFA Tactical Line-up document.");
  }

  const matchItem = findSingle(items, (item) => /^#\d+\s*\|/.test(item.str), "match_mismatch", "FIFA match header");
  const matchNumber = Number(matchItem.str.match(/^#(\d+)/)?.[1]);
  const wantedMatchNumber = expectedMatchNumber(fixture);
  if (matchNumber !== wantedMatchNumber) {
    reject("match_mismatch", `FIFA tactical document is match ${matchNumber}; expected ${wantedMatchNumber}.`);
  }

  const versionItem = findSingle(items, (item) => /\bVersion\s+\d+\b/i.test(item.str), "invalid_version", "FIFA document version");
  const version = Number(versionItem.str.match(/\bVersion\s+(\d+)\b/i)?.[1]);
  if (!Number.isInteger(version) || version <= 0) reject("invalid_version", `Invalid FIFA tactical document version "${version}".`);
  const publishedAt = parsePublishedAt(versionItem);
  const expectedVersion = Number(fixture?.tacticalLineupVersion || 0);
  if (expectedVersion && version !== expectedVersion) {
    reject("invalid_version", `FIFA tactical document version is ${version}; expected ${expectedVersion}.`);
  }

  const formations = parseFormationEntries(items, document.width);
  const headers = formations.map((formation, sideIndex) => parseTeamHeader(items, formation.label, sideIndex, document.width));
  const home = parseSide({
    document,
    items,
    sideIndex: 0,
    formationEntry: formations[0],
    teamHeader: headers[0],
    expectedCode: expectedTeamCode(fixture, "home"),
    officialSide: lineups?.home
  });
  const away = parseSide({
    document,
    items,
    sideIndex: 1,
    formationEntry: formations[1],
    teamHeader: headers[1],
    expectedCode: expectedTeamCode(fixture, "away"),
    officialSide: lineups?.away
  });

  if (home.players.length !== 11 || away.players.length !== 11) {
    reject("starter_incomplete", "FIFA tactical document must resolve all 22 starters.");
  }
  return {
    matchNumber,
    version,
    publishedAt,
    sourceUrl: cleanText(document.sourceUrl),
    sha256: cleanText(document.sha256).toLowerCase(),
    home,
    away
  };
}
