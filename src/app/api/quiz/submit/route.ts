import { isValidQuizChannelId, type QuizChannelId } from "@/domain/quiz";
import { submitQuizSubmission } from "@/server/quiz-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { participant, groupNumber, questions, answers, timeSpentSeconds, quizKey } = body;

    if (!participant?.id || !groupNumber || !Array.isArray(questions)) {
      return Response.json({ error: "Data pengiriman kuis tidak lengkap." }, { status: 400 });
    }

    const validQuizKey: QuizChannelId = isValidQuizChannelId(quizKey) ? quizKey : "pretest";

    const record = await submitQuizSubmission({
      quizKey: validQuizKey,
      participant,
      groupNumber: Number(groupNumber),
      questions,
      answers: answers || {},
      timeSpentSeconds: Number(timeSpentSeconds) || 0,
    });

    return Response.json({ success: true, record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan hasil kuis.";
    return Response.json({ error: message }, { status: 500 });
  }
}

