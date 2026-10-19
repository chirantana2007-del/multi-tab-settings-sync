import { parseImported } from './merge';
import type { Settings } from './types';

export function exportSettings(s: Settings): void {
  const payload = { app: 'gdg-settings-sync', version: 1, settings: s };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'settings.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Throws if the file is not valid JSON; returns only validated settings. */
export async function readSettingsFile(file: File): Promise<Partial<Settings>> {
  const text = await file.text();
  return parseImported(JSON.parse(text));
}