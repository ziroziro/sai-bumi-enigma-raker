import type { Metadata } from "next";
import { BlindPickApp } from "@/components/blind-pick-app";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blind Pick Black Dossier | Sai Bumi Enigma",
  description:
    "Halaman Blind Pick Amplop Hitam Rahasia (Kartu Shield & Penyelamatan Penjara) The Sai Bumi Enigma.",
};

export default function BlindPickBlackPage() {
  return (
    <>
      <a href="#main" className="skip-link">
        Langsung ke Blind Pick Amplop Hitam
      </a>
      <SiteHeader />
      <main id="main">
        <BlindPickApp variant="black" />
      </main>
      <footer className="site-footer">
        <div className="tapis-line" aria-hidden="true" />
        <p>The Sai Bumi Enigma · Lampung · 2026</p>
      </footer>
    </>
  );
}
