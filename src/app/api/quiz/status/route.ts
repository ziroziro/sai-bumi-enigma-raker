import type { QuizChannelId } from "@/domain/quiz";
import { getQuizSubmissionsList, getQuizSystemStatus } from "@/server/quiz-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [status, submissions] = await Promise.all([
      getQuizSystemStatus(),
      getQuizSubmissionsList(),
    ]);

    const completedByChannel: Record<QuizChannelId, string[]> = {
      pretest: [],
      "quiz-1": [],
      "quiz-2": [],
      "quiz-3": [],
      "quiz-4": [],
    };

    for (const sub of submissions) {
      const ch: QuizChannelId = sub.quizKey || "pretest";
      const bucket = completedByChannel[ch];
      if (!bucket) continue;
      if (sub.participantId && !bucket.includes(sub.participantId)) {
        bucket.push(sub.participantId);
      }
      if (sub.participantCode && !bucket.includes(sub.participantCode)) {
        bucket.push(sub.participantCode);
      }
    }

    return Response.json(
      {
        ...status,
        completedByChannel,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch {
    return Response.json({
      isOpen: false,
      updatedAt: new Date().toISOString(),
      completedByChannel: {
        pretest: [],
        "quiz-1": [],
        "quiz-2": [],
        "quiz-3": [],
        "quiz-4": [],
      },
    });
  }
}
