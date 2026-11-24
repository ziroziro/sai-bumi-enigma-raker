import type { QuizChannelId } from "@/domain/quiz";
import { getQuizSubmissionsList } from "@/server/quiz-service";
import { getQuizStatus } from "@/server/quiz-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CachedQuizStatusPayload {
  payload: Record<string, unknown>;
  expiresAt: number;
}

const CACHE_TTL_MS = 8_000;

const globalCache = globalThis as unknown as {
  __sai_bumi_quiz_status_cache?: CachedQuizStatusPayload;
  __sai_bumi_quiz_status_inflight?: Promise<Record<string, unknown>>;
};

async function buildFreshQuizStatusPayload(): Promise<Record<string, unknown>> {
  const submissions = await getQuizSubmissionsList();
  const status = getQuizStatus();

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

  return {
    ...status,
    completedByChannel,
  };
}

export async function GET() {
  try {
    const now = Date.now();
    if (
      globalCache.__sai_bumi_quiz_status_cache &&
      globalCache.__sai_bumi_quiz_status_cache.expiresAt > now
    ) {
      return Response.json(globalCache.__sai_bumi_quiz_status_cache.payload, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    if (!globalCache.__sai_bumi_quiz_status_inflight) {
      globalCache.__sai_bumi_quiz_status_inflight = buildFreshQuizStatusPayload()
        .then((payload) => {
          globalCache.__sai_bumi_quiz_status_cache = {
            payload,
            expiresAt: Date.now() + CACHE_TTL_MS,
          };
          return payload;
        })
        .finally(() => {
          globalCache.__sai_bumi_quiz_status_inflight = undefined;
        });
    }

    const payload = await globalCache.__sai_bumi_quiz_status_inflight;
    return Response.json(payload, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch {
    const fallbackStatus = getQuizStatus();
    return Response.json({
      ...fallbackStatus,
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
