"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { SilhouetteArt } from "@/components/silhouette-art";
import { formatRegistrationTime } from "@/config/event";
import {
  type DeptHeadCard,
  type LockedDeptHeadView,
  type PublicDeptHeadSnapshot,
} from "@/domain/dept-head";

interface DeptHeadAppProps {
  initialSnapshot: PublicDeptHeadSnapshot | null;
  initialLockedView?: LockedDeptHeadView | null;
  initialIsPageUnlocked?: boolean;
}

export function DeptHeadApp({
  initialSnapshot,
  initialLockedView = null,
  initialIsPageUnlocked = true,
}: DeptHeadAppProps) {
  const [isPageUnlocked, setIsPageUnlocked] = useState<boolean>(initialIsPageUnlocked);
  const [checkingAccess, setCheckingAccess] = useState<boolean>(false);
  const [snapshot, setSnapshot] = useState<PublicDeptHeadSnapshot | null>(initialSnapshot);
  const [lockedView, setLockedView] = useState<LockedDeptHeadView | null>(initialLockedView);
  const [postSubmitNotice, setPostSubmitNotice] = useState<string | null>(null);

  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [revealedCardIds, setRevealedCardIds] = useState<number[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const checkPageAccess = useCallback(async () => {
    setCheckingAccess(true);
    try {
      const response = await fetch("/api/dept-head", {
        cache: "no-store",
        credentials: "include",
      });
      if (response.status === 403) {
        setIsPageUnlocked(false);
        return;
      }
      if (response.status === 401) {
        setIsPageUnlocked(true);
        setSnapshot(null);
        setSelectedCardIds([]);
        return;
      }
      if (!response.ok) return;
      const latest = (await response.json()) as
        | PublicDeptHeadSnapshot
        | { alreadySubmitted: true; lockedView?: LockedDeptHeadView };

      setIsPageUnlocked(true);
      if ("alreadySubmitted" in latest && latest.alreadySubmitted && latest.lockedView) {
        setSnapshot(null);
        setLockedView(latest.lockedView);
        setSelectedCardIds([]);
        return;
      }
      setSnapshot(latest as PublicDeptHeadSnapshot);
    } catch {
      // ignore transient network errors
    } finally {
      setCheckingAccess(false);
    }
  }, []);

  const refreshSnapshot = useCallback(async () => {
    if (!snapshot) return;
    setRefreshing(true);
    try {
      const response = await fetch("/api/dept-head", {
        cache: "no-store",
        credentials: "include",
      });
      if (response.status === 403) {
        setIsPageUnlocked(false);
        return;
      }
      if (response.status === 401) {
        setSnapshot(null);
        setSelectedCardIds([]);
        return;
      }
      if (!response.ok) return;
      const latest = (await response.json()) as
        | PublicDeptHeadSnapshot
        | { alreadySubmitted: true; lockedView?: LockedDeptHeadView };

      if ("alreadySubmitted" in latest && latest.alreadySubmitted && latest.lockedView) {
        setSnapshot(null);
        setLockedView(latest.lockedView);
        setSelectedCardIds([]);
        return;
      }

      const publicLatest = latest as PublicDeptHeadSnapshot;
      setSnapshot(publicLatest);

      const takenSet = new Set(publicLatest.takenByOtherCardIds);
      setSelectedCardIds((prev) => prev.filter((id) => !takenSet.has(id)));
    } catch {
      // keep current state cleanly on transient network issues
    } finally {
      setRefreshing(false);
    }
  }, [snapshot]);

  useEffect(() => {
    if (isPageUnlocked) return;
    const interval = setInterval(() => {
      void checkPageAccess();
    }, 5000);
    const onFocus = () => {
      void checkPageAccess();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [isPageUnlocked, checkPageAccess]);

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
    setPostSubmitNotice(null);

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
        isPageUnlocked?: boolean;
        alreadySubmitted?: boolean;
        lockedView?: LockedDeptHeadView;
        snapshot?: PublicDeptHeadSnapshot;
      };

      if (response.status === 403 || payload.isPageUnlocked === false) {
        setIsPageUnlocked(false);
        return;
      }

      if (!response.ok) {
        setLoginError(payload.error || "Email atau password akun kelompok tidak valid.");
        return;
      }

      if (payload.alreadySubmitted && payload.lockedView) {
        setSnapshot(null);
        setLockedView(payload.lockedView);
        setSelectedCardIds([]);
        setPasswordInput("");
        return;
      }

      if (!payload.snapshot) {
        setLoginError("Gagal memuat data pemilihan karakter kelompok.");
        return;
      }

      setLockedView(null);
      setSnapshot(payload.snapshot);
      setSelectedCardIds([]);
      setErrorMessage(null);
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
    setLockedView(null);
    setPostSubmitNotice(null);
    setSelectedCardIds([]);
    setRevealedCardIds([]);
    setErrorMessage(null);
  }

  function handleToggleRevealCard(cardId: number) {
    setRevealedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  }

  function handleToggleRevealAll() {
    if (!lockedView) return;
    const allIds = lockedView.selectedCards.map((c) => c.id);
    const allRevealed = allIds.every((id) => revealedCardIds.includes(id));
    setRevealedCardIds(allRevealed ? [] : allIds);
  }

  function handleToggleCard(cardId: number) {
    if (!snapshot || snapshot.mySelection || submitting) return;
    if (snapshot.totalGroupsSubmitted >= snapshot.maxGroups) return;
    if (takenByOtherSet.has(cardId)) return;

    setErrorMessage(null);

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
        message?: string;
        lockedView?: LockedDeptHeadView | null;
      };

      if (response.status === 403) {
        setIsPageUnlocked(false);
        return;
      }

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

      // Tidak langsung logout: tampilkan kartu pilihan kelompok beserta ucapan terima kasih
      const submittedGroupTitle = snapshot.group.title;
      const fallbackSelectedCards = selectedCardIds
        .map((id) => cardById.get(id))
        .filter((card): card is DeptHeadCard => Boolean(card));
      const nextLockedView: LockedDeptHeadView = payload.lockedView ?? {
        group: snapshot.group,
        selectedCards: fallbackSelectedCards,
        submittedAt: new Date().toISOString(),
      };

      setSnapshot(null);
      setLockedView(nextLockedView);
      setSelectedCardIds([]);
      setRevealedCardIds([]);
      setLoginError(null);
      setPostSubmitNotice(
        `Terima kasih! Submit pilihan karakter untuk ${submittedGroupTitle} berhasil disimpan. Klik kartu di bawah untuk me-reveal karakter!`
      );
    } catch {
      setErrorMessage("Terjadi kesalahan jaringan. Silakan muat ulang status lalu coba kembali.");
    } finally {
      setSubmitting(false);
    }
  }

  // TAMPILAN SAAT HALAMAN DIKUNCI OLEH ADMIN
  if (!isPageUnlocked) {
    return (
      <div className="dept-login-wrapper">
        <div className="panel dept-login-card dept-locked-gate-card">
          <div className="dept-locked-icon-ring" aria-hidden="true">
            <Icon name="lock" size={28} />
          </div>
          <span className="eyebrow is-locked-eyebrow">
            <Icon name="lock" size={13} /> AKSES HALAMAN DIKUNCI ADMIN
          </span>
          <h1 className="dept-locked-gate-title">Halaman Chief Detective Masih Terkunci</h1>
          <p className="dept-login-desc">
            Sesi pemilihan dan <em>reveal</em> kartu karakter <strong>Chief Detective</strong> belum
            dibuka oleh Admin / Game Master. Halaman ini akan otomatis terbuka begitu Admin membuka
            kunci akses.
          </p>

          <button
            type="button"
            className="btn-primary-link btn-submit-admin"
            onClick={() => void checkPageAccess()}
            disabled={checkingAccess}
          >
            <Icon name="refresh" size={17} />
            <span>{checkingAccess ? "Memeriksa Status Akses..." : "Periksa Status Akses"}</span>
          </button>
        </div>
      </div>
    );
  }

  // TAMPILAN KARTU PILIHAN KELOMPOK (SETELAH SUBMIT ATAU SAAT LOGIN ULANG)
  if (lockedView) {
    const allCardIds = lockedView.selectedCards.map((c) => c.id);
    const allRevealed =
      allCardIds.length > 0 && allCardIds.every((id) => revealedCardIds.includes(id));

    return (
      <div className="page-shell dept-head-shell">
        <section className="panel dept-head-hero">
          <div className="dept-head-hero-head">
            <div>
              <span className="eyebrow">
                <Icon name="check" size={14} /> PILIHAN TERSIMPAN · {lockedView.group.title.toUpperCase()}
              </span>
              <h1 className="dept-head-title">Terima Kasih, Pilihan Anda Tersimpan</h1>
              <p className="dept-head-subtitle">
                Terima kasih, <strong>{lockedView.group.title}</strong> telah mengirimkan pilihan pada{" "}
                {formatRegistrationTime(lockedView.submittedAt)}. Klik masing-masing kartu di bawah
                untuk memutar dan me-reveal identitas kartu karakter Chief Detective pilihan tim Anda!
              </p>
            </div>
            <button
              type="button"
              className="btn-refresh-dept-head is-logout"
              onClick={() => void handleLogout()}
            >
              <Icon name="arrowLeft" size={16} />
              <span>Kembali ke Login</span>
            </button>
          </div>

          {postSubmitNotice && (
            <div className="notice success-notice dept-head-notice" role="status">
              <Icon name="check" size={18} />
              <span>{postSubmitNotice}</span>
            </div>
          )}
        </section>

        <section className="panel dept-head-step-panel">
          <div className="dept-step-header is-locked-header">
            <div className="dept-step-header-left">
              <span className="step-pill">KARTU PILIHAN ANDA</span>
              <div className="dept-step-title-wrap">
                <h2 className="dept-step-heading">
                  Kartu Chief Detective Terpilih — {lockedView.group.title}
                </h2>
                <p className="section-caption is-confirmed-text">
                  Klik langsung pada kartu ({lockedView.selectedCards.length} kartu) untuk melihat
                  animasi putaran kartu dan me-reveal wujud asli karakter Chief Detective Anda.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-refresh-dept-head btn-reveal-all"
              onClick={handleToggleRevealAll}
            >
              <Icon name="sparkles" size={16} />
              <span>{allRevealed ? "Tutup Semua Kartu" : "Reveal Semua Kartu"}</span>
            </button>
          </div>

          <div className="locked-dept-head-grid">
            {lockedView.selectedCards.map((card) => {
              const isRevealed = revealedCardIds.includes(card.id);
              const revealImgSrc =
                card.revealImageUrl || `/images/karakter/karakter-${card.id}-reveal.jpg`;

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleToggleRevealCard(card.id)}
                  aria-pressed={isRevealed}
                  aria-label={`${
                    isRevealed ? "Balik kembali" : "Klik untuk reveal"
                  } kartu ${card.code} - ${card.title}`}
                  className={`tcg-reveal-card-scene ${isRevealed ? "is-revealed" : ""}`}
                >
                  <div className="tcg-reveal-card-inner">
                    {/* SISI DEPAN: KARTU SILUET MISTERI */}
                    <div className="tcg-reveal-card-face tcg-face-front silhouette-card is-owned">
                      <div className="tcg-card-topbar">
                        <h3 className="tcg-card-name">{card.title}</h3>
                        <span className="silhouette-status-pill is-owned">
                          <Icon name="sparkles" size={13} /> Klik untuk Reveal
                        </span>
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
                        alt={`${card.code} - ${card.title} (Siluet)`}
                        badgeLabel="CLASSIFIED · KLIK REVEAL"
                      />

                      <div className="tcg-meta-row">
                        <span className="tcg-edition">ENIGMA · 2027</span>
                        <span className="silhouette-code">{card.code}</span>
                      </div>

                      <div className="tcg-lore-box">
                        <span className="tcg-ability-tag">[ {card.roleHint} ]</span>
                        <p className="tcg-desc">{card.description}</p>
                        <div className="tcg-stats-row">
                          <span>PWR / {card.power ?? 2800}</span>
                          <span>DEF / {card.defense ?? 2600}</span>
                        </div>
                      </div>

                      <div className="tcg-click-reveal-cta">
                        <Icon name="sparkles" size={14} />
                        <span>Klik Kartu untuk Reveal Wujud Karakter</span>
                      </div>
                    </div>

                    {/* SISI BELAKANG: KARTU REVEAL KARAKTER ASLI */}
                    <div className="tcg-reveal-card-face tcg-face-back silhouette-card is-revealed-card">
                      <span className="tcg-holo-shimmer" aria-hidden="true" />
                      <div className="tcg-card-topbar is-revealed-topbar">
                        <h3 className="tcg-card-name">{card.title}</h3>
                        <span className="silhouette-status-pill is-revealed-pill">
                          <Icon name="check" size={13} /> Karakter Terungkap
                        </span>
                      </div>

                      <div className="tcg-stars-row is-revealed-stars" aria-label="Nama Chief Detective dan Bintang 5">
                        <span className="tcg-real-name">{card.realName}</span>
                        <span className="tcg-stars-cluster" aria-hidden="true">
                          <span>★</span>
                          <span>★</span>
                          <span>★</span>
                          <span>★</span>
                          <span>★</span>
                        </span>
                      </div>

                      <SilhouetteArt
                        variant={card.silhouetteVariant}
                        customImageUrl={revealImgSrc}
                        alt={`${card.code} - ${card.title} (Revealed)`}
                        revealed
                        badgeLabel="CHIEF DETECTIVE REVEALED"
                      />

                      <div className="tcg-meta-row">
                        <span className="tcg-edition is-revealed-edition">
                          ENIGMA · 2027 · REVEALED
                        </span>
                        <span className="silhouette-code">{card.code}</span>
                      </div>

                      <div className="tcg-lore-box is-revealed-lore">
                        <span className="tcg-ability-tag">[ {card.roleHint} ]</span>
                        <p className="tcg-desc">{card.description}</p>
                        <div className="tcg-stats-row">
                          <span>PWR / {card.power ?? 2800}</span>
                          <span>DEF / {card.defense ?? 2600}</span>
                        </div>
                      </div>

                      <div className="tcg-click-reveal-cta is-revealed-cta">
                        <Icon name="refresh" size={13} />
                        <span>Identitas Terungkap · Klik untuk Balik Kartu</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  // TAMPILAN LOGIN EMAIL & PASSWORD KELOMPOK
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
            Chief Detective. Setelah submit berhasil, halaman ini akan menampilkan kartu karakter yang
            telah tim Anda pilih.
          </p>

          {postSubmitNotice && (
            <div className="notice success-notice dept-head-notice" role="status">
              <Icon name="check" size={18} />
              <span>{postSubmitNotice}</span>
            </div>
          )}

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

  return (
    <div className="page-shell dept-head-shell">
      <section className="panel dept-head-hero">
        <div className="dept-head-hero-head">
          <div>
            <span className="eyebrow">
              <Icon name="shield" size={14} /> AKUN AKTIF · {snapshot.group.title.toUpperCase()}
            </span>
            <h1 className="dept-head-title">Pemilihan Karakter Chief Detective</h1>
            <p className="dept-head-subtitle">
              Amati 7 kartu karakter beserta kemampuan dan statistiknya, lalu tentukan pilihan untuk
              tim Anda. Setelah submit berhasil, pilihan Anda tersimpan dan halaman hanya menampilkan
              kartu pilihan tim Anda.
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
          <div className={`dept-metric-pill ${snapshot.requiredCount === 1 ? "is-final-slot" : ""}`}>
            <span className="metric-label">Kuota Pemilihan Tim Anda</span>
            <strong className="metric-value">
              {isAllSubmitted ? "Semua Kelompok Selesai" : `Pilih ${snapshot.requiredCount} Karakter`}
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
            <p className="section-caption">
              Silakan pilih tepat <strong>{snapshot.requiredCount} karakter</strong> yang mewakili
              kebutuhan tim Anda.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="notice error-notice dept-head-notice" role="alert">
            <Icon name="close" size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="silhouette-grid">
          {snapshot.cards.map((card) => {
            const isTakenByOther = takenByOtherSet.has(card.id);
            const isDraftSelected = selectedCardIds.includes(card.id);
            const isDisabled = isTakenByOther || isAllSubmitted || submitting;

            return (
              <button
                key={card.id}
                type="button"
                disabled={isDisabled}
                onClick={() => handleToggleCard(card.id)}
                className={`silhouette-card ${isDraftSelected ? "is-selected" : ""} ${
                  isTakenByOther ? "is-taken" : ""
                }`}
              >
                <div className="tcg-card-topbar">
                  <h3 className="tcg-card-name">{card.title}</h3>
                  {isTakenByOther ? (
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
                    <span>PWR / {card.power ?? 2800}</span>
                    <span>DEF / {card.defense ?? 2600}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {!isAllSubmitted && (
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
