import {
  ACCENTS, FONT_MAX, FONT_MIN, LANGS,
  type SettingKey, type Settings, type Versioned, type VersionedState,
} from './types';

export const KEYS: SettingKey[] = ['theme', 'lang', 'fontSize', 'accent'];

/**
 * Deterministic winner between two versions of ONE setting.
 * 1. higher Lamport clock wins
 * 2. tie -> lexicographically higher tabId wins
 * 3. (impossible in practice) same clock + same tab -> compare serialized value
 */
export function pickWinner<T>(a: Versioned<T>, b: Versioned<T>): Versioned<T> {
  if (a.clock !== b.clock) return a.clock > b.clock ? a : b;
  if (a.tabId !== b.tabId) return a.tabId > b.tabId ? a : b;
  return JSON.stringify(a.value) >= JSON.stringify(b.value) ? a : b;
}

/** Per-key merge, so edits to DIFFERENT settings never clobber each other. */
export function mergeState(
  local: VersionedState,
  remote: Partial<VersionedState>,
): VersionedState {
  const out = { ...local } as Record<SettingKey, Versioned<unknown>>;
  for (const k of KEYS) {
    const r = remote[k] as Versioned<unknown> | undefined;
    if (r) out[k] = pickWinner(local[k] as Versioned<unknown>, r);
  }
  return out as unknown as VersionedState;
}

export function maxClock(s: Partial<VersionedState>): number {
  let m = 0;
  for (const k of KEYS) m = Math.max(m, s[k]?.clock ?? 0);
  return m;
}

export function sameState(a: VersionedState, b: VersionedState): boolean {
  return KEYS.every(
    (k) =>
      a[k].clock === b[k].clock &&
      a[k].tabId === b[k].tabId &&
      a[k].value === b[k].value,
  );
}

const validators: Record<SettingKey, (v: unknown) => boolean> = {
  theme: (v) => v === 'light' || v === 'dark',
  lang: (v) => (LANGS as readonly unknown[]).includes(v),
  fontSize: (v) =>
    typeof v === 'number' && Number.isFinite(v) && v >= FONT_MIN && v <= FONT_MAX,
  accent: (v) => (ACCENTS as readonly unknown[]).includes(v),
};

/** Never trust storage or channel data: validate and drop anything malformed. */
export function sanitize(raw: unknown): Partial<VersionedState> {
  const out: Record<string, unknown> = {};
  if (typeof raw !== 'object' || raw === null) return {};
  for (const k of KEYS) {
    const e = (raw as Record<string, unknown>)[k] as Record<string, unknown> | undefined;
    if (
      e && typeof e === 'object' &&
      validators[k](e.value) &&
      Number.isInteger(e.clock) && (e.clock as number) >= 0 &&
      typeof e.tabId === 'string'
    ) {
      out[k] = { value: e.value, clock: e.clock, tabId: e.tabId };
    }
  }
  return out as Partial<VersionedState>;
}

/**
 * Parse an imported settings file. Accepts either the exported format
 * ({ app, version, settings: {...} }) or a bare { theme, lang, ... } object.
 * Invalid or unknown values are silently dropped.
 */
export function parseImported(raw: unknown): Partial<Settings> {
  if (typeof raw !== 'object' || raw === null) return {};
  const obj = raw as Record<string, unknown>;
  const src =
    typeof obj.settings === 'object' && obj.settings !== null
      ? (obj.settings as Record<string, unknown>)
      : obj;
  const out: Record<string, unknown> = {};
  for (const k of KEYS) {
    const v = src[k];
    if (v !== undefined && validators[k](v)) out[k] = v;
  }
  return out as Partial<Settings>;
}