"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { formatRegistrationTime } from "@/config/event";
import {
  STAGE_OFFICIAL_GROUPS,
  type StageEssayStateSnapshot,
  type StageEssaySubmission,
} from "@/domain/stage-essay";

interface GroupAnswersAppProps {
  initialSnapshot: StageEssayStateSnapshot;
}

interface GroupAnswerCardData {
  groupNumber: number;
  groupName: string;
  submission: StageEssaySubmission | null;
}

export function GroupAnswersApp({ initialSnapshot }: GroupAnswersAppProps) {
  const [snapshot, setSnapshot] = useState<StageEssayStateSnapshot>(initialSnapshot);
  const [zoomedCard, setZoomedCard] = useState<GroupAnswerCardData | null>(null);

  const pollSnapshot = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const res = await fetch("/api/stage-essay?stagePhotos=active", { cache: "no-store" });
      if (!res.ok) return;
      const latest = (await res.json()) as StageEssayStateSnapshot;
      setSnapshot(latest);
    } catch {
      // ignore transient network errors
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void pollSnapshot();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [pollSnapshot]);

  useEffect(() => {
    if (!zoomedCard) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomedCard(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomedCard]);

  const displayedStage = snapshot.displayAnswersStageNumber || snapshot.activeStageNumber || 1;

  const cards: GroupAnswerCardData[] = STAGE_OFFICIAL_GROUPS.map((grp) => {
    const submission =
      snapshot.submissions.find(
        (s) => s.stageNumber === displayedStage && s.groupNumber === grp.number
      ) ?? null;
    return {
      groupNumber: grp.number,
      groupName: grp.name,
      submission,
    };
  });

  // Keep zoomed card synced if new submission arrives while open
  const activeZoomed = zoomedCard
    ? cards.find((c) => c.groupNumber === zoomedCard.groupNumber) ?? zoomedCard
    : null;

  return (
    <section className="page-shell group-answers-shell">
      <header className="group-answers-header panel">
        <div className="group-answers-header-top">
          <span className="eyebrow">
            <Icon name="compass" size={14} /> MISI INVESTIGASI · JAWABAN KELOMPOK
          </span>
          <span className="group-answers-session-pill">SESI {displayedStage}</span>
        </div>
        <h1 className="group-answers-title">Jawaban Kelompok · Sesi {displayedStage}</h1>
        <p className="group-answers-subtitle">
          Klik salah satu kartu kelompok di bawah untuk memperbesar dan membaca jawaban secara
          detail.
        </p>
      </header>

      <div className="group-answers-grid">
        {cards.map((card) => {
          const hasAnswer = Boolean(card.submission);
          return (
            <button
              key={card.groupNumber}
              type="button"
              className={`group-answer-card panel is-group-${card.groupNumber} ${
                hasAnswer ? "has-answer" : "is-empty"
              }`}
              onClick={() => setZoomedCard(card)}
              aria-label={`Perbesar jawaban ${card.groupName}`}
            >
              <div className="group-answer-card-head">
                <div className="group-answer-identity">
                  <span className="group-answer-num-badge">KELOMPOK {card.groupNumber}</span>
                  <h2 className="group-answer-name">{card.groupName}</h2>
                </div>
                <span className={`group-answer-status ${hasAnswer ? "is-done" : "is-pending"}`}>
                  {hasAnswer ? "Terkumpul" : "Menunggu"}
                </span>
              </div>

              <div className="group-answer-body">
                {card.submission ? (
                  <>
                    {card.submission.photoDataUrl && (
                      <div className="group-answer-photo-thumb">
                        <img
                          src={card.submission.photoDataUrl}
                          alt={`Lampiran ${card.groupName}`}
                        />
                      </div>
                    )}
                    <p className="group-answer-text">{card.submission.detail}</p>
                  </>
                ) : (
                  <p className="group-answer-placeholder">
                    Belum ada jawaban yang dikumpulkan untuk Sesi {displayedStage}.
                  </p>
                )}
              </div>

              <div className="group-answer-foot">
                <span className="group-answer-time">
                  {card.submission
                    ? `${card.submission.submitterName ? `Pengisi: ${card.submission.submitterName} · ` : ""}Dikirim: ${formatRegistrationTime(card.submission.submittedAt)}`
                    : "Menunggu pengiriman kelompok"}
                </span>
                <span className="group-answer-zoom-hint">
                  <Icon name="search" size={13} /> Klik untuk Zoom
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* MODAL ZOOM KARTU JAWABAN */}
      {activeZoomed ? (
        <div
          className="group-answer-zoom-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Jawaban ${activeZoomed.groupName}`}
          onClick={() => setZoomedCard(null)}
        >
          <div
            className={`group-answer-zoom-card panel is-group-${activeZoomed.groupNumber}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="group-answer-zoom-head">
              <div>
                <span className="group-answer-num-badge">
                  SESI {displayedStage} · KELOMPOK {activeZoomed.groupNumber}
                </span>
                <h2 className="group-answer-zoom-title">{activeZoomed.groupName}</h2>
              </div>
              <button
                type="button"
                className="group-answer-zoom-close"
                onClick={() => setZoomedCard(null)}
                aria-label="Tutup tampilan zoom"
              >
                <Icon name="close" size={16} />
                <span>Tutup</span>
              </button>
            </div>

            <div className="group-answer-zoom-body">
              {activeZoomed.submission ? (
                <>
                  {activeZoomed.submission.photoDataUrl && (
                    <div className="group-answer-zoom-photo">
                      <img
                        src={activeZoomed.submission.photoDataUrl}
                        alt={`Lampiran ${activeZoomed.groupName}`}
                      />
                    </div>
                  )}
                  <p className="group-answer-zoom-text">{activeZoomed.submission.detail}</p>
                </>
              ) : (
                <p className="group-answer-placeholder">
                  Kelompok ini belum mengumpulkan jawaban untuk Sesi {displayedStage}.
                </p>
              )}
            </div>

            {activeZoomed.submission && (
              <div className="group-answer-zoom-foot">
                <span>
                  {activeZoomed.submission.submitterName
                    ? `Nama Pengisi: ${activeZoomed.submission.submitterName} · `
                    : ""}
                  Waktu Kirim: {formatRegistrationTime(activeZoomed.submission.submittedAt)}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
