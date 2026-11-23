import "server-only";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { QuizChannelId, QuizQuestion, QuizSubmissionRecord } from "@/domain/quiz";
import type { Participant } from "@/domain/registration";

export interface ActiveQuizServerSession {
  sessionId: string;
  quizKey?: QuizChannelId;
  participant: Participant;
  groupNumber: number;
  questions: QuizQuestion[];
  startedAt: number;
  deadlineAt: number;
}

export interface QuizSystemStatus {
  isOpen: boolean; // backward compat: pretest open status
  channels: Record<QuizChannelId, boolean>;
  updatedAt: string;
}

function createDefaultChannels(pretestOpen = false): Record<QuizChannelId, boolean> {
  return {
    pretest: pretestOpen,
    "quiz-1": false,
    "quiz-2": false,
    "quiz-3": false,
    "quiz-4": false,
  };
}

function normalizeQuizStatus(raw?: Partial<QuizSystemStatus> | null): QuizSystemStatus {
  const baseOpen = Boolean(raw?.isOpen);
  const rawChannels = raw?.channels;
  const channels: Record<QuizChannelId, boolean> = {
    pretest: typeof rawChannels?.pretest === "boolean" ? rawChannels.pretest : baseOpen,
    "quiz-1": Boolean(rawChannels?.["quiz-1"]),
    "quiz-2": Boolean(rawChannels?.["quiz-2"]),
    "quiz-3": Boolean(rawChannels?.["quiz-3"]),
    "quiz-4": Boolean(rawChannels?.["quiz-4"]),
  };
  return {
    isOpen: channels.pretest,
    channels,
    updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

interface PersistedQuizData {
  submissions: QuizSubmissionRecord[];
  status: QuizSystemStatus;
}

const QUIZ_DATA_FILE = join(process.cwd(), ".quiz-data.json");

function isTestRuntime(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    Boolean(process.env.NODE_TEST_CONTEXT) ||
    process.execArgv.some((arg) => arg.includes("--test")) ||
    process.argv.some((arg) => arg.includes("--test"))
  );
}

function readDiskQuizData(): Partial<PersistedQuizData> | null {
  if (isTestRuntime()) return null;
  try {
    if (!existsSync(QUIZ_DATA_FILE)) return null;
    const raw = readFileSync(QUIZ_DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<PersistedQuizData>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeDiskQuizData(submissions: QuizSubmissionRecord[], status: QuizSystemStatus): void {
  if (isTestRuntime()) return;
  try {
    writeFileSync(
      QUIZ_DATA_FILE,
      JSON.stringify({ submissions, status }, null, 2),
      "utf8"
    );
  } catch {
    // Abaikan jika filesystem read-only (misalnya di Vercel Serverless)
  }
}

// Global in-memory storage to survive across API requests in server runtime
const globalStore = globalThis as unknown as {
  __sai_bumi_quiz_sessions?: Map<string, ActiveQuizServerSession>;
  __sai_bumi_quiz_submissions?: QuizSubmissionRecord[];
  __sai_bumi_quiz_status?: QuizSystemStatus;
};

if (!globalStore.__sai_bumi_quiz_sessions) {
  globalStore.__sai_bumi_quiz_sessions = new Map();
}

const diskData =
  !globalStore.__sai_bumi_quiz_status || !globalStore.__sai_bumi_quiz_submissions
    ? readDiskQuizData()
    : null;

if (!globalStore.__sai_bumi_quiz_status) {
  // Quiz is closed by default, opened by admin
  globalStore.__sai_bumi_quiz_status = normalizeQuizStatus(diskData?.status);
}

if (!globalStore.__sai_bumi_quiz_submissions) {
  // Initial empty quiz submissions list (clean database without fake demo records)
  globalStore.__sai_bumi_quiz_submissions = Array.isArray(diskData?.submissions)
    ? diskData.submissions.map((s) => ({ ...s, quizKey: s.quizKey || "pretest" }))
    : [];
}

function persistLocalState() {
  writeDiskQuizData(
    globalStore.__sai_bumi_quiz_submissions ?? [],
    normalizeQuizStatus(globalStore.__sai_bumi_quiz_status)
  );
}

export function saveServerQuizSession(session: ActiveQuizServerSession) {
  globalStore.__sai_bumi_quiz_sessions!.set(session.sessionId, session);
}

export function getServerQuizSession(sessionId: string): ActiveQuizServerSession | undefined {
  return globalStore.__sai_bumi_quiz_sessions!.get(sessionId);
}

export function removeServerQuizSession(sessionId: string) {
  globalStore.__sai_bumi_quiz_sessions!.delete(sessionId);
}

export function recordLocalQuizSubmission(record: QuizSubmissionRecord) {
  const normalized: QuizSubmissionRecord = {
    ...record,
    quizKey: record.quizKey || "pretest",
  };
  const existing = globalStore.__sai_bumi_quiz_submissions!.findIndex(
    (s) =>
      s.participantId === normalized.participantId &&
      (s.quizKey || "pretest") === normalized.quizKey
  );
  if (existing !== -1) {
    globalStore.__sai_bumi_quiz_submissions![existing] = normalized;
  } else {
    globalStore.__sai_bumi_quiz_submissions!.unshift(normalized);
  }
  persistLocalState();
}

export function replaceLocalQuizSubmissions(records: QuizSubmissionRecord[]) {
  globalStore.__sai_bumi_quiz_submissions = records.map((r) => ({
    ...r,
    quizKey: r.quizKey || "pretest",
  }));
  persistLocalState();
}

export function getLocalQuizSubmissions(): QuizSubmissionRecord[] {
  return [...(globalStore.__sai_bumi_quiz_submissions || [])]
    .map((s) => ({ ...s, quizKey: s.quizKey || "pretest" }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      if (a.timeSpentSeconds !== b.timeSpentSeconds) {
        return a.timeSpentSeconds - b.timeSpentSeconds;
      }
      return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
    });
}

export function deleteLocalQuizSubmission(submissionIdOrParticipantId: string): QuizSubmissionRecord[] {
  if (!globalStore.__sai_bumi_quiz_submissions) {
    globalStore.__sai_bumi_quiz_submissions = [];
    persistLocalState();
    return [];
  }
  globalStore.__sai_bumi_quiz_submissions = globalStore.__sai_bumi_quiz_submissions.filter(
    (s) => s.id !== submissionIdOrParticipantId && s.participantId !== submissionIdOrParticipantId
  );
  persistLocalState();
  return getLocalQuizSubmissions();
}

export function resetAllLocalQuizSubmissions(quizKey?: QuizChannelId): QuizSubmissionRecord[] {
  if (quizKey) {
    globalStore.__sai_bumi_quiz_submissions = (
      globalStore.__sai_bumi_quiz_submissions || []
    ).filter((s) => (s.quizKey || "pretest") !== quizKey);
    persistLocalState();
    return getLocalQuizSubmissions();
  }
  globalStore.__sai_bumi_quiz_submissions = [];
  persistLocalState();
  return [];
}

export function getQuizStatus(): QuizSystemStatus {
  globalStore.__sai_bumi_quiz_status = normalizeQuizStatus(globalStore.__sai_bumi_quiz_status);
  return {
    ...globalStore.__sai_bumi_quiz_status,
    channels: { ...globalStore.__sai_bumi_quiz_status.channels },
  };
}

export function syncLocalQuizStatus(status: Partial<QuizSystemStatus>): QuizSystemStatus {
  const prev = normalizeQuizStatus(globalStore.__sai_bumi_quiz_status);
  const merged: QuizSystemStatus = {
    isOpen: typeof status.isOpen === "boolean" ? status.isOpen : prev.isOpen,
    channels: {
      ...prev.channels,
      ...(status.channels || {}),
      pretest:
        typeof status.channels?.pretest === "boolean"
          ? status.channels.pretest
          : typeof status.isOpen === "boolean"
          ? status.isOpen
          : prev.channels.pretest,
    },
    updatedAt: status.updatedAt || new Date().toISOString(),
  };
  merged.isOpen = merged.channels.pretest;
  globalStore.__sai_bumi_quiz_status = merged;
  persistLocalState();
  return { ...merged, channels: { ...merged.channels } };
}

export function setQuizStatus(isOpen: boolean, channel: QuizChannelId = "pretest"): QuizSystemStatus {
  const prev = normalizeQuizStatus(globalStore.__sai_bumi_quiz_status);
  const nextChannels: Record<QuizChannelId, boolean> = {
    ...prev.channels,
  };

  // Untuk Quiz 1 - 4: hanya boleh 1 quiz yang aktif dalam satu waktu
  if (isOpen && channel !== "pretest") {
    nextChannels["quiz-1"] = false;
    nextChannels["quiz-2"] = false;
    nextChannels["quiz-3"] = false;
    nextChannels["quiz-4"] = false;
  }

  nextChannels[channel] = Boolean(isOpen);

  const updated: QuizSystemStatus = {
    isOpen: nextChannels.pretest,
    channels: nextChannels,
    updatedAt: new Date().toISOString(),
  };
  globalStore.__sai_bumi_quiz_status = updated;
  persistLocalState();
  return { ...updated, channels: { ...updated.channels } };
}

