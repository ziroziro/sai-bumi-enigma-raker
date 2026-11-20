"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { formatRegistrationTime } from "@/config/event";
import {
  generateStageSpreadsheetTemplateCsv,
  STAGE_OFFICIAL_GROUPS,
  TOTAL_STAGE_COUNT,
  type StageEssayStateSnapshot,
} from "@/domain/stage-essay";

interface AdminStagePanelProps {
  snapshot: StageEssayStateSnapshot | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onSnapshotChange: (snapshot: StageEssayStateSnapshot) => void;
  getHeaders: () => HeadersInit;
}

export function AdminStagePanel({
  snapshot,
  loading,
  onRefresh,
  onSnapshotChange,
  getHeaders,
}: AdminStagePanelProps) {
  const [inspectedSession, setInspectedSession] = useState<number>(
    snapshot?.activeStageNumber || 1
  );
  const [sheetUrlInput, setSheetUrlInput] = useState<string>(snapshot?.spreadsheetUrl ?? "");
  const [csvPasteInput, setCsvPasteInput] = useState<string>("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<number, string>>({});

  const currentStage = useMemo(
    () =>
      snapshot?.stages.find((s) => s.stageNumber === inspectedSession) ??
      snapshot?.stages[0],
    [snapshot, inspectedSession]
  );

  const stageSubmissions = useMemo(
    () =>
      (snapshot?.submissions ?? [])
        .filter((s) => s.stageNumber === inspectedSession)
        .sort((a, b) => a.groupNumber - b.groupNumber),
    [snapshot, inspectedSession]
  );

  function getDraftScoreValue(groupNumber: number): string {
    if (typeof scoreDrafts[groupNumber] === "string") {
      return scoreDrafts[groupNumber];
    }
    const existing = currentStage?.allGroupScores.find((g) => g.groupNumber === groupNumber);
    return existing && typeof existing.score === "number" ? String(existing.score) : "";
  }

  async function runPostAction(
    actionKey: string,
    payloadBody: Record<string, unknown>,
    fallbackMessage: string
  ) {
    setBusyAction(actionKey);
    setNotice(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/stage-essay", {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify(payloadBody),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        snapshot?: StageEssayStateSnapshot;
      };
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal memproses aksi.");
        return;
      }
      if (data.snapshot) {
        onSnapshotChange(data.snapshot);
        setSheetUrlInput(data.snapshot.spreadsheetUrl);
      }
      setNotice(data.message || fallbackMessage);
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveStageScores(e: React.FormEvent) {
    e.preventDefault();
    const scoresToSave = STAGE_OFFICIAL_GROUPS.map((grp) => {
      const raw = getDraftScoreValue(grp.number).trim();
      const num = Number(raw);
      return raw !== "" && Number.isFinite(num)
        ? {
            stageNumber: inspectedSession,
            groupNumber: grp.number,
            score: num,
          }
        : null;
    }).filter((item): item is { stageNumber: number; groupNumber: 1 | 2 | 3 | 4; score: number } =>
      Boolean(item)
    );

    if (scoresToSave.length === 0) {
      setErrorMsg("Masukkan minimal 1 nilai kelompok untuk disimpan.");
      return;
    }

    await runPostAction(
      "save-scores",
      { action: "save_scores", scores: scoresToSave },
      `Nilai Sesi ${inspectedSession} berhasil disimpan.`
    );
    setScoreDrafts({});
  }

  async function handleImportCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await runPostAction(
        "import-csv",
        { action: "import_csv", csvText: text },
        "File CSV spreadsheet berhasil diimpor."
      );
    } finally {
      e.target.value = "";
    }
  }

  function handleDownloadTemplateCsv() {
    const csv = generateStageSpreadsheetTemplateCsv(snapshot?.scores ?? []);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-nilai-sesi-1-10-enigma.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleDeleteSubmission(id: string, groupName: string) {
    if (!confirm(`Hapus jawaban ${groupName} di Sesi ${inspectedSession}?`)) return;
    setBusyAction(`del-${id}`);
    setNotice(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/stage-essay", {
        method: "DELETE",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        snapshot?: StageEssayStateSnapshot;
      };
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal menghapus respon.");
        return;
      }
      if (data.snapshot) onSnapshotChange(data.snapshot);
      setNotice(data.message || "Respon berhasil dihapus.");
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleResetAllStages() {
    if (!confirm("PERINGATAN: Hapus seluruh jawaban form dari Sesi 1-10?")) return;
    setBusyAction("reset-all");
    setNotice(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/stage-essay", {
        method: "DELETE",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({ all: true }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        snapshot?: StageEssayStateSnapshot;
      };
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal mereset data.");
        return;
      }
      if (data.snapshot) onSnapshotChange(data.snapshot);
      setNotice(data.message || "Seluruh respon berhasil direset.");
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setBusyAction(null);
    }
  }

  if (!snapshot) {
    return (
      <section className="panel admin-dept-head-section">
        <div className="empty-state-box">
          <Icon name="compass" size={32} />
          <p>{loading ? "Memuat kontrol sesi & leaderboard..." : "Data belum dimuat."}</p>
          <button
            type="button"
            className="btn-admin-action"
            onClick={() => void onRefresh()}
            disabled={loading}
          >
            <Icon name="refresh" size={16} />
            <span>Muat Data</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-dept-head-section">
      {/* KONTROL FORM INPUT & REVEAL LEADERBOARD */}
      <div className="panel admin-attendance-toolbar">
        <div className="toolbar-info">
          <div className="dept-admin-status-row">
            <h3>Kontrol Form Misi &amp; Reveal Leaderboard</h3>
            <span
              className={`dept-page-lock-badge ${
                snapshot.isFormOpen ? "is-unlocked" : "is-locked"
              }`}
            >
              <Icon name={snapshot.isFormOpen ? "check" : "lock"} size={13} />
              <span>
                {snapshot.isFormOpen
                  ? `FORM DIBUKA · MENYIMPAN KE SESI ${snapshot.activeStageNumber}`
                  : "FORM DIKUNCI"}
              </span>
            </span>
          </div>
          <p>
            Atur sesi penyimpanan (Sesi 1–10), buka/tutup form pengumpulan untuk peserta, generate
            nilai dari Spreadsheet, dan klik <strong>Reveal Leaderboard</strong> untuk mengumumkan Top 3
            di halaman <Link href="/leaderboard" style={{ color: "var(--color-gold)" }}>/leaderboard</Link>.
          </p>
        </div>

        <div className="toolbar-buttons-cluster">
          <button
            type="button"
            className={`btn-admin-action ${
              snapshot.isFormOpen ? "btn-lock-dept-page" : "btn-unlock-dept-page"
            }`}
            disabled={busyAction !== null}
            onClick={() =>
              void runPostAction(
                "toggle-form",
                { action: "set_form_open", isOpen: !snapshot.isFormOpen },
                snapshot.isFormOpen ? "Form berhasil dikunci." : "Form berhasil dibuka."
              )
            }
          >
            <Icon name={snapshot.isFormOpen ? "lock" : "check"} size={16} />
            <span>{snapshot.isFormOpen ? "Kunci Form Input" : "Buka Form Input"}</span>
          </button>

          <button
            type="button"
            className={`btn-admin-action ${
              snapshot.isLeaderboardRevealed ? "btn-lock-dept-page" : "btn-unlock-dept-page"
            }`}
            disabled={busyAction !== null}
            onClick={() =>
              void runPostAction(
                "toggle-reveal",
                {
                  action: "set_leaderboard_revealed",
                  revealed: !snapshot.isLeaderboardRevealed,
                },
                "Status reveal leaderboard diperbarui."
              )
            }
          >
            <Icon name="sparkles" size={16} />
            <span>
              {snapshot.isLeaderboardRevealed ? "Tutup Reveal Leaderboard" : "Reveal Leaderboard"}
            </span>
          </button>

          <button
            type="button"
            className="btn-admin-action"
            onClick={() => void onRefresh()}
            disabled={loading || busyAction !== null}
          >
            <Icon name="refresh" size={16} />
            <span>{loading ? "Menyegarkan..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* PILIH SESI PENYIMPANAN FORM (SESI 1 - 10) */}
      <div className="panel admin-dept-cards-manager">
        <div className="admin-dept-manager-header">
          <div>
            <h3>Pilih Sesi Penyimpanan Form (Sesi 1 – 10)</h3>
            <p>
              Peserta hanya melihat form input tanpa memilih sesi. Setiap jawaban yang di-submit
              peserta otomatis tersimpan ke <strong>Sesi Aktif ({snapshot.activeStageNumber})</strong>{" "}
              di bawah ini.
            </p>
          </div>
          <div className="admin-stage-mini-actions">
            <Link href="/stage" target="_blank" className="btn-admin-action">
              <Icon name="arrow" size={14} />
              <span>Lihat Halaman Form</span>
            </Link>
            <Link href="/leaderboard" target="_blank" className="btn-admin-action">
              <Icon name="award" size={14} />
              <span>Lihat Halaman Leaderboard</span>
            </Link>
          </div>
        </div>

        <div className="stage-tabs-grid">
          {Array.from({ length: TOTAL_STAGE_COUNT }, (_, idx) => idx + 1).map((stNum) => {
            const stSummary = snapshot.stages.find((s) => s.stageNumber === stNum);
            const isActiveSaveTarget = snapshot.activeStageNumber === stNum;
            return (
              <button
                key={stNum}
                type="button"
                className={`stage-tab-pill ${isActiveSaveTarget ? "is-selected" : ""} ${
                  stSummary?.isSessionFinished ? "is-finished" : ""
                }`}
                disabled={busyAction !== null}
                onClick={() => {
                  setInspectedSession(stNum);
                  setScoreDrafts({});
                  void runPostAction(
                    `set-active-${stNum}`,
                    { action: "set_active_stage", stageNumber: stNum },
                    `Sesi penyimpanan form disetel ke Sesi ${stNum}.`
                  );
                }}
              >
                <span className="stage-tab-num">
                  Sesi {stNum}
                  {isActiveSaveTarget && <em className="stage-live-badge">AKTIF</em>}
                </span>
                <span className="stage-tab-meta">
                  {stSummary?.submissionsCount ?? 0}/4 Submit ·{" "}
                  {stSummary?.hasScores ? "Ada Nilai" : "Belum Dinilai"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {notice && (
        <div className="notice success-notice" role="status">
          <Icon name="check" size={18} />
          <span>{notice}</span>
        </div>
      )}

      {errorMsg && (
        <div className="notice error-notice" role="alert">
          <Icon name="close" size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* GENERATE NILAI DARI SPREADSHEET */}
      <div className="panel admin-dept-cards-manager">
        <div className="admin-dept-manager-header">
          <div>
            <h3>Generate Nilai dari Google Spreadsheet</h3>
            <p>
              Nilai dari setiap sesi di Spreadsheet otomatis <strong>dijumlahkan (akumulasi)</strong>{" "}
              untuk membentuk peringkat Top 3 di halaman Leaderboard.
            </p>
          </div>
          <div className="admin-stage-mini-actions">
            <button
              type="button"
              className="btn-admin-action"
              onClick={handleDownloadTemplateCsv}
            >
              <Icon name="download" size={15} />
              <span>Template CSV</span>
            </button>
            <button
              type="button"
              className="btn-admin-danger-solid"
              onClick={() => void handleResetAllStages()}
              disabled={busyAction !== null || snapshot.submissions.length === 0}
            >
              <Icon name="close" size={15} />
              <span>Reset Semua Jawaban</span>
            </button>
          </div>
        </div>

        <div className="admin-spreadsheet-controls">
          <div className="spreadsheet-url-row">
            <input
              type="url"
              className="quiz-input"
              placeholder="Tempel link Google Spreadsheet (https://docs.google.com/spreadsheets/d/...)..."
              value={sheetUrlInput}
              onChange={(e) => setSheetUrlInput(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary-link"
              disabled={busyAction !== null || !sheetUrlInput.trim()}
              onClick={() =>
                void runPostAction(
                  "sync-sheet",
                  { action: "sync_spreadsheet", spreadsheetUrl: sheetUrlInput.trim() },
                  "Nilai dari Google Spreadsheet berhasil di-generate."
                )
              }
            >
              <Icon name="sparkles" size={16} />
              <span>
                {busyAction === "sync-sheet"
                  ? "Meng-generate..."
                  : "Generate dari Spreadsheet"}
              </span>
            </button>
          </div>

          {snapshot.lastSpreadsheetSyncError && (
            <p className="text-danger" style={{ fontSize: "12px" }}>
              Error terakhir: {snapshot.lastSpreadsheetSyncError}
            </p>
          )}

          <div className="spreadsheet-csv-fallback">
            <div className="csv-upload-row">
              <label className="field-label" style={{ margin: 0 }}>
                Atau Impor File CSV Spreadsheet:
              </label>
              <input type="file" accept=".csv,text/csv" onChange={(e) => void handleImportCsvFile(e)} />
            </div>

            <div className="csv-paste-row">
              <textarea
                rows={2}
                className="quiz-input"
                placeholder="Atau paste teks CSV di sini (contoh: Stage 1, 88, 92, 85, 90)..."
                value={csvPasteInput}
                onChange={(e) => setCsvPasteInput(e.target.value)}
              />
              <button
                type="button"
                className="btn-admin-action"
                disabled={busyAction !== null || !csvPasteInput.trim()}
                onClick={() =>
                  void runPostAction(
                    "import-csv",
                    { action: "import_csv", csvText: csvPasteInput },
                    "CSV berhasil diimpor."
                  )
                }
              >
                <span>Impor CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AKUMULASI LEADERBOARD TOP 3 + RESPON SESI TERPILIH */}
      <div className="admin-stage-detail-grid">
        <div className="panel admin-stage-subpanel">
          <div className="admin-stage-subhead">
            <h4>Jawaban Kelompok — Sesi {inspectedSession} ({stageSubmissions.length}/4)</h4>
            <select
              className="quiz-input"
              style={{ width: "auto", padding: "6px 12px", fontSize: "12px" }}
              value={inspectedSession}
              onChange={(e) => {
                setInspectedSession(Number(e.target.value));
                setScoreDrafts({});
              }}
            >
              {Array.from({ length: TOTAL_STAGE_COUNT }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Lihat Sesi {n}
                </option>
              ))}
            </select>
          </div>

          {stageSubmissions.length === 0 ? (
            <div className="admin-dept-empty-group">
              <Icon name="clock" size={18} />
              <span>Belum ada kelompok yang mengirim jawaban pada Sesi {inspectedSession}.</span>
            </div>
          ) : (
            <div className="admin-stage-responses-list">
              {stageSubmissions.map((sub) => (
                <article key={sub.id} className="admin-stage-response-card">
                  <div className="response-card-head">
                    <strong>{sub.groupName}</strong>
                    <div className="response-card-meta">
                      <span>{formatRegistrationTime(sub.submittedAt)}</span>
                      <button
                        type="button"
                        className="btn-delete-row"
                        onClick={() => void handleDeleteSubmission(sub.id, sub.groupName)}
                        disabled={busyAction !== null}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                  <p className="response-card-body">{sub.detail}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="panel admin-stage-subpanel">
          <h4>Nilai Sesi {inspectedSession} &amp; Akumulasi Top 3</h4>
          <form onSubmit={handleSaveStageScores} className="admin-stage-scores-form">
            {STAGE_OFFICIAL_GROUPS.map((grp) => (
              <div key={grp.number} className="admin-score-input-row">
                <label htmlFor={`score-g-${grp.number}`} className="field-label">
                  {grp.name}
                </label>
                <input
                  id={`score-g-${grp.number}`}
                  type="number"
                  step="0.01"
                  className="quiz-input"
                  placeholder="Nilai Sesi"
                  value={getDraftScoreValue(grp.number)}
                  onChange={(e) =>
                    setScoreDrafts((prev) => ({ ...prev, [grp.number]: e.target.value }))
                  }
                />
              </div>
            ))}
            <button type="submit" className="btn-primary-link" disabled={busyAction !== null}>
              <span>
                {busyAction === "save-scores" ? "Menyimpan..." : `Simpan Nilai Sesi ${inspectedSession}`}
              </span>
            </button>
          </form>

          <div className="admin-top3-preview">
            <span className="eyebrow">AKUMULASI LEADERBOARD TOP 3 (SEMUA SESI)</span>
            {snapshot.cumulativeTop3.map((item) => (
              <div key={item.groupNumber} className="admin-top3-row">
                <strong>
                  #{item.rank} · {item.groupName}
                </strong>
                <span>{item.totalScore} poin ({item.scoredStagesCount} sesi)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
