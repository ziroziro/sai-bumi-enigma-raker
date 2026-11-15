import { z } from "zod";
import { buildLockedDeptHeadView, buildPublicDeptHeadSnapshot } from "@/domain/dept-head";
import {
  createDeptHeadSessionToken,
  DEPT_HEAD_COOKIE_NAME,
  verifyDeptHeadCredentials,
} from "@/server/dept-head-auth";
import { getDeptHeadSnapshot } from "@/server/dept-head-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().email("Format email kelompok tidak valid."),
  password: z.string().min(1, "Password wajib diisi."),
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(rawBody);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message || "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const account = verifyDeptHeadCredentials(parsed.data.email, parsed.data.password);
    if (!account) {
      return Response.json(
        { error: "Email atau password akun kelompok tidak sesuai." },
        { status: 401 }
      );
    }

    const fullSnapshot = await getDeptHeadSnapshot();
    const lockedView = buildLockedDeptHeadView(fullSnapshot, account.groupNumber);

    // Jika kelompok sudah pernah submit, akun tidak diberi sesi aktif untuk masuk ke form lagi
    // dan hanya menampilkan kartu karakter Dept Head yang sudah dipilih sebelumnya.
    if (lockedView) {
      const response = Response.json({
        success: true,
        alreadySubmitted: true,
        lockedView,
      });
      response.headers.set(
        "Set-Cookie",
        `${DEPT_HEAD_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:01 GMT${
          process.env.NODE_ENV === "production" ? "; Secure" : ""
        }`
      );
      return response;
    }

    const publicSnapshot = buildPublicDeptHeadSnapshot(fullSnapshot, account.groupNumber);
    const token = createDeptHeadSessionToken(account.groupNumber);
    const response = Response.json({
      success: true,
      alreadySubmitted: false,
      snapshot: publicSnapshot,
    });

    response.headers.set(
      "Set-Cookie",
      `${DEPT_HEAD_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );

    return response;
  } catch {
    return Response.json(
      { error: "Gagal memproses login kelompok. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
