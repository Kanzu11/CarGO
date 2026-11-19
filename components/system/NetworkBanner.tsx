"use client";

import { useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/cn";
import { StatusDot } from "@/components/ui/StatusDot";
import { getStrings } from "@/lib/i18n";
import { useFleetStore } from "@/store/useFleetStore";

const RESTORED_VISIBLE_MS = 2000;

/**
 * Compact 24px top status strip.
 * Offline → amber "Reconnecting to CarGo dispatch…" (state is preserved, nothing is reset).
 * Back online → brief emerald "Connected" confirmation, then hides.
 */
export function NetworkBanner() {
  const online = useOnlineStatus();
  const locale = useFleetStore((s) => s.locale);
  const wasOffline = useRef(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    // Defer so the state update happens outside the effect's synchronous body.
    const show = window.setTimeout(() => setRestored(true), 0);
    const hide = window.setTimeout(() => setRestored(false), RESTORED_VISIBLE_MS);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [online]);

  const visible = !online || restored;
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pt-safe fixed inset-x-0 top-0 z-[70] animate-banner-in border-b bg-canvas",
        online ? "border-live/30" : "border-warn/30",
      )}
    >
      <div className="flex h-6 items-center justify-center gap-2 text-[12px] font-medium">
        <StatusDot tone={online ? "live" : "warn"} pulse={!online} size={6} />
        <span className={online ? "text-live" : "text-warn"}>
          {online ? getStrings(locale).connectedBanner : getStrings(locale).reconnectingBanner}
        </span>
      </div>
    </div>
  );
}
