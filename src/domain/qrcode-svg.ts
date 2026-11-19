/**
 * Realistic Dark Antique Bronze-Brown Police Detective Shield Badge
 * with 3D Embossed / Relief QR Code Emerging Directly from the Shield Surface
 * (No Square Cover/Frame around the QR Code, No White Background, No Text/Names/Numbers)
 * + High-Resolution PNG Export Utilities.
 */

import * as zxingNamespace from "html5-qrcode/third_party/zxing-js.umd.js";

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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSunburstFlutes(cx: number, cy: number, radius: number, count: number): string {
  const paths: string[] = [];
  const angleStep = (Math.PI * 2) / count;
  const halfWidth = angleStep * 0.25;

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

function buildSevenPointStarFaceted(cx: number, cy: number, outerR: number, innerR: number): string {
  const facets: string[] = [];
  const total = 14;
  const pts: Array<[number, number]> = [];

  for (let i = 0; i < total; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / 7 - Math.PI / 2;
    pts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }

  for (let i = 0; i < total; i++) {
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % total]!;
    const fill = i % 2 === 0 ? "#b8965c" : "#4b3315";
    facets.push(
      `<polygon points="${cx},${cy} ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(
        1
      )},${p2[1].toFixed(1)}" fill="${fill}" stroke="#1f1407" stroke-width="0.45" />`
    );
  }
  return facets.join("");
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
    member?: unknown;
  } = {}
): string {
  const matrix = generateQrMatrix(text, options.quietZone ?? 0);
  const modulesCount = matrix.length;
  const qrSpan = 166;
  const qrOriginX = 210 - qrSpan / 2;
  const qrOriginY = 178;
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
  const uid = `det-${text.replace(/[^a-zA-Z0-9]/g, "") || "shield"}`;
  const sunburstPath = buildSunburstFlutes(210, 260, 240, 40);
  const starFacets = buildSevenPointStarFaceted(210, 82, 31, 14.5);

  const rivets: Array<[number, number]> = [
    [210, 28],
    [306, 46],
    [364, 90],
    [372, 206],
    [354, 304],
    [322, 378],
    [210, 474],
    [98, 378],
    [66, 304],
    [48, 206],
    [56, 90],
    [114, 46],
  ];

  const rivetMarkup = rivets
    .map(
      ([rx, ry]) =>
        `<g>
          <circle cx="${rx}" cy="${ry + 1.3}" r="4.8" fill="#080503" opacity="0.78" />
          <circle cx="${rx}" cy="${ry}" r="4.3" fill="url(#brassRivet-${uid})" stroke="#1f1407" stroke-width="0.9" />
        </g>`
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 506" width="420" height="506" data-barcode="${escapeXml(
    text
  )}" shape-rendering="geometricPrecision">
    <desc>${escapeXml(text)}</desc>
    <defs>
      <!-- Darker Antique Brown-Bronze Cast Outer Rim -->
      <linearGradient id="antiqueBrassOuter-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#211609" />
        <stop offset="14%" stop-color="#75572c" />
        <stop offset="28%" stop-color="#3f2c13" />
        <stop offset="46%" stop-color="#a8844c" />
        <stop offset="54%" stop-color="#bd995e" />
        <stop offset="68%" stop-color="#583e1b" />
        <stop offset="84%" stop-color="#876636" />
        <stop offset="100%" stop-color="#170f05" />
      </linearGradient>

      <!-- Darker Bronze Bevel Counter-Sheen -->
      <linearGradient id="brassBevel-${uid}" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#191005" />
        <stop offset="22%" stop-color="#967440" />
        <stop offset="48%" stop-color="#3a2710" />
        <stop offset="75%" stop-color="#aa8751" />
        <stop offset="100%" stop-color="#201507" />
      </linearGradient>

      <!-- Unified Darker Antique Bronze-Brown Shield Face (Seamless, No Square Box) -->
      <radialGradient id="unifiedShieldMetal-${uid}" cx="50%" cy="51%" r="58%">
        <stop offset="0%" stop-color="#bfa06a" />
        <stop offset="46%" stop-color="#a6854e" />
        <stop offset="76%" stop-color="#795c2e" />
        <stop offset="100%" stop-color="#2f1f0c" />
      </radialGradient>

      <!-- 3D Embossed Deep Dark Espresso-Gunmetal Relief for QR Modules -->
      <linearGradient id="embossedQrMetal-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#191109" />
        <stop offset="50%" stop-color="#0d0905" />
        <stop offset="100%" stop-color="#050302" />
      </linearGradient>

      <!-- Subtle Brushed Metal Micro-Grain Pattern -->
      <pattern id="brushedGrain-${uid}" width="40" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
        <line x1="0" y1="1" x2="40" y2="1" stroke="#181006" stroke-width="0.45" stroke-opacity="0.11" />
        <line x1="0" y1="3" x2="40" y2="3" stroke="#e8cfa0" stroke-width="0.45" stroke-opacity="0.11" />
      </pattern>

      <!-- 3D Rivet Specular Gradient -->
      <radialGradient id="brassRivet-${uid}" cx="35%" cy="30%" r="68%">
        <stop offset="0%" stop-color="#d2b77e" />
        <stop offset="50%" stop-color="#836334" />
        <stop offset="100%" stop-color="#211608" />
      </radialGradient>

      <clipPath id="innerShieldClip-${uid}">
        <path d="M 210 38 C 242 38, 263 55, 292 53 C 321 51, 344 66, 360 93 C 346 125, 355 166, 367 204 C 375 231, 364 300, 329 362 C 296 419, 245 446, 210 462 C 175 446, 124 419, 91 362 C 56 300, 45 231, 53 204 C 65 166, 74 125, 60 93 C 76 66, 99 51, 128 53 C 157 55, 178 38, 210 38 Z" />
      </clipPath>
    </defs>

    <!-- HEAVY AMBIENT DROP SHADOW -->
    <path
      d="M 210 18 C 246 18, 270 38, 302 36 C 336 34, 362 52, 382 84 C 366 120, 376 164, 390 206 C 400 238, 388 314, 348 382 C 310 445, 253 474, 210 492 C 167 474, 110 445, 72 382 C 32 314, 20 238, 30 206 C 44 164, 54 120, 38 84 C 58 52, 84 34, 118 36 C 150 38, 174 18, 210 18 Z"
      fill="#040302"
      opacity="0.7"
      transform="translate(0, 6)"
    />

    <!-- OUTER CAST DARK ANTIQUE BRONZE SHIELD -->
    <path
      d="M 210 14 C 246 14, 270 34, 302 32 C 336 30, 362 48, 382 80 C 366 116, 376 160, 390 202 C 400 234, 388 310, 348 378 C 310 441, 253 470, 210 488 C 167 470, 110 441, 72 378 C 32 310, 20 234, 30 202 C 44 160, 54 116, 38 80 C 58 48, 84 30, 118 32 C 150 34, 174 14, 210 14 Z"
      fill="url(#antiqueBrassOuter-${uid})"
      stroke="#140d04"
      stroke-width="3"
    />

    <!-- STEPPED BEVEL RIM -->
    <path
      d="M 210 26 C 244 26, 266 44, 297 42 C 328 40, 353 57, 371 86 C 356 120, 365 163, 378 203 C 387 233, 376 305, 338 370 C 303 430, 249 458, 210 475 C 171 458, 117 430, 82 370 C 44 305, 33 233, 42 203 C 55 163, 64 120, 49 86 C 67 57, 92 40, 123 42 C 154 44, 176 26, 210 26 Z"
      fill="url(#brassBevel-${uid})"
      stroke="#b6945b"
      stroke-width="1.1"
      stroke-opacity="0.58"
    />

    <!-- PERIMETER RIVETS -->
    ${rivetMarkup}

    <!-- UNIFIED CONTINUOUS DARK ANTIQUE BRONZE SHIELD BODY (NO INNER BOX) -->
    <g clip-path="url(#innerShieldClip-${uid})">
      <rect x="28" y="28" width="364" height="444" fill="url(#unifiedShieldMetal-${uid})" />
      <path d="${sunburstPath}" fill="#2b1d0b" opacity="0.09" />
      <rect x="28" y="28" width="364" height="444" fill="url(#brushedGrain-${uid})" />
    </g>

    <!-- INNER SHIELD CHISELED BORDER -->
    <path
      d="M 210 38 C 242 38, 263 55, 292 53 C 321 51, 344 66, 360 93 C 346 125, 355 166, 367 204 C 375 231, 364 300, 329 362 C 296 419, 245 446, 210 462 C 175 446, 124 419, 91 362 C 56 300, 45 231, 53 204 C 65 166, 74 125, 60 93 C 76 66, 99 51, 128 53 C 157 55, 178 38, 210 38 Z"
      fill="none"
      stroke="url(#antiqueBrassOuter-${uid})"
      stroke-width="3"
    />
    <path
      d="M 210 44 C 240 44, 260 60, 288 58 C 316 56, 338 70, 353 96 C 340 126, 348 166, 360 202 C 368 228, 357 295, 323 356 C 291 411, 243 438, 210 453 C 177 438, 129 411, 97 356 C 63 295, 52 228, 60 202 C 72 166, 80 126, 67 96 C 82 70, 104 56, 132 58 C 160 60, 180 44, 210 44 Z"
      fill="none"
      stroke="#1e1307"
      stroke-width="1.3"
      stroke-opacity="0.75"
    />

    <!-- TOP SCULPTED DETECTIVE 7-POINT STAR CREST & METAL WINGS -->
    <path d="M 112 82 C 142 66, 166 70, 180 78 C 162 86, 138 89, 112 82 Z" fill="url(#antiqueBrassOuter-${uid})" stroke="#1d1307" stroke-width="1.1" />
    <path d="M 124 94 C 148 83, 168 85, 181 90 C 165 98, 144 99, 124 94 Z" fill="url(#brassBevel-${uid})" stroke="#1d1307" stroke-width="1" />
    <path d="M 138 105 C 156 97, 171 98, 182 102 C 168 108, 152 109, 138 105 Z" fill="url(#antiqueBrassOuter-${uid})" stroke="#1d1307" stroke-width="0.9" />

    <path d="M 308 82 C 278 66, 254 70, 240 78 C 258 86, 282 89, 308 82 Z" fill="url(#antiqueBrassOuter-${uid})" stroke="#1d1307" stroke-width="1.1" />
    <path d="M 296 94 C 272 83, 252 85, 239 90 C 255 98, 276 99, 296 94 Z" fill="url(#brassBevel-${uid})" stroke="#1d1307" stroke-width="1" />
    <path d="M 282 105 C 264 97, 249 98, 238 102 C 252 108, 268 109, 282 105 Z" fill="url(#antiqueBrassOuter-${uid})" stroke="#1d1307" stroke-width="0.9" />

    <circle cx="210" cy="82" r="35" fill="#120d08" stroke="url(#antiqueBrassOuter-${uid})" stroke-width="3" />
    <circle cx="210" cy="82" r="30.5" fill="none" stroke="#75572c" stroke-width="0.9" stroke-dasharray="2 2" />
    ${starFacets}
    <circle cx="210" cy="82" r="6" fill="url(#brassRivet-${uid})" stroke="#1d1307" stroke-width="1.1" />

    <!-- 3D EMBOSSED / TIMBUL QR CODE DIRECTLY ON THE SHIELD METAL (NO BOX / NO COVER) -->
    <g shape-rendering="crispEdges">
      <!-- 1. Bottom-Right Warm Bronze Specular Bevel Edge (Timbul Light Catch) -->
      <path d="${qrPathData}" fill="#e6ca94" opacity="0.58" transform="translate(1.35, 1.35)" />
      <!-- 2. Top-Left Deep Cast Metal Relief Shadow -->
      <path d="${qrPathData}" fill="#040201" opacity="0.82" transform="translate(-0.95, -0.95)" />
      <!-- 3. Main Raised Dark Espresso-Bronze QR Modules -->
      <path d="${qrPathData}" fill="url(#embossedQrMetal-${uid})" />
    </g>

    <!-- BOTTOM SCULPTED DETECTIVE SHIELD RELIEF CREST -->
    <path
      d="M 134 398 Q 210 416 286 398 L 268 418 Q 210 434 152 418 Z"
      fill="url(#antiqueBrassOuter-${uid})"
      stroke="#1d1307"
      stroke-width="1.5"
    />
    <path
      d="M 156 426 Q 210 438 264 426"
      fill="none"
      stroke="#4b3518"
      stroke-width="1.8"
      stroke-linecap="round"
    />
    <polygon points="210,434 221,447 210,460 199,447" fill="url(#antiqueBrassOuter-${uid})" stroke="#1d1307" stroke-width="1.1" />
    <polygon points="210,439 216,447 210,455 204,447" fill="#c3a46c" opacity="0.65" />
  </svg>`;
}

export function generateQrDataUrl(
  text: string,
  options: { size?: number; color?: string; bgColor?: string; quietZone?: number } = {}
): string {
  const svg = generateQrSvg(text, options);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Renders the Detective QR Badge SVG to a high-resolution PNG Blob in the browser.
 */
export async function generateQrBadgePngBlob(
  text: string,
  scale = 2
): Promise<Blob> {
  const svgString = generateQrSvg(text);
  const width = 420 * scale;
  const height = 506 * scale;

  return new Promise<Blob>((resolve, reject) => {
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas 2D context tidak tersedia."));
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);

        canvas.toBlob(
          (pngBlob) => {
            if (!pngBlob) {
              reject(new Error("Gagal mengonversi lencana QR ke PNG."));
              return;
            }
            resolve(pngBlob);
          },
          "image/png",
          1.0
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal memuat gambar SVG lencana QR."));
    };

    img.src = url;
  });
}
