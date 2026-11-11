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
import treatmentCamera from '../assets/photos/treatment-camera.jpg';
import patientMirror from '../assets/photos/patient-mirror.jpg';
import roomArt from '../assets/photos/room-art.jpg';
import exam from '../assets/photos/exam.jpg';
import examDark from '../assets/photos/exam-dark.jpg';
import instrumentsStill from '../assets/photos/instruments-still.jpg';
import chairWindow from '../assets/photos/chair-window.jpg';
import alignerHand from '../assets/photos/aligner-hand.jpg';
import bracesProgressWide from '../assets/photos/braces-progress-wide.jpg';

/**
 * Treatments are grouped in categories (e.g. Dental implants), following the clinic's price list.
 * A category can have sub-treatments (e.g. Single implants) that get their own page, in all three languages:
 *   /en/treatments/dental-implants/                 category page
 *   /en/treatments/dental-implants/single-implants/ sub-treatment page
 *
 * Every category also lists all of its `services` (the lines of the clinic's price list, without prices).
 * A service with `sub` links to that sub-treatment page and, unless it has its own `copy`, shows its name and summary.
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

/** One line of the clinic's price list: [name, one short explanation]. */
export type ServiceCopy = Record<Lang, [name: string, line: string]>;

export interface Service {
  /** Id of the sub-treatment page this service links to. */
  sub?: string;
  copy?: ServiceCopy;
}

export interface Treatment {
  id: string;
  image: ImageMetadata;
  /** Secondary image used inside the treatment page. */
  detailImage: ImageMetadata;
  copy: Record<Lang, TreatmentCopy>;
  children: SubTreatment[];
  services: Service[];
}

const svc = (sq: [string, string], en: [string, string], de: [string, string], sub?: string): Service => ({
  sub,
  copy: { sq, en, de },
});
const page = (sub: string): Service => ({ sub });

export const treatments: Treatment[] = [
  {
    id: 'fillings-root-canals',
    image: treatmentCamera,
    detailImage: xrayReview,
    copy: {
      sq: { slug: 'mbushjet-dhe-kanalet', name: 'Mbushjet dhe kanalet', summary: 'Trajtimi i kariesit dhe i dhëmbëve të infektuar.' },
      en: { slug: 'fillings-and-root-canals', name: 'Fillings & root canals', summary: 'Treating decay and infected teeth.' },
      de: { slug: 'fuellungen-und-wurzelbehandlungen', name: 'Füllungen & Wurzelbehandlungen', summary: 'Behandlung von Karies und entzündeten Zähnen.' },
    },
    children: [
      {
        id: 'root-canal-treatment',
        image: xrayReview,
        detailImage: treatmentCamera,
        copy: {
          sq: { slug: 'sherimi-i-dhembit-me-kanale', name: 'Shërimi i dhëmbit me kanale', summary: 'Pastrimi dhe mbushja e kanaleve për të ruajtur dhëmbin.' },
          en: { slug: 'root-canal-treatment', name: 'Root canal treatment', summary: 'Cleaning and sealing the canals to save the tooth.' },
          de: { slug: 'wurzelkanalbehandlung', name: 'Wurzelkanalbehandlung', summary: 'Reinigung und Füllung der Kanäle, um den Zahn zu erhalten.' },
        },
      },
    ],
    services: [
      svc(['Vizita specialistike', 'Ekzaminimi i dhëmbëve dhe plani i trajtimit.'], ['Specialist examination', 'A full check of your teeth and a treatment plan.'], ['Fachärztliche Untersuchung', 'Gründliche Untersuchung und Behandlungsplan.']),
      svc(['Mbushje e përkohshme', 'Mbyll dhëmbin përkohësisht deri në trajtimin përfundimtar.'], ['Temporary filling', 'Seals the tooth until the final treatment.'], ['Provisorische Füllung', 'Verschließt den Zahn bis zur endgültigen Behandlung.']),
      svc(['Mbushje me kompozit', 'Mbushje në ngjyrën e dhëmbit për dhëmbët e përhershëm.'], ['Composite filling', 'A tooth-coloured filling for permanent teeth.'], ['Kompositfüllung', 'Zahnfarbene Füllung für bleibende Zähne.']),
      svc(['Mbushje me kompozit OM, OD, MOD', 'Për kavitete që përfshijnë dy ose tri sipërfaqe të dhëmbit.'], ['Composite filling (OM, OD, MOD)', 'For cavities that reach two or three surfaces of the tooth.'], ['Kompositfüllung (OM, OD, MOD)', 'Für Defekte an zwei oder drei Zahnflächen.']),
      svc(['Shërimi i dhëmbit me kanale', 'Pastrimi dhe mbushja e kanaleve kur nervi është i prekur.'], ['Root canal treatment', 'Cleaning and filling the canals when the nerve is affected.'], ['Wurzelkanalbehandlung', 'Reinigung und Füllung der Kanäle bei betroffenem Nerv.'], 'root-canal-treatment'),
      svc(['Shërimi i proceseve periapikale', 'Trajtimi i infeksionit në majën e rrënjës.'], ['Treatment of periapical lesions', 'Treating infection at the tip of the root.'], ['Behandlung periapikaler Entzündungen', 'Behandlung von Entzündungen an der Wurzelspitze.'], 'root-canal-treatment'),
      svc(['Nxjerrja e trupit të huaj nga kanali', 'Heqja e një instrumenti ose materiali të mbetur në kanal.'], ['Removing a foreign body from a canal', 'Removing a broken instrument or old material from the canal.'], ['Entfernung eines Fremdkörpers aus dem Kanal', 'Entfernung eines Instrumentenfragments oder alten Materials.'], 'root-canal-treatment'),
      svc(['Shërimi i dhëmbit gangrenoz', 'Trajtimi i dhëmbit me nerv të vdekur dhe të infektuar.'], ['Treatment of a necrotic tooth', 'Treating a tooth whose nerve has died and become infected.'], ['Behandlung eines abgestorbenen Zahns', 'Behandlung eines Zahns mit abgestorbenem, infiziertem Nerv.'], 'root-canal-treatment'),
    ],
  },
  {
    id: 'periodontology',
    image: exam,
    detailImage: instrumentsStill,
    copy: {
      sq: { slug: 'pastrimi-dhe-mishrat', name: 'Pastrimi dhe mishrat', summary: 'Pastrimi profesional dhe kujdesi për mishrat.' },
      en: { slug: 'cleaning-and-gum-care', name: 'Cleaning & gum care', summary: 'Professional cleaning and care for the gums.' },
      de: { slug: 'zahnreinigung-und-zahnfleisch', name: 'Zahnreinigung & Zahnfleisch', summary: 'Professionelle Reinigung und Behandlung des Zahnfleischs.' },
    },
    children: [],
    services: [
      svc(['Largimi i depozitave të forta (gurëzave)', 'Heqja e gurëzave mbi dhe nën mishrat.'], ['Scaling (tartar removal)', 'Removing hard deposits above and below the gum line.'], ['Zahnsteinentfernung', 'Entfernung harter Beläge über und unter dem Zahnfleisch.']),
      svc(['Air Flow', 'Pastrim me pluhur dhe ujë që heq njollat dhe pllakën.'], ['Air Flow', 'Polishing with powder and water to remove stains and plaque.'], ['Air Flow', 'Pulverstrahlreinigung gegen Verfärbungen und Beläge.']),
      svc(['Kyretazha e xhepave periodontalë', 'Pastrimi i thellë i rrënjëve nën mishrat.'], ['Periodontal pocket curettage', 'Deep cleaning of the roots below the gum line.'], ['Kürettage der Zahnfleischtaschen', 'Tiefenreinigung der Wurzeloberflächen unter dem Zahnfleisch.']),
      svc(['Kyretazha kirurgjike e xhepave', 'Për xhepa të thellë, me hapje të kujdesshme të mishit.'], ['Surgical pocket curettage', 'For deep pockets, with the gum carefully opened.'], ['Chirurgische Kürettage', 'Bei tiefen Taschen, mit schonender Eröffnung des Zahnfleischs.']),
    ],
  },
  {
    id: 'oral-surgery',
    image: surgeryTeam,
    detailImage: treatmentFocus,
    copy: {
      sq: { slug: 'nxjerrja-e-dhembeve-dhe-kirurgjia', name: 'Nxjerrja e dhëmbëve dhe kirurgjia', summary: 'Nxjerrja e dhëmbëve dhe ndërhyrje të tjera kirurgjikale në gojë.' },
      en: { slug: 'extractions-and-oral-surgery', name: 'Extractions & oral surgery', summary: 'Tooth extractions and other surgical procedures in the mouth.' },
      de: { slug: 'zahnentfernung-und-oralchirurgie', name: 'Zahnentfernung & Oralchirurgie', summary: 'Zahnentfernungen und weitere chirurgische Eingriffe im Mund.' },
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
    services: [
      svc(['Nxjerrja e dhëmbëve të përparmë', 'Heqja e dhëmbëve frontalë.'], ['Extraction of front teeth', 'Removing front teeth.'], ['Entfernung von Frontzähnen', 'Entfernung von Zähnen im Frontbereich.']),
      svc(['Nxjerrja e dhëmbëve të pasmë', 'Heqja e premolarëve dhe e molarëve.'], ['Extraction of back teeth', 'Removing premolars and molars.'], ['Entfernung von Seitenzähnen', 'Entfernung von Prämolaren und Molaren.']),
      page('wisdom-teeth'),
      svc(['Nxjerrja e komplikuar', 'Kur rrënjët janë të lakuara ose dhëmbi është i thyer.'], ['Complicated extraction', 'When the roots are curved or the tooth is broken.'], ['Komplizierte Zahnentfernung', 'Bei gekrümmten Wurzeln oder frakturiertem Zahn.']),
      svc(['Nxjerrja e dhëmbëve gjysmë të impaktuar', 'Dhëmbë që kanë dalë vetëm pjesërisht.'], ['Removal of semi-impacted teeth', 'Teeth that have only partly come through.'], ['Entfernung teilretinierter Zähne', 'Zähne, die nur teilweise durchgebrochen sind.']),
      svc(['Nxjerrja kirurgjike e dhëmbëve të impaktuar', 'Dhëmbë të ngulur në kockë, të hequr me metodë kirurgjikale.'], ['Surgical removal of impacted teeth', 'Teeth trapped in the bone, removed surgically.'], ['Operative Entfernung retinierter Zähne', 'Im Knochen verlagerte Zähne, chirurgisch entfernt.']),
      svc(['Nxjerrja e rrënjës së mbetur', 'Heqja kirurgjikale e rrënjëve që kanë mbetur në kockë.'], ['Removal of a retained root', 'Surgically removing roots left in the bone.'], ['Entfernung von Wurzelresten', 'Chirurgische Entfernung verbliebener Wurzeln.']),
      svc(['Frenektomia e buzës dhe e gjuhës', 'Lirimi i frenulumit të shkurtër të buzës ose të gjuhës.'], ['Lip and tongue frenectomy', 'Releasing a short lip or tongue tie.'], ['Frenektomie', 'Lösen eines zu kurzen Lippen- oder Zungenbändchens.']),
      svc(['Incizioni dhe drenazha intraorale', 'Hapja dhe pastrimi i një absesi brenda gojës.'], ['Intraoral incision and drainage', 'Opening and draining an abscess inside the mouth.'], ['Intraorale Inzision und Drainage', 'Eröffnung und Entlastung eines Abszesses im Mund.']),
      svc(['Incizioni ekstraoral', 'Drenazha e absesit nga jashtë, kur nevojitet.'], ['Extraoral incision', 'Draining an abscess from outside the mouth when needed.'], ['Extraorale Inzision', 'Abszessentlastung von außen, wenn nötig.']),
      svc(['Apikotomia', 'Heqja e majës së infektuar të rrënjës, te dhëmbët e përparmë dhe të pasmë.'], ['Apicoectomy', 'Removing an infected root tip, on front and back teeth.'], ['Wurzelspitzenresektion', 'Entfernung einer entzündeten Wurzelspitze, an Front- und Seitenzähnen.']),
      svc(['Apikotomia me mbushje retrograde', 'Heqja e majës së rrënjës dhe mbyllja e kanalit nga maja.'], ['Apicoectomy with retrograde filling', 'Removing the root tip and sealing the canal from the tip.'], ['Wurzelspitzenresektion mit retrograder Füllung', 'Entfernung der Wurzelspitze und Verschluss des Kanals von der Spitze aus.']),
      svc(['Heqja e cistave dentogjene', 'Heqja e cistave në nofull që lidhen me dhëmbët.'], ['Removal of dental cysts', 'Removing jaw cysts that start from a tooth.'], ['Entfernung von Kieferzysten', 'Entfernung zahnbedingter Zysten im Kiefer.']),
      svc(['Kortikotomia', 'Ndërhyrje e vogël në kockë, shpesh për të ndihmuar lëvizjen ortodontike.'], ['Corticotomy', 'A minor bone procedure, often to help orthodontic tooth movement.'], ['Kortikotomie', 'Kleiner Knocheneingriff, oft zur Unterstützung der kieferorthopädischen Zahnbewegung.']),
      svc(['Modelimi i kreshtës alveolare', 'Formësimi i kockës, p.sh. para protezës ose implantit.'], ['Alveolar ridge shaping', 'Shaping the bone ridge, for example before a denture or implant.'], ['Modellierung des Kieferkamms', 'Formung des Kieferkamms, z. B. vor einer Prothese oder einem Implantat.']),
    ],
  },
  {
    id: 'implants',
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
    ],
    services: [
      svc(['Vendosja e implantit dentar', 'Rrënjë artificiale që zëvendëson rrënjën e dhëmbit.'], ['Dental implant placement', 'An artificial root that replaces the root of the tooth.'], ['Setzen eines Zahnimplantats', 'Eine künstliche Zahnwurzel als Ersatz für die natürliche.'], 'single-implant'),
      svc(['Vendosja e abutmentit', 'Lidhësi mbi implant që mban kurorën.'], ['Abutment placement', 'The connector on the implant that holds the crown.'], ['Setzen des Abutments', 'Das Verbindungsteil auf dem Implantat, das die Krone trägt.']),
      svc(['Kurorë zirkoni mbi implant', 'Kurora përfundimtare mbi implant.'], ['Zirconia crown on an implant', 'The final crown on top of the implant.'], ['Zirkonkrone auf Implantat', 'Die endgültige Krone auf dem Implantat.']),
    ],
  },
  {
    id: 'crowns-bridges',
    image: prostheticDetail,
    detailImage: xrayReview,
    copy: {
      sq: { slug: 'kurorat-dhe-urat', name: 'Kurorat dhe urat', summary: 'Restaurimi i dhëmbëve të dëmtuar ose që mungojnë.' },
      en: { slug: 'crowns-and-bridges', name: 'Crowns & bridges', summary: 'Restoring damaged or missing teeth.' },
      de: { slug: 'kronen-und-bruecken', name: 'Kronen & Brücken', summary: 'Wiederherstellung beschädigter oder fehlender Zähne.' },
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
      {
        id: 'emax-crowns',
        copy: {
          sq: { slug: 'kurorat-emax', name: 'Kurorat E.max', summary: 'Kurora qeramike me tejdukshmëri natyrale.' },
          en: { slug: 'emax-crowns', name: 'E.max crowns', summary: 'All-ceramic crowns with natural translucency.' },
          de: { slug: 'emax-kronen', name: 'E.max-Kronen', summary: 'Vollkeramikkronen mit natürlicher Transluzenz.' },
        },
      },
    ],
    services: [
      svc(['Heqja e kurorës ose e urës së vjetër', 'Heqja e kujdesshme para një restaurimi të ri.'], ['Removing an old crown or bridge', 'Careful removal before a new restoration.'], ['Entfernung alter Kronen oder Brücken', 'Schonende Entfernung vor einer neuen Versorgung.']),
      svc(['Ricementimi i urës së vjetër', 'Rifiksimi i një ure ekzistuese që është liruar.'], ['Re-cementing a bridge', 'Fixing an existing bridge that has come loose.'], ['Wiederbefestigung einer Brücke', 'Erneutes Befestigen einer gelösten Brücke.']),
      svc(['Kurora të përkohshme', 'Mbrojnë dhëmbin derisa të gatitet kurora përfundimtare.'], ['Temporary crowns', 'Protect the tooth until the final crown is ready.'], ['Provisorische Kronen', 'Schützen den Zahn bis zur endgültigen Krone.']),
      svc(['Rindërtim protetik me kunj', 'Përforcimi i dhëmbit të trajtuar me kanale para kurorës.'], ['Post build-up', 'Reinforcing a root-treated tooth before a crown.'], ['Stiftaufbau', 'Verstärkung eines wurzelbehandelten Zahns vor der Krone.']),
      svc(['Rindërtim i derdhur ose prej zirkoni', 'Bazë e punuar me porosi nga metali ose zirkoni, për dhëmbë shumë të dëmtuar.'], ['Cast or zirconia core', 'A custom metal or zirconia core for badly damaged teeth.'], ['Gegossener oder Zirkon-Stumpfaufbau', 'Individueller Aufbau aus Metall oder Zirkon für stark zerstörte Zähne.']),
      svc(['Kurora metal-porcelan', 'Edhe pa nikel, me metal të printuar 3D ose të sinterizuar me lazer.'], ['Metal-ceramic crowns', 'Also nickel-free, with a 3D-printed or laser-sintered metal base.'], ['Metallkeramikkronen', 'Auch nickelfrei, mit 3D-gedrucktem oder lasergesintertem Gerüst.'], 'metal-ceramic-crowns'),
      page('zirconia-crowns'),
      page('emax-crowns'),
    ],
  },
  {
    id: 'dentures',
    image: patientMirror,
    detailImage: prostheticDetail,
    copy: {
      sq: { slug: 'protezat', name: 'Protezat', summary: 'Dhëmbë të lëvizshëm në vend të dhëmbëve që mungojnë.' },
      en: { slug: 'dentures', name: 'Dentures', summary: 'Removable replacements for missing teeth.' },
      de: { slug: 'zahnprothesen', name: 'Zahnprothesen', summary: 'Herausnehmbarer Ersatz für fehlende Zähne.' },
    },
    children: [],
    services: [
      svc(['Riparimi i protezës', 'Rregullimi i një proteze të thyer ose të dëmtuar.'], ['Denture repair', 'Fixing a broken or damaged denture.'], ['Prothesenreparatur', 'Reparatur einer gebrochenen oder beschädigten Prothese.']),
      svc(['Protezë me dhëmbë akrilikë', 'Protezë e plotë ose e pjesshme me dhëmbë akrilikë.'], ['Denture with acrylic teeth', 'A full or partial denture with acrylic teeth.'], ['Prothese mit Kunststoffzähnen', 'Voll- oder Teilprothese mit Kunststoffzähnen.']),
      svc(['Protezë me dhëmbë porcelani', 'Dhëmbë porcelani, më rezistentë ndaj konsumimit.'], ['Denture with porcelain teeth', 'Porcelain teeth that resist wear better.'], ['Prothese mit Porzellanzähnen', 'Porzellanzähne, widerstandsfähiger gegen Abnutzung.']),
      svc(['Protezë skeletore', 'Protezë e pjesshme mbi një skelet të hollë metalik.'], ['Skeletal partial denture', 'A partial denture on a thin metal framework.'], ['Modellgussprothese', 'Teilprothese auf einem dünnen Metallgerüst.']),
      svc(['Protezë Valplast (elastike)', 'Protezë e pjesshme fleksibile, pa metal.'], ['Valplast flexible denture', 'A flexible, metal-free partial denture.'], ['Valplast-Prothese (flexibel)', 'Flexible, metallfreie Teilprothese.']),
    ],
  },
  {
    id: 'aesthetics',
    image: smileDetail,
    detailImage: roomArt,
    copy: {
      sq: { slug: 'estetika-dhe-zbardhimi', name: 'Estetika dhe zbardhimi', summary: 'Zbardhimi, fasetat dhe pamja e buzëqeshjes.' },
      en: { slug: 'aesthetic-dentistry-and-whitening', name: 'Aesthetic dentistry & whitening', summary: 'Whitening, veneers and the look of your smile.' },
      de: { slug: 'aesthetik-und-bleaching', name: 'Ästhetik & Bleaching', summary: 'Bleaching, Veneers und ein harmonisches Lächeln.' },
    },
    children: [
      {
        id: 'teeth-whitening',
        image: patientMirror,
        detailImage: smileDetail,
        copy: {
          sq: { slug: 'zbardhimi-i-dhembeve', name: 'Zbardhimi i dhëmbëve', summary: 'Zbardhim profesional i ngjyrës natyrale të dhëmbëve.' },
          en: { slug: 'teeth-whitening', name: 'Teeth whitening', summary: 'Professional lightening of your natural tooth colour.' },
          de: { slug: 'zahnaufhellung', name: 'Zahnaufhellung', summary: 'Professionelle Aufhellung der natürlichen Zahnfarbe.' },
        },
      },
      {
        id: 'emax-veneers',
        copy: {
          sq: { slug: 'fasetat-qeramike', name: 'Fasetat qeramike', summary: 'Faseta të holla qeramike në pjesën e përparme të dhëmbëve.' },
          en: { slug: 'ceramic-veneers', name: 'Ceramic veneers', summary: 'Thin ceramic shells bonded to the front of the teeth.' },
          de: { slug: 'keramikveneers', name: 'Keramikveneers', summary: 'Dünne Keramikschalen auf der Vorderseite der Zähne.' },
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
    services: [
      svc(['Zbardhimi i dhëmbëve', 'Zbardhim profesional i ngjyrës natyrale të dhëmbëve.'], ['Teeth whitening', 'Professional lightening of your natural tooth colour.'], ['Zahnaufhellung', 'Professionelle Aufhellung der natürlichen Zahnfarbe.'], 'teeth-whitening'),
      svc(['Zbardhimi intern i dhëmbit', 'Zbardhimi nga brenda i një dhëmbi të errësuar pas trajtimit me kanale.'], ['Internal whitening', 'Lightening a darkened root-treated tooth from the inside.'], ['Internes Bleaching', 'Aufhellung eines verfärbten, wurzelbehandelten Zahns von innen.'], 'teeth-whitening'),
      page('emax-veneers'),
      page('composite-veneers'),
      svc(['Ndërrimi i mbushjeve të zeza me të bardha', 'Zëvendësimi i mbushjeve të errëta me kompozit në ngjyrën e dhëmbit.'], ['Replacing dark fillings with white ones', 'Swapping dark fillings for tooth-coloured composite.'], ['Austausch dunkler Füllungen', 'Ersatz dunkler Füllungen durch zahnfarbenes Komposit.']),
      svc(['Vendosja e gurit zbukurues', 'Gur i vogël dekorativ i ngjitur në dhëmb.'], ['Tooth gem', 'A small decorative stone bonded to a tooth.'], ['Zahnschmuck', 'Ein kleiner Schmuckstein, auf den Zahn geklebt.']),
      svc(['Filler', 'Mbushja dhe konturimi i rrudhave dhe i buzëve.'], ['Filler', 'Filling and contouring of wrinkles and lips.'], ['Filler', 'Auffüllen und Konturieren von Falten und Lippen.']),
    ],
  },
  {
    id: 'orthodontics',
    image: examDark,
    detailImage: chairWindow,
    copy: {
      sq: { slug: 'ortodoncia', name: 'Ortodoncia', summary: 'Drejtimi i dhëmbëve dhe i kafshimit.' },
      en: { slug: 'orthodontics', name: 'Orthodontics', summary: 'Straightening teeth and correcting the bite.' },
      de: { slug: 'kieferorthopaedie', name: 'Kieferorthopädie', summary: 'Zähne begradigen und den Biss korrigieren.' },
    },
    children: [
      {
        id: 'braces',
        image: bracesProgressWide,
        copy: {
          sq: { slug: 'aparatet-fikse', name: 'Aparatet fikse', summary: 'Aparate ortodontike fikse me brikete metalike ose porcelani.' },
          en: { slug: 'braces', name: 'Braces', summary: 'Fixed orthodontic braces with metal or ceramic brackets.' },
          de: { slug: 'feste-zahnspangen', name: 'Feste Zahnspangen', summary: 'Festsitzende Zahnspangen mit Metall- oder Keramikbrackets.' },
        },
      },
      {
        // Id kept for its animation (public/media/treatments/invisalign.*); the page is about clear aligners in general.
        id: 'invisalign',
        image: alignerHand,
        imageFocus: '50% 70%',
        copy: {
          sq: { slug: 'maskerinat-transparente', name: 'Maskerinat transparente', summary: 'Mbajtëse transparente, pothuajse të padukshme.' },
          en: { slug: 'clear-aligners', name: 'Clear aligners', summary: 'Clear, almost invisible aligners.' },
          de: { slug: 'transparente-aligner', name: 'Transparente Aligner', summary: 'Transparente, nahezu unsichtbare Schienen.' },
        },
      },
    ],
    services: [
      svc(['Aparat ortodontik i lëvizshëm', 'Aparat që hiqet e vihet, shpesh për fëmijët.'], ['Removable orthodontic appliance', 'A brace you can take out, often used for children.'], ['Herausnehmbare Zahnspange', 'Ein herausnehmbares Gerät, häufig bei Kindern.']),
      svc(['Aparat fiks me brikete metalike', 'Brikete metalike të ngjitura në dhëmbë, për një nofull.'], ['Fixed braces with metal brackets', 'Metal brackets bonded to the teeth, per jaw.'], ['Feste Zahnspange mit Metallbrackets', 'Metallbrackets auf den Zähnen, pro Kiefer.'], 'braces'),
      svc(['Aparat fiks me brikete porcelani', 'Brikete në ngjyrën e dhëmbit, më pak të dukshme.'], ['Fixed braces with ceramic brackets', 'Tooth-coloured brackets that are less visible.'], ['Feste Zahnspange mit Keramikbrackets', 'Zahnfarbene, unauffälligere Brackets.'], 'braces'),
      svc(['Vendosja e briketës ose e unazës', 'Zëvendësimi i një brikete, vendosja e unazës ose ndërhyrje ortodontike.'], ['Bracket, band or adjustment', 'Replacing a bracket, fitting a band or an orthodontic adjustment.'], ['Bracket, Band oder Anpassung', 'Ersatz eines Brackets, Setzen eines Bandes oder Nachjustierung.']),
      page('invisalign'),
      svc(['Folia për bruksizëm', 'Mbrojtëse nate për ata që shtrëngojnë ose kërcasin dhëmbët.'], ['Bruxism splint', 'A night guard for people who clench or grind their teeth.'], ['Knirscherschiene', 'Eine Nachtschiene bei Zähnepressen oder -knirschen.']),
    ],
  },
  {
    id: 'children',
    image: chairWindow,
    detailImage: patientMirror,
    copy: {
      sq: { slug: 'dentistria-per-femije', name: 'Dentistria për fëmijë', summary: 'Kujdes dhe parandalim për dhëmbët e fëmijëve.' },
      en: { slug: 'childrens-dentistry', name: 'Children’s dentistry', summary: 'Care and prevention for children’s teeth.' },
      de: { slug: 'kinderzahnheilkunde', name: 'Kinderzahnheilkunde', summary: 'Vorsorge und Behandlung für Kinderzähne.' },
    },
    children: [],
    services: [
      svc(['Fluorizimi i dhëmbëve', 'Llak me fluor që forcon smaltin.'], ['Fluoride application', 'A fluoride varnish that strengthens the enamel.'], ['Fluoridierung', 'Fluoridlack, der den Zahnschmelz stärkt.']),
      svc(['Vulosja e fisurave (silanimi)', 'Mbyllja e brazdave të dhëmbëve për të parandaluar kariesin.'], ['Fissure sealants', 'Sealing the grooves of the teeth to help prevent decay.'], ['Fissurenversiegelung', 'Versiegelung der Zahnfurchen zum Schutz vor Karies.']),
      svc(['Mbushja e dhëmbëve të qumështit', 'Trajtimi i kariesit te dhëmbët e qumështit.'], ['Fillings in baby teeth', 'Treating decay in baby teeth.'], ['Füllungen an Milchzähnen', 'Behandlung von Karies an Milchzähnen.']),
      svc(['Pulpektomia e dhëmbëve të qumështit', 'Trajtimi i nervit të një dhëmbi qumështi.'], ['Pulpectomy of baby teeth', 'Treating the nerve of a baby tooth.'], ['Pulpektomie an Milchzähnen', 'Behandlung des Nervs eines Milchzahns.']),
      svc(['Nxjerrja e dhëmbëve të qumështit', 'Heqja e kujdesshme e dhëmbëve të qumështit kur është e nevojshme.'], ['Baby tooth extraction', 'Gentle removal of baby teeth when needed.'], ['Entfernung von Milchzähnen', 'Schonende Entfernung von Milchzähnen, wenn nötig.']),
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

/** Homepage "selected treatments", in this order. */
const FEATURED = ['implants', 'oral-surgery', 'crowns-bridges', 'periodontology', 'orthodontics', 'aesthetics'];
export const featuredTreatments = FEATURED.map((id) => treatments.find((t) => t.id === id)!);

export function findTreatment(lang: Lang, slug: string) {
  return treatments.find((t) => t.copy[lang].slug === slug);
}

export const subImage = (tr: Treatment, sub: SubTreatment) => sub.image ?? tr.image;
export const subDetailImage = (tr: Treatment, sub: SubTreatment) => sub.detailImage ?? tr.detailImage;

/** Name and one-line explanation of a service; services linked to a page fall back to that page's name and summary. */
export function serviceText(tr: Treatment, service: Service, lang: Lang) {
  const sub = service.sub ? tr.children.find((s) => s.id === service.sub) : undefined;
  const [name, line] = service.copy?.[lang] ?? [sub!.copy[lang].name, sub!.copy[lang].summary];
  return { name, line, sub };
}
