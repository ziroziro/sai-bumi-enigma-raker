import type { Metadata } from "next";
import { AdminRevealStage } from "@/components/admin-reveal-stage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Reveal Stage — Chief Detective | Sai Bumi Enigma",
  description:
    "Halaman Admin untuk memberikan cap kelompok pada 7 kartu karakter dan melakukan animasi Reveal 7 kartu Chief Detective secara serentak dalam satu layar.",
};

export default function AdminRevealPage() {
  return <AdminRevealStage />;
}
