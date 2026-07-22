#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"]
]);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const historicalPlayerIndex = JSON.parse(
  await readFile(path.join(root, "data", "ball-boy-historical-players.json"), "utf8")
);

function getHistoricalPersonYearGroups(displayName, teamName) {
  return (historicalPlayerIndex.players || [])
    .filter((player) => player.displayName === displayName && player.teamName === teamName)
    .map((player) => [...(player.tournamentYears || [])].sort((left, right) => left - right))
    .sort((left, right) => left[0] - right[0]);
}

function assertHistoricalPersonYearGroups(displayName, teamName, expected) {
  const actual = getHistoricalPersonYearGroups(displayName, teamName);
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${displayName} (${teamName}) historical person grouping should be ${JSON.stringify(expected)}; measured ${JSON.stringify(actual)}.`
  );
}

// Portrait provenance changes between these editions; both must remain one person.
assertHistoricalPersonYearGroups("Luis Suárez", "Uruguay", [[2010, 2014, 2018]]);
assertHistoricalPersonYearGroups("Neymar", "Brazil", [[2014, 2018, 2022]]);

// Exact-name/team collisions are separate people and must not be merged by the fallback.
assertHistoricalPersonYearGroups("Ali Karimi", "Iran", [[2006], [2022]]);
assertHistoricalPersonYearGroups("Andoni Goikoetxea", "Spain", [[1986], [1994]]);
assertHistoricalPersonYearGroups("Juanito", "Spain", [[1982], [2006]]);
assertHistoricalPersonYearGroups("József Tóth", "Hungary", [[1954], [1982]]);
assertHistoricalPersonYearGroups("Júlio César", "Brazil", [[1986], [2010, 2014]]);
assertHistoricalPersonYearGroups("Júnior", "Brazil", [[1982], [2002]]);
assertHistoricalPersonYearGroups("Oscar", "Brazil", [[1982], [2014]]);

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const resolved = path.resolve(root, decoded === "/" ? "index.html" : `.${decoded}`);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    return null;
  }
  return resolved;
}

const server = createServer(async (request, response) => {
  const filePath = safePath(request.url || "/");
  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error("Not a file");
    }
    response.writeHead(200, {
      "Content-Length": fileStat.size,
      "Content-Type": mimeTypes.get(path.extname(filePath)) || "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const requestedPaths = [];
  page.on("request", (request) => {
    requestedPaths.push(new URL(request.url()).pathname);
  });
  await page.goto(`${baseUrl}?ballBoyPlayerSearchSmoke=1&date=2026-06-20`, { waitUntil: "load" });
  await page.locator("#scout-launcher").click();
  const input = page.locator("#scout-input");
  const send = page.locator(".scout-send");

  await input.fill("messi");
  await send.click();
  const messiAnswer = page.locator(".scout-answer.is-player").last();
  await messiAnswer.getByRole("heading", { name: "Lionel Messi" }).waitFor({ state: "visible" });
  assert(
    (await messiAnswer.locator(".scout-answer-lead").textContent())?.trim() ===
      "Here’s more about Lionel Messi.",
    "A shorthand player search should introduce the player before rendering the card."
  );

  await page.locator("#scout-reset").click();
  await input.fill("who is raul");
  await send.click();
  const clarification = page.locator(".scout-answer.is-clarify").last();
  await clarification.waitFor({ state: "visible" });
  const clarificationMetrics = await clarification.evaluate((answer) => ({
    groupLabels: [...answer.querySelectorAll(".scout-clarify-group > .scout-section-label")]
      .map((label) => label.textContent.trim()),
    followUps: answer.querySelectorAll(".scout-followup").length,
    lead: answer.querySelector(".scout-answer-lead")?.textContent.trim() || "",
    options: [...answer.querySelectorAll(".scout-clarify-list button")]
      .map((button) => button.textContent.replace(/\s+/g, " ").trim()),
    overflow: answer.scrollWidth - answer.clientWidth
  }));
  assert(
    clarificationMetrics.lead === "Do you mean:" &&
      clarificationMetrics.groupLabels.join("|") === "Current World Cup|Past World Cups" &&
      clarificationMetrics.followUps === 0 &&
      clarificationMetrics.options.length === 6 &&
      clarificationMetrics.options.some((text) =>
        text.includes("Raúl Jiménez") &&
        text.includes("Mexico · Striker • 2026")
      ) &&
      clarificationMetrics.options.some((text) =>
        text.includes("Raúl Rangel") &&
        text.includes("Mexico · Goalkeeper • 2026")
      ) &&
      clarificationMetrics.options.some((text) =>
        text.includes("Raúl") &&
        text.includes("Spain · Forward • 1998, 2002, 2006")
      ) &&
      clarificationMetrics.options.some((text) =>
        text.includes("Raul Meireles") &&
        text.includes("Portugal · Position unavailable • 2010")
      ) &&
      requestedPaths.includes("/data/ball-boy-historical-players.json") &&
      !requestedPaths.includes("/data/historical-player-profiles.json") &&
      clarificationMetrics.overflow <= 1,
    `Raul clarification should include current and historical players with position and year metadata. Measured ${JSON.stringify(clarificationMetrics)}.`
  );

  await clarification.locator("button", { hasText: "Spain · Forward" }).click();
  const historicalCard = page.locator(".scout-player-card.is-historical").last();
  await historicalCard.waitFor({ state: "visible" });
  assert(
    requestedPaths.includes("/data/historical-player-profiles.json"),
    "The full historical profile dataset should load only after a historical player is selected."
  );
  const historicalMetrics = await historicalCard.evaluate((card) => ({
    factValues: [...card.querySelectorAll(".scout-player-fact-row > div")]
      .map((fact) => ({
        label: fact.querySelector("span")?.textContent.trim() || "",
        value: fact.querySelector("strong")?.textContent.trim() || ""
      })),
    header: card.querySelector(".scout-entity-header")?.textContent.replace(/\s+/g, " ").trim() || "",
    hasPlayerDetails: Boolean(card.querySelector('[aria-label="Player details"]')),
    lead: card.closest(".scout-answer")?.querySelector(".scout-answer-lead")?.textContent.trim() || "",
    watchPoints: [...card.querySelectorAll(".scout-player-watch-points li")]
      .map((point) => point.textContent.trim()),
    worldCupContext: card.querySelector(".scout-player-world-cup-context")?.textContent.trim() || ""
  }));
  assert(
    historicalMetrics.lead === "Here’s more about Raúl." &&
      historicalMetrics.header.includes("Raúl") &&
      historicalMetrics.header.includes("Spain · Forward • 1998, 2002, 2006") &&
      historicalMetrics.header.includes("Real Madrid") &&
      historicalMetrics.worldCupContext === "At the 1998, 2002, and 2006 World Cups" &&
      JSON.stringify(historicalMetrics.watchPoints) === JSON.stringify([
        "Raúl stands out for attacking the space behind defenders before it fully opens.",
        "He arrives on the move and gets his finish away before the nearest marker recovers.",
        "He uses his body to protect the ball and brings a teammate into the move."
      ]) &&
      historicalMetrics.factValues.some((fact) => fact.label === "Goals" && fact.value === "5") &&
      historicalMetrics.factValues.some((fact) => fact.label === "World Cups" && fact.value === "3") &&
      !historicalMetrics.hasPlayerDetails,
    `Selecting historical Raúl should open a grouped archive player card. Measured ${JSON.stringify(historicalMetrics)}.`
  );

  await page.locator(".scout-followup", { hasText: "How many World Cup goals did Raúl score?" }).last().click();
  await page.waitForFunction(() => {
    const answers = [...document.querySelectorAll(".scout-answer.is-player")];
    return answers.length >= 2 && answers.at(-1)?.querySelector(".scout-answer-lead")
      ?.textContent.includes("5 goals");
  });

  await page.locator("#scout-reset").click();
  await input.fill("Who is Raul from Spain in 2002?");
  await send.click();
  const singleEditionCard = page.locator(".scout-player-card.is-historical").last();
  await singleEditionCard.waitFor({ state: "visible" });
  const singleEditionMetrics = await singleEditionCard.evaluate((card) => ({
    facts: [...card.querySelectorAll(".scout-player-fact-row > div")].map((fact) => ({
      label: fact.querySelector("span")?.textContent.trim() || "",
      value: fact.querySelector("strong")?.textContent.trim() || ""
    })),
    header: card.querySelector(".scout-entity-header")?.textContent.replace(/\s+/g, " ").trim() || "",
    worldCupContext: card.querySelector(".scout-player-world-cup-context")?.textContent.trim() || ""
  }));
  assert(
    singleEditionMetrics.header.includes("Spain · Forward • 2002") &&
      singleEditionMetrics.header.includes("Real Madrid") &&
      singleEditionMetrics.worldCupContext === "At the 2002 World Cup" &&
      singleEditionMetrics.facts.some((fact) => fact.label === "Goals" && fact.value === "3") &&
      singleEditionMetrics.facts.some((fact) => fact.label === "World Cups" && fact.value === "1"),
    `A year-qualified historical search should narrow to that tournament edition. Measured ${JSON.stringify(singleEditionMetrics)}.`
  );

  await input.fill("Which club did he play for?");
  await send.click();
  await page
    .getByText("At the 2002 World Cup, Raúl played for Real Madrid.", { exact: true })
    .waitFor({ state: "visible" });

  await page.locator("#scout-reset").click();
  await input.fill("who is raul jimene");
  await send.click();
  const partialCurrentCard = page.locator(".scout-player-card:not(.is-historical)").last();
  await partialCurrentCard.waitFor({ state: "visible" });
  assert(
    (await partialCurrentCard.innerText()).includes("Raúl Jiménez") &&
      (await partialCurrentCard.locator(".scout-player-world-cup-context").textContent())?.trim() ===
        "At the 2026 World Cup",
    "A bounded partial full-name search should resolve the current player with 2026 context."
  );

  await page.locator("#scout-reset").click();
  await input.fill("Who is Fernando Torres?");
  await send.click();
  const multiClubCard = page.locator(".scout-player-card.is-historical").last();
  await multiClubCard.waitFor({ state: "visible" });
  const multiClubMetrics = await multiClubCard.evaluate((card) => ({
    clubLine: card.querySelector(".scout-entity-copy small:not(.scout-player-world-cup-context)")
      ?.textContent.trim() || "",
    overflow: card.scrollWidth - card.clientWidth,
    worldCupContext: card.querySelector(".scout-player-world-cup-context")?.textContent.trim() || ""
  }));
  assert(
    multiClubMetrics.clubLine === "Atlético Madrid (2006) · Liverpool (2010) · Chelsea (2014)" &&
      multiClubMetrics.worldCupContext === "At the 2006, 2010, and 2014 World Cups" &&
      multiClubMetrics.overflow <= 1,
    `A grouped historical card should preserve its edition-to-club mapping. Measured ${JSON.stringify(multiClubMetrics)}.`
  );

  const localizedHistoricalNotes = await page.evaluate(async () => {
    const knowledge = await import("./chatbot-knowledge.js?ball-boy-historical-note-smoke=1");
    const cases = [
      {
        key: "es-generated",
        locale: "es",
        question: "Who is historical José Leandro Andrade?"
      },
      {
        key: "es-authored",
        locale: "es",
        question: "Who is historical Guillermo Stábile?"
      },
      {
        key: "ko-generated",
        locale: "ko",
        question: "Who is historical José Leandro Andrade?"
      },
      {
        key: "ko-authored",
        locale: "ko",
        question: "Who is historical Guillermo Stábile?"
      }
    ];
    const results = {};
    for (const testCase of cases) {
      knowledge.resetBallBoyContext();
      const reply = await knowledge.getBallBoyReply(testCase.question, {
        locale: testCase.locale
      });
      results[testCase.key] = {
        focus: reply?.focus || "",
        historical: Boolean(reply?.historical),
        kind: reply?.kind || "",
        name: reply?.profile?.displayName || "",
        note: reply?.profile?.note || ""
      };
    }
    return results;
  });
  const expectedLocalizedHistoricalNotes = {
    "es-generated": {
      name: "José Leandro Andrade",
      note: "Andrade destaca por marcar el ritmo del partido desde el mediocampo. Se mueve después de pasar para que el equipo conserve una salida cercana. Recibe de perfil para que el siguiente pase pueda avanzar."
    },
    "es-authored": {
      name: "Guillermo Stábile",
      note: "Stábile juega como un delantero centro vertical que ataca el espacio antes de que la defensa se acomode. Se mantiene preparado entre los centrales y remata el último pase con muy pocos toques."
    },
    "ko-generated": {
      name: "호세 레안드로 안드라데",
      note: "호세 레안드로 안드라데의 돋보이는 강점은 중원에서 경기 속도를 조율하는 능력이다. 패스한 뒤에도 움직여 팀이 가까운 출구를 유지하게 한다. 옆을 향한 자세로 받아 다음 패스를 전진 방향으로 연결한다."
    },
    "ko-authored": {
      name: "기예르모 스타빌레",
      note: "스타빌레는 수비가 자리 잡기 전에 공간을 공략하는 직선적인 중앙 공격수다. 센터백 사이에서 준비한 뒤 불필요한 터치를 줄여 마지막 패스를 슈팅으로 연결한다."
    }
  };
  for (const [key, expected] of Object.entries(expectedLocalizedHistoricalNotes)) {
    const measured = localizedHistoricalNotes[key];
    assert(
      measured?.kind === "player" &&
        measured.historical &&
        measured.focus === "overview" &&
        measured.name === expected.name &&
        measured.note === expected.note,
      `${key}: Ball Boy should preserve the full historical player description. Measured ${JSON.stringify(measured)}.`
    );
  }

  console.log("Ball Boy player search smoke passed.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
