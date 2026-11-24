import { event } from "@/config/event";
import { getDataConfiguration } from "@/server/config";
import { QuizApp } from "@/components/quiz-app";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export default function MissionPage() {
  return (
    <>
      <a href="#main" className="skip-link">Lewati ke konten utama</a>
      <SiteHeader activeNav="mission" />
      <main id="main" className="page-shell">
        <section className="hero" aria-labelledby="event-title">
          <div className="hero-eyebrow">
            <span className="eyebrow">THE SAI BUMI ENIGMA</span>
            <span className="edition">LAMPUNG · 2026</span>
          </div>
          <div className="hero-intro">
            <div>
              <span className="eyebrow">MISSION 1 – 5 · INVESTIGASI &amp; LOGIKA</span>
              <h1 id="event-title">
                MISSION<br /> <em>ENIGMA SAI BUMI</em>
                <span className="sr-only"> {event.name}</span>
              </h1>
            </div>
            <div className="hero-details">
              <p>
                Selamat datang di halaman Mission! Sesi Mission (Mission 1 sampai Mission 5) yang tampil di halaman ini otomatis mengikuti sesi yang sedang diaktifkan oleh Admin.
              </p>
              <p className="hero-instruction">
                Pilih <strong>nama Anda</strong> dari daftar peserta. Kelompok tim Anda akan terdeteksi secara otomatis (Lupin, Detectif Jubun, Conan, atau Holmes). Selesaikan <strong>15 soal</strong> dalam waktu <strong>5 menit</strong>.
              </p>
            </div>
          </div>
        </section>
        <QuizApp configuration={getDataConfiguration()} mode="all" />
      </main>
      <footer className="site-footer">
        <div className="tapis-line" aria-hidden="true" />
        <p>The Sai Bumi Enigma · Lampung · 2026</p>
      </footer>
    </>
  );
}
