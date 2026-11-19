/**
 * Realistic Dark Antique Bronze-Brown Police Detective Shield Badge + Code 128 SVG Generator
 * (100% Die-Cut Transparent Background — No White Background Outside or Inside the Shield).
 */

import { OUTER_DETECTIVE_SHIELD_PATH } from "./qrcode-svg";

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

export function generateCode128Svg(
  text: string,
  options: {
    height?: number;
    barWidth?: number;
    color?: string;
    bgColor?: string;
    showText?: boolean;
    member?: unknown;
  } = {}
): string {
  const barColor = "#0d0905";

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

  const maxBarsWidth = 248;
  const computedBarWidth = Math.min(1.85, maxBarsWidth / Math.max(totalUnits, 1));
  const totalBarsWidth = totalUnits * computedBarWidth;
  const startX = 210 - totalBarsWidth / 2;
  const barTopY = 218;
  const barHeight = options.height ?? 86;

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

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 506" width="420" height="506" data-barcode="${escapeXml(
    text
  )}" style="background:none;background-color:transparent;">
    <desc>${escapeXml(text)}</desc>
    <defs>
      <linearGradient id="antiqueBrassOuter-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#211609" />
        <stop offset="28%" stop-color="#75572c" />
        <stop offset="52%" stop-color="#bd995e" />
        <stop offset="76%" stop-color="#583e1b" />
        <stop offset="100%" stop-color="#170f05" />
      </linearGradient>
      <radialGradient id="unifiedShieldMetal-${uid}" cx="50%" cy="51%" r="58%">
        <stop offset="0%" stop-color="#bfa06a" />
        <stop offset="55%" stop-color="#a6854e" />
        <stop offset="100%" stop-color="#2f1f0c" />
      </radialGradient>
      <clipPath id="outerShieldDieCut-${uid}">
        <path d="${OUTER_DETECTIVE_SHIELD_PATH}" />
      </clipPath>
    </defs>
    <g clip-path="url(#outerShieldDieCut-${uid})">
      <path d="${OUTER_DETECTIVE_SHIELD_PATH}" fill="url(#unifiedShieldMetal-${uid})" stroke="url(#antiqueBrassOuter-${uid})" stroke-width="14" />
      ${rects.join("")}
    </g>
  </svg>`;
}
