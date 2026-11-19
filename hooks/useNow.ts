"use client";

import { useEffect, useState } from "react";

/**
 * Client-only periodic timestamp hook (for offer countdown bars & relative times).
 * Returns `null` during SSR to guarantee zero hydration mismatch.
 */
export function useNow(intervalMs = 250): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const kick = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(timer);
    };
  }, [intervalMs]);

  return now;
}
