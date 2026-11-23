"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
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
      const t = ctx.currentTime + idx * 0.09;
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

function buildFivePointStar(cx: number, cy: number, outerR: number, innerR: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    pts.push(`${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`);
  }
  return pts.join(" ");
}

function buildLaurelLeaves(side: "left" | "right"): { d: string; key: string }[] {
  const leaves: { d: string; key: string }[] = [];
  const count = 9;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const angleDeg = 112 + t * 126;
    const rad = (angleDeg * Math.PI) / 180;
    const r = 47;
    const cx = 75 + (side === "left" ? Math.cos(rad) * r : -Math.cos(rad) * r);
    const cy = 78 + Math.sin(rad) * r;
    const leafAngle = side === "left" ? angleDeg - 48 : 180 - angleDeg + 48;
    const la = (leafAngle * Math.PI) / 180;
    const len = 10.5 - Math.abs(t - 0.5) * 3;
    const wid = 3.8;
    const tipX = cx + Math.cos(la) * len;
    const tipY = cy + Math.sin(la) * len;
    const perpX = -Math.sin(la) * wid;
    const perpY = Math.cos(la) * wid;
    const midX = cx + Math.cos(la) * (len * 0.45);
    const midY = cy + Math.sin(la) * (len * 0.45);
    const d = `M ${cx.toFixed(1)} ${cy.toFixed(1)} Q ${(midX + perpX).toFixed(1)} ${(midY + perpY).toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)} Q ${(midX - perpX).toFixed(1)} ${(midY - perpY).toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)} Z`;
    leaves.push({ d, key: `${side}-${i}` });
  }
  return leaves;
}

function buildSunburstLines(cx: number, cy: number, rInner: number, rOuter: number): string[] {
  const lines: string[] = [];
  const count = 20;
  for (let i = 0; i < count; i++) {
    const a = (i * 2 * Math.PI) / count;
    const x1 = cx + Math.cos(a) * rInner;
    const y1 = cy + Math.sin(a) * rInner;
    const x2 = cx + Math.cos(a) * rOuter;
    const y2 = cy + Math.sin(a) * rOuter;
    lines.push(`M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`);
  }
  return lines;
}

function WinnerDetectiveBadgeSvg({ rank }: { rank: 1 | 2 | 3 }) {
  const uid = `win-badge-${rank}`;
  const isGold = rank === 1;
  const isSilver = rank === 2;

  const metalStops = isGold
    ? ["#fff8d6", "#f2c65a", "#a36b17", "#472906"]
    : isSilver
    ? ["#ffffff", "#d8e2ef", "#6b7d94", "#222c3a"]
    : ["#ffe0b8", "#cf8845", "#7f4417", "#361a06"];

  const darkCore = isGold ? "#261407" : isSilver ? "#141a24" : "#211108";
  const accentGlow = isGold ? "#ffd86b" : isSilver ? "#e2e8f0" : "#e69a55";
  const ordinalSuffix = rank === 1 ? "st" : rank === 2 ? "nd" : "rd";

  const leftLeaves = buildLaurelLeaves("left");
  const rightLeaves = buildLaurelLeaves("right");
  const sunburst = buildSunburstLines(75, 78, 4, 34);

  const centerStar = buildFivePointStar(75, 22, 8.5, 3.8);
  const leftStar = buildFivePointStar(57, 26, 6.2, 2.8);
  const rightStar = buildFivePointStar(93, 26, 6.2, 2.8);

  return (
    <svg viewBox="0 0 150 156" className="podium-trophy-svg" aria-hidden="true">
      <defs>
        <linearGradient id={`metal-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={metalStops[3]} />
          <stop offset="22%" stopColor={metalStops[1]} />
          <stop offset="48%" stopColor={metalStops[0]} />
          <stop offset="75%" stopColor={metalStops[2]} />
          <stop offset="100%" stopColor={metalStops[3]} />
        </linearGradient>
        <linearGradient id={`medallion-${uid}`} x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor={metalStops[0]} />
          <stop offset="42%" stopColor={metalStops[1]} />
          <stop offset="78%" stopColor={metalStops[2]} />
          <stop offset="100%" stopColor={metalStops[3]} />
        </linearGradient>
        <linearGradient id={`ribbon-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={metalStops[2]} />
          <stop offset="50%" stopColor={metalStops[0]} />
          <stop offset="100%" stopColor={metalStops[2]} />
        </linearGradient>
        <clipPath id={`clip-med-${uid}`}>
          <circle cx="75" cy="78" r="33" />
        </clipPath>
      </defs>

      {/* Valorant-Inspired Faceted Angular Crest & Side Wing Notches */}
      <polygon
        points="20,56 8,66 14,82 22,88 28,60"
        fill={`url(#metal-${uid})`}
        stroke="#160d04"
        strokeWidth="1.2"
      />
      <polygon
        points="130,56 142,66 136,82 128,88 122,60"
        fill={`url(#metal-${uid})`}
        stroke="#160d04"
        strokeWidth="1.2"
      />
      <polygon
        points="75,6 102,16 124,38 130,78 118,118 75,148 32,118 20,78 26,38 48,16"
        fill={`url(#metal-${uid})`}
        stroke="#170d04"
        strokeWidth="2.2"
      />
      <polygon
        points="75,12 98,21 118,41 123,78 112,113 75,140 38,113 27,78 32,41 52,21"
        fill={darkCore}
        stroke={accentGlow}
        strokeOpacity="0.45"
        strokeWidth="1.3"
      />

      {/* Top 3 Detective Stars */}
      <polygon points={leftStar} fill={`url(#metal-${uid})`} stroke="#140c04" strokeWidth="0.8" />
      <polygon points={centerStar} fill={`url(#metal-${uid})`} stroke="#140c04" strokeWidth="0.9" />
      <polygon points={rightStar} fill={`url(#metal-${uid})`} stroke="#140c04" strokeWidth="0.8" />

      {/* Symmetrical Laurel Wreath */}
      {leftLeaves.map((leaf) => (
        <path
          key={leaf.key}
          d={leaf.d}
          fill={`url(#metal-${uid})`}
          stroke="#190e04"
          strokeWidth="0.7"
        />
      ))}
      {rightLeaves.map((leaf) => (
        <path
          key={leaf.key}
          d={leaf.d}
          fill={`url(#metal-${uid})`}
          stroke="#190e04"
          strokeWidth="0.7"
        />
      ))}

      {/* Central Glossy Sunburst Medallion */}
      <circle cx="75" cy="78" r="36" fill={`url(#metal-${uid})`} stroke="#180e04" strokeWidth="1.8" />
      <circle cx="75" cy="78" r="33" fill={`url(#medallion-${uid})`} stroke="#1c1106" strokeWidth="1" />

      {/* Radial Sunburst Etching */}
      <g clipPath={`url(#clip-med-${uid})`} opacity="0.24">
        {sunburst.map((d, idx) => (
          <path key={idx} d={d} stroke="#2a1606" strokeWidth="1.4" />
        ))}
      </g>

      {/* Diagonal Glossy Sheen */}
      <path
        d="M42,88 Q75,58 108,68 L108,45 L42,45 Z"
        fill="#ffffff"
        opacity="0.22"
        clipPath={`url(#clip-med-${uid})`}
      />

      {/* Rank Ordinal (1st / 2nd / 3rd) + WINNER */}
      <text
        x="71"
        y="80"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="32"
        fontWeight="900"
        fill="#190d03"
      >
        {rank}
      </text>
      <text
        x="89"
        y="66"
        textAnchor="start"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="11.5"
        fontWeight="900"
        fill="#190d03"
      >
        {ordinalSuffix}
      </text>
      <text
        x="75"
        y="96"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="10.2"
        fontWeight="900"
        fill="#190d03"
        letterSpacing="0.9"
      >
        WINNER
      </text>

      {/* Bottom Detective Shield Ribbon */}
      <polygon
        points="24,124 31,116 119,116 126,124 119,133 31,133"
        fill={`url(#ribbon-${uid})`}
        stroke="#1b1005"
        strokeWidth="1.2"
      />
      <text
        x="75"
        y="127"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="6.3"
        fontWeight="900"
        fill="#180e04"
        letterSpacing="0.55"
      >
        THE MASTER DETECTIVE
      </text>
    </svg>
  );
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

  const isBestGroupMode = snapshot.leaderboardMode === "best_group";
  const standings = isBestGroupMode
    ? snapshot.bestGroupStandings ?? []
    : snapshot.stageLeaderboardStandings ?? snapshot.cumulativeStandings ?? [];
  const top3 = standings.slice(0, 3);
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
      <div className="panel leaderboard-cinema-board">
        {/* TOP TITLE ROW */}
        <header className="leaderboard-board-header">
          <h1 className="leaderboard-board-title">
            {isBestGroupMode
              ? "Leaderboard · Best Kelompok"
              : `Leaderboard · Sesi ${snapshot.leaderboardStageNumber}`}
          </h1>
        </header>

        {top3.length === 0 ? (
          <div className="leaderboard-standby-card" style={{ margin: "20px auto" }}>
            <Icon name="award" size={34} />
            <h2>Belum Ada Nilai Masuk</h2>
            <p className="leaderboard-standby-desc">
              Admin belum meng-generate nilai dari Spreadsheet. Setelah nilai di-generate, peringkat
              3 teratas akan langsung tampil di sini.
            </p>
          </div>
        ) : (
          <div
            className={`leaderboard-3d-stage ${animateReveal ? "is-animating-reveal" : ""}`}
            aria-live="polite"
          >
            {/* 3D STEPPED PODIUMS WITH FLOATING DETECTIVE WINNER BADGES */}
            <div className="podium-columns-stage">
              {podiumVisualOrder.map((item) => {
                const delayMs = item.rank === 3 ? 120 : item.rank === 2 ? 420 : 780;
                return (
                  <div
                    key={`${snapshot.leaderboardRevealId}-col-${item.groupNumber}`}
                    className={`podium-column is-rank-${item.rank}`}
                    style={{ animationDelay: `${delayMs}ms` }}
                  >
                    {/* BACKLIGHT AURA BEHIND WINNER */}
                    <span className="podium-backlight-aura" aria-hidden="true" />

                    <div className="podium-trophy-floater">
                      <WinnerDetectiveBadgeSvg rank={item.rank as 1 | 2 | 3} />
                    </div>

                    {/* METALLIC GOLD-IRON TEAM PLAQUE BADGE */}
                    <div className="podium-team-plaque">
                      <span className="plaque-rivet is-left" aria-hidden="true" />
                      <span className="podium-banner-name">{item.groupName}</span>
                      <span className="plaque-rivet is-right" aria-hidden="true" />
                    </div>

                    <div className="podium-3d-block">
                      <div className="podium-block-top" />
                      <div className="podium-block-front">
                        <span className="podium-giant-num">{item.rank}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* OVERLAPPING FROSTED RANK & TEAM TABLE CARD (SEMUA 4 TIM, TERMASUK RANK 4) */}
            <div className="leaderboard-glass-table">
              <div className="leaderboard-table-head">
                <span>Rank &amp; Tim</span>
                <span>Point</span>
              </div>
              <div className="leaderboard-table-rows">
                {standings.map((item, idx) => (
                  <div
                    key={`${snapshot.leaderboardRevealId}-row-${item.groupNumber}`}
                    className={`leaderboard-table-row is-rank-${item.rank}`}
                    style={{ animationDelay: `${950 + idx * 140}ms` }}
                  >
                    <div className="row-team-cell">
                      <span className="row-avatar-badge">#{item.rank}</span>
                      <div className="row-team-meta">
                        <strong className="row-team-name">{item.groupName}</strong>
                        <span className="row-team-sub">
                          {item.rank === 1
                            ? "Peringkat 1 · Master Detective"
                            : item.rank === 2
                            ? "Peringkat 2 · Senior Detective"
                            : item.rank === 3
                            ? "Peringkat 3 · Elite Agent"
                            : "Peringkat 4 · Field Investigator"}{" "}
                          · {isBestGroupMode ? "Total Average" : `Sesi ${snapshot.leaderboardStageNumber}`}
                        </span>
                      </div>
                    </div>

                    <div className="row-center-title">
                      <Icon name="award" size={14} />
                      <span>
                        {item.rank === 1
                          ? "Juara 1"
                          : item.rank === 2
                          ? "Juara 2"
                          : item.rank === 3
                          ? "Juara 3"
                          : "Peringkat 4"}
                      </span>
                    </div>

                    <div className="row-point-pill">
                      <Icon name="sparkles" size={13} />
                      <strong>{item.totalScore.toLocaleString("id-ID")}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
