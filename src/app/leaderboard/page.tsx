import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { LeaderboardApp } from "@/components/leaderboard-app";
import {
  getStageEssaySnapshot,
  hydrateStageEssayFromSupabase,
} from "@/server/stage-essay-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard Top 3 | Sai Bumi Enigma",
  description:
    "Pengumuman Leaderboard 3 Kelompok Teratas berdasarkan akumulasi nilai Spreadsheet di The Sai Bumi Enigma.",
};

export default async function LeaderboardPage() {
  await hydrateStageEssayFromSupabase();
  const snapshot = getStageEssaySnapshot();

  return (
    <>
      <a href="#main" className="skip-link">
        Langsung ke halaman Leaderboard
      </a>
      <SiteHeader activeNav="leaderboard" />
      <main id="main">
        <LeaderboardApp initialSnapshot={snapshot} />
      </main>
      <footer className="site-footer">
        <div className="tapis-line" aria-hidden="true" />
        <p>The Sai Bumi Enigma · Lampung · 2026</p>
      </footer>
    </>
  );
}
