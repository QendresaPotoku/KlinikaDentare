import type { ImageMetadata } from 'astro';
import petritiPhoto from '../assets/team/Petriti.webp';
import vleraPhoto from '../assets/team/Vlera.webp';

/**
 * Team page. Text lives in src/i18n (team.* and doctors.people); this file holds structure and photos.
 *
 * To add a photo: put the file in src/assets/team/, import it here and set `photo` on the member.
 * Until a photo is supplied, the portrait shows the clinic mark as a neutral placeholder
 * (the clinic does not want stock photographs of people on the site).
 */
export interface TeamMember {
  /** Used in the URL hash, e.g. /sq/ekipi/#dr-petriti opens that profile. */
  id: string;
  kind: 'doctor' | 'staff';
  /** Index into t.doctors.people (doctors) or t.team.staff (staff). */
  index: number;
  photo?: ImageMetadata;
}

export interface TeamGroup {
  id: 'doctors' | 'staff';
  members: TeamMember[];
}

export const teamGroups: TeamGroup[] = [
  {
    id: 'doctors',
    members: [
      { id: 'dr-petriti', kind: 'doctor', index: 0, photo: petritiPhoto },
      { id: 'dr-vlera', kind: 'doctor', index: 1, photo: vleraPhoto },
    ],
  },
  // Staff group removed for now. To bring it back, re-add:
  // { id: 'staff', members: [{ id: 'ekipi-1', kind: 'staff', index: 0 }, ...] }
];
