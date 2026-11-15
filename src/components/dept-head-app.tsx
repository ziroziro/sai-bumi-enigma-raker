"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { SilhouetteArt } from "@/components/silhouette-art";
import { formatRegistrationTime } from "@/config/event";
import type { DeptHeadCard, PublicDeptHeadSnapshot } from "@/domain/dept-head";

interface DeptHeadAppProps {
  initialSnapshot: PublicDeptHeadSnapshot | null;
}

export function DeptHeadApp({ initialSnapshot }: DeptHeadAppProps) {
  const [snapshot, setSnapshot] = useState<PublicDeptHeadSnapshot | null>(initialSnapshot);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const cardById = useMemo(() => {
    const map = new Map<number, DeptHeadCard>();
    for (const card of snapshot?.cards ?? []) {
      map.set(card.id, card);
    }
    return map;
  }, [snapshot]);

  const takenByOtherSet = useMemo(
    () => new Set<number>(snapshot?.takenByOtherCardIds ?? []),
    [snapshot]
  );

  const refreshSnapshot = useCallback(async () => {
    if (!snapshot) return;
    setRefreshing(true);
    try {
      const response = await fetch("/api/dept-head", {
        cache: "no-store",
        credentials: "include",
      });
      if (response.status === 401) {
        setSnapshot(null);
        setSelectedCardIds([]);
        return;
      }
      if (!response.ok) return;
      const latest = (await response.json()) as PublicDeptHeadSnapshot;
      setSnapshot(latest);

      const takenSet = new Set(latest.takenByOtherCardIds);
      setSelectedCardIds((prev) => prev.filter((id) => !takenSet.has(id)));
    } catch {
      // keep current state cleanly on transient network issues
    } finally {
      setRefreshing(false);
    }
  }, [snapshot]);

  useEffect(() => {
    if (!snapshot) return;
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
  }, [snapshot, refreshSnapshot]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);

    try {
      const response = await fetch("/api/dept-head/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: emailInput.trim(),
          password: passwordInput,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        snapshot?: PublicDeptHeadSnapshot;
      };

      if (!response.ok || !payload.snapshot) {
        setLoginError(payload.error || "Email atau password akun kelompok tidak valid.");
        return;
      }

      setSnapshot(payload.snapshot);
      setSelectedCardIds([]);
      setErrorMessage(null);
      setSuccessMessage(null);
      setPasswordInput("");
    } catch {
      setLoginError("Gagal menghubungi server untuk masuk ke akun kelompok.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/dept-head/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    setSnapshot(null);
    setSelectedCardIds([]);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function handleToggleCard(cardId: number) {
    if (!snapshot || snapshot.mySelection || submitting) return;
    if (snapshot.totalGroupsSubmitted >= snapshot.maxGroups) return;
    if (takenByOtherSet.has(cardId)) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const requiredCount = snapshot.requiredCount;
    setSelectedCardIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }
      if (requiredCount === 1) {
        return [cardId];
      }
      if (prev.length >= requiredCount) {
        setErrorMessage(
          `Kuota pemilihan saat ini adalah ${requiredCount} karakter. Batalkan salah satu karakter terlebih dahulu untuk mengganti pilihan.`
        );
        return prev;
      }
      return [...prev, cardId];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!snapshot || snapshot.mySelection) return;

    if (selectedCardIds.length !== snapshot.requiredCount) {
      setErrorMessage(
        `Silakan pilih tepat ${snapshot.requiredCount} karakter sebelum menyimpan.`
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
        credentials: "include",
        body: JSON.stringify({
          cardIds: selectedCardIds,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        snapshot?: PublicDeptHeadSnapshot;
      };

      if (response.status === 401) {
        setSnapshot(null);
        setLoginError(payload.error || "Sesi login telah berakhir. Silakan login kembali.");
        return;
      }

      if (!response.ok) {
        setErrorMessage(payload.error || "Gagal menyimpan pilihan karakter.");
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
        `Pilihan karakter untuk ${snapshot.group.title} berhasil dikunci ke database!`
      );
    } catch {
      setErrorMessage("Terjadi kesalahan jaringan. Silakan muat ulang status lalu coba kembali.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!snapshot) {
    return (
      <div className="dept-login-wrapper">
        <div className="panel dept-login-card">
          <div className="admin-brand-header">
            <span className="brand-mark">
              <Icon name="shield" size={24} />
            </span>
            <div>
              <span className="eyebrow">AKSES KELOMPOK TERBATAS</span>
              <h1>Login Pemilihan Karakter</h1>
            </div>
          </div>

          <p className="dept-login-desc">
            Gunakan email dan password resmi kelompok Anda untuk masuk ke halaman pemilihan karakter
            Department Head. Setiap kelompok hanya menggunakan satu akun login.
          </p>

          <form onSubmit={handleLogin} className="admin-form">
            <div className="form-field-group">
              <label htmlFor="dept-login-email" className="field-label">
                Email Kelompok
              </label>
              <input
                id="dept-login-email"
                type="email"
                className="quiz-input"
                placeholder="contoh: lupin@enigma.id"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="dept-login-password" className="field-label">
                Password Kelompok
              </label>
              <input
                id="dept-login-password"
                type="password"
                className="quiz-input"
                placeholder="Masukkan password kelompok..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
            </div>

            {loginError && (
              <div className="notice error-notice" role="alert">
                <Icon name="close" size={16} />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary-link btn-submit-admin"
              disabled={loggingIn || !emailInput.trim() || !passwordInput}
            >
              <span>{loggingIn ? "Memeriksa Akun..." : "Masuk Halaman Pemilihan"}</span>
              <Icon name="arrow" size={18} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  const availableCardsCount =
    snapshot.cards.length -
    snapshot.takenByOtherCardIds.length -
    (snapshot.mySelection?.cardIds.length ?? 0);
  const isAllSubmitted = snapshot.totalGroupsSubmitted >= snapshot.maxGroups;
  const hasSubmitted = Boolean(snapshot.mySelection);

  return (
    <div className="page-shell dept-head-shell">
      <section className="panel dept-head-hero">
        <div className="dept-head-hero-head">
          <div>
            <span className="eyebrow">
              <Icon name="shield" size={14} /> AKUN AKTIF · {snapshot.group.title.toUpperCase()}
            </span>
            <h1 className="dept-head-title">Pemilihan Karakter Dept Head</h1>
            <p className="dept-head-subtitle">
              Amati 9 kartu karakter beserta petunjuk sifatnya, lalu tentukan karakter Department Head
              yang paling tepat untuk tim Anda. Karakter yang telah dipilih tim lain otomatis dikunci.
            </p>
          </div>
          <div className="dept-hero-actions">
            <button
              type="button"
              className="btn-refresh-dept-head"
              onClick={() => void refreshSnapshot()}
              disabled={refreshing}
            >
              <Icon name="refresh" size={16} />
              <span>{refreshing ? "Menyegarkan..." : "Segarkan"}</span>
            </button>
            <button
              type="button"
              className="btn-refresh-dept-head is-logout"
              onClick={() => void handleLogout()}
            >
              <Icon name="close" size={16} />
              <span>Keluar Akun</span>
            </button>
          </div>
        </div>

        <div className="dept-head-metrics">
          <div className="dept-metric-pill">
            <span className="metric-label">Kelompok Sudah Submit</span>
            <strong className="metric-value">
              {snapshot.totalGroupsSubmitted} / {snapshot.maxGroups} Kelompok
            </strong>
          </div>
          <div className="dept-metric-pill">
            <span className="metric-label">Karakter Tersedia</span>
            <strong className="metric-value">
              {Math.max(0, availableCardsCount)} / {snapshot.cards.length} Karakter
            </strong>
          </div>
          <div className={`dept-metric-pill ${snapshot.requiredCount === 1 && !hasSubmitted ? "is-final-slot" : ""}`}>
            <span className="metric-label">Kuota Pemilihan Tim Anda</span>
            <strong className="metric-value">
              {hasSubmitted
                ? `Terkunci · ${snapshot.mySelection?.cardIds.length ?? 0} Karakter Terpilih`
                : isAllSubmitted
                  ? "Semua Kelompok Selesai"
                  : `Pilih ${snapshot.requiredCount} Karakter`}
            </strong>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="panel dept-head-step-panel">
        <div className="dept-step-header">
          <span className="step-pill">PROFIL KARAKTER</span>
          <div className="dept-step-title-wrap">
            <h2 className="dept-step-heading">
              Pilih Kartu Karakter — {snapshot.group.title}
            </h2>
            {snapshot.mySelection ? (
              <p className="section-caption is-confirmed-text">
                Pilihan tim Anda telah dikunci pada {formatRegistrationTime(snapshot.mySelection.submittedAt)}.
              </p>
            ) : (
              <p className="section-caption">
                Silakan pilih tepat{" "}
                <strong>
                  {snapshot.requiredCount} karakter
                </strong>{" "}
                yang mewakili kebutuhan tim Anda.
              </p>
            )}
          </div>
        </div>

        {snapshot.mySelection && (
          <div className="notice success-notice dept-head-notice" role="status">
            <Icon name="check" size={18} />
            <div>
              <strong>Pilihan Karakter Sudah Tersimpan</strong>
              <p>
                {snapshot.group.title} telah memilih:{" "}
                {snapshot.mySelection.cardIds
                  .map((id) => {
                    const c = cardById.get(id);
                    return c ? `${c.code} (${c.title})` : `Karakter ${id}`;
                  })
                  .join(" & ")}
                . Hubungi panitia di Admin Enigma apabila diperlukan reset.
              </p>
            </div>
          </div>
        )}

        {successMessage && !snapshot.mySelection && (
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
            const isOwnedByCurrentGroup = Boolean(snapshot.mySelection?.cardIds.includes(card.id));
            const isTakenByOther = !isOwnedByCurrentGroup && takenByOtherSet.has(card.id);
            const isDraftSelected = selectedCardIds.includes(card.id);
            const isDisabled = hasSubmitted || isTakenByOther || isAllSubmitted || submitting;

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
                <div className="tcg-card-topbar">
                  <h3 className="tcg-card-name">{card.title}</h3>
                  {isOwnedByCurrentGroup ? (
                    <span className="silhouette-status-pill is-owned">
                      <Icon name="check" size={13} /> Pilihan Tim Anda
                    </span>
                  ) : isTakenByOther ? (
                    <span className="silhouette-status-pill is-taken">
                      <Icon name="lock" size={13} /> Karakter Sudah Dipilih
                    </span>
                  ) : isDraftSelected ? (
                    <span className="silhouette-status-pill is-selected">
                      <Icon name="check" size={13} /> Terpilih
                    </span>
                  ) : (
                    <span className="silhouette-status-pill is-available">Tersedia</span>
                  )}
                </div>

                <div className="tcg-stars-row" aria-label="Bintang 5">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>

                <SilhouetteArt
                  variant={card.silhouetteVariant}
                  customImageUrl={card.customImageUrl}
                  alt={`${card.code} - ${card.title}`}
                />

                <div className="tcg-meta-row">
                  <span className="tcg-edition">ENIGMA · 2027</span>
                  <span className="silhouette-code">{card.code}</span>
                </div>

                <div className="tcg-lore-box">
                  <span className="tcg-ability-tag">[ {card.roleHint} ]</span>
                  <p className="tcg-desc">{card.description}</p>
                  <div className="tcg-stats-row">
                    <span>PWR / {card.power}</span>
                    <span>DEF / {card.defense}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {!hasSubmitted && !isAllSubmitted && (
          <div className="dept-submit-bar">
            <div className="dept-submit-summary">
              <span className="summary-label">
                Karakter Dipilih ({selectedCardIds.length}/{snapshot.requiredCount}):
              </span>
              {selectedCardIds.length === 0 ? (
                <span className="summary-empty">Belum ada kartu karakter yang dipilih.</span>
              ) : (
                <div className="summary-chips">
                  {selectedCardIds.map((id) => {
                    const chosen = cardById.get(id);
                    return (
                      <span key={id} className="summary-chip">
                        {chosen?.code || `KARAKTER ${id}`} — {chosen?.title || "Karakter"}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary-link btn-dept-submit"
              disabled={submitting || selectedCardIds.length !== snapshot.requiredCount}
            >
              <span>
                {submitting
                  ? "Menyimpan Pilihan..."
                  : `Submit Pilihan (${selectedCardIds.length}/${snapshot.requiredCount})`}
              </span>
              <Icon name="arrow" size={18} />
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
