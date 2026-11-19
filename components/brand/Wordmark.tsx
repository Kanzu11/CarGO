import { cn } from "@/lib/cn";

export interface WordmarkProps {
  suffix?: string;
  className?: string;
}

/** CarGo mark: solid black tile with a white route glyph, plus a compact wordmark. */
export function Wordmark({ suffix, className }: WordmarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark size={22} />
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
        CarGo
        {suffix && <span className="ml-1 font-medium text-muted">{suffix}</span>}
      </span>
    </span>
  );
}

export function BrandMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <rect width="24" height="24" rx="6" fill="#09090B" />
      {/* Open "C" route with an origin dot and an emerald destination dot. */}
      <path
        d="M16.5 8.2A5.6 5.6 0 1 0 16.5 15.8"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="16.7" cy="15.6" r="1.9" fill="#047857" stroke="#FFFFFF" strokeWidth="0.9" />
    </svg>
  );
}
