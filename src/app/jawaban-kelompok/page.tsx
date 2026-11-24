import type { Metadata } from "next";
import { GroupAnswersApp } from "@/components/group-answers-app";
import { SiteHeader } from "@/components/site-header";
import {
  getStageEssaySnapshot,
  hydrateStageEssayFromSupabase,
} from "@/server/stage-essay-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jawaban Kelompok | Sai Bumi Enigma",
  description:
    "Tampilan kartu jawaban dari 4 kelompok peserta Misi Investigasi The Sai Bumi Enigma.",
};

export default async function JawabanKelompokPage() {
  await hydrateStageEssayFromSupabase();
  const snapshot = getStageEssaySnapshot();

  return (
    <>
      <a href="#main" className="skip-link">
        Langsung ke Jawaban Kelompok
      </a>
      <SiteHeader />
      <main id="main">
        <GroupAnswersApp initialSnapshot={snapshot} />
      </main>
      <footer className="site-footer">
        <div className="tapis-line" aria-hidden="true" />
        <p>The Sai Bumi Enigma · Lampung · 2026</p>
      </footer>
    </>
  );
}
