import "server-only";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createBackendClient } from "./supabase";
import {
  buildStageEssaySnapshot,
  getStageGroupName,
  normalizeGoogleSpreadsheetCsvUrl,
  parseStageAndBestGroupSpreadsheetCsv,
  STATIC_STAGE_SPREADSHEET_URL,
  TOTAL_STAGE_COUNT,
  type LeaderboardDisplayMode,
  type StageEssayStateSnapshot,
  type StageEssaySubmission,
  type StageScoreEntry,
} from "@/domain/stage-essay";

interface PersistedStageEssayData {
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
  syncedRowStageMap: Record<string, number>;
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
    isFormOpen: true,
    isLeaderboardRevealed: true,
    leaderboardRevealId:
      typeof disk?.leaderboardRevealId === "number" ? disk.leaderboardRevealId : 0,
    leaderboardMode: disk?.leaderboardMode === "best_group" ? "best_group" : "session",
    activeStageNumber:
      typeof disk?.activeStageNumber === "number" &&
      disk.activeStageNumber >= 1 &&
      disk.activeStageNumber <= TOTAL_STAGE_COUNT
        ? disk.activeStageNumber
        : 1,
    displayAnswersStageNumber:
      typeof disk?.displayAnswersStageNumber === "number" &&
      disk.displayAnswersStageNumber >= 1 &&
      disk.displayAnswersStageNumber <= TOTAL_STAGE_COUNT
        ? disk.displayAnswersStageNumber
        : typeof disk?.activeStageNumber === "number" &&
          disk.activeStageNumber >= 1 &&
          disk.activeStageNumber <= TOTAL_STAGE_COUNT
        ? disk.activeStageNumber
        : 1,
    leaderboardStageNumber:
      typeof disk?.leaderboardStageNumber === "number" &&
      disk.leaderboardStageNumber >= 1 &&
      disk.leaderboardStageNumber <= TOTAL_STAGE_COUNT
        ? disk.leaderboardStageNumber
        : typeof disk?.activeStageNumber === "number" &&
          disk.activeStageNumber >= 1 &&
          disk.activeStageNumber <= TOTAL_STAGE_COUNT
        ? disk.activeStageNumber
        : 1,
    completedStageNumbers: Array.isArray(disk?.completedStageNumbers)
      ? disk.completedStageNumbers
      : [],
    spreadsheetUrl: STATIC_STAGE_SPREADSHEET_URL,
    lastSpreadsheetSyncAt: disk?.lastSpreadsheetSyncAt ?? null,
    lastSpreadsheetSyncError: disk?.lastSpreadsheetSyncError ?? null,
    submissions: Array.isArray(disk?.submissions) ? disk.submissions : [],
    scores: Array.isArray(disk?.scores) ? disk.scores : [],
    bestGroupScores:
      disk?.bestGroupScores && typeof disk.bestGroupScores === "object"
        ? disk.bestGroupScores
        : {},
    syncedRowStageMap:
      disk?.syncedRowStageMap && typeof disk.syncedRowStageMap === "object"
        ? disk.syncedRowStageMap
        : {},
  };
}

function getState(): PersistedStageEssayData {
  return globalStore.__sai_bumi_stage_essay_state!;
}

function persist() {
  writeDiskStageEssayData(getState());
}

const STAGE_HYDRATE_TTL_MS = 8_000;
const stageHydrateGlobal = globalThis as unknown as {
  __sai_bumi_stage_last_hydrated_at?: number;
  __sai_bumi_stage_hydrate_inflight?: Promise<void>;
};

/**
 * Sinkronisasi state Misi Investigasi (isFormOpen, submissions, scores, bestGroupScores, leaderboard)
 * dari Supabase agar seluruh instance Serverless Vercel selalu konsisten dan tidak pernah hilang/ketutup sendiri.
 * Menggunakan TTL cache 8 detik + deduplikasi agar beban koneksi Supabase tetap ringan.
 */
export async function hydrateStageEssayFromSupabase(force = false): Promise<void> {
  if (isTestRuntime() || process.env.APP_DATA_MODE === "demo") return;
  const now = Date.now();
  if (
    !force &&
    stageHydrateGlobal.__sai_bumi_stage_last_hydrated_at &&
    now - stageHydrateGlobal.__sai_bumi_stage_last_hydrated_at < STAGE_HYDRATE_TTL_MS
  ) {
    return;
  }
  if (stageHydrateGlobal.__sai_bumi_stage_hydrate_inflight) {
    return stageHydrateGlobal.__sai_bumi_stage_hydrate_inflight;
  }

  stageHydrateGlobal.__sai_bumi_stage_hydrate_inflight = (async () => {
  try {
    const { client, config } = createBackendClient();
    const stateKey = `${config.eventSlug}::stage_essay_state`;
    const subPrefix = `${config.eventSlug}::stage_sub::`;
    const { data, error } = await client
      .from("attendance_sync_state")
      .select("event_slug, deleted_niks")
      .like("event_slug", `${config.eventSlug}::stage_%`);
    stageHydrateGlobal.__sai_bumi_stage_last_hydrated_at = Date.now();
    if (error || !Array.isArray(data) || data.length === 0) {
      return;
    }

    const current = getState();
    const mergedByKey = new Map<string, StageEssaySubmission>();
    for (const existing of current.submissions) {
      mergedByKey.set(`${existing.stageNumber}-${existing.groupNumber}`, existing);
    }

    let hasAuthoritativeStateRow = false;
    const individualSubs: StageEssaySubmission[] = [];

    for (const row of data) {
      const slug = String(row.event_slug || "");
      const rawJson = Array.isArray(row.deleted_niks) ? row.deleted_niks[0] : null;
      if (!rawJson) continue;

      try {
        if (slug === stateKey) {
          const parsed = JSON.parse(rawJson) as Partial<PersistedStageEssayData>;
          if (!parsed || typeof parsed !== "object") continue;
          hasAuthoritativeStateRow = true;

          if (typeof parsed.isFormOpen === "boolean") current.isFormOpen = parsed.isFormOpen;
          if (typeof parsed.isLeaderboardRevealed === "boolean") {
            current.isLeaderboardRevealed = parsed.isLeaderboardRevealed;
          }
          if (typeof parsed.leaderboardRevealId === "number") {
            current.leaderboardRevealId = parsed.leaderboardRevealId;
          }
          if (parsed.leaderboardMode === "best_group" || parsed.leaderboardMode === "session") {
            current.leaderboardMode = parsed.leaderboardMode;
          }
          if (
            typeof parsed.activeStageNumber === "number" &&
            parsed.activeStageNumber >= 1 &&
            parsed.activeStageNumber <= TOTAL_STAGE_COUNT
          ) {
            current.activeStageNumber = parsed.activeStageNumber;
          }
          if (
            typeof parsed.displayAnswersStageNumber === "number" &&
            parsed.displayAnswersStageNumber >= 1 &&
            parsed.displayAnswersStageNumber <= TOTAL_STAGE_COUNT
          ) {
            current.displayAnswersStageNumber = parsed.displayAnswersStageNumber;
          }
          if (
            typeof parsed.leaderboardStageNumber === "number" &&
            parsed.leaderboardStageNumber >= 1 &&
            parsed.leaderboardStageNumber <= TOTAL_STAGE_COUNT
          ) {
            current.leaderboardStageNumber = parsed.leaderboardStageNumber;
          }
          if (Array.isArray(parsed.completedStageNumbers)) {
            current.completedStageNumbers = parsed.completedStageNumbers;
          }
          if (typeof parsed.lastSpreadsheetSyncAt === "string" || parsed.lastSpreadsheetSyncAt === null) {
            current.lastSpreadsheetSyncAt = parsed.lastSpreadsheetSyncAt;
          }
          if (
            typeof parsed.lastSpreadsheetSyncError === "string" ||
            parsed.lastSpreadsheetSyncError === null
          ) {
            current.lastSpreadsheetSyncError = parsed.lastSpreadsheetSyncError;
          }
          if (Array.isArray(parsed.submissions)) {
            mergedByKey.clear();
            for (const sub of parsed.submissions) {
              if (sub && sub.stageNumber && sub.groupNumber) {
                mergedByKey.set(`${sub.stageNumber}-${sub.groupNumber}`, sub);
              }
            }
          }
          if (Array.isArray(parsed.scores)) {
            current.scores = parsed.scores;
          }
          if (parsed.bestGroupScores && typeof parsed.bestGroupScores === "object") {
            current.bestGroupScores = parsed.bestGroupScores;
          }
          if (parsed.syncedRowStageMap && typeof parsed.syncedRowStageMap === "object") {
            current.syncedRowStageMap = parsed.syncedRowStageMap;
          }
        } else if (slug.startsWith(subPrefix)) {
          const sub = JSON.parse(rawJson) as StageEssaySubmission;
          if (sub && sub.stageNumber && sub.groupNumber) {
            individualSubs.push(sub);
          }
        }
      } catch {
        // ignore malformed row
      }
    }

    // Baris individual ::stage_sub:: selalu lebih baru / anti-race-condition
    for (const sub of individualSubs) {
      mergedByKey.set(`${sub.stageNumber}-${sub.groupNumber}`, sub);
    }

    if (hasAuthoritativeStateRow || individualSubs.length > 0) {
      current.submissions = Array.from(mergedByKey.values());
    }
  } catch {
    // Graceful fallback to local/memory state
  } finally {
    stageHydrateGlobal.__sai_bumi_stage_hydrate_inflight = undefined;
  }
  })();

  return stageHydrateGlobal.__sai_bumi_stage_hydrate_inflight;
}

export async function persistSingleStageSubmissionToSupabase(
  submission: StageEssaySubmission
): Promise<void> {
  if (isTestRuntime() || process.env.APP_DATA_MODE === "demo") return;
  const { client, config } = createBackendClient();
  const rowKey = `${config.eventSlug}::stage_sub::${submission.stageNumber}::${submission.groupNumber}`;
  const payload = {
    event_slug: rowKey,
    deleted_niks: [JSON.stringify(submission)],
    updated_at: new Date().toISOString(),
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { error } = await client
        .from("attendance_sync_state")
        .upsert(payload, { onConflict: "event_slug" });
      if (!error) {
        stageHydrateGlobal.__sai_bumi_stage_last_hydrated_at = Date.now();
        return;
      }
      lastErr = error;
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr) {
    throw new Error(
      `Gagal menyimpan jawaban kelompok ke database: ${
        lastErr instanceof Error ? lastErr.message : String((lastErr as { message?: string })?.message || lastErr)
      }`
    );
  }
}

export async function deleteStageSubmissionsFromSupabase(options: {
  stageNumber?: number;
  groupNumber?: number;
  all?: boolean;
}): Promise<void> {
  if (isTestRuntime() || process.env.APP_DATA_MODE === "demo") return;
  try {
    const { client, config } = createBackendClient();
    if (options.all) {
      await client
        .from("attendance_sync_state")
        .delete()
        .like("event_slug", `${config.eventSlug}::stage_sub::%`);
    } else if (typeof options.stageNumber === "number" && typeof options.groupNumber === "number") {
      await client
        .from("attendance_sync_state")
        .delete()
        .eq("event_slug", `${config.eventSlug}::stage_sub::${options.stageNumber}::${options.groupNumber}`);
    } else if (typeof options.stageNumber === "number") {
      await client
        .from("attendance_sync_state")
        .delete()
        .like("event_slug", `${config.eventSlug}::stage_sub::${options.stageNumber}::%`);
    }
  } catch {
    // ignore
  }
}

export async function persistStageEssayToSupabase(): Promise<void> {
  if (isTestRuntime() || process.env.APP_DATA_MODE === "demo") return;
  try {
    const { client, config } = createBackendClient();
    const stateKey = `${config.eventSlug}::stage_essay_state`;
    await client.from("attendance_sync_state").upsert(
      {
        event_slug: stateKey,
        deleted_niks: [JSON.stringify(getState())],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_slug" }
    );
    stageHydrateGlobal.__sai_bumi_stage_last_hydrated_at = Date.now();
  } catch {
    // Graceful fallback
  }
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

export function getStageEssaySnapshot(options?: {
  includePhotos?: boolean;
  photosOnlyForStage?: number;
}): StageEssayStateSnapshot {
  const state = getState();
  const includePhotos = options?.includePhotos !== false;
  const photosOnlyForStage = options?.photosOnlyForStage;

  if (includePhotos && typeof photosOnlyForStage !== "number") {
    return buildStageEssaySnapshot(state);
  }

  const lightSubmissions = state.submissions.map((sub) => {
    const keepPhoto =
      includePhotos &&
      typeof photosOnlyForStage === "number" &&
      sub.stageNumber === photosOnlyForStage;
    if (keepPhoto || !sub.photoDataUrl) return sub;
    return {
      ...sub,
      photoDataUrl: null,
    };
  });

  return buildStageEssaySnapshot({
    ...state,
    submissions: lightSubmissions,
  });
}

export function submitGroupStageEssay(input: {
  stageNumber?: number;
  groupNumber: number;
  submitterName?: string;
  detail: string;
  photoDataUrl?: string | null;
}): { submission: StageEssaySubmission; snapshot: StageEssayStateSnapshot } {
  const state = getState();

  const stageNumber = state.activeStageNumber;
  const { groupNumber, submitterName, detail, photoDataUrl } = input;

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
    submitterName: submitterName?.trim() || undefined,
    detail: detail.trim(),
    photoDataUrl: photoDataUrl && photoDataUrl.startsWith("data:image/") ? photoDataUrl : null,
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
  state.leaderboardStageNumber = stageNumber;
  persist();
  return getStageEssaySnapshot();
}

export function setLeaderboardStageNumber(stageNumber: number): StageEssayStateSnapshot {
  if (stageNumber < 1 || stageNumber > TOTAL_STAGE_COUNT) {
    throw new StageEssayError("INVALID_STAGE", "Sesi harus antara 1 sampai 10.", 400);
  }
  const state = getState();
  state.leaderboardStageNumber = stageNumber;
  state.leaderboardMode = "session";
  persist();
  return getStageEssaySnapshot();
}

export function setLeaderboardDisplayMode(
  mode: LeaderboardDisplayMode
): StageEssayStateSnapshot {
  const state = getState();
  state.leaderboardMode = mode === "best_group" ? "best_group" : "session";
  persist();
  return getStageEssaySnapshot();
}

export function saveBestGroupScores(
  scores: Record<number, number>
): StageEssayStateSnapshot {
  const state = getState();
  const next: Record<number, number> = { ...(state.bestGroupScores || {}) };
  for (const grpNum of [1, 2, 3, 4]) {
    const val = scores[grpNum];
    if (typeof val === "number" && Number.isFinite(val)) {
      next[grpNum] = Math.round(val * 100) / 100;
    }
  }
  state.bestGroupScores = next;
  persist();
  return getStageEssaySnapshot();
}

export function setDisplayAnswersStageNumber(stageNumber: number): StageEssayStateSnapshot {
  if (stageNumber < 1 || stageNumber > TOTAL_STAGE_COUNT) {
    throw new StageEssayError("INVALID_STAGE", "Sesi harus antara 1 sampai 10.", 400);
  }
  const state = getState();
  state.displayAnswersStageNumber = stageNumber;
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
  const state = getState();
  if (!state.syncedRowStageMap) state.syncedRowStageMap = {};
  const parsed = parseStageAndBestGroupSpreadsheetCsv(csvText, {
    activeStageNumber: state.activeStageNumber,
    rowStageMap: state.syncedRowStageMap,
  });
  if (parsed.scores.length === 0 && Object.keys(parsed.bestGroupScores).length === 0) {
    throw new StageEssayError(
      "EMPTY_CSV_SCORES",
      "Format data spreadsheet tidak dikenali atau belum memiliki angka nilai. Pastikan kolom berisi Stage (1-10) dan nama keempat kelompok.",
      400
    );
  }
  if (Object.keys(parsed.bestGroupScores).length > 0) {
    state.bestGroupScores = {
      ...(state.bestGroupScores || {}),
      ...parsed.bestGroupScores,
    };
  }
  state.lastSpreadsheetSyncAt = new Date().toISOString();
  state.lastSpreadsheetSyncError = null;
  if (parsed.scores.length > 0) {
    return upsertStageScores(parsed.scores);
  }
  persist();
  return getStageEssaySnapshot();
}

export async function syncStageScoresFromGoogleSpreadsheet(
  _customUrl?: string
): Promise<StageEssayStateSnapshot> {
  const state = getState();
  state.spreadsheetUrl = STATIC_STAGE_SPREADSHEET_URL;
  if (!state.syncedRowStageMap) state.syncedRowStageMap = {};
  const csvExportUrl = normalizeGoogleSpreadsheetCsvUrl(STATIC_STAGE_SPREADSHEET_URL);

  try {
    const response = await fetch(csvExportUrl, {
      cache: "no-store",
      headers: {
        Accept: "text/csv,text/plain,*/*",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Gagal membaca Google Spreadsheet (HTTP ${response.status}). Pastikan akses spreadsheet disetel ke "Anyone with the link can view".`
      );
    }

    const csvText = await response.text();
    if (csvText.trim().startsWith("<!DOCTYPE html") || csvText.trim().startsWith("<html")) {
      throw new Error(
        'Spreadsheet masih terkunci (Private). Ubah akses Share Google Sheets menjadi "Anyone with the link (Viewer)".'
      );
    }

    const parsed = parseStageAndBestGroupSpreadsheetCsv(csvText, {
      activeStageNumber: state.activeStageNumber,
      rowStageMap: state.syncedRowStageMap,
    });
    if (parsed.scores.length === 0 && Object.keys(parsed.bestGroupScores).length === 0) {
      throw new Error(
        "Spreadsheet berhasil dibuka, namun belum ditemukan baris penilaian yang valid."
      );
    }

    if (Object.keys(parsed.bestGroupScores).length > 0) {
      state.bestGroupScores = {
        ...(state.bestGroupScores || {}),
        ...parsed.bestGroupScores,
      };
    }

    state.lastSpreadsheetSyncAt = new Date().toISOString();
    state.lastSpreadsheetSyncError = null;
    if (parsed.scores.length > 0) {
      return upsertStageScores(parsed.scores);
    }
    persist();
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
