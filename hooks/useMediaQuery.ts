"use client";

import { useSyncExternalStore } from "react";

/**
 * Hydration-safe media query hook using `useSyncExternalStore`.
 * Returns `false` during SSR so server and initial client markup match cleanly.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => undefined;
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false),
    () => false,
  );
}
