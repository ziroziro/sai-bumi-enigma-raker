import { event } from "@/config/event";
import { getDataConfiguration } from "@/server/config";
import { QuizApp } from "@/components/quiz-app";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export default function QuizPage() {
  return (
    <>
      <a href="#main" className="skip-link">Lewati ke konten utama</a>
      <SiteHeader activeNav="quiz" />
      <main id="main" className="page-shell">
        <section className="hero" aria-labelledby="event-title">
          <div className="hero-eyebrow">
            <span className="eyebrow">THE SAI BUMI ENIGMA</span>
            <span className="edition">LAMPUNG · 2026</span>
          </div>
          <div className="hero-intro">
            <div>
              <span className="eyebrow">MISI PENELUSURAN & LOGIKA</span>
              <h1 id="event-title">
                QUIZ INVESTIGASI<br /> <em>ENIGMA SAI BUMI</em>
                <span className="sr-only"> {event.name}</span>
              </h1>
            </div>
            <div className="hero-details">
              <p>
                Selamat datang di halaman Quiz! Sesi Quiz yang tampil di halaman ini otomatis mengikuti Quiz yang sedang diaktifkan oleh Admin.
              </p>
              <p className="hero-instruction">
                Pilih <strong>nama Anda</strong> dari daftar peserta. Selesaikan <strong>15 soal</strong> dalam waktu <strong>10 menit</strong> (KKM: <strong>80</strong>).
              </p>
            </div>
          </div>
        </section>
        <QuizApp configuration={getDataConfiguration()} mode="quiz" />
      </main>
      <footer className="site-footer">
        <div className="tapis-line" aria-hidden="true" />
        <div>
          <span>THE SAI BUMI ENIGMA</span>
          <p>Merangkai langkah. Menemukan cerita.</p>
          <span>LAMPUNG · 2026</span>
        </div>
      </footer>
    </>
  );
}
