"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { SilhouetteArt } from "@/components/silhouette-art";
import { officialGroups } from "@/config/event";
import type { DeptHeadCard, DeptHeadStateSnapshot } from "@/domain/dept-head";

const REVEAL_GROUP_ORDER = [3, 2, 4, 1] as const;

const GROUP_STAMP_THEMES: Record<
  number,
  { shortName: string; teamLabel: string; accentClass: string; colorLabel: string }
> = {
  3: {
    shortName: "CONAN",
    teamLabel: "Team Conan",
    accentClass: "is-group-3",
    colorLabel: "Kelompok 3",
  },
  2: {
    shortName: "JUBUN",
    teamLabel: "Team Detective Jubun",
    accentClass: "is-group-2",
    colorLabel: "Kelompok 2",
  },
  4: {
    shortName: "HOLMES",
    teamLabel: "Team Holmes",
    accentClass: "is-group-4",
    colorLabel: "Kelompok 4",
  },
  1: {
    shortName: "LUPIN",
    teamLabel: "Team Lupin",
    accentClass: "is-group-1",
    colorLabel: "Kelompok 1",
  },
};

const ORDERED_REVEAL_GROUPS = REVEAL_GROUP_ORDER.map((num) => {
  const found = officialGroups.find((g) => g.number === num) ?? officialGroups[0];
  const theme = GROUP_STAMP_THEMES[num];
  return {
    number: found.number,
    name: found.name,
    title: theme?.teamLabel ?? found.title,
  };
});

function getAdminHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("admin_enigma_token") || "P@ssw0rd#adminEnigma2026"
      : "P@ssw0rd#adminEnigma2026";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function playStampThudSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(42, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.32, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch {
    // ignore
  }
}

function playRevealFanfareSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const freqs = [392.0, 493.88, 587.33, 783.99];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const start = ctx.currentTime + idx * 0.05;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.09, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.95);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.98);
    });
  } catch {
    // ignore
  }
}

export function AdminRevealStage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [snapshot, setSnapshot] = useState<DeptHeadStateSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [activeGroupNumber, setActiveGroupNumber] = useState<number | null>(REVEAL_GROUP_ORDER[0]);
  const [draftCardIds, setDraftCardIds] = useState<number[]>([]);
  const [freshStampedIds, setFreshStampedIds] = useState<number[]>([]);

  // Simultaneous 7-card reveal + zoom state
  const [isRevealed, setIsRevealed] = useState(false);
  const [isZoomAnimating, setIsZoomAnimating] = useState(false);
  const zoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stampTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectionByGroup = useMemo(() => {
    const map = new Map<number, DeptHeadStateSnapshot["selections"][number]>();
    for (const s of snapshot?.selections ?? []) {
      map.set(s.groupNumber, s);
    }
    return map;
  }, [snapshot]);

  const firstUnassignedGroup = useMemo(() => {
    for (const g of ORDERED_REVEAL_GROUPS) {
      if (!selectionByGroup.has(g.number)) {
        return g.number;
      }
    }
    return null;
  }, [selectionByGroup]);

  const effectiveActiveGroup = useMemo(() => {
    if (activeGroupNumber !== null && !selectionByGroup.has(activeGroupNumber)) {
      return activeGroupNumber;
    }
    return firstUnassignedGroup;
  }, [activeGroupNumber, selectionByGroup, firstUnassignedGroup]);

  const stampedCount = Object.keys(snapshot?.takenCardIds ?? {}).length;
  const totalCards = snapshot?.cards.length ?? 7;
  const allCardsStamped = totalCards > 0 && stampedCount >= totalCards;
  const requiredForActiveGroup = snapshot?.nextRequiredCount ?? 2;

  const fetchSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dept-head", {
        headers: getAdminHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as DeptHeadStateSnapshot;
        setSnapshot(data);
        setIsAuthenticated(true);
      }
    } catch {
      // keep existing state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSnapshot();
    return () => {
      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
      if (stampTimerRef.current) clearTimeout(stampTimerRef.current);
    };
  }, [fetchSnapshot]);

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: passwordInput.trim() }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok) {
        setLoginError(data.error || "Password admin tidak sesuai.");
        return;
      }
      if (typeof window !== "undefined" && data.token) {
        sessionStorage.setItem("admin_enigma_token", data.token);
      }
      setPasswordInput("");
      await fetchSnapshot();
    } catch {
      setLoginError("Gagal menghubungi server untuk autentikasi admin.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function commitGroupStamp(groupNumber: number, cardIds: number[]) {
    setBusy(true);
    setStatusError(null);
    try {
      const res = await fetch("/api/admin/dept-head", {
        method: "POST",
        headers: getAdminHeaders(),
        credentials: "include",
        body: JSON.stringify({
          action: "assign",
          groupNumber,
          cardIds,
        }),
      });
      const payload = (await res.json()) as {
        error?: string;
        snapshot?: DeptHeadStateSnapshot;
      };
      if (!res.ok) {
        setStatusError(payload.error || "Gagal memberikan cap kelompok pada kartu.");
        setDraftCardIds([]);
        return;
      }

      if (payload.snapshot) {
        setSnapshot(payload.snapshot);
      }
      setDraftCardIds([]);
      setFreshStampedIds(cardIds);
      playStampThudSound();

      if (stampTimerRef.current) clearTimeout(stampTimerRef.current);
      stampTimerRef.current = setTimeout(() => {
        setFreshStampedIds([]);
      }, 1100);
    } catch {
      setStatusError("Terjadi kesalahan jaringan saat menyimpan cap kelompok.");
    } finally {
      setBusy(false);
    }
  }

  function handleCardClick(card: DeptHeadCard) {
    if (!snapshot || busy || isRevealed) return;
    if (snapshot.takenCardIds[card.id]) return;
    if (effectiveActiveGroup === null) return;

    setStatusError(null);

    if (draftCardIds.includes(card.id)) {
      setDraftCardIds((prev) => prev.filter((id) => id !== card.id));
      return;
    }

    const nextSelection = [...draftCardIds, card.id];
    if (nextSelection.length >= requiredForActiveGroup) {
      setDraftCardIds(nextSelection);
      void commitGroupStamp(effectiveActiveGroup, nextSelection);
    } else {
      setDraftCardIds(nextSelection);
    }
  }

  async function handleResetGroup(groupNumber: number) {
    if (busy) return;
    setBusy(true);
    setStatusError(null);
    setIsRevealed(false);
    setIsZoomAnimating(false);

    try {
      const res = await fetch("/api/admin/dept-head", {
        method: "DELETE",
        headers: getAdminHeaders(),
        credentials: "include",
        body: JSON.stringify({ groupNumber }),
      });
      const payload = (await res.json()) as {
        error?: string;
        snapshot?: DeptHeadStateSnapshot;
      };
      if (!res.ok) {
        setStatusError(payload.error || "Gagal menghapus cap kelompok.");
        return;
      }
      if (payload.snapshot) {
        setSnapshot(payload.snapshot);
      }
      setDraftCardIds([]);
      setActiveGroupNumber(groupNumber);
    } catch {
      setStatusError("Terjadi kesalahan jaringan saat mereset cap kelompok.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetAll() {
    if (busy) return;
    if (!confirm("Hapus seluruh cap kelompok pada 7 kartu dan mulai pemilihan ulang?")) {
      return;
    }
    setBusy(true);
    setStatusError(null);
    setIsRevealed(false);
    setIsZoomAnimating(false);

    try {
      const res = await fetch("/api/admin/dept-head", {
        method: "DELETE",
        headers: getAdminHeaders(),
        credentials: "include",
        body: JSON.stringify({ all: true }),
      });
      const payload = (await res.json()) as {
        error?: string;
        snapshot?: DeptHeadStateSnapshot;
      };
      if (!res.ok) {
        setStatusError(payload.error || "Gagal mereset semua cap.");
        return;
      }
      if (payload.snapshot) {
        setSnapshot(payload.snapshot);
      }
      setDraftCardIds([]);
      setFreshStampedIds([]);
      setActiveGroupNumber(REVEAL_GROUP_ORDER[0]);
    } catch {
      setStatusError("Terjadi kesalahan jaringan saat mereset cap.");
    } finally {
      setBusy(false);
    }
  }

  function handleTriggerRevealAll() {
    if (!allCardsStamped) return;
    if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);

    if (isRevealed) {
      // Putar ulang animasi zoom + flip serentak
      setIsRevealed(false);
      setIsZoomAnimating(false);
      setTimeout(() => {
        setIsZoomAnimating(true);
        setIsRevealed(true);
        playRevealFanfareSound();
        zoomTimerRef.current = setTimeout(() => {
          setIsZoomAnimating(false);
        }, 1250);
      }, 120);
      return;
    }

    setIsZoomAnimating(true);
    setIsRevealed(true);
    playRevealFanfareSound();
    zoomTimerRef.current = setTimeout(() => {
      setIsZoomAnimating(false);
    }, 1250);
  }

  function handleCloseReveal() {
    if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    setIsRevealed(false);
    setIsZoomAnimating(false);
  }

  if (isAuthenticated === null) {
    return (
      <div className="reveal-stage-auth-shell">
        <div className="panel dept-login-card" style={{ textAlign: "center" }}>
          <p className="dept-login-desc">Memeriksa sesi Admin Stage Reveal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="reveal-stage-auth-shell">
        <div className="panel dept-login-card">
          <div className="admin-brand-header">
            <span className="brand-mark">
              <Icon name="shield" size={24} />
            </span>
            <div>
              <span className="eyebrow">KHUSUS ADMIN · STAGE REVEAL</span>
              <h1>Login Reveal Chief Detective</h1>
            </div>
          </div>
          <p className="dept-login-desc">
            Masukkan password Admin untuk membuka halaman pemilihan cap kelompok dan{" "}
            <strong>Reveal 7 Kartu Chief Detective</strong>.
          </p>
          <form onSubmit={handleAdminLogin} className="admin-form">
            <div className="form-field-group">
              <label htmlFor="reveal-admin-password" className="field-label">
                Password Admin
              </label>
              <input
                id="reveal-admin-password"
                type="password"
                className="quiz-input"
                placeholder="Masukkan password admin..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                autoFocus
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
              disabled={loggingIn || !passwordInput.trim()}
            >
              <span>{loggingIn ? "Memeriksa..." : "Buka Stage Reveal Admin"}</span>
              <Icon name="arrow" size={18} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  const cards = snapshot?.cards ?? [];
  const topRowCards = cards.slice(0, 4);
  const bottomRowCards = cards.slice(4, 7);

  const activeGroupMeta =
    effectiveActiveGroup !== null
      ? ORDERED_REVEAL_GROUPS.find((g) => g.number === effectiveActiveGroup) ?? null
      : null;

  const renderStageCard = (card: DeptHeadCard) => {
    const owner = snapshot?.takenCardIds[card.id] ?? null;
    const isDraft = draftCardIds.includes(card.id);
    const isFreshStamp = freshStampedIds.includes(card.id);
    const ownerTheme = owner ? GROUP_STAMP_THEMES[owner.groupNumber] : null;
    const activeTheme =
      effectiveActiveGroup !== null ? GROUP_STAMP_THEMES[effectiveActiveGroup] : null;
    const revealImgSrc = card.revealImageUrl || `/images/karakter/karakter-${card.id}-reveal.jpg`;

    const isClickable = !isRevealed && !owner && !busy && effectiveActiveGroup !== null;

    return (
      <div
        key={card.id}
        role="button"
        tabIndex={isClickable ? 0 : -1}
        aria-disabled={!isClickable}
        onClick={() => isClickable && handleCardClick(card)}
        onKeyDown={(e) => {
          if (isClickable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleCardClick(card);
          }
        }}
        className={`stage-card-scene ${isRevealed ? "is-revealed" : ""} ${
          isZoomAnimating ? "is-zoom-flipping" : ""
        } ${isDraft ? `is-draft-picked ${activeTheme?.accentClass ?? ""}` : ""} ${
          owner ? `is-stamped ${ownerTheme?.accentClass ?? ""}` : ""
        } ${isClickable ? "is-clickable" : ""}`}
      >
        <div className="stage-card-inner">
          {/* FRONT FACE: SILHOUETTE + CIRCULAR GROUP STAMP */}
          <div className="stage-card-face stage-face-front silhouette-card">
            <div className="tcg-card-topbar stage-topbar">
              <h3 className="tcg-card-name stage-card-title">{card.title}</h3>
              {owner && ownerTheme ? (
                <span className={`stage-group-pill ${ownerTheme.accentClass}`}>
                  {ownerTheme.shortName}
                </span>
              ) : isDraft && activeTheme ? (
                <span className={`stage-group-pill is-draft-pill ${activeTheme.accentClass}`}>
                  Dipilih ({draftCardIds.length}/{requiredForActiveGroup})
                </span>
              ) : (
                <span className="silhouette-status-pill is-available stage-mini-pill">
                  {card.code}
                </span>
              )}
            </div>

            <div className="tcg-stars-row stage-stars-row" aria-label="Bintang 5">
              <span>★</span>
              <span>★</span>
              <span>★</span>
              <span>★</span>
              <span>★</span>
            </div>

            <div className="stage-art-wrapper">
              <SilhouetteArt
                variant={card.silhouetteVariant}
                customImageUrl={card.customImageUrl}
                alt={`${card.code} - ${card.title}`}
                badgeLabel={owner ? undefined : "CLASSIFIED"}
              />

              {/* CIRCULAR STAMP OVERLAY */}
              {owner && ownerTheme && (
                <div
                  className={`circular-group-stamp ${ownerTheme.accentClass} ${
                    isFreshStamp ? "is-slamming" : ""
                  }`}
                  aria-label={`Cap ${owner.groupName}`}
                >
                  {isFreshStamp && <span className="stamp-shockwave-ring" aria-hidden="true" />}
                  <div className="circular-stamp-outer">
                    <div className="circular-stamp-inner">
                      <span className="stamp-top-txt">CHIEF DETECTIVE</span>
                      <strong className="stamp-main-group">{ownerTheme.shortName}</strong>
                      <span className="stamp-sub-group">KEL. {owner.groupNumber}</span>
                      <span className="stamp-bottom-txt">★ DISAHKAN ★</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="tcg-meta-row stage-meta-row">
              <span className="tcg-edition">ENIGMA · 2027</span>
              <span className="silhouette-code">{card.code}</span>
            </div>

            <div className="tcg-lore-box stage-lore-box">
              <span className="tcg-ability-tag">[ {card.roleHint} ]</span>
              <p className="tcg-desc stage-desc">{card.description}</p>
              <div className="tcg-stats-row stage-stats-row">
                <span>PWR / {card.power ?? 2800}</span>
                <span>DEF / {card.defense ?? 2600}</span>
              </div>
            </div>
          </div>

          {/* BACK FACE: REVEALED CHIEF DETECTIVE CARD */}
          <div className="stage-card-face stage-face-back silhouette-card is-revealed-card">
            <span className="tcg-holo-shimmer" aria-hidden="true" />
            <div className="tcg-card-topbar is-revealed-topbar stage-topbar">
              <h3 className="tcg-card-name stage-card-title">{card.title}</h3>
              {owner && ownerTheme && (
                <span className={`stage-group-pill is-revealed-owner ${ownerTheme.accentClass}`}>
                  KEL. {owner.groupNumber} · {ownerTheme.shortName}
                </span>
              )}
            </div>

            <div className="tcg-stars-row is-revealed-stars stage-stars-row">
              <span className="tcg-real-name stage-real-name">{card.realName}</span>
              <span className="tcg-stars-cluster" aria-hidden="true">
                <span>★</span>
                <span>★</span>
                <span>★</span>
                <span>★</span>
                <span>★</span>
              </span>
            </div>

            <div className="stage-art-wrapper">
              <SilhouetteArt
                variant={card.silhouetteVariant}
                customImageUrl={revealImgSrc}
                alt={`${card.code} - ${card.realName}`}
                revealed
              />
              {owner && ownerTheme && (
                <div
                  className={`circular-group-stamp is-mini-corner ${ownerTheme.accentClass}`}
                  aria-hidden="true"
                >
                  <div className="circular-stamp-outer">
                    <div className="circular-stamp-inner">
                      <span className="stamp-top-txt">KEL. {owner.groupNumber}</span>
                      <strong className="stamp-main-group">{ownerTheme.shortName}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="tcg-meta-row stage-meta-row">
              <span className="tcg-edition is-revealed-edition">REVEALED · ENIGMA</span>
              <span className="silhouette-code">{card.code}</span>
            </div>

            <div className="tcg-lore-box is-revealed-lore stage-lore-box">
              <span className="tcg-ability-tag">[ {card.roleHint} ]</span>
              <p className="tcg-desc stage-desc">{card.description}</p>
              <div className="tcg-stats-row stage-stats-row">
                <span>PWR / {card.power ?? 2800}</span>
                <span>DEF / {card.defense ?? 2600}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`reveal-stage-viewport ${isRevealed ? "is-all-revealed" : ""} ${
        isZoomAnimating ? "is-stage-zoom-burst" : ""
      }`}
    >
      {/* COMPACT TOP CONTROL BAR */}
      <header className="reveal-stage-topbar">
        <div className="reveal-topbar-left">
          <Link href="/admin-enigma" className="btn-stage-back">
            <Icon name="arrowLeft" size={15} />
            <span>Panel Admin</span>
          </Link>
          <div className="reveal-stage-brand">
            <span className="eyebrow">ADMIN REVEAL STAGE · 7 KARTU</span>
            <h1>
              {isRevealed
                ? "CHIEF DETECTIVE RESMI TERUNGKAP"
                : allCardsStamped
                ? "Semua 7 Kartu Tercap — Siap Reveal!"
                : activeGroupMeta
                ? `Pilih ${requiredForActiveGroup} Kartu untuk ${activeGroupMeta.title}`
                : "Pemilihan Cap Chief Detective"}
            </h1>
          </div>
        </div>

        {/* 4 GROUP STAMP SELECTOR PILLS */}
        <div className="reveal-group-pills" role="group" aria-label="Urutan reveal kelompok pemberi cap">
          {ORDERED_REVEAL_GROUPS.map((group, index) => {
            const record = selectionByGroup.get(group.number);
            const theme = GROUP_STAMP_THEMES[group.number] ?? {
              shortName: group.name.toUpperCase(),
              teamLabel: group.title,
              accentClass: "is-group-1",
              colorLabel: `Kelompok ${group.number}`,
            };
            const isActive = !record && effectiveActiveGroup === group.number && !isRevealed;

            return (
              <div
                key={group.number}
                className={`reveal-group-chip ${theme.accentClass} ${
                  isActive ? "is-active-group" : ""
                } ${record ? "is-done-group" : ""}`}
              >
                <button
                  type="button"
                  className="reveal-group-chip-btn"
                  disabled={Boolean(record) || isRevealed || busy}
                  onClick={() => {
                    setActiveGroupNumber(group.number);
                    setDraftCardIds([]);
                  }}
                >
                  <span className="chip-dot" />
                  <span className="chip-name">
                    {index + 1}. {theme.teamLabel}
                  </span>
                  <span className="chip-count">
                    {record
                      ? `✓ ${record.cardIds.length} Cap`
                      : isActive
                      ? `${draftCardIds.length}/${requiredForActiveGroup}`
                      : "Menunggu"}
                  </span>
                </button>
                {record && !isRevealed && (
                  <button
                    type="button"
                    className="chip-undo-btn"
                    onClick={() => void handleResetGroup(group.number)}
                    title={`Reset cap ${group.title}`}
                    aria-label={`Reset cap ${group.title}`}
                  >
                    <Icon name="close" size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* ACTION BUTTONS: RESET & BIG REVEAL */}
        <div className="reveal-topbar-actions">
          {!isRevealed ? (
            <>
              <button
                type="button"
                className="btn-stage-secondary"
                onClick={() => void handleResetAll()}
                disabled={busy || stampedCount === 0}
                title="Reset seluruh cap kelompok"
              >
                <Icon name="refresh" size={14} />
                <span>Reset Cap</span>
              </button>

              <button
                type="button"
                className={`btn-stage-reveal-master ${allCardsStamped ? "is-ready-to-reveal" : ""}`}
                onClick={handleTriggerRevealAll}
                disabled={!allCardsStamped || busy}
              >
                <Icon name="sparkles" size={16} />
                <span>
                  {allCardsStamped
                    ? "REVEAL 7 KARTU"
                    : `CAP (${stampedCount}/${totalCards})`}
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-stage-secondary"
                onClick={handleCloseReveal}
              >
                <Icon name="lock" size={14} />
                <span>Tutup Kembali</span>
              </button>
              <button
                type="button"
                className="btn-stage-reveal-master is-ready-to-reveal"
                onClick={handleTriggerRevealAll}
              >
                <Icon name="sparkles" size={16} />
                <span>Putar Ulang Reveal</span>
              </button>
            </>
          )}
        </div>
      </header>

      {statusError && (
        <div className="stage-floating-error" role="alert">
          <Icon name="close" size={15} />
          <span>{statusError}</span>
        </div>
      )}

      {/* SINGLE-SCREEN 7-CARD ARENA (4 TOP + 3 BOTTOM CENTERED) */}
      <main
        className={`reveal-stage-arena ${isZoomAnimating ? "is-arena-zooming" : ""}`}
        aria-live="polite"
      >
        {loading && cards.length === 0 ? (
          <div className="stage-loading-state">Memuat 7 kartu Chief Detective...</div>
        ) : (
          <div className="reveal-cards-seven-layout">
            <div className="reveal-cards-row is-row-top">
              {topRowCards.map(renderStageCard)}
            </div>
            <div className="reveal-cards-row is-row-bottom">
              {bottomRowCards.map(renderStageCard)}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
