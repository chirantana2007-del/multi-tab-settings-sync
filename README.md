# Multi-Tab Settings Sync

TypeScript + Vite app that syncs dark mode, language and font size across browser tabs in real time.

## Run
npm install
npm run dev     # open in 2+ tabs
npm test        # unit tests for the conflict-resolution logic
npm run build   # production build into dist/

## How synchronization works
- Transport: `BroadcastChannel` (typically well under 5 ms). `localStorage` `storage` events are a fallback.
- Every message carries the full versioned state, so a tab that missed a message self-heals on the next one.
- Tabs that were backgrounded re-read storage on `visibilitychange` / `pageshow`.
- The "Last sync" badge shows measured end-to-end latency (send -> merge -> DOM update).

## Conflict resolution
- Each setting is stored as `{ value, clock, tabId }`, where `clock` is a Lamport counter.
- Local edit: `clock = max(seen) + 1`. Receive: `clock = max(local, remote)`.
- Merge is per key. The higher clock wins; ties go to the higher `tabId`.
- This merge is commutative, associative and idempotent, so tabs converge to the same values
  regardless of message order or duplication. "Simulate conflict" demonstrates this.
- Lamport clocks avoid reliance on wall-clock time, which can differ or jump.

## Persistence & initialization
- Latest state is saved to `localStorage` (read-merge-write) and restored on reopen.
- A tiny inline script in `<head>` applies theme, font size and language before first paint (no flash).
- Stored/received data is validated before use.

## Structure
src/merge.ts (pure merge logic) · store.ts · sync.ts · persistence.ts · ui.ts · i18n.ts · main.ts