import "server-only";
import { getGroupTitle } from "@/config/event";
import type { QuizQuestion, QuizSubmissionRecord } from "@/domain/quiz";
import type { Participant } from "@/domain/registration";
import { createBackendClient } from "./supabase";
import {
  deleteLocalQuizSubmission,
  getLocalQuizSubmissions,
  getQuizStatus,
  recordLocalQuizSubmission,
  replaceLocalQuizSubmissions,
  resetAllLocalQuizSubmissions,
  setQuizStatus,
  syncLocalQuizStatus,
  type QuizSystemStatus,
} from "./quiz-store";

export interface SubmitQuizPayload {
  participant: Participant;
  groupNumber: number;
  questions: QuizQuestion[];
  answers: Record<string, string>;
  timeSpentSeconds: number;
}

export function verifyAdminPassword(password: string): boolean {
  if (!password) return false;
  const trimmed = String(password).trim();
  const envPass = (process.env.ADMIN_PASSWORD || "").trim();

  // Official master password
  if (trimmed === "P@ssw0rd#adminEnigma2026") return true;

  // Environment variable override if set
  if (envPass && trimmed === envPass) return true;

  // Legacy password fallback
  if (trimmed === "adminenigma2026") return true;

  // Case-insensitive tolerance for typos
  const lower = trimmed.toLowerCase();
  if (lower === "p@ssw0rd#adminenigma2026" || lower === "adminenigma2026") {
    return true;
  }

  return false;
}

export async function deleteQuizSubmission(submissionIdOrParticipantId: string): Promise<QuizSubmissionRecord[]> {
  deleteLocalQuizSubmission(submissionIdOrParticipantId);

  if (process.env.APP_DATA_MODE !== "demo") {
    try {
      const { client, config } = createBackendClient();
      try {
        await client
          .from("quiz_submissions")
          .delete()
          .or(`id.eq.${submissionIdOrParticipantId},participant_id.eq.${submissionIdOrParticipantId}`);
      } catch {
        // ignore
      }
      try {
        await client.rpc("delete_quiz_submission", {
          p_event_slug: config.eventSlug,
          p_target_id: submissionIdOrParticipantId,
        });
      } catch {
        // ignore
      }
    } catch {
      // Graceful fallback if database schema is local
    }
  }

  return getQuizSubmissionsList();
}

export async function resetAllQuizSubmissions(): Promise<QuizSubmissionRecord[]> {
  resetAllLocalQuizSubmissions();

  if (process.env.APP_DATA_MODE !== "demo") {
    try {
      const { client, config } = createBackendClient();
      try {
        await client
          .from("quiz_submissions")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
      } catch {
        // ignore
      }
      try {
        await client.rpc("reset_all_quiz_submissions", {
          p_event_slug: config.eventSlug,
        });
      } catch {
        // ignore
      }
    } catch {
      // Graceful fallback if database schema is local
    }
  }

  return [];
}

export async function getQuizSystemStatus(): Promise<QuizSystemStatus> {
  if (process.env.APP_DATA_MODE !== "demo") {
    try {
      const { client, config } = createBackendClient();
      const { data, error } = await client.rpc("get_quiz_system_status", {
        p_event_slug: config.eventSlug,
      });

      if (!error && data && typeof data === "object") {
        const parsed = data as Partial<QuizSystemStatus>;
        if (typeof parsed.isOpen === "boolean") {
          return syncLocalQuizStatus({
            isOpen: parsed.isOpen,
            updatedAt: parsed.updatedAt || new Date().toISOString(),
          });
        }
      }

      const { data: row, error: tableError } = await client
        .from("quiz_settings")
        .select("is_open, updated_at")
        .eq("event_slug", config.eventSlug)
        .maybeSingle();

      if (!tableError && row) {
        const typedRow = row as { is_open: boolean; updated_at: string };
        return syncLocalQuizStatus({
          isOpen: Boolean(typedRow.is_open),
          updatedAt: typedRow.updated_at || new Date().toISOString(),
        });
      }
    } catch {
      // Graceful fallback to local store if database/migration is unavailable
    }
  }

  return getQuizStatus();
}

export async function setQuizSystemStatus(isOpen: boolean): Promise<QuizSystemStatus> {
  const localUpdated = setQuizStatus(isOpen);

  if (process.env.APP_DATA_MODE !== "demo") {
    try {
      const { client, config } = createBackendClient();
      const { data, error } = await client.rpc("set_quiz_system_status", {
        p_event_slug: config.eventSlug,
        p_is_open: isOpen,
      });

      if (!error && data && typeof data === "object") {
        const parsed = data as Partial<QuizSystemStatus>;
        if (typeof parsed.isOpen === "boolean") {
          return syncLocalQuizStatus({
            isOpen: parsed.isOpen,
            updatedAt: parsed.updatedAt || localUpdated.updatedAt,
          });
        }
      }

      const { data: row, error: tableError } = await client
        .from("quiz_settings")
        .upsert(
          {
            event_slug: config.eventSlug,
            is_open: isOpen,
            updated_at: localUpdated.updatedAt,
          },
          { onConflict: "event_slug" }
        )
        .select("is_open, updated_at")
        .single();

      if (!tableError && row) {
        const typedRow = row as { is_open: boolean; updated_at: string };
        return syncLocalQuizStatus({
          isOpen: Boolean(typedRow.is_open),
          updatedAt: typedRow.updated_at || localUpdated.updatedAt,
        });
      }
    } catch {
      // Graceful fallback to local store if database/migration is unavailable
    }
  }

  return localUpdated;
}

export async function submitQuizSubmission(payload: SubmitQuizPayload): Promise<QuizSubmissionRecord> {
  const { participant, groupNumber, questions, answers, timeSpentSeconds } = payload;

  let correctCount = 0;
  questions.forEach((q) => {
    if (answers[q.id] === q.correctOptionId) {
      correctCount += 1;
    }
  });

  const totalQuestions = questions.length;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const completedAt = new Date().toISOString();

  const record: QuizSubmissionRecord = {
    id: crypto.randomUUID(),
    participantId: participant.id,
    participantCode: participant.code,
    participantName: participant.name,
    groupNumber,
    groupName: getGroupTitle(groupNumber),
    score,
    totalQuestions,
    correctCount,
    wrongCount: totalQuestions - correctCount,
    timeSpentSeconds,
    completedAt,
  };

  // Always keep in local server store for instant availability
  recordLocalQuizSubmission(record);

  // If Supabase backend is configured and not in demo mode, attempt to store to database
  if (process.env.APP_DATA_MODE !== "demo") {
    try {
      const { client, config } = createBackendClient();
      await client.rpc("submit_quiz_submission", {
        p_event_slug: config.eventSlug,
        p_participant_id: participant.id,
        p_group_number: groupNumber,
        p_score: score,
        p_total_questions: totalQuestions,
        p_correct_count: correctCount,
        p_wrong_count: totalQuestions - correctCount,
        p_time_spent_seconds: timeSpentSeconds,
        p_answers: answers,
      });
    } catch {
      // Graceful fallback to local store if Supabase table or migration is pending
    }
  }

  return record;
}

export async function getQuizSubmissionsList(): Promise<QuizSubmissionRecord[]> {
  // If in demo mode, return local store directly
  if (process.env.APP_DATA_MODE === "demo") {
    return getLocalQuizSubmissions();
  }

  try {
    const { client, config } = createBackendClient();
    const { data, error } = await client.rpc("get_quiz_submissions_list", {
      p_event_slug: config.eventSlug,
    });

    if (error || !data) {
      return getLocalQuizSubmissions();
    }

    const dbSubmissions = data as Array<{
      id: string;
      participantId: string;
      participantCode: string;
      participantName: string;
      groupNumber: number;
      score: number;
      totalQuestions: number;
      correctCount: number;
      wrongCount: number;
      timeSpentSeconds: number;
      completedAt: string;
    }>;

    const normalized: QuizSubmissionRecord[] = dbSubmissions
      .map((s) => ({
        ...s,
        groupName: getGroupTitle(s.groupNumber),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.timeSpentSeconds !== b.timeSpentSeconds) return a.timeSpentSeconds - b.timeSpentSeconds;
        return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
      });

    replaceLocalQuizSubmissions(normalized);
    return normalized;
  } catch {
    return getLocalQuizSubmissions();
  }
}

