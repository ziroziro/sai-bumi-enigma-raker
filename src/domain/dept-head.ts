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

export const submitDeptHeadSchema = z.object({
  groupNumber: z.number().int().min(1).max(4),
  cardIds: z.array(z.number().int().min(1).max(9)).min(1).max(2),
});

export const updateDeptHeadCardSchema = z.object({
  id: z.number().int().min(1).max(9),
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
    code: "SILUET 01",
    title: "Bayangan Sang Pengatur Arah",
    roleHint: "Strategi & Eksekusi Terukur",
    description:
      "Sosok tenang yang membaca pola besar sebelum satu langkah pun diambil. Dikenal tegas menjaga arah misi dan menyatukan ritme seluruh tim.",
    silhouetteVariant: "fedora",
    customImageUrl: null,
  },
  {
    id: 2,
    code: "SILUET 02",
    title: "Bayangan Penjaga Garis Depan",
    roleHint: "Aksi Cepat & Koordinasi Lapangan",
    description:
      "Selalu muncul pertama saat situasi genting membutuhkan keputusan kilat. Mengubah tekanan lapangan menjadi momentum kemenangan tim.",
    silhouetteVariant: "trench",
    customImageUrl: null,
  },
  {
    id: 3,
    code: "SILUET 03",
    title: "Bayangan Sang Pengamat Detail",
    roleHint: "Ketelitian Angka & Analisis Tajam",
    description:
      "Tidak ada celah kecil atau anomali yang luput dari radar pengamatannya. Menguji setiap bukti dengan akurasi sebelum kesimpulan diambil.",
    silhouetteVariant: "monocle",
    customImageUrl: null,
  },
  {
    id: 4,
    code: "SILUET 04",
    title: "Bayangan Perangkai Relasi",
    roleHint: "Komunikasi & Energi Kolaborasi",
    description:
      "Menggerakkan moral tim lewat komunikasi yang hangat namun penuh persuasi. Mampu membuka pintu buntu hanya dengan pendekatan yang tepat.",
    silhouetteVariant: "cloak",
    customImageUrl: null,
  },
  {
    id: 5,
    code: "SILUET 05",
    title: "Bayangan Sang Arsitek Sistem",
    roleHint: "Struktur Kerja & Efisiensi",
    description:
      "Melihat kekacauan sebagai teka-teki struktur yang bisa dirapikan. Menyusun alur kerja paling efisien agar energi tim tidak terbuang sia-sia.",
    silhouetteVariant: "architect",
    customImageUrl: null,
  },
  {
    id: 6,
    code: "SILUET 06",
    title: "Bayangan Ahli Taktik Senyap",
    roleHint: "Perencanaan Cadangan & Risiko",
    description:
      "Selalu menyiapkan rencana B dan C sebelum orang lain menyadari ada ancaman. Tenang di balik layar, menentukan di momen penentu.",
    silhouetteVariant: "strategist",
    customImageUrl: null,
  },
  {
    id: 7,
    code: "SILUET 07",
    title: "Bayangan Penjaga Standar",
    roleHint: "Disiplin & Kualitas Hasil",
    description:
      "Memegang teguh standar tertinggi dalam setiap eksekusi. Menjadi jangkar keandalan ketika tim harus mempertahankan konsistensi hingga garis akhir.",
    silhouetteVariant: "sentinel",
    customImageUrl: null,
  },
  {
    id: 8,
    code: "SILUET 08",
    title: "Bayangan Pengurai Sandi",
    roleHint: "Inovasi & Pemecahan Masalah",
    description:
      "Terbiasa memecahkan kode rumit dengan sudut pandang yang tidak terduga. Menghadirkan ide segar ketika pola lama tidak lagi menjawab tantangan.",
    silhouetteVariant: "scholar",
    customImageUrl: null,
  },
  {
    id: 9,
    code: "SILUET 09",
    title: "Bayangan Komandan Enigma",
    roleHint: "Penggerak Visi & Penentu Akhir",
    description:
      "Sosok karismatik dengan intuisi tajam membaca peluang tersembunyi. Mendorong tim keluar dari batas nyaman untuk menaklukkan misi tersulit.",
    silhouetteVariant: "enigma",
    customImageUrl: null,
  },
];

export function mergeDeptHeadCards(customCards?: Partial<DeptHeadCard>[]): DeptHeadCard[] {
  const byId = new Map<number, Partial<DeptHeadCard>>();
  for (const item of customCards ?? []) {
    if (typeof item.id === "number" && item.id >= 1 && item.id <= 9) {
      byId.set(item.id, item);
    }
  }

  return DEFAULT_DEPT_HEAD_CARDS.map((base) => {
    const override = byId.get(base.id);
    if (!override) return { ...base };
    return {
      id: base.id,
      code: override.code?.trim() || base.code,
      title: override.title?.trim() || base.title,
      roleHint: override.roleHint?.trim() || base.roleHint,
      description: override.description?.trim() || base.description,
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
    return { ok: false, code: "DUPLICATE_CARD", message: "Pilihan siluet tidak boleh sama." };
  }

  if (cardIds.some((id) => !Number.isInteger(id) || id < 1 || id > 9)) {
    return { ok: false, code: "INVALID_CARD", message: "Terdapat pilihan siluet yang tidak valid." };
  }

  if (cardIds.length !== requiredCount) {
    return {
      ok: false,
      code: "INVALID_CARD_COUNT",
      message:
        requiredCount === 1
          ? "Kelompok terakhir hanya dapat memilih tepat 1 Dept Head."
          : `Silakan pilih tepat ${requiredCount} Dept Head untuk kelompok Anda.`,
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
      message: `Siluet #${String(taken).padStart(2, "0")} sudah dipilih oleh kelompok lain. Silakan pilih siluet lain yang masih tersedia.`,
    };
  }

  return {
    ok: true,
    nextOrder: existingSelections.length + 1,
    requiredCount,
  };
}
