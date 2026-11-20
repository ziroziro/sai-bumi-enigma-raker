/**
 * The Sai Bumi Enigma — Thematic Detective Crest & Case-File QR Badge Generator
 * Displays ONLY:
 * 1. Nama Acara ("THE SAI BUMI ENIGMA")
 * 2. 3D Embossed QR Code integrated seamlessly on the parchment-bronze shield core
 * 3. Nama Pemilik & Nama Kelompok
 * (100% Die-Cut Transparent PNG Export — zero white background outside the shield contour).
 */

import * as zxingNamespace from "html5-qrcode/third_party/zxing-js.umd.js";
import { findMemberByBarcode, type AttendanceMember } from "./attendance";

interface ZXingModule {
  QRCodeWriter: new () => {
    encode: (
      contents: string,
      format: unknown,
      width: number,
      height: number,
      hints: Map<unknown, unknown>
    ) => {
      getWidth: () => number;
      getHeight: () => number;
      get: (x: number, y: number) => boolean;
    };
  };
  BarcodeFormat: {
    QR_CODE: unknown;
  };
  EncodeHintType: {
    ERROR_CORRECTION: unknown;
    MARGIN: unknown;
  };
  QRCodeDecoderErrorCorrectionLevel: {
    M: unknown;
    L: unknown;
    Q: unknown;
    H: unknown;
  };
}

const raw = zxingNamespace as Record<string, unknown>;
const zxing = ((raw.QRCodeWriter ? raw : (raw.default as Record<string, unknown> | undefined)) ??
  raw) as unknown as ZXingModule;

const { QRCodeWriter, BarcodeFormat, EncodeHintType, QRCodeDecoderErrorCorrectionLevel } = zxing;

export const OUTER_DETECTIVE_SHIELD_PATH =
  "M 210 10 C 248 10, 272 30, 308 28 C 344 26, 372 44, 392 78 C 378 116, 388 164, 400 212 C 408 248, 398 338, 360 412 C 322 478, 258 510, 210 530 C 162 510, 98 478, 60 412 C 22 338, 12 248, 20 212 C 32 164, 42 116, 28 78 C 48 44, 76 26, 112 28 C 148 30, 172 10, 210 10 Z";

const INNER_SHIELD_PATH =
  "M 210 30 C 244 30, 266 47, 298 45 C 329 43, 353 59, 370 88 C 357 123, 366 168, 378 212 C 386 244, 376 327, 341 395 C 306 456, 250 486, 210 504 C 170 486, 114 456, 79 395 C 44 327, 34 244, 42 212 C 54 168, 63 123, 50 88 C 67 59, 91 43, 122 45 C 154 47, 176 30, 210 30 Z";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatTeamDisplay(member: AttendanceMember | null): string {
  if (!member) return "THE SAI BUMI ENIGMA";
  switch (member.groupNumber) {
    case 1:
      return "KELOMPOK 1 · TEAM LUPIN";
    case 2:
      return "KELOMPOK 2 · TEAM DETECTIVE JUBUN";
    case 3:
      return "KELOMPOK 3 · TEAM CONAN";
    case 4:
      return "KELOMPOK 4 · TEAM HOLMES";
    default:
      return `KELOMPOK ${member.groupNumber} · ${member.namaKelompok.toUpperCase()}`;
  }
}

function buildSunburstFlutes(cx: number, cy: number, radius: number, count: number): string {
  const paths: string[] = [];
  const angleStep = (Math.PI * 2) / count;
  const halfWidth = angleStep * 0.24;

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

function buildCompassRoseTicks(cx: number, cy: number, rOuter: number, rInner: number): string {
  const lines: string[] = [];
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = (deg * Math.PI) / 180;
    const r2 = deg % 45 === 0 ? rInner - 5 : rInner;
    const sw = deg % 45 === 0 ? 1.6 : 0.8;
    const x1 = (cx + Math.cos(rad) * rOuter).toFixed(1);
    const y1 = (cy + Math.sin(rad) * rOuter).toFixed(1);
    const x2 = (cx + Math.cos(rad) * r2).toFixed(1);
    const y2 = (cy + Math.sin(rad) * r2).toFixed(1);
    lines.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#5b3e19" stroke-width="${sw}" stroke-opacity="0.55" />`
    );
  }
  return lines.join("");
}

/**
 * Generates a 2D boolean matrix representing the QR Code modules (true = dark, false = light).
 */
export function generateQrMatrix(text: string, quietZone = 3): boolean[][] {
  const hints = new Map();
  hints.set(EncodeHintType.ERROR_CORRECTION, QRCodeDecoderErrorCorrectionLevel.M);
  hints.set(EncodeHintType.MARGIN, quietZone);

  const writer = new QRCodeWriter();
  const bitMatrix = writer.encode(text, BarcodeFormat.QR_CODE, 21, 21, hints);
  const width = bitMatrix.getWidth();
  const height = bitMatrix.getHeight();

  const matrix: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < width; x++) {
      row.push(bitMatrix.get(x, y));
    }
    matrix.push(row);
  }
  return matrix;
}

export function generateQrSvg(
  text: string,
  options: {
    size?: number;
    color?: string;
    bgColor?: string;
    quietZone?: number;
    member?: AttendanceMember;
  } = {}
): string {
  const matchedMember = options.member ?? findMemberByBarcode(text);
  const ownerName = (matchedMember?.nama ?? text).toUpperCase();
  const teamLabel = formatTeamDisplay(matchedMember ?? null);

  const matrix = generateQrMatrix(text, options.quietZone ?? 0);
  const modulesCount = matrix.length;
  const qrSpan = 160;
  const qrOriginX = 210 - qrSpan / 2;
  const qrOriginY = 152;
  const cellSize = qrSpan / Math.max(modulesCount, 1);

  const pathCommands: string[] = [];
  for (let y = 0; y < modulesCount; y++) {
    const row = matrix[y];
    if (!row) continue;
    for (let x = 0; x < modulesCount; x++) {
      if (row[x]) {
        const px = (qrOriginX + x * cellSize).toFixed(2);
        const py = (qrOriginY + y * cellSize).toFixed(2);
        const cs = cellSize.toFixed(2);
        pathCommands.push(`M${px},${py}h${cs}v${cs}h-${cs}z`);
      }
    }
  }

  const qrPathData = pathCommands.join("");
  const uid = `enigma-${text.replace(/[^a-zA-Z0-9]/g, "") || "qr"}`;
  const sunburstPath = buildSunburstFlutes(210, 232, 235, 36);
  const compassTicks = buildCompassRoseTicks(210, 232, 132, 125);

  const rivets: Array<[number, number]> = [
    [210, 21],
    [308, 38],
    [372, 82],
    [386, 212],
    [364, 336],
    [332, 412],
    [210, 514],
    [88, 412],
    [56, 336],
    [34, 212],
    [48, 82],
    [112, 38],
  ];

  const rivetMarkup = rivets
    .map(
      ([rx, ry]) =>
        `<g>
          <circle cx="${rx}" cy="${ry + 1.3}" r="4.6" fill="#080503" opacity="0.78" />
          <circle cx="${rx}" cy="${ry}" r="4.1" fill="url(#brassRivet-${uid})" stroke="#1f1306" stroke-width="0.9" />
        </g>`
    )
    .join("");

  const nameFontSize =
    ownerName.length > 26
      ? 12.4
      : ownerName.length > 22
      ? 13.8
      : ownerName.length > 17
      ? 15.4
      : 17.5;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 540" width="420" height="540" data-barcode="${escapeXml(
    text
  )}" shape-rendering="geometricPrecision" style="background:none;background-color:transparent;">
    <desc>${escapeXml(text)} - ${escapeXml(ownerName)} (${escapeXml(teamLabel)})</desc>
    <defs>
      <!-- Outer Cast Antique Bronze & 24K Gold Frame -->
      <linearGradient id="antiqueGoldOuter-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#261808" />
        <stop offset="15%" stop-color="#8b6731" />
        <stop offset="30%" stop-color="#472f12" />
        <stop offset="48%" stop-color="#d7b16a" />
        <stop offset="55%" stop-color="#f5d996" />
        <stop offset="70%" stop-color="#6e4c1e" />
        <stop offset="86%" stop-color="#a88246" />
        <stop offset="100%" stop-color="#1a1005" />
      </linearGradient>

      <!-- Glowing Gold Trim for Banners & Plaques -->
      <linearGradient id="goldTrim-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#7c5620" />
        <stop offset="22%" stop-color="#e5c174" />
        <stop offset="50%" stop-color="#fff0c2" />
        <stop offset="78%" stop-color="#e5c174" />
        <stop offset="100%" stop-color="#7c5620" />
      </linearGradient>

      <!-- Sai Bumi Enigma Crimson-Maroon Banner Gradient -->
      <linearGradient id="crimsonBanner-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6b0f12" />
        <stop offset="50%" stop-color="#480709" />
        <stop offset="100%" stop-color="#280304" />
      </linearGradient>

      <!-- Dark Noir Detective Case Background -->
      <radialGradient id="noirBackdrop-${uid}" cx="50%" cy="44%" r="60%">
        <stop offset="0%" stop-color="#291c12" />
        <stop offset="62%" stop-color="#150e0a" />
        <stop offset="100%" stop-color="#090605" />
      </radialGradient>

      <!-- Warm Vintage Case-File Parchment & Brushed Bronze Core (Seamless QR Zone, No White) -->
      <radialGradient id="parchmentBronzeCore-${uid}" cx="50%" cy="43%" r="44%">
        <stop offset="0%" stop-color="#dfc38d" />
        <stop offset="58%" stop-color="#caa96e" />
        <stop offset="82%" stop-color="#9e7a42" />
        <stop offset="100%" stop-color="#22170d" />
      </radialGradient>

      <!-- 3D Embossed Deep Espresso-Crimson Relief for QR Modules -->
      <linearGradient id="embossedQrInk-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1c0f08" />
        <stop offset="50%" stop-color="#0f0804" />
        <stop offset="100%" stop-color="#060302" />
      </linearGradient>

      <!-- Subtle Brushed Metal & Parchment Grain -->
      <pattern id="brushedGrain-${uid}" width="40" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
        <line x1="0" y1="1" x2="40" y2="1" stroke="#181006" stroke-width="0.45" stroke-opacity="0.1" />
        <line x1="0" y1="3" x2="40" y2="3" stroke="#f4dfb4" stroke-width="0.45" stroke-opacity="0.11" />
      </pattern>

      <radialGradient id="brassRivet-${uid}" cx="35%" cy="30%" r="68%">
        <stop offset="0%" stop-color="#eed59d" />
        <stop offset="52%" stop-color="#947039" />
        <stop offset="100%" stop-color="#241707" />
      </radialGradient>

      <!-- Die-Cut Outer Shield Clip (Zero Background Outside the Shield) -->
      <clipPath id="outerShieldDieCut-${uid}">
        <path d="${OUTER_DETECTIVE_SHIELD_PATH}" />
      </clipPath>

      <clipPath id="innerShieldClip-${uid}">
        <path d="${INNER_SHIELD_PATH}" />
      </clipPath>
    </defs>

    <g clip-path="url(#outerShieldDieCut-${uid})">
      <!-- 1. OUTER CAST ANTIQUE BRONZE-GOLD SHIELD -->
      <path
        d="${OUTER_DETECTIVE_SHIELD_PATH}"
        fill="url(#antiqueGoldOuter-${uid})"
        stroke="#160e04"
        stroke-width="4"
      />

      <!-- 2. STEPPED METALLIC BEVEL RIM -->
      <path
        d="M 210 21 C 246 21, 268 39, 302 37 C 335 35, 362 52, 380 83 C 367 119, 376 165, 388 212 C 396 245, 386 332, 350 403 C 314 467, 254 497, 210 516 C 166 497, 106 467, 70 403 C 34 332, 24 245, 32 212 C 44 165, 53 119, 40 83 C 58 52, 85 35, 118 37 C 152 39, 174 21, 210 21 Z"
        fill="url(#noirBackdrop-${uid})"
        stroke="url(#goldTrim-${uid})"
        stroke-width="1.5"
      />

      <!-- PERIMETER RIVETS -->
      ${rivetMarkup}

      <!-- 3. INNER SHIELD FACE: SEAMLESS VINTAGE PARCHMENT-BRONZE RADIAL CORE + SUNBURST -->
      <g clip-path="url(#innerShieldClip-${uid})">
        <rect x="20" y="24" width="380" height="490" fill="url(#parchmentBronzeCore-${uid})" />
        <path d="${sunburstPath}" fill="#241608" opacity="0.08" />
        <rect x="20" y="24" width="380" height="490" fill="url(#brushedGrain-${uid})" />

        <!-- Subtle Compass Rose & Detective Case-File Rings Around the QR Center -->
        <circle cx="210" cy="232" r="134" fill="none" stroke="#61431b" stroke-width="1.1" stroke-opacity="0.45" />
        <circle cx="210" cy="232" r="124" fill="none" stroke="#61431b" stroke-width="0.9" stroke-dasharray="3 4" stroke-opacity="0.45" />
        ${compassTicks}

        <!-- Bottom Lampung Mountain & Pine Tree Horizon Silhouette -->
        <polygon points="40,504 105,452 162,488 210,446 264,486 320,450 380,504" fill="#1b1108" opacity="0.55" />
        <polygon points="85,504 135,464 185,504" fill="#2c1a0b" opacity="0.55" />
        <polygon points="235,504 285,462 340,504" fill="#2c1a0b" opacity="0.55" />
      </g>

      <!-- INNER SHIELD CHISELED GOLD BORDER -->
      <path
        d="${INNER_SHIELD_PATH}"
        fill="none"
        stroke="url(#antiqueGoldOuter-${uid})"
        stroke-width="3"
      />

      <!-- 4. TOP OFFICIAL EVENT NAME ONLY: "THE SAI BUMI ENIGMA" -->
      <path
        d="M 64 84 C 84 54, 120 42, 210 42 C 300 42, 336 54, 356 84 L 346 124 L 74 124 Z"
        fill="url(#noirBackdrop-${uid})"
        fill-opacity="0.94"
        stroke="url(#goldTrim-${uid})"
        stroke-width="1.6"
      />

      <!-- Lampung Siger / Detective Crown Filigree Ornament -->
      <path
        d="M 184 58 Q 197 49 210 57 Q 223 49 236 58 L 228 63 Q 210 56 192 63 Z"
        fill="url(#goldTrim-${uid})"
      />
      <polygon points="210,46 214,54 210,59 206,54" fill="#fff0c2" />
      <circle cx="196" cy="54" r="1.8" fill="#e5c174" />
      <circle cx="224" cy="54" r="1.8" fill="#e5c174" />

      <text
        x="210"
        y="79"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="11.5"
        font-weight="700"
        fill="#e7c77f"
        text-anchor="middle"
        letter-spacing="3.5"
      >
        THE SAI BUMI
      </text>
      <text
        x="210"
        y="110"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="28"
        font-weight="900"
        fill="url(#goldTrim-${uid})"
        text-anchor="middle"
        letter-spacing="4.8"
      >
        ENIGMA
      </text>

      <!-- Left & Right Star Emblem Accents -->
      <circle cx="96" cy="88" r="11" fill="#3a080a" stroke="url(#goldTrim-${uid})" stroke-width="1.2" />
      <polygon points="96,80 99,86 105,86 100,90 102,96 96,92 90,96 92,90 87,86 93,86" fill="url(#goldTrim-${uid})" />
      <circle cx="324" cy="88" r="11" fill="#3a080a" stroke="url(#goldTrim-${uid})" stroke-width="1.2" />
      <polygon points="324,80 327,86 333,86 328,90 330,96 324,92 318,96 320,90 315,86 321,86" fill="url(#goldTrim-${uid})" />

      <!-- 5. 3D EMBOSSED / TIMBUL QR CODE DIRECTLY ON THE PARCHMENT-BRONZE SHIELD CORE -->
      <g shape-rendering="crispEdges">
        <!-- Bottom-Right Warm Champagne Gold Bevel Light Catch -->
        <path d="${qrPathData}" fill="#f7e2b2" opacity="0.68" transform="translate(1.3, 1.3)" />
        <!-- Top-Left Cast Relief Shadow -->
        <path d="${qrPathData}" fill="#050301" opacity="0.82" transform="translate(-0.9, -0.9)" />
        <!-- Main Embossed Deep Espresso-Crimson QR Modules -->
        <path d="${qrPathData}" fill="url(#embossedQrInk-${uid})" />
      </g>

      <!-- 6. OWNER IDENTITY PLAQUE: HANYA NAMA PEMILIK & NAMA KELOMPOK -->
      <polygon
        points="54,348 68,336 352,336 366,348 366,422 352,434 68,434 54,422"
        fill="url(#noirBackdrop-${uid})"
        stroke="url(#goldTrim-${uid})"
        stroke-width="2.2"
      />
      <polygon
        points="60,351 71,341 349,341 360,351 360,419 349,429 71,429 60,419"
        fill="none"
        stroke="#8d6830"
        stroke-width="0.9"
        stroke-opacity="0.75"
      />

      <!-- OWNER FULL NAME -->
      <text
        x="210"
        y="370"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${nameFontSize}"
        font-weight="900"
        fill="#fff1c7"
        text-anchor="middle"
        letter-spacing="1.2"
      >
        ${escapeXml(ownerName)}
      </text>

      <!-- Divider Line -->
      <line x1="92" y1="382" x2="328" y2="382" stroke="url(#goldTrim-${uid})" stroke-width="1" opacity="0.65" />

      <!-- OWNER GROUP / TEAM HEXAGONAL CRIMSON-GOLD BADGE -->
      <polygon
        points="76,406 88,392 332,392 344,406 332,420 88,420"
        fill="url(#crimsonBanner-${uid})"
        stroke="url(#goldTrim-${uid})"
        stroke-width="1.5"
      />
      <text
        x="210"
        y="410"
        font-family="Arial, Helvetica, sans-serif"
        font-size="11.2"
        font-weight="900"
        fill="#ffd97d"
        text-anchor="middle"
        letter-spacing="1.8"
      >
        ${escapeXml(teamLabel)}
      </text>

      <!-- Bottom Sculpted Shield Tip Crest & Diamond (No Motto Text) -->
      <path
        d="M 136 452 Q 210 468 284 452 L 266 468 Q 210 482 154 468 Z"
        fill="url(#antiqueGoldOuter-${uid})"
        stroke="#1d1206"
        stroke-width="1.3"
      />
      <polygon
        points="210,476 220,488 210,500 200,488"
        fill="url(#goldTrim-${uid})"
        stroke="#221506"
        stroke-width="1.1"
      />
    </g>
  </svg>`;
}

export function generateQrDataUrl(
  text: string,
  options: {
    size?: number;
    color?: string;
    bgColor?: string;
    quietZone?: number;
    member?: AttendanceMember;
  } = {}
): string {
  const svg = generateQrSvg(text, options);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Renders the Detective QR Badge SVG to a 100% Die-Cut Transparent PNG Blob in the browser.
 * Enforces an exact Path2D shield contour clip + pixel mask on the RGBA canvas so every pixel
 * outside the shield badge is guaranteed to have alpha = 0 (no white background).
 */
export async function generateQrBadgePngBlob(
  text: string,
  scale = 2,
  member?: AttendanceMember
): Promise<Blob> {
  const svgString = generateQrSvg(text, { member });
  const baseWidth = 420;
  const baseHeight = 540;
  const width = baseWidth * scale;
  const height = baseHeight * scale;

  return new Promise<Blob>((resolve, reject) => {
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) {
          reject(new Error("Canvas 2D context tidak tersedia."));
          return;
        }

        ctx.clearRect(0, 0, width, height);

        ctx.save();
        ctx.scale(scale, scale);
        const shieldContour = new Path2D(OUTER_DETECTIVE_SHIELD_PATH);
        ctx.clip(shieldContour);
        ctx.drawImage(img, 0, 0, baseWidth, baseHeight);
        ctx.restore();

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = width;
        maskCanvas.height = height;
        const maskCtx = maskCanvas.getContext("2d", { alpha: true });
        if (maskCtx) {
          maskCtx.clearRect(0, 0, width, height);
          maskCtx.save();
          maskCtx.scale(scale, scale);
          maskCtx.fillStyle = "#000000";
          maskCtx.fill(new Path2D(OUTER_DETECTIVE_SHIELD_PATH));
          maskCtx.restore();
          const maskData = maskCtx.getImageData(0, 0, width, height).data;
          for (let i = 0; i < data.length; i += 4) {
            const maskAlpha = maskData[i + 3] ?? 0;
            if (maskAlpha === 0) {
              data[i] = 0;
              data[i + 1] = 0;
              data[i + 2] = 0;
              data[i + 3] = 0;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        canvas.toBlob(
          (pngBlob) => {
            if (!pngBlob) {
              reject(new Error("Gagal mengonversi lencana QR ke PNG transparan."));
              return;
            }
            resolve(pngBlob);
          },
          "image/png",
          1.0
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error("Gagal memuat gambar SVG lencana QR."));
    };

    img.src = svgDataUrl;
  });
}
