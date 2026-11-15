import "server-only";
import { getGroupTitle } from "@/config/event";
import {
  buildDeptHeadSnapshot,
  validateDeptHeadSelectionInput,
  type DeptHeadCard,
  type DeptHeadSelectionRecord,
  type DeptHeadStateSnapshot,
} from "@/domain/dept-head";
import { createBackendClient } from "./supabase";
import {
  deleteLocalDeptHeadSelection,
  getLocalDeptHeadSnapshot,
  replaceLocalDeptHeadState,
  resetAllLocalDeptHeadSelections,
  saveLocalDeptHeadSelection,
  upsertLocalDeptHeadCard,
} from "./dept-head-store";

export class DeptHeadServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function mapRpcError(message: string): DeptHeadServiceError {
  if (message.includes("GROUP_ALREADY_SUBMITTED")) {
    return new DeptHeadServiceError(
      "GROUP_ALREADY_SUBMITTED",
      "Kelompok ini sudah mengirimkan pilihan Dept Head sebelumnya.",
      409
    );
  }
  if (message.includes("CARD_ALREADY_TAKEN")) {
    return new DeptHeadServiceError(
      "CARD_ALREADY_TAKEN",
      "Salah satu siluet sudah terlebih dahulu dipilih oleh kelompok lain.",
      409
    );
  }
  if (message.includes("ALL_GROUPS_SUBMITTED")) {
    return new DeptHeadServiceError(
      "ALL_GROUPS_SUBMITTED",
      "Keempat kelompok sudah selesai menentukan pilihan Dept Head.",
      409
    );
  }
  if (message.includes("INVALID_CARD_COUNT")) {
    return new DeptHeadServiceError(
      "INVALID_CARD_COUNT",
      "Jumlah pilihan Dept Head tidak sesuai dengan kuota urutan kelompok saat ini.",
      400
    );
  }
  if (message.includes("INVALID_GROUP")) {
    return new DeptHeadServiceError("INVALID_GROUP", "Kelompok yang dipilih tidak valid.", 400);
  }
  return new DeptHeadServiceError("SUBMIT_FAILED", "Gagal menyimpan pilihan Dept Head.", 500);
}

function isMissingMigrationError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = error.message || "";
  return (
    error.code === "42883" ||
    error.code === "PGRST202" ||
    error.code === "42P01" ||
    msg.includes("Could not find the function") ||
    msg.includes("does not exist")
  );
}

export async function getDeptHeadSnapshot(): Promise<DeptHeadStateSnapshot> {
  if (process.env.APP_DATA_MODE === "demo") {
    return getLocalDeptHeadSnapshot();
  }

  try {
    const { client, config } = createBackendClient();
    const { data, error } = await client.rpc("get_dept_head_snapshot", {
      p_event_slug: config.eventSlug,
    });

    if (error || !data || typeof data !== "object") {
      return getLocalDeptHeadSnapshot();
    }

    const raw = data as {
      cards?: Partial<DeptHeadCard>[];
      selections?: Omit<DeptHeadSelectionRecord, "groupName">[];
    };

    const snapshot = buildDeptHeadSnapshot(raw.cards ?? [], raw.selections ?? []);
    replaceLocalDeptHeadState(snapshot.cards, snapshot.selections);
    return snapshot;
  } catch {
    return getLocalDeptHeadSnapshot();
  }
}

export async function submitDeptHeadSelection(
  groupNumber: number,
  cardIds: number[]
): Promise<{ record: DeptHeadSelectionRecord; snapshot: DeptHeadStateSnapshot }> {
  if (process.env.APP_DATA_MODE !== "demo") {
    try {
      const { client, config } = createBackendClient();
      const { data, error } = await client.rpc("submit_dept_head_selection", {
        p_event_slug: config.eventSlug,
        p_group_number: groupNumber,
        p_card_ids: cardIds,
      });

      if (!error && data && typeof data === "object") {
        const raw = data as Omit<DeptHeadSelectionRecord, "groupName">;
        const record: DeptHeadSelectionRecord = {
          ...raw,
          groupName: getGroupTitle(raw.groupNumber),
        };
        const snapshot = await getDeptHeadSnapshot();
        return { record, snapshot };
      }

      if (error && !isMissingMigrationError(error)) {
        throw mapRpcError(error.message || "");
      }
    } catch (err) {
      if (err instanceof DeptHeadServiceError) throw err;
      // Fallback ke local store jika migrasi belum diterapkan atau config lokal
    }
  }

  const localSnap = getLocalDeptHeadSnapshot();
  const check = validateDeptHeadSelectionInput(groupNumber, cardIds, localSnap.selections);
  if (!check.ok) {
    const status =
      check.code === "GROUP_ALREADY_SUBMITTED" ||
      check.code === "CARD_ALREADY_TAKEN" ||
      check.code === "ALL_GROUPS_SUBMITTED"
        ? 409
        : 400;
    throw new DeptHeadServiceError(check.code, check.message, status);
  }

  const record: DeptHeadSelectionRecord = {
    id: crypto.randomUUID(),
    groupNumber,
    groupName: getGroupTitle(groupNumber),
    selectionOrder: check.nextOrder,
    requiredCount: check.requiredCount,
    cardIds: [...cardIds],
    submittedAt: new Date().toISOString(),
  };

  const snapshot = saveLocalDeptHeadSelection(record);
  return { record, snapshot };
}

export async function updateDeptHeadCard(card: DeptHeadCard): Promise<DeptHeadStateSnapshot> {
  let snapshot = upsertLocalDeptHeadCard(card);

  if (process.env.APP_DATA_MODE !== "demo") {
    try {
      const { client, config } = createBackendClient();
      const { error } = await client.rpc("upsert_dept_head_card", {
        p_event_slug: config.eventSlug,
        p_card_id: card.id,
        p_code: card.code,
        p_title: card.title,
        p_role_hint: card.roleHint,
        p_description: card.description,
        p_silhouette_variant: card.silhouetteVariant,
        p_custom_image_url: card.customImageUrl ?? null,
      });
      if (!error) {
        snapshot = await getDeptHeadSnapshot();
      }
    } catch {
      // Abaikan jika mode lokal
    }
  }

  return snapshot;
}

export async function deleteDeptHeadSelection(groupNumber: number): Promise<DeptHeadStateSnapshot> {
  let snapshot = deleteLocalDeptHeadSelection(groupNumber);

  if (process.env.APP_DATA_MODE !== "demo") {
    try {
      const { client, config } = createBackendClient();
      const { error } = await client.rpc("delete_dept_head_selection", {
        p_event_slug: config.eventSlug,
        p_group_number: groupNumber,
      });
      if (!error) {
        snapshot = await getDeptHeadSnapshot();
      }
    } catch {
      // Abaikan jika mode lokal
    }
  }

  return snapshot;
}

export async function resetAllDeptHeadSelections(): Promise<DeptHeadStateSnapshot> {
  let snapshot = resetAllLocalDeptHeadSelections();

  if (process.env.APP_DATA_MODE !== "demo") {
    try {
      const { client, config } = createBackendClient();
      const { error } = await client.rpc("reset_all_dept_head_selections", {
        p_event_slug: config.eventSlug,
      });
      if (!error) {
        snapshot = await getDeptHeadSnapshot();
      }
    } catch {
      // Abaikan jika mode lokal
    }
  }

  return snapshot;
}
