import type { ImageMetadata } from 'astro';
import type { Lang } from '../i18n';
import type { TreatmentContent } from './content/types';

import implantModel from '../assets/photos/implant-model.jpg';
import prostheticDetail from '../assets/photos/prosthetic-detail.jpg';
import surgeryTeam from '../assets/photos/surgery-team.jpg';
import smileDetail from '../assets/photos/smile-detail.jpg';
import scanTablet from '../assets/photos/scan-tablet.jpg';
import xrayReview from '../assets/photos/xray-review.jpg';
import treatmentFocus from '../assets/photos/treatment-focus.jpg';
import roomArt from '../assets/photos/room-art.jpg';
import exam from '../assets/photos/exam.jpg';
import examDark from '../assets/photos/exam-dark.jpg';
import instrumentsStill from '../assets/photos/instruments-still.jpg';
import chairWindow from '../assets/photos/chair-window.jpg';
import alignerHand from '../assets/photos/aligner-hand.jpg';
import bracesProgressWide from '../assets/photos/braces-progress-wide.jpg';

/**
 * Treatments are grouped in categories (e.g. Dental implants), each with its own
 * sub-treatments (e.g. All-on-4). Every category and sub-treatment gets its own page
 * in all three languages:
 *   /en/treatments/dental-implants/          category page
 *   /en/treatments/dental-implants/all-on-4/ sub-treatment page
 *
 * Only `name`, `slug` and `summary` are required here. The longer page copy (`intro`, `body`, `steps`,
 * `faq`, `seoDescription`) lives in src/data/content/<category>.ts, keyed by the same `id`.
 * Anything missing there is shown as a clearly marked placeholder.
 */
export interface TreatmentCopy {
  slug: string;
  name: string;
  /** One short neutral line, used in lists. */
  summary: string;
  intro?: string;
  body?: string[];
  steps?: { title: string; text: string }[];
  faq?: { q: string; a: string }[];
  seoDescription?: string;
}

export interface SubTreatment {
  id: string;
  /** Falls back to the category's images when left out. */
  image?: ImageMetadata;
  detailImage?: ImageMetadata;
  /** Which part of the hero photo stays in view when the frame crops it (CSS object-position). Defaults to centre. */
  imageFocus?: string;
  copy: Record<Lang, TreatmentCopy>;
}

export interface Treatment {
  id: string;
  /** Show on the homepage "selected treatments" list. */
  featured: boolean;
  image: ImageMetadata;
  /** Secondary image used inside the treatment page. */
  detailImage: ImageMetadata;
  copy: Record<Lang, TreatmentCopy>;
  children: SubTreatment[];
}

export const treatments: Treatment[] = [
  {
    id: 'implants',
    featured: true,
    image: implantModel,
    detailImage: scanTablet,
    copy: {
      sq: { slug: 'implantet-dentare', name: 'Implantet dentare', summary: 'Zëvendësimi i dhëmbëve që mungojnë.' },
      en: { slug: 'dental-implants', name: 'Dental implants', summary: 'Replacing missing teeth.' },
      de: { slug: 'zahnimplantate', name: 'Zahnimplantate', summary: 'Ersatz fehlender Zähne.' },
    },
    children: [
      {
        id: 'single-implant',
        copy: {
          sq: { slug: 'implanti-i-vetem', name: 'Implanti i vetëm', summary: 'Një implant dhe një kurorë për një dhëmb që mungon.' },
          en: { slug: 'single-implants', name: 'Single implants', summary: 'One implant and one crown for a single missing tooth.' },
          de: { slug: 'einzelimplantate', name: 'Einzelimplantate', summary: 'Ein Implantat und eine Krone für einen fehlenden Zahn.' },
        },
      },
      {
        id: 'all-on-4',
        copy: {
          sq: { slug: 'all-on-4', name: 'All-on-4', summary: 'Një nofull e plotë dhëmbësh e fiksuar mbi katër implante.' },
          en: { slug: 'all-on-4', name: 'All-on-4', summary: 'A full arch of fixed teeth supported by four implants.' },
          de: { slug: 'all-on-4', name: 'All-on-4', summary: 'Ein kompletter fester Zahnbogen auf vier Implantaten.' },
        },
      },
      {
        id: 'all-on-6',
        copy: {
          sq: { slug: 'all-on-6', name: 'All-on-6', summary: 'Një nofull e plotë dhëmbësh e fiksuar mbi gjashtë implante.' },
          en: { slug: 'all-on-6', name: 'All-on-6', summary: 'A full arch of fixed teeth supported by six implants.' },
          de: { slug: 'all-on-6', name: 'All-on-6', summary: 'Ein kompletter fester Zahnbogen auf sechs Implantaten.' },
        },
      },
    ],
  },
  {
    id: 'oral-surgery',
    featured: true,
    image: surgeryTeam,
    detailImage: treatmentFocus,
    copy: {
      sq: { slug: 'kirurgjia-orale', name: 'Kirurgjia orale', summary: 'Ndërhyrje kirurgjikale në zgavrën e gojës.' },
      en: { slug: 'oral-surgery', name: 'Oral surgery', summary: 'Surgical procedures in the mouth.' },
      de: { slug: 'oralchirurgie', name: 'Oralchirurgie', summary: 'Chirurgische Eingriffe im Mundraum.' },
    },
    children: [
      {
        id: 'wisdom-teeth',
        copy: {
          sq: { slug: 'heqja-e-dhembeve-te-pjekurise', name: 'Heqja e dhëmbëve të pjekurisë', summary: 'Heqja e dhëmbëve të pjekurisë që shkaktojnë probleme.' },
          en: { slug: 'wisdom-teeth-removal', name: 'Wisdom teeth removal', summary: 'Removing wisdom teeth that cause problems.' },
          de: { slug: 'weisheitszahnentfernung', name: 'Weisheitszahnentfernung', summary: 'Entfernung von Weisheitszähnen, die Beschwerden verursachen.' },
        },
      },
    ],
  },
  {
    id: 'crowns-bridges',
    featured: true,
    image: prostheticDetail,
    detailImage: xrayReview,
    copy: {
      sq: { slug: 'kurorat-dhe-urat', name: 'Kurorat dhe urat dentare', summary: 'Restaurimi i dhëmbëve të dëmtuar ose që mungojnë.' },
      en: { slug: 'crowns-and-bridges', name: 'Dental crowns & bridges', summary: 'Restoring damaged or missing teeth.' },
      de: { slug: 'kronen-und-bruecken', name: 'Zahnkronen & Brücken', summary: 'Wiederherstellung beschädigter oder fehlender Zähne.' },
    },
    children: [
      {
        id: 'zirconia-crowns',
        copy: {
          sq: { slug: 'kurorat-e-zirkonit', name: 'Kurorat e zirkonit', summary: 'Kurora pa metal, të forta dhe me pamje natyrale.' },
          en: { slug: 'zirconia-crowns', name: 'Zirconia crowns', summary: 'Metal-free crowns, strong and natural-looking.' },
          de: { slug: 'zirkonkronen', name: 'Zirkonkronen', summary: 'Metallfreie Kronen, stabil und natürlich aussehend.' },
        },
      },
      {
        id: 'metal-ceramic-crowns',
        copy: {
          sq: { slug: 'kurorat-metal-qeramike', name: 'Kurorat metal-qeramike', summary: 'Bazë metalike e veshur me qeramikë.' },
          en: { slug: 'metal-ceramic-crowns', name: 'Metal-ceramic crowns', summary: 'A metal base covered with ceramic.' },
          de: { slug: 'metallkeramikkronen', name: 'Metallkeramikkronen', summary: 'Ein Metallgerüst mit Keramikverblendung.' },
        },
      },
    ],
  },
  {
    id: 'periodontology',
    featured: true,
    image: exam,
    detailImage: instrumentsStill,
    copy: {
      sq: { slug: 'parodontologjia', name: 'Parodontologjia', summary: 'Kujdesi për mishrat dhe indet rreth dhëmbëve.' },
      en: { slug: 'periodontology', name: 'Periodontology', summary: 'Care for the gums and tissues around the teeth.' },
      de: { slug: 'parodontologie', name: 'Parodontologie', summary: 'Behandlung von Zahnfleisch und Zahnhalteapparat.' },
    },
    children: [
      {
        id: 'crown-lengthening',
        copy: {
          sq: { slug: 'zgjatja-e-kurores', name: 'Zgjatja e kurorës', summary: 'Zbulimi i më shumë pjese të dhëmbit mbi mishrat.' },
          en: { slug: 'crown-lengthening', name: 'Crown lengthening', summary: 'Exposing more of the tooth above the gum line.' },
          de: { slug: 'kronenverlaengerung', name: 'Kronenverlängerung', summary: 'Freilegen von mehr Zahnsubstanz oberhalb des Zahnfleischs.' },
        },
      },
      {
        id: 'laser-gingivectomy',
        copy: {
          sq: { slug: 'gingivektomia-me-laser', name: 'Gingivektomia me laser', summary: 'Rikonturimi i mishrave me laser.' },
          en: { slug: 'laser-gingivectomy', name: 'Laser gingivectomy', summary: 'Reshaping the gums with a laser.' },
          de: { slug: 'laser-gingivektomie', name: 'Laser-Gingivektomie', summary: 'Konturierung des Zahnfleischs mit dem Laser.' },
        },
      },
    ],
  },
  {
    id: 'orthodontics',
    featured: true,
    image: examDark,
    detailImage: chairWindow,
    copy: {
      sq: { slug: 'ortodoncia', name: 'Ortodoncia', summary: 'Drejtimi i dhëmbëve dhe i kafshimit.' },
      en: { slug: 'orthodontics', name: 'Orthodontics', summary: 'Straightening teeth and correcting the bite.' },
      de: { slug: 'kieferorthopaedie', name: 'Kieferorthopädie', summary: 'Zähne begradigen und den Biss korrigieren.' },
    },
    children: [
      {
        id: 'invisalign',
        image: alignerHand,
        imageFocus: '50% 70%',
        copy: {
          sq: { slug: 'invisalign', name: 'Invisalign', summary: 'Mbajtëse transparente, pothuajse të padukshme.' },
          en: { slug: 'invisalign', name: 'Invisalign', summary: 'Clear, almost invisible aligners.' },
          de: { slug: 'invisalign', name: 'Invisalign', summary: 'Transparente, nahezu unsichtbare Aligner.' },
        },
      },
      {
        id: 'braces',
        image: bracesProgressWide,
        copy: {
          sq: { slug: 'aparatet-fikse', name: 'Aparatet fikse', summary: 'Aparate ortodontike fikse me brackets.' },
          en: { slug: 'braces', name: 'Braces', summary: 'Fixed orthodontic braces with brackets.' },
          de: { slug: 'feste-zahnspangen', name: 'Feste Zahnspangen', summary: 'Festsitzende Zahnspangen mit Brackets.' },
        },
      },
    ],
  },
  {
    id: 'veneers',
    featured: true,
    image: smileDetail,
    detailImage: roomArt,
    copy: {
      sq: { slug: 'fasetat-dhe-kurorat-estetike', name: 'Fasetat dhe kurorat estetike', summary: 'Pamja dhe harmonia e buzëqeshjes.' },
      en: { slug: 'veneers-and-aesthetic-crowns', name: 'Veneers & aesthetic crowns', summary: 'The appearance and harmony of your smile.' },
      de: { slug: 'veneers-und-aesthetische-kronen', name: 'Veneers & ästhetische Kronen', summary: 'Aussehen und Harmonie Ihres Lächelns.' },
    },
    children: [
      {
        id: 'emax-veneers',
        copy: {
          sq: { slug: 'fasetat-emax', name: 'Fasetat E.max', summary: 'Faseta të holla qeramike në pjesën e përparme të dhëmbëve.' },
          en: { slug: 'emax-veneers', name: 'E.max veneers', summary: 'Thin ceramic shells bonded to the front of the teeth.' },
          de: { slug: 'emax-veneers', name: 'E.max-Veneers', summary: 'Dünne Keramikschalen auf der Vorderseite der Zähne.' },
        },
      },
      {
        id: 'emax-crowns',
        copy: {
          sq: { slug: 'kurorat-emax', name: 'Kurorat E.max', summary: 'Kurora qeramike me tejdukshmëri natyrale.' },
          en: { slug: 'emax-crowns', name: 'E.max crowns', summary: 'All-ceramic crowns with natural translucency.' },
          de: { slug: 'emax-kronen', name: 'E.max-Kronen', summary: 'Vollkeramikkronen mit natürlicher Transluzenz.' },
        },
      },
      {
        id: 'composite-veneers',
        copy: {
          sq: { slug: 'fasetat-kompozite', name: 'Fasetat kompozite', summary: 'Faseta nga materiali kompozit, të modeluara drejtpërdrejt në dhëmb.' },
          en: { slug: 'composite-veneers', name: 'Composite veneers', summary: 'Composite resin veneers shaped directly on the tooth.' },
          de: { slug: 'komposit-veneers', name: 'Komposit-Veneers', summary: 'Veneers aus Komposit, direkt am Zahn modelliert.' },
        },
      },
    ],
  },
];

// Page copy lives in src/data/content/*.ts, keyed by id; merge it into each entry's `copy`.
const contentFiles = import.meta.glob<Record<string, TreatmentContent>>(['./content/*.ts', '!./content/types.ts'], {
  eager: true,
  import: 'default',
});
const content: Record<string, TreatmentContent> = Object.assign({}, ...Object.values(contentFiles));
for (const entry of treatments.flatMap((tr) => [tr, ...tr.children])) {
  const extra = content[entry.id];
  if (!extra) continue;
  for (const lang of Object.keys(entry.copy) as Lang[]) entry.copy[lang] = { ...extra[lang], ...entry.copy[lang] };
}

export const featuredTreatments = treatments.filter((t) => t.featured);

export function findTreatment(lang: Lang, slug: string) {
  return treatments.find((t) => t.copy[lang].slug === slug);
}

export const subImage = (tr: Treatment, sub: SubTreatment) => sub.image ?? tr.image;
export const subDetailImage = (tr: Treatment, sub: SubTreatment) => sub.detailImage ?? tr.detailImage;
