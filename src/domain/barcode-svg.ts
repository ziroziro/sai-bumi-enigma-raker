/**
 * Realistic Police Detective Shield Badge + Code 128 (Subset B) Barcode SVG Generator
 * Generates a realistic 3D metallic gold & royal navy enamel Police Detective Badge
 * with an integrated high-contrast scannable Code 128 barcode plate.
 */

import { findMemberByBarcode, type AttendanceMember } from "./attendance";

// Code 128 patterns (index corresponds to code value 0 - 106)
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

const START_B = 104;
const STOP = 106;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSunburstRays(cx: number, cy: number, radius: number, count: number): string {
  const paths: string[] = [];
  const angleStep = (Math.PI * 2) / count;
  const halfWidth = angleStep * 0.26;

  for (let i = 0; i < count; i++) {
    const a1 = i * angleStep - halfWidth;
    const a2 = i * angleStep + halfWidth;
    const x1 = (cx + Math.cos(a1) * radius).toFixed(1);
    const y1 = (cy + Math.sin(a1) * radius).toFixed(1);
    const x2 = (cx + Math.cos(a2) * radius).toFixed(1);
    const y2 = (cy + Math.sin(a2) * radius).toFixed(1);
    paths.push(`M ${cx} ${cy} L ${x1} ${y1} L ${x2} ${y2} Z`);
  }
  return paths.join(" ");
}

function buildSevenPointStar(cx: number, cy: number, outerR: number, innerR: number): string {
  const pts: string[] = [];
  const totalPoints = 14;
  for (let i = 0; i < totalPoints; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / 7 - Math.PI / 2;
    const x = (cx + Math.cos(angle) * r).toFixed(1);
    const y = (cy + Math.sin(angle) * r).toFixed(1);
    pts.push(`${x},${y}`);
  }
  return pts.join(" ");
}

export function generateCode128Svg(
  text: string,
  options: {
    height?: number;
    barWidth?: number;
    color?: string;
    bgColor?: string;
    showText?: boolean;
    member?: AttendanceMember;
  } = {}
): string {
  const showText = options.showText ?? true;
  const barColor = "#0f0d10";
  const matchedMember = options.member ?? findMemberByBarcode(text);

  const badgeNum = matchedMember
    ? `BADGE #${String(matchedMember.no).padStart(2, "0")}`
    : "OFFICIAL BADGE";
  const agentName = matchedMember ? matchedMember.nama.toUpperCase() : text.toUpperCase();
  const rankLabel = matchedMember
    ? `${matchedMember.statusRank.toUpperCase()} · ${matchedMember.namaKelompok.toUpperCase()}`
    : "SPECIAL INVESTIGATOR · ENIGMA";
  const deptLabel = matchedMember
    ? `${matchedMember.dept.toUpperCase()} DIVISION · TIM ${matchedMember.groupNumber}`
    : "SAI BUMI ENIGMA · LAMPUNG";

  // Build Code 128 pattern
  const codes: number[] = [START_B];
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const codeVal = charCode - 32;
    if (codeVal >= 0 && codeVal <= 94) {
      codes.push(codeVal);
    }
  }

  let checksum = START_B;
  for (let i = 1; i < codes.length; i++) {
    checksum += (codes[i] ?? 0) * i;
  }
  codes.push(checksum % 103);
  codes.push(STOP);

  let pattern = "";
  for (const c of codes) {
    const pat = CODE128_PATTERNS[c];
    if (pat) pattern += pat;
  }

  let totalUnits = 0;
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char) totalUnits += parseInt(char, 10);
  }

  // Fit barcode cleanly inside the white enamel plate (x=66..354, usable width=256 with generous quiet zone)
  const plateX = 56;
  const plateY = 266;
  const plateW = 308;
  const plateH = 122;
  const maxBarsWidth = 248;
  const computedBarWidth = Math.min(1.85, maxBarsWidth / Math.max(totalUnits, 1));
  const totalBarsWidth = totalUnits * computedBarWidth;
  const startX = 210 - totalBarsWidth / 2;
  const barTopY = plateY + 14;
  const barHeight = showText ? 68 : 88;

  let currentX = startX;
  let isBar = true;
  const rects: string[] = [];

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (!char) continue;
    const widthUnits = parseInt(char, 10);
    const w = widthUnits * computedBarWidth;
    if (isBar) {
      rects.push(
        `<rect x="${currentX.toFixed(2)}" y="${barTopY}" width="${w.toFixed(
          2
        )}" height="${barHeight}" fill="${barColor}" />`
      );
    }
    currentX += w;
    isBar = !isBar;
  }

  const uid = text.replace(/[^a-zA-Z0-9]/g, "") || "badge";
  const sunburstPath = buildSunburstRays(210, 240, 230, 28);
  const starPoints = buildSevenPointStar(210, 78, 28, 13.5);
  const innerStarPoints = buildSevenPointStar(210, 78, 18, 8.5);

  const rivets: Array<[number, number]> = [
    [210, 30],
    [304, 48],
    [364, 92],
    [369, 208],
    [336, 368],
    [210, 470],
    [84, 368],
    [51, 208],
    [56, 92],
    [116, 48],
  ];

  const rivetCircles = rivets
    .map(
      ([rx, ry]) =>
        `<circle cx="${rx}" cy="${ry}" r="4.2" fill="url(#goldRivet-${uid})" stroke="#4a300a" stroke-width="1" />`
    )
    .join("");

  const nameFontSize = agentName.length > 22 ? 13.5 : agentName.length > 17 ? 15.5 : 17.5;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 504" width="420" height="504" data-barcode="${escapeXml(
    text
  )}">
    <desc>${escapeXml(text)}</desc>
    <defs>
      <linearGradient id="goldOuter-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6b4814" />
        <stop offset="16%" stop-color="#fbe28a" />
        <stop offset="34%" stop-color="#c8932c" />
        <stop offset="50%" stop-color="#fff4c2" />
        <stop offset="68%" stop-color="#b47e1f" />
        <stop offset="85%" stop-color="#f7d574" />
        <stop offset="100%" stop-color="#4e320b" />
      </linearGradient>

      <linearGradient id="goldBevel-${uid}" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fff1b5" />
        <stop offset="25%" stop-color="#a57219" />
        <stop offset="52%" stop-color="#f7d779" />
        <stop offset="78%" stop-color="#764e0e" />
        <stop offset="100%" stop-color="#f3cf68" />
      </linearGradient>

      <linearGradient id="goldRibbon-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#7b5316" />
        <stop offset="18%" stop-color="#f7d676" />
        <stop offset="50%" stop-color="#fff6cc" />
        <stop offset="82%" stop-color="#f7d676" />
        <stop offset="100%" stop-color="#7b5316" />
      </linearGradient>

      <radialGradient id="navyEnamel-${uid}" cx="50%" cy="42%" r="60%">
        <stop offset="0%" stop-color="#1a2c4e" />
        <stop offset="58%" stop-color="#0d172a" />
        <stop offset="100%" stop-color="#060a14" />
      </radialGradient>

      <radialGradient id="goldRivet-${uid}" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#fff9db" />
        <stop offset="55%" stop-color="#e0aa3e" />
        <stop offset="100%" stop-color="#5e3e0c" />
      </radialGradient>

      <clipPath id="innerShieldClip-${uid}">
        <path d="M 210 38 C 242 38, 263 55, 292 53 C 321 51, 344 66, 360 93 C 346 125, 355 166, 367 204 C 375 231, 364 300, 329 362 C 296 419, 245 446, 210 462 C 175 446, 124 419, 91 362 C 56 300, 45 231, 53 204 C 65 166, 74 125, 60 93 C 76 66, 99 51, 128 53 C 157 55, 178 38, 210 38 Z" />
      </clipPath>
    </defs>

    <!-- OUTER DROP SHADOW BASE -->
    <path
      d="M 210 18 C 246 18, 270 38, 302 36 C 336 34, 362 52, 382 84 C 366 120, 376 164, 390 206 C 400 238, 388 314, 348 382 C 310 445, 253 474, 210 492 C 167 474, 110 445, 72 382 C 32 314, 20 238, 30 206 C 44 164, 54 120, 38 84 C 58 52, 84 34, 118 36 C 150 38, 174 18, 210 18 Z"
      fill="#090708"
      opacity="0.45"
      transform="translate(0, 5)"
    />

    <!-- OUTER 3D SCULPTED GOLD SHIELD BODY -->
    <path
      d="M 210 16 C 246 16, 270 36, 302 34 C 336 32, 362 50, 382 82 C 366 118, 376 162, 390 204 C 400 236, 388 312, 348 380 C 310 443, 253 472, 210 490 C 167 472, 110 443, 72 380 C 32 312, 20 236, 30 204 C 44 162, 54 118, 38 82 C 58 50, 84 32, 118 34 C 150 36, 174 16, 210 16 Z"
      fill="url(#goldOuter-${uid})"
      stroke="#3b2607"
      stroke-width="2.5"
    />

    <!-- MIDDLE BEVELED METALLIC RIM -->
    <path
      d="M 210 27 C 244 27, 266 45, 297 43 C 328 41, 353 58, 371 87 C 356 121, 365 164, 378 204 C 387 234, 376 306, 338 371 C 303 431, 249 459, 210 476 C 171 459, 117 431, 82 371 C 44 306, 33 234, 42 204 C 55 164, 64 121, 49 87 C 67 58, 92 41, 123 43 C 154 45, 176 27, 210 27 Z"
      fill="url(#goldBevel-${uid})"
      stroke="#fff2bd"
      stroke-width="1.2"
    />

    <!-- PERIMETER 3D GOLD RIVETS -->
    ${rivetCircles}

    <!-- INNER ROYAL NAVY ENAMEL SHIELD FACE -->
    <g clip-path="url(#innerShieldClip-${uid})">
      <rect x="30" y="30" width="360" height="440" fill="url(#navyEnamel-${uid})" />
      <!-- SUNBURST METALLIC RAYS -->
      <path d="${sunburstPath}" fill="url(#goldOuter-${uid})" opacity="0.14" />
      <circle cx="210" cy="240" r="185" fill="none" stroke="url(#goldOuter-${uid})" stroke-width="1" stroke-dasharray="4 4" opacity="0.45" />
    </g>

    <!-- INNER SHIELD GOLD OUTLINE -->
    <path
      d="M 210 38 C 242 38, 263 55, 292 53 C 321 51, 344 66, 360 93 C 346 125, 355 166, 367 204 C 375 231, 364 300, 329 362 C 296 419, 245 446, 210 462 C 175 446, 124 419, 91 362 C 56 300, 45 231, 53 204 C 65 166, 74 125, 60 93 C 76 66, 99 51, 128 53 C 157 55, 178 38, 210 38 Z"
      fill="none"
      stroke="url(#goldOuter-${uid})"
      stroke-width="2.4"
    />

    <!-- TOP DETECTIVE 7-POINT SHERIFF STAR MEDALLION & LAUREL WINGS -->
    <path d="M 132 78 C 154 65, 172 68, 184 74 C 170 82, 152 84, 132 78 Z" fill="url(#goldOuter-${uid})" stroke="#4a300a" stroke-width="0.9" />
    <path d="M 142 88 C 160 79, 174 80, 185 84 C 172 91, 156 92, 142 88 Z" fill="url(#goldOuter-${uid})" stroke="#4a300a" stroke-width="0.9" />
    <path d="M 288 78 C 266 65, 248 68, 236 74 C 250 82, 268 84, 288 78 Z" fill="url(#goldOuter-${uid})" stroke="#4a300a" stroke-width="0.9" />
    <path d="M 278 88 C 260 79, 246 80, 235 84 C 248 91, 264 92, 278 88 Z" fill="url(#goldOuter-${uid})" stroke="#4a300a" stroke-width="0.9" />

    <circle cx="210" cy="78" r="30" fill="#091326" stroke="url(#goldOuter-${uid})" stroke-width="2.5" />
    <polygon points="${starPoints}" fill="url(#goldOuter-${uid})" stroke="#4e320a" stroke-width="1" />
    <polygon points="${innerStarPoints}" fill="url(#goldBevel-${uid})" />
    <circle cx="210" cy="78" r="5.5" fill="url(#goldRivet-${uid})" stroke="#4a300a" stroke-width="1" />

    <!-- TOP ARCHED GOLD POLICE RIBBON BANNER -->
    <path
      d="M 74 118 Q 210 104 346 118 L 338 148 Q 210 135 82 148 Z"
      fill="url(#goldRibbon-${uid})"
      stroke="#4a300a"
      stroke-width="1.6"
    />
    <text x="210" y="128" font-family="Georgia, 'Times New Roman', serif" font-size="11.5" font-weight="900" fill="#1b1105" text-anchor="middle" letter-spacing="2.8">
      SPECIAL DETECTIVE
    </text>
    <text x="210" y="140" font-family="Arial, Helvetica, sans-serif" font-size="8.2" font-weight="800" fill="#3b2508" text-anchor="middle" letter-spacing="2">
      THE SAI BUMI ENIGMA · POLICE DEPT
    </text>

    <!-- ENGRAVED DETECTIVE IDENTITY & RANK PLATE -->
    <rect
      x="68"
      y="156"
      width="284"
      height="98"
      rx="8"
      fill="#091224"
      fill-opacity="0.88"
      stroke="url(#goldOuter-${uid})"
      stroke-width="1.8"
    />
    <rect
      x="134"
      y="164"
      width="152"
      height="20"
      rx="10"
      fill="url(#goldRibbon-${uid})"
      stroke="#4a300a"
      stroke-width="1"
    />
    <text x="210" y="178" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="900" fill="#181005" text-anchor="middle" letter-spacing="1.8">
      ${escapeXml(badgeNum)}
    </text>

    <text x="210" y="206" font-family="Georgia, 'Times New Roman', serif" font-size="${nameFontSize}" font-weight="bold" fill="#ffe699" text-anchor="middle" letter-spacing="1">
      ${escapeXml(agentName)}
    </text>
    <text x="210" y="225" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="800" fill="#f2c45a" text-anchor="middle" letter-spacing="1.5">
      ${escapeXml(rankLabel)}
    </text>
    <text x="210" y="242" font-family="Arial, Helvetica, sans-serif" font-size="8.8" font-weight="700" fill="#9fb6d9" text-anchor="middle" letter-spacing="1.4">
      ${escapeXml(deptLabel)}
    </text>

    <!-- RECESSED HIGH-CONTRAST SCANNABLE BARCODE ENAMEL PLATE -->
    <rect
      x="${plateX - 4}"
      y="${plateY - 4}"
      width="${plateW + 8}"
      height="${plateH + 8}"
      rx="11"
      fill="url(#goldOuter-${uid})"
      stroke="#3d2708"
      stroke-width="1.6"
    />
    <rect
      x="${plateX}"
      y="${plateY}"
      width="${plateW}"
      height="${plateH}"
      rx="8"
      fill="#fcfaf2"
      stroke="#b48327"
      stroke-width="1.4"
    />
    <circle cx="${plateX + 10}" cy="${plateY + 10}" r="2.8" fill="url(#goldRivet-${uid})" />
    <circle cx="${plateX + plateW - 10}" cy="${plateY + 10}" r="2.8" fill="url(#goldRivet-${uid})" />
    <circle cx="${plateX + 10}" cy="${plateY + plateH - 10}" r="2.8" fill="url(#goldRivet-${uid})" />
    <circle cx="${plateX + plateW - 10}" cy="${plateY + plateH - 10}" r="2.8" fill="url(#goldRivet-${uid})" />

    <!-- CODE 128 BARS -->
    ${rects.join("")}

    ${
      showText
        ? `<text x="210" y="${
            barTopY + barHeight + 21
          }" font-family="'Courier New', Courier, monospace" font-size="15" font-weight="900" fill="#111014" text-anchor="middle" letter-spacing="3.5">${escapeXml(
            text
          )}</text>`
        : ""
    }

    <!-- BOTTOM GOLD SCROLL BANNER & SHIELD POINT CREST -->
    <path
      d="M 96 404 Q 210 416 324 404 L 312 432 Q 210 444 108 432 Z"
      fill="url(#goldRibbon-${uid})"
      stroke="#4a300a"
      stroke-width="1.5"
    />
    <text x="210" y="424" font-family="Georgia, 'Times New Roman', serif" font-size="10" font-weight="900" fill="#1b1105" text-anchor="middle" letter-spacing="2.2">
      LAMPUNG · 2026 · VERIFIED
    </text>

    <polygon points="210,444 218,454 210,464 202,454" fill="url(#goldOuter-${uid})" stroke="#4a300a" stroke-width="0.9" />
  </svg>`;
}
