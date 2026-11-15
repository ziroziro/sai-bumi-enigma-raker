import { z } from "zod";
import {
  createDeptHeadSessionToken,
  DEPT_HEAD_COOKIE_NAME,
  verifyDeptHeadCredentials,
} from "@/server/dept-head-auth";
import { getPublicDeptHeadSnapshot } from "@/server/dept-head-service";

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

    const snapshot = await getPublicDeptHeadSnapshot(account.groupNumber);
    const token = createDeptHeadSessionToken(account.groupNumber);
    const response = Response.json({
      success: true,
      snapshot,
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
