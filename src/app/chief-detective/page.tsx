import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { DeptHeadApp } from "@/components/dept-head-app";
import { getDeptHeadSnapshot } from "@/server/dept-head-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chief Detective Resmi Terungkap | Sai Bumi Enigma",
  description:
    "Jajaran 7 Chief Detective The Sai Bumi Enigma — Project Development Day 2027.",
};

export default async function ChiefDetectivePage() {
  const fullSnapshot = await getDeptHeadSnapshot();

  return (
    <>
      <a href="#main" className="skip-link">
        Langsung ke daftar kartu karakter Chief Detective
      </a>
      <SiteHeader activeNav="chief-detective" />
      <main id="main">
        <DeptHeadApp
          cards={fullSnapshot.cards}
          takenCardIds={fullSnapshot.takenCardIds}
        />
      </main>
    </>
  );
}
