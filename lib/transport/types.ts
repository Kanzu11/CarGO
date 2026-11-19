import type { ClientMessage, ConnStatus, ServerMessage, Trip } from "@/types/fleet";

export type MessageHandler = (message: ServerMessage) => void;
export type StatusHandler = (status: ConnStatus) => void;

export interface FleetTransport {
  connect(onMessage: MessageHandler, onStatus: StatusHandler): void;
  send(message: ClientMessage): void;
  restoreTrip?(trip: Trip): void;
  setNetworkOnline?(online: boolean): void;
  disconnect(): void;
}
