import "server-only";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildStageEssaySnapshot,
  getStageGroupName,
  normalizeGoogleSpreadsheetCsvUrl,
  parseStageScoresSpreadsheetCsv,
  TOTAL_STAGE_COUNT,
  type StageEssayStateSnapshot,
  type StageEssaySubmission,
  type StageScoreEntry,
} from "@/domain/stage-essay";

interface PersistedStageEssayData {
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
}

const STAGE_ESSAY_DATA_FILE = join(process.cwd(), ".stage-essay-data.json");

function isTestRuntime(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    Boolean(process.env.NODE_TEST_CONTEXT) ||
    process.execArgv.some((arg) => arg.includes("--test")) ||
    process.argv.some((arg) => arg.includes("--test"))
  );
}

function readDiskStageEssayData(): Partial<PersistedStageEssayData> | null {
  if (isTestRuntime()) return null;
  try {
    if (!existsSync(STAGE_ESSAY_DATA_FILE)) return null;
    const raw = readFileSync(STAGE_ESSAY_DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<PersistedStageEssayData>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeDiskStageEssayData(data: PersistedStageEssayData): void {
  if (isTestRuntime()) return;
  try {
    writeFileSync(STAGE_ESSAY_DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Ignore read-only filesystem on serverless
  }
}

const globalStore = globalThis as unknown as {
  __sai_bumi_stage_essay_state?: PersistedStageEssayData;
};

if (!globalStore.__sai_bumi_stage_essay_state) {
  const disk = readDiskStageEssayData();
  globalStore.__sai_bumi_stage_essay_state = {
    isFormOpen: typeof disk?.isFormOpen === "boolean" ? disk.isFormOpen : false,
    isLeaderboardRevealed:
      typeof disk?.isLeaderboardRevealed === "boolean" ? disk.isLeaderboardRevealed : false,
    leaderboardRevealId:
      typeof disk?.leaderboardRevealId === "number" ? disk.leaderboardRevealId : 0,
    activeStageNumber:
      typeof disk?.activeStageNumber === "number" &&
      disk.activeStageNumber >= 1 &&
      disk.activeStageNumber <= TOTAL_STAGE_COUNT
        ? disk.activeStageNumber
        : 1,
    completedStageNumbers: Array.isArray(disk?.completedStageNumbers)
      ? disk.completedStageNumbers
      : [],
    spreadsheetUrl:
      typeof disk?.spreadsheetUrl === "string"
        ? disk.spreadsheetUrl
        : process.env.STAGE_SPREADSHEET_URL || "",
    lastSpreadsheetSyncAt: disk?.lastSpreadsheetSyncAt ?? null,
    lastSpreadsheetSyncError: disk?.lastSpreadsheetSyncError ?? null,
    submissions: Array.isArray(disk?.submissions) ? disk.submissions : [],
    scores: Array.isArray(disk?.scores) ? disk.scores : [],
  };
}

function getState(): PersistedStageEssayData {
  return globalStore.__sai_bumi_stage_essay_state!;
}

function persist() {
  writeDiskStageEssayData(getState());
}

export class StageEssayError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function getStageEssaySnapshot(): StageEssayStateSnapshot {
  return buildStageEssaySnapshot(getState());
}

export function submitGroupStageEssay(input: {
  stageNumber?: number;
  groupNumber: number;
  detail: string;
}): { submission: StageEssaySubmission; snapshot: StageEssayStateSnapshot } {
  const state = getState();
  if (!state.isFormOpen) {
    throw new StageEssayError(
      "FORM_CLOSED",
      "Form pengumpulan saat ini sedang ditutup oleh Admin. Silakan tunggu hingga Admin membuka sesi.",
      403
    );
  }

  const stageNumber = state.activeStageNumber;
  const { groupNumber, detail } = input;

  if (groupNumber < 1 || groupNumber > 4) {
    throw new StageEssayError("INVALID_GROUP", "Pilihan kelompok tidak valid.", 400);
  }

  const alreadySubmitted = state.submissions.find(
    (s) => s.stageNumber === stageNumber && s.groupNumber === groupNumber
  );
  if (alreadySubmitted) {
    throw new StageEssayError(
      "GROUP_ALREADY_SUBMITTED",
      `${getStageGroupName(groupNumber)} sudah mengirimkan jawaban pada sesi saat ini. Satu kelompok hanya dapat mengirim 1 kali per sesi.`,
      409
    );
  }

  const submission: StageEssaySubmission = {
    id: crypto.randomUUID(),
    stageNumber,
    groupNumber,
    groupName: getStageGroupName(groupNumber),
    detail: detail.trim(),
    submittedAt: new Date().toISOString(),
  };

  state.submissions.push(submission);

  const countInStage = state.submissions.filter((s) => s.stageNumber === stageNumber).length;
  if (countInStage >= 4 && !state.completedStageNumbers.includes(stageNumber)) {
    state.completedStageNumbers.push(stageNumber);
  }

  persist();
  return {
    submission,
    snapshot: getStageEssaySnapshot(),
  };
}

export function setFormOpenStatus(isOpen: boolean): StageEssayStateSnapshot {
  const state = getState();
  state.isFormOpen = Boolean(isOpen);
  persist();
  return getStageEssaySnapshot();
}

export function setLeaderboardRevealedStatus(revealed: boolean): StageEssayStateSnapshot {
  const state = getState();
  state.isLeaderboardRevealed = Boolean(revealed);
  if (revealed) {
    state.leaderboardRevealId = (state.leaderboardRevealId || 0) + 1;
  }
  persist();
  return getStageEssaySnapshot();
}

export function setActiveStageNumber(stageNumber: number): StageEssayStateSnapshot {
  if (stageNumber < 1 || stageNumber > TOTAL_STAGE_COUNT) {
    throw new StageEssayError("INVALID_STAGE", "Sesi harus antara 1 sampai 10.", 400);
  }
  const state = getState();
  state.activeStageNumber = stageNumber;
  persist();
  return getStageEssaySnapshot();
}

export function setStageCompletedStatus(
  stageNumber: number,
  completed: boolean
): StageEssayStateSnapshot {
  const state = getState();
  if (completed) {
    if (!state.completedStageNumbers.includes(stageNumber)) {
      state.completedStageNumbers.push(stageNumber);
    }
  } else {
    state.completedStageNumbers = state.completedStageNumbers.filter((n) => n !== stageNumber);
  }
  persist();
  return getStageEssaySnapshot();
}

export function upsertStageScores(newScores: StageScoreEntry[]): StageEssayStateSnapshot {
  const state = getState();
  const byKey = new Map<string, StageScoreEntry>();
  for (const existing of state.scores) {
    byKey.set(`${existing.stageNumber}-${existing.groupNumber}`, existing);
  }
  for (const item of newScores) {
    if (
      item.stageNumber >= 1 &&
      item.stageNumber <= TOTAL_STAGE_COUNT &&
      item.groupNumber >= 1 &&
      item.groupNumber <= 4 &&
      Number.isFinite(item.score)
    ) {
      byKey.set(`${item.stageNumber}-${item.groupNumber}`, {
        stageNumber: item.stageNumber,
        groupNumber: item.groupNumber,
        groupName: getStageGroupName(item.groupNumber),
        score: item.score,
        note: item.note,
        updatedAt: item.updatedAt || new Date().toISOString(),
      });
    }
  }
  state.scores = Array.from(byKey.values());
  persist();
  return getStageEssaySnapshot();
}

export function importStageScoresFromCsvText(csvText: string): StageEssayStateSnapshot {
  const parsed = parseStageScoresSpreadsheetCsv(csvText);
  if (parsed.length === 0) {
    throw new StageEssayError(
      "EMPTY_CSV_SCORES",
      "Format data spreadsheet tidak dikenali atau belum memiliki angka nilai. Pastikan kolom berisi Stage (1-10) dan nama keempat kelompok.",
      400
    );
  }
  const state = getState();
  state.lastSpreadsheetSyncAt = new Date().toISOString();
  state.lastSpreadsheetSyncError = null;
  return upsertStageScores(parsed);
}

export async function syncStageScoresFromGoogleSpreadsheet(
  customUrl?: string
): Promise<StageEssayStateSnapshot> {
  const state = getState();
  if (typeof customUrl === "string") {
    state.spreadsheetUrl = customUrl.trim();
  }

  const targetUrl = state.spreadsheetUrl.trim();
  if (!targetUrl) {
    throw new StageEssayError(
      "MISSING_SPREADSHEET_URL",
      "Silakan masukkan link Google Spreadsheet penilaian terlebih dahulu.",
      400
    );
  }

  const csvExportUrl = normalizeGoogleSpreadsheetCsvUrl(targetUrl);

  try {
    const response = await fetch(csvExportUrl, {
      cache: "no-store",
      headers: {
        Accept: "text/csv,text/plain,*/*",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Gagal membaca Google Spreadsheet (HTTP ${response.status}). Pastikan akses spreadsheet disetel ke "Anyone with the link can view" atau "Publish to web (CSV)".`
      );
    }

    const csvText = await response.text();
    if (csvText.trim().startsWith("<!DOCTYPE html") || csvText.trim().startsWith("<html")) {
      throw new Error(
        'Spreadsheet masih terkunci (Private). Ubah akses Share Google Sheets menjadi "Anyone with the link (Viewer)" atau klik File > Share > Publish to web (CSV).'
      );
    }

    const parsedScores = parseStageScoresSpreadsheetCsv(csvText);
    if (parsedScores.length === 0) {
      throw new Error(
        "Spreadsheet berhasil dibuka, namun belum ditemukan baris nilai untuk sesi 1-10 dan 4 kelompok."
      );
    }

    state.lastSpreadsheetSyncAt = new Date().toISOString();
    state.lastSpreadsheetSyncError = null;
    upsertStageScores(parsedScores);
    return getStageEssaySnapshot();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal melakukan sinkronisasi dengan Google Spreadsheet.";
    state.lastSpreadsheetSyncError = message;
    persist();
    throw new StageEssayError("SPREADSHEET_SYNC_FAILED", message, 400);
  }
}

export function deleteStageSubmission(id: string): StageEssayStateSnapshot {
  const state = getState();
  state.submissions = state.submissions.filter((s) => s.id !== id);
  persist();
  return getStageEssaySnapshot();
}

export function resetStageSubmissions(stageNumber?: number): StageEssayStateSnapshot {
  const state = getState();
  if (typeof stageNumber === "number") {
    state.submissions = state.submissions.filter((s) => s.stageNumber !== stageNumber);
    state.completedStageNumbers = state.completedStageNumbers.filter((n) => n !== stageNumber);
  } else {
    state.submissions = [];
    state.completedStageNumbers = [];
  }
  persist();
  return getStageEssaySnapshot();
}
