import { maxClock, mergeState, sameState } from './merge';
import type { SettingKey, Settings, VersionedState } from './types';

export type Origin = 'local' | 'remote';
type Listener = (state: VersionedState, origin: Origin) => void;

export class Store {
  private state: VersionedState;
  private clock: number;
  private listeners = new Set<Listener>();

  constructor(initial: VersionedState, readonly tabId: string) {
    this.state = initial;
    this.clock = maxClock(initial);
  }

  get(): VersionedState {
    return this.state;
  }

  values(): Settings {
    return {
      theme: this.state.theme.value,
      lang: this.state.lang.value,
      fontSize: this.state.fontSize.value,
    };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Lamport tick: strictly greater than anything this tab has seen. */
  nextClock(): number {
    return ++this.clock;
  }

  /** Local user edit. */
  set<K extends SettingKey>(key: K, value: Settings[K]): void {
    const entry = { value, clock: this.nextClock(), tabId: this.tabId };
    this.state = { ...this.state, [key]: entry } as VersionedState;
    this.emit('local');
  }

  /** Remote state from BroadcastChannel / storage event. Idempotent. Returns true if anything changed. */
  receive(remote: Partial<VersionedState>): boolean {
    this.clock = Math.max(this.clock, maxClock(remote)); // Lamport receive rule
    const merged = mergeState(this.state, remote);
    if (sameState(merged, this.state)) return false;
    this.state = merged;
    this.emit('remote');
    return true;
  }

  private emit(origin: Origin): void {
    this.listeners.forEach((fn) => fn(this.state, origin));
  }
}