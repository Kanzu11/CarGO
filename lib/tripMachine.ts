import type { Trip, TripPhase } from "@/types/fleet";

/**
 * Pure state-transition table for the CarGo trip lifecycle.
 *
 * Rider / Background lifecycle:
 *   REQUESTED -> SEARCHING -> DRIVER_ASSIGNED -> ARRIVING -> IN_PROGRESS -> COMPLETED
 * Driver-accepted job lifecycle:
 *   REQUESTED -> DRIVER_ASSIGNED -> ARRIVING -> IN_PROGRESS -> COMPLETED
 * Cancellation is legal from any pre-completion phase.
 */
const ALLOWED_TRANSITIONS: Record<TripPhase, ReadonlyArray<TripPhase>> = {
  REQUESTED: ["SEARCHING", "DRIVER_ASSIGNED", "CANCELLED"],
  SEARCHING: ["DRIVER_ASSIGNED", "CANCELLED"],
  DRIVER_ASSIGNED: ["ARRIVING", "SEARCHING", "CANCELLED"],
  ARRIVING: ["IN_PROGRESS", "DRIVER_ASSIGNED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionTrip(from: TripPhase, to: TripPhase): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTripTransition(from: TripPhase, to: TripPhase): void {
  if (!canTransitionTrip(from, to)) {
    throw new Error(`Illegal trip phase transition: ${from} -> ${to}`);
  }
}

export function isTerminalPhase(phase: TripPhase): boolean {
  return phase === "COMPLETED" || phase === "CANCELLED";
}

export function isActiveTripPhase(phase: TripPhase): boolean {
  return !isTerminalPhase(phase);
}

/** Returns a new Trip transitioned to `nextPhase` with an appended timeline entry. */
export function transitionTrip(
  trip: Trip,
  nextPhase: TripPhase,
  at: number,
  note?: string,
): Trip {
  assertTripTransition(trip.phase, nextPhase);
  return {
    ...trip,
    phase: nextPhase,
    updatedAt: at,
    timeline: [
      ...trip.timeline,
      {
        phase: nextPhase,
        at,
        ...(note ? { note } : {}),
      },
    ],
  };
}
