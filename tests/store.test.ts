import { describe, expect, it } from 'vitest';
import { Store } from '../src/store';
import type { SettingKey, Versioned, VersionedState } from '../src/types';

const v = <T>(value: T, clock: number, tabId: string): Versioned<T> => ({ value, clock, tabId });

const fresh = (): Store => {
  const s: VersionedState = {
    theme: v('light', 0, ''),
    lang: v('en', 0, ''),
    fontSize: v(16, 0, ''),
    accent: v('blue', 0, ''),
  };
  return new Store(s, 'tab-t');
};

describe('undo / redo', () => {
  it('undo restores the previous value and redo reapplies it', () => {
    const s = fresh();
    s.setMany({ theme: 'dark' });
    expect(s.values().theme).toBe('dark');
    s.undo();
    expect(s.values().theme).toBe('light');
    s.redo();
    expect(s.values().theme).toBe('dark');
  });

  it('a new edit clears the redo stack', () => {
    const s = fresh();
    s.setMany({ theme: 'dark' });
    s.undo();
    expect(s.canRedo()).toBe(true);
    s.setMany({ lang: 'hi' });
    expect(s.canRedo()).toBe(false);
  });

  it('undo is a NEW edit with a higher clock (so other tabs accept it)', () => {
    const s = fresh();
    s.setMany({ theme: 'dark' });
    const before = s.get().theme.clock;
    s.undo();
    expect(s.get().theme.clock).toBeGreaterThan(before);
  });

  it('a multi-setting change (like reset) undoes as one step', () => {
    const s = fresh();
    s.setMany({ theme: 'dark', lang: 'es', accent: 'pink' });
    s.undo();
    expect(s.values()).toEqual({ theme: 'light', lang: 'en', fontSize: 16, accent: 'blue' });
    expect(s.canUndo()).toBe(false);
  });

  it('a slider drag collapses into one undo step', () => {
    const s = fresh();
    s.setMany({ fontSize: 18 });
    s.setMany({ fontSize: 20 });
    s.setMany({ fontSize: 22 });
    s.undo();
    expect(s.values().fontSize).toBe(16);
    expect(s.canUndo()).toBe(false);
  });
});

describe('receive', () => {
  it('reports which settings changed and where the update came from', () => {
    const s = fresh();
    const seen: { origin: string; keys: SettingKey[] }[] = [];
    s.subscribe((_st, origin, keys) => seen.push({ origin, keys }));

    const changed = s.receive({ theme: v('dark', 5, 'other') });
    expect(changed).toBe(true);
    expect(seen).toEqual([{ origin: 'remote', keys: ['theme'] }]);
    expect(s.get().theme.tabId).toBe('other');
  });

  it('ignores an update that changes nothing', () => {
    const s = fresh();
    s.receive({ theme: v('dark', 5, 'other') });
    expect(s.receive({ theme: v('dark', 5, 'other') })).toBe(false);
  });
});