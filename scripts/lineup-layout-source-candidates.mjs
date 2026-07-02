export const TRUSTED_SOURCE_CANDIDATES_BY_FIXTURE = {
  "match-82-round-of-32-2026-07-01": [
    {
      name: "ESPN",
      adapter: "espn",
      url: "https://www.espn.co.uk/football/match/_/gameId/760493/senegal-belgium"
    },
    {
      name: "FotMob",
      adapter: "fotmob",
      url: "https://www.fotmob.com/matches/senegal-vs-belgium/1rywdm"
    },
    {
      name: "SofaScore",
      adapter: "sofascore",
      url: "https://www.sofascore.com/football/match/senegal-belgium/rUbsOUb"
    },
    {
      name: "BBC Sport",
      adapter: "bbc",
      url: "https://www.bbc.com/sport/football/live/cx2j5p9"
    },
    {
      name: "Concacaf",
      adapter: "concacaf",
      url: "https://www.concacaf.com/competitions/fifa-world-cup/matches/8ec2ae6a1b1246f4b398626f7f1c3040/belgium-vs-senegal/lineups"
    }
  ],
  "match-80-round-of-32-2026-07-01": [
    {
      name: "ESPN",
      adapter: "espn",
      url: "https://www.espn.com/soccer/match/_/gameId/760495/congo-dr-england"
    },
    {
      name: "FotMob",
      adapter: "fotmob",
      url: "https://www.fotmob.com/matches/dr-congo-vs-england/1tbjj5"
    }
  ],
  "match-81-round-of-32-2026-07-01": [
    {
      name: "ESPN",
      adapter: "espn",
      url: "https://www.espn.com/soccer/match/_/gameId/760494/bosnia-herzegovina-united-states"
    },
    {
      name: "FotMob",
      adapter: "fotmob",
      url: "https://www.fotmob.com/matches/usa-vs-bosnia-herzegovina/2c7uzr"
    }
  ],
  "match-84-round-of-32-2026-07-02": [
    {
      name: "ESPN",
      adapter: "espn",
      url: "https://www.espn.com/soccer/match/_/gameId/760497/austria-spain"
    },
    {
      name: "FotMob",
      adapter: "fotmob",
      url: "https://www.fotmob.com/matches/spain-vs-austria/i9x9deku"
    }
  ]
};

export function getSourceCandidatesForFixture(fixtureId) {
  return TRUSTED_SOURCE_CANDIDATES_BY_FIXTURE[fixtureId];
}
