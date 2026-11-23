import type { Metadata } from "next";
import { BlindPickApp } from "@/components/blind-pick-app";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blind Pick Berkas Rahasia | Sai Bumi Enigma",
  description:
    "Halaman Blind Pick 5 berkas rahasia untuk memilih dan mengungkap kartu kekuatan The Sai Bumi Enigma.",
};

export default function BlindPickPage() {
  return (
    <>
      <a href="#main" className="skip-link">
        Langsung ke Blind Pick Berkas Rahasia
      </a>
      <SiteHeader />
      <main id="main">
        <BlindPickApp />
      </main>
      <footer className="site-footer">
        <div className="tapis-line" aria-hidden="true" />
        <p>The Sai Bumi Enigma · Lampung · 2026</p>
      </footer>
    </>
  );
}
