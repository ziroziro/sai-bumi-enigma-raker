import { DEPT_HEAD_ANNOUNCEMENT_LABEL, submitDeptHeadSchema } from "@/domain/dept-head";
import { DEPT_HEAD_COOKIE_NAME, getDeptHeadGroupFromRequest } from "@/server/dept-head-auth";
import {
  DeptHeadServiceError,
  getPublicDeptHeadSnapshot,
  submitDeptHeadSelection,
} from "@/server/dept-head-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildClearCookieHeader(): string {
  return `${DEPT_HEAD_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:01 GMT${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

export async function GET(request: Request) {
  const groupNumber = getDeptHeadGroupFromRequest(request);
  if (!groupNumber) {
    return Response.json(
      { error: "Silakan login menggunakan email dan password kelompok Anda terlebih dahulu." },
      { status: 401 }
    );
  }

  try {
    const snapshot = await getPublicDeptHeadSnapshot(groupNumber);
    if (snapshot.mySelection) {
      const response = Response.json(
        {
          error: "Akun kelompok ini sudah menyelesaikan pemilihan dan otomatis ter-logout.",
          code: "GROUP_ALREADY_SUBMITTED",
        },
        { status: 401 }
      );
      response.headers.set("Set-Cookie", buildClearCookieHeader());
      return response;
    }

    return Response.json(snapshot, {
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

    await submitDeptHeadSelection(groupNumber, parsed.data.cardIds);

    // Otomatis logout akun kelompok setelah berhasil submit pilihan Dept Head
    const response = Response.json(
      {
        success: true,
        loggedOut: true,
        message: `Pilihan Dept Head berhasil disimpan dan akun otomatis keluar. ${DEPT_HEAD_ANNOUNCEMENT_LABEL}`,
      },
      { status: 201 }
    );
    response.headers.set("Set-Cookie", buildClearCookieHeader());
    return response;
  } catch (error) {
    if (error instanceof DeptHeadServiceError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Gagal menyimpan pilihan karakter.";
    return Response.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
