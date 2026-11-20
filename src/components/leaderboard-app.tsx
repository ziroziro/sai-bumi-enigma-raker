"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { formatRegistrationTime } from "@/config/event";
import type { StageEssayStateSnapshot } from "@/domain/stage-essay";

interface LeaderboardAppProps {
  initialSnapshot: StageEssayStateSnapshot;
}

function playTop3RevealSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const notes = [392.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = ctx.currentTime + idx * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.9);
    });
  } catch {
    // ignore
  }
}

export function LeaderboardApp({ initialSnapshot }: LeaderboardAppProps) {
  const [snapshot, setSnapshot] = useState<StageEssayStateSnapshot>(initialSnapshot);
  const [animateReveal, setAnimateReveal] = useState<boolean>(
    initialSnapshot.isLeaderboardRevealed
  );
  const lastRevealIdRef = useRef<number>(initialSnapshot.leaderboardRevealId || 0);

  const pollLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/stage-essay", { cache: "no-store" });
      if (!res.ok) return;
      const latest = (await res.json()) as StageEssayStateSnapshot;
      setSnapshot(latest);

      if (
        latest.isLeaderboardRevealed &&
        latest.leaderboardRevealId !== lastRevealIdRef.current
      ) {
        lastRevealIdRef.current = latest.leaderboardRevealId;
        setAnimateReveal(false);
        setTimeout(() => {
          setAnimateReveal(true);
          playTop3RevealSound();
        }, 60);
      } else if (!latest.isLeaderboardRevealed) {
        setAnimateReveal(false);
      }
    } catch {
      // ignore transient network issues
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void pollLeaderboard();
    }, 3500);
    const onFocus = () => {
      void pollLeaderboard();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [pollLeaderboard]);

  const top3 = snapshot.cumulativeTop3 ?? [];
  // Order for visual podium on desktop: Rank 2 (left), Rank 1 (center), Rank 3 (right)
  const podiumVisualOrder = [
    top3.find((x) => x.rank === 2),
    top3.find((x) => x.rank === 1),
    top3.find((x) => x.rank === 3),
  ].filter((x): x is NonNullable<typeof x> => Boolean(x));

  if (!snapshot.isLeaderboardRevealed) {
    return (
      <div className="page-shell leaderboard-stage-shell">
        <div className="panel leaderboard-standby-card">
          <div className="leaderboard-standby-ring" aria-hidden="true">
            <Icon name="award" size={38} />
          </div>
          <span className="eyebrow">PENGUMUMAN TOP 3 KELOMPOK</span>
          <h1 className="leaderboard-standby-title">Menunggu Reveal Leaderboard</h1>
          <p className="leaderboard-standby-desc">
            Rekapitulasi nilai dari seluruh sesi sedang disiapkan oleh Admin. Halaman ini akan
            otomatis menampilkan animasi pengumuman <strong>3 Kelompok Teratas</strong> beserta total
            nilainya begitu Admin menekan tombol Reveal.
          </p>
          <div className="leaderboard-pulse-bar" aria-hidden="true">
            <span />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell leaderboard-stage-shell">
      <section className="panel leaderboard-reveal-hero">
        <span className="eyebrow">
          <Icon name="sparkles" size={14} /> HASIL AKUMULASI NILAI SPREADSHEET
        </span>
        <h1 className="leaderboard-reveal-title">TOP 3 KELOMPOK TERBAIK</h1>
        <p className="leaderboard-reveal-subtitle">
          Akumulasi perolehan nilai dari setiap sesi yang dinilai melalui Spreadsheet juri resmi{" "}
          <strong>The Sai Bumi Enigma</strong>.
        </p>

        {snapshot.lastSpreadsheetSyncAt && (
          <span className="leaderboard-sync-chip">
            Diperbarui: {formatRegistrationTime(snapshot.lastSpreadsheetSyncAt)}
          </span>
        )}
      </section>

      {top3.length === 0 ? (
        <section className="panel leaderboard-standby-card">
          <Icon name="award" size={34} />
          <h2>Belum Ada Nilai Masuk</h2>
          <p className="leaderboard-standby-desc">
            Admin belum meng-generate nilai dari Spreadsheet. Setelah nilai di-generate, peringkat 3
            teratas akan langsung tampil di sini.
          </p>
        </section>
      ) : (
        <section
          className={`leaderboard-podium-arena ${animateReveal ? "is-animating-reveal" : ""}`}
          aria-live="polite"
        >
          {podiumVisualOrder.map((item) => {
            const delayMs = item.rank === 3 ? 120 : item.rank === 2 ? 420 : 780;
            const stageBreakdown = Object.entries(item.stageScores).sort(
              ([a], [b]) => Number(a) - Number(b)
            );

            return (
              <article
                key={`${snapshot.leaderboardRevealId}-${item.groupNumber}`}
                className={`leaderboard-podium-pillar is-rank-${item.rank}`}
                style={{ animationDelay: `${delayMs}ms` }}
              >
                <span className="podium-shimmer-sweep" aria-hidden="true" />
                <div className="podium-crown-wrap">
                  <span className="podium-medal-circle">#{item.rank}</span>
                  <span className="podium-rank-title">
                    {item.rank === 1
                      ? "JUARA 1"
                      : item.rank === 2
                      ? "JUARA 2"
                      : "JUARA 3"}
                  </span>
                </div>

                <h2 className="podium-hero-team">{item.groupName}</h2>

                <div className="podium-total-score-box">
                  <span className="total-lbl">TOTAL NILAI</span>
                  <strong className="total-val">{item.totalScore}</strong>
                </div>

                {stageBreakdown.length > 0 && (
                  <div className="podium-stage-chips">
                    {stageBreakdown.map(([stNum, val]) => (
                      <span key={stNum} className="podium-stage-chip">
                        Sesi {stNum}: <strong>+{val}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
