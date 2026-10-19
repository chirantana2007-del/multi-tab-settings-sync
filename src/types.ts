export const LANGS = ['en', 'hi', 'ta', 'es'] as const;
export type Lang = (typeof LANGS)[number];
export type Theme = 'light' | 'dark';

export const FONT_MIN = 12;
export const FONT_MAX = 28;

export interface Settings {
  theme: Theme;
  lang: Lang;
  fontSize: number;
}
export type SettingKey = keyof Settings;

/** Every setting carries its own Lamport clock + author tab id. */
export interface Versioned<T> {
  value: T;
  clock: number;
  tabId: string;
}

export type VersionedState = { [K in SettingKey]: Versioned<Settings[K]> };
