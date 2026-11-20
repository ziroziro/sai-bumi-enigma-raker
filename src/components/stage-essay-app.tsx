"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import {
  STAGE_OFFICIAL_GROUPS,
  type StageEssayStateSnapshot,
} from "@/domain/stage-essay";

interface StageEssayAppProps {
  initialSnapshot: StageEssayStateSnapshot;
}

export function StageEssayApp({ initialSnapshot }: StageEssayAppProps) {
  const [snapshot, setSnapshot] = useState<StageEssayStateSnapshot>(initialSnapshot);
  const [selectedGroupNumber, setSelectedGroupNumber] = useState<string>("");
  const [detailInput, setDetailInput] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<{
    groupName: string;
    message: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeStageNumber = snapshot.activeStageNumber || 1;
  const activeStage = useMemo(
    () =>
      snapshot.stages.find((s) => s.stageNumber === activeStageNumber) ??
      snapshot.stages[0],
    [snapshot.stages, activeStageNumber]
  );

  const submittedGroupSet = useMemo(() => {
    const set = new Set<number>();
    for (const grp of activeStage?.submittedGroups ?? []) {
      set.add(grp.groupNumber);
    }
    return set;
  }, [activeStage]);

  const refreshState = useCallback(async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch("/api/stage-essay", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as StageEssayStateSnapshot;
        setSnapshot(data);
        // Reset confirmation state if Admin switches to a new session or reopens
        if (data.activeStageNumber !== activeStageNumber) {
          setSubmittedSuccess(null);
          setSelectedGroupNumber("");
          setErrorMsg(null);
        }
      }
    } catch {
      // ignore transient network errors
    } finally {
      setCheckingStatus(false);
    }
  }, [activeStageNumber]);

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshState();
    }, 5000);
    const onFocus = () => {
      void refreshState();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshState]);

  async function handleSubmitEssay(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGroupNumber) {
      setErrorMsg("Silakan pilih Nama Kelompok terlebih dahulu.");
      return;
    }

    const groupNum = Number(selectedGroupNumber);
    if (submittedGroupSet.has(groupNum)) {
      setErrorMsg(
        "Kelompok ini sudah mengirimkan jawaban pada sesi saat ini. Satu kelompok hanya dapat submit 1 kali."
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/stage-essay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupNumber: groupNum,
          detail: detailInput.trim(),
        }),
      });

      const payload = (await res.json()) as {
        error?: string;
        message?: string;
        submission?: { groupName: string };
        snapshot?: StageEssayStateSnapshot;
      };

      if (!res.ok) {
        setErrorMsg(payload.error || "Gagal menyimpan jawaban.");
        await refreshState();
        return;
      }

      if (payload.snapshot) {
        setSnapshot(payload.snapshot);
      }

      const groupLabel =
        payload.submission?.groupName ??
        STAGE_OFFICIAL_GROUPS.find((g) => g.number === groupNum)?.name ??
        "Kelompok";

      setDetailInput("");
      setSelectedGroupNumber("");
      setSubmittedSuccess({
        groupName: groupLabel,
        message:
          payload.message ||
          `Terima kasih! Jawaban dari ${groupLabel} sudah berhasil disimpan.`,
      });
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan saat mengirim jawaban.");
    } finally {
      setSubmitting(false);
    }
  }

  // JIKA FORM BELUM DIBUKA OLEH ADMIN
  if (!snapshot.isFormOpen) {
    return (
      <div className="dept-login-wrapper">
        <div className="panel dept-login-card dept-locked-gate-card">
          <div className="dept-locked-icon-ring" aria-hidden="true">
            <Icon name="lock" size={28} />
          </div>
          <span className="eyebrow is-locked-eyebrow">
            <Icon name="lock" size={13} /> FORM BELUM DIBUKA ADMIN
          </span>
          <h1 className="dept-locked-gate-title">Form Misi Investigasi Sedang Ditutup</h1>
          <p className="dept-login-desc">
            Admin belum membuka sesi pengumpulan jawaban saat ini. Halaman ini akan otomatis
            terbuka begitu Admin membuka form input.
          </p>

          <button
            type="button"
            className="btn-primary-link btn-submit-admin"
            onClick={() => void refreshState()}
            disabled={checkingStatus}
          >
            <Icon name="refresh" size={17} />
            <span>{checkingStatus ? "Memeriksa Status..." : "Periksa Status Form"}</span>
          </button>
        </div>
      </div>
    );
  }

  // SETELAH SUBMIT: PESAN TERIMA KASIH & SUDAH DISIMPAN
  if (submittedSuccess) {
    return (
      <div className="dept-login-wrapper">
        <div className="panel dept-login-card stage-thankyou-card">
          <div className="stage-thankyou-icon" aria-hidden="true">
            <Icon name="check" size={32} />
          </div>
          <span className="eyebrow">JAWABAN TERSIMPAN</span>
          <h1 className="dept-locked-gate-title">Terima Kasih!</h1>
          <p className="dept-login-desc" style={{ marginBottom: "18px" }}>
            {submittedSuccess.message}
          </p>
          <div className="stage-thankyou-badge">
            <Icon name="shield" size={15} />
            <span>{submittedSuccess.groupName} · Jawaban Tercatat di Sistem</span>
          </div>
          <button
            type="button"
            className="btn-refresh-dept-head"
            style={{ margin: "20px auto 0" }}
            onClick={() => setSubmittedSuccess(null)}
          >
            <Icon name="arrowLeft" size={15} />
            <span>Kembali ke Form</span>
          </button>
        </div>
      </div>
    );
  }

  const allGroupsSubmitted = Boolean(activeStage?.isAllGroupsSubmitted);

  return (
    <div className="page-shell stage-form-only-shell">
      <section className="panel stage-form-panel stage-form-centered">
        <div className="dept-step-header">
          <span className="step-pill">SESI {activeStageNumber}</span>
          <div className="dept-step-title-wrap">
            <h1 className="dept-step-heading">Form Misi Investigasi</h1>
            <p className="section-caption">
              Pilih nama kelompok Anda dan tuliskan detail jawaban. Satu kelompok hanya dapat
              mengirimkan 1 kali submit pada sesi ini.
            </p>
          </div>
        </div>

        {/* STATUS KELOMPOK */}
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
              <strong>Terima Kasih, Seluruh Kelompok Sudah Mengirimkan Jawaban</strong>
              <p>
                Keempat kelompok telah mengirimkan jawaban untuk sesi ini. Menunggu Admin membuka
                sesi berikutnya atau mengumumkan hasil di halaman Leaderboard.
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
                      {grp.name} {alreadyDone ? "(Sudah Submit)" : ""}
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
                placeholder="Tuliskan detail jawaban kelompok Anda di sini..."
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
              <span>{submitting ? "Menyimpan Jawaban..." : "Submit Jawaban"}</span>
              <Icon name="arrow" size={18} />
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
