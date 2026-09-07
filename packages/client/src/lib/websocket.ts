import { PROTOCOL_VERSION, type ClientMessage, type ServerMessage } from "@dots-game/shared";

type MessageHandler = (message: ServerMessage) => void;

function isServerMessage(value: unknown): value is ServerMessage {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return record.version === PROTOCOL_VERSION && typeof record.type === "string";
}

export class GameSocket {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private handlers: MessageHandler[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];
  private queue: ClientMessage[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 12;
  private manualClose = false;
  private connectedState = false;

  constructor(url: string) { this.url = url; }
  get connected(): boolean { return this.connectedState; }

  connect(): void {
    this.manualClose = false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    const ws = new WebSocket(this.url); this.ws = ws;
    ws.onopen = () => { this.reconnectAttempts = 0; this.setConnected(true); this.flush(); };
    ws.onmessage = (event: MessageEvent<string>) => {
      try { const value: unknown = JSON.parse(event.data); if (isServerMessage(value)) this.handlers.forEach((handler) => handler(value)); }
      catch { /* malformed server data is ignored; the socket remains usable */ }
    };
    ws.onerror = () => { /* close schedules recovery and avoids duplicate error UI */ };
    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      this.setConnected(false);
      if (!this.manualClose) this.scheduleReconnect();
    };
  }

  disconnect(): void {
    this.manualClose = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.queue = [];
    const ws = this.ws; this.ws = null;
    if (ws) ws.close(1000, "client left");
    this.setConnected(false);
  }

  send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message));
    else { this.queue.push(message); this.connect(); }
  }

  onMessage(handler: MessageHandler): () => void { this.handlers.push(handler); return () => { this.handlers = this.handlers.filter((item) => item !== handler); }; }
  onConnectionChange(handler: (connected: boolean) => void): () => void { this.connectionHandlers.push(handler); handler(this.connectedState); return () => { this.connectionHandlers = this.connectionHandlers.filter((item) => item !== handler); }; }

  private setConnected(value: boolean): void {
    if (this.connectedState === value) return;
    this.connectedState = value; this.connectionHandlers.forEach((handler) => handler(value));
  }
  private flush(): void { const queue = this.queue.splice(0); queue.forEach((message) => this.send(message)); }
  private scheduleReconnect(): void {
    if (this.manualClose || this.reconnectTimer || this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const exponential = Math.min(30_000, 500 * 2 ** this.reconnectAttempts);
    const jitter = Math.floor(Math.random() * 400);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; this.connect(); }, exponential + jitter);
  }
}

let socketInstance: GameSocket | null = null;
export function getSocket(): GameSocket {
  if (!socketInstance) {
    const configured = import.meta.env.VITE_WS_URL as string | undefined;
    const devPort = (import.meta.env.VITE_WS_PORT as string | undefined) || "3001";
    const fallback = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:${devPort}`;
    socketInstance = new GameSocket(configured || (import.meta.env.PROD ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}` : fallback));
  }
  return socketInstance;
}
