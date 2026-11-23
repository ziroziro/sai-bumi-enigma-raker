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
  { id: "pretest", label: "Mission 1 · Investigasi", shortLabel: "Mission 1", group: "pretest" },
  { id: "quiz-1", label: "Mission 2 · Deduksi & Sandi", shortLabel: "Mission 2", group: "quiz" },
  { id: "quiz-2", label: "Mission 3 · Analitik & Pola", shortLabel: "Mission 3", group: "quiz" },
  { id: "quiz-3", label: "Mission 4 · Wawasan Enigma", shortLabel: "Mission 4", group: "quiz" },
  { id: "quiz-4", label: "Mission 5 · Strategi Final", shortLabel: "Mission 5", group: "quiz" },
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

export const QUIZ_DURATION_SECONDS = 600; // 10 menit
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

  // 2. Fallback based on sequence (3x9 + 1x8 = 35)
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
  { id: "q1_1", category: "Detektif & Logika", question: "Sebuah sandi angka mengikuti pola: 3, 7, 15, 31, 63, ... Angka berikutnya adalah?", options: ["127", "125", "126", "128"], correctIndex: 0, explanation: "Setiap angka dikali 2 lalu ditambah 1 (63×2+1 = 127)." },
  { id: "q1_2", category: "Detektif & Logika", question: "Jika semua Detektif teliti, dan sebagian Pengawas adalah Detektif, maka kesimpulan yang pasti benar adalah...", options: ["Sebagian Pengawas pasti teliti", "Semua Pengawas pasti teliti", "Tidak ada Pengawas yang teliti", "Semua orang teliti adalah Pengawas"], correctIndex: 0, explanation: "Irisan antara Pengawas dan Detektif pasti mewarisi sifat teliti." },
  { id: "q1_3", category: "Enigma Sai Bumi", question: "Pakaian adat kebesaran masyarakat Lampung yang identik dengan mahkota keemasan disebut...", options: ["Siger", "Blangkon", "Tanjak", "Destar"], correctIndex: 0, explanation: "Siger adalah mahkota adat khas Lampung." },
  { id: "q1_4", category: "Detektif & Logika", question: "Jika kata 'ENIGMA' digeser maju 1 huruf menjadi 'FOJHNB', maka kata 'KASUS' menjadi...", options: ["LBTVT", "LBTUT", "KBTVT", "LBTVS"], correctIndex: 0, explanation: "K->L, A->B, S->T, U->V, S->T." },
  { id: "q1_5", category: "Strategi Tim", question: "Saat menemukan dua bukti yang saling bertentangan di lapangan, langkah pertama yang paling tepat adalah...", options: ["Memverifikasi sumber dan kronologi kedua bukti secara objektif", "Langsung membuang bukti yang datang belakangan", "Memilih bukti berdasarkan tebakan mayoritas tanpa cek ulang", "Menghentikan investigasi sementara waktu"], correctIndex: 0, explanation: "Verifikasi sumber dan kronologi memastikan objektivitas." },
  { id: "q1_6", category: "Detektif & Logika", question: "Jam dinding di ruang arsip terlambat 15 menit. Jika jam dinding menunjukkan pukul 14.20, pukul berapakah waktu sebenarnya?", options: ["14.35", "14.05", "14.25", "14.40"], correctIndex: 0, explanation: "Terlambat 15 menit berarti waktu asli lebih maju 15 menit: 14.35." },
  { id: "q1_7", category: "Enigma Sai Bumi", question: "Selat yang memisahkan Pulau Sumatera (Lampung) dengan Pulau Jawa adalah...", options: ["Selat Sunda", "Selat Malaka", "Selat Karimata", "Selat Bangka"], correctIndex: 0, explanation: "Selat Sunda menghubungkan Bakauheni (Lampung) dan Merak (Banten)." },
  { id: "q1_8", category: "Detektif & Logika", question: "A lebih tinggi dari B, C lebih pendek dari B, dan D lebih tinggi dari A. Siapakah yang paling tinggi?", options: ["D", "A", "B", "C"], correctIndex: 0, explanation: "Urutan tinggi: D > A > B > C." },
  { id: "q1_9", category: "Strategi Tim", question: "Fungsi utama pencatatan log bukti secara rapi dalam investigasi tim adalah...", options: ["Memudahkan pelacakan jejak keputusan dan mencegah informasi hilang", "Memperpanjang durasi rapat tim", "Menyembunyikan temuan dari anggota tim sendiri", "Menggantikan peran diskusi tim"], correctIndex: 0, explanation: "Log bukti menjaga transparansi dan akurasi tim." },
  { id: "q1_10", category: "Detektif & Logika", question: "Sebuah kotak berisi 5 kunci emas dan 3 kunci perak. Berapa minimal kunci yang harus diambil tanpa melihat agar PASTI mendapat minimal 1 kunci emas?", options: ["4 kunci", "3 kunci", "5 kunci", "2 kunci"], correctIndex: 0, explanation: "Kasus terburuk mengambil 3 kunci perak dulu, maka kunci ke-4 pasti emas." },
  { id: "q1_11", category: "Enigma Sai Bumi", question: "Pelabuhan penyeberangan utama di ujung selatan Provinsi Lampung adalah...", options: ["Pelabuhan Bakauheni", "Pelabuhan Panjang", "Pelabuhan Merak", "Pelabuhan Teluk Bayur"], correctIndex: 0, explanation: "Bakauheni adalah pelabuhan penyeberangan utama Lampung–Jawa." },
  { id: "q1_12", category: "Detektif & Logika", question: "Jika 4 agen dapat memeriksa 12 berkas dalam 6 menit, berapa berkas yang dapat diperiksa 8 agen dalam waktu 6 menit dengan kecepatan sama?", options: ["24 berkas", "18 berkas", "16 berkas", "36 berkas"], correctIndex: 0, explanation: "Jumlah agen 2x lipat dalam waktu sama menghasilkan 2x lipat berkas (24)." },
  { id: "q1_13", category: "Strategi Tim", question: "Komunikasi efektif antar-departemen (cross-function) dalam proyek bertujuan utama untuk...", options: ["Menyelaraskan target dan mencegah hambatan antar lini operasional", "Membuat laporan terpisah tanpa koordinasi", "Memindahkan tanggung jawab ke tim lain", "Mengurangi kualitas evaluasi"], correctIndex: 0, explanation: "Kolaborasi lintas fungsi menyelaraskan tujuan bisnis." },
  { id: "q1_14", category: "Detektif & Logika", question: "Manakah angka yang TIDAK termasuk dalam pola berikut: 4, 9, 16, 25, 35, 49?", options: ["35", "16", "25", "49"], correctIndex: 0, explanation: "Deret kuadrat sempurna (2², 3², 4², 5², 6²=36, 7²=49). 35 bukan bilangan kuadrat." },
  { id: "q1_15", category: "Enigma Sai Bumi", question: "Bahasa dan aksara tradisional daerah Lampung yang diajarkan secara turun-temurun dikenal sebagai...", options: ["Aksara Lampung (Had Lampung)", "Aksara Lontara", "Aksara Sunda", "Aksara Bali"], correctIndex: 0, explanation: "Had Lampung adalah aksara tradisional masyarakat Lampung." },
];

const quiz2QuestionBank: RawQuestionItem[] = [
  { id: "q2_1", category: "Detektif & Logika", question: "Pola huruf berikut: A, C, F, J, O, ... Huruf selanjutnya adalah?", options: ["U", "T", "V", "S"], correctIndex: 0, explanation: "Loncatan +2, +3, +4, +5, +6 -> O(15)+6 = U(21)." },
  { id: "q2_2", category: "Strategi Tim", question: "Dalam evaluasi kelayakan proyek (Project Feasibility), faktor paling krusial yang harus diperiksa adalah...", options: ["Kesesuaian dengan prioritas bisnis, sumber daya, dan kondisi operasional", "Hanya tampilan slide presentasi", "Panjang dokumen tanpa isi terukur", "Banyaknya istilah asing yang dipakai"], correctIndex: 0, explanation: "Feasibility menilai kesiapan operasional, sumber daya, dan prioritas bisnis." },
  { id: "q2_3", category: "Detektif & Logika", question: "Jika hari ini Rabu, maka 100 hari lagi adalah hari...", options: ["Jumat", "Kamis", "Sabtu", "Minggu"], correctIndex: 0, explanation: "100 mod 7 = 2. Dua hari setelah Rabu adalah Jumat." },
  { id: "q2_4", category: "Enigma Sai Bumi", question: "Salah satu komoditas unggulan perkebunan Provinsi Lampung yang terkenal hingga pasar internasional adalah...", options: ["Kopi Robusta Lampung", "Teh Hijau Lembang", "Cengkeh Ternate", "Sagu Papua"], correctIndex: 0, explanation: "Lampung adalah salah satu produsen kopi Robusta terbesar di Indonesia." },
  { id: "q2_5", category: "Detektif & Logika", question: "Dalam sebuah ruangan terdapat 6 detektif. Jika setiap detektif berjabat tangan tepat satu kali dengan detektif lainnya, berapa total jabat tangan yang terjadi?", options: ["15 jabat tangan", "12 jabat tangan", "30 jabat tangan", "18 jabat tangan"], correctIndex: 0, explanation: "Kombinasi C(6,2) = (6 × 5) / 2 = 15." },
  { id: "q2_6", category: "Strategi Tim", question: "Feedback yang berkualitas tinggi saat sesi diskusi kelompok seharusnya bersifat...", options: ["Spesifik, relevan dengan masalah, konstruktif, dan dapat ditindaklanjuti", "Umum dan mengkritik pribadi tanpa solusi", "Menyimpang dari topik presentasi", "Singkat tanpa alasan jelas"], correctIndex: 0, explanation: "Feedback yang baik fokus pada solusi relevan dan aplikatif." },
  { id: "q2_7", category: "Detektif & Logika", question: "Sebuah peta skala 1 : 50.000 menunjukkan jarak 4 cm antara Pos A dan Pos B. Berapa jarak sebenarnya?", options: ["2 km", "20 km", "0,2 km", "4 km"], correctIndex: 0, explanation: "4 × 50.000 cm = 200.000 cm = 2 km." },
  { id: "q2_8", category: "Enigma Sai Bumi", question: "Tari tradisional penyambutan tamu kehormatan khas Lampung yang menggunakan properti tepak sirih adalah...", options: ["Tari Sigeh Pengunten", "Tari Piring", "Tari Saman", "Tari Kecak"], correctIndex: 0, explanation: "Tari Sigeh Pengunten adalah tarian penyambutan resmi khas Lampung." },
  { id: "q2_9", category: "Detektif & Logika", question: "Jika 3x + 7 = 28, maka nilai dari 2x - 4 adalah...", options: ["10", "14", "8", "12"], correctIndex: 0, explanation: "3x = 21 -> x = 7. Maka 2(7) - 4 = 10." },
  { id: "q2_10", category: "Strategi Tim", question: "Mengapa KPI (Key Performance Indicator) penting dalam perencanaan sebuah project?", options: ["Sebagai tolok ukur objektif keberhasilan dan dampak bisnis proyek", "Sebagai hiasan judul dokumen", "Untuk memperlambat pengambilan keputusan", "Agar proyek tidak perlu dievaluasi"], correctIndex: 0, explanation: "KPI mengukur capaian dan dampak nyata proyek." },
  { id: "q2_11", category: "Detektif & Logika", question: "Sebuah tim menyelesaikan 40% misi dalam 12 menit. Jika kecepatan konstan, berapa total waktu untuk menyelesaikan 100% misi?", options: ["30 menit", "24 menit", "36 menit", "28 menit"], correctIndex: 0, explanation: "12 / 0,4 = 30 menit." },
  { id: "q2_12", category: "Enigma Sai Bumi", question: "Pahlawan nasional asal Lampung yang memimpin perlawanan rakyat melawan penjajah Belanda pada abad ke-19 adalah...", options: ["Radin Inten II", "Tuanku Imam Bonjol", "Pangeran Antasari", "Sultan Hasanuddin"], correctIndex: 0, explanation: "Radin Inten II adalah pahlawan nasional kebanggaan Provinsi Lampung." },
  { id: "q2_13", category: "Detektif & Logika", question: "Manakah pecahan yang nilainya paling besar?", options: ["7/8", "5/6", "3/4", "4/5"], correctIndex: 0, explanation: "7/8 = 0,875 lebih besar dari 5/6 (0,833), 4/5 (0,8), dan 3/4 (0,75)." },
  { id: "q2_14", category: "Strategi Tim", question: "Saat waktu presentasi terbatas, cara terbaik menyampaikan ide utama adalah...", options: ["Terstruktur: langsung ke inti masalah, solusi utama, dan dampak terukur", "Membaca seluruh teks panjang dari awal sampai akhir", "Berbicara acak tanpa urutan poin", "Menghindari pertanyaan audiens"], correctIndex: 0, explanation: "Penyampaian terstruktur membuat audiens cepat menangkap inti solusi." },
  { id: "q2_15", category: "Detektif & Logika", question: "Jika semua berkas merah berisi kode rahasia, dan Berkas X tidak berisi kode rahasia, maka...", options: ["Berkas X bukan berkas merah", "Berkas X adalah berkas merah", "Sebagian berkas merah tidak berkode", "Berkas X berwarna biru"], correctIndex: 0, explanation: "Modus tollens: jika P -> Q dan ~Q, maka ~P." },
];

const quiz3QuestionBank: RawQuestionItem[] = [
  { id: "q3_1", category: "Enigma Sai Bumi", question: "Destinasi wisata bahari terkenal di Pesawaran Lampung yang populer untuk snorkeling dan air laut jernih adalah...", options: ["Pulau Pahawang", "Pulau Derawan", "Pulau Bunaken", "Pulau Weh"], correctIndex: 0, explanation: "Pulau Pahawang di Pesawaran adalah ikon wisata bahari Lampung." },
  { id: "q3_2", category: "Detektif & Logika", question: "Deret angka: 80, 40, 44, 22, 26, 13, ... Angka selanjutnya adalah?", options: ["17", "15", "9", "26"], correctIndex: 0, explanation: "Polanya bergantian dibagi 2 lalu ditambah 4: 13 + 4 = 17." },
  { id: "q3_3", category: "Strategi Tim", question: "Apa risiko terbesar jika sebuah proyek dirancang tanpa melibatkan departemen terkait (non cross-function)?", options: ["Munculnya bottleneck operasional dan miskomunikasi saat implementasi", "Proyek selesai lebih cepat tanpa kendala", "Biaya otomatis menjadi nol", "Semua departemen langsung setuju"], correctIndex: 0, explanation: "Kurangnya koordinasi lintas fungsi memicu hambatan eksekusi." },
  { id: "q3_4", category: "Detektif & Logika", question: "Seorang agen berjalan 6 meter ke utara lalu 8 meter ke timur. Berapa jarak lurus terdekat dari titik awal ke titik akhir?", options: ["10 meter", "14 meter", "12 meter", "9 meter"], correctIndex: 0, explanation: "Teorema Pythagoras: √(6² + 8²) = √100 = 10 meter." },
  { id: "q3_5", category: "Enigma Sai Bumi", question: "Kuliner olahan ikan khas Lampung berkuah kuning asam-pedas segar yang sangat digemari adalah...", options: ["Pindang Patin / Pindang Baung", "Rawon", "Coto Makassar", "Gudeg"], correctIndex: 0, explanation: "Pindang khas Lampung berkuah segar asam pedas." },
  { id: "q3_6", category: "Detektif & Logika", question: "Sebuah kata dibalik menjadi 'AMGINE'. Kata aslinya adalah...", options: ["ENIGMA", "MAGINE", "GIMANE", "ENIMGA"], correctIndex: 0, explanation: "AMGINE dibaca terbalik adalah ENIGMA." },
  { id: "q3_7", category: "Strategi Tim", question: "Ketika terjadi konflik pendapat dalam FGD (Focus Group Discussion), peran ketua tim yang paling ideal adalah...", options: ["Memfasilitasi diskusi berbasis data dan mengarahkan ke konsensus terbaik", "Memaksa pendapat pribadi tanpa mendengar anggota", "Membiarkan perdebatan tidak selesai sampai waktu habis", "Menghindari pengambilan keputusan"], correctIndex: 0, explanation: "Ketua tim menjaga fokus diskusi tetap produktif dan berbasis data." },
  { id: "q3_8", category: "Detektif & Logika", question: "Dari 20 peserta, 12 menyukai teka-teki logika, 10 menyukai analisis data, dan 4 menyukai keduanya. Berapa yang tidak menyukai keduanya?", options: ["2 orang", "4 orang", "6 orang", "0 orang"], correctIndex: 0, explanation: "12 + 10 - 4 = 18. Sisanya 20 - 18 = 2 orang." },
  { id: "q3_9", category: "Enigma Sai Bumi", question: "Nama bandara internasional utama yang melayani Provinsi Lampung adalah...", options: ["Bandara Radin Inten II", "Bandara Sultan Mahmud Badaruddin II", "Bandara Minangkabau", "Bandara Kualanamu"], correctIndex: 0, explanation: "Bandara Radin Inten II terletak di Lampung Selatan." },
  { id: "q3_10", category: "Detektif & Logika", question: "Jika 15% dari suatu angka adalah 45, berapakah angka tersebut?", options: ["300", "250", "350", "450"], correctIndex: 0, explanation: "45 / 0,15 = 300." },
  { id: "q3_11", category: "Strategi Tim", question: "Indikator utama bahwa sebuah solusi layak dijalankan (feasible) adalah...", options: ["Realistis secara biaya, waktu, SDM, dan berdampak positif ke target", "Membutuhkan anggaran tak terbatas", "Tidak memiliki jadwal implementasi", "Hanya menguntungkan satu individu"], correctIndex: 0, explanation: "Kelayakan menimbang keseimbangan sumber daya dan dampak." },
  { id: "q3_12", category: "Detektif & Logika", question: "Sebuah brankas hanya terbuka dengan bilangan prima antara 40 dan 45. Angka berapakah itu?", options: ["41 dan 43", "42 dan 44", "41 dan 45", "43 dan 45"], correctIndex: 0, explanation: "Bilangan prima di antara 40–45 adalah 41 dan 43." },
  { id: "q3_13", category: "Enigma Sai Bumi", question: "Rumah adat tradisional masyarakat Lampung yang berbentuk rumah panggung kayu disebut...", options: ["Nuwo Sesat", "Rumah Gadang", "Joglo", "Tongkonan"], correctIndex: 0, explanation: "Nuwo Sesat adalah balai/rumah adat tradisional Lampung." },
  { id: "q3_14", category: "Detektif & Logika", question: "Jika 5 mesin mencetak 5 lencana dalam 5 menit, berapa menit waktu yang dibutuhkan 100 mesin untuk mencetak 100 lencana?", options: ["5 menit", "100 menit", "20 menit", "1 menit"], correctIndex: 0, explanation: "Tiap 1 mesin butuh 5 menit untuk 1 lencana, jadi 100 mesin bekerja bersamaan tetap 5 menit." },
  { id: "q3_15", category: "Strategi Tim", question: "Mengapa sesi retrospektif/evaluasi setelah misi selesai sangat bermanfaat?", options: ["Mengidentifikasi keberhasilan dan perbaikan nyata untuk sesi berikutnya", "Mencari siapa yang paling bersalah", "Menghapus seluruh catatan kerja tim", "Menunda sesi berikutnya"], correctIndex: 0, explanation: "Evaluasi mendorong perbaikan berkelanjutan (continuous improvement)." },
];

const quiz4QuestionBank: RawQuestionItem[] = [
  { id: "q4_1", category: "Strategi Tim", question: "Dalam tahap akhir penyelesaian kasus, keputusan terbaik tim harus didasarkan pada...", options: ["Sintesis seluruh bukti terverifikasi dan dampak strategisnya", "Asumsi awal tanpa pembaruan data", "Suara paling keras di ruangan", "Keberuntungan semata"], correctIndex: 0, explanation: "Keputusan strategis lahir dari bukti yang telah diverifikasi." },
  { id: "q4_2", category: "Detektif & Logika", question: "Pola bilangan Fibonacci: 1, 1, 2, 3, 5, 8, 13, 21, ... Dua angka berikutnya adalah?", options: ["34 dan 55", "32 dan 53", "34 dan 54", "35 dan 56"], correctIndex: 0, explanation: "13+21=34, lalu 21+34=55." },
  { id: "q4_3", category: "Enigma Sai Bumi", question: "Alat musik tradisional pukul khas Lampung yang terbuat dari kuningan/perunggu dan dimainkan berkelompok disebut...", options: ["Talo Balak", "Angklung", "Sasando", "Kolintang"], correctIndex: 0, explanation: "Talo Balak adalah instrumen musik tradisional khas Lampung." },
  { id: "q4_4", category: "Detektif & Logika", question: "Rata-rata nilai 4 sesi sebuah tim adalah 85. Jika pada sesi ke-5 tim meraih nilai 95, berapakah rata-rata barunya?", options: ["87", "88", "86", "90"], correctIndex: 0, explanation: "(4×85 + 95) / 5 = (340 + 95) / 5 = 435 / 5 = 87." },
  { id: "q4_5", category: "Strategi Tim", question: "Ciri delivery feedback yang profesional saat Raker adalah...", options: ["Jelas, sistematis, santun, dan mudah dipahami presenter", "Berbelit-belit tanpa struktur", "Menggunakan nada merendahkan", "Tidak memberi poin masukan yang konkret"], correctIndex: 0, explanation: "Delivery yang baik mempercepat penerimaan masukan oleh presenter." },
  { id: "q4_6", category: "Detektif & Logika", question: "Jika kode 1=A, 2=B, ..., 26=Z, maka deret 20-9-13 membentuk kata...", options: ["TIM", "TIN", "SIM", "TOM"], correctIndex: 0, explanation: "20=T, 9=I, 13=M -> TIM." },
  { id: "q4_7", category: "Enigma Sai Bumi", question: "Gunung tertinggi yang berada di daratan Provinsi Lampung (Lampung Barat) adalah...", options: ["Gunung Pesagi", "Gunung Tanggamus", "Gunung Rajabasa", "Gunung Betung"], correctIndex: 0, explanation: "Gunung Pesagi (±2.262 mdpl) adalah puncak tertinggi di Lampung." },
  { id: "q4_8", category: "Detektif & Logika", question: "Sebuah tim memiliki 9 anggota. Jika 1/3 bertugas analisis data dan sisanya investigasi lapangan, berapa orang di investigasi lapangan?", options: ["6 orang", "3 orang", "5 orang", "7 orang"], correctIndex: 0, explanation: "1/3 × 9 = 3 analisis, sisanya 9 - 3 = 6 orang." },
  { id: "q4_9", category: "Strategi Tim", question: "Dalam menghadapi perubahan mendadak di tengah misi (misal kartu sabotase), sikap tim yang paling tangguh adalah...", options: ["Tetap tenang, cepat beradaptasi, dan jalankan rencana cadangan (Plan B)", "Panik dan saling menyalahkan", "Menyerah sebelum sesi selesai", "Mengabaikan perubahan aturan"], correctIndex: 0, explanation: "Adaptabilitas dan rencana cadangan menjaga performa tim di bawah tekanan." },
  { id: "q4_10", category: "Detektif & Logika", question: "Sebuah sandi digital terdiri dari 3 digit berbeda yang dibentuk dari angka 1, 2, 3. Berapa banyak kombinasi berbeda yang mungkin dibuat?", options: ["6 kombinasi", "9 kombinasi", "3 kombinasi", "12 kombinasi"], correctIndex: 0, explanation: "Permutasi 3! = 3 × 2 × 1 = 6 kombinasi." },
  { id: "q4_11", category: "Enigma Sai Bumi", question: "Danau vulkanik indah yang berada di perbatasan Lampung Barat dan Sumatera Selatan adalah...", options: ["Danau Ranau", "Danau Toba", "Danau Singkarak", "Danau Maninjau"], correctIndex: 0, explanation: "Danau Ranau terletak di perbatasan Lampung Barat dan OKU Selatan." },
  { id: "q4_12", category: "Detektif & Logika", question: "Jika sebuah skor proyek memiliki bobot 30% untuk nilai 80, berapa kontribusi poin dari aspek tersebut?", options: ["24", "26", "20", "30"], correctIndex: 0, explanation: "30% × 80 = 24." },
  { id: "q4_13", category: "Strategi Tim", question: "Sinergi antar anggota tim terjadi secara optimal ketika...", options: ["Setiap peran saling melengkapi untuk mencapai target bersama", "Semua orang mengerjakan hal identik tanpa koordinasi", "Informasi penting disimpan sendiri", "Target pribadi didahulukan di atas target tim"], correctIndex: 0, explanation: "Sinergi memadukan kekuatan berbeda menuju satu tujuan." },
  { id: "q4_14", category: "Detektif & Logika", question: "Jika P bernilai benar dan Q bernilai salah, maka pernyataan 'P DAN Q' bernilai...", options: ["Salah", "Benar", "Tidak dapat ditentukan", "Setengah benar"], correctIndex: 0, explanation: "Konjungsi (DAN) hanya bernilai benar jika kedua pernyataan benar." },
  { id: "q4_15", category: "Enigma Sai Bumi", question: "Makna utama semangat kolaborasi dalam 'The Sai Bumi Enigma' adalah...", options: ["Setiap petunjuk membuka peluang dan setiap anggota membawa kekuatan bagi tim", "Kompetisi individu tanpa kerja sama tim", "Menyelesaikan misi tanpa komunikasi", "Mengutamakan kecepatan tanpa ketepatan"], correctIndex: 0, explanation: "Sesuai filosofi The Sai Bumi Enigma: setiap anggota membawa kekuatan untuk tim." },
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
