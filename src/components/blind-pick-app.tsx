"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PowerTone = "crimson" | "gold" | "cyan" | "violet" | "amber" | "smoke";

interface BlindPowerItem {
  id: string;
  code: string;
  category: string;
  title: string;
  description: string;
  tone: PowerTone;
  imageSrc: string;
}

interface EnvelopeSlot {
  slotNumber: number;
  power: BlindPowerItem;
  phase: "closed" | "flipped" | "opened";
}

const SAMPLE_POWERS: BlindPowerItem[] = [
  {
    id: "prison-1",
    code: "SABOTASE · 01",
    category: "KASUS TERTUTUP: MASUK PENJARA",
    title: "Mengurangi 1 orang dari tim lawan (Masuk Penjara)",
    description:
      "Target langsung dikurung di sel penjara, kehilangan giliran atau dikeluarkan sementara.",
    tone: "crimson",
    imageSrc: "/images/blind-pick/dossier-masuk-penjara.png",
  },
  {
    id: "prison-2",
    code: "SABOTASE · 02",
    category: "KASUS TERTUTUP: MASUK PENJARA",
    title: "Mengurangi 1 orang dari tim lawan (Masuk Penjara)",
    description:
      "Target langsung dikurung di sel penjara, kehilangan giliran atau dikeluarkan sementara.",
    tone: "crimson",
    imageSrc: "/images/blind-pick/dossier-masuk-penjara.png",
  },
  {
    id: "swap-member-1",
    code: "ROTASI · 03",
    category: "MUTASI DETEKTIF",
    title: "Tukar Anggota tim non ketua (Permanent)",
    description:
      "Tukarkan 1 anggota tim Anda (selain ketua) dengan 1 anggota dari tim lawan secara permanen.",
    tone: "cyan",
    imageSrc: "/images/blind-pick/dossier-tukar-anggota.png",
  },
  {
    id: "swap-member-2",
    code: "ROTASI · 04",
    category: "MUTASI DETEKTIF",
    title: "Tukar Anggota tim non ketua (Permanent)",
    description:
      "Tukarkan 1 anggota tim Anda (selain ketua) dengan 1 anggota dari tim lawan secara permanen.",
    tone: "cyan",
    imageSrc: "/images/blind-pick/dossier-tukar-anggota.png",
  },
  {
    id: "zonk-1",
    code: "KOSONG · 05",
    category: "ZONK · NIHIL",
    title: "Zonk",
    description:
      "Penyelidikan kali ini tidak membuahkan hasil sama sekali. Tidak ada poin dan tidak ada efek.",
    tone: "smoke",
    imageSrc: "/images/blind-pick/dossier-zonk.png",
  },
];

const BLACK_POWERS: BlindPowerItem[] = [
  {
    id: "shield-1",
    code: "PERISAI · 01",
    category: "SHIELD · PERLINDUNGAN",
    title: "Kartu Shield",
    description:
      "Dapat menahan serangan dari serangan apapun selama satu sesi.",
    tone: "cyan",
    imageSrc: "/images/blind-pick/dossier-shield.png",
  },
  {
    id: "rescue-1",
    code: "PENYELAMATAN · 02",
    category: "BEBAS PENJARA",
    title: "Menyelamatkan Siapapun dari Penjara",
    description:
      "Gunakan kartu ini untuk menyelamatkan siapapun yang berada di penjara agar langsung bebas kembali.",
    tone: "gold",
    imageSrc: "/images/blind-pick/dossier-rescue-v2.png",
  },
  {
    id: "jubir-1",
    code: "INTERVENSI · 03",
    category: "HAK TUNJUK JUBIR",
    title: "Menunjuk Jubir Kelompok Lain",
    description:
      "Anda berhak menunjuk siapa yang menjadi juru bicara dari kelompok lawan pada sesi presentasi.",
    tone: "violet",
    imageSrc: "/images/blind-pick/dossier-jubir.png",
  },
  {
    id: "jail-immune-1",
    code: "IMUNITAS · 04",
    category: "KEBAL PENJARA",
    title: "Bebas Penjara (Next Mission)",
    description:
      "Imunitas penuh! Tidak bisa masuk penjara pada Next Mission berikutnya.",
    tone: "amber",
    imageSrc: "/images/blind-pick/dossier-kebal-penjara.png",
  },
  {
    id: "black-zonk-1",
    code: "KOSONG · 05",
    category: "ZONK · NIHIL",
    title: "Zonk",
    description:
      "Penyelidikan kali ini tidak membuahkan hasil sama sekali. Tidak ada poin dan tidak ada efek.",
    tone: "smoke",
    imageSrc: "/images/blind-pick/dossier-zonk.png",
  },
];

function shufflePowers(items: BlindPowerItem[]): BlindPowerItem[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = copy[i];
    const target = copy[j];
    if (current && target) {
      copy[i] = target;
      copy[j] = current;
    }
  }
  return copy;
}

function createInitialEnvelopes(
  shouldShuffle: boolean,
  sourcePowers: BlindPowerItem[] = SAMPLE_POWERS
): EnvelopeSlot[] {
  const ordered = shouldShuffle ? shufflePowers(sourcePowers) : sourcePowers;
  return ordered.map((power, idx) => ({
    slotNumber: idx + 1,
    power,
    phase: "closed",
  }));
}

function WaxSealSvg({ uid }: { uid: string }) {
  return (
    <svg viewBox="0 0 110 110" className="blind-wax-svg" aria-hidden="true">
      <defs>
        <radialGradient id={`wax-body-${uid}`} cx="34%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#d94b42" />
          <stop offset="46%" stopColor="#9c1f1a" />
          <stop offset="82%" stopColor="#65100d" />
          <stop offset="100%" stopColor="#420806" />
        </radialGradient>
        <radialGradient id={`wax-core-${uid}`} cx="38%" cy="34%" r="65%">
          <stop offset="0%" stopColor="#b82c24" />
          <stop offset="68%" stopColor="#7c1511" />
          <stop offset="100%" stopColor="#520b09" />
        </radialGradient>
        <filter id={`wax-shadow-${uid}`} x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#1c0805" floodOpacity="0.6" />
        </filter>
      </defs>

      <path
        d="M55,6 C63,5 70,10 77,11 C85,12 92,19 95,27 C99,34 103,41 102,49 C101,57 105,65 100,72 C96,79 94,87 87,92 C80,97 73,99 65,102 C57,105 48,103 40,101 C32,99 24,96 19,89 C14,82 9,75 8,66 C7,58 5,49 9,41 C13,33 13,24 20,18 C27,12 36,11 44,8 C48,7 51,6 55,6 Z"
        fill={`url(#wax-body-${uid})`}
        filter={`url(#wax-shadow-${uid})`}
      />
      <path
        d="M23,36 C26,23 39,15 54,15 C68,15 80,22 86,33"
        fill="none"
        stroke="#f48b7e"
        strokeOpacity="0.38"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle
        cx="55"
        cy="55"
        r="34"
        fill={`url(#wax-core-${uid})`}
        stroke="#4a0907"
        strokeWidth="2.4"
      />
      <circle
        cx="55"
        cy="55"
        r="30.5"
        fill="none"
        stroke="#e58a7c"
        strokeOpacity="0.35"
        strokeWidth="1.2"
        strokeDasharray="3 2.5"
      />
      <polygon
        points="55,31 59.5,48.5 77,55 59.5,61.5 55,79 50.5,61.5 33,55 50.5,48.5"
        fill="#d75a4e"
        fillOpacity="0.45"
        stroke="#420706"
        strokeWidth="1.4"
      />
      <circle
        cx="55"
        cy="55"
        r="7"
        fill="#8b1b16"
        stroke="#f0a294"
        strokeOpacity="0.45"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function playEnvelopeSound(type: "flip" | "open" | "zonk") {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === "flip") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(460, now + 0.16);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.21);
      return;
    }

    if (type === "zonk") {
      const notes = [280, 210];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);
        gain.gain.setValueAtTime(0.05, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.25);
      });
      return;
    }

    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.065);
      gain.gain.setValueAtTime(0.075, now + idx * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.065 + 0.48);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + 0.5);
    });
  } catch {
    // ignore audio autoplay restriction
  }
}

export function BlindPickApp({ variant = "classic" }: { variant?: "classic" | "black" }) {
  const isBlack = variant === "black";
  const powerList = isBlack ? BLACK_POWERS : SAMPLE_POWERS;
  const [envelopes, setEnvelopes] = useState<EnvelopeSlot[]>(() =>
    createInitialEnvelopes(false, powerList)
  );
  const [zoomedSlot, setZoomedSlot] = useState<EnvelopeSlot | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const timersRef = useRef<number[]>([]);

  const clearPendingTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    setEnvelopes(createInitialEnvelopes(true, powerList));
    return () => clearPendingTimers();
  }, [clearPendingTimers, powerList]);

  useEffect(() => {
    if (!zoomedSlot) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomedSlot(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomedSlot]);

  const handlePickEnvelope = (slotNumber: number) => {
    if (isShuffling) return;
    const target = envelopes.find((item) => item.slotNumber === slotNumber);
    if (!target) return;

    // Jika sudah terbuka, klik lagi akan langsung zoom-in berkas
    if (target.phase === "opened") {
      setZoomedSlot(target);
      return;
    }

    if (target.phase !== "closed") return;

    playEnvelopeSound("flip");

    setEnvelopes((prev) =>
      prev.map((item) =>
        item.slotNumber === slotNumber ? { ...item, phase: "flipped" } : item
      )
    );

    // Tahap 2: Lipatan terbuka natural dan berkas meluncur keluar
    const openTimer = window.setTimeout(() => {
      setEnvelopes((prev) =>
        prev.map((item) =>
          item.slotNumber === slotNumber ? { ...item, phase: "opened" } : item
        )
      );
      playEnvelopeSound(target.power.tone === "smoke" ? "zonk" : "open");
    }, 430);

    // Tahap 3: Berkas langsung zoom keluar ke tengah layar
    const zoomTimer = window.setTimeout(() => {
      setZoomedSlot({ ...target, phase: "opened" });
    }, 980);

    timersRef.current.push(openTimer, zoomTimer);
  };

  const handleResetShuffle = () => {
    clearPendingTimers();
    setZoomedSlot(null);
    setIsShuffling(true);
    setEnvelopes((prev) => prev.map((item) => ({ ...item, phase: "closed" })));

    const shuffleTimer = window.setTimeout(() => {
      setEnvelopes(createInitialEnvelopes(true, powerList));
      setIsShuffling(false);
    }, 480);

    timersRef.current.push(shuffleTimer);
  };

  const handleRevealAll = () => {
    clearPendingTimers();
    setZoomedSlot(null);
    playEnvelopeSound("flip");

    setEnvelopes((prev) =>
      prev.map((item) => (item.phase === "closed" ? { ...item, phase: "flipped" } : item))
    );

    const openTimer = window.setTimeout(() => {
      setEnvelopes((prev) => prev.map((item) => ({ ...item, phase: "opened" })));
      playEnvelopeSound("open");
    }, 440);

    timersRef.current.push(openTimer);
  };

  const openedCount = envelopes.filter((item) => item.phase === "opened").length;

  return (
    <div className="blind-pick-backdrop">
      <section className={`blind-pick-stage ${isBlack ? "is-black-variant" : ""}`}>
        <div className="blind-pick-header">
          <p className="eyebrow">
            {isBlack
              ? "WHITE DOSSIER · KARTU PERLINDUNGAN & PENYELAMATAN"
              : "BLIND PICK · KARTU KEKUATAN RAHASIA"}
          </p>
          <h1 className="blind-pick-title">
            {isBlack ? "PILIH AMPLOP PUTIH" : "PILIH BERKAS MISTERI"}
          </h1>
          <p className="blind-pick-subtitle">
            {isBlack
              ? "Pilih salah satu amplop putih tersegel untuk mengungkap kartu rahasia di dalamnya."
              : "Pilih salah satu berkas tersegel untuk membalik, membuka segel lilin, dan mengungkap kartu kekuatan rahasia di dalamnya."}
          </p>

          <div className="blind-pick-toolbar">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRevealAll}
              disabled={openedCount === powerList.length || isShuffling}
            >
              Buka Semua
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleResetShuffle}
              disabled={isShuffling}
            >
              {isShuffling ? "Mengacak..." : "Acak Ulang Berkas"}
            </button>
          </div>
        </div>

        <div className={`blind-envelope-grid ${isShuffling ? "is-shuffling" : ""}`}>
          {envelopes.map((item) => {
            const isFlipped = item.phase === "flipped" || item.phase === "opened";
            const isOpened = item.phase === "opened";

            return (
              <button
                key={item.slotNumber}
                type="button"
                className={`blind-envelope-card is-tone-${item.power.tone} ${
                  isFlipped ? "is-flipped" : ""
                } ${isOpened ? "is-opened" : ""}`}
                onClick={() => handlePickEnvelope(item.slotNumber)}
                disabled={item.phase === "flipped" || isShuffling}
                aria-label={
                  isOpened
                    ? `Perbesar berkas: ${item.power.title}`
                    : `Pilih berkas rahasia`
                }
              >
                <div className="blind-envelope-inner">
                  {/* Sisi Depan Berkas Tersegel */}
                  <div className="blind-envelope-face blind-envelope-front">
                    <svg
                      viewBox="0 0 260 150"
                      preserveAspectRatio="none"
                      className="blind-front-flap-svg"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient
                          id={`front-flap-${item.slotNumber}`}
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor={isBlack ? "#ffffff" : "#e3c8a2"} />
                          <stop offset="68%" stopColor={isBlack ? "#f1efe9" : "#c9a374"} />
                          <stop offset="100%" stopColor={isBlack ? "#dfdcd4" : "#b28757"} />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,0 L260,0 L260,18 L146,128 Q130,143 114,128 L0,18 Z"
                        fill={`url(#front-flap-${item.slotNumber})`}
                      />
                    </svg>
                    <div className="blind-front-frame">
                      <div className="blind-wax-seal" aria-hidden="true">
                        <WaxSealSvg uid={`seal-${item.slotNumber}`} />
                      </div>
                      <span className="blind-envelope-number" aria-hidden="true">
                        {String(item.slotNumber).padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  {/* Sisi Belakang Berkas (Natural Manila Document Envelope) */}
                  <div className="blind-envelope-face blind-envelope-back">
                    {/* Layer 1: Dinding Dalam Kantong Berkas */}
                    <div className="blind-back-pocket" aria-hidden="true">
                      <div className="blind-pocket-interior-shadow" />
                    </div>

                    {/* Layer 2: Lipatan Penutup Atas (Terlipat di Belakang Kartu saat Terbuka) */}
                    <div className="blind-back-flap" aria-hidden="true">
                      <svg
                        viewBox="0 0 260 110"
                        preserveAspectRatio="none"
                        className="blind-back-flap-svg"
                      >
                        <defs>
                          <linearGradient
                            id={`back-flap-${item.slotNumber}`}
                            x1="0%"
                            y1="0%"
                            x2="0%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor={isBlack ? "#f8f7f3" : "#d9b98f"} />
                            <stop offset="68%" stopColor={isBlack ? "#eae7e0" : "#be9668"} />
                            <stop offset="100%" stopColor={isBlack ? "#d8d4ca" : "#9f7649"} />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,0 L260,0 L260,18 L152,96 Q130,110 108,96 L0,18 Z"
                          fill={`url(#back-flap-${item.slotNumber})`}
                        />
                      </svg>
                    </div>

                    {/* Layer 3: Berkas Dossier yang Meluncur Keluar di Depan Lipatan */}
                    <div className="blind-power-card is-illustrated">
                      <img
                        src={item.power.imageSrc}
                        alt={item.power.title}
                        className="blind-power-card-img"
                      />
                    </div>

                    {/* Layer 4: Kantong Depan Bawah dengan Lekukan Ibu Jari (Thumb Notch) */}
                    <div className="blind-back-lip" aria-hidden="true">
                      <svg
                        viewBox="0 0 260 115"
                        preserveAspectRatio="none"
                        className="blind-back-lip-svg"
                      >
                        <defs>
                          <linearGradient
                            id={`back-lip-${item.slotNumber}`}
                            x1="0%"
                            y1="0%"
                            x2="0%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor={isBlack ? "#faf9f6" : "#d6b58b"} />
                            <stop offset="55%" stopColor={isBlack ? "#eceae4" : "#be9567"} />
                            <stop offset="100%" stopColor={isBlack ? "#dcd8ce" : "#a47b4d"} />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,12 L96,12 Q130,36 164,12 L260,12 L260,115 L0,115 Z"
                          fill={`url(#back-lip-${item.slotNumber})`}
                        />
                        <path
                          d="M0,12 L96,12 Q130,36 164,12 L260,12"
                          fill="none"
                          stroke={isBlack ? "#b8a88a" : "#f4dec0"}
                          strokeOpacity={isBlack ? "0.65" : "0.45"}
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Zoom-Out Spotlight Modal saat Berkas Keluar */}
        {zoomedSlot ? (
          <div
            className={`blind-zoom-overlay is-tone-${zoomedSlot.power.tone}`}
            role="dialog"
            aria-modal="true"
            aria-label={zoomedSlot.power.title}
            onClick={() => setZoomedSlot(null)}
          >
            <div className="blind-zoom-stage" onClick={(e) => e.stopPropagation()}>
              <div className="blind-zoom-aura" aria-hidden="true" />
              <div className="blind-zoom-card-wrap">
                <img
                  src={zoomedSlot.power.imageSrc}
                  alt={zoomedSlot.power.title}
                  className="blind-zoom-card-img"
                />
              </div>
              <button
                type="button"
                className="blind-zoom-close"
                onClick={() => setZoomedSlot(null)}
              >
                Tutup Berkas
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
