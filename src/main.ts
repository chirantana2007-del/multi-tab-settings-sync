import './style.css';
import { mergeState } from './merge';
import { loadState, readStored, saveState } from './persistence';
import { Store } from './store';
import { Sync, now } from './sync';
import { initUI, log, render, showLatency } from './ui';
import type { VersionedState } from './types';

const tabId = Math.random().toString(36).slice(2, 8);
const store = new Store(loadState(), tabId);

// Read-merge-write so two tabs saving at once can't drop each other's keys
const persist = (s: VersionedState) => saveState(mergeState(s, readStored()));

const sync = new Sync((remote, sentAt) => {
  if (store.receive(remote)) {
    // end-to-end: message transit + merge + DOM update (render runs inside receive)
    const latency = sentAt === null ? null : now() - sentAt;
    showLatency(latency);
    log(latency === null ? 'Remote update applied (storage)' : `Remote update applied in ${latency.toFixed(1)} ms`);
  }
});

store.subscribe((_state, origin) => {
  render(store.values());
  if (origin === 'local') {
    persist(store.get());
    sync.broadcast(store.get()); // full state: a tab that missed a message self-heals
  }
});

initUI(
  {
    onTheme: (v) => store.set('theme', v),
    onLang: (v) => store.set('lang', v),
    onFont: (v) => store.set('fontSize', v),
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

render(store.values());