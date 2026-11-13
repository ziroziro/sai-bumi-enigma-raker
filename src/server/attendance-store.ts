import "server-only";
import fs from "node:fs";
import path from "node:path";
import { findMemberByBarcode } from "@/domain/attendance";

export interface AttendanceState {
  records: Record<string, string>;
  lastResetAt: string | null;
  deletedNiks: string[];
}

const DATA_FILE_PATH = path.join(process.cwd(), ".attendance-data.json");

function readStateFromDisk(): AttendanceState {
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
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // Ignore in read-only environments
  }
}

// Global in-memory storage to synchronize attendance across requests and persist across Fast Refresh
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

export function getServerAttendanceRecords(): Record<string, string> {
  const state = getActiveState();
  return { ...state.records };
}

export async function getServerAttendanceMetadata(): Promise<{
  records: Record<string, string>;
  lastResetAt: string | null;
  deletedNiks: string[];
}> {
  const state = getActiveState();

  // If Supabase is configured and not in demo mode, sync latest records from Supabase table
  if (process.env.APP_DATA_MODE !== "demo") {
    try {
      const { createBackendClient } = await import("./supabase");
      const { client, config } = createBackendClient();
      const { data, error } = await client
        .from("attendance_records")
        .select("nik, attended_at")
        .eq("event_slug", config.eventSlug);

      if (!error && data && Array.isArray(data)) {
        data.forEach((row: { nik: string; attended_at: string }) => {
          if (row.nik && row.attended_at && !state.deletedNiks.includes(row.nik)) {
            state.records[row.nik] = row.attended_at;
          }
        });
      }
    } catch {
      // Graceful fallback to local memory / disk
    }
  }

  return {
    records: { ...state.records },
    lastResetAt: state.lastResetAt,
    deletedNiks: [...state.deletedNiks],
  };
}

export async function recordServerAttendance(nik: string, timestamp?: string): Promise<Record<string, string>> {
  const state = getActiveState();
  const cleanNik = nik.trim().toUpperCase();
  const isoStr = timestamp || new Date().toISOString();
  state.records[cleanNik] = state.records[cleanNik] || isoStr;
  state.deletedNiks = state.deletedNiks.filter((n) => n !== cleanNik);
  globalAttendanceStore.__sai_bumi_attendance_state = state;
  writeStateToDisk(state);

  // If in Supabase mode, persist directly to PostgreSQL database
  if (process.env.APP_DATA_MODE !== "demo") {
    try {
      const { createBackendClient } = await import("./supabase");
      const { client, config } = createBackendClient();
      const member = findMemberByBarcode(cleanNik);
      await client
        .from("attendance_records")
        .upsert(
          {
            event_slug: config.eventSlug,
            nik: cleanNik,
            nama: member ? member.nama : cleanNik,
            barcode: member ? member.barcode : cleanNik,
            group_number: member ? member.groupNumber : null,
            attended_at: isoStr,
          },
          { onConflict: "event_slug,nik" }
        );
    } catch {
      // Graceful fallback to memory/disk
    }
  }

  return { ...state.records };
}

export async function deleteServerAttendance(nik: string): Promise<Record<string, string>> {
  const state = getActiveState();
  const cleanNik = nik.trim().toUpperCase();
  delete state.records[cleanNik];
  if (!state.deletedNiks.includes(cleanNik)) {
    state.deletedNiks.push(cleanNik);
  }
  globalAttendanceStore.__sai_bumi_attendance_state = state;
  writeStateToDisk(state);

  if (process.env.APP_DATA_MODE !== "demo") {
    try {
      const { createBackendClient } = await import("./supabase");
      const { client, config } = createBackendClient();
      await client
        .from("attendance_records")
        .delete()
        .eq("event_slug", config.eventSlug)
        .eq("nik", cleanNik);
    } catch {
      // Graceful fallback
    }
  }

  return { ...state.records };
}

export async function resetAllServerAttendance(): Promise<Record<string, string>> {
  const state: AttendanceState = {
    records: {},
    lastResetAt: new Date().toISOString(),
    deletedNiks: [],
  };
  globalAttendanceStore.__sai_bumi_attendance_state = state;
  writeStateToDisk(state);

  if (process.env.APP_DATA_MODE !== "demo") {
    try {
      const { createBackendClient } = await import("./supabase");
      const { client, config } = createBackendClient();
      await client
        .from("attendance_records")
        .delete()
        .eq("event_slug", config.eventSlug);
    } catch {
      // Graceful fallback if database schema is local
    }
  }

  return {};
}
