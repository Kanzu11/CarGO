import { create } from "zustand";

export type ToastTone = "neutral" | "live" | "warn" | "danger";

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  durationMs: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id" | "tone" | "durationMs"> & Partial<Pick<ToastItem, "tone" | "durationMs">>) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;
const MAX_VISIBLE = 3;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: ({ tone = "neutral", durationMs = 3200, ...toast }) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, tone, durationMs, ...toast }].slice(-MAX_VISIBLE) }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

/** Imperative helper usable from anywhere (components, simulator callbacks). */
export const toast = (
  title: string,
  options: { description?: string; tone?: ToastTone; durationMs?: number } = {},
): number => useToastStore.getState().push({ title, ...options });
