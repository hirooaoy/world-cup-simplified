#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const fixturesPath = path.join(dataDir, "fixtures.json");
const matchupResearchPath = path.join(dataDir, "matchup-research-notes.json");
const teamsPath = path.join(dataDir, "teams.json");

const sourceId = "editorial-preview-2026-06-22";

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
    plan: "They can play with patience, but Lionel Messi's between-lines gravity, Julian Alvarez's running, and Enzo Fernandez's passing also let them turn pressure into fast attacks.",
    attackPlan: "press high through Alvarez, find Messi in space behind midfield, and let Enzo Fernandez change the angle of the attack",
    matchupWin: "keep possession without losing pressure after turnovers",
    defensiveTask: "closing central counters before they reach Emiliano Martinez's box",
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

const matchupProblems = {
  ALG: "Mahrez-Aouar control",
  ARG: "Messi-Alvarez midfield breaks",
  AUS: "Irvine-Volpato duel-and-service rhythm",
  AUT: "Sabitzer-Laimer pressure waves",
  BEL: "De Bruyne-to-Lukaku chance creation",
  BIH: "Dzeko target play",
  BRA: "Neymar-Vinicius isolation speed",
  CAN: "Davies-David open-field speed",
  CIV: "Kessie-Adingra power breaks",
  COD: "Wissa-Sadiki counters",
  COL: "Diaz-James width-and-service",
  CPV: "Mendes-led compact counterpunch",
  CRO: "Modric-Kovacic midfield control",
  CUW: "Bacuna free-kick and corner play plus Chong outlets",
  CZE: "Schick-Soucek aerial pressure",
  ECU: "Caicedo-Hincapie midfield squeeze",
  EGY: "Salah-Marmoush breakaway threat",
  ENG: "Kane-Bellingham box entries",
  ESP: "Yamal-Williams wide stretch",
  FRA: "Olise-to-Mbappe chance creation",
  GER: "Kimmich-Musiala-Wirtz central rotations",
  GHA: "Semenyo-Williams forward running",
  HAI: "Nazon-Pierrot direct box pressure",
  IRN: "Taremi-Ghoddos counter craft",
  IRQ: "Ali Jasim-to-Hussein counter route",
  JOR: "Al-Taamari-Olwan counter timing",
  JPN: "Doan-Kamada combination speed",
  KOR: "Son-Lee quick-break service",
  KSA: "Al-Dawsari pressing bursts",
  MAR: "Hakimi-Brahim right-side surges",
  MEX: "Gimenez-Chavez home pressure",
  NED: "De Jong-Gakpo controlled buildup",
  NOR: "Odegaard-to-Haaland supply",
  NZL: "Cacace-to-Wood aerial service",
  PAN: "Carrasquilla-Murillo right-side escape",
  PAR: "Almiron-Enciso counters",
  POR: "Vitinha-Bruno-Ronaldo supply",
  QAT: "Afif-Almoez patient combinations",
  RSA: "Williams-Mokoena-Foster save-to-counter chain",
  SCO: "Robertson-McTominay left-side service",
  SEN: "Mane-Jackson direct running",
  SUI: "Xhaka-Embolo control-and-release",
  SWE: "Isak-Gyokeres two-striker pressure",
  TUN: "Skhiri-Saad compact counter route",
  TUR: "Calhanoglu-Guler-Yildiz creative bursts",
  URU: "Valverde-Nunez chaos running",
  USA: "Pulisic-McKennie pressure breaks",
  UZB: "Fayzullaev-Shomurodov disciplined attacks"
};

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readOptionalJson(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatList(values) {
  if (values.length <= 1) {
    return values.join("");
  }

  if (values.length === 2) {
    return values.join(" and ");
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function getPlayerNames(players = []) {
  return players
    .map((player) => (typeof player === "string" ? player : player?.name))
    .filter(Boolean);
}

function formatPossessiveName(name) {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

function getResearchSourceId(fixtureResearch) {
  return fixtureResearch?.sourceId || fixtureResearch?.sourceIds?.[0] || sourceId;
}

function getSideResearch(fixtureResearch, side) {
  return fixtureResearch?.[side] && typeof fixtureResearch[side] === "object"
    ? fixtureResearch[side]
    : null;
}

let baselineKeyPlayersByTeamId = new Map();

function buildBaselineKeyPlayersByTeamId(fixtures = []) {
  const byTeamId = new Map();

  for (const fixture of fixtures) {
    for (const side of ["home", "away"]) {
      const teamId = fixture[`${side}TeamId`];
      const players = fixture.keyPlayers?.[side];

      if (!teamId || byTeamId.has(teamId) || !Array.isArray(players) || getPlayerNames(players).length < 3) {
        continue;
      }

      byTeamId.set(teamId, clone(players));
    }
  }

  return byTeamId;
}

function getSidePlayers(fixtureResearch, side, fallbackPlayers, teamId) {
  const researchedPlayers = getSideResearch(fixtureResearch, side)?.keyPlayers;

  if (Array.isArray(researchedPlayers) && researchedPlayers.length) {
    return researchedPlayers;
  }

  if (Array.isArray(fallbackPlayers) && fallbackPlayers.length) {
    return fallbackPlayers;
  }

  return baselineKeyPlayersByTeamId.get(teamId);
}

function buildSideCopy(team, opponent, players, opponentPlayers, fixtureResearch, side) {
  const profile = profiles[team.id];
  const opponentProfile = profiles[opponent.id];
  const opponentSide = side === "home" ? "away" : "home";
  const sideResearch = getSideResearch(fixtureResearch, side);
  const opponentResearch = getSideResearch(fixtureResearch, opponentSide);

  if (!profile) {
    throw new Error(`Missing profile for ${team.id}`);
  }

  if (!opponentProfile) {
    throw new Error(`Missing profile for ${opponent.id}`);
  }

  const names = getPlayerNames(players);
  const opponentNames = getPlayerNames(opponentPlayers).slice(0, 2);

  if (names.length < 3 || opponentNames.length < 2) {
    throw new Error(`Missing key players for ${team.id} vs ${opponent.id}`);
  }

  const summary = sideResearch?.summary || profile.summary;
  const attackPlan = sideResearch?.attackPlan || profile.opponentPlans?.[opponent.id] || profile.attackPlan;
  const opponentThreat = opponentResearch?.threat || opponentProfile.opponentThreats?.[team.id] || opponentProfile.threat;
  const teamMatchupProblem = sideResearch?.matchupProblem || matchupProblems[team.id] || profile.threat;
  const opponentMatchupProblem = opponentResearch?.matchupProblem || matchupProblems[opponent.id] || opponentProfile.threat;
  const contextSentence = sideResearch?.contextSentence ? `${sideResearch.contextSentence} ` : "";

  return `${team.name} ${summary}, led by ${formatList(names)}. Against ${opponent.name}, their ${teamMatchupProblem} has to beat ${formatPossessiveName(opponent.name)} ${opponentMatchupProblem}. ${contextSentence}They want to ${attackPlan}. The risk is ${opponent.name} can ${opponentThreat}.`;
}

const [fixturesData, teamsData, matchupResearchData] = await Promise.all([
  readJson(fixturesPath),
  readJson(teamsPath),
  readOptionalJson(matchupResearchPath)
]);
const teamsById = new Map(teamsData.teams.map((team) => [team.id, team]));
const matchupResearchByFixture = matchupResearchData?.fixtures || {};
baselineKeyPlayersByTeamId = buildBaselineKeyPlayersByTeamId(fixturesData.fixtures);
let populated = 0;

fixturesData.sourceIds = [
  ...new Set([...(fixturesData.sourceIds || []), sourceId, ...(matchupResearchData?.sourceIds || [])])
];

fixturesData.fixtures = fixturesData.fixtures.map((fixture) => {
  if (!fixture.homeTeamId || !fixture.awayTeamId) {
    return fixture;
  }

  const homeTeam = teamsById.get(fixture.homeTeamId);
  const awayTeam = teamsById.get(fixture.awayTeamId);

  if (!homeTeam || !awayTeam) {
    throw new Error(`Missing team for ${fixture.id}`);
  }

  const fixtureResearch = matchupResearchByFixture[fixture.id] || null;
  const keyInformationSourceId = getResearchSourceId(fixtureResearch);
  const homePlayers = getSidePlayers(fixtureResearch, "home", fixture.keyPlayers?.home, fixture.homeTeamId);
  const awayPlayers = getSidePlayers(fixtureResearch, "away", fixture.keyPlayers?.away, fixture.awayTeamId);

  if (fixtureResearch) {
    fixture.keyPlayers = {
      ...(fixture.keyPlayers || {}),
      sourceId: keyInformationSourceId,
      method: "fixture-research-notes",
      basis:
        "Fixture-specific source-backed watchlist; uses matchup research notes when current team news changes the emphasis",
      home: clone(homePlayers),
      away: clone(awayPlayers)
    };
  }

  fixture.keyInformation = {
    sourceId: keyInformationSourceId,
    ...(fixtureResearch?.checkedAt ? { checkedAt: fixtureResearch.checkedAt } : {}),
    ...(fixtureResearch?.sourceIds ? { researchSourceIds: fixtureResearch.sourceIds } : {}),
    home: buildSideCopy(homeTeam, awayTeam, homePlayers, awayPlayers, fixtureResearch, "home"),
    away: buildSideCopy(awayTeam, homeTeam, awayPlayers, homePlayers, fixtureResearch, "away")
  };
  populated += 2;

  return fixture;
});

await writeFile(fixturesPath, `${JSON.stringify(fixturesData, null, 2)}\n`);
console.log(`Populated ${populated} matchup-specific key information blurbs.`);
