# Klinika Dentare Dr. Petriti & Dr. Vlera

Website built with Astro, GSAP and Lenis. Three languages: Albanian (`/sq/`), English (`/en/`), German (`/de/`).
All content pages are pre-rendered; the online booking system (public API, patient cancellation page and the
staff panel at `/admin/`) runs on a Node server (`@astrojs/node`, standalone) with PostgreSQL.

**Deploying to production: follow [DEPLOYMENT.md](DEPLOYMENT.md).** Short version below.

## Local development

```bash
npm install
cp .env.example .env            # then set APP_SECRET (command in the file)
npm run db:up                   # local PostgreSQL in Docker (port 54329)
npm run db:migrate              # create/upgrade the database schema
npm run db:seed                 # first run only: the two doctors (no services, no working hours)
npm run db:seed:demo            # optional, LOCAL ONLY: example services + working hours to try booking
npm run admin:create -- --email you@example.com --name "Your Name"
npm run dev                     # http://localhost:4321  (staff panel: /admin/)
npm test                        # tests (uses TEST_DATABASE_URL, which is wiped on every run)
npm run check                   # type check (must report 0 errors)
```

Optional local test mail server: `docker compose --profile mail up -d mail`, then in `.env`
`EMAIL_PROVIDER=smtp SMTP_HOST=127.0.0.1 SMTP_PORT=1025 SMTP_ALLOW_INSECURE=true EMAIL_FROM="Test <test@localhost>"`;
inbox at http://localhost:8025. Development-only tools (Docker database, Mailpit, test databases such as
`klinika_test`/`klinika_e2e`, the console email and SMS providers) are never used by a production deployment.
`SMS_PROVIDER=console` in `.env` logs patient SMS locally (masked number, no text) instead of skipping them.

## Production checklist (details in DEPLOYMENT.md)

1. Provision PostgreSQL 15+ (managed service recommended) and **enable automatic backups**.
2. Set the environment variables (see DEPLOYMENT.md); `NODE_ENV=production`.
3. Generate `APP_SECRET` once: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
   **Never rotate it casually**: it protects every patient's cancellation link.
4. Build with the real `PUBLIC_SITE_URL` set: `npm ci && npm run build`.
5. Run migrations: `npm run db:migrate` (stop the deploy if it fails).
6. Create the first staff account: `npm run admin:create -- --email … --name "…"`.
7. Start: `npm start` (refuses to start if the configuration is unsafe; check with `npm run check:env`).
8. Verify `GET /api/health/` returns `{"ok":true}`.
9. In `/admin/`, configure services, dentists, dentist-service assignments and weekly schedules.
10. Configure SMTP and verify the clinic notice arrives: set the clinic notification email in `/admin/settings/`,
    make one test online booking, then cancel it. Patients get SMS, not email: connect an SMS provider
    (not done yet, see DEPLOYMENT.md, "SMS") and check that the test booking's confirmation SMS arrives.
11. Point the domain/DNS at the host; SPF, DKIM and DMARC for the sending domain.
12. Verify HTTPS, the proxy settings (`TRUST_PROXY=true`) and that staff login works through the domain.
13. **Online booking stays OFF** until the clinic has reviewed everything; then a staff member switches it on in
    `/admin/settings/`.
14. Confirm PostgreSQL backups are enabled and a restore has been tried once.

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
- Canonical and hreflang URLs come from `PUBLIC_SITE_URL` at build time; build with the real domain.
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
