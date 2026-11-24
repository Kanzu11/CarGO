"use client";

import { useEffect } from "react";
import { useFleetConnection } from "@/hooks/useFleetConnection";
import { useFleetStore } from "@/store/useFleetStore";

/**
 * Returns true only for injected browser-extension errors (such as MetaMask
 * `chrome-extension://.../inpage.js`) so host extensions never surface as app crashes.
 */
export function isBrowserExtensionError(info: {
  filename?: string;
  message?: string;
  stack?: string;
}): boolean {
  const { filename = "", message = "", stack = "" } = info;
  const originText = `${filename}\n${stack}`;
  if (
    originText.includes("chrome-extension://") ||
    originText.includes("moz-extension://") ||
    originText.includes("safari-extension://")
  ) {
    return true;
  }
  return (
    message.includes("Failed to connect to MetaMask") ||
    message.includes("MetaMask extension not found")
  );
}

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

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const stack =
        event.error && typeof event.error === "object" && "stack" in event.error
          ? String(event.error.stack)
          : undefined;
      if (isBrowserExtensionError({ filename: event.filename, message: event.message, stack })) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason && typeof reason === "object" && "message" in reason
          ? String(reason.message)
          : String(reason ?? "");
      const stack =
        reason && typeof reason === "object" && "stack" in reason ? String(reason.stack) : undefined;
      if (isBrowserExtensionError({ message, stack })) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onRejection, true);
    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection, true);
    };
  }, []);

  return <>{children}</>;
}
