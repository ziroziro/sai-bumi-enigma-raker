export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return Response.json(
    {
      error:
        "Login dan pemilihan Chief Detective oleh peserta sudah dinonaktifkan. Pemilihan dan reveal dilakukan langsung oleh Admin.",
    },
    { status: 403 }
  );
}
