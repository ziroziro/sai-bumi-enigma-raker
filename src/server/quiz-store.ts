import "server-only";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { QuizQuestion, QuizSubmissionRecord } from "@/domain/quiz";
import type { Participant } from "@/domain/registration";

export interface ActiveQuizServerSession {
  sessionId: string;
  participant: Participant;
  groupNumber: number;
  questions: QuizQuestion[];
  startedAt: number;
  deadlineAt: number;
}

export interface QuizSystemStatus {
  isOpen: boolean;
  updatedAt: string;
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
  globalStore.__sai_bumi_quiz_status = diskData?.status ?? {
    isOpen: false,
    updatedAt: new Date().toISOString(),
  };
}

if (!globalStore.__sai_bumi_quiz_submissions) {
  // Initial empty quiz submissions list (clean database without fake demo records)
  globalStore.__sai_bumi_quiz_submissions = Array.isArray(diskData?.submissions)
    ? diskData.submissions
    : [];
}

function persistLocalState() {
  writeDiskQuizData(
    globalStore.__sai_bumi_quiz_submissions ?? [],
    globalStore.__sai_bumi_quiz_status ?? {
      isOpen: false,
      updatedAt: new Date().toISOString(),
    }
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
  const existing = globalStore.__sai_bumi_quiz_submissions!.findIndex(
    (s) => s.participantId === record.participantId
  );
  if (existing !== -1) {
    globalStore.__sai_bumi_quiz_submissions![existing] = record;
  } else {
    globalStore.__sai_bumi_quiz_submissions!.unshift(record);
  }
  persistLocalState();
}

export function replaceLocalQuizSubmissions(records: QuizSubmissionRecord[]) {
  globalStore.__sai_bumi_quiz_submissions = [...records];
  persistLocalState();
}

export function getLocalQuizSubmissions(): QuizSubmissionRecord[] {
  return [...(globalStore.__sai_bumi_quiz_submissions || [])];
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
  return [...globalStore.__sai_bumi_quiz_submissions];
}

export function resetAllLocalQuizSubmissions(): QuizSubmissionRecord[] {
  globalStore.__sai_bumi_quiz_submissions = [];
  persistLocalState();
  return [];
}

export function getQuizStatus(): QuizSystemStatus {
  if (!globalStore.__sai_bumi_quiz_status) {
    globalStore.__sai_bumi_quiz_status = {
      isOpen: false,
      updatedAt: new Date().toISOString(),
    };
  }
  return { ...globalStore.__sai_bumi_quiz_status };
}

export function syncLocalQuizStatus(status: QuizSystemStatus): QuizSystemStatus {
  globalStore.__sai_bumi_quiz_status = { ...status };
  persistLocalState();
  return { ...globalStore.__sai_bumi_quiz_status };
}

export function setQuizStatus(isOpen: boolean): QuizSystemStatus {
  const updated: QuizSystemStatus = {
    isOpen,
    updatedAt: new Date().toISOString(),
  };
  globalStore.__sai_bumi_quiz_status = updated;
  persistLocalState();
  return updated;
}

