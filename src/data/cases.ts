import type { ImageMetadata } from 'astro';
import type { Lang } from '../i18n';

import case1 from '../../beforeandafter/1.png';
import case2 from '../../beforeandafter/2.png';
import case3 from '../../beforeandafter/3.png';
import case4 from '../../beforeandafter/4.png';
import case5 from '../../beforeandafter/5.png';

/**
 * Before and after cases for the homepage section.
 *
 * Only real clinical photographs, published with the patient's written consent.
 * No stock images, no retouching: the files are shown as supplied (only resized and compressed).
 *
 * Two kinds of case:
 * - `before` + `after`: two separate source photographs taken from the same angle.
 *   They are stacked with identical cropping and shown as a draggable comparison.
 *   Both files should share the same aspect ratio; `focus` (CSS object-position) is applied to both.
 * - `combined`: a single image that already shows before (top) and after (bottom), as posted on social media.
 *   With `crop`, each half is cut out by cropping (nothing is redrawn) and the two are shown as the draggable
 *   comparison. Without `crop` the image is shown whole.
 *
 * `crop` boxes are in pixels of the source image: [left, top, width]. The height follows from the 3:2 frame
 * (width / 1.5). Choose the boxes so both halves show the same anatomy at the same scale (here: the midline
 * between the central incisors and their incisal edge at the same point of the frame, scaled by tooth size),
 * keep them inside their own photograph (clear of the white strip), and leave out text baked into the image.
 *
 * `treatment` is optional. Leave it out rather than guess: the case number is shown instead.
 * While the list is empty, the section shows a clearly marked placeholder.
 *
 * Example of a separate pair:
 *   { before: veneersBefore, after: veneersAfter, treatment: { sq: 'Faseta porcelani', en: 'Porcelain veneers', de: 'Keramikveneers' } },
 */
export type ClinicalCase = {
  treatment?: Record<Lang, string>;
  /** Shared object-position for both photographs, e.g. '50% 60%'. Defaults to centre. */
  focus?: string;
} & (
  | { before: ImageMetadata; after: ImageMetadata; combined?: never; crop?: never }
  | { combined: ImageMetadata; crop?: { before: CropBox; after: CropBox }; before?: never; after?: never }
);

/** [left, top, width] in source pixels; height is width / 1.5. */
export type CropBox = [number, number, number];

// The clinic's social media posts: each image holds before (top) and after (bottom).
export const cases: ClinicalCase[] = [
  { combined: case1, crop: { before: [140, 15, 560], after: [120, 438, 579] } },
  { combined: case2, crop: { before: [152, 19, 540], after: [132, 443, 580] } },
  { combined: case3, crop: { before: [192, 90, 435], after: [163, 518, 470] } },
  { combined: case4, crop: { before: [155, 31, 510], after: [195, 467, 449] } },
  { combined: case5, crop: { before: [142, 38, 565], after: [180, 498, 509] } },
];
