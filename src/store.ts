import { KEYS, maxClock, mergeState, sameState } from './merge';
import type { SettingKey, Settings, Versioned, VersionedState } from './types';

export type Origin = 'local' | 'remote';
/** `changed` = the settings whose VALUE changed in this update. */
type Listener = (state: VersionedState, origin: Origin, changed: SettingKey[]) => void;

interface HistoryEntry {
  from: Partial<Settings>;
  to: Partial<Settings>;
  at: number;
}

const COALESCE_MS = 700; // slider drags become ONE undo step
const MAX_HISTORY = 50;

export class Store {
  private state: VersionedState;
  private clock: number;
  private listeners = new Set<Listener>();
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

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
      accent: this.state.accent.value,
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

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Local edit of one or more settings. Each changed key gets its own fresh
   * Lamport clock, so the edit syncs and merges like any other.
   * Returns true if anything actually changed.
   */
  setMany(patch: Partial<Settings>, record = true): boolean {
    const next = { ...this.state } as Record<SettingKey, Versioned<unknown>>;
    const from: Record<string, unknown> = {};
    const to: Record<string, unknown> = {};
    const changed: SettingKey[] = [];

    for (const k of KEYS) {
      const value = patch[k];
      if (value === undefined || value === this.state[k].value) continue;
      from[k] = this.state[k].value;
      to[k] = value;
      next[k] = { value, clock: this.nextClock(), tabId: this.tabId };
      changed.push(k);
    }
    if (changed.length === 0) return false;

    this.state = next as unknown as VersionedState;
    if (record) this.record(from as Partial<Settings>, to as Partial<Settings>, changed);
    this.emit('local', changed);
    return true;
  }

  /**
   * Undo/redo are NEW edits (fresh clock), not rewinds. That is what makes
   * them sync correctly to other tabs. History is per tab.
   */
  undo(): void {
    const e = this.undoStack.pop();
    if (!e) return;
    this.redoStack.push(e);
    if (!this.setMany(e.from, false)) this.emit('local', []);
  }

  redo(): void {
    const e = this.redoStack.pop();
    if (!e) return;
    this.undoStack.push(e);
    if (!this.setMany(e.to, false)) this.emit('local', []);
  }

  /** Remote state from BroadcastChannel / storage event. Idempotent. Returns true if a value changed. */
  receive(remote: Partial<VersionedState>): boolean {
    this.clock = Math.max(this.clock, maxClock(remote)); // Lamport receive rule
    const merged = mergeState(this.state, remote);
    if (sameState(merged, this.state)) return false;

    const changed = KEYS.filter((k) => merged[k].value !== this.state[k].value);
    this.state = merged;
    if (changed.length === 0) return false; // only clock/author metadata moved
    this.emit('remote', changed);
    return true;
  }

  private record(from: Partial<Settings>, to: Partial<Settings>, changed: SettingKey[]): void {
    const now = performance.now();
    const top = this.undoStack[this.undoStack.length - 1];
    const dragging =
      top !== undefined &&
      changed.length === 1 &&
      changed[0] === 'fontSize' &&
      Object.keys(top.to).join() === 'fontSize' &&
      now - top.at < COALESCE_MS;

    if (dragging && top) {
      top.to = to; // keep the ORIGINAL `from`, so undo jumps back to before the drag
      top.at = now;
    } else {
      this.undoStack.push({ from, to, at: now });
      if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    }
    this.redoStack = [];
  }

  private emit(origin: Origin, changed: SettingKey[]): void {
    this.listeners.forEach((fn) => fn(this.state, origin, changed));
  }
}