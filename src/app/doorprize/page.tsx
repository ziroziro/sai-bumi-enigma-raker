import type { Metadata } from "next";
import { DoorprizeApp } from "@/components/doorprize-app";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Undian Amplop Pemenang | Sai Bumi Enigma",
  description:
    "Halaman undian acak amplop bernomor untuk memilih pemenang The Sai Bumi Enigma.",
};

export default function DoorprizePage() {
  return (
    <>
      <a href="#main" className="skip-link">
        Langsung ke Undian Pemenang
      </a>
      <SiteHeader />
      <main id="main">
        <DoorprizeApp />
      </main>
      <footer className="site-footer">
        <div className="tapis-line" aria-hidden="true" />
        <p>The Sai Bumi Enigma · Lampung · 2026</p>
      </footer>
    </>
  );
}
