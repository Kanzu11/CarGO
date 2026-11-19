"use client";

import { useEffect } from "react";
import { useFleetConnection } from "@/hooks/useFleetConnection";
import { useFleetStore } from "@/store/useFleetStore";

/**
 * Mounted once in `app/layout.tsx` so the fleet engine runs continuously
 * across client-side transitions between `/` and `/dispatch`.
 */
export function FleetProvider({ children }: { children: React.ReactNode }) {
  useFleetConnection();
  const locale = useFleetStore((s) => s.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <>{children}</>;
}
