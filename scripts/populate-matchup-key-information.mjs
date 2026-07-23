#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePlayerNameInPool } from "./player-name-matching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const fixturesPath = path.join(dataDir, "fixtures.json");
const lineupsPath = path.join(dataDir, "lineups.json");
const teamStyleProfilesPath = path.join(dataDir, "team-style-profiles.json");
const teamsPath = path.join(dataDir, "teams.json");

const teamStyleSourceId = "editorial-preview-2026-06-22";
const keyInformationSourceId = "matchup-archive-present-tense-2026-07-22";
const priorResultsSourceId = "fifa-official-results-sync-2026-07-20";
const schemaVersion = 4;
const localeModelVersion = 2;

const profiles = {
  ALG: {
    summary: "are a technical North African side that want the game to run through the left foot and calm of midfield",
    leaderRole: "giving them wing craft, press resistance, and a second scoring lane",
    plan: "They are at their best when Riyad Mahrez can slow defenders down, Houssem Aouar can connect midfield, and Amine Gouiri can drift away from markers.",
    attackPlan: "give Mahrez time on the ball while Aouar connects the next pass toward Gouiri",
    matchupWin: "make the match about controlled touches rather than long defensive chases",
    defensiveTask: "protecting the space behind their midfield when the ball turns over",
    threat: "slow the match through Mahrez and Aouar before finding Gouiri in open space"
  },
  ARG: {
    summary: "are the defending champions and still one of the most complete tournament teams",
    leaderRole: "giving them between-lines creation, pressing, and midfield control",
    plan: "Argentina can keep the ball patiently, but they become much quicker after winning it. Julián Álvarez leads the press, Lionel Messi finds space behind midfield, and Enzo Fernández changes the angle with forward passes.",
    planZh: "阿根廷可以耐心控球，但一旦夺回球权就会迅速提速。胡利安·阿尔瓦雷斯负责带动逼抢，梅西寻找对方中场身后的空间，恩佐·费尔南德斯则用向前传球改变进攻角度。",
    attackPlan: "press high through Alvarez, find Messi in space behind midfield, and let Enzo Fernandez change the angle of the attack",
    matchupWin: "keep possession without losing pressure after turnovers",
    defensiveTask: "closing central counters before they reach Emiliano Martinez's box",
    defensiveTaskZh: "阻止对手摆脱第一层逼抢后从中路快速反击",
    threat: "turn one midfield win into Messi touches, Alvarez movement, and Enzo service"
  },
  AUS: {
    summary: "are a durable, physical side built around organization, pressure, and free-kick and corner toughness",
    leaderRole: "giving them goalkeeping security, midfield bite, and a creative release",
    plan: "They are comfortable in rugged games where Jackson Irvine can hunt loose balls after duels and Christian Volpato can add the cleaner pass.",
    attackPlan: "make the match direct enough for Irvine's running and Volpato's left foot to matter",
    matchupWin: "turn free kicks, corners, and loose balls into territory",
    defensiveTask: "keeping Mathew Ryan protected through compact defending",
    threat: "drag opponents into duels, free kicks, corners, and late midfield runs"
  },
  AUT: {
    summary: "are a high-pressure European side with enough experience to make the press feel organized rather than wild",
    leaderRole: "giving them leadership, shooting range, and relentless pressure after losing the ball",
    plan: "They want David Alaba to organize the structure while Marcel Sabitzer and Konrad Laimer turn pressure into quick second attacks.",
    attackPlan: "force rushed passes and let Sabitzer and Laimer attack the next ball before defenses reset",
    matchupWin: "make the opponent play at Austria's pressing tempo",
    defensiveTask: "keeping the defense connected behind Alaba",
    threat: "press the first pass, win territory, and attack before defenses reset"
  },
  BEL: {
    summary: "are an elite chance-creation team when their creators get space to face forward",
    leaderRole: "giving them attacking passing, box power, and one-on-one disruption",
    plan: "They want Kevin De Bruyne to find early service, Romelu Lukaku to occupy central defenders, and Jeremy Doku to unbalance the far side.",
    attackPlan: "feed De Bruyne early and create the separation Lukaku needs in the box",
    matchupWin: "make the match about chance quality rather than long defensive phases",
    defensiveTask: "stopping counters before their attacking shape gets stretched",
    threat: "turn De Bruyne service into Lukaku chances"
  },
  BIH: {
    summary: "are a veteran-leaning side that still carry real danger when the match becomes physical and direct",
    leaderRole: "giving them target play, defensive force, and a young creative outlet",
    plan: "They can lean on Edin Dzeko as the reference point, then use Sead Kolasinac's edge and Esmir Bajraktarevic's spark to keep attacks alive.",
    attackPlan: "play into Dzeko early and build around the loose balls that follow",
    matchupWin: "make the game slower, heavier, and more comfortable for their senior players",
    defensiveTask: "holding the left side firm when opponents try to run behind Kolasinac",
    threat: "turn direct service into Dzeko touches and scrappy box pressure"
  },
  BRA: {
    summary: "are a top-tier attacking side whose best moments mix individual invention with sudden acceleration",
    leaderRole: "giving them improvisation, left-side speed, and midfield cover",
    plan: "They want Neymar to connect the attack, Vinicius Junior to isolate defenders, and Casemiro to stop counters before they grow.",
    attackPlan: "isolate Vinicius Junior quickly and let Neymar combine around the fouls and gaps that creates",
    matchupWin: "force defenders into individual matchups they cannot keep winning",
    defensiveTask: "using Casemiro to close the space behind Brazil's attacking wide defenders",
    threat: "break a shape through Neymar combinations and Vinicius Junior's speed"
  },
  CAN: {
    summary: "are a fast, direct host-side threat with enough top-end speed to change games in a few seconds",
    leaderRole: "giving them wide thrust, central finishing, and midfield balance",
    plan: "They are most dangerous when Alphonso Davies can carry from deep and Jonathan David can attack cutbacks or quick passes after Canada win the ball.",
    attackPlan: "release Davies into space and get David facing goal before the opponent's defense is set",
    matchupWin: "turn open grass into the defining feature of the match",
    defensiveTask: "using Stephen Eustaquio to keep quick breaks from becoming too loose",
    threat: "run through Davies and David before defenders can recover"
  },
  CIV: {
    summary: "are a powerful quick-break team with enough midfield force to turn loose games in their favor",
    leaderRole: "giving them ball-winning, wing speed, and a box target",
    plan: "They want Franck Kessie to drive through midfield, Simon Adingra to stretch the flank, and Evann Guessand to attack the penalty area.",
    attackPlan: "win the midfield collision and send Adingra into space before Guessand attacks the box",
    matchupWin: "make the opponent defend power running instead of calm possession",
    defensiveTask: "keeping the midfield compact when their wide players break forward",
    threat: "turn Kessie's carries and Adingra's pace into Guessand chances"
  },
  COD: {
    summary: "are an explosive quick-break side that can make favorites uncomfortable if the match opens up",
    leaderRole: "giving them direct running, individual defending, and midfield escapes",
    plan: "They need Yoane Wissa as the outlet, Aaron Wan-Bissaka to survive wing pressure, and Noah Sadiki to connect the first pass forward.",
    attackPlan: "spring Wissa early and let Sadiki carry the first clean pass out of pressure",
    matchupWin: "turn defensive stands into counters before the opponent can reset",
    defensiveTask: "surviving wide pressure through Wan-Bissaka's individual defending",
    threat: "break quickly through Wissa and Sadiki when opponents overcommit"
  },
  COL: {
    summary: "are a rhythm-and-width team with enough individual quality to punish any loose defensive spacing",
    leaderRole: "giving them left-side explosion, old-school creation, and a central finishing point",
    plan: "They want Luis Diaz to attack from the left, James Rodriguez to find the final pass, and Luis Suarez to occupy the box.",
    attackPlan: "let Diaz run behind defenders while James looks for the pass that changes the speed of the move",
    matchupWin: "stretch the defense horizontally before playing into the striker",
    defensiveTask: "stopping counters when Diaz and James commit numbers forward",
    threat: "use Diaz's width and James' invention to create a clear chance in the box"
  },
  CPV: {
    summary: "are compact tournament disruptors who need experience and goalkeeping to keep matches close",
    leaderRole: "giving them attacking calm, defensive organization, and shot-stopping resistance",
    plan: "They want Ryan Mendes to make the rare attacking moments count while Roberto Lopes and Vozinha keep the game narrow.",
    attackPlan: "stay compact long enough for Mendes to find a composed final pass or shot",
    matchupWin: "make the opponent impatient and protect the center of the box",
    defensiveTask: "limiting clean shots so Vozinha's saves can matter",
    threat: "turn a slow match into one decisive Mendes action"
  },
  CRO: {
    summary: "are a control team whose tournament identity still runs through midfield calm",
    leaderRole: "giving them rhythm, defensive security, and pressure relief",
    plan: "They want Luka Modric and Mateo Kovacic to slow the match down, while Josko Gvardiol gives them cover when play spreads wide.",
    attackPlan: "use Modric and Kovacic to turn pressure into possession and move the opponent side to side",
    matchupWin: "make the game feel like a passing exercise instead of a sprint",
    defensiveTask: "asking Gvardiol to cover wide spaces when the midfield steps forward",
    threat: "slow the match through Modric and Kovacic's passing rhythm"
  },
  CUW: {
    summary: "are a veteran-heavy underdog side trying to stay connected and choose their moments carefully",
    leaderRole: "giving them midfield carries, free-kick and corner experience, and a wide release valve",
    plan: "They need Juninho Bacuna to carry them forward, Leandro Bacuna to manage free kicks and corners, and Tahith Chong to give counters a runner.",
    attackPlan: "use the Bacuna brothers to turn pressure relief into free kicks and corners before Chong attacks open space",
    matchupWin: "make the match choppy enough that favorites lose rhythm",
    defensiveTask: "staying compact enough for Chong's outlet runs to matter",
    threat: "turn veteran free-kick and corner moments and Chong's running into a way back into the game"
  },
  CZE: {
    summary: "are a free-kick, corner, and crossing threat that become dangerous when the game is played in the air",
    leaderRole: "giving them box finishing, aerial power, and attacking flexibility",
    plan: "They want Patrik Schick attacking service, Tomas Soucek crashing the box, and Adam Hlozek connecting play underneath.",
    attackPlan: "load early service toward Schick and Soucek before the defense settles",
    matchupWin: "make free kicks, corners, and loose balls as important as open play",
    defensiveTask: "keeping enough bodies behind the ball when wide defenders deliver early",
    threat: "turn crosses, free kicks, corners, and Soucek runs into high-value chances"
  },
  ECU: {
    summary: "are an intense, athletic side that can disrupt stronger opponents through midfield pressure",
    leaderRole: "giving them ball-winning, defensive range, and veteran finishing",
    plan: "They want Moises Caicedo to erase central danger, Piero Hincapie to defend space, and Enner Valencia to finish quick breaks.",
    attackPlan: "win the midfield duel through Caicedo and release Valencia before the defense is set",
    matchupWin: "make the middle of the pitch uncomfortable",
    defensiveTask: "using Hincapie to cover the channels when the line steps up",
    threat: "turn Caicedo ball wins and Valencia movement into fast attacks"
  },
  EGY: {
    summary: "are a direct team built around Salah's runs that can look quiet until one attack opens the match",
    leaderRole: "giving them elite speed, secondary scoring, and right-side delivery",
    plan: "They want Mohamed Salah running into space, Omar Marmoush adding a second lane, and Zizo supplying the next pass or shot.",
    attackPlan: "release Salah early and let Marmoush arrive as the second wave",
    matchupWin: "make every turnover feel dangerous",
    defensiveTask: "staying compact enough that Salah is not stranded too far from goal",
    threat: "turn one loose pass into a Salah-led break"
  },
  ENG: {
    summary: "are one of the strongest teams in the tournament, built around power, speed, and danger near goal",
    leaderRole: "giving them midfield drive, elite finishing, and defensive balance",
    plan: "They can attack aggressively through Harry Kane's link play and Jude Bellingham's runs, then rely on Declan Rice to stop counters.",
    attackPlan: "turn Kane's dropping movements into Bellingham runs and fast cutbacks from wide areas",
    matchupWin: "make the match fast and physical before the opponent can settle",
    defensiveTask: "pressing the first pass into midfield through Rice's positioning",
    threat: "attack quickly through Kane and Bellingham while Rice controls the counter"
  },
  ESP: {
    summary: "are one of the tournament's most polished possession teams",
    leaderRole: "giving them width, rhythm, and direct running",
    plan: "They use Lamine Yamal and Nico Williams to stretch the pitch, then trust Pedri to find the pass through the line.",
    attackPlan: "pin the wide defenders with Yamal and Williams before Pedri plays through the gaps",
    matchupWin: "force defenders to choose between stopping the wingers and protecting the middle",
    defensiveTask: "keeping pressure tight behind their wide defenders",
    threat: "stretch the pitch through Yamal and Williams before Pedri breaks the line"
  },
  FRA: {
    summary: "are an elite attacking side with Mbappe's speed now fed by Olise's left-footed creation",
    leaderRole: "giving them game-breaking pace, lock-picking passes, and defensive calm",
    plan: "They want Kylian Mbappe attacking space, Michael Olise choosing the pass or shot, and William Saliba protecting the open field.",
    attackPlan: "let Olise receive inside, draw pressure, and release Mbappe before the defense can reset",
    opponentPlans: {
      IRQ: "use Olise as the lock-picker against a deeper shape before Mbappe attacks the first gap",
      NOR: "make Olise and Mbappe punish Norway quickly whenever Haaland pressure leaves space to run",
      SEN: "use Olise's decisions between midfield and defense to release Mbappe before Senegal's athletes can recover"
    },
    matchupWin: "make the opponent defend space behind their defense",
    defensiveTask: "trusting Saliba to control counters when France's attackers push high",
    threat: "combine Olise's final ball with Mbappe's acceleration before Saliba controls the counter"
  },
  GER: {
    summary: "are a technical control side with enough young creativity to open compact defenses",
    leaderRole: "giving them rhythm, dribbling through pressure, and final-pass invention",
    plan: "They want Joshua Kimmich setting the rhythm while Jamal Musiala and Florian Wirtz receive in small gaps.",
    attackPlan: "pull midfielders out with Kimmich's passing before Musiala and Wirtz attack the gaps near the box",
    matchupWin: "make the central gaps too crowded to defend cleanly",
    defensiveTask: "protecting the space behind their advanced midfielders",
    threat: "combine through Kimmich, Musiala, and Wirtz until the defense loses its shape"
  },
  GHA: {
    summary: "are a fast front-line team that need their direct runners to turn defensive work into threat",
    leaderRole: "giving them early depth, vertical speed, and experienced calm",
    plan: "They want Antoine Semenyo and Inaki Williams attacking before the defense settles, with Jordan Ayew steadying the ball when needed.",
    attackPlan: "send Semenyo and Williams into space before the opponent can compress the field",
    matchupWin: "make the game about running power rather than calm possession",
    defensiveTask: "using Ayew's calm touches to stop clearances coming straight back",
    threat: "attack space early through Semenyo and Williams"
  },
  HAI: {
    summary: "are a direct attacking underdog with enough forward power to punish loose defending",
    leaderRole: "giving them finishing edge, aerial strength, and midfield carrying",
    plan: "They want Duckens Nazon and Frantzdy Pierrot to attack the box while Jean-Ricner Bellegarde helps them escape pressure.",
    attackPlan: "play forward quickly toward Nazon and Pierrot before the opponent can crowd the box",
    matchupWin: "make the favorite defend uncomfortable direct balls",
    defensiveTask: "keeping Bellegarde close enough to turn clearances into attacks",
    threat: "turn direct service into Nazon or Pierrot chances"
  },
  IRN: {
    summary: "are a streetwise counterattacking side with experienced attackers who understand tournament margins",
    leaderRole: "giving them craft, final-pass calm, and wide delivery",
    plan: "They want Mehdi Taremi linking play, Saman Ghoddos adding the clever pass, and Alireza Jahanbakhsh delivering from wide or dead balls.",
    attackPlan: "draw contact, slow the rhythm, and then find Taremi or Jahanbakhsh around the box",
    matchupWin: "turn a patient defensive shape into selective attacks",
    defensiveTask: "keeping the wide lanes protected before Jahanbakhsh can break out",
    threat: "turn fouls, counters, Taremi's craft, and Ghoddos' final pass into chances"
  },
  IRQ: {
    summary: "are a passionate, direct side that need their attacking moments to be clean and immediate",
    leaderRole: "giving them a box target, dribbling spark, and midfield composure",
    plan: "They want Aymen Hussein as the endpoint, Ali Jasim as the spark, and Zidane Iqbal as the pass that calms the first phase.",
    attackPlan: "find Ali Jasim between defenders and then play quickly toward Hussein in the box",
    matchupWin: "turn rare possession into attacks with a real endpoint",
    defensiveTask: "keeping Iqbal connected to the first outlet pass",
    threat: "use Ali Jasim's dribbling and Hussein's presence to make counters count"
  },
  JOR: {
    summary: "are a disciplined counterattacking side that can hurt teams through speed and timing",
    leaderRole: "giving them ball-carrying, box movement, and midfield work rate",
    plan: "They want Mousa Al-Taamari to carry the break, Ali Olwan to attack the box, and Noor Al-Rawabdeh to keep the defense connected.",
    attackPlan: "spring Al-Taamari into open space and let Olwan attack the first clear chance",
    matchupWin: "make the opponent nervous about every turnover",
    defensiveTask: "holding midfield distances through Al-Rawabdeh's work",
    threat: "counter through Al-Taamari and Olwan before the defense recovers"
  },
  JPN: {
    summary: "are a precise, fast-passing side that can make possession feel sudden and sharp",
    leaderRole: "giving them penalty-area finishing, left-footed punch, and timing around the box",
    plan: "They want the front line to keep moving, Ritsu Doan to attack inside from the right, and Daichi Kamada to connect the final pass.",
    attackPlan: "move the ball quickly enough for their attackers to receive between defenders",
    matchupWin: "make the opponent defend repeated changes of angle",
    defensiveTask: "keeping the first counter controlled after their attacking midfielders commit forward",
    threat: "turn quick combinations into chances around the box"
  },
  KOR: {
    summary: "are a relentless running side with star quality at both ends of the spine",
    leaderRole: "giving them elite quick-break finishing, defensive command, and attacking passing",
    plan: "They want Son Heung-min attacking space, Kim Min-jae winning first contact, and Lee Kang-in adding the pass that slows the rush.",
    attackPlan: "release Son behind the line and let Lee Kang-in choose the final pass",
    matchupWin: "make the match stretch vertically",
    defensiveTask: "keeping Kim Min-jae protected from repeated emergency defending",
    threat: "turn running power and Son's finishing into sudden chances"
  },
  KSA: {
    summary: "are a fearless pressing underdog with enough big-moment attackers to punish complacency",
    leaderRole: "giving them wide bravery, mobile finishing, and goalkeeping experience",
    plan: "They need Salem Al-Dawsari carrying the emotional moments, Firas Al-Buraikan linking play, and Mohammed Al-Owais keeping them alive.",
    attackPlan: "press in bursts and give Al-Dawsari room to attack the first retreating defender",
    matchupWin: "make the favorite play through noise and pressure",
    defensiveTask: "limiting clean shots so Al-Owais is not overworked",
    threat: "turn pressing bursts and Al-Dawsari carries into momentum"
  },
  MAR: {
    summary: "are a disciplined, dangerous side whose structure lets their flair players attack with freedom",
    leaderRole: "giving them right-side thrust, central invention, and box finishing",
    plan: "They want Achraf Hakimi to own the right side, Brahim Diaz to receive between lines, and Ayoub El Kaabi to finish moves.",
    attackPlan: "use Hakimi's overlaps to tilt the field before Brahim or El Kaabi attacks the final pass or shot",
    matchupWin: "make the opponent defend both long passes across the field and aerial service",
    defensiveTask: "keeping the defense compact behind Hakimi's forward runs",
    threat: "combine Hakimi surges, Brahim's invention, and El Kaabi's box movement"
  },
  MEX: {
    summary: "are a home-side pressure team that want territory, crowd energy, and repeated penalty-area touches",
    leaderRole: "giving them a striker reference, midfield steel, and free-kick and corner danger",
    plan: "They want Santiago Gimenez occupying the central defenders, Edson Alvarez protecting quick breaks, and Luis Chavez punishing loose clearances.",
    attackPlan: "keep the ball in the opponent's half and feed Gimenez before Chavez attacks free kicks, corners, or rebounds",
    matchupWin: "turn pressure into a constant stream of box entries",
    defensiveTask: "letting Alvarez stop counters before they become open-field runs",
    threat: "turn home pressure into Gimenez touches and Chavez free-kick or corner chances"
  },
  NED: {
    summary: "are a control team with a strong defensive base and enough technical quality to play through pressure",
    leaderRole: "giving them aerial command, midfield carrying, and flexible finishing",
    plan: "They want Virgil van Dijk to hold the line, Frenkie de Jong to escape pressure, and Cody Gakpo to connect the attack.",
    attackPlan: "build calmly through De Jong and let Gakpo receive between wide and central defenders",
    matchupWin: "make possession feel secure while still threatening the front line",
    defensiveTask: "using Van Dijk to control depth when the line steps higher",
    threat: "control possession through De Jong and protect it with Van Dijk's authority"
  },
  NOR: {
    summary: "are a direct star-powered side whose attacking question is how quickly they can serve the finisher",
    leaderRole: "giving them box gravity, creative supply, and wide unpredictability",
    plan: "They want Martin Odegaard finding the pass, Antonio Nusa adding speed, and Erling Haaland attacking the last pass or shot.",
    attackPlan: "get Odegaard facing forward and deliver early enough for Haaland to attack the box",
    matchupWin: "make every deep defending moment feel like a Haaland chance is coming",
    defensiveTask: "keeping enough pressure on the ball before direct counters reach the defense",
    threat: "feed Haaland through Odegaard's service and Nusa's change of speed"
  },
  NZL: {
    summary: "are an aerial, organized side that need territory and service to keep stronger opponents honest",
    leaderRole: "giving them a target striker, left-side outlet, and technical passing",
    plan: "They want Chris Wood as the endpoint, Liberato Cacace moving them up the left, and Sarpreet Singh adding craft.",
    attackPlan: "move play wide through Cacace and serve Wood before the box gets crowded",
    matchupWin: "make crosses and loose balls meaningful",
    defensiveTask: "staying compact enough that Singh can receive the first pass out",
    threat: "turn left-side service and Wood's aerial presence into chances"
  },
  PAN: {
    summary: "are an organized disruptor side that can make matches uncomfortable through midfield control and wide thrust",
    leaderRole: "giving them rhythm, right-side running, and a central finish",
    plan: "They want Adalberto Carrasquilla to calm the ball, Michael Murillo to push the right side, and Ismael Diaz to finish rare openings.",
    attackPlan: "use Carrasquilla to escape pressure and let Murillo turn the right side into territory",
    matchupWin: "make the opponent work through a stubborn, connected defense",
    defensiveTask: "keeping Diaz close enough to threaten when possession turns",
    threat: "disrupt rhythm through Carrasquilla and create right-side surges through Murillo"
  },
  PAR: {
    summary: "are rugged counterpunchers who are comfortable turning matches into physical, tight contests",
    leaderRole: "giving them speed, shot creation, and defensive command",
    plan: "They want Miguel Almiron carrying them forward, Julio Enciso taking brave shots, and Gustavo Gomez controlling the box.",
    attackPlan: "release Almiron into space and let Enciso attack the pocket before defenders settle",
    matchupWin: "make the opponent deal with duels, fouls, and sudden counters",
    defensiveTask: "leaning on Gomez to organize the penalty area",
    threat: "turn one Almiron break or Enciso shot into a tight-game swing"
  },
  POR: {
    summary: "are a star-heavy attacking side with enough creators to feed several different scoring routes",
    leaderRole: "giving them finishing gravity, chance creation, and calm control under pressure",
    plan: "They want Cristiano Ronaldo occupying the box, Bruno Fernandes creating the chance, and Vitinha setting the rhythm underneath.",
    attackPlan: "let Vitinha control the first pass, then use Bruno Fernandes to find Ronaldo or the far-side runner",
    matchupWin: "make their technical quality show up around the penalty area",
    defensiveTask: "preventing counters when their creators commit forward",
    threat: "feed Ronaldo through Bruno Fernandes and Vitinha's supply"
  },
  QAT: {
    summary: "are compact possession builders who need their best attackers to turn long spells into sharper chances",
    leaderRole: "giving them creativity, finishing, and left-side balance",
    plan: "They want Akram Afif receiving in space, Almoez Ali attacking the final ball, and Homam Ahmed giving them width and recovery runs.",
    attackPlan: "find Afif in small gaps and let Almoez Ali attack the first clean service",
    matchupWin: "make possession patient without becoming harmless",
    defensiveTask: "keeping Ahmed's side secure when the attack pushes up",
    threat: "combine through Afif and Almoez Ali when defenders lose patience"
  },
  RSA: {
    summary: "are counterattacking underdogs who can stay in games if their goalkeeper and forwards give them belief",
    leaderRole: "giving them shot-stopping, midfield bite, and a direct outlet",
    plan: "They need Ronwen Williams to hold the scoreline, Teboho Mokoena to compete through midfield, and Lyle Foster to threaten behind.",
    attackPlan: "absorb pressure, let Mokoena make the first forward pass, and release Foster before the defense recovers",
    matchupWin: "make the favorite chase without finding a clean second goal",
    defensiveTask: "protecting Williams from repeated central shots",
    threat: "turn saves from Williams into Mokoena outlets and Foster counters"
  },
  SCO: {
    summary: "are a physical midfield side that can make opponents defend deliveries, duels, and late runners",
    leaderRole: "giving them box crashing, midfield bite, and left-side delivery",
    plan: "They want Andy Robertson serving from the left, John McGinn setting the tone, and Scott McTominay arriving late.",
    attackPlan: "work the ball left for Robertson and attack the second phase through McTominay",
    matchupWin: "make the game about timing runs and contact in the box",
    defensiveTask: "keeping McGinn close enough to stop counters through midfield",
    threat: "turn Robertson service and McTominay runs into pressure"
  },
  SEN: {
    summary: "are an athletic, experienced side with enough defensive presence to survive pressure and enough speed to punish it",
    leaderRole: "giving them senior leadership, striker movement, and back-line command",
    plan: "They want Sadio Mane leading the attack, Nicolas Jackson stretching the line, and Kalidou Koulibaly winning the defensive duels.",
    attackPlan: "use Mane's timing and Jackson's depth to attack before the opponent's defense is set",
    matchupWin: "make the match feel like a series of athletic duels",
    defensiveTask: "trusting Koulibaly to organize the box under pressure",
    threat: "turn Mane's experience and Jackson's running into direct chances"
  },
  SUI: {
    summary: "are a tournament-tested structure team who rarely look rushed when the match gets tense",
    leaderRole: "giving them midfield control, defensive organization, and a front-line outlet",
    plan: "They want Granit Xhaka to set the rhythm, Manuel Akanji to organize the line, and Breel Embolo to give them a target.",
    attackPlan: "let Xhaka dictate the first pass and find Embolo before the opponent can squeeze midfield",
    matchupWin: "turn the match into a controlled, repeatable pattern",
    defensiveTask: "keeping Akanji's line compact against runners",
    threat: "slow the game through Xhaka and use Embolo as the release valve"
  },
  SWE: {
    summary: "are a tall, technical attacking side with two forwards who can change the shape of a match",
    leaderRole: "giving them elegant finishing, power running, and midfield timing",
    plan: "They want Alexander Isak finding clean touches, Viktor Gyokeres forcing contact, and Yasin Ayari arriving from midfield.",
    attackPlan: "connect through Ayari and then choose between Isak's polish or Gyokeres' power",
    matchupWin: "make central defenders handle different kinds of striker movement",
    defensiveTask: "preventing the midfield from getting stretched behind the front two",
    threat: "alternate between Isak's finesse and Gyokeres' force"
  },
  TUN: {
    summary: "are an organized defensive side that need energy and directness to make their structure bite",
    leaderRole: "giving them midfield screening, rhythm, and wide release",
    plan: "They want Ellyes Skhiri shielding the center, Hannibal Mejbri lifting the intensity, and Elias Saad providing the route forward.",
    attackPlan: "stay compact through Skhiri and then use Saad as the first runner into space",
    matchupWin: "turn defensive patience into frustration for the opponent",
    defensiveTask: "keeping Hannibal's pressure connected rather than scattered",
    threat: "slow the match through Skhiri's screen and break through Saad"
  },
  TUR: {
    summary: "are a creative young attacking side with enough free-kick and corner quality to punish small mistakes",
    leaderRole: "giving them deep passing, central spark, and fearless running",
    plan: "They want Hakan Calhanoglu setting the rhythm, Arda Guler creating near the box, and Kenan Yildiz attacking defenders directly.",
    attackPlan: "use Calhanoglu's passing to find Guler in space before Yildiz attacks the gap",
    matchupWin: "make their young creators receive facing goal",
    defensiveTask: "protecting the spaces left when their attackers take risks",
    threat: "turn Calhanoglu service and Guler invention into sudden chances"
  },
  URU: {
    summary: "are a South American intensity side with enough running power to turn every phase into a contest",
    leaderRole: "giving them midfield drive, chaotic depth, and defensive recovery speed",
    plan: "They want Federico Valverde to set the energy, Darwin Nunez to stretch the line, and Ronald Araujo to win emergency duels.",
    attackPlan: "use Valverde's running to release Nunez before the defense can control the space behind",
    matchupWin: "make the opponent deal with constant pressure and depth",
    defensiveTask: "trusting Araujo to clean up when the line is exposed",
    threat: "turn Valverde's engine and Nunez's depth into chaos"
  },
  USA: {
    summary: "are an athletic pressing team with enough direct attacking talent to make games feel stretched",
    leaderRole: "giving them individual attacking threat, end-to-end power, and midfield ball-winning",
    plan: "They want Christian Pulisic attacking near goal, Weston McKennie arriving around the box, and Tyler Adams killing counters.",
    attackPlan: "press into turnovers and let Pulisic or McKennie attack before the defense resets",
    matchupWin: "make the game fast enough that their athleticism matters",
    defensiveTask: "using Adams to stop counters through the middle",
    threat: "turn pressure into Pulisic carries and McKennie second-ball runs"
  },
  UZB: {
    summary: "are a disciplined first-time World Cup side with enough spine quality to make opponents work",
    leaderRole: "giving them a target forward, defensive authority, and creative movement",
    plan: "They want Eldor Shomurodov to lead the line, Abdukodir Khusanov to organize the defense, and Abbosbek Fayzullaev to add invention.",
    attackPlan: "play through Fayzullaev's movement and give Shomurodov a real target in the box",
    matchupWin: "keep the match structured long enough for nerves to shift to the opponent",
    defensiveTask: "trusting Khusanov to manage pressure without losing the line",
    threat: "stay disciplined, then find Shomurodov or Fayzullaev when space opens"
  }
};

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const attackingPositions = new Set(["AM", "LW", "RW", "LM", "RM", "ST"]);

function getPlayersAt(players, positions, excludedNames = new Set()) {
  const positionSet = new Set(positions);
  return players.filter((player) => positionSet.has(player.position) && !excludedNames.has(player.name));
}

function getFirstAt(players, positions, excludedNames = new Set()) {
  for (const position of positions) {
    const player = players.find(
      (candidate) => candidate.position === position && !excludedNames.has(candidate.name)
    );
    if (player) {
      return player;
    }
  }
  return null;
}

function getLastAt(players, positions, excludedNames = new Set()) {
  for (const position of positions) {
    const player = players.findLast(
      (candidate) => candidate.position === position && !excludedNames.has(candidate.name)
    );
    if (player) {
      return player;
    }
  }
  return null;
}

function requirePlayer(player, context) {
  if (!player?.name) {
    throw new Error(`Could not select ${context}`);
  }
  return player;
}

function getController(players, excludedNames = new Set()) {
  return (
    getFirstAt(players, ["DM"], excludedNames) ||
    getFirstAt(players, ["CM"], excludedNames) ||
    getFirstAt(players, ["AM"], excludedNames) ||
    getFirstAt(players, ["LM", "RM"], excludedNames)
  );
}

function getDistributor(players, excludedNames = new Set()) {
  return (
    getFirstAt(players, ["DM"], excludedNames) ||
    getLastAt(players, ["CM"], excludedNames) ||
    getFirstAt(players, ["AM"], excludedNames) ||
    getFirstAt(players, ["LM", "RM", "LWB", "RWB", "LB", "RB"], excludedNames)
  );
}

function getPreferredStarters(players, preferredNames = []) {
  const selected = [];
  const selectedNames = new Set();
  for (const preferredName of preferredNames) {
    const resolution = resolvePlayerNameInPool(preferredName, players);
    const player = resolution.status === "matched" ? resolution.candidate : null;
    if (!player?.name || selectedNames.has(player.name)) continue;
    selected.push(player);
    selectedNames.add(player.name);
  }
  return selected;
}

function getHeadlineAttacker(players, excludedNames = new Set(), preferredNames = []) {
  const preferredStarter = getPreferredStarters(players, preferredNames).find(
    (player) => attackingPositions.has(player.position) && !excludedNames.has(player.name)
  );
  return (
    preferredStarter ||
    players.find(
      (player) =>
        player.isCaptain && attackingPositions.has(player.position) && !excludedNames.has(player.name)
    ) ||
    getFirstAt(players, ["RW", "LW", "AM", "ST", "RM", "LM", "RWB", "LWB"], excludedNames)
  );
}

function getCentralThreat(players, excludedNames = new Set()) {
  return (
    players.find(
      (player) =>
        player.isCaptain && attackingPositions.has(player.position) && !excludedNames.has(player.name)
    ) ||
    getFirstAt(players, ["AM", "ST", "RW", "LW", "RM", "LM"], excludedNames)
  );
}

function getStartingLanePair(players, opponentPlayers, variantSeed, preferredNames = []) {
  const preferredWideNames = getPreferredStarters(players, preferredNames)
    .filter((player) => ["LW", "RW", "LM", "RM", "LWB", "RWB"].includes(player.position))
    .map((player) => player.name);
  const matchups = [
    {
      lane: "right",
      opponentLane: "left",
      attackerPositions: ["RW", "RM", "RWB"],
      defenderPositions: ["LB", "LWB", "LM", "LCB"]
    },
    {
      lane: "left",
      opponentLane: "right",
      attackerPositions: ["LW", "LM", "LWB"],
      defenderPositions: ["RB", "RWB", "RM", "RCB"]
    }
  ];

  const candidates = matchups
    .map((matchup) => {
      const attacker = getFirstAt(players, matchup.attackerPositions);
      const defender = getFirstAt(opponentPlayers, matchup.defenderPositions);
      if (!attacker || !defender) return null;
      const attackerRank = matchup.attackerPositions.indexOf(attacker.position);
      const defenderRank = matchup.defenderPositions.indexOf(defender.position);
      return {
        ownStarter: attacker,
        opposingStarter: defender,
        variant: "wide-lanes",
        lane: matchup.lane,
        opponentLane: matchup.opponentLane,
        // Prefer the clearest winger-v-full-back geometry. A stable hash only
        // breaks equally strong left/right options, avoiding a right-first bias.
        geometryScore:
          (matchup.attackerPositions.length - attackerRank) * 10 +
          (matchup.defenderPositions.length - defenderRank) * 5 +
          Number(Boolean(attacker.isCaptain)),
        preferenceIndex: preferredWideNames.indexOf(attacker.name),
        selectionBasis: preferredWideNames.includes(attacker.name)
          ? "watchlist-preferred-complete-wide-lane-geometry"
          : "strongest-complete-wide-lane-geometry"
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftIsPreferred = left.preferenceIndex >= 0;
      const rightIsPreferred = right.preferenceIndex >= 0;
      if (leftIsPreferred !== rightIsPreferred) return leftIsPreferred ? -1 : 1;
      if (leftIsPreferred && left.preferenceIndex !== right.preferenceIndex) {
        return left.preferenceIndex - right.preferenceIndex;
      }
      const scoreDifference = right.geometryScore - left.geometryScore;
      if (scoreDifference) return scoreDifference;
      const preferredLane = variantSeed % 2 === 0 ? "left" : "right";
      if (left.lane === preferredLane) return -1;
      if (right.lane === preferredLane) return 1;
      return left.lane.localeCompare(right.lane);
    });

  if (candidates.length) {
    const { geometryScore, preferenceIndex, ...selected } = candidates[0];
    return selected;
  }

  return {
    ownStarter: requirePlayer(getFirstAt(players, ["ST", "AM", "RW", "LW"]), "a central matchup starter"),
    opposingStarter: requirePlayer(
      getFirstAt(opponentPlayers, ["CB", "LCB", "RCB", "DM"]),
      "an opposing central starter"
    ),
    variant: "central-lanes",
    lane: "central",
    opponentLane: "central",
    selectionBasis: "central-fallback-geometry"
  };
}

function getStageClause(stage) {
  return (
    {
      group: "in the group stage",
      "round-of-32": "for a place in the round of 16",
      "round-of-16": "for a place in the quarter-finals",
      "quarter-finals": "for a place in the semi-finals",
      "semi-finals": "for a place in the final",
      "bronze-final": "in the bronze-medal match",
      final: "in the final"
    }[stage] || "in this tournament match"
  );
}

const positionLabels = Object.freeze({
  GK: "goalkeeper",
  LB: "left-back",
  LCB: "left centre-back",
  CB: "centre-back",
  RCB: "right centre-back",
  RB: "right-back",
  LWB: "left wing-back",
  RWB: "right wing-back",
  DM: "defensive midfield",
  LM: "left midfield",
  CM: "central midfield",
  RM: "right midfield",
  AM: "attacking midfield",
  LW: "left wing",
  RW: "right wing",
  ST: "striker"
});

function positionLabel(player) {
  return positionLabels[player.position] || String(player.position || "a starting position").toLowerCase();
}

function possessive(value) {
  return /s$/i.test(value) ? `${value}'` : `${value}'s`;
}

function starterFact(player) {
  return { name: player.name, position: player.position };
}

function stableVariant(...parts) {
  let hash = 2_166_136_261;
  for (const character of parts.join("|")) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function buildPlanSentence(players, formation, variantSeed) {
  const centralPlayers = getPlayersAt(players, ["CM"]);
  const controller = requirePlayer(getController(players), "a midfield controller");
  const defensiveMidfielder = getFirstAt(players, ["DM"]);
  const attackingMidfielder = getFirstAt(players, ["AM"]);
  const leftWide = getFirstAt(players, ["LW", "LM", "LWB"]);
  const rightWide = getFirstAt(players, ["RW", "RM", "RWB"]);
  const leftForward = getFirstAt(players, ["LW"]);
  const rightForward = getFirstAt(players, ["RW"]);
  const leftWingBack = getFirstAt(players, ["LWB"]);
  const rightWingBack = getFirstAt(players, ["RWB"]);
  const strikers = getPlayersAt(players, ["ST"]);
  const striker = strikers[0] || getHeadlineAttacker(players, new Set([controller.name]));
  const alternateCentral = centralPlayers.find((player) => player.name !== controller.name);

  if (defensiveMidfielder && centralPlayers.length >= 2 && leftWide && rightWide) {
    const selectedWide = variantSeed % 2 === 0 ? rightWide : leftWide;
    const starters = [defensiveMidfielder, centralPlayers[0], centralPlayers[1], selectedWide];
    return {
      texts: [
        `${defensiveMidfielder.name} starts at defensive midfield beneath ${centralPlayers[0].name} and ${centralPlayers[1].name}, with ${selectedWide.name} in the ${selectedWide === rightWide ? "right" : "left"} wide slot.`,
        `Their starting structure puts ${defensiveMidfielder.name} at defensive midfield, ${centralPlayers[0].name} and ${centralPlayers[1].name} inside, and ${selectedWide.name} ${selectedWide === rightWide ? "right" : "left"}.`,
        `${defensiveMidfielder.name} starts beneath ${centralPlayers[0].name} and ${centralPlayers[1].name}, with ${selectedWide.name} in the ${selectedWide === rightWide ? "right" : "left"} wide slot.`
      ],
      key: "single-pivot-width",
      starters: starters.map(starterFact)
    };
  }

  if (attackingMidfielder && striker && attackingMidfielder.name !== striker.name) {
    const base = controller.name === attackingMidfielder.name
      ? requirePlayer(getController(players, new Set([attackingMidfielder.name])), "a deeper midfielder")
      : controller;
    const starters = [base, attackingMidfielder, striker];
    return {
      texts: [
        `${base.name} starts at ${positionLabel(base)} beneath ${attackingMidfielder.name} at attacking midfield and ${striker.name} at striker.`,
        `The central starting structure runs from ${base.name} at ${positionLabel(base)} through ${attackingMidfielder.name} at attacking midfield to ${striker.name} at striker.`,
        `${base.name}, ${attackingMidfielder.name}, and ${striker.name} fill the central midfield, attacking-midfield, and striker slots respectively.`
      ],
      key: "number-ten",
      starters: starters.map(starterFact)
    };
  }

  if (strikers.length >= 2) {
    const wideMidfielder = getFirstAt(players, ["LM", "RM", "LWB", "RWB"]);
    const starters = [controller, strikers[0], strikers[1]];
    return {
      texts: [
        `${strikers[0].name} and ${strikers[1].name} fill the two striker slots, with ${controller.name} at ${positionLabel(controller)}${wideMidfielder ? ` and ${wideMidfielder.name} at ${positionLabel(wideMidfielder)}` : ""}.`,
        `Their starting structure pairs ${strikers[0].name} and ${strikers[1].name} at striker above ${controller.name} at ${positionLabel(controller)}${wideMidfielder ? `, with ${wideMidfielder.name} at ${positionLabel(wideMidfielder)}` : ""}.`,
        `${strikers[0].name} and ${strikers[1].name} form the striker pair above ${controller.name} at ${positionLabel(controller)}.`
      ],
      key: "front-pair",
      starters: starters.map(starterFact)
    };
  }

  if (leftForward && rightForward && striker) {
    const starters = [leftForward, striker, rightForward, controller];
    return {
      texts: [
        `${leftForward.name}, ${striker.name}, and ${rightForward.name} fill the three forward slots, with ${controller.name} at ${positionLabel(controller)} on the line below.`,
        `The front line lists ${leftForward.name} left, ${striker.name} centrally, and ${rightForward.name} right, above ${controller.name} at ${positionLabel(controller)}.`,
        `${leftForward.name}, ${striker.name}, and ${rightForward.name} fill the front three above ${controller.name}.`
      ],
      key: "front-three",
      starters: starters.map(starterFact)
    };
  }

  if (leftWingBack && rightWingBack && striker) {
    const starters = [leftWingBack, rightWingBack, controller, striker];
    return {
      texts: [
        `${leftWingBack.name} and ${rightWingBack.name} occupy the wing-back slots, with ${controller.name} central and ${striker.name} at striker.`,
        `The official XI places ${leftWingBack.name} at left wing-back, ${rightWingBack.name} at right wing-back, ${controller.name} centrally, and ${striker.name} at striker.`,
        `${leftWingBack.name} and ${rightWingBack.name} take the wing-back slots around ${controller.name}, with ${striker.name} at striker.`
      ],
      key: "wing-backs",
      starters: starters.map(starterFact)
    };
  }

  const selectedConnector = requirePlayer(
    alternateCentral || attackingMidfielder || getFirstAt(players, ["LM", "RM"]),
    "a midfield connector"
  );
  const selectedStriker = requirePlayer(striker, "a forward");
  const starters = [controller, selectedConnector, selectedStriker];
  return {
    texts: [
      `${controller.name}, ${selectedConnector.name}, and ${selectedStriker.name} occupy ${positionLabel(controller)}, ${positionLabel(selectedConnector)}, and ${positionLabel(selectedStriker)} in the central starting line.`,
      `The central starting line contains ${controller.name} at ${positionLabel(controller)}, ${selectedConnector.name} at ${positionLabel(selectedConnector)}, and ${selectedStriker.name} at ${positionLabel(selectedStriker)}.`,
      `${controller.name}, ${selectedConnector.name}, and ${selectedStriker.name} form the central starting line from midfield to attack.`
    ],
    key: "central",
    starters: starters.map(starterFact)
  };
}

function buildOpponentShapeSentence(opponent, opponentPlayers) {
  const frontTwo = getPlayersAt(opponentPlayers, ["ST"])
    .sort((left, right) => Number(Boolean(right.isCaptain)) - Number(Boolean(left.isCaptain)))
    .slice(0, 2);
  const distributor = requirePlayer(
    getDistributor(opponentPlayers, new Set(frontTwo.map((player) => player.name))),
    "an opponent distributor"
  );
  const attackingMidfielder = getFirstAt(opponentPlayers, ["AM"], new Set([distributor.name]));
  const leftForward = getFirstAt(opponentPlayers, ["LW"]);
  const rightForward = getFirstAt(opponentPlayers, ["RW"]);
  const leftMidfielder = getFirstAt(opponentPlayers, ["LM"]);
  const rightMidfielder = getFirstAt(opponentPlayers, ["RM"]);
  const leftAttacker = leftForward || leftMidfielder;
  const rightAttacker = rightForward || rightMidfielder;
  const wideAttacker = leftAttacker || rightAttacker;
  const striker = getFirstAt(opponentPlayers, ["ST"], new Set([distributor.name]));

  if (frontTwo.length >= 2) {
    const starters = [distributor, frontTwo[0], frontTwo[1]];
    return {
      texts: [
        `${possessive(opponent.name)} starting XI pairs ${frontTwo[0].name} and ${frontTwo[1].name} at striker, with ${distributor.name} at ${positionLabel(distributor)} beneath them.`,
        `${frontTwo[0].name} and ${frontTwo[1].name} occupy ${possessive(opponent.name)} two striker positions ahead of ${distributor.name} at ${positionLabel(distributor)}.`,
        `${possessive(opponent.name)} striker pair is ${frontTwo[0].name} and ${frontTwo[1].name}, with ${distributor.name} on the midfield line below.`,
        `For ${opponent.name}, ${frontTwo[0].name} and ${frontTwo[1].name} start together at striker above ${distributor.name} at ${positionLabel(distributor)}.`
      ],
      key: "opponent-front-pair",
      zone: "central",
      starters: starters.map(starterFact)
    };
  }
  if (attackingMidfielder && striker) {
    const starters = [distributor, attackingMidfielder, striker];
    return {
      texts: [
        `${possessive(opponent.name)} central starting line runs from ${distributor.name} through ${attackingMidfielder.name} at attacking midfield to ${striker.name} at striker.`,
        `${possessive(opponent.name)} shape places ${distributor.name} deeper than ${attackingMidfielder.name} at attacking midfield and ${striker.name} at striker.`,
        `${possessive(opponent.name)} central stack runs from ${distributor.name} through ${attackingMidfielder.name} to striker ${striker.name}.`,
        `For ${opponent.name}, ${distributor.name}, ${attackingMidfielder.name}, and ${striker.name} occupy successive central lines from midfield to striker.`
      ],
      key: "opponent-ten-forward",
      zone: "between-lines",
      starters: starters.map(starterFact)
    };
  }
  if (leftForward && rightForward && striker) {
    const starters = [leftForward, striker, rightForward, distributor];
    return {
      texts: [
        `${possessive(opponent.name)} starting front line contains ${leftForward.name}, ${striker.name}, and ${rightForward.name}, with ${distributor.name} deeper at ${positionLabel(distributor)}.`,
        `${possessive(opponent.name)} front line places ${leftForward.name} and ${rightForward.name} around striker ${striker.name}, with ${distributor.name} at ${positionLabel(distributor)} on the line below.`,
        `${possessive(opponent.name)} front three are ${leftForward.name}, ${striker.name}, and ${rightForward.name}, with ${distributor.name} on the line below.`,
        `For ${opponent.name}, ${leftForward.name} starts left of ${striker.name} and ${rightForward.name} right, one line ahead of ${distributor.name}.`
      ],
      key: "opponent-front-three",
      zone: "wide",
      starters: starters.map(starterFact)
    };
  }
  if (leftMidfielder && rightMidfielder && striker) {
    const starters = [distributor, leftMidfielder, rightMidfielder, striker];
    return {
      texts: [
        `${possessive(opponent.name)} midfield spans the width, with ${leftMidfielder.name} left, ${rightMidfielder.name} right, ${distributor.name} central, and ${striker.name} at striker.`,
        `${possessive(opponent.name)} midfield line places ${leftMidfielder.name} left and ${rightMidfielder.name} right around ${distributor.name}, with ${striker.name} in the striker slot above.`,
        `${leftMidfielder.name} and ${rightMidfielder.name} give ${opponent.name} two wide midfield starters around ${distributor.name}, with ${striker.name} at striker.`,
        `${possessive(opponent.name)} wide midfielders are ${leftMidfielder.name} and ${rightMidfielder.name}, with ${distributor.name} central and ${striker.name} at striker.`,
        `For ${opponent.name}, ${leftMidfielder.name} and ${rightMidfielder.name} start either side of ${distributor.name}, with ${striker.name} on the line above.`
      ],
      key: "opponent-wide-midfield",
      zone: "wide",
      starters: starters.map(starterFact)
    };
  }
  if (wideAttacker && striker) {
    const starters = [distributor, wideAttacker, striker];
    return {
      texts: [
        `${possessive(opponent.name)} shape spans two attacking lanes, with ${wideAttacker.name} at ${positionLabel(wideAttacker)}, ${striker.name} at striker, and ${distributor.name} deeper.`,
        `${possessive(opponent.name)} ${wideAttacker.name} starts at ${positionLabel(wideAttacker)} outside ${striker.name}, while ${distributor.name} occupies the deeper line.`,
        `${possessive(opponent.name)} ${wideAttacker.name} starts outside striker ${striker.name}, with ${distributor.name} on the deeper midfield line.`,
        `For ${opponent.name}, ${wideAttacker.name} starts wide of ${striker.name}, with ${distributor.name} positioned on the midfield line below.`
      ],
      key: "opponent-wide-forward",
      zone: "wide",
      starters: starters.map(starterFact)
    };
  }

  const threat = requirePlayer(getCentralThreat(opponentPlayers, new Set([distributor.name])), "an opponent threat");
  const starters = [distributor, threat];
  return {
    texts: [
      `${possessive(opponent.name)} central shape lists ${distributor.name} at ${positionLabel(distributor)} and ${threat.name} at ${positionLabel(threat)} on separate lines.`,
      `${distributor.name} at ${positionLabel(distributor)} and ${threat.name} at ${positionLabel(threat)} are ${possessive(opponent.name)} two central starting references.`,
      `${possessive(opponent.name)} central reference points are ${distributor.name} and ${threat.name} on two starting lines.`,
      `For ${opponent.name}, ${distributor.name} and ${threat.name} occupy two different central lines in the starting shape.`
    ],
    key: "opponent-central-forward",
    zone: "central",
    starters: starters.map(starterFact)
  };
}

function countWords(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function copyPrior(prior, includeGroupPoints = false) {
  return {
    matches: prior.matches,
    wins: prior.wins,
    draws: prior.draws,
    losses: prior.losses,
    goalsFor: prior.goalsFor,
    goalsAgainst: prior.goalsAgainst,
    ...(includeGroupPoints ? { groupPoints: prior.groupPoints } : {})
  };
}

function buildStakes(stage, prior, opponentPrior) {
  if (stage === "group") {
    return {
      kind: "group-points",
      teamPoints: prior.groupPoints,
      opponentPoints: opponentPrior.groupPoints
    };
  }
  const knockoutTargets = {
    "round-of-32": "round of 16",
    "round-of-16": "quarter-finals",
    "quarter-finals": "semi-finals",
    "semi-finals": "final"
  };
  if (knockoutTargets[stage]) {
    return { kind: "knockout-place", target: knockoutTargets[stage] };
  }
  if (stage === "bronze-final") {
    return { kind: "bronze", target: "bronze medal" };
  }
  if (stage === "final") {
    return { kind: "title", target: "world title" };
  }
  return { kind: "knockout-place", target: "next round" };
}

function buildCurrentLocaleModel({
  team,
  opponent,
  lineup,
  opponentLineup,
  stage,
  editionYear,
  prior,
  opponentPrior,
  layoutEvidence,
  controller,
  headlineAttacker,
  matchup,
  plan,
  risk
}) {
  const includeGroupPoints = stage === "group";
  const planModel = {
    key: plan.key,
    starters: plan.starters,
    claimClass: "structural-description",
    evidenceRefs: ["officialStartingXI", "officialTacticalLayout"],
    surfaceTemplateId: `plan-${plan.key}`
  };
  const riskModel = {
    key: risk.key,
    zone: risk.zone,
    starters: risk.starters,
    claimClass: "structural-description",
    evidenceRefs: ["officialStartingXI", "officialTacticalLayout"],
    surfaceTemplateId: `risk-${risk.key}`
  };
  return {
    version: localeModelVersion,
    kind: "current-lineup",
    team: { id: team.id, name: team.name },
    opponent: { id: opponent.id, name: opponent.name },
    stage: { id: stage, year: editionYear },
    slots: {
      identity: {
        variant: "record-and-layout",
        formation: lineup.formation,
        layoutPerspective: layoutEvidence.perspective,
        layoutTiming: layoutEvidence.timing,
        prior: copyPrior(prior, includeGroupPoints),
        namedStarters: [controller, headlineAttacker].map(starterFact),
        claimClass: "official-layout-and-prior-context",
        evidenceRefs: [
          "priorTournamentMatches",
          "officialStartingXI",
          "officialTacticalLayout"
        ],
        surfaceTemplateId: "identity-record-and-layout"
      },
      matchup: {
        variant: matchup.variant,
        lane: matchup.lane,
        opponentLane: matchup.opponentLane,
        selectionBasis: matchup.selectionBasis,
        opponentFormation: opponentLineup.formation,
        opponentPrior: copyPrior(opponentPrior, includeGroupPoints),
        stakes: buildStakes(stage, prior, opponentPrior),
        ownStarter: starterFact(matchup.ownStarter),
        opposingStarter: starterFact(matchup.opposingStarter),
        claimClass: "official-layout-and-stage-context",
        evidenceRefs: ["stage", "officialStartingXI", "officialTacticalLayout", "priorTournamentMatches"],
        surfaceTemplateId: `matchup-${matchup.variant}-${buildStakes(stage, prior, opponentPrior).kind}`
      },
      plan: planModel,
      risk: riskModel
    }
  };
}

function getOpeningStageReference(stage) {
  return (
    {
      group: "before this group match",
      "round-of-32": "before this round-of-32 tie",
      "round-of-16": "before this round-of-16 tie",
      "quarter-finals": "before this quarter-final",
      "semi-finals": "before this semi-final",
      "bronze-final": "before the bronze-medal match",
      final: "before the final"
    }[stage] || "before this tournament match"
  );
}

function getMatchupLead(stage, team, opponent, prior, opponentPrior) {
  if (stage === "group") {
    return `With ${team.name} on ${prior.groupPoints} group points and ${opponent.name} on ${opponentPrior.groupPoints}`;
  }
  return (
    {
      "round-of-32": "With a round-of-16 place at stake",
      "round-of-16": "With a quarter-final place at stake",
      "quarter-finals": "With a semi-final place at stake",
      "semi-finals": "With a place in the final at stake",
      "bronze-final": "In the bronze-medal match",
      final: "With the world title at stake"
    }[stage] || "In this tournament match"
  );
}

function buildMatchupSentences({
  team,
  opponent,
  lineup,
  opponentLineup,
  stage,
  prior,
  opponentPrior,
  matchup
}) {
  const lead = getMatchupLead(stage, team, opponent, prior, opponentPrior);
  const stageClause = getStageClause(stage);
  const directStageClause = stage === "group"
    ? `in the group stage on ${prior.groupPoints} and ${opponentPrior.groupPoints} points respectively`
    : stageClause;
  const shapeContrast = `${possessive(team.name)} ${lineup.formation} meets ${possessive(opponent.name)} ${opponentLineup.formation}`;
  if (matchup.variant === "wide-lanes") {
    const ownLane = `${possessive(team.name)} ${matchup.lane}`;
    const opposingLane = `${possessive(opponent.name)} ${matchup.opponentLane}`;
    return [
      `${lead}, ${shapeContrast}; ${matchup.ownStarter.name} starts on ${ownLane}, opposite ${matchup.opposingStarter.name} on ${opposingLane}.`,
      `${team.name} meet ${opponent.name} ${directStageClause}, as a ${lineup.formation} faces a ${opponentLineup.formation}; ${matchup.ownStarter.name} lines up on ${ownLane} across from ${matchup.opposingStarter.name} on ${opposingLane}.`,
      `${lead}, the shape contrast places ${matchup.ownStarter.name} at ${positionLabel(matchup.ownStarter)} on ${ownLane} and ${matchup.opposingStarter.name} at ${positionLabel(matchup.opposingStarter)} on ${opposingLane}.`,
      ...(stage === "group"
        ? [`Group points stand at ${prior.groupPoints}–${opponentPrior.groupPoints} as ${shapeContrast}; ${matchup.ownStarter.name} occupies ${ownLane} opposite ${matchup.opposingStarter.name} on ${opposingLane}.`]
        : [`${shapeContrast} ${stageClause}; ${matchup.ownStarter.name} starts on ${ownLane} opposite ${matchup.opposingStarter.name} on ${opposingLane}.`]),
      ...(stage === "group"
        ? [`With group points at ${prior.groupPoints}–${opponentPrior.groupPoints}, ${matchup.ownStarter.name} starts on ${ownLane} opposite ${matchup.opposingStarter.name} on ${opposingLane}.`]
        : [`${lead}, ${matchup.ownStarter.name} starts on ${ownLane} opposite ${matchup.opposingStarter.name} on ${opposingLane}.`])
    ];
  }
  return [
    `${lead}, ${shapeContrast}, placing ${matchup.ownStarter.name} at ${positionLabel(matchup.ownStarter)} and ${matchup.opposingStarter.name} at ${positionLabel(matchup.opposingStarter)} in the central lane.`,
    `${team.name} meet ${opponent.name} ${directStageClause}, as a ${lineup.formation} faces a ${opponentLineup.formation} with ${matchup.ownStarter.name} and ${matchup.opposingStarter.name} as central references.`,
    `${lead}, the central shape contrast places ${matchup.ownStarter.name} at ${positionLabel(matchup.ownStarter)} against ${matchup.opposingStarter.name} at ${positionLabel(matchup.opposingStarter)} in ${possessive(opponent.name)} ${opponentLineup.formation}.`,
    ...(stage === "group"
      ? [`Group points stand at ${prior.groupPoints}–${opponentPrior.groupPoints} as ${shapeContrast}, placing ${matchup.ownStarter.name} opposite ${matchup.opposingStarter.name} centrally.`]
      : [`${possessive(team.name)} ${lineup.formation} meets ${possessive(opponent.name)} ${opponentLineup.formation} ${stageClause}, with ${matchup.ownStarter.name} and ${matchup.opposingStarter.name} as central references.`]),
    ...(stage === "group"
      ? [`With group points at ${prior.groupPoints}–${opponentPrior.groupPoints}, ${matchup.ownStarter.name} and ${matchup.opposingStarter.name} occupy opposing central lines.`]
      : [`${lead}, ${matchup.ownStarter.name} and ${matchup.opposingStarter.name} occupy opposing central lines.`])
  ];
}

function getLayoutDescription(layoutEvidence) {
  const timing = layoutEvidence.timing === "post-kickoff" ? "after" : "before";
  const base = `FIFA's ${layoutEvidence.perspective} layout`;
  return {
    subject: `${base}, published ${timing} kickoff,`,
    object: `${base}, published ${timing} kickoff`
  };
}

function buildOpeningSentences({
  team,
  lineup,
  stage,
  prior,
  layoutEvidence,
  controller,
  headlineAttacker
}) {
  const layoutDescription = getLayoutDescription(layoutEvidence);
  if (!prior.matches) {
    return [
      `${team.name} are entering their tournament opener; ${layoutDescription.subject} lists ${controller.name} at ${positionLabel(controller)} and ${headlineAttacker.name} at ${positionLabel(headlineAttacker)} in a ${lineup.formation}.`,
      `${team.name} are in their tournament opener with ${controller.name} and ${headlineAttacker.name} in a ${lineup.formation}, as shown by ${layoutDescription.object}.`,
      `${team.name} are beginning their tournament in a ${lineup.formation}; ${layoutDescription.subject} includes ${controller.name} and ${headlineAttacker.name}.`
    ];
  }
  const record = `${prior.wins}-${prior.draws}-${prior.losses}`;
  const goalBalance = `${prior.goalsFor}–${prior.goalsAgainst}`;
  const stageReference = getOpeningStageReference(stage);
  return [
    `${team.name} are ${record} with a goal balance of ${goalBalance} ${stageReference}; ${layoutDescription.subject} lists ${controller.name} at ${positionLabel(controller)} and ${headlineAttacker.name} at ${positionLabel(headlineAttacker)} in a ${lineup.formation}.`,
    `${team.name} are carrying a ${record} record and a goal balance of ${goalBalance} ${stageReference}; ${layoutDescription.subject} shows ${controller.name} and ${headlineAttacker.name} in a ${lineup.formation}.`,
    `${team.name} are ${record} with a goal balance of ${goalBalance} ${stageReference}; in ${layoutDescription.object}, ${controller.name} and ${headlineAttacker.name} start in a ${lineup.formation}.`,
    `${team.name} are ${record}, having scored ${prior.goalsFor} and conceded ${prior.goalsAgainst} ${stageReference}; ${layoutDescription.subject} places ${controller.name} and ${headlineAttacker.name} in a ${lineup.formation}.`
  ];
}

function selectCopyCombination(optionGroups, variantSeed) {
  let combinations = [{ sentences: [], preference: 0 }];
  optionGroups.forEach((options, groupIndex) => {
    const preferredIndex = (variantSeed >>> groupIndex) % options.length;
    combinations = combinations.flatMap((combination) =>
      options.map((sentence, optionIndex) => ({
        sentences: [...combination.sentences, sentence],
        preference: combination.preference + (optionIndex === preferredIndex ? 0 : 1)
      }))
    );
  });
  const candidates = combinations
    .map((candidate) => ({ ...candidate, copy: candidate.sentences.join(" ") }))
    .map((candidate) => ({ ...candidate, words: countWords(candidate.copy) }))
    .filter((candidate) => candidate.words >= 76 && candidate.words <= 85)
    .sort((left, right) => {
      const distance = Math.abs(left.words - 81) - Math.abs(right.words - 81);
      return left.preference - right.preference || distance || left.copy.localeCompare(right.copy);
    });
  if (!candidates.length) {
    const measured = combinations
      .map((candidate) => ({ copy: candidate.sentences.join(" "), words: countWords(candidate.sentences.join(" ")) }))
      .sort((left, right) => left.words - right.words);
    throw new Error(`No 76-85-word Key information combination; available range ${measured[0].words}-${measured.at(-1).words}; shortest: ${measured[0].copy}`);
  }
  return candidates[0].copy;
}

function buildSideCopy({
  team,
  opponent,
  lineup,
  opponentLineup,
  stage,
  editionYear,
  prior,
  opponentPrior,
  layoutEvidence,
  preferredNames
}) {
  const players = lineup.players;
  const opponentPlayers = opponentLineup.players;
  const controller = requirePlayer(getController(players), `${team.id} controller`);
  const headlineAttacker = requirePlayer(
    getHeadlineAttacker(players, new Set([controller.name]), preferredNames),
    `${team.id} headline attacker`
  );
  const variantSeed = stableVariant(team.id, opponent.id, stage, lineup.formation);
  const matchup = getStartingLanePair(players, opponentPlayers, variantSeed, preferredNames);
  const plan = buildPlanSentence(players, lineup.formation, variantSeed);
  const risk = buildOpponentShapeSentence(opponent, opponentPlayers);
  let copy;
  try {
    copy = selectCopyCombination(
      [
        buildOpeningSentences({
          team,
          lineup,
          stage,
          prior,
          layoutEvidence,
          controller,
          headlineAttacker
        }),
        buildMatchupSentences({ team, opponent, lineup, opponentLineup, stage, prior, opponentPrior, matchup }),
        plan.texts,
        risk.texts
      ],
      variantSeed
    );
  } catch (error) {
    throw new Error(`${team.id} vs ${opponent.id}: ${error.message}`);
  }

  const wordCount = countWords(copy);
  if (wordCount < 76 || wordCount > 85) {
    throw new Error(`${team.id} vs ${opponent.id} Key information is ${wordCount} words; expected 76-85`);
  }

  return {
    copy,
    localeModel: buildCurrentLocaleModel({
      team,
      opponent,
      lineup,
      opponentLineup,
      stage,
      editionYear,
      prior,
      opponentPrior,
      layoutEvidence,
      controller,
      headlineAttacker,
      matchup,
      plan,
      risk
    })
  };
}

function getLineupResearchSourceIds(lineup) {
  return [
    ...new Set([
      ...(lineup.sourceIds || []),
      ...(lineup.layoutVerification?.sourceIds || [])
    ].filter((id) => /lineup|tactical/i.test(id)))
  ];
}

function getPreferredPlayerNames(keyPlayers = []) {
  return keyPlayers
    .map((player) => (typeof player === "string" ? player : player?.name))
    .filter((name) => typeof name === "string" && name.trim())
    .map((name) => name.trim());
}

function emptyPriorRecord() {
  return {
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    groupPoints: 0
  };
}

function clonePriorRecord(record) {
  return { ...(record || emptyPriorRecord()) };
}

export function buildPriorTournamentContexts(fixtures) {
  const contexts = new Map();
  const records = new Map();
  const getRecord = (teamId) => {
    if (!records.has(teamId)) records.set(teamId, emptyPriorRecord());
    return records.get(teamId);
  };
  const chronologicalFixtures = [...fixtures]
    .filter((fixture) => fixture.homeTeamId && fixture.awayTeamId && fixture.kickoffUtc)
    .sort((left, right) => {
      const timeDifference = Date.parse(left.kickoffUtc) - Date.parse(right.kickoffUtc);
      return timeDifference || left.id.localeCompare(right.id);
    });

  for (const fixture of chronologicalFixtures) {
    const homeRecord = getRecord(fixture.homeTeamId);
    const awayRecord = getRecord(fixture.awayTeamId);
    contexts.set(fixture.id, {
      home: clonePriorRecord(homeRecord),
      away: clonePriorRecord(awayRecord)
    });

    const homeGoals = Number(fixture.score?.home);
    const awayGoals = Number(fixture.score?.away);
    if (fixture.status !== "FT" || !Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) continue;

    homeRecord.matches += 1;
    awayRecord.matches += 1;
    homeRecord.goalsFor += homeGoals;
    homeRecord.goalsAgainst += awayGoals;
    awayRecord.goalsFor += awayGoals;
    awayRecord.goalsAgainst += homeGoals;
    if (homeGoals > awayGoals) {
      homeRecord.wins += 1;
      awayRecord.losses += 1;
      if (fixture.stage === "group") homeRecord.groupPoints += 3;
    } else if (awayGoals > homeGoals) {
      awayRecord.wins += 1;
      homeRecord.losses += 1;
      if (fixture.stage === "group") awayRecord.groupPoints += 3;
    } else {
      homeRecord.draws += 1;
      awayRecord.draws += 1;
      if (fixture.stage === "group") {
        homeRecord.groupPoints += 1;
        awayRecord.groupPoints += 1;
      }
    }
  }

  return contexts;
}

function getOfficialLayoutEvidence(fixture, lineup, sourceIds) {
  const source = (lineup.layoutVerification?.sources || []).find(
    (candidate) => candidate.exactLayout && candidate.status === "matched"
  );
  if (!source?.publishedAt || !source?.layoutPerspective) {
    throw new Error(`Fixture ${fixture.id} needs timestamped official tactical-layout evidence`);
  }
  const minutesFromKickoff = Number(
    ((Date.parse(source.publishedAt) - Date.parse(fixture.kickoffUtc)) / 60_000).toFixed(1)
  );
  if (!Number.isFinite(minutesFromKickoff)) {
    throw new Error(`Fixture ${fixture.id} has invalid layout or kickoff timing`);
  }
  const timing = minutesFromKickoff <= 0 ? "pre-kickoff" : "post-kickoff";
  const timingDescription = minutesFromKickoff <= 0
    ? `${Math.abs(minutesFromKickoff)} minutes before kickoff`
    : `${minutesFromKickoff} minutes after kickoff`;
  return {
    sourceIds,
    publishedAt: source.publishedAt,
    minutesFromKickoff,
    timing,
    perspective: source.layoutPerspective,
    documentVersion: source.documentVersion,
    exactLayout: source.exactLayout === true,
    note: `FIFA's ${source.layoutPerspective} tactical layout was published ${timingDescription}; it is used only to describe the official starting structure.`
  };
}

export function generateCurrentKeyInformationForFixture({
  fixture,
  lineup,
  homeTeam,
  awayTeam,
  editionYear,
  priorContext
}) {
  if (!homeTeam || !awayTeam) throw new Error(`Missing team for ${fixture.id}`);
  if (
    lineup?.mode !== "final" ||
    lineup.home?.players?.length !== 11 ||
    lineup.away?.players?.length !== 11 ||
    !lineup.home?.formation ||
    !lineup.away?.formation
  ) {
    throw new Error(`Fixture ${fixture.id} needs two official starting XIs and formations`);
  }
  if (!priorContext?.home || !priorContext?.away) {
    throw new Error(`Fixture ${fixture.id} needs outcome-safe prior tournament context`);
  }
  const lineupSourceIds = getLineupResearchSourceIds(lineup);
  if (!lineupSourceIds.length) throw new Error(`Fixture ${fixture.id} has no official lineup provenance`);
  const layoutEvidence = getOfficialLayoutEvidence(fixture, lineup, lineupSourceIds);
  const homeContent = buildSideCopy({
    team: homeTeam,
    opponent: awayTeam,
    lineup: lineup.home,
    opponentLineup: lineup.away,
    stage: fixture.stage,
    editionYear,
    prior: priorContext.home,
    opponentPrior: priorContext.away,
    layoutEvidence,
    preferredNames: getPreferredPlayerNames(fixture.keyPlayers?.home)
  });
  const awayContent = buildSideCopy({
    team: awayTeam,
    opponent: homeTeam,
    lineup: lineup.away,
    opponentLineup: lineup.home,
    stage: fixture.stage,
    editionYear,
    prior: priorContext.away,
    opponentPrior: priorContext.home,
    layoutEvidence,
    preferredNames: getPreferredPlayerNames(fixture.keyPlayers?.away)
  });

  return {
    sourceId: keyInformationSourceId,
    mode: "archive-present-tense",
    schemaVersion,
    narrativeMoment: "team-entrance",
    outcomeCutoff: "kickoff",
    generatedBy: "scripts/populate-matchup-key-information.mjs",
    evidenceInputs: [
      "teams",
      "stage",
      "officialStartingXI",
      "officialTacticalLayout",
      "priorTournamentMatches"
    ],
    excludedInputs: ["score", "winner", "currentMatchEvents", "cards", "substitutions", "shootout"],
    researchSourceIds: [...new Set([...lineupSourceIds, priorResultsSourceId])],
    layoutEvidence,
    home: homeContent.copy,
    away: awayContent.copy,
    localeModel: {
      version: localeModelVersion,
      home: homeContent.localeModel,
      away: awayContent.localeModel
    }
  };
}

async function main() {
  const [fixturesData, teamsData, lineupsData] = await Promise.all([
    readJson(fixturesPath),
    readJson(teamsPath),
    readJson(lineupsPath)
  ]);
  const teamsById = new Map(teamsData.teams.map((team) => [team.id, team]));
  const priorContexts = buildPriorTournamentContexts(fixturesData.fixtures);
  let populated = 0;

  fixturesData.sourceIds = [
    ...new Set(
      [...(fixturesData.sourceIds || []), keyInformationSourceId].filter(
        (sourceId) => sourceId !== "matchup-pre-match-reconstruction-2026-07-22"
      )
    )
  ];
  fixturesData.fixtures = fixturesData.fixtures.map((fixture) => {
    if (!fixture.homeTeamId || !fixture.awayTeamId) return fixture;
    const fixtureEditionYear =
      Number(fixture.tournamentYear) || Number(String(fixture.kickoffUtc || "").slice(0, 4));
    if (!Number.isInteger(fixtureEditionYear) || fixtureEditionYear < 1930) {
      throw new Error(`Fixture ${fixture.id} needs a valid edition year`);
    }
    const keyInformation = generateCurrentKeyInformationForFixture({
      fixture,
      lineup: lineupsData.lineups?.[fixture.id],
      homeTeam: teamsById.get(fixture.homeTeamId),
      awayTeam: teamsById.get(fixture.awayTeamId),
      editionYear: fixtureEditionYear,
      priorContext: priorContexts.get(fixture.id)
    });
    populated += 2;
    return { ...fixture, keyInformation };
  });

  const teamStyleProfilesData = {
    generatedBy: "scripts/populate-matchup-key-information.mjs",
    sourceId: teamStyleSourceId,
    profiles: Object.fromEntries(
      Object.entries(profiles).map(([teamId, profile]) => [
        teamId,
        {
          summary: profile.summary,
          plan: profile.plan,
          ...(profile.planZh ? { planZh: profile.planZh } : {}),
          attackPlan: profile.attackPlan,
          matchupWin: profile.matchupWin,
          defensiveTask: profile.defensiveTask,
          ...(profile.defensiveTaskZh ? { defensiveTaskZh: profile.defensiveTaskZh } : {})
        }
      ])
    )
  };

  await Promise.all([
    writeFile(fixturesPath, `${JSON.stringify(fixturesData, null, 2)}\n`),
    writeFile(teamStyleProfilesPath, `${JSON.stringify(teamStyleProfilesData, null, 2)}\n`)
  ]);
  console.log(`Populated ${populated} matchup blurbs and ${Object.keys(profiles).length} shared team style profiles.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
