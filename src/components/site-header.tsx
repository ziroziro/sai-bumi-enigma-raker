import Link from "next/link";
import { event } from "@/config/event";
import { Icon } from "./icon";

export function SiteHeader({
  activeNav,
}: {
  activeNav?: "quiz" | "pendaftaran" | "absensi" | "chief-detective" | "stage";
}) {
  return (
    <header className="site-header">
      <Link href="/quiz" className="brand" aria-label={`${event.name}, menu utama`}>
        <span className="brand-mark" aria-hidden="true">
          <Icon name="compass" size={25} />
        </span>
        <span>
          SAI BUMI <strong>ENIGMA</strong>
        </span>
      </Link>
      <nav aria-label="Navigasi utama" className="header-nav">
        <Link
          href="/absensi"
          className={`nav-link ${activeNav === "absensi" ? "is-active" : ""}`}
        >
          Absensi Agent
        </Link>
        <Link
          href="/quiz"
          className={`nav-link ${activeNav === "quiz" ? "is-active" : ""}`}
        >
          Quiz Investigasi
        </Link>
        <Link
          href="/stage"
          className={`nav-link ${activeNav === "stage" ? "is-active" : ""}`}
        >
          Stage &amp; Leaderboard
        </Link>
        <Link
          href="/chief-detective"
          className={`nav-link ${activeNav === "chief-detective" ? "is-active" : ""}`}
        >
          Chief Detective
        </Link>
      </nav>
      <span className="header-year">
        LAMPUNG <span aria-hidden="true">/</span> 2026
      </span>
    </header>
  );
}
