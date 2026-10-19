import { mergeState, sanitize } from './merge';
import type { Settings, VersionedState } from './types';

export const STORAGE_KEY = 'gdg-settings-v1';

/** Plain default values (also used by "Reset to defaults"). */
export function defaultSettings(): Settings {
  const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  return { theme: dark ? 'dark' : 'light', lang: 'en', fontSize: 16, accent: 'blue' };
}

export function defaultState(): VersionedState {
  const d = defaultSettings();
  return {
    theme: { value: d.theme, clock: 0, tabId: '' },
    lang: { value: d.lang, clock: 0, tabId: '' },
    fontSize: { value: d.fontSize, clock: 0, tabId: '' },
    accent: { value: d.accent, clock: 0, tabId: '' },
  };
}

export function readStored(): Partial<VersionedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function loadState(): VersionedState {
  return mergeState(defaultState(), readStored());
}

export function saveState(state: VersionedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota: sync still works via BroadcastChannel */
  }
}