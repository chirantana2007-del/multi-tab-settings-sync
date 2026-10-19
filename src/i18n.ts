import type { Lang } from './types';

const en = {
  title: 'Settings Sync',
  subtitle: 'Change a setting here and watch every other open tab update.',
  darkMode: 'Dark mode',
  language: 'Language',
  fontSize: 'Font size',
  sample: 'The quick brown fox jumps over the lazy dog.',
  lastSync: 'Last sync',
  noSync: 'No remote update yet',
  simulate: 'Simulate conflict',
};
export type Key = keyof typeof en;

const dict: Record<Lang, Record<Key, string>> = {
  en,
  hi: {
    title: 'सेटिंग्स सिंक',
    subtitle: 'यहाँ कोई सेटिंग बदलें और देखें कि बाकी सभी खुले टैब अपने-आप अपडेट हो जाते हैं।',
    darkMode: 'डार्क मोड',
    language: 'भाषा',
    fontSize: 'फ़ॉन्ट आकार',
    sample: 'यह एक नमूना वाक्य है जिससे फ़ॉन्ट और भाषा का असर दिखता है।',
    lastSync: 'अंतिम सिंक',
    noSync: 'अभी तक कोई अपडेट नहीं मिला',
    simulate: 'टकराव का अनुकरण करें',
  },
  ta: {
    title: 'அமைப்புகள் ஒத்திசைவு',
    subtitle: 'இங்கே ஒரு அமைப்பை மாற்றுங்கள்; திறந்திருக்கும் மற்ற எல்லா தாவல்களும் தானாகவே புதுப்பிக்கப்படுவதைப் பாருங்கள்.',
    darkMode: 'இருண்ட பயன்முறை',
    language: 'மொழி',
    fontSize: 'எழுத்துரு அளவு',
    sample: 'எழுத்துரு மற்றும் மொழி மாற்றத்தைக் காட்டும் ஒரு மாதிரி வாக்கியம் இது.',
    lastSync: 'கடைசி ஒத்திசைவு',
    noSync: 'இன்னும் புதுப்பிப்பு வரவில்லை',
    simulate: 'மோதலை உருவகப்படுத்து',
  },
  es: {
    title: 'Sincronización de ajustes',
    subtitle: 'Cambia un ajuste aquí y mira cómo se actualizan todas las demás pestañas abiertas.',
    darkMode: 'Modo oscuro',
    language: 'Idioma',
    fontSize: 'Tamaño de fuente',
    sample: 'Esta es una frase de ejemplo para ver el efecto de la fuente y el idioma.',
    lastSync: 'Última sincronización',
    noSync: 'Aún no hay actualizaciones remotas',
    simulate: 'Simular conflicto',
  },
};

export const t = (lang: Lang, key: Key): string => dict[lang][key];
