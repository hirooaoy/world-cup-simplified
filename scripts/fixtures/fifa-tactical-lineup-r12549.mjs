const i = (str, x, y, width = 3, height = 5.17) => Object.freeze({ str, x, y, width, height });

export const FIFA_TACTICAL_LINEUP_R12549_URL =
  "https://fdp.fifa.org/assetspublic/ce281/r12549/pdf/TacticalLineup-English.pdf";
export const FIFA_TACTICAL_LINEUP_R12549_SHA256 =
  "cda8da4f98a5a9493b526b49558ab3d39e494b5647d5a703f00b19fa232a8f83";

// Frozen, minimal positioned-text evidence from FIFA's match 102 document.
// It intentionally retains the PDF text fragmentation around captain markers.
export const fifaTacticalLineupR12549Document = Object.freeze({
  kind: "fifa-tactical-lineup-positioned-text-v1",
  pageCount: 1,
  width: 312,
  height: 448.08,
  sourceUrl: FIFA_TACTICAL_LINEUP_R12549_URL,
  sha256: FIFA_TACTICAL_LINEUP_R12549_SHA256,
  items: Object.freeze([
    i("TACTICAL LINE-UP", 146.64, 431.01, 26.99, 3.1),
    i("#102 | 15 July 2026 | ATLANTA / Atlanta Stadium / USA", 20.44, 408.24, 101.84, 4.14),
    i("England (ENG)", 18.11, 366.33, 33.71),
    i("Argentina (ARG)", 164.54, 366.33, 37.97),
    i("FORMATION:", 15.52, 357.02, 18.51, 3.1),
    i("4-2-3-1", 36.22, 357.02, 9.55, 3.1),
    i("FORMATION:", 161.95, 357.02, 18.51, 3.1),
    i("4-4-2", 182.65, 357.02, 6.95, 3.1),

    i("9", 83.89, 333.73, 2.97),
    i("KANE (", 78.93, 327.01, 9.78, 3.1),
    i("C", 88.7, 327.01, 2.03, 3.1),
    i(")", 90.73, 327.01, 1.08, 3.1),
    i("18", 53.43, 307.86, 5.93),
    i("GORDON", 50.12, 301.13, 12.54, 3.1),
    i("10", 82.41, 307.86, 5.93),
    i("BELLINGHAM", 75.78, 301.13, 19.19, 3.1),
    i("17", 111.38, 307.86, 5.93),
    i("ROGERS", 108.5, 301.13, 11.68, 3.1),
    i("8", 69.4, 281.99, 2.97),
    i("ANDERSON", 62.81, 275.26, 16.14, 3.1),
    i("4", 98.37, 281.99, 2.97),
    i("RICE", 96.59, 275.26, 6.54, 3.1),
    i("25", 38.94, 256.12, 5.93),
    i("SPENCE", 36.13, 249.39, 11.56, 3.1),
    i("6", 69.4, 256.12, 2.97),
    i("GUÉHI", 66.41, 249.39, 8.95, 3.1),
    i("5", 98.37, 256.12, 2.97),
    i("STONES", 94.06, 249.39, 11.61, 3.1),
    i("24", 125.87, 256.12, 5.93),
    i("JAMES", 123.82, 249.39, 10.02, 3.1),
    i("1", 83.89, 232.32, 2.97),
    i("PICKFORD", 78.09, 225.59, 14.57, 3.1),

    i("9", 215.83, 332.7, 2.97),
    i("J. ALVAREZ", 209.24, 325.97, 16.15, 3.1),
    i("10", 243.32, 332.7, 5.93),
    i("MESSI (", 239.32, 325.97, 10.84, 3.1),
    i("C", 250.15, 325.97, 2.03, 3.1),
    i(")", 252.18, 325.97, 1.08, 3.1),
    i("24", 185.37, 297, 5.93),
    i("E. FERNANDEZ", 177.89, 290.27, 20.88, 3.1),
    i("20", 214.35, 297, 5.93),
    i("MAC ALLISTER", 206.75, 290.27, 21.11, 3.1),
    i("5", 244.8, 297, 2.97),
    i("PAREDES", 239.74, 290.27, 13.09, 3.1),
    i("17", 272.3, 297, 5.93),
    i("SIMEONE", 268.63, 290.27, 13.27, 3.1),
    i("3", 186.85, 261.29, 2.97),
    i("TAGLIAFICO", 179.77, 254.57, 17.14, 3.1),
    i("6", 215.83, 261.29, 2.97),
    i("MARTÍNEZ", 209.77, 254.57, 15.09, 3.1),
    i("13", 243.32, 261.29, 5.93),
    i("ROMERO", 240, 254.57, 12.57, 3.1),
    i("26", 272.3, 261.29, 5.93),
    i("MOLINA", 269.45, 254.57, 11.63, 3.1),
    i("23", 228.83, 233.87, 5.93),
    i("E. MARTINEZ", 222.58, 227.14, 18.44, 3.1),

    i("SUBSTITUTES", 17.59, 213.17, 26.91, 4.14),
    i("SUBSTITUTES", 164.02, 213.17, 26.91, 4.14),
    i("Wednesday, 15 July 2026 | 17:41 UTC | Version 1 | Page 1/1", 117.8, 50.71, 82.36, 3.1)
  ])
});
