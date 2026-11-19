"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const emptySubscribe = (): (() => void) => () => undefined;
const getClientSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

export interface HydrationGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders `children` only after client hydration completes, avoiding
 * SSR/client mismatch for browser-only APIs and time-varying values.
 */
export function HydrationGate({ children, fallback = null }: HydrationGateProps) {
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  return mounted ? <>{children}</> : <>{fallback}</>;
}
