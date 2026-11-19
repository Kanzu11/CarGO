"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Visually hide the label (still announced to screen readers). */
  hideLabel?: boolean;
  description?: string;
  tone?: "live" | "brand";
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}

/** Flat toggle switch: solid track, white square-ish thumb, 1px border. */
export function Switch({
  checked,
  onChange,
  label,
  hideLabel = false,
  description,
  tone = "live",
  size = "md",
  disabled = false,
  className,
}: SwitchProps) {
  const id = useId();
  const track = size === "sm" ? "h-5 w-9" : "h-6 w-11";
  const thumb = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const shift = size === "sm" ? "translate-x-4" : "translate-x-5";
  const on = tone === "live" ? "bg-live border-live" : "bg-brand border-brand";

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={hideLabel ? label : undefined}
        aria-labelledby={hideLabel ? undefined : `${id}-label`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex shrink-0 items-center rounded-full border p-px transition-colors duration-150 disabled:opacity-40",
          track,
          checked ? on : "border-line-strong bg-[#e5e7eb]",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block rounded-full bg-white transition-transform duration-150",
            thumb,
            checked ? shift : "translate-x-0",
          )}
        />
      </button>
      {!hideLabel && (
        <label htmlFor={id} id={`${id}-label`} className="flex cursor-pointer flex-col leading-tight">
          <span className="text-[13px] font-medium text-ink">{label}</span>
          {description && <span className="text-2xs text-muted">{description}</span>}
        </label>
      )}
    </div>
  );
}
