"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { SilhouetteArt } from "@/components/silhouette-art";
import { formatRegistrationTime, officialGroups } from "@/config/event";
import type { DeptHeadCard, DeptHeadStateSnapshot } from "@/domain/dept-head";

interface DeptHeadAppProps {
  initialSnapshot: DeptHeadStateSnapshot;
}

export function DeptHeadApp({ initialSnapshot }: DeptHeadAppProps) {
  const [snapshot, setSnapshot] = useState<DeptHeadStateSnapshot>(initialSnapshot);
  const [selectedGroupNumber, setSelectedGroupNumber] = useState<number | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectionByGroup = useMemo(() => {
    const map = new Map<number, DeptHeadStateSnapshot["selections"][number]>();
    for (const item of snapshot.selections) {
      map.set(item.groupNumber, item);
    }
    return map;
  }, [snapshot.selections]);

  const cardById = useMemo(() => {
    const map = new Map<number, DeptHeadCard>();
    for (const card of snapshot.cards) {
      map.set(card.id, card);
    }
    return map;
  }, [snapshot.cards]);

  const selectedGroupMeta = useMemo(
    () => officialGroups.find((g) => g.number === selectedGroupNumber) ?? null,
    [selectedGroupNumber]
  );

  const existingGroupSelection = useMemo(
    () => (selectedGroupNumber ? selectionByGroup.get(selectedGroupNumber) ?? null : null),
    [selectedGroupNumber, selectionByGroup]
  );

  const requiredCount = snapshot.nextRequiredCount;
  const availableCardsCount = snapshot.cards.length - Object.keys(snapshot.takenCardIds).length;
  const nextOrder = Math.min(snapshot.maxGroups, snapshot.totalGroupsSubmitted + 1);
  const isAllSubmitted = snapshot.totalGroupsSubmitted >= snapshot.maxGroups;

  const refreshSnapshot = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/dept-head", { cache: "no-store" });
      if (!response.ok) return;
      const latest = (await response.json()) as DeptHeadStateSnapshot;
      setSnapshot(latest);

      // Remove any drafted card IDs that were claimed by another group while user was choosing
      setSelectedCardIds((prev) => prev.filter((id) => !latest.takenCardIds[id]));
    } catch {
      // keep current state cleanly on transient network issues
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const onFocus = () => {
      void refreshSnapshot();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshSnapshot();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshSnapshot]);

  function handleSelectGroup(groupNumber: number) {
    setSelectedGroupNumber(groupNumber);
    setSelectedCardIds([]);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function handleToggleCard(cardId: number) {
    if (!selectedGroupNumber || existingGroupSelection || isAllSubmitted || submitting) {
      return;
    }

    if (snapshot.takenCardIds[cardId]) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    setSelectedCardIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }
      if (requiredCount === 1) {
        return [cardId];
      }
      if (prev.length >= requiredCount) {
        setErrorMessage(
          `Kuota saat ini maksimal ${requiredCount} pilihan Dept Head. Batalkan salah satu siluet yang dipilih terlebih dahulu.`
        );
        return prev;
      }
      return [...prev, cardId];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGroupNumber || existingGroupSelection) return;

    if (selectedCardIds.length !== requiredCount) {
      setErrorMessage(
        requiredCount === 1
          ? "Kelompok terakhir harus memilih tepat 1 siluet Dept Head."
          : `Silakan pilih tepat ${requiredCount} siluet Dept Head sebelum menyimpan.`
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/dept-head", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupNumber: selectedGroupNumber,
          cardIds: selectedCardIds,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        code?: string;
        snapshot?: DeptHeadStateSnapshot;
        record?: DeptHeadStateSnapshot["selections"][number];
      };

      if (!response.ok) {
        setErrorMessage(payload.error || "Gagal menyimpan pilihan Dept Head.");
        await refreshSnapshot();
        return;
      }

      if (payload.snapshot) {
        setSnapshot(payload.snapshot);
      } else {
        await refreshSnapshot();
      }
      setSelectedCardIds([]);
      setSuccessMessage(
        `Pilihan Dept Head untuk ${selectedGroupMeta?.title ?? `Kelompok ${selectedGroupNumber}`} berhasil dikunci ke database!`
      );
    } catch {
      setErrorMessage("Terjadi kesalahan jaringan. Silakan muat ulang status lalu coba kembali.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell dept-head-shell">
      <section className="panel dept-head-hero">
        <div className="dept-head-hero-head">
          <div>
            <span className="eyebrow">
              <Icon name="shield" size={14} /> MISI PENENTUAN PIMPINAN KELOMPOK
            </span>
            <h1 className="dept-head-title">Pemilihan Department Head</h1>
            <p className="dept-head-subtitle">
              Pilih kelompok Anda terlebih dahulu, lalu amati 9 siluet misterius beserta petunjuk karakternya.
              Tiga kelompok pertama yang melakukan submit dapat memilih <strong>2 Dept Head</strong>,
              sedangkan kelompok yang memilih terakhir hanya dapat memilih <strong>1 Dept Head</strong>.
            </p>
          </div>
          <button
            type="button"
            className="btn-refresh-dept-head"
            onClick={() => void refreshSnapshot()}
            disabled={refreshing}
          >
            <Icon name="refresh" size={16} />
            <span>{refreshing ? "Menyegarkan..." : "Segarkan Status"}</span>
          </button>
        </div>

        <div className="dept-head-metrics">
          <div className="dept-metric-pill">
            <span className="metric-label">Kelompok Sudah Submit</span>
            <strong className="metric-value">
              {snapshot.totalGroupsSubmitted} / {snapshot.maxGroups} Kelompok
            </strong>
          </div>
          <div className="dept-metric-pill">
            <span className="metric-label">Siluet Tersisa</span>
            <strong className="metric-value">
              {availableCardsCount} / {snapshot.cards.length} Kartu
            </strong>
          </div>
          <div className={`dept-metric-pill ${requiredCount === 1 && !isAllSubmitted ? "is-final-slot" : ""}`}>
            <span className="metric-label">Aturan Kuota Saat Ini</span>
            <strong className="metric-value">
              {isAllSubmitted
                ? "Semua Kelompok Selesai"
                : requiredCount === 1
                  ? `Urutan Ke-4 (Terakhir): Maks 1 Dept Head`
                  : `Urutan Ke-${nextOrder}: Pilih 2 Dept Head`}
            </strong>
          </div>
        </div>
      </section>

      <section className="panel dept-head-step-panel">
        <div className="dept-step-header">
          <span className="step-pill">LANGKAH 1</span>
          <div>
            <h2 className="dept-step-heading">Pilih Nama Kelompok Anda</h2>
            <p className="section-caption">
              Setiap kelompok hanya dapat mengirim satu kali. Kartu siluet yang sudah diklaim tidak dapat dipilih kelompok lain.
            </p>
          </div>
        </div>

        <div className="dept-group-grid">
          {officialGroups.map((group) => {
            const submitted = selectionByGroup.get(group.number);
            const isSelected = selectedGroupNumber === group.number;
            return (
              <button
                key={group.number}
                type="button"
                onClick={() => handleSelectGroup(group.number)}
                className={`dept-group-card ${isSelected ? "is-selected" : ""} ${submitted ? "is-submitted" : ""}`}
              >
                <div className="dept-group-card-top">
                  <span className="dept-group-number">Kelompok {group.number}</span>
                  <span className={`dept-group-badge ${submitted ? "is-done" : "is-open"}`}>
                    {submitted ? `Urutan #${submitted.selectionOrder}` : "Belum Submit"}
                  </span>
                </div>
                <strong className="dept-group-name">{group.name}</strong>
                <span className="dept-group-meta">
                  {submitted
                    ? `Sudah memilih ${submitted.cardIds.length} Dept Head`
                    : isAllSubmitted
                      ? "Seluruh kuota kelompok telah terisi"
                      : "Klik untuk lanjut memilih siluet"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {selectedGroupMeta && (
        <form onSubmit={handleSubmit} className="panel dept-head-step-panel">
          <div className="dept-step-header">
            <span className="step-pill">LANGKAH 2</span>
            <div className="dept-step-title-wrap">
              <h2 className="dept-step-heading">
                Pilih Kartu Siluet Dept Head — {selectedGroupMeta.title}
              </h2>
              {existingGroupSelection ? (
                <p className="section-caption is-confirmed-text">
                  Kelompok ini sudah mengunci {existingGroupSelection.cardIds.length} siluet Dept Head sebagai kelompok ke-{existingGroupSelection.selectionOrder} pada{" "}
                  {formatRegistrationTime(existingGroupSelection.submittedAt)}.
                </p>
              ) : (
                <p className="section-caption">
                  Status giliran Anda sekarang:{" "}
                  <strong>
                    Urutan ke-{nextOrder} dari {snapshot.maxGroups} kelompok
                  </strong>{" "}
                  → Wajib memilih tepat{" "}
                  <strong>
                    {requiredCount} {requiredCount === 1 ? "Dept Head (kuota terakhir)" : "Dept Head"}
                  </strong>
                  .
                </p>
              )}
            </div>
          </div>

          {existingGroupSelection && (
            <div className="notice success-notice dept-head-notice" role="status">
              <Icon name="check" size={18} />
              <div>
                <strong>Pilihan Kelompok Sudah Tersimpan</strong>
                <p>
                  {selectedGroupMeta.title} telah memilih:{" "}
                  {existingGroupSelection.cardIds
                    .map((id) => cardById.get(id)?.title || `Siluet #${id}`)
                    .join(" & ")}
                  . Jika ada kesalahan, hubungi panitia di Admin Enigma untuk reset.
                </p>
              </div>
            </div>
          )}

          {successMessage && !existingGroupSelection && (
            <div className="notice success-notice dept-head-notice" role="status">
              <Icon name="check" size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="notice error-notice dept-head-notice" role="alert">
              <Icon name="close" size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="silhouette-grid">
            {snapshot.cards.map((card) => {
              const owner = snapshot.takenCardIds[card.id];
              const isOwnedByCurrentGroup =
                Boolean(existingGroupSelection?.cardIds.includes(card.id)) ||
                owner?.groupNumber === selectedGroupMeta.number;
              const isTakenByOther = Boolean(owner && owner.groupNumber !== selectedGroupMeta.number);
              const isDraftSelected = selectedCardIds.includes(card.id);
              const isDisabled = Boolean(existingGroupSelection) || isTakenByOther || isAllSubmitted || submitting;

              return (
                <button
                  key={card.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleToggleCard(card.id)}
                  className={`silhouette-card ${isDraftSelected ? "is-selected" : ""} ${
                    isOwnedByCurrentGroup ? "is-owned" : ""
                  } ${isTakenByOther ? "is-taken" : ""}`}
                >
                  <div className="silhouette-card-header">
                    <span className="silhouette-code">{card.code}</span>
                    {isOwnedByCurrentGroup ? (
                      <span className="silhouette-status-pill is-owned">
                        <Icon name="check" size={13} /> Pilihan Tim Ini
                      </span>
                    ) : isTakenByOther && owner ? (
                      <span className="silhouette-status-pill is-taken">
                        <Icon name="lock" size={13} /> Dipilih {owner.groupName}
                      </span>
                    ) : isDraftSelected ? (
                      <span className="silhouette-status-pill is-selected">
                        <Icon name="check" size={13} /> Terpilih
                      </span>
                    ) : (
                      <span className="silhouette-status-pill is-available">Tersedia</span>
                    )}
                  </div>

                  <SilhouetteArt
                    variant={card.silhouetteVariant}
                    customImageUrl={card.customImageUrl}
                    alt={`${card.code} - ${card.title}`}
                  />

                  <div className="silhouette-card-body">
                    <h3 className="silhouette-title">{card.title}</h3>
                    <span className="silhouette-role-hint">{card.roleHint}</span>
                    <p className="silhouette-desc">{card.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {!existingGroupSelection && !isAllSubmitted && (
            <div className="dept-submit-bar">
              <div className="dept-submit-summary">
                <span className="summary-label">Siluet Dipilih ({selectedCardIds.length}/{requiredCount}):</span>
                {selectedCardIds.length === 0 ? (
                  <span className="summary-empty">Belum ada kartu siluet yang dipilih.</span>
                ) : (
                  <div className="summary-chips">
                    {selectedCardIds.map((id) => {
                      const chosen = cardById.get(id);
                      return (
                        <span key={id} className="summary-chip">
                          {chosen?.code || `#${id}`} — {chosen?.title || "Siluet"}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary-link btn-dept-submit"
                disabled={submitting || selectedCardIds.length !== requiredCount}
              >
                <span>
                  {submitting
                    ? "Menyimpan Pilihan..."
                    : `Submit Pilihan (${selectedCardIds.length}/${requiredCount})`}
                </span>
                <Icon name="arrow" size={18} />
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
