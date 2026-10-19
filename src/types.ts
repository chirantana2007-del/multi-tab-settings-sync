export const LANGS = ['en', 'hi', 'ta', 'es', 'ur'] as const;
export type Lang = (typeof LANGS)[number];
export const RTL_LANGS: readonly Lang[] = ['ur'];

export const ACCENTS = ['blue', 'green', 'purple', 'orange', 'pink'] as const;
export type Accent = (typeof ACCENTS)[number];

export type Theme = 'light' | 'dark';

export const FONT_MIN = 12;
export const FONT_MAX = 28;

export interface Settings {
  theme: Theme;
  lang: Lang;
  fontSize: number;
  accent: Accent;
}
export type SettingKey = keyof Settings;

/** Every setting carries its own Lamport clock + author tab id. */
export interface Versioned<T> {
  value: T;
  clock: number;
  tabId: string;
}

export type VersionedState = { [K in SettingKey]: Versioned<Settings[K]> };