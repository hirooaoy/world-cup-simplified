export const DATA_VERSION = "2026-07-21-player-club-context-1";

export const DATA_URLS = Object.freeze({
  adminMessage: `data/admin-message.json?v=${DATA_VERSION}`,
  fixtures: `data/fixtures.json?v=${DATA_VERSION}`,
  history: `data/history.json?v=${DATA_VERSION}`,
  historicalRankings: `data/historical-rankings.json?v=${DATA_VERSION}`,
  historicalPlayerProfiles: `data/historical-player-profiles.json?v=${DATA_VERSION}`,
  coachProfiles: `data/coach-profiles.json?v=${DATA_VERSION}`,
  editionLifecycle: `data/edition-lifecycle.json?v=${DATA_VERSION}`,
  lineups: `data/lineups.json?v=${DATA_VERSION}`,
  expectedLineups: `data/expected-lineups.json?v=${DATA_VERSION}`,
  playerAvailability: `data/player-availability.json?v=${DATA_VERSION}`,
  liveData: `api/live-data?v=${DATA_VERSION}`,
  playerProfiles: `data/player-profiles.json?v=${DATA_VERSION}`,
  releaseNotes: "data/release-notes.json?v=2026-07-21-date-transitions-2",
  standings: `data/standings.json?v=${DATA_VERSION}`,
  teams: `data/teams.json?v=${DATA_VERSION}`,
  tournament: `data/tournament.json?v=${DATA_VERSION}`
});

export const LANGUAGE_STORAGE_KEY = "world-cup-simplified-language";
export const SITE_ORIGIN = "https://world-cup-simplified.vercel.app";
export const SITE_SOCIAL_IMAGE = `${SITE_ORIGIN}/assets/site-thumbnail.png?v=2026-06-17-1213`;
export const HOME_SEO = Object.freeze({
  en: {
    title: "World Cup Simplified",
    description:
      "Explore the completed 2026 World Cup with all 104 results, verified lineups, standings, concise recaps, official highlights, awards, and tournament history."
  },
  zh: {
    title: "2026世界杯赛程、赛果、积分榜与阵容 | 世界杯简明指南",
    description:
      "回顾已结束的2026世界杯：全部104场赛果、已验证阵容、积分榜、简明回顾、官方集锦、奖项与赛事历史。"
  }
});
export const TIMEZONE_STORAGE_KEY = "world-cup-simplified-timezone";
export const TIMEZONE_MODE_STORAGE_KEY = "world-cup-simplified-timezone-mode";
export const DEVICE_TIMEZONE_STORAGE_VALUE = "device";
export const RECENT_TIMEZONES_STORAGE_KEY = "world-cup-simplified-recent-timezones";
export const SHOW_YESTERDAY_STORAGE_KEY = "world-cup-simplified-show-yesterday";
export const JUGGLE_RECORD_STORAGE_KEY = "world-cup-simplified-juggle-record";
export const ADMIN_MESSAGE_DISMISS_STORAGE_PREFIX = "world-cup-simplified-admin-message-dismissed:";
export const ADMIN_MESSAGE_COLLAPSE_DURATION_MS = 280;
export const OFFICIAL_HIGHLIGHT_VIDEO_CHANNELS = new Map([
  ["UCwNqHDsnBCKT-olwJwIFyfg", "FOX Sports"],
  ["UCpcTrCXblq78GZrTUTLWeBw", "FIFA"]
]);
export const FIFA_SCHEDULE_RESULTS_URL = "https://www.fifa.com";
export const TEAM_SEARCH_URL_UPDATE_DELAY_MS = 180;
export const JUGGLE_BALL_EMOJI = "⚽";
export const JUGGLE_FALL_SPEED = 420;
export const JUGGLE_GRAVITY = 1060;
export const JUGGLE_POINTER_HIT_RADIUS_MULTIPLIER = 1.55;
export const JUGGLE_TOUCH_HIT_RADIUS_MULTIPLIER = 1.72;
export const JUGGLE_HIT_LEAD_SECONDS = 0.05;
export const JUGGLE_CLICK_BLOCK_MS = 650;
export const JUGGLE_DIFFICULTY_STEP = 5;
export const JUGGLE_MAX_DIFFICULTY_LEVEL = 7;
export const JUGGLE_GRAVITY_LEVEL_MULTIPLIER = 0.08;
export const JUGGLE_KICK_LEVEL_MULTIPLIER = 0.03;
export const JUGGLE_LATERAL_LEVEL_MULTIPLIER = 0.06;
export const JUGGLE_WALL_BOUNCE_BASE_MULTIPLIER = 0.82;
export const JUGGLE_WALL_BOUNCE_LEVEL_MULTIPLIER = 0.028;
export const JUGGLE_WALL_BOUNCE_DRIFT = 32;
export const JUGGLE_WALL_BOUNCE_LEVEL_DRIFT = 8;
export const JUGGLE_WALL_BOUNCE_DROP_SPEED = 18;
export const JUGGLE_WALL_BOUNCE_LEVEL_DROP_SPEED = 3;
export const JUGGLE_WALL_BOUNCE_SPIN = 185;
export const JUGGLE_WALL_BOUNCE_LEVEL_SPIN = 22;
export const JUGGLE_MAX_FRAME_SECONDS = 0.04;
export const JUGGLE_SOUND_DURATION_SECONDS = 0.08;
