"use client";

import { AdminDeptHeadPanel, type AdminDeptHeadSnapshot } from "@/components/admin-dept-head-panel";
import { AdminStagePanel } from "@/components/admin-stage-panel";
import type { StageEssayStateSnapshot } from "@/domain/stage-essay";

import { useEffect, useState } from "react";
import { officialGroups } from "@/config/event";
import {
  getQuizChannelLabel,
  QUIZ_CHANNELS,
  type QuizChannelId,
  type QuizSubmissionRecord,
} from "@/domain/quiz";
import {
  generateQuizScoresExcel,
  generateAttendanceExcel,
  generateBarcodesPngZip,
} from "@/domain/excel-export";
import {
  ATTENDANCE_ROSTER,
  getMemberRoomSummary,
  type AttendanceMember,
  type RoomMovementLog,
} from "@/domain/attendance";
import { generateQrBadgePngBlob, generateQrSvg } from "@/domain/qrcode-svg";
import { Icon } from "@/components/icon";

const ATTENDANCE_STORAGE_KEY = "sai_bumi_enigma_attendance_records";

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

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Active Admin Tab: "quiz" | "attendance" | "catalog" | "dept-head" | "stage"
  const [activeAdminTab, setActiveAdminTab] = useState<"quiz" | "attendance" | "catalog" | "dept-head" | "stage">("quiz");
  const [deptHeadSnapshot, setDeptHeadSnapshot] = useState<AdminDeptHeadSnapshot | null>(null);
  const [loadingDeptHead, setLoadingDeptHead] = useState(false);

  const [stageSnapshot, setStageSnapshot] = useState<StageEssayStateSnapshot | null>(null);
  const [loadingStage, setLoadingStage] = useState(false);

  async function fetchStageSnapshot() {
    setLoadingStage(true);
    try {
      const res = await fetch("/api/admin/stage-essay", {
        headers: getAdminHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as StageEssayStateSnapshot;
        setStageSnapshot(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingStage(false);
    }
  }

  async function fetchDeptHead() {
    setLoadingDeptHead(true);
    try {
      const res = await fetch("/api/admin/dept-head", {
        headers: getAdminHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as AdminDeptHeadSnapshot;
        setDeptHeadSnapshot(data);
      }
    } catch {
      // ignore transient network errors
    } finally {
      setLoadingDeptHead(false);
    }
  }

  // Quiz Submissions State
  const [submissions, setSubmissions] = useState<QuizSubmissionRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState(false);

  // Master quiz status control per channel (Pretest + Quiz 1..4)
  const [selectedQuizChannel, setSelectedQuizChannel] = useState<QuizChannelId>("pretest");
  const [quizChannelStatuses, setQuizChannelStatuses] = useState<Record<QuizChannelId, boolean>>({
    pretest: false,
    "quiz-1": false,
    "quiz-2": false,
    "quiz-3": false,
    "quiz-4": false,
  });
  const [togglingQuiz, setTogglingQuiz] = useState(false);
  const isQuizOpen = Boolean(quizChannelStatuses[selectedQuizChannel]);

  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
  const [attendanceMovements, setAttendanceMovements] = useState<RoomMovementLog[]>([]);
  const [attendanceNotice, setAttendanceNotice] = useState<string | null>(null);
  const [attendanceSearch, setAttendanceSearch] = useState("");

  // Catalog State
  const [catalogGroup, setCatalogGroup] = useState<string>("ALL");
  const [catalogSearch, setCatalogSearch] = useState("");

  // Check login status on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/admin/results", {
          headers: getAdminHeaders(),
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setSubmissions(data.submissions || []);
          if (data.quizStatus) {
            setQuizChannelStatuses({
              pretest: Boolean(data.quizStatus.channels?.pretest ?? data.quizStatus.isOpen),
              "quiz-1": Boolean(data.quizStatus.channels?.["quiz-1"]),
              "quiz-2": Boolean(data.quizStatus.channels?.["quiz-2"]),
              "quiz-3": Boolean(data.quizStatus.channels?.["quiz-3"]),
              "quiz-4": Boolean(data.quizStatus.channels?.["quiz-4"]),
            });
          }
          setIsAuthenticated(true);
          void fetchAttendance();
          void fetchDeptHead();
          void fetchStageSnapshot();
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    }
    void checkAuth();
  }, []);

  // Fetch submissions data
  async function refreshData() {
    setLoadingData(true);
    try {
      const res = await fetch("/api/admin/results", {
        headers: getAdminHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
        if (data.quizStatus) {
          setQuizChannelStatuses({
            pretest: Boolean(data.quizStatus.channels?.pretest ?? data.quizStatus.isOpen),
            "quiz-1": Boolean(data.quizStatus.channels?.["quiz-1"]),
            "quiz-2": Boolean(data.quizStatus.channels?.["quiz-2"]),
            "quiz-3": Boolean(data.quizStatus.channels?.["quiz-3"]),
            "quiz-4": Boolean(data.quizStatus.channels?.["quiz-4"]),
          });
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingData(false);
    }
  }

  // Fetch Attendance Records
  async function fetchAttendance() {
    try {
      const res = await fetch("/api/admin/attendance", {
        headers: getAdminHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.records) {
          setAttendanceRecords(data.records);
        }
        if (Array.isArray(data.movements)) {
          setAttendanceMovements(data.movements as RoomMovementLog[]);
        }
      }
    } catch {
      // fallback
    }
  }

  // Toggle quiz status for selected channel (Pretest / Quiz 1..4)
  async function handleToggleQuizStatus() {
    const nextStatus = !isQuizOpen;
    setTogglingQuiz(true);
    try {
      const res = await fetch("/api/admin/quiz-status", {
        method: "POST",
        headers: getAdminHeaders(),
        credentials: "include",
        body: JSON.stringify({ isOpen: nextStatus, channel: selectedQuizChannel }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status?.channels) {
          setQuizChannelStatuses({
            pretest: Boolean(data.status.channels.pretest),
            "quiz-1": Boolean(data.status.channels["quiz-1"]),
            "quiz-2": Boolean(data.status.channels["quiz-2"]),
            "quiz-3": Boolean(data.status.channels["quiz-3"]),
            "quiz-4": Boolean(data.status.channels["quiz-4"]),
          });
        } else {
          setQuizChannelStatuses((prev) => ({ ...prev, [selectedQuizChannel]: nextStatus }));
        }
      } else {
        alert("Gagal memperbarui status kuis. Silakan coba lagi.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setTogglingQuiz(false);
    }
  }

  // Delete quiz submission of a specific participant
  async function handleDeleteSingleSubmission(id: string, name: string) {
    if (!confirm(`Hapus data hasil kuis untuk ${name}? Peserta ini dapat mengikuti kuis kembali.`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/results", {
        method: "DELETE",
        headers: getAdminHeaders(),
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert("Gagal menghapus data kuis.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    }
  }

  // Reset quiz submissions for selected channel
  async function handleResetAllQuizSubmissions() {
    const chLabel = getQuizChannelLabel(selectedQuizChannel);
    if (
      !confirm(
        `PERINGATAN: Apakah Anda yakin ingin mengosongkan SELURUH data hasil ${chLabel}? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/admin/results", {
        method: "DELETE",
        headers: getAdminHeaders(),
        credentials: "include",
        body: JSON.stringify({ all: true, quizKey: selectedQuizChannel }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
      } else {
        alert("Gagal mengosongkan data kuis.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    }
  }

  // Delete attendance of a specific participant
  async function handleDeleteSingleAttendance(nik: string, name: string) {
    if (!confirm(`Hapus status kehadiran untuk ${name} (${nik})? Peserta ini dapat di-scan absensi ulang.`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/attendance", {
        method: "DELETE",
        headers: getAdminHeaders(),
        credentials: "include",
        body: JSON.stringify({ nik }),
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceRecords(data.records || {});
        if (Array.isArray(data.movements)) {
          setAttendanceMovements(data.movements as RoomMovementLog[]);
        }
        setAttendanceNotice(
          `Kehadiran ${name} (${nik}) berhasil dihapus. Peserta kini dapat di-scan absensi ulang.`
        );
        setTimeout(() => setAttendanceNotice(null), 7000);
      } else {
        alert("Gagal menghapus status absensi.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan saat menghapus absensi.");
    }
  }

  // Reset ALL attendance records
  async function handleResetAllAttendance() {
    if (
      !confirm(
        "PERINGATAN: Apakah Anda yakin ingin mengosongkan / menghapus SELURUH data kehadiran 35 peserta? Semua peserta dapat di-scan absensi ulang."
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/admin/attendance", {
        method: "DELETE",
        headers: getAdminHeaders(),
        credentials: "include",
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setAttendanceRecords({});
        setAttendanceMovements([]);
        localStorage.removeItem(ATTENDANCE_STORAGE_KEY);
        setAttendanceNotice(
          "Seluruh data absensi peserta berhasil dikosongkan. Semua peserta kini dapat di-scan absensi ulang."
        );
        setTimeout(() => setAttendanceNotice(null), 7000);
      } else {
        alert("Gagal mengosongkan data absensi.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan saat mengosongkan data absensi.");
    }
  }

  // Handle Login
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: passwordInput.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        if (typeof window !== "undefined" && data.token) {
          sessionStorage.setItem("admin_enigma_token", data.token);
        }
        setIsAuthenticated(true);
        void refreshData();
        void fetchAttendance();
        void fetchDeptHead();
      } else {
        const data = await res.json();
        setLoginError(data.error || "Password admin tidak sesuai.");
      }
    } catch {
      setLoginError("Gagal menghubungi server untuk autentikasi.");
    } finally {
      setLoggingIn(false);
    }
  }

  // Handle Logout
  function handleLogout() {
    document.cookie = "admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("admin_enigma_token");
    }
    setIsAuthenticated(false);
    setPasswordInput("");
  }

  // Handle Excel Export (Quiz)
  function handleExportQuizExcel() {
    setExporting(true);
    try {
      const sorted = [...channelSubmissions].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
        if (a.timeSpentSeconds !== b.timeSpentSeconds) {
          return a.timeSpentSeconds - b.timeSpentSeconds;
        }
        return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
      });
      const bytes = generateQuizScoresExcel(sorted);
      const blob = new Blob([new Uint8Array(bytes)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rekap-nilai-${selectedQuizChannel}-enigma-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Gagal mengekspor file Excel: " + (e instanceof Error ? e.message : "Error"));
    } finally {
      setExporting(false);
    }
  }

  // Handle Attendance Excel Export
  function handleExportAttendanceExcel() {
    try {
      const bytes = generateAttendanceExcel(
        ATTENDANCE_ROSTER,
        attendanceRecords,
        attendanceMovements
      );
      const blob = new Blob([bytes as unknown as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rekap-absensi-enigma-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Gagal mengekspor file Excel absensi: " + (e instanceof Error ? e.message : "Error"));
    }
  }

  // Download All QR Badges PNG ZIP archive (Semua 35 Lencana QR Peserta)
  const [downloadingZip, setDownloadingZip] = useState(false);

  const handleDownloadAllBarcodesZip = async () => {
    setDownloadingZip(true);
    try {
      const bytes = await generateBarcodesPngZip(ATTENDANCE_ROSTER);
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Semua-Lencana-QR-Peserta-Enigma-PNG.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Gagal mengunduh file ZIP lencana PNG: " + (e instanceof Error ? e.message : "Error"));
    } finally {
      setDownloadingZip(false);
    }
  };

  // Download QR Code Detective Badge PNG (Nama file: [Nama] - [NIK].png)
  const handleDownloadQr = async (member: AttendanceMember) => {
    try {
      const pngBlob = await generateQrBadgePngBlob(member.nik, 2, member);
      const url = URL.createObjectURL(pngBlob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = member.nama.replace(/[/\\?%*:|"<>]/g, "").trim();
      const safeNik = member.nik.replace(/[/\\?%*:|"<>]/g, "").trim();
      a.download = `${safeName} - ${safeNik}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Gagal mengunduh file PNG lencana QR: " + (e instanceof Error ? e.message : "Error"));
    }
  };

  // Filter submissions by selected channel (Pretest / Quiz 1..4)
  const channelSubmissions = submissions.filter(
    (s) => (s.quizKey || "pretest") === selectedQuizChannel
  );

  // Sorted & filtered submissions: nilai terbesar + jumlah benar terbanyak + durasi tercepat paling atas
  const sortedSubmissions = [...channelSubmissions].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    if (a.timeSpentSeconds !== b.timeSpentSeconds) {
      return a.timeSpentSeconds - b.timeSpentSeconds;
    }
    return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
  });

  const overallRankById = new Map<string, number>();
  sortedSubmissions.forEach((item, idx) => {
    overallRankById.set(item.id, idx + 1);
  });

  const filteredSubmissions = sortedSubmissions.filter((s) => {
    const matchesGroup =
      selectedGroupFilter === "all" || s.groupNumber === selectedGroupFilter;
    const matchesQuery =
      searchQuery.trim() === "" ||
      `${s.participantName} ${s.groupName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesGroup && matchesQuery;
  });

  // Calculate quiz statistics for selected channel
  const totalSubmissions = channelSubmissions.length;
  const avgScore =
    totalSubmissions > 0
      ? (channelSubmissions.reduce((acc, s) => acc + s.score, 0) / totalSubmissions).toFixed(1)
      : "0";
  const highestScore =
    totalSubmissions > 0 ? Math.max(...channelSubmissions.map((s) => s.score)) : 0;
  const totalCorrectAll = channelSubmissions.reduce((acc, s) => acc + s.correctCount, 0);

  // Attendance stats
  const totalRoster = ATTENDANCE_ROSTER.length;
  const attendedCount = Object.keys(attendanceRecords).length;
  const attendancePercentage = Math.round((attendedCount / totalRoster) * 100);
  const outsideRoomCount = ATTENDANCE_ROSTER.filter(
    (m) =>
      getMemberRoomSummary(m.nik, attendanceRecords, attendanceMovements).roomState ===
      "outside_room"
  ).length;

  // Filtered attendance roster
  const filteredAttendance = ATTENDANCE_ROSTER.filter((m) => {
    if (!attendanceSearch.trim()) return true;
    const q = attendanceSearch.toLowerCase();
    return (
      m.nama.toLowerCase().includes(q) ||
      m.nik.toLowerCase().includes(q) ||
      m.dept.toLowerCase().includes(q) ||
      m.posisi.toLowerCase().includes(q) ||
      m.namaKelompok.toLowerCase().includes(q)
    );
  });

  // Filtered QR Catalog
  const filteredCatalog = ATTENDANCE_ROSTER.filter((m) => {
    if (catalogGroup !== "ALL") {
      if (catalogGroup === "1" && m.groupNumber !== 1) return false;
      if (catalogGroup === "2" && m.groupNumber !== 2) return false;
      if (catalogGroup === "3" && m.groupNumber !== 3) return false;
      if (catalogGroup === "4" && m.groupNumber !== 4) return false;
    }
    if (catalogSearch.trim()) {
      const q = catalogSearch.toLowerCase();
      return (
        m.nama.toLowerCase().includes(q) ||
        m.nik.toLowerCase().includes(q) ||
        m.dept.toLowerCase().includes(q) ||
        m.posisi.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // =========================================================================
  // VIEW: LOADING CHECK
  // =========================================================================
  if (isAuthenticated === null) {
    return (
      <div className="admin-loading-screen">
        <Icon name="compass" size={36} />
        <p>Memeriksa otentikasi admin...</p>
      </div>
    );
  }

  // =========================================================================
  // VIEW: ADMIN LOGIN FORM
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="admin-login-wrapper">
        <div className="admin-login-card panel">
          <div className="admin-brand-header">
            <span className="brand-mark">
              <Icon name="compass" size={24} />
            </span>
            <div>
              <span className="eyebrow">PORTAL PENGAWAS INTERNAL</span>
              <h2>Login Admin Enigma</h2>
            </div>
          </div>

          <p className="admin-login-desc">
            Halaman ini khusus untuk panitia pengawas The Sai Bumi Enigma untuk memonitor kuis dan
            mengelola absensi resmi peserta.
          </p>

          <form onSubmit={handleLogin} className="admin-form">
            <div className="form-field-group">
              <label htmlFor="admin-pass" className="field-label">
                Password Akses Pengawas
              </label>
              <input
                id="admin-pass"
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
              <span>{loggingIn ? "Memverifikasi..." : "Masuk Dashboard Admin"}</span>
              <Icon name="arrow" size={18} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: ADMIN DASHBOARD (QUIZ + ATTENDANCE + QR CATALOG)
  // =========================================================================
  return (
    <main className="admin-dashboard-shell">
      {/* HEADER */}
      <header className="admin-header">
        <div className="admin-header-title">
          <div className="admin-badge">
            <Icon name="shield" size={16} />
            <span>PANEL PENGAWAS RESMI THE SAI BUMI ENIGMA</span>
          </div>
          <h1>Dashboard Pengawas Acara</h1>
          <p>The Sai Bumi Enigma · Lampung 2026</p>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              void refreshData();
              void fetchAttendance();
            }}
            disabled={loadingData}
          >
            <Icon name="refresh" size={16} />
            <span>{loadingData ? "Memperbarui..." : "Refresh Data"}</span>
          </button>

          <button
            type="button"
            className="btn-logout"
            onClick={handleLogout}
            title="Keluar dari sesi admin"
          >
            <Icon name="close" size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* TOP NAVIGATION TABS FOR ADMIN */}
      <nav className="admin-nav-tabs" aria-label="Menu Pengawas">
        <button
          type="button"
          className={`admin-tab-btn ${activeAdminTab === "quiz" ? "is-active" : ""}`}
          onClick={() => setActiveAdminTab("quiz")}
        >
          <Icon name="compass" size={16} />
          <span>Monitoring Mission 1 – 5</span>
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeAdminTab === "attendance" ? "is-active" : ""}`}
          onClick={() => setActiveAdminTab("attendance")}
        >
          <Icon name="award" size={16} />
          <span>
            Rekap Kehadiran Agent ({attendedCount}/{totalRoster})
          </span>
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeAdminTab === "catalog" ? "is-active" : ""}`}
          onClick={() => setActiveAdminTab("catalog")}
        >
          <Icon name="people" size={16} />
          <span>Katalog QR Code Peserta ({totalRoster})</span>
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeAdminTab === "dept-head" ? "is-active" : ""}`}
          onClick={() => {
            setActiveAdminTab("dept-head");
            void fetchDeptHead();
          }}
        >
          <Icon name="shield" size={16} />
          <span>
            Pemilihan Chief Detective ({deptHeadSnapshot ? `${deptHeadSnapshot.totalGroupsSubmitted}/${deptHeadSnapshot.maxGroups}` : "0/4"})
          </span>
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeAdminTab === "stage" ? "is-active" : ""}`}
          onClick={() => {
            setActiveAdminTab("stage");
            void fetchStageSnapshot();
          }}
        >
          <Icon name="compass" size={16} />
          <span>Misi &amp; Spreadsheet (10 Sesi)</span>
        </button>
      </nav>

      {/* =====================================================================
          TAB 1: MONITORING KUIS INVESTIGASI
          ===================================================================== */}
      {activeAdminTab === "quiz" && (
        <section className="admin-quiz-section">
          {/* PEMILIH CHANNEL: MISSION 1 - 5 */}
          <div className="panel" style={{ padding: "16px 20px", marginBottom: "16px" }}>
            <span className="eyebrow" style={{ display: "block", marginBottom: "6px" }}>
              PILIH SESI MISSION (1 – 5)
            </span>
            <div className="quiz-channel-switcher" role="tablist" aria-label="Pilih Sesi Mission 1 sampai 5">
              {QUIZ_CHANNELS.map((ch) => {
                const openNow = Boolean(quizChannelStatuses[ch.id]);
                const chCount = submissions.filter((s) => (s.quizKey || "pretest") === ch.id).length;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    role="tab"
                    aria-selected={selectedQuizChannel === ch.id}
                    className={`quiz-channel-pill ${
                      selectedQuizChannel === ch.id ? "is-selected" : ""
                    } ${openNow ? "is-open" : "is-closed"}`}
                    onClick={() => setSelectedQuizChannel(ch.id)}
                  >
                    <span className={`channel-dot ${openNow ? "dot-open" : "dot-closed"}`} />
                    <strong>{ch.shortLabel}</strong>
                    <span className="channel-state">
                      {openNow ? "DIBUKA" : "TERKUNCI"} · {chCount} peserta
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FILTER KELOMPOK + EXPORT NILAI + KOSONGKAN HASIL KUIS (DI ATAS KONTROL SESI KUIS) */}
          <section className="admin-filter-bar panel" style={{ marginBottom: "18px" }}>
            <div className="filter-group">
              <span className="filter-label">Filter Kelompok:</span>
              <div className="filter-pills">
                <button
                  type="button"
                  className={`filter-pill ${selectedGroupFilter === "all" ? "is-active" : ""}`}
                  onClick={() => setSelectedGroupFilter("all")}
                >
                  Semua ({channelSubmissions.length})
                </button>
                {officialGroups.map((g) => {
                  const count = channelSubmissions.filter((s) => s.groupNumber === g.number).length;
                  return (
                    <button
                      key={g.number}
                      type="button"
                      className={`filter-pill ${
                        selectedGroupFilter === g.number ? "is-active" : ""
                      }`}
                      onClick={() => setSelectedGroupFilter(g.number)}
                    >
                      {g.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="quiz-admin-actions-bar">
              <div className="quiz-search-input-wrap">
                <input
                  type="text"
                  className="quiz-input"
                  placeholder="Cari nama peserta atau kelompok..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="quiz-action-buttons-group">
                <button
                  type="button"
                  className="btn-quiz-export"
                  onClick={handleExportQuizExcel}
                  disabled={exporting || channelSubmissions.length === 0}
                >
                  <Icon name="download" size={16} />
                  <span>{exporting ? "Menyiapkan..." : "Export Nilai (.xlsx)"}</span>
                </button>

                {channelSubmissions.length > 0 && (
                  <button
                    type="button"
                    className="btn-quiz-reset"
                    onClick={handleResetAllQuizSubmissions}
                    title={`Hapus seluruh data hasil ${getQuizChannelLabel(selectedQuizChannel)}`}
                  >
                    <Icon name="close" size={15} />
                    <span>Kosongkan Hasil {QUIZ_CHANNELS.find((c) => c.id === selectedQuizChannel)?.shortLabel}</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* MASTER QUIZ CONTROLLER (BUKA / TUTUP CHANNEL TERPILIH) */}
          <section
            className={`admin-quiz-controller-card panel ${isQuizOpen ? "is-open" : "is-closed"}`}
          >
            <div className="controller-status-info">
              <div className="controller-kicker">
                <span className={`live-pulse-dot ${isQuizOpen ? "dot-open" : "dot-closed"}`} />
                <strong className="status-title-text">
                  {getQuizChannelLabel(selectedQuizChannel).toUpperCase()}:{" "}
                  {isQuizOpen ? "SEDANG DIBUKA (AKTIF)" : "SEDANG DITUTUP (TERKUNCI)"}
                </strong>
              </div>
              <p className="controller-desc">
                {isQuizOpen
                  ? "Akses peserta saat ini TERBUKA. Seluruh peserta dapat memilih nama dan mulai mengerjakan soal investigasi 15 soal · 5 menit."
                  : "Akses peserta saat ini DITUTUP. Tombol mulai di halaman peserta terkunci dan menunggu pengawas membuka sesi."}
              </p>
            </div>

            <button
              type="button"
              className={`btn-toggle-quiz-master ${
                isQuizOpen ? "btn-close-action" : "btn-open-action"
              }`}
              onClick={handleToggleQuizStatus}
              disabled={togglingQuiz}
            >
              <Icon name={isQuizOpen ? "lock" : "arrow"} size={20} />
              <span>
                {togglingQuiz
                  ? "Memproses..."
                  : isQuizOpen
                  ? "TUTUP SESI (KUNCI AKSES)"
                  : "BUKA / MULAI SESI SEKARANG"}
              </span>
            </button>
          </section>

          {/* QUIZ STATS OVERVIEW */}
          <section className="admin-stats-grid" aria-label="Statistik Kuis">
            <div className="admin-stat-card">
              <span className="stat-label">Total Peserta Selesai</span>
              <strong className="stat-value">{totalSubmissions} orang</strong>
              <span className="stat-sub">Telah mengumpulkan kuis</span>
            </div>
            <div className="admin-stat-card">
              <span className="stat-label">Rata-rata Nilai</span>
              <strong className="stat-value text-gold">{avgScore}</strong>
              <span className="stat-sub">Skala 100</span>
            </div>
            <div className="admin-stat-card">
              <span className="stat-label">Nilai Tertinggi</span>
              <strong className="stat-value text-success">{highestScore}</strong>
              <span className="stat-sub">Skor maksimal</span>
            </div>
            <div className="admin-stat-card">
              <span className="stat-label">Total Jawaban Benar</span>
              <strong className="stat-value">{totalCorrectAll}</strong>
              <span className="stat-sub">Dari seluruh submission</span>
            </div>
          </section>

          {/* TABLE OF SUBMISSIONS */}
          <section className="admin-table-section panel">
            {filteredSubmissions.length === 0 ? (
              <div className="empty-table-state">
                <Icon name="compass" size={32} />
                <p>Belum ada data nilai peserta kuis yang sesuai filter.</p>
              </div>
            ) : (
              <div className="table-responsive-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Peserta</th>
                      <th>Kelompok</th>
                      <th>Nilai</th>
                      <th>Status</th>
                      <th>Benar</th>
                      <th>Salah</th>
                      <th>Durasi</th>
                      <th>Waktu Selesai</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((sub, index) => {
                      const mins = Math.floor(sub.timeSpentSeconds / 60);
                      const secs = sub.timeSpentSeconds % 60;
                      const timeStr = `${mins}m ${secs}s`;
                      const dateStr = new Date(sub.completedAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Jakarta",
                      });
                      const overallRank = overallRankById.get(sub.id) ?? index + 1;
                      const isTop3 = overallRank <= 3;
                      const isBottom2 =
                        sortedSubmissions.length >= 4 &&
                        overallRank > 3 &&
                        overallRank > sortedSubmissions.length - 2;
                      const isPassed = sub.score >= 80;

                      return (
                        <tr
                          key={sub.id}
                          className={
                            isTop3
                              ? `row-quiz-top is-rank-${overallRank}`
                              : isBottom2
                              ? "row-quiz-prison"
                              : ""
                          }
                        >
                          <td className="col-center">
                            {isTop3 ? (
                              <span
                                className={`quiz-rank-badge is-top-${overallRank}`}
                                title={`Peringkat ${overallRank} (3 Teratas)`}
                              >
                                {overallRank === 1 ? "🏆" : overallRank === 2 ? "🥈" : "🥉"}{" "}
                                {index + 1}
                              </span>
                            ) : isBottom2 ? (
                              <span
                                className="quiz-rank-badge is-prison"
                                title="2 Terbawah (Masuk Penjara)"
                              >
                                ⛓ {index + 1}
                              </span>
                            ) : (
                              <strong>{index + 1}</strong>
                            )}
                          </td>
                          <td className="col-name">
                            <strong>{sub.participantName}</strong>
                          </td>
                          <td className="col-group">{sub.groupName}</td>
                          <td className="col-score">
                            <span
                              className={`score-tag ${isPassed ? "score-high" : "score-low"}`}
                            >
                              {sub.score}
                            </span>
                          </td>
                          <td className="col-center">
                            <span
                              className={`score-tag ${isPassed ? "score-high" : "score-low"}`}
                            >
                              {isPassed ? "LULUS" : "TIDAK LULUS"}
                            </span>
                          </td>
                          <td className="col-center text-success">{sub.correctCount}</td>
                          <td className="col-center text-danger">{sub.wrongCount}</td>
                          <td className="col-time">{timeStr}</td>
                          <td className="col-date">{dateStr} WIB</td>
                          <td className="col-center">
                            <button
                              type="button"
                              className="btn-table-delete-attendance"
                              onClick={() => handleDeleteSingleSubmission(sub.id, sub.participantName)}
                              title={`Hapus data nilai ${sub.participantName}`}
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      )}

      {/* =====================================================================
          TAB 2: REKAP KEHADIRAN AGENT (ABSENSI) & PENGELOLAAN
          ===================================================================== */}
      {activeAdminTab === "attendance" && (
        <section className="admin-attendance-section">
          {/* NOTICE BANNER */}
          {attendanceNotice && (
            <div className="notice success-notice" role="alert">
              <Icon name="check" size={16} />
              <span>{attendanceNotice}</span>
            </div>
          )}

          {/* ATTENDANCE CONTROLLER ACTION BAR */}
          <div className="admin-attendance-toolbar panel">
            <div className="toolbar-info">
              <span className="eyebrow">PENGELOLAAN DATA ABSENSI</span>
              <h3>Kendali Data Kehadiran</h3>
              <p>
                Unduh rekap kehadiran (.xlsx), unduh paket barcode peserta (.zip), atau reset data
                absensi seluruh peserta.
              </p>
            </div>

            <div className="toolbar-buttons-cluster">
              <button
                type="button"
                className="button button-gold"
                onClick={handleExportAttendanceExcel}
              >
                <Icon name="download" size={16} />
                <span>Download Rekap Absensi (.xlsx)</span>
              </button>

              <button
                type="button"
                className="button button-gold btn-download-all-zip"
                onClick={handleDownloadAllBarcodesZip}
                disabled={downloadingZip}
                title="Unduh seluruh 35 lencana QR peserta (file PNG dengan nama [Nama] - [NIK].png) dalam 1 arsip ZIP"
              >
                <Icon name="download" size={16} />
                <span>{downloadingZip ? "Menyiapkan ZIP PNG..." : "Download Semua Lencana PNG (.zip)"}</span>
              </button>

              <button
                type="button"
                className="btn-danger-outline"
                onClick={handleResetAllAttendance}
                title="Hapus seluruh data kehadiran 35 peserta"
              >
                <Icon name="close" size={16} />
                <span>Kosongkan / Reset Semua Absen</span>
              </button>
            </div>
          </div>

          {/* ATTENDANCE STATS OVERVIEW */}
          <section className="admin-stats-grid">
            <div className="admin-stat-card">
              <span className="stat-label">Total Peserta Terdaftar</span>
              <strong className="stat-value">{totalRoster} orang</strong>
              <span className="stat-sub">4 Kelompok Resmi</span>
            </div>
            <div className="admin-stat-card">
              <span className="stat-label">Total Hadir / Terabsen</span>
              <strong className="stat-value text-success">{attendedCount} orang</strong>
              <span className="stat-sub">{attendancePercentage}% dari seluruh peserta</span>
            </div>
            <div className="admin-stat-card">
              <span className="stat-label">Belum Absen</span>
              <strong className="stat-value text-danger">{totalRoster - attendedCount} orang</strong>
              <span className="stat-sub">Menunggu verifikasi kehadiran</span>
            </div>
            <div className="admin-stat-card">
              <span className="stat-label">Sedang Izin Keluar</span>
              <strong className="stat-value" style={{ color: "#f59e0b" }}>
                {outsideRoomCount} orang
              </strong>
              <span className="stat-sub">
                {attendanceMovements.length} total log keluar/masuk
              </span>
            </div>
          </section>

          {/* SEARCH BAR */}
          <div className="admin-filter-bar">
            <div className="search-group" style={{ width: "100%", maxWidth: "420px" }}>
              <input
                type="text"
                className="quiz-input"
                placeholder="Cari nama, NIK, atau kelompok..."
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
              />
            </div>
            <span className="text-muted" style={{ fontSize: "12px", alignSelf: "center" }}>
              Menampilkan {filteredAttendance.length} dari {totalRoster} peserta
            </span>
          </div>

          {/* ATTENDANCE DATA TABLE */}
          <div className="admin-table-section panel">
            <div className="table-responsive-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>NIK</th>
                    <th>Nama Detektif</th>
                    <th>Posisi</th>
                    <th>Dept</th>
                    <th>Kelompok</th>
                    <th>Rank</th>
                    <th>Status</th>
                    <th>Waktu Hadir</th>
                    <th>Status Ruangan</th>
                    <th>Log Keluar / Masuk</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.map((m) => {
                    const recordTime = attendanceRecords[m.nik];
                    const isPresent = Boolean(recordTime);
                    const formattedTime = recordTime
                      ? new Date(recordTime).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        }) + " WIB"
                      : "—";
                    const roomSummary = getMemberRoomSummary(
                      m.nik,
                      attendanceRecords,
                      attendanceMovements
                    );
                    const fmtShort = (iso: string | null) =>
                      iso
                        ? new Date(iso).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—";
                    const roomBadgeText =
                      roomSummary.roomState === "outside_room"
                        ? "Di Luar Ruangan"
                        : roomSummary.roomState === "returned_room"
                        ? "Kembali Masuk"
                        : roomSummary.roomState === "in_room"
                        ? "Di Dalam"
                        : "—";
                    const roomBadgeClass =
                      roomSummary.roomState === "outside_room"
                        ? "score-med"
                        : roomSummary.roomState === "returned_room" ||
                          roomSummary.roomState === "in_room"
                        ? "score-high"
                        : "score-low";

                    return (
                      <tr key={m.nik} className={isPresent ? "row-present" : ""}>
                        <td className="col-center">{m.no}</td>
                        <td className="col-code">{m.nik}</td>
                        <td className="col-name">
                          <strong>{m.nama}</strong>
                        </td>
                        <td>{m.posisi}</td>
                        <td>{m.dept}</td>
                        <td className="col-group">
                          {m.groupNumber > 0 ? `${m.namaKelompok} (Tim ${m.groupNumber})` : "—"}
                        </td>
                        <td>{m.statusRank}</td>
                        <td>
                          <span
                            className={`score-tag ${
                              isPresent ? "score-high" : "score-low"
                            }`}
                          >
                            {isPresent ? "✓ Hadir" : "Belum"}
                          </span>
                        </td>
                        <td className="col-time">{formattedTime}</td>
                        <td>
                          {roomSummary.roomState === "not_checked_in" ? (
                            <span className="text-muted">—</span>
                          ) : (
                            <span className={`score-tag ${roomBadgeClass}`}>
                              {roomBadgeText}
                            </span>
                          )}
                        </td>
                        <td className="col-time">
                          {roomSummary.leaveCount > 0 || roomSummary.returnCount > 0 ? (
                            <div className="room-log-cell">
                              <span>
                                Keluar: <strong>{fmtShort(roomSummary.lastLeaveAt)}</strong>
                              </span>
                              <span>
                                Masuk: <strong>{fmtShort(roomSummary.lastReturnAt)}</strong>
                              </span>
                              {roomSummary.leaveCount > 1 ? (
                                <span className="room-log-count">
                                  ({roomSummary.leaveCount}x izin)
                                </span>
                              ) : null}
                              {roomSummary.lastReason ? (
                                <span className="room-log-reason">
                                  Ket: {roomSummary.lastReason}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="col-center">
                          {isPresent ? (
                            <button
                              type="button"
                              className="btn-table-delete-attendance"
                              onClick={() => handleDeleteSingleAttendance(m.nik, m.nama)}
                              title="Hapus kehadiran peserta ini"
                            >
                              Hapus Absen
                            </button>
                          ) : (
                            <span className="text-muted" style={{ fontSize: "11px" }}>
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 3: KATALOG QR CODE PESERTA (35 AGENT)
          ===================================================================== */}
      {activeAdminTab === "catalog" && (
        <section className="catalog-section">
          <div className="catalog-toolbar panel">
            <div className="catalog-filters">
              <div className="filter-group-buttons">
                <span className="filter-lbl">Filter Kelompok:</span>
                {["ALL", "1", "2", "3", "4"].map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    className={`btn-filter-grp ${catalogGroup === grp ? "is-active" : ""}`}
                    onClick={() => setCatalogGroup(grp)}
                  >
                    {grp === "ALL" ? "Semua Tim (35)" : `Kelompok ${grp}`}
                  </button>
                ))}
              </div>

              <div className="filter-search-wrap">
                <input
                  type="text"
                  className="quiz-input"
                  placeholder="Cari nama, NIK, atau posisi..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="catalog-summary-stats">
              <span>
                Menampilkan <strong>{filteredCatalog.length}</strong> dari{" "}
                <strong>{totalRoster}</strong> peserta resmi
              </span>
              <button
                type="button"
                className="button button-gold btn-download-all-zip"
                onClick={handleDownloadAllBarcodesZip}
                disabled={downloadingZip}
                title="Unduh seluruh 35 lencana QR peserta (file PNG dengan nama [Nama] - [NIK].png) dalam 1 arsip ZIP"
              >
                <Icon name="download" size={16} />
                <span>{downloadingZip ? "Menyiapkan ZIP PNG..." : "Download Semua Lencana PNG (.zip)"}</span>
              </button>
            </div>
          </div>

          <div className="catalog-cards-grid">
            {filteredCatalog.map((member) => {
              const isAttended = Boolean(attendanceRecords[member.nik]);
              return (
                <div
                  key={member.nik}
                  className={`catalog-member-card panel ${isAttended ? "is-attended" : ""}`}
                >
                  <div className="catalog-card-header">
                    <span className="member-num-tag">
                      #{String(member.no).padStart(2, "0")} ·{" "}
                      {member.groupNumber > 0 ? `Kelompok ${member.groupNumber}` : member.jabatan}
                    </span>
                    <span className={`status-pill ${isAttended ? "pill-present" : "pill-absent"}`}>
                      {isAttended ? "✓ Hadir" : "Belum Hadir"}
                    </span>
                  </div>

                  <div className="catalog-card-body">
                    <h3 className="catalog-member-name">{member.nama}</h3>
                    <p className="catalog-member-pos">
                      {member.posisi} — <strong>{member.dept}</strong>
                    </p>
                    <div className="catalog-badges-row">
                      <span className="badge-rank">{member.statusRank}</span>
                      {member.groupNumber > 0 && (
                        <span className="badge-team">{member.namaKelompok}</span>
                      )}
                      <span className="badge-gender">{member.genderLabel}</span>
                    </div>

                    {/* QR DETECTIVE BADGE DISPLAY ONLY */}
                    <div className="catalog-barcode-block">
                      <div
                        className="catalog-barcode-svg-box"
                        dangerouslySetInnerHTML={{
                          __html: generateQrSvg(member.nik, { member }),
                        }}
                      />
                    </div>
                  </div>

                  <div className="catalog-card-footer is-single-btn">
                    <button
                      type="button"
                      className="btn-card-action btn-download-barcode"
                      onClick={() => void handleDownloadQr(member)}
                      title={`Download Lencana QR: ${member.nama} - ${member.nik}.png`}
                    >
                      <Icon name="download" size={14} />
                      <span>Download Lencana QR (.png)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activeAdminTab === "dept-head" && (
        <AdminDeptHeadPanel
          snapshot={deptHeadSnapshot}
          loading={loadingDeptHead}
          onRefresh={fetchDeptHead}
          onSnapshotChange={setDeptHeadSnapshot}
          getHeaders={getAdminHeaders}
        />
      )}

      {activeAdminTab === "stage" && (
        <AdminStagePanel
          snapshot={stageSnapshot}
          loading={loadingStage}
          onRefresh={fetchStageSnapshot}
          onSnapshotChange={setStageSnapshot}
          getHeaders={getAdminHeaders}
        />
      )}
    </main>
  );
}
