import { getDeptHeadSnapshot } from "@/server/dept-head-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const fullSnapshot = await getDeptHeadSnapshot();
    const cards = fullSnapshot.cards.map((card) => ({
      id: card.id,
      code: card.code,
      title: card.title,
      roleHint: card.roleHint,
      description: card.description,
      power: card.power,
      defense: card.defense,
      silhouetteVariant: card.silhouetteVariant,
      customImageUrl: card.customImageUrl,
    }));

    return Response.json(
      {
        readonly: true,
        cards,
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
