"use client";

import { useEffect, useRef } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { MockTransport } from "@/lib/transport/mockTransport";
import type { FleetTransport } from "@/lib/transport/types";
import { WebSocketTransport } from "@/lib/transport/wsTransport";
import { useFleetStore } from "@/store/useFleetStore";

/**
 * Single hook that connects the Zustand fleet store to either the in-browser
 * MockTransport (default) or a real Node.js/FastAPI + Redis Geo WebSocket
 * server (`NEXT_PUBLIC_FLEET_WS_URL`).
 */
export function useFleetConnection(): void {
  const online = useOnlineStatus();
  const transportRef = useRef<FleetTransport | null>(null);

  useEffect(() => {
    void useFleetStore.persist.rehydrate();
    const initialState = useFleetStore.getState();

    const wsUrl = process.env.NEXT_PUBLIC_FLEET_WS_URL;
    const transport: FleetTransport = wsUrl
      ? new WebSocketTransport(wsUrl)
      : new MockTransport(initialState.cityId);

    transportRef.current = transport;

    if (initialState.persistedRiderTrip) {
      transport.restoreTrip?.(initialState.persistedRiderTrip);
    }

    initialState.bindTransportSend((msg) => transport.send(msg));
    transport.connect(
      (serverMsg) => useFleetStore.getState().applyServerMessage(serverMsg),
      (status) => useFleetStore.getState().setConnStatus(status),
    );

    return () => {
      useFleetStore.getState().bindTransportSend(null);
      transport.disconnect();
      transportRef.current = null;
    };
  }, []);

  useEffect(() => {
    transportRef.current?.setNetworkOnline?.(online);
  }, [online]);
}
