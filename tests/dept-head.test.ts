import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_DEPT_HEAD_CARDS,
  buildDeptHeadSnapshot,
  getRequiredDeptHeadCount,
  mergeDeptHeadCards,
  validateDeptHeadSelectionInput,
} from "../src/domain/dept-head";
import {
  deleteLocalDeptHeadSelection,
  getLocalDeptHeadSnapshot,
  replaceLocalDeptHeadState,
  resetAllLocalDeptHeadSelections,
  saveLocalDeptHeadSelection,
  upsertLocalDeptHeadCard,
} from "../src/server/dept-head-store";

test("DEFAULT_DEPT_HEAD_CARDS menyediakan tepat 9 kartu siluet unik", () => {
  assert.equal(DEFAULT_DEPT_HEAD_CARDS.length, 9);
  const ids = new Set(DEFAULT_DEPT_HEAD_CARDS.map((card) => card.id));
  assert.equal(ids.size, 9);
  for (const card of DEFAULT_DEPT_HEAD_CARDS) {
    assert.ok(card.title.trim().length > 0);
    assert.ok(card.description.trim().length > 0);
    assert.ok(card.roleHint.trim().length > 0);
  }
});

test("Aturan kuota: 3 kelompok pertama wajib 2 Dept Head, kelompok ke-4 hanya 1 Dept Head", () => {
  assert.equal(getRequiredDeptHeadCount(0), 2);
  assert.equal(getRequiredDeptHeadCount(1), 2);
  assert.equal(getRequiredDeptHeadCount(2), 2);
  assert.equal(getRequiredDeptHeadCount(3), 1);

  const validFirst = validateDeptHeadSelectionInput(1, [1, 2], []);
  assert.equal(validFirst.ok, true);
  if (validFirst.ok) {
    assert.equal(validFirst.nextOrder, 1);
    assert.equal(validFirst.requiredCount, 2);
  }

  const existingThree = [
    {
      id: "s1",
      groupNumber: 1,
      groupName: "Kelompok 1: Lupin",
      selectionOrder: 1,
      requiredCount: 2,
      cardIds: [1, 2],
      submittedAt: "2026-11-15T01:00:00.000Z",
    },
    {
      id: "s2",
      groupNumber: 2,
      groupName: "Kelompok 2: Detectif Jubun",
      selectionOrder: 2,
      requiredCount: 2,
      cardIds: [3, 4],
      submittedAt: "2026-11-15T01:05:00.000Z",
    },
    {
      id: "s3",
      groupNumber: 3,
      groupName: "Kelompok 3: Conan",
      selectionOrder: 3,
      requiredCount: 2,
      cardIds: [5, 6],
      submittedAt: "2026-11-15T01:10:00.000Z",
    },
  ];

  // Kelompok ke-4 tidak boleh memilih 2 Dept Head
  const invalidFourthTwo = validateDeptHeadSelectionInput(4, [7, 8], existingThree);
  assert.equal(invalidFourthTwo.ok, false);
  if (!invalidFourthTwo.ok) {
    assert.equal(invalidFourthTwo.code, "INVALID_CARD_COUNT");
  }

  // Kelompok ke-4 boleh memilih 1 Dept Head
  const validFourthOne = validateDeptHeadSelectionInput(4, [7], existingThree);
  assert.equal(validFourthOne.ok, true);
  if (validFourthOne.ok) {
    assert.equal(validFourthOne.nextOrder, 4);
    assert.equal(validFourthOne.requiredCount, 1);
  }
});

test("Menolak kartu yang sudah dipilih kelompok lain atau duplikat kelompok", () => {
  const existing = [
    {
      id: "s1",
      groupNumber: 2,
      groupName: "Kelompok 2: Detectif Jubun",
      selectionOrder: 1,
      requiredCount: 2,
      cardIds: [3, 8],
      submittedAt: "2026-11-15T01:00:00.000Z",
    },
  ];

  const takenCheck = validateDeptHeadSelectionInput(1, [3, 4], existing);
  assert.equal(takenCheck.ok, false);
  if (!takenCheck.ok) {
    assert.equal(takenCheck.code, "CARD_ALREADY_TAKEN");
  }

  const dupGroupCheck = validateDeptHeadSelectionInput(2, [4, 5], existing);
  assert.equal(dupGroupCheck.ok, false);
  if (!dupGroupCheck.ok) {
    assert.equal(dupGroupCheck.code, "GROUP_ALREADY_SUBMITTED");
  }
});

test("Store lokal menjaga urutan pemilihan, kustomisasi siluet, dan reset ulang urutan", () => {
  replaceLocalDeptHeadState([], []);

  saveLocalDeptHeadSelection({
    id: "sel-3",
    groupNumber: 3,
    groupName: "Kelompok 3: Conan",
    selectionOrder: 1,
    requiredCount: 2,
    cardIds: [1, 5],
    submittedAt: "2026-11-15T01:00:00.000Z",
  });
  saveLocalDeptHeadSelection({
    id: "sel-1",
    groupNumber: 1,
    groupName: "Kelompok 1: Lupin",
    selectionOrder: 2,
    requiredCount: 2,
    cardIds: [2, 9],
    submittedAt: "2026-11-15T01:02:00.000Z",
  });
  saveLocalDeptHeadSelection({
    id: "sel-4",
    groupNumber: 4,
    groupName: "Kelompok 4: Holmes",
    selectionOrder: 3,
    requiredCount: 2,
    cardIds: [4, 7],
    submittedAt: "2026-11-15T01:04:00.000Z",
  });
  let snapshot = saveLocalDeptHeadSelection({
    id: "sel-2",
    groupNumber: 2,
    groupName: "Kelompok 2: Detectif Jubun",
    selectionOrder: 4,
    requiredCount: 1,
    cardIds: [6],
    submittedAt: "2026-11-15T01:06:00.000Z",
  });

  const lastGroupRecord = snapshot.selections[3];
  assert.ok(lastGroupRecord);
  assert.equal(lastGroupRecord.selectionOrder, 4);
  assert.equal(lastGroupRecord.requiredCount, 1);
  assert.deepEqual(lastGroupRecord.cardIds, [6]);

  const baseCard = DEFAULT_DEPT_HEAD_CARDS[0];
  assert.ok(baseCard);
  upsertLocalDeptHeadCard({
    ...baseCard,
    title: "Siluet Kustom Kapten",
    description: "Deskripsi kustom dari admin.",
  });

  snapshot = getLocalDeptHeadSnapshot();
  assert.equal(snapshot.totalGroupsSubmitted, 4);
  assert.equal(snapshot.cards[0]?.title, "Siluet Kustom Kapten");
  assert.equal(snapshot.takenCardIds[6]?.groupNumber, 2);

  // Menghapus kelompok ke-3 (urutan 1) harus me-repack urutan kelompok tersisa menjadi 1..3
  snapshot = deleteLocalDeptHeadSelection(3);
  assert.equal(snapshot.totalGroupsSubmitted, 3);
  assert.equal(snapshot.nextRequiredCount, 1);
  assert.deepEqual(
    snapshot.selections.map((s) => s.selectionOrder),
    [1, 2, 3]
  );

  // Reset semua tidak menghapus kustomisasi kartu siluet
  snapshot = resetAllLocalDeptHeadSelections();
  assert.equal(snapshot.totalGroupsSubmitted, 0);
  assert.equal(snapshot.nextRequiredCount, 2);
  assert.equal(snapshot.cards[0]?.title, "Siluet Kustom Kapten");

  const merged = mergeDeptHeadCards([{ id: 2, title: "Override 2" }]);
  const built = buildDeptHeadSnapshot(merged, []);
  assert.equal(built.cards[1]?.title, "Override 2");
  assert.equal(built.cards.length, 9);
});
