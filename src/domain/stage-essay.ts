import { z } from "zod";

export const TOTAL_STAGE_COUNT = 10;

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

export interface StageEssayStateSnapshot {
  isFormOpen: boolean;
  isLeaderboardRevealed: boolean;
  leaderboardRevealId: number;
  activeStageNumber: number;
  completedStageNumbers: number[];
  spreadsheetUrl: string;
  lastSpreadsheetSyncAt: string | null;
  lastSpreadsheetSyncError: string | null;
  submissions: StageEssaySubmission[];
  scores: StageScoreEntry[];
  stages: StageSessionSummary[];
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

export function parseStageScoresSpreadsheetCsv(csvText: string): StageScoreEntry[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];

  const header = rows[0]!.map((h) => h.trim());
  const nowIso = new Date().toISOString();
  const entryMap = new Map<string, StageScoreEntry>();

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

  let stageColIdx = header.findIndex((h) => /stage|sesi|babak|pos/i.test(h));
  let groupColIdx = header.findIndex((h) => /kelompok|team|tim|group|nama/i.test(h));
  let scoreColIdx = header.findIndex((h) => /nilai|score|poin|skor|point/i.test(h));
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
  activeStageNumber?: number;
  completedStageNumbers?: number[];
  spreadsheetUrl?: string;
  lastSpreadsheetSyncAt?: string | null;
  lastSpreadsheetSyncError?: string | null;
  submissions: StageEssaySubmission[];
  scores: StageScoreEntry[];
}): StageEssayStateSnapshot {
  const activeStageNumber =
    input.activeStageNumber &&
    input.activeStageNumber >= 1 &&
    input.activeStageNumber <= TOTAL_STAGE_COUNT
      ? input.activeStageNumber
      : 1;

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

  return {
    isFormOpen: Boolean(input.isFormOpen),
    isLeaderboardRevealed: Boolean(input.isLeaderboardRevealed),
    leaderboardRevealId: input.leaderboardRevealId ?? 0,
    activeStageNumber,
    completedStageNumbers: Array.from(completedSet).sort((a, b) => a - b),
    spreadsheetUrl: input.spreadsheetUrl ?? "",
    lastSpreadsheetSyncAt: input.lastSpreadsheetSyncAt ?? null,
    lastSpreadsheetSyncError: input.lastSpreadsheetSyncError ?? null,
    submissions: [...input.submissions],
    scores: [...input.scores],
    stages,
    cumulativeStandings,
    cumulativeTop3,
  };
}
