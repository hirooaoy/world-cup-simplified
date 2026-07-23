const CURRENT_QUALITY_IDS = Object.freeze({
  "creating a clean shot before the defense can reset": "clean-shot",
  "protecting the most dangerous space before stepping to the ball": "protect-danger-space",
  "seeing the decisive pass one beat before it opens": "see-decisive-pass",
  "creating a better angle for the next pass": "create-pass-angle",
  "sharp reactions backed by early positioning": "early-position-reactions",
  "protecting the centre of goal before reacting to the finish": "centre-first-positioning",
  "controlling where the ball goes when a clean catch is not available": "rebound-control",
  "keeping his body shape compact for reflex saves at close range": "compact-reflex-shape",
  "the flexibility to fill different roles without breaking the team's shape": "role-flexibility",
  "choosing the moment of contact instead of diving in": "duel-timing",
  "explosive speed once open grass appears": "open-grass-speed",
  "changing direction without losing control of the ball": "close-control-direction",
  "making the safer decision before a duel becomes an emergency": "safe-defensive-decision",
  "making purposeful movement away from the ball": "purposeful-off-ball",
  "staying ready through long quiet spells": "long-focus",
  "pressing with a clear target rather than simply chasing": "targeted-press",
  "keeping the ball calm when pressure arrives": "pressure-composure",
  "moving the defense with the weight and angle of his passing": "passing-weight-angle",
  "organizing teammates before danger becomes obvious": "early-organization",
  "calm decisions shaped by experience in high-pressure moments": "experience-calm",
  "recovery speed when the defensive line is exposed": "recovery-speed",
  "using strength without slowing the next action": "strength-continuity",
  "starting his run while defenders are still watching the ball": "early-run",
  "reading the flight of the ball before the duel begins": "aerial-reading",
  "waiting for a defender's attention to shift before moving": "delayed-run",
  "recovering position without panicking after the first line is broken": "calm-recovery",
  "delivering the ball without needing much space": "tight-space-delivery",
  "making the next teammate's action easier": "help-next-action",
  "giving centre-backs a physical problem they cannot ignore": "physical-reference",
  "reading the next phase before the space fully opens": "read-next-phase",
  "receiving in tight spaces with his next action already planned": "planned-tight-receive",
  "choosing the moment to join an attack from deep": "deep-attack-timing",
  "staying balanced until the shot reveals its direction": "goalkeeper-balance",
  "carrying momentum through open midfield": "open-midfield-carry",
  "turning a save into the first pass of an attack": "save-starts-attack",
  "repeatable technique on dead balls": "dead-ball-technique",
  "starting high enough to protect the space behind his defense": "high-starting-position",
  "the patience to read a penalty taker's last movement": "penalty-reading",
  "staying connected to runners when the ball moves elsewhere": "runner-tracking",
  "command of the crowded space around goal": "crowded-goal-command",
  "the timing of his run across the nearest defender": "near-post-timing",
  "making defenders respect the shot from outside the box": "long-shot-threat",
  "closing the crossing angle without losing the runner": "cross-angle-control",
  "reacting first when a duel leaves the ball free": "second-ball-reaction",
  "organizing the nearby unit before the next phase begins": "nearby-unit-organization",
  "giving the front line a clear cue for when to move and press": "front-line-leadership",
  "arriving at the far side after defenders have narrowed toward the ball": "back-post-arrival",
  "keeping his penalty strike repeatable under pressure": "penalty-contact-calm",
  "using his left foot as a passing outlet": "left-foot-passing",
  "hiding the intended pass until the final moment": "disguised-passing",
  "finding a runner with a pulled-back pass": "pullback-creation",
  "keeping possession moving with the available pass": "passing-continuity",
  "returning to wide areas to provide repeated deliveries": "crossing-volume",
  "carrying the ball directly at an isolated defender": "one-on-one-running",
  "protecting the centre before the shooter reveals the finish": "shot-stopping-readiness",
  "dealing with aerial balls in his defensive area": "aerial-defending",
  "taking an active role in the team's pressure": "pressing-work",
  "taking responsibility for attacking dead-ball deliveries": "set-piece-responsibility",
  "looking for the pass that can create the next chance": "chance-passing",
  "moving possession forward with the ball at his feet": "ball-carrying",
  "advancing the ball while direct pressure stays close": "dribbling-control",
  "providing service from wide areas": "wide-service",
  "getting into positions where the next pass can become a shot": "goal-threat-positioning",
  "preparing to finish when the ball reaches him near goal": "finishing-readiness",
  "using his speed when the route ahead opens": "pace-in-space",
  "competing for aerial balls": "aerial-duels",
  "using his strength in direct contact": "strength-in-contact",
  "finding an available outlet after regaining possession": "goalkeeper-distribution"
});

const HISTORICAL_QUALITY_IDS = Object.freeze({
  "attacking the space behind defenders before it fully opens": "attack-space-behind",
  "shaping the pace of the game from midfield": "shape-midfield-tempo",
  "using contact without losing his defensive position": "contact-with-position",
  "staying balanced until the shot reveals its direction": "goalkeeper-balance",
  "creating a clean shot before the defense can reset": "clean-shot",
  "purposeful movement away from the ball": "purposeful-off-ball",
  "covering the outside lane at both ends of the pitch": "two-way-wide-lane",
  "finding pockets around the main striker": "second-striker-pockets"
});

const CURRENT_ACTION_IDS = Object.freeze({
  "meets the ball early instead of waiting underneath it": "meet-ball-early",
  "plays through nearby pressure instead of around it": "play-through-pressure",
  "uses his first touch to escape pressure before choosing the pass": "first-touch-escape",
  "moves after releasing the ball so the receiver still has support": "move-after-release",
  "shifts onto his stronger foot and shoots with little backlift": "shoot-strong-foot",
  "holds the route into the box until support arrives": "hold-box-route",
  "angles his run to block the easy pass as he closes the ball": "press-angle",
  "turns early and protects the route toward goal": "protect-goal-route",
  "waits for a loose touch and then steps through the ball": "win-loose-touch",
  "moves through the gap between full-back and centre-back": "attack-channel-gap",
  "varies the height and pace of his delivery": "vary-delivery",
  "draws a defender in and releases the runner behind him": "draw-and-release",
  "draws the first challenge, then carries through the gap": "carry-through-gap",
  "changes his position early enough to give the passer a clear target": "offer-clear-target",
  "leaves his line only with a clear route to take pressure off his defenders": "claim-timing",
  "changes pace after the defender has committed his feet": "change-pace",
  "waits until the wide defender looks inside before running beyond him": "overlap-timing",
  "sets his feet before the shot and reacts without an extra step": "set-and-react",
  "holds the central lane until the attacker's touch reveals the angle": "hold-central-goal-lane",
  "pushes the save away from the next runner instead of back into traffic": "parry-away-danger",
  "keeps his hands and feet connected so the reflex block stays controlled": "controlled-reflex-block",
  "attacks the cross at the highest point he can control before traffic closes": "claim-cross-high",
  "protects the ball with his body and returns it into a runner's path": "body-and-return",
  "looks up before crossing and picks a runner rather than an empty area": "pick-cross-target",
  "chooses the simple restart before pressure can close in": "simple-restart",
  "protects the route to goal and challenges only when the touch is loose": "protect-then-challenge",
  "arrives in the box late enough to be difficult to track": "late-box-arrival",
  "holds the passing lane into midfield until support arrives": "hold-midfield-lane",
  "keeps the line connected with constant small instructions": "line-instructions",
  "turns early and closes the runner before the box": "recover-before-box",
  "changes position while keeping his priorities simple": "simple-role-change",
  "slows the play to restore control and takes the risk once the opening is clear": "manage-tempo-risk",
  "opens his body on the first touch so he can play forward": "open-body-forward",
  "absorbs contact and keeps the ball close enough to continue forward": "absorb-and-carry",
  "pins a defender and creates room for the next runner": "pin-and-create",
  "adjusts his position early enough to make the difficult action look simple": "early-position-adjustment",
  "checks the runner over his shoulder before the final pass arrives": "check-runner",
  "positions himself for the next touch before the first contest is over": "anticipate-second-ball",
  "keeps his feet active and makes the save with the fewest movements": "economical-save",
  "attacks the near-post lane before the marker can turn": "near-post-run",
  "waits for the strike before committing": "penalty-wait",
  "leaves his line early when a through ball escapes the back line": "sweeper-exit",
  "shifts onto his left foot and shoots with little backlift": "shoot-left-foot",
  "keeps his decisions calm when a sudden save is required": "sudden-save-calm",
  "pushes the ball beyond the first challenge and accelerates after it": "push-and-accelerate",
  "gets close enough to block the delivery without diving in": "block-cross-angle",
  "uses a clean first touch to open a shooting lane from distance": "open-distance-shot",
  "shifts onto his right foot and shoots with little backlift": "shoot-right-foot",
  "meets the pass without adding an extra touch": "first-time-finish",
  "arrives balanced and finishes before the nearest defender can recover": "moving-finish",
  "steps toward the flight and heads clear before the forward can set himself": "head-clear-early",
  "starts outside his marker and attacks the dropping ball": "attack-dropping-ball",
  "takes the first available forward lane before it closes": "first-forward-lane",
  "uses short cues to keep nearby passing and pressing options connected": "nearby-unit-cues",
  "sets the first pressure and directs the next runner toward the easy pass": "lead-first-pressure",
  "holds the far-post lane, then attacks it as the cross leaves the passer": "attack-back-post",
  "shortens his approach, stays balanced and strikes without rushing": "composed-penalty-strike",
  "positions the ball to finish with either foot before the defender can reset": "finish-either-foot",
  "plays the available pass with his left foot": "pass-with-left-foot",
  "shapes toward one option before releasing the ball into another lane": "hide-pass-intent",
  "pulls the ball back from near the end line toward a supporting runner": "pull-ball-back",
  "moves the ball to the next available teammate without holding it": "play-available-pass",
  "gets into position to send another ball toward the penalty area": "repeat-wide-delivery",
  "runs at the defender in front of him with the ball under control": "run-at-isolated-defender",
  "sets his angle early and holds the centre until the ball leaves the foot": "set-for-shot",
  "moves toward the dropping ball and contests it before the attacker can settle": "contest-aerial-ball",
  "moves toward the ball as teammates close the nearby options": "join-team-pressure",
  "serves corners and free kicks into the attacking area": "deliver-dead-ball",
  "plays forward toward an available runner when the opening appears": "play-to-available-runner",
  "carries into the available space before releasing the ball": "carry-into-space",
  "keeps the ball close while moving under pressure": "carry-under-pressure",
  "sends the ball into the attacking area from a wide position": "send-wide-delivery",
  "moves into a position where an available pass can lead to a shot": "move-into-shot-position",
  "sets himself to shoot when the ball reaches him near goal": "set-for-finish",
  "accelerates when the route ahead opens": "accelerate-into-space",
  "holds his position through contact before continuing the play": "hold-through-contact",
  "restarts play toward an available teammate": "restart-to-teammate"
});

const HISTORICAL_ACTION_IDS = Object.freeze({
  "uses his body to protect the ball and brings a teammate into the move": "body-bring-teammate",
  "arrives on the move and gets his finish away before the nearest marker recovers": "moving-finish",
  "holds the dangerous lane until a teammate can apply pressure": "hold-danger-lane",
  "gets his shot away before the nearest defender can reset": "shoot-before-reset",
  "moves after passing so the team keeps a nearby outlet": "move-after-pass",
  "protects the centre of goal first and leaves his line only when he can reach the ball": "protect-centre-goal",
  "slows the approach, fixes his balance, and strikes without rushing": "composed-set-piece",
  "checks the runner over his shoulder before the final pass arrives": "check-runner",
  "receives side-on so his next pass can move forward": "receive-side-on",
  "moves into a clear supporting angle before pressure arrives": "supporting-angle",
  "keeps his first touch close enough to make the next action simple": "close-first-touch"
});

const CURRENT_QUALITY_ID_SET = new Set(Object.values(CURRENT_QUALITY_IDS));
const HISTORICAL_QUALITY_ID_SET = new Set(Object.values(HISTORICAL_QUALITY_IDS));
const CURRENT_ACTION_ID_SET = new Set(Object.values(CURRENT_ACTION_IDS));
const HISTORICAL_ACTION_ID_SET = new Set(Object.values(HISTORICAL_ACTION_IDS));
const STYLE_STRUCTURE_VARIANTS = Object.freeze({
  "paired-observation": "signature",
  "two-clues": "watch",
  "second-detail": "standout",
  "separating-clue": "separates",
  "repeated-evidence": "edge-comes",
  "example-another": "builds",
  "build-two-cues": "builds",
  "foundation-watch": "foundation",
  "different-phase": "key",
  "key-another": "key",
  "quality-defines-game": "quality-defines",
  "quality-defines": "quality-defines",
  "one-another": "standout",
  "two-cues": "watch",
  "role-guide": "role-guide",
  "legacy-three": "standout"
});

// Locale renderers receive the original structure ID rather than only the
// broader opener variant. Keeping this public lets locale QA prove that each
// editorial cadence remains distinct after translation.
export const GENERATED_PLAYER_NOTE_STRUCTURE_IDS = Object.freeze(
  Object.keys(STYLE_STRUCTURE_VARIANTS)
);

function getGeneratedStyleFromMetadata(options = {}) {
  const metadata = options.copyMeta;
  if (!metadata || metadata.origin !== "generated") return null;
  const historical = Boolean(options.historical);
  const qualityId = String(metadata.signatureId || metadata.signature || "").trim();
  const actionIds = metadata.actionIds || metadata.actions;
  const mention = String(options.localizedName || options.mention || "").trim();
  const role = String(metadata.roleGroup || metadata.role || "").trim();
  const confidence = metadata.confidence;
  const supportRelation = String(metadata.supportRelation || "").trim();
  const cadenceVariantId = String(metadata.cadenceVariantId || "").trim();
  const cadenceVariantIndex = Number.isInteger(metadata.cadenceVariantIndex)
    ? metadata.cadenceVariantIndex
    : -1;
  const supportingBeatIsRoleFallback =
    !historical && metadata.beatSources?.[1]?.kind === "role-fallback";
  const qualityIds = historical ? HISTORICAL_QUALITY_ID_SET : CURRENT_QUALITY_ID_SET;
  const validActionIds = historical ? HISTORICAL_ACTION_ID_SET : CURRENT_ACTION_ID_SET;
  const isHistoricalSemanticId = (id) => /^(?:gk|cb|fb|dm|mf|wing|fw|pl|penalty|impact|def)-[a-z0-9-]+$/u.test(id);
  const qualityIsKnown = qualityIds.has(qualityId) || (historical && isHistoricalSemanticId(qualityId));
  if (
    !mention ||
    !qualityIsKnown ||
    !Array.isArray(actionIds) ||
    actionIds.length !== 2 ||
    actionIds.some((id) => !validActionIds.has(id) && !(historical && isHistoricalSemanticId(id)))
  ) {
    return null;
  }
  const structure = String(metadata.structureId || "legacy-three").trim();
  return Object.freeze({
    kind: "style",
    historical,
    mention,
    qualityId,
    actionIds: Object.freeze([...actionIds]),
    variant: STYLE_STRUCTURE_VARIANTS[structure] || "standout",
    structure,
    cadenceVariantId,
    cadenceVariantIndex,
    role,
    confidence,
    supportRelation,
    supportingBeatIsRoleFallback
  });
}

function parseStyleOpener(value) {
  const watch = value.match(/^Watch (.+?) for (.+)$/u);
  if (watch) {
    return { mention: watch[1], quality: watch[2], variant: "watch" };
  }

  const possessive = value.match(
    /^(.+?)(?:'s|’s) (signature is|edge is|style is built around) (.+)$/u
  );
  if (possessive) {
    const variants = {
      "signature is": "signature",
      "edge is": "edge",
      "style is built around": "style"
    };
    return {
      mention: possessive[1],
      quality: possessive[3],
      variant: variants[possessive[2]]
    };
  }

  const subject = value.match(/^(.+?) (stands out for|is defined by) (.+)$/u);
  if (subject) {
    return {
      mention: subject[1],
      quality: subject[3],
      variant: subject[2] === "stands out for" ? "standout" : "defined"
    };
  }

  return null;
}

const CURRENT_STYLE_NOTE_PATTERNS = Object.freeze([
  {
    pattern: /^(?<mention>.+?)(?:'s|’s) signature is (?<quality>.+)\. Watch how he (?<actionOne>.+?)(?:, (?:and notice when he|and how he) |\. (?:(?:In a separate phase|In another phase|Separately|Away from that moment|At another point in the move), he |He also |Another detail is how he ))(?<actionTwo>.+)\.$/u,
    variant: "signature",
    structure: "paired-observation"
  },
  {
    pattern: /^Watch (?<mention>.+?) for (?<quality>.+)\. (?:One clue is how he |The clearest example is how he )(?<actionOne>.+)\. (?:(?:Another appears when|Another is how|A separate clue is how|Also watch how|Also notice how) \k<mention> |(?:Away from that phase|Elsewhere|Beyond that example|In a different phase), \k<mention> )(?<actionTwo>.+)\.$/u,
    variant: "watch",
    structure: "two-clues"
  },
  {
    pattern: /^(?<mention>.+?) stands out for (?<quality>.+)\. He (?<actionOne>.+)\. (?:(?:A second detail|A different detail|Another part of his game|Another aspect) is how \k<mention> |\k<mention> also |(?:Also notice how|Also look at how) \k<mention> |(?:Outside that sequence|In a separate phase), \k<mention> )(?<actionTwo>.+)\.$/u,
    variant: "standout",
    structure: "second-detail"
  },
  {
    pattern: /^What separates (?<mention>.+?) is (?<quality>.+)\. \k<mention> (?<actionOne>.+?)(?:, while another clue is how he |\. (?:(?:In another phase|In another moment|At another point|In another phase of play|Away from that action), he |Also note how he |A separate detail appears when he ))(?<actionTwo>.+)\.$/u,
    variant: "separates",
    structure: "separating-clue"
  },
  {
    pattern: /^(?<mention>.+?)(?:'s|’s) (?<role>goalkeeper|defender|midfielder|forward|player) role begins with (?<quality>.+)\. In that duty, he (?<actionOne>.+)\. A separate role cue appears when he (?<actionTwo>.+)\.$/u,
    variant: "role-guide",
    structure: "role-guide"
  },
  {
    pattern: /^(?<mention>.+?)(?:'s|’s) edge comes from (?<quality>.+)\. You can see it (?:when he|in how he) (?<actionOne>.+), and again (?:when he|in how he) (?<actionTwo>.+)\.$/u,
    variant: "edge-comes",
    structure: "repeated-evidence"
  },
  {
    pattern: /^(?<mention>.+?) builds his game around (?<quality>.+)\. One example is how he (?<actionOne>.+)\. Another is how he (?<actionTwo>.+)\.$/u,
    variant: "builds",
    structure: "example-another"
  },
  {
    pattern: /^For (?<mention>.+?), the foundation is (?<quality>.+)\. Look first at how he (?<actionOne>.+)\. (?:(?:Also watch|Away from that phase, watch|In another phase, watch|Beyond that, watch) how he |Separately, look at how he |A separate point is how he |Beyond the first action, he )(?<actionTwo>.+)\.$/u,
    variant: "foundation",
    structure: "foundation-watch"
  },
  {
    pattern: /^The key to (?<mention>.+?) is (?<quality>.+)\. He (?<actionOne>.+?)(?:, and in a different phase he |\. (?:(?:In a different phase|In another phase|Elsewhere in the game), (?:he|\k<mention>) |There is another side to his game: he |One more thing to notice is how \k<mention> |A separate part of his game is how \k<mention> ))(?<actionTwo>.+)\.$/u,
    variant: "key",
    structure: "different-phase"
  },
  {
    pattern: /^(?<quality>.+) defines (?<mention>.+?)(?:'s|’s) game\. It shows when he (?<actionOne>.+)\. It matters again when he (?<actionTwo>.+)\.$/u,
    variant: "quality-defines",
    structure: "quality-defines-game"
  }
]);

const HISTORICAL_STYLE_NOTE_PATTERNS = Object.freeze([
  {
    pattern: /^Watch (?<mention>.+?) for (?<quality>.+)\. Two cues are how he (?<actionOne>.+) and how he (?<actionTwo>.+)\.$/u,
    variant: "watch",
    structure: "two-cues"
  },
  {
    pattern: /^(?<mention>.+?) builds his game around (?<quality>.+)\. Notice how he (?<actionOne>.+)\. A second cue is how he (?<actionTwo>.+)\.$/u,
    variant: "builds",
    structure: "build-two-cues"
  },
  {
    pattern: /^(?<quality>.+) defines the way (?<mention>.+?) plays\. Look for how he (?<actionOne>.+), and how he (?<actionTwo>.+)\.$/u,
    variant: "quality-defines",
    structure: "quality-defines"
  },
  {
    pattern: /^(?<mention>.+?) stands out for (?<quality>.+)\. One cue is how he (?<actionOne>.+)\. Another is how he (?<actionTwo>.+)\.$/u,
    variant: "standout",
    structure: "one-another"
  },
  {
    pattern: /^The key to (?<mention>.+?) is (?<quality>.+)\. He (?<actionOne>.+)\. Another part of his game appears when he (?<actionTwo>.+)\.$/u,
    variant: "key",
    structure: "key-another"
  },
  {
    pattern: /^For (?<mention>.+?), (?<quality>.+) is the foundation\. Look first at how he (?<actionOne>.+)\. Also watch how he (?<actionTwo>.+)\.$/u,
    variant: "foundation",
    structure: "foundation-watch"
  }
]);

function getSemanticId(ids, value) {
  const phrase = String(value || "").trim();
  const lowerFirst = phrase
    ? `${phrase[0].toLocaleLowerCase("en-US")}${phrase.slice(1)}`
    : "";
  return ids[phrase] || ids[lowerFirst] || "";
}

function getParsedStyleResult(fields, options = {}) {
  const historical = Boolean(options.historical);
  const qualityIds = historical ? HISTORICAL_QUALITY_IDS : CURRENT_QUALITY_IDS;
  const actionIds = historical ? HISTORICAL_ACTION_IDS : CURRENT_ACTION_IDS;
  const qualityId = getSemanticId(qualityIds, fields.quality);
  const actionIdsForNote = [
    getSemanticId(actionIds, fields.actionOne),
    getSemanticId(actionIds, fields.actionTwo)
  ];
  if (!fields.mention || !qualityId || actionIdsForNote.some((id) => !id)) {
    return null;
  }

  return Object.freeze({
    kind: "style",
    historical,
    mention: fields.mention,
    qualityId,
    actionIds: Object.freeze(actionIdsForNote),
    variant: fields.variant,
    structure: fields.structure,
    role: String(fields.role || "").trim()
  });
}

function parseStructuredStyleNote(text, options = {}) {
  const patterns = options.historical
    ? HISTORICAL_STYLE_NOTE_PATTERNS
    : CURRENT_STYLE_NOTE_PATTERNS;
  for (const { pattern, variant, structure } of patterns) {
    const groups = text.match(pattern)?.groups;
    if (!groups) continue;
    const parsed = getParsedStyleResult({ ...groups, variant, structure }, options);
    if (parsed) return parsed;
  }
  return null;
}

export function parseGeneratedPlayerStyleNote(value, options = {}) {
  const text = String(value || "").trim();
  const structured = parseStructuredStyleNote(text, options);
  if (structured) {
    return structured;
  }

  const match = text.match(/^(.+)\. He (.+)\. He (.+)\.$/u);
  if (!match) {
    return null;
  }

  const opener = parseStyleOpener(match[1]);
  if (!opener) {
    return null;
  }

  const historical = Boolean(options.historical);
  return getParsedStyleResult({
    mention: opener.mention,
    quality: opener.quality,
    actionOne: match[2],
    actionTwo: match[3],
    variant: opener.variant,
    structure: "legacy-three"
  }, { historical });
}

export function parseGeneratedHistoricalPlayerNote(value) {
  const text = String(value || "").trim();
  const match = text.match(
    /^(.+?)(?:'s|') (\d{4}) World Cup (.+?)\.(?: Credited with (\d+) World Cup goals?\.)?(?: Appears in (\d+) featured matches?\.)?$/u
  );
  if (!match) {
    return null;
  }

  return Object.freeze({
    kind: "historical-note",
    team: match[1],
    year: Number(match[2]),
    position: match[3],
    goals: match[4] ? Number(match[4]) : 0,
    featuredMatches: match[5] ? Number(match[5]) : 0
  });
}

export function parseGeneratedHistoricalPlayerSummary(value) {
  const text = String(value || "").trim();
  const match = text.match(
    /^Historical (\d{4}) World Cup card generated from scorer events, match appearances, tournament squads, and archive match notes\. Archive team: (.+)\.$/u
  );
  if (!match) {
    return null;
  }

  return Object.freeze({
    kind: "historical-summary",
    year: Number(match[1]),
    team: match[2]
  });
}

export function getGeneratedPlayerCardCopy(value, options = {}) {
  return (
    getGeneratedStyleFromMetadata(options) ||
    parseGeneratedPlayerStyleNote(value, options) ||
    (options.historical ? parseGeneratedHistoricalPlayerNote(value) : null) ||
    (options.historical ? parseGeneratedHistoricalPlayerSummary(value) : null)
  );
}

export function isGeneratedPlayerCardCopy(value, options = {}) {
  return Boolean(getGeneratedPlayerCardCopy(value, options));
}

function normalizePlayerSkill(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/&/gu, " and ")
    .replace(/[’']/gu, "")
    .replace(/[‐‑‒–—-]/gu, " ")
    .replace(/\b1v1\b/gu, "one on one")
    .replace(/\bone v one\b/gu, "one on one")
    .replace(/[^a-z0-9]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

const EXACT_PLAYER_SKILL_CATEGORIES = Object.freeze({
  "archive standout": "archive-standout",
  "historical lens": "historical-lens",
  player: "player-role",
  starter: "starter",
  "impact sub": "impact-sub",
  "counter defense": "transition-defense",
  "counter protection": "transition-defense",
  "inverted full back play": "inverted-full-back",
  "penalty area reactions": "penalty-box-reactions",
  "penalty pressure": "penalty-pressure",
  "set pieces": "set-piece-delivery",
  "second balls": "second-ball-work",
  "deep playmaking": "creativity",
  "ball shielding": "ball-control",
  "ball security": "ball-control",
  "ball retention": "ball-control",
  "fouls drawn": "fouls-won",
  "simple exits": "passing",
  "simple possession": "ball-control",
  "line holding": "defensive-control",
  "area control": "defensive-control",
  "switching play": "long-passing",
  "deep block organisation": "defensive-control",
  "game management": "tempo-control",
  "tactical fouls": "defensive-play",
  "long diagonals": "long-passing",
  "line breaking": "progressive-passing",
  "high ball command": "area-command",
  "low block patience": "composure",
  "quick reactions": "reactions",
  "quick turns": "dribbling",
  "quick feet": "dribbling",
  "through ball vision": "chance-creation",
  "commanding frame": "physical-duels",
  "target man chaos": "combination-play",
  "goalkeeper potential": "goalkeeper-potential",
  "one on one control": "ball-control",
  "pressure release": "press-resistance",
  "early interceptions": "ball-winning",
  "aggressive stepping": "defensive-positioning",
  "low centre turns": "dribbling",
  "left footed transitions": "counterattacking",
  "interior control": "tempo-control",
  "left footed cut ins": "dribbling",
  "left footed control": "ball-control",
  "interior intensity": "work-rate",
  "shot creation": "chance-creation",
  "box presence": "goal-threat",
  "penalty area presence": "goal-threat",
  "penalty box presence": "goal-threat",
  "aerial box presence": "aerial-finishing",
  "aerial presence": "aerial-duels",
  "aerial reach": "aerial-duels",
  "wide pressure": "pressing"
});

const PLAYER_SKILL_CATEGORY_RULES = Object.freeze([
  ["squad-depth", /\bdepth\b/u],
  ["penalty-saving", /\bpenalt(?:y|ies)\b.*\b(?:save|saves|saving|stopping|reaction|reactions)\b/u],
  ["cross-command", /\bcross(?:es|ing)?\b.*\b(?:claim|claiming|handling|command)\b|\b(?:claim|claiming|handling|command)\b.*\bcross(?:es|ing)?\b/u],
  ["goalkeeper-distribution", /\b(?:goalkeeper|keeper)\b.*\b(?:distribution|passing|restart|restarts|build up|buildup)\b|\b(?:distribution|passing|restart|restarts|build up|buildup)\b.*\b(?:goalkeeper|keeper)\b/u],
  ["sweeper-goalkeeping", /\b(?:sweeper|starting position|high starting position|off line|outside box)\b/u],
  ["goalkeeper-potential", /\b(?:goalkeeper|keeper)\b.*\b(?:upside|young|youth|development|projection|future)\b/u],
  ["goalkeeper-reach", /\b(?:goalkeeper|keeper|penalty area)\b.*\breach\b|\breach\b.*\b(?:goalkeeper|keeper|penalty area)\b/u],
  ["area-command", /\b(?:goalkeeper|keeper)\b.*\bcommand\b|\b(?:box|penalty area|penalty box|aerial|high ball)\b.*\bcommand\b|\bcommand\b.*\b(?:goalkeeper|keeper)\b/u],
  ["reactions", /\b(?:reaction saves|reflex saves|goalkeeper reactions|keeper reactions|goalkeeper reflexes|keeper reflexes)\b/u],
  ["shot-stopping", /\b(?:shot stopping|save|saves|saving|reflex|reflexes|goalkeeping|goalkeeper reactions|keeper reactions)\b/u],
  ["set-piece-defending", /\bset pieces?\b.*\b(?:defense|defending|defensive|marking|clearance|clearances|cover)\b/u],
  ["set-piece-threat", /\bset pieces?\b.*\b(?:threat|presence|attack|attacks|finishing|scoring|target|targets|power|strength|toughness)\b/u],
  ["set-piece-delivery", /\bset pieces?\b|\bdead ball\b/u],
  ["goal-threat", /\bgoal\b.*\b(?:threat|danger|scoring|presence)\b|\bscoring (?:record|threat)\b/u],
  ["aerial-finishing", /\baerial\b.*\b(?:finishing|finish|scoring|threat|target|targets|attack|attacks|arrival|arrivals|presence)\b/u],
  ["first-time-finishing", /\bfirst time\b.*\b(?:finishing|finish|shot|shots|shooting)\b/u],
  ["box-finishing", /\b(?:penalty box|penalty area|box)\b.*\b(?:finishing|finish|shot|shots|shooting)\b/u],
  ["long-range-shooting", /\b(?:long range|long|distance|box edge)\b.*\b(?:shot|shots|shooting)\b/u],
  ["finishing", /\b(?:finishing|finish|finisher|finishers|shooting|shot|shots|scoring)\b/u],
  ["near-post-runs", /\bnear post\b.*\b(?:movement|runs|running|arrivals|timing|attack|attacks)\b/u],
  ["penalty-box-movement", /\b(?:penalty box|penalty area|box|near post|back post)\b.*\b(?:movement|runs|running|arrivals|timing|positioning|attack|attacks|entries|entry)\b/u],
  ["inside-runs", /\b(?:inside|interior)\b.*\b(?:runs|running|movement|arrivals)\b/u],
  ["channel-runs", /\bchannels?\b.*\b(?:runs|running|movement)|\b(?:runs|running|movement)\b.*\bchannels?\b/u],
  ["recovery-defending", /\brecovery\b|\brecovering\b/u],
  ["pressing", /\b(?:press|pressing|counter pressing|counter pressure)\b/u],
  ["overlapping", /\b(?:overlap|overlaps|width|wide support|support angles)\b/u],
  ["counterattacking", /\b(?:counter|transition)\b/u],
  ["attacking-runs", /\b(?:runs|running|movement|arrivals|surges|in behind|behind|channel|channels|off ball)\b/u],
  ["cross-defending", /\bcross(?:es|ing)?\b.*\b(?:block|blocking|defend|defending|prevention)\b/u],
  ["crossing", /\b(?:cross|crosses|crossing|delivery|service)\b/u],
  ["press-resistance", /\b(?:press resistance|press escape|pressure escape|pressure escapes|under pressure|tight space)\b/u],
  ["dribbling", /\b(?:dribbling|dribble|one on one attacks|inside cuts|cut inside|take ons|take on)\b/u],
  ["final-pass", /\b(?:final pass|final passes|final ball)\b/u],
  ["creativity", /\b(?:creative|creativity|craft|invention|spark|playmaking)\b/u],
  ["chance-passes", /\bchance passes?\b/u],
  ["chance-creation", /\b(?:chance|creation|key pass|key passes|through ball)\b/u],
  ["ball-carrying", /\b(?:carrying|carries|carry|ball progression|progressive runs)\b/u],
  ["ball-control", /\b(?:close control|first touch|touch|receiving|receive|ball control)\b/u],
  ["long-passing", /\blong\b.*\b(?:passing|passes|pass|distribution)\b/u],
  ["short-passing", /\b(?:short|simple|calm)\b.*\b(?:passing|passes|pass|circulation|distribution|progression)\b/u],
  ["progressive-passing", /\b(?:progressive|forward|line breaking|vertical|deep)\b.*\b(?:passing|passes|pass|distribution|progression)\b/u],
  ["passing", /\b(?:passing|passes|pass|distribution|circulation|outlet|outlets|progression)\b/u],
  ["build-up", /\b(?:build up|buildup|restarts|restart)\b/u],
  ["tempo-control", /\b(?:tempo|rhythm|circulation|game control|midfield control|central control)\b/u],
  ["midfield-screening", /\b(?:screening|holding midfield|midfield protection|defensive midfield|central protection)\b/u],
  ["ball-winning", /\b(?:ball winning|ball recovery|recovery tackles|tackles|tackling|front foot)\b/u],
  ["second-ball-work", /\bsecond ball\b/u],
  ["versatility", /\b(?:versatility|flexibility|multi role|two footed|two way)\b/u],
  ["aerial-defending", /\baerial\b.*\b(?:defending|defensive|cover|clearance|clearances|marking)\b/u],
  ["aerial-duels", /\baerial\b/u],
  ["clearances", /\bclearance|clearances\b/u],
  ["marking", /\bmarking\b/u],
  ["one-on-one-defending", /\bone on one\b.*\b(?:defending|defensive|pressure|duels?)\b/u],
  ["wide-defending", /\b(?:wide|wing|wing back|full back|left back|right back|left side|right side)\b.*\b(?:defending|defensive|cover|coverage|recovery|marking|discipline)\b/u],
  ["box-defending", /\b(?:box|penalty area|back post)\b.*\b(?:defending|defensive|protection|cover|clearance|clearances|organization)\b/u],
  ["defensive-leadership", /\b(?:defensive|centre back|back line|line|goalkeeper)\b.*\b(?:leadership|organization|command|instructions)\b/u],
  ["defensive-cover", /\b(?:cover|coverage|protection|screen|screening)\b/u],
  ["defensive-control", /\b(?:line control|duel control|defensive control|back line control|centre back control)\b/u],
  ["physical-duels", /\b(?:duel|duels|physical|strength|power|size|contact|battles)\b/u],
  ["experience", /\b(?:experience|veteran|tournament|domestic|big game)\b/u],
  ["potential", /\b(?:upside|young|youth|teenage|development|projection|future)\b/u],
  ["composure", /\b(?:composure|calm|balance|discipline|timing|decision|decisions|reliability|patience)\b/u],
  ["work-rate", /\b(?:work rate|work|energy|engine|effort|running range|box to box|two way|intensity|legs|drive)\b/u],
  ["pace", /\b(?:pace|speed|acceleration|explosive|mobility|bursts)\b/u],
  ["defensive-positioning", /\b(?:defending|defensive|positioning|back line|centre back|center back|counter stopping)\b/u],
  ["physical-duels", /\b(?:presence|reach|bite)\b/u],
  ["combination-play", /\b(?:combination|combinations|link|linking|support|hold up|target play|target forward|bring teammates)\b/u],
  ["leadership", /\b(?:leadership|organization|communication|captain)\b/u],
  ["wide-play", /\b(?:wide|wing|flank|left side|right side)\b/u],
  ["midfield-play", /\b(?:midfield|central|between lines|pocket)\b/u],
  ["attacking-play", /\b(?:forward|striker|attack|attacking|box|goal|penalty)\b/u],
  ["defensive-play", /\b(?:defense|defence|defender|back)\b/u],
  ["player-strength", /.+/u]
]);

export function getPlayerSkillCategory(value) {
  const normalized = normalizePlayerSkill(value);
  if (!normalized) {
    return "";
  }
  const exact = EXACT_PLAYER_SKILL_CATEGORIES[normalized];
  if (exact) {
    return exact;
  }
  return (
    PLAYER_SKILL_CATEGORY_RULES.find(([, pattern]) => pattern.test(normalized))?.[0] || ""
  );
}
