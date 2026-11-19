import { DEFAULT_CITY_ID } from "@/lib/cities";
import { FleetSimulator } from "@/lib/fleetSimulator";
import { createFleetBroadcastBus, type FleetBroadcastBus } from "@/lib/transport/broadcast";
import type { FleetTransport, MessageHandler, StatusHandler } from "@/lib/transport/types";
import type { CityId, ClientMessage, Trip } from "@/types/fleet";

/**
 * In-browser mock WebSocket transport backed by FleetSimulator + BroadcastChannel.
 * Swap this with `WebSocketTransport` in `useFleetConnection` (or via
 * `NEXT_PUBLIC_FLEET_WS_URL`) to connect to a real Node.js/FastAPI + Redis Geo backend.
 */
export class MockTransport implements FleetTransport {
  private simulator: FleetSimulator;
  private unsubscribeSim: (() => void) | null = null;
  private bus: FleetBroadcastBus | null = null;
  private onMessage: MessageHandler | null = null;
  private onStatus: StatusHandler | null = null;
  private isOnline = true;

  constructor(initialCity: CityId = DEFAULT_CITY_ID) {
    this.simulator = new FleetSimulator(initialCity);
  }

  public connect(onMessage: MessageHandler, onStatus: StatusHandler): void {
    this.onMessage = onMessage;
    this.onStatus = onStatus;

    this.bus = createFleetBroadcastBus(
      (serverMsg) => {
        if (!this.isOnline) return;
        this.onMessage?.(serverMsg);
      },
      (clientMsg) => {
        this.simulator.handleClientMessage(clientMsg);
      },
    );

    this.unsubscribeSim = this.simulator.subscribe((message) => {
      if (!this.isOnline) return;
      this.onMessage?.(message);
      // Forward state updates triggered by user actions across tabs
      if (message.type === "trip.updated" || message.type === "fleet.snapshot") {
        this.bus?.postServerMessage(message);
      }
    });

    this.simulator.start();
    this.onStatus?.(this.isOnline ? "connected" : "offline");
  }

  public send(message: ClientMessage): void {
    this.simulator.handleClientMessage(message);
    this.bus?.postClientMessage(message);
  }

  public restoreTrip(trip: Trip): void {
    this.simulator.restorePersistedTrip(trip);
  }

  public setNetworkOnline(online: boolean): void {
    this.isOnline = online;
    if (!online) {
      this.onStatus?.("offline");
      return;
    }
    this.onStatus?.("connected");
    this.onMessage?.(this.simulator.getSnapshot());
  }

  public disconnect(): void {
    this.unsubscribeSim?.();
    this.unsubscribeSim = null;
    this.simulator.stop();
    this.bus?.close();
    this.bus = null;
  }
}
