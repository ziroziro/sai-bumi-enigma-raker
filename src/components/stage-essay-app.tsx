"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
  const [submitterNameInput, setSubmitterNameInput] = useState<string>("");
  const [detailInput, setDetailInput] = useState<string>("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string>("");
  const photoInputRef = useRef<HTMLInputElement | null>(null);

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

  // Status form hanya diperiksa saat pengguna menekan tombol "Periksa Status Form" (tanpa auto-polling)

  function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImageMime = file.type.startsWith("image/");
    const isImageExt = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|svg)$/i.test(file.name);
    if (!isImageMime && !isImageExt) {
      setErrorMsg("Format file tidak didukung. Harap pilih file foto/gambar (JPG, PNG, WEBP, GIF, dll).");
      e.target.value = "";
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = typeof reader.result === "string" ? reader.result : null;
      if (!rawDataUrl) return;

      // Kompresi otomatis di browser (maks 1280px, JPEG 0.78) agar foto kamera HP selalu < 300KB
      // dan tidak pernah ditolak batas 4.5MB Vercel Serverless.
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1280;
          let targetW = img.naturalWidth || img.width;
          let targetH = img.naturalHeight || img.height;
          if (targetW > maxDim || targetH > maxDim) {
            if (targetW >= targetH) {
              targetH = Math.round((targetH * maxDim) / targetW);
              targetW = maxDim;
            } else {
              targetW = Math.round((targetW * maxDim) / targetH);
              targetH = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, targetW, targetH);
            const compressed = canvas.toDataURL("image/jpeg", 0.78);
            setPhotoDataUrl(compressed);
            setPhotoFileName(file.name);
            return;
          }
        } catch {
          // fallback to original dataUrl if canvas fails
        }
        setPhotoDataUrl(rawDataUrl);
        setPhotoFileName(file.name);
      };
      img.onerror = () => {
        setPhotoDataUrl(rawDataUrl);
        setPhotoFileName(file.name);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmitEssay(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGroupNumber) {
      setErrorMsg("Silakan pilih Nama Kelompok terlebih dahulu.");
      return;
    }

    if (submitterNameInput.trim().length < 2) {
      setErrorMsg("Silakan isi field Nama terlebih dahulu (minimal 2 karakter).");
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
          submitterName: submitterNameInput.trim(),
          detail: detailInput.trim(),
          photoDataUrl: photoDataUrl || null,
        }),
      });

      const rawText = await res.text();
      let payload: {
        error?: string;
        message?: string;
        submission?: { groupName: string };
        snapshot?: StageEssayStateSnapshot;
      } = {};
      try {
        payload = rawText ? (JSON.parse(rawText) as typeof payload) : {};
      } catch {
        payload = {};
      }

      if (!res.ok) {
        if (res.status === 413) {
          setErrorMsg("Ukuran foto terlalu besar. Silakan pilih ulang foto atau kirim tanpa foto.");
        } else {
          setErrorMsg(payload.error || `Gagal menyimpan jawaban (HTTP ${res.status}). Silakan coba lagi.`);
        }
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
      setSubmitterNameInput("");
      setSelectedGroupNumber("");
      setPhotoDataUrl(null);
      setPhotoFileName("");
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

  // Form Misi Investigasi selalu terbuka (tanpa penguncian buka/tutup halaman)

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
              <label htmlFor="stage-submitter-name" className="field-label">
                Nama <span className="required-star">*</span>
              </label>
              <input
                id="stage-submitter-name"
                type="text"
                className="quiz-input"
                placeholder="Masukkan nama Anda..."
                value={submitterNameInput}
                onChange={(e) => setSubmitterNameInput(e.target.value)}
                required
                disabled={submitting}
              />
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

            <div className="form-field-group">
              <label htmlFor="stage-photo-upload" className="field-label">
                Upload Foto Bukti / Lampiran (Opsional · Format Foto)
              </label>
              <div className="stage-photo-upload-box">
                <input
                  ref={photoInputRef}
                  id="stage-photo-upload"
                  type="file"
                  accept="image/*"
                  className="stage-photo-input-hidden"
                  onChange={handlePhotoFileChange}
                  disabled={submitting}
                />

                <button
                  type="button"
                  className={`btn-stage-gallery-upload ${photoDataUrl ? "has-photo" : ""}`}
                  onClick={() => photoInputRef.current?.click()}
                  disabled={submitting}
                >
                  <span className="gallery-btn-shimmer" aria-hidden="true" />
                  <span className="gallery-btn-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      width="22"
                      height="22"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="5" width="18" height="14" rx="2.5" />
                      <circle cx="8.5" cy="10" r="1.5" />
                      <path d="M21 15l-4.5-4.5a1.4 1.4 0 0 0-2 0L6 19" />
                    </svg>
                  </span>
                  <span className="gallery-btn-copy">
                    <strong>
                      {photoDataUrl ? "Ganti Foto dari Galeri" : "Buka Galeri & Pilih Foto"}
                    </strong>
                    <small>Ketuk untuk memilih foto bukti (JPG, PNG, WEBP)</small>
                  </span>
                  <span className="gallery-btn-arrow" aria-hidden="true">
                    <Icon name="arrow" size={16} />
                  </span>
                </button>

                {photoDataUrl ? (
                  <div className="stage-photo-preview-wrap">
                    <img
                      src={photoDataUrl}
                      alt="Preview lampiran foto"
                      className="stage-photo-preview"
                    />
                    <div className="stage-photo-preview-meta">
                      <span>{photoFileName || "Foto terpilih"}</span>
                      <button
                        type="button"
                        className="btn-quiz-reset"
                        style={{ height: "32px", padding: "0 12px", fontSize: "12px" }}
                        onClick={() => {
                          setPhotoDataUrl(null);
                          setPhotoFileName("");
                          if (photoInputRef.current) {
                            photoInputRef.current.value = "";
                          }
                        }}
                      >
                        Hapus Foto
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary-link btn-stage-submit"
              disabled={
                submitting ||
                !selectedGroupNumber ||
                submitterNameInput.trim().length < 2 ||
                detailInput.trim().length < 3
              }
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
