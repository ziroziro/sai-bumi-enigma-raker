import { NextResponse } from "next/server";
import {
  getServerAttendanceMetadata,
  recordServerAttendance,
  recordServerRoomMovement,
  resetAllServerAttendance,
} from "@/server/attendance-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const meta = await getServerAttendanceMetadata();
    return NextResponse.json(
      {
        records: meta.records,
        movements: meta.movements,
        lastResetAt: meta.lastResetAt,
        deletedNiks: meta.deletedNiks,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch {
    return NextResponse.json({ error: "Gagal memuat data kehadiran." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.resetAll) {
      const records = await resetAllServerAttendance();
      return NextResponse.json({ success: true, records, movements: [] });
    }
    const { nik, timestamp, sessionType, reason } = body;
    if (!nik || typeof nik !== "string") {
      return NextResponse.json({ error: "NIK diperlukan." }, { status: 400 });
    }

    const cleanNik = nik.trim().toUpperCase();
    if (sessionType === "leave_room" || sessionType === "return_room") {
      const result = await recordServerRoomMovement(
        cleanNik,
        sessionType,
        typeof timestamp === "string" ? timestamp : undefined,
        typeof reason === "string" ? reason.trim() : undefined
      );
      return NextResponse.json({
        success: true,
        records: result.records,
        movements: result.movements,
      });
    }

    const records = await recordServerAttendance(cleanNik, timestamp);
    const meta = await getServerAttendanceMetadata();
    return NextResponse.json({ success: true, records, movements: meta.movements });
  } catch {
    return NextResponse.json({ error: "Gagal mencatat kehadiran." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const records = await resetAllServerAttendance();
    return NextResponse.json({
      success: true,
      message: "Semua data absensi telah dikosongkan.",
      records,
      movements: [],
    });
  } catch {
    return NextResponse.json({ error: "Gagal mengosongkan data absensi." }, { status: 500 });
  }
}
