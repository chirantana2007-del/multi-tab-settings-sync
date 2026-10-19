# Multi-Tab Settings Sync
A TypeScript web app that keeps user preferences in sync across every open browser tab in real time. Change a setting in one tab and the others update without a refresh, with a visible latency measurement and deterministic conflict resolution.

**Deployment link** https://multi-tab-settings-sync-b6e9wc1v6-chaabi3.vercel.app

## Features

**Required**
- Dark mode toggle, language selector (English, Hindi, Tamil, Spanish, Urdu) and font-size slider
- Changes propagate to all open tabs in real time (target: under 100 ms)
- Settings persist after all tabs close and are restored on reopen
- New tabs load the correct theme with no flash of the wrong one
- Simultaneous edits resolve deterministically, so all tabs converge

**Extras**
- Accent color picker, a fourth synced setting
- Undo/redo (buttons, `Ctrl+Z`, `Ctrl+Y`), also synced across tabs
- Reset to defaults, and export/import of settings as a JSON file
- Right-to-left layout for Urdu
- Live "Tabs connected" counter
- "Updated from tab X" highlight when another tab changes a setting
- "Simulate conflict" button that demonstrates the merge rule
- Measured sync latency shown in the page ("Last sync: x ms")

## Getting started

Requires Node.js 18 or newer.

```bash
npm install
npm run dev       # open the printed URL in two or more tabs
npm test          # unit tests (merge logic and store)
npm run build     # type-check and production build into dist/
```

## How synchronization works

- **Transport:** `BroadcastChannel` delivers messages between tabs in typically a few milliseconds. The `storage` event on `localStorage` is a fallback for browsers without it.
- **Full-state messages:** every message carries the complete versioned state, so a tab that missed an update repairs itself on the next one.
- **Sleeping tabs:** background tabs re-read storage on `visibilitychange` and `pageshow`.
- **Latency measurement:** the sender stamps each message, and the receiver measures send, merge and DOM update, shown in the "Last sync" badge.
- **Live dragging:** the font slider broadcasts on every step so other tabs follow while you drag, while saving to storage is batched.

## Conflict resolution

Each setting is stored as `{ value, clock, tabId }`, where `clock` is a Lamport counter.

1. A local edit sets `clock = max(clock seen) + 1`.
2. On receiving state, a tab sets its counter to `max(local, remote)`.
3. Per setting, the **higher clock wins**. If the clocks tie, the **higher `tabId` wins**.

This rule is commutative, associative and idempotent, so every tab ends up with the same values regardless of message order or duplication. Merging is per setting, so edits to different settings never overwrite each other.
**Undo and redo** are new edits with fresh clocks, not rewinds, so they sync and merge by the same rules. History is kept per tab.

The pure merge logic lives in `src/merge.ts` and is covered by unit tests, including a delivery-order convergence test.

## Persistence and initialization
- The latest state is saved to `localStorage` using read-merge-write, so two tabs saving at once cannot drop each other's changes.
- A small inline script in `<head>` applies theme, accent, font size, language and text direction before the first paint, which prevents a flash of the wrong theme.
- Anything read from storage or received over the channel is validated and discarded if malformed.

## Project structure
```
index.html            page markup + anti-flash inline script
src/
  main.ts             wires store, sync and UI together
  types.ts            settings and versioned-value types
  merge.ts            conflict-resolution logic (pure functions)
  store.ts            state, Lamport clock, undo/redo
  sync.ts             BroadcastChannel + storage fallback
  persistence.ts      localStorage load/save
  tabs.ts             tab counter (heartbeat messages)
  io.ts               settings export/import
  ui.ts               DOM rendering and controls
  i18n.ts             translations
  style.css           theming and layout
tests/
  merge.test.ts       conflict resolution and import validation
  store.test.ts       undo/redo and remote updates
```

## Design decisions and limitations
- Vanilla TypeScript with a small hand-written store keeps the sync logic visible and the bundle tiny.
- The tab counter uses heartbeats. Browsers throttle timers in long-hidden tabs, so such a tab can briefly drop off the count until you switch back to it.
- Undo history is per tab, by design.
- If `localStorage` is unavailable (for example in some private modes), sync still works through `BroadcastChannel`, but settings will not persist after closing.
- Possible next steps: a latency graph, a browser-level end-to-end test (Playwright), and cross-device sync.

## Tech stack

TypeScript, Vite, Vitest, and the browser's BroadcastChannel and localStorage APIs.