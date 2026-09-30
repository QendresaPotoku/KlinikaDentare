import type { ImageMetadata } from 'astro';

import roomLight from '../assets/photos/room-light.jpg';
import roomWide from '../assets/photos/room-wide.jpg';
import roomOrange from '../assets/photos/room-orange.jpg';
import roomArt from '../assets/photos/room-art.jpg';
import chairWindow from '../assets/photos/chair-window.jpg';
import exam from '../assets/photos/exam.jpg';
import examDark from '../assets/photos/exam-dark.jpg';
import treatmentFocus from '../assets/photos/treatment-focus.jpg';
import xrayReview from '../assets/photos/xray-review.jpg';
import instrumentsStill from '../assets/photos/instruments-still.jpg';
import mirrorBlur from '../assets/photos/mirror-blur.jpg';
import heroConsultation from '../assets/photos/hero-consultation.jpg';

export type GalleryCategory = 'interior' | 'team' | 'treatment' | 'cases';

export interface GalleryItem {
  image: ImageMetadata;
  category: GalleryCategory;
  alt: string;
  /** Shape in the editorial grid. */
  shape: 'tall' | 'wide' | 'square' | 'large';
}

/**
 * All current photos are illustrative stock images (Unsplash) and must be replaced
 * with photographs of the clinic. Patient cases: add only with written patient consent.
 */
export const gallery: GalleryItem[] = [
  { image: roomLight, category: 'interior', alt: 'Dental treatment room with natural light', shape: 'large' },
  { image: chairWindow, category: 'interior', alt: 'Dental chair beside a window', shape: 'tall' },
  { image: heroConsultation, category: 'team', alt: 'Dentist in conversation with a patient', shape: 'wide' },
  { image: instrumentsStill, category: 'treatment', alt: 'Dental instruments on a white surface', shape: 'tall' },
  { image: roomWide, category: 'interior', alt: 'Bright dental treatment room', shape: 'wide' },
  { image: exam, category: 'treatment', alt: 'Dental examination in progress', shape: 'square' },
  { image: xrayReview, category: 'team', alt: 'Dentist reviewing dental X-rays', shape: 'wide' },
  { image: mirrorBlur, category: 'treatment', alt: 'Dental mirror in front of a treatment chair', shape: 'tall' },
  { image: roomOrange, category: 'interior', alt: 'Treatment room with dental chair', shape: 'square' },
  { image: treatmentFocus, category: 'treatment', alt: 'Dentist treating a patient', shape: 'tall' },
  { image: roomArt, category: 'interior', alt: 'Dental chair in a room with artwork', shape: 'wide' },
  { image: examDark, category: 'treatment', alt: 'Dental check-up with a mirror', shape: 'square' },
];
