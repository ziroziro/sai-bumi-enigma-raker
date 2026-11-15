import { getGroupTitle } from "@/config/event";
import {
  buildLockedDeptHeadView,
  buildPublicDeptHeadSnapshot,
  DEPT_HEAD_ANNOUNCEMENT_LABEL,
  submitDeptHeadSchema,
} from "@/domain/dept-head";
import { getDeptHeadGroupFromRequest } from "@/server/dept-head-auth";
import {
  DeptHeadServiceError,
  getDeptHeadSnapshot,
  submitDeptHeadSelection,
} from "@/server/dept-head-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const groupNumber = getDeptHeadGroupFromRequest(request);
  if (!groupNumber) {
    return Response.json(
      { error: "Silakan login menggunakan email dan password kelompok Anda terlebih dahulu." },
      { status: 401 }
    );
  }

  try {
    const fullSnapshot = await getDeptHeadSnapshot();
    const publicSnapshot = buildPublicDeptHeadSnapshot(fullSnapshot, groupNumber);
    if (publicSnapshot.mySelection) {
      return Response.json(
        {
          alreadySubmitted: true,
          lockedView: buildLockedDeptHeadView(fullSnapshot, groupNumber),
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    return Response.json(publicSnapshot, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat data pemilihan karakter.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const groupNumber = getDeptHeadGroupFromRequest(request);
  if (!groupNumber) {
    return Response.json(
      { error: "Sesi login kelompok berakhir atau belum masuk. Silakan login kembali.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = submitDeptHeadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return Response.json(
        {
          error: parsed.error.issues[0]?.message || "Format data pemilihan karakter tidak valid.",
          code: "INVALID_PAYLOAD",
        },
        { status: 400 }
      );
    }

    const result = await submitDeptHeadSelection(groupNumber, parsed.data.cardIds);
    const lockedView = buildLockedDeptHeadView(result.snapshot, groupNumber);

    return Response.json(
      {
        success: true,
        message: `Terima kasih! Submit pilihan untuk ${getGroupTitle(groupNumber)} berhasil. ${DEPT_HEAD_ANNOUNCEMENT_LABEL}`,
        lockedView,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof DeptHeadServiceError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Gagal menyimpan pilihan karakter.";
    return Response.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
