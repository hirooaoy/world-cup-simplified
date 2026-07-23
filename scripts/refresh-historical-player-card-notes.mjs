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
  ["Romário / Brazil / 1994", "Watch Romário separate from his marker just before the delivery reaches the box. He finishes with almost no setup, often with the toe of his boot, while his understanding with Bebeto lets either striker run or supply. At the far post, even taller defenders can lose him before the cross arrives."],
  ["Roberto Baggio / Italy / 1994", "Baggio connects Italy's attack and then becomes its finisher. He can meet a cut-back and guide it into the bottom corner without resetting. Running beyond the line, he takes the pass around the goalkeeper and still scores from a narrowing angle."],
  ["Zinedine Zidane / France / 1998", "France use Zidane as the playmaker behind the striker, trusting him to control the game and move attacks forward with deft passes. Against Saudi Arabia, one such pass releases Lizarazu down the line; after a two-match suspension, Zidane returns and scores twice from corners in the final."],
  ["Oliver Kahn / Germany / 2002", "Kahn's 2002 saves start from a patient set position. Once the shot commits him, he stands tall, sweeps low or reaches a fingertip around the post. When he holds the ball, a booming punt can begin the next attack before the opposition resets."],
  ["Johan Cruyff / Netherlands / 1974", "Cruyff organises the Netherlands by roaming away from a fixed centre-forward position. He moves toward the ball to create an extra option, then leaves that space for a teammate as the positions rotate. When possession is lost, he joins the swarm around the ball."],
  ["Ronaldinho / Brazil / 2006", "Brazil use Ronaldinho as a deeper creator in the magic square, under tighter positional rules than in Barcelona's front three. He comes toward the ball to release a forward early, combines in short bursts with Kaká, and gets room to carry when the opposition midfield opens."],
  ["James Rodríguez / Colombia / 2014", "Colombia give James freedom to drift in from a high starting position and find space behind midfield. He opens onto his left foot, then either slips a runner through or follows the move into the box to finish it himself."],
  ["Neymar / Brazil / 2022", "Brazil give Neymar freedom behind Richarlison while Vinícius Júnior and Raphinha hold the width. He drops toward midfield to connect play; against Croatia, his decisive combination shows the other half of the role, following the exchange into the box to finish it."],
  ["Cristiano Ronaldo / Portugal / 2022", "Portugal keep Cristiano Ronaldo high and central, using him as the target when the ball enters the box. He attacks crosses at the far post or through the centre. By the knockout rounds, he is coming on from the bench rather than starting."],
  ["Xavi / Spain / 2010", "Xavi shapes Spain's pace from central midfield, staying available for the short pass and moving possession away from pressure. He completes a tournament-record 599 passes, then supplies the corner Puyol heads in to decide the semi-final."],
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
  ["Romário / Brazil / 1994", "留意球送进禁区前，罗马里奥如何突然从盯防者身边拉开。他几乎不需要调整就能射门，常常直接用脚尖捅射；与贝贝托的默契，又让两人可以随时交换跑位者和传球者的角色。到了后点，即使更高大的后卫也可能在传中到来前跟丢他。"],
  ["Roberto Baggio / Italy / 1994", "巴乔先串联意大利的进攻，随后又成为终结者。面对倒三角回传，他无需重新调整，便能顺势把球推入球门下角。前插到防线身后时，他接球后趟过门将，即使射门角度不断变窄仍能得分。"],
  ["Zinedine Zidane / France / 1998", "法国让齐达内担任中锋身后的组织核心，依靠他掌控比赛，并用细腻的传球推动进攻。对沙特阿拉伯，他用这样的传球送利扎拉祖沿边路前插；停赛两场后复出，他在决赛两次利用角球头球破门。"],
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
    && /\bscreen(?:s|ed|ing)? (?:[a-z'’-]+ )?(?:back line|back four|transitions)\b/.test(reason)
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
  const note = variants[variantIndex];
  const styleNoteZh = introducePlayerInChineseStyle(variantsZh[selectedZhIndex], profile);
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

function styleNoteCanBeUpgraded(profile, language, { missingOnly, rewriteSubstantive }) {
  const note = String(language === "zh" ? profile.styleNoteZh : profile.styleNote || "").trim();
  if (!note) return true;
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
    const copy = authored
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
