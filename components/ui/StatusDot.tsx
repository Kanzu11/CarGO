import { cn } from "@/lib/cn";

export type DotTone = "live" | "warn" | "danger" | "idle" | "brand";

const tones: Record<DotTone, string> = {
  live: "bg-live",
  warn: "bg-warn",
  danger: "bg-danger",
  idle: "bg-[#9ca3af]",
  brand: "bg-brand",
};

export interface StatusDotProps {
  tone: DotTone;
  pulse?: boolean;
  size?: 6 | 8 | 10;
  label?: string;
  className?: string;
}

/** Solid status indicator. Pulse is an opacity keyframe — never a glow. */
export function StatusDot({ tone, pulse = false, size = 8, label, className }: StatusDotProps) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-block shrink-0 rounded-full", tones[tone], pulse && "animate-pulse-dot", className)}
      style={{ width: size, height: size }}
    />
  );
}
