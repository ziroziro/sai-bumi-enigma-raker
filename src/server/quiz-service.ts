import "server-only";
import { getGroupTitle } from "@/config/event";
import {
  calculateQuizScore,
  type QuizChannelId,
  type QuizQuestion,
  type QuizSubmissionRecord,
} from "@/domain/quiz";
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
  quizKey?: QuizChannelId;
  participant: Participant;
  groupNumber: number;
  questions: QuizQuestion[];
  answers: Record<string, string>;
  timeSpentSeconds: number;
}

interface PersistedMissionBackup {
  channels?: Partial<Record<QuizChannelId, boolean>>;
  submissions?: QuizSubmissionRecord[];
  updatedAt?: string;
}

async function hydrateMissionBackupFromSupabase(): Promise<void> {
  if (process.env.APP_DATA_MODE === "demo") return;
  try {
    const { client, config } = createBackendClient();
    const stateKey = `${config.eventSlug}::mission_state`;
    const { data, error } = await client
      .from("attendance_sync_state")
      .select("deleted_niks")
      .eq("event_slug", stateKey)
      .maybeSingle();
    if (error || !data || !Array.isArray(data.deleted_niks) || !data.deleted_niks[0]) return;
    const parsed = JSON.parse(data.deleted_niks[0]) as PersistedMissionBackup;
    if (!parsed || typeof parsed !== "object") return;

    if (parsed.channels && typeof parsed.channels === "object") {
      syncLocalQuizStatus({
        channels: {
          pretest: Boolean(parsed.channels.pretest),
          "quiz-1": Boolean(parsed.channels["quiz-1"]),
          "quiz-2": Boolean(parsed.channels["quiz-2"]),
          "quiz-3": Boolean(parsed.channels["quiz-3"]),
          "quiz-4": Boolean(parsed.channels["quiz-4"]),
        },
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      });
    }
    if (Array.isArray(parsed.submissions)) {
      for (const sub of parsed.submissions) {
        if (sub && sub.participantId && sub.id) {
          recordLocalQuizSubmission(sub);
        }
      }
    }
  } catch {
    // Graceful fallback
  }
}

async function persistMissionBackupToSupabase(): Promise<void> {
  if (process.env.APP_DATA_MODE === "demo") return;
  try {
    const { client, config } = createBackendClient();
    const stateKey = `${config.eventSlug}::mission_state`;
    const status = getQuizStatus();
    const payload: PersistedMissionBackup = {
      channels: status.channels,
      submissions: getLocalQuizSubmissions(),
      updatedAt: new Date().toISOString(),
    };
    await client.from("attendance_sync_state").upsert(
      {
        event_slug: stateKey,
        deleted_niks: [JSON.stringify(payload)],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_slug" }
    );
  } catch {
    // Graceful fallback
  }
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

  await persistMissionBackupToSupabase();
  return getQuizSubmissionsList();
}

export async function resetAllQuizSubmissions(
  quizKey?: QuizChannelId
): Promise<QuizSubmissionRecord[]> {
  await hydrateMissionBackupFromSupabase();
  const remaining = resetAllLocalQuizSubmissions(quizKey);

  if (process.env.APP_DATA_MODE !== "demo" && !quizKey) {
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

  await persistMissionBackupToSupabase();
  return remaining;
}

export async function getQuizSystemStatus(): Promise<QuizSystemStatus> {
  await hydrateMissionBackupFromSupabase();
  return getQuizStatus();
}

export async function setQuizSystemStatus(
  isOpen: boolean,
  channel: QuizChannelId = "pretest"
): Promise<QuizSystemStatus> {
  await hydrateMissionBackupFromSupabase();
  const localUpdated = setQuizStatus(isOpen, channel);
  await persistMissionBackupToSupabase();
  return localUpdated;
}

export async function submitQuizSubmission(payload: SubmitQuizPayload): Promise<QuizSubmissionRecord> {
  const { quizKey = "pretest", participant, groupNumber, questions, answers, timeSpentSeconds } =
    payload;

  let correctCount = 0;
  questions.forEach((q) => {
    if (answers[q.id] === q.correctOptionId) {
      correctCount += 1;
    }
  });

  const totalQuestions = questions.length;
  const score = calculateQuizScore(correctCount, totalQuestions);
  const completedAt = new Date().toISOString();

  const record: QuizSubmissionRecord = {
    id: crypto.randomUUID(),
    quizKey,
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

  // Always hydrate latest mission state, record locally, and persist to Supabase
  await hydrateMissionBackupFromSupabase();
  recordLocalQuizSubmission(record);

  // If Supabase backend is configured and not in demo mode (also sync pretest to quiz_submissions RPC)
  if (process.env.APP_DATA_MODE !== "demo" && quizKey === "pretest") {
    try {
      const { client, config } = createBackendClient();
      await client.rpc("submit_quiz_submission", {
        p_event_slug: config.eventSlug,
        p_participant_id: participant.id,
        p_group_number: groupNumber,
        p_score: Math.round(score),
        p_total_questions: totalQuestions,
        p_correct_count: correctCount,
        p_wrong_count: totalQuestions - correctCount,
        p_time_spent_seconds: Math.round(timeSpentSeconds),
        p_answers: answers,
      });
    } catch {
      // Graceful fallback to Supabase mission_state backup below
    }
  }

  await persistMissionBackupToSupabase();
  return record;
}

export async function getQuizSubmissionsList(): Promise<QuizSubmissionRecord[]> {
  // If in demo mode, return local store directly
  if (process.env.APP_DATA_MODE === "demo") {
    return getLocalQuizSubmissions();
  }

  await hydrateMissionBackupFromSupabase();

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
        score: calculateQuizScore(s.correctCount, s.totalQuestions),
        groupName: getGroupTitle(s.groupNumber),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.timeSpentSeconds !== b.timeSpentSeconds) return a.timeSpentSeconds - b.timeSpentSeconds;
        return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
      });

    replaceLocalQuizSubmissions(normalized);
    return getLocalQuizSubmissions();
  } catch {
    return getLocalQuizSubmissions();
  }
}

