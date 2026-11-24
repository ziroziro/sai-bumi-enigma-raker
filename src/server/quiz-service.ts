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
    const prefix = `${config.eventSlug}::m`;
    const channelsKey = `${config.eventSlug}::mission_channels`;
    const legacyStateKey = `${config.eventSlug}::mission_state`;
    const subPrefix = `${config.eventSlug}::msub::`;

    // Satu query ringan membaca channel aktif + semua baris submission per-peserta (anti race-condition)
    const { data, error } = await client
      .from("attendance_sync_state")
      .select("event_slug, deleted_niks, updated_at")
      .like("event_slug", `${prefix}%`);

    if (error || !Array.isArray(data)) return;

    let channelsFromDedicated: Partial<Record<QuizChannelId, boolean>> | null = null;
    let channelsUpdatedAt: string | undefined;
    let channelsFromLegacy: Partial<Record<QuizChannelId, boolean>> | null = null;

    for (const row of data) {
      const slug = String(row.event_slug || "");
      const rawJson = Array.isArray(row.deleted_niks) ? row.deleted_niks[0] : null;
      if (!rawJson) continue;

      try {
        if (slug === channelsKey) {
          const parsed = JSON.parse(rawJson) as PersistedMissionBackup;
          if (parsed?.channels && typeof parsed.channels === "object") {
            channelsFromDedicated = parsed.channels;
            channelsUpdatedAt = parsed.updatedAt || row.updated_at || undefined;
          }
        } else if (slug === legacyStateKey) {
          const parsed = JSON.parse(rawJson) as PersistedMissionBackup;
          if (parsed?.channels && typeof parsed.channels === "object") {
            channelsFromLegacy = parsed.channels;
          }
          if (Array.isArray(parsed?.submissions)) {
            for (const sub of parsed.submissions) {
              if (sub && sub.participantId && sub.id) {
                recordLocalQuizSubmission(sub);
              }
            }
          }
        } else if (slug.startsWith(subPrefix)) {
          const sub = JSON.parse(rawJson) as QuizSubmissionRecord;
          if (sub && sub.participantId && sub.id) {
            recordLocalQuizSubmission(sub);
          }
        }
      } catch {
        // ignore malformed row
      }
    }

    const activeChannels = channelsFromDedicated ?? channelsFromLegacy;
    if (activeChannels) {
      syncLocalQuizStatus({
        channels: {
          pretest: Boolean(activeChannels.pretest),
          "quiz-1": Boolean(activeChannels["quiz-1"]),
          "quiz-2": Boolean(activeChannels["quiz-2"]),
          "quiz-3": Boolean(activeChannels["quiz-3"]),
          "quiz-4": Boolean(activeChannels["quiz-4"]),
        },
        updatedAt: channelsUpdatedAt || new Date().toISOString(),
      });
    }
  } catch {
    // Graceful fallback
  }
}

function invalidateQuizStatusCache(): void {
  const g = globalThis as unknown as {
    __sai_bumi_quiz_status_cache?: unknown;
  };
  g.__sai_bumi_quiz_status_cache = undefined;
}

async function persistSingleMissionSubmissionToSupabase(
  record: QuizSubmissionRecord
): Promise<void> {
  if (process.env.APP_DATA_MODE === "demo") return;
  const { client, config } = createBackendClient();
  const ch = record.quizKey || "pretest";
  const rowKey = `${config.eventSlug}::msub::${ch}::${record.participantId}`;
  const payload = {
    event_slug: rowKey,
    deleted_niks: [JSON.stringify(record)],
    updated_at: new Date().toISOString(),
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { error } = await client
        .from("attendance_sync_state")
        .upsert(payload, { onConflict: "event_slug" });
      if (!error) return;
      lastErr = error;
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr) {
    throw new Error(
      `Gagal menyimpan hasil mission ke database: ${
        lastErr instanceof Error ? lastErr.message : String((lastErr as { message?: string })?.message || lastErr)
      }`
    );
  }
}

async function persistMissionChannelsToSupabase(
  channels: Record<QuizChannelId, boolean>,
  updatedAt: string
): Promise<void> {
  if (process.env.APP_DATA_MODE === "demo") return;
  try {
    const { client, config } = createBackendClient();
    const channelsKey = `${config.eventSlug}::mission_channels`;
    await client.from("attendance_sync_state").upsert(
      {
        event_slug: channelsKey,
        deleted_niks: [JSON.stringify({ channels, updatedAt })],
        updated_at: updatedAt,
      },
      { onConflict: "event_slug" }
    );
  } catch {
    // Graceful fallback
  }
}

async function deleteMissionSubmissionsFromSupabase(options: {
  targetId?: string;
  quizKey?: QuizChannelId;
  all?: boolean;
}): Promise<void> {
  if (process.env.APP_DATA_MODE === "demo") return;
  try {
    const { client, config } = createBackendClient();
    if (options.all) {
      if (options.quizKey) {
        await client
          .from("attendance_sync_state")
          .delete()
          .like("event_slug", `${config.eventSlug}::msub::${options.quizKey}::%`);
      } else {
        await client
          .from("attendance_sync_state")
          .delete()
          .like("event_slug", `${config.eventSlug}::msub::%`);
      }
    } else if (options.targetId) {
      await client
        .from("attendance_sync_state")
        .delete()
        .like("event_slug", `${config.eventSlug}::msub::%::${options.targetId}`);
    }
  } catch {
    // Graceful fallback
  }
}

export { verifyAdminPassword } from "./admin-auth";

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

  await deleteMissionSubmissionsFromSupabase({ targetId: submissionIdOrParticipantId });
  invalidateQuizStatusCache();
  return getQuizSubmissionsList();
}

export async function resetAllQuizSubmissions(
  quizKey?: QuizChannelId
): Promise<QuizSubmissionRecord[]> {
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

  await deleteMissionSubmissionsFromSupabase({ all: true, quizKey });
  invalidateQuizStatusCache();
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
  const localUpdated = setQuizStatus(isOpen, channel);
  await persistMissionChannelsToSupabase(localUpdated.channels, localUpdated.updatedAt);
  invalidateQuizStatusCache();
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

  // Simpan ke baris individual per-peserta di Supabase (100% anti race-condition walau 36 orang submit bersamaan)
  recordLocalQuizSubmission(record);

  await Promise.all([
    persistSingleMissionSubmissionToSupabase(record),
    (async () => {
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
          // Graceful fallback — baris individual ::msub:: sudah tersimpan
        }
      }
    })(),
  ]);

  invalidateQuizStatusCache();
  return record;
}

export async function getQuizSubmissionsList(): Promise<QuizSubmissionRecord[]> {
  // If in demo mode, return local store directly
  if (process.env.APP_DATA_MODE === "demo") {
    return getLocalQuizSubmissions();
  }

  try {
    const { client, config } = createBackendClient();
    const [, rpcResult] = await Promise.all([
      hydrateMissionBackupFromSupabase(),
      client.rpc("get_quiz_submissions_list", {
        p_event_slug: config.eventSlug,
      }),
    ]);
    const { data, error } = rpcResult;

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

