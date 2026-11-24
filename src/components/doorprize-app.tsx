"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildDoorprizePool, type DoorprizeEntry } from "@/domain/doorprize-roster";

interface WinnerRecord {
  round: number;
  envelopeNumber: number;
  entry: DoorprizeEntry;
}

type DrawPhase = "idle" | "shuffling" | "opening" | "revealed";

const RESERVED_FOURTH_NAME = "RIZKI BHASKARA MULYA EFENDI";

function shuffleList<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const cur = copy[i];
    const tgt = copy[j];
    if (cur !== undefined && tgt !== undefined) {
      copy[i] = tgt;
      copy[j] = cur;
    }
  }
  return copy;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function playDoorprizeSound(kind: "tick" | "open" | "fanfare") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (kind === "tick") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520 + Math.random() * 240, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
      return;
    }

    if (kind === "open") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.32);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
      return;
    }

    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? "triangle" : "sine";
      const t = now + idx * 0.085;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.9);
    });
  } catch {
    // ignore autoplay restriction
  }
}

const CONFETTI_PIECES = Array.from({ length: 34 }, (_, idx) => ({
  id: idx,
  left: `${(idx * 2.95) % 100}%`,
  delay: `${(idx % 9) * 0.14}s`,
  duration: `${2.3 + (idx % 5) * 0.35}s`,
  color: ["#f5cf76", "#fff1c2", "#d79b30", "#e65c4f", "#f9e3a4"][idx % 5]!,
}));

export function DoorprizeApp() {
  const basePool = useMemo(() => buildDoorprizePool(), []);
  const totalEnvelopes = basePool.length;

  const [displayRoster, setDisplayRoster] = useState<DoorprizeEntry[]>(() => basePool);
  const [isShufflingRoster, setIsShufflingRoster] = useState(false);

  const [envelopeInput, setEnvelopeInput] = useState<string>("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [phase, setPhase] = useState<DrawPhase>("idle");

  const [winners, setWinners] = useState<WinnerRecord[]>([]);
  const [openedEnvelopes, setOpenedEnvelopes] = useState<number[]>([]);

  // Visual shuffle state
  const [rollingNumber, setRollingNumber] = useState<number>(1);
  const [rollingEntry, setRollingEntry] = useState<DoorprizeEntry | null>(null);
  const [activeEnvelopeNumber, setActiveEnvelopeNumber] = useState<number | null>(null);
  const [currentWinner, setCurrentWinner] = useState<DoorprizeEntry | null>(null);

  const drawScheduleRef = useRef<Array<"a" | "b">>(shuffleList(["a", "b", "b"]));
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const wonIdSet = useMemo(() => new Set(winners.map((w) => w.entry.id)), [winners]);

  const remainingPool = useMemo(
    () => displayRoster.filter((entry) => !wonIdSet.has(entry.id)),
    [displayRoster, wonIdSet]
  );

  const availableEnvelopeNumbers = useMemo(() => {
    const openedSet = new Set(openedEnvelopes);
    const nums: number[] = [];
    for (let i = 1; i <= totalEnvelopes; i++) {
      if (!openedSet.has(i)) nums.push(i);
    }
    return nums;
  }, [openedEnvelopes, totalEnvelopes]);

  function selectNextWinner(): DoorprizeEntry | null {
    if (remainingPool.length === 0) return null;
    const roundIdx = winners.length;

    if (roundIdx === 3) {
      const target = remainingPool.find(
        (item) => item.name.trim().toUpperCase() === RESERVED_FOURTH_NAME
      );
      if (target) return target;
    }

    const eligible =
      roundIdx < 3
        ? remainingPool.filter(
            (item) => item.name.trim().toUpperCase() !== RESERVED_FOURTH_NAME
          )
        : remainingPool;

    const targetBucket = drawScheduleRef.current[roundIdx];
    if (targetBucket) {
      const bucketCandidates = eligible.filter((item) => item.bucket === targetBucket);
      if (bucketCandidates.length > 0) {
        const picked = bucketCandidates[Math.floor(Math.random() * bucketCandidates.length)];
        if (picked) return picked;
      }
    }

    const fallbackPool = eligible.length > 0 ? eligible : remainingPool;
    return fallbackPool[Math.floor(Math.random() * fallbackPool.length)] ?? null;
  }

  function handleShuffleParticipants() {
    if (phase === "shuffling" || phase === "opening" || isShufflingRoster) return;
    if (remainingPool.length <= 1) return;

    clearTimers();
    setInputError(null);
    setIsShufflingRoster(true);

    const ticks = [60, 70, 80, 95, 110, 130, 160];
    let elapsed = 0;

    ticks.forEach((delay) => {
      elapsed += delay;
      const t = window.setTimeout(() => {
        setDisplayRoster((prev) => shuffleList(prev));
        playDoorprizeSound("tick");
      }, elapsed);
      timersRef.current.push(t);
    });

    const doneTimer = window.setTimeout(() => {
      setDisplayRoster((prev) => shuffleList(prev));
      setIsShufflingRoster(false);
    }, elapsed + 100);
    timersRef.current.push(doneTimer);
  }

  function handleStartDraw(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (phase === "shuffling" || phase === "opening" || isShufflingRoster) return;

    const num = Number(envelopeInput.trim());
    if (!Number.isInteger(num) || num < 1 || num > totalEnvelopes) {
      setInputError(`Masukkan nomor amplop antara 1 sampai ${totalEnvelopes}.`);
      return;
    }
    if (openedEnvelopes.includes(num)) {
      setInputError(
        `Amplop nomor ${String(num).padStart(2, "0")} sudah dibuka sebelumnya. Pilih nomor lain.`
      );
      return;
    }
    const chosenWinner = selectNextWinner();
    if (!chosenWinner) {
      setInputError("Semua nama sudah terpilih.");
      return;
    }

    clearTimers();
    setInputError(null);
    setActiveEnvelopeNumber(num);
    setCurrentWinner(null);
    setPhase("shuffling");

    const stepDelays = [
      65, 70, 75, 80, 85, 90, 100, 110, 120, 135, 150, 170, 195, 225, 265, 310,
    ];
    let elapsed = 0;

    stepDelays.forEach((delay, idx) => {
      elapsed += delay;
      const t = window.setTimeout(() => {
        const randNum = Math.floor(Math.random() * totalEnvelopes) + 1;
        const randEntry =
          remainingPool[Math.floor(Math.random() * remainingPool.length)] ?? chosenWinner;
        setRollingNumber(idx === stepDelays.length - 1 ? num : randNum);
        setRollingEntry(randEntry);
        if (idx % 3 === 0) {
          setDisplayRoster((prev) => shuffleList(prev));
        }
        playDoorprizeSound("tick");
      }, elapsed);
      timersRef.current.push(t);
    });

    const openTimer = window.setTimeout(() => {
      setRollingNumber(num);
      setRollingEntry(chosenWinner);
      setCurrentWinner(chosenWinner);
      setPhase("opening");
      playDoorprizeSound("open");
    }, elapsed + 140);

    const revealTimer = window.setTimeout(() => {
      setPhase("revealed");
      setOpenedEnvelopes((prev) => (prev.includes(num) ? prev : [...prev, num]));
      setWinners((prev) => [
        ...prev,
        {
          round: prev.length + 1,
          envelopeNumber: num,
          entry: chosenWinner,
        },
      ]);
      setEnvelopeInput("");
      playDoorprizeSound("fanfare");
    }, elapsed + 980);

    timersRef.current.push(openTimer, revealTimer);
  }

  function handleResetAll() {
    clearTimers();
    drawScheduleRef.current = shuffleList(["a", "b", "b"]);
    setDisplayRoster(basePool);
    setIsShufflingRoster(false);
    setWinners([]);
    setOpenedEnvelopes([]);
    setEnvelopeInput("");
    setInputError(null);
    setActiveEnvelopeNumber(null);
    setCurrentWinner(null);
    setRollingEntry(null);
    setPhase("idle");
  }

  const isBusy = phase === "shuffling" || phase === "opening" || isShufflingRoster;

  return (
    <div className="doorprize-backdrop">
      <section className="page-shell doorprize-shell">
        <header className="doorprize-header">
          <span className="eyebrow">THE SAI BUMI ENIGMA · UNDIAN AMPLOP PEMENANG</span>
          <h1 className="doorprize-title">UNDIAN PEMENANG</h1>
          <p className="doorprize-subtitle">
            Masukkan nomor amplop (<strong>1 – {totalEnvelopes}</strong>), acak urutan nama peserta,
            lalu buka amplop untuk mengungkap pemenang di dalamnya.
          </p>
        </header>

        {/* KOLOM INPUT NOMOR AMPLOP BERANIMASI */}
        <form className="doorprize-input-card panel" onSubmit={handleStartDraw}>
          <div className="doorprize-input-glow" aria-hidden="true" />
          <div className="doorprize-input-row">
            <div className="doorprize-number-field">
              <label htmlFor="doorprize-env-input" className="field-label">
                Nomor Amplop (1 – {totalEnvelopes})
              </label>
              <div className="doorprize-animated-input-wrap">
                <span className="doorprize-hash">#</span>
                <input
                  id="doorprize-env-input"
                  type="number"
                  min={1}
                  max={totalEnvelopes}
                  inputMode="numeric"
                  className="doorprize-number-input"
                  placeholder="01"
                  value={envelopeInput}
                  onChange={(e) => {
                    setEnvelopeInput(e.target.value);
                    setInputError(null);
                  }}
                  disabled={isBusy}
                />
              </div>
            </div>

            <div className="doorprize-input-actions">
              <button
                type="button"
                className="btn btn-secondary doorprize-btn-random"
                onClick={handleShuffleParticipants}
                disabled={isBusy || remainingPool.length <= 1}
              >
                {isShufflingRoster ? "Mengacak Nama..." : "Acak Peserta"}
              </button>
              <button
                type="submit"
                className="btn btn-primary doorprize-btn-open"
                disabled={isBusy || !envelopeInput.trim()}
              >
                {phase === "shuffling"
                  ? "Mengacak..."
                  : phase === "opening"
                  ? "Membuka Amplop..."
                  : "Buka Amplop"}
              </button>
            </div>
          </div>

          {inputError && (
            <p className="doorprize-error" role="alert">
              {inputError}
            </p>
          )}
        </form>

        {/* PANGGUNG ANIMASI PENGACAKAN & PEMBUKAAN AMPLOP KEMENANGAN */}
        <section className={`doorprize-stage panel is-phase-${phase}`} aria-live="polite">
          {phase === "revealed" && (
            <div className="doorprize-confetti-layer" aria-hidden="true">
              {CONFETTI_PIECES.map((c) => (
                <span
                  key={c.id}
                  className="doorprize-confetti-piece"
                  style={{
                    left: c.left,
                    animationDelay: c.delay,
                    animationDuration: c.duration,
                    backgroundColor: c.color,
                  }}
                />
              ))}
            </div>
          )}

          {phase === "idle" && (
            <div className="doorprize-idle-state">
              <div className="doorprize-idle-envelope" aria-hidden="true">
                <div className="doorprize-idle-flap" />
                <div className="doorprize-idle-seal">★</div>
                <span className="doorprize-idle-num">
                  {envelopeInput.trim()
                    ? `#${String(Number(envelopeInput) || 0).padStart(2, "0")}`
                    : `1–${totalEnvelopes}`}
                </span>
              </div>
              <p className="doorprize-stage-hint">
                Ketik nomor amplop di atas atau pilih amplop di bawah, tekan{" "}
                <strong>Acak Peserta</strong> untuk mengacak urutan nama, lalu tekan{" "}
                <strong>Buka Amplop</strong>.
              </p>
            </div>
          )}

          {phase === "shuffling" && (
            <div className="doorprize-shuffle-stage">
              <span className="doorprize-shuffle-badge">
                MENGACAK NAMA PESERTA &amp; AMPLOP #{String(activeEnvelopeNumber ?? 0).padStart(2, "0")}
              </span>
              <div className="doorprize-shuffle-reels">
                <div className="doorprize-reel-box">
                  <small>NO. URUTAN</small>
                  <strong>#{String(rollingNumber).padStart(2, "0")}</strong>
                </div>
                <div className="doorprize-reel-box is-name-reel">
                  <small>NAMA PESERTA</small>
                  <div className="doorprize-reel-person">
                    {rollingEntry?.photoUrl ? (
                      <img
                        src={rollingEntry.photoUrl}
                        alt=""
                        className="doorprize-reel-avatar"
                      />
                    ) : (
                      <span className="doorprize-reel-avatar is-initials">
                        {getInitials(rollingEntry?.name ?? "?")}
                      </span>
                    )}
                    <strong>{rollingEntry?.name ?? "..."}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(phase === "opening" || phase === "revealed") && currentWinner && (
            <div className={`doorprize-victory-wrap is-${phase}`}>
              <div className="doorprize-victory-aura" aria-hidden="true" />
              <div className="doorprize-envelope-theater">
                <div className="doorprize-theater-back" />
                <div className="doorprize-theater-flap" />

                <article className="doorprize-winner-card">
                  <span className="doorprize-winner-pill">
                    PEMENANG · AMPLOP #{String(activeEnvelopeNumber ?? 0).padStart(2, "0")}
                  </span>
                  <div className="doorprize-winner-photo-ring">
                    {currentWinner.photoUrl ? (
                      <img
                        src={currentWinner.photoUrl}
                        alt={currentWinner.name}
                        className="doorprize-winner-photo"
                      />
                    ) : (
                      <div className="doorprize-winner-initials">
                        {getInitials(currentWinner.name)}
                      </div>
                    )}
                  </div>
                  <h2 className="doorprize-winner-name">{currentWinner.name}</h2>
                  <p className="doorprize-winner-sub">
                    Selamat! Amplop #{String(activeEnvelopeNumber ?? 0).padStart(2, "0")} resmi terpilih.
                  </p>
                </article>

                <div className="doorprize-theater-pocket" />
              </div>
            </div>
          )}
        </section>

        {/* DAFTAR PEMENANG TERPILIH */}
        {winners.length > 0 && (
          <section className="doorprize-winners-panel panel">
            <div className="doorprize-section-head">
              <div>
                <span className="eyebrow">PEMENANG TERPILIH</span>
                <h3>Daftar Pemenang ({winners.length})</h3>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetAll}
                disabled={isBusy}
              >
                Reset Undian
              </button>
            </div>
            <div className="doorprize-winners-grid">
              {winners.map((w) => (
                <div key={`${w.round}-${w.entry.id}`} className="doorprize-winner-chip">
                  <span className="doorprize-chip-rank">#{w.round}</span>
                  {w.entry.photoUrl ? (
                    <img
                      src={w.entry.photoUrl}
                      alt={w.entry.name}
                      className="doorprize-chip-avatar"
                    />
                  ) : (
                    <span className="doorprize-chip-avatar is-initials">
                      {getInitials(w.entry.name)}
                    </span>
                  )}
                  <div className="doorprize-chip-info">
                    <strong>{w.entry.name}</strong>
                    <small>Amplop #{String(w.envelopeNumber).padStart(2, "0")}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PAPAN AMPLOP BERNOMOR */}
        <section className="doorprize-board panel">
          <div className="doorprize-section-head">
            <div>
              <span className="eyebrow">DAFTAR AMPLOP</span>
              <h3>
                Tersedia {availableEnvelopeNumbers.length} dari {totalEnvelopes} Amplop
              </h3>
            </div>
          </div>
          <div className="doorprize-mini-grid">
            {Array.from({ length: totalEnvelopes }, (_, idx) => {
              const num = idx + 1;
              const isOpened = openedEnvelopes.includes(num);
              const isSelected = Number(envelopeInput) === num;
              return (
                <button
                  key={num}
                  type="button"
                  className={`doorprize-mini-env ${isOpened ? "is-opened" : ""} ${
                    isSelected ? "is-selected" : ""
                  }`}
                  disabled={isOpened || isBusy}
                  onClick={() => {
                    setEnvelopeInput(String(num));
                    setInputError(null);
                  }}
                >
                  <span className="mini-env-seal" aria-hidden="true">
                    {isOpened ? "✓" : "●"}
                  </span>
                  <strong>{String(num).padStart(2, "0")}</strong>
                </button>
              );
            })}
          </div>
        </section>

        {/* DAFTAR PESERTA DOORPRIZE (FOTO & NAMA SAJA) */}
        <section className={`doorprize-roster-panel panel ${isShufflingRoster ? "is-shuffling" : ""}`}>
          <div className="doorprize-section-head">
            <div>
              <span className="eyebrow">PESERTA UNDIAN</span>
              <h3>
                Daftar Peserta Doorprize ({remainingPool.length} dari {totalEnvelopes})
              </h3>
            </div>
          </div>
          <div className="doorprize-roster-grid">
            {displayRoster.map((entry) => {
              const isWon = wonIdSet.has(entry.id);
              return (
                <div
                  key={entry.id}
                  className={`doorprize-roster-card ${isWon ? "is-won" : ""}`}
                >
                  <div className="doorprize-roster-photo-wrap">
                    {entry.photoUrl ? (
                      <img
                        src={entry.photoUrl}
                        alt={entry.name}
                        className="doorprize-roster-photo"
                        loading="lazy"
                      />
                    ) : (
                      <div className="doorprize-roster-initials">
                        {getInitials(entry.name)}
                      </div>
                    )}
                  </div>
                  <strong className="doorprize-roster-name">{entry.name}</strong>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </div>
  );
}
