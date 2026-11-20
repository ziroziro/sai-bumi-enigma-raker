"use client";

import { Icon } from "@/components/icon";
import { SilhouetteArt } from "@/components/silhouette-art";
import type { DeptHeadCard, DeptHeadClaimOwner } from "@/domain/dept-head";

const GROUP_STAMP_THEMES: Record<
  number,
  { shortName: string; teamLabel: string; accentClass: string }
> = {
  3: { shortName: "CONAN", teamLabel: "Team Conan", accentClass: "is-group-3" },
  2: { shortName: "JUBUN", teamLabel: "Team Detective Jubun", accentClass: "is-group-2" },
  4: { shortName: "HOLMES", teamLabel: "Team Holmes", accentClass: "is-group-4" },
  1: { shortName: "LUPIN", teamLabel: "Team Lupin", accentClass: "is-group-1" },
};

interface DeptHeadAppProps {
  cards: DeptHeadCard[];
  takenCardIds?: Record<number, DeptHeadClaimOwner>;
}

export function DeptHeadApp({ cards, takenCardIds = {} }: DeptHeadAppProps) {
  const topRowCards = cards.slice(0, 4);
  const bottomRowCards = cards.slice(4, 7);

  const renderRevealedCard = (card: DeptHeadCard) => {
    const owner = takenCardIds[card.id] ?? null;
    const ownerTheme = owner ? GROUP_STAMP_THEMES[owner.groupNumber] : null;
    const revealImgSrc =
      card.revealImageUrl || `/images/karakter/karakter-${card.id}-reveal.jpg`;

    return (
      <div
        key={card.id}
        className={`stage-card-scene is-public-revealed ${
          owner ? `is-stamped ${ownerTheme?.accentClass ?? ""}` : ""
        }`}
      >
        <div className="stage-card-inner">
          <div className="stage-card-face silhouette-card is-revealed-card is-readonly">
            <span className="tcg-holo-shimmer" aria-hidden="true" />
            <div className="tcg-card-topbar is-revealed-topbar stage-topbar">
              <h3 className="tcg-card-name stage-card-title">{card.title}</h3>
              {owner && ownerTheme ? (
                <span className={`stage-group-pill is-revealed-owner ${ownerTheme.accentClass}`}>
                  KEL. {owner.groupNumber} · {ownerTheme.shortName}
                </span>
              ) : (
                <span className="silhouette-status-pill is-revealed-pill stage-mini-pill">
                  <Icon name="check" size={11} /> REVEALED
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
    <div className="reveal-stage-viewport is-all-revealed is-public-chief-viewport">
      <div className="reveal-stage-arena">
        <div className="reveal-cards-seven-layout">
          <div className="reveal-cards-row is-row-top">
            {topRowCards.map(renderRevealedCard)}
          </div>
          <div className="reveal-cards-row is-row-bottom">
            {bottomRowCards.map(renderRevealedCard)}
          </div>
        </div>
      </div>
    </div>
  );
}
