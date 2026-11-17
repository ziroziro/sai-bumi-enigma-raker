"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { SilhouetteArt } from "@/components/silhouette-art";
import { formatRegistrationTime, officialGroups } from "@/config/event";
import {
  SILHOUETTE_VARIANT_LABELS,
  SILHOUETTE_VARIANTS,
  type DeptHeadCard,
  type DeptHeadStateSnapshot,
  type SilhouetteVariant,
} from "@/domain/dept-head";

export interface AdminDeptHeadAccountInfo {
  groupNumber: number;
  groupName: string;
  groupTitle: string;
  email: string;
  password: string;
}

export type AdminDeptHeadSnapshot = DeptHeadStateSnapshot & {
  accounts?: AdminDeptHeadAccountInfo[];
};

interface AdminDeptHeadPanelProps {
  snapshot: AdminDeptHeadSnapshot | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onSnapshotChange: (snapshot: AdminDeptHeadSnapshot) => void;
  getHeaders: () => HeadersInit;
}

async function compressSilhouetteImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Format gambar tidak dapat dimuat."));
      img.onload = () => {
        const maxWidth = 480;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas browser tidak tersedia."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png", 0.9));
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

export function AdminDeptHeadPanel({
  snapshot,
  loading,
  onRefresh,
  onSnapshotChange,
  getHeaders,
}: AdminDeptHeadPanelProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [draftCard, setDraftCard] = useState<DeptHeadCard | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  const selectionByGroup = useMemo(() => {
    const map = new Map<number, DeptHeadStateSnapshot["selections"][number]>();
    for (const s of snapshot?.selections ?? []) {
      map.set(s.groupNumber, s);
    }
    return map;
  }, [snapshot]);

  const cardById = useMemo(() => {
    const map = new Map<number, DeptHeadCard>();
    for (const c of snapshot?.cards ?? []) {
      map.set(c.id, c);
    }
    return map;
  }, [snapshot]);

  function openEditor(card: DeptHeadCard) {
    setEditingCardId(card.id);
    setDraftCard({
      ...card,
      customImageUrl: card.customImageUrl ?? "",
    });
    setNotice(null);
    setErrorMsg(null);
  }

  function closeEditor() {
    setEditingCardId(null);
    setDraftCard(null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !draftCard) return;
    try {
      const dataUrl = await compressSilhouetteImage(file);
      setDraftCard({ ...draftCard, customImageUrl: dataUrl });
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal memproses file gambar siluet.");
    } finally {
      e.target.value = "";
    }
  }

  async function handleSaveCard(e: React.FormEvent) {
    e.preventDefault();
    if (!draftCard) return;

    setBusyAction(`save-${draftCard.id}`);
    setNotice(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/dept-head", {
        method: "PATCH",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({
          id: draftCard.id,
          code: draftCard.code,
          title: draftCard.title,
          roleHint: draftCard.roleHint,
          description: draftCard.description,
          silhouetteVariant: draftCard.silhouetteVariant,
          customImageUrl: draftCard.customImageUrl?.trim() ? draftCard.customImageUrl.trim() : null,
        }),
      });

      const payload = (await res.json()) as { error?: string; snapshot?: DeptHeadStateSnapshot };
      if (!res.ok) {
        setErrorMsg(payload.error || "Gagal menyimpan perubahan kartu siluet.");
        return;
      }

      if (payload.snapshot) {
        onSnapshotChange({
          ...payload.snapshot,
          accounts: snapshot?.accounts,
        });
      }
      setNotice(`Kartu ${draftCard.code} (${draftCard.title}) berhasil diperbarui.`);
      closeEditor();
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan saat memperbarui kartu karakter.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleResetGroup(groupNumber: number, groupName: string) {
    if (!confirm(`Reset pilihan Chief Detective untuk ${groupName}? Kelompok ini dapat memilih ulang.`)) {
      return;
    }

    setBusyAction(`reset-${groupNumber}`);
    setNotice(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/dept-head", {
        method: "DELETE",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({ groupNumber }),
      });
      const payload = (await res.json()) as {
        error?: string;
        message?: string;
        snapshot?: DeptHeadStateSnapshot;
      };
      if (!res.ok) {
        setErrorMsg(payload.error || "Gagal mereset pilihan kelompok.");
        return;
      }
      if (payload.snapshot) {
        onSnapshotChange({
          ...payload.snapshot,
          accounts: snapshot?.accounts,
        });
      }
      setNotice(payload.message || `Pilihan ${groupName} berhasil direset.`);
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan saat mereset pilihan kelompok.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleResetAll() {
    if (
      !confirm(
        "PERINGATAN: Kosongkan seluruh pilihan Chief Detective untuk semua 4 kelompok? Kartu karakter tetap tersimpan, namun seluruh kelompok harus memilih ulang."
      )
    ) {
      return;
    }

    setBusyAction("reset-all");
    setNotice(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/dept-head", {
        method: "DELETE",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({ all: true }),
      });
      const payload = (await res.json()) as {
        error?: string;
        message?: string;
        snapshot?: DeptHeadStateSnapshot;
      };
      if (!res.ok) {
        setErrorMsg(payload.error || "Gagal mengosongkan semua pilihan Chief Detective.");
        return;
      }
      if (payload.snapshot) {
        onSnapshotChange({
          ...payload.snapshot,
          accounts: snapshot?.accounts,
        });
      }
      setNotice(payload.message || "Seluruh pilihan Chief Detective berhasil dikosongkan.");
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan saat mengosongkan semua pilihan.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleTogglePageLock() {
    if (!snapshot) return;
    const nextUnlocked = !snapshot.isPageUnlocked;
    setBusyAction("toggle-page-lock");
    setNotice(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/dept-head", {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({ isPageUnlocked: nextUnlocked }),
      });
      const payload = (await res.json()) as {
        error?: string;
        message?: string;
        snapshot?: DeptHeadStateSnapshot;
      };
      if (!res.ok) {
        setErrorMsg(payload.error || "Gagal memperbarui status kunci halaman Chief Detective.");
        return;
      }
      if (payload.snapshot) {
        onSnapshotChange({
          ...payload.snapshot,
          accounts: snapshot.accounts,
        });
      }
      setNotice(
        payload.message ||
          (nextUnlocked
            ? "Halaman Chief Detective berhasil dibuka untuk peserta."
            : "Halaman Chief Detective berhasil dikunci.")
      );
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan saat mengubah status kunci halaman.");
    } finally {
      setBusyAction(null);
    }
  }

  if (!snapshot) {
    return (
      <section className="panel admin-dept-head-section">
        <div className="empty-state-box">
          <Icon name="compass" size={32} />
          <p>{loading ? "Memuat data pemilihan Chief Detective..." : "Data pemilihan Chief Detective belum dimuat."}</p>
          <button
            type="button"
            className="btn-admin-action"
            onClick={() => void onRefresh()}
            disabled={loading}
          >
            <Icon name="refresh" size={16} />
            <span>Muat Ulang Data</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-dept-head-section">
      <div className="panel admin-attendance-toolbar">
        <div className="toolbar-info">
          <div className="dept-admin-status-row">
            <h3>Rekap Pilihan Karakter Chief Detective Per Kelompok</h3>
            <span
              className={`dept-page-lock-badge ${
                snapshot.isPageUnlocked ? "is-unlocked" : "is-locked"
              }`}
            >
              <Icon name={snapshot.isPageUnlocked ? "check" : "lock"} size={13} />
              <span>
                {snapshot.isPageUnlocked
                  ? "HALAMAN CHIEF DETECTIVE: DIBUKA"
                  : "HALAMAN CHIEF DETECTIVE: TERKUNCI"}
              </span>
            </span>
          </div>
          <p>
            Pantau karakter Chief Detective yang dipilih masing-masing kelompok (3 kelompok pertama memilih
            2 karakter, kelompok ke-4 memilih 1 karakter) serta buka/kunci halaman untuk peserta.
          </p>
        </div>
        <div className="toolbar-buttons-cluster">
          <button
            type="button"
            className={`btn-admin-action ${
              snapshot.isPageUnlocked ? "btn-lock-dept-page" : "btn-unlock-dept-page"
            }`}
            onClick={() => void handleTogglePageLock()}
            disabled={busyAction !== null}
          >
            <Icon name={snapshot.isPageUnlocked ? "lock" : "check"} size={16} />
            <span>
              {busyAction === "toggle-page-lock"
                ? "Memproses..."
                : snapshot.isPageUnlocked
                ? "Kunci Halaman Chief Detective"
                : "Buka Halaman Chief Detective"}
            </span>
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
            onClick={() => void handleResetAll()}
            disabled={snapshot.totalGroupsSubmitted === 0 || busyAction !== null}
          >
            <Icon name="close" size={16} />
            <span>Reset Semua Pilihan</span>
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

      <div className="admin-dept-groups-grid">
        {officialGroups.map((group) => {
          const record = selectionByGroup.get(group.number);
          return (
            <article key={group.number} className={`panel admin-dept-group-card ${record ? "is-filled" : ""}`}>
              <div className="admin-dept-group-header">
                <div>
                  <span className="eyebrow">KELOMPOK {group.number}</span>
                  <h4>{group.title}</h4>
                </div>
                <span className={`dept-group-badge ${record ? "is-done" : "is-open"}`}>
                  {record
                    ? `Urutan #${record.selectionOrder} · ${record.cardIds.length} Chief Detective`
                    : "Belum Memilih"}
                </span>
              </div>

              {record ? (
                <>
                  <p className="admin-dept-timestamp">
                    Submit pada {formatRegistrationTime(record.submittedAt)}
                  </p>
                  <div className="admin-dept-chosen-list">
                    {record.cardIds.map((cardId) => {
                      const card = cardById.get(cardId);
                      if (!card) return null;
                      return (
                        <div key={cardId} className="admin-dept-chosen-item">
                          <SilhouetteArt
                            variant={card.silhouetteVariant}
                            customImageUrl={card.customImageUrl}
                            alt={`${card.code} - ${card.title}`}
                            compact
                          />
                          <div className="admin-dept-chosen-info">
                            <span className="silhouette-code">{card.code}</span>
                            <strong>{card.title}</strong>
                            <span className="admin-real-name-tag">{card.realName}</span>
                            <span className="silhouette-role-hint">{card.roleHint}</span>
                            <p>{card.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="admin-dept-group-actions">
                    <button
                      type="button"
                      className="btn-delete-row"
                      onClick={() => void handleResetGroup(group.number, group.title)}
                      disabled={busyAction !== null}
                    >
                      <Icon name="close" size={14} />
                      <span>
                        {busyAction === `reset-${group.number}` ? "Mereset..." : "Reset Pilihan Kelompok"}
                      </span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="admin-dept-empty-group">
                  <Icon name="clock" size={20} />
                  <span>Kelompok ini belum mengirim pilihan karakter Chief Detective.</span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {snapshot.accounts && snapshot.accounts.length > 0 && (
        <div className="panel admin-dept-cards-manager">
          <div className="admin-dept-manager-header">
            <div>
              <h3>Akun Login Kelompok (Halaman Pemilihan Chief Detective)</h3>
              <p>
                Bagikan email &amp; password berikut ke perwakilan masing-masing kelompok. Satu
                kelompok menggunakan satu akun khusus untuk memilih karakter.
              </p>
            </div>
            <button
              type="button"
              className="btn-admin-action"
              onClick={() => setShowPasswords((v) => !v)}
            >
              <Icon name="lock" size={14} />
              <span>{showPasswords ? "Sembunyikan Password" : "Tampilkan Password"}</span>
            </button>
          </div>

          <div className="admin-accounts-grid">
            {snapshot.accounts.map((acc) => (
              <div key={acc.groupNumber} className="admin-account-item">
                <span className="eyebrow">{acc.groupTitle}</span>
                <div className="admin-account-row">
                  <span>Email:</span>
                  <code>{acc.email}</code>
                </div>
                <div className="admin-account-row">
                  <span>Password:</span>
                  <code>{showPasswords ? acc.password : "••••••••••"}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel admin-dept-cards-manager">
        <div className="admin-dept-manager-header">
          <div>
            <h3>Kelola 7 Kartu Karakter &amp; Deskripsi</h3>
            <p>
              Ubah kode, judul, petunjuk peran, deskripsi karakter, variasi visual, atau unggah
              gambar karakter kustom kapan saja.
            </p>
          </div>
          <span className="status-chip">
            Terpilih: {Object.keys(snapshot.takenCardIds).length} / {snapshot.cards.length} Karakter
          </span>
        </div>

        <div className="admin-dept-cards-grid">
          {snapshot.cards.map((card) => {
            const owner = snapshot.takenCardIds[card.id];
            const isEditing = editingCardId === card.id && draftCard;

            return (
              <div key={card.id} className={`admin-silhouette-manage-card ${owner ? "is-claimed" : ""}`}>
                {isEditing ? (
                  <form onSubmit={handleSaveCard} className="admin-silhouette-edit-form">
                    <div className="admin-edit-head">
                      <strong>Edit Kartu #{card.id}</strong>
                      <button type="button" className="btn-admin-action" onClick={closeEditor}>
                        Batal
                      </button>
                    </div>

                    <div className="form-field-group">
                      <label className="field-label">Kode Kartu</label>
                      <input
                        type="text"
                        className="quiz-input"
                        value={draftCard.code}
                        onChange={(e) => setDraftCard({ ...draftCard, code: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-field-group">
                      <label className="field-label">Judul Karakter</label>
                      <input
                        type="text"
                        className="quiz-input"
                        value={draftCard.title}
                        onChange={(e) => setDraftCard({ ...draftCard, title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-field-group">
                      <label className="field-label">Petunjuk Peran</label>
                      <input
                        type="text"
                        className="quiz-input"
                        value={draftCard.roleHint}
                        onChange={(e) => setDraftCard({ ...draftCard, roleHint: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-field-group">
                      <label className="field-label">Deskripsi Karakter</label>
                      <textarea
                        rows={3}
                        className="quiz-input"
                        value={draftCard.description}
                        onChange={(e) => setDraftCard({ ...draftCard, description: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-field-group">
                      <label className="field-label">Variasi Siluet Bawaan</label>
                      <select
                        className="quiz-input"
                        value={draftCard.silhouetteVariant}
                        onChange={(e) =>
                          setDraftCard({
                            ...draftCard,
                            silhouetteVariant: e.target.value as SilhouetteVariant,
                          })
                        }
                      >
                        {SILHOUETTE_VARIANTS.map((variant) => (
                          <option key={variant} value={variant}>
                            {SILHOUETTE_VARIANT_LABELS[variant]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field-group">
                      <label className="field-label">Gambar Siluet Kustom (Opsional URL / Upload)</label>
                      <input
                        type="text"
                        className="quiz-input"
                        placeholder="https://... atau unggah file di bawah"
                        value={draftCard.customImageUrl || ""}
                        onChange={(e) =>
                          setDraftCard({ ...draftCard, customImageUrl: e.target.value })
                        }
                      />
                      <div className="admin-upload-row">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => void handleFileUpload(e)}
                        />
                        {draftCard.customImageUrl && (
                          <button
                            type="button"
                            className="btn-delete-row"
                            onClick={() => setDraftCard({ ...draftCard, customImageUrl: "" })}
                          >
                            Pakai SVG Bawaan
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary-link"
                      disabled={busyAction !== null}
                    >
                      <span>
                        {busyAction === `save-${card.id}` ? "Menyimpan..." : "Simpan Perubahan Kartu"}
                      </span>
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="silhouette-card-header">
                      <span className="silhouette-code">{card.code}</span>
                      {owner ? (
                        <span className="silhouette-status-pill is-owned">
                          Dipilih {owner.groupName} (#{owner.selectionOrder})
                        </span>
                      ) : (
                        <span className="silhouette-status-pill is-available">Belum Dipilih</span>
                      )}
                    </div>

                    <SilhouetteArt
                      variant={card.silhouetteVariant}
                      customImageUrl={card.customImageUrl}
                      alt={`${card.code} - ${card.title}`}
                      compact
                    />

                    <div className="silhouette-card-body">
                      <h4 className="silhouette-title">{card.title}</h4>
                      <span className="admin-real-name-tag">{card.realName}</span>
                      <span className="silhouette-role-hint">{card.roleHint}</span>
                      <p className="silhouette-desc">{card.description}</p>
                    </div>

                    <button
                      type="button"
                      className="btn-admin-action admin-edit-card-btn"
                      onClick={() => openEditor(card)}
                    >
                      <Icon name="sparkles" size={14} />
                      <span>Edit Karakter &amp; Deskripsi</span>
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
