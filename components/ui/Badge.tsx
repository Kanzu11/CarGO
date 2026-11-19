import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

export type Tone = "neutral" | "live" | "warn" | "danger" | "brand";

const outline: Record<Tone, string> = {
  neutral: "border-line bg-canvas text-ink",
  live: "border-live/30 bg-live-soft text-live",
  warn: "border-warn/30 bg-warn-soft text-warn",
  danger: "border-danger/30 bg-danger-soft text-danger",
  brand: "border-brand bg-canvas text-brand",
};

const solid: Record<Tone, string> = {
  neutral: "border-ink bg-ink text-white",
  live: "border-live bg-live text-white",
  warn: "border-warn bg-warn text-white",
  danger: "border-danger bg-danger text-white",
  brand: "border-brand bg-brand text-white",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  solid?: boolean;
  icon?: LucideIcon;
  mono?: boolean;
  children: ReactNode;
}

/** Compact 20px label for tiers, phases and plates. */
export function Badge({ tone = "neutral", solid: isSolid = false, icon, mono = false, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[6px] border px-1.5 text-2xs font-medium",
        isSolid ? solid[tone] : outline[tone],
        mono && "num font-mono tracking-tight",
        className,
      )}
      {...rest}
    >
      {icon && <Icon icon={icon} size={12} />}
      {children}
    </span>
  );
}
