import { isValidQuizChannelId, type QuizChannelId } from "@/domain/quiz";
import { verifyAdminRequest } from "@/server/admin-auth";
import { getQuizSystemStatus, setQuizSystemStatus } from "@/server/quiz-service";

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
    const status = await getQuizSystemStatus();
    return Response.json({ success: true, status });
  } catch {
    return Response.json({ error: "Gagal mengambil status kuis." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Sesi admin tidak valid atau telah berakhir." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const isOpen = Boolean(body.isOpen);
    const channel: QuizChannelId = isValidQuizChannelId(body.channel) ? body.channel : "pretest";
    const updated = await setQuizSystemStatus(isOpen, channel);
    return Response.json({ success: true, status: updated });
  } catch {
    return Response.json({ error: "Gagal memperbarui status kuis." }, { status: 500 });
  }
}

