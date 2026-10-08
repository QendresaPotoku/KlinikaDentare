import type { ImageMetadata } from 'astro';
import petritiPhoto from '../assets/team/Petriti.webp';
import vleraPhoto from '../assets/team/Vlera.png';

/**
 * Team page. Text lives in src/i18n (team.* and doctors.people); this file holds structure and photos.
 *
 * To add a photo: put the file in src/assets/team/, import it here and set `photo` on the member.
 * Until a photo is supplied, the portrait shows the clinic mark as a neutral placeholder
 * (the clinic does not want stock photographs of people on the site).
 */
/** Brand colours a staff badge can be printed in (see IdCard). Neighbouring badges should differ. */
export type Tone = 'crimson' | 'crimson-deep' | 'ink' | 'blush';

/**
 * Each tone as a strong colour (rules, accents) and a light tint (panels behind the badge on the
 * team page). Light tints always carry dark text.
 */
export const toneColors: Record<Tone, { tone: string; soft: string }> = {
  crimson: { tone: 'var(--crimson)', soft: 'var(--blush)' },
  'crimson-deep': { tone: 'var(--crimson-deep)', soft: 'var(--blush)' },
  ink: { tone: 'var(--ink)', soft: 'var(--stone)' },
  blush: { tone: 'var(--crimson-deep)', soft: 'var(--blush)' },
};

/**
 * Where the face sits in the photo, as fractions of its width and height, and how far to zoom
 * so the face fills the badge's round portrait. Measured by eye on the supplied files.
 */
export interface PhotoFocus {
  x: number;
  y: number;
  zoom: number;
}

export interface TeamMember {
  /** Used in the URL hash, e.g. /sq/ekipi/#dr-petriti opens that profile. */
  id: string;
  kind: 'doctor' | 'staff';
  /** Index into t.doctors.people (doctors) or t.team.staff (staff). */
  index: number;
  photo?: ImageMetadata;
  focus?: PhotoFocus;
  /** Badge colour on the home page team section. */
  tone: Tone;
}

export interface TeamGroup {
  id: 'doctors' | 'staff';
  members: TeamMember[];
}

export const teamGroups: TeamGroup[] = [
  {
    id: 'doctors',
    members: [
      {
        id: 'dr-petriti',
        kind: 'doctor',
        index: 0,
        photo: petritiPhoto,
        // Stands left of centre, so a closer crop is needed to bring the face to the middle
        focus: { x: 0.355, y: 0.37, zoom: 1.38 },
        tone: 'ink',
      },
      {
        id: 'dr-vlera',
        kind: 'doctor',
        index: 1,
        photo: vleraPhoto,
        focus: { x: 0.465, y: 0.335, zoom: 1.28 },
        tone: 'crimson',
      },
    ],
  },
  // Staff group removed for now. To bring it back, re-add:
  // { id: 'staff', members: [{ id: 'ekipi-1', kind: 'staff', index: 0, tone: 'blush' }, ...] }
];
