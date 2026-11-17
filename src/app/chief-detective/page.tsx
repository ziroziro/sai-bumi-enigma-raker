import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { DeptHeadApp } from "@/components/dept-head-app";
import { buildLockedDeptHeadView, buildPublicDeptHeadSnapshot } from "@/domain/dept-head";
import { getDeptHeadGroupFromCookies } from "@/server/dept-head-auth";
import { getDeptHeadSnapshot } from "@/server/dept-head-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pemilihan Chief Detective | Sai Bumi Enigma",
  description:
    "Masuk dengan akun kelompok untuk mengamati 7 karakter dan menentukan Chief Detective di The Sai Bumi Enigma.",
};

export default async function ChiefDetectivePage() {
  const authenticatedGroup = await getDeptHeadGroupFromCookies();
  const fullSnapshot = authenticatedGroup ? await getDeptHeadSnapshot() : null;
  const initialLockedView =
    fullSnapshot && authenticatedGroup
      ? buildLockedDeptHeadView(fullSnapshot, authenticatedGroup)
      : null;
  const initialSnapshot =
    fullSnapshot && authenticatedGroup && !initialLockedView
      ? buildPublicDeptHeadSnapshot(fullSnapshot, authenticatedGroup)
      : null;

  return (
    <>
      <a href="#main" className="skip-link">
        Langsung ke halaman pemilihan Chief Detective
      </a>
      <SiteHeader activeNav="chief-detective" />
      <main id="main">
        <DeptHeadApp
          initialSnapshot={initialSnapshot}
          initialLockedView={initialLockedView}
        />
      </main>
      <footer className="site-footer">
        <div className="tapis-line" aria-hidden="true" />
        <p>The Sai Bumi Enigma · Lampung · 2026</p>
      </footer>
    </>
  );
}
