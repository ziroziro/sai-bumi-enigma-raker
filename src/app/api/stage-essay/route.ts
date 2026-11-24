import { submitStageEssaySchema } from "@/domain/stage-essay";
import {
  getStageEssaySnapshot,
  hydrateStageEssayFromSupabase,
  persistSingleStageSubmissionToSupabase,
  persistStageEssayToSupabase,
  StageEssayError,
  submitGroupStageEssay,
  syncStageScoresFromGoogleSpreadsheet,
} from "@/server/stage-essay-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await hydrateStageEssayFromSupabase();
    const url = new URL(request.url);
    const shouldSync = url.searchParams.get("sync") === "1";
    const isLite = url.searchParams.get("lite") === "1";
    const stagePhotosMode = url.searchParams.get("stagePhotos");

    let snapshot = getStageEssaySnapshot();
    if (shouldSync && snapshot.spreadsheetUrl) {
      try {
        snapshot = await syncStageScoresFromGoogleSpreadsheet();
        await persistStageEssayToSupabase();
      } catch {
        snapshot = getStageEssaySnapshot();
      }
    }

    if (isLite) {
      snapshot = getStageEssaySnapshot({ includePhotos: false });
    } else if (stagePhotosMode === "active") {
      const targetStage = snapshot.displayAnswersStageNumber || snapshot.activeStageNumber || 1;
      snapshot = getStageEssaySnapshot({ includePhotos: true, photosOnlyForStage: targetStage });
    }

    return Response.json(snapshot, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat data sesi.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await hydrateStageEssayFromSupabase();
    const rawBody = await request.json().catch(() => null);
    const parsed = submitStageEssaySchema.safeParse(rawBody);
    if (!parsed.success) {
      return Response.json(
        {
          error: parsed.error.issues[0]?.message || "Data form tidak lengkap.",
          code: "INVALID_PAYLOAD",
        },
        { status: 400 }
      );
    }

    const result = submitGroupStageEssay(parsed.data);

    // Simpan ke baris individual per-kelompok-per-sesi (100% anti race-condition walau 4 kelompok submit bersamaan)
    await persistSingleStageSubmissionToSupabase(result.submission);

    const fullSnapshot = result.snapshot;
    const stageInfo = fullSnapshot.stages.find(
      (s) => s.stageNumber === result.submission.stageNumber
    );
    if (stageInfo?.isAllGroupsSubmitted && fullSnapshot.spreadsheetUrl) {
      try {
        await syncStageScoresFromGoogleSpreadsheet();
        await persistStageEssayToSupabase();
      } catch {
        // ignore spreadsheet sync errors on submit
      }
    }

    const liteSnapshot = getStageEssaySnapshot({ includePhotos: false });

    return Response.json(
      {
        success: true,
        message: `Terima kasih! Jawaban dari ${result.submission.groupName} sudah berhasil disimpan.`,
        submission: { ...result.submission, photoDataUrl: null },
        snapshot: liteSnapshot,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof StageEssayError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Gagal menyimpan jawaban.";
    return Response.json({ error: message }, { status: 500 });
  }
}
