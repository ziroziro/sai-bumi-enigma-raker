import { z } from "zod";
import { getGroupTitle, officialGroups } from "@/config/event";

export const SILHOUETTE_VARIANTS = [
  "fedora",
  "trench",
  "monocle",
  "cloak",
  "architect",
  "strategist",
  "sentinel",
  "scholar",
  "enigma",
] as const;

export type SilhouetteVariant = (typeof SILHOUETTE_VARIANTS)[number];

export const SILHOUETTE_VARIANT_LABELS: Record<SilhouetteVariant, string> = {
  fedora: "Siluet Topi Fedora Klasik",
  trench: "Siluet Mantel Investigasi",
  monocle: "Siluet Pengamat Lensa",
  cloak: "Siluet Jubah Strategi",
  architect: "Siluet Perancang Peta",
  strategist: "Siluet Ahli Taktik",
  sentinel: "Siluet Penjaga Gerbang",
  scholar: "Siluet Pengurai Sandi",
  enigma: "Siluet Bayangan Enigma",
};

export interface DeptHeadCard {
  id: number;
  code: string;
  title: string;
  roleHint: string;
  description: string;
  power?: number;
  defense?: number;
  silhouetteVariant: SilhouetteVariant;
  customImageUrl?: string | null;
}

export interface DeptHeadSelectionRecord {
  id: string;
  groupNumber: number;
  groupName: string;
  selectionOrder: number;
  requiredCount: number;
  cardIds: number[];
  submittedAt: string;
}

export interface DeptHeadClaimOwner {
  groupNumber: number;
  groupName: string;
  selectionOrder: number;
}

export interface DeptHeadStateSnapshot {
  cards: DeptHeadCard[];
  selections: DeptHeadSelectionRecord[];
  totalGroupsSubmitted: number;
  maxGroups: number;
  nextRequiredCount: number;
  takenCardIds: Record<number, DeptHeadClaimOwner>;
}

export interface PublicDeptHeadSelection {
  cardIds: number[];
  submittedAt: string;
}

export interface PublicDeptHeadSnapshot {
  group: {
    number: number;
    name: string;
    title: string;
  };
  cards: DeptHeadCard[];
  totalGroupsSubmitted: number;
  maxGroups: number;
  requiredCount: number;
  mySelection: PublicDeptHeadSelection | null;
  takenByOtherCardIds: number[];
}

export interface LockedDeptHeadView {
  group: {
    number: number;
    name: string;
    title: string;
  };
  selectedCards: DeptHeadCard[];
  submittedAt: string;
  announcementDateLabel: string;
}

export const DEPT_HEAD_ANNOUNCEMENT_LABEL = "Pengumuman resmi Department Head akan diumumkan pada tanggal 19/11.";

export const submitDeptHeadSchema = z.object({
  cardIds: z.array(z.number().int().min(1).max(7)).min(1).max(2),
});

export const updateDeptHeadCardSchema = z.object({
  id: z.number().int().min(1).max(7),
  code: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(120),
  roleHint: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1000),
  silhouetteVariant: z.enum(SILHOUETTE_VARIANTS),
  customImageUrl: z
    .string()
    .trim()
    .max(600_000)
    .refine(
      (v) =>
        v.length === 0 ||
        v.startsWith("/") ||
        v.startsWith("https://") ||
        v.startsWith("http://") ||
        v.startsWith("data:image/"),
      "URL gambar atau data image tidak valid."
    )
    .nullable()
    .optional(),
});

export const DEFAULT_DEPT_HEAD_CARDS: DeptHeadCard[] = [
  {
    id: 1,
    code: "KARAKTER 1",
    title: "Sang Pengatur Arah",
    roleHint: "Strategi & Eksekusi Terukur",
    description:
      "Sosok tenang yang membaca pola besar sebelum satu langkah pun diambil. Tegas menjaga arah misi dan menyatukan ritme seluruh tim.",
    power: 2800,
    defense: 2600,
    silhouetteVariant: "fedora",
    customImageUrl: "/images/karakter/karakter-1.jpg",
  },
  {
    id: 2,
    code: "KARAKTER 2",
    title: "Penjaga Garis Depan",
    roleHint: "Aksi Cepat & Koordinasi Lapangan",
    description:
      "Selalu muncul pertama saat situasi genting membutuhkan keputusan kilat. Mengubah tekanan lapangan menjadi momentum kemenangan tim.",
    power: 3000,
    defense: 2400,
    silhouetteVariant: "trench",
    customImageUrl: "/images/karakter/karakter-2.jpg",
  },
  {
    id: 3,
    code: "KARAKTER 3",
    title: "Sang Pengamat Detail",
    roleHint: "Ketelitian Angka & Analisis Tajam",
    description:
      "Tidak ada celah kecil atau anomali yang luput dari radar pengamatannya. Menguji setiap bukti dengan akurasi sebelum kesimpulan diambil.",
    power: 2500,
    defense: 2900,
    silhouetteVariant: "monocle",
    customImageUrl: "/images/karakter/karakter-3.jpg",
  },
  {
    id: 4,
    code: "KARAKTER 4",
    title: "Perangkai Relasi",
    roleHint: "Komunikasi & Energi Kolaborasi",
    description:
      "Menggerakkan moral tim lewat komunikasi yang hangat namun penuh persuasi. Mampu membuka pintu buntu dengan pendekatan yang tepat.",
    power: 2600,
    defense: 2700,
    silhouetteVariant: "cloak",
    customImageUrl: "/images/karakter/karakter-4.jpg",
  },
  {
    id: 5,
    code: "KARAKTER 5",
    title: "Sang Arsitek Sistem",
    roleHint: "Struktur Kerja & Efisiensi",
    description:
      "Melihat kekacauan sebagai teka-teki struktur yang bisa dirapikan. Menyusun alur kerja paling efisien agar energi tim tidak terbuang sia-sia.",
    power: 2700,
    defense: 2800,
    silhouetteVariant: "architect",
    customImageUrl: "/images/karakter/karakter-5.jpg",
  },
  {
    id: 6,
    code: "KARAKTER 6",
    title: "Ahli Taktik Senyap",
    roleHint: "Perencanaan Cadangan & Risiko",
    description:
      "Selalu menyiapkan rencana B dan C sebelum orang lain menyadari ada ancaman. Tenang di balik layar, menentukan di momen penentu.",
    power: 2900,
    defense: 2600,
    silhouetteVariant: "strategist",
    customImageUrl: "/images/karakter/karakter-6.jpg",
  },
  {
    id: 7,
    code: "KARAKTER 7",
    title: "Penjaga Standar",
    roleHint: "Disiplin & Kualitas Hasil",
    description:
      "Memegang teguh standar tertinggi dalam setiap eksekusi. Menjadi jangkar keandalan ketika tim harus mempertahankan konsistensi hingga garis akhir.",
    power: 2400,
    defense: 3100,
    silhouetteVariant: "sentinel",
    customImageUrl: "/images/karakter/karakter-7.jpg",
  },
];

function normalizeCardCode(rawCode: string | undefined, fallback: string): string {
  const trimmed = rawCode?.trim();
  if (!trimmed) return fallback;
  const legacyMatch = /^SILUET\s*0?([1-7])$/i.exec(trimmed);
  if (legacyMatch) {
    return `KARAKTER ${legacyMatch[1]}`;
  }
  return trimmed;
}

function normalizeCardTitle(rawTitle: string | undefined, fallback: string): string {
  const trimmed = rawTitle?.trim();
  if (!trimmed) return fallback;
  return trimmed.replace(/^Bayangan\s+/i, "");
}

export function mergeDeptHeadCards(customCards?: Partial<DeptHeadCard>[]): DeptHeadCard[] {
  const byId = new Map<number, Partial<DeptHeadCard>>();
  for (const item of customCards ?? []) {
    if (typeof item.id === "number" && item.id >= 1 && item.id <= 7) {
      byId.set(item.id, item);
    }
  }

  return DEFAULT_DEPT_HEAD_CARDS.map((base) => {
    const override = byId.get(base.id);
    if (!override) return { ...base };
    return {
      id: base.id,
      code: normalizeCardCode(override.code, base.code),
      title: normalizeCardTitle(override.title, base.title),
      roleHint: override.roleHint?.trim() || base.roleHint,
      description: override.description?.trim() || base.description,
      power: typeof override.power === "number" ? override.power : base.power,
      defense: typeof override.defense === "number" ? override.defense : base.defense,
      silhouetteVariant:
        override.silhouetteVariant && SILHOUETTE_VARIANTS.includes(override.silhouetteVariant)
          ? override.silhouetteVariant
          : base.silhouetteVariant,
      customImageUrl: override.customImageUrl ?? base.customImageUrl ?? null,
    };
  });
}

export function getRequiredDeptHeadCount(submittedGroupsCount: number): 1 | 2 {
  // 3 kelompok pertama memilih 2 dept head; kelompok ke-4 (terakhir) hanya memilih 1 dept head.
  return submittedGroupsCount >= 3 ? 1 : 2;
}

export function buildDeptHeadSnapshot(
  cardsInput: Partial<DeptHeadCard>[],
  selectionsInput: Omit<DeptHeadSelectionRecord, "groupName">[]
): DeptHeadStateSnapshot {
  const cards = mergeDeptHeadCards(cardsInput);
  const selections: DeptHeadSelectionRecord[] = [...selectionsInput]
    .sort((a, b) => a.selectionOrder - b.selectionOrder)
    .map((s) => ({
      ...s,
      groupName: getGroupTitle(s.groupNumber),
    }));

  const takenCardIds: Record<number, DeptHeadClaimOwner> = {};
  for (const selection of selections) {
    for (const cardId of selection.cardIds) {
      takenCardIds[cardId] = {
        groupNumber: selection.groupNumber,
        groupName: selection.groupName,
        selectionOrder: selection.selectionOrder,
      };
    }
  }

  const totalGroupsSubmitted = selections.length;
  return {
    cards,
    selections,
    totalGroupsSubmitted,
    maxGroups: officialGroups.length,
    nextRequiredCount: getRequiredDeptHeadCount(totalGroupsSubmitted),
    takenCardIds,
  };
}

export function buildPublicDeptHeadSnapshot(
  snapshot: DeptHeadStateSnapshot,
  groupNumber: number
): PublicDeptHeadSnapshot {
  const groupMeta = officialGroups.find((g) => g.number === groupNumber) ?? officialGroups[0];
  const myRecord = snapshot.selections.find((s) => s.groupNumber === groupMeta.number) ?? null;
  const takenByOtherCardIds = Object.entries(snapshot.takenCardIds)
    .filter(([, owner]) => owner.groupNumber !== groupMeta.number)
    .map(([id]) => Number(id))
    .sort((a, b) => a - b);

  return {
    group: {
      number: groupMeta.number,
      name: groupMeta.name,
      title: groupMeta.title,
    },
    cards: snapshot.cards,
    totalGroupsSubmitted: snapshot.totalGroupsSubmitted,
    maxGroups: snapshot.maxGroups,
    requiredCount: myRecord ? myRecord.cardIds.length : snapshot.nextRequiredCount,
    mySelection: myRecord
      ? {
          cardIds: [...myRecord.cardIds],
          submittedAt: myRecord.submittedAt,
        }
      : null,
    takenByOtherCardIds,
  };
}

export function buildLockedDeptHeadView(
  snapshot: DeptHeadStateSnapshot,
  groupNumber: number
): LockedDeptHeadView | null {
  const groupMeta = officialGroups.find((g) => g.number === groupNumber);
  if (!groupMeta) return null;

  const myRecord = snapshot.selections.find((s) => s.groupNumber === groupNumber);
  if (!myRecord) return null;

  const cardById = new Map<number, DeptHeadCard>();
  for (const card of snapshot.cards) {
    cardById.set(card.id, card);
  }

  const selectedCards = myRecord.cardIds
    .map((id) => cardById.get(id))
    .filter((card): card is DeptHeadCard => Boolean(card));

  return {
    group: {
      number: groupMeta.number,
      name: groupMeta.name,
      title: groupMeta.title,
    },
    selectedCards,
    submittedAt: myRecord.submittedAt,
    announcementDateLabel: DEPT_HEAD_ANNOUNCEMENT_LABEL,
  };
}

export type DeptHeadValidationErrorCode =
  | "INVALID_GROUP"
  | "GROUP_ALREADY_SUBMITTED"
  | "ALL_GROUPS_SUBMITTED"
  | "INVALID_CARD_COUNT"
  | "DUPLICATE_CARD"
  | "INVALID_CARD"
  | "CARD_ALREADY_TAKEN";

export function validateDeptHeadSelectionInput(
  groupNumber: number,
  cardIds: number[],
  existingSelections: DeptHeadSelectionRecord[]
):
  | { ok: true; nextOrder: number; requiredCount: 1 | 2 }
  | { ok: false; code: DeptHeadValidationErrorCode; message: string } {
  if (!Number.isInteger(groupNumber) || groupNumber < 1 || groupNumber > 4) {
    return { ok: false, code: "INVALID_GROUP", message: "Pilihan kelompok tidak valid." };
  }

  if (existingSelections.some((s) => s.groupNumber === groupNumber)) {
    return {
      ok: false,
      code: "GROUP_ALREADY_SUBMITTED",
      message: `${getGroupTitle(groupNumber)} sudah mengirimkan pilihan Dept Head.`,
    };
  }

  if (existingSelections.length >= 4) {
    return {
      ok: false,
      code: "ALL_GROUPS_SUBMITTED",
      message: "Keempat kelompok sudah selesai mengirimkan pilihan Dept Head.",
    };
  }

  const requiredCount = getRequiredDeptHeadCount(existingSelections.length);
  const uniqueIds = new Set(cardIds);
  if (uniqueIds.size !== cardIds.length) {
    return { ok: false, code: "DUPLICATE_CARD", message: "Pilihan karakter tidak boleh sama." };
  }

  if (cardIds.some((id) => !Number.isInteger(id) || id < 1 || id > 7)) {
    return { ok: false, code: "INVALID_CARD", message: "Terdapat pilihan karakter yang tidak valid." };
  }

  if (cardIds.length !== requiredCount) {
    return {
      ok: false,
      code: "INVALID_CARD_COUNT",
      message: `Silakan pilih tepat ${requiredCount} karakter untuk kelompok Anda.`,
    };
  }

  const claimedSet = new Set<number>();
  for (const s of existingSelections) {
    for (const id of s.cardIds) claimedSet.add(id);
  }
  const taken = cardIds.find((id) => claimedSet.has(id));
  if (taken !== undefined) {
    return {
      ok: false,
      code: "CARD_ALREADY_TAKEN",
      message: `KARAKTER ${taken} sudah dipilih oleh tim lain. Silakan pilih karakter lain yang masih tersedia.`,
    };
  }

  return {
    ok: true,
    nextOrder: existingSelections.length + 1,
    requiredCount,
  };
}
