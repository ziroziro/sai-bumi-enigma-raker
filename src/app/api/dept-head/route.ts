import { submitDeptHeadSchema } from "@/domain/dept-head";
import {
  DeptHeadServiceError,
  getDeptHeadSnapshot,
  submitDeptHeadSelection,
} from "@/server/dept-head-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getDeptHeadSnapshot();
    return Response.json(snapshot, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat data pemilihan Dept Head.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = submitDeptHeadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return Response.json(
        {
          error: parsed.error.issues[0]?.message || "Format data pemilihan Dept Head tidak valid.",
          code: "INVALID_PAYLOAD",
        },
        { status: 400 }
      );
    }

    const result = await submitDeptHeadSelection(parsed.data.groupNumber, parsed.data.cardIds);
    return Response.json(
      {
        success: true,
        record: result.record,
        snapshot: result.snapshot,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof DeptHeadServiceError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Gagal menyimpan pilihan Dept Head.";
    return Response.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
