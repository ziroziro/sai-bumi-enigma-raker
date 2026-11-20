import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { StageEssayApp } from "@/components/stage-essay-app";
import { getStageEssaySnapshot } from "@/server/stage-essay-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stage Essay & Leaderboard | Sai Bumi Enigma",
  description:
    "Form submit essay per kelompok untuk 10 sesi stage investigasi beserta Leaderboard 3 Teratas dari spreadsheet penilaian.",
};

export default async function StagePage() {
  const snapshot = getStageEssaySnapshot();

  return (
    <>
      <a href="#main" className="skip-link">
        Langsung ke halaman Stage Essay &amp; Leaderboard
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
