import { getStageGroupName, type StageScoreEntry } from "@/domain/stage-essay";
import {
  deleteStageSubmission,
  getStageEssaySnapshot,
  importStageScoresFromCsvText,
  resetStageSubmissions,
  saveBestGroupScores,
  setActiveStageNumber,
  setDisplayAnswersStageNumber,
  setFormOpenStatus,
  setLeaderboardDisplayMode,
  setLeaderboardRevealedStatus,
  setLeaderboardStageNumber,
  setStageCompletedStatus,
  StageEssayError,
  syncStageScoresFromGoogleSpreadsheet,
  upsertStageScores,
} from "@/server/stage-essay-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAdminAuth(request: Request): boolean {
  const cookie = request.headers.get("cookie") || "";
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  const envPass = (process.env.ADMIN_PASSWORD || "").trim();
  const validTokens = [
    "P@ssw0rd#adminEnigma2026",
    "adminenigma2026",
    envPass,
  ].filter(Boolean);

  return (
    cookie.includes("admin_session=authenticated") ||
    validTokens.some((vt) => token === vt || token.toLowerCase() === vt.toLowerCase())
  );
}

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Sesi admin tidak valid." }, { status: 401 });
  }

  return Response.json(getStageEssaySnapshot(), {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Sesi admin tidak valid." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "set_form_open") {
      const isOpen = Boolean(body?.isOpen);
      const snapshot = setFormOpenStatus(isOpen);
      return Response.json({
        success: true,
        message: isOpen
          ? `Halaman Form Input berhasil DIBUKA untuk Sesi ${snapshot.activeStageNumber}.`
          : "Halaman Form Input berhasil DIKUNCI.",
        snapshot,
      });
    }

    if (action === "set_leaderboard_revealed") {
      const revealed = Boolean(body?.revealed);
      const snapshot = setLeaderboardRevealedStatus(revealed);
      return Response.json({
        success: true,
        message: revealed
          ? "Leaderboard Top 3 resmi DI-REVEAL ke halaman peserta!"
          : "Tampilan Leaderboard ditutup kembali.",
        snapshot,
      });
    }

    if (action === "set_active_stage") {
      const stageNumber = Number(body?.stageNumber);
      const snapshot = setActiveStageNumber(stageNumber);
      return Response.json({
        success: true,
        message: `Sesi aktif untuk penyimpanan form disetel ke Sesi ${stageNumber}.`,
        snapshot,
      });
    }

    if (action === "set_display_answers_stage") {
      const stageNumber = Number(body?.stageNumber);
      const snapshot = setDisplayAnswersStageNumber(stageNumber);
      return Response.json({
        success: true,
        message: `Halaman Jawaban Kelompok kini menampilkan Sesi ${stageNumber}.`,
        snapshot,
      });
    }

    if (action === "set_leaderboard_mode") {
      const mode = body?.mode === "best_group" ? "best_group" : "session";
      const snapshot = setLeaderboardDisplayMode(mode);
      return Response.json({
        success: true,
        message:
          mode === "best_group"
            ? "Halaman Leaderboard kini menampilkan mode BEST KELOMPOK (Total Average)."
            : `Halaman Leaderboard kini menampilkan mode Sesi (Sesi ${snapshot.leaderboardStageNumber}).`,
        snapshot,
      });
    }

    if (action === "set_leaderboard_stage") {
      const stageNumber = Number(body?.stageNumber);
      const snapshot = setLeaderboardStageNumber(stageNumber);
      return Response.json({
        success: true,
        message: `Halaman Leaderboard disetel ke Sesi ${stageNumber}.`,
        snapshot,
      });
    }

    if (action === "save_best_group_scores") {
      const raw = body?.scores && typeof body.scores === "object" ? body.scores : {};
      const parsed: Record<number, number> = {};
      for (const grpNum of [1, 2, 3, 4]) {
        const val = Number((raw as Record<string, unknown>)[String(grpNum)]);
        if (Number.isFinite(val)) {
          parsed[grpNum] = val;
        }
      }
      const snapshot = saveBestGroupScores(parsed);
      return Response.json({
        success: true,
        message: "Nilai Total Average Best Kelompok berhasil disimpan.",
        snapshot,
      });
    }

    if (action === "set_stage_completed") {
      const stageNumber = Number(body?.stageNumber);
      const completed = Boolean(body?.completed);
      const snapshot = setStageCompletedStatus(stageNumber, completed);
      return Response.json({
        success: true,
        message: completed
          ? `Sesi ${stageNumber} ditandai selesai.`
          : `Sesi ${stageNumber} dibuka kembali.`,
        snapshot,
      });
    }

    if (action === "sync_spreadsheet") {
      const spreadsheetUrl = typeof body?.spreadsheetUrl === "string" ? body.spreadsheetUrl : undefined;
      const snapshot = await syncStageScoresFromGoogleSpreadsheet(spreadsheetUrl);
      return Response.json({
        success: true,
        message: "Nilai dari Google Spreadsheet berhasil di-generate & diperbarui.",
        snapshot,
      });
    }

    if (action === "import_csv") {
      const csvText = String(body?.csvText || "");
      const snapshot = importStageScoresFromCsvText(csvText);
      return Response.json({
        success: true,
        message: "Data nilai CSV/Spreadsheet berhasil diimpor.",
        snapshot,
      });
    }

    if (action === "save_scores") {
      const rawScores = Array.isArray(body?.scores) ? body.scores : [];
      const nowIso = new Date().toISOString();
      const entries: StageScoreEntry[] = rawScores
        .map((item: { stageNumber?: unknown; groupNumber?: unknown; score?: unknown; note?: unknown }) => {
          const st = Number(item?.stageNumber);
          const grp = Number(item?.groupNumber);
          const sc = Number(item?.score);
          if (!Number.isInteger(st) || !Number.isInteger(grp) || !Number.isFinite(sc)) {
            return null;
          }
          return {
            stageNumber: st,
            groupNumber: grp,
            groupName: getStageGroupName(grp),
            score: sc,
            note: typeof item?.note === "string" ? item.note : undefined,
            updatedAt: nowIso,
          };
        })
        .filter((x: StageScoreEntry | null): x is StageScoreEntry => x !== null);

      const snapshot = upsertStageScores(entries);
      return Response.json({
        success: true,
        message: "Penilaian sesi berhasil disimpan dan diakumulasikan ke Leaderboard.",
        snapshot,
      });
    }

    return Response.json({ error: "Aksi tidak dikenali." }, { status: 400 });
  } catch (error) {
    if (error instanceof StageEssayError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Gagal memproses aksi.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Sesi admin tidak valid." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    if (body?.all) {
      const snapshot = resetStageSubmissions();
      return Response.json({
        success: true,
        message: "Seluruh respon dari Sesi 1-10 berhasil direset.",
        snapshot,
      });
    }

    if (typeof body?.stageNumber === "number") {
      const snapshot = resetStageSubmissions(body.stageNumber);
      return Response.json({
        success: true,
        message: `Respon pada Sesi ${body.stageNumber} berhasil direset.`,
        snapshot,
      });
    }

    if (typeof body?.id === "string") {
      const snapshot = deleteStageSubmission(body.id);
      return Response.json({
        success: true,
        message: "Respon kelompok berhasil dihapus.",
        snapshot,
      });
    }

    return Response.json({ error: "Parameter penghapusan tidak valid." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus data.";
    return Response.json({ error: message }, { status: 500 });
  }
}
