import { getDeptHeadSnapshot } from "@/server/dept-head-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const fullSnapshot = await getDeptHeadSnapshot();

    return Response.json(
      {
        readonly: true,
        revealed: true,
        cards: fullSnapshot.cards,
        takenCardIds: fullSnapshot.takenCardIds,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat data karakter.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  return Response.json(
    {
      error:
        "Pemilihan Chief Detective tidak lagi dilakukan dari halaman peserta. Silakan gunakan halaman Reveal Admin.",
      code: "READONLY_PAGE",
    },
    { status: 403 }
  );
}
