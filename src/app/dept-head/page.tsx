import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { DeptHeadApp } from "@/components/dept-head-app";
import { getDeptHeadGroupFromCookies } from "@/server/dept-head-auth";
import { getPublicDeptHeadSnapshot } from "@/server/dept-head-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pemilihan Dept Head | Sai Bumi Enigma",
  description:
    "Masuk dengan akun kelompok untuk mengamati 9 karakter dan menentukan Department Head di The Sai Bumi Enigma.",
};

export default async function DeptHeadPage() {
  const authenticatedGroup = await getDeptHeadGroupFromCookies();
  const initialSnapshot = authenticatedGroup
    ? await getPublicDeptHeadSnapshot(authenticatedGroup)
    : null;

  return (
    <>
      <a href="#main" className="skip-link">
        Langsung ke halaman pemilihan Dept Head
      </a>
      <SiteHeader activeNav="dept-head" />
      <main id="main">
        <DeptHeadApp initialSnapshot={initialSnapshot} />
      </main>
      <footer className="site-footer">
        <div className="tapis-line" aria-hidden="true" />
        <p>The Sai Bumi Enigma · Rapat Kerja Regional 1 · 2027</p>
      </footer>
    </>
  );
}
