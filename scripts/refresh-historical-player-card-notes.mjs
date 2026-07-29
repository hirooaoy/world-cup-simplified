#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getGeneratedPlayerCardCopy } from "../locales/player-note-templates.js";
import { HISTORICAL_HIGHLIGHTS } from "../data/highlights-history.js";
import {
  historicalIdentityNameKey,
  isKoreanNationalTeam
} from "./historical-player-identity.mjs";
import { normalizePlayerName } from "./player-name-matching.mjs";

export { historicalIdentityNameKey } from "./historical-player-identity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const profilesPath = path.join(dataDir, "historical-player-profiles.json");
const historyPath = path.join(dataDir, "history.json");
const currentProfilesPath = path.join(dataDir, "player-profiles.json");
const teamsPath = path.join(dataDir, "teams.json");
const args = process.argv.slice(2);

const EVERGREEN_SPOTLIGHTS = new Map([
  ["Lionel Messi / Argentina / 2006", "Messi is a young change-of-pace option here, not yet Argentina's primary organiser. He receives on the move, attacks the first defender and keeps running toward the box. That directness turns a small opening into a low pass across goal or his own run beyond the line."],
  ["Lionel Messi / Argentina / 2014", "Argentina give Messi freedom behind the striker, letting him receive between midfield and defence. Against Iran he shifts inside to shoot from the edge of the box; against Switzerland he drives at the defence, draws pressure and releases Di María into the box."],
  ["Lionel Messi / Argentina / 2018", "The contrast in Messi's 2018 tournament is between receiving under close attention and escaping beyond the line. Against France he is forced to take the ball with his back to goal under Kanté's marking; against Nigeria he runs onto Banega's pass, controls with his thigh and left foot, then finishes with his right."],
  ["Lionel Messi / Argentina / 2022", "Messi controls attacks with close touches and an early picture of the next pass. He draws defenders toward the ball, then releases a runner or shifts into his own shooting lane."],
  ["Ferenc Puskás / Hungary / 1954", "Puskás is Hungary's left-footed inside-forward and captain, attacking the space Hidegkuti opens by dropping away from centre-forward. An ankle injury keeps him out of the quarter-final and semi-final; he returns short of full fitness and still scores Hungary's opening goal in the final."],
  ["Pelé / Brazil / 1966", "Pelé's clearest attacking detail here is the power of his direct free kick, driven hard through the centre. In open play, defenders meet him with immediate contact. The knee injury that follows leaves only a partial picture of his movement and combination play."],
  ["Gerd Müller / West Germany / 1970", "Müller lives inside the penalty area, making his decisive move over the final few metres. He reacts first to rebounds, turns before the marker can reset and shoots immediately with whatever contact the ball allows. Even in the six-yard box, he needs almost no room to finish."],
  ["Diego Maradona / Argentina / 1982", "Maradona has a free role ahead of Argentina's midfield, dropping toward the centre circle to escape attention before turning forward. Watch him receive in different lanes, accelerate at defenders and carry through contact. That search for freedom can leave him too far from goal to decide the attack."],
  ["Claudio Borghi / Argentina / 1986", "Borghi’s brief 1986 role is as a young forward dropping toward Maradona and Valdano to combine. He starts against Italy and Bulgaria, but does not feature once the knockout rounds begin."],
  ["Diego Maradona / Argentina / 1986", "Maradona plays free between Argentina’s midfield and forwards, receiving where defenders must leave their line to meet him. He carries until several opponents commit, then either continues toward goal himself or releases Valdano and Burruchaga into the space they have left."],
  ["Héctor Enrique / Argentina / 1986", "Enrique enters the starting XI when Argentina add a midfielder for the last three matches, balancing the centre beside Batista. He keeps the short passing moving, and his simple ball near halfway begins Maradona’s run against England."],
  ["Jorge Burruchaga / Argentina / 1986", "From the left of midfield, Burruchaga covers ground in both directions and bursts beyond the ball when a lane opens. He arrives at the far post to score against Bulgaria, then runs diagonally into the right channel onto Maradona’s pass for the winner in the final."],
  ["Jorge Valdano / Argentina / 1986", "Valdano's edge comes from attacking the space behind defenders before it fully opens. One sign is how he starts his run while the back line is still watching the ball. That timing takes him into the left channel for Argentina’s second goal in the final."],
  ["José Luis Brown / Argentina / 1986", "Brown plays as the sweeper behind Ruggeri and Cuciuffo, moving across to double up when either stopper engages. In the final, he attacks Burruchaga’s free-kick to head the opening goal, then stays on after seriously injuring his shoulder."],
  ["Nery Pumpido / Argentina / 1986", "Pumpido brings steadiness rather than spectacle to Argentina’s goal. Well protected by the defence, he stays involved by organising the line and launching breaks with long throws; a late stop to deny Rubén Paz protects the lead against Uruguay."],
  ["Pedro Pasculli / Argentina / 1986", "Pasculli’s 1986 role was brief but decisive: he partnered Valdano in the opener, then returned against Uruguay. He finished the only goal of the round-of-16 tie after Burruchaga’s cross broke loose in the area."],
  ["Sergio Batista / Argentina / 1986", "Batista is the interceptor in front of Argentina’s defence and the first passer when possession is won. He holds the central space as teammates advance, then decides whether the next move needs a short pass or a longer ball into space."],
  ["Brito / Brazil / 1970", "Brito is the pure defender beside Piazza, tall and strong in the air while the converted midfielder handles more of the first pass. He rarely crosses halfway; within Brazil’s four-man line, his job is to delay the attack until an interception or tackle is available."],
  ["Carlos Alberto / Brazil / 1970", "Carlos Alberto chooses the overlap only after Brazil can protect the space behind him. In the final, Jairzinho moves left and Facchetti follows; Pelé then releases the captain’s run into the open right flank for the fourth goal."],
  ["Clodoaldo / Brazil / 1970", "Clodoaldo gives Brazil balance beneath their roaming attackers, protecting the centre and carrying forward when space opens. He arrives in the box to equalise against Uruguay, then escapes a crowd in midfield at the start of Carlos Alberto’s goal in the final."],
  ["Everaldo / Brazil / 1970", "Everaldo is Brazil’s less attacking full-back, narrowing beside Brito and Piazza when Carlos Alberto advances on the opposite side. That asymmetry leaves a back three behind the attack while the right-back joins forward."],
  ["Félix / Brazil / 1970", "Félix is uneasy when England send high crosses into the goalmouth. In the semi-final, he responds with a point-blank save from Cubilla when Uruguay break through. His tournament reads as that contrast: some aerial uncertainty, but also one decisive reaction save."],
  ["Gérson / Brazil / 1970", "Gérson conducts Brazil from central midfield, joining short combinations and then changing the attack with a longer pass. His influence in the final is just as broad: he scores from the edge of the box, then delivers the free-kick Pelé heads across for Jairzinho."],
  ["Jairzinho / Brazil / 1970", "Jairzinho starts on the right and tracks back to help Clodoaldo, but his defining movement is the surge from the flank into central scoring positions. He scores in all six matches; against Uruguay he wins the ball near Brazil’s box and finishes the 73-metre counter 11 seconds later."],
  ["Pelé / Brazil / 1970", "Watch Pelé for moving defenders before choosing the final action. He drops toward the ball to release runners but still arrives in the box as a scorer; in the final he heads the opener, then supplies Jairzinho and Carlos Alberto for the last two goals."],
  ["Rivellino / Brazil / 1970", "Rivellino's signature is starting from the left and narrowing enough to keep the midfield connected. His left foot adds direct threat: his three goals come from around the edge of the box or farther out, and his cross creates Pelé's opener in the final."],
  ["Tostão / Brazil / 1970", "Tostão is Brazil’s centre-forward, but his task is to organise rather than wait in the box. He drops to combine and releases runners: his dribble starts the winner against England, and his pass sends Jairzinho away from inside Brazil’s half against Uruguay."],
  ["Wilson Piazza / Brazil / 1970", "Moved from midfield to centre-back, Piazza gives Brazil a defender who can start the next attack instead of only clearing danger. His passing connects the build-up through Clodoaldo and the full-backs, providing the base from which Brazil’s attackers interchange."],
  ["Romário / Brazil / 1994", "Watch Romário separate from his marker just before the delivery reaches the box. He finishes with almost no setup, often with the toe of his boot, while his understanding with Bebeto lets either striker run or supply. At the far post, even taller defenders can lose him before the cross arrives."],
  ["Roberto Baggio / Italy / 1994", "Baggio connects Italy's attack and then becomes its finisher. He can meet a cut-back and guide it into the bottom corner without resetting. Running beyond the line, he takes the pass around the goalkeeper and still scores from a narrowing angle."],
  ["Bixente Lizarazu / France / 1998", "Lizarazu gives France width from left-back, combining on the flank before running beyond the player ahead of him to cross. Against Saudi Arabia, he sets up Henry after a one-two with Zidane and later continues into the box to score France's fourth."],
  ["Christophe Dugarry / France / 1998", "Dugarry gives France a central alternative to Guivarc'h, but injury makes his 1998 tournament intermittent. Nine minutes after coming on against South Africa he heads the opener; from the bench in the final, he carries out of his own box to start the move for Petit's third goal."],
  ["David Trezeguet / France / 1998", "Trezeguet is France's young penalty-area alternative to Guivarc'h, ready to start centrally or refresh the role from the bench. He heads in against Saudi Arabia and, against Paraguay, redirects Pirès's cross toward Blanc for the golden goal."],
  ["Didier Deschamps / France / 1998", "Deschamps anchors France in front of the back four, protecting the central route and organising the defensive side of midfield with Petit. His passing stays economical, letting Zidane and Djorkaeff take greater risks ahead of him."],
  ["Emmanuel Petit / France / 1998", "Petit is the two-way left-sided midfielder, helping Deschamps protect the defence while still making forward runs. In the final, his corner supplies Zidane's opener and his late burst beyond Brazil's midfield produces the third goal."],
  ["Fabien Barthez / France / 1998", "Barthez takes charge of the space behind France's back four and can turn possession directly into attack. Against Saudi Arabia, his long clearance launches Henry's second goal; in the final, he races out to beat Ronaldo to a long pass and later blocks him at close range."],
  ["Frank Leboeuf / France / 1998", "Leboeuf replaces suspended Blanc in France's usual back four for the final, with no fixed instruction to follow Ronaldo. His perfectly timed tackle on the striker becomes the challenge he later calls the best of his career."],
  ["Laurent Blanc / France / 1998", "Blanc gives France a ball-playing centre-back who can step forward with possession and join attacks. Against Paraguay, that freedom takes him to the right side of the six-yard box, where he volleys Trezeguet's knockdown for the golden goal."],
  ["Lilian Thuram / France / 1998", "Thuram is a natural centre-back playing at right-back, combining one-on-one defending with surging runs that add width. In the semi-final, he responds to his error on Croatia's opener by exchanging passes with Djorkaeff for the equaliser, then curls the winner left-footed after advancing again."],
  ["Marcel Desailly / France / 1998", "Desailly is the recovery defender in France's central pairing, protecting the space behind Blanc's advances and stepping in front when a striker receives with his back to goal. Strong in the air and on the ground, he is the leading figure in a defence that concedes only twice."],
  ["Stéphane Guivarc'h / France / 1998", "Guivarc'h is the lone centre-forward ahead of Zidane and Djorkaeff, with a job built as much on pressure as finishing. Jacquet asks him to press at full intensity, then often brings on Dugarry or Trezeguet after about an hour to refresh the role."],
  ["Thierry Henry / France / 1998", "Henry starts on the right in France's 4-3-3 but attacks the box like a scorer. He scores three times in the group stage and ends his first World Cup as France's leading scorer, even though Guivarc'h remains the preferred lone striker in the knockouts."],
  ["Youri Djorkaeff / France / 1998", "Djorkaeff shifts between attacking midfield and support striker, linking Zidane to the lone forward rather than holding one lane. His return pass releases Thuram for the semi-final equaliser, and his corner supplies Zidane's second goal in the final."],
  ["Zinedine Zidane / France / 1998", "France use Zidane as the playmaker behind the striker, trusting him to control the game and move attacks forward with deft passes. Against Saudi Arabia, one such pass releases Lizarazu down the line; after a two-match suspension, Zidane returns and scores twice from corners in the final."],
  ["André Schürrle / Germany / 2014", "Schürrle changes matches by attacking space at full speed from the left. Off the bench he improvises the extra-time opener against Algeria, scores twice against Brazil and drives past his man to cross for Götze's winner in the final."],
  ["Bastian Schweinsteiger / Germany / 2014", "Schweinsteiger grows into the tournament after being eased through the group stage, then becomes the deeper controller when Germany reshape for the quarter-final. From the base of midfield, his positioning protects the centre and the direction of his passing sets the pace."],
  ["Benedikt Höwedes / Germany / 2014", "Höwedes is a centre-back used at left-back for every minute of Germany's title run. He stays narrower and more defensive than a conventional overlapping full-back, yet remains an aerial target at corners and hits the post with a header in the final."],
  ["Mario Götze / Germany / 2014", "Götze gives Germany a mobile attacking option, dropping toward the ball and combining in tight spaces rather than staying fixed as a striker. In the final, after replacing Klose, he finds separation in the box, cushions Schürrle's cross on his chest and volleys the title-winning goal."],
  ["Mats Hummels / Germany / 2014", "Hummels attacks the first ball in both penalty areas. Against France, he beats Varane to Kroos's free-kick for the quarter-final winner, then blocks Benzema's rebound as Germany protect the lead."],
  ["Mesut Özil / Germany / 2014", "Özil is Germany's central creator starting from the left in their flexible front line, tucking inside to add a passing option rather than staying as a fixed winger. When Kramer's injury forces a reshuffle in the final, he moves centrally and twice cuts the ball back for Kroos arriving from deeper positions."],
  ["Miroslav Klose / Germany / 2014", "When Klose leads the line, Germany gain a reference centre-forward who occupies the centre-backs, gives Müller and Özil room to move around him and offers a target in the box. He comes off the bench to poach the equaliser against Ghana, then scores against Brazil to become the World Cup's outright leading goalscorer."],
  ["Philipp Lahm / Germany / 2014", "Lahm starts Germany's first four matches in central midfield, offering an extra passing option through the centre. From the quarter-final he returns to right-back, where he can overlap or step inside without losing that control of possession."],
  ["Sami Khedira / Germany / 2014", "Khedira supplies the forward-running power in Germany's central midfield, pressuring opposing midfielders and continuing beyond the pass to join attacks around the area. Against Brazil, he caps one of those combinations by exchanging passes with Özil and scoring the fifth."],
  ["Toni Kroos / Germany / 2014", "Kroos sets Germany's rhythm from left of centre, changing the point of attack with diagonal passes and following the move to the edge of the box. Against Brazil, he arrives behind Müller's run to finish first time; moments later he wins the ball from Fernandinho and completes a one-two with Khedira for his second."],
  ["Oliver Kahn / Germany / 2002", "Kahn's 2002 saves start from a patient set position. Once the shot commits him, he stands tall, sweeps low or reaches a fingertip around the post. When he holds the ball, a booming punt can begin the next attack before the opposition resets."],
  ["Johan Cruyff / Netherlands / 1974", "Cruyff organises the Netherlands by roaming away from a fixed centre-forward position. He moves toward the ball to create an extra option, then leaves that space for a teammate as the positions rotate. When possession is lost, he joins the swarm around the ball."],
  ["Ronaldinho / Brazil / 2006", "Brazil use Ronaldinho as a deeper creator in the magic square, under tighter positional rules than in Barcelona's front three. He comes toward the ball to release a forward early, combines in short bursts with Kaká, and gets room to carry when the opposition midfield opens."],
  ["James Rodríguez / Colombia / 2014", "Colombia give James freedom to drift in from a high starting position and find space behind midfield. He opens onto his left foot, then either slips a runner through or follows the move into the box to finish it himself."],
  ["Neymar / Brazil / 2022", "Brazil give Neymar freedom behind Richarlison while Vinícius Júnior and Raphinha hold the width. He drops toward midfield to connect play; against Croatia, his decisive combination shows the other half of the role, following the exchange into the box to finish it."],
  ["Cristiano Ronaldo / Portugal / 2022", "Portugal keep Cristiano Ronaldo high and central, using him as the target when the ball enters the box. He attacks crosses at the far post or through the centre. By the knockout rounds, he is coming on from the bench rather than starting."],
  ["Xavi / Spain / 2010", "Xavi shapes Spain's pace from central midfield, staying available for the short pass and moving possession away from pressure. He completes a tournament-record 599 passes, then supplies the corner Puyol heads in to decide the semi-final."],
  ["David Silva / Spain / 2010", "Silva's 2010 World Cup is brief: he starts the opener on the right, roams across the edge of the box to combine with Ramos and Iniesta, and finds Villa between the lines. His only other appearance is a four-minute semi-final cameo."],
  ["Fernando Torres / Spain / 2010", "Torres gives Spain a central striker who occupies the centre-backs and opens room for Villa to attack from the left. Still below full fitness after two knee operations, he ends the tournament without scoring, and Pedro takes his starting place for the semi-final and final."],
  ["Sergio Ramos / Spain / 2010", "Ramos is Spain's attacking outlet on the right, driving forward from full-back and carrying beyond pressure. His advances give the attack width, with Busquets and Alonso screening behind him."],
  ["Kylian Mbappé / France / 2022", "Mbappé's defining weapon is acceleration once a defender turns toward his own goal. He attacks from the left, changes pace after the challenge is set, and finishes before the cover arrives."],
  ["Ángel Di María / Argentina / 2022", "Di María carries the ball from wide areas on his left foot and changes the angle of an attack. He can beat the first defender, deliver early, or continue inside for the next combination."],
  ["Emiliano Martínez / Argentina / 2022", "Martínez makes himself large in one-on-one chances and waits for the striker to reveal the finish. He also commands the box with the confidence that lets defenders hold a higher line."],
  ["Luka Modrić / Croatia / 2018", "Modrić escapes pressure with his first touch and keeps seeing forward angles from central midfield. He changes tempo without forcing the pass and follows the ball to offer support again."],
  ["Kylian Mbappé / France / 2018", "Mbappé attacks open grass with unusually quick acceleration and keeps control at top speed. He starts wide or off a striker, then races through the gap before the defense can turn."],
  ["Antoine Griezmann / France / 2018", "Griezmann links midfield and attack by finding pockets around the main striker. He receives on the half-turn, combines quickly, and begins the press by closing the easiest pass."],
  ["Paul Pogba / France / 2018", "Pogba combines physical strength with a passing range that can move an attack in one action. He protects the ball under pressure, looks up, and switches play beyond the nearest line."],
  ["Ivan Perišić / Croatia / 2018", "Perišić is a two-footed wide attacker who can threaten outside or move into the box. He delivers early when the lane opens and attacks the far post when play develops opposite him."],
  ["Andrés Iniesta / Spain / 2010", "Watch Iniesta for attacking the space behind defenders before it fully opens. He arrives on the move and gets his finish away before the nearest marker recovers. He uses his body to protect the ball and brings a teammate into the move."],
  ["Iker Casillas / Spain / 2010", "Casillas's edge is staying balanced until the shot reveals its direction. He protects the centre of goal first and leaves his line only when he can reach the ball. He holds the dangerous lane until a teammate can apply pressure."],
  ["Guillermo Stábile / Argentina / 1930", "Stábile plays as a direct central forward who attacks space before defenders can settle. He stays ready between centre-backs and meets the final pass with minimal extra touches."],
  ["Pedro Cea / Uruguay / 1930", "Cea brings inside-forward movement from midfield into the penalty area. He begins outside the main marking line, arrives late, and gives the passer a second central target."],
  ["Héctor Castro / Uruguay / 1930", "Castro gives the attack a physical central reference without becoming static. He occupies centre-backs, protects direct passes, and turns toward goal when the second ball drops."],
  ["Lucien Laurent / France / 1930", "Laurent plays as a forward who looks for the gap beside the central striker. He moves before the defense is set and tries to turn a loose attacking phase into a quick shot."],
  ["Bert Patenaude / United States / 1930", "Patenaude is a penalty-area striker whose main strength is arriving where the next touch will fall. He stays central, separates from his marker, and finishes without delaying the move."]
]);

const EVERGREEN_SPOTLIGHTS_ZH = new Map([
  ["Lionel Messi / Argentina / 2006", "这一届的梅西仍是用来提速的年轻选择，尚未成为阿根廷的第一组织核心。他在跑动中接球，直面第一名防守者，并继续冲向禁区。这样的直接性，能把一线小空当变成门前低平横传，也能让他自己继续前插到防线身后。"],
  ["Lionel Messi / Argentina / 2014", "阿根廷给梅西充分自由，让他在中锋身后、对方中场与后防之间接球。对伊朗，他内切后在禁区前沿起脚；对瑞士，他带球直冲防线，吸引防守后把迪马利亚送入禁区。"],
  ["Lionel Messi / Argentina / 2018", "梅西在2018年的两种处境形成鲜明对照：一边是在贴身盯防下背身接球，另一边是摆脱防线、冲到其身后。对法国，坎特的紧逼迫使他背对球门拿球；对尼日利亚，他前插接应巴内加的传球，先用大腿、再用左脚停球，最后右脚破门。"],
  ["Lionel Messi / Argentina / 2022", "梅西用细密触球和提前观察掌控进攻。他先把防守者吸引到球边，再送出跑动线路上的传球，或移动到自己的射门通道。"],
  ["Ferenc Puskás / Hungary / 1954", "普斯卡什是匈牙利的左脚内锋兼队长。希代古提从中锋位置回撤后，他便攻击由此让出的空间。脚踝伤势令他错过四分之一决赛和半决赛；决赛复出时仍未完全康复，却为匈牙利首开纪录。"],
  ["Pelé / Brazil / 1966", "贝利在这届赛事最鲜明的进攻细节，是直接任意球的力量——他将球重重轰向球门中路。运动战中，防守者从一开始便用身体对抗限制他。随后的膝伤，使这届赛事只留下他跑动与配合能力的局部画面。"],
  ["Gerd Müller / West Germany / 1970", "穆勒几乎就住在禁区里，总在最后几米才做出决定性的移动。他最先冲向反弹球，在盯防者重新站稳前完成转身，并以当下能够触球的任何方式立即射门。即使在小禁区内，他也几乎不需要空间就能完成终结。"],
  ["Diego Maradona / Argentina / 1982", "马拉多纳在阿根廷中场身前拥有自由角色。他会回撤到中圈附近摆脱盯防，再转身向前。留意他如何在不同区域接球、加速冲向防守者，并顶着身体对抗继续推进。只是这种寻找自由空间的方式，有时会让他的接球位置离球门太远，难以直接决定进攻。"],
  ["Claudio Borghi / Argentina / 1986", "1986年世界杯期间，博尔吉以年轻前锋身份短暂登场，主要回撤到马拉多纳和巴尔达诺身边参与配合。他在对阵意大利和保加利亚的比赛中首发，进入淘汰赛后再未出场。"],
  ["Diego Maradona / Argentina / 1986", "马拉多纳在阿根廷中场与锋线之间自由游弋。他总在一个让防守者为难的位置接球：想上抢，就得离开原有防线。他带球吸引多名对手后，要么自己继续杀向球门，要么把巴尔达诺或布鲁查加送进对手身后留下的空当。"],
  ["Héctor Enrique / Argentina / 1986", "阿根廷在最后三场改为在中场多放一人，恩里克因此进入首发，与巴蒂斯塔一道稳住中路。他用简洁的短传把配合串联起来；对英格兰一战，正是他在中线附近一脚看似简单的传球，开启了马拉多纳的长途奔袭。"],
  ["Jorge Burruchaga / Argentina / 1986", "布鲁查加在中场左侧活动，在攻防两端大范围跑动；向前通道一出现，他便从球后高速前插。对保加利亚，他包抄后点破门；到了决赛，又斜插右侧通道，接马拉多纳的传球打进制胜球。"],
  ["Jorge Valdano / Argentina / 1986", "巴尔达诺最难防之处，是在防线身后的空当尚未真正打开时就发起冲击。他会趁后防线的注意力仍在球上时提前启动。决赛中，正是这样一次启动让他切入左侧通道，为阿根廷打进第二球。"],
  ["José Luis Brown / Argentina / 1986", "布朗站在鲁杰里和库休福身后担任清道夫；任何一名盯人中卫上抢，他都会横移补防，形成合围。决赛中，他冲向布鲁查加任意球的落点，头球首开纪录；此后即使肩部严重受伤，仍坚持留在场上。"],
  ["Nery Pumpido / Argentina / 1986", "蓬皮多带给阿根廷球门的是稳定，而不是抢镜。防线保护周全时，他会指挥后防站位，并用长距离手抛球迅速发动反击；对乌拉圭一战，终场前封出鲁本·帕斯的射门，替球队守住领先。"],
  ["Pedro Pasculli / Argentina / 1986", "帕斯库利在1986年世界杯出场不多，却起到决定性作用：阿根廷首战，他与巴尔达诺搭档锋线；对乌拉圭时又回到阵中。布鲁查加的传中在禁区内形成乱球，他抓住机会打进这场八分之一决赛的唯一进球。"],
  ["Sergio Batista / Argentina / 1986", "巴蒂斯塔守在阿根廷防线身前，既负责拦截，也是夺回球权后的第一出球点。队友向前压上时，他留在中路稳住位置，再判断下一步该用短传衔接，还是用长球寻找前方空当。"],
  ["Brito / Brazil / 1970", "布里托是皮亚扎身边更纯粹的防守者：他身材高大、擅长空中对抗，而由中场改踢中卫的皮亚扎更多承担后场第一脚出球。布里托很少越过中线；在巴西队的四人防线中，他的任务是先延缓对手推进，等到可以截球或下脚抢断时再出手。"],
  ["Carlos Alberto / Brazil / 1970", "卡洛斯·阿尔贝托只有在巴西能够保护好他身后空间时，才会选择套边前插。决赛中，雅伊尔津尼奥移向左侧，法切蒂随之跟防；贝利随后把球送进空出的右路，让前插的队长攻入第四球。"],
  ["Clodoaldo / Brazil / 1970", "克洛多阿尔多在自由游动的攻击手身后维持巴西的平衡，既保护中路，也会在空间出现时持球推进。他在对乌拉圭时前插禁区扳平比分；决赛中卡洛斯·阿尔贝托那粒进球，则始于他在中场摆脱多人围堵。"],
  ["Everaldo / Brazil / 1970", "埃韦拉尔多是巴西两名边后卫中较少压上的一位；当另一侧的卡洛斯·阿尔贝托前插时，他会内收到布里托和皮亚扎身旁。这种不对称站位让右后卫参与进攻的同时，也在攻势身后保留三人防线。"],
  ["Félix / Brazil / 1970", "英格兰把高空传中送入门前时，菲利克斯显得不够从容。到了半决赛，乌拉圭打穿防线，菲利克斯却在近距离封出了库维利亚的射门。"],
  ["Gérson / Brazil / 1970", "热尔松在中场中路调度巴西，先串联短传配合，再用更长距离的传球改变进攻线路。决赛中，他先在禁区边缘破门，随后又开出任意球，由贝利头球摆渡给雅伊尔津尼奥得分。"],
  ["Jairzinho / Brazil / 1970", "雅伊尔津尼奥从右路起步，也会回撤协助克洛多阿尔多防守；但他最有代表性的跑动，是从边路冲进中路的得分位置。他六战场场破门；对乌拉圭一战，他在本方禁区附近夺回球权，11秒后又在这次推进73米的反击中完成破门。"],
  ["Pelé / Brazil / 1970", "观察贝利时，要看他如何先调动防守者，再选择最后一传或射门。他会回撤接球，为前插队友送球，自己仍能及时进入禁区完成终结；决赛中，他头球首开纪录，随后又助攻雅伊尔津尼奥和卡洛斯·阿尔贝托攻入最后两球。"],
  ["Rivellino / Brazil / 1970", "里维利诺最鲜明的特点，是从左路起步后适度内收，让巴西中场保持连接。他的左脚还能直接制造威胁：三粒进球都来自禁区边缘一带或更远处，决赛中也正是他的传中帮助贝利首开纪录。"],
  ["Tostão / Brazil / 1970", "托斯唐担任巴西中锋，但他的任务不是守在禁区里等球，而是组织进攻。他回撤参与配合，再为前插队友送球：对英格兰的制胜球从他的盘带开始；对乌拉圭时，他又在本方半场送出传球，让雅伊尔津尼奥就此向前奔袭。"],
  ["Wilson Piazza / Brazil / 1970", "从中场改踢中卫后，皮亚扎让巴西后场多了一名不只负责解围、还能发起下一轮进攻的后卫。他通过传球串联克洛多阿尔多与两侧边后卫，为前场攻击手相互换位打下基础。"],
  ["Romário / Brazil / 1994", "留意球送进禁区前，罗马里奥如何突然从盯防者身边拉开。他几乎不需要调整就能射门，常常直接用脚尖捅射；与贝贝托的默契，又让两人可以随时交换跑位者和传球者的角色。到了后点，即使更高大的后卫也可能在传中到来前跟丢他。"],
  ["Roberto Baggio / Italy / 1994", "巴乔先串联意大利的进攻，随后又成为终结者。面对倒三角回传，他无需重新调整，便能顺势把球推入球门下角。前插到防线身后时，他接球后趟过门将，即使射门角度不断变窄仍能得分。"],
  ["Bixente Lizarazu / France / 1998", "利扎拉祖从左后卫位置为法国拉开进攻宽度，先在边路参与配合，再从身前队友身旁套上送出传中。对沙特阿拉伯，他与齐达内打出撞墙配合后助攻亨利，随后继续插入禁区，攻入法国第四球。"],
  ["Christophe Dugarry / France / 1998", "杜加里是吉瓦什之外的中锋选择，但伤病令他在1998年世界杯的出场断断续续。对南非，他替补登场九分钟后便头球首开纪录；决赛中，他替补登场后带球冲出本方禁区，发起了最终由佩蒂攻入第三球的进攻。"],
  ["David Trezeguet / France / 1998", "特雷泽盖是法国在吉瓦什之外的年轻禁区中锋，既能在中路首发，也可替补登场为这一位置注入活力。对沙特阿拉伯，他头球破门；对巴拉圭，他将皮雷的传中顺势摆向布兰科，由后者攻入金球。"],
  ["Didier Deschamps / France / 1998", "德尚坐镇法国四后卫身前，封锁中路，并与佩蒂一道维持中场的防守秩序。他的传球选择简洁稳妥，让前方的齐达内和德约卡夫可以更大胆地处理球。"],
  ["Emmanuel Petit / France / 1998", "佩蒂是左侧能攻能守的中场，既协助德尚保护防线，也会不断前插。决赛中，他开出的角球助攻齐达内首开纪录；比赛尾声，他冲到巴西中场身后，攻入法国第三球。"],
  ["Fabien Barthez / France / 1998", "巴特兹掌控着法国四后卫身后的空间，拿到球权后也能直接发动进攻。对沙特阿拉伯，他的一脚大脚解围直接策动亨利的第二个进球；决赛中，他迅速出击，抢在罗纳尔多之前处理掉一记长传，随后又在近距离封出罗纳尔多的射门。"],
  ["Frank Leboeuf / France / 1998", "勒伯夫在决赛顶替停赛的布兰科，进入法国惯用的四后卫阵型，并没有专盯罗纳尔多的固定任务。他面对这名前锋完成了一次时机恰到好处的铲断，后来称那是自己职业生涯最佳的一次铲抢。"],
  ["Laurent Blanc / France / 1998", "布兰科是法国后场的出球型中卫，能够带球压上，也会直接加入进攻。对巴拉圭，正是这种前插自由让他来到小禁区右侧，将特雷泽盖做下的球凌空打进金球。"],
  ["Lilian Thuram / France / 1998", "图拉姆本职是中卫，在右后卫位置上则把一对一防守与强势前插结合起来，为进攻拉开宽度。半决赛中，克罗地亚的首球源自他的失误，他随即与德约卡夫打出撞墙配合扳平比分；再次前插时，他又用左脚兜射攻入制胜球。"],
  ["Marcel Desailly / France / 1998", "德塞利在法国双中卫组合中负责补位，保护布兰科压上后留下的空间；对方前锋背身接球时，他则会抢到身前断球。无论争顶还是地面对抗，他都十分强势，是法国整届赛事仅失两球的后防核心。"],
  ["Stéphane Guivarc'h / France / 1998", "吉瓦什担任齐达内和德约卡夫身前的单箭头，他的任务中，压迫对手与门前终结同样重要。雅凯要求他全力逼抢，并常在比赛约一小时后换上杜加里或特雷泽盖，让生力军接过这一角色。"],
  ["Thierry Henry / France / 1998", "亨利在法国4-3-3阵型中从右路首发，却像射手一样不断冲击禁区。小组赛他攻入三球，第一次世界杯之旅便成为法国队内头号射手，尽管淘汰赛阶段的单箭头首选仍是吉瓦什。"],
  ["Youri Djorkaeff / France / 1998", "德约卡夫在前腰与影锋之间游走，不固守一条线路，而是在齐达内和单箭头之间串联。半决赛中，他的回做让图拉姆插上扳平比分；决赛里，他开出的角球助攻齐达内攻入第二球。"],
  ["Zinedine Zidane / France / 1998", "法国让齐达内担任中锋身后的组织核心，依靠他掌控比赛，并用细腻的传球推动进攻。对沙特阿拉伯，他用这样的传球送利扎拉祖沿边路前插；停赛两场后复出，他在决赛两次利用角球头球破门。"],
  ["André Schürrle / Germany / 2014", "许尔勒从左侧全速冲击空当，总能改变比赛走势。作为替补，他对阿尔及利亚时用一次即兴触球在加时赛打破僵局，对巴西梅开二度，又在决赛突破防守者后送出传中，助攻格策打进制胜球。"],
  ["Bastian Schweinsteiger / Germany / 2014", "小组赛期间，施魏因施泰格的出场时间逐步增加，他也渐入状态；球队为八强战变阵后，他成为位置更深的中场控制者。他立足中场底部，以站位保护中路，并用出球方向调节比赛节奏。"],
  ["Benedikt Höwedes / Germany / 2014", "赫韦德斯本职是中卫，却在德国整个夺冠征程的每一分钟都出任左后卫。他比传统套边型边后卫站得更靠内、职责也更偏防守；不过在角球进攻中仍会成为争顶目标，决赛的一次头球击中门柱。"],
  ["Mario Götze / Germany / 2014", "格策让德国在前场多了一个能够游动的选择：他不会固定在中锋线上，而是回撤接球，并在狭小空间里参与配合。决赛替下克洛泽后，他在禁区内拉开接球空间，胸部卸下许尔勒的传中，随即凌空射入夺冠制胜球。"],
  ["Mats Hummels / Germany / 2014", "胡梅尔斯在双方禁区里都主动争抢第一落点。对法国，他抢在瓦拉内之前顶进克罗斯的任意球，打入八强战制胜球；此后又封堵本泽马的补射，帮助德国守住领先。"],
  ["Mesut Özil / Germany / 2014", "厄齐尔在德国灵活的前场体系中从左侧出发，却仍承担中路创造职责；他不固定守在边线，而是内收，为持球者增加一个传球点。决赛中克拉默受伤迫使球队重排中前场，他转到中路，两次倒三角回传都找到后插上的克罗斯。"],
  ["Miroslav Klose / Germany / 2014", "克洛泽领衔锋线时，德国便有了明确的中锋支点：他牵制对方中卫，为穆勒和厄齐尔的游动腾出空间，同时在禁区内提供传中目标。他替补登场，在对加纳时门前抢点扳平比分；随后面对巴西再度破门，独占世界杯历史射手榜首。"],
  ["Philipp Lahm / Germany / 2014", "德国前四场比赛，拉姆都在中场中路首发，为中路推进增加一个接应点。到了八强战，他回归右后卫，既能沿边套上，也能内收参与组织，仍不失对球权的掌控。"],
  ["Sami Khedira / Germany / 2014", "赫迪拉为德国中场提供向前冲击力：他会上压对方中场，出球后也不停下脚步，而是继续前插到禁区周围接应。对巴西，他与厄齐尔完成撞墙配合，为其中一次中路推进收尾，攻入德国第五球。"],
  ["Toni Kroos / Germany / 2014", "克罗斯在中场偏左位置为德国定下节奏：他用斜传改变进攻方向，也会顺着攻势跟进到禁区前沿。对巴西，他从穆勒身后跟进，迎球直接破门；片刻后又从费尔南迪尼奥脚下断球，与赫迪拉打出撞墙配合，攻入个人第二球。"],
  ["Oliver Kahn / Germany / 2002", "卡恩在2002年的扑救都始于耐心站位。射门方向明确后，他会立住身体封堵，也会迅速下地挡住低球，或用指尖把球托出立柱。拿稳球后，一记有力的大脚开球便能在对手重组前发动下一次进攻。"],
  ["Johan Cruyff / Netherlands / 1974", "克鲁伊夫离开固定中锋位置四处游走，组织荷兰队的运转。他靠近持球点，制造额外的接应选择；随着位置轮转，他又离开那里，把空间让给队友。丢掉球权后，他也会加入球周围的集体围抢。"],
  ["Ronaldinho / Brazil / 2006", "巴西让罗纳尔迪尼奥在‘魔幻四重奏’体系中担任位置更深的创造者，对他的站位要求比在巴塞罗那三前锋中更严格。他主动靠近球，尽早送球找前锋，并与卡卡快速打出短传配合；对方中场一旦出现空隙，他也能获得带球推进的空间。"],
  ["James Rodríguez / Colombia / 2014", "哥伦比亚让哈梅斯·罗德里格斯从靠前的起始位置自由内收，寻找对方中场身后的空间。他会把身体调整到便于左脚处理球的角度，随后要么用直塞送出跑动队友，要么继续跟进禁区亲自终结。"],
  ["Neymar / Brazil / 2022", "巴西让内马尔在里沙利松身后自由活动，维尼修斯和拉菲尼亚则分别拉开两翼。他回撤到中场附近串联；对克罗地亚那次决定性的连续配合，又展现了这个角色的另一面——完成传递后继续冲入禁区，并亲自终结。"],
  ["Cristiano Ronaldo / Portugal / 2022", "葡萄牙让克里斯蒂亚诺·罗纳尔多留在前场中路，球进入禁区时以他为目标。他会攻击后点传中，也会从中路抢点。到了淘汰赛，他不再首发，而是替补登场。"],
  ["Xavi / Spain / 2010", "哈维在中场为西班牙掌控节奏，始终给短传提供接应，并把球及时转出压迫。他以599次成功传球创下赛事纪录，半决赛又以角球助攻普约尔头球制胜。"],
  ["Kylian Mbappé / France / 2022", "姆巴佩最鲜明的武器，是防守者转向自家球门后的爆发加速。他从左侧发起冲击，等对手脚步固定后变速，并在协防到位前完成射门。"],
  ["Ángel Di María / Argentina / 2022", "迪马利亚用左脚从边路带球，并改变进攻角度。他可以突破第一名防守者、提前传中，也可以继续内切参与下一次配合。"],
  ["Emiliano Martínez / Argentina / 2022", "马丁内斯在单刀时会扩大封堵面积，并等前锋暴露射门选择。他也用自信指挥禁区，让后卫敢于保持更靠前的防线。"],
  ["Luka Modrić / Croatia / 2018", "莫德里奇用第一脚触球摆脱压力，并不断从中场看到向前线路。他不勉强传球也能改变节奏，出球后还会继续移动提供支援。"],
  ["Kylian Mbappé / France / 2018", "姆巴佩用极快加速攻击开放空间，而且高速中仍能控制住球。他可以从边路或中锋身后启动，在防线转身前穿过空当。"],
  ["Antoine Griezmann / France / 2018", "格列兹曼通过寻找主中锋周围的空当连接中场与进攻。他会半转身接球、快速配合，并通过封住最简单传球来发起逼抢。"],
  ["Paul Pogba / France / 2018", "博格巴把身体力量和大范围传球结合在一起，可以一次处理就改变进攻方向。他在压力下护住球，抬头观察，再把球转移到最近防线之外。"],
  ["Ivan Perišić / Croatia / 2018", "佩里希奇是双脚都能制造威胁的边路攻击手，既能走外线也能进入禁区。传球线路打开时他会提前送球，球在另一侧发展时则攻击后点。"],
  ["Andrés Iniesta / Spain / 2010", "要看懂他的作用，关键是对防线身后空当的提前攻击。留意他如何移动中进入射门位置，并在最近的盯防者回位前完成终结。他也会用身体护住球，再让队友加入进攻。"],
  ["Iker Casillas / Spain / 2010", "他最特别的地方是射门方向明确前的身体平衡。他会先保护球门中央，确认能触球时才选择出击。他也会守住危险线路，直到队友能对持球人施压。"],
  ["David Silva / Spain / 2010", "席尔瓦在2010年世界杯的出场很有限：首战他从右路首发，在禁区前沿横向游动，与拉莫斯和伊涅斯塔配合，也会把球送给两线之间的比利亚。此后他唯一一次登场，是半决赛替补出场四分钟。"],
  ["Fernando Torres / Spain / 2010", "托雷斯在中路牵制对方中卫，为比利亚从左侧发起冲击腾出空间。经历两次膝部手术后，他的身体状态仍未完全恢复，最终整届赛事没有进球；到了半决赛和决赛，佩德罗取代了他的首发位置。"],
  ["Sergio Ramos / Spain / 2010", "拉莫斯是西班牙右路的重要进攻出口，他从边后卫位置带球向前，越过第一道压迫。他的前插为进攻拉开宽度，布斯克茨和哈维·阿隆索则在身后形成保护。"],
  ["Guillermo Stábile / Argentina / 1930", "斯塔比莱是直接攻击空当的中锋，会在防守者站稳前启动。他始终在两名中后卫之间准备接应，并尽量减少终结前的多余触球。"],
  ["Pedro Cea / Uruguay / 1930", "塞亚用从中场进入禁区的内锋跑动制造威胁。他先留在主要盯防线之外，再稍晚前插，为传球者提供第二个中路目标。"],
  ["Héctor Castro / Uruguay / 1930", "卡斯特罗为进攻提供身体支点，但不会一直站在原地。他牵制中后卫、保护直接传球，并在二点球落下时转向球门。"],
  ["Lucien Laurent / France / 1930", "洛朗会寻找中锋身旁的空当。他在防线站稳前移动，并尝试把松散的进攻阶段迅速变成射门。"],
  ["Bert Patenaude / United States / 1930", "帕特诺德是禁区型前锋，主要强项是提前到达下一次触球可能落下的位置。他留在中路、摆脱盯防，并尽量不拖慢终结动作。"]
]);

export const AUTHORED_HISTORICAL_STYLE_KEYS = Object.freeze([...EVERGREEN_SPOTLIGHTS.keys()]);

const AUTHORED_STYLE_SEMANTICS = new Map([
  ["Andrés Iniesta / Spain / 2010", Object.freeze({
    signature: "attack-space-behind",
    actions: Object.freeze(["moving-finish", "body-bring-teammate"]),
    structureId: "legacy-three"
  })],
  ["Iker Casillas / Spain / 2010", Object.freeze({
    signature: "goalkeeper-balance",
    actions: Object.freeze(["protect-centre-goal", "hold-danger-lane"]),
    structureId: "legacy-three"
  })],
  ["Sergio Batista / Argentina / 1986", Object.freeze({
    signature: "dm-screen",
    actions: Object.freeze(["dm-hold-zone", "dm-break-line"]),
    structureId: "authored-prose"
  })],
  ["Didier Deschamps / France / 1998", Object.freeze({
    signature: "dm-screen",
    actions: Object.freeze(["dm-hold-zone", "dm-lane-block"]),
    structureId: "authored-prose"
  })]
]);

const TEAM_ZH = new Map([
  ["Algeria", "阿尔及利亚"],
  ["Angola", "安哥拉"],
  ["Argentina", "阿根廷"],
  ["Australia", "澳大利亚"],
  ["Austria", "奥地利"],
  ["Belgium", "比利时"],
  ["Bolivia", "玻利维亚"],
  ["Bosnia-Herzegovina", "波黑"],
  ["Brazil", "巴西"],
  ["Bulgaria", "保加利亚"],
  ["Cameroon", "喀麦隆"],
  ["Canada", "加拿大"],
  ["Chile", "智利"],
  ["China", "中国"],
  ["Colombia", "哥伦比亚"],
  ["Costa Rica", "哥斯达黎加"],
  ["Croatia", "克罗地亚"],
  ["Cuba", "古巴"],
  ["Czech Republic", "捷克共和国"],
  ["Czechoslovakia", "捷克斯洛伐克"],
  ["Côte d'Ivoire", "科特迪瓦"],
  ["Denmark", "丹麦"],
  ["Dutch East Indies", "荷属东印度"],
  ["East Germany", "东德"],
  ["Ecuador", "厄瓜多尔"],
  ["Egypt", "埃及"],
  ["El Salvador", "萨尔瓦多"],
  ["England", "英格兰"],
  ["France", "法国"],
  ["Germany", "德国"],
  ["Ghana", "加纳"],
  ["Greece", "希腊"],
  ["Haiti", "海地"],
  ["Honduras", "洪都拉斯"],
  ["Hungary", "匈牙利"],
  ["Iceland", "冰岛"],
  ["Iran", "伊朗"],
  ["Iraq", "伊拉克"],
  ["Ireland", "爱尔兰"],
  ["Israel", "以色列"],
  ["Italy", "意大利"],
  ["Jamaica", "牙买加"],
  ["Japan", "日本"],
  ["Kuwait", "科威特"],
  ["Mexico", "墨西哥"],
  ["Morocco", "摩洛哥"],
  ["Netherlands", "荷兰"],
  ["New Zealand", "新西兰"],
  ["Nigeria", "尼日利亚"],
  ["North Korea", "朝鲜"],
  ["Northern Ireland", "北爱尔兰"],
  ["Norway", "挪威"],
  ["Panama", "巴拿马"],
  ["Paraguay", "巴拉圭"],
  ["Peru", "秘鲁"],
  ["Poland", "波兰"],
  ["Portugal", "葡萄牙"],
  ["Qatar", "卡塔尔"],
  ["Romania", "罗马尼亚"],
  ["Russia", "俄罗斯"],
  ["Saudi Arabia", "沙特阿拉伯"],
  ["Scotland", "苏格兰"],
  ["Senegal", "塞内加尔"],
  ["Serbia", "塞尔维亚"],
  ["Serbia and Montenegro", "塞尔维亚和黑山"],
  ["Slovakia", "斯洛伐克"],
  ["Slovenia", "斯洛文尼亚"],
  ["South Africa", "南非"],
  ["South Korea", "韩国"],
  ["Soviet Union", "苏联"],
  ["Spain", "西班牙"],
  ["Sweden", "瑞典"],
  ["Switzerland", "瑞士"],
  ["Togo", "多哥"],
  ["Trinidad and Tobago", "特立尼达和多巴哥"],
  ["Tunisia", "突尼斯"],
  ["Turkey", "土耳其"],
  ["Ukraine", "乌克兰"],
  ["United Arab Emirates", "阿联酋"],
  ["United States", "美国"],
  ["Uruguay", "乌拉圭"],
  ["USA", "美国"],
  ["Wales", "威尔士"],
  ["West Germany", "西德"],
  ["Yugoslavia", "南斯拉夫"],
  ["Zaire", "扎伊尔"]
]);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function getArgValue(name) {
  const flag = `--${name}=`;
  const arg = args.find((item) => item.startsWith(flag));
  return arg ? arg.slice(flag.length) : "";
}

function hasArg(name) {
  return args.includes(`--${name}`) || args.some((item) => item.startsWith(`--${name}=`));
}

function parseYears(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((year) => Number.isInteger(year));
}

function normalizeTeamName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function factKey(name, teamName, year) {
  return [historicalIdentityNameKey(name, teamName), normalizeTeamName(teamName), year].join("|");
}

const COMPOUND_SURNAME_PARTICLES = new Set([
  "al", "ap", "ben", "bin", "da", "das", "de", "del", "della", "den", "der", "di", "do", "dos",
  "du", "el", "la", "le", "mac", "st", "ten", "ter", "van", "von"
]);
const NAME_SUFFIXES = new Set(["filho", "ii", "iii", "iv", "jr", "junior", "neto"]);
const HISTORICAL_REFERENCE_NAME_OVERRIDES = new Map([
  ["Leonel Sánchez / Chile / 1962", "Leonel Sánchez"],
  ["Alexis Sánchez / Chile / 2010", "Alexis Sánchez"],
  ["Mark Wright / England / 1990", "Mark Wright"],
  ["Mauricio Wright / Costa Rica / 2002", "Mauricio Wright"],
  ["Roque Santa Cruz / Paraguay / 2002", "Roque Santa Cruz"],
  ["Julio Cruz / Argentina / 2006", "Julio Cruz"]
]);

export function historicalPlayerReferenceName(profile) {
  const reviewedReference = HISTORICAL_REFERENCE_NAME_OVERRIDES.get(profile?.profileKey);
  if (reviewedReference) return reviewedReference;
  const display = String(profile?.displayName || profile?.name || "").trim();
  const parts = display.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return display || "This player";

  if (isKoreanNationalTeam(profile?.teamName)) {
    return display.replace(/[.,]$/u, "");
  }

  let start = parts.length - 1;
  const finalToken = normalizePlayerName(parts[start].replace(/[.,]$/u, ""));
  if (start > 0 && NAME_SUFFIXES.has(finalToken)) start -= 1;
  while (start > 0) {
    const previous = normalizePlayerName(parts[start - 1].replace(/[.,]$/u, ""));
    if (!COMPOUND_SURNAME_PARTICLES.has(previous)) break;
    start -= 1;
  }
  return parts.slice(start).join(" ").replace(/[.,]$/u, "");
}

function shortName(profile) {
  return historicalPlayerReferenceName(profile);
}

function chineseStylePlayerName(profile) {
  return String(profile?.displayName || profile?.name || "").replace(/\s+/gu, " ").trim();
}

function introducePlayerInChineseStyle(note, profile) {
  const playerName = chineseStylePlayerName(profile);
  if (!playerName) return note;
  if (/他的/u.test(note)) return note.replace(/他的/u, `${playerName}的`);
  if (/他场上/u.test(note)) return note.replace(/他场上/u, `${playerName}的场上`);
  if (/他/u.test(note)) return note.replace(/他/u, playerName);
  throw new Error(`Chinese historical style-note has no player-reference slot for ${profile.profileKey}`);
}

function roleLabel(position = "") {
  if (/goalkeeper/i.test(position)) return "goalkeeper";
  if (/defender|back/i.test(position)) return "defender";
  if (/midfielder|midfield/i.test(position)) return "midfielder";
  if (/forward|striker|winger/i.test(position)) return "forward";
  return "player";
}

function teamZh(value = "") {
  return TEAM_ZH.get(String(value || "").trim()) || String(value || "").trim() || "球队";
}

function roleLabelZh(position = "") {
  if (/goalkeeper/i.test(position)) return "门将";
  if (/defender|back/i.test(position)) return "后卫";
  if (/midfielder|midfield/i.test(position)) return "中场";
  if (/forward|striker|winger/i.test(position)) return "前锋";
  return "球员";
}

function possessive(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  return /s$/i.test(text) ? `${text}'` : `${text}'s`;
}

function roleStructure(role) {
  if (role === "goalkeeper") return "goalkeeping setup";
  if (role === "defender") return "back line";
  if (role === "midfielder") return "midfield";
  if (role === "forward") return "front line";
  return "squad";
}

function roleStructureZh(role) {
  if (role === "goalkeeper") return "门将位置";
  if (role === "defender") return "后防线";
  if (role === "midfielder") return "中场";
  if (role === "forward") return "锋线";
  return "阵容";
}

function isStarter(profile, fact) {
  if (Array.isArray(profile.skills) && profile.skills.some((skill) => /^starter$/i.test(skill))) {
    return true;
  }
  return fact.keyEvents.some((event) => /\bstarted\b/i.test(event.note));
}

function upperFirst(value) {
  const text = String(value || "").trim();
  return text ? `${text[0].toLocaleUpperCase("en-US")}${text.slice(1)}` : "";
}

function lowerFirst(value) {
  const text = String(value || "").trim();
  return text ? `${text[0].toLocaleLowerCase("en-US")}${text.slice(1)}` : "";
}

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function chooseZhVariant(profile, bucket, variants) {
  const seed = `${profile.profileKey || profile.name || "player"}:${bucket}`;
  return variants[stableHash(seed) % variants.length]();
}

const FIRST_FOCUSED_HISTORICAL_STYLE_POLISH_PROFILE_KEYS = new Set([
  "Grzegorz Lato / Poland / 1974",
  "Hristo Stoichkov / Bulgaria / 1994",
  "Leônidas / Brazil / 1938",
  "Gary Lineker / England / 1986",
  "Karl-Heinz Rummenigge / West Germany / 1982",
  "Johan Neeskens / Netherlands / 1974",
  "Teófilo Cubillas / Peru / 1970",
  "Max Morlock / West Germany / 1954",
  "Dražan Jerković / Yugoslavia / 1962",
  "Telmo Zarra / Spain / 1950",
  "Olivier Giroud / France / 2022",
  "Gary Lineker / England / 1990",
  "Emilio Butragueño / Spain / 1986",
  "Leopoldo Luque / Argentina / 1978",
  "Rob Rensenbrink / Netherlands / 1978",
  "Agne Simonsson / Sweden / 1958",
  "Vavá / Brazil / 1958",
  "Silvio Piola / Italy / 1938",
  "Oldřich Nejedlý / Czechoslovakia / 1934",
  "Gheorghe Hagi / Romania / 1994",
  "Tomas Brolin / Sweden / 1994",
  "Teófilo Cubillas / Peru / 1978",
  "Leonel Sánchez / Chile / 1962",
  "Valentin Ivanov / Soviet Union / 1962",
  "Kurt Hamrin / Sweden / 1958",
  "Hans Schäfer / West Germany / 1954",
  "Nándor Hidegkuti / Hungary / 1954",
  "Neymar / Brazil / 2014",
  "Dennis Bergkamp / Netherlands / 1998",
  "Andreas Brehme / West Germany / 1990",
  "Jan Ceulemans / Belgium / 1986",
  "Falcão / Brazil / 1982",
  "Rivellino / Brazil / 1974",
  "Amarildo / Brazil / 1962",
  "Flórián Albert / Hungary / 1962",
  "Oscar Míguez / Uruguay / 1950",
  "Angelo Schiavio / Italy / 1934",
  "Luis Suárez / Uruguay / 2010",
  "Michael Ballack / Germany / 2002",
  "Brian Laudrup / Denmark / 1998"
]);

const SECOND_FOCUSED_HISTORICAL_STYLE_POLISH_PROFILE_KEYS = new Set([
  "Pelé / Brazil / 1962",
  "Diego Maradona / Argentina / 1994",
  "Cristiano Ronaldo / Portugal / 2006",
  "Cristiano Ronaldo / Portugal / 2010",
  "Cristiano Ronaldo / Portugal / 2014",
  "Miroslav Klose / Germany / 2010",
  "Roberto Baggio / Italy / 1990",
  "Roberto Baggio / Italy / 1998",
  "Franz Beckenbauer / West Germany / 1970",
  "Jairzinho / Brazil / 1974",
  "Mario Kempes / Argentina / 1974",
  "Sócrates / Brazil / 1986",
  "Michel Platini / France / 1978",
  "Michel Platini / France / 1982",
  "Lothar Matthäus / West Germany / 1986",
  "Lothar Matthäus / Germany / 1994",
  "Roger Milla / Cameroon / 1982",
  "Roger Milla / Cameroon / 1990",
  "Roger Milla / Cameroon / 1994",
  "Davor Šuker / Croatia / 2002",
  "Xavi / Spain / 2002",
  "Andrés Iniesta / Spain / 2014",
  "Andrés Iniesta / Spain / 2018",
  "David Villa / Spain / 2014",
  "Wesley Sneijder / Netherlands / 2014",
  "Thomas Müller / Germany / 2018",
  "Antoine Griezmann / France / 2014",
  "Antoine Griezmann / France / 2022",
  "Bobby Charlton / England / 1958",
  "Bobby Charlton / England / 1962",
  "Geoff Hurst / England / 1970",
  "Garrincha / Brazil / 1966",
  "Zico / Brazil / 1978",
  "Careca / Brazil / 1986",
  "Careca / Brazil / 1990",
  "Gabriel Batistuta / Argentina / 1994",
  "Gabriel Batistuta / Argentina / 1998",
  "Gabriel Batistuta / Argentina / 2002",
  "Jürgen Klinsmann / Germany / 1994",
  "Jürgen Klinsmann / Germany / 1998"
]);

const FOCUSED_HISTORICAL_STYLE_POLISH_PROFILE_KEYS = new Set([
  ...FIRST_FOCUSED_HISTORICAL_STYLE_POLISH_PROFILE_KEYS,
  ...SECOND_FOCUSED_HISTORICAL_STYLE_POLISH_PROFILE_KEYS
]);

if (SECOND_FOCUSED_HISTORICAL_STYLE_POLISH_PROFILE_KEYS.size !== 40) {
  throw new Error("Second focused historical style polish batch must contain exactly 40 player cards.");
}

const FOCUSED_HISTORICAL_CORRECTION_COPY = new Map([
  ["Grzegorz Lato / Poland / 1974", {
    english: "A cautious way to read Lato's 1974 role is as Poland's main runner from the wing into scoring space. He is most useful when attacks develop away from him and the far-post lane opens. The profile supports his goal threat more than any one repeated micro-action.",
    chinese: "观察1974年的Grzegorz Lato，可以把重点放在他从边路进入得分空间的作用上。当进攻从另一侧展开、后点通道打开时，他最值得留意。这里应保持角色层面的判断：现有资料支持他的进球威胁，但不足以证明某个固定细节反复出现。"
  }],
  ["Hristo Stoichkov / Bulgaria / 1994", {
    english: "Stoichkov's 1994 note should read through left-sided threat rather than generic forward running. He starts where he can face the defence, then turns possession into a shot or sharper pass inside. The safer claim is about that attacking profile, not a verified repeated movement.",
    chinese: "1994年的Hristo Stoichkov，更适合从左侧进攻威胁来理解，而不是只写成普通前锋跑动。他会出现在能够正面面对防线的位置，再把球权变成射门或向内的关键传球。更稳妥的说法是描述这种攻击轮廓，而不是断言某个动作被反复验证。"
  }],
  ["Leônidas / Brazil / 1938", {
    english: "For Leônidas in 1938, keep the lens broad: Brazil's attack revolves around a forward who turns loose attacking moments into goals. The note can point to penalty-area instinct and scoring range without inventing modern off-ball cues. His goals show importance, not exact movement detail.",
    chinese: "写1938年的Leônidas时，视角要放宽：巴西进攻围绕一名前锋展开，他能把松散的进攻机会变成进球。卡片可以强调禁区嗅觉和得分范围，但不应编出很现代的无球细节。他的七个进球是证据，具体跑动要写得克制。"
  }],
  ["Gary Lineker / England / 1986", {
    english: "Lineker's 1986 profile is clearest as a penalty-area scorer built on volume and timing in front of goal. Rather than describe hidden movement as observed fact, frame him around arriving ready when England create the next chance. That keeps it distinct from his later, penalty-heavy 1990 note.",
    chinese: "1986年的Gary Lineker，最清楚的身份是禁区终结者；这届赛事的重点在于门前机会数量和把握时机。不要把隐蔽跑动写成已观察到的事实，而应写成英格兰制造下一次机会时，他已经准备好完成终结。这样也能与1990年更偏点球和经验的一届区分开。"
  }],
  ["Karl-Heinz Rummenigge / West Germany / 1982", {
    english: "Rummenigge's 1982 note works best as a careful forward-role summary. He gives West Germany a senior scoring presence who can threaten the line and still connect with nearby support. Because the evidence is role-level, avoid exact triggers and describe the danger his profile adds.",
    chinese: "1982年的Karl-Heinz Rummenigge，适合写成谨慎的前锋角色说明。他为西德提供成熟的得分威胁，既能冲击防线，也能与身边队友衔接。由于证据仍是角色层面，不要断言具体触发动作；重点写他为进攻带来的威胁类型。"
  }],
  ["Johan Neeskens / Netherlands / 1974", {
    english: "Neeskens should not sound passive here. A better lens is the two-way midfielder in a Dutch side that asks midfielders to join attacks and still keep pressure around the ball. The card can mention tempo, but the main idea should be forward support, penalty threat and work after possession changes.",
    chinese: "1974年的Johan Neeskens不该显得被动。更好的观察重点，是荷兰体系中的双向中场：他要参与进攻，也要在球权转换后继续围住持球区域。卡片可以提到节奏，但主线应是前插支援、点球威胁和转换后的工作。"
  }],
  ["Teófilo Cubillas / Peru / 1970", {
    english: "Cubillas's 1970 note can stay close to the current idea: read him as an attacking midfielder finding pockets between midfield and defence. That position connects Peru's build-up to shots around the box. This already feels coherent and mainly needs the evidence level made explicit.",
    chinese: "1970年的Teófilo Cubillas可以保留现有方向：把他看作在中场与后防之间寻找空间的攻击型中场。关键在于这个位置如何把秘鲁的推进连接到禁区附近的射门。这个卡片本来就比较连贯，主要需要把证据层级说得更清楚。"
  }],
  ["Max Morlock / West Germany / 1954", {
    english: "Morlock's 1954 role is safest as a central forward profile inside West Germany's attack. He offers goal threat and a reference point near the centre, but the card should not pretend to know a repeated blindside pattern. Keep the focus on his scorer's presence rather than modern movement language.",
    chinese: "1954年的Max Morlock，最稳妥的写法是西德进攻中的中路前锋。他提供进球威胁和中路支点，但卡片不应假装掌握了反复出现的盲侧跑动模式。重点应放在他的射手存在感，而不是现代化的跑动术语。"
  }],
  ["Dražan Jerković / Yugoslavia / 1962", {
    english: "Jerković's 1962 note should be a restrained scorer profile. He can be read as a forward who finds central and channel spaces for finishes, but the evidence supports outcome and role more than precise movements. That makes the card cleaner and avoids overclaiming from limited historical material.",
    chinese: "1962年的Dražan Jerković，应写成克制的射手角色。他可以被理解为会在中路和肋部寻找终结空间的前锋，但现有证据更支持结果和角色，而不是精确跑动。这样写更干净，也避免从有限历史资料中过度推断。"
  }],
  ["Telmo Zarra / Spain / 1950", {
    english: "Zarra's 1950 card has a useful central-forward spine: he gives Spain a target, faces goal quickly and keeps the attack direct. Keep that sequence, but phrase it as a role lens rather than verified step-by-step behavior. The value is that the reader understands why he mattered near goal.",
    chinese: "1950年的Telmo Zarra已经有清楚的中锋主线：他为西班牙提供支点，快速面向球门，让进攻保持直接。可以保留这条顺序，但应写成角色视角，而不是逐步验证过的动作。它的价值在于让读者理解他为什么在门前重要。"
  }],
  ["Olivier Giroud / France / 2022", {
    english: "Giroud's 2022 role is best framed around France needing a central reference for crosses, layoffs and box attacks. He does not need an invented defender-glance cue. The safer card: watch how his presence fixes centre-backs and gives Mbappé, Griezmann and wide service a clear target.",
    chinese: "2022年的Olivier Giroud，最好从法国需要中路支点来写：他接应传中、做球，也攻击禁区。这里不需要编出防守者转头之类的细节。更稳妥的卡片应强调他的存在如何牵制中卫，并给姆巴佩、格列兹曼和边路传中一个明确目标。"
  }],
  ["Gary Lineker / England / 1990", {
    english: "Lineker's 1990 card should not repeat 1986. Here the safer difference is an experienced scorer in tighter matches, with penalty pressure part of the profile. Read him as England's reliable finisher when the chance is clear, rather than as the same open-play poacher described four years earlier.",
    chinese: "1990年的Gary Lineker不应重复1986年的写法。这里更稳妥的区别，是他作为经验更足的射手，在更胶着的比赛中承担得分责任，点球压力也是角色的一部分。应把他写成机会明确时英格兰可靠的终结者，而不是四年前同一套运动战抢点模板。"
  }],
  ["Emilio Butragueño / Spain / 1986", {
    english: "Butragueño's 1986 role can centre on finishing before defenders recover. The card should keep the idea of quick preparation in the box, but soften the certainty around exact movement. The useful reader takeaway is a forward who turns small openings into shots before the defence resets.",
    chinese: "1986年的Emilio Butragueño，可以围绕防守回位前完成终结来写。卡片可以保留禁区内快速准备射门的想法，但要降低对具体跑动的确定性。读者应带走的重点是：他能在防线重新站稳前，把小空当变成射门。"
  }],
  ["Leopoldo Luque / Argentina / 1978", {
    english: "Luque's 1978 card should read as a scorer in Argentina's forward line, not as another generic near-post runner. He gives the attack a direct penalty-area threat and a central outlet. Keep the movement language broad unless a match-specific source supports more.",
    chinese: "1978年的Leopoldo Luque，应写成阿根廷锋线中的射手，而不是又一个普通前点跑动者。他给进攻带来直接的禁区威胁和中路出口。除非有具体比赛资料支持，否则跑动语言要保持宽泛。"
  }],
  ["Rob Rensenbrink / Netherlands / 1978", {
    english: "Rensenbrink's 1978 note works better through left-sided penalty-area threat and composure than through a stock blindside template. The role-level evidence supports a forward who can arrive from wider areas and finish. Keep the claim about attacking value, not exact repeated cues.",
    chinese: "1978年的Rob Rensenbrink，与其套用盲侧跑动模板，不如写成左侧进入禁区的威胁和冷静终结。角色层面的证据支持他能从较宽位置进入得分区域，也能承担点球。重点应是进攻价值，而不是精确重复动作。"
  }],
  ["Agne Simonsson / Sweden / 1958", {
    english: "Simonsson's 1958 card should stay simple: Sweden use him as a forward who can give attacks a central finish. The evidence points to scorer impact and role, so the note should avoid precise defender-watching details. A broad penalty-area reading is more trustworthy.",
    chinese: "1958年的Agne Simonsson应保持简洁：瑞典把他作为能够在中路完成进攻的前锋使用。现有证据指向得分影响和角色，因此不应写具体观察防守者的细节。宽泛的禁区角色说明更可信。"
  }],
  ["Vavá / Brazil / 1958", {
    english: "Vavá's 1958 profile can mention channel work, but the stronger point is his penalty-area finishing inside Brazil's attack. Frame him as the forward who turns supply into goals while Pelé and Garrincha stretch the defence. That is more specific than another generic run-behind card.",
    chinese: "1958年的Vavá可以提到肋部活动，但更强的重点是他在巴西进攻中的禁区终结。可以把他写成把传球供应转化为进球的前锋，而贝利和加林查负责拉扯防线。这样比普通的身后跑动卡片更具体。"
  }],
  ["Silvio Piola / Italy / 1938", {
    english: "Piola's 1938 note should be historically cautious. He is a prolific central forward in the record, so describe his penalty-area presence and finishing role without assigning modern trigger actions. The goals support importance, not an exact sequence of movement.",
    chinese: "1938年的Silvio Piola要写得更谨慎。记录中他是高产的中路前锋，因此可以描述他的禁区存在感和终结角色，但不要分配现代化的触发动作。进球能证明重要性，却不能证明具体跑动顺序。"
  }],
  ["Oldřich Nejedlý / Czechoslovakia / 1934", {
    english: "Nejedlý's 1934 card should lean on what is safe: a high-impact scorer in Czechoslovakia's attack. The note can say he gives the team a forward who finds finishing positions, but it should not claim exact near-post or pull-wide behavior. Keep the language broad and evidence-aware.",
    chinese: "1934年的Oldřich Nejedlý，应依靠最稳妥的内容：他是捷克斯洛伐克进攻中影响很大的射手。卡片可以说他为球队提供能找到终结位置的前锋，但不应断言前点或拉边动作。语言要宽一些，也要体现证据边界。"
  }],
  ["Gheorghe Hagi / Romania / 1994", {
    english: "Hagi's 1994 card needs more personality: read him as Romania's left-footed creator and long-range threat, not a calm recycling midfielder. He shapes attacks by seeing the next pass or shot early. The copy should make him feel expressive while still avoiding unsupported match-by-match claims.",
    chinese: "1994年的Gheorghe Hagi需要更有个人特征：他应被写成罗马尼亚的左脚创造者和远射威胁，而不是普通控节奏中场。他通过提前看到下一脚传球或射门来塑造进攻。文案要有表现力，同时避免没有依据的逐场断言。"
  }],
  ["Tomas Brolin / Sweden / 1994", {
    english: "Brolin's 1994 card is one of the stronger role-level notes. Keep the central idea: he works between lines, links attacks and arrives near the box rather than staying fixed. The correction is mostly tonal: present it as a useful reading of his role, not a fully observed action log.",
    chinese: "1994年的Tomas Brolin是较强的角色层面卡片之一。可以保留主线：他在两线之间活动，连接进攻，并来到禁区附近，而不是固定在一个位置。需要修正的主要是语气：把它写成理解角色的有用方式，而不是完整观察记录。"
  }],
  ["Teófilo Cubillas / Peru / 1978", {
    english: "Cubillas's 1978 edition should differ from 1970. Read him as a more experienced attacking midfielder whose set-piece and scoring threat sit alongside tempo control. The role-level prose should say what to look for broadly, not reuse the younger between-lines profile.",
    chinese: "1978年的Teófilo Cubillas应与1970年区别开来。这里可以把他写成更成熟的攻击型中场：定位球和得分威胁与节奏控制并存。角色层面的文案应宽泛说明观察重点，而不是重复年轻时的两线之间活动。"
  }],
  ["Leonel Sánchez / Chile / 1962", {
    english: "Leonel Sánchez's 1962 note can stay on the left-sided attacker idea. He is best read as a forward who threatens from wider channels and arrives where chances can be finished. Keep the note concise and avoid turning that broad role into a precise repeated route.",
    chinese: "1962年的Leonel Sánchez可以保留左侧攻击手的方向。他最适合被理解为从较宽通道制造威胁、再进入能够终结机会的位置的前锋。卡片应简洁，不要把这个宽泛角色写成精确重复路线。"
  }],
  ["Valentin Ivanov / Soviet Union / 1962", {
    english: "Ivanov's 1962 card should describe a wide or inside-forward threat in broad terms. He can be read through movement from the flank into central lanes and a scorer's role for the Soviet Union. Avoid making the outside-to-inside pattern sound more exact than the evidence supports.",
    chinese: "1962年的Valentin Ivanov，应宽泛写成边路或内锋威胁。他可以被理解为从边路进入中路通道，并为苏联承担得分角色。不要把外线到内线的模式写得比证据更精确。"
  }],
  ["Kurt Hamrin / Sweden / 1958", {
    english: "Hamrin's 1958 profile is most useful as a wide scorer's card. He gives Sweden threat from the flank and can arrive away from the ball, but the note should not tack on unrelated carrying details. Keep the far-side scoring idea and let it stand.",
    chinese: "1958年的Kurt Hamrin，最有用的写法是边路射手。他从侧翼带来威胁，也能在远离球的一侧进入机会区域；但卡片不应硬接不相关的带球细节。保留弱侧得分威胁这个重点即可。"
  }],
  ["Hans Schäfer / West Germany / 1954", {
    english: "Schäfer's 1954 card can focus on width that turns into inside support. He gives West Germany an outside lane and then narrows when the attack needs another body near goal. Phrase this as a role tendency, not as a verified repeated action.",
    chinese: "1954年的Hans Schäfer，可以聚焦于从宽度转入内侧支援。他为西德提供外线通道，并在进攻需要禁区附近多一人时内收。这个写法应是角色倾向，而不是被验证的重复动作。"
  }],
  ["Nándor Hidegkuti / Hungary / 1954", {
    english: "Hidegkuti's 1954 role should be built around dropping away from centre-forward, not running beyond the line. He sits closer to midfield, draws defenders out and opens lanes for Puskás and Kocsis. That deep-lying forward idea is the historically important lens.",
    chinese: "1954年的Nándor Hidegkuti，核心应是从中锋位置回撤，而不是冲击防线身后。他更靠近中场接应，把防守者带出原位，并为普斯卡什和柯奇士打开线路。这个回撤中锋视角才是最重要的历史重点。"
  }],
  ["Neymar / Brazil / 2014", {
    english: "Neymar's 2014 note can keep the carrying lens, but make it less mechanical. Brazil's attack asks him to turn receiving moments into forward pressure, either by carrying at the next defender or combining before contact arrives. That is enough without a far-post action that feels unrelated.",
    chinese: "2014年的Neymar可以保留带球推进的视角，但要少一点机械感。巴西进攻常需要他把接球瞬间变成向前压力：要么带球冲向下一名防守者，要么在对抗到来前完成配合。这样已经足够，不必再硬接后点跑动。"
  }],
  ["Dennis Bergkamp / Netherlands / 1998", {
    english: "Bergkamp's 1998 profile should centre on receiving between lines and making the first touch matter. He links attacks, but the distinctive part is how one touch can create the next angle before pressure settles. Keep it role-level, but let the first-touch identity come through.",
    chinese: "1998年的Dennis Bergkamp，应围绕两线之间接球以及第一脚触球的价值来写。他能串联进攻，但更有辨识度的是：压力站稳前，他的一脚处理就能创造下一条线路。保持角色层面，同时让第一脚触球的个人特征显出来。"
  }],
  ["Andreas Brehme / West Germany / 1990", {
    english: "Brehme's 1990 note should combine wing-back balance with set-piece and penalty threat. He is not just a recovery runner. His value is that the left side carries both defensive responsibility and decisive attacking moments. Keep exact actions broad unless a match source supports them.",
    chinese: "1990年的Andreas Brehme，应把翼卫平衡与定位球、点球威胁放在一起写。他不只是回追球员；他的价值在于左路同时承担防守责任和决定性进攻时刻。除非有比赛资料支持，具体动作仍应写得宽泛。"
  }],
  ["Jan Ceulemans / Belgium / 1986", {
    english: "Ceulemans should not read like a quiet controller. A better 1986 lens is a powerful midfielder who gives Belgium forward running and penalty-area presence from deeper positions. Mention tempo only as part of how he joins attacks, not as the whole identity.",
    chinese: "1986年的Jan Ceulemans不该像安静的控球中场。更好的视角是：他作为有力量的中场，从较深位置为比利时提供前插和禁区存在感。节奏可以提，但只能作为他参与进攻的一部分，而不是全部身份。"
  }],
  ["Falcão / Brazil / 1982", {
    english: "Falcão's 1982 card can stay on central control, but it should feel less like a generated rewrite. He gives Brazil a midfielder who supports after passing, keeps angles open and can still arrive as a goal threat. That mix of rhythm and forward participation is the point.",
    chinese: "1982年的Falcão可以继续写中场控制，但不应像只是模板改写。他为巴西提供一种中场角色：出球后继续支援，保持接应角度，同时仍能前插形成得分威胁。节奏和向前参与的结合才是重点。"
  }],
  ["Rivellino / Brazil / 1974", {
    english: "Rivellino's 1974 note should make room for his left-footed threat. The safe reading is a midfielder who can connect possession and still change the attack with a pass or shot from range. Keep the phrasing vivid, but avoid pretending every action is edition-specific.",
    chinese: "1974年的Rivellino，应给他的左脚威胁留出空间。稳妥的理解是：他既能连接控球，也能用传球或远射改变进攻。文案可以更鲜明，但不要假装每个动作都被这届赛事逐一证明。"
  }],
  ["Amarildo / Brazil / 1962", {
    english: "Amarildo's 1962 card needs the tournament circumstance: he becomes important after Pelé's injury. Frame him as the forward who has to keep Brazil's attack direct and supplied near goal. That context is stronger than another generic run-behind note.",
    chinese: "1962年的Amarildo必须写出赛事处境：贝利受伤后，他变得重要。可以把他写成需要让巴西进攻继续保持直接、并在门前提供终结点的前锋。这个背景比普通身后跑动说明更有价值。"
  }],
  ["Flórián Albert / Hungary / 1962", {
    english: "Albert's 1962 note should not reduce him to a conventional runner. A safer role lens is an intelligent forward who can connect play and move into scoring positions for Hungary. Keep the card broad enough for role-level evidence while giving him more craft than a generic striker.",
    chinese: "1962年的Flórián Albert不应被简化成普通冲刺型前锋。更稳妥的角色视角是：他是聪明的前锋，既能连接进攻，也能进入匈牙利的得分位置。卡片要符合角色层面证据，同时保留比普通中锋更多的技术感。"
  }],
  ["Oscar Míguez / Uruguay / 1950", {
    english: "Míguez's 1950 profile works as a central target-forward note. He gives Uruguay a presence who can occupy defenders and keep attacks alive near goal. Keep that strong central idea, but avoid overly exact claims about how each defender is moved.",
    chinese: "1950年的Oscar Míguez，作为中路支点前锋的写法是成立的。他为乌拉圭提供能够牵制防守者、并让门前进攻延续下去的存在。可以保留这个强主线，但不要过度精确地描述每名防守者如何被带动。"
  }],
  ["Angelo Schiavio / Italy / 1934", {
    english: "Schiavio's 1934 card should be more careful than the previous rewrite. The safe note is that he serves as a central Italian scoring reference, with the record supporting his importance near goal. Avoid assigning detailed movement patterns to sparse historical evidence.",
    chinese: "1934年的Angelo Schiavio要比之前写得更谨慎。稳妥的说明是：他是意大利中路的得分参照，记录能支持他在门前的重要性。不要在历史资料有限时给他安排过细的跑动模式。"
  }],
  ["Luis Suárez / Uruguay / 2010", {
    english: "Suárez's 2010 card should feel sharper than a tidy channel-runner note. Uruguay use him as a restless forward who can attack space, combine with Forlán and turn loose moments into shots. Keep the role-level caution, but let the edge of his game show.",
    chinese: "2010年的Luis Suárez，应比整齐的肋部跑动卡片更锋利。乌拉圭使用的是一名持续制造压力的前锋：他能冲击空间、与弗兰配合，也能把松散局面变成射门。仍要保持角色层面的谨慎，但他的侵略性应显出来。"
  }],
  ["Michael Ballack / Germany / 2002", {
    english: "Ballack's 2002 card should not sound like a calm possession recycler. He is better read as Germany's forceful midfield driver: arriving beyond the ball, adding goal threat and carrying responsibility in both directions. The role-level wording can stay cautious while making the profile stronger.",
    chinese: "2002年的Michael Ballack不应像冷静回收球权的中场。他更适合被写成德国有力量的中场推进者：会前插到球前，增加进球威胁，也在攻防两端承担责任。角色层面的语气可以保留，但人物轮廓要更强。"
  }],
  ["Brian Laudrup / Denmark / 1998", {
    english: "Brian Laudrup's 1998 note should lean into carrying and creative progression. A safe lens is a forward who starts from wider or support spaces, drives at defenders and turns that pressure into the next pass or shot. That gives the card more identity than generic second-forward movement.",
    chinese: "1998年的Brian Laudrup，应更强调带球推进和创造性向前。稳妥的视角是：他从较宽或支援位置起步，带球冲向防守者，并把这种压力变成下一脚传球或射门。这样比普通影锋跑动更有辨识度。"
  }],
  ["Pelé / Brazil / 1962", {
    english: "Pelé's 1962 card needs a sample-size caveat. Treat it as an early-tournament glimpse before injury cut his campaign short: he could still connect attacks quickly and give Brazil a forward reference. Do not present it as a full-tournament pattern.",
    chinese: "1962年的Pelé必须加上样本限制。这更像是受伤前的早期赛事片段：他仍能快速连接进攻，并为巴西提供前场参照。不要把它写成整届赛事反复出现的完整模式。"
  }],
  ["Diego Maradona / Argentina / 1994", {
    english: "Maradona's 1994 note has to include the abrupt ending. In the matches he did play, Argentina still looked to him for rhythm and the next forward connection, but his tournament stopped after the drug-test case. Read it as a brief, interrupted role, not a settled campaign profile.",
    chinese: "1994年的Diego Maradona必须写出突然中断的背景。在他出场的比赛里，阿根廷仍依靠他掌控节奏并连接下一次向前推进；但药检事件后，他的世界杯提前结束。这里应写成短暂且被打断的角色，而不是完整稳定的一届赛事。"
  }],
  ["Cristiano Ronaldo / Portugal / 2006", {
    english: "Ronaldo's 2006 edition should read as the young wide attacker. The useful lens is speed, direct one-on-one pressure and service from wide areas, with far-post arriving only a secondary idea. Keep it different from the later cards by making this one about wing threat and development.",
    chinese: "2006年的Cristiano Ronaldo应写成年轻边路攻击手。观察重点是速度、直接一对一压力和边路传中，后点包抄只能是次要内容。为了区别后来的版本，这里要写成边路威胁和成长阶段。"
  }],
  ["Cristiano Ronaldo / Portugal / 2010", {
    english: "Ronaldo's 2010 card should move away from the 2006 winger template. Portugal use him as a freer attacking star who can begin wide, drift inside and turn possession into his own shot. The safe distinction is greater central responsibility, not the same far-post movement.",
    chinese: "2010年的Cristiano Ronaldo应离开2006年的纯边锋模板。葡萄牙把他作为更自由的进攻核心使用：他可以从边路起步，向内移动，并把球权转化成自己的射门。稳妥的区别是中路责任更重，而不是重复同样的后点跑动。"
  }],
  ["Cristiano Ronaldo / Portugal / 2014", {
    english: "Ronaldo's 2014 card needs to acknowledge a narrower, more constrained tournament. Read him as Portugal's main finishing reference, often looking for the quickest route to goal rather than constant wing creation. That makes this edition separate from both 2006 and 2010.",
    chinese: "2014年的Cristiano Ronaldo需要写出更收窄、也更受限制的一届赛事。可以把他看作葡萄牙主要的终结参照，常常寻找最快通向球门的方式，而不是持续的边路创造。这样才能与2006年和2010年区分开。"
  }],
  ["Miroslav Klose / Germany / 2010", {
    english: "Klose's 2010 role can centre on selfless centre-forward work. Germany need him to occupy defenders, connect simple passes and then arrive for finishes when the move continues. The phrasing should describe the role directly, without saying the card or profile has a shape.",
    chinese: "2010年的Miroslav Klose，可以围绕无私的中锋工作来写。德国需要他牵制防守者、完成简单衔接，并在进攻延续后进入终结位置。文案应直接描述角色，不要说什么卡片或资料如何展开。"
  }],
  ["Roberto Baggio / Italy / 1990", {
    english: "Baggio's 1990 edition should feel like emergence. He can be read as a creative forward who pauses just enough to open a shooting or passing angle, but the note should stay cautious. The point is a glimpse of invention, not the same late-career profile used for 1998.",
    chinese: "1990年的Roberto Baggio应有初露锋芒的感觉。可以把他理解为创造型前锋：他会稍作停顿，为射门或传球打开角度，但语气仍要谨慎。重点是一种创造力的显现，而不是套用1998年的成熟后期版本。"
  }],
  ["Roberto Baggio / Italy / 1998", {
    english: "Baggio's 1998 note should sound like a veteran attacking option. He is no longer just an emerging creator. The useful lens is economy, timing and making limited attacking moments count. Keep it separate from 1990 by stressing experience and selective impact.",
    chinese: "1998年的Roberto Baggio应像一名老练的进攻选择。他不再只是初露锋芒的创造者；更有用的视角是处理简洁、时机准确，并让有限的进攻时刻产生效果。通过经验和选择性影响，把它与1990年区分开。"
  }],
  ["Franz Beckenbauer / West Germany / 1970", {
    english: "Beckenbauer's 1970 note should not be bland support-after-passing copy. Read him as the defender-midfielder who can step into possession and keep West Germany connected from behind. The card can stay role-level, but the libero identity needs to come through.",
    chinese: "1970年的Franz Beckenbauer不应只是平淡的出球后支援。应把他写成能带球进入中场、从后方保持西德连贯性的后卫型组织者。卡片可以保持角色层面，但清道夫式身份必须显出来。"
  }],
  ["Jairzinho / Brazil / 1974", {
    english: "Jairzinho's 1974 card should be cautious because the strongest identity comes from his 1970 peak. Here, read him as a returning wide forward whose value is still direct running and scoring threat, but avoid importing the full 1970 pattern as if it were proven again.",
    chinese: "1974年的Jairzinho需要谨慎，因为最强的个人标签来自1970年的巅峰表现。这里可以把他写成再次参赛的边路前锋，价值仍在直接冲击和得分威胁，但不要把1970年的完整模式当作这届赛事已被证明的内容。"
  }],
  ["Mario Kempes / Argentina / 1974", {
    english: "Kempes's 1974 note should feel like an early chapter. With no goal return in this edition, avoid writing him as the fully formed 1978 finisher. A safer card says Argentina use him as a forward presence and runner, while the decisive World Cup version comes later.",
    chinese: "1974年的Mario Kempes应像早期章节。既然这届没有进球，不要把他写成1978年那个成熟终结者。更稳妥的卡片应说阿根廷把他作为前场存在和跑动点使用，而决定性的世界杯版本会在后来出现。"
  }],
  ["Sócrates / Brazil / 1986", {
    english: "Sócrates's 1986 card should read through midfield combinations and late attacking support, not a vague 'clear task.' A cautious lens is how he helps Brazil connect through short passes while still carrying scoring threat from midfield. Keep the claim broad and natural.",
    chinese: "1986年的Sócrates，应从中场配合和后插上支援来理解，而不是写成含糊的“明确任务”。谨慎的视角是：他通过短传帮助巴西衔接进攻，同时仍从中场带来得分威胁。表述要宽泛、自然。"
  }],
  ["Michel Platini / France / 1978", {
    english: "Platini's 1978 card should be the earlier version: a young French attacking midfielder beginning to connect midfield to the forward line. Keep the between-lines idea, but present it as an emerging role and do not copy the fuller 1982 profile.",
    chinese: "1978年的Michel Platini应是较早期版本：年轻的法国攻击型中场，开始把中场与锋线连接起来。可以保留两线之间的想法，但要写成逐渐成形的角色，不能复制更完整的1982版本。"
  }],
  ["Michel Platini / France / 1982", {
    english: "Platini's 1982 card needs the stronger central thesis. France's attack runs more clearly through him: he finds space between lines, sets the rhythm and adds scoring threat. Unlike 1978, this should read as the tournament where the playmaking role becomes the main frame.",
    chinese: "1982年的Michel Platini需要更强的中心论点。法国进攻更明显地围绕他运转：他在两线之间找空间，设定节奏，也带来得分威胁。与1978年不同，这里应读起来像组织核心角色真正成为主框架的一届。"
  }],
  ["Lothar Matthäus / West Germany / 1986", {
    english: "Matthäus's 1986 card should stress energy and two-way support. He can connect after passing, but the better role-level lens is a midfielder who keeps moving between defensive work and forward runs. Avoid making him sound slower or safer than the profile deserves.",
    chinese: "1986年的Lothar Matthäus应强调活力和双向支援。他可以出球后继续衔接，但更好的角色视角是：他在防守工作和前插之间不断移动。不要把他写得比实际轮廓更慢、更保守。"
  }],
  ["Lothar Matthäus / Germany / 1994", {
    english: "Matthäus's 1994 card should feel older and more managerial. He still supports possession, but the safer distinction is experience: choosing when to recycle, when to hold shape and when to step forward. That separates it from the more mobile 1986 reading.",
    chinese: "1994年的Lothar Matthäus应有更老练、更像场上管理者的感觉。他仍会支援控球，但更稳妥的区别是经验：什么时候回收，什么时候保持阵型，什么时候向前。这样能与1986年更机动的版本区分开。"
  }],
  ["Roger Milla / Cameroon / 1982", {
    english: "Milla's 1982 card should be the pre-breakout edition. He is part of Cameroon's forward structure, but the note should not borrow the 1990 impact-sub identity or later mythology. Keep it modest: a role-level forward presence before the famous tournament arrives.",
    chinese: "1982年的Roger Milla应是成名爆发前的版本。他是喀麦隆锋线结构的一部分，但卡片不应借用1990年的超级替补身份或后来传奇。保持克制：这是著名一届到来前的角色层面前锋存在。"
  }],
  ["Roger Milla / Cameroon / 1990", {
    english: "Milla's 1990 card must be shaped by impact-sub status. The useful lens is not a normal starter's run pattern, but a veteran forward changing matches from the bench by attacking unsettled defenders and finishing quickly. That is the edition users expect to feel.",
    chinese: "1990年的Roger Milla必须围绕超级替补身份来写。观察重点不是普通首发前锋的跑动模式，而是一名老将替补登场，冲击尚未站稳的防守者并快速完成终结。这才是用户期待读到的那一届。"
  }],
  ["Roger Milla / Cameroon / 1994", {
    english: "Milla's 1994 note should be about a brief, late-career impact rather than the same 1990 profile. He remains an impact substitute and scorer, but the card should frame the role as limited and historic. Do not reuse the normal run-behind language.",
    chinese: "1994年的Roger Milla，应写成职业生涯后期的短暂影响，而不是重复1990年的完整形象。他仍是替补冲击点和进球者，但卡片要把角色写成有限而具有历史意味。不要再使用普通身后跑动语言。"
  }],
  ["Davor Šuker / Croatia / 2002", {
    english: "Šuker's 2002 card should acknowledge that the strongest evidence comes from his 1998 identity. In this edition, keep the claim limited: Croatia still have a striker associated with separation and finishing, but the tournament impact is narrower. That prevents the card from overselling the role.",
    chinese: "2002年的Davor Šuker应承认最强证据来自他1998年的身份。这一届应限制说法：克罗地亚仍拥有一名以拉开空间和终结著称的前锋，但赛事影响更窄。这样可以避免卡片过度拔高。"
  }],
  ["Xavi / Spain / 2002", {
    english: "Xavi's 2002 card should be an early-career note, not a retroactive 2010 profile. As an impact substitute, the safe lens is a young central midfielder offering control and short passing in limited minutes. Keep the later master-controller identity out of this edition.",
    chinese: "2002年的Xavi应是早期职业生涯说明，而不是倒套2010年的成熟形象。作为替补影响点，稳妥的视角是：年轻中场在有限时间里提供控球和短传衔接。不要把后来大师级控制者的身份放进这一届。"
  }],
  ["Andrés Iniesta / Spain / 2014", {
    english: "Iniesta's 2014 card should avoid the winger template. Spain still look to him for interior control and combination play, but this is a post-peak tournament rather than the 2010 final role. Read him through midfield connection, not outside-to-inside forward movement.",
    chinese: "2014年的Andrés Iniesta应避开边锋模板。西班牙仍依靠他在内侧区域控制和配合，但这已经不是2010年决赛那个巅峰角色。应从中场连接来理解他，而不是写成外线内切的前锋跑动。"
  }],
  ["Andrés Iniesta / Spain / 2018", {
    english: "Iniesta's 2018 note should differ from 2014 by stressing reduced, selective influence. He remains a connector when Spain need calm possession, but the role is more limited and late-career. Keep the card about control in chosen moments, not repeated wing movement.",
    chinese: "2018年的Andrés Iniesta应与2014年不同，强调影响更有限、更有选择性。当西班牙需要冷静控球时，他仍是连接点，但角色已经更偏后期和局部。卡片应写关键时段的控制，而不是重复边路跑动。"
  }],
  ["David Villa / Spain / 2014", {
    english: "Villa's 2014 card should be a late-Spain note. He can still offer finishing instincts from the left or centre, but the tournament role is narrower than his 2010 peak. A cautious framing around limited scoring impact is better than a full recurring-role import.",
    chinese: "2014年的David Villa应写成西班牙后期角色。他仍能从左路或中路提供终结本能，但这一届的角色比2010年巅峰更窄。围绕有限的得分影响谨慎表述，比完整套用旧角色更好。"
  }],
  ["Wesley Sneijder / Netherlands / 2014", {
    english: "Sneijder's 2014 card is one of the better recurring-context notes. Keep the idea that he scans before receiving and can release runners beyond pressure, but make the wording more natural. The useful distinction is veteran creation from midfield, not generic tempo control.",
    chinese: "2014年的Wesley Sneijder是较好的跨届背景卡片之一。可以保留接球前观察、把跑动队友送过压力线的想法，但语言要更自然。这里有用的区别是老练的中场创造，而不是普通节奏控制。"
  }],
  ["Thomas Müller / Germany / 2018", {
    english: "Müller's 2018 card should not reuse his best-years movement profile. Germany still use him as an experienced attacking reference, but the tournament is limited and blunt compared with earlier editions. Write it as a role-level, post-peak presence rather than classic Müller space-finding.",
    chinese: "2018年的Thomas Müller不应重复他巅峰时期的跑位形象。德国仍把他作为有经验的前场参照，但这一届影响有限，也不如早期锋利。应写成角色层面的后巅峰存在，而不是经典穆勒式找空间。"
  }],
  ["Antoine Griezmann / France / 2014", {
    english: "Griezmann's 2014 card should be the young forward version. France use him as a mobile attacker who can find channels around the striker, but the note should not borrow the 2022 midfield identity. Keep it light, role-level and clearly early-career.",
    chinese: "2014年的Antoine Griezmann应是年轻前锋版本。法国把他作为机动攻击手使用，他能在中锋周围寻找通道，但卡片不应借用2022年的中场身份。保持轻量、角色层面，并明确这是早期阶段。"
  }],
  ["Antoine Griezmann / France / 2022", {
    english: "Griezmann's 2022 role is about switching between playmaking and defensive work from a deeper midfield position. When France lose the ball, he helps close the nearest outlet. When they recover it, he moves into space to connect the next attack. That transition frame replaces the old recovery wording.",
    chinese: "2022年的Antoine Griezmann，重点是他在更深的中场位置上切换组织和防守工作。法国丢球时，他会帮助封住最近的出球点；重新夺回球权后，他再移动到空当中连接下一次进攻。这个攻防转换视角应取代前后矛盾的“夺回球后”说法。"
  }],
  ["Bobby Charlton / England / 1958", {
    english: "Charlton was selected for England's 1958 World Cup squad but did not play. The note should not describe on-field movement from that tournament. His World Cup playing story begins four years later, when he is an established England attacker in Chile.",
    chinese: "Bobby Charlton入选了英格兰1958年世界杯名单，但没有出场。这里不应描述他在那届赛事中的场上跑动。他真正的世界杯出场故事，要到四年后的智利才开始，那时他已经是英格兰成熟的进攻球员。"
  }],
  ["Bobby Charlton / England / 1962", {
    english: "Charlton's 1962 card should stand apart from the unused 1958 squad note. Here he is finally part of England's World Cup side on the pitch, bringing forward running and midfield-to-attack connection. Keep the role broad, but make clear this is the playing chapter.",
    chinese: "1962年的Bobby Charlton应与1958年未出场的名单卡区分开。这里他终于在世界杯赛场上进入英格兰阵容，带来向前跑动以及中场到进攻的连接。角色可以写得宽泛，但必须说明这是实际出场的一章。"
  }],
  ["Geoff Hurst / England / 1970", {
    english: "Hurst's 1970 card should be careful because his strongest World Cup identity comes from 1966. In this edition, read him as England's experienced central striker option, still able to give the attack a box reference. Do not import the whole 1966 final profile.",
    chinese: "1970年的Geoff Hurst需要谨慎，因为他最强的世界杯身份来自1966年。这一届可以把他写成英格兰有经验的中锋选择，仍能为进攻提供禁区参照。不要把1966年决赛的完整形象搬过来。"
  }],
  ["Garrincha / Brazil / 1966", {
    english: "Garrincha's 1966 card can keep chance creation and scoring threat, but it needs caution. This is a later, less complete edition than his 1958 and 1962 peaks. Read him as a returning wide creator whose reputation and flashes of threat remain, not as the full peak version.",
    chinese: "1966年的Garrincha可以保留创造机会和得分威胁，但必须谨慎。这已经是晚于1958和1962巅峰的版本，并不完整。应把他写成再次参赛的边路创造者：声望和局部威胁仍在，但不是完整巅峰版本。"
  }],
  ["Zico / Brazil / 1978", {
    english: "Zico's 1978 card should not make him sound like a conventional striker. A safer lens is a creative Brazilian attacker who looks for pockets near midfield and the box, with set-piece and penalty threat part of the profile. Keep him technical, not generic.",
    chinese: "1978年的Zico不应像普通中锋。更稳妥的视角是：他是巴西的创造型攻击手，会在中场附近和禁区周围寻找空间，定位球和点球威胁也是角色的一部分。要写出技术型特征，而不是普通模板。"
  }],
  ["Careca / Brazil / 1986", {
    english: "Careca's 1986 card should be the sharper scoring version. Brazil use him as a forward who attacks central spaces and turns service into goals. Keep the role-level caution, but let the five-goal tournament separate it from 1990.",
    chinese: "1986年的Careca应是更锋利的得分版本。巴西把他作为冲击中路空间、把传球转化为进球的前锋使用。保持角色层面的谨慎，但要让五球表现把它与1990年区分开。"
  }],
  ["Careca / Brazil / 1990", {
    english: "Careca's 1990 card should be narrower than 1986. He remains Brazil's central forward and scoring outlet, but the tournament impact is smaller. Write the note as a continuation with reduced output, not as the same five-goal striker profile.",
    chinese: "1990年的Careca应比1986年更收窄。他仍是巴西的中路前锋和得分出口，但赛事影响更小。卡片应写成延续但产出降低的一届，而不是重复五球射手形象。"
  }],
  ["Gabriel Batistuta / Argentina / 1994", {
    english: "Batistuta's 1994 edition should introduce the World Cup scorer profile. Argentina have a direct centre-forward who can turn service into goals quickly, including under penalty pressure. This is the first chapter, not a copy of the later editions.",
    chinese: "1994年的Gabriel Batistuta应介绍他的世界杯射手形象。阿根廷拥有一名直接的中锋，能迅速把传球供应转化为进球，也能承担点球压力。这是第一章，而不是后来几届的复制。"
  }],
  ["Gabriel Batistuta / Argentina / 1998", {
    english: "Batistuta's 1998 card should feel like the peak World Cup scoring version. The role is still direct centre-forward play, but the emphasis is repeated finishing impact and ruthless penalty-area work. Keep it distinct from 1994 by making the profile more established.",
    chinese: "1998年的Gabriel Batistuta应像世界杯得分能力的高峰版本。角色仍是直接中锋，但重点是持续的终结影响和冷酷的禁区工作。通过更成熟、更稳定的射手形象，把它与1994年区分开。"
  }],
  ["Gabriel Batistuta / Argentina / 2002", {
    english: "Batistuta's 2002 card should be a late-career, limited-impact note. Argentina still have his centre-forward presence, but the role is not the same as the explosive 1994 or 1998 versions. The card should acknowledge the reduced tournament return.",
    chinese: "2002年的Gabriel Batistuta应写成职业后期、影响更有限的一届。阿根廷仍拥有他的中锋存在感，但这已经不是1994或1998年那种爆发版本。卡片应承认赛事回报下降。"
  }],
  ["Jürgen Klinsmann / Germany / 1994", {
    english: "Klinsmann's 1994 note can focus on mobile centre-forward scoring. Germany use him as a runner and finisher who keeps attacking the box through the match. Keep the role-level evidence visible, but let the high goal return shape this edition.",
    chinese: "1994年的Jürgen Klinsmann，可以围绕机动中锋得分来写。德国把他作为持续冲击禁区的跑动者和终结者使用。保持角色层面证据的边界，但让高进球产出定义这一届。"
  }],
  ["Jürgen Klinsmann / Germany / 1998", {
    english: "Klinsmann's 1998 card should be the veteran version. The forward movement remains, but the better distinction is experience: choosing moments, leading the line and still finding goals late in his international career. Do not reuse the 1994 card with a different opening.",
    chinese: "1998年的Jürgen Klinsmann应是老将版本。前锋跑动仍在，但更好的区别是经验：选择时机、领衔锋线，并在国家队生涯后期继续取得进球。不要只把1994年的卡片换个开头。"
  }]
]);

if (FOCUSED_HISTORICAL_CORRECTION_COPY.size !== FOCUSED_HISTORICAL_STYLE_POLISH_PROFILE_KEYS.size) {
  throw new Error("Focused historical correction copy must cover exactly the two reviewed 40-card batches.");
}

export const FOCUSED_HISTORICAL_CORRECTION_PROFILE_KEYS = Object.freeze([
  ...FOCUSED_HISTORICAL_CORRECTION_COPY.keys()
]);

function buildFirstFocusedHistoricalStylePolish(profile, primary, first, second, supportRelation) {
  if (!FIRST_FOCUSED_HISTORICAL_STYLE_POLISH_PROFILE_KEYS.has(profile.profileKey)) return null;

  const name = profile.displayName || profile.name;
  const edition = profile.tournamentYear || "this tournament";
  const variantIndex = stableHash(profile.profileKey) % 3;
  const english = supportRelation === "reinforces-headline"
    ? [
        `For ${name} in ${edition}, start with ${primary.en}. ${name} ${first.en}. The same idea appears when he ${second.en}.`,
        `To follow ${name} in ${edition}, begin with ${primary.en}. He ${first.en}. The same thread continues in another phase when he ${second.en}.`,
        `Watch the ${edition} details around ${name}: ${primary.en}. He ${first.en}. The same idea matters when he ${second.en}.`
      ][variantIndex]
    : [
        `For ${name} in ${edition}, start with ${primary.en}. Notice how he ${first.en}. Separately, he ${second.en}.`,
        `The first thing to track with ${name} in ${edition} is ${primary.en}. Notice how he ${first.en}. Beyond that, he ${second.en}.`,
        `To follow ${name} in ${edition}, start with ${primary.en}. Look at how he ${first.en}. Also note how he ${second.en}.`
      ][variantIndex];
  const chinese = supportRelation === "reinforces-headline"
    ? [
        `${edition}年的${name}，观察重点是${primary.zh}。观察他如何${first.zh}。这一特点也能从下一项动作看出：他会${second.zh}。`,
        `观察${edition}年的${name}时，重点是${primary.zh}。他会${first.zh}。换一个阶段，同样可以看到他会${second.zh}。`,
        `理解${edition}年的${name}的场上工作，重点是${primary.zh}。观察他如何${first.zh}。同样可以看到他会${second.zh}。`
      ][variantIndex]
    : [
        `${edition}年的${name}，观察重点是${primary.zh}。观察他如何${first.zh}。另外，他会${second.zh}。`,
        `观察${edition}年的${name}时，可以留意${primary.zh}。一处细节是：他会${first.zh}。除此之外，他会${second.zh}。`,
        `要理解${edition}年的${name}，可以观察${primary.zh}。第一处动作是：他会${first.zh}。另一处表现是${second.zh}。`
      ][variantIndex];
  return { english, chinese };
}

function buildSecondFocusedHistoricalStylePolish(profile, primary, first, second, supportRelation) {
  if (!SECOND_FOCUSED_HISTORICAL_STYLE_POLISH_PROFILE_KEYS.has(profile.profileKey)) return null;

  const name = profile.displayName || profile.name;
  const short = shortName(profile);
  const sentenceName = upperFirst(short);
  const edition = profile.tournamentYear || "this tournament";
  const variantIndex = stableHash(`${profile.profileKey}:focused-style-batch-2`) % 8;
  const english = supportRelation === "reinforces-headline"
    ? [
        `${possessive(name)} ${edition} profile is built around ${primary.en}. ${sentenceName} ${first.en}. The same thread continues when he ${second.en}.`,
        `For ${name} in ${edition}, the cue is ${primary.en}. One clue is how he ${first.en}. Another clue is how he ${second.en}.`,
        `${name} in ${edition} is easiest to follow through ${primary.en}. He ${first.en}. That pattern returns when he ${second.en}.`,
        `A useful way to read ${name} in ${edition} is ${primary.en}. Track how he ${first.en}. The same reading returns when he ${second.en}.`,
        `${possessive(name)} ${edition} role is built around ${primary.en}. One useful sign is how he ${first.en}. The same quality appears when he ${second.en}.`,
        `For ${name} in ${edition}, ${primary.en} is the thread. ${sentenceName} ${first.en}. The same thread continues when he ${second.en}.`,
        `Watch ${name} in ${edition} for ${primary.en}. One clue is how he ${first.en}. Another appears when he ${second.en}.`,
        `${name} in ${edition} is easiest to understand through ${primary.en}. One clue is how he ${first.en}. Another clue is how he ${second.en}.`
      ][variantIndex]
    : [
        `${possessive(name)} ${edition} profile is built around ${primary.en}. ${sentenceName} ${first.en}. Separately, he ${second.en}.`,
        `For ${name} in ${edition}, first look at ${primary.en}. One detail is how he ${first.en}. A separate responsibility is how he ${second.en}.`,
        `${name} in ${edition} is useful to watch for ${primary.en}. He ${first.en}. In a separate phase, he ${second.en}.`,
        `A useful way to read ${name} in ${edition} is ${primary.en}. Track how he ${first.en}. Beyond that, he ${second.en}.`,
        `${possessive(name)} ${edition} role starts from ${primary.en}. One useful sign is how he ${first.en}. A different clue is how he ${second.en}.`,
        `For ${name} in ${edition}, look for ${primary.en}. ${sentenceName} ${first.en}. Separately, he ${second.en}.`,
        `Watch ${name} in ${edition} for ${primary.en}. One detail is how he ${first.en}. Another detail is how he ${second.en}.`,
        `${name} in ${edition} is easiest to understand through ${primary.en}. One detail is how he ${first.en}. Beyond that, he ${second.en}.`
      ][variantIndex];
  const chinese = supportRelation === "reinforces-headline"
    ? [
        `${edition}年的${name}，先看${primary.zh}。他会${first.zh}。同一特点也能从另一项动作看出：他会${second.zh}。`,
        `理解${edition}年的${name}，先看${primary.zh}。第一处线索是他会${first.zh}。相同线索也来自他会${second.zh}。`,
        `${edition}年的${name}，重点可以落在${primary.zh}。他会${first.zh}。同一思路也延续到另一项动作：他会${second.zh}。`,
        `看${edition}年的${name}，观察重点是${primary.zh}。可以追踪他如何${first.zh}。同一特点也体现在另一项动作中：他会${second.zh}。`,
        `${edition}年的${name}，角色重点是${primary.zh}。一个明显特点是他会${first.zh}。同样可以看到他会${second.zh}。`,
        `${edition}年的${name}，主线是${primary.zh}。他会${first.zh}。这一特点也延续到他会${second.zh}。`,
        `观察${edition}年的${name}，最清楚的方式是看${primary.zh}。留意他如何${first.zh}。同一特点也体现在他会${second.zh}。`,
        `${edition}年的${name}，可以围绕${primary.zh}来理解。一个线索是他会${first.zh}。相同线索是他会${second.zh}。`
      ][variantIndex]
    : [
        `${edition}年的${name}，清楚的任务是${primary.zh}。他会${first.zh}。另外，他会${second.zh}。`,
        `理解${edition}年的${name}，可以留意${primary.zh}。一处细节是他会${first.zh}。另外，他会${second.zh}。`,
        `${edition}年的${name}，适合观察${primary.zh}。他会${first.zh}。在另一部分，他会${second.zh}。`,
        `看${edition}年的${name}，观察重点是${primary.zh}。可以追踪他如何${first.zh}。除此之外，他会${second.zh}。`,
        `${edition}年的${name}，角色先看${primary.zh}。一个明显特点是他会${first.zh}。另一处表现是${second.zh}。`,
        `${edition}年的${name}，可以留意${primary.zh}。他会${first.zh}。另外，他会${second.zh}。`,
        `观察${edition}年的${name}，第一步是看${primary.zh}。留意他如何${first.zh}。另一处表现是${second.zh}。`,
        `${edition}年的${name}，可以围绕${primary.zh}来理解。一个线索是他会${first.zh}。另一处表现是他会${second.zh}。`
      ][variantIndex];
  return { english, chinese };
}

function buildFocusedHistoricalStylePolish(profile, primary, first, second, supportRelation) {
  const correctionCopy = FOCUSED_HISTORICAL_CORRECTION_COPY.get(profile.profileKey);
  if (correctionCopy) {
    return {
      english: correctionCopy.english,
      chinese: correctionCopy.chinese
    };
  }

  return buildFirstFocusedHistoricalStylePolish(profile, primary, first, second, supportRelation)
    || buildSecondFocusedHistoricalStylePolish(profile, primary, first, second, supportRelation);
}

const GENERIC_ROLE_SKILL_REPLACEMENTS = new Map([
  ["Goalkeeper", "Shot stopping"],
  ["Defender", "Physical duels"],
  ["Midfielder", "Tempo control"],
  ["Forward", "Runs in behind"]
]);

function refinedSkills(profile, fact = null) {
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  return [...new Set(skills
    .map((skill) => GENERIC_ROLE_SKILL_REPLACEMENTS.get(skill) || skill)
    .filter((skill) => {
      if (skill !== "Penalty pressure" || !fact) return Boolean(skill);
      return hasConvertedPenaltyEvidence(fact) || !hasMissedShootoutEvidence(fact);
    })
    .filter(Boolean))];
}

function listItems(items, limit = 2) {
  const clean = [...new Set(items.filter(Boolean))].slice(0, limit);
  if (!clean.length) return "";
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join(", ")} and ${clean.at(-1)}`;
}

function listItemsZh(items, limit = 2) {
  const clean = [...new Set(items.filter(Boolean))].slice(0, limit);
  if (!clean.length) return "";
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join("、")}和${clean.at(-1)}`;
}

function fixtureTeams(fixture) {
  return {
    home: fixture.homeSlot,
    away: fixture.awaySlot
  };
}

function opponentName(fixture, side) {
  const teams = fixtureTeams(fixture);
  return side === "home" ? teams.away : teams.home;
}

function teamScore(fixture, side) {
  const score = fixture.score || {};
  return Number(score[side]);
}

function opponentScore(fixture, side) {
  return teamScore(fixture, side === "home" ? "away" : "home");
}

function resultPhrase(fixture, side, teamName) {
  const scoreFor = teamScore(fixture, side);
  const scoreAgainst = opponentScore(fixture, side);
  const scoreText =
    Number.isFinite(scoreFor) && Number.isFinite(scoreAgainst) ? `${scoreFor}-${scoreAgainst}` : "";
  const winner = fixture.winner || "";
  const won = normalizeTeamName(winner) === normalizeTeamName(teamName);
  const lost = winner && normalizeTeamName(winner) !== normalizeTeamName(teamName) && !/^draw$/i.test(winner);
  const outcome = won ? "win" : lost ? "loss" : "draw";
  const penalties = fixture.scoreDetails?.penalties;

  if (penalties && Number.isFinite(Number(penalties.home)) && Number.isFinite(Number(penalties.away))) {
    const pensFor = side === "home" ? penalties.home : penalties.away;
    const pensAgainst = side === "home" ? penalties.away : penalties.home;
    return `${scoreText} shootout ${outcome}, ${pensFor}-${pensAgainst} pens`;
  }

  return scoreText ? `${scoreText} ${outcome}` : outcome;
}

function resultPhraseZh(fixture, side, teamName) {
  const scoreFor = teamScore(fixture, side);
  const scoreAgainst = opponentScore(fixture, side);
  const scoreText =
    Number.isFinite(scoreFor) && Number.isFinite(scoreAgainst) ? `${scoreFor}-${scoreAgainst}` : "";
  const winner = fixture.winner || "";
  const won = normalizeTeamName(winner) === normalizeTeamName(teamName);
  const lost = winner && normalizeTeamName(winner) !== normalizeTeamName(teamName) && !/^draw$/i.test(winner);
  const outcome = won ? "胜" : lost ? "负" : "平";
  const penalties = fixture.scoreDetails?.penalties;

  if (penalties && Number.isFinite(Number(penalties.home)) && Number.isFinite(Number(penalties.away))) {
    const pensFor = side === "home" ? penalties.home : penalties.away;
    const pensAgainst = side === "home" ? penalties.away : penalties.home;
    return `${scoreText}后点球大战${pensFor}-${pensAgainst}${outcome}`;
  }

  return scoreText ? `${scoreText}${outcome}` : outcome;
}

function roundPhrase(round = "") {
  if (!round || /^group/i.test(round) || /^matchday/i.test(round)) return "";
  if (/^final$/i.test(round)) return " in the Final";
  if (/semi-finals/i.test(round)) return " in the Semi-finals";
  if (/quarter-finals/i.test(round)) return " in the Quarter-finals";
  if (/round of 16/i.test(round)) return " in the Round of 16";
  if (/third/i.test(round)) return " in the third-place match";
  return ` in the ${round}`;
}

function roundPhraseZh(round = "") {
  const groupPlayoffMatch = String(round).match(/^Group\s+(\d+)\s+Play-off$/i);
  if (groupPlayoffMatch) return `第${groupPlayoffMatch[1]}组附加赛`;
  if (!round || /^group/i.test(round) || /^matchday/i.test(round)) return "";
  if (/preliminary round/i.test(round)) return "预赛轮";
  if (/first round,\s*replays/i.test(round)) return "第一轮重赛";
  if (/first round/i.test(round)) return "第一轮";
  if (/final round/i.test(round)) return "决赛轮";
  if (/^final$/i.test(round)) return "决赛";
  if (/semifinals|semi-finals/i.test(round)) return "半决赛";
  if (/quarter-finals,\s*replays/i.test(round)) return "四分之一决赛重赛";
  if (/quarterfinals|quarter-finals/i.test(round)) return "四分之一决赛";
  if (/round of 16/i.test(round)) return "十六强赛";
  if (/match for third place|third-place match|third place match/i.test(round)) return "季军赛";
  if (/third-place play-off|third place play-off/i.test(round)) return "季军赛";
  return "历史比赛";
}

function goalAction(count, penaltyCount = 0) {
  if (count === 1) return penaltyCount === 1 ? "scored a penalty" : "scored";
  if (count === 2) return penaltyCount === 2 ? "scored twice from the spot" : "scored twice";
  if (count === 3) return penaltyCount === 3 ? "scored a penalty hat trick" : "scored a hat trick";
  return penaltyCount === count ? `scored ${count} penalties` : `scored ${count} times`;
}

function goalDetail(count, penaltyCount = 0) {
  if (count === 1) return penaltyCount === 1 ? "a penalty" : "a goal";
  if (count === 2) return penaltyCount === 2 ? "twice from the spot" : "twice";
  if (count === 3) return penaltyCount === 3 ? "a penalty hat trick" : "a hat trick";
  return penaltyCount === count ? `${count} penalties` : `${count} goals`;
}

function scoredTotalPhrase(count) {
  if (count === 2) return "scored twice";
  if (count === 3) return "scored three times";
  return `scored ${count} times`;
}

function goalDetailZh(count, penaltyCount = 0) {
  if (count === 1) return penaltyCount === 1 ? "点球破门" : "进球";
  if (count === 2) return penaltyCount === 2 ? "两次点球破门" : "梅开二度";
  if (count === 3) return penaltyCount === 3 ? "点球帽子戏法" : "上演帽子戏法";
  return penaltyCount === count ? `打进${count}个点球` : `打进${count}球`;
}

function groupGoalEvents(goalEvents) {
  const grouped = new Map();
  for (const event of goalEvents) {
    const key = event.fixture.id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        fixture: event.fixture,
        side: event.side,
        teamName: event.teamName,
        opponent: event.opponent,
        round: event.fixture.round,
        count: 0,
        penaltyCount: 0
      });
    }
    const group = grouped.get(key);
    group.count += 1;
    if (event.penalty) group.penaltyCount += 1;
  }

  return [...grouped.values()].sort((a, b) => {
    const roundScore = (round) =>
      /^final$/i.test(round) ? 4 : /semi-finals/i.test(round) ? 3 : /quarter-finals|round of 16/i.test(round) ? 2 : 1;
    return b.count - a.count || roundScore(b.round) - roundScore(a.round) || String(a.fixture.date).localeCompare(String(b.fixture.date));
  });
}

function goalFragment(group) {
  return `${goalDetail(group.count, group.penaltyCount)} against ${group.opponent}${roundPhrase(group.round)} (${resultPhrase(
    group.fixture,
    group.side,
    group.teamName
  )})`;
}

function goalFragmentZh(group) {
  const round = roundPhraseZh(group.round);
  const matchText = round ? `${round}对阵${teamZh(group.opponent)}` : `对阵${teamZh(group.opponent)}`;
  return `${matchText}时${goalDetailZh(group.count, group.penaltyCount)}（${resultPhraseZh(
    group.fixture,
    group.side,
    group.teamName
  )}）`;
}

function goalEvidenceSentence(profile, fact) {
  const groups = groupGoalEvents(fact.goalEvents);
  const total = Number(profile.goals || fact.goalEvents.length || 0);
  if (!groups.length || total <= 0) return "";

  if (total >= 5) {
    return `He scored ${total} times across ${groups.length} matches, led by ${goalFragment(groups[0])}.`;
  }

  if (groups.length === 1) {
    const group = groups[0];
    return `He ${goalAction(group.count, group.penaltyCount)} against ${group.opponent}${roundPhrase(group.round)} (${resultPhrase(
      group.fixture,
      group.side,
      group.teamName
    )}).`;
  }

  const visible = groups.slice(0, 2).map((group) => goalFragment(group));
  return `He ${scoredTotalPhrase(total)}, including ${listItems(visible, 2)}.`;
}

function goalEvidenceSentenceZh(profile, fact) {
  const groups = groupGoalEvents(fact.goalEvents);
  const total = Number(profile.goals || fact.goalEvents.length || 0);
  if (!groups.length || total <= 0) return "";

  if (total >= 5) {
    return `他在${groups.length}场比赛里打进${total}球，代表作是${goalFragmentZh(groups[0])}。`;
  }

  if (groups.length === 1) {
    return `他${goalFragmentZh(groups[0])}。`;
  }

  const visible = groups.slice(0, 2).map((group) => goalFragmentZh(group));
  return `他打进${total}球，包括${listItemsZh(visible, 2)}。`;
}

function appearanceGroupText(event) {
  return `${event.opponent}${roundPhrase(event.fixture.round)} (${resultPhrase(event.fixture, event.side, event.teamName)})`;
}

function appearanceGroupTextZh(event) {
  const round = roundPhraseZh(event.fixture.round);
  const matchText = round ? `${round}对阵${teamZh(event.opponent)}` : `对阵${teamZh(event.opponent)}`;
  return `${matchText}（${resultPhraseZh(event.fixture, event.side, event.teamName)}）`;
}

function appearanceSentence(profile, fact) {
  const keyEvents = fact.keyEvents;
  if (!keyEvents.length) return "";

  const shootoutConverted = keyEvents.filter((event) => /converted in the shootout/i.test(event.note));
  if (shootoutConverted.length) {
    return `He converted in the shootout against ${listItems(shootoutConverted.map(appearanceGroupText), 2)}.`;
  }

  const starts = keyEvents.filter((event) => /\bstarted\b/i.test(event.note));
  if (starts.length) {
    return `He started against ${listItems(starts.map(appearanceGroupText), 2)}.`;
  }

  const substitutes = keyEvents.filter((event) => /substitute/i.test(event.note));
  if (substitutes.length) {
    return `He came from the bench against ${listItems(substitutes.map(appearanceGroupText), 2)}.`;
  }

  if (keyEvents.length === 1) {
    return `His match touchpoint is ${appearanceGroupText(keyEvents[0])}.`;
  }

  return `His match touchpoints include ${listItems(keyEvents.map(appearanceGroupText), 2)}.`;
}

function appearanceSentenceZh(profile, fact) {
  const keyEvents = fact.keyEvents;
  if (!keyEvents.length) return "";

  const shootoutConverted = keyEvents.filter((event) => /converted in the shootout/i.test(event.note));
  if (shootoutConverted.length) {
    return `他在${listItemsZh(shootoutConverted.map(appearanceGroupTextZh), 2)}的点球大战中罚进。`;
  }

  const starts = keyEvents.filter((event) => /\bstarted\b/i.test(event.note));
  if (starts.length) {
    return `他在${listItemsZh(starts.map(appearanceGroupTextZh), 2)}首发。`;
  }

  const substitutes = keyEvents.filter((event) => /substitute/i.test(event.note));
  if (substitutes.length) {
    return `他在${listItemsZh(substitutes.map(appearanceGroupTextZh), 2)}替补登场。`;
  }

  if (keyEvents.length === 1) {
    return `他的比赛触点是${appearanceGroupTextZh(keyEvents[0])}。`;
  }

  return `他的比赛触点包括${listItemsZh(keyEvents.map(appearanceGroupTextZh), 2)}。`;
}

function buildGoalStyleNote(profile, fact) {
  const name = shortName(profile);
  const team = profile.teamName;
  const year = profile.tournamentYear;
  const total = Number(profile.goals || fact.goalEvents.length || 0);
  const hasFinalGoal = fact.goalEvents.some((event) => /^final$/i.test(event.fixture.round || ""));
  const hasKnockoutGoal = fact.goalEvents.some((event) => /final|semi-finals|quarter-finals|round of 16/i.test(event.fixture.round || ""));
  const evidence = goalEvidenceSentence(profile, fact);

  if (hasFinalGoal) {
    return `${name}'s ${year} card belongs to the final stage for ${team}. ${evidence}`;
  }
  if (total >= 5) {
    return `${name} was ${team}'s scoring story at the ${year} World Cup. ${evidence}`;
  }
  if (hasKnockoutGoal) {
    return `${name} gave ${team} a knockout moment in ${year}. ${evidence}`;
  }
  if (total >= 2) {
    return `${name} made ${team}'s ${year} attack feel alive whenever the chance opened. ${evidence}`;
  }
  return `${name} gave ${team} one of its ${year} tournament moments. ${evidence}`;
}

function buildGoalStyleNoteZh(profile, fact) {
  const team = teamZh(profile.teamName);
  const year = profile.tournamentYear;
  const total = Number(profile.goals || fact.goalEvents.length || 0);
  const hasFinalGoal = fact.goalEvents.some((event) => /^final$/i.test(event.fixture.round || ""));
  const hasKnockoutGoal = fact.goalEvents.some((event) => /final|semi-finals|quarter-finals|round of 16/i.test(event.fixture.round || ""));
  const evidence = goalEvidenceSentenceZh(profile, fact);

  if (hasFinalGoal) {
    return chooseZhVariant(profile, "final-goal", [
      () => `决赛是他在${team}${year}年世界杯最值得回看的舞台。${evidence}`,
      () => `${team}走到${year}年世界杯决赛时，他也留下了自己的进球印记。${evidence}`,
      () => `他在${team}${year}年世界杯的决赛阶段抓住了机会。${evidence}`
    ]);
  }
  if (total >= 5) {
    return chooseZhVariant(profile, "high-scoring", [
      () => `他是${team}${year}年世界杯最重要的得分手之一。${evidence}`,
      () => `${team}${year}年世界杯的进攻很大程度依赖他的终结。${evidence}`,
      () => `对手很难忽略他在${team}${year}年世界杯的持续得分威胁。${evidence}`
    ]);
  }
  if (hasKnockoutGoal) {
    return chooseZhVariant(profile, "knockout-goal", [
      () => `淘汰赛是他在${team}${year}年世界杯最值得回看的部分。${evidence}`,
      () => `${team}进入${year}年世界杯淘汰赛后，他依然能找到射门空间。${evidence}`,
      () => `他在${team}${year}年世界杯的淘汰赛阶段抓住了关键机会。${evidence}`
    ]);
  }
  if (total >= 2) {
    return chooseZhVariant(profile, "multiple-goals", [
      () => `他让${team}${year}年世界杯的进攻多了一个稳定得分点。${evidence}`,
      () => `对手不能把他当作一次性的威胁；他在${team}${year}年世界杯不止一次完成终结。${evidence}`,
      () => `他多次把${team}${year}年世界杯的进攻变成进球。${evidence}`
    ]);
  }
  return chooseZhVariant(profile, "single-goal", [
    () => `他为${team}${year}年世界杯留下一粒有明确比赛背景的进球。${evidence}`,
    () => `他的${team}${year}年世界杯记忆里有一个值得回看的终结瞬间。${evidence}`,
    () => `${team}${year}年世界杯的进球名单里有他的名字。${evidence}`
  ]);
}

function buildAppearanceStyleNote(profile, fact) {
  const name = shortName(profile);
  const team = profile.teamName;
  const year = profile.tournamentYear;
  const role = roleLabel(profile.position);
  const teamPossessive = possessive(team);
  const structure = roleStructure(role);
  const appearance = appearanceSentence(profile, fact);

  if (isStarter(profile, fact)) {
    return `${name} was part of ${teamPossessive} ${year} ${structure}. ${appearance}`;
  }
  if (fact.keyEvents.length > 1) {
    return `${name} helps fill out ${teamPossessive} ${year} ${structure}. ${appearance}`;
  }
  if (fact.keyEvents.length === 1) {
    return `${name} gives ${teamPossessive} ${year} ${structure} a concrete match point. ${appearance}`;
  }
  return `${name} is part of ${teamPossessive} ${year} World Cup squad picture. His card helps place the roster around the better-known names.`;
}

function buildAppearanceStyleNoteZh(profile, fact) {
  const team = teamZh(profile.teamName);
  const year = profile.tournamentYear;
  const role = roleLabelZh(profile.position);
  const appearance = appearanceSentenceZh(profile, fact);

  if (isStarter(profile, fact)) {
    return chooseZhVariant(profile, "starter", [
      () => `他是${team}${year}年世界杯常用的${role}。${appearance}`,
      () => `${team}在${year}年世界杯的重要比赛里使用了这名${role}。${appearance}`,
      () => `作为${role}，他进入了${team}${year}年世界杯的主要比赛安排。${appearance}`
    ]);
  }
  if (fact.keyEvents.length > 1) {
    return chooseZhVariant(profile, "rotation", [
      () => `他为${team}${year}年世界杯提供${role}位置的轮换选择。${appearance}`,
      () => `${team}在${year}年世界杯多次用到这名${role}。${appearance}`,
      () => `他补充了${team}${year}年世界杯在${role}位置上的阵容深度。${appearance}`
    ]);
  }
  if (fact.keyEvents.length === 1) {
    return chooseZhVariant(profile, "one-appearance", [
      () => `他在${team}${year}年世界杯有一场明确的重点比赛记录。${appearance}`,
      () => `这名${role}在${team}${year}年世界杯留下了一次具体出场记录。${appearance}`,
      () => `他的${team}${year}年世界杯档案里有一场可回看的比赛。${appearance}`
    ]);
  }
  return chooseZhVariant(profile, "squad-context", [
    () => `他是${team}${year}年世界杯阵容中的${role}，帮助补全这支球队的人员轮廓。`,
    () => `${team}${year}年世界杯名单里包括这名${role}。这张卡让当届阵容更容易理解。`,
    () => `作为${role}，他属于${team}${year}年世界杯阵容的一员。`
  ]);
}

export const HISTORICAL_STYLE_COPY_VERSION = "historical-style-v10";

const semanticPhrase = (id, en, zh) => Object.freeze({ id, en, zh });
const styleCatalog = (signatures, actions) => Object.freeze({
  signatures: Object.freeze(signatures),
  actions: Object.freeze(actions)
});

// This registry is intentionally the single machine-readable vocabulary for generated historical
// copy. Locale renderers can map the stable ids without guessing meaning from prose.
export const HISTORICAL_STYLE_CATALOGS = Object.freeze({
  goalkeeper: styleCatalog([
    semanticPhrase("gk-balance", "staying balanced until the shot reveals its direction", "射门方向明确前保持身体平衡"),
    semanticPhrase("gk-angle", "controlling the shooting angle before attempting the save", "扑救前先控制射门角度"),
    semanticPhrase("gk-patience", "making the forward reveal the finish first", "让前锋先暴露射门选择"),
    semanticPhrase("gk-footwork", "using small footwork adjustments to stay behind the ball", "用细小脚步调整保持在球后"),
    semanticPhrase("gk-box", "judging when to take charge of the space around goal", "判断何时接管门前空间"),
    semanticPhrase("gk-centre", "protecting the centre of goal before reacting to the final touch", "先保护球门中央再应对最后一脚"),
    semanticPhrase("gk-rebound", "preparing for the second action as well as the first save", "扑第一下时也为第二反应做好准备"),
    semanticPhrase("gk-calm", "keeping his decisions calm when the penalty area becomes crowded", "禁区拥挤时仍保持判断冷静")
  ], [
    semanticPhrase("gk-set-feet", "sets his feet before the strike and reacts without an extra step", "在射门前站稳脚步，不加多余一步就作出反应"),
    semanticPhrase("gk-protect-centre", "protects the central lane and forces the attacker toward the harder finish", "守住中路，把更难的射门选择留给对手"),
    semanticPhrase("gk-one-v-one", "waits in one-on-one situations until the attacker commits", "在单刀面对前锋时耐心等到对方先做选择"),
    semanticPhrase("gk-narrow-angle", "adjusts his depth to narrow the angle without dropping too early", "调整站位深度压缩角度，又不会过早后退"),
    semanticPhrase("gk-catch-or-parry", "catches cleanly where possible and pushes uncertain balls away from traffic", "判断能否稳稳接住，并在无法控制时把球击离人群"),
    semanticPhrase("gk-cross", "leaves his line only with a clear route to meet the cross decisively", "先判断能否果断触到传中球，再决定是否离开门线"),
    semanticPhrase("gk-reset", "recovers his stance quickly enough to face the next touch", "迅速恢复准备姿势，应对下一次触球"),
    semanticPhrase("gk-organize", "uses early instructions to keep the defenders in front of him connected", "提前指挥，让身前的后卫保持连接"),
    semanticPhrase("gk-body-shape", "reads the striker's body shape before moving toward either post", "观察前锋身体姿态，再向任一门柱移动"),
    semanticPhrase("gk-second-ball", "moves the rebound away from the most dangerous central area", "把反弹球处理到最危险的中路区域之外"),
    semanticPhrase("gk-safe-restart", "starts the next phase with the simplest safe restart", "用最简单稳妥的方式发动下一阶段"),
    semanticPhrase("gk-through-ball", "steps toward a through ball only after checking the runner's advantage", "确认跑动者的优势后才上前处理直塞球")
  ]),
  central_defender: styleCatalog([
    semanticPhrase("cb-position", "using contact without losing his defensive position", "身体对抗时不丢失防守位置"),
    semanticPhrase("cb-depth", "protecting the space behind the line before stepping forward", "前压之前先保护防线身后空间"),
    semanticPhrase("cb-body", "shaping his body to defend both the ball and the runner", "用身体朝向同时防住球和跑动者"),
    semanticPhrase("cb-aerial", "reading the flight of the ball before the aerial duel begins", "空中对抗开始前先判断来球轨迹"),
    semanticPhrase("cb-cover", "covering the next danger rather than chasing the first movement", "优先保护下一处危险而不是追逐第一次移动"),
    semanticPhrase("cb-line", "keeping the back line connected as the attack changes sides", "进攻转移侧面时保持后防线连接"),
    semanticPhrase("cb-patience", "waiting for the loose touch before committing to the challenge", "等对手触球变大后再投入抢断"),
    semanticPhrase("cb-first-pass", "turning a defensive win into a controlled first pass", "把防守成功转成可控的第一脚传球")
  ], [
    semanticPhrase("cb-goal-side", "stays goal-side until support is close enough for him to engage", "保持在球门一侧，等支援靠近后再上前对抗"),
    semanticPhrase("cb-check-runner", "checks the runner over his shoulder before the final pass arrives", "在最后一传到来前回头确认跑动者的位置"),
    semanticPhrase("cb-step", "steps toward the receiver only after the covering defender is set", "确认补位后卫站稳后才前压接球队员"),
    semanticPhrase("cb-aerial-contact", "meets the ball at its highest useful point and directs it away from pressure", "在合适的最高点争到球，并把球顶离压力区域"),
    semanticPhrase("cb-track-channel", "turns early enough to stay connected with a run into the channel", "提前转身，跟住进入肋部通道的跑动"),
    semanticPhrase("cb-hold-lane", "holds the dangerous lane until a teammate can pressure the ball", "守住危险线路，直到队友能向持球人施压"),
    semanticPhrase("cb-clear-wide", "clears toward a safe wide area instead of returning danger to the centre", "把球解围到安全边路，而不是重新送回中路危险区"),
    semanticPhrase("cb-open-pass", "opens his body after the recovery so the first pass can escape pressure", "在夺回球后打开身体，让第一脚传球摆脱压力"),
    semanticPhrase("cb-delay", "slows the attack long enough for the defensive shape to recover", "拖慢进攻，为防守阵型回位争取时间"),
    semanticPhrase("cb-front-foot", "intercepts from the front once the pass exposes the receiver", "在传球让接球队员暴露时才从身前截球"),
    semanticPhrase("cb-box-distance", "keeps a workable distance from his partner as the ball enters the box", "在球进入禁区时与搭档保持可协防的距离"),
    semanticPhrase("cb-simple-exit", "chooses the simple outlet if carrying forward would open the centre", "在带球前进可能暴露中路时选择简单出球点")
  ]),
  wide_defender: styleCatalog([
    semanticPhrase("fb-two-way", "covering the outside lane without losing the route back to goal", "覆盖外侧通道时不失去回防球门的路线"),
    semanticPhrase("fb-duel", "controlling the wide duel before attempting to win the ball", "先控制边路对抗再尝试夺球"),
    semanticPhrase("fb-overlap", "choosing the overlap only after the space behind him is protected", "确认身后空间受保护后再选择套边"),
    semanticPhrase("fb-distance", "holding the right distance from the nearest centre-back", "与最近的中后卫保持正确距离"),
    semanticPhrase("fb-recovery", "recovering the inside lane before chasing the winger", "追赶边锋前先收回内侧线路"),
    semanticPhrase("fb-width", "giving the team width without arriving too early", "提供进攻宽度又不过早到位"),
    semanticPhrase("fb-back-post", "protecting the far-post runner while the ball stays on the opposite side", "球在另一侧时保护后点跑动者"),
    semanticPhrase("fb-transition", "switching quickly between supporting the attack and closing the flank", "在支援进攻和封锁边路之间迅速切换")
  ], [
    semanticPhrase("fb-show-line", "angles his body to show the winger toward the less dangerous route", "调整身体角度，把边锋引向威胁较小的路线"),
    semanticPhrase("fb-block-cross", "gets close enough to block the delivery without diving into the challenge", "靠近到足以封堵传中，又不贸然下脚"),
    semanticPhrase("fb-inside-first", "protects the inside channel before tracking movement wide", "在跟向边线前先保护内侧通道"),
    semanticPhrase("fb-overlap-timing", "starts the forward run after a teammate can cover the space he leaves", "等队友能够保护他留下的空间后才开始前插"),
    semanticPhrase("fb-recovery-run", "turns toward his own goal early enough to match the first recovery run", "足够早地转向自家球门，跟上第一次回防跑动"),
    semanticPhrase("fb-back-post-scan", "scans the far post before the opposite winger receives the ball", "在对侧边锋接球前先观察后点"),
    semanticPhrase("fb-support-angle", "offers an outside passing angle under pressure on the winger", "在边锋受压时从外侧提供传球角度"),
    semanticPhrase("fb-underlap", "moves inside only if that run will not crowd the central midfielder", "在不会挤占中场空间时才向内线移动"),
    semanticPhrase("fb-early-delivery", "delivers early while the defender is still retreating toward goal", "趁防守者仍在面向球门后退时提前传球"),
    semanticPhrase("fb-reset-line", "drops back into the defensive line once possession is lost", "在球队失去稳定控球后立即回到防线"),
    semanticPhrase("fb-touchline-trap", "uses the touchline as cover before committing to the tackle", "在下脚抢断前利用边线充当额外保护"),
    semanticPhrase("fb-simple-inside-pass", "plays the simple inside pass with the forward lane closed", "在向前线路关闭时选择简单的内侧传球")
  ]),
  holding_midfielder: styleCatalog([
    semanticPhrase("dm-screen", "protecting the route into the centre before following the ball", "跟随球移动前先保护通向中路的路线"),
    semanticPhrase("dm-scan", "scanning both shoulders before receiving in front of the defence", "在防线身前接球前观察两侧"),
    semanticPhrase("dm-balance", "keeping the team balanced while other midfielders move forward", "其他中场前移时维持球队平衡"),
    semanticPhrase("dm-first-pass", "making the first pass after a recovery easier than the tackle", "让夺回球后的第一脚传球比抢断更简单"),
    semanticPhrase("dm-second-ball", "reading where the second ball will fall before the duel finishes", "对抗结束前预判二点球落点"),
    semanticPhrase("dm-tempo", "deciding when midfield needs security and when it can play forward", "判断中场何时需要稳妥、何时可以向前"),
    semanticPhrase("dm-cover", "covering the space a teammate leaves rather than following his opponent", "保护队友留下的空间而不是盲目跟人"),
    semanticPhrase("dm-pressure", "receiving under pressure without exposing the centre on the next touch", "受压接球时不让下一次触球暴露中路")
  ], [
    semanticPhrase("dm-open-body", "receives side-on so his next pass can move beyond the first line", "侧身接球，让下一脚传球可以越过第一道防线"),
    semanticPhrase("dm-hold-zone", "holds the centre until a teammate recovers behind the ball", "守住中路区域，直到队友回到球后"),
    semanticPhrase("dm-lane-block", "angles his approach to block the forward pass before pressing", "在压迫接球队员前先调整路线封住向前传球"),
    semanticPhrase("dm-two-touch", "uses one touch to secure the ball and the next to release it", "第一脚稳住球，第二脚把球送出"),
    semanticPhrase("dm-follow-pass", "moves after passing so the defence still has a nearby outlet", "在传球后继续移动，让后防仍有近距离出球点"),
    semanticPhrase("dm-second-ball-action", "arrives underneath the duel ready for the loose second ball", "来到对抗下方，准备处理可能落下的二点球"),
    semanticPhrase("dm-delay-counter", "delays the counterattack without abandoning the space in front of goal", "在延缓反击时不放弃球门前的关键空间"),
    semanticPhrase("dm-switch", "switches play after pressure gathers on one side", "在压力集中到一侧时转移进攻"),
    semanticPhrase("dm-safe-turn", "turns out of pressure only after checking the space behind him", "确认身后空间后才转身摆脱压力"),
    semanticPhrase("dm-cover-fullback", "slides across early as a full-back moves beyond the ball", "在边后卫越过球前插时提前横移补位"),
    semanticPhrase("dm-break-line", "plays forward once the receiver can take the ball on the far side of pressure", "确认接球队员能在压力另一侧拿球后选择向前传递"),
    semanticPhrase("dm-reset", "returns the ball and changes angle with the direct route crowded", "在直接线路拥挤时回传并改变接应角度")
  ]),
  midfielder: styleCatalog([
    semanticPhrase("mf-tempo", "shaping the pace of the game from midfield", "从中场塑造比赛节奏"),
    semanticPhrase("mf-angle", "creating a better angle before the next pass is needed", "下一脚传球到来前创造更好的角度"),
    semanticPhrase("mf-scan", "seeing the next action before receiving under pressure", "受压接球前看清下一步处理"),
    semanticPhrase("mf-progression", "moving the ball forward without forcing the crowded route", "不勉强走拥挤线路也能把球向前推进"),
    semanticPhrase("mf-support", "staying connected to the move after releasing the ball", "出球后继续与进攻保持连接"),
    semanticPhrase("mf-space", "finding usable space between the opponent's midfield lines", "在对方中场线之间寻找可用空间"),
    semanticPhrase("mf-turn", "using his first touch to open the next side of the pitch", "用第一脚触球打开球场下一侧"),
    semanticPhrase("mf-pressure", "keeping the ball calm when the midfield becomes crowded", "中场拥挤时仍让球保持稳定"),
    semanticPhrase("mf-transition", "recognising whether a recovery calls for speed or control", "夺回球后判断应该加速还是控制"),
    semanticPhrase("mf-late-run", "joining the attack from a position defenders cannot watch continuously", "从防守者无法持续观察的位置加入进攻")
  ], [
    semanticPhrase("mf-side-on", "receives side-on so the next pass can travel forward", "侧身接球，让下一脚传球可以向前"),
    semanticPhrase("mf-move-after", "moves after passing so the receiver still has close support", "在传球后继续移动，让接球队友仍有近距离支援"),
    semanticPhrase("mf-third-player", "uses a short pass to bring a third teammate into the move", "用短传让第三名队友加入进攻"),
    semanticPhrase("mf-switch-angle", "changes his angle before switching play away from pressure", "在把球转移出压力前先改变自己的接应角度"),
    semanticPhrase("mf-first-touch", "takes the first touch away from the nearest challenge", "用第一脚触球离开最近的抢断"),
    semanticPhrase("mf-release-runner", "draws pressure toward the ball and releases the runner beyond it", "把压力吸引到球边，再送出越过压力的跑动者"),
    semanticPhrase("mf-carry-gap", "carries through the open lane if no forward pass is available", "在没有向前传球线路时从开放通道带球推进"),
    semanticPhrase("mf-counterpress", "closes the nearest return pass as soon as possession is lost", "在丢球后立即封住最近的回传线路"),
    semanticPhrase("mf-pause", "slows the touch to give teammates time to move ahead of the ball", "在队友需要时间前移时放慢触球节奏"),
    semanticPhrase("mf-half-turn", "checks behind him before receiving on the half-turn", "在半转身接球前先观察身后"),
    semanticPhrase("mf-late-box", "arrives near the box after the first line of markers has followed the ball", "等第一层盯防者跟随球移动后再到达禁区附近"),
    semanticPhrase("mf-protect-ball", "uses his body to protect the ball without closing the passing angle", "用身体护球，同时保留传球角度"),
    semanticPhrase("mf-simple-reset", "recycles possession rather than isolating a teammate with a forced forward pass", "在向前传球可能让队友陷入孤立时重新组织控球"),
    semanticPhrase("mf-between-lines", "positions himself where one touch can connect midfield to attack", "站到一脚触球就能连接中场与进攻的位置")
  ]),
  wide_attacker: styleCatalog([
    semanticPhrase("wing-isolation", "making the wide defender guard more than one route", "让边路防守者同时顾及多条路线"),
    semanticPhrase("wing-change-pace", "changing pace after the defender has fixed his feet", "防守者脚步固定后改变速度"),
    semanticPhrase("wing-width", "using the touchline to stretch the defence before moving inside", "先利用边线拉开防线再向内移动"),
    semanticPhrase("wing-inside", "finding the inside channel without crowding the central attacker", "不挤占中锋空间地进入内侧通道"),
    semanticPhrase("wing-first-touch", "turning the first touch into an advantage in the wide duel", "用第一脚触球在边路对抗中取得优势"),
    semanticPhrase("wing-far-post", "arriving away from the ball where the far-post space opens", "在远离球的一侧进入后点空当"),
    semanticPhrase("wing-combination", "combining quickly after drawing the full-back toward him", "吸引边后卫靠近后迅速完成配合"),
    semanticPhrase("wing-transition", "carrying into open grass before the block can reset", "防守阵型重组前把球带入开放空间")
  ], [
    semanticPhrase("wing-outside-inside", "threatens outside before cutting behind midfield", "先威胁外线，再切入中场身后的空间"),
    semanticPhrase("wing-touch-away", "takes the first touch away from the full-back's strongest challenge", "把第一脚触球带离边后卫最有力的抢断方向"),
    semanticPhrase("wing-release-overlap", "holds the defender long enough to release an overlapping teammate", "牵制防守者足够久，再送出套边队友"),
    semanticPhrase("wing-early-cross", "delivers before the back line can turn and face the ball", "在后防线转身面对球前就完成传中"),
    semanticPhrase("wing-cutback", "reaches the byline with enough control to pick a cutback target", "有控制地到达底线，并选择倒三角传球目标"),
    semanticPhrase("wing-far-post-run", "moves toward the far post as the attack develops on the opposite side", "在进攻从另一侧展开时向后点移动"),
    semanticPhrase("wing-halfspace", "leaves the touchline as a central passing lane appears", "在中路传球线路出现时离开边线进入内侧"),
    semanticPhrase("wing-counterpress", "turns toward the ball immediately after losing it in the final third", "在前场丢球后立即转向球发起反抢"),
    semanticPhrase("wing-carry-head-up", "carries with his head up to see the second defender", "抬头带球，及时看见第二名防守者"),
    semanticPhrase("wing-stop-start", "uses a pause to make the defender lean before accelerating again", "用停顿让防守者重心偏移，再次加速"),
    semanticPhrase("wing-return-pass", "returns the ball inside if the isolated duel has no clean exit", "在单挑没有干净出口时把球回传内侧"),
    semanticPhrase("wing-press-angle", "presses from outside to close the defender's easy central pass", "从外向内施压，封住后卫简单的中路传球")
  ]),
  striker: styleCatalog([
    semanticPhrase("fw-run", "attacking the space behind defenders before it fully opens", "防线身后空当完全出现前就发起冲击"),
    semanticPhrase("fw-reference", "giving the passer a reliable target under pressure", "在压力下为传球者提供可靠目标"),
    semanticPhrase("fw-separation", "creating separation before the final pass reaches the box", "最后一传进入禁区前摆脱盯防"),
    semanticPhrase("fw-finish", "preparing the finish before the nearest defender can recover", "最近的防守者回位前准备好终结"),
    semanticPhrase("fw-channel", "moving between centre-back and full-back without being tracked", "在中后卫与边后卫之间移动且不易被跟踪"),
    semanticPhrase("fw-link", "bringing a teammate into the attack with minimal extra touches", "用尽量少的多余触球让队友加入进攻"),
    semanticPhrase("fw-box", "reading where the next touch will fall inside the penalty area", "预判禁区内下一次触球的落点"),
    semanticPhrase("fw-press", "starting the press by removing the defender's easiest pass", "先封住后卫最简单的传球来启动逼抢"),
    semanticPhrase("fw-blindside", "moving on the blind side while defenders watch the ball", "防守者看球时从其视线盲区移动"),
    semanticPhrase("fw-receive", "receiving with a route toward goal already in mind", "接球前就想好通向球门的路线")
  ], [
    semanticPhrase("fw-start-run", "starts his run while the back line is still watching the ball", "趁后防线仍盯着球时提前启动"),
    semanticPhrase("fw-pin", "pins one centre-back and opens space for the next runner", "牵制一名中后卫，为下一名跑动者打开空间"),
    semanticPhrase("fw-body-return", "uses his body to protect the ball and returns it into a teammate's path", "用身体护住球，再把球回做给队友"),
    semanticPhrase("fw-near-post", "attacks the near-post lane before the marker can turn", "在盯防者转身前攻击前点线路"),
    semanticPhrase("fw-delay-run", "waits for the defender to look away before accelerating", "等防守者注意力转移后再加速"),
    semanticPhrase("fw-one-touch", "uses one touch to set the finish and the next to strike", "用第一脚准备终结，再用下一脚射门"),
    semanticPhrase("fw-shot-early", "gets the shot away before the covering defender can reset", "在补位后卫重新站稳前完成射门"),
    semanticPhrase("fw-second-ball", "positions himself for the second ball before the first duel is over", "在第一次对抗结束前就为二点球站位"),
    semanticPhrase("fw-pull-wide", "moves wide of the centre-backs to open the middle for a teammate", "在队友需要中路通道时主动离开中后卫身边"),
    semanticPhrase("fw-face-goal", "drops just far enough to receive facing goal", "适度回撤到能够面向球门接球的位置"),
    semanticPhrase("fw-press-curve", "curves his pressing run to block the return pass into midfield", "用弧线逼抢封住回传中场的路线"),
    semanticPhrase("fw-rebound", "follows the first shot into the space where a rebound can fall", "跟进第一脚射门，进入可能出现反弹球的区域"),
    semanticPhrase("fw-box-pause", "uses a short pause in the box to separate from a moving marker", "在禁区内短暂停顿，与移动中的盯防者拉开距离"),
    semanticPhrase("fw-layoff-turn", "lays the ball off and turns immediately toward the next passing lane", "回做后立即转身进入下一条传球线路")
  ]),
  player: styleCatalog([
    semanticPhrase("pl-support", "making the next action easier for the teammate on the ball", "让持球队友的下一步处理更轻松"),
    semanticPhrase("pl-space", "moving into useful space before pressure arrives", "压力到来前移动到有用空间"),
    semanticPhrase("pl-first-touch", "keeping the first touch close enough to preserve options", "把第一脚触球控制得足够近以保留选择"),
    semanticPhrase("pl-simple", "choosing the simple action before the phase becomes crowded", "局面拥挤前选择简单处理"),
    semanticPhrase("pl-awareness", "checking the next pressure before receiving the ball", "接球前确认下一处压力"),
    semanticPhrase("pl-balance", "supporting the move without abandoning the space behind him", "支援进攻时不放弃身后空间"),
    semanticPhrase("pl-continuity", "keeping the move connected through his first decision", "用第一次判断保持进攻连接"),
    semanticPhrase("pl-recovery", "reacting to a turnover before the shape fully changes", "阵型完全变化前先对攻守转换作出反应")
  ], [
    semanticPhrase("pl-angle", "moves into a clear passing angle before the ball carrier is trapped", "在持球人被困住前移动到清晰传球角度"),
    semanticPhrase("pl-close-touch", "keeps the ball close enough to pass or carry with the next touch", "把球控制在身边，让下一脚可以传球或带球"),
    semanticPhrase("pl-return", "returns the pass instead of turning into pressure", "在转身可能招来压力时选择回传"),
    semanticPhrase("pl-follow", "follows his pass so the receiver is not left alone", "出球后继续跟进，不让接球队友孤立"),
    semanticPhrase("pl-scan", "looks over his shoulder before entering the next space", "在进入下一处空间前先回头观察"),
    semanticPhrase("pl-protect", "uses his body to protect the ball without slowing the move", "用身体护球，同时不拖慢进攻"),
    semanticPhrase("pl-width", "moves away from traffic as the central lane becomes crowded", "在中路拥挤时移动到远离人群的位置"),
    semanticPhrase("pl-counter", "turns toward the ball as soon as possession changes", "在发现球权变化后立即转向球"),
    semanticPhrase("pl-release", "releases the ball before the second defender can arrive", "在第二名防守者到来前把球送出"),
    semanticPhrase("pl-second", "prepares for the loose ball while the first duel is still happening", "在第一次对抗仍在进行时准备处理可能落下的二点球"),
    semanticPhrase("pl-distance", "keeps a supporting distance that offers both a pass and cover", "保持既能接球又能保护的支援距离"),
    semanticPhrase("pl-reset", "changes his angle after the direct route closes", "在直接线路关闭时改变接应角度")
  ])
});

// These phrases are deliberately outside the generic role pools. They can only be selected when
// a reviewed Best XI rationale matches their meaning, so a detail written for Cruyff, Beckenbauer,
// Garrincha, Pelé, Hong or Yoo cannot leak randomly onto an unrelated player card.
export const HISTORICAL_EDITORIAL_STYLE_PHRASES = Object.freeze({
  goalkeeper: styleCatalog([
    semanticPhrase(
      "gk-recovery-save",
      "recovering across goal while keeping enough control to redirect the save",
      "横移补位时仍保持身体控制，把来球托向安全区域"
    )
  ], [
    semanticPhrase(
      "gk-lift-over",
      "reaches back to lift a dropping header over the bar",
      "向后伸展，把正在下坠的头球托过横梁"
    ),
    semanticPhrase(
      "gk-high-start",
      "holds a starting position beyond his box so the back line can stay high",
      "站位保持在禁区外，让后防线能够维持高位"
    ),
    semanticPhrase(
      "gk-attack-start",
      "uses the first pass outside his box to start the attack",
      "在禁区外用第一脚传球发动进攻"
    )
  ]),
  central_defender: styleCatalog([
    semanticPhrase("cb-libero-progress", "stepping beyond the first pressure to change the point of attack", "越过第一道压力后改变进攻方向"),
    semanticPhrase(
      "cb-carry-cover",
      "carrying past the back line while preserving the recovery route behind the wing-backs",
      "带球越过后防线时仍保留回到翼卫身后的路线"
    )
  ], [
    semanticPhrase("cb-reset-after-setback", "uses the next simple pass to settle the line after a sudden setback", "在突然受挫后用下一脚简单传球稳住防线"),
    semanticPhrase("cb-step-midfield-press", "steps into midfield to keep the press connected", "前移到中场，以这样的移动保持逼抢连接"),
    semanticPhrase(
      "cb-carry-first-press",
      "drives into the open lane after drawing the first pressure",
      "吸引第一道压力后带球冲入开放通道"
    ),
    semanticPhrase(
      "cb-cover-wingback",
      "turns toward goal early enough to recover behind an advanced wing-back",
      "足够早地转向自家球门，回到前插翼卫身后补位"
    ),
    semanticPhrase(
      "cb-step-possession",
      "steps into the open midfield lane with the ball after winning the first contact",
      "赢下第一次对抗后带球进入开放的中场通道"
    ),
    semanticPhrase(
      "cb-forward-pass",
      "uses the first forward pass before pressure can close the receiver",
      "在压力封住接球队员前送出第一脚向前传球"
    ),
    semanticPhrase(
      "cb-calm-distribution",
      "uses a calm first pass after covering the space behind an advanced full-back",
      "保护前插边后卫身后的空间后，用冷静的第一脚传球出球"
    )
  ]),
  wide_defender: styleCatalog([
    semanticPhrase(
      "fb-inside-option",
      "moving inside from full-back to become an extra passing option",
      "从边后卫位置移入内线，成为额外传球点"
    ),
    semanticPhrase(
      "fb-direct-goal-run",
      "turning a direct right-sided run into a route toward goal",
      "把右路直接前插转化为通向球门的线路"
    ),
    semanticPhrase(
      "fb-carry-balance",
      "carrying out of pressure without leaving the back line exposed",
      "带球摆脱压力时不让后防线暴露"
    ),
    semanticPhrase(
      "fb-role-shift",
      "moving between left-back and centre-back without breaking the line's connections",
      "在左后卫和中后卫之间切换时不破坏防线连接"
    )
  ], [
    semanticPhrase(
      "fb-inside-support",
      "steps beside the central midfielder when that creates a free route forward",
      "在能创造向前空当时移动到中场队友身旁提供接应"
    ),
    semanticPhrase(
      "fb-run-beyond",
      "accelerates beyond the wide midfielder as the passer looks inside",
      "在传球者观察内线时从边路中场身前加速前插"
    ),
    semanticPhrase(
      "fb-finish-through-pass",
      "meets the disguised pass on the move and finishes before the lane closes",
      "在跑动中接到隐蔽直传，并在线路关闭前完成终结"
    ),
    semanticPhrase(
      "fb-carry-out-pressure",
      "takes the open lane beyond the first presser once the defensive exit is secure",
      "确认后防出球安全后，带球越过第一名施压者进入开放通道"
    ),
    semanticPhrase(
      "fb-shift-inside",
      "narrows into centre-back as the defensive shape is reorganized",
      "在防守阵型重组时内收到中后卫位置"
    ),
    semanticPhrase(
      "fb-hold-unit",
      "keeps the line's distances intact while the roles around him change",
      "在身边角色变化时仍保持防线间距完整"
    )
  ]),
  holding_midfielder: styleCatalog([
    semanticPhrase(
      "dm-recovery-tackle",
      "tracking the runner all the way into the box before committing to the tackle",
      "一路跟随跑动者进入禁区后再投入抢断"
    )
  ], [
    semanticPhrase(
      "dm-match-run",
      "matches the runner's line without crossing behind the ball",
      "沿着跑动者的线路跟防，同时保持在球门一侧"
    ),
    semanticPhrase(
      "dm-tackle-goal-side",
      "makes the recovery tackle from the goal side once the touch exposes the ball",
      "等触球让球暴露后，从球门一侧完成回追抢断"
    )
  ]),
  midfielder: styleCatalog([
    semanticPhrase("mf-versatility", "changing midfield tasks without breaking the team's connections", "切换中场任务时不破坏球队连接"),
    semanticPhrase(
      "mf-left-narrow",
      "starting from the left and narrowing enough to keep the midfield connected",
      "从左侧起步并适度内收，让中场保持连接"
    ),
    semanticPhrase(
      "mf-vertical-run",
      "turning midfield possession into a vertical run before the block settles",
      "在防守阵型站稳前把中场控球转化为纵向前插"
    ),
    semanticPhrase(
      "mf-corner-seam",
      "finding the seam between zonal defenders and man-markers at attacking corners",
      "在进攻角球中寻找区域防守者与盯人防守者之间的接缝"
    )
  ], [
    semanticPhrase(
      "mf-open-pitch-pass",
      "opens the far side with his passing before pressure can close it",
      "在压力封闭前用传球打开球场远侧"
    ),
    semanticPhrase(
      "mf-distance-shot",
      "sets the ball outside the crowd so his shot can travel through the gap",
      "把球调整到人群外侧，让远射穿过空当"
    ),
    semanticPhrase(
      "mf-drive-forward",
      "carries his momentum through the first open central lane",
      "沿第一条开放中路通道保持冲刺势头向前推进"
    ),
    semanticPhrase(
      "mf-cutback",
      "reaches the end line with enough balance to pull the ball behind the retreating defence",
      "保持平衡到达底线，把球回传到后退防线身后"
    ),
    semanticPhrase(
      "mf-track-assignment",
      "tracks the opponent's main runner without being pulled away from the centre",
      "跟住对手最重要的跑动者，同时不被带离中路"
    ),
    semanticPhrase(
      "mf-balance-two-way",
      "holds a covering position as the attack develops, then moves with the next phase",
      "在进攻发展时保持保护性站位，再随下一阶段移动"
    ),
    semanticPhrase(
      "mf-final-pass-runner",
      "plays the final pass into the runner's path once the move opens the line",
      "在进攻打开线路后把最后一传送到跑动者身前"
    ),
    semanticPhrase(
      "mf-corner-arrival",
      "arrives through that seam to attack the ball rather than wait underneath it",
      "穿过接缝主动迎球，而不是站在球下等待"
    ),
    semanticPhrase(
      "mf-repeat-corner-route",
      "repeats the route after the defensive assignments leave it open again",
      "在防守分工再次留下空当时重复利用同一线路"
    ),
    semanticPhrase(
      "mf-beat-defender-carry",
      "carries beyond the first defender when the shooting lane opens",
      "在射门线路出现时带球越过第一名防守者"
    ),
    semanticPhrase(
      "mf-left-foot-finish",
      "strikes with his left foot once the defender has been beaten",
      "摆脱防守者后用左脚完成射门"
    ),
    semanticPhrase(
      "mf-receive-beyond-press",
      "receives beyond the first line of pressure before it can recover",
      "在第一道逼抢回位前到其身后接球"
    ),
    semanticPhrase(
      "mf-corner-delivery",
      "delivers the corner into the runner's path once the route opens",
      "在线路打开后把角球送到跑动者身前"
    ),
    semanticPhrase(
      "mf-early-forward-pass",
      "plays forward before the opposing midfield can form its press",
      "在对方中场形成压迫前就向前传球"
    ),
    semanticPhrase(
      "mf-cover-advanced-side",
      "slides across to cover the side an advanced teammate leaves open",
      "横移保护前插队友留下的侧面空间"
    )
  ]),
  wide_attacker: styleCatalog([
    semanticPhrase("wing-create-score", "combining chance creation with his own scoring threat", "把机会创造和自身得分威胁结合起来"),
    semanticPhrase(
      "wing-backpass-run",
      "turning a loose backpass into a direct route toward goal",
      "把力量不足的回传转化为直达球门的线路"
    )
  ], [
    semanticPhrase("wing-chance-making", "beats or draws the wide defender before choosing the final pass", "突破或吸引边路防守者后再选择最后一传"),
    semanticPhrase(
      "wing-attack-backpass",
      "accelerates onto the underhit return before the goalkeeper can claim it",
      "在门将拿到球前加速追上力量不足的回传"
    ),
    semanticPhrase(
      "wing-round-goalkeeper",
      "takes the ball around the goalkeeper before using the empty finish",
      "带球绕过门将后面对空门完成终结"
    ),
    semanticPhrase(
      "wing-quick-final-action",
      "turns the blind-side arrival into a shot or final pass before the marker recovers",
      "把盲侧到位转化为射门或最后一传，赶在盯防者回位前完成"
    ),
    semanticPhrase(
      "wing-force-retreat",
      "carries directly enough that the isolated defender must retreat toward goal",
      "直接带球迫使被孤立的防守者退向自家球门"
    ),
    semanticPhrase(
      "wing-change-gear",
      "accelerates after drawing the defender into the wide duel",
      "把防守者吸引进边路对抗后再加速"
    )
  ]),
  striker: styleCatalog([
    semanticPhrase("fw-organise-movement", "organising the attack by moving away from a fixed centre-forward position", "离开固定中锋位置，通过移动组织进攻"),
    semanticPhrase("fw-manipulate", "moving defenders before choosing the final action", "先带动防守者移动，再选择最后处理"),
    semanticPhrase(
      "fw-space-arrival",
      "leaving the expected zone before arriving in the decisive one",
      "先离开预期区域，再到达决定性区域"
    )
  ], [
    semanticPhrase("fw-overload-press", "moves toward the ball to create an extra option while keeping the ball-side press supported", "向球移动创造额外传球点，同时保持有球侧逼抢支援"),
    semanticPhrase("fw-draw-release", "draws defenders toward him before releasing the teammate beyond them", "先把防守者吸引到自己身边，再送出其身后的队友"),
    semanticPhrase("fw-check-to-feet", "checks toward the ball to receive at his feet before attacking the space beyond", "向球靠近并接到脚下，随后攻击防线身后空间"),
    semanticPhrase(
      "fw-counter-arrival",
      "arrives as the second runner on the counter with his body already facing goal",
      "作为反击中的第二名跑动者到位，身体已朝向球门"
    ),
    semanticPhrase(
      "fw-leave-expected-zone",
      "moves away from the position defenders expect him to hold",
      "离开防守者预期他停留的位置"
    ),
    semanticPhrase(
      "fw-arrive-decisive-zone",
      "arrives in the scoring area after their attention has shifted elsewhere",
      "在防守注意力转向别处后到达得分区域"
    )
  ])
});

export const HISTORICAL_SPECIAL_STYLE_PHRASES = Object.freeze({
  penalty: Object.freeze({
    signature: semanticPhrase("penalty-routine", "repeating the same calm routine from the penalty spot", "在点球点重复同一套冷静动作"),
    actions: Object.freeze([
      semanticPhrase("penalty-balance", "keeps his approach balanced and strikes without rushing", "保持助跑平衡，不急于完成击球"),
      semanticPhrase("penalty-commit", "waits for his final stride before committing to the finish", "等到最后一步才决定终结方向")
    ])
  }),
  impact: Object.freeze({
    signature: semanticPhrase("impact-read", "reading the shape of the match quickly after entering", "登场后迅速读懂比赛形势"),
    actions: Object.freeze([
      semanticPhrase("impact-first-touch", "uses his first touches to find the space the match is already offering", "用最初几次触球找到比赛已经出现的空间"),
      semanticPhrase("impact-tempo", "matches the speed of the phase before trying to change it", "先适应当前攻防速度，再尝试改变局面")
    ])
  }),
  goal: Object.freeze({
    defender: Object.freeze({
      signature: semanticPhrase("def-goal-arrival", "joining the scoring area without giving up his recovery position", "进入得分区域时不放弃回防位置"),
      actions: Object.freeze([
        semanticPhrase("def-attack-set-play", "times his arrival so he can attack the ball rather than wait underneath it", "把握到位时机，主动迎球而不是站在球下等待"),
        semanticPhrase("def-recover-after-attack", "turns back toward the defensive shape as soon as the attacking touch is finished", "在完成进攻触球后立即转回防守阵型")
      ])
    }),
    midfielder: Object.freeze({
      signature: semanticPhrase("mf-goal-arrival", "arriving near goal after the first wave has occupied the defence", "第一波进攻牵制防线后再靠近球门"),
      actions: Object.freeze([
        semanticPhrase("mf-finish-arrival", "enters the shooting lane while defenders are still following the ball", "在防守者仍跟随球移动时进入射门线路"),
        semanticPhrase("mf-shot-balance", "sets the ball with one touch before pressure can close the shot", "在压力封住射门前用一脚触球把球调整好"),
        semanticPhrase("mf-second-wave-finish", "joins the second attacking wave where a loose ball can open a shot", "加入第二波进攻，准备把弹出的球转化为射门"),
        semanticPhrase("mf-open-shot", "moves across the edge of the area until the shooting route is clear", "沿禁区边缘移动，直到射门线路打开")
      ])
    }),
    forward: Object.freeze({
      signature: semanticPhrase("fw-clean-shot", "creating a clean shot before the defence can reset", "防线重组前制造干净射门"),
      actions: Object.freeze([
        semanticPhrase("fw-moving-finish", "arrives on the move and finishes before the nearest marker recovers", "在跑动中到位，并在最近的盯防者回位前完成终结"),
        semanticPhrase("fw-finish-few-touches", "reduces the touches between receiving the ball and striking it", "减少接球到射门之间的触球次数"),
        semanticPhrase("fw-set-finish", "sets the finish with his first controlled touch before pressure closes", "用第一脚可控触球准备终结，赶在压力封闭前完成"),
        semanticPhrase("fw-find-loose-shot", "moves toward the area where a loose ball can open a shot", "移动到二点球可能转化为射门机会的区域"),
        semanticPhrase("fw-header-create", "times his arrival for the aerial ball and then looks for the teammate beyond the next defender", "把握到位时机争取高球，随后寻找下一名防守者身后的队友")
      ])
    })
  })
});

export const HISTORICAL_ACTION_FAMILIES = Object.freeze({
  "cb-reset-after-setback": "calm-simple-reset",
  "cb-simple-exit": "calm-simple-reset",
  "fw-start-run": "forward-run-timing",
  "fw-delay-run": "forward-run-timing",
  "fw-one-touch": "finishing-touch-economy",
  "fw-finish-few-touches": "finishing-touch-economy",
  "fw-set-finish": "finishing-touch-economy",
  "fw-check-to-feet": "receive-to-feet",
  "fw-rebound": "second-phase-positioning",
  "fw-second-ball": "second-phase-positioning",
  "fw-find-loose-shot": "second-phase-positioning",
  "fw-shot-early": "finish-before-cover",
  "fw-moving-finish": "finish-before-cover",
  "mf-late-box": "midfield-goal-arrival",
  "mf-finish-arrival": "midfield-goal-arrival",
  "mf-second-wave-finish": "midfield-goal-arrival",
  "mf-shot-balance": "midfield-shot-preparation",
  "mf-open-shot": "midfield-shot-preparation",
  "cb-aerial-contact": "aerial-ball-attack",
  "def-attack-set-play": "aerial-ball-attack",
  "fb-reset-line": "recovery-after-attack",
  "def-recover-after-attack": "recovery-after-attack"
});

export function historicalActionFamily(actionId) {
  return HISTORICAL_ACTION_FAMILIES[actionId] || actionId;
}

export const HISTORICAL_SIGNATURE_ACTION_CONFLICTS = Object.freeze({
  "fb-recovery": Object.freeze(["fb-inside-first"]),
  "fw-blindside": Object.freeze(["fw-start-run"]),
  "fw-finish": Object.freeze(["fw-shot-early", "fw-moving-finish"]),
  "fw-receive": Object.freeze(["fw-face-goal"]),
  "pl-balance": Object.freeze(["pl-distance"]),
  "pl-first-touch": Object.freeze(["pl-close-touch"]),
  "wing-far-post": Object.freeze([])
});

export function historicalSignatureActionConflict(signatureId, actionId) {
  return Boolean(HISTORICAL_SIGNATURE_ACTION_CONFLICTS[signatureId]?.includes(actionId));
}

// Every generated thesis must be followed by at least one observable action that explains it.
// The second action may add a complementary phase, but the first is always drawn from this map.
export const HISTORICAL_SIGNATURE_ACTION_SUPPORTS = Object.freeze({
  "gk-recovery-save": Object.freeze(["gk-lift-over", "gk-reset"]),
  "gk-balance": Object.freeze(["gk-set-feet", "gk-body-shape", "gk-one-v-one"]),
  "gk-angle": Object.freeze(["gk-narrow-angle", "gk-protect-centre", "gk-body-shape"]),
  "gk-patience": Object.freeze(["gk-one-v-one", "gk-body-shape", "gk-set-feet"]),
  "gk-footwork": Object.freeze(["gk-set-feet", "gk-reset", "gk-narrow-angle"]),
  "gk-box": Object.freeze(["gk-cross", "gk-catch-or-parry", "gk-through-ball", "gk-high-start", "gk-attack-start"]),
  "gk-centre": Object.freeze(["gk-protect-centre", "gk-narrow-angle", "gk-set-feet"]),
  "gk-rebound": Object.freeze(["gk-second-ball", "gk-reset", "gk-catch-or-parry"]),
  "gk-calm": Object.freeze(["gk-safe-restart", "gk-organize", "gk-catch-or-parry"]),
  "cb-position": Object.freeze(["cb-goal-side", "cb-front-foot", "cb-step"]),
  "cb-depth": Object.freeze(["cb-check-runner", "cb-track-channel", "cb-hold-lane"]),
  "cb-body": Object.freeze(["cb-goal-side", "cb-check-runner", "cb-step"]),
  "cb-aerial": Object.freeze(["cb-aerial-contact", "cb-clear-wide", "cb-box-distance"]),
  "cb-cover": Object.freeze(["cb-track-channel", "cb-hold-lane", "cb-box-distance"]),
  "cb-line": Object.freeze(["cb-box-distance", "cb-check-runner", "cb-hold-lane"]),
  "cb-patience": Object.freeze(["cb-front-foot", "cb-delay", "cb-step"]),
  "cb-first-pass": Object.freeze(["cb-open-pass", "cb-simple-exit", "cb-front-foot", "cb-forward-pass"]),
  "cb-libero-progress": Object.freeze(["cb-step-midfield-press", "cb-reset-after-setback", "cb-open-pass"]),
  "cb-carry-cover": Object.freeze(["cb-carry-first-press", "cb-cover-wingback"]),
  "fb-two-way": Object.freeze(["fb-reset-line", "fb-recovery-run", "fb-inside-first"]),
  "fb-duel": Object.freeze(["fb-show-line", "fb-block-cross", "fb-touchline-trap"]),
  "fb-overlap": Object.freeze(["fb-overlap-timing", "fb-support-angle", "fb-early-delivery"]),
  "fb-distance": Object.freeze(["fb-inside-first", "fb-back-post-scan", "fb-simple-inside-pass"]),
  "fb-recovery": Object.freeze(["fb-recovery-run", "fb-reset-line", "fb-back-post-scan"]),
  "fb-width": Object.freeze(["fb-support-angle", "fb-early-delivery", "fb-overlap-timing"]),
  "fb-back-post": Object.freeze(["fb-back-post-scan", "fb-inside-first", "fb-block-cross"]),
  "fb-transition": Object.freeze(["fb-reset-line", "fb-recovery-run", "fb-overlap-timing"]),
  "fb-inside-option": Object.freeze(["fb-inside-support", "fb-simple-inside-pass"]),
  "fb-direct-goal-run": Object.freeze(["fb-run-beyond", "fb-finish-through-pass"]),
  "fb-carry-balance": Object.freeze(["fb-carry-out-pressure", "fb-reset-line"]),
  "fb-role-shift": Object.freeze(["fb-shift-inside", "fb-hold-unit"]),
  "dm-screen": Object.freeze(["dm-hold-zone", "dm-lane-block", "dm-delay-counter"]),
  "dm-scan": Object.freeze(["dm-open-body", "dm-safe-turn", "dm-two-touch"]),
  "dm-balance": Object.freeze(["dm-hold-zone", "dm-cover-fullback", "dm-follow-pass"]),
  "dm-first-pass": Object.freeze(["dm-two-touch", "dm-open-body", "dm-reset"]),
  "dm-second-ball": Object.freeze(["dm-second-ball-action", "dm-hold-zone"]),
  "dm-tempo": Object.freeze(["dm-switch", "dm-reset", "dm-break-line"]),
  "dm-cover": Object.freeze(["dm-cover-fullback", "dm-hold-zone", "dm-delay-counter"]),
  "dm-pressure": Object.freeze(["dm-safe-turn", "dm-two-touch", "dm-open-body"]),
  "dm-recovery-tackle": Object.freeze(["dm-match-run", "dm-tackle-goal-side"]),
  "mf-tempo": Object.freeze(["mf-pause", "mf-switch-angle", "mf-simple-reset", "mf-receive-beyond-press"]),
  "mf-angle": Object.freeze(["mf-side-on", "mf-switch-angle", "mf-move-after"]),
  "mf-scan": Object.freeze(["mf-half-turn", "mf-first-touch", "mf-release-runner"]),
  "mf-progression": Object.freeze([
    "mf-carry-gap", "mf-release-runner", "mf-first-touch", "mf-beat-defender-carry", "mf-early-forward-pass"
  ]),
  "mf-support": Object.freeze(["mf-move-after", "mf-third-player", "mf-between-lines"]),
  "mf-space": Object.freeze(["mf-between-lines", "mf-half-turn", "mf-release-runner"]),
  "mf-turn": Object.freeze(["mf-first-touch", "mf-side-on", "mf-carry-gap"]),
  "mf-pressure": Object.freeze(["mf-protect-ball", "mf-first-touch", "mf-simple-reset"]),
  "mf-transition": Object.freeze(["mf-counterpress", "mf-carry-gap", "mf-simple-reset"]),
  "mf-late-run": Object.freeze(["mf-late-box", "mf-move-after", "mf-between-lines"]),
  "mf-versatility": Object.freeze([
    "mf-move-after", "mf-third-player", "mf-simple-reset", "mf-balance-two-way"
  ]),
  "mf-left-narrow": Object.freeze(["mf-open-pitch-pass", "mf-distance-shot"]),
  "mf-vertical-run": Object.freeze(["mf-drive-forward", "mf-cutback"]),
  "mf-corner-seam": Object.freeze(["mf-corner-arrival", "mf-repeat-corner-route"]),
  "wing-isolation": Object.freeze(["wing-touch-away", "wing-stop-start", "wing-carry-head-up", "wing-force-retreat"]),
  "wing-change-pace": Object.freeze(["wing-stop-start", "wing-outside-inside", "wing-touch-away"]),
  "wing-width": Object.freeze(["wing-outside-inside", "wing-early-cross", "wing-release-overlap"]),
  "wing-inside": Object.freeze(["wing-halfspace", "wing-return-pass", "wing-outside-inside"]),
  "wing-first-touch": Object.freeze(["wing-touch-away", "wing-carry-head-up", "wing-stop-start"]),
  "wing-far-post": Object.freeze(["wing-far-post-run", "wing-carry-head-up"]),
  "wing-combination": Object.freeze(["wing-release-overlap", "wing-return-pass", "wing-chance-making"]),
  "wing-transition": Object.freeze(["wing-carry-head-up", "wing-stop-start", "wing-touch-away"]),
  "wing-create-score": Object.freeze(["wing-chance-making", "wing-halfspace", "wing-cutback"]),
  "wing-backpass-run": Object.freeze(["wing-attack-backpass", "wing-round-goalkeeper"]),
  "fw-run": Object.freeze(["fw-start-run", "fw-delay-run", "fw-near-post"]),
  "fw-reference": Object.freeze(["fw-pin", "fw-body-return", "fw-face-goal"]),
  "fw-separation": Object.freeze(["fw-box-pause", "fw-delay-run", "fw-pull-wide"]),
  "fw-finish": Object.freeze(["fw-one-touch", "fw-box-pause", "fw-near-post"]),
  "fw-channel": Object.freeze(["fw-pull-wide", "fw-start-run", "fw-delay-run"]),
  "fw-link": Object.freeze(["fw-body-return", "fw-layoff-turn", "fw-pin"]),
  "fw-box": Object.freeze(["fw-second-ball", "fw-rebound", "fw-box-pause"]),
  "fw-press": Object.freeze(["fw-press-curve", "fw-second-ball"]),
  "fw-blindside": Object.freeze(["fw-delay-run", "fw-near-post", "fw-pull-wide"]),
  "fw-receive": Object.freeze(["fw-body-return", "fw-layoff-turn", "fw-pin", "fw-check-to-feet", "fw-counter-arrival"]),
  "fw-organise-movement": Object.freeze(["fw-overload-press", "fw-draw-release", "fw-body-return"]),
  "fw-manipulate": Object.freeze(["fw-draw-release", "fw-pull-wide", "fw-body-return"]),
  "fw-space-arrival": Object.freeze(["fw-leave-expected-zone", "fw-arrive-decisive-zone"]),
  "pl-support": Object.freeze(["pl-angle", "pl-follow", "pl-distance"]),
  "pl-space": Object.freeze(["pl-scan", "pl-width", "pl-angle"]),
  "pl-first-touch": Object.freeze(["pl-release", "pl-protect", "pl-return"]),
  "pl-simple": Object.freeze(["pl-return", "pl-release", "pl-reset"]),
  "pl-awareness": Object.freeze(["pl-scan", "pl-angle", "pl-reset"]),
  "pl-balance": Object.freeze(["pl-follow", "pl-width", "pl-reset"]),
  "pl-continuity": Object.freeze(["pl-follow", "pl-release", "pl-angle"]),
  "pl-recovery": Object.freeze(["pl-counter", "pl-second", "pl-reset"])
});

export function historicalActionSupportsSignature(signatureId, actionId) {
  return Boolean(HISTORICAL_SIGNATURE_ACTION_SUPPORTS[signatureId]?.includes(actionId));
}

export const HISTORICAL_STYLE_SHAPES = Object.freeze([
  "two-cues", "build-two-cues", "quality-defines", "one-another", "key-another", "foundation-watch",
  "paired-observation", "two-clues", "separating-clue", "repeated-evidence", "quality-defines-game", "different-phase"
]);

function editorialContextIndex() {
  const contexts = new Map();
  for (const [yearText, edition] of Object.entries(HISTORICAL_HIGHLIGHTS.editions || {})) {
    const year = Number(yearText);
    for (const row of edition.rows || []) {
      for (const starter of row || []) {
        for (const selection of [starter, ...(starter.honourables || [])]) {
          contexts.set(factKey(selection.playerName, selection.teamName, year), {
            playerName: selection.playerName,
            teamName: selection.teamName,
            year,
            position: selection.position || "",
            reason: String(selection.reason?.en || "")
          });
        }
      }
    }
  }
  return contexts;
}

const EDITORIAL_CONTEXTS = editorialContextIndex();

function historicalEditorialContextForProfile(profile, catalogKey) {
  const exact = EDITORIAL_CONTEXTS.get(factKey(profile.name, profile.teamName, profile.tournamentYear));
  if (exact) return { ...exact, link: "exact" };
  const identityName = historicalIdentityNameKey(profile.name, profile.teamName);
  const identityTeam = normalizeTeamName(profile.teamName);
  const year = Number(profile.tournamentYear);
  return [...EDITORIAL_CONTEXTS.values()]
    .filter((context) => (
      historicalIdentityNameKey(context.playerName, context.teamName) === identityName
      && normalizeTeamName(context.teamName) === identityTeam
      && historicalStyleCatalogKeyForRole(
        historicalRoleFromPosition(context.position, context.reason)
      ) === catalogKey
    ))
    .sort((left, right) => (
      Math.abs(left.year - year) - Math.abs(right.year - year)
      || Number(right.year <= year) - Number(left.year <= year)
      || right.year - left.year
    ))
    .map((context) => ({ ...context, link: "recurring-role" }))[0] || null;
}

function historicalRoleFromPosition(positionValue, reasonValue = "") {
  const position = String(positionValue || "").toLocaleLowerCase("en-US");
  const reason = String(reasonValue || "").toLocaleLowerCase("en-US");
  if (/\bgk\b|goalkeeper/.test(position)) return "goalkeeper";
  if (/wing[ -]?back/.test(position)) return "wing-back";
  if (/\b(?:rb|lb)\b|right[ -]?back|left[ -]?back|full[ -]?back/.test(position)) return "full-back";
  if (/\bcb\b|centre[ -]?back|center[ -]?back/.test(position)) return "centre-back";
  if (/defender|back/.test(position)) return "defender";
  if (/\bdm\b|defensive midfielder|holding midfielder/.test(position)) return "defensive-midfielder";
  if (
    /\bcm\b|central midfielder|midfielder/.test(position)
    && /\bscreen(?:s|ed|ing)? (?:[a-z'’-]+ )?(?:back line|back four|back 4|transitions)\b/.test(reason)
  ) {
    return "defensive-midfielder";
  }
  if (/\bcm\b|central midfielder/.test(position)) return "central-midfielder";
  if (/\bam\b|attacking midfielder/.test(position)) return "attacking-midfielder";
  if (/\b(?:lw|rw|lm|rm)\b|winger|left forward|right forward/.test(position)) return "wide-attacker";
  if (/\b(?:ss|f9)\b|second striker|false nine/.test(position)) return "second-striker";
  if (/\bst\b|striker|centre[ -]?forward|center[ -]?forward/.test(position)) return "striker";
  if (/midfielder|midfield/.test(position)) return "midfielder";
  if (/forward/.test(position)) return "forward";
  return "player";
}

let historicalExactRoleEvidence = new Map();
let historicalIdentityRoleEvidence = new Map();
let historicalRoleGuideVariantByProfileKey = new Map();

// These are reviewed corrections for editions where every archive-facing source only says
// "Defender" or "Forward" even though the player's tournament role is not in doubt. They resolve
// the positional family only. They are never treated as evidence for a particular technique.
export const HISTORICAL_REVIEWED_ROLE_OVERRIDES = Object.freeze({
  "Vilmos Kohut / Hungary / 1938": "striker",
  "Sven Jacobsson / Sweden / 1938": "midfielder",
  "Tore Keller / Sweden / 1938": "striker",
  "Ernst Lörtscher / Switzerland / 1938": "midfielder",
  "George Robledo / Chile / 1950": "striker",
  "Ernesto Vidal / Uruguay / 1950": "forward",
  "Julio Pérez / Uruguay / 1950": "forward",
  "Jimmy Dickinson / England / 1954": "midfielder",
  "József Tóth / Hungary / 1954": "wide-attacker",
  "Raúl Cárdenas / Mexico / 1954": "centre-back",
  "Luis Cruz / Uruguay / 1954": "defender",
  "Ivica Horvat / Yugoslavia / 1954": "centre-back",
  "Marcos Coll / Colombia / 1962": "midfielder",
  "Ivan Davidov / Bulgaria / 1966": "full-back",
  "Ivan Vutsov / Bulgaria / 1966": "centre-back",
  "Andranik Eskandarian / Iran / 1978": "defender",
  "Jozef Barmoš / Czechoslovakia / 1982": "full-back",
  "József Tóth / Hungary / 1982": "full-back",
  "Lázár Szentes / Hungary / 1982": "striker",
  "Włodzimierz Ciołek / Poland / 1982": "midfielder",
  "Stéphane Demol / Belgium / 1986": "centre-back",
  "Kwang-rae Cho / South Korea / 1986": "midfielder",
  "Milan Luhový / Czechoslovakia / 1990": "striker",
  "Youssef Chippo / Morocco / 1998": "midfielder",
  "Pierre van Hooijdonk / Netherlands / 1998": "striker",
  "Tom Boyd / Scotland / 1998": "defender",
  "Pierre Issa / South Africa / 1998": "centre-back",
  "Jeff Agoos / USA / 2002": "defender",
  "Sead Kolašinac / Bosnia-Herzegovina / 2014": "full-back",
  "John Boye / Ghana / 2014": "centre-back",
  "Aziz Bouhaddouz / Morocco / 2018": "striker",
  "Thiago Cionek / Poland / 2018": "centre-back",
  "Jack Grealish / England / 2022": "wide-attacker",
  "Carlos Soler / Spain / 2022": "central-midfielder",
  "Dani Alves / Brazil / 2014": "full-back",
  "Marcelo / Brazil / 2014": "full-back",
  "Cristiano Ronaldo / Portugal / 2006": "wide-attacker",
  "Cristiano Ronaldo / Portugal / 2010": "wide-attacker",
  "Cristiano Ronaldo / Portugal / 2014": "wide-attacker",
  "Maxime Bossis / France / 1982": "defender",
  "Sergio Ramos / Spain / 2018": "centre-back",
  "Robin van Persie / Netherlands / 2014": "striker",
  "Kevin De Bruyne / Belgium / 2022": "attacking-midfielder",
  "Xavi / Spain / 2002": "central-midfielder",
  "Xavi / Spain / 2010": "central-midfielder",
  "Ronaldinho / Brazil / 2006": "attacking-midfielder",
  "Giorgos Karagounis / Greece / 2010": "central-midfielder",
  "Kostas Katsouranis / Greece / 2010": "defensive-midfielder",
  "Alexandros Tziolis / Greece / 2010": "defensive-midfielder",
  "Kaká / Brazil / 2006": "attacking-midfielder",
  "Kaká / Brazil / 2010": "attacking-midfielder",
  "Thierry Henry / France / 1998": "wide-attacker",
  "Cristiano Ronaldo / Portugal / 2018": "striker",
  "Cristiano Ronaldo / Portugal / 2022": "striker",
  "Alberto Gilardino / Italy / 2006": "striker",
  "Alessandro Del Piero / Italy / 2006": "second-striker",
  "Filippo Inzaghi / Italy / 2006": "striker",
  "Francesco Totti / Italy / 2006": "attacking-midfielder",
  "Vincenzo Iaquinta / Italy / 2006": "wide-attacker",
  "Clarence Seedorf / Netherlands / 1998": "central-midfielder",
  "Arie Haan / Netherlands / 1974": "central-midfielder",
  "Jackson Irvine / Australia / 2022": "central-midfielder",
  "Ritsu Dōan / Japan / 2022": "wide-attacker",
  "Bernardo Silva / Portugal / 2018": "wide-attacker",
  "Andrés Escobar / Colombia / 1994": "defender",
  "Daniel Agger / Denmark / 2010": "centre-back",
  "Jorge Costa / Portugal / 2002": "centre-back",
  "Joseph Yobo / Nigeria / 2014": "centre-back",
  "Rafik Halliche / Algeria / 2014": "centre-back",
  "Ahmed Fathy / Egypt / 2018": "full-back",
  "Yassine Meriah / Tunisia / 2018": "centre-back",
  "Cacau / Germany / 2010": "striker",
  "Paolo Maldini / Italy / 1990": "full-back",
  "Paolo Maldini / Italy / 1994": "full-back",
  "Claude Makélélé / France / 2006": "defensive-midfielder",
  "Gennaro Gattuso / Italy / 2006": "defensive-midfielder",
  "Egisto Pandolfini / Italy / 1954": "forward",
  "Obdulio Varela / Uruguay / 1954": "defensive-midfielder",
  "Carlos Alberto / Brazil / 1970": "full-back",
  "Roberto Perfumo / Argentina / 1974": "centre-back",
  "Branko Oblak / Yugoslavia / 1974": "midfielder",
  "Ilija Petković / Yugoslavia / 1974": "midfielder",
  "René Houseman / Argentina / 1978": "wide-attacker",
  "Hansi Müller / West Germany / 1978": "midfielder",
  "Oscar / Brazil / 1982": "centre-back",
  "László Dajka / Hungary / 1986": "midfielder",
  "Sergei Aleinikov / Soviet Union / 1986": "midfielder",
  "Sergey Rodionov / Soviet Union / 1986": "forward",
  "Oleksandr Zavarov / Soviet Union / 1990": "midfielder",
  "Uwe Bein / West Germany / 1990": "midfielder",
  "Kiko / Spain / 1998": "forward",
  "Oliver Bierhoff / Germany / 2002": "striker",
  "Carles Puyol / Spain / 2002": "full-back",
  "Lionel Messi / Argentina / 2006": "wide-attacker",
  "Petit / Portugal / 2006": "midfielder",
  "Cristian Zaccardo / Italy / 2006": "full-back",
  "Liédson / Portugal / 2010": "striker",
  "Raul Meireles / Portugal / 2010": "midfielder",
  "Simão / Portugal / 2010": "wide-attacker",
  "Blaise Matuidi / France / 2014": "midfielder",
  "Moussa Sissoko / France / 2014": "midfielder",
  "Sami Khedira / Germany / 2014": "midfielder",
  "Noel Valladares / Honduras / 2014": "goalkeeper",
  "Aziz Behich / Australia / 2018": "full-back",
  "Fernandinho / Brazil / 2018": "midfielder",
  "Edson Álvarez / Mexico / 2018": "full-back",
  "Peter Etebo / Nigeria / 2018": "midfielder",
  "Yann Sommer / Switzerland / 2018": "goalkeeper",
  "Dani Olmo / Spain / 2022": "wide-attacker",
  "György Sárosi / Hungary / 1934": "defensive-midfielder",
  "Gunnar Gren / Sweden / 1958": "central-midfielder",
  "Rivellino / Brazil / 1970": "central-midfielder",
  "Paul Breitner / West Germany / 1974": "full-back",
  "Dennis Bergkamp / Netherlands / 1998": "attacking-midfielder",
  "Rivaldo / Brazil / 2002": "striker",
  "Ümit Davala / Turkey / 2002": "wing-back",
  "Gianluca Zambrotta / Italy / 2006": "full-back",
  "Kevin De Bruyne / Belgium / 2018": "central-midfielder",
  "Kieran Trippier / England / 2018": "wing-back",
  "Antoine Griezmann / France / 2018": "second-striker",
  "Nahuel Molina / Argentina / 2022": "full-back",
  "Héctor Scarone / Uruguay / 1930": "attacking-midfielder",
  "Matthias Sindelar / Austria / 1934": "second-striker",
  "Zizinho / Brazil / 1950": "attacking-midfielder",
  "Ferenc Puskás / Hungary / 1954": "second-striker",
  "Nándor Hidegkuti / Hungary / 1954": "second-striker",
  "Fritz Walter / West Germany / 1954": "attacking-midfielder",
  "Raymond Kopa / France / 1958": "wide-attacker",
  "Kurt Hamrin / Sweden / 1958": "wide-attacker",
  "Lennart Skoglund / Sweden / 1958": "wide-attacker",
  "Igor Chislenko / Soviet Union / 1966": "wide-attacker",
  "Helmut Haller / West Germany / 1966": "attacking-midfielder",
  "Teófilo Cubillas / Peru / 1970": "attacking-midfielder",
  "Grzegorz Lato / Poland / 1974": "wide-attacker",
  "Zbigniew Boniek / Poland / 1982": "wide-attacker",
  "Diego Maradona / Argentina / 1990": "attacking-midfielder",
  "Tomas Brolin / Sweden / 1994": "attacking-midfielder",
  "Michael Laudrup / Denmark / 1998": "attacking-midfielder",
  "Hasan Şaş / Turkey / 2002": "wide-attacker",
  "Ángel Di María / Argentina / 2014": "wide-attacker",
  "Lionel Messi / Argentina / 2014": "attacking-midfielder"
});
const HISTORICAL_REVIEWED_ROLE_SOURCES = Object.freeze({
  "Ronaldinho / Brazil / 2006": "reviewed-role-override:2002-best-xi-am"
});

const visibleCorrection = (position, addSkills, removeSkills = [], source = "reviewed exact tournament role") => Object.freeze({
  position,
  addSkills: Object.freeze(addSkills),
  removeSkills: Object.freeze(removeSkills),
  source
});

// These are the only non-style fields this refresh is allowed to correct. Every entry resolves a
// visible card position (and only contradicted role-derived skill pills) from reviewed exact-edition
// evidence. Tournament facts such as goals, starter status and penalty involvement remain untouched.
export const HISTORICAL_REVIEWED_VISIBLE_PROFILE_CORRECTIONS = Object.freeze({
  "Vilmos Kohut / Hungary / 1938": visibleCorrection("Striker", ["Striker"], ["Player"], "reviewed 1938 squad role"),
  "Sven Jacobsson / Sweden / 1938": visibleCorrection("Midfielder", ["Midfielder"], ["Player"], "reviewed 1938 squad role"),
  "Tore Keller / Sweden / 1938": visibleCorrection("Striker", ["Striker"], ["Player"], "reviewed 1938 squad role"),
  "Ernst Lörtscher / Switzerland / 1938": visibleCorrection("Midfielder", ["Midfielder"], ["Player"], "reviewed 1938 squad role"),
  "George Robledo / Chile / 1950": visibleCorrection("Striker", ["Striker"], ["Player"], "reviewed 1950 squad role"),
  "Ernesto Vidal / Uruguay / 1950": visibleCorrection("Forward", ["Forward"], ["Player"], "reviewed 1950 squad role"),
  "Julio Pérez / Uruguay / 1950": visibleCorrection("Forward", ["Forward"], ["Player"], "reviewed 1950 inside-forward role"),
  "Jimmy Dickinson / England / 1954": visibleCorrection("Midfielder", ["Midfielder"], ["Player"], "reviewed 1954 squad role"),
  "József Tóth / Hungary / 1954": visibleCorrection("Winger", ["Winger"], ["Player"], "reviewed 1954 right-wing role"),
  "Raúl Cárdenas / Mexico / 1954": visibleCorrection("Centre-back", ["Centre-back"], ["Player"], "reviewed 1954 squad role"),
  "Luis Cruz / Uruguay / 1954": visibleCorrection("Defender", ["Defender"], ["Player"], "reviewed 1954 squad role"),
  "Ivica Horvat / Yugoslavia / 1954": visibleCorrection("Centre-back", ["Centre-back"], ["Player"], "reviewed 1954 squad role"),
  "Marcos Coll / Colombia / 1962": visibleCorrection("Midfielder", ["Midfielder"], ["Player"], "reviewed 1962 squad role"),
  "Ivan Davidov / Bulgaria / 1966": visibleCorrection("Right-back", ["Full-back"], ["Player"], "reviewed 1966 right-back lineup role"),
  "Ivan Vutsov / Bulgaria / 1966": visibleCorrection("Centre-back", ["Centre-back"], ["Player"], "reviewed 1966 squad role"),
  "Andranik Eskandarian / Iran / 1978": visibleCorrection("Defender", ["Defender"], ["Player"], "reviewed 1978 squad role"),
  "Jozef Barmoš / Czechoslovakia / 1982": visibleCorrection("Full-back", ["Full-back"], ["Player"], "reviewed 1982 squad role"),
  "József Tóth / Hungary / 1982": visibleCorrection("Left-back", ["Full-back"], ["Player"], "reviewed 1982 left-back role"),
  "Lázár Szentes / Hungary / 1982": visibleCorrection("Striker", ["Striker"], ["Player"], "reviewed 1982 squad role"),
  "Włodzimierz Ciołek / Poland / 1982": visibleCorrection("Midfielder", ["Midfielder"], ["Player"], "reviewed 1982 squad role"),
  "Stéphane Demol / Belgium / 1986": visibleCorrection("Centre-back", ["Centre-back"], ["Player"], "reviewed 1986 squad role"),
  "Kwang-rae Cho / South Korea / 1986": visibleCorrection("Midfielder", ["Midfielder"], ["Player"], "reviewed 1986 squad role"),
  "Milan Luhový / Czechoslovakia / 1990": visibleCorrection("Striker", ["Striker"], ["Player"], "reviewed 1990 squad role"),
  "Youssef Chippo / Morocco / 1998": visibleCorrection("Midfielder", ["Midfielder"], ["Player"], "reviewed 1998 squad role"),
  "Pierre van Hooijdonk / Netherlands / 1998": visibleCorrection("Striker", ["Striker"], ["Player"], "reviewed 1998 squad role"),
  "Tom Boyd / Scotland / 1998": visibleCorrection("Defender", ["Defender"], ["Player"], "reviewed 1998 squad role"),
  "Pierre Issa / South Africa / 1998": visibleCorrection("Centre-back", ["Centre-back"], ["Player"], "reviewed 1998 squad role"),
  "Jeff Agoos / USA / 2002": visibleCorrection("Defender", ["Defender"], ["Player"], "reviewed 2002 squad role"),
  "Sead Kolašinac / Bosnia-Herzegovina / 2014": visibleCorrection("Full-back", ["Full-back"], ["Player"], "reviewed 2014 left-back role"),
  "John Boye / Ghana / 2014": visibleCorrection("Centre-back", ["Centre-back"], ["Player"], "reviewed 2014 squad role"),
  "Aziz Bouhaddouz / Morocco / 2018": visibleCorrection("Striker", ["Striker"], ["Player"], "reviewed 2018 squad role"),
  "Thiago Cionek / Poland / 2018": visibleCorrection("Centre-back", ["Centre-back"], ["Player"], "reviewed 2018 squad role"),
  "Jack Grealish / England / 2022": visibleCorrection("Winger", ["Winger"], ["Player"], "reviewed 2022 wide-attacker role"),
  "Carlos Soler / Spain / 2022": visibleCorrection("Central midfielder", ["Central midfielder"], ["Player"], "reviewed 2022 midfield role"),
  "Dani Alves / Brazil / 2014": visibleCorrection("Full-back", ["Full-back"]),
  "Marcelo / Brazil / 2014": visibleCorrection("Full-back", ["Full-back"]),
  "Sergio Ramos / Spain / 2018": visibleCorrection("Centre-back", ["Centre-back"]),
  "Robin van Persie / Netherlands / 2014": visibleCorrection("Striker", ["Striker"]),
  "Kevin De Bruyne / Belgium / 2022": visibleCorrection("Attacking midfielder", ["Attacking midfielder"]),
  "Xavi / Spain / 2002": visibleCorrection("Central midfielder", ["Central midfielder"]),
  "Xavi / Spain / 2010": visibleCorrection("Central midfielder", ["Central midfielder"], ["Attacking midfielder"], "2010 exact-edition central-midfield role"),
  "Ronaldinho / Brazil / 2006": visibleCorrection("Attacking midfielder", ["Attacking midfielder"]),
  "Giorgos Karagounis / Greece / 2010": visibleCorrection(
    "Central midfielder", ["Central midfielder"], ["Runs in behind"], "FIFA squad list and UEFA central-midfield profile"
  ),
  "Kostas Katsouranis / Greece / 2010": visibleCorrection(
    "Defensive midfielder", ["Defensive midfielder"], ["Runs in behind"], "FIFA squad list and UEFA holding-midfield profile"
  ),
  "Alexandros Tziolis / Greece / 2010": visibleCorrection(
    "Defensive midfielder", ["Defensive midfielder"], ["Runs in behind"], "FIFA squad list and UEFA defensive-midfield profile"
  ),
  "Kaká / Brazil / 2006": visibleCorrection("Attacking midfielder", ["Attacking midfielder"]),
  "Kaká / Brazil / 2010": visibleCorrection("Attacking midfielder", ["Attacking midfielder"]),
  "Thierry Henry / France / 1998": visibleCorrection("Winger", ["Winger"]),
  "Cristiano Ronaldo / Portugal / 2006": visibleCorrection("Winger", ["Winger"]),
  "Cristiano Ronaldo / Portugal / 2010": visibleCorrection("Winger", ["Winger"]),
  "Cristiano Ronaldo / Portugal / 2014": visibleCorrection("Winger", ["Winger"]),
  "Cristiano Ronaldo / Portugal / 2018": visibleCorrection("Striker", ["Striker"]),
  "Cristiano Ronaldo / Portugal / 2022": visibleCorrection("Striker", ["Striker"]),
  "Alberto Gilardino / Italy / 2006": visibleCorrection("Striker", ["Striker"]),
  "Alessandro Del Piero / Italy / 2006": visibleCorrection("Second striker", ["Second striker"]),
  "Filippo Inzaghi / Italy / 2006": visibleCorrection("Striker", ["Striker"]),
  "Francesco Totti / Italy / 2006": visibleCorrection(
    "Attacking midfielder", ["Attacking midfielder"], ["Runs in behind"], "FIFA 2006 semifinal role review"
  ),
  "Vincenzo Iaquinta / Italy / 2006": visibleCorrection("Winger", ["Winger"]),
  "Clarence Seedorf / Netherlands / 1998": visibleCorrection(
    "Central midfielder", ["Central midfielder"], ["Runs in behind"], "pinned 1998 starter position codes"
  ),
  "Arie Haan / Netherlands / 1974": visibleCorrection("Central midfielder", ["Central midfielder"], [], "pinned 1974 starter position codes"),
  "Jackson Irvine / Australia / 2022": visibleCorrection(
    "Central midfielder", ["Central midfielder"], ["Runs in behind"], "pinned 2022 starts and current canonical role"
  ),
  "Ritsu Dōan / Japan / 2022": visibleCorrection("Winger", ["Winger"], [], "pinned 2022 starts and current canonical role"),
  "Bernardo Silva / Portugal / 2018": visibleCorrection("Winger", ["Winger"], [], "pinned 2018 starter position codes"),
  "Andrés Escobar / Colombia / 1994": visibleCorrection("Defender", ["Defender"], ["Player"], "pinned 1994 starter position codes"),
  "Daniel Agger / Denmark / 2010": visibleCorrection("Centre-back", ["Centre-back"], ["Player"], "pinned 2010 starter position codes"),
  "Jorge Costa / Portugal / 2002": visibleCorrection("Centre-back", ["Centre-back"], ["Player"], "pinned 2002 starter position codes"),
  "Joseph Yobo / Nigeria / 2014": visibleCorrection("Centre-back", ["Centre-back"], ["Player"], "pinned 2014 starter position codes"),
  "Rafik Halliche / Algeria / 2014": visibleCorrection("Centre-back", ["Centre-back"], ["Player"], "pinned 2014 starter position codes"),
  "Ahmed Fathy / Egypt / 2018": visibleCorrection("Full-back", ["Full-back"], ["Player"], "pinned 2018 starter position codes"),
  "Yassine Meriah / Tunisia / 2018": visibleCorrection("Centre-back", ["Centre-back"], ["Player"], "pinned 2018 starter position codes"),
  "Cacau / Germany / 2010": visibleCorrection("Striker", ["Striker"], ["Player"], "pinned 2010 starter position codes"),
  "Paolo Maldini / Italy / 1990": visibleCorrection("Left-back", ["Full-back"], ["Centre-back"], "pinned 1990 starter-position evidence"),
  "Paolo Maldini / Italy / 1994": visibleCorrection("Left-back", ["Full-back"], [], "1994 Best XI hybrid left-back and centre-back rationale"),
  "Claude Makélélé / France / 2006": visibleCorrection("Defensive midfielder", ["Defensive midfielder"], ["Central midfielder"], "2006 Best XI holding-midfield rationale"),
  "Gennaro Gattuso / Italy / 2006": visibleCorrection("Defensive midfielder", ["Defensive midfielder"], ["Central midfielder"], "2006 Best XI holding-midfield rationale"),
  "Egisto Pandolfini / Italy / 1954": visibleCorrection("Forward", ["Forward"], ["Player"]),
  "Obdulio Varela / Uruguay / 1954": visibleCorrection("Defensive midfielder", ["Defensive midfielder"], ["Player"]),
  "Carlos Alberto / Brazil / 1970": visibleCorrection("Right-back", ["Full-back"], ["Player"], "1970 Best XI right-back role"),
  "Roberto Perfumo / Argentina / 1974": visibleCorrection("Centre-back", ["Centre-back"], ["Player"]),
  "Branko Oblak / Yugoslavia / 1974": visibleCorrection("Midfielder", ["Midfielder"], ["Player"]),
  "Ilija Petković / Yugoslavia / 1974": visibleCorrection("Midfielder", ["Midfielder"], ["Player"], "1974 tournament roster and right-midfield role"),
  "René Houseman / Argentina / 1978": visibleCorrection("Winger", ["Winger"], ["Player"]),
  "Hansi Müller / West Germany / 1978": visibleCorrection("Midfielder", ["Midfielder"], ["Player"]),
  "Oscar / Brazil / 1982": visibleCorrection("Centre-back", ["Centre-back"], ["Player"]),
  "Maxime Bossis / France / 1982": visibleCorrection("Defender", ["Defender"], ["Player"]),
  "László Dajka / Hungary / 1986": visibleCorrection("Midfielder", ["Midfielder"], ["Player"]),
  "Sergei Aleinikov / Soviet Union / 1986": visibleCorrection("Midfielder", ["Midfielder"], ["Player"]),
  "Sergey Rodionov / Soviet Union / 1986": visibleCorrection("Forward", ["Forward"], ["Player"]),
  "Oleksandr Zavarov / Soviet Union / 1990": visibleCorrection("Midfielder", ["Midfielder"], ["Player"]),
  "Uwe Bein / West Germany / 1990": visibleCorrection("Midfielder", ["Midfielder"], ["Player"]),
  "Kiko / Spain / 1998": visibleCorrection("Forward", ["Forward"], ["Player"]),
  "Oliver Bierhoff / Germany / 2002": visibleCorrection("Striker", ["Striker"], ["Player"]),
  "Carles Puyol / Spain / 2002": visibleCorrection("Right-back", ["Full-back"], ["Player", "Centre-back"], "2002 exact-edition right-back role"),
  "Lionel Messi / Argentina / 2006": visibleCorrection("Winger", ["Winger"], ["Player"]),
  "Petit / Portugal / 2006": visibleCorrection("Midfielder", ["Midfielder"], ["Player"]),
  "Cristian Zaccardo / Italy / 2006": visibleCorrection("Right-back", ["Full-back"], ["Player"], "2006 exact-edition right-sided defender role"),
  "Liédson / Portugal / 2010": visibleCorrection("Striker", ["Striker"], ["Player"]),
  "Raul Meireles / Portugal / 2010": visibleCorrection("Midfielder", ["Midfielder"], ["Player"]),
  "Simão / Portugal / 2010": visibleCorrection("Winger", ["Winger"], ["Player"]),
  "Blaise Matuidi / France / 2014": visibleCorrection("Midfielder", ["Midfielder"], ["Player"]),
  "Moussa Sissoko / France / 2014": visibleCorrection("Midfielder", ["Midfielder"], ["Player"], "2014 tournament midfield classification"),
  "Sami Khedira / Germany / 2014": visibleCorrection("Midfielder", ["Midfielder"], ["Player"]),
  "Noel Valladares / Honduras / 2014": visibleCorrection("Goalkeeper", ["Goalkeeper"], ["Player"]),
  "Aziz Behich / Australia / 2018": visibleCorrection("Full-back", ["Full-back"], ["Player"]),
  "Fernandinho / Brazil / 2018": visibleCorrection("Midfielder", ["Midfielder"], ["Player"]),
  "Edson Álvarez / Mexico / 2018": visibleCorrection("Full-back", ["Full-back"], ["Player", "Centre-back"], "2018 exact-lineup right-back role"),
  "Peter Etebo / Nigeria / 2018": visibleCorrection("Midfielder", ["Midfielder"], ["Player"]),
  "Yann Sommer / Switzerland / 2018": visibleCorrection("Goalkeeper", ["Goalkeeper"], ["Player"]),
  "Dani Olmo / Spain / 2022": visibleCorrection("Winger", ["Winger"], ["Player", "Attacking midfielder"], "2022 exact-lineup left-attacker role"),
  "György Sárosi / Hungary / 1934": visibleCorrection("Defensive midfielder", ["Defensive midfielder"], ["Runs in behind"]),
  "Gunnar Gren / Sweden / 1958": visibleCorrection("Central midfielder", ["Central midfielder"], ["Runs in behind"]),
  "Rivellino / Brazil / 1970": visibleCorrection("Central midfielder", ["Central midfielder"], ["Runs in behind"], "1970 Best XI central-left midfield role"),
  "Paul Breitner / West Germany / 1974": visibleCorrection("Left-back", ["Full-back"], [], "1974 exact-edition left-back role"),
  "Dennis Bergkamp / Netherlands / 1998": visibleCorrection("Attacking midfielder", ["Attacking midfielder"], ["Second striker"]),
  "Rivaldo / Brazil / 2002": visibleCorrection("Striker", ["Striker"], ["Tempo control"]),
  "Ümit Davala / Turkey / 2002": visibleCorrection("Wing-back", ["Wing-back"], ["Runs in behind"]),
  "Gianluca Zambrotta / Italy / 2006": visibleCorrection("Right-back", ["Full-back"], [], "2006 Best XI right-back role"),
  "Kevin De Bruyne / Belgium / 2018": visibleCorrection("Central midfielder", ["Central midfielder"], ["Right forward"]),
  "Kieran Trippier / England / 2018": visibleCorrection("Wing-back", ["Wing-back"], ["Tempo control"]),
  "Antoine Griezmann / France / 2018": visibleCorrection("Second striker", ["Second striker"], ["Tempo control"]),
  "Nahuel Molina / Argentina / 2022": visibleCorrection("Right-back", ["Full-back"], ["Right wing back"], "2022 Best XI right-back role"),
  "Héctor Scarone / Uruguay / 1930": visibleCorrection("Attacking midfielder", ["Attacking midfielder"], ["Runs in behind"]),
  "Matthias Sindelar / Austria / 1934": visibleCorrection("Second striker", ["Second striker"], [], "1934 Best XI withdrawing centre-forward role"),
  "Zizinho / Brazil / 1950": visibleCorrection("Attacking midfielder", ["Attacking midfielder"], ["Runs in behind"]),
  "Nándor Hidegkuti / Hungary / 1954": visibleCorrection("Second striker", ["Second striker"], [], "1954 Best XI withdrawn centre-forward role"),
  "Fritz Walter / West Germany / 1954": visibleCorrection("Attacking midfielder", ["Attacking midfielder"], ["Runs in behind"]),
  "Raymond Kopa / France / 1958": visibleCorrection("Winger", ["Winger"], ["Tempo control"]),
  "Kurt Hamrin / Sweden / 1958": visibleCorrection("Winger", ["Winger"], ["Tempo control"]),
  "Lennart Skoglund / Sweden / 1958": visibleCorrection("Winger", ["Winger"], ["Tempo control"]),
  "Igor Chislenko / Soviet Union / 1966": visibleCorrection("Winger", ["Winger"], ["Tempo control"]),
  "Helmut Haller / West Germany / 1966": visibleCorrection("Attacking midfielder", ["Attacking midfielder"], ["Runs in behind"]),
  "Teófilo Cubillas / Peru / 1970": visibleCorrection("Attacking midfielder", ["Attacking midfielder"], ["Runs in behind"]),
  "Grzegorz Lato / Poland / 1974": visibleCorrection("Winger", ["Winger"], ["Tempo control"]),
  "Zbigniew Boniek / Poland / 1982": visibleCorrection("Winger", ["Winger"], ["Tempo control"]),
  "Diego Maradona / Argentina / 1990": visibleCorrection("Attacking midfielder", ["Attacking midfielder"], ["Runs in behind"]),
  "Tomas Brolin / Sweden / 1994": visibleCorrection("Attacking midfielder", ["Attacking midfielder"], ["Runs in behind"]),
  "Michael Laudrup / Denmark / 1998": visibleCorrection("Attacking midfielder", ["Attacking midfielder"], ["Runs in behind"]),
  "Hasan Şaş / Turkey / 2002": visibleCorrection("Winger", ["Winger"], ["Runs in behind"]),
  "Ángel Di María / Argentina / 2014": visibleCorrection("Winger", ["Winger"], ["Tempo control"]),
  "Lionel Messi / Argentina / 2014": visibleCorrection("Attacking midfielder", ["Attacking midfielder"], ["Runs in behind"])
});

function applyReviewedVisibleProfileCorrections(profiles, targetYears) {
  const changedProfileKeys = new Set();
  for (const [profileKey, correction] of Object.entries(HISTORICAL_REVIEWED_VISIBLE_PROFILE_CORRECTIONS)) {
    const profile = profiles[profileKey];
    if (!profile) continue;
    if (targetYears && !targetYears.has(Number(profile.tournamentYear))) continue;
    const nextSkills = [...new Set([
      ...(profile.skills || []).filter((skill) => !correction.removeSkills.includes(skill)),
      ...correction.addSkills
    ])];
    if (profile.position !== correction.position) {
      profile.position = correction.position;
      changedProfileKeys.add(profileKey);
    }
    if (JSON.stringify(profile.skills || []) !== JSON.stringify(nextSkills)) {
      profile.skills = nextSkills;
      changedProfileKeys.add(profileKey);
    }
  }
  return changedProfileKeys;
}

function historicalRoleIdentityKey(name, teamName) {
  return [historicalIdentityNameKey(name, teamName), normalizeTeamName(teamName)].join("|");
}

function historicalRoleFamily(role) {
  if (role === "goalkeeper") return "goalkeeper";
  if (["centre-back", "full-back", "wing-back", "defender"].includes(role)) return "defender";
  if (["defensive-midfielder", "central-midfielder", "attacking-midfielder", "midfielder"].includes(role)) {
    return "midfielder";
  }
  if (["wide-attacker", "striker", "second-striker", "forward"].includes(role)) return "forward";
  return "player";
}

function historicalRoleSpecificity(role) {
  if (!role) return -1;
  if (role === "player") return 0;
  if (["defender", "midfielder", "forward"].includes(role)) return 1;
  return 2;
}

function historicalRolesAreCompatible(baseRole, candidateRole) {
  if (baseRole === "player" || candidateRole === "player") return true;
  return historicalRoleFamily(baseRole) === historicalRoleFamily(candidateRole);
}

function addHistoricalRoleEvidence(name, teamName, year, role, source, priority) {
  if (!name || !teamName || role === "player") return;
  const item = Object.freeze({ role, source, priority, year: Number(year) });
  const exactKey = factKey(name, teamName, year);
  if (!historicalExactRoleEvidence.has(exactKey)) historicalExactRoleEvidence.set(exactKey, []);
  historicalExactRoleEvidence.get(exactKey).push(item);
  const identityKey = historicalRoleIdentityKey(name, teamName);
  if (!historicalIdentityRoleEvidence.has(identityKey)) historicalIdentityRoleEvidence.set(identityKey, []);
  historicalIdentityRoleEvidence.get(identityKey).push(item);
}

function addHistoricalRoleSlot(nameOrNames, teamName, year, role, source, priority) {
  for (const name of Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames]) {
    addHistoricalRoleEvidence(name, teamName, year, role, source, priority);
  }
}

// Position labels in the profile archive are intentionally broad in many editions. Build a
// read-only evidence index from exact Best XI positions, historical lineup slots and the same
// player's better-resolved editions before generating copy. This resolves role, not technique.
export function configureHistoricalRoleEvidence(
  profilesValue = {},
  historyData = {},
  { currentProfiles = {}, teams = {} } = {}
) {
  historicalExactRoleEvidence = new Map();
  historicalIdentityRoleEvidence = new Map();
  const profiles = Array.isArray(profilesValue)
    ? profilesValue.map((entry) => Array.isArray(entry) ? entry[1] : entry)
    : Object.values(profilesValue || {});
  const profilesByKey = new Map(profiles.map((profile) => [profile.profileKey, profile]));

  for (const profile of profiles) {
    addHistoricalRoleEvidence(
      profile.name,
      profile.teamName,
      profile.tournamentYear,
      historicalRoleFromPosition(profile.position),
      "profile-position",
      70
    );
    for (const skill of profile.skills || []) {
      const role = historicalRoleFromPosition(skill);
      if (historicalRoleSpecificity(role) < 2) continue;
      addHistoricalRoleEvidence(
        profile.name,
        profile.teamName,
        profile.tournamentYear,
        role,
        "profile-role-skill",
        90
      );
    }
  }
  for (const context of EDITORIAL_CONTEXTS.values()) {
    addHistoricalRoleEvidence(
      context.playerName,
      context.teamName,
      context.year,
      historicalRoleFromPosition(context.position, context.reason),
      "best-xi-position",
      100
    );
  }
  for (const fixture of historyData.fixtures || []) {
    const year = Number(fixture.tournamentYear);
    for (const side of ["home", "away"]) {
      const teamName = side === "home" ? fixture.homeSlot : fixture.awaySlot;
      for (const player of fixture.keyPlayers?.[side] || []) {
        addHistoricalRoleEvidence(
          player.name,
          teamName,
          year,
          historicalRoleFromPosition(player.position),
          "fixture-key-player-position",
          80
        );
      }
      const slots = fixture.keyInformation?.localeModel?.[side]?.slots;
      addHistoricalRoleSlot(slots?.matchup?.defender, teamName, year, "defender", "lineup-matchup-slot", 55);
      addHistoricalRoleSlot(slots?.plan?.defender, teamName, year, "defender", "lineup-plan-slot", 60);
      addHistoricalRoleSlot(slots?.plan?.midfielders, teamName, year, "midfielder", "lineup-plan-slot", 60);
      addHistoricalRoleSlot(slots?.plan?.attackers, teamName, year, "forward", "lineup-plan-slot", 60);
    }
  }

  const teamEntries = Array.isArray(teams) ? teams : (teams.teams || []);
  const teamNamesById = new Map();
  for (const team of teamEntries) {
    const names = [team.name, team.officialName, team.shortName].filter(Boolean);
    teamNamesById.set(team.id, names);
  }
  const currentProfileEntries = Array.isArray(currentProfiles)
    ? currentProfiles
    : Object.values(currentProfiles.profiles || currentProfiles || {});
  for (const currentProfile of currentProfileEntries) {
    const currentRole = historicalRoleFromPosition(currentProfile.position);
    if (currentRole === "player") continue;
    const currentTeamNames = teamNamesById.get(currentProfile.teamId) || [];
    for (const profile of profiles) {
      if (
        historicalIdentityNameKey(currentProfile.name, currentTeamNames[0] || profile.teamName)
          !== historicalIdentityNameKey(profile.name, profile.teamName)
        || !currentTeamNames.some((teamName) => normalizeTeamName(teamName) === normalizeTeamName(profile.teamName))
      ) {
        continue;
      }
      addHistoricalRoleEvidence(
        profile.name,
        profile.teamName,
        profile.tournamentYear,
        currentRole,
        "current-canonical-position",
        85
      );
    }
  }

  for (const [profileKey, role] of Object.entries(HISTORICAL_REVIEWED_ROLE_OVERRIDES)) {
    const profile = profilesByKey.get(profileKey);
    if (!profile) continue;
    addHistoricalRoleEvidence(
      profile.name,
      profile.teamName,
      profile.tournamentYear,
      role,
      HISTORICAL_REVIEWED_ROLE_SOURCES[profileKey] || "reviewed-role-override",
      130
    );
  }
  assignHistoricalRoleGuideVariants(profiles);
}

function selectExactHistoricalRole(profile, baseRole) {
  const candidates = historicalExactRoleEvidence.get(
    factKey(profile.name, profile.teamName, profile.tournamentYear)
  ) || [];
  return candidates
    .filter((item) => (
      item.source.startsWith("reviewed-role-override")
      || historicalRolesAreCompatible(baseRole, item.role)
    ))
    .sort((left, right) => (
      historicalRoleSpecificity(right.role) - historicalRoleSpecificity(left.role)
      || right.priority - left.priority
      || left.role.localeCompare(right.role)
    ))[0] || null;
}

function selectRecurringHistoricalRole(profile, baseRole) {
  const year = Number(profile.tournamentYear);
  const candidates = historicalIdentityRoleEvidence.get(
    historicalRoleIdentityKey(profile.name, profile.teamName)
  ) || [];
  return candidates
    .filter((item) => historicalRoleSpecificity(item.role) > historicalRoleSpecificity(baseRole))
    .filter((item) => historicalRolesAreCompatible(baseRole, item.role))
    .sort((left, right) => (
      Math.abs(left.year - year) - Math.abs(right.year - year)
      || Number(right.year <= year) - Number(left.year <= year)
      || right.priority - left.priority
      || right.year - left.year
      || left.role.localeCompare(right.role)
    ))[0] || null;
}

export function inferHistoricalStyleRoleEvidence(profile) {
  const editorial = EDITORIAL_CONTEXTS.get(factKey(profile.name, profile.teamName, profile.tournamentYear));
  let role = historicalRoleFromPosition(
    editorial?.position || profile.position,
    editorial?.reason
  );
  let source = editorial ? "best-xi-position" : "profile-position";
  let priority = editorial ? 100 : 70;
  const exactEvidence = selectExactHistoricalRole(profile, role);
  if (
    exactEvidence
    && (
      exactEvidence.source.startsWith("reviewed-role-override")
      || historicalRoleSpecificity(exactEvidence.role) > historicalRoleSpecificity(role)
      || (exactEvidence.role === role && exactEvidence.priority > priority)
    )
  ) {
    role = exactEvidence.role;
    source = exactEvidence.source;
    priority = exactEvidence.priority;
  }
  const recurringEvidence = selectRecurringHistoricalRole(profile, role);
  if (recurringEvidence) {
    role = recurringEvidence.role;
    source = `recurring:${recurringEvidence.source}`;
    priority = recurringEvidence.priority;
  }
  return Object.freeze({ role, source, priority });
}

export function inferHistoricalStyleRole(profile) {
  return inferHistoricalStyleRoleEvidence(profile).role;
}

export function historicalStyleCatalogKeyForRole(role) {
  if (role === "goalkeeper") return "goalkeeper";
  if (["centre-back", "defender"].includes(role)) return "central_defender";
  if (["full-back", "wing-back"].includes(role)) return "wide_defender";
  if (role === "defensive-midfielder") return "holding_midfielder";
  if (["central-midfielder", "attacking-midfielder", "midfielder"].includes(role)) return "midfielder";
  if (role === "wide-attacker") return "wide_attacker";
  if (["striker", "second-striker", "forward"].includes(role)) return "striker";
  return "player";
}

function hasConvertedPenaltyEvidence(fact) {
  return fact.goalEvents.some((event) => event.penalty)
    || fact.keyEvents.some((event) => /converted in the shootout/i.test(event.note));
}

function hasMissedShootoutEvidence(fact) {
  return fact.keyEvents.some((event) => /took a shootout penalty/i.test(event.note));
}

function styleEvidence(profile, fact, editorial) {
  const tags = [];
  if (editorial) {
    tags.push("editorial-best-xi");
    if (editorial.link === "recurring-role") tags.push("editorial-recurring-role");
  }
  if (Number(profile.goals || 0) > 0) tags.push("goal-scorer");
  if (Number(profile.goals || 0) > 1) tags.push("multi-goal");
  if (fact.goalEvents.some((event) => event.penalty)) tags.push("penalty-goal");
  if (fact.keyEvents.some((event) => /converted in the shootout/i.test(event.note))) tags.push("shootout-converted");
  if (hasMissedShootoutEvidence(fact)) tags.push("shootout-missed");
  if ((profile.skills || []).includes("Starter") || isStarter(profile, fact)) tags.push("starter");
  if ((profile.skills || []).includes("Impact sub")) tags.push("impact-sub");
  return tags;
}

export function historicalGoalSpecialForRole(role) {
  if (["centre-back", "defender", "full-back", "wing-back"].includes(role)) {
    return HISTORICAL_SPECIAL_STYLE_PHRASES.goal.defender;
  }
  if (["defensive-midfielder", "central-midfielder", "attacking-midfielder", "midfielder"].includes(role)) {
    return HISTORICAL_SPECIAL_STYLE_PHRASES.goal.midfielder;
  }
  if (["striker", "second-striker", "forward", "wide-attacker"].includes(role)) {
    return HISTORICAL_SPECIAL_STYLE_PHRASES.goal.forward;
  }
  // A recorded scorer whose position was not resolved still needs one modest, goal-supported
  // attacking beat. The forward special avoids inventing a more specific positional claim.
  if (role === "player") return HISTORICAL_SPECIAL_STYLE_PHRASES.goal.forward;
  return null;
}

const EDITORIAL_HINT_ALTERNATES = Object.freeze({
  "gk-patience": ["gk-patience", "gk-angle", "gk-balance"],
  "gk-box": ["gk-box", "gk-calm", "gk-centre"],
  "gk-angle": ["gk-angle", "gk-footwork", "gk-centre"],
  "gk-rebound": ["gk-rebound", "gk-balance", "gk-calm"],
  "gk-balance": ["gk-balance", "gk-footwork", "gk-patience"],
  "gk-one-v-one": ["gk-one-v-one", "gk-narrow-angle", "gk-body-shape"],
  "gk-cross": ["gk-cross", "gk-catch-or-parry", "gk-organize"],
  "gk-second-ball": ["gk-second-ball", "gk-reset", "gk-catch-or-parry"],
  "gk-organize": ["gk-organize", "gk-protect-centre", "gk-reset"],
  "cb-aerial": ["cb-aerial", "cb-body", "cb-position"],
  "cb-line": ["cb-line", "cb-depth", "cb-cover"],
  "cb-cover": ["cb-cover", "cb-depth", "cb-patience"],
  "cb-first-pass": ["cb-first-pass", "cb-body", "cb-patience"],
  "cb-position": ["cb-position", "cb-body", "cb-patience"],
  "cb-aerial-contact": ["cb-aerial-contact", "cb-box-distance", "cb-clear-wide"],
  "cb-open-pass": ["cb-open-pass", "cb-simple-exit", "cb-front-foot"],
  "cb-track-channel": ["cb-track-channel", "cb-delay", "cb-hold-lane"],
  "cb-goal-side": ["cb-goal-side", "cb-step", "cb-check-runner"],
  "fb-overlap": ["fb-overlap", "fb-width", "fb-two-way"],
  "fb-recovery": ["fb-recovery", "fb-transition", "fb-distance"],
  "fb-back-post": ["fb-back-post", "fb-distance", "fb-recovery"],
  "fb-duel": ["fb-duel", "fb-distance", "fb-two-way"],
  "fb-overlap-timing": ["fb-overlap-timing", "fb-support-angle", "fb-early-delivery"],
  "fb-recovery-run": ["fb-recovery-run", "fb-reset-line", "fb-inside-first"],
  "fb-early-delivery": ["fb-early-delivery", "fb-support-angle", "fb-underlap"],
  "fb-show-line": ["fb-show-line", "fb-block-cross", "fb-touchline-trap"],
  "dm-screen": ["dm-screen", "dm-balance", "dm-cover"],
  "dm-tempo": ["dm-tempo", "dm-first-pass", "dm-pressure"],
  "dm-cover": ["dm-cover", "dm-screen", "dm-second-ball"],
  "dm-second-ball": ["dm-second-ball", "dm-scan", "dm-balance"],
  "dm-open-body": ["dm-open-body", "dm-two-touch", "dm-follow-pass"],
  "dm-lane-block": ["dm-lane-block", "dm-hold-zone", "dm-delay-counter"],
  "dm-cover-fullback": ["dm-cover-fullback", "dm-hold-zone", "dm-reset"],
  "dm-second-ball-action": ["dm-second-ball-action", "dm-safe-turn", "dm-switch"],
  "mf-progression": ["mf-progression", "mf-turn", "mf-pressure"],
  "mf-scan": ["mf-scan", "mf-angle", "mf-support"],
  "mf-tempo": ["mf-tempo", "mf-support", "mf-transition"],
  "mf-transition": ["mf-transition", "mf-pressure", "mf-support"],
  "mf-late-run": ["mf-late-run", "mf-space", "mf-progression"],
  "mf-space": ["mf-space", "mf-scan", "mf-angle"],
  "mf-carry-gap": ["mf-carry-gap", "mf-first-touch", "mf-protect-ball"],
  "mf-release-runner": ["mf-release-runner", "mf-third-player", "mf-between-lines"],
  "mf-counterpress": ["mf-counterpress", "mf-simple-reset", "mf-move-after"],
  "mf-late-box": ["mf-late-box", "mf-half-turn", "mf-first-touch"],
  "mf-pause": ["mf-pause", "mf-switch-angle", "mf-side-on"],
  "wing-isolation": ["wing-isolation", "wing-first-touch", "wing-combination"],
  "wing-change-pace": ["wing-change-pace", "wing-transition", "wing-first-touch"],
  "wing-width": ["wing-width", "wing-inside", "wing-combination"],
  "wing-inside": ["wing-inside", "wing-combination", "wing-first-touch"],
  "wing-far-post": ["wing-far-post", "wing-width", "wing-transition"],
  "wing-touch-away": ["wing-touch-away", "wing-stop-start", "wing-carry-head-up"],
  "wing-stop-start": ["wing-stop-start", "wing-outside-inside", "wing-carry-head-up"],
  "wing-early-cross": ["wing-early-cross", "wing-cutback", "wing-release-overlap"],
  "wing-halfspace": ["wing-halfspace", "wing-return-pass", "wing-outside-inside"],
  "wing-far-post-run": ["wing-far-post-run", "wing-counterpress", "wing-press-angle"],
  "fw-link": ["fw-link", "fw-reference", "fw-receive"],
  "fw-run": ["fw-run", "fw-channel", "fw-blindside"],
  "fw-finish": ["fw-finish", "fw-box", "fw-separation"],
  "fw-press": ["fw-press", "fw-reference", "fw-channel"],
  "fw-reference": ["fw-reference", "fw-link", "fw-box"],
  "fw-body-return": ["fw-body-return", "fw-layoff-turn", "fw-face-goal"],
  "fw-start-run": ["fw-start-run", "fw-delay-run", "fw-pull-wide"],
  "fw-one-touch": ["fw-one-touch", "fw-shot-early", "fw-box-pause", "fw-rebound"],
  "fw-press-curve": ["fw-press-curve", "fw-second-ball", "fw-pull-wide"],
  "fw-near-post": ["fw-near-post", "fw-pin", "fw-second-ball"],
  "pl-support": ["pl-support", "pl-continuity", "pl-awareness"],
  "pl-recovery": ["pl-recovery", "pl-balance", "pl-simple"],
  "pl-angle": ["pl-angle", "pl-follow", "pl-distance"],
  "pl-counter": ["pl-counter", "pl-second", "pl-reset"]
});

const ON_BALL_CARRY_EVIDENCE_PATTERN = /\bcarried the ball\b|\bcarried(?: [^.;]{0,48})? (?:forward|upfield|up the pitch|through pressure)\b|\bcarrying(?: the ball)? (?:forward|through pressure|through the centre|out of pressure|past pressure)\b|\bcarrying broke lines\b|\bcarries\b|\b(?:a|the) carry\b|\bcarry (?:forward|through pressure)\b/;
const DEFENSIVE_RECOVERY_EVIDENCE_PATTERN = /\brecovery (?:pace|work|speed|running|duty|tackle|save)\b|\brecoveries\b|\brecover(?:ed|ing) (?:quickly|fast(?: enough)?|into|outside|behind|for|at)\b/;
const COVER_EVIDENCE_PATTERN = /\bcover(?:s|ed|ing)?\b|\bcoverage\b|\bsweep(?:s|ing|er)?\b/;
const COVER_ACTION_EVIDENCE_PATTERN = /\bcover(?:s|ed|ing)?\b|\bcoverage\b|\bsweep(?:s|ing|er)?\b/;
const STRIKER_LINK_EVIDENCE_PATTERN = /\bhold(?:s|ing)?\b|\bheld\b|\blink(?:s|ed|ing)?\b|\blay(?:s|ing)?(?: the ball)? off\b|\blay-?offs?\b|\bcombin(?:e|es|ed|ing|ation|ations)\b/;
const STRIKER_RUN_EVIDENCE_PATTERN = /\b(?:diagonal|blind-side|well-timed|timed|penetrating) runs?\b|\bruns? (?:in|into|beyond|behind|across|from|toward|towards)\b|\brunning (?:in|into|beyond|behind|across|from|toward|towards)\b|\bmovement (?:across|beyond|behind|from|into|toward|towards)\b|\bin behind\b|\bchannels?\b/;
const STRIKER_SEPARATION_EVIDENCE_PATTERN = /\b(?:drift(?:s|ed|ing)?|drop(?:s|ped|ping)?) (?:off|away from)\b|\bmovement away from\b|\b(?:creat(?:e|es|ed|ing)|find(?:s|ing)?) (?:the )?separation\b|\bseparat(?:e|ed|ing|ion) [^.;]{0,24}\b(?:defenders?|markers?|centre-backs?|center-backs?)\b|\blose (?:his )?marker\b|\buntrack/;
const STRIKER_REFERENCE_EVIDENCE_PATTERN = /\btarget(?: man)?\b|\boutlet\b|\boccup(?:y|ies|ied|ying) (?:the |a )?centre-backs?\b|\bpin(?:s|ned|ning)? (?:the |a )?centre-backs?\b|\baerial (?:duels?|balls?|target|outlet)\b|\bwon aerial balls?\b/;
const STRIKER_HEADER_SPECIALIST_EVIDENCE_PATTERN = /\bheaders? (?:that were |were )?about timing\b|\bscored (?:one|two|three|four|five|six|\d+) headers?\b|\battacking crosses earlier\b/;
const STRIKER_AERIAL_ACTION_EVIDENCE_PATTERN = /\bnear-post\b|\battack(?:s|ed|ing)? crosses\b|\baerial (?:duels?|balls?)\b|\bwon aerial balls?\b/;
const WIDE_ISOLATION_EVIDENCE_PATTERN = /\bdribbl|\bduels?\b|\bbeat(?:s|ing)? (?:the first |his |a |one |two )?(?:defenders?|full-?backs?|markers?)\b/;
const WIDE_INSIDE_EVIDENCE_PATTERN = /\b(?:cut(?:s|ting)?|drift(?:s|ed|ing)?|mov(?:e|es|ed|ing)|attack(?:s|ed|ing)?|step(?:s|ped|ping)?) [^.;]{0,18}\binside\b|\binside-(?:left|right)\b|\b(?:inside|left|right) channels?\b|\bhalf-space\b/;
const WIDE_WIDTH_EVIDENCE_PATTERN = /\bcross(?:es|ed|ing)?\b|\bwidth\b|\bwide\b|\bstretch(?:es|ed|ing)?\b/;
// A penalty save is an observable result, but it does not establish how a goalkeeper manages an
// open-play one-on-one. Keep those evidence routes separate so the rationale parser cannot turn a
// saved kick into claims about patience, angle narrowing or body shape.
const GK_ONE_ON_ONE_EVIDENCE_PATTERN = /\bone-on-one\b|\bone v one\b|\b1v1\b/;
const GK_PENALTY_SAVE_EVIDENCE_PATTERN = /\bsav(?:e|ed|ing) [^.;]{0,56}\b(?:penalt(?:y|ies)|shootouts?|kicks?)\b|\b(?:penalt(?:y|ies)|shootout kicks?)[^.;]{0,40}\b(?:saved|stopped|denied)\b|\btwo shootouts\b/;
const GK_NON_SAVE_PENALTY_PATTERN = /\bpenalty-area\b|\bconceded [^.;]{0,36}\bpenalt(?:y|ies)\b/;
const GK_POSITION_EVIDENCE_PATTERN = /\bposition(?:s|ed|ing)?\b|\bstarting position\b|\bangles?\b/;
const GK_COMPOSURE_EVIDENCE_PATTERN = /\bcalm(?:ness)?\b|\bcompos(?:ed|ure)\b|\bsecure last line\b|\bcalm handling\b/;
const GK_SWEEPER_EVIDENCE_PATTERN = /\bleave(?:s|ing)? (?:his )?box\b|\bsweep(?:s|ing)? behind\b|\bsweeper-keeper\b/;
const GK_FOOTWORK_EVIDENCE_PATTERN = /\bfootwork\b|\bsmall steps?\b/;
const MARKING_EVIDENCE_PATTERN = /\bmark(?:s|ed|ing)?\b|\bduels?\b|\bchallenges?\b|\btackl(?:e|es|ed|ing)\b/;
const PASS_EVIDENCE_PATTERN = /\bpass(?:es|ed|ing)?\b|\bdistribution\b|\btempo\b|\bdictat(?:e|es|ed|ing)\b/;
const MIDFIELD_VISION_EVIDENCE_PATTERN = /\bvision\b|\bscann(?:ed|ing)?\b|\bpassing angles?\b|\bthrough (?:ball|pass)\b|\breleas(?:e|es|ed|ing) (?:a |the )?(?:runner|forward|wide player)\b/;
const MIDFIELD_TEMPO_EVIDENCE_PATTERN = /\btempo\b|\brhythm\b|\bdictat(?:e|es|ed|ing)\b|\bcontrol(?:s|led|ling)? (?:the )?(?:game|match|tempo|rhythm)\b/;
const RECEIVING_PRESSURE_EVIDENCE_PATTERN = /\breceiv(?:e|es|ed|ing) under pressure\b|\bescape(?:s|d|ing)? pressure\b|\bturn(?:s|ed|ing)? out of pressure\b/;
const FULL_BACK_TRANSITION_EVIDENCE_PATTERN = /\b(?:shut|close|protect|cover|expose)(?:s|d|ed|ing)? (?:the )?transition(?: lane)?\b|\bdefensive transitions?\b|\btransition (?:defending|recovery|work|running|duels?)\b/;
const NARRATIVE_CARRY_PATTERN = /\bcarried out\b|\bcarry the holders through\b|\bcarried [a-z'’-]+ (?:into|to) the (?:quarter-finals?|semi-finals?|final)\b|\bcarried [a-z'’-]+ through [^.;]{0,32}\b(?:ties?|matches?|playoffs?)\b|\bcarried (?:a|an|the|his|her|their|[a-z'’-]+(?:'s)?) [^.;]{0,40}\b(?:creation|responsibility|workload|burden|attack|control)\b|\bcarrying (?:a|an|the|his|her|their) [^.;]{0,32}\b(?:creation|responsibility|workload|burden|attack|control)\b/;
const NARRATIVE_RECOVERY_PATTERN = /\brecover(?:ed|ing)? from\b|\brecovered (?:his|her|their|its) (?:authority|form|fitness|place|confidence)\b/;
const TOURNAMENT_RUN_PATTERN = /\b(?:quarter-final|semi-final|tournament|knockout|finals?) run\b|\brun (?:to|through) (?:the )?(?:quarter-finals?|semi-finals?|final)\b/;
const LINKING_MOVEMENT_AWAY_PATTERN = /\bmovement away from\b|\b(?:drift(?:s|ed|ing)?|drop(?:s|ped|ping)?) (?:off|away from)\b/;
const CB_SPACE_DEFENDING_EVIDENCE_PATTERN = /\bdefend(?:s|ed|ing)? (?:the )?(?:large|open|huge|enormous) spaces?\b|\bspace behind\b|\bdefend(?:s|ed|ing)? (?:the )?channels?\b/;
const CB_READING_COVER_EVIDENCE_PATTERN = /\bread(?:s|ing)? danger\b|\banticipation\b|\bswept behind\b|\bprotected [^.;]{0,36}\bfreedom\b/;
const CB_FRONT_FOOT_EVIDENCE_PATTERN = /\bfront-foot\b|\bdefend(?:s|ed|ing)? forward\b|\bstep(?:s|ped|ping)? in to intercept\b|\bintercept(?:s|ed|ing|ion)?\b/;
const CB_FIRST_PASS_EVIDENCE_PATTERN = /\b(?:diagonal|forward) passes?\b|\bpass(?:es|ed) through lines\b|\bdistribut(?:e|es|ed|ing) cleanly\b|\bball-playing\b|\badvanced through pressure\b/;
const CB_FIRST_CONTACT_EVIDENCE_PATTERN = /\b(?:attack(?:s|ed|ing)?|win(?:s|ning)?|won) (?:the )?first (?:ball|contact)s?\b/;
const FB_INSIDE_COVER_EVIDENCE_PATTERN = /\bdefend(?:s|ed|ing)? narrowly\b|\bnarrowing behind\b|\bcover(?:s|ed|ing)? inside\b|\bdisciplined positioning\b|\bfar-post cover\b/;
const FB_TWO_WAY_EVIDENCE_PATTERN = /\bdefensive balance\b|\bbalanc(?:e|es|ed|ing) [^.;]{0,42}\b(?:side|freedom|attack)\b|\bforward support\b|\btwo-way\b/;
const FB_DUEL_EVIDENCE_PATTERN = /\bone-on-one defender\b|\bfollowed [^.;]{0,24}\bwithout being dragged\b|\bcontested receptions\b|\bdefend(?:s|ed|ing)? assertively\b/;
const DM_POSITIONAL_EVIDENCE_PATTERN = /\banchor(?:s|ed|ing)?\b|\bcontrolled (?:the )?(?:space|deeper midfield)\b|\bcompetitive order\b/;
const DM_BALANCE_EVIDENCE_PATTERN = /\bball-winning balance\b|\btwo-way balance\b|\bmidfield balance\b/;
const DM_BUILDUP_EVIDENCE_PATTERN = /\bsplitting centre-backs in build-up\b|\bprogress(?:ed|es|ing) play under pressure\b/;
const MF_CONNECTION_EVIDENCE_PATTERN = /\blink(?:s|ed|ing)? (?:the )?(?:inside forwards|play|midfield)\b|\bconnect(?:s|ed|ing)? [^.;]{0,52}\b(?:forwards?|defence|midfield)\b|\bcombination play\b|\bmidfield combinations?\b/;
const MF_FORWARD_PASS_EVIDENCE_PATTERN = /\bvertical (?:passing|distribution)\b|\bearly (?:vertical )?passing\b|\bpassing forward early\b|\bforward passes?\b|\blong diagonal\b|\bswitch(?:es|ed|ing)? (?:the )?(?:play|attack)\b|\breleas(?:e|es|ed|ing) (?:the )?(?:runner|forward|wide player|[a-zà-öø-ÿ'’-]+)\b/;
const MF_BALL_SECURITY_EVIDENCE_PATTERN = /\bprotect(?:s|ed|ing)? possession\b|\bpasses? under pressure\b|\bmanipulat(?:e|ed|ing) pressure\b|\bfeint\b|\bglid(?:e|es|ed|ing) away from markers\b/;
const MF_LATE_ARRIVAL_EVIDENCE_PATTERN = /\bbox-to-box run\b|\bran beyond\b|\bforward run\b|\bdefining run\b|\barriv(?:e|es|ed|ing) beyond\b/;
const MF_CONTROL_EVIDENCE_PATTERN = /\bchose when [^.;]{0,42}\bplayed fast\b|\bslow(?:s|ed|ing)? matches?\b|\bpassing reset attacks\b|\bcontrolled (?:the )?(?:middle|midfield)\b/;
const WING_ISOLATION_REVIEW_PATTERN = /\bisolat(?:e|es|ed|ing)\b|\bone-(?:against|on)-one\b|\bright-hand corridor\b/;
const WING_INSIDE_REVIEW_PATTERN = /\binward movement\b|\bdrift(?:s|ed|ing)? in from\b|\bmoved? inside\b/;
const WING_FAR_POST_REVIEW_PATTERN = /\bfar-post\b|\barriv(?:e|es|ed|ing) from the flank\b|\bweak side\b|\battack(?:s|ed|ing)? the box\b/;
const WING_TRANSITION_REVIEW_PATTERN = /\bcarry(?:ing|ied) (?:counters?|transitions?)\b|\btransition outlet\b/;
const WING_COMBINATION_REVIEW_PATTERN = /\bcombin(?:e|es|ed|ing) sharply\b|\bcombinations? around\b/;
const STRIKER_GAP_RUN_EVIDENCE_PATTERN = /\battack(?:s|ed|ing)? (?:the )?(?:gaps?|back line|broken lines?)\b|\bstretch(?:es|ed|ing)? [^.;]{0,28}\bdefences?\b|\bacceleration across (?:the )?centre-back\b/;
const STRIKER_BOX_REFERENCE_EVIDENCE_PATTERN = /\bpenalty-box reference\b|\bpenalty-box threat\b|\bcentre-forward reference\b/;
const STRIKER_REBOUND_EVIDENCE_PATTERN = /\battack(?:s|ed|ing)? rebounds?\b/;
const COUNTERPRESS_EVIDENCE_PATTERN = /\bcounter-?press(?:es|ed|ing)?\b|\bpress(?:es|ed|ing)? (?:immediately |straight )?(?:after|when|once) (?:the )?(?:ball|possession) (?:is |was )?lost\b|\bafter (?:losing|the loss of) (?:the )?(?:ball|possession)[^.;]{0,36}\bpress(?:es|ed|ing)?\b|\bcloses? (?:the )?nearest return pass (?:after|when|once) (?:the )?(?:ball|possession) (?:is |was )?lost\b/;
const WING_STOP_START_EVIDENCE_PATTERN = /\bstop-start\b|\bpaus(?:e|es|ed|ing) [^.;]{0,48}\b(?:before|then) accelerat(?:e|es|ed|ing)\b|\bslow(?:s|ed|ing)? [^.;]{0,48}\bthen accelerat(?:e|es|ed|ing)\b|\bchange(?:s|d|ing)? (?:of )?pace after (?:the )?defender\b/;
const OPEN_BODY_RECEIVING_EVIDENCE_PATTERN = /\b(?:receiv(?:e|es|ed|ing)|set(?:s|ting)? himself) side-on\b|\bopen(?:s|ed|ing)? (?:his )?body (?:to|before|when) (?:receiv|pass|play)\b|\bbody shape (?:to|when) receiv(?:e|es|ed|ing)\b/;
const CB_OPEN_BODY_AFTER_RECOVERY_EVIDENCE_PATTERN = /\bopen(?:s|ed|ing)? (?:his )?body (?:after|once|when) (?:the )?(?:ball is won|recovery|interception|turnover|duel is won)\b|\b(?:after|once|when) (?:the )?(?:ball is won|recovery|interception|turnover|duel is won)[^.;]{0,48}\bopen(?:s|ed|ing)? (?:his )?body\b/;

function blockedEditorialSemanticIds(catalogKey, text) {
  const signatureIds = new Set();
  const actionIds = new Set();
  const block = (signatureId, actionId) => {
    if (signatureId) signatureIds.add(signatureId);
    if (actionId) actionIds.add(actionId);
  };

  if (NARRATIVE_CARRY_PATTERN.test(text)) {
    if (catalogKey === "central_defender") block("cb-first-pass", "cb-open-pass");
    if (catalogKey === "midfielder") block("mf-progression", "mf-carry-gap");
  }
  if (NARRATIVE_RECOVERY_PATTERN.test(text)) {
    if (catalogKey === "central_defender") block("cb-cover", "cb-track-channel");
    if (catalogKey === "wide_defender") block("fb-recovery", "fb-recovery-run");
    if (catalogKey === "holding_midfielder") block("dm-pressure", "dm-lane-block");
    if (catalogKey === "midfielder") block("mf-transition", "mf-counterpress");
    if (catalogKey === "player") block("pl-recovery", "pl-counter");
  }
  if (
    catalogKey === "goalkeeper"
    && (GK_NON_SAVE_PENALTY_PATTERN.test(text) || GK_PENALTY_SAVE_EVIDENCE_PATTERN.test(text))
    && !GK_ONE_ON_ONE_EVIDENCE_PATTERN.test(text)
  ) {
    block("gk-patience", "gk-one-v-one");
  }
  if (
    catalogKey === "wide_attacker"
    && /\brather than (?:waiting|staying) wide\b|\bnot [^.;]{0,24}\bwide\b/.test(text)
  ) {
    block("wing-width", "wing-early-cross");
  }
  if (
    catalogKey === "wide_attacker"
    && /\bcombin(?:e|es|ed|ing) inside\b/.test(text)
    && !WIDE_INSIDE_EVIDENCE_PATTERN.test(text)
  ) {
    block("wing-inside", "wing-halfspace");
  }
  if (catalogKey === "striker" && /\b(?:played|replay)\b/.test(text) && !STRIKER_LINK_EVIDENCE_PATTERN.test(text)) {
    block("fw-link", "fw-body-return");
  }
  if (catalogKey === "striker" && TOURNAMENT_RUN_PATTERN.test(text) && !STRIKER_RUN_EVIDENCE_PATTERN.test(text)) {
    block("fw-run", "fw-start-run");
  }
  if (catalogKey === "wide_attacker" && /\bbeat(?:s|ing)?\b/.test(text) && !WIDE_ISOLATION_EVIDENCE_PATTERN.test(text)) {
    block("wing-isolation", "wing-touch-away");
  }
  if (catalogKey === "striker" && /\bseparat/.test(text) && !STRIKER_SEPARATION_EVIDENCE_PATTERN.test(text)) {
    signatureIds.add("fw-separation");
  }
  if (catalogKey === "striker" && LINKING_MOVEMENT_AWAY_PATTERN.test(text)) {
    actionIds.add("fw-start-run");
  }
  if (catalogKey === "striker" && /\bmovement away from centre-forward\b/.test(text)) {
    signatureIds.add("fw-run");
    signatureIds.add("fw-separation");
  }
  if (
    catalogKey === "striker"
    && /\b(?:headers?|aerial|centre-backs?|center-backs?)\b/.test(text)
    && !STRIKER_REFERENCE_EVIDENCE_PATTERN.test(text)
  ) {
    signatureIds.add("fw-reference");
    if (
      !STRIKER_AERIAL_ACTION_EVIDENCE_PATTERN.test(text)
      && !STRIKER_HEADER_SPECIALIST_EVIDENCE_PATTERN.test(text)
    ) {
      actionIds.add("fw-near-post");
    }
  }
  if (
    catalogKey === "midfielder"
    && /\b(?:front|back) line\b/.test(text)
    && !/\bbetween (?:the |opposing |opponent'?s )?(?:midfield )?lines?\b|\bpockets?\b/.test(text)
  ) {
    signatureIds.add("mf-space");
  }
  return { signatureIds, actionIds };
}

function recurringEditorialBlockedSemanticIds(profile, catalogKey) {
  const identityName = historicalIdentityNameKey(profile.name, profile.teamName);
  const identityTeam = normalizeTeamName(profile.teamName);
  const signatureIds = new Set();
  const actionIds = new Set();
  for (const context of EDITORIAL_CONTEXTS.values()) {
    if (
      historicalIdentityNameKey(context.playerName, context.teamName) !== identityName
      || normalizeTeamName(context.teamName) !== identityTeam
    ) {
      continue;
    }
    const contextRole = inferHistoricalStyleRole({
      name: context.playerName,
      teamName: context.teamName,
      tournamentYear: context.year,
      position: context.position
    });
    if (historicalStyleCatalogKeyForRole(contextRole) !== catalogKey) continue;
    const blocked = blockedEditorialSemanticIds(
      catalogKey,
      String(context.reason || "").toLocaleLowerCase("en-US")
    );
    for (const id of blocked.signatureIds) signatureIds.add(id);
    for (const id of blocked.actionIds) actionIds.add(id);
  }
  return { signatureIds, actionIds };
}

function subjectAwareEditorialText(reason, playerName = "") {
  let text = String(reason || "");
  // Best XI rationales often finish by describing what a teammate could do because of the
  // selected player's work. Do not assign that teammate's technique back to the card subject.
  text = text.replace(
    /\b(?:allowing|letting|freeing|releasing)\s+[A-ZÀ-ÖØ-Þ][^,.;]{0,80}(?=[,.;]|$)/gu,
    ""
  );
  if (playerName) {
    const otherProperNameClause = new RegExp(
      `\\b(?:so|while)\\s+(?!${String(playerName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b)[A-ZÀ-ÖØ-Þ][^,.;]{0,64}`,
      "gu"
    );
    text = text.replace(otherProperNameClause, "");
  }
  return text.toLocaleLowerCase("en-US");
}

function editorialHints(catalogKey, reason, signatures, actions, playerName = "") {
  const text = subjectAwareEditorialText(reason, playerName);
  const blocked = blockedEditorialSemanticIds(catalogKey, text);
  const signaturePatterns = {
    goalkeeper: [
      [GK_ONE_ON_ONE_EVIDENCE_PATTERN, "gk-patience"], [/\bcross(?:es|ed|ing)?\b|high ball|aerial/, "gk-box"],
      [GK_SWEEPER_EVIDENCE_PATTERN, "gk-box"], [GK_FOOTWORK_EVIDENCE_PATTERN, "gk-footwork"],
      [GK_COMPOSURE_EVIDENCE_PATTERN, "gk-calm"], [GK_POSITION_EVIDENCE_PATTERN, "gk-angle"],
      [/rebound|second save/, "gk-rebound"], [/reflex/, "gk-balance"]
    ],
    central_defender: [
      [/libero|first press|point of attack/, "cb-libero-progress"],
      [/back line|offside|organis|organized/, "cb-line"], [/aerial|header|\bair\b/, "cb-aerial"],
      [CB_SPACE_DEFENDING_EVIDENCE_PATTERN, "cb-depth"],
      [CB_READING_COVER_EVIDENCE_PATTERN, "cb-cover"],
      [COVER_EVIDENCE_PATTERN, "cb-cover"], [CB_FIRST_CONTACT_EVIDENCE_PATTERN, "cb-aerial"],
      [
        /\bpassing\b|\bdistribution\b|\bplaymaker\b|\bprogress(?:ion|ed|es|ing)?\b/,
        "cb-first-pass"
      ],
      [ON_BALL_CARRY_EVIDENCE_PATTERN, "cb-first-pass"], [CB_FIRST_PASS_EVIDENCE_PATTERN, "cb-first-pass"],
      [CB_FRONT_FOOT_EVIDENCE_PATTERN, "cb-patience"], [/\bbody shape\b/, "cb-body"],
      [/\b(?:control(?:s|led|ling)?|defend(?:s|ed|ing)?|win(?:s|ning)?|won) (?:the )?box\b/, "cb-position"],
      [MARKING_EVIDENCE_PATTERN, "cb-position"]
    ],
    wide_defender: [
      [/overlap/, "fb-overlap"], [/\bwidth\b|crossing/, "fb-width"],
      [DEFENSIVE_RECOVERY_EVIDENCE_PATTERN, "fb-recovery"], [FULL_BACK_TRANSITION_EVIDENCE_PATTERN, "fb-recovery"],
      [/far[ -]post|back[ -]post/, "fb-back-post"], [FB_INSIDE_COVER_EVIDENCE_PATTERN, "fb-distance"],
      [FB_TWO_WAY_EVIDENCE_PATTERN, "fb-two-way"], [FB_DUEL_EVIDENCE_PATTERN, "fb-duel"],
      [MARKING_EVIDENCE_PATTERN, "fb-duel"]
    ],
    holding_midfielder: [
      [/screen|close the centre|in front of (?:the )?defence/, "dm-screen"],
      [DM_POSITIONAL_EVIDENCE_PATTERN, "dm-screen"], [DM_BALANCE_EVIDENCE_PATTERN, "dm-balance"],
      [DM_BUILDUP_EVIDENCE_PATTERN, "dm-first-pass"],
      [COVER_ACTION_EVIDENCE_PATTERN, "dm-cover"], [/\bprotect(?:s|ed|ing)?\b/, "dm-cover"], [PASS_EVIDENCE_PATTERN, "dm-tempo"],
      [RECEIVING_PRESSURE_EVIDENCE_PATTERN, "dm-pressure"],
      [/second ball|duel/, "dm-second-ball"]
    ],
    midfielder: [
      [/versatil|held .*midfield together/, "mf-versatility"],
      [ON_BALL_CARRY_EVIDENCE_PATTERN, "mf-progression"], [/dribbl/, "mf-progression"],
      [MIDFIELD_VISION_EVIDENCE_PATTERN, "mf-scan"], [MF_FORWARD_PASS_EVIDENCE_PATTERN, "mf-scan"],
      [MF_CONNECTION_EVIDENCE_PATTERN, "mf-support"], [MF_BALL_SECURITY_EVIDENCE_PATTERN, "mf-pressure"],
      [MIDFIELD_TEMPO_EVIDENCE_PATTERN, "mf-tempo"], [COUNTERPRESS_EVIDENCE_PATTERN, "mf-transition"],
      [DEFENSIVE_RECOVERY_EVIDENCE_PATTERN, "mf-transition"],
      [/late (?:run|arriv)|arriv(?:e|ed|ing) late|dropped [^.;]{0,24} off the front line|surging finishes/, "mf-late-run"],
      [MF_LATE_ARRIVAL_EVIDENCE_PATTERN, "mf-late-run"], [MF_CONTROL_EVIDENCE_PATTERN, "mf-tempo"],
      [/\bbetween (?:the |opposing |opponent'?s )?(?:midfield )?lines?\b|\bpockets?\b|\bhalf-space\b/, "mf-space"]
    ],
    wide_attacker: [
      [/creator and scorer|chance-making|chance creation/, "wing-create-score"],
      [ON_BALL_CARRY_EVIDENCE_PATTERN, "wing-transition"],
      [WING_TRANSITION_REVIEW_PATTERN, "wing-transition"],
      [WIDE_ISOLATION_EVIDENCE_PATTERN, "wing-isolation"], [WING_ISOLATION_REVIEW_PATTERN, "wing-isolation"],
      [WING_STOP_START_EVIDENCE_PATTERN, "wing-change-pace"],
      [WIDE_WIDTH_EVIDENCE_PATTERN, "wing-width"], [WIDE_INSIDE_EVIDENCE_PATTERN, "wing-inside"],
      [WING_INSIDE_REVIEW_PATTERN, "wing-inside"], [WING_COMBINATION_REVIEW_PATTERN, "wing-combination"],
      [/far[ -]post|back[ -]post/, "wing-far-post"], [WING_FAR_POST_REVIEW_PATTERN, "wing-far-post"]
    ],
    striker: [
      [/not a fixed striker|organising force|organizing force|create overload|movement away from centre-forward/, "fw-organise-movement"],
      [/manipulat(?:e|ed|ing) defenders/, "fw-manipulate"],
      [STRIKER_LINK_EVIDENCE_PATTERN, "fw-link"], [STRIKER_RUN_EVIDENCE_PATTERN, "fw-run"],
      [STRIKER_GAP_RUN_EVIDENCE_PATTERN, "fw-run"],
      [STRIKER_SEPARATION_EVIDENCE_PATTERN, "fw-separation"],
      [/finisher|finishing|shooting|shot threat|\btight-window finish\b|\badjust(?:ed|ing) his feet\b|\bconverter\b|\bfinished early\b|\bpenalty-box positioning\b|\bscored twice [^.;]{0,64}\band twice in the final\b/, "fw-finish"],
      [STRIKER_HEADER_SPECIALIST_EVIDENCE_PATTERN, "fw-finish"],
      [/\bpress(?:ed|es|ing)?\b/, "fw-press"], [STRIKER_REFERENCE_EVIDENCE_PATTERN, "fw-reference"],
      [STRIKER_BOX_REFERENCE_EVIDENCE_PATTERN, "fw-reference"], [STRIKER_REBOUND_EVIDENCE_PATTERN, "fw-box"]
    ],
    player: [
      [/\bsupport(?:s|ed|ing)?\b|\bpass(?:es|ed|ing)?\b|\bcombin(?:e|es|ed|ing|ation|ations)\b/, "pl-support"],
      [COUNTERPRESS_EVIDENCE_PATTERN, "pl-recovery"],
      [DEFENSIVE_RECOVERY_EVIDENCE_PATTERN, "pl-recovery"]
    ]
  };
  const actionPatterns = {
    goalkeeper: [
      [GK_ONE_ON_ONE_EVIDENCE_PATTERN, "gk-one-v-one"], [/\bcross(?:es|ed|ing)?\b|high ball/, "gk-cross"],
      [GK_SWEEPER_EVIDENCE_PATTERN, "gk-through-ball"], [GK_FOOTWORK_EVIDENCE_PATTERN, "gk-set-feet"],
      [/\bhandling\b/, "gk-catch-or-parry"], [/\bstarting attacks cleanly\b|\bpassing option\b|\bbuild-up\b/, "gk-safe-restart"],
      [/rebound/, "gk-second-ball"], [/organis|command/, "gk-organize"]
    ],
    central_defender: [
      [/calm after conceding|reset the final|reset the match/, "cb-reset-after-setback"],
      [/step(?:ped)? into midfield|support the press/, "cb-step-midfield-press"],
      [/aerial|header/, "cb-aerial-contact"], [CB_FIRST_CONTACT_EVIDENCE_PATTERN, "cb-aerial-contact"],
      [CB_OPEN_BODY_AFTER_RECOVERY_EVIDENCE_PATTERN, "cb-open-pass"],
      [CB_SPACE_DEFENDING_EVIDENCE_PATTERN, "cb-track-channel"],
      [CB_READING_COVER_EVIDENCE_PATTERN, "cb-track-channel"], [CB_FRONT_FOOT_EVIDENCE_PATTERN, "cb-front-foot"],
      [/\bbody shape\b/, "cb-goal-side"],
      [COVER_ACTION_EVIDENCE_PATTERN, "cb-track-channel"], [MARKING_EVIDENCE_PATTERN, "cb-goal-side"]
    ],
    wide_defender: [
      [/overlap|width/, "fb-overlap-timing"], [DEFENSIVE_RECOVERY_EVIDENCE_PATTERN, "fb-recovery-run"],
      [FULL_BACK_TRANSITION_EVIDENCE_PATTERN, "fb-recovery-run"], [/\bcross(?:es|ed|ing)?\b/, "fb-early-delivery"],
      [FB_INSIDE_COVER_EVIDENCE_PATTERN, "fb-inside-first"], [FB_TWO_WAY_EVIDENCE_PATTERN, "fb-reset-line"],
      [FB_DUEL_EVIDENCE_PATTERN, "fb-show-line"], [MARKING_EVIDENCE_PATTERN, "fb-show-line"]
    ],
    holding_midfielder: [
      [DM_POSITIONAL_EVIDENCE_PATTERN, "dm-hold-zone"], [DM_BALANCE_EVIDENCE_PATTERN, "dm-cover-fullback"],
      [OPEN_BODY_RECEIVING_EVIDENCE_PATTERN, "dm-open-body"],
      [COUNTERPRESS_EVIDENCE_PATTERN, "dm-lane-block"],
      [COVER_ACTION_EVIDENCE_PATTERN, "dm-cover-fullback"], [/second ball/, "dm-second-ball-action"]
    ],
    midfielder: [
      [/versatil|held .*midfield together/, "mf-move-after"], [ON_BALL_CARRY_EVIDENCE_PATTERN, "mf-carry-gap"],
      [/dribbl/, "mf-carry-gap"],
      [MIDFIELD_VISION_EVIDENCE_PATTERN, "mf-release-runner"], [MF_FORWARD_PASS_EVIDENCE_PATTERN, "mf-release-runner"],
      [MF_CONNECTION_EVIDENCE_PATTERN, "mf-third-player"], [MF_BALL_SECURITY_EVIDENCE_PATTERN, "mf-protect-ball"],
      [COUNTERPRESS_EVIDENCE_PATTERN, "mf-counterpress"],
      [/late (?:run|arriv)|arriv(?:e|ed|ing) late|dropped [^.;]{0,24} off the front line|surging finishes/, "mf-late-box"],
      [MF_LATE_ARRIVAL_EVIDENCE_PATTERN, "mf-late-box"], [MF_CONTROL_EVIDENCE_PATTERN, "mf-pause"],
      [MIDFIELD_TEMPO_EVIDENCE_PATTERN, "mf-pause"]
    ],
    wide_attacker: [
      [/creator and scorer|chance-making|chance creation/, "wing-chance-making"],
      [ON_BALL_CARRY_EVIDENCE_PATTERN, "wing-carry-head-up"],
      [WING_TRANSITION_REVIEW_PATTERN, "wing-carry-head-up"],
      [WIDE_ISOLATION_EVIDENCE_PATTERN, "wing-touch-away"], [WING_ISOLATION_REVIEW_PATTERN, "wing-touch-away"],
      [WING_STOP_START_EVIDENCE_PATTERN, "wing-stop-start"],
      [/\bcross(?:es|ed|ing)?\b/, "wing-early-cross"], [WIDE_INSIDE_EVIDENCE_PATTERN, "wing-halfspace"],
      [WING_INSIDE_REVIEW_PATTERN, "wing-halfspace"], [WING_COMBINATION_REVIEW_PATTERN, "wing-return-pass"],
      [/far[ -]post|back[ -]post/, "wing-far-post-run"], [WING_FAR_POST_REVIEW_PATTERN, "wing-far-post-run"],
      [COUNTERPRESS_EVIDENCE_PATTERN, "wing-counterpress"]
    ],
    striker: [
      [/create overload|ball-side press/, "fw-overload-press"],
      [/opening header.*closing assist|header.*assist/, "fw-header-create"],
      [/manipulat(?:e|ed|ing) defenders|created .*more|closing assist|dragged centre-backs out|made .* runs possible/, "fw-draw-release"],
      [STRIKER_LINK_EVIDENCE_PATTERN, "fw-body-return"], [STRIKER_RUN_EVIDENCE_PATTERN, "fw-start-run"],
      [STRIKER_GAP_RUN_EVIDENCE_PATTERN, "fw-start-run"],
      [STRIKER_SEPARATION_EVIDENCE_PATTERN, "fw-delay-run"],
      [/one-touch|first-time|few touches|minimal touches|shot early|finished early|tight-window finish|adjust(?:ed|ing) his feet/, "fw-one-touch"],
      [/\bpress(?:ed|es|ing)?\b/, "fw-press-curve"],
      [STRIKER_AERIAL_ACTION_EVIDENCE_PATTERN, "fw-near-post"], [STRIKER_BOX_REFERENCE_EVIDENCE_PATTERN, "fw-pin"],
      [STRIKER_REBOUND_EVIDENCE_PATTERN, "fw-rebound"],
      [STRIKER_HEADER_SPECIALIST_EVIDENCE_PATTERN, "fw-near-post"]
    ],
    player: [
      [/\bsupport(?:s|ed|ing)?\b|\bpass(?:es|ed|ing)?\b|\bcombin(?:e|es|ed|ing|ation|ations)\b/, "pl-angle"],
      [COUNTERPRESS_EVIDENCE_PATTERN, "pl-counter"],
      [DEFENSIVE_RECOVERY_EVIDENCE_PATTERN, "pl-counter"]
    ]
  };
  const findMatchingIds = (patterns, values) => {
    const availableIds = new Set(values.map((item) => item.id));
    const matches = [];
    for (const [pattern, id] of patterns || []) {
      if (!pattern.test(text)) continue;
      if (availableIds.has(id) && !matches.includes(id)) matches.push(id);
    }
    return matches;
  };
  return {
    signatureIds: findMatchingIds(signaturePatterns[catalogKey], signatures)
      .filter((id) => !blocked.signatureIds.has(id)),
    actionIds: findMatchingIds(actionPatterns[catalogKey], actions)
      .filter((id) => !blocked.actionIds.has(id)),
    blockedSignatureIds: [...blocked.signatureIds],
    blockedActionIds: [...blocked.actionIds]
  };
}

export function historicalEditorialHintIdsForReason(catalogKey, reason) {
  const catalog = HISTORICAL_STYLE_CATALOGS[catalogKey];
  if (!catalog) return { signatureIds: [], actionIds: [], blockedSignatureIds: [], blockedActionIds: [] };
  const editorialCatalog = HISTORICAL_EDITORIAL_STYLE_PHRASES[catalogKey];
  return editorialHints(
    catalogKey,
    reason,
    [...catalog.signatures, ...(editorialCatalog?.signatures || [])],
    [...catalog.actions, ...(editorialCatalog?.actions || [])]
  );
}

const semanticEvidenceRule = (signatureIds, actionIds) => Object.freeze({
  signatureIds: Object.freeze(signatureIds),
  actionIds: Object.freeze(actionIds)
});

// A source label is useful only when it narrows the role to these directly implied actions. Broad
// archive facts such as Starter, goals, penalties and Impact sub are deliberately absent.
export const HISTORICAL_PROFILE_SOURCE_SEMANTICS = Object.freeze({
  goalkeeper: Object.freeze({
    "Shot stopping": semanticEvidenceRule(
      ["gk-footwork", "gk-balance", "gk-angle", "gk-centre"],
      ["gk-set-feet", "gk-reset", "gk-narrow-angle", "gk-protect-centre", "gk-body-shape"]
    ),
    "Defensive control": semanticEvidenceRule(
      ["gk-centre", "gk-angle", "gk-box", "gk-calm"],
      ["gk-protect-centre", "gk-organize", "gk-through-ball", "gk-catch-or-parry", "gk-safe-restart"]
    )
  }),
  central_defender: Object.freeze({
    "Physical duels": semanticEvidenceRule(
      ["cb-position", "cb-body", "cb-patience"],
      ["cb-goal-side", "cb-step", "cb-front-foot", "cb-delay"]
    ),
    "Defensive control": semanticEvidenceRule(
      ["cb-depth", "cb-cover", "cb-line"],
      ["cb-hold-lane", "cb-box-distance", "cb-track-channel", "cb-check-runner"]
    )
  }),
  wide_defender: Object.freeze({
    "Physical duels": semanticEvidenceRule(
      ["fb-duel", "fb-distance"],
      ["fb-show-line", "fb-touchline-trap", "fb-block-cross", "fb-inside-first"]
    ),
    "Defensive control": semanticEvidenceRule(
      ["fb-distance", "fb-two-way", "fb-recovery", "fb-transition"],
      ["fb-inside-first", "fb-reset-line", "fb-recovery-run", "fb-back-post-scan"]
    )
  }),
  holding_midfielder: Object.freeze({
    "Defensive control": semanticEvidenceRule(
      ["dm-screen", "dm-balance", "dm-cover"],
      ["dm-hold-zone", "dm-lane-block", "dm-cover-fullback", "dm-delay-counter"]
    ),
    "Tempo control": semanticEvidenceRule(
      ["dm-tempo", "dm-first-pass", "dm-scan"],
      ["dm-switch", "dm-reset", "dm-break-line", "dm-two-touch"]
    )
  }),
  midfielder: Object.freeze({
    "Tempo control": semanticEvidenceRule(
      ["mf-tempo", "mf-angle", "mf-support"],
      ["mf-pause", "mf-switch-angle", "mf-simple-reset", "mf-move-after", "mf-third-player"]
    )
  }),
  wide_attacker: Object.freeze({
    "Runs in behind": semanticEvidenceRule(
      ["wing-inside", "wing-far-post", "wing-transition"],
      ["wing-halfspace", "wing-outside-inside", "wing-far-post-run", "wing-carry-head-up"]
    ),
    "Goal threat": semanticEvidenceRule(
      ["wing-far-post", "wing-first-touch"],
      ["wing-far-post-run", "wing-carry-head-up", "wing-touch-away"]
    )
  }),
  striker: Object.freeze({
    "Runs in behind": semanticEvidenceRule(
      ["fw-run", "fw-channel", "fw-blindside"],
      ["fw-start-run", "fw-delay-run", "fw-pull-wide", "fw-near-post"]
    ),
    "Goal threat": semanticEvidenceRule(
      ["fw-finish", "fw-box", "fw-separation"],
      ["fw-one-touch", "fw-shot-early", "fw-box-pause", "fw-near-post", "fw-rebound"]
    )
  }),
  player: Object.freeze({})
});

const roleGuidePool = (...rules) => Object.freeze(rules);

// The archive often resolves only a position, not an individual technique. In that fallback tier,
// rotate among conservative responsibilities that genuinely belong to the resolved position and
// keep the prose explicitly framed as a role-viewing guide. This is cadence and lens diversity,
// not evidence that a particular player was defined by the selected action.
const HISTORICAL_ROLE_GUIDE_POOLS = Object.freeze({
  goalkeeper: roleGuidePool(
    semanticEvidenceRule(["gk-footwork"], ["gk-set-feet", "gk-reset"]),
    semanticEvidenceRule(["gk-centre"], ["gk-protect-centre", "gk-safe-restart"]),
    semanticEvidenceRule(["gk-angle"], ["gk-narrow-angle", "gk-organize"]),
    semanticEvidenceRule(["gk-box"], ["gk-through-ball", "gk-catch-or-parry"]),
    semanticEvidenceRule(["gk-rebound"], ["gk-second-ball", "gk-reset"]),
    semanticEvidenceRule(["gk-calm"], ["gk-safe-restart", "gk-organize"]),
    semanticEvidenceRule(["gk-patience"], ["gk-one-v-one", "gk-body-shape"]),
    semanticEvidenceRule(["gk-balance"], ["gk-set-feet", "gk-body-shape"]),
    semanticEvidenceRule(["gk-box"], ["gk-cross", "gk-organize"]),
    semanticEvidenceRule(["gk-angle"], ["gk-protect-centre", "gk-set-feet"])
  ),
  "centre-back": roleGuidePool(
    semanticEvidenceRule(["cb-depth"], ["cb-hold-lane", "cb-box-distance"]),
    semanticEvidenceRule(["cb-position"], ["cb-goal-side", "cb-step"]),
    semanticEvidenceRule(["cb-body"], ["cb-check-runner", "cb-simple-exit"]),
    semanticEvidenceRule(["cb-line"], ["cb-box-distance", "cb-check-runner"]),
    semanticEvidenceRule(["cb-patience"], ["cb-delay", "cb-front-foot"]),
    semanticEvidenceRule(["cb-first-pass"], ["cb-open-pass", "cb-hold-lane"]),
    semanticEvidenceRule(["cb-aerial"], ["cb-aerial-contact", "cb-clear-wide"]),
    semanticEvidenceRule(["cb-cover"], ["cb-track-channel", "cb-delay"]),
    semanticEvidenceRule(["cb-depth"], ["cb-check-runner", "cb-hold-lane"]),
    semanticEvidenceRule(["cb-patience"], ["cb-front-foot", "cb-simple-exit"])
  ),
  defender: roleGuidePool(
    semanticEvidenceRule(["cb-depth"], ["cb-hold-lane", "cb-box-distance"]),
    semanticEvidenceRule(["cb-position"], ["cb-goal-side", "cb-step"]),
    semanticEvidenceRule(["cb-body"], ["cb-check-runner", "cb-simple-exit"]),
    semanticEvidenceRule(["cb-cover"], ["cb-track-channel", "cb-hold-lane"]),
    semanticEvidenceRule(["cb-patience"], ["cb-delay", "cb-front-foot"]),
    semanticEvidenceRule(["cb-first-pass"], ["cb-open-pass", "cb-hold-lane"]),
    semanticEvidenceRule(["cb-aerial"], ["cb-aerial-contact", "cb-clear-wide"]),
    semanticEvidenceRule(["cb-line"], ["cb-box-distance", "cb-hold-lane"]),
    semanticEvidenceRule(["cb-cover"], ["cb-track-channel", "cb-delay"]),
    semanticEvidenceRule(["cb-patience"], ["cb-front-foot", "cb-simple-exit"])
  ),
  "full-back": roleGuidePool(
    semanticEvidenceRule(["fb-two-way"], ["fb-reset-line", "fb-support-angle"]),
    semanticEvidenceRule(["fb-duel"], ["fb-show-line", "fb-block-cross"]),
    semanticEvidenceRule(["fb-distance"], ["fb-inside-first", "fb-simple-inside-pass"]),
    semanticEvidenceRule(["fb-recovery"], ["fb-recovery-run", "fb-back-post-scan"]),
    semanticEvidenceRule(["fb-width"], ["fb-support-angle", "fb-early-delivery"]),
    semanticEvidenceRule(["fb-transition"], ["fb-reset-line", "fb-overlap-timing"]),
    semanticEvidenceRule(["fb-overlap"], ["fb-overlap-timing", "fb-support-angle"]),
    semanticEvidenceRule(["fb-back-post"], ["fb-back-post-scan", "fb-inside-first"]),
    semanticEvidenceRule(["fb-duel"], ["fb-touchline-trap", "fb-show-line"]),
    semanticEvidenceRule(["fb-recovery"], ["fb-recovery-run", "fb-reset-line"])
  ),
  "wing-back": roleGuidePool(
    semanticEvidenceRule(["fb-two-way"], ["fb-reset-line", "fb-support-angle"]),
    semanticEvidenceRule(["fb-duel"], ["fb-show-line", "fb-block-cross"]),
    semanticEvidenceRule(["fb-distance"], ["fb-inside-first", "fb-simple-inside-pass"]),
    semanticEvidenceRule(["fb-recovery"], ["fb-recovery-run", "fb-back-post-scan"]),
    semanticEvidenceRule(["fb-width"], ["fb-support-angle", "fb-early-delivery"]),
    semanticEvidenceRule(["fb-transition"], ["fb-reset-line", "fb-overlap-timing"]),
    semanticEvidenceRule(["fb-overlap"], ["fb-overlap-timing", "fb-support-angle"]),
    semanticEvidenceRule(["fb-back-post"], ["fb-back-post-scan", "fb-inside-first"]),
    semanticEvidenceRule(["fb-width"], ["fb-early-delivery", "fb-support-angle"]),
    semanticEvidenceRule(["fb-recovery"], ["fb-recovery-run", "fb-reset-line"])
  ),
  "defensive-midfielder": roleGuidePool(
    semanticEvidenceRule(["dm-screen"], ["dm-hold-zone", "dm-lane-block"]),
    semanticEvidenceRule(["dm-scan"], ["dm-open-body", "dm-safe-turn"]),
    semanticEvidenceRule(["dm-balance"], ["dm-cover-fullback", "dm-follow-pass"]),
    semanticEvidenceRule(["dm-first-pass"], ["dm-two-touch", "dm-reset"]),
    semanticEvidenceRule(["dm-tempo"], ["dm-switch", "dm-break-line"]),
    semanticEvidenceRule(["dm-cover"], ["dm-cover-fullback", "dm-delay-counter"]),
    semanticEvidenceRule(["dm-second-ball"], ["dm-second-ball-action", "dm-hold-zone"]),
    semanticEvidenceRule(["dm-pressure"], ["dm-safe-turn", "dm-two-touch"]),
    semanticEvidenceRule(["dm-scan"], ["dm-open-body", "dm-follow-pass"]),
    semanticEvidenceRule(["dm-tempo"], ["dm-reset", "dm-switch"])
  ),
  "central-midfielder": roleGuidePool(
    semanticEvidenceRule(["mf-angle"], ["mf-side-on", "mf-move-after"]),
    semanticEvidenceRule(["mf-tempo"], ["mf-pause", "mf-switch-angle"]),
    semanticEvidenceRule(["mf-scan"], ["mf-half-turn", "mf-release-runner"]),
    semanticEvidenceRule(["mf-support"], ["mf-move-after", "mf-third-player"]),
    semanticEvidenceRule(["mf-pressure"], ["mf-protect-ball", "mf-simple-reset"]),
    semanticEvidenceRule(["mf-transition"], ["mf-counterpress", "mf-carry-gap"]),
    semanticEvidenceRule(["mf-turn"], ["mf-first-touch", "mf-side-on"]),
    semanticEvidenceRule(["mf-progression"], ["mf-carry-gap", "mf-simple-reset"]),
    semanticEvidenceRule(["mf-space"], ["mf-between-lines", "mf-third-player"]),
    semanticEvidenceRule(["mf-late-run"], ["mf-late-box", "mf-move-after"])
  ),
  "attacking-midfielder": roleGuidePool(
    semanticEvidenceRule(["mf-space"], ["mf-between-lines", "mf-release-runner"]),
    semanticEvidenceRule(["mf-progression"], ["mf-carry-gap", "mf-first-touch"]),
    semanticEvidenceRule(["mf-turn"], ["mf-first-touch", "mf-side-on"]),
    semanticEvidenceRule(["mf-support"], ["mf-third-player", "mf-between-lines"]),
    semanticEvidenceRule(["mf-scan"], ["mf-half-turn", "mf-release-runner"]),
    semanticEvidenceRule(["mf-late-run"], ["mf-late-box", "mf-move-after"]),
    semanticEvidenceRule(["mf-angle"], ["mf-side-on", "mf-switch-angle"]),
    semanticEvidenceRule(["mf-tempo"], ["mf-pause", "mf-third-player"]),
    semanticEvidenceRule(["mf-transition"], ["mf-carry-gap", "mf-simple-reset"]),
    semanticEvidenceRule(["mf-pressure"], ["mf-protect-ball", "mf-first-touch"])
  ),
  midfielder: roleGuidePool(
    semanticEvidenceRule(["mf-angle"], ["mf-side-on", "mf-move-after"]),
    semanticEvidenceRule(["mf-tempo"], ["mf-pause", "mf-switch-angle"]),
    semanticEvidenceRule(["mf-scan"], ["mf-half-turn", "mf-release-runner"]),
    semanticEvidenceRule(["mf-support"], ["mf-move-after", "mf-third-player"]),
    semanticEvidenceRule(["mf-pressure"], ["mf-protect-ball", "mf-simple-reset"]),
    semanticEvidenceRule(["mf-transition"], ["mf-counterpress", "mf-carry-gap"]),
    semanticEvidenceRule(["mf-turn"], ["mf-first-touch", "mf-side-on"]),
    semanticEvidenceRule(["mf-progression"], ["mf-carry-gap", "mf-simple-reset"]),
    semanticEvidenceRule(["mf-space"], ["mf-between-lines", "mf-third-player"]),
    semanticEvidenceRule(["mf-late-run"], ["mf-late-box", "mf-move-after"])
  ),
  "wide-attacker": roleGuidePool(
    semanticEvidenceRule(["wing-inside"], ["wing-halfspace", "wing-return-pass"]),
    semanticEvidenceRule(["wing-width"], ["wing-outside-inside", "wing-early-cross"]),
    semanticEvidenceRule(["wing-first-touch"], ["wing-touch-away", "wing-carry-head-up"]),
    semanticEvidenceRule(["wing-isolation"], ["wing-stop-start", "wing-release-overlap"]),
    semanticEvidenceRule(["wing-transition"], ["wing-carry-head-up", "wing-counterpress"]),
    semanticEvidenceRule(["wing-combination"], ["wing-release-overlap", "wing-return-pass"]),
    semanticEvidenceRule(["wing-change-pace"], ["wing-stop-start", "wing-outside-inside"]),
    semanticEvidenceRule(["wing-far-post"], ["wing-far-post-run", "wing-carry-head-up"]),
    semanticEvidenceRule(["wing-inside"], ["wing-outside-inside", "wing-halfspace"]),
    semanticEvidenceRule(["wing-width"], ["wing-early-cross", "wing-release-overlap"])
  ),
  striker: roleGuidePool(
    semanticEvidenceRule(["fw-run"], ["fw-start-run", "fw-face-goal"]),
    semanticEvidenceRule(["fw-reference"], ["fw-pin", "fw-body-return"]),
    semanticEvidenceRule(["fw-separation"], ["fw-box-pause", "fw-pull-wide"]),
    semanticEvidenceRule(["fw-finish"], ["fw-one-touch", "fw-near-post"]),
    semanticEvidenceRule(["fw-receive"], ["fw-body-return", "fw-start-run"]),
    semanticEvidenceRule(["fw-channel"], ["fw-pull-wide", "fw-delay-run"]),
    semanticEvidenceRule(["fw-box"], ["fw-second-ball", "fw-rebound"]),
    semanticEvidenceRule(["fw-blindside"], ["fw-delay-run", "fw-near-post"]),
    semanticEvidenceRule(["fw-run"], ["fw-delay-run", "fw-near-post"]),
    semanticEvidenceRule(["fw-link"], ["fw-layoff-turn", "fw-pin"])
  ),
  "second-striker": roleGuidePool(
    semanticEvidenceRule(["fw-separation"], ["fw-box-pause", "fw-body-return"]),
    semanticEvidenceRule(["fw-link"], ["fw-body-return", "fw-layoff-turn"]),
    semanticEvidenceRule(["fw-receive"], ["fw-body-return", "fw-start-run"]),
    semanticEvidenceRule(["fw-channel"], ["fw-pull-wide", "fw-delay-run"]),
    semanticEvidenceRule(["fw-finish"], ["fw-one-touch", "fw-near-post"]),
    semanticEvidenceRule(["fw-reference"], ["fw-pin", "fw-body-return"]),
    semanticEvidenceRule(["fw-run"], ["fw-delay-run", "fw-face-goal"]),
    semanticEvidenceRule(["fw-box"], ["fw-second-ball", "fw-layoff-turn"]),
    semanticEvidenceRule(["fw-blindside"], ["fw-delay-run", "fw-pull-wide"]),
    semanticEvidenceRule(["fw-link"], ["fw-layoff-turn", "fw-pin"])
  ),
  forward: roleGuidePool(
    semanticEvidenceRule(["fw-run"], ["fw-start-run", "fw-face-goal"]),
    semanticEvidenceRule(["fw-reference"], ["fw-pin", "fw-body-return"]),
    semanticEvidenceRule(["fw-separation"], ["fw-box-pause", "fw-pull-wide"]),
    semanticEvidenceRule(["fw-finish"], ["fw-one-touch", "fw-near-post"]),
    semanticEvidenceRule(["fw-receive"], ["fw-body-return", "fw-start-run"]),
    semanticEvidenceRule(["fw-channel"], ["fw-pull-wide", "fw-delay-run"]),
    semanticEvidenceRule(["fw-box"], ["fw-second-ball", "fw-rebound"]),
    semanticEvidenceRule(["fw-blindside"], ["fw-delay-run", "fw-near-post"]),
    semanticEvidenceRule(["fw-run"], ["fw-delay-run", "fw-near-post"]),
    semanticEvidenceRule(["fw-link"], ["fw-layoff-turn", "fw-pin"])
  ),
  player: roleGuidePool(
    semanticEvidenceRule(["pl-support"], ["pl-angle", "pl-follow"]),
    semanticEvidenceRule(["pl-awareness"], ["pl-scan", "pl-reset"]),
    semanticEvidenceRule(["pl-simple"], ["pl-return", "pl-release"]),
    semanticEvidenceRule(["pl-continuity"], ["pl-follow", "pl-angle"]),
    semanticEvidenceRule(["pl-balance"], ["pl-follow", "pl-width"]),
    semanticEvidenceRule(["pl-recovery"], ["pl-counter", "pl-second"]),
    semanticEvidenceRule(["pl-space"], ["pl-angle", "pl-width"]),
    semanticEvidenceRule(["pl-first-touch"], ["pl-close-touch", "pl-release"]),
    semanticEvidenceRule(["pl-support"], ["pl-distance", "pl-follow"]),
    semanticEvidenceRule(["pl-recovery"], ["pl-counter", "pl-reset"])
  )
});

function roleGuideVariantForProfile(profile, role) {
  const pool = HISTORICAL_ROLE_GUIDE_POOLS[role] || HISTORICAL_ROLE_GUIDE_POOLS.player;
  const profileKey = profile.profileKey || `${profile.name} / ${profile.teamName} / ${profile.tournamentYear}`;
  const assignedIndex = historicalRoleGuideVariantByProfileKey.get(profileKey);
  const preferredIndex = stableHash(`${historicalRoleIdentityKey(profile.name, profile.teamName)}|${role}:role-guide`) % pool.length;
  const index = Number.isInteger(assignedIndex)
    ? assignedIndex % pool.length
    : preferredIndex;
  return Object.freeze({
    index,
    id: `role-guide-${index + 1}`,
    preferredId: `role-guide-${preferredIndex + 1}`,
    collisionResolved: index !== preferredIndex,
    rule: pool[index]
  });
}

function assignHistoricalRoleGuideVariants(profiles) {
  historicalRoleGuideVariantByProfileKey = new Map();
  const groups = new Map();
  const identityRoleCounts = new Map();
  for (const profile of profiles) {
    const role = inferHistoricalStyleRole(profile);
    const identityRoleKey = `${historicalRoleIdentityKey(profile.name, profile.teamName)}|${role}`;
    identityRoleCounts.set(identityRoleKey, (identityRoleCounts.get(identityRoleKey) || 0) + 1);
    const groupKey = [normalizeTeamName(profile.teamName), Number(profile.tournamentYear), role].join("|");
    if (!groups.has(groupKey)) groups.set(groupKey, { role, profiles: [] });
    groups.get(groupKey).profiles.push(profile);
  }
  for (const group of groups.values()) {
    const pool = HISTORICAL_ROLE_GUIDE_POOLS[group.role] || HISTORICAL_ROLE_GUIDE_POOLS.player;
    const sorted = group.profiles.slice().sort((left, right) => (
      (identityRoleCounts.get(`${historicalRoleIdentityKey(right.name, right.teamName)}|${group.role}`) || 0)
        - (identityRoleCounts.get(`${historicalRoleIdentityKey(left.name, left.teamName)}|${group.role}`) || 0)
      || historicalRoleIdentityKey(left.name, left.teamName).localeCompare(historicalRoleIdentityKey(right.name, right.teamName))
      || left.profileKey.localeCompare(right.profileKey)
    ));
    const usage = Array.from({ length: pool.length }, () => 0);
    for (const profile of sorted) {
      const preferred = stableHash(
        `${historicalRoleIdentityKey(profile.name, profile.teamName)}|${group.role}:role-guide`
      ) % pool.length;
      let selected = preferred;
      for (let offset = 0; offset < pool.length; offset += 1) {
        const candidate = (preferred + offset) % pool.length;
        if (usage[candidate] === 0) {
          selected = candidate;
          break;
        }
        if (usage[candidate] < usage[selected]) selected = candidate;
      }
      usage[selected] += 1;
      historicalRoleGuideVariantByProfileKey.set(profile.profileKey, selected);
    }
  }
}

function orderBroadSourceRuleByRoleGuide(rule, roleGuide) {
  const orderValues = (sourceValues, guideValues) => {
    const values = [...(sourceValues || [])];
    if (!values.length) return values;
    const rotated = values.map((_, index) => values[(index + roleGuide.index) % values.length]);
    const available = new Set(values);
    return [...new Set([
      ...(guideValues || []).filter((value) => available.has(value)),
      ...rotated
    ])];
  };
  return semanticEvidenceRule(
    orderValues(rule.signatureIds, roleGuide.rule.signatureIds),
    orderValues(rule.actionIds, roleGuide.rule.actionIds)
  );
}

// Baggio's exact 1994 SS slot and the same-identity editions justify a second-striker role guide,
// but none of those sources supports the pressing identity that v5 assigned by hash.
export const HISTORICAL_REVIEWED_SEMANTIC_OVERRIDES = Object.freeze({
  "Gerd Müller / West Germany / 1970": Object.freeze({
    kind: "reviewed-player-role",
    source: "reviewed striker role guide anchored to the 1970 ten-goal tournament record",
    ...semanticEvidenceRule(["fw-run"], ["fw-start-run", "fw-one-touch"])
  }),
  "Ronaldo / Brazil / 1998": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1998 Best XI rationale: receiving to feet and winning the race behind defenders",
    ...semanticEvidenceRule(["fw-receive"], ["fw-check-to-feet", "fw-draw-release"])
  }),
  "Ronaldo / Brazil / 2002": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2002 Best XI rationale: first-step movement before defenders could react",
    ...semanticEvidenceRule(["fw-run"], ["fw-start-run", "fw-shot-early"])
  }),
  "Ronaldo / Brazil / 2006": Object.freeze({
    kind: "reviewed-tournament-evidence",
    source: "FIFA review of Ronaldo's 2006 World Cup goals",
    sourceUrls: Object.freeze([
      "https://www.fifa.com/pt/articles/video-todos-gols-ronaldo-brasil-copa-do-mundo-1998-2002-2006"
    ]),
    ...semanticEvidenceRule(["fw-blindside"], ["fw-delay-run", "fw-shot-early"])
  }),
  "Thierry Henry / France / 2006": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2006 Best XI rationale: stretched the back line and finished against Brazil",
    ...semanticEvidenceRule(["fw-run"], ["fw-start-run", "fw-shot-early"])
  }),
  "Zinedine Zidane / France / 1998": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1998 Best XI rationale and final story: twice attacked the seam between zonal and man-marking assignments at corners",
    sourceUrls: Object.freeze([
      "https://www.fifa.com/en/articles/zinedine-zidane-headers-1998-final"
    ]),
    ...semanticEvidenceRule(["mf-corner-seam"], ["mf-corner-arrival", "mf-repeat-corner-route"])
  }),
  "Zinedine Zidane / France / 2006": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2006 Best XI rationale: body feints and passing angles in the knockouts",
    ...semanticEvidenceRule(["mf-progression"], ["mf-carry-gap", "mf-release-runner"])
  }),
  "Gianluigi Buffon / Italy / 2006": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2006 Best XI rationale: extra-time tip over Zidane's header",
    ...semanticEvidenceRule(["gk-balance"], ["gk-set-feet", "gk-lift-over"])
  }),
  "Manuel Neuer / Germany / 2010": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2010 Best XI rationale: swept behind the line and began attacks with long distribution",
    ...semanticEvidenceRule(["gk-box"], ["gk-through-ball", "gk-safe-restart"])
  }),
  "Manuel Neuer / Germany / 2014": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2014 Best XI rationale: repeated sweeping and territorial control against Algeria",
    ...semanticEvidenceRule(["gk-box"], ["gk-high-start", "gk-through-ball"])
  }),
  "Fabio Cannavaro / Italy / 2006": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2006 Best XI rationale: attacked first balls and stepped forward with possession",
    ...semanticEvidenceRule(["cb-aerial"], ["cb-aerial-contact", "cb-step-possession"])
  }),
  "Cristiano Ronaldo / Portugal / 2018": Object.freeze({
    kind: "reviewed-tournament-evidence",
    source: "FIFA World Cup goal review: varied box starts and quick finishing",
    sourceUrls: Object.freeze([
      "https://www.fifa.com/en/tournaments/mens/worldcup/articles/cristiano-ronaldo-all-goals?searchOverlay=1"
    ]),
    ...semanticEvidenceRule(["fw-finish"], ["fw-one-touch", "fw-shot-early"])
  }),
  "Kaká / Brazil / 2006": Object.freeze({
    kind: "reviewed-tournament-evidence",
    source: "FIFA 2006 goal record: beat the first defender on the carry and finished left-footed",
    sourceUrls: Object.freeze([
      "https://collect.fifa.com/collectible/2371662040"
    ]),
    ...semanticEvidenceRule(["mf-progression"], ["mf-beat-defender-carry", "mf-left-foot-finish"])
  }),
  "Kaká / Brazil / 2010": Object.freeze({
    source: "FIFA assist record with role-informed attacking-midfield interpretation",
    sourceUrls: Object.freeze([
      "https://www.fifa.com/en/articles/top-assisters-at-world-cup-qatar-2022"
    ]),
    ...semanticEvidenceRule(["mf-space"], ["mf-between-lines", "mf-release-runner"])
  }),
  "Francesco Totti / Italy / 2006": Object.freeze({
    kind: "reviewed-tournament-evidence",
    source: "FIFA 2006 semifinal review: between-line receiving and early release",
    sourceUrls: Object.freeze([
      "https://www.fifa.com/en/tournaments/mens/worldcup/articles/germany-italy-greatest-games"
    ]),
    ...semanticEvidenceRule(["mf-space"], ["mf-between-lines", "mf-release-runner"])
  }),
  "Alberto Gilardino / Italy / 2006": Object.freeze({
    kind: "reviewed-tournament-evidence",
    source: "FIFA 2006 goal and semifinal reviews: channel movement and pull-back",
    sourceUrls: Object.freeze([
      "https://www.fifa.com/en/tournaments/mens/worldcup/articles/germany-italy-greatest-games",
      "https://www.fifa.com/it/tournaments/mens/worldcup/articles/tutti-gol-italia-mondiali-2006"
    ]),
    ...semanticEvidenceRule(["fw-channel"], ["fw-pull-wide", "fw-body-return"])
  }),
  "Alessandro Del Piero / Italy / 2006": Object.freeze({
    kind: "reviewed-tournament-evidence",
    source: "FIFA and UEFA 2006 semifinal reviews: second-wave counter arrival and finish",
    sourceUrls: Object.freeze([
      "https://www.fifa.com/en/tournaments/mens/worldcup/articles/germany-italy-greatest-games",
      "https://www.uefa.com/european-qualifiers/news/0254-0d7b9676107a-d3ac36899238-1000--azzurri-break-german-hearts/"
    ]),
    ...semanticEvidenceRule(["fw-receive"], ["fw-counter-arrival", "fw-shot-early"])
  }),
  "Filippo Inzaghi / Italy / 2006": Object.freeze({
    kind: "reviewed-tournament-evidence",
    source: "UEFA 2006 Czech Republic match review: delayed run and early finish",
    sourceUrls: Object.freeze([
      "https://www.uefa.com/european-qualifiers/news/0254-0d7b95ece32e-2d639b44222c-1000--materazzi-prompts-czech-exit/"
    ]),
    ...semanticEvidenceRule(["fw-blindside"], ["fw-delay-run", "fw-shot-early"])
  }),
  "Vincenzo Iaquinta / Italy / 2006": Object.freeze({
    kind: "reviewed-tournament-evidence",
    source: "FIFA 2006 goal review: attacked an underhit backpass, rounded the goalkeeper and finished",
    sourceUrls: Object.freeze([
      "https://www.fifa.com/it/tournaments/mens/worldcup/articles/tutti-gol-italia-mondiali-2006"
    ]),
    ...semanticEvidenceRule(["wing-backpass-run"], ["wing-attack-backpass", "wing-round-goalkeeper"])
  }),
  "Gyula Grosics / Hungary / 1954": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1954 Best XI rationale: sweeper position outside the box and first-pass attacks",
    ...semanticEvidenceRule(["gk-box"], ["gk-through-ball", "gk-attack-start"])
  }),
  "Nándor Hidegkuti / Hungary / 1954": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1954 Best XI rationale: withdrew from centre-forward to release runners",
    ...semanticEvidenceRule(["mf-space"], ["mf-between-lines", "mf-release-runner"])
  }),
  "Nílton Santos / Brazil / 1958": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1958 Best XI rationale: timed attacking advance with recovery balance",
    ...semanticEvidenceRule(["fb-overlap"], ["fb-overlap-timing", "fb-recovery-run"])
  }),
  "Rivellino / Brazil / 1970": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1970 Best XI rationale: left-sided start, expansive passing, shooting and inward balance",
    ...semanticEvidenceRule(["mf-left-narrow"], ["mf-open-pitch-pass", "mf-distance-shot"])
  }),
  "Paul Breitner / West Germany / 1974": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1974 honourable rationale: moved inside from left-back to add a passing option around Overath",
    ...semanticEvidenceRule(["fb-inside-option"], ["fb-inside-support", "fb-simple-inside-pass"])
  }),
  "Rainer Bonhof / West Germany / 1974": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1974 honourable rationale: vertical power and the final cut-back for the winning goal",
    ...semanticEvidenceRule(["mf-vertical-run"], ["mf-drive-forward", "mf-cutback"])
  }),
  "Garrincha / Brazil / 1958": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1958 Best XI rationale: fixed two defenders before delivering the cut-back",
    ...semanticEvidenceRule(["wing-isolation"], ["wing-touch-away", "wing-cutback"])
  }),
  "Bobby Moore / England / 1966": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1966 Best XI rationale: early interception and first forward pass",
    ...semanticEvidenceRule(["cb-first-pass"], ["cb-front-foot", "cb-forward-pass"])
  }),
  "Franz Beckenbauer / West Germany / 1966": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1966 Best XI rationale: midfield carry beyond pressure and tracking assignment",
    ...semanticEvidenceRule(["mf-progression"], ["mf-carry-gap", "mf-track-assignment"])
  }),
  "Paolo Maldini / Italy / 1990": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1990 Best XI rationale: recovery pace, body shape and inside-lane protection",
    ...semanticEvidenceRule(["fb-recovery"], ["fb-recovery-run", "fb-show-line"])
  }),
  "Paolo Maldini / Italy / 1994": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1994 Best XI rationale: hybrid left-back and centre-back distances",
    ...semanticEvidenceRule(["fb-role-shift"], ["fb-shift-inside", "fb-hold-unit"])
  }),
  "Aldair / Brazil / 1994": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1994 honourable rationale: covered behind the full-backs and distributed calmly",
    ...semanticEvidenceRule(["cb-cover"], ["cb-track-channel", "cb-calm-distribution"])
  }),
  "Thomas Müller / Germany / 2010": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2010 Best XI rationale: blind-side box arrival and quick final action",
    ...semanticEvidenceRule(["wing-far-post"], ["wing-far-post-run", "wing-quick-final-action"])
  }),
  "Thomas Müller / Germany / 2014": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2014 Best XI rationale: left the expected zone and arrived on the final pass",
    ...semanticEvidenceRule(["fw-space-arrival"], ["fw-leave-expected-zone", "fw-arrive-decisive-zone"])
  }),
  "Gordon Banks / England / 1970": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1970 honourable rationale: the recovery tip over from Pelé's dropping header",
    ...semanticEvidenceRule(["gk-recovery-save"], ["gk-lift-over", "gk-reset"])
  }),
  "Ruud Krol / Netherlands / 1974": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1974 Best XI rationale: central cover, outside advance and early diagonal",
    ...semanticEvidenceRule(["fb-two-way"], ["fb-inside-first", "fb-early-delivery"])
  }),
  "Paolo Rossi / Italy / 1982": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1982 Best XI rationale: stayed active between centre-backs before the quick finish",
    ...semanticEvidenceRule(["fw-blindside"], ["fw-delay-run", "fw-one-touch"])
  }),
  "Diego Maradona / Argentina / 1990": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1990 Best XI rationale: drew midfield pressure before a disguised release",
    ...semanticEvidenceRule(["mf-space"], ["mf-between-lines", "mf-release-runner"])
  }),
  "Fabien Barthez / France / 1998": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "1998 Best XI rationale: high starting position and speed beyond the line",
    ...semanticEvidenceRule(["gk-box"], ["gk-through-ball", "gk-reset"])
  }),
  "Lúcio / Brazil / 2002": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2002 Best XI rationale: carried beyond the back three and recovered behind wing-backs",
    ...semanticEvidenceRule(["cb-carry-cover"], ["cb-carry-first-press", "cb-cover-wingback"])
  }),
  "Claude Makélélé / France / 2006": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2006 Best XI rationale: protected the centre before the first release",
    ...semanticEvidenceRule(["dm-screen"], ["dm-hold-zone", "dm-break-line"])
  }),
  "Gennaro Gattuso / Italy / 2006": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2006 Best XI rationale: disrupted the duel and released the simple pass",
    ...semanticEvidenceRule(["dm-second-ball"], ["dm-second-ball-action", "dm-reset"])
  }),
  "Carles Puyol / Spain / 2010": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2010 Best XI rationale: early defensive step and attack on the corner seam",
    ...semanticEvidenceRule(["cb-patience"], ["cb-front-foot", "cb-aerial-contact"])
  }),
  "Arjen Robben / Netherlands / 2014": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2014 Best XI rationale: isolation, direct transition and change of pace",
    ...semanticEvidenceRule(["wing-isolation"], ["wing-force-retreat", "wing-change-gear"])
  }),
  "Javier Mascherano / Argentina / 2014": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2014 Best XI rationale: tracked Robben into the box and timed the defining recovery tackle",
    ...semanticEvidenceRule(["dm-recovery-tackle"], ["dm-match-run", "dm-tackle-goal-side"])
  }),
  "Nahuel Molina / Argentina / 2022": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2022 honourable rationale: direct right-sided run and finish from Messi's disguised pass",
    ...semanticEvidenceRule(["fb-direct-goal-run"], ["fb-run-beyond", "fb-finish-through-pass"])
  }),
  "N'Golo Kanté / France / 2018": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2018 Best XI rationale: closed space, won the turn and began transition",
    ...semanticEvidenceRule(["dm-cover"], ["dm-cover-fullback", "dm-break-line"])
  }),
  "Gianluca Zambrotta / Italy / 2006": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2006 Best XI rationale: carried Italy out of pressure without compromising the back line",
    ...semanticEvidenceRule(["fb-carry-balance"], ["fb-carry-out-pressure", "fb-reset-line"])
  }),
  "Sergio Busquets / Spain / 2010": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2010 Best XI rationale: closed the centre after turnovers and found the first forward pass",
    ...semanticEvidenceRule(["dm-screen"], ["dm-delay-counter", "dm-break-line"])
  }),
  "Xavi / Spain / 2010": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2010 honourable rationale: received beyond the first pressure and delivered the semi-final corner",
    ...semanticEvidenceRule(["mf-tempo"], ["mf-receive-beyond-press", "mf-corner-delivery"])
  }),
  "Alexis Mac Allister / Argentina / 2022": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2022 honourable rationale: two-way balance and the final pass for Di María's goal",
    ...semanticEvidenceRule(["mf-versatility"], ["mf-balance-two-way", "mf-final-pass-runner"])
  }),
  "Enzo Fernández / Argentina / 2022": Object.freeze({
    kind: "reviewed-best-xi-rationale",
    source: "2022 Best XI rationale: early forward passing and cover behind Messi's side",
    ...semanticEvidenceRule(["mf-progression"], ["mf-early-forward-pass", "mf-cover-advanced-side"])
  }),
  "Roberto Baggio / Italy / 1990": Object.freeze({
    source: "reviewed recurring second-striker role",
    ...semanticEvidenceRule(["fw-separation"], ["fw-box-pause", "fw-body-return"])
  }),
  "Roberto Baggio / Italy / 1994": Object.freeze({
    source: "reviewed exact Best XI second-striker role",
    ...semanticEvidenceRule(["fw-separation"], ["fw-box-pause", "fw-body-return"])
  }),
  "Roberto Baggio / Italy / 1998": Object.freeze({
    source: "reviewed recurring second-striker role",
    ...semanticEvidenceRule(["fw-separation"], ["fw-box-pause", "fw-body-return"])
  })
});

function availableSemanticIds(catalogKey) {
  const catalog = HISTORICAL_STYLE_CATALOGS[catalogKey];
  const editorialCatalog = HISTORICAL_EDITORIAL_STYLE_PHRASES[catalogKey];
  return {
    signatures: new Set([
      ...catalog.signatures,
      ...(editorialCatalog?.signatures || [])
    ].map((item) => item.id)),
    actions: new Set([
      ...catalog.actions,
      ...(editorialCatalog?.actions || [])
    ].map((item) => item.id))
  };
}

function historicalSemanticEvidenceRoutes(profile, role, catalogKey, editorial, hints) {
  const routes = [];
  const addRoute = (kind, source, rule) => {
    if (!rule) return;
    routes.push(Object.freeze({
      kind,
      source,
      sourceUrls: Object.freeze([...(rule.sourceUrls || [])]),
      signatureIds: Object.freeze([...(rule.signatureIds || [])]),
      actionIds: Object.freeze([...(rule.actionIds || [])])
    }));
  };

  const reviewed = HISTORICAL_REVIEWED_SEMANTIC_OVERRIDES[profile.profileKey];
  if (reviewed) addRoute(reviewed.kind || "reviewed-player-role", reviewed.source, reviewed);
  if (hints.signatureIds.length || hints.actionIds.length) {
    addRoute(
      editorial?.link === "exact" ? "best-xi-rationale" : "recurring-best-xi-rationale",
      `${editorial?.year || profile.tournamentYear} ${editorial?.link === "exact" ? "Best XI" : "same-player Best XI"} rationale`,
      hints
    );
  }
  const roleGuide = roleGuideVariantForProfile(profile, role);
  const sourceRules = HISTORICAL_PROFILE_SOURCE_SEMANTICS[catalogKey] || {};
  for (const skill of profile.skills || []) {
    if (sourceRules[skill]) {
      addRoute("profile-source", skill, orderBroadSourceRuleByRoleGuide(sourceRules[skill], roleGuide));
    }
  }
  const guidePool = HISTORICAL_ROLE_GUIDE_POOLS[role] || HISTORICAL_ROLE_GUIDE_POOLS.player;
  for (let offset = 0; offset < guidePool.length; offset += 1) {
    const index = (roleGuide.index + offset) % guidePool.length;
    addRoute("role-default", `${role}:role-guide-${index + 1}`, guidePool[index]);
  }
  return routes;
}

export function historicalEditorialHintIds(profile) {
  const role = inferHistoricalStyleRole(profile);
  const catalogKey = historicalStyleCatalogKeyForRole(role);
  const editorial = historicalEditorialContextForProfile(profile, catalogKey);
  if (!editorial?.reason) return { signatureIds: [], actionIds: [] };
  const catalog = HISTORICAL_STYLE_CATALOGS[catalogKey];
  const editorialCatalog = HISTORICAL_EDITORIAL_STYLE_PHRASES[catalogKey];
  const signatures = [...catalog.signatures, ...(editorialCatalog?.signatures || [])];
  const actions = [...catalog.actions, ...(editorialCatalog?.actions || [])];
  return editorialHints(catalogKey, editorial.reason, signatures, actions, profile.name);
}

export function historicalExpectedStyleSemanticSelection(profile) {
  const roleEvidence = inferHistoricalStyleRoleEvidence(profile);
  const role = roleEvidence.role;
  const catalogKey = historicalStyleCatalogKeyForRole(role);
  const roleGuide = roleGuideVariantForProfile(profile, role);
  const editorial = historicalEditorialContextForProfile(profile, catalogKey);
  const catalog = HISTORICAL_STYLE_CATALOGS[catalogKey];
  const editorialCatalog = HISTORICAL_EDITORIAL_STYLE_PHRASES[catalogKey];
  const hintSignatures = [...catalog.signatures, ...(editorialCatalog?.signatures || [])];
  const hintActions = [...catalog.actions, ...(editorialCatalog?.actions || [])];
  const hints = editorialHints(catalogKey, editorial?.reason, hintSignatures, hintActions, profile.name);
  const recurringBlocked = recurringEditorialBlockedSemanticIds(profile, catalogKey);
  const blockedSignatureIds = new Set([
    ...(hints.blockedSignatureIds || []),
    ...recurringBlocked.signatureIds
  ]);
  const blockedActionIds = new Set([
    ...(hints.blockedActionIds || []),
    ...recurringBlocked.actionIds
  ]);
  const available = availableSemanticIds(catalogKey);
  const routes = historicalSemanticEvidenceRoutes(profile, role, catalogKey, editorial, hints)
    .map((route) => Object.freeze({
      ...route,
      signatureIds: Object.freeze(route.signatureIds.filter((id) => (
        available.signatures.has(id) && !blockedSignatureIds.has(id)
      ))),
      actionIds: Object.freeze(route.actionIds.filter((id) => (
        available.actions.has(id) && !blockedActionIds.has(id)
      )))
    }));
  const signatureSelection = routes
    .flatMap((route) => route.signatureIds.map((id) => ({ id, route })))
    .find(({ id }) => (HISTORICAL_SIGNATURE_ACTION_SUPPORTS[id] || []).some((actionId) => (
      routes.some((route) => route.actionIds.includes(actionId))
      && !historicalSignatureActionConflict(id, actionId)
    )));
  if (!signatureSelection) {
    throw new Error(`No source-backed signature and action pair is available for ${profile.profileKey}`);
  }
  const signatureId = signatureSelection.id;
  const selectedActions = [];
  const addAction = (candidate, { mustSupport = false } = {}) => {
    if (!candidate || selectedActions.some((selected) => selected.id === candidate.id)) return false;
    if (mustSupport && !historicalActionSupportsSignature(signatureId, candidate.id)) return false;
    if (historicalSignatureActionConflict(signatureId, candidate.id)) return false;
    if (selectedActions.some((selected) => historicalActionFamily(selected.id) === historicalActionFamily(candidate.id))) {
      return false;
    }
    selectedActions.push(candidate);
    return true;
  };
  const routeOrderForSupport = [
    signatureSelection.route,
    ...routes.filter((route) => route !== signatureSelection.route)
  ];
  for (const route of routeOrderForSupport) {
    for (const id of route.actionIds) {
      if (addAction({ id, route }, { mustSupport: true })) break;
    }
    if (selectedActions.length) break;
  }
  if (!selectedActions.length) {
    throw new Error(`Unable to select a source-backed action that demonstrates ${signatureId} for ${profile.profileKey}`);
  }
  for (const route of routes) {
    for (const id of route.actionIds) {
      if (selectedActions.length >= 2) break;
      addAction({ id, route });
    }
    if (selectedActions.length >= 2) break;
  }
  if (selectedActions.length !== 2) {
    throw new Error(`Unable to select two source-backed action families for ${profile.profileKey}`);
  }
  const supportRelation = historicalActionSupportsSignature(signatureId, selectedActions[1].id)
    ? "reinforces-headline"
    : "additional-trait";
  const selectedBeats = [signatureSelection, ...selectedActions];
  const semanticSources = [];
  for (const selection of selectedBeats) {
    let source = semanticSources.find((item) => (
      item.kind === selection.route.kind && item.source === selection.route.source
    ));
    if (!source) {
      source = {
        kind: selection.route.kind,
        source: selection.route.source,
        ...(selection.route.sourceUrls?.length ? { sourceUrls: [...selection.route.sourceUrls] } : {}),
        semanticIds: []
      };
      semanticSources.push(source);
    }
    source.semanticIds.push(selection.id);
  }
  const sourceSkills = semanticSources
    .filter((source) => source.kind === "profile-source")
    .map((source) => source.source);
  const exactEditorialRouteKinds = new Set([
    "best-xi-rationale",
    "reviewed-best-xi-rationale"
  ]);
  const recurringEditorialRouteKinds = new Set([
    "recurring-best-xi-rationale",
    "reviewed-recurring-best-xi-rationale"
  ]);
  const matchedHintIds = selectedBeats
    .filter((selection) => (
      exactEditorialRouteKinds.has(selection.route.kind)
      || recurringEditorialRouteKinds.has(selection.route.kind)
    ))
    .map((selection) => selection.id);
  const reviewedEvidenceIds = selectedBeats
    .filter((selection) => selection.route.kind === "reviewed-tournament-evidence")
    .map((selection) => selection.id);
  // Headline language alone is not enough to elevate a card. Confidence requires both an
  // exact-edition headline and a selected observable action: exact rationale pairs may be
  // editorial, URL-backed pairs may be reviewed, and a same-player rationale from another edition
  // remains explicitly cross-edition context rather than evidence about this tournament.
  const exactEditorialActionIds = selectedActions
    .filter((selection) => exactEditorialRouteKinds.has(selection.route.kind))
    .map((selection) => selection.id);
  const recurringEditorialActionIds = selectedActions
    .filter((selection) => recurringEditorialRouteKinds.has(selection.route.kind))
    .map((selection) => selection.id);
  const reviewedActionIds = selectedActions
    .filter((selection) => selection.route.kind === "reviewed-tournament-evidence")
    .map((selection) => selection.id);
  const exactEditorialSignatureMatch = exactEditorialRouteKinds.has(signatureSelection.route.kind);
  const recurringEditorialSignatureMatch = recurringEditorialRouteKinds.has(signatureSelection.route.kind);
  const reviewedSignatureMatch = signatureSelection.route.kind === "reviewed-tournament-evidence";
  const exactEditionSignatureMatch = exactEditorialSignatureMatch || reviewedSignatureMatch;
  const evidenceScope = (
    exactEditionSignatureMatch
    && (exactEditorialActionIds.length || reviewedActionIds.length)
  )
    ? "exact-edition"
    : recurringEditorialSignatureMatch && recurringEditorialActionIds.length
      ? "recurring-cross-edition"
      : "role-level";
  const confidence = evidenceScope === "exact-edition" && reviewedActionIds.length
    ? "reviewed"
    : evidenceScope === "exact-edition" && exactEditorialActionIds.length
      ? "editorial"
      : "role-level";
  return {
    role,
    roleSource: roleEvidence.source,
    roleGuideVariant: roleGuide.id,
    roleGuidePreferredVariant: roleGuide.preferredId,
    roleGuideCollisionResolved: roleGuide.collisionResolved,
    catalogKey,
    signatureId,
    actionIds: selectedActions.map((selection) => selection.id),
    sourceSkills,
    semanticSources,
    matchedHintIds,
    reviewedEvidenceIds,
    exactEditorialSignatureMatch,
    recurringEditorialSignatureMatch,
    reviewedSignatureMatch,
    exactEditorialActionIds,
    recurringEditorialActionIds,
    reviewedActionIds,
    evidenceScope,
    supportRelation,
    confidence
  };
}

function generatedStyleSemantics(profile, fact) {
  const selection = historicalExpectedStyleSemanticSelection(profile);
  const catalog = HISTORICAL_STYLE_CATALOGS[selection.catalogKey];
  const editorialCatalog = HISTORICAL_EDITORIAL_STYLE_PHRASES[selection.catalogKey];
  const signaturesById = new Map([
    ...catalog.signatures,
    ...(editorialCatalog?.signatures || [])
  ].map((item) => [item.id, item]));
  const actionsById = new Map([
    ...catalog.actions,
    ...(editorialCatalog?.actions || [])
  ].map((item) => [item.id, item]));
  const editorial = historicalEditorialContextForProfile(profile, selection.catalogKey);
  const evidence = styleEvidence(profile, fact, editorial);
  if (selection.confidence === "editorial") {
    evidence.push("editorial-hint-match", "editorial-action-match");
  } else if (selection.confidence === "reviewed") {
    evidence.push("reviewed-semantic-override", "reviewed-action-match");
  } else {
    evidence.push("role-inference");
    if (selection.evidenceScope === "recurring-cross-edition") {
      evidence.push("recurring-cross-edition-context");
    } else if (
      selection.exactEditorialActionIds.length
      || selection.reviewedActionIds.length
    ) {
      evidence.push("exact-edition-partial-context");
    } else if (selection.matchedHintIds.length) {
      evidence.push("editorial-headline-context");
    }
  }
  return {
    ...selection,
    signature: signaturesById.get(selection.signatureId),
    actions: selection.actionIds.map((id) => actionsById.get(id)),
    evidence
  };
}

function validateHistoricalStyleNoteVariants(variants, beats, language) {
  for (const [index, note] of variants.entries()) {
    const sentenceCount = countNoteSentences(note);
    if (sentenceCount < 2 || sentenceCount > 3) {
      throw new Error(`${language} historical style-note variant ${index} must contain 2-3 sentences.`);
    }
    if (/[;；\u2013\u2014]/u.test(note)) {
      throw new Error(`${language} historical style-note variant ${index} contains forbidden punctuation.`);
    }
    const normalizedNote = note.toLocaleLowerCase("en-US");
    for (const beat of beats) {
      if (!normalizedNote.includes(String(beat || "").toLocaleLowerCase("en-US"))) {
        throw new Error(
          `${language} historical style-note variant ${index} dropped a semantic beat: ${beat}`
        );
      }
    }
    if (language === "English") {
      const heLedSentences = note
        .split(/(?<=[.!?])\s+/u)
        .filter((sentence) => /^He\b/u.test(sentence));
      if (heLedSentences.length > 1) {
        throw new Error(
          `English historical style-note variant ${index} starts more than one sentence with He.`
        );
      }
    }
  }
}

function buildEvergreenStyleCopy(profile, fact, { reservedPlayerStructures, reservedZhNotes } = {}) {
  const name = shortName(profile);
  const sentenceName = upperFirst(name);
  const semantics = generatedStyleSemantics(profile, fact);
  const primary = semantics.signature;
  const [first, second] = semantics.actions;
  const editorialReinforcingVariants = [
    `Watch ${sentenceName} for ${primary.en}. Two cues are how he ${first.en} and how he ${second.en}.`,
    `For ${sentenceName}, the starting point is ${primary.en}. Notice how he ${first.en}. A second cue is how he ${second.en}.`,
    `${upperFirst(primary.en)} defines the way ${name} plays. Look for how he ${first.en}. The same quality appears when he ${second.en}.`,
    `${sentenceName} stands out for ${primary.en}. One cue is how he ${first.en}. Another is how he ${second.en}.`,
    `The key to ${name} is ${primary.en}. He ${first.en}. The same quality appears when he ${second.en}.`,
    `For ${name}, ${primary.en} is the foundation. Look first at how he ${first.en}. The same quality appears when he ${second.en}.`,
    `${possessive(sentenceName)} signature is ${primary.en}. Watch how he ${first.en}. The same quality appears when he ${second.en}.`,
    `Watch ${sentenceName} for ${primary.en}. One clue is how he ${first.en}. Another appears when ${name} ${second.en}.`,
    `What separates ${name} is ${primary.en}. ${sentenceName} ${first.en}, while another clue is how he ${second.en}.`,
    `${possessive(sentenceName)} edge comes from ${primary.en}. One sign is how he ${first.en}. The same edge returns as he ${second.en}.`,
    `${sentenceName} is defined by ${primary.en}. One sign is how he ${first.en}. The same reading returns when he ${second.en}.`,
    `The key to ${name} is ${primary.en}. He ${first.en}. The same quality appears in a different phase when he ${second.en}.`
  ];
  const editorialAdditionalVariants = [
    `Watch ${sentenceName} for ${primary.en}. First, notice how he ${first.en}. Separately, he ${second.en}.`,
    `For ${sentenceName}, the starting point is ${primary.en}. Notice how he ${first.en}. Beyond that, he ${second.en}.`,
    `${upperFirst(primary.en)} defines the way ${name} plays. Look for how he ${first.en}. Separately, he ${second.en}.`,
    `${sentenceName} stands out for ${primary.en}. First, watch how he ${first.en}. Separately, he ${second.en}.`,
    `The key to ${name} is ${primary.en}. He ${first.en}. Beyond that, he ${second.en}.`,
    `For ${name}, start with ${primary.en}. Watch how he ${first.en}. Separately, he ${second.en}.`,
    `${possessive(sentenceName)} signature is ${primary.en}. Watch how he ${first.en}. Separately, he ${second.en}.`,
    `Watch ${sentenceName} for ${primary.en}. First, notice how he ${first.en}. Beyond that, ${name} ${second.en}.`,
    `What separates ${name} is ${primary.en}. ${sentenceName} ${first.en}. Separately, he ${second.en}.`,
    `${possessive(sentenceName)} edge comes from ${primary.en}. You can see it when he ${first.en}. Beyond that, he ${second.en}.`,
    `${sentenceName} is defined by ${primary.en}. One sign is how he ${first.en}. Separately, he ${second.en}.`,
    `The key to ${name} is ${primary.en}. He ${first.en}. Separately, he ${second.en}.`
  ];
  const roleLevelReinforcingVariants = [
    `Watch ${sentenceName} for ${primary.en}. One detail is how he ${first.en}. The idea carries into how he ${second.en}.`,
    `With ${sentenceName}, start with ${primary.en}. He ${first.en}. The same thread continues when he ${second.en}.`,
    `From ${possessive(name)} position, start with ${primary.en}. He ${first.en}. The same reading returns in how he ${second.en}.`,
    `For ${sentenceName}, start with ${primary.en}. Look for how he ${first.en}. That pattern continues when he ${second.en}.`,
    `In ${possessive(sentenceName)} position, start with ${primary.en}. One sign is how he ${first.en}. The same idea appears as he ${second.en}.`,
    `With ${sentenceName} in this position, look first for ${primary.en}. He ${first.en}. The same thread shows in how he ${second.en}.`,
    `The first detail to track with ${sentenceName} is ${primary.en}. Notice how he ${first.en}. That pattern returns when he ${second.en}.`,
    `To assess ${sentenceName}, start with ${primary.en}. He ${first.en}. The same idea appears when he ${second.en}.`,
    `For ${sentenceName}, start with ${primary.en}. ${sentenceName} ${first.en}. The same idea appears when he ${second.en}.`,
    `Watch the details around ${sentenceName}: ${primary.en}. He ${first.en}. The same idea matters when he ${second.en}.`,
    `For ${sentenceName}, start with ${primary.en}. One detail is how he ${first.en}. The same idea returns as he ${second.en}.`,
    `To follow ${sentenceName}, begin with ${primary.en}. He ${first.en}. The same thread continues in another phase when he ${second.en}.`
  ];
  const roleLevelAdditionalVariants = [
    `The first thing to track with ${sentenceName} is ${primary.en}. Notice how he ${first.en}. Beyond that, he ${second.en}.`,
    `A useful starting point with ${sentenceName} is ${primary.en}. Notice how he ${first.en}. Elsewhere, he ${second.en}.`,
    `From ${possessive(name)} position, first look for ${primary.en}. He ${first.en}. Separately, he ${second.en}.`,
    `To follow ${sentenceName}, start with ${primary.en}. Look at how he ${first.en}. Also note how he ${second.en}.`,
    `In ${possessive(sentenceName)} position, start with ${primary.en}. One action to notice is how he ${first.en}. Separately, he ${second.en}.`,
    `With ${sentenceName} in this position, look first for ${primary.en}. He ${first.en}. Separately, he ${second.en}.`,
    `The first detail to track with ${sentenceName} is ${primary.en}. Watch how he ${first.en}. In a separate phase, he ${second.en}.`,
    `To assess ${sentenceName}, start with ${primary.en}. He ${first.en}. A different clue is how he ${second.en}.`,
    `For ${sentenceName}, a useful starting point is ${primary.en}. ${sentenceName} ${first.en}. Separately, he ${second.en}.`,
    `Watch the details around ${sentenceName}: ${primary.en}. He ${first.en}. Separately, he ${second.en}.`,
    `For ${sentenceName}, start with ${primary.en}. One detail is how he ${first.en}. Separately, he ${second.en}.`,
    `To follow ${sentenceName}, begin with ${primary.en}. He ${first.en}. Beyond that, he ${second.en}.`
  ];
  const reinforcesHeadline = semantics.supportRelation === "reinforces-headline";
  const variants = semantics.confidence === "role-level"
    ? (reinforcesHeadline ? roleLevelReinforcingVariants : roleLevelAdditionalVariants)
    : (reinforcesHeadline ? editorialReinforcingVariants : editorialAdditionalVariants);
  validateHistoricalStyleNoteVariants(
    variants,
    [primary.en, first.en, second.en],
    "English"
  );
  const editorialReinforcingVariantsZh = [
    `观察他的比赛，重点是${primary.zh}。一个表现是：他会${first.zh}。同一特点也体现在下一项动作中：他会${second.zh}。`,
    `他的比赛特点是${primary.zh}。留意他会${first.zh}。同一特点还体现在下一项动作中：他会${second.zh}。`,
    `${primary.zh}塑造了他的比赛方式。观察他如何${first.zh}。同一特点也体现在下一项动作中：他会${second.zh}。`,
    `他的突出特点是${primary.zh}。一个表现是：他会${first.zh}。同一特点还体现在下一项动作中：他会${second.zh}。`,
    `理解他的关键是${primary.zh}。一个表现是：他会${first.zh}。同一特点也体现在下一项动作中：他会${second.zh}。`,
    `对他来说，${primary.zh}是比赛基础。留意他会${first.zh}。同一特点还体现在下一项动作中：他会${second.zh}。`,
    `他的鲜明标志是${primary.zh}。观察他如何${first.zh}。同一特点也体现在下一项动作中：他会${second.zh}。`,
    `观察他时要注意${primary.zh}。一个表现是：他会${first.zh}。同一特点还体现在下一项动作中：他会${second.zh}。`,
    `让他显得不同的是${primary.zh}。一处表现是：他会${first.zh}。同一特点也体现在下一项动作中：他会${second.zh}。`,
    `他的优势来自${primary.zh}。观察他如何${first.zh}。同一特点还体现在下一项动作中：他会${second.zh}。`,
    `${primary.zh}决定了他的比赛方式。这一点可以从他的动作中看出：他会${first.zh}。同一特点也体现在下一项动作中：他会${second.zh}。`,
    `理解他的关键是${primary.zh}。留意他会${first.zh}。同一特点还体现在下一项动作中：他会${second.zh}。`
  ];
  const editorialAdditionalVariantsZh = [
    `观察他的比赛，重点是${primary.zh}。一个表现是他会${first.zh}。另外，他会${second.zh}。`,
    `他的比赛特点是${primary.zh}。留意他会${first.zh}。除此之外，他会${second.zh}。`,
    `${primary.zh}塑造了他的比赛方式。观察他如何${first.zh}。在比赛的另一部分，他会${second.zh}。`,
    `他的突出特点是${primary.zh}。一个表现是他会${first.zh}。另外，他会${second.zh}。`,
    `理解他的关键是${primary.zh}。一个表现是他会${first.zh}。除此之外，他会${second.zh}。`,
    `对他来说，${primary.zh}是比赛基础。留意他会${first.zh}。在比赛的另一部分，他会${second.zh}。`,
    `他的鲜明标志是${primary.zh}。观察他如何${first.zh}。另外，他会${second.zh}。`,
    `观察他时要注意${primary.zh}。一个表现是他会${first.zh}。除此之外，他会${second.zh}。`,
    `让他显得不同的是${primary.zh}。一处表现是他会${first.zh}。另外，他会${second.zh}。`,
    `他的优势来自${primary.zh}。观察他如何${first.zh}。除此之外，他会${second.zh}。`,
    `${primary.zh}决定了他的比赛方式。这体现在他会${first.zh}。在比赛的另一部分，他会${second.zh}。`,
    `理解他的关键是${primary.zh}。留意他会${first.zh}。另外，他会${second.zh}。`
  ];
  const roleLevelReinforcingVariantsZh = [
    `观察他的比赛时，可以留意${primary.zh}。一处细节是：他会${first.zh}。这一特点也能从下一项动作看出：他会${second.zh}。`,
    `理解他的场上工作，重点是${primary.zh}。观察他如何${first.zh}。同样可以看到他会${second.zh}。`,
    `${primary.zh}是观察他的一个切入点。他会${first.zh}。他会${second.zh}，也能说明这一点。`,
    `看他的比赛，重点是${primary.zh}。一处表现是：他会${first.zh}。他会${second.zh}，这种处理延续了下来。`,
    `他的场上位置需要${primary.zh}。观察他如何${first.zh}。另一项动作也延续了同一思路：他会${second.zh}。`,
    `当他出现在这个位置时，重点是${primary.zh}。他会${first.zh}。同一要求也能从另一项动作看出：他会${second.zh}。`,
    `观察他的第一个重点是${primary.zh}。留意他会${first.zh}。他会${second.zh}，这一特点再次出现。`,
    `观察他的场上工作，重点是${primary.zh}。一个线索是：他会${first.zh}。他会${second.zh}，也是同一思路的表现。`,
    `对他来说，观察起点是${primary.zh}。他会${first.zh}。下一项动作提供了相同线索：他会${second.zh}。`,
    `观察他时有三个细节：${primary.zh}。一处表现是：他会${first.zh}。同样值得注意的是，他会${second.zh}。`,
    `要理解他的场上任务，可以观察${primary.zh}。第一项动作中，他会${first.zh}。另一项动作也体现了这一点：他会${second.zh}。`,
    `观察他的比赛时，重点是${primary.zh}。他会${first.zh}。换一个阶段，同样可以看到他会${second.zh}。`
  ];
  const roleLevelAdditionalVariantsZh = [
    `观察他的比赛时，可以留意${primary.zh}。一处细节是：他会${first.zh}。另外，他会${second.zh}。`,
    `理解他的场上工作，重点是${primary.zh}。观察他如何${first.zh}。还要看他会${second.zh}。`,
    `${primary.zh}是观察他的一个切入点。他会${first.zh}。另一项任务是${second.zh}。`,
    `看他的比赛，重点是${primary.zh}。一处表现是：他会${first.zh}。另外也要留意他会${second.zh}。`,
    `他的场上位置需要${primary.zh}。观察他如何${first.zh}。另一项要求是${second.zh}。`,
    `当他出现在这个位置时，重点是${primary.zh}。他会${first.zh}。另外，换一个阶段时他会${second.zh}。`,
    `观察他的第一个重点是${primary.zh}。留意他会${first.zh}。另一处表现是他会${second.zh}。`,
    `观察他的场上工作，重点是${primary.zh}。一个线索是：他会${first.zh}。不同的线索来自另一项动作：他会${second.zh}。`,
    `对他来说，观察起点是${primary.zh}。他会${first.zh}。另一项工作是${second.zh}。`,
    `观察他时要看${primary.zh}。接着，他会${first.zh}。除此之外，他会${second.zh}。`,
    `要理解他的场上任务，可以观察${primary.zh}。第一处动作是：他会${first.zh}。另一项责任是${second.zh}。`,
    `观察他的比赛时，重点是${primary.zh}。他会${first.zh}。在另一部分，他会${second.zh}。`
  ];
  const variantsZh = semantics.confidence === "role-level"
    ? (reinforcesHeadline ? roleLevelReinforcingVariantsZh : roleLevelAdditionalVariantsZh)
    : (reinforcesHeadline ? editorialReinforcingVariantsZh : editorialAdditionalVariantsZh);
  validateHistoricalStyleNoteVariants(
    variantsZh,
    [primary.zh, first.zh, second.zh],
    "Chinese"
  );
  const initialZhIndex = stableHash(`${profile.profileKey}:shape`) % variantsZh.length;
  const recurringIdentityKey = [
    historicalIdentityNameKey(profile.name, profile.teamName),
    normalizeTeamName(profile.teamName)
  ].join("|");
  if (!reservedPlayerStructures?.has(recurringIdentityKey)) {
    reservedPlayerStructures?.set(recurringIdentityKey, new Set());
  }
  const usedPlayerStructures = reservedPlayerStructures?.get(recurringIdentityKey);
  let selectedZhIndex = -1;
  for (let offset = 0; offset < variantsZh.length; offset += 1) {
    const candidateIndex = (initialZhIndex + offset) % variantsZh.length;
    const candidate = cleanNoteZh(introducePlayerInChineseStyle(variantsZh[candidateIndex], profile));
    const candidateStructure = [
      primary.id,
      first.id,
      second.id,
      HISTORICAL_STYLE_SHAPES[candidateIndex % variants.length]
    ].join("|");
    // Chinese archive cards do not have a complete Han-character name map. Requiring every note
    // to be globally unique previously forced random semantic identities just to manufacture
    // variation. Keep recurring editions of the same player structurally distinct, while allowing
    // different players with the same supported role guide to share a truthful translation.
    if (!usedPlayerStructures?.has(candidateStructure)) {
      selectedZhIndex = candidateIndex;
      break;
    }
  }
  if (selectedZhIndex < 0) {
    throw new Error(`Unable to find a unique Chinese historical style-note shape for ${profile.profileKey}`);
  }
  const variantIndex = selectedZhIndex % variants.length;
  const polishedCopy = buildFocusedHistoricalStylePolish(
    profile,
    primary,
    first,
    second,
    semantics.supportRelation
  );
  const note = polishedCopy?.english || variants[variantIndex];
  const styleNoteZh = polishedCopy?.chinese || introducePlayerInChineseStyle(variantsZh[selectedZhIndex], profile);
  reservedZhNotes?.add(cleanNoteZh(styleNoteZh));
  usedPlayerStructures?.add([
    primary.id,
    first.id,
    second.id,
    HISTORICAL_STYLE_SHAPES[variantIndex]
  ].join("|"));
  const meta = {
    origin: "generated",
    version: HISTORICAL_STYLE_COPY_VERSION,
    role: semantics.role,
    roleSource: semantics.roleSource,
    roleGuideVariant: semantics.roleGuideVariant,
    roleGuidePreferredVariant: semantics.roleGuidePreferredVariant,
    roleGuideCollisionResolved: semantics.roleGuideCollisionResolved,
    signature: primary.id,
    actions: [first.id, second.id],
    sources: semantics.sourceSkills,
    semanticSources: semantics.semanticSources,
    supportRelation: semantics.supportRelation,
    evidence: semantics.evidence,
    evidenceScope: semantics.evidenceScope,
    confidence: semantics.confidence,
    structureId: HISTORICAL_STYLE_SHAPES[variantIndex]
  };
  if (!getGeneratedPlayerCardCopy(note, {
    historical: true,
    copyMeta: meta,
    localizedName: name
  })) {
    throw new Error(`Generated English historical style note metadata no longer matches the locale contract: ${profile.profileKey}`);
  }
  return {
    styleNote: note,
    styleNoteZh,
    meta
  };
}

function buildNote(profile, fact) {
  const team = profile.teamName;
  const year = profile.tournamentYear;
  const role = roleLabel(profile.position);
  const teamPossessive = possessive(team);
  const goals = Number(profile.goals || 0);
  const keyMatches = Number(profile.keyMatchCount || fact.keyEvents.length || 0);
  const goalText = goals > 0 ? ` Credited with ${goals} World Cup ${goals === 1 ? "goal" : "goals"}.` : "";
  const matchText = keyMatches > 0 ? ` Appears in ${keyMatches} featured ${keyMatches === 1 ? "match" : "matches"}.` : "";
  return `${teamPossessive} ${year} World Cup ${role}.${goalText}${matchText}`.trim();
}

function buildNoteZh(profile, fact) {
  const team = teamZh(profile.teamName);
  const year = profile.tournamentYear;
  const role = roleLabelZh(profile.position);
  const goals = Number(profile.goals || 0);
  const keyMatches = Number(profile.keyMatchCount || fact.keyEvents.length || 0);
  const roleText = role === "球员" ? "具体位置未细分" : `位置是${role}`;
  const goalText = goals > 0 ? `本届打进${goals}球。` : "";
  const matchText = keyMatches > 0 ? `本站收录了他${keyMatches}场重点比赛。` : "";
  return `他在${year}年世界杯代表${team}，${roleText}。${goalText}${matchText}`.replace(/\s+/g, " ").trim();
}

function cleanNote(note) {
  return String(note || "")
    .replace(/\barchive lens\b/gi, "archive")
    .replace(/\bsquad-context\b/gi, "squad")
    .replace(/\bsupporting a scoring route through\b/gi, "connected to")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanNoteZh(note) {
  return String(note || "")
    .replace(/([\p{Script=Latin}'’.-])\s+(?=[\p{Script=Latin}'’.-])/gu, "$1\u0000")
    .replace(/\s+/g, "")
    .replace(/\u0000/gu, " ")
    .trim();
}

function countNoteSentences(value) {
  return String(value || "")
    .split(/[.!?。！？]+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .length;
}

function normalizeNoteComparison(value) {
  return String(value || "")
    .toLocaleLowerCase("en-US")
    .replace(/\s+/g, " ")
    .trim();
}

const BASELINE_ONE_LINE_STYLE_NOTE_PATTERNS = [
  /^[^.!?]+?'s\s+(?:19|20)\d{2}\s+World Cup\s+(?:goalkeeper|defender|midfielder|forward|player)\.?$/i,
  /\b(?:19|20)\d{2}\s+World Cup\s+(?:squad|roster)\s+(?:member|option|player|picture)\b/i,
  /\b(?:archive lens|match lens|squad-context|supporting a scoring route)\b/i
];

const BASELINE_ONE_LINE_STYLE_NOTE_ZH_PATTERNS = [
  /^他在(?:19|20)\d{2}年世界杯代表.+，(?:位置是(?:门将|后卫|中场|前锋)|具体位置未细分)。?$/u,
  /(?:世界杯阵容中的|世界杯名单里包括这名|属于.+世界杯阵容的一员)/u,
  /(?:档案视角|比赛视角|阵容背景)/u
];
const HISTORICAL_EDITORIAL_MANIFEST_ORIGIN = "editorial-manifest";

function isClearlyBaselineOneLineStyleNote(value, fallbackValue, language) {
  const note = String(value || "").replace(/\s+/g, " ").trim();
  if (!note || countNoteSentences(note) !== 1 || note.length > 180) {
    return false;
  }

  const fallback = String(fallbackValue || "").trim();
  if (fallback && normalizeNoteComparison(note) === normalizeNoteComparison(fallback)) {
    return true;
  }

  const patterns = language === "zh"
    ? BASELINE_ONE_LINE_STYLE_NOTE_ZH_PATTERNS
    : BASELINE_ONE_LINE_STYLE_NOTE_PATTERNS;
  return patterns.some((pattern) => pattern.test(note));
}

function isAuthoredStyleProfile(profile) {
  return EVERGREEN_SPOTLIGHTS.has(profile.profileKey) || profile.styleNoteMeta?.origin === "authored";
}

function isManifestReviewedStyleProfile(profile) {
  return profile.styleNoteMeta?.origin === HISTORICAL_EDITORIAL_MANIFEST_ORIGIN;
}

function styleNoteCanBeUpgraded(profile, language, { missingOnly, rewriteSubstantive }) {
  const note = String(language === "zh" ? profile.styleNoteZh : profile.styleNote || "").trim();
  if (!note) return true;
  if (isManifestReviewedStyleProfile(profile)) return false;
  if (isAuthoredStyleProfile(profile)) {
    const canonical = language === "zh"
      ? EVERGREEN_SPOTLIGHTS_ZH.get(profile.profileKey)
      : EVERGREEN_SPOTLIGHTS.get(profile.profileKey);
    return Boolean(canonical && note !== canonical);
  }
  if (missingOnly) return false;
  if (rewriteSubstantive) return true;
  return profile.styleNoteMeta?.origin !== "generated"
    || profile.styleNoteMeta?.version !== HISTORICAL_STYLE_COPY_VERSION;
}

export function historicalGeneratedStyleUpdatePlan(
  profile,
  copy,
  { authored = false, missingOnly = false, rewriteSubstantive = false, zhOnly = false } = {}
) {
  const computedMeta = copy?.meta || copy;
  const generatedSemanticDrift = !authored
    && !isManifestReviewedStyleProfile(profile)
    && (
      JSON.stringify(profile.styleNoteMeta || null) !== JSON.stringify(computedMeta || null)
      || (copy?.styleNote !== undefined && cleanNote(profile.styleNote) !== cleanNote(copy.styleNote))
      || (copy?.styleNoteZh !== undefined && cleanNoteZh(profile.styleNoteZh) !== cleanNoteZh(copy.styleNoteZh))
    );
  return {
    generatedSemanticDrift,
    canUpdateEnglishStyleNote: generatedSemanticDrift || (!zhOnly && styleNoteCanBeUpgraded(
      profile,
      "en",
      { missingOnly, rewriteSubstantive }
    )),
    canUpdateChineseStyleNote: generatedSemanticDrift || styleNoteCanBeUpgraded(
      profile,
      "zh",
      { missingOnly, rewriteSubstantive }
    )
  };
}

function buildAuthoredStyleCopy(profile) {
  const styleNote = EVERGREEN_SPOTLIGHTS.get(profile.profileKey) || String(profile.styleNote || "").trim();
  const styleNoteZh = EVERGREEN_SPOTLIGHTS_ZH.get(profile.profileKey) || String(profile.styleNoteZh || "").trim();
  const semantic = AUTHORED_STYLE_SEMANTICS.get(profile.profileKey);
  return {
    styleNote,
    styleNoteZh,
    meta: {
      origin: "authored",
      version: "historical-style-authored-v1",
      role: inferHistoricalStyleRole(profile),
      signature: semantic?.signature || "authored-evergreen",
      actions: semantic?.actions ? [...semantic.actions] : ["authored-observation", "authored-observation"],
      sources: ["editorial-spotlight"],
      evidence: ["editorial-spotlight"],
      confidence: "editorial",
      structureId: semantic?.structureId || "authored-prose"
    }
  };
}

function createFactIndex(profiles, targetYears) {
  const facts = new Map();
  for (const profile of Object.values(profiles)) {
    if (!targetYears.has(Number(profile.tournamentYear))) continue;
    const key = factKey(profile.name, profile.teamName, profile.tournamentYear);
    facts.set(key, {
      profile,
      goalEvents: [],
      keyEvents: []
    });
  }
  return facts;
}

function historicalYears(profiles) {
  return [
    ...new Set(
      Object.values(profiles)
        .map((profile) => Number(profile.tournamentYear))
        .filter((year) => Number.isInteger(year))
    )
  ];
}

function addFixtureFacts(facts, fixture) {
  const teams = fixtureTeams(fixture);
  for (const side of ["home", "away"]) {
    const teamName = teams[side];
    const opponent = opponentName(fixture, side);
    const goals = side === "home" ? fixture.goalsHome || [] : fixture.goalsAway || [];
    for (const goal of goals) {
      if (!goal?.name || goal.ownGoal) continue;
      const fact = facts.get(factKey(goal.name, teamName, fixture.tournamentYear));
      if (!fact) continue;
      fact.goalEvents.push({
        fixture,
        side,
        teamName,
        opponent,
        penalty: Boolean(goal.penalty)
      });
    }

    for (const player of fixture.keyPlayers?.[side] || []) {
      if (!player?.name) continue;
      const fact = facts.get(factKey(player.name, teamName, fixture.tournamentYear));
      if (!fact) continue;
      fact.keyEvents.push({
        fixture,
        side,
        teamName,
        opponent,
        note: player.note || "",
        position: player.position || ""
      });
    }
  }
}

export async function refreshHistoricalPlayerCardNotes() {
  const dryRun = hasArg("dry-run");
  const missingOnly = hasArg("missing-only");
  const zhOnly = hasArg("zh-only");
  const rewriteSubstantive = hasArg("rewrite-substantive");
  const [profilesData, historyData, currentProfiles, teams] = await Promise.all([
    readJson(profilesPath),
    readJson(historyPath),
    readJson(currentProfilesPath),
    readJson(teamsPath)
  ]);
  const profiles = profilesData.profiles || {};
  const requestedYears = parseYears(getArgValue("years"));
  const targetYears = new Set(requestedYears.length ? requestedYears : historicalYears(profiles));
  const visiblyCorrectedProfileKeys = applyReviewedVisibleProfileCorrections(profiles, targetYears);
  configureHistoricalRoleEvidence(profiles, historyData, { currentProfiles, teams });
  const facts = createFactIndex(profiles, targetYears);
  const reservedZhNotes = new Set();
  const reservedPlayerStructures = new Map();
  for (const profile of Object.values(profiles)) {
    if (isAuthoredStyleProfile(profile)) {
      const authoredZh = cleanNoteZh(buildAuthoredStyleCopy(profile).styleNoteZh);
      if (authoredZh) reservedZhNotes.add(authoredZh);
    } else if (isManifestReviewedStyleProfile(profile)) {
      const existingZh = cleanNoteZh(profile.styleNoteZh);
      if (existingZh) reservedZhNotes.add(existingZh);
    } else if (!targetYears.has(Number(profile.tournamentYear))) {
      const existingZh = cleanNoteZh(profile.styleNoteZh);
      if (existingZh) reservedZhNotes.add(existingZh);
      const recurringIdentityKey = [
        historicalIdentityNameKey(profile.name, profile.teamName),
        normalizeTeamName(profile.teamName)
      ].join("|");
      if (!reservedPlayerStructures.has(recurringIdentityKey)) {
        reservedPlayerStructures.set(recurringIdentityKey, new Set());
      }
      reservedPlayerStructures.get(recurringIdentityKey).add([
        profile.styleNoteMeta?.signature,
        ...(profile.styleNoteMeta?.actions || []),
        profile.styleNoteMeta?.structureId
      ].join("|"));
    }
  }

  for (const fixture of historyData.fixtures || []) {
    if (targetYears.has(Number(fixture.tournamentYear))) {
      addFixtureFacts(facts, fixture);
    }
  }

  let updated = visiblyCorrectedProfileKeys.size;
  let updatedEnglishStyleNotes = 0;
  let updatedChineseStyleNotes = 0;
  let updatedMetadata = 0;
  let preservedAuthoredProfiles = 0;
  for (const fact of facts.values()) {
    const profile = fact.profile;
    const hasReviewedVisibleCorrection = visiblyCorrectedProfileKeys.has(profile.profileKey);
    const authored = isAuthoredStyleProfile(profile);
    const manifestReviewed = isManifestReviewedStyleProfile(profile);
    const copy = manifestReviewed
      ? {
          styleNote: profile.styleNote,
          styleNoteZh: profile.styleNoteZh,
          meta: profile.styleNoteMeta
        }
      : authored
      ? buildAuthoredStyleCopy(profile)
      : buildEvergreenStyleCopy(profile, fact, { reservedPlayerStructures, reservedZhNotes });
    const hasText = (value) => Boolean(String(value || "").trim());
    const {
      canUpdateEnglishStyleNote,
      canUpdateChineseStyleNote
    } = historicalGeneratedStyleUpdatePlan(profile, copy, {
      authored,
      missingOnly,
      rewriteSubstantive,
      zhOnly
    });
    const canUpdateEnglishNote = !zhOnly && (
      hasReviewedVisibleCorrection
      ||
      rewriteSubstantive || (missingOnly && !hasText(profile.note))
    );
    const canUpdateChineseNote = hasReviewedVisibleCorrection
      || rewriteSubstantive || (missingOnly && !hasText(profile.noteZh));
    const canUpdateSkills = rewriteSubstantive || (
      missingOnly && (!Array.isArray(profile.skills) || !profile.skills.length)
    );
    const styleNote = canUpdateEnglishStyleNote ? cleanNote(copy.styleNote) : profile.styleNote;
    const styleNoteZh = canUpdateChineseStyleNote ? cleanNoteZh(copy.styleNoteZh) : profile.styleNoteZh;
    const note = canUpdateEnglishNote ? cleanNote(buildNote(profile, fact)) : profile.note;
    const noteZh = canUpdateChineseNote ? cleanNoteZh(buildNoteZh(profile, fact)) : profile.noteZh;
    let skills = canUpdateSkills ? refinedSkills(profile, fact) : profile.skills;
    const visibleCorrection = HISTORICAL_REVIEWED_VISIBLE_PROFILE_CORRECTIONS[profile.profileKey];
    if (visibleCorrection) {
      skills = [...new Set([
        ...(skills || []).filter((skill) => !visibleCorrection.removeSkills.includes(skill)),
        ...visibleCorrection.addSkills
      ])];
    }
    const styleNoteMeta = copy.meta;
    const englishStyleChanged = canUpdateEnglishStyleNote && profile.styleNote !== styleNote;
    const chineseStyleChanged = canUpdateChineseStyleNote && profile.styleNoteZh !== styleNoteZh;
    const englishNoteChanged = canUpdateEnglishNote && profile.note !== note;
    const chineseNoteChanged = canUpdateChineseNote && profile.noteZh !== noteZh;
    const skillsChanged = canUpdateSkills &&
      JSON.stringify(profile.skills || []) !== JSON.stringify(skills || []);
    const metadataChanged = JSON.stringify(profile.styleNoteMeta || null) !== JSON.stringify(styleNoteMeta);
    if (authored) preservedAuthoredProfiles += 1;
    if (englishStyleChanged) updatedEnglishStyleNotes += 1;
    if (chineseStyleChanged) updatedChineseStyleNotes += 1;
    if (metadataChanged) updatedMetadata += 1;
    if (
      englishStyleChanged ||
      chineseStyleChanged ||
      englishNoteChanged ||
      chineseNoteChanged ||
      skillsChanged ||
      metadataChanged
    ) {
      if (englishStyleChanged) profile.styleNote = styleNote;
      if (chineseStyleChanged) profile.styleNoteZh = styleNoteZh;
      if (englishNoteChanged) profile.note = note;
      if (chineseNoteChanged) profile.noteZh = noteZh;
      if (skillsChanged) profile.skills = skills;
      if (metadataChanged) profile.styleNoteMeta = styleNoteMeta;
      if (!visiblyCorrectedProfileKeys.has(profile.profileKey)) updated += 1;
      visiblyCorrectedProfileKeys.add(profile.profileKey);
    }
  }

  if (updated && !dryRun) {
    profilesData.updatedAt = new Date().toISOString();
    await writeFile(profilesPath, `${JSON.stringify(profilesData, null, 2)}\n`);
  }

  console.log(
    `${dryRun ? "Would refresh" : "Refreshed"} ${updated} historical player cards for ${[...targetYears].sort((a, b) => b - a).join(", ")}.`
  );
  console.log(
    `${dryRun ? "Would update" : "Updated"} ${updatedEnglishStyleNotes} English, ` +
      `${updatedChineseStyleNotes} Chinese style notes, and ${updatedMetadata} provenance records.`
  );
  console.log(`Preserved ${preservedAuthoredProfiles} provenance-marked editorial spotlights.`);
  console.log(
    `Applied ${Object.keys(HISTORICAL_REVIEWED_VISIBLE_PROFILE_CORRECTIONS).filter((profileKey) => targetYears.has(Number(profiles[profileKey]?.tournamentYear))).length} reviewed visible-position/skill allowlist entries.`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await refreshHistoricalPlayerCardNotes();
}
