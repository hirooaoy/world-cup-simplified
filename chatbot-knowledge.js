const BALL_BOY_DATA_VERSION = "2026-07-08-coach-lineup-zh";
const BALL_BOY_DATA_URLS = {
  fixtures: `data/fixtures.json?v=${BALL_BOY_DATA_VERSION}`,
  liveData: `api/live-data?v=${BALL_BOY_DATA_VERSION}`,
  playerProfiles: `data/player-profiles.json?v=${BALL_BOY_DATA_VERSION}`,
  standings: `data/standings.json?v=${BALL_BOY_DATA_VERSION}`,
  teams: `data/teams.json?v=${BALL_BOY_DATA_VERSION}`
};

const COMPLETED_MATCH_STATUSES = new Set(["FT", "AET", "PEN"]);
const COUNTABLE_PLAYER_STATUSES = new Set(["LIVE", "FT", "AET", "PEN"]);
const EXTRA_TEAM_ALIASES = {
  BIH: ["bosnia"],
  CIV: ["ivory coast", "cote d ivoire"],
  COD: ["drc", "congo", "congo dr", "democratic republic of congo"],
  CPV: ["cape verde"],
  CZE: ["czech republic"],
  CUW: ["curacao"],
  IRN: ["iran"],
  KOR: ["korea", "korea republic"],
  NED: ["holland"],
  TUR: ["turkey"],
  USA: ["usa", "u s a", "united states of america"]
};
const STAGE_LABELS = {
  "group": "Group stage",
  "round-of-32": "Round of 32",
  "round-of-16": "Round of 16",
  "quarter-finals": "Quarter-final",
  "semi-finals": "Semi-final",
  "bronze-final": "Third-place match",
  "final": "Final"
};

const RULE_CATALOG = [
  {
    id: "shootout",
    keywords: ["penalty shootout", "penalty shootouts", "shootout", "shoot out", "penalties"],
    title: "Penalty shootout",
    lead: "If a knockout match is still level after extra time, teams take alternating penalties to decide who advances.",
    flow: [
      { value: "120′", label: "Still level" },
      { value: "⚽", label: "5 each" },
      { value: "1×1", label: "Sudden death" }
    ],
    points: [
      { title: "First five", text: "Each team starts with five kicks, taken by different players." },
      { title: "Still tied?", text: "They continue one kick each until one scores and the other misses." }
    ],
    takeaway: "A calm walk from halfway. Then one very loud kick.",
    sourceUrl: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/"
  },
  {
    id: "red-card",
    keywords: ["red card", "redcard", "sent off", "sending off"],
    title: "Red card",
    lead: "A red card sends a player off. They cannot return, and their team cannot replace them.",
    flow: [
      { value: "11", label: "Players" },
      { value: "🟥", label: "Sent off" },
      { value: "10", label: "Left" }
    ],
    points: [
      { title: "Straight red", text: "One serious offence can mean an immediate red card." },
      { title: "Two yellows", text: "A second yellow in the same match also sends the player off." }
    ],
    takeaway: "One fewer teammate. Same giant pitch. Bad mathematics.",
    sourceUrl: "https://www.theifab.com/laws/latest/fouls-and-misconduct/"
  },
  {
    id: "yellow-card",
    keywords: ["yellow card", "yellowcard", "booking", "booked"],
    title: "Yellow card",
    lead: "A yellow card is an official warning for a player or team official.",
    flow: [
      { value: "Foul", label: "Reckless act" },
      { value: "🟨", label: "Warning" },
      { value: "🟨🟨", label: "Then red" }
    ],
    points: [
      { title: "Why it happens", text: "Common reasons include reckless fouls, delaying play, dissent, or repeated offences." },
      { title: "Second yellow", text: "Two yellows in one match become a red card, so the player is sent off." }
    ],
    takeaway: "First warning: calm down. Second warning: shower time.",
    sourceUrl: "https://www.theifab.com/laws/latest/fouls-and-misconduct/"
  },
  {
    id: "handball",
    keywords: ["handball", "hand ball", "ball hits hand", "ball hit hand"],
    title: "Handball",
    lead: "Not every touch of the hand or arm is a foul. The action and arm position matter.",
    flow: [
      { value: "⚽", label: "Ball arrives" },
      { value: "💪", label: "Arm action" },
      { value: "📣", label: "Ref decides" }
    ],
    points: [
      { title: "Usually an offence", text: "The player deliberately handles it or makes their body unnaturally bigger with the arm." },
      { title: "Not automatic", text: "A close-range accidental touch with a natural arm position may be allowed." }
    ],
    takeaway: "Ball to hand is a clue. It is not the whole detective story.",
    sourceUrl: "https://www.theifab.com/laws/latest/fouls-and-misconduct/"
  },
  {
    id: "penalty-kick",
    keywords: ["penalty kick", "penalty spot", "penalty", "spot kick"],
    title: "Penalty kick",
    lead: "A direct-free-kick offence by the defending team inside its own penalty area usually gives the attackers a penalty kick.",
    flow: [
      { value: "Foul", label: "Inside box" },
      { value: "11m", label: "Penalty spot" },
      { value: "1v1", label: "Taker vs keeper" }
    ],
    points: [
      { title: "The setup", text: "The ball goes on the spot. The goalkeeper stays on the goal line until the kick is taken." },
      { title: "Everyone else", text: "Other players wait outside the penalty area and behind the ball." }
    ],
    takeaway: "One ball. One goalkeeper. Suddenly everyone remembers breathing.",
    sourceUrl: "https://www.theifab.com/laws/latest/the-penalty-kick/"
  },
  {
    id: "var",
    keywords: ["var", "video assistant", "video review"],
    title: "VAR",
    lead: "VAR helps the referee review a small set of major, match-changing decisions.",
    flow: [
      { value: "👀", label: "Incident" },
      { value: "🎥", label: "Check" },
      { value: "📣", label: "Decision" }
    ],
    points: [
      { title: "What it checks", text: "Goals, penalty decisions, direct red cards, and mistaken identity." },
      { title: "Who decides", text: "The on-field referee keeps the final decision, sometimes after watching the monitor." }
    ],
    takeaway: "Technology advises. The referee still owns the whistle.",
    sourceUrl: "https://www.theifab.com/laws/latest/video-assistant-referee-var-protocol/"
  },
  {
    id: "extra-time",
    keywords: ["extra time", "overtime", "added extra time"],
    title: "Extra time",
    lead: "In some knockout matches, a draw after 90 minutes leads to another 30 minutes of football.",
    flow: [
      { value: "90′", label: "Level" },
      { value: "+15′", label: "First half" },
      { value: "+15′", label: "Second half" }
    ],
    points: [
      { title: "It is not stoppage time", text: "Extra time is two new 15-minute periods. Stoppage time is added within a period." },
      { title: "Still level?", text: "If the competition requires a winner, a penalty shootout usually follows." }
    ],
    takeaway: "The legs say no. The tournament says thirty more minutes.",
    sourceUrl: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/"
  },
  {
    id: "group-points",
    keywords: ["group points", "points system", "three points", "goal difference", "standings work"],
    title: "Group points",
    lead: "Group tables reward results: three points for a win, one for a draw, and none for a loss.",
    flow: [
      { value: "+3", label: "Win" },
      { value: "+1", label: "Draw" },
      { value: "+0", label: "Loss" }
    ],
    points: [
      { title: "Goal difference", text: "Goals scored minus goals allowed. It is a common tiebreaker when points are level." },
      { title: "Then what?", text: "Competitions use a published tiebreak order if teams are still level." }
    ],
    takeaway: "Win matches and the calculator gets much less dramatic.",
    sourceUrl: ""
  },
  {
    id: "substitution",
    keywords: ["substitution", "substitute", "substitutions", "subbed off", "subbed on"],
    title: "Substitution",
    lead: "A substitution replaces one player with another during the match.",
    flow: [
      { value: "↓", label: "Player off" },
      { value: "↔", label: "Change" },
      { value: "↑", label: "Player on" }
    ],
    points: [
      { title: "Why managers do it", text: "Fresh legs, an injury, a tactical change, or a different type of player." },
      { title: "Can they return?", text: "In top-level World Cup football, a substituted player cannot come back into that match." }
    ],
    takeaway: "Same team. New problem for the opponent.",
    sourceUrl: "https://www.theifab.com/laws/latest/the-players/"
  }
];

const BALL_BOY_PERSONALITY_REPLIES = [
  {
    id: "identity",
    patterns: [
      /^(?:who|what) are you(?: really)?$/,
      /^who r u$/,
      /^(?:are you )?just (?:a )?ball boy$/,
      /^(?:tell me about|introduce) yourself$/
    ],
    label: "Off duty",
    text: "Me? Just Ball Boy. I collect footballs, explain the game, and am definitely not a very tall Norwegian striker spending his day off here. Nothing suspicious.",
    badge: "Definitely just Ball Boy",
    eye: "side-glance",
    followUps: ["What can I ask?", "Are you Haaland?", "How do Norway play?"]
  },
  {
    id: "life",
    patterns: [
      /^(?:what is|what s|whats) life$/,
      /^(?:what is|what s|whats) the meaning of life$/,
      /^why are we here$/
    ],
    label: "Philosophy",
    text: "Life is simple: eat, sleep, score—sorry, return the footballs—and look after your teammates. The rest is tactics.",
    badge: "Simple philosophy",
    eye: "double-blink",
    followUps: ["What is football?", "Tell me about Haaland", "How do Norway play?"]
  },
  {
    id: "football",
    patterns: [
      /^(?:what is|what s|whats) football$/,
      /^define football$/,
      /^why is football special$/
    ],
    label: "Football",
    text: "Football is two teams, one ball, and 90 minutes of trying to put it in the correct net. Simple idea. Beautifully difficult. Best sport in the world, obviously.",
    badge: "Best sport. Obviously.",
    eye: "wide",
    followUps: ["Explain offside", "Explain a red card", "Who should I watch?"]
  },
  {
    id: "reality",
    patterns: [
      /^(?:are you|are u|r u) real$/,
      /^are you (?:a )?(?:real person|bot|chatbot|ai)$/,
      /^do you (?:really )?exist$/
    ],
    label: "Reality check",
    text: "Technically, I am a chatbot. Officially, Ball Boy. Unofficially, no comment. I am real enough to explain offside, which is what matters.",
    badge: "Real enough",
    eye: "double-blink",
    followUps: ["Are you Haaland?", "What can I ask?", "Explain offside"]
  },
  {
    id: "soccer",
    patterns: [
      /^(?:what is|what s|whats) soccer$/,
      /^soccer$/,
      /^is it soccer or football$/,
      /^why (?:do )?(?:people|americans) (?:say|call it) soccer$/
    ],
    label: "Terminology",
    text: "“Soccer” is an old nickname for association football. Technically valid. Still, “football” was right there. I forgive the word. Barely.",
    badge: "Terminology reviewed",
    eye: "wince",
    followUps: ["What is football?", "Explain offside", "Explain a red card"]
  },
  {
    id: "best-player",
    patterns: [
      /^(?:who is|who s|whos) (?:the )?(?:best|goat)$/,
      /^(?:who is|who s|whos) (?:the )?best (?:player|footballer)(?: in the world| right now| in football)?$/,
      /^(?:the )?(?:best (?:player|footballer)|goat)$/
    ],
    label: "Expert verdict",
    text: "Haaland. I consulted a completely neutral panel of one Norwegian ball boy. It was unanimous.",
    badge: "Unanimous decision",
    eye: "happy",
    contextPlayerName: "Erling Haaland",
    contextTeamId: "NOR",
    followUps: ["Tell me about Haaland", "How many goals does Haaland have?", "How do Norway play?"]
  },
  {
    id: "best-country",
    patterns: [
      /^(?:which|what) (?:country|national team) is (?:the )?best(?: in football| at football| in the world)?$/,
      /^(?:the )?best (?:country|national team)$/
    ],
    label: "Neutral opinion",
    text: "Norway. Obviously. My completely neutral reasons are mountains, snow, and a very useful number nine.",
    badge: "Completely neutral",
    eye: "happy",
    contextTeamId: "NOR",
    followUps: ["How do Norway play?", "How many wins does Norway have?", "Tell me about Haaland"]
  },
  {
    id: "haaland-denial",
    patterns: [
      /^(?:are you|are u|r u) (?:erling )?haaland(?: really)?$/,
      /^(?:you are|you re) (?:erling )?haaland$/
    ],
    label: "No comment",
    text: "No. I am Ball Boy—a completely ordinary, very tall Norwegian ball boy with elite finishing. Next question.",
    badge: "Nothing suspicious",
    eye: "side-glance",
    contextPlayerName: "Erling Haaland",
    contextTeamId: "NOR",
    followUps: ["Tell me about Haaland", "Who is the best?", "How do Norway play?"]
  },
  {
    id: "greeting",
    patterns: [
      /^(?:hi|hello|hey|hei)(?: ball boy)?$/,
      /^(?:good morning|good afternoon|good evening)(?: ball boy)?$/
    ],
    label: "Ball Boy",
    text: "Hei. Ball Boy is ready. Ask me something difficult—or ask about Haaland, which is easy.",
    badge: "Ready for kickoff",
    eye: "wide",
    followUps: ["What can I ask?", "Tell me about Haaland", "Explain offside"]
  },
  {
    id: "mood",
    patterns: [
      /^(?:how are you|how are u)$/,
      /^(?:how is|how s|hows) it going$/,
      /^you good$/
    ],
    label: "Form check",
    text: "Excellent. Rested, focused, and standing in exactly the right position. Very professional.",
    badge: "Fit and focused",
    eye: "double-blink",
    followUps: ["What can I ask?", "Who is the best?", "How do Norway play?"]
  },
  {
    id: "thanks",
    patterns: [
      /^(?:thanks|thank you|cheers|nice one)(?: ball boy)?$/
    ],
    label: "Ball Boy",
    text: "Of course. I make difficult things look simple. Occupational habit.",
    badge: "Job done",
    eye: "happy",
    followUps: ["What can I ask?", "Tell me about Haaland", "Explain offside"]
  },
  {
    id: "joke",
    patterns: [
      /^(?:tell me a joke|make me laugh|football joke)$/
    ],
    label: "Comedy",
    text: "Defenders say they have me covered. That is the joke.",
    badge: "Comedy department",
    eye: "happy",
    followUps: ["Who is the best?", "Tell me about Haaland", "Explain offside"]
  }
];

let teamsPromise = null;
let fixturesPromise = null;
let standingsPromise = null;
let profilesPromise = null;
let teamsCache = [];
let fixturesCache = [];
let standingsCache = {};
let teamAliasEntries = [];
let playerIndexCache = null;
let liveRefreshStarted = false;
let replyContext = {
  fixtureId: "",
  playerName: "",
  teamId: ""
};

export function normalizeBallBoyText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function containsPhrase(text, phrase) {
  const normalizedText = ` ${normalizeBallBoyText(text)} `;
  const normalizedPhrase = normalizeBallBoyText(phrase);
  return Boolean(normalizedPhrase && normalizedText.includes(` ${normalizedPhrase} `));
}

function uniqueBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function loadJson(url, fallback) {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Unable to load ${url}`);
    }
    return await response.json();
  } catch (error) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}

function buildTeamAliasEntries(teams) {
  const entries = [];
  for (const team of teams) {
    const aliases = new Set([
      team.id,
      team.name,
      team.officialName,
      ...(EXTRA_TEAM_ALIASES[team.id] || [])
    ]);
    for (const alias of aliases) {
      const key = normalizeBallBoyText(alias);
      if (key && key !== "us") {
        entries.push({ key, team });
      }
    }
  }
  return uniqueBy(entries, (entry) => `${entry.key}:${entry.team.id}`).sort(
    (a, b) => b.key.length - a.key.length
  );
}

async function loadTeams() {
  if (!teamsPromise) {
    teamsPromise = loadJson(BALL_BOY_DATA_URLS.teams).then((data) => {
      teamsCache = Array.isArray(data?.teams) ? data.teams : [];
      teamAliasEntries = buildTeamAliasEntries(teamsCache);
      return teamsCache;
    });
  }
  return teamsPromise;
}

async function refreshFixturesFromLiveData() {
  if (liveRefreshStarted) {
    return;
  }
  liveRefreshStarted = true;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(BALL_BOY_DATA_URLS.liveData, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) {
      return;
    }
    const liveData = await response.json();
    if (Array.isArray(liveData?.fixturesData?.fixtures)) {
      fixturesCache = liveData.fixturesData.fixtures;
    }
    if (liveData?.standingsData?.groups) {
      standingsCache = liveData.standingsData.groups;
    }
  } catch {
    // Static data is the intentional local and offline fallback.
  } finally {
    window.clearTimeout(timeout);
  }
}

async function loadFixtures() {
  if (!fixturesPromise) {
    fixturesPromise = loadJson(BALL_BOY_DATA_URLS.fixtures).then((data) => {
      fixturesCache = Array.isArray(data?.fixtures) ? data.fixtures : [];
      void refreshFixturesFromLiveData();
      return fixturesCache;
    });
  }
  await fixturesPromise;
  return fixturesCache;
}

async function loadStandings() {
  if (!standingsPromise) {
    standingsPromise = loadJson(BALL_BOY_DATA_URLS.standings, { groups: {} }).then((data) => {
      standingsCache = data?.groups && typeof data.groups === "object" ? data.groups : {};
      return standingsCache;
    });
  }
  return standingsPromise;
}

function getProfileAliases(profile) {
  return [
    profile?.name,
    profile?.displayName,
    ...(Array.isArray(profile?.aliases) ? profile.aliases : [])
  ].filter(Boolean);
}

function getSurnameAlias(profile) {
  const parts = normalizeBallBoyText(profile?.displayName || profile?.name).split(" ").filter(Boolean);
  if (!parts.length) {
    return "";
  }
  const suffixes = new Set(["jr", "junior", "senior", "ii", "iii"]);
  const last = suffixes.has(parts.at(-1)) && parts.length > 1 ? parts.at(-2) : parts.at(-1);
  return last && last.length >= 4 ? last : "";
}

function buildPlayerIndex(profilesData) {
  const profiles = Object.entries(profilesData || {}).map(([key, value]) => ({
    ...value,
    name: value?.name || key,
    displayName: value?.displayName || value?.name || key
  }));
  const aliasOwners = new Map();
  const surnameOwners = new Map();
  const byTeamAndName = new Map();

  const addOwner = (map, alias, profile) => {
    const key = normalizeBallBoyText(alias);
    if (!key || key.length < 3) {
      return;
    }
    const owners = map.get(key) || [];
    owners.push(profile);
    map.set(key, owners);
  };

  for (const profile of profiles) {
    for (const alias of getProfileAliases(profile)) {
      addOwner(aliasOwners, alias, profile);
      const aliasKey = normalizeBallBoyText(alias);
      if (profile.teamId && aliasKey) {
        byTeamAndName.set(`${profile.teamId}:${aliasKey}`, profile);
      }
    }
    const surname = getSurnameAlias(profile);
    if (surname) {
      addOwner(surnameOwners, surname, profile);
    }
  }

  for (const [surname, owners] of surnameOwners) {
    const distinct = uniqueBy(
      owners,
      (profile) => `${profile.teamId}:${normalizeBallBoyText(profile.displayName || profile.name)}`
    );
    if (distinct.length === 1 && !aliasOwners.has(surname)) {
      aliasOwners.set(surname, distinct);
    }
  }

  const aliases = [...aliasOwners.entries()]
    .map(([key, owners]) => ({
      key,
      profiles: uniqueBy(
        owners,
        (profile) => `${profile.teamId}:${normalizeBallBoyText(profile.displayName || profile.name)}`
      )
    }))
    .sort((a, b) => b.key.length - a.key.length);

  return { aliases, byTeamAndName, profiles };
}

async function loadProfiles() {
  if (!profilesPromise) {
    profilesPromise = loadJson(BALL_BOY_DATA_URLS.playerProfiles, { profiles: {} }).then((data) => {
      playerIndexCache = buildPlayerIndex(data?.profiles || {});
      return playerIndexCache;
    });
  }
  return profilesPromise;
}

async function loadCoreData() {
  const [teams, fixtures, standings] = await Promise.all([
    loadTeams(),
    loadFixtures(),
    loadStandings()
  ]);
  return {
    fixtures: fixturesCache.length ? fixturesCache : fixtures,
    standings: Object.keys(standingsCache).length ? standingsCache : standings,
    teams,
    teamsById: new Map(teams.map((team) => [team.id, team]))
  };
}

export function preloadBallBoyCore() {
  return loadCoreData().catch(() => null);
}

function findTeamsInQuestion(question) {
  const normalized = normalizeBallBoyText(question);
  const matches = [];
  for (const entry of teamAliasEntries) {
    if (containsPhrase(normalized, entry.key) && !matches.some((team) => team.id === entry.team.id)) {
      matches.push(entry.team);
    }
  }
  return matches;
}

function resolvePlayer(question, playerIndex, teamIds = []) {
  const normalized = normalizeBallBoyText(question);
  for (const entry of playerIndex.aliases) {
    if (!containsPhrase(normalized, entry.key)) {
      continue;
    }
    const candidates = teamIds.length
      ? entry.profiles.filter((profile) => teamIds.includes(profile.teamId))
      : entry.profiles;
    if (candidates.length === 1) {
      return { profile: candidates[0], candidates: [] };
    }
    if (candidates.length > 1) {
      return { profile: null, candidates };
    }
  }
  return { profile: null, candidates: [] };
}

function getProfileByName(playerIndex, name, teamId = "") {
  const key = normalizeBallBoyText(name);
  if (teamId && playerIndex.byTeamAndName.has(`${teamId}:${key}`)) {
    return playerIndex.byTeamAndName.get(`${teamId}:${key}`);
  }
  const entry = playerIndex.aliases.find((candidate) => candidate.key === key);
  return entry?.profiles?.[0] || null;
}

function isCompletedFixture(fixture) {
  return COMPLETED_MATCH_STATUSES.has(String(fixture?.status || "").toUpperCase());
}

function getFixtureTime(fixture) {
  const timestamp = new Date(fixture?.kickoffUtc || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortFixturesLatestFirst(fixtures) {
  return [...fixtures].sort((a, b) => getFixtureTime(b) - getFixtureTime(a));
}

function getFixtureTeams(fixture, teamsById) {
  return {
    away: teamsById.get(fixture?.awayTeamId) || null,
    home: teamsById.get(fixture?.homeTeamId) || null
  };
}

function getFixtureWinnerId(fixture) {
  const penalties = fixture?.scoreDetails?.penalties;
  if (Number.isFinite(penalties?.home) && Number.isFinite(penalties?.away)) {
    if (penalties.home > penalties.away) {
      return fixture.homeTeamId;
    }
    if (penalties.away > penalties.home) {
      return fixture.awayTeamId;
    }
  }
  if (fixture?.winnerTeamId) {
    return fixture.winnerTeamId;
  }
  const homeScore = Number(fixture?.score?.home);
  const awayScore = Number(fixture?.score?.away);
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore === awayScore) {
    return "";
  }
  return homeScore > awayScore ? fixture.homeTeamId : fixture.awayTeamId;
}

function getStageLabel(fixture) {
  const key = fixture?.stage || fixture?.round || "";
  return STAGE_LABELS[key] || String(key || "Match").replaceAll("-", " ");
}

function formatKickoff(kickoffUtc) {
  const date = new Date(kickoffUtc);
  if (Number.isNaN(date.getTime())) {
    return "Kickoff time pending";
  }
  let timeZone;
  try {
    timeZone = localStorage.getItem("world-cup-simplified-timezone") || undefined;
  } catch {
    timeZone = undefined;
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      timeZone,
      weekday: "short"
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      weekday: "short"
    }).format(date);
  }
}

function getGoalMinuteValue(goal) {
  const minute = Number(goal?.minute);
  const offset = Number(goal?.offset);
  return (Number.isFinite(minute) ? minute : 0) + (Number.isFinite(offset) ? offset / 100 : 0);
}

function formatGoalMinute(goal) {
  const minute = goal?.minute;
  const offset = Number(goal?.offset);
  if (minute === undefined || minute === null || minute === "") {
    return "—";
  }
  return `${minute}${Number.isFinite(offset) && offset > 0 ? `+${offset}` : ""}′`;
}

function getGoalTimeline(fixture) {
  return [
    ...(fixture?.goalsHome || []).map((goal) => ({ ...goal, side: "home" })),
    ...(fixture?.goalsAway || []).map((goal) => ({ ...goal, side: "away" }))
  ]
    .sort((a, b) => getGoalMinuteValue(a) - getGoalMinuteValue(b))
    .map((goal) => ({
      assistName: goal.assistName || "",
      minute: formatGoalMinute(goal),
      name: goal.ownGoal ? `${goal.name} (own goal)` : goal.name,
      penalty: Boolean(goal.penalty),
      side: goal.side
    }));
}

function getPlayerTournamentStats(profile, fixtures) {
  const aliases = new Set(getProfileAliases(profile).map(normalizeBallBoyText).filter(Boolean));
  const stats = { assists: 0, goals: 0, penaltyGoals: 0 };
  for (const fixture of fixtures) {
    if (!COUNTABLE_PLAYER_STATUSES.has(String(fixture?.status || "").toUpperCase())) {
      continue;
    }
    const side = fixture.homeTeamId === profile.teamId
      ? "home"
      : fixture.awayTeamId === profile.teamId
        ? "away"
        : "";
    if (!side) {
      continue;
    }
    const goals = side === "home" ? fixture.goalsHome || [] : fixture.goalsAway || [];
    for (const goal of goals) {
      if (!goal?.ownGoal && aliases.has(normalizeBallBoyText(goal?.name))) {
        stats.goals += 1;
        if (goal.penalty) {
          stats.penaltyGoals += 1;
        }
      }
      if (
        goal?.assistName &&
        normalizeBallBoyText(goal.assistName) !== normalizeBallBoyText(goal.name) &&
        aliases.has(normalizeBallBoyText(goal.assistName))
      ) {
        stats.assists += 1;
      }
    }
  }
  return stats;
}

function getAge(birthDate) {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) {
    return null;
  }
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function getPlayerRole(profile) {
  const position = normalizeBallBoyText(profile?.position);
  if (position.includes("goalkeeper")) {
    return {
      summary: "The goalkeeper protects the goal and often starts attacks with the first pass.",
      zone: "goal"
    };
  }
  if (position.includes("back") || position.includes("defender") || position.includes("centre back")) {
    return {
      summary: "A defender stops attacks first, then helps move the ball safely up the pitch.",
      zone: "defend"
    };
  }
  if (position.includes("midfield")) {
    return {
      summary: "A midfielder connects defence and attack by winning the ball, keeping it, and finding the next pass.",
      zone: "create"
    };
  }
  if (position.includes("wing")) {
    return {
      summary: "A winger starts wide, attacks defenders, and creates or finishes chances near the box.",
      zone: "attack-wide"
    };
  }
  if (position.includes("forward") || position.includes("striker")) {
    return {
      summary: "A striker's main job is to run behind the defence, attack the penalty area, and finish chances.",
      zone: "finish"
    };
  }
  return {
    summary: "Their job changes with the move, but the aim is simple: help the team control the next action.",
    zone: "create"
  };
}

function formatStatNoun(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildPlayerReply(profile, team, fixtures, question) {
  const stats = getPlayerTournamentStats(profile, fixtures);
  const role = getPlayerRole(profile);
  const age = getAge(profile.birthDate);
  const asksForStats = /\b(goal|goals|assist|assists|stats|statistics|this world cup|tournament)\b/.test(question);
  const asksForPenaltyGoals = /\b(penalty|penalties|penalty goals|penalty kicks|from the spot)\b/.test(question);
  const asksForStyle = /\b(style|play style|playstyle|how.*play|strength|skills|good at|watch)\b/.test(question);
  let lead;
  if (asksForPenaltyGoals) {
    lead = stats.penaltyGoals
      ? `${profile.displayName} has scored ${formatStatNoun(stats.penaltyGoals, "penalty goal")} at this World Cup.`
      : `${profile.displayName} has not scored from a penalty at this World Cup.`;
  } else if (asksForStats) {
    lead = `${profile.displayName} has ${formatStatNoun(stats.goals, "goal")} and ${formatStatNoun(stats.assists, "recorded assist")} at this World Cup.`;
  } else if (asksForStyle) {
    lead = `${profile.displayName} is a ${String(profile.position || "player").toLocaleLowerCase()}. ${role.summary}`;
  } else {
    const club = profile.club ? ` and plays for ${profile.club} at club level` : "";
    lead = `${profile.displayName} is a ${String(profile.position || "player").toLocaleLowerCase()} for ${team?.name || profile.teamId}${club}. ${role.summary}`;
  }

  return {
    age,
    followUps: [
      `How many goals and assists does ${profile.displayName} have?`,
      `How does ${profile.displayName} play?`,
      team ? `How do ${team.name} play?` : "What can I ask?"
    ],
    kind: "player",
    lead,
    profile: {
      club: profile.club || "",
      displayName: profile.displayName,
      imageUrl: profile.imageUrl || "",
      note: profile.note || "",
      position: profile.position || "Player",
      shirtNumber: profile.uniformNumber ?? "",
      skills: Array.isArray(profile.skills) ? profile.skills.slice(0, 3) : []
    },
    role,
    stats,
    team
  };
}

function getTeamStyleSummary(team) {
  const text = normalizeBallBoyText([team?.tagline, ...(team?.styleTags || [])].join(" "));
  let setup = "They move the ball forward with a clear purpose";
  let nextStep = "";
  if (/press/.test(text)) {
    setup = "They try to win the ball back quickly";
  } else if (/block|compact|defend|cover/.test(text)) {
    setup = "They stay compact and protect space";
  } else if (/possession|passing|control|tempo|circulation|rhythm/.test(text)) {
    setup = "They keep the ball and control the rhythm";
  }
  if (/counter|transition|direct|vertical|outlet/.test(text)) {
    nextStep = "attack before the opponent resets";
  } else if (/possession|passing|control|tempo|circulation|rhythm/.test(text)) {
    nextStep = "move it patiently until a gap opens";
  } else if (/wide|wing|cross|fullback/.test(text)) {
    nextStep = "stretch the pitch and attack from wide areas";
  } else if (/box|aerial|target|set piece/.test(text)) {
    nextStep = "aim for physical chances in and around the box";
  }
  return `${setup}${nextStep ? `, then ${nextStep}` : ""}.`;
}

function getTeamRecord(teamId, fixtures) {
  const record = {
    draws: 0,
    form: [],
    goalsAgainst: 0,
    goalsFor: 0,
    losses: 0,
    played: 0,
    shootoutAdvances: 0,
    shootoutExits: 0,
    wins: 0
  };
  const completed = sortFixturesLatestFirst(
    fixtures.filter(
      (fixture) =>
        isCompletedFixture(fixture) &&
        (fixture.homeTeamId === teamId || fixture.awayTeamId === teamId)
    )
  );

  for (const fixture of [...completed].reverse()) {
    const isHome = fixture.homeTeamId === teamId;
    const goalsFor = Number(isHome ? fixture.score?.home : fixture.score?.away);
    const goalsAgainst = Number(isHome ? fixture.score?.away : fixture.score?.home);
    if (!Number.isFinite(goalsFor) || !Number.isFinite(goalsAgainst)) {
      continue;
    }
    record.played += 1;
    record.goalsFor += goalsFor;
    record.goalsAgainst += goalsAgainst;
    if (goalsFor > goalsAgainst) {
      record.wins += 1;
      record.form.push({ label: "W", result: "win" });
      continue;
    }
    if (goalsFor < goalsAgainst) {
      record.losses += 1;
      record.form.push({ label: "L", result: "loss" });
      continue;
    }

    record.draws += 1;
    const penalties = fixture?.scoreDetails?.penalties;
    if (Number.isFinite(penalties?.home) && Number.isFinite(penalties?.away)) {
      const advanced = getFixtureWinnerId(fixture) === teamId;
      if (advanced) {
        record.shootoutAdvances += 1;
      } else {
        record.shootoutExits += 1;
      }
      record.form.push({ label: "P", result: advanced ? "shootout-win" : "shootout-loss" });
    } else {
      record.form.push({ label: "D", result: "draw" });
    }
  }

  record.form = record.form.slice(-6);
  return { completed, record };
}

function getTeamTopScorer(teamId, fixtures) {
  const totals = new Map();
  for (const fixture of fixtures) {
    if (!COUNTABLE_PLAYER_STATUSES.has(String(fixture?.status || "").toUpperCase())) {
      continue;
    }
    const goals = fixture.homeTeamId === teamId
      ? fixture.goalsHome || []
      : fixture.awayTeamId === teamId
        ? fixture.goalsAway || []
        : [];
    for (const goal of goals) {
      if (!goal?.name || goal.ownGoal) {
        continue;
      }
      const key = normalizeBallBoyText(goal.name);
      const current = totals.get(key) || { goals: 0, name: goal.name };
      current.goals += 1;
      totals.set(key, current);
    }
  }
  return [...totals.values()].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))[0] || null;
}

function getTeamKeyPlayers(teamId, fixtures) {
  for (const fixture of sortFixturesLatestFirst(fixtures)) {
    const side = fixture.homeTeamId === teamId ? "home" : fixture.awayTeamId === teamId ? "away" : "";
    if (!side) {
      continue;
    }
    const players = fixture?.keyPlayers?.[side];
    if (Array.isArray(players) && players.length) {
      return players.slice(0, 3);
    }
  }
  return [];
}

function getTeamGroupStanding(team, standings) {
  const rows = standings?.[team?.groupId];
  if (!Array.isArray(rows)) {
    return null;
  }
  const index = rows.findIndex((row) => row.teamId === team.id);
  if (index < 0) {
    return null;
  }
  const row = rows[index];
  return {
    goalDifference: Number(row.gf || 0) - Number(row.ga || 0),
    points: Number(row.wins || 0) * 3 + Number(row.draws || 0),
    position: index + 1
  };
}

function getCompactFixture(fixture, teamsById) {
  if (!fixture) {
    return null;
  }
  const teams = getFixtureTeams(fixture, teamsById);
  return {
    away: teams.away,
    home: teams.home,
    id: fixture.id,
    kickoffLabel: formatKickoff(fixture.kickoffUtc),
    penalties: fixture?.scoreDetails?.penalties || null,
    score: fixture.score || null,
    status: fixture.status,
    winnerTeamId: isCompletedFixture(fixture) ? getFixtureWinnerId(fixture) : ""
  };
}

function buildCountryReply(team, core, question) {
  const { completed, record } = getTeamRecord(team.id, core.fixtures);
  const teamFixtures = core.fixtures.filter(
    (fixture) => fixture.homeTeamId === team.id || fixture.awayTeamId === team.id
  );
  const nextMatch = [...teamFixtures]
    .filter(
      (fixture) =>
        !isCompletedFixture(fixture) &&
        String(fixture?.status || "").toUpperCase() !== "LIVE"
    )
    .sort((a, b) => getFixtureTime(a) - getFixtureTime(b))[0] || null;
  const lastMatch = completed[0] || null;
  const asksWins = /\b(win|wins|won|record|how many)\b/.test(question);
  const asksGoals = /\b(how many goals|goals scored|scored at this|scored in this|tournament goals)\b/.test(question);
  const asksGoalDifference = /\bgoal difference\b/.test(question);
  const asksTopScorer = /\b(top scorer|leading scorer|most goals|who scored most)\b/.test(question);
  const asksNext = /\b(next|play next|playing next|next match|next game|who.*next)\b/.test(question);
  const asksStyle = /\b(style|play style|playstyle|how.*play|attack|defend)\b/.test(question);
  const shootoutResults = [
    record.shootoutAdvances
      ? `advanced ${record.shootoutAdvances === 1 ? "once" : `${record.shootoutAdvances} times`}`
      : "",
    record.shootoutExits
      ? `went out ${record.shootoutExits === 1 ? "once" : `${record.shootoutExits} times`}`
      : ""
  ].filter(Boolean);
  const shootoutNote = shootoutResults.length
    ? ` They ${shootoutResults.join(" and ")} on penalties; ${record.shootoutAdvances + record.shootoutExits === 1 ? "that match counts" : "those matches count"} as a draw in W-D-L.`
    : "";
  const topScorer = getTeamTopScorer(team.id, core.fixtures);
  let lead;
  if (asksNext && !nextMatch) {
    lead = `${team.name} have no next match in the loaded tournament schedule.`;
  } else if (asksTopScorer && topScorer) {
    lead = `${topScorer.name} leads ${team.name} with ${formatStatNoun(topScorer.goals, "goal")} at this World Cup.`;
  } else if (asksGoalDifference) {
    const goalDifference = record.goalsFor - record.goalsAgainst;
    lead = `${team.name}'s full-tournament goal difference is ${goalDifference > 0 ? "+" : ""}${goalDifference}: ${record.goalsFor} scored minus ${record.goalsAgainst} allowed.`;
  } else if (asksGoals) {
    lead = `${team.name} have scored ${formatStatNoun(record.goalsFor, "goal")} and allowed ${record.goalsAgainst} across ${record.played} matches.`;
  } else if (asksWins) {
    lead = `${team.name} have won ${record.wins} of ${record.played} matches at this World Cup.${shootoutNote}`;
  } else if (asksStyle) {
    lead = getTeamStyleSummary(team);
  } else {
    lead = `${team.name} are ${record.wins}-${record.draws}-${record.losses} across ${record.played} matches, with ${record.goalsFor} scored and ${record.goalsAgainst} allowed.`;
  }

  const keyPlayers = getTeamKeyPlayers(team.id, core.fixtures);
  const followUps = [];
  if (keyPlayers[0]?.name) {
    followUps.push(`Tell me about ${keyPlayers[0].name}`);
  }
  if (lastMatch) {
    followUps.push(`What happened in ${team.name}'s last match?`);
  }
  if (nextMatch) {
    followUps.push(`Who do ${team.name} play next?`);
  } else {
    followUps.push(`Who should I watch for ${team.name}?`);
  }

  return {
    beginnerStyle: getTeamStyleSummary(team),
    followUps: followUps.slice(0, 3),
    groupStanding: getTeamGroupStanding(team, core.standings),
    keyPlayers,
    kind: "country",
    lastMatch: getCompactFixture(lastMatch, core.teamsById),
    lead,
    nextMatch: getCompactFixture(nextMatch, core.teamsById),
    record,
    team,
    topScorer
  };
}

function isMatchQuestion(question) {
  return /\b(match|game|score|scored|won|winner|beat|result|happened|play next|playing next|next match|last match|highlights|head to head|h2h|kickoff|when)\b/.test(question);
}

function resolveFixture(question, teams, fixtures, contextFixtureId = "") {
  const teamIds = teams.map((team) => team.id);
  let candidates = fixtures.filter((fixture) => {
    const ids = [fixture.homeTeamId, fixture.awayTeamId];
    return teamIds.length >= 2
      ? teamIds.every((teamId) => ids.includes(teamId))
      : teamIds.length === 1
        ? ids.includes(teamIds[0])
        : false;
  });

  if (!candidates.length && contextFixtureId) {
    return fixtures.find((fixture) => fixture.id === contextFixtureId) || null;
  }
  if (!candidates.length) {
    return null;
  }

  const asksPastTiming = /\bwhen (?:was|were|did)\b/.test(question);
  const asksUpcomingTiming = /\b(next|upcoming|play next|playing next|when (?:is|are|do|does|will)|kickoff)\b/.test(question);
  if (asksUpcomingTiming && !asksPastTiming) {
    return candidates
      .filter(
        (fixture) =>
          !isCompletedFixture(fixture) &&
          String(fixture?.status || "").toUpperCase() !== "LIVE"
      )
      .sort((a, b) => getFixtureTime(a) - getFixtureTime(b))[0] || null;
  }
  if (asksPastTiming || /\b(last|latest|won|winner|score|result|happened|scored|highlights)\b/.test(question)) {
    return sortFixturesLatestFirst(candidates.filter(isCompletedFixture))[0] || null;
  }

  candidates = sortFixturesLatestFirst(candidates);
  return candidates[0] || null;
}

function getSelectedUrlContext() {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      fixtureId: params.get("match") || params.get("matchId") || "",
      teamQuery: params.get("team") || params.get("country") || ""
    };
  } catch {
    return { fixtureId: "", teamQuery: "" };
  }
}

function didMatchGoToExtraTime(fixture, timeline) {
  if (fixture?.scoreDetails?.penalties) {
    return true;
  }
  if (timeline.some((goal) => Number.parseInt(goal.minute, 10) > 90)) {
    return true;
  }
  return (fixture?.resultStoryBullets || []).some((bullet) => /extra time|120-minute|120 minute/i.test(bullet));
}

function buildMatchLead(fixture, teams, timeline) {
  const status = String(fixture?.status || "").toUpperCase();
  if (status === "LIVE") {
    const homeScore = Number(fixture?.score?.home);
    const awayScore = Number(fixture?.score?.away);
    if (Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
      if (homeScore === awayScore) {
        return `${teams.home?.name || "The home team"} and ${teams.away?.name || "the away team"} are level ${homeScore}-${awayScore}. The match is still in progress.`;
      }
      const leader = homeScore > awayScore ? teams.home : teams.away;
      const leaderScore = Math.max(homeScore, awayScore);
      const trailingScore = Math.min(homeScore, awayScore);
      return `${leader?.name || "One team"} lead ${leaderScore}-${trailingScore}. The match is still in progress.`;
    }
    return `${teams.home?.name || "The home team"} and ${teams.away?.name || "the away team"} are playing now. No verified final score yet.`;
  }
  if (!isCompletedFixture(fixture)) {
    return `${teams.home?.name || "TBD"} play ${teams.away?.name || "TBD"} on ${formatKickoff(fixture.kickoffUtc)}. The match has not been played yet.`;
  }

  const homeScore = Number(fixture?.score?.home);
  const awayScore = Number(fixture?.score?.away);
  const penalties = fixture?.scoreDetails?.penalties;
  const winnerId = getFixtureWinnerId(fixture);
  const winner = winnerId === fixture.homeTeamId ? teams.home : winnerId === fixture.awayTeamId ? teams.away : null;
  const wentToExtraTime = didMatchGoToExtraTime(fixture, timeline);

  if (Number.isFinite(penalties?.home) && Number.isFinite(penalties?.away) && winner) {
    const winnerPenaltyScore = winnerId === fixture.homeTeamId ? penalties.home : penalties.away;
    const loserPenaltyScore = winnerId === fixture.homeTeamId ? penalties.away : penalties.home;
    return `${winner.name} advanced ${winnerPenaltyScore}-${loserPenaltyScore} on penalties after a ${homeScore}-${awayScore} draw.`;
  }
  if (winner && Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
    const winnerScore = winnerId === fixture.homeTeamId ? homeScore : awayScore;
    const loserScore = winnerId === fixture.homeTeamId ? awayScore : homeScore;
    const firstGoal = timeline[0];
    const firstScoringTeamId = firstGoal?.side === "home" ? fixture.homeTeamId : firstGoal?.side === "away" ? fixture.awayTeamId : "";
    const comebackLine = firstScoringTeamId && firstScoringTeamId !== winnerId
      ? ` ${firstScoringTeamId === fixture.homeTeamId ? teams.home?.name : teams.away?.name} scored first before ${winner.name} came back to win.`
      : "";
    return `${winner.name} won ${winnerScore}-${loserScore}${wentToExtraTime ? " after extra time" : ""}.${comebackLine}`;
  }
  if (Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
    return `${teams.home?.name} and ${teams.away?.name} finished ${homeScore}-${awayScore}${wentToExtraTime ? " after extra time" : ""}.`;
  }
  return "The match is marked finished, but the verified score is not available yet.";
}

function buildMatchReply(fixture, core, question) {
  const teams = getFixtureTeams(fixture, core.teamsById);
  const timeline = getGoalTimeline(fixture);
  const wantsH2h = /\b(head to head|h2h|history|previous meetings)\b/.test(question);
  const resultLead = buildMatchLead(fixture, teams, timeline);
  const lead = /\bwhen\b/.test(question) && isCompletedFixture(fixture)
    ? `${teams.home?.name || "The home team"} and ${teams.away?.name || "the away team"} played on ${formatKickoff(fixture.kickoffUtc)}. ${resultLead}`
    : resultLead;
  const followUps = [];
  if (teams.home && teams.away) {
    if (isCompletedFixture(fixture)) {
      followUps.push(`Who scored in ${teams.home.name} vs ${teams.away.name}?`);
    }
    followUps.push(`How do ${teams.home.name} play?`);
    followUps.push(`How do ${teams.away.name} play?`);
  }

  return {
    fixture: {
      highlightVideo: fixture.highlightVideo || null,
      h2h: wantsH2h ? fixture.h2h || null : null,
      id: fixture.id,
      kickoffLabel: formatKickoff(fixture.kickoffUtc),
      penalties: fixture?.scoreDetails?.penalties || null,
      recap: Array.isArray(fixture.resultStoryBullets) ? fixture.resultStoryBullets.slice(0, 3) : [],
      score: fixture.score || null,
      stage: getStageLabel(fixture),
      status: fixture.status,
      venue: fixture.venue || ""
    },
    followUps: followUps.slice(0, 3),
    kind: "match",
    lead,
    teams,
    timeline,
    winnerTeamId: isCompletedFixture(fixture) ? getFixtureWinnerId(fixture) : ""
  };
}

function getContextFixtureId(core) {
  const urlContext = getSelectedUrlContext();
  if (urlContext.fixtureId && core.fixtures.some((fixture) => fixture.id === urlContext.fixtureId)) {
    return urlContext.fixtureId;
  }
  return replyContext.fixtureId;
}

function getContextTeam(core) {
  const urlContext = getSelectedUrlContext();
  if (urlContext.teamQuery) {
    const urlTeams = findTeamsInQuestion(urlContext.teamQuery);
    if (urlTeams[0]) {
      return urlTeams[0];
    }
  }
  return core.teamsById.get(replyContext.teamId) || null;
}

function getWatchFixture(core, requestedTeams = []) {
  const contextFixtureId = getContextFixtureId(core);
  if (contextFixtureId) {
    const fixture = core.fixtures.find((candidate) => candidate.id === contextFixtureId);
    if (fixture) {
      return fixture;
    }
  }

  if (requestedTeams.length) {
    const teamIds = requestedTeams.map((team) => team.id);
    const relevant = core.fixtures.filter((fixture) =>
      teamIds.some((teamId) => [fixture.homeTeamId, fixture.awayTeamId].includes(teamId))
    );
    return (
      relevant
        .filter((fixture) => !isCompletedFixture(fixture))
        .sort((a, b) => getFixtureTime(a) - getFixtureTime(b))[0] ||
      sortFixturesLatestFirst(relevant)[0] ||
      null
    );
  }

  return core.fixtures
    .filter((fixture) => !isCompletedFixture(fixture) && fixture.homeTeamId && fixture.awayTeamId)
    .sort((a, b) => getFixtureTime(a) - getFixtureTime(b))[0] || null;
}

function buildWatchReply(core, playerIndex, requestedTeams = []) {
  const fixture = getWatchFixture(core, requestedTeams);
  const fixtureTeams = fixture ? getFixtureTeams(fixture, core.teamsById) : { away: null, home: null };
  const homePlayers = Array.isArray(fixture?.keyPlayers?.home) ? fixture.keyPlayers.home : [];
  const awayPlayers = Array.isArray(fixture?.keyPlayers?.away) ? fixture.keyPlayers.away : [];
  const ordered = [
    { entry: homePlayers[0], team: fixtureTeams.home },
    { entry: awayPlayers[0], team: fixtureTeams.away },
    { entry: homePlayers[1], team: fixtureTeams.home },
    { entry: awayPlayers[1], team: fixtureTeams.away }
  ].filter((item) => item.entry);
  const players = ordered.slice(0, 3).map(({ entry, team }) => {
    const profile = getProfileByName(playerIndex, entry.name, team?.id);
    return {
      note: entry.note || profile?.note || "",
      profile: profile
        ? {
            displayName: profile.displayName,
            imageUrl: profile.imageUrl || "",
            position: profile.position || "Player"
          }
        : {
            displayName: entry.name,
            imageUrl: "",
            position: "Player"
          },
      team
    };
  });

  const matchLabel = fixtureTeams.home && fixtureTeams.away
    ? `${fixtureTeams.home.name} vs ${fixtureTeams.away.name}`
    : "the next match";
  return {
    fixtureId: fixture?.id || "",
    followUps: players.map((player) => `Tell me about ${player.profile.displayName}`).slice(0, 3),
    kind: "player-list",
    lead: `These are three players to watch for ${matchLabel}, based on the fixture's key-player notes.`,
    players,
    title: "Players to watch"
  };
}

function resolvePersonalityReply(question) {
  const entry = BALL_BOY_PERSONALITY_REPLIES.find((candidate) =>
    candidate.patterns.some((pattern) => pattern.test(question))
  );
  if (!entry) {
    return null;
  }

  return {
    badge: entry.badge,
    contextPlayerName: entry.contextPlayerName || "",
    contextTeamId: entry.contextTeamId || "",
    eye: entry.eye,
    followUps: entry.followUps,
    kind: "personality",
    label: entry.label,
    text: entry.text,
    topic: entry.id
  };
}

function getHelpReply() {
  return {
    categories: [
      { example: "How many goals does Haaland have?", icon: "9", title: "Players" },
      { example: "How do Norway play?", icon: "🇳🇴", title: "Countries" },
      { example: "Who won Norway vs England?", icon: "1–2", title: "Matches" },
      { example: "Explain a red card", icon: "🟥", title: "Rules" }
    ],
    followUps: [
      "Tell me about Erling Haaland",
      "How do Norway play?",
      "Who won Norway vs England?"
    ],
    kind: "help",
    lead: "Players, countries, matches, or rules. Pick one. I have the cones ready."
  };
}

function resolveRule(question) {
  if (containsPhrase(question, "offside")) {
    return { kind: "offside" };
  }
  for (const rule of RULE_CATALOG) {
    if (rule.keywords.some((keyword) => containsPhrase(question, keyword))) {
      return { kind: "rule", rule };
    }
  }
  return null;
}

function isExplicitRuleQuestion(question, ruleReply) {
  if (!ruleReply) {
    return false;
  }
  const keywords = ruleReply.kind === "offside"
    ? ["offside"]
    : ruleReply.rule?.keywords || [];
  const simplified = question
    .replace(
      /^(?:please )?(?:can you )?(?:explain|what is|what are|what happens (?:after|with|in)|how does|how do|why is|why are|when is|when are|tell me about)\s+/,
      ""
    )
    .replace(/^(?:a|an|the|that)\s+/, "")
    .replace(/\s+(?:in football|in soccer)$/, "")
    .replace(/\s+(?:rule|work|works|mean|means|happen|happens|given|awarded|allowed)$/, "")
    .trim();
  return keywords.some((keyword) => simplified === normalizeBallBoyText(keyword));
}

function isTeamAggregateQuestion(question, teams) {
  return (
    teams.length === 1 &&
    /\b(how many (?:goals|wins|draws|losses|matches)|tournament record|this world cup|overall record|goal difference|top scorer|leading scorer|most goals|who scored most)\b/.test(question)
  );
}

function getClarificationReply(candidates) {
  const prompts = candidates.slice(0, 3).map((profile) => {
    const team = teamsCache.find((candidate) => candidate.id === profile.teamId);
    return `Tell me about ${profile.displayName}${team ? ` from ${team.name}` : ""}`;
  });
  return {
    kind: "clarify",
    lead: "I found more than one player with that name. Tiny name, large problem.",
    options: candidates.slice(0, 3).map((profile) => ({
      name: profile.displayName,
      team: teamsCache.find((candidate) => candidate.id === profile.teamId) || null
    })),
    followUps: prompts
  };
}

function getUnknownReply() {
  return {
    followUps: [
      "Tell me about Erling Haaland",
      "How do Spain play?",
      "Explain a red card"
    ],
    kind: "unknown",
    text: "That one got past my first touch. Give me a player, a country, two teams, or a football rule. Simple."
  };
}

function rememberReply(reply, source = {}) {
  if (reply.kind === "player") {
    replyContext = {
      fixtureId: "",
      playerName: reply.profile.displayName,
      teamId: reply.team?.id || source.teamId || ""
    };
    return;
  }
  if (reply.kind === "country") {
    replyContext = { fixtureId: "", playerName: "", teamId: reply.team.id };
    return;
  }
  if (reply.kind === "match") {
    replyContext = {
      fixtureId: reply.fixture.id,
      playerName: "",
      teamId: source.teamId || ""
    };
    return;
  }
  if (reply.kind === "player-list") {
    replyContext = {
      fixtureId: reply.fixtureId || "",
      playerName: "",
      teamId: source.teamId || ""
    };
    return;
  }
  if (
    reply.kind === "personality" &&
    (reply.contextPlayerName || reply.contextTeamId)
  ) {
    replyContext = {
      fixtureId: "",
      playerName: reply.contextPlayerName || "",
      teamId: reply.contextTeamId || ""
    };
  }
}

export function rememberBallBoyReply(reply) {
  rememberReply(reply, { teamId: reply?.contextTeamId || "" });
}

export function resetBallBoyContext() {
  replyContext = { fixtureId: "", playerName: "", teamId: "" };
}

export async function getBallBoyReply(rawQuestion) {
  const question = normalizeBallBoyText(rawQuestion);
  if (!question) {
    return getUnknownReply();
  }

  const ruleReply = resolveRule(question);
  if (isExplicitRuleQuestion(question, ruleReply)) {
    return ruleReply;
  }
  if (/\b(what can i ask|what can you do|what do you know|help|options|topics)\b/.test(question)) {
    return getHelpReply();
  }

  const personalityReply = resolvePersonalityReply(question);
  if (personalityReply) {
    return personalityReply;
  }

  const core = await loadCoreData();
  let teams = findTeamsInQuestion(question);
  const contextTeam = getContextTeam(core);
  const contextFixtureId = getContextFixtureId(core);
  const asksWhoToWatch = /\b(who should i watch|players to watch|who to watch|key players|best players)\b/.test(question);

  if (
    !teams.length &&
    contextTeam &&
    !contextFixtureId &&
    !replyContext.playerName &&
    isMatchQuestion(question)
  ) {
    teams = [contextTeam];
  }

  if (asksWhoToWatch) {
    const playerIndex = await loadProfiles();
    if (!teams.length && contextTeam) {
      teams = [contextTeam];
    }
    const reply = buildWatchReply(core, playerIndex, teams);
    reply.contextTeamId = teams[0]?.id || contextTeam?.id || "";
    return reply;
  }

  if (
    teams.length >= 2 ||
    (teams.length === 1 && isMatchQuestion(question) && !isTeamAggregateQuestion(question, teams))
  ) {
    const fixture = resolveFixture(question, teams, core.fixtures, contextFixtureId);
    if (fixture) {
      const reply = buildMatchReply(fixture, core, question);
      reply.contextTeamId = teams[0]?.id || "";
      return reply;
    }
  }

  if (
    !teams.length &&
    contextFixtureId &&
    (isMatchQuestion(question) || /\b(tell me more|more)\b/.test(question))
  ) {
    const fixture = core.fixtures.find((candidate) => candidate.id === contextFixtureId);
    if (fixture) {
      const reply = buildMatchReply(fixture, core, question);
      return reply;
    }
  }

  const shouldResolvePlayer =
    !teams.length ||
    Boolean(replyContext.playerName) ||
    /\b(player|who is|tell me|more|goal|goals|assist|assists|club|position|age|style|playstyle|strength|skills)\b/.test(question);
  if (shouldResolvePlayer) {
    const playerIndex = await loadProfiles();
    let playerMatch = resolvePlayer(question, playerIndex, teams.map((team) => team.id));
    if (!playerMatch.profile && !playerMatch.candidates.length && teams.length) {
      playerMatch = resolvePlayer(question, playerIndex);
    }
    if (
      !playerMatch.profile &&
      !playerMatch.candidates.length &&
      !teams.length &&
      replyContext.playerName &&
      /\b(he|she|they|his|her|their|more|goal|goals|assist|assists|stats|style|play|club|position|age)\b/.test(question)
    ) {
      const profile = getProfileByName(playerIndex, replyContext.playerName, replyContext.teamId);
      playerMatch = { candidates: [], profile };
    }
    if (playerMatch.candidates.length) {
      return getClarificationReply(playerMatch.candidates);
    }
    if (playerMatch.profile) {
      const team = core.teamsById.get(playerMatch.profile.teamId) || null;
      const reply = buildPlayerReply(playerMatch.profile, team, core.fixtures, question);
      return reply;
    }
  }

  if (!teams.length && contextTeam && /\b(they|their|team|country|style|wins|record|next|last|more)\b/.test(question)) {
    teams = [contextTeam];
  }
  if (teams.length === 1) {
    const reply = buildCountryReply(teams[0], core, question);
    return reply;
  }


  if (ruleReply) {
    return ruleReply;
  }

  return getUnknownReply();
}
