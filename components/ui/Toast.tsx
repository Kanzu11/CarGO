"use client";

import { useEffect } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useToastStore, type ToastItem, type ToastTone } from "@/store/useToastStore";
import { Icon } from "./Icon";

const toneIcon: Record<ToastTone, typeof Info> = {
  neutral: Info,
  live: CircleCheck,
  warn: TriangleAlert,
  danger: CircleAlert,
};

const toneColor: Record<ToastTone, string> = {
  neutral: "text-ink",
  live: "text-live",
  warn: "text-warn",
  danger: "text-danger",
};

function ToastRow({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(item.id), item.durationMs);
    return () => window.clearTimeout(timer);
  }, [dismiss, item.id, item.durationMs]);

  return (
    <div
      role={item.tone === "danger" ? "alert" : "status"}
      className="pointer-events-auto flex w-full animate-toast-in items-start gap-2.5 rounded-lg border border-line bg-canvas px-3 py-2.5"
    >
      <Icon icon={toneIcon[item.tone]} size={16} className={cn("mt-0.5 shrink-0", toneColor[item.tone])} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-5 text-ink">{item.title}</p>
        {item.description && <p className="text-[12px] leading-4 text-muted">{item.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label="Dismiss notification"
        className="-mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-muted hover:bg-surface hover:text-ink"
      >
        <Icon icon={X} size={14} />
      </button>
    </div>
  );
}

/** Top-anchored toast stack. Mounted once in the root layout. */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-safe z-[60] mx-auto flex w-full max-w-sm flex-col gap-2 px-3 pt-14"
    >
      {toasts.map((item) => (
        <ToastRow key={item.id} item={item} />
      ))}
    </div>
  );
}
