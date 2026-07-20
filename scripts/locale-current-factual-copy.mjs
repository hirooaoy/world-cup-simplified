import esAppPack from "../locales/es/app.js";
import koAppPack from "../locales/ko/app.js";
import { ES_PLAYER_NAME_TRANSLATIONS } from "../locales/es/player-names.js";
import { KO_PLAYER_NAME_TRANSLATIONS } from "../locales/ko/player-names.js";

const LANGUAGE_RESOURCES = {
  es: {
    pack: esAppPack,
    playerNames: ES_PLAYER_NAME_TRANSLATIONS
  },
  ko: {
    pack: koAppPack,
    playerNames: KO_PLAYER_NAME_TRANSLATIONS
  }
};

const PLAYER_NAME_SOURCE_ALIASES = Object.freeze({
  "Oh Hyeongyu": "Oh Hyeon-gyu"
});

const ENGLISH_COUNT_VALUES = Object.freeze({
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10"
});

const REVIEWED_CURRENT_COPY = {
  es: {
    "Mbappé brace lifts France past Senegal":
      "El doblete de Mbappé impulsa a Francia ante Senegal",
    "Kylian Mbappé scored twice as France beat Senegal 3-1 in their Group I opener on June 16.":
      "Kylian Mbappé marcó dos goles en el triunfo 3-1 de Francia sobre Senegal, en el estreno de ambos en el Grupo I el 16 de junio.",
    "France 3-1 Senegal": "Francia 3-1 Senegal",
    "Messi hat trick opens Argentina's title defence":
      "El triplete de Messi abre la defensa del título de Argentina",
    "Lionel Messi scored all three goals as Argentina beat Algeria 3-0 to start their World Cup defence.":
      "Lionel Messi marcó los tres goles en la victoria 3-0 de Argentina sobre Argelia para iniciar la defensa de su título mundial.",
    "Argentina 3-0 Algeria": "Argentina 3-0 Argelia",
    "Portugal and DR Congo split the points":
      "Portugal y RD del Congo reparten los puntos",
    "1-1 keeps Group K open and gives both teams something to carry into the next match.":
      "El 1-1 mantiene abierto el Grupo K y deja a ambos equipos con algo positivo para su próximo partido.",
    "Joao Neves headed Portugal in front early, while Yoane Wissa's equalizer gave DR Congo the point.":
      "João Neves adelantó a Portugal de cabeza, y el empate de Yoane Wissa dio un punto a RD del Congo.",
    "Portugal vs DR Congo": "Portugal vs. RD del Congo",
    "England look sharp against Croatia":
      "Inglaterra convence ante Croacia",
    "England's 4-2 win gives them an early foothold in Group L.":
      "La victoria 4-2 de Inglaterra le da un buen comienzo en el Grupo L.",
    "Harry Kane scored twice, while Jude Bellingham and Marcus Rashford added second-half goals.":
      "Harry Kane marcó dos goles; Jude Bellingham y Marcus Rashford añadieron otros dos en la segunda parte.",
    "England vs Croatia": "Inglaterra vs. Croacia",
    "Ghana leave it late against Panama":
      "Ghana resuelve tarde ante Panamá",
    "Ghana's 1-0 win puts them level with England on three points in Group L.":
      "La victoria 1-0 deja a Ghana igualada con Inglaterra a tres puntos en el Grupo L.",
    "Caleb Yirenkyi scored in stoppage time to settle a tense opener in Toronto.":
      "Caleb Yirenkyi marcó en el tiempo añadido para decidir un tenso debut en Toronto.",
    "Ghana vs Panama": "Ghana vs. Panamá",
    "Colombia take control of Group K":
      "Colombia toma el mando del Grupo K",
    "Colombia's 3-1 win over Uzbekistan moves them top after the opening Group K matches.":
      "La victoria 3-1 de Colombia sobre Uzbekistán la coloca primera tras la jornada inaugural del Grupo K.",
    "Luis Diaz scored and helped Colombia answer Uzbekistan's first World Cup goal before Jaminton Campaz sealed it late.":
      "Luis Díaz marcó y ayudó a Colombia a responder al primer gol mundialista de Uzbekistán antes de que Jáminton Campaz sentenciara al final.",
    "Uzbekistan vs Colombia": "Uzbekistán vs. Colombia",
    "Czechia and South Africa share tense draw":
      "Chequia y Sudáfrica firman un tenso empate",
    "Czechia scored early through Michal Sadilek, but Teboho Mokoena's late penalty earned South Africa a 1-1 draw in Group A.":
      "Chequia se adelantó pronto por medio de Michal Sadílek, pero el penal tardío de Teboho Mokoena dio a Sudáfrica el empate 1-1 en el Grupo A.",
    "Czechia 1-1 South Africa": "Chequia 1-1 Sudáfrica",
    "Manzambi sparks Swiss surge past Bosnia":
      "Manzambi impulsa la goleada suiza ante Bosnia",
    "Johan Manzambi scored twice after halftime as Switzerland beat Bosnia and Herzegovina 4-1 to move top of Group B.":
      "Johan Manzambi marcó dos veces tras el descanso en la victoria 4-1 de Suiza sobre Bosnia y Herzegovina, que la llevó al liderato del Grupo B.",
    "Switzerland 4-1 Bosnia and Herzegovina":
      "Suiza 4-1 Bosnia y Herzegovina",
    "Messi brace sends Argentina through":
      "El doblete de Messi mete a Argentina en la siguiente ronda",
    "Lionel Messi scored in the 38th and 90+5th minutes as Argentina beat Austria 2-0 in Group J.":
      "Lionel Messi marcó en los minutos 38 y 90+5 en la victoria 2-0 de Argentina sobre Austria en el Grupo J.",
    "Argentina 2-0 Austria": "Argentina 2-0 Austria",
    "Austria's press kept the match scrappy, but Argentina's midfield recovered control and the late pressure finally broke through.":
      "La presión de Austria hizo el partido trabado, pero el mediocampo de Argentina recuperó el control y su empuje final terminó por abrir la defensa.",
    "Mbappé double carries France past Iraq":
      "El doblete de Mbappé guía a Francia ante Irak",
    "Kylian Mbappé scored in the 14th and 54th minutes before Ousmane Dembélé added the third in a storm-delayed 3-0 win.":
      "Kylian Mbappé marcó en los minutos 14 y 54 antes de que Ousmane Dembélé añadiera el tercero en una victoria 3-0 tras una interrupción por tormenta.",
    "France 3-0 Iraq": "Francia 3-0 Irak",
    "Iraq played out bravely early, but two build-out mistakes after the long weather delay let France kill the match.":
      "Irak salió jugando con valentía al principio, pero dos errores en la salida tras la larga demora meteorológica permitieron a Francia sentenciar el partido.",
    "Messi leads all scorers with five World Cup goals":
      "Messi lidera la tabla de goleadores con cinco tantos mundialistas",
    "Lionel Messi's brace against Austria lifted him to five goals from Argentina's first two matches.":
      "El doblete de Lionel Messi ante Austria elevó su cuenta a cinco goles en los dos primeros partidos de Argentina.",
    "He sits alone at the top of the Golden Boot race after following his opening hat trick with another decisive night.":
      "Quedó solo al frente de la carrera por la Bota de Oro tras añadir otra noche decisiva al triplete de su estreno.",
    "Golden Boot race": "Carrera por la Bota de Oro",
    "FIFA match report": "Crónica del partido de la FIFA",
    "Guardian match report": "Crónica del partido de The Guardian",
    "Guardian live report": "Directo de The Guardian",
    "England match centre": "Centro de partidos de Inglaterra",
    "Bundesliga match report": "Crónica del partido de la Bundesliga",
    "France protected that one-goal margin through the final 20 minutes, winning 1-0 to reach the quarter-finals.":
      "Francia protegió su ventaja mínima durante los últimos 20 minutos y ganó 1-0 para avanzar a los cuartos de final.",
    "Brahim created once more for Rahimi at 90+8, completing Morocco's 3-0 win and place in the quarter-finals.":
      "Brahim volvió a asistir a Rahimi en el 90+8 para completar la victoria 3-0 de Marruecos y su pase a los cuartos de final.",
    "Merino's 90+1 finish settled the tie at the last possible moment, sending Spain into the quarter-finals 1-0.":
      "El remate de Merino en el 90+1 decidió la eliminatoria en el último instante y dio a España el triunfo 1-0 y el pase a los cuartos de final.",
    "Vargas converted the decisive kick, completing the 4-3 shootout win and sending Switzerland into a quarter-final with Argentina.":
      "Vargas convirtió el lanzamiento decisivo para completar la victoria 4-3 en la tanda y llevar a Suiza a los cuartos de final contra Argentina.",
    "Mac Allister headed in Messi's early corner, giving Argentina control before Switzerland dragged the quarter-final into a grind.":
      "Mac Allister cabeceó el córner tempranero de Messi y dio el control a Argentina antes de que Suiza convirtiera los cuartos de final en una batalla cerrada.",
    "Cyle Larin came on in the 76th minute and scored in the 78th minute.":
      "Cyle Larin entró como suplente en el minuto 76 y marcó en el 78.",
    "Amad Diallo came on in the 56th minute and scored in the 90th minute.":
      "Amad Diallo entró como suplente en el minuto 56 y marcó en el 90.",
    "Ante Budimir came on at halftime and scored in the 54th minute.":
      "Ante Budimir entró como suplente en el descanso y marcó en el minuto 54.",
    "Tielemans converted a VAR penalty at 120+5 after Lukebakio hit the bar, completing Belgium's last-gasp comeback.":
      "Tielemans convirtió un penal señalado por el VAR en el 120+5, después de que Lukebakio golpeara el larguero, y completó la remontada agónica de Bélgica.",
    "Saibari converted the deciding penalty after five misses in the shootout, sending Morocco to Canada in the last 16.":
      "Saibari convirtió el penal decisivo tras cinco fallos en la tanda y llevó a Marruecos a enfrentar a Canadá en los octavos de final.",
    "Egypt converted all four penalties while Souttar and Herrington missed, sealing a 4-2 shootout win and a historic last-16 place.":
      "Egipto convirtió sus cuatro penales, mientras Souttar y Herrington fallaron, para sellar el triunfo 4-2 en la tanda y un histórico pase a octavos de final.",
    "Paraguay kept France scoreless for 70 minutes before Mbappé converted the penalty that finally broke the tie open.":
      "Paraguay mantuvo a Francia sin marcar durante 70 minutos, hasta que Mbappé convirtió el penal que rompió la igualdad.",
    "Neymar Jr's 90+10' penalty only cut the gap after Norway had already found the decisive second goal.":
      "El penal de Neymar Jr en el 90+10 solo redujo la diferencia después de que Noruega ya hubiera marcado el segundo gol decisivo.",
    "Harry Kane's penalty gave England the cushion they needed, even after Raul Jimenez answered from the spot.":
      "El penal de Harry Kane dio a Inglaterra el margen que necesitaba, incluso después de que Raúl Jiménez respondiera también desde el punto de penal.",
    "Both sides missed in the shootout before Kobel saved Cucho Hernández's penalty to give Switzerland the edge.":
      "Ambos equipos fallaron en la tanda antes de que Kobel detuviera el penal de Cucho Hernández para dar ventaja a Suiza.",
    "Bounou's first-half penalty save kept Morocco level, but France kept Morocco under pressure after the restart.":
      "La parada de Bounou a un penal en la primera parte mantuvo a Marruecos igualado, pero Francia siguió presionando tras el descanso.",
    "Yamal won the 22nd-minute penalty, and Oyarzabal converted his fifth goal of the tournament.":
      "Yamal provocó el penal del minuto 22 y Oyarzabal lo convirtió para marcar su quinto gol del torneo.",
    "Lisandro Martinez struck in stoppage time, and Diney Borges' extra-time own goal finally carried Argentina through.":
      "Lisandro Martínez marcó en el tiempo añadido y el autogol de Diney Borges en la prórroga terminó por clasificar a Argentina.",
    "Ounahi struck again from Brahim Díaz's pass in the 82nd minute, turning a tense knockout tie into a two-goal lead.":
      "Ounahi volvió a marcar tras un pase de Brahim Díaz en el minuto 82 y convirtió una eliminatoria tensa en una ventaja de dos goles.",
    "Dembélé struck six minutes later from Mbappé's pass, and France closed out the 2-0 win to reach the semi-finals.":
      "Dembélé marcó seis minutos después tras un pase de Mbappé y Francia cerró la victoria 2-0 para avanzar a las semifinales.",
    "Bellingham struck again early in extra time to complete his brace, sending England through 2-1 to an Argentina semi-final.":
      "Bellingham volvió a marcar al inicio de la prórroga para completar su doblete y dar a Inglaterra el triunfo 2-1 y el pase a una semifinal contra Argentina.",
    "Nuno Mendes struck at 17' and an own goal followed at 60', moving the score from 1-0 to 4-0.":
      "Nuno Mendes marcó en el 17 y un autogol en el 60 llevó el marcador del 1-0 al 4-0."
  },
  ko: {
    "Mbappé brace lifts France past Senegal":
      "음바페 멀티골, 프랑스의 세네갈전 승리 견인",
    "Kylian Mbappé scored twice as France beat Senegal 3-1 in their Group I opener on June 16.":
      "킬리안 음바페가 두 골을 넣으며 프랑스의 세네갈전 3-1 승리를 이끌었다. 양 팀의 I조 첫 경기로, 6월 16일에 열렸다.",
    "France 3-1 Senegal": "프랑스 3-1 세네갈",
    "Messi hat trick opens Argentina's title defence":
      "메시 해트트릭, 아르헨티나의 타이틀 방어 출발",
    "Lionel Messi scored all three goals as Argentina beat Algeria 3-0 to start their World Cup defence.":
      "리오넬 메시가 세 골을 모두 넣으며 아르헨티나의 알제리전 3-0 승리와 월드컵 타이틀 방어의 출발을 이끌었다.",
    "Argentina 3-0 Algeria": "아르헨티나 3-0 알제리",
    "Portugal and DR Congo split the points":
      "포르투갈과 콩고민주공화국, 승점 1씩 나눠 가져",
    "1-1 keeps Group K open and gives both teams something to carry into the next match.":
      "1-1 무승부로 K조 경쟁은 계속 열렸고, 두 팀 모두 다음 경기를 준비할 발판을 마련했다.",
    "Joao Neves headed Portugal in front early, while Yoane Wissa's equalizer gave DR Congo the point.":
      "주앙 네베스가 헤더로 포르투갈의 선제골을 넣었고, 요안 위사의 동점골이 콩고민주공화국에 승점 1을 안겼다.",
    "Portugal vs DR Congo": "포르투갈 vs 콩고민주공화국",
    "England look sharp against Croatia":
      "잉글랜드, 크로아티아전에서 날카로운 경기력",
    "England's 4-2 win gives them an early foothold in Group L.":
      "잉글랜드는 4-2 승리로 L조에서 좋은 출발을 했다.",
    "Harry Kane scored twice, while Jude Bellingham and Marcus Rashford added second-half goals.":
      "해리 케인이 두 골을 넣었고, 주드 벨링엄과 마커스 래시퍼드가 후반에 한 골씩 보탰다.",
    "England vs Croatia": "잉글랜드 vs 크로아티아",
    "Ghana leave it late against Panama":
      "가나, 파나마전 막판 결승골로 승리",
    "Ghana's 1-0 win puts them level with England on three points in Group L.":
      "가나는 1-0 승리로 L조에서 잉글랜드와 같은 승점 3이 됐다.",
    "Caleb Yirenkyi scored in stoppage time to settle a tense opener in Toronto.":
      "케일럽 이렌치가 추가시간에 결승골을 넣어 토론토에서 열린 팽팽한 첫 경기를 끝냈다.",
    "Ghana vs Panama": "가나 vs 파나마",
    "Colombia take control of Group K":
      "콜롬비아, K조 선두로",
    "Colombia's 3-1 win over Uzbekistan moves them top after the opening Group K matches.":
      "콜롬비아는 우즈베키스탄을 3-1로 꺾고 K조 첫 경기 후 선두에 올랐다.",
    "Luis Diaz scored and helped Colombia answer Uzbekistan's first World Cup goal before Jaminton Campaz sealed it late.":
      "루이스 디아즈가 득점해 콜롬비아가 우즈베키스탄의 월드컵 첫 골에 응수했고, 하민톤 캄파스가 막판에 승부를 마무리했다.",
    "Uzbekistan vs Colombia": "우즈베키스탄 vs 콜롬비아",
    "Czechia and South Africa share tense draw":
      "체코와 남아프리카공화국, 팽팽한 무승부",
    "Czechia scored early through Michal Sadilek, but Teboho Mokoena's late penalty earned South Africa a 1-1 draw in Group A.":
      "체코가 미할 사딜레크의 골로 일찍 앞섰지만, 테보호 모코에나가 막판 페널티킥을 성공시켜 남아프리카공화국에 A조 1-1 무승부를 안겼다.",
    "Czechia 1-1 South Africa": "체코 1-1 남아프리카공화국",
    "Manzambi sparks Swiss surge past Bosnia":
      "망장비 멀티골, 스위스의 보스니아전 대승 견인",
    "Johan Manzambi scored twice after halftime as Switzerland beat Bosnia and Herzegovina 4-1 to move top of Group B.":
      "조안 망장비가 후반에 두 골을 넣으며 스위스의 보스니아 헤르체고비나전 4-1 승리와 B조 선두 등극을 이끌었다.",
    "Switzerland 4-1 Bosnia and Herzegovina":
      "스위스 4-1 보스니아 헤르체고비나",
    "Messi brace sends Argentina through":
      "메시 멀티골, 아르헨티나 다음 라운드 진출",
    "Lionel Messi scored in the 38th and 90+5th minutes as Argentina beat Austria 2-0 in Group J.":
      "리오넬 메시가 38분과 90+5분에 득점하며 아르헨티나의 J조 오스트리아전 2-0 승리를 이끌었다.",
    "Argentina 2-0 Austria": "아르헨티나 2-0 오스트리아",
    "Austria's press kept the match scrappy, but Argentina's midfield recovered control and the late pressure finally broke through.":
      "오스트리아의 압박으로 경기가 거칠게 흘렀지만, 아르헨티나가 중원 주도권을 되찾았고 막판 공세로 마침내 수비를 무너뜨렸다.",
    "Mbappé double carries France past Iraq":
      "음바페 멀티골, 프랑스의 이라크전 승리 견인",
    "Kylian Mbappé scored in the 14th and 54th minutes before Ousmane Dembélé added the third in a storm-delayed 3-0 win.":
      "킬리안 음바페가 14분과 54분에 득점했고, 우스만 뎀벨레가 세 번째 골을 보태 폭풍우로 지연된 경기에서 프랑스가 3-0으로 이겼다.",
    "France 3-0 Iraq": "프랑스 3-0 이라크",
    "Iraq played out bravely early, but two build-out mistakes after the long weather delay let France kill the match.":
      "이라크는 초반에 과감하게 후방 빌드업을 시도했지만, 긴 기상 지연 뒤 나온 두 차례 실수로 프랑스에 승부를 내줬다.",
    "Messi leads all scorers with five World Cup goals":
      "메시, 월드컵 5골로 득점 단독 선두",
    "Lionel Messi's brace against Austria lifted him to five goals from Argentina's first two matches.":
      "리오넬 메시는 오스트리아전 멀티골로 아르헨티나의 첫 두 경기에서 5골을 기록했다.",
    "He sits alone at the top of the Golden Boot race after following his opening hat trick with another decisive night.":
      "첫 경기 해트트릭에 이어 다시 결정적인 활약을 펼치며 골든부트 경쟁에서 단독 선두에 올랐다.",
    "Golden Boot race": "골든부트 경쟁",
    "FIFA match report": "FIFA 경기 리포트",
    "Guardian match report": "가디언 경기 리포트",
    "Guardian live report": "가디언 실시간 경기 리포트",
    "England match centre": "잉글랜드 경기 센터",
    "Bundesliga match report": "분데스리가 경기 리포트",
    "France protected that one-goal margin through the final 20 minutes, winning 1-0 to reach the quarter-finals.":
      "프랑스는 마지막 20분 동안 한 골 차 리드를 지켜 1-0으로 승리하고 8강에 진출했다.",
    "Brahim created once more for Rahimi at 90+8, completing Morocco's 3-0 win and place in the quarter-finals.":
      "브라힘이 90+8분 라히미의 골을 다시 도우며 모로코의 3-0 승리와 8강 진출을 완성했다.",
    "Merino's 90+1 finish settled the tie at the last possible moment, sending Spain into the quarter-finals 1-0.":
      "메리노가 90+1분 극적인 결승골을 넣어 스페인의 1-0 승리와 8강 진출을 이끌었다.",
    "Vargas converted the decisive kick, completing the 4-3 shootout win and sending Switzerland into a quarter-final with Argentina.":
      "바르가스가 마지막 킥을 성공시켜 스위스의 4-3 승부차기 승리와 아르헨티나와 맞붙는 8강 진출을 확정했다.",
    "Mac Allister headed in Messi's early corner, giving Argentina control before Switzerland dragged the quarter-final into a grind.":
      "마크 알리스테르가 메시의 이른 코너킥을 헤더로 마무리해 아르헨티나에 주도권을 안겼지만, 스위스가 8강전을 팽팽한 승부로 끌고 갔다.",
    "Cyle Larin came on in the 76th minute and scored in the 78th minute.":
      "카일 래린은 76분 교체 투입돼 78분 골을 넣었다.",
    "Amad Diallo came on in the 56th minute and scored in the 90th minute.":
      "아마드 디알로는 56분 교체 투입돼 90분 골을 넣었다.",
    "Ante Budimir came on at halftime and scored in the 54th minute.":
      "안테 부디미르는 하프타임에 교체 투입돼 54분 골을 넣었다.",
    "Tielemans converted a VAR penalty at 120+5 after Lukebakio hit the bar, completing Belgium's last-gasp comeback.":
      "루케바키오의 슈팅이 골대를 맞은 뒤 틸레만스가 120+5분 VAR 판정으로 얻은 페널티킥을 성공시켜 벨기에의 극적인 역전승을 완성했다.",
    "Saibari converted the deciding penalty after five misses in the shootout, sending Morocco to Canada in the last 16.":
      "사이바리가 승부차기에서 다섯 번의 실축 뒤 결정적인 페널티킥을 성공시켜 모로코를 캐나다와의 16강으로 이끌었다.",
    "Egypt converted all four penalties while Souttar and Herrington missed, sealing a 4-2 shootout win and a historic last-16 place.":
      "이집트는 페널티킥 네 개를 모두 성공시켰고 소타르와 헤링턴은 실축해, 승부차기 4-2 승리와 역사적인 16강 진출을 확정했다.",
    "Paraguay kept France scoreless for 70 minutes before Mbappé converted the penalty that finally broke the tie open.":
      "파라과이는 70분 동안 프랑스의 득점을 막았지만, 음바페가 페널티킥을 성공시키며 균형을 깼다.",
    "Neymar Jr's 90+10' penalty only cut the gap after Norway had already found the decisive second goal.":
      "네이마르 주니오르의 90+10분 페널티킥은 노르웨이가 이미 결정적인 두 번째 골을 넣은 뒤 격차를 줄이는 데 그쳤다.",
    "Harry Kane's penalty gave England the cushion they needed, even after Raul Jimenez answered from the spot.":
      "해리 케인의 페널티킥이 잉글랜드에 필요한 여유를 안겼고, 라울 히메네스가 페널티킥으로 만회한 뒤에도 그 차이는 유지됐다.",
    "Both sides missed in the shootout before Kobel saved Cucho Hernández's penalty to give Switzerland the edge.":
      "승부차기에서 양 팀 모두 실축한 가운데 코벨이 쿠초 에르난데스의 페널티킥을 막아 스위스가 앞섰다.",
    "Bounou's first-half penalty save kept Morocco level, but France kept Morocco under pressure after the restart.":
      "보누가 전반 페널티킥을 막아 모로코가 동점을 유지했지만, 프랑스는 후반에도 계속 압박했다.",
    "Yamal won the 22nd-minute penalty, and Oyarzabal converted his fifth goal of the tournament.":
      "야말이 22분 페널티킥을 얻어냈고, 오야르사발이 성공시켜 대회 5호 골을 기록했다.",
    "Lisandro Martinez struck in stoppage time, and Diney Borges' extra-time own goal finally carried Argentina through.":
      "리산드로 마르티네스가 추가시간에 득점했고, 연장전 디네이 보르헤스의 자책골로 아르헨티나가 마침내 다음 라운드에 진출했다.",
    "Ounahi struck again from Brahim Díaz's pass in the 82nd minute, turning a tense knockout tie into a two-goal lead.":
      "오우나히가 82분 브라힘 디아즈의 패스를 받아 다시 득점하며 팽팽한 토너먼트 경기를 두 골 차 리드로 바꿨다.",
    "Dembélé struck six minutes later from Mbappé's pass, and France closed out the 2-0 win to reach the semi-finals.":
      "뎀벨레가 6분 뒤 음바페의 패스를 받아 득점했고, 프랑스는 2-0 승리를 지켜 준결승에 진출했다.",
    "Bellingham struck again early in extra time to complete his brace, sending England through 2-1 to an Argentina semi-final.":
      "벨링엄이 연장 초반 다시 득점해 멀티골을 완성했고, 잉글랜드는 2-1로 이겨 아르헨티나와의 준결승에 진출했다.",
    "Nuno Mendes struck at 17' and an own goal followed at 60', moving the score from 1-0 to 4-0.":
      "누노 멘데스가 17분에 득점했고 60분에 자책골이 이어지며 점수는 1-0에서 4-0이 됐다."
  }
};

Object.assign(REVIEWED_CURRENT_COPY.es, {
  "Stephen Eustaquio scored two minutes into stoppage time to put Canada ahead.":
    "Stephen Eustáquio marcó dos minutos después de comenzar el tiempo añadido y adelantó a Canadá.",
  "Canada kept South Africa out and turned the late goal into a knockout win.":
    "Canadá mantuvo su portería a cero ante Sudáfrica y convirtió el gol tardío en una victoria de eliminación directa.",
  "Enciso headed Paraguay in front from Galarza's cross before Havertz redirected Wirtz's delivery for Germany's 54th-minute equalizer.":
    "Enciso adelantó a Paraguay de cabeza tras un centro de Galarza, antes de que Havertz desviara el envío de Wirtz para el empate de Alemania en el minuto 54.",
  "Paraguay spent long stretches in a compact 4-5-1, making Germany's possession feel blunt until extra time and a disallowed Tah header.":
    "Paraguay pasó largos tramos en un 4-5-1 compacto que restó filo a la posesión de Alemania hasta la prórroga, además de un cabezazo anulado a Tah.",
  "Gill saved from Havertz and Woltemade before Jose Canale sealed Paraguay's 4-3 shootout win.":
    "Gill detuvo los lanzamientos de Havertz y Woltemade antes de que José Canale sellara la victoria 4-3 de Paraguay en la tanda de penales.",
  "Cody Gakpo broke through in the 72nd minute, but Issa Diop answered in stoppage time to force extra time.":
    "Cody Gakpo abrió el marcador en el minuto 72, pero Issa Diop empató en el tiempo añadido para forzar la prórroga.",
  "Morocco changed the match with young substitutes and kept creating through Saibari during a wild, physical finish.":
    "Marruecos cambió el partido con sus jóvenes suplentes y siguió creando por medio de Saibari durante un cierre físico y desordenado.",
  "Kaishu Sano punished Brazil in the 29th minute, giving Japan a 1-0 halftime lead.":
    "Kaishū Sano castigó a Brasil en el minuto 29 y dio a Japón una ventaja 1-0 al descanso.",
  "Casemiro levelled at 56', before Gabriel Martinelli won it for Brazil at 90+5'.":
    "Casemiro empató en el 56' y Gabriel Martinelli dio la victoria a Brasil en el 90+5'.",
  "Sweden kept France scoreless until the final minute of the first half, when Dembélé found Mbappé for the breakthrough.":
    "Suecia mantuvo a Francia sin marcar hasta el último minuto de la primera parte, cuando Dembélé encontró a Mbappé para abrir el marcador.",
  "Olise set up Barcola eight minutes after the restart, turning a tight first half into a two-goal French lead.":
    "Olise asistió a Barcola ocho minutos después de la reanudación y convirtió una primera parte cerrada en una ventaja francesa de dos goles.",
  "Olise created again for Mbappé in the 74th minute, completing the 3-0 win and sending France into the last 16.":
    "Olise volvió a asistir a Mbappé en el minuto 74 para completar el 3-0 y llevar a Francia a octavos de final.",
  "Nusa curled Norway in front before Amad Diallo came off the bench to clear one off the line and equalize.":
    "Nusa adelantó a Noruega con un disparo colocado, antes de que Amad Diallo entrara desde el banquillo, salvara un balón en la línea y marcara el empate.",
  "Berg's late run set up Haaland's winner, and Nyland's stoppage time save protected Norway's first knockout win.":
    "La llegada de Berg desde segunda línea preparó el gol de la victoria de Haaland, y la parada de Nyland en el tiempo añadido protegió el primer triunfo de Noruega en una eliminatoria.",
  "Julian Quinones turned in Alvarado's 22nd-minute delivery, then Raul Jimenez finished Quinones's pass nine minutes later.":
    "Julián Quiñones remató el envío de Alvarado en el minuto 22 y, nueve minutos después, Raúl Jiménez definió un pase de Quiñones.",
  "Mexico's first-half pressure lifted the home crowd in Mexico City, and their defense protected a fourth straight World Cup clean sheet.":
    "La presión de México en la primera parte animó al público de Ciudad de México, y su defensa aseguró la cuarta portería a cero consecutiva en el Mundial.",
  "Hincapie's stoppage-time red card closed Ecuador's night, while Mexico moved on to face England or DR Congo.":
    "La tarjeta roja de Hincapié en el tiempo añadido cerró la noche de Ecuador, mientras México avanzó para enfrentar a Inglaterra o RD del Congo.",
  "Brian Cipenga stunned England in the 7th minute from Chancel Mbemba's assist, but Harry Kane answered twice late from Anthony Gordon service.":
    "Brian Cipenga sorprendió a Inglaterra en el minuto 7 tras una asistencia de Chancel Mbemba, pero Harry Kane respondió con dos goles tardíos a pases de Anthony Gordon.",
  "England spent most of the match frustrated by DR Congo's block and Lionel Mpasi's saves before Gordon, Saka, and Eze shifted the pressure after the hour.":
    "Inglaterra pasó gran parte del partido frustrada por el bloque de RD del Congo y las paradas de Lionel Mpasi, hasta que Gordon, Saka y Eze cambiaron el impulso pasada la hora.",
  "Kane headed in the 75th-minute equalizer, then cut across the edge of the box and drove the 86th-minute winner into the top corner.":
    "Kane cabeceó el empate en el minuto 75 y, en el 86, recortó por el borde del área y clavó el gol de la victoria en la escuadra.",
  "Balogun scrambled in the 45th-minute opener after a tense first half, then hit the bar before the break.":
    "Balogun empujó el gol inicial en el minuto 45 tras una primera parte tensa y luego golpeó el larguero antes del descanso.",
  "The USA played the last half-hour with ten men after Balogun's VAR red card, with Freese and Richards protecting the box.":
    "Estados Unidos jugó la última media hora con diez tras la tarjeta roja a Balogun confirmada por el VAR, con Freese y Richards protegiendo el área.",
  "Tillman curled in an 82nd-minute free kick to seal a 2-0 win and send the hosts into a last-16 meeting with Belgium.":
    "Tillman marcó de tiro libre en el minuto 82 para sellar el 2-0 y llevar al anfitrión a los octavos de final contra Bélgica.",
  "Diarra and Sarr gave Senegal a 2-0 lead before Lukaku turned in Meunier's 86th-minute cross to reopen the match.":
    "Diarra y Sarr dieron a Senegal una ventaja 2-0 antes de que Lukaku rematara el centro de Meunier en el minuto 86 para reabrir el partido.",
  "Tielemans met Trossard's delivery three minutes later, forcing extra time after Senegal had controlled the first 85 minutes.":
    "Tielemans remató el envío de Trossard tres minutos después y forzó la prórroga, tras 85 minutos de control de Senegal.",
  "Croatia took the lead through Ivan Perišić at 53'.":
    "Croacia se adelantó por medio de Ivan Perišić en el 53'.",
  "Gonçalo Ramos' 90+4' finish gave Portugal the late winner and a 2-1 victory.":
    "El remate de Gonçalo Ramos en el 90+4' dio a Portugal el gol tardío de la victoria y el triunfo 2-1.",
  "Austria held Spain scoreless for 35 minutes before Cucurella found Oyarzabal for the breakthrough.":
    "Austria mantuvo a España sin marcar durante 35 minutos, hasta que Cucurella encontró a Oyarzabal para abrir el marcador.",
  "Baena released Porro for Spain's second goal in the 66th minute, putting the tie firmly under their control.":
    "Baena habilitó a Porro para el segundo gol de España en el minuto 66 y dejó la eliminatoria bajo su control.",
  "Oyarzabal connected with Cucurella again in the 89th minute, completing his brace and Spain's 3-0 passage to the last 16.":
    "Oyarzabal volvió a conectar con Cucurella en el minuto 89 para completar su doblete, el 3-0 de España y el pase a octavos de final.",
  "Switzerland carried the 2-0 result into the last 16.":
    "Suiza conservó el 2-0 y avanzó a octavos de final.",
  "Lionel Messi put Argentina ahead before Cabo Verde twice pulled the tie level.":
    "Lionel Messi adelantó a Argentina antes de que Cabo Verde igualara la eliminatoria dos veces.",
  "Luis Suárez supplied Jhon Arias for the 14th-minute goal that put Colombia in front.":
    "Luis Suárez asistió a Jhon Arias para el gol del minuto 14 que adelantó a Colombia.",
  "That early strike stood for the remaining 76 minutes, carrying Colombia past Ghana and into the last 16.":
    "Ese gol temprano resistió durante los 76 minutos restantes y aseguró a Colombia la victoria ante Ghana y el pase a octavos de final.",
  "Volpato hit the crossbar before Ashour headed Egypt in front from Hafez's 13th-minute cross.":
    "Volpato golpeó el larguero antes de que Ashour cabeceara el centro de Hafez en el minuto 13 para adelantar a Egipto.",
  "Hany's 55th-minute own goal revived Australia, but Egypt created the better chances as the tie stretched through extra time.":
    "El autogol de Hany en el minuto 55 reanimó a Australia, pero Egipto creó las mejores ocasiones mientras la eliminatoria se alargaba hasta la prórroga.",
  "Canada kept Morocco out through halftime before Hakimi found Ounahi for the 50th-minute breakthrough.":
    "Canadá mantuvo a Marruecos sin marcar hasta el descanso, antes de que Hakimi encontrara a Ounahi para abrir el marcador en el minuto 50.",
  "Erling Haaland scored in the 79th and 90th minutes to turn Norway's late pressure into the upset.":
    "Erling Haaland marcó en los minutos 79 y 90 para convertir la presión tardía de Noruega en la sorpresa.",
  "Jude Bellingham scored twice in two minutes to flip the match before halftime.":
    "Jude Bellingham marcó dos goles en dos minutos para remontar el partido antes del descanso.",
  "Portugal and Spain stayed scoreless for 90 minutes before Ferran Torres found Merino in stoppage time.":
    "Portugal y España siguieron 0-0 durante 90 minutos, hasta que Ferran Torres encontró a Merino en el tiempo añadido.",
  "Malik Tillman briefly brought the United States level, but De Ketelaere answered two minutes later.":
    "Malik Tillman empató brevemente para Estados Unidos, pero De Ketelaere respondió dos minutos después.",
  "Hans Vanaken and Romelu Lukaku finished the 4-1 rout after Belgium kept finding space late.":
    "Hans Vanaken y Romelu Lukaku completaron la goleada 4-1 después de que Bélgica encontrara espacios al final.",
  "Yasser Ibrahim and Mostafa Ziko gave Egypt a 2-0 lead and pushed Argentina to the edge.":
    "Yasser Ibrahim y Mostafa Ziko dieron a Egipto una ventaja 2-0 y llevaron a Argentina al límite.",
  "Egypt also had a goal ruled out after VAR, a swing that kept Argentina close before the late comeback.":
    "Egipto también tuvo un gol anulado tras la revisión del VAR, un giro que mantuvo a Argentina cerca antes de la remontada tardía.",
  "Cristian Romero, Lionel Messi, and Enzo Fernández scored from 79' to 90+2' to turn the tie into a 3-2 Argentina win.":
    "Cristian Romero, Lionel Messi y Enzo Fernández marcaron entre el 79' y el 90+2' para convertir la eliminatoria en una victoria 3-2 de Argentina.",
  "Switzerland and Colombia cancelled each other out for 120 minutes, with neither side turning its chances into a goal.":
    "Suiza y Colombia se neutralizaron durante 120 minutos, sin que ninguno convirtiera sus ocasiones en gol.",
  "Mbappé broke the game open in the 60th minute, curling France ahead when the Moroccan block finally cracked.":
    "Mbappé abrió el partido en el minuto 60 con un disparo colocado que adelantó a Francia cuando por fin cedió el bloque marroquí.",
  "Fabián Ruiz put Spain ahead at the half-hour, giving their possession a finish after Belgium had kept the tie tight.":
    "Fabián Ruiz adelantó a España en el minuto 30 y dio eficacia a su dominio de balón después de que Bélgica mantuviera cerrada la eliminatoria.",
  "De Ketelaere answered 11 minutes later from Castagne's service, pulling Belgium level before halftime.":
    "De Ketelaere respondió 11 minutos después a pase de Castagne y empató para Bélgica antes del descanso.",
  "Mikel Merino arrived in the 88th minute to settle it, sending Spain through 2-1 to the semi-finals.":
    "Mikel Merino apareció en el minuto 88 para decidir el partido y dar a España el triunfo 2-1 y el pase a semifinales.",
  "Schjelderup put Norway in front in the 36th minute, but Bellingham answered before halftime after England absorbed a tense opening half.":
    "Schjelderup adelantó a Noruega en el minuto 36, pero Bellingham empató antes del descanso tras una primera parte tensa para Inglaterra.",
  "Norway had a second-half goal ruled out for Haaland's foul and later hit the crossbar, keeping the tie at 1-1 into extra time.":
    "A Noruega le anularon un gol en la segunda parte por falta de Haaland y después golpeó el larguero, por lo que el 1-1 llegó hasta la prórroga.",
  "Ndoye pulled Switzerland level in the 67th minute, but Embolo's second yellow left them protecting 1-1 with ten men.":
    "Ndoye empató para Suiza en el minuto 67, pero la segunda amarilla de Embolo la dejó defendiendo el 1-1 con diez jugadores.",
  "Alvarez curled Argentina back ahead in the 112th minute and Lautaro Martinez finished it late, setting up the England semi-final.":
    "Álvarez volvió a adelantar a Argentina con un disparo colocado en el minuto 112 y Lautaro Martínez sentenció al final para preparar la semifinal contra Inglaterra.",
  "England raced into a 4-0 halftime lead as Rice and Konsa struck before Saka scored twice.":
    "Inglaterra llegó al descanso con una ventaja de 4-0: Rice y Konsa marcaron antes de que Saka anotara dos veces.",
  "Mbappé scored twice and set up Barcola as France pulled it back to 4-3 by the 66th minute, taking his World Cup record to 22 goals.":
    "Mbappé marcó dos goles y asistió a Barcola mientras Francia reducía la desventaja a 4-3 en el minuto 66, elevando su récord mundialista a 22 goles.",
  "Saka completed his hat-trick from the spot, and after Dembélé made it 5-4, Bellingham's 90+8' strike sealed England's first World Cup medal in 60 years.":
    "Saka completó su triplete desde el punto de penal y, después de que Dembélé pusiera el 5-4, el gol de Bellingham en el 90+8 selló la primera medalla mundialista de Inglaterra en 60 años.",
  "Spain controlled midfield and isolated Mbappé, stopping France from building sustained pressure.":
    "España controló el mediocampo y aisló a Mbappé, impidiendo que Francia construyera una presión sostenida.",
  "Porro finished a slick one-two with Olmo, sealing Spain's 2-0 win and first World Cup final since 2010.":
    "Porro culminó una pared fluida con Olmo para sellar el 2-0 de España y su primera final mundialista desde 2010.",
  "Gordon finished Rogers' pass in the 55th minute to put England ahead after a goalless first half.":
    "Gordon remató el pase de Rogers en el minuto 55 para adelantar a Inglaterra tras una primera parte sin goles.",
  "Messi set up Enzo Fernández in the 85th minute and Lautaro Martínez at 90+2' to complete Argentina's late comeback.":
    "Messi asistió a Enzo Fernández en el minuto 85 y a Lautaro Martínez en el 90+2' para completar la remontada tardía de Argentina.",
  "Martínez's winner sent Argentina into the final against Spain; England will face France for third place.":
    "El gol de la victoria de Martínez llevó a Argentina a la final contra España; Inglaterra enfrentará a Francia por el tercer puesto.",
  "🌟 Cabo Verde held Spain's possession game to a scoreless tournament debut.":
    "🌟 Cabo Verde contuvo el juego de posesión de España y dejó su debut en el torneo sin goles.",
  "🌟 Joao Neves headed Portugal in front early.":
    "🌟 João Neves adelantó pronto a Portugal con un cabezazo.",
  "🌟 Luis Diaz scored and helped Colombia answer Uzbekistan's first World Cup goal.":
    "🌟 Luis Díaz marcó y ayudó a Colombia a responder al primer gol mundialista de Uzbekistán.",
  "🌟 Raúl Rangel made a huge late double save.":
    "🌟 Raúl Rangel realizó una enorme doble parada al final.",
  "🌟 Curaçao's first World Cup point came through a hard-earned clean sheet.":
    "🌟 El primer punto mundialista de Curazao llegó gracias a una trabajada portería a cero.",
  "🌟 IR Iran kept Belgium's creators quiet and made the low-margin plan stick.":
    "🌟 Irán anuló a los jugadores creativos de Bélgica y llevó el partido al terreno cerrado que buscaba.",
  "🌟 Austria's press made it scrappy, but Messi sealed Argentina's control late.":
    "🌟 La presión de Austria volvió trabado el partido, pero Messi aseguró el control de Argentina al final.",
  "🌟 Iraq started bravely, then the wet restart exposed their build-out mistakes.":
    "🌟 Irak empezó con valentía, pero la reanudación sobre césped mojado expuso sus errores en la salida."
});

Object.assign(REVIEWED_CURRENT_COPY.ko, {
  "Stephen Eustaquio scored two minutes into stoppage time to put Canada ahead.":
    "스테픈 유스타키오가 추가시간 시작 2분 만에 득점해 캐나다를 앞세웠다.",
  "Canada kept South Africa out and turned the late goal into a knockout win.":
    "캐나다는 남아프리카공화국을 무득점으로 막고 막판 골을 끝까지 지켜 토너먼트 승리를 거뒀다.",
  "Enciso headed Paraguay in front from Galarza's cross before Havertz redirected Wirtz's delivery for Germany's 54th-minute equalizer.":
    "엔시소가 갈라르사의 크로스를 헤더로 마무리해 파라과이를 앞세웠고, 하베르츠가 비르츠의 패스를 방향만 바꿔 54분 독일의 동점골을 넣었다.",
  "Paraguay spent long stretches in a compact 4-5-1, making Germany's possession feel blunt until extra time and a disallowed Tah header.":
    "파라과이는 오랫동안 촘촘한 4-5-1을 유지해 독일의 점유율 공격을 무디게 했고, 연장전까지 버틴 가운데 타의 헤더는 취소됐다.",
  "Gill saved from Havertz and Woltemade before Jose Canale sealed Paraguay's 4-3 shootout win.":
    "힐이 하베르츠와 볼테마데의 킥을 막은 뒤 호세 카날레가 성공시켜 파라과이의 승부차기 4-3 승리를 확정했다.",
  "Cody Gakpo broke through in the 72nd minute, but Issa Diop answered in stoppage time to force extra time.":
    "코디 학포가 72분 선제골을 넣었지만, 이사 디오프가 추가시간에 동점골을 넣어 연장전으로 끌고 갔다.",
  "Morocco changed the match with young substitutes and kept creating through Saibari during a wild, physical finish.":
    "모로코는 젊은 교체 선수들로 경기 흐름을 바꿨고, 거칠고 혼란스러운 막판에도 사이바리를 통해 계속 기회를 만들었다.",
  "Kaishu Sano punished Brazil in the 29th minute, giving Japan a 1-0 halftime lead.":
    "사노 가이슈가 29분 브라질을 상대로 득점해 일본에 전반 1-0 리드를 안겼다.",
  "Casemiro levelled at 56', before Gabriel Martinelli won it for Brazil at 90+5'.":
    "카세미로가 56분 동점골을 넣었고, 가브리엘 마르티넬리가 90+5분 브라질의 결승골을 기록했다.",
  "Sweden kept France scoreless until the final minute of the first half, when Dembélé found Mbappé for the breakthrough.":
    "스웨덴은 전반 마지막 순간까지 프랑스의 득점을 막았지만, 뎀벨레의 패스를 받은 음바페가 선제골을 넣었다.",
  "Olise set up Barcola eight minutes after the restart, turning a tight first half into a two-goal French lead.":
    "올리세가 후반 시작 8분 만에 바르콜라의 골을 도우며 팽팽했던 경기를 프랑스의 두 골 차 리드로 바꿨다.",
  "Olise created again for Mbappé in the 74th minute, completing the 3-0 win and sending France into the last 16.":
    "올리세가 74분 음바페의 골을 다시 도우며 프랑스의 3-0 승리와 16강 진출을 완성했다.",
  "Nusa curled Norway in front before Amad Diallo came off the bench to clear one off the line and equalize.":
    "누사가 감아차기로 노르웨이를 앞세웠지만, 교체 투입된 아마드 디알로가 골라인에서 한 차례 막아낸 뒤 동점골까지 넣었다.",
  "Berg's late run set up Haaland's winner, and Nyland's stoppage time save protected Norway's first knockout win.":
    "베르그의 막판 침투가 홀란의 결승골로 이어졌고, 닐랜드의 추가시간 선방이 노르웨이의 첫 토너먼트 승리를 지켰다.",
  "Julian Quinones turned in Alvarado's 22nd-minute delivery, then Raul Jimenez finished Quinones's pass nine minutes later.":
    "훌리안 키뇨네스가 22분 알바라도의 패스를 마무리했고, 9분 뒤 라울 히메네스가 키뇨네스의 패스를 골로 연결했다.",
  "Mexico's first-half pressure lifted the home crowd in Mexico City, and their defense protected a fourth straight World Cup clean sheet.":
    "멕시코의 전반 압박이 멕시코시티 홈 관중을 달궜고, 수비진은 월드컵 4경기 연속 무실점을 지켰다.",
  "Hincapie's stoppage-time red card closed Ecuador's night, while Mexico moved on to face England or DR Congo.":
    "잉카피에의 추가시간 퇴장으로 에콰도르의 경기가 끝났고, 멕시코는 다음 라운드에 올라 잉글랜드 또는 콩고민주공화국과 맞붙게 됐다.",
  "Brian Cipenga stunned England in the 7th minute from Chancel Mbemba's assist, but Harry Kane answered twice late from Anthony Gordon service.":
    "브라이언 시펭가가 샹셀 음벰바의 도움을 받아 7분 잉글랜드를 상대로 선제골을 넣었지만, 해리 케인이 앤서니 고든의 패스를 받아 막판에 두 골로 응수했다.",
  "England spent most of the match frustrated by DR Congo's block and Lionel Mpasi's saves before Gordon, Saka, and Eze shifted the pressure after the hour.":
    "잉글랜드는 콩고민주공화국의 수비 블록과 리오넬 음파시의 선방에 고전했지만, 60분 이후 고든과 사카, 에제가 압박의 흐름을 바꿨다.",
  "Kane headed in the 75th-minute equalizer, then cut across the edge of the box and drove the 86th-minute winner into the top corner.":
    "케인이 75분 헤더로 동점골을 넣은 뒤 86분 페널티지역 가장자리를 가로질러 움직여 골대 위쪽 구석에 결승골을 꽂았다.",
  "Balogun scrambled in the 45th-minute opener after a tense first half, then hit the bar before the break.":
    "발로건이 팽팽한 전반 45분에 선제골을 밀어 넣었고, 전반 종료 전에는 골대를 맞혔다.",
  "The USA played the last half-hour with ten men after Balogun's VAR red card, with Freese and Richards protecting the box.":
    "미국은 VAR 판독으로 발로건이 퇴장당한 뒤 마지막 30분을 10명으로 뛰었고, 프리즈와 리처즈가 페널티지역을 지켰다.",
  "Tillman curled in an 82nd-minute free kick to seal a 2-0 win and send the hosts into a last-16 meeting with Belgium.":
    "틸먼이 82분 프리킥을 감아 넣어 2-0 승리를 확정했고, 개최국을 벨기에와의 16강으로 이끌었다.",
  "Diarra and Sarr gave Senegal a 2-0 lead before Lukaku turned in Meunier's 86th-minute cross to reopen the match.":
    "디아라와 사르가 세네갈에 2-0 리드를 안겼지만, 루카쿠가 86분 뫼니에의 크로스를 마무리해 벨기에가 다시 추격에 나섰다.",
  "Tielemans met Trossard's delivery three minutes later, forcing extra time after Senegal had controlled the first 85 minutes.":
    "틸레만스가 3분 뒤 트로사르의 패스를 골로 연결해, 첫 85분을 주도한 세네갈과의 경기를 연장전으로 끌고 갔다.",
  "Croatia took the lead through Ivan Perišić at 53'.":
    "크로아티아는 53분 이반 페리시치의 골로 앞섰다.",
  "Gonçalo Ramos' 90+4' finish gave Portugal the late winner and a 2-1 victory.":
    "곤살루 하무스가 90+4분 결승골을 넣어 포르투갈에 2-1 승리를 안겼다.",
  "Austria held Spain scoreless for 35 minutes before Cucurella found Oyarzabal for the breakthrough.":
    "오스트리아는 35분 동안 스페인의 득점을 막았지만, 쿠쿠레야의 패스를 받은 오야르사발이 선제골을 넣었다.",
  "Baena released Porro for Spain's second goal in the 66th minute, putting the tie firmly under their control.":
    "바에나가 66분 포로의 두 번째 골을 도우며 스페인이 경기를 확실하게 장악했다.",
  "Oyarzabal connected with Cucurella again in the 89th minute, completing his brace and Spain's 3-0 passage to the last 16.":
    "오야르사발이 89분 쿠쿠레야의 패스를 다시 골로 연결해 멀티골과 스페인의 3-0 승리, 16강 진출을 완성했다.",
  "Switzerland carried the 2-0 result into the last 16.":
    "스위스는 2-0 승리를 지켜 16강에 진출했다.",
  "Lionel Messi put Argentina ahead before Cabo Verde twice pulled the tie level.":
    "리오넬 메시가 아르헨티나를 앞세웠지만 카보베르데가 두 차례 동점을 만들었다.",
  "Luis Suárez supplied Jhon Arias for the 14th-minute goal that put Colombia in front.":
    "루이스 수아레스가 존 아리아스의 14분 선제골을 도와 콜롬비아를 앞세웠다.",
  "That early strike stood for the remaining 76 minutes, carrying Colombia past Ghana and into the last 16.":
    "그 이른 골이 남은 76분 동안 유지되며 콜롬비아가 가나를 꺾고 16강에 진출했다.",
  "Volpato hit the crossbar before Ashour headed Egypt in front from Hafez's 13th-minute cross.":
    "볼파토가 골대를 맞힌 뒤 아슈르가 13분 하페즈의 크로스를 헤더로 마무리해 이집트를 앞세웠다.",
  "Hany's 55th-minute own goal revived Australia, but Egypt created the better chances as the tie stretched through extra time.":
    "하니의 55분 자책골로 호주가 살아났지만, 연장전까지 이어진 경기에서 더 좋은 기회는 이집트가 만들었다.",
  "Canada kept Morocco out through halftime before Hakimi found Ounahi for the 50th-minute breakthrough.":
    "캐나다는 전반까지 모로코의 득점을 막았지만, 하키미의 패스를 받은 오우나히가 50분 선제골을 넣었다.",
  "Erling Haaland scored in the 79th and 90th minutes to turn Norway's late pressure into the upset.":
    "엘링 홀란이 79분과 90분에 득점해 노르웨이의 막판 공세를 이변의 승리로 바꿨다.",
  "Jude Bellingham scored twice in two minutes to flip the match before halftime.":
    "주드 벨링엄이 2분 사이 두 골을 넣어 전반이 끝나기 전에 경기를 뒤집었다.",
  "Portugal and Spain stayed scoreless for 90 minutes before Ferran Torres found Merino in stoppage time.":
    "포르투갈과 스페인은 90분 동안 0-0을 유지했지만, 추가시간 페란 토레스의 패스를 받은 메리노가 득점했다.",
  "Malik Tillman briefly brought the United States level, but De Ketelaere answered two minutes later.":
    "말릭 틸먼이 잠시 미국을 동점으로 이끌었지만, 드 케텔라에가 2분 뒤 다시 득점했다.",
  "Hans Vanaken and Romelu Lukaku finished the 4-1 rout after Belgium kept finding space late.":
    "한스 파나컨과 로멜루 루카쿠가 막판 공간을 계속 공략한 벨기에의 4-1 대승을 완성했다.",
  "Yasser Ibrahim and Mostafa Ziko gave Egypt a 2-0 lead and pushed Argentina to the edge.":
    "야세르 이브라힘과 모스타파 지코가 이집트에 2-0 리드를 안기며 아르헨티나를 탈락 직전까지 몰았다.",
  "Egypt also had a goal ruled out after VAR, a swing that kept Argentina close before the late comeback.":
    "이집트의 추가 골은 VAR 판독 뒤 취소됐고, 그 판정으로 아르헨티나는 막판 역전 전까지 추격할 수 있었다.",
  "Cristian Romero, Lionel Messi, and Enzo Fernández scored from 79' to 90+2' to turn the tie into a 3-2 Argentina win.":
    "크리스티안 로메로와 리오넬 메시, 엔소 페르난데스가 79분부터 90+2분 사이 득점해 아르헨티나의 3-2 역전승을 완성했다.",
  "Switzerland and Colombia cancelled each other out for 120 minutes, with neither side turning its chances into a goal.":
    "스위스와 콜롬비아는 120분 동안 서로를 막았고, 두 팀 모두 기회를 득점으로 연결하지 못했다.",
  "Mbappé broke the game open in the 60th minute, curling France ahead when the Moroccan block finally cracked.":
    "음바페가 60분 감아차기로 득점해 모로코의 수비 블록을 무너뜨리고 프랑스를 앞세웠다.",
  "Fabián Ruiz put Spain ahead at the half-hour, giving their possession a finish after Belgium had kept the tie tight.":
    "파비안 루이스가 30분 선제골을 넣어, 벨기에가 팽팽하게 버티던 경기에서 스페인의 점유율 우위를 득점으로 연결했다.",
  "De Ketelaere answered 11 minutes later from Castagne's service, pulling Belgium level before halftime.":
    "드 케텔라에가 11분 뒤 카스타뉴의 패스를 받아 득점해 전반 종료 전 벨기에를 동점으로 이끌었다.",
  "Mikel Merino arrived in the 88th minute to settle it, sending Spain through 2-1 to the semi-finals.":
    "미켈 메리노가 88분 결승골을 넣어 스페인의 2-1 승리와 준결승 진출을 이끌었다.",
  "Schjelderup put Norway in front in the 36th minute, but Bellingham answered before halftime after England absorbed a tense opening half.":
    "시엘데루프가 36분 노르웨이를 앞세웠지만, 팽팽한 전반을 버틴 잉글랜드는 벨링엄의 골로 전반 종료 전 동점을 만들었다.",
  "Norway had a second-half goal ruled out for Haaland's foul and later hit the crossbar, keeping the tie at 1-1 into extra time.":
    "노르웨이는 후반 홀란의 반칙으로 골이 취소됐고 이후 골대까지 맞혀, 경기는 1-1로 연장전에 들어갔다.",
  "Ndoye pulled Switzerland level in the 67th minute, but Embolo's second yellow left them protecting 1-1 with ten men.":
    "은도이가 67분 스위스의 동점골을 넣었지만, 엠볼로가 경고 누적으로 퇴장당해 10명이 1-1을 지켜야 했다.",
  "Alvarez curled Argentina back ahead in the 112th minute and Lautaro Martinez finished it late, setting up the England semi-final.":
    "알바레스가 112분 감아차기로 아르헨티나를 다시 앞세웠고, 라우타로 마르티네스가 막판에 승부를 끝내 잉글랜드와의 준결승을 확정했다.",
  "England raced into a 4-0 halftime lead as Rice and Konsa struck before Saka scored twice.":
    "잉글랜드는 라이스와 콘사의 골에 이어 사카가 두 골을 넣으며 전반을 4-0으로 앞선 채 마쳤다.",
  "Mbappé scored twice and set up Barcola as France pulled it back to 4-3 by the 66th minute, taking his World Cup record to 22 goals.":
    "음바페가 두 골을 넣고 바르콜라의 골을 도우며 프랑스가 66분까지 4-3으로 따라붙었고, 자신의 월드컵 최다 득점 기록을 22골로 늘렸다.",
  "Saka completed his hat-trick from the spot, and after Dembélé made it 5-4, Bellingham's 90+8' strike sealed England's first World Cup medal in 60 years.":
    "사카가 페널티킥으로 해트트릭을 완성했고, 뎀벨레가 5-4를 만든 뒤 벨링엄이 90+8분에 득점해 잉글랜드의 60년 만의 첫 월드컵 메달을 확정했다.",
  "Spain controlled midfield and isolated Mbappé, stopping France from building sustained pressure.":
    "스페인은 중원을 장악하고 음바페를 고립시켜 프랑스가 지속적인 압박을 만들지 못하게 했다.",
  "Porro finished a slick one-two with Olmo, sealing Spain's 2-0 win and first World Cup final since 2010.":
    "포로가 올모와의 매끄러운 2대1 패스를 마무리해 스페인의 2-0 승리와 2010년 이후 첫 월드컵 결승 진출을 확정했다.",
  "Gordon finished Rogers' pass in the 55th minute to put England ahead after a goalless first half.":
    "고든이 55분 로저스의 패스를 마무리해 0-0 전반 뒤 잉글랜드를 앞세웠다.",
  "Messi set up Enzo Fernández in the 85th minute and Lautaro Martínez at 90+2' to complete Argentina's late comeback.":
    "메시가 85분 엔소 페르난데스의 골과 90+2분 라우타로 마르티네스의 골을 도우며 아르헨티나의 막판 역전을 완성했다.",
  "Martínez's winner sent Argentina into the final against Spain; England will face France for third place.":
    "마르티네스의 결승골로 아르헨티나는 스페인과의 결승에 진출했고, 잉글랜드는 프랑스와 3위 결정전을 치른다.",
  "🌟 Cabo Verde held Spain's possession game to a scoreless tournament debut.":
    "🌟 카보베르데는 스페인의 점유율 축구를 막아 월드컵 데뷔전을 0-0으로 마쳤다.",
  "🌟 Joao Neves headed Portugal in front early.":
    "🌟 주앙 네베스가 이른 헤더로 포르투갈을 앞세웠다.",
  "🌟 Luis Diaz scored and helped Colombia answer Uzbekistan's first World Cup goal.":
    "🌟 루이스 디아즈가 득점하며 콜롬비아가 우즈베키스탄의 월드컵 첫 골에 응수하도록 이끌었다.",
  "🌟 Raúl Rangel made a huge late double save.":
    "🌟 라울 랭겔이 막판 결정적인 연속 선방을 기록했다.",
  "🌟 Curaçao's first World Cup point came through a hard-earned clean sheet.":
    "🌟 퀴라소는 값진 무실점 경기로 월드컵 첫 승점을 얻었다.",
  "🌟 IR Iran kept Belgium's creators quiet and made the low-margin plan stick.":
    "🌟 이란은 벨기에의 창의적인 선수들을 막고 한 골 싸움 전략을 끝까지 지켰다.",
  "🌟 Austria's press made it scrappy, but Messi sealed Argentina's control late.":
    "🌟 오스트리아의 압박으로 경기가 거칠어졌지만, 메시는 막판에 아르헨티나의 승리를 확정했다.",
  "🌟 Iraq started bravely, then the wet restart exposed their build-out mistakes.":
    "🌟 이라크는 용감하게 출발했지만, 젖은 잔디에서 재개된 뒤 후방 빌드업 실수가 드러났다."
});

Object.assign(REVIEWED_CURRENT_COPY.es, {
  "He has built a broad international resume across African national teams and clubs before taking charge of Haiti.":
    "Antes de asumir la selección de Haití, construyó una amplia trayectoria internacional en selecciones y clubes africanos.",
  "He took over Paraguay in 2024 after leading Ecuador at the 2022 World Cup and Costa Rica through a transition cycle.":
    "Asumió la selección de Paraguay en 2024 después de dirigir a Ecuador en el Mundial de 2022 y a Costa Rica durante un ciclo de transición.",
  "One of international football's most traveled managers, he took charge of Curacao after long spells with clubs and national teams across Europe and beyond.":
    "Uno de los técnicos más viajeros del fútbol internacional, asumió la selección de Curazao después de largas etapas en clubes y selecciones de Europa y otras regiones.",
  "All 104 official fixtures are final, with scores, knockout participants, lineups, and source-backed result coverage loaded.":
    "Los 104 partidos oficiales han finalizado, con marcadores, participantes de las eliminatorias, alineaciones y cobertura de resultados respaldada por fuentes.",
  "Left knee injury confirmed by MRI after the Netherlands match; unavailable against Tunisia.":
    "Lesión en la rodilla izquierda confirmada por resonancia magnética tras el partido contra Países Bajos; baja ante Túnez.",
  "Listed as missing for France vs Morocco probable lineups.":
    "Figura como baja para las alineaciones probables de Francia vs. Marruecos.",
  "Listed as missing for Norway vs England probable lineups.":
    "Figura como baja para las alineaciones probables de Noruega vs. Inglaterra.",
  "Listed injured for Switzerland vs Colombia.":
    "Figura como lesionado para Suiza vs. Colombia.",
  "Not listed in FIFA's 21 June 2026 official squad list.":
    "No figura en la lista oficial de convocados de la FIFA del 21 de junio de 2026.",
  "Omitted from Japan's 2026 World Cup squad due to a hamstring injury.":
    "Fuera de la convocatoria de Japón para el Mundial 2026 por una lesión en los isquiotibiales.",
  "Omitted from Japan's 2026 World Cup squad due to injury.":
    "Fuera de la convocatoria de Japón para el Mundial 2026 por lesión.",
  "Reported injured and left out of the Switzerland XI.":
    "Se informó que estaba lesionado y quedó fuera del once de Suiza.",
  "Reported out for the rest of the tournament after an ACL injury.":
    "Baja para el resto del torneo tras sufrir una lesión del ligamento cruzado anterior.",
  "Reported out of the Switzerland vs Colombia lineup after an adductor injury against Ghana.":
    "Fuera de la alineación de Suiza vs. Colombia por una lesión en el aductor sufrida ante Ghana.",
  "Red-card suspension": "Suspensión por tarjeta roja",
  "Ruled out of Belgium vs IR Iran due to illness.":
    "Baja para Bélgica vs. Irán por enfermedad.",
  "Second of two matches; ends after England vs Argentina":
    "Segundo de dos partidos; la sanción termina después de Inglaterra vs. Argentina.",
  "Sent off against Mexico": "Expulsado ante México",
  "Serving the second match of a two-game suspension after his red card against Mexico.":
    "Cumple el segundo partido de una suspensión de dos encuentros tras su tarjeta roja ante México.",
  "Unavailable with a broken wrist.":
    "Baja por fractura de muñeca.",
  "Withdrew due to injury on June 11 and was replaced by Shuto Machino.":
    "Se retiró por lesión el 11 de junio y fue reemplazado por Shūto Machino."
});

Object.assign(REVIEWED_CURRENT_COPY.ko, {
  "All 104 official fixtures are final, with scores, knockout participants, lineups, and source-backed result coverage loaded.":
    "공식 104경기가 모두 종료되었으며, 스코어와 토너먼트 진출 팀, 선발 명단, 출처가 확인된 결과 자료가 모두 반영되었습니다.",
  "Left knee injury confirmed by MRI after the Netherlands match; unavailable against Tunisia.":
    "네덜란드전 뒤 MRI 검사에서 왼쪽 무릎 부상이 확인돼 튀니지전에 출전할 수 없습니다.",
  "Listed as missing for France vs Morocco probable lineups.":
    "프랑스 대 모로코 예상 라인업에서 결장자로 분류됐습니다.",
  "Listed as missing for Norway vs England probable lineups.":
    "노르웨이 대 잉글랜드 예상 라인업에서 결장자로 분류됐습니다.",
  "Listed injured for Switzerland vs Colombia.":
    "스위스 대 콜롬비아전 부상자로 분류됐습니다.",
  "Not listed in FIFA's 21 June 2026 official squad list.":
    "6월 21일 발표된 FIFA 공식 2026 월드컵 명단에 포함되지 않았습니다.",
  "Omitted from Japan's 2026 World Cup squad due to a hamstring injury.":
    "햄스트링 부상으로 일본의 2026 월드컵 명단에서 제외됐습니다.",
  "Omitted from Japan's 2026 World Cup squad due to injury.":
    "부상으로 일본의 2026 월드컵 명단에서 제외됐습니다.",
  "Reported injured and left out of the Switzerland XI.":
    "부상으로 알려져 스위스 선발 명단에서 제외됐습니다.",
  "Reported out for the rest of the tournament after an ACL injury.":
    "전방십자인대 부상으로 남은 대회에 출전할 수 없는 것으로 전해졌습니다.",
  "Reported out of the Switzerland vs Colombia lineup after an adductor injury against Ghana.":
    "가나전에서 당한 내전근 부상으로 스위스 대 콜롬비아전 라인업에서 제외된 것으로 전해졌습니다.",
  "Red-card suspension": "레드카드 징계",
  "Ruled out of Belgium vs IR Iran due to illness.":
    "질병으로 벨기에 대 이란전에 출전할 수 없습니다.",
  "Second of two matches; ends after England vs Argentina":
    "2경기 중 두 번째 경기이며, 잉글랜드 대 아르헨티나전 후 징계가 끝납니다.",
  "Sent off against Mexico": "멕시코전 퇴장",
  "Serving the second match of a two-game suspension after his red card against Mexico.":
    "멕시코전 퇴장으로 받은 2경기 출전 정지 징계의 두 번째 경기에 결장합니다.",
  "Unavailable with a broken wrist.":
    "손목 골절로 출전할 수 없습니다.",
  "Withdrew due to injury on June 11 and was replaced by Shuto Machino.":
    "6월 11일 부상으로 대표팀에서 이탈했고, 마치노 슈토가 대체 발탁됐습니다."
});

Object.assign(REVIEWED_CURRENT_COPY.es, {
  "Nico Williams headed Pedro Porro's cross back to Ferran Torres, who fired the 106th-minute winner to seal Spain's second World Cup title.":
    "Nico Williams cabeceó hacia atrás el centro de Pedro Porro para Ferran Torres, que marcó el gol de la victoria en el minuto 106 y aseguró el segundo título mundial de España.",
  "Enzo Fernández's second yellow at 90+3' left Argentina with ten men for extra time.":
    "La segunda amarilla de Enzo Fernández en el 90+3 dejó a Argentina con diez jugadores para la prórroga.",
  "Emiliano Martínez made 11 saves to keep Spain scoreless through 90 minutes, but Torres finally found a way past him in extra time.":
    "Emiliano Martínez hizo 11 paradas para mantener a España sin marcar durante los 90 minutos, pero Torres acabó batiéndolo en la prórroga."
});

Object.assign(REVIEWED_CURRENT_COPY.ko, {
  "Nico Williams headed Pedro Porro's cross back to Ferran Torres, who fired the 106th-minute winner to seal Spain's second World Cup title.":
    "니코 윌리암스가 페드로 포로의 크로스를 머리로 뒤로 내줬고, 페란 토레스가 106분 결승골을 터뜨려 스페인의 두 번째 월드컵 우승을 확정했다.",
  "Enzo Fernández's second yellow at 90+3' left Argentina with ten men for extra time.":
    "엔소 페르난데스가 90+3분 두 번째 옐로카드를 받아 퇴장당하면서 아르헨티나는 연장전을 10명으로 치렀다.",
  "Emiliano Martínez made 11 saves to keep Spain scoreless through 90 minutes, but Torres finally found a way past him in extra time.":
    "에밀리아노 마르티네스는 11차례 선방으로 정규시간 90분 동안 스페인의 득점을 막았지만, 연장전에서 결국 토레스에게 골을 허용했다."
});

function localizePlayerName(language, value) {
  const canonicalValue = PLAYER_NAME_SOURCE_ALIASES[value] || value;
  return LANGUAGE_RESOURCES[language]?.playerNames?.[canonicalValue] || canonicalValue;
}

function localizeTeamName(language, value) {
  return LANGUAGE_RESOURCES[language]?.pack?.entities?.teamNames?.[value] || value;
}

function hasKoreanFinalConsonant(value) {
  const character = Array.from(String(value || "").trim()).at(-1) || "";
  if (/\d/u.test(character)) {
    return ["0", "1", "3", "6", "7", "8"].includes(character);
  }
  const codePoint = character.codePointAt(0) || 0;
  return codePoint >= 0xac00 && codePoint <= 0xd7a3
    ? (codePoint - 0xac00) % 28 !== 0
    : false;
}

function koParticle(value, withFinalConsonant, withoutFinalConsonant) {
  return `${value}${hasKoreanFinalConsonant(value) ? withFinalConsonant : withoutFinalConsonant}`;
}

function koDirection(value) {
  const text = String(value || "");
  const last = text.trim().at(-1) || "";
  if (/\d/u.test(last)) {
    return `${text}${["0", "3", "6"].includes(last) ? "으로" : "로"}`;
  }
  const codePoint = last.codePointAt(0) || 0;
  const finalConsonant =
    codePoint >= 0xac00 && codePoint <= 0xd7a3
      ? (codePoint - 0xac00) % 28
      : 0;
  return `${text}${finalConsonant && finalConsonant !== 8 ? "으로" : "로"}`;
}

function normalizeMinute(value) {
  return String(value || "").replace(/(?:st|nd|rd|th|['’])$/iu, "");
}

function normalizeCount(value) {
  const text = String(value || "").trim();
  return ENGLISH_COUNT_VALUES[text.toLocaleLowerCase("en-US")] || text;
}

function formatScoringClause(language, clause) {
  let match = clause.match(/^giving (.+) a fast start$/u);
  if (match) {
    const team = localizeTeamName(language, match[1]);
    return language === "es"
      ? `dio a ${team} un comienzo rápido`
      : `${koParticle(team, "에", "에")} 빠른 출발을 안겼다`;
  }
  match = clause.match(/^putting (.+) in front$/u);
  if (match) {
    const team = localizeTeamName(language, match[1]);
    return language === "es"
      ? `adelantó a ${team}`
      : `${koParticle(team, "을", "를")} 앞서게 했다`;
  }
  match = clause.match(/^bringing (.+) level at (.+)$/u);
  if (match) {
    const team = localizeTeamName(language, match[1]);
    return language === "es"
      ? `puso el ${match[2]} para ${team}`
      : `${koParticle(team, "을", "를")} ${match[2]} 동점으로 이끌었다`;
  }
  match = clause.match(/^doubling (.+?)(?:'s|') lead$/u);
  if (match) {
    const team = localizeTeamName(language, match[1]);
    return language === "es"
      ? `amplió la ventaja de ${team}`
      : `${koParticle(team, "의", "의")} 리드를 두 골 차로 벌렸다`;
  }
  match = clause.match(/^stretching (.+?)(?:'s|') lead to (.+)$/u);
  if (match) {
    const team = localizeTeamName(language, match[1]);
    return language === "es"
      ? `amplió la ventaja de ${team} a ${match[2]}`
      : `${koParticle(team, "의", "의")} 리드를 ${koDirection(match[2])} 벌렸다`;
  }
  match = clause.match(/^swinging the match (.+)'s way at (.+)$/u);
  if (match) {
    const team = localizeTeamName(language, match[1]);
    return language === "es"
      ? `puso el ${match[2]} a favor de ${team}`
      : `${koDirection(match[2])} ${koParticle(team, "에", "에")} 승기를 안겼다`;
  }
  match = clause.match(/^finally breaking the deadlock for (.+)$/u);
  if (match) {
    const team = localizeTeamName(language, match[1]);
    return language === "es"
      ? `rompió por fin el empate para ${team}`
      : `마침내 0-0 균형을 깨며 ${koParticle(team, "을", "를")} 앞서게 했다`;
  }
  match = clause.match(/^cutting (.+)'s deficit to (.+)$/u);
  if (match) {
    const team = localizeTeamName(language, match[1]);
    return language === "es"
      ? `redujo la desventaja de ${team} a ${match[2]}`
      : `${koParticle(team, "이", "가")} ${match[2]}까지 추격했다`;
  }
  return "";
}

function getPatternedCurrentCopy(language, english) {
  let match = english.match(
    /^(.+) set up (.+) for a finish in the (.+) minute, (.+)\.$/u
  );
  if (match) {
    const assister = localizePlayerName(language, match[1]);
    const scorer = localizePlayerName(language, match[2]);
    const clause = formatScoringClause(language, match[4]);
    if (clause) {
      return language === "es"
        ? `${assister} asistió a ${scorer}, que marcó en el minuto ${normalizeMinute(match[3])} y ${clause}.`
        : `${koParticle(assister, "의", "의")} 패스를 받은 ${koParticle(scorer, "이", "가")} ${normalizeMinute(match[3])}분에 득점해 ${clause}.`;
    }
  }

  match = english.match(/^(.+) struck in the (.+) minute, (.+)\.$/u);
  if (match) {
    const scorer = localizePlayerName(language, match[1]);
    const clause = formatScoringClause(language, match[3]);
    if (clause) {
      return language === "es"
        ? `${scorer} marcó en el minuto ${normalizeMinute(match[2])} y ${clause}.`
        : `${koParticle(scorer, "이", "가")} ${normalizeMinute(match[2])}분에 득점해 ${clause}.`;
    }
  }

  match = english.match(
    /^(.+) struck at (.+) and (.+), driving (.+) to a (.+) lead\.$/u
  );
  if (match) {
    const scorer = localizePlayerName(language, match[1]);
    const team = localizeTeamName(language, match[4]);
    return language === "es"
      ? `${scorer} marcó en el ${match[2]} y el ${match[3]} para dar a ${team} una ventaja de ${match[5]}.`
      : `${koParticle(scorer, "이", "가")} ${normalizeMinute(match[2])}분과 ${normalizeMinute(match[3])}분에 득점해 ${koParticle(team, "에", "에")} ${match[5]} 리드를 안겼다.`;
  }

  match = english.match(
    /^(.+) struck at (.+) and (.+) answered at (.+), moving the score from (.+) to (.+)\.$/u
  );
  if (match) {
    const first = localizePlayerName(language, match[1]);
    const second = localizePlayerName(language, match[3]);
    return language === "es"
      ? `${first} marcó en el ${match[2]} y ${second} respondió en el ${match[4]}, llevando el marcador de ${match[5]} a ${match[6]}.`
      : `${koParticle(first, "이", "가")} ${normalizeMinute(match[2])}분에 득점했고 ${koParticle(second, "이", "가")} ${normalizeMinute(match[4])}분에 응수해 점수는 ${match[5]}에서 ${koParticle(match[6], "이", "가")} 됐다.`;
  }

  match = english.match(
    /^(.+) levelled at (.+), but a (.+)' own goal restored (.+?)(?:'s|') lead at (.+)\.$/u
  );
  if (match) {
    const equalizer = localizePlayerName(language, match[1]);
    const team = localizeTeamName(language, match[4]);
    return language === "es"
      ? `${equalizer} empató en el ${match[2]}, pero un autogol en el ${match[3]} devolvió la ventaja a ${team}.`
      : `${koParticle(equalizer, "이", "가")} ${normalizeMinute(match[2])}분에 동점골을 넣었지만, ${normalizeMinute(match[3])}분 자책골로 ${koParticle(team, "이", "가")} 다시 앞섰다.`;
  }

  match = english.match(
    /^(.+) levelled at (.+), but (.+) restored (.+?)(?:'s|') lead at (.+)\.$/u
  );
  if (match) {
    const equalizer = localizePlayerName(language, match[1]);
    const scorer = localizePlayerName(language, match[3]);
    const team = localizeTeamName(language, match[4]);
    return language === "es"
      ? `${equalizer} empató en el ${match[2]}, pero ${scorer} devolvió la ventaja a ${team} en el ${match[5]}.`
      : `${koParticle(equalizer, "이", "가")} ${normalizeMinute(match[2])}분에 동점골을 넣었지만, ${koParticle(scorer, "이", "가")} ${normalizeMinute(match[5])}분에 득점해 ${koParticle(team, "의", "의")} 리드를 되찾았다.`;
  }

  match = english.match(
    /^(.+) converted a penalty in the (.+) minute, (.+)\.$/u
  );
  if (match) {
    const scorer = localizePlayerName(language, match[1]);
    const clause = formatScoringClause(language, match[3]);
    if (clause) {
      return language === "es"
        ? `${scorer} convirtió un penal en el minuto ${normalizeMinute(match[2])} y ${clause}.`
        : `${koParticle(scorer, "이", "가")} ${normalizeMinute(match[2])}분 페널티킥을 성공시켜 ${clause}.`;
    }
  }

  match = english.match(
    /^(.+) came on in the (.+) minute and scored in the (.+) minute\.$/u
  );
  if (match) {
    const scorer = localizePlayerName(language, match[1]);
      return language === "es"
      ? `${scorer} entró como suplente en el minuto ${normalizeMinute(match[2])} y marcó en el ${normalizeMinute(match[3])}.`
      : `${koParticle(scorer, "은", "는")} ${normalizeMinute(match[2])}분 교체 투입돼 ${normalizeMinute(match[3])}분 골을 넣었다.`;
  }

  match = english.match(/^(.+) came on at halftime and scored in the (.+) minute\.$/u);
  if (match) {
    const scorer = localizePlayerName(language, match[1]);
      return language === "es"
      ? `${scorer} entró como suplente en el descanso y marcó en el minuto ${normalizeMinute(match[2])}.`
      : `${koParticle(scorer, "은", "는")} 하프타임에 교체 투입돼 ${normalizeMinute(match[2])}분 골을 넣었다.`;
  }

  match = english.match(
    /^(.+) struck in stoppage time, leaving (.+) no time to answer\.$/u
  );
  if (match) {
    const scorer = localizePlayerName(language, match[1]);
    const opponent = localizeTeamName(language, match[2]);
    return language === "es"
      ? `${scorer} marcó en el tiempo añadido y dejó a ${opponent} sin tiempo para responder.`
      : `${koParticle(scorer, "이", "가")} 추가시간에 득점해 ${koParticle(opponent, "에", "에")} 반격할 시간을 주지 않았다.`;
  }

  match = english.match(
    /^(.+) protected the lead for the remaining (.+) minutes and kept (.+) scoreless\.$/u
  );
  if (match) {
    const winner = localizeTeamName(language, match[1]);
    const opponent = localizeTeamName(language, match[3]);
    return language === "es"
      ? `${winner} protegió la ventaja durante los ${match[2]} minutos restantes y mantuvo a ${opponent} sin marcar.`
      : `${koParticle(winner, "은", "는")} 남은 ${match[2]}분 동안 리드를 지키고 ${koParticle(opponent, "을", "를")} 무득점으로 막았다.`;
  }

  match = english.match(/^A (.+)' own goal gave (.+) the lead\.$/u);
  if (match) {
    const team = localizeTeamName(language, match[2]);
    return language === "es"
      ? `Un autogol en el ${match[1]} dio la ventaja a ${team}.`
      : `${normalizeMinute(match[1])}분 자책골로 ${koParticle(team, "이", "가")} 리드를 잡았다.`;
  }

  match = english.match(/^A (.+)' own goal brought (.+) level at (.+)\.$/u);
  if (match) {
    const team = localizeTeamName(language, match[2]);
    return language === "es"
      ? `Un autogol en el ${match[1]} puso el ${match[3]} para ${team}.`
      : `${normalizeMinute(match[1])}분 자책골로 ${koParticle(team, "이", "가")} ${match[3]} 동점을 만들었다.`;
  }

  match = english.match(/^A (.+)' own goal changed the score to (.+)\.$/u);
  if (match) {
    return language === "es"
      ? `Un autogol en el ${match[1]} cambió el marcador a ${match[2]}.`
      : `${normalizeMinute(match[1])}분 자책골로 점수는 ${koParticle(match[2], "이", "가")} 됐다.`;
  }

  match = english.match(
    /^(.+)'s (.+) and (.+)'s (.+) cancelled each other out through halftime\.$/u
  );
  if (match) {
    const first = localizeTeamName(language, match[1]);
    const second = localizeTeamName(language, match[3]);
    return language === "es"
      ? `El ${match[2]} de ${first} y el ${match[4]} de ${second} se neutralizaron durante la primera parte.`
      : `${koParticle(first, "의", "의")} ${koParticle(match[2], "과", "와")} ${koParticle(second, "의", "의")} ${koParticle(match[4], "이", "가")} 전반 동안 서로를 막았다.`;
  }

  match = english.match(
    /^(.+) made (.+) changes in the (.+) minute, including (.+), but the score stayed 0-0\.$/u
  );
  if (match) {
    const team = localizeTeamName(language, match[1]);
    const player = localizePlayerName(language, match[4]);
    return language === "es"
      ? `${team} hizo ${match[2]} cambios en el minuto ${normalizeMinute(match[3])}, incluido ${player}, pero el marcador siguió 0-0.`
      : `${koParticle(team, "은", "는")} ${normalizeMinute(match[3])}분 ${koParticle(player, "을", "를")} 포함해 ${match[2]}명을 교체했지만 0-0이 이어졌다.`;
  }

  match = english.match(
    /^(.+) made the first change in the (.+) minute, sending on (.+), but the deadlock held\.$/u
  );
  if (match) {
    const team = localizeTeamName(language, match[1]);
    const player = localizePlayerName(language, match[3]);
    return language === "es"
      ? `${team} hizo el primer cambio en el minuto ${normalizeMinute(match[2])} con la entrada de ${player}, pero el 0-0 se mantuvo.`
      : `${koParticle(team, "은", "는")} ${normalizeMinute(match[2])}분 ${koParticle(player, "을", "를")} 첫 교체로 투입했지만 0-0 균형은 깨지지 않았다.`;
  }

  match = english.match(/^(📊 )?(.+) took three points in Group ([A-L])\.$/u);
  if (match) {
    const marker = match[1] || "";
    const team = localizeTeamName(language, match[2]);
    return language === "es"
      ? `${marker}${team} sumó tres puntos en el Grupo ${match[3]}.`
      : `${marker}${koParticle(team, "은", "는")} ${match[3]}조에서 승점 3을 얻었다.`;
  }

  match = english.match(/^(.+) for (.+) in the (.+) minute was sent off\.$/u);
  if (match) {
    const player = localizePlayerName(language, match[1]);
    const team = localizeTeamName(language, match[2]);
    return language === "es"
      ? `${player}, de ${team}, fue expulsado en el minuto ${normalizeMinute(match[3])}.`
      : `${koParticle(team, "의", "의")} ${koParticle(player, "이", "가")} ${normalizeMinute(match[3])}분 퇴장당했다.`;
  }

  match = english.match(
    /^(📊 )?(.+) reached six points in Group ([A-L]) and booked a Round of 32 place\.$/u
  );
  if (match) {
    const marker = match[1] || "";
    const team = localizeTeamName(language, match[2]);
    return language === "es"
      ? `${marker}${team} llegó a seis puntos en el Grupo ${match[3]} y aseguró su pase a dieciseisavos de final.`
      : `${marker}${koParticle(team, "은", "는")} ${match[3]}조에서 승점 6을 기록해 32강 진출을 확정했다.`;
  }

  match = english.match(
    /^an own goal arrived at (.+) and (.+) answered at (.+), moving the score from (.+) to (.+)\.$/u
  );
  if (match) {
    const scorer = localizePlayerName(language, match[2]);
    return language === "es"
      ? `Hubo un autogol en el ${normalizeMinute(match[1])}; ${scorer} respondió en el ${normalizeMinute(match[3])} y el marcador pasó de ${match[4]} a ${match[5]}.`
      : `${normalizeMinute(match[1])}분에 자책골이 나왔고 ${koParticle(scorer, "이", "가")} ${normalizeMinute(match[3])}분에 응수해 점수는 ${match[4]}에서 ${koParticle(match[5], "이", "가")} 됐다.`;
  }

  match = english.match(
    /^(📊 )?(.+) moved to (.+) points? in Group ([A-L]) and left (.+) without a point\.$/u
  );
  if (match) {
    const marker = match[1] || "";
    const team = localizeTeamName(language, match[2]);
    const opponent = localizeTeamName(language, match[5]);
    const points = normalizeCount(match[3]);
    return language === "es"
      ? `${marker}${team} llegó a ${points} puntos en el Grupo ${match[4]} y dejó a ${opponent} sin puntos.`
      : `${marker}${koParticle(team, "은", "는")} ${match[4]}조에서 ${koParticle(`승점 ${points}`, "이", "가")} 됐고, ${koParticle(opponent, "은", "는")} 승점을 얻지 못했다.`;
  }

  match = english.match(/^(📊 )?Both teams moved to (.+) points? in Group ([A-L])\.$/u);
  if (match) {
    const points = normalizeCount(match[2]);
    return language === "es"
      ? `${match[1] || ""}Ambos equipos llegaron a ${points} punto${points === "1" ? "" : "s"} en el Grupo ${match[3]}.`
      : `${match[1] || ""}두 팀 모두 ${match[3]}조에서 ${koParticle(`승점 ${points}`, "이", "가")} 됐다.`;
  }

  match = english.match(
    /^(📊 )?(.+) moved to (.+) points? in Group ([A-L]) while (.+) stayed on (.+) points?\.$/u
  );
  if (match) {
    const first = localizeTeamName(language, match[2]);
    const second = localizeTeamName(language, match[5]);
    const firstPoints = normalizeCount(match[3]);
    const secondPoints = normalizeCount(match[6]);
    return language === "es"
      ? `${match[1] || ""}${first} llegó a ${firstPoints} puntos en el Grupo ${match[4]}, mientras ${second} se quedó con ${secondPoints}.`
      : `${match[1] || ""}${koParticle(first, "은", "는")} ${match[4]}조에서 ${koParticle(`승점 ${firstPoints}`, "이", "가")} 됐고, ${koParticle(second, "은", "는")} 승점 ${secondPoints}에 머물렀다.`;
  }

  match = english.match(
    /^(📊 )?(.+) moved to (.+) points? and (.+) to (.+) points? in Group ([A-L])\.$/u
  );
  if (match) {
    const first = localizeTeamName(language, match[2]);
    const second = localizeTeamName(language, match[4]);
    const firstPoints = normalizeCount(match[3]);
    const secondPoints = normalizeCount(match[5]);
    return language === "es"
      ? `${match[1] || ""}${first} llegó a ${firstPoints} puntos y ${second} a ${secondPoints} en el Grupo ${match[6]}.`
      : `${match[1] || ""}${koParticle(first, "은", "는")} ${match[6]}조에서 ${koParticle(`승점 ${firstPoints}`, "이", "가")} 됐고, ${koParticle(second, "은", "는")} ${koParticle(`승점 ${secondPoints}`, "이", "가")} 됐다.`;
  }

  match = english.match(/^⚽ (.+) and (.+) shared a (.+) draw\.$/u);
  if (match) {
    const first = localizeTeamName(language, match[1]);
    const second = localizeTeamName(language, match[2]);
    return language === "es"
      ? `⚽ ${first} y ${second} empataron ${match[3]}.`
      : `⚽ ${koParticle(first, "과", "와")} ${koParticle(second, "은", "는")} ${match[3]} 무승부를 기록했다.`;
  }

  match = english.match(/^⚽ (.+) and (.+) finished level at (.+)\.$/u);
  if (match) {
    const first = localizeTeamName(language, match[1]);
    const second = localizeTeamName(language, match[2]);
    return language === "es"
      ? `⚽ ${first} y ${second} empataron ${match[3]}.`
      : `⚽ ${koParticle(first, "과", "와")} ${koParticle(second, "은", "는")} ${match[3]} 무승부를 기록했다.`;
  }

  match = english.match(/^🌟 (.+)'s (.+)' equalizer earned (.+) a point\.$/u);
  if (match) {
    const scorer = localizePlayerName(language, match[1]);
    const team = localizeTeamName(language, match[3]);
    return language === "es"
      ? `🌟 El gol del empate de ${scorer} en el ${match[2]} dio un punto a ${team}.`
      : `🌟 ${koParticle(scorer, "의", "의")} ${normalizeMinute(match[2])}분 동점골이 ${koParticle(team, "에", "에")} 승점 1을 안겼다.`;
  }

  match = english.match(/^🌟 (.+)'s (.+)' winner settled it for (.+)\.$/u);
  if (match) {
    const scorer = localizePlayerName(language, match[1]);
    const team = localizeTeamName(language, match[3]);
    return language === "es"
      ? `🌟 El gol de la victoria de ${scorer} en el ${match[2]} decidió el partido para ${team}.`
      : `🌟 ${koParticle(scorer, "의", "의")} ${normalizeMinute(match[2])}분 결승골이 ${koParticle(team, "의", "의")} 승리를 확정했다.`;
  }

  match = english.match(/^🌟 (.+) scored twice as (.+) pulled clear\.$/u);
  if (match) {
    const scorer = localizePlayerName(language, match[1]);
    const team = localizeTeamName(language, match[2]);
    return language === "es"
      ? `🌟 ${scorer} marcó dos goles para que ${team} se distanciara.`
      : `🌟 ${koParticle(scorer, "이", "가")} 두 골을 넣으며 ${koParticle(team, "의", "의")} 승리를 이끌었다.`;
  }

  match = english.match(/^🌟 (.+) completed a hat trick as (.+) ran away with it\.$/u);
  if (match) {
    const scorer = localizePlayerName(language, match[1]);
    const team = localizeTeamName(language, match[2]);
    return language === "es"
      ? `🌟 ${scorer} completó un triplete en la amplia victoria de ${team}.`
      : `🌟 ${koParticle(scorer, "이", "가")} 해트트릭을 완성하며 ${koParticle(team, "의", "의")} 대승을 이끌었다.`;
  }

  match = english.match(/^🌟 (.+)'s late penalty sealed (.+)'s win\.$/u);
  if (match) {
    const scorer = localizePlayerName(language, match[1]);
    const team = localizeTeamName(language, match[2]);
    return language === "es"
      ? `🌟 El penal tardío de ${scorer} selló la victoria de ${team}.`
      : `🌟 ${koParticle(scorer, "의", "의")} 막판 페널티킥이 ${koParticle(team, "의", "의")} 승리를 확정했다.`;
  }

  match = english.match(/^🌟 (.+) opened it before (.+) finished the scoring\.$/u);
  if (match) {
    const opener = localizePlayerName(language, match[1]);
    const closer = localizePlayerName(language, match[2]);
    return language === "es"
      ? `🌟 ${opener} abrió el marcador y ${closer} cerró la cuenta.`
      : `🌟 ${koParticle(opener, "이", "가")} 선제골을 넣었고 ${koParticle(closer, "이", "가")} 마지막 골을 기록했다.`;
  }

  match = english.match(/^🌟 A (.+)' own goal earned (.+) a point\.$/u);
  if (match) {
    const team = localizeTeamName(language, match[2]);
    return language === "es"
      ? `🌟 Un autogol en el ${match[1]} dio un punto a ${team}.`
      : `🌟 ${normalizeMinute(match[1])}분 자책골이 ${koParticle(team, "에", "에")} 승점 1을 안겼다.`;
  }

  match = english.match(/^⚽ (.+) beat (.+) (.+)\.$/u);
  if (match) {
    const winner = localizeTeamName(language, match[1]);
    const loser = localizeTeamName(language, match[2]);
    return language === "es"
      ? `⚽ ${winner} venció ${match[3]} a ${loser}.`
      : `⚽ ${koParticle(winner, "이", "가")} ${koParticle(loser, "을", "를")} ${koDirection(match[3])} 꺾었다.`;
  }

  match = english.match(/^⚽ (.+) edged (.+) (.+)\.$/u);
  if (match) {
    const winner = localizeTeamName(language, match[1]);
    const loser = localizeTeamName(language, match[2]);
    return language === "es"
      ? `⚽ ${winner} superó por la mínima ${match[3]} a ${loser}.`
      : `⚽ ${koParticle(winner, "이", "가")} ${koParticle(loser, "을", "를")} ${koDirection(match[3])} 가까스로 꺾었다.`;
  }

  match = english.match(
    /^🌟 (.+) and (.+) carried the duel without a breakthrough\.$/u
  );
  if (match) {
    const first = localizePlayerName(language, match[1]);
    const second = localizePlayerName(language, match[2]);
    return language === "es"
      ? `🌟 ${first} y ${second} protagonizaron el duelo, pero ninguno encontró el gol.`
      : `🌟 ${koParticle(first, "과", "와")} ${koParticle(second, "이", "가")} 맞대결을 이끌었지만 득점은 나오지 않았다.`;
  }

  return "";
}

export function getCurrentFactualCopyOverride(language, english) {
  const markedStory = String(english || "").match(/^(🌟)\s+(.+)$/u);
  const reviewedMarkedStory = markedStory
    ? REVIEWED_CURRENT_COPY[language]?.[markedStory[2]]
    : "";
  return (
    REVIEWED_CURRENT_COPY[language]?.[english] ||
    (reviewedMarkedStory ? `${markedStory[1]} ${reviewedMarkedStory}` : "") ||
    getPatternedCurrentCopy(language, english) ||
    ""
  );
}

export function applyCurrentFactualCopyOverrides(language, translations) {
  const changed = [];
  for (const english of Object.keys(translations || {})) {
    const localized = getCurrentFactualCopyOverride(language, english);
    if (localized && translations[english] !== localized) {
      translations[english] = localized;
      changed.push(english);
    }
  }
  return changed;
}

export function collectCurrentFactualCopySources(fixturesData, tournamentData) {
  const sources = new Set();
  for (const fixture of fixturesData?.fixtures || []) {
    for (const field of ["resultStoryBullets", "resultHighlights"]) {
      for (const value of fixture?.[field] || []) {
        if (typeof value === "string" && value.trim()) {
          sources.add(value.trim());
        }
      }
    }
    for (const item of fixture?.catchUp || []) {
      for (const field of ["headline", "body", "standouts", "meta", "sourceLabel"]) {
        if (typeof item?.[field] === "string" && item[field].trim()) {
          sources.add(item[field].trim());
        }
      }
    }
  }
  for (const item of tournamentData?.catchUp || []) {
    for (const field of ["headline", "body", "standouts", "meta", "sourceLabel"]) {
      const value =
        typeof item?.[field] === "string" ? item[field] : item?.[field]?.en;
      if (typeof value === "string" && value.trim()) {
        sources.add(value.trim());
      }
    }
  }
  return sources;
}

export function getCurrentFactualTerminologyIssues(language, translations, sources) {
  const issues = [];
  for (const english of sources || []) {
    const localized = String(translations?.[english] || "");
    if (!localized) {
      continue;
    }
    if (
      /\bquarter-finals?\b/iu.test(english) &&
      (language === "es"
        ? !/\bcuartos? de final\b/iu.test(localized)
        : !/8강/u.test(localized))
    ) {
      issues.push(`quarter-final: ${english} -> ${localized}`);
    }
    if (
      /\bcame on\b/iu.test(english) &&
      (language === "es"
        ? !/\bentró como suplente\b/iu.test(localized)
        : !/교체 투입/u.test(localized))
    ) {
      issues.push(`substitute: ${english} -> ${localized}`);
    }
    if (
      /\bGroup I\b/u.test(english) &&
      (language === "es"
        ? !/\bGrupo I\b/u.test(localized)
        : !/I조/u.test(localized))
    ) {
      issues.push(`Group I: ${english} -> ${localized}`);
    }
    if (
      /\bdraw\b/iu.test(english) &&
      (language === "es"
        ? !/\bempate|empatar/iu.test(localized)
        : !/무승부/u.test(localized))
    ) {
      issues.push(`draw: ${english} -> ${localized}`);
    }
    if (
      /\bpenalt(?:y|ies)\b/iu.test(english) &&
      (language === "es"
        ? !/\bpenal(?:es)?\b/iu.test(localized)
        : !/페널티킥/u.test(localized))
    ) {
      issues.push(`penalty: ${english} -> ${localized}`);
    }
    if (
      /\bstruck\b/iu.test(english) &&
      (language === "es"
        ? !/marc/iu.test(localized)
        : !/득점|골/u.test(localized))
    ) {
      issues.push(`scoring struck: ${english} -> ${localized}`);
    }
    if (
      /\blead\b/iu.test(english) &&
      (language === "es"
        ? /\bplomo\b/iu.test(localized)
        : /납/u.test(localized))
    ) {
      issues.push(`lead metal sense: ${english} -> ${localized}`);
    }
    if (
      language === "es" &&
      /Un autogol llegó|demorada por una tormenta|más allá de Ghana|Reportado como lesionado|silenció a los creadores|La carrera tardía de Berg/iu.test(
        localized
      )
    ) {
      issues.push(`Spanish newsroom phrasing: ${english} -> ${localized}`);
    }
    if (
      /\bpoints?\b/iu.test(english) &&
      /\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\b/iu.test(localized)
    ) {
      issues.push(`English point count: ${english} -> ${localized}`);
    }
    if (language === "ko") {
      const sourceMinutes = [
        ...english.matchAll(
          /\b(\d+(?:\+\d+)?)(?:(?:st|nd|rd|th)?[- ]minutes?|['’])/giu
        )
      ].map((match) => match[1]);
      const missingMinuteMarkers = sourceMinutes.filter(
        (minute) => !localized.includes(`${minute}분`)
      );
      if (missingMinuteMarkers.length) {
        issues.push(
          `Korean minute marker ${missingMinuteMarkers.join(", ")}: ${english} -> ${localized}`
        );
      }
      if (/Oh Hyeongyu/u.test(localized) || (/Oh Hyeongyu/u.test(english) && !/오현규/u.test(localized))) {
        issues.push(`Korean player alias: ${english} -> ${localized}`);
      }
      if (/의 \d+-\d+ 동점을|의 격차를 \d+-\d+(?:으)?로 줄였다/u.test(localized)) {
        issues.push(`Korean scoring clause: ${english} -> ${localized}`);
      }
      if (/의 팽팽한 균형|만잠비/u.test(localized)) {
        issues.push(`Korean newsroom phrasing: ${english} -> ${localized}`);
      }

      for (const particleMatch of localized.matchAll(
        /(\d+(?:-\d+)*)(으로|로|이|가|와|과)/gu
      )) {
        const [, value, particle] = particleMatch;
        let expected = koParticle(value, "이", "가").slice(value.length);
        if (particle === "으로" || particle === "로") {
          expected = koDirection(value).slice(value.length);
        } else if (particle === "와" || particle === "과") {
          expected = koParticle(value, "과", "와").slice(value.length);
        }
        if (particle !== expected) {
          issues.push(
            `Korean numeric particle ${value}${particle}: ${english} -> ${localized}`
          );
        }
      }
    }
  }
  return issues;
}

export function getReviewedCurrentCopyMismatches(language, translations) {
  return Object.entries(REVIEWED_CURRENT_COPY[language] || {})
    .filter(([english, localized]) => translations?.[english] !== localized)
    .map(
      ([english, localized]) =>
        `${english} expected ${localized}, found ${translations?.[english] || "(missing)"}`
    );
}

export function getDeterministicCurrentFactualCopyMismatches(
  language,
  translations,
  sources
) {
  const mismatches = [];
  for (const english of sources || []) {
    const expected = getCurrentFactualCopyOverride(language, english);
    if (!expected) {
      mismatches.push(`${english} has no deterministic translation`);
    } else if (translations?.[english] !== expected) {
      mismatches.push(
        `${english} expected ${expected}, found ${translations?.[english] || "(missing)"}`
      );
    }
  }
  return mismatches;
}
