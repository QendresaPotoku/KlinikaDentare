/**
 * Clinic facts. Everything marked `placeholder: true` or wrapped in [[double brackets]]
 * has NOT been supplied by the clinic yet and is rendered with a visible placeholder marker.
 * Replace the values here and the whole site updates.
 */
export const site = {
  name: 'Klinika Dentare Dr. Petriti & Dr. Vlera',
  shortName: 'Dr. Petriti & Dr. Vlera',
  city: 'Prishtinë',

  phone: {
    display: '+383 44 292 393',
    // International format without spaces or "+", used for tel:, WhatsApp and Viber links.
    // Assumes WhatsApp and Viber use the same number as the phone line.
    number: '38344292393',
  },
  email: 'klinikadentaredrpetritidrvlera@gmail.com',
  address: {
    line1: 'Rruga Muharrem Fejza, Royal City, Lamela B, nr. 3',
    line2: '10000 Prishtinë, Kosovë',
  },
  // Exact location of the clinic (latitude,longitude), used for the embedded map and the
  // "open in Google Maps" link. The embed is centred here, where the site draws its own red dot.
  mapQuery: '42.646378,21.172317',

  // Opening hours. `days` keys are translated in src/i18n.
  hours: [
    { days: 'weekdays', time: '[[08:00–20:00]]' },
    { days: 'saturday', time: '[[09:00–15:00]]' },
    { days: 'sunday', time: 'closed' },
  ],

  social: {
    instagram: '', // e.g. https://www.instagram.com/...
    facebook: '',
  },

  // Introductory clinic video. Leave `src` empty until the clinic supplies the file (e.g. /video/klinika.mp4).
  video: { src: '' },
} as const;

export const links = {
  tel: `tel:+${site.phone.number}`,
  whatsapp: `https://wa.me/${site.phone.number}`,
  viber: `viber://chat?number=%2B${site.phone.number}`,
  maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.mapQuery)}`,
  // Centred with `ll` rather than `q`, so Google adds no pin of its own under the site's red dot.
  mapEmbed: `https://www.google.com/maps?ll=${encodeURIComponent(site.mapQuery)}&z=16&output=embed`,
};
