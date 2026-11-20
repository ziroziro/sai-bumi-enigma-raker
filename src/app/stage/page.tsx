import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { StageEssayApp } from "@/components/stage-essay-app";
import { getStageEssaySnapshot } from "@/server/stage-essay-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Misi Investigasi | Sai Bumi Enigma",
  description:
    "Form pengumpulan jawaban kelompok pada sesi Misi Investigasi The Sai Bumi Enigma.",
};

export default async function StagePage() {
  const snapshot = getStageEssaySnapshot();

  return (
    <>
      <a href="#main" className="skip-link">
        Langsung ke form Misi Investigasi
      </a>
      <SiteHeader activeNav="stage" />
      <main id="main">
        <StageEssayApp initialSnapshot={snapshot} />
      </main>
      <footer className="site-footer">
        <div className="tapis-line" aria-hidden="true" />
        <p>The Sai Bumi Enigma · Lampung · 2026</p>
      </footer>
    </>
  );
}
