import Link from "next/link";
import { event } from "@/config/event";
import { Icon } from "./icon";

export function SiteHeader({
  activeNav,
}: {
  activeNav?:
    | "mission"
    | "mission-1"
    | "mission-2-5"
    | "pretest"
    | "quiz"
    | "pendaftaran"
    | "absensi"
    | "chief-detective"
    | "stage"
    | "leaderboard";
}) {
  const isMissionActive =
    activeNav === "mission" ||
    activeNav === "mission-1" ||
    activeNav === "mission-2-5" ||
    activeNav === "pretest" ||
    activeNav === "quiz";

  return (
    <header className="site-header">
      <Link href="/mission" className="brand" aria-label={`${event.name}, menu utama`}>
        <span className="brand-mark" aria-hidden="true">
          <Icon name="compass" size={25} />
        </span>
        <span>
          SAI BUMI <strong>ENIGMA</strong>
        </span>
      </Link>
      <nav aria-label="Navigasi utama" className="header-nav">
        <Link
          href="/mission"
          className={`nav-link ${isMissionActive ? "is-active" : ""}`}
        >
          Mission
        </Link>
        <Link
          href="/stage"
          className={`nav-link ${activeNav === "stage" ? "is-active" : ""}`}
        >
          Misi Investigasi
        </Link>
        <Link
          href="/leaderboard"
          className={`nav-link ${activeNav === "leaderboard" ? "is-active" : ""}`}
        >
          Leaderboard
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
