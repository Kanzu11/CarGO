"use client";

import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { TIERS } from "@/lib/tiers";
import { useFleetStore } from "@/store/useFleetStore";

/**
 * Driver Mode shift header: Online/Offline switch + today's ETB earnings & completed trips.
 */
export function OnlineSwitch() {
  const driverOnline = useFleetStore((s) => s.driverOnline);
  const setDriverOnline = useFleetStore((s) => s.setDriverOnline);
  const driverEarningsEtb = useFleetStore((s) => s.driverEarningsEtb);
  const driverTripsCompleted = useFleetStore((s) => s.driverTripsCompleted);
  const vehicles = useFleetStore((s) => s.vehicles);

  const playerVehicle = vehicles.find((v) => v.isPlayerDriver) ?? vehicles[0];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <Switch
          checked={driverOnline}
          onChange={setDriverOnline}
          label={driverOnline ? "Online" : "Offline"}
          description={driverOnline ? "Accepting landmark rides" : "Go online for requests"}
          tone="live"
        />
        {playerVehicle && (
          <div className="flex items-center gap-1.5">
            <Badge>{TIERS[playerVehicle.tier].name}</Badge>
            <Badge mono>{playerVehicle.plate}</Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-line bg-surface px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Today&apos;s Earnings
          </p>
          <p className="num mt-0.5 text-[17px] font-semibold text-ink">
            {driverEarningsEtb.toLocaleString()} ETB
          </p>
        </div>
        <div className="rounded-lg border border-line bg-surface px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Completed Trips
          </p>
          <p className="num mt-0.5 text-[17px] font-semibold text-ink">
            {driverTripsCompleted}
          </p>
        </div>
      </div>
    </div>
  );
}
