"use client";

import { useCallback, useState } from "react";

export type PerfTier = "full" | "lite";

function detectInitialPerfTier(): PerfTier {
  if (typeof window === "undefined") return "full";

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  if (reducedMotion) return "lite";

  const nav = navigator as Navigator & { deviceMemory?: number };
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4) {
    return "lite";
  }
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) {
    return "lite";
  }
  return "full";
}

/**
 * Hardware- & runtime-adaptive 3D tiering.
 * Starts in `lite` on constrained devices (<=4 cores, <=4GB RAM, or reduced motion)
 * and exposes `downgradeToLite` when sustained frame times drop below 30 fps.
 */
export function usePerfTier(): { perfTier: PerfTier; downgradeToLite: () => void } {
  const [perfTier, setPerfTier] = useState<PerfTier>(() => detectInitialPerfTier());

  const downgradeToLite = useCallback(() => {
    setPerfTier((prev) => (prev === "lite" ? prev : "lite"));
  }, []);

  return { perfTier, downgradeToLite };
}
