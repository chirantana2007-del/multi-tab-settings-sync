import { t, type Key } from './i18n';
import {
  RTL_LANGS,
  type Accent, type Lang, type SettingKey, type Settings, type Theme,
} from './types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let currentLang: Lang = 'en';
let renderedLang: Lang | null = null; // labels are only rewritten when this changes
let lastMs: number | null = null;
let tabCount = 1;
const flashTimers = new Map<SettingKey, number>();

interface Handlers {
  onTheme(v: Theme): void;
  onLang(v: Lang): void;
  onFont(v: number): void;
  onAccent(v: Accent): void;
  onConflict(): void;
  onUndo(): void;
  onRedo(): void;
  onReset(): void;
  onExport(): void;
  onImport(file: File): void;
}

export function initUI(h: Handlers, tabId: string): void {
  $<HTMLInputElement>('theme').addEventListener('change', (e) =>
    h.onTheme((e.target as HTMLInputElement).checked ? 'dark' : 'light'));
  $<HTMLSelectElement>('lang').addEventListener('change', (e) =>
    h.onLang((e.target as HTMLSelectElement).value as Lang));

  const font = $<HTMLInputElement>('fontSize');

  // keyboard (arrow keys) keeps the native behaviour
  font.addEventListener('input', (e) =>
    h.onFont(Number((e.target as HTMLInputElement).value)));

  // Relative drag: value = value at grab + how far the cursor moved.
  // The card can grow in every direction without the thumb jumping.
  font.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    font.focus();
    font.setPointerCapture(e.pointerId);

    const min = Number(font.min);
    const max = Number(font.max);
    const startX = e.clientX;
    let startVal = Number(font.value);
    const rect = font.getBoundingClientRect(); // measured once
    const trackW = rect.width || 240;
    const dir = document.documentElement.dir === 'rtl' ? -1 : 1;

    let pending = startVal;
    let raf = 0;
    const flush = () => { raf = 0; h.onFont(pending); };

    // grabbing the track away from the thumb jumps there first, then drags
    const f = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const grabbed = Math.round(min + (dir === 1 ? f : 1 - f) * (max - min));
    if (Math.abs(grabbed - startVal) > 1) {
      h.onFont(grabbed);
      startVal = grabbed;
      pending = grabbed;
    }

    const move = (ev: PointerEvent) => {
      const delta = ((ev.clientX - startX) / trackW) * (max - min) * dir;
      pending = Math.round(Math.min(max, Math.max(min, startVal + delta)));
      if (!raf) raf = requestAnimationFrame(flush); // at most one update per frame
    };
    const stop = () => {
      font.removeEventListener('pointermove', move);
      font.removeEventListener('pointerup', stop);
      font.removeEventListener('pointercancel', stop);
      if (raf) { cancelAnimationFrame(raf); flush(); }
    };

    font.addEventListener('pointermove', move);
    font.addEventListener('pointerup', stop);
    font.addEventListener('pointercancel', stop);
  });

  document.querySelectorAll<HTMLButtonElement>('.swatch').forEach((b) =>
    b.addEventListener('click', () => h.onAccent(b.dataset.accent as Accent)));

  $<HTMLButtonElement>('conflict').addEventListener('click', h.onConflict);
  $<HTMLButtonElement>('undo').addEventListener('click', h.onUndo);
  $<HTMLButtonElement>('redo').addEventListener('click', h.onRedo);
  $<HTMLButtonElement>('reset').addEventListener('click', h.onReset);
  $<HTMLButtonElement>('export').addEventListener('click', h.onExport);

  const file = $<HTMLInputElement>('importFile');
  $<HTMLButtonElement>('import').addEventListener('click', () => file.click());
  file.addEventListener('change', () => {
    const f = file.files?.[0];
    if (f) h.onImport(f);
    file.value = ''; // allow importing the same file twice
  });

  $('tabBadge').textContent = `Tab ${tabId}`;
}

export function render(s: Settings, hist: { undo: boolean; redo: boolean }): void {
  currentLang = s.lang;
  const root = document.documentElement;
  root.dataset.theme = s.theme;
  root.dataset.accent = s.accent;
  root.lang = s.lang;
  root.dir = RTL_LANGS.includes(s.lang) ? 'rtl' : 'ltr';
  root.style.setProperty('--font-size', `${s.fontSize}px`);

  $<HTMLInputElement>('theme').checked = s.theme === 'dark';
  $<HTMLSelectElement>('lang').value = s.lang;
  $<HTMLInputElement>('fontSize').value = String(s.fontSize);
  $('fontOut').textContent = `${s.fontSize}px`;

  document.querySelectorAll<HTMLButtonElement>('.swatch').forEach((b) =>
    b.setAttribute('aria-checked', String(b.dataset.accent === s.accent)));

  $<HTMLButtonElement>('undo').disabled = !hist.undo;
  $<HTMLButtonElement>('redo').disabled = !hist.redo;

  // only retranslate when the language changed (keeps slider dragging light)
  if (renderedLang !== s.lang) {
    renderedLang = s.lang;
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
      el.textContent = t(s.lang, el.dataset.i18n as Key);
    });
    paintLatency();
    paintTabs();
  }
  root.dataset.ready = '1'; // reveal UI only after first correct render
}

/** Briefly highlight a control that was changed by ANOTHER tab. */
export function flash(key: SettingKey, fromTab: string): void {
  const row = document.querySelector<HTMLElement>(`[data-key="${key}"]`);
  if (!row) return;
  const note = row.querySelector<HTMLElement>('.from');
  if (note) note.textContent = `${t(currentLang, 'updatedFrom')}: ${fromTab}`;

  row.classList.remove('flash');
  void row.offsetWidth; // restart the CSS animation
  row.classList.add('flash');

  window.clearTimeout(flashTimers.get(key));
  flashTimers.set(
    key,
    window.setTimeout(() => {
      row.classList.remove('flash');
      if (note) note.textContent = '';
    }, 2500),
  );
}

export function showLatency(ms: number | null): void {
  if (ms !== null) lastMs = ms;
  paintLatency();
}

export function showTabs(n: number): void {
  tabCount = n;
  paintTabs();
}

function paintLatency(): void {
  const el = $('latency');
  el.textContent =
    lastMs === null
      ? t(currentLang, 'noSync')
      : `${t(currentLang, 'lastSync')}: \u2066${lastMs.toFixed(1)} ms\u2069`;
  el.classList.toggle('ok', lastMs !== null && lastMs < 100);
}

function paintTabs(): void {
  $('tabsBadge').textContent = `${t(currentLang, 'tabs')}: ${tabCount}`;
}

export function log(msg: string): void {
  const ul = $('log');
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString()}  ${msg}`;
  ul.prepend(li);
  while (ul.children.length > 6) ul.lastElementChild?.remove();
}