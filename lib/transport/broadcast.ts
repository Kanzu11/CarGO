import type { ClientMessage, ServerMessage } from "@/types/fleet";

const CHANNEL_NAME = "cargo-fleet-sync-v1";

export type BroadcastEnvelope =
  | { kind: "server"; tabId: string; payload: ServerMessage }
  | { kind: "client"; tabId: string; payload: ClientMessage };

export interface FleetBroadcastBus {
  postServerMessage(payload: ServerMessage): void;
  postClientMessage(payload: ClientMessage): void;
  close(): void;
}

/**
 * Lightweight BroadcastChannel bridge so `/` (mobile rider/driver view) and
 * `/dispatch` (ops command center) stay synchronized even across separate tabs.
 */
export function createFleetBroadcastBus(
  onServerMessage: (message: ServerMessage) => void,
  onClientMessage: (message: ClientMessage) => void,
): FleetBroadcastBus {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return {
      postServerMessage: () => undefined,
      postClientMessage: () => undefined,
      close: () => undefined,
    };
  }

  const tabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const channel = new BroadcastChannel(CHANNEL_NAME);

  channel.onmessage = (event: MessageEvent<BroadcastEnvelope>) => {
    const data = event.data;
    if (!data || data.tabId === tabId) return;
    if (data.kind === "server") {
      onServerMessage(data.payload);
    } else if (data.kind === "client") {
      onClientMessage(data.payload);
    }
  };

  return {
    postServerMessage: (payload) => {
      try {
        channel.postMessage({ kind: "server", tabId, payload } satisfies BroadcastEnvelope);
      } catch {
        // Ignore closed channel errors
      }
    },
    postClientMessage: (payload) => {
      try {
        channel.postMessage({ kind: "client", tabId, payload } satisfies BroadcastEnvelope);
      } catch {
        // Ignore closed channel errors
      }
    },
    close: () => {
      channel.close();
    },
  };
}
