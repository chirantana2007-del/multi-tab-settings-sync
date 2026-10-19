import { sanitize } from './merge';
import { STORAGE_KEY, readStored } from './persistence';
import type { VersionedState } from './types';

/** Epoch ms with sub-millisecond precision, comparable across tabs. */
export const now = (): number => performance.timeOrigin + performance.now();

type OnRemote = (state: Partial<VersionedState>, sentAt: number | null) => void;
interface Msg { sentAt: number; state: unknown }

export class Sync {
  private channel: BroadcastChannel | null;

  constructor(private onRemote: OnRemote) {
    // Primary transport: BroadcastChannel (near-instant)
    this.channel = 'BroadcastChannel' in window ? new BroadcastChannel('gdg-settings') : null;
    if (this.channel) {
      this.channel.onmessage = (e: MessageEvent<Msg>) => {
        const m = e.data;
        if (!m || typeof m.sentAt !== 'number') return;
        this.onRemote(sanitize(m.state), m.sentAt);
      };
    }

    // Fallback transport: `storage` fires in OTHER tabs when localStorage changes
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        this.onRemote(sanitize(JSON.parse(e.newValue)), null);
      } catch { /* ignore corrupt data */ }
    });

    // Catch-up: a backgrounded/throttled/frozen tab re-reads storage when it wakes
    const resync = () => {
      if (document.visibilityState === 'visible') this.onRemote(readStored(), null);
    };
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('pageshow', resync); // bfcache restores
  }

  broadcast(state: Partial<VersionedState>): void {
    this.channel?.postMessage({ sentAt: now(), state } satisfies Msg);
  }
}