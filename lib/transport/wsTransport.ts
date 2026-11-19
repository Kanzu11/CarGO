import type { FleetTransport, MessageHandler, StatusHandler } from "@/lib/transport/types";
import type { ClientMessage, ServerMessage } from "@/types/fleet";

/**
 * Production WebSocket transport speaking the exact same ServerMessage / ClientMessage
 * JSON protocol as MockTransport. Activated automatically when `NEXT_PUBLIC_FLEET_WS_URL`
 * is set in the environment.
 */
export class WebSocketTransport implements FleetTransport {
  private url: string;
  private ws: WebSocket | null = null;
  private onMessage: MessageHandler | null = null;
  private onStatus: StatusHandler | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 1000;
  private closedByClient = false;
  private queue: ClientMessage[] = [];

  constructor(url: string) {
    this.url = url;
  }

  public connect(onMessage: MessageHandler, onStatus: StatusHandler): void {
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.closedByClient = false;
    this.openSocket();
  }

  private openSocket(): void {
    if (typeof window === "undefined") return;
    this.onStatus?.("reconnecting");

    try {
      const socket = new WebSocket(this.url);
      this.ws = socket;

      socket.onopen = () => {
        this.backoffMs = 1000;
        this.onStatus?.("connected");
        while (this.queue.length > 0) {
          const pending = this.queue.shift();
          if (pending) {
            socket.send(JSON.stringify(pending));
          }
        }
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(event.data) as ServerMessage;
          this.onMessage?.(parsed);
        } catch {
          // Ignore malformed frame
        }
      };

      socket.onclose = () => {
        if (this.closedByClient) return;
        this.onStatus?.("reconnecting");
        this.scheduleReconnect();
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.closedByClient) return;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(12000, Math.round(this.backoffMs * 1.6));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  public send(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.queue.push(message);
    }
  }

  public setNetworkOnline(online: boolean): void {
    if (!online) {
      this.onStatus?.("offline");
      return;
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.openSocket();
    } else {
      this.onStatus?.("connected");
    }
  }

  public disconnect(): void {
    this.closedByClient = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}
