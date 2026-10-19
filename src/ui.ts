import { t, type Key } from './i18n';
import type { Lang, Settings, Theme } from './types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let currentLang: Lang = 'en';
let lastMs: number | null = null;

interface Handlers {
  onTheme(v: Theme): void;
  onLang(v: Lang): void;
  onFont(v: number): void;
  onConflict(): void;
}

export function initUI(h: Handlers, tabId: string): void {
  $<HTMLInputElement>('theme').addEventListener('change', (e) =>
    h.onTheme((e.target as HTMLInputElement).checked ? 'dark' : 'light'));
  $<HTMLSelectElement>('lang').addEventListener('change', (e) =>
    h.onLang((e.target as HTMLSelectElement).value as Lang));
  // `input` (not `change`) so other tabs follow live while dragging
  $<HTMLInputElement>('fontSize').addEventListener('input', (e) =>
    h.onFont(Number((e.target as HTMLInputElement).value)));
  $<HTMLButtonElement>('conflict').addEventListener('click', h.onConflict);
  $('tabBadge').textContent = `Tab ${tabId}`;
}

export function render(s: Settings): void {
  currentLang = s.lang;
  const root = document.documentElement;
  root.dataset.theme = s.theme;
  root.lang = s.lang;
  root.style.setProperty('--font-size', `${s.fontSize}px`);

  $<HTMLInputElement>('theme').checked = s.theme === 'dark';
  $<HTMLSelectElement>('lang').value = s.lang;
  $<HTMLInputElement>('fontSize').value = String(s.fontSize);
  $('fontOut').textContent = `${s.fontSize}px`;

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(s.lang, el.dataset.i18n as Key);
  });
  paintLatency();
  root.dataset.ready = '1'; // reveal UI only after first correct render
}

export function showLatency(ms: number | null): void {
  if (ms !== null) lastMs = ms;
  paintLatency();
}

function paintLatency(): void {
  const el = $('latency');
  el.textContent =
    lastMs === null ? t(currentLang, 'noSync') : `${t(currentLang, 'lastSync')}: ${lastMs.toFixed(1)} ms`;
  el.classList.toggle('ok', lastMs !== null && lastMs < 100);
}

export function log(msg: string): void {
  const ul = $('log');
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString()}  ${msg}`;
  ul.prepend(li);
  while (ul.children.length > 6) ul.lastElementChild?.remove();
}