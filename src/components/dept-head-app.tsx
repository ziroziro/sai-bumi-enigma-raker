"use client";

import { Icon } from "@/components/icon";
import { SilhouetteArt } from "@/components/silhouette-art";
import type { SilhouetteVariant } from "@/domain/dept-head";

export interface PublicSilhouetteCard {
  id: number;
  code: string;
  title: string;
  roleHint: string;
  description: string;
  power?: number;
  defense?: number;
  silhouetteVariant: SilhouetteVariant;
  customImageUrl?: string | null;
}

interface DeptHeadAppProps {
  cards: PublicSilhouetteCard[];
}

export function DeptHeadApp({ cards }: DeptHeadAppProps) {
  return (
    <div className="page-shell dept-head-shell">
      <section className="panel dept-head-hero">
        <div className="dept-head-hero-head">
          <div>
            <span className="eyebrow">
              <Icon name="shield" size={14} /> PROFIL 7 KARAKTER · READ-ONLY
            </span>
            <h1 className="dept-head-title">Karakter Chief Detective</h1>
            <p className="dept-head-subtitle">
              Amati 7 kartu siluet karakter misterius Chief Detective beserta peran dan statistiknya.
              Halaman ini hanya menampilkan profil siluet (<em>read-only</em>); pemilihan kartu untuk
              setiap kelompok dan proses <em>reveal</em> identitas asli akan dilakukan langsung oleh
              Admin.
            </p>
          </div>
        </div>
      </section>

      <section className="panel dept-head-step-panel">
        <div className="dept-step-header">
          <span className="step-pill">7 SILUET MISTERI</span>
          <div className="dept-step-title-wrap">
            <h2 className="dept-step-heading">Daftar 7 Kartu Karakter Chief Detective</h2>
            <p className="section-caption">
              Identitas asli ketujuh karakter masih dirahasiakan hingga sesi <strong>Reveal</strong>{" "}
              dibuka oleh Admin.
            </p>
          </div>
        </div>

        <div className="silhouette-grid">
          {cards.map((card) => (
            <article key={card.id} className="silhouette-card is-readonly">
              <div className="tcg-card-topbar">
                <h3 className="tcg-card-name">{card.title}</h3>
                <span className="silhouette-status-pill is-available">
                  <Icon name="lock" size={12} /> Classified
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
                alt={`${card.code} - ${card.title}`}
                badgeLabel="CLASSIFIED"
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
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
