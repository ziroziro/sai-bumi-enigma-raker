import "server-only";
import fs from "node:fs";
import path from "node:path";
import { findMemberByBarcode } from "@/domain/attendance";
import { createBackendClient } from "./supabase";

export interface AttendanceState {
  records: Record<string, string>;
  lastResetAt: string | null;
  deletedNiks: string[];
}

const DATA_FILE_PATH = path.join(process.cwd(), ".attendance-data.json");

function isTestRuntime(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    Boolean(process.env.NODE_TEST_CONTEXT) ||
    process.execArgv.some((arg) => arg.includes("--test")) ||
    process.argv.some((arg) => arg.includes("--test"))
  );
}

function isSupabaseConfigured(): boolean {
  if (process.env.APP_DATA_MODE === "demo") return false;
  return Boolean(
    process.env.SUPABASE_URL &&
      (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) &&
      process.env.SUPABASE_EVENT_SLUG
  );
}

function readStateFromDisk(): AttendanceState {
  if (isTestRuntime()) {
    return { records: {}, lastResetAt: null, deletedNiks: [] };
  }
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const content = fs.readFileSync(DATA_FILE_PATH, "utf8");
      const parsed = JSON.parse(content);
      return {
        records: typeof parsed.records === "object" && parsed.records !== null ? parsed.records : {},
        lastResetAt: typeof parsed.lastResetAt === "string" ? parsed.lastResetAt : null,
        deletedNiks: Array.isArray(parsed.deletedNiks) ? parsed.deletedNiks : [],
      };
    }
  } catch {
    // fallback
  }
  return {
    records: {},
    lastResetAt: null,
    deletedNiks: [],
  };
}

function writeStateToDisk(state: AttendanceState): void {
  if (isTestRuntime()) return;
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // Ignore in read-only environments (e.g., Vercel Serverless)
  }
}

const globalAttendanceStore = globalThis as unknown as {
  __sai_bumi_attendance_state?: AttendanceState;
};

if (!globalAttendanceStore.__sai_bumi_attendance_state) {
  globalAttendanceStore.__sai_bumi_attendance_state = readStateFromDisk();
}

function getActiveState(): AttendanceState {
  if (!globalAttendanceStore.__sai_bumi_attendance_state) {
    globalAttendanceStore.__sai_bumi_attendance_state = readStateFromDisk();
  }
  return globalAttendanceStore.__sai_bumi_attendance_state;
}

function setActiveState(state: AttendanceState): AttendanceState {
  globalAttendanceStore.__sai_bumi_attendance_state = state;
  writeStateToDisk(state);
  return state;
}

async function fetchSyncStateFromSupabase(): Promise<{
  lastResetAt: string | null;
  deletedNiks: string[];
}> {
  const { client, config } = createBackendClient();
  const { data, error } = await client
    .from("attendance_sync_state")
    .select("last_reset_at, deleted_niks")
    .eq("event_slug", config.eventSlug)
    .maybeSingle();

  // If 000009 migration has not been applied yet, fall back cleanly to cached sync metadata
  if (error) {
    const cached = getActiveState();
    return {
      lastResetAt: cached.lastResetAt,
      deletedNiks: [...cached.deletedNiks],
    };
  }

  return {
    lastResetAt: typeof data?.last_reset_at === "string" ? data.last_reset_at : null,
    deletedNiks: Array.isArray(data?.deleted_niks)
      ? data.deleted_niks.map((v: unknown) => String(v).trim().toUpperCase()).filter(Boolean)
      : [],
  };
}

async function persistSyncStateToSupabase(
  lastResetAt: string | null,
  deletedNiks: string[]
): Promise<void> {
  const { client, config } = createBackendClient();
  await client.from("attendance_sync_state").upsert(
    {
      event_slug: config.eventSlug,
      last_reset_at: lastResetAt,
      deleted_niks: deletedNiks,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "event_slug" }
  );
}

export function getServerAttendanceRecords(): Record<string, string> {
  const state = getActiveState();
  return { ...state.records };
}

export async function getServerAttendanceMetadata(): Promise<AttendanceState> {
  if (isSupabaseConfigured()) {
    const { client, config } = createBackendClient();
    const [{ data, error }, syncMeta] = await Promise.all([
      client
        .from("attendance_records")
        .select("nik, attended_at")
        .eq("event_slug", config.eventSlug),
      fetchSyncStateFromSupabase(),
    ]);

    if (error) {
      throw new Error(`Gagal memuat data absensi dari Supabase: ${error.message}`);
    }

    const dbRecords: Record<string, string> = {};
    for (const row of data ?? []) {
      if (row.nik && row.attended_at) {
        dbRecords[String(row.nik).trim().toUpperCase()] = String(row.attended_at);
      }
    }

    const syncedState: AttendanceState = {
      records: dbRecords,
      lastResetAt: syncMeta.lastResetAt,
      deletedNiks: syncMeta.deletedNiks,
    };
    setActiveState(syncedState);
    return {
      records: { ...syncedState.records },
      lastResetAt: syncedState.lastResetAt,
      deletedNiks: [...syncedState.deletedNiks],
    };
  }

  const state = getActiveState();
  return {
    records: { ...state.records },
    lastResetAt: state.lastResetAt,
    deletedNiks: [...state.deletedNiks],
  };
}

export async function recordServerAttendance(
  nik: string,
  timestamp?: string
): Promise<Record<string, string>> {
  const cleanNik = nik.trim().toUpperCase();
  const isoStr = timestamp || new Date().toISOString();

  if (isSupabaseConfigured()) {
    const syncMeta = await fetchSyncStateFromSupabase();
    if (
      syncMeta.lastResetAt &&
      timestamp &&
      new Date(timestamp).getTime() < new Date(syncMeta.lastResetAt).getTime()
    ) {
      // Ignore stale offline/self-heal replay recorded before an admin reset
      const fresh = await getServerAttendanceMetadata();
      return fresh.records;
    }

    const { client, config } = createBackendClient();
    const member = findMemberByBarcode(cleanNik);
    const { error } = await client.from("attendance_records").upsert(
      {
        event_slug: config.eventSlug,
        nik: cleanNik,
        nama: member ? member.nama : cleanNik,
        barcode: member ? member.barcode : cleanNik,
        group_number: member ? member.groupNumber : null,
        attended_at: isoStr,
      },
      { onConflict: "event_slug,nik", ignoreDuplicates: true }
    );

    if (error) {
      throw new Error(`Gagal menyimpan absensi ke database: ${error.message}`);
    }

    if (syncMeta.deletedNiks.includes(cleanNik)) {
      const remainingDeleted = syncMeta.deletedNiks.filter((n) => n !== cleanNik);
      await persistSyncStateToSupabase(syncMeta.lastResetAt, remainingDeleted);
    }

    const fresh = await getServerAttendanceMetadata();
    return fresh.records;
  }

  const state = getActiveState();
  const nextState: AttendanceState = {
    records: {
      ...state.records,
      [cleanNik]: state.records[cleanNik] || isoStr,
    },
    lastResetAt: state.lastResetAt,
    deletedNiks: state.deletedNiks.filter((n) => n !== cleanNik),
  };
  setActiveState(nextState);
  return { ...nextState.records };
}

export async function deleteServerAttendance(nik: string): Promise<Record<string, string>> {
  const cleanNik = nik.trim().toUpperCase();

  if (isSupabaseConfigured()) {
    const { client, config } = createBackendClient();
    const { error } = await client
      .from("attendance_records")
      .delete()
      .eq("event_slug", config.eventSlug)
      .eq("nik", cleanNik);

    if (error) {
      throw new Error(`Gagal menghapus absensi dari database: ${error.message}`);
    }

    const syncMeta = await fetchSyncStateFromSupabase();
    const updatedDeleted = syncMeta.deletedNiks.includes(cleanNik)
      ? syncMeta.deletedNiks
      : [...syncMeta.deletedNiks, cleanNik];
    await persistSyncStateToSupabase(syncMeta.lastResetAt, updatedDeleted);

    const fresh = await getServerAttendanceMetadata();
    return fresh.records;
  }

  const state = getActiveState();
  const nextRecords = { ...state.records };
  delete nextRecords[cleanNik];
  const nextDeleted = state.deletedNiks.includes(cleanNik)
    ? state.deletedNiks
    : [...state.deletedNiks, cleanNik];

  setActiveState({
    records: nextRecords,
    lastResetAt: state.lastResetAt,
    deletedNiks: nextDeleted,
  });
  return nextRecords;
}

export async function resetAllServerAttendance(): Promise<Record<string, string>> {
  const resetIso = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const { client, config } = createBackendClient();
    const { error } = await client
      .from("attendance_records")
      .delete()
      .eq("event_slug", config.eventSlug);

    if (error) {
      throw new Error(`Gagal mengosongkan data absensi di database: ${error.message}`);
    }

    await persistSyncStateToSupabase(resetIso, []);
  }

  setActiveState({
    records: {},
    lastResetAt: resetIso,
    deletedNiks: [],
  });
  return {};
}
