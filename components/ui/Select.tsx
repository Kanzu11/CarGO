"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SelectOption<T>>;
  label: string;
  icon?: LucideIcon;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Native <select> styled flat. Native keeps the OS picker on Android/TWA,
 * which is the most thumb-friendly and accessible option.
 */
export function Select<T extends string>({ value, onChange, options, label, icon, size = "md", className }: SelectProps<T>) {
  return (
    <div className={cn("relative inline-flex items-center", className)}>
      {icon && (
        <Icon icon={icon} size={14} className="pointer-events-none absolute left-2.5 text-muted" />
      )}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className={cn(
          "w-full appearance-none rounded-lg border border-line bg-canvas font-medium text-ink outline-none",
          "hover:bg-surface focus-visible:border-brand",
          size === "sm" ? "h-8 pr-7 !text-[13px]" : "h-10 pr-8 !text-[14px]",
          icon ? "pl-7" : "pl-2.5",
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon icon={ChevronDown} size={14} className="pointer-events-none absolute right-2.5 text-muted" />
    </div>
  );
}
