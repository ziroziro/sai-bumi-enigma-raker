import { z } from "zod";

export const TOTAL_STAGE_COUNT = 10;

export const STATIC_STAGE_SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/1wU906kwjcFFgEtcNAUijrWsfYoc_vep5xTfwqQOsACU/edit?gid=1587789440#gid=1587789440";

export const STAGE_RUBRIC_ASPECTS = [
  {
    key: "feasibility",
    number: 1,
    label: "1. Project Feasibility & Business Alignment (30%)",
    weight: 0.3,
    weightLabel: "30%",
    criteria:
      "Apakah Feedback memungkinkan untuk dijalankan dengan mempertimbangkan kebutuhan dan prioritas bisnis, ketersediaan sumber daya, serta kondisi operasional",
  },
  {
    key: "crossFunction",
    number: 2,
    label: "2. Cross Function (25%)",
    weight: 0.25,
    weightLabel: "25%",
    criteria: "Apakah project ini ada cross function dengan dep lain",
  },
  {
    key: "relevansi",
    number: 3,
    label: "3. Relevansi Feedback terhadap Project (25%)",
    weight: 0.25,
    weightLabel: "25%",
    criteria: "Feedback sesuai dengan materi, project, dan permasalahan yang dipresentasikan",
  },
  {
    key: "delivery",
    number: 4,
    label: "4. Delivery Feedback (20%)",
    weight: 0.2,
    weightLabel: "20%",
    criteria:
      "Feedback disampaikan secara jelas, sistematis, profesional, dan mudah dipahami presenter.",
  },
] as const;

export const STAGE_OFFICIAL_GROUPS = [
  { number: 1, name: "Team Lupin", aliases: ["lupin", "team lupin", "kelompok 1", "kel 1", "tim 1"] },
  {
    number: 2,
    name: "Team Detective Jubun",
    aliases: [
      "jubun",
      "detective jubun",
      "detectif jubun",
      "team detective jubun",
      "detective lupin",
      "kelompok 2",
      "kel 2",
      "tim 2",
    ],
  },
  { number: 3, name: "Team Conan", aliases: ["conan", "team conan", "kelompok 3", "kel 3", "tim 3"] },
  { number: 4, name: "Team Holmes", aliases: ["holmes", "team holmes", "kelompok 4", "kel 4", "tim 4"] },
] as const;

export function getStageGroupName(groupNumber: number): string {
  const found = STAGE_OFFICIAL_GROUPS.find((g) => g.number === groupNumber);
  return found ? found.name : `Kelompok ${groupNumber}`;
}

export function matchStageGroupNumber(rawLabel: string): number | null {
  const cleaned = rawLabel.trim().toLowerCase().replace(/\s+/g, " ");
  if (!cleaned) return null;

  for (const grp of STAGE_OFFICIAL_GROUPS) {
    if (grp.aliases.some((alias) => cleaned === alias || cleaned.includes(alias))) {
      return grp.number;
    }
  }

  const numMatch = /^(?:kelompok|kel|tim|group|team)?\s*([1-4])$/i.exec(cleaned);
  if (numMatch) {
    return Number(numMatch[1]);
  }
  return null;
}

export function matchStageNumber(rawStage: string | number): number | null {
  if (typeof rawStage === "number") {
    return Number.isInteger(rawStage) && rawStage >= 1 && rawStage <= TOTAL_STAGE_COUNT
      ? rawStage
      : null;
  }
  const cleaned = rawStage.trim().toLowerCase();
  if (!cleaned) return null;
  const match = /(?:stage|sesi|session|babak|pos)?\s*#?\s*(10|[1-9])\b/i.exec(cleaned);
  if (!match) return null;
  const num = Number(match[1]);
  return num >= 1 && num <= TOTAL_STAGE_COUNT ? num : null;
}

export interface StageEssaySubmission {
  id: string;
  stageNumber: number; // 1..10
  groupNumber: number; // 1..4
  groupName: string;
  detail: string;
  photoDataUrl?: string | null;
  submittedAt: string;
}

export interface StageScoreEntry {
  stageNumber: number; // 1..10
  groupNumber: number; // 1..4
  groupName: string;
  score: number;
  note?: string;
  updatedAt: string;
}

export interface StageTop3LeaderboardItem {
  rank: 1 | 2 | 3;
  groupNumber: number;
  groupName: string;
  score: number;
  note?: string;
  hasSubmitted: boolean;
  submittedAt?: string;
}

export interface CumulativeLeaderboardItem {
  rank: 1 | 2 | 3 | 4;
  groupNumber: number;
  groupName: string;
  totalScore: number;
  stageScores: Record<number, number>;
  scoredStagesCount: number;
}

export interface StageSessionSummary {
  stageNumber: number;
  title: string;
  submissionsCount: number;
  maxGroups: number;
  submittedGroups: Array<{
    groupNumber: number;
    groupName: string;
    submittedAt: string;
  }>;
  isAllGroupsSubmitted: boolean;
  isManuallyCompleted: boolean;
  isSessionFinished: boolean;
  hasScores: boolean;
  top3Leaderboard: StageTop3LeaderboardItem[];
  allGroupScores: Array<{
    groupNumber: number;
    groupName: string;
    score: number | null;
    note?: string;
    hasSubmitted: boolean;
    submittedAt?: string;
  }>;
}

export type LeaderboardDisplayMode = "session" | "best_group";

export interface StageEssayStateSnapshot {
  isFormOpen: boolean;
  isLeaderboardRevealed: boolean;
  leaderboardRevealId: number;
  leaderboardMode: LeaderboardDisplayMode;
  activeStageNumber: number;
  displayAnswersStageNumber: number;
  leaderboardStageNumber: number;
  completedStageNumbers: number[];
  spreadsheetUrl: string;
  lastSpreadsheetSyncAt: string | null;
  lastSpreadsheetSyncError: string | null;
  submissions: StageEssaySubmission[];
  scores: StageScoreEntry[];
  bestGroupScores: Record<number, number>;
  stages: StageSessionSummary[];
  stageLeaderboardStandings: CumulativeLeaderboardItem[];
  stageLeaderboardTop3: CumulativeLeaderboardItem[];
  bestGroupStandings: CumulativeLeaderboardItem[];
  cumulativeStandings: CumulativeLeaderboardItem[];
  cumulativeTop3: CumulativeLeaderboardItem[];
}

export const submitStageEssaySchema = z.object({
  stageNumber: z.number().int().min(1).max(TOTAL_STAGE_COUNT).optional(),
  groupNumber: z.number().int().min(1).max(4),
  detail: z
    .string()
    .trim()
    .min(3, "Detail jawaban tidak boleh kosong (minimal 3 karakter).")
    .max(15000, "Detail jawaban terlalu panjang."),
  photoDataUrl: z
    .string()
    .refine(
      (v) => v === "" || v.startsWith("data:image/"),
      "File yang diunggah harus berupa format foto (JPG, PNG, WEBP, GIF, dll)."
    )
    .nullable()
    .optional(),
});

export function normalizeGoogleSpreadsheetCsvUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  const sheetIdMatch = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(trimmed);
  if (!sheetIdMatch) {
    return trimmed;
  }

  const sheetId = sheetIdMatch[1];
  const gidMatch = /[?#&]gid=([0-9]+)/.exec(trimmed);
  const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : "";

  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gidParam}`;
}

function parseCsvRows(csvText: string): string[][] {
  const normalized = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const firstLine = lines[0] ?? "";
  const delimiter =
    firstLine.includes("\t") && !firstLine.includes(",")
      ? "\t"
      : firstLine.split(";").length > firstLine.split(",").length
      ? ";"
      : ",";

  const rows: string[][] = [];
  for (const line of lines) {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    rows.push(cells);
  }

  return rows;
}

function parseNumberScore(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(",", ".");
  if (!cleaned || cleaned === "-") return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : null;
}

function parseRubricAspectScore(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "-") return null;
  const direct = parseNumberScore(trimmed);
  if (direct !== null) return direct;
  // Format Google Form: "1 - Kurang", "2 - Cukup", "3 - Baik", "4 - Sangat Baik"
  const leadingNum = /^(\d+(?:[.,]\d+)?)/.exec(trimmed);
  if (leadingNum && leadingNum[1]) {
    const val = Number(leadingNum[1].replace(",", "."));
    return Number.isFinite(val) ? val : null;
  }
  return null;
}

export function parseStageScoresSpreadsheetCsv(
  csvText: string,
  options?: {
    activeStageNumber?: number;
    rowStageMap?: Record<string, number>;
  }
): StageScoreEntry[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];

  const header = rows[0]!.map((h) => h.trim());
  const nowIso = new Date().toISOString();
  const entryMap = new Map<string, StageScoreEntry>();

  // 0. Deteksi format Rubrik Form Penilaian 4 Aspek (30% / 25% / 25% / 20%)
  const timestampIdx = header.findIndex((h) => /timestamp|waktu|tanggal/i.test(h));
  const feasibilityIdx = header.findIndex((h) =>
    /feasibility|business alignment|30%/i.test(h)
  );
  const crossFunctionIdx = header.findIndex((h) => /cross\s*function/i.test(h));
  const relevansiIdx = header.findIndex((h) => /relevansi/i.test(h));
  const deliveryIdx = header.findIndex((h) => /delivery|20%/i.test(h));
  const formGroupIdx = header.findIndex((h) => /\b(kelompok|team|tim|group)\b/i.test(h));
  const explicitStageIdx = header.findIndex((h) => /\b(sesi|stage|babak|round)\b/i.test(h));
  const projectDeptIdx = header.findIndex((h) => /\b(project\s*dept|dept|departemen)\b/i.test(h));

  if (
    feasibilityIdx >= 0 &&
    crossFunctionIdx >= 0 &&
    relevansiIdx >= 0 &&
    deliveryIdx >= 0 &&
    formGroupIdx >= 0
  ) {
    const occurrenceCounter = new Map<string, number>();
    const activeStage =
      options?.activeStageNumber &&
      options.activeStageNumber >= 1 &&
      options.activeStageNumber <= TOTAL_STAGE_COUNT
        ? options.activeStageNumber
        : undefined;
    const rowStageMap = options?.rowStageMap;

    const sessionBuckets = new Map<
      string,
      {
        stageNumber: number;
        groupNumber: number;
        totalScore: number;
        details: string[];
      }
    >();

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]!;
      const grpNum = matchStageGroupNumber(row[formGroupIdx] ?? "");
      if (!grpNum) continue;

      const v1 = parseRubricAspectScore(row[feasibilityIdx]);
      const v2 = parseRubricAspectScore(row[crossFunctionIdx]);
      const v3 = parseRubricAspectScore(row[relevansiIdx]);
      const v4 = parseRubricAspectScore(row[deliveryIdx]);
      if (v1 === null && v2 === null && v3 === null && v4 === null) continue;

      const weighted =
        Math.round(
          ((v1 ?? 0) * 0.3 + (v2 ?? 0) * 0.25 + (v3 ?? 0) * 0.25 + (v4 ?? 0) * 0.2) * 100
        ) / 100;

      const deptLabel = (projectDeptIdx >= 0 ? row[projectDeptIdx] : "")?.trim() || "Dept";
      const tsLabel = (timestampIdx >= 0 ? row[timestampIdx] : "")?.trim() || `row-${r}`;
      const rowKey = `${tsLabel}|${deptLabel.toUpperCase()}|${grpNum}|${v1 ?? 0}|${v2 ?? 0}|${v3 ?? 0}|${v4 ?? 0}`;

      let stageNum: number | null = null;
      if (explicitStageIdx >= 0) {
        stageNum = matchStageNumber(row[explicitStageIdx] ?? "");
      }
      if (!stageNum && rowStageMap && typeof rowStageMap[rowKey] === "number") {
        stageNum = rowStageMap[rowKey]!;
      }
      if (!stageNum && activeStage !== undefined) {
        stageNum = activeStage;
      }
      if (!stageNum) {
        const occKey = `${grpNum}-${deptLabel.toUpperCase()}`;
        const nextOcc = (occurrenceCounter.get(occKey) ?? 0) + 1;
        occurrenceCounter.set(occKey, nextOcc);
        stageNum = Math.min(nextOcc, TOTAL_STAGE_COUNT);
      }

      if (rowStageMap && typeof rowStageMap[rowKey] !== "number") {
        rowStageMap[rowKey] = stageNum;
      }

      const bKey = `${stageNum}-${grpNum}`;
      const existing = sessionBuckets.get(bKey);
      if (existing) {
        existing.totalScore = Math.round((existing.totalScore + weighted) * 100) / 100;
        existing.details.push(`${deptLabel}: ${weighted}`);
      } else {
        sessionBuckets.set(bKey, {
          stageNumber: stageNum,
          groupNumber: grpNum,
          totalScore: weighted,
          details: [`${deptLabel}: ${weighted}`],
        });
      }
    }

    for (const bucket of sessionBuckets.values()) {
      entryMap.set(`${bucket.stageNumber}-${bucket.groupNumber}`, {
        stageNumber: bucket.stageNumber,
        groupNumber: bucket.groupNumber,
        groupName: getStageGroupName(bucket.groupNumber),
        score: bucket.totalScore,
        note: bucket.details.join(" · "),
        updatedAt: nowIso,
      });
    }

    return Array.from(entryMap.values());
  }

  const groupCols: Array<{ colIndex: number; groupNumber: number }> = [];
  header.forEach((colName, idx) => {
    if (idx === 0) return;
    const grpNum = matchStageGroupNumber(colName);
    if (grpNum !== null) {
      groupCols.push({ colIndex: idx, groupNumber: grpNum });
    }
  });

  if (groupCols.length >= 2) {
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]!;
      const stageNum = matchStageNumber(row[0] ?? "");
      if (!stageNum) continue;
      for (const gc of groupCols) {
        const scoreVal = parseNumberScore(row[gc.colIndex]);
        if (scoreVal !== null) {
          const key = `${stageNum}-${gc.groupNumber}`;
          entryMap.set(key, {
            stageNumber: stageNum,
            groupNumber: gc.groupNumber,
            groupName: getStageGroupName(gc.groupNumber),
            score: scoreVal,
            updatedAt: nowIso,
          });
        }
      }
    }
    return Array.from(entryMap.values());
  }

  const stageCols: Array<{ colIndex: number; stageNumber: number }> = [];
  header.forEach((colName, idx) => {
    if (idx === 0) return;
    const stNum = matchStageNumber(colName);
    if (stNum !== null) {
      stageCols.push({ colIndex: idx, stageNumber: stNum });
    }
  });

  if (stageCols.length >= 2) {
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]!;
      const grpNum = matchStageGroupNumber(row[0] ?? "");
      if (!grpNum) continue;
      for (const sc of stageCols) {
        const scoreVal = parseNumberScore(row[sc.colIndex]);
        if (scoreVal !== null) {
          const key = `${sc.stageNumber}-${grpNum}`;
          entryMap.set(key, {
            stageNumber: sc.stageNumber,
            groupNumber: grpNum,
            groupName: getStageGroupName(grpNum),
            score: scoreVal,
            updatedAt: nowIso,
          });
        }
      }
    }
    return Array.from(entryMap.values());
  }

  let stageColIdx = header.findIndex((h) => /\b(stage|sesi|babak|pos)\b/i.test(h));
  let groupColIdx = header.findIndex((h) => /\b(kelompok|team|tim|group|nama)\b/i.test(h));
  let scoreColIdx = header.findIndex((h) => /\b(nilai|score|poin|skor|point)\b/i.test(h));
  const noteColIdx = header.findIndex((h) => /catatan|note|keterangan|komentar/i.test(h));

  if (stageColIdx === -1) stageColIdx = 0;
  if (groupColIdx === -1) groupColIdx = 1;
  if (scoreColIdx === -1) scoreColIdx = 2;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!;
    const stageNum = matchStageNumber(row[stageColIdx] ?? "");
    const grpNum = matchStageGroupNumber(row[groupColIdx] ?? "");
    const scoreVal = parseNumberScore(row[scoreColIdx]);

    if (stageNum && grpNum && scoreVal !== null) {
      const key = `${stageNum}-${grpNum}`;
      entryMap.set(key, {
        stageNumber: stageNum,
        groupNumber: grpNum,
        groupName: getStageGroupName(grpNum),
        score: scoreVal,
        note: noteColIdx >= 0 ? row[noteColIdx]?.trim() || undefined : undefined,
        updatedAt: nowIso,
      });
    }
  }

  return Array.from(entryMap.values());
}

export function generateStageSpreadsheetTemplateCsv(existingScores: StageScoreEntry[] = []): string {
  const scoreMap = new Map<string, number>();
  for (const s of existingScores) {
    scoreMap.set(`${s.stageNumber}-${s.groupNumber}`, s.score);
  }

  const lines: string[] = [
    "Stage,Team Lupin,Team Detective Jubun,Team Conan,Team Holmes",
  ];
  for (let st = 1; st <= TOTAL_STAGE_COUNT; st++) {
    const c1 = scoreMap.get(`${st}-1`) ?? "";
    const c2 = scoreMap.get(`${st}-2`) ?? "";
    const c3 = scoreMap.get(`${st}-3`) ?? "";
    const c4 = scoreMap.get(`${st}-4`) ?? "";
    lines.push(`Stage ${st},${c1},${c2},${c3},${c4}`);
  }
  return lines.join("\n");
}

export function buildStageEssaySnapshot(input: {
  isFormOpen?: boolean;
  isLeaderboardRevealed?: boolean;
  leaderboardRevealId?: number;
  leaderboardMode?: LeaderboardDisplayMode;
  activeStageNumber?: number;
  displayAnswersStageNumber?: number;
  leaderboardStageNumber?: number;
  completedStageNumbers?: number[];
  spreadsheetUrl?: string;
  lastSpreadsheetSyncAt?: string | null;
  lastSpreadsheetSyncError?: string | null;
  submissions: StageEssaySubmission[];
  scores: StageScoreEntry[];
  bestGroupScores?: Record<number, number>;
}): StageEssayStateSnapshot {
  const activeStageNumber =
    input.activeStageNumber &&
    input.activeStageNumber >= 1 &&
    input.activeStageNumber <= TOTAL_STAGE_COUNT
      ? input.activeStageNumber
      : 1;

  const displayAnswersStageNumber =
    input.displayAnswersStageNumber &&
    input.displayAnswersStageNumber >= 1 &&
    input.displayAnswersStageNumber <= TOTAL_STAGE_COUNT
      ? input.displayAnswersStageNumber
      : activeStageNumber;

  const leaderboardStageNumber =
    input.leaderboardStageNumber &&
    input.leaderboardStageNumber >= 1 &&
    input.leaderboardStageNumber <= TOTAL_STAGE_COUNT
      ? input.leaderboardStageNumber
      : activeStageNumber;

  const completedSet = new Set<number>(
    (input.completedStageNumbers ?? []).filter((n) => n >= 1 && n <= TOTAL_STAGE_COUNT)
  );

  const stages: StageSessionSummary[] = [];

  for (let st = 1; st <= TOTAL_STAGE_COUNT; st++) {
    const stageSubs = input.submissions
      .filter((s) => s.stageNumber === st)
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

    const subByGroup = new Map<number, StageEssaySubmission>();
    for (const sub of stageSubs) {
      subByGroup.set(sub.groupNumber, sub);
    }

    const scoreByGroup = new Map<number, StageScoreEntry>();
    for (const sc of input.scores) {
      if (sc.stageNumber === st) {
        scoreByGroup.set(sc.groupNumber, sc);
      }
    }

    const allGroupScores = STAGE_OFFICIAL_GROUPS.map((grp) => {
      const sub = subByGroup.get(grp.number);
      const sc = scoreByGroup.get(grp.number);
      return {
        groupNumber: grp.number,
        groupName: grp.name,
        score: typeof sc?.score === "number" ? sc.score : null,
        note: sc?.note,
        hasSubmitted: Boolean(sub),
        submittedAt: sub?.submittedAt,
      };
    });

    const scoredGroups = allGroupScores
      .filter((g): g is typeof g & { score: number } => typeof g.score === "number")
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.submittedAt && b.submittedAt) {
          return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        }
        return a.groupNumber - b.groupNumber;
      });

    const top3Leaderboard: StageTop3LeaderboardItem[] = scoredGroups.slice(0, 3).map((item, idx) => ({
      rank: (idx + 1) as 1 | 2 | 3,
      groupNumber: item.groupNumber,
      groupName: item.groupName,
      score: item.score,
      note: item.note,
      hasSubmitted: item.hasSubmitted,
      submittedAt: item.submittedAt,
    }));

    const submissionsCount = subByGroup.size;
    const isAllGroupsSubmitted = submissionsCount >= STAGE_OFFICIAL_GROUPS.length;
    const isManuallyCompleted = completedSet.has(st);
    const hasScores = scoredGroups.length > 0;
    const isSessionFinished = isManuallyCompleted || isAllGroupsSubmitted;

    stages.push({
      stageNumber: st,
      title: `Stage ${st}`,
      submissionsCount,
      maxGroups: STAGE_OFFICIAL_GROUPS.length,
      submittedGroups: Array.from(subByGroup.values()).map((s) => ({
        groupNumber: s.groupNumber,
        groupName: s.groupName,
        submittedAt: s.submittedAt,
      })),
      isAllGroupsSubmitted,
      isManuallyCompleted,
      isSessionFinished,
      hasScores,
      top3Leaderboard,
      allGroupScores,
    });
  }

  // Cumulative scores: each stage score adds to the group's total score across stages
  const rawStandings = STAGE_OFFICIAL_GROUPS.map((grp) => {
    const stageScores: Record<number, number> = {};
    let totalScore = 0;
    let scoredStagesCount = 0;

    for (const sc of input.scores) {
      if (sc.groupNumber === grp.number && Number.isFinite(sc.score)) {
        stageScores[sc.stageNumber] = sc.score;
        totalScore += sc.score;
        scoredStagesCount += 1;
      }
    }

    return {
      groupNumber: grp.number,
      groupName: grp.name,
      totalScore: Math.round(totalScore * 100) / 100,
      stageScores,
      scoredStagesCount,
    };
  }).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.scoredStagesCount !== a.scoredStagesCount) return b.scoredStagesCount - a.scoredStagesCount;
    return a.groupNumber - b.groupNumber;
  });

  const cumulativeStandings: CumulativeLeaderboardItem[] = rawStandings.map((item, idx) => ({
    rank: (idx + 1) as 1 | 2 | 3 | 4,
    ...item,
  }));

  const cumulativeTop3 = cumulativeStandings.slice(0, 3);

  // Per-sesi leaderboard standings (bukan akumulasi)
  const rawStageStandings = STAGE_OFFICIAL_GROUPS.map((grp) => {
    const sc = input.scores.find(
      (item) => item.stageNumber === leaderboardStageNumber && item.groupNumber === grp.number
    );
    const val = sc ? Math.round(sc.score * 100) / 100 : 0;
    return {
      groupNumber: grp.number,
      groupName: grp.name,
      totalScore: val,
      stageScores: sc ? { [leaderboardStageNumber]: val } : {},
      scoredStagesCount: sc ? 1 : 0,
    };
  }).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.scoredStagesCount !== a.scoredStagesCount) return b.scoredStagesCount - a.scoredStagesCount;
    return a.groupNumber - b.groupNumber;
  });

  const stageLeaderboardStandings: CumulativeLeaderboardItem[] = rawStageStandings.map(
    (item, idx) => ({
      rank: (idx + 1) as 1 | 2 | 3 | 4,
      ...item,
    })
  );
  const stageLeaderboardTop3 = stageLeaderboardStandings.slice(0, 3);

  const normalizedBestScores: Record<number, number> = {};
  for (const grp of STAGE_OFFICIAL_GROUPS) {
    const rawVal = input.bestGroupScores?.[grp.number];
    if (typeof rawVal === "number" && Number.isFinite(rawVal)) {
      normalizedBestScores[grp.number] = Math.round(rawVal * 100) / 100;
    }
  }

  const bestGroupStandings: CumulativeLeaderboardItem[] = STAGE_OFFICIAL_GROUPS.map((grp) => {
    const hasVal = typeof normalizedBestScores[grp.number] === "number";
    const val = hasVal ? normalizedBestScores[grp.number]! : 0;
    return {
      groupNumber: grp.number,
      groupName: grp.name,
      totalScore: val,
      stageScores: {},
      scoredStagesCount: hasVal ? 1 : 0,
    };
  })
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.groupNumber - b.groupNumber;
    })
    .map((item, idx) => ({
      rank: (idx + 1) as 1 | 2 | 3 | 4,
      ...item,
    }));

  const leaderboardMode: LeaderboardDisplayMode =
    input.leaderboardMode === "best_group" ? "best_group" : "session";

  return {
    isFormOpen: Boolean(input.isFormOpen),
    isLeaderboardRevealed: Boolean(input.isLeaderboardRevealed),
    leaderboardRevealId: input.leaderboardRevealId ?? 0,
    leaderboardMode,
    activeStageNumber,
    displayAnswersStageNumber,
    leaderboardStageNumber,
    completedStageNumbers: Array.from(completedSet).sort((a, b) => a - b),
    spreadsheetUrl: input.spreadsheetUrl ?? "",
    lastSpreadsheetSyncAt: input.lastSpreadsheetSyncAt ?? null,
    lastSpreadsheetSyncError: input.lastSpreadsheetSyncError ?? null,
    submissions: [...input.submissions],
    scores: [...input.scores],
    bestGroupScores: normalizedBestScores,
    stages,
    stageLeaderboardStandings,
    stageLeaderboardTop3,
    bestGroupStandings,
    cumulativeStandings,
    cumulativeTop3,
  };
}
