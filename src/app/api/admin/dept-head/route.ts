import { z } from "zod";
import { getGroupTitle } from "@/config/event";
import { DEFAULT_DEPT_HEAD_CARDS, updateDeptHeadCardSchema } from "@/domain/dept-head";
import { verifyAdminRequest } from "@/server/admin-auth";
import { getDeptHeadAccounts } from "@/server/dept-head-auth";
import {
  deleteDeptHeadSelection,
  DeptHeadServiceError,
  getDeptHeadSnapshot,
  resetAllDeptHeadSelections,
  setDeptHeadPageUnlocked,
  submitDeptHeadSelection,
  updateDeptHeadCard,
} from "@/server/dept-head-service";

const adminAssignSchema = z.object({
  action: z.literal("assign"),
  groupNumber: z.number().int().min(1).max(4),
  cardIds: z.array(z.number().int().min(1).max(7)).min(1).max(2),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAdminAuth(request: Request): boolean {
  return verifyAdminRequest(request);
}

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Sesi admin tidak valid atau telah berakhir." }, { status: 401 });
  }

  try {
    const snapshot = await getDeptHeadSnapshot();
    const accounts = getDeptHeadAccounts();
    return Response.json(
      { ...snapshot, accounts },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat data pemilihan Chief Detective.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Sesi admin tidak valid atau telah berakhir." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    if (body && body.action === "assign") {
      const parsed = adminAssignSchema.safeParse(body);
      if (!parsed.success) {
        return Response.json(
          {
            error: parsed.error.issues[0]?.message || "Data pemilihan kelompok tidak valid.",
            code: "INVALID_ASSIGN_PAYLOAD",
          },
          { status: 400 }
        );
      }

      const result = await submitDeptHeadSelection(parsed.data.groupNumber, parsed.data.cardIds);
      return Response.json({
        success: true,
        message: `Cap ${getGroupTitle(parsed.data.groupNumber)} berhasil diberikan pada kartu pilihan.`,
        snapshot: result.snapshot,
      });
    }

    const isPageUnlocked = Boolean(body?.isPageUnlocked);
    const snapshot = await setDeptHeadPageUnlocked(isPageUnlocked);
    return Response.json({
      success: true,
      message: isPageUnlocked
        ? "Halaman Chief Detective berhasil dibuka untuk peserta."
        : "Halaman Chief Detective berhasil dikunci kembali.",
      snapshot,
    });
  } catch (error) {
    if (error instanceof DeptHeadServiceError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Gagal memproses aksi Admin Chief Detective.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Sesi admin tidak valid atau telah berakhir." }, { status: 401 });
  }

  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = updateDeptHeadCardSchema.safeParse(rawBody);
    if (!parsed.success) {
      return Response.json(
        {
          error: parsed.error.issues[0]?.message || "Data kartu siluet tidak valid.",
          code: "INVALID_CARD_PAYLOAD",
        },
        { status: 400 }
      );
    }

    const baseCard = DEFAULT_DEPT_HEAD_CARDS.find((c) => c.id === parsed.data.id);
    const snapshot = await updateDeptHeadCard({
      ...parsed.data,
      realName: baseCard?.realName ?? "",
      revealImageUrl: baseCard?.revealImageUrl ?? `/images/karakter/karakter-${parsed.data.id}-reveal.jpg`,
      customImageUrl: parsed.data.customImageUrl ? parsed.data.customImageUrl : null,
    });
    return Response.json({ success: true, snapshot });
  } catch (error) {
    if (error instanceof DeptHeadServiceError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Gagal memperbarui kartu siluet.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Sesi admin tidak valid atau telah berakhir." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    if (body && body.all) {
      const snapshot = await resetAllDeptHeadSelections();
      return Response.json({
        success: true,
        message: "Seluruh pilihan Chief Detective kelompok berhasil dikosongkan.",
        snapshot,
      });
    }

    const groupNumber = Number(body?.groupNumber);
    if (Number.isInteger(groupNumber) && groupNumber >= 1 && groupNumber <= 4) {
      const snapshot = await deleteDeptHeadSelection(groupNumber);
      return Response.json({
        success: true,
        message: `Pilihan Chief Detective untuk Kelompok ${groupNumber} berhasil direset.`,
        snapshot,
      });
    }

    return Response.json({ error: "Parameter reset tidak lengkap." }, { status: 400 });
  } catch (error) {
    if (error instanceof DeptHeadServiceError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Gagal mereset pilihan Chief Detective.";
    return Response.json({ error: message }, { status: 500 });
  }
}
