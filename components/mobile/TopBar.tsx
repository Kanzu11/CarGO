"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { useMemo } from "react";
import { BrandMark } from "@/components/brand/Wordmark";
import { HydrationGate } from "@/components/system/HydrationGate";
import { Icon } from "@/components/ui/Icon";
import { LocaleToggle } from "@/components/ui/LocaleToggle";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { CITY_ORDER } from "@/lib/cities";
import { getStrings, localizeCityName } from "@/lib/i18n";
import { useFleetStore } from "@/store/useFleetStore";
import type { AppMode, CityId } from "@/types/fleet";

/**
 * Compact floating top bar for `/`.
 * Left: CarGo mark + localized City selector.
 * Right: Rider | Driver segmented switch + EN/አማ toggle + /dispatch button.
 */
export function TopBar() {
  const cityId = useFleetStore((s) => s.cityId);
  const setCity = useFleetStore((s) => s.setCity);
  const mode = useFleetStore((s) => s.mode);
  const setMode = useFleetStore((s) => s.setMode);
  const locale = useFleetStore((s) => s.locale);

  const s = getStrings(locale);

  const cityOptions = useMemo(
    () =>
      CITY_ORDER.map((id) => ({
        value: id,
        label: localizeCityName(id, locale),
      })),
    [locale],
  );

  const modeOptions = useMemo<ReadonlyArray<{ value: AppMode; label: string }>>(
    () => [
      { value: "rider", label: s.rider },
      { value: "driver", label: s.driver },
    ],
    [s.rider, s.driver],
  );

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 pt-safe px-3 pt-2.5 md:right-auto md:w-[440px]">
      <div className="pointer-events-auto flex h-12 items-center justify-between gap-1.5 rounded-lg border border-line bg-canvas px-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <BrandMark size={22} />
          <HydrationGate
            fallback={
              <span className="inline-flex h-8 items-center rounded-lg border border-line px-2.5 text-[13px] font-medium text-ink">
                Adama
              </span>
            }
          >
            <Select<CityId>
              label="Select Ethiopian city"
              size="sm"
              value={cityId}
              onChange={setCity}
              options={cityOptions}
              className="w-[100px] sm:w-[114px]"
            />
          </HydrationGate>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <HydrationGate
            fallback={
              <div className="inline-flex h-8 w-[108px] rounded-lg border border-line bg-surface" />
            }
          >
            <Segmented<AppMode>
              label="App mode"
              size="sm"
              value={mode}
              onChange={setMode}
              options={modeOptions}
            />
          </HydrationGate>

          <LocaleToggle />

          <Link
            href="/dispatch"
            aria-label={s.opsView}
            title={s.opsView}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-ink hover:bg-surface"
          >
            <Icon icon={LayoutDashboard} size={15} />
          </Link>
        </div>
      </div>
    </header>
  );
}
