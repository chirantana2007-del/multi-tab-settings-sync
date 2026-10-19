import './style.css';
import { exportSettings, readSettingsFile } from './io';
import { mergeState } from './merge';
import { defaultSettings, loadState, readStored, saveState } from './persistence';
import { Store } from './store';
import { Sync, now } from './sync';
import { TabTracker } from './tabs';
import { flash, initUI, log, render, showLatency, showTabs } from './ui';
import type { VersionedState } from './types';

const tabId = Math.random().toString(36).slice(2, 8);
const store = new Store(loadState(), tabId);

// Read-merge-write so two tabs saving at once can't drop each other's keys
const persist = (s: VersionedState) => saveState(mergeState(s, readStored()));

const paint = () =>
  render(store.values(), { undo: store.canUndo(), redo: store.canRedo() });

const sync = new Sync((remote, sentAt) => {
  if (store.receive(remote)) {
    // end-to-end: message transit + merge + DOM update (render runs inside receive)
    const latency = sentAt === null ? null : now() - sentAt;
    showLatency(latency);
    log(latency === null ? 'Remote update applied (storage)' : `Remote update applied in ${latency.toFixed(1)} ms`);
  }
});

store.subscribe((state, origin, changed) => {
  paint();
  if (origin === 'remote') {
    for (const k of changed) flash(k, state[k].tabId);
  } else {
    persist(state);
    sync.broadcast(state); // full state: a tab that missed a message self-heals
  }
});

new TabTracker(tabId, showTabs);

initUI(
  {
    onTheme: (v) => store.setMany({ theme: v }),
    onLang: (v) => store.setMany({ lang: v }),
    onFont: (v) => store.setMany({ fontSize: v }),
    onAccent: (v) => store.setMany({ accent: v }),
    onUndo: () => store.undo(),
    onRedo: () => store.redo(),
    onReset: () => {
      store.setMany(defaultSettings());
      log('Reset to defaults (undoable)');
    },
    onExport: () => {
      exportSettings(store.values());
      log('Settings exported to settings.json');
    },
    onImport: async (file) => {
      try {
        const parsed = await readSettingsFile(file);
        const n = Object.keys(parsed).length;
        if (n === 0) {
          log('Import failed: no valid settings found in that file');
          return;
        }
        store.setMany(parsed);
        log(`Imported ${n} setting(s) (undoable)`);
      } catch {
        log('Import failed: not a valid settings file');
      }
    },
    onConflict: () => {
      // Two edits to the same key with the SAME clock, from two different "tabs".
      const clock = store.nextClock();
      const a: Partial<VersionedState> = { theme: { value: 'dark', clock, tabId: 'sim-a' } };
      const b: Partial<VersionedState> = { theme: { value: 'light', clock, tabId: 'sim-b' } };

      // Other tabs get a then b; this tab gets b then a. Order must not matter.
      sync.broadcast(a);
      sync.broadcast(b);
      store.receive(b);
      store.receive(a);
      persist(store.get());
      sync.broadcast(store.get());
      log('Conflict: dark vs light at same clock -> tabId tie-break -> everyone converges on "light"');
    },
  },
  tabId,
);

// Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y = redo
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); }
  else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); store.redo(); }
});

paint();