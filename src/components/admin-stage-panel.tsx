"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { formatRegistrationTime } from "@/config/event";
import {
  generateStageSpreadsheetTemplateCsv,
  STAGE_OFFICIAL_GROUPS,
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
  const [selectedStage, setSelectedStage] = useState<number>(1);
  const [sheetUrlInput, setSheetUrlInput] = useState<string>(snapshot?.spreadsheetUrl ?? "");
  const [csvPasteInput, setCsvPasteInput] = useState<string>("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Local editable score inputs for the selected stage: groupNumber -> score string
  const [scoreDrafts, setScoreDrafts] = useState<Record<number, string>>({});

  const currentStage = useMemo(
    () =>
      snapshot?.stages.find((s) => s.stageNumber === selectedStage) ?? snapshot?.stages[0],
    [snapshot, selectedStage]
  );

  const stageSubmissions = useMemo(
    () =>
      (snapshot?.submissions ?? [])
        .filter((s) => s.stageNumber === selectedStage)
        .sort((a, b) => a.groupNumber - b.groupNumber),
    [snapshot, selectedStage]
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
        setErrorMsg(data.error || "Gagal memproses aksi stage.");
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
            stageNumber: selectedStage,
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
      `Nilai Stage ${selectedStage} berhasil disimpan.`
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
    a.download = "template-nilai-stage-1-10-enigma.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleDeleteSubmission(id: string, groupName: string) {
    if (!confirm(`Hapus respon essay ${groupName} di Stage ${selectedStage}?`)) return;
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
    if (!confirm("PERINGATAN: Hapus seluruh respon essay Stage 1-10?")) return;
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
        setErrorMsg(data.error || "Gagal mereset data stage.");
        return;
      }
      if (data.snapshot) onSnapshotChange(data.snapshot);
      setNotice(data.message || "Seluruh respon stage berhasil direset.");
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
          <p>{loading ? "Memuat data Stage & Spreadsheet..." : "Data stage belum dimuat."}</p>
          <button
            type="button"
            className="btn-admin-action"
            onClick={() => void onRefresh()}
            disabled={loading}
          >
            <Icon name="refresh" size={16} />
            <span>Muat Data Stage</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-dept-head-section">
      {/* TOP BAR */}
      <div className="panel admin-attendance-toolbar">
        <div className="toolbar-info">
          <h3>Integrasi Spreadsheet Nilai &amp; Monitoring 10 Stage Essay</h3>
          <p>
            Hubungkan Google Spreadsheet penilaian juri (atau unggah CSV) untuk otomatis membaca nilai
            dan menyusun <strong>Leaderboard 3 Teratas</strong> di setiap sesi Stage 1–10.
          </p>
        </div>
        <div className="toolbar-buttons-cluster">
          <button
            type="button"
            className="btn-admin-action"
            onClick={handleDownloadTemplateCsv}
          >
            <Icon name="download" size={16} />
            <span>Download Template CSV</span>
          </button>
          <button
            type="button"
            className="btn-admin-action"
            onClick={() => void onRefresh()}
            disabled={loading || busyAction !== null}
          >
            <Icon name="refresh" size={16} />
            <span>{loading ? "Menyegarkan..." : "Refresh Data"}</span>
          </button>
          <button
            type="button"
            className="btn-admin-danger-solid"
            onClick={() => void handleResetAllStages()}
            disabled={busyAction !== null || snapshot.submissions.length === 0}
          >
            <Icon name="close" size={16} />
            <span>Reset Semua Respon</span>
          </button>
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

      {/* GOOGLE SPREADSHEET INTEGRATION PANEL */}
      <div className="panel admin-dept-cards-manager">
        <div className="admin-dept-manager-header">
          <div>
            <h3>Integrasi Google Spreadsheet Nilai Stage</h3>
            <p>
              Tempel link Google Sheets (pastikan akses <em>Anyone with the link can view</em> atau{" "}
              <em>Publish to web CSV</em>), atau impor langsung dari file/teks CSV.
            </p>
          </div>
          {snapshot.lastSpreadsheetSyncAt && (
            <span className="status-chip">
              Sync: {formatRegistrationTime(snapshot.lastSpreadsheetSyncAt)}
            </span>
          )}
        </div>

        <div className="admin-spreadsheet-controls">
          <div className="spreadsheet-url-row">
            <input
              type="url"
              className="quiz-input"
              placeholder="https://docs.google.com/spreadsheets/d/..."
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
                  "Nilai dari Google Spreadsheet berhasil disinkronkan."
                )
              }
            >
              <Icon name="refresh" size={16} />
              <span>
                {busyAction === "sync-sheet" ? "Menyinkronkan..." : "Sinkronkan Spreadsheet"}
              </span>
            </button>
          </div>

          {snapshot.lastSpreadsheetSyncError && (
            <p className="text-danger" style={{ fontSize: "12px", marginTop: "6px" }}>
              Error sync terakhir: {snapshot.lastSpreadsheetSyncError}
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
                rows={3}
                className="quiz-input"
                placeholder="Atau paste isi CSV dari Excel/Spreadsheet di sini (contoh: Stage 1, 88, 92, 85, 90)..."
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
                    "Data CSV berhasil diimpor."
                  )
                }
              >
                <span>Impor Teks CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 10 STAGE TABS */}
      <div className="panel admin-dept-cards-manager">
        <div className="stage-tabs-grid" style={{ marginBottom: "18px" }}>
          {snapshot.stages.map((st) => (
            <button
              key={st.stageNumber}
              type="button"
              className={`stage-tab-pill ${selectedStage === st.stageNumber ? "is-selected" : ""} ${
                st.isSessionFinished ? "is-finished" : ""
              }`}
              onClick={() => {
                setSelectedStage(st.stageNumber);
                setScoreDrafts({});
              }}
            >
              <span className="stage-tab-num">
                Stage {st.stageNumber}
                {snapshot.activeStageNumber === st.stageNumber && (
                  <em className="stage-live-badge">AKTIF</em>
                )}
              </span>
              <span className="stage-tab-meta">
                {st.submissionsCount}/4 Respon · {st.hasScores ? "Ada Nilai" : "Belum Dinilai"}
              </span>
            </button>
          ))}
        </div>

        {/* STAGE CONTROLS + MANUAL SCORE ENTRY */}
        <div className="admin-stage-detail-grid">
          {/* LEFT: SUBMISSIONS IN THIS STAGE */}
          <div className="admin-stage-subpanel">
            <div className="admin-stage-subhead">
              <h4>Respon Essay — Stage {selectedStage} ({stageSubmissions.length}/4)</h4>
              <div className="admin-stage-mini-actions">
                <button
                  type="button"
                  className="btn-admin-action"
                  disabled={busyAction !== null || snapshot.activeStageNumber === selectedStage}
                  onClick={() =>
                    void runPostAction(
                      "set-active",
                      { action: "set_active_stage", stageNumber: selectedStage },
                      `Stage ${selectedStage} dijadikan stage aktif.`
                    )
                  }
                >
                  <span>
                    {snapshot.activeStageNumber === selectedStage
                      ? "Stage Aktif Saat Ini"
                      : "Jadikan Stage Aktif"}
                  </span>
                </button>
                <button
                  type="button"
                  className="btn-admin-action"
                  disabled={busyAction !== null}
                  onClick={() =>
                    void runPostAction(
                      "toggle-complete",
                      {
                        action: "set_stage_completed",
                        stageNumber: selectedStage,
                        completed: !currentStage?.isManuallyCompleted,
                      },
                      "Status sesi stage diperbarui."
                    )
                  }
                >
                  <span>
                    {currentStage?.isSessionFinished ? "Buka Kembali Sesi" : "Tutup Sesi & Tampilkan Top 3"}
                  </span>
                </button>
              </div>
            </div>

            {stageSubmissions.length === 0 ? (
              <div className="admin-dept-empty-group">
                <Icon name="clock" size={18} />
                <span>Belum ada kelompok yang mengirim essay di Stage {selectedStage}.</span>
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

          {/* RIGHT: SCORES & TOP 3 PREVIEW */}
          <div className="admin-stage-subpanel">
            <h4>Nilai &amp; Preview Leaderboard Top 3 — Stage {selectedStage}</h4>
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
                    placeholder="Nilai (0-100)"
                    value={getDraftScoreValue(grp.number)}
                    onChange={(e) =>
                      setScoreDrafts((prev) => ({ ...prev, [grp.number]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <button
                type="submit"
                className="btn-primary-link"
                disabled={busyAction !== null}
              >
                <span>
                  {busyAction === "save-scores" ? "Menyimpan..." : "Simpan Nilai Stage"}
                </span>
              </button>
            </form>

            {(currentStage?.top3Leaderboard.length ?? 0) > 0 && (
              <div className="admin-top3-preview">
                <span className="eyebrow">TOP 3 LEADERBOARD SAAT INI</span>
                {currentStage?.top3Leaderboard.map((item) => (
                  <div key={item.groupNumber} className="admin-top3-row">
                    <strong>
                      #{item.rank} · {item.groupName}
                    </strong>
                    <span>{item.score} poin</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
