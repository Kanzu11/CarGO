"use client";

import { LocationStep } from "@/components/rider/LocationStep";
import { TierStep } from "@/components/rider/TierStep";
import { TripStep } from "@/components/rider/TripStep";
import { useFleetStore } from "@/store/useFleetStore";

export interface RiderSheetProps {
  onRequestGps: () => void;
}

/**
 * Coordinates the 3-step Rider flow inside the mobile bottom sheet / desktop floating panel.
 */
export function RiderSheet({ onRequestGps }: RiderSheetProps) {
  const riderStep = useFleetStore((s) => s.riderStep);
  const activeRiderTripId = useFleetStore((s) => s.activeRiderTripId);
  const trips = useFleetStore((s) => s.trips);

  const activeTrip = activeRiderTripId
    ? trips.find((t) => t.id === activeRiderTripId)
    : undefined;

  if (riderStep === "trip" && activeTrip) {
    return <TripStep trip={activeTrip} />;
  }

  if (riderStep === "tier") {
    return <TierStep />;
  }

  return <LocationStep onRequestGps={onRequestGps} />;
}
