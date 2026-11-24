import { issueAdminToken, verifyAdminPassword } from "@/server/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (!password || !verifyAdminPassword(String(password))) {
      return Response.json({ error: "Password admin tidak sesuai." }, { status: 401 });
    }

    const { token, expiresAt } = issueAdminToken();
    return Response.json(
      {
        success: true,
        token,
        expiresAt,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch {
    return Response.json({ error: "Gagal memproses autentikasi admin." }, { status: 500 });
  }
}

