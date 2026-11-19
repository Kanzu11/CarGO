"use client";

import dynamic from "next/dynamic";
import type { MapCanvasProps } from "@/components/map/MapCanvas";

const DynamicMapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface">
      <span className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-[12px] font-medium text-muted">
        Initializing 3D map…
      </span>
    </div>
  ),
});

/** Hydration-safe MapLibre GL wrapper (never evaluates WebGL or window on SSR). */
export function ClientMap(props: MapCanvasProps) {
  return <DynamicMapCanvas {...props} />;
}
