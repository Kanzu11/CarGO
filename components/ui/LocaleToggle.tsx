"use client";

import { HydrationGate } from "@/components/system/HydrationGate";
import { cn } from "@/lib/cn";
import { useFleetStore } from "@/store/useFleetStore";

export interface LocaleToggleProps {
  className?: string;
}

/**
 * Compact flat 32px EN / አማ language switch synchronized across /, /dispatch,
 * and MapLibre map labels.
 */
export function LocaleToggle({ className }: LocaleToggleProps) {
  const locale = useFleetStore((s) => s.locale);
  const setLocale = useFleetStore((s) => s.setLocale);

  return (
    <HydrationGate
      fallback={
        <span className="inline-flex h-8 w-9 items-center justify-center rounded-lg border border-line bg-canvas text-[12px] font-semibold text-ink">
          አማ
        </span>
      }
    >
      <button
        type="button"
        onClick={() => setLocale(locale === "en" ? "am" : "en")}
        aria-label={locale === "en" ? "Switch language to Amharic" : "Switch language to English"}
        title={locale === "en" ? "አማርኛ (Amharic)" : "English"}
        className={cn(
          "inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas px-2 text-[12px] font-semibold text-ink hover:bg-surface",
          className,
        )}
      >
        {locale === "en" ? "አማ" : "EN"}
      </button>
    </HydrationGate>
  );
}
