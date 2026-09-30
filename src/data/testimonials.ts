/**
 * Patient recommendations, supplied by the clinic (Facebook recommendations).
 * Texts are kept in the language they were written in, with the original wording.
 * Only light clean-up: the Facebook "See less" link text and emojis removed, missing spaces
 * after commas and a few sentence-start capitals fixed, and Xhyli Selmani's closing
 * "Feelinf Happy" line left out. Do not edit wording beyond that.
 */
export interface Testimonial {
  author: string;
  /** ISO date of the recommendation. */
  date: string;
  /** Language the review was written in. */
  lang: 'sq' | 'en' | 'de' | 'fr';
  text: string;
}

export const testimonials: Testimonial[] = [
  {
    author: 'Virjana Zatriqi Kingji',
    date: '2025-12-25',
    lang: 'sq',
    text: 'Kam pasur një përvojë shumë të mirë me dr. Vleren dhe dr. Petritin. Kam pa shumë profesionalizmi dhe kujdesi ndaj pacientëve janë të jashtëzakonshëm. Atmosfera ishte e rehatshme dhe shpjegimet e secilit hap të trajtimit ishin të qarta. E rekomandoj me bindje për kujdes dentar cilësor! Jeni më të mirët.',
  },
  {
    author: 'Xhyli Selmani',
    date: '2024-11-30',
    lang: 'en',
    text: 'It was an extraordinary satisfaction to fix my teeth at the best doctors Petrit & Vlera!',
  },
  {
    author: 'Aeza Brovina',
    date: '2024-08-08',
    lang: 'fr',
    text: "J'ai récemment consulté le cabinet des Dr Petrit et Vlera Hoxha et suis extrêmement satisfaite de leurs services. Ils ont fait preuve d'un grand professionnalisme et ont pris le temps de répondre à toutes mes questions avec patience et précision. Leurs écoutes attentives et conseils éclairés ont grandement contribué à rendre cette visite agréable. Je recommande vivement ce cabinet à toute personne à la recherche de dentistes compétents et attentifs.",
  },
  {
    author: 'Erind Hoxha',
    date: '2024-07-10',
    lang: 'en',
    text: "I've been visiting Klinika Dentare Dr. Petriti & Dr. Vlera for a while now for various dental treatments, including fillings, teeth cleaning, and polishing. Every time I walk in, I'm greeted with warm smiles and a friendly atmosphere that instantly puts me at ease. I've had multiple fillings done here and never had any issues. The quality of their work is outstanding, and I trust them completely. Honestly, I feel so comfortable in their care that I could even fall asleep!",
  },
  {
    author: 'Albulena Shkreli',
    date: '2024-06-18',
    lang: 'de',
    text: 'Ausgezeichnete Leistung: Top Beratung, Top Preise, Top Qualität! Ich kann diese Zahnärzte aus vollstem Herzen empfelen. Ich hatte immer sehr viele Probleme mit meinen Zähnen, obwohl ich die Profilaxen immer eingehalten habe und auch immer versucht habe die besseren Zahnärzte aufzusuchen. Es ging mir auch nie so sehr ums Geld, das Ergebniss hat gezält. Und ich muss auch zugeben ich war skeptisch. Doch unbegründet. Ein sehr erfahrenes und professioneller Team. Das Ergebnis ist, ich habe ein natürliches und gesundes Gebiss. Endlich kann ich wieder selbstbewusst lächeln. Nochmals ein großes Danke an den Doktor und sein sehr freundliches Team.',
  },
  {
    author: 'Ardita Gjeka Veliu',
    date: '2024-05-29',
    lang: 'sq',
    text: 'Urime dr Petrit & Vlera, jeni me te miret, suksese paci gjithmone',
  },
  {
    author: 'Lyra Pruthi',
    date: '2024-03-02',
    lang: 'en',
    text: 'I always do my check ups at Dr. Petrit & Vlera Dental Clinic and have the best experiences. The staff is friendly and professional, and the clinic maintains a clean and welcoming environment. Dr. Petrit and Dr. Vlera demonstrate expertise, explaining procedures thoroughly. The personalized care and attention to detail makes my visits comfortable. I highly recommend this clinic for anyone seeking quality dental care.',
  },
  {
    author: 'Arta Avdiu',
    date: '2023-07-13',
    lang: 'de',
    text: 'Sehr nette und kompetente Ärzte sowie sehr gute freundliche Beratung und Behandlung. Die beide Zahnärzte haben viel Zeit für mich und meine Beschwerden genommen. Die vorgeschlagenen Behandlung war erfolgreich und ich bin damit sehr zufrieden.',
  },
  {
    author: 'Fellanza Ismajli Hoxha',
    date: '2023-03-12',
    lang: 'sq',
    text: 'Klinika me e mire ne Prishtine, ju rekomandoj ta vizitoni.',
  },
  {
    author: 'Majlinda Shatri Mehmeti',
    date: '2023-02-23',
    lang: 'sq',
    text: 'Klinika më e mirë ne Prishtinë. Kliniken dentare Dr Petriti & Dr Vlera ju rekomandoj ta vizitoni',
  },
  {
    author: 'Merita Grajçevci-Kotori',
    date: '2022-11-30',
    lang: 'en',
    text: 'The best doctors. The service is at the maximal level. Very clean ordinance, pleasent environment.',
  },
];

/** Reviews written in the page language first, then the rest; newest first within each group. */
export function testimonialsFor(lang: string): Testimonial[] {
  const byDate = (a: Testimonial, b: Testimonial) => b.date.localeCompare(a.date);
  return [
    ...testimonials.filter((t) => t.lang === lang).sort(byDate),
    ...testimonials.filter((t) => t.lang !== lang).sort(byDate),
  ];
}
