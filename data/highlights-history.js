import { getHistoricalHonourableReason } from "./historical-best-xi-honourable-reasons.js?v=2026-07-21-best-xi-rebuild-2";
import { ENGLAND_FLAG } from "../team-flag-data.js?v=2026-07-21-shared-historical-flags-1";

const HISTORICAL_COACH_PORTRAITS = Object.freeze({
  "Alberto Suppici": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Suppici.jpg?width=640",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Suppici.jpg",
    imageCredit: "El Gráfico",
    imageLicense: "PD-old on Commons; United States status not stated"
  }),
  "Vittorio Pozzo": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Vittorio_Pozzo_allenatore.jpg?width=640",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Vittorio_Pozzo_allenatore.jpg",
    imageCredit: "Unknown photographer / Film Commission Torino Piemonte",
    imageLicense: "Public Domain Mark on Commons; United States status not stated"
  }),
  "Juan López Fontana": Object.freeze({
    imageUrl: "https://www.national-football-teams.com/media/cache/players_page/uploads/person_photos/Jose_Lopez_Fontana_53733-604452e9c165b.jpeg",
    imageSourceUrl: "https://www.national-football-teams.com/coach/53733/Juan_Lopez_Fontana.html",
    imageCredit: "Jorge Mendoza / National Football Teams",
    imageLicense: "Not stated by source"
  }),
  "Sepp Herberger": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Sepp_Herberger%2C_Duitse_bondstrainer_op_tribune%2C_Bestanddeelnr_908-4125_%28cropped%29.jpg?width=640",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Sepp_Herberger%2C_Duitse_bondstrainer_op_tribune%2C_Bestanddeelnr_908-4125_%28cropped%29.jpg",
    imageCredit: "Wim van Rossem / Anefo, Nationaal Archief",
    imageLicense: "CC0 1.0"
  }),
  "Vicente Feola": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Vicente_feola_dt.jpg?width=640",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Vicente_feola_dt.jpg",
    imageCredit: "Unknown photographer / Historia de Boca",
    imageLicense: "Public domain in Argentina; United States status not stated"
  }),
  "Aymoré Moreira": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Aymor%C3%A9_Moreira_%281963%29.png?width=640",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Aymor%C3%A9_Moreira_%281963%29.png",
    imageCredit: "Hugo van Gelderen / Anefo, Nationaal Archief",
    imageLicense: "CC BY-SA 3.0 NL"
  }),
  "Alf Ramsey": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Alf_Ramsey_%281969%29.jpg?width=640",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Alf_Ramsey_%281969%29.jpg",
    imageCredit: "Bert Verhoeff / Anefo, Nationaal Archief",
    imageLicense: "CC BY-SA 3.0 NL"
  }),
  "Mário Zagallo": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/M%C3%A1rio_Zagallo_1974.jpg?width=640",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:M%C3%A1rio_Zagallo_1974.jpg",
    imageCredit: "Rob Mieremet / Anefo, Nationaal Archief",
    imageLicense: "CC BY-SA 3.0 NL"
  }),
  "Rinus Michels": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Koppen_Nederlandse_voetballers_Rinus_Michels%2C_Bestanddeelnr_254-9536_2.jpg?width=640",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Koppen_Nederlandse_voetballers_Rinus_Michels%2C_Bestanddeelnr_254-9536_2.jpg",
    imageCredit: "Rob Mieremet / Anefo, Nationaal Archief",
    imageLicense: "CC0 1.0"
  }),
  "César Luis Menotti": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Cesar_menotti_smoking.jpg?width=640",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Cesar_menotti_smoking.jpg",
    imageCredit: "El Gráfico",
    imageLicense: "Public domain in Argentina"
  }),
  "Enzo Bearzot": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Enzo_Bearzot_2.jpg?width=320",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Enzo_Bearzot_2.jpg",
    imageCredit: "Panini",
    imageLicense: "Public domain in Italy"
  }),
  "Carlos Bilardo": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Narig%C3%B3n_Bilardo_1986.jpg?width=320",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Narig%C3%B3n_Bilardo_1986.jpg",
    imageCredit: "El Gráfico",
    imageLicense: "Public domain in Argentina and the United States"
  }),
  "Franz Beckenbauer": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Trainer_Franz_Beckenbauer%2C_Bestanddeelnr_934-4443.jpg?width=320",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Trainer_Franz_Beckenbauer,_Bestanddeelnr_934-4443.jpg",
    imageCredit: "Rob Bogaerts / Anefo, Nationaal Archief",
    imageLicense: "CC0 1.0"
  }),
  "Carlos Alberto Parreira": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/C_A_Parreira.JPG?width=320",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:C_A_Parreira.JPG",
    imageCredit: "Wilson Dias / Agência Brasil",
    imageLicense: "CC BY 3.0 BR"
  }),
  "Aimé Jacquet": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Aim%C3%A9_Jacquet_2006.jpg?width=320",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Aim%C3%A9_Jacquet_2006.jpg",
    imageCredit: "Christophe95",
    imageLicense: "CC BY-SA 3.0"
  }),
  "Luiz Felipe Scolari": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Luiz_Felipe_Scolari.jpeg?width=320",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Luiz_Felipe_Scolari.jpeg",
    imageCredit: "José Cruz / Agência Brasil",
    imageLicense: "CC BY 3.0 BR"
  }),
  "Marcello Lippi": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Marcello_Lippi_by_Martina_De_Siervo_-_International_Journalism_Festival_2010.jpg?width=320",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Marcello_Lippi_by_Martina_De_Siervo_-_International_Journalism_Festival_2010.jpg",
    imageCredit: "International Journalism Festival / Martina De Siervo",
    imageLicense: "CC BY-SA 2.0"
  }),
  "Vicente del Bosque": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Vicente_del_Bosque_-_Teamchef_Spain_%2801%29.jpg?width=320",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Vicente_del_Bosque_-_Teamchef_Spain_%2801%29.jpg",
    imageCredit: "Steindy",
    imageLicense: "CC BY-SA 3.0"
  }),
  "Joachim Löw": Object.freeze({
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Joachim_L%C3%B6w%2C_Germany_national_football_team_%2803%29.jpg?width=320",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Joachim_L%C3%B6w,_Germany_national_football_team_%2803%29.jpg",
    imageCredit: "Steindy",
    imageLicense: "CC BY-SA 3.0"
  })
});

const HISTORICAL_COACH_CARD_DETAILS = Object.freeze({
  1930: Object.freeze({
    ageAtTournament: 31,
    sinceYear: 1928,
    styles: Object.freeze(["Tactical flexibility", "Attacking freedom", "Game management"])
  }),
  1934: Object.freeze({
    ageAtTournament: 48,
    sinceYear: 1929,
    styles: Object.freeze(["Midfield control", "Tactical flexibility", "Game management"])
  }),
  1938: Object.freeze({
    ageAtTournament: 52,
    sinceYear: 1929,
    styles: Object.freeze(["Counter-attack", "Tactical flexibility", "Attacking freedom"])
  }),
  1950: Object.freeze({
    ageAtTournament: 42,
    sinceYear: 1946,
    styles: Object.freeze(["Compact defending", "Counter-attack", "Game management"])
  }),
  1954: Object.freeze({
    ageAtTournament: 57,
    sinceYear: 1950,
    styles: Object.freeze(["Squad rotation", "Compact defending", "Counter-attack"])
  }),
  1958: Object.freeze({
    ageAtTournament: 48,
    sinceYear: 1958,
    styles: Object.freeze(["Tactical flexibility", "Attacking freedom", "Defensive organization"])
  }),
  1962: Object.freeze({
    ageAtTournament: 50,
    sinceYear: 1961,
    styles: Object.freeze(["Tactical flexibility", "Wing play", "Attacking freedom"])
  }),
  1966: Object.freeze({
    ageAtTournament: 46,
    sinceYear: 1963,
    styles: Object.freeze(["Midfield control", "Compact defending", "Coordinated pressing"])
  }),
  1970: Object.freeze({
    ageAtTournament: 38,
    sinceYear: 1970,
    styles: Object.freeze(["Attacking freedom", "Midfield control", "Coordinated pressing"])
  }),
  1974: Object.freeze({
    ageAtTournament: 46,
    sinceYear: 1974,
    styles: Object.freeze(["Coordinated pressing", "Positional rotation", "Attacking freedom"])
  }),
  1978: Object.freeze({
    ageAtTournament: 39,
    sinceYear: 1974,
    styles: Object.freeze(["Attacking freedom", "Wing play", "Midfield control"])
  }),
  1982: Object.freeze({
    ageAtTournament: 54,
    sinceYear: 1975,
    styles: Object.freeze(["Compact defending", "Transition control", "Game management"])
  }),
  1986: Object.freeze({
    ageAtTournament: 48,
    sinceYear: 1983,
    styles: Object.freeze(["Back-three structure", "Attacking freedom", "Wing play"])
  }),
  1990: Object.freeze({
    ageAtTournament: 44,
    sinceYear: 1984,
    styles: Object.freeze(["Back-three structure", "Wing play", "Attacking freedom"])
  }),
  1994: Object.freeze({
    ageAtTournament: 51,
    sinceYear: 1991,
    styles: Object.freeze(["Midfield control", "Compact defending", "Transition control"])
  }),
  1998: Object.freeze({
    ageAtTournament: 56,
    sinceYear: 1993,
    styles: Object.freeze(["Compact defending", "Tactical flexibility", "Set-piece focus"])
  }),
  2002: Object.freeze({
    ageAtTournament: 53,
    sinceYear: 2001,
    styles: Object.freeze(["Back-three structure", "Wing play", "Attacking freedom"])
  }),
  2006: Object.freeze({
    ageAtTournament: 58,
    sinceYear: 2004,
    styles: Object.freeze(["Squad rotation", "Tactical flexibility", "Bold substitutions"])
  }),
  2010: Object.freeze({
    ageAtTournament: 59,
    sinceYear: 2008,
    styles: Object.freeze(["Possession control", "Midfield control", "Game management"])
  }),
  2014: Object.freeze({
    ageAtTournament: 54,
    sinceYear: 2006,
    styles: Object.freeze(["Tactical flexibility", "Attacking freedom", "Squad rotation"])
  }),
  2018: Object.freeze({
    ageAtTournament: 49,
    sinceYear: 2012,
    styles: Object.freeze(["Compact defending", "Transition control", "Tactical flexibility"])
  }),
  2022: Object.freeze({
    ageAtTournament: 44,
    sinceYear: 2018,
    styles: Object.freeze(["Tactical flexibility", "Midfield control", "Game management"])
  })
});

export const HISTORICAL_STORY_PROFILE_OVERRIDES = Object.freeze({
  "1954|Just Fontaine": Object.freeze({
    profileYear: 1958,
    styleNote: "Fontaine builds his game around attacking the space behind defenders before it fully opens. Notice how he arrives on the move and gets his finish away before the nearest marker recovers. A second cue is how he uses his body to protect the ball and brings a teammate into the move.",
    styleNoteZh: "他的比赛建立在对防线身后空当的提前攻击上。留意他如何移动中进入射门位置，并在最近的盯防者回位前完成终结。第二个线索是他如何用身体护住球，再让队友加入进攻。",
    styleNoteMeta: Object.freeze({
      origin: "authored",
      version: "historical-style-authored-v1",
      role: "striker",
      signature: "attack-space-behind",
      actions: Object.freeze(["moving-finish", "body-bring-teammate"]),
      sources: Object.freeze(["editorial-story"]),
      evidence: Object.freeze(["editorial-story"]),
      confidence: "editorial",
      structureId: "build-two-cues"
    })
  }),
  "1998|Roberto Ayala": Object.freeze({
    profileYear: 2006,
    tournamentYear: 1998,
    tournamentYears: Object.freeze([1998]),
    teamName: "Argentina",
    teams: Object.freeze(["Argentina"]),
    position: "Centre-back",
    club: "Napoli",
    clubAtTournament: "Napoli",
    clubAtTournamentSource: "fjelstul-worldcup-wikipedia-squad-pages-35a8667",
    clubAtTournamentSourceUrl: "https://github.com/jfjelstul/worldcup/blob/35a8667f518b07469182ae16d35574dd0e7a00fb/data-raw/Wikipedia-squad-pages/men-1998-squads.html",
    skills: Object.freeze(["Positioning", "Aerial defending", "Recovery pace"]),
    styleNote: "Ayala stands out for using contact without losing his defensive position. One cue is how he holds the dangerous lane until a teammate can apply pressure. Another is how he checks the runner over his shoulder before the final pass arrives.",
    styleNoteZh: "阿亚拉的突出特点，是身体对抗中不丢失防守位置。一个细节是他会守住危险线路，直到队友能对持球人施压。另一个细节是他会在最后一传到来前回头确认跑动者的位置。",
    styleNoteMeta: Object.freeze({
      origin: "authored",
      version: "historical-style-authored-v1",
      role: "centre-back",
      signature: "contact-with-position",
      actions: Object.freeze(["hold-danger-lane", "check-runner"]),
      sources: Object.freeze(["editorial-story"]),
      evidence: Object.freeze(["editorial-story"]),
      confidence: "editorial",
      structureId: "one-another"
    }),
    note: "Argentina's 1998 World Cup centre-back. His late duel with Dennis Bergkamp decided the quarter-final.",
    noteZh: "他是阿根廷队在1998年世界杯的中后卫；四分之一决赛最后时刻，他与丹尼斯·博格坎普的对决决定了比赛。"
  }),
  "2002|Kleberson": Object.freeze({
    name: "Kleberson",
    displayName: "Kleberson",
    historical: true,
    sourceId: "historical-story-profile-2026-07-21",
    tournamentYear: 2002,
    tournamentYears: Object.freeze([2002]),
    teamName: "Brazil",
    teams: Object.freeze(["Brazil"]),
    position: "Central midfielder",
    club: "Atlético Paranaense",
    clubAtTournament: "Atlético Paranaense",
    clubAtTournamentSource: "fjelstul-worldcup-wikipedia-squad-pages-35a8667",
    clubAtTournamentSourceUrl: "https://github.com/jfjelstul/worldcup/blob/35a8667f518b07469182ae16d35574dd0e7a00fb/data-raw/Wikipedia-squad-pages/men-2002-squads.html",
    skills: Object.freeze(["Progressive passing", "Box-to-box running", "Chance creation"]),
    styleNote: "For Kleberson, shaping the pace of the game from midfield is the foundation. Look first at how he moves after passing so the team keeps a nearby outlet. Also watch how he receives side-on so his next pass can move forward.",
    styleNoteZh: "对克莱伯森来说，掌控中场比赛节奏是比赛基础。先看他如何传球后继续移动，让球队始终保留近距离出球点。也看他如何侧身接球，让下一脚传球可以向前发展。",
    styleNoteMeta: Object.freeze({
      origin: "authored",
      version: "historical-style-authored-v1",
      role: "central-midfielder",
      signature: "shape-midfield-tempo",
      actions: Object.freeze(["move-after-pass", "receive-side-on"]),
      sources: Object.freeze(["editorial-story"]),
      evidence: Object.freeze(["editorial-story"]),
      confidence: "editorial",
      structureId: "foundation-watch"
    }),
    note: "Brazil's 2002 World Cup central midfielder. He started the last three matches and helped create Ronaldo's second goal in the final.",
    noteZh: "他是巴西队在2002年世界杯的中前卫，最后三场全部首发，并参与制造了罗纳尔多在决赛中的第二粒进球。"
  }),
  "2010|Cesc Fàbregas": Object.freeze({
    profileYear: 2006,
    tournamentYear: 2010,
    tournamentYears: Object.freeze([2010]),
    teamName: "Spain",
    teams: Object.freeze(["Spain"]),
    position: "Central midfielder",
    club: "Arsenal",
    clubAtTournament: "Arsenal",
    clubAtTournamentSource: "fjelstul-worldcup-wikipedia-squad-pages-35a8667",
    clubAtTournamentSourceUrl: "https://github.com/jfjelstul/worldcup/blob/35a8667f518b07469182ae16d35574dd0e7a00fb/data-raw/Wikipedia-squad-pages/men-2010-squads.html",
    skills: Object.freeze(["Line-breaking passing", "Tempo control", "Final-third vision"]),
    styleNote: "Shaping the pace of the game from midfield defines the way Fàbregas plays. Look for how he receives side-on so his next pass can move forward, and how he moves after passing so the team keeps a nearby outlet.",
    styleNoteZh: "掌控中场比赛节奏定义了法布雷加斯的比赛方式。观察他如何侧身接球，让下一脚传球可以向前发展，也观察他如何传球后继续移动，让球队始终保留近距离出球点。",
    styleNoteMeta: Object.freeze({
      origin: "authored",
      version: "historical-style-authored-v1",
      role: "central-midfielder",
      signature: "shape-midfield-tempo",
      actions: Object.freeze(["receive-side-on", "move-after-pass"]),
      sources: Object.freeze(["editorial-story"]),
      evidence: Object.freeze(["editorial-story"]),
      confidence: "editorial",
      structureId: "quality-defines"
    }),
    note: "Spain's 2010 World Cup central midfielder. From the bench, he supplied the pass for Andrés Iniesta's winning goal in the final.",
    noteZh: "他是西班牙队在2010年世界杯的中前卫，并在决赛替补登场后助攻安德烈斯·伊涅斯塔打进制胜球。"
  }),
  "2022|Sofiane Boufal": Object.freeze({
    name: "Sofiane Boufal",
    displayName: "Sofiane Boufal",
    historical: true,
    sourceId: "historical-story-profile-2026-07-21",
    tournamentYear: 2022,
    tournamentYears: Object.freeze([2022]),
    teamName: "Morocco",
    teams: Object.freeze(["Morocco"]),
    position: "Left winger",
    club: "Angers",
    clubAtTournament: "Angers",
    clubAtTournamentSource: "fjelstul-worldcup-wikipedia-squad-pages-35a8667",
    clubAtTournamentSourceUrl: "https://github.com/jfjelstul/worldcup/blob/35a8667f518b07469182ae16d35574dd0e7a00fb/data-raw/Wikipedia-squad-pages/men-2022-squads.html",
    skills: Object.freeze(["Close control", "Ball carrying", "Press resistance"]),
    styleNote: "The key to Boufal is purposeful movement away from the ball. He keeps his first touch close enough to make the next action simple. Another part of his game appears when he moves into a clear supporting angle before pressure arrives.",
    styleNoteZh: "理解布法尔的关键，是无球时有目的的移动。他会把第一脚触球控制得足够近，让下一步处理保持简单。比赛进入另一阶段时，他会在压力到来前移动到清晰的接应角度。",
    styleNoteMeta: Object.freeze({
      origin: "authored",
      version: "historical-style-authored-v1",
      role: "wide-attacker",
      signature: "purposeful-off-ball",
      actions: Object.freeze(["close-first-touch", "supporting-angle"]),
      sources: Object.freeze(["editorial-story"]),
      evidence: Object.freeze(["editorial-story"]),
      confidence: "editorial",
      structureId: "key-another"
    }),
    note: "Morocco's 2022 World Cup left winger. His close control and carrying helped the first African semi-finalists progress without losing their attacking outlet.",
    noteZh: "他是摩洛哥队在2022年世界杯的左边锋，以近距离控球和推进能力帮助首支非洲四强球队始终保留反击出口。"
  }),
  "2022|Gonzalo Montiel": Object.freeze({
    name: "Gonzalo Montiel",
    displayName: "Gonzalo Montiel",
    historical: true,
    sourceId: "historical-story-profile-2026-07-21",
    tournamentYear: 2022,
    tournamentYears: Object.freeze([2022]),
    teamName: "Argentina",
    teams: Object.freeze(["Argentina"]),
    position: "Right-back",
    club: "Sevilla",
    clubAtTournament: "Sevilla",
    clubAtTournamentSource: "fjelstul-worldcup-wikipedia-squad-pages-35a8667",
    clubAtTournamentSourceUrl: "https://github.com/jfjelstul/worldcup/blob/35a8667f518b07469182ae16d35574dd0e7a00fb/data-raw/Wikipedia-squad-pages/men-2022-squads.html",
    skills: Object.freeze(["One-on-one defending", "Recovery pace", "Penalty taking"]),
    styleNote: "Using contact without losing his defensive position defines the way Montiel plays. Look for how he checks the runner over his shoulder before the final pass arrives, and how he holds the dangerous lane until a teammate can apply pressure.",
    styleNoteZh: "身体对抗中不丢失防守位置定义了蒙铁尔的比赛方式。观察他如何在最后一传到来前回头确认跑动者的位置，也观察他如何守住危险线路，直到队友能对持球人施压。",
    styleNoteMeta: Object.freeze({
      origin: "authored",
      version: "historical-style-authored-v1",
      role: "full-back",
      signature: "contact-with-position",
      actions: Object.freeze(["check-runner", "hold-danger-lane"]),
      sources: Object.freeze(["editorial-story"]),
      evidence: Object.freeze(["editorial-story"]),
      confidence: "editorial",
      structureId: "quality-defines"
    }),
    note: "Argentina's 2022 World Cup right-back. He converted the decisive penalty in the final shootout to seal the title.",
    noteZh: "他是阿根廷队在2022年世界杯的右后卫，并在决赛点球大战罚入制胜点球，为球队锁定冠军。"
  })
});

export const HISTORICAL_AWARD_CONTEXT_PLAYERS = Object.freeze({
  "1930|goldenBoot": Object.freeze(["Guillermo Stábile"]),
  "1934|goldenBoot": Object.freeze(["Oldřich Nejedlý"]),
  "1938|goldenBoot": Object.freeze(["Leônidas"]),
  "1950|goldenBoot": Object.freeze(["Ademir"]),
  "1954|goldenBoot": Object.freeze(["Sándor Kocsis"]),
  "1958|goldenBoot": Object.freeze(["Just Fontaine"]),
  "1962|goldenBoot": Object.freeze([
    "Flórián Albert",
    "Valentin Ivanov",
    "Garrincha",
    "Vavá",
    "Leonel Sánchez",
    "Dražan Jerković"
  ]),
  "1966|goldenBoot": Object.freeze(["Eusébio"]),
  "1970|goldenBoot": Object.freeze(["Gerd Müller"]),
  "1974|goldenBoot": Object.freeze(["Grzegorz Lato"]),
  "1978|goldenBall": Object.freeze(["Mario Kempes"]),
  "1978|goldenBoot": Object.freeze(["Mario Kempes"]),
  "1982|goldenBall": Object.freeze(["Paolo Rossi"]),
  "1982|goldenBoot": Object.freeze(["Paolo Rossi"]),
  "1986|goldenBall": Object.freeze(["Diego Maradona"]),
  "1990|goldenBall": Object.freeze(["Salvatore Schillaci"]),
  "1990|goldenBoot": Object.freeze(["Salvatore Schillaci", "Tomáš Skuhravý"]),
  "1994|goldenBall": Object.freeze(["Romário"]),
  "1994|goldenBoot": Object.freeze(["Oleg Salenko", "Hristo Stoichkov"]),
  "1994|goldenGlove": Object.freeze(["Michel Preud'homme"]),
  "1998|goldenBall": Object.freeze(["Ronaldo"]),
  "1998|goldenBoot": Object.freeze(["Davor Šuker"]),
  "1998|goldenGlove": Object.freeze(["Fabien Barthez"]),
  "2002|goldenBall": Object.freeze(["Oliver Kahn"]),
  "2002|goldenBoot": Object.freeze(["Ronaldo"]),
  "2002|goldenGlove": Object.freeze(["Oliver Kahn"]),
  "2006|goldenBall": Object.freeze(["Zinedine Zidane"]),
  "2006|goldenBoot": Object.freeze(["Miroslav Klose"]),
  "2006|goldenGlove": Object.freeze(["Gianluigi Buffon", "Zinedine Zidane"]),
  "2006|youngPlayer": Object.freeze(["Lukas Podolski"]),
  "2010|goldenBall": Object.freeze(["Diego Forlán"]),
  "2010|goldenBoot": Object.freeze(["Thomas Müller", "Diego Forlán", "David Villa", "Wesley Sneijder"]),
  "2010|goldenGlove": Object.freeze(["Iker Casillas", "Óscar Cardozo", "Arjen Robben"]),
  "2010|youngPlayer": Object.freeze(["Thomas Müller"]),
  "2014|goldenBall": Object.freeze(["Lionel Messi"]),
  "2014|goldenBoot": Object.freeze(["James Rodríguez"]),
  "2014|goldenGlove": Object.freeze(["Manuel Neuer"]),
  "2014|youngPlayer": Object.freeze(["Paul Pogba"]),
  "2018|goldenBall": Object.freeze(["Luka Modrić"]),
  "2018|goldenBoot": Object.freeze(["Harry Kane"]),
  "2018|goldenGlove": Object.freeze(["Thibaut Courtois"]),
  "2018|youngPlayer": Object.freeze([
    "Kylian Mbappé",
    Object.freeze({ playerName: "Pelé", profileYear: 1958 })
  ]),
  "2022|goldenBall": Object.freeze(["Lionel Messi"]),
  "2022|goldenBoot": Object.freeze(["Kylian Mbappé", "Lionel Messi"]),
  "2022|goldenGlove": Object.freeze(["Emiliano Martínez", "Randal Kolo Muani", "Kingsley Coman"]),
  "2022|youngPlayer": Object.freeze(["Enzo Fernández"]),
  "2022|fairPlay": Object.freeze(["Harry Maguire"])
});

export const HISTORICAL_AWARD_CONTEXT_PLAYER_LABELS = Object.freeze({
  ko: Object.freeze({
    "1930|goldenBoot": Object.freeze(["스타빌레"]),
    "1934|goldenBoot": Object.freeze(["네예들리"]),
    "1938|goldenBoot": Object.freeze(["레오니다스"]),
    "1950|goldenBoot": Object.freeze(["아데미르"]),
    "1954|goldenBoot": Object.freeze(["코치시"]),
    "1958|goldenBoot": Object.freeze(["퐁텐"]),
    "1962|goldenBoot": Object.freeze(["알베르트", "이바노프", "가린샤", "바바", "산체스", "예르코비치"]),
    "1966|goldenBoot": Object.freeze(["에우제비우"]),
    "1970|goldenBoot": Object.freeze(["뮐러"]),
    "1974|goldenBoot": Object.freeze(["라토"]),
    "1978|goldenBall": Object.freeze(["켐페스"]),
    "1978|goldenBoot": Object.freeze(["켐페스"]),
    "1982|goldenBall": Object.freeze(["로시"]),
    "1982|goldenBoot": Object.freeze([""]),
    "1986|goldenBall": Object.freeze(["마라도나"]),
    "1990|goldenBall": Object.freeze(["스킬라치"]),
    "1990|goldenBoot": Object.freeze(["", "토마시 스쿠흐라비"]),
    "1994|goldenBall": Object.freeze(["호마리우"]),
    "1994|goldenBoot": Object.freeze(["살렌코", "스토이치코프"]),
    "1994|goldenGlove": Object.freeze(["프뢰돔"]),
    "1998|goldenBall": Object.freeze(["호나우두"]),
    "1998|goldenBoot": Object.freeze(["슈케르"]),
    "1998|goldenGlove": Object.freeze(["바르테즈"]),
    "2002|goldenBall": Object.freeze(["칸"]),
    "2002|goldenBoot": Object.freeze(["호나우두"]),
    "2002|goldenGlove": Object.freeze(["칸"]),
    "2006|goldenBall": Object.freeze(["지단"]),
    "2006|goldenBoot": Object.freeze(["클로제"]),
    "2006|goldenGlove": Object.freeze(["부폰", "지단"]),
    "2006|youngPlayer": Object.freeze(["포돌스키"]),
    "2010|goldenBall": Object.freeze(["포를란"]),
    "2010|goldenBoot": Object.freeze(["뮐러", "포를란", "비야", "스네이더르"]),
    "2010|goldenGlove": Object.freeze(["카시야스", "카르도소", "로번"]),
    "2010|youngPlayer": Object.freeze(["뮐러"]),
    "2014|goldenBall": Object.freeze(["메시"]),
    "2014|goldenBoot": Object.freeze(["하메스"]),
    "2014|goldenGlove": Object.freeze(["노이어"]),
    "2014|youngPlayer": Object.freeze(["포그바"]),
    "2018|goldenBall": Object.freeze(["모드리치"]),
    "2018|goldenBoot": Object.freeze(["케인"]),
    "2018|goldenGlove": Object.freeze(["쿠르투아"]),
    "2018|youngPlayer": Object.freeze(["음바페", "펠레"]),
    "2022|goldenBall": Object.freeze(["메시"]),
    "2022|goldenBoot": Object.freeze(["음바페", "메시"]),
    "2022|goldenGlove": Object.freeze(["마르티네스", "콜로 무아니", "코망"]),
    "2022|youngPlayer": Object.freeze(["페르난데스"]),
    "2022|fairPlay": Object.freeze(["매과이어"])
  }),
  zh: Object.freeze({
    "1930|goldenBoot": Object.freeze(["斯塔比莱"]),
    "1934|goldenBoot": Object.freeze(["内耶德利"]),
    "1938|goldenBoot": Object.freeze(["莱昂尼达斯"]),
    "1950|goldenBoot": Object.freeze(["阿德米尔"]),
    "1954|goldenBoot": Object.freeze(["科奇士"]),
    "1958|goldenBoot": Object.freeze(["方丹"]),
    "1962|goldenBoot": Object.freeze(["阿尔贝特", "伊万诺夫", "加林查", "瓦瓦", "桑切斯", "耶尔科维奇"]),
    "1966|goldenBoot": Object.freeze(["尤西比奥"]),
    "1970|goldenBoot": Object.freeze(["穆勒"]),
    "1974|goldenBoot": Object.freeze(["拉托"]),
    "1978|goldenBall": Object.freeze(["肯佩斯"]),
    "1978|goldenBoot": Object.freeze(["肯佩斯"]),
    "1982|goldenBall": Object.freeze(["罗西"]),
    "1982|goldenBoot": Object.freeze(["罗西"]),
    "1986|goldenBall": Object.freeze(["马拉多纳"]),
    "1990|goldenBall": Object.freeze(["斯基拉奇"]),
    "1990|goldenBoot": Object.freeze(["斯基拉奇", "托马什·斯库赫拉维"]),
    "1994|goldenBall": Object.freeze(["罗马里奥"]),
    "1994|goldenBoot": Object.freeze(["萨连科", "斯托伊奇科夫"]),
    "1994|goldenGlove": Object.freeze(["普雷德霍姆"]),
    "1998|goldenBall": Object.freeze(["罗纳尔多"]),
    "1998|goldenBoot": Object.freeze(["苏克"]),
    "1998|goldenGlove": Object.freeze(["巴特兹"]),
    "2002|goldenBall": Object.freeze(["卡恩"]),
    "2002|goldenBoot": Object.freeze(["罗纳尔多"]),
    "2002|goldenGlove": Object.freeze(["卡恩"]),
    "2006|goldenBall": Object.freeze(["齐达内"]),
    "2006|goldenBoot": Object.freeze(["克洛泽"]),
    "2006|goldenGlove": Object.freeze(["布冯", "齐达内"]),
    "2006|youngPlayer": Object.freeze(["波多尔斯基"]),
    "2010|goldenBall": Object.freeze(["弗兰"]),
    "2010|goldenBoot": Object.freeze(["穆勒", "弗兰", "比利亚", "斯内德"]),
    "2010|goldenGlove": Object.freeze(["卡西利亚斯", "卡多索", "罗本"]),
    "2010|youngPlayer": Object.freeze(["穆勒"]),
    "2014|goldenBall": Object.freeze(["梅西"]),
    "2014|goldenBoot": Object.freeze(["J罗"]),
    "2014|goldenGlove": Object.freeze(["诺伊尔"]),
    "2014|youngPlayer": Object.freeze(["博格巴"]),
    "2018|goldenBall": Object.freeze(["莫德里奇"]),
    "2018|goldenBoot": Object.freeze(["凯恩"]),
    "2018|goldenGlove": Object.freeze(["库尔图瓦"]),
    "2018|youngPlayer": Object.freeze(["姆巴佩", "贝利"]),
    "2022|goldenBall": Object.freeze(["梅西"]),
    "2022|goldenBoot": Object.freeze(["姆巴佩", "梅西"]),
    "2022|goldenGlove": Object.freeze(["马丁内斯", "科洛·穆阿尼", "科曼"]),
    "2022|youngPlayer": Object.freeze(["恩佐·费尔南德斯"]),
    "2022|fairPlay": Object.freeze(["马奎尔"])
  })
});

const player = (playerName, teamName, position, reason, honourable = null) => ({
  playerName,
  teamName,
  position,
  reason: { en: reason },
  honourables: honourable
    ? [{ playerName: honourable[0], teamName: honourable[1], position: honourable[2] || position }]
    : []
});

const edition = ({ year, champion, flag, formation, intro, introPlayers, coach, rows, highlights }) => ({
  champion,
  flag,
  formation,
  intro,
  introPlayers,
  coach: {
    ...coach,
    ...(HISTORICAL_COACH_CARD_DETAILS[year] || {}),
    ...(HISTORICAL_COACH_PORTRAITS[coach.name] || {})
  },
  rows: rows.map((row) => row.map((starter) => ({
    ...starter,
    honourables: starter.honourables.map((honourable) => ({
      ...honourable,
      reason: { en: getHistoricalHonourableReason(year, honourable.playerName) }
    }))
  }))),
  highlights
});

export const HISTORICAL_HIGHLIGHTS = Object.freeze({
  schemaVersion: 1,
  coverage: "Editorial Best XIs, coaches, champion summaries, and three defining stories for every completed men's World Cup from 1930 through 2022.",
  methodology: "These are editorial tournament teams, not retroactively labelled official FIFA awards. Each selection was rebuilt from FIFA technical analysis, contemporary or retrospective all-star records, complete match logs, the player's real tournament role, knockout influence, and how he made his team function.",
  sources: Object.freeze([
    Object.freeze({
      label: "FIFA World Cup archive and tournament retrospectives",
      url: "https://www.fifa.com/en/tournaments/mens/worldcup"
    }),
    Object.freeze({
      label: "FIFA World Cup All-Star Team records",
      url: "https://fbref.com/en/awards/wc_all_star/FIFA-World-Cup-All-Star-Team"
    }),
    Object.freeze({
      label: "Fjelstul World Cup Database match and squad records",
      url: "https://github.com/jfjelstul/worldcup"
    }),
    Object.freeze({
      label: "RSSSF complete World Cup match records",
      url: "https://www.rsssf.org/tablesw/worldcup.html"
    }),
    Object.freeze({
      label: "FIFA technical reports and tournament analysis",
      url: "https://www.fifatrainingcentre.com/en/fwc2022/"
    })
  ]),
  editions: Object.freeze({
    1930: edition({
      year: 1930,
      champion: "Uruguay",
      flag: "🇺🇾",
      formation: "2-3-5",
      intro: "Uruguay beat Argentina 4–2 in Montevideo, but the title was built before the comeback: José Nasazzi held the back line together, José Leandro Andrade carried play through midfield, and Pedro Cea kept arriving beyond the first wave.",
      introPlayers: ["José Nasazzi", "José Leandro Andrade", "Pedro Cea"],
      coach: {
        name: "Alberto Suppici",
        teamName: "Uruguay",
        reason: { en: "Suppici balanced Uruguay's veteran Olympic core with enough front-line freedom to turn a 2–1 half-time deficit into four second-half goals in the final." }
      },
      rows: [
        [player("Enrique Ballestrero", "Uruguay", "GK", "Calm rather than spectacular, Ballestrero gave Uruguay a secure last line and conceded only three times across the tournament.", ["Milovan Jakšić", "Yugoslavia"])],
        [
          player("José Nasazzi", "Uruguay", "CB", "The captain defended forward: he attacked loose balls, organized the cover behind Andrade and never let the final's early chaos become panic.", ["Fernando Paternoster", "Argentina"]),
          player("Milutin Ivković", "Yugoslavia", "CB", "Ivković was the outstanding defender of Yugoslavia's run, reading danger early enough for an adventurous side to keep stepping into midfield.", ["Ernesto Mascheroni", "Uruguay"])
        ],
        [
          player("José Leandro Andrade", "Uruguay", "CM", "Still the complete two-way footballer: he covered Nasazzi, carried through pressure and supplied the athletic rhythm that changed the final after half-time.", ["Juan Evaristo", "Argentina"]),
          player("Luis Monti", "Argentina", "DM", "Monti was Argentina's hard tactical hinge, screening transitions and pushing attacks forward quickly enough to score in both the semi-final and group stage.", ["Lorenzo Fernández", "Uruguay"]),
          player("Álvaro Gestido", "Uruguay", "CM", "Gestido's left-half work was the quiet structure of the champions—shuttling wide to protect space, then giving Cea a clean lane to attack.", ["Pedro Suárez", "Argentina"])
        ],
        [
          player("Carlos Peucelle", "Argentina", "RW", "Peucelle scored three for the finalists, including the equalizer in the final, and supplied the natural outside-right width this 2-3-5 requires.", ["Pablo Dorado", "Uruguay"]),
          player("Héctor Scarone", "Uruguay", "AM", "Scarone did not need to dominate the scoring chart; his disguised passes and movement between lines made Uruguay's five-man front coherent.", ["Manuel Ferreira", "Argentina"]),
          player("Guillermo Stábile", "Argentina", "ST", "Eight goals in four games after starting outside the first XI: Stábile attacked the blind side relentlessly and scored in every match he played.", ["Bert Patenaude", "United States"]),
          player("Pedro Cea", "Uruguay", "SS", "Cea was the decisive second runner—hat-trick in the semi-final, equalizer in the final, and constant late movement beyond Argentina's occupied defenders.", ["Héctor Castro", "Uruguay", "ST"]),
          player("Santos Iriarte", "Uruguay", "LW", "Iriarte played all four Uruguay matches and scored in both the semi-final and final, including the 3–2 goal that turned the decider for good.", ["Mario Evaristo", "Argentina"])
        ]
      ],
      highlights: [
        { title: "Uruguay changed the final at half-time", body: "Argentina led 2–1, then Uruguay raised the pressure around Monti, found Cea's equalizer and kept attacking until Castro made it 4–2.", matchId: "wc-1930-1930-07-30-final-uruguay-argentina" },
        { title: "Stábile arrived and could not stop scoring", body: "Left out of Argentina's opener, Guillermo Stábile came in against Mexico, scored a hat-trick and finished with eight goals in only four appearances." },
        { title: "The United States reached the last four", body: "A team built largely from domestic and immigrant club football won its group without conceding; Patenaude's finishing made the run historically real, not a bracket footnote." }
      ]
    }),
    1934: edition({
      year: 1934,
      champion: "Italy",
      flag: "🇮🇹",
      formation: "2-3-5",
      intro: "Italy beat Czechoslovakia 2–1 after extra time. The hosts were less a free-scoring machine than a flexible tournament side: Luis Monti set the aggression, Giuseppe Meazza solved tight spaces, and Raimundo Orsi supplied the final's equalizer.",
      introPlayers: ["Luis Monti", "Giuseppe Meazza", "Raimundo Orsi"],
      coach: {
        name: "Vittorio Pozzo",
        teamName: "Italy",
        reason: { en: "Pozzo's Metodo gave Italy an extra midfield grip without emptying the forward line, and his changes helped them survive two matches in two days against Spain before turning the final." }
      },
      rows: [
        [player("Ricardo Zamora", "Spain", "GK", "Zamora's positioning and authority drove Spain past Brazil and through the first, brutal draw with Italy; injury, not form, ended his tournament.", ["František Plánička", "Czechoslovakia"])],
        [
          player("Eraldo Monzeglio", "Italy", "CB", "Monzeglio was Pozzo's covering defender, quick enough to defend the space Italy's midfield pressure left behind and composed across four knockout tests.", ["Karl Sesta", "Austria"]),
          player("Jacinto Quincoces", "Spain", "CB", "Quincoces was dominant in the air and unusually clean stepping out with the ball; Italy needed a replay and an exhausted Spanish side to get past him.", ["Josef Čtyřoký", "Czechoslovakia"])
        ],
        [
          player("Luis Monti", "Italy", "DM", "Four years after losing a final for Argentina, Monti controlled Italy's central duels, broke counters at source and supplied the platform for Meazza to roam.", ["György Sárosi", "Hungary"]),
          player("Attilio Ferraris", "Italy", "CM", "Ferraris was the final's tactical correction: restored to the side, he matched the Czechoslovak midfield's running and helped Italy own extra time.", ["Mario Pizziolo", "Italy"]),
          player("Leonardo Cilaurren", "Spain", "CM", "Cilaurren's range and recovery work made Spain the one side able to meet Italy physically without losing its passing connections.", ["Josef Košťálek", "Czechoslovakia"])
        ],
        [
          player("Enrique Guaita", "Italy", "RW", "Guaita attacked the inside-right channel rather than waiting wide, scoring the semi-final winner and repeatedly arriving beyond Meazza's combinations.", ["Karl Zischek", "Austria"]),
          player("Giuseppe Meazza", "Italy", "AM", "Meazza was the tournament's best problem-solver and initiated the extra-time winner with the pass that released Guaita, whose final ball found Schiavio.", ["Matthias Sindelar", "Austria"]),
          player("Angelo Schiavio", "Italy", "ST", "Schiavio opened with a hat-trick and still had the legs and clarity to score the extra-time goal that won the final.", ["Edmund Conen", "Germany"]),
          player("Oldřich Nejedlý", "Czechoslovakia", "SS", "Nejedlý's five goals came through smart penalty-box positioning rather than volume shooting; his semi-final hat-trick carried Czechoslovakia to Rome.", ["Luis Regueiro", "Spain", "SS"]),
          player("Raimundo Orsi", "Italy", "LW", "Orsi stretched the left, dribbled inside when the lane appeared and produced the disguised, bending equalizer that rescued Italy in the final.", ["Antonín Puč", "Czechoslovakia"])
        ]
      ],
      highlights: [
        { title: "Italy needed 210 minutes to beat Spain", body: "The quarter-final and replay became a test of attrition. Zamora starred in the first game; Meazza settled the second while both teams carried the damage onward." },
        { title: "Sindelar's Austria met the host wall", body: "The Wunderteam brought its interchanging attack to the semi-final, but Monti and Ferraris compressed the middle and Guaita turned one loose moment into the winner." },
        { title: "Orsi bent the final back toward Italy", body: "Czechoslovakia led with 19 minutes left. Orsi cut in from the left to equalize before Schiavio completed the comeback in extra time.", matchId: "wc-1934-1934-06-10-final-italy-czechoslovakia" }
      ]
    }),
    1938: edition({
      year: 1938,
      champion: "Italy",
      flag: "🇮🇹",
      formation: "3-2-3-2",
      intro: "Italy retained the World Cup by beating Hungary 4–2. Pozzo's side was more direct than in 1934: the midfield released quickly, Gino Colaussi attacked the far side, and Silvio Piola's movement kept opening the middle.",
      introPlayers: ["Gino Colaussi", "Silvio Piola"],
      coach: {
        name: "Vittorio Pozzo",
        teamName: "Italy",
        reason: { en: "Pozzo rebuilt a champion rather than preserving one, keeping only the right spine from 1934 and making a faster, cleaner counter-attacking team around Piola and Colaussi." }
      },
      rows: [
        [player("František Plánička", "Czechoslovakia", "GK", "Plánička remained technically immaculate under heavy pressure and finished the extra-time epic against Brazil despite a serious arm injury.", ["Aldo Olivieri", "Italy"])],
        [
          player("Alfredo Foni", "Italy", "RB", "Foni handled the right-side defensive duels and let Meazza stay higher, giving the champions a reliable answer to the tournament's strongest left wingers.", ["Sándor Bíró", "Hungary", "CB"]),
          player("Domingos da Guia", "Brazil", "CB", "Domingos was Brazil's calm distributor and strongest covering defender; his semi-final foul on Piola did not erase a tournament of clean progression under pressure.", ["Gyula Polgár", "Hungary"]),
          player("Pietro Rava", "Italy", "LB", "Rava's front-foot marking and recovery pace allowed Italy to defend narrow without surrendering the flank; he was outstanding against Brazil and Hungary.", ["Erik Nilsson", "Sweden"])
        ],
        [
          player("Michele Andreolo", "Italy", "DM", "Andreolo was the hinge of Pozzo's revised side, winning the second ball and immediately finding Meazza or Piola before opponents could reset.", ["Martim Silveira", "Brazil"]),
          player("Ugo Locatelli", "Italy", "CM", "Locatelli covered enormous ground between Andreolo and the forwards, the connector who made Italy's rapid transitions repeatable rather than improvised.", ["Gyula Lázár", "Hungary"])
        ],
        [
          player("Gino Colaussi", "Italy", "LM", "Colaussi's four goals included two in the final; his far-post runs punished teams that collapsed around Piola and Meazza.", ["Pál Titkos", "Hungary", "LW"]),
          player("Giuseppe Meazza", "Italy", "AM", "Now captain and supplier, Meazza managed rhythm between the lines and created two final goals without needing to dominate the scoring himself.", ["György Sárosi", "Hungary", "ST"]),
          player("Gyula Zsengellér", "Hungary", "SS", "Zsengellér's pace and five goals powered Hungary through the bracket; his inside-left runs were the sharpest complement to Sárosi's linking.", ["Arne Nyberg", "Sweden", "LW"])
        ],
        [
          player("Silvio Piola", "Italy", "ST", "Piola scored twice against hosts France and twice in the final, then won the penalty that separated Italy from Brazil in the semi-final.", ["Ernest Wilimowski", "Poland"]),
          player("Leônidas", "Brazil", "ST", "Seven goals, elastic improvisation and a decisive extra-time double against Poland: Leônidas was the tournament's most destabilizing attacker.", ["Amedeo Biavati", "Italy", "RW"])
        ]
      ],
      highlights: [
        { title: "Brazil and Poland made chaos beautiful", body: "Leônidas and Ernest Wilimowski traded blows through extra time in a 6–5 classic, combining for seven goals and announcing the tournament's attacking mood." },
        { title: "Italy wore black, then played in colour", body: "Politics framed the quarter-final with hosts France; on the pitch, Italy escaped pressure through Meazza and used Piola's second-half double to win 3–1." },
        { title: "Piola and Colaussi split the final", body: "Hungary could track one line of Italy's attack but not both. Colaussi struck twice from the side, Piola twice through the centre, and the holders won 4–2.", matchId: "wc-1938-1938-06-19-final-hungary-italy" }
      ]
    }),
    1950: edition({
      year: 1950,
      champion: "Uruguay",
      flag: "🇺🇾",
      formation: "2-3-5",
      intro: "Uruguay won the final round by beating Brazil 2–1 in the Maracanã. Obdulio Varela slowed the emotional temperature, Juan Schiaffino connected midfield to attack, and Alcides Ghiggia kept finding the one channel Brazil left open.",
      introPlayers: ["Obdulio Varela", { playerName: "Juan Alberto Schiaffino", triggerText: "Juan Schiaffino" }, "Alcides Ghiggia"],
      coach: {
        name: "Juan López Fontana",
        teamName: "Uruguay",
        reason: { en: "López Fontana trusted Uruguay to absorb Brazil's waves without retreating into passivity, leaving Ghiggia high enough to turn the same right-side overload into both decisive goals." }
      },
      rows: [
        [player("Roque Máspoli", "Uruguay", "GK", "Máspoli recovered from early punishment by Spain to command the final round, then stayed upright and patient while Brazil shot from increasingly poor angles.", ["Antoni Ramallets", "Spain"])],
        [
          player("Erik Nilsson", "Sweden", "CB", "Nilsson survived elite right wingers through excellent angles and still advanced to support Sweden's direct, high-energy run to third place.", ["Matías González", "Uruguay", "RB"]),
          player("José Parra", "Spain", "CB", "Parra was the organiser of the tournament's surprise unbeaten group winner, strong in the box and clean enough in possession to start Spain's counters.", ["Eusebio Tejera", "Uruguay"])
        ],
        [
          player("Víctor Rodríguez Andrade", "Uruguay", "CM", "Rodríguez Andrade played every Uruguay match at right-half, closed Zizinho's inside lane in the decider and still supported Ghiggia on the break.", ["Sune Andersson", "Sweden"]),
          player("Obdulio Varela", "Uruguay", "DM", "Varela's greatness was tactical and psychological: he delayed Brazil's restart after Friaça's goal, reset Uruguay's shape and kept demanding the next pass.", ["Danilo Alvim", "Brazil"]),
          player("Bauer", "Brazil", "CM", "Bauer drove the hosts' midfield with ball-winning and vertical distribution, the platform beneath a side that scored 13 goals in its first two final-round matches.", ["Bigode", "Brazil"])
        ],
        [
          player("Alcides Ghiggia", "Uruguay", "RW", "Ghiggia isolated Bigode, created Schiaffino's equalizer and scored the winner from the same right-hand corridor—the clearest match-up victory in World Cup history.", ["Estanislau Basora", "Spain"]),
          player("Zizinho", "Brazil", "AM", "Zizinho was Brazil's technical centre—receiving between lines, changing tempo with one touch and supplying attacks even when the final denied him the crowning moment.", ["Nils Liedholm", "Sweden"]),
          player("Ademir", "Brazil", "ST", "Nine goals, violent acceleration across the centre-back and a constant threat before the final; no other forward bent the tournament around his movement so often.", ["Óscar Míguez", "Uruguay"]),
          player("Juan Alberto Schiaffino", "Uruguay", "SS", "Schiaffino drifted off the front to give Uruguay a pass under pressure, then arrived perfectly to finish Ghiggia's cut-back in the decider.", ["Telmo Zarra", "Spain", "ST"]),
          player("Jair", "Brazil", "LW", "Jair's left-footed combinations and shooting helped create Brazil's avalanche; his relationship with Zizinho made the inside-left lane almost impossible to close.", ["Chico", "Brazil"])
        ]
      ],
      highlights: [
        { title: "The Maracanã went quiet", body: "Brazil needed only a draw and led after Friaça's goal. Varela slowed the restart, Ghiggia created Schiaffino's equalizer, then beat Barbosa at the near post for 2–1.", matchId: "wc-1950-1950-07-16-final-round-uruguay-brazil" },
        { title: "The United States shocked England", body: "Joe Gaetjens' first-half goal and Frank Borghi's resistance produced a 1–0 result that looked impossible beside the two teams' footballing resources." },
        { title: "Brazil looked inevitable—until it did not", body: "The hosts beat Sweden 7–1 and Spain 6–1 in the final round. That context is what makes Uruguay's control of the last 24 minutes so extraordinary." }
      ]
    }),
    1954: edition({
      year: 1954,
      champion: "West Germany",
      flag: "🇩🇪",
      formation: "3-2-2-3",
      intro: "West Germany overturned a two-goal deficit to beat Hungary 3–2 in the Miracle of Bern. The champions narrowed the pitch, attacked the second ball and trusted Helmut Rahn to decide moments that Hungary's control could not eliminate.",
      introPlayers: ["Helmut Rahn"],
      coach: {
        name: "Sepp Herberger",
        teamName: "West Germany",
        reason: { en: "Herberger treated the group-stage 8–3 loss as reconnaissance, rotated heavily, then built the final plan around compact marking, fresh legs and Rahn attacking Hungary's left defensive seam." }
      },
      rows: [
        [player("Gyula Grosics", "Hungary", "GK", "The prototype sweeper-keeper: Grosics started attacks outside his box and gave Hungary the courage to hold a high line throughout its 27-goal run.", ["Toni Turek", "West Germany"])],
        [
          player("Djalma Santos", "Brazil", "RB", "Djalma made his tournament debut in Brazil's last match, the quarter-final against Hungary, and one complete display of duel strength and clean progression earned this place.", ["Josef Posipal", "West Germany"]),
          player("José Santamaría", "Uruguay", "CB", "Santamaría was Uruguay's defensive reference, dominant across the box and composed enough to carry the holders through a draining quarter-final.", ["Werner Liebrich", "West Germany"]),
          player("Werner Kohlmeyer", "West Germany", "LB", "Kohlmeyer defended the champions' left side through every knockout match and made vital goal-line interventions as the final turned after 2–0.", ["Mihály Lantos", "Hungary"])
        ],
        [
          player("József Bozsik", "Hungary", "CM", "Bozsik controlled passing height and direction from right-half, feeding Hidegkuti early and arriving late enough to score in the quarter-final.", ["Horst Eckel", "West Germany"]),
          player("Ernst Ocwirk", "Austria", "CM", "Ocwirk organized Austria's build-up from centre-half and turned recoveries into controlled attacks throughout their run to third place.", ["Obdulio Varela", "Uruguay", "DM"])
        ],
        [
          player("Fritz Walter", "West Germany", "AM", "Walter made the final playable for Germany: protecting possession on the wet surface, delivering the corner for 2–2 and deciding when to accelerate.", ["Ferenc Puskás", "Hungary"]),
          player("Nándor Hidegkuti", "Hungary", "AM", "His withdrawal from centre-forward kept pulling stoppers into midfield, opening lanes for Kocsis and Puskás while he still scored four himself.", ["Juan Hohberg", "Uruguay", "SS"])
        ],
        [
          player("Helmut Rahn", "West Germany", "RW", "Rahn's power off either foot made him Germany's escape route; two final goals, including the left-footed winner, rewarded his repeated attacks on the weak side.", ["Tom Finney", "England"]),
          player("Sándor Kocsis", "Hungary", "ST", "Eleven goals in five games, with headers that were about timing as much as height; his extra-time brace against Uruguay was the tournament's great centre-forward intervention.", ["Max Morlock", "West Germany"]),
          player("Zoltán Czibor", "Hungary", "LW", "Czibor supplied width without becoming predictable, pressing the ball, darting inside and scoring Hungary's second in the final.", ["Hans Schäfer", "West Germany"])
        ]
      ],
      highlights: [
        { title: "The favourites were beaten twice before the final", body: "Hungary survived Brazil's fury and Uruguay's extra-time comeback. Those wins proved their quality but drained a side already carrying Puskás' injury." },
        { title: "Rahn had one more shot in him", body: "Germany recovered from 2–0 down inside 18 minutes. With six minutes left, Rahn shifted the ball onto his left foot and found the bottom corner for 3–2.", matchId: "wc-1954-1954-07-04-final-hungary-west-germany" },
        { title: "Kocsis set a knockout-stage standard", body: "Four against West Germany, two against Brazil and two more in extra time against Uruguay: his 11-goal total set a new World Cup benchmark and carried Hungary to the final." }
      ]
    }),
    1958: edition({
      year: 1958,
      champion: "Brazil",
      flag: "🇧🇷",
      formation: "3-3-4",
      intro: "Brazil beat Sweden 5–2 and turned individual freedom into a repeatable system. Didi governed the centre, Garrincha broke the right side open, and Pelé arrived between centre-back and full-back before anyone had a reference for him.",
      introPlayers: ["Didi", "Garrincha", "Pelé"],
      coach: {
        name: "Vicente Feola",
        teamName: "Brazil",
        reason: { en: "Feola was willing to change a winning side, bringing Garrincha, Pelé and Zito into the XI, then gave Brazil's artists a clear 4-2-4 rest-defence behind them." }
      },
      rows: [
        [player("Harry Gregg", "Northern Ireland", "GK", "Gregg's brave starting position and reflex saves carried an injury-hit debutant through a playoff and into the quarter-finals.", ["Kalle Svensson", "Sweden"])],
        [
          player("Djalma Santos", "Brazil", "RB", "Djalma made his tournament debut in the final after De Sordi's injury, shut Sweden's left side and advanced with complete technical security.", ["Orvar Bergmark", "Sweden"]),
          player("Bellini", "Brazil", "CB", "Bellini organized Brazil's protection behind the 4-2-4, winning first contacts and making the simple pass that kept the artists facing forward.", ["Bengt Gustavsson", "Sweden"]),
          player("Nílton Santos", "Brazil", "LB", "His surge and goal against Austria announced the modern attacking full-back, but the intelligence was in knowing exactly when Brazil's shape could support it.", ["Sven Axbom", "Sweden"])
        ],
        [
          player("Danny Blanchflower", "Northern Ireland", "DM", "Blanchflower read the tournament from half-back and gave Northern Ireland control they had no right to possess against bigger squads.", ["Zito", "Brazil"]),
          player("Didi", "Brazil", "CM", "The tournament's metronome used body shape and the outside of his foot to bypass pressure; after Sweden scored first in the final, he carried the ball calmly back to halfway.", ["Yuri Voynov", "Soviet Union"]),
          player("Gunnar Gren", "Sweden", "CM", "At 37, Gren still found pockets behind midfield and supplied the pauses that let Hamrin and Skoglund attack around Liedholm.", ["Nils Liedholm", "Sweden"])
        ],
        [
          player("Garrincha", "Brazil", "RW", "Garrincha's first three minutes against the Soviet Union changed Brazil's tournament; he repeatedly fixed two defenders and still delivered the cut-back.", ["Kurt Hamrin", "Sweden"]),
          player("Pelé", "Brazil", "SS", "Six knockout goals at 17, but the detail was the variety: chest control, volleys, headers, combinations and the audacity to lift the ball over a defender in the final.", ["Vavá", "Brazil", "ST"]),
          player("Just Fontaine", "France", "ST", "Thirteen goals from every type of finish set a new World Cup record, powered by Kopa's supply but also Fontaine's constant first movement across the near centre-back.", ["Agne Simonsson", "Sweden"]),
          player("Raymond Kopa", "France", "LW", "Kopa was the tournament's most elusive creator, starting wide, drifting inside and feeding Fontaine while adding three goals of his own.", ["Lennart Skoglund", "Sweden"])
        ]
      ],
      highlights: [
        { title: "Brazil found the XI that changed football", body: "After a goalless draw with England, Garrincha, Pelé and Zito entered the side. The new balance produced 13 goals across the last four matches." },
        { title: "Fontaine reached thirteen", body: "France's third-place match could have been an afterthought. Fontaine scored four against West Germany instead and set a new single-tournament record of 13 goals." },
        { title: "A 17-year-old owned the final", body: "Pelé scored twice against Sweden, including the lift over Bengt Gustavsson and volley that made the world's biggest match look like street football.", matchId: "wc-1958-1958-06-29-final-sweden-brazil" }
      ]
    }),
    1962: edition({
      year: 1962,
      champion: "Brazil",
      flag: "🇧🇷",
      formation: "4-2-4",
      intro: "Brazil retained the title by beating Czechoslovakia 3–1 after Pelé's injury changed the plan. Garrincha became the primary destabilizer, Amarildo filled the scoring gap, and Zito kept a more pragmatic champion connected.",
      introPlayers: ["Pelé", "Garrincha", "Amarildo", "Zito"],
      coach: {
        name: "Aymoré Moreira",
        teamName: "Brazil",
        reason: { en: "Moreira resisted the urge to redesign the holders after Pelé went down: Amarildo inherited the role, Zagallo narrowed to support midfield, and Garrincha received even more one-versus-one responsibility." }
      },
      rows: [
        [player("Viliam Schrojf", "Czechoslovakia", "GK", "Schrojf was brilliant through the semi-final, using aggressive angles and strong hands to give a low-scoring side a path all the way to the final.", ["Gilmar", "Brazil"])],
        [
          player("Djalma Santos", "Brazil", "RB", "Djalma balanced Garrincha perfectly—supporting outside when needed, tucking in when the winger stayed high, and barely losing a defensive duel.", ["Luis Eyzaguirre", "Chile"]),
          player("Mauro", "Brazil", "CB", "The new captain kept Brazil's box calm during a harsher, more physical tournament and covered the spaces left by the full-backs.", ["Jan Popluhár", "Czechoslovakia"]),
          player("Cesare Maldini", "Italy", "CB", "Italy exited early, but Maldini's anticipation and distribution were elite in a group shaped by violence and tiny margins.", ["Svatopluk Pluskal", "Czechoslovakia", "DM"]),
          player("Karl-Heinz Schnellinger", "West Germany", "LB", "Schnellinger defended both flanks with recovery pace and carried forward cleanly, one of the few Germans to retain his level in the quarter-final loss.", ["Nílton Santos", "Brazil"])
        ],
        [
          player("Zito", "Brazil", "CM", "Zito supplied the balance behind a less fluid front four, then made the decisive box-to-box run to head Brazil in front in the final.", ["Didi", "Brazil"]),
          player("Josef Masopust", "Czechoslovakia", "CM", "Masopust carried a defensive side up the pitch with elegant surges, scored the opening goal in the final and remained its one reliable tempo-changer.", ["Valery Voronin", "Soviet Union"])
        ],
        [
          player("Garrincha", "Brazil", "RW", "With Pelé out, Garrincha became creator and scorer: four knockout goals, two against England and two against Chile, without surrendering his chance-making.", ["Valentin Ivanov", "Soviet Union"]),
          player("Vavá", "Brazil", "ST", "Vavá's four goals were all useful, including the final's clincher; his near-post movement gave Garrincha and Zagallo a constant target.", ["Flórián Albert", "Hungary"]),
          player("Amarildo", "Brazil", "ST", "Replacing Pelé was the tournament's hardest assignment. Amarildo scored twice in the must-win group match with Spain and the equalizer in the final.", ["Dražan Jerković", "Yugoslavia"]),
          player("Leonel Sánchez", "Chile", "LW", "Sánchez carried the hosts with a vicious left foot, four goals and the emotional control to keep creating amid an extremely physical tournament.", ["Mário Zagallo", "Brazil"])
        ]
      ],
      highlights: [
        { title: "Brazil lost Pelé and found another route", body: "Amarildo replaced the injured star, rescued the group match against Spain and scored in the final. The holders became narrower and tougher without losing their threat.", matchId: "wc-1962-1962-06-17-final-brazil-czechoslovakia" },
        { title: "Garrincha took the tournament over", body: "England and hosts Chile both tried extra cover on his wing. He answered with four goals across the quarter- and semi-finals, plus the chances that did not reach the scoresheet." },
        { title: "Chile turned pressure into a podium", body: "Backed by a country recovering from the Valdivia earthquake, the hosts beat the Soviet Union in the quarter-final and Yugoslavia for third place." }
      ]
    }),
    1966: edition({
      year: 1966,
      champion: "England",
      flag: ENGLAND_FLAG,
      formation: "4-3-1-2",
      intro: "England beat West Germany 4–2 after extra time. Alf Ramsey's wingless structure crowded the decisive central spaces, Bobby Moore passed through pressure, and Bobby Charlton's movement gave Geoff Hurst room to finish.",
      introPlayers: ["Bobby Moore", "Bobby Charlton", "Geoff Hurst"],
      coach: {
        name: "Alf Ramsey",
        teamName: "England",
        reason: { en: "Ramsey's 'wingless wonders' were a genuine tournament solution: four midfielders could protect the centre, press second balls and still release Charlton beyond the first line." }
      },
      rows: [
        [player("Gordon Banks", "England", "GK", "Banks conceded only once before the final, controlling his box so cleanly that England could defend narrow without fearing every cross.", ["Lev Yashin", "Soviet Union"])],
        [
          player("George Cohen", "England", "RB", "Cohen supplied the width Ramsey removed from midfield, choosing his overlaps carefully and recovering quickly enough to keep England's rest-defence intact.", ["Vicente Lucas", "Portugal"]),
          player("Bobby Moore", "England", "CB", "Moore defended by arriving early, not violently, then turned recoveries into attacks—the clipped pass for Hurst's fourth was the final's coldest decision.", ["Willi Schulz", "West Germany"]),
          player("Jack Charlton", "England", "CB", "Charlton attacked the first ball and protected Moore's freedom to read behind him; the partnership conceded three goals in six matches before extra time.", ["Roberto Perfumo", "Argentina"]),
          player("Silvio Marzolini", "Argentina", "LB", "Marzolini was Argentina's cleanest outlet and best one-on-one defender, advancing with control even in the quarter-final's hostile rhythm.", ["Ray Wilson", "England"])
        ],
        [
          player("Franz Beckenbauer", "West Germany", "CM", "At 20, Beckenbauer drove from midfield and scored four before taking the demanding tactical assignment of tracking Bobby Charlton in the final.", ["Valery Voronin", "Soviet Union", "DM"]),
          player("Mário Coluna", "Portugal", "CM", "Coluna gave Portugal structure beneath Eusébio, receiving under pressure and covering the inside channels when both wingers attacked.", ["Nobby Stiles", "England", "DM"]),
          player("Bobby Charlton", "England", "CM", "Charlton's long-stride carries and shooting broke compact games; his two goals against Portugal were the difference in England's hardest match.", ["Helmut Haller", "West Germany", "AM"])
        ],
        [player("Flórián Albert", "Hungary", "AM", "Albert glided away from markers and led the combination play that eliminated holders Brazil, a performance more complete than his goal total suggests.", ["Igor Chislenko", "Soviet Union", "RW"])],
        [
          player("Eusébio", "Portugal", "ST", "Nine goals, including four to reverse a 3–0 deficit against North Korea; his power was obvious, but the early movement across defenders made it possible.", ["Geoff Hurst", "England"]),
          player("Uwe Seeler", "West Germany", "ST", "Seeler linked play selflessly, won aerial balls against larger defenders and produced the improvised back-header that rescued the quarter-final against Uruguay.", ["Ferenc Bene", "Hungary"])
        ]
      ],
      highlights: [
        { title: "North Korea went 3–0 up—and Eusébio answered", body: "Korea DPR led 3–0 after 25 minutes. Eusébio scored four times to turn Portugal's quarter-final into a 5–3 win.", matchId: "wc-1966-1966-07-23-quarter-finals-portugal-north-korea" },
        { title: "Charlton won the semi-final's central duel", body: "Portugal had Eusébio, but England denied him clean transitions. Bobby Charlton twice arrived outside the crowded holding line to make the difference." },
        { title: "Hurst kept running after the argument", body: "His second goal is debated; his third is not. With supporters already on the pitch, Hurst finished Moore's pass to complete the first World Cup final hat-trick.", matchId: "wc-1966-1966-07-30-final-england-west-germany" }
      ]
    }),
    1970: edition({
      year: 1970,
      champion: "Brazil",
      flag: "🇧🇷",
      formation: "4-3-3",
      intro: "Brazil beat Italy 4–1 and won every match. Gérson controlled the speed, Pelé occupied defenders without monopolizing the ball, and Jairzinho attacked the spaces their attention created—scoring in all six games.",
      introPlayers: ["Gérson", "Pelé", "Jairzinho"],
      coach: {
        name: "Mário Zagallo",
        teamName: "Brazil",
        reason: { en: "Zagallo solved the problem of fitting Pelé, Jairzinho, Tostão, Rivellino and Gérson into one team by assigning clear starting zones and demanding coordinated recovery behind their freedom." }
      },
      rows: [
        [player("Ladislao Mazurkiewicz", "Uruguay", "GK", "Mazurkiewicz's footwork and restraint carried Uruguay to the semi-finals; even Pelé's famous dummy is remembered partly because the keeper forced such invention.", ["Gordon Banks", "England"])],
        [
          player("Carlos Alberto", "Brazil", "RB", "The captain timed his advances rather than overlapping on habit, then delivered the tournament's definitive late run and finish in the final.", ["Berti Vogts", "West Germany"]),
          player("Atilio Ancheta", "Uruguay", "CB", "Ancheta's aggressive covering and aerial authority held Uruguay together through the semi-final, especially when their midfield was forced to defend deeper.", ["Roberto Rosato", "Italy"]),
          player("Wilson Piazza", "Brazil", "CB", "Converted from midfield, Piazza gave Brazil a centre-back who could break the first press and feed Gérson without weakening the champions' box defence.", ["Brito", "Brazil"]),
          player("Giacinto Facchetti", "Italy", "LB", "Facchetti's recovery speed and forward surges were essential to Italy's uneven path, especially once the semi-final against West Germany stretched into chaos.", ["Everaldo", "Brazil"])
        ],
        [
          player("Franz Beckenbauer", "West Germany", "CM", "Beckenbauer controlled games from midfield and played through a dislocated shoulder in the semi-final, still carrying West Germany forward.", ["Bobby Charlton", "England"]),
          player("Gérson", "Brazil", "CM", "Gérson chose when Brazil played fast and when everyone breathed; his final goal and long diagonal before Carlos Alberto's strike showed both sides of his control.", ["Clodoaldo", "Brazil"]),
          player("Rivellino", "Brazil", "CM", "Starting from the left, Rivellino opened the pitch with his passing and punishing shot while narrowing enough to keep Brazil from becoming a five-forward gamble.", ["Teófilo Cubillas", "Peru", "AM"])
        ],
        [
          player("Jairzinho", "Brazil", "RW", "Seven goals in six matches, one in every round; he attacked the far post like a striker but began wide enough to create the lane himself.", ["Jürgen Grabowski", "West Germany"]),
          player("Pelé", "Brazil", "F9", "Pelé's four goals only partly describe it: he manipulated defenders, created six more, and made the final's opening header and closing assist look inevitable.", ["Tostão", "Brazil", "F9"]),
          player("Gerd Müller", "West Germany", "ST", "Müller scored ten, including consecutive group-stage hat-tricks and the 108th-minute winner against England; his two-goal extra-time burst came against Italy.", ["Gigi Riva", "Italy"])
        ]
      ],
      highlights: [
        { title: "Banks saved the header Pelé had already celebrated", body: "The leap, downward header and recovery save became the tournament's great duel inside one second. Brazil still won, but England proved the champions could be stressed." },
        { title: "The Game of the Century had five extra-time goals", body: "Italy and West Germany reached 1–1 after 90 minutes, then traded five more in extra time before Rivera answered Müller for the 4–3 winner.", matchId: "wc-1970-1970-06-17-semi-finals-italy-west-germany" },
        { title: "Carlos Alberto completed a whole-team idea", body: "Eight of Brazil's ten outfield players were involved in the move, which ended with Pelé pausing and releasing the captain. It was not just a great goal; it was the tournament distilled.", matchId: "wc-1970-1970-06-21-final-brazil-italy" }
      ]
    }),
    1974: edition({
      year: 1974,
      champion: "West Germany",
      flag: "🇩🇪",
      formation: "4-3-3",
      intro: "West Germany recovered from losing to East Germany and beat the Netherlands 2–1 in the final. Franz Beckenbauer reorganized the build-up from libero, Berti Vogts denied Cruyff clean turns, and Gerd Müller lived inside the one space Total Football could not rotate away.",
      introPlayers: ["Franz Beckenbauer", "Berti Vogts", { playerName: "Johan Cruyff", triggerText: "Cruyff" }, "Gerd Müller"],
      coach: {
        name: "Rinus Michels",
        teamName: "Netherlands",
        reason: { en: "The champions were better in the final, but Michels shaped the tournament: coordinated pressing, positional exchange and Cruyff's freedom made the Netherlands look as if they had an extra player around the ball." }
      },
      rows: [
        [player("Sepp Maier", "West Germany", "GK", "Maier's aggressive starting position supported Beckenbauer's high line, and his reflexes protected the champions during the Netherlands' opening surge in the final.", ["Jan Tomaszewski", "Poland"])],
        [
          player("Berti Vogts", "West Germany", "RB", "Vogts followed Cruyff without being dragged into every decoy, turning the final's most dangerous free role into a sequence of contested receptions.", ["Wim Suurbier", "Netherlands"]),
          player("Franz Beckenbauer", "West Germany", "CB", "From libero, Beckenbauer stepped around the first press and changed the point of attack; his calm after conceding in the first minute reset the final.", ["Luís Pereira", "Brazil"]),
          player("Elías Figueroa", "Chile", "CB", "Chile went out early, but Figueroa's anticipation and dominance in open space were unmistakable against both West and East Germany.", ["Georg Schwarzenbeck", "West Germany"]),
          player("Ruud Krol", "Netherlands", "LB", "Krol was the ideal Total Football defender—comfortable covering centrally, advancing outside and delivering the diagonal that began attacks before opponents had settled.", ["Paul Breitner", "West Germany"])
        ],
        [
          player("Johan Neeskens", "Netherlands", "CM", "Neeskens pressed like a forward, recovered like a holder and arrived like a striker; five goals included the final penalty after only 90 seconds.", ["Rivellino", "Brazil", "AM"]),
          player("Kazimierz Deyna", "Poland", "CM", "Deyna controlled Poland's direct speed with clipped passes and late runs, scoring three while letting Lato and Gadocha attack before the block formed.", ["Rainer Bonhof", "West Germany"]),
          player("Wolfgang Overath", "West Germany", "CM", "Overath won the internal midfield choice on form, giving Germany a left-footed controller who could slow matches and then release Breitner or Hölzenbein.", ["Wim van Hanegem", "Netherlands"])
        ],
        [
          player("Grzegorz Lato", "Poland", "RW", "Seven goals came from brutal transition timing: Lato waited on the shoulder, then attacked the channel the instant Deyna or Gadocha looked forward.", ["Johnny Rep", "Netherlands"]),
          player("Johan Cruyff", "Netherlands", "F9", "Cruyff was not a fixed striker but the tournament's organising force, moving to create overloads and making defenders choose between following him or losing the ball-side press.", ["Gerd Müller", "West Germany", "ST"]),
          player("Rob Rensenbrink", "Netherlands", "LW", "Rensenbrink gave the rotating Dutch attack a genuine left-sided dribbler, stretching the pitch when everyone else wanted to arrive centrally.", ["Robert Gadocha", "Poland"])
        ]
      ],
      highlights: [
        { title: "East Germany won the match that changed West Germany", body: "Jürgen Sparwasser's goal settled the first senior meeting between the states. The defeat also pushed the hosts into a more favourable second-round group and sharpened their selection." },
        { title: "The Netherlands pressed the holders off the pitch", body: "Against Brazil, the Dutch pressure arrived in waves until Neeskens and Cruyff scored. It was Total Football's clearest World Cup demonstration." },
        { title: "West Germany survived the opening minute", body: "The Netherlands scored before a German player touched the ball. Vogts then crowded Cruyff, Breitner equalized and Müller needed one half-chance to win the final.", matchId: "wc-1974-1974-07-07-final-netherlands-west-germany" }
      ]
    }),
    1978: edition({
      year: 1978,
      champion: "Argentina",
      flag: "🇦🇷",
      formation: "4-3-1-2",
      intro: "Argentina beat the Netherlands 3–1 after extra time. César Menotti's side mixed width with a ferocious central press: Daniel Passarella stepped into midfield, Osvaldo Ardiles connected the phases, and Mario Kempes attacked from deeper than any marker expected.",
      introPlayers: ["Daniel Passarella", "Osvaldo Ardiles", "Mario Kempes"],
      coach: {
        name: "César Luis Menotti",
        teamName: "Argentina",
        reason: { en: "Menotti kept faith with an attacking idea under extreme host pressure, using Luque to occupy centre-backs and freeing Kempes to arrive from midfield rather than wait inside the box." }
      },
      rows: [
        [player("Ubaldo Fillol", "Argentina", "GK", "Fillol's spring and hand strength saved Argentina in tight group matches and again when Rensenbrink and Rep broke through in the final.", ["Jan Jongbloed", "Netherlands"])],
        [
          player("Berti Vogts", "West Germany", "RB", "The holders disappointed, but Vogts still won his flank duels and advanced with enough timing to remain their most reliable outfield player.", ["Nelinho", "Brazil"]),
          player("Daniel Passarella", "Argentina", "CB", "Passarella defended on the front foot, hit diagonal passes beyond pressure and gave a young team its emotional edge as captain.", ["Oscar", "Brazil"]),
          player("Ruud Krol", "Netherlands", "CB", "Moved inside, Krol became the Dutch organiser and first playmaker, covering the adventurous full-backs while breaking lines with his left foot.", ["Gaetano Scirea", "Italy"]),
          player("Alberto Tarantini", "Argentina", "LB", "Tarantini supplied relentless width, aggressive counter-pressing and the back-post header against Peru that put Argentina on the way to the final.", ["Antonio Cabrini", "Italy"])
        ],
        [
          player("Osvaldo Ardiles", "Argentina", "CM", "Ardiles kept offering the next short pass under pressure, allowing Argentina to play through midfield instead of turning every recovery into a fight ball.", ["Toninho Cerezo", "Brazil"]),
          player("Teófilo Cubillas", "Peru", "AM", "Cubillas scored five with technique rather than repetition—the outside-of-the-foot free-kick against Scotland captured a playmaker operating at full confidence.", ["Arie Haan", "Netherlands", "CM"]),
          player("Dirceu", "Brazil", "CM", "Dirceu carried Brazil's left-sided creation, changed games from range and gave an unbeaten side the invention it lacked elsewhere.", ["Américo Gallego", "Argentina", "DM"])
        ],
        [player("Mario Kempes", "Argentina", "AM", "Menotti dropped him off the front line and unlocked the tournament. Kempes scored six in the second phase onward, including two surging finishes in the final.", ["Roberto Bettega", "Italy", "SS"])],
        [
          player("Paolo Rossi", "Italy", "ST", "Rossi's three goals mattered, but his diagonal runs were the bigger story: they opened Italy's combinations and made him the attack's sharpest forward.", ["Roberto Dinamite", "Brazil"]),
          player("Rob Rensenbrink", "Netherlands", "SS", "Five goals and constant left-sided threat; one late final shot hit the post, centimetres from turning a brilliant tournament into a title.", ["Leopoldo Luque", "Argentina", "ST"])
        ]
      ],
      highlights: [
        { title: "Kempes moved deeper and became untrackable", body: "He did not score in the first group phase. Once used as a runner from midfield, he struck six times in four games and twice in the final." },
        { title: "Tunisia earned Africa's first World Cup win", body: "Trailing Mexico at half-time, Tunisia adjusted its press and scored three after the break—a landmark result built on more than symbolism." },
        { title: "Rensenbrink hit the post, then Argentina took over", body: "The Dutch winger nearly won the final in the 90th minute. Extra time instead belonged to Kempes, whose second goal broke the emotional balance.", matchId: "wc-1978-1978-06-25-final-netherlands-argentina" }
      ]
    }),
    1982: edition({
      year: 1982,
      champion: "Italy",
      flag: "🇮🇹",
      formation: "4-3-3",
      intro: "Italy went from three group-stage draws to a 3–1 final win over West Germany. Gaetano Scirea played through the first press, Marco Tardelli made midfield a two-way fight, and Paolo Rossi turned four goalless games into six goals in the last three matches.",
      introPlayers: ["Gaetano Scirea", "Marco Tardelli", "Paolo Rossi"],
      coach: {
        name: "Enzo Bearzot",
        teamName: "Italy",
        reason: { en: "Bearzot protected Rossi through the criticism, kept the same core after the first group phase and trusted Italy's compact man-oriented defending to create the transitions their striker needed." }
      },
      rows: [
        [player("Dino Zoff", "Italy", "GK", "At 40, Zoff's positioning removed drama from difficult saves; his late claw from Oscar against Brazil preserved the 3–2 match that transformed Italy.", ["Harald Schumacher", "West Germany"])],
        [
          player("Claudio Gentile", "Italy", "RB", "Gentile's marking of Maradona and Zico was severe but tactically exact: deny the turn, accept the foul count, and keep Italy's centre protected.", ["Manfred Kaltz", "West Germany"]),
          player("Gaetano Scirea", "Italy", "CB", "Scirea was the calm inside Italy's aggression, sweeping behind Gentile and Collovati before stepping forward to begin attacks with his first touch.", ["Marius Trésor", "France"]),
          player("Fulvio Collovati", "Italy", "CB", "Collovati took the aerial and penalty-area work, allowing Scirea to sweep and step out; that partnership survived the second group phase, semi-final and final.", ["Luizinho", "Brazil"]),
          player("Júnior", "Brazil", "LB", "Júnior moved inside as a second playmaker, scoring against Argentina and helping Brazil create central overloads even when opponents sealed the wing.", ["Antonio Cabrini", "Italy"])
        ],
        [
          player("Marco Tardelli", "Italy", "CM", "Tardelli made Italy's midfield a two-way contest, pressed forward without abandoning the centre and scored against Argentina before his unforgettable final strike.", ["Alain Giresse", "France"]),
          player("Falcão", "Brazil", "CM", "Falcão was Brazil's balancing midfielder and its late-arriving scorer, changing the angle of attacks before drilling the 2–2 goal against Italy.", ["Sócrates", "Brazil"]),
          player("Zico", "Brazil", "AM", "Zico combined at a speed few teams could live with, scoring four and repeatedly releasing runners through the smallest central gaps.", ["Michel Platini", "France"])
        ],
        [
          player("Bruno Conti", "Italy", "RW", "Conti was Italy's genuine right-sided creator, carrying counters away from pressure and repeatedly unsettling West Germany before winning the final's opening penalty.", ["Pierre Littbarski", "West Germany"]),
          player("Paolo Rossi", "Italy", "ST", "Rossi stayed alive between centre-backs even when the ball did not arrive; once it did, six goals in the last three matches decided the tournament.", ["Karl-Heinz Rummenigge", "West Germany"]),
          player("Zbigniew Boniek", "Poland", "LW", "Boniek's hat-trick against Belgium displayed the full range—timed run, header and transition finish—and drove Poland to the semi-finals before suspension ruled him out.", ["Éder", "Brazil"])
        ]
      ],
      highlights: [
        { title: "Algeria beat West Germany and still went home", body: "Rabah Madjer and Lakhdar Belloumi produced a historic 2–1 win. The later West Germany–Austria result eliminated Algeria and exposed the danger of staggered final group matches." },
        { title: "Rossi ended Brazil's masterpiece", body: "Brazil needed a draw and twice equalized. Rossi kept attacking the blind side, scored a hat-trick and turned Italy from cautious survivor into favourite." },
        { title: "Seville swung from 1–3 to penalties", body: "France led West Germany by two in extra time. Rummenigge and Klaus Fischer brought it back before the first shootout in World Cup history decided the semi-final.", matchId: "wc-1982-1982-07-08-semi-finals-west-germany-france" }
      ]
    }),
    1986: edition({
      year: 1986,
      champion: "Argentina",
      flag: "🇦🇷",
      formation: "4-3-1-2",
      intro: "Argentina beat West Germany 3–2 with a side designed around Diego Maradona without becoming dependent on his dribbling alone. Three centre-backs secured the transitions, Jorge Valdano stretched the line, and Jorge Burruchaga attacked the channel Maradona kept revealing.",
      introPlayers: ["Diego Maradona", "Jorge Valdano", "Jorge Burruchaga"],
      coach: {
        name: "Carlos Bilardo",
        teamName: "Argentina",
        reason: { en: "Bilardo built the tournament's clearest bespoke system: a 3-5-2 that spared Maradona unnecessary defensive work, gave him two running targets and still had enough width to escape pressure." }
      },
      rows: [
        [player("Jean-Marie Pfaff", "Belgium", "GK", "Pfaff's explosive shot-stopping and willingness to sweep behind a loose defence gave Belgium the margin to survive two extra-time knockout matches.", ["Nery Pumpido", "Argentina"])],
        [
          player("Manuel Amoros", "France", "RB", "Amoros attacked from full-back with midfielder-level technique and still recovered for one-versus-one duels throughout France's demanding route.", ["Josimar", "Brazil"]),
          player("José Luis Brown", "Argentina", "CB", "Brown directed the champions' back line, played through a shoulder injury in the final and headed Argentina in front from Burruchaga's free-kick.", ["Oscar Ruggeri", "Argentina"]),
          player("Júlio César", "Brazil", "CB", "Júlio César defended huge spaces with pace and composure, then struck the post in the shootout that ended an otherwise elite tournament.", ["Karlheinz Förster", "West Germany"]),
          player("Julio Olarticoechea", "Argentina", "LB", "Olarticoechea played as the left wing-back outside Argentina's back three, securing the flank with disciplined positioning and vital far-post cover.", ["Hans-Peter Briegel", "West Germany"])
        ],
        [
          player("Jean Tigana", "France", "CM", "Tigana's carrying broke lines opponents had set for Platini, and his recovery work let France keep three creative midfielders on the pitch.", ["Sergio Batista", "Argentina"]),
          player("Jan Ceulemans", "Belgium", "CM", "Ceulemans gave Belgium a direct route through pressure and scored in three knockout matches—against the Soviet Union, Spain and France—on their run to fourth.", ["Lothar Matthäus", "West Germany"]),
          player("Michel Platini", "France", "CM", "Below his 1984 peak but still decisive, Platini connected France's midfield diamond and scored the equalizer in the classic against Brazil.", ["Enzo Scifo", "Belgium"])
        ],
        [player("Diego Maradona", "Argentina", "AM", "Five goals and five assists only begin it: Maradona carried the ball through pressure, fixed entire defensive lines and made Burruchaga's final winner with the pass of the tournament.", ["Jorge Burruchaga", "Argentina"])],
        [
          player("Gary Lineker", "England", "ST", "Six goals despite arriving after a broken wrist, Lineker lived on the edge of the six-yard box and attacked crosses before defenders could reset their feet.", ["Emilio Butragueño", "Spain"]),
          player("Preben Elkjær", "Denmark", "ST", "Elkjær's running power made Denmark's group-stage football so dangerous; his hat-trick against Uruguay came from attacking the back line again and again.", ["Jorge Valdano", "Argentina"])
        ]
      ],
      highlights: [
        { title: "Denmark's perfect group became a warning", body: "They beat West Germany and dismantled Uruguay 6–1, then Spain punished the same brave spacing in a 5–1 round-of-16 reversal." },
        { title: "Maradona scored two different kinds of impossible", body: "Against England, one goal exploited the officials and the next beat half the team. Together they captured his edge: opportunism followed by pure control.", matchId: "wc-1986-1986-06-22-quarter-finals-argentina-england" },
        { title: "Burruchaga found the last open lane", body: "West Germany came from 2–0 down and had the final tilting. Maradona received under pressure and released Burruchaga before the recovering line could close.", matchId: "wc-1986-1986-06-29-final-argentina-west-germany" }
      ]
    }),
    1990: edition({
      year: 1990,
      champion: "West Germany",
      flag: "🇩🇪",
      formation: "3-4-1-2",
      intro: "West Germany beat Argentina 1–0 in a tense final. Franz Beckenbauer's side owned the tournament through structure: Andreas Brehme provided left-sided creation, Lothar Matthäus controlled both boxes, and the front line kept pressing even when knockout games tightened.",
      introPlayers: ["Andreas Brehme", "Lothar Matthäus"],
      coach: {
        name: "Franz Beckenbauer",
        teamName: "West Germany",
        reason: { en: "Beckenbauer gave Germany width from wing-backs, a free defender behind the press and Matthäus the licence to carry through midfield—the most complete structure in a cagey tournament." }
      },
      rows: [
        [player("Sergio Goycochea", "Argentina", "GK", "A reserve until Pumpido's injury, Goycochea saved four shootout penalties and carried a depleted Argentina through two ties it could not control.", ["Luis Gabelo Conejo", "Costa Rica"])],
        [
          player("Franco Baresi", "Italy", "CB", "Baresi held Italy's line with immaculate timing; the hosts did not concede until the semi-final and rarely needed a last-ditch action.", ["Klaus Augenthaler", "West Germany"]),
          player("Jürgen Kohler", "West Germany", "CB", "Kohler's aggressive front-foot defending and recovery pace anchored the champions through the knockouts, including clean sheets against Czechoslovakia and Argentina.", ["Guido Buchwald", "West Germany"]),
          player("Paolo Maldini", "Italy", "CB", "Maldini erased his side of the pitch with recovery pace and precise body shape, allowing Italy's midfield to commit numbers forward.", ["Giuseppe Bergomi", "Italy"])
        ],
        [
          player("Thomas Berthold", "West Germany", "RB", "Berthold gave Germany disciplined right-sided width across seven starts, switching between defender and wing-back while carrying difficult marking work in the knockout rounds.", ["Paul Parker", "England"]),
          player("Lothar Matthäus", "West Germany", "CM", "Matthäus drove through midfield, scored four and dictated transition speed; even without taking the final penalty, he was the champion's competitive centre.", ["Dunga", "Brazil"]),
          player("Paul Gascoigne", "England", "CM", "Gascoigne's turns and carries gave England invention between rigid lines, while his tears after the semi-final booking revealed how much responsibility he had taken.", ["David Platt", "England"]),
          player("Andreas Brehme", "West Germany", "LB", "Brehme was Germany's two-footed left wing-back and chief wide creator, adding three goals and three assists before scoring the final penalty with his right foot.", ["Stuart Pearce", "England"])
        ],
        [player("Dragan Stojković", "Yugoslavia", "AM", "Stojković manipulated pressure with either foot and scored twice against Spain, including a feint that sat the defence down before his finish.", ["Diego Maradona", "Argentina"])],
        [
          player("Salvatore Schillaci", "Italy", "ST", "Started the tournament on the bench and scored six, attacking rebounds and broken lines with the nervous energy that came to define the host run.", ["Gary Lineker", "England"]),
          player("Jürgen Klinsmann", "West Germany", "ST", "Klinsmann pressed from the front, attacked both channels and scored three, giving Germany vertical threat whenever their possession became too comfortable.", ["Roger Milla", "Cameroon"])
        ]
      ],
      highlights: [
        { title: "Cameroon made the quarter-final feel possible", body: "They beat holders Argentina, then Milla twice punished Colombia in extra time. Only two Lineker penalties stopped them against England." },
        { title: "Goycochea kept moving the line", body: "Argentina survived Yugoslavia and hosts Italy through shootouts. Goycochea's patience—waiting for the taker's plant foot—became their tournament plan." },
        { title: "Brehme settled a final built on inches", body: "Argentina finished with nine men and Germany still needed an 85th-minute penalty. Brehme opened his body and passed it low beyond Goycochea.", matchId: "wc-1990-1990-07-08-final-west-germany-argentina" }
      ]
    }),
    1994: edition({
      year: 1994,
      champion: "Brazil",
      flag: "🇧🇷",
      formation: "3-4-3",
      intro: "Brazil beat Italy on penalties after a 0–0 final. Carlos Alberto Parreira stripped away romantic excess without losing attacking quality: Dunga protected the centre, Bebeto moved between lines, and Romário converted small advantages into decisive goals.",
      introPlayers: ["Dunga", "Bebeto", "Romário"],
      coach: {
        name: "Carlos Alberto Parreira",
        teamName: "Brazil",
        reason: { en: "Parreira accepted that this Brazil needed control before expression, pairing Dunga and Mauro Silva so Romário and Bebeto could stay connected through every tight knockout match." }
      },
      rows: [
        [player("Michel Preud'homme", "Belgium", "GK", "Preud'homme was the tournament's purest shot-stopper, making a stream of difficult saves behind an ageing Belgium side even in elimination.", ["Cláudio Taffarel", "Brazil"])],
        [
          player("Jorginho", "Brazil", "RB", "Jorginho supplied clean right-sided progression and early crosses without exposing Brazil's central shield, leaving the final injured after an excellent tournament.", ["Dan Petrescu", "Romania"]),
          player("Márcio Santos", "Brazil", "CB", "Márcio Santos defended wide spaces when Brazil's full-backs advanced and held his nerve through 120 scoreless final minutes, giving the champions calm cover beside Aldair.", ["Aldair", "Brazil"]),
          player("Paolo Maldini", "Italy", "CB", "Maldini moved between left-back and centre-back as injuries reshaped Italy, defending multiple roles without conceding in the semi-final or final.", ["Trifon Ivanov", "Bulgaria"])
        ],
        [
          player("Dunga", "Brazil", "DM", "Dunga won the ugly second ball, switched play early and set the emotional limit for a side determined never to become stretched.", ["Mauro Silva", "Brazil"]),
          player("Krasimir Balakov", "Bulgaria", "CM", "Balakov was Bulgaria's understated connector, carrying out of pressure and feeding Stoichkov and Letchkov before defensive blocks could settle.", ["Fernando Redondo", "Argentina"]),
          player("Gheorghe Hagi", "Romania", "AM", "Hagi played the tournament at his preferred speed, seeing switches and shots before defenders; three goals and four assists drove Romania to within one shootout of the semi-finals.", ["Yordan Letchkov", "Bulgaria"]),
          player("Tomas Brolin", "Sweden", "AM", "Brolin drifted from the right into pockets, linked every transition and scored the rehearsed corner that beat Romania in the quarter-final.", ["José Luis Caminero", "Spain"])
        ],
        [
          player("Roberto Baggio", "Italy", "SS", "Quiet and physically strained early, Baggio then scored five knockout goals and repeatedly solved games Italy had not controlled.", ["Bebeto", "Brazil"]),
          player("Romário", "Brazil", "ST", "Romário needed almost no backlift or space; five goals and the semi-final header against Sweden made him the tournament's best converter of tiny openings.", ["Kennet Andersson", "Sweden"]),
          player("Hristo Stoichkov", "Bulgaria", "LW", "Stoichkov's left foot produced six goals, but his aggression without the ball and willingness to carry transitions made Bulgaria's semi-final run sustainable.", ["Marc Overmars", "Netherlands"])
        ]
      ],
      highlights: [
        { title: "Saudi Arabia dribbled into the knockouts", body: "Saeed Al-Owairan ran from inside his own half through Belgium's defence. The goal secured a round-of-16 place in the country's first appearance." },
        { title: "Bulgaria knocked out the holders", body: "Germany led until the 75th minute. Stoichkov bent in a free-kick, Letchkov attacked the next cross, and a team that had never won a World Cup match reached the semi-finals." },
        { title: "The first final shootout came down to Baggio", body: "After 120 scoreless minutes, Taffarel saved from Massaro. Baggio's miss ended it, but Brazil's control across seven matches had earned the fourth star.", matchId: "wc-1994-1994-07-17-final-brazil-italy" }
      ]
    }),
    1998: edition({
      year: 1998,
      champion: "France",
      flag: "🇫🇷",
      formation: "4-2-2-2",
      intro: "France beat Brazil 3–0 for their first title. The hosts won from the back forward: Marcel Desailly protected space, Didier Deschamps and Emmanuel Petit controlled transitions, and Zinedine Zidane finally turned dominance into goals on the biggest night.",
      introPlayers: ["Marcel Desailly", "Didier Deschamps", "Emmanuel Petit", "Zinedine Zidane"],
      coach: {
        name: "Aimé Jacquet",
        teamName: "France",
        reason: { en: "Jacquet absorbed years of criticism and built the tournament's best defensive platform, then changed the final shape so Zidane could attack the zone Brazil left around its full-backs." }
      },
      rows: [
        [player("Fabien Barthez", "France", "GK", "Barthez's speed off his line supported France's compression; he conceded only twice, against Denmark in the group and Croatia in the semi-final.", ["José Luis Chilavert", "Paraguay"])],
        [
          player("Lilian Thuram", "France", "RB", "Thuram erased France's right side for most of the tournament, then scored twice to reverse the semi-final and send the hosts into their first World Cup final.", ["Cafu", "Brazil"]),
          player("Marcel Desailly", "France", "CB", "Desailly dominated the space in front of Barthez and covered Leboeuf in the final, his red card the only blemish on a commanding tournament.", ["Frank de Boer", "Netherlands"]),
          player("Carlos Gamarra", "Paraguay", "CB", "Gamarra completed every tackle without committing a foul, anchoring a side that conceded twice in four matches and took France to a golden goal.", ["Frank Leboeuf", "France"]),
          player("Roberto Carlos", "Brazil", "LB", "His recovery pace allowed Brazil to play asymmetrically around Cafu; the crossing and set-piece threat remained a constant route even when the centre stalled.", ["Bixente Lizarazu", "France"])
        ],
        [
          player("Dunga", "Brazil", "DM", "Dunga again gave Brazil competitive order, splitting centre-backs in build-up and controlling the space abandoned by the attacking full-backs.", ["Emmanuel Petit", "France"]),
          player("Edgar Davids", "Netherlands", "CM", "Recalled after an earlier dispute, Davids gave the Dutch midfield ball-winning and forward thrust, including the late winner against Yugoslavia.", ["Didier Deschamps", "France"])
        ],
        [
          player("Zinedine Zidane", "France", "AM", "Suspension interrupted Zidane's tournament, but he remained France's creative reference and produced his defining display in the final. His two headers secured the hosts' first World Cup title.", ["Rivaldo", "Brazil"]),
          player("Dennis Bergkamp", "Netherlands", "AM", "Bergkamp made every reception between the lines purposeful; his control, cut and finish against Argentina was the tournament's most technically complete decisive goal.", ["Michael Laudrup", "Denmark"])
        ],
        [
          player("Ronaldo", "Brazil", "ST", "Four goals and three assists before the troubled final, Ronaldo terrified back lines by receiving to feet and still winning the race behind them.", ["Christian Vieri", "Italy"]),
          player("Davor Šuker", "Croatia", "ST", "Šuker's six goals powered debutants Croatia to third place; he drifted away from centre-backs and finished early, before goalkeepers could set.", ["Brian Laudrup", "Denmark"])
        ]
      ],
      highlights: [
        { title: "Bergkamp needed three touches", body: "Frank de Boer's 60-yard pass, one velvet control, a cut inside Ayala and an outside-foot finish eliminated Argentina in the 90th minute." },
        { title: "Thuram turned the semi-final himself", body: "Croatia led the semi-final through Šuker. Thuram immediately equalized, then curled in the winner to send France into their first World Cup final." },
        { title: "Zidane attacked Brazil's zonal seam", body: "France targeted corners between the near zonal defender and man-markers. Zidane reached that space twice, and the final was effectively over by half-time.", matchId: "wc-1998-1998-07-12-final-brazil-france" }
      ]
    }),
    2002: edition({
      year: 2002,
      champion: "Brazil",
      flag: "🇧🇷",
      formation: "3-4-1-2",
      intro: "Brazil beat Germany 2–0 and won all seven matches. Luiz Felipe Scolari's back three freed Cafu and Roberto Carlos, Gilberto Silva protected every transition, and the three Rs combined with enough separation to make improvisation structurally safe.",
      introPlayers: ["Cafu", "Roberto Carlos", "Gilberto Silva"],
      coach: {
        name: "Luiz Felipe Scolari",
        teamName: "Brazil",
        reason: { en: "Scolari traded Brazil's qualifying uncertainty for role clarity: three centre-backs, two high wing-backs, Gilberto as the screen and complete attacking freedom for Rivaldo, Ronaldinho and Ronaldo." }
      },
      rows: [
        [player("Oliver Kahn", "Germany", "GK", "Kahn was Germany's route to the final, conceding once in six matches and making difficult saves look routine until the one spill Ronaldo punished.", ["Rüştü Reçber", "Turkey"])],
        [
          player("Alpay Özalan", "Turkey", "CB", "Alpay defended forward and distributed cleanly, giving Turkey the courage to keep its block higher during an extraordinary run to third.", ["Lúcio", "Brazil"]),
          player("Hong Myung-bo", "South Korea", "CB", "Hong organized the hosts' aggressive back line, stepped into midfield to support the press and stayed composed through the golden-goal win over Italy and the shootout against Spain.", ["Rio Ferdinand", "England"]),
          player("Sol Campbell", "England", "CB", "Campbell dominated aerially, scored in the opener and defended huge transition spaces behind England's reactive midfield.", ["Edmílson", "Brazil"])
        ],
        [
          player("Cafu", "Brazil", "RB", "Cafu's third straight final came with endless right-sided running; the back three let him press high without leaving Brazil structurally naked.", ["Ümit Davala", "Turkey"]),
          player("Gilberto Silva", "Brazil", "DM", "Gilberto played every minute and quietly solved the whole system, screening beneath four adventurous teammates and moving the ball before pressure arrived.", ["Claudio Reyna", "USA"]),
          player("Michael Ballack", "Germany", "CM", "Ballack drove Germany through the knockout rounds, scoring both 1–0 winners before a tactical yellow card suspended him from the final.", ["Yoo Sang-chul", "South Korea"]),
          player("Roberto Carlos", "Brazil", "LB", "Roberto Carlos supplied the left-sided width and long-range threat, but his recovery speed was just as important to Scolari's high wing-back plan.", ["Lee Young-pyo", "South Korea"])
        ],
        [player("Ronaldinho", "Brazil", "AM", "Ronaldinho linked the midfield to the front two, then transformed the quarter-final against England with a carry, assist and audacious free-kick.", ["Hasan Şaş", "Turkey"])],
        [
          player("Rivaldo", "Brazil", "ST", "Rivaldo scored in the first five matches and constantly drifted left to create the separation Ronaldo needed through the centre.", ["El Hadji Diouf", "Senegal"]),
          player("Ronaldo", "Brazil", "ST", "Eight goals after years of knee trauma, including both in the final; his first-step movement returned before defenders were ready to believe it had.", ["Miroslav Klose", "Germany"])
        ]
      ],
      highlights: [
        { title: "Senegal beat the holders, then kept going", body: "Papa Bouba Diop's goal shocked France on opening day. Henri Camara's golden goal against Sweden later made Senegal only Africa's second quarter-finalist." },
        { title: "South Korea pressed into the semi-finals", body: "The hosts eliminated Italy and Spain in tense knockout matches. Hong Myung-bo's line and a relentless midfield press made the run tactically credible, whatever the refereeing controversy." },
        { title: "Ronaldo finished the recovery", body: "Kahn's first error of the tournament gave him the opening; Kleberson and Rivaldo created the second. Ronaldo scored both and left Yokohama with eight.", matchId: "wc-2002-2002-06-30-final-germany-brazil" }
      ]
    }),
    2006: edition({
      year: 2006,
      champion: "Italy",
      flag: "🇮🇹",
      formation: "4-3-1-2",
      intro: "Italy beat France on penalties after a 1–1 final. Marcello Lippi trusted a complete squad rather than a fixed attacking star: Andrea Pirlo escaped the first press, Fabio Cannavaro defended the next action, and ten different Italians scored.",
      introPlayers: ["Andrea Pirlo", "Fabio Cannavaro"],
      coach: {
        name: "Marcello Lippi",
        teamName: "Italy",
        reason: { en: "Lippi used every outfield player, changed Italy's attacking shape without weakening its base and made bold semi-final substitutions that turned a likely shootout into a 2–0 extra-time win." }
      },
      rows: [
        [player("Gianluigi Buffon", "Italy", "GK", "Buffon conceded only an own goal and a penalty before the shootout, his extra-time tip over Zidane's header the final's decisive save.", ["Jens Lehmann", "Germany"])],
        [
          player("Gianluca Zambrotta", "Italy", "RB", "Zambrotta defended either flank, carried Italy out of pressure and scored a fierce quarter-final goal without compromising the back line.", ["Miguel", "Portugal"]),
          player("Fabio Cannavaro", "Italy", "CB", "Cannavaro attacked every first ball despite being undersized for the role, then stepped forward with it—most memorably starting the move for Del Piero's semi-final goal.", ["Ricardo Carvalho", "Portugal"]),
          player("Lilian Thuram", "France", "CB", "Moved permanently inside, Thuram defended the channels with calm authority and helped France keep clean sheets against Brazil and Portugal before the final.", ["Marco Materazzi", "Italy"]),
          player("Philipp Lahm", "Germany", "LB", "Lahm opened the tournament with a curled goal and stayed central to Germany's progress, advancing inside or outside with equal comfort.", ["Fabio Grosso", "Italy"])
        ],
        [
          player("Andrea Pirlo", "Italy", "CM", "Pirlo was the tournament's best first passer, receiving beside pressure and turning recoveries into attacks; he created the semi-final winner and scored first in the shootout.", ["Claude Makélélé", "France"]),
          player("Patrick Vieira", "France", "CM", "Vieira recovered his authority as the tournament deepened, winning duels, carrying through the centre and scoring the goal that broke Spain.", ["Gennaro Gattuso", "Italy"]),
          player("Maniche", "Portugal", "CM", "Maniche's pressing and late runs gave Portugal thrust around Deco, including the swerving winner that eliminated the Netherlands.", ["Michael Ballack", "Germany"])
        ],
        [player("Zinedine Zidane", "France", "AM", "Zidane controlled the knockouts with body feints and passing angles, producing a masterclass against Brazil before the final ended in brilliance and self-destruction.", ["Juan Román Riquelme", "Argentina"])],
        [
          player("Thierry Henry", "France", "ST", "Henry stretched every back line, finished the one chance against Brazil and gave Zidane the depth required to receive between midfield and defence.", ["Luca Toni", "Italy"]),
          player("Miroslav Klose", "Germany", "ST", "Five goals won the Golden Boot, but Klose's improved link play made Germany's 4-4-2 more fluid than a simple crossing team.", ["David Villa", "Spain"])
        ]
      ],
      highlights: [
        { title: "Argentina assembled the goal of the tournament", body: "Twenty-four passes moved Serbia and Montenegro until Cambiasso finished. It was Pekerman's patient positional football at full speed." },
        { title: "Italy attacked before penalties could arrive", body: "Lippi ended the semi-final with four forwards on the pitch. Grosso and Del Piero scored in the final two minutes of extra time to silence Dortmund." },
        { title: "The final turned on one last duel", body: "Zidane's Panenka and Materazzi's header made it 1–1. Their extra-time confrontation removed France's creator; Italy converted all five penalties.", matchId: "wc-2006-2006-07-09-final-italy-france" }
      ]
    }),
    2010: edition({
      year: 2010,
      champion: "Spain",
      flag: "🇪🇸",
      formation: "4-2-3-1",
      intro: "Spain beat the Netherlands 1–0 after extra time. The title came through patient territorial control rather than a flood of chances: Sergio Busquets protected every circulation, Xavi kept moving the block, and Andrés Iniesta attacked the space that finally opened.",
      introPlayers: ["Sergio Busquets", "Xavi", "Andrés Iniesta"],
      coach: {
        name: "Vicente del Bosque",
        teamName: "Spain",
        reason: { en: "Del Bosque responded to the opening loss without abandoning the idea, using Busquets and Xabi Alonso to secure possession as Spain navigated five one-goal wins, with Villa and Iniesta providing most of the decisive attacking moments." }
      },
      rows: [
        [player("Iker Casillas", "Spain", "GK", "Casillas recovered from a nervous opening match to keep four straight knockout clean sheets, saving Cardozo's penalty and denying Robben one-on-one in the final.", ["Manuel Neuer", "Germany"])],
        [
          player("Maicon", "Brazil", "RB", "Maicon gave Brazil its most forceful attacking width, including the impossible-angle goal against North Korea and constant underlapping power.", ["Sergio Ramos", "Spain"]),
          player("Gerard Piqué", "Spain", "CB", "Piqué stepped into midfield to keep Spain's attacks alive and defended the wide transition spaces created by their long possessions.", ["Diego Lugano", "Uruguay"]),
          player("Carles Puyol", "Spain", "CB", "Puyol attacked danger before it developed, then attacked Xavi's corner with the same conviction to score the semi-final winner against Germany.", ["Lúcio", "Brazil"]),
          player("Fábio Coentrão", "Portugal", "LB", "Coentrão was Portugal's best progression route, carrying past pressure and recovering fast enough to make their defensive block more ambitious.", ["Joan Capdevila", "Spain"])
        ],
        [
          player("Sergio Busquets", "Spain", "DM", "Busquets made Spain's risk look safe, closing the centre after every turnover and playing the first forward pass before opponents could form a press.", ["Xabi Alonso", "Spain"]),
          player("Bastian Schweinsteiger", "Germany", "CM", "Recast as a central controller, Schweinsteiger dismantled Argentina with switches and carries before Spain denied him the same open transition field.", ["Mark van Bommel", "Netherlands"])
        ],
        [
          player("Thomas Müller", "Germany", "RW", "Five goals and three assists came from elite interpretation rather than fixed positioning; his suspension exposed how much Germany relied on those blind-side runs.", ["Arjen Robben", "Netherlands"]),
          player("Wesley Sneijder", "Netherlands", "AM", "Sneijder's early vertical passing and five goals gave a pragmatic Dutch side its incision, from the Brazil comeback to the semi-final against Uruguay.", ["Xavi", "Spain"]),
          player("David Villa", "Spain", "LW", "Villa scored five of Spain's eight goals, drifting in from the left to find room and repeatedly turning low-event matches with one precise finish.", ["Andrés Iniesta", "Spain"])
        ],
        [player("Diego Forlán", "Uruguay", "ST", "Forlán dropped away from centre-backs, struck the Jabulani cleaner than anyone and scored five distinct goals while carrying Uruguay's creative burden.", ["Luis Suárez", "Uruguay"])],
      ],
      highlights: [
        { title: "New Zealand left unbeaten", body: "The 78th-ranked team drew all three matches, including one with defending champions Italy. Their compact 3-4-3 gave up territory without giving up the tournament." },
        { title: "Ghana came one kick from history", body: "Suárez handled on the line in the 120th minute, Gyan hit the bar from the penalty and Uruguay survived the shootout. Africa's first semi-final disappeared in seconds." },
        { title: "Iniesta found the right half-space at last", body: "The final was bruising and narrow. Fàbregas released Iniesta in the 116th minute, and Spain's most persistent interior runner finally reached open grass.", matchId: "wc-2010-2010-07-11-final-netherlands-spain" }
      ]
    }),
    2014: edition({
      year: 2014,
      champion: "Germany",
      flag: "🇩🇪",
      formation: "4-3-3",
      intro: "Germany beat Argentina 1–0 after extra time, the product of a flexible squad rather than one fixed XI. Philipp Lahm restored the right side, Manuel Neuer defended beyond his box, and Toni Kroos gave a high-tempo team the pass that controlled its breathing.",
      introPlayers: ["Philipp Lahm", "Manuel Neuer", "Toni Kroos"],
      coach: {
        name: "Joachim Löw",
        teamName: "Germany",
        reason: { en: "Löw corrected his own experiment by moving Lahm from midfield back to full-back, then used a deep bench and fluid front line to survive Algeria, overwhelm Brazil and outlast Argentina." }
      },
      rows: [
        [player("Manuel Neuer", "Germany", "GK", "Neuer turned goalkeeping into territorial control, sweeping repeatedly against Algeria and letting Germany hold a line no conventional keeper could insure.", ["Keylor Navas", "Costa Rica"])],
        [
          player("Philipp Lahm", "Germany", "RB", "Germany became balanced when Lahm returned to right-back; he overlapped, inverted and shut the transition lane without ever looking hurried.", ["Pablo Zabaleta", "Argentina"]),
          player("Mats Hummels", "Germany", "CB", "Hummels dominated first contacts, passed through pressure and headed the quarter-final winner while managing a knee problem.", ["Ron Vlaar", "Netherlands"]),
          player("Ezequiel Garay", "Argentina", "CB", "Garay anchored a defence that did not trail until the final's 113th minute, winning the box while Mascherano protected in front.", ["Thiago Silva", "Brazil"]),
          player("Marcos Rojo", "Argentina", "LB", "Rojo attacked with surprising freedom, scored in the group and brought enough aggression to keep Argentina's otherwise conservative left side alive.", ["Daley Blind", "Netherlands"])
        ],
        [
          player("Javier Mascherano", "Argentina", "DM", "Mascherano was Argentina's emergency brake and emotional centre, most memorably tracking Robben into the box and timing the semi-final's defining recovery tackle.", ["Bastian Schweinsteiger", "Germany"]),
          player("Toni Kroos", "Germany", "CM", "Kroos controlled Germany's left half-space, delivered set pieces and scored twice in 69 seconds during the semi-final demolition.", ["Paul Pogba", "France"]),
          player("James Rodríguez", "Colombia", "AM", "Six goals in five games without losing his playmaking: James received between lines, turned early and produced the tournament's cleanest strike against Uruguay.", ["Lionel Messi", "Argentina"])
        ],
        [
          player("Arjen Robben", "Netherlands", "RW", "Robben carried the Dutch attack through changing shapes, isolating defenders and turning every transition into a retreat toward their own goal.", ["Ángel Di María", "Argentina"]),
          player("Thomas Müller", "Germany", "ST", "Müller added five more goals through the same difficult-to-teach habit: leaving the obvious zone before arriving in the decisive one.", ["Karim Benzema", "France"]),
          player("Neymar", "Brazil", "LW", "Before injury ended his tournament, Neymar carried Brazil's scoring and progression burden; four goals masked how little creation existed around him.", ["Alexis Sánchez", "Chile"])
        ]
      ],
      highlights: [
        { title: "Costa Rica won the champions' group", body: "Drawn with Uruguay, Italy and England, Costa Rica pressed intelligently, conceded twice in five matches and reached a quarter-final shootout." },
        { title: "Germany scored five before Brazil could reset", body: "Between the 11th and 29th minutes, Brazil's spacing and emotional control collapsed. Germany kept making the extra pass and finished the semi-final 7–1.", matchId: "wc-2014-2014-07-08-semi-finals-brazil-germany" },
        { title: "Götze made a substitute's final touch", body: "Schürrle's cross arrived behind him. Götze cushioned it on his chest and volleyed across Romero in the 113th minute—the bench winning the final for Löw.", matchId: "wc-2014-2014-07-13-final-germany-argentina" }
      ]
    }),
    2018: edition({
      year: 2018,
      champion: "France",
      flag: "🇫🇷",
      formation: "4-3-3",
      intro: "France beat Croatia 4–2 with a team comfortable letting opponents have the ball. N'Golo Kanté and Paul Pogba controlled transition distance, Antoine Griezmann joined midfield to create the spare man, and Kylian Mbappé turned open grass into a tactical weapon.",
      introPlayers: ["N'Golo Kanté", "Paul Pogba", "Antoine Griezmann", "Kylian Mbappé"],
      coach: {
        name: "Didier Deschamps",
        teamName: "France",
        reason: { en: "Deschamps made restraint a strength, accepting a lopsided shape around Mbappé and Matuidi so France could protect the centre, dominate transitions and adapt to every game state." }
      },
      rows: [
        [player("Thibaut Courtois", "Belgium", "GK", "Courtois' reach and patience were decisive against Brazil and England; he conceded six, but repeatedly saved chances created after Belgium's ambitious shape broke.", ["Hugo Lloris", "France"])],
        [
          player("Kieran Trippier", "England", "RB", "As a wing-back, Trippier was England's primary chance creator through early crosses and set pieces, including the semi-final free-kick.", ["Benjamin Pavard", "France"]),
          player("Raphaël Varane", "France", "CB", "Varane defended space rather than chasing duels, dominated Uruguay in the air and gave France a clean first pass throughout the knockout rounds.", ["Toby Alderweireld", "Belgium"]),
          player("Diego Godín", "Uruguay", "CB", "Godín controlled the box and pushed Uruguay's line forward, the defensive authority behind three wins and only one goal conceded before the quarter-final.", ["Samuel Umtiti", "France"]),
          player("Lucas Hernández", "France", "LB", "Hernández accepted the conservative side of France's asymmetry, winning duels and choosing exactly when an overlap would not expose the transition.", ["Ivan Strinić", "Croatia"])
        ],
        [
          player("N'Golo Kanté", "France", "DM", "Kanté closed the spaces behind Pogba and Mbappé, often winning the ball early enough that France's transition began before opponents knew possession had changed.", ["Marcelo Brozović", "Croatia"]),
          player("Luka Modrić", "Croatia", "CM", "Modrić carried Croatia through three extra-time ties, escaping pressure with body position and continuing to demand the ball when fatigue should have ended the idea.", ["Ivan Rakitić", "Croatia"]),
          player("Kevin De Bruyne", "Belgium", "CM", "Used deeper and then as a false nine, De Bruyne's early passing tore through Brazil and made Belgium's changing shapes feel coherent.", ["Paul Pogba", "France"])
        ],
        [
          player("Kylian Mbappé", "France", "RW", "Mbappé's speed changed opponents' starting positions before kickoff; his two goals against Argentina and calm final strike made the threat concrete.", ["Ante Rebić", "Croatia"]),
          player("Antoine Griezmann", "France", "ST", "Griezmann dropped into midfield to connect France's cautious shape, created from set pieces and still finished with four goals and two assists.", ["Harry Kane", "England"]),
          player("Eden Hazard", "Belgium", "LW", "Hazard beat the first defender almost at will, carried Belgium out of pressure and controlled transitions instead of simply rushing them.", ["Ivan Perišić", "Croatia"])
        ]
      ],
      highlights: [
        { title: "Japan nearly completed the perfect underdog plan", body: "Japan led Belgium 2–0 through brave positional play. Belgium's height changed the tie, then a 14-second counter from Courtois to Chadli won it at 94:19." },
        { title: "Belgium used a false nine to eliminate Brazil", body: "Lukaku moved right, De Bruyne started centrally and Hazard held the left. The shape pulled Brazil apart before Courtois protected the 2–1 lead." },
        { title: "France kept winning the game that appeared", body: "The final brought an own goal, set-piece pressure, Croatian possession and open transitions. France had an answer for each phase and four different routes to goal.", matchId: "wc-2018-2018-07-15-final-france-croatia" }
      ]
    }),
    2022: edition({
      year: 2022,
      champion: "Argentina",
      flag: "🇦🇷",
      formation: "4-3-3",
      intro: "Argentina recovered from defeat to Saudi Arabia and beat France on penalties after a 3–3 final. Lionel Scaloni rebuilt the midfield around each opponent, Enzo Fernández accelerated the first pass, and Lionel Messi controlled the tournament from the right half-space.",
      introPlayers: ["Enzo Fernández", "Lionel Messi"],
      coach: {
        name: "Lionel Scaloni",
        teamName: "Argentina",
        reason: { en: "Scaloni never confused continuity with rigidity: he changed personnel and shape after the opening loss, used a 4-4-2 to close the Netherlands, then surprised France with Di María on the left." }
      },
      rows: [
        [player("Emiliano Martínez", "Argentina", "GK", "Martínez owned the tournament's highest-leverage moments: two shootouts and the spread save from Kolo Muani in the 123rd minute of the final.", ["Yassine Bounou", "Morocco"])],
        [
          player("Achraf Hakimi", "Morocco", "RB", "Hakimi carried Morocco out of pressure, recovered at elite speed and still overlapped often enough to stop their low block becoming passive.", ["Nahuel Molina", "Argentina"]),
          player("Nicolás Otamendi", "Argentina", "CB", "Otamendi defended forward throughout Argentina's recovery, winning first balls and allowing the midfield to stay close enough to Messi.", ["Raphaël Varane", "France"]),
          player("Joško Gvardiol", "Croatia", "CB", "Gvardiol defended enormous spaces, advanced through pressure and answered Messi's semi-final lesson with a brilliant third-place goal.", ["Romain Saïss", "Morocco"]),
          player("Theo Hernández", "France", "LB", "Theo turned his brother's injury into a decisive left-back role, underlapping around Mbappé and scoring the early semi-final goal that forced Morocco out.", ["Yahya Attiat-Allah", "Morocco"])
        ],
        [
          player("Sofyan Amrabat", "Morocco", "DM", "Amrabat screened the centre, carried through pressure and produced the tournament's defining recovery tackle on Mbappé in the semi-final.", ["Aurélien Tchouaméni", "France"]),
          player("Enzo Fernández", "Argentina", "CM", "Introduced from the bench, Enzo made himself indispensable by passing forward early, covering Messi's side and scoring against Mexico when the campaign was stuck.", ["Alexis Mac Allister", "Argentina"]),
          player("Antoine Griezmann", "France", "CM", "Griezmann operated as France's free right-sided midfielder, leading the tournament in chances created before Argentina crowded him out of the final.", ["Luka Modrić", "Croatia"])
        ],
        [
          player("Lionel Messi", "Argentina", "RW", "Messi scored seven, assisted three and solved every knockout round differently—from the disguised pass against the Netherlands to the carry that undid Gvardiol.", ["Bukayo Saka", "England"]),
          player("Julián Álvarez", "Argentina", "ST", "Álvarez won the centre-forward place after two substitute appearances, scored four and stretched knockout defences so Messi could receive between the lines.", ["Olivier Giroud", "France"]),
          player("Kylian Mbappé", "France", "LW", "Mbappé was the tournament's outstanding left-sided wide forward, scoring eight and repeatedly attacking from the flank before moving centrally as the final changed.", ["Vinícius Júnior", "Brazil"])
        ]
      ],
      highlights: [
        { title: "Saudi Arabia broke Argentina's line", body: "Hervé Renard's high block kept catching Argentina offside, then Al-Shehri and Al-Dawsari turned two second-half openings into the tournament's greatest upset." },
        { title: "Morocco made defending feel expansive", body: "They eliminated Spain and Portugal while still progressing through Hakimi, Ounahi and Boufal. The first African semi-finalist was organized, not merely resistant." },
        { title: "The final contained three different matches", body: "Argentina dominated, Mbappé forced extra time, then both scored again. Martínez's 123rd-minute save and Montiel's penalty finally separated them.", matchId: "wc-2022-2022-12-18-final-argentina-france" }
      ]
    })
  })
});

const nextWorldCupPreview = (preview) => Object.freeze({
  ...preview,
  hosts: Object.freeze(preview.hosts),
  sources: Object.freeze(preview.sources)
});

// For combined host-and-holder milestones, firstDate is when the later of the two automatic places became known.
export const HISTORICAL_NEXT_WORLD_CUP_PREVIEWS = Object.freeze({
  1930: nextWorldCupPreview({
    nextYear: 1934, hosts: ["Italy"], qualificationMode: "host_must_qualify",
    firstDate: "1934-03-25", drawDate: "1934-05-03", drawLocation: "Rome", groupCount: null,
    openingFixtureId: "wc-1934-1934-05-27-preliminary-round-italy-united-states",
    lead: "Italy will host the first World Cup staged in Europe, with qualification introduced for the first time.",
    firstTitle: "Italy earns its place",
    firstBody: "Italy are the only hosts ever required to qualify. They beat Greece 4–0 at San Siro in Milan, and Greece withdrew before the return leg.",
    drawTitle: "The knockout bracket is drawn",
    drawBody: "The final draw in Rome will set the 16-team knockout bracket.",
    openingBody: "Eight Round of 16 matches will kick off together across Italy. The hosts face the United States in Rome.",
    sources: ["https://inside.fifa.com/fr/news/25-mars-1934-l-italie-gagne-sa-place-pour-sa-coupe-du-monde", "https://www.rsssf.org/tables/34full.html"]
  }),
  1934: nextWorldCupPreview({
    nextYear: 1938, hosts: ["France"], qualificationMode: "hosts_and_holders", holder: "Italy",
    firstDate: "1936-08-15", drawDate: "1938-03-05", drawLocation: "Paris", groupCount: null,
    openingFixtureId: "wc-1938-1938-06-04-first-round-switzerland-germany",
    lead: "France will host the World Cup as the tournament stays in Europe for a second successive edition.",
    firstTitle: "France and Italy have their places",
    firstBody: "France qualify automatically as hosts, while Italy return as defending champions. This is the first World Cup to reserve places for both.",
    drawTitle: "The knockout bracket is drawn", drawBody: "The final draw in Paris will set the 16-team knockout bracket.",
    openingBody: "Germany and Switzerland will open the tournament at Parc des Princes in Paris.",
    sources: ["https://inside.fifa.com/en/tournaments/mens/worldcup/1938france/news/double-joy-for-pozzo-s-italy", "https://www.rsssf.org/tables/38full.html"]
  }),
  1938: nextWorldCupPreview({
    nextYear: 1950, hosts: ["Brazil"], qualificationMode: "hosts_and_holders", holder: "Italy",
    firstDate: "1946-07-26", drawDate: "1950-05-22", drawLocation: "Itamaraty Palace, Rio de Janeiro", groupCount: 4,
    openingFixtureId: "wc-1950-1950-06-24-first-round-brazil-mexico",
    lead: "Brazil will host the first World Cup in 12 years after the Second World War interrupts the tournament.",
    firstTitle: "Brazil and Italy have their places", firstBody: "Brazil qualify automatically as hosts, while Italy return as defending champions.",
    drawTitle: "The groups are drawn", drawBody: "The draw at Itamaraty Palace in Rio de Janeiro will divide the field into four first-round groups.",
    openingBody: "Brazil will open against Mexico in the first official match at the Maracanã in Rio de Janeiro.",
    sources: ["https://inside.fifa.com/tournaments/mens/worldcup/1950brazil/news/brazil-s-first-world-cup-draw", "https://www.rsssf.org/tables/50q.html"]
  }),
  1950: nextWorldCupPreview({
    nextYear: 1954, hosts: ["Switzerland"], qualificationMode: "hosts_and_holders", holder: "Uruguay",
    firstDate: "1950-07-16", drawDate: "1953-11-30", drawLocation: "Zurich", groupCount: 4,
    openingFixtureId: "wc-1954-1954-06-16-matchday-1-brazil-mexico",
    lead: "Switzerland will host a 16-team World Cup as FIFA marks its 50th anniversary.",
    firstTitle: "Switzerland and Uruguay have their places", firstBody: "Switzerland qualify automatically as hosts, while Uruguay return as defending champions.",
    drawTitle: "The groups are drawn", drawBody: "The draw in Zurich will set four groups under a one-off seeded format.",
    openingBody: "Four matches will kick off together in Bern, Geneva, Lausanne and Zurich.",
    sources: ["https://www.rsssf.org/tables/54full.html", "https://www.rsssf.org/tables/54q.html"]
  }),
  1954: nextWorldCupPreview({
    nextYear: 1958, hosts: ["Sweden"], qualificationMode: "hosts_and_holders", holder: "West Germany",
    firstDate: "1954-07-04", drawDate: "1958-02-08", drawLocation: "Solna", groupCount: 4,
    openingFixtureId: "wc-1958-1958-06-08-matchday-1-sweden-mexico",
    lead: "Sweden will host the World Cup as the group stage adopts a full round-robin format.",
    firstTitle: "Sweden and West Germany have their places", firstBody: "Sweden qualify automatically as hosts, while West Germany return as defending champions.",
    drawTitle: "The groups are drawn", drawBody: "The draw in Solna will place 16 teams into four groups, with every side scheduled to meet all three group opponents.",
    openingBody: "Sweden will open against Mexico at Råsunda Stadium in Solna.",
    sources: ["https://www.rsssf.org/tables/58full.html", "https://www.rsssf.org/tables/58q.html"]
  }),
  1958: nextWorldCupPreview({
    nextYear: 1962, hosts: ["Chile"], qualificationMode: "hosts_and_holders", holder: "Brazil",
    firstDate: "1958-06-29", drawDate: "1962-01-18", drawLocation: "Santiago de Chile", groupCount: 4,
    openingFixtureId: "wc-1962-1962-05-30-matchday-1-chile-switzerland",
    lead: "Chile will bring the World Cup back to South America for the first time since 1950.",
    firstTitle: "Chile and Brazil have their places", firstBody: "Chile qualify automatically as hosts, while Brazil return as defending champions.",
    drawTitle: "The groups are drawn", drawBody: "The final draw in Santiago de Chile will place 16 teams into four groups.",
    openingBody: "Four matches will kick off together across Chile. The hosts face Switzerland at the Estadio Nacional in Santiago.",
    sources: ["https://www.rsssf.org/tables/62full.html", "https://www.rsssf.org/tables/62q.html"]
  }),
  1962: nextWorldCupPreview({
    nextYear: 1966, hosts: ["England"], qualificationMode: "hosts_and_holders", holder: "Brazil",
    firstDate: "1962-06-17", drawDate: "1966-01-06", drawLocation: "Royal Garden Hotel, London", groupCount: 4,
    openingFixtureId: "wc-1966-1966-07-11-matchday-1-england-uruguay",
    lead: "England will host the World Cup for the first time.",
    firstTitle: "England and Brazil have their places", firstBody: "England qualify automatically as hosts, while Brazil return as defending champions.",
    drawTitle: "The groups are drawn", drawBody: "The first televised final draw at the Royal Garden Hotel in London will place 16 teams into four groups.",
    openingBody: "England will open against Uruguay at Wembley Stadium in London.",
    sources: ["https://www.rsssf.org/tables/66full.html", "https://www.rsssf.org/tables/66q.html"]
  }),
  1966: nextWorldCupPreview({
    nextYear: 1970, hosts: ["Mexico"], qualificationMode: "hosts_and_holders", holder: "England",
    firstDate: "1966-07-30", drawDate: "1970-01-10", drawLocation: "Mexico City", groupCount: 4,
    openingFixtureId: "wc-1970-1970-05-31-matchday-1-mexico-soviet-union",
    lead: "Mexico will host the first World Cup staged outside Europe and South America.",
    firstTitle: "Mexico and England have their places", firstBody: "Mexico qualify automatically as hosts, while England return as defending champions.",
    drawTitle: "The groups are drawn", drawBody: "The final draw in Mexico City will place 16 teams into four groups.",
    openingBody: "Mexico will open against the Soviet Union at the Estadio Azteca in Mexico City.",
    sources: ["https://www.rsssf.org/tables/70full.html", "https://www.rsssf.org/tables/70q.html"]
  }),
  1970: nextWorldCupPreview({
    nextYear: 1974, hosts: ["West Germany"], qualificationMode: "hosts_and_holders", holder: "Brazil",
    firstDate: "1970-06-21", drawDate: "1974-01-05", drawLocation: "Hessischer Rundfunk broadcast hall, Frankfurt", groupCount: 4,
    openingFixtureId: "wc-1974-1974-06-13-matchday-1-brazil-yugoslavia",
    lead: "West Germany will stage the 1974 World Cup.",
    firstTitle: "Two teams have their places", firstBody: "West Germany qualify automatically as hosts, while Brazil enter as defending champions.",
    drawTitle: "The groups are drawn", drawBody: "The final draw at the Hessischer Rundfunk broadcast hall in Frankfurt will set four groups.",
    openingBody: "Brazil will open the tournament against Yugoslavia at the Waldstadion in Frankfurt.",
    sources: ["https://www.rsssf.org/tables/74full.html"]
  }),
  1974: nextWorldCupPreview({
    nextYear: 1978, hosts: ["Argentina"], qualificationMode: "hosts_and_holders", holder: "West Germany",
    firstDate: "1974-07-07", drawDate: "1978-01-14", drawLocation: "General San Martín Cultural Centre, Buenos Aires", groupCount: 4,
    openingFixtureId: "wc-1978-1978-06-01-matchday-1-west-germany-poland",
    lead: "Argentina will host the World Cup for the first time.",
    firstTitle: "Two teams have their places", firstBody: "Argentina qualify automatically as hosts, while West Germany enter as defending champions.",
    drawTitle: "The groups are drawn", drawBody: "The final draw at the General San Martín Cultural Centre in Buenos Aires will set four groups.",
    openingBody: "Defending champions West Germany will face Poland at Estadio Monumental in Buenos Aires.",
    sources: ["https://www.rsssf.org/tables/78full.html"]
  }),
  1978: nextWorldCupPreview({
    nextYear: 1982, hosts: ["Spain"], qualificationMode: "hosts_and_holders", holder: "Argentina",
    firstDate: "1978-06-25", drawDate: "1982-01-16", drawLocation: "Palace of Congresses, Madrid", groupCount: 6,
    openingFixtureId: "wc-1982-1982-06-13-matchday-1-argentina-belgium",
    lead: "Spain will host the first 24-team World Cup.",
    firstTitle: "Two teams have their places", firstBody: "Spain qualify automatically as hosts, while Argentina enter as defending champions.",
    drawTitle: "The groups are drawn", drawBody: "The final draw at the Palace of Congresses in Madrid will set six groups.",
    openingBody: "Defending champions Argentina will face Belgium at Camp Nou in Barcelona.",
    sources: ["https://www.rsssf.org/tables/82full.html"]
  }),
  1982: nextWorldCupPreview({
    nextYear: 1986, hosts: ["Mexico"], qualificationMode: "replacement_host", holder: "Italy",
    firstDate: "1983-05-20", drawDate: "1985-12-15", drawLocation: "Televisa San Ángel, Mexico City", groupCount: 6,
    openingFixtureId: "wc-1986-1986-05-31-matchday-1-bulgaria-italy",
    lead: "After Colombia withdraws, Mexico will become the first country to host the World Cup twice.",
    firstTitle: "Mexico takes over as host", firstBody: "FIFA selects Mexico as the replacement host. Mexico and defending champions Italy qualify automatically.",
    drawTitle: "The groups are drawn", drawBody: "The final draw at Televisa San Ángel in Mexico City will set six groups.",
    openingBody: "Bulgaria will face defending champions Italy at Estadio Azteca in Mexico City.",
    sources: ["https://www.upi.com/Archives/1983/05/20/FIFA-world-soccers-governing-body-Friday-awarded-the-1986/6216422251200/", "https://www.rsssf.org/tables/86full.html"]
  }),
  1986: nextWorldCupPreview({
    nextYear: 1990, hosts: ["Italy"], qualificationMode: "hosts_and_holders", holder: "Argentina",
    firstDate: "1986-06-29", drawDate: "1989-12-09", drawLocation: "Palazzo dello Sport, Rome", groupCount: 6,
    openingFixtureId: "wc-1990-1990-06-08-matchday-1-argentina-cameroon",
    lead: "Italy will host the World Cup for the second time, 56 years after 1934.",
    firstTitle: "Two teams have their places", firstBody: "Italy qualify automatically as hosts, while Argentina enter as defending champions.",
    drawTitle: "The groups are drawn", drawBody: "The final draw at the Palazzo dello Sport in Rome will set six groups.",
    openingBody: "Defending champions Argentina will face Cameroon at San Siro in Milan.",
    sources: ["https://www.rsssf.org/tables/90full.html"]
  }),
  1990: nextWorldCupPreview({
    nextYear: 1994, hosts: ["United States"], qualificationMode: "hosts_and_holders", holder: "Germany",
    firstDate: "1990-07-08", drawDate: "1993-12-19", drawLocation: "Las Vegas Convention Center", groupCount: 6,
    openingFixtureId: "wc-1994-1994-06-17-matchday-1-germany-bolivia",
    lead: "The United States will host the World Cup for the first time.",
    firstTitle: "Two teams have their places", firstBody: "The United States qualify automatically as hosts, while Germany enter as defending champions.",
    drawTitle: "The groups are drawn", drawBody: "The final draw at the Las Vegas Convention Center will set six groups.",
    openingBody: "Defending champions Germany will face Bolivia at Soldier Field in Chicago.",
    sources: ["https://www.rsssf.org/tables/94full.html"]
  }),
  1994: nextWorldCupPreview({
    nextYear: 1998, hosts: ["France"], qualificationMode: "hosts_and_holders", holder: "Brazil",
    firstDate: "1994-07-17", drawDate: "1997-12-04", drawLocation: "Stade Vélodrome, Marseille", groupCount: 8,
    openingFixtureId: "wc-1998-1998-06-10-matchday-1-brazil-scotland",
    lead: "France will host the World Cup for the second time as the field expands to 32 teams.",
    firstTitle: "Two teams have their places", firstBody: "France qualify automatically as hosts, while Brazil enter as defending champions.",
    drawTitle: "The groups are drawn", drawBody: "The final draw at Stade Vélodrome in Marseille will set eight groups.",
    openingBody: "Defending champions Brazil will face Scotland at Stade de France in Saint-Denis.",
    sources: ["https://www.rsssf.org/tables/98full.html"]
  }),
  1998: nextWorldCupPreview({
    nextYear: 2002, hosts: ["South Korea", "Japan"], qualificationMode: "hosts_and_holders", holder: "France",
    firstDate: "1998-07-12", drawDate: "2001-12-01", drawLocation: "BEXCO Convention Center, Busan", groupCount: 8,
    openingFixtureId: "wc-2002-2002-05-31-matchday-1-france-senegal",
    lead: "South Korea and Japan will stage the first World Cup in Asia and the first shared by two hosts.",
    firstTitle: "Hosts and holders have their places", firstBody: "South Korea and Japan qualify automatically as hosts. France also enter automatically as defending champions.",
    drawTitle: "The groups are drawn", drawBody: "The final draw at the BEXCO Convention Center in Busan will set eight groups.",
    openingBody: "France will face Senegal at Seoul World Cup Stadium in Seoul.",
    sources: ["https://inside.fifa.com/tournaments/mens/worldcup/2018russia/news/april-03--wc-countdown-72-days-to-go-2936069", "https://www.uefa.com/newsfiles/5093.pdf"]
  }),
  2002: nextWorldCupPreview({
    nextYear: 2006, hosts: ["Germany"], qualificationMode: "hosts_only", holder: "Brazil",
    firstDate: "2000-07-06", drawDate: "2005-12-09", drawLocation: "Leipzig Exhibition Centre", groupCount: 8,
    openingFixtureId: "wc-2006-2006-06-09-matchday-1-germany-costa-rica",
    lead: "Germany will stage its second World Cup, 32 years after West Germany hosted in 1974.",
    firstTitle: "Germany has its place", firstBody: "Germany qualify automatically as host. Defending champions Brazil must take part in qualifying under the new rules.",
    drawTitle: "The groups are drawn", drawBody: "The final draw at the Leipzig Exhibition Centre will set eight groups.",
    openingBody: "Germany will face Costa Rica at the FIFA World Cup Stadium in Munich.",
    sources: ["https://www.uefa.com/european-qualifiers/news/0254-0d7b372f3530-46aa2479a906-1000--germany-to-kick-off-world-cup/", "https://www.leipziger-messe.de/en/company/portrait/chronic"]
  }),
  2006: nextWorldCupPreview({
    nextYear: 2010, hosts: ["South Africa"], qualificationMode: "hosts_only", holder: "Italy",
    firstDate: "2004-05-15", drawDate: "2009-12-04", drawLocation: "Cape Town International Convention Centre", groupCount: 8,
    openingFixtureId: "wc-2010-2010-06-11-matchday-1-south-africa-mexico",
    lead: "South Africa will host the first World Cup staged in Africa.",
    firstTitle: "South Africa has its place", firstBody: "South Africa qualify automatically as host. Champions Italy must qualify.",
    drawTitle: "The groups are drawn", drawBody: "The final draw at the Cape Town International Convention Centre will set eight groups.",
    openingBody: "South Africa will face Mexico at Soccer City in Johannesburg.",
    sources: ["https://inside.fifa.com/tournaments/mens/worldcup/2010south-africa/news/mandela-accept-with-humility-and-without-arrogance-92546", "https://www.sanews.gov.za/south-africa/planning-track-2010-final-draw"]
  }),
  2010: nextWorldCupPreview({
    nextYear: 2014, hosts: ["Brazil"], qualificationMode: "hosts_only", holder: "Spain",
    firstDate: "2007-10-30", drawDate: "2013-12-06", drawLocation: "Costa do Sauípe, Bahia", groupCount: 8,
    openingFixtureId: "wc-2014-2014-06-12-matchday-1-brazil-croatia",
    lead: "Brazil will stage its second World Cup, 64 years after hosting in 1950.",
    firstTitle: "Brazil has its place", firstBody: "Brazil qualify automatically as host. Champions Spain must qualify.",
    drawTitle: "The groups are drawn", drawBody: "The final draw at Costa do Sauípe in Bahia will set eight groups.",
    openingBody: "Brazil will face Croatia at Arena de São Paulo in São Paulo.",
    sources: ["https://inside.fifa.com/tournaments/mens/worldcup/2014brazil/news/fernanda-lima-and-rodrigo-hilbert-present-the-fifa-world-cup-final-draw-2229201"]
  }),
  2014: nextWorldCupPreview({
    nextYear: 2018, hosts: ["Russia"], qualificationMode: "hosts_only", holder: "Germany",
    firstDate: "2010-12-02", drawDate: "2017-12-01", drawLocation: "Kremlin State Palace, Moscow", groupCount: 8,
    openingFixtureId: "wc-2018-2018-06-14-matchday-1-russia-saudi-arabia",
    lead: "Russia will host the World Cup for the first time, taking the tournament to Eastern Europe.",
    firstTitle: "Russia has its place", firstBody: "Russia qualify automatically as host. Champions Germany must qualify.",
    drawTitle: "The groups are drawn", drawBody: "The final draw at the Kremlin State Palace in Moscow will set eight groups.",
    openingBody: "Russia will face Saudi Arabia at Luzhniki Stadium in Moscow.",
    sources: ["https://inside.fifa.com/tournaments/mens/worldcup/2018russia/news/final-draw-roundup-2922235"]
  }),
  2018: nextWorldCupPreview({
    nextYear: 2022, hosts: ["Qatar"], qualificationMode: "hosts_only", holder: "France",
    firstDate: "2010-12-02", drawDate: "2022-04-01", drawLocation: "Doha Exhibition and Convention Center", groupCount: 8,
    openingFixtureId: "wc-2022-2022-11-20-matchday-1-qatar-ecuador",
    lead: "Qatar will host the first World Cup in the Middle East and Arab world.",
    firstTitle: "Qatar has its place", firstBody: "Qatar qualify automatically as host. Champions France must qualify.",
    drawTitle: "The groups are drawn", drawBody: "The final draw at the Doha Exhibition and Convention Center will set eight groups.",
    openingBody: "Qatar will face Ecuador at Al Bayt Stadium in Al Khor.",
    sources: ["https://www.fifa.com/en/articles/qatar-2022-final-draw-all-you-need-to-know", "https://www.fifa.com/en/articles/qatar-v-ecuador-to-kick-off-fifa-world-cup-2022-tm-on-20-november"]
  }),
  2022: nextWorldCupPreview({
    nextYear: 2026, hosts: ["Canada", "Mexico", "United States"], qualificationMode: "hosts_only", holder: "Argentina",
    firstDate: "2018-06-13", drawDate: "2025-12-05", drawLocation: "Kennedy Center, Washington, DC", groupCount: 12,
    startDate: "2026-06-11", opening: Object.freeze({ home: "Mexico", away: "South Africa", venue: "Mexico City Stadium, Mexico City" }),
    lead: "Canada, Mexico, and the United States will stage the first 48-team World Cup and the first hosted by three countries.",
    firstTitle: "Three hosts have their places", firstBody: "Canada, Mexico, and the United States will stage the tournament across 16 cities. All three qualify automatically.",
    drawTitle: "The groups are drawn", drawBody: "The final draw at the Kennedy Center in Washington, DC will set the 12 groups.",
    openingBody: "Mexico will face South Africa at Mexico City Stadium in Mexico City.",
    sources: ["https://inside.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/media-releases/canada-mexico-and-usa-selected-as-hosts-of-the-2026-fifa-world-cuptm", "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/final-draw-washington-dc-5-december", "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/estadio-azteca-mexico-city-host-opening-match-world-cup-2026"]
  })
});
