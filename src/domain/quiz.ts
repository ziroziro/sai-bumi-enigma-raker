import { ATTENDANCE_ROSTER } from "./attendance";
import type { Participant, RegisteredGroup } from "./registration";

export interface QuizOption {
  id: string;
  text: string;
}

export interface ClientQuizQuestion {
  id: string;
  category: "Detektif & Logika" | "Enigma Sai Bumi" | "Strategi Tim";
  question: string;
  options: QuizOption[];
}

export type QuizChannelId = "pretest" | "quiz-1" | "quiz-2" | "quiz-3" | "quiz-4";

export const QUIZ_CHANNELS: ReadonlyArray<{
  id: QuizChannelId;
  label: string;
  shortLabel: string;
  group: "pretest" | "quiz";
}> = [
  { id: "pretest", label: "Mission 1 · Pretest Investigasi", shortLabel: "Mission 1", group: "pretest" },
  { id: "quiz-1", label: "Mission 2 · MKT & MPA", shortLabel: "Mission 2", group: "quiz" },
  { id: "quiz-2", label: "Mission 3 · HC3 & PDEV", shortLabel: "Mission 3", group: "quiz" },
  { id: "quiz-3", label: "Mission 4 · ARTC, GA-LEGAL, PDCA, IT", shortLabel: "Mission 4", group: "quiz" },
  { id: "quiz-4", label: "Mission 5 · TSD, PART, WAREHOUSE", shortLabel: "Mission 5", group: "quiz" },
] as const;

export const QUIZ_ONLY_CHANNEL_IDS: readonly QuizChannelId[] = [
  "quiz-1",
  "quiz-2",
  "quiz-3",
  "quiz-4",
];

export function isValidQuizChannelId(value: unknown): value is QuizChannelId {
  return (
    value === "pretest" ||
    value === "quiz-1" ||
    value === "quiz-2" ||
    value === "quiz-3" ||
    value === "quiz-4"
  );
}

export function getQuizChannelLabel(channelId: QuizChannelId): string {
  return QUIZ_CHANNELS.find((c) => c.id === channelId)?.label ?? "Mission 1 · Investigasi";
}

export interface QuizSubmissionRecord {
  id: string;
  quizKey?: QuizChannelId;
  participantId: string;
  participantCode: string;
  participantName: string;
  groupNumber: number;
  groupName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  timeSpentSeconds: number;
  completedAt: string;
}

export interface QuizQuestion {
  id: string;
  category: "Detektif & Logika" | "Enigma Sai Bumi" | "Strategi Tim";
  storyContext?: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
}

export interface QuizParticipantInfo {
  participantId: string;
  participantName: string;
  participantCode: string;
  groupNumber: number;
  groupName: string;
}

export interface QuizResult {
  participant: QuizParticipantInfo;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  timeSpentSeconds: number;
  answers: Record<string, string>;
  completedAt: string;
  questions: QuizQuestion[];
}

export const QUIZ_DURATION_SECONDS = 300; // 5 menit
export const QUIZ_QUESTION_COUNT = 15; // 15 soal
export const QUIZ_KKM_SCORE = 80; // KKM kelulusan 80

/**
 * Menghitung nilai akhir skala 100:
 * Untuk 15 soal -> 1 soal = 100 / 15 = 6.666666667 poin, maksimal 100.
 */
export function calculateQuizScore(correctCount: number, totalQuestions: number): number {
  if (totalQuestions <= 0 || correctCount <= 0) return 0;
  const raw = correctCount * (100 / totalQuestions);
  const rounded = Math.round(raw * 100) / 100;
  return Math.min(100, rounded);
}

export function isQuizPassed(score: number): boolean {
  return score >= QUIZ_KKM_SCORE;
}

/**
 * Automatically detects participant's group number from registered database groups,
 * or based on official participant allocation (3x9 + 1x8 = 35).
 */
export function detectParticipantGroup(
  participant: Participant,
  registeredGroups: RegisteredGroup[],
  allParticipants: Participant[]
): number {
  // 1. Search in registered groups from database
  for (const group of registeredGroups) {
    if (group.members.some((m) => m.id === participant.id || m.code === participant.code)) {
      return group.groupNumber;
    }
  }

  // 2. Match official ATTENDANCE_ROSTER by NIK or normalized name
  const norm = (raw: string) =>
    raw
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  const cleanCode = participant.code.trim().toUpperCase();
  const cleanName = norm(participant.name);
  const rosterMatch = ATTENDANCE_ROSTER.find(
    (m) => m.nik.toUpperCase() === cleanCode || norm(m.nama) === cleanName
  );
  if (rosterMatch && rosterMatch.groupNumber >= 1 && rosterMatch.groupNumber <= 4) {
    return rosterMatch.groupNumber;
  }

  // 3. Fallback based on sequence (3x9 + 1x8 = 35)
  const idx = allParticipants.findIndex(
    (p) => p.id === participant.id || p.code === participant.code
  );
  if (idx !== -1) {
    if (idx < 9) return 1;
    if (idx < 18) return 2;
    if (idx < 27) return 3;
    return 4;
  }

  return 1;
}

export const rawQuestionBank: Array<{
  id: string;
  category: "Detektif & Logika" | "Enigma Sai Bumi" | "Strategi Tim";
  storyContext?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}> = [
  {
    id: "q1",
    category: "Enigma Sai Bumi",
    question: "Berapa banyak project yang wajib diketahui pada kegiatan Project Dev Day?",
    options: ["23", "22", "21", "20"],
    correctIndex: 2,
    explanation: "Terdapat 21 project yang wajib diketahui pada kegiatan Project Dev Day.",
  },
  {
    id: "q2",
    category: "Enigma Sai Bumi",
    question: "Ada berapa jumlah kelompok pada kegiatan Project Dev Day?",
    options: ["1", "2", "3", "4"],
    correctIndex: 3,
    explanation: "Terdapat 4 kelompok pada kegiatan Project Dev Day.",
  },
  {
    id: "q3",
    category: "Strategi Tim",
    question: "Permainan yang digunakan untuk menentukan ketua kelompok adalah ...",
    options: ["Werewolf", "Uno", "Zuma", "Ziczac"],
    correctIndex: 0,
    explanation: "Permainan Werewolf digunakan untuk menentukan ketua kelompok.",
  },
  {
    id: "q4",
    category: "Enigma Sai Bumi",
    question: 'Siapakah sosok Team Lead dengan kekuatan "Sang Penjaga Garis Depan"?',
    options: ["Riki Zubri", "Jefri Krisna Putra", "Bagus Kurniawan", "Bambang Tri Atmojo"],
    correctIndex: 2,
    explanation: 'Bagus Kurniawan adalah sosok Team Lead dengan kekuatan "Sang Penjaga Garis Depan".',
  },
  {
    id: "q5",
    category: "Enigma Sai Bumi",
    question: "Tema yang diusung pada kegiatan Project Dev Day adalah ...",
    options: ["Hyperlocal", "Mystery & Detective", "Lokal Lampung", "Semua Benar"],
    correctIndex: 1,
    explanation: "Tema yang diusung pada kegiatan Project Dev Day adalah Mystery & Detective.",
  },
  {
    id: "q6",
    category: "Enigma Sai Bumi",
    question: "Kapan kelompok Project Dev Day dibentuk?",
    options: ["5 November 2026", "6 November 2026", "7 November 2026", "8 November 2026"],
    correctIndex: 0,
    explanation: "Kelompok Project Dev Day dibentuk pada tanggal 5 November 2026.",
  },
  {
    id: "q7",
    category: "Enigma Sai Bumi",
    question: "Siapakah yang menjadi ketua kegiatan Project Dev Day?",
    options: ["Safira", "Desi", "Tomo", "Rio"],
    correctIndex: 3,
    explanation: "Rio adalah ketua kegiatan Project Dev Day.",
  },
  {
    id: "q8",
    category: "Enigma Sai Bumi",
    question: "Apa jargon kegiatan Project Dev Day?",
    options: [
      "Are you ready age? I'm ready to find the code!",
      "Are you read agent? I'm ready to find the code!",
      "Are you ready agent? I'm ready to find th code!",
      "Are you ready agent? I'm ready to find the clue!",
    ],
    correctIndex: 3,
    explanation: "Jargon resmi kegiatan Project Dev Day adalah pilihan D.",
  },
  {
    id: "q9",
    category: "Enigma Sai Bumi",
    question: "Tema kegiatan Project Dev Day terinspirasi dari film, Kecuali",
    options: ["Indiana Jones", "Tomb Raider", "Sherlock Holmes", "Jumanji"],
    correctIndex: 3,
    explanation: "Jumanji bukan termasuk film inspirasi tema kegiatan Project Dev Day.",
  },
  {
    id: "q10",
    category: "Strategi Tim",
    question: "Apa tujuan utama diselenggarakannya Project Dev Day?",
    options: [
      "Mengadakan kompetisi antar-departemen",
      "Mengenalkan dan mempresentasikan project unggulan setiap departemen",
      "Melakukan evaluasi kehadiran karyawan",
      "Mengadakan kegiatan hiburan bersama",
    ],
    correctIndex: 1,
    explanation:
      "Tujuan utama Project Dev Day adalah mengenalkan dan mempresentasikan project unggulan setiap departemen.",
  },
  {
    id: "q11",
    category: "Strategi Tim",
    question: "Siapa yang bertugas memilih Agent untuk mempresentasikan project departemen?",
    options: ["Seluruh peserta", "Panitia kegiatan", "Department Head", "Team Lead"],
    correctIndex: 2,
    explanation: "Department Head bertugas memilih Agent untuk mempresentasikan project departemen.",
  },
  {
    id: "q12",
    category: "Strategi Tim",
    question: "Berapa jumlah slide rangkuman yang wajib dibuat untuk setiap project?",
    options: ["1 slide", "2 slide", "3 slide", "5 slide"],
    correctIndex: 0,
    explanation: "Jumlah slide rangkuman yang wajib dibuat untuk setiap project adalah 1 slide.",
  },
  {
    id: "q13",
    category: "Enigma Sai Bumi",
    question: "Apa sebutan yang digunakan untuk peserta dalam tema kegiatan Project Dev Day?",
    options: ["Detective", "Agent", "Investigator", "Commander"],
    correctIndex: 1,
    explanation: "Sebutan untuk peserta dalam tema kegiatan Project Dev Day adalah Agent.",
  },
  {
    id: "q14",
    category: "Strategi Tim",
    question: "Apa yang harus dilakukan seorang Agent sebelum mempresentasikan project unggulan departemennya?",
    options: [
      "Menghafalkan seluruh materi tanpa memahami isi",
      "Memahami project dan menyiapkan rangkuman presentasi",
      "Menunggu arahan dari peserta lain",
      "Membuat project baru secara individu",
    ],
    correctIndex: 1,
    explanation:
      "Seorang Agent harus memahami project dan menyiapkan rangkuman presentasi sebelum mempresentasikan project departemennya.",
  },
  {
    id: "q15",
    category: "Detektif & Logika",
    question: "Dalam tema Mystery & Detective, apa yang menjadi tugas utama seorang Detective?",
    options: [
      "Menghindari semua petunjuk",
      "Menyimpan informasi untuk diri sendiri",
      "Mengumpulkan petunjuk dan menemukan jawaban dari sebuah misteri",
      "Menebak jawaban tanpa mencari bukti",
    ],
    correctIndex: 2,
    explanation:
      "Tugas utama seorang Detective adalah mengumpulkan petunjuk dan menemukan jawaban dari sebuah misteri.",
  },
];

/** Fisher-Yates shuffle algorithm */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = result[i];
    const target = result[j];
    if (current !== undefined && target !== undefined) {
      result[i] = target;
      result[j] = current;
    }
  }
  return result;
}

export interface RawQuestionItem {
  id: string;
  category: "Detektif & Logika" | "Enigma Sai Bumi" | "Strategi Tim";
  storyContext?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const quiz1QuestionBank: RawQuestionItem[] = [
  {
    id: "q1_1",
    category: "Enigma Sai Bumi",
    question: "Apa dasar utama dalam menentukan prioritas pengembangan wilayah pada project Territory Management Rejuvenation 2027?",
    options: [
      "Jumlah dealer yang sudah beroperasi",
      "Market potential dan coverage gap",
      "Total anggaran promosi tahunan",
      "Jumlah sales dengan produktivitas tertinggi",
    ],
    correctIndex: 1,
    explanation: "Dasar utama prioritas pengembangan wilayah adalah market potential dan coverage gap.",
  },
  {
    id: "q1_2",
    category: "Enigma Sai Bumi",
    question: "Apa permasalahan utama yang melatarbelakangi pengembangan SDA 2.0?",
    options: [
      "CONAN belum mampu mengumpulkan berita ekonomi",
      "Jumlah dealer belum mencukupi kebutuhan pasar",
      "Proses setelah CONAN masih memerlukan pengolahan manual hingga sales plan dan Niguri final",
      "Seluruh data stok dealer belum tersedia",
    ],
    correctIndex: 2,
    explanation: "Pengembangan SDA 2.0 dilatarbelakangi proses setelah CONAN yang masih memerlukan pengolahan manual hingga sales plan dan Niguri final.",
  },
  {
    id: "q1_3",
    category: "Enigma Sai Bumi",
    question: "Yang ingin diwujudkan melalui Honda NextUp?",
    options: [
      "Mengubah dukungan pensi yang insidental menjadi program sekolah berulang yang menggabungkan bakat, edukasi, dan layanan Honda",
      "Mengalihkan seluruh promosi Honda ke media sosial",
      "Mengutamakan penjualan langsung kepada siswa",
      "Menggantikan kegiatan sekolah dengan pameran dealer",
    ],
    correctIndex: 0,
    explanation: "Honda NextUp mengubah dukungan pensi insidental menjadi program sekolah berulang yang menggabungkan bakat, edukasi, dan layanan Honda.",
  },
  {
    id: "q1_4",
    category: "Enigma Sai Bumi",
    question: "Apa tujuan utama dari Project TEPAT 2027?",
    options: [
      "Menambah jumlah dealer Honda di seluruh Lampung",
      "Mengurangi seluruh kegiatan promosi BTL",
      "Membantu menentukan lokasi dan waktu promosi BTL yang lebih tepat berdasarkan potensi pasar",
      "Meningkatkan jumlah karyawan bagian promosi",
    ],
    correctIndex: 2,
    explanation: "Project TEPAT 2027 bertujuan membantu menentukan lokasi dan waktu promosi BTL yang lebih tepat berdasarkan potensi pasar.",
  },
  {
    id: "q1_5",
    category: "Enigma Sai Bumi",
    question: "Empat komponen yang saling terintegrasi dalam project SDA 2.0 adalah...",
    options: [
      "CONAN, Kalkulator PDRB, Sales Plan, Niguri",
      "Territory, Finco, People, Activity",
      "Dealer, AHASS, HC3, Logistic",
      "Market Share, Roadshow, Sales Force, POS",
    ],
    correctIndex: 0,
    explanation: "Empat komponen terintegrasi dalam SDA 2.0 adalah CONAN, Kalkulator PDRB, Sales Plan, dan Niguri.",
  },
  {
    id: "q1_6",
    category: "Strategi Tim",
    question: "Empat resource utama yang dipetakan untuk mengoptimalkan potensi wilayah adalah...",
    options: [
      "Product, Price, Place, Promotion",
      "Target, Sales, Stock, Market",
      "Place, People, Finco, Activity",
      "Dealer, Customer, Competitor, Logistic",
    ],
    correctIndex: 2,
    explanation: "Empat resource utama yang dipetakan adalah Place, People, Finco, dan Activity.",
  },
  {
    id: "q1_7",
    category: "Detektif & Logika",
    question: "Apa pendekatan yang digunakan TEPAT untuk menghasilkan rekomendasi lokasi BTL dan prediksi leads serta SPK?",
    options: [
      "Pemilihan lokasi berdasarkan kebiasaan dealer",
      "Integrasi data historis, weighted scoring, dan machine learning",
      "Pemerataan jumlah event yang sama di seluruh kecamatan",
      "Penentuan lokasi semata-mata berdasarkan biaya sewa",
    ],
    correctIndex: 1,
    explanation: "TEPAT menggunakan integrasi data historis, weighted scoring, dan machine learning.",
  },
  {
    id: "q1_8",
    category: "Strategi Tim",
    question: "Bagaimana format kompetisi yang diusulkan dalam pilot Honda NextUp?",
    options: [
      "Satu kompetisi online tanpa roadshow sekolah",
      "Kompetisi tahunan yang hanya melibatkan satu sekolah",
      "Delapan sekolah dengan delapan final terpisah",
      "Empat sekolah menjalani seleksi roadshow dan pemenangnya mengikuti satu final antar sekolah",
    ],
    correctIndex: 3,
    explanation: "Empat sekolah menjalani seleksi roadshow dan pemenangnya mengikuti satu final antar sekolah.",
  },
  {
    id: "q1_9",
    category: "Enigma Sai Bumi",
    question: "Apa tujuan analisis Finco Coverage & Potential Blank Spot?",
    options: [
      "Mengidentifikasi wilayah yang memiliki kesenjangan akses pembiayaan untuk prioritas penempatan resource Finco",
      "Menghapus kerja sama dengan seluruh perusahaan pembiayaan",
      "Menetapkan suku bunga yang sama untuk semua kecamatan",
      "Mengurangi pengajuan kredit pada wilayah rural",
    ],
    correctIndex: 0,
    explanation: "Tujuannya mengidentifikasi wilayah dengan kesenjangan akses pembiayaan untuk prioritas penempatan resource Finco.",
  },
  {
    id: "q1_10",
    category: "Detektif & Logika",
    question: "Dalam simulasi SDA, market acuan adalah 1.000 unit dengan growth market +3,25%. Berapa forecast market M+1 setelah pembulatan?",
    options: ["1.025 unit", "1.030 unit", "1.033 unit", "1.050 unit"],
    correctIndex: 2,
    explanation: "1.000 × 1,0325 = 1.032,5 dibulatkan menjadi 1.033 unit.",
  },
  {
    id: "q1_11",
    category: "Enigma Sai Bumi",
    question: "Apa target perbaikan KPI yang ditetapkan dalam pilot project TEPAT 2027?",
    options: [
      "Event tanpa penjualan 26%, pencapaian target 46%, CPL Rp24.700",
      "Event tanpa penjualan 15%, pencapaian target 60%, CPL Rp21.000",
      "Event tanpa penjualan 10%, pencapaian target 40%, CPL Rp30.000",
      "Event tanpa penjualan 20%, pencapaian target 50%, CPL Rp25.000",
    ],
    correctIndex: 1,
    explanation: "Target KPI pilot project TEPAT 2027 adalah event tanpa penjualan 15%, pencapaian target 60%, dan CPL Rp21.000.",
  },
  {
    id: "q1_12",
    category: "Enigma Sai Bumi",
    question: "Manakah kombinasi layanan H1–H2–H3 yang tepat dalam program Honda NextUp?",
    options: [
      "H1 pembiayaan, H2 aksesori, H3 promosi",
      "H1 servis, H2 penjualan, H3 CSR",
      "H1 edukasi sekolah, H2 kompetisi, H3 registrasi",
      "H1 penjualan motor baru, H2 servis kunjung, H3 suku cadang dan aksesori",
    ],
    correctIndex: 3,
    explanation: "Kombinasi layanan adalah H1 penjualan motor baru, H2 servis kunjung, dan H3 suku cadang dan aksesori.",
  },
  {
    id: "q1_13",
    category: "Strategi Tim",
    question: "Jika dealer tidak mengikuti rekomendasi lokasi BTL dari sistem TEPAT, apa mekanisme yang direncanakan?",
    options: [
      "Dealer boleh mengajukan lokasi alternatif dengan mencatat alasan penolakan untuk evaluasi",
      "Dealer otomatis dilarang mengadakan BTL",
      "Dealer wajib menggunakan rekomendasi tanpa pengecualian",
      "Lokasi alternatif hanya dipilih secara acak oleh sistem",
    ],
    correctIndex: 0,
    explanation: "Dealer boleh mengajukan lokasi alternatif dengan mencatat alasan penolakan untuk evaluasi.",
  },
  {
    id: "q1_14",
    category: "Strategi Tim",
    question: "Jika dealer mengubah Suggestion Niguri, bagaimana proses persetujuan yang sesuai?",
    options: [
      "Langsung berlaku setelah diubah dealer",
      "Cukup disetujui bagian Promotion",
      "Dealer memberikan alasan perubahan, kemudian melalui Area Manager dan persetujuan Main Dealer",
      "Setiap perubahan otomatis dibatalkan",
    ],
    correctIndex: 2,
    explanation: "Dealer memberikan alasan perubahan, kemudian melalui Area Manager dan persetujuan Main Dealer.",
  },
  {
    id: "q1_15",
    category: "Enigma Sai Bumi",
    question: "Urutan benefit yang tepat dalam Territory Management Rejuvenation 2027 adalah...",
    options: [
      "Output: penambahan event; Outcome: kenaikan stok; Impact: pengurangan promosi",
      "Output: accurate market intelligence & territory mapping; Outcome: effective territory & network management; Impact: precision investment & cost-efficient rural expansion",
      "Output: pengurangan dealer; Outcome: pengurangan sales; Impact: penutupan wilayah",
      "Output: investasi jaringan; Outcome: pemetaan market; Impact: analisis awal",
    ],
    correctIndex: 1,
    explanation: "Urutan benefit yang tepat: Output accurate market intelligence & territory mapping; Outcome effective territory & network management; Impact precision investment & cost-efficient rural expansion.",
  },
];

const quiz2QuestionBank: RawQuestionItem[] = [
  {
    id: "q2_1",
    category: "Enigma Sai Bumi",
    question: "Apa tujuan utama program HYPERPLAY?",
    options: [
      "Mengurangi jumlah dealer",
      "Mengoptimalkan potensi pasar lokal",
      "Mengurangi aktivitas sales",
      "Menghapus target penjualan",
    ],
    correctIndex: 1,
    explanation: "Tujuan utama program HYPERPLAY adalah mengoptimalkan potensi pasar lokal.",
  },
  {
    id: "q2_2",
    category: "Enigma Sai Bumi",
    question: "Berapa jumlah bab utama dalam struktur HYPERPLAY?",
    options: ["5 bab", "7 bab", "9 bab", "12 bab"],
    correctIndex: 2,
    explanation: "Struktur HYPERPLAY terdiri dari 9 bab utama.",
  },
  {
    id: "q2_3",
    category: "Strategi Tim",
    question: "Siapa yang bertanggung jawab menyusun HYPERPLAY sesuai kondisi dealer?",
    options: ["Dealer", "Konsumen", "Supplier", "Kompetitor"],
    correctIndex: 0,
    explanation: "Dealer bertanggung jawab menyusun HYPERPLAY sesuai kondisi dealer.",
  },
  {
    id: "q2_4",
    category: "Strategi Tim",
    question: "Apa yang harus dilakukan salespeople setiap hari dalam HYPERPLAY?",
    options: [
      "Menunggu konsumen datang",
      "Menghindari follow-up pelanggan",
      "Mengabaikan target penjualan",
      "Mengecek target dan melakukan follow-up leads",
    ],
    correctIndex: 3,
    explanation: "Salespeople harus mengecek target dan melakukan follow-up leads setiap hari.",
  },
  {
    id: "q2_5",
    category: "Enigma Sai Bumi",
    question: "Berapa target jumlah dealer yang menggunakan HYPERPLAY pada akhir 2027?",
    options: ["20 dealer", "40 dealer", "56 dealer", "100 dealer"],
    correctIndex: 2,
    explanation: "Target jumlah dealer yang menggunakan HYPERPLAY pada akhir 2027 adalah 56 dealer.",
  },
  {
    id: "q2_6",
    category: "Enigma Sai Bumi",
    question: "Apa tujuan utama program SPARK 360?",
    options: [
      "Mengurangi jumlah salespeople",
      "Mengembangkan kompetensi dan produktivitas salespeople",
      "Mengurangi pelayanan pelanggan",
      "Menghentikan aktivitas dealer",
    ],
    correctIndex: 1,
    explanation: "Tujuan utama SPARK 360 adalah mengembangkan kompetensi dan produktivitas salespeople.",
  },
  {
    id: "q2_7",
    category: "Strategi Tim",
    question: "Salah satu pilar utama SPARK 360 adalah?",
    options: [
      "People Development",
      "Building Renovation",
      "Product Replacement",
      "Stock Reduction",
    ],
    correctIndex: 0,
    explanation: "People Development merupakan salah satu pilar utama SPARK 360.",
  },
  {
    id: "q2_8",
    category: "Enigma Sai Bumi",
    question: "Apa yang dimaksud dengan Customer Experience dalam SPARK 360?",
    options: [
      "Mengurangi interaksi pelanggan",
      "Menambah harga produk",
      "Meningkatkan kepuasan dan loyalitas pelanggan",
      "Mengurangi jumlah konsumen",
    ],
    correctIndex: 2,
    explanation: "Customer Experience bertujuan meningkatkan kepuasan dan loyalitas pelanggan.",
  },
  {
    id: "q2_9",
    category: "Enigma Sai Bumi",
    question: "Berapa jumlah dealer yang menjadi target implementasi SPARK 360 tahun 2027?",
    options: ["10 dealer", "25 dealer", "40 dealer", "56 dealer"],
    correctIndex: 3,
    explanation: "Target implementasi SPARK 360 tahun 2027 adalah 56 dealer.",
  },
  {
    id: "q2_10",
    category: "Strategi Tim",
    question: "Departemen berikut yang termasuk dalam kolaborasi SPARK 360 adalah?",
    options: ["Sales dan After Sales", "HRD dan IT", "HC3", "Semua jawaban benar"],
    correctIndex: 3,
    explanation: "Sales dan After Sales, HRD dan IT, serta HC3 semuanya termasuk dalam kolaborasi SPARK 360.",
  },
  {
    id: "q2_11",
    category: "Enigma Sai Bumi",
    question: "Apa tujuan utama program loyalitas pelanggan?",
    options: [
      "Mengurangi jumlah pelanggan",
      "Meningkatkan loyalitas pelanggan Honda",
      "Menghapus database pelanggan",
      "Mengurangi pelayanan dealer",
    ],
    correctIndex: 1,
    explanation: "Tujuan utama program loyalitas pelanggan adalah meningkatkan loyalitas pelanggan Honda.",
  },
  {
    id: "q2_12",
    category: "Strategi Tim",
    question: "Apa manfaat memiliki database pelanggan yang berkualitas?",
    options: [
      "Mempermudah pengelolaan dan pelayanan pelanggan",
      "Menghambat komunikasi pelanggan",
      "Mengurangi informasi pelanggan",
      "Menghapus riwayat pelanggan",
    ],
    correctIndex: 0,
    explanation: "Database pelanggan yang berkualitas mempermudah pengelolaan dan pelayanan pelanggan.",
  },
  {
    id: "q2_13",
    category: "Strategi Tim",
    question: "Apa yang perlu dilakukan untuk meningkatkan kualitas data pelanggan?",
    options: [
      "Membiarkan data tidak lengkap",
      "Menghapus seluruh data",
      "Memperbarui dan memastikan data pelanggan akurat",
      "Tidak melakukan pengecekan data",
    ],
    correctIndex: 2,
    explanation: "Kualitas data ditingkatkan dengan memperbarui dan memastikan data pelanggan akurat.",
  },
  {
    id: "q2_14",
    category: "Enigma Sai Bumi",
    question: "Apa kepanjangan CRM?",
    options: [
      "Customer Retail Marketing",
      "Customer Relationship Management",
      "Customer Revenue Monitoring",
      "Customer Repair Management",
    ],
    correctIndex: 1,
    explanation: "CRM adalah singkatan dari Customer Relationship Management.",
  },
  {
    id: "q2_15",
    category: "Enigma Sai Bumi",
    question: "Apa manfaat penerapan program loyalitas pelanggan bagi bisnis dealer?",
    options: [
      "Menurunkan kepuasan pelanggan",
      "Mengurangi komunikasi pelanggan",
      "Mengurangi kunjungan pelanggan",
      "Meningkatkan loyalitas dan peluang pembelian ulang",
    ],
    correctIndex: 3,
    explanation: "Program loyalitas pelanggan meningkatkan loyalitas dan peluang pembelian ulang.",
  },
];

const quiz3QuestionBank: RawQuestionItem[] = [
  {
    id: "q3_1",
    category: "Enigma Sai Bumi",
    question: "Apa tujuan utama dari Project CERMAT?",
    options: [
      "Menambah jumlah pekerjaan manual",
      "Mengendalikan biaya operasional secara efektif dan transparan",
      "Menghapus seluruh anggaran departemen",
      "Mengurangi jumlah karyawan",
    ],
    correctIndex: 1,
    explanation: "Tujuan utama Project CERMAT adalah mengendalikan biaya operasional secara efektif dan transparan.",
  },
  {
    id: "q3_2",
    category: "Enigma Sai Bumi",
    question: "Apa kepanjangan dari CERMAT?",
    options: [
      "Cost Efficiency, Realization, Monitoring, Analysis & Tracking",
      "Customer Evaluation, Reporting & Management",
      "Cost Estimation, Revenue & Marketing",
      "Control Efficiency, Retail & Monitoring",
    ],
    correctIndex: 0,
    explanation: "CERMAT adalah Cost Efficiency, Realization, Monitoring, Analysis & Tracking.",
  },
  {
    id: "q3_3",
    category: "Strategi Tim",
    question: "Salah satu manfaat digitalisasi budgeting melalui CERMAT adalah?",
    options: [
      "Proses approval semakin lama",
      "Data anggaran sulit dipantau",
      "Monitoring anggaran secara real-time",
      "Penggunaan Excel semakin banyak",
    ],
    correctIndex: 2,
    explanation: "Digitalisasi budgeting melalui CERMAT memungkinkan monitoring anggaran secara real-time.",
  },
  {
    id: "q3_4",
    category: "Enigma Sai Bumi",
    question: "Apa tujuan utama Project TUDAY?",
    options: [
      "Memperbanyak proses pembayaran manual",
      "Menyederhanakan proses pengajuan pembayaran secara digital",
      "Menghilangkan proses pengajuan pembayaran",
      "Menambah penggunaan dokumen kertas",
    ],
    correctIndex: 1,
    explanation: "Tujuan utama Project TUDAY adalah menyederhanakan proses pengajuan pembayaran secara digital.",
  },
  {
    id: "q3_5",
    category: "Enigma Sai Bumi",
    question: "Apa salah satu fitur utama TUDAY?",
    options: [
      "Single Upload Process",
      "Manual Payment Only",
      "Offline Approval",
      "Paper Document Tracking",
    ],
    correctIndex: 0,
    explanation: "Salah satu fitur utama TUDAY adalah Single Upload Process.",
  },
  {
    id: "q3_6",
    category: "Enigma Sai Bumi",
    question: "Berapa target SLA proses pembayaran end-to-end melalui TUDAY?",
    options: ["10 hari", "7 hari", "5 hari", "3 hari"],
    correctIndex: 3,
    explanation: "Target SLA proses pembayaran end-to-end melalui TUDAY adalah 3 hari.",
  },
  {
    id: "q3_7",
    category: "Enigma Sai Bumi",
    question: "Apa fokus utama program ONE SAFETY 2027?",
    options: [
      "Meningkatkan penjualan motor",
      "Meningkatkan keselamatan kerja dan kepatuhan K3",
      "Menambah jumlah dealer",
      "Meningkatkan aktivitas promosi",
    ],
    correctIndex: 1,
    explanation: "Fokus utama ONE SAFETY 2027 adalah meningkatkan keselamatan kerja dan kepatuhan K3.",
  },
  {
    id: "q3_8",
    category: "Enigma Sai Bumi",
    question: "Berapa jumlah kewajiban K3 yang dipetakan dalam program ONE SAFETY?",
    options: ["15 kewajiban", "25 kewajiban", "45 kewajiban", "60 kewajiban"],
    correctIndex: 2,
    explanation: "Terdapat 45 kewajiban K3 yang dipetakan dalam program ONE SAFETY.",
  },
  {
    id: "q3_9",
    category: "Strategi Tim",
    question: "Apa target utama keselamatan kerja dalam ONE SAFETY?",
    options: [
      "Nol kecelakaan kerja berat",
      "Mengurangi pelatihan keselamatan",
      "Menghilangkan inspeksi bengkel",
      "Mengurangi penggunaan APD",
    ],
    correctIndex: 0,
    explanation: "Target utama keselamatan kerja dalam ONE SAFETY adalah nol kecelakaan kerja berat.",
  },
  {
    id: "q3_10",
    category: "Enigma Sai Bumi",
    question: "Apa kepanjangan dari PDCA?",
    options: [
      "Plan, Do, Check, Action",
      "Prepare, Develop, Control, Action",
      "Planning, Design, Check, Analysis",
      "Process, Data, Control, Audit",
    ],
    correctIndex: 0,
    explanation: "PDCA adalah Plan, Do, Check, Action.",
  },
  {
    id: "q3_11",
    category: "Strategi Tim",
    question: "Apa fokus utama Project PDCA 2027?",
    options: [
      "Mengurangi koordinasi antar departemen",
      "Menghentikan kegiatan evaluasi",
      "Memperkuat sinergi dan keselarasan lintas fungsi",
      "Mengurangi inovasi perusahaan",
    ],
    correctIndex: 2,
    explanation: "Fokus utama Project PDCA 2027 adalah memperkuat sinergi dan keselarasan lintas fungsi.",
  },
  {
    id: "q3_12",
    category: "Detektif & Logika",
    question: "Pada tahapan PDCA, aktivitas evaluasi dan monitoring dilakukan pada tahap?",
    options: ["Plan", "Do", "Check", "Act"],
    correctIndex: 2,
    explanation: "Evaluasi dan monitoring dilakukan pada tahap Check.",
  },
  {
    id: "q3_13",
    category: "Enigma Sai Bumi",
    question: "Apa fokus utama pengembangan TEDS 2.0 pada tahun 2027?",
    options: [
      "Menambah aplikasi sebanyak mungkin",
      "Stabilisasi sistem dan optimalisasi proses bisnis",
      "Menghapus seluruh modul sistem",
      "Mengembalikan proses menjadi manual",
    ],
    correctIndex: 1,
    explanation: "Fokus utama TEDS 2.0 pada tahun 2027 adalah stabilisasi sistem dan optimalisasi proses bisnis.",
  },
  {
    id: "q3_14",
    category: "Enigma Sai Bumi",
    question: "TEDS 2.0 merupakan pengembangan sistem berbasis?",
    options: ["Microsoft Word", "Google Forms", "Odoo 18", "Microsoft PowerPoint"],
    correctIndex: 2,
    explanation: "TEDS 2.0 merupakan pengembangan sistem berbasis Odoo 18.",
  },
  {
    id: "q3_15",
    category: "Strategi Tim",
    question: "Apa manfaat utama integrasi sistem dalam Project IT 2027?",
    options: [
      "Mengurangi input data berulang dan mempercepat proses bisnis",
      "Memperbanyak pekerjaan manual",
      "Memisahkan data antar departemen",
      "Memperlambat proses operasional",
    ],
    correctIndex: 0,
    explanation: "Integrasi sistem mengurangi input data berulang dan mempercepat proses bisnis.",
  },
];

const quiz4QuestionBank: RawQuestionItem[] = [
  {
    id: "q4_1",
    category: "Enigma Sai Bumi",
    question: "Dalam implementasi TEDS 2.0, perubahan alur proses outbound yang direncanakan pada tahun 2027 adalah ...",
    options: [
      "SO – Invoice – Picking – QC – Packing – Surat Jalan",
      "SO – Picking – Invoice – QC – Packing – Surat Jalan",
      "SO – Picking – QC – Packing – Surat Jalan – Invoice",
      "SO – Picking – Packing – QC – Invoice – Surat Jalan",
    ],
    correctIndex: 2,
    explanation: "Alur proses outbound TEDS 2.0 tahun 2027 adalah SO – Picking – QC – Packing – Surat Jalan – Invoice.",
  },
  {
    id: "q4_2",
    category: "Strategi Tim",
    question: "Project pembuatan conveyor unloading dan pemisahan penerimaan oli KPB dengan oli reguler tidak hanya berorientasi pada efisiensi waktu. Dampak strategis lain yang diharapkan adalah ...",
    options: [
      "Meningkatkan akurasi stok serta ketepatan pembagian dan pencetakan SO/MO sesuai kategori oli",
      "Menggabungkan seluruh lokasi penyimpanan untuk meningkatkan kapasitas gudang",
      "Menghilangkan proses monitoring stok melalui TEDS 2.0",
      "Meningkatkan kapasitas pengiriman melalui penambahan armada distribusi",
    ],
    correctIndex: 0,
    explanation: "Dampak strategis lainnya adalah meningkatkan akurasi stok serta ketepatan pembagian dan pencetakan SO/MO sesuai kategori oli.",
  },
  {
    id: "q4_3",
    category: "Strategi Tim",
    question: "Apabila terdapat permintaan item bundling dari Warehouse Unit ketika pekerjaan sparepart reguler sedang berlangsung, strategi yang direncanakan adalah ...",
    options: [
      "Menghentikan seluruh aktivitas picking reguler hingga proses bundling selesai",
      "Mengalihkan seluruh tenaga QC reguler untuk menyelesaikan bundling",
      "Menggabungkan proses bundling dan reguler berdasarkan urutan permintaan",
      "Menetapkan satu PIC picker bundling, menggunakan meja QC 1, serta memprioritaskan pengeluaran dan loading item bundling",
    ],
    correctIndex: 3,
    explanation: "Strateginya adalah menetapkan satu PIC picker bundling, menggunakan meja QC 1, serta memprioritaskan pengeluaran dan loading item bundling.",
  },
  {
    id: "q4_4",
    category: "Enigma Sai Bumi",
    question: "Perbedaan utama antara project Aplikasi Expedio dan Modul Ekspedisi AHM-MD terletak pada ...",
    options: [
      "Expedio berfokus pada pembayaran ekspedisi, sedangkan Modul Ekspedisi berfokus pada konsumen",
      "Expedio berfokus pada monitoring distribusi MD–Dealer–Konsumen, sedangkan Modul Ekspedisi mengintegrasikan proses ekspedisi dari Plan DO hingga pembayaran ongkos kirim",
      "Expedio berfokus pada penerimaan unit, sedangkan Modul Ekspedisi berfokus pada perbaikan NRFS",
      "Keduanya memiliki ruang lingkup yang sama dan hanya berbeda platform",
    ],
    correctIndex: 1,
    explanation: "Expedio berfokus pada monitoring distribusi MD–Dealer–Konsumen, sedangkan Modul Ekspedisi mengintegrasikan proses ekspedisi dari Plan DO hingga pembayaran ongkos kirim.",
  },
  {
    id: "q4_5",
    category: "Enigma Sai Bumi",
    question: "Dalam project perluasan area gudang, kapasitas penyimpanan ditargetkan meningkat dari 5.000 menjadi 8.000 unit. Kombinasi pengembangan yang tepat untuk mencapai target tersebut adalah ...",
    options: [
      "Pembangunan gudang baru berkapasitas 1.000 unit dan penambahan atap berkapasitas 2.000 unit",
      "Pembangunan gudang baru berkapasitas 3.000 unit tanpa penambahan atap",
      "Pembangunan gudang baru berkapasitas 2.000 unit dan penambahan atap berkapasitas 1.000 unit",
      "Optimalisasi gudang existing berkapasitas 2.000 unit dan pembangunan gudang baru berkapasitas 1.000 unit",
    ],
    correctIndex: 2,
    explanation: "Kombinasinya adalah pembangunan gudang baru berkapasitas 2.000 unit dan penambahan atap berkapasitas 1.000 unit.",
  },
  {
    id: "q4_6",
    category: "Enigma Sai Bumi",
    question: "Dalam kondisi existing, unit yang telah selesai dibongkar belum dapat diterima dalam sistem karena file invoice dari AHM belum dikirimkan. Improvement yang direncanakan untuk mengatasi permasalahan tersebut adalah ...",
    options: [
      "Implementasi TEDS 2.0 agar unit dapat diterima dalam sistem tanpa menunggu file invoice AHM",
      "Penambahan shift unloading agar invoice diterima lebih cepat",
      "Implementasi Expedio untuk menggantikan seluruh proses penerimaan unit",
      "Penambahan kapasitas gudang agar unit dapat disimpan lebih lama",
    ],
    correctIndex: 0,
    explanation: "Implementasi TEDS 2.0 memungkinkan unit diterima dalam sistem tanpa menunggu file invoice AHM.",
  },
  {
    id: "q4_7",
    category: "Detektif & Logika",
    question: "Suatu AHASS memiliki Achievement Sales In di bawah target, PIC Part belum mengikuti training, dan kapasitas gudang belum optimal. Berdasarkan Performance Measurement Framework, pengelompokan indikator yang tepat adalah ...",
    options: [
      "Seluruh indikator termasuk Lead Measure",
      "Achievement Sales In dan kapasitas gudang termasuk Lag Measure",
      "Status training PIC Part termasuk Lag Measure, sedangkan indikator lainnya termasuk Lead Measure",
      "Achievement Sales In termasuk Lag Measure, sedangkan training PIC Part dan kapasitas gudang termasuk Lead Measure",
    ],
    correctIndex: 3,
    explanation: "Achievement Sales In termasuk Lag Measure, sedangkan training PIC Part dan kapasitas gudang termasuk Lead Measure.",
  },
  {
    id: "q4_8",
    category: "Enigma Sai Bumi",
    question: "Dalam ekosistem teknologi Dashboard Insight H3, pembagian fungsi Power BI, AI Agent, dan Email Notification yang tepat adalah ...",
    options: [
      "Power BI memberikan rekomendasi, AI Agent mengirimkan email, dan Email Notification mengolah data",
      "Power BI mengonsolidasikan data, AI Agent menganalisis dan menentukan rekomendasi, sedangkan Email Notification mendistribusikan hasil analisis",
      "Power BI menentukan jadwal kunjungan, AI Agent menginput transaksi, dan Email Notification melakukan penilaian KPI",
      "Ketiga teknologi hanya digunakan untuk monitoring pencapaian sales",
    ],
    correctIndex: 1,
    explanation: "Power BI mengonsolidasikan data, AI Agent menganalisis dan menentukan rekomendasi, sedangkan Email Notification mendistribusikan hasil analisis.",
  },
  {
    id: "q4_9",
    category: "Strategi Tim",
    question: "Apabila supervisor tidak menyampaikan laporan tindak lanjut atas rekomendasi SPV ALLERT, mekanisme eskalasi yang direncanakan adalah ...",
    options: [
      "Langsung memberikan notifikasi kepada COO",
      "Memberikan notifikasi kepada Manager tanpa eskalasi lanjutan",
      "Memberikan notifikasi kepada GM, kemudian eskalasi kepada COO apabila dalam dua minggu belum ditindaklanjuti",
      "Mengeluarkan AHASS dari daftar prioritas kunjungan",
    ],
    correctIndex: 2,
    explanation: "Eskalasi dilakukan dengan notifikasi kepada GM, lalu kepada COO apabila dalam dua minggu belum ditindaklanjuti.",
  },
  {
    id: "q4_10",
    category: "Strategi Tim",
    question: "Dalam kerangka Integrated SDM Development AHASS Lampung, urutan pengembangan SDM dari hulu hingga sustainability yang benar adalah ...",
    options: [
      "Talent Acquisition – Talent Development – Talent Performance – Talent Management",
      "Talent Development – Talent Acquisition – Talent Management – Talent Performance",
      "Talent Acquisition – Talent Performance – Talent Development – Talent Management",
      "Talent Management – Talent Acquisition – Talent Development – Talent Performance",
    ],
    correctIndex: 0,
    explanation: "Urutan yang benar adalah Talent Acquisition – Talent Development – Talent Performance – Talent Management.",
  },
  {
    id: "q4_11",
    category: "Enigma Sai Bumi",
    question: "Seorang mekanik mendapatkan nilai grading sebesar 85. Berdasarkan klasifikasi Integrated SDM Development AHASS Lampung, mekanik tersebut masuk dalam kategori ...",
    options: ["Platinum", "Silver", "Bronze", "Gold"],
    correctIndex: 3,
    explanation: "Nilai grading sebesar 85 masuk dalam kategori Gold.",
  },
  {
    id: "q4_12",
    category: "Strategi Tim",
    question: "Permasalahan supervisi After Sales saat ini adalah aktivitas perbaikan belum terintegrasi sehingga tindak lanjut belum terstruktur dan terukur. Indikator yang paling tepat untuk mengevaluasi keberhasilan improvement tersebut adalah ...",
    options: [
      "Jumlah dashboard yang berhasil dibuat",
      "Ketepatan penyampaian rekomendasi, realisasi kunjungan, ketepatan laporan, dan deteksi masalah berulang",
      "Jumlah supervisor yang memiliki akses terhadap aplikasi",
      "Jumlah email notifikasi yang dikirimkan setiap bulan",
    ],
    correctIndex: 1,
    explanation: "Indikator evaluasi yang tepat adalah ketepatan penyampaian rekomendasi, realisasi kunjungan, ketepatan laporan, dan deteksi masalah berulang.",
  },
  {
    id: "q4_13",
    category: "Enigma Sai Bumi",
    question: "Tingginya biaya administrasi marketplace menjadi salah satu dasar pemikiran strategi Motolounge 2027. Program yang paling relevan untuk mengatasi permasalahan tersebut sekaligus memperkuat branding adalah ...",
    options: [
      "Pengembangan website resmi Motolounge sebagai kanal e-commerce, katalog produk, serta brand & community hub",
      "Pemindahan gudang sparepart dari Raden Intan ke Sutami",
      "Penambahan aktivitas sunmori dan kontes modifikasi",
      "Redesign shop sign dan penataan ulang display produk",
    ],
    correctIndex: 0,
    explanation: "Pengembangan website resmi Motolounge sebagai kanal e-commerce, katalog produk, serta brand & community hub.",
  },
  {
    id: "q4_14",
    category: "Detektif & Logika",
    question: "Apabila target revenue Motolounge tahun 2027 sebesar Rp46,51 miliar dan target Gross Profit sebesar Rp4,65 miliar, maka persentase Gross Profit terhadap revenue yang ditargetkan adalah sekitar ...",
    options: ["8%", "12%", "10%", "15%"],
    correctIndex: 2,
    explanation: "4,65 / 46,51 ≈ 10%.",
  },
  {
    id: "q4_15",
    category: "Detektif & Logika",
    question: "Kategori Non HGP MKT memiliki kontribusi sebesar 38,88%, Grosir sebesar 18,73%, dan Online sebesar 14,96%. Apabila ketiga kategori tersebut mencapai targetnya, berapa persentase kontribusi gabungan terhadap total target revenue 2027?",
    options: ["68,57%", "72,57%", "76,45%", "82,57%"],
    correctIndex: 1,
    explanation: "38,88% + 18,73% + 14,96% = 72,57%.",
  },
];

export function getQuestionBankForChannel(quizKey: QuizChannelId = "pretest"): RawQuestionItem[] {
  switch (quizKey) {
    case "quiz-1":
      return quiz1QuestionBank;
    case "quiz-2":
      return quiz2QuestionBank;
    case "quiz-3":
      return quiz3QuestionBank;
    case "quiz-4":
      return quiz4QuestionBank;
    case "pretest":
    default:
      return rawQuestionBank;
  }
}

/**
 * Generates a randomized quiz session with shuffled questions and shuffled options.
 * Each invocation returns a distinct randomized order so questions are never identical.
 */
export function generateRandomQuiz(
  questionCount = QUIZ_QUESTION_COUNT,
  quizKey: QuizChannelId = "pretest"
): QuizQuestion[] {
  const bank = getQuestionBankForChannel(quizKey);
  const shuffledRaw = shuffleArray(bank).slice(0, questionCount);

  return shuffledRaw.map((item, index) => {
    // Original correct option text
    const correctText = item.options[item.correctIndex] ?? "";
    
    // Create option objects and shuffle them
    const mappedOptions: QuizOption[] = item.options.map((text, optIdx) => ({
      id: `opt_${item.id}_${optIdx}`,
      text,
    }));

    const shuffledOptions = shuffleArray(mappedOptions);
    const newCorrectOption = shuffledOptions.find((opt) => opt.text === correctText);
    const fallbackOptionId = shuffledOptions[0] ? shuffledOptions[0].id : `opt_${item.id}_0`;

    return {
      id: `${item.id}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      category: item.category,
      storyContext: item.storyContext,
      question: item.question,
      options: shuffledOptions,
      correctOptionId: newCorrectOption?.id ?? fallbackOptionId,
      explanation: item.explanation,
    };
  });
}


/**
 * Strips correctOptionId and explanation so client inspection (DevTools)
 * cannot reveal answers or cheat during active quiz sessions.
 */
export function sanitizeQuestionForClient(q: QuizQuestion): ClientQuizQuestion {
  return {
    id: q.id,
    category: q.category,
    question: q.question,
    options: q.options,
  };
}
