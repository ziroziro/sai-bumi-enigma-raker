import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { DeptHeadApp, type PublicSilhouetteCard } from "@/components/dept-head-app";
import { getDeptHeadSnapshot } from "@/server/dept-head-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chief Detective | Sai Bumi Enigma",
  description:
    "Profil 7 siluet kartu karakter misterius Chief Detective di The Sai Bumi Enigma.",
};

export default async function ChiefDetectivePage() {
  const fullSnapshot = await getDeptHeadSnapshot();

  // Hanya kirim data siluet (tanpa realName dan tanpa revealImageUrl) untuk tampilan read-only
  const silhouetteCards: PublicSilhouetteCard[] = fullSnapshot.cards.map((card) => ({
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

  return (
    <>
      <a href="#main" className="skip-link">
        Langsung ke daftar kartu karakter Chief Detective
      </a>
      <SiteHeader activeNav="chief-detective" />
      <main id="main">
        <DeptHeadApp cards={silhouetteCards} />
      </main>
      <footer className="site-footer">
        <div className="tapis-line" aria-hidden="true" />
        <p>The Sai Bumi Enigma · Lampung · 2026</p>
      </footer>
    </>
  );
}
