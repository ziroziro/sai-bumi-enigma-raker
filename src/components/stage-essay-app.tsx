"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { formatRegistrationTime } from "@/config/event";
import {
  STAGE_OFFICIAL_GROUPS,
  type StageEssayStateSnapshot,
} from "@/domain/stage-essay";

interface StageEssayAppProps {
  initialSnapshot: StageEssayStateSnapshot;
}

export function StageEssayApp({ initialSnapshot }: StageEssayAppProps) {
  const [snapshot, setSnapshot] = useState<StageEssayStateSnapshot>(initialSnapshot);
  const [selectedStageNumber, setSelectedStageNumber] = useState<number>(
    initialSnapshot.activeStageNumber || 1
  );
  const [selectedGroupNumber, setSelectedGroupNumber] = useState<string>("");
  const [detailInput, setDetailInput] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentStage = useMemo(
    () =>
      snapshot.stages.find((s) => s.stageNumber === selectedStageNumber) ??
      snapshot.stages[0],
    [snapshot.stages, selectedStageNumber]
  );

  const submittedGroupSet = useMemo(() => {
    const set = new Set<number>();
    for (const grp of currentStage?.submittedGroups ?? []) {
      set.add(grp.groupNumber);
    }
    return set;
  }, [currentStage]);

  const refreshStageData = useCallback(async (syncSpreadsheet = true) => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/stage-essay${syncSpreadsheet ? "?sync=1" : ""}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as StageEssayStateSnapshot;
        setSnapshot(data);
      }
    } catch {
      // ignore transient network errors
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshStageData(true);
    }, 15000);
    const onFocus = () => {
      void refreshStageData(true);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshStageData]);

  async function handleSubmitEssay(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGroupNumber) {
      setErrorMsg("Silakan pilih Nama Kelompok terlebih dahulu.");
      return;
    }

    const groupNum = Number(selectedGroupNumber);
    if (submittedGroupSet.has(groupNum)) {
      setErrorMsg(
        `Kelompok ini sudah mengirimkan respon pada Stage ${selectedStageNumber}. Satu kelompok hanya dapat submit 1 kali per sesi stage.`
      );
      return;
    }

    setSubmitting(true);
    setNotice(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/stage-essay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageNumber: selectedStageNumber,
          groupNumber: groupNum,
          detail: detailInput.trim(),
        }),
      });

      const payload = (await res.json()) as {
        error?: string;
        message?: string;
        snapshot?: StageEssayStateSnapshot;
      };

      if (!res.ok) {
        setErrorMsg(payload.error || "Gagal mengirim respon essay stage.");
        await refreshStageData(false);
        return;
      }

      if (payload.snapshot) {
        setSnapshot(payload.snapshot);
      }
      setDetailInput("");
      setSelectedGroupNumber("");
      setNotice(
        payload.message ||
          `Respon essay untuk Stage ${selectedStageNumber} berhasil dikirim dan dicatat.`
      );
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan saat mengirim respon essay.");
    } finally {
      setSubmitting(false);
    }
  }

  const allGroupsSubmitted = Boolean(currentStage?.isAllGroupsSubmitted);
  const isSessionFinished = Boolean(currentStage?.isSessionFinished);
  const top3 = currentStage?.top3Leaderboard ?? [];

  return (
    <div className="page-shell stage-page-shell">
      {/* HERO HEADER */}
      <section className="panel stage-hero-panel">
        <div className="stage-hero-head">
          <div>
            <span className="eyebrow">
              <Icon name="compass" size={14} /> 10 SESI STAGE INVESTIGASI · ESSAY &amp; LEADERBOARD
            </span>
            <h1 className="stage-hero-title">Submit Essay Stage &amp; Leaderboard</h1>
            <p className="stage-hero-subtitle">
              Setiap sesi stage diikuti oleh 4 kelompok. <strong>Satu kelompok hanya mengirim 1 respon essay</strong>{" "}
              per sesi stage. Ketika sesi stage selesai, <strong>Leaderboard 3 Teratas</strong> akan
              ditampilkan otomatis berdasarkan penilaian dari Spreadsheet juri.
            </p>
          </div>
          <button
            type="button"
            className="btn-refresh-dept-head"
            onClick={() => void refreshStageData(true)}
            disabled={refreshing}
          >
            <Icon name="refresh" size={16} />
            <span>{refreshing ? "Menyegarkan..." : "Segarkan Nilai"}</span>
          </button>
        </div>

        {/* 10 STAGE SELECTOR PILLS */}
        <div className="stage-tabs-grid" role="tablist" aria-label="Pilih Sesi Stage 1 sampai 10">
          {snapshot.stages.map((st) => {
            const isSelected = st.stageNumber === selectedStageNumber;
            const isCurrentActive = st.stageNumber === snapshot.activeStageNumber;
            return (
              <button
                key={st.stageNumber}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`stage-tab-pill ${isSelected ? "is-selected" : ""} ${
                  st.isSessionFinished ? "is-finished" : ""
                }`}
                onClick={() => {
                  setSelectedStageNumber(st.stageNumber);
                  setSelectedGroupNumber("");
                  setNotice(null);
                  setErrorMsg(null);
                }}
              >
                <span className="stage-tab-num">
                  Stage {st.stageNumber}
                  {isCurrentActive && <em className="stage-live-badge">AKTIF</em>}
                </span>
                <span className="stage-tab-meta">
                  {st.submissionsCount}/4 Tim ·{" "}
                  {st.isSessionFinished ? "Selesai" : "Berlangsung"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* MAIN 2-COLUMN WORKSPACE: ESSAY FORM + LEADERBOARD TOP 3 */}
      <div className="stage-workspace-grid">
        {/* LEFT: ESSAY SUBMIT FORM */}
        <section className="panel stage-form-panel">
          <div className="dept-step-header">
            <span className="step-pill">STAGE {selectedStageNumber}</span>
            <div className="dept-step-title-wrap">
              <h2 className="dept-step-heading">Form Submit Essay — Stage {selectedStageNumber}</h2>
              <p className="section-caption">
                Isi nama kelompok dan detail jawaban essay tim Anda. Maksimal 1 kali submit per
                kelompok pada sesi ini.
              </p>
            </div>
          </div>

          {/* GROUP SUBMISSION STATUS BAR */}
          <div className="stage-group-status-row">
            {STAGE_OFFICIAL_GROUPS.map((grp) => {
              const done = submittedGroupSet.has(grp.number);
              return (
                <div
                  key={grp.number}
                  className={`stage-group-status-pill ${done ? "is-submitted" : "is-pending"}`}
                >
                  <Icon name={done ? "check" : "clock"} size={13} />
                  <span>{grp.name}</span>
                  <strong>{done ? "Sudah Submit" : "Belum"}</strong>
                </div>
              );
            })}
          </div>

          {notice && (
            <div className="notice success-notice" role="status" style={{ marginBottom: "16px" }}>
              <Icon name="check" size={18} />
              <span>{notice}</span>
            </div>
          )}

          {errorMsg && (
            <div className="notice error-notice" role="alert" style={{ marginBottom: "16px" }}>
              <Icon name="close" size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {allGroupsSubmitted ? (
            <div className="stage-completed-box">
              <Icon name="check" size={28} />
              <div>
                <strong>Keempat Kelompok Telah Mengirimkan Respon Stage {selectedStageNumber}</strong>
                <p>
                  Sesi pengumpulan essay untuk Stage {selectedStageNumber} sudah lengkap (4/4 kelompok).
                  Silakan lihat Leaderboard 3 Teratas di panel sebelah kanan.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitEssay} className="stage-essay-form">
              <div className="form-field-group">
                <label htmlFor="stage-group-select" className="field-label">
                  Nama Kelompok
                </label>
                <select
                  id="stage-group-select"
                  className="quiz-input"
                  value={selectedGroupNumber}
                  onChange={(e) => setSelectedGroupNumber(e.target.value)}
                  required
                  disabled={submitting}
                >
                  <option value="">-- Pilih Nama Kelompok --</option>
                  {STAGE_OFFICIAL_GROUPS.map((grp) => {
                    const alreadyDone = submittedGroupSet.has(grp.number);
                    return (
                      <option key={grp.number} value={grp.number} disabled={alreadyDone}>
                        {grp.name} {alreadyDone ? "(Sudah Submit di Stage ini)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-field-group">
                <label htmlFor="stage-essay-detail" className="field-label">
                  Detail
                </label>
                <textarea
                  id="stage-essay-detail"
                  rows={8}
                  className="quiz-input stage-essay-textarea"
                  placeholder={`Tuliskan jawaban atau detail analisa kelompok Anda untuk Stage ${selectedStageNumber}...`}
                  value={detailInput}
                  onChange={(e) => setDetailInput(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <button
                type="submit"
                className="btn-primary-link btn-stage-submit"
                disabled={submitting || !selectedGroupNumber || detailInput.trim().length < 3}
              >
                <span>
                  {submitting
                    ? "Mengirim Jawaban..."
                    : `Kirim Essay Stage ${selectedStageNumber}`}
                </span>
                <Icon name="arrow" size={18} />
              </button>
            </form>
          )}
        </section>

        {/* RIGHT: TOP 3 LEADERBOARD FROM SPREADSHEET */}
        <section className="panel stage-leaderboard-panel">
          <div className="dept-step-header">
            <span className="step-pill">LEADERBOARD TOP 3</span>
            <div className="dept-step-title-wrap">
              <h2 className="dept-step-heading">
                Peringkat 3 Teratas — Stage {selectedStageNumber}
              </h2>
              <p className="section-caption">
                Nilai diambil otomatis dari Spreadsheet penilaian juri setelah sesi stage selesai.
              </p>
            </div>
          </div>

          {!isSessionFinished ? (
            <div className="stage-leaderboard-waiting">
              <Icon name="clock" size={36} />
              <h3>Menunggu Sesi Stage {selectedStageNumber} Selesai</h3>
              <p>
                Saat ini <strong>{currentStage?.submissionsCount ?? 0} dari 4 kelompok</strong> telah
                mengirimkan respon essay. Leaderboard 3 Teratas akan muncul otomatis setelah ke-4
                kelompok selesai submit atau sesi ditutup oleh Admin.
              </p>
            </div>
          ) : top3.length === 0 ? (
            <div className="stage-leaderboard-waiting">
              <Icon name="award" size={36} />
              <h3>Sesi Selesai — Menunggu Nilai Spreadsheet</h3>
              <p>
                Ke-4 kelompok telah menyelesaikan Stage {selectedStageNumber}. Nilai sedang diproses
                dari Spreadsheet juri dan akan muncul di sini setelah disinkronkan.
              </p>
            </div>
          ) : (
            <div className="stage-podium-list">
              {top3.map((item) => (
                <article
                  key={item.groupNumber}
                  className={`stage-podium-card is-rank-${item.rank}`}
                >
                  <div className="podium-rank-badge">
                    <span className="rank-num">#{item.rank}</span>
                    <span className="rank-label">
                      {item.rank === 1
                        ? "JUARA 1"
                        : item.rank === 2
                        ? "JUARA 2"
                        : "JUARA 3"}
                    </span>
                  </div>

                  <div className="podium-info">
                    <h3 className="podium-team-name">{item.groupName}</h3>
                    {item.note && <p className="podium-note">{item.note}</p>}
                    {item.submittedAt && (
                      <span className="podium-time">
                        Submit: {formatRegistrationTime(item.submittedAt)}
                      </span>
                    )}
                  </div>

                  <div className="podium-score-box">
                    <span className="score-lbl">NILAI</span>
                    <strong className="score-val">{item.score}</strong>
                  </div>
                </article>
              ))}
            </div>
          )}

          {snapshot.lastSpreadsheetSyncAt && (
            <p className="stage-sync-footer">
              Sinkronisasi Spreadsheet terakhir:{" "}
              {formatRegistrationTime(snapshot.lastSpreadsheetSyncAt)}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
