import { isValidQuizChannelId } from "@/domain/quiz";
import { verifyAdminRequest } from "@/server/admin-auth";
import {
  deleteQuizSubmission,
  getQuizSubmissionsList,
  resetAllQuizSubmissions,
} from "@/server/quiz-service";
import { getQuizStatus } from "@/server/quiz-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAdminAuth(request: Request): boolean {
  return verifyAdminRequest(request);
}

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Sesi admin tidak valid atau telah berakhir." }, { status: 401 });
  }

  try {
    const submissions = await getQuizSubmissionsList();
    // getQuizSubmissionsList() sudah melakukan hydrateMissionBackupFromSupabase(), jadi status lokal sudah sinkron
    const quizStatus = getQuizStatus();
    return Response.json({ submissions, quizStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat rekap nilai kuis.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Sesi admin tidak valid atau telah berakhir." }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (body.all) {
      const targetChannel = isValidQuizChannelId(body.quizKey) ? body.quizKey : undefined;
      const submissions = await resetAllQuizSubmissions(targetChannel);
      return Response.json({
        success: true,
        message: targetChannel
          ? `Data nilai ${targetChannel.toUpperCase()} berhasil dikosongkan.`
          : "Semua data nilai kuis berhasil dikosongkan.",
        submissions,
      });
    }

    if (body.id || body.participantId) {
      const targetId = String(body.id || body.participantId).trim();
      const submissions = await deleteQuizSubmission(targetId);
      return Response.json({ success: true, message: "Data nilai kuis peserta berhasil dihapus.", submissions });
    }

    return Response.json({ error: "Parameter tidak lengkap." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus data kuis.";
    return Response.json({ error: message }, { status: 500 });
  }
}

