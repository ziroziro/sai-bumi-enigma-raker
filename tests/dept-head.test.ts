import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_DEPT_HEAD_CARDS,
  DEPT_HEAD_ANNOUNCEMENT_LABEL,
  buildDeptHeadSnapshot,
  buildLockedDeptHeadView,
  buildPublicDeptHeadSnapshot,
  getRequiredDeptHeadCount,
  mergeDeptHeadCards,
  validateDeptHeadSelectionInput,
} from "../src/domain/dept-head";
import {
  createDeptHeadSessionToken,
  getDeptHeadAccounts,
  verifyDeptHeadCredentials,
  verifyDeptHeadSessionToken,
} from "../src/server/dept-head-auth";
import {
  deleteLocalDeptHeadSelection,
  getLocalDeptHeadSnapshot,
  replaceLocalDeptHeadState,
  resetAllLocalDeptHeadSelections,
  saveLocalDeptHeadSelection,
  upsertLocalDeptHeadCard,
} from "../src/server/dept-head-store";

test("DEFAULT_DEPT_HEAD_CARDS menyediakan tepat 7 kartu karakter unik bernama KARAKTER 1..7", () => {
  assert.equal(DEFAULT_DEPT_HEAD_CARDS.length, 7);
  const ids = new Set(DEFAULT_DEPT_HEAD_CARDS.map((card) => card.id));
  assert.equal(ids.size, 7);
  DEFAULT_DEPT_HEAD_CARDS.forEach((card, index) => {
    assert.equal(card.code, `KARAKTER ${index + 1}`);
    assert.ok(card.title.trim().length > 0);
    assert.ok(card.description.trim().length > 0);
    assert.ok(card.roleHint.trim().length > 0);
  });
});

test("Aturan kuota: 3 kelompok pertama wajib 2 karakter, kelompok ke-4 hanya 1 karakter", () => {
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

  // Kelompok ke-4 tidak boleh memilih 2 karakter
  const invalidFourthTwo = validateDeptHeadSelectionInput(4, [6, 7], existingThree);
  assert.equal(invalidFourthTwo.ok, false);
  if (!invalidFourthTwo.ok) {
    assert.equal(invalidFourthTwo.code, "INVALID_CARD_COUNT");
  }

  // Karakter ID > 7 harus ditolak
  const invalidCardEight = validateDeptHeadSelectionInput(4, [8], existingThree);
  assert.equal(invalidCardEight.ok, false);
  if (!invalidCardEight.ok) {
    assert.equal(invalidCardEight.code, "INVALID_CARD");
  }

  // Kelompok ke-4 boleh memilih 1 karakter
  const validFourthOne = validateDeptHeadSelectionInput(4, [7], existingThree);
  assert.equal(validFourthOne.ok, true);
  if (validFourthOne.ok) {
    assert.equal(validFourthOne.nextOrder, 4);
    assert.equal(validFourthOne.requiredCount, 1);
  }
});

test("Menolak karakter yang sudah dipilih tim lain atau duplikat kelompok", () => {
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

test("Public snapshot menyamarkan nama kelompok pemilih lain dan menyembunyikan urutan", () => {
  const full = buildDeptHeadSnapshot(
    [],
    [
      {
        id: "s1",
        groupNumber: 1,
        selectionOrder: 1,
        requiredCount: 2,
        cardIds: [1, 5],
        submittedAt: "2026-11-15T01:00:00.000Z",
      },
    ]
  );

  const publicForGroup2 = buildPublicDeptHeadSnapshot(full, 2);
  assert.equal(publicForGroup2.group.number, 2);
  assert.equal(publicForGroup2.mySelection, null);
  assert.deepEqual(publicForGroup2.takenByOtherCardIds, [1, 5]);
  assert.equal("selections" in publicForGroup2, false);

  const publicForGroup1 = buildPublicDeptHeadSnapshot(full, 1);
  assert.deepEqual(publicForGroup1.mySelection?.cardIds, [1, 5]);
  assert.deepEqual(publicForGroup1.takenByOtherCardIds, []);

  // Locked view hanya mengembalikan kartu yang dipilih kelompok tersebut + info pengumuman 19/11
  const lockedGroup1 = buildLockedDeptHeadView(full, 1);
  assert.ok(lockedGroup1);
  assert.equal(lockedGroup1.selectedCards.length, 2);
  assert.deepEqual(
    lockedGroup1.selectedCards.map((c) => c.id),
    [1, 5]
  );
  assert.equal(lockedGroup1.announcementDateLabel, DEPT_HEAD_ANNOUNCEMENT_LABEL);
  assert.ok(lockedGroup1.announcementDateLabel.includes("19/11"));
  assert.equal(buildLockedDeptHeadView(full, 2), null);
});

test("Autentikasi akun email/password kelompok dan token sesi bekerja sesuai 4 kelompok", () => {
  const accounts = getDeptHeadAccounts();
  assert.equal(accounts.length, 4);

  const first = accounts[0];
  assert.ok(first);
  const verified = verifyDeptHeadCredentials(first.email.toUpperCase(), first.password);
  assert.ok(verified);
  assert.equal(verified.groupNumber, first.groupNumber);

  assert.equal(verifyDeptHeadCredentials(first.email, "password-salah"), null);
  assert.equal(verifyDeptHeadCredentials("unknown@enigma.id", first.password), null);

  const token = createDeptHeadSessionToken(3);
  assert.equal(verifyDeptHeadSessionToken(token), 3);
  assert.equal(verifyDeptHeadSessionToken(`${token}tampered`), null);
});

test("Store lokal menjaga urutan pemilihan, kustomisasi karakter, normalisasi kode lama, dan reset ulang", () => {
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
    cardIds: [2, 3],
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
    title: "Karakter Kustom Kapten",
    description: "Deskripsi kustom dari admin.",
  });

  snapshot = getLocalDeptHeadSnapshot();
  assert.equal(snapshot.totalGroupsSubmitted, 4);
  assert.equal(snapshot.cards[0]?.title, "Karakter Kustom Kapten");
  assert.equal(snapshot.takenCardIds[6]?.groupNumber, 2);

  snapshot = deleteLocalDeptHeadSelection(3);
  assert.equal(snapshot.totalGroupsSubmitted, 3);
  assert.equal(snapshot.nextRequiredCount, 1);
  assert.deepEqual(
    snapshot.selections.map((s) => s.selectionOrder),
    [1, 2, 3]
  );

  snapshot = resetAllLocalDeptHeadSelections();
  assert.equal(snapshot.totalGroupsSubmitted, 0);
  assert.equal(snapshot.nextRequiredCount, 2);
  assert.equal(snapshot.cards[0]?.title, "Karakter Kustom Kapten");

  const merged = mergeDeptHeadCards([
    { id: 1, code: "SILUET 01" },
    { id: 2, title: "Override 2" },
  ]);
  assert.equal(merged[0]?.code, "KARAKTER 1");
  const built = buildDeptHeadSnapshot(merged, []);
  assert.equal(built.cards[1]?.title, "Override 2");
  assert.equal(built.cards.length, 7);
});
