"use client";

import { useFleetConnection } from "@/hooks/useFleetConnection";

/**
 * Mounted once in `app/layout.tsx` so the fleet engine runs continuously
 * across client-side transitions between `/` and `/dispatch`.
 */
export function FleetProvider({ children }: { children: React.ReactNode }) {
  useFleetConnection();
  return <>{children}</>;
}
