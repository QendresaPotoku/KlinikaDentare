import sq from './sq';
import en from './en';
import de from './de';

/** The site is built for exactly these three languages. */
export const languages = ['sq', 'en', 'de'] as const;
export type Lang = (typeof languages)[number];
export const defaultLang: Lang = 'sq';

export const languageNames: Record<Lang, string> = {
  sq: 'Shqip',
  en: 'English',
  de: 'Deutsch',
};

export const htmlLang: Record<Lang, string> = { sq: 'sq', en: 'en', de: 'de' };

export type Dictionary = typeof sq;
const dictionaries: Record<Lang, Dictionary> = { sq, en, de };

export function useT(lang: Lang): Dictionary {
  return dictionaries[lang];
}

export function isLang(value: string | undefined): value is Lang {
  return !!value && (languages as readonly string[]).includes(value);
}

/** Localised URL segments for secondary pages. */
export const segments: Record<Lang, { treatments: string; diaspora: string; gallery: string; team: string }> = {
  sq: { treatments: 'trajtimet', diaspora: 'turizmi-dentar', gallery: 'galeria', team: 'ekipi' },
  en: { treatments: 'treatments', diaspora: 'dental-tourism', gallery: 'gallery', team: 'team' },
  de: { treatments: 'behandlungen', diaspora: 'zahntourismus', gallery: 'galerie', team: 'team' },
};

export const paths = {
  home: (lang: Lang) => `/${lang}/`,
  treatments: (lang: Lang) => `/${lang}/${segments[lang].treatments}/`,
  treatment: (lang: Lang, slug: string) => `/${lang}/${segments[lang].treatments}/${slug}/`,
  subTreatment: (lang: Lang, slug: string, sub: string) => `/${lang}/${segments[lang].treatments}/${slug}/${sub}/`,
  diaspora: (lang: Lang) => `/${lang}/${segments[lang].diaspora}/`,
  gallery: (lang: Lang) => `/${lang}/${segments[lang].gallery}/`,
  team: (lang: Lang) => `/${lang}/${segments[lang].team}/`,
  section: (lang: Lang, id: string) => `/${lang}/#${id}`,
};

export type Alternates = Record<Lang, string>;

export function alternatesFor(build: (lang: Lang) => string): Alternates {
  return Object.fromEntries(languages.map((l) => [l, build(l)])) as Alternates;
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Renders copy that may contain placeholders. Anything inside [[double brackets]] has not been
 * supplied by the clinic yet and is output as a visibly marked <span class="ph">.
 */
export function ph(text: string, lang: Lang = defaultLang): string {
  const label = escape(dictionaries[lang].common.placeholder);
  return escape(text).replace(
    /\[\[(.+?)\]\]/g,
    (_, inner) => `<span class="ph" title="${label}">${inner}</span>`,
  );
}

export const hasPlaceholder = (text: string) => /\[\[.+?\]\]/.test(text);
