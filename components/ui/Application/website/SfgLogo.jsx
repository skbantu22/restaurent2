// Shawon Food Gate brand mark — vector recreation of the flyer logo
// (red swoosh ring, gold "SFG", döner spit with flame) plus wordmark.
// Pure SVG so it stays sharp at any size and needs no image request.

export function SfgEmblem({ className = "h-12 w-12" }) {
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="sfg-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE27A" />
          <stop offset="1" stopColor="#F2B705" />
        </linearGradient>
        <linearGradient id="sfg-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#E1262D" />
          <stop offset="1" stopColor="#F7C318" />
        </linearGradient>
      </defs>
      {/* swoosh ring */}
      <path
        d="M58 22A28 28 0 1 0 60 48"
        fill="none"
        stroke="#E1262D"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <path
        d="M14 52A28 28 0 0 0 52 62"
        fill="none"
        stroke="#F7C318"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* döner spit */}
      <rect x="51.5" y="6" width="3" height="58" rx="1.5" fill="url(#sfg-gold)" />
      <path
        d="M45 15h15l-1.8 7H46.8zM44.5 23.5h16l-1.8 7.5H46.3zM45.5 32.5h14l-1.8 7H47.3zM47 41h11l-1.8 6h-7.4z"
        fill="#E1262D"
        stroke="#B51A20"
        strokeWidth=".6"
      />
      <path
        d="M61 58c4-4 3-9 .5-12.5 4.5 2.5 7.5 8 4 13-1.2 1.8-3.4 2.8-4.5-.5z"
        fill="url(#sfg-flame)"
      />
      {/* SFG letters */}
      <text
        x="6"
        y="44"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="900"
        fontSize="19"
        fill="url(#sfg-gold)"
        stroke="#9E141A"
        strokeWidth="1"
        paintOrder="stroke"
        letterSpacing="-0.5"
      >
        SFG
      </text>
    </svg>
  );
}

export default function SfgLogo({ className = "", compact = false }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <SfgEmblem className={compact ? "h-11 w-11" : "h-12 w-12 lg:h-14 lg:w-14"} />
      <span className="flex flex-col whitespace-nowrap leading-none">
        <span className="font-display text-[11px] lg:text-xs font-black tracking-[0.32em] text-[#F7C318]">
          SHAWON
        </span>
        <span className="font-display text-[19px] lg:text-[23px] font-black tracking-tight text-white">
          Food <span className="text-[#E1262D]">Gate</span>
        </span>
      </span>
    </span>
  );
}
