# Klinika Dentare Dr. Petriti & Dr. Vlera

Static website built with Astro, GSAP and Lenis. Three languages: Albanian (`/sq/`), English (`/en/`), German (`/de/`).

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # output in dist/
```

## Where content lives

| What | File |
| --- | --- |
| Phone, email, address, opening hours, video, map | `src/config/site.ts` |
| All page copy, per language | `src/i18n/sq.ts`, `en.ts`, `de.ts` |
| Treatments (adds pages automatically in all 3 languages) | `src/data/treatments.ts` |
| Gallery photos and categories | `src/data/gallery.ts` |
| Photos | `src/assets/photos/` |
| Colours, type, spacing | `src/styles/global.css` (`:root`) |

## Placeholders

Anything the clinic has not supplied yet is written as `[[text]]` and shows on the page with a
crimson underline. Search the project for `[[` to find every one. Other items to replace:

- **All photos are illustrative Unsplash stock images**, marked "Foto ilustruese" on the page. This includes the two doctor portraits.
- The testimonials are sample text, marked "Tekst shembull".
- `site` in `astro.config.mjs` must be set to the real domain (canonical and hreflang URLs).
- The clinic video: put the file in `public/video/` and set `video.src` in `src/config/site.ts`.
- The map shows Prishtina until `mapQuery` is set to the exact address.

## Adding a treatment

Append an entry to `treatments` in `src/data/treatments.ts` with `name`, `slug` and `summary` for each
language, plus an image. Optional `intro`, `body`, `steps` and `faq` replace the placeholders on its page.

Copy rule: no em dashes in site copy.

location:Rruga Muharrem Fejza, ndertesa Royal City, lamela B, nr. 3, Pristina, Kosovo, 10000

044 292 393

klinikadentaredrpetritidrvlera@gmail.com

+383 44 292 393

Klinika Dentare Dr. Petriti & Dr. Vlera


detect device language and show web on that lang.

team section****

recommandations:
Virjana Zatriqi Kingji  recommends Klinika Dentare Dr. Petriti & Dr. Vlera.
December 25, 2025
 ·
Kam pasur një përvojë shumë të mirë me dr. Vleren dhe dr. Petritin. Kam pa shumë profesionalizmi dhe kujdesi ndaj pacientëve janë të  jashtëzakonshëm. Atmosfera ishte e rehatshme dhe shpjegimet e secilit hap të trajtimit ishin të qarta. E rekomandoj me bindje për kujdes dentar cilësor!
Jeni më të mirët.


Xhyli Selmani  recommends Klinika Dentare Dr. Petriti & Dr. Vlera.
November 30, 2024
 ·
It was an extraordinary satisfaction to fix my teeth at the best doctors Petrit & Vlera! 
Feelinf Happy😁✔️


Aeza Brovina  recommends Klinika Dentare Dr. Petriti & Dr. Vlera.
August 8, 2024
 ·
J'ai récemment consulté le cabinet des Dr Petrit et Vlera Hoxha et suis extrêmement satisfaite de leurs services. Ils ont fait preuve d'un grand professionnalisme et ont pris le temps de répondre à toutes mes questions avec patience et précision. 
Leurs écoutes attentives et conseils éclairés ont grandement contribué à rendre cette visite agréable. 
Je recommande vivement ce cabinet à toute personne à la recherche de dentistes compétents et attentifs.

Erind Hoxha  recommends Klinika Dentare Dr. Petriti & Dr. Vlera.
July 10, 2024
 ·
I've been visiting Klinika Dentare Dr. Petriti & Dr. Vlera for a while now for various dental treatments, including fillings, teeth cleaning, and polishing. Every time I walk in, I'm greeted with warm smiles and a friendly atmosphere that instantly puts me at ease.
I've had multiple fillings done here and never had any issues. The quality of their work is outstanding, and I trust them completely. Honestly, I feel so comfortable in their care that I could even fall asleep! 😁 See less


Albulena Shkreli  recommends Klinika Dentare Dr. Petriti & Dr. Vlera.
June 18, 2024
 ·
Ausgezeichnete Leistung: Top Beratung,Top Preise, Top Qualität!
Ich kann diese Zahnärzte aus vollstem Herzen empfelen. Ich hatte immer sehr viele Probleme mit meinen Zähnen, obwohl ich die Profilaxen immer eingehalten habe und auch immer versucht habe die besseren Zahnärzte aufzusuchen. Es ging mir auch nie  so sehr ums Geld, das Ergebniss hat gezält. Und ich muss auch zugeben ich war skeptisch. Doch unbegründet. 
Ein sehr erfahrenes und professioneller Team. Das Ergebnis ist, ich habe ein natürliches und gesundes Gebiss. Endlich kann ich wieder selbstbewusst lächeln. Nochmals ein großes Danke an den Doktor und sein sehr freundliches Team.😁😍 See less


Ardita Gjeka Veliu  recommends Klinika Dentare Dr. Petriti & Dr. Vlera.
May 29, 2024
 ·
Urime dr Petrit & Vlera,jeni me te miret,suksese paci gjithmone


Lyra Pruthi  recommends Klinika Dentare Dr. Petriti & Dr. Vlera.
March 2, 2024
 ·
I alwaysdo my check ups at Dr. Petrit & Vlera Dental Clinic and have the best experiences. The staff is friendly and professional, and the clinic maintains a clean and welcoming environment. Dr. Petrit and Dr. Vlera demonstrate expertise, explaining procedures thoroughly. The personalized care and attention to detail makes my visits comfortable. I highly recommend this clinic for anyone seeking quality dental care ❤️❤️


Arta Avdiu  recommends Klinika Dentare Dr. Petriti & Dr. Vlera.
July 13, 2023
 ·
Sehr nette und kompetente Ärzte sowie sehr gute freundliche Beratung und Behandlung. Die beide Zahnärzte haben viel Zeit für mich und meine Beschwerden genommen. Die vorgeschlagenen Behandlung war erfolgreich und ich bin damit sehr zufrieden. 👌👍


Fellanza Ismajli Hoxha  recommends Klinika Dentare Dr. Petriti & Dr. Vlera.
March 12, 2023
 ·
Klinika me e mire ne Prishtine, ju rekomandoj ta vizitoni.


Majlinda Shatri Mehmeti  recommends Klinika Dentare Dr. Petriti & Dr. Vlera.
February 23, 2023
 ·
Klinika më e mirë ne Prishtinë.
Kliniken dentare Dr Petriti & Dr Vlera ju rekomandoj ta vizitoni


Merita Grajçevci-Kotori  recommends Klinika Dentare Dr. Petriti & Dr. Vlera.
November 30, 2022
 ·
the best doctors. The service is at the maximal level. very clean ordinance, pleasent environment.
