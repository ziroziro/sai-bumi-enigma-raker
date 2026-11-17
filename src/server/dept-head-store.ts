import "server-only";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildDeptHeadSnapshot,
  DEFAULT_DEPT_HEAD_CARDS,
  mergeDeptHeadCards,
  type DeptHeadCard,
  type DeptHeadSelectionRecord,
  type DeptHeadStateSnapshot,
} from "@/domain/dept-head";

interface PersistedDeptHeadData {
  isPageUnlocked?: boolean;
  cards: DeptHeadCard[];
  selections: DeptHeadSelectionRecord[];
}

const DEPT_HEAD_DATA_FILE = join(process.cwd(), ".dept-head-data.json");

function isTestRuntime(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    Boolean(process.env.NODE_TEST_CONTEXT) ||
    process.execArgv.some((arg) => arg.includes("--test")) ||
    process.argv.some((arg) => arg.includes("--test"))
  );
}

function readDiskDeptHeadData(): Partial<PersistedDeptHeadData> | null {
  if (isTestRuntime()) return null;
  try {
    if (!existsSync(DEPT_HEAD_DATA_FILE)) return null;
    const raw = readFileSync(DEPT_HEAD_DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<PersistedDeptHeadData>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeDiskDeptHeadData(
  cards: DeptHeadCard[],
  selections: DeptHeadSelectionRecord[],
  isPageUnlocked: boolean
): void {
  if (isTestRuntime()) return;
  try {
    writeFileSync(
      DEPT_HEAD_DATA_FILE,
      JSON.stringify({ isPageUnlocked, cards, selections }, null, 2),
      "utf8"
    );
  } catch {
    // Abaikan jika filesystem read-only (misalnya di Vercel Serverless)
  }
}

const globalStore = globalThis as unknown as {
  __sai_bumi_dept_head_unlocked?: boolean;
  __sai_bumi_dept_head_cards?: DeptHeadCard[];
  __sai_bumi_dept_head_selections?: DeptHeadSelectionRecord[];
};

const diskData =
  !globalStore.__sai_bumi_dept_head_cards ||
  !globalStore.__sai_bumi_dept_head_selections ||
  typeof globalStore.__sai_bumi_dept_head_unlocked !== "boolean"
    ? readDiskDeptHeadData()
    : null;

if (typeof globalStore.__sai_bumi_dept_head_unlocked !== "boolean") {
  globalStore.__sai_bumi_dept_head_unlocked =
    typeof diskData?.isPageUnlocked === "boolean" ? diskData.isPageUnlocked : false;
}

if (!globalStore.__sai_bumi_dept_head_cards) {
  globalStore.__sai_bumi_dept_head_cards = Array.isArray(diskData?.cards)
    ? mergeDeptHeadCards(diskData.cards)
    : mergeDeptHeadCards(DEFAULT_DEPT_HEAD_CARDS);
}

if (!globalStore.__sai_bumi_dept_head_selections) {
  globalStore.__sai_bumi_dept_head_selections = Array.isArray(diskData?.selections)
    ? diskData.selections
    : [];
}

function persistLocalState() {
  writeDiskDeptHeadData(
    globalStore.__sai_bumi_dept_head_cards ?? DEFAULT_DEPT_HEAD_CARDS,
    globalStore.__sai_bumi_dept_head_selections ?? [],
    Boolean(globalStore.__sai_bumi_dept_head_unlocked)
  );
}

export function getLocalDeptHeadSnapshot(): DeptHeadStateSnapshot {
  return buildDeptHeadSnapshot(
    globalStore.__sai_bumi_dept_head_cards ?? DEFAULT_DEPT_HEAD_CARDS,
    globalStore.__sai_bumi_dept_head_selections ?? [],
    Boolean(globalStore.__sai_bumi_dept_head_unlocked)
  );
}

export function setLocalDeptHeadPageUnlocked(isPageUnlocked: boolean): DeptHeadStateSnapshot {
  globalStore.__sai_bumi_dept_head_unlocked = Boolean(isPageUnlocked);
  persistLocalState();
  return getLocalDeptHeadSnapshot();
}

export function getLocalDeptHeadPageUnlocked(): boolean {
  return Boolean(globalStore.__sai_bumi_dept_head_unlocked);
}

export function replaceLocalDeptHeadState(
  cards: Partial<DeptHeadCard>[],
  selections: DeptHeadSelectionRecord[]
): DeptHeadStateSnapshot {
  globalStore.__sai_bumi_dept_head_cards = mergeDeptHeadCards(cards);
  globalStore.__sai_bumi_dept_head_selections = [...selections];
  persistLocalState();
  return getLocalDeptHeadSnapshot();
}

export function saveLocalDeptHeadSelection(record: DeptHeadSelectionRecord): DeptHeadStateSnapshot {
  const existing = (globalStore.__sai_bumi_dept_head_selections ?? []).filter(
    (s) => s.groupNumber !== record.groupNumber
  );
  existing.push(record);
  globalStore.__sai_bumi_dept_head_selections = existing.sort(
    (a, b) => a.selectionOrder - b.selectionOrder
  );
  persistLocalState();
  return getLocalDeptHeadSnapshot();
}

export function upsertLocalDeptHeadCard(card: DeptHeadCard): DeptHeadStateSnapshot {
  const merged = mergeDeptHeadCards(globalStore.__sai_bumi_dept_head_cards).map((item) =>
    item.id === card.id ? { ...card } : item
  );
  globalStore.__sai_bumi_dept_head_cards = merged;
  persistLocalState();
  return getLocalDeptHeadSnapshot();
}

export function deleteLocalDeptHeadSelection(groupNumber: number): DeptHeadStateSnapshot {
  const remaining = (globalStore.__sai_bumi_dept_head_selections ?? [])
    .filter((s) => s.groupNumber !== groupNumber)
    .sort((a, b) => a.selectionOrder - b.selectionOrder)
    .map((s, idx) => ({
      ...s,
      selectionOrder: idx + 1,
    }));
  globalStore.__sai_bumi_dept_head_selections = remaining;
  persistLocalState();
  return getLocalDeptHeadSnapshot();
}

export function resetAllLocalDeptHeadSelections(): DeptHeadStateSnapshot {
  globalStore.__sai_bumi_dept_head_selections = [];
  persistLocalState();
  return getLocalDeptHeadSnapshot();
}
