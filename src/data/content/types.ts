import type { Lang } from '../../i18n';
import type { TreatmentCopy } from '../treatments';

/** Page copy for one category or sub-treatment, keyed by its `id` in treatments.ts. */
export type TreatmentContent = Record<Lang, Pick<TreatmentCopy, 'intro' | 'body' | 'steps' | 'faq' | 'seoDescription'>>;
