interface BrandMarkProps {
  className?: string;
}

// The Gauge-S mark — same SVG paths used across the brand kit, corporate
// site, and stationery. If the mark ever changes, it changes here once
// instead of in every file that happened to have it pasted inline.
export function BrandMark({ className = 'w-10 h-[53px]' }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 120 160" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M90,25 L30,25 L30,80 L90,80 L90,135 L30,135"
        fill="none"
        stroke="#29D3C0"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="30" cy="25" r="9" fill="#0F5C8C" />
      <circle cx="30" cy="80" r="9" fill="#0F5C8C" />
      <circle cx="90" cy="80" r="9" fill="#0F5C8C" />
      <circle cx="90" cy="135" r="9" fill="#0F5C8C" />
      <circle cx="90" cy="25" r="14" fill="none" stroke="#F5F6F7" strokeWidth="5" />
      <g transform="translate(30,135)">
        <path d="M-13,-9 L-13,9 L0,0 Z" fill="#F5F6F7" />
        <path d="M13,-9 L13,9 L0,0 Z" fill="#F5F6F7" />
      </g>
    </svg>
  );
}
