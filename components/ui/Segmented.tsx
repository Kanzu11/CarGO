"use client";

import { useRef, type KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Optional trailing count, rendered with tabular numerals. */
  count?: number;
}

export interface SegmentedProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  block?: boolean;
  className?: string;
}

/**
 * Flat segmented control: 1px bordered track, solid black active segment.
 * Implements the WAI-ARIA radiogroup pattern with roving tabindex + arrow keys.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  block = false,
  className,
}: SegmentedProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = options.length - 1;
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = index === last ? 0 : index + 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = index === 0 ? last : index - 1;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = last;
    if (next < 0) return;
    event.preventDefault();
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex items-stretch rounded-lg border border-line bg-surface p-0.5",
        size === "sm" ? "h-8" : "h-10",
        block && "flex w-full",
        className,
      )}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "inline-flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] font-medium",
              "transition-colors duration-100",
              size === "sm" ? "px-2.5 text-[12px]" : "px-3 text-[13px]",
              block && "flex-1",
              active ? "bg-brand text-white" : "text-muted hover:text-ink",
            )}
          >
            {option.icon && <Icon icon={option.icon} size={size === "sm" ? 13 : 14} />}
            <span className="truncate">{option.label}</span>
            {typeof option.count === "number" && (
              <span className={cn("num text-[11px]", active ? "text-white/70" : "text-muted")}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
