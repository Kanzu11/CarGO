"use client";

import { ActiveJobCard } from "@/components/driver/ActiveJobCard";
import { IncomingRequestCard } from "@/components/driver/IncomingRequestCard";
import { OnlineSwitch } from "@/components/driver/OnlineSwitch";
import { StatusDot } from "@/components/ui/StatusDot";
import { CITIES } from "@/lib/cities";
import { useFleetStore } from "@/store/useFleetStore";

/**
 * Driver Mode panel toggled directly from the top bar for single-device demos.
 */
export function DriverPanel() {
  const cityId = useFleetStore((s) => s.cityId);
  const driverOnline = useFleetStore((s) => s.driverOnline);
  const driverOffer = useFleetStore((s) => s.driverOffer);
  const activeDriverTripId = useFleetStore((s) => s.activeDriverTripId);
  const trips = useFleetStore((s) => s.trips);

  const activeTrip = activeDriverTripId
    ? trips.find((t) => t.id === activeDriverTripId)
    : undefined;

  return (
    <div className="space-y-3">
      <OnlineSwitch />

      {activeTrip ? (
        <ActiveJobCard trip={activeTrip} />
      ) : driverOffer ? (
        <IncomingRequestCard offer={driverOffer} />
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-[12px] text-muted">
          <StatusDot tone={driverOnline ? "live" : "idle"} pulse={driverOnline} size={6} />
          <span>
            {driverOnline
              ? `Scanning ${CITIES[cityId].name} landmarks — next request arriving shortly…`
              : "Switch Online above to receive a live dispatch request in 3 seconds."}
          </span>
        </div>
      )}
    </div>
  );
}
