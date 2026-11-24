import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/server/admin-auth";
import {
  deleteServerAttendance,
  getServerAttendanceMetadata,
  resetAllServerAttendance,
} from "@/server/attendance-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAdminAuth(request: Request): boolean {
  return verifyAdminRequest(request);
}

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Sesi admin tidak valid." }, { status: 401 });
  }

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat data absensi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Sesi admin tidak valid." }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (body.all) {
      const records = await resetAllServerAttendance();
      return NextResponse.json({
        success: true,
        message: "Semua data absensi telah dikosongkan.",
        records,
        movements: [],
      });
    }

    if (body.nik) {
      const records = await deleteServerAttendance(String(body.nik).trim().toUpperCase());
      const meta = await getServerAttendanceMetadata();
      return NextResponse.json({
        success: true,
        message: `Absensi ${body.nik} telah dihapus.`,
        records,
        movements: meta.movements,
      });
    }

    return NextResponse.json({ error: "Parameter tidak lengkap." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus data absensi." }, { status: 500 });
  }
}
