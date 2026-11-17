import type { SilhouetteVariant } from "@/domain/dept-head";

interface SilhouetteArtProps {
  variant: SilhouetteVariant;
  customImageUrl?: string | null;
  alt: string;
  compact?: boolean;
  revealed?: boolean;
  badgeLabel?: string;
}

export function SilhouetteArt({
  variant,
  customImageUrl,
  alt,
  compact = false,
  revealed = false,
  badgeLabel,
}: SilhouetteArtProps) {
  if (customImageUrl && customImageUrl.trim().length > 0) {
    return (
      <div
        className={`silhouette-art-frame ${compact ? "is-compact" : ""} ${
          revealed ? "is-revealed-art" : ""
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={customImageUrl}
          alt={alt}
          className={`silhouette-custom-img ${revealed ? "is-revealed-img" : ""}`}
        />
        <span className="silhouette-vignette" aria-hidden="true" />
        {badgeLabel && (
          <span className={`silhouette-mystery-badge ${revealed ? "is-revealed-badge" : ""}`}>
            {badgeLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`silhouette-art-frame ${compact ? "is-compact" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 180 190" className="silhouette-svg" role="img" aria-label={alt}>
        <defs>
          <radialGradient id={`halo-${variant}`} cx="50%" cy="38%" r="54%">
            <stop offset="0%" stopColor="rgba(215, 164, 66, 0.34)" />
            <stop offset="55%" stopColor="rgba(112, 13, 22, 0.22)" />
            <stop offset="100%" stopColor="rgba(16, 15, 18, 0.0)" />
          </radialGradient>
          <linearGradient id={`body-${variant}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#120f11" />
            <stop offset="100%" stopColor="#070607" />
          </linearGradient>
        </defs>

        <circle cx="90" cy="78" r="70" fill={`url(#halo-${variant})`} />
        <circle cx="90" cy="78" r="54" fill="none" stroke="rgba(215, 164, 66, 0.25)" strokeDasharray="3 5" />

        {variant === "fedora" && (
          <g>
            {/* Classic detective fedora + raised collar */}
            <path d="M58 58 Q90 36 122 58 L114 66 L66 66 Z" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.45" strokeWidth="1.2" />
            <ellipse cx="90" cy="65" rx="46" ry="7.5" fill="#0d0b0d" stroke="#d7a442" strokeOpacity="0.55" strokeWidth="1.2" />
            <path d="M68 68 C66 86 73 102 90 104 C107 102 114 86 112 68 Z" fill={`url(#body-${variant})`} />
            <path d="M40 178 C42 135 58 110 74 106 L90 128 L106 106 C122 110 138 135 140 178 Z" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.35" strokeWidth="1.2" />
            <path d="M64 108 L79 136 L90 128 L101 136 L116 108" fill="none" stroke="#d7a442" strokeOpacity="0.55" strokeWidth="1.4" />
          </g>
        )}

        {variant === "trench" && (
          <g>
            {/* Forward leaning investigator in sharp trench coat */}
            <circle cx="90" cy="58" r="21" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.45" strokeWidth="1.2" />
            <path d="M72 48 Q92 34 111 50" fill="none" stroke="#d7a442" strokeOpacity="0.45" strokeWidth="1.4" />
            <path d="M34 178 L46 116 C54 104 72 100 90 102 C108 100 126 104 134 116 L146 178 Z" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.4" strokeWidth="1.2" />
            <path d="M72 98 L66 130 L90 120 L114 130 L108 98" fill="#171214" stroke="#d7a442" strokeOpacity="0.5" strokeWidth="1.2" />
            <line x1="90" y1="120" x2="90" y2="176" stroke="#d7a442" strokeOpacity="0.35" strokeWidth="1.2" />
          </g>
        )}

        {variant === "monocle" && (
          <g>
            {/* Detail observer silhouette + glowing golden monocle glint */}
            <path d="M68 56 C68 38 112 38 112 56 L110 82 C106 96 74 96 70 82 Z" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.45" strokeWidth="1.2" />
            <path d="M40 178 C43 130 61 106 90 106 C119 106 137 130 140 178 Z" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.38" strokeWidth="1.2" />
            <circle cx="101" cy="64" r="8" fill="rgba(215,164,66,0.16)" stroke="#f0c76e" strokeWidth="1.6" />
            <path d="M106 71 Q112 96 106 122" fill="none" stroke="#d7a442" strokeOpacity="0.65" strokeWidth="1" strokeDasharray="2 2" />
          </g>
        )}

        {variant === "cloak" && (
          <g>
            {/* High-collar cloak & diplomatic poise */}
            <circle cx="90" cy="57" r="20" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.45" strokeWidth="1.2" />
            <path d="M52 104 L68 82 L90 108 L112 82 L128 104 L144 178 L36 178 Z" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.45" strokeWidth="1.2" />
            <path d="M76 116 Q90 132 104 116" fill="none" stroke="#d7a442" strokeOpacity="0.6" strokeWidth="1.4" />
            <circle cx="90" cy="126" r="3.5" fill="#d7a442" fillOpacity="0.8" />
          </g>
        )}

        {variant === "architect" && (
          <g>
            {/* Structured shoulders + geometric compass badge */}
            <rect x="72" y="38" width="36" height="48" rx="18" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.45" strokeWidth="1.2" />
            <path d="M36 178 L46 116 L76 102 L90 120 L104 102 L134 116 L144 178 Z" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.4" strokeWidth="1.2" />
            <polygon points="90,126 102,146 78,146" fill="none" stroke="#d7a442" strokeOpacity="0.65" strokeWidth="1.3" />
            <circle cx="90" cy="138" r="2.5" fill="#d7a442" />
          </g>
        )}

        {variant === "strategist" && (
          <g>
            {/* Side-profile silhouette holding chess/tactical posture */}
            <path d="M74 42 C96 36 114 48 114 68 C114 82 104 94 90 96 C75 96 68 84 68 68 C68 54 70 44 74 42 Z" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.45" strokeWidth="1.2" />
            <path d="M38 178 C42 128 60 104 90 104 C120 104 138 128 142 178 Z" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.38" strokeWidth="1.2" />
            <path d="M62 152 L90 132 L118 152" fill="none" stroke="#d7a442" strokeOpacity="0.55" strokeWidth="1.4" />
            <circle cx="90" cy="132" r="3" fill="#d7a442" />
          </g>
        )}

        {variant === "sentinel" && (
          <g>
            {/* Broad structured guardian silhouette + shield crest */}
            <circle cx="90" cy="56" r="20" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.48" strokeWidth="1.2" />
            <path d="M32 178 L42 114 C56 102 74 98 90 98 C106 98 124 102 138 114 L148 178 Z" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.45" strokeWidth="1.2" />
            <path d="M76 122 L104 122 L102 146 L90 156 L78 146 Z" fill="rgba(112, 13, 22, 0.45)" stroke="#d7a442" strokeOpacity="0.7" strokeWidth="1.3" />
          </g>
        )}

        {variant === "scholar" && (
          <g>
            {/* Hooded / cipher-breaker silhouette + twin eye glint */}
            <path d="M58 84 C56 44 74 30 90 30 C106 30 124 44 122 84 L112 96 L68 96 Z" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.48" strokeWidth="1.2" />
            <path d="M38 178 C44 128 60 104 90 104 C120 104 136 128 142 178 Z" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.38" strokeWidth="1.2" />
            <line x1="78" y1="64" x2="85" y2="64" stroke="#f0c76e" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="95" y1="64" x2="102" y2="64" stroke="#f0c76e" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="90" cy="134" r="9" fill="none" stroke="#d7a442" strokeOpacity="0.55" strokeWidth="1.2" />
          </g>
        )}

        {variant === "enigma" && (
          <g>
            {/* Sovereign silhouette with emblem crown crest */}
            <polygon points="72,42 81,30 90,40 99,30 108,42" fill="none" stroke="#d7a442" strokeOpacity="0.75" strokeWidth="1.5" />
            <circle cx="90" cy="60" r="20" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.5" strokeWidth="1.2" />
            <path d="M34 178 L46 112 L74 100 L90 126 L106 100 L134 112 L146 178 Z" fill={`url(#body-${variant})`} stroke="#d7a442" strokeOpacity="0.45" strokeWidth="1.2" />
            <path d="M90 128 L96 140 L90 152 L84 140 Z" fill="#d7a442" fillOpacity="0.85" />
          </g>
        )}
      </svg>
      <span className="silhouette-mystery-badge">CLASSIFIED</span>
    </div>
  );
}
