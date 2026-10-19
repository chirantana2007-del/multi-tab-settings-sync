interface TabMsg {
  type: 'hello' | 'ping' | 'bye';
  id: string;
}

const PING_EVERY_MS = 2000;
const EXPIRE_AFTER_MS = 6000;

/** Counts open tabs with tiny heartbeat messages over a second BroadcastChannel. */
export class TabTracker {
  private channel: BroadcastChannel | null;
  private seen = new Map<string, number>(); // other tab id -> last heard (this tab's clock)
  private lastCount = 0;

  constructor(private id: string, private onCount: (n: number) => void) {
    this.channel = 'BroadcastChannel' in window ? new BroadcastChannel('gdg-tabs') : null;
    if (!this.channel) {
      onCount(1);
      return;
    }

    this.channel.onmessage = (e: MessageEvent<TabMsg>) => {
      const m = e.data;
      if (!m || typeof m.id !== 'string' || m.id === this.id) return;
      if (m.type === 'bye') {
        this.seen.delete(m.id);
      } else {
        this.seen.set(m.id, performance.now());
        if (m.type === 'hello') this.send('ping'); // introduce myself to the newcomer
      }
      this.publish();
    };

    this.send('hello');
    window.setInterval(() => {
      this.send('ping');
      this.publish();
    }, PING_EVERY_MS);

    window.addEventListener('pagehide', () => this.send('bye'));
    window.addEventListener('pageshow', () => this.send('hello'));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.send('hello');
    });
    this.publish();
  }

  private send(type: TabMsg['type']): void {
    this.channel?.postMessage({ type, id: this.id } satisfies TabMsg);
  }

  private publish(): void {
    const cutoff = performance.now() - EXPIRE_AFTER_MS;
    for (const [id, last] of this.seen) if (last < cutoff) this.seen.delete(id);
    const count = this.seen.size + 1; // +1 = this tab
    if (count !== this.lastCount) {
      this.lastCount = count;
      this.onCount(count);
    }
  }
}