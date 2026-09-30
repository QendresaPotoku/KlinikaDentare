/**
 * Treatment animations, keyed by sub-treatment id. Each id has two files in public/media/treatments/:
 * <id>.mp4 (the looping animation, on a white background where the source allowed it) and <id>.jpg
 * (its poster frame). The original GIFs are in src/assets/gifs/.
 * To add one: convert the GIF to MP4 + JPG with those names and add its pixel size here.
 */
export interface Animation {
  width: number;
  height: number;
}

export const animations: Record<string, Animation> = {
  'single-implant': { width: 532, height: 300 },
  'all-on-4': { width: 960, height: 720 },
  'all-on-6': { width: 960, height: 720 },
  'crown-lengthening': { width: 960, height: 330 },
  invisalign: { width: 960, height: 538 },
  'laser-gingivectomy': { width: 720, height: 820 },
  'metal-ceramic-crowns': { width: 960, height: 540 },
  braces: { width: 720, height: 572 },
  'wisdom-teeth': { width: 960, height: 548 },
  'zirconia-crowns': { width: 960, height: 540 },
  'emax-veneers': { width: 960, height: 474 },
  'emax-crowns': { width: 884, height: 496 },
  'composite-veneers': { width: 884, height: 428 },
};
