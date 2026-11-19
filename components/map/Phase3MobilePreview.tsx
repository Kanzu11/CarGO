"use client";

import Link from "next/link";
import { LayoutDashboard, MapPin, Navigation } from "lucide-react";
import { useMemo } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { ClientMap } from "@/components/map/ClientMap";
import { HydrationGate } from "@/components/system/HydrationGate";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { StatusDot } from "@/components/ui/StatusDot";
import { CITIES, CITY_ORDER } from "@/lib/cities";
import { lockedFare } from "@/lib/fare";
import { computeCityRoute } from "@/lib/routing";
import { useFleetStore } from "@/store/useFleetStore";
import type { CityId } from "@/types/fleet";

const CITY_OPTIONS = CITY_ORDER.map((id) => ({
  value: id,
  label: CITIES[id].name,
}));

/**
 * Phase 3 live 3D map entry view for `/`.
 * Phase 4 replaces the bottom status card with full Rider & Driver sheets.
 */
export function Phase3MobilePreview() {
  const cityId = useFleetStore((s) => s.cityId);
  const setCity = useFleetStore((s) => s.setCity);
  const pickup = useFleetStore((s) => s.pickup);
  const setPickupFromCoords = useFleetStore((s) => s.setPickupFromCoords);
  const vehicles = useFleetStore((s) => s.vehicles);
  const map3dEnabled = useFleetStore((s) => s.map3dEnabled);
  const kpis = useFleetStore((s) => s.kpis);

  const city = CITIES[cityId];

  const previewRoute = useMemo(() => {
    const start = city.landmarks[0]!;
    const end = city.landmarks[1] ?? city.landmarks[0]!;
    const result = computeCityRoute(cityId, start.coords, end.coords);
    return {
      from: start.name,
      to: end.name,
      distanceKm: result.distanceKm,
      bajajEtb: lockedFare("bajaj", result.distanceKm),
      coords: result.coords,
    };
  }, [city, cityId]);

  const mapPadding = useMemo(() => ({ top: 64, bottom: 180, left: 0, right: 0 }), []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-surface">
      <ClientMap
        variant="mobile"
        showCrosshair
        showAllTrips={false}
        previewRoute={previewRoute.coords}
        padding={mapPadding}
        onCrosshairSettled={setPickupFromCoords}
        controlsClassName="top-16"
      />

      {/* Compact floating top bar */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 pt-safe px-3 pt-2.5 md:right-auto md:w-[424px]">
        <div className="pointer-events-auto flex h-12 items-center justify-between gap-2 rounded-lg border border-line bg-canvas px-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <Wordmark />
            <Select<CityId>
              label="Select city"
              size="sm"
              value={cityId}
              onChange={setCity}
              options={CITY_OPTIONS}
              className="w-[118px]"
            />
          </div>

          <Link
            href="/dispatch"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 text-[12px] font-medium text-ink hover:bg-surface"
          >
            <Icon icon={LayoutDashboard} size={14} />
            Ops View
          </Link>
        </div>
      </header>

      {/* Desktop top-right Ops shortcut */}
      <div className="pointer-events-none fixed right-3 top-3 z-30 hidden md:block">
        <Link
          href="/dispatch"
          className="pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 text-[13px] font-medium text-ink hover:bg-surface"
        >
          Ops Command Center →
        </Link>
      </div>

      {/* Bottom 3D engine status sheet (replaced by full Rider/Driver flow in Phase 4) */}
      <section
        aria-label="3D map telemetry summary"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 md:inset-x-auto md:bottom-3 md:left-3 md:w-[400px]"
      >
        <div className="pointer-events-auto rounded-t-xl border-t border-line bg-canvas px-4 pt-3 pb-safe md:rounded-xl md:border">
          <div className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
            <div className="flex items-center gap-2 text-[12px] font-medium text-ink">
              <StatusDot tone="live" pulse size={6} />
              <span>3D Map Engine Live</span>
              <Badge mono>{map3dEnabled ? "3D" : "2D"}</Badge>
            </div>
            <HydrationGate
              fallback={
                <span className="num text-[12px] text-muted">20 units</span>
              }
            >
              <span className="num text-[12px] font-medium text-muted">
                {vehicles.length || kpis.activeFleet} units online
              </span>
            </HydrationGate>
          </div>

          <div className="mt-2.5 space-y-2">
            <div className="flex items-start gap-2">
              <Icon icon={MapPin} size={15} className="mt-0.5 shrink-0 text-brand" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  Crosshair pickup
                </p>
                <HydrationGate
                  fallback={<p className="truncate text-[13px] font-medium text-ink">{city.landmarks[0]?.name}</p>}
                >
                  <p className="truncate text-[13px] font-medium text-ink">{pickup.name}</p>
                </HydrationGate>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <Icon icon={Navigation} size={14} className="shrink-0 text-live" />
                <span className="truncate text-[12px] text-ink">
                  {previewRoute.from} → {previewRoute.to}
                </span>
              </div>
              <span className="num shrink-0 text-[12px] font-semibold text-ink">
                {previewRoute.distanceKm.toFixed(1)} km · {previewRoute.bajajEtb} ETB
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
