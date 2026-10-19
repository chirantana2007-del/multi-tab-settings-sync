import { mergeState, sanitize } from './merge';
import type { VersionedState } from './types';

export const STORAGE_KEY = 'gdg-settings-v1';

export function defaultState(): VersionedState {
  const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  return {
    theme: { value: dark ? 'dark' : 'light', clock: 0, tabId: '' },
    lang: { value: 'en', clock: 0, tabId: '' },
    fontSize: { value: 16, clock: 0, tabId: '' },
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
