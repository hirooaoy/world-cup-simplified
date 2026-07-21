import assert from "node:assert/strict";
import fs from "node:fs";
import {
  HISTORICAL_HIGHLIGHTS,
  HISTORICAL_NEXT_WORLD_CUP_PREVIEWS
} from "../data/highlights-history.js";

const readJson = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
const history = readJson("../data/history.json");
const awards = readJson("../data/world-cup-awards.json");
const expectedYears = history.tournaments.map(({ year }) => year);
const editorialYears = Object.keys(HISTORICAL_HIGHLIGHTS.editions).map(Number);
const previewYears = Object.keys(HISTORICAL_NEXT_WORLD_CUP_PREVIEWS).map(Number);
const sourceIds = new Set(awards.sources.map(({ id }) => id));
const validPositions = new Set(["GK", "RB", "CB", "LB", "DM", "CM", "RCM", "LCM", "RW", "AM", "LW", "ST"]);
const validQualificationModes = new Set(["host_must_qualify", "replacement_host", "hosts_and_holders", "hosts_only"]);

assert.deepEqual(editorialYears, expectedYears, "Editorial coverage must match every history.json edition in order.");
assert.deepEqual(previewYears, expectedYears, "Next-World-Cup previews must match every historical edition in order.");
assert.equal(HISTORICAL_HIGHLIGHTS.schemaVersion, 1);
assert.ok(HISTORICAL_HIGHLIGHTS.methodology.length >= 180, "Methodology must explain the editorial selection lens.");

for (const [yearIndex, year] of expectedYears.entries()) {
  const tournament = history.tournaments.find((item) => item.year === year);
  const edition = HISTORICAL_HIGHLIGHTS.editions[year];
  const preview = HISTORICAL_NEXT_WORLD_CUP_PREVIEWS[year];
  const expectedNextYear = expectedYears[yearIndex + 1] || 2026;
  const starters = edition.rows.flat();
  const honourables = starters.flatMap((entry) => entry.honourables || []);
  const teamNames = new Set(tournament.teams);
  const starterNames = starters.map(({ playerName }) => playerName);

  assert.equal(starters.length, 11, `${year}: expected 11 starters.`);
  assert.equal(new Set(starterNames).size, 11, `${year}: starter names must be unique.`);
  assert.equal(honourables.length, 11, `${year}: every slot needs one visible honourable mention.`);
  assert.equal(edition.highlights.length, 3, `${year}: expected exactly three defining stories.`);
  assert.ok(edition.formation, `${year}: missing formation.`);
  assert.deepEqual(
    edition.formation.split("-").map(Number),
    edition.rows.slice(1).map((row) => row.length),
    `${year}: formation label does not match the rendered rows.`
  );
  assert.ok(edition.coach?.name && edition.coach?.teamName, `${year}: missing coach.`);
  assert.ok(edition.coach.reason?.en?.length >= 100, `${year}: coach reasoning is too shallow.`);
  assert.ok(edition.intro.length >= 150, `${year}: champion summary is too shallow.`);
  assert.ok(teamNames.has(edition.champion), `${year}: champion did not participate.`);
  assert.ok(teamNames.has(edition.coach.teamName), `${year}: coach team did not participate.`);

  assert.equal(preview.nextYear, expectedNextYear, `${year}: preview must point to the next World Cup.`);
  assert.ok(preview.hosts.length >= 1, `${year}: preview must name at least one host.`);
  assert.ok(validQualificationModes.has(preview.qualificationMode), `${year}: unsupported qualification mode.`);
  assert.match(preview.drawDate, /^\d{4}-\d{2}-\d{2}$/, `${year}: invalid final-draw date.`);
  assert.ok(preview.drawLocation, `${year}: missing final-draw location.`);
  assert.ok(preview.sources.length >= 1, `${year}: preview must include research sources.`);
  for (const sourceUrl of preview.sources) {
    assert.match(sourceUrl, /^https:\/\//, `${year}: preview source must be an HTTPS URL.`);
  }
  for (const textKey of ["lead", "firstTitle", "firstBody", "drawTitle", "drawBody", "openingBody"]) {
    assert.ok(preview[textKey]?.length >= (textKey.endsWith("Title") ? 8 : 25), `${year}: preview ${textKey} is too thin.`);
  }
  if (preview.firstDate) {
    assert.match(preview.firstDate, /^\d{4}-\d{2}-\d{2}$/, `${year}: invalid first-milestone date.`);
    assert.ok(preview.firstDate <= preview.drawDate, `${year}: first milestone must not follow the draw.`);
  }
  assert.ok(preview.drawDate < (preview.startDate || "9999-12-31"), `${year}: draw must precede the tournament start.`);
  if (preview.qualificationMode !== "host_must_qualify") {
    const expectedHolderName = year === 1990 ? "Germany" : edition.champion;
    assert.equal(preview.holder, expectedHolderName, `${year}: defending champion must match the completed edition's winner.`);
  }
  if (preview.nextYear === 2026) {
    assert.match(preview.startDate, /^\d{4}-\d{2}-\d{2}$/, `${year}: 2026 preview needs an opening date.`);
    assert.ok(preview.opening?.home && preview.opening?.away && preview.opening?.venue, `${year}: 2026 preview needs the opening fixture and venue.`);
  } else {
    const nextTournament = history.tournaments.find(({ year: tournamentYear }) => tournamentYear === preview.nextYear);
    const openingFixture = history.fixtures.find(({ id }) => id === preview.openingFixtureId);
    assert.ok(nextTournament, `${year}: next tournament ${preview.nextYear} is missing from history.json.`);
    assert.ok(openingFixture, `${year}: unknown opening fixture ${preview.openingFixtureId}.`);
    assert.equal(openingFixture.tournamentYear, preview.nextYear, `${year}: opening fixture belongs to the wrong edition.`);
    assert.equal(openingFixture.date, nextTournament.startDate, `${year}: opening fixture must fall on the tournament start date.`);
    for (const host of preview.hosts) {
      const historyHostName = host === "United States" ? "USA" : host;
      assert.ok(nextTournament.teams.includes(historyHostName), `${year}: host ${host} did not participate in ${preview.nextYear}.`);
    }
    assert.ok(preview.drawDate < openingFixture.date, `${year}: draw must precede the opening fixture.`);
  }

  for (const entry of [...starters, ...honourables]) {
    assert.ok(entry.playerName, `${year}: unnamed Best XI entry.`);
    assert.ok(teamNames.has(entry.teamName), `${year}: ${entry.playerName}'s team ${entry.teamName} did not participate.`);
    assert.ok(validPositions.has(entry.position), `${year}: ${entry.playerName} has unsupported position ${entry.position}.`);
  }
  for (const entry of starters) {
    assert.ok(entry.reason?.en?.length >= 100, `${year}: ${entry.playerName}'s reasoning is too shallow.`);
    assert.notEqual(entry.playerName, entry.honourables?.[0]?.playerName, `${year}: starter duplicated as his own honourable mention.`);
  }
  for (const story of edition.highlights) {
    assert.ok(story.title.length >= 18 && story.body.length >= 100, `${year}: highlight copy is too thin.`);
    if (story.matchId) {
      const match = history.fixtures.find(({ id }) => id === story.matchId);
      assert.ok(match, `${year}: unknown highlight fixture ${story.matchId}.`);
      assert.equal(match.tournamentYear, year, `${year}: highlight fixture belongs to another edition.`);
    }
  }
  const linkedOfficialHighlights = edition.highlights
    .map((story) => history.fixtures.find(({ id }) => id === story.matchId))
    .filter((match) => match?.highlightVideo?.sourceName === "FIFA");
  assert.ok(linkedOfficialHighlights.length >= 1, `${year}: missing a linked official FIFA video.`);

  const editionAwards = awards.editions[String(year)];
  assert.ok(editionAwards?.goldenBoot, `${year}: missing leading-scorer record.`);
  assert.equal(Boolean(editionAwards.goldenBall), year >= 1978, `${year}: Golden Ball applicability mismatch.`);
  assert.equal(Boolean(editionAwards.fairPlay), year >= 1970, `${year}: Fair Play applicability mismatch.`);
  assert.equal(Boolean(editionAwards.goldenGlove), year >= 1994, `${year}: Golden Glove applicability mismatch.`);
  assert.equal(Boolean(editionAwards.youngPlayer), year >= 2006, `${year}: Young Player applicability mismatch.`);
  for (const award of Object.values(editionAwards)) {
    assert.ok(sourceIds.has(award.sourceId), `${year}: unknown award source ${award.sourceId}.`);
    assert.ok(award.recipients?.length, `${year}: award has no recipients.`);
    for (const recipient of award.recipients) {
      assert.ok(teamNames.has(recipient.teamName), `${year}: award recipient team ${recipient.teamName} did not participate.`);
    }
  }
}

console.log(`Historical highlights audit passed: ${editorialYears.length} editions, ${previewYears.length} next-tournament previews, ${editorialYears.length * 11} starters, ${editorialYears.length * 11} honourable mentions, and ${editorialYears.length * 3} stories.`);
