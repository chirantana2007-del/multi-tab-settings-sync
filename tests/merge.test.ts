import { describe, expect, it } from 'vitest';
import { mergeState, parseImported, pickWinner } from '../src/merge';
import type { Versioned, VersionedState } from '../src/types';

const v = <T>(value: T, clock: number, tabId: string): Versioned<T> => ({
  value,
  clock,
  tabId,
});

const base: VersionedState = {
  theme: v('light', 0, ''),
  lang: v('en', 0, ''),
  fontSize: v(16, 0, ''),
  accent: v('blue', 0, ''),
};

describe('pickWinner', () => {
  it('higher clock wins', () => {
    expect(pickWinner(v('dark', 2, 'a'), v('light', 1, 'z')).value).toBe('dark');
  });

  it('ties are broken by tabId', () => {
    expect(pickWinner(v('dark', 1, 'a'), v('light', 1, 'b')).value).toBe('light');
  });

  it('is commutative', () => {
    const x = v('dark', 3, 'a');
    const y = v('light', 3, 'b');
    expect(pickWinner(x, y)).toEqual(pickWinner(y, x));
  });
});

describe('mergeState', () => {
  it('different keys do not clobber each other', () => {
    const fromA: Partial<VersionedState> = { theme: v('dark', 1, 'a') };
    const fromB: Partial<VersionedState> = { lang: v('hi', 1, 'b') };
    const merged = mergeState(mergeState(base, fromA), fromB);
    expect(merged.theme.value).toBe('dark');
    expect(merged.lang.value).toBe('hi');
  });

  it('converges regardless of delivery order', () => {
    const e1: Partial<VersionedState> = {
      theme: v('dark', 1, 'tab-a'),
      fontSize: v(20, 2, 'tab-a'),
      accent: v('green', 3, 'tab-a'),
    };
    const e2: Partial<VersionedState> = {
      theme: v('light', 1, 'tab-b'),
      fontSize: v(14, 2, 'tab-b'),
      accent: v('pink', 3, 'tab-b'),
    };
    const ab = mergeState(mergeState(base, e1), e2);
    const ba = mergeState(mergeState(base, e2), e1);
    expect(ab).toEqual(ba);
    expect(ab.theme.value).toBe('light'); // same clock -> higher tabId wins
    expect(ab.fontSize.value).toBe(14);
    expect(ab.accent.value).toBe('pink');
  });

  it('is idempotent', () => {
    const e: Partial<VersionedState> = { theme: v('dark', 1, 'a') };
    const once = mergeState(base, e);
    expect(mergeState(once, e)).toEqual(once);
  });
});

describe('parseImported', () => {
  it('keeps valid values and drops invalid ones', () => {
    expect(parseImported({ theme: 'dark', lang: 'xx', fontSize: 99, accent: 'pink' }))
      .toEqual({ theme: 'dark', accent: 'pink' });
  });

  it('accepts the exported file format', () => {
    const file = { app: 'gdg-settings-sync', version: 1, settings: { lang: 'ur', fontSize: 20 } };
    expect(parseImported(file)).toEqual({ lang: 'ur', fontSize: 20 });
  });

  it('returns nothing for junk input', () => {
    expect(parseImported(null)).toEqual({});
    expect(parseImported('hello')).toEqual({});
    expect(parseImported(42)).toEqual({});
  });
});