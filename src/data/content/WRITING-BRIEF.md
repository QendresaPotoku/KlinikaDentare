# Treatment page copy: writing brief

Site: Klinika Dentare Dr. Petriti & Dr. Vlera, a dental clinic in Prishtinë, Kosovo. Astro site in three
languages: Albanian (sq, default), English (en), German (de, for diaspora patients in DE/CH/AT).

## Your job

Write the page copy for one treatment category and its sub-treatments, in all three languages, into one
TypeScript file under `src/data/content/`. You may use the reference pages you are given (another clinic's
website) ONLY to see which topics each treatment page should cover. Use WebFetch on them.

## Hard rules

1. **Original writing only.** Never copy or closely paraphrase sentences from the reference site. Read it
   for topics, close it, and write fresh copy in your own words and structure. Explain how the treatment
   works from general, accurate dental knowledge.
2. **No other clinic's name, city (Tirana/Albania), doctors, brands of theirs, prices, or statistics.**
3. **No clinic-specific promises we cannot verify:** no prices, no guarantees, no success-rate percentages,
   no "painless", no "same day" as a promise, no warranty lengths, no specific brands of implants/lab
   equipment. Use honest hedged language: "usually", "in many cases", "depends on", "your dentist will
   advise". Typical ranges (e.g. healing "usually 3–6 months") are fine when they are standard dental
   knowledge.
4. Medically accurate, calm, reassuring, plain language for patients. No hype, no exclamation marks,
   no emojis. Sentence case headings.
5. German: formal "Sie". Albanian: standard Albanian (Gheg-neutral written standard), formal "ju",
   correct diacritics (ë, ç). English: British/international neutral, sentence case.
6. Do not use the placeholder syntax `[[...]]` anywhere.
7. Names/terms must match the existing names in `src/data/treatments.ts` (read it). Brand: "E.max",
   "Invisalign", "All-on-4", "All-on-6".

## Fields per entry, per language

- `intro`: 1–2 sentences (max ~40 words). Shown beside the page title.
- `body`: exactly 2 paragraphs (each ~50–90 words): what it is and who it suits; then what to expect
  (duration, comfort, aftercare, longevity in general terms).
- `steps`: exactly 3 OR exactly 6 steps (the layout is a 3-column grid). `title` is 1–4 words,
  `text` is 1–2 sentences. The patient journey, from consultation to aftercare.
- `faq`: 4 items. Real questions patients ask (pain, duration, suitability, care, alternatives).
  Answers 1–3 sentences.
- `seoDescription`: max ~155 characters, mentions Prishtinë (sq: Prishtinë, en: Prishtina,
  de: Prishtina) naturally.

Category entries (the parent) should give an overview of the field and help the patient choose among the
sub-treatments; sub-treatment entries go into the specifics.

## File format (exactly this shape)

```ts
import type { TreatmentContent } from './types';

const content: Record<string, TreatmentContent> = {
  'category-id': {
    sq: { intro: '…', body: ['…', '…'], steps: [{ title: '…', text: '…' }], faq: [{ q: '…', a: '…' }], seoDescription: '…' },
    en: { … },
    de: { … },
  },
  'sub-id': { … },
};

export default content;
```

Use single-quoted strings; escape apostrophes as `\'` or use typographic ’ (preferred in all languages).
Only create/edit your own file. Do not touch any other file. When done, run
`npx tsc --noEmit --skipLibCheck --module esnext --moduleResolution bundler --target es2022 <your file>`
if convenient, or at least re-read the file to check syntax. Reply with a short summary (ids written,
any medical point the clinic should double-check).

## Coverage pass (second round)

Goal: every topic the reference page explains about how the treatment works should also be covered on our
page, in our own words. Steps:

1. WebFetch each reference page and list the topics it covers (how it works, who it suits, stages,
   benefits, risks/limitations, aftercare, comparisons, recovery, longevity, FAQ questions). Ignore
   anything about their clinic, city, team, prices, "why choose us" and marketing claims.
2. Compare with the existing entry in your file (all three languages).
3. Fill real gaps only, keeping the brief's rules (original wording, no numbers we cannot stand behind,
   hedged language). Allowed changes: rewrite/extend `body` (may grow to 3 paragraphs), adjust `steps`
   (keep exactly 3 or 6), extend `faq` up to 6 items. Keep sq/en/de in sync.
4. Reply with a table per sub-treatment: reference topic, where it is now covered on our page
   (field), or why it was deliberately left out.
